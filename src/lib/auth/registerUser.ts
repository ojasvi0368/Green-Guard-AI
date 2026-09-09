import bcrypt from 'bcryptjs';
import prisma from '@/lib/prisma';

// Register a new user with role
export async function registerUser(
    email: string,
    password: string,
    name: string,
    role: 'FARMER' | 'GOVERNMENT' | 'RESEARCHER' = 'FARMER'
) {
    console.log('Registering user:', email, 'with role:', role);

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
        where: { email },
    });

    if (existingUser) {
        throw new Error('User already exists');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
        data: {
            email,
            password: hashedPassword,
            name,
            role,
        },
    });

    console.log('User created in database. ID:', user.id);
    return user;
}
