/**
 * Session-token storage for embedding contexts (e.g. preview-panel iframes)
 * where the HttpOnly session cookie may be blocked as a third-party cookie.
 * The token mirrors the server-side session and is attached automatically to
 * same-origin /api requests by <AuthBridge />.
 */
const TOKEN_KEY = 'niva_token';

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(TOKEN_KEY, token);
  } catch {
    /* storage unavailable — cookie-only mode */
  }
}

export function clearToken(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* storage unavailable */
  }
}
