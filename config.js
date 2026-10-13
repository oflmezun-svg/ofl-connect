/* OFL Connect — ayarlar.
 *
 * API_URL boşsa uygulama DEMO modunda çalışır (hayali veriler, tarayıcıda saklanır).
 * Gerçek sisteme geçmek için Apps Script'i "Web uygulaması" olarak yayınlayınca
 * verilen adresi (https://script.google.com/macros/s/.../exec) buraya yapıştırın.
 * Bu adres gizli değildir; veriler giriş kontrolüyle korunur.
 *
 * Adresin sonuna ?demo eklenirse (ör. .../ofl-connect/?demo) gerçek veriye hiç
 * dokunmadan hayali verilerle demo açılır; tanıtım için kullanılabilir.
 */
window.OFL_AYAR = {
  API_URL: /[?&]demo\b/.test(location.search) ? '' : 'https://script.google.com/macros/s/AKfycby2oyRJ0U0Hjze8PUO1jaoyaCPWMqIcMgq75wrgzRaqx-blE6yMfAWCd9PosacXJcGH/exec',
  OKUL_ADI: 'TOBB Osmaniye Fen Lisesi',
  ILK_MEZUN_YILI: 2004
};
