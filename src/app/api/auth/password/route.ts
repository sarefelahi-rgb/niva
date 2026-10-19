import { z } from 'zod';
import { cookies } from 'next/headers';
import { db } from '@/lib/db';
import { json, apiError, readJson, withUser } from '@/lib/api';
import { SESSION_COOKIE, hashPassword, verifyPassword } from '@/lib/auth';
import { logAudit } from '@/lib/audit';

const schema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).max(100),
});

function passwordIssue(pw: string): string | null {
  if (!/[A-Za-z]/.test(pw) || !/\d/.test(pw)) {
    return 'Password must contain at least one letter and one digit';
  }
  return null;
}

/**
 * Password change with re-authentication (account security, Wave 2.1):
 * the current password must be re-entered, and every OTHER session is revoked
 * so a stolen session cannot survive a credential change. The current session
 * is preserved so the user is not logged out of this device.
 */
export async function POST(req: Request) {
  return withUser(req, [], async ({ user }) => {
    const body = await readJson(req, schema);
    if (!verifyPassword(body.currentPassword, user.passwordHash)) {
      return apiError(401, 'INVALID_CREDENTIALS', 'Current password is incorrect');
    }
    const issue = passwordIssue(body.newPassword);
    if (issue) return apiError(400, 'WEAK_PASSWORD', issue);

    const jar = await cookies();
    const currentToken = jar.get(SESSION_COOKIE)?.value ?? null;
    await db.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: user.id },
        data: { passwordHash: hashPassword(body.newPassword) },
      });
      await tx.session.deleteMany({
        where: { userId: user.id, ...(currentToken ? { token: { not: currentToken } } : {}) },
      });
    });
    await logAudit(user.id, 'PASSWORD_CHANGE', 'User', user.id, null, req.headers.get('x-forwarded-for'));
    return json({ ok: true });
  });
}
