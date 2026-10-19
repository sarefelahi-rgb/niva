import { z } from 'zod';
import { db } from '@/lib/db';
import { json, apiError, readJson, assertSameOrigin } from '@/lib/api';
import { rateLimit, clientKey } from '@/lib/rate-limit';

/**
 * Consent-gated, anonymous landing analytics (backlog item 1.8).
 * Aggregates ONLY daily event counters — no user id, no IP, no user-agent,
 * no cookies, no free-text. The client sends nothing unless the visitor
 * explicitly allowed analytics. Rate-limited per client for abuse control
 * (in-memory only — the rate-limit key itself is never persisted).
 */

const BodySchema = z.object({
  name: z.enum(['landing_view', 'cta_start', 'cta_demo', 'ab_consent_granted']),
  variant: z.enum(['A', 'B']).default('A'),
});

export async function POST(req: Request) {
  if (!assertSameOrigin(req)) return apiError(403, 'CSRF', 'Cross-origin request rejected');
  if (!rateLimit(clientKey(req, 'analytics'), 30, 60_000)) {
    return apiError(429, 'RATE_LIMIT', 'Too many analytics events');
  }
  try {
    const body = await readJson(req, BodySchema);
    // UTC day bucket — stable across server timezones.
    const day = new Date(new Date().toISOString().slice(0, 10));
    await db.landingMetric.upsert({
      where: {
        day_name_variant: { day, name: body.name, variant: body.variant },
      },
      create: { day, name: body.name, variant: body.variant, count: 1 },
      update: { count: { increment: 1 } },
    });
    return json({ ok: true });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return apiError(400, 'VALIDATION', err.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; '));
    }
    console.error('[api:analytics]', err);
    return apiError(500, 'INTERNAL', 'Unexpected server error');
  }
}
