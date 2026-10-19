import { db } from '@/lib/db';
import { json, apiError, assertSameOrigin } from '@/lib/api';
import { createSession, verifyPassword } from '@/lib/auth';
import { rateLimit, clientKey } from '@/lib/rate-limit';
import { logAudit } from '@/lib/audit';

/**
 * One-click demo entry. Signs into the seeded DEMO (non-privileged) account
 * only. Never falls back to administrative accounts (risk R-02). Deployment
 * hard-gate: set NIVA_DISABLE_DEMO=true to disable entirely (production).
 */
export async function POST(req: Request) {
  if (!assertSameOrigin(req)) return apiError(403, 'CSRF', 'Cross-origin request rejected');
  if (process.env.NIVA_DISABLE_DEMO === 'true') {
    return apiError(404, 'NOT_FOUND', 'Demo entry is disabled');
  }
  if (!rateLimit(clientKey(req, 'demo'), 10, 60_000)) {
    return apiError(429, 'RATE_LIMIT', 'Too many attempts');
  }
  const demo = await db.user.findUnique({ where: { email: 'demo@niva.health' } });
  if (!demo) return apiError(404, 'NOT_FOUND', 'Demo account is not seeded');
  if (demo.role !== 'USER') {
    // Integrity guard: the demo endpoint must never yield a privileged role.
    return apiError(500, 'INTERNAL', 'Demo account integrity failure');
  }
  if (!verifyPassword('NivaDemo!2025', demo.passwordHash)) {
    return apiError(500, 'INTERNAL', 'Demo account integrity failure');
  }
  const session = await createSession(demo.id);
  await logAudit(demo.id, 'DEMO_LOGIN', 'User', demo.id, null, req.headers.get('x-forwarded-for'));
  return json({ id: demo.id, email: demo.email, name: demo.name, role: demo.role, locale: demo.locale, token: session.token });
}
