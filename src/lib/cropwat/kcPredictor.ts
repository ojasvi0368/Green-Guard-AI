/**
 * AI-Enhanced Dynamic Kc (Crop Coefficient) Predictor
 * Simulates ML model for hackathon; can be replaced with real TensorFlow.js model
 */

import { CropData, GrowthStage } from '@/types';

export interface KcPredictionInputs {
    cropType: string;
    daysSincePlanting: number;
    et0: number;
    recentTemperature: number;
    recentHumidity: number;
    soilMoisture: number;
    historicalYield?: number;
}

export interface KcPredictionResult {
    kc: number;
    etc: number; // ETc = ET₀ × Kc
    growthStage: string;
    confidence: number;
    adjustmentFactors: {
        climate: number;
        stress: number;
        microclimate: number;
    };
}

export class KcPredictor {
    private static cropDatabase: Map<string, CropData> = new Map([
        ['wheat', {
            id: 'wheat',
            name: 'Wheat',
            type: 'cereal',
            kcInit: 0.3,
            kcMid: 1.15,
            kcEnd: 0.4,
            rootDepth: 150,
            criticalDepletionFraction: 0.55,
            growthStages: [
                { name: 'Initial', durationDays: 20, kc: 0.3 },
                { name: 'Development', durationDays: 30, kc: 0.7 },
                { name: 'Mid-Season', durationDays: 50, kc: 1.15 },
                { name: 'Late Season', durationDays: 30, kc: 0.4 }
            ]
        }],
        ['rice', {
            id: 'rice',
            name: 'Rice',
            type: 'cereal',
            kcInit: 1.05,
            kcMid: 1.20,
            kcEnd: 0.75,
            rootDepth: 50,
            criticalDepletionFraction: 0.20,
            growthStages: [
                { name: 'Initial', durationDays: 30, kc: 1.05 },
                { name: 'Development', durationDays: 30, kc: 1.10 },
                { name: 'Mid-Season', durationDays: 60, kc: 1.20 },
                { name: 'Late Season', durationDays: 30, kc: 0.75 }
            ]
        }],
        ['corn', {
            id: 'corn',
            name: 'Corn (Maize)',
            type: 'cereal',
            kcInit: 0.3,
            kcMid: 1.20,
            kcEnd: 0.6,
            rootDepth: 180,
            criticalDepletionFraction: 0.55,
            growthStages: [
                { name: 'Initial', durationDays: 25, kc: 0.3 },
                { name: 'Development', durationDays: 40, kc: 0.8 },
                { name: 'Mid-Season', durationDays: 45, kc: 1.20 },
                { name: 'Late Season', durationDays: 30, kc: 0.6 }
            ]
        }],
        ['tomato', {
            id: 'tomato',
            name: 'Tomato',
            type: 'vegetable',
            kcInit: 0.6,
            kcMid: 1.15,
            kcEnd: 0.8,
            rootDepth: 150,
            criticalDepletionFraction: 0.40,
            growthStages: [
                { name: 'Initial', durationDays: 30, kc: 0.6 },
                { name: 'Development', durationDays: 40, kc: 1.0 },
                { name: 'Mid-Season', durationDays: 50, kc: 1.15 },
                { name: 'Late Season', durationDays: 30, kc: 0.8 }
            ]
        }],
    ]);

    /**
     * Predict dynamic Kc using AI-enhanced logic
     */
    static predictKc(inputs: KcPredictionInputs): KcPredictionResult {
        const cropData = this.cropDatabase.get(inputs.cropType.toLowerCase());

        if (!cropData) {
            throw new Error(`Unknown crop type: ${inputs.cropType}`);
        }

        // Determine current growth stage
        const { currentStage, stageKc } = this.determineGrowthStage(
            cropData.growthStages,
            inputs.daysSincePlanting
        );

        // Base Kc from crop database
        let baseKc = stageKc;

        // AI Enhancement: Climate adjustment factor
        const climateAdjustment = this.calculateClimateAdjustment(
            inputs.recentTemperature,
            inputs.recentHumidity,
            inputs.et0
        );

        // AI Enhancement: Stress adjustment factor
        const stressAdjustment = this.calculateStressAdjustment(
            inputs.soilMoisture,
            cropData.criticalDepletionFraction
        );

        // AI Enhancement: Microclimate adjustment (simulated ML)
        const microclimateAdjustment = this.simulateMicroclimateLearning(
            inputs.et0,
            inputs.recentTemperature,
            inputs.historicalYield
        );

        // Apply adjustments
        const adjustedKc = baseKc * climateAdjustment * stressAdjustment * microclimateAdjustment;

        // Calculate ETc
        const etc = inputs.et0 * adjustedKc;

        // Confidence score (simulated)
        const confidence = this.calculateConfidence(inputs);

        return {
            kc: Math.max(0.1, Math.min(1.5, adjustedKc)),
            etc,
            growthStage: currentStage,
            confidence,
            adjustmentFactors: {
                climate: climateAdjustment,
                stress: stressAdjustment,
                microclimate: microclimateAdjustment
            }
        };
    }

    /**
     * Determine current growth stage based on days since planting
     */
    private static determineGrowthStage(
        stages: GrowthStage[],
        daysSincePlanting: number
    ): { currentStage: string; stageKc: number } {
        let cumulativeDays = 0;

        for (const stage of stages) {
            cumulativeDays += stage.durationDays;
            if (daysSincePlanting <= cumulativeDays) {
                return {
                    currentStage: stage.name,
                    stageKc: stage.kc
                };
            }
        }

        // Past all stages - return last stage
        const lastStage = stages[stages.length - 1];
        return {
            currentStage: lastStage.name,
            stageKc: lastStage.kc
        };
    }

    /**
     * Calculate climate adjustment factor
     * High temp & low humidity → higher Kc (more evaporation)
     */
    private static calculateClimateAdjustment(
        temperature: number,
        humidity: number,
        et0: number
    ): number {
        // Temperature effect (optimal: 20-25°C)
        const tempFactor = 1 + ((temperature - 22.5) * 0.01);

        // Humidity effect (optimal: 60-70%)
        const humidityFactor = 1 + ((65 - humidity) * 0.005);

        // ET₀ effect (high ET₀ → more evaporation demand)
        const et0Factor = et0 > 5 ? 1.05 : 1.0;

        return tempFactor * humidityFactor * et0Factor;
    }

    /**
     * Calculate stress adjustment factor
     * Low soil moisture → reduce Kc (less transpiration)
     */
    private static calculateStressAdjustment(
        soilMoisture: number,
        criticalDepletion: number
    ): number {
        const criticalMoisture = criticalDepletion * 100;

        if (soilMoisture >= criticalMoisture) {
            return 1.0; // No stress
        }

        // Linear reduction below critical moisture
        const stressFactor = soilMoisture / criticalMoisture;
        return Math.max(0.5, stressFactor);
    }

    /**
     * Simulate microclimate learning (Random Forest simulation)
     * In production, this would be a real ML model
     */
    private static simulateMicroclimateLearning(
        et0: number,
        temperature: number,
        historicalYield?: number
    ): number {
        // Simulate "learned" patterns
        const random = Math.sin(et0 * temperature) * 0.1;
        const yieldInfluence = historicalYield ? (historicalYield / 5000) * 0.05 : 0;

        return 1.0 + random + yieldInfluence;
    }

    /**
     * Calculate prediction confidence
     */
    private static calculateConfidence(inputs: KcPredictionInputs): number {
        let confidence = 0.85; // Base confidence

        // More data → higher confidence
        if (inputs.historicalYield) confidence += 0.05;
        if (inputs.soilMoisture > 20) confidence += 0.05;

        // Extreme conditions → lower confidence
        if (inputs.recentTemperature > 40 || inputs.recentTemperature < 5) {
            confidence -= 0.15;
        }

        return Math.max(0.5, Math.min(0.99, confidence));
    }

    /**
     * Get crop data
     */
    static getCropData(cropType: string): CropData | undefined {
        return this.cropDatabase.get(cropType.toLowerCase());
    }

    /**
     * Get all available crops
     */
    static getAllCrops(): CropData[] {
        return Array.from(this.cropDatabase.values());
    }
}
