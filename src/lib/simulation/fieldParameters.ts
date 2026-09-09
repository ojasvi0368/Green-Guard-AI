/**
 * Field Parameters Management
 * Manages field-specific configuration for simulation
 */

import { CROP_DATABASE } from '../cropwat/cropCoefficients';

export interface FieldParameters {
    cropType: string;
    fieldCapacity: number;        // % volumetric water content
    wiltingPoint: number;         // % volumetric water content
    rootDepth: number;            // cm
    stressThreshold: number;      // % volumetric water content (irrigation trigger)
    soilType: 'sandy' | 'loamy' | 'clay';
}

export interface SoilTypeCharacteristics {
    fieldCapacity: number;
    wiltingPoint: number;
    infiltrationRate: number;  // mm/hour
}

/**
 * Soil type default characteristics
 * Based on USDA soil texture classifications
 */
export const SOIL_CHARACTERISTICS: Record<string, SoilTypeCharacteristics> = {
    sandy: {
        fieldCapacity: 25,      // %
        wiltingPoint: 10,       // %
        infiltrationRate: 25    // mm/hour - fast drainage
    },
    loamy: {
        fieldCapacity: 35,      // %
        wiltingPoint: 15,       // %
        infiltrationRate: 13    // mm/hour - moderate drainage
    },
    clay: {
        fieldCapacity: 45,      // %
        wiltingPoint: 20,       // %
        infiltrationRate: 5     // mm/hour - slow drainage
    }
};

/**
 * Default field parameters
 */
export const DEFAULT_FIELD_PARAMS: FieldParameters = {
    cropType: 'wheat',
    fieldCapacity: 35,
    wiltingPoint: 15,
    rootDepth: 100,
    stressThreshold: 22,  // Trigger irrigation at 22% moisture
    soilType: 'loamy'
};

/**
 * Get field parameters for a specific crop
 * Combines crop data with soil characteristics
 */
export function getFieldParameters(
    cropType: string,
    soilType: 'sandy' | 'loamy' | 'clay' = 'loamy'
): FieldParameters {
    const cropData = CROP_DATABASE[cropType.toLowerCase()];
    const soilChars = SOIL_CHARACTERISTICS[soilType];

    if (!cropData) {
        console.warn(`Crop "${cropType}" not found, using defaults`);
        return { ...DEFAULT_FIELD_PARAMS, soilType };
    }

    if (!soilChars) {
        console.warn(`Soil type "${soilType}" not found, using loamy defaults`);
        return {
            cropType: cropType.toLowerCase(),
            ...SOIL_CHARACTERISTICS.loamy,
            rootDepth: cropData.rootDepth,
            stressThreshold: SOIL_CHARACTERISTICS.loamy.wiltingPoint + 7,
            soilType: 'loamy'
        };
    }

    // Calculate stress threshold: midpoint between wilting point and field capacity
    // This is conservative - irrigate before reaching critical depletion
    const stressThreshold = soilChars.wiltingPoint +
        (soilChars.fieldCapacity - soilChars.wiltingPoint) * (1 - cropData.depletionFactor);

    return {
        cropType: cropType.toLowerCase(),
        fieldCapacity: soilChars.fieldCapacity,
        wiltingPoint: soilChars.wiltingPoint,
        rootDepth: cropData.rootDepth,
        stressThreshold: Math.round(stressThreshold * 10) / 10,
        soilType
    };
}

/**
 * Get soil drainage rate based on soil type
 */
export function getSoilDrainageRate(soilType: 'sandy' | 'loamy' | 'clay'): number {
    return SOIL_CHARACTERISTICS[soilType]?.infiltrationRate || 13;
}

/**
 * Calculate available water capacity (AWC)
 * The amount of water available to plants between field capacity and wilting point
 */
export function calculateAWC(fieldCapacity: number, wiltingPoint: number, rootDepth: number): number {
    // AWC in mm = (FC - WP) / 100 * root depth (cm) * 10 (conversion factor)
    return ((fieldCapacity - wiltingPoint) / 100) * rootDepth * 10;
}

/**
 * Validate field parameters
 */
export function validateFieldParameters(params: FieldParameters): {
    valid: boolean;
    errors: string[];
} {
    const errors: string[] = [];

    if (params.fieldCapacity <= params.wiltingPoint) {
        errors.push('Field capacity must be greater than wilting point');
    }

    if (params.stressThreshold < params.wiltingPoint || params.stressThreshold > params.fieldCapacity) {
        errors.push('Stress threshold must be between wilting point and field capacity');
    }

    if (params.rootDepth <= 0 || params.rootDepth > 300) {
        errors.push('Root depth must be between 0 and 300 cm');
    }

    if (params.fieldCapacity < 0 || params.fieldCapacity > 100) {
        errors.push('Field capacity must be between 0 and 100%');
    }

    if (params.wiltingPoint < 0 || params.wiltingPoint > 100) {
        errors.push('Wilting point must be between 0 and 100%');
    }

    return {
        valid: errors.length === 0,
        errors
    };
}
