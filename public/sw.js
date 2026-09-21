const CACHE_NAME = 'e-sarpras-cache-v3';
const ASSETS_TO_CACHE = [
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png'
];

// Request domains that must NEVER be served from the offline cache
// (live database/auth traffic — intercepting these causes "stuck connecting" symptoms).
const NEVER_CACHE_PATTERNS = [
  '/api/gas-proxy',
  '/macros/s/',
  'googleapis.com',
  'firebaseio.com',
  'gstatic.com'
];

// Max time to wait for the network before falling back to cache.
const NETWORK_TIMEOUT_MS = 6000;

// Install Event - cache core static shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Caching App Shell...');
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => self.skipWaiting())
  );
});

// Activate Event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(
        keyList.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[Service Worker] Removing old cache:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event - network first (with timeout), fallback to cache
self.addEventListener('fetch', (event) => {
  const url = event.request.url;

  // Do not intercept non-GET requests, or live API/database traffic.
  if (event.request.method !== 'GET' || NEVER_CACHE_PATTERNS.some((p) => url.includes(p))) {
    return;
  }

  event.respondWith(
    Promise.race([
      fetch(event.request),
      new Promise((_, reject) => setTimeout(() => reject(new Error('sw-network-timeout')), NETWORK_TIMEOUT_MS))
    ])
      .then((response) => {
        // If valid response, clone it to cache
        if (response && response.status === 200 && response.type === 'basic') {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return response;
      })
      .catch(() => {
        // Network failed or timed out - fall back to cache
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          // If both fail and it is a navigation request, return the app shell
          if (event.request.mode === 'navigate') {
            return caches.match('/');
          }
        });
      })
  );
});
