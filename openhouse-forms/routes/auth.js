const express = require('express');
const passport = require('passport');
const router = express.Router();
const { isAuthenticated, isAdmin } = require('../middleware/auth');

module.exports = function(pool) {

  // ── Google OAuth — includes Gmail send scope ──
  router.get('/google', (req, res, next) => {
    if (req.query.returnTo) req.session.returnTo = req.query.returnTo;
    passport.authenticate('google', {
      scope: ['profile', 'email', 'https://www.googleapis.com/auth/gmail.send'],
      accessType: 'offline',
      prompt: 'consent'
    })(req, res, next);
  });

  router.get('/google/callback',
    passport.authenticate('google', { failureRedirect: '/login?error=failed' }),
    (req, res) => {
      const returnTo = req.session.returnTo || '/';
      delete req.session.returnTo;
      res.redirect(returnTo);
    }
  );

  // ── Logout ──
  router.get('/logout', (req, res) => {
    req.logout(() => {
      req.session.destroy(() => { res.redirect('/login'); });
    });
  });

  // ── Current user info ──
  router.get('/me', isAuthenticated, (req, res) => {
    const u = req.user;
    res.json({ email: u.email, name: u.name, allowed_forms: u.allowed_forms, is_admin: u.is_admin });
  });

  // ── Admin: list all users ──
  router.get('/users', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { rows } = await pool.query('SELECT id,email,name,allowed_forms,is_admin,is_active,created_at FROM users ORDER BY created_at DESC');
      res.json(rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  // ── Admin: add user ──
  router.post('/users', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { email, name, allowed_forms, is_admin } = req.body;
      if (!email) return res.status(400).json({ error: 'Email required' });
      const forms = allowed_forms || [];
      const { rows } = await pool.query(
        `INSERT INTO users(email,name,allowed_forms,is_admin) VALUES(LOWER($1),$2,$3,$4)
         ON CONFLICT(email) DO UPDATE SET name=$2,allowed_forms=$3,is_admin=$4,is_active=TRUE
         RETURNING id,email,name,allowed_forms,is_admin,is_active`,
        [email.trim(), name || '', forms, is_admin || false]
      );
      res.json(rows[0]);
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  // ── Admin: update user ──
  router.put('/users/:id', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { name, allowed_forms, is_admin, is_active } = req.body;
      const { rows } = await pool.query(
        `UPDATE users SET name=COALESCE($1,name),allowed_forms=COALESCE($2,allowed_forms),
         is_admin=COALESCE($3,is_admin),is_active=COALESCE($4,is_active) WHERE id=$5
         RETURNING id,email,name,allowed_forms,is_admin,is_active`,
        [name, allowed_forms, is_admin, is_active, req.params.id]
      );
      if (!rows.length) return res.status(404).json({ error: 'User not found' });
      res.json(rows[0]);
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  // ── Admin: delete user ──
  router.delete('/users/:id', isAuthenticated, isAdmin, async (req, res) => {
    try {
      await pool.query('DELETE FROM users WHERE id=$1', [req.params.id]);
      res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  return router;
};
