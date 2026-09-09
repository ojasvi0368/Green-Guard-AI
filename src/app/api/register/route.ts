import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { registerUser } from '@/lib/auth/registerUser';

export async function POST(request: Request) {
    try {
        const { name, email, password, role } = await request.json();

        if (!name || !email || !password) {
            return NextResponse.json(
                { message: 'Missing required fields' },
                { status: 400 }
            );
        }

        // Validate role if provided
        const validRoles = ['FARMER', 'GOVERNMENT', 'RESEARCHER'];
        const userRole = role && validRoles.includes(role) ? role : 'FARMER';

        await registerUser(email, password, name, userRole);

        return NextResponse.json(
            { message: 'User registered successfully' },
            { status: 201 }
        );
    } catch (error) {
        if (error instanceof Error && error.message === 'User already exists') {
            return NextResponse.json(
                { message: 'An account with this email already exists' },
                { status: 409 }
            );
        }
        console.error('Registration error:', error);
        return NextResponse.json(
            { message: 'Registration failed' },
            { status: 500 }
        );
    }
}
