const express = require('express');
const router = express.Router();

module.exports = function (pool) {

  // ── Generate UID ──
  router.get('/generate-uid', (req, res) => {
    const ts = Date.now().toString(36).toUpperCase();
    const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
    res.json({ uid: `OH-${ts}-${rand}` });
  });

  // ── Submit visit form ──
  router.post('/submit', async (req, res) => {
    try {
      const d = req.body;

      if (!d.uid) return res.status(400).json({ error: 'UID is required.' });

      // Check duplicate
      const existing = await pool.query('SELECT uid FROM properties WHERE uid = $1', [d.uid]);
      if (existing.rows.length > 0) {
        return res.status(400).json({ error: 'UID already exists. This visit has already been submitted.' });
      }

      await pool.query(`
        INSERT INTO properties (
          uid, source, demand_price, owner_first_name, owner_last_name,
          broker_first_name, broker_last_name, contact_no,
          city, locality, society_name,
          unit_no, floor, configuration, area_sqft, extra_area,
          bathrooms, balconies,
          gas_pipeline, possession_status, club_facility, parking,
          sunlight, furnishing, furnishing_details,
          total_lifts, total_floors_tower, total_flats_floor,
          exit_facing,
          master_bedroom_balcony_facing, master_bedroom_balcony_view, master_bedroom_compass_link,
          second_bedroom_balcony_facing, second_bedroom_balcony_view, second_bedroom_compass_link,
          third_bedroom_balcony_facing, third_bedroom_balcony_view, third_bedroom_compass_link,
          kitchen_balcony_facing, kitchen_balcony_view,
          living_room_balcony1_facing, living_room_balcony1_view,
          living_room_balcony2_facing, living_room_balcony2_view,
          video_link, visit_submitted_at
        ) VALUES (
          $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,
          $11,$12,$13,$14,$15,$16,$17,$18,$19,$20,
          $21,$22,$23,$24,$25,$26,$27,$28,$29,$30,
          $31,$32,$33,$34,$35,$36,$37,$38,$39,$40,
          $41,$42,$43,$44, NOW()
        )
      `, [
        d.uid, d.source, parseInt(d.demand_price) || null,
        d.owner_first_name, d.owner_last_name,
        d.broker_first_name || null, d.broker_last_name || null,
        d.contact_no,
        d.city, d.locality, d.society_name,
        d.unit_no, parseInt(d.floor) ?? null,
        d.configuration, parseFloat(d.area_sqft) || null,
        d.extra_area || '[]',
        parseInt(d.bathrooms) ?? null, parseInt(d.balconies) ?? null,
        d.gas_pipeline, d.possession_status, d.club_facility, d.parking,
        parseInt(d.sunlight) || null, d.furnishing, d.furnishing_details || '[]',
        parseInt(d.total_lifts) ?? null, parseInt(d.total_floors_tower) ?? null,
        parseInt(d.total_flats_floor) ?? null,
        d.exit_facing,
        d.master_bedroom_balcony_facing || null, d.master_bedroom_balcony_view || null,
        d.master_bedroom_compass_link || null,
        d.second_bedroom_balcony_facing || null, d.second_bedroom_balcony_view || null,
        d.second_bedroom_compass_link || null,
        d.third_bedroom_balcony_facing || null, d.third_bedroom_balcony_view || null,
        d.third_bedroom_compass_link || null,
        d.kitchen_balcony_facing || null, d.kitchen_balcony_view || null,
        d.living_room_balcony1_facing || null, d.living_room_balcony1_view || null,
        d.living_room_balcony2_facing || null, d.living_room_balcony2_view || null,
        d.video_link || null,
      ]);

      res.json({ success: true, uid: d.uid, message: 'Visit form submitted successfully.' });
    } catch (err) {
      console.error('Visit submit error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // ── List all UIDs (for token/listing form dropdowns) ──
  router.get('/uids', async (req, res) => {
    try {
      const { rows } = await pool.query(`
        SELECT uid, city, locality, society_name, unit_no,
               owner_first_name, owner_last_name
        FROM properties
        WHERE visit_submitted_at IS NOT NULL
        ORDER BY created_at DESC
      `);
      res.json(rows);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ── Get full property by UID ──
  router.get('/property/:uid', async (req, res) => {
    try {
      const { rows } = await pool.query('SELECT * FROM properties WHERE uid = $1', [req.params.uid]);
      if (rows.length === 0) return res.status(404).json({ error: 'Property not found' });
      res.json(rows[0]);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  return router;
};
