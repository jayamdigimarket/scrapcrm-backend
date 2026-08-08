const router   = require('express').Router();
const auth     = require('../middleware/auth');
const db       = require('../config/db');
const crypto   = require('crypto');

async function getRazorpayInstance(branchId) {
  const [rows] = await db.query(
    `SELECT setting_key, setting_value FROM settings WHERE branch_id=? AND setting_key IN ('razorpay_key','razorpay_secret')`,
    [branchId]
  );
  const cfg = {};
  rows.forEach(r => { cfg[r.setting_key] = r.setting_value; });
  if (!cfg.razorpay_key || !cfg.razorpay_secret) throw new Error('Razorpay not configured in Settings');
  const Razorpay = require('razorpay');
  return new Razorpay({ key_id: cfg.razorpay_key, key_secret: cfg.razorpay_secret });
}

// ── CREATE ORDER ─────────────────────────────────────────
// Used by web and mobile APK to initiate payment
router.post('/razorpay/create-order', auth, async (req, res) => {
  try {
    const { invoice_id, amount } = req.body;
    const rp = await getRazorpayInstance(req.user.branch_id);

    // Get invoice details
    const [inv] = await db.query(`
      SELECT i.*, c.name as cname, c.phone, c.email
      FROM invoices i JOIN customers c ON c.id=i.customer_id WHERE i.id=?`, [invoice_id]);
    if (!inv.length) return res.status(404).json({ error: 'Invoice not found' });
    const invoice = inv[0];

    // Use provided amount or invoice balance
    const payAmount = Math.round((amount || invoice.balance_due) * 100); // paise

    const order = await rp.orders.create({
      amount:   payAmount,
      currency: 'INR',
      receipt:  invoice.invoice_number,
      notes: {
        invoice_id:     invoice_id,
        invoice_number: invoice.invoice_number,
        customer_name:  invoice.cname,
        customer_phone: invoice.phone,
      }
    });

    // Store order in DB for verification
    await db.query(`INSERT INTO payments SET ?`, [{
      branch_id:          req.user.branch_id,
      payment_number:     `RZPY/${order.id}`,
      payment_date:       new Date().toISOString().split('T')[0],
      party_type:         'customer',
      party_id:           invoice.customer_id,
      payment_mode:       'UPI',
      amount:             payAmount / 100,
      reference_number:   order.id,
      invoice_id:         invoice_id,
      razorpay_order_id:  order.id,
      notes:              'Razorpay order created — pending verification',
      created_by:         req.user.id,
    }]);

    res.json({
      order_id:    order.id,
      amount:      payAmount,
      currency:    'INR',
      key:         (await db.query(`SELECT setting_value FROM settings WHERE branch_id=? AND setting_key='razorpay_key'`, [req.user.branch_id]))[0][0]?.setting_value,
      invoice:     { number: invoice.invoice_number, customer: invoice.cname, email: invoice.email, phone: invoice.phone },
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── VERIFY PAYMENT ───────────────────────────────────────
// Called after payment success from frontend/mobile
router.post('/razorpay/verify', auth, async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, invoice_id } = req.body;

    // Get secret for signature verification
    const [rows] = await db.query(`SELECT setting_value FROM settings WHERE branch_id=? AND setting_key='razorpay_secret'`, [req.user.branch_id]);
    const secret = rows[0]?.setting_value;
    if (!secret) return res.status(400).json({ error: 'Razorpay not configured' });

    // Verify signature
    const body = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSig = crypto.createHmac('sha256', secret).update(body).digest('hex');
    if (expectedSig !== razorpay_signature) {
      return res.status(400).json({ error: 'Payment verification failed — invalid signature' });
    }

    // Get payment amount from Razorpay order
    const [payRow] = await db.query('SELECT * FROM payments WHERE razorpay_order_id=?', [razorpay_order_id]);
    const paidAmount = payRow[0]?.amount || 0;

    // Update payment record
    await db.query(`UPDATE payments SET razorpay_payment_id=?, payment_mode='UPI', notes='Razorpay payment verified' WHERE razorpay_order_id=?`,
      [razorpay_payment_id, razorpay_order_id]);

    // Update invoice balance
    const [inv] = await db.query('SELECT * FROM invoices WHERE id=?', [invoice_id]);
    if (inv.length) {
      const newPaid = (+inv[0].amount_paid) + (+paidAmount);
      const newBal  = Math.max(0, (+inv[0].balance_due) - (+paidAmount));
      const status  = newBal <= 0 ? 'Paid' : 'Partial';
      await db.query('UPDATE invoices SET amount_paid=?,balance_due=?,payment_status=? WHERE id=?',
        [newPaid, newBal, status, invoice_id]);
    }

    res.json({ verified: true, payment_id: razorpay_payment_id, message: 'Payment successful!' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── CREATE PAYMENT LINK ───────────────────────────────────
// Send a payment link to customer via WhatsApp/SMS
router.post('/razorpay/payment-link', auth, async (req, res) => {
  try {
    const { invoice_id } = req.body;
    const rp = await getRazorpayInstance(req.user.branch_id);

    const [inv] = await db.query(`
      SELECT i.*, c.name as cname, c.phone, c.email
      FROM invoices i JOIN customers c ON c.id=i.customer_id WHERE i.id=?`, [invoice_id]);
    if (!inv.length) return res.status(404).json({ error: 'Invoice not found' });
    const invoice = inv[0];

    const link = await rp.paymentLink.create({
      amount:      Math.round(invoice.balance_due * 100),
      currency:    'INR',
      accept_partial: false,
      description: `Payment for Invoice ${invoice.invoice_number} — MVR Polyplast`,
      customer: {
        name:  invoice.cname,
        contact: invoice.phone,
        email: invoice.email || '',
      },
      notify: { sms: true, email: !!invoice.email },
      reminder_enable: true,
      notes: { invoice_number: invoice.invoice_number, invoice_id },
      callback_url:    process.env.APP_URL + '/payment-success',
      callback_method: 'get',
    });

    // Store link in DB
    await db.query('UPDATE invoices SET payment_link=? WHERE id=?', [link.short_url, invoice_id]);

    res.json({
      payment_link: link.short_url,
      link_id:      link.id,
      amount:       invoice.balance_due,
      whatsapp_msg: `Dear ${invoice.cname},\n\nPayment link for Invoice ${invoice.invoice_number}:\n💳 ${link.short_url}\n\nAmount: ₹${Number(invoice.balance_due).toLocaleString('en-IN')}\n\nMVR Polyplast 📞6305064899`,
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── WEBHOOK (from Razorpay for auto-capture) ─────────────
router.post('/razorpay/webhook', async (req, res) => {
  try {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET || '';
    if (secret) {
      const sig = req.headers['x-razorpay-signature'];
      const expected = crypto.createHmac('sha256', secret).update(JSON.stringify(req.body)).digest('hex');
      if (sig !== expected) return res.status(400).json({ error: 'Invalid webhook signature' });
    }
    const event = req.body.event;
    const payload = req.body.payload;
    if (event === 'payment.captured') {
      const payment = payload.payment.entity;
      const orderId = payment.order_id;
      // Auto-verify and update invoice
      await db.query('UPDATE payments SET razorpay_payment_id=?,notes=? WHERE razorpay_order_id=?',
        [payment.id, 'Auto-captured via webhook', orderId]);
      const [payRow] = await db.query('SELECT * FROM payments WHERE razorpay_order_id=?', [orderId]);
      if (payRow[0]?.invoice_id) {
        const [inv] = await db.query('SELECT * FROM invoices WHERE id=?', [payRow[0].invoice_id]);
        if (inv.length) {
          const newBal = Math.max(0, (+inv[0].balance_due) - (+payRow[0].amount));
          await db.query('UPDATE invoices SET balance_due=?,payment_status=? WHERE id=?',
            [newBal, newBal<=0?'Paid':'Partial', payRow[0].invoice_id]);
        }
      }
      console.log('Razorpay payment captured:', payment.id);
    }
    res.json({ status: 'ok' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── GET PAYMENT STATUS ───────────────────────────────────
router.get('/razorpay/payment-status/:invoiceId', auth, async (req, res) => {
  try {
    const [payments] = await db.query(
      'SELECT * FROM payments WHERE invoice_id=? AND razorpay_order_id IS NOT NULL ORDER BY created_at DESC',
      [req.params.invoiceId]
    );
    res.json({ payments });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;