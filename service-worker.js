// service-worker.js
const CACHE_NAME = 'unitlink-v10';
const PRECACHE = [
  '/',
  '/index.html',
  '/profile.html',
  '/style.css',
  '/app.js',
  '/auth.js',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(PRECACHE))
      .catch(err => console.error('SW: precache failed', err))
  );
  self.skipWaiting();
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (url.pathname.startsWith('/api/')) return;

  event.respondWith(
    caches.match(event.request)
      .then(response => response || fetch(event.request).catch(() => {
        if (url.pathname.includes('profile.html')) {
          return caches.match('/profile.html');
        }
      }))
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});