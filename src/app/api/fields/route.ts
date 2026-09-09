import { NextRequest, NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

/**
 * Fields API — reads from REAL PostgreSQL database.
 * No in-memory mock database.
 */

export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const userId = (session.user as any)?.id;
        if (!userId) {
            return NextResponse.json({ fields: [], count: 0 });
        }

        // Get farms from real database
        const farms = await prisma.farm.findMany({
            where: { userId },
            include: {
                farmData: {
                    orderBy: { createdAt: 'desc' },
                    take: 1,
                },
            },
        });

        const fields = farms.map((farm: any) => ({
            id: farm.id,
            name: farm.name,
            area: farm.areaHa || 0,
            cropType: 'Not specified',
            location: farm.location,
            status: 'Active',
            polygonId: farm.polygonId,
            createdAt: farm.createdAt.toISOString(),
            latestData: farm.farmData[0] || null,
        }));

        return NextResponse.json({
            fields,
            count: fields.length,
        });
    } catch (error) {
        console.error('Fields GET error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch fields' },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const userId = (session.user as any)?.id;
        if (!userId) {
            return NextResponse.json({ error: 'No user ID' }, { status: 401 });
        }

        const data = await request.json();

        if (!data.name || !data.area) {
            return NextResponse.json(
                { error: 'Name and area are required' },
                { status: 400 }
            );
        }

        // Create a real farm in the database
        const newFarm = await prisma.farm.create({
            data: {
                name: data.name,
                location: data.location || 'Not specified',
                areaHa: parseFloat(data.area),
                userId,
            },
        });

        return NextResponse.json(
            {
                success: true,
                field: {
                    id: newFarm.id,
                    name: newFarm.name,
                    area: newFarm.areaHa || 0,
                    cropType: 'Not specified',
                    location: newFarm.location,
                    status: 'Active',
                    createdAt: newFarm.createdAt.toISOString(),
                },
            },
            { status: 201 }
        );
    } catch (error) {
        console.error('Fields POST error:', error);
        return NextResponse.json(
            { error: 'Failed to create field' },
            { status: 500 }
        );
    }
}
