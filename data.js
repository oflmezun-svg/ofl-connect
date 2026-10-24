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
  const DEPO_ANAHTARI = 'ofl-connect-demo-v4';
  const HESAP_ANAHTARI = 'ofl-connect-demo-hesap';
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

  function depoOku(anahtar, gecici) {
    try { return JSON.parse((gecici ? sessionStorage : localStorage).getItem(anahtar)); } catch (e) { return null; }
  }
  function depoYaz(anahtar, deger, gecici) {
    try {
      const d = gecici ? sessionStorage : localStorage;
      if (deger == null) d.removeItem(anahtar);
      else d.setItem(anahtar, JSON.stringify(deger));
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

  const KURUMLAR = {
    Tıp: ['Ankara Şehir Hastanesi', 'Çukurova Üniversitesi Balcalı Hastanesi', 'Osmaniye Devlet Hastanesi', 'Acıbadem Hastanesi', 'İstanbul Eğitim ve Araştırma Hastanesi', 'Adana Şehir Hastanesi'],
    'Diş Hekimliği': ['Ağız ve Diş Sağlığı Merkezi', 'Özel Muayenehane'],
    Eczacılık: ['Serbest Eczane', 'Abdi İbrahim', 'Hastane Eczanesi'],
    'Bilgisayar Mühendisliği': ['ASELSAN', 'Trendyol', 'Getir', 'HAVELSAN', 'Microsoft', 'Turkcell'],
    'Elektrik-Elektronik Mühendisliği': ['ASELSAN', 'Arçelik', 'TEİAŞ', 'Roketsan'],
    'Makine Mühendisliği': ['TUSAŞ', 'Ford Otosan', 'TOFAŞ', 'Roketsan'],
    'İnşaat Mühendisliği': ['Limak İnşaat', 'Karayolları Genel Müdürlüğü', 'Rönesans Holding'],
    Hukuk: ['Adalet Bakanlığı', 'Serbest Avukat', 'Osmaniye Barosu'],
    _: ['Özel Sektör', 'Kamu Kurumu', 'Milli Eğitim Bakanlığı', 'Kendi İşletmesi']
  };
  const BRANSLAR = {
    Tıp: ['Kardiyoloji', 'Çocuk Sağlığı ve Hastalıkları', 'Genel Cerrahi', 'İç Hastalıkları', 'Göz Hastalıkları', 'Aile Hekimliği'],
    'Diş Hekimliği': ['Ortodonti', 'Endodonti', 'Genel'],
    'Bilgisayar Mühendisliği': ['Yapay Zekâ', 'Yazılım Geliştirme', 'Siber Güvenlik', 'Veri Bilimi'],
    'Elektrik-Elektronik Mühendisliği': ['Gömülü Sistemler', 'Haberleşme', 'Güç Sistemleri'],
    Hukuk: ['Ceza Hukuku', 'Ticaret Hukuku', 'İş Hukuku']
  };

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
        const calisma = ogrenci ? 'ogrenci' : (r() < 0.93 ? 'calisiyor' : 'calismiyor');
        if (calisma === 'calismiyor') meslek = '';
        const kurum = calisma !== 'calisiyor' ? '' : meslek === 'Akademisyen' ? uni : sec(KURUMLAR[bolum] || KURUMLAR._);
        const brans = calisma !== 'calisiyor' ? '' : sec(BRANSLAR[bolum] || ['Genel']);
        const kayitTarihi = tarih(Date.UTC(BU_YIL - 1, 8, 1), Date.UTC(BU_YIL, 5, 1));
        kayitlar.push({
          id: 'm' + String(no++).padStart(4, '0'),
          tur: 'mezun', brans, calisma, kurum,
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
          silmeTalebi: null, sonGiris: tarih(Date.UTC(2026, 8, 1), Date.UTC(2026, 9, 14))
        });
        // Eski sürümde kaydolanlar: çalışma durumu henüz yok (profilini tamamlaması istenir)
        if (r() < 0.12) Object.assign(kayitlar[kayitlar.length - 1], { calisma: '', kurum: '', brans: '' });
      }
    }

    // Demo'nun "örnek mezun" hesabı — bilgileri sabit, hepsi paylaşılıyor.
    Object.assign(kayitlar[200], {
      ad: 'Elif', soyad: 'Aydın', yil: 2011,
      universite: 'Hacettepe Üniversitesi', bolum: 'Tıp',
      meslek: 'Çocuk Sağlığı Uzmanı', sehir: 'Ankara', calisma: 'calisiyor',
      kurum: 'Hacettepe Üniversitesi İhsan Doğramacı Çocuk Hastanesi', brans: 'Çocuk Kardiyolojisi',
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

    // Okulun öğretmenleri (yöneticinin elle eklediği kayıtlar)
    const OGRETMENLER = [
      ['Serap', 'Güneş', 'Kimya', 'Hacettepe Üniversitesi', 'Kimya Öğretmenliği'],
      ['Hakan', 'Yurt', 'Matematik', 'Orta Doğu Teknik Üniversitesi', 'Matematik Öğretmenliği'],
      ['Gülay', 'Ersoy', 'Fizik', 'Gazi Üniversitesi', 'Fizik Öğretmenliği'],
      ['Murat', 'Akdağ', 'Biyoloji', 'Çukurova Üniversitesi', 'Biyoloji Öğretmenliği'],
      ['Nermin', 'Soylu', 'Türk Dili ve Edebiyatı', 'Ankara Üniversitesi', 'Türk Dili ve Edebiyatı Öğretmenliği'],
      ['Kemal', 'Öztaş', 'Tarih', 'Erciyes Üniversitesi', 'Tarih Öğretmenliği'],
      ['Zehra', 'Kalkan', 'İngilizce', 'Boğaziçi Üniversitesi', 'İngiliz Dili Eğitimi'],
      ['Okan', 'Demirel', 'Bilişim Teknolojileri', 'Gazi Üniversitesi', 'Bilgisayar ve Öğretim Teknolojileri Eğitimi'],
      ['Sibel', 'Aksoy', 'Coğrafya', 'Selçuk Üniversitesi', 'Coğrafya Öğretmenliği'],
      ['Levent', 'Çınar', 'Beden Eğitimi', 'Mersin Üniversitesi', 'Beden Eğitimi ve Spor Öğretmenliği'],
      ['Aynur', 'Toker', 'Rehberlik', 'Hacettepe Üniversitesi', 'Psikolojik Danışmanlık ve Rehberlik'],
      ['Cengiz', 'Uzun', 'Felsefe', 'Ege Üniversitesi', 'Felsefe Grubu Öğretmenliği']
    ];
    OGRETMENLER.forEach(([ad, soyad, brans, universite, bolum], i) => {
      const kayitTarihi = tarih(Date.UTC(BU_YIL - 1, 8, 1), Date.UTC(BU_YIL, 2, 1));
      kayitlar.push({
        id: 't' + String(i + 1).padStart(3, '0'), tur: 'ogretmen', brans,
        ad, soyad, yil: 0, universite, bolum,
        meslek: i === 10 ? 'Psikolojik Danışman' : brans + ' Öğretmeni', sehir: 'Osmaniye',
        telefon: telefon(), eposta: eposta(ad, soyad),
        gorunurluk: { egitim: true, meslek: true, sehir: true, telefon: r() < 0.3, eposta: true },
        durum: 'onayli', kvkkOnay: null, kayitTarihi, guncelleme: kayitTarihi, silmeTalebi: null
      });
    });
    return kayitlar;
  }

  function duyuruUret() {
    const gun = 864e5, simdi = Date.now();
    const t = ms => new Date(simdi + ms).toISOString();
    return [
      { id: 'd001', tur: 'etkinlik', hedef: 'herkes', baslik: 'Mezunlar Buluşması 2026',
        metin: 'Sevgili mezunlarımız ve öğretmenlerimiz,\n\nOkulumuzun geleneksel mezunlar buluşması 22 Kasım Cumartesi günü saat 14.00\'te okul konferans salonunda yapılacaktır. Program sonunda bahçede çay ikramı olacaktır.\n\nKatılım durumunuzu aşağıdaki bağlantıdan bildirmenizi rica ederiz.',
        baglantiMetni: 'Katılım formu', baglantiUrl: 'https://example.com/bulusma-2026',
        baslangic: t(-2 * gun), bitis: t(38 * gun), eposta: true, olusturma: t(-2 * gun) },
      { id: 'd002', tur: 'onemli', hedef: 'mezun', baslik: 'Kariyer Günü için konuşmacı arıyoruz',
        metin: 'Aralık ayında yapılacak Kariyer Günü\'nde 11. ve 12. sınıf öğrencilerimize mesleğini anlatmak isteyen mezunlarımız okul idaresiyle iletişime geçebilir.\n\nÖzellikle tıp, mühendislik ve hukuk alanından gönüllülere ihtiyacımız var.',
        baglantiMetni: '', baglantiUrl: '', baslangic: t(-5 * gun), bitis: t(20 * gun), eposta: false, olusturma: t(-5 * gun) },
      { id: 'd003', tur: 'bilgi', hedef: 'ogretmen', baslik: 'Mentorluk programı öğretmen toplantısı',
        metin: 'Mezun mentorluk programı için ilk değerlendirme toplantısı Perşembe 15.30\'da öğretmenler odasında yapılacaktır.',
        baglantiMetni: '', baglantiUrl: '', baslangic: t(-1 * gun), bitis: t(6 * gun), eposta: false, olusturma: t(-1 * gun) },
      { id: 'd004', tur: 'bilgi', hedef: 'herkes', baslik: 'Rehber bilgilerinizi güncel tutun',
        metin: 'Mezun rehberinin işe yaraması için meslek ve şehir bilgilerinizin güncel olması önemli. Profilim sayfasından bilgilerinizi ve hangi bilginizin görüneceğini dilediğiniz zaman değiştirebilirsiniz.',
        baglantiMetni: '', baglantiUrl: '', baslangic: t(-10 * gun), bitis: t(50 * gun), eposta: false, olusturma: t(-10 * gun) },
      { id: 'd005', tur: 'etkinlik', hedef: 'herkes', baslik: 'Yılbaşı dayanışma kermesi',
        metin: 'Okul aile birliğinin düzenlediği kermes gelirleri ihtiyaç sahibi öğrencilerimizin burslarına aktarılacaktır.',
        baglantiMetni: '', baglantiUrl: '', baslangic: t(5 * gun), bitis: t(25 * gun), eposta: false, olusturma: t(-1 * gun) },
      { id: 'd006', tur: 'bilgi', hedef: 'herkes', baslik: 'Okulumuzun 20. kuruluş yıl dönümü',
        metin: 'Kuruluş yıl dönümümüzü kutlayan tüm mezun ve öğretmenlerimize teşekkür ederiz.',
        baglantiMetni: '', baglantiUrl: '', baslangic: t(-40 * gun), bitis: t(-25 * gun), eposta: false, olusturma: t(-40 * gun) }
    ];
  }

  function ilkDurum() {
    const kayitlar = veriUret();
    const duyurular = duyuruUret();
    const alici = kayitlar.filter(k => k.durum === 'onayli').length;
    return {
      kayitlar, duyurular,
      yoneticiler: [{ eposta: YONETICI_EPOSTA, ad: 'Sistem Yöneticisi' }],
      sifreler: {}, degistirmeli: {},
      kuyruk: { d001: { toplam: alici, gonderilen: alici } }
    };
  }

  /* ---------- "sunucu" durumu ---------- */

  let D = depoOku(DEPO_ANAHTARI) || ilkDurum();
  const kaydet = () => depoYaz(DEPO_ANAHTARI, D);
  // İletişim talepleri: demo mezunu (Elif Aydın) için örnek olarak bir bekleyen talep.
  if (!D.iletisim) {
    const elif = D.kayitlar.find(k => k.eposta === 'elif.aydin@example.com');
    const isteyen = D.kayitlar.find(k => k.durum === 'onayli' && k.tur === 'mezun' && k !== elif);
    D.iletisim = elif && isteyen ? [{ id: 'it-ornek', isteyen: isteyen.id, hedef: elif.id, durum: 'bekliyor', olusturma: new Date(Date.now() - 2 * 3600e3).toISOString(), yanit: '', goruldu: '' }] : [];
  }
  const telefonIzinleri = id => Object.fromEntries(D.iletisim.filter(t => t.isteyen === id && t.durum === 'kabul').map(t => [t.hedef, true]));
  const bul = id => D.kayitlar.find(k => k.id === id);
  const yeniId = on => on + Math.random().toString(36).slice(2, 10);
  const kucuk = e => String(e || '').trim().toLocaleLowerCase('tr-TR');
  const yoneticiMi = e => D.yoneticiler.some(y => y.eposta === kucuk(e));
  // Demoda sistem yöneticisi asil yöneticidir.
  const asilMi = e => kucuk(e || '') === YONETICI_EPOSTA;
  const telAnahtar = t => { const r = String(t || '').replace(/\D/g, ''); return r.length >= 10 ? r.slice(-10) : ''; };
  const telefonKullanimda = (t, haric) => !!telAnahtar(t) && D.kayitlar.some(k => k.id !== haric && k.durum !== 'reddedildi' && telAnahtar(k.telefon) === telAnahtar(t));
  const TELEFON_KULLANIMDA = 'Bu telefon numarasıyla zaten bir kayıt var; aynı kişi için ikinci kayıt açılamaz. Daha önce kayıt olduysanız giriş yapın; sorun yaşıyorsanız giriş ekranındaki “Yardım ve sorular”dan bize yazın.';
  const sifreDenemeleri = {};

  function oturumOku() { return depoOku(OTURUM_ANAHTARI) || depoOku(OTURUM_ANAHTARI, true); }
  function oturumYaz(o) {
    depoYaz(OTURUM_ANAHTARI, null); depoYaz(OTURUM_ANAHTARI, null, true);
    if (o) depoYaz(OTURUM_ANAHTARI, o, !o.hatirla);
  }

  function oturum() {
    const o = oturumOku();
    if (!o) return null;
    if (o.rol === 'admin') {
      if (!yoneticiMi(o.eposta)) { oturumYaz(null); return null; }
    } else {
      const k = bul(o.id);
      if (!k || k.durum !== 'onayli') { oturumYaz(null); return null; }
      o.rol = k.tur === 'ogretmen' ? 'ogretmen' : 'mezun';
    }
    return { rol: o.rol, id: o.id, ad: o.ad, eposta: o.eposta };
  }
  function yetkiGerekli(rol) {
    const o = oturum();
    if (!o) throw hata('Oturumunuz sona erdi. Lütfen tekrar giriş yapın.');
    if (rol === 'admin' && o.rol !== 'admin') throw hata('Bu işlem için yetkiniz yok.');
    if (rol === 'uye' && o.rol === 'admin') throw hata('Bu işlem yalnızca mezun ve öğretmen hesapları içindir.');
    return o;
  }

  // Demo: rastgele birkaç kişi "çevrimiçi"; kendi hesabıyla giren mezun da çevrimiçi sayılır.
  const demoCevrimici = [];
  function cevrimiciIdler() {
    if (!demoCevrimici.length) {
      const onayli = D.kayitlar.filter(k => k.durum === 'onayli');
      for (let i = 0; i < 9; i++) demoCevrimici.push(onayli[Math.floor(Math.random() * onayli.length)].id);
    }
    const son = depoOku('ofl-connect-demo-son-uye');
    return [...new Set(son ? demoCevrimici.concat(son) : demoCevrimici)];
  }

  function girisHedefi(eposta) {
    const y = D.yoneticiler.find(x => x.eposta === eposta);
    if (y) return { rol: 'admin', id: 'admin', ad: y.ad || 'Yönetici' };
    const k = D.kayitlar.find(x => x.eposta === eposta && x.durum === 'onayli');
    return k ? { rol: k.tur === 'ogretmen' ? 'ogretmen' : 'mezun', id: k.id, ad: k.ad + ' ' + k.soyad } : null;
  }

  function oturumAc(eposta, hedef, hatirla) {
    if (hedef.rol !== 'admin') {
      depoYaz('ofl-connect-demo-son-uye', hedef.id);
      const k = bul(hedef.id);
      if (k) { k.sonGiris = new Date().toISOString(); kaydet(); }
    }
    oturumYaz({ rol: hedef.rol, id: hedef.id, ad: hedef.ad, eposta, hatirla: !!hatirla });
    const sifreVar = !!D.sifreler[eposta];
    depoYaz(HESAP_ANAHTARI, { eposta, ad: hedef.ad, sifreVar });
    return { rol: hedef.rol, id: hedef.id, ad: hedef.ad, sifreVar };
  }

  function guncelEposta(o) {
    if (o.rol === 'admin') return o.eposta;
    const k = bul(o.id);
    return k ? k.eposta : o.eposta;
  }

  // Gizlilik maskesi: izin verilmeyen alan hiç gönderilmez.
  function maskele(k, izleyen, izinler) {
    const tam = izleyen.rol === 'admin' || izleyen.id === k.id;
    const sonuc = {
      id: k.id, ad: k.ad, soyad: k.soyad, yil: k.yil, tur: k.tur,
      tamYetki: tam, kendisi: izleyen.id === k.id, gizli: []
    };
    if (k.tur === 'ogretmen') sonuc.brans = k.brans;
    const degerler = {
      egitim: { universite: k.universite, bolum: k.bolum },
      meslek: k.tur === 'ogretmen' ? { meslek: k.meslek } : { meslek: k.meslek, calisma: k.calisma, kurum: k.kurum, brans: k.brans },
      sehir: { sehir: k.sehir }, telefon: { telefon: k.telefon }, eposta: { eposta: k.eposta }
    };
    for (const alan of ALANLAR) {
      if (tam || k.gorunurluk[alan]) Object.assign(sonuc, degerler[alan]);
      else if (alan === 'telefon' && izinler && izinler[k.id]) { Object.assign(sonuc, degerler[alan]); sonuc.telefonIzinli = true; }
      else sonuc.gizli.push(alan);
    }
    if (tam) {
      Object.assign(sonuc, {
        gorunurluk: Object.assign({}, k.gorunurluk), durum: k.durum, kvkkOnay: k.kvkkOnay,
        kayitTarihi: k.kayitTarihi, guncelleme: k.guncelleme, silmeTalebi: k.silmeTalebi,
        sonGiris: k.sonGiris || null, redTarihi: k.redTarihi || null
      });
    }
    return sonuc;
  }

  // Sunucudaki dogrula_ ile aynı kurallar (kati: mezunun kendi başvurusu/profili).
  function dogrula(v, kati) {
    const h = {};
    const yd = OFL.yaziDuzelt;
    const metin = (x, n) => String(x || '').replace(/\s+/g, ' ').trim().slice(0, n);
    const tur = v.tur === 'ogretmen' ? 'ogretmen' : 'mezun';
    const temiz = {
      tur, ad: yd(metin(v.ad, 60), true), soyad: yd(metin(v.soyad, 60), true),
      yil: tur === 'mezun' ? parseInt(v.yil, 10) : 0,
      calisma: tur === 'mezun' && ['calisiyor', 'calismiyor', 'ogrenci'].includes(v.calisma) ? v.calisma : '',
      brans: yd(metin(v.brans, 60)), kurum: yd(metin(v.kurum, 120)),
      universite: yd(metin(v.universite, 120)), bolum: yd(metin(v.bolum, 120)),
      meslek: yd(metin(v.meslek, 80)), sehir: yd(metin(v.sehir, 60)),
      eposta: kucuk(metin(v.eposta, 120)),
      telefon: null
    };
    if (temiz.calisma === 'ogrenci') Object.assign(temiz, { meslek: 'Üniversite Öğrencisi', kurum: '', brans: '' });
    if (temiz.calisma === 'calismiyor') Object.assign(temiz, { meslek: '', kurum: '', brans: '' });
    if (!temiz.ad) h.ad = 'Ad zorunludur.';
    if (!temiz.soyad) h.soyad = 'Soyad zorunludur.';
    if (tur === 'mezun' && !(temiz.yil >= ILK_YIL && temiz.yil <= BU_YIL)) h.yil = 'Geçerli bir mezuniyet yılı seçin.';
    if (tur === 'ogretmen' && !temiz.brans) h.brans = 'Branş zorunludur.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(temiz.eposta)) h.eposta = 'Geçerli bir e-posta adresi girin.';
    if (String(v.telefon || '').trim()) {
      temiz.telefon = telefonDuzenle(v.telefon);
      if (!temiz.telefon) h.telefon = 'Telefonu 05XX XXX XX XX biçiminde girin.';
    }
    if (kati && tur === 'mezun') {
      const bos = (a, m) => { if (!temiz[a] && !h[a]) h[a] = m; };
      bos('calisma', 'Çalışma durumunuzu seçin.');
      bos('universite', 'Üniversite zorunludur.');
      bos('bolum', 'Bölüm zorunludur.');
      bos('sehir', 'Yaşadığınız şehri seçin.');
      bos('telefon', 'Telefon zorunludur.');
      if (temiz.calisma === 'calisiyor') {
        bos('meslek', 'Mesleğinizi yazın.');
        bos('kurum', 'Çalıştığınız kurumu yazın.');
        bos('brans', 'Branş veya uzmanlık alanınızı yazın (yoksa "Genel").');
      }
    }
    const g = v.gorunurluk || {};
    temiz.gorunurluk = {};
    for (const alan of ALANLAR) temiz.gorunurluk[alan] = !!g[alan];
    return { temiz, hatalar: h };
  }

  function epostaKullanimda(eposta, haric) {
    if (D.kayitlar.some(k => k.eposta === eposta && k.id !== haric)) return true;
    const kendi = haric && bul(haric);
    if (kendi && kendi.eposta === eposta) return false;
    return yoneticiMi(eposta);
  }

  function dogrulamaHatasi(hatalar) {
    const e = hata('Lütfen işaretli alanları düzeltin.');
    e.alanlar = hatalar;
    return e;
  }

  function duyuruDurumu(d, simdi) {
    if (simdi < new Date(d.baslangic)) return 'planli';
    if (simdi > new Date(d.bitis)) return 'bitti';
    return 'aktif';
  }
  function duyuruCikti(d) {
    const { olusturan, ...dis } = d; // eslint-disable-line no-unused-vars
    return dis;
  }
  function kuyrukDurumu(id) {
    const q = D.kuyruk[id];
    return q ? { toplam: q.toplam, gonderilen: q.gonderilen, bekleyen: q.toplam - q.gonderilen } : null;
  }

  /* ---------- Api: arayüzün kullandığı tek kapı ---------- */

  const Api = Object.assign({}, OFL, {
    MOD: 'demo',
    DEMO_KOD, YONETICI_EPOSTA,

    oturum,

    oturumAdiniGuncelle(ad) {
      const o = oturumOku();
      if (o) { o.ad = ad; oturumYaz(o); }
      const h = depoOku(HESAP_ANAHTARI);
      if (h) { h.ad = ad; depoYaz(HESAP_ANAHTARI, h); }
    },
    hesap: () => depoOku(HESAP_ANAHTARI),
    hesapUnut() { depoYaz(HESAP_ANAHTARI, null); },

    async girisKoduGonder(eposta) {
      await bekle(350);
      eposta = kucuk(eposta);
      if (yoneticiMi(eposta)) return { gonderildi: true };
      const k = D.kayitlar.find(x => x.eposta === eposta);
      if (!k) throw hata('Bu e-posta ile kayıtlı bir kullanıcı bulunamadı.');
      if (k.durum !== 'onayli') throw hata('Kaydınız henüz yönetici onayı bekliyor.');
      return { gonderildi: true };
    },

    async girisYap(eposta, kod, hatirla) {
      await bekle(300);
      eposta = kucuk(eposta);
      if (String(kod).trim() !== DEMO_KOD) throw hata('Kod hatalı. Demo için kod: ' + DEMO_KOD);
      const hedef = girisHedefi(eposta);
      if (!hedef) throw hata('Giriş yapılamadı.');
      delete sifreDenemeleri[eposta];
      return oturumAc(eposta, hedef, hatirla);
    },

    async sifreIleGiris(eposta, sifre, hatirla) {
      await bekle(300);
      eposta = kucuk(eposta);
      const say = sifreDenemeleri[eposta] || 0;
      if (say >= 5) throw hata('Çok fazla hatalı deneme. 15 dakika sonra tekrar deneyin ya da e-posta koduyla giriş yapın.');
      const hedef = girisHedefi(eposta);
      if (!hedef || D.sifreler[eposta] !== String(sifre)) {
        sifreDenemeleri[eposta] = say + 1;
        throw hata('E-posta veya şifre hatalı. Kalan deneme hakkı: ' + Math.max(0, 4 - say));
      }
      delete sifreDenemeleri[eposta];
      const verildi = D.degistirmeli[eposta];
      if (typeof verildi === 'number' && Date.now() - verildi > 7 * 864e5) throw hata('Geçici şifrenizin süresi doldu (7 gün). Okul yönetiminden yeni şifre isteyin ya da e-posta koduyla giriş yapın.');
      return Object.assign(oturumAc(eposta, hedef, hatirla), { degistirmeli: !!D.degistirmeli[eposta] });
    },

    async sifreSifirlamaKodu(eposta) { return Api.girisKoduGonder(eposta); },

    async sifreYenile(eposta, kod, sifre, hatirla) {
      await bekle(300);
      eposta = kucuk(eposta);
      if (String(sifre || '').length < 6) throw dogrulamaHatasi({ sifre: 'Şifre en az 6 karakter olmalıdır.' });
      if (String(kod).trim() !== DEMO_KOD) throw hata('Kod hatalı. Demo için kod: ' + DEMO_KOD);
      const hedef = girisHedefi(eposta);
      if (!hedef) throw hata('İşlem tamamlanamadı.');
      D.sifreler[eposta] = String(sifre);
      delete D.degistirmeli[eposta];
      delete sifreDenemeleri[eposta];
      kaydet();
      return oturumAc(eposta, hedef, hatirla);
    },

    async kullaniciSifre(id, islem, sifre) {
      yetkiGerekli('admin');
      await bekle(250);
      const k = bul(id);
      if (!k) throw hata('Kayıt bulunamadı.');
      if (islem === 'belirle') {
        if (String(sifre || '').length < 8) throw dogrulamaHatasi({ sifre: 'Geçici şifre en az 8 karakter olmalıdır.' });
        D.sifreler[k.eposta] = String(sifre);
        D.degistirmeli[k.eposta] = Date.now();
      } else {
        delete D.sifreler[k.eposta];
        delete D.degistirmeli[k.eposta];
      }
      delete sifreDenemeleri[k.eposta];
      kaydet();
      return { sifreVar: islem === 'belirle', telefon: k.telefon, eposta: k.eposta, ad: k.ad };
    },

    async sifreBelirle(sifre) {
      const o = yetkiGerekli();
      await bekle(250);
      sifre = String(sifre || '');
      if (sifre.length < 6) throw dogrulamaHatasi({ sifre: 'Şifre en az 6 karakter olmalıdır.' });
      if (sifre.length > 64) throw dogrulamaHatasi({ sifre: 'Şifre en fazla 64 karakter olabilir.' });
      const eposta = guncelEposta(o);
      D.sifreler[eposta] = sifre; // demo: gerçek sistemde yalnızca tuzlu özet saklanır
      delete D.degistirmeli[eposta];
      kaydet();
      const h = depoOku(HESAP_ANAHTARI);
      if (h) { h.sifreVar = true; depoYaz(HESAP_ANAHTARI, h); }
      return { sifreVar: true };
    },

    async hesabim() {
      const o = yetkiGerekli();
      const eposta = guncelEposta(o);
      return { eposta, rol: o.rol, sifreVar: !!D.sifreler[eposta], degistirmeli: !!D.degistirmeli[eposta] };
    },

    async demoGiris(rol, id) {
      let eposta, hedef;
      if (rol === 'admin') {
        eposta = YONETICI_EPOSTA; hedef = girisHedefi(eposta);
      } else {
        let k = id ? bul(id) : null;
        if (!k && rol === 'ogretmen') k = D.kayitlar.find(x => x.tur === 'ogretmen' && x.durum === 'onayli');
        if (!k) k = D.kayitlar.find(x => x.eposta === 'elif.aydin@example.com');
        eposta = k.eposta;
        hedef = { rol: k.tur === 'ogretmen' ? 'ogretmen' : 'mezun', id: k.id, ad: k.ad + ' ' + k.soyad };
      }
      return oturumAc(eposta, hedef, true);
    },

    cikis() { oturumYaz(null); },

    async rehber() {
      const o = yetkiGerekli();
      await bekle(120);
      const cevrimici = o.rol === 'admin' ? new Set(cevrimiciIdler()) : null;
      const izinler = o.rol === 'admin' ? null : telefonIzinleri(o.id);
      return D.kayitlar.filter(k => k.durum === 'onayli').map(k => {
        const m = maskele(k, o, izinler);
        if (cevrimici) m.cevrimici = cevrimici.has(k.id);
        return m;
      });
    },

    async mezun(id) {
      const o = yetkiGerekli();
      const k = bul(id);
      if (!k || (k.durum !== 'onayli' && o.rol !== 'admin')) throw hata('Kayıt bulunamadı.');
      const m = maskele(k, o, o.rol === 'admin' ? null : telefonIzinleri(o.id));
      if (o.rol === 'admin') m.sifreVar = !!D.sifreler[k.eposta];
      return m;
    },

    // İletişim talepleri (sunucudaki iletisim*_ işlevlerinin demo karşılığı; bildirimler demoda gösterilmez)
    async iletisimTalebi(id) {
      const o = yetkiGerekli('uye');
      await bekle(300);
      const h = bul(id);
      if (!h || h.durum !== 'onayli' || h.id === o.id) throw hata('Kişi bulunamadı.');
      if (h.gorunurluk.telefon) return { durum: 'acik' };
      const t = D.iletisim.find(x => x.isteyen === o.id && x.hedef === id);
      if (t && (t.durum === 'bekliyor' || t.durum === 'kabul')) return { durum: t.durum };
      if (t && t.durum === 'red' && Date.now() < Date.parse(t.yanit) + 7 * 864e5) throw hata('Bu kişi talebinizi kısa süre önce kabul etmedi. 7 gün sonra yeniden deneyebilirsiniz.');
      const simdi = new Date().toISOString();
      if (t) Object.assign(t, { durum: 'bekliyor', olusturma: simdi, yanit: '', goruldu: '' });
      else D.iletisim.push({ id: yeniId('it'), isteyen: o.id, hedef: id, durum: 'bekliyor', olusturma: simdi, yanit: '', goruldu: '' });
      kaydet();
      return { durum: 'bekliyor' };
    },

    async iletisimDurumu(id) {
      const o = yetkiGerekli('uye');
      await bekle(150);
      const h = bul(id);
      if (!h) throw hata('Kişi bulunamadı.');
      if (h.gorunurluk.telefon) return { durum: 'acik', telefon: h.telefon };
      const t = D.iletisim.find(x => x.isteyen === o.id && x.hedef === id);
      if (!t) return { durum: 'yok', telefonVar: !!h.telefon };
      const r = { durum: t.durum, tarih: t.durum === 'bekliyor' ? t.olusturma : t.yanit, telefonVar: !!h.telefon };
      if (t.durum === 'kabul') r.telefon = h.telefon;
      if (t.durum === 'red') r.tekrar = new Date(Date.parse(t.yanit) + 7 * 864e5).toISOString();
      return r;
    },

    async iletisimTalepleri() {
      const o = yetkiGerekli('uye');
      await bekle(200);
      const kisi = id => { const k = bul(id); return k && k.durum === 'onayli' ? { id: k.id, ad: k.ad, soyad: k.soyad, yil: k.yil, tur: k.tur, brans: k.tur === 'ogretmen' ? k.brans : '' } : null; };
      const gelen = D.iletisim.filter(t => t.hedef === o.id && (t.durum === 'bekliyor' || t.durum === 'kabul') && kisi(t.isteyen))
        .map(t => ({ id: t.id, kisi: kisi(t.isteyen), durum: t.durum, olusturma: t.olusturma, yanit: t.yanit }));
      const giden = D.iletisim.filter(t => t.isteyen === o.id && kisi(t.hedef))
        .map(t => ({ id: t.id, kisi: kisi(t.hedef), durum: t.durum, olusturma: t.olusturma, yanit: t.yanit,
          yeni: (t.durum === 'kabul' || t.durum === 'red') && !t.goruldu, tekrar: t.durum === 'red' ? new Date(Date.parse(t.yanit) + 7 * 864e5).toISOString() : '' }));
      return { gelen, giden };
    },

    async iletisimYanit(id, kabul) {
      const o = yetkiGerekli('uye');
      await bekle(250);
      const t = D.iletisim.find(x => x.id === id && x.hedef === o.id);
      if (!t) throw hata('Talep bulunamadı.');
      if (t.durum === 'bekliyor') t.durum = kabul ? 'kabul' : 'red';
      else if (t.durum === 'kabul' && !kabul) t.durum = 'geri';
      else return { durum: t.durum };
      t.yanit = new Date().toISOString(); t.goruldu = '';
      kaydet();
      return { durum: t.durum };
    },

    async iletisimGoruldu() {
      const o = yetkiGerekli('uye');
      D.iletisim.forEach(t => { if (t.isteyen === o.id && (t.durum === 'kabul' || t.durum === 'red') && !t.goruldu) t.goruldu = new Date().toISOString(); });
      kaydet();
      return { ok: true };
    },

    async cevrimici() { yetkiGerekli('admin'); return cevrimiciIdler(); },
    async nabiz() { yetkiGerekli(); return { ok: true }; },
    async pushAnahtari() { return null; }, // demoda telefon bildirimi yok
    async pushKaydet() { return { kayitli: false }; },
    async pushSil() { return { silindi: true }; },

    async profilKaydet(id, veri) {
      const o = yetkiGerekli();
      if (o.rol !== 'admin' && o.id !== id) throw hata('Yalnızca kendi bilgilerinizi değiştirebilirsiniz.');
      const k = bul(id);
      if (!k) throw hata('Kayıt bulunamadı.');
      await bekle(300);
      const yeniTur = o.rol === 'admin' && (veri.tur === 'ogretmen' || veri.tur === 'mezun') ? veri.tur : k.tur;
      const { temiz, hatalar } = dogrula(Object.assign({}, veri, { tur: yeniTur }), o.rol !== 'admin');
      if (!hatalar.eposta && epostaKullanimda(temiz.eposta, id)) hatalar.eposta = 'Bu e-posta başka bir kayıtta kullanılıyor.';
      if (!hatalar.telefon && telefonKullanimda(temiz.telefon, id)) hatalar.telefon = 'Bu telefon numarası başka bir kayıtta kullanılıyor.';
      if (Object.keys(hatalar).length) throw dogrulamaHatasi(hatalar);
      if (temiz.eposta !== k.eposta && D.sifreler[k.eposta]) {
        D.sifreler[temiz.eposta] = D.sifreler[k.eposta];
        delete D.sifreler[k.eposta];
      }
      const turDegisti = yeniTur !== k.tur;
      Object.assign(k, temiz, { tur: yeniTur, guncelleme: new Date().toISOString() });
      if (yeniTur === 'ogretmen') {
        k.calisma = '';
        if (turDegisti && !/[öÖoO][ğĞgG]retmen/i.test(k.meslek || '')) k.meslek = k.brans + ' Öğretmeni';
      }
      kaydet();
      return maskele(k, o);
    },

    // Herkese açık mezun başvurusu (yönetici onayına düşer).
    async kayitOl(veri) {
      await bekle(400);
      const { temiz, hatalar } = dogrula(Object.assign({}, veri, { tur: 'mezun' }), true);
      const eski = D.kayitlar.find(k => k.eposta === temiz.eposta);
      if (!hatalar.eposta && ((eski && eski.durum !== 'reddedildi') || yoneticiMi(temiz.eposta))) hatalar.eposta = 'Bu e-posta ile zaten bir kayıt var.';
      if (!hatalar.telefon && telefonKullanimda(temiz.telefon)) hatalar.telefon = TELEFON_KULLANIMDA;
      if (!veri.kvkkOnay) hatalar.kvkk = 'Devam etmek için açık rıza onayı gereklidir.';
      if (Object.keys(hatalar).length) throw dogrulamaHatasi(hatalar);
      const simdi = new Date().toISOString();
      if (eski) D.kayitlar.splice(D.kayitlar.indexOf(eski), 1);
      const k = Object.assign({ id: yeniId('m') }, temiz, {
        durum: 'beklemede', kvkkOnay: simdi, kayitTarihi: simdi, guncelleme: simdi, silmeTalebi: null
      });
      D.kayitlar.push(k);
      kaydet();
      return { id: k.id, durum: k.durum };
    },

    // Yöneticinin elle eklediği mezun veya öğretmen; doğrudan onaylı olur.
    async kullaniciEkle(veri) {
      yetkiGerekli('admin');
      await bekle(400);
      const tur = veri.tur === 'ogretmen' ? 'ogretmen' : 'mezun';
      const { temiz, hatalar } = dogrula(Object.assign({}, veri, { tur }));
      if (!hatalar.eposta && D.kayitlar.some(k => k.eposta === temiz.eposta)) hatalar.eposta = 'Bu e-posta ile zaten bir kayıt var.';
      if (!hatalar.telefon && telefonKullanimda(temiz.telefon)) hatalar.telefon = TELEFON_KULLANIMDA;
      if (Object.keys(hatalar).length) throw dogrulamaHatasi(hatalar);
      const simdi = new Date().toISOString();
      const k = Object.assign({ id: yeniId(tur === 'ogretmen' ? 't' : 'm') }, temiz, {
        durum: 'onayli', kvkkOnay: null, kayitTarihi: simdi, guncelleme: simdi, silmeTalebi: null
      });
      D.kayitlar.push(k);
      const yonetici = tur === 'ogretmen' && !!veri.yonetici && asilMi((oturumOku() || {}).eposta);
      if (yonetici && !yoneticiMi(k.eposta)) D.yoneticiler.push({ eposta: k.eposta, ad: k.ad + ' ' + k.soyad });
      kaydet();
      return { id: k.id, durum: 'onayli', yonetici, bilgilendirildi: veri.bilgilendir !== false };
    },

    async silmeTalebiGonder() {
      const o = yetkiGerekli('uye');
      const k = bul(o.id);
      await bekle(250);
      k.silmeTalebi = k.silmeTalebi ? null : new Date().toISOString();
      kaydet();
      return maskele(k, o);
    },

    async duyurular() {
      const o = yetkiGerekli();
      await bekle(150);
      const simdi = new Date();
      if (o.rol === 'admin') {
        return D.duyurular.map(d => Object.assign(duyuruCikti(d), { durum: duyuruDurumu(d, simdi), epostaDurumu: kuyrukDurumu(d.id) }))
          .sort((a, b) => String(b.olusturma).localeCompare(String(a.olusturma)));
      }
      return D.duyurular
        .filter(d => duyuruDurumu(d, simdi) === 'aktif' && (d.hedef === 'herkes' || d.hedef === o.rol))
        .map(duyuruCikti)
        .sort((a, b) => String(b.baslangic).localeCompare(String(a.baslangic)));
    },

    async duyuruKaydet(v) {
      const o = yetkiGerekli('admin');
      await bekle(350);
      const h = {};
      const metin = (x, n) => String(x == null ? '' : x).trim().slice(0, n);
      const d = {
        baslik: metin(v.baslik, 120),
        metin: String(v.metin || '').replace(/\r\n/g, '\n').trim().slice(0, 4000),
        tur: ['bilgi', 'etkinlik', 'onemli'].includes(v.tur) ? v.tur : 'bilgi',
        hedef: ['herkes', 'mezun', 'ogretmen'].includes(v.hedef) ? v.hedef : 'herkes',
        baglantiMetni: metin(v.baglantiMetni, 40), baglantiUrl: metin(v.baglantiUrl, 500),
        baslangic: new Date(v.baslangic), bitis: new Date(v.bitis), eposta: !!v.eposta
      };
      if (!d.baslik) h.baslik = 'Başlık zorunludur.';
      if (!d.metin) h.metin = 'Duyuru metni zorunludur.';
      if (d.baglantiUrl && !/^https?:\/\/\S+$/i.test(d.baglantiUrl)) h.baglantiUrl = 'Bağlantı http:// veya https:// ile başlamalıdır.';
      if (isNaN(d.baslangic)) h.baslangic = 'Geçerli bir başlangıç tarihi seçin.';
      if (isNaN(d.bitis)) h.bitis = 'Geçerli bir bitiş tarihi seçin.';
      else if (!h.baslangic && d.bitis <= d.baslangic) h.bitis = 'Bitiş, başlangıçtan sonra olmalıdır.';
      else if (d.bitis <= new Date()) h.bitis = 'Bitiş tarihi geçmişte olamaz.';
      if (Object.keys(h).length) throw dogrulamaHatasi(h);
      if (d.baglantiUrl && !d.baglantiMetni) d.baglantiMetni = 'Ayrıntılar';
      const simdi = new Date().toISOString();
      const mevcut = v.id ? D.duyurular.find(x => x.id === v.id) : null;
      if (v.id && !mevcut) throw hata('Duyuru bulunamadı.');
      const k = Object.assign(mevcut || { id: yeniId('d'), olusturan: o.eposta, olusturma: simdi }, d, {
        baslangic: d.baslangic.toISOString(), bitis: d.bitis.toISOString(), guncelleme: simdi,
        eposta: d.eposta || !!(mevcut && mevcut.eposta)
      });
      if (!mevcut) D.duyurular.push(k);
      if (k.eposta && !D.kuyruk[k.id]) {
        // Demo: gerçek sistemdeki günlük kotayı taklit eder (bugün 85 kişi, kalanı sonraki günlere).
        const toplam = D.kayitlar.filter(x => x.durum === 'onayli' && (k.hedef === 'herkes' || k.hedef === x.tur)).length;
        D.kuyruk[k.id] = { toplam, gonderilen: duyuruDurumu(k, new Date()) === 'aktif' ? Math.min(toplam, 85) : 0 };
      }
      kaydet();
      return Object.assign(duyuruCikti(k), { durum: duyuruDurumu(k, new Date()), epostaDurumu: kuyrukDurumu(k.id) });
    },

    async duyuruSil(id) {
      yetkiGerekli('admin');
      await bekle(200);
      const i = D.duyurular.findIndex(d => d.id === id);
      if (i < 0) throw hata('Duyuru bulunamadı.');
      D.duyurular.splice(i, 1);
      delete D.kuyruk[id];
      kaydet();
      return { silindi: true };
    },

    async rozetler() {
      yetkiGerekli('admin');
      return {
        bekleyen: D.kayitlar.filter(k => k.durum === 'beklemede').length,
        silme: D.kayitlar.filter(k => k.silmeTalebi).length
      };
    },

    async bekleyenler() {
      const o = yetkiGerekli('admin');
      return D.kayitlar.filter(k => k.durum === 'beklemede').map(k => maskele(k, o));
    },

    async silmeTalepleri() {
      const o = yetkiGerekli('admin');
      return D.kayitlar.filter(k => k.silmeTalebi).map(k => maskele(k, o));
    },

    async onayla(id, tur, brans, sifre) {
      yetkiGerekli('admin');
      const k = bul(id);
      if (!k) throw hata('Kayıt bulunamadı.');
      await bekle(200);
      if (tur === 'ogretmen') {
        brans = OFL.yaziDuzelt(String(brans || '').trim());
        if (!brans) throw hata('Öğretmen için branş yazın.');
        k.tur = 'ogretmen'; k.brans = brans; k.calisma = '';
        if (!/[öÖoO][ğĞgG]retmen/i.test(k.meslek || '')) k.meslek = brans + ' Öğretmeni';
      } else if (tur === 'mezun') k.tur = 'mezun';
      if (sifre && String(sifre).length < 8) throw dogrulamaHatasi({ sifre: 'Geçici şifre en az 8 karakter olmalıdır.' });
      if (sifre) { D.sifreler[k.eposta] = String(sifre); D.degistirmeli[k.eposta] = Date.now(); delete sifreDenemeleri[k.eposta]; }
      k.durum = 'onayli';
      k.redTarihi = null;
      kaydet();
      return { durum: 'onayli', geciciSifre: !!sifre, telefon: k.telefon, eposta: k.eposta, ad: k.ad };
    },

    // Demoda mezun listesi yok; kontrol sonucu kayda göre taklit edilir.
    async basvuruKontrol(id) {
      yetkiGerekli('admin');
      await bekle(400);
      const k = bul(id);
      if (!k) throw hata('Kayıt bulunamadı.');
      const n = [...k.id].reduce((a, c) => a + c.charCodeAt(0), 0) % 3;
      return n === 0 ? { listede: true, listeAd: k.ad + ' ' + k.soyad, telefonEslesiyor: true, telefonListedeBaskasi: '' }
        : n === 1 ? { listede: true, listeAd: k.ad + ' ' + k.soyad, telefonEslesiyor: false, telefonListedeBaskasi: '' }
        : { listede: false, listeAd: '', telefonEslesiyor: null, telefonListedeBaskasi: '' };
    },

    async reddet(id, sebep, bildir) {
      yetkiGerekli('admin');
      const k = bul(id);
      if (!k || k.durum !== 'beklemede') throw hata('Bekleyen başvuru bulunamadı.');
      sebep = String(sebep || '').trim();
      if (bildir && sebep.length < 5) throw hata('E-postayla gönderilecekse kısa bir red sebebi yazın.');
      await bekle(200);
      k.durum = 'reddedildi';
      k.redTarihi = new Date().toISOString();
      kaydet();
      // Demoda e-posta gönderilmez; gerçek sistemde sebep başvurana iletilir.
      return { durum: k.durum, bildirildi: !!bildir };
    },

    async destekGonder(v) {
      await bekle(300);
      if (!v || !v.ad || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.eposta || '') || String(v.mesaj || '').trim().length < 10) throw hata('Lütfen formu eksiksiz doldurun.');
      // Demoda mesaj gönderilmez; gerçek sistemde okulun e-posta adresine iletilir.
      return { ok: true };
    },

    async reddedilenler() {
      const o = yetkiGerekli('admin');
      return D.kayitlar.filter(k => k.durum === 'reddedildi').map(k => maskele(k, o));
    },

    // Silinen kayıt 3 gün "Silinen kişiler"de bekler (sunucudaki sil_ / silmeyiGeriAl_ karşılığı; demoda e-posta gönderilmez).
    async sil(id, sebep, bildir) {
      const o = yetkiGerekli('admin');
      sebep = String(sebep || '').trim();
      if (bildir && sebep.length < 5) throw hata('E-postayla gönderilecekse kısa bir açıklama yazın.');
      await bekle(200);
      const i = D.kayitlar.findIndex(k => k.id === id);
      if (i < 0) throw hata('Kayıt bulunamadı.');
      const k = D.kayitlar[i];
      const yoneticiydi = yoneticiMi(k.eposta) && !asilMi(k.eposta);
      D.kayitlar.splice(i, 1);
      D.silinenler = D.silinenler || [];
      D.silinenler.unshift({ kayit: k, tarih: new Date().toISOString(), silen: o.eposta, sebep, bildirildi: !!(bildir && k.eposta), yoneticiydi });
      if (k.tur === 'ogretmen' && k.eposta !== o.eposta && D.yoneticiler.length > 1) {
        D.yoneticiler = D.yoneticiler.filter(y => y.eposta !== k.eposta);
      }
      kaydet();
      return { silindi: true, bildirildi: !!(bildir && k.eposta), silinecek: new Date(Date.now() + 3 * 864e5).toISOString() };
    },

    async silinenler() {
      yetkiGerekli('admin');
      await bekle(150);
      const sinir = Date.now() - 3 * 864e5;
      const kalan = (D.silinenler || []).filter(s => Date.parse(s.tarih) >= sinir);
      if (kalan.length !== (D.silinenler || []).length) {
        (D.silinenler || []).filter(s => !kalan.includes(s)).forEach(s => { if (!yoneticiMi(s.kayit.eposta)) delete D.sifreler[s.kayit.eposta]; });
        D.silinenler = kalan; kaydet();
      }
      const ad = e => { const y = D.yoneticiler.find(x => x.eposta === e); const k = D.kayitlar.find(x => x.eposta === e); return k ? k.ad + ' ' + k.soyad : y ? y.ad : e; };
      return kalan.map(s => ({ id: s.kayit.id, ad: s.kayit.ad, soyad: s.kayit.soyad, eposta: s.kayit.eposta, yil: s.kayit.yil, tur: s.kayit.tur,
        brans: s.kayit.brans, onceki: s.kayit.durum, kvkk: !!s.kayit.silmeTalebi, tarih: s.tarih, silen: ad(s.silen), sebep: s.sebep,
        bildirildi: s.bildirildi, yoneticiydi: s.yoneticiydi, silinecek: new Date(Date.parse(s.tarih) + 3 * 864e5).toISOString() }));
    },

    async silmeyiGeriAl(id) {
      const o = yetkiGerekli('admin');
      await bekle(250);
      const i = (D.silinenler || []).findIndex(s => s.kayit.id === id);
      if (i < 0) throw hata('Silinen kayıt bulunamadı; 3 günlük saklama süresi dolmuş olabilir.');
      const s = D.silinenler[i], k = s.kayit;
      if (k.eposta && D.kayitlar.some(x => x.eposta === k.eposta && x.durum !== 'reddedildi')) throw hata('Bu e-posta adresiyle sonradan yeni bir kayıt açılmış. Geri almadan önce o kaydı inceleyin.');
      if (telefonKullanimda(k.telefon, k.id)) throw hata('Bu telefon numarasıyla sonradan yeni bir kayıt açılmış. Geri almadan önce o kaydı inceleyin.');
      D.kayitlar.push(k);
      D.silinenler.splice(i, 1);
      let yetki = false;
      if (s.yoneticiydi && asilMi(o.eposta) && !yoneticiMi(k.eposta)) { D.yoneticiler.push({ eposta: k.eposta, ad: k.ad + ' ' + k.soyad }); yetki = true; }
      kaydet();
      return { id: k.id, durum: k.durum, bildirildi: !!k.eposta, yetki, yetkiKaldi: s.yoneticiydi && !yetki, sifreVar: !!D.sifreler[k.eposta] };
    },

    async yoneticiYap(id) {
      const o = yetkiGerekli('admin');
      if (!asilMi(o.eposta)) throw hata('Yönetici yetkisini yalnızca asil yöneticiler verip kaldırabilir.');
      await bekle(250);
      const k = bul(id);
      if (!k || k.durum !== 'onayli') throw hata('Onaylı bir kayıt seçin.');
      if (!yoneticiMi(k.eposta)) D.yoneticiler.push({ eposta: k.eposta, ad: k.ad + ' ' + k.soyad });
      kaydet();
      return { yonetici: true };
    },

    async yoneticiKaldir(eposta) {
      const o = yetkiGerekli('admin');
      if (!asilMi(o.eposta)) throw hata('Yönetici yetkisini yalnızca asil yöneticiler verip kaldırabilir.');
      if (asilMi(eposta)) throw hata('Asil yöneticinin yetkisi uygulamadan kaldırılamaz.');
      await bekle(250);
      D.yoneticiler = D.yoneticiler.filter(y => y.eposta !== kucuk(eposta));
      kaydet();
      return { yonetici: false };
    },

    async yoneticiler() {
      yetkiGerekli('admin');
      const o = oturumOku() || {};
      return D.yoneticiler.map(y => ({ eposta: y.eposta, ad: y.ad, asil: asilMi(y.eposta), sen: y.eposta === kucuk(o.eposta || '') }));
    },

    async istatistik() {
      yetkiGerekli('admin');
      const onayli = D.kayitlar.filter(k => k.durum === 'onayli');
      const mezunlar = onayli.filter(k => k.tur !== 'ogretmen');
      const yillar = {};
      for (let y = ILK_YIL; y <= BU_YIL; y++) yillar[y] = 0;
      const sehirler = {};
      let telefonPaylasan = 0, epostaPaylasan = 0;
      for (const k of mezunlar) {
        yillar[k.yil] = (yillar[k.yil] || 0) + 1;
        const s = k.sehir || 'Belirtilmemiş';
        sehirler[s] = (sehirler[s] || 0) + 1;
        if (k.gorunurluk.telefon) telefonPaylasan++;
        if (k.gorunurluk.eposta) epostaPaylasan++;
      }
      return {
        toplam: mezunlar.length,
        ogretmen: onayli.length - mezunlar.length,
        bekleyen: D.kayitlar.filter(k => k.durum === 'beklemede').length,
        reddedilen: D.kayitlar.filter(k => k.durum === 'reddedildi').length,
        silmeTalebi: D.kayitlar.filter(k => k.silmeTalebi).length,
        silinen: (D.silinenler || []).length,
        telefonPaylasan, epostaPaylasan, epostaKotasi: 100,
        yillar: Object.entries(yillar).map(([yil, adet]) => ({ yil: +yil, adet })),
        sehirler: Object.entries(sehirler).map(([sehir, adet]) => ({ sehir, adet }))
          .sort((a, b) => b.adet - a.adet)
      };
    },

    async csv() {
      yetkiGerekli('admin');
      const basliklar = ['Tür', 'Ad', 'Soyad', 'Mezuniyet Yılı', 'Çalışma Durumu', 'Üniversite', 'Bölüm', 'Meslek', 'Kurum', 'Branş / Uzmanlık', 'Şehir', 'Telefon', 'E-posta', 'Durum', 'Son Güncelleme'];
      const calismaAdi = { calisiyor: 'Çalışıyor', calismiyor: 'Çalışmıyor', ogrenci: 'Öğrenci' };
      const durumAdi = { onayli: 'Onaylı', beklemede: 'Onay bekliyor', reddedildi: 'Reddedildi' };
      const hucre = v => {
        let s = String(v == null ? '' : v);
        if (/^[=+\-@]/.test(s)) s = "'" + s; // Excel formül enjeksiyonuna karşı
        return '"' + s.replace(/"/g, '""') + '"';
      };
      const satirlar = D.kayitlar.map(k => [k.tur === 'ogretmen' ? 'Öğretmen' : 'Mezun', k.ad, k.soyad, k.yil || '', calismaAdi[k.calisma] || '',
        k.universite, k.bolum, k.meslek, k.kurum, k.brans, k.sehir, k.telefon, k.eposta,
        durumAdi[k.durum], k.guncelleme.slice(0, 10)].map(hucre).join(';'));
      return '﻿' + [basliklar.map(hucre).join(';')].concat(satirlar).join('\r\n');
    },

    demoSifirla() {
      depoYaz(DEPO_ANAHTARI, null);
      depoYaz(HESAP_ANAHTARI, null);
      oturumYaz(null);
      try { Object.keys(localStorage).filter(a => a.startsWith('ofl-duyuru-')).forEach(a => localStorage.removeItem(a)); } catch (e) { /* yok say */ }
      D = ilkDurum();
    }
  });

  window.Api = Api;
})();
