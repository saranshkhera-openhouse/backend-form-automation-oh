require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const pool = require('./db/pool');
const { MIGRATION_SQL, COMPAT_SQL } = require('./db/migrate');
const { SOCIETIES } = require('./db/seed');

const app = express();
const PORT = process.env.PORT || 3000;
app.use(cors()); app.use(express.json({limit:'10mb'})); app.use(express.urlencoded({extended:true}));
app.use(express.static(path.join(__dirname,'public')));

app.use('/api/config', require('./routes/config')(pool));
app.use('/api/schedule', require('./routes/schedule')(pool));
app.use('/api/visit', require('./routes/visit')(pool));
app.use('/api/token-request', require('./routes/token-request')(pool));
app.use('/api/token-deal', require('./routes/token-deal')(pool));
app.use('/api/final', require('./routes/final')(pool));
app.use('/api/listing', require('./routes/listing')(pool));

// OCR endpoint
app.use('/api/ocr', require('./routes/ocr')());

// Admin properties list
app.get('/api/properties', async(req,res)=>{
  try{const{rows}=await pool.query(`SELECT uid,city,locality,society_name,unit_no,configuration,owner_broker_name,contact_no,
    schedule_submitted_at,visit_submitted_at,token_submitted_at,token_is_draft,token_deal_submitted_at,final_submitted_at,listing_submitted_at,created_at
    FROM properties ORDER BY created_at DESC`);res.json(rows)}catch(e){res.status(500).json({error:e.message})}
});

// Pages
const send=(f)=>(_,r)=>r.sendFile(path.join(__dirname,'public',f));
app.get('/schedule',send('schedule.html'));
app.get('/visit',send('visit.html'));
app.get('/token-request',send('token-request.html'));
app.get('/token-deal',send('token-deal.html'));
app.get('/final',send('final.html'));
app.get('/listing',send('listing.html'));
app.get('/admin',send('admin.html'));
app.get('/',(_,r)=>r.redirect('/admin'));

async function start(){
  try{
    await pool.query(MIGRATION_SQL);await pool.query(COMPAT_SQL);console.log('✓ DB ready');
    const{rows}=await pool.query('SELECT COUNT(*)as c FROM master_societies');
    if(parseInt(rows[0].c)===0){for(const[c,l,s]of SOCIETIES)await pool.query('INSERT INTO master_societies(city,locality,society_name)VALUES($1,$2,$3)ON CONFLICT DO NOTHING',[c,l,s]);console.log(`✓ Seeded ${SOCIETIES.length} societies`)}
    app.listen(PORT,()=>console.log(`
  ┌────────────────────────────────────────┐
  │  OPENHOUSE FORMS v4.0 — 6-Form System  │
  ├────────────────────────────────────────┤
  │  1. Visit Schedule  → /schedule        │
  │  2. Visit Form      → /visit           │
  │  3. Token Request   → /token-request   │
  │  4. Token & Deal    → /token-deal      │
  │  5. Final Token     → /final           │
  │  6. Listing Details → /listing         │
  │  Admin Dashboard    → /admin           │
  │  Port: ${PORT}                         │
  └────────────────────────────────────────┘`));
  }catch(e){console.error('Startup failed:',e.message);process.exit(1)}
}
start();
