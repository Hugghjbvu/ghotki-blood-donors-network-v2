// Ghotki Blood Donors Network - Static App Shell Service Worker
const CACHE_NAME = 'ghotki-blood-donors-shell-v2';

// Install: precache the base static app shell and skip waiting immediately
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Pre-cache root entry points
      return cache.addAll([
        './',
        './index.html'
      ]).catch(() => {
        // Safe catch for environments where relative entry might vary
      });
    })
  );
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

// Fetch: Cache-first strategy for app's static files, strictly NEVER cache API requests
self.addEventListener('fetch', (event) => {
  const request = event.request;

  // Only handle GET requests
  if (request.method !== 'GET') {
    return;
  }

  const url = new URL(request.url);

  // STRICT REQUIREMENT: NEVER cache API responses.
  // Exclude all requests to script.google.com and to firebaseio.com entirely.
  if (
    url.hostname.includes('script.google.com') ||
    url.hostname.includes('firebaseio.com') ||
    url.hostname.includes('googleapis.com') ||
    url.pathname.includes('/api/') ||
    url.searchParams.has('action')
  ) {
    return; // Pass through to network directly without caching
  }

  // Only handle app shell assets (same origin or Google fonts)
  const isSameOrigin = url.origin === self.location.origin;
  const isFont = url.hostname.includes('fonts.googleapis.com') || url.hostname.includes('fonts.gstatic.com');

  if (!isSameOrigin && !isFont) {
    return;
  }

  // Determine if it is a static build asset or navigation request
  const isNavigation = request.mode === 'navigate';
  const isStaticAsset = (
    isNavigation ||
    /\.(html|js|mjs|css|png|jpg|jpeg|svg|webp|ico|woff|woff2|ttf|json)$/i.test(url.pathname) ||
    url.pathname.includes('/assets/')
  );

  if (!isStaticAsset) {
    return;
  }

  // Cache-First strategy:
  // 1. Immediately return cached response if available (instant loading on repeat visits).
  // 2. Concurrently fetch fresh version in background and update cache if new build deployed.
  // 3. If cache miss, wait for network, cache the result, and return it.
  event.respondWith(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.match(request).then((cachedResponse) => {
        // Background network fetch for revalidation & cache updating
        const networkFetchPromise = fetch(request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200 && networkResponse.type !== 'opaque') {
              cache.put(request, networkResponse.clone());
            }
            return networkResponse;
          })
          .catch((err) => {
            // If offline on navigation, fallback to cached index.html
            if (isNavigation) {
              return cache.match('./index.html') || cache.match('./');
            }
            throw err;
          });

        // Return cached asset immediately if found, else wait for network
        if (cachedResponse) {
          // Trigger background update silently
          networkFetchPromise.catch(() => {});
          return cachedResponse;
        }

        return networkFetchPromise;
      });
    })
  );
});
