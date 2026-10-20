/* NIVA service worker — hand-written (no build step). Version bump ⇒ client sees an update.
 *
 * ── Cache budget (documented contract, docs/audit/09-store-compliance.md) ──────────────
 *  • niva-shell-v1    : app shell only — '/' (HTML document), manifest, icons.        ≤ ~0.5 MB
 *  • niva-runtime-v1  : immutable build assets (/_next/static, /icons, /_next/image),
 *                       capped at 80 entries (LRU-ish trim on every put).                ≤ ~4.5 MB
 *  • /api/* is NEVER cached (privacy: personal health data must not persist in
 *    shared caches, and correctness: every API response must be fresh).
 *  Total steady-state budget: ≤ ~5 MB. No HTML beyond the shell, no API caching.
 * ────────────────────────────────────────────────────────────────────────────────────────
 */
const SW_VERSION = 'niva-v1';
const SHELL_CACHE = `niva-shell-${SW_VERSION}`;
const RUNTIME_CACHE = `niva-runtime-${SW_VERSION}`;
const RUNTIME_MAX_ENTRIES = 80;

const SHELL_ASSETS = ['/', '/manifest.webmanifest', '/icons/icon-192.png', '/icons/icon-512.png'];

/** Navigations: network-first with a ~3s timeout, then the cached shell, then offline shell. */
async function handleNavigate(request, preloadResponse) {
  try {
    const preload = preloadResponse ? await preloadResponse : null;
    if (preload) {
      try { const c = await caches.open(SHELL_CACHE); c.put('/', preload.clone()); } catch {}
      return preload;
    }
  } catch {}
  try {
    const network = await Promise.race([
      fetch(request),
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 3000)),
    ]);
    try {
      const c = await caches.open(SHELL_CACHE);
      c.put('/', (network).clone());
    } catch {}
    return network;
  } catch {
    const cached = await caches.match('/', { cacheName: SHELL_CACHE }) || await caches.match('/');
    return cached || new Response('Offline', { status: 503, statusText: 'Offline' });
  }
}

/** Immutable assets: cache-first, runtime-cached, trimmed to the entry budget. */
async function handleImmutable(request) {
  const hit = await caches.match(request, { cacheName: RUNTIME_CACHE });
  if (hit) return hit;
  try {
    const res = await fetch(request);
    if (res && (res.ok || res.type === 'opaque')) {
      const c = await caches.open(RUNTIME_CACHE);
      c.put(request, res.clone());
      trimCache(c);
    }
    return res;
  } catch {
    return hit || Response.error();
  }
}

/** LRU-ish trim: delete the oldest entries when over budget. */
async function trimCache(cache) {
  try {
    const keys = await cache.keys();
    if (keys.length <= RUNTIME_MAX_ENTRIES) return;
    for (const key of keys.slice(0, keys.length - RUNTIME_MAX_ENTRIES)) {
      await cache.delete(key);
    }
  } catch {}
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((c) => c.addAll(SHELL_ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((names) => Promise.all(names.filter((n) => n !== SHELL_CACHE && n !== RUNTIME_CACHE).map((n) => caches.delete(n))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // pass-through cross-origin

  // (c) API: ALWAYS network, never cached. Failures pass through untouched.
  if (url.pathname.startsWith('/api/')) return;

  // (a) Navigations: network-first → cached shell fallback.
  if (request.mode === 'navigate') {
    event.respondWith(handleNavigate(request, event.preloadResponse));
    return;
  }

  // (b) Immutable assets: cache-first with runtime budget.
  const immutable =
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/icons/') ||
    url.pathname.startsWith('/_next/image');
  if (immutable) {
    event.respondWith(handleImmutable(request));
    return;
  }
  // Everything else (fonts, hero, favicon, etc.): plain network, no caching.
});

/* ── Push notifications ───────────────────────────────────────────────────────
 * Payload is JSON {title, body, url}. Row text is stored localized at creation
 * time, so the SW shows it as-is. Non-JSON payloads degrade to a generic nudge.
 */
self.addEventListener('push', (event) => {
  let title = 'NIVA';
  let body = '';
  let url = '/';
  try {
    const data = event.data ? event.data.json() : {};
    if (typeof data.title === 'string') title = data.title;
    if (typeof data.body === 'string') body = data.body;
    if (typeof data.url === 'string') url = data.url;
  } catch {
    try { body = event.data ? event.data.text() : ''; } catch {}
  }
  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      vibrate: [100, 50, 100],
      tag: 'niva',
      data: { url },
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ('focus' in client) {
          client.focus();
          if ('navigate' in client) client.navigate(target).catch(() => undefined);
          return;
        }
      }
      return self.clients.openWindow(target);
    })
  );
});

/* Update flow: the page posts {type:'SKIP_WAITING'} from the update toast. */
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});
