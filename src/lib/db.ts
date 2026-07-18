import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
  _schemaVersion: number
}

const SCHEMA_VERSION = 4;

if (process.env.NODE_ENV !== 'production' && globalForPrisma._schemaVersion !== SCHEMA_VERSION) {
  if (globalForPrisma.prisma) {
    globalForPrisma.prisma.$disconnect().catch(() => {});
  }
  delete globalForPrisma.prisma;
  globalForPrisma._schemaVersion = SCHEMA_VERSION;
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    // Only log errors in development, nothing in production
    ...(process.env.NODE_ENV === 'development' ? { log: ['error'] } : {}),
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db