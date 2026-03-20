// ── Row-level visibility: who can see which properties ──

// Email → display name(s) as used in assigned_by / field_exec / token_requested_by
const EMAIL_TO_NAMES = {
  'sahaj.dureja@openhouse.in': ['Sahaj Dureja'],
  'saransh.khera@openhouse.in': ['Saransh Khera'],
  'ashish@openhouse.in': ['Ashish'],
  'sushmita.roy@openhouse.in': ['Sushmita Roy'],
  'arti.ahirwar@openhouse.in': ['Arti Ahirwar'],
  'abhishek.rathore@openhouse.in': ['Abhishek Rathore'],
  'animesh.singh@openhouse.in': ['Animesh Singh'],
  'apurv.nath@openhouse.in': ['Apurv Nath'],
  'kavita.rawat@openhouse.in': ['Kavita Rawat'],
  'prashant@openhouse.in': ['Prashant'],
  'rahool@openhouse.in': ['Rahool'],
  'rupali.prasad@openhouse.in': ['Rupali Prasad'],
  'saurabh@openhouse.in': ['Saurabh'],
  'shashank.kumar@openhouse.in': ['Shashank Kumar'],
  'sahil.singh@openhouse.in': ['Sahil Singh'],
  'rahul.sheel@openhouse.in': ['Rahul Sheel'],
  'rahul.singh@openhouse.in': ['Rahul Singh'],
  'praveen.kumar@openhouse.in': ['Praveen Kumar'],
  'nishant.kumar@openhouse.in': ['Nishant Kumar'],
  'ankit@openhouse.in': ['Ankit'],
  'vaibhav.dwivedi@openhouse.in': ['Vaibhav Dwivedi'],
  'aman.dixit@openhouse.in': ['Aman Dixit'],
  'durejasahaj@gmail.com': ['Testing_Sahaj'],
  'deepak.mishra@openhoue.in':['Deepak Mishra'],
  'nisha.deewan@openhouse.in':['Nisha Deewan'],
  'ashwani.sharma@openhouse.in':['Ashwani Sharma']
};

// Manager email → array of team member display names
const TEAMS = {
  
  'abhishek.rathore@openhouse.in' : ['Aman Dixit','Arti Ahirwar','Kavita Rawat','Sahil Singh'],
  'animesh.singh@openhouse.in': ['Nishant Kumar','Rahul Sheel','Sushmita Roy'],
  'sahaj.dureja@openhouse.in': ['Aman Dixit','Arti Ahirwar','Kavita Rawat','Sahil Singh']
};

/**
 * Get array of display names whose records this user can see.
 * Returns null if admin (meaning: see everything, no filter).
 * Returns string[] of names otherwise.
 */
function getVisibleNames(user) {
  if (!user) return [];
  // Admins see everything
  if (user.is_admin) return null;

  const email = (user.email || '').toLowerCase();
  const names = new Set();

  // Add own name(s)
  const own = EMAIL_TO_NAMES[email];
  if (own) own.forEach(n => names.add(n));

  // Also add user.name from Google profile as fallback
  if (user.name) names.add(user.name);

  // If manager, add team members' names
  const team = TEAMS[email];
  if (team) team.forEach(n => names.add(n));

  return [...names];
}

/**
 * Build a SQL WHERE clause + params for visibility filtering.
 * Call with existing param count to get correct $N numbering.
 * 
 * Returns { clause: string, params: string[] } or { clause: '', params: [] } for admins.
 * 
 * Usage:
 *   const vis = visibilityFilter(req.user, existingParams.length);
 *   const sql = `SELECT ... FROM properties WHERE some_condition ${vis.clause}`;
 *   const params = [...existingParams, ...vis.params];
 */
function visibilityFilter(user, paramOffset = 0) {
  const names = getVisibleNames(user);
  // null = admin, see all
  if (names === null) return { clause: '', params: [] };
  // Empty names = user not in map, sees nothing
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
module.exports = { EMAIL_TO_NAMES, TEAMS, getVisibleNames, visibilityFilter, uidFilter };