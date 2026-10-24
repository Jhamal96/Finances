/* Household Finance PWA: service worker for app shell and real Web Push reception.
   Background reminders require a separately configured web-push sender.
*/
const CACHE_NAME = 'household-finance-pwa-v14-username-login-fix';
const APP_HOME = new URL('index.html', self.registration.scope).toString();

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    // Best-effort precache ensures the dashboard shell is available after installation.
    await Promise.allSettled(['./index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png'].map(path => cache.add(path)));
    await self.skipWaiting();
  })());
});
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter(n => n.startsWith('household-finance-pwa-') && n !== CACHE_NAME).map(n => caches.delete(n)));
    await self.clients.claim();
  })());
});
self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // Never cache the Supabase API or other domains containing financial data.
  if (url.origin !== self.location.origin) return;
  if (req.mode !== 'navigate' && !/\.(?:html|js|css|png|webp|svg|webmanifest)$/.test(url.pathname)) return;
  event.respondWith((async () => {
    try {
      const response = await fetch(req);
      if (response.ok) {
        const cache = await caches.open(CACHE_NAME);
        cache.put(req, response.clone()).catch(() => {});
      }
      return response;
    } catch (err) {
      const cached = await caches.match(req);
      if (cached) return cached;
      if (req.mode === 'navigate') {
        const start = await caches.match(APP_HOME) || await caches.match(new URL('index.html', APP_HOME).toString());
        if (start) return start;
      }
      throw err;
    }
  })());
});
self.addEventListener('push', event => {
  let payload = {};
  try { payload = event.data ? event.data.json() : {}; } catch (e) { payload = { body: event.data?.text() || '' }; }
  event.waitUntil(self.registration.showNotification(payload.title || 'Household Finance Reminder', {
    body: payload.body || 'You have an upcoming payment.',
    icon: './icon-192.png',
    badge: './icon-192.png',
    tag: payload.tag || 'finance-payment',
    data: { url: './' }
  }));
});
self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type:'window', includeUncontrolled: true });
    const inScope = windows.find(w => w.url.startsWith(self.registration.scope));
    if (inScope) return inScope.focus();
    return self.clients.openWindow(new URL('index.html', self.registration.scope).toString());
  })());
});
