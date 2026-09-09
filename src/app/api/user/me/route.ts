import { NextRequest, NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

/**
 * GET /api/user/me
 * Fetches the currently logged-in user's information
 * Requires authentication
 */
export async function GET(req: NextRequest) {
    try {
        // Get session
        const session = await getServerSession(authOptions);

        // Check if user is authenticated
        if (!session || !session.user) {
            return NextResponse.json(
                { error: 'Unauthorized - Please login' },
                { status: 401 }
            );
        }

        // Return user data
        return NextResponse.json({
            name: session.user.name || 'Farmer',
            email: session.user.email || ''
        });
    } catch (error) {
        console.error('Error fetching user data:', error);
        return NextResponse.json(
            { error: 'Failed to fetch user data' },
            { status: 500 }
        );
    }
}
