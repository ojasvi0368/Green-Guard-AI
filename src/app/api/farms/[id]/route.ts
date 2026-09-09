/**
 * Single Farm API — GET, PUT, DELETE
 */

import { NextRequest, NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { AgroMonitoringService } from '@/lib/agromonitoring/agroService';

export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const farm = await prisma.farm.findUnique({
            where: { id: params.id },
            include: {
                farmData: {
                    orderBy: { createdAt: 'desc' },
                    take: 10,
                },
                insights: {
                    orderBy: { createdAt: 'desc' },
                    take: 5,
                },
            },
        });

        if (!farm) {
            return NextResponse.json({ error: 'Farm not found' }, { status: 404 });
        }

        // Verify ownership
        if (farm.userId !== (session.user as any).id) {
            const userRole = (session.user as any).role;
            // Government users can view any farm
            if (userRole !== 'GOVERNMENT') {
                return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
            }
        }

        return NextResponse.json({ farm });
    } catch (error) {
        console.error('Error fetching farm:', error);
        return NextResponse.json(
            { error: 'Failed to fetch farm' },
            { status: 500 }
        );
    }
}

export async function PUT(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const userId = (session.user as any).id;
        const existing = await prisma.farm.findUnique({
            where: { id: params.id },
        });

        if (!existing || existing.userId !== userId) {
            return NextResponse.json({ error: 'Farm not found' }, { status: 404 });
        }

        const { name, location } = await request.json();

        const farm = await prisma.farm.update({
            where: { id: params.id },
            data: {
                ...(name && { name }),
                ...(location && { location }),
            },
        });

        return NextResponse.json({ farm });
    } catch (error) {
        console.error('Error updating farm:', error);
        return NextResponse.json(
            { error: 'Failed to update farm' },
            { status: 500 }
        );
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const userId = (session.user as any).id;
        const existing = await prisma.farm.findUnique({
            where: { id: params.id },
        });

        if (!existing || existing.userId !== userId) {
            return NextResponse.json({ error: 'Farm not found' }, { status: 404 });
        }

        // Delete polygon from AgroMonitoring if exists
        if (existing.polygonId) {
            try {
                await AgroMonitoringService.deletePolygon(existing.polygonId);
            } catch (agroError) {
                console.warn('⚠️ Could not delete AgroMonitoring polygon:', agroError);
            }
        }

        await prisma.farm.delete({
            where: { id: params.id },
        });

        return NextResponse.json({ message: 'Farm deleted' });
    } catch (error) {
        console.error('Error deleting farm:', error);
        return NextResponse.json(
            { error: 'Failed to delete farm' },
            { status: 500 }
        );
    }
}
