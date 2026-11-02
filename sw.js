// Service worker: caches the app shell so the app opens offline and fast
// (docs/06-ux-and-screens.md §14, docs/11-testing-and-deploy.md §14.2).
// API calls go to Supabase (another origin) and are never cached here.
const BUILD_ID = '49c08c7e7ca1';
// eslint-disable-next-line no-undef -- replaced with the file list at build time
const PRECACHE = ["./","assets/app/icon-512.png?v=ece9a151","assets/app/icon-maskable-512.png?v=32ee096c","assets/baloo-2-latin-600-normal-tIfxVoAe.woff2","assets/baloo-2-latin-800-normal-BbF3Etk1.woff2","assets/brands-WtuD-gh4.js","assets/index-3RTa4uJ9.js","assets/index-CnV04S6D.css","assets/nunito-latin-400-normal-r8SDr6Up.woff2","assets/nunito-latin-700-normal-Dort48En.woff2","assets/ui/currency/coasters.webp?v=011f9505","assets/ui/currency/golden-caps.webp?v=9e2ccc65","assets/ui/logging/beer-bottle.svg?v=d529284c","assets/ui/logging/beer-can.svg?v=6a3eae45","assets/ui/logging/beer-pint.svg?v=e229ae3b","assets/ui/logging/beer-tall.svg?v=f8e1dc08","assets/ui/logging/cocktail.svg?v=2ea6915c","assets/ui/logging/spirit-balloon.svg?v=fb0dd2a0","assets/ui/logging/spirit-copita.svg?v=aa54e336","assets/ui/logging/spirit-highball.svg?v=de78e7c4","assets/ui/logging/spirit-rocks.svg?v=904ff8ee","assets/ui/logging/spirit-shot.svg?v=b28a6136","assets/ui/logging/wine-flute.svg?v=04d340dc","assets/ui/logging/wine-glass.svg?v=3f267da0","assets/ui/logging/wine-large.svg?v=dd9aa297","assets/ui/logging/wine-small.svg?v=d765b90d","assets/ui/moods/happy.svg?v=742f5aea","assets/ui/moods/neutral.svg?v=d519e8b6","assets/ui/moods/sleepy.svg?v=3c6e2879","assets/ui/streak/flame.webp?v=a6a03752","assets/ui/streak/grace-day.webp?v=1dbdffc2","assets/ui/streak/resting.webp?v=d0288494","icons/icon-192.png","icons/icon-512.png","manifest.webmanifest"];
const CACHE = `shell-${BUILD_ID}`;
// Shipped art (doc 05 §10) is addressed by content hash (`?v=` from assets/manifest.json), so
// a cached copy never goes stale: it lives in its own cache that outlasts app updates.
const ART = 'art-v1';
const isArt = (url) =>
  /\/assets\/(pets|homes|items|eggs|town|fx|ui|backdrops|events|app|accessories|hybrids)\//.test(
    url.pathname,
  );

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(PRECACHE)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE && k !== ART).map((k) => caches.delete(k))),
      )
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
  if (isArt(url)) {
    // Cache first; a miss is fetched and kept. A failed fetch (offline, or a file missing
    // from the deploy) rejects, and the app shows the placeholder (lib/art.ts).
    event.respondWith(
      caches.match(req).then(
        (hit) =>
          hit ??
          fetch(req).then((res) => {
            if (res.ok) {
              const copy = res.clone();
              caches.open(ART).then((c) => c.put(req, copy));
            }
            return res;
          }),
      ),
    );
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
