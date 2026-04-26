// Service Worker — modo BYPASS (cache desactivado para evitar versiones viejas)
// Este SW se desregistra a sí mismo y limpia todos los caches existentes.

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.map(key => caches.delete(key)))
    ).then(() => self.clients.claim())
  );
});

// Sin interceptar fetch: todo va directo a la red
self.addEventListener('fetch', () => {});
