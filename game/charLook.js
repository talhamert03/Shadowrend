/* ═══════════════════════════════════════════════════════════
   charLook.js — KARAKTER MALZEME DİLİ (premium mobil paso, 2026-09-02)

   NEDEN BU DOSYA VAR
   Kullanıcının teşhisi: "karakter modelleri internet oyunu gibi,
   minimalist duruyor; daha büyük ve daha telefon oyunu gibi olmalı,
   dokusu da." Ölçüldü, iki ayrı sebep vardı ve ikisi de tek yerde
   yaşamıyordu:

   ① ÖLÇEK. Kamera merkezde 1 dünya birimi ≈ 1 ekran pikseli tutuyor
      (render3d.resize), yani 76 birimlik kahraman 720 px'lik telefon
      ekranında ~%10,5 kaplıyordu. Mobil aksiyon oyunlarının bandı
      %12-14. Boy tablolarına ELLE dokunmak (otuz küsur sayı) hiyerarşiyi
      (kahraman < hortlak < büyücü < muhafız < kral < boss) sessizce
      bozar; çarpan TEK YERDE durur ve tabloları toptan çevirir.

   ② MALZEME. Tripo/Meshy ihraçları roughness 0.9 · metalness 0 gelir ve
      sahnede env map YOK (yasak: mobil bellek). Tamamen mat bir yüzey +
      env map yokluğu = formu tanımlayan hiç parlama yok, figür koyu
      zeminde YASSI bir leke okunur. Eski kod bunu 0.62/0.52 kelepçesiyle
      kısmen kapatıyordu; buradaki paso üç işi birlikte yapar:
        • pürüz kelepçesi 0.48 — omuz/zırh plakası ışığı tutar,
        • KENAR IŞIĞI (fresnel) — tek materyalde, TEK doku okuması bile
          olmadan, mobil GPU'da bedavaya yakın: silueti zeminden ayıran
          şey budur. Yeni ışık EKLENMEZ (perf yasağı, 6 ışık üst sınır);
          post-processing/bloom da yok — bu, shader içinde tek satır.
        • anizotropi 8 — kamera 44° eğik bakıyor, 4'te doku bulanıklaşıyor
          (v17'nin sandık dersi birebir aynı).

   ③ DOKUNUN KENDİSİ. `punchAlbedo` pişirme anında (heroModel, IndexedDB'ye
      yazılmadan önce) çalışır: kroma + orta ton kontrastı + derin gölge
      koyulaştırması + DEĞER netleştirmesi. Sahada kare başına maliyeti
      SIFIRDIR — bir kez pişer, önbelleğe girer. arenaSurf'ün "kroma
      makroda yaşar, detay yalnız değer taşır" dersinin karakter
      karşılığı: kroma albedoda, form netleştirmede.

   YASAKLARA UYUM: post-processing yok · gölge haritası yok · yeni ışık
   yok · yeni tam ekran katman yok · sıcak döngüde tahsis yok (shader
   derlemesi bir kez, uniform'lar sabit).
   ═══════════════════════════════════════════════════════════ */

import * as THREE from 'three';

/* KADRO ÖLÇEK ÇARPANI — "ne aşırı büyük ne aşırı küçük".
   ÖLÇÜLDÜ, HESAPLANMADI (_charlooktest): kamera 44° eğik olduğu için dikey
   dünya ekseni ekrana cos(44°) = 0,72 ile düşer — yani 76 birimlik kahraman
   720 px'lik ekranda 53 px, %7,4. İlk tahmin (%10,5) boyu ham alıyordu ve
   %40 yanılıyordu; bir oran, izdüşümü hesaba katmadan yazılamaz.
   1.20: kahraman 76 → 91 birim, ekranda 53 → 66 px (%9,1). Çarpışma
   yarıçapları (config.ENEMY_TYPES.radius) DOKUNULMAZ — oynanış aynı. */
export const CHAR_SCALE = 1.20;

/* BOSS DA AYNI ÇARPANI ALIR. İlk denemede 1.07 yazıldı ("boss ekranı
   yutmasın" diye) ama o durumda İSKELET KRAL (126 → 151) boss'a (160)
   neredeyse yetişiyor ve boy hiyerarşisi — oyuncunun can barını okumadan
   tehdit ayırt etmesinin tek yolu — çöküyor. Tek çarpan hiyerarşiyi
   birebir korur: boss 150 → 180 birim, ekranda 108 → 130 px. */
export const BOSS_SCALE = 1.20;

export const LOOK = {
  rim: 0.42,          // kenar ışığı şiddeti (0 = kapalı) — tezgahta ölçüldü
  rimPow: 3.0,        // fresnel keskinliği — düşükse figür tümden parlar
  rimHex: 0xffdcb4,   // ay ışığı sıcak kenarı; gece paletiyle aynı aile
  roughMax: 0.48,
  aniso: 8,
};

/* ── ① BOY TABLOLARINI TOPTAN ÇEVİRME ───────────────────────
   `height` ve `shadowR` alanlarını yerinde çarpar (iç içe dizi/nesne
   ağacında). shadowR de çarpılır: büyüyen figürün altındaki yer gölgesi
   aynı kalırsa figür havada durur gibi okunur (gölge = tek temas ipucu,
   gölge haritası yasak). */
export function scaleCharTable(node, k) {
  if (!node || typeof node !== 'object') return node;
  if (Array.isArray(node)) { for (const v of node) scaleCharTable(v, k); return node; }
  if (typeof node.height === 'number') node.height = node.height * k;
  if (typeof node.shadowR === 'number') node.shadowR = node.shadowR * k;
  for (const key of Object.keys(node)) {
    const v = node[key];
    if (v && typeof v === 'object' && key !== 'decimate' && key !== 'prop') scaleCharTable(v, k);
  }
  return node;
}

/* ── ② MALZEME PASOSU ──────────────────────────────────────
   Aynı materyale iki kez uygulanmaz (`__charLook`): düşman havuzları
   materyali klonluyor, kahraman ise skeletonClone'la kopyalanıyor —
   ikinci uygulama shader'ı tekrar sarar ve kenar ışığı iki katına çıkar.

   customProgramCacheKey ZORUNLU: three, onBeforeCompile'ın yaptığı
   değişikliği program anahtarına KATMAZ; anahtar verilmezse aynı
   parametreli başka bir materyalin derlenmiş programı yeniden
   kullanılır ve kenar ışığı bazı modellerde hiç görünmez. */
export function applyCharLook(mat, opts = {}) {
  if (!mat || mat.__charLook) return mat;
  mat.__charLook = true;

  mat.side = THREE.FrontSide;
  if (mat.roughness != null) mat.roughness = Math.min(mat.roughness, opts.roughMax != null ? opts.roughMax : LOOK.roughMax);
  /* metalness YÜKSELTİLMEZ (env map yok → metal yüzey kararır); yalnız
     Tripo'nun 0'ı bir tık kaldırılır, plaka kenarı ışığı tutsun. */
  if (mat.metalness != null) mat.metalness = Math.max(0.08, Math.min(0.22, mat.metalness));

  for (const slot of ['map', 'emissiveMap', 'normalMap']) {
    const t = mat[slot];
    if (!t) continue;
    t.anisotropy = LOOK.aniso;
    t.generateMipmaps = true;
    t.minFilter = THREE.LinearMipmapLinearFilter;
    t.magFilter = THREE.LinearFilter;
    t.needsUpdate = true;
  }

  const s = opts.rim != null ? opts.rim : LOOK.rim;
  if (s > 0) {
    const p = opts.rimPow != null ? opts.rimPow : LOOK.rimPow;
    const c = new THREE.Color(opts.rimHex != null ? opts.rimHex : LOOK.rimHex);
    const prev = mat.onBeforeCompile;
    mat.onBeforeCompile = (sh, renderer) => {
      if (prev) prev(sh, renderer);
      sh.uniforms.uRimS = { value: s };
      sh.uniforms.uRimP = { value: p };
      sh.uniforms.uRimC = { value: new THREE.Vector3(c.r, c.g, c.b) };
      let f = sh.fragmentShader;
      /* three sürümüne göre çıkış parçasının adı değişti (r152+ opaque) —
         iki yazımı da destekle, yoksa paso sessizce hiç uygulanmaz. */
      const anchor = f.indexOf('#include <opaque_fragment>') >= 0
        ? '#include <opaque_fragment>' : '#include <output_fragment>';
      if (f.indexOf(anchor) < 0) return;
      mat.__rimApplied = true;   // ÖLÇÜM İÇİN: pasonun gerçekten derlendiğinin kanıtı
      f = 'uniform float uRimS;\nuniform float uRimP;\nuniform vec3 uRimC;\n' + f;
      /* Kenar ışığı TON EŞLEMESİNDEN ÖNCE eklenir (opaque_fragment ile
         tonemapping_fragment arasında): doğrusal uzayda toplanır, yoksa
         parlak yüzeylerde beyaza kırpar. `khUp` üst kenarı öne çıkarır —
         ışık yönü sahnede tek (ay üstten), rim'in her yönde eşit
         parlaması "neon kontur" okunur. */
      f = f.replace(anchor, anchor + '\n' +
        '  {\n' +
        '    vec3 khN = normalize( normal );\n' +
        '    float khF = 1.0 - clamp( dot( khN, normalize( vViewPosition ) ), 0.0, 1.0 );\n' +
        '    khF = pow( khF, uRimP );\n' +
        '    float khUp = clamp( khN.y * 0.55 + 0.60, 0.0, 1.0 );\n' +
        '    gl_FragColor.rgb += uRimC * ( khF * uRimS * khUp );\n' +
        '  }\n');
      sh.fragmentShader = f;
    };
    mat.customProgramCacheKey = () => 'khRim' + s.toFixed(2) + '_' + p.toFixed(1);
  }
  mat.needsUpdate = true;
  return mat;
}

/** Bir modelin bütün materyallerine pasoyu uygular. */
export function applyCharLookTo(root, opts) {
  root.traverse((o) => {
    if (!o.isMesh && !o.isSkinnedMesh) return;
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    for (const mt of mats) if (mt) applyCharLook(mt, opts);
  });
  return root;
}

/* ── ③ ALBEDO PİŞİRME PASOSU ────────────────────────────────
   Pişirme anında ÇALIŞIR, sahada değil (heroModel → IndexedDB).
   Dört iş, sırası önemli:
     1) DEĞER netleştirme (unsharp, yalnız parlaklık): kanal oranlarına
        dokunulmaz, yoksa kenarlarda renk saçağı çıkar.
     2) kroma: mobil oyun dili doygundur; ×1,16 ölçüldü — ×1,3'te ten
        rengi turuncuya kayıyor.
     3) orta ton S eğrisi: uçları kırpmadan hacim.
     4) derin gölge koyulaştırma: Tripo dokularının kuytu yerleri (kumaş
        katı, zırh derzi) ortalamaya yakın geliyor; hafif bir AO taklidi
        formu okunur yapar. Yeni doku ya da ışık gerekmez.
   Doygunluk tavanı 0,45 ile kelepçelenir: karakterin kroması zeminden
   (bant <0,42) yüksek olmalı ama plastik olmamalı. */
export function punchAlbedo(canvas, opts = {}) {
  const chroma = opts.chroma != null ? opts.chroma : 1.12;
  const contrast = opts.contrast != null ? opts.contrast : 1.12;
  const deepen = opts.deepen != null ? opts.deepen : 0.10;
  const sharp = opts.sharp != null ? opts.sharp : 0.32;
  const w = canvas.width, h = canvas.height;
  if (!w || !h) return canvas;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  const im = ctx.getImageData(0, 0, w, h);
  const px = im.data, n = w * h;

  const L = new Float32Array(n);
  for (let i = 0; i < n; i++) L[i] = 0.299 * px[i * 4] + 0.587 * px[i * 4 + 1] + 0.114 * px[i * 4 + 2];
  /* iki geçişli kutu bulanıklık (ayrılabilir) — tek geçiş yatay,
     ikinci dikey; yarıçap 2 texel, yani "ince band" (bkz. HD dersi). */
  const A = new Float32Array(n), B = new Float32Array(n), r = 2;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let s = 0, c = 0;
    for (let d = -r; d <= r; d++) { const u = x + d; if (u < 0 || u >= w) continue; s += L[y * w + u]; c++; }
    A[y * w + x] = s / c;
  }
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let s = 0, c = 0;
    for (let d = -r; d <= r; d++) { const v = y + d; if (v < 0 || v >= h) continue; s += A[v * w + x]; c++; }
    B[y * w + x] = s / c;
  }

  for (let i = 0; i < n; i++) {
    const o = i * 4;
    let R = px[o], G = px[o + 1], Bl = px[o + 2];
    const l0 = L[i] > 1 ? L[i] : 1;
    const f = (l0 + (l0 - B[i]) * sharp) / l0;
    R *= f; G *= f; Bl *= f;
    let lm = 0.299 * R + 0.587 * G + 0.114 * Bl;
    R = lm + (R - lm) * chroma; G = lm + (G - lm) * chroma; Bl = lm + (Bl - lm) * chroma;
    lm = 0.299 * R + 0.587 * G + 0.114 * Bl;
    const x = Math.max(0, Math.min(1, lm / 255));
    const cs = 1 + (x - 0.5) * (contrast - 1) * (1 - Math.abs(2 * x - 1)) * 1.6 / Math.max(0.02, x);
    const dp = 1 - deepen * (1 - x) * (1 - x);
    const k = cs * dp;
    A[i] = R * k; B[i] = G * k; L[i] = Bl * k;   // geri dönüştürülen tamponlar
  }
  /* PARLAKLIK KORUNUR — ÖLÇÜLDÜ, VARSAYILMADI (_charlooktest):
     ilk sürüm SAPANCI dokusunun ortalamasını 63 → 56 düşürüyordu, yani
     kroma ve kontrast kazanılırken OKUNURLUK kaybediliyordu — kadronun
     karanlık zeminde ayrışması için var olan `lift` sisteminin tersine
     çalışıyordu. Paso artık kendi ortalamasını kaynakla eşitler (kelepçe
     0,92-1,25): kazanç KONTRASTTA kalır, bedeli parlaklık ödemez. */
  let m0 = 0, m1 = 0;
  for (let i = 0; i < n; i++) {
    m0 += 0.299 * px[i * 4] + 0.587 * px[i * 4 + 1] + 0.114 * px[i * 4 + 2];
    m1 += 0.299 * A[i] + 0.587 * B[i] + 0.114 * L[i];
  }
  const gain = m1 > 1 ? Math.max(0.92, Math.min(1.25, m0 / m1)) : 1;
  for (let i = 0; i < n; i++) {
    const o = i * 4;
    px[o] = Math.max(0, Math.min(255, A[i] * gain));
    px[o + 1] = Math.max(0, Math.min(255, B[i] * gain));
    px[o + 2] = Math.max(0, Math.min(255, L[i] * gain));
  }
  ctx.putImageData(im, 0, 0);
  return canvas;
}
