require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const pool = require('./db/pool');
const { MIGRATION_SQL, COMPAT_SQL } = require('./db/migrate');
const { SOCIETIES } = require('./db/seed');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Routes
app.use('/api/config', require('./routes/config')(pool));
app.use('/api/visit', require('./routes/visit')(pool));
app.use('/api/token-request', require('./routes/token-request')(pool));
app.use('/api/final', require('./routes/final')(pool));

// Admin API
app.get('/api/properties', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT uid, city, locality, society_name, unit_no, configuration,
             owner_broker_name, visit_submitted_at, token_submitted_at,
             token_is_draft, final_submitted_at, created_at
      FROM properties ORDER BY created_at DESC
    `);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Pages
app.get('/visit', (_, r) => r.sendFile(path.join(__dirname, 'public', 'visit.html')));
app.get('/token-request', (_, r) => r.sendFile(path.join(__dirname, 'public', 'token-request.html')));
app.get('/final', (_, r) => r.sendFile(path.join(__dirname, 'public', 'final.html')));
app.get('/admin', (_, r) => r.sendFile(path.join(__dirname, 'public', 'admin.html')));
app.get('/', (_, r) => r.redirect('/admin'));

async function start() {
  try {
    await pool.query(MIGRATION_SQL);
    await pool.query(COMPAT_SQL);
    console.log('✓ Database ready');

    const { rows } = await pool.query('SELECT COUNT(*) as count FROM master_societies');
    if (parseInt(rows[0].count) === 0) {
      console.log('  Seeding societies...');
      for (const [city, locality, society] of SOCIETIES) {
        await pool.query('INSERT INTO master_societies (city,locality,society_name) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING', [city, locality, society]);
      }
      console.log(`✓ Seeded ${SOCIETIES.length} societies`);
    }

    app.listen(PORT, () => console.log(`
  ┌──────────────────────────────────────┐
  │     OPENHOUSE FORMS v3.0             │
  ├──────────────────────────────────────┤
  │  Visit Form      → /visit           │
  │  Token Request   → /token-request    │
  │  Final Token     → /final            │
  │  Admin Dashboard → /admin            │
  │  Port: ${PORT}                          │
  └──────────────────────────────────────┘`));
  } catch (err) { console.error('Startup failed:', err.message); process.exit(1); }
}
start();
