'use client';

import { useEffect } from 'react';
import { getToken } from '@/lib/auth-token';

/**
 * AuthBridge patches window.fetch once so every same-origin /api request
 * carries `Authorization: Bearer <session-token>` when a token is stored.
 * This keeps authentication working inside cross-origin embeds (preview
 * panels) where third-party cookies are blocked, without touching cookie
 * behavior for normal tabs.
 */
export function AuthBridge() {
  useEffect(() => {
    const original = window.fetch.bind(window);
    window.fetch = (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      try {
        const url =
          typeof input === 'string'
            ? input
            : input instanceof URL
              ? input.href
              : (input as Request).url;
        if (url.startsWith('/api/') || url.includes('/api/?')) {
          const token = getToken();
          if (token) {
            const headers = new Headers(init?.headers ?? {});
            if (!headers.has('Authorization')) {
              headers.set('Authorization', `Bearer ${token}`);
            }
            return original(input, { ...init, headers });
          }
        }
      } catch {
        /* fall through to unmodified fetch */
      }
      return original(input, init);
    };
    return () => {
      window.fetch = original;
    };
  }, []);

  return null;
}
