const CACHE_NAME = 'profile-cache-v6';
const urlsToCache = [
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
            .then(cache => {
                console.log('Service Worker: Caching files', urlsToCache);
                return cache.addAll(urlsToCache);
            })
            .catch(error => console.error('Service Worker: Failed to cache', error))
    );
    self.skipWaiting();
});

self.addEventListener('fetch', event => {
    const requestUrl = new URL(event.request.url);
    if (requestUrl.pathname.startsWith('/api/')) {
        return;
    }
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                if (response) {
                    console.log('Service Worker: Serving from cache', event.request.url);
                    return response;
                }
                return fetch(event.request).catch(() => {
                    if (requestUrl.pathname.includes('profile.html')) {
                        console.log('Service Worker: Fallback to profile.html');
                        return caches.match('/profile.html');
                    }
                });
            })
    );
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.filter(name => name !== CACHE_NAME)
                    .map(name => {
                        console.log('Service Worker: Deleting old cache', name);
                        return caches.delete(name);
                    })
            );
        })
    );
    self.clients.claim();
});