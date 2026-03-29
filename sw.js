const CACHE_NAME = "folders-cache-v1";

/* Files to cache on first load */
const STATIC_ASSETS = [
  "/",
  "/index.html",
  "/styles.css",
  "/videos.json",
  "/vip.json"
];

/* INSTALL → cache core files */
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
});

/* ACTIVATE → clean old cache */
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      );
    })
  );
});

/* FETCH → serve from cache first, then network */
self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;

      return fetch(event.request).then((response) => {
        // Cache new requests dynamically
        return caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, response.clone());
          return response;
        });
      }).catch(() => {
        // Optional fallback if offline
        if (event.request.destination === "document") {
          return caches.match("/");
        }
      });
    })
  );
});
