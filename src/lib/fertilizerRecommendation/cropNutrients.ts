/**
 * Crop Nutrient Requirements Database
 * Standard nutrient requirements for major crops
 */

export interface CropNutrientRequirement {
    name: string;
    displayName: string;
    nitrogen: number; // kg/ha
    phosphorus: number; // P₂O₅ kg/ha
    potassium: number; // K₂O kg/ha
}

/**
 * Standard nutrient requirements for major crops
 */
export const CROP_NUTRIENT_DATABASE: Record<string, CropNutrientRequirement> = {
    wheat: {
        name: 'wheat',
        displayName: 'Wheat',
        nitrogen: 120,
        phosphorus: 60,
        potassium: 40
    },
    rice: {
        name: 'rice',
        displayName: 'Rice',
        nitrogen: 110,
        phosphorus: 55,
        potassium: 40
    },
    maize: {
        name: 'maize',
        displayName: 'Maize',
        nitrogen: 135,
        phosphorus: 60,
        potassium: 40
    },
    sugarcane: {
        name: 'sugarcane',
        displayName: 'Sugarcane',
        nitrogen: 250,
        phosphorus: 115,
        potassium: 115
    },
    cotton: {
        name: 'cotton',
        displayName: 'Cotton',
        nitrogen: 150,
        phosphorus: 75,
        potassium: 75
    },
    potato: {
        name: 'potato',
        displayName: 'Potato',
        nitrogen: 180,
        phosphorus: 80,
        potassium: 100
    },
    tomato: {
        name: 'tomato',
        displayName: 'Tomato',
        nitrogen: 150,
        phosphorus: 60,
        potassium: 60
    }
};

/**
 * Get crop nutrient requirement
 */
export function getCropNutrientRequirement(crop: string): CropNutrientRequirement | null {
    return CROP_NUTRIENT_DATABASE[crop.toLowerCase()] || null;
}

/**
 * Get list of available crops
 */
export function getAvailableCrops(): CropNutrientRequirement[] {
    return Object.values(CROP_NUTRIENT_DATABASE);
}
