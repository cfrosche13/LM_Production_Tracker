// Operator Tracker PWA shell cache.
// Bump CACHE_NAME whenever a shell file below changes, so old caches get cleared on activate.
const CACHE_NAME = 'printtrack-shell-v1';

const SHELL_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './css/styles.css',
  './js/firebase.js',
  './js/constants.js',
  './js/state.js',
  './js/utils.js',
  './js/oee.js',
  './js/storage.js',
  './js/maintenance.js',
  './js/inventory.js',
  './js/reports.js',
  './js/orders.js',
  './js/settings.js',
  './js/printing.js',
  './js/stamped.js',
  './js/tally2.js',
  './js/colex.js',
  './js/tally.js',
  './js/app.js',
  './icons/icon-192.png',
  './icons/icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(
        names.filter((name) => name !== CACHE_NAME).map((name) => caches.delete(name))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Only handle same-origin GET requests for known shell files.
  // Everything else (Firebase auth/data, Google Fonts, the XLSX CDN script)
  // is left alone and goes straight to the network as normal.
  if (event.request.method !== 'GET' || url.origin !== self.location.origin) return;

  const isShellAsset = SHELL_ASSETS.some(
    (asset) => asset !== './' && url.pathname.endsWith(asset.slice(1))
  );
  if (!isShellAsset) return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      const network = fetch(event.request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          }
          return response;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
