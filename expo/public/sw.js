/* STEKO Service Worker — app shell caching for offline PWA support */

// Bump this version on every deploy to force all clients to fetch fresh assets.
const CACHE_VERSION = "2026-08-13-v3";
const CACHE_NAME = `steko-${CACHE_VERSION}`;

// Derive the scope path dynamically so the SW works regardless of where
// it's deployed (root domain or subpath like /STEKO/ on GitHub Pages).
const SCOPE_PATH = new URL(self.registration.scope).pathname;

const APP_SHELL = [
  SCOPE_PATH,
  SCOPE_PATH + "manifest.json",
  SCOPE_PATH + "assets/images/icon.png",
  SCOPE_PATH + "assets/images/favicon.png",
  SCOPE_PATH + "assets/images/splash-icon.png",
];

// Install: pre-cache the app shell.
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)),
  );
  self.skipWaiting();
});

// Activate: clean up ALL old caches (any cache not matching CACHE_NAME).
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== CACHE_NAME)
          .map((k) => caches.delete(k)),
      ),
    ),
  );
  self.clients.claim();
});

// Fetch: network-first for navigation requests, network-first for assets.
self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Only handle GET requests.
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Navigation requests: network-first, fall back to cached shell.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Only cache successful responses — never cache 4xx/5xx errors.
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
            return response;
          }
          // GitHub Pages returns 404 for unknown client-side routes. Serve the
          // cached app shell so Expo Router can handle the path once JS loads.
          return caches.match(request).then((r) => r || caches.match(SCOPE_PATH));
        })
        .catch(() =>
          caches.match(request).then((r) => r || caches.match(SCOPE_PATH)),
        ),
    );
    return;
  }

  // Same-origin static assets: network-first with cache fallback.
  // This ensures users always get the latest JS/CSS on deploy, while
  // still serving cached assets when offline.
  if (url.origin === self.location.origin) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok && response.type === "basic") {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => caches.match(request).then((cached) => cached || fetch(request))),
    );
    return;
  }

  // Cross-origin requests: network-only.
  // Don't intercept — let the browser handle them normally.
});
