/**
 * Soil Moisture Simulation Engine
 * Implements bucket soil water balance model for 7-day prediction
 */

import { calculateDailyET } from './evapotranspiration';
import type { WeatherForecast } from '@/types';

export interface SoilSimulationInput {
    currentMoisture: number;        // Current soil moisture (%)
    fieldCapacity: number;          // Maximum water holding capacity (%)
    wiltingPoint: number;          // Minimum moisture before stress (%)
    rootDepth: number;             // Root zone depth (cm)
    weatherForecast: WeatherForecast[]; // 7-day forecast
    cropKc: number;                // Crop coefficient
    soilType?: 'sandy' | 'loamy' | 'clay';
    irrigationEvents?: {           // Optional scheduled irrigations
        date: string;
        amount: number; // mm
    }[];
}

export interface DailyPrediction {
    date: string;
    moisture: number;          // Predicted moisture (%)
    et: number;               // Daily ET (mm)
    rainfall: number;         // Forecasted rain (mm)
    irrigation: number;       // Irrigation applied (mm)
    drainage: number;         // Estimated drainage loss (mm)
    deficit: number;          // Water deficit from field capacity (mm)
    moistureMM: number;       // Moisture in mm
}

export interface SoilSimulationResult {
    predictions: DailyPrediction[];
    irrigationNeeded: boolean;
    criticalDate?: string;        // When moisture hits stress threshold
    summary: {
        avgMoisture: number;
        minMoisture: number;
        maxMoisture: number;
        totalET: number;
        totalRainfall: number;
        totalIrrigation: number;
    };
}

/**
 * Convert volumetric moisture (%) to depth (mm)
 */
function moisturePercentToMM(moisturePercent: number, rootDepth: number): number {
    // moisture (mm) = moisture (%) / 100 × root depth (cm) × 10
    return (moisturePercent / 100) * rootDepth * 10;
}

/**
 * Convert moisture depth (mm) to volumetric (%)
 */
function moistureMMToPercent(moistureMM: number, rootDepth: number): number {
    // moisture (%) = moisture (mm) / (root depth (cm) × 10) × 100
    return (moistureMM / (rootDepth * 10)) * 100;
}

/**
 * Calculate drainage loss based on soil type and current moisture
 * Drainage occurs when moisture exceeds field capacity
 */
function calculateDrainage(
    moistureMM: number,
    fieldCapacityMM: number,
    soilType: 'sandy' | 'loamy' | 'clay' = 'loamy'
): number {
    if (moistureMM <= fieldCapacityMM) {
        return 0;
    }

    const excess = moistureMM - fieldCapacityMM;

    // Drainage rate depends on soil type
    const drainageRates = {
        sandy: 0.5,   // 50% of excess drains away per day (fast drainage)
        loamy: 0.3,   // 30% of excess drains away per day (moderate)
        clay: 0.1     // 10% of excess drains away per day (slow drainage)
    };

    const rate = drainageRates[soilType];
    return excess * rate;
}

/**
 * Calculate effective rainfall (accounting for runoff and deep percolation)
 */
function calculateEffectiveRainfall(rainfall: number, currentMoisture: number, fieldCapacity: number): number {
    if (rainfall === 0) return 0;

    // If soil is very dry, more rain is effective
    const moistureRatio = currentMoisture / fieldCapacity;

    let effectiveness: number;
    if (moistureRatio < 0.5) {
        effectiveness = 0.9; // 90% effective when dry
    } else if (moistureRatio < 0.8) {
        effectiveness = 0.8; // 80% effective when moderate
    } else {
        effectiveness = 0.6; // 60% effective when wet (more runoff)
    }

    return rainfall * effectiveness;
}

/**
 * Find irrigation event for a specific date
 */
function findIrrigationForDate(
    date: string,
    irrigationEvents?: { date: string; amount: number }[]
): number {
    if (!irrigationEvents) return 0;

    const event = irrigationEvents.find(e => e.date === date);
    return event?.amount || 0;
}

/**
 * Simulate soil moisture for next 7 days using water balance model
 * 
 * Water Balance Formula:
 * NextMoisture = CurrentMoisture + Rainfall + Irrigation - ET - Drainage
 */
export function simulateSoilMoisture(input: SoilSimulationInput): SoilSimulationResult {
    const {
        currentMoisture,
        fieldCapacity,
        wiltingPoint,
        rootDepth,
        weatherForecast,
        cropKc,
        soilType = 'loamy',
        irrigationEvents
    } = input;

    // Convert initial values to mm
    let moistureMM = moisturePercentToMM(currentMoisture, rootDepth);
    const fieldCapacityMM = moisturePercentToMM(fieldCapacity, rootDepth);
    const wiltingPointMM = moisturePercentToMM(wiltingPoint, rootDepth);

    const predictions: DailyPrediction[] = [];
    let criticalDate: string | undefined;

    // Simulate each day
    for (let i = 0; i < Math.min(weatherForecast.length, 7); i++) {
        const forecast = weatherForecast[i];

        // Calculate daily ET
        const etMM = calculateDailyET({
            tempMin: forecast.tempMin,
            tempMax: forecast.tempMax,
            humidity: forecast.humidity,
            cropKc
        });

        // Get rainfall
        const rainfallMM = forecast.precipitation || 0;

        // Get irrigation if scheduled
        const irrigationMM = findIrrigationForDate(forecast.date, irrigationEvents);

        // Calculate effective rainfall
        const effectiveRainMM = calculateEffectiveRainfall(
            rainfallMM,
            moistureMM,
            fieldCapacityMM
        );

        // Update moisture: add water inputs
        moistureMM = moistureMM + effectiveRainMM + irrigationMM;

        // Calculate drainage
        const drainageMM = calculateDrainage(moistureMM, fieldCapacityMM, soilType);

        // Subtract water losses
        moistureMM = moistureMM - etMM - drainageMM;

        // Ensure moisture doesn't go below 0 or above field capacity + 10%
        moistureMM = Math.max(0, Math.min(moistureMM, fieldCapacityMM * 1.1));

        // Convert back to percentage
        const moisturePercent = moistureMMToPercent(moistureMM, rootDepth);

        // Calculate deficit from field capacity
        const deficitMM = Math.max(0, fieldCapacityMM - moistureMM);

        // Check if critical threshold reached
        if (!criticalDate && moistureMM <= wiltingPointMM) {
            criticalDate = forecast.date;
        }

        predictions.push({
            date: forecast.date,
            moisture: Math.round(moisturePercent * 10) / 10,
            et: Math.round(etMM * 100) / 100,
            rainfall: Math.round(rainfallMM * 100) / 100,
            irrigation: Math.round(irrigationMM * 100) / 100,
            drainage: Math.round(drainageMM * 100) / 100,
            deficit: Math.round(deficitMM * 100) / 100,
            moistureMM: Math.round(moistureMM * 100) / 100
        });
    }

    // Calculate summary statistics
    const moistures = predictions.map(p => p.moisture);
    const summary = {
        avgMoisture: Math.round((moistures.reduce((a, b) => a + b, 0) / moistures.length) * 10) / 10,
        minMoisture: Math.min(...moistures),
        maxMoisture: Math.max(...moistures),
        totalET: Math.round(predictions.reduce((sum, p) => sum + p.et, 0) * 100) / 100,
        totalRainfall: Math.round(predictions.reduce((sum, p) => sum + p.rainfall, 0) * 100) / 100,
        totalIrrigation: Math.round(predictions.reduce((sum, p) => sum + p.irrigation, 0) * 100) / 100
    };

    // Determine if irrigation is needed
    const irrigationNeeded = summary.minMoisture < wiltingPoint + 5; // Buffer of 5%

    return {
        predictions,
        irrigationNeeded,
        criticalDate,
        summary
    };
}

/**
 * Quick simulation check - returns just if irrigation is needed
 */
export function quickIrrigationCheck(
    currentMoisture: number,
    forecastET: number[],
    forecastRain: number[],
    fieldCapacity: number,
    wiltingPoint: number,
    stressThreshold: number
): boolean {
    // Simple check: will moisture drop below threshold in next 3 days?
    let moisture = currentMoisture;

    for (let i = 0; i < Math.min(3, forecastET.length); i++) {
        moisture = moisture + (forecastRain[i] || 0) * 0.8 - forecastET[i];
        if (moisture <= stressThreshold) {
            return true;
        }
    }

    return false;
}
