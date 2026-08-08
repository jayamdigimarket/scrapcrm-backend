// ── ADD THESE ROUTES to D:\scrapcrm\backend\routes\transactions.js ──────────
// Add AFTER the existing purchase-orders GET route

// Manual PO creation
router.post('/purchase-orders', auth, async (req, res) => {
  try {
    const {
      supplier_id, po_date, payment_terms, incoterms, notes,
      items, branch_id, is_auto_generated, supplier_type, status
    } = req.body;

    const db = require('../config/db');
    const { nextDocNumber } = require('../config/docNumber');

    const po_number = await nextDocNumber(branch_id, 'PO');

    // Calculate totals
    const subtotal = items.reduce((s, i) => s + (+i.taxable_value || 0), 0);
    const cgst = items.reduce((s, i) => s + (+i.cgst_amount || 0), 0);
    const sgst = items.reduce((s, i) => s + (+i.sgst_amount || 0), 0);
    const igst = items.reduce((s, i) => s + (+i.igst_amount || 0), 0);
    const total = subtotal + cgst + sgst + igst;

    const [result] = await db.query(`
      INSERT INTO purchase_orders
        (branch_id, po_number, supplier_id, po_date, payment_terms, incoterms,
         supplier_type, status, subtotal, cgst_amount, sgst_amount, igst_amount,
         total_amount, is_auto_generated, notes, created_by)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [branch_id, po_number, supplier_id, po_date, payment_terms || 7,
       incoterms || 'FOB Road', supplier_type || 'GST', status || 'Pending',
       subtotal, cgst, sgst, igst, total, is_auto_generated ? 1 : 0,
       notes || '', req.user.id]
    );

    const po_id = result.insertId;

    // Insert PO items
    if (items && items.length) {
      for (const item of items) {
        if (!item.material_id) continue;
        await db.query(`
          INSERT INTO purchase_order_items
            (po_id, material_id, hsn_code, quantity, rate, taxable_value,
             cgst_rate, cgst_amount, sgst_rate, sgst_amount, igst_rate, igst_amount, total_value)
          VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
          [po_id, item.material_id, item.hsn_code || '', item.quantity || 0,
           item.rate || 0, item.taxable_value || 0,
           item.cgst_rate || 0, item.cgst_amount || 0,
           item.sgst_rate || 0, item.sgst_amount || 0,
           item.igst_rate || 0, item.igst_amount || 0,
           item.total_value || 0]
        );
      }
    }

    res.json({ id: po_id, po_number, message: 'Purchase Order created!' });
  } catch (e) {
    console.error('PO create error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// Update PO status
router.put('/purchase-orders/:id', auth, async (req, res) => {
  try {
    const db = require('../config/db');
    const { status } = req.body;
    await db.query('UPDATE purchase_orders SET status=? WHERE id=?', [status, req.params.id]);
    res.json({ message: 'PO updated' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
