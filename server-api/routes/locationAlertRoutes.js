const express = require('express');
const router = express.Router();
const locationAlertController = require('../controllers/locationAlertController');
const { checkToken } = require('../middleware/authMiddleware');

// GET /api/location-alerts - Get all location alerts for current user
router.get('/', checkToken, locationAlertController.getUserLocationAlerts);

// POST /api/location-alerts - Create a new location alert
router.post('/', checkToken, locationAlertController.createLocationAlert);

// DELETE /api/location-alerts/:id - Delete a location alert
router.delete('/:id', checkToken, locationAlertController.deleteLocationAlert);

// PATCH /api/location-alerts/:id - Toggle alert active status
router.patch('/:id', checkToken, locationAlertController.toggleLocationAlert);

// POST /api/location-alerts/check-and-notify - Check dengue cases and send notifications (called by GitHub Actions)
router.post('/check-and-notify', locationAlertController.checkAndNotify);

module.exports = router;

