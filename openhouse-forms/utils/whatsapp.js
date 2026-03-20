// WhatsApp notification via Interakt API (Official WhatsApp Business API)
const https = require('https');

// ═══════════════════════════════════════════════════════
// TEAM DIRECTORY — phone numbers (10 digits, no country code)
// ═══════════════════════════════════════════════════════
const NAME_TO_PHONE = {
  'Akash Pandit':       '8595594789',
  'Deepak Mishra':      '8130724002',
  'Praveen Kumar':      '9289996737',
  'Shashank Kumar':     '9205658886',
  'Rupali Prasad':      '9289996738',
  'Sushmita Roy':       '9821700377',
  'Sahaj Dureja':       '8003297088',
  'Test Sahaj':         '8003297088',
  'Abhishek Rathore':   '9452441498',
  'Aman Dixit':         '9266533475',
  'Animesh Singh':      '9810826481',
  'Apurv Nath':         '9891665256',
  'Arti Ahirwar':       '9289500948',
  'Kavita Rawat':       '9311338216',
  'Nisha Deewan':       '9211599292',
  'Nishant Kumar':      '8130733966',
  'Rahul Sheel':        '9289311664',
  'Rahul Singh':        '9217710683',
  'Sahil Singh':        '9217275007',
  'Ashwani Sharma':     '9217710686',
  'Rahool':             '9899546824',
  'Prashant':           '9289500953',
  'Ashish':             '9555666059',
  'Saransh Khera':      '8595594789'
};

// ═══════════════════════════════════════════════════════
// HIERARCHY — who sees what
// ═══════════════════════════════════════════════════════
// Top managers: get ALL notifications across entire system
const TOP_MANAGERS = ['Sahaj Dureja', 'Ashish'];

// Mid managers: get notifications for themselves + their team
const MID_MANAGERS = {
  'Apurv Nath':     ['Sushmita Roy'],
  'Sahaj Dureja':   ['Test Sahaj', 'Rupali Prasad'],
  'Saransh Khera':  ['Test Sahaj'],
};

// ═══════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════
function getPhone(name) {
  if (!name) return null;
  if (NAME_TO_PHONE[name]) return NAME_TO_PHONE[name];
  const lower = name.toLowerCase();
  for (const [k, v] of Object.entries(NAME_TO_PHONE)) {
    if (k.toLowerCase() === lower) return v;
  }
  return null;
}

function nameMatch(a, b) {
  if (!a || !b) return false;
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

// Get all people who should receive a notification for this property
// directRecipients: names who are directly relevant (e.g. field_exec, assigned_by)
function getRecipients(property, directRecipients) {
  const recipients = new Set();
  const involved = [
    property.assigned_by, property.field_exec, property.token_requested_by,
    ...directRecipients
  ].filter(Boolean);

  // 1. Direct recipients always get notified
  directRecipients.forEach(name => { if (name) recipients.add(name); });

  // 2. Top managers get everything
  TOP_MANAGERS.forEach(mgr => recipients.add(mgr));

  // 3. Mid managers get notified if any involved person is in their team
  for (const [mgr, team] of Object.entries(MID_MANAGERS)) {
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
    const phone = getPhone(name);
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
  return new Date(d + 'T00:00').toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
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

// ── Form 1: Visit Scheduled ──
// Direct: field_exec | Umbrella: top managers + mid managers if team involved
function notifyVisitScheduled(property) {
  const p = property;
  const bodyValues = [
    p.uid || '-',
    fmtDate(p.schedule_date),
    fmtTime(p.schedule_time),
    p.field_exec || '-',
    p.assigned_by || '-',
    p.society_name || '-',
    p.tower_no || '-',
    p.unit_no || '-',
  ];
  const recipients = getRecipients(p, [p.field_exec]);
  console.log(`WA: visit_scheduled | UID: ${p.uid} | To: ${recipients.join(', ')}`);
  return broadcastTemplate('visit_scheduled', bodyValues, recipients);
}

// ── Form 2: Visit Completed ──
// Direct: assigned_by | Umbrella: top + mid managers
function notifyVisitCompleted(property) {
  const p = property;
  const bodyValues = [
    p.uid || '-',
    p.society_name || '-',
    p.tower_no || '-',
    p.unit_no || '-',
    p.field_exec || '-',
    p.assigned_by || '-',
  ];
  const recipients = getRecipients(p, [p.assigned_by]);
  console.log(`WA: visit_completed_1v | UID: ${p.uid} | To: ${recipients.join(', ')}`);
  return broadcastTemplate('visit_completed_1v', bodyValues, recipients);
}

// ── Form 3: Token Request Submitted ──
// Direct: assigned_by + token_requested_by | Umbrella: top + mid managers
function notifyTokenRequest(property) {
  const p = property;
  const bodyValues = [
    p.uid || '-',
    p.society_name || '-',
    p.tower_no || '-',
    p.unit_no || '-',
    p.token_requested_by || '-',
    p.owner_broker_name || '-',
  ];
  const recipients = getRecipients(p, [p.assigned_by, p.token_requested_by]);
  console.log(`WA: token_request | UID: ${p.uid} | To: ${recipients.join(', ')}`);
  return broadcastTemplate('token_request', bodyValues, recipients);
}

// ── Reassign: Visit Re-assigned ──
// Direct: new field_exec + assigned_by | Umbrella: top + mid managers
function notifyVisitReassigned(property, newExec) {
  const p = property;
  const bodyValues = [
    p.uid || '-',
    fmtDate(p.schedule_date),
    fmtTime(p.schedule_time),
    newExec || '-',
    p.assigned_by || '-',
    p.society_name || '-',
    p.tower_no || '-',
    p.unit_no || '-',
  ];
  const recipients = getRecipients(p, [newExec, p.assigned_by]);
  console.log(`WA: visit_reassigned | UID: ${p.uid} | To: ${recipients.join(', ')}`);
  return broadcastTemplate('visit_reassigned', bodyValues, recipients);
}

// ── Cancel: Visit Cancelled ──
// Direct: assigned_by + field_exec | Umbrella: top + mid managers
function notifyVisitCancelled(property, cancelledBy) {
  const p = property;
  const bodyValues = [
    p.uid || '-',
    p.society_name || '-',
    p.tower_no || '-',
    p.unit_no || '-',
    cancelledBy || '-',
  ];
  const recipients = getRecipients(p, [p.assigned_by, p.field_exec]);
  console.log(`WA: visit_cancelled | UID: ${p.uid} | To: ${recipients.join(', ')}`);
  return broadcastTemplate('visit_cancelled', bodyValues, recipients);
}

module.exports = {
  sendInterakt, broadcastTemplate, getRecipients,
  notifyVisitScheduled, notifyVisitCompleted, notifyTokenRequest,
  notifyVisitReassigned, notifyVisitCancelled,
  NAME_TO_PHONE, TOP_MANAGERS, MID_MANAGERS
};