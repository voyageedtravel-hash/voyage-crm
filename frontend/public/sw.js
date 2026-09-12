// Voyage-Ed CRM service worker — v4 (aggressive freshness)
//
// Two rules:
// 1. NEVER serve stale index.html / bundle JS — those are network-first
//    with a 6-second timeout. Old data reports were fixed here.
// 2. Static assets (icons, fonts, hero images) may be cached long-term.
//
// SKIP_WAITING messaging so a new SW takes over immediately, plus a
// controllerchange trigger in index.html reloads the page one time
// when the fresh SW activates — no stale bundles surviving across
// deploys.

const CACHE_VERSION = 'voyage-ed-v5';
const OFFLINE_URL = '/index.html';

const SHELL = [
  '/', '/index.html', '/manifest.json',
  '/icon-192.png', '/icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_VERSION);
    await Promise.all(SHELL.map((url) => cache.add(url).catch(() => null)));
    // Skip waiting immediately so the new SW activates as soon as possible.
    self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

// Allow the page to tell us to skip waiting (used when a new SW is
// installed while the current page is still open — index.html sends
// SKIP_WAITING so the new SW takes over without the user re-launching).
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  if (req.method !== 'GET') return;
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/')) return;

  // Navigation requests — always network-first with 6s timeout, fallback
  // to cached offline shell only when actually offline.
  if (req.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const network = await Promise.race([
          fetch(req, { cache: 'no-store' }),
          new Promise((_, rej) => setTimeout(() => rej(new Error('slow')), 6000)),
        ]);
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

  // JS/CSS bundles — network-first too. CRA bundles have content-hash
  // filenames so a new deploy always has different URLs; still, if the
  // browser requests a NAME we don't recognise (new hash), we must go
  // to network. Never serve a stale hashed bundle by mistake.
  if (/\.(js|css)$/.test(url.pathname)) {
    event.respondWith((async () => {
      try {
        const res = await fetch(req);
        if (res && res.status === 200) {
          const cache = await caches.open(CACHE_VERSION);
          cache.put(req, res.clone()).catch(() => {});
        }
        return res;
      } catch (e) {
        const cache = await caches.open(CACHE_VERSION);
        const cached = await cache.match(req);
        return cached || new Response('Offline', { status: 503 });
      }
    })());
    return;
  }

  // Everything else (icons, fonts, hero images) — cache-first, background
  // update. Long-lived static assets, safe to cache.
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
