const express = require('express');
const router = express.Router();
const { testAccuracy, getAvailableDateRange } = require('../controllers/predictionAccuracyController');

// Public routes - no authentication required

/**
 * POST /api/prediction-accuracy/test
 * Test prediction model accuracy by comparing ML prediction with actual dengue data
 * 
 * Body:
 * {
 *   "latitude": number (required),
 *   "longitude": number (required),
 *   "date": "YYYY-MM-DD" (required, must be a past date)
 * }
 */
router.post('/test', testAccuracy);

/**
 * GET /api/prediction-accuracy/date-range
 * Get available date range for accuracy testing
 * 
 * Query params (optional):
 * - latitude: number
 * - longitude: number
 */
router.get('/date-range', getAvailableDateRange);

module.exports = router;
