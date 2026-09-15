const CACHE_NAME = "pompom-board-club-v2-local2p";

const APP_FILES = [
  "./",
  "./index.html",
  "./play-mode.js",
  "./play-mode.css",
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
  "./assets/app-icon.png",
  "./assets/pomeranians.jpeg",
  ...["black", "white"].flatMap(color => ["default", "thinking", "win", "lose"].map(pose => `./assets/dogs/${color}-${pose}.webp`))
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_FILES))
  );
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key.startsWith("pompom-board-club-") && key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      ).then(() => self.clients.claim())
    )
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      return cached || fetch(event.request);
    })
  );
});
