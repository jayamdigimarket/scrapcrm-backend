const router  = require('express').Router();
const auth    = require('../middleware/auth');
const db      = require('../config/db');
const { nextDocNumber, amountToWords } = require('../config/docNumber');

// ── INVOICES ──────────────────────────────────────────────

router.get('/invoices', auth, async (req, res) => {
  try {
    const branch = req.query.branch_id || req.user.branch_id;
    const { from, to, status, customer_id } = req.query;
    let where = 'WHERE i.branch_id=?';
    const args = [branch];
    if (from)        { where += ' AND i.invoice_date>=?'; args.push(from); }
    if (to)          { where += ' AND i.invoice_date<=?'; args.push(to); }
    if (status)      { where += ' AND i.payment_status=?'; args.push(status); }
    if (customer_id) { where += ' AND i.customer_id=?'; args.push(customer_id); }
    const [rows] = await db.query(`
      SELECT i.*, c.name as customer_name, c.gst_number as customer_gst, c.state as customer_state,
        (SELECT COUNT(*) FROM credit_notes cn WHERE cn.invoice_id=i.id) as cn_count,
        (SELECT COALESCE(SUM(cn.total_amount),0) FROM credit_notes cn WHERE cn.invoice_id=i.id AND cn.status='Applied') as cn_total,
        (SELECT GROUP_CONCAT(cn.cn_number ORDER BY cn.cn_date SEPARATOR ', ') FROM credit_notes cn WHERE cn.invoice_id=i.id) as cn_numbers
      FROM invoices i JOIN customers c ON c.id=i.customer_id
      ${where} ORDER BY i.invoice_date DESC, i.id DESC`, args);
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET single invoice with items — for print
router.get('/invoices/:id', auth, async (req, res) => {
  try {
    const [inv] = await db.query(`
      SELECT i.*, c.name as customer_name, c.business_name,
        c.gst_number, c.billing_address, c.shipping_address,
        c.state, c.city, c.pincode, c.phone
      FROM invoices i JOIN customers c ON c.id=i.customer_id
      WHERE i.id=?`, [req.params.id]);
    if (!inv.length) return res.status(404).json({ error: 'Not found' });

    const [items] = await db.query(`
      SELECT ii.*, m.name as material_name, m.unit
      FROM invoice_items ii
      LEFT JOIN materials m ON m.id=ii.material_id
      WHERE ii.invoice_id=?`, [req.params.id]);

    const [payments] = await db.query(
      'SELECT * FROM payments WHERE invoice_id=? ORDER BY payment_date', [req.params.id]);
    const [cns] = await db.query(
      `SELECT cn.*, c.name as customer_name
       FROM credit_notes cn
       LEFT JOIN customers c ON c.id=cn.customer_id
       WHERE cn.invoice_id=? ORDER BY cn.cn_date`, [req.params.id]);

    res.json({ ...inv[0], items, payments, credit_notes: cns });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/invoices', auth, async (req, res) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const d      = req.body;
    const branch = d.branch_id || req.user.branch_id;
    const invNo  = await nextDocNumber(branch, 'INV');

    let subtotal=0, cgst=0, sgst=0, igst=0;
    d.items.forEach(item => {
      subtotal += +item.taxable_value || 0;
      cgst     += +item.cgst_amount  || 0;
      sgst     += +item.sgst_amount  || 0;
      igst     += +item.igst_amount  || 0;
    });
    const total = subtotal + cgst + sgst + igst;
    const dueDate = new Date(d.invoice_date);
    dueDate.setDate(dueDate.getDate() + (d.payment_terms || 7));

    const [r] = await conn.query(`INSERT INTO invoices SET ?`, [{
      branch_id: branch, invoice_number: invNo,
      invoice_date: d.invoice_date, customer_id: d.customer_id,
      bill_to_address: d.bill_to_address, ship_to_address: d.ship_to_address,
      po_reference: d.po_reference, po_date: d.po_date,
      vehicle_number: d.vehicle_number,
      incoterms: d.incoterms || 'FOB Road',
      subtotal, cgst_amount: cgst, sgst_amount: sgst, igst_amount: igst,
      total_amount: total, amount_in_words: amountToWords(total),
      balance_due: total, payment_status: 'Unpaid',
      payment_terms: d.payment_terms || 7, due_date: dueDate,
      notes: d.notes, created_by: req.user.id,
    }]);

    for (const item of d.items) {
      if (!item.material_id) continue;
      await conn.query('INSERT INTO invoice_items SET ?', [{
        invoice_id: r.insertId, material_id: item.material_id,
        description: item.description, hsn_code: item.hsn_code,
        quantity: item.quantity, rate: item.rate,
        taxable_value: item.taxable_value,
        cgst_rate: item.cgst_rate||0, cgst_amount: item.cgst_amount||0,
        sgst_rate: item.sgst_rate||0, sgst_amount: item.sgst_amount||0,
        igst_rate: item.igst_rate||0, igst_amount: item.igst_amount||0,
        total_value: item.total_value,
      }]);
      const [mat] = await conn.query(
        'SELECT current_stock FROM materials WHERE id=?', [item.material_id]);
      const newStock = (parseFloat(mat[0]?.current_stock) || 0) - parseFloat(item.quantity);
      await conn.query(
        'UPDATE materials SET current_stock=? WHERE id=?', [newStock, item.material_id]);
      await conn.query('INSERT INTO stock_movements SET ?', [{
        branch_id: branch, material_id: item.material_id,
        movement_type: 'Sale', reference_type: 'invoice', reference_id: r.insertId,
        quantity: -item.quantity, rate: item.rate, value: item.total_value,
        balance_after: newStock, movement_date: d.invoice_date,
      }]);
    }

    await conn.commit();
    res.json({ id: r.insertId, invoice_number: invNo, message: 'Invoice created' });
  } catch (e) {
    await conn.rollback();
    console.error('Invoice error:', e.message);
    res.status(500).json({ error: e.message });
  } finally { conn.release(); }
});

router.put('/invoices/:id', auth, async (req, res) => {
  try {
    const d = req.body;
    await db.query(
      `UPDATE invoices SET invoice_date=?,po_reference=?,vehicle_number=?,notes=? WHERE id=?`,
      [d.invoice_date, d.po_reference, d.vehicle_number, d.notes, req.params.id]);
    res.json({ message: 'Updated' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/invoices/:id', auth, async (req, res) => {
  try {
    await db.query('DELETE FROM invoices WHERE id=?', [req.params.id]);
    res.json({ message: 'Deleted' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── PURCHASES ─────────────────────────────────────────────

router.get('/purchases', auth, async (req, res) => {
  try {
    const branch = req.query.branch_id || req.user.branch_id;
    const [rows] = await db.query(`
      SELECT p.*, s.name as supplier_name, s.gst_registered, s.supplier_type
      FROM purchases p JOIN suppliers s ON s.id=p.supplier_id
      WHERE p.branch_id=? ORDER BY p.purchase_date DESC`, [branch]);
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/purchases/:id', auth, async (req, res) => {
  try {
    const [pur] = await db.query(`
      SELECT p.*, s.name as supplier_name, s.gst_number as supplier_gst,
        s.gst_registered, s.address as supplier_address
      FROM purchases p JOIN suppliers s ON s.id=p.supplier_id
      WHERE p.id=?`, [req.params.id]);
    if (!pur.length) return res.status(404).json({ error: 'Not found' });
    const [items] = await db.query(`
      SELECT pi.*, m.name as material_name, m.unit
      FROM purchase_items pi JOIN materials m ON m.id=pi.material_id
      WHERE pi.purchase_id=?`, [req.params.id]);
    res.json({ ...pur[0], items });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/purchases', auth, async (req, res) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const d = req.body;
    const branch = d.branch_id || req.user.branch_id;

    const [supplier] = await conn.query('SELECT * FROM suppliers WHERE id=?', [d.supplier_id]);
    if (!supplier.length) throw new Error('Supplier not found');
    const isGST = supplier[0].gst_registered;

    const purNo = await nextDocNumber(branch, 'PUR');
    let subtotal=0, cgst=0, sgst=0, igst=0;
    d.items.forEach(item => {
      subtotal += +item.taxable_value || 0;
      cgst     += +item.cgst_amount  || 0;
      sgst     += +item.sgst_amount  || 0;
      igst     += +item.igst_amount  || 0;
    });
    const total = subtotal + cgst + sgst + igst;
    const dueDate = new Date(d.purchase_date);
    dueDate.setDate(dueDate.getDate() + (d.payment_terms || 7));

    const [r] = await conn.query('INSERT INTO purchases SET ?', [{
      branch_id: branch, purchase_number: purNo,
      purchase_date: d.purchase_date, supplier_id: d.supplier_id,
      vehicle_number: d.vehicle_number, driver_name: d.driver_name,
      subtotal, cgst_amount: cgst, sgst_amount: sgst, igst_amount: igst,
      total_amount: total, balance_due: total, payment_status: 'Unpaid',
      payment_terms: d.payment_terms||7, due_date: dueDate,
      notes: d.notes, created_by: req.user.id,
    }]);

    for (const item of d.items) {
      if (!item.material_id) continue;
      await conn.query('INSERT INTO purchase_items SET ?', [{
        purchase_id: r.insertId, material_id: item.material_id,
        hsn_code: item.hsn_code, quantity: item.quantity, rate: item.rate,
        taxable_value: item.taxable_value,
        cgst_rate:   isGST ? item.cgst_rate||0   : 0,
        cgst_amount: isGST ? item.cgst_amount||0  : 0,
        sgst_rate:   isGST ? item.sgst_rate||0   : 0,
        sgst_amount: isGST ? item.sgst_amount||0  : 0,
        igst_rate:   isGST ? item.igst_rate||0   : 0,
        igst_amount: isGST ? item.igst_amount||0  : 0,
        total_value: item.total_value,
      }]);
      const [mat] = await conn.query(
        'SELECT current_stock FROM materials WHERE id=?', [item.material_id]);
      const newStock = (parseFloat(mat[0]?.current_stock)||0) + parseFloat(item.quantity);
      await conn.query(
        'UPDATE materials SET current_stock=? WHERE id=?', [newStock, item.material_id]);
      await conn.query('INSERT INTO stock_movements SET ?', [{
        branch_id: branch, material_id: item.material_id,
        movement_type: 'Purchase', reference_type: 'purchase', reference_id: r.insertId,
        quantity: item.quantity, rate: item.rate, value: item.total_value,
        balance_after: newStock, movement_date: d.purchase_date,
      }]);
    }

    // Auto-create backdated PO for Non-GST supplier
    let autoPoId = null;
    if (!isGST) {
      const poNo = await nextDocNumber(branch, 'PO');
      const [po] = await conn.query('INSERT INTO purchase_orders SET ?', [{
        branch_id: branch, po_number: poNo, po_date: d.purchase_date,
        supplier_id: d.supplier_id, supplier_type: 'Non-GST',
        is_auto_generated: 1, linked_purchase_id: r.insertId,
        subtotal, cgst_amount: 0, sgst_amount: 0, igst_amount: 0,
        total_amount: subtotal, status: 'Received', created_by: req.user.id,
      }]);
      for (const item of d.items) {
        if (!item.material_id) continue;
        await conn.query('INSERT INTO purchase_order_items SET ?', [{
          po_id: po.insertId, material_id: item.material_id,
          hsn_code: item.hsn_code, quantity: item.quantity, rate: item.rate,
          taxable_value: item.taxable_value, total_value: item.taxable_value,
        }]);
      }
      await conn.query('UPDATE purchases SET po_id=? WHERE id=?', [po.insertId, r.insertId]);
      autoPoId = po.insertId;
    }

    await conn.commit();
    res.json({
      id: r.insertId, purchase_number: purNo,
      auto_po_created: !isGST, auto_po_id: autoPoId,
      message: 'Purchase recorded',
    });
  } catch (e) {
    await conn.rollback();
    console.error('Purchase error:', e.message);
    res.status(500).json({ error: e.message });
  } finally { conn.release(); }
});

// ── PURCHASE ORDERS ───────────────────────────────────────

router.get('/purchase-orders', auth, async (req, res) => {
  try {
    const branch = req.query.branch_id || req.user.branch_id;
    const [rows] = await db.query(`
      SELECT po.*, s.name as supplier_name, s.gst_registered, s.phone as supplier_phone
      FROM purchase_orders po JOIN suppliers s ON s.id=po.supplier_id
      WHERE po.branch_id=? ORDER BY po.po_date DESC`, [branch]);
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET single PO with items — for print
router.get('/purchase-orders/:id', auth, async (req, res) => {
  try {
    const [pos] = await db.query(`
      SELECT po.*, s.name as supplier_name, s.business_name as supplier_business,
        s.gst_registered, s.gst_number, s.address, s.city, s.state, s.phone
      FROM purchase_orders po
      JOIN suppliers s ON s.id=po.supplier_id
      WHERE po.id=?`, [req.params.id]);
    if (!pos.length) return res.status(404).json({ error: 'PO not found' });

    const [items] = await db.query(`
      SELECT poi.*, m.name as material_name, m.hsn_code as mat_hsn
      FROM purchase_order_items poi
      LEFT JOIN materials m ON m.id=poi.material_id
      WHERE poi.po_id=?`, [req.params.id]);

    res.json({
      ...pos[0],
      items: items.map(it => ({
        ...it,
        material_name: it.material_name || '',
        hsn_code: it.hsn_code || it.mat_hsn || '',
      })),
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Manual PO creation
router.post('/purchase-orders', auth, async (req, res) => {
  try {
    const d = req.body;
    const branch = d.branch_id || req.user.branch_id;
    const poNo = await nextDocNumber(branch, 'PO');

    let subtotal=0, cgst=0, sgst=0, igst=0;
    (d.items||[]).forEach(i => {
      subtotal += +i.taxable_value || 0;
      cgst     += +i.cgst_amount  || 0;
      sgst     += +i.sgst_amount  || 0;
      igst     += +i.igst_amount  || 0;
    });
    const total = subtotal + cgst + sgst + igst;

    const [r] = await db.query('INSERT INTO purchase_orders SET ?', [{
      branch_id: branch, po_number: poNo, po_date: d.po_date,
      supplier_id: d.supplier_id,
      supplier_type: d.supplier_type || 'GST',
      subtotal, cgst_amount: cgst, sgst_amount: sgst, igst_amount: igst,
      total_amount: total,
      payment_terms: d.payment_terms || 7,
      incoterms: d.incoterms || 'FOB Road',
      terms_conditions: d.terms_conditions,
      notes: d.notes,
      status: d.status || 'Pending',
      is_auto_generated: 0,
      created_by: req.user.id,
    }]);

    for (const item of (d.items || [])) {
      if (!item.material_id) continue;
      await db.query('INSERT INTO purchase_order_items SET ?', [{
        po_id: r.insertId, material_id: item.material_id,
        hsn_code: item.hsn_code, quantity: item.quantity, rate: item.rate,
        taxable_value: item.taxable_value,
        cgst_rate: item.cgst_rate||0, cgst_amount: item.cgst_amount||0,
        sgst_rate: item.sgst_rate||0, sgst_amount: item.sgst_amount||0,
        igst_rate: item.igst_rate||0, igst_amount: item.igst_amount||0,
        total_value: item.total_value || item.taxable_value,
      }]);
    }

    res.json({ id: r.insertId, po_number: poNo, message: 'PO created' });
  } catch (e) {
    console.error('PO create error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// Update PO status
router.put('/purchase-orders/:id', auth, async (req, res) => {
  try {
    const { status } = req.body;
    await db.query('UPDATE purchase_orders SET status=? WHERE id=?', [status, req.params.id]);
    res.json({ message: 'PO updated' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── PAYMENTS ─────────────────────────────────────────────

router.post('/payments', auth, async (req, res) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const d = req.body;
    const branch = d.branch_id || req.user.branch_id;

    const payNo = await nextDocNumber(branch, 'REC');

    const [r] = await conn.query('INSERT INTO payments SET ?', [{
      branch_id: branch, payment_number: payNo,
      payment_date: d.payment_date,
      party_type: d.party_type, party_id: d.party_id,
      payment_mode: d.payment_mode || 'Bank Transfer',
      amount: d.amount, reference_number: d.reference_number,
      bank_account_id: d.bank_account_id || null,
      invoice_id: d.invoice_id || null,
      purchase_id: d.purchase_id || null,
      razorpay_order_id: d.razorpay_order_id || null,
      notes: d.notes, created_by: req.user.id,
    }]);

    // Update invoice balance
    if (d.invoice_id) {
      const [inv] = await conn.query(
        'SELECT balance_due, amount_paid FROM invoices WHERE id=?', [d.invoice_id]);
      const newPaid = (parseFloat(inv[0].amount_paid) || 0) + parseFloat(d.amount);
      const newBal  = (parseFloat(inv[0].balance_due)  || 0) - parseFloat(d.amount);
      await conn.query(
        'UPDATE invoices SET amount_paid=?,balance_due=?,payment_status=? WHERE id=?',
        [newPaid, Math.max(0, newBal), newBal <= 0 ? 'Paid' : 'Partial', d.invoice_id]);
    }

    // Update purchase balance
    if (d.purchase_id) {
      const [pur] = await conn.query(
        'SELECT balance_due, amount_paid FROM purchases WHERE id=?', [d.purchase_id]);
      const newPaid = (parseFloat(pur[0].amount_paid) || 0) + parseFloat(d.amount);
      const newBal  = (parseFloat(pur[0].balance_due)  || 0) - parseFloat(d.amount);
      await conn.query(
        'UPDATE purchases SET amount_paid=?,balance_due=?,payment_status=? WHERE id=?',
        [newPaid, Math.max(0, newBal), newBal <= 0 ? 'Paid' : 'Partial', d.purchase_id]);
    }

    // Update bank balance
    if (d.bank_account_id) {
      const sign = d.party_type === 'customer' ? 1 : -1;
      await conn.query(
        'UPDATE bank_accounts SET current_balance=current_balance+(?) WHERE id=?',
        [sign * parseFloat(d.amount), d.bank_account_id]);
    }

    await conn.commit();
    res.json({ id: r.insertId, payment_number: payNo, message: 'Payment recorded' });
  } catch (e) {
    await conn.rollback();
    console.error('Payment error:', e.message);
    res.status(500).json({ error: e.message });
  } finally { conn.release(); }
});

module.exports = router;

// ── SUPPLIER ADVANCES ────────────────────────────────────────────────────────

router.get('/supplier-advances', auth, async (req, res) => {
  try {
    const branch = req.query.branch_id || req.user.branch_id;
    const [rows] = await db.query(`
      SELECT sa.*, s.name as supplier_name, s.phone
      FROM supplier_advances sa
      JOIN suppliers s ON s.id=sa.supplier_id
      WHERE sa.branch_id=? ORDER BY sa.advance_date DESC`, [branch]);
    res.json(rows);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

router.post('/supplier-advances', auth, async (req, res) => {
  try {
    const d = req.body;
    const branch = d.branch_id || req.user.branch_id;
    const [r] = await db.query('INSERT INTO supplier_advances SET ?', [{
      branch_id: branch,
      supplier_id: d.supplier_id,
      amount: d.amount,
      adjusted_amount: 0,
      balance_amount: d.amount,
      payment_mode: d.payment_mode || 'Cash',
      reference_number: d.reference_number || '',
      advance_date: d.advance_date,
      notes: d.notes || '',
      status: 'Pending',
      created_by: req.user.id,
    }]);
    res.json({ id: r.insertId, message: 'Advance recorded' });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// PUT /purchases/:id — update balance/status after payment
router.put('/purchases/:id', auth, async (req, res) => {
  try {
    const d = req.body;
    const updates = {};
    if (d.balance_due   !== undefined) updates.balance_due   = d.balance_due;
    if (d.payment_status !== undefined) updates.payment_status = d.payment_status;
    if (d.amount_paid   !== undefined) updates.amount_paid   = d.amount_paid;
    if (Object.keys(updates).length > 0)
      await db.query('UPDATE purchases SET ? WHERE id=?', [updates, req.params.id]);
    res.json({ message: 'Purchase updated' });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ── GRN (GOODS RECEIVED NOTE) ─────────────────────────────────────────────────

router.post('/grn', auth, async (req, res) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const d = req.body;
    const branch = d.branch_id || req.user.branch_id;

    // Get purchase details
    const [pur] = await conn.query('SELECT * FROM purchases WHERE id=?', [d.purchase_id]);
    if (!pur.length) throw new Error('Purchase not found');

    // Save GRN header
    const [r] = await conn.query('INSERT INTO grn_records SET ?', [{
      branch_id:       branch,
      purchase_id:     d.purchase_id,
      supplier_id:     pur[0].supplier_id,
      received_date:   d.received_date,
      vehicle_number:  d.vehicle_number || '',
      received_by:     d.received_by || '',
      remarks:         d.remarks || '',
      status:          'Received',
      created_by:      req.user.id,
    }]);

    const grnId = r.insertId;

    // Process each item - update stock
    for (const item of (d.items || [])) {
      if (!item.material_id || !item.received_qty) continue;

      // Save GRN item
      await conn.query('INSERT INTO grn_items SET ?', [{
        grn_id:       grnId,
        material_id:  item.material_id,
        po_qty:       item.quantity || 0,
        received_qty: item.received_qty,
        remarks:      item.remarks || '',
      }]);

      // Update material stock
      const [mat] = await conn.query('SELECT current_stock FROM materials WHERE id=?', [item.material_id]);
      if (mat.length) {
        const newStock = parseFloat(mat[0].current_stock || 0) + parseFloat(item.received_qty || 0);
        await conn.query('UPDATE materials SET current_stock=? WHERE id=?', [newStock, item.material_id]);

        // Add stock movement
        await conn.query('INSERT INTO stock_movements SET ?', [{
          branch_id:       branch,
          material_id:     item.material_id,
          movement_type:   'Purchase',
          reference_type:  'grn',
          reference_id:    grnId,
          quantity:        item.received_qty,
          rate:            item.rate || 0,
          value:           (item.received_qty * (item.rate || 0)),
          balance_after:   newStock,
          movement_date:   d.received_date,
          notes:           'GRN #' + grnId,
        }]);
      }
    }

    // Mark purchase as received
    await conn.query('UPDATE purchases SET status=? WHERE id=?', ['Received', d.purchase_id]);

    await conn.commit();
    res.json({ id: grnId, message: 'GRN saved and stock updated' });
  } catch(e) {
    await conn.rollback();
    res.status(500).json({ error: e.message });
  } finally {
    conn.release();
  }
});

// GET /purchases/:id - get single purchase with items
router.get('/purchases/:id', auth, async (req, res) => {
  try {
    const [pur] = await db.query('SELECT * FROM purchases WHERE id=?', [req.params.id]);
    if (!pur.length) return res.status(404).json({ error: 'Not found' });
    const [items] = await db.query(`
      SELECT pi.*, m.name as material_name, m.unit, m.hsn_code
      FROM purchase_items pi
      JOIN materials m ON m.id=pi.material_id
      WHERE pi.purchase_id=?`, [req.params.id]);
    res.json({ ...pur[0], items });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ── WHATSAPP REMINDER (stub) ──────────────────────────────────────────────────
router.post('/whatsapp/reminder/:id', auth, async (req, res) => {
  try {
    const [inv] = await db.query(`
      SELECT i.*, c.name as customer_name, c.phone, c.whatsapp
      FROM invoices i JOIN customers c ON c.id=i.customer_id
      WHERE i.id=?`, [req.params.id]);
    if (!inv.length) return res.status(404).json({ error: 'Invoice not found' });
    const i = inv[0];
    const phone = (i.whatsapp || i.phone || '').replace(/\D/g, '');
    const num = phone.startsWith('91') ? phone : '91' + phone;
    const msg = `Dear ${i.customer_name},\n\nThis is a reminder that Invoice ${i.invoice_number} for ₹${i.balance_due} is pending payment.\n\nPlease arrange payment at the earliest.\n\n— MVR POLYPLAST\nPh: 6305064899`;
    res.json({ success: true, phone: num, message: msg, whatsapp_url: `https://wa.me/${num}?text=${encodeURIComponent(msg)}` });
  } catch(e) { res.status(500).json({ error: e.message }); }
});
