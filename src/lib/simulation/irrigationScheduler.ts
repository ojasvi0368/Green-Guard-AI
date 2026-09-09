/**
 * Adaptive Irrigation Scheduler
 * Determines when and how much to irrigate based on soil moisture predictions
 */

import type { SoilSimulationResult, DailyPrediction } from './soilSimulation';
import { daysUntilStress } from './cropStressIndex';

export interface IrrigationRecommendation {
    isNeeded: boolean;
    scheduledDate: string | null;
    amount: number;  // mm
    amountLiters?: number;  // liters (if area provided)
    reason: string;
    daysUntilStress: number | null;
    urgency: 'none' | 'low' | 'medium' | 'high' | 'critical';
    confidence: number;  // 0-1 scale
}

export interface ScheduleIrrigationParams {
    simulationResults: SoilSimulationResult;
    stressThreshold: number;       // % moisture
    fieldCapacity: number;         // % moisture
    wiltingPoint: number;         // % moisture
    rootDepth: number;            // cm
    fieldArea?: number;           // hectares (optional, for volume calculation)
}

/**
 * Schedule irrigation based on simulation predictions
 * 
 * Logic:
 * 1. Check if any day's predicted moisture falls below stress threshold
 * 2. If yes, schedule irrigation for the day before critical threshold
 * 3. Calculate irrigation amount to bring moisture back to field capacity
 */
export function scheduleIrrigation(params: ScheduleIrrigationParams): IrrigationRecommendation {
    const {
        simulationResults,
        stressThreshold,
        fieldCapacity,
        wiltingPoint,
        rootDepth,
        fieldArea
    } = params;

    const { predictions } = simulationResults;

    // Find first day when moisture drops below stress threshold
    let criticalDayIndex = -1;
    for (let i = 0; i < predictions.length; i++) {
        if (predictions[i].moisture <= stressThreshold) {
            criticalDayIndex = i;
            break;
        }
    }

    // If no stress expected in prediction period
    if (criticalDayIndex === -1) {
        return {
            isNeeded: false,
            scheduledDate: null,
            amount: 0,
            reason: 'Soil moisture is expected to remain adequate throughout the forecast period.',
            daysUntilStress: null,
            urgency: 'none',
            confidence: 0.85
        };
    }

    // Determine urgency based on how soon stress occurs
    let urgency: 'none' | 'low' | 'medium' | 'high' | 'critical';
    if (criticalDayIndex === 0) {
        urgency = 'critical';
    } else if (criticalDayIndex === 1) {
        urgency = 'high';
    } else if (criticalDayIndex <= 2) {
        urgency = 'medium';
    } else {
        urgency = 'low';
    }

    // Schedule irrigation for the day before critical day (if possible)
    const irrigationDayIndex = Math.max(0, criticalDayIndex - 1);
    const scheduledDate = predictions[irrigationDayIndex].date;

    // Calculate irrigation amount needed
    // Goal: Bring moisture from predicted level back to field capacity
    const predictedMoisture = predictions[irrigationDayIndex].moisture;
    const moistureDeficit = fieldCapacity - predictedMoisture;

    // Convert moisture deficit (%) to depth (mm)
    // Amount (mm) = deficit (%) / 100 × root depth (cm) × 10
    let irrigationAmount = (moistureDeficit / 100) * rootDepth * 10;

    // Add 10% buffer for application efficiency
    irrigationAmount = irrigationAmount * 1.1;

    // Ensure minimum practical irrigation amount (15mm)
    irrigationAmount = Math.max(15, irrigationAmount);

    // Round to practical value
    irrigationAmount = Math.round(irrigationAmount);

    // Calculate volume if area provided
    let amountLiters: number | undefined;
    if (fieldArea) {
        // 1 hectare = 10,000 m²
        // 1 mm over 1 m² = 1 liter
        amountLiters = irrigationAmount * fieldArea * 10000;
    }

    // Generate reason
    const reason = generateIrrigationReason(
        criticalDayIndex,
        predictedMoisture,
        stressThreshold,
        wiltingPoint
    );

    // Confidence decreases for predictions further in the future
    const confidence = Math.max(0.6, 0.95 - (criticalDayIndex * 0.05));

    return {
        isNeeded: true,
        scheduledDate,
        amount: irrigationAmount,
        amountLiters,
        reason,
        daysUntilStress: criticalDayIndex,
        urgency,
        confidence: Math.round(confidence * 100) / 100
    };
}

/**
 * Generate human-readable reason for irrigation recommendation
 */
function generateIrrigationReason(
    daysUntilStress: number,
    predictedMoisture: number,
    stressThreshold: number,
    wiltingPoint: number
): string {
    if (daysUntilStress === 0) {
        return `Soil moisture is at or below stress threshold (${predictedMoisture.toFixed(1)}%). Immediate irrigation is required to prevent crop water stress.`;
    }

    if (daysUntilStress === 1) {
        return `Soil moisture is predicted to drop below stress threshold tomorrow (${predictedMoisture.toFixed(1)}%). Irrigate today to maintain optimal crop health.`;
    }

    const severity = predictedMoisture < wiltingPoint + 5 ? 'severe' : 'moderate';

    return `Soil moisture is predicted to drop below stress threshold in ${daysUntilStress} days, reaching ${predictedMoisture.toFixed(1)}%. Schedule irrigation now to prevent ${severity} water stress.`;
}

/**
 * Calculate optimal irrigation depth to refill soil to field capacity
 */
export function calculateRefillAmount(
    currentMoisture: number,
    fieldCapacity: number,
    rootDepth: number,
    efficiency: number = 0.9  // 90% application efficiency
): number {
    const deficit = fieldCapacity - currentMoisture;
    const amountMM = (deficit / 100) * rootDepth * 10;

    // Account for application efficiency
    const adjustedAmount = amountMM / efficiency;

    return Math.max(0, Math.round(adjustedAmount));
}

/**
 * Suggest irrigation scheduling strategy based on crop and season
 */
export function suggestIrrigationStrategy(params: {
    cropType: string;
    growthStage: 'initial' | 'development' | 'midSeason' | 'lateSeason';
    season: 'summer' | 'monsoon' | 'winter';
}): {
    frequency: string;
    depth: string;
    method: string;
    notes: string;
} {
    const { cropType, growthStage, season } = params;

    // Default strategy
    const strategy = {
        frequency: 'Every 5-7 days',
        depth: 'Light to moderate (20-30mm)',
        method: 'Drip or sprinkler irrigation',
        notes: 'Monitor soil moisture regularly and adjust based on weather conditions.'
    };

    // Adjust for growth stage
    if (growthStage === 'initial') {
        strategy.frequency = 'Every 3-4 days';
        strategy.depth = 'Light (15-20mm)';
        strategy.notes = 'Frequent light irrigation during establishment phase.';
    } else if (growthStage === 'midSeason') {
        strategy.frequency = 'Every 4-6 days';
        strategy.depth = 'Moderate to heavy (30-40mm)';
        strategy.notes = 'Peak water demand period. Ensure adequate soil moisture.';
    } else if (growthStage === 'lateSeason') {
        strategy.frequency = 'Every 7-10 days';
        strategy.depth = 'Light to moderate (20-30mm)';
        strategy.notes = 'Reduce irrigation as crop approaches maturity.';
    }

    // Adjust for season
    if (season === 'summer') {
        strategy.frequency = strategy.frequency.replace(/(\d+)-(\d+)/, (match, min, max) =>
            `${Math.max(1, parseInt(min) - 1)}-${Math.max(1, parseInt(max) - 1)}`
        );
        strategy.notes += ' Increase frequency during hot, dry summer months.';
    } else if (season === 'monsoon') {
        strategy.frequency = 'As needed (monitor rainfall)';
        strategy.depth = 'Supplemental only';
        strategy.notes = 'Reduce or skip irrigation during rainy season. Monitor soil saturation.';
    }

    // Crop-specific adjustments
    if (cropType.toLowerCase() === 'rice') {
        strategy.method = 'Flood irrigation or continuous saturation';
        strategy.notes = 'Rice requires standing water during most growth stages.';
    } else if (cropType.toLowerCase() === 'potato' || cropType.toLowerCase() === 'tomato') {
        strategy.method = 'Drip irrigation (preferred)';
        strategy.notes += ' Avoid overhead irrigation to reduce disease risk.';
    }

    return strategy;
}

/**
 * Evaluate irrigation scheduling options
 */
export function evaluateScheduleOptions(
    predictions: DailyPrediction[],
    stressThreshold: number,
    fieldCapacity: number
): {
    optionA: { date: string; amount: number; score: number };
    optionB: { date: string; amount: number; score: number };
    recommended: 'A' | 'B';
} {
    // Find first stress day
    const stressDayIndex = predictions.findIndex(p => p.moisture <= stressThreshold);

    if (stressDayIndex === -1) {
        // No stress predicted - no immediate irrigation needed
        return {
            optionA: { date: predictions[predictions.length - 1].date, amount: 0, score: 100 },
            optionB: { date: predictions[predictions.length - 1].date, amount: 0, score: 100 },
            recommended: 'A'
        };
    }

    // Option A: Irrigate day before stress
    const optionAIndex = Math.max(0, stressDayIndex - 1);
    const optionAAmount = Math.round((fieldCapacity - predictions[optionAIndex].moisture) * 10);

    // Option B: Irrigate today (earlier)
    const optionBIndex = 0;
    const optionBAmount = Math.round((fieldCapacity - predictions[optionBIndex].moisture) * 10);

    // Score options (higher is better)
    const optionAScore = 100 - (stressDayIndex * 10);  // Penalty for waiting
    const optionBScore = 85;  // Earlier is safer but may waste water

    return {
        optionA: {
            date: predictions[optionAIndex].date,
            amount: Math.max(15, optionAAmount),
            score: Math.max(0, optionAScore)
        },
        optionB: {
            date: predictions[optionBIndex].date,
            amount: Math.max(15, optionBAmount),
            score: optionBScore
        },
        recommended: optionAScore >= optionBScore ? 'A' : 'B'
    };
}
