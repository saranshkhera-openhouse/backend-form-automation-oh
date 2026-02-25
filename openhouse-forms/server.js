require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const pool = require('./db/pool');
const { MIGRATION_SQL } = require('./db/migrate');

const app = express();
const PORT = process.env.PORT || 3000;

// ── Middleware ──
app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// ── API Routes ──
app.use('/api/config', require('./routes/config')(pool));
app.use('/api/visit', require('./routes/visit')(pool));
app.use('/api/token', require('./routes/token')(pool));

// ── Admin: list all properties ──
app.get('/api/properties', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT uid, city, locality, society_name, unit_no, configuration,
             owner_first_name, owner_last_name,
             visit_submitted_at, token_submitted_at, listing_submitted_at,
             created_at
      FROM properties ORDER BY created_at DESC
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Serve HTML pages ──
app.get('/visit', (req, res) => res.sendFile(path.join(__dirname, 'public', 'visit.html')));
app.get('/token', (req, res) => res.sendFile(path.join(__dirname, 'public', 'token.html')));
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'public', 'admin.html')));
app.get('/', (req, res) => res.redirect('/admin'));

// ── Startup: auto-migrate then listen ──
async function start() {
  try {
    // Run migrations on startup (safe to re-run, uses IF NOT EXISTS)
    await pool.query(MIGRATION_SQL);
    console.log('✓ Database ready');

    // Check if societies are seeded
    const { rows } = await pool.query('SELECT COUNT(*) as count FROM master_societies');
    if (parseInt(rows[0].count) === 0) {
      console.log('⚠ No society data found. Run: npm run seed');
    } else {
      console.log(`✓ ${rows[0].count} societies loaded`);
    }

    app.listen(PORT, () => {
      console.log(`
  ┌─────────────────────────────────────────────────┐
  │           OPENHOUSE FORMS SERVER                 │
  ├─────────────────────────────────────────────────┤
  │  Visit Form   →  /visit                         │
  │  Token Form   →  /token                         │
  │  Admin Panel  →  /admin                         │
  │                                                 │
  │  Running on port ${PORT}                            │
  └─────────────────────────────────────────────────┘
      `);
    });
  } catch (err) {
    console.error('Failed to start:', err.message);
    process.exit(1);
  }
}

start();
