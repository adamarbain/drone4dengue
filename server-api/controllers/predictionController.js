const { PrismaClient } = require('@prisma/client');
const redis = require('redis');
const axios = require('axios');
const logger = require('../utils/logger');
const {
  sendErrorResponse,
  sendValidationError,
  sendNotFoundError,
  sendInternalError
} = require('../utils/errorResponse');
const { getRiskLevel } = require('../utils/riskLevelUtils');

const prisma = new PrismaClient();

// Redis client configuration - DISABLED FOR NOW
let redisClient = null;
let redisConnected = false;

// Uncomment the following block to enable Redis
try {
  const redisUrl = process.env.REDIS_URL;
  if (redisUrl) {
    // Prefer REDIS_URL (supports rediss:// for TLS, e.g., Redis Cloud / Render Managed Redis)
    redisClient = redis.createClient({
      url: redisUrl,
      socket: {
        tls: redisUrl.startsWith('rediss://'),
        // If your provider requires custom CA handling, you may need:
        // rejectUnauthorized: false,
      },
    });
  } else {
    // Fallback to host/port/password (useful for local docker-compose)
    redisClient = redis.createClient({
      username: process.env.REDIS_USERNAME || 'default',
      password: process.env.REDIS_PASSWORD || undefined,
      socket: {
        host: process.env.REDIS_HOST || 'localhost',
        port: Number(process.env.REDIS_PORT || 6379),
      },
    });
  }

  redisClient.on('error', (err) => {
    logger.error('Redis Client Error', { error: err.message });
    redisConnected = false;
  });

  redisClient.on('connect', () => {
    logger.info('Connected to Redis');
    redisConnected = true;
  });

  // Connect to Redis (non-blocking)
  redisClient.connect().catch((err) => {
    logger.error('Redis connection failed', { error: err.message });
    redisConnected = false;
  });
} catch (error) {
  logger.error('Failed to create Redis client', { error: error.message });
  redisConnected = false;
}

// ML Service configuration
const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:5001';

/**
 * Get dengue risk prediction from ML service using all three models
 * @param {number} latitude - Latitude coordinate
 * @param {number} longitude - Longitude coordinate
 * @param {Object} weatherData - Optional weather data
 * @param {Array} historicalData - Optional historical cases data
 * @param {string} targetDate - Optional target date (YYYY-MM-DD)
 * @param {Array} imageUrls - Optional array of drone image URLs for breeding area detection
 * @returns {Promise<Object>} Three-model prediction result
 */
async function getMLThreeModelPrediction(latitude, longitude, weatherData = null, historicalData = null, targetDate = null, imageUrls = null) {
  try {
    const payload = {
      latitude,
      longitude
    };

    // Add optional parameters if provided
    if (weatherData) {
      payload.weather_data = weatherData;
    }
    if (historicalData) {
      payload.historical_cases_data = historicalData;
    }
    if (targetDate) {
      payload.target_date = targetDate;
    }
    if (imageUrls && imageUrls.length > 0) {
      payload.image_urls = imageUrls;
    }

    const response = await axios.post(`${ML_SERVICE_URL}/predict/three-models`, payload, {
      timeout: 10 * 60 * 1000 // 10 minute timeout for image processing
    });

    return response.data;
  } catch (error) {
    logger.error('ML Three-Model Service Error', { error: error.message, code: error.code });
    if (error.code === 'ECONNREFUSED') {
      throw new Error('ML service is not running or not accessible');
    } else if (error.code === 'ETIMEDOUT') {
      throw new Error('ML service request timed out - service may be overloaded');
    } else if (error.response) {
      throw new Error(`ML service returned error: ${error.response.status} - ${error.response.data?.error || 'Unknown error'}`);
    } else {
      throw new Error('Three-model prediction service unavailable');
    }
  }
}

/**
 * Get breeding area detection from ML service
 * @param {Array} imageUrls - Array of drone image URLs
 * @returns {Promise<Object>} Breeding area detection result
 */
async function getMLBreedingAreaDetection(imageUrls) {
  try {
    const payload = {
      image_urls: imageUrls
    };

    const response = await axios.post(`${ML_SERVICE_URL}/detect-breeding-areas`, payload, {
      timeout: 60000 // 60 second timeout for image processing
    });

    return response.data;
  } catch (error) {
    logger.error('ML Breeding Area Detection Error', { error: error.message, code: error.code });
    if (error.code === 'ECONNREFUSED') {
      throw new Error('ML service is not running or not accessible');
    } else if (error.code === 'ETIMEDOUT') {
      throw new Error('ML service request timed out - service may be overloaded');
    } else if (error.response) {
      throw new Error(`ML service returned error: ${error.response.status} - ${error.response.data?.error || 'Unknown error'}`);
    } else {
      throw new Error('Breeding area detection service unavailable');
    }
  }
}

/**
 * Get dengue risk prediction from ML service
 * @param {number} latitude - Latitude coordinate
 * @param {number} longitude - Longitude coordinate
 * @param {Object} weatherData - Optional weather data
 * @param {Array} historicalData - Optional historical cases data
 * @param {string} targetDate - Optional target date (YYYY-MM-DD)
 * @returns {Promise<Object>} Prediction result
 */
async function getMLPrediction(latitude, longitude, weatherData = null, historicalData = null, targetDate = null) {
  try {
    const payload = {
      latitude,
      longitude
    };

    // Add optional parameters if provided
    if (weatherData) {
      payload.weather_data = weatherData;
    }
    if (historicalData) {
      payload.historical_cases_data = historicalData;
    }
    if (targetDate) {
      payload.target_date = targetDate;
    }

    const response = await axios.post(`${ML_SERVICE_URL}/predict`, payload, {
      timeout: 30000 // 30 second timeout
    });

    return response.data;
  } catch (error) {
    logger.error('ML Service Error', { error: error.message, code: error.code });
    if (error.code === 'ECONNREFUSED') {
      throw new Error('ML service is not running or not accessible');
    } else if (error.code === 'ETIMEDOUT') {
      throw new Error('ML service request timed out - service may be overloaded');
    } else if (error.response) {
      throw new Error(`ML service returned error: ${error.response.status} - ${error.response.data?.error || 'Unknown error'}`);
    } else {
      throw new Error('Prediction service unavailable');
    }
  }
}

/**
 * Get Model 1 prediction with historical data from ML service
 * @param {number} latitude - Latitude coordinate
 * @param {number} longitude - Longitude coordinate
 * @param {Array} historicalData - Optional historical cases data
 * @param {string} targetDate - Optional target date (YYYY-MM-DD)
 * @returns {Promise<Object>} Model 1 prediction result
 */
async function getMLModel1Prediction(latitude, longitude, historicalData = null, targetDate = null) {
  try {
    const payload = {
      latitude,
      longitude
    };

    // Add optional parameters if provided
    if (historicalData) {
      payload.historical_cases_data = historicalData;
    }
    if (targetDate) {
      payload.target_date = targetDate;
    }

    const response = await axios.post(`${ML_SERVICE_URL}/predict/model1`, payload, {
      timeout: 30000 // 30 second timeout
    });

    return response.data;
  } catch (error) {
    logger.error('ML Service Model 1 Error', { error: error.message, code: error.code });
    throw new Error('Model 1 prediction service unavailable');
  }
}

/**
 * Get historical data for a location from ML service
 * @param {number} latitude - Latitude coordinate
 * @param {number} longitude - Longitude coordinate
 * @param {number} daysBack - Number of days to look back (default: 30)
 * @returns {Promise<Object>} Historical data result
 */
async function getHistoricalData(latitude, longitude, daysBack = 30) {
  try {
    const response = await axios.get(`${ML_SERVICE_URL}/historical-data`, {
      params: {
        latitude,
        longitude,
        days_back: daysBack
      },
      timeout: 30000 // 30 second timeout
    });

    return response.data;
  } catch (error) {
    logger.error('ML Service Historical Data Error', { error: error.message, code: error.code });
    throw new Error('Historical data service unavailable');
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
    logger.error('Redis get error', { error: error.message, cacheKey });
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
    logger.error('Redis set error', { error: error.message, cacheKey });
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
 * Three-model company prediction endpoint
 * POST /api/predict/company/three-models
 */
async function predictCompanyThreeModels(req, res) {
  // Set extended timeout for three-model prediction with image processing
  const EXTENDED_TIMEOUT = 10 * 60 * 1000; // 10 minutes for image processing
  req.setTimeout(EXTENDED_TIMEOUT);
  res.setTimeout(EXTENDED_TIMEOUT);
  
  try {
    const { companyId, companyLocationId, lat, lon, imageIds } = req.body;

    // Validate input
    if (!companyId) {
      return sendValidationError(res, ['Company ID is required']);
    }

    if (!companyLocationId) {
      return sendValidationError(res, ['Company Location ID is required']);
    }

    validateCoordinates(lat, lon);

    // Verify company exists
    const company = await prisma.company.findUnique({
      where: { id: companyId }
    });

    if (!company) {
      return sendNotFoundError(res, 'Company');
    }

    // Verify company location exists and belongs to the company
    const companyLocation = await prisma.companyLocation.findFirst({
      where: { 
        id: companyLocationId,
        companyId: companyId,
        isActive: true
      }
    });

    if (!companyLocation) {
      return sendNotFoundError(res, 'Company location');
    }

    // Get drone images for this location if imageIds are provided
    // Apply business rules: 50+ images total AND images within last 7 days
    let imageUrls = [];
    if (imageIds && imageIds.length > 0) {
      // Check total image count for this location
      const totalImageCount = await prisma.image.count({
        where: {
          companyId: companyId,
          companyLocationId: companyLocationId
        }
      });

      logger.info('Three-model prediction - Image count check', { 
        companyLocationId, 
        totalImageCount,
        threshold: 50 
      });

      // Only proceed with Model 3 if location has 50+ images total
      if (totalImageCount >= 50) {
        // Calculate date for 7 days ago
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        // Filter images: only those uploaded within last 7 days
        const images = await prisma.image.findMany({
          where: {
            id: { in: imageIds },
            companyId: companyId,
            companyLocationId: companyLocationId,
            createdAt: { gte: sevenDaysAgo }
          },
          select: {
            id: true,
            url: true,
            filename: true,
            createdAt: true
          }
        });

        logger.info('Three-model prediction - Recent images filtered', { 
          companyLocationId,
          totalProvided: imageIds.length,
          recentImagesFound: images.length,
          dateThreshold: sevenDaysAgo.toISOString()
        });

        if (images.length > 0) {
          // Convert relative URLs to absolute URLs (or use Firebase URLs as-is)
          imageUrls = images.map(img => {
            // If URL is already a Firebase URL (absolute), use it directly
            if (img.url && (img.url.startsWith('http://') || img.url.startsWith('https://'))) {
              return img.url;
            }
            // Otherwise, assume it's a relative URL and prepend API base URL
            const baseUrl = process.env.API_BASE_URL || 'http://localhost:4000';
            return `${baseUrl}${img.url}`;
          });
        } else {
          logger.warn('Three-model prediction - No recent images found, falling back to Models 1 & 2', { 
            companyLocationId 
          });
        }
      } else {
        logger.warn('Three-model prediction - Insufficient images, falling back to Models 1 & 2', { 
          companyLocationId,
          totalImageCount,
          required: 50
        });
      }
    }

    // Get three-model prediction from ML service
    const mlResult = await getMLThreeModelPrediction(lat, lon, null, null, null, imageUrls);
    
    if (!mlResult.success) {
      return sendErrorResponse(res, 500, 'Three-model prediction failed', 'PREDICTION_FAILED');
    }

    const prediction = mlResult.prediction;

    // Store prediction in database
    const companyPrediction = await prisma.companyPrediction.create({
      data: {
        companyId,
        companyLocationId,
        latitude: lat,
        longitude: lon,
        riskScore: prediction.combined_score,
        model1Score: prediction.model1_score,
        model2Score: prediction.model2_score,
        model3Score: prediction.model3_score,
        combinedScore: prediction.combined_score
      },
      include: {
        companyLocation: {
          select: {
            id: true,
            name: true,
            address: true,
            latitude: true,
            longitude: true
          }
        }
      }
    });

    // Send notification to mobile users
    try {
      const { notifyCompanyPredictionCreated } = require('../services/notificationService');
      await notifyCompanyPredictionCreated({
        ...companyPrediction,
        riskLevel: prediction.risk_level
      });
    } catch (notifError) {
      logger.error('Failed to send prediction notification', { error: notifError.message });
      // Don't fail the request if notification fails
    }

    // Store breeding area detection results if available
    let breedingAreaDetections = [];
    if (prediction.breeding_area_detections && prediction.breeding_area_detections.length > 0) {
      // Get the images that were processed
      const processedImages = await prisma.image.findMany({
        where: {
          id: { in: imageIds },
          companyId: companyId,
          companyLocationId: companyLocationId
        }
      });

      // Create breeding area detection records
      for (const image of processedImages) {
        const detection = await prisma.breedingAreaDetection.create({
          data: {
            imageId: image.id,
            companyId: companyId,
            companyLocationId: companyLocationId,
            breedingAreaScore: prediction.model3_score,
            detectedObjects: prediction.breeding_area_detections,
            boundingBoxes: prediction.breeding_area_detections.map(d => d.bbox),
            riskLevel: prediction.model3_risk_level,
            processingStatus: 'completed',
            processedAt: new Date()
          }
        });
        breedingAreaDetections.push(detection);
      }
    }

    res.json({
      success: true,
      prediction: {
        id: companyPrediction.id,
        companyId,
        companyLocationId,
        companyLocation: companyPrediction.companyLocation,
        latitude: lat,
        longitude: lon,
        riskScore: prediction.combined_score,
        riskLevel: prediction.risk_level,
        model1Score: prediction.model1_score,
        model2Score: prediction.model2_score,
        model3Score: prediction.model3_score,
        combinedScore: prediction.combined_score,
        
        // Additional three-model details
        breedingAreaDetections: prediction.breeding_area_detections,
        model3RiskLevel: prediction.model3_risk_level,
        imagesProcessed: prediction.images_processed,
        modelsUsed: prediction.models_used,
        
        // Breeding area detection records
        breedingAreaDetectionRecords: breedingAreaDetections,
        
        createdAt: companyPrediction.createdAt
      }
    });

  } catch (error) {
    logger.error('Three-model company prediction error', { error: error.message, stack: error.stack, companyId: req.body.companyId });
    return sendInternalError(res, 'Three-model prediction failed', error);
  }
}

/**
 * Breeding area detection endpoint
 * POST /api/predict/detect-breeding-areas
 */
async function detectBreedingAreas(req, res) {
  try {
    const { imageIds, companyId, companyLocationId } = req.body;

    if (!imageIds || imageIds.length === 0) {
      return sendValidationError(res, ['Image IDs are required']);
    }

    if (!companyId) {
      return sendValidationError(res, ['Company ID is required']);
    }

    // Verify company exists
    const company = await prisma.company.findUnique({
      where: { id: companyId }
    });

    if (!company) {
      return sendNotFoundError(res, 'Company');
    }

    // Get images
    const images = await prisma.image.findMany({
      where: {
        id: { in: imageIds },
        companyId: companyId,
        ...(companyLocationId && { companyLocationId: companyLocationId })
      },
      select: {
        id: true,
        url: true,
        filename: true,
        companyLocationId: true
      }
    });

    if (images.length === 0) {
      return sendNotFoundError(res, 'Images');
    }

    // Convert relative URLs to absolute URLs (or use Firebase URLs as-is)
    const imageUrls = images.map(img => {
      // If URL is already a Firebase URL (absolute), use it directly
      if (img.url && (img.url.startsWith('http://') || img.url.startsWith('https://'))) {
        return img.url;
      }
      // Otherwise, assume it's a relative URL and prepend API base URL
      const baseUrl = process.env.API_BASE_URL || 'http://localhost:4000';
      return `${baseUrl}${img.url}`;
    });

    // Get breeding area detection from ML service
    const mlResult = await getMLBreedingAreaDetection(imageUrls);
    
    if (!mlResult.success) {
      return sendErrorResponse(res, 500, 'Breeding area detection failed', 'DETECTION_FAILED');
    }

    // Store detection results in database
    const breedingAreaDetections = [];
    for (const image of images) {
      const detection = await prisma.breedingAreaDetection.create({
        data: {
          imageId: image.id,
          companyId: companyId,
          companyLocationId: image.companyLocationId,
          breedingAreaScore: mlResult.breeding_area_score,
          detectedObjects: mlResult.detections,
          boundingBoxes: mlResult.detections.map(d => d.bbox),
          riskLevel: mlResult.risk_level,
          processingStatus: 'completed',
          processedAt: new Date()
        }
      });
      breedingAreaDetections.push(detection);
    }

    res.json({
      success: true,
      detection: {
        breedingAreaScore: mlResult.breeding_area_score,
        riskLevel: mlResult.risk_level,
        detections: mlResult.detections,
        detectionCount: mlResult.detection_count,
        imagesProcessed: mlResult.images_processed,
        totalImages: mlResult.total_images,
        recommendations: mlResult.recommendations,
        errors: mlResult.errors,
        breedingAreaDetectionRecords: breedingAreaDetections,
        timestamp: mlResult.timestamp
      }
    });

  } catch (error) {
    logger.error('Breeding area detection error', { error: error.message, stack: error.stack, companyId: req.body.companyId });
    return sendInternalError(res, 'Breeding area detection failed', error);
  }
}

/**
 * Company prediction endpoint
 * POST /api/predict/company
 */
async function predictCompany(req, res) {
  try {
    const { companyId, companyLocationId, lat, lon } = req.body;

    // Validate input
    if (!companyId) {
      return sendValidationError(res, ['Company ID is required']);
    }

    if (!companyLocationId) {
      return sendValidationError(res, ['Company Location ID is required']);
    }

    validateCoordinates(lat, lon);

    // Verify company exists
    const company = await prisma.company.findUnique({
      where: { id: companyId }
    });

    if (!company) {
      return sendNotFoundError(res, 'Company');
    }

    // Verify company location exists and belongs to the company
    const companyLocation = await prisma.companyLocation.findFirst({
      where: { 
        id: companyLocationId,
        companyId: companyId,
        isActive: true
      }
    });

    if (!companyLocation) {
      return sendNotFoundError(res, 'Company location');
    }

    // Get prediction from ML service
    const mlResult = await getMLPrediction(lat, lon);
    
    if (!mlResult.success) {
      return sendErrorResponse(res, 500, 'Prediction failed', 'PREDICTION_FAILED');
    }

    const prediction = mlResult.prediction;

    // Store prediction in database
    const companyPrediction = await prisma.companyPrediction.create({
      data: {
        companyId,
        companyLocationId,
        latitude: lat,
        longitude: lon,
        riskScore: prediction.combined_score,
        model1Score: prediction.model1_score,
        model2Score: prediction.model2_score
      },
      include: {
        companyLocation: {
          select: {
            id: true,
            name: true,
            address: true,
            latitude: true,
            longitude: true
          }
        }
      }
    });

    // Send notification to mobile users
    try {
      const { notifyCompanyPredictionCreated } = require('../services/notificationService');
      await notifyCompanyPredictionCreated({
        ...companyPrediction,
        riskLevel: prediction.risk_level
      });
    } catch (notifError) {
      logger.error('Failed to send prediction notification', { error: notifError.message });
      // Don't fail the request if notification fails
    }

    res.json({
      success: true,
      prediction: {
        id: companyPrediction.id,
        companyId,
        companyLocationId,
        companyLocation: companyPrediction.companyLocation,
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
    logger.error('Company prediction error', { error: error.message, stack: error.stack, companyId: req.body.companyId });
    return sendInternalError(res, 'Company prediction failed', error);
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
        return sendErrorResponse(res, 500, 'Prediction failed', 'PREDICTION_FAILED');
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
      logger.error('Logging error', { error: logError.message });
      // Don't fail the request if logging fails
    }

    res.json({
      success: true,
      prediction
    });

  } catch (error) {
    logger.error('Public prediction error', { error: error.message, stack: error.stack, lat: req.body.lat, lon: req.body.lon });
    return sendInternalError(res, 'Public prediction failed', error);
  }
}

/**
 * Get company predictions
 * GET /api/predict/company/:companyId
 */
async function getCompanyPredictions(req, res) {
  try {
    const { companyId } = req.params;
    const { limit = 10, offset = 0, companyLocationId } = req.query;

    // Verify company exists and get prediction model parameters
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: { predictionModelParameters: true }
    });

    if (!company) {
      return sendNotFoundError(res, 'Company');
    }

    // Build where clause
    const whereClause = { companyId };
    if (companyLocationId) {
      whereClause.companyLocationId = companyLocationId;
    }

    // Get predictions with company location data
    const predictions = await prisma.companyPrediction.findMany({
      where: whereClause,
      include: {
        companyLocation: {
          select: {
            id: true,
            name: true,
            address: true,
            latitude: true,
            longitude: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit),
      skip: parseInt(offset)
    });

    const predictionModelParameters = company?.predictionModelParameters || {};
    
    res.json({
      success: true,
      predictions: predictions.map(p => ({
        id: p.id,
        companyLocationId: p.companyLocationId,
        companyLocation: p.companyLocation,
        latitude: p.latitude,
        longitude: p.longitude,
        riskScore: p.riskScore,
        riskLevel: getRiskLevel(p.riskScore || p.combinedScore, predictionModelParameters),
        model1Score: p.model1Score,
        model2Score: p.model2Score,
        model3Score: p.model3Score,
        createdAt: p.createdAt
      }))
    });

  } catch (error) {
    logger.error('Get company predictions error', { error: error.message, stack: error.stack, companyId: req.params.companyId });
    return sendInternalError(res, 'Failed to get company predictions', error);
  }
}

/**
 * Enhanced public prediction with historical data support
 * POST /api/predict/public/enhanced
 */
async function predictPublicEnhanced(req, res) {
  try {
    const { lat, lon, userId, historicalData, targetDate, useModel1Only, companyId } = req.body;

    validateCoordinates(lat, lon);

    let prediction;
    
    if (useModel1Only) {
      // Use Model 1 with historical data
      const mlResult = await getMLModel1Prediction(lat, lon, historicalData, targetDate);
      
    if (!mlResult.success) {
      return sendErrorResponse(res, 500, 'Model 1 prediction failed', 'PREDICTION_FAILED');
    }

      prediction = {
        latitude: lat,
        longitude: lon,
        riskScore: mlResult.prediction.predicted_cases,
        riskLevel: mlResult.prediction.risk_level,
        model: 'Model 1 (Historical Cases)',
        historicalFeatures: mlResult.prediction.historical_features_used,
        isHotspot: mlResult.prediction.is_hotspot,
        locationCluster: mlResult.prediction.location_cluster,
        dataQuality: mlResult.prediction.data_quality,
        timestamp: new Date().toISOString()
      };
    } else {
      // Use combined models
      const mlResult = await getMLPrediction(lat, lon, null, historicalData, targetDate);
      
      if (!mlResult.success) {
        return sendErrorResponse(res, 500, 'Prediction failed', 'PREDICTION_FAILED');
      }

      prediction = {
        latitude: lat,
        longitude: lon,
        riskScore: mlResult.prediction.combined_score,
        riskLevel: mlResult.prediction.risk_level,
        model1Score: mlResult.prediction.model1_score,
        model2Score: mlResult.prediction.model2_score,
        historicalFeatures: mlResult.prediction.historical_features_used,
        isHotspot: mlResult.prediction.is_hotspot,
        locationCluster: mlResult.prediction.location_cluster,
        timestamp: new Date().toISOString()
      };
    }

    // Store prediction in CompanyPrediction table if companyId is provided
    let companyPrediction = null;
    if (companyId) {
      try {
        // Verify company exists
        const company = await prisma.company.findUnique({
          where: { id: companyId }
        });

        if (company) {
          companyPrediction = await prisma.companyPrediction.create({
            data: {
              companyId,
              companyLocationId: null, // Optional as per schema
              latitude: lat,
              longitude: lon,
              riskScore: prediction.riskScore,
              model1Score: prediction.model1Score || null,
              model2Score: prediction.model2Score || null
            }
          });
          
          // Send notification to mobile users
          try {
            const { notifyCompanyPredictionCreated } = require('../services/notificationService');
            await notifyCompanyPredictionCreated({
              ...companyPrediction,
              riskLevel: prediction.riskLevel
            });
          } catch (notifError) {
            logger.error('Failed to send prediction notification', { error: notifError.message });
            // Don't fail the request if notification fails
          }
        }
      } catch (dbError) {
        logger.error('Error saving to CompanyPrediction', { error: dbError.message });
        // Don't fail the request if database save fails
      }
    }

    // Log the prediction request
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
      logger.error('Logging error', { error: logError.message });
    }

    res.json({
      success: true,
      prediction: {
        ...prediction,
        id: companyPrediction?.id,
        companyId: companyPrediction?.companyId
      }
    });

  } catch (error) {
    logger.error('Enhanced public prediction error', { error: error.message, stack: error.stack, lat: req.body.lat, lon: req.body.lon });
    return sendInternalError(res, 'Enhanced prediction failed', error);
  }
}

/**
 * Get historical data for a location
 * GET /api/predict/historical-data
 */
async function getHistoricalDataEndpoint(req, res) {
  try {
    const { lat, lon, days_back = 30 } = req.query;

    if (!lat || !lon) {
      return sendValidationError(res, ['Latitude and longitude are required']);
    }

    validateCoordinates(parseFloat(lat), parseFloat(lon));

    const result = await getHistoricalData(
      parseFloat(lat), 
      parseFloat(lon), 
      parseInt(days_back)
    );

    if (!result.success) {
      return sendErrorResponse(res, 500, 'Failed to get historical data', 'HISTORICAL_DATA_FAILED');
    }

    res.json({
      success: true,
      historicalData: result.historical_data,
      dataPoints: result.data_points,
      daysBack: result.days_back,
      location: result.location
    });

  } catch (error) {
    logger.error('Get historical data error', { error: error.message, stack: error.stack, lat: req.query.lat, lon: req.query.lon });
    return sendInternalError(res, 'Failed to get historical data', error);
  }
}

/**
 * Get company locations
 * GET /api/predict/company/:companyId/locations
 */
async function getCompanyLocations(req, res) {
  try {
    const { companyId } = req.params;

    // Verify company exists
    const company = await prisma.company.findUnique({
      where: { id: companyId }
    });

    if (!company) {
      return sendNotFoundError(res, 'Company');
    }

    // Get active company locations
    const locations = await prisma.companyLocation.findMany({
      where: { 
        companyId: companyId,
        isActive: true
      },
      select: {
        id: true,
        name: true,
        address: true,
        latitude: true,
        longitude: true,
        isActive: true,
        createdAt: true
      },
      orderBy: { name: 'asc' }
    });

    res.json({
      success: true,
      locations
    });

  } catch (error) {
    logger.error('Get company locations error', { error: error.message, stack: error.stack, companyId: req.params.companyId });
    return sendInternalError(res, 'Failed to get company locations', error);
  }
}

/**
 * Bulk prediction endpoint - Generate predictions for all company locations across all companies
 * POST /api/predict/bulk
 */
async function predictBulkAllLocations(req, res) {
  // Set extended timeout for bulk prediction
  const EXTENDED_TIMEOUT = 30 * 60 * 1000; // 30 minutes for bulk processing
  req.setTimeout(EXTENDED_TIMEOUT);
  res.setTimeout(EXTENDED_TIMEOUT);
  
  try {
    logger.info('[BULK PREDICTION] Starting bulk prediction for all company locations');

    // Get all active companies
    const companies = await prisma.company.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true
      }
    });

    if (companies.length === 0) {
      return sendNotFoundError(res, 'Active companies');
    }

    logger.info('[BULK PREDICTION] Found active companies', { count: companies.length });

    const results = {
      totalCompanies: companies.length,
      totalLocations: 0,
      successful: 0,
      failed: 0,
      predictions: [],
      errors: []
    };

    // Process each company
    for (const company of companies) {
      try {
        // Get all active locations for this company
        const locations = await prisma.companyLocation.findMany({
          where: {
            companyId: company.id,
            isActive: true,
            latitude: { not: null },
            longitude: { not: null }
          },
          select: {
            id: true,
            name: true,
            latitude: true,
            longitude: true
          }
        });

        if (locations.length === 0) {
          logger.debug('[BULK PREDICTION] No active locations with coordinates found for company', { companyName: company.name });
          continue;
        }

        logger.info('[BULK PREDICTION] Processing locations for company', { 
          locationCount: locations.length, 
          companyName: company.name 
        });

        // Process each location
        for (const location of locations) {
          try {
            results.totalLocations++;

            // Get drone images for this location (optional)
            // Apply business rules: 50+ images total AND images within last 7 days
            let images = [];
            
            // Check total image count for this location
            const totalImageCount = await prisma.image.count({
              where: {
                companyId: company.id,
                companyLocationId: location.id
              }
            });

            // Only proceed with Model 3 if location has 50+ images total
            if (totalImageCount >= 50) {
              // Calculate date for 7 days ago
              const sevenDaysAgo = new Date();
              sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

              // Get images uploaded within last 7 days
              images = await prisma.image.findMany({
                where: {
                  companyId: company.id,
                  companyLocationId: location.id,
                  createdAt: { gte: sevenDaysAgo }
                },
                select: {
                  id: true,
                  url: true,
                  filename: true,
                  createdAt: true
                },
                orderBy: { createdAt: 'desc' }
              });

              logger.debug('[BULK PREDICTION] Image eligibility check', {
                locationName: location.name,
                totalImages: totalImageCount,
                recentImages: images.length,
                dateThreshold: sevenDaysAgo.toISOString()
              });
            } else {
              logger.debug('[BULK PREDICTION] Location has insufficient images, using Models 1 & 2 only', {
                locationName: location.name,
                totalImages: totalImageCount,
                required: 50
              });
            }

            // Convert image URLs to absolute URLs
            const imageUrls = images.map(img => {
              if (img.url && (img.url.startsWith('http://') || img.url.startsWith('https://'))) {
                return img.url;
              }
              const baseUrl = process.env.API_BASE_URL || 'http://localhost:4000';
              return `${baseUrl}${img.url}`;
            });

            // Get three-model prediction from ML service
            const mlResult = await getMLThreeModelPrediction(
              location.latitude,
              location.longitude,
              null, // weatherData - will be fetched by ML service
              null, // historicalData - will be fetched by ML service
              null, // targetDate
              imageUrls.length > 0 ? imageUrls : null
            );

            if (!mlResult.success) {
              throw new Error('ML prediction failed');
            }

            const prediction = mlResult.prediction;

            // Store prediction in database
            const companyPrediction = await prisma.companyPrediction.create({
              data: {
                companyId: company.id,
                companyLocationId: location.id,
                latitude: location.latitude,
                longitude: location.longitude,
                riskScore: prediction.combined_score,
                model1Score: prediction.model1_score,
                model2Score: prediction.model2_score,
                model3Score: prediction.model3_score,
                combinedScore: prediction.combined_score
              },
              include: {
                companyLocation: {
                  select: {
                    id: true,
                    name: true,
                    address: true,
                    latitude: true,
                    longitude: true
                  }
                }
              }
            });

            // Send notification to all users (admins + mobile users)
            // This is automatically handled by notifyCompanyPredictionCreated
            try {
              const { notifyCompanyPredictionCreated } = require('../services/notificationService');
              await notifyCompanyPredictionCreated({
                ...companyPrediction,
                riskLevel: prediction.risk_level
              });
            } catch (notifError) {
              logger.error('[BULK PREDICTION] Failed to send notification', { 
                error: notifError.message, 
                locationName: location.name 
              });
              // Don't fail the prediction if notification fails
            }

            // Store breeding area detection results if available
            if (prediction.breeding_area_detections && prediction.breeding_area_detections.length > 0) {
              for (const image of images) {
                await prisma.breedingAreaDetection.create({
                  data: {
                    imageId: image.id,
                    companyId: company.id,
                    companyLocationId: location.id,
                    breedingAreaScore: prediction.model3_score,
                    detectedObjects: prediction.breeding_area_detections,
                    boundingBoxes: prediction.breeding_area_detections.map(d => d.bbox),
                    riskLevel: prediction.model3_risk_level,
                    processingStatus: 'completed',
                    processedAt: new Date()
                  }
                });
              }
            }

            results.successful++;
            results.predictions.push({
              companyId: company.id,
              companyName: company.name,
              locationId: location.id,
              locationName: location.name,
              predictionId: companyPrediction.id,
              riskScore: prediction.combined_score,
              riskLevel: prediction.risk_level,
              latitude: location.latitude,
              longitude: location.longitude
            });

            logger.debug('[BULK PREDICTION] Successfully processed location', { 
              locationName: location.name, 
              companyName: company.name 
            });

          } catch (locationError) {
            results.failed++;
            results.errors.push({
              companyId: company.id,
              companyName: company.name,
              locationId: location.id,
              locationName: location.name,
              error: locationError.message
            });
            logger.error('[BULK PREDICTION] Error processing location', { 
              error: locationError.message, 
              locationName: location.name, 
              companyName: company.name 
            });
          }
        }

      } catch (companyError) {
        logger.error('[BULK PREDICTION] Error processing company', { 
          error: companyError.message, 
          companyName: company.name 
        });
        results.errors.push({
          companyId: company.id,
          companyName: company.name,
          error: companyError.message
        });
      }
    }

    logger.info('[BULK PREDICTION] Completed', { 
      successful: results.successful, 
      failed: results.failed 
    });

    res.json({
      success: true,
      message: `Bulk prediction completed. Processed ${results.totalLocations} locations across ${results.totalCompanies} companies.`,
      summary: {
        totalCompanies: results.totalCompanies,
        totalLocations: results.totalLocations,
        successful: results.successful,
        failed: results.failed,
        successRate: results.totalLocations > 0 
          ? ((results.successful / results.totalLocations) * 100).toFixed(2) + '%'
          : '0%'
      },
      predictions: results.predictions,
      errors: results.errors.length > 0 ? results.errors : undefined
    });

  } catch (error) {
    logger.error('[BULK PREDICTION] Fatal error', { error: error.message, stack: error.stack });
    return sendInternalError(res, 'Bulk prediction failed', error);
  }
}

/**
 * Daily prediction endpoint - Generate predictions for all mobile users
 * POST /api/predict/daily-users
 * This endpoint replicates the functionality of dailyPredictionJob.js
 */
async function predictDailyUsers(req, res) {
  // Set extended timeout for daily prediction processing
  const EXTENDED_TIMEOUT = 30 * 60 * 1000; // 30 minutes
  req.setTimeout(EXTENDED_TIMEOUT);
  res.setTimeout(EXTENDED_TIMEOUT);
  
  try {
    logger.info('[DAILY PREDICTION API] Starting daily prediction for mobile users');

    // Get all mobile users (role='user') with their company info
    const users = await prisma.user.findMany({
      where: {
        role: 'user',
        status: 'Verified' // Only verified users
      },
      select: {
        id: true,
        companyId: true,
        email: true,
        name: true
      }
    });

    logger.info('[DAILY PREDICTION API] Found users to process', { count: users.length });

    const results = {
      totalUsers: users.length,
      successful: 0,
      failed: 0,
      skipped: 0,
      predictions: [],
      errors: []
    };

    // Process each user
    for (const user of users) {
      try {
        // Get user's last prediction to use their location
        const lastPrediction = await prisma.predictionLog.findFirst({
          where: {
            userId: user.id
          },
          orderBy: {
            requestedAt: 'desc'
          }
        });

        if (!lastPrediction) {
          logger.debug('[DAILY PREDICTION API] No location found for user', { userId: user.id });
          results.skipped++;
          continue;
        }

        const { latitude, longitude } = lastPrediction;

        // Call prediction API
        const mlResult = await getMLPrediction(latitude, longitude);
        
        if (!mlResult.success || !mlResult.prediction) {
          logger.error('[DAILY PREDICTION API] Prediction failed for user', { userId: user.id });
          results.failed++;
          results.errors.push({
            userId: user.id,
            email: user.email,
            error: 'Prediction failed'
          });
          continue;
        }

        const prediction = mlResult.prediction;
        
        // Get company settings for risk level thresholds
        const company = await prisma.company.findUnique({
          where: { id: user.companyId },
          select: { predictionModelParameters: true }
        });
        const predictionModelParameters = company?.predictionModelParameters || {};
        
        // Determine risk level using company-specific thresholds
        const riskScore = prediction.combined_score || prediction.risk_score || 0;
        const riskLevel = getRiskLevel(riskScore, predictionModelParameters);

        // Send notification to user
        try {
          const { notifyDailyPrediction } = require('../services/notificationService');
          await notifyDailyPrediction(user.id, user.companyId, {
            riskLevel,
            riskScore,
            latitude,
            longitude
          });
        } catch (notifError) {
          logger.error('[DAILY PREDICTION API] Failed to send notification for user', { 
            error: notifError.message, 
            userId: user.id 
          });
          // Don't fail the prediction if notification fails
        }

        // Log the prediction
        await prisma.predictionLog.create({
          data: {
            latitude,
            longitude,
            userId: user.id,
            riskScore
          }
        });

        results.successful++;
        results.predictions.push({
          userId: user.id,
          email: user.email,
          companyId: user.companyId,
          latitude,
          longitude,
          riskScore,
          riskLevel
        });

        logger.debug('[DAILY PREDICTION API] Successfully processed user', { userId: user.id });

      } catch (userError) {
        logger.error('[DAILY PREDICTION API] Error processing user', { 
          error: userError.message, 
          stack: userError.stack, 
          userId: user.id 
        });
        results.failed++;
        results.errors.push({
          userId: user.id,
          email: user.email,
          error: userError.message
        });
      }
    }

    logger.info('[DAILY PREDICTION API] Completed', { 
      successful: results.successful, 
      failed: results.failed, 
      skipped: results.skipped 
    });

    res.json({
      success: true,
      message: `Daily prediction completed. Processed ${results.totalUsers} users.`,
      summary: {
        totalUsers: results.totalUsers,
        successful: results.successful,
        failed: results.failed,
        skipped: results.skipped,
        successRate: results.totalUsers > 0 
          ? ((results.successful / results.totalUsers) * 100).toFixed(2) + '%'
          : '0%'
      },
      predictions: results.predictions,
      errors: results.errors.length > 0 ? results.errors : undefined
    });

  } catch (error) {
    logger.error('[DAILY PREDICTION API] Fatal error', { error: error.message, stack: error.stack });
    return sendInternalError(res, 'Daily prediction failed', error);
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
        redis: redisHealth,
        database: 'healthy' // Prisma connection is checked on startup
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Health check error', { error: error.message, stack: error.stack });
    return sendErrorResponse(res, 500, 'Health check failed', 'HEALTH_CHECK_FAILED');
  }
}

module.exports = {
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
};
