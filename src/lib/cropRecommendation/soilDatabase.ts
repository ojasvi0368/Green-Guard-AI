/**
 * Soil Database with Standard Properties
 * Used for Crop Recommendation System
 */

export interface SoilProperties {
    soilType: string;
    pH: number;
    organicCarbon: number; // %
    nitrogen: number; // kg/ha
    phosphorus: number; // kg/ha
    potassium: number; // kg/ha
    ec: number; // dS/m (Electrical Conductivity)
}

/**
 * Standard soil property values
 * Based on agricultural soil science standards
 */
export const SOIL_PROPERTY_DEFAULTS: Record<string, SoilProperties> = {
    sandy: {
        soilType: 'Sandy',
        pH: 6.5,
        organicCarbon: 0.3,
        nitrogen: 120,
        phosphorus: 15,
        potassium: 80,
        ec: 0.4
    },
    loamy: {
        soilType: 'Loamy',
        pH: 6.8,
        organicCarbon: 0.8,
        nitrogen: 200,
        phosphorus: 25,
        potassium: 150,
        ec: 0.6
    },
    clay: {
        soilType: 'Clay',
        pH: 7.2,
        organicCarbon: 1.2,
        nitrogen: 250,
        phosphorus: 30,
        potassium: 200,
        ec: 0.8
    },
    silty: {
        soilType: 'Silty',
        pH: 7.0,
        organicCarbon: 1.0,
        nitrogen: 220,
        phosphorus: 28,
        potassium: 180,
        ec: 0.7
    }
};

export type WaterSource = 'canal' | 'tubewell' | 'openwell';
export type WaterClass = 'high' | 'medium-high' | 'medium';

export const WATER_SOURCE_MAPPING: Record<WaterSource, WaterClass> = {
    canal: 'high',
    tubewell: 'medium-high',
    openwell: 'medium'
};

export type CropSeason = 'kharif' | 'rabi' | 'zaid';
export type Topology = 'flat' | 'sloppy';

export function getSoilProperties(soilType: string): SoilProperties | null {
    return SOIL_PROPERTY_DEFAULTS[soilType.toLowerCase()] || null;
}

export function getWaterClass(source: WaterSource): WaterClass {
    return WATER_SOURCE_MAPPING[source];
}
