const express = require('express');
const router = express.Router();

module.exports = function (pool) {

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

  // Static dropdown options
  router.get('/', (req, res) => {
    res.json({ options: FORM_OPTIONS });
  });

  // All cities
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

  // Societies for a city (2nd level)
  router.get('/societies', async (req, res) => {
    try {
      const { city } = req.query;
      if (!city) return res.status(400).json({ error: 'city is required' });

      const { rows } = await pool.query(
        'SELECT DISTINCT society_name FROM master_societies WHERE city = $1 ORDER BY society_name',
        [city]
      );
      res.json(rows.map(r => r.society_name));
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Localities for a city + society (3rd level)
  router.get('/localities', async (req, res) => {
    try {
      const { city, society } = req.query;
      if (!city || !society) return res.status(400).json({ error: 'city and society are required' });

      const { rows } = await pool.query(
        'SELECT DISTINCT locality FROM master_societies WHERE city = $1 AND society_name = $2 ORDER BY locality',
        [city, society]
      );
      res.json(rows.map(r => r.locality));
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  return router;
};
