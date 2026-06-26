/*
 * ERP Nexus — legacy service worker, RETIRED.
 *
 * The old vanilla PWA registered a cache-first service worker at the site root,
 * which could keep serving the OLD app from cache on returning devices (and
 * required hard refreshes). This replacement unregisters itself and clears all
 * caches, so any device that used the old PWA loads the new app from the
 * network. New visitors are unaffected.
 */
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      try {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      } catch (e) {
        /* ignore */
      }
      try {
        await self.clients.claim();
      } catch (e) {
        /* ignore */
      }
      try {
        await self.registration.unregister();
      } catch (e) {
        /* ignore */
      }
    })()
  );
});

// No fetch handler — requests go straight to the network (never the old cache).
