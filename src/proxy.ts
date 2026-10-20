import { NextRequest, NextResponse } from 'next/server';

/**
 * Next.js 16 proxy (formerly middleware) — two request concerns:
 *
 * 1) Auth bridge (Wave: hybrid auth): `Authorization: Bearer <session-token>`
 *    is bridged into the session cookie for every /api route. This allows
 *    authenticated calls from contexts where the HttpOnly session cookie is
 *    unavailable — e.g. cross-origin preview-panel iframes that block
 *    third-party cookies. Must stay in sync with SESSION_COOKIE
 *    ('niva_session') in src/lib/auth.ts (kept literal here so the edge proxy
 *    does not pull in the Prisma client).
 *
 * 2) SSR locale resolution (Wave 7): the document locale is resolved
 *    server-side from `?lang=` (validated) or the `niva-locale` cookie and
 *    passed to the root layout via the `x-niva-locale` request header, so
 *    `<html lang dir>` matches the client's first render — removing the
 *    full-page hydration regeneration that happened when the persisted client
 *    locale differed from the SSR default. A `?lang=` override is persisted
 *    into the cookie (this is also what makes the /?lang= hreflang alternates
 *    real working URLs).
 *
 *    The client mirror lives in src/store/app.ts (setLocale writes the same
 *    cookie) — keep the cookie name in sync if it ever changes.
 */
const LOCALE_COOKIE = 'niva-locale';
const LOCALES = new Set(['fa', 'en']);

export default function proxy(req: NextRequest) {
  const requestHeaders = new Headers(req.headers);
  let modified = false;

  const auth = req.headers.get('authorization');
  if (auth && auth.toLowerCase().startsWith('bearer ')) {
    const token = auth.slice(7).trim();
    if (token) {
      const existing = requestHeaders.get('cookie');
      requestHeaders.set(
        'cookie',
        existing ? `${existing}; niva_session=${token}` : `niva_session=${token}`
      );
      modified = true;
    }
  }

  const langParam = req.nextUrl.searchParams.get('lang');
  const cookieLocale = req.cookies.get(LOCALE_COOKIE)?.value;
  const locale =
    langParam && LOCALES.has(langParam)
      ? langParam
      : cookieLocale && LOCALES.has(cookieLocale)
        ? cookieLocale
        : 'fa';
  requestHeaders.set('x-niva-locale', locale);
  modified = true;

  const res = NextResponse.next({ request: { headers: requestHeaders } });

  // Persist a ?lang= override so every subsequent SSR request (and RSC
  // prefetch) resolves to the same locale without the param.
  if (langParam && LOCALES.has(langParam) && langParam !== cookieLocale) {
    res.cookies.set(LOCALE_COOKIE, langParam, {
      path: '/',
      maxAge: 31_536_000,
      sameSite: 'lax',
    });
  }

  // Note: we always return a rebuilt response — forwarding the locale header
  // requires it even when the auth bridge did not fire.
  void modified;
  return res;
}

export const config = {
  matcher: ['/api/:path*', '/'],
};
