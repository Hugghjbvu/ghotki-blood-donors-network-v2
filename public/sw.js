// Ghotki Blood Donors Network - Static Assets Service Worker
const CACHE_NAME = 'ghotki-blood-donors-shell-v3';

// Install: activate immediately without waiting
self.addEventListener('install', () => {
  self.skipWaiting();
});

// Activate: claim clients immediately and delete all outdated caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      caches.keys().then((keys) => {
        return Promise.all(
          keys.map((key) => {
            if (key !== CACHE_NAME) {
              return caches.delete(key);
            }
          })
        );
      })
    ])
  );
});

// Listen for message event from client to activate immediately if triggered
self.addEventListener('message', (event) => {
  if (event.data && (event.data.type === 'SKIP_WAITING' || event.data === 'SKIP_WAITING')) {
    self.skipWaiting();
  }
});

// Fetch: Cache-first strategy ONLY for /assets/ and Google Fonts, NEVER cache HTML or API requests
self.addEventListener('fetch', (event) => {
  const request = event.request;

  // Only handle GET requests
  if (request.method !== 'GET') {
    return;
  }

  const url = new URL(request.url);

  // 1. Ignore all navigation requests and all .html requests — let browser fetch index.html normally
  if (
    request.mode === 'navigate' ||
    url.pathname.endsWith('.html') ||
    url.pathname.includes('.html')
  ) {
    return;
  }

  // 2. STRICT REQUIREMENT: NEVER cache API responses.
  // Exclude all requests to script.google.com, firebaseio.com, and googleapis.com entirely.
  if (
    url.hostname.includes('script.google.com') ||
    url.hostname.includes('firebaseio.com') ||
    (url.hostname.includes('googleapis.com') && !url.hostname.includes('fonts.googleapis.com')) ||
    url.pathname.includes('/api/') ||
    url.searchParams.has('action')
  ) {
    return; // Pass through to network directly without caching
  }

  // 3. Keep cache-first behaviour ONLY for same-origin requests under /assets/ and for Google Fonts
  const isSameOriginAsset = url.origin === self.location.origin && url.pathname.includes('/assets/');
  const isFont = url.hostname.includes('fonts.googleapis.com') || url.hostname.includes('fonts.gstatic.com');

  if (!isSameOriginAsset && !isFont) {
    return;
  }

  // Cache-First strategy for hashed assets and fonts:
  // 1. Immediately return cached response if available.
  // 2. Concurrently fetch fresh version in background and update cache.
  // 3. If cache miss, wait for network, cache the result, and return it.
  event.respondWith(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.match(request).then((cachedResponse) => {
        const networkFetchPromise = fetch(request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200 && networkResponse.type !== 'opaque') {
              cache.put(request, networkResponse.clone());
            }
            return networkResponse;
          })
          .catch((err) => {
            throw err;
          });

        if (cachedResponse) {
          networkFetchPromise.catch(() => {});
          return cachedResponse;
        }

        return networkFetchPromise;
      });
    })
  );
});
