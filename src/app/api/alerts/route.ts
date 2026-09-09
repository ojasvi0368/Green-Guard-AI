import { NextRequest, NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { ThresholdManager } from '@/lib/alerts/thresholdManager';
import prisma from '@/lib/prisma';
import { Alert } from '@/types';

/**
 * Alerts API — generates alerts from REAL farm data in PostgreSQL.
 * No mock data. Alerts are derived from the latest FarmData records.
 */

async function generateAlertsFromFarmData(userId: string): Promise<Alert[]> {
    const alerts: Alert[] = [];

    try {
        // Get user's farms with latest data
        const farms = await prisma.farm.findMany({
            where: { userId },
            include: {
                farmData: {
                    orderBy: { createdAt: 'desc' },
                    take: 1,
                },
                insights: {
                    orderBy: { createdAt: 'desc' },
                    take: 3,
                },
            },
        });

        for (const farm of farms) {
            const latestData = farm.farmData[0];
            if (!latestData) continue;

            // Drought risk alert
            if (latestData.droughtRisk !== null && latestData.droughtRisk !== undefined) {
                if (latestData.droughtRisk > 0.7) {
                    alerts.push({
                        id: `drought-${farm.id}`,
                        timestamp: latestData.createdAt,
                        type: 'water_stress',
                        severity: 'critical',
                        severityScore: Math.round(latestData.droughtRisk * 100),
                        title: `Critical Drought Risk — ${farm.name}`,
                        message: `Drought risk is ${Math.round(latestData.droughtRisk * 100)}%. Immediate irrigation required.`,
                        actionRequired: true,
                        read: false,
                    });
                } else if (latestData.droughtRisk > 0.4) {
                    alerts.push({
                        id: `drought-${farm.id}`,
                        timestamp: latestData.createdAt,
                        type: 'water_stress',
                        severity: 'medium',
                        severityScore: Math.round(latestData.droughtRisk * 100),
                        title: `Elevated Drought Risk — ${farm.name}`,
                        message: `Drought risk is ${Math.round(latestData.droughtRisk * 100)}%. Monitor soil moisture closely.`,
                        actionRequired: false,
                        read: false,
                    });
                }
            }

            // Soil moisture alert
            if (latestData.soilMoisture !== null && latestData.soilMoisture !== undefined) {
                if (latestData.soilMoisture < 25) {
                    alerts.push({
                        id: `soil-${farm.id}`,
                        timestamp: latestData.createdAt,
                        type: 'irrigation_due',
                        severity: 'high',
                        severityScore: 75,
                        title: `Low Soil Moisture — ${farm.name}`,
                        message: `Soil moisture is at ${latestData.soilMoisture.toFixed(1)}%. Irrigation recommended.`,
                        actionRequired: true,
                        read: false,
                    });
                }
            }

            // NDVI alert (poor crop health)
            if (latestData.ndvi !== null && latestData.ndvi !== undefined) {
                if (latestData.ndvi < 0.2) {
                    alerts.push({
                        id: `ndvi-${farm.id}`,
                        timestamp: latestData.createdAt,
                        type: 'anomaly',
                        severity: 'high',
                        severityScore: 70,
                        title: `Poor Crop Health — ${farm.name}`,
                        message: `NDVI is ${latestData.ndvi.toFixed(2)}, indicating poor vegetation health. Check for disease or stress.`,
                        actionRequired: true,
                        read: false,
                    });
                }
            }

            // Weather-based alerts
            if (latestData.weather && typeof latestData.weather === 'object') {
                const w = latestData.weather as any;
                if (w.main?.temp && w.main.temp > 40) {
                    alerts.push({
                        id: `heat-${farm.id}`,
                        timestamp: latestData.createdAt,
                        type: 'weather_warning',
                        severity: 'high',
                        severityScore: 60,
                        title: `Extreme Heat — ${farm.name}`,
                        message: `Temperature is ${Math.round(w.main.temp)}°C. Increase irrigation frequency.`,
                        actionRequired: true,
                        read: false,
                    });
                }
            }

            // No polygon alert
            if (!farm.polygonId) {
                alerts.push({
                    id: `nopoly-${farm.id}`,
                    timestamp: farm.createdAt,
                    type: 'sensor_malfunction',
                    severity: 'low',
                    severityScore: 20,
                    title: `No Satellite Tracking — ${farm.name}`,
                    message: `Draw a polygon on the map for ${farm.name} to enable NDVI, weather, and soil monitoring.`,
                    actionRequired: true,
                    read: false,
                });
            }
        }

        // If no farms at all
        if (farms.length === 0) {
            alerts.push({
                id: 'no-farms',
                timestamp: new Date(),
                type: 'sensor_malfunction',
                severity: 'low',
                severityScore: 10,
                title: 'No Farms Registered',
                message: 'Add your first farm to start receiving real-time monitoring alerts.',
                actionRequired: true,
                read: false,
            });
        }
    } catch (err) {
        console.error('Error generating alerts from farm data:', err);
    }

    // Sort by severity score descending
    alerts.sort((a, b) => b.severityScore - a.severityScore);
    return alerts;
}

export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        const userId = (session?.user as any)?.id;
        if (!userId) {
            return NextResponse.json({ alerts: [], unreadCount: 0 });
        }

        const alerts = await generateAlertsFromFarmData(userId);

        const { searchParams } = new URL(request.url);
        const unreadOnly = searchParams.get('unreadOnly') === 'true';

        const filtered = unreadOnly ? alerts.filter(a => !a.read) : alerts;

        return NextResponse.json({
            alerts: filtered,
            unreadCount: alerts.filter(a => !a.read).length,
        });
    } catch (error) {
        console.error('Alerts API error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch alerts' },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const action = body.action;

        if (action === 'markAsRead') {
            // In-memory only for now — a real app would persist this
            return NextResponse.json({ success: true });
        }

        if (action === 'create') {
            const { type, severity, severityScore, context } = body;
            const newAlert = ThresholdManager.createAlert(type, severity, severityScore, context);
            return NextResponse.json({ alert: newAlert, success: true });
        }

        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    } catch (error) {
        console.error('Alert action error:', error);
        return NextResponse.json(
            { error: 'Failed to process alert action' },
            { status: 500 }
        );
    }
}
