/**
 * Government Dashboard API
 * Aggregated statistics across all farms for government users
 */

import { NextRequest, NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const role = (session.user as any).role;
        if (role !== 'GOVERNMENT') {
            return NextResponse.json({ error: 'Forbidden — Government access only' }, { status: 403 });
        }

        // Aggregate data
        const [
            totalFarms,
            totalFarmers,
            recentFarmData,
            recentInsights,
            farmsByState,
        ] = await Promise.all([
            prisma.farm.count(),
            prisma.user.count({ where: { role: 'FARMER' } }),
            prisma.farmData.findMany({
                orderBy: { createdAt: 'desc' },
                take: 50,
                include: {
                    farm: {
                        select: { name: true, location: true, areaHa: true },
                    },
                },
            }),
            prisma.insight.findMany({
                orderBy: { createdAt: 'desc' },
                take: 20,
                include: {
                    farm: {
                        select: { name: true, location: true },
                    },
                },
            }),
            prisma.farm.groupBy({
                by: ['location'],
                _count: { id: true },
                _avg: { areaHa: true },
            }),
        ]);

        // Compute averages from recent data
        const ndviValues = recentFarmData
            .filter((d: any) => d.ndvi != null)
            .map((d: any) => d.ndvi as number);
        const moistureValues = recentFarmData
            .filter((d: any) => d.soilMoisture != null)
            .map((d: any) => d.soilMoisture as number);
        const droughtValues = recentFarmData
            .filter((d: any) => d.droughtRisk != null)
            .map((d: any) => d.droughtRisk as number);

        const avg = (arr: number[]) => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : null;

        // Risk breakdown
        const highRisk = droughtValues.filter((v: number) => v > 0.7).length;
        const medRisk = droughtValues.filter((v: number) => v > 0.4 && v <= 0.7).length;
        const lowRisk = droughtValues.filter((v: number) => v <= 0.4).length;

        const dashboard = {
            overview: {
                totalFarms,
                totalFarmers,
                avgNDVI: avg(ndviValues),
                avgSoilMoisture: avg(moistureValues),
                avgDroughtRisk: avg(droughtValues),
            },
            riskBreakdown: {
                high: highRisk,
                moderate: medRisk,
                low: lowRisk,
            },
            farmsByRegion: farmsByState.map((g: any) => ({
                region: g.location,
                count: g._count.id,
                avgArea: g._avg.areaHa,
            })),
            recentAlerts: recentInsights
                .filter((i: any) => i.riskLevel === 'poor' || i.riskLevel === 'critical')
                .slice(0, 10)
                .map((i: any) => ({
                    farmName: i.farm.name,
                    location: i.farm.location,
                    riskLevel: i.riskLevel,
                    insight: i.insight.substring(0, 200),
                    date: i.createdAt,
                })),
            timestamp: new Date().toISOString(),
        };

        return NextResponse.json(dashboard);
    } catch (error) {
        console.error('Government dashboard error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch dashboard data' },
            { status: 500 }
        );
    }
}
