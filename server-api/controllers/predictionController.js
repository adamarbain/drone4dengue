const { PrismaClient } = require('@prisma/client');
const redis = require('redis');
const axios = require('axios');

const prisma = new PrismaClient();

// Redis client configuration - DISABLED FOR NOW
let redisClient = null;
let redisConnected = false;

// Uncomment the following block to enable Redis
/*
try {
  redisClient = redis.createClient({
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
  });

  redisClient.on('error', (err) => {
    console.error('Redis Client Error:', err);
    redisConnected = false;
  });

  redisClient.on('connect', () => {
    console.log('Connected to Redis');
    redisConnected = true;
  });

  // Connect to Redis (non-blocking)
  redisClient.connect().catch((err) => {
    console.error('Redis connection failed:', err);
    redisConnected = false;
  });
} catch (error) {
  console.error('Failed to create Redis client:', error);
  redisConnected = false;
}
*/

console.log('Redis is disabled - caching will not be available');

// ML Service configuration
const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:5001';

/**
 * Get dengue risk prediction from ML service
 * @param {number} latitude - Latitude coordinate
 * @param {number} longitude - Longitude coordinate
 * @param {Object} weatherData - Optional weather data
 * @returns {Promise<Object>} Prediction result
 */
async function getMLPrediction(latitude, longitude, weatherData = null) {
  try {
    const response = await axios.post(`${ML_SERVICE_URL}/predict`, {
      latitude,
      longitude,
      weather_data: weatherData
    }, {
      timeout: 10000 // 10 second timeout
    });

    return response.data;
  } catch (error) {
    console.error('ML Service Error:', error.message);
    throw new Error('Prediction service unavailable');
  }
}

/**
 * Generate cache key for coordinates
 * @param {number} latitude - Latitude coordinate
 * @param {number} longitude - Longitude coordinate
 * @returns {string} Cache key
 */
function generateCacheKey(latitude, longitude) {
  // Round coordinates to 4 decimal places for cache efficiency
  const lat = Math.round(latitude * 10000) / 10000;
  const lon = Math.round(longitude * 10000) / 10000;
  return `prediction:${lat}:${lon}`;
}

/**
 * Get cached prediction
 * @param {string} cacheKey - Cache key
 * @returns {Promise<Object|null>} Cached prediction or null
 */
async function getCachedPrediction(cacheKey) {
  if (!redisClient || !redisConnected) {
    return null;
  }
  
  try {
    const cached = await redisClient.get(cacheKey);
    return cached ? JSON.parse(cached) : null;
  } catch (error) {
    console.error('Redis get error:', error);
    return null;
  }
}

/**
 * Cache prediction result
 * @param {string} cacheKey - Cache key
 * @param {Object} prediction - Prediction result
 * @param {number} ttl - Time to live in seconds (default: 3 hours)
 */
async function cachePrediction(cacheKey, prediction, ttl = 10800) {
  if (!redisClient || !redisConnected) {
    return;
  }
  
  try {
    await redisClient.setEx(cacheKey, ttl, JSON.stringify(prediction));
  } catch (error) {
    console.error('Redis set error:', error);
  }
}

/**
 * Validate coordinates
 * @param {number} latitude - Latitude coordinate
 * @param {number} longitude - Longitude coordinate
 * @throws {Error} If coordinates are invalid
 */
function validateCoordinates(latitude, longitude) {
  if (typeof latitude !== 'number' || typeof longitude !== 'number') {
    throw new Error('Latitude and longitude must be numbers');
  }
  
  if (latitude < -90 || latitude > 90) {
    throw new Error('Latitude must be between -90 and 90');
  }
  
  if (longitude < -180 || longitude > 180) {
    throw new Error('Longitude must be between -180 and 180');
  }
}

/**
 * Company prediction endpoint
 * POST /api/predict/company
 */
async function predictCompany(req, res) {
  try {
    const { companyId, lat, lon } = req.body;

    // Validate input
    if (!companyId) {
      return res.status(400).json({ error: 'Company ID is required' });
    }

    validateCoordinates(lat, lon);

    // Verify company exists
    const company = await prisma.company.findUnique({
      where: { id: companyId }
    });

    if (!company) {
      return res.status(404).json({ error: 'Company not found' });
    }

    // Get prediction from ML service
    const mlResult = await getMLPrediction(lat, lon);
    
    if (!mlResult.success) {
      return res.status(500).json({ error: 'Prediction failed' });
    }

    const prediction = mlResult.prediction;

    // Store prediction in database
    const companyPrediction = await prisma.companyPrediction.create({
      data: {
        companyId,
        latitude: lat,
        longitude: lon,
        riskScore: prediction.combined_score,
        model1Score: prediction.model1_score,
        model2Score: prediction.model2_score
      }
    });

    res.json({
      success: true,
      prediction: {
        id: companyPrediction.id,
        companyId,
        latitude: lat,
        longitude: lon,
        riskScore: prediction.combined_score,
        riskLevel: prediction.risk_level,
        model1Score: prediction.model1_score,
        model2Score: prediction.model2_score,
        createdAt: companyPrediction.createdAt
      }
    });

  } catch (error) {
    console.error('Company prediction error:', error);
    res.status(500).json({ 
      error: error.message || 'Internal server error' 
    });
  }
}

/**
 * Public prediction endpoint
 * POST /api/predict/public
 */
async function predictPublic(req, res) {
  try {
    const { lat, lon, userId } = req.body;

    validateCoordinates(lat, lon);

    const cacheKey = generateCacheKey(lat, lon);
    
    // Check cache first
    let prediction = await getCachedPrediction(cacheKey);
    
    if (!prediction) {
      // Get prediction from ML service
      const mlResult = await getMLPrediction(lat, lon);
      
      if (!mlResult.success) {
        return res.status(500).json({ error: 'Prediction failed' });
      }

      prediction = {
        latitude: lat,
        longitude: lon,
        riskScore: mlResult.prediction.combined_score,
        riskLevel: mlResult.prediction.risk_level,
        model1Score: mlResult.prediction.model1_score,
        model2Score: mlResult.prediction.model2_score,
        timestamp: new Date().toISOString(),
        cached: false
      };

      // Cache the prediction
      await cachePrediction(cacheKey, prediction);
    } else {
      prediction.cached = true;
    }

    // Log the prediction request (optional)
    try {
      await prisma.predictionLog.create({
        data: {
          latitude: lat,
          longitude: lon,
          userId: userId || null,
          riskScore: prediction.riskScore
        }
      });
    } catch (logError) {
      console.error('Logging error:', logError);
      // Don't fail the request if logging fails
    }

    res.json({
      success: true,
      prediction
    });

  } catch (error) {
    console.error('Public prediction error:', error);
    res.status(500).json({ 
      error: error.message || 'Internal server error' 
    });
  }
}

/**
 * Get company predictions
 * GET /api/predict/company/:companyId
 */
async function getCompanyPredictions(req, res) {
  try {
    const { companyId } = req.params;
    const { limit = 10, offset = 0 } = req.query;

    // Verify company exists
    const company = await prisma.company.findUnique({
      where: { id: companyId }
    });

    if (!company) {
      return res.status(404).json({ error: 'Company not found' });
    }

    // Get predictions
    const predictions = await prisma.companyPrediction.findMany({
      where: { companyId },
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit),
      skip: parseInt(offset)
    });

    res.json({
      success: true,
      predictions: predictions.map(p => ({
        id: p.id,
        latitude: p.latitude,
        longitude: p.longitude,
        riskScore: p.riskScore,
        riskLevel: p.riskScore >= 0.7 ? 'high' : p.riskScore >= 0.4 ? 'medium' : 'low',
        model1Score: p.model1Score,
        model2Score: p.model2Score,
        createdAt: p.createdAt
      }))
    });

  } catch (error) {
    console.error('Get company predictions error:', error);
    res.status(500).json({ 
      error: error.message || 'Internal server error' 
    });
  }
}

/**
 * Health check endpoint
 * GET /api/predict/health
 */
async function healthCheck(req, res) {
  try {
    // Check ML service health
    const mlHealth = await axios.get(`${ML_SERVICE_URL}/health`, {
      timeout: 5000
    }).catch(() => ({ data: { status: 'unhealthy' } }));

    // Check Redis connection
    let redisHealth = 'unhealthy';
    if (redisClient && redisConnected) {
      try {
        const pingResult = await redisClient.ping();
        redisHealth = pingResult === 'PONG' ? 'healthy' : 'unhealthy';
      } catch (error) {
        redisHealth = 'unhealthy';
      }
    }

    res.json({
      success: true,
      services: {
        ml_service: mlHealth.data.status,
        redis: redisHealth === 'PONG' ? 'healthy' : 'unhealthy',
        database: 'healthy' // Prisma connection is checked on startup
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Health check error:', error);
    res.status(500).json({ 
      error: 'Health check failed' 
    });
  }
}

module.exports = {
  predictCompany,
  predictPublic,
  getCompanyPredictions,
  healthCheck
};
