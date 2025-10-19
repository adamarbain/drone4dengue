const express = require('express');
const router = express.Router();
const { 
  predictCompany, 
  predictPublic, 
  predictPublicEnhanced,
  getCompanyPredictions, 
  getCompanyLocations,
  getHistoricalDataEndpoint,
  healthCheck 
} = require('../controllers/predictionController');
const { checkToken } = require('../middleware/authMiddleware');

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
  const { companyId, companyLocationId, lat, lon } = req.body;
  
  if (!companyId) {
    return res.status(400).json({ 
      error: 'Company ID is required' 
    });
  }

  if (!companyLocationId) {
    return res.status(400).json({ 
      error: 'Company Location ID is required' 
    });
  }
  
  validatePredictionInput(req, res, next);
};

// Enhanced prediction input validation
const validateEnhancedPredictionInput = (req, res, next) => {
  const { lat, lon, historicalData, targetDate, useModel1Only } = req.body;
  
  // Validate coordinates
  validatePredictionInput(req, res, (err) => {
    if (err) return;
    
    // Validate historical data format if provided
    if (historicalData && !Array.isArray(historicalData)) {
      return res.status(400).json({ 
        error: 'Historical data must be an array' 
      });
    }
    
    // Validate historical data items
    if (historicalData) {
      for (let i = 0; i < historicalData.length; i++) {
        const item = historicalData[i];
        if (!item.date || typeof item.cases !== 'number') {
          return res.status(400).json({ 
            error: `Historical data item ${i} must have 'date' (string) and 'cases' (number)` 
          });
        }
      }
    }
    
    // Validate target date format if provided
    if (targetDate && !/^\d{4}-\d{2}-\d{2}$/.test(targetDate)) {
      return res.status(400).json({ 
        error: 'Target date must be in YYYY-MM-DD format' 
      });
    }
    
    // Validate useModel1Only flag
    if (useModel1Only !== undefined && typeof useModel1Only !== 'boolean') {
      return res.status(400).json({ 
        error: 'useModel1Only must be a boolean' 
      });
    }
    
    next();
  });
};

// Historical data query validation
const validateHistoricalDataQuery = (req, res, next) => {
  const { lat, lon, days_back } = req.query;
  
  if (!lat || !lon) {
    return res.status(400).json({ 
      error: 'Latitude and longitude are required' 
    });
  }
  
  if (isNaN(parseFloat(lat)) || isNaN(parseFloat(lon))) {
    return res.status(400).json({ 
      error: 'Latitude and longitude must be numbers' 
    });
  }
  
  if (days_back && (isNaN(parseInt(days_back)) || parseInt(days_back) < 1)) {
    return res.status(400).json({ 
      error: 'days_back must be a positive integer' 
    });
  }
  
  next();
};

// Health check endpoint (no auth required)
router.get('/health', healthCheck);

// Public prediction endpoint (no auth required)
// Input: { lat: number, lon: number, userId?: string }
// Model 1: Uses only lat, lon
// Model 2: Uses lat, lon + fetches weather data automatically
router.post('/public', validatePredictionInput, predictPublic);

// Enhanced public prediction endpoint (no auth required)
// Input: { lat: number, lon: number, userId?: string, historicalData?: Array, targetDate?: string, useModel1Only?: boolean }
// Supports historical data and Model 1 specific predictions
router.post('/public/enhanced', validateEnhancedPredictionInput, predictPublicEnhanced);

// Historical data endpoint (no auth required)
// Query: ?lat=number&lon=number&days_back=number
// Returns historical dengue cases data for a location
router.get('/historical-data', validateHistoricalDataQuery, getHistoricalDataEndpoint);

// Company prediction endpoints (require authentication)
// Input: { companyId: string, companyLocationId: string, lat: number, lon: number }
// Model 1: Uses only lat, lon  
// Model 2: Uses lat, lon + fetches weather data automatically
router.post('/company', checkToken, validateCompanyPredictionInput, predictCompany);
router.get('/company/:companyId', checkToken, getCompanyPredictions);
router.get('/company/:companyId/locations', checkToken, getCompanyLocations);

module.exports = router;
