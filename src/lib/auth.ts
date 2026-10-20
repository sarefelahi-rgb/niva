import { createHash, randomBytes, scryptSync, timingSafeEqual } from 'crypto';
import { cookies, headers } from 'next/headers';
import { db } from '@/lib/db';
import type { User } from '@prisma/client';

/**
 * NIVA session authentication.
 * - Passwords: scrypt (N=16384) with per-user salt, constant-time comparison.
 * - Sessions: 256-bit random tokens, HttpOnly cookies, 30-day expiry,
 *   rotation on login, server-side revocation (logout / logout-all).
 * - Embedding support: over HTTPS (x-forwarded-proto) cookies are issued as
 *   SameSite=None; Secure so the session also works inside cross-origin
 *   embeds (e.g. preview panels). Clients that block third-party cookies can
 *   authenticate via `Authorization: Bearer <token>` which src/middleware.ts
 *   bridges into the session cookie for every /api route.
 * Production hardening path (MFA, refresh-token rotation, device binding): docs/07-security-privacy.md
 */

export const SESSION_COOKIE = 'niva_session';
const SESSION_DAYS = 30;
const SCRYPT_KEYLEN = 64;

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, SCRYPT_KEYLEN).toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(':');
  if (!salt || !hash) return false;
  const candidate = scryptSync(password, salt, SCRYPT_KEYLEN);
  const expected = Buffer.from(hash, 'hex');
  return candidate.length === expected.length && timingSafeEqual(candidate, expected);
}

export function hashEmail(email: string): string {
  return createHash('sha256').update(email.toLowerCase().trim()).digest('hex').slice(0, 16);
}

export async function createSession(userId: string): Promise<{ token: string; expiresAt: Date }> {
  const token = randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86_400_000);
  await db.session.create({ data: { token, userId, expiresAt } });
  const jar = await cookies();
  const h = await headers();
  const isHttps = (h.get('x-forwarded-proto') ?? 'http').split(',')[0].trim() === 'https';
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    // Cross-origin embeds (preview panels) need SameSite=None; Secure over HTTPS.
    sameSite: isHttps ? 'none' : 'lax',
    secure: isHttps,
    path: '/',
    expires: expiresAt,
  });
  return { token, expiresAt };
}

export async function getSessionUser(): Promise<User | null> {
  return (await getSessionStatus()).user;
}

/**
 * Wave 6.2 session validation point — one honest check for soft-disabled
 * accounts. If the session resolves to a deactivated user, ALL of that user's
 * stale sessions are destroyed lazily (defense in depth: even if a new session
 * were minted by another path, the next validation would remove it) and the
 * caller is told the account is disabled so guarded routes can answer
 * 403 ACCOUNT_DISABLED instead of a misleading 401.
 */
export async function getSessionStatus(): Promise<{ user: User | null; deactivated: boolean }> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return { user: null, deactivated: false };
  const session = await db.session.findUnique({
    where: { token },
    include: { user: true },
  });
  if (!session) return { user: null, deactivated: false };
  if (session.expiresAt.getTime() < Date.now()) {
    await db.session.delete({ where: { id: session.id } }).catch(() => undefined);
    return { user: null, deactivated: false };
  }
  if (session.user.deactivatedAt != null) {
    await db.session
      .deleteMany({ where: { userId: session.user.id } })
      .catch(() => undefined);
    return { user: null, deactivated: true };
  }
  return { user: session.user, deactivated: false };
}

export async function destroySession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) {
    await db.session.deleteMany({ where: { token } });
  }
  jar.delete(SESSION_COOKIE);
}

export async function destroyAllSessions(userId: string): Promise<void> {
  await db.session.deleteMany({ where: { userId } });
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
}

export async function requireUser(): Promise<User | null> {
  return getSessionUser();
}

export function userHasRole(user: User, roles: string[]): boolean {
  return roles.includes(user.role);
}
