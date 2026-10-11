/* ═══════════════════════════════════════════════════════════
   perf.js — PERFORMANS ÇEKİRDEĞİ

   Oyunun tüm performans altyapısı tek yerde. Bundan sonra
   EKLENEN HER SİSTEM buradan geçer — kural şudur:

     1) Sıcak döngüde ASLA nesne tahsis etmeyin.  → TMP
     2) Renk stringi ASLA her karede ayrıştırılmaz. → hexOf()
     3) Efekt/varlık adedi ASLA sabit yazılmaz.     → Quality.budget()
     4) İlk kullanımda derlenen hiçbir şey savaşta olmaz. → Warmup
     5) Ölçmediğin şeyi optimize etmeyin.           → Perf (HUD)

   ── Neden TMP? ──
   Three.js'te Matrix4/Vector3/Color kısa ömürlü nesnelerdir. 460
   düşman × kare başına 1 Vector3 = saniyede ~28.000 tahsis. V8 bunu
   "genç kuşak"ta toplar ama toplama anı 5–20 ms'lik bir DURAKLAMA
   üretir: ortalama FPS 60 görünür, oyun ise saniyede bir takılır.
   Oyuncunun "kasıyor" dediği şey neredeyse her zaman budur.
   Çözüm: modül düzeyinde TEK bir geçici nesne kümesi, herkes onu
   yeniden kullanır.

   TMP KULLANIM KURALI: geçici nesneler yalnızca TEK bir fonksiyon
   çağrısı boyunca geçerlidir. Değerini bir kareden diğerine
   saklamak isteyen kod kendi kalıcı alanını tutmalıdır.
   ═══════════════════════════════════════════════════════════ */

import * as THREE from 'three';

/* ═══════════ 1. PAYLAŞILAN GEÇİCİ NESNELER ═══════════ */

export const TMP = {
  m4:  new THREE.Matrix4(),
  m4b: new THREE.Matrix4(),
  q:   new THREE.Quaternion(),
  qb:  new THREE.Quaternion(),
  v:   new THREE.Vector3(),
  vb:  new THREE.Vector3(),
  vc:  new THREE.Vector3(),
  vd:  new THREE.Vector3(),
  ve:  new THREE.Vector3(),
  col: new THREE.Color(),
  colb:new THREE.Color(),
  colc:new THREE.Color(),
  eul: new THREE.Euler(),
};

/** Sabit yukarı ekseni — ASLA yazılmaz, yalnızca okunur. */
export const AXIS_Y = new THREE.Vector3(0, 1, 0);

/* ═══════════ 2. RENK ÖNBELLEĞİ ═══════════
   THREE.Color.set('#ff3b4e') her çağrıda regex ayrıştırma + isimli
   renk tablosu araması yapar. Sıcak döngüde saniyede on binlerce kez
   çağrılıyordu. Sonuç bir tamsayıdır ve string sabit olduğu için
   sonsuza dek aynıdır: bir kez hesapla, Map'te tut.                */

const _hexCache = new Map();

/** Renk girdisini (string | sayı) tamsayı hex'e çevirir — önbellekli. */
export function hexOf(c) {
  if (typeof c === 'number') return c;
  if (!c) return 0xffffff;
  let v = _hexCache.get(c);
  if (v === undefined) {
    v = new THREE.Color(c).getHex();
    _hexCache.set(c, v);
  }
  return v;
}

/** Bir InstancedMesh örneğinin rengini string ayrıştırmadan yazar. */
export function setInstanceColor(mesh, i, color) {
  TMP.col.setHex(hexOf(color));
  mesh.setColorAt(i, TMP.col);
}

/* ═══════════ 3. KISMİ GPU YÜKLEMESİ ═══════════
   InstancedMesh'in matris tamponu MAX kapasitede tahsis edilir (ör.
   480 örnek × 16 float = 30 KB). needsUpdate = true dediğinizde
   three.js TAMPONUN TAMAMINI GPU'ya yükler — sahnede 12 düşman olsa
   bile. Üç mesh × 60 kare = saniyede ~5 MB gereksiz otobüs trafiği;
   mobil GPU'da bu doğrudan kare süresidir.

   updateRange/addUpdateRange ile yalnızca kullanılan ön kısım
   yüklenir. r152+ addUpdateRange, öncesi updateRange kullanır —
   ikisini de destekleyen tek sarmalayıcı:                          */

export function uploadInstances(attr, count, stride) {
  if (!attr) return;
  attr.needsUpdate = true;
  const n = count * stride;
  if (attr.addUpdateRange) {          // three r152+
    attr.clearUpdateRanges && attr.clearUpdateRanges();
    attr.addUpdateRange(0, n);
  } else if (attr.updateRange) {      // eski API
    attr.updateRange.offset = 0;
    attr.updateRange.count = n;
  }
}

/** InstancedMesh için: count ayarla + matris (ve varsa renk) yükle. */
export function commitInstanced(mesh, count, withColor) {
  mesh.count = count;
  uploadInstances(mesh.instanceMatrix, count, 16);
  if (withColor && mesh.instanceColor) uploadInstances(mesh.instanceColor, count, 3);
}

/* ═══════════ 4. UYARLANIR KALİTE ═══════════
   Tek doğruluk kaynağı. Cihaz sınıfı (tier) sabittir; renderScale ve
   stress ise KARE SÜRESİNE göre canlı ayarlanır.

   Neden fpsEma değil de kare süresi?
   • Ortalama FPS yanıltıcıdır: 58 fps ortalama, 55 iyi kare + 5
     korkunç kare demek olabilir. Oyuncu ortalamayı değil KÖTÜ
     KARELERİ hisseder. Bu yüzden hem ortalama hem "sivri uç"
     (yavaş sönümlü tepe) izlenir.
   • Aşağı inmek HIZLI, yukarı çıkmak YAVAŞ olmalı: tersi, sınırda
     gezinen cihazlarda çözünürlüğün sürekli nefes alması (pompalama)
     demektir — bu, düşük ama sabit çözünürlükten daha rahatsız edici.

   Termal gerçek: telefon 3–5 dakika sonra kısılır. Sabit ayar termal
   kısılmada çöker; uyarlanır ayar kendini toplar. 60 fps'i termal
   kısılma altında da tutmanın tek yolu budur.                       */

const BUDGETS = {
  /*              partikül  modelli düşman  düşman  atmosfer  isabet  engel  DPR tavanı */
  low:  { particles: 220, modelEnemies: 18, enemies: 130, atmo: 40,  impacts: 14, props: 66,  dpr: 1.0,  tex: 512,  texHero: 768  },
  mid:  { particles: 450, modelEnemies: 34, enemies: 240, atmo: 70,  impacts: 22, props: 72,  dpr: 1.35, tex: 512,  texHero: 1024 },
  high: { particles: 700, modelEnemies: 52, enemies: 460, atmo: 110, impacts: 30, props: 78,  dpr: 2.0,  tex: 1024, texHero: 1536 },
};

/* stress 0→1 arttıkça bütçenin ne kadarı feda edilir (0 = asla).
   Görsel kimliği taşıyan şeyler (modelli düşmanlar) korunur;
   göze en az batan şeyler (atmosfer zerreleri) ilk gider. */
/* Doku bütçesi ESNEK DEĞİL: dokular yükleme anında bir kez küçültülür,
   sonradan büyütmek yeniden indirme demektir. */
/* `impacts` = eşzamanlı 3B isabet flaşı yuvası (render3d._buildImpactFx).
   Esnekliği partikülden DÜŞÜK (0,30): isabet flaşı süs değil GERİ BİLDİRİMİDİR
   — "vurdum mu" sorusunun cevabı kalabalıkta kaybolursa oyun bozulur. Yuva
   dolarsa en eski isabet geri dönüşür (halka tamponu), tahsis olmaz. */
/* `props` = harita içi çarpışmalı/kırılabilir engel adedi. FLEX = 0 ve bu
   BİLEREK böyle: diğer bütçeler stres altında kısılır, bu KISILMAZ. Engel
   bir efekt değil TOPOGRAFYADIR — koşu ortasında yok olan bir duvar,
   oyuncunun arkasına saklandığı şeyin buharlaşması demektir. Kademe TABANI
   belirler (dizilim pişirmede bir kez kırpılır), stres asla dokunmaz. */
const FLEX = { particles: 0.45, modelEnemies: 0.25, enemies: 0.15, atmo: 0.6, impacts: 0.30, props: 0, dpr: 0, tex: 0, texHero: 0 };

/* Bu eşiğin üstündeki kareler ÖLÇÜM DEĞİL, olaydır (yükleme, sekme
   dönüşü, GLB parse). Kalite kararlarında tamamen yok sayılır. */
const STALL_MS = 120;

export const Quality = {
  tier: 'mid',
  isMobile: false,
  scale: 1,          // dinamik çözünürlük çarpanı (floor..1)
  stress: 0,         // 0 = rahat, 1 = çözünürlük tabanda ve hâlâ zorlanıyor
  floor: 0.6,
  targetMs: 16.7,    // hedef kare süresi (60 fps)
  capFps: 0,         // 0 = tavan yok
  frameMs: 16.7,     // yumuşatılmış kare süresi
  spikeMs: 16.7,     // yavaş sönümlü en kötü kare — YALNIZCA HUD için
  spikes: 0,         // pencere içindeki sivri uç sayısı — karar bunda
  fps: 60,

  _down: 0, _up: 0, _cbs: [],
  _minDt: 999, _probe: 0, _refreshMs: 16.7, _stallAt: 0,
  _capEvery: 1,       // kaç rAF çağrısında bir kare çizilir (1 = hepsi)
  _probeN: 180,       // ölçüm penceresi (ilk pencere uzun: ısıtma gürültüsü)
  _rafLast: 0,

  init(tier, isMobile) {
    this.tier = BUDGETS[tier] ? tier : 'mid';
    this.isMobile = !!isMobile;
    this.floor = isMobile ? 0.58 : 0.65;
    /* Mobilde kareyi 60'a sabitlemek termal olarak BÜYÜK kazanç:
       simülasyon 60 Hz olduğu için 120 Hz'de çizilen kareler ya
       tekrarlanır (judder) ya da boşa güç yakar. Masaüstünde tavan
       yok — orada güç sorunu değil. */
    this.capFps = isMobile ? 60 : 0;
    return this;
  },

  onChange(fn) { this._cbs.push(fn); },

  /** Kare tavanı: rAF ÇAĞRISI SAYARAK uygulanır, zaman eşiğiyle DEĞİL.
      Zaman eşiği hatalıydı çünkü rAF yalnızca tazeleme katlarında ateşlenir
      ve 60, 90 Hz'in katı değildir: 90 Hz'de 11.1 ms'lik kareler eşiğin
      altında kalıp atlanıyor, sonraki kare 22.2 ms'de çiziliyordu — yani
      60 değil 45 fps, üstelik jitter eşiğin tam üstünde olduğu için
      45 ↔ 90 arasında kararsız tempo. Sayaçla: 120/144 Hz'de her 2.
      kare (tam 60/72), 90 Hz'de her kare (90 fps — 45'e düşürmek
      "akıcı değil" şikayetinin ta kendisiydi), 60 Hz'de dokunulmaz. */
  capEvery() { return this._capEvery; },

  budget(key) {
    const b = BUDGETS[this.tier][key];
    if (b === undefined) return 0;
    const flex = FLEX[key] || 0;
    return Math.max(1, Math.round(b * (1 - this.stress * flex)));
  },

  /** Ham DPR tavanı (cihaz oranıyla sınırlı) × dinamik ölçek. */
  dpr() {
    const cap = Math.min(window.devicePixelRatio || 1, BUDGETS[this.tier].dpr);
    return Math.max(0.5, cap * this.scale);
  },

  /** HER rAF çağrısında, kare tavanı kontrolünden ÖNCE çağrılır.

      NEDEN BURADA VE sample()'DA DEĞİL: tazeleme hızı ölçümü sample()
      içindeydi, o ise yalnızca ÇİZİLEN karelerde çalışır. Tavan devreye
      girdiği an ölçüm 8.3 ms yerine 16.7 ms görüyor, ekranı "60 Hz" sanıp
      böleni 1'e düşürüyor, bir sonraki pencerede yine 8.3 ms ölçüp 2'ye
      çıkarıyordu: oyun her ~2 sn'de kare hızını iki katına/yarısına
      çeviriyordu (ölçümün kendine referanslı olması). rAF çağrıları
      atlanmadığı için buradan ölçülen aralık DAİMA panelin gerçek
      aralığıdır ve bölen kendini asla iptal edemez. */
  tickRaf(now) {
    const prev = this._rafLast;
    this._rafLast = now;
    if (!prev) return;
    const d = now - prev;
    /* duraklama (yükleme, sekme dönüşü): pencereyi çöpe at, ölçme */
    if (!(d > 0) || d >= STALL_MS) { this._probe = 0; this._minDt = 999; return; }
    this._probe++;
    if (d < this._minDt) this._minDt = d;
    if (this._probe < this._probeN) return;

    this._refreshMs = Math.max(6, this._minDt);
    /* Hedef: 60 fps. Ekran daha hızlıysa yine 60'ı hedefleriz (sim 60 Hz),
       daha yavaşsa (30 Hz mod) ona uyarız. */
    this.targetMs = Math.max(16.7, this._refreshMs * 0.98);
    /* Kare atlama oranı: TAM SAYI böleni (floor). Kareler her zaman EŞİT
       aralıkla çizilir (judder yok) ve fps asla 60'ın altına inmez:
       60→1 (60), 90→1 (90; atlamak 45 fps demek olurdu), 120→2 (60),
       144→2 (72), 240→4 (60). */
    if (this.capFps > 0) {
      const hz = 1000 / this._refreshMs;
      this._capEvery = Math.max(1, Math.floor(hz / this.capFps + 0.08));
    }
    /* kayan pencere: paneller ADAPTİFTİR (120↔60), ölçüm dondurulamaz */
    this._probe = 0;
    this._minDt = 999;
    this._probeN = 150;                 // ≈ 2.5 sn
  },

  /**
   * Her ÇİZİLEN karede çağrılır. dtMs = gerçek kare süresi (ms).
   * Kalite değiştiyse true döner (çağıran resize etmelidir).
   */
  sample(dtMs, active) {
    /* ── 1) YÜKLEME DURAKLAMALARINI TAMAMEN YUT ──
       GLB parse, budgetTextures'ın canvas küçültmesi, dünya kurulumu,
       sekmeye geri dönüş: hepsi 100 ms – 2 sn'lik tek kareler üretir.
       Bunlar CİHAZIN YAVAŞ OLDUĞUNUN KANITI DEĞİL, bir kerelik
       duraklamalardır. Kanıt sayılırsa cihaz yavaş sanılır ve oyuncu
       tam savaşa girdiği anda çözünürlük boşuna düşer.
       Ayrıca borç (_down) sıfırlanır: eskiden metrik güncellemesi
       atlanıyor ama _down birikmeye devam ediyordu, yani tek bir
       1.5 sn'lik dünya yüklemesi bayat metriklerle anında düşüş
       tetikliyordu. */
    if (!(dtMs > 0) || dtMs >= STALL_MS) {
      this._down = 0;
      this._stallAt = performance.now();
      return false;
    }

    /* Duraklamadan sonraki ilk 250 ms de güvenilmez: shader yeni bağlandı,
       önbellek soğuk. Ölçmeye kısa bir ara ver. */
    if (this._stallAt && performance.now() - this._stallAt < 250) return false;

    this.frameMs += (dtMs - this.frameMs) * 0.09;
    this.fps = 1000 / this.frameMs;
    /* spikeMs yalnızca HUD'da göstermek için tutulur — KARAR VERMEZ. */
    this.spikeMs = dtMs > this.spikeMs ? dtMs : this.spikeMs * 0.965 + dtMs * 0.035;

    /* ── 2) SİVRİ UÇ: TEK TEPE DEĞİL, TEKRAR SAYILIR ──
       Tek kötü kare her oyunda olur ve hiçbir şey ifade etmez; rahatsız
       eden şey TEKRARLAYAN takılmadır. Eskiden sönümlü tek tepe karar
       veriyordu ve matematik acımasızdı: bir 70 ms'lik kareden sonra 27
       kusursuz kare gelse bile tepe eşiğin altına inemiyor, çözünürlük
       garantili düşüyordu — hem de 62 fps'te. Artık pencere içinde
       sayıyoruz, sayaç ~1.25 sn'de bir puan eriyor. */
    const spikeLimit = this.targetMs * 2.2;
    const dt = dtMs / 1000;
    this.spikes = Math.max(0, this.spikes - dt * 0.8);
    if (dtMs > spikeLimit) this.spikes += 1;

    if (!active) { this._down = 0; this._up = 0; return false; }

    const bad = this.targetMs * 1.18;    // ≈ 51 fps altı → müdahale
    const good = this.targetMs * 1.04;   // ≈ 58 fps üstü → toparla

    /* AŞAĞI: hızlı tepki (0.45 sn). Kötü karelerin uzun sürmesi
       oyuncunun oyunu bırakmasına yol açar; bulanıklık yol açmaz. */
    if (this.frameMs > bad) {
      this._up = 0;
      this._down += dt;
      if (this._down > 0.45) {
        this._down = 0;
        return this._stepDown();
      }
      return false;
    }

    /* KARE SÜRESİ İYİ AMA TAKILIYOR (pencerede 3+ sivri uç).
       Bu bir ÇÖZÜNÜRLÜK sorunu değil, iş yükü zirvesi sorunudur —
       netliği düşürmek yanlış ilaç olurdu. Doğru cevap efekt bütçesini
       kısmak. Sayaç ölçümden sonra sıfırlanır: aynı kanıt iki kez ceza
       yazmasın. Kritik olarak _up SIFIRLANMAZ — eskiden sıfırlandığı
       için tek takılma çözünürlüğü sonsuza dek aşağıda kilitliyordu. */
    if (this.spikes >= 3) {
      this.spikes = 0;
      if (this.stress < 1) {
        this.stress = Math.min(1, this.stress + 0.34);
        this._emit();
        return true;
      }
      return false;
    }

    /* YUKARI: yavaş tepki (2.5 sn) — pompalamayı önler. */
    if (this.frameMs < good) {
      this._down = 0;
      this._up += dt;
      if (this._up > 2.5) {
        this._up = 0;
        return this._stepUp();
      }
      return false;
    }

    this._down = 0; this._up = 0;
    return false;
  },

  /** Netliği önce, efekt adedini sonra feda eder (sıralama kasıtlı:
      bulanık ama kalabalık sahne, keskin ama boş sahneden daha çok
      "oyun" gibi görünür). */
  _stepDown() {
    /* v73b: çözünürlük adımı WebGL tuvalini yeniden ayırır (5-30 ms takılma). İki adım arası ≥ 3 sn;
       aradaki baskı önce efekt bütçesine (stres — yeniden ayırma yok) gider. Adımlar 0,1'e kuantize:
       aynı tuval boyları tekrar eder, pompalama olmaz. */
    const now = performance.now();
    if (this.scale > this.floor && now - (this._scaleAt || 0) > 3000) {
      this._scaleAt = now;
      this.scale = Math.max(this.floor, Math.round((this.scale - 0.1) * 10) / 10);
      this._emit();
      return true;
    }
    if (this.stress < 1) {
      this.stress = Math.min(1, this.stress + 0.34);
      this._emit();
      return true;
    }
    return false;
  },

  /** Feda edilenleri ters sırada geri verir: önce efektler, sonra netlik. */
  _stepUp() {
    if (this.stress > 0) {
      this.stress = Math.max(0, this.stress - 0.34);
      this._emit();
      return true;
    }
    if (this.scale < 1) {
      const now = performance.now();
      if (now - (this._scaleAt || 0) < 8000) return false;   // v73b: yukarı adım en erken 8 sn sonra
      this._scaleAt = now;
      this.scale = Math.min(1, Math.round((this.scale + 0.1) * 10) / 10);
      this._emit();
      return true;
    }
    return false;
  },

  /**
   * Dünya/model yüklemesinden ve savaşa girişten SONRA çağrılır:
   * bayat kanıtı siler. Yükleme sırasındaki kareler oyunun gerçek
   * kare bütçesini temsil etmez; onlarla karar vermek "oyuncu savaşa
   * girer, görüntü bulanıklaşır" hatasının ta kendisiydi.
   */
  reset() {
    this.frameMs = this.targetMs;
    this.spikeMs = this.targetMs;
    this.spikes = 0;
    this._down = 0;
    this._up = 0;
    this._stallAt = performance.now();
  },

  _emit() { for (const f of this._cbs) { try { f(this); } catch (e) { /* yut */ } } },
};

/* ═══════════ 4b. DOKU BELLEK BÜTÇESİ ═══════════
   En sinsi mobil çöküş nedeni budur ve FPS ile hiç ilgisi yoktur.

   WebP/PNG bir dosyada sıkışıktır ama GPU'ya yüklenince HAM RGBA olur:
   1024² doku = 4 MB, mipmap'lerle ~5.3 MB. Beş düşman + kahraman +
   normal/metalik/pürüzlülük haritaları derken 150–300 MB'a çıkar.
   2 GB RAM'li telefonlarda Android WebView ~350 MB'ta öldürülür —
   oyuncu "bir süre sonra kapanıyor" der, biz FPS ararız.

   1536² → 1024² geçişi belleği YARIYA indirir ve telefon ekranında
   ~300 piksel boyunda görünen bir karakterde fark edilmez (ekranda
   1024 piksel dokuya bile hiç ihtiyaç yok — mipmap zaten küçültüyor).
   Kalıcı çözüm KTX2/Basis'tir (GPU belleğinde de sıkışık kalır); bu
   ise onu beklemeden şimdi çalışan güvenlik ağıdır.                */

/** Yüklenmiş bir dokuyu en uzun kenarı max olacak şekilde küçültür. */
export function fitTexture(tex, max) {
  const img = tex && tex.image;
  if (!img) return tex;
  const w = img.width | 0, h = img.height | 0;
  if (!w || !h || Math.max(w, h) <= max) return tex;
  const k = max / Math.max(w, h);
  const cw = Math.max(1, Math.round(w * k));
  const ch = Math.max(1, Math.round(h * k));
  const cv = document.createElement('canvas');
  cv.width = cw; cv.height = ch;
  const g = cv.getContext('2d');
  g.imageSmoothingEnabled = true;
  g.imageSmoothingQuality = 'high';
  try { g.drawImage(img, 0, 0, cw, ch); } catch (e) { return tex; }
  tex.image = cv;
  tex.needsUpdate = true;
  /* ImageBitmap'i kapat: aksi halde orijinal tam boy kopya bellekte kalır
     ve bütün kazanç boşa gider. */
  if (img.close) { try { img.close(); } catch (e) { /* */ } }
  return tex;
}

const TEX_SLOTS = ['map', 'normalMap', 'roughnessMap', 'metalnessMap',
                   'emissiveMap', 'aoMap', 'alphaMap'];

/**
 * Bir modelin (GLB/FBX kökü) TÜM dokularını bütçeye sığdırır.
 * Aynı doku birden fazla materyalde paylaşılıyorsa bir kez işlenir.
 * Renk taşıyan haritalar tam bütçeyi, veri haritaları (normal hariç)
 * yarısını alır — pürüzlülük/metaliklik gözle takip edilemez.
 */
export function budgetTextures(root, max) {
  const seen = new Set();
  let saved = 0;
  root.traverse((o) => {
    const mats = o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : null;
    if (!mats) return;
    for (let i = 0; i < mats.length; i++) {
      const mt = mats[i];
      for (let j = 0; j < TEX_SLOTS.length; j++) {
        const slot = TEX_SLOTS[j];
        const tex = mt[slot];
        if (!tex || seen.has(tex)) continue;
        seen.add(tex);
        const cap = (slot === 'roughnessMap' || slot === 'metalnessMap' || slot === 'aoMap')
          ? Math.max(256, max >> 1) : max;
        const before = tex.image ? Math.max(tex.image.width | 0, tex.image.height | 0) : 0;
        fitTexture(tex, cap);
        const after = tex.image ? Math.max(tex.image.width | 0, tex.image.height | 0) : 0;
        if (after && before > after) saved += (before * before - after * after) * 4;
      }
    }
  });
  if (saved > 1048576) {
    console.info('doku bütçesi: ~' + (saved / 1048576).toFixed(1) + ' MB GPU belleği kazanıldı');
  }
  return root;
}

/* ═══════════ 5. ISITMA (WARM-UP) ═══════════
   Bir shader ilk kez çizildiğinde sürücü onu DERLER: 20–150 ms.
   Bir ses ilk kez çaldığında çözülür. Bir doku ilk kez görününce
   GPU'ya yüklenir. Bunların hepsi savaşın ortasında olursa oyuncu
   "yeni düşman gelince takılıyor" der — ve haklıdır.

   Çözüm: hepsini açılış ekranında yap. Kullanıcı zaten bekliyor. */

export const Warmup = {
  _tasks: [],
  add(label, fn) { this._tasks.push({ label, fn }); },

  /** Görevleri kare kare çalıştırır (açılış çubuğu donmasın). */
  async run(onProgress) {
    const n = this._tasks.length;
    for (let i = 0; i < n; i++) {
      const t = this._tasks[i];
      try { await t.fn(); } catch (e) { console.warn('ısıtma atlandı:', t.label, e); }
      if (onProgress) onProgress((i + 1) / n, t.label);
      await new Promise((r) => requestAnimationFrame(() => r()));
    }
    this._tasks.length = 0;
  },
};

/**
 * Sahnedeki tüm materyalleri önceden derler ve dokuları GPU'ya yükler.
 * Görünmez nesneler de dahil edilir (gizli olanlar geçici görünür yapılır),
 * çünkü asıl amaç ilk görünme anındaki donmayı önlemek.
 */
export function precompileScene(renderer, scene, camera) {
  const hidden = [];
  scene.traverse((o) => {
    if (o.visible === false) { hidden.push(o); o.visible = true; }
  });
  try {
    if (renderer.compileAsync) return renderer.compileAsync(scene, camera)
      .finally(() => { for (const o of hidden) o.visible = false; });
    renderer.compile(scene, camera);
  } catch (e) { console.warn('shader ön-derleme atlandı', e); }
  for (const o of hidden) o.visible = false;
  return Promise.resolve();
}

/* ═══════════ 6. PROFİLLEYİCİ + CİHAZ ÜZERİ HUD ═══════════
   Gerçek telefonda test etmenin tek dürüst yolu sayıları cihazda
   görmektir. Açmak için: adrese ?perf=1 ekle, ya da sol ÜST köşeye
   üç kez hızlı dokun (cihazda konsol açmaya gerek kalmasın).

   Kapalıyken maliyeti sıfırdır: section() hemen döner.             */

export const Perf = {
  on: false,
  _el: null,
  _sections: Object.create(null),
  _order: [],
  _t0: 0,
  _cur: null,
  _last: 0,
  drawCalls: 0, tris: 0,

  init(renderer) {
    this.renderer = renderer;
    try {
      if (new URLSearchParams(location.search).get('perf') === '1') this.enable();
    } catch (e) { /* */ }

    /* sol üst köşeye üç dokunuş → HUD (cihaz üzerinde hata ayıklama) */
    let taps = 0, tt = 0;
    addEventListener('pointerdown', (e) => {
      if (e.clientX > 90 || e.clientY > 90) { taps = 0; return; }
      const now = performance.now();
      if (now - tt > 600) taps = 0;
      tt = now; taps++;
      if (taps >= 3) { taps = 0; this.on ? this.disable() : this.enable(); }
    }, { capture: true, passive: true });
  },

  enable() {
    this.on = true;
    if (!this._el) {
      const el = document.createElement('div');
      el.id = '__perfhud';
      el.style.cssText = 'position:fixed;left:6px;top:6px;z-index:99998;pointer-events:none;' +
        'font:10px/1.45 ui-monospace,monospace;color:#9dffcf;background:rgba(4,6,10,0.82);' +
        'padding:6px 8px;border-radius:6px;white-space:pre;letter-spacing:0.02em;' +
        'text-shadow:0 1px 0 #000;min-width:132px';
      document.body.appendChild(el);
      this._el = el;
    }
    this._el.style.display = 'block';
  },

  disable() { this.on = false; if (this._el) this._el.style.display = 'none'; },

  /** Bölüm zamanlayıcı. Kapalıysa hiçbir şey yapmaz. */
  section(name) {
    if (!this.on) return;
    const now = performance.now();
    if (this._cur) {
      const s = this._sections[this._cur];
      s.ms += (now - this._t0 - s.ms) * 0.1;
    }
    if (!this._sections[name]) { this._sections[name] = { ms: 0 }; this._order.push(name); }
    this._cur = name; this._t0 = now;
  },

  endSection() {
    if (!this.on || !this._cur) return;
    const s = this._sections[this._cur];
    s.ms += (performance.now() - this._t0 - s.ms) * 0.1;
    this._cur = null;
  },

  /** Kare sonunda çağrılır; HUD'u saniyede ~5 kez günceller. */
  frame(game) {
    if (!this.on) return;
    const now = performance.now();
    if (now - this._last < 200) return;
    this._last = now;

    const info = this.renderer && this.renderer.info;
    const q = Quality;
    let txt =
      'fps  ' + q.fps.toFixed(0) + '   ' + q.frameMs.toFixed(1) + 'ms\n' +
      'sivri ' + q.spikeMs.toFixed(1) + 'ms\n' +
      'ölçek ' + q.scale.toFixed(2) + '  stres ' + q.stress.toFixed(2) + '\n' +
      'kade  ' + q.tier + '  dpr ' + q.dpr().toFixed(2) + '\n';
    if (info) txt += 'çizim ' + info.render.calls + '  üçgen ' + (info.render.triangles / 1000).toFixed(0) + 'k\n';
    if (game) {
      txt += 'düşman ' + game.enemies.pool.count + '  part ' + game.pools.particles.count + '\n';
    }
    if (performance.memory) {
      txt += 'yığın ' + (performance.memory.usedJSHeapSize / 1048576).toFixed(0) + 'MB\n';
    }
    for (const k of this._order) txt += k + ' ' + this._sections[k].ms.toFixed(2) + '\n';
    this._el.textContent = txt;
  },
};

/* ═══════════ 7. HAPTİK ═══════════
   Titreşim, bir web sayfasını "uygulama" gibi hissettiren en ucuz
   tek şeydir. Kural: KISA (8–30 ms) ve SEYREK. Uzun/sık titreşim
   oyuncuyu yorar ve pili yer; ayrıca art arda çağrı Android'de
   kuyruğa girip gecikmeli hissedilir — bu yüzden hız sınırı var.  */

const HAPTIC = { hit: 8, crit: 18, hurt: 26, death: 45, ui: 6 };

export const Haptics = {
  enabled: true,
  _last: 0,
  fire(kind) {
    if (!this.enabled || !navigator.vibrate) return;
    const now = performance.now();
    if (now - this._last < 55) return;      // hız sınırı
    this._last = now;
    const v = HAPTIC[kind] || 10, k = this.k == null ? 1 : this.k;
    try { navigator.vibrate(k === 1 ? v : (Array.isArray(v) ? v.map((x) => Math.max(4, Math.round(x * k))) : Math.max(4, Math.round(v * k)))); } catch (e) { /* */ }
  },
};

/* ═══════════ 8. NATİF KABUK ═══════════
   Tarayıcı olduğunu ifşa eden şeyleri sustur + ekranı uyanık tut. */

export function nativeShell() {
  /* çift dokunma zoom / uzun basma menüsü / seçim tutamakları */
  document.addEventListener('gesturestart', (e) => e.preventDefault(), { passive: false });
  document.addEventListener('dblclick', (e) => e.preventDefault(), { passive: false });

  /* ekran kilidi: oyun sırasında telefon kararmasın */
  let lock = null;
  const acquire = async () => {
    if (!('wakeLock' in navigator) || lock) return;
    try { lock = await navigator.wakeLock.request('screen'); lock.addEventListener('release', () => { lock = null; }); }
    catch (e) { /* izin yok — sorun değil */ }
  };
  document.addEventListener('visibilitychange', () => { if (!document.hidden) acquire(); });
  acquire();

  /* ilk kullanıcı dokunuşunda tam ekran (tarayıcı çubuğu gitsin) */
  const goFull = () => {
    const el = document.documentElement;
    if (!document.fullscreenElement && el.requestFullscreen) {
      el.requestFullscreen({ navigationUI: 'hide' }).catch(() => { /* */ });
    }
    if (screen.orientation && screen.orientation.lock) {
      screen.orientation.lock('portrait').catch(() => { /* */ });
    }
    removeEventListener('pointerdown', goFull);
  };
  addEventListener('pointerdown', goFull, { once: true });
}
