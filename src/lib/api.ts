import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';
import { logAudit } from '@/lib/audit';
import { logEvent, recordRequest, requestIdOf } from '@/lib/observability';
import type { User } from '@prisma/client';

export function json(data: unknown, status = 200): NextResponse {
  return NextResponse.json(data, { status });
}

export function apiError(status: number, code: string, message: string, requestId?: string): NextResponse {
  const res = NextResponse.json({ error: { code, message } }, { status });
  if (requestId) res.headers.set('x-request-id', requestId);
  return res;
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
  const requestId = requestIdOf(req);
  const startedAt = Date.now();
  const route = new URL(req.url).pathname;
  const finish = (status: number, code: string, message: string): NextResponse => {
    recordRequest(route, status);
    logEvent(status >= 500 ? 'error' : status >= 400 ? 'warn' : 'info', 'api.request', {
      requestId,
      route,
      method: req.method,
      status,
      code,
      latencyMs: Date.now() - startedAt,
    });
    return attachRequestId(apiError(status, code, message, requestId), requestId);
  };
  if (!assertSameOrigin(req)) {
    return finish(403, 'CSRF', 'Cross-origin request rejected');
  }
  const user = await getSessionUser();
  if (!user) return finish(401, 'UNAUTHENTICATED', 'Sign in required');
  if (roles.length > 0 && !roles.includes(user.role)) {
    return finish(403, 'FORBIDDEN', 'Insufficient role');
  }
  try {
    const res = await handler({ user });
    recordRequest(route, res.status);
    logEvent(res.status >= 500 ? 'error' : res.status >= 400 ? 'warn' : 'info', 'api.request', {
      requestId,
      route,
      method: req.method,
      status: res.status,
      latencyMs: Date.now() - startedAt,
    });
    return attachRequestId(res, requestId);
  } catch (err) {
    if (err instanceof z.ZodError) {
      const res = apiError(400, 'VALIDATION', err.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; '), requestId);
      recordRequest(route, 400);
      logEvent('warn', 'api.request', { requestId, route, method: req.method, status: 400, code: 'VALIDATION', latencyMs: Date.now() - startedAt });
      return res;
    }
    logEvent('error', 'api.unhandled', {
      requestId,
      route,
      method: req.method,
      error: err instanceof Error ? `${err.name}: ${err.message}` : String(err),
      stack: err instanceof Error ? err.stack?.split('\n').slice(0, 4).join(' | ') : undefined,
    });
    recordRequest(route, 500);
    return apiError(500, 'INTERNAL', 'Unexpected server error', requestId);
  }
}

/** Echoes the request id back to the client for support correlation. */
function attachRequestId(res: NextResponse, requestId: string): NextResponse {
  res.headers.set('x-request-id', requestId);
  return res;
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
