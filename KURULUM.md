# OFL Connect — Kurulum Rehberi

Bu rehber sistemi gerçek verilerle yayına almak içindir. Toplam süre yaklaşık 30–45 dakikadır.
Kodlama bilgisi gerekmez; adımları sırayla izlemeniz yeterli.

**Sistemin yapısı**

| Parça | Nerede | Ne yapar |
|---|---|---|
| Veritabanı | Google E-Tablo (gizli, yalnızca okul hesabında) | Mezun bilgileri, yöneticiler, oturumlar |
| Sunucu | Google Apps Script (e-tabloya bağlı) | Giriş, yetki ve gizlilik kuralları, e-posta gönderimi |
| Uygulama | GitHub Pages (herkese açık adres) | Mezunların ve yöneticinin kullandığı ekranlar |

---

## 0. Okul adına bir Google hesabı açın

Sistemi kişisel hesabınızla değil, **okul adına açılmış ayrı bir hesapla** kurun
(ör. `oflconnect.mezun@gmail.com`; okulun Google Workspace hesabı varsa o daha iyidir).

- Giriş kodları ve bildirimler bu hesaptan gönderilir.
- Görev değişikliğinde hesap kolayca devredilir.
- Hesapta **2 adımlı doğrulamayı** mutlaka açın. Tüm verilerin güvenliği bu hesaba bağlıdır.

## 1. E-tabloyu oluşturun

1. Okul hesabıyla <https://sheets.new> adresini açın.
2. E-tablonun adını **OFL Connect Veritabanı** yapın.
3. E-tabloyu **kimseyle paylaşmayın.** Uygulama veriye e-tablo üzerinden değil, sunucu kodu üzerinden erişir.

## 2. Sunucu kodunu ekleyin

1. E-tabloda **Uzantılar → Apps Script**'i açın.
2. Açılan `Kod.gs` dosyasındaki her şeyi silin.
3. Bu klasördeki `sunucu/Code.gs` dosyasının **tamamını** kopyalayıp yapıştırın.
4. Üstteki **Kaydet** (disket simgesi) düğmesine basın.

## 3. Kurulumu çalıştırın

1. E-tablo sekmesine dönüp sayfayı **yenileyin**. Birkaç saniye sonra üst menüde **OFL Connect** menüsü belirir.
2. **OFL Connect → Kurulumu yap / onar**'ı seçin.
3. Google izin isteyecek: **Devam → hesabınızı seçin**.
   - "Google bu uygulamayı doğrulamadı" uyarısı çıkarsa **Gelişmiş → (güvenli olmayan) projesine git** deyin.
     Bu uyarı, kodu Google'a ayrıca inceletmediğimiz için çıkar; kod sizin hesabınızda, sizin kontrolünüzde çalışır.
4. Kurulum tamamlanınca 4 sayfa oluşur: **Mezunlar, Yoneticiler, Oturumlar, IslemKaydi**.
   Kurulumu yapan hesap otomatik olarak **ilk yönetici** olur.

## 4. Sunucuyu yayınlayın

1. Apps Script'te sağ üstten **Dağıt → Yeni dağıtım**'ı seçin.
2. Tür olarak dişli simgesinden **Web uygulaması**'nı seçin.
3. Ayarlar:
   - **Açıklama:** OFL Connect
   - **Şu kullanıcı olarak yürüt:** Ben (okul hesabı)
   - **Erişimi olan kullanıcılar:** Herkes
4. **Dağıt**'a basın ve verilen **Web uygulaması URL'sini** kopyalayın (`https://script.google.com/macros/s/…/exec`).
5. Bu adresi tarayıcıda açın. `{"ok":true,"uygulama":"OFL Connect API"}` yazısını görüyorsanız sunucu çalışıyordur.

> "Herkes" erişimi verilerin herkese açık olduğu anlamına gelmez. Sunucu yalnızca giriş yapmış kişilere,
> yalnızca görmeye yetkili oldukları bilgiyi verir.

## 5. Uygulamayı sunucuya bağlayın

`config.js` dosyasını açın ve kopyaladığınız adresi `API_URL` satırına yapıştırın:

```js
API_URL: 'https://script.google.com/macros/s/XXXXXXXX/exec',
```

Bu adres girildiğinde demo modu kapanır, uygulama gerçek verilerle çalışır.

## 6. Uygulamayı GitHub Pages'te yayınlayın (ücretsiz)

1. <https://github.com> adresinde okul adına bir hesap açın (ör. `oflconnect`).
2. **New repository** ile `ofl-connect` adında **Public** bir depo oluşturun.
3. **Add file → Upload files** ile bu klasördeki dosyaları yükleyin. `icons` klasörü de dahil olmalı.
   `sunucu/`, `KURULUM.md` ve `BENIOKU.md` dosyalarını yüklemeniz gerekmez. Yüklerseniz de sakıncası yoktur, içlerinde gizli bilgi bulunmaz.
4. Deponun **Settings → Pages** bölümünde *Branch* olarak `main` ve `/ (root)` seçip **Save**'e basın.
5. 1–2 dakika sonra uygulama şu adreste yayında olur: `https://oflconnect.github.io/ofl-connect/`

> **Asla yüklemeyin:** Mezun listesi içeren Excel/CSV dosyaları. Depo herkese açıktır.
> Klasördeki `.gitignore` dosyası bu tür dosyaların yanlışlıkla eklenmesini önler.

## 7. Son ayar: uygulama adresini sunucuya tanıtın

1. Apps Script'te `Code.gs` dosyasının başındaki `UYGULAMA_ADRESI` satırına GitHub Pages adresini yazın
   ve dosyayı kaydedin. Onay e-postalarındaki bağlantı bu adrese gider.
2. **Dağıt → Dağıtımları yönet → kalem simgesi → Sürüm: Yeni sürüm → Dağıt**.
   Adres değişmez. Kodda yapılan her değişiklik bu adımla yayına girer.

## 8. Deneyin

1. Uygulama adresini açın ve okul hesabının e-postasıyla giriş kodu isteyin.
2. Gelen 6 haneli kodla giriş yapın. **Yönetim Paneli** görünmelidir.
3. Telefonunuzdan bir test başvurusu yapın, ardından yönetici olarak **Başvurular** sayfasından onaylayın.

---

## Günlük kullanım

- **Yeni başvuru:** Yöneticilere e-posta gelir. **Başvurular** sayfasında satıra tıklayınca başvurunun tüm bilgileri açılır;
  oradan **Onayla**, **Düzenle** veya **Reddet** seçilir. Onaylanan mezuna otomatik e-posta gider.
- **Yönetici eklemek:** E-tabloda **OFL Connect → Yönetici ekle**. Yönetici çıkarmak için **Yoneticiler** sayfasından
  satırı silin; o kişinin yönetici erişimi hemen sona erer.
- **Herkesi sistemden çıkarmak** (ör. şüpheli durum): **OFL Connect → Tüm oturumları kapat**.
- **Yedek:** E-tablonun **Dosya → Sürüm geçmişi**'nde her değişiklik zaten saklanır. Ayrıca dönem sonlarında
  **Dosya → Kopya oluştur** ile bir yedek alınabilir.
- **İşlem kaydı:** Yöneticinin yaptığı onay, silme, düzenleme ve dışa aktarma işlemleri **IslemKaydi** sayfasına yazılır.

## Mevcut bir mezun listesi varsa

Listeyi doğrudan e-tabloya aktarmak yerine mezunlara **kayıt bağlantısını göndermenizi öneririz**
(WhatsApp grupları, okul sitesi, sosyal medya). KVKK açısından her mezunun **kendi açık rızasını** vermesi gerekir;
toplu aktarılan kişilerin rızası alınmamış olur.

## Sınırlar

| Konu | Ücretsiz Gmail hesabı | Google Workspace hesabı |
|---|---|---|
| Günlük e-posta (giriş kodu + bildirim) | 100 | 1.500 |
| E-tablo kapasitesi | 10 milyon hücre (≈ 500.000 mezun) | aynı |

Giriş bir kez yapıldığında 60 gün hatırlandığı için günlük e-posta sınırı olağan kullanımda yeterlidir.
Sınır dolarsa uygulama kullanıcıya "yarın tekrar deneyin" der; veri kaybı olmaz.

## Uygulamada değişiklik yaptıktan sonra

Arayüz dosyalarında (`app.js`, `styles.css` vb.) bir değişiklik yaptığınızda `sw.js` dosyasındaki
`SURUM` değerini artırın (ör. `ofl-connect-v3`). Böylece telefona kurulu uygulamalar yeni sürümü alır.
