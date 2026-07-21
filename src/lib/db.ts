import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
  _schemaVersion: number
}

const SCHEMA_VERSION = 5;

if (process.env.NODE_ENV !== 'production' && globalForPrisma._schemaVersion !== SCHEMA_VERSION) {
  if (globalForPrisma.prisma) {
    globalForPrisma.prisma.$disconnect().catch(() => {});
  }
  delete globalForPrisma.prisma;
  globalForPrisma._schemaVersion = SCHEMA_VERSION;
}

// In development: log all SQL queries to stdout + Prisma errors
// This helps debug "why is this query slow?" or "what SQL is Prisma generating?"
// In production: only errors (queries would be too noisy)
const prismaLogConfig = process.env.NODE_ENV === 'development'
  ? ['query', 'warn', 'error']
  : ['error'];

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: prismaLogConfig as any,
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
