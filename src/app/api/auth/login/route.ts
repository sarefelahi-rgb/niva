import { z } from 'zod';
import { db } from '@/lib/db';
import { json, apiError, readJson, assertSameOrigin } from '@/lib/api';
import { createSession, verifyPassword } from '@/lib/auth';
import { rateLimit, clientKey } from '@/lib/rate-limit';
import { logAudit } from '@/lib/audit';

const schema = z.object({
  email: z.string().email().max(120),
  password: z.string().min(1).max(100),
});

export async function POST(req: Request) {
  if (!assertSameOrigin(req)) return apiError(403, 'CSRF', 'Cross-origin request rejected');
  if (!rateLimit(clientKey(req, 'login'), 8, 60_000)) {
    return apiError(429, 'RATE_LIMIT', 'Too many sign-in attempts. Try again in a minute.');
  }
  try {
    const body = await readJson(req, schema);
    const email = body.email.toLowerCase().trim();
    const user = await db.user.findUnique({ where: { email } });
    if (!user || !verifyPassword(body.password, user.passwordHash)) {
      return apiError(401, 'BAD_CREDENTIALS', 'Email or password is incorrect');
    }
    const session = await createSession(user.id);
    await logAudit(user.id, 'USER_LOGIN', 'User', user.id, null, req.headers.get('x-forwarded-for'));
    return json({ id: user.id, email: user.email, name: user.name, role: user.role, locale: user.locale, token: session.token });
  } catch (err) {
    if (err instanceof z.ZodError) return apiError(400, 'VALIDATION', 'Invalid payload');
    console.error('[auth/login]', err);
    return apiError(500, 'INTERNAL', 'Sign-in failed');
  }
}
