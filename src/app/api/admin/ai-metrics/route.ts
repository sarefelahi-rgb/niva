import { db } from '@/lib/db';
import { json, withUser } from '@/lib/api';

/**
 * PHI-free AI observability aggregates for the admin dashboard (backlog 3.2).
 *
 * Reads AIUsageLog rows from the last 24h and returns request-volume, cache,
 * latency, error, provider, safety and retrieval aggregates. User identity is
 * already hashed at write time (HMAC-SHA256) and no content is ever logged, so
 * these aggregates are safe to expose to ADMIN sessions. Returns honest zeros
 * when no data exists yet.
 */

function p95(sortedLatencies: number[]): number {
  if (sortedLatencies.length === 0) return 0;
  const idx = Math.min(sortedLatencies.length - 1, Math.max(0, Math.ceil(0.95 * sortedLatencies.length) - 1));
  return sortedLatencies[idx];
}

export async function GET(req: Request) {
  return withUser(req, ['ADMIN'], async () => {
    const since = new Date(Date.now() - 24 * 3_600_000);
    const logs = await db.aIUsageLog.findMany({
      where: { createdAt: { gte: since } },
      select: {
        latencyMs: true,
        cacheHit: true,
        usedRetrieval: true,
        provider: true,
        safetyLevel: true,
        errorCode: true,
      },
    });

    const totalRequests = logs.length;
    const cacheHits = logs.filter((l) => l.cacheHit).length;
    const withRetrieval = logs.filter((l) => l.usedRetrieval).length;
    const errors = logs.filter((l) => l.errorCode).length;
    const latencies = logs.map((l) => l.latencyMs).sort((a, b) => a - b);
    const avgLatencyMs = totalRequests > 0 ? Math.round(latencies.reduce((s, n) => s + n, 0) / totalRequests) : 0;

    const tally = (key: 'provider' | 'safetyLevel'): Record<string, number> => {
      const acc: Record<string, number> = {};
      for (const l of logs) {
        const k = l[key];
        acc[k] = (acc[k] ?? 0) + 1;
      }
      return acc;
    };

    const errorBreakdown: Record<string, number> = {};
    for (const l of logs) {
      if (l.errorCode) errorBreakdown[l.errorCode] = (errorBreakdown[l.errorCode] ?? 0) + 1;
    }

    return json({
      windowHours: 24,
      totalRequests,
      cacheHitRate: totalRequests > 0 ? Math.round((cacheHits / totalRequests) * 1000) / 1000 : 0,
      avgLatencyMs,
      p95LatencyMs: p95(latencies),
      errorRate: totalRequests > 0 ? Math.round((errors / totalRequests) * 1000) / 1000 : 0,
      usedRetrievalRate: totalRequests > 0 ? Math.round((withRetrieval / totalRequests) * 1000) / 1000 : 0,
      providerBreakdown: tally('provider'),
      safetyBreakdown: tally('safetyLevel'),
      errorBreakdown,
    });
  });
}
