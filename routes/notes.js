const router   = require('express').Router();
const auth     = require('../middleware/auth');
const db       = require('../config/db');
const multer   = require('multer');
const path     = require('path');
const nodemailer = require('nodemailer');
const { nextDocNumber } = require('../config/docNumber');

const upload = multer({ dest: 'uploads/', limits: { fileSize: 10*1024*1024 } });

// ── CREDIT NOTES ──────────────────────────────────────────

router.get('/credit-notes', auth, async (req, res) => {
  try {
    const branch = req.query.branch_id || req.user.branch_id;
    const [rows] = await db.query(`
      SELECT cn.*, c.name as customer_name, i.invoice_number
      FROM credit_notes cn
      JOIN customers c ON c.id=cn.customer_id
      JOIN invoices i ON i.id=cn.invoice_id
      WHERE cn.branch_id=? ORDER BY cn.cn_date DESC`, [branch]);
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/credit-notes/:id', auth, async (req, res) => {
  try {
    const [cn] = await db.query(`
      SELECT cn.*, c.name as customer_name, c.gst_number, c.billing_address, c.phone,
        i.invoice_number, i.invoice_date
      FROM credit_notes cn
      JOIN customers c ON c.id=cn.customer_id
      JOIN invoices i ON i.id=cn.invoice_id
      WHERE cn.id=?`, [req.params.id]);
    const [items] = await db.query(`
      SELECT cni.*, m.name as material_name, m.unit
      FROM credit_note_items cni JOIN materials m ON m.id=cni.material_id WHERE cni.cn_id=?`, [req.params.id]);
    res.json({ ...cn[0], items });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/credit-notes', auth, async (req, res) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const d = req.body;
    const branch = d.branch_id || req.user.branch_id;
    const cnNo = await nextDocNumber(branch, 'CN');
    let subtotal=0, cgst=0, sgst=0, igst=0;
    d.items.forEach(i => { subtotal+=+i.taxable_value; cgst+=+i.cgst_amount||0; sgst+=+i.sgst_amount||0; igst+=+i.igst_amount||0; });
    const total = subtotal+cgst+sgst+igst;
    const [r] = await conn.query('INSERT INTO credit_notes SET ?', [{
      branch_id: branch, cn_number: cnNo, cn_date: d.cn_date,
      customer_id: d.customer_id, invoice_id: d.invoice_id, reason: d.reason,
      their_dn_number: d.their_dn_number||'',
      their_dn_date: d.their_dn_date||null,
      their_dn_amount: d.their_dn_amount||0,
      subtotal, cgst_amount: cgst, sgst_amount: sgst, igst_amount: igst, total_amount: total,
      status: 'Pending', auto_generated: d.auto_generated||0, created_by: req.user.id,
    }]);
    for (const item of d.items) {
      await conn.query('INSERT INTO credit_note_items SET ?', [{
        cn_id: r.insertId, material_id: item.material_id, hsn_code: item.hsn_code,
        quantity: item.quantity, rate: item.rate, taxable_value: item.taxable_value,
        cgst_rate: item.cgst_rate||0, cgst_amount: item.cgst_amount||0,
        sgst_rate: item.sgst_rate||0, sgst_amount: item.sgst_amount||0,
        igst_rate: item.igst_rate||0, igst_amount: item.igst_amount||0,
        total_value: item.total_value,
      }]);
    }
    // Validate: check invoice balance before applying CN
    const [inv] = await conn.query(
      'SELECT balance_due, total_amount, invoice_number FROM invoices WHERE id=?', [d.invoice_id]);
    if (!inv.length) throw new Error('Invoice not found');
    const currentBal = parseFloat(inv[0].balance_due) || 0;
    if (currentBal <= 0) {
      throw new Error(`Invoice ${inv[0].invoice_number} is already fully settled (Balance: ₹0). Cannot apply another credit note.`);
    }
    if (total > currentBal + 1) { // allow ₹1 rounding tolerance
      throw new Error(`CN amount ₹${total} exceeds invoice balance ₹${currentBal}. Please reduce CN amount.`);
    }
    const newBal = Math.max(0, currentBal - total);
    const status = newBal <= 0 ? 'Paid' : 'Partial';
    await conn.query('UPDATE invoices SET balance_due=?,payment_status=? WHERE id=?', [newBal, status, d.invoice_id]);
    await conn.query('UPDATE credit_notes SET status=?,applied_amount=? WHERE id=?', ['Applied', total, r.insertId]);
    await conn.commit();
    if (d.send_email) await sendCNEmail(r.insertId, cnNo, branch);
    res.json({ id: r.insertId, cn_number: cnNo, message: 'Credit note created and applied' });
  } catch (e) { await conn.rollback(); res.status(500).json({ error: e.message }); }
  finally { conn.release(); }
});

// Upload vendor debit note → auto create credit note
router.post('/debit-notes/upload-vendor', auth, upload.single('vendor_dn'), async (req, res) => {
  try {
    const d = req.body;
    const branch = d.branch_id || req.user.branch_id;
    const filePath = req.file ? req.file.path : null;
    const dnNo = await nextDocNumber(branch, 'DN');
    const [dn] = await db.query('INSERT INTO debit_notes SET ?', [{
      branch_id: branch, dn_number: dnNo, dn_date: d.dn_date,
      supplier_id: d.supplier_id, purchase_id: d.purchase_id,
      reason: d.reason, total_amount: d.total_amount,
      vendor_dn_file: filePath, created_by: req.user.id,
    }]);
    const cnNo = await nextDocNumber(branch, 'CN');
    const [cn] = await db.query('INSERT INTO credit_notes SET ?', [{
      branch_id: branch, cn_number: cnNo, cn_date: d.dn_date,
      customer_id: d.customer_id, invoice_id: d.invoice_id,
      reason: `Auto-generated against vendor DN: ${dnNo}. ${d.reason}`,
      total_amount: d.total_amount, status: 'Pending',
      auto_generated: 1, vendor_dn_file: filePath, created_by: req.user.id,
    }]);
    await db.query('UPDATE debit_notes SET linked_cn_id=? WHERE id=?', [cn.insertId, dn.insertId]);
    if (d.send_email) await sendCNEmail(cn.insertId, cnNo, branch);
    res.json({ dn_id: dn.insertId, cn_id: cn.insertId, cn_number: cnNo, dn_number: dnNo, message: 'DN uploaded, CN auto-created' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── DEBIT NOTES ──────────────────────────────────────────

router.get('/debit-notes', auth, async (req, res) => {
  try {
    const branch = req.query.branch_id || req.user.branch_id;
    const [rows] = await db.query(`
      SELECT dn.*, s.name as supplier_name, s.gst_number as supplier_gst,
        p.purchase_number
      FROM debit_notes dn
      JOIN suppliers s ON s.id=dn.supplier_id
      LEFT JOIN purchases p ON p.id=dn.purchase_id
      WHERE dn.branch_id=? ORDER BY dn.dn_date DESC`, [branch]);
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/debit-notes', auth, async (req, res) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const d = req.body;
    const branch = d.branch_id || req.user.branch_id;
    const dnNo = await nextDocNumber(branch, 'DN');
    const total = parseFloat(d.total_amount) || 0;
    const [r] = await conn.query('INSERT INTO debit_notes SET ?', [{
      branch_id: branch, dn_number: dnNo, dn_date: d.dn_date,
      supplier_id: d.supplier_id, purchase_id: d.purchase_id,
      reason: d.reason, dn_type: d.dn_type||'quality',
      total_amount: total, created_by: req.user.id,
    }]);
    // Save line items if provided
    if (d.items && d.items.length > 0) {
      for (const item of d.items) {
        if (!item.material_id) continue;
        await conn.query('INSERT INTO debit_note_items SET ?', [{
          dn_id: r.insertId,
          material_id: item.material_id,
          hsn_code: item.hsn_code||'',
          quantity: item.quantity||0,
          rate: item.rate||0,
          taxable_value: item.taxable_value||0,
          cgst_rate: item.cgst_rate||0,
          cgst_amount: item.cgst_amount||0,
          sgst_rate: item.sgst_rate||0,
          sgst_amount: item.sgst_amount||0,
          igst_rate: item.igst_rate||0,
          igst_amount: item.igst_amount||0,
          total_value: item.total_value||0,
        }]);
      }
    }
    // Reduce purchase balance_due by DN amount
    if (d.purchase_id) {
      const [pur] = await conn.query('SELECT balance_due, total_amount FROM purchases WHERE id=?', [d.purchase_id]);
      if (pur.length) {
        const newBal = Math.max(0, (parseFloat(pur[0].balance_due)||0) - total);
        await conn.query('UPDATE purchases SET balance_due=?,payment_status=? WHERE id=?',
          [newBal, newBal<=0?'Paid':'Partial', d.purchase_id]);
      }
    }
    await conn.query('UPDATE debit_notes SET status=?,applied_amount=? WHERE id=?', ['Applied', total, r.insertId]);
    await conn.commit();
    res.json({ id: r.insertId, dn_number: dnNo, message: 'Debit note created and applied to purchase' });
  } catch (e) { await conn.rollback(); res.status(500).json({ error: e.message }); }
  finally { conn.release(); }
});

// GET single debit note with items
router.get('/debit-notes/:id', auth, async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT dn.*, s.name as supplier_name, s.gst_number as supplier_gst,
        s.phone as supplier_phone, s.address as supplier_address,
        p.purchase_number
      FROM debit_notes dn
      JOIN suppliers s ON s.id=dn.supplier_id
      LEFT JOIN purchases p ON p.id=dn.purchase_id
      WHERE dn.id=?`, [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    const [items] = await db.query(`
      SELECT dni.*, m.name as material_name, m.hsn_code as mat_hsn
      FROM debit_note_items dni
      LEFT JOIN materials m ON m.id=dni.material_id
      WHERE dni.dn_id=?`, [req.params.id]);
    res.json({ ...rows[0], items });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── DELIVERY CHALLANS ─────────────────────────────────────

router.get('/delivery-challans', auth, async (req, res) => {
  try {
    const branch = req.query.branch_id || req.user.branch_id;
    const [rows] = await db.query(`
      SELECT dc.*, c.name as customer_name, i.invoice_number
      FROM delivery_challans dc
      JOIN customers c ON c.id=dc.customer_id
      LEFT JOIN invoices i ON i.id=dc.invoice_id
      WHERE dc.branch_id=? ORDER BY dc.challan_date DESC`, [branch]);
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET single Delivery Challan with items — for print
router.get('/delivery-challans/:id', auth, async (req, res) => {
  try {
    const [dcs] = await db.query(`
      SELECT dc.*,
        c.name as customer_name, c.phone, c.gst_number,
        c.billing_address, c.city, c.state,
        i.invoice_number
      FROM delivery_challans dc
      JOIN customers c ON c.id = dc.customer_id
      LEFT JOIN invoices i ON i.id = dc.invoice_id
      WHERE dc.id = ?`, [req.params.id]);

    if (!dcs.length) return res.status(404).json({ error: 'Challan not found' });

    const [items] = await db.query(`
      SELECT ci.*,
        m.name as material_name,
        m.hsn_code as mat_hsn
      FROM challan_items ci
      LEFT JOIN materials m ON m.id = ci.material_id
      WHERE ci.challan_id = ?`, [req.params.id]);

    const enrichedItems = items.map(it => ({
      ...it,
      material_name: it.material_name || '',
      hsn_code: it.hsn_code || it.mat_hsn || '',
      rate:     parseFloat(it.rate)     || 0,
      value:    parseFloat(it.value)    || 0,
      quantity: parseFloat(it.quantity) || 0,
    }));

    res.json({ ...dcs[0], items: enrichedItems });
  } catch (e) {
    console.error('DC detail error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

router.post('/delivery-challans', auth, async (req, res) => {
  try {
    const d = req.body;
    const branch = d.branch_id || req.user.branch_id;
    const challanNo = await nextDocNumber(branch, 'DC');
    const [r] = await db.query('INSERT INTO delivery_challans SET ?', [{
      branch_id: branch, challan_number: challanNo, challan_date: d.challan_date,
      invoice_id: d.invoice_id||null, customer_id: d.customer_id,
      vehicle_number: d.vehicle_number, driver_name: d.driver_name,
      driver_contact: d.driver_contact, transporter_name: d.transporter_name,
      status: 'Draft', notes: d.notes, created_by: req.user.id,
    }]);
    let totalQty=0, totalVal=0;
    for (const item of d.items) {
      const val = parseFloat(item.value) || ((parseFloat(item.quantity)||0) * (parseFloat(item.rate)||0));
      await db.query('INSERT INTO challan_items SET ?', [{
        challan_id: r.insertId, material_id: item.material_id,
        hsn_code: item.hsn_code, quantity: item.quantity,
        rate: item.rate||0, value: val,
      }]);
      totalQty += parseFloat(item.quantity) || 0;
      totalVal += val;
    }
    await db.query('UPDATE delivery_challans SET total_quantity=?,total_value=? WHERE id=?',
      [totalQty, totalVal, r.insertId]);
    res.json({ id: r.insertId, challan_number: challanNo, message: 'Challan created' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── EMAIL HELPER ──────────────────────────────────────────

async function sendCNEmail(cnId, cnNo, branchId) {
  try {
    const [settings] = await db.query(
      `SELECT setting_key, setting_value FROM settings
       WHERE branch_id=? AND setting_key IN ('smtp_host','smtp_port','smtp_user','smtp_pass','company_name')`,
      [branchId]);
    const cfg = {};
    settings.forEach(s => { cfg[s.setting_key] = s.setting_value; });
    if (!cfg.smtp_host || !cfg.smtp_user) return;
    const transporter = nodemailer.createTransport({
      host: cfg.smtp_host, port: +cfg.smtp_port||587, secure: false,
      auth: { user: cfg.smtp_user, pass: cfg.smtp_pass },
    });
    const [cn] = await db.query(
      'SELECT cn.*, c.email, c.name FROM credit_notes cn JOIN customers c ON c.id=cn.customer_id WHERE cn.id=?',
      [cnId]);
    if (!cn[0]?.email) return;
    await transporter.sendMail({
      from: `${cfg.company_name} <${cfg.smtp_user}>`,
      to: cn[0].email,
      subject: `Credit Note ${cnNo} from ${cfg.company_name}`,
      html: `<p>Dear ${cn[0].name},</p><p>Please find Credit Note <strong>${cnNo}</strong> for ₹${cn[0].total_amount}.</p><p>Regards,<br>${cfg.company_name}</p>`,
    });
    await db.query('UPDATE credit_notes SET email_sent=1 WHERE id=?', [cnId]);
  } catch (e) { console.error('Email error:', e.message); }
}

module.exports = router;
