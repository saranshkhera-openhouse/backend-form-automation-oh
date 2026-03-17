// WhatsApp notification via Periskope API
const { PeriskopeApi } = require('@periskope/periskope-client');

// Team name → WhatsApp number mapping (update with real numbers later)
const NAME_TO_PHONE = {
  'Akash Pandit':       '918595594789',
  'Deepak Mishra':      '918595594789',
  'Nisha':              '918595594789',
  'Ashwini':            '918003297088',
  'Prakhar Viash':      '918003297088',
  'Subham Singh Negi':  '918003297088',
  'Praveen Kumar':      '918595594789',
  'Shashank Kumar':     '918003297088',
  'Rupali Prasad':      '918003297088',
  'Sushmita Roy':       '918595594789',
};

function getClient() {
  const apiKey = process.env.PERISKOPE_API_KEY;
  const phone = process.env.PERISKOPE_PHONE_ID;
  if (!apiKey || !phone) return null;
  return new PeriskopeApi({ authToken: apiKey, phone });
}

function getPhone(name) {
  if (!name) return null;
  // Exact match first
  if (NAME_TO_PHONE[name]) return NAME_TO_PHONE[name];
  // Case-insensitive match
  const lower = name.toLowerCase();
  for (const [k, v] of Object.entries(NAME_TO_PHONE)) {
    if (k.toLowerCase() === lower) return v;
  }
  return null;
}

// Send WhatsApp message — never throws, just logs
async function sendWhatsApp(toName, message) {
  try {
    const client = getClient();
    if (!client) { console.log('WA: Periskope not configured, skipping'); return false; }
    const phone = getPhone(toName);
    if (!phone) { console.log(`WA: No phone number for "${toName}", skipping`); return false; }
    console.log(`WA: Sending to ${toName} (${phone})...`);
    const res = await client.message.send({ chat_id: phone, message });
    console.log(`WA: Sent to ${toName} — OK`);
    return true;
  } catch (e) {
    console.error(`WA: Failed to send to ${toName}:`, e.message || e);
    return false;
  }
}

// ── Notification templates ──

function notifyVisitScheduled(property) {
  const p = property;
  const owner = p.owner_broker_name || [p.first_name, p.last_name].filter(Boolean).join(' ') || 'Owner';
  const date = p.schedule_date ? new Date(p.schedule_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
  const time = p.schedule_time || '—';
  const msg = `🏠 *New Visit Scheduled*

*${p.uid}* — ${p.society_name || ''}
📍 ${[p.locality, p.city].filter(Boolean).join(', ')}
🏢 Tower ${p.tower_no || '—'} | Unit ${p.unit_no || '—'} | Floor ${p.floor || '—'}
📐 ${p.area_sqft || '—'} sqft | ${p.configuration || '—'}

👤 Owner: ${owner}
📞 ${p.contact_no || '—'}

📅 ${date} at ${time}
📝 Assigned by: ${p.assigned_by || '—'}

_Please complete the visit audit after the visit._`;

  return sendWhatsApp(p.field_exec, msg);
}

function notifyVisitCompleted(property) {
  const p = property;
  const msg = `✅ *Visit Completed*

*${p.uid}* — ${p.society_name || ''}
🏢 Tower ${p.tower_no || '—'} | Unit ${p.unit_no || '—'}
📐 ${p.area_sqft || '—'} sqft | ${p.configuration || '—'}

Completed by: ${p.field_exec || '—'}
${p.visit_remarks ? `📝 Remarks: ${p.visit_remarks}` : ''}
_Ready for Token Request._`;

  return sendWhatsApp(p.assigned_by, msg);
}

module.exports = { sendWhatsApp, notifyVisitScheduled, notifyVisitCompleted, NAME_TO_PHONE };
