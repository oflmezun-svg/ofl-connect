/* OFL Connect — arayüz. Veriye yalnızca window.Api üzerinden erişir
   (demo: data.js, gerçek sistem: api.js → Google Apps Script). */
(function () {
  'use strict';

  const Api = window.Api;
  const OFL = window.OFL;
  const byId = id => document.getElementById(id);
  const $app = byId('app');
  const $katman = byId('katman');
  const $onay = byId('onay-katmani');
  const $bildirim = byId('bildirim');
  const DEMO = Api.MOD === 'demo';
  const SAYFA_BOYU = 50;
  const ALAN_ADI = OFL.ALAN_ADI;

  const S = {
    oturum: null,
    liste: [],
    filtre: { q: '', tur: '', calisma: '', cevrimici: false, yil: '', sehir: '', sirala: 'yil' },
    sayfa: 1,
    basvuruSekmesi: 'onay',
    duyuruSekmesi: 'aktif',
    duyurular: null,
    acilisYapildi: false,
    sifreOner: false,
    kapaninca: null,
    kurulumOlayi: null
  };
  const ROL_ADI = { admin: 'Yönetici', mezun: 'Mezun', ogretmen: 'Öğretmen' };
  const KURULU = () => window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;

  if (DEMO) byId('demo-serit').hidden = false;

  /* =====================================================================
   * Yardımcılar
   * ===================================================================== */

  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const sayi = n => Number(n).toLocaleString('tr-TR');
  const tarihYaz = iso => iso ? new Date(iso).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' }) : '—';
  const renkTonu = id => { let h = 0; for (const c of String(id)) h = (h * 31 + c.charCodeAt(0)) % 360; return h; };
  const adSoyad = k => `${k.ad} ${k.soyad}`;
  const ogretmen = k => k.tur === 'ogretmen';
  // Rehberde adın altındaki kısa tanım: "2011 mezunu" veya "Kimya öğretmeni"
  const kimlikYazisi = k => ogretmen(k) ? `${k.brans ? k.brans + ' öğretmeni' : 'Öğretmen'}` : `${k.yil} mezunu`;
  const tarihSaat = iso => iso ? new Date(iso).toLocaleString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';
  const yerelGirdi = t => { const d = new Date(t); d.setSeconds(0, 0); return new Date(d - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 16); };
  function yerelDepo(anahtar, deger) {
    try {
      if (deger === undefined) return JSON.parse(localStorage.getItem(anahtar));
      if (deger === null) localStorage.removeItem(anahtar); else localStorage.setItem(anahtar, JSON.stringify(deger));
    } catch (e) { return null; }
  }
  const telRakam = t => String(t || '').replace(/\D/g, '');

  const IKON = {
    ara: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
    telefon: '<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z"/>',
    mesaj: '<path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/>',
    eposta: '<rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-9 5.7a2 2 0 0 1-2 0L2 7"/>',
    kilit: '<rect width="18" height="11" x="3" y="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
    kisiler: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.9"/><path d="M16 3.1a4 4 0 0 1 0 7.8"/>',
    kisi: '<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
    kalkan: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
    cikis: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5"/><path d="M21 12H9"/>',
    kalem: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
    cop: '<path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
    tamam: '<path d="M20 6 9 17l-5-5"/>',
    kapat: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
    indir: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/><path d="M12 15V3"/>',
    konum: '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>',
    canta: '<rect width="20" height="14" x="2" y="7" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>',
    kep: '<path d="M22 10 12 5 2 10l10 5 10-5Z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/>',
    arti: '<path d="M5 12h14"/><path d="M12 5v14"/>',
    yenile: '<path d="M3 12a9 9 0 0 1 9-9 9.8 9.8 0 0 1 6.7 2.7L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.8 9.8 0 0 1-6.7-2.7L3 16"/><path d="M8 16H3v5"/>',
    goz: '<path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>',
    gozKapali: '<path d="M9.9 9.9a3 3 0 1 0 4.2 4.2"/><path d="M10.7 5.1A10.4 10.4 0 0 1 12 5c7 0 10 7 10 7a13.2 13.2 0 0 1-1.7 2.7"/><path d="M6.6 6.6A13.5 13.5 0 0 0 2 12s3 7 10 7a9.7 9.7 0 0 0 5.4-1.6"/><path d="m2 2 20 20"/>',
    yukle: '<rect width="14" height="20" x="5" y="2" rx="2"/><path d="M12 18h.01"/>',
    paylas: '<path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><path d="m16 6-4-4-4 4"/><path d="M12 2v13"/>',
    gelen: '<path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.5 5.1 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.5-6.9A2 2 0 0 0 16.8 4H7.2a2 2 0 0 0-1.7 1.1z"/>',
    grafik: '<path d="M3 3v18h18"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/>',
    sol: '<path d="m15 18-6-6 6-6"/>',
    sag: '<path d="m9 18 6-6-6-6"/>',
    bilgi: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>',
    takvim: '<rect width="18" height="18" x="3" y="4" rx="2"/><path d="M16 2v4"/><path d="M8 2v4"/><path d="M3 10h18"/>',
    duyuru: '<path d="m3 11 18-5v12L3 14v-3z"/><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/>',
    anahtar: '<circle cx="7.5" cy="15.5" r="5.5"/><path d="m21 2-9.6 9.6"/><path d="m15.5 7.5 3 3L22 7l-3-3"/>',
    saat: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
    dis: '<path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>',
    ogretmen: '<path d="M2 3h20"/><path d="M21 3v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V3"/><path d="m7 21 5-5 5 5"/>',
    kisiEkle: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M19 8v6"/><path d="M22 11h-6"/>',
    zil: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>',
    oynat: '<path d="m6 3 14 9-14 9V3z"/>',
    duraklat: '<rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/>',
    kopyala: '<rect width="14" height="14" x="8" y="8" rx="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>'
  };
  const ikon = (ad, sinif) => `<svg class="ikon ${sinif || ''}" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${IKON[ad]}</svg>`;

  function avatar(k, boyut) {
    const harf = ((k.ad || '')[0] || '') + ((k.soyad || '')[0] || '');
    return `<span class="avatar ${boyut || ''}" style="--ton:${renkTonu(k.id)}" aria-hidden="true">${esc(harf)}</span>`;
  }

  function bildir(mesaj, tur) {
    const el = document.createElement('div');
    el.className = 'bildirim ' + (tur || '');
    el.innerHTML = (tur === 'basarili' ? ikon('tamam') : tur === 'hata' ? ikon('bilgi') : '') + `<span>${esc(mesaj)}</span>`;
    $bildirim.appendChild(el);
    setTimeout(() => el.classList.add('cikiyor'), 3200);
    setTimeout(() => el.remove(), 3600);
  }

  function hataGoster(e) {
    if (!(e && e.kullaniciMesaji)) console.error(e);
    bildir(e && e.kullaniciMesaji ? e.message : 'Beklenmeyen bir hata oluştu.', 'hata');
  }

  function sayfaBasi(baslik, alt, eylemler) {
    const geri = S.gecmis && S.gecmis.length ? `<button class="geri-dugmesi masaustu" data-ac="geri">${ikon('sol', 'kucuk')}<span>Geri</span></button>` : '';
    return `<div class="sayfa-basi">
      <div>${geri}<h1>${baslik}</h1>${alt ? `<p>${alt}</p>` : ''}</div>
      ${eylemler ? `<div class="sayfa-eylemleri">${eylemler}</div>` : ''}
    </div>`;
  }

  function bosDurum(ikonAd, baslik, aciklama) {
    return `<div class="bos-durum">${ikon(ikonAd)}<strong>${baslik}</strong>${aciklama ? `<span>${aciklama}</span>` : ''}</div>`;
  }

  function yukleniyor() {
    return `<div class="yukleniyor" role="status"><span class="donen"></span>Yükleniyor…</div>`;
  }

  /* =====================================================================
   * Çekmece (sağdan açılan panel) ve onay penceresi
   * ===================================================================== */

  let oncekiOdak = null;

  // Telefonun geri tuşu açık pencereyi kapatsın diye pencere açılınca geçmişe bir adım eklenir.
  let cekmeceGecmisi = false;

  function cekmeceAc({ bas, govde, alt, etiket, genis, orta, zorunlu }) {
    if (!$katman.classList.contains('acik')) oncekiOdak = document.activeElement;
    if (S.rehberDurdur) { S.rehberDurdur(); S.rehberDurdur = null; }
    if (!cekmeceGecmisi) { history.pushState({ ofl: 'cekmece', sira: S.sira }, ''); cekmeceGecmisi = true; }
    $katman.classList.toggle('orta-katman', !!orta);
    $katman.classList.toggle('zorunlu', !!zorunlu);
    $katman.innerHTML = `<div class="perde" ${zorunlu ? '' : 'data-ac="kapat"'}></div>
      <section class="cekmece ${genis ? 'genis' : ''} ${orta ? 'orta' : ''}" role="dialog" aria-modal="true" aria-label="${esc(etiket)}">
        <header class="cekmece-bas">${bas}${zorunlu ? '' : `<button class="ikon-dugme" data-ac="kapat" aria-label="Kapat">${ikon('kapat')}</button>`}</header>
        <div class="cekmece-govde">${govde}</div>
        ${alt ? `<footer class="cekmece-alt">${alt}</footer>` : ''}
      </section>`;
    $katman.classList.add('acik');
    document.body.classList.add('kilitli');
    const ilk = $katman.querySelector('.cekmece-govde input, .cekmece-alt .dugme, .cekmece-govde .dugme');
    (ilk || $katman.querySelector('[data-ac="kapat"].ikon-dugme')).focus({ preventScroll: true });
  }

  // kaynak: 'geri' (telefonun geri tuşu), 'rota' (sayfa değişti) veya boş (pencere içinden kapatıldı)
  function cekmeceKapat(kaynak) {
    if (!$katman.classList.contains('acik')) { if (kaynak !== 'geri') cekmeceGecmisi = false; return; }
    if (kaynak !== 'geri' && $katman.classList.contains('zorunlu') && kaynak !== 'zorla') return;
    if (S.rehberDurdur) { S.rehberDurdur(); S.rehberDurdur = null; }
    if (cekmeceGecmisi) {
      cekmeceGecmisi = false;
      if (!kaynak || kaynak === 'zorla') history.back();
    }
    $katman.classList.remove('acik', 'zorunlu');
    $katman.innerHTML = '';
    document.body.classList.remove('kilitli');
    if (oncekiOdak && document.contains(oncekiOdak)) oncekiOdak.focus({ preventScroll: true });
    oncekiOdak = null;
    // Bir pencere kapanınca sıradaki (ör. şifre önerisinden sonra duyuru bildirimi) açılır.
    const sonraki = S.kapaninca;
    S.kapaninca = null;
    if (sonraki) setTimeout(sonraki, 250);
  }

  function onayIste(mesaj, dugme, tehlikeli) {
    return new Promise(coz => {
      const odak = document.activeElement;
      $onay.innerHTML = `<div class="perde"></div>
        <div class="diyalog" role="alertdialog" aria-modal="true" aria-label="Onay">
          <p>${esc(mesaj)}</p>
          <div class="diyalog-dugmeleri">
            <button class="dugme ikincil" data-onay="hayir">Vazgeç</button>
            <button class="dugme ${tehlikeli ? 'tehlike' : ''}" data-onay="evet">${esc(dugme)}</button>
          </div>
        </div>`;
      $onay.classList.add('acik');
      $onay.querySelector('[data-onay="evet"]').focus();
      const bitir = sonuc => {
        $onay.classList.remove('acik');
        $onay.innerHTML = '';
        $onay.onclick = null;
        if (odak && document.contains(odak)) odak.focus({ preventScroll: true });
        coz(sonuc);
      };
      $onay.onclick = ev => {
        const b = ev.target.closest('[data-onay]');
        if (b) bitir(b.dataset.onay === 'evet');
        else if (ev.target.classList.contains('perde')) bitir(false);
      };
    });
  }

  $katman.addEventListener('click', ev => { if (ev.target.closest('[data-ac="kapat"]')) cekmeceKapat(); });
  window.addEventListener('popstate', () => {
    if ($onay.classList.contains('acik')) { const h = $onay.querySelector('[data-onay="hayir"]'); if (h) h.click(); }
    if ($katman.classList.contains('acik')) {
      if ($katman.classList.contains('zorunlu')) { history.pushState({ ofl: 'cekmece', sira: S.sira }, ''); return; }
      cekmeceKapat('geri');
    } else {
      cekmeceGecmisi = false;
      // Sayfa değişirken kapanan pencerelerin geçmişte bıraktığı boş adımlar atlanır.
      if (history.state && history.state.ofl === 'cekmece') history.back();
    }
  });
  document.addEventListener('keydown', ev => {
    if (ev.key === 'Escape') {
      if ($onay.classList.contains('acik')) $onay.querySelector('[data-onay="hayir"]').click();
      else if (!$katman.classList.contains('zorunlu')) cekmeceKapat();
    }
    // Tıklanabilir tablo satırları klavyeyle de açılsın
    if ((ev.key === 'Enter' || ev.key === ' ') && ev.target.matches('tr[data-ac]')) {
      ev.preventDefault();
      ev.target.click();
    }
  });

  /* =====================================================================
   * Yönlendirme
   * ===================================================================== */

  const UYE_MENU = [['rehber', 'Rehber', 'kisiler'], ['duyurular', 'Duyurular', 'duyuru'], ['profil', 'Profilim', 'kisi']];
  const MENU = {
    mezun: UYE_MENU,
    ogretmen: UYE_MENU,
    admin: [['rehber', 'Rehber', 'kisiler'], ['duyurular', 'Duyurular', 'duyuru'], ['basvurular', 'Başvurular', 'gelen'], ['panel', 'Yönetim Paneli', 'grafik']]
  };

  async function yonlendir() {
    cekmeceKapat('rota');
    const yol = location.hash.replace(/^#\/?/, '');
    S.oturum = Api.oturum();
    if (!S.oturum) { S.gecmis = []; S.sonYol = ''; return yol === 'kayit' ? kayitEkrani() : girisEkrani(yol === 'sifre' ? 'sifre' : undefined); }
    // Uygulama içi geri yığını. Her sayfa adımına sıra numarası verilir; böylece tarayıcının/telefonun
    // geri tuşuyla mı dönüldüğü yoksa yeni bir sayfaya mı gidildiği kesin olarak anlaşılır.
    S.gecmis = S.gecmis || [];
    const durum = history.state || {};
    if (durum.sira == null) {
      S.sira = (S.sira || 0) + 1;
      history.replaceState({ sira: S.sira }, '');
      if (S.sonYol && S.sonYol !== yol) S.gecmis.push(S.sonYol);
    } else if (S.sira != null && durum.sira < S.sira) {
      S.gecmis.pop();
      S.sira = durum.sira;
    } else {
      if (S.sira != null && durum.sira > S.sira && S.sonYol && S.sonYol !== yol) S.gecmis.push(S.sonYol);
      S.sira = durum.sira;
    }
    if (S.gecmis.length > 30) S.gecmis.shift();
    S.sonYol = yol;

    const menu = MENU[S.oturum.rol] || MENU.mezun;
    if (!menu.some(m => m[0] === yol)) { location.replace('#/rehber'); return; }
    kabuk(yol);
    const ekran = { rehber: rehberEkrani, duyurular: duyurularEkrani, profil: profilEkrani, basvurular: basvurularEkrani, panel: panelEkrani }[yol];
    try {
      await ekran();
      if (!S.acilisYapildi) { S.acilisYapildi = true; acilisIslemleri(); }
    }
    catch (e) {
      hataGoster(e);
      byId('icerik').innerHTML = bosDurum('bilgi', 'Sayfa yüklenemedi', esc(e.kullaniciMesaji ? e.message : 'Lütfen tekrar deneyin.')) +
        `<div class="ortala"><button class="dugme ikincil" data-ac="yenile">${ikon('yenile')}<span>Tekrar dene</span></button></div>`;
    }
  }

  // Hash zaten hedefteyse hashchange tetiklenmez; o durumda elle yönlendir.
  function git(hash) {
    if (location.hash === hash) yonlendir();
    else location.hash = hash;
  }

  function kabuk(aktif) {
    const admin = S.oturum.rol === 'admin';
    const rozet = y => y === 'basvurular' ? '<span class="menu-rozet" data-rozet hidden></span>'
      : y === 'duyurular' && !admin ? '<span class="menu-rozet" data-duyuru-rozet hidden></span>' : '';
    const menuHtml = (MENU[S.oturum.rol] || MENU.mezun).map(([y, ad, ik]) =>
      `<a href="#/${y}" class="menu-ogesi ${y === aktif ? 'aktif' : ''}" ${y === aktif ? 'aria-current="page"' : ''}>
        ${ikon(ik)}<span>${ad}</span>${rozet(y)}
      </a>`).join('');
    const parca = S.oturum.ad.split(' ');
    const ben = { id: S.oturum.id, ad: parca[0], soyad: parca.slice(-1)[0] };

    $app.innerHTML = `
      <div class="duzen">
        <aside class="yan">
          <a class="marka" href="#/rehber" aria-label="OFL Connect ana sayfa">
            <img src="icons/ofl-logo.png" alt="" class="marka-logo">
            <span class="marka-yazi"><strong>OFL Connect</strong><small>${esc(OFL.OKUL_ADI)}</small></span>
          </a>
          <nav class="menu" aria-label="Ana menü">${menuHtml}</nav>
          <div class="yan-alt">
            <button class="menu-ogesi kurulum-dugmesi" data-ac="kur" hidden>${ikon('yukle')}<span>Uygulamayı yükle</span></button>
            <div class="kullanici-kart">
              ${avatar(ben, 'kucuk')}
              <div class="kullanici-yazi"><strong>${esc(S.oturum.ad)}</strong><small>${ROL_ADI[S.oturum.rol] || 'Mezun'}</small></div>
              <button class="ikon-dugme" data-ac="hesap" aria-label="Giriş ve şifre ayarları" title="Giriş ve şifre">${ikon('anahtar')}</button>
              <button class="ikon-dugme" data-ac="cikis" aria-label="Çıkış yap" title="Çıkış yap">${ikon('cikis')}</button>
            </div>
          </div>
        </aside>
        <div class="ana">
          <header class="mobil-ust">
            ${S.gecmis && S.gecmis.length ? `<button class="ikon-dugme geri-dugmesi" data-ac="geri" aria-label="Geri">${ikon('sol')}</button>` : ''}
            <a class="marka" href="#/rehber"><img src="icons/ofl-logo.png" alt="" class="marka-logo"><span class="marka-yazi"><strong>OFL Connect</strong></span></a>
            <button class="ikon-dugme kurulum-dugmesi" data-ac="kur" aria-label="Uygulamayı yükle" hidden>${ikon('yukle')}</button>
            <button class="ikon-dugme" data-ac="hesap" aria-label="Giriş ve şifre ayarları">${ikon('anahtar')}</button>
            <button class="ikon-dugme" data-ac="cikis" aria-label="Çıkış yap">${ikon('cikis')}</button>
          </header>
          <div id="ios-ipucu"></div>
          <main id="icerik" class="icerik">${yukleniyor()}</main>
        </div>
        <nav class="alt-menu" aria-label="Ana menü">${menuHtml}</nav>
      </div>`;
    kurulumDugmesiniGuncelle();
    if (admin) rozetleriGuncelle();
    else duyuruRozetiniGuncelle();
  }

  async function rozetleriGuncelle() {
    try {
      const r = await Api.rozetler();
      const n = r.bekleyen + r.silme;
      document.querySelectorAll('[data-rozet]').forEach(el => { el.textContent = n; el.hidden = !n; });
    } catch (e) { /* rozet önemsiz; sessizce geç */ }
  }

  /* =====================================================================
   * Giriş
   * ===================================================================== */

  function markaPaneli() {
    return `<section class="giris-marka">
      <div class="giris-arka" aria-hidden="true">
        <span class="isik i1"></span><span class="isik i2"></span><span class="isik i3"></span>
        <span class="yorunge o1"></span><span class="yorunge o2"></span>
        ${Array.from({ length: 14 }, (_, i) => `<span class="parcacik" style="--x:${(i * 37) % 100}%;--g:${(i * 1.7) % 9}s;--s:${8 + (i * 3) % 9}s"></span>`).join('')}
      </div>
      <div class="giris-marka-ic">
        <div class="logo-sahne"><span class="logo-hale"></span><img src="icons/ofl-logo.png" alt="${esc(OFL.OKUL_ADI)} logosu" class="giris-logo"></div>
        <h1>OFL Connect</h1>
        <p class="giris-slogan">${esc(OFL.OKUL_ADI)} Mezun Ağı</p>
        <ul class="ozellikler">
          <li>${ikon('kisiler')}<span>Farklı dönemlerden mezunlarla yeniden bağlantı kurun</span></li>
          <li>${ikon('goz')}<span>Hangi bilginizin görüneceğine siz karar verin</span></li>
          <li>${ikon('yukle')}<span>Telefonunuza uygulama olarak kurun</span></li>
        </ul>
      </div>
      <small class="giris-telif">© ${OFL.BU_YIL} ${esc(OFL.OKUL_ADI)}</small>
    </section>`;
  }

  function hatirlaKutusu(on) {
    return `<label class="onay-kutusu hatirla">
      <input type="checkbox" name="hatirla" id="${on}-hatirla" ${KURULU() ? 'checked' : ''}>
      <span><strong>Bu cihazda oturumum açık kalsın</strong><small>Uygulamayı her açtığınızda yeniden giriş yapmanız gerekmez. Ortak kullanılan cihazlarda işaretlemeyin.</small></span>
    </label>`;
  }

  function girisEkrani(kip) {
    const hesap = Api.hesap();
    // Şifresi olan hatırlanan hesap: e-posta sabit, yalnızca şifre sorulur (banka uygulamaları gibi).
    const sifreKipi = kip !== 'kod' && kip !== 'sifre' && hesap && hesap.sifreVar && hesap.eposta;
    const sifreSekmesi = kip === 'sifre';
    const ilkAd = hesap && hesap.ad ? hesap.ad.split(' ')[0] : '';

    $app.innerHTML = `
      <div class="giris-duzen">
        ${markaPaneli()}
        <main class="giris-alan">
          <div class="giris-kutu">
            <img src="icons/ofl-logo.png" alt="" class="giris-mobil-logo">
            ${sifreKipi ? `
              <h2>Tekrar hoş geldiniz${ilkAd ? ', ' + esc(ilkAd) : ''}</h2>
              <p class="soluk">Şifrenizle giriş yapın.</p>
              <form id="f-sifre" class="form" novalidate>
                <div class="hesap-cipi">${avatar({ id: hesap.eposta, ad: (hesap.ad || hesap.eposta).split(' ')[0], soyad: (hesap.ad || '').split(' ').slice(-1)[0] })}
                  <span><strong>${esc(hesap.ad || '')}</strong><small>${esc(hesap.eposta)}</small></span></div>
                <input type="email" name="eposta" value="${esc(hesap.eposta)}" autocomplete="username" hidden>
                <div class="alan"><label for="g-sifre">Şifre</label>
                  <div class="sifre-girdisi">
                    <input id="g-sifre" type="password" name="sifre" autocomplete="current-password" required>
                    <button type="button" class="ikon-dugme kucuk" data-goster="g-sifre" aria-label="Şifreyi göster">${ikon('goz')}</button>
                  </div>
                </div>
                ${hatirlaKutusu('s')}
                <button class="dugme buyuk genis" type="submit">Giriş yap</button>
              </form>
              <div class="giris-baglantilari">
                <button class="dugme metin" type="button" data-giris-ac="unuttum">Şifremi unuttum</button>
                <button class="dugme metin" type="button" data-giris-ac="kodla">E-posta koduyla giriş yap</button>
                <button class="dugme metin" type="button" data-giris-ac="farkli">Farklı hesapla giriş yap</button>
              </div>` : `
              <h2>Giriş yap</h2>
              <div class="segment giris-sekmeleri" role="radiogroup" aria-label="Giriş yöntemi">
                <label><input type="radio" name="girisYolu" value="kod" ${sifreSekmesi ? '' : 'checked'}><span>${ikon('eposta', 'kucuk')} E-posta kodu</span></label>
                <label><input type="radio" name="girisYolu" value="sifre" ${sifreSekmesi ? 'checked' : ''}><span>${ikon('anahtar', 'kucuk')} Şifre</span></label>
              </div>
              <p class="soluk" data-giris-yazi="kod" ${sifreSekmesi ? 'hidden' : ''}>E-posta adresinize tek kullanımlık bir giriş kodu göndereceğiz. Giriş yaptıktan sonra isterseniz bir şifre belirleyip sonraki girişlerde onu kullanabilirsiniz.</p>
              <p class="soluk" data-giris-yazi="sifre" ${sifreSekmesi ? '' : 'hidden'}>Kendi belirlediğiniz şifreyle ya da okul yönetiminin size ilettiği geçici şifreyle giriş yapın.</p>

              <form id="f-eposta-sifre" class="form" novalidate ${sifreSekmesi ? '' : 'hidden'}>
                <div class="alan"><label for="gs-eposta">E-posta adresi</label>
                  <input id="gs-eposta" type="email" name="eposta" value="${esc(hesap && hesap.eposta || '')}" autocomplete="username" inputmode="email" placeholder="ornek@gmail.com" required>
                </div>
                <div class="alan"><label for="gs-sifre">Şifre</label>
                  <div class="sifre-girdisi">
                    <input id="gs-sifre" type="password" name="sifre" autocomplete="current-password" required>
                    <button type="button" class="ikon-dugme kucuk" data-goster="gs-sifre" aria-label="Şifreyi göster">${ikon('goz')}</button>
                  </div>
                </div>
                ${hatirlaKutusu('gs')}
                <button class="dugme buyuk genis" type="submit">Giriş yap</button>
                <button class="dugme metin genis" type="button" data-giris-ac="unuttum-sifre">Şifremi unuttum</button>
              </form>

              <form id="f-eposta" class="form" novalidate ${sifreSekmesi ? 'hidden' : ''}>
                <div class="alan"><label for="g-eposta">E-posta adresi</label>
                  <input id="g-eposta" type="email" name="eposta" value="${esc(hesap && hesap.eposta || '')}" autocomplete="email" inputmode="email" placeholder="ornek@gmail.com" required>
                </div>
                <button class="dugme buyuk genis" type="submit">Giriş kodu gönder</button>
                <button class="dugme metin genis" type="button" data-giris-ac="unuttum-eposta">Şifremi unuttum</button>
              </form>

              <form id="f-kod" class="form" novalidate hidden>
                <div class="bilgi-kutu">${ikon('eposta')}<span><strong id="kod-eposta"></strong> adresine bir giriş kodu gönderdik.
                  ${DEMO ? `<br>Demo için kod: <strong>${Api.DEMO_KOD}</strong>` : 'Adres sistemde kayıtlıysa kod birkaç dakika içinde gelir. Spam klasörünü de kontrol edin.'}</span></div>
                <div class="alan"><label for="g-kod">6 haneli kod</label>
                  <input id="g-kod" class="kod-girdisi" name="kod" inputmode="numeric" autocomplete="one-time-code" maxlength="6" placeholder="••••••" required>
                </div>
                ${hatirlaKutusu('k')}
                <button class="dugme buyuk genis" type="submit">Giriş yap</button>
                <button class="dugme metin genis" type="button" data-giris-ac="geri">Farklı bir e-posta kullan</button>
              </form>
              ${hesap && hesap.sifreVar ? `<div class="giris-baglantilari"><button class="dugme metin" type="button" data-giris-ac="sifreye-don">Şifreyle giriş yap</button></div>` : ''}`}

            ${DEMO ? `
              <div class="ayrac"><span>Demo için hızlı giriş</span></div>
              <div class="hizli-giris uclu">
                <button class="dugme ikincil" data-giris="admin">${ikon('kalkan')}<span>Yönetici</span></button>
                <button class="dugme ikincil" data-giris="mezun">${ikon('kisi')}<span>Mezun <small>(Elif Aydın)</small></span></button>
                <button class="dugme ikincil" data-giris="ogretmen">${ikon('ogretmen')}<span>Öğretmen <small>(Serap Güneş)</small></span></button>
              </div>` : ''}

            <p class="giris-kayit">Henüz kaydınız yok mu? <a href="#/kayit">Mezun kaydı oluşturun</a></p>
            <button class="dugme ikincil genis yardim-dugmesi" type="button" data-giris-ac="yardim">${ikon('mesaj')}<span>Yardım ve sorular</span></button>
          </div>
        </main>
      </div>`;

    const girildi = girisTamam;
    const baglan = (ac, f) => { const b = $app.querySelector(`[data-giris-ac="${ac}"]`); if (b) b.addEventListener('click', f); };
    baglan('yardim', () => yardimFormu());

    $app.querySelectorAll('[data-goster]').forEach(b => b.addEventListener('click', () => {
      const g = byId(b.dataset.goster);
      const gizli = g.type === 'password';
      g.type = gizli ? 'text' : 'password';
      b.innerHTML = ikon(gizli ? 'gozKapali' : 'goz');
      b.setAttribute('aria-label', gizli ? 'Şifreyi gizle' : 'Şifreyi göster');
    }));

    const fS = byId('f-sifre');
    if (fS) {
      fS.addEventListener('submit', async ev => {
        ev.preventDefault();
        if (!fS.sifre.value) { fS.sifre.setAttribute('aria-invalid', 'true'); return bildir('Şifrenizi girin.', 'hata'); }
        const b = fS.querySelector('button[type=submit]'); b.disabled = true;
        try { girildi(await Api.sifreIleGiris(hesap.eposta, fS.sifre.value, fS.hatirla.checked)); }
        catch (e) { hataGoster(e); fS.sifre.select(); } finally { b.disabled = false; }
      });
      setTimeout(() => fS.sifre.focus(), 50);
      baglan('unuttum', () => sifreUnuttumEkrani(hesap.eposta));
      baglan('kodla', async () => {
        girisEkrani('kod');
        const f = byId('f-eposta');
        f.eposta.value = hesap.eposta;
        f.requestSubmit();
      });
      baglan('farkli', () => { Api.hesapUnut(); girisEkrani(); });
    }

    const fES = byId('f-eposta-sifre');
    if (fES) {
      const sekme = yol => {
        const sifre = yol === 'sifre';
        fES.hidden = !sifre;
        byId('f-eposta').hidden = sifre;
        byId('f-kod').hidden = true;
        $app.querySelectorAll('[data-giris-yazi]').forEach(p => { p.hidden = p.dataset.girisYazi !== yol; });
        const hedef = sifre ? (fES.eposta.value ? fES.sifre : fES.eposta) : byId('f-eposta').eposta;
        hedef.focus();
      };
      $app.querySelectorAll('[name="girisYolu"]').forEach(r => r.addEventListener('change', () => {
        // Bir sekmede yazılan e-posta diğerine taşınır.
        const e = (r.value === 'sifre' ? byId('f-eposta').eposta : fES.eposta).value;
        (r.value === 'sifre' ? fES.eposta : byId('f-eposta').eposta).value = e;
        sekme(r.value);
      }));
      fES.addEventListener('submit', async ev => {
        ev.preventDefault();
        const eposta = fES.eposta.value.trim();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(eposta)) { fES.eposta.setAttribute('aria-invalid', 'true'); fES.eposta.focus(); return bildir('Geçerli bir e-posta adresi girin.', 'hata'); }
        if (!fES.sifre.value) { fES.sifre.setAttribute('aria-invalid', 'true'); fES.sifre.focus(); return bildir('Şifrenizi girin.', 'hata'); }
        const b = fES.querySelector('button[type=submit]'); b.disabled = true;
        try { girildi(await Api.sifreIleGiris(eposta, fES.sifre.value, fES.hatirla.checked)); }
        catch (e) { hataGoster(e); fES.sifre.select(); } finally { b.disabled = false; }
      });
      baglan('unuttum-sifre', () => sifreUnuttumEkrani(fES.eposta.value.trim()));
      if (sifreSekmesi) setTimeout(() => (fES.eposta.value ? fES.sifre : fES.eposta).focus(), 50);
    }

    const fE = byId('f-eposta');
    const fK = byId('f-kod');
    if (fE) {
      let eposta = '';
      fE.addEventListener('submit', async ev => {
        ev.preventDefault();
        eposta = fE.eposta.value.trim();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(eposta)) { fE.eposta.setAttribute('aria-invalid', 'true'); return bildir('Geçerli bir e-posta adresi girin.', 'hata'); }
        const b = fE.querySelector('button'); b.disabled = true;
        try {
          await Api.girisKoduGonder(eposta);
          byId('kod-eposta').textContent = eposta;
          fE.hidden = true; fK.hidden = false; fK.kod.focus();
        } catch (e) { hataGoster(e); } finally { b.disabled = false; }
      });
      fK.addEventListener('submit', async ev => {
        ev.preventDefault();
        const b = fK.querySelector('button[type=submit]'); b.disabled = true;
        try { girildi(await Api.girisYap(eposta, fK.kod.value, fK.hatirla.checked)); }
        catch (e) { hataGoster(e); fK.kod.select(); } finally { b.disabled = false; }
      });
      baglan('geri', () => { fK.hidden = true; fE.hidden = false; fE.eposta.focus(); });
      baglan('unuttum-eposta', () => sifreUnuttumEkrani(fE.eposta.value.trim()));
      baglan('sifreye-don', () => girisEkrani());
    }

    $app.querySelectorAll('[data-giris]').forEach(b => b.addEventListener('click', async () => {
      girildi(await Api.demoGiris(b.dataset.giris));
    }));
  }

  function girisTamam(o) {
    // Kodla girip henüz şifresi olmayanlara bir kez şifre belirleme önerilir;
    // yöneticinin verdiği geçici şifreyle girenler kendi şifresini belirlemek zorundadır.
    S.sifreOner = !o.sifreVar && !yerelDepo('ofl-sifre-onerisi-' + o.id);
    S.sifreDegistir = !!o.degistirmeli;
    S.yoneticiListesi = null; S.asil = false;
    S.yeniGiris = true;
    S.acilisYapildi = false;
    S.gecmis = [];
    S.sonYol = '';
    git('#/rehber');
  }

  /* ---------- Şifremi unuttum: e-posta → kod → yeni şifre ---------- */

  // Giriş ekranındaki "Yardım ve sorular": mesaj sistemin e-posta adresine iletilir.
  const YARDIM_KONULARI = ['Giriş yapamıyorum / kod gelmiyor', 'Şifre', 'Kayıt ve onay', 'Bilgilerimi güncelleme', 'Diğer'];
  function yardimFormu() {
    const hesap = Api.hesap();
    cekmeceAc({
      etiket: 'Yardım ve sorular', orta: true,
      bas: `<div><span class="ust-etiket">${ikon('mesaj', 'kucuk')} Yardım</span><h2>Size nasıl yardımcı olabiliriz?</h2>
        <p class="soluk">Mesajınız okul yönetimine iletilir; size e-posta adresinizden dönüş yapılır.</p></div>`,
      govde: `<form id="f-yardim" class="form" novalidate>
          <div class="alan" data-zorunlu><div class="alan-bas"><label for="y-ad">Ad soyad <span class="zorunlu" aria-hidden="true">*</span></label></div>
            <input id="y-ad" name="ad" maxlength="80" autocomplete="name" value="${esc(hesap && hesap.ad || '')}" required><em class="alan-hata" data-hata="ad"></em></div>
          <div class="alan" data-zorunlu><div class="alan-bas"><label for="y-eposta">E-posta <span class="zorunlu" aria-hidden="true">*</span></label></div>
            <input id="y-eposta" name="eposta" type="email" inputmode="email" maxlength="120" autocomplete="email" value="${esc(hesap && hesap.eposta || '')}" required><em class="alan-hata" data-hata="eposta"></em></div>
          <div class="alan"><div class="alan-bas"><label for="y-telefon">Telefon <small class="soluk">(isteğe bağlı)</small></label></div>
            <input id="y-telefon" name="telefon" type="tel" inputmode="tel" maxlength="20" autocomplete="tel" placeholder="05xx xxx xx xx"></div>
          <div class="alan" data-zorunlu><div class="alan-bas"><label for="y-konu">Konu <span class="zorunlu" aria-hidden="true">*</span></label></div>
            <select id="y-konu" name="konu">${YARDIM_KONULARI.map(k => `<option>${k}</option>`).join('')}</select></div>
          <div class="alan" data-zorunlu><div class="alan-bas"><label for="y-mesaj">Mesajınız <span class="zorunlu" aria-hidden="true">*</span></label></div>
            <textarea id="y-mesaj" name="mesaj" rows="5" maxlength="2000" placeholder="Yaşadığınız sorunu kısaca anlatın."></textarea><em class="alan-hata" data-hata="mesaj"></em></div>
          <input name="web" tabindex="-1" autocomplete="off" class="gorunmez" aria-hidden="true">
        </form>`,
      alt: `<button class="dugme ikincil" data-ac="kapat">Vazgeç</button><button class="dugme" type="submit" form="f-yardim">${ikon('mesaj')}<span>Gönder</span></button>`
    });
    const f = byId('f-yardim');
    f.addEventListener('submit', async ev => {
      ev.preventDefault();
      const v = { ad: f.ad.value.trim(), eposta: f.eposta.value.trim(), telefon: f.telefon.value.trim(), konu: f.konu.value, mesaj: f.mesaj.value.trim(), web: f.web.value };
      const hatalar = {};
      if (v.ad.length < 3) hatalar.ad = 'Adınızı ve soyadınızı yazın.';
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.eposta)) hatalar.eposta = 'Geçerli bir e-posta adresi yazın; size buradan dönüş yapılacak.';
      if (v.mesaj.length < 10) hatalar.mesaj = 'Sorununuzu biraz daha ayrıntılı yazın.';
      f.querySelectorAll('[data-hata]').forEach(e => { e.textContent = hatalar[e.dataset.hata] || ''; });
      f.querySelectorAll('input, textarea').forEach(e => { if (hatalar[e.name]) e.setAttribute('aria-invalid', 'true'); else e.removeAttribute('aria-invalid'); });
      const ilkHata = Object.keys(hatalar)[0];
      if (ilkHata) return f.elements[ilkHata].focus();
      const dugme = $katman.querySelector('[form="f-yardim"]');
      dugme.disabled = true;
      try {
        await Api.destekGonder(v);
        $katman.querySelector('.cekmece-govde').innerHTML = `<div class="bos-durum">${ikon('tamam')}<h3>Mesajınız iletildi</h3>
          <p class="soluk">Teşekkürler. Okul yönetimi en kısa sürede <strong>${esc(v.eposta)}</strong> adresinize dönüş yapacak.</p></div>`;
        $katman.querySelector('.cekmece-alt').innerHTML = `<button class="dugme" data-ac="kapat">Tamam</button>`;
      } catch (e) { dugme.disabled = false; hataGoster(e); }
    });
  }

  function sifreUnuttumEkrani(eposta) {
    $app.innerHTML = `
      <div class="giris-duzen">
        ${markaPaneli()}
        <main class="giris-alan">
          <div class="giris-kutu">
            <img src="icons/ofl-logo.png" alt="" class="giris-mobil-logo">
            <button class="geri-baglanti dugme metin" type="button" data-giris-ac="giris">${ikon('sol', 'kucuk')} Girişe dön</button>
            <ol class="adim-gostergesi" aria-label="Adımlar">
              <li class="aktif" data-adim="1"><span>1</span>E-posta</li>
              <li data-adim="2"><span>2</span>Doğrulama</li>
              <li data-adim="3"><span>3</span>Yeni şifre</li>
            </ol>
            <h2>Şifrenizi mi unuttunuz?</h2>
            <p class="soluk" id="su-aciklama">Kayıtlı e-posta adresinizi yazın. Adresinize 6 haneli bir doğrulama kodu göndereceğiz; kodla yeni şifrenizi belirleyeceksiniz.</p>

            <form id="su-eposta" class="form" novalidate>
              <div class="alan"><label for="su-e">E-posta adresi</label>
                <input id="su-e" type="email" name="eposta" value="${esc(eposta || '')}" autocomplete="email" inputmode="email" autocapitalize="off" placeholder="ornek@gmail.com" required>
              </div>
              <button class="dugme buyuk genis" type="submit">Doğrulama kodu gönder</button>
            </form>

            <form id="su-yeni" class="form" novalidate hidden>
              <div class="bilgi-kutu">${ikon('eposta')}<span><strong id="su-adres"></strong> adresine bir doğrulama kodu gönderdik. ${DEMO ? '' : 'Kod 10 dakika geçerlidir. '}Birkaç dakika içinde gelmezse spam klasörünü kontrol edin.
                ${DEMO ? `<br>Demo için kod: <strong>${Api.DEMO_KOD}</strong>` : ''}</span></div>
              <div class="alan"><label for="su-kod">6 haneli kod</label>
                <input id="su-kod" class="kod-girdisi" name="kod" inputmode="numeric" autocomplete="one-time-code" maxlength="6" placeholder="••••••" required>
                <em class="alan-hata" data-hata="kod"></em>
              </div>
              <input type="email" name="kullanici" autocomplete="username" hidden>
              <div class="alan"><label for="su-sifre">Yeni şifre</label>
                <div class="sifre-girdisi">
                  <input id="su-sifre" type="password" name="sifre" autocomplete="new-password" minlength="6" maxlength="64" required>
                  <button type="button" class="ikon-dugme kucuk" data-goster="su-sifre" aria-label="Şifreyi göster">${ikon('goz')}</button>
                </div>
                <div class="sifre-gucu" aria-hidden="true"><span></span></div>
                <small class="alan-ipucu" id="su-guc">En az 6 karakter; harf ve rakam karıştırmanız önerilir.</small>
                <em class="alan-hata" data-hata="sifre"></em>
              </div>
              <div class="alan"><label for="su-sifre2">Yeni şifre (tekrar)</label>
                <input id="su-sifre2" type="password" name="sifre2" autocomplete="new-password" required>
                <em class="alan-hata" data-hata="sifre2"></em>
              </div>
              ${hatirlaKutusu('su')}
              <button class="dugme buyuk genis" type="submit">Şifremi yenile ve giriş yap</button>
              <button class="dugme metin genis" type="button" data-giris-ac="tekrar">Kod gelmedi — yeniden gönder</button>
            </form>
          </div>
        </main>
      </div>`;

    const fE = byId('su-eposta'), fY = byId('su-yeni');
    let adres = '';
    const adim = n => $app.querySelectorAll('[data-adim]').forEach(li => {
      li.classList.toggle('aktif', +li.dataset.adim === n);
      li.classList.toggle('tamam', +li.dataset.adim < n);
    });
    const kodGonder = async () => {
      adres = fE.eposta.value.trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(adres)) { fE.eposta.setAttribute('aria-invalid', 'true'); return bildir('Geçerli bir e-posta adresi girin.', 'hata'); }
      const b = fE.querySelector('button'); b.disabled = true;
      try {
        await Api.sifreSifirlamaKodu(adres);
        byId('su-adres').textContent = adres;
        fY.kullanici.value = adres;
        fE.hidden = true; fY.hidden = false; adim(2);
        byId('su-aciklama').textContent = 'Kodu ve yeni şifrenizi girin. Adres sistemde kayıtlıysa kod birkaç dakika içinde gelir.';
        fY.kod.focus();
      } catch (e) { hataGoster(e); } finally { b.disabled = false; }
    };
    fE.addEventListener('submit', ev => { ev.preventDefault(); kodGonder(); });
    fY.kod.addEventListener('input', () => { if (fY.kod.value.replace(/\D/g, '').length === 6) { adim(3); fY.sifre.focus(); } });
    fY.sifre.addEventListener('input', () => {
      const s = fY.sifre.value;
      const puan = (s.length >= 6) + (s.length >= 10) + (/[a-zçğıöşü]/i.test(s) && /\d/.test(s)) + (/[^a-z0-9çğıöşü]/i.test(s));
      const cubuk = $app.querySelector('.sifre-gucu');
      cubuk.dataset.puan = s ? puan : '';
      byId('su-guc').textContent = !s ? 'En az 6 karakter; harf ve rakam karıştırmanız önerilir.'
        : ['Çok kısa', 'Zayıf', 'Orta', 'İyi', 'Güçlü'][puan] + (s.length < 6 ? ' — en az 6 karakter gerekli' : '');
    });
    fY.addEventListener('submit', async ev => {
      ev.preventDefault();
      fY.querySelectorAll('[data-hata]').forEach(e => { e.textContent = ''; });
      const h = {};
      if (fY.kod.value.replace(/\D/g, '').length !== 6) h.kod = 'E-postanıza gelen 6 haneli kodu girin.';
      if (fY.sifre.value.length < 6) h.sifre = 'Şifre en az 6 karakter olmalıdır.';
      else if (fY.sifre.value !== fY.sifre2.value) h.sifre2 = 'Şifreler aynı değil.';
      for (const [a, m] of Object.entries(h)) fY.querySelector(`[data-hata="${a}"]`).textContent = m;
      if (Object.keys(h).length) return;
      const b = fY.querySelector('button[type=submit]'); b.disabled = true;
      try {
        const o = await Api.sifreYenile(adres, fY.kod.value, fY.sifre.value, fY.hatirla.checked);
        bildir('Şifreniz yenilendi. Hoş geldiniz!', 'basarili');
        girisTamam(o);
      } catch (e) {
        if (e.alanlar && e.alanlar.sifre) fY.querySelector('[data-hata="sifre"]').textContent = e.alanlar.sifre;
        hataGoster(e);
      } finally { if (document.contains(b)) b.disabled = false; }
    });
    $app.querySelector('[data-giris-ac="tekrar"]').addEventListener('click', () => { fY.hidden = true; fE.hidden = false; adim(1); kodGonder(); });
    $app.querySelector('[data-giris-ac="giris"]').addEventListener('click', () => girisEkrani());
    $app.querySelectorAll('[data-goster]').forEach(b => b.addEventListener('click', () => {
      const g = byId(b.dataset.goster);
      const gizli = g.type === 'password';
      g.type = gizli ? 'text' : 'password';
      b.innerHTML = ikon(gizli ? 'gozKapali' : 'goz');
    }));
    (eposta ? fE.querySelector('button') : fE.eposta).focus();
  }

  /* =====================================================================
   * Hesap: şifre belirleme / değiştirme
   * ===================================================================== */

  function sifreFormu(ilk) {
    return `<form class="form sifre-formu" novalidate>
      <input type="email" name="kullanici" autocomplete="username" hidden>
      <div class="alan"><label for="h-sifre">${ilk ? 'Şifre' : 'Yeni şifre'}</label>
        <div class="sifre-girdisi">
          <input id="h-sifre" type="password" name="sifre" autocomplete="new-password" minlength="6" maxlength="64" required>
          <button type="button" class="ikon-dugme kucuk" data-goster-h="h-sifre" aria-label="Şifreyi göster">${ikon('goz')}</button>
        </div>
        <small class="alan-ipucu">En az 6 karakter. Başka sitelerde kullandığınız bir şifreyi seçmeyin.</small>
        <em class="alan-hata" data-hata="sifre"></em>
      </div>
      <div class="alan"><label for="h-sifre2">${ilk ? 'Şifre (tekrar)' : 'Yeni şifre (tekrar)'}</label>
        <input id="h-sifre2" type="password" name="sifre2" autocomplete="new-password" required>
        <em class="alan-hata" data-hata="sifre2"></em>
      </div>
    </form>`;
  }

  function sifreFormunuBagla(eposta, basarili) {
    const f = $katman.querySelector('.sifre-formu');
    f.kullanici.value = eposta || '';
    $katman.querySelectorAll('[data-goster-h]').forEach(b => b.addEventListener('click', () => {
      const g = byId(b.dataset.gosterH);
      const gizli = g.type === 'password';
      g.type = gizli ? 'text' : 'password';
      b.innerHTML = ikon(gizli ? 'gozKapali' : 'goz');
    }));
    const gonder = async () => {
      f.querySelectorAll('[data-hata]').forEach(e => { e.textContent = ''; });
      const hatalar = {};
      if (f.sifre.value.length < 6) hatalar.sifre = 'Şifre en az 6 karakter olmalıdır.';
      else if (f.sifre.value !== f.sifre2.value) hatalar.sifre2 = 'Şifreler aynı değil.';
      for (const [a, m] of Object.entries(hatalar)) { f.querySelector(`[data-hata="${a}"]`).textContent = m; f[a].focus(); }
      if (Object.keys(hatalar).length) return;
      const b = $katman.querySelector('[data-sifre-kaydet]'); b.disabled = true;
      try { await Api.sifreBelirle(f.sifre.value); basarili(); }
      catch (e) {
        if (e.alanlar && e.alanlar.sifre) f.querySelector('[data-hata="sifre"]').textContent = e.alanlar.sifre;
        hataGoster(e);
      } finally { if (document.contains(b)) b.disabled = false; }
    };
    f.addEventListener('submit', ev => { ev.preventDefault(); gonder(); });
    $katman.querySelector('[data-sifre-kaydet]').addEventListener('click', gonder);
  }

  // Kodla ilk girişten sonra bir kez gösterilir.
  function sifreOnerisi() {
    const anahtar = 'ofl-sifre-onerisi-' + S.oturum.id;
    cekmeceAc({
      etiket: 'Giriş şifresi belirleyin', orta: true,
      bas: `<div><h2>Giriş şifresi belirleyin</h2><p class="soluk">Sonraki girişlerde e-posta kodu beklemeden, yalnızca şifrenizle girin.</p></div>`,
      govde: `<div class="bilgi-kutu">${ikon('anahtar')}<span>E-posta adresiniz bu cihazda hatırlanır; giriş ekranında yalnızca şifreniz sorulur. Şifrenizi unutursanız her zaman e-posta koduyla girebilirsiniz.</span></div>
        ${sifreFormu(true)}`,
      alt: `<button class="dugme ikincil" data-sifre-sonra>Şimdi değil</button>
        <button class="dugme" data-sifre-kaydet>${ikon('tamam')}<span>Şifreyi kaydet</span></button>`
    });
    yerelDepo(anahtar, 1);
    sifreFormunuBagla((Api.hesap() || {}).eposta, () => { bildir('Şifreniz kaydedildi. Sonraki girişlerde şifrenizi kullanabilirsiniz.', 'basarili'); cekmeceKapat(); });
    $katman.querySelector('[data-sifre-sonra]').addEventListener('click', () => {
      bildir('İsterseniz daha sonra anahtar simgesinden şifre belirleyebilirsiniz.');
      cekmeceKapat();
    });
  }

  async function hesapAc() {
    let h;
    try { h = await Api.hesabim(); } catch (e) { return hataGoster(e); }
    cekmeceAc({
      etiket: 'Giriş ve şifre',
      bas: `<div><h2>Giriş ve şifre</h2><p class="soluk">${esc(h.eposta)} · ${ROL_ADI[h.rol] || ''}</p></div>`,
      govde: `
        <div class="hesap-durum">
          <div class="bilgi-satiri"><span class="bilgi-ikon">${ikon('anahtar')}</span><div class="bilgi-govde">
            <span class="bilgi-etiket">Giriş şifresi</span>
            <span class="bilgi-deger">${h.sifreVar ? 'Tanımlı — şifrenizle giriş yapabilirsiniz.' : 'Tanımlı değil — her girişte e-posta kodu gerekir.'}</span></div>
            ${h.sifreVar ? `<span class="durum-cip yesil">${ikon('tamam', 'kucuk')}Etkin</span>` : `<span class="durum-cip gri">Yok</span>`}</div>
          <div class="bilgi-satiri"><span class="bilgi-ikon">${ikon('yukle')}</span><div class="bilgi-govde">
            <span class="bilgi-etiket">Bu cihaz</span>
            <span class="bilgi-deger">${KURULU() ? 'Uygulama olarak yüklü.' : 'Tarayıcıdan kullanılıyor.'} Oturumu kapatmak için çıkış simgesini kullanın.</span></div></div>
        </div>
        <h3 class="bolum-baslik">${h.sifreVar ? 'Şifreyi değiştir' : 'Şifre belirle'}</h3>
        ${sifreFormu(!h.sifreVar)}
        <p class="not">${ikon('bilgi', 'kucuk')} Şifrenizi unutursanız giriş ekranındaki “e-posta koduyla gir” bağlantısını kullanın; ardından buradan yeni şifre belirleyebilirsiniz.</p>`,
      alt: `<button class="dugme" data-sifre-kaydet>${ikon('tamam')}<span>${h.sifreVar ? 'Şifreyi değiştir' : 'Şifreyi kaydet'}</span></button>`
    });
    sifreFormunuBagla(h.eposta, () => { bildir(h.sifreVar ? 'Şifreniz değiştirildi.' : 'Şifreniz kaydedildi.', 'basarili'); cekmeceKapat(); });
  }

  /* =====================================================================
   * Profil formu (kayıt, profil, yönetici düzenlemesi ve ekleme ortak)
   * ===================================================================== */

  function yilSecenekleri(secili) {
    let s = '<option value="">Seçin</option>';
    for (let y = OFL.BU_YIL; y >= OFL.ILK_YIL; y--) s += `<option ${+secili === y ? 'selected' : ''}>${y}</option>`;
    return s;
  }

  // 81 il listesi; listede olmayan bir değer (ör. "Berlin (Almanya)") "Yurt dışı" olarak açılır.
  function sehirSecenekleri(secili) {
    const yurtDisi = secili && !OFL.SEHIRLER.includes(secili);
    return '<option value="">Seçin</option>' +
      OFL.SEHIRLER.map(s => `<option ${s === secili ? 'selected' : ''}>${s}</option>`).join('') +
      `<option value="yurtdisi" ${yurtDisi ? 'selected' : ''}>Yurt dışı</option>`;
  }

  function anahtar(alan, acik) {
    return `<label class="gorunurluk">
      <input type="checkbox" role="switch" name="g_${alan}" ${acik ? 'checked' : ''} aria-label="${ALAN_ADI[alan]} diğer kullanıcılara görünsün">
      <span class="anahtar-kutu" aria-hidden="true"></span>
      <span class="anahtar-yazi" aria-hidden="true"><span class="acik-yazi">Görünür</span><span class="kapali-yazi">Gizli</span></span>
    </label>`;
  }

  function girdi(on, ad, etiket, deger, ek) {
    ek = ek || {};
    return `<div class="alan ${ek.sinif || ''}" ${ek.zorunlu ? 'data-zorunlu' : ''}>
      <div class="alan-bas"><label for="${on}-${ad}">${etiket}${ek.zorunlu ? ' <span class="zorunlu" aria-hidden="true">*</span>' : ''}</label>${ek.anahtar || ''}</div>
      ${ek.secim
        ? `<select id="${on}-${ad}" name="${ad}" ${ek.zorunlu ? 'required' : ''}>${ek.secim}</select>`
        : `<input id="${on}-${ad}" name="${ad}" value="${esc(deger)}" ${ek.ozellik || ''} ${ek.zorunlu ? 'required' : ''}>`}
      ${ek.ipucu ? `<small class="alan-ipucu">${ek.ipucu}</small>` : ''}
      <em class="alan-hata" data-hata="${ad}"></em>
    </div>`;
  }

  const BRANSLAR = ['Matematik', 'Fizik', 'Kimya', 'Biyoloji', 'Türk Dili ve Edebiyatı', 'Tarih', 'Coğrafya', 'Felsefe',
    'İngilizce', 'Almanca', 'Bilişim Teknolojileri', 'Beden Eğitimi', 'Görsel Sanatlar', 'Müzik', 'Din Kültürü ve Ahlak Bilgisi', 'Rehberlik', 'Okul İdaresi'];
  const UZMANLIKLAR = ['Genel', 'Kardiyoloji', 'Çocuk Sağlığı ve Hastalıkları', 'İç Hastalıkları', 'Genel Cerrahi', 'Kadın Hastalıkları ve Doğum',
    'Göz Hastalıkları', 'Nöroloji', 'Ortopedi', 'Radyoloji', 'Anesteziyoloji', 'Psikiyatri', 'Aile Hekimliği', 'Ortodonti',
    'Yazılım Geliştirme', 'Yapay Zekâ', 'Veri Bilimi', 'Siber Güvenlik', 'Gömülü Sistemler', 'Savunma Sanayii', 'Ceza Hukuku', 'Ticaret Hukuku',
    'İş Hukuku', 'Finans', 'Pazarlama', 'İnsan Kaynakları'];

  // mod: kayit (herkese açık başvuru), profil (kendi bilgileri), admin (yönetici düzenlemesi), yeni (yönetici ekleme)
  function profilFormu(k, mod) {
    const on = 'f' + mod;
    k = k || { gorunurluk: { egitim: true, meslek: true, sehir: true, telefon: false, eposta: true } };
    const g = k.gorunurluk || {};
    const tur = k.tur === 'ogretmen' ? 'ogretmen' : 'mezun';
    // Mezun kendi başvurusunda ve profilinde tüm alanları doldurmak zorunda; yönetici yalnızca temel alanları.
    const kati = (mod === 'kayit' || mod === 'profil') && tur === 'mezun';
    const z = kati;
    const calisma = k.calisma || '';
    const dugmeYazisi = { kayit: 'Başvurumu gönder', yeni: 'Kullanıcıyı ekle', profil: 'Değişiklikleri kaydet', admin: 'Kaydet' }[mod];
    const turSecilir = mod === 'yeni' || mod === 'admin';
    const kim = (mezunYazi, ogretmenYazi) => turSecilir
      ? `<span class="sadece-mezun">${mezunYazi}</span><span class="sadece-ogretmen">${ogretmenYazi}</span>`
      : (tur === 'ogretmen' ? ogretmenYazi : mezunYazi);
    const sehirYurtDisi = k.sehir && !OFL.SEHIRLER.includes(k.sehir) ? k.sehir : '';

    const turSecimi = turSecilir ? `
      <fieldset class="form-bolum">
        <legend>Kullanıcı türü</legend>
        <div class="segment" role="radiogroup" aria-label="Kullanıcı türü">
          <label><input type="radio" name="tur" value="mezun" ${tur === 'mezun' ? 'checked' : ''}><span>${ikon('kep', 'kucuk')} Mezun</span></label>
          <label><input type="radio" name="tur" value="ogretmen" ${tur === 'ogretmen' ? 'checked' : ''}><span>${ikon('ogretmen', 'kucuk')} Öğretmen</span></label>
        </div>
        ${mod === 'admin' ? `<p class="bolum-not">${ikon('bilgi', 'kucuk')} Yanlış türle kayıt olan kişiyi buradan mezun ya da öğretmen yapabilirsiniz. Öğretmen için branş zorunludur.</p>` : ''}
        <p class="bolum-not" ${mod === 'admin' ? 'hidden' : ''}>${kim(
          `${ikon('bilgi', 'kucuk')} Yöneticinin eklediği mezun doğrudan onaylanır. Mezunun açık rızasını ayrıca almayı unutmayın.`,
          `${ikon('bilgi', 'kucuk')} Öğretmenler rehberde “Öğretmen” etiketiyle görünür ve mezunlarla aynı haklara sahiptir: rehberi görür, duyuruları alır, yalnızca kendi bilgisini düzenler.`)}</p>
      </fieldset>` : '';

    const yetki = mod === 'yeni' && S.asil ? `
      <fieldset class="form-bolum">
        <legend>Yetki</legend>
        <label class="onay-kutusu sadece-ogretmen">
          <input type="checkbox" name="yonetici">
          <span><strong>Yönetici yetkisi ver</strong><small>Bu öğretmen yönetim paneline erişir; başvuruları onaylayabilir, kullanıcı ekleyebilir ve duyuru yapabilir. Rehberde yine öğretmen olarak görünür.</small></span>
        </label>
        <p class="bolum-not">${ikon('eposta', 'kucuk')} Kaydettiğinizde kişiye sisteme eklendiğini ve nasıl giriş yapacağını anlatan bir e-posta gönderilir.</p>
      </fieldset>` : '';

    const kvkk = mod === 'kayit' ? `
      <fieldset class="form-bolum">
        <legend>Kişisel verilerin korunması</legend>
        <details class="kvkk-metin">
          <summary>Aydınlatma metnini okuyun</summary>
          <div>
            <p><strong>Veri sorumlusu:</strong> ${esc(OFL.OKUL_ADI)} Müdürlüğü.</p>
            <p><strong>İşlenen veriler:</strong> Ad-soyad, mezuniyet yılı, çalışma durumu, üniversite ve bölüm, meslek, kurum ve uzmanlık alanı, şehir, telefon ve e-posta.</p>
            <p><strong>Amaç:</strong> Mezunlar arasında iletişim ağı kurmak; okul etkinlikleri, kariyer günleri ve mentorluk çalışmaları için mezunlara ulaşmak.</p>
            <p><strong>Kimler görebilir:</strong> Okul yönetiminin belirlediği sistem yöneticileri tüm bilgilerinizi görür. Diğer kullanıcılar yalnızca ad-soyadınızı, mezuniyet yılınızı ve sizin “Görünür” olarak işaretlediğiniz bilgileri görebilir. Bilgileriniz üçüncü kişilere verilmez.</p>
            <p><strong>Saklama:</strong> Veriler Google'ın bulut hizmetlerinde (Google E-Tablolar) saklanır; bu hizmetin sunucuları yurt dışında bulunabilir. Reddedilen başvurular ${30} gün sonra kalıcı olarak silinir.</p>
            <p><strong>Haklarınız:</strong> 6698 sayılı KVKK'nın 11. maddesi uyarınca bilgilerinizi istediğiniz zaman güncelleyebilir, görünürlüğünü değiştirebilir veya silinmesini talep edebilirsiniz.</p>
          </div>
        </details>
        <label class="onay-kutusu" data-zorunlu-kutu>
          <input type="checkbox" name="kvkkOnay">
          <span>Aydınlatma metnini okudum. Bilgilerimin belirtilen amaçla işlenmesine, yurt dışındaki sunucularda saklanmasına ve seçtiğim bilgilerin diğer kullanıcılarla paylaşılmasına <strong>açık rıza</strong> veriyorum. <span class="zorunlu" aria-hidden="true">*</span></span>
        </label>
        <em class="alan-hata" data-hata="kvkk"></em>
      </fieldset>` : '';

    const calismaSecimi = `
      <div class="alan sadece-mezun" ${z ? 'data-zorunlu-grup="calisma"' : ''}>
        <div class="alan-bas"><span class="etiket-yazi">Çalışma durumu${z ? ' <span class="zorunlu" aria-hidden="true">*</span>' : ''}</span>${anahtar('meslek', g.meslek)}</div>
        <div class="segment genis-segment" role="radiogroup" aria-label="Çalışma durumu">
          ${[['calisiyor', 'canta', 'Çalışıyor'], ['ogrenci', 'kep', 'Üniversite öğrencisi'], ['calismiyor', 'kisi', 'Çalışmıyor']].map(([d, ik, ad]) =>
            `<label><input type="radio" name="calisma" value="${d}" ${calisma === d ? 'checked' : ''}><span>${ikon(ik, 'kucuk')} ${ad}</span></label>`).join('')}
        </div>
        <small class="alan-ipucu">Görünürlük ayarı meslek, kurum ve uzmanlık için de geçerlidir.</small>
        <em class="alan-hata" data-hata="calisma"></em>
      </div>`;

    return `
      <form class="form profil-formu" data-tur="${tur}" data-calisma="${calisma}" ${kati ? 'data-kati' : ''} novalidate>
        <input type="text" name="web" class="tuzak" tabindex="-1" autocomplete="off" aria-hidden="true">
        ${turSecimi}
        <fieldset class="form-bolum">
          <legend>Kimlik bilgileri</legend>
          <p class="bolum-not">${ikon('bilgi', 'kucuk')} ${kim('Ad, soyad ve mezuniyet yılı', 'Ad, soyad ve branş')} rehberde tüm kullanıcılara görünür.</p>
          <div class="alan-izgara">
            ${girdi(on, 'ad', 'Ad', k.ad, { zorunlu: true, ozellik: 'autocomplete="given-name" autocapitalize="words"' })}
            ${girdi(on, 'soyad', 'Soyad', k.soyad, { zorunlu: true, ozellik: 'autocomplete="family-name" autocapitalize="words"' })}
            ${girdi(on, 'yil', 'Mezuniyet yılı', '', { zorunlu: true, secim: yilSecenekleri(k.yil), sinif: 'sadece-mezun' })}
            ${girdi(on, 'brans', 'Branş', tur === 'ogretmen' ? k.brans : '', { zorunlu: true, sinif: 'sadece-ogretmen', ozellik: 'list="brans-listesi" placeholder="Örn. Kimya"' })}
          </div>
        </fieldset>

        <fieldset class="form-bolum">
          <legend>${kim('Eğitim ve çalışma', 'Eğitim ve meslek')}</legend>
          <p class="bolum-not">${ikon('goz', 'kucuk')} Her bilginin yanındaki anahtarla diğer kullanıcıların neyi görebileceğini seçin.</p>
          ${calismaSecimi}
          <div class="alan-izgara">
            ${girdi(on, 'universite', `<span class="sadece-ogrenci">Okuduğu üniversite</span><span class="ogrenci-degil">Mezun olduğu üniversite</span>`, k.universite, { zorunlu: z, anahtar: anahtar('egitim', g.egitim), ozellik: 'list="uni-listesi" placeholder="Listeden seçin veya yazın"', ipucu: 'Görünürlük ayarı bölüm için de geçerlidir.' })}
            ${girdi(on, 'bolum', 'Bölüm', k.bolum, { zorunlu: z, ozellik: 'list="bolum-listesi" placeholder="Listeden seçin veya yazın"' })}
            ${girdi(on, 'meslek', 'Meslek', tur === 'ogretmen' || calisma === 'calisiyor' || !calisma ? k.meslek : '', { zorunlu: z, sinif: 'sadece-calisiyor', ozellik: 'list="meslek-listesi" placeholder="Örn. Doktor, Yazılım Mühendisi"' })}
            ${girdi(on, 'kurum', 'Çalıştığı kurum', k.kurum, { zorunlu: z, sinif: 'sadece-calisiyor sadece-mezun', ozellik: 'placeholder="Örn. Ankara Şehir Hastanesi, ASELSAN"' })}
            ${girdi(on, 'uzmanlik', 'Branş / uzmanlık alanı', tur === 'mezun' ? k.brans : '', { zorunlu: z, sinif: 'sadece-calisiyor sadece-mezun', ozellik: 'list="uzmanlik-listesi" placeholder="Örn. Kardiyoloji, Yapay Zekâ"', ipucu: 'Uzmanlık alanınız yoksa “Genel” yazın.' })}
          </div>
        </fieldset>

        <fieldset class="form-bolum">
          <legend>İletişim ve konum</legend>
          <div class="alan-izgara">
            ${girdi(on, 'sehir', 'Yaşadığı şehir', '', { zorunlu: z, secim: sehirSecenekleri(k.sehir), anahtar: anahtar('sehir', g.sehir) })}
            ${girdi(on, 'sehirYurtDisi', 'Ülke / şehir', sehirYurtDisi, { zorunlu: z, sinif: 'yurtdisi-alani', ozellik: 'placeholder="Örn. Berlin (Almanya)"' })}
            ${girdi(on, 'telefon', 'Telefon', k.telefon, { zorunlu: z, anahtar: anahtar('telefon', g.telefon), ozellik: 'type="tel" placeholder="05XX XXX XX XX" autocomplete="tel" inputmode="tel"' })}
            ${girdi(on, 'eposta', 'E-posta', k.eposta, { zorunlu: true, anahtar: anahtar('eposta', g.eposta), ozellik: 'type="email" placeholder="ornek@gmail.com" autocomplete="email" inputmode="email" autocapitalize="off"', ipucu: 'Sisteme giriş bu adresle yapılır.' })}
          </div>
        </fieldset>
        ${kvkk}
        ${yetki}
        ${kati ? `<p class="bolum-not">${ikon('bilgi', 'kucuk')} <span><span class="zorunlu">*</span> ile işaretli alanların doldurulması zorunludur.</span></p>` : ''}
        <div class="form-alt">
          <button class="dugme buyuk" type="submit">${dugmeYazisi}</button>
        </div>
      </form>
      <datalist id="uni-listesi">${OFL.UNIVERSITELER.map(u => `<option value="${u}">`).join('')}</datalist>
      <datalist id="bolum-listesi">${OFL.BOLUMLER.map(u => `<option value="${u}">`).join('')}</datalist>
      <datalist id="meslek-listesi">${OFL.MESLEKLER.map(u => `<option value="${u}">`).join('')}</datalist>
      <datalist id="uzmanlik-listesi">${UZMANLIKLAR.map(u => `<option value="${u}">`).join('')}</datalist>
      <datalist id="brans-listesi">${BRANSLAR.map(b => `<option value="${b}">`).join('')}</datalist>`;
  }

  // Çalışma durumu ve "Yurt dışı" seçimine göre ilgili alanları gösterir/gizler.
  function formuCanlandir(f) {
    const guncelle = () => {
      if (f.elements.calisma && f.elements.calisma.length) f.dataset.calisma = f.elements.calisma.value || '';
      f.dataset.yurtdisi = f.elements.sehir.value === 'yurtdisi' ? '1' : '';
    };
    f.addEventListener('change', guncelle);
    guncelle();
  }

  function formVerisi(f) {
    const v = {};
    for (const n of ['ad', 'soyad', 'yil', 'universite', 'bolum', 'meslek', 'kurum', 'telefon', 'eposta', 'web']) v[n] = f.elements[n].value;
    v.tur = f.elements.tur ? f.elements.tur.value : f.dataset.tur;
    v.brans = v.tur === 'ogretmen' ? f.elements.brans.value : f.elements.uzmanlik.value;
    v.calisma = f.elements.calisma ? f.elements.calisma.value : '';
    v.sehir = f.elements.sehir.value === 'yurtdisi' ? f.elements.sehirYurtDisi.value : f.elements.sehir.value;
    v.gorunurluk = {};
    for (const a of OFL.ALANLAR) v.gorunurluk[a] = f.elements['g_' + a].checked;
    if (f.elements.kvkkOnay) v.kvkkOnay = f.elements.kvkkOnay.checked;
    if (f.elements.yonetici) v.yonetici = v.tur === 'ogretmen' && f.elements.yonetici.checked;
    return v;
  }

  // Zorunlu alanları sunucuya gitmeden önce denetler; boş bırakılanları işaretler.
  function eksikAlanlar(f) {
    const h = {};
    const gorunur = el => el && el.offsetParent !== null;
    f.querySelectorAll('.alan[data-zorunlu]').forEach(a => {
      const g = a.querySelector('input, select');
      if (gorunur(g) && !String(g.value).trim()) h[g.name] = 'Bu alan zorunludur.';
    });
    f.querySelectorAll('[data-zorunlu-grup]').forEach(a => {
      const ad = a.dataset.zorunluGrup;
      if (gorunur(a) && !f.elements[ad].value) h[ad] = 'Lütfen bir seçenek işaretleyin.';
    });
    if (f.elements.kvkkOnay && !f.elements.kvkkOnay.checked) h.kvkk = 'Devam etmek için açık rıza onayı gereklidir.';
    if (Object.keys(h).length) {
      const e = new Error('Lütfen zorunlu alanları doldurun.');
      e.kullaniciMesaji = true;
      e.alanlar = h;
      return e;
    }
    return null;
  }

  function formuBagla(f, gonder, topla) {
    if (f.classList.contains('profil-formu')) formuCanlandir(f);
    f.addEventListener('submit', async ev => {
      ev.preventDefault();
      f.querySelectorAll('[data-hata]').forEach(e => { e.textContent = ''; });
      f.querySelectorAll('[aria-invalid]').forEach(e => e.removeAttribute('aria-invalid'));
      const b = f.querySelector('button[type=submit]') || document.querySelector(`button[form="${f.id}"]`);
      const yazi = b.innerHTML;
      b.disabled = true; b.textContent = 'Kaydediliyor…';
      try {
        const eksik = f.classList.contains('profil-formu') ? eksikAlanlar(f) : null;
        if (eksik) throw eksik;
        await gonder((topla || formVerisi)(f));
      } catch (e) {
        if (e.alanlar) {
          let ilk = null;
          for (const [alan, mesaj] of Object.entries(e.alanlar)) {
            const ad = alan === 'brans' && f.elements.uzmanlik && f.dataset.tur !== 'ogretmen' ? 'uzmanlik'
              : alan === 'sehir' && f.elements.sehir && f.elements.sehir.value === 'yurtdisi' ? 'sehirYurtDisi' : alan;
            const el = f.querySelector(`[data-hata="${ad}"]`);
            if (el) el.textContent = mesaj;
            const g = f.elements[ad === 'kvkk' ? 'kvkkOnay' : ad];
            const odak = g && g.length && !g.tagName ? g[0] : g;
            if (odak && odak.setAttribute) { odak.setAttribute('aria-invalid', 'true'); ilk = ilk || odak; }
          }
          if (ilk) { ilk.focus({ preventScroll: true }); ilk.scrollIntoView({ block: 'center', behavior: 'smooth' }); }
        }
        hataGoster(e);
      } finally { if (document.contains(b)) { b.disabled = false; b.innerHTML = yazi; } }
    });
  }

  /* =====================================================================
   * Kayıt (başvuru)
   * ===================================================================== */

  function kayitEkrani() {
    $app.innerHTML = `
      <div class="giris-duzen">
        ${markaPaneli()}
        <main class="giris-alan kayit-alan">
          <div class="kayit-kutu">
            <a href="#/" class="geri-baglanti">${ikon('sol', 'kucuk')} Girişe dön</a>
            <h2>Mezun kaydı</h2>
            <p class="soluk">Başvurunuz okul yönetimi tarafından incelenip onaylandıktan sonra e-posta adresinizle giriş yapabilirsiniz.</p>
            ${profilFormu(null, 'kayit')}
          </div>
        </main>
      </div>`;
    formuBagla($app.querySelector('form'), async v => {
      await Api.kayitOl(v);
      $app.querySelector('.kayit-kutu').innerHTML = `
        <div class="basari">
          <span class="basari-ikon">${ikon('tamam')}</span>
          <h2>Başvurunuz alındı</h2>
          <p>Bilgileriniz okul yönetiminin onayına gönderildi. Onaylandığında <strong>${esc(v.eposta)}</strong> adresinize bilgi verilecek ve bu adresle giriş yapabileceksiniz.</p>
          ${DEMO ? '<p class="soluk">Demo ipucu: Yönetici olarak girip “Başvurular” sayfasından bu başvuruyu inceleyip onaylayabilirsiniz.</p>' : ''}
          ${cihaz().mobil && !KURULU() ? `<div class="kurulum-oneri">
            <strong>${ikon('yukle', 'kucuk')} Beklerken uygulamayı telefonunuza ekleyin</strong>
            <p class="soluk kucuk-yazi">Onaylandığınızda OFL Connect'i ana ekranınızdaki simgeden tek dokunuşla açabilirsiniz. Kısa video rehberi izleyin:</p>
            <button class="dugme" data-ac="kurulum-rehberi">${ikon('oynat')}<span>Video rehberi izle</span></button>
          </div>` : ''}
          <a class="dugme ${cihaz().mobil && !KURULU() ? 'ikincil' : ''}" href="#/">Girişe dön</a>
        </div>`;
      window.scrollTo(0, 0);
      // Telefondan kayıt olanlara kurulum rehberi kendiliğinden açılır
      if (cihaz().mobil && !KURULU()) setTimeout(() => kurulumRehberi(true), 900);
    });
  }

  /* =====================================================================
   * Mezun rehberi
   * ===================================================================== */

  async function rehberEkrani() {
    const admin = S.oturum.rol === 'admin';
    const ic = byId('icerik');
    ic.innerHTML = sayfaBasi('Rehber', 'Kayıtlar yükleniyor…') + yukleniyor();
    S.liste = await Api.rehber();
    const sehirler = [...new Set(S.liste.map(k => k.sehir).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'tr'));
    const yillar = [...new Set(S.liste.filter(k => !ogretmen(k)).map(k => k.yil))].sort((a, b) => b - a);
    const ogretmenSayisi = S.liste.filter(ogretmen).length;
    const mezunSayisi = S.liste.length - ogretmenSayisi;
    const f = S.filtre;
    const turSekmesi = (deger, yazi, n) => `<button class="sekme ${f.tur === deger ? 'aktif' : ''}" role="tab" aria-selected="${f.tur === deger}" data-ac="tur-filtre" data-tur="${deger}">${yazi} <span class="sayac">${sayi(n)}</span></button>`;
    ic.innerHTML = `
      ${sayfaBasi('Rehber', `${sayi(mezunSayisi)} mezun${ogretmenSayisi ? ` · ${sayi(ogretmenSayisi)} öğretmen` : ''}`,
        admin ? `<button class="dugme" data-ac="yeni">${ikon('kisiEkle')}<span>Kullanıcı ekle</span></button>` : '')}
      <div class="sekmeler tur-sekmeleri" role="tablist" aria-label="Kişi türü">
        ${turSekmesi('', 'Herkes', S.liste.length)}${turSekmesi('mezun', 'Mezunlar', mezunSayisi)}${turSekmesi('ogretmen', 'Öğretmenler', ogretmenSayisi)}
        ${admin ? `<button class="cevrimici-cip ${f.cevrimici ? 'aktif' : ''}" data-ac="cevrimici-filtre" aria-pressed="${!!f.cevrimici}"><span class="cevrimici-nokta"></span><span id="cevrimici-sayi">${S.liste.filter(k => k.cevrimici).length}</span> çevrimiçi</button>` : ''}
      </div>
      <div class="arac-cubugu">
        <label class="arama">${ikon('ara')}<span class="gorunmez">Ara</span>
          <input type="search" id="q" value="${esc(f.q)}" placeholder="İsim, meslek, kurum, üniversite veya şehir ara" autocomplete="off">
        </label>
        <label class="secim mezun-filtresi"><span class="gorunmez">Çalışma durumu</span><select id="f-calisma">
          <option value="">Tüm durumlar</option>
          <option value="calisiyor" ${f.calisma === 'calisiyor' ? 'selected' : ''}>Çalışanlar</option>
          <option value="ogrenci" ${f.calisma === 'ogrenci' ? 'selected' : ''}>Üniversite öğrencileri</option>
          <option value="calismiyor" ${f.calisma === 'calismiyor' ? 'selected' : ''}>Çalışmayanlar</option>
        </select></label>
        <label class="secim mezun-filtresi"><span class="gorunmez">Mezuniyet yılı</span><select id="f-yil"><option value="">Tüm yıllar</option>${yillar.map(y => `<option ${+f.yil === y ? 'selected' : ''}>${y}</option>`).join('')}</select></label>
        <label class="secim"><span class="gorunmez">Şehir</span><select id="f-sehir"><option value="">Tüm şehirler</option>${sehirler.map(s => `<option ${f.sehir === s ? 'selected' : ''}>${esc(s)}</option>`).join('')}</select></label>
        <label class="secim"><span class="gorunmez">Sıralama</span><select id="f-sirala">
          <option value="yil" ${f.sirala === 'yil' ? 'selected' : ''}>En yeni mezun</option>
          <option value="eski" ${f.sirala === 'eski' ? 'selected' : ''}>En eski mezun</option>
          <option value="ad" ${f.sirala === 'ad' ? 'selected' : ''}>Ada göre (A–Z)</option>
        </select></label>
        <button class="dugme metin" data-ac="temizle" id="temizle" hidden>Filtreleri temizle</button>
      </div>
      <div class="tablo-kart">
        <table class="tablo rehber-tablo">
          <thead><tr>
            <th scope="col">Kişi</th><th scope="col" class="h-yil">Yıl / Branş</th><th scope="col" class="h-egitim">Üniversite / Bölüm</th>
            <th scope="col" class="h-meslek">Çalışma / Meslek</th><th scope="col" class="h-sehir">Şehir</th><th scope="col" class="h-iletisim">İletişim</th>
          </tr></thead>
          <tbody id="liste"></tbody>
        </table>
        <div class="tablo-alt" id="sayfalama"></div>
      </div>`;
    ic.querySelector('.arac-cubugu').dataset.tur = f.tur;

    const q = byId('q');
    let zamanlayici;
    q.addEventListener('input', () => {
      clearTimeout(zamanlayici);
      zamanlayici = setTimeout(() => { f.q = q.value; S.sayfa = 1; listeyiCiz(); }, 150);
    });
    const secim = (id, ad) => byId(id).addEventListener('change', ev => { f[ad] = ev.target.value; S.sayfa = 1; listeyiCiz(); });
    secim('f-calisma', 'calisma'); secim('f-yil', 'yil'); secim('f-sehir', 'sehir'); secim('f-sirala', 'sirala');
    listeyiCiz();
    if (admin) cevrimiciTakibi();
  }

  // Yönetici rehberdeyken çevrimiçi bilgisi her dakika yenilenir.
  function cevrimiciTakibi() {
    clearInterval(S.cevrimiciZamanlayici);
    S.cevrimiciZamanlayici = setInterval(async () => {
      if (!byId('liste') || location.hash.replace(/^#\/?/, '') !== 'rehber') return clearInterval(S.cevrimiciZamanlayici);
      if (document.hidden) return;
      try {
        const idler = new Set(await Api.cevrimici());
        S.liste.forEach(k => { k.cevrimici = idler.has(k.id); });
        const el = byId('cevrimici-sayi');
        if (el) el.textContent = idler.size;
        listeyiCiz();
      } catch (e) { /* sessizce geç */ }
    }, 60000);
  }

  function filtrele() {
    const f = S.filtre;
    const kelimeler = OFL.katla(f.q).split(/\s+/).filter(Boolean);
    const l = S.liste.filter(k => {
      if (f.tur && k.tur !== f.tur) return false;
      if (f.cevrimici && !k.cevrimici) return false;
      if (f.tur !== 'ogretmen') {
        if (f.calisma && (ogretmen(k) || k.calisma !== f.calisma)) return false;
        if (f.yil && k.yil !== +f.yil) return false;
      }
      if (f.sehir && k.sehir !== f.sehir) return false;
      if (!kelimeler.length) return true;
      const metin = OFL.katla([k.ad, k.soyad, k.meslek, k.kurum, k.universite, k.bolum, k.sehir, k.yil || '', k.brans,
        ogretmen(k) ? 'öğretmen' : 'mezun', k.calisma === 'ogrenci' ? 'öğrenci' : ''].join(' '));
      return kelimeler.every(w => metin.includes(w));
    });
    const adSirasi = (a, b) => adSoyad(a).localeCompare(adSoyad(b), 'tr');
    // Öğretmenlerin mezuniyet yılı yoktur; yıl sıralamalarında en üstte toplanırlar.
    const yil = (k, bos) => ogretmen(k) ? bos : k.yil;
    const sira = f.sirala === 'ad' ? adSirasi
      : f.sirala === 'eski' ? (a, b) => yil(a, 0) - yil(b, 0) || adSirasi(a, b)
        : (a, b) => yil(b, 1e4) - yil(a, 1e4) || adSirasi(a, b);
    // Yönetici için çevrimiçi olanlar en üstte
    l.sort((a, b) => (b.cevrimici ? 1 : 0) - (a.cevrimici ? 1 : 0) || sira(a, b));
    return l;
  }

  const gizliHucre = `<span class="gizli-hucre" title="Bu bilgi paylaşılmıyor">${ikon('kilit', 'kucuk')}Gizli</span>`;
  const deger = (v, gizli) => gizli ? gizliHucre : (v ? esc(v) : '<span class="soluk">—</span>');

  // Çalışma durumu ve meslek: "Üniversite öğrencisi / Tıp", "Doktor / Ankara Şehir Hastanesi · Kardiyoloji"
  function calismaOzeti(k) {
    if (ogretmen(k)) return { ust: OFL.katla(k.meslek).includes('ogretmen') ? '' : k.meslek, alt: '' };
    if (k.calisma === 'ogrenci') return { ust: 'Üniversite öğrencisi', alt: k.gizli && k.gizli.includes('egitim') ? '' : k.bolum };
    if (k.calisma === 'calismiyor') return { ust: 'Çalışmıyor', alt: '' };
    return { ust: k.meslek, alt: [k.kurum, k.brans && k.brans !== 'Genel' ? k.brans : ''].filter(Boolean).join(' · ') };
  }

  function satirHtml(k) {
    const gizli = a => k.gizli.includes(a);
    const tel = telRakam(k.telefon);
    const iletisim = (tel ? `<a class="ikon-dugme kucuk" href="tel:+9${tel}" title="Ara: ${esc(k.telefon)}" aria-label="${esc(adSoyad(k))} kişisini ara">${ikon('telefon')}</a>` : '') +
      (k.eposta ? `<a class="ikon-dugme kucuk" href="mailto:${esc(k.eposta)}" title="${esc(k.eposta)}" aria-label="${esc(adSoyad(k))} kişisine e-posta gönder">${ikon('eposta')}</a>` : '');
    const c = gizli('meslek') ? { ust: '', alt: '' } : calismaOzeti(k);
    const ozet = [c.ust + (c.ust && c.alt && k.calisma === 'ogrenci' ? ` (${c.alt})` : ''), k.sehir].filter(Boolean).join(' · ');
    return `<tr data-ac="detay" data-id="${k.id}" tabindex="0" class="${k.cevrimici ? 'cevrimici' : ''}">
      <td class="h-kisi"><div class="kisi">${avatar(k)}<div class="kisi-yazi">
        <strong><span class="ad-tik">${esc(adSoyad(k))}${k.cevrimici ? ` <span class="cevrimici-etiket" title="Şu anda çevrimiçi">${ikon('tamam', 'kucuk')}<span class="gorunmez">Çevrimiçi</span></span>` : ''}</span>${k.kendisi ? ' <span class="etiket">Siz</span>' : ''}${ogretmen(k) ? ' <span class="etiket ogretmen-etiket mobil-goster">Öğretmen</span>' : ''}</strong>
        <span class="mobil-ek">${esc(kimlikYazisi(k))}${ozet ? ' · ' + esc(ozet) : ''}</span>
      </div></div></td>
      <td class="h-yil">${ogretmen(k) ? `<span class="ogretmen-hucre"><span class="etiket ogretmen-etiket">${ikon('ogretmen', 'kucuk')}Öğretmen</span><small>${esc(k.brans || '')}</small></span>` : `<span class="yil">${k.yil}</span>`}</td>
      <td class="h-egitim">${gizli('egitim') ? gizliHucre : (k.universite || k.bolum ? `<span class="iki-satir">${esc(k.universite || '—')}<small>${esc(k.bolum || '')}</small></span>` : '<span class="soluk">—</span>')}</td>
      <td class="h-meslek">${gizli('meslek') ? gizliHucre : c.ust ? `<span class="iki-satir">${esc(c.ust)}${c.alt ? `<small>${esc(c.alt)}</small>` : ''}</span>` : '<span class="soluk">—</span>'}</td>
      <td class="h-sehir">${deger(k.sehir, gizli('sehir'))}</td>
      <td class="h-iletisim"><div class="iletisim-hucre">${iletisim || (gizli('telefon') && gizli('eposta') ? gizliHucre : '<span class="soluk">—</span>')}</div></td>
    </tr>`;
  }

  function listeyiCiz() {
    const l = filtrele();
    const toplamSayfa = Math.max(1, Math.ceil(l.length / SAYFA_BOYU));
    S.sayfa = Math.min(S.sayfa, toplamSayfa);
    const bas = (S.sayfa - 1) * SAYFA_BOYU;
    const gosterilen = l.slice(bas, bas + SAYFA_BOYU);
    const f = S.filtre;
    byId('temizle').hidden = !(f.q || f.tur || f.calisma || f.yil || f.sehir || f.cevrimici);
    byId('liste').innerHTML = gosterilen.length
      ? gosterilen.map(satirHtml).join('')
      : `<tr class="bos-satir"><td colspan="6">${bosDurum('ara', 'Sonuç bulunamadı', 'Arama ifadesini veya filtreleri değiştirmeyi deneyin.')}</td></tr>`;
    byId('sayfalama').innerHTML = l.length ? `
      <span class="soluk">${sayi(bas + 1)}–${sayi(bas + gosterilen.length)} / ${sayi(l.length)} kişi${l.length !== S.liste.length ? ' (filtrelenmiş)' : ''}</span>
      ${toplamSayfa > 1 ? `<div class="sayfa-dugmeleri">
        <button class="dugme ikincil kucuk" data-ac="sayfa" data-yon="-1" ${S.sayfa === 1 ? 'disabled' : ''} aria-label="Önceki sayfa">${ikon('sol')}<span>Önceki</span></button>
        <span class="sayfa-no">Sayfa ${S.sayfa} / ${toplamSayfa}</span>
        <button class="dugme ikincil kucuk" data-ac="sayfa" data-yon="1" ${S.sayfa === toplamSayfa ? 'disabled' : ''} aria-label="Sonraki sayfa"><span>Sonraki</span>${ikon('sag')}</button>
      </div>` : ''}` : '';
  }

  /* =====================================================================
   * Kişi detayı
   * ===================================================================== */

  function bilgiSatiri(ikonAd, etiket, icerik, alan, k) {
    const gizli = alan && k.gizli && k.gizli.includes(alan);
    const gorunurlukEtiketi = k.tamYetki && alan && k.gorunurluk
      ? (k.gorunurluk[alan] ? `<span class="durum-cip yesil">${ikon('goz', 'kucuk')}Görünür</span>` : `<span class="durum-cip gri">${ikon('gozKapali', 'kucuk')}Gizli</span>`)
      : '';
    return `<div class="bilgi-satiri">
      <span class="bilgi-ikon">${ikon(ikonAd)}</span>
      <div class="bilgi-govde">
        <span class="bilgi-etiket">${etiket}</span>
        ${gizli ? `<span class="bilgi-gizli">${ikon('kilit', 'kucuk')} Paylaşılmıyor</span>` : `<span class="bilgi-deger">${icerik || '<span class="soluk">Belirtilmemiş</span>'}</span>`}
      </div>
      ${gorunurlukEtiketi}
    </div>`;
  }

  function bilgiListesi(k) {
    const egitim = [k.universite, k.bolum].filter(Boolean).map(esc).join('<br>');
    const calisma = ogretmen(k) ? esc(k.meslek)
      : k.calisma === 'ogrenci' ? 'Üniversite öğrencisi'
        : k.calisma === 'calismiyor' ? 'Çalışmıyor'
          : [k.meslek, k.kurum, k.brans ? 'Uzmanlık: ' + k.brans : ''].filter(Boolean).map(esc).join('<br>');
    return `<div class="bilgi-listesi">
      ${bilgiSatiri('kep', k.calisma === 'ogrenci' ? 'Okuduğu üniversite ve bölüm' : 'Üniversite ve bölüm', egitim, 'egitim', k)}
      ${bilgiSatiri('canta', ogretmen(k) ? 'Meslek' : 'Çalışma durumu ve meslek', calisma, 'meslek', k)}
      ${bilgiSatiri('konum', 'Şehir', esc(k.sehir), 'sehir', k)}
      ${bilgiSatiri('telefon', 'Telefon', esc(k.telefon), 'telefon', k)}
      ${bilgiSatiri('eposta', 'E-posta', esc(k.eposta), 'eposta', k)}
    </div>`;
  }

  function kisiBasligi(k, ek) {
    return `<div class="kisi-baslik">${avatar(k, 'buyuk')}<div>
      <h2>${esc(adSoyad(k))}${ogretmen(k) ? ' <span class="etiket ogretmen-etiket">Öğretmen</span>' : ''}</h2>
      <p class="soluk">${esc(kimlikYazisi(k))}${k.cevrimici ? ' · <span class="cevrimici-yazi"><span class="cevrimici-nokta"></span>Çevrimiçi</span>' : ''}${ek || ''}</p>
    </div></div>`;
  }

  // Rehberde zaten yüklü olan kayıt hemen gösterilir; sunucuya yalnızca listede yoksa gidilir.
  async function kayitGetir(id) {
    const k = S.liste.find(x => x.id === id) || (S.basvurular || []).find(x => x.id === id);
    return k || Api.mezun(id);
  }

  async function detayAc(id) {
    let k;
    try { k = await kayitGetir(id); } catch (e) { return hataGoster(e); }
    const admin = S.oturum.rol === 'admin';
    const tel = telRakam(k.telefon);
    const iletisim = [];
    if (tel) {
      iletisim.push(`<a class="dugme" href="tel:+9${tel}">${ikon('telefon')}<span>Ara</span></a>`);
      iletisim.push(`<a class="dugme ikincil" href="https://wa.me/9${tel}" target="_blank" rel="noopener">${ikon('mesaj')}<span>WhatsApp</span></a>`);
    }
    if (k.eposta) iletisim.push(`<a class="dugme ikincil" href="mailto:${esc(k.eposta)}">${ikon('eposta')}<span>E-posta</span></a>`);

    const notlar = [];
    if (!admin && k.gizli.length) notlar.push(`${ikon('kilit', 'kucuk')} ${ogretmen(k) ? 'Bu öğretmen' : 'Bu mezun'} ${k.gizli.length} bilgisini yalnızca okul yönetimiyle paylaşıyor.`);
    if (admin) notlar.push(`${ikon('takvim', 'kucuk')} Son güncelleme: ${tarihYaz(k.guncelleme)}${k.sonGiris ? ` · Son giriş: ${tarihSaat(k.sonGiris)}` : ''}`);
    if (admin && k.silmeTalebi) notlar.push(`${ikon('cop', 'kucuk')} ${tarihYaz(k.silmeTalebi)} tarihinde verilerinin silinmesini talep etti.`);

    let alt = '';
    if (admin) alt = `<button class="dugme tehlike-cerceve" data-ac="sil" data-id="${k.id}">${ikon('cop')}<span>Sil</span></button>
      <button class="dugme" data-ac="duzenle" data-id="${k.id}">${ikon('kalem')}<span>Düzenle</span></button>`;
    else if (k.kendisi) alt = `<a class="dugme" href="#/profil">${ikon('kalem')}<span>Profilimi düzenle</span></a>`;

    cekmeceAc({
      etiket: adSoyad(k),
      bas: kisiBasligi(k),
      govde: `${iletisim.length ? `<div class="iletisim-dugmeleri">${iletisim.join('')}</div>` : ''}
        ${bilgiListesi(k)}
        ${notlar.map(n => `<p class="not">${n}</p>`).join('')}
        ${admin ? `<section class="inceleme-bolum" id="sifre-bolumu"><h3>Giriş şifresi</h3><p class="soluk kucuk-yazi">${yukleniyor()}</p></section>
          <section class="inceleme-bolum" id="yetki-bolumu"></section>` : ''}`,
      alt
    });
    if (admin) { sifreBolumunuDoldur(k); yetkiBolumunuDoldur(k); }
  }

  // Yönetici listesi (asil olanlar işaretli) oturum boyunca önbellekte tutulur.
  async function yoneticiBilgisi(yenile) {
    if (!S.yoneticiListesi || yenile) {
      S.yoneticiListesi = await Api.yoneticiler();
      S.asil = S.yoneticiListesi.some(y => y.sen && y.asil);
    }
    return S.yoneticiListesi;
  }

  // Yönetici: kişinin yönetici yetkisi; yalnızca asil yöneticiler verip kaldırabilir.
  async function yetkiBolumunuDoldur(k) {
    let liste;
    try { liste = await yoneticiBilgisi(); } catch (e) { return; }
    const yer = byId('yetki-bolumu');
    if (!yer) return;
    const y = liste.find(x => x.eposta === k.eposta);
    const kendisi = y && y.sen;
    // Asil yöneticinin kaydına (ve diğer yöneticilerin kaydını silmeye) yalnızca asil yöneticiler dokunabilir.
    if (!S.asil && y && !kendisi) {
      const alt = $katman.querySelector('.cekmece-alt');
      if (y.asil) {
        if (alt) alt.innerHTML = `<p class="soluk kucuk-yazi">${ikon('kalkan', 'kucuk')} Asil yönetici: bilgilerini yalnızca kendisi ve asil yöneticiler değiştirebilir.</p>`;
        const sb = byId('sifre-bolumu'); if (sb) sb.remove();
      } else if (alt) {
        const sil = alt.querySelector('[data-ac="sil"]'); if (sil) sil.remove();
      }
    }
    const durum = y ? (y.asil ? `<span class="durum-cip yesil">${ikon('kalkan', 'kucuk')}Asil yönetici</span>` : `<span class="durum-cip turuncu">${ikon('kalkan', 'kucuk')}Yönetici</span>`)
      : `<span class="durum-cip gri">Yönetici değil</span>`;
    let eylem = '';
    if (S.asil && !kendisi) {
      if (!y && k.durum === 'onayli') eylem = `<button class="dugme ikincil kucuk" data-ac="yonetici-yap" data-id="${k.id}">${ikon('kalkan', 'kucuk')}<span>Yönetici yap</span></button>`;
      else if (y && !y.asil) eylem = `<button class="dugme tehlike-cerceve kucuk" data-ac="yonetici-kaldir" data-id="${k.id}">${ikon('kapat', 'kucuk')}<span>Yönetici yetkisini kaldır</span></button>`;
    }
    yer.innerHTML = `<h3>Yönetici yetkisi</h3>
      <div class="yetki-durumu">${durum}</div>
      <p class="soluk kucuk-yazi">${y && y.asil ? 'Asil yöneticiler diğer kişilere yönetici yetkisi verip kaldırabilir; asil yöneticinin yetkisi uygulamadan değiştirilemez.'
        : S.asil ? 'Yönetici yapılan kişi bir sonraki girişinde yönetici paneline erişir; rehberdeki kaydı aynen kalır.'
        : 'Yönetici yetkisini yalnızca asil yöneticiler verip kaldırabilir.'}</p>
      ${eylem ? `<div class="sifre-eylemleri">${eylem}</div>` : ''}`;
  }

  async function yetkiIslemi(id, ver) {
    const k = await kayitGetir(id).catch(() => null);
    if (!k) return;
    const ad = adSoyad(k);
    const soru = ver ? `${ad} yönetici yapılacak: tüm kayıtları görebilecek, başvuruları onaylayıp duyuru yayınlayabilecek. Onaylıyor musunuz?`
      : `${ad} kişisinin yönetici yetkisi kaldırılacak; oturumu hemen kapanır ve bundan sonra ${ogretmen(k) ? 'öğretmen' : 'mezun'} olarak girer.`;
    if (!await onayIste(soru, ver ? 'Yönetici yap' : 'Yetkiyi kaldır', !ver)) return;
    try {
      if (ver) await Api.yoneticiYap(id); else await Api.yoneticiKaldir(k.eposta);
      await yoneticiBilgisi(true);
      bildir(ver ? `${ad} artık yönetici.` : `${ad} kişisinin yönetici yetkisi kaldırıldı.`, 'basarili');
      yetkiBolumunuDoldur(k);
    } catch (e) { hataGoster(e); }
  }

  // Yönetici: kişinin şifresi var mı; sıfırlama ve geçici şifre verme.
  async function sifreBolumunuDoldur(k) {
    let m;
    try { m = await Api.mezun(k.id); } catch (e) { return; }
    const yer = byId('sifre-bolumu');
    if (!yer) return;
    yer.innerHTML = `<h3>Giriş şifresi</h3>
      <div class="bilgi-satiri"><span class="bilgi-ikon">${ikon('anahtar')}</span><div class="bilgi-govde">
        <span class="bilgi-deger">${m.sifreVar ? 'Şifre tanımlı' : 'Şifre yok — e-posta koduyla giriş yapıyor'}</span></div></div>
      <p class="soluk kucuk-yazi">Giriş yapamıyorsa yeni bir geçici şifre atayıp WhatsApp ile gönderebilirsiniz; varsa eski şifresi geçersiz olur ve ilk girişte kendi şifresini belirler. Kişi “Şifremi unuttum” bağlantısıyla kendisi de yenileyebilir.</p>
      <div class="sifre-eylemleri">
        <button class="dugme kucuk" data-ac="sifre-ver" data-id="${k.id}">${ikon('anahtar')}<span>Yeni şifre ata ve WhatsApp ile gönder</span></button>
        ${m.sifreVar ? `<button class="dugme ikincil kucuk" data-ac="sifre-sifirla" data-id="${k.id}">${ikon('yenile')}<span>Şifreyi kaldır (e-posta koduyla girsin)</span></button>` : ''}
      </div>`;
  }

  function geciciSifreUret() {
    const harf = 'ABCDEFGHJKLMNPRSTUVYZ', rakam = '23456789';
    const sec = (k, n) => Array.from(crypto.getRandomValues(new Uint32Array(n)), x => k[x % k.length]).join('');
    return 'OFL-' + sec(harf, 3) + sec(rakam, 4);
  }

  async function sifreIslemi(id, islem) {
    const k = await kayitGetir(id).catch(() => null);
    const ad = k ? adSoyad(k) : 'Kişi';
    if (islem === 'sifirla') {
      if (!await onayIste(`${ad} kişisinin şifresi kaldırılacak. Bir sonraki girişini e-posta koduyla yapıp yeni şifre belirleyebilecek. Kişiye bilgi e-postası gider.`, 'Şifreyi kaldır', true)) return;
      try { await Api.kullaniciSifre(id, 'sifirla'); bildir('Şifre kaldırıldı.', 'basarili'); if (k) sifreBolumunuDoldur(k); }
      catch (e) { hataGoster(e); }
      return;
    }
    const sifre = await girdiIste(`${ad} için yeni şifre`, 'Aşağıdaki geçici şifre atanacak; varsa eski şifresi geçersiz olur. Sonraki adımda WhatsApp ile gönderebilirsiniz. Kişi ilk girişte kendi şifresini belirler; şifre 7 gün geçerlidir.', geciciSifreUret());
    if (!sifre) return;
    try {
      const r = await Api.kullaniciSifre(id, 'belirle', sifre);
      if (k) sifreBolumunuDoldur(k);
      sifrePaylas({ ad: (r && r.ad) || (k && k.ad) || '', eposta: (r && r.eposta) || (k && k.eposta) || '', telefon: (r && r.telefon) || (k && k.telefon) || '' }, sifre, 'Yeni şifre atandı', 'yeni');
    } catch (e) { hataGoster(e); }
  }

  // Türkiye numaraları WhatsApp için ülke koduyla yazılır: 0532… → 90532…
  function whatsappNumarasi(tel) {
    let d = String(tel || '').replace(/\D/g, '');
    if (d.startsWith('00')) d = d.slice(2);
    if (d.length === 11 && d.startsWith('0')) d = '90' + d.slice(1);
    else if (d.length === 10 && d.startsWith('5')) d = '90' + d;
    return d.length >= 11 ? d : '';
  }

  function sifreMesaji(k, sifre, tip) {
    const giris = tip === 'yeni' ? `OFL Connect hesabınız için yeni bir geçici şifre tanımlandı. Giriş bilgileriniz:`
      : `${OFL.OKUL_ADI} mezun ağı OFL Connect kaydınız onaylandı. Giriş bilgileriniz:`;
    return `Merhaba ${k.ad || ''},\n\n${giris}\n\n` +
      `Adres: ${location.origin}${location.pathname}#/sifre\nE-posta: ${k.eposta}\nGeçici şifre: ${sifre}\n\n` +
      `Giriş ekranında "Şifre" sekmesini seçin. İlk girişte kendi şifrenizi belirlemeniz istenecek. Geçici şifre 7 gün geçerlidir.`;
  }

  // Onaydan veya geçici şifre verdikten sonra: şifreyi göster, WhatsApp ile paylaş.
  function sifrePaylas(k, sifre, baslik, tip) {
    return new Promise(coz => {
      const odak = document.activeElement;
      const no = whatsappNumarasi(k.telefon);
      const mesaj = sifreMesaji(k, sifre, tip);
      $onay.innerHTML = `<div class="perde"></div>
        <div class="diyalog genis-diyalog sifre-paylas" role="dialog" aria-modal="true" aria-label="${esc(baslik)}">
          <h3>${ikon('tamam', 'kucuk')} ${esc(baslik)}</h3>
          <p class="soluk kucuk-yazi">${esc(k.ad || 'Kişi')} için geçici şifre. İlk girişte kendi şifresini belirleyecek; şifre 7 gün geçerlidir.</p>
          <p class="bilgi-kutu uyari-kutu">${ikon('bilgi')}<span><strong>Şifre kişiye henüz gönderilmedi.</strong> “WhatsApp ile gönder”e basın, açılan WhatsApp sohbetinde de gönder okuna dokunun.</span></p>
          <div class="kopyala-alan sifre-kutu"><code>${esc(sifre)}</code>
            <button type="button" class="ikon-dugme kucuk" data-kopyala="sifre" aria-label="Şifreyi kopyala">${ikon('kopyala')}</button></div>
          ${no ? `<a class="dugme whatsapp-dugme genis" href="https://wa.me/${no}?text=${encodeURIComponent(mesaj)}" target="_blank" rel="noopener">${ikon('mesaj')}<span>WhatsApp ile gönder · ${esc(k.telefon)}</span></a>`
            : `<p class="bilgi-kutu uyari-kutu">${ikon('bilgi')}<span>Kayıtta geçerli bir telefon numarası yok. Mesajı kopyalayıp kişiye başka bir yolla iletin.</span></p>`}
          <div class="diyalog-dugmeleri">
            <button type="button" class="dugme ikincil" data-kopyala="mesaj">${ikon('kopyala')}<span>Mesajı kopyala</span></button>
            <button type="button" class="dugme ikincil" data-onay="tamam">Kapat</button>
          </div>
        </div>`;
      $onay.classList.add('acik');
      const bitir = () => {
        $onay.classList.remove('acik'); $onay.innerHTML = ''; $onay.onclick = null;
        if (odak && document.contains(odak)) odak.focus({ preventScroll: true });
        coz();
      };
      $onay.onclick = ev => {
        const kop = ev.target.closest('[data-kopyala]');
        if (kop) {
          const metin = kop.dataset.kopyala === 'sifre' ? sifre : mesaj;
          navigator.clipboard && navigator.clipboard.writeText(metin).then(() => bildir('Kopyalandı.'), () => {});
        }
        if (ev.target.closest('[data-onay="tamam"]')) bitir();
      };
      ($onay.querySelector('.whatsapp-dugme') || $onay.querySelector('[data-onay="tamam"]')).focus();
    });
  }

  // Tek alanlı küçük pencere (onay penceresi katmanında)
  function girdiIste(baslik, aciklama, varsayilan) {
    return new Promise(coz => {
      const odak = document.activeElement;
      $onay.innerHTML = `<div class="perde"></div>
        <form class="diyalog" role="dialog" aria-modal="true" aria-label="${esc(baslik)}">
          <h3>${esc(baslik)}</h3>
          <p class="soluk kucuk-yazi">${esc(aciklama)}</p>
          <div class="alan"><div class="kopyala-alan"><input name="deger" value="${esc(varsayilan)}" minlength="8" maxlength="64" autocomplete="off" spellcheck="false">
            <button type="button" class="ikon-dugme kucuk" data-kopyala aria-label="Kopyala">${ikon('kopyala')}</button></div>
            <em class="alan-hata" data-hata="deger"></em></div>
          <div class="diyalog-dugmeleri">
            <button type="button" class="dugme ikincil" data-onay="hayir">Vazgeç</button>
            <button type="submit" class="dugme">Şifreyi ata</button>
          </div>
        </form>`;
      $onay.classList.add('acik');
      const f = $onay.querySelector('form');
      f.deger.select();
      const bitir = d => {
        $onay.classList.remove('acik'); $onay.innerHTML = ''; $onay.onclick = null;
        if (odak && document.contains(odak)) odak.focus({ preventScroll: true });
        coz(d);
      };
      f.addEventListener('submit', ev => {
        ev.preventDefault();
        if (f.deger.value.trim().length < 8) { f.querySelector('[data-hata]').textContent = 'En az 8 karakter.'; return; }
        bitir(f.deger.value.trim());
      });
      $onay.onclick = ev => {
        if (ev.target.closest('[data-onay="hayir"]') || ev.target.classList.contains('perde')) bitir(null);
        if (ev.target.closest('[data-kopyala]')) {
          navigator.clipboard && navigator.clipboard.writeText(f.deger.value).then(() => bildir('Kopyalandı.'), () => {});
        }
      };
    });
  }

  async function mezunDuzenle(id, sonra) {
    let k;
    try { k = await kayitGetir(id); } catch (e) { return hataGoster(e); }
    cekmeceAc({
      etiket: 'Kişiyi düzenle', genis: true,
      bas: `<div><h2>Bilgileri düzenle</h2><p class="soluk">${esc(adSoyad(k))} · ${esc(kimlikYazisi(k))}</p></div>`,
      govde: profilFormu(k, 'admin')
    });
    turDegisiminiBagla($katman.querySelector('form'));
    formuBagla($katman.querySelector('form'), async v => {
      await Api.profilKaydet(id, v);
      bildir('Kayıt güncellendi.', 'basarili');
      if (sonra) sonra(); else yonlendir();
    });
  }

  function turDegisiminiBagla(f) {
    f.querySelectorAll('input[name="tur"]').forEach(r => r.addEventListener('change', () => {
      f.dataset.tur = f.elements.tur.value;
      if (f.elements.tur.value === 'ogretmen' && !f.elements.meslek.value) f.elements.meslek.placeholder = 'Örn. Kimya Öğretmeni';
    }));
  }

  function kullaniciEkle() {
    cekmeceAc({
      etiket: 'Kullanıcı ekle', genis: true,
      bas: `<div><h2>Kullanıcı ekle</h2><p class="soluk">Mezun veya öğretmen ekleyin. Eklenen kişi onay beklemeden e-postasıyla giriş yapabilir ve kendisine bilgi e-postası gider.</p></div>`,
      govde: profilFormu(null, 'yeni')
    });
    const f = $katman.querySelector('form');
    turDegisiminiBagla(f);
    formuBagla(f, async v => {
      const r = await Api.kullaniciEkle(v);
      const kim = v.tur === 'ogretmen' ? 'Öğretmen' : 'Mezun';
      bildir(`${kim} eklendi${r.yonetici ? ' ve yönetici yetkisi verildi' : ''}${r.bilgilendirildi ? '; bilgilendirme e-postası gönderildi' : ' (günlük e-posta sınırı dolduğu için e-posta gönderilemedi)'}.`, 'basarili');
      yonlendir();
    });
  }

  async function kayitSil(id) {
    let k;
    try { k = await kayitGetir(id); } catch (e) { return hataGoster(e); }
    if (!await onayIste(`${adSoyad(k)} kaydı ve tüm bilgileri kalıcı olarak silinecek. Bu işlem geri alınamaz.`, 'Kalıcı olarak sil', true)) return;
    try { await Api.sil(id); bildir('Kayıt silindi.', 'basarili'); yonlendir(); }
    catch (e) { hataGoster(e); }
  }

  /* =====================================================================
   * Profilim
   * ===================================================================== */

  async function profilEkrani() {
    const k = await Api.mezun(S.oturum.id);
    const gorunen = OFL.ALANLAR.filter(a => k.gorunurluk[a]).length;
    const eksik = k.tur !== 'ogretmen' && (!k.calisma || !k.universite || !k.bolum || !k.sehir || !k.telefon);
    byId('icerik').innerHTML = `
      ${sayfaBasi('Profilim', 'Bilgilerinizi güncel tutun; hangi bilginizin görüneceğine siz karar verin.')}
      ${eksik ? `<div class="bilgi-kutu uyari-kutu profil-uyari">${ikon('bilgi')}<span><strong>Profilinizde eksik bilgiler var.</strong> Rehbere çalışma durumu, kurum ve branş / uzmanlık alanları eklendi. Lütfen işaretli alanları doldurup kaydedin.</span></div>` : ''}
      <div class="profil-izgara">
        <aside class="profil-yan">
          <div class="kart profil-kart">
            ${avatar(k, 'cok-buyuk')}
            <h2>${esc(adSoyad(k))}</h2>
            <p class="soluk">${esc(kimlikYazisi(k))}</p>
            <p class="profil-guncelleme">${ikon('takvim', 'kucuk')} Son güncelleme: ${tarihYaz(k.guncelleme)}</p>
          </div>
          <div class="kart">
            <h3>Diğer kullanıcılar ne görüyor?</h3>
            <p class="soluk kucuk-yazi">${OFL.ALANLAR.length} bilginizden ${gorunen} tanesi görünür.</p>
            <ul class="gorunurluk-ozeti">
              ${OFL.ALANLAR.map(a => `<li><span>${ALAN_ADI[a]}</span>${k.gorunurluk[a]
                ? `<span class="durum-cip yesil">${ikon('goz', 'kucuk')}Görünür</span>`
                : `<span class="durum-cip gri">${ikon('gozKapali', 'kucuk')}Gizli</span>`}</li>`).join('')}
            </ul>
          </div>
          <div class="kart">
            <h3>Giriş ve şifre</h3>
            <p class="soluk kucuk-yazi">Bir giriş şifresi belirlerseniz e-posta kodu beklemeden yalnızca şifrenizle girebilirsiniz.</p>
            <button class="dugme ikincil genis" data-ac="hesap">${ikon('anahtar')}<span>Şifre ayarları</span></button>
          </div>
          <div class="kart">
            <h3>Verilerim (KVKK)</h3>
            <p class="soluk kucuk-yazi">${k.kvkkOnay ? 'Açık rıza tarihi: ' + tarihYaz(k.kvkkOnay) : 'Kayıt tarihi: ' + tarihYaz(k.kayitTarihi)}</p>
            ${k.silmeTalebi
              ? `<p class="uyari">${tarihYaz(k.silmeTalebi)} tarihinde silme talebi gönderdiniz. Talebiniz okul yönetimi tarafından işleme alınacak.</p>
                 <button class="dugme ikincil genis" data-ac="silme-talebi">Talebimi geri al</button>`
              : `<p class="soluk kucuk-yazi">Bilgilerinizin sistemden tamamen silinmesini istiyorsanız talep gönderebilirsiniz.</p>
                 <button class="dugme tehlike-cerceve genis" data-ac="silme-talebi">${ikon('cop')}<span>Silinme talebi gönder</span></button>`}
          </div>
        </aside>
        <div class="kart profil-form-kart">${profilFormu(k, 'profil')}</div>
      </div>`;
    formuBagla(document.querySelector('.profil-formu'), async v => {
      const yeni = await Api.profilKaydet(S.oturum.id, v);
      Api.oturumAdiniGuncelle(adSoyad(yeni));
      bildir('Bilgileriniz kaydedildi.', 'basarili');
      yonlendir();
    });
  }

  async function silmeTalebi() {
    const k = await Api.mezun(S.oturum.id);
    if (!k.silmeTalebi && !await onayIste('Verilerinizin silinmesi için okul yönetimine talep gönderilecek. Silme işleminden sonra sisteme giriş yapamazsınız.', 'Talep gönder', true)) return;
    try {
      const y = await Api.silmeTalebiGonder();
      bildir(y.silmeTalebi ? 'Silme talebiniz gönderildi.' : 'Silme talebiniz geri alındı.', 'basarili');
      yonlendir();
    } catch (e) { hataGoster(e); }
  }

  /* =====================================================================
   * Başvurular (yönetici)
   * ===================================================================== */

  async function basvurularEkrani() {
    const ic = byId('icerik');
    const alt = 'Yeni kayıt başvurularını inceleyip onaylayın, KVKK silme taleplerini işleyin.';
    ic.innerHTML = sayfaBasi('Başvurular', alt) + yukleniyor();
    const [bekleyen, red, silme] = await Promise.all([Api.bekleyenler(), Api.reddedilenler(), Api.silmeTalepleri()]);
    bekleyen.sort((a, b) => String(b.kayitTarihi).localeCompare(String(a.kayitTarihi)));
    red.sort((a, b) => String(b.redTarihi).localeCompare(String(a.redTarihi)));
    S.basvurular = bekleyen.concat(red, silme);
    const sekme = S.basvuruSekmesi;
    const kalanGun = k => Math.max(0, 30 - Math.floor((Date.now() - new Date(k.redTarihi)) / 864e5));

    const basvuruTablosu = (liste, red) => `
      <table class="tablo">
        <thead><tr><th scope="col">Başvuran</th><th scope="col" class="h-yil">Yıl</th><th scope="col" class="h-egitim">Üniversite / Bölüm</th>
          <th scope="col" class="h-meslek">${red ? 'Reddedilme' : 'Başvuru tarihi'}</th><th scope="col" class="h-iletisim"><span class="gorunmez">İşlem</span></th></tr></thead>
        <tbody>${liste.map(k => `
          <tr data-ac="incele" data-id="${k.id}" tabindex="0">
            <td class="h-kisi"><div class="kisi">${avatar(k)}<div class="kisi-yazi"><strong>${esc(adSoyad(k))}</strong><span class="ikincil-yazi">${esc(k.eposta)}</span><span class="mobil-ek">${k.yil} mezunu · ${tarihYaz(red ? k.redTarihi : k.kayitTarihi)}</span></div></div></td>
            <td class="h-yil"><span class="yil">${k.yil}</span></td>
            <td class="h-egitim"><span class="iki-satir">${esc(k.universite || '—')}<small>${esc(k.bolum || '')}</small></span></td>
            <td class="h-meslek">${red ? `<span class="iki-satir">${tarihYaz(k.redTarihi)}<small>${kalanGun(k)} gün sonra silinecek</small></span>` : tarihYaz(k.kayitTarihi)}</td>
            <td class="h-iletisim">${red
              ? `<button class="dugme ikincil kucuk" data-ac="onayla" data-id="${k.id}">${ikon('tamam')}<span>Onayla</span></button>`
              : `<span class="dugme ikincil kucuk">İncele${ikon('sag')}</span>`}</td>
          </tr>`).join('')}
        </tbody>
      </table>`;

    const onayTablo = bekleyen.length ? basvuruTablosu(bekleyen, false)
      : bosDurum('tamam', 'Onay bekleyen başvuru yok', 'Yeni başvurular geldiğinde burada listelenir.');
    const redTablo = red.length ? basvuruTablosu(red, true)
      : bosDurum('tamam', 'Reddedilen başvuru yok', 'Reddettiğiniz başvurular 30 gün boyunca burada durur; yanlışlıkla reddettiyseniz buradan onaylayabilirsiniz.');

    const silmeTablo = silme.length ? `
      <table class="tablo">
        <thead><tr><th scope="col">Kişi</th><th scope="col" class="h-yil">Yıl</th><th scope="col" class="h-egitim">E-posta</th>
          <th scope="col" class="h-meslek">Talep tarihi</th><th scope="col" class="h-iletisim"><span class="gorunmez">İşlem</span></th></tr></thead>
        <tbody>${silme.map(k => `
          <tr data-ac="detay" data-id="${k.id}" tabindex="0">
            <td class="h-kisi"><div class="kisi">${avatar(k)}<div class="kisi-yazi"><strong>${esc(adSoyad(k))}</strong><span class="mobil-ek">${esc(kimlikYazisi(k))} · ${tarihYaz(k.silmeTalebi)}</span></div></div></td>
            <td class="h-yil"><span class="yil">${k.yil || '—'}</span></td>
            <td class="h-egitim">${esc(k.eposta)}</td>
            <td class="h-meslek">${tarihYaz(k.silmeTalebi)}</td>
            <td class="h-iletisim"><button class="dugme tehlike-cerceve kucuk" data-ac="sil" data-id="${k.id}">${ikon('cop')}<span>Verileri sil</span></button></td>
          </tr>`).join('')}
        </tbody>
      </table>` : bosDurum('tamam', 'Bekleyen silme talebi yok', 'Kullanıcılar profil sayfasından silinme talebi gönderebilir.');

    const sekmeDugmesi = (ad, yazi, n) => `<button role="tab" class="sekme ${sekme === ad ? 'aktif' : ''}" aria-selected="${sekme === ad}" data-ac="sekme" data-sekme="${ad}">${yazi} <span class="sayac">${n}</span></button>`;
    ic.innerHTML = `
      ${sayfaBasi('Başvurular', alt)}${bildirimKarti()}
      <div class="sekmeler" role="tablist">
        ${sekmeDugmesi('onay', 'Onay bekleyenler', bekleyen.length)}${sekmeDugmesi('red', 'Reddedilenler', red.length)}${sekmeDugmesi('silme', 'Silme talepleri', silme.length)}
      </div>
      <div class="tablo-kart" role="tabpanel">${{ onay: onayTablo, red: redTablo, silme: silmeTablo }[sekme] || onayTablo}</div>
      ${sekme === 'onay' && bekleyen.length ? `<p class="not">${ikon('bilgi', 'kucuk')} Bir başvurunun tüm bilgilerini görmek için satıra tıklayın. Onaylamadan önce kişinin okulumuz mezunu olduğunu doğrulayın.</p>` : ''}
      ${sekme === 'red' ? `<p class="not">${ikon('bilgi', 'kucuk')} Reddedilen başvurular 30 gün sonra kalıcı olarak silinir. Bu sürede başvuruyu açıp onaylayabilir veya hemen silebilirsiniz. Kişi aynı e-postayla yeniden başvurabilir.</p>` : ''}`;
  }

  async function basvuruIncele(id) {
    let k;
    try { k = await kayitGetir(id); } catch (e) { return hataGoster(e); }
    const red = k.durum === 'reddedildi';
    const satir = (etiket, icerik) => `<div class="tanim-satiri"><dt>${etiket}</dt><dd>${icerik}</dd></div>`;
    const gorunurluk = a => k.gorunurluk[a]
      ? `<span class="durum-cip yesil">${ikon('goz', 'kucuk')}Görünür</span>`
      : `<span class="durum-cip gri">${ikon('gozKapali', 'kucuk')}Gizli</span>`;
    const bos = '<span class="soluk">Belirtilmemiş</span>';

    cekmeceAc({
      etiket: 'Başvuru inceleme', genis: true,
      bas: kisiBasligi(k, red ? ` · <span class="durum-cip kirmizi">Reddedildi · ${tarihYaz(k.redTarihi)}</span>` : ` · <span class="durum-cip turuncu">Onay bekliyor</span>`),
      govde: `
        ${red ? `<div class="bilgi-kutu uyari-kutu">${ikon('bilgi')}<span>Bu başvuru reddedildi. Yanlışlıkla reddettiyseniz <strong>Onayla</strong> ile geri alabilirsiniz. İşlem yapılmazsa 30 gün sonra kalıcı olarak silinir.</span></div>` : ''}
        <section class="inceleme-bolum">
          <h3>Kimlik bilgileri</h3>
          <dl class="tanim-listesi">
            ${satir('Ad', esc(k.ad))}
            ${satir('Soyad', esc(k.soyad))}
            ${satir('Mezuniyet yılı', k.yil)}
          </dl>
        </section>
        <section class="inceleme-bolum">
          <h3>Eğitim ve çalışma</h3>
          <dl class="tanim-listesi">
            ${satir('Çalışma durumu', esc(OFL.CALISMA_ADI[k.calisma] || '') || bos)}
            ${satir('Üniversite', (esc(k.universite) || bos))}
            ${satir('Bölüm', (esc(k.bolum) || bos))}
            ${k.calisma === 'calisiyor' || !k.calisma ? satir('Meslek', (esc(k.meslek) || bos)) + satir('Kurum', esc(k.kurum) || bos) + satir('Branş / uzmanlık', esc(k.brans) || bos) : ''}
          </dl>
        </section>
        <section class="inceleme-bolum">
          <h3>İletişim ve konum</h3>
          <dl class="tanim-listesi">
            ${satir('Şehir', esc(k.sehir) || bos)}
            ${satir('Telefon', esc(k.telefon) || bos)}
            ${satir('E-posta', esc(k.eposta))}
          </dl>
        </section>
        <section class="inceleme-bolum">
          <h3>Paylaşım tercihleri</h3>
          <p class="soluk kucuk-yazi">Onaylandığında diğer kullanıcıların görebileceği bilgiler:</p>
          <ul class="gorunurluk-ozeti">${OFL.ALANLAR.map(a => `<li><span>${ALAN_ADI[a]}</span>${gorunurluk(a)}</li>`).join('')}</ul>
        </section>
        <section class="inceleme-bolum rol-secimi">
          <h3>Onaylanınca rolü</h3>
          <div class="segment" role="radiogroup" aria-label="Rol">
            <label><input type="radio" name="onayTur" value="mezun" ${ogretmen(k) ? '' : 'checked'}><span>${ikon('kep', 'kucuk')} Mezun</span></label>
            <label><input type="radio" name="onayTur" value="ogretmen" ${ogretmen(k) ? 'checked' : ''}><span>${ikon('ogretmen', 'kucuk')} Öğretmen</span></label>
          </div>
          <div class="alan rol-brans" data-zorunlu ${ogretmen(k) ? '' : 'hidden'}>
            <div class="alan-bas"><label for="onay-brans">Branş <span class="zorunlu" aria-hidden="true">*</span></label></div>
            <input id="onay-brans" name="onayBrans" list="onay-brans-listesi" value="${esc(k.brans || '')}" placeholder="Örn. Kimya" maxlength="80">
            <datalist id="onay-brans-listesi">${BRANSLAR.map(b => `<option value="${b}">`).join('')}</datalist>
            <em class="alan-hata" data-hata="onayBrans"></em>
          </div>
          <p class="soluk kucuk-yazi">Öğretmen olarak kayıt olup yanlışlıkla mezun başvurusu yapanlar için “Öğretmen”i seçin.</p>
        </section>
        <section class="inceleme-bolum">
          <h3>Mezun listesi kontrolü</h3>
          <div class="liste-kontrol" data-liste-kontrol><span class="soluk kucuk-yazi">Okulun mezun listesiyle karşılaştırılıyor…</span></div>
        </section>
        <section class="inceleme-bolum giris-yontemi">
          <h3>Onaylanınca giriş</h3>
          <label class="onay-kutusu"><input type="radio" name="onayGiris" value="sifre" ${whatsappNumarasi(k.telefon) ? 'checked' : ''}>
            <span><strong>Geçici şifre oluştur, WhatsApp ile gönder</strong><small>E-posta kotası harcamaz. Kişi ilk girişte kendi şifresini belirler; şifre 7 gün geçerlidir.</small></span></label>
          <label class="onay-kutusu"><input type="radio" name="onayGiris" value="eposta" ${whatsappNumarasi(k.telefon) ? '' : 'checked'}>
            <span><strong>Yalnızca onay e-postası gönder</strong><small>Kişi e-postasına gelen kodla giriş yapar.</small></span></label>
        </section>
        <section class="inceleme-bolum">
          <h3>Başvuru ve onay</h3>
          <dl class="tanim-listesi">
            ${satir('Başvuru tarihi', tarihYaz(k.kayitTarihi))}
            ${satir('KVKK açık rıza', k.kvkkOnay ? `<span class="durum-cip yesil">${ikon('tamam', 'kucuk')}Verildi</span> ${tarihYaz(k.kvkkOnay)}` : '<span class="durum-cip gri">Yok</span>')}
          </dl>
        </section>`,
      alt: red
        ? `<button class="dugme tehlike-cerceve" data-ac="sil" data-id="${k.id}">${ikon('cop')}<span>Şimdi sil</span></button>
          <button class="dugme" data-ac="onayla" data-id="${k.id}">${ikon('tamam')}<span>Reddi geri al ve onayla</span></button>`
        : `<button class="dugme tehlike-cerceve" data-ac="reddet" data-id="${k.id}">${ikon('kapat')}<span>Reddet</span></button>
          <button class="dugme ikincil" data-ac="basvuru-duzenle" data-id="${k.id}">${ikon('kalem')}<span>Düzenle</span></button>
          <button class="dugme" data-ac="onayla" data-id="${k.id}">${ikon('tamam')}<span>Onayla</span></button>`
    });
    listeKontrolu(k.id);
    const bransAlani = $katman.querySelector('.rol-brans');
    $katman.querySelectorAll('[name="onayTur"]').forEach(r => r.addEventListener('change', () => {
      bransAlani.hidden = r.value !== 'ogretmen' || !r.checked;
      if (!bransAlani.hidden) bransAlani.querySelector('input').focus();
    }));
  }

  async function listeKontrolu(id) {
    const kutu = $katman.querySelector('[data-liste-kontrol]');
    if (!kutu) return;
    let r;
    try { r = await Api.basvuruKontrol(id); } catch (e) { r = { kaynakYok: true }; }
    if (!document.contains(kutu)) return;
    const cip = (renk, simge, yazi) => `<span class="durum-cip ${renk}">${ikon(simge, 'kucuk')}${yazi}</span>`;
    let html;
    if (r.kaynakYok) html = `<span class="soluk kucuk-yazi">Mezun listesine şu anda ulaşılamadı.</span>`;
    else if (r.listede && r.telefonEslesiyor) html = cip('yesil', 'tamam', 'Telefon mezun listesiyle eşleşiyor') + `<small class="soluk">Listede: ${esc(r.listeAd)}</small>`;
    else if (r.listede) html = cip('turuncu', 'bilgi', 'E-posta listede, telefon farklı') + `<small class="soluk">Listede: ${esc(r.listeAd)}. Şifreyi göndermeden önce kişiyi doğrulayın.</small>`;
    else if (r.telefonListedeBaskasi) html = cip('kirmizi', 'bilgi', 'Bu telefon listede başka birine ait') + `<small class="soluk">Listede: ${esc(r.telefonListedeBaskasi)}. Dikkatli olun.</small>`;
    else html = cip('gri', 'bilgi', 'Mezun listesinde yok') + `<small class="soluk">Form listesinde bulunmayan biri olabilir (ör. formu doldurmamış mezun). Tanıyorsanız onaylayabilirsiniz.</small>`;
    kutu.innerHTML = html;
  }

  // Onay çekmecesindeki rol seçimini okur; öğretmen için branş zorunludur.
  function onayRolu() {
    const secili = $katman.querySelector('[name="onayTur"]:checked');
    if (!secili) return {};
    if (secili.value !== 'ogretmen') return { tur: 'mezun' };
    const girdi = $katman.querySelector('[name="onayBrans"]');
    const brans = OFL.yaziDuzelt(girdi.value.trim());
    const hata = $katman.querySelector('[data-hata="onayBrans"]');
    hata.textContent = brans ? '' : 'Öğretmen için branş yazın.';
    if (brans) girdi.removeAttribute('aria-invalid'); else girdi.setAttribute('aria-invalid', 'true');
    if (!brans) { girdi.focus(); return null; }
    return { tur: 'ogretmen', brans };
  }

  // Red penceresi: sebep yazılır, istenirse başvurana e-postayla iletilir.
  function redSebebiIste(ad) {
    return new Promise(coz => {
      const odak = document.activeElement;
      $onay.innerHTML = `<div class="perde"></div>
        <form class="diyalog genis-diyalog" role="dialog" aria-modal="true" aria-label="Başvuruyu reddet">
          <h3>Başvuruyu reddet</h3>
          <p class="soluk kucuk-yazi">${esc(ad)} adlı kişinin başvurusu reddedilecek. Yanlışlıkla reddederseniz “Reddedilenler” sekmesinden 30 gün içinde geri alabilirsiniz.</p>
          <div class="alan">
            <label for="red-sebebi">Red sebebi</label>
            <textarea id="red-sebebi" name="sebep" rows="4" maxlength="1000" placeholder="Örn. Mezuniyet yılı okul kayıtlarımızla uyuşmuyor. Bilgilerinizi kontrol ederek yeniden başvurabilirsiniz."></textarea>
            <em class="alan-hata" data-hata="sebep"></em>
          </div>
          <label class="onay-kutusu"><input type="checkbox" name="bildir" checked><span>Red sebebini başvurana e-postayla gönder</span></label>
          <div class="diyalog-dugmeleri">
            <button type="button" class="dugme ikincil" data-onay="hayir">Vazgeç</button>
            <button type="submit" class="dugme tehlike">Reddet</button>
          </div>
        </form>`;
      $onay.classList.add('acik');
      const f = $onay.querySelector('form');
      f.sebep.focus();
      const bitir = d => {
        $onay.classList.remove('acik'); $onay.innerHTML = ''; $onay.onclick = null;
        if (odak && document.contains(odak)) odak.focus({ preventScroll: true });
        coz(d);
      };
      f.addEventListener('submit', ev => {
        ev.preventDefault();
        const sebep = f.sebep.value.trim();
        if (f.bildir.checked && sebep.length < 5) {
          f.querySelector('[data-hata="sebep"]').textContent = 'E-postayla gönderilecekse kısa bir sebep yazın.';
          return f.sebep.focus();
        }
        bitir({ sebep, bildir: f.bildir.checked });
      });
      $onay.onclick = ev => { if (ev.target.closest('[data-onay="hayir"]') || ev.target.classList.contains('perde')) bitir(null); };
    });
  }

  /* =====================================================================
   * Duyurular
   * ===================================================================== */

  const DUYURU_TURU = {
    bilgi: { ad: 'Bilgi', ikon: 'bilgi', sinif: 'mavi' },
    etkinlik: { ad: 'Etkinlik', ikon: 'takvim', sinif: 'yesil' },
    onemli: { ad: 'Önemli', ikon: 'duyuru', sinif: 'kirmizi' }
  };
  const HEDEF_ADI = { herkes: 'Herkes', mezun: 'Yalnızca mezunlar', ogretmen: 'Yalnızca öğretmenler' };
  const DURUM_ADI = { aktif: ['Yayında', 'yesil'], planli: ['Planlandı', 'turuncu'], bitti: ['Süresi doldu', 'gri'] };

  // Görülen duyurular cihazda kişi başına tutulur; bildirim penceresi her duyuru için yalnızca bir kez açılır.
  const gorulenAnahtari = () => 'ofl-duyuru-gorulen-' + S.oturum.id;
  const gorulenler = () => yerelDepo(gorulenAnahtari()) || [];
  function gorulduIsaretle(liste) {
    const aktif = new Set((S.duyurular || []).map(d => d.id));
    const yeni = [...new Set(gorulenler().filter(id => aktif.has(id)).concat(liste.map(d => d.id)))];
    yerelDepo(gorulenAnahtari(), yeni);
    duyuruRozetiniGuncelle();
  }
  const gorulmemis = () => { const g = new Set(gorulenler()); return (S.duyurular || []).filter(d => !g.has(d.id)); };

  function duyuruRozetiniGuncelle() {
    if (!S.oturum || S.oturum.rol === 'admin' || !S.duyurular) return;
    const n = gorulmemis().length;
    document.querySelectorAll('[data-duyuru-rozet]').forEach(el => { el.textContent = n; el.hidden = !n; });
  }

  async function duyuruKontrol() {
    try { S.duyurular = await Api.duyurular(); } catch (e) { return; }
    if (location.hash.replace(/^#\/?/, '') === 'duyurular') return gorulduIsaretle(S.duyurular);
    const yeni = gorulmemis();
    duyuruRozetiniGuncelle();
    if (!yeni.length || $katman.classList.contains('acik')) return;
    const gosterilen = yeni.slice(0, 3);
    cekmeceAc({
      etiket: 'Yeni duyuru', orta: true,
      bas: `<div><span class="ust-etiket">${ikon('duyuru', 'kucuk')} ${yeni.length === 1 ? 'Yeni duyuru' : yeni.length + ' yeni duyuru'}</span>
        <h2>${yeni.length === 1 ? esc(yeni[0].baslik) : 'Okul yönetiminden duyurular'}</h2></div>`,
      govde: `<div class="duyuru-listesi">${gosterilen.map(d => duyuruKarti(d, { sade: yeni.length === 1 })).join('')}</div>` +
        (yeni.length > 3 ? `<p class="not">${ikon('bilgi', 'kucuk')} ${yeni.length - 3} duyuru daha var. Tümünü Duyurular sayfasında görebilirsiniz.</p>` : ''),
      alt: `<a class="dugme ikincil" href="#/duyurular">Tüm duyurular</a><button class="dugme" data-ac="kapat">Tamam</button>`
    });
    gorulduIsaretle(yeni);
  }

  function duyuruMetni(m) {
    const bag = u => {
      const son = (u.match(/[.,;:!?)]+$/) || [''])[0];
      const adr = u.slice(0, u.length - son.length);
      return `<a href="${adr}" target="_blank" rel="noopener">${adr}</a>${son}`;
    };
    return String(m || '').split(/\n{2,}/).map(p =>
      `<p>${esc(p).replace(/https?:\/\/[^\s<]+/g, bag).replace(/\n/g, '<br>')}</p>`).join('');
  }

  function epostaDurumuYazisi(d) {
    if (!d.eposta) return '';
    const q = d.epostaDurumu;
    if (!q || !q.toplam) return 'E-posta: alıcı bulunamadı';
    if (!q.bekleyen) return `E-posta ${sayi(q.gonderilen)} kişiye gönderildi`;
    if (d.durum === 'planli') return `E-posta yayın başlayınca ${sayi(q.toplam)} kişiye gönderilecek`;
    return `E-posta ${sayi(q.gonderilen)} / ${sayi(q.toplam)} kişiye gönderildi · kalanlar günlük kota nedeniyle sırayla gidiyor`;
  }

  function duyuruKarti(d, ek) {
    ek = ek || {};
    const t = DUYURU_TURU[d.tur] || DUYURU_TURU.bilgi;
    const durum = DURUM_ADI[d.durum];
    const ust = [
      `<span class="durum-cip ${t.sinif}">${ikon(t.ikon, 'kucuk')}${t.ad}</span>`,
      ek.yeni ? '<span class="etiket">Yeni</span>' : '',
      ek.admin && durum ? `<span class="durum-cip ${durum[1]}">${durum[0]}</span>` : '',
      ek.admin ? `<span class="durum-cip gri">${ikon('kisiler', 'kucuk')}${HEDEF_ADI[d.hedef] || 'Herkes'}</span>` : ''
    ].join('');
    const eposta = ek.admin ? epostaDurumuYazisi(d) : '';
    const bildirimYazisi = ek.admin && /^\d{4}-/.test(d.bildirim || '') ? 'Telefon bildirimi gönderildi' : ek.admin && d.bildirim === 'bekliyor' ? 'Telefon bildirimi yayında gönderilecek' : '';
    return `<article class="duyuru-kart tur-${esc(d.tur)}">
      <div class="duyuru-ust">${ust}</div>
      ${ek.sade ? '' : `<h3>${esc(d.baslik)}</h3>`}
      <div class="duyuru-metin">${duyuruMetni(d.metin)}</div>
      ${d.baglantiUrl ? `<a class="dugme ikincil kucuk" href="${esc(d.baglantiUrl)}" target="_blank" rel="noopener"><span>${esc(d.baglantiMetni || 'Ayrıntılar')}</span>${ikon('dis')}</a>` : ''}
      <div class="duyuru-alt">
        <span>${ikon('takvim', 'kucuk')} ${tarihYaz(d.baslangic)}</span>
        <span>${ikon('saat', 'kucuk')} Son gün: ${tarihYaz(d.bitis)}</span>
        ${eposta ? `<span>${ikon('eposta', 'kucuk')} ${eposta}</span>` : ''}
        ${bildirimYazisi ? `<span>${ikon('zil', 'kucuk')} ${bildirimYazisi}</span>` : ''}
        ${ek.admin ? `<span class="duyuru-eylem">
          <button class="dugme ikincil kucuk" data-ac="duyuru-duzenle" data-id="${esc(d.id)}">${ikon('kalem')}<span>Düzenle</span></button>
          <button class="dugme tehlike-cerceve kucuk" data-ac="duyuru-sil" data-id="${esc(d.id)}">${ikon('cop')}<span>Sil</span></button></span>` : ''}
      </div>
    </article>`;
  }

  async function duyurularEkrani() {
    const admin = S.oturum.rol === 'admin';
    const ic = byId('icerik');
    const alt = admin ? 'Duyuru hazırlayın, yayın süresini belirleyin, önemli olanları e-postayla da gönderin.' : 'Okul yönetiminden güncel duyurular';
    ic.innerHTML = sayfaBasi('Duyurular', alt) + yukleniyor();
    const liste = await Api.duyurular();

    if (!admin) {
      S.duyurular = liste;
      const onceki = new Set(gorulenler());
      ic.innerHTML = sayfaBasi('Duyurular', alt) + bildirimKarti() + (liste.length
        ? `<div class="duyuru-listesi">${liste.map(d => duyuruKarti(d, { yeni: !onceki.has(d.id) })).join('')}</div>`
        : `<div class="kart">${bosDurum('duyuru', 'Şu anda yayında duyuru yok', 'Yeni duyurular yayınlandığında burada görünür.')}</div>`);
      gorulduIsaretle(liste);
      return;
    }

    const gruplar = { aktif: [], planli: [], bitti: [] };
    liste.forEach(d => (gruplar[d.durum] || gruplar.bitti).push(d));
    gruplar.planli.sort((a, b) => String(a.baslangic).localeCompare(String(b.baslangic)));
    gruplar.bitti.sort((a, b) => String(b.bitis).localeCompare(String(a.bitis)));
    const sekme = S.duyuruSekmesi in gruplar ? S.duyuruSekmesi : 'aktif';
    const sekmeDugmesi = (ad, yazi) => `<button role="tab" class="sekme ${sekme === ad ? 'aktif' : ''}" aria-selected="${sekme === ad}" data-ac="duyuru-sekme" data-sekme="${ad}">${yazi} <span class="sayac">${gruplar[ad].length}</span></button>`;
    const bos = {
      aktif: bosDurum('duyuru', 'Yayında duyuru yok', 'Yeni bir duyuru hazırlayarak mezunlara ve öğretmenlere ulaşın.'),
      planli: bosDurum('takvim', 'Planlanmış duyuru yok', 'Başlangıcı ileri bir tarihe ayarlanan duyurular burada bekler.'),
      bitti: bosDurum('saat', 'Süresi dolan duyuru yok', 'Bitiş tarihi geçen duyurular kullanıcıların ekranından otomatik kaldırılır ve burada arşivlenir.')
    }[sekme];

    ic.innerHTML = `
      ${sayfaBasi('Duyurular', alt, `<button class="dugme" data-ac="duyuru-yeni">${ikon('arti')}<span>Yeni duyuru</span></button>`)}
      <div class="sekmeler" role="tablist">
        ${sekmeDugmesi('aktif', 'Yayında')}${sekmeDugmesi('planli', 'Planlanan')}${sekmeDugmesi('bitti', 'Süresi dolan')}
      </div>
      ${gruplar[sekme].length
        ? `<div class="duyuru-listesi">${gruplar[sekme].map(d => duyuruKarti(d, { admin: true })).join('')}</div>`
        : `<div class="kart">${bos}</div>`}
      ${sekme === 'bitti' && gruplar.bitti.length ? `<p class="not">${ikon('bilgi', 'kucuk')} Bu duyurular kullanıcıların ekranından otomatik kaldırıldı; yalnızca siz görüyorsunuz. Bitiş tarihini ileri alarak yeniden yayınlayabilirsiniz.</p>` : ''}`;
  }

  async function duyuruEditoru(id) {
    let d = null;
    if (id) {
      try { d = (await Api.duyurular()).find(x => x.id === id); } catch (e) { return hataGoster(e); }
      if (!d) return bildir('Duyuru bulunamadı.', 'hata');
    }
    const simdi = new Date();
    const bas = d ? new Date(d.baslangic) : simdi;
    const bit = d ? new Date(d.bitis) : new Date(simdi.getTime() + 7 * 864e5);
    const tur = d ? d.tur : 'bilgi';
    const hedef = d ? d.hedef : 'herkes';
    const epostaGitti = d && d.eposta;
    const radyo = (ad, deger, secili, yazi) => `<label><input type="radio" name="${ad}" value="${deger}" ${secili === deger ? 'checked' : ''}><span>${yazi}</span></label>`;
    const hata = ad => `<em class="alan-hata" data-hata="${ad}"></em>`;

    cekmeceAc({
      etiket: d ? 'Duyuruyu düzenle' : 'Yeni duyuru', genis: true,
      bas: `<div><h2>${d ? 'Duyuruyu düzenle' : 'Yeni duyuru'}</h2><p class="soluk">Duyuru, yayın aralığında mezunlara ve öğretmenlere gösterilir; süresi dolunca otomatik kaldırılır.</p></div>`,
      govde: `<div class="duyuru-duzen">
        <form class="form duyuru-formu" id="duyuru-formu" novalidate>
          <fieldset class="form-bolum">
            <legend>İçerik</legend>
            <div class="alan"><label>Tür</label>
              <div class="segment">${Object.entries(DUYURU_TURU).map(([k, t]) => radyo('tur', k, tur, ikon(t.ikon, 'kucuk') + ' ' + t.ad)).join('')}</div>
            </div>
            <div class="alan"><label for="d-baslik">Başlık <span class="zorunlu" aria-hidden="true">*</span></label>
              <input id="d-baslik" name="baslik" maxlength="120" value="${esc(d ? d.baslik : '')}" placeholder="Örn. Mezunlar Buluşması 2026" required>${hata('baslik')}</div>
            <div class="alan"><label for="d-metin">Duyuru metni <span class="zorunlu" aria-hidden="true">*</span></label>
              <textarea id="d-metin" name="metin" rows="7" maxlength="4000" placeholder="Duyurunuzu yazın. Boş bir satır yeni paragraf başlatır; web adresleri tıklanabilir olur." required>${esc(d ? d.metin : '')}</textarea>
              <small class="alan-ipucu"><span data-sayac>0</span> / 4000 karakter</small>${hata('metin')}</div>
            <div class="alan-izgara">
              <div class="alan"><label for="d-url">Bağlantı <span class="soluk">(isteğe bağlı)</span></label>
                <input id="d-url" name="baglantiUrl" type="url" inputmode="url" value="${esc(d ? d.baglantiUrl : '')}" placeholder="https://…">${hata('baglantiUrl')}</div>
              <div class="alan"><label for="d-url-metin">Bağlantı düğmesinin yazısı</label>
                <input id="d-url-metin" name="baglantiMetni" maxlength="40" value="${esc(d ? d.baglantiMetni : '')}" placeholder="Örn. Katılım formu"></div>
            </div>
          </fieldset>
          <fieldset class="form-bolum">
            <legend>Kime ve ne zaman</legend>
            <div class="alan"><label>Hedef kitle</label>
              <div class="segment">${Object.entries(HEDEF_ADI).map(([k, a]) => radyo('hedef', k, hedef, a)).join('')}</div>
            </div>
            <div class="alan-izgara">
              <div class="alan"><label for="d-bas">Yayın başlangıcı</label>
                <input id="d-bas" name="baslangic" type="datetime-local" value="${yerelGirdi(bas)}" required>${hata('baslangic')}</div>
              <div class="alan"><label for="d-bit">Yayın bitişi</label>
                <input id="d-bit" name="bitis" type="datetime-local" value="${yerelGirdi(bit)}" required>${hata('bitis')}</div>
            </div>
            <div class="sure-cipleri" role="group" aria-label="Geçerlilik süresi">
              <span class="soluk kucuk-yazi">Geçerlilik süresi:</span>
              ${[[1, '1 gün'], [3, '3 gün'], [7, '1 hafta'], [14, '2 hafta'], [30, '1 ay'], [90, '3 ay']].map(([g, y]) => `<button type="button" class="cip" data-sure="${g}">${y}</button>`).join('')}
            </div>
            <p class="alan-ipucu" data-sure-ozet></p>
          </fieldset>
          <fieldset class="form-bolum">
            <legend>Bildirim ve e-posta</legend>
            <label class="onay-kutusu">
              <input type="checkbox" name="bildirim" ${d && /^\d{4}-/.test(d.bildirim || '') ? 'checked disabled' : d && d.bildirim === 'yok' ? '' : 'checked'}>
              <span><strong>${d && /^\d{4}-/.test(d.bildirim || '') ? 'Telefon bildirimi gönderildi' : 'Telefonlara bildirim gönder'}</strong>
                <small>Bildirimleri açmış mezun ve öğretmenlerin telefonuna “Yeni duyuru” bildirimi düşer. Yayın ileri bir tarihteyse bildirim yayın başlayınca gider.</small></span>
            </label>
            <label class="onay-kutusu">
              <input type="checkbox" name="eposta" ${epostaGitti ? 'checked disabled' : ''}>
              <span><strong>${epostaGitti ? 'E-posta gönderimi başlatıldı' : 'Önemli: e-postayla da gönder'}</strong>
                <small>${epostaGitti ? esc(epostaDurumuYazisi(d)) + '.' : 'Duyuru, hedef kitledeki herkesin e-posta adresine de gider.'}
                Ücretsiz Google hesabı günde yaklaşık 100 e-posta gönderebilir; e-postalar 45 kişilik gruplar halinde gizli alıcı (BCC) olarak gider, kota dolarsa kalanlar ertesi gün otomatik gönderilir. Yayın ileri bir tarihteyse e-posta yayın başlayınca gider.</small></span>
            </label>
          </fieldset>
        </form>
        <aside class="duyuru-onizleme" aria-label="Önizleme">
          <h3 class="bolum-baslik">Önizleme</h3>
          <p class="soluk kucuk-yazi">Mezun ve öğretmenler duyuruyu böyle görür.</p>
          <div data-onizleme></div>
        </aside>
      </div>`,
      alt: `<button class="dugme ikincil" type="button" data-ac="kapat">Vazgeç</button>
        <button class="dugme" type="submit" form="duyuru-formu">${ikon(d ? 'tamam' : 'duyuru')}<span>${d ? 'Değişiklikleri kaydet' : 'Duyuruyu yayınla'}</span></button>`
    });

    const f = $katman.querySelector('.duyuru-formu');
    const zaman = v => { const t = new Date(v); return isNaN(t) ? '' : t.toISOString(); };
    const topla = () => ({
      id: d ? d.id : '',
      baslik: f.baslik.value, metin: f.metin.value, tur: f.tur.value, hedef: f.hedef.value,
      baglantiUrl: f.baglantiUrl.value.trim(), baglantiMetni: f.baglantiMetni.value,
      baslangic: zaman(f.baslangic.value), bitis: zaman(f.bitis.value),
      eposta: f.eposta.checked && !epostaGitti,
      bildirim: f.bildirim.checked
    });
    const guncelle = () => {
      const v = topla();
      $katman.querySelector('[data-sayac]').textContent = sayi(f.metin.value.length);
      $katman.querySelector('[data-onizleme]').innerHTML = duyuruKarti({
        tur: v.tur, baslik: v.baslik || 'Duyuru başlığı', metin: v.metin || 'Duyuru metni burada görünecek.',
        baglantiUrl: /^https?:\/\//i.test(v.baglantiUrl) ? v.baglantiUrl : '', baglantiMetni: v.baglantiMetni,
        baslangic: v.baslangic, bitis: v.bitis
      });
      const b = new Date(f.baslangic.value), s = new Date(f.bitis.value);
      const gun = (s - b) / 864e5;
      $katman.querySelectorAll('[data-sure]').forEach(c => c.classList.toggle('aktif', Math.abs(gun - c.dataset.sure) < 0.01));
      $katman.querySelector('[data-sure-ozet]').textContent = isNaN(gun) ? '' : gun <= 0
        ? 'Bitiş, başlangıçtan sonra olmalıdır.'
        : `Duyuru ${tarihSaat(b)} – ${tarihSaat(s)} arasında yayında kalır (${gun >= 1 ? Math.round(gun) + ' gün' : Math.round(gun * 24) + ' saat'}).`;
    };
    f.addEventListener('input', guncelle);
    f.addEventListener('change', guncelle);
    $katman.querySelectorAll('[data-sure]').forEach(c => c.addEventListener('click', () => {
      let b = new Date(f.baslangic.value);
      if (isNaN(b)) { b = new Date(); f.baslangic.value = yerelGirdi(b); }
      f.bitis.value = yerelGirdi(b.getTime() + c.dataset.sure * 864e5);
      guncelle();
    }));
    guncelle();

    formuBagla(f, async v => {
      if (v.eposta && !await onayIste(`Duyuru, “${HEDEF_ADI[v.hedef]}” kitlesindeki herkese e-postayla da gönderilecek. Bu işlem geri alınamaz.`, 'Yayınla ve gönder')) return;
      const r = await Api.duyuruKaydet(v);
      bildir(d ? 'Duyuru güncellendi.' : r.durum === 'planli' ? 'Duyuru planlandı; başlangıç tarihinde yayına girecek.' : 'Duyuru yayınlandı.', 'basarili');
      S.duyuruSekmesi = r.durum;
      git('#/duyurular');
    }, topla);
  }

  async function duyuruSil(id) {
    if (!await onayIste('Duyuru kalıcı olarak silinecek ve kullanıcıların ekranından kaldırılacak. Henüz gönderilmemiş e-postalar iptal edilir.', 'Duyuruyu sil', true)) return;
    try { await Api.duyuruSil(id); bildir('Duyuru silindi.', 'basarili'); yonlendir(); }
    catch (e) { hataGoster(e); }
  }

  /* =====================================================================
   * Açılış sırası: uygulama açılınca gösterilecek pencereler sırayla açılır
   * (biri kapanınca sıradaki gelir; hiçbiri her açılışta tekrar etmez).
   * ===================================================================== */

  async function siraIsle(adimlar) {
    while (adimlar.length) {
      const adim = adimlar.shift();
      let acildi = false;
      try { acildi = await adim(); } catch (e) { console.warn(e); }
      if (acildi) { S.kapaninca = () => siraIsle(adimlar); return; }
    }
  }

  async function acilisIslemleri() {
    const uye = S.oturum.rol !== 'admin';
    if (!uye) yoneticiBilgisi(true).catch(() => {});
    nabizBaslat();
    pushSessizYenile();
    siraIsle([
      async () => {
        // Sayfa yenilense de geçici şifreyle girenin kendi şifresini belirlemesi zorunlu kalır (sunucudan kontrol).
        if (!S.sifreDegistir && !S.yeniGiris) { try { S.sifreDegistir = !!(await Api.hesabim()).degistirmeli; } catch (e) { /* çevrimdışı */ } }
        S.yeniGiris = false;
        return S.sifreDegistir ? (S.sifreDegistir = false, zorunluSifreDegistir(), true) : false;
      },
      () => kurulumRehberi(false),
      () => S.sifreOner ? (S.sifreOner = false, sifreOnerisi(), true) : false,
      () => uye ? profilTamamlaHatirlat() : false,
      () => bildirimTeklifi(),
      () => uye ? duyuruKontrol().then(() => false) : false
    ]);
  }

  // Yöneticinin verdiği geçici şifreyle girildiyse kendi şifresini belirlemeden devam edemez.
  function zorunluSifreDegistir() {
    cekmeceAc({
      etiket: 'Yeni şifre belirleyin', orta: true, zorunlu: true,
      bas: `<div><span class="ust-etiket">${ikon('anahtar', 'kucuk')} Güvenlik</span><h2>Kendi şifrenizi belirleyin</h2>
        <p class="soluk">Okul yönetiminin verdiği geçici şifreyle giriş yaptınız. Devam etmek için yalnızca sizin bileceğiniz yeni bir şifre belirleyin.</p></div>`,
      govde: sifreFormu(false),
      alt: `<button class="dugme" data-sifre-kaydet>${ikon('tamam')}<span>Şifremi kaydet</span></button>`
    });
    sifreFormunuBagla((Api.hesap() || {}).eposta, () => { bildir('Şifreniz kaydedildi.', 'basarili'); cekmeceKapat('zorla'); });
  }

  // Eski sürümde kaydolup çalışma durumu/bölüm bilgisi eksik olan mezunlara bir kez (oturum başına) hatırlatma.
  async function profilTamamlaHatirlat() {
    if (S.oturum.rol !== 'mezun' || location.hash.replace(/^#\/?/, '') === 'profil') return false;
    const anahtar = 'ofl-profil-hatirlatma';
    try { if (sessionStorage.getItem(anahtar)) return false; sessionStorage.setItem(anahtar, '1'); } catch (e) { /* yok say */ }
    const k = S.liste.find(x => x.kendisi) || await Api.mezun(S.oturum.id);
    const eksik = !k.calisma || !k.universite || !k.bolum || !k.sehir || !k.telefon || (k.calisma === 'calisiyor' && (!k.meslek || !k.kurum || !k.brans));
    if (!eksik) return false;
    cekmeceAc({
      etiket: 'Profilinizi tamamlayın', orta: true,
      bas: `<div><span class="ust-etiket">${ikon('kisi', 'kucuk')} Profil</span><h2>Profilinizi tamamlayın</h2></div>`,
      govde: `<p>Rehbere yeni bilgiler eklendi: <strong>çalışma durumu</strong> (çalışıyor, üniversite öğrencisi, çalışmıyor), <strong>çalıştığınız kurum</strong> ve <strong>branş / uzmanlık alanınız</strong>.</p>
        <p class="soluk">Bilgileriniz eksik olduğu için diğer mezunlar sizi aramalarda bulmakta zorlanabilir. Bir dakikanızı ayırıp profilinizi güncelleyin; hangi bilginin görüneceğine yine siz karar verirsiniz.</p>`,
      alt: `<button class="dugme ikincil" data-ac="kapat">Daha sonra</button><a class="dugme" href="#/profil">${ikon('kalem')}<span>Profilimi güncelle</span></a>`
    });
    return true;
  }

  // Uygulama açıkken birkaç dakikada bir "buradayım" sinyali (yöneticinin çevrimiçi görmesi için).
  function nabizBaslat() {
    clearInterval(S.nabizZamanlayici);
    if (S.oturum.rol === 'admin') return;
    const at = () => { if (!document.hidden && Api.oturum()) Api.nabiz().catch(() => {}); };
    at();
    S.nabizZamanlayici = setInterval(at, 120000);
  }
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && S.oturum && S.oturum.rol !== 'admin' && Api.oturum()) Api.nabiz().catch(() => {});
  });

  /* =====================================================================
   * Telefon bildirimleri (duyuru yayınlanınca)
   * ===================================================================== */

  const pushDestekli = () => !DEMO && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

  function anahtarBaytlari(b64) {
    const s = atob((b64 + '==='.slice((b64.length + 3) % 4)).replace(/-/g, '+').replace(/_/g, '/'));
    return Uint8Array.from(s, c => c.charCodeAt(0));
  }

  async function pushAboneOl() {
    const kayit = await navigator.serviceWorker.ready;
    let abone = await kayit.pushManager.getSubscription();
    if (!abone) {
      const anahtar = await Api.pushAnahtari();
      abone = await kayit.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: anahtarBaytlari(anahtar) });
    }
    await Api.pushKaydet(abone.endpoint);
    return abone;
  }

  // İzin daha önce verildiyse aboneliği sessizce sunucuya bildirir (cihaz/oturum değişmiş olabilir).
  async function pushSessizYenile() {
    if (!pushDestekli() || Notification.permission !== 'granted') return;
    try { await pushAboneOl(); } catch (e) { console.warn('Bildirim aboneliği yenilenemedi', e); }
  }

  async function bildirimleriAc(dugme) {
    if (!pushDestekli()) return bildir(DEMO ? 'Demo sürümünde telefon bildirimi yoktur.' : 'Bu tarayıcı bildirimleri desteklemiyor.', 'hata');
    const c = cihaz();
    if (c.ios && !KURULU()) return kurulumRehberi(true, 'iPhone\'da bildirim alabilmek için önce OFL Connect\'i ana ekranınıza eklemelisiniz.');
    if (dugme) dugme.disabled = true;
    try {
      const izin = await Notification.requestPermission();
      if (izin !== 'granted') {
        bildir(izin === 'denied' ? 'Bildirim izni reddedildi. Telefon ayarlarından OFL Connect için bildirimlere izin verebilirsiniz.' : 'Bildirim izni verilmedi.', 'hata');
        return;
      }
      await pushAboneOl();
      bildir('Bildirimler açıldı. Yeni duyurular telefonunuza gelecek.', 'basarili');
      if ($katman.classList.contains('acik') && $katman.querySelector('[data-bildirim-teklifi]')) cekmeceKapat();
      const kart = byId('bildirim-karti');
      if (kart) kart.outerHTML = bildirimKarti();
    } catch (e) { hataGoster(e); } finally { if (dugme && document.contains(dugme)) dugme.disabled = false; }
  }

  async function bildirimAboneliginiKaldir() {
    if (!pushDestekli()) return;
    try {
      const kayit = await navigator.serviceWorker.getRegistration();
      const abone = kayit && await kayit.pushManager.getSubscription();
      if (abone) { await Api.pushSil(abone.endpoint).catch(() => {}); await abone.unsubscribe(); }
    } catch (e) { /* yok say */ }
  }

  function bildirimDurumu() {
    if (!pushDestekli()) return 'yok';
    if (cihaz().ios && !KURULU()) return 'kurulum';
    return Notification.permission; // granted | denied | default
  }

  // Duyurular sayfasının üstündeki küçük bilgi kartı
  function bildirimKarti() {
    const d = bildirimDurumu();
    const admin = S.oturum && S.oturum.rol === 'admin';
    if (d === 'yok' || d === 'granted') return d === 'granted'
      ? `<div class="bildirim-karti acik" id="bildirim-karti">${ikon('zil')}<span><strong>Telefon bildirimleri açık.</strong> ${admin
        ? 'Yeni başvurular ve duyurular bu cihaza bildirim olarak gelir. Bildirimde ayrıntı görünmesi için girişte “oturumum açık kalsın” seçili olmalı.'
        : 'Yeni duyurular bu cihaza bildirim olarak gelir.'}</span></div>` : '';
    const metin = {
      kurulum: admin ? 'Yeni başvuruları telefon bildirimi olarak almak için önce OFL Connect\'i ana ekranınıza ekleyin.'
        : 'Duyuruları telefon bildirimi olarak almak için önce OFL Connect\'i ana ekranınıza ekleyin.',
      denied: 'Bildirim izni kapalı. Telefonunuzun ayarlarından OFL Connect (veya tarayıcınız) için bildirimlere izin verin.',
      default: admin ? 'Yeni bir başvuru geldiğinde haberiniz olsun: bu cihazda telefon bildirimlerini açın.'
        : 'Yeni duyuruları kaçırmamak için telefon bildirimlerini açın.'
    }[d];
    const dugme = d === 'kurulum' ? `<button class="dugme kucuk" data-ac="kurulum-rehberi">${ikon('oynat', 'kucuk')}<span>Nasıl eklenir?</span></button>`
      : d === 'default' ? `<button class="dugme kucuk" data-ac="bildirim-ac">${ikon('zil', 'kucuk')}<span>Bildirimleri aç</span></button>` : '';
    return `<div class="bildirim-karti" id="bildirim-karti">${ikon('zil')}<span>${metin}</span>${dugme}</div>`;
  }

  function bildirimTeklifi() {
    if (bildirimDurumu() !== 'default') return false;
    if (!cihaz().mobil && !KURULU()) return false;
    const son = yerelDepo('ofl-bildirim-teklifi');
    if (son && Date.now() - son < 7 * 864e5) return false;
    yerelDepo('ofl-bildirim-teklifi', Date.now());
    cekmeceAc({
      etiket: 'Duyuru bildirimleri', orta: true,
      bas: `<div data-bildirim-teklifi><span class="ust-etiket">${ikon('zil', 'kucuk')} Bildirimler</span><h2>${S.oturum.rol === 'admin' ? 'Yeni başvurular telefonunuza gelsin mi?' : 'Duyurular telefonunuza gelsin mi?'}</h2></div>`,
      govde: S.oturum.rol === 'admin'
        ? `<p>Yeni bir kayıt başvurusu onay beklediğinde ve duyuru yayınlandığında bu cihaza bildirim gelsin. İstediğiniz zaman kapatabilirsiniz.</p>`
        : `<p>Okul yönetimi yeni bir duyuru yayınladığında telefonunuza bildirim gelsin. Bildirimler yalnızca duyurular içindir; istediğiniz zaman kapatabilirsiniz.</p>`,
      alt: `<button class="dugme ikincil" data-ac="kapat">Şimdi değil</button><button class="dugme" data-ac="bildirim-ac">${ikon('zil')}<span>Bildirimleri aç</span></button>`
    });
    return true;
  }

  /* =====================================================================
   * Telefona kurulum rehberi (yazılı adımlı, animasyonlu anlatım)
   * ===================================================================== */

  function cihaz() {
    const ua = navigator.userAgent;
    const ios = /iPhone|iPad|iPod/i.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
    const android = /Android/i.test(ua);
    const tarayici = ios ? (/CriOS/.test(ua) ? 'chrome' : /FxiOS/.test(ua) ? 'firefox' : 'safari')
      : /SamsungBrowser/.test(ua) ? 'samsung' : /Chrome/.test(ua) ? 'chrome' : 'diger';
    return { ios, android, mobil: ios || android, tarayici };
  }

  const REHBER = {
    giris: { baslik: 'Uygulamayı ana ekrana ekleyin', yazi: 'OFL Connect\'i telefonunuza uygulama olarak eklemek bir dakikadan kısa sürer. Adımları birlikte izleyelim.' },
    ios: [
      { baslik: 'Paylaş simgesine dokunun', yazi: 'Safari\'de alt çubuktaki Paylaş simgesine (yukarı ok olan kare) dokunun. Yeni iPhone\'larda önce sağ alttaki üç noktaya dokunmanız gerekebilir.' },
      { baslik: '“Ana Ekrana Ekle”yi seçin', yazi: 'Açılan menüyü biraz yukarı kaydırın ve “Ana Ekrana Ekle” satırına dokunun.' },
      { baslik: '“Ekle”ye dokunun', yazi: 'Sağ üst köşedeki “Ekle” düğmesine dokunun.' }
    ],
    android: [
      { baslik: 'Menüyü açın', yazi: 'Tarayıcının sağ üst köşesindeki üç noktaya (⋮) dokunun.' },
      { baslik: '“Uygulamayı yükle”yi seçin', yazi: 'Menüde “Uygulamayı yükle” ya da “Ana ekrana ekle” seçeneğine dokunun.' },
      { baslik: '“Yükle”ye dokunun', yazi: 'Çıkan pencerede “Yükle” düğmesine dokunun.' }
    ],
    son: { baslik: 'Hepsi bu kadar!', yazi: 'Ana ekranınızdaki OFL Connect simgesine dokunarak uygulamayı açın. Bir kez giriş yapın ve “oturumum açık kalsın” kutusunu işaretleyin.' }
  };

  function telefonCizimi(c) {
    const ios = c.ios;
    const iosChrome = ios && c.tarayici === 'chrome';
    return `<div class="telefon ${ios ? 'ios' : 'android'} ${iosChrome ? 'ios-chrome' : ''}" data-adim="0" aria-hidden="true">
      <div class="telefon-ekran">
        <div class="t-durum"><span>9:41</span><span class="t-cubuklar"></span></div>
        <div class="t-adres">${ios && !iosChrome ? '' : '<span class="t-ust-ikon t-paylas-ust"></span>'}<span class="t-url">oflmezun-svg.github.io</span>${ios ? '' : '<span class="t-uc-nokta hedef-1"><i></i><i></i><i></i></span>'}${iosChrome ? '<span class="t-paylas-kucuk hedef-1"></span>' : ''}</div>
        <div class="t-sayfa">
          <img src="icons/ofl-logo.png" alt="" class="t-logo">
          <span class="t-cizgi uzun"></span><span class="t-cizgi"></span><span class="t-cizgi kisa"></span>
          <span class="t-buton"></span>
        </div>
        ${ios && !iosChrome ? `<div class="t-alt-cubuk"><span class="t-ok"></span><span class="t-ok sag"></span><span class="t-paylas hedef-1"></span><span class="t-kitap"></span><span class="t-sekme"></span></div>` : ''}
        <div class="t-katman t-menu">
          ${ios ? `<div class="t-sayfa-baslik"><img src="icons/ofl-logo.png" alt=""><span>OFL Connect</span></div>
            <div class="t-menu-ogesi">Kopyala</div><div class="t-menu-ogesi">Yer İşareti Ekle</div><div class="t-menu-ogesi">Okuma Listesine Ekle</div>
            <div class="t-menu-ogesi hedef-2">Ana Ekrana Ekle <span class="t-artı">＋</span></div>`
          : `<div class="t-menu-ogesi">Yeni sekme</div><div class="t-menu-ogesi">Geçmiş</div><div class="t-menu-ogesi">İndirilenler</div>
            <div class="t-menu-ogesi hedef-2">Uygulamayı yükle</div><div class="t-menu-ogesi">Ayarlar</div>`}
        </div>
        <div class="t-katman t-diyalog">
          ${ios ? `<div class="t-diyalog-bas"><span>İptal</span><strong>Ana Ekrana Ekle</strong><span class="hedef-3">Ekle</span></div>
            <div class="t-diyalog-ic"><img src="icons/apple-touch-icon.png" alt=""><div><strong>OFL Connect</strong><small>oflmezun-svg.github.io</small></div></div>`
          : `<div class="t-diyalog-ic dikey"><img src="icons/icon-192.png" alt=""><strong>Uygulama yüklensin mi?</strong><small>OFL Connect</small>
            <div class="t-diyalog-dugmeler"><span>İptal</span><span class="hedef-3">Yükle</span></div></div>`}
        </div>
        <div class="t-katman t-ana-ekran">
          ${Array.from({ length: 11 }, () => '<span class="t-uygulama"></span>').join('')}
          <span class="t-uygulama ofl hedef-4"><img src="icons/icon-192.png" alt=""><small>OFL Connect</small></span>
        </div>
      </div>
      <span class="t-parmak"></span>
    </div>`;
  }

  // zorla: kullanıcı kendisi açtıysa her durumda gösterilir; değilse telefonda, uygulama yüklü değilken ve 3 günde bir.
  function kurulumRehberi(zorla, ustMesaj) {
    const c = cihaz();
    if (!zorla) {
      if (!c.mobil || KURULU()) return false;
      const son = yerelDepo('ofl-kurulum-rehberi');
      if (son === 'asla' || (son && Date.now() - son < 3 * 864e5)) return false;
    }
    yerelDepo('ofl-kurulum-rehberi', Date.now());
    const platform = c.ios ? 'ios' : 'android';
    const adimlar = [REHBER.giris, ...REHBER[platform], REHBER.son];
    const tekDokunus = !c.ios && S.kurulumOlayi;
    const adimSayisi = adimlar.length - 2;
    cekmeceAc({
      etiket: 'Uygulamayı telefona ekleme rehberi', orta: true, genis: true,
      bas: `<div><span class="ust-etiket">${ikon('oynat', 'kucuk')} Video rehber · ${c.ios ? 'iPhone' : 'Android'}</span>
        <h2>OFL Connect'i ana ekranınıza ekleyin</h2>
        ${ustMesaj ? `<p class="soluk">${esc(ustMesaj)}</p>` : ''}</div>`,
      govde: `
        ${tekDokunus ? `<div class="tek-dokunus">${ikon('yukle')}<span><strong>Kısa yol:</strong> Telefonunuz tek dokunuşla yüklemeyi destekliyor.</span><button class="dugme" data-ac="kur">${ikon('yukle')}<span>Şimdi yükle</span></button></div>` : ''}
        <div class="rehber-oynatici" data-platform="${platform}">
          <div class="rehber-video">
            <div class="video-yazi" aria-live="polite">
              <span class="video-adim"></span>
              <strong class="video-baslik"></strong>
              <span class="video-aciklama"></span>
            </div>
            <div class="rehber-sahne">${telefonCizimi(c)}</div>
            <div class="rehber-kontrol">
              <button class="ikon-dugme video-dugme" data-rehber="oynat" aria-label="Duraklat">${ikon('duraklat')}</button>
              <div class="rehber-ilerleme" aria-hidden="true">${adimlar.map(() => '<span><i></i></span>').join('')}</div>
              <button class="ikon-dugme video-dugme" data-rehber="geri" aria-label="Önceki adım">${ikon('sol')}</button>
              <button class="ikon-dugme video-dugme" data-rehber="ileri" aria-label="Sonraki adım">${ikon('sag')}</button>
            </div>
          </div>
          <ol class="rehber-adimlari" aria-label="Adımlar">${adimlar.map((a, i) => `<li data-i="${i}">
            <span class="rehber-no">${i === 0 ? ikon('oynat', 'kucuk') : i === adimlar.length - 1 ? ikon('tamam', 'kucuk') : i}</span>
            <span><strong>${esc(a.baslik)}</strong><small>${esc(a.yazi)}</small></span></li>`).join('')}</ol>
          <p class="rehber-not soluk kucuk-yazi">${ikon('bilgi', 'kucuk')} Toplam ${adimSayisi} adım. Bir adıma dokunarak oraya geçebilir, kendi hızınızda ilerleyebilirsiniz.</p>
        </div>`,
      alt: `<button class="dugme metin" data-rehber="asla">Bir daha gösterme</button><button class="dugme ikincil" data-ac="kapat">Kapat</button>`
    });
    rehberOynaticisi($katman.querySelector('.rehber-oynatici'), adimlar, adimSayisi);
    return true;
  }

  // Sessiz, yazılı adımlı "video": adımlar kendiliğinden ilerler; duraklatılabilir, ileri-geri alınabilir.
  function rehberOynaticisi(kok, adimlar, adimSayisi) {
    const telefon = kok.querySelector('.telefon');
    const yazi = kok.querySelector('.video-yazi');
    const cubuklar = [...kok.querySelectorAll('.rehber-ilerleme > span')];
    const oynatDugmesi = kok.querySelector('[data-rehber="oynat"]');
    let i = 0, calisiyor = false, zamanlayici = null, basla = 0, kalan = 0, sure = 0, kare = null;

    const sureHesapla = n => Math.max(6500, (adimlar[n].baslik.length + adimlar[n].yazi.length) * 80);
    const goster = n => {
      i = n;
      telefon.dataset.adim = String(n);
      kok.querySelectorAll('.rehber-adimlari li').forEach(li => {
        li.classList.toggle('aktif', +li.dataset.i === n);
        li.classList.toggle('bitti', +li.dataset.i < n);
      });
      cubuklar.forEach((c, j) => { c.firstChild.style.width = j < n ? '100%' : '0%'; });
      kok.querySelector('.video-adim').textContent = n === 0 ? 'Başlarken' : n === adimlar.length - 1 ? 'Tamamlandı' : `Adım ${n} / ${adimSayisi}`;
      kok.querySelector('.video-baslik').textContent = adimlar[n].baslik;
      kok.querySelector('.video-aciklama').textContent = adimlar[n].yazi;
      // Yazı her adımda yeniden belirsin
      yazi.classList.remove('gir'); void yazi.offsetWidth; yazi.classList.add('gir');
    };
    const ilerlemeCiz = () => {
      if (!calisiyor) return;
      const oran = Math.min(1, (performance.now() - basla) / sure);
      cubuklar[i].firstChild.style.width = (oran * 100) + '%';
      kare = requestAnimationFrame(ilerlemeCiz);
    };
    const zamanla = ms => {
      clearTimeout(zamanlayici);
      basla = performance.now() - (sure - ms);
      zamanlayici = setTimeout(() => {
        if (i + 1 >= adimlar.length) { cubuklar[i].firstChild.style.width = '100%'; return bitir(); }
        git(i + 1);
      }, ms);
      cancelAnimationFrame(kare);
      kare = requestAnimationFrame(ilerlemeCiz);
    };
    const git = n => {
      goster(n);
      sure = sureHesapla(n);
      if (calisiyor) zamanla(sure);
    };
    const oynat = () => {
      calisiyor = true;
      kok.classList.remove('durdu');
      oynatDugmesi.innerHTML = ikon('duraklat');
      oynatDugmesi.setAttribute('aria-label', 'Duraklat');
      zamanla(kalan > 0 ? kalan : sure);
      kalan = 0;
    };
    const duraklat = () => {
      calisiyor = false;
      kok.classList.add('durdu');
      clearTimeout(zamanlayici);
      cancelAnimationFrame(kare);
      kalan = Math.max(0, sure - (performance.now() - basla));
      oynatDugmesi.innerHTML = ikon('oynat');
      oynatDugmesi.setAttribute('aria-label', 'Oynat');
    };
    const bitir = () => {
      duraklat();
      kalan = 0;
      oynatDugmesi.innerHTML = ikon('yenile');
      oynatDugmesi.setAttribute('aria-label', 'Yeniden izle');
      kok.classList.add('bitti');
    };

    oynatDugmesi.addEventListener('click', () => {
      if (kok.classList.contains('bitti')) { kok.classList.remove('bitti'); calisiyor = true; git(0); oynat(); return; }
      if (calisiyor) duraklat(); else oynat();
    });
    kok.querySelector('[data-rehber="ileri"]').addEventListener('click', () => { kok.classList.remove('bitti'); kalan = 0; git(Math.min(i + 1, adimlar.length - 1)); });
    kok.querySelector('[data-rehber="geri"]').addEventListener('click', () => { kok.classList.remove('bitti'); kalan = 0; git(Math.max(i - 1, 0)); });
    kok.querySelectorAll('.rehber-adimlari li').forEach(li => li.addEventListener('click', () => {
      kok.classList.remove('bitti'); kalan = 0; git(+li.dataset.i);
    }));
    const asla = $katman.querySelector('[data-rehber="asla"]');
    if (asla) asla.addEventListener('click', () => { yerelDepo('ofl-kurulum-rehberi', 'asla'); cekmeceKapat(); });
    S.rehberDurdur = () => { calisiyor = false; clearTimeout(zamanlayici); cancelAnimationFrame(kare); };

    // Ses olmadığı için kendiliğinden başlar; "hareketi azalt" seçiliyse kullanıcı ilerletir.
    goster(0);
    sure = sureHesapla(0);
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) duraklat();
    else setTimeout(oynat, 500);
  }

  /* =====================================================================
   * Yönetim paneli
   * ===================================================================== */

  async function panelEkrani() {
    const ic = byId('icerik');
    ic.innerHTML = sayfaBasi('Yönetim Paneli', 'Genel görünüm ve yönetim araçları') + yukleniyor();
    const [ist, yoneticiler] = await Promise.all([Api.istatistik(), yoneticiBilgisi(true).catch(() => [])]);
    const enCok = Math.max(...ist.yillar.map(y => y.adet), 1);
    const sehirMax = ist.sehirler[0] ? ist.sehirler[0].adet : 1;
    const yuzde = n => ist.toplam ? Math.round(n / ist.toplam * 100) : 0;
    const ilk = ist.yillar[0], son = ist.yillar[ist.yillar.length - 1];

    ic.innerHTML = `
      ${sayfaBasi('Yönetim Paneli', 'Genel görünüm ve yönetim araçları',
        `<button class="dugme ikincil" data-ac="csv">${ikon('indir')}<span>Excel'e aktar</span></button>
         <button class="dugme ikincil" data-ac="duyuru-yeni">${ikon('duyuru')}<span>Duyuru yap</span></button>
         <button class="dugme" data-ac="yeni">${ikon('kisiEkle')}<span>Kullanıcı ekle</span></button>`)}

      <div class="stat-izgara">
        <div class="stat"><span class="stat-etiket">${ikon('kisiler', 'kucuk')} Kayıtlı mezun</span><span class="stat-deger">${sayi(ist.toplam)}</span><span class="stat-alt">${sayi(ist.ogretmen || 0)} öğretmen</span></div>
        <a class="stat ${ist.bekleyen ? 'dikkat' : ''}" href="#/basvurular" data-sekme-git="onay"><span class="stat-etiket">${ikon('gelen', 'kucuk')} Onay bekleyen</span><span class="stat-deger">${ist.bekleyen}</span><span class="stat-alt">${ist.bekleyen ? 'İncelemek için tıklayın' : 'Bekleyen başvuru yok'}</span></a>
        <a class="stat ${ist.silmeTalebi ? 'dikkat' : ''}" href="#/basvurular" data-sekme-git="silme"><span class="stat-etiket">${ikon('cop', 'kucuk')} Silme talebi</span><span class="stat-deger">${ist.silmeTalebi}</span><span class="stat-alt">${ist.silmeTalebi ? 'İşlemek için tıklayın' : 'Bekleyen talep yok'}</span></a>
        <div class="stat"><span class="stat-etiket">${ikon('telefon', 'kucuk')} Telefonunu paylaşan</span><span class="stat-deger">%${yuzde(ist.telefonPaylasan)}</span><span class="stat-alt">E-postasını paylaşan %${yuzde(ist.epostaPaylasan)}</span></div>
      </div>

      <div class="panel-izgara">
        <div class="kart">
          <h3>Mezuniyet yılına göre kayıtlı mezunlar</h3>
          <div class="grafik" role="img" aria-label="Mezuniyet yılına göre kayıtlı mezun sayısı, ${ilk.yil}–${son.yil}">
            <div class="grafik-eksen" aria-hidden="true"><span>${enCok}</span><span>${Math.round(enCok / 2)}</span><span>0</span></div>
            <div class="sutunlar">
              ${ist.yillar.map(y => `<div class="sutun" tabindex="0" data-ipucu="${y.yil}: ${y.adet} mezun"><span class="sutun-dolgu" style="height:${y.adet / enCok * 100}%"></span></div>`).join('')}
            </div>
            <div class="sutun-etiketleri" aria-hidden="true">
              ${ist.yillar.map((y, i) => `<span>${i % 4 === 0 || i === ist.yillar.length - 1 ? y.yil : ''}</span>`).join('')}
            </div>
          </div>
          <details class="tablo-gorunumu"><summary>Tablo olarak göster</summary>
            <table><thead><tr><th>Yıl</th><th>Mezun</th></tr></thead><tbody>${ist.yillar.map(y => `<tr><td>${y.yil}</td><td>${y.adet}</td></tr>`).join('')}</tbody></table>
          </details>
        </div>
        <div class="kart">
          <h3>Mezunların yaşadığı şehirler <small class="soluk">(ilk 10)</small></h3>
          <ul class="yatay-cubuklar">
            ${ist.sehirler.slice(0, 10).map(s => `<li><span class="cubuk-ad">${esc(s.sehir)}</span><span class="cubuk"><span style="width:${s.adet / sehirMax * 100}%"></span></span><span class="cubuk-deger">${s.adet}</span></li>`).join('')}
          </ul>
        </div>
      </div>

      <div class="panel-izgara">
        <div class="kart">
          <h3>Yöneticiler <small class="soluk">(${yoneticiler.length})</small></h3>
          <ul class="yonetici-listesi">${yoneticiler.map(y => `<li>${avatar({ id: y.eposta, ad: (y.ad || y.eposta)[0], soyad: (y.ad || '').split(' ').slice(-1)[0][0] || '' }, 'kucuk')}
            <span><strong>${esc(y.ad || 'Yönetici')}${y.sen ? ' <span class="etiket">Siz</span>' : ''}</strong><small>${esc(y.eposta)}</small></span>
            ${y.asil ? `<span class="durum-cip yesil">${ikon('kalkan', 'kucuk')}Asil</span>`
              : S.asil ? `<button class="ikon-dugme kucuk" data-ac="panel-yetki-kaldir" data-eposta="${esc(y.eposta)}" aria-label="${esc(y.ad || y.eposta)} yönetici yetkisini kaldır" title="Yetkiyi kaldır">${ikon('kapat', 'kucuk')}</button>` : ''}</li>`).join('')}</ul>
          <p class="soluk kucuk-yazi">${S.asil
            ? 'Bir kişiyi yönetici yapmak için Rehber’de kişiye dokunun ve <strong>Yönetici yap</strong>’a basın. Yetkiyi kaldırmak için listedeki ✕ düğmesini kullanın. Asil yöneticilerin yetkisi uygulamadan değiştirilemez.'
            : 'Yönetici yetkisini yalnızca <strong>asil</strong> yöneticiler verip kaldırabilir.'}</p>
        </div>
        <div class="kart">
          <h3>Araçlar</h3>
          <div class="arac-listesi">
            <button class="arac" data-ac="csv">${ikon('indir')}<span><strong>Tüm listeyi Excel'e aktar</strong><small>Onaylı ve bekleyen tüm kayıtlar CSV dosyası olarak iner.</small></span></button>
            <button class="arac" data-ac="yeni">${ikon('kisiEkle')}<span><strong>Kullanıcı ekle</strong><small>Mezun veya öğretmen ekleyin; öğretmene isterseniz yönetici yetkisi verin.</small></span></button>
            <button class="arac" data-ac="duyuru-yeni">${ikon('duyuru')}<span><strong>Duyuru yap</strong><small>Mezunlara ve öğretmenlere duyuru yayınlayın, isterseniz e-postayla da gönderin.</small></span></button>
            ${DEMO ? `<button class="arac" data-ac="sifirla">${ikon('yenile')}<span><strong>Demo verisini sıfırla</strong><small>Tüm değişiklikler silinir, hayali veriler ilk haline döner.</small></span></button>` : ''}
          </div>
        </div>
      </div>`;
  }

  async function csvIndir() {
    try {
      bildir('Liste hazırlanıyor…');
      const metin = await Api.csv();
      const url = URL.createObjectURL(new Blob([metin], { type: 'text/csv;charset=utf-8' }));
      const a = document.createElement('a');
      a.href = url; a.download = `ofl-connect-mezunlar-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) { hataGoster(e); }
  }

  /* =====================================================================
   * Tıklama yönetimi
   * ===================================================================== */

  document.addEventListener('click', async ev => {
    if (ev.target.closest('a[href^="tel:"], a[href^="mailto:"]')) return; // satırdaki iletişim bağlantıları satırı açmasın
    const sekmeGit = ev.target.closest('[data-sekme-git]');
    if (sekmeGit) S.basvuruSekmesi = sekmeGit.dataset.sekmeGit;
    const el = ev.target.closest('[data-ac]');
    if (!el || el.dataset.ac === 'kapat') return;
    const id = el.dataset.id;
    switch (el.dataset.ac) {
      case 'detay': return detayAc(id);
      case 'incele': return basvuruIncele(id);
      case 'duzenle': return mezunDuzenle(id);
      case 'basvuru-duzenle': return mezunDuzenle(id, () => basvuruIncele(id));
      case 'sil': ev.stopPropagation(); return kayitSil(id);
      case 'yeni': return kullaniciEkle();
      case 'hesap': return hesapAc();
      case 'duyuru-yeni': return duyuruEditoru();
      case 'duyuru-duzenle': return duyuruEditoru(id);
      case 'duyuru-sil': return duyuruSil(id);
      case 'duyuru-sekme':
        S.duyuruSekmesi = el.dataset.sekme;
        return duyurularEkrani().catch(hataGoster);
      case 'silme-talebi': return silmeTalebi();
      case 'yenile': return yonlendir();
      case 'geri':
        if (S.gecmis && S.gecmis.length) history.back(); else git('#/rehber');
        return;
      case 'sayfa':
        S.sayfa += +el.dataset.yon;
        listeyiCiz();
        document.querySelector('.tablo-kart').scrollIntoView({ block: 'start', behavior: 'smooth' });
        return;
      case 'temizle':
        S.filtre = { q: '', tur: '', calisma: '', cevrimici: false, yil: '', sehir: '', sirala: S.filtre.sirala }; S.sayfa = 1;
        return rehberEkrani();
      case 'tur-filtre':
        S.filtre.tur = el.dataset.tur; S.sayfa = 1;
        document.querySelectorAll('[data-ac="tur-filtre"]').forEach(b => { b.classList.toggle('aktif', b === el); b.setAttribute('aria-selected', b === el); });
        document.querySelector('.arac-cubugu').dataset.tur = S.filtre.tur;
        return listeyiCiz();
      case 'cevrimici-filtre':
        S.filtre.cevrimici = !S.filtre.cevrimici; S.sayfa = 1;
        el.classList.toggle('aktif', S.filtre.cevrimici); el.setAttribute('aria-pressed', S.filtre.cevrimici);
        return listeyiCiz();
      case 'sifre-sifirla': return sifreIslemi(id, 'sifirla');
      case 'sifre-ver': return sifreIslemi(id, 'belirle');
      case 'yonetici-yap': return yetkiIslemi(id, true);
      case 'yonetici-kaldir': return yetkiIslemi(id, false);
      case 'panel-yetki-kaldir': {
        const y = (S.yoneticiListesi || []).find(x => x.eposta === el.dataset.eposta);
        if (!y || !await onayIste(`${y.ad || y.eposta} kişisinin yönetici yetkisi kaldırılacak; oturumu hemen kapanır.`, 'Yetkiyi kaldır', true)) return;
        try { await Api.yoneticiKaldir(y.eposta); await yoneticiBilgisi(true); bildir('Yönetici yetkisi kaldırıldı.', 'basarili'); yonlendir(); } catch (e) { hataGoster(e); }
        return;
      }
      case 'kurulum-rehberi': return kurulumRehberi(true);
      case 'bildirim-ac': return bildirimleriAc(el);
      case 'sekme':
        S.basvuruSekmesi = el.dataset.sekme;
        return basvurularEkrani().catch(hataGoster);
      case 'onayla': {
        const rol = onayRolu();
        if (rol === null) return;
        const yontem = $katman.querySelector('[name="onayGiris"]:checked');
        const sifre = yontem && yontem.value === 'sifre' ? geciciSifreUret() : '';
        try {
          el.disabled = true;
          const r = await Api.onayla(id, rol.tur, rol.brans, sifre);
          if (sifre) await sifrePaylas(r, sifre, `Başvuru ${rol.tur === 'ogretmen' ? 'öğretmen olarak ' : ''}onaylandı`);
          else bildir(`Başvuru ${rol.tur === 'ogretmen' ? 'öğretmen olarak ' : ''}onaylandı. Kişiye e-posta gönderildi; artık giriş yapabilir.`, 'basarili');
          yonlendir();
        } catch (e) { el.disabled = false; hataGoster(e); }
        return;
      }
      case 'reddet': {
        const baslik = $katman.querySelector('.cekmece-bas h2');
        const red = await redSebebiIste(baslik ? baslik.firstChild.textContent.trim() : 'Bu kişi');
        if (!red) return;
        try {
          const r = await Api.reddet(id, red.sebep, red.bildir);
          bildir('Başvuru reddedildi' + (r && r.bildirildi ? ' ve sebebi kişiye e-postayla gönderildi' : '') + '. “Reddedilenler” sekmesinden geri alabilirsiniz.');
          yonlendir();
        } catch (e) { hataGoster(e); }
        return;
      }
      case 'csv': return csvIndir();
      case 'sifirla':
        if (!await onayIste('Demo verileri ilk haline döner ve oturumunuz kapanır.', 'Sıfırla', true)) return;
        Api.demoSifirla(); S.filtre = { q: '', tur: '', calisma: '', cevrimici: false, yil: '', sehir: '', sirala: 'yil' }; S.duyurular = null;
        return git('#/');
      case 'cikis':
        await bildirimAboneliginiKaldir();
        await Api.cikis(); S.liste = []; S.basvurular = []; S.filtre = { q: '', tur: '', calisma: '', cevrimici: false, yil: '', sehir: '', sirala: 'yil' }; S.sayfa = 1; S.duyurular = null; S.acilisYapildi = false; S.gecmis = []; return git('#/');
      case 'kur':
        if (S.kurulumOlayi) { S.kurulumOlayi.prompt(); S.kurulumOlayi = null; kurulumDugmesiniGuncelle(); }
        else kurulumRehberi(true);
        return;
      case 'ios-kapat':
        yerelDepo('ofl-kurulum-seridi', Date.now());
        byId('ios-ipucu').innerHTML = '';
    }
  });

  /* =====================================================================
   * PWA: kurulum ve çevrimdışı
   * ===================================================================== */

  function kurulumDugmesiniGuncelle() {
    const mobil = cihaz().mobil;
    document.querySelectorAll('.kurulum-dugmesi').forEach(b => { b.hidden = KURULU() || !(S.kurulumOlayi || mobil); });
    // Telefondan tarayıcıyla kullananlara "uygulamayı ekle" şeridi (kapatılırsa 7 gün gösterilmez)
    const kapatma = yerelDepo('ofl-kurulum-seridi');
    const yer = byId('ios-ipucu');
    if (yer && mobil && !KURULU() && !(kapatma && Date.now() - kapatma < 7 * 864e5)) {
      yer.innerHTML = `<div class="ios-ipucu">${ikon('yukle')}
        <span>OFL Connect'i telefonunuza uygulama olarak ekleyin; tek dokunuşla açılsın ve duyurular bildirim olarak gelsin.</span>
        <button class="dugme kucuk" data-ac="kurulum-rehberi">${ikon('oynat', 'kucuk')}<span>Nasıl?</span></button>
        <button class="ikon-dugme" data-ac="ios-kapat" aria-label="Kapat">${ikon('kapat')}</button></div>`;
    }
  }

  window.addEventListener('beforeinstallprompt', ev => {
    ev.preventDefault();
    S.kurulumOlayi = ev;
    kurulumDugmesiniGuncelle();
  });
  window.addEventListener('appinstalled', () => { S.kurulumOlayi = null; kurulumDugmesiniGuncelle(); bildir('OFL Connect ana ekranınıza eklendi.', 'basarili'); });

  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => { /* çevrimdışı destek isteğe bağlı */ }));
  }

  // Grafik ipuçları (fare ve klavye)
  const $ipucu = document.createElement('div');
  $ipucu.className = 'ipucu';
  $ipucu.setAttribute('aria-hidden', 'true');
  document.body.appendChild($ipucu);
  function ipucuGoster(el) {
    $ipucu.textContent = el.dataset.ipucu;
    const r = el.getBoundingClientRect();
    $ipucu.style.left = (r.left + r.width / 2) + 'px';
    $ipucu.style.top = (r.top + window.scrollY - 8) + 'px';
    $ipucu.classList.add('gorunur');
  }
  document.addEventListener('mouseover', ev => { const el = ev.target.closest('[data-ipucu]'); if (el) ipucuGoster(el); else $ipucu.classList.remove('gorunur'); });
  document.addEventListener('focusin', ev => { const el = ev.target.closest('[data-ipucu]'); if (el) ipucuGoster(el); });
  document.addEventListener('focusout', () => $ipucu.classList.remove('gorunur'));

  window.addEventListener('ofl-oturum-bitti', () => { bildir('Oturumunuz sona erdi. Lütfen tekrar giriş yapın.'); git('#/'); });
  window.addEventListener('hashchange', yonlendir);
  yonlendir();
})();
