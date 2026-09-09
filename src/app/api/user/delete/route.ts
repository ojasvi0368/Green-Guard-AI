import { NextRequest, NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { getServerSession } from 'next-auth';
import { authOptions, deleteUser } from '@/lib/auth';

/**
 * DELETE /api/user/delete
 * Deletes the currently logged-in user's account
 * Requires authentication
 */
export async function DELETE(req: NextRequest) {
    try {
        // Get session
        const session = await getServerSession(authOptions);

        // Check if user is authenticated
        if (!session || !session.user || !session.user.email) {
            return NextResponse.json(
                { error: 'Unauthorized - Please login' },
                { status: 401 }
            );
        }

        const userEmail = session.user.email;

        // Delete user from in-memory storage
        const deleted = deleteUser(userEmail);

        if (!deleted) {
            return NextResponse.json(
                { error: 'User not found' },
                { status: 404 }
            );
        }

        return NextResponse.json({
            success: true,
            message: 'Account deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting user account:', error);
        return NextResponse.json(
            { error: 'Failed to delete account' },
            { status: 500 }
        );
    }
}
