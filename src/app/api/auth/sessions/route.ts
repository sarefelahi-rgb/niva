import { cookies } from 'next/headers';
import { db } from '@/lib/db';
import { json, apiError, withUser } from '@/lib/api';
import { SESSION_COOKIE } from '@/lib/auth';
import { logAudit } from '@/lib/audit';

/**
 * Session management (account security, Wave 2.1).
 * Users can list their own active sessions and revoke any of them.
 * Tokens are NEVER returned — only metadata and a `current` flag.
 */
export async function GET(req: Request) {
  return withUser(req, [], async ({ user }) => {
    const jar = await cookies();
    const currentToken = jar.get(SESSION_COOKIE)?.value ?? null;
    const sessions = await db.session.findMany({
      where: { userId: user.id, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
      select: { id: true, token: true, createdAt: true, expiresAt: true },
    });
    return json({
      sessions: sessions.map((s) => ({
        id: s.id,
        createdAt: s.createdAt,
        expiresAt: s.expiresAt,
        current: currentToken !== null && s.token === currentToken,
      })),
    });
  });
}

/** Revoke a single session by id (owner-scoped). */
export async function DELETE(req: Request) {
  return withUser(req, [], async ({ user }) => {
    const id = new URL(req.url).searchParams.get('id');
    if (!id) return apiError(400, 'VALIDATION', 'id required');
    const session = await db.session.findUnique({ where: { id } });
    if (!session || session.userId !== user.id) return apiError(404, 'NOT_FOUND', 'Session not found');
    await db.session.delete({ where: { id } });
    await logAudit(user.id, 'SESSION_REVOKE', 'Session', id, null, req.headers.get('x-forwarded-for'));
    return json({ ok: true });
  });
}
