/**
 * Soil Water Balance Calculator
 * Tracks soil moisture and irrigation requirements
 */

import { WaterBalance } from '@/types';

export interface WaterBalanceInputs {
    currentSoilMoisture: number; // %
    fieldCapacity: number; // %
    wiltingPoint: number; // %
    rootDepth: number; // cm
    etc: number; // mm/day
    precipitation: number; // mm
    irrigation: number; // mm
    runoff?: number; // mm
    deepPercolation?: number; // mm
}

export class WaterBalanceCalculator {
    /**
     * Calculate daily water balance
     * Soil Moisture (t+1) = Soil Moisture (t) + P + I - ETc - RO - DP
     */
    static calculateDailyBalance(inputs: WaterBalanceInputs): WaterBalance {
        const {
            currentSoilMoisture,
            fieldCapacity,
            wiltingPoint,
            rootDepth,
            etc,
            precipitation,
            irrigation,
            runoff = 0,
            deepPercolation = 0
        } = inputs;

        // Convert % moisture to mm equivalent
        const currentMoistureDepth = (currentSoilMoisture / 100) * rootDepth * 10; // mm
        const fieldCapacityDepth = (fieldCapacity / 100) * rootDepth * 10;
        const wiltingPointDepth = (wiltingPoint / 100) * rootDepth * 10;

        // Water additions
        const waterIn = precipitation + irrigation;

        // Water losses
        const waterOut = etc + runoff + deepPercolation;

        // New soil moisture depth
        let newMoistureDepth = currentMoistureDepth + waterIn - waterOut;

        // Drainage occurs if exceeds field capacity
        let actualDrainage = deepPercolation;
        if (newMoistureDepth > fieldCapacityDepth) {
            actualDrainage += newMoistureDepth - fieldCapacityDepth;
            newMoistureDepth = fieldCapacityDepth;
        }

        // Cannot go below wilting point in calculation (plant stress)
        newMoistureDepth = Math.max(wiltingPointDepth, newMoistureDepth);

        // Convert back to percentage
        const newSoilMoisture = (newMoistureDepth / (rootDepth * 10)) * 100;

        // Calculate water stress (0 = no stress, 100 = severe stress)
        const waterStress = this.calculateWaterStress(
            newSoilMoisture,
            fieldCapacity,
            wiltingPoint
        );

        // Predict days to wilting point
        const daysToWiltingPoint = this.predictDaysToWiltingPoint(
            newSoilMoisture,
            wiltingPoint,
            etc,
            0 // Assume no future rain for conservative estimate
        );

        return {
            date: new Date(),
            soilMoisture: newSoilMoisture,
            etc,
            precipitation,
            irrigation,
            drainage: actualDrainage,
            currentStress: waterStress,
            daysToWiltingPoint
        };
    }

    /**
     * Calculate water stress level
     */
    private static calculateWaterStress(
        currentMoisture: number,
        fieldCapacity: number,
        wiltingPoint: number
    ): number {
        // Readily Available Water (RAW) threshold (typically 50-60% depletion)
        const rawThreshold = fieldCapacity - (fieldCapacity - wiltingPoint) * 0.6;

        if (currentMoisture >= rawThreshold) {
            return 0; // No stress
        } else if (currentMoisture <= wiltingPoint) {
            return 100; // Severe stress
        } else {
            // Linear stress increase
            const stressRange = rawThreshold - wiltingPoint;
            const currentDepletion = rawThreshold - currentMoisture;
            return (currentDepletion / stressRange) * 100;
        }
    }

    /**
     * Predict days until wilting point
     */
    private static predictDaysToWiltingPoint(
        currentMoisture: number,
        wiltingPoint: number,
        dailyETc: number,
        expectedRainfall: number
    ): number {
        if (currentMoisture <= wiltingPoint) {
            return 0;
        }

        // Simplified: assume consistent ETc and no rain
        const moistureDeficit = currentMoisture - wiltingPoint;
        const netDailyLoss = dailyETc - expectedRainfall;

        if (netDailyLoss <= 0) {
            return 999; // Won't reach wilting point
        }

        // Convert moisture % to mm requires root depth, approximate
        return Math.ceil(moistureDeficit / (netDailyLoss / 10));
    }

    /**
     * Calculate optimal irrigation amount
     */
    static calculateIrrigationRequirement(
        currentMoisture: number,
        targetMoisture: number,
        rootDepth: number,
        irrigationEfficiency: number = 0.85
    ): number {
        // Moisture deficit in %
        const deficit = targetMoisture - currentMoisture;

        if (deficit <= 0) {
            return 0; // No irrigation needed
        }

        // Convert to mm
        const deficitMM = (deficit / 100) * rootDepth * 10;

        // Account for irrigation efficiency
        const grossIrrigation = deficitMM / irrigationEfficiency;

        return Math.ceil(grossIrrigation);
    }

    /**
     * Simulate future water balance
     */
    static simulateFuture(
        initialInputs: WaterBalanceInputs,
        days: number,
        forecastedRain: number[],
        plannedIrrigation: number[]
    ): WaterBalance[] {
        const results: WaterBalance[] = [];
        let currentMoisture = initialInputs.currentSoilMoisture;

        for (let i = 0; i < days; i++) {
            const dayInputs: WaterBalanceInputs = {
                ...initialInputs,
                currentSoilMoisture: currentMoisture,
                precipitation: forecastedRain[i] || 0,
                irrigation: plannedIrrigation[i] || 0
            };

            const balance = this.calculateDailyBalance(dayInputs);
            results.push(balance);
            currentMoisture = balance.soilMoisture;
        }

        return results;
    }
}
