const express = require('express');
const router = express.Router();

module.exports = function (pool) {
  const OPT = {
    sources: ["CP", "DIRECT"],
    configurations: ["2 BHK", "2.5 BHK", "3 BHK", "3.5 BHK", "4 BHK"],
    extraAreas: ["Basement", "Lawn", "Terrace", "Servant Room", "Store Room", "Study Room", "Pooja Room", "No Extra Room"],
    possessionStatuses: ["Owner Staying", "Tenant", "Vacant"],
    parkingOptions: ["1 Open", "1 Closed", "2 Open", "2 Closed", "1 Open + 1 Closed", "No Parking"],
    furnishingLevels: ["Unfurnished", "Semi-Furnished", "Fully Furnished"],
    furnishingDetails: ["Lights", "Fans", "Modular Kitchen", "Chimney", "Almirahs", "ACs", "Geysers", "No Items"],
    directions: ["North", "South", "East", "West", "North-East", "North-West", "South-East", "South-West"],
    balconyViews: ["Road", "Club", "Garden", "Park", "Pool", "Open Area", "Other Building"],
    balconyTypes: ["Open", "Covered", "Semi-Covered", "Utility"],
    yesNo: ["Yes", "No"],
  };

  router.get('/', (_, res) => res.json({ options: OPT }));

  router.get('/cloudinary', (_, res) => {
    res.json({
      cloudName: process.env.CLOUDINARY_CLOUD_NAME || '',
      uploadPreset: process.env.CLOUDINARY_UPLOAD_PRESET || '',
    });
  });

  router.get('/cities', async (_, res) => {
    try {
      const { rows } = await pool.query('SELECT DISTINCT city FROM master_societies ORDER BY city');
      res.json(rows.map(r => r.city));
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  router.get('/societies', async (req, res) => {
    try {
      if (!req.query.city) return res.status(400).json({ error: 'city required' });
      const { rows } = await pool.query('SELECT DISTINCT society_name FROM master_societies WHERE city=$1 ORDER BY society_name', [req.query.city]);
      res.json(rows.map(r => r.society_name));
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  router.get('/localities', async (req, res) => {
    try {
      const { city, society } = req.query;
      if (!city || !society) return res.status(400).json({ error: 'city and society required' });
      const { rows } = await pool.query('SELECT DISTINCT locality FROM master_societies WHERE city=$1 AND society_name=$2 ORDER BY locality', [city, society]);
      res.json(rows.map(r => r.locality));
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  return router;
};
