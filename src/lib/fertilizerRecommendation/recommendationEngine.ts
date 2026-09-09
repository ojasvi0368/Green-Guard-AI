/**
 * Fertilizer Recommendation Engine
 * Calculates fertilizer requirements based on soil test and crop needs
 */

import { CropNutrientRequirement } from './cropNutrients';
import { FERTILIZER_DATABASE, Fertilizer } from './fertilizerDatabase';

export interface SoilNutrients {
    nitrogen: number; // kg/ha
    phosphorus: number; // P₂O₅ kg/ha
    potassium: number; // K₂O kg/ha
}

export interface FertilizerInput {
    cropRequirement: CropNutrientRequirement;
    soilNutrients: SoilNutrients;
    fieldArea: number; // hectares
}

export interface AdjustedNutrients {
    nitrogen: number;
    phosphorus: number;
    potassium: number;
    nitrogenFactor: number;
    phosphorusFactor: number;
    potassiumFactor: number;
}

export interface FertilizerRecommendation {
    fertilizer: Fertilizer;
    quantity: number; // kg
    purpose: string;
}

export interface FertilizerResult {
    adjustedNutrients: AdjustedNutrients;
    totalNutrients: {
        nitrogen: number;
        phosphorus: number;
        potassium: number;
    };
    recommendations: FertilizerRecommendation[];
    applicationGuide: string[];
}

/**
 * Calculate adjustment factor based on soil nutrient vs crop requirement
 */
function calculateAdjustmentFactor(soilNutrient: number, cropRequirement: number): number {
    const ratio = soilNutrient / cropRequirement;

    if (ratio < 0.5) {
        return 1.0; // Soil nutrient < 50% of crop need
    } else if (ratio >= 0.5 && ratio < 0.75) {
        return 0.75; // Soil nutrient 50-75% of crop need
    } else {
        return 0.5; // Soil nutrient > 75% of crop need
    }
}

/**
 * Calculate adjusted nutrient requirements
 */
function calculateAdjustedNutrients(
    cropRequirement: CropNutrientRequirement,
    soilNutrients: SoilNutrients
): AdjustedNutrients {
    const nitrogenFactor = calculateAdjustmentFactor(soilNutrients.nitrogen, cropRequirement.nitrogen);
    const phosphorusFactor = calculateAdjustmentFactor(soilNutrients.phosphorus, cropRequirement.phosphorus);
    const potassiumFactor = calculateAdjustmentFactor(soilNutrients.potassium, cropRequirement.potassium);

    return {
        nitrogen: cropRequirement.nitrogen * nitrogenFactor,
        phosphorus: cropRequirement.phosphorus * phosphorusFactor,
        potassium: cropRequirement.potassium * potassiumFactor,
        nitrogenFactor,
        phosphorusFactor,
        potassiumFactor
    };
}

/**
 * Calculate fertilizer quantities
 */
function calculateFertilizerQuantities(
    nitrogenNeeded: number,
    phosphorusNeeded: number,
    potassiumNeeded: number
): FertilizerRecommendation[] {
    const recommendations: FertilizerRecommendation[] = [];

    // Use DAP for phosphorus (also provides some nitrogen)
    if (phosphorusNeeded > 0) {
        const dap = FERTILIZER_DATABASE.find(f => f.name === 'dap')!;
        const dapQuantity = (phosphorusNeeded / dap.phosphorusPercent) * 100;
        const nitrogenFromDAP = (dapQuantity * dap.nitrogenPercent) / 100;

        recommendations.push({
            fertilizer: dap,
            quantity: Math.round(dapQuantity),
            purpose: `Provides ${Math.round(phosphorusNeeded)} kg P₂O₅ and ${Math.round(nitrogenFromDAP)} kg N`
        });

        // Reduce nitrogen needed by what DAP provides
        nitrogenNeeded -= nitrogenFromDAP;
    }

    // Use MOP for potassium
    if (potassiumNeeded > 0) {
        const mop = FERTILIZER_DATABASE.find(f => f.name === 'mop')!;
        const mopQuantity = (potassiumNeeded / mop.potassiumPercent) * 100;

        recommendations.push({
            fertilizer: mop,
            quantity: Math.round(mopQuantity),
            purpose: `Provides ${Math.round(potassiumNeeded)} kg K₂O`
        });
    }

    // Use Urea for remaining nitrogen
    if (nitrogenNeeded > 0) {
        const urea = FERTILIZER_DATABASE.find(f => f.name === 'urea')!;
        const ureaQuantity = (nitrogenNeeded / urea.nitrogenPercent) * 100;

        recommendations.push({
            fertilizer: urea,
            quantity: Math.round(ureaQuantity),
            purpose: `Provides ${Math.round(nitrogenNeeded)} kg N`
        });
    }

    return recommendations;
}

/**
 * Generate application guide
 */
function generateApplicationGuide(recommendations: FertilizerRecommendation[]): string[] {
    const guide: string[] = [];

    const hasNitrogen = recommendations.some(r => r.fertilizer.nitrogenPercent > 0);
    const hasPhosphorus = recommendations.some(r => r.fertilizer.phosphorusPercent > 0);
    const hasPotassium = recommendations.some(r => r.fertilizer.potassiumPercent > 0);

    if (hasNitrogen) {
        guide.push('Split nitrogen application into 2-3 doses: 1/3 at sowing, 1/3 at tillering, 1/3 at flowering');
    }

    if (hasPhosphorus || hasPotassium) {
        guide.push('Apply full dose of phosphorus and potassium as basal dose at the time of sowing');
    }

    guide.push('Avoid fertilizer application immediately before heavy rain to prevent nutrient loss');
    guide.push('Irrigate the field after fertilizer application for better nutrient absorption');
    guide.push('Mix fertilizers uniformly in the soil for even distribution');
    guide.push('Store fertilizers in a cool, dry place away from direct sunlight');

    return guide;
}

/**
 * Main fertilizer recommendation function
 */
export function getFertilizerRecommendation(input: FertilizerInput): FertilizerResult {
    // Calculate adjusted nutrients per hectare
    const adjustedNutrients = calculateAdjustedNutrients(input.cropRequirement, input.soilNutrients);

    // Calculate total nutrients needed for entire field
    const totalNutrients = {
        nitrogen: adjustedNutrients.nitrogen * input.fieldArea,
        phosphorus: adjustedNutrients.phosphorus * input.fieldArea,
        potassium: adjustedNutrients.potassium * input.fieldArea
    };

    // Calculate fertilizer quantities
    const recommendations = calculateFertilizerQuantities(
        totalNutrients.nitrogen,
        totalNutrients.phosphorus,
        totalNutrients.potassium
    );

    // Generate application guide
    const applicationGuide = generateApplicationGuide(recommendations);

    return {
        adjustedNutrients,
        totalNutrients,
        recommendations,
        applicationGuide
    };
}
