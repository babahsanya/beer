import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
  _schemaVersion: number
}

const SCHEMA_VERSION = 3;

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
    log: ['query'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db