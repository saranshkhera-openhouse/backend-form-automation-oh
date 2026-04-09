// WhatsApp notification via Interakt API (Official WhatsApp Business API)
// All team data now pulled from users table in DB
const https = require('https');

let _pool = null;
function init(pool) { _pool = pool; }

// ═══════════════════════════════════════════════════════
// DB LOOKUPS (replace hardcoded maps)
// ═══════════════════════════════════════════════════════

async function getPhone(name) {
  if (!name || !_pool) return null;
  try {
    const { rows } = await _pool.query(
      `SELECT phone FROM users WHERE LOWER(name)=LOWER($1) AND phone IS NOT NULL AND phone!='' AND is_active=TRUE LIMIT 1`,
      [name.trim()]
    );
    return rows.length ? rows[0].phone : null;
  } catch(e) { console.error('getPhone error:', e.message); return null; }
}

async function getTopManagers() {
  if (!_pool) return [];
  try {
    const { rows } = await _pool.query(`SELECT name FROM users WHERE is_top_manager=TRUE AND is_active=TRUE`);
    return rows.map(r => r.name).filter(Boolean);
  } catch(e) { console.error('getTopManagers error:', e.message); return []; }
}

async function getMidManagers() {
  if (!_pool) return {};
  try {
    const { rows } = await _pool.query(`SELECT name, managed_team FROM users WHERE is_manager=TRUE AND is_active=TRUE`);
    const map = {};
    rows.forEach(r => {
      if (r.name) {
        const team = typeof r.managed_team === 'string' ? JSON.parse(r.managed_team || '[]') : r.managed_team || [];
        if (team.length) map[r.name] = team;
      }
    });
    return map;
  } catch(e) { console.error('getMidManagers error:', e.message); return {}; }
}

// ═══════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════

function nameMatch(a, b) {
  if (!a || !b) return false;
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

// Get all people who should receive a notification for this property
async function getRecipients(property, directRecipients) {
  const recipients = new Set();
  const involved = [
    property.assigned_by, property.field_exec, property.token_requested_by,
    ...directRecipients
  ].filter(Boolean);

  // 1. Direct recipients always get notified
  directRecipients.forEach(name => { if (name) recipients.add(name); });

  // 2. Top managers get everything
  const topMgrs = await getTopManagers();
  topMgrs.forEach(mgr => recipients.add(mgr));

  // 3. Mid managers get notified if any involved person is in their team
  const midMgrs = await getMidManagers();
  for (const [mgr, team] of Object.entries(midMgrs)) {
    const isInvolved = involved.some(name => nameMatch(name, mgr)) ||
                       involved.some(name => team.some(member => nameMatch(name, member)));
    if (isInvolved) recipients.add(mgr);
  }

  return [...recipients];
}

// Send template to multiple recipients, skip duplicates by phone
async function broadcastTemplate(templateName, bodyValues, recipients) {
  const sentPhones = new Set();
  const results = [];
  for (const name of recipients) {
    const phone = await getPhone(name);
    if (!phone) { console.log(`WA: No phone for "${name}", skipping`); continue; }
    if (sentPhones.has(phone)) { console.log(`WA: Already sent to ${phone} (${name}), skipping dupe`); continue; }
    sentPhones.add(phone);
    const ok = await sendInterakt(phone, templateName, bodyValues);
    results.push({ name, phone, ok });
  }
  return results;
}

// ═══════════════════════════════════════════════════════
// INTERAKT API
// ═══════════════════════════════════════════════════════
function sendInterakt(phone, templateName, bodyValues) {
  return new Promise((resolve) => {
    const apiKey = process.env.INTERAKT_API_KEY;
    if (!apiKey) { console.log('WA: INTERAKT_API_KEY not set, skipping'); return resolve(false); }
    if (!phone) { console.log('WA: No phone number, skipping'); return resolve(false); }

    const payload = JSON.stringify({
      countryCode: '+91',
      phoneNumber: phone,
      callbackData: 'openhouse_notify',
      type: 'Template',
      template: {
        name: templateName,
        languageCode: 'en',
        bodyValues: bodyValues
      }
    });

    console.log(`WA: Sending ${templateName} → ${phone}...`);

    const req = https.request({
      hostname: 'api.interakt.ai',
      path: '/v1/public/message/',
      method: 'POST',
      headers: {
        'Authorization': `Basic ${apiKey}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        console.log(`WA: [${res.statusCode}] ${phone}: ${data.substring(0, 200)}`);
        resolve(res.statusCode === 200);
      });
    });
    req.on('error', e => { console.error('WA: Request error:', e.message); resolve(false); });
    req.write(payload);
    req.end();
  });
}

// ═══════════════════════════════════════════════════════
// DATE/TIME HELPERS
// ═══════════════════════════════════════════════════════
function fmtDate(d) {
  if (!d) return '-';
  const dt = d instanceof Date ? d : new Date(d + 'T00:00');
  if (isNaN(dt)) return '-';
  return dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}
function fmtTime(t) {
  if (!t) return '-';
  const [h, m] = t.split(':');
  const hr = parseInt(h);
  return `${hr === 0 ? 12 : hr > 12 ? hr - 12 : hr}:${m} ${hr >= 12 ? 'PM' : 'AM'}`;
}

// ═══════════════════════════════════════════════════════
// NOTIFICATION FUNCTIONS
// ═══════════════════════════════════════════════════════

function notifyVisitScheduled(property) {
  const p = property;
  const bodyValues = [p.uid||'-',fmtDate(p.schedule_date),fmtTime(p.schedule_time),p.field_exec||'-',p.assigned_by||'-',p.society_name||'-',p.tower_no||'-',p.unit_no||'-'];
  return getRecipients(p, [p.field_exec]).then(r => {
    console.log(`WA: visit_scheduled | UID: ${p.uid} | To: ${r.join(', ')}`);
    return broadcastTemplate('visit_scheduled', bodyValues, r);
  });
}

function notifyVisitCompleted(property) {
  const p = property;
  const bodyValues = [p.uid||'-',p.society_name||'-',p.tower_no||'-',p.unit_no||'-',p.field_exec||'-',p.assigned_by||'-'];
  return getRecipients(p, [p.assigned_by]).then(r => {
    console.log(`WA: visit_completed_1v | UID: ${p.uid} | To: ${r.join(', ')}`);
    return broadcastTemplate('visit_completed_1v', bodyValues, r);
  });
}

function notifyTokenRequest(property) {
  const p = property;
  const amt = p.token_amount_requested ? '₹' + Number(p.token_amount_requested).toLocaleString('en-IN') : '-';
  const bodyValues = [p.uid||'-',amt,p.society_name||'-',p.tower_no||'-',p.unit_no||'-',p.token_requested_by||'-',p.owner_broker_name||'-'];
  return getRecipients(p, [p.assigned_by, p.token_requested_by, 'Saurabh']).then(r => {
    console.log(`WA: token_request | UID: ${p.uid} | To: ${r.join(', ')}`);
    return broadcastTemplate('token_request', bodyValues, r);
  });
}

function notifyVisitReassigned(property, newExec) {
  const p = property;
  const bodyValues = [p.uid||'-',fmtDate(p.schedule_date),fmtTime(p.schedule_time),newExec||'-',p.assigned_by||'-',p.society_name||'-',p.tower_no||'-',p.unit_no||'-'];
  return getRecipients(p, [newExec, p.assigned_by]).then(r => {
    console.log(`WA: visit_reassigned | UID: ${p.uid} | To: ${r.join(', ')}`);
    return broadcastTemplate('visit_reassigned', bodyValues, r);
  });
}

function notifyVisitCancelled(property, cancelledBy) {
  const p = property;
  const bodyValues = [p.uid||'-',p.society_name||'-',p.tower_no||'-',p.unit_no||'-',cancelledBy||'-'];
  return getRecipients(p, [p.assigned_by, p.field_exec]).then(r => {
    console.log(`WA: visit_cancelled | UID: ${p.uid} | To: ${r.join(', ')}`);
    return broadcastTemplate('visit_cancelled', bodyValues, r);
  });
}

async function notifyAMASubmitted(property, submitterName) {
  const p = property;
  let dateStr = '-';
  if(p.deal_transfer_date){const dt=new Date(p.deal_transfer_date);dateStr=`${String(dt.getDate()).padStart(2,'0')}/${String(dt.getMonth()+1).padStart(2,'0')}/${dt.getFullYear()}`}
  const towerUnit = [p.tower_no, p.unit_no].filter(Boolean).join(' - ') || '-';
  const bdManager = p.assigned_by || '-';
  const bdPhone = await getPhone(bdManager) || '-';
  const bodyValues = [p.uid||'-', dateStr, p.society_name||'-', towerUnit, bdManager, bdPhone];
  // Fixed recipients: Saurabh, Akash Teotia + top managers + BD manager + submitter
  const topMgrs = await getTopManagers();
  const recipients = [...new Set(['Saurabh', 'Akash Teotia', 'Priyanshi Bajpai', ...topMgrs])];
  if(bdManager && bdManager!=='-') recipients.push(bdManager);
  if(submitterName && submitterName!=='-') recipients.push(submitterName);
  console.log(`WA: ama_notification | UID: ${p.uid} | To: ${recipients.join(', ')}`);
  const results = await broadcastTemplate('ama_notification', bodyValues, recipients);
  return results;
}

// Deal Terms shared to owner — triggered on Form 4 email send
// Recipients: Top Managers, Submitter, Saurabh
// To add more recipients: add names to the recipients array below
async function notifyDealTermsShared(property, submitterName) {
  const p = property;
  const gsp = p.guaranteed_sale_price ? '₹' + Number(p.guaranteed_sale_price).toLocaleString('en-IN') + ' Lakhs' : '-';
  const bodyValues = [p.uid||'-', p.society_name||'-', p.tower_no||'-', p.unit_no||'-', p.owner_broker_name||'-', p.co_owner||'-', gsp];
  const topMgrs = await getTopManagers();
  const recipients = [...new Set(['Saurabh', ...topMgrs])];
  if(submitterName && submitterName!=='-') recipients.push(submitterName);
  console.log(`WA: deal_terms_shared_to_owner | UID: ${p.uid} | To: ${recipients.join(', ')}`);
  return broadcastTemplate('deal_terms_shared_to_owner', bodyValues, recipients);
}

// AMA Signed / Pending Amount Request — triggered on Form 6 email send
// Recipients: Top Managers, Submitter, Saurabh, Akash Teotia, Amisha (9289996736)
// To add more recipients: add names to the recipients array below
async function notifyAMASigned(property, submitterName) {
  const p = property;
  const bodyValues = [p.uid||'-', p.society_name||'-', p.tower_no||'-', p.unit_no||'-', p.owner_broker_name||'-', p.co_owner||'-'];
  const topMgrs = await getTopManagers();
  const recipients = [...new Set(['Saurabh', 'Akash Teotia', ...topMgrs])];
  if(submitterName && submitterName!=='-') recipients.push(submitterName);
  console.log(`WA: ama_signed | UID: ${p.uid} | To: ${recipients.join(', ')}`);
  const results = await broadcastTemplate('ama_signed', bodyValues, recipients);
  // Amisha — fixed phone (not in users table yet)
  await sendInterakt('9289996736', 'ama_signed', bodyValues);
  return results;
}

// Key Handover — triggered on Form 7 email send
// Recipients: Top Managers, Submitter, Saurabh
// To add more recipients: add names to the recipients array below
async function notifyKeyHandover(property, submitterName) {
  const p = property;
  const hdDate = p.key_handover_date ? fmtDate(p.key_handover_date) : '-';
  const bodyValues = [p.uid||'-', p.society_name||'-', p.tower_no||'-', p.unit_no||'-', hdDate];
  const topMgrs = await getTopManagers();
  const recipients = [...new Set(['Saurabh', ...topMgrs])];
  if(submitterName && submitterName!=='-') recipients.push(submitterName);
  console.log(`WA: key_handover | UID: ${p.uid} | To: ${recipients.join(', ')}`);
  return broadcastTemplate('key_handover', bodyValues, recipients);
}

module.exports = {
  init, getPhone, getTopManagers, getMidManagers,
  sendInterakt, broadcastTemplate, getRecipients,
  notifyVisitScheduled, notifyVisitCompleted, notifyTokenRequest,
  notifyVisitReassigned, notifyVisitCancelled, notifyAMASubmitted,
  notifyDealTermsShared, notifyAMASigned, notifyKeyHandover
};