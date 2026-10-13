/* OFL Connect — service worker: uygulama kabuğunu önbelleğe alır,
   böylece uygulama ana ekrandan anında açılır. Sürüm numarasını her
   yayında artırın ki kullanıcılar yeni dosyaları alsın. */
const SURUM = 'ofl-connect-v3';
const KABUK = ['./', 'index.html', 'styles.css', 'config.js', 'ortak.js', 'api.js', 'data.js', 'app.js', 'manifest.json',
  'icons/ofl-logo.png', 'icons/favicon-64.png', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(SURUM).then(c => c.addAll(KABUK)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(anahtarlar => Promise.all(anahtarlar.filter(a => a !== SURUM).map(a => caches.delete(a))))
    .then(() => self.clients.claim()));
});

// Önce ağ, ağ yoksa önbellek: güncellemeler hemen görünür, çevrimdışıyken de açılır.
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(
    fetch(e.request)
      .then(yanit => {
        const kopya = yanit.clone();
        caches.open(SURUM).then(c => c.put(e.request, kopya));
        return yanit;
      })
      .catch(() => caches.match(e.request).then(y => y || caches.match('index.html')))
  );
});
