/**
 * Crop Coefficient (Kc) Database
 * Based on FAO-56 Standards for accurate crop water requirement calculation
 */

export interface CropStageKc {
    initial: number;      // Kc during initial growth stage
    development: number;  // Kc during crop development
    midSeason: number;    // Kc during mid-season (peak)
    lateSeason: number;   // Kc during late season / maturation
}

export interface CropData {
    name: string;
    kc: CropStageKc;
    depletionFactor: number;  // Critical depletion factor (p) - 0 to 1
    rootDepth: number;        // Typical root depth in cm
    rootDepthByStage: [number, number, number];  // Root depths in meters: [initial/development, mid-season, late-season]
}

/**
 * Crop Coefficient Database
 * Values from FAO Irrigation and Drainage Paper 56
 */
export const CROP_DATABASE: Record<string, CropData> = {
    rice: {
        name: 'Rice',
        kc: {
            initial: 1.05,
            development: 1.10,
            midSeason: 1.20,
            lateSeason: 0.90
        },
        depletionFactor: 0.20,  // Rice is sensitive to water stress
        rootDepth: 50,
        rootDepthByStage: [0.20, 0.30, 0.35]
    },
    wheat: {
        name: 'Wheat',
        kc: {
            initial: 0.30,
            development: 0.75,
            midSeason: 1.15,
            lateSeason: 0.40
        },
        depletionFactor: 0.55,  // More tolerant to depletion
        rootDepth: 100,
        rootDepthByStage: [0.30, 1.00, 1.20]
    },
    maize: {
        name: 'Maize',
        kc: {
            initial: 0.40,
            development: 0.80,
            midSeason: 1.20,
            lateSeason: 0.60
        },
        depletionFactor: 0.55,
        rootDepth: 100,
        rootDepthByStage: [0.30, 1.20, 1.50]
    },
    sugarcane: {
        name: 'Sugarcane',
        kc: {
            initial: 0.40,
            development: 0.75,
            midSeason: 1.25,
            lateSeason: 0.75
        },
        depletionFactor: 0.65,  // High tolerance
        rootDepth: 120,
        rootDepthByStage: [0.40, 1.50, 1.80]
    },
    tomato: {
        name: 'Tomato',
        kc: {
            initial: 0.60,
            development: 0.90,
            midSeason: 1.15,
            lateSeason: 0.80
        },
        depletionFactor: 0.40,  // Sensitive crop
        rootDepth: 70,
        rootDepthByStage: [0.25, 0.60, 0.80]
    },
    soybean: {
        name: 'Soybean',
        kc: {
            initial: 0.40,
            development: 0.70,
            midSeason: 1.15,
            lateSeason: 0.50
        },
        depletionFactor: 0.50,
        rootDepth: 80,
        rootDepthByStage: [0.30, 0.80, 1.00]
    },
    groundnut: {
        name: 'Groundnut',
        kc: {
            initial: 0.40,
            development: 0.70,
            midSeason: 1.15,
            lateSeason: 0.60
        },
        depletionFactor: 0.50,
        rootDepth: 60,
        rootDepthByStage: [0.20, 0.50, 0.60]
    },
    cotton: {
        name: 'Cotton',
        kc: {
            initial: 0.35,
            development: 0.70,
            midSeason: 1.15,
            lateSeason: 0.70
        },
        depletionFactor: 0.65,
        rootDepth: 120,
        rootDepthByStage: [0.30, 1.20, 1.50]
    },
    banana: {
        name: 'Banana',
        kc: {
            initial: 0.50,
            development: 0.80,
            midSeason: 1.10,
            lateSeason: 1.00
        },
        depletionFactor: 0.35,  // Very sensitive
        rootDepth: 60,
        rootDepthByStage: [0.30, 0.50, 0.60]
    },
    potato: {
        name: 'Potato',
        kc: {
            initial: 0.50,
            development: 0.75,
            midSeason: 1.15,
            lateSeason: 0.75
        },
        depletionFactor: 0.35,  // Sensitive to water stress
        rootDepth: 60,
        rootDepthByStage: [0.25, 0.60, 0.70]
    },
    onion: {
        name: 'Onion',
        kc: {
            initial: 0.50,
            development: 0.75,
            midSeason: 1.05,
            lateSeason: 0.85
        },
        depletionFactor: 0.30,
        rootDepth: 40,
        rootDepthByStage: [0.20, 0.40, 0.50]
    },
    cabbage: {
        name: 'Cabbage',
        kc: {
            initial: 0.40,
            development: 0.75,
            midSeason: 1.05,
            lateSeason: 0.95
        },
        depletionFactor: 0.45,
        rootDepth: 50,
        rootDepthByStage: [0.20, 0.40, 0.50]
    },
    mustard: {
        name: 'Mustard',
        kc: {
            initial: 0.35,
            development: 0.70,
            midSeason: 1.10,
            lateSeason: 0.60
        },
        depletionFactor: 0.55,
        rootDepth: 70,
        rootDepthByStage: [0.25, 0.60, 0.80]
    },
    sunflower: {
        name: 'Sunflower',
        kc: {
            initial: 0.35,
            development: 0.75,
            midSeason: 1.15,
            lateSeason: 0.60
        },
        depletionFactor: 0.60,
        rootDepth: 100,
        rootDepthByStage: [0.30, 0.80, 1.20]
    }
};

/**
 * Growth Stage Enum
 */
export enum GrowthStage {
    INITIAL = 'initial',
    DEVELOPMENT = 'development',
    MID_SEASON = 'midSeason',
    LATE_SEASON = 'lateSeason'
}

/**
 * Get Crop Coefficient for specific crop and growth stage
 */
export function getCropCoefficient(crop: string, stage: GrowthStage): number {
    const cropData = CROP_DATABASE[crop.toLowerCase()];
    if (!cropData) {
        console.warn(`Crop "${crop}" not found in database. Using default Kc = 1.0`);
        return 1.0;
    }
    return cropData.kc[stage];
}

/**
 * Get Critical Depletion Factor (p) for crop
 * This is used internally for irrigation scheduling
 */
export function getCriticalDepletionFactor(crop: string): number {
    const cropData = CROP_DATABASE[crop.toLowerCase()];
    if (!cropData) {
        console.warn(`Crop "${crop}" not found. Using default depletion factor = 0.5`);
        return 0.5;
    }
    return cropData.depletionFactor;
}

/**
 * Get typical root depth for crop
 */
export function getCropRootDepth(crop: string): number {
    const cropData = CROP_DATABASE[crop.toLowerCase()];
    if (!cropData) {
        return 80; // Default root depth in cm
    }
    return cropData.rootDepth;
}

/**
 * Get root depth by growth stage (in meters)
 * Returns root depth in meters for the specific growth stage
 */
export function getCropRootDepthByStage(crop: string, stage: GrowthStage): number {
    const cropData = CROP_DATABASE[crop.toLowerCase()];
    if (!cropData) {
        return 0.8; // Default 0.8m
    }

    // Map growth stage to index: initial/development = 0, mid-season = 1, late-season = 2
    const stageIndex = stage === 'initial' || stage === 'development' ? 0 : stage === 'midSeason' ? 1 : 2;
    return cropData.rootDepthByStage[stageIndex];
}

/**
 * Get all available crops
 */
export function getAvailableCrops(): string[] {
    return Object.keys(CROP_DATABASE);
}

/**
 * Get crop display name
 */
export function getCropDisplayName(crop: string): string {
    const cropData = CROP_DATABASE[crop.toLowerCase()];
    return cropData?.name || crop;
}
