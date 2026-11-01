// The service-worker kill switch (docs/11-testing-and-deploy.md §14.2). Deployed in place of
// sw.js only if a bad service worker ever traps phones on a broken build: on their next open
// it clears every cache, unregisters itself, and reloads open pages from the network. The
// offline log queue lives in IndexedDB and is never touched.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      for (const key of await caches.keys()) await caches.delete(key);
      await self.registration.unregister();
      for (const client of await self.clients.matchAll({ type: 'window' }))
        client.navigate(client.url);
    })(),
  );
});
