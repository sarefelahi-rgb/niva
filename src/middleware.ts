import { NextRequest, NextResponse } from 'next/server';

/**
 * Bridges `Authorization: Bearer <session-token>` into the session cookie for
 * every /api route. This allows authenticated calls from contexts where the
 * HttpOnly session cookie is unavailable — e.g. cross-origin preview-panel
 * iframes that block third-party cookies. Must stay in sync with
 * SESSION_COOKIE ('niva_session') in src/lib/auth.ts (kept literal here so the
 * edge middleware does not pull in the Prisma client).
 */
export function middleware(req: NextRequest) {
  const auth = req.headers.get('authorization');
  if (auth && auth.toLowerCase().startsWith('bearer ')) {
    const token = auth.slice(7).trim();
    if (token) {
      const requestHeaders = new Headers(req.headers);
      const existing = requestHeaders.get('cookie');
      requestHeaders.set(
        'cookie',
        existing ? `${existing}; niva_session=${token}` : `niva_session=${token}`
      );
      return NextResponse.next({ request: { headers: requestHeaders } });
    }
  }
  return NextResponse.next();
}

export const config = {
  matcher: '/api/:path*',
};
