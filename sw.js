const CACHE = 'v4-dovidnyk';
const ASSETS = ['./index.html', './app.js', './manifest.json'];

self.addEventListener('install', e => {
    self.skipWaiting();
    e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
});

self.addEventListener('activate', e => {
    e.waitUntil(
        caches.keys().then(keys => {
            return Promise.all(
                keys.filter(key => key !== CACHE).map(key => caches.delete(key))
            );
        }).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', e => {
    e.respondWith(
        fetch(e.request)
            .then(res => {
                const resClone = res.clone();
                caches.open(CACHE).then(cache => cache.put(e.request, resClone));
                return res;
            })
            .catch(() => caches.match(e.request))
    );
});