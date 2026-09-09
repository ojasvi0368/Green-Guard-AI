/**
 * Crop Recommendation Routes
 */
const express = require('express');
const router = express.Router();
const cropController = require('../controllers/cropRecommendation.controller');

// POST /api/crop-recommendation
router.post('/crop-recommendation', cropController.recommendCrop);

module.exports = router;
