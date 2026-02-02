const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const logger = require('../utils/logger');
const {
  sendErrorResponse,
  sendValidationError,
  sendInternalError
} = require('../utils/errorResponse');

// ML Service URL
const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:5001';

/**
 * Test prediction model accuracy by comparing ML prediction with actual dengue data
 * 
 * This endpoint:
 * 1. Calls the ML service to get a prediction for a past date
 * 2. Fetches actual dengue data from the database for that location and date
 * 3. Compares the results and calculates accuracy metrics
 */
async function testAccuracy(req, res) {
  try {
    const { latitude, longitude, date } = req.body;

    // Validate required fields
    if (latitude === undefined || longitude === undefined || !date) {
      return sendValidationError(res, ['latitude, longitude, and date are required']);
    }

    const lat = parseFloat(latitude);
    const lon = parseFloat(longitude);

    if (isNaN(lat) || isNaN(lon)) {
      return sendValidationError(res, ['Invalid latitude or longitude values']);
    }

    // Validate coordinates
    if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      return sendValidationError(res, ['Coordinates out of valid range']);
    }

    // Parse and validate date
    const targetDate = new Date(date);
    if (isNaN(targetDate.getTime())) {
      return sendValidationError(res, ['Invalid date format. Use YYYY-MM-DD']);
    }

    // Ensure date is in the past
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (targetDate >= today) {
      return sendValidationError(res, ['Date must be in the past for accuracy testing']);
    }

    logger.info('[PREDICTION ACCURACY] Testing accuracy', { latitude: lat, longitude: lon, date });

    // Step 1: Call ML service for prediction
    let mlPrediction = null;
    let mlError = null;

    try {
      const mlResponse = await fetch(`${ML_SERVICE_URL}/predict/weighted-50-50`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          latitude: lat,
          longitude: lon,
          target_date: date, // YYYY-MM-DD format
        }),
      });

      if (!mlResponse.ok) {
        const errorText = await mlResponse.text();
        throw new Error(`ML service error: ${mlResponse.status} - ${errorText}`);
      }

      const mlData = await mlResponse.json();
      mlPrediction = mlData.prediction || mlData;
      
      logger.info('[PREDICTION ACCURACY] ML prediction received', { 
        combinedScore: mlPrediction.combined_score,
        riskLevel: mlPrediction.risk_level 
      });
    } catch (error) {
      logger.error('[PREDICTION ACCURACY] ML service error', { error: error.message });
      mlError = error.message;
    }

    // Step 2: Fetch actual dengue data from database
    // Use a tolerance for coordinate matching (approximately 0.5km radius)
    const tolerance = 0.0045; // ~0.5km in degrees
    
    // Create date range for the target date (full day)
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    // Query dengue data near the location and on the target date
    const actualData = await prisma.dengueData.findMany({
      where: {
        AND: [
          {
            latitude: {
              gte: lat - tolerance,
              lte: lat + tolerance,
            },
          },
          {
            longitude: {
              gte: lon - tolerance,
              lte: lon + tolerance,
            },
          },
          {
            date: {
              gte: startOfDay,
              lte: endOfDay,
            },
          },
        ],
      },
      orderBy: {
        date: 'desc',
      },
    });

    // Also try to get nearby data if exact date doesn't match
    // Look for data within +/- 3 days of the target date
    let nearbyDateData = [];
    if (actualData.length === 0) {
      const extendedStartDate = new Date(targetDate);
      extendedStartDate.setDate(extendedStartDate.getDate() - 3);
      const extendedEndDate = new Date(targetDate);
      extendedEndDate.setDate(extendedEndDate.getDate() + 3);

      nearbyDateData = await prisma.dengueData.findMany({
        where: {
          AND: [
            {
              latitude: {
                gte: lat - tolerance,
                lte: lat + tolerance,
              },
            },
            {
              longitude: {
                gte: lon - tolerance,
                lte: lon + tolerance,
              },
            },
            {
              date: {
                gte: extendedStartDate,
                lte: extendedEndDate,
              },
            },
          ],
        },
        orderBy: {
          date: 'desc',
        },
        take: 5,
      });
    }

    // Step 3: Calculate accuracy metrics
    const dataToUse = actualData.length > 0 ? actualData : nearbyDateData;
    
    // Aggregate actual cases
    let totalActualCases = 0;
    let actualRiskLevel = 'low';
    let actualDataFound = false;
    let dataSource = 'none';

    if (dataToUse.length > 0) {
      actualDataFound = true;
      dataSource = actualData.length > 0 ? 'exact_date' : 'nearby_date';
      
      // Sum up active cases from all matching records
      totalActualCases = dataToUse.reduce((sum, record) => {
        return sum + (record.activeCases || 0);
      }, 0);

      // Determine actual risk level based on cases
      // Using same thresholds as ML model: high >= 3, medium >= 1
      if (totalActualCases >= 3) {
        actualRiskLevel = 'high';
      } else if (totalActualCases >= 1) {
        actualRiskLevel = 'medium';
      } else {
        actualRiskLevel = 'low';
      }
    }

    // Calculate accuracy score
    let accuracyScore = 0;
    let riskLevelMatch = false;
    let comparisonDetails = {};

    if (mlPrediction && actualDataFound) {
      const predictedRiskLevel = (mlPrediction.risk_level || '').toLowerCase();
      riskLevelMatch = predictedRiskLevel === actualRiskLevel;

      // Calculate score accuracy (how close the prediction was)
      // ML model predicts on 0-5 scale, actual cases can vary
      // Normalize both to compare
      const predictedScore = mlPrediction.combined_score || 0;
      const normalizedActual = Math.min(totalActualCases, 5); // Cap at 5 for comparison
      
      // Score difference (lower is better)
      const scoreDifference = Math.abs(predictedScore - normalizedActual);
      
      // Calculate accuracy percentage
      // If risk levels match, base accuracy is 60%
      // Additional 40% based on score proximity
      const baseAccuracy = riskLevelMatch ? 60 : 20;
      const scoreAccuracy = Math.max(0, 40 - (scoreDifference / 5) * 40);
      accuracyScore = Math.round(baseAccuracy + scoreAccuracy);

      comparisonDetails = {
        predicted: {
          score: predictedScore,
          riskLevel: predictedRiskLevel,
          model1Score: mlPrediction.model1_score,
          model2Score: mlPrediction.model2_score,
        },
        actual: {
          totalCases: totalActualCases,
          riskLevel: actualRiskLevel,
          recordsFound: dataToUse.length,
          locations: [...new Set(dataToUse.map(d => d.location).filter(Boolean))],
        },
        metrics: {
          riskLevelMatch,
          scoreDifference: Math.round(scoreDifference * 100) / 100,
          accuracyScore,
        },
      };
    } else if (mlPrediction && !actualDataFound) {
      // No actual data to compare
      comparisonDetails = {
        predicted: {
          score: mlPrediction.combined_score || 0,
          riskLevel: (mlPrediction.risk_level || '').toLowerCase(),
          model1Score: mlPrediction.model1_score,
          model2Score: mlPrediction.model2_score,
        },
        actual: {
          totalCases: 0,
          riskLevel: 'unknown',
          recordsFound: 0,
          locations: [],
        },
        metrics: {
          riskLevelMatch: false,
          scoreDifference: null,
          accuracyScore: null,
          note: 'No actual dengue data found for this location and date range',
        },
      };
    }

    // Build response
    const response = {
      success: true,
      test: {
        location: {
          latitude: lat,
          longitude: lon,
        },
        date: date,
        toleranceRadius: `${(tolerance * 111).toFixed(1)}km`, // Convert degrees to km approx
      },
      prediction: mlPrediction ? {
        available: true,
        combinedScore: mlPrediction.combined_score,
        riskLevel: mlPrediction.risk_level,
        model1Score: mlPrediction.model1_score,
        model2Score: mlPrediction.model2_score,
        isHotspot: mlPrediction.is_hotspot,
        locationCluster: mlPrediction.location_cluster,
      } : {
        available: false,
        error: mlError,
      },
      actualData: {
        found: actualDataFound,
        source: dataSource,
        totalActiveCases: totalActualCases,
        riskLevel: actualDataFound ? actualRiskLevel : 'unknown',
        recordsCount: dataToUse.length,
        records: dataToUse.map(record => ({
          id: record.id,
          location: record.location,
          date: record.date,
          activeCases: record.activeCases,
          totalCases: record.totalCases,
          status: record.status,
        })),
      },
      accuracy: mlPrediction && actualDataFound ? {
        score: accuracyScore,
        riskLevelMatch,
        interpretation: getAccuracyInterpretation(accuracyScore),
      } : {
        score: null,
        riskLevelMatch: null,
        interpretation: !mlPrediction 
          ? 'Unable to calculate - ML prediction failed' 
          : 'Unable to calculate - No actual data found for comparison',
      },
      comparison: comparisonDetails,
      timestamp: new Date().toISOString(),
    };

    logger.info('[PREDICTION ACCURACY] Test completed', { 
      accuracyScore, 
      riskLevelMatch, 
      actualDataFound 
    });

    res.json(response);

  } catch (error) {
    logger.error('[PREDICTION ACCURACY] Error', { error: error.message, stack: error.stack });
    return sendInternalError(res, 'Failed to test prediction accuracy', error);
  }
}

/**
 * Get human-readable interpretation of accuracy score
 */
function getAccuracyInterpretation(score) {
  if (score >= 80) {
    return 'Excellent - The prediction closely matches actual data';
  } else if (score >= 60) {
    return 'Good - The prediction reasonably matches actual data';
  } else if (score >= 40) {
    return 'Moderate - The prediction partially matches actual data';
  } else if (score >= 20) {
    return 'Fair - The prediction has limited accuracy for this case';
  } else {
    return 'Poor - The prediction significantly differs from actual data';
  }
}

/**
 * Get available date range for accuracy testing
 * Returns the earliest and latest dates with dengue data
 */
async function getAvailableDateRange(req, res) {
  try {
    const { latitude, longitude } = req.query;

    const cutoffDate = new Date('2025-12-18');
    const filters = [];
    
    // If coordinates provided, filter by location
    if (latitude && longitude) {
      const lat = parseFloat(latitude);
      const lon = parseFloat(longitude);
      const tolerance = 0.018;

      if (!isNaN(lat) && !isNaN(lon)) {
        filters.push(
          { latitude: { gte: lat - tolerance, lte: lat + tolerance } },
          { longitude: { gte: lon - tolerance, lte: lon + tolerance } },
        );
      }
    }

    // Enforce minimum date of 18/12/2025
    filters.push({ date: { gte: cutoffDate } });

    const whereClause = { AND: filters };

    // Get earliest date
    const earliest = await prisma.dengueData.findFirst({
      where: whereClause,
      orderBy: { date: 'asc' },
      select: { date: true },
    });

    // Get latest date
    const latest = await prisma.dengueData.findFirst({
      where: whereClause,
      orderBy: { date: 'desc' },
      select: { date: true },
    });

    // Get total count
    const count = await prisma.dengueData.count({ where: whereClause });

    res.json({
      success: true,
      dateRange: {
        earliest: earliest?.date || null,
        latest: latest?.date || null,
        totalRecords: count,
      },
      filtered: !!(latitude && longitude),
    });

  } catch (error) {
    logger.error('[PREDICTION ACCURACY] Error getting date range', { error: error.message });
    return sendInternalError(res, 'Failed to get available date range', error);
  }
}

module.exports = {
  testAccuracy,
  getAvailableDateRange,
};
