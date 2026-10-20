import { PrismaClient, Prisma } from '../../node_modules/.prisma/client/index.js'

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

/**
 * Wave 6.2 client-freshness note.
 *
 * The generated client is imported DIRECTLY from its generated package
 * (node_modules/.prisma/client) instead of through the `@prisma/client`
 * wrapper. Reason: a long-lived Next dev process caches the wrapper's module
 * bundle, so after `prisma db push` + `prisma generate` the running server
 * kept serving a STALE runtime DMMF (new scalar fields like
 * `User.deactivatedAt` were rejected with PrismaClientValidationError) even
 * though the generated files on disk were fresh. Importing the generated
 * package by its own path gives the bundler a distinct module identity, and
 * the guard below re-instantiates the global singleton when the process still
 * holds a client from an older generation (checked via class identity).
 * Production behavior is identical: the same generated package, freshly read.
 */
function globalClientIsFromCurrentGeneration(client: PrismaClient): boolean {
  try {
    return client instanceof PrismaClient;
  } catch {
    return false;
  }
}

function runtimeDmmfIsFresh(): boolean {
  try {
    const userModel = Prisma.dmmf.datamodel.models.find((m) => m.name === 'User');
    return Boolean(userModel?.fields.some((f) => f.name === 'deactivatedAt'));
  } catch {
    return false;
  }
}

const existingClient = globalForPrisma.prisma;
const reuseGlobal = Boolean(existingClient && globalClientIsFromCurrentGeneration(existingClient));

if (process.env.NODE_ENV !== 'production' && !reuseGlobal) {
  console.log(`[db] instantiating PrismaClient (fresh runtime DMMF: ${runtimeDmmfIsFresh()})`);
}

export const db = existingClient && reuseGlobal
  ? existingClient
  : new PrismaClient({
      log: enableQueryLog ? ['query'] : [],
    })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
