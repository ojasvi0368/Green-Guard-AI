/**
 * Crop Water Stress Index Calculator
 * Calculates normalized stress index based on soil moisture
 */

export type StressStatus = 'optimal' | 'mild_stress' | 'moderate_stress' | 'severe_stress' | 'critical';

export interface StressIndexResult {
    currentIndex: number;      // 0-1 scale (0 = wilting point, 1 = field capacity)
    status: StressStatus;
    description: string;
    predictedIndices?: {
        date: string;
        index: number;
        status: StressStatus;
    }[];
}

/**
 * Calculate normalized crop water stress index
 * 
 * Formula: CWSI = (θ - θwp) / (θfc - θwp)
 * Where:
 *   θ = current soil moisture
 *   θwp = wilting point
 *   θfc = field capacity
 * 
 * Result:
 *   1.0 = optimal (at field capacity)
 *   0.0 = severe stress (at wilting point)
 */
export function calculateStressIndex(
    soilMoisture: number,
    wiltingPoint: number,
    fieldCapacity: number
): number {
    // Validate inputs
    if (fieldCapacity <= wiltingPoint) {
        throw new Error('Field capacity must be greater than wilting point');
    }

    // Calculate normalized index
    const index = (soilMoisture - wiltingPoint) / (fieldCapacity - wiltingPoint);

    // Clamp to 0-1 range
    return Math.max(0, Math.min(1, index));
}

/**
 * Get stress status classification based on stress index
 */
export function getStressStatus(stressIndex: number): StressStatus {
    if (stressIndex >= 0.8) return 'optimal';
    if (stressIndex >= 0.6) return 'mild_stress';
    if (stressIndex >= 0.4) return 'moderate_stress';
    if (stressIndex >= 0.2) return 'severe_stress';
    return 'critical';
}

/**
 * Get human-readable description for stress status
 */
export function getStressDescription(status: StressStatus): string {
    const descriptions: Record<StressStatus, string> = {
        optimal: 'Soil moisture is optimal. No irrigation needed.',
        mild_stress: 'Mild water stress. Monitor closely, irrigation may be needed soon.',
        moderate_stress: 'Moderate water stress. Irrigation recommended within 1-2 days.',
        severe_stress: 'Severe water stress. Immediate irrigation required.',
        critical: 'Critical water stress. Crop damage likely. Irrigate immediately!'
    };

    return descriptions[status];
}

/**
 * Calculate complete stress index result with status and description
 */
export function analyzeStress(
    soilMoisture: number,
    wiltingPoint: number,
    fieldCapacity: number
): StressIndexResult {
    const index = calculateStressIndex(soilMoisture, wiltingPoint, fieldCapacity);
    const status = getStressStatus(index);
    const description = getStressDescription(status);

    return {
        currentIndex: Math.round(index * 100) / 100,
        status,
        description
    };
}

/**
 * Analyze stress trend over multiple predictions
 */
export function analyzeStressTrend(
    predictions: { date: string; moisture: number }[],
    wiltingPoint: number,
    fieldCapacity: number
): StressIndexResult {
    if (predictions.length === 0) {
        throw new Error('At least one prediction is required for trend analysis');
    }

    // Calculate current (first day) stress
    const current = predictions[0];
    const currentIndex = calculateStressIndex(current.moisture, wiltingPoint, fieldCapacity);
    const status = getStressStatus(currentIndex);
    const description = getStressDescription(status);

    // Calculate predicted indices for all days
    const predictedIndices = predictions.map(pred => {
        const index = calculateStressIndex(pred.moisture, wiltingPoint, fieldCapacity);
        return {
            date: pred.date,
            index: Math.round(index * 100) / 100,
            status: getStressStatus(index)
        };
    });

    return {
        currentIndex: Math.round(currentIndex * 100) / 100,
        status,
        description,
        predictedIndices
    };
}

/**
 * Determine if irrigation is needed based on stress threshold
 */
export function needsIrrigation(
    soilMoisture: number,
    stressThreshold: number,
    wiltingPoint: number,
    fieldCapacity: number
): {
    needed: boolean;
    urgency: 'none' | 'low' | 'medium' | 'high' | 'critical';
    reason: string;
} {
    const index = calculateStressIndex(soilMoisture, wiltingPoint, fieldCapacity);
    const thresholdIndex = calculateStressIndex(stressThreshold, wiltingPoint, fieldCapacity);

    // Determine if irrigation is needed
    const needed = soilMoisture <= stressThreshold;

    // Calculate urgency based on how far below threshold
    let urgency: 'none' | 'low' | 'medium' | 'high' | 'critical' = 'none';
    let reason = 'Soil moisture is adequate';

    if (needed) {
        if (index <= 0.2) {
            urgency = 'critical';
            reason = 'Soil moisture is critically low. Immediate irrigation required to prevent crop damage.';
        } else if (index <= 0.4) {
            urgency = 'high';
            reason = 'Soil moisture is well below stress threshold. Irrigate as soon as possible.';
        } else if (index <= 0.6) {
            urgency = 'medium';
            reason = 'Soil moisture is approaching stress threshold. Plan irrigation within 1-2 days.';
        } else {
            urgency = 'low';
            reason = 'Soil moisture is slightly below optimal. Irrigation should be scheduled soon.';
        }
    }

    return { needed, urgency, reason };
}

/**
 * Calculate days until stress threshold is reached
 * Based on predicted moisture decline rate
 */
export function daysUntilStress(
    predictions: { date: string; moisture: number }[],
    stressThreshold: number
): number | null {
    for (let i = 0; i < predictions.length; i++) {
        if (predictions[i].moisture <= stressThreshold) {
            return i; // Day index (0 = today, 1 = tomorrow, etc.)
        }
    }
    return null; // Stress threshold not reached in prediction period
}
