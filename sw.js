// sw.js — Simple offline-first service worker for Sinhala Trainer

const VERSION = "v1.0.0";
const STATIC_CACHE = `static-${VERSION}`;
const RUNTIME_CACHE = `runtime-${VERSION}`;
const LESSON_CACHE = `lessons-${VERSION}`;

const APP_SHELL = [
  "./",
  "./index.html",
  "./app.js",
  "./sw.js",
  "./manifest.json" // if you don't have this yet, it's fine; fetch will just miss
];

// Install: pre-cache app shell
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

// Activate: clean up old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => ![STATIC_CACHE, RUNTIME_CACHE, LESSON_CACHE].includes(k))
          .map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// Helper: detect JSON lesson/content requests
function isLessonRequest(req) {
  const url = new URL(req.url);
  if (req.method !== "GET") return false;
  return (
    url.pathname.includes("/content/") ||
    url.pathname.includes("/src/content/") ||
    url.pathname.endsWith(".json")
  );
}

// Helper: navigation requests (SPA fallback)
function isNavigationRequest(event) {
  return event.request.mode === "navigate" ||
         (event.request.method === "GET" &&
          event.request.headers.get("accept")?.includes("text/html"));
}

// Fetch: strategy routing
self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Only handle GET
  if (req.method !== "GET") return;

  // Lessons/content JSON: stale-while-revalidate from LESSON_CACHE
  if (isLessonRequest(req)) {
    event.respondWith(staleWhileRevalidate(req, LESSON_CACHE));
    return;
  }

  // App shell navigation: cache-first with SPA fallback to index.html
  if (isNavigationRequest(event)) {
    event.respondWith(
      caches.match("./index.html", { cacheName: STATIC_CACHE }).then((cached) => {
        return cached || fetch("./index.html");
      })
    );
    return;
  }

  // Same-origin static assets (js/css/images): cache-first from STATIC_CACHE
  if (url.origin === self.location.origin) {
    event.respondWith(cacheFirst(req, STATIC_CACHE));
    return;
  }

  // Everything else: network-first (API, third-party)
  event.respondWith(networkFirst(req, RUNTIME_CACHE));
});

// Strategies
async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;
  try {
    const res = await fetch(request);
    if (res && res.ok) cache.put(request, res.clone());
    return res;
  } catch (err) {
    return cached || Response.error();
  }
}

async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const res = await fetch(request);
    if (res && res.ok) cache.put(request, res.clone());
    return res;
  } catch (err) {
    const cached = await cache.match(request);
    if (cached) return cached;
    return Response.error();
  }
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cachedPromise = cache.match(request);
  const networkPromise = fetch(request)
    .then((res) => {
      if (res && res.ok) cache.put(request, res.clone());
      return res;
    })
    .catch(() => null);

  const cached = await cachedPromise;
  if (cached) {
    // Kick off network update but return cached immediately
    eventWait(networkPromise);
    return cached;
  }

  // No cache? fall back to network
  const network = await networkPromise;
  if (network) return network;
  return Response.error();
}

// Keep event alive for background tasks
function eventWait(promise) {
  // Some browsers require a noop extendable event; guarded call
  try {
    self.addEventListener("fetch", () => {}); // noop to keep type happy
  } catch {}
  // We can't access the original event here, so this is a safe no-op helper.
  // (Background update proceeds regardless.)
}

// Listen for manual skipWaiting message (optional)
self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") self.skipWaiting();
});
