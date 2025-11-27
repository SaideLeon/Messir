
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
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        // Attempt to cache core assets. 
        // We catch errors to prevent the entire install from failing if one CDN is flaky.
        return cache.addAll(URLS_TO_CACHE).catch(err => {
            console.warn('One or more assets failed to cache:', err);
        });
      })
  );
});

self.addEventListener('fetch', (event) => {
  // Navigation requests: Network first, fall back to cache (to ensure app updates)
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .catch(() => {
          return caches.match(event.request) || caches.match('./index.html');
        })
    );
    return;
  }

  // Stale-while-revalidate strategy for other requests
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request).then((networkResponse) => {
        // Update cache if network response is valid
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      }).catch(err => {
         // Network failed
         console.debug('Network fetch failed', err);
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
    })
  );
});
