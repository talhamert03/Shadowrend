/* ═══════════════════════════════════════════════════════════
   isleArt.js — AI ADA VARLIKLARI (Higgsfield, 2026-09-09)

   Kullanıcı: "ana menüdeki haritaların önizlemelerini ve chapterdaki
   küçük adacıkları premium olarak yeniden tasarlayalım."

   SÖZLEŞME (zemin karosu dersleriyle aynı, bkz. CLAUDE.md v31-v32):
   ① AI yalnız VARLIK üretir, KOMPOZİSYON kodda kalır. `climbLayout`
     düğümleri, yol, ilerleme okuması, bayrak ve ışık sütunu hiç
     değişmedi — sprite yalnız prosedürel kaya+çim+yapı kütlesinin
     yerine geçer. Oynanış verisi ile süs verisi aynı görüntüden gelemez.
   ② ÇAPA ÖLÇÜLÜR, VARSAYILMAZ. Her sprite'ın plato hattı = maskesinin
     EN GENİŞ alfa satırı (kesim sırasında ölçüldü). `ax/ay` o satırın
     merkezi, `hw` yarı genişliği — hepsi 0..1 normalize, yani sprite
     çözünürlüğü değişse de hiza bozulmaz.
   ③ KROMA MAKRODA YAŞAR. Ham sprite gri-gotik; dünya kimliği yükleme
     anında BİR KEZ pişirilir (source-atop %10 dünya rengi + dipten
     %22 glow sekmesi + %8 gece yıkaması). Kare başına maliyet sıfır,
     boyama başına maliyet sıfır.
   ④ VARLIK AĞDAN GELİR, EKRAN BEKLEMEZ. Sprite yoksa `isleSprite`
     null döner ve skyMap eski prosedürel yolu çizer; sprite gelince
     `isles-ready` yayınlanır, önbellek sürümü artar, sahne tazelenir.
     (v29b dersi: boyanmamış tuval bir daha boyanmaz — tetik şart.)
   ⑤ TAM BOY SPRITE PAHALI, KART KÜÇÜK. İki depo: `full` (LRU KEEP=2 +
     PİN) ve `thumbs` (LRU THUMB_KEEP = dünya sayısı + PİN; taban 160 px,
     DPR ≥ 2,5'te 320 px). ÖLÇÜLEN boyut: tam boy zincir **6,1 MB/dünya**,
     thumb zinciri 160 tabanda **0,59 MB/dünya** (on dünya ~5,9 MB).
     Tavan çalışma kümesinden küçük olursa önbellek çarka döner — bkz.
     THUMB_KEEP yorumu. On dünyalık kart
     ızgarası thumb'dan çizilir; tam boy yalnız o an oynanan dünyada yaşar.
     (v32'nin "on karo 168 MB tutar" dersi.)
   ═══════════════════════════════════════════════════════════ */

import { ISLE_BOSS_DEPTH } from './isleScene.js?v=20260930m';
import { WORLDS } from './worlds.js?v=20260930m';

/* Dosya adı SÜRÜMLÜ — force-cache bayat bayt servis eder (v32 dersi).
   Bir yüzey yeniden üretilirse yalnız O SATIRIN eki artırılır. */
const V = '20260909';

/* Kesimde ÖLÇÜLEN çapa tablosu. w/h yalnız oran içindir.
   Sıra: [görev varyantı 1, 2, 3, boss]. */
const TABLE = {
  /* ON DÜNYA DA KOD İLE ÜRETİLDİ (2026-09-17, `_islegen.js` + `_islebake.js`).
     Ad kuralı `_g1/_g2/_g3/_gb` = kod üretimi; AI webp'leri (`mezarlik_1.webp`
     …) diskte KALIR — geri dönmek için tek yapılacak o satırı eski dosya
     adına ve çapasına çevirmek (git geçmişi + bu dosyanın v33 hali). */
  mezarlik: [
    { f: 'mezarlik_g1.webp', w: 544, h: 421, ax: 0.4979, ay: 0.3785, hw: 0.4944, v: '20260917b' },
    { f: 'mezarlik_g2.webp', w: 523, h: 544, ax: 0.5000, ay: 0.4573, hw: 0.4966, v: '20260917b' },
    { f: 'mezarlik_g3.webp', w: 515, h: 544, ax: 0.5000, ay: 0.4803, hw: 0.4968, v: '20260917b' },
    { f: 'mezarlik_gb.webp', w: 571, h: 704, ax: 0.4952, ay: 0.5704, hw: 0.4921, v: '20260917b' }],
  kul: [
    { f: 'kul_g1.webp', w: 544, h: 529, ax: 0.5004, ay: 0.5153, hw: 0.4953, v: '20260917b' },
    { f: 'kul_g2.webp', w: 544, h: 516, ax: 0.4978, ay: 0.4652, hw: 0.4945, v: '20260917b' },
    { f: 'kul_g3.webp', w: 505, h: 544, ax: 0.5009, ay: 0.4938, hw: 0.4932, v: '20260917b' },
    { f: 'kul_gb.webp', w: 524, h: 704, ax: 0.5116, ay: 0.6094, hw: 0.4853, v: '20260917b' }],
  bataklik: [
    { f: 'bataklik_g1.webp', w: 544, h: 415, ax: 0.4855, ay: 0.4661, hw: 0.4788, v: '20260917b' },
    { f: 'bataklik_g2.webp', w: 544, h: 415, ax: 0.4945, ay: 0.3785, hw: 0.4869, v: '20260917b' },
    { f: 'bataklik_g3.webp', w: 544, h: 530, ax: 0.5005, ay: 0.4652, hw: 0.4963, v: '20260917b' },
    { f: 'bataklik_gb.webp', w: 571, h: 704, ax: 0.5000, ay: 0.5759, hw: 0.4969, v: '20260917b' }],
  katedral: [
    { f: 'katedral_g1.webp', w: 544, h: 522, ax: 0.5000, ay: 0.4011, hw: 0.4966, v: '20260917b' },
    { f: 'katedral_g2.webp', w: 544, h: 466, ax: 0.4831, ay: 0.4462, hw: 0.4749, v: '20260917b' },
    { f: 'katedral_g3.webp', w: 472, h: 544, ax: 0.5018, ay: 0.5204, hw: 0.4950, v: '20260917b' },
    { f: 'katedral_gb.webp', w: 562, h: 704, ax: 0.5004, ay: 0.5650, hw: 0.4958, v: '20260917b' }],
  hiclik: [
    { f: 'hiclik_g1.webp', w: 493, h: 544, ax: 0.5045, ay: 0.5227, hw: 0.4923, v: '20260917b' },
    { f: 'hiclik_g2.webp', w: 544, h: 471, ax: 0.5009, ay: 0.4706, hw: 0.4957, v: '20260917b' },
    { f: 'hiclik_g3.webp', w: 540, h: 544, ax: 0.5022, ay: 0.4973, hw: 0.4945, v: '20260917b' },
    { f: 'hiclik_gb.webp', w: 497, h: 704, ax: 0.5004, ay: 0.5809, hw: 0.4943, v: '20260917b' }],
  gokada: [
    { f: 'gokada_g1.webp', w: 544, h: 444, ax: 0.5034, ay: 0.3956, hw: 0.4932, v: '20260917b' },
    { f: 'gokada_g2.webp', w: 544, h: 494, ax: 0.4987, ay: 0.4441, hw: 0.4910, v: '20260917b' },
    { f: 'gokada_g3.webp', w: 480, h: 544, ax: 0.5076, ay: 0.5231, hw: 0.4892, v: '20260917b' },
    { f: 'gokada_gb.webp', w: 561, h: 704, ax: 0.5030, ay: 0.5742, hw: 0.4939, v: '20260917b' }],
  tuzla: [
    { f: 'tuzla_g1.webp', w: 534, h: 544, ax: 0.4979, ay: 0.5167, hw: 0.4910, v: '20260917b' },
    { f: 'tuzla_g2.webp', w: 544, h: 536, ax: 0.5017, ay: 0.5032, hw: 0.4906, v: '20260917b' },
    { f: 'tuzla_g3.webp', w: 544, h: 425, ax: 0.5009, ay: 0.4661, hw: 0.4906, v: '20260917b' },
    { f: 'tuzla_gb.webp', w: 555, h: 704, ax: 0.4982, ay: 0.5837, hw: 0.4914, v: '20260917b' }],
  buzul: [
    { f: 'buzul_g1.webp', w: 544, h: 483, ax: 0.4974, ay: 0.4195, hw: 0.4914, v: '20260917b' },
    { f: 'buzul_g2.webp', w: 544, h: 481, ax: 0.4983, ay: 0.4855, hw: 0.4923, v: '20260917b' },
    { f: 'buzul_g3.webp', w: 518, h: 544, ax: 0.4919, ay: 0.5007, hw: 0.4809, v: '20260917b' },
    { f: 'buzul_gb.webp', w: 574, h: 704, ax: 0.4931, ay: 0.5740, hw: 0.4857, v: '20260917b' }],
  kemikbahce: [
    { f: 'kemikbahce_g1.webp', w: 544, h: 423, ax: 0.4966, ay: 0.3649, hw: 0.4932, v: '20260917b' },
    { f: 'kemikbahce_g2.webp', w: 544, h: 520, ax: 0.4969, ay: 0.4579, hw: 0.4936, v: '20260917b' },
    { f: 'kemikbahce_g3.webp', w: 544, h: 457, ax: 0.5021, ay: 0.3963, hw: 0.4936, v: '20260917b' },
    { f: 'kemikbahce_gb.webp', w: 600, h: 704, ax: 0.4985, ay: 0.5539, hw: 0.4860, v: '20260917b' }],
  gokcark: [
    { f: 'gokcark_g1.webp', w: 541, h: 544, ax: 0.5014, ay: 0.4515, hw: 0.4954, v: '20260917b' },
    { f: 'gokcark_g2.webp', w: 544, h: 517, ax: 0.4834, ay: 0.4700, hw: 0.4785, v: '20260917b' },
    { f: 'gokcark_g3.webp', w: 544, h: 509, ax: 0.5013, ay: 0.4966, hw: 0.4953, v: '20260917b' },
    { f: 'gokcark_gb.webp', w: 540, h: 704, ax: 0.4985, ay: 0.6074, hw: 0.4896, v: '20260917b' }],
};

/* THUMB TABANI EKRANIN GERÇEK İHTİYACINDAN TÜRER, SABİT DEĞİL.
   320 px seviyesi ancak DPR ≥ 2,5'te çiziliyor (doğrulamada ölçüldü:
   DPR 1,25'te kart yolu 160 seviyesini seçiyor), yani sabit 320 taban
   çoğu cihazda HİÇ ÇİZİLMEYEN bayt demekti. */
const THUMB_W = (typeof window !== 'undefined' && (window.devicePixelRatio || 1) >= 2.5) ? 320 : 160;
const KEEP = 2;
/* THUMB DEPOSU DA SINIRLIDIR — AMA TAVAN AYNI ANDA ÇİZİLEN KART SAYISINDAN
   KÜÇÜK OLAMAZ. Ölçüldü (doğrulama bulgusu): THUMB_KEEP=4 iken dünya seçimi
   on kart çiziyor, her turda en az altısı ıskalıyor, ıskalayan yüklüyor,
   yükleyen `isles-ready` yayınlıyor, olay yeniden boyatıyor — SANİYEDE
   ~13 TURLUK sonsuz döngü (decode + tint + mip + on tuval, boşta bile).
   160 px tabanında on dünya ölçülen 0,59 × 10 ≈ 5,9 MB: zaten sınırlı.
   Bir önbellek tavanı, ÇALIŞMA KÜMESİNDEN (aynı karede istenen öğe
   sayısı) küçükse önbellek değil ÇARKTIR. */
const THUMB_KEEP = Math.max(6, WORLDS.length);

const full = new Map();      // floor -> [canvas x4]
const thumbs = new Map();    // floor -> [canvas x4]
const inflight = new Map();
const order = [];            // LRU: en eski başta
const thumbOrder = [];
let pinned = null;
let rev = 0;
let notifyQueued = false;

/* Olay TUR BAŞINA BİR KEZ yayınlanır: dört sprite'ın her biri ayrı olay
   yayınlarsa dinleyici (tuval yeniden boyama) aynı işi dört kez yapar. */
function notifyReady() {
  rev++;
  if (notifyQueued) return;
  notifyQueued = true;
  Promise.resolve().then(() => {
    notifyQueued = false;
    try { window.dispatchEvent(new Event('isles-ready')); } catch (e) { /* yok say */ }
  });
}

const al = (rgba, a) => rgba.replace(/[\d.]+\)$/, a + ')');
const free = (c) => { if (c) { c.width = 0; c.height = 0; } };

/** Kimlik pişirmesi + MİP ZİNCİRİ.
    Tek `drawImage` ile 5-8 kat küçültülen bir görüntü bilineer süzgeçle
    LAPA olur (ölçüldü: kart ızgarasında örnek/px 8,8 — büyütme YOK ama
    net de değil). Zincir her seviyede YARIYA iner; çizim anında küçültme
    hiçbir zaman 2 katı geçmez, yani süzgeç komşu pikseli gerçekten görür. */
function tint(bmp, wd, W, H) {
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d');
  g.imageSmoothingQuality = 'high';
  g.drawImage(bmp, 0, 0, W, H);
  g.globalCompositeOperation = 'source-atop';
  g.globalAlpha = 0.07; g.fillStyle = wd.color; g.fillRect(0, 0, W, H);
  g.globalAlpha = 1;
  const bo = g.createLinearGradient(0, H * 0.60, 0, H);
  bo.addColorStop(0, al(wd.glow, 0));
  bo.addColorStop(1, al(wd.glow, 0.16));
  g.fillStyle = bo; g.fillRect(0, 0, W, H);
  g.fillStyle = 'rgba(10,8,16,0.08)'; g.fillRect(0, 0, W, H);
  g.globalCompositeOperation = 'source-over';
  return mips(c);
}

function mips(src) {
  const levels = [src];
  let cur = src;
  /* ZİNCİR NEREDE BİTERSE, ÖLÇEK GRANÜLASYONU ORADA BİTER. Taban 40 px
     iken kart ızgarasında ölçülen en kötü oran 2,42 (katedral: dar sprite,
     293 px tabanda zincir 36'da duruyor ve kart yalnız ~15 px istiyor) —
     yani bandın (1,0-2,05) ÜSTÜ. Taban 24'e indi: iki seviye daha, maliyet
     zincirin %1'i (her seviye öncekinin çeyreği). */
  while (cur.width > 24) {
    const w = Math.max(12, Math.round(cur.width / 2));
    const h = Math.max(1, Math.round(cur.height / 2));
    const n = document.createElement('canvas');
    n.width = w; n.height = h;
    const g2 = n.getContext('2d');
    g2.imageSmoothingQuality = 'high';
    g2.drawImage(cur, 0, 0, w, h);
    levels.push(n); cur = n;
  }
  return levels;
}

/** İhtiyacı karşılayan EN KÜÇÜK seviye. Eşikte tolerans YOKTUR: %2'lik bir
    pay bile çizimi büyütmeye çevirir (ölçüldü: mezarlik önizleme 0,99). */
function pick(levels, needW) {
  let best = levels[0];
  for (const lv of levels) if (lv.width >= needW) best = lv;
  return best;
}

function touch(floor) {
  const i = order.indexOf(floor);
  if (i >= 0) order.splice(i, 1);
  order.push(floor);
}

function touchThumb(floor) {
  const i = thumbOrder.indexOf(floor);
  if (i >= 0) thumbOrder.splice(i, 1);
  thumbOrder.push(floor);
}

function evictThumbs() {
  while (thumbs.size > THUMB_KEEP) {
    const k = thumbOrder.find((f) => f !== pinned && thumbs.has(f));
    if (!k) break;
    /* Destek deposu ANINDA bırakılır — GC beklemek telefonda
       hissedilir bir bellek tepesidir (v32 dersi). */
    (thumbs.get(k) || []).forEach((lv) => lv.forEach(free));
    thumbs.delete(k);
    thumbOrder.splice(thumbOrder.indexOf(k), 1);
  }
}

/* KULLANIM = PİN (v32 dersi): oynanan dünyanın tuvali asla atılmaz,
   yoksa sahne ortasında `full` boşalır ve zemin sessizce kaybolur. */
function evict() {
  while (full.size > KEEP) {
    const k = order.find((f) => f !== pinned && full.has(f));
    if (!k) break;
    (full.get(k) || []).forEach((lv) => lv.forEach(free));
    full.delete(k);
    order.splice(order.indexOf(k), 1);
  }
}

async function load(floor, wantFull) {
  const ents = TABLE[floor];
  if (!ents) return false;
  if (full.has(floor)) { touch(floor); return true; }
  if (!wantFull && thumbs.has(floor)) return true;
  const key = floor + (wantFull ? ':f' : ':t');
  if (inflight.has(key)) return inflight.get(key);

  const wd = WORLDS.find((w) => w.floor === floor) || WORLDS[0];
  const p = (async () => {
    const cans = [], ths = [];
    for (const m of ents) {
      /* DEKOD ANA İPLİKTE YAPILMAZ (v32'de ölçüldü: <img> yolu 1315-1688 ms,
         fetch+createImageBitmap 165-218 ms). */
      const r = await fetch('assets/isles/' + m.f + '?v=' + (m.v || V), { cache: 'force-cache' });
      if (!r.ok) throw new Error(m.f + ' ' + r.status);
      const bmp = await createImageBitmap(await r.blob());
      if (wantFull) cans.push(tint(bmp, wd, bmp.width, bmp.height));
      if (!thumbs.has(floor)) {
        ths.push(tint(bmp, wd, THUMB_W, Math.max(1, Math.round(bmp.height * THUMB_W / bmp.width))));
      }
      if (bmp.close) bmp.close();
    }
    if (ths.length) { thumbs.set(floor, ths); touchThumb(floor); evictThumbs(); }
    if (wantFull) { full.set(floor, cans); touch(floor); evict(); }
    notifyReady();
    return true;
  })().catch((e) => {
    console.warn('[isleArt] ' + floor + ' yüklenemedi, prosedürele düşülüyor:', e.message);
    return false;
  }).finally(() => inflight.delete(key));

  inflight.set(key, p);
  return p;
}

/** Bu dünyayı TAM BOY yükle ve PİNLE (oynanan/görüntülenen dünya). */
/* v38: adalar artık isleScene.js ile ÇİZİLİYOR — sprite indirilmez.
   Tablo ve yükleyici geri dönüş için yerinde (SPRITES = true). */
const SPRITES = false;
export function preloadIsles(floor) {
  if (!SPRITES || !TABLE[floor]) return Promise.resolve(false);
  pinned = floor;
  return load(floor, true);
}

/** Yalnız kart ızgarası için: küçük thumb (tam boy tuval kurmaz).
    Depo LRU'dur (THUMB_KEEP) — kalıcı değil. */
export function warmIsleThumbs(floor) {
  if (!SPRITES) return Promise.resolve(false);
  if (!TABLE[floor] || full.has(floor)) return Promise.resolve(true);
  if (thumbs.has(floor)) { touchThumb(floor); return Promise.resolve(true); }
  return load(floor, false);
}

/** Boyama önbelleğini geçersizleştiren sürüm sayacı. */
export function islesRev() { return rev; }

/**
 * @param {string} floor  dünya zemini
 * @param {number|'b'} slot  görev varyantı (0-2) ya da boss
 * @param {number} rxDev  plato YARI genişliği, CİHAZ PİKSELİ cinsinden
 *   (tuval DPR ile ölçekli; CSS px ile seçim yapmak retinada sprite'ı iki
 *   kat büyütmek demektir). Yalnız ÖN seçimdir — kesin seviye `lod()`
 *   ile, ÇİZİM ÖLÇÜSÜ belli olduktan sonra alınır: yükseklik tavanı ve
 *   taç kısması `dw`yi küçültüyor ve önceden seçilen seviye 2,5 kat
 *   fazla büyük kalıyordu (ölçüldü: katedral 2,51 örnek/px).
 * @returns {{img,lod:(devW:number)=>CanvasImageSource,ax,ay,hw,w,h}|null}
 */
export function isleSprite(floor, slot, rxDev) {
  const ents = TABLE[floor];
  if (!ents) return null;
  const i = slot === 'b' ? 3 : (slot % 3 + 3) % 3;
  const m = ents[i];
  const needW = rxDev / m.hw;
  const F = full.get(floor);
  const T = thumbs.get(floor);
  /* TAM BOY VARSA HER ZAMAN O KULLANILIR: zaten bellekte, downscale
     bedava ve her zaman daha net. Thumb yalnız tam boy yüklenmemiş
     dünyalar (kart ızgarası) için bir YEDEKTİR. */
  let img = (F && F[i]) || null;
  if (!img && T) { img = T[i]; touchThumb(floor); }
  if (!img || !img.length) return null;
  const lv = pick(img, needW);
  if (!lv.width) return null;
  if (!F && needW > img[0].width * 1.02) load(floor, true);
  return { img: lv, lod: (devW) => pick(img, devW), ax: m.ax, ay: m.ay, hw: m.hw,
           w: lv.width, h: lv.height };
}

/** Plato ALTINDAKİ kaya derinliği, rx cinsinden (0 = bu dünyada AI sprite yok).
    Boss madalyonunun kaydırması bu değerden türer: prosedürel `rockPath`
    derinliği rx·1,0 idi, AI adası %20 daha sığ (mezarlik_b 0,80·rx) ve
    0,75·rx'lik eski kaydırma madalyonu adanın ucundan 25 px taşırıyordu
    (doğrulamada ölçüldü). Sihirli sayı yerine sprite'ın kendi geometrisi. */
export function isleDepthBelow(floor, slot) {
  if (!SPRITES) return ISLE_BOSS_DEPTH;
  const ents = TABLE[floor];
  if (!ents) return 0;
  const m = ents[slot === 'b' ? 3 : (slot % 3 + 3) % 3];
  return (1 - m.ay) * (m.h / m.w) / m.hw;
}

/** Tezgah/teşhis. Bayt ölçümü tuval destek deposundan (w·h·4) türer. */
export function isleStats() {
  const bytes = (map) => {
    let b = 0;
    for (const arr of map.values()) for (const lv of arr) for (const c of lv) b += c.width * c.height * 4;
    return b;
  };
  const fb = bytes(full), tb = bytes(thumbs);
  return { pinned, full: [...full.keys()], thumbs: [...thumbs.keys()], rev,
           thumbW: THUMB_W,
           mbFull: +(fb / 1048576).toFixed(2), mbThumb: +(tb / 1048576).toFixed(2),
           mbTotal: +((fb + tb) / 1048576).toFixed(2) };
}
