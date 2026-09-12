// Voyage-Ed CRM service worker
//
// Purpose: enable install-to-home-screen behaviour and give a minimal
// offline shell (last-visited page + brand icons) so the app opens even
// when Fold5 is on flaky airport wifi. This is NOT a full offline CRM
// — API calls still need network, but the app frame loads instantly
// from cache and shows a friendly "offline, retrying…" state rather
// than Chrome's dinosaur.

const CACHE_VERSION = 'voyage-ed-v3';
const OFFLINE_URL = '/index.html';

// Shell assets — always kept in cache
const SHELL = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_VERSION);
    // addAll is atomic — if any request fails the whole install fails,
    // so use individual adds and swallow errors. On a fresh deploy some
    // paths may 404 briefly; better to install and heal on next fetch.
    await Promise.all(SHELL.map((url) => cache.add(url).catch(() => null)));
    self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    // Clean up caches from previous SW versions.
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Never cache API calls, POST requests, or cross-origin requests —
  // CRM data must always be fresh from the backend.
  if (req.method !== 'GET') return;
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/')) return;

  // Navigation requests (page loads) — try network first with fast timeout,
  // fall back to cached index.html so the app opens offline.
  if (req.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const network = await Promise.race([
          fetch(req),
          new Promise((_, rej) => setTimeout(() => rej(new Error('slow')), 3000)),
        ]);
        // Update cache in the background
        const cache = await caches.open(CACHE_VERSION);
        cache.put(OFFLINE_URL, network.clone()).catch(() => {});
        return network;
      } catch (e) {
        const cache = await caches.open(CACHE_VERSION);
        return (await cache.match(OFFLINE_URL)) || (await cache.match('/')) || new Response('Offline', { status: 503 });
      }
    })());
    return;
  }

  // Static assets — cache-first with background update (stale-while-revalidate).
  // Fold5 users open the app dozens of times a day; near-zero-latency loads
  // matter more than always-fresh CSS bundles.
  event.respondWith((async () => {
    const cache = await caches.open(CACHE_VERSION);
    const cached = await cache.match(req);
    const netFetch = fetch(req).then((res) => {
      if (res && res.status === 200) cache.put(req, res.clone()).catch(() => {});
      return res;
    }).catch(() => null);
    return cached || (await netFetch) || new Response('Not available', { status: 503 });
  })());
});
