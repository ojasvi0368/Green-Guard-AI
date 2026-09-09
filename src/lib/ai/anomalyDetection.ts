/**
 * Anomaly Detection for Soil Moisture
 * Uses K-Means clustering simulation
 */

import { SoilMoisture } from '@/types';

export interface AnomalyDetectionResult {
    isAnomaly: boolean;
    severity: number; // 0-100
    reason: string;
    recommendation: string;
}

export class AnomalyDetector {
    /**
     * Detect anomalies in soil moisture readings
     */
    static detectMoistureAnomaly(
        currentReading: SoilMoisture,
        historicalReadings: SoilMoisture[],
        expectedRange: { min: number; max: number }
    ): AnomalyDetectionResult {
        // Statistical anomaly detection
        const stats = this.calculateStatistics(historicalReadings);

        // Check multiple anomaly conditions
        const anomalies: string[] = [];
        let maxSeverity = 0;

        // 1. Out of expected range
        if (currentReading.value < expectedRange.min || currentReading.value > expectedRange.max) {
            anomalies.push('Value outside expected range');
            maxSeverity = Math.max(maxSeverity, 70);
        }

        // 2. Statistical outlier (>2 standard deviations)
        const zScore = Math.abs((currentReading.value - stats.mean) / stats.stdDev);
        if (zScore > 2) {
            anomalies.push('Statistical outlier detected');
            maxSeverity = Math.max(maxSeverity, Math.min(100, zScore * 30));
        }

        // 3. Sudden drop (sensor malfunction or leak)
        if (historicalReadings.length > 0) {
            const lastReading = historicalReadings[historicalReadings.length - 1];
            const change = currentReading.value - lastReading.value;

            if (change < -20) {
                anomalies.push('Sudden moisture drop - possible leak or sensor malfunction');
                maxSeverity = Math.max(maxSeverity, 80);
            } else if (change > 30) {
                anomalies.push('Unusual moisture spike - check sensor calibration');
                maxSeverity = Math.max(maxSeverity, 60);
            }
        }

        // 4. Impossible values
        if (currentReading.value < 0 || currentReading.value > 100) {
            anomalies.push('Invalid sensor reading');
            maxSeverity = 100;
        }

        // 5. Cluster analysis (simplified K-Means)
        const clusterAnomaly = this.detectClusterAnomaly(currentReading.value, stats);
        if (clusterAnomaly.isAnomaly) {
            anomalies.push(clusterAnomaly.reason);
            maxSeverity = Math.max(maxSeverity, clusterAnomaly.severity);
        }

        const isAnomaly = anomalies.length > 0;

        return {
            isAnomaly,
            severity: maxSeverity,
            reason: isAnomaly ? anomalies.join('; ') : 'Normal reading',
            recommendation: this.getRecommendation(anomalies, currentReading.value)
        };
    }

    /**
     * Calculate statistical measures
     */
    private static calculateStatistics(readings: SoilMoisture[]): {
        mean: number;
        stdDev: number;
        min: number;
        max: number;
    } {
        if (readings.length === 0) {
            return { mean: 50, stdDev: 10, min: 0, max: 100 };
        }

        const values = readings.map(r => r.value);
        const mean = values.reduce((sum, val) => sum + val, 0) / values.length;

        const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
        const variance = squaredDiffs.reduce((sum, val) => sum + val, 0) / values.length;
        const stdDev = Math.sqrt(variance);

        return {
            mean,
            stdDev,
            min: Math.min(...values),
            max: Math.max(...values)
        };
    }

    /**
     * Simplified K-Means cluster detection
     */
    private static detectClusterAnomaly(
        value: number,
        stats: { mean: number; stdDev: number }
    ): { isAnomaly: boolean; severity: number; reason: string } {
        // Define three clusters: Low, Normal, High
        const clusters = {
            low: { center: 25, threshold: 15 },
            normal: { center: stats.mean, threshold: stats.stdDev * 1.5 },
            high: { center: 75, threshold: 15 }
        };

        // Calculate distance to each cluster
        const distances = {
            low: Math.abs(value - clusters.low.center),
            normal: Math.abs(value - clusters.normal.center),
            high: Math.abs(value - clusters.high.center)
        };

        // Find nearest cluster
        const nearestCluster = Object.entries(distances).reduce((min, [cluster, dist]) =>
            dist < distances[min as keyof typeof distances] ? cluster : min
            , 'normal');

        const nearestDistance = distances[nearestCluster as keyof typeof distances];
        const threshold = clusters[nearestCluster as keyof typeof clusters].threshold;

        // Anomaly if too far from nearest cluster
        if (nearestDistance > threshold * 2) {
            return {
                isAnomaly: true,
                severity: Math.min(100, (nearestDistance / threshold) * 40),
                reason: 'Value does not fit typical moisture patterns'
            };
        }

        return {
            isAnomaly: false,
            severity: 0,
            reason: ''
        };
    }

    /**
     * Get recommendation based on anomaly type
     */
    private static getRecommendation(anomalies: string[], value: number): string {
        if (anomalies.length === 0) {
            return 'Continue monitoring';
        }

        const recommendations: string[] = [];

        if (anomalies.some(a => a.includes('sensor') || a.includes('Invalid'))) {
            recommendations.push('Check sensor connections and calibration');
        }

        if (anomalies.some(a => a.includes('leak'))) {
            recommendations.push('Inspect irrigation system for leaks');
        }

        if (anomalies.some(a => a.includes('spike'))) {
            recommendations.push('Verify recent irrigation events');
        }

        if (value < 20) {
            recommendations.push('Consider emergency irrigation');
        } else if (value > 80) {
            recommendations.push('Check drainage system');
        }

        recommendations.push('Review historical data trends');

        return recommendations.join('; ');
    }

    /**
     * Batch anomaly detection
     */
    static detectBatchAnomalies(
        readings: SoilMoisture[],
        expectedRange: { min: number; max: number }
    ): SoilMoisture[] {
        const anomalousReadings: SoilMoisture[] = [];

        for (let i = 1; i < readings.length; i++) {
            const historicalData = readings.slice(0, i);
            const result = this.detectMoistureAnomaly(
                readings[i],
                historicalData,
                expectedRange
            );

            if (result.isAnomaly) {
                anomalousReadings.push({
                    ...readings[i],
                    isAnomaly: true,
                    anomalySeverity: result.severity
                });
            }
        }

        return anomalousReadings;
    }
}
