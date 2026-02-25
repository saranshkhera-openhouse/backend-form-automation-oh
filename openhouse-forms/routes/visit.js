const express = require('express');
const router = express.Router();

module.exports = function (pool) {

  // ── Submit visit form ──
  router.post('/submit', async (req, res) => {
    try {
      const d = req.body;

      if (!d.uid || !d.uid.trim()) {
        return res.status(400).json({ error: 'UID is required.' });
      }

      const uid = d.uid.trim().toUpperCase();

      // Check duplicate
      const existing = await pool.query('SELECT uid FROM properties WHERE uid = $1', [uid]);
      if (existing.rows.length > 0) {
        return res.status(400).json({ error: 'This UID already exists. Please use a different UID.' });
      }

      // 42 parameterized columns + visit_submitted_at = NOW()
      await pool.query(`
        INSERT INTO properties (
          uid, source, demand_price, owner_broker_name, contact_no,
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
          video_link,
          visit_submitted_at
        ) VALUES (
          $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,
          $11,$12,$13,$14,$15,$16,$17,$18,$19,$20,
          $21,$22,$23,$24,$25,$26,$27,$28,$29,$30,
          $31,$32,$33,$34,$35,$36,$37,$38,$39,$40,
          $41,$42,
          NOW()
        )
      `, [
        uid,                                                          // $1
        d.source,                                                     // $2
        parseFloat(d.demand_price) || null,                           // $3
        d.owner_broker_name || null,                                  // $4
        d.contact_no || null,                                         // $5
        d.city,                                                       // $6
        d.locality,                                                   // $7
        d.society_name,                                               // $8
        d.unit_no,                                                    // $9
        parseInt(d.floor) ?? null,                                    // $10
        d.configuration,                                              // $11
        parseFloat(d.area_sqft) || null,                              // $12
        d.extra_area || '[]',                                         // $13
        parseInt(d.bathrooms) ?? null,                                // $14
        parseInt(d.balconies) ?? null,                                // $15
        d.gas_pipeline,                                               // $16
        d.possession_status,                                          // $17
        d.club_facility,                                              // $18
        d.parking,                                                    // $19
        parseInt(d.sunlight) || null,                                 // $20
        d.furnishing,                                                 // $21
        d.furnishing_details || '[]',                                 // $22
        parseInt(d.total_lifts) ?? null,                              // $23
        parseInt(d.total_floors_tower) ?? null,                       // $24
        parseInt(d.total_flats_floor) ?? null,                        // $25
        d.exit_facing || null,                                        // $26
        d.master_bedroom_balcony_facing || null,                      // $27
        d.master_bedroom_balcony_view || null,                        // $28
        d.master_bedroom_compass_link || null,                        // $29
        d.second_bedroom_balcony_facing || null,                      // $30
        d.second_bedroom_balcony_view || null,                        // $31
        d.second_bedroom_compass_link || null,                        // $32
        d.third_bedroom_balcony_facing || null,                       // $33
        d.third_bedroom_balcony_view || null,                         // $34
        d.third_bedroom_compass_link || null,                         // $35
        d.kitchen_balcony_facing || null,                             // $36
        d.kitchen_balcony_view || null,                               // $37
        d.living_room_balcony1_facing || null,                        // $38
        d.living_room_balcony1_view || null,                          // $39
        d.living_room_balcony2_facing || null,                        // $40
        d.living_room_balcony2_view || null,                          // $41
        d.video_link || null,                                         // $42
      ]);

      res.json({ success: true, uid, message: 'Visit form submitted successfully.' });
    } catch (err) {
      console.error('Visit submit error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // ── List all UIDs ──
  router.get('/uids', async (req, res) => {
    try {
      const { rows } = await pool.query(`
        SELECT uid, city, locality, society_name, unit_no, owner_broker_name
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
