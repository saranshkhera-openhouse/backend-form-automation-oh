require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const session = require('express-session');
const PgSession = require('connect-pg-simple')(session);
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const pool = require('./db/pool');
const { MIGRATION_SQL, COMPAT_SQL } = require('./db/migrate');
const { SOCIETIES } = require('./db/seed');
const { isAuthenticated, hasFormAccess, isAdmin } = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 3000;
app.use(cors()); app.use(express.json({limit:'10mb'})); app.use(express.urlencoded({extended:true}));

// ── Sessions (stored in PostgreSQL) ──
app.set('trust proxy', 1);
app.use(session({
  store: new PgSession({ pool, tableName: 'session', createTableIfMissing: true }),
  secret: process.env.SESSION_SECRET || 'openhouse-secret-change-me',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: process.env.NODE_ENV === 'production' || process.env.APP_URL?.startsWith('https'), maxAge: 30 * 24 * 60 * 60 * 1000, sameSite: 'lax' }
}));

// ── Passport (Google OAuth) ──
app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser(async (id, done) => {
  try { const { rows } = await pool.query('SELECT * FROM users WHERE id=$1', [id]); done(null, rows[0] || null); }
  catch (e) { done(e, null); }
});

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  const callbackURL = (process.env.APP_URL || `http://localhost:${PORT}`) + '/auth/google/callback';
  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL
  }, async (accessToken, refreshToken, profile, done) => {
    try {
      const email = (profile.emails && profile.emails[0] && profile.emails[0].value || '').toLowerCase();
      if (!email) return done(null, false);
      const { rows } = await pool.query('SELECT * FROM users WHERE LOWER(email)=$1 AND is_active=TRUE', [email]);
      if (!rows.length) return done(null, false);
      // Update name + store OAuth tokens
      const updates = [];
      const vals = [];
      let idx = 1;
      if (!rows[0].name && profile.displayName) { updates.push(`name=$${idx++}`); vals.push(profile.displayName); }
      if (accessToken) { updates.push(`google_access_token=$${idx++}`); vals.push(accessToken); }
      if (refreshToken) { updates.push(`google_refresh_token=$${idx++}`); vals.push(refreshToken); }
      if (updates.length) {
        vals.push(rows[0].id);
        await pool.query(`UPDATE users SET ${updates.join(',')} WHERE id=$${idx}`, vals);
        if (accessToken) rows[0].google_access_token = accessToken;
        if (refreshToken) rows[0].google_refresh_token = refreshToken;
        if (!rows[0].name && profile.displayName) rows[0].name = profile.displayName;
      }
      return done(null, rows[0]);
    } catch (e) { return done(e, null); }
  }));
}

// ── Static files ──
app.use('/css', express.static(path.join(__dirname, 'public/css')));
app.use('/js', express.static(path.join(__dirname, 'public/js')));
app.use('/images', express.static(path.join(__dirname, 'public/images')));

// ── Auth routes ──
app.use('/auth', require('./routes/auth')(pool));
app.get('/login', (_, r) => r.sendFile(path.join(__dirname, 'public/login.html')));

// ── API routes ──
app.use('/api/config', isAuthenticated, require('./routes/config')(pool));
app.use('/api/schedule', isAuthenticated, hasFormAccess, require('./routes/schedule')(pool));
app.use('/api/visit', isAuthenticated, hasFormAccess, require('./routes/visit')(pool));
app.use('/api/token-request', isAuthenticated, hasFormAccess, require('./routes/token-request')(pool));
app.use('/api/token-deal', isAuthenticated, hasFormAccess, require('./routes/token-deal')(pool));
app.use('/api/final', isAuthenticated, hasFormAccess, require('./routes/final')(pool));
app.use('/api/listing', isAuthenticated, hasFormAccess, require('./routes/listing')(pool));
app.use('/api/ocr', isAuthenticated, require('./routes/ocr')());

// ── Admin API — list all properties ──
app.get('/api/properties', isAuthenticated, isAdmin, async(req,res)=>{
  try{const{rows}=await pool.query(`SELECT uid,city,locality,society_name,unit_no,tower_no,configuration,owner_broker_name,first_name,last_name,contact_no,
    assigned_by,field_exec,token_requested_by,
    schedule_submitted_at,visit_submitted_at,token_submitted_at,token_is_draft,token_deal_submitted_at,final_submitted_at,listing_submitted_at,created_at
    FROM properties ORDER BY created_at DESC`);res.json(rows)}catch(e){console.error('Properties list error:',e.message);res.status(500).json({error:e.message})}
});

// ── Admin API — single property (full detail for modal) ──
app.get('/api/admin/property/:uid', isAuthenticated, isAdmin, async(req,res)=>{
  try{const{rows}=await pool.query('SELECT * FROM properties WHERE uid=$1',[req.params.uid]);
    if(!rows.length)return res.status(404).json({error:'Not found'});res.json(rows[0])}catch(e){console.error('Property detail error:',e.message);res.status(500).json({error:e.message})}
});

// ── Protected page routes ──
const sendForm = (f) => [isAuthenticated, hasFormAccess, (_, r) => r.sendFile(path.join(__dirname, 'public', f))];
app.get('/schedule', ...sendForm('schedule.html'));
app.get('/visit', ...sendForm('visit.html'));
app.get('/token-request', ...sendForm('token-request.html'));
app.get('/token-deal', ...sendForm('token-deal.html'));
app.get('/final', ...sendForm('final.html'));
app.get('/listing', ...sendForm('listing.html'));
app.get('/admin', isAuthenticated, isAdmin, (_, r) => r.sendFile(path.join(__dirname, 'public/admin.html')));

// ── Home ──
app.get('/', isAuthenticated, (_, r) => r.sendFile(path.join(__dirname, 'public/index.html')));

async function start() {
  try {
    await pool.query(MIGRATION_SQL);
    console.log('Migration done');
    await pool.query(COMPAT_SQL);
    console.log('Compat done, DB ready');
    const { rows } = await pool.query('SELECT COUNT(*)as c FROM master_societies');
    if (parseInt(rows[0].c) === 0) {
      for (const [c, l, s] of SOCIETIES) await pool.query('INSERT INTO master_societies(city,locality,society_name)VALUES($1,$2,$3)ON CONFLICT DO NOTHING', [c, l, s]);
      console.log(`Seeded ${SOCIETIES.length} societies`);
    }
    const uc = await pool.query('SELECT COUNT(*)as c FROM users');
    if (parseInt(uc.rows[0].c) === 0) {
      console.log('\n  ⚠  No users found. Add first admin via Render Shell.');
    }
    app.listen(PORT, () => console.log(`\n  OPENHOUSE v6.1 running on port ${PORT}\n`));
  } catch (e) { console.error('Startup failed:', e.message); process.exit(1); }
}
start();