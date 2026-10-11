/* ═══════════════════════════════════════════════════════════
   biomeSky.js — HARİTA ÖNİZLEMESİNİN BİYOM SAHNESİ (v37, 2026-09-22)

   Kullanıcı: "haritaların önizleme resminin çok daha güzelini yapmalıyız,
   biomuna göre uygun güzel tasarımlar; her haritanınkini baştan düzenle."

   Teşhis: on dünyanın önizlemesi AYNI mor gece göğünü, AYNI ayı ve AYNI
   gri bulutları paylaşıyordu — kimliği yalnız adanın ÜSTÜNDEKİ yapı
   taşıyordu. Bir önizleme kartı 150×94 px'te okunur: orada yapı detayı
   kaybolur, geriye GÖK + UFUK + IŞIK kalır. Kimlik oraya taşındı.

   Kurallar:
   ① Adalar, yol, bayrak, ışık sütunu (skyMap) DOKUNULMADI. Bu modül yalnız
     ARKA (ada öncesi) ve ÖN (ada sonrası) katmanı boyar.
   ② Her dünya: kendi gök rampası · kendi gök cismi (ay/güneş/gül pencere/
     tutulma/çark) · kendi ufuk silueti · kendi hava olayı (sis/kor/kar…).
   ③ Serbest bölgeler: sol üst (gök cismi), sağ alt (ufuk nesnesi). Ada
     köşegeni (sol alt → sağ üst) sade bırakılır.
   ④ Tek seferlik boyama (skyMap önbelleği). Kare başına maliyet sıfır.
   ═══════════════════════════════════════════════════════════ */

const TAU = Math.PI * 2;
const hx = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const ca = (h, a) => { const c = hx(h); return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')'; };

function glow(g, x, y, r, h, a) {
  if (r <= 0) return;
  const v = g.createRadialGradient(x, y, 0, x, y, r);
  v.addColorStop(0, ca(h, a)); v.addColorStop(0.45, ca(h, a * 0.34)); v.addColorStop(1, ca(h, 0));
  g.fillStyle = v; g.fillRect(x - r, y - r, r * 2, r * 2);
}
function flatGlow(g, x, y, rx, ry, h, a) {
  g.save(); g.translate(x, y); g.scale(1, ry / rx); glow(g, 0, 0, rx, h, a); g.restore();
}
function sky(g, W, H, stops) {
  const l = g.createLinearGradient(0, 0, 0, H);
  for (const [t, c] of stops) l.addColorStop(t, c);
  g.fillStyle = l; g.fillRect(0, 0, W, H);
}
function stars(g, W, H, n, rnd, h, yMax, aMax) {
  for (let i = 0; i < n; i++) {
    const x = rnd() * W, y = rnd() * rnd() * H * yMax, s = 0.6 + rnd() * 1.3;
    g.fillStyle = ca(h, (0.1 + rnd() * aMax).toFixed(2));
    g.fillRect(x, y, s, s);
  }
}
function orb(g, x, y, r, m, crat) {
  const v = g.createRadialGradient(x - r * 0.34, y - r * 0.34, r * 0.1, x, y, r);
  v.addColorStop(0, m[0]); v.addColorStop(0.45, m[1]); v.addColorStop(0.85, m[2]); v.addColorStop(1, m[3]);
  g.fillStyle = v; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
  if (crat) {
    g.fillStyle = 'rgba(0,0,0,0.13)';
    for (const [a, b, c] of [[0.3, 0.18, 0.19], [-0.24, 0.44, 0.12], [-0.12, -0.32, 0.1], [0.46, -0.3, 0.07]]) {
      g.beginPath(); g.arc(x + a * r, y + b * r, c * r, 0, TAU); g.fill();
    }
  }
  g.strokeStyle = 'rgba(255,255,255,0.35)'; g.lineWidth = Math.max(0.8, r * 0.04);
  g.beginPath(); g.arc(x, y, r * 0.95, Math.PI * 1.06, Math.PI * 1.62); g.stroke();
}
/** Ufuk silueti. Kontrol noktaları kosinüsle (yumuşak) ya da doğrusal
   (sivri) aradeğerlenir; aynı fonksiyon üstüne konan nesnelerin tabanını
   verir — boyanan kenar ile nesne tabanı iki ayrı hesaptan gelmez. */
function hills(g, W, H, base, amp, n, rnd, fill, sharp) {
  const c = [];
  for (let i = 0; i <= n + 1; i++) {
    c.push(base - amp * (sharp ? (i % 2 ? 0.55 + 0.45 * rnd() : 0.12 * rnd()) : 0.2 + 0.8 * rnd()));
  }
  const yAt = (x) => {
    const t = Math.max(0, Math.min(n, x / W * n)), i = Math.min(n - 1, Math.floor(t)), f = t - i;
    const k = sharp ? f : (1 - Math.cos(f * Math.PI)) / 2;
    return c[i] + (c[i + 1] - c[i]) * k;
  };
  g.beginPath(); g.moveTo(0, H + 1);
  const st = W / 90;
  for (let x = 0; x <= W + st; x += st) g.lineTo(Math.min(x, W), yAt(Math.min(x, W)));
  g.lineTo(W, H + 1); g.closePath();
  g.fillStyle = fill; g.fill();
  return yAt;
}
function rimLine(g, W, yAt, h, a, lw) {
  g.strokeStyle = ca(h, a); g.lineWidth = lw;
  g.beginPath();
  for (let x = 0; x <= W; x += W / 90) x ? g.lineTo(x, yAt(x)) : g.moveTo(0, yAt(0));
  g.stroke();
}
function lump(g, x, y, w, top, bot, a) {
  const h = w * 0.42;
  g.save(); g.globalAlpha = a; g.beginPath();
  for (const [ox, oy, r] of [[-0.62, 0.12, 0.3], [-0.3, -0.06, 0.4], [0.04, -0.16, 0.38], [0.38, -0.02, 0.34], [0.68, 0.12, 0.26]]) {
    g.moveTo(x + ox * w + r * w, y + oy * h); g.arc(x + ox * w, y + oy * h, r * w, 0, TAU);
  }
  const l = g.createLinearGradient(0, y - h, 0, y + h * 0.6);
  l.addColorStop(0, top); l.addColorStop(1, bot);
  g.fillStyle = l; g.fill(); g.restore();
}
function fogBand(g, W, y, h, col, a, rnd) {
  const l = g.createLinearGradient(0, y - h, 0, y + h);
  l.addColorStop(0, ca(col, 0)); l.addColorStop(0.5, ca(col, a)); l.addColorStop(1, ca(col, 0));
  g.fillStyle = l; g.fillRect(0, y - h, W, h * 2);
  for (let i = 0; i < 4; i++) flatGlow(g, W * (0.1 + rnd() * 0.8), y + (rnd() - 0.5) * h, W * (0.18 + rnd() * 0.14), h * 1.1, col, a * 0.9);
}
function motes(g, W, H, n, rnd, col, r0, r1, y0, y1, halo) {
  g.save(); g.globalCompositeOperation = 'lighter';
  for (let i = 0; i < n; i++) {
    const x = rnd() * W, y = H * (y0 + rnd() * (y1 - y0)), r = r0 + rnd() * (r1 - r0), a = 0.25 + rnd() * 0.55;
    if (halo) glow(g, x, y, r * 5, col, a * 0.35);
    g.fillStyle = ca(col, a); g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
  }
  g.restore();
}
function tree(g, x, y, h, rnd, col, lw, moss) {
  g.strokeStyle = col; g.lineCap = 'round';
  const br = (x0, y0, a, len, w, d) => {
    const x1 = x0 + Math.cos(a) * len, y1 = y0 + Math.sin(a) * len;
    g.lineWidth = w; g.beginPath(); g.moveTo(x0, y0);
    g.quadraticCurveTo((x0 + x1) / 2 + (rnd() - 0.5) * len * 0.3, (y0 + y1) / 2, x1, y1); g.stroke();
    if (moss && d <= 2) {
      g.lineWidth = Math.max(0.5, w * 0.35);
      g.beginPath(); g.moveTo(x1, y1); g.lineTo(x1 + (rnd() - 0.5) * 2, y1 + len * (0.8 + rnd() * 0.9)); g.stroke();
    }
    if (d > 0) {
      br(x1, y1, a - 0.35 - rnd() * 0.45, len * 0.7, w * 0.6, d - 1);
      br(x1, y1, a + 0.3 + rnd() * 0.45, len * 0.66, w * 0.6, d - 1);
    }
  };
  br(x, y + h * 0.04, -Math.PI / 2 + (rnd() - 0.5) * 0.25, h * 0.4, lw, 4);
  g.lineCap = 'butt';
}
function jag(g, pts, col, w, core) {
  g.save(); g.globalCompositeOperation = 'lighter'; g.lineJoin = 'round'; g.lineCap = 'round';
  for (const [lw, a] of [[w * 7, 0.05], [w * 3.6, 0.12], [w * 1.7, 0.4]]) {
    g.strokeStyle = ca(col, a); g.lineWidth = lw;
    g.beginPath(); pts.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.stroke();
  }
  g.strokeStyle = core; g.lineWidth = w * 0.6;
  g.beginPath(); pts.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.stroke();
  g.restore();
}
/** Ay önünden geçen ince bulut: SERT ŞERİT DEĞİL, yumuşak yassı gölge.
   İlk pasoda dolu elipsler 1:1 bakışta "siyah çubuk" okundu. */
function veil(g, x, y, r, col, rnd, n) {
  for (let i = 0; i < n; i++) flatGlow(g, x + (rnd() - 0.4) * r * 0.9, y - r * 0.2 + i * r * 0.55, r * (1.5 + rnd() * 0.5), r * 0.13, col, 0.85);
}
function walk(x, y, dx, dy, n, spread, rnd) {
  const p = [[x, y]];
  for (let i = 0; i < n; i++) { x += dx + (rnd() - 0.5) * spread; y += dy + (rnd() - 0.5) * spread * 0.4; p.push([x, y]); }
  return p;
}

/* ═══════════ ARKA KATMAN — on dünya ═══════════ */
const BACK = {
  /* 1 · SOLGUN MEZARLIK — ufukta alçak kızıl ay, çıplak ağaçlar, mezar
     taşları, taşların dibinde kızıl yer sisi. */
  mezarlik(g, wd, W, H, u, rnd) {
    const hy = H * 0.74;
    sky(g, W, H, [[0, '#07040a'], [0.45, '#1a0910'], [0.74, '#44131c'], [1, '#1c080d']]);
    stars(g, W, H, 44, rnd, '#ffe4e4', 0.55, 0.4);
    const mx = W * 0.2, my = H * 0.33, mr = u * 0.15;
    glow(g, mx, my, mr * 4.2, wd.color, 0.26);
    orb(g, mx, my, mr, wd.moon, true);
    veil(g, mx, my, mr, '#12060a', rnd, 2);
    g.fillStyle = '#12060a';
    for (const [bx, by, bs] of [[0.36, 0.2, 1], [0.42, 0.28, 0.7], [0.31, 0.12, 0.55]]) {
      const x = W * bx, y = H * by, s = u * 0.024 * bs;
      g.beginPath(); g.moveTo(x, y);
      g.quadraticCurveTo(x - s * 0.5, y - s * 0.55, x - s, y - s * 0.1);
      g.quadraticCurveTo(x - s * 0.45, y - s * 0.12, x, y + s * 0.28);
      g.quadraticCurveTo(x + s * 0.45, y - s * 0.12, x + s, y - s * 0.1);
      g.quadraticCurveTo(x + s * 0.5, y - s * 0.55, x, y); g.fill();
    }
    hills(g, W, H, hy, H * 0.08, 6, rnd, '#260c14', false);
    fogBand(g, W, hy + H * 0.02, H * 0.05, '#a03848', 0.2, rnd);
    const yAt = hills(g, W, H, hy + H * 0.1, H * 0.06, 5, rnd, '#0e0508', false);
    const c = '#0e0508';
    tree(g, W * 0.93, yAt(W * 0.93), H * 0.42, rnd, c, u * 0.014, false);
    tree(g, W * 0.5, yAt(W * 0.5), H * 0.26, rnd, c, u * 0.009, false);
    g.fillStyle = c;
    for (let i = 0; i < 9; i++) {
      const x = W * (0.46 + i * 0.06 + rnd() * 0.02), y = yAt(x) + 1, s = u * (0.026 + rnd() * 0.014);
      if (i % 3 === 1) { g.fillRect(x - s * 0.07, y - s * 1.2, s * 0.14, s * 1.3); g.fillRect(x - s * 0.34, y - s * 0.92, s * 0.68, s * 0.14); }
      else { g.beginPath(); g.moveTo(x - s * 0.34, y); g.lineTo(x - s * 0.34, y - s * 0.6); g.arc(x, y - s * 0.6, s * 0.34, Math.PI, 0); g.lineTo(x + s * 0.34, y); g.fill(); }
    }
  },

  /* 2 · KÜL ÇUKURLARI — duman arkasında boğuk kor güneşi, sağda tüten
     yanardağ, ovada ağır ağır akan lav damarı. */
  kul(g, wd, W, H, u, rnd) {
    const hy = H * 0.76;
    sky(g, W, H, [[0, '#0a0605'], [0.4, '#1d0e08'], [0.72, '#57210c'], [0.86, '#8a3a12'], [1, '#3a160a']]);
    stars(g, W, H, 14, rnd, '#ffd8b0', 0.4, 0.3);
    const sx = W * 0.2, sy = H * 0.3, sr = u * 0.13;
    glow(g, sx, sy, sr * 4, wd.color, 0.3);
    orb(g, sx, sy, sr, wd.moon, false);
    veil(g, sx, sy, sr, '#1c0c06', rnd, 3);
    for (let i = 0; i < 5; i++) lump(g, W * (0.3 + i * 0.18), H * (0.06 + rnd() * 0.1), W * (0.16 + rnd() * 0.08), 'rgba(40,18,10,0.9)', 'rgba(120,44,16,0.8)', 0.55);
    hills(g, W, H, hy, H * 0.1, 8, rnd, '#2a1109', true);
    const vx = W * 0.86, vt = H * 0.5, vw = W * 0.26;
    const lx = vx - vw * 0.1, rx = vx + vw * 0.1;
    for (let i = 0; i < 7; i++) {
      const t = i / 6;
      const px = vx + t * W * 0.12 + Math.sin(t * 4) * W * 0.02, py = vt - t * H * 0.42, pr = W * (0.03 + t * 0.07);
      lump(g, px, py, pr, 'rgba(44,24,16,0.9)', 'rgba(150,60,20,0.85)', 0.5 - t * 0.28);
    }
    glow(g, vx, vt, W * 0.12, wd.color, 0.55);
    g.fillStyle = '#160906';
    g.beginPath(); g.moveTo(vx - vw, H + 1); g.lineTo(lx, vt); g.lineTo(rx, vt); g.lineTo(vx + vw, H + 1); g.closePath(); g.fill();
    g.save(); g.globalCompositeOperation = 'lighter'; g.lineCap = 'round';
    for (let i = 0; i < 3; i++) {
      const x0 = lx + (rx - lx) * (0.2 + i * 0.3), x1 = x0 + (i - 1) * vw * 0.5;
      g.strokeStyle = 'rgba(255,120,40,0.5)'; g.lineWidth = Math.max(1, u * 0.008);
      g.beginPath(); g.moveTo(x0, vt); g.quadraticCurveTo(x0 + (i - 1) * vw * 0.1, vt + H * 0.12, x1, vt + H * 0.26); g.stroke();
    }
    g.restore();
    const yAt = hills(g, W, H, hy + H * 0.12, H * 0.04, 5, rnd, '#0d0605', false);
    const lava = (a, w) => {
      g.strokeStyle = a; g.lineWidth = w;
      g.beginPath(); g.moveTo(W * 0.4, H + 2);
      g.bezierCurveTo(W * 0.55, yAt(W * 0.55) + H * 0.03, W * 0.7, H * 0.99, W * 1.02, yAt(W) + H * 0.05); g.stroke();
    };
    g.save(); g.globalCompositeOperation = 'lighter'; g.lineCap = 'round';
    lava('rgba(255,90,20,0.12)', u * 0.06); lava('rgba(255,120,40,0.35)', u * 0.02); lava('rgba(255,210,140,0.8)', u * 0.006);
    g.restore();
  },

  /* 3 · ZEHİR BATAKLIĞI — puslu yeşil ay, yosun sarkan ağaç silueti,
     ayı yansıtan durgun zehirli su. */
  bataklik(g, wd, W, H, u, rnd) {
    const hy = H * 0.72, wy = H * 0.8;
    sky(g, W, H, [[0, '#030807'], [0.45, '#07201b'], [0.74, '#154239'], [1, '#0a211c']]);
    stars(g, W, H, 30, rnd, '#d8fff0', 0.5, 0.32);
    const mx = W * 0.2, my = H * 0.28, mr = u * 0.12;
    glow(g, mx, my, mr * 4.5, wd.color, 0.22);
    orb(g, mx, my, mr, wd.moon, true);
    glow(g, mx, my, mr * 2.2, '#9ff0d0', 0.12);
    const yAt = hills(g, W, H, hy, H * 0.05, 7, rnd, '#0b2621', false);
    const c = '#061512';
    tree(g, W * 0.05, yAt(W * 0.05) + H * 0.02, H * 0.46, rnd, c, u * 0.014, true);
    tree(g, W * 0.52, yAt(W * 0.52), H * 0.3, rnd, c, u * 0.01, true);
    tree(g, W * 0.95, yAt(W * 0.95), H * 0.5, rnd, c, u * 0.015, true);
    fogBand(g, W, hy + H * 0.03, H * 0.06, '#4ab89a', 0.2, rnd);
    g.fillStyle = c; g.fillRect(0, yAt(0) + H * 0.02, W, wy - hy);
    const l = g.createLinearGradient(0, wy, 0, H);
    l.addColorStop(0, '#12382f'); l.addColorStop(1, '#030a08');
    g.fillStyle = l; g.fillRect(0, wy, W, H - wy);
    g.save(); g.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 14; i++) {
      const t = i / 13, y = wy + (H - wy) * t, w = mr * (1.4 - t * 0.9) * (0.5 + rnd());
      g.fillStyle = ca(wd.moon[0], (0.35 - t * 0.25).toFixed(2));
      g.fillRect(mx - w / 2 + (rnd() - 0.5) * mr * 0.4, y, w, Math.max(1, H * 0.005));
    }
    g.restore();
    g.strokeStyle = c; g.lineWidth = Math.max(0.8, u * 0.004);
    for (const bx of [0.58, 0.64, 0.9]) {
      for (let k = 0; k < 5; k++) {
        const x = W * bx + k * u * 0.01, h = H * (0.04 + rnd() * 0.05);
        g.beginPath(); g.moveTo(x, wy + 1); g.quadraticCurveTo(x + 1, wy - h * 0.5, x + (rnd() - 0.3) * 3, wy - h); g.stroke();
      }
    }
  },

  /* 4 · KAN KATEDRALİ — göğe asılı dev gül pencere, ondan düşen vitray
     ışık huzmeleri, ufukta gotik kule ormanı. */
  katedral(g, wd, W, H, u, rnd) {
    const hy = H * 0.8;
    sky(g, W, H, [[0, '#06041a'], [0.45, '#150c33'], [0.78, '#301442'], [1, '#170a22']]);
    stars(g, W, H, 40, rnd, '#eee4ff', 0.55, 0.38);
    const x = W * 0.21, y = H * 0.32, r = u * 0.14;
    g.save(); g.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 5; i++) {
      const a = 0.42 + i * 0.13, spread = 0.035 + rnd() * 0.02, L = W * 1.2;
      const l = g.createLinearGradient(x, y, x + Math.cos(a) * L, y + Math.sin(a) * L);
      l.addColorStop(0, i % 2 ? 'rgba(200,60,90,0.16)' : 'rgba(155,108,255,0.16)'); l.addColorStop(1, 'rgba(155,108,255,0)');
      g.fillStyle = l;
      g.beginPath(); g.moveTo(x, y);
      g.lineTo(x + Math.cos(a - spread) * L, y + Math.sin(a - spread) * L);
      g.lineTo(x + Math.cos(a + spread) * L, y + Math.sin(a + spread) * L); g.closePath(); g.fill();
    }
    g.restore();
    glow(g, x, y, r * 3.6, wd.color, 0.32);
    glow(g, x, y, r * 2, '#c8304a', 0.2);
    g.fillStyle = '#0c0714'; g.beginPath(); g.arc(x, y, r * 1.1, 0, TAU); g.fill();
    const glass = ['#c02c46', '#7446dc', '#d8a444', '#9a3aa8'];
    for (let i = 0; i < 16; i++) {
      const a0 = i / 16 * TAU, a1 = (i + 1) / 16 * TAU;
      g.beginPath(); g.arc(x, y, r, a0 + 0.03, a1 - 0.03); g.arc(x, y, r * 0.7, a1 - 0.05, a0 + 0.05, true); g.closePath();
      g.fillStyle = glass[i % 4]; g.fill();
    }
    for (let i = 0; i < 8; i++) {
      const a = i / 8 * TAU + 0.2;
      g.beginPath(); g.ellipse(x + Math.cos(a) * r * 0.42, y + Math.sin(a) * r * 0.42, r * 0.2, r * 0.11, a, 0, TAU);
      g.fillStyle = glass[(i + 1) % 4]; g.fill();
    }
    g.fillStyle = '#e8c070'; g.beginPath(); g.arc(x, y, r * 0.14, 0, TAU); g.fill();
    g.strokeStyle = '#0c0714'; g.lineWidth = Math.max(0.8, r * 0.05);
    for (const k of [1, 0.7, 0.14]) { g.beginPath(); g.arc(x, y, r * k, 0, TAU); g.stroke(); }
    const sh = g.createRadialGradient(x - r * 0.4, y - r * 0.4, 0, x, y, r);
    sh.addColorStop(0, 'rgba(255,240,255,0.25)'); sh.addColorStop(1, 'rgba(0,0,0,0.25)');
    g.fillStyle = sh; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
    const spires = (base, hMin, hMax, col, lit) => {
      let sx = -W * 0.02;
      while (sx < W) {
        const w = W * (0.025 + rnd() * 0.04), h = H * (hMin + rnd() * (hMax - hMin));
        g.fillStyle = col; g.fillRect(sx, base - h, w, H - base + h);
        g.beginPath(); g.moveTo(sx - w * 0.08, base - h); g.lineTo(sx + w / 2, base - h - w * (1.6 + rnd() * 2)); g.lineTo(sx + w * 1.08, base - h); g.fill();
        if (lit && rnd() < 0.55) {
          const ww = w * 0.3, wh = h * 0.22, wx = sx + w / 2 - ww / 2, wy2 = base - h * 0.62;
          g.fillStyle = lit; g.beginPath(); g.moveTo(wx, wy2 + wh); g.lineTo(wx, wy2); g.lineTo(wx + ww / 2, wy2 - ww * 0.7); g.lineTo(wx + ww, wy2); g.lineTo(wx + ww, wy2 + wh); g.fill();
        }
        sx += w * (0.75 + rnd() * 0.6);
      }
    };
    spires(hy - H * 0.02, 0.06, 0.2, '#1c1034', null);
    fogBand(g, W, hy, H * 0.05, '#7a3aa0', 0.18, rnd);
    spires(hy + H * 0.1, 0.03, 0.1, '#0a0616', 'rgba(220,70,90,0.85)');
  },

  /* 5 · HİÇLİK TAHTI — renksiz boşluk, beyaz koronalı kara tutulma,
     göğü yırtan ışık yarıkları, süzülen kırık parçalar. */
  hiclik(g, wd, W, H, u, rnd) {
    const hy = H * 0.82;
    sky(g, W, H, [[0, '#040405'], [0.5, '#0e0e13'], [0.82, '#24232c'], [1, '#101016']]);
    stars(g, W, H, 60, rnd, '#f4f2ff', 0.8, 0.45);
    /* YARIK IŞIKTIR: halesi baskın, teli sönük (v36 dersi — tel baskınsa
       "şimşek" okunur; ilk pasoda tam öyle okundu). */
    for (const p of [walk(W * 0.36, -2, W * 0.028, H * 0.08, 8, W * 0.022, rnd), walk(W * 0.99, H * 0.04, -W * 0.04, H * 0.04, 5, W * 0.018, rnd)]) {
      g.save(); g.globalCompositeOperation = 'lighter';
      for (let k = 0; k < p.length - 1; k++) {
        const q = p[k], q2 = p[k + 1];
        flatGlow(g, (q[0] + q2[0]) / 2, (q[1] + q2[1]) / 2, u * 0.05, u * 0.05, '#e8e4d8', 0.09);
      }
      g.restore();
      /* tel değil DUDAK: ortada şişen, uçlarda sivrilen dolu bir yarık */
      const L = [], Rr = [];
      p.forEach((q, k) => { const w = Math.sin(Math.PI * k / (p.length - 1)) * u * 0.014; L.push([q[0] - w, q[1]]); Rr.push([q[0] + w, q[1]]); });
      g.beginPath(); L.forEach((q, k) => (k ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1])));
      for (let k = Rr.length - 1; k >= 0; k--) g.lineTo(Rr[k][0], Rr[k][1]);
      g.closePath(); g.fillStyle = 'rgba(244,240,228,0.55)'; g.fill();
      g.strokeStyle = 'rgba(255,255,255,0.3)'; g.lineWidth = Math.max(0.5, u * 0.0025);
      g.beginPath(); p.forEach((q, k) => (k ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1]))); g.stroke();
    }
    const x = W * 0.21, y = H * 0.3, r = u * 0.11;
    glow(g, x, y, r * 3.6, wd.color, 0.32);
    glow(g, x, y, r * 1.6, '#ffffff', 0.5);
    g.fillStyle = '#030304'; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
    g.strokeStyle = 'rgba(255,252,240,0.9)'; g.lineWidth = Math.max(0.8, r * 0.05);
    g.beginPath(); g.arc(x, y, r * 1.01, 0, TAU); g.stroke();
    g.strokeStyle = 'rgba(255,252,240,0.35)'; g.lineWidth = Math.max(0.6, r * 0.02);
    for (let i = 0; i < 18; i++) {
      const a = i / 18 * TAU + rnd() * 0.1, l = r * (1.25 + rnd() * 0.5);
      g.beginPath(); g.moveTo(x + Math.cos(a) * r * 1.06, y + Math.sin(a) * r * 1.06); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke();
    }
    for (let i = 0; i < 9; i++) {
      const sx = W * (0.3 + rnd() * 0.68), sy = H * (0.1 + rnd() * 0.55), s = u * (0.012 + rnd() * 0.022), a = rnd() * TAU;
      g.save(); g.translate(sx, sy); g.rotate(a);
      g.fillStyle = '#1a1a22'; g.beginPath(); g.moveTo(-s, 0); g.lineTo(0, -s * 0.7); g.lineTo(s * 0.9, -s * 0.1); g.lineTo(s * 0.2, s * 0.8); g.closePath(); g.fill();
      g.strokeStyle = 'rgba(232,228,216,0.45)'; g.lineWidth = Math.max(0.6, s * 0.12);
      g.beginPath(); g.moveTo(-s, 0); g.lineTo(0, -s * 0.7); g.lineTo(s * 0.9, -s * 0.1); g.stroke();
      g.restore();
    }
    fogBand(g, W, hy - H * 0.02, H * 0.06, '#9a98a8', 0.16, rnd);
    g.fillStyle = '#08080b'; g.fillRect(0, hy, W, H - hy);
    for (let i = 0; i < 8; i++) {
      const cx = W * (0.44 + i * 0.075 + rnd() * 0.02), cw = u * (0.018 + rnd() * 0.012), ch = H * (0.06 + rnd() * 0.12);
      g.beginPath(); g.moveTo(cx, hy + 1); g.lineTo(cx, hy - ch); g.lineTo(cx + cw * 0.4, hy - ch - cw * (rnd() * 1.2)); g.lineTo(cx + cw, hy - ch * (0.8 + rnd() * 0.15)); g.lineTo(cx + cw, hy + 1); g.fill();
      g.fillRect(cx - cw * 0.2, hy - ch - 0.5, cw * 0.3, 1);
    }
    g.strokeStyle = 'rgba(232,228,216,0.25)'; g.lineWidth = 1;
    g.beginPath(); g.moveTo(0, hy); g.lineTo(W, hy); g.stroke();
  },

  /* 6 · RÜZGÂR BAHÇESİ (v74) — şafak: gül-şeftali ufuk, sol üstte ışınlı
     soluk güneş, çağlayanlı uzak adacıklar, kuşlar, pembe bulut denizi. */
  gokada(g, wd, W, H, u, rnd) {
    sky(g, W, H, [[0, '#191538'], [0.34, '#43295a'], [0.62, '#a9587a'], [0.82, '#f09a7e'], [1, '#f8c894']]);
    stars(g, W, H, 26, rnd, '#fff0f6', 0.35, 0.4);
    const sx = W * 0.2, sy = H * 0.32, sr = u * 0.085;
    g.save(); g.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 9; i++) {
      const a = -0.3 + i * 0.36 + rnd() * 0.1;
      g.fillStyle = ca('#ffd8c0', (0.04 + rnd() * 0.04).toFixed(3));
      g.beginPath(); g.moveTo(sx, sy); g.arc(sx, sy, u * 0.9, a, a + 0.07); g.closePath(); g.fill();
    }
    glow(g, sx, sy, sr * 5, '#ffb89a', 0.42);
    g.restore();
    const sg = g.createRadialGradient(sx - sr * 0.3, sy - sr * 0.3, sr * 0.1, sx, sy, sr);
    sg.addColorStop(0, '#fffaf0'); sg.addColorStop(0.7, '#ffe2c8'); sg.addColorStop(1, '#ffc2a8');
    g.fillStyle = sg; g.beginPath(); g.arc(sx, sy, sr, 0, TAU); g.fill();
    for (const [fx, fy, fr] of [[0.47, 0.2, 0.05], [0.9, 0.3, 0.06], [0.07, 0.64, 0.04], [0.64, 0.5, 0.03]]) {
      const x = W * fx, y = H * fy, r = u * fr;
      const lg = g.createLinearGradient(0, y, 0, y + r * 3.4);
      lg.addColorStop(0, 'rgba(255,236,240,0.55)'); lg.addColorStop(1, 'rgba(255,236,240,0)');
      g.fillStyle = lg; g.fillRect(x + r * 0.42, y + r * 0.1, Math.max(1, r * 0.12), r * 3.4);
      g.fillStyle = 'rgba(96,52,92,0.6)';
      g.beginPath(); g.moveTo(x - r, y); g.quadraticCurveTo(x - r * 0.4, y + r * 0.9, x + r * 0.1, y + r * 1.3); g.quadraticCurveTo(x + r * 0.5, y + r * 0.7, x + r, y); g.closePath(); g.fill();
      g.beginPath(); g.arc(x - r * 0.35, y - r * 0.12, r * 0.3, 0, TAU); g.fill();
      g.beginPath(); g.arc(x + r * 0.22, y - r * 0.22, r * 0.36, 0, TAU); g.fill();
      g.fillRect(x + r * 0.6, y - r * 0.9, r * 0.12, r * 0.9);
    }
    g.strokeStyle = 'rgba(70,36,70,0.6)'; g.lineWidth = Math.max(0.7, u * 0.004); g.lineCap = 'round';
    for (const [bx, by, bs] of [[0.35, 0.13, 1], [0.39, 0.17, 0.7], [0.32, 0.19, 0.8]]) {
      const x = W * bx, y = H * by, k = u * 0.012 * bs;
      g.beginPath(); g.moveTo(x - k, y - k * 0.4); g.quadraticCurveTo(x - k * 0.4, y - k * 0.6, x, y); g.quadraticCurveTo(x + k * 0.4, y - k * 0.6, x + k, y - k * 0.4); g.stroke();
    }
    g.lineCap = 'butt';
    g.save(); g.globalCompositeOperation = 'lighter'; flatGlow(g, W * 0.5, H * 0.84, W * 0.7, H * 0.08, '#ffc0a0', 0.2); g.restore();
    for (let i = 0; i < 8; i++) lump(g, W * (i * 0.15 - 0.04), H * (0.86 + rnd() * 0.06), W * (0.14 + rnd() * 0.08), 'rgba(255,218,204,1)', 'rgba(190,104,130,1)', 0.86);
  },

  /* 7 · TUZ TABANI — ufka batan iri altın güneş, uzak masalar, güneşi
     aynalayan perspektifli tuz kabuğu. */
  tuzla(g, wd, W, H, u, rnd) {
    const hy = H * 0.7, sx = W * 0.53;
    sky(g, W, H, [[0, '#0e0a1c'], [0.35, '#2a1830'], [0.58, '#5e3232'], [0.7, '#b0683a'], [1, '#b0683a']]);
    stars(g, W, H, 22, rnd, '#fff0d8', 0.4, 0.35);
    const sr = u * 0.15;
    glow(g, sx, hy, sr * 4.5, wd.color, 0.4);
    g.save(); g.beginPath(); g.rect(0, 0, W, hy); g.clip();
    const sg = g.createLinearGradient(0, hy - sr, 0, hy);
    sg.addColorStop(0, '#fff2cc'); sg.addColorStop(1, '#f0a050');
    g.fillStyle = sg; g.beginPath(); g.arc(sx, hy, sr, 0, TAU); g.fill();
    flatGlow(g, sx, hy - sr * 0.1, sr * 1.8, sr * 0.14, '#8a4630', 0.55);
    g.restore();
    g.fillStyle = 'rgba(58,30,34,0.9)';
    for (const [mx0, mw, mh] of [[0.02, 0.14, 0.05], [0.72, 0.12, 0.04], [0.86, 0.16, 0.07]]) {
      const x = W * mx0, w = W * mw, h = H * mh;
      g.beginPath(); g.moveTo(x, hy + 1); g.lineTo(x + w * 0.14, hy - h); g.lineTo(x + w * 0.82, hy - h); g.lineTo(x + w, hy + 1); g.fill();
    }
    const l = g.createLinearGradient(0, hy, 0, H);
    l.addColorStop(0, '#caa074'); l.addColorStop(0.18, '#6e4c3a'); l.addColorStop(1, '#1c140f');
    g.fillStyle = l; g.fillRect(0, hy, W, H - hy);
    g.save(); g.globalCompositeOperation = 'lighter';
    flatGlow(g, sx, hy + (H - hy) * 0.35, sr * 0.9, (H - hy) * 0.5, '#ffd68c', 0.45);
    g.restore();
    /* tuz kabuğu: DÜZENSİZ çokgen çatlakları, perspektifle yassılır.
       İlk paso düzgün ışınsal ızgaraydı ve "retro ızgara" okundu. */
    g.strokeStyle = 'rgba(255,238,204,0.16)'; g.lineWidth = Math.max(0.6, u * 0.0035);
    for (let row = 0; row < 6; row++) {
      const t0 = row / 6, y = hy + (H - hy) * Math.pow(t0 + 0.08, 1.6), cw = W * (0.05 + t0 * 0.12), ch = (H - hy) * (0.05 + t0 * 0.1);
      for (let x = (row % 2) * cw * 0.5 - cw; x < W + cw; x += cw) {
        const jx = (rnd() - 0.5) * cw * 0.3, jy = (rnd() - 0.5) * ch * 0.4;
        g.beginPath();
        g.moveTo(x + jx, y + jy); g.lineTo(x + cw * 0.5 + jx, y - ch * 0.5 + jy); g.lineTo(x + cw + jx, y + jy);
        g.moveTo(x + cw * 0.5 + jx, y - ch * 0.5 + jy); g.lineTo(x + cw * 0.5 + jx * 0.5, y - ch * 1.2);
        g.stroke();
      }
    }
    g.strokeStyle = 'rgba(255,240,210,0.5)'; g.beginPath(); g.moveTo(0, hy); g.lineTo(W, hy); g.stroke();
  },

  /* 8 · DONMUŞ GÖL — kuzey ışığı perdeleri, sivri buz dağları, ışığı
     aynalayan donmuş göl. */
  buzul(g, wd, W, H, u, rnd) {
    const hy = H * 0.78, ly = H * 0.86;
    sky(g, W, H, [[0, '#02050c'], [0.45, '#061628'], [0.78, '#0f2d46'], [1, '#08182a']]);
    stars(g, W, H, 80, rnd, '#eaf6ff', 0.8, 0.5);
    const aurora = (base, amp, hgt, cA, cB, ph, fr, aMul) => {
      g.save(); g.globalCompositeOperation = 'lighter';
      const st = Math.max(1, W / 170);
      for (let x = 0; x < W; x += st) {
        const t = x / W;
        const y = base + Math.sin(t * fr + ph) * amp + Math.sin(t * fr * 2.3 + ph * 1.7) * amp * 0.35;
        const h = hgt * (0.55 + 0.45 * Math.sin(t * fr * 1.7 + ph * 0.6));
        const e = aMul * (0.35 + 0.65 * Math.pow(Math.sin(Math.PI * Math.min(1, t * 1.15)), 0.7)) * (0.75 + 0.25 * Math.sin(t * 40 + ph));
        const lg = g.createLinearGradient(0, y - h, 0, y);
        lg.addColorStop(0, ca(cB, 0)); lg.addColorStop(0.6, ca(cB, 0.12 * e)); lg.addColorStop(0.9, ca(cA, 0.5 * e)); lg.addColorStop(1, ca(cA, 0));
        g.fillStyle = lg; g.fillRect(x, y - h, st + 0.6, h + 1);
      }
      g.restore();
    };
    aurora(H * 0.4, H * 0.07, H * 0.34, '#5af0c0', '#6ab8ff', 0.8, 5, 1);
    aurora(H * 0.28, H * 0.05, H * 0.22, '#8cdcff', '#a890ff', 2.6, 4, 0.6);
    const mx = W * 0.17, my = H * 0.2, mr = u * 0.075;
    glow(g, mx, my, mr * 4, wd.color, 0.24);
    orb(g, mx, my, mr, wd.moon, true);
    const far = hills(g, W, H, hy - H * 0.02, H * 0.2, 9, rnd, '#12304a', true);
    rimLine(g, W, far, '#bfe6ff', 0.16, Math.max(0.7, u * 0.004));
    const near = hills(g, W, H, hy + H * 0.04, H * 0.1, 7, rnd, '#081a2a', true);
    rimLine(g, W, near, '#9fd0e8', 0.14, Math.max(0.7, u * 0.004));
    const l = g.createLinearGradient(0, ly, 0, H);
    l.addColorStop(0, '#16405a'); l.addColorStop(1, '#040c16');
    g.fillStyle = l; g.fillRect(0, ly, W, H - ly);
    g.save(); g.globalCompositeOperation = 'lighter';
    flatGlow(g, W * 0.55, ly + (H - ly) * 0.3, W * 0.4, (H - ly) * 0.4, '#5af0c0', 0.14);
    g.restore();
    g.strokeStyle = 'rgba(220,244,255,0.45)'; g.lineWidth = 1;
    g.beginPath(); g.moveTo(0, ly); g.lineTo(W, ly); g.stroke();
    g.strokeStyle = 'rgba(220,244,255,0.1)';
    for (let i = 0; i < 5; i++) { const x = W * (0.45 + rnd() * 0.5), y = ly + (H - ly) * (0.2 + rnd() * 0.7); g.beginPath(); g.moveTo(x, y); g.lineTo(x + W * 0.1, y + (rnd() - 0.5) * 4); g.stroke(); }
  },

  /* 9 · KEMİK BAHÇESİ — sepya pus, iri soluk ay, ufka yatmış dev bir
     göğüs kafesi, kemik ağaçları. */
  kemikbahce(g, wd, W, H, u, rnd) {
    const hy = H * 0.8;
    sky(g, W, H, [[0, '#0a0806'], [0.45, '#1f180d'], [0.78, '#4a3a1c'], [1, '#22190c']]);
    stars(g, W, H, 30, rnd, '#fff4d8', 0.5, 0.35);
    const mx = W * 0.2, my = H * 0.3, mr = u * 0.15;
    glow(g, mx, my, mr * 4, wd.color, 0.24);
    orb(g, mx, my, mr, wd.moon, true);
    hills(g, W, H, hy - H * 0.02, H * 0.07, 6, rnd, '#2c2213', false);
    fogBand(g, W, hy, H * 0.05, '#c8a860', 0.16, rnd);
    const base = hy + H * 0.08;
    const ribs = [];
    for (let i = 0; i < 5; i++) {
      const t = i / 4;
      ribs.push({ x: W * (0.56 + t * 0.4), w: W * (0.06 - t * 0.015), h: H * (0.34 - t * 0.14) });
    }
    /* kaburga BORU değil HİLAL: omurgada kalın, toprağa inen uçta sivri.
       Sabit kalınlıkta çizgi ilk iki pasoda "çit/boru" okundu. */
    g.lineCap = 'round';
    g.strokeStyle = '#3a2e1a'; g.lineWidth = u * 0.03;
    g.beginPath(); ribs.forEach((r, i) => (i ? g.lineTo(r.x + r.w * 0.3, base - r.h) : g.moveTo(r.x + r.w * 0.3, base - r.h))); g.stroke();
    g.lineCap = 'butt';
    for (const r of ribs) {
      const th = u * 0.03, tx = r.x + r.w * 0.3, ty = base - r.h;
      g.beginPath(); g.moveTo(tx, ty - th * 0.5);
      g.quadraticCurveTo(r.x - r.w * 1.5, ty - th * 0.3, r.x - r.w * 1.15, base + 1);
      g.lineTo(r.x - r.w * 1.02, base + 1);
      g.quadraticCurveTo(r.x - r.w * 0.9, ty + th * 0.8, tx, ty + th * 0.5);
      g.closePath();
      const bg = g.createLinearGradient(r.x - r.w * 1.4, 0, tx, 0);
      bg.addColorStop(0, '#d8c898'); bg.addColorStop(0.5, '#8a7650'); bg.addColorStop(1, '#3a2e1a');
      g.fillStyle = bg; g.fill();
      g.strokeStyle = 'rgba(20,14,6,0.7)'; g.lineWidth = Math.max(0.6, u * 0.003); g.stroke();
    }
    tree(g, W * 0.46, base, H * 0.24, rnd, '#2a2012', u * 0.009, false);
    const yAt = hills(g, W, H, base, H * 0.03, 5, rnd, '#120e07', false);
    g.fillStyle = 'rgba(230,214,168,0.55)';
    for (let i = 0; i < 6; i++) {
      const x = W * (0.5 + rnd() * 0.48), y = yAt(x) + H * 0.02 + rnd() * H * 0.04;
      g.beginPath(); g.ellipse(x, y, u * 0.012, u * 0.004, rnd() - 0.5, 0, TAU); g.fill();
    }
  },

  /* 10 · YILDIZ DÖKÜMHANESİ (v74) — kobalt gece; tavandan pirinç zincirlerle
     sarkan yeni dökülmüş yıldızlar; ufukta baca silueti ve buz beyazı döküm ışığı. */
  gokcark(g, wd, W, H, u, rnd) {
    sky(g, W, H, [[0, '#03040d'], [0.5, '#0a1232'], [0.84, '#15224e'], [1, '#101634']]);
    g.save(); g.globalCompositeOperation = 'lighter';
    glow(g, W * 0.72, H * 0.24, u * 0.55, '#3a5ad0', 0.2);
    glow(g, W * 0.2, H * 0.52, u * 0.4, '#6a4ac8', 0.1);
    g.restore();
    stars(g, W, H, 110, rnd, '#e8f0ff', 1, 0.5);
    const st4 = (x, y, r, col) => {
      g.fillStyle = col; g.beginPath(); g.moveTo(x, y - r);
      g.quadraticCurveTo(x + r * 0.12, y - r * 0.12, x + r, y); g.quadraticCurveTo(x + r * 0.12, y + r * 0.12, x, y + r);
      g.quadraticCurveTo(x - r * 0.12, y + r * 0.12, x - r, y); g.quadraticCurveTo(x - r * 0.12, y - r * 0.12, x, y - r); g.fill();
    };
    for (const [fx, fl, fr] of [[0.15, 0.36, 0.05], [0.31, 0.2, 0.028], [0.47, 0.11, 0.02], [0.05, 0.15, 0.018]]) {
      const x = W * fx, y = H * fl, r = u * fr;
      g.strokeStyle = 'rgba(214,162,78,0.55)'; g.lineWidth = Math.max(0.6, u * 0.0022);
      g.beginPath(); g.moveTo(x, -2); g.lineTo(x, y - r * 0.9); g.stroke();
      g.fillStyle = 'rgba(214,162,78,0.85)';
      for (let yy = 3; yy < y - r; yy += Math.max(3, u * 0.016)) g.fillRect(x - 0.9, yy, 1.8, u * 0.006);
      g.save(); g.globalCompositeOperation = 'lighter'; glow(g, x, y, r * 5, '#8fc0ff', 0.45); g.restore();
      g.save(); g.translate(x, y); g.rotate(Math.PI / 4); st4(0, 0, r * 0.62, 'rgba(214,238,255,0.9)'); g.restore();
      st4(x, y, r, '#f4faff');
    }
    const hy = H * 0.9;
    g.save(); g.globalCompositeOperation = 'lighter'; flatGlow(g, W * 0.62, hy, W * 0.7, H * 0.1, '#7fb4ff', 0.3); g.restore();
    const gl = g.createLinearGradient(0, hy, 0, H); gl.addColorStop(0, '#0b1024'); gl.addColorStop(1, '#05060c');
    g.fillStyle = gl; g.fillRect(0, hy, W, H - hy);
    g.fillStyle = '#070912';
    for (let i = 0; i < 6; i++) { const bx = W * (0.3 + i * 0.12 + rnd() * 0.04), bw = W * (0.06 + rnd() * 0.05), bh = H * (0.02 + rnd() * 0.04); g.fillRect(bx, hy - bh, bw, bh + 1); }
    const plumes = [];
    for (let i = 0; i < 9; i++) {
      const cx = W * (0.4 + i * 0.07 + rnd() * 0.02), cw = u * (0.01 + rnd() * 0.008), ch = H * (0.03 + rnd() * 0.08);
      g.fillRect(cx, hy - ch, cw, ch + 1); g.fillRect(cx - cw * 0.3, hy - ch, cw * 1.6, Math.max(1, cw * 0.4));
      plumes.push([cx + cw / 2, hy - ch - cw, cw]);
    }
    g.fillStyle = 'rgba(190,225,255,0.8)';
    for (let i = 0; i < 14; i++) g.fillRect(W * (0.3 + rnd() * 0.68), hy - H * (0.005 + rnd() * 0.03), 1.4, 1.4);
    g.save(); g.globalCompositeOperation = 'lighter';
    for (const [px, py, pw] of plumes) glow(g, px, py, pw * 4, '#bfe0ff', 0.32);
    g.restore();
    g.strokeStyle = 'rgba(143,192,255,0.35)'; g.lineWidth = 1; g.beginPath(); g.moveTo(0, hy); g.lineTo(W, hy); g.stroke();
  },
};

/* ═══════════ ÖN KATMAN — hava olayı (adaların önünde) ═══════════ */
const FRONT = {
  mezarlik(g, wd, W, H, u, rnd) { fogBand(g, W, H * 0.95, H * 0.07, '#7a2e3a', 0.24, rnd); motes(g, W, H, 10, rnd, '#ff7a80', 0.6, 1.3, 0.2, 0.9, true); },
  kul(g, wd, W, H, u, rnd) {
    g.save(); g.globalCompositeOperation = 'lighter';
    const bl = g.createLinearGradient(0, H * 0.8, 0, H);
    bl.addColorStop(0, 'rgba(255,110,40,0)'); bl.addColorStop(1, 'rgba(255,110,40,0.16)');
    g.fillStyle = bl; g.fillRect(0, H * 0.8, W, H * 0.2);
    for (let i = 0; i < 40; i++) {
      const x = rnd() * W, y = H * (0.1 + rnd() * 0.9), s = 0.6 + rnd() * 1.2, a = 0.3 + rnd() * 0.6;
      glow(g, x, y, s * 4, '#ff8a3c', a * 0.3);
      g.fillStyle = ca('#ffc080', a.toFixed(2)); g.fillRect(x, y, s, s * 2.4);
    }
    g.restore();
  },
  bataklik(g, wd, W, H, u, rnd) { fogBand(g, W, H * 0.93, H * 0.08, '#3a9a82', 0.2, rnd); motes(g, W, H, 16, rnd, '#d4ff8a', 0.7, 1.4, 0.35, 0.95, true); },
  katedral(g, wd, W, H, u, rnd) {
    fogBand(g, W, H * 0.95, H * 0.06, '#6a3aa0', 0.2, rnd);
    for (let i = 0; i < 18; i++) {
      const x = rnd() * W, y = rnd() * H, s = u * (0.004 + rnd() * 0.006);
      g.fillStyle = ca('#d04860', (0.35 + rnd() * 0.45).toFixed(2));
      g.beginPath(); g.ellipse(x, y, s * 1.6, s * 0.7, 0.6 + rnd(), 0, TAU); g.fill();
    }
  },
  hiclik(g, wd, W, H, u, rnd) { fogBand(g, W, H * 0.95, H * 0.06, '#8a8898', 0.14, rnd); motes(g, W, H, 34, rnd, '#f4f2ff', 0.4, 1, 0, 1, false); },
  gokada(g, wd, W, H, u, rnd) {
    lump(g, W * 0.02, H * 1.0, W * 0.2, 'rgba(255,222,210,1)', 'rgba(200,110,140,1)', 0.85);
    lump(g, W * 0.98, H * 0.98, W * 0.18, 'rgba(255,222,210,1)', 'rgba(200,110,140,1)', 0.8);
    for (let i = 0; i < 22; i++) {
      const x = rnd() * W, y = rnd() * H, k = u * (0.005 + rnd() * 0.006);
      g.fillStyle = ca(i % 3 ? '#ffc8da' : '#fff0f4', (0.5 + rnd() * 0.45).toFixed(2));
      g.beginPath(); g.ellipse(x, y, k * 1.6, k * 0.8, rnd() * 3, 0, TAU); g.fill();
    }
  },
  tuzla(g, wd, W, H, u, rnd) {
    g.save(); g.globalCompositeOperation = 'lighter';
    flatGlow(g, W * 0.53, H * 0.72, W * 0.7, H * 0.12, '#ffd68c', 0.12);
    g.restore();
    motes(g, W, H, 22, rnd, '#ffe8b8', 0.4, 1, 0.3, 1, false);
  },
  buzul(g, wd, W, H, u, rnd) {
    fogBand(g, W, H * 0.94, H * 0.06, '#8cdcff', 0.13, rnd);
    for (let i = 0; i < 70; i++) {
      const x = rnd() * W, y = rnd() * H, r = 0.4 + rnd() * rnd() * 1.6;
      g.fillStyle = ca('#f0f8ff', (0.3 + rnd() * 0.55).toFixed(2));
      g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
    }
  },
  kemikbahce(g, wd, W, H, u, rnd) { fogBand(g, W, H * 0.95, H * 0.06, '#b89a58', 0.16, rnd); motes(g, W, H, 26, rnd, '#ffe296', 0.4, 1.1, 0.1, 1, false); },
  gokcark(g, wd, W, H, u, rnd) {
    motes(g, W, H, 16, rnd, '#cfe6ff', 0.5, 1.2, 0.35, 1, true);
    motes(g, W, H, 6, rnd, '#ffd08a', 0.5, 1.0, 0.5, 1, true);
    fogBand(g, W, H * 0.97, H * 0.05, '#3a5ab0', 0.16, rnd);
  },
};

const rng = (seed) => { let s = seed | 0 || 1; return () => (s = (s * 16807) % 2147483647) / 2147483647; };
const unit = (W, H) => Math.min(W, H * 1.6);

export function paintBiomeBack(g, wd, W, H) {
  if (!(W >= 2 && H >= 2)) return;      // v75: 0 boyutlu tuvalde hills() adımı 0 → sonsuz döngü
  g.save();
  (BACK[wd.floor] || BACK.mezarlik)(g, wd, W, H, unit(W, H), rng(wd.id * 104729 + 3));
  g.restore();
}
export function paintBiomeFront(g, wd, W, H) {
  if (!(W >= 2 && H >= 2)) return;
  g.save();
  (FRONT[wd.floor] || FRONT.mezarlik)(g, wd, W, H, unit(W, H), rng(wd.id * 7717 + 11));
  g.restore();
}
