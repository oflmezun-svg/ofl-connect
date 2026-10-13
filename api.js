/* OFL Connect — gerçek sunucu istemcisi (Google Apps Script).
   config.js içinde API_URL tanımlıysa devreye girer; değilse data.js (demo) kullanılır. */
(function () {
  'use strict';

  const URL_ = (window.OFL_AYAR || {}).API_URL;
  if (!URL_) return;

  const OTURUM_ANAHTARI = 'ofl-connect-oturum';

  function oku() { try { return JSON.parse(localStorage.getItem(OTURUM_ANAHTARI)); } catch (e) { return null; } }
  function yaz(o) {
    try { o ? localStorage.setItem(OTURUM_ANAHTARI, JSON.stringify(o)) : localStorage.removeItem(OTURUM_ANAHTARI); }
    catch (e) { /* gizli pencere: oturum yalnızca bu sekmede yaşar */ }
    bellek = o;
  }
  let bellek = oku();

  function hata(mesaj, ek) { const e = new Error(mesaj); e.kullaniciMesaji = true; Object.assign(e, ek || {}); return e; }

  async function cagir(islem, veri) {
    let yanit;
    try {
      // text/plain: tarayıcı ön kontrol (CORS preflight) isteği göndermez; Apps Script bunu destekler.
      const r = await fetch(URL_, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ islem, veri: veri || {}, token: bellek && bellek.token }),
        redirect: 'follow'
      });
      yanit = await r.json();
    } catch (e) {
      throw hata(navigator.onLine === false
        ? 'İnternet bağlantısı yok. Lütfen bağlantınızı kontrol edin.'
        : 'Sunucuya ulaşılamadı. Lütfen biraz sonra tekrar deneyin.');
    }
    if (!yanit.ok) {
      if (yanit.kod === 'OTURUM') {
        yaz(null);
        setTimeout(() => window.dispatchEvent(new Event('ofl-oturum-bitti')), 50);
      }
      throw hata(yanit.hata || 'İşlem tamamlanamadı.', { alanlar: yanit.alanlar || undefined, kod: yanit.kod });
    }
    return yanit.veri;
  }

  window.Api = Object.assign({}, window.OFL, {
    MOD: 'canli',

    oturum() { return bellek ? { rol: bellek.rol, id: bellek.id, ad: bellek.ad } : null; },
    oturumAdiniGuncelle(ad) { if (bellek) { bellek.ad = ad; yaz(bellek); } },

    girisKoduGonder: eposta => cagir('kodGonder', { eposta }),
    async girisYap(eposta, kod) {
      const o = await cagir('girisYap', { eposta, kod });
      yaz(o);
      return { rol: o.rol, id: o.id, ad: o.ad };
    },
    async cikis() {
      const token = bellek && bellek.token;
      yaz(null);
      if (token) {
        fetch(URL_, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({ islem: 'cikis', token }) }).catch(() => {});
      }
    },

    rehber: () => cagir('rehber'),
    mezun: id => cagir('mezun', { id }),
    profilKaydet: (id, veri) => cagir('profilKaydet', Object.assign({}, veri, { id })),
    kayitOl: veri => cagir('kayitOl', veri),
    silmeTalebiGonder: () => cagir('silmeTalebiGonder'),

    rozetler: () => cagir('rozetler'),
    bekleyenler: () => cagir('bekleyenler'),
    silmeTalepleri: () => cagir('silmeTalepleri'),
    onayla: id => cagir('onayla', { id }),
    sil: id => cagir('sil', { id }),
    istatistik: () => cagir('istatistik'),
    csv: () => cagir('csv')
  });
})();
