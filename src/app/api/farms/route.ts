/**
 * Farm API — CRUD operations
 * GET: List user's farms
 * POST: Create farm + AgroMonitoring polygon
 */

import { NextRequest, NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { AgroMonitoringService } from '@/lib/agromonitoring/agroService';

export async function GET(request: NextRequest) {
    try {
        if (!prisma) return NextResponse.json({ error: 'Database not available' }, { status: 503 });
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const userId = (session.user as any).id;

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
            orderBy: { createdAt: 'desc' },
        });

        return NextResponse.json({ farms });
    } catch (error) {
        console.error('Error fetching farms:', error);
        return NextResponse.json(
            { error: 'Failed to fetch farms' },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        if (!prisma) return NextResponse.json({ error: 'Database not available' }, { status: 503 });
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const userId = (session.user as any).id;
        const { name, location, coordinates } = await request.json();

        if (!name || !location) {
            return NextResponse.json(
                { error: 'Name and location are required' },
                { status: 400 }
            );
        }

        let polygonId: string | null = null;
        let areaHa: number | null = null;

        // If coordinates provided, create polygon on AgroMonitoring
        if (coordinates && Array.isArray(coordinates) && coordinates.length >= 3) {
            try {
                const geoJSONCoords = AgroMonitoringService.latLngToGeoJSON(coordinates);
                const polygon = await AgroMonitoringService.createPolygon(name, geoJSONCoords);
                polygonId = polygon.id;
                areaHa = polygon.area ? polygon.area / 10000 : null; // m² to hectares
                console.log('✅ AgroMonitoring polygon created:', polygonId);
            } catch (agroError: any) {
                const errorMsg = agroError?.response?.data?.message || agroError?.message || 'Unknown error';
                console.error('⚠️ AgroMonitoring polygon creation failed:', errorMsg);
                // If it's a size validation error, reject the entire request
                if (errorMsg.includes('hectares') || errorMsg.includes('area')) {
                    return NextResponse.json(
                        { error: `Polygon error: ${errorMsg}` },
                        { status: 400 }
                    );
                }
                // For other errors (e.g. API key), continue without polygon
            }
        }

        const farm = await prisma.farm.create({
            data: {
                userId,
                name,
                location,
                polygonId,
                areaHa,
            },
        });

        return NextResponse.json({ farm }, { status: 201 });
    } catch (error) {
        console.error('Error creating farm:', error);
        return NextResponse.json(
            { error: 'Failed to create farm' },
            { status: 500 }
        );
    }
}
