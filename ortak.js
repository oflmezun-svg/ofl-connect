/* OFL Connect — arayüz ve demo sunucunun ortak kullandığı sabitler, listeler ve yardımcılar.
   Aynı kurallar sunucu/Code.gs içinde de uygulanır. */
(function () {
  'use strict';

  const ayar = window.OFL_AYAR || {};

  function katla(s) {
    return String(s == null ? '' : s)
      .toLocaleLowerCase('tr-TR')
      .replace(/ı/g, 'i').replace(/ş/g, 's').replace(/ğ/g, 'g')
      .replace(/ü/g, 'u').replace(/ö/g, 'o').replace(/ç/g, 'c')
      .replace(/[âà]/g, 'a').replace(/[îì]/g, 'i').replace(/[ûù]/g, 'u');
  }

  function telefonDuzenle(t) {
    let r = String(t || '').replace(/\D/g, '');
    if (r.startsWith('90') && r.length === 12) r = r.slice(2);
    if (r.length === 10 && r[0] === '5') r = '0' + r;
    if (!/^05\d{9}$/.test(r)) return null;
    return `${r.slice(0, 4)} ${r.slice(4, 7)} ${r.slice(7, 9)} ${r.slice(9)}`;
  }

  // Türkçe yazım düzeni (sunucudaki yaziDuzelt_ ile aynı): "ahmet YILMAZ" → "Ahmet Yılmaz".
  const BAGLAC = ['ve', 'ile', 'veya', 'ya', 'da', 'de', 'ki', 'için', 'of', 'and', 'the', 'for', 'in', 'at'];
  const KISALTMA = ['ODTÜ', 'ODTU', 'İTÜ', 'ITU', 'YTÜ', 'KTÜ', 'DEÜ', 'GTÜ', 'TOBB', 'ETÜ', 'TED', 'ABD', 'KKTC', 'MEB', 'YÖK', 'TRT', 'THY',
    'SGK', 'PTT', 'TCDD', 'AFAD', 'TSK', 'MİT', 'TÜBİTAK', 'ASELSAN', 'HAVELSAN', 'ROKETSAN', 'TUSAŞ', 'BOTAŞ', 'İSKİ', 'ASKİ', 'MIT', 'UCLA', 'NASA', 'CERN', 'IBM'];
  const buyuk = x => x.replace(/i/g, 'İ').replace(/ı/g, 'I').toUpperCase();
  const kucuk = x => x.replace(/I/g, 'ı').replace(/İ/g, 'i').toLowerCase();
  function yaziDuzelt(s, isim) {
    s = String(s || '').trim();
    if (!s) return s;
    const tamamiBuyuk = s === buyuk(s);
    return s.split(' ').map((kelime, i) => kelime.split('-').map((parca, j) => {
      if (!parca) return parca;
      const harfler = parca.replace(/[^A-Za-zÇĞİÖŞÜçğıöşüÂÎÛâîû]/g, '');
      if (!isim && KISALTMA.includes(buyuk(harfler))) return parca.replace(harfler, buyuk(harfler));
      if (!isim && !tamamiBuyuk && harfler.length >= 2 && harfler.length <= 5 && parca === buyuk(parca)) return parca;
      const k = kucuk(parca);
      if (!isim && (i > 0 || j > 0) && BAGLAC.includes(k)) return k;
      const ilk = k.search(/[a-zçğıöşüâîû0-9]/);
      if (ilk < 0) return parca;
      return k.slice(0, ilk) + buyuk(k.charAt(ilk)) + k.slice(ilk + 1);
    }).join('-')).join(' ');
  }

  const SEHIRLER = ['Adana', 'Adıyaman', 'Afyonkarahisar', 'Ağrı', 'Aksaray', 'Amasya', 'Ankara', 'Antalya', 'Ardahan', 'Artvin', 'Aydın',
    'Balıkesir', 'Bartın', 'Batman', 'Bayburt', 'Bilecik', 'Bingöl', 'Bitlis', 'Bolu', 'Burdur', 'Bursa', 'Çanakkale', 'Çankırı', 'Çorum',
    'Denizli', 'Diyarbakır', 'Düzce', 'Edirne', 'Elazığ', 'Erzincan', 'Erzurum', 'Eskişehir', 'Gaziantep', 'Giresun', 'Gümüşhane', 'Hakkari',
    'Hatay', 'Iğdır', 'Isparta', 'İstanbul', 'İzmir', 'Kahramanmaraş', 'Karabük', 'Karaman', 'Kars', 'Kastamonu', 'Kayseri', 'Kilis',
    'Kırıkkale', 'Kırklareli', 'Kırşehir', 'Kocaeli', 'Konya', 'Kütahya', 'Malatya', 'Manisa', 'Mardin', 'Mersin', 'Muğla', 'Muş', 'Nevşehir',
    'Niğde', 'Ordu', 'Osmaniye', 'Rize', 'Sakarya', 'Samsun', 'Şanlıurfa', 'Siirt', 'Sinop', 'Şırnak', 'Sivas', 'Tekirdağ', 'Tokat', 'Trabzon',
    'Tunceli', 'Uşak', 'Van', 'Yalova', 'Yozgat', 'Zonguldak'];

  const UNIVERSITELER = ['Acıbadem Üniversitesi', 'Adana Alparslan Türkeş Bilim ve Teknoloji Üniversitesi', 'Adıyaman Üniversitesi',
    'Afyon Kocatepe Üniversitesi', 'Akdeniz Üniversitesi', 'Aksaray Üniversitesi', 'Amasya Üniversitesi', 'Anadolu Üniversitesi',
    'Ankara Hacı Bayram Veli Üniversitesi', 'Ankara Medipol Üniversitesi', 'Ankara Sosyal Bilimler Üniversitesi', 'Ankara Üniversitesi',
    'Ankara Yıldırım Beyazıt Üniversitesi', 'Atatürk Üniversitesi', 'Atılım Üniversitesi', 'Aydın Adnan Menderes Üniversitesi',
    'Bahçeşehir Üniversitesi', 'Balıkesir Üniversitesi', 'Başkent Üniversitesi', 'Bilkent Üniversitesi', 'Bingöl Üniversitesi',
    'Boğaziçi Üniversitesi', 'Bursa Teknik Üniversitesi', 'Bursa Uludağ Üniversitesi', 'Çanakkale Onsekiz Mart Üniversitesi',
    'Çankaya Üniversitesi', 'Çukurova Üniversitesi', 'Dicle Üniversitesi', 'Dokuz Eylül Üniversitesi', 'Ege Üniversitesi',
    'Erciyes Üniversitesi', 'Eskişehir Osmangazi Üniversitesi', 'Eskişehir Teknik Üniversitesi', 'Fırat Üniversitesi', 'Galatasaray Üniversitesi',
    'Gazi Üniversitesi', 'Gaziantep Üniversitesi', 'Gebze Teknik Üniversitesi', 'Hacettepe Üniversitesi', 'Hasan Kalyoncu Üniversitesi',
    'Hatay Mustafa Kemal Üniversitesi', 'İhsan Doğramacı Bilkent Üniversitesi', 'İnönü Üniversitesi', 'İskenderun Teknik Üniversitesi',
    'İstanbul Medeniyet Üniversitesi', 'İstanbul Medipol Üniversitesi', 'İstanbul Teknik Üniversitesi', 'İstanbul Üniversitesi',
    'İstanbul Üniversitesi-Cerrahpaşa', 'İzmir Katip Çelebi Üniversitesi', 'İzmir Yüksek Teknoloji Enstitüsü', 'Kadir Has Üniversitesi',
    'Kahramanmaraş Sütçü İmam Üniversitesi', 'Karadeniz Teknik Üniversitesi', 'Kocaeli Üniversitesi', 'Koç Üniversitesi',
    'Konya Teknik Üniversitesi', 'Malatya Turgut Özal Üniversitesi', 'Marmara Üniversitesi', 'Mersin Üniversitesi', 'Muğla Sıtkı Koçman Üniversitesi',
    'Necmettin Erbakan Üniversitesi', 'Ondokuz Mayıs Üniversitesi', 'Orta Doğu Teknik Üniversitesi', 'Osmaniye Korkut Ata Üniversitesi',
    'Özyeğin Üniversitesi', 'Pamukkale Üniversitesi', 'Sabancı Üniversitesi', 'Sağlık Bilimleri Üniversitesi', 'Sakarya Üniversitesi',
    'Selçuk Üniversitesi', 'Sivas Cumhuriyet Üniversitesi', 'Süleyman Demirel Üniversitesi', 'TED Üniversitesi',
    'TOBB Ekonomi ve Teknoloji Üniversitesi', 'Trakya Üniversitesi', 'Türk-Alman Üniversitesi', 'Yeditepe Üniversitesi',
    'Yıldız Teknik Üniversitesi', 'Zonguldak Bülent Ecevit Üniversitesi'];

  const BOLUMLER = ['Tıp', 'Diş Hekimliği', 'Eczacılık', 'Hemşirelik', 'Fizyoterapi ve Rehabilitasyon', 'Beslenme ve Diyetetik', 'Veteriner Hekimliği',
    'Bilgisayar Mühendisliği', 'Yazılım Mühendisliği', 'Elektrik-Elektronik Mühendisliği', 'Makine Mühendisliği', 'İnşaat Mühendisliği',
    'Endüstri Mühendisliği', 'Kimya Mühendisliği', 'Havacılık ve Uzay Mühendisliği', 'Biyomedikal Mühendisliği', 'Mekatronik Mühendisliği',
    'Malzeme Bilimi ve Mühendisliği', 'Gıda Mühendisliği', 'Çevre Mühendisliği', 'Jeoloji Mühendisliği', 'Mimarlık', 'İç Mimarlık',
    'Şehir ve Bölge Planlama', 'Matematik', 'Fizik', 'Kimya', 'Biyoloji', 'Moleküler Biyoloji ve Genetik', 'İstatistik', 'Hukuk', 'İktisat',
    'İşletme', 'Uluslararası İlişkiler', 'Siyaset Bilimi ve Kamu Yönetimi', 'Psikoloji', 'Sosyoloji', 'Tarih', 'Felsefe', 'Türk Dili ve Edebiyatı',
    'İngiliz Dili ve Edebiyatı', 'Mütercim-Tercümanlık', 'Matematik Öğretmenliği', 'Fen Bilgisi Öğretmenliği', 'Fizik Öğretmenliği',
    'Kimya Öğretmenliği', 'Biyoloji Öğretmenliği', 'Rehberlik ve Psikolojik Danışmanlık', 'İletişim', 'Ekonomi', 'Pilotaj'];

  const MESLEKLER = ['Doktor', 'Uzman Doktor', 'Asistan Doktor', 'Diş Hekimi', 'Eczacı', 'Hemşire', 'Veteriner Hekim', 'Akademisyen', 'Araştırmacı',
    'Öğretmen', 'Mühendis', 'Yazılım Mühendisi', 'Yazılım Geliştirici', 'Veri Bilimci', 'Elektrik-Elektronik Mühendisi', 'Makine Mühendisi',
    'İnşaat Mühendisi', 'Endüstri Mühendisi', 'Mimar', 'Avukat', 'Hâkim', 'Savcı', 'Ekonomist', 'Bankacı', 'Finans Uzmanı', 'Psikolog',
    'Pilot', 'Subay', 'Kamu Görevlisi', 'Girişimci', 'Proje Yöneticisi', 'Danışman'];

  const CALISMA_ADI = { calisiyor: 'Çalışıyor', calismiyor: 'Çalışmıyor', ogrenci: 'Üniversite öğrencisi' };

  window.OFL = {
    // Mezunun gizleyip açabildiği alanlar. Ad-soyad ve mezuniyet yılı tüm üyelere görünür.
    ALANLAR: ['egitim', 'meslek', 'sehir', 'telefon', 'eposta'],
    ALAN_ADI: { egitim: 'Üniversite ve bölüm', meslek: 'Çalışma durumu ve meslek', sehir: 'Şehir', telefon: 'Telefon', eposta: 'E-posta' },
    ILK_YIL: ayar.ILK_MEZUN_YILI || 2004,
    BU_YIL: new Date().getFullYear(),
    OKUL_ADI: ayar.OKUL_ADI || 'TOBB Osmaniye Fen Lisesi',
    SEHIRLER, UNIVERSITELER, BOLUMLER, MESLEKLER, CALISMA_ADI,
    katla,
    telefonDuzenle,
    yaziDuzelt
  };
})();
