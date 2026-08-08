const router = require('express').Router();
const auth   = require('../middleware/auth');
const db     = require('../config/db');

router.get('/', auth, async (req, res) => {
  try {
    const branch = req.query.branch_id || req.user.branch_id;
    const period = req.query.period || 'month';

    let dateFilter = '';
    if (period === 'today')  dateFilter = 'AND DATE(created_at) = CURDATE()';
    if (period === 'week')   dateFilter = 'AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)';
    if (period === 'month')  dateFilter = 'AND MONTH(created_at)=MONTH(NOW()) AND YEAR(created_at)=YEAR(NOW())';
    if (period === 'year')   dateFilter = 'AND YEAR(created_at)=YEAR(NOW())';

    const [sales]       = await db.query(`SELECT COALESCE(SUM(total_amount),0) as total, COUNT(*) as count FROM invoices WHERE branch_id=? ${dateFilter}`, [branch]);
    const [purchases]   = await db.query(`SELECT COALESCE(SUM(total_amount),0) as total, COUNT(*) as count FROM purchases WHERE branch_id=? ${dateFilter}`, [branch]);
    const [expenses]    = await db.query(`SELECT COALESCE(SUM(amount),0) as total FROM expenses WHERE branch_id=? ${dateFilter}`, [branch]);
    const [receivables] = await db.query(`SELECT COALESCE(SUM(balance_due),0) as total FROM invoices WHERE branch_id=? AND payment_status != 'Paid'`, [branch]);
    const [payables]    = await db.query(`SELECT COALESCE(SUM(balance_due),0) as total FROM purchases WHERE branch_id=? AND payment_status != 'Paid'`, [branch]);
    const [bankBal]     = await db.query(`SELECT COALESCE(SUM(current_balance),0) as total FROM bank_accounts WHERE branch_id=? AND is_active=1`, [branch]);
    const [gstPayable]  = await db.query(`SELECT COALESCE(SUM(cgst_amount+sgst_amount+igst_amount),0) as total FROM invoices WHERE branch_id=? ${dateFilter}`, [branch]);

    const netProfit = sales[0].total - purchases[0].total - expenses[0].total;

    // Fixed: GROUP BY with explicit columns only - MySQL strict mode compatible
    const [monthlySales] = await db.query(`
      SELECT DATE_FORMAT(invoice_date,'%b %Y') as month,
             SUM(total_amount) as sales,
             MIN(invoice_date) as sort_date
      FROM invoices
      WHERE branch_id=? AND invoice_date >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
      GROUP BY DATE_FORMAT(invoice_date,'%Y-%m'), DATE_FORMAT(invoice_date,'%b %Y')
      ORDER BY MIN(invoice_date)`, [branch]);

    const [monthlyPurchase] = await db.query(`
      SELECT DATE_FORMAT(purchase_date,'%b %Y') as month,
             SUM(total_amount) as purchases,
             MIN(purchase_date) as sort_date
      FROM purchases
      WHERE branch_id=? AND purchase_date >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
      GROUP BY DATE_FORMAT(purchase_date,'%Y-%m'), DATE_FORMAT(purchase_date,'%b %Y')
      ORDER BY MIN(purchase_date)`, [branch]);

    const alertDays = 7;
    const [supplierAlerts] = await db.query(`
      SELECT s.id, s.name, s.supplier_type, s.phone,
             MAX(p.purchase_date) as last_receipt,
             DATEDIFF(CURDATE(), MAX(p.purchase_date)) as days_since
      FROM suppliers s
      LEFT JOIN purchases p ON p.supplier_id = s.id AND p.branch_id = ?
      WHERE s.branch_id=? AND s.is_active=1
      GROUP BY s.id, s.name, s.supplier_type, s.phone
      HAVING days_since >= ? OR last_receipt IS NULL
      ORDER BY days_since DESC`, [branch, branch, alertDays]);

    const [stock] = await db.query(`
      SELECT id, name, hsn_code, current_stock, min_stock, unit
      FROM materials WHERE branch_id=? AND is_active=1`, [branch]);

    const [recentInvoices] = await db.query(`
      SELECT i.invoice_number, i.invoice_date, i.total_amount,
             i.payment_status, c.name as customer
      FROM invoices i
      JOIN customers c ON c.id=i.customer_id
      WHERE i.branch_id=?
      ORDER BY i.created_at DESC LIMIT 5`, [branch]);

    const [banks] = await db.query(`
      SELECT account_name, bank_name, current_balance
      FROM bank_accounts WHERE branch_id=? AND is_active=1`, [branch]);

    const [attToday] = await db.query(`
      SELECT status, COUNT(*) as count
      FROM attendance
      WHERE branch_id=? AND attendance_date=CURDATE()
      GROUP BY status`, [branch]);

    res.json({
      kpis: {
        sales: sales[0].total,
        sales_count: sales[0].count,
        purchases: purchases[0].total,
        expenses: expenses[0].total,
        net_profit: netProfit,
        receivables: receivables[0].total,
        payables: payables[0].total,
        bank_balance: bankBal[0].total,
        gst_payable: gstPayable[0].total,
      },
      monthly_sales: monthlySales,
      monthly_purchase: monthlyPurchase,
      supplier_alerts: supplierAlerts,
      stock_summary: stock.map(s => ({
        ...s,
        status: s.current_stock <= 0 ? 'Critical'
               : s.current_stock <= s.min_stock ? 'Low' : 'Good'
      })),
      recent_invoices: recentInvoices,
      bank_accounts: banks,
      attendance_today: attToday,
    });
  } catch (e) {
    console.error('Dashboard error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
