import { json, withUser } from '@/lib/api';
import { destroyAllSessions } from '@/lib/auth';
import { logAudit } from '@/lib/audit';

/**
 * Global sign-out (account security, Wave 2.1): revokes EVERY session for the
 * current user (all devices, cookie- and bearer-embedded sessions alike).
 */
export async function POST(req: Request) {
  return withUser(req, [], async ({ user }) => {
    await destroyAllSessions(user.id);
    await logAudit(user.id, 'LOGOUT_ALL', 'User', user.id, null, req.headers.get('x-forwarded-for'));
    return json({ ok: true });
  });
}
