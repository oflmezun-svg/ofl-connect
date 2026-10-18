# OFL Connect

TOBB Osmaniye Fen Lisesi mezun ağı. Telefona uygulama olarak kurulabilen bir web uygulaması (PWA).

- **Demo modu:** `config.js` içinde `API_URL` boşken ya da adresin sonuna `?demo` eklendiğinde çalışır. ~1.200 hayali mezun, 12 öğretmen ve örnek duyurularla her şey denenebilir; değişiklikler yalnızca o tarayıcıda saklanır.
- **Gerçek sistem:** Google E-Tablo + Apps Script ile çalışır. Kurulum için → [KURULUM.md](KURULUM.md)

## Demoyu denemek

Klasörde bir terminal açın, `python3 -m http.server 8765` komutunu çalıştırın ve tarayıcıda `http://localhost:8765` adresini açın.
Giriş ekranındaki **Yönetici** / **Mezun** / **Öğretmen** düğmeleriyle girin. E-postayla girişte demo kodu `123456`'dır.

## Yetkiler

| | Yönetici | Mezun ve öğretmen |
|---|---|---|
| Rehber | Tüm bilgiler | Ad-soyad, yıl/branş + kişinin **görünür** yaptığı bilgiler |
| Bilgi düzenleme | Herkesin | Yalnızca kendisinin (Profilim) |
| Duyurular | Hazırlar, yayınlar, e-posta ve telefon bildirimiyle gönderir | Görür; isterse telefon bildirimi alır |
| Başvuru inceleme, onay, red ve reddi geri alma (30 gün) | ✓ | — |
| Kullanıcının şifresini sıfırlama / geçici şifre verme | ✓ | Kendisi “Şifremi unuttum” ile yeniler |
| Çevrimiçi kullanıcıları görme | ✓ | — |
| Kullanıcı (mezun/öğretmen) ekleme | ✓ | — |
| Kayıt silme, Excel'e aktarma | ✓ | — |
| KVKK silme talebi | İşler | Gönderir |
| Yönetici ekleme | Öğretmen eklerken “Yönetici yetkisi ver” ya da Google E-Tablo'dan | — |

Giriş: ilk seferde e-posta kodu; sonra isteğe bağlı şifre. “Bu cihazda oturumum açık kalsın” seçilirse 90 gün yeniden giriş gerekmez.

Gizlilik kuralları sunucuda uygulanır: Bir mezunun gizlediği bilgi diğer mezunların tarayıcısına hiç gönderilmez.

## Dosyalar

| Dosya | Görevi |
|---|---|
| `index.html`, `styles.css`, `app.js` | Arayüz |
| `config.js` | Sunucu adresi ve okul ayarları |
| `ortak.js` | Ortak kurallar (alanlar, telefon biçimi, Türkçe arama) |
| `api.js` | Gerçek sunucuya (Apps Script) bağlantı |
| `data.js` | Demo sunucusu (hayali veriler) |
| `manifest.json`, `sw.js`, `icons/` | Telefona kurulum, çevrimdışı açılış ve duyuru bildirimleri |
| `sunucu/Code.gs` | Google Apps Script sunucu kodu |

Logo okulun web sitesindeki duyuru görselinden alınmıştır. Daha yüksek çözünürlüklü bir logo dosyası olursa
`icons/ofl-logo.png` ve diğer simgeler onunla değiştirilebilir.
