/**
 * In-memory sliding-window rate limiter (sandbox build).
 * Production target: Redis-backed distributed limiter — docs/07-security-privacy.md.
 */

interface Bucket {
  count: number;
  windowStart: number;
}

const buckets = new Map<string, Bucket>();

export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || now - b.windowStart > windowMs) {
    buckets.set(key, { count: 1, windowStart: now });
    return true;
  }
  if (b.count >= limit) return false;
  b.count += 1;
  return true;
}

export function clientKey(req: Request, scope: string): string {
  const fwd = req.headers.get('x-forwarded-for') ?? 'local';
  return `${scope}:${fwd.split(',')[0].trim()}`;
}

// Periodic cleanup to bound memory.
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of buckets) {
    if (now - v.windowStart > 3_600_000) buckets.delete(k);
  }
}, 3_600_000).unref?.();
