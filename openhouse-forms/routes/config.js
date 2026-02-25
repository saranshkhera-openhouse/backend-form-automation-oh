const express = require('express');
const router = express.Router();

module.exports = function (pool) {

  // ── Form dropdown options (static) ──
  const FORM_OPTIONS = {
    sources: ["CP", "DIRECT"],
    configurations: ["2 BHK", "2.5 BHK", "3 BHK", "3.5 BHK", "4 BHK"],
    extraAreas: ["Basement", "Lawn", "Terrace", "Servant Room", "Store Room", "Study Room", "Pooja Room", "No Extra Room"],
    possessionStatuses: ["Owner Staying", "Tenant", "Vacant"],
    parkingOptions: ["1 Open", "1 Closed", "2 Open", "2 Closed", "1 Open + 1 Closed", "No Parking"],
    furnishingLevels: ["Unfurnished", "Semi-Furnished", "Fully Furnished"],
    furnishingDetails: ["Lights", "Fans", "Modular Kitchen", "Chimney", "Almirahs", "ACs", "Geysers", "No Items"],
    directions: ["North", "South", "East", "West", "North-East", "North-West", "South-East", "South-West"],
    balconyViews: ["Road", "Club", "Garden", "Park", "Pool", "Open Area", "Other Building"],
    yesNo: ["Yes", "No"],
  };

  // GET /api/config — all static dropdown options
  router.get('/', (req, res) => {
    res.json({ options: FORM_OPTIONS });
  });

  // GET /api/config/cities — distinct cities from DB
  router.get('/cities', async (req, res) => {
    try {
      const { rows } = await pool.query(
        'SELECT DISTINCT city FROM master_societies ORDER BY city'
      );
      res.json(rows.map(r => r.city));
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // GET /api/config/societies?city=Gurgaon — societies for a city
  router.get('/societies', async (req, res) => {
    try {
      const { city } = req.query;
      if (!city) return res.status(400).json({ error: 'city is required' });

      const { rows } = await pool.query(
        'SELECT society_name FROM master_societies WHERE city = $1 ORDER BY society_name',
        [city]
      );

      res.json(rows.map(r => r.society_name));
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // GET /api/config/locality-by-society?city=Gurgaon&society=ABC Residency
  router.get('/locality-by-society', async (req, res) => {
    try {
      const { city, society } = req.query;
      if (!city || !society) {
        return res.status(400).json({ error: 'city and society are required' });
      }

      const { rows } = await pool.query(
        'SELECT locality FROM master_societies WHERE city = $1 AND society_name = $2 LIMIT 1',
        [city, society]
      );

      if (rows.length === 0) {
        return res.status(404).json({ error: 'Society not found' });
      }

      res.json({ locality: rows[0].locality });

    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });



  // // GET /api/config/localities?city=Gurgaon — localities for a city
  // router.get('/localities', async (req, res) => {
  //   try {
  //     const { city } = req.query;
  //     if (!city) return res.status(400).json({ error: 'city is required' });

  //     const { rows } = await pool.query(
  //       'SELECT DISTINCT locality FROM master_societies WHERE city = $1 ORDER BY locality',
  //       [city]
  //     );
  //     res.json(rows.map(r => r.locality));
  //   } catch (err) {
  //     res.status(500).json({ error: err.message });
  //   }
  // });

  // // GET /api/config/societies?city=Gurgaon&locality=Sector 104 — societies for a city+locality
  // router.get('/societies', async (req, res) => {
  //   try {
  //     const { city, locality } = req.query;
  //     if (!city || !locality) return res.status(400).json({ error: 'city and locality are required' });

  //     const { rows } = await pool.query(
  //       'SELECT society_name FROM master_societies WHERE city = $1 AND locality = $2 ORDER BY society_name',
  //       [city, locality]
  //     );
  //     res.json(rows.map(r => r.society_name));
  //   } catch (err) {
  //     res.status(500).json({ error: err.message });
  //   }
  // });

  return router;
};
