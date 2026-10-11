/* ═══════════════════════════════════════════════════════════
   skyMap.js — GÖKYÜZÜ TIRMANIŞI (harita önizlemesi + bölüm seçimi)

   Kullanıcı teşhisi (2026-09-04): ana ekrandaki harita önizlemesi
   "premium değil", bölüm seçimi "net değil, sığmıyor, hoş durmuyor".
   Eski mapArt.js TEK yüzen ada boyuyordu: sahne bir HARİTA değil bir
   VİNYETTİ — ilerleme okunmuyordu, on dünya beş zemin sanatını
   paylaşıyordu (7-10 dünya birebir Dünya 1 gibi görünüyordu).

   YENİ DİL — üç karar:
   ① TIRMANIŞ AŞAĞIDAN YUKARIYA OKUNUR. Sahne bir ada ZİNCİRİDİR:
     görev 1 en altta, boss adası en tepede. Aynı düzen iki yerde
     kullanılır (ana ekran önizlemesi = sıkıştırılmış dört ada, bölüm
     seçimi = on adanın tamamı) ve `climbLayout` TEK yerde yaşar —
     DOM düğümleri boyanmış adaların TAM ÜSTÜNE oturur. Yol verisi
     iki yerde yaşarsa düğüm ile ada kayar (bu dosyadaki eski ders).
   ② TATLI/PREMİUM = KALIN SİLUET + TEK IŞIK YÖNÜ. Şeffaf gürültü
     yığmak yerine: opak çim kapağı, sarkan fisto etek, koyu kontur,
     sol-üstten tek anahtar ışık, dünya renginde alttan sekme.
     (terrain dersinin aynısı: FORM OPAKTIR.)
   ③ HER DÜNYA KENDİNİ ANLATIR. On zemin için ayrı palet + ayrı yüzey
     işareti + ayrı landmark. Beş zemin on dünyaya yetmiyordu.

   Maliyet: boyama offscreen ve ÖNBELLEKLİ (dünya+ilerleme+ölçü).
   Kare başına maliyet sıfır; canlı katman yok.
   ═══════════════════════════════════════════════════════════ */

import { drawIsle } from './isleScene.js?v=20260930m';
import { paintBiomeBack, paintBiomeFront } from './biomeSky.js?v=20260930m';

const TAU = 6.28318;
const rng = (seed) => { let s = seed | 0 || 1; return () => (s = (s * 16807) % 2147483647) / 2147483647; };
const al = (rgba, a) => rgba.replace(/[\d.]+\)$/, a + ')');


/* ═══════════ DÜZEN — tek kaynak ═══════════
   x ve r GENİŞLİĞE, y YÜKSEKLİĞE normalize (0..1).
   Dizi ALTTAN (görev 1) YUKARI (boss) sıralıdır.

   `pad` = {t, b} — sahnenin ÜSTÜNDE ve ALTINDA ÖRTÜLÜ kalan paylar
   (kesir). Bölüm seçiminde sahnenin tepesini 56 px'lik YAPIŞKAN BAŞLIK,
   dibini 96 px'lik ALT GEZİNME örter. Boya bu bantları DOLDURUR (gök
   kesik görünmesin) ama hiçbir ada, ay ya da kale oraya KONMAZ: ilk
   turda ay ve boss kalesinin külahı başlığın arkasında kalıyordu —
   tırmanışın ödülü, ekran açılır açılmaz yarısı kesik duruyordu. */
export function climbLayout(total, mode, ar, pad) {
  const out = [];
  const pt = (pad && pad.t) || 0, pb = (pad && pad.b) || 0;
  if (mode === 'tall') {
    /* kullanılabilir bant: örtülü payların ARASI */
    const yBot = 0.945 - pb, yTop = 0.110 + pt;
    for (let i = 0; i < total; i++) {
      const t = total < 2 ? 1 : i / (total - 1);
      const boss = i === total - 1;
      /* serpantin: DÜZ BİR ZİKZAK. İlk turda sinüs kullanılmıştı ve 1. ile
         3. ada birebir aynı x'e düşüyordu (ölçüldü: ikisi de 745 px) — yol
         "tırmanış" değil rastgele okunuyordu. Genlik dörtlü bir tabloyla
         değişir; ±0,22 sınırı 58 px'lik düğümü 279 px kabukta çerçevede
         tutar (ölçüldü: taşma 0). */
      const amp = [0.20, 0.15, 0.22, 0.17][i % 4];
      out.push({
        x: boss ? 0.5 : 0.5 + (i % 2 ? amp : -amp),
        y: yBot - t * (yBot - yTop),
        r: boss ? 0.30 : 0.185 + (i % 3 === 1 ? 0.018 : 0),
        boss,
      });
    }
  } else {
    /* ÖNİZLEME — KUTU ORANI BİR KISITTIR (v22 dersi).
       Çerçeve uzun kabukta 8:5 (ar 0,62), kısa kabukta 251×70 (ar 0,28).
       Taç ada kalesiyle birlikte dikeyde ~2,2·r yer ister; tek düzen iki
       kutuya birden oturmaz — ilk turda kalenin külahı çerçevenin
       ÜSTÜNDEN taşıyordu. İki düzen (şerit ↔ standart) arasında SÜREKLİ
       geçiş yapılır; kırpmayla telafi etmek yanlış eksendir. */
    const t = Math.max(0, Math.min(1, ((ar || 0.62) - 0.28) / 0.34));
    const S = [[0.160, 0.800, 0.040], [0.320, 0.700, 0.052], [0.500, 0.600, 0.064], [0.750, 0.480, 0.115]];
    const T = [[0.105, 0.885, 0.060], [0.225, 0.775, 0.072], [0.365, 0.655, 0.085], [0.690, 0.440, 0.235]];
    for (let i = 0; i < 4; i++) {
      out.push({
        x: S[i][0] + (T[i][0] - S[i][0]) * t,
        y: S[i][1] + (T[i][1] - S[i][1]) * t,
        r: S[i][2] + (T[i][2] - S[i][2]) * t,
        boss: i === 3,
      });
    }
  }
  return out;
}

/* ═══════════ ÇİZİM YARDIMCILARI ═══════════ */

function softGlow(g, x, y, r, col, a) {
  const v = g.createRadialGradient(x, y, r * 0.06, x, y, r);
  v.addColorStop(0, al(col, a));
  v.addColorStop(0.5, al(col, a * 0.34));
  v.addColorStop(1, al(col, 0));
  g.fillStyle = v; g.fillRect(x - r, y - r, r * 2, r * 2);
}

/** Tatlı bulut: örtüşen loblar + üstte ışık dudağı. Tek dolgu. */
function cloud(g, x, y, w, a, tint) {
  const h = w * 0.44;
  const lobes = [[-0.70, 0.14, 0.30], [-0.34, -0.06, 0.42], [0.02, -0.18, 0.38],
                 [0.36, -0.02, 0.36], [0.70, 0.14, 0.28], [-0.18, 0.18, 0.34], [0.24, 0.18, 0.32]];
  g.save();
  g.globalAlpha = a;
  g.beginPath();
  for (const [ox, oy, orr] of lobes) {
    const cx = x + ox * w, cy = y + oy * h, cr = orr * w;
    g.moveTo(cx + cr, cy); g.arc(cx, cy, cr, 0, TAU);
  }
  const grad = g.createLinearGradient(0, y - h * 0.7, 0, y + h * 0.55);
  grad.addColorStop(0, tint);
  grad.addColorStop(1, 'rgba(46,44,72,0.85)');
  g.fillStyle = grad; g.fill();
  /* ışık dudağı — bulutun üst yarısına açık bir kat */
  g.clip();
  g.fillStyle = 'rgba(255,252,242,0.16)';
  g.fillRect(x - w * 1.2, y - h * 1.1, w * 2.4, h * 0.72);
  g.restore();
}

/** Ada silueti: üst elipsin ARKA yayı + aşağı doğru daralan kaya.
   KONİ DEĞİL: gövde önce geniş kalır, bir çıkıntı yapar, sonra merkez
   dışı bir uçta biter. Simetrik koni on adada aynı dondurma külahını
   tekrarlıyordu (kural ②: tekrar eden siluet "konfeti" okunur). */
function rockPath(g, x, y, rx, ry, depth, k) {
  const m = k * 2 - 1;                     // -1..1 asimetri
  g.beginPath();
  g.moveTo(x - rx, y);
  g.lineTo(x - rx * (0.88 - k * 0.10), y + depth * 0.26);
  g.lineTo(x - rx * (0.54 + k * 0.22), y + depth * 0.50);
  g.lineTo(x - rx * (0.34 - k * 0.16), y + depth * 0.74);
  g.lineTo(x + rx * (0.04 + m * 0.20), y + depth);
  g.lineTo(x + rx * (0.42 + k * 0.14), y + depth * 0.64);
  g.lineTo(x + rx * (0.70 - k * 0.16), y + depth * 0.42);
  g.lineTo(x + rx * 0.93, y + depth * 0.15);
  g.lineTo(x + rx, y);
  g.ellipse(x, y, rx, ry, 0, 0, Math.PI, true);
  g.closePath();
}

/* ── küçük zafer bayrağı (geçilmiş ada) ── */
function flag(g, x, y, s, col) {
  g.save();
  g.strokeStyle = 'rgba(12,9,16,0.7)'; g.lineWidth = Math.max(1.2, s * 0.12);
  g.beginPath(); g.moveTo(x, y); g.lineTo(x, y - s * 1.5); g.stroke();
  g.fillStyle = col;
  g.beginPath();
  g.moveTo(x, y - s * 1.5);
  g.quadraticCurveTo(x + s * 0.9, y - s * 1.4, x + s * 1.1, y - s * 1.05);
  g.quadraticCurveTo(x + s * 0.7, y - s * 0.95, x, y - s * 0.85);
  g.closePath(); g.fill();
  g.lineWidth = Math.max(1, s * 0.09); g.stroke();
  g.restore();
}

/* ═══════════ ANA BOYAMA ═══════════ */
export function paintClimb(wd, cleared, W, H, mode, total, pad) {
  const tall = mode === 'tall';
  const cv = document.createElement('canvas');
  /* v75: büyük önizleme kartı (≥400 px) 1,5 DPR — 10 kart × 2² bellek + boyama süresi yarıya */
  const DPR = Math.min(window.devicePixelRatio || 1, tall ? 1.6 : (W >= 400 ? 1.5 : 2));
  cv.width = Math.round(W * DPR);
  cv.height = Math.round(H * DPR);
  const g = cv.getContext('2d');
  g.scale(DPR, DPR);
  const rnd = rng(wd.id * 7919 + 17);
  const nodes = climbLayout(total || (tall ? 10 : 4), mode, H / W, pad);
  const padT = (pad && pad.t) || 0;

  /* ÖNİZLEME (v37): gök + ufuk + hava her dünyanın KENDİ sahnesi
     (biomeSky.js). Ortak mor gece yalnız dikey tırmanışta kalır. */
  if (!tall) paintBiomeBack(g, wd, W, H);
  else {
  /* ═ 1. GÖK — dipte gece, tepede dünya renginde ışık (tırmanış aydınlığa) ═ */
  const sky = g.createLinearGradient(0, H, 0, 0);
  sky.addColorStop(0, '#06050c');
  sky.addColorStop(0.36, '#0a0816');
  sky.addColorStop(0.74, '#100d26');
  sky.addColorStop(1, '#1b1638');
  g.fillStyle = sky; g.fillRect(0, 0, W, H);
  /* tepedeki dünya-rengi ışık: KISIK. İlk turda 0,30'du ve göğü pembeye
     boyuyordu — gece siyahı palet sözleşmesi (v16) üst üçte bir de çöküyordu. */
  softGlow(g, W * 0.5, -H * 0.03, Math.max(W, H * 0.42) * 0.9, wd.glow, 0.16);
  /* dikey tırmanışın DİBİ: aşağıdaki dünyadan yükselen soluk ışık.
     Zifiri bir dip, tırmanışın BAŞLADIĞI adaları okunmaz yapıyordu. */
  if (tall) {
    const low = g.createLinearGradient(0, H, 0, H * 0.78);
    low.addColorStop(0, 'rgba(92,76,132,0.5)');
    low.addColorStop(1, 'rgba(92,76,132,0)');
    g.fillStyle = low; g.fillRect(0, H * 0.78, W, H * 0.22);
  }

  /* yıldızlar — üst yarıda yoğun */
  for (let i = 0; i < (tall ? 150 : 60); i++) {
    const x = rnd() * W, y = rnd() * rnd() * H, s = 0.7 + rnd() * 1.5;
    g.fillStyle = 'rgba(232,230,255,' + (0.12 + rnd() * 0.42).toFixed(2) + ')';
    g.fillRect(x, y, s, s);
  }

  /* ay — kompozisyonun karşı köşesi (taç ada sağda ise ay solda).
     Dikeyde ÖRTÜLÜ PAYIN ALTINA konur: başlık sahneyi 56 px örtüyor ve
     ilk turda ay tam oraya düşüp "başlıkla kesilmiş kırmızı top" okundu. */
  const mr = Math.min(W, H) * (tall ? 0.10 : 0.115);
  const mx = tall ? W * 0.21 : W * 0.19;
  const my = tall ? H * padT + mr * 1.25 : H * 0.16;
  softGlow(g, mx, my, mr * 3.4, wd.glow, 0.30);
  const mg = g.createRadialGradient(mx - mr * 0.34, my - mr * 0.34, mr * 0.1, mx, my, mr);
  mg.addColorStop(0, wd.moon[0]); mg.addColorStop(0.45, wd.moon[1]);
  mg.addColorStop(0.85, wd.moon[2]); mg.addColorStop(1, wd.moon[3]);
  g.fillStyle = mg;
  g.beginPath(); g.arc(mx, my, mr, 0, TAU); g.fill();
  g.fillStyle = 'rgba(0,0,0,0.13)';
  g.beginPath(); g.arc(mx + mr * 0.3, my + mr * 0.18, mr * 0.19, 0, TAU); g.fill();
  g.beginPath(); g.arc(mx - mr * 0.24, my + mr * 0.44, mr * 0.12, 0, TAU); g.fill();
  g.strokeStyle = 'rgba(255,255,255,0.42)'; g.lineWidth = Math.max(1, mr * 0.045);
  g.beginPath(); g.arc(mx, my, mr * 0.95, Math.PI * 1.06, Math.PI * 1.62); g.stroke();

  /* ═ 2. UZAK ADA SİLUETLERİ — derinlik, ucuz ═ */
  for (let i = 0; i < (tall ? 7 : 3); i++) {
    const x = rnd() * W, y = H * (tall ? 0.06 + rnd() * 0.86 : 0.2 + rnd() * 0.5);
    const r = W * (0.035 + rnd() * 0.045);
    g.save(); g.globalAlpha = 0.34;
    g.fillStyle = '#1b1834';
    rockPath(g, x, y, r, r * 0.4, r * 1.1, rnd());
    g.fill();
    g.restore();
  }

  /* ═ 3. ARKA BULUTLAR ═
     Az ve SEYREK: ilk turda 0,26-0,38 alfa ile göğün ortasını gri bir
     yastığa çeviriyordu. Bulut bir DERİNLİK ipucudur, bir zemin değil. */
  const bands = tall ? 9 : 2;
  for (let i = 0; i < bands; i++) {
    const x = W * (0.08 + rnd() * 0.84), y = H * (0.14 + (i + rnd()) / bands * 0.8);
    cloud(g, x, y, W * (0.18 + rnd() * 0.13), 0.16 + rnd() * 0.07, 'rgba(150,150,198,0.9)');
  }
  }   /* ← tall gök dalının sonu */

  /* ═ 4. TIRMANIŞ YOLU — adaların arasında ışık taşları ═ */
  const px = (n) => n.x * W, py = (n) => n.y * H;
  for (let i = 0; i < nodes.length - 1; i++) {
    const a = nodes[i], b = nodes[i + 1];
    const done = doneAt(i + 1, nodes.length, cleared, tall);
    const x0 = px(a), y0 = py(a) - a.r * W * 0.1, x1 = px(b), y1 = py(b) + b.r * W * 0.28;
    const steps = 4;
    for (let k = 1; k <= steps; k++) {
      const t = k / (steps + 1);
      const cx = x0 + (x1 - x0) * t + Math.sin(t * Math.PI) * (i % 2 ? 1 : -1) * W * 0.03;
      const cy = y0 + (y1 - y0) * t;
      const rr = Math.max(2, W * 0.011);
      g.beginPath(); g.ellipse(cx, cy + rr * 0.5, rr * 1.05, rr * 0.62, 0, 0, TAU);
      g.fillStyle = 'rgba(8,6,14,0.45)'; g.fill();
      if (done) {
        softGlow(g, cx, cy, rr * 4.2, 'rgba(240,206,120,1)', 0.38);
        g.fillStyle = '#f0cd7e';
      } else {
        g.fillStyle = '#8e93ad';
      }
      g.beginPath(); g.ellipse(cx, cy, rr, rr * 0.6, 0, 0, TAU); g.fill();
      g.fillStyle = 'rgba(255,255,255,0.3)';
      g.beginPath(); g.ellipse(cx - rr * 0.2, cy - rr * 0.16, rr * 0.5, rr * 0.22, 0, 0, TAU); g.fill();
    }
  }

  /* ═ 5. ADALAR — tepeden (uzak) aşağı (yakın) ═ */
  for (let i = nodes.length - 1; i >= 0; i--) {
    const n = nodes[i];
    const x = px(n), y = py(n), rx = n.r * W, ry = rx * 0.40, depth = rx * (n.boss ? 1.0 : 1.0);
    const done = doneAt(i, nodes.length, cleared, tall);
    const next = !done && doneAt(i - 1, nodes.length, cleared, tall);

    /* alt hava perdesi */
    softGlow(g, x, y + depth * 0.7, rx * 1.3, wd.glow, done ? 0.11 : 0.07);

    /* ── GÖK ADASI (isleScene.js, v38) ──
       Organik toprak parçası + dünyaya özgü yapı; kırk ada kırk ayrı
       siluet. Plato merkezi (x, y) climbLayout ile birebir aynı, yani
       düğümler, bayrak ve ışık sütunu kaymaz. Taç kesilmez: yapı üstte
       kalan paya (room) göre kısılır. */
    drawIsle(g, wd, n.boss ? 'b' : i % 3, x, y, rx, { room: y - (tall ? padT * H : 0) - 1, seed: i });
    if (done) flag(g, x - (n.boss ? rx * 0.82 : rx * 0.5), y + ry * 0.2, Math.max(5, rx * 0.17), '#efc978');

    /* SIRADAKİ ada: dünya renginde ışık sütunu — gözü buraya çeker */
    if (next) {
      g.save(); g.globalCompositeOperation = 'lighter';
      const col = g.createLinearGradient(0, y - ry - rx * 2.2, 0, y + ry);
      col.addColorStop(0, al(wd.glow, 0));
      col.addColorStop(1, al(wd.glow, 0.24));
      g.fillStyle = col;
      g.beginPath();
      g.moveTo(x - rx * 0.24, y - ry - rx * 2.2); g.lineTo(x + rx * 0.24, y - ry - rx * 2.2);
      g.lineTo(x + rx * 0.62, y + ry * 0.3); g.lineTo(x - rx * 0.62, y + ry * 0.3);
      g.closePath(); g.fill();
      g.restore();
      softGlow(g, x, y, rx * 1.5, wd.glow, 0.22);
    }

  }

  /* ═ 6. ÖN BULUTLAR + SİS — derinliği kapatır ═ */
  if (!tall) paintBiomeFront(g, wd, W, H);
  else {
  const fg = 4;
  for (let i = 0; i < fg; i++) {
    const x = W * (i % 2 ? 0.88 : 0.12) + (rnd() - 0.5) * W * 0.2;
    const y = H * (0.24 + rnd() * 0.68);
    cloud(g, x, y, W * (0.22 + rnd() * 0.12), 0.20, 'rgba(178,178,220,0.9)');
  }
  /* süzülen zerreler */
  g.save(); g.globalCompositeOperation = 'lighter';
  for (let i = 0; i < (tall ? 46 : 20); i++) {
    const x = rnd() * W, y = rnd() * H, r = 0.9 + rnd() * 1.9;
    g.fillStyle = al(wd.glow, 0.16 + rnd() * 0.34);
    g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
  }
  g.restore();
  }

  /* ═ 7. VİNYET ═
     KUTU ORANI VİNYETİ DE BELİRLER: dikey tırmanışta merkezli radyal
     vinyet + dip karartması, ALTTAKİ İLK ADALARI (görev 1-2) neredeyse
     siyaha boyuyordu — ölçüldü, oyuncunun tırmanışa BAŞLADIĞI yer en
     karanlık yerdi. Uzun tuvalde vinyet yalnız YAN kenarlardan gelir. */
  if (tall) {
    const side = g.createLinearGradient(0, 0, W, 0);
    side.addColorStop(0, 'rgba(4,3,9,0.55)');
    side.addColorStop(0.22, 'rgba(4,3,9,0)');
    side.addColorStop(0.78, 'rgba(4,3,9,0)');
    side.addColorStop(1, 'rgba(4,3,9,0.55)');
    g.fillStyle = side; g.fillRect(0, 0, W, H);
  } else {
    const vin = g.createRadialGradient(W * 0.5, H * 0.5, Math.min(W, H) * 0.42, W * 0.5, H * 0.5, Math.max(W, H) * 0.78);
    vin.addColorStop(0, 'rgba(0,0,0,0)'); vin.addColorStop(1, 'rgba(4,3,9,0.55)');
    g.fillStyle = vin; g.fillRect(0, 0, W, H);
    const bot = g.createLinearGradient(0, H * 0.84, 0, H);
    bot.addColorStop(0, 'rgba(5,4,10,0)'); bot.addColorStop(1, 'rgba(5,4,10,0.72)');
    g.fillStyle = bot; g.fillRect(0, H * 0.84, W, H * 0.16);
  }

  return cv;
}

/** i. ada geçilmiş mi? tall: ada = görev. preview: 4 ada = 10 görev. */
function doneAt(i, count, cleared, tall) {
  if (i < 0) return true;
  if (tall) return i < cleared;
  return cleared >= Math.round((i + 1) * (10 / count));
}

/* ── önbellek: en fazla 8 tuval; düşen tuvalin destek deposu ANINDA
   bırakılır (tall tuvali 400×1400×1,6² ≈ 5 MB — GC'yi beklemek
   telefonda hissedilir bir bellek tepesi demektir). ── */
const cache = new Map();
export function getClimbArt(wd, cleared, W, H, mode, total, pad) {
  W = Math.max(2, W | 0); H = Math.max(2, H | 0);   // v75: gizli sayfada 0×0 ölçü gelir
  const key = wd.id + ':' + cleared + ':' + W + 'x' + H + ':' + mode + ':' + (total || 0) +
    ':' + ((pad && pad.t) || 0).toFixed(4) + ',' + ((pad && pad.b) || 0).toFixed(4) +
    '';
  let c = cache.get(key);
  if (c) return c;
  c = paintClimb(wd, cleared, W, H, mode, total, pad);
  cache.set(key, c);
  while (cache.size > 12) {
    const k = cache.keys().next().value;
    const old = cache.get(k);
    cache.delete(k);
    if (old) { old.width = 0; old.height = 0; }
  }
  return c;
}
