const CACHE_NAME = "pompom-board-club-v1";

const APP_FILES = [
  "./",
  "./index.html",
  "./style.css",
  "./app.js",
  "./rivals.css",
  "./rivals.js",
  "./club-ux.css",
  "./club-ux.js",
  "./morris.js",
  "./threelevel.js",
  "./cardchess.js",
  "./quoridor.css",
  "./quoridor.js",
  "./quoridor-worker.js",
  "./manifest.json",
  "./assets/app-icon.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_FILES))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      return cached || fetch(event.request);
    })
  );
});