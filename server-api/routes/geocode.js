const express = require('express');
const axios = require('axios');
const router = express.Router();

// Simple geocoding proxy to comply with Nominatim usage policy
// GET /geocode/search?q=QUERY&limit=5&countrycodes=my
router.get('/search', async (req, res) => {
  try {
    const { q = '', limit = 5, countrycodes = 'my' } = req.query;
    if (!q || String(q).trim().length === 0) {
      return res.status(400).json({ error: 'Query parameter q is required' });
    }
    const response = await axios.get('https://nominatim.openstreetmap.org/search', {
      params: {
        q,
        format: 'jsonv2',
        addressdetails: 1,
        limit,
        countrycodes, // Restrict to Malaysia by default for faster results
      },
      headers: {
        // Identify this application per Nominatim policy
        'User-Agent': 'drone4dengue-admin/1.0 (contact: adamarbain2107@gmail.com)',
        'Accept': 'application/json',
      },
      timeout: 8000,
    });
    res.json(response.data);
  } catch (err) {
    const status = err.response?.status || 500;
    res.status(status).json({ error: 'Failed to perform geocoding search.' });
  }
});

// Reverse geocoding: GET /geocode/reverse?lat=...&lon=...
router.get('/reverse', async (req, res) => {
  try {
    const { lat, lon } = req.query;
    if (!lat || !lon) {
      return res.status(400).json({ error: 'lat and lon are required' });
    }
    const response = await axios.get('https://nominatim.openstreetmap.org/reverse', {
      params: {
        lat,
        lon,
        format: 'jsonv2',
        addressdetails: 1,
      },
      headers: {
        'User-Agent': 'drone4dengue-admin/1.0 (contact: adamarbain2107@gmail.com)',
        'Accept': 'application/json',
      },
      timeout: 8000,
    });
    res.json(response.data);
  } catch (err) {
    const status = err.response?.status || 500;
    res.status(status).json({ error: 'Failed to perform reverse geocoding.' });
  }
});

module.exports = router;


