# ÇEVRİMDIŞI PAKETLEME — Google Play öncesi son teknik iş

## Neden gerekli

**Oyuncunun uçak modu açması gerekmiyor.** "Uçak modu" bizim test yöntemimiz:
telefonu uçak moduna alıp oyunu açıyoruz. Şu an açılmıyor — çünkü three.js,
Draco çözücü ve iki font internetten indiriliyor. İki sonucu var:

1. **Play politikası.** İnceleme ekibi uygulamaları zayıf/kesintili bağlantıda
   test eder. İnternetsiz açılmayan bir oyun "minimum functionality"
   maddesine takılabilir.
2. **İlk açılış süresi.** İnternet varken bile açılış CDN'in o anki hızına
   bağlı. Metroda 8 saniye bekleyen oyuncu oyunu siler.

Hedef: uygulama paketi kendi kendine yeter, hiçbir ağ isteği yapmaz.

---

## Şu an dışarıdan çekilen dosyalar

| Ne | Nereden | Yaklaşık boyut |
|---|---|---|
| three.js çekirdek | `unpkg.com/three@0.169.0/build/three.module.js` | ~1.2 MB |
| GLTFLoader, FBXLoader, DRACOLoader, SkeletonUtils, BufferGeometryUtils | `unpkg.com/three@0.169.0/examples/jsm/…` | ~400 KB |
| Draco çözücü (wasm + js) | `gstatic.com/draco/versioned/decoders/1.5.7/` | ~350 KB |
| Cinzel (600, 800) | Google Fonts | ~60 KB |
| Chakra Petch (400, 600, 700) | Google Fonts | ~90 KB |

---

## 1. ADIM — three.js

En kolay yol, sürüm birebir aynı kalsın diye:

```bash
cd game
npm pack three@0.169.0        # three-0.169.0.tgz iner
tar -xzf three-0.169.0.tgz
mkdir -p assets/vendor/three assets/vendor/three/addons
cp package/build/three.module.js assets/vendor/three/
cp -r package/examples/jsm/* assets/vendor/three/addons/
rm -rf package three-0.169.0.tgz
```

`examples/jsm` klasörünün tamamını kopyalamak en güvenlisi: yükleyiciler
birbirini `../` yollarıyla import eder, tek tek seçmek kırılır. Yaklaşık
6 MB'lık kaynak ama **yalnızca gerçekten import edilen dosyalar** çalışma
anında indirilir (ES modül), yani APK boyutuna girer, RAM'e girmez.
Boyut sorun olursa Rollup/esbuild ile tek bundle'a çevrilir — sonraki iş.

Sonra `index.html`'deki importmap'i değiştir:

```html
<script type="importmap">
{
  "imports": {
    "three": "./assets/vendor/three/three.module.js",
    "three/addons/": "./assets/vendor/three/addons/"
  }
}
</script>
```

`render3d.js` içindeki import satırları **hiç değişmez** — importmap'in
bütün amacı bu.

### Draco çözücü

`render3d.js` → `_getDraco()` içinde şu satır var:

```js
this._draco.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.7/');
```

Klasörü indir:

```bash
mkdir -p assets/vendor/draco
cd assets/vendor/draco
curl -O https://www.gstatic.com/draco/versioned/decoders/1.5.7/draco_decoder.js
curl -O https://www.gstatic.com/draco/versioned/decoders/1.5.7/draco_decoder.wasm
curl -O https://www.gstatic.com/draco/versioned/decoders/1.5.7/draco_wasm_wrapper.js
```

Satırı şuna çevir (sonundaki eğik çizgi ZORUNLU):

```js
this._draco.setDecoderPath('./assets/vendor/draco/');
```

> `.wasm` dosyasının `application/wasm` MIME tipiyle sunulduğundan emin ol.
> Capacitor/WebView'de sorun olmuyor, kendi dev sunucunda olabilir.

---

## 2. ADIM — Fontlar

Tarayıcıda şu adresi aç ve içindeki `.woff2` URL'lerini indir
(User-Agent'a göre değişir, en modern format woff2'dir):

```
https://fonts.googleapis.com/css2?family=Cinzel:wght@600;800&family=Chakra+Petch:wght@400;600;700&display=swap
```

Dosyaları `game/assets/fonts/` altına koy, sonra `index.html`'den bu iki
satırı **sil**:

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cinzel…" rel="stylesheet">
```

ve `style.css`'in EN BAŞINA ekle:

```css
@font-face {
  font-family: 'Cinzel'; font-style: normal; font-weight: 600;
  font-display: block;                     /* block: oyun yazısı asla yedek fontla çakmasın */
  src: url('assets/fonts/cinzel-600.woff2') format('woff2');
}
@font-face {
  font-family: 'Cinzel'; font-style: normal; font-weight: 800;
  font-display: block;
  src: url('assets/fonts/cinzel-800.woff2') format('woff2');
}
@font-face {
  font-family: 'Chakra Petch'; font-style: normal; font-weight: 400;
  font-display: block;
  src: url('assets/fonts/chakra-400.woff2') format('woff2');
}
@font-face {
  font-family: 'Chakra Petch'; font-style: normal; font-weight: 600;
  font-display: block;
  src: url('assets/fonts/chakra-600.woff2') format('woff2');
}
@font-face {
  font-family: 'Chakra Petch'; font-style: normal; font-weight: 700;
  font-display: block;
  src: url('assets/fonts/chakra-700.woff2') format('woff2');
}
```

`font-display: block` seçilmesi kasıtlı: `swap` olursa hasar sayıları ilk
karelerde sistem fontuyla çizilir, sonra zıplar — "web sayfası" hissinin
klasik belirtisi.

> Ayrıca `main.js` → `renderTexts()` içinde font adı string olarak yazılı
> (`'Chakra Petch'`). Font yüklenmeden ilk hasar yazısı çizilirse canvas
> yedek fonta düşer. `perf.js` → `Warmup`'a bir görev eklemek en temizi:
> `Warmup.add('fontlar', () => document.fonts.ready)`.

---

## 3. ADIM — Doğrulama

1. Ağı kapat (uçak modu / DevTools → Network → Offline).
2. Oyunu **sert yenile** (cache boş).
3. Network sekmesinde `unpkg.com`, `gstatic.com`, `fonts.googleapis.com`
   satırı GÖRÜNMEMELİ. Bir tane bile varsa çevrimdışı değiliz.
4. Açılıştan savaşa kadar oyna; sol üst köşeye üç kez dokunup HUD'da
   çizim çağrısı ve yığın belleğini kontrol et.

---

## Bu iş bittikten sonra sıradakiler

- **Model bütçesi:** Meshy çıktıları 20–60k üçgen; düşman için 2–4k yeter.
  Blender decimate + 2 LOD. (Doku bütçesi kodla çözüldü — `perf.js` →
  `budgetTextures()` yükleme anında küçültüyor; ama KTX2/Basis kalıcı
  çözüm, çünkü GPU belleğinde de sıkışık kalır.)
- **VAT / instancing:** iskeletli düşman animasyonunu dokuya bake edip tüm
  zombileri tek draw call'a indirmek — kalan en büyük teknik kazanç.
- **Impostor atlas:** uzak düşmanlar için 8 açılı billboard; kalabalık
  hissi neredeyse bedava.

> **Not (2026-08-19):** yoldaş/pet bölümü buradan silindi — sistem oyundan
> komple kaldırıldı (bkz. CLAUDE.md). `assets/pet/` artık yok, o yüzden
> paket boyutu ve ilk açılış indirmesi 3,6 MB Draco + 1024² doku kadar
> hafifledi; Draco çözücü bağımlılığı ise düşman modelleri için duruyor.

## Bu belgedeki işler NEDEN kodla yapılamıyor

1. ve 2. adım (three.js + fontların yerelleştirilmesi) dosya indirmek
gerektiriyor: `npm pack`, `curl`, Google Fonts'tan `.woff2` çekmek. Bunlar
kod düzenlemesi değil, paketleme adımıdır ve bir kabuk/ağ erişimi ister.
Kod tarafında yapılacak HER ŞEY hazır:

- `index.html` importmap tek satırda yerele çevrilebilir (yollar yukarıda),
- `render3d._getDraco()` içindeki tek satır `./assets/vendor/draco/` olur,
- `style.css` @font-face blokları yukarıda hazır,
- font ısıtması **zaten kodda** (`main.js` → `Warmup.add('fontlar', …)`).

Yani dosyalar `assets/vendor/` altına kopyalandığı an dört küçük düzenleme
ile çevrimdışı olunur. Ölçüt 3. adımdaki ağ denetimidir.
