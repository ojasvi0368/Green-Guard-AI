/**
 * AgroMonitoring Proxy API
 * Fetches weather/NDVI data for a farm's polygon
 */

import { NextRequest, NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { AgroMonitoringService } from '@/lib/agromonitoring/agroService';
import prisma from '@/lib/prisma';

export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const farmId = searchParams.get('farmId');
        const dataType = searchParams.get('type') || 'weather'; // 'weather' | 'ndvi' | 'soil'

        if (!farmId) {
            return NextResponse.json(
                { error: 'farmId is required' },
                { status: 400 }
            );
        }

        if (!prisma) return NextResponse.json({ error: 'Database not available during build' }, { status: 503 });
        const farm = await prisma.farm.findUnique({
            where: { id: farmId },
        });

        if (!farm) {
            return NextResponse.json({ error: 'Farm not found' }, { status: 404 });
        }

        if (!farm.polygonId) {
            console.error(`❌ Farm ${farmId} has no polygonId`);
            return NextResponse.json(
                { error: 'Farm has no polygon registered with AgroMonitoring' },
                { status: 400 }
            );
        }

        console.log(`🛰️ Agro API: Using polygon ${farm.polygonId} for farm ${farm.name}`);

        let data: any;

        switch (dataType) {
            case 'weather':
                data = await AgroMonitoringService.getWeather(farm.polygonId);
                break;
            case 'ndvi':
                data = await AgroMonitoringService.getNDVI(farm.polygonId);
                break;
            case 'soil':
                data = await AgroMonitoringService.getSoilData(farm.polygonId);
                break;
            case 'forecast':
                data = await AgroMonitoringService.getWeatherForecast(farm.polygonId);
                break;
            default:
                return NextResponse.json(
                    { error: 'Invalid type. Use: weather, ndvi, soil, forecast' },
                    { status: 400 }
                );
        }

        // Optionally store in database as FarmData
        if (dataType === 'weather' || dataType === 'ndvi' || dataType === 'soil') {
            try {
                const updateData: any = {};
                if (dataType === 'weather') {
                    updateData.weather = data;
                } else if (dataType === 'ndvi' && Array.isArray(data) && data.length > 0) {
                    const latestNDVI = data[data.length - 1];
                    updateData.ndvi = latestNDVI?.data?.mean || null;
                } else if (dataType === 'soil') {
                    // AgroMonitoring soil moisture is a decimal (0-1)
                    updateData.soilMoisture = (data.moisture || 0) * 100;
                }

                if (prisma) {
                    await prisma.farmData.create({
                        data: {
                            farmId,
                            ...updateData,
                        },
                    });
                }
            } catch (dbError) {
                console.warn('⚠️ Could not store data in DB:', dbError);
            }
        }

        return NextResponse.json({ data, farmId, type: dataType });
    } catch (error: any) {
        console.error('AgroMonitoring API error:', error?.message || error);

        // Distinguish between config errors and API errors
        if (error?.message?.includes('AGROMONITORING_API_KEY')) {
            return NextResponse.json(
                {
                    error: 'AgroMonitoring API key not configured',
                    details: 'Set AGROMONITORING_API_KEY in .env.local with a key from https://agromonitoring.com/',
                    configError: true,
                },
                { status: 503 }
            );
        }

        // Axios 401/403 from AgroMonitoring = bad API key
        if (error?.response?.status === 401 || error?.response?.status === 403) {
            return NextResponse.json(
                {
                    error: 'AgroMonitoring API key is invalid or expired',
                    details: 'Check your AGROMONITORING_API_KEY in .env.local',
                    configError: true,
                },
                { status: 503 }
            );
        }

        return NextResponse.json(
            { error: 'Failed to fetch AgroMonitoring data', details: error?.message },
            { status: 500 }
        );
    }
}
