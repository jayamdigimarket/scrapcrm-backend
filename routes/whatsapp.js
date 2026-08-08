const router  = require('express').Router();
const auth    = require('../middleware/auth');
const db      = require('../config/db');
const axios   = require('axios');

// ── MANUAL SHARE — wa.me link generator ──────────────────
// Returns a WhatsApp deep link — frontend opens it
router.post('/whatsapp/share-link', auth, async (req, res) => {
  try {
    const { phone, message } = req.body;
    const clean = phone.replace(/\D/g, '');
    const num   = clean.startsWith('91') ? clean : `91${clean}`;
    const link  = `https://wa.me/${num}?text=${encodeURIComponent(message)}`;
    res.json({ link, phone: num });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── MANUAL SHARE — generate invoice message ───────────────
router.get('/whatsapp/invoice-message/:id', auth, async (req, res) => {
  try {
    const [inv] = await db.query(`
      SELECT i.*, c.name as cname, c.phone as cphone, c.gst_number
      FROM invoices i JOIN customers c ON c.id=i.customer_id WHERE i.id=?`, [req.params.id]);
    if (!inv.length) return res.status(404).json({ error: 'Invoice not found' });
    const i = inv[0];
    const message = `Dear ${i.cname},

Greetings from MVR Polyplast!

Please find below your invoice details:

📄 *Invoice No:* ${i.invoice_number}
📅 *Date:* ${new Date(i.invoice_date).toLocaleDateString('en-IN')}
💰 *Total Amount:* ₹${Number(i.total_amount).toLocaleString('en-IN')}
📊 *GST:* ₹${Number((+i.cgst_amount)+(+i.sgst_amount)+(+i.igst_amount)).toLocaleString('en-IN')}
💳 *Balance Due:* ₹${Number(i.balance_due).toLocaleString('en-IN')}
📆 *Due Date:* ${new Date(i.due_date).toLocaleDateString('en-IN')}

*Bank Details:*
Indian Overseas Bank
A/c: 260602000000392
IFSC: IOBA0002606

Please confirm receipt and arrange payment at the earliest.

Thank you for your business!

*MVR Polyplast*
📞 6305064899
GST: 37ACDFM0167F1ZE`;

    const clean = (i.cphone||'').replace(/\D/g,'');
    const num   = clean.startsWith('91') ? clean : `91${clean}`;
    res.json({ message, phone: num, link: `https://wa.me/${num}?text=${encodeURIComponent(message)}` });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── MANUAL SHARE — generate CN message ───────────────────
router.get('/whatsapp/cn-message/:id', auth, async (req, res) => {
  try {
    const [cn] = await db.query(`
      SELECT cn.*, c.name as cname, c.phone as cphone, i.invoice_number
      FROM credit_notes cn JOIN customers c ON c.id=cn.customer_id JOIN invoices i ON i.id=cn.invoice_id WHERE cn.id=?`, [req.params.id]);
    if (!cn.length) return res.status(404).json({ error: 'CN not found' });
    const n = cn[0];
    const message = `Dear ${n.cname},

Please find your Credit Note details:

📄 *Credit Note No:* ${n.cn_number}
🔗 *Against Invoice:* ${n.invoice_number}
📅 *Date:* ${new Date(n.cn_date).toLocaleDateString('en-IN')}
💰 *Amount:* ₹${Number(n.total_amount).toLocaleString('en-IN')}
📝 *Reason:* ${n.reason||'As discussed'}

This amount has been adjusted against your outstanding balance.

*MVR Polyplast*
📞 6305064899`;

    const clean = (n.cphone||'').replace(/\D/g,'');
    const num   = clean.startsWith('91') ? clean : `91${clean}`;
    res.json({ message, phone: num, link: `https://wa.me/${num}?text=${encodeURIComponent(message)}` });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ══════════════════════════════════════════════════════════
// ── AUTO-SEND via WhatsApp Business API (WABA) ───────────
// NOTE: This requires:
// 1. Meta Business Account verified
// 2. WhatsApp Business API access (apply at business.facebook.com)
// 3. Phone number ID and Access Token from Meta
// Set in Settings: waba_phone_id, waba_token, waba_enabled=true
// ══════════════════════════════════════════════════════════

async function getWABAConfig(branchId) {
  const [rows] = await db.query(
    `SELECT setting_key, setting_value FROM settings WHERE branch_id=? AND setting_key IN ('waba_phone_id','waba_token','waba_enabled')`,
    [branchId]
  );
  const cfg = {};
  rows.forEach(r => { cfg[r.setting_key] = r.setting_value; });
  return cfg;
}

async function sendWABAMessage(phone, message, branchId) {
  const cfg = await getWABAConfig(branchId);
  if (cfg.waba_enabled !== 'true' || !cfg.waba_phone_id || !cfg.waba_token) {
    return { sent: false, reason: 'WABA not configured. Using manual share.' };
  }
  const clean = phone.replace(/\D/g,'');
  const num   = clean.startsWith('91') ? clean : `91${clean}`;
  try {
    const response = await axios.post(
      `https://graph.facebook.com/v18.0/${cfg.waba_phone_id}/messages`,
      {
        messaging_product: 'whatsapp',
        to: num,
        type: 'text',
        text: { body: message }
      },
      {
        headers: {
          'Authorization': `Bearer ${cfg.waba_token}`,
          'Content-Type': 'application/json',
        }
      }
    );
    return { sent: true, message_id: response.data.messages?.[0]?.id };
  } catch (err) {
    console.error('WABA send error:', err.response?.data || err.message);
    return { sent: false, error: err.response?.data?.error?.message || err.message };
  }
}

// ── AUTO-SEND — Invoice ───────────────────────────────────
router.post('/whatsapp/auto-send/invoice/:id', auth, async (req, res) => {
  try {
    const [inv] = await db.query(`
      SELECT i.*, c.name as cname, c.phone as cphone
      FROM invoices i JOIN customers c ON c.id=i.customer_id WHERE i.id=?`, [req.params.id]);
    if (!inv.length) return res.status(404).json({ error: 'Not found' });
    const i = inv[0];
    const message = `Dear ${i.cname}, Invoice ${i.invoice_number} for ₹${Number(i.total_amount).toLocaleString('en-IN')} dated ${new Date(i.invoice_date).toLocaleDateString('en-IN')}. Balance due: ₹${Number(i.balance_due).toLocaleString('en-IN')}. — MVR Polyplast 📞6305064899`;
    const result = await sendWABAMessage(i.cphone, message, req.user.branch_id);
    if (result.sent) await db.query('UPDATE invoices SET whatsapp_sent=1 WHERE id=?', [req.params.id]);
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── AUTO-SEND — Credit Note ───────────────────────────────
router.post('/whatsapp/auto-send/credit-note/:id', auth, async (req, res) => {
  try {
    const [cn] = await db.query(`
      SELECT cn.*, c.name as cname, c.phone as cphone, i.invoice_number
      FROM credit_notes cn JOIN customers c ON c.id=cn.customer_id JOIN invoices i ON i.id=cn.invoice_id WHERE cn.id=?`, [req.params.id]);
    if (!cn.length) return res.status(404).json({ error: 'Not found' });
    const n = cn[0];
    const message = `Dear ${n.cname}, Credit Note ${n.cn_number} for ₹${Number(n.total_amount).toLocaleString('en-IN')} issued against Invoice ${n.invoice_number}. Reason: ${n.reason||'As discussed'}. — MVR Polyplast`;
    const result = await sendWABAMessage(n.cphone, message, req.user.branch_id);
    if (result.sent) await db.query('UPDATE credit_notes SET whatsapp_sent=1 WHERE id=?', [req.params.id]);
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── AUTO-SEND — Payment Reminder ─────────────────────────
router.post('/whatsapp/reminder/:customerId', auth, async (req, res) => {
  try {
    const [cust] = await db.query('SELECT * FROM customers WHERE id=?', [req.params.customerId]);
    const [unpaid] = await db.query(`SELECT SUM(balance_due) as total FROM invoices WHERE customer_id=? AND payment_status!='Paid'`, [req.params.customerId]);
    if (!cust.length) return res.status(404).json({ error: 'Not found' });
    const c = cust[0];
    const outstanding = unpaid[0].total || 0;
    const message = `Dear ${c.name},

This is a gentle reminder that you have an outstanding balance of *₹${Number(outstanding).toLocaleString('en-IN')}* with MVR Polyplast.

Request you to kindly arrange payment at the earliest.

*Bank Details:*
Indian Overseas Bank
A/c: 260602000000392
IFSC: IOBA0002606

Thank you.
*MVR Polyplast* 📞6305064899`;
    const result = await sendWABAMessage(c.phone, message, req.user.branch_id);
    res.json({ ...result, outstanding, message });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── WABA Webhook (for incoming messages) ─────────────────
router.get('/whatsapp/webhook', (req, res) => {
  const VERIFY_TOKEN = process.env.WABA_VERIFY_TOKEN || 'scrapcrm_waba_2026';
  const mode  = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log('WABA Webhook verified');
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});

router.post('/whatsapp/webhook', (req, res) => {
  const body = req.body;
  if (body.object === 'whatsapp_business_account') {
    body.entry?.forEach(entry => {
      entry.changes?.forEach(change => {
        const messages = change.value?.messages;
        if (messages) {
          messages.forEach(msg => {
            console.log('Incoming WA message:', msg.from, msg.text?.body);
            // Future: auto-reply or record incoming payments
          });
        }
      });
    });
    res.sendStatus(200);
  } else {
    res.sendStatus(404);
  }
});

module.exports = { router, sendWABAMessage };