require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const path    = require('path');

const app = express();

// ── Middleware ────────────────────────────────────────────
app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:3000',
    'https://erp.jayamm.com',
    'https://web-production-5f5e.up.railway.app',
    'https://erp.mvrpolyplast.com',
    // Android Capacitor APK origins
    'capacitor://localhost',
    'https://localhost',
    'http://localhost',
    'ionic://localhost',
    /^http:\/\/localhost:\d+$/,
    /^capacitor:\/\//,
  ],
  credentials: true,
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ── Routes ────────────────────────────────────────────────
app.use('/api/auth',         require('./routes/auth'));
app.use('/api/dashboard',    require('./routes/dashboard'));
app.use('/api',              require('./routes/parties'));
app.use('/api',              require('./routes/transactions'));
app.use('/api',              require('./routes/notes'));
app.use('/api',              require('./routes/operations'));
app.use('/api',              require('./routes/reports'));      // ← NEW
app.use('/api',              require('./routes/notifications')); // ← NEW

// ── WhatsApp & Razorpay (optional) ───────────────────────
try { app.use('/api/whatsapp', require('./routes/whatsapp')); } catch(e) {}
try { app.use('/api/razorpay', require('./routes/razorpay')); } catch(e) {}

// ── Health check ─────────────────────────────────────────
app.get('/health', (req, res) => res.json({
  status: 'OK',
  app: 'ScrapCRM — MVR Polyplast ERP',
  version: '1.0.0',
  developed_by: 'Jayamm Technologies',
  contact: '+91-9445155934'
}));

// ── 404 ──────────────────────────────────────────────────
app.use((req, res) => res.status(404).json({ error: 'Route not found' }));

// ── Error handler ─────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: err.message });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log('');
  console.log('  ╔═══════════════════════════════════════╗');
  console.log('  ║     ScrapCRM — MVR Polyplast ERP      ║');
  console.log('  ║   Developed by Jayamm Technologies    ║');
  console.log(`  ║   🚀 Backend running on port ${PORT}      ║`);
  console.log('  ╚═══════════════════════════════════════╝');
  console.log('');
});
