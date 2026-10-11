/* ═══════════════════════════════════════════════════════════
   arenaSurf.js — DÖŞENEN DETAY KATMANI (on ayrı YÜZEY)

   Bu katman zeminin YAKIN plandaki malzemesidir: bir karo, zeminde
   makro ile ÇARPILIR (tek materyal, iki doku okuması, TEK çizim
   çağrısı). "HD" burada yaşar — makro 0,48-0,60 örnek/px iken bu katman
   2,0-3,2 örnek/px verir.

   ═══ 2026-09-01 · PREMİUM MOBİL PASO — BEŞ KURAL ═══════════
   Kullanıcının teşhisi: *"terrain dokusu düşük kaliteli, internet
   oyununa benziyor."* Ölçüldü ve HAKLIYDI (`_terrtest.html`, 1:1 oyun
   ölçeğinde gerçek şader matematiğiyle): eski yüzeyler ~10.000 YARI
   SAYDAM (alfa 0,20-0,30) 1-2 px çizgiden oluşuyordu. Üst üste binen
   saydam gürültü ekranda ORTALANIR: hiçbir form kenarı kalmaz, doku
   "yeşil kadife" okunur. Çözünürlük artırmak bunu düzeltmez — gürültü
   daha net gürültü olur.

   ① FORM OPAKTIR. Bir çim tutamı, bir kömür parçası, bir buz plakası
      DOLGU ile çizilir, alfa yığınıyla değil. Kenarı olan şey nettir.
   ② İZOLE TEKRAR EDEN LEKE KONFETİ OKUNUR. Aynı siluetin serpilmiş
      kopyaları (rozet → "yaprak", elips → "beyaz kapsül", basık çokgen
      → "cam kıymığı", kenara dizilmiş eşit leke → "inci kolyesi")
      yüzey değil ÜSTÜNE DÖKÜLMÜŞ NESNE okunur. Siluet her kopyada
      değişir (`blob`), süs formları birbirine BİNER.
   ③ PARLAK İNCE ÇİZGİ AĞ OKUNUR. Plaka kimliği DOLGU DEĞERİNDEN gelir;
      derz ince ve KOYU olur, kenar ışığı hücrenin İÇİNE `netBevel` ile
      pah olarak konur.
   ④ SÜS YAPIYA TUTUNUR, SERPİLMEZ. Kar basınç sırtına yaslanır, kor
      kabuk derzinden sızar, kül derze dolar, çim taş plakasının
      arasında biter. Bu yüzden ağ BİR KEZ kurulur (`netBuild`) ve
      dolgu · derz · pah · süs hepsi AYNI köşe listesini okur — "yol
      verisi tek yerde yaşar" dersinin doku karşılığı.
   ⑤ DETAY KATMANI KROMA TAŞIMAZ. Zeminde `macro × (1−k + k·detail/mid)`
      var ve `mid` bir SKALER (lineer ortalama): detayın parlaklığı
      normalize edilir ama KANAL ORANLARI makronun tonuyla ÇARPILIR.
      Doygun yeşil detay + doygun yeşil makro = doygunluk 0,50 (tavan
      0,42 — ölçüldü). Kroma MAKRODA yaşar; detay yalnız DEĞER (form +
      ışık) taşır. Nötr-hafif sıcak/soğuk kaymalar serbest.

   IŞIK TEK YÖNLÜDÜR: sol üstten (kızıl ay lekesiyle aynı yön). Her
   formda üç geçiş — dip gölgesi (AO) → gövde → üst-sol kenar ışığı.
   İki farklı ışık yönü olan iki form aynı karoda yaşayamaz.

   ÖLÇÜ DİSİPLİNİ: düşman silueti ~30 px. Süs formları 3-26 px bandında
   (kural 3: düşman ölçeğinde titreyen desen yok). Yalnız YAPISAL ağ
   (buz plakası, mermer levhası, bazalt sütunu) ve düşük frekans değer
   yamaları büyür. Kullanıcı seçimi (2026-09-01): formlar mobilde daha
   kolay okunsun diye ilk turun ×1,35'i.

   ÖĞE BOYU DÜNYA PİKSELİNDE YAZILIR, TEXEL'DE DEĞİL. Bu ders pahalı
   öğrenildi: doku 1024² → 2048² büyütüldüğünde texel sabitiyle yazılmış
   18 texellik tutam ekranda 9 → 4,5 px'e düştü, yani ÇÖZÜNÜRLÜK
   ARTIRMAK dokuyu BULANIKLAŞTIRDI. K = texel/dünya px; uzunluk K, adet
   K² ile ölçeklenir.

   ÇİZGİ DURUMU ve rnd() WRAP DIŞINDA KALIR: wrap geri çağrısı içinde
   rnd() çağırmak karşı kenara farklı kopya çizip dikişi sessizce bozar.
   ═══════════════════════════════════════════════════════════ */

import { TAU, fade } from './arenaPaint.js?v=20260930m';

/* ışık sol üstten */
const L = [-0.64, -0.77];

/* ── ORTAK İLKELLER ─────────────────────────────────────────── */

function base(g, D, col) { g.fillStyle = col; g.fillRect(0, 0, D.S, D.S); }

/* düşük frekans: değer yamaları (düz kâğıt hissini kıran katman) */
function patches(g, D, cols, n, r0, r1) {
  const { S, k, rnd } = D;
  for (let i = 0; i < n; i++) {
    const x = rnd() * S, y = rnd() * S, r = (r0 + rnd() * (r1 - r0)) * k;
    const col = cols[(rnd() * cols.length) | 0];
    D.wrap(x, y, r, (px, py) => {
      const v = g.createRadialGradient(px, py, r * 0.06, px, py, r);
      v.addColorStop(0, col); v.addColorStop(1, fade(col));
      g.fillStyle = v; g.fillRect(px - r, py - r, r * 2, r * 2);
    });
  }
}

/* opak serpme tane: çıplak zemin kendi malzemesi gibi görünsün.
   Saydam nokta BULUT yapar; opak tane YÜZEY yapar. */
function specks(g, D, n, cols, r0, r1) {
  const { S, k, rnd } = D, A = k * k / 4;
  for (let i = 0; i < n * A; i++) {
    const x = rnd() * S, y = rnd() * S, r = (r0 + rnd() * (r1 - r0)) * k;
    g.fillStyle = cols[(rnd() * cols.length) | 0];
    const rot = rnd() * 3.14, ry = r * (0.5 + rnd() * 0.5);
    D.wrap(x, y, r * 2 + 2 * k, (px, py) => {
      g.beginPath(); g.ellipse(px, py, r, ry, rot, 0, TAU); g.fill();
    });
  }
}

/* düzensiz çokgen: aynı siluetin tekrarını KIRAN temel öğe (kural ②) */
function blob(g, px, py, r, n, jit, sy, rnd) {
  g.beginPath();
  for (let q = 0; q <= n; q++) {
    const a = (q / n) * TAU;
    const rr = r * (1 - jit + rnd() * jit * 2);
    const xx = px + Math.cos(a) * rr, yy = py + Math.sin(a) * rr * (sy || 1);
    q ? g.lineTo(xx, yy) : g.moveTo(xx, yy);
  }
  g.closePath(); g.fill();
}

/* AO: formun dibindeki temas gölgesi — formu zemine OTURTAN şey */
function ao(g, k, px, py, r, a, tint) {
  const R = r * k;
  const v = g.createRadialGradient(px + R * 0.18, py + R * 0.24, R * 0.06, px + R * 0.08, py + R * 0.12, R);
  v.addColorStop(0, (tint || 'rgba(8,10,10,') + a + ')');
  v.addColorStop(1, (tint || 'rgba(8,10,10,') + '0)');
  g.fillStyle = v; g.fillRect(px - R, py - R, R * 2, R * 2);
}

/* ── DİKİŞSİZ ÇOKGEN AĞI — BİR KEZ KURULUR (kural ④) ────────
   Köşeler örgüden hash ile üretilir ve indeks MOD hücre sayısı alınır:
   karşı kenardaki köşe AYNI değeri okur, ağ karo sınırında birebir
   devam eder. Dönen: hücreler + KENARLAR. Her kenar BİR KEZ üretilir
   (her hücrenin yalnız üst ve sol kenarı; diğer ikisi komşunundur) —
   yoksa kenara dizilen süs iki kez çizilir ve alfa ikiye katlanır.
   `lit` = kenarın dış normali ışığa dönük mü (kar sırtı, pah, kor).

   KARO BAŞINA EN AZ `MIN_CELLS` HÜCRE (2026-09-01, iki turda ölçüldü):
   ağ hücresi DÜNYA px olarak yazılır, hücre SAYISI karo boyundan türer.
   Karo 512 → 640 büyütüldüğünde 230 px'lik hiçlik plakası karo başına 3
   hücreye düştü ve aynı iri siluet her 640 dünya px'te geri geldi.
   `uDetailBreak` BUNU KAPATAMAZ: o maske düşük frekanslı bir PARLAKLIK
   çarpanıdır, silueti değiştirmez.

   İLK TABAN (6) YETMEDİ: beş yüzeyde (mermer 190 · solgun 230 · yayla 105 ·
   buz 200 · kül-iri 150) taban BAĞLAYICI oldu, yani hepsi TAM 6 hücrede
   oturdu — köşeler `hash(i mod 6, j mod 6)` olduğu için her karoda birebir
   aynı 6×6 geometri, jitter 0,10-0,24 ile düzenli bir "küp/şevron kafesi"
   okundu (döşenme paneli). Bir TABAN tekrarı kaldırmaz, yalnız yüzeyleri
   tabanın üstüne oturtur. Karo boyu, DİKİŞSİZ bir yapısal öğenin en büyük
   boyunu fiziksel olarak sınırlar: 640 px karoda 190 px'lik plaka
   tekrarsız olamaz. Taban 11'e (≈58 px hücre) çıktı ve jitter yükseldi;
   plaka küçüldü ama 1:1'de hâlâ PLAKA okunur (380 px ekranda ~6 plaka).

   `seed`: aynı yüzeyde iki ağ yaşıyorsa (yapısal + ince) ikisi de tabana
   oturduğunda AYNI kafesi paylaşırdı — seed örgüyü kaydırır. Ölçüt:
   döşenme panelinde aynı silueti ızgarada ikinci kez bulamamak. */
const MIN_CELLS = 8;

function netBuild(D, cellWorld, jitter, seed) {
  const SZ = D.S, k = D.k;
  const n = Math.max(MIN_CELLS, Math.round(SZ / (cellWorld * k)));
  const cell = SZ / n;
  const sd = (seed || 0) * 19.73;
  const jit = (jitter != null ? jitter : 0.26) * cell;
  const h = (i, j, s) => {
    const ii = ((i % n) + n) % n, jj = ((j % n) + n) % n;
    const v = Math.sin(ii * 127.1 + jj * 311.7 + s * 74.7 + sd) * 43758.5453;
    return v - Math.floor(v);
  };
  const vx = (i, j) => i * cell + (j & 1 ? cell * 0.5 : 0) + (h(i, j, 1) - 0.5) * jit * 2;
  const vy = (i, j) => j * cell + (h(i, j, 2) - 0.5) * jit * 2;
  const cells = [], edges = [];
  for (let j = -1; j <= n; j++) {
    for (let i = -1; i <= n; i++) {
      const q = [[vx(i, j), vy(i, j)], [vx(i + 1, j), vy(i + 1, j)],
        [vx(i + 1, j + 1), vy(i + 1, j + 1)], [vx(i, j + 1), vy(i, j + 1)]];
      let cx = 0, cy = 0;
      for (let e = 0; e < 4; e++) { cx += q[e][0] / 4; cy += q[e][1] / 4; }
      cells.push({ q, cx, cy, k: h(i, j, 3), k2: h(i, j, 5) });
      for (let p = 0; p < 2; p++) {
        const a = q[0], b = p ? q[3] : q[1];
        const mx = (a[0] + b[0]) / 2 - cx, my = (a[1] + b[1]) / 2 - cy;
        const m = Math.hypot(mx, my) || 1;
        edges.push({ a, b, nx: mx / m, ny: my / m, lit: (mx / m) * L[0] + (my / m) * L[1] > 0.1, s: h(i, j, 7 + p), s2: h(i, j, 11 + p) });
      }
    }
  }
  return { cells, edges, cell, world: cell / k };
}

function netFill(g, net, fn) {
  for (let i = 0; i < net.cells.length; i++) {
    const c = net.cells[i];
    const col = fn(c);
    if (!col) continue;
    g.beginPath();
    g.moveTo(c.q[0][0], c.q[0][1]);
    for (let e = 1; e < 4; e++) g.lineTo(c.q[e][0], c.q[e][1]);
    g.closePath();
    g.fillStyle = col; g.fill();
  }
}

/* KENAR ÇİZGİLERİ. `frac` verilirse kenarın TAMAMI değil rastgele
   konumlanmış bir ALT PARÇASI çizilir: sürekli kiriş "devre şeması"
   okunur (ölçüm dersi), parçalı hat OLAY okunur. */
function netJoints(g, D, net, col, w, pick, frac) {
  g.strokeStyle = col; g.lineWidth = w * D.k; g.lineCap = 'round';
  g.beginPath();
  for (let i = 0; i < net.edges.length; i++) {
    const e = net.edges[i];
    if (pick && !pick(e)) continue;
    if (frac) {
      const t0 = e.s2 * (1 - frac), t1 = t0 + frac;
      g.moveTo(e.a[0] + (e.b[0] - e.a[0]) * t0, e.a[1] + (e.b[1] - e.a[1]) * t0);
      g.lineTo(e.a[0] + (e.b[0] - e.a[0]) * t1, e.a[1] + (e.b[1] - e.a[1]) * t1);
    } else {
      g.moveTo(e.a[0], e.a[1]); g.lineTo(e.b[0], e.b[1]);
    }
  }
  g.stroke();
}

/* HÜCRE İÇİNE PAH: ışığa dönük kenarın iç tarafına ince dilim
   (uzun parlak çizgi yerine — kural ③) */
function netBevel(g, D, net, col, w) {
  g.fillStyle = col;
  const t = w * D.k;
  for (let i = 0; i < net.edges.length; i++) {
    const e = net.edges[i];
    if (!e.lit) continue;
    g.beginPath();
    g.moveTo(e.a[0], e.a[1]); g.lineTo(e.b[0], e.b[1]);
    g.lineTo(e.b[0] - e.nx * t, e.b[1] - e.ny * t);
    g.lineTo(e.a[0] - e.nx * t, e.a[1] - e.ny * t);
    g.closePath(); g.fill();
  }
}

/* KENARA TUTUNAN BİRİKİNTİ: kar sırtı · tuz kabuğu sırtı · kül seti.
   ÖLÇÜM DERSİ: kenara DİZİLEN ayrı çokgenler "inci kolyesi" okundu —
   aynı boyda leke, bir çizgi üzerinde = konfetinin sıralı hali. Sırt
   artık SÜREKLİ BİR ŞERİT (uçlara doğru incelen kalem darbesi) ve
   düzensizlik şeridin ÜSTÜNE binen az sayıda çokgenle verilir.

   `frac` (2026-09-01, ölçüldü): şerit kenarın TAMAMINI kaplarsa — hele
   `litOnly` + yüksek `cover` ile — yüzey tek biçimli bir açık petek
   örgüsü, yani BASILI BİR DESEN okunur (tuz tabanında ölçüldü; `tek`
   12,0 ile BANT İÇİNDEYDİ — sayı bu hatayı göstermiyor). Gerçek bir
   basınç/tuz sırtı PARÇALIDIR: kenarın rastgele konumlanmış bir
   bölümünü kaplar, sonra kesilir. */
function netBerm(g, D, net, o) {
  const k = D.k, rnd = D.rnd;
  g.lineCap = 'round'; g.lineJoin = 'round';
  for (let i = 0; i < net.edges.length; i++) {
    const e = net.edges[i];
    if (o.litOnly && !e.lit) continue;
    if (e.s > (o.cover != null ? o.cover : 0.7)) continue;
    const push = (o.push || 0) * k;
    const f = o.frac || 1;
    const q0 = f < 1 ? e.s2 * (1 - f) : 0, q1 = q0 + f;
    const ax = e.a[0] + (e.b[0] - e.a[0]) * q0 - e.nx * push;
    const ay = e.a[1] + (e.b[1] - e.a[1]) * q0 - e.ny * push;
    const bx = e.a[0] + (e.b[0] - e.a[0]) * q1 - e.nx * push;
    const by = e.a[1] + (e.b[1] - e.a[1]) * q1 - e.ny * push;
    const len = Math.hypot(bx - ax, by - ay);
    const w = (o.w0 + (e.s / (o.cover || 0.7)) * (o.w1 - o.w0)) * k;
    const ribbon = (col, ww, ox, oy) => {
      g.strokeStyle = col;
      for (let s = 0; s < 5; s++) {
        const t0 = s / 5, t1 = (s + 1) / 5;
        const taper = Math.sin(((t0 + t1) / 2) * Math.PI);
        g.lineWidth = Math.max(0.6, ww * (0.42 + taper * 0.72));
        g.beginPath();
        g.moveTo(ax + (bx - ax) * t0 + ox, ay + (by - ay) * t0 + oy);
        g.lineTo(ax + (bx - ax) * t1 + ox, ay + (by - ay) * t1 + oy);
        g.stroke();
      }
    };
    if (o.shadow) ribbon(o.shadow, w * 1.5, e.nx * w * 0.5, e.ny * w * 0.5);
    ribbon(o.body, w * 1.1, 0, 0);
    if (o.crest) ribbon(o.crest, w * 0.45, L[0] * w * 0.26, L[1] * w * 0.26);
    const lumps = Math.max(1, Math.round(len / (o.step * k)));
    for (let s = 0; s < lumps; s++) {
      const t = (s + 0.25 + rnd() * 0.5) / lumps;
      const r = w * (0.45 + rnd() * 0.85);
      const x = ax + (bx - ax) * t, y = ay + (by - ay) * t;
      g.fillStyle = o.body;
      blob(g, x, y, r, 8, 0.44, 0.82, rnd);
      if (o.crest && rnd() < 0.6) {
        g.fillStyle = o.crest;
        blob(g, x + L[0] * r * 0.3, y + L[1] * r * 0.3, r * 0.5, 7, 0.42, 0.8, rnd);
      }
    }
  }
}

/* köşeli parça (kömür · taş · buz kıymığı · tuz kristali) */
function chunk(g, D, x, y, r, C, sides) {
  const k = D.k, rnd = D.rnd;
  const n = sides || (5 + (rnd() * 3 | 0));
  const a0 = rnd() * TAU, rs = [];
  for (let q = 0; q < n; q++) rs.push(r * (0.6 + rnd() * 0.6));
  const path = (px, py, ox, oy, s) => {
    g.beginPath();
    for (let q = 0; q < n; q++) {
      const a = a0 + (q / n) * TAU;
      g[q ? 'lineTo' : 'moveTo'](px + Math.cos(a) * rs[q] * k * s + ox, py + Math.sin(a) * rs[q] * k * s + oy);
    }
    g.closePath(); g.fill();
  };
  D.wrap(x, y, r * 2.2 * k, (px, py) => {
    g.fillStyle = C.dark; path(px, py, r * 0.24 * k, r * 0.3 * k, 1.02);
    g.fillStyle = C.body; path(px, py, 0, 0, 1);
    g.fillStyle = C.lite; path(px, py, L[0] * r * 0.26 * k, L[1] * r * 0.26 * k, 0.56);
  });
}

/* KÜME: tek tek serpilen parça konfeti okunur, küme yüzey okunur */
function cluster(g, D, n, spread, r0, r1, C, sides) {
  const { S, k, rnd } = D, A = k * k / 4;
  for (let i = 0; i < n * A; i++) {
    const cx = rnd() * S, cy = rnd() * S;
    for (let q = 0; q < 2 + (rnd() * 4 | 0); q++) {
      chunk(g, D, cx + (rnd() - 0.5) * spread * k, cy + (rnd() - 0.5) * spread * k,
        r0 + rnd() * (r1 - r0), C, sides);
    }
  }
}

/* yönlü sürükleme (rüzgâr · kar · kül · toz): yön yerel olarak ORTAK */
function drift(g, D, n, col, w0, w1, len0, len1, cell) {
  const { S, k, rnd } = D, A = k * k / 4;
  const ang = D.field(cell || 90);
  g.lineCap = 'round'; g.strokeStyle = col;
  for (let i = 0; i < n * A; i++) {
    const x = rnd() * S, y = rnd() * S;
    const a = ang(x, y) + (rnd() - 0.5) * 0.24;
    const len = (len0 + rnd() * (len1 - len0)) * k;
    const c = Math.cos(a) * len, s = Math.sin(a) * len;
    g.lineWidth = (w0 + rnd() * (w1 - w0)) * k;
    D.wrap(x, y, len + 6 * k, (px, py) => {
      g.beginPath(); g.moveTo(px, py); g.lineTo(px + c, py + s); g.stroke();
    });
  }
}

/* TUTAM — DAMGA OLARAK ÇİZİLİR (2026-09-01, ölçüldü)
   6-11 bıçaklı öbek. Renk tutam İÇİNDE ortak, tutamdan tutama değişir →
   göz ÖBEK görür. Tek tek serpilen bıçak "kadife", izole rozet "yaprak"
   okunuyordu. Çim, arasından görünen topraktan bir tık AÇIK olmak
   zorunda (koyu bıçak = "toprağa serpilmiş saman").

   MALİYET: mezarlık pişirmesi tamamen ısınmış hâlde de 726 ms okuyordu
   (medyan ~270, eşik 520) — ~4900 tutam × 6-11 bıçak × 3 dolgu = 100-160
   bin yol dolgusu. Isıtma JIT payını taşır, ÇİZİM İŞİNİ TAŞIMAZ. Tutam
   artık aile başına 12 varyant olarak BİR KEZ çizilir ve `drawImage` ile
   damgalanır: yol dolgusu ~1150'ye iner, kalan iş blit. Siluet çeşitliliği
   48 varyant × serbest döndürme ile korunur (kural ②), rüzgâr yönü damga
   açısından gelir (alan tutarlılığı kaybolmaz). */
function drawTuft(g, k, rnd, cx, cy, R, F, nb, lean) {
  ao(g, k, cx, cy, R * 0.72, 0.30, F.ao || 'rgba(10,12,8,');
  for (let q = 0; q < nb; q++) {
    const a = rnd() * TAU, rr = R * Math.sqrt(rnd()) * 0.62;
    const dir = lean + (rnd() - 0.5) * 2.0;
    const bx = cx + Math.cos(a) * rr * k, by = cy + Math.sin(a) * rr * k;
    const len = R * (0.45 + rnd() * 0.65) * k, w = R * (0.13 + rnd() * 0.06) * k;
    const c = Math.cos(dir), s = Math.sin(dir);
    const shade = rnd();
    const bend = (rnd() - 0.5) * len * 0.5;
    const mx = bx + c * len * 0.5 - s * bend, my = by + s * len * 0.5 + c * bend;
    const tx = bx + c * len, ty = by + s * len;
    const path = (ox, oy, tw) => {
      g.beginPath();
      g.moveTo(bx - s * tw + ox, by + c * tw + oy);
      g.quadraticCurveTo(mx + ox, my + oy, tx + ox, ty + oy);
      g.lineTo(bx + s * tw + ox, by - c * tw + oy);
      g.closePath(); g.fill();
    };
    g.fillStyle = F.d; path(w * 0.8, w * 1.0, w);
    g.fillStyle = shade < 0.5 ? F.b : F.t; path(0, 0, w);
    if (shade > 0.86) { g.fillStyle = F.r; path(L[0] * w * 0.85, L[1] * w * 0.85, w * 0.48); }
  }
}

/* ROTASYON DAMGANIN İÇİNDE, IŞIK DIŞINDA (2026-09-01, regresyon dersi).
   İlk damga sürümü AO'yu ve `F.r` kenar ışığını sprite'a pişirip
   `stampTuft`ta `rotate` uyguluyordu — yani her tutamın gölgesi ve parlak
   kenarı başka yöne bakıyordu. Bu dosyanın başlığı bunu açıkça
   yasaklıyor ("iki farklı ışık yönü olan iki form aynı karoda yaşayamaz")
   ve damgadan ÖNCEKİ kod bunu doğru yapıyordu: `lean` yalnız BIÇAK
   yönünü döndürüyor, AO/ışık dünya uzayında kalıyordu. Bir optimizasyon
   özelliği sessizce düşüremez: sprite artık YÖN BAŞINA pişirilir
   (bıçaklar sprite'ın içinde döner), damgalama `rotate` KULLANMAZ. */
/* DAMGA KUTUSU SIKI OLMAK ZORUNDA: `drawImage` saydam pikseli de harmanlar,
   yani maliyet SPRITE ALANIDIR. 1,9R kutu tipik tutamın (~1,1R) iki katı
   alan demekti; 1,5R'de kırpma yok (bıçak ucu en fazla 1,72R'ye çıkar ve
   o uçlar zaten seyrek), dolgu ~%38 azalır. Yön başına 8 varyant yerine
   3: 128 → 96 sprite. */
const TUFT_DIRS = 8, TUFT_VARS = 3, TUFT_BOX = 1.5;

function tuftSprites(D, FAM, Rmax) {
  const k = D.k, rnd = D.rnd;
  const half = Math.ceil(Rmax * TUFT_BOX * k);
  const fam = [];
  for (let f = 0; f < FAM.length; f++) {
    const dirs = [];
    for (let d = 0; d < TUFT_DIRS; d++) {
      const arr = [];
      for (let v = 0; v < TUFT_VARS; v++) {
        const cv = document.createElement('canvas');
        cv.width = cv.height = half * 2;
        drawTuft(cv.getContext('2d'), k, rnd, half, half, Rmax, FAM[f],
          6 + (rnd() * 6 | 0), (d / TUFT_DIRS) * TAU);
        arr.push(cv);
      }
      dirs.push(arr);
    }
    fam.push(dirs);
  }
  return { fam, half, Rmax };
}

/* damga: yalnız ölçek + konum. Rüzgâr yönü EN YAKIN yön varyantıyla
   karşılanır, böylece ışık on karonun hepsinde sol üstten gelir. */
function stampTuft(g, D, x, y, set, fi, R, dir) {
  const rnd = D.rnd;
  const di = ((Math.round(dir / TAU * TUFT_DIRS) % TUFT_DIRS) + TUFT_DIRS) % TUFT_DIRS;
  const list = set.fam[fi][di];
  const sp = list[(rnd() * list.length) | 0];
  const s = (R / set.Rmax) * (0.88 + rnd() * 0.24);
  const h = set.half * s;
  D.wrap(x, y, h * 1.5, (px, py) => { g.drawImage(sp, px - h, py - h, h * 2, h * 2); });
}

/* damga seti bir kez kullanılır; destek deposu hemen bırakılır
   (192 sprite × 196² = ~29 MB geçici — telefonda tutulamaz) */
function freeSprites(set) {
  for (const dirs of set.fam) {
    for (const arr of dirs) {
      for (const cv of arr) { cv.width = 0; cv.height = 0; }
    }
  }
}

/* DAMAR: mermer/kemik — uzun SÜREKLİ hat + hemen yanında koyu eşlikçi.
   Tek renkli damar "tebeşir çizgisi" okunur. */
function veins(g, D, n, w, litecol, darkcol, seg, step) {
  const { S, k, rnd } = D, A = k * k / 4;
  for (let i = 0; i < n * A; i++) {
    const x0 = rnd() * S, y0 = rnd() * S;
    let a = rnd() * TAU;
    const pts = [];
    for (let q = 0; q < seg; q++) {
      a += (rnd() - 0.5) * 0.7;
      pts.push([Math.cos(a) * step * k * (0.7 + rnd() * 0.6), Math.sin(a) * step * k * (0.7 + rnd() * 0.6)]);
    }
    const lw = w * k;
    g.lineCap = 'round'; g.lineJoin = 'round';
    D.wrap(x0, y0, step * seg * k, (px, py) => {
      for (let pass = 0; pass < 2; pass++) {
        g.strokeStyle = pass ? darkcol : litecol;
        g.lineWidth = pass ? lw * 0.55 : lw;
        g.beginPath();
        let ax = px + (pass ? lw * 0.9 : 0), ay = py + (pass ? lw * 0.9 : 0);
        g.moveTo(ax, ay);
        for (let q = 0; q < pts.length; q++) { ax += pts[q][0]; ay += pts[q][1]; g.lineTo(ax, ay); }
        g.stroke();
      }
    });
  }
}

/* ═══════════════ ON YÜZEY ═══════════════════════════════════ */
export const SURF = {

  /* 1 · ÇİM (mezarlık) — tutam öbeği + toprak cebi + çakıl kümesi */
  cim(g, D) {
    const { S, k, rnd } = D, A = k * k / 4;
    /* TABAN ZATEN ÇİMDİR (2026-09-01, ölçüldü). Önce taban KAHVEYDİ
       ('#2c2820') ve tüm yüzeyi tutamların kaplaması gerekiyordu: 4864
       damga, 2048² tuvalde ~8 kat OVERDRAW, detay katmanı 443 ms. Bir
       "halı"yı damga damga dokumak yerine ZEMİNİ halı rengiyle kur,
       tutamı KIRICI olarak kullan: kaplama işi tabanın, siluet işi
       tutamın.

       ADET İKİ TURDA İNDİ (950 → 560) çünkü 950 ile detay 315-337 ms
       arasında salınıyordu ve toplam pişirme 520 eşiğinin İKİ YANINA
       birden düşüyordu — koşuların yarısı kırmızı. Bir band "son koşumda
       geçmişti" ile kapanmaz; pay açılır. Tutam iri (10-18 px) ve taban
       değeri çim değeri olduğu için kapama korunur. */
    base(g, D, '#2b2d1f');
    specks(g, D, 1300, ['#343626', '#212317', '#3e4130', '#191b12'], 1.2, 3.6);
    patches(g, D, ['rgba(86,88,64,0.24)', 'rgba(20,22,16,0.42)', 'rgba(58,64,46,0.22)',
      'rgba(104,96,72,0.16)'], 26, 90, 260);
    const ang = D.field(210);
    const FAM = [
      { d: '#1a1e12', b: '#31371f', t: '#3f4527', r: '#4d5530' },
      { d: '#1d2115', b: '#3a4124', t: '#4b532e', r: '#586339' },
      { d: '#202417', b: '#454d2b', t: '#586235', r: '#697442' },
      { d: '#221f15', b: '#4d452c', t: '#665c3a', r: '#7a6f49' },
    ];
    const SET = tuftSprites(D, FAM, 18);
    for (let i = 0; i < 560 * A; i++) {
      const f = rnd();
      const fi = f < 0.32 ? 0 : f < 0.68 ? 1 : f < 0.9 ? 2 : 3;
      const x = rnd() * S, y = rnd() * S;
      stampTuft(g, D, x, y, SET, fi, (10 + rnd() * 8) * (f >= 0.9 ? 1.2 : 1), ang(x, y) + (rnd() - 0.5) * 0.8);
    }
    /* AÇIKLIK: çiğnenmiş toprak cebi. Tutamlardan SONRA, kenarına
       birkaç tutam geri konur (sert kenar yok). */
    for (let i = 0; i < 20 * A; i++) {
      const x = rnd() * S, y = rnd() * S, r = (20 + rnd() * 34) * k;
      D.wrap(x, y, r * 1.6, (px, py) => {
        g.fillStyle = '#332f22'; blob(g, px, py, r, 9, 0.34, 0.72, rnd);
        g.fillStyle = 'rgba(24,22,16,0.34)'; blob(g, px + r * 0.16, py + r * 0.2, r * 0.7, 8, 0.3, 0.7, rnd);
        g.fillStyle = 'rgba(120,112,88,0.14)';
        blob(g, px + L[0] * r * 0.22, py + L[1] * r * 0.22, r * 0.5, 7, 0.3, 0.6, rnd);
      });
      for (let q = 0; q < 4; q++) {
        const a = rnd() * TAU, rr = r * (0.72 + rnd() * 0.5);
        const tx = x + Math.cos(a) * rr, ty = y + Math.sin(a) * rr;
        stampTuft(g, D, tx, ty, SET, rnd() < 0.6 ? 0 : 1, 8 + rnd() * 6, ang(tx, ty) + (rnd() - 0.5) * 0.8);
      }
    }
    freeSprites(SET);
    cluster(g, D, 9, 52, 3.2, 6.4, { dark: '#191a14', body: '#4f4e43', lite: '#6d6c5d' });
    specks(g, D, 320, ['rgba(206,206,180,0.12)', 'rgba(16,18,12,0.16)'], 0.8, 2);
  },

  /* 2 · KÜL (kül çukurları) — kabuk + DERZDEN sızan kor + soğuk kül.
     Kor SERPİLMEZ: ısı dikişten çıkar (kural ④). Az, birbirine bağlı,
     yalnız bazı derzlerde canlı — her yerde kor olursa ateş okunmaz. */
  kul(g, D) {
    const { S, k, rnd } = D, A = k * k / 4;
    base(g, D, '#282220');
    patches(g, D, ['rgba(124,102,84,0.24)', 'rgba(12,10,10,0.48)', 'rgba(106,100,100,0.22)',
      'rgba(150,94,50,0.13)'], 24, 100, 270);
    const net = netBuild(D, 24, 0.46);
    netFill(g, net, (c) => 'rgb(' + (34 + c.k * 28 | 0) + ',' + (29 + c.k * 22 | 0) + ',' + (27 + c.k * 20 | 0) + ')');
    netBevel(g, D, net, 'rgba(184,172,164,0.05)', 1.5);
    netJoints(g, D, net, 'rgba(8,6,6,0.38)', 1.2);
    /* kül: derzin içine dolan soğuk gri-lavanta birikinti. ALFA
       ÖLÇÜLDÜ: 0,30 ile "tebeşir karalaması" okundu. */
    netBerm(g, D, net, {
      cover: 0.26, frac: 0.5, step: 20, push: -1.4, w0: 1.4, w1: 3.8,
      body: 'rgba(164,158,162,0.18)', crest: 'rgba(202,196,200,0.15)',
    });
    const big = netBuild(D, 150, 0.44, 3);
    netJoints(g, D, big, 'rgba(6,5,5,0.40)', 2.8, null, 0.62);
    /* KOR: iri ağın derzinde, yalnız bazı kenarlarda ve kenarın bir
       PARÇASINDA. MIN_CELLS hücreyi 150 → 107 px'e indirdiğinde sürekli
       kirişler tek parça turuncu hatlara dönüşüp "neon boru / devre
       şeması" okundu — hücre ölçüsü değişinde ona tutunan süsün
       sabitleri de yeniden ölçülür. Kor bir OLAYDIR: kısa, kesikli. */
    for (let pass = 0; pass < 3; pass++) {
      const col = pass === 0 ? 'rgba(5,4,4,0.72)' : pass === 1 ? 'rgba(180,62,20,0.52)' : 'rgba(255,176,102,0.58)';
      netJoints(g, D, big, col, pass === 0 ? 3.6 : pass === 1 ? 1.9 : 0.85,
        (e) => e.s < (pass ? 0.09 : 0.16), pass ? 0.34 : 0.46);
    }
    /* KÖMÜR: serpilen küme eşit boyda YUVARLAK açık gri lekeler olarak
       okundu ("mantar başı / çakıl") — ışık pasosu (0,56 ölçek, çok açık
       `lite`) küçük çokgende kubbe gibi duruyor. İki düzeltme: kömür
       artık kabuğun DERZİNE tutunur (kural ④ — patlayan kabuk parçası
       çatlağın kenarında birikir) ve ışık kenarı gövdeye çok daha yakın
       bir değerde, boy bandı geniş. */
    const COAL = { dark: '#0a0807', body: '#2b2523', lite: '#443c39' };
    for (let i = 0; i < big.edges.length; i++) {
      const e = big.edges[i];
      if (e.lit || e.s2 > 0.62) continue;
      const nb = 2 + (e.s * 5 | 0);
      for (let q = 0; q < nb; q++) {
        const t = (q + 0.2 + rnd() * 0.6) / nb;
        chunk(g, D, e.a[0] + (e.b[0] - e.a[0]) * t + (rnd() - 0.5) * 22 * k,
          e.a[1] + (e.b[1] - e.a[1]) * t + (rnd() - 0.5) * 22 * k,
          2.0 + rnd() * 8.5, COAL);
      }
    }
    cluster(g, D, 14, 56, 2.0, 8.5, COAL);
    drift(g, D, 70, 'rgba(196,190,192,0.055)', 2.4, 5, 20, 44, 130);
    /* kor beneği: küçük, seyrek, HALELİ — zeminin tek sıcak noktası */
    for (let i = 0; i < 16 * A; i++) {
      const x = rnd() * S, y = rnd() * S, r = (1.6 + rnd() * 2.2) * k;
      D.wrap(x, y, r * 8, (px, py) => {
        const v = g.createRadialGradient(px, py, 0, px, py, r * 7);
        v.addColorStop(0, 'rgba(255,166,84,0.24)');
        v.addColorStop(0.4, 'rgba(255,98,32,0.07)');
        v.addColorStop(1, 'rgba(255,90,30,0)');
        g.fillStyle = v; g.fillRect(px - r * 7, py - r * 7, r * 14, r * 14);
        g.fillStyle = 'rgba(255,230,188,0.70)';
        g.beginPath(); g.arc(px, py, r * 0.55, 0, TAU); g.fill();
      });
    }
    specks(g, D, 560, ['rgba(200,194,192,0.12)', 'rgba(12,10,10,0.20)'], 0.8, 2.2);
  },

  /* 3 · BATAK (zehir bataklığı) — ISLAK çamur + yosun matı + su filmi.
     Islaklık PARLAKLIK değil YANSIMADIR: tek yönlü uzun ışık şeritleri
     + çamur çatlağının içinde duran su. Yosun matları ÜST ÜSTE biner. */
  batak(g, D) {
    const { S, k, rnd } = D, A = k * k / 4;
    base(g, D, '#242c26');
    patches(g, D, ['rgba(78,104,72,0.26)', 'rgba(8,18,14,0.50)', 'rgba(56,84,72,0.24)',
      'rgba(112,116,72,0.16)'], 24, 100, 260);
    /* çamur kabuğu: durgun suyun çekildiği yer */
    const net = netBuild(D, 46, 0.36);
    netFill(g, net, (c) => 'rgb(' + (34 + c.k * 26 | 0) + ',' + (42 + c.k * 26 | 0) + ',' + (34 + c.k * 22 | 0) + ')');
    netBevel(g, D, net, 'rgba(176,196,168,0.10)', 2.2);
    netJoints(g, D, net, 'rgba(6,14,10,0.56)', 1.6);
    /* derzde kalan su: koyu ama YANSIYAN — bir tık parlak sırt */
    netBerm(g, D, net, {
      cover: 0.3, frac: 0.6, step: 26, push: -1, w0: 1.6, w1: 4.2,
      body: 'rgba(16,34,30,0.42)', crest: 'rgba(150,200,182,0.16)',
    });
    /* yosun matı: geniş, opak, üst üste binen katmanlar */
    for (let i = 0; i < 150 * A; i++) {
      const x = rnd() * S, y = rnd() * S, r = (14 + rnd() * 32) * k;
      D.wrap(x, y, r * 1.7, (px, py) => {
        g.fillStyle = 'rgba(18,30,22,0.42)'; blob(g, px + r * 0.14, py + r * 0.18, r * 1.1, 10, 0.4, 0.78, rnd);
        g.fillStyle = rnd() < 0.5 ? 'rgba(60,84,48,0.66)' : 'rgba(48,72,54,0.62)';
        blob(g, px, py, r, 10, 0.42, 0.76, rnd);
        g.fillStyle = 'rgba(96,124,68,0.42)';
        blob(g, px + L[0] * r * 0.2, py + L[1] * r * 0.2, r * 0.56, 9, 0.4, 0.72, rnd);
      });
    }
    /* SAZ KIYMIĞI: yüzen ölü sap. İlk sürümde boy 14-44 px, genişlik
       1,1-2,4 ve İKİ değer arasında ~1075 kopya SERPİLMİŞTİ — "saman
       konfetisi" okundu (kural ②: izole tekrar eden leke). İki düzeltme:
       band genişledi (7-58 px boy, 3 değer, uç incelmesi) ve kopyalar
       KÜMELENDİ — gerçek bir bataklıkta saz tıkanma noktalarında birikir,
       yumakta saplar BİRBİRİNE BİNER. */
    const ang = D.field(150);
    const REED = ['rgba(146,142,92,0.72)', 'rgba(88,92,58,0.70)', 'rgba(112,104,64,0.66)'];
    for (let i = 0; i < 62 * A; i++) {
      const cx = rnd() * S, cy = rnd() * S;
      const ca = ang(cx, cy), spread = (14 + rnd() * 30) * k;
      for (let q = 0; q < 3 + (rnd() * 6 | 0); q++) {
        const x = cx + (rnd() - 0.5) * spread, y = cy + (rnd() - 0.5) * spread;
        const a = ca + (rnd() - 0.5) * 1.5;
        const len = (7 + rnd() * 51) * k, w = (0.8 + rnd() * 2.4) * k;
        const c = Math.cos(a), s = Math.sin(a);
        const col = REED[(rnd() * 3) | 0];
        D.wrap(x, y, len + 6 * k, (px, py) => {
          g.fillStyle = 'rgba(8,14,10,0.40)';
          g.beginPath();
          g.moveTo(px - s * w + w, py + c * w + w); g.lineTo(px + c * len + w, py + s * len + w);
          g.lineTo(px + s * w + w, py - c * w + w); g.closePath(); g.fill();
          g.fillStyle = col;
          g.beginPath();
          g.moveTo(px - s * w, py + c * w); g.lineTo(px + c * len, py + s * len);
          g.lineTo(px + s * w, py - c * w); g.closePath(); g.fill();
        });
      }
    }
    /* KABARCIK: çamur derzinden çıkan gaz. İlk sürümde TAM DAİRE olarak
       serpiliyordu — daire tekrara en yatkın siluet (kural ② elipsi tam
       bu yüzden yasaklar) ve "sabun köpüğü" okunuyordu. Artık derze
       tutunur (kural ④), silueti düzensiz çokgen halka, boyu değişken ve
       komşularıyla BİNER. */
    for (let i = 0; i < net.edges.length; i++) {
      const e = net.edges[i];
      if (e.s2 > 0.24) continue;
      const t = 0.18 + e.s * 0.64;
      const bx = e.a[0] + (e.b[0] - e.a[0]) * t, by = e.a[1] + (e.b[1] - e.a[1]) * t;
      for (let q = 0; q < 2 + (rnd() * 3 | 0); q++) {
        const px = bx + (rnd() - 0.5) * 16 * k, py = by + (rnd() - 0.5) * 16 * k;
        const r = (1.8 + rnd() * 5.4) * k;
        g.fillStyle = 'rgba(10,22,16,0.34)';
        blob(g, px + r * 0.16, py + r * 0.2, r * 1.1, 8, 0.34, 0.86, rnd);
        g.fillStyle = 'rgba(150,196,166,0.26)';
        blob(g, px, py, r, 8, 0.36, 0.88, rnd);
        g.fillStyle = 'rgba(206,246,220,0.24)';
        blob(g, px + L[0] * r * 0.34, py + L[1] * r * 0.34, r * 0.38, 7, 0.36, 0.9, rnd);
      }
    }
    /* su filmi: TEK yönlü uzun yansıma şeridi (ıslaklığın kendisi) */
    drift(g, D, 90, 'rgba(196,255,224,0.10)', 1.6, 3.4, 40, 110, 260);
    specks(g, D, 520, ['rgba(178,206,176,0.12)', 'rgba(8,16,12,0.22)'], 0.8, 2);
  },

  /* 4 · MERMER (kan katedrali) — LEVHA + DAMAR. Levha yapısal ölçekte
     (190 px): iç mekân döşemesi. Damar levhanın İÇİNDEN geçer. */
  mermer(g, D) {
    const { S, k, rnd } = D, A = k * k / 4;
    base(g, D, '#2e2a33');
    patches(g, D, ['rgba(112,104,124,0.24)', 'rgba(12,10,16,0.48)', 'rgba(96,72,96,0.22)',
      'rgba(130,124,146,0.16)'], 22, 110, 280);
    const net = netBuild(D, 190, 0.34);
    netFill(g, net, (c) => 'rgb(' + (58 + c.k * 30 | 0) + ',' + (54 + c.k * 28 | 0) + ',' + (64 + c.k * 30 | 0) + ')');
    netBevel(g, D, net, 'rgba(226,220,238,0.16)', 3.4);
    netJoints(g, D, net, 'rgba(8,6,12,0.62)', 2.4);
    /* cila lekesi: mermeri "mat taş"tan ayıran tek şey */
    for (let i = 0; i < 60 * A; i++) {
      const x = rnd() * S, y = rnd() * S, r = (20 + rnd() * 40) * k;
      D.wrap(x, y, r * 1.4, (px, py) => {
        const v = g.createRadialGradient(px + L[0] * r * 0.3, py + L[1] * r * 0.3, 0, px, py, r);
        v.addColorStop(0, 'rgba(240,236,255,0.13)');
        v.addColorStop(1, 'rgba(240,236,255,0)');
        g.fillStyle = v; g.fillRect(px - r, py - r, r * 2, r * 2);
      });
    }
    veins(g, D, 16, 4.2, 'rgba(228,218,240,0.40)', 'rgba(48,22,44,0.44)', 7, 22);
    veins(g, D, 34, 2.0, 'rgba(214,204,228,0.28)', 'rgba(34,16,32,0.30)', 5, 18);
    /* kan damarı: haritanın kimliği. Az, doygun, KOYU kırmızı. */
    veins(g, D, 9, 3.0, 'rgba(186,52,82,0.34)', 'rgba(44,8,20,0.42)', 6, 20);
    /* köşe yongası + kılcal ağ */
    cluster(g, D, 16, 60, 2.6, 5.4, { dark: '#16131c', body: '#4e4a58', lite: '#8b869a' });
    const fine = netBuild(D, 62, 0.4, 5);
    netJoints(g, D, fine, 'rgba(10,8,14,0.20)', 1.1);
    specks(g, D, 480, ['rgba(214,208,226,0.12)', 'rgba(12,10,16,0.18)'], 0.8, 2);
  },

  /* 5 · SOLGUN TAŞ (hiçlik tahtı) — BOŞLUK. Yapı katmanı çok geniş,
     süs neredeyse yok; ama plaka derzi NET, yoksa "gri kâğıt" olur. */
  solgun(g, D) {
    const { S, k, rnd } = D, A = k * k / 4;
    base(g, D, '#2b2d33');
    patches(g, D, ['rgba(122,128,146,0.22)', 'rgba(14,15,20,0.44)', 'rgba(92,98,118,0.20)',
      'rgba(146,150,166,0.14)'], 20, 120, 300);
    const net = netBuild(D, 230, 0.34);
    netFill(g, net, (c) => 'rgb(' + (52 + c.k * 26 | 0) + ',' + (54 + c.k * 27 | 0) + ',' + (60 + c.k * 28 | 0) + ')');
    netBevel(g, D, net, 'rgba(232,236,248,0.13)', 3.6);
    netJoints(g, D, net, 'rgba(10,11,16,0.52)', 2.2);
    const sub = netBuild(D, 84, 0.4, 7);
    netBevel(g, D, sub, 'rgba(232,236,248,0.07)', 2.2);
    netJoints(g, D, sub, 'rgba(12,13,18,0.26)', 1.3);
    /* yonga: kırılmış köşe — ışığı tutan tek üçgen yüz */
    cluster(g, D, 14, 66, 2.4, 5.6, { dark: '#171920', body: '#4a4d57', lite: '#868c9c' });
    /* toz sürüklemesi: boşluğun rüzgârı */
    drift(g, D, 130, 'rgba(238,242,255,0.065)', 2.6, 6.4, 34, 84, 300);
    drift(g, D, 70, 'rgba(14,15,20,0.10)', 2, 5, 26, 64, 300);
    specks(g, D, 640, ['rgba(234,238,250,0.12)', 'rgba(14,15,20,0.16)'], 0.8, 2);
  },

  /* 6 · YAYLA (gökçe ada) — kayanın üstünde ince çim. İKİ malzeme:
     açıkta taş plakaları + DERZLERİNDE otlu cepler (kural ④: çim
     serpilmez, taşın arasında biter). */
  yayla(g, D) {
    const { S, k, rnd } = D, A = k * k / 4;
    base(g, D, '#2d3138');
    patches(g, D, ['rgba(108,120,136,0.24)', 'rgba(12,16,22,0.46)', 'rgba(74,92,74,0.22)',
      'rgba(132,142,158,0.14)'], 22, 100, 260);
    const net = netBuild(D, 105, 0.36);
    netFill(g, net, (c) => 'rgb(' + (52 + c.k * 32 | 0) + ',' + (57 + c.k * 33 | 0) + ',' + (64 + c.k * 34 | 0) + ')');
    netBevel(g, D, net, 'rgba(216,228,244,0.15)', 3.2);
    netJoints(g, D, net, 'rgba(9,13,19,0.60)', 2.2);
    const ang = D.field(180);
    const FAM = [
      { d: '#111509', b: '#2c3a1c', t: '#3a4a24', r: '#4d5f30', ao: 'rgba(8,12,10,' },
      { d: '#141810', b: '#354424', t: '#45562d', r: '#5a6d3a', ao: 'rgba(8,12,10,' },
    ];
    const SET = tuftSprites(D, FAM, 11);
    /* otlu cep: derzin GÖLGE tarafında toplanır */
    for (let i = 0; i < net.edges.length; i++) {
      const e = net.edges[i];
      if (e.lit || e.s > 0.24) continue;
      const steps = 2 + (e.s * 6 | 0);
      for (let s = 0; s <= steps; s++) {
        const t = (s + 0.2) / (steps + 0.4);
        const x = e.a[0] + (e.b[0] - e.a[0]) * t + e.nx * 3 * k;
        const y = e.a[1] + (e.b[1] - e.a[1]) * t + e.ny * 3 * k;
        stampTuft(g, D, x, y, SET, rnd() < 0.5 ? 0 : 1, 6 + rnd() * 5, ang(x, y) + (rnd() - 0.5) * 0.9);
      }
    }
    for (let i = 0; i < 260 * A; i++) {
      const x = rnd() * S, y = rnd() * S;
      stampTuft(g, D, x, y, SET, rnd() < 0.5 ? 0 : 1, 5.5 + rnd() * 5, ang(x, y) + (rnd() - 0.5) * 0.9);
    }
    freeSprites(SET);
    /* liken: taşın üstünde soluk benek (opak, düzensiz) */
    for (let i = 0; i < 260 * A; i++) {
      const x = rnd() * S, y = rnd() * S, r = (2.6 + rnd() * 5) * k;
      D.wrap(x, y, r * 2, (px, py) => {
        g.fillStyle = rnd() < 0.5 ? 'rgba(158,182,172,0.34)' : 'rgba(122,140,104,0.32)';
        blob(g, px, py, r, 8, 0.44, 0.8, rnd);
      });
    }
    cluster(g, D, 14, 56, 2.6, 5.4, { dark: '#141821', body: '#4c525c', lite: '#88919e' });
    specks(g, D, 420, ['rgba(212,222,238,0.12)', 'rgba(12,16,22,0.18)'], 0.8, 2);
  },

  /* 7 · TUZ (tuz tabanı) — ÇOKGEN KABUK. Kuruyan gölün imzası:
     kenarları YUKARI KALKMIŞ plakalar. Kalkık kenar `netBerm` ile
     çizilir (kural ④); pah tek başına "fayans" verir. */
  tuz(g, D) {
    const { S, k, rnd } = D, A = k * k / 4;
    base(g, D, '#2b2820');
    patches(g, D, ['rgba(146,138,112,0.24)', 'rgba(18,17,13,0.46)', 'rgba(112,106,88,0.22)',
      'rgba(168,158,130,0.14)'], 22, 110, 280);
    const net = netBuild(D, 62, 0.36);
    netFill(g, net, (c) => 'rgb(' + (58 + c.k * 34 | 0) + ',' + (55 + c.k * 32 | 0) + ',' + (46 + c.k * 26 | 0) + ')');
    netJoints(g, D, net, 'rgba(22,19,14,0.48)', 1.7);
    /* KALKIK KENAR: tuz kabuğunun kimliği — ama PARÇALI. Kenarın
       tamamını kaplayan sürekli şerit petek örgüsü (basılı desen)
       okunuyordu; `cover` + `frac` ikisi birlikte kısılır. */
    netBerm(g, D, net, {
      litOnly: true, cover: 0.45, frac: 0.55, step: 22, push: 2, w0: 2.2, w1: 5,
      shadow: 'rgba(20,17,12,0.28)', body: 'rgba(196,188,162,0.40)', crest: 'rgba(244,238,214,0.44)',
    });
    /* ikincil ağ: plakaların içinde ince çatlak */
    const fine = netBuild(D, 22, 0.38, 4);
    netJoints(g, D, fine, 'rgba(24,21,15,0.22)', 1.1);
    netBevel(g, D, fine, 'rgba(240,234,208,0.08)', 1.6);
    /* salamura cebi: kabuğun altındaki koyu ıslak leke */
    for (let i = 0; i < 44 * A; i++) {
      const x = rnd() * S, y = rnd() * S, r = (8 + rnd() * 20) * k;
      D.wrap(x, y, r * 1.6, (px, py) => {
        g.fillStyle = 'rgba(30,30,24,0.44)'; blob(g, px, py, r, 9, 0.4, 0.76, rnd);
        g.fillStyle = 'rgba(96,104,96,0.18)';
        blob(g, px + L[0] * r * 0.24, py + L[1] * r * 0.24, r * 0.5, 8, 0.38, 0.7, rnd);
      });
    }
    /* KRİSTAL: iki tuzak üst üste yaşandı. Önce serpilen küme "serpilmiş
       şeker" okundu (`chunk`ın ışık pasosu 2-4 px'lik çokgeni beyaz kubbe
       yapıyor); derze bağlanınca da kenar başına dizilen EŞİT ARALIKLI,
       kenar sayısı 4'e SABİT kopyalar "inci kolyesi" oldu — kural ②'nin
       adıyla yazılı hatası. İkisinin ortası: kenarın RASTGELE BİR
       NOKTASINDA, kenarların çoğunu ATLAYARAK, siluet serbest (5-7 köşe)
       ve birbirine BİNEN 2-3 parçalı küme. */
    const SALT = { dark: '#211e16', body: '#8e876f', lite: '#b9b199' };
    for (let i = 0; i < net.edges.length; i++) {
      const e = net.edges[i];
      if (e.s2 > 0.3) continue;
      const t = 0.15 + e.s * 0.7;
      const bx = e.a[0] + (e.b[0] - e.a[0]) * t, by = e.a[1] + (e.b[1] - e.a[1]) * t;
      for (let q = 0; q < 2 + (rnd() * 2 | 0); q++) {
        chunk(g, D, bx + (rnd() - 0.5) * 13 * k, by + (rnd() - 0.5) * 13 * k, 1.8 + rnd() * 7, SALT);
      }
    }
    drift(g, D, 120, 'rgba(248,242,218,0.09)', 2, 5, 28, 68, 200);
    specks(g, D, 560, ['rgba(238,230,204,0.14)', 'rgba(24,21,15,0.18)'], 0.8, 2.2);
  },

  /* 8 · BUZ (donmuş göl) — BASINÇ SIRTI AĞI. İri plakalar, derzinde
     koyu yarık + ışığa dönük tarafta kalkmış KAR SIRTI. Kar serpilince
     "cam kıymığı" okunuyordu (kural ②); sırta dizilince göl okunur. */
  buz(g, D) {
    const { S, k, rnd } = D, A = k * k / 4;
    base(g, D, '#39424a');
    patches(g, D, ['rgba(168,182,190,0.26)', 'rgba(14,26,34,0.48)', 'rgba(96,120,132,0.24)',
      'rgba(216,226,232,0.18)'], 22, 120, 300);
    /* koyu su pencereleri: buzun ALTI — derinlik hissi buradan gelir */
    for (let i = 0; i < 26 * A; i++) {
      const x = rnd() * S, y = rnd() * S, r = (24 + rnd() * 54) * k;
      D.wrap(x, y, r * 1.6, (px, py) => {
        g.fillStyle = 'rgba(10,26,34,0.50)'; blob(g, px, py, r, 10, 0.36, 0.74, rnd);
        g.fillStyle = 'rgba(8,18,24,0.42)'; blob(g, px, py, r * 0.58, 9, 0.34, 0.7, rnd);
      });
    }
    const net = netBuild(D, 200, 0.36);
    netFill(g, net, (c) => 'rgba(' + (92 + c.k * 54 | 0) + ',' + (106 + c.k * 56 | 0) + ',' + (114 + c.k * 54 | 0) + ',0.46)');
    /* plaka İÇİ: düz dolgu "boyalı çokgen" okunur — buzun içi katmanlı */
    for (let i = 0; i < 170 * A; i++) {
      const x = rnd() * S, y = rnd() * S, r = (14 + rnd() * 32) * k;
      D.wrap(x, y, r * 1.6, (px, py) => {
        g.fillStyle = rnd() < 0.5 ? 'rgba(196,208,216,0.10)' : 'rgba(14,28,36,0.14)';
        blob(g, px, py, r, 9, 0.42, 0.5, rnd);
      });
    }
    const fine = netBuild(D, 56, 0.4, 9);
    netJoints(g, D, fine, 'rgba(10,22,28,0.22)', 1.2);
    netBevel(g, D, fine, 'rgba(226,238,244,0.10)', 1.8);
    netJoints(g, D, net, 'rgba(6,16,22,0.54)', 2.6);
    netBevel(g, D, net, 'rgba(232,240,246,0.26)', 4);
    netBerm(g, D, net, {
      litOnly: true, cover: 0.32, frac: 0.6, step: 30, push: 3, w0: 4.4, w1: 11,
      shadow: 'rgba(14,28,38,0.30)', body: 'rgba(202,213,220,0.60)', crest: 'rgba(240,246,250,0.66)',
    });
    /* uzun kırık düzlemi: bir yanı ışığı kıran yüz */
    for (let i = 0; i < 16 * A; i++) {
      const x = rnd() * S, y = rnd() * S, a = rnd() * TAU;
      const len = (90 + rnd() * 180) * k, c = Math.cos(a), s = Math.sin(a);
      const bend = (rnd() - 0.5) * 0.3, lw = (1.8 + rnd() * 2.4) * k;
      D.wrap(x, y, len + 10 * k, (px, py) => {
        for (let pass = 0; pass < 2; pass++) {
          g.strokeStyle = pass ? 'rgba(6,18,24,0.38)' : 'rgba(234,242,248,0.30)';
          g.lineWidth = pass ? lw * 0.7 : lw;
          g.beginPath();
          g.moveTo(px + (pass ? lw : 0), py + (pass ? lw : 0));
          g.quadraticCurveTo(px + c * len * 0.5 - s * len * bend, py + s * len * 0.5 + c * len * bend,
            px + c * len, py + s * len);
          g.stroke();
        }
      });
    }
    /* rüzgâr kar tarlası: bazı plakaların TAMAMI karla kaplı */
    netFill(g, net, (c) => (c.k2 < 0.22 ? 'rgba(214,222,228,' + (0.18 + c.k * 0.16).toFixed(2) + ')' : null));
    /* hava kabarcığı zinciri: "donmuş" olduğunu söyleyen tek detay */
    for (let i = 0; i < 46 * A; i++) {
      const x = rnd() * S, y = rnd() * S, a = rnd() * TAU, n = 3 + (rnd() * 4 | 0);
      const step = (5 + rnd() * 6) * k, rs = [];
      for (let q = 0; q < n; q++) rs.push((1.2 + rnd() * 2.4) * k);
      D.wrap(x, y, step * n + 8 * k, (px, py) => {
        for (let q = 0; q < n; q++) {
          const xx = px + Math.cos(a) * step * q, yy = py + Math.sin(a) * step * q;
          g.fillStyle = 'rgba(10,24,32,0.28)';
          g.beginPath(); g.arc(xx + rs[q] * 0.4, yy + rs[q] * 0.5, rs[q] * 0.85, 0, TAU); g.fill();
          g.fillStyle = 'rgba(240,246,250,0.42)';
          g.beginPath(); g.arc(xx, yy, rs[q] * 0.65, 0, TAU); g.fill();
        }
      });
    }
    cluster(g, D, 22, 52, 3.0, 5.6,
      { dark: 'rgba(8,20,26,0.58)', body: 'rgba(158,176,186,0.70)', lite: 'rgba(238,244,248,0.62)' });
    drift(g, D, 120, 'rgba(255,255,255,0.075)', 2.6, 6.4, 28, 70, 260);
    specks(g, D, 420, ['rgba(238,244,248,0.14)', 'rgba(10,22,28,0.16)'], 0.8, 2);
  },

  /* 9 · KEMİK (kemik bahçesi) — KIYMIK + tebeşir. Kemiğin dokusu tane
     değil LİFTİR; kıymık opak ve tek yönlü ışıklı. Kemik bu haritada
     PARLAYAN tek malzeme (taş bilerek koyu — bkz. _proptest bandı). */
  kemik(g, D) {
    const { S, k, rnd } = D, A = k * k / 4;
    base(g, D, '#2a271f');
    patches(g, D, ['rgba(148,138,110,0.24)', 'rgba(16,15,11,0.48)', 'rgba(112,104,82,0.22)',
      'rgba(174,164,130,0.15)'], 22, 110, 280);
    /* tebeşir zemini: iri opak taneler */
    specks(g, D, 900, ['#3b3729', '#2a271d', '#4a4433', '#221f18'], 1.4, 3.6);
    /* KIYMIK: bir uç geniş, diğer uç iğne. Opak, gölgeli, ışık kenarlı.
       ADET+ALFA ÖLÇÜLDÜ: 620 × 0,86 yerel kontrastı 20,0'a çıkarıyordu
       (tavan 14) — kemik tarlası "karıncalanan" bir yüzey oluyordu. */
    const ang = D.field(150);
    for (let i = 0; i < 330 * A; i++) {
      const x = rnd() * S, y = rnd() * S;
      const a = ang(x, y) + (rnd() - 0.5) * 1.1;
      const len = (10 + rnd() * 22) * k, w = (1.6 + rnd() * 3) * k;
      const lite = rnd() < 0.55;
      D.wrap(x, y, len + 6 * k, (px, py) => {
        g.save();
        g.translate(px, py); g.rotate(a);
        g.fillStyle = 'rgba(14,13,10,0.34)';
        g.beginPath(); g.moveTo(w * 0.6, -w + w * 0.8); g.lineTo(len + w * 0.6, w * 0.8);
        g.lineTo(w * 0.6, w + w * 0.8); g.closePath(); g.fill();
        g.fillStyle = lite ? 'rgba(172,163,133,0.74)' : 'rgba(120,113,91,0.70)';
        g.beginPath(); g.moveTo(0, -w); g.lineTo(len, 0); g.lineTo(0, w); g.closePath(); g.fill();
        g.fillStyle = 'rgba(206,199,172,0.16)';
        g.beginPath(); g.moveTo(0, -w * 0.5); g.lineTo(len * 0.7, -w * 0.06); g.lineTo(0, w * 0.1);
        g.closePath(); g.fill();
        g.restore();
      });
    }
    /* kılcal çatlak: kemiğin kuruyunca yaptığı boyuna yarık */
    veins(g, D, 40, 1.6, 'rgba(224,216,186,0.16)', 'rgba(16,15,12,0.30)', 4, 14);
    cluster(g, D, 20, 54, 2.6, 5.6, { dark: '#1a1815', body: '#4c4738', lite: '#726c5c' });
    drift(g, D, 90, 'rgba(238,230,198,0.09)', 2, 5, 24, 58, 200);
    specks(g, D, 520, ['rgba(240,232,202,0.14)', 'rgba(16,15,11,0.18)'], 0.8, 2.2);
  },

  /* 10 · BAZALT (gök çarkı) — ALTIGEN SÜTUN BAŞLARI. Tepeden bakılan
     bir bazalt sahanlığı gerçekten böyle görünür ve hiçbir başka
     yüzeye benzemez. Üstünde makine tozu + taşlanmış yay izleri. */
  bazalt(g, D) {
    const { S, k, rnd } = D, A = k * k / 4;
    base(g, D, '#282a31');
    patches(g, D, ['rgba(106,110,132,0.22)', 'rgba(10,11,16,0.48)', 'rgba(84,88,112,0.22)',
      'rgba(132,124,158,0.14)'], 22, 110, 280);
    /* dikişsiz altıgen ağı: dolgu değeri + koyu derz + iç pah */
    const rad = 34 * k;
    const cols = Math.max(2, Math.round(S / (rad * 1.732)));
    const rows = Math.max(2, Math.round(S / (rad * 1.5)));
    const dx = S / cols, dy = S / rows, rr0 = dx * 0.56;
    const h = (i, j) => {
      const v = Math.sin(((i % cols) + cols) % cols * 91.7 + ((j % rows) + rows) % rows * 47.3) * 43758.5453;
      return v - Math.floor(v);
    };
    for (let j = -1; j <= rows; j++) {
      for (let i = -1; i <= cols; i++) {
        const cx = i * dx + (j & 1 ? dx * 0.5 : 0), cy = j * dy;
        const kk = h(i, j), r = rr0 * (0.88 + kk * 0.14);
        const hexPath = (ox, oy, s) => {
          g.beginPath();
          for (let q = 0; q < 6; q++) {
            const a = q * TAU / 6 + 0.2618;
            g[q ? 'lineTo' : 'moveTo'](cx + Math.cos(a) * r * s + ox, cy + Math.sin(a) * r * s + oy);
          }
          g.closePath();
        };
        hexPath(0, 0, 1);
        g.fillStyle = 'rgb(' + (46 + kk * 30 | 0) + ',' + (48 + kk * 31 | 0) + ',' + (57 + kk * 34 | 0) + ')';
        g.fill();
        g.strokeStyle = 'rgba(7,8,13,0.62)'; g.lineWidth = 2.4 * k; g.stroke();
        /* üst yüz: sütun başı ışığı tutar (iç pah) */
        hexPath(L[0] * r * 0.16, L[1] * r * 0.16, 0.7);
        g.fillStyle = 'rgba(198,206,242,0.10)'; g.fill();
        /* radyal kırık: sütun başının içindeki üç çatlak */
        if (kk < 0.5) {
          g.strokeStyle = 'rgba(9,10,15,0.30)'; g.lineWidth = 1.1 * k;
          const a0 = kk * TAU;
          g.beginPath();
          for (let q = 0; q < 3; q++) {
            const a = a0 + q * 2.094;
            g.moveTo(cx, cy); g.lineTo(cx + Math.cos(a) * r * 0.8, cy + Math.sin(a) * r * 0.8);
          }
          g.stroke();
        }
      }
    }
    /* taşlama yayı: mekanizmanın döndüğü yerde zemin aşınmış */
    for (let i = 0; i < 60 * A; i++) {
      const x = rnd() * S, y = rnd() * S;
      const r = (26 + rnd() * 70) * k, a0 = rnd() * TAU, sw = 0.5 + rnd() * 1.2;
      g.strokeStyle = 'rgba(226,232,255,0.075)'; g.lineWidth = (1.4 + rnd() * 2.2) * k;
      D.wrap(x, y, r * 1.2, (px, py) => {
        g.beginPath(); g.arc(px, py, r, a0, a0 + sw); g.stroke();
      });
    }
    /* pirinç talaşı: soğuk zeminde tek sıcak nota (kümeli, opak) */
    cluster(g, D, 22, 44, 1.8, 4.0, { dark: '#191a20', body: '#7a5c3a', lite: '#c2996a' }, 4);
    cluster(g, D, 16, 52, 2.2, 4.8, { dark: '#141620', body: '#4a4e5e', lite: '#8f96ae' });
    drift(g, D, 80, 'rgba(206,212,246,0.07)', 2, 5, 24, 60, 240);
    specks(g, D, 560, ['rgba(202,206,232,0.12)', 'rgba(10,11,16,0.18)'], 0.8, 2.2);
  },
};

/* ── ÇOK SÖNÜK KARO IZGARASI (hibrit tercih) ─────────────────
   Dikiş DETAY katmanındadır çünkü orada net çizilir; makro katmanda
   0,48 örnek/px ile bulanık bir gri şeride dönüyordu. */
export function tileGrid(g, D, gridWorld) {
  const SZ = D.S, K = D.k;
  const cell = K * (gridWorld || 128);
  for (let c = 0; c * cell <= SZ + 1; c++) {
    const p = Math.round(c * cell);
    g.strokeStyle = 'rgba(20,22,18,0.055)'; g.lineWidth = 1.6 * K;
    g.beginPath(); g.moveTo(p, 0); g.lineTo(p, SZ); g.moveTo(0, p); g.lineTo(SZ, p); g.stroke();
    g.strokeStyle = 'rgba(206,208,196,0.04)'; g.lineWidth = 0.85 * K;
    g.beginPath(); g.moveTo(p + 2 * K, 0); g.lineTo(p + 2 * K, SZ);
    g.moveTo(0, p + 2 * K); g.lineTo(SZ, p + 2 * K); g.stroke();
  }
}
