/**
 * Push client helpers (browser-only). Every function is guarded so it can be
 * imported from client components without breaking SSR — calls on the server
 * are no-ops / report "unsupported".
 *
 * State is ALWAYS read from real browser APIs (permission + pushManager
 * subscription) — no optimistic or cached state, so the toggle never lies.
 */

export interface PushConfig {
  configured: boolean;
  publicKey?: string;
}

export function isPushSupported(): boolean {
  if (typeof window === 'undefined') return false;
  return 'serviceWorker' in navigator && 'PushManager' in window;
}

/** Races a promise against a timeout — a hung service-worker 'ready' must never wedge UI. */
async function withTimeout<T>(p: Promise<T>, ms: number): Promise<T | null> {
  return Promise.race([p.catch(() => null), new Promise<null>((resolve) => setTimeout(() => resolve(null), ms))]);
}

export function notificationPermission(): NotificationPermission | 'unsupported' {
  if (typeof window === 'undefined' || typeof Notification === 'undefined') return 'unsupported';
  return Notification.permission;
}

/** Registers /sw.js and returns the ready registration (null when unsupported).
 *  Dev/preview returns null — the PWA worker is a production-only feature, so
  *  it can never resurrect itself over a freshly compiled dev page. */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (process.env.NODE_ENV !== 'production') return null;
  if (!isPushSupported()) return null;
  try {
    return await navigator.serviceWorker.register('/sw.js');
  } catch {
    return null;
  }
}

/** GET /api/push/config — VAPID public key + honest configured flag. */
export async function fetchPushConfig(): Promise<PushConfig> {
  try {
    const r = await fetch('/api/push/config');
    if (!r.ok) return { configured: false };
    return (await r.json()) as PushConfig;
  } catch {
    return { configured: false };
  }
}

/** VAPID applicationServerKey is URL-safe base64 — browsers need the raw bytes. */
export function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = typeof window !== 'undefined' && typeof window.atob === 'function'
    ? window.atob(base64)
    : Buffer.from(base64, 'base64').toString('binary');
  const output = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i += 1) output[i] = raw.charCodeAt(i);
  return output;
}

/** Real subscription state from the browser (null when none / unsupported). */
export async function getExistingSubscription(): Promise<PushSubscription | null> {
  if (!isPushSupported()) return null;
  try {
    const reg = await withTimeout(navigator.serviceWorker.ready, 3000);
    if (!reg) return null;
    return await reg.pushManager.getSubscription();
  } catch {
    return null;
  }
}

export async function subscribeToPush(publicKey: string): Promise<PushSubscription | null> {
  if (!isPushSupported()) return null;
  try {
    const reg = await withTimeout(navigator.serviceWorker.ready, 3000);
    if (!reg) return null;
    return await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    });
  } catch {
    return null;
  }
}

/** Sends the browser subscription to NIVA (upsert keyed by endpoint). */
export async function saveSubscriptionToServer(sub: PushSubscription, locale: string): Promise<boolean> {
  try {
    const r = await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ endpoint: sub.endpoint, keys: { p256dh: sub.toJSON().keys?.p256dh, auth: sub.toJSON().keys?.auth }, locale }),
    });
    return r.ok;
  } catch {
    return false;
  }
}

/** Removes the server-side row, then the browser subscription. */
export async function unsubscribeFromPush(sub: PushSubscription): Promise<boolean> {
  try {
    await fetch('/api/push/subscribe', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ endpoint: sub.endpoint }),
    });
    await sub.unsubscribe();
    return true;
  } catch {
    return false;
  }
}
