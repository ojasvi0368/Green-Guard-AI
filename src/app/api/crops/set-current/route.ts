import { NextRequest, NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const data = await request.json();

        if (!data.cropId) {
            return NextResponse.json(
                { error: 'Crop ID is required' },
                { status: 400 }
            );
        }

        // In a real app, save to database
        // For now, just acknowledge the request
        return NextResponse.json({
            success: true,
            message: 'Current crop updated',
            cropId: data.cropId
        });
    } catch (error) {
        console.error('Set current crop error:', error);
        return NextResponse.json(
            { error: 'Failed to update current crop' },
            { status: 500 }
        );
    }
}
