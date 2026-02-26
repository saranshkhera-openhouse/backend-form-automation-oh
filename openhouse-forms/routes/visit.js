const express = require('express');
const router = express.Router();

module.exports = function (pool) {

  router.post('/submit', async (req, res) => {
    try {
      const d = req.body;
      if (!d.uid || !d.uid.trim()) return res.status(400).json({ error: 'UID is required.' });
      const uid = d.uid.trim().toUpperCase();

      const ex = await pool.query('SELECT uid FROM properties WHERE uid=$1', [uid]);
      if (ex.rows.length) return res.status(400).json({ error: 'This UID already exists.' });

      await pool.query(`
        INSERT INTO properties (
          uid, source, demand_price, owner_broker_name, contact_no,
          city, locality, society_name, unit_no, floor, configuration, area_sqft,
          extra_area, bathrooms, balconies,
          gas_pipeline, possession_status, tentative_handover_date,
          club_facility, parking, sunlight, furnishing, furnishing_details,
          total_lifts, total_floors_tower, total_flats_floor,
          balcony_details,
          exit_facing,
          master_bedroom_balcony_facing, master_bedroom_balcony_view, master_bedroom_compass_link,
          second_bedroom_balcony_facing, second_bedroom_balcony_view, second_bedroom_compass_link,
          third_bedroom_balcony_facing, third_bedroom_balcony_view, third_bedroom_compass_link,
          kitchen_balcony_facing, kitchen_balcony_view,
          living_room_balcony1_facing, living_room_balcony1_view,
          living_room_balcony2_facing, living_room_balcony2_view,
          video_link, image_urls, visit_submitted_at
        ) VALUES (
          $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,
          $16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,
          $29,$30,$31,$32,$33,$34,$35,$36,$37,$38,$39,$40,$41,$42,$43,$44,$45,NOW()
        )
      `, [
        uid, d.source, parseFloat(d.demand_price)||null, d.owner_broker_name, d.contact_no,
        d.city, d.locality, d.society_name, d.unit_no, parseInt(d.floor)??null,
        d.configuration, parseFloat(d.area_sqft)||null, d.extra_area||'[]',
        parseInt(d.bathrooms)??null, parseInt(d.balconies)??null,
        d.gas_pipeline, d.possession_status, d.tentative_handover_date||null,
        d.club_facility, d.parking, parseInt(d.sunlight)||null,
        d.furnishing, d.furnishing_details||'[]',
        parseInt(d.total_lifts)??null, parseInt(d.total_floors_tower)??null,
        parseInt(d.total_flats_floor)??null, d.balcony_details||'[]',
        d.exit_facing||null,
        d.master_bedroom_balcony_facing||null, d.master_bedroom_balcony_view||null, d.master_bedroom_compass_link||null,
        d.second_bedroom_balcony_facing||null, d.second_bedroom_balcony_view||null, d.second_bedroom_compass_link||null,
        d.third_bedroom_balcony_facing||null, d.third_bedroom_balcony_view||null, d.third_bedroom_compass_link||null,
        d.kitchen_balcony_facing||null, d.kitchen_balcony_view||null,
        d.living_room_balcony1_facing||null, d.living_room_balcony1_view||null,
        d.living_room_balcony2_facing||null, d.living_room_balcony2_view||null,
        d.video_link||null, d.image_urls||'[]',
      ]);
      res.json({ success: true, uid });
    } catch (err) { console.error('Visit submit:', err); res.status(500).json({ error: err.message }); }
  });

  router.get('/uids', async (_, res) => {
    try {
      const { rows } = await pool.query(`SELECT uid,city,society_name,unit_no,owner_broker_name FROM properties WHERE visit_submitted_at IS NOT NULL ORDER BY created_at DESC`);
      res.json(rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  router.get('/property/:uid', async (req, res) => {
    try {
      const { rows } = await pool.query('SELECT * FROM properties WHERE uid=$1', [req.params.uid]);
      if (!rows.length) return res.status(404).json({ error: 'Not found' });
      res.json(rows[0]);
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  return router;
};
