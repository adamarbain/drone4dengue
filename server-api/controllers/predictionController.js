const { PrismaClient } = require('@prisma/client');
const redis = require('redis');
const axios = require('axios');

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
      timeout: 60000 // 60 second timeout for image processing
    });

    return response.data;
  } catch (error) {
    console.error('ML Three-Model Service Error:', error.message);
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
    console.error('ML Breeding Area Detection Error:', error.message);
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
    console.error('ML Service Error:', error.message);
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
    console.error('ML Service Model 1 Error:', error.message);
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
    console.error('ML Service Historical Data Error:', error.message);
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
 * Three-model company prediction endpoint
 * POST /api/predict/company/three-models
 */
async function predictCompanyThreeModels(req, res) {
  try {
    const { companyId, companyLocationId, lat, lon, imageIds } = req.body;

    // Validate input
    if (!companyId) {
      return res.status(400).json({ error: 'Company ID is required' });
    }

    if (!companyLocationId) {
      return res.status(400).json({ error: 'Company Location ID is required' });
    }

    validateCoordinates(lat, lon);

    // Verify company exists
    const company = await prisma.company.findUnique({
      where: { id: companyId }
    });

    if (!company) {
      return res.status(404).json({ error: 'Company not found' });
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
      return res.status(404).json({ error: 'Company location not found or does not belong to the specified company' });
    }

    // Get drone images for this location if imageIds are provided
    let imageUrls = [];
    if (imageIds && imageIds.length > 0) {
      const images = await prisma.image.findMany({
        where: {
          id: { in: imageIds },
          companyId: companyId,
          companyLocationId: companyLocationId
        },
        select: {
          id: true,
          url: true,
          filename: true
        }
      });

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
    }

    // Get three-model prediction from ML service
    const mlResult = await getMLThreeModelPrediction(lat, lon, null, null, null, imageUrls);
    
    if (!mlResult.success) {
      return res.status(500).json({ error: 'Three-model prediction failed' });
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
    console.error('Three-model company prediction error:', error);
    res.status(500).json({ 
      error: error.message || 'Internal server error' 
    });
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
      return res.status(400).json({ error: 'Image IDs are required' });
    }

    if (!companyId) {
      return res.status(400).json({ error: 'Company ID is required' });
    }

    // Verify company exists
    const company = await prisma.company.findUnique({
      where: { id: companyId }
    });

    if (!company) {
      return res.status(404).json({ error: 'Company not found' });
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
      return res.status(404).json({ error: 'No images found for the specified criteria' });
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
      return res.status(500).json({ error: 'Breeding area detection failed' });
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
    console.error('Breeding area detection error:', error);
    res.status(500).json({ 
      error: error.message || 'Internal server error' 
    });
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
      return res.status(400).json({ error: 'Company ID is required' });
    }

    if (!companyLocationId) {
      return res.status(400).json({ error: 'Company Location ID is required' });
    }

    validateCoordinates(lat, lon);

    // Verify company exists
    const company = await prisma.company.findUnique({
      where: { id: companyId }
    });

    if (!company) {
      return res.status(404).json({ error: 'Company not found' });
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
      return res.status(404).json({ error: 'Company location not found or does not belong to the specified company' });
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
    const { limit = 10, offset = 0, companyLocationId } = req.query;

    // Verify company exists
    const company = await prisma.company.findUnique({
      where: { id: companyId }
    });

    if (!company) {
      return res.status(404).json({ error: 'Company not found' });
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

    res.json({
      success: true,
      predictions: predictions.map(p => ({
        id: p.id,
        companyLocationId: p.companyLocationId,
        companyLocation: p.companyLocation,
        latitude: p.latitude,
        longitude: p.longitude,
        riskScore: p.riskScore,
        riskLevel: p.riskScore >= 3 ? 'high' : p.riskScore >= 1 ? 'medium' : 'low',
        model1Score: p.model1Score,
        model2Score: p.model2Score,
        model3Score: p.model3Score,
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
        return res.status(500).json({ error: 'Model 1 prediction failed' });
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
        return res.status(500).json({ error: 'Prediction failed' });
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
        }
      } catch (dbError) {
        console.error('Error saving to CompanyPrediction:', dbError);
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
      console.error('Logging error:', logError);
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
    console.error('Enhanced public prediction error:', error);
    res.status(500).json({ 
      error: error.message || 'Internal server error' 
    });
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
      return res.status(400).json({ 
        error: 'Latitude and longitude are required' 
      });
    }

    validateCoordinates(parseFloat(lat), parseFloat(lon));

    const result = await getHistoricalData(
      parseFloat(lat), 
      parseFloat(lon), 
      parseInt(days_back)
    );

    if (!result.success) {
      return res.status(500).json({ error: 'Failed to get historical data' });
    }

    res.json({
      success: true,
      historicalData: result.historical_data,
      dataPoints: result.data_points,
      daysBack: result.days_back,
      location: result.location
    });

  } catch (error) {
    console.error('Get historical data error:', error);
    res.status(500).json({ 
      error: error.message || 'Internal server error' 
    });
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
      return res.status(404).json({ error: 'Company not found' });
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
    console.error('Get company locations error:', error);
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
        redis: redisHealth,
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
  predictCompanyThreeModels,
  detectBreedingAreas,
  predictPublic,
  predictPublicEnhanced,
  getCompanyPredictions,
  getCompanyLocations,
  getHistoricalDataEndpoint,
  healthCheck
};
