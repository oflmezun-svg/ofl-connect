/**
 * OFL Connect — Google Apps Script sunucusu
 *
 * Bu dosya mezun verilerinin tutulduğu Google E-Tablo'ya bağlı çalışır.
 * Tüm yetki ve gizlilik kuralları burada uygulanır: bir mezunun gizlediği
 * bilgi diğer mezunlara hiçbir şekilde gönderilmez.
 *
 * Kurulum adımları için KURULUM.md dosyasına bakın.
 */

const AYAR = {
  UYGULAMA_ADI: 'OFL Connect',
  OKUL_ADI: 'TOBB Osmaniye Fen Lisesi',
  UYGULAMA_ADRESI: 'https://oflmezun-svg.github.io/ofl-connect/', // GitHub Pages adresi
  ILK_YIL: 2004,
  OTURUM_GUN: 60,               // giriş bu kadar gün hatırlanır
  KOD_DAKIKA: 10,               // giriş kodunun geçerlilik süresi
  SAATLIK_KOD_SINIRI: 5,        // bir e-postaya saatte en fazla kaç kod gönderilir
  KOD_DENEME_SINIRI: 5,         // bir kod için en fazla kaç hatalı deneme
  SAATLIK_BASVURU_SINIRI: 60,   // tüm sisteme saatte en fazla kaç yeni başvuru
  BEKLEYEN_SINIRI: 300,         // onay bekleyen başvuru üst sınırı
  YENI_BASVURU_BILDIRIMI: true, // yeni başvuruda yöneticilere e-posta
  ONAY_BILDIRIMI: true          // onaylanan mezuna e-posta
};

const SAYFA = { MEZUN: 'Mezunlar', YONETICI: 'Yoneticiler', OTURUM: 'Oturumlar', KAYIT: 'IslemKaydi' };
const ALANLAR = ['egitim', 'meslek', 'sehir', 'telefon', 'eposta'];
const SUTUNLAR = ['id', 'ad', 'soyad', 'yil', 'universite', 'bolum', 'meslek', 'sehir', 'telefon', 'eposta',
  'g_egitim', 'g_meslek', 'g_sehir', 'g_telefon', 'g_eposta', 'durum', 'kvkkOnay', 'kayitTarihi', 'guncelleme', 'silmeTalebi'];
const BASLIKLAR = ['ID', 'Ad', 'Soyad', 'Mezuniyet Yılı', 'Üniversite', 'Bölüm', 'Meslek', 'Şehir', 'Telefon', 'E-posta',
  'Görünür: Eğitim', 'Görünür: Meslek', 'Görünür: Şehir', 'Görünür: Telefon', 'Görünür: E-posta',
  'Durum', 'KVKK Onay Tarihi', 'Kayıt Tarihi', 'Son Güncelleme', 'Silme Talebi'];

/* =========================================================================
 * E-tablo menüsü ve kurulum
 * ========================================================================= */

function onOpen() {
  SpreadsheetApp.getUi().createMenu('OFL Connect')
    .addItem('Kurulumu yap / onar', 'kurulum')
    .addItem('Yönetici ekle', 'yoneticiEkleMenusu')
    .addItem('Tüm oturumları kapat', 'tumOturumlariKapat')
    .addToUi();
}

function kurulum() {
  const ss = SpreadsheetApp.getActive();
  sayfaHazirla_(ss, SAYFA.MEZUN, BASLIKLAR);
  sayfaHazirla_(ss, SAYFA.YONETICI, ['E-posta', 'Ad', 'Eklenme Tarihi']);
  sayfaHazirla_(ss, SAYFA.OTURUM, ['Anahtar Özeti', 'E-posta', 'Rol', 'Mezun ID', 'Oluşturma', 'Son Geçerlilik']);
  sayfaHazirla_(ss, SAYFA.KAYIT, ['Tarih', 'Yapan', 'İşlem', 'Hedef', 'Ayrıntı']);

  const bos = ss.getSheetByName('Sayfa1') || ss.getSheetByName('Sheet1');
  if (bos && bos.getLastRow() === 0 && ss.getSheets().length > 1) ss.deleteSheet(bos);

  const ben = Session.getEffectiveUser().getEmail();
  if (ben && !yoneticiMi_(ben)) yoneticiEkle_(ben, 'Kurucu yönetici');

  const mesaj = 'OFL Connect kurulumu tamamlandı.\n\n' +
    (ben ? ben + ' yönetici olarak eklendi.\n\n' : '') +
    'Sıradaki adım: Uzantılar → Apps Script → Dağıt → Yeni dağıtım (KURULUM.md, 4. adım).';
  // Apps Script düzenleyicisinden çalıştırıldığında e-tablo arayüzü yoktur; mesaj günlüğe yazılır.
  try { SpreadsheetApp.getUi().alert(mesaj); } catch (e) { console.log(mesaj); }
}

function yoneticiEkleMenusu() {
  const ui = SpreadsheetApp.getUi();
  const c = ui.prompt('Yönetici ekle', 'Yeni yöneticinin e-posta adresi:', ui.ButtonSet.OK_CANCEL);
  if (c.getSelectedButton() !== ui.Button.OK) return;
  const eposta = epostaDuzenle_(c.getResponseText());
  if (!gecerliEposta_(eposta)) return ui.alert('Geçerli bir e-posta adresi girin.');
  if (yoneticiMi_(eposta)) return ui.alert('Bu kişi zaten yönetici.');
  yoneticiEkle_(eposta, '');
  ui.alert(eposta + ' yönetici olarak eklendi. Bu adresle giriş yaptığında yönetici paneline erişir.');
}

function tumOturumlariKapat() {
  const sh = sayfa_(SAYFA.OTURUM);
  if (sh.getLastRow() > 1) sh.deleteRows(2, sh.getLastRow() - 1);
  SpreadsheetApp.getUi().alert('Tüm oturumlar kapatıldı. Herkesin yeniden giriş yapması gerekecek.');
}

function sayfaHazirla_(ss, ad, basliklar) {
  const sh = ss.getSheetByName(ad) || ss.insertSheet(ad);
  sh.getRange(1, 1, 1, basliklar.length).setValues([basliklar])
    .setFontWeight('bold').setBackground('#0f286a').setFontColor('#ffffff');
  sh.setFrozenRows(1);
  // Düz metin: telefonlardaki baştaki 0 kaybolmaz, tarihler dönüştürülmez.
  sh.getRange(2, 1, Math.max(sh.getMaxRows() - 1, 1), basliklar.length).setNumberFormat('@');
  return sh;
}

/* =========================================================================
 * Web uygulaması giriş noktası
 * ========================================================================= */

const ISLEMLER = {
  kodGonder:         { herkese: true, f: kodGonder_ },
  girisYap:          { herkese: true, f: girisYap_ },
  kayitOl:           { herkese: true, f: kayitOl_ },
  cikis:             { f: cikis_ },
  rehber:            { f: rehber_ },
  mezun:             { f: mezun_ },
  profilKaydet:      { f: profilKaydet_ },
  silmeTalebiGonder: { rol: 'mezun', f: silmeTalebiGonder_ },
  rozetler:          { rol: 'admin', f: rozetler_ },
  bekleyenler:       { rol: 'admin', f: bekleyenler_ },
  silmeTalepleri:    { rol: 'admin', f: silmeTalepleri_ },
  onayla:            { rol: 'admin', f: onayla_ },
  sil:               { rol: 'admin', f: sil_ },
  istatistik:        { rol: 'admin', f: istatistik_ },
  csv:               { rol: 'admin', f: csv_ }
};

function doPost(e) {
  let yanit;
  try {
    const istek = JSON.parse(e.postData.contents);
    const tanim = ISLEMLER[istek.islem];
    if (!tanim) throw hata_('Bilinmeyen işlem.');
    let izleyen = null;
    if (istek.token) {
      try { izleyen = oturumBul_(istek.token); }
      catch (err) { if (!tanim.herkese) throw err; }
    }
    if (!tanim.herkese && !izleyen) throw oturumHatasi_();
    if (tanim.rol && izleyen.rol !== tanim.rol) throw hata_('Bu işlem için yetkiniz yok.');
    yanit = { ok: true, veri: tanim.f(istek.veri || {}, izleyen, istek.token) };
  } catch (err) {
    if (err && err.kullanici) yanit = { ok: false, hata: err.message, alanlar: err.alanlar || null, kod: err.kod || null };
    else { console.error(err && err.stack || err); yanit = { ok: false, hata: 'Sunucuda bir hata oluştu. Lütfen tekrar deneyin.' }; }
  }
  return ContentService.createTextOutput(JSON.stringify(yanit)).setMimeType(ContentService.MimeType.JSON);
}

function doGet() {
  return ContentService.createTextOutput(JSON.stringify({ ok: true, uygulama: AYAR.UYGULAMA_ADI + ' API' }))
    .setMimeType(ContentService.MimeType.JSON);
}

/* =========================================================================
 * Giriş: e-postaya tek kullanımlık kod
 * ========================================================================= */

function kodGonder_(v) {
  const eposta = epostaDuzenle_(v.eposta);
  if (!gecerliEposta_(eposta)) throw hata_('Geçerli bir e-posta adresi girin.');
  const cache = CacheService.getScriptCache();
  const sayAnahtar = 'ks:' + ozet_(eposta);
  const say = parseInt(cache.get(sayAnahtar) || '0', 10);
  if (say >= AYAR.SAATLIK_KOD_SINIRI) throw hata_('Bu adrese çok fazla kod istendi. Lütfen bir saat sonra tekrar deneyin.');
  cache.put(sayAnahtar, String(say + 1), 3600);

  // Kayıtlı olsun olmasın aynı yanıt verilir; böylece kimin sistemde olduğu dışarıdan öğrenilemez.
  const hedef = girisHedefi_(eposta);
  if (hedef) {
    if (MailApp.getRemainingDailyQuota() < 1) throw hata_('Sistemin bugünkü e-posta gönderim sınırı doldu. Lütfen yarın tekrar deneyin.');
    const kod = guvenliKod_();
    cache.put('kod:' + ozet_(eposta), JSON.stringify({ h: ozet_(kod + '|' + eposta), d: 0 }), AYAR.KOD_DAKIKA * 60);
    MailApp.sendEmail({
      to: eposta,
      name: AYAR.UYGULAMA_ADI,
      subject: kod + ' — ' + AYAR.UYGULAMA_ADI + ' giriş kodunuz',
      htmlBody: epostaSablonu_('Giriş kodunuz',
        '<p>Merhaba ' + html_(hedef.ad) + ',</p><p>' + AYAR.UYGULAMA_ADI + ' giriş kodunuz:</p>' +
        '<p style="font-size:28px;font-weight:700;letter-spacing:6px;margin:16px 0">' + kod + '</p>' +
        '<p>Kod ' + AYAR.KOD_DAKIKA + ' dakika geçerlidir. Bu isteği siz yapmadıysanız e-postayı yok sayabilirsiniz.</p>')
    });
  }
  return { gonderildi: true };
}

function girisYap_(v) {
  const eposta = epostaDuzenle_(v.eposta);
  const kod = String(v.kod || '').replace(/\D/g, '');
  const cache = CacheService.getScriptCache();
  const anahtar = 'kod:' + ozet_(eposta);
  const kayit = cache.get(anahtar);
  if (!kayit) throw hata_('Kod hatalı veya süresi dolmuş. Lütfen yeni kod isteyin.');
  const o = JSON.parse(kayit);
  if (o.d >= AYAR.KOD_DENEME_SINIRI) { cache.remove(anahtar); throw hata_('Çok fazla hatalı deneme. Lütfen yeni kod isteyin.'); }
  if (ozet_(kod + '|' + eposta) !== o.h) {
    o.d++;
    cache.put(anahtar, JSON.stringify(o), AYAR.KOD_DAKIKA * 60);
    throw hata_('Kod hatalı. Kalan deneme hakkı: ' + (AYAR.KOD_DENEME_SINIRI - o.d));
  }
  cache.remove(anahtar);
  const hedef = girisHedefi_(eposta);
  if (!hedef) throw hata_('Giriş yapılamadı.');
  const token = oturumOlustur_(eposta, hedef.rol, hedef.id);
  return { token: token, rol: hedef.rol, id: hedef.id, ad: hedef.ad };
}

function girisHedefi_(eposta) {
  const y = yoneticiler_().filter(function (x) { return x.eposta === eposta; })[0];
  if (y) return { rol: 'admin', id: 'admin', ad: y.ad || 'Yönetici' };
  const k = mezunlariOku_().filter(function (x) { return x.eposta === eposta && x.durum === 'onayli'; })[0];
  return k ? { rol: 'mezun', id: k.id, ad: k.ad + ' ' + k.soyad } : null;
}

function cikis_(v, izleyen, token) {
  const h = ozet_(token);
  CacheService.getScriptCache().remove('o:' + h);
  kilitle_(function () {
    const sh = sayfa_(SAYFA.OTURUM);
    const son = sh.getLastRow();
    if (son < 2) return;
    const degerler = sh.getRange(2, 1, son - 1, 1).getValues();
    for (let i = degerler.length - 1; i >= 0; i--) if (degerler[i][0] === h) sh.deleteRow(i + 2);
  });
  return { cikti: true };
}

/* =========================================================================
 * Oturumlar
 * ========================================================================= */

function oturumOlustur_(eposta, rol, mezunId) {
  const token = (Utilities.getUuid() + Utilities.getUuid()).replace(/-/g, '');
  const simdi = new Date();
  const bitis = new Date(simdi.getTime() + AYAR.OTURUM_GUN * 864e5);
  kilitle_(function () {
    const sh = sayfa_(SAYFA.OTURUM);
    // Süresi dolmuş oturumları ara sıra temizle
    const son = sh.getLastRow();
    if (son > 1 && Math.random() < 0.2) {
      const v = sh.getRange(2, 1, son - 1, 6).getValues();
      for (let i = v.length - 1; i >= 0; i--) if (new Date(v[i][5]) < simdi) sh.deleteRow(i + 2);
    }
    satirEkle_(sh, [ozet_(token), eposta, rol, mezunId, simdi.toISOString(), bitis.toISOString()]);
  });
  return token;
}

function oturumBul_(token) {
  if (!token || typeof token !== 'string') throw oturumHatasi_();
  const h = ozet_(token);
  const cache = CacheService.getScriptCache();
  let o = null;
  const c = cache.get('o:' + h);
  if (c) o = JSON.parse(c);
  else {
    const sh = sayfa_(SAYFA.OTURUM);
    const son = sh.getLastRow();
    if (son > 1) {
      const v = sh.getRange(2, 1, son - 1, 6).getValues();
      for (let i = 0; i < v.length; i++) {
        if (v[i][0] === h) { o = { eposta: String(v[i][1]), rol: String(v[i][2]), id: String(v[i][3]), bitis: String(v[i][5]) }; break; }
      }
    }
    if (o) cache.put('o:' + h, JSON.stringify(o), 600);
  }
  if (!o || new Date(o.bitis) < new Date()) throw oturumHatasi_();

  // Yetki hâlâ geçerli mi? (yönetici listeden çıkarıldıysa / mezun silindiyse oturum düşer)
  if (o.rol === 'admin') {
    if (!yoneticiMi_(o.eposta)) throw oturumHatasi_();
  } else {
    const k = mezunBul_(o.id);
    if (!k || k.durum !== 'onayli') throw oturumHatasi_();
  }
  return o;
}

/* =========================================================================
 * Mezun işlemleri
 * ========================================================================= */

function rehber_(v, izleyen) {
  return mezunlariOku_()
    .filter(function (k) { return k.durum === 'onayli'; })
    .map(function (k) { return maskele_(k, izleyen); });
}

function mezun_(v, izleyen) {
  const k = mezunBul_(v.id);
  if (!k || (k.durum !== 'onayli' && izleyen.rol !== 'admin')) throw hata_('Kayıt bulunamadı.');
  return maskele_(k, izleyen);
}

function profilKaydet_(v, izleyen) {
  const id = String(v.id || '');
  if (izleyen.rol !== 'admin' && izleyen.id !== id) throw hata_('Yalnızca kendi bilgilerinizi değiştirebilirsiniz.');
  return kilitle_(function () {
    const k = mezunBul_(id);
    if (!k) throw hata_('Kayıt bulunamadı.');
    const d = dogrula_(v);
    if (!d.hatalar.eposta && epostaKullanimda_(d.temiz.eposta, id)) d.hatalar.eposta = 'Bu e-posta başka bir kayıtta kullanılıyor.';
    if (Object.keys(d.hatalar).length) throw dogrulamaHatasi_(d.hatalar);
    Object.assign(k, d.temiz, { guncelleme: new Date().toISOString() });
    mezunYaz_(k);
    if (izleyen.rol === 'admin') islemKaydet_(izleyen, 'Düzenleme', id, k.ad + ' ' + k.soyad);
    return maskele_(k, izleyen);
  });
}

function kayitOl_(v, izleyen) {
  const yonetici = izleyen && izleyen.rol === 'admin';
  if (v.web) return { durum: 'beklemede' }; // robot tuzağı: görünmez alan doldurulmuş
  const d = dogrula_(v);
  if (!yonetici && !v.kvkkOnay) d.hatalar.kvkk = 'Devam etmek için açık rıza onayı gereklidir.';
  return kilitle_(function () {
    if (!d.hatalar.eposta && epostaKullanimda_(d.temiz.eposta)) d.hatalar.eposta = 'Bu e-posta ile zaten bir kayıt var.';
    if (Object.keys(d.hatalar).length) throw dogrulamaHatasi_(d.hatalar);
    if (!yonetici) {
      const cache = CacheService.getScriptCache();
      const say = parseInt(cache.get('basvuru-saat') || '0', 10);
      if (say >= AYAR.SAATLIK_BASVURU_SINIRI) throw hata_('Şu anda çok fazla başvuru var. Lütfen biraz sonra tekrar deneyin.');
      cache.put('basvuru-saat', String(say + 1), 3600);
      const bekleyen = mezunlariOku_().filter(function (k) { return k.durum === 'beklemede'; }).length;
      if (bekleyen >= AYAR.BEKLEYEN_SINIRI) throw hata_('Başvurular geçici olarak kapalı. Lütfen daha sonra tekrar deneyin.');
    }
    const simdi = new Date().toISOString();
    const k = Object.assign({ id: 'M' + Utilities.getUuid().replace(/-/g, '').slice(0, 10).toUpperCase() }, d.temiz, {
      durum: yonetici ? 'onayli' : 'beklemede',
      kvkkOnay: yonetici ? '' : simdi,
      kayitTarihi: simdi, guncelleme: simdi, silmeTalebi: ''
    });
    satirEkle_(sayfa_(SAYFA.MEZUN), kayittanSatir_(k));
    if (yonetici) islemKaydet_(izleyen, 'Mezun ekleme', k.id, k.ad + ' ' + k.soyad);
    else if (AYAR.YENI_BASVURU_BILDIRIMI) yoneticilereBildir_(k);
    return { id: k.id, durum: k.durum };
  });
}

function silmeTalebiGonder_(v, izleyen) {
  return kilitle_(function () {
    const k = mezunBul_(izleyen.id);
    k.silmeTalebi = k.silmeTalebi ? '' : new Date().toISOString();
    mezunYaz_(k);
    return maskele_(k, izleyen);
  });
}

/* ---------- yönetici ---------- */

function rozetler_() {
  const l = mezunlariOku_();
  return {
    bekleyen: l.filter(function (k) { return k.durum === 'beklemede'; }).length,
    silme: l.filter(function (k) { return k.silmeTalebi; }).length
  };
}

function bekleyenler_(v, izleyen) {
  return mezunlariOku_().filter(function (k) { return k.durum === 'beklemede'; })
    .map(function (k) { return maskele_(k, izleyen); });
}

function silmeTalepleri_(v, izleyen) {
  return mezunlariOku_().filter(function (k) { return k.silmeTalebi; })
    .map(function (k) { return maskele_(k, izleyen); });
}

function onayla_(v, izleyen) {
  return kilitle_(function () {
    const k = mezunBul_(v.id);
    if (!k) throw hata_('Kayıt bulunamadı.');
    if (k.durum === 'onayli') return { durum: 'onayli' };
    k.durum = 'onayli';
    mezunYaz_(k);
    islemKaydet_(izleyen, 'Onay', k.id, k.ad + ' ' + k.soyad);
    if (AYAR.ONAY_BILDIRIMI && MailApp.getRemainingDailyQuota() > 0) {
      MailApp.sendEmail({
        to: k.eposta, name: AYAR.UYGULAMA_ADI,
        subject: AYAR.UYGULAMA_ADI + ' kaydınız onaylandı',
        htmlBody: epostaSablonu_('Kaydınız onaylandı',
          '<p>Merhaba ' + html_(k.ad) + ',</p><p>' + AYAR.OKUL_ADI + ' mezun ağına kaydınız onaylandı. ' +
          'Artık bu e-posta adresinizle giriş yapabilirsiniz.</p>' +
          (AYAR.UYGULAMA_ADRESI ? '<p><a href="' + AYAR.UYGULAMA_ADRESI + '">' + AYAR.UYGULAMA_ADI + '’e git</a></p>' : ''))
      });
    }
    return { durum: 'onayli' };
  });
}

function sil_(v, izleyen) {
  return kilitle_(function () {
    const k = mezunBul_(v.id);
    if (!k) throw hata_('Kayıt bulunamadı.');
    sayfa_(SAYFA.MEZUN).deleteRow(k._satir);
    // Kişisel veri işlem kaydına yazılmaz; yalnızca ID ve işlem türü tutulur.
    islemKaydet_(izleyen, k.durum === 'beklemede' ? 'Başvuru reddi' : (k.silmeTalebi ? 'KVKK silme' : 'Silme'), k.id, '');
    return { silindi: true };
  });
}

function istatistik_() {
  const tum = mezunlariOku_();
  const onayli = tum.filter(function (k) { return k.durum === 'onayli'; });
  const yillar = {}, sehirler = {};
  const buYil = new Date().getFullYear();
  for (let y = AYAR.ILK_YIL; y <= buYil; y++) yillar[y] = 0;
  let tel = 0, ep = 0;
  onayli.forEach(function (k) {
    if (k.yil) yillar[k.yil] = (yillar[k.yil] || 0) + 1;
    const s = k.sehir || 'Belirtilmemiş';
    sehirler[s] = (sehirler[s] || 0) + 1;
    if (k.gorunurluk.telefon) tel++;
    if (k.gorunurluk.eposta) ep++;
  });
  return {
    toplam: onayli.length,
    bekleyen: tum.length - onayli.length,
    silmeTalebi: tum.filter(function (k) { return k.silmeTalebi; }).length,
    telefonPaylasan: tel, epostaPaylasan: ep,
    yillar: Object.keys(yillar).map(function (y) { return { yil: +y, adet: yillar[y] }; }),
    sehirler: Object.keys(sehirler).map(function (s) { return { sehir: s, adet: sehirler[s] }; })
      .sort(function (a, b) { return b.adet - a.adet; })
  };
}

function csv_(v, izleyen) {
  const b = ['Ad', 'Soyad', 'Mezuniyet Yılı', 'Üniversite', 'Bölüm', 'Meslek', 'Şehir', 'Telefon', 'E-posta', 'Durum', 'Son Güncelleme'];
  const hucre = function (x) {
    let s = String(x == null ? '' : x);
    if (/^[=+\-@]/.test(s)) s = "'" + s;
    return '"' + s.replace(/"/g, '""') + '"';
  };
  const satirlar = mezunlariOku_().map(function (k) {
    return [k.ad, k.soyad, k.yil, k.universite, k.bolum, k.meslek, k.sehir, k.telefon, k.eposta,
      k.durum === 'onayli' ? 'Onaylı' : 'Onay bekliyor', String(k.guncelleme).slice(0, 10)].map(hucre).join(';');
  });
  islemKaydet_(izleyen, 'CSV dışa aktarma', '', satirlar.length + ' kayıt');
  return '﻿' + [b.map(hucre).join(';')].concat(satirlar).join('\r\n');
}

/* =========================================================================
 * Gizlilik ve doğrulama
 * ========================================================================= */

function maskele_(k, izleyen) {
  const tam = izleyen.rol === 'admin' || izleyen.id === k.id;
  const s = { id: k.id, ad: k.ad, soyad: k.soyad, yil: k.yil, tamYetki: tam, kendisi: izleyen.id === k.id, gizli: [] };
  const degerler = {
    egitim: { universite: k.universite, bolum: k.bolum }, meslek: { meslek: k.meslek },
    sehir: { sehir: k.sehir }, telefon: { telefon: k.telefon }, eposta: { eposta: k.eposta }
  };
  ALANLAR.forEach(function (a) {
    if (tam || k.gorunurluk[a]) Object.assign(s, degerler[a]);
    else s.gizli.push(a);
  });
  if (tam) {
    Object.assign(s, {
      gorunurluk: Object.assign({}, k.gorunurluk), durum: k.durum, kvkkOnay: k.kvkkOnay,
      kayitTarihi: k.kayitTarihi, guncelleme: k.guncelleme, silmeTalebi: k.silmeTalebi || null
    });
  }
  return s;
}

function dogrula_(v) {
  const h = {};
  const metin = function (x, n) { return String(x == null ? '' : x).replace(/\s+/g, ' ').trim().slice(0, n); };
  const buYil = new Date().getFullYear();
  const t = {
    ad: metin(v.ad, 60), soyad: metin(v.soyad, 60), yil: parseInt(v.yil, 10),
    universite: metin(v.universite, 120), bolum: metin(v.bolum, 120),
    meslek: metin(v.meslek, 80), sehir: metin(v.sehir, 60),
    eposta: epostaDuzenle_(v.eposta), telefon: ''
  };
  if (!t.ad) h.ad = 'Ad zorunludur.';
  if (!t.soyad) h.soyad = 'Soyad zorunludur.';
  if (!(t.yil >= AYAR.ILK_YIL && t.yil <= buYil)) h.yil = 'Geçerli bir mezuniyet yılı seçin.';
  if (!gecerliEposta_(t.eposta)) h.eposta = 'Geçerli bir e-posta adresi girin.';
  if (metin(v.telefon, 30)) {
    t.telefon = telefonDuzenle_(v.telefon);
    if (!t.telefon) h.telefon = 'Telefonu 05XX XXX XX XX biçiminde girin.';
  }
  const g = v.gorunurluk || {};
  t.gorunurluk = {};
  ALANLAR.forEach(function (a) { t.gorunurluk[a] = !!g[a]; });
  return { temiz: t, hatalar: h };
}

function epostaKullanimda_(eposta, haric) {
  if (yoneticiMi_(eposta)) return true;
  return mezunlariOku_().some(function (k) { return k.eposta === eposta && k.id !== haric; });
}

/* =========================================================================
 * E-tablo erişimi
 * ========================================================================= */

function sayfa_(ad) {
  const sh = SpreadsheetApp.getActive().getSheetByName(ad);
  if (!sh) throw new Error('"' + ad + '" sayfası yok. E-tablodan OFL Connect → Kurulumu yap menüsünü çalıştırın.');
  return sh;
}

function mezunlariOku_() {
  const sh = sayfa_(SAYFA.MEZUN);
  const son = sh.getLastRow();
  if (son < 2) return [];
  return sh.getRange(2, 1, son - 1, SUTUNLAR.length).getValues()
    .map(function (r, i) { return satirdanKayit_(r, i + 2); })
    .filter(function (k) { return k.id; });
}

function mezunBul_(id) {
  if (!id) return null;
  return mezunlariOku_().filter(function (k) { return k.id === String(id); })[0] || null;
}

function satirdanKayit_(r, satir) {
  const k = { _satir: satir };
  SUTUNLAR.forEach(function (s, i) { k[s] = r[i]; });
  ['id', 'ad', 'soyad', 'universite', 'bolum', 'meslek', 'sehir', 'telefon', 'durum']
    .forEach(function (s) { k[s] = String(k[s] == null ? '' : k[s]).trim(); });
  k.eposta = epostaDuzenle_(k.eposta);
  k.yil = parseInt(k.yil, 10) || 0;
  k.durum = k.durum === 'onayli' ? 'onayli' : 'beklemede';
  ['kvkkOnay', 'kayitTarihi', 'guncelleme', 'silmeTalebi'].forEach(function (s) {
    k[s] = k[s] instanceof Date ? k[s].toISOString() : String(k[s] || '');
  });
  k.gorunurluk = {};
  ALANLAR.forEach(function (a) {
    const x = k['g_' + a];
    k.gorunurluk[a] = x === true || /^(evet|true|1)$/i.test(String(x).trim());
  });
  return k;
}

function kayittanSatir_(k) {
  return SUTUNLAR.map(function (s) {
    if (s.indexOf('g_') === 0) return k.gorunurluk[s.slice(2)] ? 'EVET' : 'HAYIR';
    return guvenliHucre_(k[s]);
  });
}

function mezunYaz_(k) {
  const r = sayfa_(SAYFA.MEZUN).getRange(k._satir, 1, 1, SUTUNLAR.length);
  r.setNumberFormat('@').setValues([kayittanSatir_(k)]);
}

function satirEkle_(sh, degerler) {
  const r = sh.getRange(sh.getLastRow() + 1, 1, 1, degerler.length);
  r.setNumberFormat('@').setValues([degerler.map(guvenliHucre_)]);
}

// "=" ile başlayan bir metin formül olarak çalışmasın (formül enjeksiyonu).
function guvenliHucre_(v) {
  if (v == null) return '';
  const s = String(v);
  return /^[=+\-@]/.test(s) ? "'" + s : s;
}

function yoneticiler_() {
  const sh = sayfa_(SAYFA.YONETICI);
  const son = sh.getLastRow();
  if (son < 2) return [];
  return sh.getRange(2, 1, son - 1, 2).getValues()
    .map(function (r) { return { eposta: epostaDuzenle_(r[0]), ad: String(r[1] || '') }; })
    .filter(function (y) { return y.eposta; });
}

function yoneticiMi_(eposta) {
  eposta = epostaDuzenle_(eposta);
  return yoneticiler_().some(function (y) { return y.eposta === eposta; });
}

function yoneticiEkle_(eposta, ad) {
  satirEkle_(sayfa_(SAYFA.YONETICI), [epostaDuzenle_(eposta), ad || '', new Date().toISOString()]);
}

function islemKaydet_(izleyen, islem, hedef, ayrinti) {
  satirEkle_(sayfa_(SAYFA.KAYIT), [new Date().toISOString(), izleyen ? izleyen.eposta : '', islem, hedef || '', ayrinti || '']);
}

function yoneticilereBildir_(k) {
  try {
    const alicilar = yoneticiler_().map(function (y) { return y.eposta; });
    if (!alicilar.length || MailApp.getRemainingDailyQuota() < alicilar.length) return;
    MailApp.sendEmail({
      to: alicilar.join(','), name: AYAR.UYGULAMA_ADI,
      subject: 'Yeni mezun başvurusu: ' + k.ad + ' ' + k.soyad + ' (' + k.yil + ')',
      htmlBody: epostaSablonu_('Yeni mezun başvurusu',
        '<p><strong>' + html_(k.ad + ' ' + k.soyad) + '</strong>, ' + k.yil + ' mezunu olarak kayıt başvurusu yaptı.</p>' +
        '<p>İncelemek için ' + AYAR.UYGULAMA_ADI + '’e yönetici olarak girip <strong>Başvurular</strong> sayfasını açın.</p>' +
        (AYAR.UYGULAMA_ADRESI ? '<p><a href="' + AYAR.UYGULAMA_ADRESI + '#/basvurular">Başvuruları aç</a></p>' : ''))
    });
  } catch (e) { console.warn('Yönetici bildirimi gönderilemedi: ' + e); }
}

/* =========================================================================
 * Yardımcılar
 * ========================================================================= */

function kilitle_(f) {
  const kilit = LockService.getScriptLock();
  kilit.waitLock(15000);
  try { return f(); } finally { kilit.releaseLock(); }
}

function ozet_(metin) {
  return Utilities.base64EncodeWebSafe(
    Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(metin), Utilities.Charset.UTF_8));
}

function guvenliKod_() {
  const n = parseInt(Utilities.getUuid().replace(/-/g, '').slice(0, 12), 16) % 1000000;
  return ('000000' + n).slice(-6);
}

function epostaDuzenle_(e) { return String(e || '').trim().toLowerCase(); }
function gecerliEposta_(e) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) && e.length <= 120; }

function telefonDuzenle_(t) {
  let r = String(t || '').replace(/\D/g, '');
  if (r.indexOf('90') === 0 && r.length === 12) r = r.slice(2);
  if (r.length === 10 && r[0] === '5') r = '0' + r;
  if (!/^05\d{9}$/.test(r)) return null;
  return r.slice(0, 4) + ' ' + r.slice(4, 7) + ' ' + r.slice(7, 9) + ' ' + r.slice(9);
}

function html_(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}

function epostaSablonu_(baslik, govde) {
  return '<div style="font-family:Arial,Helvetica,sans-serif;max-width:520px;margin:auto;color:#172033">' +
    '<div style="background:#0f286a;color:#fff;padding:16px 20px;border-radius:10px 10px 0 0">' +
    '<strong style="font-size:16px">' + AYAR.UYGULAMA_ADI + '</strong><br><span style="font-size:13px;opacity:.8">' +
    AYAR.OKUL_ADI + ' Mezun Ağı</span></div>' +
    '<div style="border:1px solid #dde2ec;border-top:0;padding:20px;border-radius:0 0 10px 10px">' +
    '<h2 style="margin:0 0 12px;font-size:18px">' + baslik + '</h2>' + govde + '</div></div>';
}

function hata_(mesaj) { const e = new Error(mesaj); e.kullanici = true; return e; }
function oturumHatasi_() { const e = hata_('Oturumunuz sona erdi. Lütfen tekrar giriş yapın.'); e.kod = 'OTURUM'; return e; }
function dogrulamaHatasi_(alanlar) { const e = hata_('Lütfen işaretli alanları düzeltin.'); e.alanlar = alanlar; return e; }
