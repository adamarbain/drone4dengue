const express = require('express');
const router = express.Router();
const { checkToken, checkRole } = require('../../middleware/authMiddleware');
const weatherController = require('../../controllers/weatherController');
const multer = require('multer');
const upload = multer();

// List all weather records
router.get('/data', checkToken, checkRole('admin'), weatherController.listWeatherData);

// Get weather summary
router.get('/summary', checkToken, checkRole('admin'), weatherController.getWeatherSummary);

// Add new manual weather record
router.post('/', checkToken, checkRole('admin'), weatherController.addManualWeatherRecord);

// Update an existing weather record
router.put('/:id', checkToken, checkRole('admin'), weatherController.updateWeatherRecord);

// Delete a weather record
router.delete('/:id', checkToken, checkRole('admin'), weatherController.deleteWeatherRecord);

// Upload weather data via CSV
router.post('/upload-csv', checkToken, checkRole('admin'), upload.single('file'), weatherController.uploadWeatherCSV);

// Export all weather data as CSV
router.get('/export', checkToken, checkRole('admin'), weatherController.exportWeatherData);

// Fetch and store weather data from Open-Meteo
router.post('/fetch-and-store', checkToken, checkRole('admin'), weatherController.fetchAndStoreWeather);

module.exports = router;
