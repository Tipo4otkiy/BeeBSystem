// Этот Service Worker работает в режиме "Только сеть" и убивает старый кэш

self.addEventListener('install', (e) => {
    // Заставляем новый SW активироваться немедленно
    self.skipWaiting();
});

self.addEventListener('activate', (e) => {
    // При активации удаляем ВООБЩЕ ВСЕ кэши, которые были созданы ранее
    e.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    console.log('Удаляем старый кэш:', cacheName);
                    return caches.delete(cacheName);
                })
            );
        }).then(() => {
            return self.clients.claim();
        })
    );
});

self.addEventListener('fetch', (e) => {
    // Всегда идем в сеть (Network Only), никакого кэша
    e.respondWith(fetch(e.request));
});