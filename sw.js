
const CACHE_NAME = 'messir-v1';
const URLS_TO_CACHE = [
  './',
  './index.html',
  './index.tsx',
  'https://cdn.tailwindcss.com?plugins=typography',
  'https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css',
  'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap',
  'https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500&display=swap'
];

self.addEventListener('install', (event) => {
  // Perform install steps
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache');
        // Catch errors to ensure installation continues even if one asset fails
        return cache.addAll(URLS_TO_CACHE).catch(err => {
            console.warn('Failed to cache some assets during install:', err);
        });
      })
  );
  // Force the waiting service worker to become the active service worker
  self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  // Filter out non-http requests (e.g. chrome-extension://)
  if (!event.request.url.startsWith('http')) return;

  // For navigation requests (HTML), use Network First, then Cache
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .catch(() => {
          return caches.match('./index.html') || caches.match('./');
        })
    );
    return;
  }

  // For other requests (CSS, JS, Images), use Stale-While-Revalidate
  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        // Fetch from network to update cache
        const fetchPromise = fetch(event.request).then((networkResponse) => {
            // Check if we received a valid response
            if (!networkResponse || networkResponse.status !== 200) {
                return networkResponse;
            }

            // Allow caching of basic (same-origin) and cors (CDN) response types
            if (networkResponse.type === 'basic' || networkResponse.type === 'cors') {
                const responseToCache = networkResponse.clone();
                caches.open(CACHE_NAME).then((cache) => {
                    cache.put(event.request, responseToCache);
                });
            }

            return networkResponse;
        }).catch(err => {
            console.debug('Fetch failed:', err);
        });

        // Return cached response immediately if available, otherwise wait for network
        return cachedResponse || fetchPromise;
      })
  );
});

self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
        // Take control of all clients immediately
        return self.clients.claim();
    })
  );
});
