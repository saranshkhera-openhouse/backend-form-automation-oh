const express = require('express');
const router = express.Router();

module.exports = function (pool) {

  router.get('/prefill/:uid', async (req, res) => {
    try {
      const { rows } = await pool.query('SELECT * FROM properties WHERE uid=$1', [req.params.uid]);
      if (!rows.length) return res.status(404).json({ error: 'UID not found.' });
      res.json(rows[0]);
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  // Submit or save draft
  router.post('/submit', async (req, res) => {
    try {
      const d = req.body;
      const isDraft = d.is_draft === true || d.is_draft === 'true';
      const { rows } = await pool.query('SELECT uid FROM properties WHERE uid=$1', [d.uid]);
      if (!rows.length) return res.status(404).json({ error: 'UID not found.' });

      await pool.query(`
        UPDATE properties SET
          co_owner=$1, registry_status=$2, occupancy_status=$3, inclusions=$4,
          guaranteed_sale_price=$5, performance_guarantee=$6, full_registry_willingness=$7,
          initial_period=$8, grace_period=$9, rent_payable_period=$10, rent_payable_grace_period=$11,
          outstanding_loan=$12, bank_name_loan=$13, loan_account_number=$14,
          loan_pay_willingness=$15, papers_available=$16, documents_available=$17,
          token_remarks=$18, token_is_draft=$19,
          token_submitted_at = CASE WHEN $19=FALSE THEN NOW() ELSE token_submitted_at END,
          updated_at=NOW()
        WHERE uid=$20
      `, [
        d.co_owner||null, d.registry_status||null, d.occupancy_status||null, d.inclusions||null,
        parseFloat(d.guaranteed_sale_price)||null, parseFloat(d.performance_guarantee)||null,
        d.full_registry_willingness||null, parseInt(d.initial_period)||null, parseInt(d.grace_period)||null,
        d.rent_payable_period||null, d.rent_payable_grace_period||null,
        parseFloat(d.outstanding_loan)||null, d.bank_name_loan||null, d.loan_account_number||null,
        d.loan_pay_willingness||null, d.papers_available||null, d.documents_available||null,
        d.token_remarks||null, isDraft, d.uid,
      ]);
      res.json({ success: true, uid: d.uid, draft: isDraft });
    } catch (e) { console.error('Token request:', e); res.status(500).json({ error: e.message }); }
  });

  return router;
};
