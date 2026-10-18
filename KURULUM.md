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
- **Yanlışlıkla reddetme:** Reddedilen başvuru hemen silinmez; **Başvurular → Reddedilenler** sekmesinde 30 gün durur ve
  oradan onaylanabilir. 30 gün sonra kendiliğinden kalıcı olarak silinir. Kişi aynı e-postayla yeniden de başvurabilir.
- **Şifresini unutan kullanıcı:** Giriş ekranındaki **Şifremi unuttum** bağlantısıyla e-postasına gelen kodla yeni şifre belirler
  ve doğrudan giriş yapar. Yönetici de kişinin bilgi penceresinden **Şifreyi sıfırla** (kişi e-posta koduyla girip yenisini belirler)
  veya **Geçici şifre ver** (kişiye siz iletirsiniz; ilk girişte kendi şifresini belirlemek zorundadır) seçebilir. Her iki durumda
  kişiye bilgi e-postası gider.
- **Çevrimiçi kullanıcılar:** Yönetici rehberde son 5 dakikada uygulamayı kullananları yeşil işaretle ve listenin en üstünde görür
  (yalnızca yöneticiler görür).
- **Zorunlu alanlar ve yazım:** Mezun kaydında ve profil güncellemesinde tüm alanlar zorunludur (çalışma durumuna göre).
  Ad, soyad, üniversite, bölüm, meslek, kurum ve şehir e-tabloya Türkçe yazım kurallarına göre düzeltilerek kaydedilir
  (ör. "ahmet YILMAZ" → "Ahmet Yılmaz", "odtü" → "ODTÜ").
- **Telefon bildirimleri:** Duyuru yayınlanınca bildirimleri açmış kullanıcıların telefonuna bildirim gider (duyuru
  düzenleyicisinde "Telefonlara bildirim gönder" seçeneği). Android'de tarayıcıdan da çalışır; iPhone'da ise uygulamanın
  ana ekrana eklenmiş olması gerekir (iOS 16.4 ve üzeri). Kayıtlı cihazlar e-tablodaki **Bildirimler** sayfasındadır.
- **Kurulum rehberi:** Telefonundan tarayıcıyla giren veya kayıt olan kullanıcıya, telefonunun iPhone/Android olmasına göre
  yazılı adımlı, animasyonlu "ana ekrana ekleme" video rehberi açılır. Android'de tek dokunuşla yükleme düğmesi de çıkar.
- **Öğretmen eklemek:** Rehber veya Yönetim Paneli'nde **Kullanıcı ekle** → **Öğretmen**. Öğretmenler rehberde
  “Öğretmen” etiketiyle görünür ve mezunlarla aynı haklara sahiptir. Kaydederken **Yönetici yetkisi ver** işaretlenirse
  o öğretmen yönetim paneline de erişir.
- **Yönetici eklemek:** Öğretmen eklerken yukarıdaki seçenekle ya da e-tabloda **OFL Connect → Yönetici ekle**.
  Yönetici çıkarmak için **Yoneticiler** sayfasından satırı silin; o kişinin yönetici erişimi hemen sona erer.
- **Duyuru:** **Duyurular → Yeni duyuru**. Tür (bilgi/etkinlik/önemli), hedef kitle (herkes/mezunlar/öğretmenler) ve
  yayın aralığı seçilir. Duyuru, kullanıcı uygulamayı ilk açtığında bir kez pencere olarak gösterilir; sonra yalnızca
  **Duyurular** sayfasında durur. Bitiş tarihi geçince kullanıcıların ekranından kendiliğinden kalkar.
  **E-postayla da gönder** seçilirse duyuru hedef kitledeki herkese gizli alıcı (BCC) olarak e-postayla gider.
  Günlük e-posta sınırı dolarsa kalanlar ertesi gün otomatik gönderilir (saatlik görev **kuyrukIsle**; kurulum bunu kendisi tanımlar).
- **Giriş şifresi:** Kullanıcılar ilk girişi e-posta koduyla yapar; ardından isterlerse bir şifre belirler. Sonraki
  girişlerde e-posta adresi cihazda hatırlanır, yalnızca şifre sorulur. Şifreler e-tabloda düz metin olarak değil,
  kişiye özel tuzla karıştırılmış özet olarak **Kimlik** sayfasında tutulur. Şifresini unutan “e-posta koduyla gir”
  bağlantısını kullanır. **Bu cihazda oturumum açık kalsın** seçilirse oturum 90 gün, seçilmezse 12 saat sürer.
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
| Günlük e-posta alıcısı (giriş kodu + bildirim + duyuru) | 100 | 1.500 |
| E-tablo kapasitesi | 10 milyon hücre (≈ 500.000 mezun) | aynı |

Oturum 90 güne kadar açık kalabildiği ve kullanıcılar şifreyle girebildiği için giriş kodları sınırı az kullanır.
E-postalı duyurular bu sınırı en çok tüketen işlemdir: 1.000 kişilik bir duyuru ücretsiz hesapta yaklaşık 12 günde
tamamlanır (her gün 15 e-postalık pay giriş kodlarına ayrılır). Bu yüzden e-posta seçeneğini yalnızca önemli
duyurularda kullanın. Sınır dolarsa veri kaybı olmaz; bekleyen e-postalar ertesi gün kaldığı yerden gider.

## Uygulamada değişiklik yaptıktan sonra

Arayüz dosyalarında (`app.js`, `styles.css` vb.) bir değişiklik yaptığınızda `sw.js` dosyasındaki
`SURUM` değerini artırın (ör. `ofl-connect-v6`). Böylece telefona kurulu uygulamalar yeni sürümü alır.
