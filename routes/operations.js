const router = require('express').Router();
const auth   = require('../middleware/auth');
const db     = require('../config/db');
const bcrypt = require('bcryptjs');

// ── MATERIALS / STOCK ────────────────────────────────────────────────────────

router.get('/materials', auth, async (req, res) => {
  try {
    const branch = req.query.branch_id || req.user.branch_id;
    const [rows] = await db.query(`
      SELECT m.*,
        COALESCE(
          (SELECT SUM(pi.taxable_value) / NULLIF(SUM(pi.quantity),0)
           FROM purchase_items pi
           JOIN purchases p ON p.id=pi.purchase_id
           WHERE pi.material_id=m.id AND p.branch_id=?),
          m.purchase_rate
        ) as avg_purchase_price
      FROM materials m
      WHERE m.branch_id=? AND m.is_active=1 ORDER BY m.name`, [branch, branch]);
    res.json(rows.map(s => ({...s, status: s.current_stock<=0?'Critical':s.current_stock<=s.min_stock?'Low':'Good'})));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/materials', auth, async (req, res) => {
  try {
    const d = req.body;
    const [r] = await db.query('INSERT INTO materials SET ?', [{
      branch_id: d.branch_id || req.user.branch_id,
      name: d.name, category: d.category||'General',
      hsn_code: d.hsn_code, unit: d.unit||'Kg',
      purchase_rate: d.purchase_rate||0, sale_rate: d.sale_rate||0,
      gst_rate: d.gst_rate||18, current_stock: d.current_stock||0,
      min_stock: d.min_stock||0, description: d.description||null,
    }]);
    res.json({ id: r.insertId, message: 'Material created' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/materials/:id', auth, async (req, res) => {
  try {
    const d = req.body;
    await db.query(
      'UPDATE materials SET name=?,category=?,hsn_code=?,unit=?,purchase_rate=?,sale_rate=?,gst_rate=?,min_stock=?,current_stock=?,description=? WHERE id=?',
      [d.name,d.category||'General',d.hsn_code,d.unit||'Kg',d.purchase_rate,d.sale_rate,d.gst_rate,d.min_stock,d.current_stock,d.description||null,req.params.id]);
    res.json({ message: 'Material updated' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/materials/:id', auth, async (req, res) => {
  try {
    await db.query('UPDATE materials SET is_active=0 WHERE id=?', [req.params.id]);
    res.json({ message: 'Material deactivated' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/stock-movements', auth, async (req, res) => {
  try {
    const branch = req.query.branch_id || req.user.branch_id;
    const [rows] = await db.query(`
      SELECT sm.*, m.name as material_name, m.unit
      FROM stock_movements sm JOIN materials m ON m.id=sm.material_id
      WHERE sm.branch_id=? ORDER BY sm.movement_date DESC, sm.id DESC LIMIT 100`, [branch]);
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/stock-adjustment', auth, async (req, res) => {
  try {
    const d = req.body;
    const branch = d.branch_id || req.user.branch_id;
    const [mat] = await db.query('SELECT current_stock FROM materials WHERE id=?', [d.material_id]);
    const newStock = +mat[0].current_stock + +d.quantity;
    await db.query('UPDATE materials SET current_stock=? WHERE id=?', [newStock, d.material_id]);
    await db.query('INSERT INTO stock_movements SET ?', [{
      branch_id: branch, material_id: d.material_id,
      movement_type: 'Adjustment', reference_type: 'adjustment', reference_id: 0,
      quantity: d.quantity, rate: d.rate||0, value: d.value||0,
      balance_after: newStock, movement_date: d.date || new Date().toISOString().split('T')[0],
      notes: d.notes,
    }]);
    res.json({ new_stock: newStock, message: 'Stock adjusted' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── PRODUCTION ───────────────────────────────────────────────────────────────

router.get('/production', auth, async (req, res) => {
  try {
    const branch = req.query.branch_id || req.user.branch_id;
    const [rows] = await db.query(`
      SELECT pe.*, mi.name as input_material, mo.name as output_material
      FROM production_entries pe
      LEFT JOIN materials mi ON mi.id=pe.input_material_id
      LEFT JOIN materials mo ON mo.id=pe.output_material_id
      WHERE pe.branch_id=? ORDER BY pe.production_date DESC`, [branch]);
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/production', auth, async (req, res) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const d = req.body;
    const branch = d.branch_id || req.user.branch_id;
    const [r] = await conn.query('INSERT INTO production_entries SET ?', [{
      branch_id: branch, production_date: d.production_date, shift: d.shift||'Morning',
      input_material_id: d.input_material_id, input_quantity: d.input_quantity,
      output_material_id: d.output_material_id, output_quantity: d.output_quantity,
      wastage_quantity: d.wastage_quantity||0, operator_name: d.operator_name,
      notes: d.notes, created_by: req.user.id,
    }]);
    // Deduct input stock
    const [inMat] = await conn.query('SELECT current_stock FROM materials WHERE id=?', [d.input_material_id]);
    const newInStock = +inMat[0].current_stock - +d.input_quantity;
    await conn.query('UPDATE materials SET current_stock=? WHERE id=?', [newInStock, d.input_material_id]);
    await conn.query('INSERT INTO stock_movements SET ?', [{
      branch_id: branch, material_id: d.input_material_id,
      movement_type: 'Production Out', reference_type: 'production', reference_id: r.insertId,
      quantity: -d.input_quantity, balance_after: newInStock, movement_date: d.production_date,
    }]);
    // Add output stock
    const [outMat] = await conn.query('SELECT current_stock FROM materials WHERE id=?', [d.output_material_id]);
    const newOutStock = +outMat[0].current_stock + +d.output_quantity;
    await conn.query('UPDATE materials SET current_stock=? WHERE id=?', [newOutStock, d.output_material_id]);
    await conn.query('INSERT INTO stock_movements SET ?', [{
      branch_id: branch, material_id: d.output_material_id,
      movement_type: 'Production In', reference_type: 'production', reference_id: r.insertId,
      quantity: d.output_quantity, balance_after: newOutStock, movement_date: d.production_date,
    }]);
    await conn.commit();
    res.json({ id: r.insertId, message: 'Production entry saved' });
  } catch (e) { await conn.rollback(); res.status(500).json({ error: e.message }); }
  finally { conn.release(); }
});

// PUT /production/:id — update (no stock adjustment)
router.put('/production/:id', auth, async (req, res) => {
  try {
    const d = req.body;
    await db.query(`UPDATE production_entries SET production_date=?,shift=?,
      input_material_id=?,input_quantity=?,output_material_id=?,output_quantity=?,
      wastage_quantity=?,operator_name=?,notes=? WHERE id=?`,
      [d.production_date,d.shift,d.input_material_id,d.input_quantity,
       d.output_material_id,d.output_quantity,d.wastage_quantity||0,
       d.operator_name||'',d.notes||'',req.params.id]);
    res.json({ message: 'Production entry updated' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// DELETE /production/:id
router.delete('/production/:id', auth, async (req, res) => {
  try {
    // Remove related stock movements
    await db.query("DELETE FROM stock_movements WHERE reference_type='production' AND reference_id=?", [req.params.id]);
    await db.query('DELETE FROM production_entries WHERE id=?', [req.params.id]);
    res.json({ message: 'Production entry deleted' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── ATTENDANCE ───────────────────────────────────────────────────────────────

// Monthly attendance summary
router.get('/attendance/monthly', auth, async (req, res) => {
  try {
    const branch = req.query.branch_id || req.user.branch_id;
    const month = req.query.month || new Date().getMonth() + 1;
    const year  = req.query.year  || new Date().getFullYear();
    const [rows] = await db.query(`
      SELECT a.*, e.name as employee_name, e.designation,
        e.daily_wage, e.weekly_wage, e.monthly_wage, e.wage_type
      FROM attendance a
      JOIN employees e ON e.id=a.employee_id
      WHERE a.branch_id=? AND MONTH(a.attendance_date)=? AND YEAR(a.attendance_date)=?
      ORDER BY e.name, a.attendance_date`, [branch, month, year]);
    res.json(rows);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

router.get('/employees', auth, async (req, res) => {
  try {
    const branch = req.query.branch_id || req.user.branch_id;
    // Return ALL employees (including inactive) for manage view
    const showAll = req.query.show_all === 'true';
    const whereClause = showAll ? 'WHERE branch_id=?' : 'WHERE branch_id=? AND is_active=1';
    const [rows] = await db.query(`SELECT * FROM employees ${whereClause} ORDER BY name`, [branch]);
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/employees', auth, async (req, res) => {
  try {
    const d = req.body;
    const [r] = await db.query('INSERT INTO employees SET ?', [{
      branch_id: d.branch_id || req.user.branch_id,
      name: d.name, designation: d.designation, phone: d.phone, daily_wage: d.daily_wage||0,
    }]);
    res.json({ id: r.insertId, message: 'Employee added' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/employees/:id', auth, async (req, res) => {
  try {
    const d = req.body;
    if (d.is_active !== undefined && Object.keys(d).length === 1) {
      // Activate/Deactivate only
      await db.query('UPDATE employees SET is_active=? WHERE id=?', [d.is_active, req.params.id]);
    } else if (d.branch_id !== undefined && Object.keys(d).length === 1) {
      // Branch change only
      await db.query('UPDATE employees SET branch_id=? WHERE id=?', [d.branch_id, req.params.id]);
    } else {
      // Full update
      const branch = d.branch_id || req.user.branch_id;
      await db.query(
        'UPDATE employees SET name=?,designation=?,phone=?,daily_wage=?,branch_id=? WHERE id=?',
        [d.name,d.designation,d.phone,d.daily_wage||0,branch,req.params.id]);
    }
    res.json({ message: 'Employee updated' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/employees/:id', auth, async (req, res) => {
  try {
    await db.query('DELETE FROM attendance WHERE employee_id=?', [req.params.id]);
    await db.query('DELETE FROM employees WHERE id=?', [req.params.id]);
    res.json({ message: 'Employee deleted permanently' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/attendance', auth, async (req, res) => {
  try {
    const branch = req.query.branch_id || req.user.branch_id;
    const date = req.query.date || new Date().toISOString().split('T')[0];
    const [rows] = await db.query(`
      SELECT a.*, e.name as employee_name, e.designation, e.daily_wage
      FROM attendance a JOIN employees e ON e.id=a.employee_id
      WHERE a.branch_id=? AND a.attendance_date=? ORDER BY e.name`, [branch, date]);
    const [employees] = await db.query(
      'SELECT * FROM employees WHERE branch_id=? AND is_active=1 ORDER BY name', [branch]);
    res.json({ date, attendance: rows, employees });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/attendance/bulk', auth, async (req, res) => {
  try {
    const { date, records, branch_id } = req.body;
    const branch = branch_id || req.user.branch_id;
    for (const rec of records) {
      await db.query(`INSERT INTO attendance (branch_id,employee_id,attendance_date,status,in_time,out_time,wage_amount,target_achieved,target_description,notes,created_by)
        VALUES (?,?,?,?,?,?,?,?,?,?,?)
        ON DUPLICATE KEY UPDATE status=?,in_time=?,out_time=?,wage_amount=?,target_achieved=?,target_description=?,notes=?`,
        [branch,rec.employee_id,date,rec.status,rec.in_time||null,rec.out_time||null,rec.wage_amount,rec.target_achieved?1:0,rec.target||"",rec.notes||"",req.user.id,
         rec.status,rec.in_time||null,rec.out_time||null,rec.wage_amount,rec.target_achieved?1:0,rec.target||"",rec.notes||""]);
    }
    res.json({ message: 'Attendance saved' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── EXPENSES ─────────────────────────────────────────────────────────────────

router.get('/expenses', auth, async (req, res) => {
  try {
    const branch = req.query.branch_id || req.user.branch_id;
    const [rows] = await db.query('SELECT * FROM expenses WHERE branch_id=? ORDER BY expense_date DESC', [branch]);
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/expenses', auth, async (req, res) => {
  try {
    const d = req.body;
    const [r] = await db.query('INSERT INTO expenses SET ?', [{
      branch_id: d.branch_id || req.user.branch_id,
      expense_date: d.expense_date, category: d.category,
      description: d.description, amount: d.amount,
      payment_mode: d.payment_mode||'Cash', created_by: req.user.id,
    }]);
    res.json({ id: r.insertId, message: 'Expense saved' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/expenses/:id', auth, async (req, res) => {
  try {
    const d = req.body;
    await db.query(
      'UPDATE expenses SET expense_date=?,category=?,description=?,amount=?,payment_mode=? WHERE id=?',
      [d.expense_date,d.category,d.description,d.amount,d.payment_mode||'Cash',req.params.id]);
    res.json({ message: 'Expense updated' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/expenses/:id', auth, async (req, res) => {
  try {
    await db.query('DELETE FROM expenses WHERE id=?', [req.params.id]);
    res.json({ message: 'Expense deleted' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── GST REPORT ───────────────────────────────────────────────────────────────

router.get('/gst-report', auth, async (req, res) => {
  try {
    const branch = req.query.branch_id || req.user.branch_id;
    const { month, year } = req.query;

    const [outward] = await db.query(`
      SELECT
        COALESCE(SUM(i.subtotal),0) as taxable,
        COALESCE(SUM(i.cgst_amount),0) as cgst,
        COALESCE(SUM(i.sgst_amount),0) as sgst,
        COALESCE(SUM(i.igst_amount),0) as igst,
        COALESCE(SUM(i.total_amount),0) as total,
        COALESCE(SUM(CASE WHEN c.gst_number IS NOT NULL AND c.gst_number!='' THEN i.subtotal ELSE 0 END),0) as b2b_taxable,
        COALESCE(SUM(CASE WHEN c.gst_number IS NULL OR c.gst_number='' THEN i.subtotal ELSE 0 END),0) as b2c_taxable
      FROM invoices i
      JOIN customers c ON c.id=i.customer_id
      WHERE i.branch_id=? AND MONTH(i.invoice_date)=? AND YEAR(i.invoice_date)=?`,
      [branch, month, year]);

    const [inward] = await db.query(`
      SELECT COALESCE(SUM(cgst_amount),0) as cgst, COALESCE(SUM(sgst_amount),0) as sgst,
             COALESCE(SUM(igst_amount),0) as igst
      FROM purchases WHERE branch_id=? AND MONTH(purchase_date)=? AND YEAR(purchase_date)=?
      AND supplier_id IN (SELECT id FROM suppliers WHERE gst_registered=1)`,
      [branch, month, year]);

    const [invoiceList] = await db.query(`
      SELECT i.invoice_number, i.invoice_date, c.name as customer, c.gst_number, c.state,
        i.subtotal, i.cgst_amount, i.sgst_amount, i.igst_amount, i.total_amount
      FROM invoices i JOIN customers c ON c.id=i.customer_id
      WHERE i.branch_id=? AND MONTH(i.invoice_date)=? AND YEAR(i.invoice_date)=?
      ORDER BY i.invoice_date`, [branch, month, year]);

    const output_gst = parseFloat(outward[0].cgst||0)+parseFloat(outward[0].sgst||0)+parseFloat(outward[0].igst||0);
    const input_gst  = parseFloat(inward[0].cgst||0)+parseFloat(inward[0].sgst||0)+parseFloat(inward[0].igst||0);

    res.json({
      outward: { taxable:parseFloat(outward[0].taxable)||0, b2b_taxable:parseFloat(outward[0].b2b_taxable)||0, b2c_taxable:parseFloat(outward[0].b2c_taxable)||0 },
      output_gst, output_cgst:parseFloat(outward[0].cgst)||0, output_sgst:parseFloat(outward[0].sgst)||0, output_igst:parseFloat(outward[0].igst)||0,
      input_gst,  input_cgst:parseFloat(inward[0].cgst)||0,  input_sgst:parseFloat(inward[0].sgst)||0,  input_igst:parseFloat(inward[0].igst)||0,
      net_gst: Math.max(0, output_gst - input_gst), invoice_list: invoiceList,
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── BANK ACCOUNTS ────────────────────────────────────────────────────────────

router.get('/bank-accounts', auth, async (req, res) => {
  try {
    const branch = req.query.branch_id || req.user.branch_id;
    const [rows] = await db.query('SELECT * FROM bank_accounts WHERE branch_id=? AND is_active=1', [branch]);
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/bank-accounts', auth, async (req, res) => {
  try {
    const d = req.body;
    const [r] = await db.query('INSERT INTO bank_accounts SET ?', [{
      branch_id: d.branch_id || req.user.branch_id,
      account_name: d.account_name, bank_name: d.bank_name,
      account_number: d.account_number, ifsc_code: d.ifsc_code,
      branch_name: d.branch_name, account_type: d.account_type||'Current',
      is_gst_account: d.is_gst_account?1:0, opening_balance: d.opening_balance||0,
      current_balance: d.opening_balance||0,
    }]);
    res.json({ id: r.insertId, message: 'Bank account added' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/bank-accounts/:id', auth, async (req, res) => {
  try {
    await db.query('UPDATE bank_accounts SET is_active=0 WHERE id=?', [req.params.id]);
    res.json({ message: 'Bank account removed' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── USERS ─────────────────────────────────────────────────────────────────────

router.get('/users', auth, async (req, res) => {
  try {
    if (req.user.role !== 'superadmin' && req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
    const [rows] = await db.query('SELECT id,name,email,role,branch_id,phone,is_active,last_login,created_at FROM users ORDER BY name');
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/users', auth, async (req, res) => {
  try {
    if (req.user.role !== 'superadmin') return res.status(403).json({ error: 'Forbidden' });
    const d = req.body;
    const hash = await bcrypt.hash(d.password, 10);
    const [r] = await db.query('INSERT INTO users SET ?', [{
      name: d.name, email: d.email, password: hash,
      role: d.role||'staff', branch_id: d.branch_id, phone: d.phone,
    }]);
    res.json({ id: r.insertId, message: 'User created' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/users/:id', auth, async (req, res) => {
  try {
    const d = req.body;
    // Handle partial updates (role only, or is_active only)
    if (d.is_active !== undefined && Object.keys(d).length === 1) {
      await db.query('UPDATE users SET is_active=? WHERE id=?', [d.is_active, req.params.id]);
    } else if (d.role !== undefined && Object.keys(d).length === 1) {
      await db.query('UPDATE users SET role=? WHERE id=?', [d.role, req.params.id]);
    } else {
      const updates = {};
      if (d.name)      updates.name      = d.name;
      if (d.role)      updates.role      = d.role;
      if (d.branch_id) updates.branch_id = d.branch_id;
      if (d.phone)     updates.phone     = d.phone;
      if (d.is_active !== undefined) updates.is_active = d.is_active;
      if (d.password)  updates.password  = await bcrypt.hash(d.password, 10);
      if (Object.keys(updates).length > 0)
        await db.query('UPDATE users SET ? WHERE id=?', [updates, req.params.id]);
    }
    res.json({ message: 'User updated' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/users/:id', auth, async (req, res) => {
  try {
    if (req.user.role !== 'superadmin') return res.status(403).json({ error: 'Forbidden' });
    const [target] = await db.query('SELECT role FROM users WHERE id=?', [req.params.id]);
    if (!target.length) return res.status(404).json({ error: 'User not found' });
    if (target[0].role === 'superadmin') return res.status(403).json({ error: 'Cannot delete superadmin user' });
    await db.query('DELETE FROM users WHERE id=?', [req.params.id]);
    res.json({ message: 'User deleted' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── SETTINGS ─────────────────────────────────────────────────────────────────

router.get('/settings', auth, async (req, res) => {
  try {
    const branch = req.query.branch_id || req.user.branch_id;
    const [rows] = await db.query('SELECT setting_key, setting_value FROM settings WHERE branch_id=?', [branch]);
    const cfg = {};
    rows.forEach(r => { cfg[r.setting_key] = r.setting_value; });
    res.json(cfg);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/settings', auth, async (req, res) => {
  try {
    const branch = req.body.branch_id || req.user.branch_id;
    for (const [key, val] of Object.entries(req.body)) {
      if (key === 'branch_id') continue;
      await db.query(
        'INSERT INTO settings (branch_id,setting_key,setting_value) VALUES (?,?,?) ON DUPLICATE KEY UPDATE setting_value=?',
        [branch,key,val,val]);
    }
    res.json({ message: 'Settings saved' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── BRANCHES ──────────────────────────────────────────────────────────────────

router.get('/branches', auth, async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM branches WHERE is_active=1');
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/branches', auth, async (req, res) => {
  try {
    if (req.user.role !== 'superadmin') return res.status(403).json({ error: 'Forbidden' });
    const d = req.body;
    const [r] = await db.query('INSERT INTO branches SET ?', [{
      name: d.name, address: d.address, city: d.city, state: d.state,
      pincode: d.pincode, phone: d.phone, email: d.email, gst_number: d.gst_number,
    }]);
    res.json({ id: r.insertId, message: 'Branch created' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── BULK IMPORT ───────────────────────────────────────────────────────────────

const multer = require('multer');
const upload = multer({ dest: 'uploads/' });

router.post('/import/:type', auth, upload.single('file'), async (req, res) => {
  try {
    const rows = req.body.data ? JSON.parse(req.body.data) : [];
    const branch = req.body.branch_id || req.user.branch_id;
    const type = req.params.type;
    let inserted = 0, errors = [];
    for (const row of rows) {
      try {
        if (type === 'customers') {
          await db.query('INSERT IGNORE INTO customers SET ?', [{
            branch_id: branch, name: row.name, gst_number: row.gst_number,
            phone: row.phone, city: row.city, state: row.state, email: row.email
          }]);
        } else if (type === 'suppliers') {
          await db.query('INSERT IGNORE INTO suppliers SET ?', [{
            branch_id: branch, name: row.name, supplier_type: row.type||'Other',
            gst_registered: row.gst_registered==='Yes'?1:0, gst_number: row.gst_number, phone: row.phone
          }]);
        } else if (type === 'materials') {
          await db.query('INSERT IGNORE INTO materials SET ?', [{
            branch_id: branch, name: row.name, hsn_code: row.hsn_code,
            unit: row.unit||'Kg', purchase_rate: row.purchase_rate||0,
            sale_rate: row.sale_rate||0, current_stock: row.current_stock||0
          }]);
        }
        inserted++;
      } catch (err) { errors.push({ row, error: err.message }); }
    }
    res.json({ inserted, errors, message: `Imported ${inserted} records` });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── RECALCULATE STOCK ────────────────────────────────────────────────────────
router.post('/recalculate-stock', auth, async (req, res) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const branch = req.body.branch_id || req.user.branch_id;

    // Get all active materials for this branch
    const [mats] = await conn.query('SELECT id FROM materials WHERE branch_id=? AND is_active=1', [branch]);

    for (const mat of mats) {
      // Sum all purchases
      const [[purSum]] = await conn.query(
        `SELECT COALESCE(SUM(pi.quantity),0) as total
         FROM purchase_items pi
         JOIN purchases p ON p.id=pi.purchase_id
         WHERE pi.material_id=? AND p.branch_id=?`,
        [mat.id, branch]);

      // Sum all sales/invoices
      const [[saleSum]] = await conn.query(
        `SELECT COALESCE(SUM(ii.quantity),0) as total
         FROM invoice_items ii
         JOIN invoices i ON i.id=ii.invoice_id
         WHERE ii.material_id=? AND i.branch_id=?`,
        [mat.id, branch]);

      // Sum credit note returns (goods came back)
      const [[cnSum]] = await conn.query(
        `SELECT COALESCE(SUM(ci.quantity),0) as total
         FROM credit_note_items ci
         JOIN credit_notes cn ON cn.id=ci.cn_id
         WHERE ci.material_id=? AND cn.branch_id=?`,
        [mat.id, branch]).catch(() => [[{total:0}]]);

      const newStock = parseFloat(purSum.total) - parseFloat(saleSum.total) + parseFloat(cnSum.total||0);

      await conn.query('UPDATE materials SET current_stock=? WHERE id=?', [newStock, mat.id]);
    }

    // Rebuild stock_movements with correct balance_after
    // Delete old movements
    await conn.query('DELETE FROM stock_movements WHERE branch_id=?', [branch]);

    // Re-insert purchase movements
    const [purMoves] = await conn.query(
      `SELECT p.branch_id, pi.material_id, pi.quantity, pi.rate, pi.total_value, p.purchase_date, p.id as ref_id
       FROM purchase_items pi JOIN purchases p ON p.id=pi.purchase_id
       WHERE p.branch_id=? ORDER BY p.purchase_date ASC, p.id ASC`, [branch]);

    // Re-insert sale movements
    const [saleMoves] = await conn.query(
      `SELECT i.branch_id, ii.material_id, ii.quantity, ii.rate, ii.total_value, i.invoice_date as purchase_date, i.id as ref_id
       FROM invoice_items ii JOIN invoices i ON i.id=ii.invoice_id
       WHERE i.branch_id=? ORDER BY i.invoice_date ASC, i.id ASC`, [branch]);

    // Combine and sort by date
    const allMoves = [
      ...purMoves.map(m=>({...m, type:'Purchase', qty: +m.quantity})),
      ...saleMoves.map(m=>({...m, type:'Sale', qty: -m.quantity})),
    ].sort((a,b) => new Date(a.purchase_date) - new Date(b.purchase_date));

    // Calculate running balance per material
    const balances = {};
    for (const mv of allMoves) {
      if (!balances[mv.material_id]) balances[mv.material_id] = 0;
      balances[mv.material_id] += mv.qty;
      await conn.query('INSERT INTO stock_movements SET ?', [{
        branch_id: branch,
        material_id: mv.material_id,
        movement_type: mv.type,
        reference_type: mv.type==='Purchase'?'purchase':'invoice',
        reference_id: mv.ref_id,
        quantity: mv.qty,
        rate: mv.rate,
        value: mv.total_value,
        balance_after: balances[mv.material_id],
        movement_date: mv.purchase_date,
      }]);
    }

    await conn.commit();
    res.json({ message: `Stock recalculated for ${mats.length} materials. Movements rebuilt.` });
  } catch(e) {
    await conn.rollback();
    res.status(500).json({ error: e.message });
  } finally {
    conn.release();
  }
});

module.exports = router;
