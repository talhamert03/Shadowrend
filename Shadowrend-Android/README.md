# Shadowrend — Android Studio projesi (Google Play / AAB)

Paket adı: `game.shadowrend` · targetSdk **36** (Play'in 31 Ağustos 2026 şartı) · minSdk 24 · sürüm 1.0.0 (versionCode 1)

## Açmak
1. Android Studio → **Open** → bu klasörü (`Shadowrend-Android`) seç.
2. İlk Gradle senkronu Gradle 8.11.1 + AGP 8.10.1'i indirir. "Upgrade" önerisi gelirse şimdilik **reddet**.
3. **İlk derleme internet ister:** three.js 0.169.0, Draco çözücü ve fontlar (Cinzel, Chakra Petch)
   npm'den bir kez `vendor-cache/` klasörüne iner. Sonraki derlemeler ağ istemez; oyun cihazda tamamen çevrimdışı açılır.

## Test
Telefonu bağla → ▶ Run. (Debug sürümünde `chrome://inspect` ile WebView konsolu görünür.)

## İmzalı AAB
**Build → Generate Signed App Bundle or APK → Android App Bundle → Next**
- İlk sefer: **Create new…** ile keystore oluştur (`.jks`). Bu dosyayı ve şifreleri KAYBETME, bu klasörün dışında yedekle.
- Play App Signing açık olduğunda bu anahtar "yükleme anahtarı" olur.
- **release** → Create. Çıktı: `app/release/app-release.aab`

## Her güncellemede
- `app/build.gradle` → `versionCode` **+1**, `versionName` = `game/release.js` içindeki `APP.version`.
- Oyun değiştiyse bu klasördeki `game/` klasörünü yenisiyle değiştir. `game/` içindeki dosyalara el sürmen gerekmez:
  derleme sırasında unpkg / Google Fonts adresleri otomatik olarak yerel kopyaya çevrilir.

## Neler hazır
- Yalnız dikey, tam ekran (sistem çubukları gizli, kaydırınca geçici görünür), çentik güvenli alanı, ekran açık kalır.
- Ses dokunuş beklemeden başlar; uygulama arka plana gidince sayfa duraklar.
- Geri tuşu uygulamayı kapatmaz, arka plana alır.
- WebView çökerse (GPU/bellek) uygulama kapanmaz, oyun yeniden yüklenir; kayıt (localStorage) korunur.
- Başlatıcı simgesi: `game/store/ikon-kurukafa-512.png`'den üretildi (uyarlanabilir simge dahil).

## Play Console'da ayrıca
- Uygulama simgesi 512×512: `store/ikon-kurukafa-512.png` · Öne çıkan görsel: `store/one-cikan-1024x500.jpg` (klasör kökünde; APK'ya girmez)
- Gizlilik politikası URL'si, Veri Güvenliği formu, içerik derecelendirmesi (bkz. kök `BUILD.md` §5).
- Uygulama içi satın alma ve AdMob bu pakette **yok** (oyun kendi simülasyon modunda çalışır). Eklenecekse ayrı iş.
