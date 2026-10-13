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
    filtre: { q: '', tur: '', yil: '', sehir: '', sirala: 'yil' },
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
    kisiEkle: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M19 8v6"/><path d="M22 11h-6"/>'
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
    return `<div class="sayfa-basi">
      <div><h1>${baslik}</h1>${alt ? `<p>${alt}</p>` : ''}</div>
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

  function cekmeceAc({ bas, govde, alt, etiket, genis, orta }) {
    if (!$katman.classList.contains('acik')) oncekiOdak = document.activeElement;
    $katman.classList.toggle('orta-katman', !!orta);
    $katman.innerHTML = `<div class="perde" data-ac="kapat"></div>
      <section class="cekmece ${genis ? 'genis' : ''} ${orta ? 'orta' : ''}" role="dialog" aria-modal="true" aria-label="${esc(etiket)}">
        <header class="cekmece-bas">${bas}<button class="ikon-dugme" data-ac="kapat" aria-label="Kapat">${ikon('kapat')}</button></header>
        <div class="cekmece-govde">${govde}</div>
        ${alt ? `<footer class="cekmece-alt">${alt}</footer>` : ''}
      </section>`;
    $katman.classList.add('acik');
    document.body.classList.add('kilitli');
    const ilk = $katman.querySelector('.cekmece-govde input, .cekmece-alt .dugme, .cekmece-govde .dugme');
    (ilk || $katman.querySelector('[data-ac="kapat"].ikon-dugme')).focus({ preventScroll: true });
  }

  function cekmeceKapat() {
    if (!$katman.classList.contains('acik')) return;
    $katman.classList.remove('acik');
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
  document.addEventListener('keydown', ev => {
    if (ev.key === 'Escape') {
      if ($onay.classList.contains('acik')) $onay.querySelector('[data-onay="hayir"]').click();
      else cekmeceKapat();
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
    cekmeceKapat();
    const yol = location.hash.replace(/^#\/?/, '');
    S.oturum = Api.oturum();
    if (!S.oturum) return yol === 'kayit' ? kayitEkrani() : girisEkrani();

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
      <div class="giris-marka-ic">
        <img src="icons/ofl-logo.png" alt="${esc(OFL.OKUL_ADI)} logosu" class="giris-logo">
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
    const sifreKipi = kip !== 'kod' && hesap && hesap.sifreVar && hesap.eposta;
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
                <button class="dugme metin" type="button" data-giris-ac="unuttum">Şifremi unuttum — e-posta koduyla gir</button>
                <button class="dugme metin" type="button" data-giris-ac="farkli">Farklı hesapla giriş yap</button>
              </div>` : `
              <h2>Giriş yap</h2>
              <p class="soluk">E-posta adresinize tek kullanımlık bir giriş kodu göndereceğiz. Giriş yaptıktan sonra isterseniz bir şifre belirleyip sonraki girişlerde onu kullanabilirsiniz.</p>

              <form id="f-eposta" class="form" novalidate>
                <div class="alan"><label for="g-eposta">E-posta adresi</label>
                  <input id="g-eposta" type="email" name="eposta" value="${esc(hesap && hesap.eposta || '')}" autocomplete="email" inputmode="email" placeholder="ornek@gmail.com" required>
                </div>
                <button class="dugme buyuk genis" type="submit">Giriş kodu gönder</button>
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
          </div>
        </main>
      </div>`;

    const girildi = o => {
      // Kodla girip henüz şifresi olmayanlara bir kez şifre belirleme önerilir.
      S.sifreOner = !o.sifreVar && !yerelDepo('ofl-sifre-onerisi-' + o.id);
      S.acilisYapildi = false;
      git('#/rehber');
    };
    const baglan = (ac, f) => { const b = $app.querySelector(`[data-giris-ac="${ac}"]`); if (b) b.addEventListener('click', f); };

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
      baglan('unuttum', async () => {
        girisEkrani('kod');
        const f = byId('f-eposta');
        f.eposta.value = hesap.eposta;
        f.requestSubmit();
      });
      baglan('farkli', () => { Api.hesapUnut(); girisEkrani(); });
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
      baglan('sifreye-don', () => girisEkrani());
    }

    $app.querySelectorAll('[data-giris]').forEach(b => b.addEventListener('click', async () => {
      girildi(await Api.demoGiris(b.dataset.giris));
    }));
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

  function anahtar(alan, acik) {
    return `<label class="gorunurluk">
      <input type="checkbox" role="switch" name="g_${alan}" ${acik ? 'checked' : ''} aria-label="${ALAN_ADI[alan]} diğer mezunlara görünsün">
      <span class="anahtar-kutu" aria-hidden="true"></span>
      <span class="anahtar-yazi" aria-hidden="true"><span class="acik-yazi">Görünür</span><span class="kapali-yazi">Gizli</span></span>
    </label>`;
  }

  function girdi(on, ad, etiket, deger, ek) {
    ek = ek || {};
    return `<div class="alan ${ek.sinif || ''}">
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

  function profilFormu(k, mod) {
    const on = 'f' + mod;
    k = k || { gorunurluk: { egitim: true, meslek: true, sehir: true, telefon: false, eposta: true } };
    const g = k.gorunurluk || {};
    const tur = k.tur === 'ogretmen' ? 'ogretmen' : 'mezun';
    const dugmeYazisi = { kayit: 'Başvurumu gönder', yeni: 'Kullanıcıyı ekle', profil: 'Değişiklikleri kaydet', admin: 'Kaydet' }[mod];
    const kim = (mezunYazi, ogretmenYazi) => mod === 'yeni'
      ? `<span class="sadece-mezun">${mezunYazi}</span><span class="sadece-ogretmen">${ogretmenYazi}</span>`
      : (tur === 'ogretmen' ? ogretmenYazi : mezunYazi);

    const turSecimi = mod === 'yeni' ? `
      <fieldset class="form-bolum">
        <legend>Kullanıcı türü</legend>
        <div class="segment" role="radiogroup" aria-label="Kullanıcı türü">
          <label><input type="radio" name="tur" value="mezun" checked><span>${ikon('kep', 'kucuk')} Mezun</span></label>
          <label><input type="radio" name="tur" value="ogretmen"><span>${ikon('ogretmen', 'kucuk')} Öğretmen</span></label>
        </div>
        <p class="bolum-not">${kim(
          `${ikon('bilgi', 'kucuk')} Yöneticinin eklediği mezun doğrudan onaylanır. Mezunun açık rızasını ayrıca almayı unutmayın.`,
          `${ikon('bilgi', 'kucuk')} Öğretmenler rehberde “Öğretmen” etiketiyle görünür ve mezunlarla aynı haklara sahiptir: rehberi görür, duyuruları alır, yalnızca kendi bilgisini düzenler.`)}</p>
      </fieldset>` : '';

    const yetki = mod === 'yeni' ? `
      <fieldset class="form-bolum">
        <legend>Yetki ve bildirim</legend>
        <label class="onay-kutusu sadece-ogretmen">
          <input type="checkbox" name="yonetici">
          <span><strong>Yönetici yetkisi ver</strong><small>Bu öğretmen yönetim paneline erişir; başvuruları onaylayabilir, kullanıcı ekleyebilir ve duyuru yapabilir. Rehberde yine öğretmen olarak görünür.</small></span>
        </label>
        <label class="onay-kutusu">
          <input type="checkbox" name="bilgilendir" checked>
          <span><strong>Bilgilendirme e-postası gönder</strong><small>Kişiye sisteme eklendiğini ve nasıl giriş yapacağını anlatan kısa bir e-posta gider.</small></span>
        </label>
      </fieldset>` : '';

    const kvkk = mod === 'kayit' ? `
      <fieldset class="form-bolum">
        <legend>Kişisel verilerin korunması</legend>
        <details class="kvkk-metin">
          <summary>Aydınlatma metnini okuyun</summary>
          <div>
            <p><strong>Veri sorumlusu:</strong> ${esc(OFL.OKUL_ADI)} Müdürlüğü.</p>
            <p><strong>İşlenen veriler:</strong> Ad-soyad, mezuniyet yılı, üniversite ve bölüm, meslek, şehir, telefon ve e-posta.</p>
            <p><strong>Amaç:</strong> Mezunlar arasında iletişim ağı kurmak; okul etkinlikleri, kariyer günleri ve mentorluk çalışmaları için mezunlara ulaşmak.</p>
            <p><strong>Kimler görebilir:</strong> Okul yönetiminin belirlediği sistem yöneticileri tüm bilgilerinizi görür. Diğer mezunlar yalnızca ad-soyadınızı, mezuniyet yılınızı ve sizin “Görünür” olarak işaretlediğiniz bilgileri görebilir. Bilgileriniz üçüncü kişilere verilmez.</p>
            <p><strong>Saklama:</strong> Veriler Google'ın bulut hizmetlerinde (Google E-Tablolar) saklanır; bu hizmetin sunucuları yurt dışında bulunabilir.</p>
            <p><strong>Haklarınız:</strong> 6698 sayılı KVKK'nın 11. maddesi uyarınca bilgilerinizi istediğiniz zaman güncelleyebilir, görünürlüğünü değiştirebilir veya silinmesini talep edebilirsiniz.</p>
            <p class="soluk">Bu metin taslaktır; yayına almadan önce okul idaresi tarafından gözden geçirilmelidir.</p>
          </div>
        </details>
        <label class="onay-kutusu">
          <input type="checkbox" name="kvkkOnay">
          <span>Aydınlatma metnini okudum. Bilgilerimin belirtilen amaçla işlenmesine, yurt dışındaki sunucularda saklanmasına ve seçtiğim bilgilerin diğer mezunlarla paylaşılmasına <strong>açık rıza</strong> veriyorum.</span>
        </label>
        <em class="alan-hata" data-hata="kvkk"></em>
      </fieldset>` : '';

    return `
      <form class="form profil-formu" data-tur="${tur}" novalidate>
        <input type="text" name="web" class="tuzak" tabindex="-1" autocomplete="off" aria-hidden="true">
        ${turSecimi}
        <fieldset class="form-bolum">
          <legend>Kimlik bilgileri</legend>
          <p class="bolum-not">${ikon('bilgi', 'kucuk')} ${kim('Ad, soyad ve mezuniyet yılı', 'Ad, soyad ve branş')} rehberde tüm kullanıcılara görünür.</p>
          <div class="alan-izgara">
            ${girdi(on, 'ad', 'Ad', k.ad, { zorunlu: true, ozellik: 'autocomplete="given-name"' })}
            ${girdi(on, 'soyad', 'Soyad', k.soyad, { zorunlu: true, ozellik: 'autocomplete="family-name"' })}
            ${girdi(on, 'yil', 'Mezuniyet yılı', '', { zorunlu: true, secim: yilSecenekleri(k.yil), sinif: 'sadece-mezun' })}
            ${girdi(on, 'brans', 'Branş', k.brans, { zorunlu: true, sinif: 'sadece-ogretmen', ozellik: 'list="brans-listesi" placeholder="Örn. Kimya"' })}
          </div>
        </fieldset>

        <fieldset class="form-bolum">
          <legend>Eğitim ve meslek</legend>
          <p class="bolum-not">${ikon('goz', 'kucuk')} Her bilginin yanındaki anahtarla diğer mezunların neyi görebileceğini seçin.</p>
          <div class="alan-izgara">
            ${girdi(on, 'universite', 'Üniversite', k.universite, { anahtar: anahtar('egitim', g.egitim), ozellik: 'list="uni-listesi" placeholder="Örn. Hacettepe Üniversitesi"', ipucu: 'Görünürlük ayarı bölüm için de geçerlidir.' })}
            ${girdi(on, 'bolum', 'Bölüm', k.bolum, { ozellik: 'placeholder="Örn. Tıp"' })}
            ${girdi(on, 'meslek', 'Meslek', k.meslek, { anahtar: anahtar('meslek', g.meslek), ozellik: 'placeholder="Örn. Yazılım Mühendisi, Üniversite Öğrencisi"' })}
          </div>
        </fieldset>

        <fieldset class="form-bolum">
          <legend>İletişim ve konum</legend>
          <div class="alan-izgara">
            ${girdi(on, 'sehir', 'Yaşadığı şehir', k.sehir, { anahtar: anahtar('sehir', g.sehir), ozellik: 'placeholder="Örn. Ankara" autocomplete="address-level2"' })}
            ${girdi(on, 'telefon', 'Telefon', k.telefon, { anahtar: anahtar('telefon', g.telefon), ozellik: 'type="tel" placeholder="05XX XXX XX XX" autocomplete="tel" inputmode="tel"' })}
            ${girdi(on, 'eposta', 'E-posta', k.eposta, { zorunlu: true, anahtar: anahtar('eposta', g.eposta), ozellik: 'type="email" placeholder="ornek@gmail.com" autocomplete="email" inputmode="email"', ipucu: 'Sisteme giriş bu adresle yapılır.' })}
          </div>
        </fieldset>
        ${kvkk}
        ${yetki}
        <div class="form-alt">
          <button class="dugme buyuk" type="submit">${dugmeYazisi}</button>
        </div>
      </form>
      <datalist id="uni-listesi">${['Hacettepe Üniversitesi', 'Orta Doğu Teknik Üniversitesi', 'Ankara Üniversitesi', 'Gazi Üniversitesi', 'Bilkent Üniversitesi', 'Boğaziçi Üniversitesi', 'İstanbul Teknik Üniversitesi', 'İstanbul Üniversitesi', 'Yıldız Teknik Üniversitesi', 'Marmara Üniversitesi', 'Çukurova Üniversitesi', 'Osmaniye Korkut Ata Üniversitesi', 'Gaziantep Üniversitesi', 'Mersin Üniversitesi', 'Ege Üniversitesi', 'Dokuz Eylül Üniversitesi', 'Erciyes Üniversitesi', 'Selçuk Üniversitesi'].map(u => `<option value="${u}">`).join('')}</datalist>
      <datalist id="brans-listesi">${BRANSLAR.map(b => `<option value="${b}">`).join('')}</datalist>`;
  }

  function formVerisi(f) {
    const v = {};
    for (const n of ['ad', 'soyad', 'yil', 'brans', 'universite', 'bolum', 'meslek', 'sehir', 'telefon', 'eposta', 'web']) v[n] = f.elements[n].value;
    v.gorunurluk = {};
    for (const a of OFL.ALANLAR) v.gorunurluk[a] = f.elements['g_' + a].checked;
    if (f.elements.kvkkOnay) v.kvkkOnay = f.elements.kvkkOnay.checked;
    if (f.elements.tur) v.tur = f.elements.tur.value;
    if (f.elements.yonetici) v.yonetici = v.tur === 'ogretmen' && f.elements.yonetici.checked;
    if (f.elements.bilgilendir) v.bilgilendir = f.elements.bilgilendir.checked;
    return v;
  }

  function formuBagla(f, gonder, topla) {
    f.addEventListener('submit', async ev => {
      ev.preventDefault();
      f.querySelectorAll('[data-hata]').forEach(e => { e.textContent = ''; });
      f.querySelectorAll('[aria-invalid]').forEach(e => e.removeAttribute('aria-invalid'));
      const b = f.querySelector('button[type=submit]') || document.querySelector(`button[form="${f.id}"]`);
      const yazi = b.innerHTML;
      b.disabled = true; b.textContent = 'Kaydediliyor…';
      try { await gonder((topla || formVerisi)(f)); }
      catch (e) {
        if (e.alanlar) {
          let ilk = null;
          for (const [alan, mesaj] of Object.entries(e.alanlar)) {
            const el = f.querySelector(`[data-hata="${alan}"]`);
            if (el) el.textContent = mesaj;
            const g = f.elements[alan === 'kvkk' ? 'kvkkOnay' : alan];
            if (g) { g.setAttribute('aria-invalid', 'true'); ilk = ilk || g; }
          }
          if (ilk) ilk.focus();
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
          <a class="dugme" href="#/">Girişe dön</a>
        </div>`;
      window.scrollTo(0, 0);
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
    const f = S.filtre;
    ic.innerHTML = `
      ${sayfaBasi('Rehber', `${sayi(S.liste.length - ogretmenSayisi)} mezun${ogretmenSayisi ? ` · ${sayi(ogretmenSayisi)} öğretmen` : ''}`,
        admin ? `<button class="dugme" data-ac="yeni">${ikon('kisiEkle')}<span>Kullanıcı ekle</span></button>` : '')}
      <div class="arac-cubugu">
        <label class="arama">${ikon('ara')}<span class="gorunmez">Ara</span>
          <input type="search" id="q" value="${esc(f.q)}" placeholder="İsim, meslek, branş, üniversite veya şehir ara" autocomplete="off">
        </label>
        <label class="secim"><span class="gorunmez">Tür</span><select id="f-tur">
          <option value="">Herkes</option>
          <option value="mezun" ${f.tur === 'mezun' ? 'selected' : ''}>Mezunlar</option>
          <option value="ogretmen" ${f.tur === 'ogretmen' ? 'selected' : ''}>Öğretmenler</option>
        </select></label>
        <label class="secim"><span class="gorunmez">Mezuniyet yılı</span><select id="f-yil"><option value="">Tüm yıllar</option>${yillar.map(y => `<option ${+f.yil === y ? 'selected' : ''}>${y}</option>`).join('')}</select></label>
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
            <th scope="col" class="h-meslek">Meslek</th><th scope="col" class="h-sehir">Şehir</th><th scope="col" class="h-iletisim">İletişim</th>
          </tr></thead>
          <tbody id="liste"></tbody>
        </table>
        <div class="tablo-alt" id="sayfalama"></div>
      </div>`;

    const q = byId('q');
    let zamanlayici;
    q.addEventListener('input', () => {
      clearTimeout(zamanlayici);
      zamanlayici = setTimeout(() => { f.q = q.value; S.sayfa = 1; listeyiCiz(); }, 150);
    });
    const secim = (id, ad) => byId(id).addEventListener('change', ev => { f[ad] = ev.target.value; S.sayfa = 1; listeyiCiz(); });
    secim('f-tur', 'tur'); secim('f-yil', 'yil'); secim('f-sehir', 'sehir'); secim('f-sirala', 'sirala');
    listeyiCiz();
  }

  function filtrele() {
    const f = S.filtre;
    const kelimeler = OFL.katla(f.q).split(/\s+/).filter(Boolean);
    const l = S.liste.filter(k => {
      if (f.tur && k.tur !== f.tur) return false;
      if (f.yil && k.yil !== +f.yil) return false;
      if (f.sehir && k.sehir !== f.sehir) return false;
      if (!kelimeler.length) return true;
      const metin = OFL.katla([k.ad, k.soyad, k.meslek, k.universite, k.bolum, k.sehir, k.yil || '', k.brans, ogretmen(k) ? 'öğretmen' : 'mezun'].join(' '));
      return kelimeler.every(w => metin.includes(w));
    });
    const adSirasi = (a, b) => adSoyad(a).localeCompare(adSoyad(b), 'tr');
    if (f.sirala === 'ad') l.sort(adSirasi);
    // Öğretmenlerin mezuniyet yılı yoktur; yıl sıralamalarında en üstte toplanırlar.
    const yil = (k, bos) => ogretmen(k) ? bos : k.yil;
    if (f.sirala === 'eski') l.sort((a, b) => yil(a, 0) - yil(b, 0) || adSirasi(a, b));
    else if (f.sirala !== 'ad') l.sort((a, b) => yil(b, 1e4) - yil(a, 1e4) || adSirasi(a, b));
    return l;
  }

  const gizliHucre = `<span class="gizli-hucre" title="Bu bilgi paylaşılmıyor">${ikon('kilit', 'kucuk')}Gizli</span>`;
  const deger = (v, gizli) => gizli ? gizliHucre : (v ? esc(v) : '<span class="soluk">—</span>');

  function satirHtml(k) {
    const gizli = a => k.gizli.includes(a);
    const tel = telRakam(k.telefon);
    const iletisim = (tel ? `<a class="ikon-dugme kucuk" href="tel:+9${tel}" title="Ara: ${esc(k.telefon)}" aria-label="${esc(adSoyad(k))} kişisini ara">${ikon('telefon')}</a>` : '') +
      (k.eposta ? `<a class="ikon-dugme kucuk" href="mailto:${esc(k.eposta)}" title="${esc(k.eposta)}" aria-label="${esc(adSoyad(k))} kişisine e-posta gönder">${ikon('eposta')}</a>` : '');
    // Öğretmenin mesleği çoğunlukla branşını tekrarlar ("Fizik öğretmeni · Fizik Öğretmeni"); tekrar gösterilmez.
    const meslek = ogretmen(k) && OFL.katla(k.meslek).includes('ogretmen') ? '' : k.meslek;
    const ozet = [meslek, k.sehir].filter(Boolean).join(' · ');
    return `<tr data-ac="detay" data-id="${k.id}" tabindex="0">
      <td class="h-kisi"><div class="kisi">${avatar(k)}<div class="kisi-yazi">
        <strong>${esc(adSoyad(k))}${k.kendisi ? ' <span class="etiket">Siz</span>' : ''}${ogretmen(k) ? ' <span class="etiket ogretmen-etiket mobil-goster">Öğretmen</span>' : ''}</strong>
        <span class="mobil-ek">${esc(kimlikYazisi(k))}${ozet ? ' · ' + esc(ozet) : ''}</span>
      </div></div></td>
      <td class="h-yil">${ogretmen(k) ? `<span class="ogretmen-hucre"><span class="etiket ogretmen-etiket">${ikon('ogretmen', 'kucuk')}Öğretmen</span><small>${esc(k.brans || '')}</small></span>` : `<span class="yil">${k.yil}</span>`}</td>
      <td class="h-egitim">${gizli('egitim') ? gizliHucre : (k.universite || k.bolum ? `<span class="iki-satir">${esc(k.universite || '—')}<small>${esc(k.bolum || '')}</small></span>` : '<span class="soluk">—</span>')}</td>
      <td class="h-meslek">${deger(k.meslek, gizli('meslek'))}</td>
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
    byId('temizle').hidden = !(f.q || f.tur || f.yil || f.sehir);
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
   * Mezun detayı
   * ===================================================================== */

  function bilgiSatiri(ikonAd, etiket, icerik, alan, k) {
    const gizli = alan && k.gizli && k.gizli.includes(alan);
    const gorunurlukEtiketi = k.tamYetki && alan
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
    return `<div class="bilgi-listesi">
      ${bilgiSatiri('kep', 'Üniversite ve bölüm', egitim, 'egitim', k)}
      ${bilgiSatiri('canta', 'Meslek', esc(k.meslek), 'meslek', k)}
      ${bilgiSatiri('konum', 'Şehir', esc(k.sehir), 'sehir', k)}
      ${bilgiSatiri('telefon', 'Telefon', esc(k.telefon), 'telefon', k)}
      ${bilgiSatiri('eposta', 'E-posta', esc(k.eposta), 'eposta', k)}
    </div>`;
  }

  function kisiBasligi(k, ek) {
    return `<div class="kisi-baslik">${avatar(k, 'buyuk')}<div>
      <h2>${esc(adSoyad(k))}${ogretmen(k) ? ' <span class="etiket ogretmen-etiket">Öğretmen</span>' : ''}</h2>
      <p class="soluk">${esc(kimlikYazisi(k))}${ek || ''}</p>
    </div></div>`;
  }

  async function detayAc(id) {
    let k;
    try { k = await Api.mezun(id); } catch (e) { return hataGoster(e); }
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
    if (admin) notlar.push(`${ikon('takvim', 'kucuk')} Son güncelleme: ${tarihYaz(k.guncelleme)}`);
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
        ${notlar.map(n => `<p class="not">${n}</p>`).join('')}`,
      alt
    });
  }

  async function mezunDuzenle(id, sonra) {
    let k;
    try { k = await Api.mezun(id); } catch (e) { return hataGoster(e); }
    cekmeceAc({
      etiket: 'Mezunu düzenle', genis: true,
      bas: `<div><h2>Bilgileri düzenle</h2><p class="soluk">${esc(adSoyad(k))} · ${esc(kimlikYazisi(k))}</p></div>`,
      govde: profilFormu(k, 'admin')
    });
    formuBagla($katman.querySelector('form'), async v => {
      await Api.profilKaydet(id, v);
      bildir('Kayıt güncellendi.', 'basarili');
      if (sonra) sonra(); else yonlendir();
    });
  }

  function kullaniciEkle() {
    cekmeceAc({
      etiket: 'Kullanıcı ekle', genis: true,
      bas: `<div><h2>Kullanıcı ekle</h2><p class="soluk">Mezun veya öğretmen ekleyin. Eklenen kişi onay beklemeden e-postasıyla giriş yapabilir.</p></div>`,
      govde: profilFormu(null, 'yeni')
    });
    const f = $katman.querySelector('form');
    f.querySelectorAll('input[name="tur"]').forEach(r => r.addEventListener('change', () => {
      f.dataset.tur = f.elements.tur.value;
      // Öğretmenler okulun "mezunu" olmadığından meslek alanı varsayılan olarak doldurulur.
      if (f.elements.tur.value === 'ogretmen' && !f.elements.meslek.value) f.elements.meslek.placeholder = 'Örn. Kimya Öğretmeni';
    }));
    formuBagla(f, async v => {
      const r = await Api.kullaniciEkle(v);
      const kim = v.tur === 'ogretmen' ? 'Öğretmen' : 'Mezun';
      bildir(`${kim} eklendi${r.yonetici ? ' ve yönetici yetkisi verildi' : ''}${r.bilgilendirildi ? '; bilgilendirme e-postası gönderildi' : ''}.`, 'basarili');
      yonlendir();
    });
  }

  async function kayitSil(id) {
    let k;
    try { k = await Api.mezun(id); } catch (e) { return hataGoster(e); }
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
    byId('icerik').innerHTML = `
      ${sayfaBasi('Profilim', 'Bilgilerinizi güncel tutun; hangi bilginizin görüneceğine siz karar verin.')}
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
    ic.innerHTML = sayfaBasi('Başvurular', 'Yeni kayıt başvurularını inceleyip onaylayın, KVKK silme taleplerini işleyin.') + yukleniyor();
    const [bekleyen, silme] = await Promise.all([Api.bekleyenler(), Api.silmeTalepleri()]);
    bekleyen.sort((a, b) => String(b.kayitTarihi).localeCompare(String(a.kayitTarihi)));
    const sekme = S.basvuruSekmesi;

    const onayTablo = bekleyen.length ? `
      <table class="tablo">
        <thead><tr><th scope="col">Başvuran</th><th scope="col" class="h-yil">Yıl</th><th scope="col" class="h-egitim">Üniversite / Bölüm</th>
          <th scope="col" class="h-meslek">Başvuru tarihi</th><th scope="col" class="h-iletisim"><span class="gorunmez">İşlem</span></th></tr></thead>
        <tbody>${bekleyen.map(k => `
          <tr data-ac="incele" data-id="${k.id}" tabindex="0">
            <td class="h-kisi"><div class="kisi">${avatar(k)}<div class="kisi-yazi"><strong>${esc(adSoyad(k))}</strong><span class="ikincil-yazi">${esc(k.eposta)}</span><span class="mobil-ek">${k.yil} mezunu · ${tarihYaz(k.kayitTarihi)}</span></div></div></td>
            <td class="h-yil"><span class="yil">${k.yil}</span></td>
            <td class="h-egitim"><span class="iki-satir">${esc(k.universite || '—')}<small>${esc(k.bolum || '')}</small></span></td>
            <td class="h-meslek">${tarihYaz(k.kayitTarihi)}</td>
            <td class="h-iletisim"><span class="dugme ikincil kucuk">İncele${ikon('sag')}</span></td>
          </tr>`).join('')}
        </tbody>
      </table>` : bosDurum('tamam', 'Onay bekleyen başvuru yok', 'Yeni başvurular geldiğinde burada listelenir.');

    const silmeTablo = silme.length ? `
      <table class="tablo">
        <thead><tr><th scope="col">Mezun</th><th scope="col" class="h-yil">Yıl</th><th scope="col" class="h-egitim">E-posta</th>
          <th scope="col" class="h-meslek">Talep tarihi</th><th scope="col" class="h-iletisim"><span class="gorunmez">İşlem</span></th></tr></thead>
        <tbody>${silme.map(k => `
          <tr data-ac="detay" data-id="${k.id}" tabindex="0">
            <td class="h-kisi"><div class="kisi">${avatar(k)}<div class="kisi-yazi"><strong>${esc(adSoyad(k))}</strong><span class="mobil-ek">${k.yil} mezunu · ${tarihYaz(k.silmeTalebi)}</span></div></div></td>
            <td class="h-yil"><span class="yil">${k.yil}</span></td>
            <td class="h-egitim">${esc(k.eposta)}</td>
            <td class="h-meslek">${tarihYaz(k.silmeTalebi)}</td>
            <td class="h-iletisim"><button class="dugme tehlike-cerceve kucuk" data-ac="sil" data-id="${k.id}">${ikon('cop')}<span>Verileri sil</span></button></td>
          </tr>`).join('')}
        </tbody>
      </table>` : bosDurum('tamam', 'Bekleyen silme talebi yok', 'Mezunlar profil sayfasından silinme talebi gönderebilir.');

    ic.innerHTML = `
      ${sayfaBasi('Başvurular', 'Yeni kayıt başvurularını inceleyip onaylayın, KVKK silme taleplerini işleyin.')}
      <div class="sekmeler" role="tablist">
        <button role="tab" class="sekme ${sekme === 'onay' ? 'aktif' : ''}" aria-selected="${sekme === 'onay'}" data-ac="sekme" data-sekme="onay">Onay bekleyenler <span class="sayac">${bekleyen.length}</span></button>
        <button role="tab" class="sekme ${sekme === 'silme' ? 'aktif' : ''}" aria-selected="${sekme === 'silme'}" data-ac="sekme" data-sekme="silme">Silme talepleri <span class="sayac">${silme.length}</span></button>
      </div>
      <div class="tablo-kart" role="tabpanel">${sekme === 'onay' ? onayTablo : silmeTablo}</div>
      ${sekme === 'onay' && bekleyen.length ? `<p class="not">${ikon('bilgi', 'kucuk')} Bir başvurunun tüm bilgilerini görmek için satıra tıklayın. Onaylamadan önce kişinin okulumuz mezunu olduğunu doğrulayın.</p>` : ''}`;
  }

  async function basvuruIncele(id) {
    let k;
    try { k = await Api.mezun(id); } catch (e) { return hataGoster(e); }
    const satir = (etiket, icerik) => `<div class="tanim-satiri"><dt>${etiket}</dt><dd>${icerik}</dd></div>`;
    const gorunurluk = a => k.gorunurluk[a]
      ? `<span class="durum-cip yesil">${ikon('goz', 'kucuk')}Görünür</span>`
      : `<span class="durum-cip gri">${ikon('gozKapali', 'kucuk')}Gizli</span>`;
    const bos = '<span class="soluk">Belirtilmemiş</span>';

    cekmeceAc({
      etiket: 'Başvuru inceleme', genis: true,
      bas: kisiBasligi(k, ` · <span class="durum-cip turuncu">Onay bekliyor</span>`),
      govde: `
        <section class="inceleme-bolum">
          <h3>Kimlik bilgileri</h3>
          <dl class="tanim-listesi">
            ${satir('Ad', esc(k.ad))}
            ${satir('Soyad', esc(k.soyad))}
            ${satir('Mezuniyet yılı', k.yil)}
          </dl>
        </section>
        <section class="inceleme-bolum">
          <h3>Eğitim ve meslek</h3>
          <dl class="tanim-listesi">
            ${satir('Üniversite', (esc(k.universite) || bos))}
            ${satir('Bölüm', (esc(k.bolum) || bos))}
            ${satir('Meslek', (esc(k.meslek) || bos))}
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
          <p class="soluk kucuk-yazi">Mezun onaylandığında diğer mezunların görebileceği bilgiler:</p>
          <ul class="gorunurluk-ozeti">${OFL.ALANLAR.map(a => `<li><span>${ALAN_ADI[a]}</span>${gorunurluk(a)}</li>`).join('')}</ul>
        </section>
        <section class="inceleme-bolum">
          <h3>Başvuru ve onay</h3>
          <dl class="tanim-listesi">
            ${satir('Başvuru tarihi', tarihYaz(k.kayitTarihi))}
            ${satir('KVKK açık rıza', k.kvkkOnay ? `<span class="durum-cip yesil">${ikon('tamam', 'kucuk')}Verildi</span> ${tarihYaz(k.kvkkOnay)}` : '<span class="durum-cip gri">Yok</span>')}
          </dl>
        </section>`,
      alt: `<button class="dugme tehlike-cerceve" data-ac="reddet" data-id="${k.id}">${ikon('kapat')}<span>Reddet</span></button>
        <button class="dugme ikincil" data-ac="basvuru-duzenle" data-id="${k.id}">${ikon('kalem')}<span>Düzenle</span></button>
        <button class="dugme" data-ac="onayla" data-id="${k.id}">${ikon('tamam')}<span>Onayla</span></button>`
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

  async function acilisIslemleri() {
    const uye = S.oturum.rol !== 'admin';
    if (S.sifreOner) {
      S.sifreOner = false;
      if (uye) S.kapaninca = duyuruKontrol;
      return sifreOnerisi();
    }
    if (uye) duyuruKontrol();
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
    return `<article class="duyuru-kart tur-${esc(d.tur)}">
      <div class="duyuru-ust">${ust}</div>
      ${ek.sade ? '' : `<h3>${esc(d.baslik)}</h3>`}
      <div class="duyuru-metin">${duyuruMetni(d.metin)}</div>
      ${d.baglantiUrl ? `<a class="dugme ikincil kucuk" href="${esc(d.baglantiUrl)}" target="_blank" rel="noopener"><span>${esc(d.baglantiMetni || 'Ayrıntılar')}</span>${ikon('dis')}</a>` : ''}
      <div class="duyuru-alt">
        <span>${ikon('takvim', 'kucuk')} ${tarihYaz(d.baslangic)}</span>
        <span>${ikon('saat', 'kucuk')} Son gün: ${tarihYaz(d.bitis)}</span>
        ${eposta ? `<span>${ikon('eposta', 'kucuk')} ${eposta}</span>` : ''}
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
      ic.innerHTML = sayfaBasi('Duyurular', alt) + (liste.length
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
            <legend>E-posta</legend>
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
      eposta: f.eposta.checked && !epostaGitti
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
      cekmeceKapat();
      git('#/duyurular');
    }, topla);
  }

  async function duyuruSil(id) {
    if (!await onayIste('Duyuru kalıcı olarak silinecek ve kullanıcıların ekranından kaldırılacak. Henüz gönderilmemiş e-postalar iptal edilir.', 'Duyuruyu sil', true)) return;
    try { await Api.duyuruSil(id); bildir('Duyuru silindi.', 'basarili'); yonlendir(); }
    catch (e) { hataGoster(e); }
  }

  /* =====================================================================
   * Yönetim paneli
   * ===================================================================== */

  async function panelEkrani() {
    const ic = byId('icerik');
    ic.innerHTML = sayfaBasi('Yönetim Paneli', 'Genel görünüm ve yönetim araçları') + yukleniyor();
    const [ist, yoneticiler] = await Promise.all([Api.istatistik(), Api.yoneticiler().catch(() => [])]);
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
            <span><strong>${esc(y.ad || 'Yönetici')}</strong><small>${esc(y.eposta)}</small></span></li>`).join('')}</ul>
          <p class="soluk kucuk-yazi">Öğretmen eklerken <strong>Yönetici yetkisi ver</strong> seçeneğiyle yeni yönetici tanımlayabilirsiniz. Okul dışından birini yönetici yapmak veya yetkiyi kaldırmak için Google E-Tablo'daki <strong>Yoneticiler</strong> sayfasını kullanın (menü: OFL Connect → Yönetici ekle).</p>
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
      case 'sayfa':
        S.sayfa += +el.dataset.yon;
        listeyiCiz();
        document.querySelector('.tablo-kart').scrollIntoView({ block: 'start', behavior: 'smooth' });
        return;
      case 'temizle':
        S.filtre = { q: '', tur: '', yil: '', sehir: '', sirala: S.filtre.sirala }; S.sayfa = 1;
        return rehberEkrani();
      case 'sekme':
        S.basvuruSekmesi = el.dataset.sekme;
        return basvurularEkrani().catch(hataGoster);
      case 'onayla':
        try {
          el.disabled = true;
          await Api.onayla(id);
          bildir('Başvuru onaylandı. Mezun artık giriş yapabilir.', 'basarili');
          yonlendir();
        } catch (e) { el.disabled = false; hataGoster(e); }
        return;
      case 'reddet':
        if (!await onayIste('Bu başvuru reddedilecek ve bilgileri silinecek. Emin misiniz?', 'Başvuruyu reddet', true)) return;
        try { await Api.sil(id); bildir('Başvuru reddedildi ve bilgileri silindi.'); yonlendir(); } catch (e) { hataGoster(e); }
        return;
      case 'csv': return csvIndir();
      case 'sifirla':
        if (!await onayIste('Demo verileri ilk haline döner ve oturumunuz kapanır.', 'Sıfırla', true)) return;
        Api.demoSifirla(); S.filtre = { q: '', tur: '', yil: '', sehir: '', sirala: 'yil' }; S.duyurular = null;
        return git('#/');
      case 'cikis':
        await Api.cikis(); S.liste = []; S.duyurular = null; S.acilisYapildi = false; return git('#/');
      case 'kur':
        if (S.kurulumOlayi) { S.kurulumOlayi.prompt(); S.kurulumOlayi = null; kurulumDugmesiniGuncelle(); }
        return;
      case 'ios-kapat':
        try { localStorage.setItem('ofl-ios-ipucu', '1'); } catch (e) { /* yok say */ }
        byId('ios-ipucu').innerHTML = '';
    }
  });

  /* =====================================================================
   * PWA: kurulum ve çevrimdışı
   * ===================================================================== */

  function kurulumDugmesiniGuncelle() {
    document.querySelectorAll('.kurulum-dugmesi').forEach(b => { b.hidden = !S.kurulumOlayi; });
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const kurulu = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone;
    let kapatildi = false;
    try { kapatildi = !!localStorage.getItem('ofl-ios-ipucu'); } catch (e) { /* yok say */ }
    const yer = byId('ios-ipucu');
    if (yer && ios && !kurulu && !kapatildi) {
      yer.innerHTML = `<div class="ios-ipucu">${ikon('yukle')}
        <span>Uygulama gibi kullanmak için Safari'de ${ikon('paylas', 'kucuk')} <strong>Paylaş</strong> → <strong>Ana Ekrana Ekle</strong>'ye dokunun.</span>
        <button class="ikon-dugme" data-ac="ios-kapat" aria-label="İpucunu kapat">${ikon('kapat')}</button></div>`;
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
