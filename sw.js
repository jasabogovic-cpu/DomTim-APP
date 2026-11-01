// Preprost service worker: omogoča namestitev na telefon in hitrejše odpiranje.
// Podatki (Supabase) gredo vedno v živo, shranjujejo se samo datoteke aplikacije.
const CACHE = 'domtim-1793536979';
const LUPINA = ['./', 'index.html', 'app.js', 'app.css', 'manifest.webmanifest', 'ikone/ikona-192.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(LUPINA)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((k) => Promise.all(k.filter((x) => x !== CACHE).map((x) => caches.delete(x)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  // najprej omrežje (vedno najnovejša verzija), ob izpadu shranjena kopija
  e.respondWith(
    fetch(e.request)
      .then((r) => { const kopija = r.clone(); caches.open(CACHE).then((c) => c.put(e.request, kopija)); return r; })
      .catch(() => caches.match(e.request, { ignoreSearch: true }).then((r) => r || caches.match('index.html')))
  );
});

// --- Obvestila (push) ---
self.addEventListener('push', (e) => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch { d = { title: 'DOMtim', body: e.data && e.data.text() }; }
  e.waitUntil(self.registration.showNotification(d.title || 'DOMtim', {
    body: d.body || '',
    icon: 'ikone/ikona-192.png',
    badge: 'ikone/ikona-192.png',
    tag: d.tag,
    renotify: true,
    data: { url: d.url || './' },
  }));
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const cilj = new URL(e.notification.data?.url || './', self.registration.scope).href;
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((okna) => {
    for (const o of okna) {
      if (o.url.startsWith(self.registration.scope)) { o.focus(); return o.navigate(cilj); }
    }
    return self.clients.openWindow(cilj);
  }));
});
