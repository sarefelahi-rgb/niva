import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';
import { logAudit } from '@/lib/audit';
import type { User } from '@prisma/client';

export function json(data: unknown, status = 200): NextResponse {
  return NextResponse.json(data, { status });
}

export function apiError(status: number, code: string, message: string): NextResponse {
  return NextResponse.json({ error: { code, message } }, { status });
}

/** Same-origin enforcement for state-changing requests (CSRF defense layer). */
export function assertSameOrigin(req: Request): boolean {
  const method = req.method.toUpperCase();
  if (method === 'GET' || method === 'HEAD') return true;
  const origin = req.headers.get('origin');
  if (!origin) return true; // non-browser clients
  const host = req.headers.get('host');
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

interface AuthContext {
  user: User;
}

export async function withUser(
  req: Request,
  roles: string[],
  handler: (ctx: AuthContext) => Promise<NextResponse>
): Promise<NextResponse> {
  if (!assertSameOrigin(req)) {
    return apiError(403, 'CSRF', 'Cross-origin request rejected');
  }
  const user = await getSessionUser();
  if (!user) return apiError(401, 'UNAUTHENTICATED', 'Sign in required');
  if (roles.length > 0 && !roles.includes(user.role)) {
    return apiError(403, 'FORBIDDEN', 'Insufficient role');
  }
  try {
    return await handler({ user });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return apiError(400, 'VALIDATION', err.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; '));
    }
    console.error('[api]', err);
    return apiError(500, 'INTERNAL', 'Unexpected server error');
  }
}

export async function logAdminAction(
  actorId: string,
  action: string,
  entity: string,
  entityId: string | null,
  metadata: Record<string, unknown> | null,
  req: Request
): Promise<void> {
  await logAudit(actorId, action, entity, entityId, metadata, req.headers.get('x-forwarded-for') ?? null);
}

/** Parses a JSON body, enforcing content type and a hard size ceiling. */
export async function readJson<T>(req: Request, schema: z.ZodType<T>): Promise<T> {
  const type = req.headers.get('content-type') ?? '';
  if (!type.includes('application/json')) {
    throw new z.ZodError([{ code: 'custom', path: ['body'], message: 'application/json required' }]);
  }
  const raw = await req.text();
  if (raw.length > 256_000) {
    throw new z.ZodError([{ code: 'custom', path: ['body'], message: 'Payload too large' }]);
  }
  return schema.parse(JSON.parse(raw));
}
