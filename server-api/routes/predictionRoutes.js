const express = require('express');
const router = express.Router();
const { 
  predictCompany, 
  predictCompanyThreeModels,
  detectBreedingAreas,
  predictPublic, 
  predictPublicEnhanced,
  getCompanyPredictions, 
  getCompanyLocations,
  getHistoricalDataEndpoint,
  predictBulkAllLocations,
  predictDailyUsers,
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

// Three-model company prediction input validation
const validateThreeModelPredictionInput = (req, res, next) => {
  const { companyId, companyLocationId, lat, lon, imageIds } = req.body;
  
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
  
  // Validate coordinates
  validatePredictionInput(req, res, (err) => {
    if (err) return;
    
    // Validate imageIds if provided
    if (imageIds && !Array.isArray(imageIds)) {
      return res.status(400).json({ 
        error: 'Image IDs must be an array' 
      });
    }
    
    // Validate imageIds items
    if (imageIds) {
      for (let i = 0; i < imageIds.length; i++) {
        if (typeof imageIds[i] !== 'string') {
          return res.status(400).json({ 
            error: `Image ID ${i} must be a string` 
          });
        }
      }
    }
    
    next();
  });
};

// Breeding area detection input validation
const validateBreedingAreaDetectionInput = (req, res, next) => {
  const { imageIds, companyId, companyLocationId } = req.body;
  
  if (!imageIds || !Array.isArray(imageIds) || imageIds.length === 0) {
    return res.status(400).json({ 
      error: 'Image IDs array is required and cannot be empty' 
    });
  }
  
  if (!companyId) {
    return res.status(400).json({ 
      error: 'Company ID is required' 
    });
  }
  
  // Validate imageIds items
  for (let i = 0; i < imageIds.length; i++) {
    if (typeof imageIds[i] !== 'string') {
      return res.status(400).json({ 
        error: `Image ID ${i} must be a string` 
      });
    }
  }
  
  // Validate companyLocationId if provided
  if (companyLocationId && typeof companyLocationId !== 'string') {
    return res.status(400).json({ 
      error: 'Company Location ID must be a string' 
    });
  }
  
  next();
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

// Three-model company prediction endpoint (require authentication)
// Input: { companyId: string, companyLocationId: string, lat: number, lon: number, imageIds?: string[] }
// Uses all three models: Historical + Weather + Breeding Area Detection
router.post('/company/three-models', checkToken, validateThreeModelPredictionInput, predictCompanyThreeModels);

// Breeding area detection endpoint (require authentication)
// Input: { imageIds: string[], companyId: string, companyLocationId?: string }
// Model 3 only: Breeding Area Detection from drone images
router.post('/detect-breeding-areas', checkToken, validateBreedingAreaDetectionInput, detectBreedingAreas);

// Bulk prediction endpoint (require authentication)
// POST /api/predict/bulk
// Generates predictions for all company locations across all companies
// Automatically sends notifications to all admins and mobile users
router.post('/bulk', checkToken, predictBulkAllLocations);

// Daily prediction endpoint for mobile users (require authentication)
// POST /api/predict/daily-users
// Generates predictions for all mobile users based on their last known location
// Automatically sends daily prediction notifications with recommendations
router.post('/daily-users', checkToken, predictDailyUsers);

router.get('/company/:companyId', checkToken, getCompanyPredictions);
router.get('/company/:companyId/locations', checkToken, getCompanyLocations);

module.exports = router;
