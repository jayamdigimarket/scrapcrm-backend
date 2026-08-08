// ── Add to server.js ──────────────────────────────────────
// app.use('/api', require('./routes/notifications'));

// ── routes/notifications.js ───────────────────────────────
const router = require('express').Router();
const auth   = require('../middleware/auth');
const db     = require('../config/db');

router.get('/notifications', auth, async (req, res) => {
  try {
    const branch = req.query.branch_id || req.user.branch_id;
    const alerts = [];
    const now = new Date();

    // 1. OVERDUE INVOICES (balance > 0 and past payment terms)
    const [overdueInv] = await db.query(`
      SELECT i.invoice_number, i.total_amount, i.balance_due, i.invoice_date,
        i.payment_terms, c.name as customer_name,
        DATEDIFF(CURDATE(), DATE_ADD(i.invoice_date, INTERVAL i.payment_terms DAY)) as days_overdue
      FROM invoices i JOIN customers c ON c.id=i.customer_id
      WHERE i.branch_id=? AND i.balance_due>0
        AND DATE_ADD(i.invoice_date, INTERVAL i.payment_terms DAY) < CURDATE()
      ORDER BY days_overdue DESC LIMIT 10`, [branch]);

    overdueInv.forEach(inv => {
      alerts.push({
        id: `inv_${inv.invoice_number}`,
        icon: '🔴',
        priority: inv.days_overdue > 30 ? 'high' : 'medium',
        title: `Overdue Payment — ${inv.invoice_number}`,
        message: `${inv.customer_name} overdue by ${inv.days_overdue} days`,
        amount: inv.balance_due,
        page: 'invoices',
        time: `Due ${inv.days_overdue} days ago`,
        read: false,
      });
    });

    // 2. LOW / CRITICAL STOCK
    const [lowStock] = await db.query(`
      SELECT name, current_stock, min_stock, unit,
        CASE WHEN current_stock<=0 THEN 'Critical' WHEN current_stock<=min_stock THEN 'Low' END as status
      FROM materials
      WHERE branch_id=? AND is_active=1 AND current_stock<=min_stock
      ORDER BY current_stock ASC LIMIT 8`, [branch]);

    lowStock.forEach(m => {
      alerts.push({
        id: `stock_${m.name}`,
        icon: m.status === 'Critical' ? '⚠️' : '📦',
        priority: m.status === 'Critical' ? 'high' : 'medium',
        title: `Stock ${m.status} — ${m.name}`,
        message: `Current: ${parseFloat(m.current_stock).toFixed(2)} ${m.unit} | Min: ${parseFloat(m.min_stock).toFixed(2)} ${m.unit}`,
        page: 'stock',
        time: 'Current stock level',
        read: false,
      });
    });

    // 3. LARGE RECEIVABLES (top 3 customers with high outstanding)
    const [bigReceivables] = await db.query(`
      SELECT c.name, SUM(i.balance_due) as total_due, COUNT(i.id) as inv_count
      FROM invoices i JOIN customers c ON c.id=i.customer_id
      WHERE i.branch_id=? AND i.balance_due>0
      GROUP BY c.id HAVING total_due > 1000
      ORDER BY total_due DESC LIMIT 3`, [branch]);

    bigReceivables.forEach(r => {
      alerts.push({
        id: `recv_${r.name}`,
        icon: '💰',
        priority: r.total_due > 10000 ? 'high' : 'low',
        title: `High Receivable — ${r.name}`,
        message: `${r.inv_count} unpaid invoice(s) pending`,
        amount: r.total_due,
        page: 'customers',
        time: 'Outstanding balance',
        read: false,
      });
    });

    // 4. PENDING PURCHASE ORDERS
    const [pendingPOs] = await db.query(`
      SELECT po.po_number, po.po_date, s.name as supplier_name,
        po.total_amount, DATEDIFF(CURDATE(), po.po_date) as days_old
      FROM purchase_orders po JOIN suppliers s ON s.id=po.supplier_id
      WHERE po.branch_id=? AND po.status='Pending'
      ORDER BY po.po_date ASC LIMIT 5`, [branch]);

    pendingPOs.forEach(po => {
      alerts.push({
        id: `po_${po.po_number}`,
        icon: '📋',
        priority: po.days_old > 7 ? 'medium' : 'low',
        title: `PO Pending — ${po.po_number}`,
        message: `${po.supplier_name} | ${po.days_old} days old`,
        amount: po.total_amount,
        page: 'purchase-orders',
        time: `Created ${po.days_old} days ago`,
        read: false,
      });
    });

    // 5. GST FILING REMINDER (25th of month)
    const dayOfMonth = now.getDate();
    if (dayOfMonth >= 20) {
      const [gstData] = await db.query(`
        SELECT COALESCE(SUM(cgst_amount+sgst_amount+igst_amount),0) as gst_due
        FROM invoices WHERE branch_id=? AND MONTH(invoice_date)=MONTH(CURDATE())
        AND YEAR(invoice_date)=YEAR(CURDATE())`, [branch]);
      if (+gstData[0].gst_due > 0) {
        alerts.push({
          id: 'gst_reminder',
          icon: '🧾',
          priority: dayOfMonth >= 25 ? 'high' : 'medium',
          title: 'GST Filing Due Soon',
          message: `GSTR-1 due on 11th next month. This month's GST:`,
          amount: +gstData[0].gst_due,
          page: 'gst',
          time: `${30 - dayOfMonth} days remaining`,
          read: false,
        });
      }
    }

    // 6. PAYMENT RECEIVED TODAY
    const [todayPayments] = await db.query(`
      SELECT SUM(amount) as total, COUNT(*) as count
      FROM payments WHERE branch_id=? AND DATE(payment_date)=CURDATE()`, [branch]);

    if (+todayPayments[0].total > 0) {
      alerts.push({
        id: 'today_payments',
        icon: '✅',
        priority: 'low',
        title: `${todayPayments[0].count} Payment(s) Today`,
        message: `Total received today`,
        amount: +todayPayments[0].total,
        page: 'invoices',
        time: 'Today',
        read: true, // already read - it's good news
      });
    }

    // Sort: high priority first, then unread
    alerts.sort((a, b) => {
      const pOrder = { high: 0, medium: 1, low: 2 };
      if (!a.read && b.read) return -1;
      if (a.read && !b.read) return 1;
      return (pOrder[a.priority] || 2) - (pOrder[b.priority] || 2);
    });

    res.json({
      alerts,
      unread_count: alerts.filter(a => !a.read).length,
      summary: {
        overdue_invoices: overdueInv.length,
        low_stock: lowStock.length,
        pending_pos: pendingPOs.length,
      }
    });
  } catch(e) {
    console.error('Notifications error:', e.message);
    res.status(500).json({ error: e.message, alerts: [] });
  }
});

module.exports = router;
