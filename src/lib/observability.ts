/**
 * NIVA structured platform logging + request tracing (backlog 5.3).
 *
 * Design rules (security-first):
 * - JSON lines to stdout — machine-parseable by any log collector.
 * - REDACTION AT THE SOURCE: keys matching sensitive patterns are replaced
 *   before serialization. Values are never logged raw — emails become their
 *   SHA-256 prefix, tokens/secrets become `[REDACTED:<len>]`.
 * - Request IDs (`x-request-id`) are generated per API call and echoed back in
 *   the response, so a user-reported issue maps to exactly one log line.
 * - In-memory request counters power the admin platform-metrics endpoint.
 *   Counters are per-process (sandbox build) — honest, zero-infra.
 */

import { createHash, randomUUID } from 'crypto';

/* ── Redaction ───────────────────────────────────────────────────────────── */

const SENSITIVE_KEY = /(pass(word)?|secret|token|auth(orization)?|cookie|session|bearer|api[-_]?key|credential)/i;
const EMAIL_KEY = /e-?mail/i;

function redactValue(value: unknown): unknown {
  if (typeof value === 'string') {
    // Strings that look like bearer tokens / long secrets never log raw.
    if (value.length > 24 && /^(ey[A-Za-z0-9_-]{10,}|sk-|[0-9a-f]{32,})/i.test(value)) {
      return `[REDACTED:${value.length}]`;
    }
    return value;
  }
  return value;
}

/** Deep redaction with cycle protection. Emails are pseudonymized, not dropped. */
export function redact(data: unknown, depth = 0, seen = new Set<unknown>()): unknown {
  if (data === null || data === undefined) return data;
  if (depth > 6) return '[depth-limit]';
  if (typeof data !== 'object') return redactValue(data);
  if (seen.has(data)) return '[cycle]';
  seen.add(data);
  if (Array.isArray(data)) return data.slice(0, 50).map((v) => redact(v, depth + 1, seen));
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(data as Record<string, unknown>)) {
    if (SENSITIVE_KEY.test(k)) {
      out[k] = typeof v === 'string' && v.length > 0 ? `[REDACTED:${v.length}]` : '[REDACTED]';
    } else if (EMAIL_KEY.test(k) && typeof v === 'string') {
      out[k] = `sha256:${createHash('sha256').update(v).digest('hex').slice(0, 12)}`;
    } else {
      out[k] = redact(v, depth + 1, seen);
    }
  }
  return out;
}

/* ── Structured logger ───────────────────────────────────────────────────── */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LEVEL_WEIGHT: Record<LogLevel, number> = { debug: 10, info: 20, warn: 30, error: 40 };
const MIN_LEVEL: LogLevel =
  process.env.NIVA_LOG_LEVEL === 'debug'
    ? 'debug'
    : process.env.NODE_ENV === 'production'
      ? 'info'
      : 'debug';

export interface LogFields {
  [key: string]: unknown;
}

export function logEvent(level: LogLevel, event: string, fields: LogFields = {}): void {
  if (LEVEL_WEIGHT[level] < LEVEL_WEIGHT[MIN_LEVEL]) return;
  const line = JSON.stringify({
    ts: new Date().toISOString(),
    level,
    event,
    ...((redact(fields) as LogFields) ?? {}),
  });
  if (level === 'error') console.error(line);
  else if (level === 'warn') console.warn(line);
  else console.log(line);
}

/* ── Request tracing ─────────────────────────────────────────────────────── */

export function newRequestId(): string {
  return randomUUID();
}

export function requestIdOf(req: Request): string {
  return req.headers.get('x-request-id') ?? newRequestId();
}

/* ── In-memory metrics (per-process; sandbox build) ──────────────────────── */

interface MetricsState {
  startedAt: number;
  totalRequests: number;
  byStatus: Map<string, number>;
  byRoute: Map<string, number>;
  redactions: number;
  errors: number;
}

const g = globalThis as unknown as { nivaMetrics?: MetricsState };
const metrics: MetricsState =
  g.nivaMetrics ??
  (g.nivaMetrics = {
    startedAt: Date.now(),
    totalRequests: 0,
    byStatus: new Map(),
    byRoute: new Map(),
    redactions: 0,
    errors: 0,
  });

export function recordRequest(route: string, status: number): void {
  metrics.totalRequests += 1;
  const s = String(status);
  metrics.byStatus.set(s, (metrics.byStatus.get(s) ?? 0) + 1);
  metrics.byRoute.set(route, (metrics.byRoute.get(route) ?? 0) + 1);
  if (status >= 500) metrics.errors += 1;
}

export function recordRedaction(): void {
  metrics.redactions += 1;
}

export function metricsSnapshot(): {
  uptimeSeconds: number;
  totalRequests: number;
  byStatus: Record<string, number>;
  topRoutes: Array<{ route: string; count: number }>;
  errorRate5xx: number;
} {
  const topRoutes = [...metrics.byRoute.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([route, count]) => ({ route, count }));
  const five = [...metrics.byStatus.entries()].filter(([s]) => s.startsWith('5')).reduce((a, [, n]) => a + n, 0);
  return {
    uptimeSeconds: Math.round((Date.now() - metrics.startedAt) / 1000),
    totalRequests: metrics.totalRequests,
    byStatus: Object.fromEntries([...metrics.byStatus.entries()].sort()),
    topRoutes,
    errorRate5xx: metrics.totalRequests > 0 ? Math.round((five / metrics.totalRequests) * 1000) / 1000 : 0,
  };
}
