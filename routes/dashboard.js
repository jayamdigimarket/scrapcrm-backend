const router = require('express').Router();
const auth   = require('../middleware/auth');
const db     = require('../config/db');

router.get('/', auth, async (req, res) => {
  try {
    const branch  = req.query.branch_id || req.user.branch_id;
    const period  = req.query.period || 'month';
    const year    = parseInt(req.query.year) || new Date().getFullYear();
    const quarter = req.query.quarter ? parseInt(req.query.quarter) : null;

    // Build date range
    let dateFrom, dateTo;
    const now = new Date();

    if (quarter) {
      const qStart = (quarter - 1) * 3;
      dateFrom = new Date(year, qStart, 1).toISOString().split('T')[0];
      dateTo   = new Date(year, qStart + 3, 0).toISOString().split('T')[0];
    } else if (period === 'today') {
      dateFrom = dateTo = now.toISOString().split('T')[0];
    } else if (period === 'week') {
      const d = new Date(now);
      d.setDate(d.getDate() - 7);
      dateFrom = d.toISOString().split('T')[0];
      dateTo   = now.toISOString().split('T')[0];
    } else if (period === 'month') {
      dateFrom = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      dateTo   = now.toISOString().split('T')[0];
    } else if (period === 'year') {
      dateFrom = `${year}-04-01`; // Financial year April-March
      dateTo   = `${year + 1}-03-31`;
    } else {
      dateFrom = `${year}-04-01`;
      dateTo   = `${year + 1}-03-31`;
    }

    // ── KPIs ─────────────────────────────────────────────────────────────────
    const [[sales]]      = await db.query(`SELECT COALESCE(SUM(total_amount),0) v FROM invoices WHERE branch_id=? AND invoice_date BETWEEN ? AND ?`, [branch,dateFrom,dateTo]);
    const [[purchases]]  = await db.query(`SELECT COALESCE(SUM(total_amount),0) v FROM purchases WHERE branch_id=? AND purchase_date BETWEEN ? AND ?`, [branch,dateFrom,dateTo]);
    const [[expenses]]   = await db.query(`SELECT COALESCE(SUM(amount),0) v FROM expenses WHERE branch_id=? AND expense_date BETWEEN ? AND ?`, [branch,dateFrom,dateTo]);
    const [[wages]]      = await db.query(`SELECT COALESCE(SUM(wage_amount),0) v FROM attendance WHERE branch_id=? AND attendance_date BETWEEN ? AND ?`, [branch,dateFrom,dateTo]);
    const [[receivables]]= await db.query(`SELECT COALESCE(SUM(balance_due),0) v FROM invoices WHERE branch_id=? AND balance_due>0`, [branch]);
    const [[payables]]   = await db.query(`SELECT COALESCE(SUM(balance_due),0) v FROM purchases WHERE branch_id=? AND balance_due>0`, [branch]);
    const [[gstRec]]     = await db.query(`SELECT COALESCE(SUM(cgst_amount+sgst_amount+igst_amount),0) v FROM invoices WHERE branch_id=? AND invoice_date BETWEEN ? AND ?`, [branch,dateFrom,dateTo]);

    // ── Recent Invoices ───────────────────────────────────────────────────────
    const [recent_invoices] = await db.query(`
      SELECT i.invoice_number, i.invoice_date, i.total_amount, i.balance_due,
        i.payment_status, c.name as customer
      FROM invoices i JOIN customers c ON c.id=i.customer_id
      WHERE i.branch_id=? AND i.invoice_date BETWEEN ? AND ?
      ORDER BY i.invoice_date DESC, i.id DESC LIMIT 10`, [branch,dateFrom,dateTo]);

    // ── Recent POs ────────────────────────────────────────────────────────────
    const [recent_pos] = await db.query(`
      SELECT po.po_number, po.po_date, po.total_amount, po.status, s.name as supplier_name
      FROM purchase_orders po JOIN suppliers s ON s.id=po.supplier_id
      WHERE po.branch_id=?
      ORDER BY po.po_date DESC LIMIT 6`, [branch]);

    // ── Stock Summary ─────────────────────────────────────────────────────────
    const [stock_summary] = await db.query(`
      SELECT name, current_stock, min_stock, unit,
        CASE WHEN current_stock<=0 THEN 'Critical' WHEN current_stock<=min_stock THEN 'Low' ELSE 'Good' END as status
      FROM materials WHERE branch_id=? AND is_active=1 ORDER BY current_stock ASC`, [branch]);

    // ── Production Summary ────────────────────────────────────────────────────
    const [production_summary] = await db.query(`
      SELECT m.name as material_name,
        COALESCE(SUM(pe.output_quantity),0) as total_output,
        COALESCE(SUM(pe.input_quantity),0) as total_input,
        COALESCE(SUM(pe.wastage_quantity),0) as total_wastage,
        COUNT(pe.id) as entry_count
      FROM production_entries pe
      JOIN materials m ON m.id=pe.output_material_id
      WHERE pe.branch_id=? AND pe.production_date BETWEEN ? AND ?
      GROUP BY pe.output_material_id
      ORDER BY total_output DESC`, [branch,dateFrom,dateTo]);

    // ── Wages Summary ─────────────────────────────────────────────────────────
    const [[wagesSummary]] = await db.query(`
      SELECT
        COALESCE(SUM(wage_amount),0) as total,
        COALESCE(AVG(wage_amount),0) as avg_daily,
        SUM(CASE WHEN status='Present' THEN 1 ELSE 0 END) as present_days,
        SUM(CASE WHEN status='Absent' THEN 1 ELSE 0 END) as absent_days
      FROM attendance WHERE branch_id=? AND attendance_date BETWEEN ? AND ?`, [branch,dateFrom,dateTo]);

    // ── Employee Attendance ───────────────────────────────────────────────────
    const [employee_attendance] = await db.query(`
      SELECT e.name,
        SUM(CASE WHEN a.status='Present' THEN 1 ELSE 0 END) as present_days,
        COUNT(a.id) as total_days,
        COALESCE(SUM(a.wage_amount),0) as total_wages
      FROM employees e
      LEFT JOIN attendance a ON a.employee_id=e.id AND a.attendance_date BETWEEN ? AND ?
      WHERE e.branch_id=? AND e.is_active=1
      GROUP BY e.id ORDER BY total_wages DESC LIMIT 8`, [dateFrom,dateTo,branch]);

    // ── Supplier Alerts ───────────────────────────────────────────────────────
    const [supplier_alerts] = await db.query(`
      SELECT s.name, s.city, s.phone,
        MAX(p.purchase_date) as last_receipt,
        DATEDIFF(CURDATE(), COALESCE(MAX(p.purchase_date), DATE_SUB(CURDATE(), INTERVAL 99 DAY))) as days_since
      FROM suppliers s
      LEFT JOIN purchases p ON p.supplier_id=s.id AND p.branch_id=?
      WHERE s.branch_id=?
      GROUP BY s.id
      HAVING days_since > 7 OR last_receipt IS NULL
      ORDER BY days_since DESC LIMIT 5`, [branch,branch]);

    // ── Bank Accounts ─────────────────────────────────────────────────────────
    const [bank_accounts] = await db.query(
      'SELECT bank_name, account_name, current_balance FROM bank_accounts WHERE branch_id=? AND is_active=1', [branch]);

    res.json({
      kpis: {
        sales:         parseFloat(sales.v)||0,
        purchases:     parseFloat(purchases.v)||0,
        expenses:      parseFloat(expenses.v)||0,
        wages:         parseFloat(wages.v)||0,
        net_profit:    (parseFloat(sales.v)||0) - (parseFloat(purchases.v)||0) - (parseFloat(expenses.v)||0) - (parseFloat(wages.v)||0),
        receivables:   parseFloat(receivables.v)||0,
        payables:      parseFloat(payables.v)||0,
        gst_receivable:parseFloat(gstRec.v)||0,
        bank_balance:  bank_accounts.reduce((s,b)=>s+(parseFloat(b.current_balance)||0), 0),
      },
      recent_invoices,
      recent_pos,
      stock_summary,
      production_summary,
      wages_summary: {
        total:        parseFloat(wagesSummary.total)||0,
        avg_daily:    parseFloat(wagesSummary.avg_daily)||0,
        present_days: parseInt(wagesSummary.present_days)||0,
        absent_days:  parseInt(wagesSummary.absent_days)||0,
      },
      employee_attendance,
      supplier_alerts,
      bank_accounts,
      period: { from: dateFrom, to: dateTo, period, year, quarter },
    });
  } catch(e) {
    console.error('Dashboard error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
