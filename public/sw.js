// Ghotki Blood Donors Network - Static App Shell Service Worker
// Injected build version placeholder (replaced dynamically during build)
const SW_VERSION = '__SW_BUILD_VERSION__';
const CACHE_NAME = `ghotki-blood-donors-shell-${SW_VERSION}`;

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

// Fetch handler: Network-first with timeout for HTML/navigation; Cache-first for hashed assets
self.addEventListener('fetch', (event) => {
  const request = event.request;

  // Only handle GET requests
  if (request.method !== 'GET') {
    return;
  }

  const url = new URL(request.url);

  // STRICT REQUIREMENT: NEVER cache API responses.
  // Exclude all requests to script.google.com, firebaseio.com, googleapis.com, and local /api/ routes
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

  const isNavigation = request.mode === 'navigate';
  const isHtml = isNavigation || url.pathname.endsWith('.html') || url.pathname.endsWith('/');

  // 1. NAVIGATION & HTML REQUESTS: NETWORK-FIRST WITH 3-SECOND TIMEOUT
  if (isHtml) {
    event.respondWith(
      new Promise((resolve) => {
        let timedOut = false;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => {
          timedOut = true;
          controller.abort();
        }, 3000);

        fetch(request, { signal: controller.signal })
          .then((networkResponse) => {
            clearTimeout(timeoutId);
            if (networkResponse && networkResponse.status === 200 && networkResponse.type !== 'opaque') {
              const responseToCache = networkResponse.clone();
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(request, responseToCache);
              }).catch(() => {});
            }
            resolve(networkResponse);
          })
          .catch(() => {
            clearTimeout(timeoutId);
            // Network failed or timed out (e.g. offline): fallback to cached index.html
            caches.match(request).then((cachedResponse) => {
              if (cachedResponse) {
                resolve(cachedResponse);
                return;
              }
              // Fallback to cached root entry if specific URL match failed
              caches.match('./index.html').then((indexCached) => {
                if (indexCached) {
                  resolve(indexCached);
                } else {
                  caches.match('./').then((rootCached) => {
                    resolve(rootCached || Response.error());
                  });
                }
              });
            });
          });
      })
    );
    return;
  }

  // 2. STATIC ASSETS & HASHED FILES: CACHE-FIRST
  // Vite puts build assets with unique content hashes in /assets/ (e.g. /assets/index-BBBtxANl.js)
  const isStaticAsset = (
    isFont ||
    url.pathname.includes('/assets/') ||
    /\.(js|mjs|css|png|jpg|jpeg|svg|webp|ico|woff|woff2|ttf|json)$/i.test(url.pathname)
  );

  if (!isStaticAsset) {
    return;
  }

  event.respondWith(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }

        // Cache miss: fetch from network, cache it, and return
        return fetch(request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200 && networkResponse.type !== 'opaque') {
            cache.put(request, networkResponse.clone());
          }
          return networkResponse;
        });
      });
    })
  );
});
