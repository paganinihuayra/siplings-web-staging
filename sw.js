// Service worker: caches the app shell so the app opens offline and fast
// (docs/06-ux-and-screens.md §14, docs/11-testing-and-deploy.md §14.2).
// API calls go to Supabase (another origin) and are never cached here.
const BUILD_ID = '8e61e57d0b30';
// eslint-disable-next-line no-undef -- replaced with the file list at build time
const PRECACHE = ["./","assets/baloo-2-latin-600-normal-tIfxVoAe.woff2","assets/baloo-2-latin-800-normal-BbF3Etk1.woff2","assets/brands-WtuD-gh4.js","assets/index-DK-xm_ev.css","assets/index-Dg48xLAy.js","assets/nunito-latin-400-normal-r8SDr6Up.woff2","assets/nunito-latin-700-normal-Dort48En.woff2","icons/icon-192.png","icons/icon-512.png","manifest.webmanifest"];
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

// Event notifications (docs/03b-events.md §11, docs/06-ux-and-screens.md §14.5): show the
// town's message; a tap opens the app on the screen the push names, which offers the
// one-tap off (iOS web pushes have no action buttons). Never a silent push.
self.addEventListener('push', (event) => {
  let msg = { title: 'Siplings', body: '', url: '#/town' };
  try {
    msg = { ...msg, ...event.data.json() };
  } catch {
    // a push without our JSON shows the plain title
  }
  event.waitUntil(
    self.registration.showNotification(msg.title, {
      body: msg.body,
      icon: 'icons/icon-192.png',
      data: { url: msg.url },
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = new URL(event.notification.data?.url ?? '#/town', self.registration.scope).href;
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      const open = list.find((c) => c.url.startsWith(self.registration.scope));
      if (open) return open.navigate(target).then((c) => c?.focus());
      return self.clients.openWindow(target);
    }),
  );
});
