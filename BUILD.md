# Shadowrend — Paketleme ve Yayın (v44)

## 1. Tek seferlik kurulum
```bash
npm install
npx cap add android
npx cap add ios          # yalnız macOS
```

## 2. Her sürümde
```bash
npm run build            # dist/ üretir, sonunda "✓ dış kaynak yok" yazmalı
npm run android          # build + sync + Android Studio
```
`game/release.js` → `APP.version` / `APP.build` ve `package.json` sürümü **birlikte** artırılır.

## 3. Yerel ayarlar (bir kez, `npx cap add` sonrası)

**Yalnız dikey — Android** `android/app/src/main/AndroidManifest.xml`, `<activity>`:
```xml
android:screenOrientation="portrait"
android:configChanges="orientation|keyboardHidden|keyboard|screenSize|locale|smallestScreenSize|screenLayout|uiMode"
```
**Yalnız dikey — iOS** `ios/App/App/Info.plist` → `UISupportedInterfaceOrientations` içinde yalnız `UIInterfaceOrientationPortrait`.

**Ses jest beklemesin** — Capacitor WebView'i medya jestini zaten kapatır. Gerçek cihazda
ilk açılışta menü müziği dokunmadan başlamıyorsa `MainActivity.java`:
```java
@Override public void onStart() {
  super.onStart();
  getBridge().getWebView().getSettings().setMediaPlaybackRequiresUserGesture(false);
}
```

**Bildirim ikonu** `android/app/src/main/res/drawable/ic_stat_sr.png` (beyaz, şeffaf zemin, 24 dp).

**Tam ekran / çentik** `styles.xml` → `android:windowLayoutInDisplayCutoutMode = shortEdges`.

## 4. Zorunlu güncelleme
`version.json` kalıcı bir adreste barındırılır ve `APP.versionUrl` o adrese çevrilir:
```json
{ "latest": "1.1.0", "min": "1.0.0", "store": { "android": "https://play.google.com/store/apps/details?id=game.shadowrend" } }
```
`min`in altındaki sürüm açılışta **engelleyici** güncelleme ekranı görür; `latest`in altı bir
kez nazik uyarı. Aynı istek sunucu saatini de getirir (saat hilesi koruması, `clock.js`).

## 5. Play Console kontrol listesi
- [ ] Gizlilik politikası herkese açık URL'de (`game/legal.js` metni — önce hukukçu okusun, `[…]` alanları doldurulsun)
- [ ] Veri Güvenliği formu: "veri toplanmıyor, cihazda saklanıyor" (reklam/analitik eklenince güncellenir)
- [ ] İçerik derecelendirme: hedef kitle **13+**, rastgele ödül (sandık) VAR, olasılıklar oyun içinde beyan ediliyor
- [ ] `UNLOCK_ALL_CHARS` yalnız `?dev=1` ile açılıyor (config.js) — paket URL'sinde parametre yok
- [ ] Gerçek cihaz testi: düşük (2-3 GB RAM) · orta · üst Android + bir iPhone, `?perf=1` ile 10 dk

## 6. Sunucu (Firebase)
```bash
npm i -g firebase-tools && firebase login
cd backend && firebase use --add        # proje seç
cd functions && npm install && cd ..
firebase functions:secrets:set PLAY_SERVICE_ACCOUNT   # Play Console hizmet hesabı JSON
firebase functions:secrets:set APPLE_SHARED_SECRET
firebase deploy --only functions,firestore
```
Sonra `game/backend.js` → `CFG.apiKey`, `CFG.fnBase`, gerçek AdMob kimlikleri. Firebase'de **Anonim giriş** açılır.
Eklentiler: `npm i cordova-plugin-purchase @capacitor-community/admob && npx cap sync`.
Play Console ürünleri: `gems_80 · gems_275 · gems_720 · gems_1800` (tüketilebilir).

## 7. Eski not
Gerçek para satışı (Play Billing makbuz doğrulaması), sunucu cüzdanı, bulut kaydı (Play Games),
AdMob ödüllü reklam, çökme raporu. `vault.js` imzası sıradan kayıt düzenlemeyi durdurur;
kararlı bir saldırganı yalnız sunucu durdurur.
