import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

/**
 * Query logging is dev-only by default. In production the Prisma query log is
 * silenced unless NIVA_LOG_DB_QUERY=true is explicitly set — health-related
 * queries must never leak into production logs (risk R-05).
 */
const enableQueryLog =
  process.env.NODE_ENV !== 'production' || process.env.NIVA_LOG_DB_QUERY === 'true';

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: enableQueryLog ? ['query'] : [],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db