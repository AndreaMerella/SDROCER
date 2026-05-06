// SDROCER Service Worker
const CACHE_NAME = 'sdrocer-v1';
const PRECACHE   = ['/', '/index.html', '/manifest.json'];

// Install: precache shell assets
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(PRECACHE))
            .then(() => self.skipWaiting())
    );
});

// Activate: purge old caches
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys()
            .then(keys => Promise.all(
                keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
            ))
            .then(() => self.clients.claim())
    );
});

// Fetch: network-first for API, cache-first for shell
self.addEventListener('fetch', event => {
    // Always hit the network for Shazam API calls — never cache audio responses
    if (event.request.url.includes('rapidapi.com')) {
        event.respondWith(fetch(event.request));
        return;
    }

    // Cache-first for static shell assets
    event.respondWith(
        caches.match(event.request)
            .then(cached => cached || fetch(event.request))
    );
});
