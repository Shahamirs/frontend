const CACHE_NAME = 'profile-cache-v2'; // Измени на v2, чтобы сбросить старый кэш
const urlsToCache = [
    '/',
    '/index.html',  // Главная страница (бывший auth.html)
    '/profile.html',  // Страница профиля (бывший index.html)
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
            .then(cache => cache.addAll(urlsToCache))
            .catch(error => console.error('Service Worker: Cache failed', error))
    );
});

self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request)
            .then(response => response || fetch(event.request).catch(() => {
                // Если запрос не в кэше и нет интернета, вернуть заглушку (опционально)
                if (event.request.url.includes('profile.html')) {
                    return caches.match('/profile.html');
                }
            }))
    );
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.filter(name => name !== CACHE_NAME)
                    .map(name => caches.delete(name))
            );
        })
    );
});