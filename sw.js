// Offline support: always try the network first so updates show up straight away,
// and fall back to the cached copy when there is no connection.
const CACHE = 'habits-v3';
const ASSETS = ['./', 'index.html', 'manifest.webmanifest', 'icon-180.png', 'icon-192.png', 'icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    const old = (await caches.keys()).filter(k => k !== CACHE);
    await Promise.all(old.map(k => caches.delete(k)));
    await self.clients.claim();
    // Replacing an older version: reload any open copy of the app so it is not left on stale pages.
    if (old.length) {
      for (const client of await self.clients.matchAll({type: 'window'})) client.navigate(client.url).catch(() => {});
    }
  })());
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  // The page itself is always re-checked with the server, so a new version is never hidden by the browser's cache.
  const fresh = req.mode === 'navigate' ? fetch(req.url, {cache: 'no-cache'}) : fetch(req);
  e.respondWith(
    fresh.then(res => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
      return res;
    }).catch(() => caches.match(req, {ignoreSearch: true}))
  );
});
