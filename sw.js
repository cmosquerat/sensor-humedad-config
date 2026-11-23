/* Service worker: primero caché (funciona sin internet tras la primera carga).
   En segundo plano refresca la caché para que la siguiente apertura traiga la versión nueva. */
'use strict';
const CACHE = 'humedad-v1.0.0';
const ASSETS = ['./', './index.html', './manifest.webmanifest', './icon.svg'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('humedad-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  const isNav = req.mode === 'navigate';
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const cached = (await cache.match(req, { ignoreSearch: isNav })) || (isNav ? await cache.match('./index.html') : undefined);
    const refresh = fetch(req).then((res) => {
      if (res && res.ok && res.type === 'basic') cache.put(isNav ? './index.html' : req, res.clone());
      return res;
    }).catch(() => undefined);
    if (cached) { e.waitUntil(refresh); return cached; }
    const res = await refresh;
    return res || new Response('Sin conexión', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
  })());
});
