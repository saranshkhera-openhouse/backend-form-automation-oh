const express = require('express');
const router = express.Router();
const { generateTokenPDF } = require('../utils/pdf-generator');

module.exports = function (pool) {

  router.get('/prefill/:uid', async (req, res) => {
    try {
      const { rows } = await pool.query('SELECT * FROM properties WHERE uid=$1', [req.params.uid]);
      if (!rows.length) return res.status(404).json({ error: 'UID not found.' });
      const p = rows[0];
      if (!p.token_submitted_at && !p.token_is_draft)
        return res.status(400).json({ error: 'Token Request Form must be submitted first.' });
      res.json(p);
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  router.get('/uids', async (_, res) => {
    try {
      const { rows } = await pool.query(`
        SELECT uid, city, society_name, unit_no, owner_broker_name,
               token_submitted_at, token_is_draft, final_submitted_at
        FROM properties WHERE token_submitted_at IS NOT NULL OR token_is_draft=TRUE
        ORDER BY updated_at DESC
      `);
      res.json(rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  router.post('/submit', async (req, res) => {
    try {
      const d = req.body;
      const { rows } = await pool.query('SELECT uid FROM properties WHERE uid=$1', [d.uid]);
      if (!rows.length) return res.status(404).json({ error: 'UID not found.' });

      const missing = [];
      if (!d.bank_account_number) missing.push('Bank A/C Number');
      if (!d.bank_name) missing.push('Bank Name');
      if (!d.ifsc_code) missing.push('IFSC Code');
      if (!d.token_paid) missing.push('Token Paid');
      if (!d.token_transfer_date) missing.push('Transfer Date');
      if (!d.neft_reference) missing.push('NEFT Reference');
      if (!d.registry_status) missing.push('Registry Status');
      if (!d.occupancy_status) missing.push('Occupancy Status');
      if (!d.papers_available) missing.push('Papers Available');
      if (missing.length) return res.status(400).json({ error: `Missing required fields: ${missing.join(', ')}`, missing });

      await pool.query(`
        UPDATE properties SET
          co_owner=$1, registry_status=$2, occupancy_status=$3, inclusions=$4,
          guaranteed_sale_price=$5, performance_guarantee=$6, full_registry_willingness=$7,
          initial_period=$8, grace_period=$9, rent_payable_period=$10, rent_payable_grace_period=$11,
          outstanding_loan=$12, bank_name_loan=$13, loan_account_number=$14,
          loan_pay_willingness=$15, papers_available=$16, documents_available=$17,
          token_remarks=$18, bank_account_number=$19, bank_name=$20, ifsc_code=$21,
          token_paid=$22, token_transfer_date=$23, neft_reference=$24,
          token_is_draft=FALSE, final_submitted_at=NOW(), updated_at=NOW()
        WHERE uid=$25
      `, [
        d.co_owner||null, d.registry_status, d.occupancy_status, d.inclusions||null,
        parseFloat(d.guaranteed_sale_price)||null, parseFloat(d.performance_guarantee)||null,
        d.full_registry_willingness||null, parseInt(d.initial_period)||null, parseInt(d.grace_period)||null,
        d.rent_payable_period||null, d.rent_payable_grace_period||null,
        parseFloat(d.outstanding_loan)||null, d.bank_name_loan||null, d.loan_account_number||null,
        d.loan_pay_willingness||null, d.papers_available, d.documents_available||null,
        d.token_remarks||null, d.bank_account_number, d.bank_name, d.ifsc_code,
        parseFloat(d.token_paid)||null, d.token_transfer_date, d.neft_reference, d.uid,
      ]);
      res.json({ success: true, uid: d.uid });
    } catch (e) { console.error('Final submit:', e); res.status(500).json({ error: e.message }); }
  });

  // PDF - inline preview (not download)
  router.get('/pdf/:uid', async (req, res) => {
    try {
      const { rows } = await pool.query('SELECT * FROM properties WHERE uid=$1', [req.params.uid]);
      if (!rows.length) return res.status(404).json({ error: 'Not found' });
      if (!rows[0].final_submitted_at) return res.status(400).json({ error: 'Final form must be submitted first.' });
      const buf = await generateTokenPDF(rows[0]);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename=Token_${rows[0].uid}.pdf`);
      res.send(buf);
    } catch (e) { console.error('PDF:', e); res.status(500).json({ error: 'PDF generation failed' }); }
  });

  return router;
};
