# OFL Connect

TOBB Osmaniye Fen Lisesi mezun ağı. Telefona uygulama olarak kurulabilen bir web uygulaması (PWA).

- **Demo modu:** `config.js` içinde `API_URL` boşken çalışır. ~1.200 hayali mezunla her şey denenebilir; değişiklikler yalnızca o tarayıcıda saklanır.
- **Gerçek sistem:** Google E-Tablo + Apps Script ile çalışır. Kurulum için → [KURULUM.md](KURULUM.md)

## Demoyu denemek

Klasörde bir terminal açın, `python3 -m http.server 8765` komutunu çalıştırın ve tarayıcıda `http://localhost:8765` adresini açın.
Giriş ekranındaki **Yönetici olarak** / **Mezun olarak** düğmeleriyle girin. E-postayla girişte demo kodu `123456`'dır.

## Yetkiler

| | Yönetici | Mezun |
|---|---|---|
| Rehber | Tüm bilgiler | Ad-soyad, yıl + mezunun **görünür** yaptığı bilgiler |
| Bilgi düzenleme | Herkesin | Yalnızca kendisinin (Profilim) |
| Başvuru inceleme ve onay | ✓ | — |
| Kayıt silme, Excel'e aktarma | ✓ | — |
| KVKK silme talebi | İşler | Gönderir |
| Yönetici ekleme | Google E-Tablo'dan (OFL Connect → Yönetici ekle) | — |

Gizlilik kuralları sunucuda uygulanır: Bir mezunun gizlediği bilgi diğer mezunların tarayıcısına hiç gönderilmez.

## Dosyalar

| Dosya | Görevi |
|---|---|
| `index.html`, `styles.css`, `app.js` | Arayüz |
| `config.js` | Sunucu adresi ve okul ayarları |
| `ortak.js` | Ortak kurallar (alanlar, telefon biçimi, Türkçe arama) |
| `api.js` | Gerçek sunucuya (Apps Script) bağlantı |
| `data.js` | Demo sunucusu (hayali veriler) |
| `manifest.json`, `sw.js`, `icons/` | Telefona kurulum ve çevrimdışı açılış |
| `sunucu/Code.gs` | Google Apps Script sunucu kodu |

Logo okulun web sitesindeki duyuru görselinden alınmıştır. Daha yüksek çözünürlüklü bir logo dosyası olursa
`icons/ofl-logo.png` ve diğer simgeler onunla değiştirilebilir.
