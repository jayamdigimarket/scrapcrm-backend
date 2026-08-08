const router  = require('express').Router();
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const db      = require('../config/db');

const SECRET = process.env.JWT_SECRET || 'scrapcrm_secret_2026';

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const [rows] = await db.query(
      'SELECT u.*, b.name as branch_name FROM users u LEFT JOIN branches b ON b.id=u.branch_id WHERE u.email=? AND u.is_active=1',
      [email]
    );
    if (!rows.length) return res.status(401).json({ error: 'Invalid credentials' });
    const user = rows[0];
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });
    await db.query('UPDATE users SET last_login=NOW() WHERE id=?', [user.id]);
    const token = jwt.sign(
      { id: user.id, role: user.role, branch_id: user.branch_id, name: user.name },
      SECRET, { expiresIn: '24h' }
    );
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role, branch_id: user.branch_id, branch_name: user.branch_name } });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/auth/change-password
router.post('/change-password', require('../middleware/auth'), async (req, res) => {
  try {
    const { old_password, new_password } = req.body;
    const [rows] = await db.query('SELECT * FROM users WHERE id=?', [req.user.id]);
    const valid = await bcrypt.compare(old_password, rows[0].password);
    if (!valid) return res.status(400).json({ error: 'Old password incorrect' });
    const hash = await bcrypt.hash(new_password, 10);
    await db.query('UPDATE users SET password=? WHERE id=?', [hash, req.user.id]);
    res.json({ message: 'Password changed' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
