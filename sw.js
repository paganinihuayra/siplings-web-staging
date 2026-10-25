// Service worker: caches the app shell so the app opens offline and fast
// (docs/06-ux-and-screens.md §14, docs/11-testing-and-deploy.md §14.2).
// API calls go to Supabase (another origin) and are never cached here.
const BUILD_ID = '384bcaebafc9';
// eslint-disable-next-line no-undef -- replaced with the file list at build time
const PRECACHE = ["./","assets/baloo-2-latin-600-normal-tIfxVoAe.woff2","assets/baloo-2-latin-800-normal-BbF3Etk1.woff2","assets/brands-WtuD-gh4.js","assets/index-Cd3DOxaW.css","assets/index-DDlUOIbO.js","assets/nunito-latin-400-normal-r8SDr6Up.woff2","assets/nunito-latin-700-normal-Dort48En.woff2","icons/icon-192.png","icons/icon-512.png","manifest.webmanifest"];
const CACHE = `shell-${BUILD_ID}`;

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(PRECACHE)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== self.location.origin) return;
  if (url.pathname.endsWith('/build.json')) return; // always fresh
  if (req.mode === 'navigate') {
    // Network first for the page, so a new build shows up; the cached shell offline.
    event.respondWith(fetch(req).catch(() => caches.match('./', { ignoreSearch: true })));
    return;
  }
  event.respondWith(caches.match(req).then((hit) => hit ?? fetch(req)));
});

// Pushes carry no payload (docs/06-ux-and-screens.md §15): the one notice M5 sends is the
// opt-in "egg ready" line, in the town's voice. Tapping it opens the nest.
self.addEventListener('push', (event) => {
  event.waitUntil(
    self.registration.showNotification('Siplings', {
      body: 'Your egg is ready to hatch!',
      tag: 'eggs',
      icon: './icons/icon-192.png',
      data: { url: './#/nest' },
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = new URL(event.notification.data?.url ?? './', self.registration.scope).href;
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      const open = list.find((c) => c.url.startsWith(self.registration.scope));
      if (open) return open.navigate(url).then((c) => (c ?? open).focus());
      return self.clients.openWindow(url);
    }),
  );
});
