const router = require('express').Router();
const auth   = require('../middleware/auth');
const db     = require('../config/db');

// ── CUSTOMERS ─────────────────────────────────────────────

router.get('/customers', auth, async (req, res) => {
  try {
    const branch = req.query.branch_id || req.user.branch_id;
    const search = req.query.search ? `AND (c.name LIKE ? OR c.gst_number LIKE ? OR c.phone LIKE ?)` : '';
    const args   = [branch];
    if (req.query.search) { const s = `%${req.query.search}%`; args.push(s,s,s); }
    const [rows] = await db.query(`
      SELECT c.*, COALESCE(SUM(i.balance_due),0) as outstanding
      FROM customers c
      LEFT JOIN invoices i ON i.customer_id=c.id AND i.payment_status!='Paid'
      WHERE c.branch_id=? AND c.is_active=1 ${search}
      GROUP BY c.id ORDER BY c.name`, args);
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/customers/:id', auth, async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM customers WHERE id=?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/customers', auth, async (req, res) => {
  try {
    const d = req.body;
    const [r] = await db.query(`INSERT INTO customers SET ?`, [{
      branch_id: d.branch_id || req.user.branch_id,
      name: d.name, business_name: d.business_name, gst_number: d.gst_number,
      pan_number: d.pan_number, phone: d.phone, email: d.email,
      billing_address: d.billing_address, shipping_address: d.shipping_address,
      city: d.city, state: d.state, pincode: d.pincode,
      contact_name: d.contact_name || '',
      whatsapp: d.whatsapp || d.phone || '',
      product_capabilities: d.product_capabilities || '',
      opening_balance: d.opening_balance || 0,
      balance_type: d.balance_type || 'debit',
      payment_terms: d.payment_terms || 7,
      credit_limit: d.credit_limit || 0, notes: d.notes,
    }]);
    res.json({ id: r.insertId, message: 'Customer created' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/customers/:id', auth, async (req, res) => {
  try {
    const d = req.body;
    await db.query(`UPDATE customers SET name=?,business_name=?,gst_number=?,pan_number=?,phone=?,email=?,billing_address=?,shipping_address=?,city=?,state=?,pincode=?,payment_terms=?,credit_limit=?,notes=? WHERE id=?`,
      [d.name,d.business_name,d.gst_number,d.pan_number,d.phone,d.email,d.billing_address,d.shipping_address,d.city,d.state,d.pincode,d.payment_terms,d.credit_limit,d.notes,req.params.id]);
    res.json({ message: 'Updated' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/customers/:id', auth, async (req, res) => {
  try {
    await db.query('UPDATE customers SET is_active=0 WHERE id=?', [req.params.id]);
    res.json({ message: 'Deleted' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Customer ledger — fixed numeric conversion
router.get('/customers/:id/ledger', auth, async (req, res) => {
  try {
    const { from, to } = req.query;
    const [customer] = await db.query('SELECT * FROM customers WHERE id=?', [req.params.id]);
    if (!customer.length) return res.status(404).json({ error: 'Not found' });

    const [invoices] = await db.query(`
      SELECT 'Invoice' as type, invoice_number as doc_no, invoice_date as doc_date,
        total_amount as debit, 0 as credit, payment_status as status
      FROM invoices WHERE customer_id=?
      ${from ? 'AND invoice_date>=?' : ''} ${to ? 'AND invoice_date<=?' : ''}
      ORDER BY invoice_date`,
      [req.params.id, ...(from?[from]:[]), ...(to?[to]:[])]);

    const [payments] = await db.query(`
      SELECT 'Payment' as type, payment_number as doc_no, payment_date as doc_date,
        0 as debit, amount as credit, 'Paid' as status
      FROM payments WHERE party_type='customer' AND party_id=?
      ${from ? 'AND payment_date>=?' : ''} ${to ? 'AND payment_date<=?' : ''}
      ORDER BY payment_date`,
      [req.params.id, ...(from?[from]:[]), ...(to?[to]:[])]);

    const [cns] = await db.query(`
      SELECT 'Credit Note' as type, cn_number as doc_no, cn_date as doc_date,
        0 as debit, total_amount as credit, status
      FROM credit_notes WHERE customer_id=? ORDER BY cn_date`, [req.params.id]);

    const allTx = [...invoices, ...payments, ...cns]
      .sort((a,b) => new Date(a.doc_date) - new Date(b.doc_date));

    // FIX: use parseFloat to ensure numeric — prevents NaN from string arithmetic
    let balance = parseFloat(customer[0].opening_balance) || 0;
    const ledger = allTx.map(tx => {
      const debit  = parseFloat(tx.debit)  || 0;
      const credit = parseFloat(tx.credit) || 0;
      balance = balance + debit - credit;
      return {
        ...tx,
        debit:   debit,
        credit:  credit,
        balance: parseFloat(balance.toFixed(2)),
      };
    });

    res.json({
      customer: customer[0],
      ledger,
      closing_balance: parseFloat(balance.toFixed(2)),
    });
  } catch (e) {
    console.error('Customer ledger error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// ── SUPPLIERS ─────────────────────────────────────────────

router.get('/suppliers', auth, async (req, res) => {
  try {
    const branch = req.query.branch_id || req.user.branch_id;
    const type   = req.query.type ? 'AND s.supplier_type=?' : '';
    const args   = [branch, ...(req.query.type ? [req.query.type] : [])];
    const [rows] = await db.query(`
      SELECT s.*,
        MAX(p.purchase_date) as last_receipt,
        DATEDIFF(CURDATE(), MAX(p.purchase_date)) as days_since_receipt,
        COALESCE(SUM(p.balance_due),0) as outstanding
      FROM suppliers s
      LEFT JOIN purchases p ON p.supplier_id=s.id
      WHERE s.branch_id=? AND s.is_active=1 ${type}
      GROUP BY s.id ORDER BY s.name`, args);
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/suppliers/:id', auth, async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM suppliers WHERE id=?', [req.params.id]);
    res.json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/suppliers', auth, async (req, res) => {
  try {
    const d = req.body;
    const [r] = await db.query(`INSERT INTO suppliers SET ?`, [{
      branch_id: d.branch_id || req.user.branch_id,
      name: d.name, business_name: d.business_name,
      supplier_type: d.supplier_type || 'Other',
      gst_registered: d.gst_registered ? 1 : 0,
      gst_number: d.gst_number, pan_number: d.pan_number,
      phone: d.phone, whatsapp: d.whatsapp||d.phone||'',
      email: d.email, address: d.billing_address||d.address,
      contact_name: d.contact_name||'',
      product_capabilities: d.product_capabilities||'',
      city: d.city, state: d.state, pincode: d.pincode,
      opening_balance: d.opening_balance || 0,
      payment_terms: d.payment_terms || 7, notes: d.notes,
    }]);
    res.json({ id: r.insertId, message: 'Supplier created' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/suppliers/:id', auth, async (req, res) => {
  try {
    const d = req.body;
    await db.query(`UPDATE suppliers SET name=?,business_name=?,supplier_type=?,gst_registered=?,gst_number=?,phone=?,email=?,address=?,city=?,state=?,payment_terms=?,notes=? WHERE id=?`,
      [d.name,d.business_name,d.supplier_type,d.gst_registered?1:0,d.gst_number,d.phone,d.email,d.address,d.city,d.state,d.payment_terms,d.notes,req.params.id]);
    res.json({ message: 'Updated' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Supplier ledger — fixed numeric conversion
router.get('/suppliers/:id/ledger', auth, async (req, res) => {
  try {
    const [supplier] = await db.query('SELECT * FROM suppliers WHERE id=?', [req.params.id]);
    if (!supplier.length) return res.status(404).json({ error: 'Not found' });

    const [purchases] = await db.query(`
      SELECT 'Purchase' as type, purchase_number as doc_no, purchase_date as doc_date,
        0 as debit, total_amount as credit, payment_status as status
      FROM purchases WHERE supplier_id=? ORDER BY purchase_date`, [req.params.id]);

    const [payments] = await db.query(`
      SELECT 'Payment' as type, payment_number as doc_no, payment_date as doc_date,
        amount as debit, 0 as credit, 'Paid' as status
      FROM payments WHERE party_type='supplier' AND party_id=? ORDER BY payment_date`, [req.params.id]);

    const [dns] = await db.query(`
      SELECT 'Debit Note' as type, dn_number as doc_no, dn_date as doc_date,
        total_amount as debit, 0 as credit, status
      FROM debit_notes WHERE supplier_id=? ORDER BY dn_date`, [req.params.id]);

    const allTx = [...purchases, ...payments, ...dns]
      .sort((a,b) => new Date(a.doc_date) - new Date(b.doc_date));

    // FIX: parseFloat prevents NaN from string arithmetic
    let balance = parseFloat(supplier[0].opening_balance) || 0;
    const ledger = allTx.map(tx => {
      const debit  = parseFloat(tx.debit)  || 0;
      const credit = parseFloat(tx.credit) || 0;
      balance = balance + credit - debit;
      return {
        ...tx,
        debit:   debit,
        credit:  credit,
        balance: parseFloat(balance.toFixed(2)),
      };
    });

    res.json({
      supplier: supplier[0],
      ledger,
      closing_balance: parseFloat(balance.toFixed(2)),
    });
  } catch (e) {
    console.error('Supplier ledger error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
