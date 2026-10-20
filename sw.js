/* OFL Connect — service worker: uygulama kabuğunu önbelleğe alır (uygulama ana ekrandan
   anında açılır) ve duyuru bildirimlerini gösterir. Sürüm numarasını her yayında artırın
   ki kullanıcılar yeni dosyaları alsın. */
const SURUM = 'ofl-connect-v7';
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
        // Ses dosyalarının parçalı (206) yanıtları önbelleğe alınamaz
        if (yanit.status === 200) {
          const kopya = yanit.clone();
          caches.open(SURUM).then(c => c.put(e.request, kopya));
        }
        return yanit;
      })
      .catch(() => caches.match(e.request).then(y => y || caches.match('index.html')))
  );
});

/* ---------- duyuru bildirimleri ----------
   Sunucu bildirimi içeriksiz gönderir; burada güncel duyuru çekilip başlığı gösterilir.
   Oturum anahtarı ("oturumum açık kalsın" seçiliyse) uygulama tarafından IndexedDB'ye yazılır. */

function oturumOku() {
  return new Promise(coz => {
    try {
      const ac = indexedDB.open('ofl-connect', 1);
      ac.onupgradeneeded = () => ac.result.createObjectStore('ayar');
      ac.onsuccess = () => {
        const istek = ac.result.transaction('ayar').objectStore('ayar').get('oturum');
        istek.onsuccess = () => coz(istek.result || null);
        istek.onerror = () => coz(null);
      };
      ac.onerror = () => coz(null);
    } catch (e) { coz(null); }
  });
}

async function sonDuyuru() {
  const o = await oturumOku();
  if (!o || !o.token || !o.api) return null;
  try {
    const r = await fetch(o.api, {
      method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ islem: 'duyurular', veri: {}, token: o.token })
    });
    const y = await r.json();
    if (!y.ok || !y.veri || !y.veri.length) return null;
    return y.veri.slice().sort((a, b) => String(b.baslangic).localeCompare(String(a.baslangic)))[0];
  } catch (e) { return null; }
}

self.addEventListener('push', e => {
  e.waitUntil((async () => {
    const d = await sonDuyuru();
    const metin = d ? String(d.metin || '').replace(/\s+/g, ' ').slice(0, 140) : 'Okul yönetimi yeni bir duyuru yayınladı. Görmek için dokunun.';
    await self.registration.showNotification(d ? (d.tur === 'onemli' ? 'Önemli: ' : '') + d.baslik : 'OFL Connect — Yeni duyuru', {
      body: metin,
      icon: 'icons/icon-192.png',
      badge: 'icons/favicon-64.png',
      tag: d ? 'duyuru-' + d.id : 'duyuru',
      data: { url: './#/duyurular' }
    });
  })());
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  const hedef = new URL(e.notification.data && e.notification.data.url || './#/duyurular', self.registration.scope).href;
  e.waitUntil((async () => {
    const pencereler = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const p of pencereler) {
      if (p.url.startsWith(self.registration.scope)) { await p.focus(); return p.navigate ? p.navigate(hedef) : null; }
    }
    return self.clients.openWindow(hedef);
  })());
});
