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

// ── Form Submissions — action = form name ──
function logFormSubmit(uid, action, formNumber, actorEmail, actorName, isDraft = false) {
  return log(uid, action, 'form', actorEmail, actorName, { form_number: formNumber, is_draft: isDraft });
}

// ── Emails — action = email type ──
function logEmailSent(uid, action, sender, toList, ccList, gmailId, subject) {
  const to = Array.isArray(toList) ? toList : (toList || '').split(',').map(e => e.trim()).filter(Boolean);
  const cc = Array.isArray(ccList) ? ccList : (ccList || '').split(',').map(e => e.trim()).filter(Boolean);
  return log(uid, action, 'email', sender, null, { to, cc, gmail_id: gmailId || null, subject: subject || null });
}

// ── Status — action = specific status name ──
function logStatusChange(uid, action, oldVal, newVal, actorEmail, actorName) {
  return log(uid, action, 'status', actorEmail, actorName, { old: oldVal, new: newVal });
}

// ── Assignment — action = specific change name ──
function logAssignment(uid, action, oldVal, newVal, actorEmail, actorName, source) {
  return log(uid, action, 'assignment', actorEmail, actorName, { old: oldVal || null, new: newVal || null, source: source || null });
}

// ── Schedule — action = reschedule/reassign ──
function logScheduleChange(uid, action, details, actorEmail, actorName) {
  return log(uid, action, 'schedule', actorEmail, actorName, details);
}

// ── Admin Edits ──
function logAdminEdit(uid, changes, actorEmail, actorName) {
  return log(uid, 'admin_edit', 'admin', actorEmail, actorName, { changes });
}

module.exports = { init, log, logFormSubmit, logEmailSent, logStatusChange, logAssignment, logScheduleChange, logAdminEdit };
