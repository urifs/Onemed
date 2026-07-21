// The PWA install feature for /membros has been removed — this file only
// exists to reach any browser that already registered the old (buggy)
// service worker and make it undo itself: wipe every cache, unregister,
// and reload any open tab so nobody stays stuck on whatever it was doing.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.map((key) => caches.delete(key)));
      await self.registration.unregister();
      const clients = await self.clients.matchAll({ type: 'window' });
      clients.forEach((client) => client.navigate(client.url));
    })()
  );
});
