/**
 * OFL Connect — Google Apps Script sunucusu
 *
 * Bu dosya mezun verilerinin tutulduğu Google E-Tablo'ya bağlı çalışır.
 * Tüm yetki ve gizlilik kuralları burada uygulanır: bir mezunun gizlediği
 * bilgi diğer kullanıcılara hiçbir şekilde gönderilmez.
 *
 * Kurulum adımları için KURULUM.md dosyasına bakın.
 */

const AYAR = {
  UYGULAMA_ADI: 'OFL Connect',
  OKUL_ADI: 'TOBB Osmaniye Fen Lisesi',
  UYGULAMA_ADRESI: 'https://oflmezun-svg.github.io/ofl-connect/', // GitHub Pages adresi
  ILK_YIL: 2004,
  OTURUM_GUN_HATIRLA: 90,       // "oturumum açık kalsın" seçilince oturum süresi (gün)
  OTURUM_SAAT_KISA: 12,         // seçilmezse oturum süresi (saat)
  KOD_DAKIKA: 10,               // giriş kodunun geçerlilik süresi
  SAATLIK_KOD_SINIRI: 5,        // bir e-postaya saatte en fazla kaç kod gönderilir
  KOD_DENEME_SINIRI: 5,         // bir kod için en fazla kaç hatalı deneme
  SIFRE_DENEME_SINIRI: 5,       // art arda hatalı şifre denemesi sınırı
  SIFRE_KILIT_DAKIKA: 15,       // sınır aşılınca şifreyle giriş kaç dakika kapanır
  SAATLIK_BASVURU_SINIRI: 60,   // tüm sisteme saatte en fazla kaç yeni başvuru
  BEKLEYEN_SINIRI: 300,         // onay bekleyen başvuru üst sınırı
  YENI_BASVURU_BILDIRIMI: true, // yeni başvuruda yöneticilere e-posta
  ONAY_BILDIRIMI: true,         // onaylanan mezuna e-posta
  EPOSTA_REZERV: 15,            // günlük e-posta kotasından giriş kodları için ayrılan pay
  EPOSTA_GRUP: 45,              // bir duyuru e-postasındaki en fazla gizli alıcı
  RED_SAKLAMA_GUN: 30,          // reddedilen başvurular bu kadar gün geri alınabilir, sonra silinir
  CEVRIMICI_DAKIKA: 5           // son bu kadar dakikada uygulamayı kullanan "çevrimiçi" sayılır
};

const SAYFA = {
  MEZUN: 'Mezunlar', YONETICI: 'Yoneticiler', OTURUM: 'Oturumlar', KAYIT: 'IslemKaydi',
  KIMLIK: 'Kimlik', DUYURU: 'Duyurular', KUYRUK: 'EpostaKuyrugu', BILDIRIM: 'Bildirimler'
};
const ALANLAR = ['egitim', 'meslek', 'sehir', 'telefon', 'eposta'];
// Yeni sütunlar her zaman sona eklenir; böylece mevcut veriler kaymaz.
const SUTUNLAR = ['id', 'ad', 'soyad', 'yil', 'universite', 'bolum', 'meslek', 'sehir', 'telefon', 'eposta',
  'g_egitim', 'g_meslek', 'g_sehir', 'g_telefon', 'g_eposta', 'durum', 'kvkkOnay', 'kayitTarihi', 'guncelleme', 'silmeTalebi',
  'tur', 'brans', 'calisma', 'kurum', 'sonGiris', 'redTarihi'];
const BASLIKLAR = ['ID', 'Ad', 'Soyad', 'Mezuniyet Yılı', 'Üniversite', 'Bölüm', 'Meslek', 'Şehir', 'Telefon', 'E-posta',
  'Görünür: Eğitim', 'Görünür: Meslek', 'Görünür: Şehir', 'Görünür: Telefon', 'Görünür: E-posta',
  'Durum', 'KVKK Onay Tarihi', 'Kayıt Tarihi', 'Son Güncelleme', 'Silme Talebi', 'Tür', 'Branş / Uzmanlık',
  'Çalışma Durumu', 'Kurum', 'Son Giriş', 'Red Tarihi'];
const CALISMA = ['calisiyor', 'calismiyor', 'ogrenci'];
const DUYURU_SUTUNLAR = ['id', 'baslik', 'metin', 'tur', 'hedef', 'baglantiMetni', 'baglantiUrl',
  'baslangic', 'bitis', 'eposta', 'olusturan', 'olusturma', 'guncelleme', 'bildirim'];
const DUYURU_BASLIKLAR = ['ID', 'Başlık', 'Metin', 'Tür', 'Hedef', 'Bağlantı Metni', 'Bağlantı',
  'Başlangıç', 'Bitiş', 'E-posta', 'Oluşturan', 'Oluşturma', 'Güncelleme', 'Telefon Bildirimi'];
const DUYURU_TURLERI = ['bilgi', 'etkinlik', 'onemli'];
const HEDEFLER = ['herkes', 'mezun', 'ogretmen'];

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
  sayfaHazirla_(ss, SAYFA.OTURUM, ['Anahtar Özeti', 'E-posta', 'Rol', 'Kullanıcı ID', 'Oluşturma', 'Son Geçerlilik']);
  sayfaHazirla_(ss, SAYFA.KAYIT, ['Tarih', 'Yapan', 'İşlem', 'Hedef', 'Ayrıntı']);
  sayfaHazirla_(ss, SAYFA.KIMLIK, ['E-posta', 'Şifre Özeti', 'Tuz', 'Güncelleme', 'Değiştirmeli']);
  sayfaHazirla_(ss, SAYFA.DUYURU, DUYURU_BASLIKLAR);
  sayfaHazirla_(ss, SAYFA.KUYRUK, ['Duyuru ID', 'Alıcı', 'Durum', 'Tarih']);
  sayfaHazirla_(ss, SAYFA.BILDIRIM, ['Kullanıcı ID', 'Rol', 'Uç Nokta', 'Tarih']);
  vapidAnahtari_(); // telefon bildirimleri için anahtar çifti (bir kez üretilir)

  const bos = ss.getSheetByName('Sayfa1') || ss.getSheetByName('Sheet1');
  if (bos && bos.getLastRow() === 0 && ss.getSheets().length > 1) ss.deleteSheet(bos);

  // Duyuru e-postalarını günlük kotaya göre gönderen saatlik görev
  const varMi = ScriptApp.getProjectTriggers().some(function (t) { return t.getHandlerFunction() === 'kuyrukIsle'; });
  if (!varMi) ScriptApp.newTrigger('kuyrukIsle').timeBased().everyHours(1).create();

  const ben = Session.getEffectiveUser().getEmail();
  if (ben && !yoneticiMi_(ben)) yoneticiEkle_(ben, 'Kurucu yönetici');

  const mesaj = 'OFL Connect kurulumu tamamlandı.\n\n' +
    (ben ? ben + ' yönetici olarak tanımlı.\n\n' : '') +
    'Sıradaki adım: Uzantılar → Apps Script → Dağıt (KURULUM.md, 4. adım).';
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

// rol: 'admin' yalnızca yönetici, 'uye' mezun veya öğretmen, boş ise giriş yapmış herkes.
const ISLEMLER = {
  kodGonder:         { herkese: true, f: kodGonder_ },
  sifreYenile:       { herkese: true, f: sifreYenile_ },
  pushAnahtari:      { herkese: true, f: pushAnahtari_ },
  pushSil:           { herkese: true, f: pushSil_ },
  pushKaydet:        { f: pushKaydet_ },
  nabiz:             { f: function () { return { ok: true }; } },
  girisYap:          { herkese: true, f: girisYap_ },
  sifreIleGiris:     { herkese: true, f: sifreIleGiris_ },
  kayitOl:           { herkese: true, f: kayitOl_ },
  cikis:             { f: cikis_ },
  hesabim:           { f: hesabim_ },
  sifreBelirle:      { f: sifreBelirle_ },
  rehber:            { f: rehber_ },
  mezun:             { f: mezun_ },
  profilKaydet:      { f: profilKaydet_ },
  duyurular:         { f: duyurular_ },
  silmeTalebiGonder: { rol: 'uye', f: silmeTalebiGonder_ },
  rozetler:          { rol: 'admin', f: rozetler_ },
  bekleyenler:       { rol: 'admin', f: bekleyenler_ },
  reddedilenler:     { rol: 'admin', f: reddedilenler_ },
  reddet:            { rol: 'admin', f: reddet_ },
  cevrimici:         { rol: 'admin', f: cevrimiciListesi_ },
  kullaniciSifre:    { rol: 'admin', f: kullaniciSifre_ },
  silmeTalepleri:    { rol: 'admin', f: silmeTalepleri_ },
  onayla:            { rol: 'admin', f: onayla_ },
  sil:               { rol: 'admin', f: sil_ },
  istatistik:        { rol: 'admin', f: istatistik_ },
  csv:               { rol: 'admin', f: csv_ },
  kullaniciEkle:     { rol: 'admin', f: kullaniciEkle_ },
  yoneticiler:       { rol: 'admin', f: yoneticiListesi_ },
  duyuruKaydet:      { rol: 'admin', f: duyuruKaydet_ },
  duyuruSil:         { rol: 'admin', f: duyuruSil_ }
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
    if (tanim.rol === 'admin' && izleyen.rol !== 'admin') throw hata_('Bu işlem için yetkiniz yok.');
    if (tanim.rol === 'uye' && izleyen.rol === 'admin') throw hata_('Bu işlem yalnızca mezun ve öğretmen hesapları içindir.');
    // Yöneticinin rehberde "çevrimiçi" görebilmesi için son etkinlik zamanı (yalnızca önbellekte) tutulur.
    if (izleyen && izleyen.rol !== 'admin') CacheService.getScriptCache().put('cg:' + izleyen.id, String(Date.now()), 1800);
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
 * Giriş: e-posta kodu veya şifre
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
    if (MailApp.getRemainingDailyQuota() < 1) throw hata_('Sistemin bugünkü e-posta gönderim sınırı doldu. Şifreniz varsa şifreyle giriş yapabilirsiniz.');
    const kod = guvenliKod_();
    const sifre = v.amac === 'sifre';
    cache.put('kod:' + ozet_(eposta), JSON.stringify({ h: ozet_(kod + '|' + eposta), d: 0 }), AYAR.KOD_DAKIKA * 60);
    MailApp.sendEmail({
      to: eposta,
      name: AYAR.UYGULAMA_ADI,
      subject: kod + ' — ' + AYAR.UYGULAMA_ADI + (sifre ? ' şifre sıfırlama kodunuz' : ' giriş kodunuz'),
      htmlBody: epostaSablonu_(sifre ? 'Şifre sıfırlama' : 'Giriş kodunuz',
        '<p>Merhaba ' + html_(hedef.ad) + ',</p><p>' + (sifre
          ? AYAR.UYGULAMA_ADI + ' hesabınız için şifre sıfırlama isteği aldık. Yeni şifrenizi belirlemek için bu kodu girin:'
          : AYAR.UYGULAMA_ADI + ' giriş kodunuz:') + '</p>' +
        '<p style="font-size:28px;font-weight:700;letter-spacing:6px;margin:16px 0">' + kod + '</p>' +
        '<p>Kod ' + AYAR.KOD_DAKIKA + ' dakika geçerlidir. Bu isteği siz yapmadıysanız e-postayı yok sayabilirsiniz; ' +
        (sifre ? 'şifreniz değişmez.' : 'hesabınıza kimse giremez.') + '</p>')
    });
  }
  return { gonderildi: true };
}

// E-postaya giden tek kullanımlık kodu doğrular; başarılıysa kod silinir.
function kodDogrula_(eposta, kod) {
  kod = String(kod || '').replace(/\D/g, '');
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
  // Kodla doğrulama "şifremi unuttum" yolu da olduğu için şifre deneme kilidi kalkar.
  cache.remove('sk:' + ozet_(eposta));
}

function girisYap_(v) {
  const eposta = epostaDuzenle_(v.eposta);
  kodDogrula_(eposta, v.kod);
  const hedef = girisHedefi_(eposta);
  if (!hedef) throw hata_('Giriş yapılamadı.');
  const kim = kimlikBul_(eposta);
  return girisSonucu_(eposta, hedef, !!v.hatirla, { sifreVar: !!kim, degistirmeli: !!(kim && kim.degistirmeli) });
}

function girisSonucu_(eposta, hedef, hatirla, ek) {
  const token = oturumOlustur_(eposta, hedef.rol, hedef.id, hatirla);
  if (hedef.rol !== 'admin') sonGirisYaz_(hedef.id);
  return Object.assign({ token: token, rol: hedef.rol, id: hedef.id, ad: hedef.ad, eposta: eposta }, ek);
}

// Şifremi unuttum: e-postaya gelen kodla yeni şifre belirlenir ve kullanıcı giriş yapmış olur.
function sifreYenile_(v) {
  const eposta = epostaDuzenle_(v.eposta);
  const sifre = String(v.sifre || '');
  if (sifre.length < 6) throw dogrulamaHatasi_({ sifre: 'Şifre en az 6 karakter olmalıdır.' });
  if (sifre.length > 64) throw dogrulamaHatasi_({ sifre: 'Şifre en fazla 64 karakter olabilir.' });
  kodDogrula_(eposta, v.kod);
  const hedef = girisHedefi_(eposta);
  if (!hedef) throw hata_('İşlem tamamlanamadı.');
  kilitle_(function () { kimlikYaz_(eposta, sifre, false); });
  sifreDegistiBildir_(eposta, hedef.ad, 'Şifreniz e-posta doğrulamasıyla değiştirildi.');
  return girisSonucu_(eposta, hedef, !!v.hatirla, { sifreVar: true, degistirmeli: false });
}

function sifreDegistiBildir_(eposta, ad, aciklama) {
  try {
    if (MailApp.getRemainingDailyQuota() < 1) return;
    MailApp.sendEmail({
      to: eposta, name: AYAR.UYGULAMA_ADI,
      subject: AYAR.UYGULAMA_ADI + ' şifreniz değişti',
      htmlBody: epostaSablonu_('Şifreniz değişti',
        '<p>Merhaba ' + html_(ad) + ',</p><p>' + html_(aciklama) + '</p>' +
        '<p>Bu işlemi siz yapmadıysanız giriş ekranındaki <strong>Şifremi unuttum</strong> bağlantısıyla hemen yeni şifre belirleyin ve okul yönetimine haber verin.</p>')
    });
  } catch (e) { console.warn('Şifre bildirimi gönderilemedi: ' + e); }
}

function sifreIleGiris_(v) {
  const eposta = epostaDuzenle_(v.eposta);
  const sifre = String(v.sifre || '');
  const cache = CacheService.getScriptCache();
  const kilit = 'sk:' + ozet_(eposta);
  const say = parseInt(cache.get(kilit) || '0', 10);
  if (say >= AYAR.SIFRE_DENEME_SINIRI) {
    throw hata_('Çok fazla hatalı deneme. ' + AYAR.SIFRE_KILIT_DAKIKA + ' dakika sonra tekrar deneyin ya da e-posta koduyla giriş yapın.');
  }
  const hedef = girisHedefi_(eposta);
  const kim = kimlikBul_(eposta);
  if (!hedef || !kim || sifreOzeti_(sifre, kim.tuz) !== kim.ozet) {
    cache.put(kilit, String(say + 1), AYAR.SIFRE_KILIT_DAKIKA * 60);
    throw hata_('E-posta veya şifre hatalı. Kalan deneme hakkı: ' + Math.max(0, AYAR.SIFRE_DENEME_SINIRI - say - 1));
  }
  cache.remove(kilit);
  return girisSonucu_(eposta, hedef, !!v.hatirla, { sifreVar: true, degistirmeli: !!kim.degistirmeli });
}

function sifreBelirle_(v, izleyen) {
  const sifre = String(v.sifre || '');
  if (sifre.length < 6) throw dogrulamaHatasi_({ sifre: 'Şifre en az 6 karakter olmalıdır.' });
  if (sifre.length > 64) throw dogrulamaHatasi_({ sifre: 'Şifre en fazla 64 karakter olabilir.' });
  const eposta = guncelEposta_(izleyen);
  kilitle_(function () { kimlikYaz_(eposta, sifre, false); });
  return { sifreVar: true };
}

function hesabim_(v, izleyen) {
  const eposta = guncelEposta_(izleyen);
  const kim = kimlikBul_(eposta);
  return { eposta: eposta, rol: izleyen.rol, sifreVar: !!kim, degistirmeli: !!(kim && kim.degistirmeli) };
}

// Yönetici: kullanıcının şifresini kaldırır (e-posta koduyla girip yenisini belirler) ya da geçici şifre verir.
function kullaniciSifre_(v, izleyen) {
  const k = mezunBul_(v.id);
  if (!k || k.durum !== 'onayli') throw hata_('Kayıt bulunamadı.');
  const ad = k.ad + ' ' + k.soyad;
  if (v.islem === 'belirle') {
    const sifre = String(v.sifre || '');
    if (sifre.length < 6) throw dogrulamaHatasi_({ sifre: 'Şifre en az 6 karakter olmalıdır.' });
    if (sifre.length > 64) throw dogrulamaHatasi_({ sifre: 'Şifre en fazla 64 karakter olabilir.' });
    kilitle_(function () { kimlikYaz_(k.eposta, sifre, true); });
    islemKaydet_(izleyen, 'Geçici şifre verme', k.id, ad);
    sifreDegistiBildir_(k.eposta, k.ad, 'Okul yönetimi hesabınıza geçici bir şifre tanımladı. Bu şifreyle ilk girişinizde kendi şifrenizi belirlemeniz istenecek.');
  } else {
    kilitle_(function () { kimlikSilZorla_(k.eposta); });
    islemKaydet_(izleyen, 'Şifre sıfırlama', k.id, ad);
    sifreDegistiBildir_(k.eposta, k.ad, 'Okul yönetimi hesabınızın şifresini sıfırladı. E-posta adresinize gelecek kodla giriş yapıp yeni bir şifre belirleyebilirsiniz.');
  }
  CacheService.getScriptCache().remove('sk:' + ozet_(k.eposta));
  return { sifreVar: v.islem === 'belirle' };
}

function girisHedefi_(eposta) {
  const y = yoneticiler_().filter(function (x) { return x.eposta === eposta; })[0];
  if (y) return { rol: 'admin', id: 'admin', ad: y.ad || 'Yönetici' };
  const k = mezunlariOku_().filter(function (x) { return x.eposta === eposta && x.durum === 'onayli'; })[0];
  return k ? { rol: k.tur === 'ogretmen' ? 'ogretmen' : 'mezun', id: k.id, ad: k.ad + ' ' + k.soyad } : null;
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

function oturumOlustur_(eposta, rol, kimlikId, hatirla) {
  const token = (Utilities.getUuid() + Utilities.getUuid()).replace(/-/g, '');
  const simdi = new Date();
  const sure = hatirla ? AYAR.OTURUM_GUN_HATIRLA * 864e5 : AYAR.OTURUM_SAAT_KISA * 36e5;
  const bitis = new Date(simdi.getTime() + sure);
  kilitle_(function () {
    const sh = sayfa_(SAYFA.OTURUM);
    // Süresi dolmuş oturumları ara sıra temizle
    const son = sh.getLastRow();
    if (son > 1 && Math.random() < 0.2) {
      const v = sh.getRange(2, 1, son - 1, 6).getValues();
      for (let i = v.length - 1; i >= 0; i--) if (new Date(v[i][5]) < simdi) sh.deleteRow(i + 2);
    }
    satirEkle_(sh, [ozet_(token), eposta, rol, kimlikId, simdi.toISOString(), bitis.toISOString()]);
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

  // Yetki hâlâ geçerli mi? (yönetici listeden çıkarıldıysa / kullanıcı silindiyse oturum düşer)
  if (o.rol === 'admin') {
    if (!yoneticiMi_(o.eposta)) throw oturumHatasi_();
  } else {
    // Her istekte tüm sayfayı okumamak için kullanıcının durumu kısa süre önbellekte tutulur.
    const ck = 'u:' + o.id;
    let u = cache.get(ck);
    if (u) u = JSON.parse(u);
    else {
      const k = mezunBul_(o.id);
      u = k ? { d: k.durum, t: k.tur } : { d: 'yok' };
      cache.put(ck, JSON.stringify(u), 120);
    }
    if (u.d !== 'onayli') throw oturumHatasi_();
    o.rol = u.t === 'ogretmen' ? 'ogretmen' : 'mezun';
  }
  return o;
}

function kullaniciOnbellegiSil_(id) { CacheService.getScriptCache().remove('u:' + id); }

function sonGirisYaz_(id) {
  try {
    kilitle_(function () {
      const k = mezunBul_(id);
      if (k) sayfa_(SAYFA.MEZUN).getRange(k._satir, SUTUNLAR.indexOf('sonGiris') + 1).setNumberFormat('@').setValue(new Date().toISOString());
    });
  } catch (e) { console.warn('Son giriş yazılamadı: ' + e); }
}

function cevrimiciIdler_(idler) {
  if (!idler.length) return {};
  const v = CacheService.getScriptCache().getAll(idler.map(function (id) { return 'cg:' + id; }));
  const sinir = Date.now() - AYAR.CEVRIMICI_DAKIKA * 6e4;
  const o = {};
  Object.keys(v).forEach(function (a) { if (+v[a] >= sinir) o[a.slice(3)] = +v[a]; });
  return o;
}

function cevrimiciListesi_() {
  return Object.keys(cevrimiciIdler_(mezunlariOku_().filter(function (k) { return k.durum === 'onayli'; })
    .map(function (k) { return k.id; })));
}

// Kullanıcı profilinden e-postasını değiştirmiş olabilir; şifre kaydı güncel adrese bağlanır.
function guncelEposta_(izleyen) {
  if (izleyen.rol === 'admin') return izleyen.eposta;
  const k = mezunBul_(izleyen.id);
  return k ? k.eposta : izleyen.eposta;
}

/* =========================================================================
 * Mezun ve öğretmen işlemleri
 * ========================================================================= */

function rehber_(v, izleyen) {
  const liste = mezunlariOku_().filter(function (k) { return k.durum === 'onayli'; });
  const cevrimici = izleyen.rol === 'admin' ? cevrimiciIdler_(liste.map(function (k) { return k.id; })) : {};
  return liste.map(function (k) {
    const s = maskele_(k, izleyen);
    if (izleyen.rol === 'admin') s.cevrimici = !!cevrimici[k.id];
    return s;
  });
}

function mezun_(v, izleyen) {
  const k = mezunBul_(v.id);
  if (!k || (k.durum !== 'onayli' && izleyen.rol !== 'admin')) throw hata_('Kayıt bulunamadı.');
  const s = maskele_(k, izleyen);
  if (izleyen.rol === 'admin') s.sifreVar = !!kimlikBul_(k.eposta);
  return s;
}

function profilKaydet_(v, izleyen) {
  const id = String(v.id || '');
  if (izleyen.rol !== 'admin' && izleyen.id !== id) throw hata_('Yalnızca kendi bilgilerinizi değiştirebilirsiniz.');
  return kilitle_(function () {
    const k = mezunBul_(id);
    if (!k) throw hata_('Kayıt bulunamadı.');
    // Kaydın türü (mezun/öğretmen) bu ekrandan değiştirilemez. Mezun kendi profilini kaydederken tüm alanlar zorunludur.
    const d = dogrula_(Object.assign({}, v, { tur: k.tur }), izleyen.rol !== 'admin');
    if (!d.hatalar.eposta && epostaKullanimda_(d.temiz.eposta, id)) d.hatalar.eposta = 'Bu e-posta başka bir kayıtta kullanılıyor.';
    if (Object.keys(d.hatalar).length) throw dogrulamaHatasi_(d.hatalar);
    const eskiEposta = k.eposta;
    Object.assign(k, d.temiz, { guncelleme: new Date().toISOString() });
    mezunYaz_(k);
    if (eskiEposta !== k.eposta) kimlikEpostaDegistir_(eskiEposta, k.eposta);
    kullaniciOnbellegiSil_(id);
    if (izleyen.rol === 'admin') islemKaydet_(izleyen, 'Düzenleme', id, k.ad + ' ' + k.soyad);
    return maskele_(k, izleyen);
  });
}

// Herkese açık mezun başvurusu (yönetici onayına düşer).
function kayitOl_(v) {
  if (v.web) return { durum: 'beklemede' }; // robot tuzağı: görünmez alan doldurulmuş
  const d = dogrula_(Object.assign({}, v, { tur: 'mezun' }), true);
  if (!v.kvkkOnay) d.hatalar.kvkk = 'Devam etmek için açık rıza onayı gereklidir.';
  return kilitle_(function () {
    // Daha önce reddedilmiş bir başvuru varsa yeni başvuru onun yerine geçer.
    const eski = mezunlariOku_().filter(function (k) { return k.eposta === d.temiz.eposta; })[0];
    if (!d.hatalar.eposta && (eski && eski.durum !== 'reddedildi' || yoneticiMi_(d.temiz.eposta))) d.hatalar.eposta = 'Bu e-posta ile zaten bir kayıt var.';
    if (Object.keys(d.hatalar).length) throw dogrulamaHatasi_(d.hatalar);
    if (eski) sayfa_(SAYFA.MEZUN).deleteRow(eski._satir);
    const cache = CacheService.getScriptCache();
    const say = parseInt(cache.get('basvuru-saat') || '0', 10);
    if (say >= AYAR.SAATLIK_BASVURU_SINIRI) throw hata_('Şu anda çok fazla başvuru var. Lütfen biraz sonra tekrar deneyin.');
    cache.put('basvuru-saat', String(say + 1), 3600);
    const bekleyen = mezunlariOku_().filter(function (k) { return k.durum === 'beklemede'; }).length;
    if (bekleyen >= AYAR.BEKLEYEN_SINIRI) throw hata_('Başvurular geçici olarak kapalı. Lütfen daha sonra tekrar deneyin.');
    const simdi = new Date().toISOString();
    const k = Object.assign({ id: yeniId_('M') }, d.temiz, {
      durum: 'beklemede', kvkkOnay: simdi, kayitTarihi: simdi, guncelleme: simdi, silmeTalebi: ''
    });
    satirEkle_(sayfa_(SAYFA.MEZUN), kayittanSatir_(k));
    if (AYAR.YENI_BASVURU_BILDIRIMI) yoneticilereBildir_(k);
    return { id: k.id, durum: k.durum };
  });
}

// Yöneticinin elle eklediği mezun veya öğretmen; doğrudan onaylı olur.
function kullaniciEkle_(v, izleyen) {
  const tur = v.tur === 'ogretmen' ? 'ogretmen' : 'mezun';
  const d = dogrula_(Object.assign({}, v, { tur: tur }));
  const sonuc = kilitle_(function () {
    // Yöneticinin kendisi de rehbere öğretmen olarak eklenebilir; bu yüzden yalnızca kayıtlar denetlenir.
    if (!d.hatalar.eposta && mezunlariOku_().some(function (k) { return k.eposta === d.temiz.eposta; })) {
      d.hatalar.eposta = 'Bu e-posta ile zaten bir kayıt var.';
    }
    if (Object.keys(d.hatalar).length) throw dogrulamaHatasi_(d.hatalar);
    const simdi = new Date().toISOString();
    const k = Object.assign({ id: yeniId_(tur === 'ogretmen' ? 'T' : 'M') }, d.temiz, {
      durum: 'onayli', kvkkOnay: '', kayitTarihi: simdi, guncelleme: simdi, silmeTalebi: ''
    });
    satirEkle_(sayfa_(SAYFA.MEZUN), kayittanSatir_(k));
    const yonetici = tur === 'ogretmen' && !!v.yonetici;
    if (yonetici && !yoneticiMi_(k.eposta)) yoneticiEkle_(k.eposta, k.ad + ' ' + k.soyad);
    islemKaydet_(izleyen, tur === 'ogretmen' ? 'Öğretmen ekleme' : 'Mezun ekleme', k.id,
      k.ad + ' ' + k.soyad + (yonetici ? ' (yönetici yetkisiyle)' : ''));
    return { k: k, yonetici: yonetici };
  });
  let bilgilendirildi = false;
  if (v.bilgilendir !== false && MailApp.getRemainingDailyQuota() > 0) {
    const k = sonuc.k;
    MailApp.sendEmail({
      to: k.eposta, name: AYAR.UYGULAMA_ADI,
      subject: AYAR.UYGULAMA_ADI + '’e eklendiniz',
      htmlBody: epostaSablonu_(AYAR.UYGULAMA_ADI + '’e hoş geldiniz',
        '<p>Merhaba ' + html_(k.ad) + ',</p><p>' + AYAR.OKUL_ADI + ' mezun ağı ' + AYAR.UYGULAMA_ADI + '’e ' +
        (tur === 'ogretmen' ? '<strong>öğretmen</strong>' : 'mezun') + ' olarak eklendiniz' +
        (sonuc.yonetici ? ' ve size <strong>yönetici</strong> yetkisi verildi' : '') + '.</p>' +
        '<p><strong>Nasıl giriş yaparım?</strong></p><ol style="padding-left:20px">' +
        '<li>Aşağıdaki bağlantıyı telefonunuzda açın.</li>' +
        '<li>E-posta adresinizi (' + html_(k.eposta) + ') yazın; adresinize 6 haneli bir giriş kodu gelir.</li>' +
        '<li>Kodu girin. İsterseniz ardından bir giriş şifresi belirleyip uygulamayı telefonunuzun ana ekranına ekleyebilirsiniz.</li></ol>' +
        '<p>Lütfen ilk girişte profilinizdeki bilgileri kontrol edip eksikleri tamamlayın.</p>' +
        (AYAR.UYGULAMA_ADRESI ? '<p><a href="' + AYAR.UYGULAMA_ADRESI + '">' + AYAR.UYGULAMA_ADI + '’e git</a></p>' : ''))
    });
    bilgilendirildi = true;
  }
  return { id: sonuc.k.id, durum: 'onayli', yonetici: sonuc.yonetici, bilgilendirildi: bilgilendirildi };
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

function reddedilenler_(v, izleyen) {
  return mezunlariOku_().filter(function (k) { return k.durum === 'reddedildi'; })
    .map(function (k) { return maskele_(k, izleyen); });
}

// Reddedilen başvuru hemen silinmez; RED_SAKLAMA_GUN boyunca geri alınabilir.
function reddet_(v, izleyen) {
  return kilitle_(function () {
    const k = mezunBul_(v.id);
    if (!k || k.durum !== 'beklemede') throw hata_('Bekleyen başvuru bulunamadı.');
    k.durum = 'reddedildi';
    k.redTarihi = new Date().toISOString();
    mezunYaz_(k);
    kullaniciOnbellegiSil_(k.id);
    islemKaydet_(izleyen, 'Başvuru reddi', k.id, '');
    return { durum: k.durum, silinecek: new Date(Date.now() + AYAR.RED_SAKLAMA_GUN * 864e5).toISOString() };
  });
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
    const geriAlma = k.durum === 'reddedildi';
    k.durum = 'onayli';
    k.redTarihi = '';
    mezunYaz_(k);
    kullaniciOnbellegiSil_(k.id);
    islemKaydet_(izleyen, geriAlma ? 'Red geri alındı, onay' : 'Onay', k.id, k.ad + ' ' + k.soyad);
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
    kullaniciOnbellegiSil_(k.id);
    // Silinen öğretmenin yönetici yetkisi de kalkar (kendi yetkisini ve son yöneticiyi silmek hariç).
    if (k.tur === 'ogretmen' && k.eposta !== izleyen.eposta && yoneticiler_().length > 1) yoneticiSil_(k.eposta);
    kimlikSil_(k.eposta);
    // Kişisel veri işlem kaydına yazılmaz; yalnızca ID ve işlem türü tutulur.
    islemKaydet_(izleyen, k.durum === 'onayli' ? (k.silmeTalebi ? 'KVKK silme' : 'Silme') : 'Başvuru silme', k.id, '');
    return { silindi: true };
  });
}

function yoneticiListesi_() {
  return yoneticiler_().map(function (y) { return { eposta: y.eposta, ad: y.ad }; });
}

function istatistik_() {
  const tum = mezunlariOku_();
  const onayli = tum.filter(function (k) { return k.durum === 'onayli'; });
  const mezunlar = onayli.filter(function (k) { return k.tur !== 'ogretmen'; });
  const yillar = {}, sehirler = {};
  const buYil = new Date().getFullYear();
  for (let y = AYAR.ILK_YIL; y <= buYil; y++) yillar[y] = 0;
  let tel = 0, ep = 0;
  mezunlar.forEach(function (k) {
    if (k.yil) yillar[k.yil] = (yillar[k.yil] || 0) + 1;
    const s = k.sehir || 'Belirtilmemiş';
    sehirler[s] = (sehirler[s] || 0) + 1;
    if (k.gorunurluk.telefon) tel++;
    if (k.gorunurluk.eposta) ep++;
  });
  return {
    toplam: mezunlar.length,
    ogretmen: onayli.length - mezunlar.length,
    bekleyen: tum.filter(function (k) { return k.durum === 'beklemede'; }).length,
    reddedilen: tum.filter(function (k) { return k.durum === 'reddedildi'; }).length,
    silmeTalebi: tum.filter(function (k) { return k.silmeTalebi; }).length,
    telefonPaylasan: tel, epostaPaylasan: ep,
    epostaKotasi: MailApp.getRemainingDailyQuota(),
    yillar: Object.keys(yillar).map(function (y) { return { yil: +y, adet: yillar[y] }; }),
    sehirler: Object.keys(sehirler).map(function (s) { return { sehir: s, adet: sehirler[s] }; })
      .sort(function (a, b) { return b.adet - a.adet; })
  };
}

function csv_(v, izleyen) {
  const b = ['Tür', 'Ad', 'Soyad', 'Mezuniyet Yılı', 'Çalışma Durumu', 'Üniversite', 'Bölüm', 'Meslek', 'Kurum', 'Branş / Uzmanlık', 'Şehir', 'Telefon', 'E-posta', 'Durum', 'Son Giriş', 'Son Güncelleme'];
  const calismaAdi = { calisiyor: 'Çalışıyor', calismiyor: 'Çalışmıyor', ogrenci: 'Öğrenci' };
  const durumAdi = { onayli: 'Onaylı', beklemede: 'Onay bekliyor', reddedildi: 'Reddedildi' };
  const hucre = function (x) {
    let s = String(x == null ? '' : x);
    if (/^[=+\-@]/.test(s)) s = "'" + s;
    return '"' + s.replace(/"/g, '""') + '"';
  };
  const satirlar = mezunlariOku_().map(function (k) {
    return [k.tur === 'ogretmen' ? 'Öğretmen' : 'Mezun', k.ad, k.soyad, k.yil || '', calismaAdi[k.calisma] || '', k.universite, k.bolum,
      k.meslek, k.kurum, k.brans, k.sehir, k.telefon, k.eposta, durumAdi[k.durum], String(k.sonGiris).slice(0, 10),
      String(k.guncelleme).slice(0, 10)].map(hucre).join(';');
  });
  islemKaydet_(izleyen, 'CSV dışa aktarma', '', satirlar.length + ' kayıt');
  return '﻿' + [b.map(hucre).join(';')].concat(satirlar).join('\r\n');
}

/* =========================================================================
 * Duyurular
 * ========================================================================= */

function duyurular_(v, izleyen) {
  const simdi = new Date();
  const liste = duyurulariOku_();
  if (izleyen.rol === 'admin') {
    const kuyruk = kuyrukOzeti_();
    return liste.map(function (d) {
      return Object.assign(duyuruCikti_(d), { durum: duyuruDurumu_(d, simdi), epostaDurumu: kuyruk[d.id] || null });
    }).sort(function (a, b) { return String(b.olusturma).localeCompare(String(a.olusturma)); });
  }
  return liste
    .filter(function (d) { return duyuruDurumu_(d, simdi) === 'aktif' && (d.hedef === 'herkes' || d.hedef === izleyen.rol); })
    .map(duyuruCikti_)
    .sort(function (a, b) { return String(b.baslangic).localeCompare(String(a.baslangic)); });
}

function duyuruKaydet_(v, izleyen) {
  const h = {};
  const metin = function (x, n) { return String(x == null ? '' : x).trim().slice(0, n); };
  const d = {
    baslik: metin(v.baslik, 120),
    metin: String(v.metin == null ? '' : v.metin).replace(/\r\n/g, '\n').trim().slice(0, 4000),
    tur: DUYURU_TURLERI.indexOf(v.tur) >= 0 ? v.tur : 'bilgi',
    hedef: HEDEFLER.indexOf(v.hedef) >= 0 ? v.hedef : 'herkes',
    baglantiMetni: metin(v.baglantiMetni, 40),
    baglantiUrl: metin(v.baglantiUrl, 500),
    baslangic: new Date(v.baslangic),
    bitis: new Date(v.bitis),
    eposta: !!v.eposta,
    bildirimIste: v.bildirim !== false
  };
  if (!d.baslik) h.baslik = 'Başlık zorunludur.';
  if (!d.metin) h.metin = 'Duyuru metni zorunludur.';
  if (d.baglantiUrl && !/^https?:\/\/[^\s]+$/i.test(d.baglantiUrl)) h.baglantiUrl = 'Bağlantı http:// veya https:// ile başlamalıdır.';
  if (isNaN(d.baslangic.getTime())) h.baslangic = 'Geçerli bir başlangıç tarihi seçin.';
  if (isNaN(d.bitis.getTime())) h.bitis = 'Geçerli bir bitiş tarihi seçin.';
  else if (!h.baslangic && d.bitis <= d.baslangic) h.bitis = 'Bitiş, başlangıçtan sonra olmalıdır.';
  else if (d.bitis <= new Date()) h.bitis = 'Bitiş tarihi geçmişte olamaz.';
  if (Object.keys(h).length) throw dogrulamaHatasi_(h);
  if (d.baglantiUrl && !d.baglantiMetni) d.baglantiMetni = 'Ayrıntılar';

  const kayit = kilitle_(function () {
    const simdi = new Date().toISOString();
    let mevcut = v.id ? duyurulariOku_().filter(function (x) { return x.id === String(v.id); })[0] : null;
    if (v.id && !mevcut) throw hata_('Duyuru bulunamadı.');
    const k = Object.assign({}, mevcut || { id: yeniId_('D'), olusturan: izleyen.eposta, olusturma: simdi }, d, {
      baslangic: d.baslangic.toISOString(), bitis: d.bitis.toISOString(), guncelleme: simdi,
      // E-posta bir kez kuyruğa alındıysa geri alınmaz; telefon bildirimi bir kez gönderilir.
      eposta: d.eposta || (mevcut ? mevcut.eposta : false),
      bildirim: mevcut && /^\d{4}-/.test(mevcut.bildirim) ? mevcut.bildirim : (d.bildirimIste ? 'bekliyor' : 'yok')
    });
    delete k.bildirimIste;
    const sh = sayfa_(SAYFA.DUYURU);
    const satir = DUYURU_SUTUNLAR.map(function (s) { return s === 'eposta' ? (k.eposta ? 'EVET' : 'HAYIR') : guvenliHucre_(k[s]); });
    if (mevcut) sh.getRange(mevcut._satir, 1, 1, satir.length).setNumberFormat('@').setValues([satir]);
    else satirEkle_(sh, satir);
    if (k.eposta && (!mevcut || !mevcut.eposta)) kuyrugaEkle_(k);
    islemKaydet_(izleyen, mevcut ? 'Duyuru düzenleme' : 'Duyuru', k.id, k.baslik);
    return k;
  });
  if (kayit.eposta) { try { kuyrukIsle(); } catch (e) { console.warn('Kuyruk işlenemedi: ' + e); } }
  if (kayit.bildirim === 'bekliyor' && duyuruDurumu_(kayit, new Date()) === 'aktif') {
    try { duyuruBildirimi_(kayit); } catch (e) { console.warn('Telefon bildirimi gönderilemedi: ' + e); }
  }
  return Object.assign(duyuruCikti_(kayit), { durum: duyuruDurumu_(kayit, new Date()), epostaDurumu: kuyrukOzeti_()[kayit.id] || null });
}

function duyuruSil_(v, izleyen) {
  return kilitle_(function () {
    const d = duyurulariOku_().filter(function (x) { return x.id === String(v.id); })[0];
    if (!d) throw hata_('Duyuru bulunamadı.');
    sayfa_(SAYFA.DUYURU).deleteRow(d._satir);
    kuyrukIptal_(d.id);
    islemKaydet_(izleyen, 'Duyuru silme', d.id, d.baslik);
    return { silindi: true };
  });
}

function duyurulariOku_() {
  const sh = sayfa_(SAYFA.DUYURU);
  const son = sh.getLastRow();
  if (son < 2) return [];
  return sh.getRange(2, 1, son - 1, DUYURU_SUTUNLAR.length).getValues().map(function (r, i) {
    const d = { _satir: i + 2 };
    DUYURU_SUTUNLAR.forEach(function (s, j) { d[s] = r[j] instanceof Date ? r[j].toISOString() : String(r[j] == null ? '' : r[j]); });
    d.eposta = /^(evet|true)$/i.test(d.eposta);
    return d;
  }).filter(function (d) { return d.id; });
}

function duyuruDurumu_(d, simdi) {
  if (simdi < new Date(d.baslangic)) return 'planli';
  if (simdi > new Date(d.bitis)) return 'bitti';
  return 'aktif';
}

function duyuruCikti_(d) {
  return {
    id: d.id, baslik: d.baslik, metin: d.metin, tur: d.tur, hedef: d.hedef,
    baglantiMetni: d.baglantiMetni, baglantiUrl: d.baglantiUrl,
    baslangic: d.baslangic, bitis: d.bitis, eposta: d.eposta, olusturma: d.olusturma, bildirim: d.bildirim
  };
}

/* ---------- duyuru e-posta kuyruğu ---------- */

function kuyrugaEkle_(d) {
  const sh = sayfa_(SAYFA.KUYRUK);
  const alicilar = mezunlariOku_().filter(function (k) {
    return k.durum === 'onayli' && k.eposta && (d.hedef === 'herkes' || d.hedef === k.tur);
  }).map(function (k) { return k.eposta; });
  if (!alicilar.length) return;
  const satirlar = alicilar.map(function (e) { return [d.id, e, 'bekliyor', '']; });
  const r = sh.getRange(sh.getLastRow() + 1, 1, satirlar.length, 4);
  r.setNumberFormat('@').setValues(satirlar);
}

function kuyrukIptal_(duyuruId) {
  const sh = sayfa_(SAYFA.KUYRUK);
  const son = sh.getLastRow();
  if (son < 2) return;
  const r = sh.getRange(2, 1, son - 1, 4);
  const v = r.getValues();
  let degisti = false;
  v.forEach(function (s) { if (s[0] === duyuruId && s[2] === 'bekliyor') { s[2] = 'iptal'; degisti = true; } });
  if (degisti) r.setValues(v);
}

function kuyrukOzeti_() {
  const sh = sayfa_(SAYFA.KUYRUK);
  const son = sh.getLastRow();
  const o = {};
  if (son < 2) return o;
  sh.getRange(2, 1, son - 1, 3).getValues().forEach(function (s) {
    const id = String(s[0]);
    o[id] = o[id] || { toplam: 0, gonderilen: 0, bekleyen: 0 };
    if (s[2] === 'iptal') return;
    o[id].toplam++;
    if (s[2] === 'gonderildi') o[id].gonderilen++;
    if (s[2] === 'bekliyor') o[id].bekleyen++;
  });
  return o;
}

// Saatlik tetikleyiciyle çalışır: günlük kotanın izin verdiği kadar duyuru e-postası gönderir.
function kuyrukIsle() {
  const kilit = LockService.getScriptLock();
  if (!kilit.tryLock(10000)) return;
  try {
    try { redTemizle_(); } catch (e) { console.warn('Red temizliği: ' + e); }
    kuyrukGonder_();
  } finally { kilit.releaseLock(); }
  // Yayın saati gelmiş, telefon bildirimi henüz gitmemiş duyurular
  const simdi = new Date();
  duyurulariOku_().forEach(function (d) {
    if (d.bildirim === 'bekliyor' && duyuruDurumu_(d, simdi) === 'aktif') {
      try { duyuruBildirimi_(d); } catch (e) { console.warn('Telefon bildirimi: ' + e); }
    }
  });
}

// Saklama süresi dolan reddedilmiş başvurular kalıcı olarak silinir.
function redTemizle_() {
  const sinir = Date.now() - AYAR.RED_SAKLAMA_GUN * 864e5;
  const sh = sayfa_(SAYFA.MEZUN);
  mezunlariOku_().filter(function (k) { return k.durum === 'reddedildi' && k.redTarihi && new Date(k.redTarihi).getTime() < sinir; })
    .sort(function (a, b) { return b._satir - a._satir; })
    .forEach(function (k) { sh.deleteRow(k._satir); islemKaydet_(null, 'Reddedilen başvuru süresi doldu, silindi', k.id, ''); });
}

function kuyrukGonder_() {
  const sh = sayfa_(SAYFA.KUYRUK);
  const son = sh.getLastRow();
  if (son < 2) return;
  let kota = MailApp.getRemainingDailyQuota() - AYAR.EPOSTA_REZERV;
  const r = sh.getRange(2, 1, son - 1, 4);
  const v = r.getValues();
  const simdi = new Date();
  const duyurular = {};
  duyurulariOku_().forEach(function (d) { duyurular[d.id] = d; });
  const gruplar = {};
  v.forEach(function (s, i) {
    if (s[2] !== 'bekliyor') return;
    const d = duyurular[s[0]];
    if (!d || duyuruDurumu_(d, simdi) === 'bitti') { s[2] = 'iptal'; return; }
    if (duyuruDurumu_(d, simdi) === 'planli') return; // yayın başlayınca gönderilir
    (gruplar[s[0]] = gruplar[s[0]] || []).push(i);
  });
  const gonderen = Session.getEffectiveUser().getEmail();
  Object.keys(gruplar).forEach(function (id) {
    const d = duyurular[id];
    const sira = gruplar[id];
    while (sira.length && kota > 1) {
      const parca = sira.splice(0, Math.min(AYAR.EPOSTA_GRUP, kota - 1));
      MailApp.sendEmail({
        to: gonderen, bcc: parca.map(function (i) { return v[i][1]; }).join(','),
        name: AYAR.UYGULAMA_ADI,
        subject: (d.tur === 'onemli' ? 'Önemli: ' : '') + d.baslik + ' — ' + AYAR.UYGULAMA_ADI,
        htmlBody: duyuruEpostasi_(d)
      });
      const t = new Date().toISOString();
      parca.forEach(function (i) { v[i][2] = 'gonderildi'; v[i][3] = t; });
      kota -= parca.length + 1;
    }
  });
  r.setValues(v);
}

function duyuruEpostasi_(d) {
  const paragraflar = String(d.metin).split(/\n{2,}/).map(function (p) {
    return '<p>' + html_(p).replace(/\n/g, '<br>') + '</p>';
  }).join('');
  return epostaSablonu_(html_(d.baslik), paragraflar +
    (d.baglantiUrl ? '<p><a href="' + html_(d.baglantiUrl) + '" style="display:inline-block;background:#0f286a;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none">' + html_(d.baglantiMetni || 'Ayrıntılar') + '</a></p>' : '') +
    (AYAR.UYGULAMA_ADRESI ? '<p style="font-size:13px;color:#6b7385">Tüm duyurular için <a href="' + AYAR.UYGULAMA_ADRESI + '#/duyurular">' + AYAR.UYGULAMA_ADI + '</a>’e giriş yapabilirsiniz.</p>' : ''));
}

/* =========================================================================
 * Telefon bildirimleri (Web Push, VAPID)
 *
 * Bildirim içeriksiz gönderilir; telefondaki uygulama bildirimi alınca güncel
 * duyuruyu kendisi çeker. Böylece şifreleme gerekmez ve duyuru metni üçüncü
 * taraf sunuculardan geçmez. İmza anahtarı ilk kurulumda burada üretilir ve
 * yalnızca betik özelliklerinde saklanır.
 * ========================================================================= */

const PUSH_SUNUCULARI = /^https:\/\/(fcm\.googleapis\.com|android\.googleapis\.com|updates\.push\.services\.mozilla\.com|[a-z0-9.-]+\.push\.apple\.com|[a-z0-9.-]+\.notify\.windows\.com)\//;

function pushAnahtari_() { return { anahtar: vapidAnahtari_().pub }; }

function pushKaydet_(v, izleyen) {
  const uc = String(v.endpoint || '');
  if (!PUSH_SUNUCULARI.test(uc) || uc.length > 1000) throw hata_('Bu tarayıcının bildirim adresi desteklenmiyor.');
  kilitle_(function () {
    const sh = sayfa_(SAYFA.BILDIRIM);
    const son = sh.getLastRow();
    const satirlar = son > 1 ? sh.getRange(2, 1, son - 1, 4).getValues() : [];
    for (let i = satirlar.length - 1; i >= 0; i--) if (satirlar[i][2] === uc) sh.deleteRow(i + 2);
    // Bir kişinin en fazla 5 cihazı kayıtlı kalır
    const kendi = [];
    sh.getRange(2, 1, Math.max(sh.getLastRow() - 1, 1), 1).getValues().forEach(function (r, i) { if (r[0] === izleyen.id) kendi.push(i + 2); });
    while (kendi.length >= 5) sh.deleteRow(kendi.shift());
    satirEkle_(sh, [izleyen.id, izleyen.rol, uc, new Date().toISOString()]);
  });
  return { kayitli: true };
}

function pushSil_(v) {
  const uc = String(v.endpoint || '');
  if (!uc) return { silindi: false };
  kilitle_(function () { bildirimAboneSil_([uc]); });
  return { silindi: true };
}

function bildirimAboneSil_(uclar) {
  const sh = sayfa_(SAYFA.BILDIRIM);
  const son = sh.getLastRow();
  if (son < 2) return;
  const v = sh.getRange(2, 3, son - 1, 1).getValues();
  for (let i = v.length - 1; i >= 0; i--) if (uclar.indexOf(v[i][0]) >= 0) sh.deleteRow(i + 2);
}

// Duyurunun hedef kitlesindeki tüm kayıtlı cihazlara bildirim gönderir.
function duyuruBildirimi_(d) {
  const roller = d.hedef === 'herkes' ? null : [d.hedef, 'admin'];
  const sh = sayfa_(SAYFA.BILDIRIM);
  const son = sh.getLastRow();
  const uclar = son < 2 ? [] : sh.getRange(2, 1, son - 1, 3).getValues()
    .filter(function (r) { return r[2] && (!roller || roller.indexOf(String(r[1])) >= 0); })
    .map(function (r) { return String(r[2]); });
  const sonuc = pushGonder_(uclar);
  // Duyurunun bildirim durumu "gönderildi" olarak işaretlenir
  kilitle_(function () {
    const g = duyurulariOku_().filter(function (x) { return x.id === d.id; })[0];
    if (g) sayfa_(SAYFA.DUYURU).getRange(g._satir, DUYURU_SUTUNLAR.indexOf('bildirim') + 1).setNumberFormat('@').setValue(new Date().toISOString());
    if (sonuc.gecersiz.length) bildirimAboneSil_(sonuc.gecersiz);
  });
  return sonuc;
}

function pushGonder_(uclar) {
  const sonuc = { gonderilen: 0, gecersiz: [] };
  if (!uclar.length) return sonuc;
  const anahtar = vapidAnahtari_();
  for (let i = 0; i < uclar.length; i += 50) {
    const parca = uclar.slice(i, i + 50);
    const istekler = parca.map(function (uc) {
      return {
        url: uc, method: 'post', muteHttpExceptions: true, payload: '',
        headers: { Authorization: 'vapid t=' + vapidJwt_(uc.split('/').slice(0, 3).join('/'), anahtar) + ', k=' + anahtar.pub, TTL: '86400', Urgency: 'high' }
      };
    });
    UrlFetchApp.fetchAll(istekler).forEach(function (y, j) {
      const kod = y.getResponseCode();
      if (kod >= 200 && kod < 300) sonuc.gonderilen++;
      else if (kod === 404 || kod === 410) sonuc.gecersiz.push(parca[j]);
      else console.warn('Bildirim gönderilemedi (' + kod + '): ' + y.getContentText().slice(0, 200));
    });
  }
  return sonuc;
}

function vapidAnahtari_() {
  const ozellik = PropertiesService.getScriptProperties();
  let d = ozellik.getProperty('VAPID_D'), pub = ozellik.getProperty('VAPID_PUB');
  if (!d || !pub) {
    const E = P256_;
    const tohum = hex_(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,
      [Utilities.getUuid(), Utilities.getUuid(), Utilities.getUuid(), Utilities.getUuid(), Date.now()].join('|'), Utilities.Charset.UTF_8));
    const gizli = E.md(BigInt('0x' + tohum), E.n - BigInt(1)) + BigInt(1);
    const Q = E.affine(E.mul(gizli, E.G));
    d = hex32_(gizli);
    pub = b64u_(baytlar_('04' + hex32_(Q[0]) + hex32_(Q[1])));
    ozellik.setProperties({ VAPID_D: d, VAPID_PUB: pub });
  }
  return { d: d, pub: pub };
}

function vapidJwt_(aud, anahtar) {
  const cache = CacheService.getScriptCache();
  const ck = 'vj:' + aud;
  const c = cache.get(ck);
  if (c) return c;
  const ben = Session.getEffectiveUser().getEmail();
  const govde = { aud: aud, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub: ben ? 'mailto:' + ben : AYAR.UYGULAMA_ADRESI };
  const girdi = b64u_('{"typ":"JWT","alg":"ES256"}') + '.' + b64u_(JSON.stringify(govde));
  const jwt = girdi + '.' + es256Imzala_(girdi, anahtar.d);
  cache.put(ck, jwt, 11 * 3600);
  return jwt;
}

function es256Imzala_(girdi, dHex) {
  const E = P256_, B = BigInt;
  const d = B('0x' + dHex);
  const e = B('0x' + hex_(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, girdi, Utilities.Charset.UTF_8)));
  for (let i = 0; i < 10; i++) {
    const kh = hex_(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, dHex + '|' + girdi + '|' + Utilities.getUuid() + '|' + i, Utilities.Charset.UTF_8));
    const k = E.md(B('0x' + kh), E.n - B(1)) + B(1);
    const r = E.md(E.affine(E.mul(k, E.G))[0], E.n);
    if (r === B(0)) continue;
    const s = E.md(E.inv(k, E.n) * (e + r * d), E.n);
    if (s === B(0)) continue;
    return b64u_(baytlar_(hex32_(r) + hex32_(s)));
  }
  throw new Error('İmza üretilemedi.');
}

// NIST P-256 eğrisi üzerinde nokta işlemleri (Jacobian koordinatlar).
const P256_ = (function () {
  const B = BigInt, S0 = B(0), S1 = B(1), S2 = B(2), S3 = B(3), S4 = B(4), S8 = B(8);
  const p = B('0xffffffff00000001000000000000000000000000ffffffffffffffffffffffff');
  const n = B('0xffffffff00000000ffffffffffffffffbce6faada7179e84f3b9cac2fc632551');
  const G = [B('0x6b17d1f2e12c4247f8bce6e563a440f277037d812deb33a0f4a13945d898c296'),
    B('0x4fe342e2fe1a7f9b8ee7eb4a7c0f9e162bce33576b315ececbb6406837bf51f5'), S1];
  function md(a, m) { const r = a % m; return r < S0 ? r + m : r; }
  function inv(a, m) {
    let t0 = S0, t1 = S1, r0 = m, r1 = md(a, m);
    while (r1 !== S0) {
      const q = r0 / r1;
      const t2 = t0 - q * t1; t0 = t1; t1 = t2;
      const r2 = r0 - q * r1; r0 = r1; r1 = r2;
    }
    return md(t0, m);
  }
  function dbl(P) {
    if (!P || P[1] === S0) return null;
    const X = P[0], Y = P[1], Z = P[2];
    const dl = md(Z * Z, p), g = md(Y * Y, p), b = md(X * g, p), a = md(S3 * (X - dl) * (X + dl), p);
    const X3 = md(a * a - S8 * b, p);
    const Z3 = md((Y + Z) * (Y + Z) - g - dl, p);
    const Y3 = md(a * (S4 * b - X3) - S8 * g * g, p);
    return [X3, Y3, Z3];
  }
  function add(P, Q) {
    if (!P) return Q;
    if (!Q) return P;
    const z1z1 = md(P[2] * P[2], p), z2z2 = md(Q[2] * Q[2], p);
    const u1 = md(P[0] * z2z2, p), u2 = md(Q[0] * z1z1, p);
    const s1 = md(P[1] * Q[2] * z2z2, p), s2 = md(Q[1] * P[2] * z1z1, p);
    if (u1 === u2) return s1 === s2 ? dbl(P) : null;
    const h = md(u2 - u1, p), r = md(s2 - s1, p), h2 = md(h * h, p), h3 = md(h * h2, p), u1h2 = md(u1 * h2, p);
    const X3 = md(r * r - h3 - S2 * u1h2, p);
    const Y3 = md(r * (u1h2 - X3) - s1 * h3, p);
    const Z3 = md(h * P[2] * Q[2], p);
    return [X3, Y3, Z3];
  }
  function mul(k, P) {
    let R = null;
    const bitler = k.toString(2);
    for (let i = 0; i < bitler.length; i++) { R = dbl(R); if (bitler.charAt(i) === '1') R = add(R, P); }
    return R;
  }
  function affine(P) {
    const zi = inv(P[2], p), z2 = md(zi * zi, p);
    return [md(P[0] * z2, p), md(P[1] * z2 * zi, p)];
  }
  return { p: p, n: n, G: G, md: md, inv: inv, mul: mul, affine: affine };
})();

function hex_(baytlar) { return baytlar.map(function (b) { return ('0' + ((b + 256) % 256).toString(16)).slice(-2); }).join(''); }
function hex32_(x) { return ('0'.repeat(64) + x.toString(16)).slice(-64); }
function baytlar_(hex) {
  const o = [];
  for (let i = 0; i < hex.length; i += 2) { const v = parseInt(hex.substr(i, 2), 16); o.push(v > 127 ? v - 256 : v); }
  return o;
}
function b64u_(x) { return Utilities.base64EncodeWebSafe(x).replace(/=+$/, ''); }

/* =========================================================================
 * Gizlilik ve doğrulama
 * ========================================================================= */

function maskele_(k, izleyen) {
  const tam = izleyen.rol === 'admin' || izleyen.id === k.id;
  const s = {
    id: k.id, ad: k.ad, soyad: k.soyad, yil: k.yil, tur: k.tur,
    tamYetki: tam, kendisi: izleyen.id === k.id, gizli: []
  };
  // Öğretmenin branşı kimlik bilgisidir; mezunun branşı/uzmanlığı ise meslek bilgisiyle birlikte gizlenir.
  if (k.tur === 'ogretmen') s.brans = k.brans;
  const degerler = {
    egitim: { universite: k.universite, bolum: k.bolum },
    meslek: k.tur === 'ogretmen' ? { meslek: k.meslek } : { meslek: k.meslek, calisma: k.calisma, kurum: k.kurum, brans: k.brans },
    sehir: { sehir: k.sehir }, telefon: { telefon: k.telefon }, eposta: { eposta: k.eposta }
  };
  ALANLAR.forEach(function (a) {
    if (tam || k.gorunurluk[a]) Object.assign(s, degerler[a]);
    else s.gizli.push(a);
  });
  if (tam) {
    Object.assign(s, {
      gorunurluk: Object.assign({}, k.gorunurluk), durum: k.durum, kvkkOnay: k.kvkkOnay,
      kayitTarihi: k.kayitTarihi, guncelleme: k.guncelleme, silmeTalebi: k.silmeTalebi || null,
      sonGiris: k.sonGiris || null, redTarihi: k.redTarihi || null
    });
  }
  return s;
}

// kati: mezunun kendi başvurusu/profili — tüm alanlar zorunlu. Yönetici düzenlemesinde yalnızca temel alanlar zorunlu.
function dogrula_(v, kati) {
  const h = {};
  const metin = function (x, n) { return String(x == null ? '' : x).replace(/\s+/g, ' ').trim().slice(0, n); };
  const buYil = new Date().getFullYear();
  const tur = v.tur === 'ogretmen' ? 'ogretmen' : 'mezun';
  const t = {
    tur: tur, ad: yaziDuzelt_(metin(v.ad, 60), true), soyad: yaziDuzelt_(metin(v.soyad, 60), true),
    yil: tur === 'mezun' ? parseInt(v.yil, 10) : '',
    calisma: tur === 'mezun' && CALISMA.indexOf(v.calisma) >= 0 ? v.calisma : '',
    brans: yaziDuzelt_(metin(v.brans, 60)), kurum: yaziDuzelt_(metin(v.kurum, 120)),
    universite: yaziDuzelt_(metin(v.universite, 120)), bolum: yaziDuzelt_(metin(v.bolum, 120)),
    meslek: yaziDuzelt_(metin(v.meslek, 80)), sehir: yaziDuzelt_(metin(v.sehir, 60)),
    eposta: epostaDuzenle_(v.eposta), telefon: ''
  };
  if (t.calisma === 'ogrenci') { t.meslek = 'Üniversite Öğrencisi'; t.kurum = ''; t.brans = ''; }
  if (t.calisma === 'calismiyor') { t.meslek = ''; t.kurum = ''; t.brans = ''; }
  if (tur === 'ogretmen') t.calisma = '';

  if (!t.ad) h.ad = 'Ad zorunludur.';
  if (!t.soyad) h.soyad = 'Soyad zorunludur.';
  if (tur === 'mezun' && !(t.yil >= AYAR.ILK_YIL && t.yil <= buYil)) h.yil = 'Geçerli bir mezuniyet yılı seçin.';
  if (tur === 'ogretmen' && !t.brans) h.brans = 'Branş zorunludur.';
  if (!gecerliEposta_(t.eposta)) h.eposta = 'Geçerli bir e-posta adresi girin.';
  if (metin(v.telefon, 30)) {
    t.telefon = telefonDuzenle_(v.telefon);
    if (!t.telefon) h.telefon = 'Telefonu 05XX XXX XX XX biçiminde girin.';
  }
  if (kati && tur === 'mezun') {
    const bos = function (a, m) { if (!t[a] && !h[a]) h[a] = m; };
    bos('calisma', 'Çalışma durumunuzu seçin.');
    bos('universite', 'Üniversite zorunludur.');
    bos('bolum', 'Bölüm zorunludur.');
    bos('sehir', 'Yaşadığınız şehri seçin.');
    bos('telefon', 'Telefon zorunludur.');
    if (t.calisma === 'calisiyor') {
      bos('meslek', 'Mesleğinizi yazın.');
      bos('kurum', 'Çalıştığınız kurumu yazın.');
      bos('brans', 'Branş veya uzmanlık alanınızı yazın (yoksa "Genel").');
    }
  }
  const g = v.gorunurluk || {};
  t.gorunurluk = {};
  ALANLAR.forEach(function (a) { t.gorunurluk[a] = !!g[a]; });
  return { temiz: t, hatalar: h };
}

// Türkçe yazım düzeni: "ahmet YILMAZ" → "Ahmet Yılmaz", "orta doğu teknik üniversitesi" → "Orta Doğu Teknik Üniversitesi".
// Kurum adlarında kısaltmalar (ODTÜ, TOBB, ABD) korunur; "ve, ile" gibi bağlaçlar küçük kalır.
function yaziDuzelt_(s, isim) {
  s = String(s || '').trim();
  if (!s) return s;
  const buyuk = function (x) { return x.replace(/i/g, 'İ').replace(/ı/g, 'I').toUpperCase(); };
  const kucuk = function (x) { return x.replace(/I/g, 'ı').replace(/İ/g, 'i').toLowerCase(); };
  const tamamiBuyuk = s === buyuk(s);
  const BAGLAC = ['ve', 'ile', 'veya', 'ya', 'da', 'de', 'ki', 'için', 'of', 'and', 'the', 'for', 'in', 'at'];
  const KISALTMA = ['ODTÜ', 'ODTU', 'İTÜ', 'ITU', 'YTÜ', 'KTÜ', 'DEÜ', 'GTÜ', 'TOBB', 'ETÜ', 'TED', 'ABD', 'KKTC', 'MEB', 'YÖK', 'TRT', 'THY',
    'SGK', 'PTT', 'TCDD', 'AFAD', 'TSK', 'MİT', 'TÜBİTAK', 'ASELSAN', 'HAVELSAN', 'ROKETSAN', 'TUSAŞ', 'BOTAŞ', 'İSKİ', 'ASKİ', 'MIT', 'UCLA', 'NASA', 'CERN', 'IBM'];
  return s.split(' ').map(function (kelime, i) {
    return kelime.split('-').map(function (parca, j) {
      if (!parca) return parca;
      const harfler = parca.replace(/[^A-Za-zÇĞİÖŞÜçğıöşüÂÎÛâîû]/g, '');
      if (!isim && KISALTMA.indexOf(buyuk(harfler)) >= 0) return parca.replace(harfler, buyuk(harfler));
      if (!isim && !tamamiBuyuk && harfler.length >= 2 && harfler.length <= 5 && parca === buyuk(parca)) return parca;
      const k = kucuk(parca);
      if (!isim && (i > 0 || j > 0) && BAGLAC.indexOf(k) >= 0) return k;
      const ilk = k.search(/[a-zçğıöşüâîû0-9]/);
      if (ilk < 0) return parca;
      return k.slice(0, ilk) + buyuk(k.charAt(ilk)) + k.slice(ilk + 1);
    }).join('-');
  }).join(' ');
}

function epostaKullanimda_(eposta, haric) {
  const l = mezunlariOku_();
  if (l.some(function (k) { return k.eposta === eposta && k.id !== haric; })) return true;
  // Yönetici yetkisi verilmiş öğretmenin kendi kaydı kendi adresini kullanabilir.
  const kendi = haric ? l.filter(function (k) { return k.id === haric; })[0] : null;
  if (kendi && kendi.eposta === eposta) return false;
  return yoneticiMi_(eposta);
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
  ['id', 'ad', 'soyad', 'universite', 'bolum', 'meslek', 'sehir', 'telefon', 'durum', 'brans', 'calisma', 'kurum']
    .forEach(function (s) { k[s] = String(k[s] == null ? '' : k[s]).trim(); });
  k.eposta = epostaDuzenle_(k.eposta);
  k.tur = String(k.tur).trim() === 'ogretmen' ? 'ogretmen' : 'mezun';
  k.yil = parseInt(k.yil, 10) || 0;
  k.durum = k.durum === 'onayli' || k.durum === 'reddedildi' ? k.durum : 'beklemede';
  if (CALISMA.indexOf(k.calisma) < 0) k.calisma = '';
  ['kvkkOnay', 'kayitTarihi', 'guncelleme', 'silmeTalebi', 'sonGiris', 'redTarihi'].forEach(function (s) {
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
    if (s === 'yil') return k.yil ? String(k.yil) : '';
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

function yoneticiSil_(eposta) {
  const sh = sayfa_(SAYFA.YONETICI);
  const son = sh.getLastRow();
  if (son < 2) return;
  const v = sh.getRange(2, 1, son - 1, 1).getValues();
  for (let i = v.length - 1; i >= 0; i--) if (epostaDuzenle_(v[i][0]) === epostaDuzenle_(eposta)) sh.deleteRow(i + 2);
}

function yoneticiEkle_(eposta, ad) {
  satirEkle_(sayfa_(SAYFA.YONETICI), [epostaDuzenle_(eposta), ad || '', new Date().toISOString()]);
}

/* ---------- şifreler ---------- */

function kimlikler_() {
  const sh = sayfa_(SAYFA.KIMLIK);
  const son = sh.getLastRow();
  if (son < 2) return [];
  return sh.getRange(2, 1, son - 1, 5).getValues().map(function (r, i) {
    return { _satir: i + 2, eposta: epostaDuzenle_(r[0]), ozet: String(r[1]), tuz: String(r[2]), degistirmeli: /^(evet|true)$/i.test(String(r[4])) };
  }).filter(function (k) { return k.eposta; });
}

function kimlikBul_(eposta) {
  eposta = epostaDuzenle_(eposta);
  return kimlikler_().filter(function (k) { return k.eposta === eposta; })[0] || null;
}

// degistirmeli: yöneticinin verdiği geçici şifre — kullanıcı ilk girişte kendi şifresini belirler.
function kimlikYaz_(eposta, sifre, degistirmeli) {
  const tuz = Utilities.getUuid();
  const satir = [epostaDuzenle_(eposta), sifreOzeti_(sifre, tuz), tuz, new Date().toISOString(), degistirmeli ? 'EVET' : ''];
  const mevcut = kimlikBul_(eposta);
  const sh = sayfa_(SAYFA.KIMLIK);
  if (mevcut) sh.getRange(mevcut._satir, 1, 1, 5).setNumberFormat('@').setValues([satir]);
  else satirEkle_(sh, satir);
}

function kimlikSilZorla_(eposta) {
  const k = kimlikBul_(eposta);
  if (k) sayfa_(SAYFA.KIMLIK).deleteRow(k._satir);
}

function kimlikEpostaDegistir_(eski, yeni) {
  const k = kimlikBul_(eski);
  if (k) sayfa_(SAYFA.KIMLIK).getRange(k._satir, 1).setValue(epostaDuzenle_(yeni));
}

function kimlikSil_(eposta) {
  if (yoneticiMi_(eposta)) return; // yönetici olarak girmeye devam eder
  const k = kimlikBul_(eposta);
  if (k) sayfa_(SAYFA.KIMLIK).deleteRow(k._satir);
}

// Şifre düz metin olarak hiç saklanmaz: kişiye özel tuzla 500 tur SHA-256.
function sifreOzeti_(sifre, tuz) {
  let h = ozet_(tuz + '|' + sifre);
  for (let i = 0; i < 500; i++) h = ozet_(h + '|' + tuz);
  return h;
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

function yeniId_(on) {
  return on + Utilities.getUuid().replace(/-/g, '').slice(0, 10).toUpperCase();
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
