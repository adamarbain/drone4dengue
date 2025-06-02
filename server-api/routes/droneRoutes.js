const express = require('express');
const router = express.Router();
const { checkToken, checkRole } = require('../middleware/authMiddleware');
const { registerDrone } = require('../controllers/droneController');

router.post('/register', checkToken, checkRole('User', 'Admin', 'Organisation'), registerDrone);

module.exports = router; 