/* OFL Connect — arayüz ve demo sunucunun ortak kullandığı sabitler ve yardımcılar.
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

  window.OFL = {
    // Mezunun gizleyip açabildiği alanlar. Ad-soyad ve mezuniyet yılı tüm üyelere görünür.
    ALANLAR: ['egitim', 'meslek', 'sehir', 'telefon', 'eposta'],
    ALAN_ADI: { egitim: 'Üniversite ve bölüm', meslek: 'Meslek', sehir: 'Şehir', telefon: 'Telefon', eposta: 'E-posta' },
    ILK_YIL: ayar.ILK_MEZUN_YILI || 2004,
    BU_YIL: new Date().getFullYear(),
    OKUL_ADI: ayar.OKUL_ADI || 'TOBB Osmaniye Fen Lisesi',
    katla,
    telefonDuzenle
  };
})();
