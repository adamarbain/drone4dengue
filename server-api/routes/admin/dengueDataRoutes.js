const express = require('express');
const router = express.Router();
const { checkToken, checkRole } = require('../../middleware/authMiddleware');
const { uploadDengueData, getSummary } = require('../../controllers/dengueDataController');

router.post('/upload', checkToken, checkRole('Admin'), uploadDengueData);
router.get('/summary', checkToken, checkRole('Admin'), getSummary);

module.exports = router; 