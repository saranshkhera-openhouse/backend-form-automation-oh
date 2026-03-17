// WhatsApp notification via Interakt API (Official WhatsApp Business API)
const https = require('https');

// Team name → phone number mapping (10 digits, no country code)
const NAME_TO_PHONE = {
  'Akash Pandit':       '8595594789',
  'Deepak Mishra':      '8595594789',
  'Nisha':              '8595594789',
  'Ashwini':            '8003297088',
  'Prakhar Viash':      '8003297088',
  'Subham Singh Negi':  '8003297088',
  'Praveen Kumar':      '8595594789',
  'Shashank Kumar':     '8003297088',
  'Rupali Prasad':      '8003297088',
  'Sushmita Roy':       '8595594789',
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
  const location = [p.locality, p.city].filter(Boolean).join(', ') || '-';
  const owner = p.owner_broker_name || [p.first_name, p.last_name].filter(Boolean).join(' ') || '-';

  const bodyValues = [
    p.uid || '-',                    // {{1}} UID
    date,                            // {{2}} Date
    time,                            // {{3}} Time
    p.field_exec || '-',             // {{4}} Assigned To
    p.assigned_by || '-',            // {{5}} Assigned By
    p.society_name || '-',           // {{6}} Society
    location,                        // {{7}} Locality, City
    p.tower_no || '-',               // {{8}} Tower
    p.unit_no || '-',                // {{9}} Unit
    owner,                           // {{10}} Owner/CP
    p.contact_no || '-',             // {{11}} Phone
  ];

  console.log(`WA: visit_scheduled → ${p.field_exec} (${phone}) | UID: ${p.uid}`);
  return sendInterakt(phone, 'visit_scheduled', bodyValues);
}

// ── Notification: Visit Completed (Form 2 → notify assigned_by) ──
function notifyVisitCompleted(property) {
  const p = property;
  const phone = getPhone(p.assigned_by);
  if (!phone) { console.log(`WA: No phone for assigned_by "${p.assigned_by}"`); return Promise.resolve(false); }

  const location = [p.locality, p.city].filter(Boolean).join(', ') || '-';

  const bodyValues = [
    p.uid || '-',                    // {{1}} UID
    p.society_name || '-',           // {{2}} Society
    location,                        // {{3}} Locality, City
    p.tower_no || '-',               // {{4}} Tower
    p.unit_no || '-',                // {{5}} Unit
    p.field_exec || '-',             // {{6}} Completed By
    p.assigned_by || '-',            // {{7}} Assigned By
  ];

  console.log(`WA: visit_completed_1v → ${p.assigned_by} (${phone}) | UID: ${p.uid}`);
  return sendInterakt(phone, 'visit_completed_1v', bodyValues);
}

module.exports = { sendInterakt, notifyVisitScheduled, notifyVisitCompleted, NAME_TO_PHONE };