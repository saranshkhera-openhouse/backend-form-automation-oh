// WhatsApp notification via Interakt API (Official WhatsApp Business API)
const https = require('https');

// Team name → phone number mapping (10 digits, no country code)
const NAME_TO_PHONE = {
  'Akash Pandit':       '8595594789',
  'Deepak Mishra':      '8130724002',
  'Nisha':              '9211599292',
  'Ashwini':            '',
  'Prakhar Viash':      '',
  'Subham Singh Negi':  '',
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
};

function getPhone(name) {
  if (!name) return null;
  if (NAME_TO_PHONE[name]) return NAME_TO_PHONE[name];
  const lower = name.toLowerCase();
  for (const [k, v] of Object.entries(NAME_TO_PHONE)) {
    if (k.toLowerCase() === lower) return v;
  }
  return null;
}

// Send template message via Interakt REST API
function sendInterakt(phone, templateName, bodyValues) {
  return new Promise((resolve, reject) => {
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

    console.log(`WA: Sending ${templateName} to ${phone}...`);

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
        console.log(`WA: Response [${res.statusCode}]: ${data}`);
        if (res.statusCode === 200) resolve(true);
        else resolve(false);
      });
    });
    req.on('error', e => { console.error('WA: Request error:', e.message); resolve(false); });
    req.write(payload);
    req.end();
  });
}

// ── Notification: Visit Scheduled (Form 1 → notify field_exec) ──
function notifyVisitScheduled(property) {
  const p = property;
  const phone = getPhone(p.field_exec);
  if (!phone) { console.log(`WA: No phone for field_exec "${p.field_exec}"`); return Promise.resolve(false); }

  const date = p.schedule_date ? new Date(p.schedule_date + 'T00:00').toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';
  const time = p.schedule_time ? ((h, m) => { const hr = parseInt(h); return `${hr === 0 ? 12 : hr > 12 ? hr - 12 : hr}:${m} ${hr >= 12 ? 'PM' : 'AM'}`; })(...p.schedule_time.split(':')) : '-';

  const bodyValues = [
    p.uid || '-',                    // {{1}} UID
    date,                            // {{2}} Date
    time,                            // {{3}} Time
    p.field_exec || '-',             // {{4}} Assigned To
    p.assigned_by || '-',            // {{5}} Assigned By
    p.society_name || '-',           // {{6}} Society
    p.tower_no || '-',               // {{7}} Tower
    p.unit_no || '-',                // {{8}} Unit
  ];

  console.log(`WA: visit_scheduled → ${p.field_exec} (${phone}) | UID: ${p.uid}`);
  return sendInterakt(phone, 'visit_scheduled', bodyValues);
}

// ── Notification: Visit Completed (Form 2 → notify assigned_by) ──
function notifyVisitCompleted(property) {
  const p = property;
  const phone = getPhone(p.assigned_by);
  if (!phone) { console.log(`WA: No phone for assigned_by "${p.assigned_by}"`); return Promise.resolve(false); }

  const bodyValues = [
    p.uid || '-',                    // {{1}} UID
    p.society_name || '-',           // {{2}} Society
    p.tower_no || '-',               // {{3}} Tower
    p.unit_no || '-',                // {{4}} Unit
    p.field_exec || '-',             // {{5}} Completed By
    p.assigned_by || '-',            // {{6}} Assigned By
  ];

  console.log(`WA: visit_completed_1v → ${p.assigned_by} (${phone}) | UID: ${p.uid}`);
  return sendInterakt(phone, 'visit_completed_1v', bodyValues);
}

// ── Notification: Visit Reassigned (notify NEW field_exec) ──
function notifyVisitReassigned(property, newExec) {
  const p = property;
  const phone = getPhone(newExec);
  if (!phone) { console.log(`WA: No phone for new exec "${newExec}"`); return Promise.resolve(false); }

  const date = p.schedule_date ? new Date(p.schedule_date + 'T00:00').toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';
  const time = p.schedule_time ? ((h, m) => { const hr = parseInt(h); return `${hr === 0 ? 12 : hr > 12 ? hr - 12 : hr}:${m} ${hr >= 12 ? 'PM' : 'AM'}`; })(...p.schedule_time.split(':')) : '-';

  const bodyValues = [
    p.uid || '-',                    // {{1}} UID
    date,                            // {{2}} Date
    time,                            // {{3}} Time
    newExec || '-',                  // {{4}} New Assigned To
    p.assigned_by || '-',            // {{5}} Assigned By
    p.society_name || '-',           // {{6}} Society
    p.tower_no || '-',               // {{7}} Tower
    p.unit_no || '-',                // {{8}} Unit
  ];

  console.log(`WA: visit_reassigned → ${newExec} (${phone}) | UID: ${p.uid}`);
  return sendInterakt(phone, 'visit_reassigned', bodyValues);
}

// ── Notification: Visit Cancelled (notify assigned_by) ──
function notifyVisitCancelled(property, cancelledBy) {
  const p = property;
  const phone = getPhone(p.assigned_by);
  if (!phone) { console.log(`WA: No phone for assigned_by "${p.assigned_by}"`); return Promise.resolve(false); }

  const bodyValues = [
    p.uid || '-',                    // {{1}} UID
    p.society_name || '-',           // {{2}} Society
    p.tower_no || '-',               // {{3}} Tower
    p.unit_no || '-',                // {{4}} Unit
    cancelledBy || '-',              // {{5}} Cancelled by
  ];

  console.log(`WA: visit_cancelled → ${p.assigned_by} (${phone}) | UID: ${p.uid}`);
  return sendInterakt(phone, 'visit_cancelled', bodyValues);
}

module.exports = { sendInterakt, notifyVisitScheduled, notifyVisitCompleted, notifyVisitReassigned, notifyVisitCancelled, NAME_TO_PHONE };