/* ═══════════════════════════════════════════════════════════
   aiDetail.js — DÖŞENEN ZEMİN MALZEMESİ (AI pişirimi)
   ═══════════════════════════════════════════════════════════
   Sözleşme: bakeArenaMap'in DETAY katmanının yerine geçen hazır karo.
   Kompozisyon (makro), yol, nesne yerleşimi ve kor kimliği DEĞİŞMEDİ —
   bu dosya yalnız "yüzey neyden yapılmış" sorusunu cevaplar.

   ÜÇ KURAL BURADA YAŞIYOR:

   ① DETAY KATMANI KROMA TAŞIMAZ (arenaSurf kural ⑤). Ham AI karosu
      kendi rengini taşır; kroma MAKRODA yaşamak zorunda, yoksa on
      haritanın kimlik rengi tek bir "AI yeşili/grisi" altında erir.
      Kroma LİNEER uzayda kısılır (CHROMA), sRGB'de kısmak koyu
      pikselleri orantısız soldurur.

   ② mid, KISMADAN SONRA ölçülür. Şader detayı kendi lineer
      ortalamasına böler (uDetailMid); kroma kısması ortalamayı
      kaydırdığı için ham karodan okunan mid yanlış parlaklık verir.
      Ölçüm arenaMaps.linearMean ile BİREBİR aynı formüldür.

   ③ KARO BOYU DÜNYA PX'İDİR, doku çözünürlüğü değil. 900 dünya px
      (kullanıcı seçimi): 2048² karoda 2,28 örnek/px. Kademe düşükse
      doku yarıya iner, karo boyu DEĞİŞMEZ — yoksa aynı yüzey farklı
      telefonlarda farklı ölçekte okunur.
   ═══════════════════════════════════════════════════════════ */

/* PERF.JS SÜRÜM ETİKETİ OYUNUNKİYLE AYNI OLMAK ZORUNDA: farklı sorgu =
   farklı modül örneği = init edilmemiş ikinci bir Quality (ölçüldü: bu
   dosya "mid/tex 512" okurken oyun "high/tex 1024" idi, yani onaylanan
   2048²/900 karo sözleşmesi sahaya 1024²/450 olarak iniyordu). */
import { Quality } from './perf.js?v=20260930m';

/* Harita → karo. Yalnız pilotu geçmiş haritalar burada; tabloda
   olmayan harita PROSEDÜREL yüzeyinde kalır (tek satır ekleyerek
   geçilir, başka hiçbir yere dokunmadan).

   SÜRÜM EKİ ZORUNLUDUR (doğrulama bulgusu, v32): karo `fetch(url,
   { cache: 'force-cache' })` ile indirilir — bu, baytları YENİDEN
   DOĞRULAMADAN önbellekten servis eder. Dosya adı değişmezse yeniden
   tasarlanan bir yüzey, karoyu bir kez indirmiş oyuncuya HİÇ ulaşmaz
   (aynı tuzak ölçümde de yakalandı: tezgah eski baytları okuyup yeni
   yüzeyi ölçtüğünü sanıyordu). Bir karo değiştiğinde YALNIZ o satırın
   eki artırılır — dokunulmayan yüzeyler yeniden indirilmez. */
const TABLE = {
  mezarlik: 'mezarlik_a.png',
  kul: 'kul_a.png',
  bataklik: 'bataklik.png',
  katedral: 'katedral.png?v=20260909',
  hiclik: 'hiclik.png',
  gokada: 'gokada.png',
  tuzla: 'tuzla.png?v=20260909',
  buzul: 'buzul.png?v=20260909',
  kemikbahce: 'kemikbahce.png?v=20260909',
  gokcark: 'gokcark.png',
};

const CHROMA = 0.35;     // detayın kroma payı (kural ①)
const REF_POT = 2048;   // referans doku
const REF_TILE = 900;   // referans karo, dünya px (kullanıcı seçimi)
const SPP = REF_POT / REF_TILE;   // 2,276 örnek/px — kademeler arası SABİT (kural ③)

const cache = new Map();     // id → { canvas, mid, tile } · EKLEME SIRALI (LRU)
const inflight = new Map();  // id → Promise (aynı karo iki kez indirilmez)

/* HAZIRLANMIŞ KARO SAYISI SINIRLIDIR — BU BİR VRAM/RAM SÖZLEŞMESİDİR.
   Her hazır karo 2048²×4 = 16 MB destek deposu tutar; on karo 168 MB
   eder ve orta sınıf telefonda sekme öldürür. Oyuncu bir görevde TEK
   harita görür: 2 (şu anki + bir yedek) yeter. Atılan karo baytları
   HTTP/SW önbelleğinde kalır, yani geri gelmesi ağ değil yalnız çözme
   maliyetidir ve perde arkasında olur. */
const KEEP = 2;
let pinned = null;   // KULLANIMDA olan karo — asla tahliye edilmez

/** Map ekleme sırasını LRU olarak kullan: dokunulan kayıt sona taşınır. */
function touch(id) {
  const v = cache.get(id);
  if (v === undefined) return v;
  cache.delete(id);
  cache.set(id, v);
  return v;
}

/* Destek deposu REFERANS DÜŞÜRMEKLE BIRAKILMAZ: GC'yi beklemek bellek
   tepesini olduğu yerde tutar. width/height = 0 anında bırakır
   (arenaMaps tezgahının kendi dersi).

   AMA CANLI YÜZEY TAHLİYE EDİLEMEZ (doğrulama bulgusu): oynanmakta olan
   haritanın tuvali `THREE.CanvasTexture`in KAYNAĞIDIR. Ölçüldü: üç harita
   hazırlanınca en eski kayıt atıldı ve `game.arenaDetail` **[0,0]** oldu —
   ekranda o an duran doku GPU'da yaşamaya devam ettiği için kusur SESSİZ,
   ama bağlam kaybı kurtarması (render3d._recover) dokuyu yeniden yükleyince
   zemin detayı boş döner ve `_lastDetailCanvas` aynı (boş) tuvali
   gösterdiği için bir daha kurulmaz. Bir önbellek, kayıtlarının D I Ş
   dünyada canlı olup olmadığını bilmek zorunda. */
function evict() {
  if (cache.size <= KEEP) return;
  for (const id of Array.from(cache.keys())) {
    if (cache.size <= KEEP) break;
    if (id === pinned) continue;              // canlı yüzey korunur
    const v = cache.get(id);
    cache.delete(id);
    if (v && v.canvas) { v.canvas.width = 0; v.canvas.height = 0; }
  }
}

/* sRGB → lineer, 256 girişli tablo (piksel döngüsünde pow yok) */
const S2L = new Float32Array(256);
for (let i = 0; i < 256; i++) {
  const v = i / 255;
  S2L[i] = v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
}
/* lineer → sRGB, 1024 girişli tablo + doğrusal aradeğerleme */
const L2S = new Uint8Array(1025);
for (let i = 0; i <= 1024; i++) {
  const v = i / 1024;
  const s = v <= 0.0031308 ? v * 12.92 : 1.055 * v ** (1 / 2.4) - 0.055;
  L2S[i] = Math.max(0, Math.min(255, Math.round(s * 255)));
}
const enc = (v) => L2S[v <= 0 ? 0 : v >= 1 ? 1024 : (v * 1024 + 0.5) | 0];

/* arenaMaps.linearMean ile AYNI formül: 0,299/0,587/0,114 ağırlıklı
   lineer luma ortalaması. İki yerde iki farklı ortalama yaşarsa
   prosedürel ve AI yüzeyler farklı parlaklıkta çıkar.

   TABAN 0,004 — 0,02 DEĞİL (ölçüldü): normalizasyonun tüm amacı şaderin
   detayı KENDİ ortalamasına bölmesi. Taban gerçek ortalamanın üstüne
   çıkarsa yüzey olduğundan koyu çıkar; bataklık karosu tam bunu yaptı
   (gerçek ~0,015, taban 0,02 → zemin sessizce kararıyordu). Taban yalnız
   sıfıra bölmeyi engellemek içindir, parlaklık politikası değildir. */
function linearMean(data) {
  let s = 0, n = 0;
  for (let i = 0; i < data.length; i += 4 * 7) {
    s += S2L[data[i]] * 0.299 + S2L[data[i + 1]] * 0.587 + S2L[data[i + 2]] * 0.114;
    n++;
  }
  return n ? Math.max(0.004, s / n) : 0.216;
}

function prepare(img) {
  /* Kademe dokuyu yarıya indirebilir; karo da aynı oranda iner ki
     örnek/px sabit kalsın (kural ③ — ölçülmüş ders). */
  const cap = Quality.budget('tex') >= 1024 ? 2048 : 1024;
  const S = Math.min(cap, img.naturalWidth || img.width);  const c = document.createElement('canvas');
  c.width = S; c.height = S;
  const g = c.getContext('2d', { willReadFrequently: true });
  g.imageSmoothingQuality = 'high';
  g.drawImage(img, 0, 0, S, S);

  const px = g.getImageData(0, 0, S, S);
  const d = px.data;
  for (let i = 0; i < d.length; i += 4) {
    const r = S2L[d[i]], gg = S2L[d[i + 1]], b = S2L[d[i + 2]];
    const y = r * 0.2126 + gg * 0.7152 + b * 0.0722;
    d[i] = enc(y + (r - y) * CHROMA);
    d[i + 1] = enc(y + (gg - y) * CHROMA);
    d[i + 2] = enc(y + (b - y) * CHROMA);
  }
  g.putImageData(px, 0, 0);
  /* mid kısmadan SONRA (kural ②), karo dokudan türer (kural ③) */
  return { canvas: c, mid: linearMean(d), tile: Math.round(S / SPP) };
}

function load(url) {
  /* DEKOD ANA İPLİKTE YAPILMAZ. Ölçüldü: `new Image()` + `decoding:'sync'`
     ile bir karonun hazırlanması 1315-1688 ms sürüyordu ve perde kapısı
     1800 ms — yavaş bir telefonda harita sessizce prosedürele düşerdi.
     `createImageBitmap` çözmeyi ayrı iplikte yapar; ayrıca 'force-cache'
     ile baytlar boş zamanda ısıtılmışsa ağ payı sıfırdır. */
  return fetch(url, { cache: 'force-cache' })
    .then((r) => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.blob(); })
    .then((b) => (window.createImageBitmap ? createImageBitmap(b) : new Promise((res, rej) => {
      const im = new Image();
      im.onload = () => res(im);
      im.onerror = () => rej(new Error('yüklenemedi: ' + url));
      im.src = URL.createObjectURL(b);
    })));
}

/** Açılış ekranında bir kez çağrılır. Hiçbir zaman reddetmez:
    yüklenmeyen karo sessizce prosedürel yüzeye düşer.

    ON KARO AÇILIŞTA DEĞİL, İSTENDİĞİNDE YÜKLENİR: iki karo 1246 ms
    tuttuğuna göre on karo açılışı ~6 sn uzatırdı ve oyuncu bir görevde
    tek harita görür. `only` verilirse yalnız o haritalar pişer. */
export function preloadAiDetail(only) {
  const ids = only ? [].concat(only).filter((id) => TABLE[id]) : Object.keys(TABLE);
  const jobs = ids.map(async (id) => {
    if (cache.has(id) || inflight.has(id)) return inflight.get(id);
    const p = (async () => {
      try {
        const url = new URL('assets/terrain/' + TABLE[id], import.meta.url).href;
        cache.set(id, prepare(await load(url)));
        evict();
      } catch (e) {
        console.warn('[aiDetail] ' + id + ' prosedürel yüzeyde kaldı:', e.message);
      } finally {
        inflight.delete(id);
      }
    })();
    inflight.set(id, p);
    return p;
  });
  return Promise.all(jobs);
}

/** Senkron arama — bakeArenaMap'in içinden çağrılır.
    null dönerse çağıran prosedürel detayı pişirir.

    KULLANIM = PİN: bir karo bakeArenaMap tarafından tüketildiği anda
    canlı yüzey olur (sahnedeki CanvasTexture'ın kaynağı). Pin değişince
    eski pin yeniden tahliyeye uygun hale gelir. */
export function aiDetail(id) {
  const v = touch(id);
  if (!v) return null;
  pinned = id;
  evict();
  return v;
}

/** Baytları ısıt: indirir ve HTTP/SW önbelleğine koyar, ÇÖZMEZ.
    Boş zamanda on karo için çağrılır — 168 MB'lık tuval yığını
    kurmadan, sonraki haritanın açılışını ağ beklemesinden kurtarır. */
export function warmAiDetailBytes() {
  return Promise.all(Object.keys(TABLE).map((id) => {
    const url = new URL('assets/terrain/' + TABLE[id], import.meta.url).href;
    return fetch(url, { cache: 'force-cache' }).catch(() => {});
  }));
}

/** Karo sahada hazır mı? (bakeArena SENKRON olduğu için çağıranın
    beklemesi gerekip gerekmediğini bilmesi gerekir.) */
export function aiDetailReady(id) {
  return cache.has(id) || !TABLE[id];
}

/** Tezgahlar için: tablo ve sabitler tek yerde yaşar. */
export const AI_DETAIL_INFO = {
  TABLE, CHROMA, REF_TILE, SPP, KEEP,
  get pinned() { return pinned; },
  get cached() { return Array.from(cache.keys()); },
  get bytes() {
    let b = 0;
    for (const v of cache.values()) b += v.canvas.width * v.canvas.height * 4;
    return b;
  },
};
