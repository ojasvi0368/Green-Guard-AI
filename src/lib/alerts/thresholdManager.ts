/**
 * Adaptive Alert Threshold Manager
 * Dynamically adjusts alert thresholds based on context
 */

import { Alert, CropData } from '@/types';

export interface ThresholdConfig {
    cropSensitivity: number; // 0-1
    growthStageMultiplier: number; // 0.5-1.5
    weatherVolatility: number; // 0-1
}

export class ThresholdManager {
    /**
     * Calculate dynamic soil moisture threshold
     */
    static calculateDynamicThreshold(
        cropData: CropData,
        growthStage: string,
        recentWeatherVariance: number,
        baseThreshold: number = 40
    ): number {
        // Adjust for crop sensitivity
        const cropAdjustment = 1 - (cropData.criticalDepletionFraction * 0.3);

        // Adjust for growth stage (mid-season more sensitive)
        const stageAdjustment = growthStage.includes('Mid') ? 1.2 : 1.0;

        // Adjust for weather volatility (higher variance → higher threshold)
        const weatherAdjustment = 1 + (recentWeatherVariance * 0.2);

        const adjustedThreshold = baseThreshold * cropAdjustment * stageAdjustment * weatherAdjustment;

        return Math.max(20, Math.min(60, adjustedThreshold));
    }

    /**
     * Calculate alert severity score
     */
    static calculateSeverityScore(
        currentMoisture: number,
        threshold: number,
        rateOfChange: number, // %/day
        daysToWiltingPoint: number,
        forecastedHeatStress: boolean
    ): { severity: Alert['severity']; score: number } {
        let score = 0;

        // Moisture level contribution (0-40 points)
        const moistureDeficit = Math.max(0, threshold - currentMoisture);
        score += Math.min(40, (moistureDeficit / threshold) * 40);

        // Rate of depletion contribution (0-30 points)
        if (rateOfChange < 0) {
            score += Math.min(30, Math.abs(rateOfChange) * 3);
        }

        // Time urgency contribution (0-20 points)
        if (daysToWiltingPoint < 5) {
            score += Math.min(20, (5 - daysToWiltingPoint) * 5);
        }

        // Heat stress bonus (0-10 points)
        if (forecastedHeatStress) {
            score += 10;
        }

        // Determine severity level
        let severity: Alert['severity'];
        if (score >= 75) severity = 'critical';
        else if (score >= 50) severity = 'high';
        else if (score >= 25) severity = 'medium';
        else severity = 'low';

        return { severity, score };
    }

    /**
     * Determine optimal alert timing
     */
    static getOptimalAlertTime(
        userPreferences: {
            timezone: string;
            quietHoursStart: number; // hour (0-23)
            quietHoursEnd: number;
        },
        alertUrgency: number // 0-100
    ): Date {
        const now = new Date();
        const currentHour = now.getHours();

        // Critical alerts send immediately
        if (alertUrgency >= 75) {
            return now;
        }

        // Check if in quiet hours
        const inQuietHours =
            currentHour >= userPreferences.quietHoursStart ||
            currentHour < userPreferences.quietHoursEnd;

        if (inQuietHours && alertUrgency < 50) {
            // Schedule for end of quiet hours
            const scheduledTime = new Date();
            scheduledTime.setHours(userPreferences.quietHoursEnd, 0, 0, 0);

            // If that's passed, schedule for tomorrow
            if (scheduledTime < now) {
                scheduledTime.setDate(scheduledTime.getDate() + 1);
            }

            return scheduledTime;
        }

        return now;
    }

    /**
     * Create alert from conditions
     */
    static createAlert(
        type: Alert['type'],
        severity: Alert['severity'],
        severityScore: number,
        context: {
            soilMoisture?: number;
            cropType?: string;
            temperature?: number;
            nextIrrigation?: Date;
        }
    ): Alert {
        const messages = this.getAlertMessages(type, severity, context);

        return {
            id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            timestamp: new Date(),
            type,
            severity,
            severityScore,
            title: messages.title,
            message: messages.message,
            actionRequired: severity === 'critical' || severity === 'high',
            read: false
        };
    }

    /**
     * Get context-appropriate alert messages
     */
    private static getAlertMessages(
        type: Alert['type'],
        severity: Alert['severity'],
        context: any
    ): { title: string; message: string } {
        const templates: Record<Alert['type'], Record<string, { title: string; message: string }>> = {
            water_stress: {
                critical: {
                    title: 'Critical Water Stress Detected',
                    message: `Soil moisture is critically low at ${context.soilMoisture?.toFixed(1)}%. Immediate irrigation required to prevent crop damage.`
                },
                high: {
                    title: 'High Water Stress',
                    message: `Soil moisture at ${context.soilMoisture?.toFixed(1)}% is below optimal. Schedule irrigation within 12 hours.`
                },
                medium: {
                    title: 'Moderate Water Stress',
                    message: `Soil moisture at ${context.soilMoisture?.toFixed(1)}%. Consider irrigation in the next 24 hours.`
                },
                low: {
                    title: 'Water Stress Monitoring',
                    message: `Soil moisture is declining. Current level: ${context.soilMoisture?.toFixed(1)}%.`
                }
            },
            irrigation_due: {
                critical: {
                    title: 'Emergency Irrigation Needed',
                    message: `Urgent! Your ${context.cropType} requires immediate watering. Soil critically dry.`
                },
                high: {
                    title: 'Irrigation Recommended Today',
                    message: `Based on AI analysis, irrigation is recommended today for optimal crop health.`
                },
                medium: {
                    title: 'Irrigation Scheduled',
                    message: `Next irrigation scheduled for ${context.nextIrrigation ? new Date(context.nextIrrigation).toLocaleDateString() : 'soon'}.`
                },
                low: {
                    title: 'Irrigation Reminder',
                    message: `Upcoming irrigation reminder for your ${context.cropType}.`
                }
            },
            weather_warning: {
                critical: {
                    title: 'Severe Weather Alert',
                    message: `Extreme conditions forecasted. Temperature may reach ${context.temperature}°C. Take protective measures.`
                },
                high: {
                    title: 'Weather Warning',
                    message: `Adverse weather conditions expected. Monitor crops closely.`
                },
                medium: {
                    title: 'Weather Advisory',
                    message: `Weather changes forecasted. Adjust irrigation schedule accordingly.`
                },
                low: {
                    title: 'Weather Update',
                    message: `Minor weather changes detected in forecast.`
                }
            },
            anomaly: {
                critical: {
                    title: 'Critical Sensor Anomaly',
                    message: `Severe anomaly detected in soil moisture readings. Immediate sensor inspection required.`
                },
                high: {
                    title: 'Sensor Anomaly Detected',
                    message: `Unusual soil moisture pattern detected. Verify sensor functionality.`
                },
                medium: {
                    title: 'Data Anomaly',
                    message: `Minor inconsistency in sensor data. Monitoring situation.`
                },
                low: {
                    title: 'Data Notice',
                    message: `Slight variance in expected sensor readings.`
                }
            },
            sensor_malfunction: {
                critical: {
                    title: 'Sensor Malfunction',
                    message: `Sensor appears to be malfunctioning. Readings outside valid range.`
                },
                high: {
                    title: 'Sensor Issue',
                    message: `Potential sensor problem detected. Check connections.`
                },
                medium: {
                    title: 'Sensor Warning',
                    message: `Sensor readings inconsistent. Verify calibration.`
                },
                low: {
                    title: 'Sensor Notice',
                    message: `Minor sensor irregularity detected.`
                }
            }
        };

        return templates[type]?.[severity] || {
            title: 'Alert',
            message: 'Please check your dashboard for details.'
        };
    }

    /**
     * Should deduplicate alert?
     */
    static shouldDeduplicateAlert(
        newAlert: Alert,
        recentAlerts: Alert[],
        deduplicationWindow: number = 3600000 // 1 hour in ms
    ): boolean {
        const cutoffTime = new Date(Date.now() - deduplicationWindow);

        return recentAlerts.some(alert =>
            alert.type === newAlert.type &&
            alert.severity === newAlert.severity &&
            new Date(alert.timestamp) > cutoffTime
        );
    }
}
