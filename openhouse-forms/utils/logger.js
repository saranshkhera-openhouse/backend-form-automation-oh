// Activity Logger — non-blocking, fire-and-forget
let _pool = null;
function init(pool) { _pool = pool; }

async function log(uid, action, category, actorEmail, actorName, details = {}) {
  if (!_pool) return;
  try {
    await _pool.query(
      `INSERT INTO activity_logs (uid, action, category, actor_email, actor_name, details)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [uid || null, action, category, actorEmail || null, actorName || null, JSON.stringify(details)]
    );
  } catch (e) { console.error('Logger error:', e.message); }
}

// ── Form Submissions ──
function logFormSubmit(uid, formName, formNumber, actorEmail, actorName, isDraft = false) {
  return log(uid, 'form_submit', 'form', actorEmail, actorName, { form: formName, form_number: formNumber, is_draft: isDraft });
}

// ── Assignment Changes ──
function logFieldChange(uid, field, oldVal, newVal, actorEmail, actorName, reason) {
  return log(uid, 'field_change', 'assignment', actorEmail, actorName, { field, old: oldVal || null, new: newVal || null, reason: reason || null });
}

// ── Emails Sent ──
function logEmailSent(uid, emailType, sender, toList, ccList, gmailId, subject) {
  const to = Array.isArray(toList) ? toList : (toList || '').split(',').map(e => e.trim()).filter(Boolean);
  const cc = Array.isArray(ccList) ? ccList : (ccList || '').split(',').map(e => e.trim()).filter(Boolean);
  return log(uid, 'email_sent', 'email', sender, null, { type: emailType, to, cc, gmail_id: gmailId || null, subject: subject || null });
}

// ── WhatsApp Notifications ──
function logWhatsApp(uid, templateName, recipients) {
  // recipients: [{name, phone, ok}]
  return log(uid, 'wa_sent', 'whatsapp', null, null, { template: templateName, recipients: recipients || [] });
}

// ── Status Changes ──
function logStatusChange(uid, field, oldVal, newVal, actorEmail, actorName) {
  return log(uid, 'status_change', 'status', actorEmail, actorName, { field, old: oldVal, new: newVal });
}

// ── Admin Edits ──
function logAdminEdit(uid, changes, actorEmail, actorName) {
  // changes: {field: {old, new}, ...}
  return log(uid, 'admin_edit', 'admin', actorEmail, actorName, { changes });
}

// ── Schedule Changes ──
function logScheduleChange(uid, changeType, details, actorEmail, actorName) {
  // changeType: 'reschedule', 'reassign', 'visit_cancelled'
  return log(uid, 'schedule_change', 'schedule', actorEmail, actorName, { type: changeType, ...details });
}

module.exports = { init, log, logFormSubmit, logFieldChange, logEmailSent, logWhatsApp, logStatusChange, logAdminEdit, logScheduleChange };
