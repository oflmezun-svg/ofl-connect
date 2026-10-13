/* OFL Connect — demo veri katmanı.
 *
 * Bu dosya, ileride Google Apps Script'te çalışacak sunucunun bir taklididir.
 * Yetki kontrolleri ve gizlilik maskelemesi BURADA yapılır, arayüzde değil:
 * gerçek sistemde de bir mezunun gizlediği bilgi tarayıcıya hiç gönderilmez.
 * Gerçek sisteme geçerken yalnızca Api nesnesinin içi fetch() çağrılarıyla
 * değiştirilir; app.js aynen kalır.
 *
 * Tüm kişiler ve bilgiler hayalidir. E-postalar example.com (ayrılmış alan adı).
 */
(function () {
  'use strict';

  if (window.Api) return; // canlı sunucu (api.js) tanımlıysa demo devreye girmez

  const OFL = window.OFL;
  const DEPO_ANAHTARI = 'ofl-connect-demo-v2';
  const OTURUM_ANAHTARI = 'ofl-connect-demo-oturum';
  const DEMO_KOD = '123456';
  const YONETICI_EPOSTA = 'yonetici@example.com';
  const BU_YIL = OFL.BU_YIL;
  const ILK_YIL = OFL.ILK_YIL;
  const ALANLAR = OFL.ALANLAR;
  const katla = OFL.katla;
  const telefonDuzenle = OFL.telefonDuzenle;

  function bekle(ms) { return new Promise(r => setTimeout(r, ms)); }

  function hata(mesaj) { const e = new Error(mesaj); e.kullaniciMesaji = true; return e; }

  function depoOku(anahtar) {
    try { return JSON.parse(localStorage.getItem(anahtar)); } catch (e) { return null; }
  }
  function depoYaz(anahtar, deger) {
    try {
      if (deger == null) localStorage.removeItem(anahtar);
      else localStorage.setItem(anahtar, JSON.stringify(deger));
    } catch (e) { /* gizli pencere vb. — demo bellekte çalışmaya devam eder */ }
  }

  /* ---------- hayali veri üretimi (her seferinde aynı sonuç) ---------- */

  function rastgeleUretici(tohum) {
    let a = tohum;
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      let t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  const ERKEK = ['Ahmet', 'Mehmet', 'Mustafa', 'Ali', 'Hüseyin', 'Hasan', 'İbrahim', 'Emre', 'Burak', 'Can', 'Kerem', 'Mert', 'Yusuf', 'Ömer', 'Furkan', 'Enes', 'Oğuzhan', 'Serkan', 'Tolga', 'Barış', 'Eren', 'Berk', 'Kaan', 'Arda', 'Selim', 'Taha', 'Batuhan', 'Halil', 'Murat', 'Cem', 'Alperen', 'Umut', 'Volkan', 'Hakan', 'Gökhan'];
  const KADIN = ['Ayşe', 'Fatma', 'Zeynep', 'Elif', 'Merve', 'Büşra', 'Esra', 'Ebru', 'Seda', 'Gizem', 'Derya', 'Sevgi', 'Hatice', 'Emine', 'Rabia', 'Kübra', 'Beyza', 'İrem', 'Dilara', 'Ece', 'Nur', 'Selin', 'Melike', 'Tuğba', 'Gamze', 'Özge', 'Yasemin', 'Sena', 'Şeyma', 'Cansu', 'Aslı', 'Damla', 'Ezgi', 'Pınar'];
  const SOYAD = ['Yılmaz', 'Kaya', 'Demir', 'Şahin', 'Çelik', 'Yıldız', 'Yıldırım', 'Öztürk', 'Aydın', 'Özdemir', 'Arslan', 'Doğan', 'Kılıç', 'Aslan', 'Çetin', 'Kara', 'Koç', 'Kurt', 'Özkan', 'Şimşek', 'Polat', 'Korkmaz', 'Karaca', 'Tekin', 'Akın', 'Bulut', 'Güneş', 'Aktaş', 'Turan', 'Toprak', 'Uçar', 'Kocabaş', 'Bozkurt', 'Tunç', 'Ateş', 'Sarı', 'Duman', 'Keskin', 'Avcı', 'Taş', 'Çakır', 'Ergin', 'Gündoğdu', 'Akbulut', 'Karakuş', 'Sevim', 'Uysal', 'Bayram', 'Yavuz', 'Erdem'];

  // [üniversite, şehir, ağırlık]
  const UNIVERSITELER = [
    ['Hacettepe Üniversitesi', 'Ankara', 8], ['Orta Doğu Teknik Üniversitesi', 'Ankara', 7],
    ['Ankara Üniversitesi', 'Ankara', 6], ['Gazi Üniversitesi', 'Ankara', 6],
    ['Bilkent Üniversitesi', 'Ankara', 3], ['TOBB Ekonomi ve Teknoloji Üniversitesi', 'Ankara', 2],
    ['Boğaziçi Üniversitesi', 'İstanbul', 4], ['İstanbul Teknik Üniversitesi', 'İstanbul', 5],
    ['İstanbul Üniversitesi', 'İstanbul', 5], ['Yıldız Teknik Üniversitesi', 'İstanbul', 4],
    ['Marmara Üniversitesi', 'İstanbul', 3], ['Koç Üniversitesi', 'İstanbul', 2],
    ['Çukurova Üniversitesi', 'Adana', 9], ['Osmaniye Korkut Ata Üniversitesi', 'Osmaniye', 4],
    ['Gaziantep Üniversitesi', 'Gaziantep', 4], ['Mersin Üniversitesi', 'Mersin', 4],
    ['Ege Üniversitesi', 'İzmir', 3], ['Dokuz Eylül Üniversitesi', 'İzmir', 3],
    ['Erciyes Üniversitesi', 'Kayseri', 3], ['Selçuk Üniversitesi', 'Konya', 2],
    ['Hatay Mustafa Kemal Üniversitesi', 'Hatay', 2]
  ];

  // [bölüm, öğrenim süresi, ağırlık, meslekler]
  const BOLUMLER = [
    ['Tıp', 6, 22, ['Pratisyen Hekim', 'Asistan Doktor', 'Kardiyoloji Uzmanı', 'Çocuk Sağlığı Uzmanı', 'Genel Cerrah', 'Dahiliye Uzmanı', 'Göz Hastalıkları Uzmanı']],
    ['Diş Hekimliği', 5, 5, ['Diş Hekimi', 'Ortodontist']],
    ['Eczacılık', 5, 4, ['Eczacı', 'Klinik Eczacı']],
    ['Bilgisayar Mühendisliği', 4, 12, ['Yazılım Mühendisi', 'Veri Bilimci', 'Yazılım Geliştirici', 'Yapay Zekâ Mühendisi']],
    ['Elektrik-Elektronik Mühendisliği', 4, 8, ['Elektronik Mühendisi', 'Gömülü Sistem Mühendisi', 'Elektrik Mühendisi']],
    ['Makine Mühendisliği', 4, 6, ['Makine Mühendisi', 'Ar-Ge Mühendisi']],
    ['İnşaat Mühendisliği', 4, 4, ['İnşaat Mühendisi', 'Şantiye Şefi']],
    ['Endüstri Mühendisliği', 4, 5, ['Endüstri Mühendisi', 'Proje Yöneticisi', 'İş Analisti']],
    ['Kimya Mühendisliği', 4, 3, ['Kimya Mühendisi']],
    ['Havacılık ve Uzay Mühendisliği', 4, 2, ['Uçak Mühendisi']],
    ['Moleküler Biyoloji ve Genetik', 4, 3, ['Araştırmacı', 'Genetik Uzmanı']],
    ['Matematik', 4, 3, ['Matematik Öğretmeni', 'Aktüer']],
    ['Fizik', 4, 2, ['Fizik Öğretmeni', 'Araştırmacı']],
    ['Hukuk', 4, 4, ['Avukat', 'Hâkim', 'Savcı']],
    ['Mimarlık', 4, 3, ['Mimar']],
    ['Ekonomi', 4, 2, ['Ekonomist', 'Bankacı']],
    ['Psikoloji', 4, 2, ['Psikolog']]
  ];

  const SEHIRLER = [
    ['İstanbul', 18], ['Ankara', 16], ['Osmaniye', 14], ['Adana', 12], ['İzmir', 8],
    ['Gaziantep', 5], ['Mersin', 5], ['Kayseri', 3], ['Hatay', 3], ['Kahramanmaraş', 3],
    ['Konya', 3], ['Antalya', 3], ['Eskişehir', 2], ['Bursa', 2], ['Kocaeli', 2],
    ['Berlin (Almanya)', 1], ['Londra (İngiltere)', 1], ['Boston (ABD)', 1], ['Amsterdam (Hollanda)', 1]
  ];

  function veriUret() {
    const r = rastgeleUretici(1985);
    const sec = dizi => dizi[Math.floor(r() * dizi.length)];
    const agirlikliSec = dizi => {
      const toplam = dizi.reduce((t, x) => t + x[x.length === 2 ? 1 : 2], 0);
      let k = r() * toplam;
      for (const x of dizi) { k -= x[x.length === 2 ? 1 : 2]; if (k <= 0) return x; }
      return dizi[dizi.length - 1];
    };
    const tarih = (bas, son) => new Date(bas + r() * (son - bas)).toISOString();
    const kullanilan = new Set(['elif.aydin@example.com']); // örnek mezun hesabına ayrıldı

    function eposta(ad, soyad) {
      const kok = katla(ad.split(' ')[0]) + '.' + katla(soyad);
      let e = kok + '@example.com', n = 2;
      while (kullanilan.has(e)) e = kok + (n++) + '@example.com';
      kullanilan.add(e);
      return e;
    }
    function telefon() {
      const on = sec(['30', '32', '33', '35', '36', '38', '42', '44', '46', '50', '52', '53', '54', '55']);
      let s = '05' + on;
      for (let i = 0; i < 7; i++) s += Math.floor(r() * 10);
      return telefonDuzenle(s);
    }

    const kayitlar = [];
    let no = 1;
    for (let yil = ILK_YIL; yil <= BU_YIL; yil++) {
      const adet = 42 + Math.floor(r() * 17);
      for (let i = 0; i < adet; i++) {
        const kadin = r() < 0.5;
        const ad = sec(kadin ? KADIN : ERKEK);
        const soyad = sec(SOYAD);
        const [uni, uniSehir] = agirlikliSec(UNIVERSITELER);
        const [bolum, sure, , meslekler] = agirlikliSec(BOLUMLER);
        const ogrenci = BU_YIL - yil < sure;
        let meslek = ogrenci ? 'Üniversite Öğrencisi' : sec(meslekler);
        if (!ogrenci && yil <= 2012 && r() < 0.06) meslek = 'Akademisyen';
        const sehir = ogrenci || r() < 0.22 ? uniSehir : agirlikliSec(SEHIRLER)[0];
        const kayitTarihi = tarih(Date.UTC(BU_YIL - 1, 8, 1), Date.UTC(BU_YIL, 5, 1));
        kayitlar.push({
          id: 'm' + String(no++).padStart(4, '0'),
          ad, soyad, yil,
          universite: uni, bolum, meslek, sehir,
          telefon: telefon(),
          eposta: eposta(ad, soyad),
          gorunurluk: {
            egitim: r() < 0.95, meslek: r() < 0.92, sehir: r() < 0.85,
            telefon: r() < 0.35, eposta: r() < 0.6
          },
          durum: 'onayli',
          kvkkOnay: kayitTarihi,
          kayitTarihi,
          guncelleme: tarih(Date.parse(kayitTarihi), Date.UTC(2026, 9, 12)),
          silmeTalebi: null
        });
      }
    }

    // Demo'nun "örnek mezun" hesabı — bilgileri sabit, hepsi paylaşılıyor.
    Object.assign(kayitlar[200], {
      ad: 'Elif', soyad: 'Aydın', yil: 2011,
      universite: 'Hacettepe Üniversitesi', bolum: 'Tıp',
      meslek: 'Çocuk Sağlığı Uzmanı', sehir: 'Ankara',
      telefon: '0532 000 11 22', eposta: 'elif.aydin@example.com',
      gorunurluk: { egitim: true, meslek: true, sehir: true, telefon: true, eposta: true }
    });

    // Yönetici onayı bekleyen yeni kayıtlar
    for (let i = 0; i < 6; i++) {
      const k = kayitlar[kayitlar.length - 1 - i * 7];
      k.durum = 'beklemede';
      k.kayitTarihi = k.kvkkOnay = k.guncelleme = tarih(Date.UTC(2026, 9, 1), Date.UTC(2026, 9, 12));
    }
    // KVKK silme talebi gönderenler
    kayitlar[57].silmeTalebi = tarih(Date.UTC(2026, 8, 20), Date.UTC(2026, 9, 10));
    kayitlar[612].silmeTalebi = tarih(Date.UTC(2026, 8, 20), Date.UTC(2026, 9, 10));
    return kayitlar;
  }

  /* ---------- "sunucu" durumu ---------- */

  let kayitlar = depoOku(DEPO_ANAHTARI) || veriUret();
  let sonId = kayitlar.reduce((m, k) => Math.max(m, parseInt(k.id.slice(1), 10) || 0), 0);
  const kaydet = () => depoYaz(DEPO_ANAHTARI, kayitlar);
  const bul = id => kayitlar.find(k => k.id === id);

  function oturum() {
    const o = depoOku(OTURUM_ANAHTARI);
    if (!o) return null;
    if (o.rol === 'mezun') {
      const k = bul(o.id);
      if (!k || k.durum !== 'onayli') { depoYaz(OTURUM_ANAHTARI, null); return null; }
    }
    return o;
  }
  function yetkiGerekli(rol) {
    const o = oturum();
    if (!o) throw hata('Oturumunuz sona erdi. Lütfen tekrar giriş yapın.');
    if (rol && o.rol !== rol) throw hata('Bu işlem için yetkiniz yok.');
    return o;
  }

  // Gizlilik maskesi: izin verilmeyen alan hiç gönderilmez.
  function maskele(k, izleyen) {
    const tam = izleyen.rol === 'admin' || izleyen.id === k.id;
    const sonuc = {
      id: k.id, ad: k.ad, soyad: k.soyad, yil: k.yil,
      tamYetki: tam, kendisi: izleyen.id === k.id, gizli: []
    };
    const degerler = {
      egitim: { universite: k.universite, bolum: k.bolum },
      meslek: { meslek: k.meslek }, sehir: { sehir: k.sehir },
      telefon: { telefon: k.telefon }, eposta: { eposta: k.eposta }
    };
    for (const alan of ALANLAR) {
      if (tam || k.gorunurluk[alan]) Object.assign(sonuc, degerler[alan]);
      else sonuc.gizli.push(alan);
    }
    if (tam) {
      Object.assign(sonuc, {
        gorunurluk: Object.assign({}, k.gorunurluk), durum: k.durum, kvkkOnay: k.kvkkOnay,
        kayitTarihi: k.kayitTarihi, guncelleme: k.guncelleme, silmeTalebi: k.silmeTalebi
      });
    }
    return sonuc;
  }

  function dogrula(v) {
    const h = {};
    const metin = (x, n) => String(x || '').trim().slice(0, n);
    const temiz = {
      ad: metin(v.ad, 60), soyad: metin(v.soyad, 60),
      yil: parseInt(v.yil, 10),
      universite: metin(v.universite, 120), bolum: metin(v.bolum, 120),
      meslek: metin(v.meslek, 80), sehir: metin(v.sehir, 60),
      eposta: metin(v.eposta, 120).toLocaleLowerCase('tr-TR'),
      telefon: null
    };
    if (!temiz.ad) h.ad = 'Ad zorunludur.';
    if (!temiz.soyad) h.soyad = 'Soyad zorunludur.';
    if (!(temiz.yil >= ILK_YIL && temiz.yil <= BU_YIL)) h.yil = 'Geçerli bir mezuniyet yılı seçin.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(temiz.eposta)) h.eposta = 'Geçerli bir e-posta adresi girin.';
    if (String(v.telefon || '').trim()) {
      temiz.telefon = telefonDuzenle(v.telefon);
      if (!temiz.telefon) h.telefon = 'Telefonu 05XX XXX XX XX biçiminde girin.';
    }
    const g = v.gorunurluk || {};
    temiz.gorunurluk = {};
    for (const alan of ALANLAR) temiz.gorunurluk[alan] = !!g[alan];
    return { temiz, hatalar: h };
  }

  function epostaKullanimda(eposta, haric) {
    return eposta === YONETICI_EPOSTA || kayitlar.some(k => k.eposta === eposta && k.id !== haric);
  }

  function dogrulamaHatasi(hatalar) {
    const e = hata('Lütfen işaretli alanları düzeltin.');
    e.alanlar = hatalar;
    return e;
  }

  /* ---------- Api: arayüzün kullandığı tek kapı ---------- */

  const Api = Object.assign({}, OFL, {
    MOD: 'demo',
    DEMO_KOD, YONETICI_EPOSTA,

    oturum,

    oturumAdiniGuncelle(ad) {
      const o = depoOku(OTURUM_ANAHTARI);
      if (o) { o.ad = ad; depoYaz(OTURUM_ANAHTARI, o); }
    },

    async girisKoduGonder(eposta) {
      await bekle(350);
      eposta = String(eposta || '').trim().toLocaleLowerCase('tr-TR');
      if (eposta === YONETICI_EPOSTA) return { gonderildi: true };
      const k = kayitlar.find(x => x.eposta === eposta);
      if (!k) throw hata('Bu e-posta ile kayıtlı bir mezun bulunamadı.');
      if (k.durum !== 'onayli') throw hata('Kaydınız henüz yönetici onayı bekliyor.');
      return { gonderildi: true };
    },

    async girisYap(eposta, kod) {
      await bekle(300);
      eposta = String(eposta || '').trim().toLocaleLowerCase('tr-TR');
      if (String(kod).trim() !== DEMO_KOD) throw hata('Kod hatalı. Demo için kod: ' + DEMO_KOD);
      if (eposta === YONETICI_EPOSTA) return Api.demoGiris('admin');
      const k = kayitlar.find(x => x.eposta === eposta && x.durum === 'onayli');
      if (!k) throw hata('Giriş yapılamadı.');
      return Api.demoGiris('mezun', k.id);
    },

    async demoGiris(rol, id) {
      let o;
      if (rol === 'admin') o = { rol: 'admin', id: 'admin', ad: 'Sistem Yöneticisi' };
      else {
        let k = id ? bul(id) : null;
        if (id === 'rastgele') {
          const onayli = kayitlar.filter(x => x.durum === 'onayli');
          k = onayli[Math.floor(Math.random() * onayli.length)];
        }
        if (!k) k = kayitlar.find(x => x.eposta === 'elif.aydin@example.com');
        o = { rol: 'mezun', id: k.id, ad: k.ad + ' ' + k.soyad };
      }
      depoYaz(OTURUM_ANAHTARI, o);
      return o;
    },

    cikis() { depoYaz(OTURUM_ANAHTARI, null); },

    async rehber() {
      const o = yetkiGerekli();
      await bekle(120);
      return kayitlar.filter(k => k.durum === 'onayli').map(k => maskele(k, o));
    },

    async mezun(id) {
      const o = yetkiGerekli();
      const k = bul(id);
      if (!k || (k.durum !== 'onayli' && o.rol !== 'admin')) throw hata('Kayıt bulunamadı.');
      return maskele(k, o);
    },

    async profilKaydet(id, veri) {
      const o = yetkiGerekli();
      if (o.rol !== 'admin' && o.id !== id) throw hata('Yalnızca kendi bilgilerinizi değiştirebilirsiniz.');
      const k = bul(id);
      if (!k) throw hata('Kayıt bulunamadı.');
      await bekle(300);
      const { temiz, hatalar } = dogrula(veri);
      if (!hatalar.eposta && epostaKullanimda(temiz.eposta, id)) hatalar.eposta = 'Bu e-posta başka bir kayıtta kullanılıyor.';
      if (Object.keys(hatalar).length) throw dogrulamaHatasi(hatalar);
      Object.assign(k, temiz, { guncelleme: new Date().toISOString() });
      kaydet();
      return maskele(k, o);
    },

    // Herkese açık: yeni mezun kaydı (yönetici onayına düşer).
    // Yönetici eklerse doğrudan onaylı olur.
    async kayitOl(veri) {
      const o = oturum();
      await bekle(400);
      const { temiz, hatalar } = dogrula(veri);
      if (!hatalar.eposta && epostaKullanimda(temiz.eposta)) hatalar.eposta = 'Bu e-posta ile zaten bir kayıt var.';
      const yonetici = o && o.rol === 'admin';
      if (!yonetici && !veri.kvkkOnay) hatalar.kvkk = 'Devam etmek için açık rıza onayı gereklidir.';
      if (Object.keys(hatalar).length) throw dogrulamaHatasi(hatalar);
      const simdi = new Date().toISOString();
      const k = Object.assign({ id: 'm' + String(++sonId).padStart(4, '0') }, temiz, {
        durum: yonetici ? 'onayli' : 'beklemede',
        kvkkOnay: yonetici ? null : simdi,
        kayitTarihi: simdi, guncelleme: simdi, silmeTalebi: null
      });
      kayitlar.push(k);
      kaydet();
      return { id: k.id, durum: k.durum };
    },

    async silmeTalebiGonder() {
      const o = yetkiGerekli('mezun');
      const k = bul(o.id);
      await bekle(250);
      k.silmeTalebi = k.silmeTalebi ? null : new Date().toISOString();
      kaydet();
      return maskele(k, o);
    },

    async rozetler() {
      yetkiGerekli('admin');
      return {
        bekleyen: kayitlar.filter(k => k.durum === 'beklemede').length,
        silme: kayitlar.filter(k => k.silmeTalebi).length
      };
    },

    async bekleyenler() {
      const o = yetkiGerekli('admin');
      return kayitlar.filter(k => k.durum === 'beklemede').map(k => maskele(k, o));
    },

    async silmeTalepleri() {
      const o = yetkiGerekli('admin');
      return kayitlar.filter(k => k.silmeTalebi).map(k => maskele(k, o));
    },

    async onayla(id) {
      yetkiGerekli('admin');
      const k = bul(id);
      if (!k) throw hata('Kayıt bulunamadı.');
      await bekle(200);
      k.durum = 'onayli';
      kaydet();
    },

    async sil(id) {
      yetkiGerekli('admin');
      await bekle(200);
      const i = kayitlar.findIndex(k => k.id === id);
      if (i < 0) throw hata('Kayıt bulunamadı.');
      kayitlar.splice(i, 1);
      kaydet();
    },

    async istatistik() {
      yetkiGerekli('admin');
      const onayli = kayitlar.filter(k => k.durum === 'onayli');
      const yillar = {};
      for (let y = ILK_YIL; y <= BU_YIL; y++) yillar[y] = 0;
      const sehirler = {};
      let telefonPaylasan = 0, epostaPaylasan = 0;
      for (const k of onayli) {
        yillar[k.yil] = (yillar[k.yil] || 0) + 1;
        sehirler[k.sehir] = (sehirler[k.sehir] || 0) + 1;
        if (k.gorunurluk.telefon) telefonPaylasan++;
        if (k.gorunurluk.eposta) epostaPaylasan++;
      }
      return {
        toplam: onayli.length,
        bekleyen: kayitlar.filter(k => k.durum === 'beklemede').length,
        silmeTalebi: kayitlar.filter(k => k.silmeTalebi).length,
        telefonPaylasan, epostaPaylasan,
        yillar: Object.entries(yillar).map(([yil, adet]) => ({ yil: +yil, adet })),
        sehirler: Object.entries(sehirler).map(([sehir, adet]) => ({ sehir, adet }))
          .sort((a, b) => b.adet - a.adet)
      };
    },

    async csv() {
      yetkiGerekli('admin');
      const basliklar = ['Ad', 'Soyad', 'Mezuniyet Yılı', 'Üniversite', 'Bölüm', 'Meslek', 'Şehir', 'Telefon', 'E-posta', 'Durum', 'Son Güncelleme'];
      const hucre = v => {
        let s = String(v == null ? '' : v);
        if (/^[=+\-@]/.test(s)) s = "'" + s; // Excel formül enjeksiyonuna karşı
        return '"' + s.replace(/"/g, '""') + '"';
      };
      const satirlar = kayitlar.map(k => [k.ad, k.soyad, k.yil, k.universite, k.bolum, k.meslek, k.sehir, k.telefon, k.eposta,
        k.durum === 'onayli' ? 'Onaylı' : 'Onay bekliyor', k.guncelleme.slice(0, 10)].map(hucre).join(';'));
      return '﻿' + [basliklar.map(hucre).join(';')].concat(satirlar).join('\r\n');
    },

    demoSifirla() {
      depoYaz(DEPO_ANAHTARI, null);
      depoYaz(OTURUM_ANAHTARI, null);
      kayitlar = veriUret();
      sonId = kayitlar.length;
    }
  });

  window.Api = Api;
})();
