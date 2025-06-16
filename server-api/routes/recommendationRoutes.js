const express = require('express');
const router = express.Router();
const recommendationController = require('../controllers/recommendationController');

router.get('/:risk', recommendationController.getRecommendationsByRisk);

module.exports = router;
