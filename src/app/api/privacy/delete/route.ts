import { db } from '@/lib/db';
import { json, withUser } from '@/lib/api';
import { destroyAllSessions, hashEmail } from '@/lib/auth';
import { logAudit } from '@/lib/audit';

/** Right-to-erasure. Cascades remove all owned records; audit trail is retained (legitimate interest). */
export async function POST(req: Request) {
  return withUser(req, [], async ({ user }) => {
    const emailHash = hashEmail(user.email);
    await logAudit(user.id, 'ACCOUNT_DELETE', 'User', user.id, { emailHash }, req.headers.get('x-forwarded-for'));
    await destroyAllSessions(user.id);
    await db.user.delete({ where: { id: user.id } }); // FK cascades remove dependent rows
    return json({ ok: true });
  });
}
