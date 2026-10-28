SHADOWREND — ANDROID STUDIO PROJESİ
===================================

AÇMA
  Android Studio → File → Open → bu klasörü (içinde settings.gradle olan) seç.
  İlk açılışta Gradle senkronu birkaç dakika sürer (internet gerekir). "Upgrade" önerirse KABUL ETME.
  JDK: Android Studio'nun kendi Java'sı (17 veya 21) uygundur.

İMZALI PAKET ÜRETME (Google Play için)
  Build → Generate Signed App Bundle or APK…
    1) "Android App Bundle" SEÇ  (APK DEĞİL — oyun içeriği ayrı bir kurulum paketinde,
       APK seçilirse oyun verisi pakete girmez ve oyun açılmaz)
    2) Key store path → "Create new…" (ilk kez) :
         - Dosyayı güvenli bir yere kaydet (ör. Belgeler/shadowrend-upload.jks)
         - Şifreleri ve alias'ı (ör. "upload") bir yere NOT ET
         - Validity: 25+ yıl, ad-soyad alanını doldur
       Sonraki sürümlerde aynı dosyayı ve şifreleri seç.
    3) Build variant: standardRelease → Create
  Çıktı: build/outputs/bundle/standardRelease/<klasör adı>-standard-release.aab
  (Android Studio'da Build penceresindeki "locate" bağlantısı dosyayı açar)

ÖNEMLİ
  - .jks anahtar dosyasını ve şifrelerini KAYBETME, kimseyle paylaşma. Play Console'da
    "Play Uygulama İmzalama" açık kalsın; bu anahtar yalnız "yükleme anahtarı" olur
    (kaybolursa Play Console'dan sıfırlatılabilir).
  - Her yeni oyun sürümünde bu klasör YENİDEN üretilir (oyun içeriği ve sürüm numarası değişir).
  - Sürüm numarası/kodu gradle.properties dosyasının sonundadır (export_version_*).
