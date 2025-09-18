const CACHE_NAME = "unfork-nepal-v1";
const STATIC_CACHE_NAME = "unfork-nepal-static-v1";

// Assets to cache immediately on install
const STATIC_ASSETS = [
  "/",
  "/favicon.svg",
  "/assets/styles.css",
  "/assets/smooth-scroll.js",
];

// Install event - cache static assets
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME)
      .then((cache) => cache.addAll(STATIC_ASSETS)),
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && cacheName !== STATIC_CACHE_NAME) {
            return caches.delete(cacheName);
          }
        }),
      );
    }),
  );
  self.clients.claim();
});

// Fetch event - implement stale while revalidate strategy
self.addEventListener("fetch", (event) => {
  // Only handle GET requests
  if (event.request.method !== "GET") return;

  // Skip cross-origin requests
  if (!event.request.url.startsWith(self.location.origin)) return;

  // Skip API calls and dynamic content
  if (
    event.request.url.includes("/api/") ||
    event.request.url.includes("?") ||
    event.request.url.includes("#")
  ) {
    return;
  }

  event.respondWith(
    caches.open(CACHE_NAME).then((cache) => {
      // Try to get from cache first
      return cache.match(event.request).then((cachedResponse) => {
        // Start fetching fresh version in background
        const fetchPromise = fetch(event.request).then((networkResponse) => {
          // Only cache successful responses
          if (networkResponse.ok) {
            cache.put(event.request, networkResponse.clone());
          }
          return networkResponse;
        }).catch(() => {
          // If network fails and we have cached version, return it
          return cachedResponse;
        });

        // Return cached version immediately if available, otherwise wait for network
        return cachedResponse || fetchPromise;
      });
    }),
  );
});
