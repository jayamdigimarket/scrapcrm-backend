const router = require('express').Router();
const auth   = require('../middleware/auth');
const db     = require('../config/db');

// ── P&L REPORT ───────────────────────────────────────────
router.get('/reports/pl', auth, async (req, res) => {
  try {
    const { branch_id, from, to } = req.query;
    const branch = branch_id || req.user.branch_id;

    // INCOME
    const [sales] = await db.query(
      'SELECT COALESCE(SUM(total_amount),0) as val FROM invoices WHERE branch_id=? AND invoice_date BETWEEN ? AND ?',
      [branch, from, to]);
    const [cnTotal] = await db.query(
      'SELECT COALESCE(SUM(cn.total_amount),0) as val FROM credit_notes cn JOIN invoices i ON i.id=cn.invoice_id WHERE i.branch_id=? AND cn.cn_date BETWEEN ? AND ? AND cn.status="Applied"',
      [branch, from, to]);
    const netSales = +sales[0].val - +cnTotal[0].val;

    // EXPENDITURE
    const [purchases] = await db.query(
      'SELECT COALESCE(SUM(total_amount),0) as val FROM purchases WHERE branch_id=? AND purchase_date BETWEEN ? AND ?',
      [branch, from, to]);
    const [expenses] = await db.query(
      'SELECT category, COALESCE(SUM(amount),0) as val FROM expenses WHERE branch_id=? AND expense_date BETWEEN ? AND ? GROUP BY category',
      [branch, from, to]);
    const [salaries] = await db.query(
      'SELECT COALESCE(SUM(wage_amount),0) as val FROM attendance WHERE branch_id=? AND attendance_date BETWEEN ? AND ?',
      [branch, from, to]);

    const totalExpenses = +purchases[0].val + expenses.reduce((s,e)=>s+(+e.val||0),0) + +salaries[0].val;
    const totalRevenue = netSales;
    const netProfit = totalRevenue - totalExpenses;

    const expenseItems = [
      {label:"Material Purchases", value: +purchases[0].val},
      ...expenses.map(e=>({label:e.category+" Expense", value:+e.val})),
      {label:"Labour / Attendance Wages", value: +salaries[0].val},
    ];

    res.json({
      total_revenue: totalRevenue,
      total_expenses: totalExpenses,
      net_profit: netProfit,
      sections: [
        { title:"Income", items:[
          {label:"Sales (Invoices)", value:+sales[0].val},
          {label:"Less: Credit Notes", value:-+cnTotal[0].val},
          {label:"Net Sales", value:netSales},
        ], total: totalRevenue },
        { title:"Expenditure", items: expenseItems, total: totalExpenses },
      ],
    });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ── DAY BOOK ─────────────────────────────────────────────
router.get('/reports/daybook', auth, async (req, res) => {
  try {
    const { branch_id, from, to } = req.query;
    const branch = branch_id || req.user.branch_id;
    const entries = [];

    const [invoices] = await db.query(`
      SELECT i.invoice_date as date, 'Invoice' as type, i.invoice_number as doc_no,
        c.name as party, i.total_amount as debit, 0 as credit
      FROM invoices i JOIN customers c ON c.id=i.customer_id
      WHERE i.branch_id=? AND i.invoice_date BETWEEN ? AND ?`, [branch,from,to]);

    const [payments] = await db.query(`
      SELECT p.payment_date as date, 'Payment' as type, p.payment_number as doc_no,
        COALESCE(c.name, s.name, 'Unknown') as party, 0 as debit, p.amount as credit
      FROM payments p
      LEFT JOIN customers c ON c.id=p.party_id AND p.party_type='customer'
      LEFT JOIN suppliers s ON s.id=p.party_id AND p.party_type='supplier'
      WHERE p.branch_id=? AND p.payment_date BETWEEN ? AND ?`, [branch,from,to]);

    const [purchases] = await db.query(`
      SELECT p.purchase_date as date, 'Purchase' as type, p.purchase_number as doc_no,
        s.name as party, 0 as debit, p.total_amount as credit
      FROM purchases p JOIN suppliers s ON s.id=p.supplier_id
      WHERE p.branch_id=? AND p.purchase_date BETWEEN ? AND ?`, [branch,from,to]);

    const [expenses] = await db.query(`
      SELECT expense_date as date, 'Expense' as type,
        CONCAT('EXP-',id) as doc_no, category as party,
        amount as debit, 0 as credit
      FROM expenses WHERE branch_id=? AND expense_date BETWEEN ? AND ?`, [branch,from,to]);

    const [cns] = await db.query(`
      SELECT cn.cn_date as date, 'Credit Note' as type, cn.cn_number as doc_no,
        c.name as party, 0 as debit, cn.total_amount as credit
      FROM credit_notes cn JOIN customers c ON c.id=cn.customer_id
      WHERE cn.branch_id=? AND cn.cn_date BETWEEN ? AND ?`, [branch,from,to]);

    const all = [...invoices,...payments,...purchases,...expenses,...cns]
      .sort((a,b)=>new Date(a.date)-new Date(b.date));

    let balance = 0;
    const withBalance = all.map(e => {
      const debit  = parseFloat(e.debit)  || 0;
      const credit = parseFloat(e.credit) || 0;
      balance += debit - credit;
      return { ...e, debit, credit, running_balance: parseFloat(balance.toFixed(2)) };
    });

    const totalDebit  = withBalance.reduce((s,e)=>s+e.debit, 0);
    const totalCredit = withBalance.reduce((s,e)=>s+e.credit, 0);

    res.json({
      entries: withBalance,
      totals: { debit: totalDebit, credit: totalCredit, balance: totalDebit - totalCredit }
    });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ── RECEIVABLES ───────────────────────────────────────────
router.get('/reports/receivables', auth, async (req, res) => {
  try {
    const { branch_id } = req.query;
    const branch = branch_id || req.user.branch_id;
    const [rows] = await db.query(`
      SELECT c.name, c.phone, c.gst_number,
        COUNT(i.id) as invoice_count,
        COALESCE(SUM(i.total_amount),0) as total_amount,
        COALESCE(SUM(i.amount_paid),0) as amount_paid,
        COALESCE(SUM(i.balance_due),0) as outstanding,
        DATEDIFF(CURDATE(), MIN(i.invoice_date)) as days_overdue
      FROM customers c
      JOIN invoices i ON i.customer_id=c.id AND i.balance_due>0
      WHERE c.branch_id=?
      GROUP BY c.id ORDER BY outstanding DESC`, [branch]);
    const total    = rows.reduce((s,r)=>s+(+r.outstanding||0), 0);
    const overdue  = rows.filter(r=>r.days_overdue>30).reduce((s,r)=>s+(+r.outstanding||0), 0);
    res.json({ rows, total, overdue });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ── PAYABLES ─────────────────────────────────────────────
router.get('/reports/payables', auth, async (req, res) => {
  try {
    const { branch_id } = req.query;
    const branch = branch_id || req.user.branch_id;
    const [rows] = await db.query(`
      SELECT s.name, s.phone, s.gst_number,
        COUNT(p.id) as invoice_count,
        COALESCE(SUM(p.total_amount),0) as total_amount,
        COALESCE(SUM(p.amount_paid),0) as amount_paid,
        COALESCE(SUM(p.balance_due),0) as outstanding,
        DATEDIFF(CURDATE(), MIN(p.purchase_date)) as days_overdue
      FROM suppliers s
      JOIN purchases p ON p.supplier_id=s.id AND p.balance_due>0
      WHERE s.branch_id=?
      GROUP BY s.id ORDER BY outstanding DESC`, [branch]);
    const total   = rows.reduce((s,r)=>s+(+r.outstanding||0), 0);
    const overdue = rows.filter(r=>r.days_overdue>30).reduce((s,r)=>s+(+r.outstanding||0), 0);
    res.json({ rows, total, overdue });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ── STOCK REPORT ─────────────────────────────────────────
router.get('/reports/stock', auth, async (req, res) => {
  try {
    const { branch_id } = req.query;
    const branch = branch_id || req.user.branch_id;
    const [rows] = await db.query(
      'SELECT *, CASE WHEN current_stock<=0 THEN "Critical" WHEN current_stock<=min_stock THEN "Low" ELSE "Good" END as status FROM materials WHERE branch_id=? AND is_active=1 ORDER BY name',
      [branch]);
    const total_value = rows.reduce((s,r)=>(s+(+r.current_stock||0)*(+r.purchase_rate||0)), 0);
    const low_count      = rows.filter(r=>r.status==="Low").length;
    const critical_count = rows.filter(r=>r.status==="Critical").length;
    res.json({ rows, total_value, low_count, critical_count });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ── GST SUMMARY ───────────────────────────────────────────
router.get('/reports/gst-summary', auth, async (req, res) => {
  try {
    const { branch_id, from, to } = req.query;
    const branch = branch_id || req.user.branch_id;
    const [outward] = await db.query(`
      SELECT COALESCE(SUM(cgst_amount),0) as cgst, COALESCE(SUM(sgst_amount),0) as sgst,
             COALESCE(SUM(igst_amount),0) as igst
      FROM invoices WHERE branch_id=? AND invoice_date BETWEEN ? AND ?`, [branch,from,to]);
    const [inward] = await db.query(`
      SELECT COALESCE(SUM(cgst_amount),0) as cgst, COALESCE(SUM(sgst_amount),0) as sgst,
             COALESCE(SUM(igst_amount),0) as igst
      FROM purchases WHERE branch_id=? AND purchase_date BETWEEN ? AND ?
      AND supplier_id IN (SELECT id FROM suppliers WHERE gst_registered=1)`, [branch,from,to]);
    const [invoice_list] = await db.query(`
      SELECT i.invoice_number, i.invoice_date, c.name as customer, c.gst_number,
        i.subtotal, i.cgst_amount, i.sgst_amount, i.igst_amount, i.total_amount
      FROM invoices i JOIN customers c ON c.id=i.customer_id
      WHERE i.branch_id=? AND i.invoice_date BETWEEN ? AND ? ORDER BY i.invoice_date`, [branch,from,to]);
    const output_gst = +outward[0].cgst + +outward[0].sgst + +outward[0].igst;
    const input_gst  = +inward[0].cgst  + +inward[0].sgst  + +inward[0].igst;
    res.json({
      output_gst, output_cgst:+outward[0].cgst, output_sgst:+outward[0].sgst,
      input_gst,  input_cgst:+inward[0].cgst,   input_sgst:+inward[0].sgst,
      net_gst: output_gst - input_gst, invoice_list,
    });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ── BALANCE SHEET ─────────────────────────────────────────
router.get('/reports/balance', auth, async (req, res) => {
  try {
    const { branch_id } = req.query;
    const branch = branch_id || req.user.branch_id;

    const [receivables] = await db.query('SELECT COALESCE(SUM(balance_due),0) as val FROM invoices WHERE branch_id=?', [branch]);
    const [bankBalance] = await db.query('SELECT COALESCE(SUM(current_balance),0) as val FROM bank_accounts WHERE branch_id=? AND is_active=1', [branch]);
    const [stockVal]    = await db.query('SELECT COALESCE(SUM(current_stock*purchase_rate),0) as val FROM materials WHERE branch_id=? AND is_active=1', [branch]);
    const [payables]    = await db.query('SELECT COALESCE(SUM(balance_due),0) as val FROM purchases WHERE branch_id=?', [branch]);
    const [gstPayable]  = await db.query(`
      SELECT COALESCE(SUM(cgst_amount+sgst_amount+igst_amount),0) as out_gst FROM invoices WHERE branch_id=?`, [branch]);
    const [gstInput]    = await db.query(`
      SELECT COALESCE(SUM(cgst_amount+sgst_amount),0) as in_gst FROM purchases WHERE branch_id=?
      AND supplier_id IN (SELECT id FROM suppliers WHERE gst_registered=1)`, [branch]);
    const [totalSales]  = await db.query('SELECT COALESCE(SUM(total_amount),0) as val FROM invoices WHERE branch_id=?', [branch]);
    const [totalPur]    = await db.query('SELECT COALESCE(SUM(total_amount),0) as val FROM purchases WHERE branch_id=?', [branch]);
    const [totalExp]    = await db.query('SELECT COALESCE(SUM(amount),0) as val FROM expenses WHERE branch_id=?', [branch]);

    const netProfit = +totalSales[0].val - +totalPur[0].val - +totalExp[0].val;
    const netGST    = +gstPayable[0].out_gst - +gstInput[0].in_gst;

    const assets = [
      {label:"Cash & Bank Balances", value:+bankBalance[0].val},
      {label:"Accounts Receivable (Customer Outstanding)", value:+receivables[0].val},
      {label:"Inventory / Stock Value", value:+stockVal[0].val},
    ];
    const liabilities = [
      {label:"Accounts Payable (Supplier Outstanding)", value:+payables[0].val},
      {label:"GST Payable (Net)", value:Math.max(0,netGST)},
      {label:"Retained Earnings / Net Profit", value:netProfit},
    ];
    const total_assets      = assets.reduce((s,a)=>s+a.value, 0);
    const total_liabilities = liabilities.reduce((s,l)=>s+l.value, 0);

    res.json({ assets, liabilities, total_assets, total_liabilities });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
