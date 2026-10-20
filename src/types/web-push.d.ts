/**
 * Minimal ambient types for `web-push` (the CJS push-delivery dependency).
 * Only the surface NIVA uses is declared; the full upstream types would add a
 * dev dependency to the lockfile, which this sandbox keeps untouched.
 */
declare module 'web-push' {
  export interface WebPushRequestOptions {
    TTL?: number;
    urgency?: 'very-low' | 'low' | 'normal' | 'high';
    topic?: string;
    headers?: Record<string, string>;
  }

  export interface WebPushResponse {
    statusCode: number;
    body?: string;
    headers?: Record<string, string>;
  }

  /** Rejected with an object carrying `statusCode` on 4xx/5xx push-service replies. */
  export function sendNotification(
    endpoint: string,
    payload?: string | null,
    options?: WebPushRequestOptions
  ): Promise<WebPushResponse>;

  export function setVapidDetails(subject: string, publicKey: string, privateKey: string): void;

  export function generateVAPIDKeys(): { publicKey: string; privateKey: string };
}
