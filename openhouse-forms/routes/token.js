const express = require('express');
const router = express.Router();
const { generateTokenPDF } = require('../utils/pdf-generator');

module.exports = function (pool) {

  router.get('/prefill/:uid', async (req, res) => {
    try {
      const { rows } = await pool.query(`
        SELECT uid, city, locality, society_name,
               owner_broker_name,
               unit_no, floor, configuration, area_sqft,
               possession_status
        FROM properties WHERE uid = $1
      `, [req.params.uid]);
      if (rows.length === 0) return res.status(404).json({ error: 'UID not found.' });
      res.json(rows[0]);
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  router.post('/submit', async (req, res) => {
    try {
      const d = req.body;
      const { rows } = await pool.query('SELECT uid FROM properties WHERE uid = $1', [d.uid]);
      if (rows.length === 0) return res.status(404).json({ error: 'UID not found.' });

      await pool.query(`
        UPDATE properties SET
          co_owner = $1, registry_status = $2, occupancy_status = $3,
          inclusions = $4, guaranteed_sale_price = $5, performance_guarantee = $6,
          full_registry_willingness = $7, initial_period = $8, grace_period = $9,
          rent_payable_period = $10, rent_payable_grace_period = $11,
          outstanding_loan = $12, bank_name_loan = $13, loan_account_number = $14,
          loan_pay_willingness = $15, papers_available = $16, documents_available = $17,
          bank_account_number = $18, bank_name = $19, ifsc_code = $20,
          token_paid = $21, token_transfer_date = $22, neft_reference = $23,
          token_remarks = $24, token_submitted_at = NOW(), updated_at = NOW()
        WHERE uid = $25
      `, [
        d.co_owner || null, d.registry_status, d.occupancy_status,
        d.inclusions || null, parseFloat(d.guaranteed_sale_price) || null,
        parseFloat(d.performance_guarantee) || null, d.full_registry_willingness,
        parseInt(d.initial_period) || null, parseInt(d.grace_period) || null,
        d.rent_payable_period || null, d.rent_payable_grace_period || null,
        parseFloat(d.outstanding_loan) || null, d.bank_name_loan || null,
        d.loan_account_number || null, d.loan_pay_willingness || null,
        d.papers_available, d.documents_available || null,
        d.bank_account_number, d.bank_name, d.ifsc_code,
        parseFloat(d.token_paid) || null, d.token_transfer_date || null,
        d.neft_reference, d.token_remarks || null, d.uid,
      ]);

      res.json({ success: true, uid: d.uid });
    } catch (err) {
      console.error('Token submit error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  router.get('/pdf/:uid', async (req, res) => {
    try {
      const { rows } = await pool.query('SELECT * FROM properties WHERE uid = $1', [req.params.uid]);
      if (rows.length === 0) return res.status(404).json({ error: 'Not found' });
      const pdfBuffer = await generateTokenPDF(rows[0]);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=Token_${rows[0].uid}.pdf`);
      res.send(pdfBuffer);
    } catch (err) {
      console.error('PDF error:', err);
      res.status(500).json({ error: 'PDF generation failed' });
    }
  });

  return router;
};
