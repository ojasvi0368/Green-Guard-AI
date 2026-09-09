import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

/**
 * LazyPrisma Proxy
 * Defers PrismaClient instantiation until a property is accessed.
 * Returns a safe no-op if accessed during build without DATABASE_URL.
 */
const prismaClientSingleton = () => {
    if (typeof window !== 'undefined') return null as any;

    if (process.env.NODE_ENV === 'production' && !process.env.DATABASE_URL) {
        console.warn('⚠️ [Prisma] Skipping instantiation: DATABASE_URL missing during build.');
        return null;
    }

    try {
        const pool = new Pool({ connectionString: process.env.DATABASE_URL });
        const adapter = new PrismaPg(pool);
        return new PrismaClient({
            adapter,
            log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
        });
    } catch (error) {
        console.error('❌ [Prisma] Initialization failed:', error);
        return null;
    }
};

const globalForPrisma = globalThis as unknown as {
    prisma: PrismaClient | undefined;
};

// Create a proxy that lazily initializes the real client
const prismaProxy = new Proxy({} as any, {
    get: (target, prop) => {
        if (!globalForPrisma.prisma) {
            const client = prismaClientSingleton();
            if (client) {
                globalForPrisma.prisma = client;
            }
        }

        const client = globalForPrisma.prisma;

        if (!client) {
            // Return a safe no-op for build-time static collection
            if (prop === 'then' || prop === 'constructor') return undefined;
            return new Proxy(() => { }, {
                get: () => () => Promise.resolve(null),
                apply: () => Promise.resolve(null)
            });
        }

        return (client as any)[prop];
    }
});

export const prisma = prismaProxy as PrismaClient;
export default prisma;
