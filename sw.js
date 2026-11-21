const CACHE_NAME = 'iron-ledger-v2';
const ASSETS = [
  './',
  './index.html',
  './program.json',
  './icon.svg',
  './manifest.json'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
    )).then(() => self.clients.claim())
  );
});

// Network first, bypassing the browser's HTTP cache (GitHub Pages sends max-age=600),
// so a pushed program.json shows on the next open. The cache is only the offline fallback.
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  // Don't intercept Google Apps Script calls
  if (url.hostname === 'script.google.com' || url.hostname === 'script.googleusercontent.com') {
    return;
  }

  event.respondWith(
    fetch(event.request, { cache: 'no-cache' }).then((networkResponse) => {
      if (networkResponse && networkResponse.ok) {
        const copy = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
      }
      return networkResponse;
    }).catch(() => caches.match(event.request))
  );
});
