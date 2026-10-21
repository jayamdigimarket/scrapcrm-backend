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
      payment_terms: d.payment_terms || '',
      credit_limit: d.credit_limit || 0, notes: d.notes,
    }]);
    res.json({ id: r.insertId, message: 'Customer created' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/customers/:id', auth, async (req, res) => {
  try {
    const d = req.body;
    await db.query(
      `UPDATE customers SET
        name=?, business_name=?, gst_number=?, pan_number=?,
        phone=?, whatsapp=?, email=?, contact_name=?,
        billing_address=?, shipping_address=?,
        city=?, state=?, pincode=?,
        payment_terms=?, credit_limit=?, opening_balance=?,
        product_capabilities=?, notes=?
      WHERE id=?`,
      [
        d.name, d.business_name||'', d.gst_number||'', d.pan_number||'',
        d.phone||'', d.whatsapp||d.phone||'', d.email||'', d.contact_name||'',
        d.billing_address||'', d.shipping_address||'',
        d.city||'', d.state||'', d.pincode||'',
        d.payment_terms||'', d.credit_limit||0,
        parseFloat(d.opening_balance)||0,
        d.product_capabilities||'', d.notes||'',
        req.params.id
      ]
    );
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

    // Customer ledger sign convention:
    // opening_balance = amount customer OWES you at start (positive = receivable)
    // Invoices = Dr (customer owes more)
    // Payments/Credit Notes = Cr (customer paid / reduced)
    // closing_balance > 0 = customer owes you (receivable)
    // closing_balance < 0 = you owe customer (over-payment / advance received)
    // opening_balance stored as positive = customer owes you
    // balance > 0 = customer still owes you (Receivable)
    // balance < 0 = you owe customer (Advance received)
    const openingBal = parseFloat(customer[0].opening_balance) || 0;
    let balance = openingBal;
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

    // Prepend opening balance row if non-zero
    const ledgerRows = openingBal > 0
      ? [{ type:'Opening Balance', doc_no:'—', doc_date: customer[0].created_at||new Date(), debit: openingBal, credit: 0, balance: openingBal, status:'—' }, ...ledger]
      : ledger;

    res.json({
      customer: customer[0],
      ledger: ledgerRows,
      opening_balance: openingBal,
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
      gst_number: d.gst_number || '', pan_number: d.pan_number || '',
      phone: d.phone, whatsapp: d.whatsapp||d.phone||'',
      email: d.email || '',
      contact_name: d.contact_name||'',
      address: d.billing_address||d.address||'',
      billing_address: d.billing_address||d.address||'',
      shipping_address: d.shipping_address||'',
      product_capabilities: d.product_capabilities||'',
      city: d.city||'', state: d.state||'', pincode: d.pincode||'',
      opening_balance: d.opening_balance || 0,
      payment_terms: d.payment_terms || '',
      bank_name: d.bank_name||'', bank_account: d.bank_account||'',
      ifsc_code: d.ifsc_code||'', bank_branch: d.bank_branch||'',
      notes: d.notes||'',
    }]);
    res.json({ id: r.insertId, message: 'Supplier created' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/suppliers/:id', auth, async (req, res) => {
  try {
    const d = req.body;
    await db.query(
      `UPDATE suppliers SET
        name=?, business_name=?, supplier_type=?, gst_registered=?, gst_number=?,
        pan_number=?, phone=?, whatsapp=?, email=?, contact_name=?,
        address=?, billing_address=?, shipping_address=?,
        city=?, state=?, pincode=?,
        payment_terms=?, opening_balance=?,
        bank_name=?, bank_account=?, ifsc_code=?, bank_branch=?,
        product_capabilities=?, notes=?
      WHERE id=?`,
      [
        d.name, d.business_name||'', d.supplier_type||'Other', d.gst_registered?1:0, d.gst_number||'',
        d.pan_number||'', d.phone||'', d.whatsapp||d.phone||'', d.email||'', d.contact_name||'',
        d.billing_address||d.address||'', d.billing_address||d.address||'', d.shipping_address||'',
        d.city||'', d.state||'', d.pincode||'',
        d.payment_terms||'', parseFloat(d.opening_balance)||0,
        d.bank_name||'', d.bank_account||'', d.ifsc_code||'', d.bank_branch||'',
        d.product_capabilities||'', d.notes||'',
        req.params.id
      ]
    );
    res.json({ message: 'Updated' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Supplier ledger — fixed numeric conversion
router.get('/suppliers/:id/ledger', auth, async (req, res) => {
  try {
    const [supplier] = await db.query('SELECT * FROM suppliers WHERE id=?', [req.params.id]);
    if (!supplier.length) return res.status(404).json({ error: 'Not found' });

    // Purchases (Dr - we owe supplier)
    const [purchases] = await db.query(`
      SELECT 'Purchase' as type, purchase_number as doc_no, purchase_date as date,
        total_amount as debit, 0 as credit, balance_due, payment_status
      FROM purchases WHERE supplier_id=? ORDER BY purchase_date`, [req.params.id]);

    // Payments (Cr - we paid supplier)
    const [payments] = await db.query(`
      SELECT 'Payment' as type, COALESCE(reference_number,id) as doc_no, payment_date as date,
        0 as debit, amount as credit, 0 as balance_due, payment_mode as payment_status
      FROM payments WHERE party_id=? AND party_type='supplier' ORDER BY payment_date`, [req.params.id]);

    // Advances (Cr - advance paid)
    const [advances] = await db.query(`
      SELECT 'Advance' as type, COALESCE(reference_number,id) as doc_no, advance_date as date,
        0 as debit, amount as credit, balance_amount as balance_due, payment_mode as payment_status
      FROM supplier_advances WHERE supplier_id=? ORDER BY advance_date`, [req.params.id]);

    // Debit Notes (Cr - deducted from payable)
    const [debits] = await db.query(`
      SELECT 'Debit Note' as type, dn_number as doc_no, dn_date as date,
        0 as debit, total_amount as credit, 0 as balance_due, status as payment_status
      FROM debit_notes WHERE supplier_id=? ORDER BY dn_date`, [req.params.id]);

    // Combine and sort all transactions
    const all = [...purchases, ...payments, ...advances, ...debits]
      .sort((a,b) => new Date(a.date) - new Date(b.date));

    // Supplier ledger sign convention:
    // opening_balance = amount you OWE the supplier at start (positive = payable)
    // Purchases = Dr (increases what you owe)  → debit side
    // Payments/Advances/Debit Notes = Cr (reduces what you owe) → credit side
    // closing_balance > 0 = you still owe supplier (payable)
    // closing_balance < 0 = supplier owes you (advance/over-payment)
    // opening_balance stored as positive = you owe supplier
    // balance > 0 = still owe supplier (Payable)
    // balance < 0 = supplier owes you (Advance/Overpaid)
    const openingBal = parseFloat(supplier[0].opening_balance) || 0;
    let balance = openingBal;
    const transactions = all.map(t => {
      balance += (parseFloat(t.debit)||0) - (parseFloat(t.credit)||0);
      return { ...t, balance: parseFloat(balance.toFixed(2)) };
    });

    // Prepend opening balance row if non-zero
    const ledgerRows = openingBal > 0
      ? [{ type:'Opening Balance', doc_no:'—', date: supplier[0].created_at||new Date(), debit: openingBal, credit: 0, balance: openingBal, payment_status:'—' }, ...transactions]
      : transactions;

    res.json({
      supplier: supplier[0],
      transactions: ledgerRows,
      opening_balance: openingBal,
      closing_balance: parseFloat(balance.toFixed(2)),
    });
  } catch(e) { res.status(500).json({ error: e.message }); }
});



module.exports = router;
