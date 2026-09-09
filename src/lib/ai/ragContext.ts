/**
 * RAG Context Builder
 * Fetches real farm data from PostgreSQL to inject into Gemini prompts
 */

import prisma from '@/lib/prisma';

export interface RAGContext {
    farmName: string;
    location: string;
    latestNDVI: number | null;
    ndviTrend: string;
    weather: Record<string, any> | null;
    soilMoisture: number | null;
    droughtRisk: number | null;
    recentInsights: string[];
    dataTimestamp: string | null;
}

/**
 * Build a context string from real farm data for Gemini RAG
 */
export async function buildFarmContext(farmId: string): Promise<RAGContext | null> {
    try {
        if (!prisma) return null;
        const farm = await prisma.farm.findUnique({
            where: { id: farmId },
            include: {
                farmData: {
                    orderBy: { createdAt: 'desc' },
                    take: 5,
                },
                insights: {
                    orderBy: { createdAt: 'desc' },
                    take: 3,
                },
            },
        });

        if (!farm) return null;

        const latestData = farm.farmData[0] || null;
        const previousData = farm.farmData[1] || null;

        // Determine NDVI trend
        let ndviTrend = 'stable';
        if (latestData?.ndvi != null && previousData?.ndvi != null) {
            const diff = latestData.ndvi - previousData.ndvi;
            if (diff > 0.05) ndviTrend = 'improving';
            else if (diff < -0.05) ndviTrend = 'declining';
        }

        return {
            farmName: farm.name,
            location: farm.location,
            latestNDVI: latestData?.ndvi ?? null,
            ndviTrend,
            weather: latestData?.weather as Record<string, any> | null,
            soilMoisture: latestData?.soilMoisture ?? null,
            droughtRisk: latestData?.droughtRisk ?? null,
            recentInsights: farm.insights.map((i: { insight: string }) => i.insight),
            dataTimestamp: latestData?.createdAt?.toISOString() ?? null,
        };
    } catch (error) {
        console.error('Error building RAG context:', error);
        return null;
    }
}

/**
 * Build multi-farm context for cross-farm learning
 */
export async function buildMultiFarmContext(userId: string): Promise<RAGContext[]> {
    try {
        if (!prisma) return [];
        const farms = await prisma.farm.findMany({
            where: { userId },
            include: {
                farmData: {
                    orderBy: { createdAt: 'desc' },
                    take: 2,
                },
                insights: {
                    orderBy: { createdAt: 'desc' },
                    take: 2,
                },
            },
        });

        return farms
            .map((farm: any) => {
                const latestData = farm.farmData[0] || null;
                const previousData = farm.farmData[1] || null;

                let ndviTrend = 'stable';
                if (latestData?.ndvi != null && previousData?.ndvi != null) {
                    const diff = latestData.ndvi - previousData.ndvi;
                    if (diff > 0.05) ndviTrend = 'improving';
                    else if (diff < -0.05) ndviTrend = 'declining';
                }

                return {
                    farmName: farm.name,
                    location: farm.location,
                    latestNDVI: latestData?.ndvi ?? null,
                    ndviTrend,
                    weather: latestData?.weather as Record<string, any> | null,
                    soilMoisture: latestData?.soilMoisture ?? null,
                    droughtRisk: latestData?.droughtRisk ?? null,
                    recentInsights: farm.insights.map((i: { insight: string }) => i.insight),
                    dataTimestamp: latestData?.createdAt?.toISOString() ?? null,
                };
            })
            .filter((ctx: RAGContext) => ctx.latestNDVI != null || ctx.weather != null);
    } catch (error) {
        console.error('Error building multi-farm context:', error);
        return [];
    }
}

/**
 * Format RAG context into a prompt-ready string
 */
export function formatContextForPrompt(context: RAGContext): string {
    const parts: string[] = [];

    parts.push(`Farm: ${context.farmName} (${context.location})`);

    if (context.latestNDVI != null) {
        const ndviHealth =
            context.latestNDVI > 0.6 ? 'Healthy' :
                context.latestNDVI > 0.4 ? 'Moderate' :
                    context.latestNDVI > 0.2 ? 'Stressed' : 'Critical';
        parts.push(`NDVI: ${context.latestNDVI.toFixed(3)} (${ndviHealth}, trend: ${context.ndviTrend})`);
    }

    if (context.weather) {
        const w = context.weather;
        parts.push(`Weather: Temp ${w.temp || w.main?.temp || 'N/A'}°C, Humidity ${w.humidity || w.main?.humidity || 'N/A'}%, Wind ${w.wind_speed || w.wind?.speed || 'N/A'} m/s`);
    }

    if (context.soilMoisture != null) {
        parts.push(`Soil Moisture: ${context.soilMoisture}%`);
    }

    if (context.droughtRisk != null) {
        const riskLevel =
            context.droughtRisk > 0.7 ? 'HIGH' :
                context.droughtRisk > 0.4 ? 'MODERATE' : 'LOW';
        parts.push(`Drought Risk: ${(context.droughtRisk * 100).toFixed(0)}% (${riskLevel})`);
    }

    if (context.recentInsights.length > 0) {
        parts.push(`Recent Insights: ${context.recentInsights.join('; ')}`);
    }

    if (context.dataTimestamp) {
        parts.push(`Data as of: ${new Date(context.dataTimestamp).toLocaleString()}`);
    }

    return parts.join('\n');
}
