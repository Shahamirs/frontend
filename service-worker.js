const CACHE_NAME = 'profile-cache-v3'; // Обновили до v3 для сброса кэша
const urlsToCache = [
    '/',
    '/index.html',  // Страница авторизации
    '/profile.html',  // Страница профиля
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
                console.log('Service Worker: Caching files');
                return cache.addAll(urlsToCache);
            })
            .catch(error => console.error('Service Worker: Cache failed', error))
    );
    // Заставляем SW активироваться сразу
    self.skipWaiting();
});

self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                if (response) {
                    return response; // Возвращаем из кэша
                }
                // Пробуем загрузить из сети, если нет — fallback на profile.html
                return fetch(event.request).catch(() => {
                    if (event.request.url.includes('profile.html')) {
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
                    .map(name => caches.delete(name))
            );
        })
    );
    // Забираем контроль над страницами
    self.clients.claim();
});