const CACHE_NAME = 'flashlearn-offline-v1';

// Install: Cache critical assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(['/study', '/offline']);
    })
  );
  self.skipWaiting();
});

// Activate: Clean old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((name) => {
          if (name !== CACHE_NAME) {
            return caches.delete(name);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch: Network first, fallback to cache
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // CRITICAL: Never cache auth routes
  if (
    url.pathname.startsWith('/api/auth/') ||
    url.pathname.startsWith('/auth/') ||
    request.method !== 'GET'
  ) {
    // Let auth requests pass through normally
    return;
  }
  
  // Skip non-GET requests
  if (request.method !== 'GET') return;
  
  // Handle navigation requests (page loads)
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Don't cache redirects
          if (response.type === 'opaqueredirect' || response.redirected) {
            return response;
          }
          // Cache successful responses
          if (response.ok) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          // Offline: serve cached /offline fallback page
          return caches.match('/offline').then((cached) => {
            return cached || new Response('You are offline. Please reconnect to continue.');
          });
        })
    );
    return;
  }
  
  // Handle assets: Cache first
  if (request.url.includes('/_next/') || request.url.includes('/static/')) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        
        return fetch(request).then((response) => {
          if (response.ok) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return response;
        });
      })
    );
    return;
  }
  
  // Everything else: Network first
  event.respondWith(
    fetch(request).catch(() => {
      return caches.match(request);
    })
  );
});