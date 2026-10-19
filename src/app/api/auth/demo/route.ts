import { db } from '@/lib/db';
import { json, apiError, assertSameOrigin } from '@/lib/api';
import { createSession, verifyPassword } from '@/lib/auth';
import { rateLimit, clientKey } from '@/lib/rate-limit';
import { logAudit } from '@/lib/audit';

/**
 * One-click demo entry. Signs into the seeded demo account (or falls back to
 * the admin account for governance demos). No credential collection.
 */
export async function POST(req: Request) {
  if (!assertSameOrigin(req)) return apiError(403, 'CSRF', 'Cross-origin request rejected');
  if (!rateLimit(clientKey(req, 'demo'), 10, 60_000)) {
    return apiError(429, 'RATE_LIMIT', 'Too many attempts');
  }
  const demo = await db.user.findUnique({ where: { email: 'demo@niva.health' } });
  const fallback = await db.user.findUnique({ where: { email: 'admin@niva.health' } });
  const user = demo ?? fallback;
  if (!user) return apiError(404, 'NOT_FOUND', 'Demo account is not seeded');
  if (user.email === 'demo@niva.health' && !verifyPassword('NivaDemo!2025', user.passwordHash)) {
    return apiError(500, 'INTERNAL', 'Demo account integrity failure');
  }
  await createSession(user.id);
  await logAudit(user.id, 'DEMO_LOGIN', 'User', user.id, null, req.headers.get('x-forwarded-for'));
  return json({ id: user.id, email: user.email, name: user.name, role: user.role, locale: user.locale });
}
