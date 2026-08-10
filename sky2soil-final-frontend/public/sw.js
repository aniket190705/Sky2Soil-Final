const CACHE_NAME = "sky2soil-cache-v1";
const PRECACHE_ASSETS = [
  "/",
  "/index.html",
  "/ort.min.js",
  "/ort-wasm.wasm",
  "/assets/models/best_model.onnx"
];

// 1. Install Event: pre-cache critical files
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("Service Worker: Pre-caching app shell assets...");
      return cache.addAll(PRECACHE_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// 2. Activate Event: clean up old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log("Service Worker: Clearing old cache...", cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// 3. Fetch Event: serve from cache or network (Stale-While-Revalidate)
self.addEventListener("fetch", (event) => {
  // Only handle GET requests
  if (event.request.method !== "GET") {
    return;
  }

  const url = new URL(event.request.url);

  // Skip intercepting direct ESP32 local telemetry or history requests
  if (url.hostname === "192.168.4.1") {
    return;
  }

  // Bypass chrome extension requests
  if (url.protocol === "chrome-extension:") {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Serve from cache immediately, and fetch updated copy in the background
        fetch(event.request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(event.request, networkResponse);
              });
            }
          })
          .catch(() => {
            /* Network failed silently, continue using cache */
          });
        return cachedResponse;
      }

      // Fetch from network and cache for next time
      return fetch(event.request).then((networkResponse) => {
        if (!networkResponse || networkResponse.status !== 200) {
          return networkResponse;
        }

        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });
        return networkResponse;
      }).catch((err) => {
        // Network failed and not in cache: return index.html for React SPA navigation fallback if HTML request
        if (event.request.headers.get("accept").includes("text/html")) {
          return caches.match("/index.html");
        }
        throw err;
      });
    })
  );
});
