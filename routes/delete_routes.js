// ── Add these DELETE routes to the appropriate route files ─────────────────

// ── transactions.js — add before module.exports ────────────────────────────

// Delete invoice (superadmin only — check role middleware or trust frontend)
router.delete('/invoices/:id', auth, async (req, res) => {
  try {
    // Restore stock for each item
    const [items] = await db.query('SELECT * FROM invoice_items WHERE invoice_id=?', [req.params.id]);
    for (const item of items) {
      await db.query('UPDATE materials SET current_stock=current_stock+? WHERE id=?', [item.quantity, item.material_id]);
    }
    await db.query('DELETE FROM invoice_items WHERE invoice_id=?', [req.params.id]);
    await db.query('DELETE FROM payments WHERE invoice_id=?', [req.params.id]);
    await db.query('DELETE FROM invoices WHERE id=?', [req.params.id]);
    res.json({ message: 'Invoice deleted' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Delete purchase
router.delete('/purchases/:id', auth, async (req, res) => {
  try {
    const [items] = await db.query('SELECT * FROM purchase_items WHERE purchase_id=?', [req.params.id]);
    for (const item of items) {
      await db.query('UPDATE materials SET current_stock=current_stock-? WHERE id=?', [item.quantity, item.material_id]);
    }
    await db.query('DELETE FROM purchase_items WHERE purchase_id=?', [req.params.id]);
    await db.query('DELETE FROM purchase_orders WHERE linked_purchase_id=?', [req.params.id]);
    await db.query('DELETE FROM purchases WHERE id=?', [req.params.id]);
    res.json({ message: 'Purchase deleted' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Delete purchase order
router.delete('/purchase-orders/:id', auth, async (req, res) => {
  try {
    await db.query('DELETE FROM purchase_order_items WHERE po_id=?', [req.params.id]);
    await db.query('DELETE FROM purchase_orders WHERE id=?', [req.params.id]);
    res.json({ message: 'PO deleted' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Update invoice (PUT already exists — ensure it handles all fields)
// Update expense
router.put('/expenses/:id', auth, async (req, res) => {
  try {
    const d = req.body;
    await db.query(
      'UPDATE expenses SET expense_date=?,category=?,description=?,amount=?,payment_mode=? WHERE id=?',
      [d.expense_date, d.category, d.description, d.amount, d.payment_mode, req.params.id]);
    res.json({ message: 'Expense updated' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Delete expense
router.delete('/expenses/:id', auth, async (req, res) => {
  try {
    await db.query('DELETE FROM expenses WHERE id=?', [req.params.id]);
    res.json({ message: 'Expense deleted' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── notes.js — add before module.exports ───────────────────────────────────

// Delete credit note
router.delete('/credit-notes/:id', auth, async (req, res) => {
  try {
    await db.query('DELETE FROM credit_note_items WHERE cn_id=?', [req.params.id]);
    await db.query('DELETE FROM credit_notes WHERE id=?', [req.params.id]);
    res.json({ message: 'Credit note deleted' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Delete debit note
router.delete('/debit-notes/:id', auth, async (req, res) => {
  try {
    await db.query('DELETE FROM debit_notes WHERE id=?', [req.params.id]);
    res.json({ message: 'Debit note deleted' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Delete delivery challan
router.delete('/delivery-challans/:id', auth, async (req, res) => {
  try {
    await db.query('DELETE FROM challan_items WHERE challan_id=?', [req.params.id]);
    await db.query('DELETE FROM delivery_challans WHERE id=?', [req.params.id]);
    res.json({ message: 'Challan deleted' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── operations.js — add before module.exports ──────────────────────────────

// PUT /production/:id — update
router.put('/production/:id', auth, async (req, res) => {
  try {
    const d = req.body;
    await db.query(`UPDATE production SET production_date=?,shift=?,input_material_id=?,
      input_quantity=?,output_material_id=?,output_quantity=?,wastage_quantity=?,
      operator_name=?,notes=? WHERE id=?`,
      [d.production_date,d.shift,d.input_material_id,d.input_quantity,
       d.output_material_id,d.output_quantity,d.wastage_quantity||0,
       d.operator_name||'',d.notes||'',req.params.id]);
    res.json({ message: 'Production updated' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// DELETE /production/:id
router.delete('/production/:id', auth, async (req, res) => {
  try {
    await db.query('DELETE FROM production WHERE id=?', [req.params.id]);
    res.json({ message: 'Production entry deleted' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// PUT /materials/:id — update material
router.put('/materials/:id', auth, async (req, res) => {
  try {
    const d = req.body;
    await db.query(`UPDATE materials SET name=?,hsn_code=?,unit=?,purchase_rate=?,
      sale_rate=?,gst_rate=?,min_stock=?,current_stock=? WHERE id=?`,
      [d.name,d.hsn_code,d.unit,d.purchase_rate,d.sale_rate,
       d.gst_rate,d.min_stock,d.current_stock,req.params.id]);
    // Update status based on new stock
    const status = +d.current_stock <= 0 ? 'Critical' : +d.current_stock <= +d.min_stock ? 'Low' : 'Good';
    await db.query('UPDATE materials SET status=? WHERE id=?', [status, req.params.id]);
    res.json({ message: 'Material updated' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// DELETE /materials/:id
router.delete('/materials/:id', auth, async (req, res) => {
  try {
    await db.query('UPDATE materials SET is_active=0 WHERE id=?', [req.params.id]);
    res.json({ message: 'Material deactivated' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// PUT /employees/:id — update/deactivate employee
router.put('/employees/:id', auth, async (req, res) => {
  try {
    const d = req.body;
    if (d.is_active !== undefined) {
      await db.query('UPDATE employees SET is_active=? WHERE id=?', [d.is_active, req.params.id]);
    } else {
      await db.query(`UPDATE employees SET name=?,designation=?,phone=?,daily_wage=? WHERE id=?`,
        [d.name,d.designation,d.phone,d.daily_wage,req.params.id]);
    }
    res.json({ message: 'Employee updated' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// DELETE /employees/:id — permanent delete
router.delete('/employees/:id', auth, async (req, res) => {
  try {
    await db.query('DELETE FROM attendance WHERE employee_id=?', [req.params.id]);
    await db.query('DELETE FROM employees WHERE id=?', [req.params.id]);
    res.json({ message: 'Employee deleted' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// DELETE /bank-accounts/:id
router.delete('/bank-accounts/:id', auth, async (req, res) => {
  try {
    await db.query('DELETE FROM bank_accounts WHERE id=?', [req.params.id]);
    res.json({ message: 'Bank account deleted' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// PUT /users/:id — update role or active status
router.put('/users/:id', auth, async (req, res) => {
  try {
    const d = req.body;
    if (d.role !== undefined) {
      await db.query('UPDATE users SET role=? WHERE id=?', [d.role, req.params.id]);
    }
    if (d.is_active !== undefined) {
      await db.query('UPDATE users SET is_active=? WHERE id=?', [d.is_active, req.params.id]);
    }
    res.json({ message: 'User updated' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
