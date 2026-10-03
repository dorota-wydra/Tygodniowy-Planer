// Minimal service worker — enables PWA install ("Add to Home Screen").
// No offline caching to avoid stale builds.

const VERSION = "planer-v1";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// Network-first strategy — always fetch fresh content when online
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  if (!event.request.url.startsWith("http")) return;

  event.respondWith(
    fetch(event.request).catch(() => {
      // If offline and it's a navigation request, return a simple offline page
      if (event.request.mode === "navigate") {
        return new Response(
          '<html><body style="font-family:sans-serif;text-align:center;padding:60px"><h2>Brak połączenia</h2><p>Połącz się z internetem i odśwież stronę.</p></body></html>',
          { headers: { "Content-Type": "text/html" } }
        );
      }
      return new Response("", { status: 503 });
    })
  );
});
