const express = require('express');
const router = express.Router();
const { 
  predictCompany, 
  predictPublic, 
  getCompanyPredictions, 
  healthCheck 
} = require('../controllers/predictionController');
const { authenticateToken } = require('../middleware/authMiddleware');

// Input validation middleware
const validatePredictionInput = (req, res, next) => {
  const { lat, lon } = req.body;
  
  if (typeof lat !== 'number' || typeof lon !== 'number') {
    return res.status(400).json({ 
      error: 'Latitude and longitude must be numbers' 
    });
  }
  
  if (lat < -90 || lat > 90) {
    return res.status(400).json({ 
      error: 'Latitude must be between -90 and 90' 
    });
  }
  
  if (lon < -180 || lon > 180) {
    return res.status(400).json({ 
      error: 'Longitude must be between -180 and 180' 
    });
  }
  
  next();
};

const validateCompanyPredictionInput = (req, res, next) => {
  const { companyId, lat, lon } = req.body;
  
  if (!companyId) {
    return res.status(400).json({ 
      error: 'Company ID is required' 
    });
  }
  
  validatePredictionInput(req, res, next);
};

// Health check endpoint (no auth required)
router.get('/health', healthCheck);

// Public prediction endpoint (no auth required)
// Input: { lat: number, lon: number, userId?: string }
// Model 1: Uses only lat, lon
// Model 2: Uses lat, lon + fetches weather data automatically
router.post('/public', validatePredictionInput, predictPublic);

// Company prediction endpoints (require authentication)
// Input: { companyId: string, lat: number, lon: number }
// Model 1: Uses only lat, lon  
// Model 2: Uses lat, lon + fetches weather data automatically
// Temporarily commented out to debug
// router.post('/company', authenticateToken, validateCompanyPredictionInput, predictCompany);
router.get('/company/:companyId', authenticateToken, getCompanyPredictions);

module.exports = router;
