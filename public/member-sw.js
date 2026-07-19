// Deliberately does nothing beyond existing — this app deploys hotfixes
// constantly, and a service worker that caches/intercepts navigation or
// script requests risks serving stale (or briefly broken) code after every
// deploy, which is exactly what happened right after this file first shipped
// with a cache-first/network-first strategy: it left users stuck on a
// spinner after login until they force-reloaded.
//
// A service worker with zero fetch interception is still enough for Chrome's
// PWA install criteria (manifest + HTTPS + a registered service worker) —
// every request just falls through to the network exactly as if there were
// no service worker at all.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.map((key) => caches.delete(key))))
  );
  self.clients.claim();
});
