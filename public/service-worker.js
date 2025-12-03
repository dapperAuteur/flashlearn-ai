const CACHE_NAME = 'flashlearn-v1';
const OFFLINE_URL = '/offline';
// Assets to cache on install
const STATIC_ASSETS = [
  '/',
  '/offline',
  '/study',
  '/manifest.json',
];

// Install: Cache critical assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
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
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
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
      (async () => {
      try {
        const networkResponse = await fetch(event.request);
        if (networkResponse.ok) {
          const cache = await caches.open(CACHE_NAME);
          cache.put(event.request, networkResponse.clone());
        }
        return networkResponse;
      } catch (error) {
        const cachedResponse = await caches.match(event.request);
        if (cachedResponse) {
          return cachedResponse;
        }
        if (event.request.mode === 'navigate') {
          return caches.match(OFFLINE_URL);
        }
        throw error;
      }
    })()
  );
}
});
// Background sync for study sessions
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-study-sessions') {
    event.waitUntil(syncStudySessions());
  }
});
async function syncStudySessions() {
  console.log('Background sync triggered for study sessions');
}