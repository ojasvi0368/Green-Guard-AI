import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';
import { PrismaAdapter } from '@auth/prisma-adapter';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/prisma';

export const authOptions: NextAuthOptions = {
    adapter: PrismaAdapter(prisma),
    providers: [
        CredentialsProvider({
            name: 'Credentials',
            credentials: {
                email: { label: 'Email', type: 'email' },
                password: { label: 'Password', type: 'password' },
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) {
                    console.log('Missing credentials');
                    return null;
                }

                console.log('Attempting to find user:', credentials.email);

                const user = await prisma.user.findUnique({
                    where: { email: credentials.email },
                });

                if (!user || !user.password) {
                    console.log('User not found or no password set');
                    return null;
                }

                console.log('User found, comparing passwords');
                const isPasswordValid = await bcrypt.compare(credentials.password, user.password);

                if (!isPasswordValid) {
                    console.log('Password comparison failed');
                    return null;
                }

                console.log('Authentication successful for:', user.email);
                return {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    role: user.role,
                };
            },
        }),
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID || '',
            clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
            authorization: {
                params: {
                    prompt: 'consent',
                    access_type: 'offline',
                    response_type: 'code',
                },
            },
        }),
    ],
    session: {
        strategy: 'jwt',
    },
    pages: {
        signIn: '/login',
    },
    callbacks: {
        async signIn({ user, account }) {
            // For OAuth sign-ins, ensure user has a role
            if (account?.provider === 'google') {
                const existingUser = await prisma.user.findUnique({
                    where: { email: user.email! },
                });
                if (existingUser && !existingUser.role) {
                    await prisma.user.update({
                        where: { id: existingUser.id },
                        data: { role: 'FARMER' },
                    });
                }
            }
            return true;
        },
        async jwt({ token, user }) {
            if (user) {
                token.id = user.id;
                token.role = (user as any).role || 'FARMER';
            }
            // Always fetch latest role from DB
            if (token.id && !user) {
                const dbUser = await prisma.user.findUnique({
                    where: { id: token.id as string },
                    select: { role: true },
                });
                if (dbUser) {
                    token.role = dbUser.role;
                }
            }
            return token;
        },
        async session({ session, token }) {
            if (session.user) {
                (session.user as any).id = token.id;
                (session.user as any).role = token.role;
            }
            return session;
        },
    },
    secret: process.env.NEXTAUTH_SECRET || 'development-secret-key-at-least-32-characters-long',
};

// Register User function moved to @/lib/auth/registerUser

// Delete user
export async function deleteUser(email: string): Promise<boolean> {
    console.log('Deleting user:', email);
    try {
        await prisma.user.delete({
            where: { email },
        });
        console.log('User deleted from database');
        return true;
    } catch (error) {
        console.log('User not found for deletion');
        return false;
    }
}
