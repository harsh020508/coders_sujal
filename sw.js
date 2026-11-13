// LocalKaam Service Worker — PWA offline shell
// Strategy:
// - Precache the static app shell (HTML + stylesheets + manifest).
// - Navigations: network-first, fall back to the cached shell when offline.
// - Static assets (same-origin and pinned CDN assets): stale-while-revalidate.
// - /api/* is never intercepted: live data must always come from the network
//   (SSE streams, Supabase, AI endpoints). Offline handling for data lives in
//   StorageService (localStorage + Supabase hydration).

const CACHE_VERSION = 'localkaam-v1';
const PRECACHE_URLS = [
  './',
  './index.html',
  './manifest.json',
  './tokens.css',
  './styles.css',
  './css_enhancements.css',
  './ui.css',
  './animations/motion.css',
  './landing.css'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // Remove every cache left by previous versions of this worker
      const names = await caches.keys();
      await Promise.all(
        names
          .filter((name) => name.startsWith('localkaam-') && name !== CACHE_VERSION)
          .map((name) => caches.delete(name))
      );
      await self.clients.claim();
    })()
  );
});

self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});

function isCacheableResponse(response) {
  // Cache 2xx same-origin and 2xx CORS/opaque responses for static assets
  return response && response.ok && (response.type === 'basic' || response.type === 'cors' || response.type === 'opaque');
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return;

  // Live data: never intercept or cache API traffic
  if (url.pathname.startsWith('/api/')) return;

  // Navigations: network-first with cached shell fallback (offline support)
  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          const fresh = await fetch(request);
          const cache = await caches.open(CACHE_VERSION);
          cache.put('./index.html', fresh.clone()).catch(() => {});
          return fresh;
        } catch (e) {
          const cached = await caches.match('./index.html');
          if (cached) return cached;
          return new Response(
            '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>LocalKaam — Offline</title></head>' +
            '<body style="font-family:system-ui,sans-serif;display:grid;place-items:center;min-height:100vh;margin:0;background:#fcfaf5;color:#1a3300;">' +
            '<div style="text-align:center;padding:24px;"><h1>LocalKaam</h1><p>You are offline and no saved copy is available yet.</p>' +
            '<button onclick="location.reload()" style="padding:10px 20px;border-radius:10px;border:1px solid #1a3300;background:#ffe95c;font-weight:700;cursor:pointer;">Retry</button></div></body></html>',
            { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
          );
        }
      })()
    );
    return;
  }

  // Static assets: stale-while-revalidate
  event.respondWith(
    (async () => {
      const cached = await caches.match(request);
      if (cached) {
        // Refresh in the background; never block the response on the network
        fetch(request)
          .then((response) => {
            if (isCacheableResponse(response)) {
              caches.open(CACHE_VERSION).then((cache) => cache.put(request, response.clone())).catch(() => {});
            }
          })
          .catch(() => {});
        return cached;
      }
      try {
        const fresh = await fetch(request);
        if (isCacheableResponse(fresh)) {
          caches.open(CACHE_VERSION).then((cache) => cache.put(request, fresh.clone())).catch(() => {});
        }
        return fresh;
      } catch (e) {
        return new Response('', { status: 504, statusText: 'Offline' });
      }
    })()
  );
});
