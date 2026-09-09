const cropService = require('../services/cropRecommendation.service');

/**
 * Crop Recommendation Controller
 */
const recommendCrop = async (req, res) => {
    try {
        const { nitrogen, phosphorus, potassium, temperature, humidity, ph, rainfall } = req.body;

        // Basic validation
        if (
            nitrogen === undefined ||
            phosphorus === undefined ||
            potassium === undefined ||
            temperature === undefined ||
            humidity === undefined ||
            ph === undefined ||
            rainfall === undefined
        ) {
            return res.status(400).json({
                success: false,
                error: 'All parameters (nitrogen, phosphorus, potassium, temperature, humidity, ph, rainfall) are required'
            });
        }

        // Call service for prediction
        const recommendedCrop = await cropService.getRecommendation({
            nitrogen,
            phosphorus,
            potassium,
            temperature,
            humidity,
            ph,
            rainfall
        });

        return res.status(200).json({
            success: true,
            crop: recommendedCrop
        });

    } catch (error) {
        console.error('Controller Error:', error.message);
        return res.status(500).json({
            success: false,
            error: error.message || 'Internal server error during crop recommendation'
        });
    }
};

module.exports = {
    recommendCrop
};
