/* OFL Connect — gerçek sunucu istemcisi (Google Apps Script).
   config.js içinde API_URL tanımlıysa devreye girer; değilse data.js (demo) kullanılır. */
(function () {
  'use strict';

  const URL_ = (window.OFL_AYAR || {}).API_URL;
  if (!URL_) return;

  const OTURUM_ANAHTARI = 'ofl-connect-oturum';
  const HESAP_ANAHTARI = 'ofl-connect-hesap';

  // "Oturumum açık kalsın" seçilirse oturum localStorage'da (kalıcı), seçilmezse sessionStorage'da
  // (uygulama/sekme kapanınca biter) tutulur.
  function depo(kalici) { try { return kalici ? localStorage : sessionStorage; } catch (e) { return null; } }
  function oku() {
    for (const d of [depo(true), depo(false)]) {
      try { const o = d && JSON.parse(d.getItem(OTURUM_ANAHTARI)); if (o) return o; } catch (e) { /* yok say */ }
    }
    return null;
  }
  function yaz(o) {
    for (const d of [depo(true), depo(false)]) { try { d && d.removeItem(OTURUM_ANAHTARI); } catch (e) { /* yok say */ } }
    if (o) { try { depo(!!o.hatirla).setItem(OTURUM_ANAHTARI, JSON.stringify(o)); } catch (e) { /* gizli pencere */ } }
    bellek = o;
  }
  let bellek = oku();

  // Bu cihazda hatırlanan hesap: e-posta sabit kalır, yalnızca şifre sorulur.
  function hesapOku() { try { return JSON.parse(localStorage.getItem(HESAP_ANAHTARI)); } catch (e) { return null; } }
  function hesapYaz(h) {
    try { h ? localStorage.setItem(HESAP_ANAHTARI, JSON.stringify(h)) : localStorage.removeItem(HESAP_ANAHTARI); }
    catch (e) { /* yok say */ }
  }

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

  function oturumAc(o, hatirla) {
    yaz({ token: o.token, rol: o.rol, id: o.id, ad: o.ad, hatirla: !!hatirla });
    hesapYaz({ eposta: o.eposta, ad: o.ad, sifreVar: !!o.sifreVar });
    return { rol: o.rol, id: o.id, ad: o.ad, sifreVar: !!o.sifreVar };
  }

  window.Api = Object.assign({}, window.OFL, {
    MOD: 'canli',

    oturum() { return bellek ? { rol: bellek.rol, id: bellek.id, ad: bellek.ad } : null; },
    oturumAdiniGuncelle(ad) {
      if (bellek) { bellek.ad = ad; yaz(bellek); }
      const h = hesapOku(); if (h) { h.ad = ad; hesapYaz(h); }
    },
    hesap: hesapOku,
    hesapUnut() { hesapYaz(null); },

    girisKoduGonder: eposta => cagir('kodGonder', { eposta }),
    async girisYap(eposta, kod, hatirla) {
      return oturumAc(await cagir('girisYap', { eposta, kod, hatirla: !!hatirla }), hatirla);
    },
    async sifreIleGiris(eposta, sifre, hatirla) {
      return oturumAc(await cagir('sifreIleGiris', { eposta, sifre, hatirla: !!hatirla }), hatirla);
    },
    async sifreBelirle(sifre) {
      const r = await cagir('sifreBelirle', { sifre });
      const h = hesapOku(); if (h) { h.sifreVar = true; hesapYaz(h); }
      return r;
    },
    async hesabim() {
      const r = await cagir('hesabim');
      const h = hesapOku() || {};
      hesapYaz(Object.assign(h, { eposta: r.eposta, sifreVar: r.sifreVar, ad: h.ad || (bellek && bellek.ad) }));
      return r;
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
    duyurular: () => cagir('duyurular'),

    rozetler: () => cagir('rozetler'),
    bekleyenler: () => cagir('bekleyenler'),
    silmeTalepleri: () => cagir('silmeTalepleri'),
    onayla: id => cagir('onayla', { id }),
    sil: id => cagir('sil', { id }),
    istatistik: () => cagir('istatistik'),
    csv: () => cagir('csv'),
    kullaniciEkle: veri => cagir('kullaniciEkle', veri),
    yoneticiler: () => cagir('yoneticiler'),
    duyuruKaydet: veri => cagir('duyuruKaydet', veri),
    duyuruSil: id => cagir('duyuruSil', { id })
  });
})();
