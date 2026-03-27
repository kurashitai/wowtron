import { PrismaPg } from '@prisma/adapter-pg';

type PrismaClientLike = {
  $disconnect?: () => Promise<void>;
};

type GlobalForPrisma = typeof globalThis & {
  prisma?: PrismaClientLike;
};

const globalForPrisma = globalThis as GlobalForPrisma;

function createPrismaClient(): PrismaClientLike | null {
  try {
    const prismaModule = require('@prisma/client');
    const PrismaClient = prismaModule?.PrismaClient;
    if (!PrismaClient) return null;
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      return new PrismaClient({ log: ['query'] });
    }

    const adapter = new PrismaPg({ connectionString });
    return new PrismaClient({ adapter, log: ['query'] });
  } catch {
    // Prisma client is optional in local/dev environments where `prisma generate` was not run.
    return null;
  }
}

export const db = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production' && db) {
  globalForPrisma.prisma = db;
}
