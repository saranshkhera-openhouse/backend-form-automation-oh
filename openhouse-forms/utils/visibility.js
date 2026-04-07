// ── Row-level visibility: who can see which properties ──
// All data now comes from the users table (no hardcoded maps)

/**
 * Get array of display names whose records this user can see.
 * Returns null if admin (meaning: see everything, no filter).
 * Returns string[] of names otherwise.
 */
function getVisibleNames(user) {
  if (!user) return [];
  if (user.is_admin) return null;

  const names = new Set();

  // Add own name from Google profile
  if (user.name) names.add(user.name);

  // If manager, add team members' names from managed_team JSONB
  if (user.is_manager) {
    const team = typeof user.managed_team === 'string'
      ? JSON.parse(user.managed_team || '[]')
      : user.managed_team || [];
    team.forEach(n => names.add(n));
  }

  return [...names];
}

/**
 * Build a SQL WHERE clause + params for visibility filtering.
 */
function visibilityFilter(user, paramOffset = 0) {
  const names = getVisibleNames(user);
  if (names === null) return { clause: '', params: [] };
  if (!names.length) return { clause: ' AND FALSE', params: [] };

  const idx = paramOffset + 1;
  return {
    clause: ` AND (assigned_by = ANY($${idx}) OR field_exec = ANY($${idx}) OR token_requested_by = ANY($${idx}))`,
    params: [names]
  };
}

function uidFilter(user, paramOffset = 0) {
  const vis = visibilityFilter(user, paramOffset);
  return { clause: ' AND (is_dead IS NOT TRUE)' + vis.clause, params: vis.params };
}

module.exports = { getVisibleNames, visibilityFilter, uidFilter };