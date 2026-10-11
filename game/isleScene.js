/* ═══════════════════════════════════════════════════════════
   isleScene.js — GÖK ADALARI (v38, 2026-09-22)

   Kullanıcı: "gök ada tasarımlarını değiştirmelisin, mantığa uygun güzel
   tasarımlar olsun, birbirlerine benzemesinler."

   Teşhis (v35 kod üretimi): kırk sprite'ın hepsi AYNI iso kare plaka +
   AYNI gri gotik taş yapıydı. Dünya kimliği yalnız tonlamada kalıyordu;
   150×94 kartta on dünya tek bir "gri kale" okunuyordu. Üstelik kare
   plaka bir TOPRAK PARÇASI değil bir fayanstı — "mantıksız" hissi oradan.

   YENİ DİL:
   ① ADA KOPARILMIŞ BİR TOPRAK PARÇASIDIR. Organik elips tepe (dünyanın
     zemini: çim · kül · yosun · tuz · kar), önde toprak dudağı, altta
     sivrilen kaya — ve kopan yerden SARKAN şey dünyayı anlatır (kök ·
     lav damlası · sarkıt · kristal · kemik · pirinç yörünge halkası).
   ② HER ADA KENDİ HİKÂYESİNİ TAŞIR: dünya başına dört AYRI arketip
     (3 görev + boss), kırkı da farklı siluet. Aynı arketip iki dünyada
     tekrar etmez (katedralin kulesi ≠ mezarlığın çan kulesi ≠ buz sarayı).
   ③ TEK IŞIK: sol üst. Ön yüz lit, yan yüz gölge, tepe açık. Dünyanın
     ışıması (pencere · kor · kristal) BÜTÇEDİR: ada başına bir-iki kaynak.
   ④ VARLIK YOK, İNDİRME YOK. Boyama skyMap önbelleğinde bir kez olur.

   Sözleşme (skyMap ile): (x, y) = plato merkezi, rx = plato yarı genişliği.
   `room` = y'nin üstünde kalan boş pay; yapı ona sığacak kadar KISILIR
   (taç kesilmez — v33 kuralı). `ISLE_BOSS_DEPTH` boss madalyonunun
   kaydırmasını besler (ui.js), yani derinlik tek yerde yaşar.
   ═══════════════════════════════════════════════════════════ */

const TAU = Math.PI * 2;
const HX = {};
function hx(h) {
  let v = HX[h];
  if (!v) v = HX[h] = [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  return v;
}
function sh(h, f, a) {
  const c = hx(h), r = Math.min(255, c[0] * f) | 0, g = Math.min(255, c[1] * f) | 0, b = Math.min(255, c[2] * f) | 0;
  return a == null ? 'rgb(' + r + ',' + g + ',' + b + ')' : 'rgba(' + r + ',' + g + ',' + b + ',' + a + ')';
}
const rng = (seed) => { let s = seed | 0 || 1; return () => (s = (s * 16807) % 2147483647) / 2147483647; };
const OL = 'rgba(8,6,12,0.62)';

/* ═══════════ İLKELLER ═══════════ */
function path(g, pts) {
  g.beginPath(); g.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]);
  g.closePath();
}
function stroke(c, w) { const g = c.g; g.strokeStyle = OL; g.lineWidth = c.lw * (w || 1); g.lineJoin = 'round'; g.stroke(); }
function poly(c, pts, fill, noLine) { path(c.g, pts); c.g.fillStyle = fill; c.g.fill(); if (!noLine) stroke(c); }
function glow(g, x, y, r, h, a) {
  if (!(r > 0.5)) return;
  g.save(); g.globalCompositeOperation = 'lighter';
  const v = g.createRadialGradient(x, y, 0, x, y, r);
  v.addColorStop(0, sh(h, 1, a)); v.addColorStop(0.4, sh(h, 1, a * 0.35)); v.addColorStop(1, sh(h, 1, 0));
  g.fillStyle = v; g.fillRect(x - r, y - r, r * 2, r * 2);
  g.restore();
}
function shadow(c, x, y, w) {
  const g = c.g; g.fillStyle = 'rgba(6,5,12,0.34)';
  g.beginPath(); g.ellipse(x, y, w, w * 0.3, 0, 0, TAU); g.fill();
}
/** Dikdörtgen prizma: ön yüz ortada x, tabanı y. Yan yüz sağa-arkaya. */
function box(c, x, y, w, h, d, col, noTop) {
  const g = c.g, dy = d * 0.5, x0 = x - w / 2, x1 = x + w / 2, t = y - h;
  poly(c, [[x1, y], [x1 + d, y - dy], [x1 + d, t - dy], [x1, t]], sh(col, 0.58));
  if (!noTop) poly(c, [[x0, t], [x1, t], [x1 + d, t - dy], [x0 + d, t - dy]], sh(col, 1.22));
  const fg = g.createLinearGradient(x0, 0, x1, 0);
  fg.addColorStop(0, sh(col, 1.1)); fg.addColorStop(1, sh(col, 0.86));
  g.fillStyle = fg; g.fillRect(x0, t, w, h);
  const ao = g.createLinearGradient(0, y - h * 0.35, 0, y);
  ao.addColorStop(0, 'rgba(0,0,0,0)'); ao.addColorStop(1, 'rgba(6,4,10,0.28)');
  g.fillStyle = ao; g.fillRect(x0, y - h * 0.35, w, h * 0.35);
  g.beginPath(); g.rect(x0, t, w, h); stroke(c);
  return { x, x0, x1, t, y, w, h, d, dy, col };
}
/** Sırtı cepheye paralel çatı. */
function roofX(c, b, rh, col) {
  const e = b.w * 0.06, ry = b.t - b.dy / 2 - rh;
  poly(c, [[b.x1, b.t], [b.x1 + b.d, b.t - b.dy], [b.x1 + b.d / 2, ry]], sh(b.col, 0.52));
  const g = c.g, lg = g.createLinearGradient(0, ry, 0, b.t);
  lg.addColorStop(0, sh(col, 1.2)); lg.addColorStop(1, sh(col, 0.8));
  poly(c, [[b.x0 - e, b.t + e * 0.4], [b.x1 + e, b.t + e * 0.4], [b.x1 + b.d / 2, ry], [b.x0 + b.d / 2, ry]], lg);
  return ry;
}
/** Alınlığı cepheye bakan çatı. */
function roofZ(c, b, rh, col) {
  const e = b.w * 0.07, cx = b.x, ap = b.t - rh;
  poly(c, [[cx, ap], [b.x1 + e, b.t + e * 0.3], [b.x1 + e + b.d, b.t - b.dy + e * 0.3], [cx + b.d, ap - b.dy]], sh(col, 0.72));
  poly(c, [[b.x0 - e, b.t + e * 0.3], [b.x1 + e, b.t + e * 0.3], [cx, ap]], sh(b.col, 0.98));
  c.g.strokeStyle = sh(col, 1.05); c.g.lineWidth = c.lw * 1.8;
  c.g.beginPath(); c.g.moveTo(b.x0 - e, b.t + e * 0.3); c.g.lineTo(cx, ap); c.g.lineTo(b.x1 + e, b.t + e * 0.3); c.g.stroke();
  return ap;
}
function spire(c, cx, t, w, h, d, col) {
  const dy = d * 0.5, ap = [cx + d / 2, t - dy / 2 - h];
  poly(c, [[cx + w / 2, t], [cx + w / 2 + d, t - dy], ap], sh(col, 0.56));
  poly(c, [[cx - w / 2, t], [cx + w / 2, t], ap], sh(col, 1.05));
  return ap;
}
/** Kemerli açıklık (pointed=gotik). lit → ışıyan pencere. */
function arch(c, x, y, w, h, fill, pointed, lit) {
  const g = c.g, r = w / 2;
  g.beginPath(); g.moveTo(x - r, y); g.lineTo(x - r, y - h + r);
  if (pointed) { g.quadraticCurveTo(x - r, y - h + r * 0.1, x, y - h); g.quadraticCurveTo(x + r, y - h + r * 0.1, x + r, y - h + r); }
  else g.arc(x, y - h + r, r, Math.PI, 0);
  g.lineTo(x + r, y); g.closePath();
  g.fillStyle = fill; g.fill();
  if (lit) glow(g, x, y - h * 0.5, Math.max(w, h) * 1.3, lit, 0.32);
}
function cyl(c, x, y, rw, h, col) {
  const g = c.g, ry = rw * 0.3;
  g.beginPath(); g.moveTo(x - rw, y - h); g.lineTo(x - rw, y);
  g.ellipse(x, y, rw, ry, 0, Math.PI, 0, true); g.lineTo(x + rw, y - h); g.closePath();
  const lg = g.createLinearGradient(x - rw, 0, x + rw, 0);
  lg.addColorStop(0, sh(col, 0.95)); lg.addColorStop(0.3, sh(col, 1.18)); lg.addColorStop(1, sh(col, 0.52));
  g.fillStyle = lg; g.fill(); stroke(c);
  g.beginPath(); g.ellipse(x, y - h, rw, ry, 0, 0, TAU); g.fillStyle = sh(col, 1.25); g.fill(); stroke(c);
  return y - h;
}
function dome(c, x, y, rw, rh, col) {
  const g = c.g;
  g.beginPath(); g.ellipse(x, y, rw, rh, 0, Math.PI, TAU); g.ellipse(x, y, rw, rw * 0.28, 0, 0, Math.PI);
  const rg = g.createRadialGradient(x - rw * 0.4, y - rh * 0.65, rw * 0.05, x, y - rh * 0.2, rw * 1.1);
  rg.addColorStop(0, sh(col, 1.45)); rg.addColorStop(0.5, sh(col, 1)); rg.addColorStop(1, sh(col, 0.5));
  g.fillStyle = rg; g.fill(); stroke(c);
  return y - rh;
}
/** Düz siluetin kalınlığı: arkada koyu kopya, önde açık. */
function ext(c, draw, d, lit, dark) {
  const g = c.g;
  g.save(); g.translate(d, -d * 0.5); draw(g); g.fillStyle = dark; g.fill(); stroke(c); g.restore();
  draw(g); g.fillStyle = lit; g.fill(); stroke(c);
}
function crystal(c, x, y, w, h, rot, col, lit) {
  const g = c.g;
  g.save(); g.translate(x, y); g.rotate(rot);
  poly(c, [[-w / 2, 0], [0, w * 0.2], [0, -h], [-w / 2, -h * 0.74]], sh(col, 1.2));
  poly(c, [[0, w * 0.2], [w / 2, 0], [w / 2, -h * 0.74], [0, -h]], sh(col, 0.66));
  g.strokeStyle = 'rgba(255,255,255,0.55)'; g.lineWidth = c.lw * 0.8;
  g.beginPath(); g.moveTo(-w * 0.3, -h * 0.1); g.lineTo(-w * 0.3, -h * 0.66); g.stroke();
  g.restore();
  if (lit) glow(g, x, y - h * 0.45, h * 0.9, lit, 0.22);
}
function deadTree(c, x, y, h, col, rnd, knob) {
  const g = c.g;
  poly(c, [[x - h * 0.06, y], [x + h * 0.06, y], [x + h * 0.022, y - h * 0.44], [x - h * 0.02, y - h * 0.44]], col, true);
  g.strokeStyle = col; g.lineCap = 'round';
  const br = (x0, y0, a, len, w, d) => {
    const x1 = x0 + Math.cos(a) * len, y1 = y0 + Math.sin(a) * len;
    g.lineWidth = w; g.beginPath(); g.moveTo(x0, y0);
    g.quadraticCurveTo((x0 + x1) / 2 + (rnd() - 0.5) * len * 0.35, (y0 + y1) / 2, x1, y1); g.stroke();
    if (knob && d === 0) { g.fillStyle = col; g.beginPath(); g.arc(x1, y1, w * 1.1, 0, TAU); g.fill(); }
    if (d > 0) {
      br(x1, y1, a - 0.38 - rnd() * 0.4, len * 0.72, w * 0.62, d - 1);
      br(x1, y1, a + 0.34 + rnd() * 0.4, len * 0.68, w * 0.62, d - 1);
    }
  };
  br(x, y - h * 0.42, -Math.PI / 2 - 0.5, h * 0.26, h * 0.045, 3);
  br(x, y - h * 0.42, -Math.PI / 2 + 0.45, h * 0.3, h * 0.045, 3);
  br(x, y - h * 0.3, -Math.PI / 2 - 1.1, h * 0.18, h * 0.03, 2);
  g.lineCap = 'butt';
}
function pine(c, x, y, h, col, snow) {
  const g = c.g;
  g.fillStyle = sh(col, 0.5); g.fillRect(x - h * 0.03, y - h * 0.15, h * 0.06, h * 0.15);
  for (let i = 0; i < 3; i++) {
    const b = y - h * (0.1 + i * 0.26), w = h * (0.34 - i * 0.08), t = b - h * 0.42;
    poly(c, [[x - w, b], [x, t], [x + w, b]], sh(col, 1));
    poly(c, [[x + w * 0.08, t + h * 0.04], [x + w, b], [x + w * 0.1, b - h * 0.02]], sh(col, 0.6), true);
    if (snow) poly(c, [[x - w * 0.55, b - (b - t) * 0.5], [x, t], [x + w * 0.35, b - (b - t) * 0.6], [x - w * 0.1, b - (b - t) * 0.45]], snow, true);
  }
}
function candle(c, x, y, h, acc) {
  const g = c.g;
  g.fillStyle = '#e8dcc0'; g.fillRect(x - h * 0.12, y - h, h * 0.24, h);
  g.fillStyle = '#ffe8a0'; g.beginPath(); g.ellipse(x, y - h - h * 0.22, h * 0.09, h * 0.2, 0, 0, TAU); g.fill();
  glow(g, x, y - h * 1.2, h * 1.6, acc, 0.45);
}
function smoke(c, x, y, s, n, col, under) {
  for (let i = 0; i < n; i++) {
    const t = i / n, px = x + Math.sin(t * 3.2) * s * 0.25 + t * s * 0.35, py = y - t * s * 1.3, r = s * (0.14 + t * 0.2);
    const g = c.g; g.save(); g.globalAlpha = 0.55 - t * 0.4;
    g.fillStyle = sh(col, 1); g.beginPath(); g.arc(px, py, r, 0, TAU); g.fill(); g.restore();
    if (under && i < 2) glow(g, px, py + r * 0.4, r * 1.4, under, 0.18);
  }
}
function column(c, x, y, rw, h, col, broken, rnd) {
  const g = c.g;
  cyl(c, x, y, rw * 1.35, h * 0.06, col);
  const top = y - h * 0.06 - h * (broken ? 0.94 : 0.84);
  g.beginPath(); g.moveTo(x - rw, y - h * 0.06); g.lineTo(x - rw, top + (broken ? rw * 0.5 : 0));
  if (broken) { g.lineTo(x - rw * 0.3, top - rw * 0.4); g.lineTo(x + rw * 0.2, top + rw * 0.3); g.lineTo(x + rw, top - rw * 0.2); }
  else g.lineTo(x + rw, top);
  g.lineTo(x + rw, y - h * 0.06); g.closePath();
  const lg = g.createLinearGradient(x - rw, 0, x + rw, 0);
  lg.addColorStop(0, sh(col, 0.95)); lg.addColorStop(0.3, sh(col, 1.2)); lg.addColorStop(1, sh(col, 0.55));
  g.fillStyle = lg; g.fill(); stroke(c);
  g.strokeStyle = 'rgba(0,0,0,0.16)'; g.lineWidth = c.lw * 0.7;
  for (const k of [-0.45, 0.1, 0.6]) { g.beginPath(); g.moveTo(x + rw * k, y - h * 0.08); g.lineTo(x + rw * k, top + rw * 0.6); g.stroke(); }
  if (!broken) box(c, x - rw * 0.1, top, rw * 2.7, h * 0.08, rw * 0.9, col);
  return top;
}

/* ═══════════ ADA GÖVDESİ ═══════════ */
function island(c, x, y, rx, o) {
  const g = c.g, M = c.M, rnd = c.rnd, ry = rx * 0.3, lip = rx * 0.15, dep = rx * o.depth;
  const tipX = x + rx * (rnd() - 0.5) * 0.42, tipY = y + lip + dep;
  if (o.hang === 'ring') ring(c, x, y + lip + dep * 0.3, rx, true);
  const L = [], R = [], N = 6;
  for (let i = 1; i < N; i++) {
    const t = i / N, base = rx * Math.pow(1 - t, 0.78);
    const cx = x + (tipX - x) * t, yy = y + lip * 0.8 + t * dep;
    L.push([cx - base * (i % 2 ? 0.84 : 1.02) * (0.94 + rnd() * 0.12), yy + (rnd() - 0.5) * rx * 0.07]);
    R.push([cx + base * (i % 2 ? 1.0 : 0.86) * (0.94 + rnd() * 0.12), yy + (rnd() - 0.5) * rx * 0.07]);
  }
  const body = [[x - rx, y + lip * 0.4]].concat(L, [[tipX, tipY]], R.slice().reverse(), [[x + rx, y + lip * 0.4]]);
  const bg = g.createLinearGradient(0, y, 0, tipY);
  bg.addColorStop(0, sh(M.rock, 1.1)); bg.addColorStop(1, sh(M.low, 1));
  path(g, body); g.fillStyle = bg; g.fill();
  g.save(); path(g, body); g.clip();
  g.fillStyle = 'rgba(6,5,12,0.36)';
  path(g, [[x + rx * 0.08, y], [x + rx * 1.2, y], [x + rx * 1.2, tipY], [tipX + rx * 0.02, tipY]]); g.fill();
  g.fillStyle = 'rgba(255,244,226,0.08)';
  for (let i = 0; i < L.length - 1; i += 2) path(g, [L[i], L[i + 1], [x - rx * 0.1, L[i][1] + rx * 0.1]]), g.fill();
  g.strokeStyle = 'rgba(0,0,0,0.26)'; g.lineWidth = c.lw;
  for (const k of [0.3, 0.58]) {
    const yy = y + lip + dep * k;
    g.beginPath(); g.moveTo(x - rx, yy); g.quadraticCurveTo(x, yy + rx * 0.1, x + rx, yy - rx * 0.05); g.stroke();
  }
  const bl = g.createLinearGradient(0, tipY - dep * 0.6, 0, tipY);
  bl.addColorStop(0, sh(M.bounce, 1, 0)); bl.addColorStop(1, sh(M.bounce, 1, 0.34));
  g.fillStyle = bl; g.fillRect(x - rx * 1.2, tipY - dep * 0.6, rx * 2.4, dep * 0.6);
  if (o.hang === 'salt' || o.hang === 'frost') {
    g.fillStyle = o.hang === 'salt' ? 'rgba(250,244,228,0.5)' : 'rgba(220,244,255,0.45)';
    for (let i = 0; i < 6; i++) { const yy = y + lip + dep * (0.1 + i * 0.12); g.fillRect(x - rx, yy, rx * 2, Math.max(0.6, rx * 0.018)); }
  }
  g.restore();
  path(g, body); stroke(c);
  hang(c, o.hang, x, y, rx, lip, dep, L, R, tipX, tipY);
  /* dudak (toprak kesiti) */
  g.beginPath(); g.ellipse(x, y + lip, rx, ry, 0, 0, Math.PI); g.lineTo(x - rx, y);
  g.ellipse(x, y, rx, ry, 0, Math.PI, 0, true); g.closePath();
  const lg = g.createLinearGradient(0, y, 0, y + ry + lip);
  lg.addColorStop(0, sh(M.soil, 1.15)); lg.addColorStop(1, sh(M.soil, 0.7));
  g.fillStyle = lg; g.fill(); stroke(c);
  /* tepe */
  g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, TAU);
  const tg = g.createLinearGradient(x - rx * 0.6, y - ry, x + rx * 0.6, y + ry);
  tg.addColorStop(0, sh(M.top, 1.28)); tg.addColorStop(1, sh(M.top, 0.82));
  g.fillStyle = tg; g.fill(); stroke(c);
  /* kenar saçağı */
  if (o.edge) {
    g.fillStyle = o.edge;
    for (let k = 0; k < 11; k++) {
      /* YUVARLAK saçak: sivri üçgen 1:1 bakışta "diş" okundu */
      const a = Math.PI * (0.06 + k * 0.088), px = x + Math.cos(a) * rx, py = y + Math.sin(a) * ry, len = lip * (0.25 + rnd() * 0.45), w = rx * 0.1;
      g.beginPath(); g.moveTo(px - w, py - 0.5); g.bezierCurveTo(px - w, py + len * 1.2, px + w, py + len * 1.2, px + w, py - 0.5); g.fill();
    }
  }
  /* tepe dokusu: iki yumuşak leke + kıvılcım/benek */
  g.save(); g.beginPath(); g.ellipse(x, y, rx * 0.98, ry * 0.96, 0, 0, TAU); g.clip();
  g.fillStyle = 'rgba(0,0,0,0.14)';
  g.beginPath(); g.ellipse(x + rx * 0.35, y + ry * 0.3, rx * 0.6, ry * 0.6, 0, 0, TAU); g.fill();
  if (o.speck) {
    g.fillStyle = o.speck;
    for (let i = 0; i < 14; i++) { g.beginPath(); g.ellipse(x + (rnd() - 0.5) * rx * 1.7, y + (rnd() - 0.5) * ry * 1.6, rx * 0.03, rx * 0.012, 0, 0, TAU); g.fill(); }
  }
  g.restore();
  g.strokeStyle = 'rgba(255,250,236,0.36)'; g.lineWidth = c.lw * 1.2;
  g.beginPath(); g.ellipse(x, y, rx * 0.96, ry * 0.92, 0, Math.PI * 1.06, Math.PI * 1.8); g.stroke();
  if (o.hang === 'ring') ring(c, x, y + lip + dep * 0.3, rx, false);
  /* süzülen iki kaya */
  for (const sd of [-1, 1]) {
    const px = x + sd * rx * (0.92 + rnd() * 0.25), py = y + lip + dep * (0.5 + rnd() * 0.35), r = rx * (0.07 + rnd() * 0.05);
    poly(c, [[px - r, py], [px + r, py - r * 0.2], [px + r * 0.3, py + r * 1.1]], sh(M.rock, 0.9));
    g.fillStyle = sh(M.top, 1.1); g.beginPath(); g.ellipse(px, py - r * 0.05, r * 0.95, r * 0.3, 0, 0, TAU); g.fill();
  }
}
function ring(c, x, y, rx, back) {
  const g = c.g;
  g.strokeStyle = back ? sh(c.M.acc2, 0.55) : sh(c.M.acc2, 1.1); g.lineWidth = rx * 0.05;
  g.beginPath(); g.ellipse(x, y, rx * 1.3, rx * 0.26, -0.12, back ? Math.PI : 0, back ? TAU : Math.PI); g.stroke();
  if (!back) {
    g.strokeStyle = 'rgba(255,244,210,0.5)'; g.lineWidth = rx * 0.012;
    g.beginPath(); g.ellipse(x, y - rx * 0.012, rx * 1.3, rx * 0.26, -0.12, 0.2, Math.PI - 0.2); g.stroke();
    g.fillStyle = sh(c.M.acc, 1); g.beginPath(); g.arc(x + rx * 1.1, y + rx * 0.02, rx * 0.06, 0, TAU); g.fill();
    glow(g, x + rx * 1.1, y + rx * 0.02, rx * 0.25, c.M.acc, 0.5);
  }
}
function hang(c, kind, x, y, rx, lip, dep, L, R, tipX, tipY) {
  const g = c.g, M = c.M, rnd = c.rnd;
  if (kind === 'roots' || kind === 'moss') {
    g.strokeStyle = kind === 'moss' ? sh(M.top, 0.9) : sh(M.soil, 0.8); g.lineCap = 'round';
    const pts = L.concat(R).filter((_, i) => i % 2 === 0);
    for (const p of pts) {
      const len = rx * (0.25 + rnd() * 0.45);
      g.lineWidth = c.lw * (0.8 + rnd());
      g.beginPath(); g.moveTo(p[0], p[1]);
      g.bezierCurveTo(p[0] + rx * 0.08, p[1] + len * 0.35, p[0] - rx * 0.08, p[1] + len * 0.7, p[0] + (rnd() - 0.5) * rx * 0.1, p[1] + len); g.stroke();
    }
    if (kind === 'moss') {
      g.lineWidth = Math.max(0.6, c.lw * 0.7);
      for (let k = 0; k < 9; k++) {
        const a = Math.PI * (0.1 + k * 0.1), px = x + Math.cos(a) * rx, py = y + lip + Math.sin(a) * rx * 0.3;
        g.beginPath(); g.moveTo(px, py); g.lineTo(px + (rnd() - 0.5) * 2, py + rx * (0.15 + rnd() * 0.35)); g.stroke();
      }
    }
    g.lineCap = 'butt';
  } else if (kind === 'falls') {
    hang(c, 'roots', x, y, rx, lip, dep, L, R, tipX, tipY);
    fall(c, x + rx * 0.62, y + lip + rx * 0.18, tipY + rx * 0.35, rx * 0.05);
  } else if (kind === 'basalt') {
    for (let k = 0; k < 7; k++) {
      const f = -0.72 + k * 0.24, px = x + f * rx, w = rx * 0.15;
      const top = y + lip + rx * 0.3 * Math.sqrt(Math.max(0, 1 - f * f)) - rx * 0.05;
      const len = rx * (0.14 + rnd() * 0.3) * (1 - Math.abs(f) * 0.5);
      poly(c, [[px - w / 2, top], [px, top], [px, top + len + w * 0.15], [px - w / 2, top + len]], sh(M.rock, 1.25));
      poly(c, [[px, top], [px + w / 2, top], [px + w / 2, top + len], [px, top + len + w * 0.15]], sh(M.rock, 0.7));
    }
    glow(g, tipX, tipY, rx * 0.4, M.acc, 0.22);
  } else if (kind === 'lava') {
    g.save(); g.beginPath(); g.moveTo(x - rx, y); L.forEach((p) => g.lineTo(p[0], p[1])); g.lineTo(tipX, tipY);
    R.slice().reverse().forEach((p) => g.lineTo(p[0], p[1])); g.lineTo(x + rx, y); g.closePath(); g.clip();
    g.globalCompositeOperation = 'lighter'; g.lineCap = 'round';
    for (let k = 0; k < 3; k++) {
      const x0 = x + (k - 1) * rx * 0.5, y0 = y + lip;
      for (const [w, a] of [[rx * 0.08, 0.14], [rx * 0.03, 0.5], [rx * 0.012, 0.9]]) {
        g.strokeStyle = sh(M.acc, 1, a); g.lineWidth = w;
        g.beginPath(); g.moveTo(x0, y0); g.quadraticCurveTo(x0 + rx * 0.12, y0 + dep * 0.3, x0 + (tipX - x0) * 0.5, y0 + dep * (0.5 + k * 0.12)); g.stroke();
      }
    }
    g.restore();
    for (let k = 0; k < 2; k++) {
      const px = x + (k ? 0.35 : -0.2) * rx, py = y + lip + rx * 0.3 * 0.9;
      g.fillStyle = sh(M.acc, 1.1); g.beginPath(); g.ellipse(px, py + rx * 0.12, rx * 0.03, rx * 0.1, 0, 0, TAU); g.fill();
      glow(g, px, py + rx * 0.12, rx * 0.25, M.acc, 0.5);
    }
  } else if (kind === 'icicle' || kind === 'frost') {
    for (let k = 0; k < 9; k++) {
      const a = Math.PI * (0.08 + k * 0.105), px = x + Math.cos(a) * rx * 0.96, py = y + lip + Math.sin(a) * rx * 0.28, len = rx * (0.14 + rnd() * 0.32) * (k % 2 ? 0.6 : 1), w = rx * 0.05;
      poly(c, [[px - w, py - 1], [px + w, py - 1], [px + w * 0.1, py + len]], '#cfeeff', true);
      poly(c, [[px + w * 0.05, py - 1], [px + w, py - 1], [px + w * 0.1, py + len]], '#7ab8d8', true);
    }
  } else if (kind === 'crystal') {
    for (const [f, sz, rot] of [[0.3, 0.42, 3.0], [0.55, 0.3, 3.5], [0.72, 0.36, 2.8]]) {
      const i = Math.floor(f * L.length), p = f < 0.5 ? L[i] : R[L.length - 1 - i] || R[0];
      crystal(c, p[0], p[1], rx * 0.14, rx * sz, rot, M.acc2, null);
      glow(g, p[0], p[1] + rx * sz * 0.4, rx * sz, M.acc, 0.28);
    }
  } else if (kind === 'bone') {
    g.lineCap = 'round';
    /* kaya içine GÖMÜLÜ kemik: kısa ve aşağı bakar (uzun ve yana açıkken "bacak" okundu) */
    for (const [p, a, l] of [[L[2], 2.0, 0.22], [R[1], 1.1, 0.2], [L[3], 1.7, 0.16]]) {
      if (!p) continue;
      const x1 = p[0] + Math.cos(a) * rx * l, y1 = p[1] + Math.sin(a) * rx * l;
      g.strokeStyle = OL; g.lineWidth = rx * 0.07; g.beginPath(); g.moveTo(p[0], p[1]); g.lineTo(x1, y1); g.stroke();
      g.strokeStyle = sh(M.stone, 1); g.lineWidth = rx * 0.045; g.beginPath(); g.moveTo(p[0], p[1]); g.lineTo(x1, y1); g.stroke();
      g.fillStyle = sh(M.stone, 1); g.beginPath(); g.arc(x1, y1, rx * 0.04, 0, TAU); g.fill();
    }
    g.lineCap = 'butt';
  } else if (kind === 'shard') {
    for (let k = 0; k < 4; k++) {
      const px = tipX + (rnd() - 0.5) * rx * 1.4, py = tipY - dep * 0.2 + rnd() * rx * 0.5, s = rx * (0.06 + rnd() * 0.07);
      g.save(); g.translate(px, py); g.rotate(rnd() * TAU);
      poly(c, [[-s, 0], [0, -s * 0.8], [s, -s * 0.1], [s * 0.1, s]], '#34343e');
      poly(c, [[-s, 0], [0, -s * 0.8], [s * 0.1, s]], '#5a5864', true);
      g.restore();
    }
  }
}

/* ═══════════ 40 YAPI — dünya başına 3 görev + boss ═══════════
   Her fonksiyon (c, x, y) alır; s = rx. `H` tablosu yerli yüksekliktir
   (rx cinsinden) — taç kesilmesin diye kısma bundan hesaplanır. */

/* 1 · MEZARLIK */
function tomb(c, x, y, z, k, rot) {
  const g = c.g; g.save(); g.translate(x, y); g.rotate(rot); shadow(c, z * 0.1, 0, z * 0.4);
  const w = z * 0.6, h = z;
  const f = k === 1
    ? (gg) => path(gg, [[-w * 0.14, 0], [w * 0.14, 0], [w * 0.14, -h * 0.64], [w * 0.5, -h * 0.64], [w * 0.5, -h * 0.84], [w * 0.14, -h * 0.84], [w * 0.14, -h * 1.1], [-w * 0.14, -h * 1.1], [-w * 0.14, -h * 0.84], [-w * 0.5, -h * 0.84], [-w * 0.5, -h * 0.64], [-w * 0.14, -h * 0.64]])
    : (gg) => { gg.beginPath(); gg.moveTo(-w / 2, 0); gg.lineTo(-w / 2, -h + w / 2); gg.arc(0, -h + w / 2, w / 2, Math.PI, 0); gg.lineTo(w / 2, 0); gg.closePath(); };
  ext(c, f, z * 0.14, sh(c.M.stone, 1.05), sh(c.M.stone, 0.5));
  if (k !== 1) { g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(-w * 0.26, -h * 0.62, w * 0.52, Math.max(0.6, h * 0.05)); g.fillRect(-w * 0.18, -h * 0.5, w * 0.36, Math.max(0.6, h * 0.04)); }
  g.restore();
}
function mz1(c, x, y) {
  const s = c.s, g = c.g;
  shadow(c, x - 0.42 * s, y + 0.02 * s, 0.22 * s);
  deadTree(c, x - 0.42 * s, y + 0.02 * s, 1.35 * s, '#1a1310', c.rnd);
  for (const [dx, dy, z, k, r] of [[0.22, -0.12, 0.2, 1, -0.06], [0.0, 0.05, 0.22, 0, 0.1], [0.5, 0.0, 0.24, 0, -0.14], [0.26, 0.16, 0.18, 0, 0.05]]) tomb(c, x + dx * s, y + dy * s, z * s, k, r);
  const lx = x + 0.72 * s, ly = y + 0.02 * s;
  g.fillStyle = '#16100c'; g.fillRect(lx - s * 0.018, ly - s * 0.62, s * 0.036, s * 0.62);
  g.fillRect(lx - s * 0.018, ly - s * 0.62, s * 0.14, s * 0.03);
  box(c, lx + s * 0.1, ly - s * 0.44, s * 0.09, s * 0.12, s * 0.03, '#2a1c16');
  g.fillStyle = sh(c.M.acc, 1.1); g.fillRect(lx + s * 0.075, ly - s * 0.54, s * 0.05, s * 0.08);
  glow(g, lx + s * 0.1, ly - s * 0.5, s * 0.34, c.M.acc, 0.55);
}
function mz2(c, x, y) {
  const s = c.s, M = c.M, g = c.g;
  shadow(c, x + 0.05 * s, y + 0.06 * s, 0.5 * s);
  box(c, x + 0.02 * s, y + 0.1 * s, 0.6 * s, 0.05 * s, 0.26 * s, M.stone);
  const b = box(c, x, y + 0.05 * s, 0.72 * s, 0.46 * s, 0.24 * s, M.stone, true);
  const ap = roofZ(c, b, 0.22 * s, '#3a3440');
  for (const k of [-0.26, 0.26]) { g.fillStyle = sh(M.stone, 1.25); g.fillRect(x + k * s - 0.035 * s, b.t + 0.02 * s, 0.07 * s, b.h - 0.02 * s); g.strokeStyle = OL; g.lineWidth = c.lw; g.strokeRect(x + k * s - 0.035 * s, b.t + 0.02 * s, 0.07 * s, b.h - 0.02 * s); }
  arch(c, x, b.y, 0.22 * s, 0.34 * s, '#140a0c', false, M.acc);
  g.fillStyle = sh(M.acc, 0.9, 0.7); g.fillRect(x - 0.05 * s, b.y - 0.14 * s, 0.1 * s, 0.14 * s);
  g.beginPath(); g.arc(x, ap + 0.1 * s, 0.05 * s, 0, TAU); g.fillStyle = '#140a0c'; g.fill();
  glow(g, x, ap + 0.1 * s, 0.12 * s, M.acc, 0.6);
  tomb(c, x - 0.58 * s, y + 0.1 * s, 0.18 * s, 1, 0.12);
}
function mz3(c, x, y) {
  const s = c.s, M = c.M, g = c.g;
  shadow(c, x, y + 0.04 * s, 0.4 * s);
  const w = box(c, x - 0.42 * s, y + 0.08 * s, 0.32 * s, 0.3 * s, 0.12 * s, M.stone);
  g.fillStyle = sh(M.top, 1.1); g.beginPath(); g.ellipse(w.x + 0.05 * s, w.t, 0.18 * s, 0.03 * s, 0, 0, TAU); g.fill();
  const b = box(c, x + 0.1 * s, y, 0.34 * s, 1.18 * s, 0.17 * s, M.stone);
  g.strokeStyle = 'rgba(0,0,0,0.2)'; g.lineWidth = c.lw * 0.7;
  for (let i = 1; i < 6; i++) { g.beginPath(); g.moveTo(b.x0, b.t + i * b.h / 6); g.lineTo(b.x1, b.t + i * b.h / 6); g.stroke(); }
  arch(c, b.x, b.t + 0.3 * s, 0.2 * s, 0.26 * s, '#0e080a', false);
  g.fillStyle = '#b08a4a'; g.beginPath(); g.moveTo(b.x - 0.07 * s, b.t + 0.24 * s); g.quadraticCurveTo(b.x - 0.07 * s, b.t + 0.1 * s, b.x, b.t + 0.1 * s);
  g.quadraticCurveTo(b.x + 0.07 * s, b.t + 0.1 * s, b.x + 0.07 * s, b.t + 0.24 * s); g.closePath(); g.fill(); stroke(c, 0.7);
  arch(c, b.x, b.t + 0.72 * s, 0.07 * s, 0.16 * s, sh(M.acc, 1), true, M.acc);
  const ap = spire(c, b.x, b.t - b.dy * 0, 0.4 * s, 0.5 * s, 0.17 * s, '#3a3440');
  g.fillStyle = '#1a1310'; g.fillRect(ap[0] - 0.012 * s, ap[1] - 0.14 * s, 0.024 * s, 0.14 * s); g.fillRect(ap[0] - 0.05 * s, ap[1] - 0.1 * s, 0.1 * s, 0.022 * s);
  tomb(c, x + 0.56 * s, y + 0.1 * s, 0.2 * s, 0, -0.1);
}
function mzb(c, x, y) {
  const s = c.s, M = c.M, g = c.g;
  shadow(c, x, y + 0.08 * s, 0.8 * s);
  const t2 = box(c, x + 0.5 * s, y - 0.04 * s, 0.22 * s, 0.95 * s, 0.12 * s, M.stone);
  spire(c, t2.x, t2.t, 0.26 * s, 0.46 * s, 0.12 * s, '#322c38');
  const b = box(c, x + 0.05 * s, y + 0.08 * s, 1.1 * s, 0.6 * s, 0.3 * s, M.stone, true);
  roofX(c, b, 0.3 * s, '#322c38');
  for (let r = 0; r < 2; r++) for (let i = 0; i < 4; i++) { const wx = b.x0 + (i + 0.5) * b.w / 4; if (Math.abs(wx - (x - 0.1 * s)) < 0.18 * s) continue; arch(c, wx, b.t + (0.26 + r * 0.26) * s, 0.08 * s, 0.16 * s, sh(M.acc, 1), true, r ? null : M.acc); }
  const t = box(c, x - 0.1 * s, y + 0.1 * s, 0.32 * s, 1.36 * s, 0.16 * s, M.stone);
  for (let i = 0; i < 3; i++) arch(c, t.x, t.t + (0.28 + i * 0.32) * s, 0.09 * s, 0.18 * s, sh(M.acc, 1), true, i === 0 ? M.acc : null);
  arch(c, t.x, t.y, 0.16 * s, 0.26 * s, '#120a0c', false);
  const ap = spire(c, t.x, t.t, 0.38 * s, 0.7 * s, 0.16 * s, '#322c38');
  g.fillStyle = sh(M.acc, 1); g.beginPath(); g.arc(ap[0], ap[1], 0.03 * s, 0, TAU); g.fill(); glow(g, ap[0], ap[1], 0.2 * s, M.acc, 0.6);
  deadTree(c, x - 0.72 * s, y + 0.1 * s, 0.9 * s, '#1a1310', c.rnd);
}

/* 2 · KÜL */
function k1(c, x, y) {
  const s = c.s, M = c.M, g = c.g;
  for (const [dx, h, dy] of [[-0.36, 1.1, -0.04], [0.14, 0.8, 0.08], [0.52, 0.55, -0.02]]) {
    shadow(c, x + dx * s, y + dy * s, 0.16 * s);
    deadTree(c, x + dx * s, y + dy * s, h * s, '#0e0806', c.rnd);
    g.save(); g.globalCompositeOperation = 'lighter'; g.strokeStyle = sh(M.acc, 1, 0.8); g.lineWidth = c.lw * 0.9;
    g.beginPath(); g.moveTo(x + dx * s, y + dy * s - 0.02 * s); g.lineTo(x + dx * s + 0.015 * s, y + dy * s - h * s * 0.18); g.lineTo(x + dx * s - 0.01 * s, y + dy * s - h * s * 0.32); g.stroke(); g.restore();
    glow(g, x + dx * s, y + dy * s, 0.2 * s, M.acc, 0.4);
  }
  smoke(c, x - 0.3 * s, y - 1.0 * s, 0.5 * s, 4, '#3a2c28');
  g.fillStyle = sh(M.acc, 1.2); for (let i = 0; i < 6; i++) { g.beginPath(); g.arc(x + (c.rnd() - 0.4) * s * 1.2, y + (c.rnd() - 0.5) * s * 0.3, 0.02 * s, 0, TAU); g.fill(); }
}
function k2(c, x, y) {
  const s = c.s, M = c.M, g = c.g;
  shadow(c, x, y + 0.06 * s, 0.5 * s);
  const ch = box(c, x + 0.24 * s, y - 0.06 * s, 0.18 * s, 1.0 * s, 0.1 * s, '#3a2c26');
  g.fillStyle = '#0a0605'; g.fillRect(ch.x0 + 0.02 * s, ch.t - 0.02 * s, ch.w - 0.04 * s, 0.03 * s);
  smoke(c, ch.x + 0.03 * s, ch.t - 0.12 * s, 0.6 * s, 5, '#4a3a34', M.acc);
  const b = box(c, x - 0.08 * s, y + 0.08 * s, 0.8 * s, 0.4 * s, 0.24 * s, M.stone, true);
  roofX(c, b, 0.14 * s, '#1e1412');
  arch(c, b.x - 0.1 * s, b.y, 0.3 * s, 0.28 * s, sh(M.acc, 1.05), false, M.acc);
  glow(g, b.x - 0.1 * s, b.y - 0.08 * s, 0.5 * s, M.acc, 0.35);
  g.fillStyle = '#ffe0a0'; g.fillRect(b.x - 0.2 * s, b.y - 0.08 * s, 0.2 * s, 0.06 * s);
  poly(c, [[x - 0.62 * s, y + 0.16 * s], [x - 0.44 * s, y + 0.16 * s], [x - 0.47 * s, y + 0.08 * s], [x - 0.38 * s, y + 0.06 * s], [x - 0.66 * s, y + 0.06 * s], [x - 0.59 * s, y + 0.08 * s]], '#221816');
}
function k3(c, x, y) {
  const s = c.s, M = c.M, g = c.g;
  const L = [x - 0.72 * s, y + 0.12 * s], R = [x + 0.7 * s, y + 0.1 * s], tl = [x - 0.18 * s, y - 0.62 * s], tr = [x + 0.18 * s, y - 0.64 * s];
  poly(c, [L, tl, [x, y - 0.6 * s], [x + 0.05 * s, y + 0.16 * s]], sh(M.rock, 1.2));
  poly(c, [[x + 0.05 * s, y + 0.16 * s], [x, y - 0.6 * s], tr, R], sh(M.rock, 0.7));
  g.beginPath(); g.ellipse(x, y - 0.62 * s, 0.19 * s, 0.05 * s, 0, 0, TAU); g.fillStyle = sh(M.acc, 1.1); g.fill(); stroke(c);
  glow(g, x, y - 0.64 * s, 0.5 * s, M.acc, 0.55);
  g.save(); g.globalCompositeOperation = 'lighter'; g.lineCap = 'round';
  for (const [w, a] of [[0.1, 0.15], [0.045, 0.55], [0.018, 0.95]]) {
    g.strokeStyle = sh(M.acc, 1.1, a); g.lineWidth = w * s;
    g.beginPath(); g.moveTo(x - 0.06 * s, y - 0.6 * s); g.bezierCurveTo(x - 0.2 * s, y - 0.3 * s, x + 0.05 * s, y - 0.15 * s, x - 0.1 * s, y + 0.14 * s); g.stroke();
  }
  g.restore();
  smoke(c, x + 0.05 * s, y - 0.78 * s, 0.55 * s, 5, '#3c2c28', M.acc);
}
function kb(c, x, y) {
  const s = c.s, M = c.M, g = c.g;
  g.save(); g.globalCompositeOperation = 'lighter';
  g.strokeStyle = sh(M.acc, 1, 0.8); g.lineWidth = 0.05 * s; g.beginPath(); g.ellipse(x, y + 0.1 * s, 0.78 * s, 0.2 * s, 0, 0, TAU); g.stroke(); g.restore();
  glow(g, x, y + 0.14 * s, 0.9 * s, M.acc, 0.2);
  const obs = '#221a1a';
  const sp = (bx, by, w, h) => { const b = box(c, bx, by, w, h, w * 0.5, obs); const ap = spire(c, b.x, b.t, w * 1.2, w * 2.4, w * 0.5, '#181212'); return [b, ap]; };
  sp(x + 0.46 * s, y - 0.02 * s, 0.2 * s, 0.9 * s);
  const b = box(c, x + 0.02 * s, y + 0.08 * s, 1.0 * s, 0.58 * s, 0.3 * s, obs, true);
  for (let i = 0; i < 7; i++) { const px = b.x0 + (i + 0.5) * b.w / 7; poly(c, [[px - 0.06 * s, b.t], [px + 0.06 * s, b.t], [px + 0.015 * s, b.t - (i % 2 ? 0.14 : 0.24) * s]], '#181212'); }
  for (let i = 0; i < 4; i++) arch(c, b.x0 + (i + 0.5) * b.w / 4, b.t + 0.3 * s, 0.07 * s, 0.14 * s, sh(M.acc, 1.1), true, M.acc);
  const [t, ap] = sp(x - 0.16 * s, y + 0.1 * s, 0.3 * s, 1.26 * s);
  for (let i = 0; i < 3; i++) arch(c, t.x, t.t + (0.26 + i * 0.3) * s, 0.08 * s, 0.16 * s, sh(M.acc, 1.1), true, i ? null : M.acc);
  arch(c, t.x, t.y, 0.16 * s, 0.28 * s, sh(M.acc, 0.9), false, M.acc);
  glow(g, ap[0], ap[1] + 0.2 * s, 0.3 * s, M.acc, 0.3);
}

/* 3 · BATAKLIK */
function pond(c, x, y, rw, M) {
  const g = c.g;
  g.beginPath(); g.ellipse(x, y, rw, rw * 0.28, 0, 0, TAU);
  const lg = g.createLinearGradient(0, y - rw * 0.28, 0, y + rw * 0.28);
  lg.addColorStop(0, '#08201a'); lg.addColorStop(1, '#1e5a48'); g.fillStyle = lg; g.fill(); stroke(c);
  g.strokeStyle = sh(M.acc, 1, 0.45); g.lineWidth = c.lw * 0.8;
  g.beginPath(); g.ellipse(x - rw * 0.2, y + rw * 0.05, rw * 0.4, rw * 0.06, 0, 0, TAU); g.stroke();
}
function b1(c, x, y) {
  const s = c.s, M = c.M, g = c.g;
  pond(c, x + 0.05 * s, y + 0.06 * s, 0.6 * s, M);
  const hy = y - 0.36 * s;
  g.fillStyle = '#2a2016';
  for (const [dx, dy] of [[-0.24, 0.02], [0.24, 0.02], [-0.14, 0.12], [0.3, 0.12]]) g.fillRect(x + dx * s - 0.02 * s, hy, 0.04 * s, y + dy * s - hy);
  const b = box(c, x + 0.02 * s, hy, 0.56 * s, 0.34 * s, 0.18 * s, M.wood, true);
  g.strokeStyle = 'rgba(0,0,0,0.25)'; g.lineWidth = c.lw * 0.6;
  for (let i = 1; i < 4; i++) { g.beginPath(); g.moveTo(b.x0, b.t + i * b.h / 4); g.lineTo(b.x1, b.t + i * b.h / 4); g.stroke(); }
  const ry = roofX(c, b, 0.3 * s, '#6a5a30');
  g.strokeStyle = 'rgba(40,30,10,0.5)';
  for (let i = 0; i < 6; i++) { const px = b.x0 + i * b.w / 5; g.beginPath(); g.moveTo(px, b.t + 0.02 * s); g.lineTo(px + 0.06 * s, ry + 0.04 * s); g.stroke(); }
  arch(c, b.x - 0.12 * s, b.y, 0.12 * s, 0.22 * s, '#120c06', false);
  g.fillStyle = sh(M.acc, 1); g.fillRect(b.x + 0.08 * s, b.t + 0.1 * s, 0.1 * s, 0.1 * s); glow(g, b.x + 0.13 * s, b.t + 0.15 * s, 0.3 * s, M.acc, 0.45);
  g.strokeStyle = '#3a2c1c'; g.lineWidth = c.lw;
  g.beginPath(); g.moveTo(b.x0 - 0.1 * s, y + 0.08 * s); g.lineTo(b.x0 + 0.02 * s, b.y); g.moveTo(b.x0 - 0.02 * s, y + 0.08 * s); g.lineTo(b.x0 + 0.1 * s, b.y); g.stroke();
  const lx = x + 0.6 * s; g.fillStyle = '#2a2016'; g.fillRect(lx, y - 0.5 * s, 0.03 * s, 0.56 * s);
  g.beginPath(); g.arc(lx + 0.015 * s, y - 0.52 * s, 0.045 * s, 0, TAU); g.fillStyle = sh(M.acc, 1.1); g.fill(); glow(g, lx, y - 0.52 * s, 0.3 * s, M.acc, 0.6);
}
function mush(c, x, y, h, w, cap, M) {
  const g = c.g;
  shadow(c, x, y, w * 0.5);
  poly(c, [[x - w * 0.1, y], [x + w * 0.1, y], [x + w * 0.07, y - h], [x - w * 0.08, y - h]], '#c8c4a8');
  g.beginPath(); g.ellipse(x, y - h, w * 0.5, w * 0.34, 0, Math.PI, TAU); g.ellipse(x, y - h, w * 0.5, w * 0.1, 0, 0, Math.PI);
  const rg = g.createRadialGradient(x - w * 0.2, y - h - w * 0.25, w * 0.05, x, y - h, w * 0.6);
  rg.addColorStop(0, sh(cap, 1.5)); rg.addColorStop(1, sh(cap, 0.6)); g.fillStyle = rg; g.fill(); stroke(c);
  glow(g, x, y - h + w * 0.06, w * 0.5, M.acc, 0.3);
  g.fillStyle = sh(M.acc, 1.2);
  for (const [dx, dy, r] of [[-0.22, -0.16, 0.06], [0.1, -0.24, 0.05], [0.26, -0.1, 0.045], [-0.02, -0.08, 0.04]]) { g.beginPath(); g.arc(x + dx * w, y - h + dy * w, r * w, 0, TAU); g.fill(); }
}
function b2(c, x, y) {
  const s = c.s, M = c.M;
  mush(c, x - 0.55 * s, y + 0.04 * s, 0.34 * s, 0.34 * s, '#2a6a58', M);
  mush(c, x - 0.1 * s, y - 0.02 * s, 1.0 * s, 0.9 * s, '#3a5a7a', M);
  mush(c, x + 0.46 * s, y + 0.08 * s, 0.56 * s, 0.5 * s, '#2a6a58', M);
  mush(c, x + 0.2 * s, y + 0.16 * s, 0.2 * s, 0.2 * s, '#3a5a7a', M);
}
function b3(c, x, y) {
  const s = c.s, M = c.M, g = c.g;
  const tx = x + 0.44 * s, ty = y - 0.06 * s;
  shadow(c, tx, ty, 0.25 * s);
  poly(c, [[tx - 0.08 * s, ty], [tx + 0.08 * s, ty], [tx + 0.03 * s, ty - 0.7 * s], [tx - 0.05 * s, ty - 0.7 * s]], '#2a2016');
  for (const [dx, dy, r] of [[-0.14, -0.88, 0.26], [0.16, -0.84, 0.24], [0.0, -1.06, 0.26]]) {
    g.beginPath(); g.arc(tx + dx * s, ty + dy * s, r * s, 0, TAU);
    const rg = g.createRadialGradient(tx + dx * s - r * s * 0.4, ty + dy * s - r * s * 0.4, 0, tx + dx * s, ty + dy * s, r * s);
    rg.addColorStop(0, sh(M.top, 1.5)); rg.addColorStop(1, sh(M.top, 0.6)); g.fillStyle = rg; g.fill(); stroke(c);
  }
  g.strokeStyle = sh(M.top, 1.1); g.lineWidth = c.lw * 0.9;
  for (let i = 0; i < 9; i++) { const px = tx + (i / 8 - 0.5) * 0.6 * s; g.beginPath(); g.moveTo(px, ty - 0.82 * s); g.lineTo(px + 0.01 * s, ty - (0.3 + c.rnd() * 0.3) * s); g.stroke(); }
  pond(c, x - 0.2 * s, y + 0.06 * s, 0.5 * s, M);
  g.fillStyle = '#4a9a5a';
  for (const [dx, dy] of [[-0.4, 0.06], [-0.1, 0.1], [-0.28, 0.0]]) { g.beginPath(); g.ellipse(x + dx * s, y + dy * s, 0.07 * s, 0.022 * s, 0, 0.3, TAU); g.lineTo(x + dx * s, y + dy * s); g.fill(); }
  g.fillStyle = '#ffe0f0'; g.beginPath(); g.arc(x - 0.1 * s, y + 0.09 * s, 0.022 * s, 0, TAU); g.fill();
  g.strokeStyle = '#1e3a24'; g.lineWidth = c.lw;
  for (let i = 0; i < 6; i++) { const px = x + (0.08 + i * 0.03) * s; g.beginPath(); g.moveTo(px, y + 0.12 * s); g.lineTo(px + (i - 3) * 0.01 * s, y - (0.2 + (i % 3) * 0.08) * s); g.stroke(); }
  g.fillStyle = '#4a2e1a'; g.fillRect(x + 0.1 * s, y - 0.3 * s, 0.03 * s, 0.1 * s);
}
function bb(c, x, y) {
  const s = c.s, M = c.M, g = c.g;
  shadow(c, x, y + 0.06 * s, 0.6 * s);
  const tr = '#2e2418';
  poly(c, [[x - 0.4 * s, y + 0.1 * s], [x - 0.2 * s, y - 0.1 * s], [x - 0.24 * s, y - 0.9 * s], [x - 0.42 * s, y - 1.3 * s], [x - 0.1 * s, y - 1.16 * s], [x + 0.02 * s, y - 1.5 * s], [x + 0.12 * s, y - 1.16 * s], [x + 0.46 * s, y - 1.26 * s], [x + 0.24 * s, y - 0.9 * s], [x + 0.2 * s, y - 0.1 * s], [x + 0.44 * s, y + 0.1 * s]], tr);
  poly(c, [[x + 0.02 * s, y + 0.1 * s], [x + 0.2 * s, y - 0.1 * s], [x + 0.24 * s, y - 0.9 * s], [x + 0.46 * s, y - 1.26 * s], [x + 0.12 * s, y - 1.16 * s], [x + 0.05 * s, y - 0.9 * s]], sh(tr, 0.6), true);
  for (const [dx, dy, r] of [[-0.46, -1.4, 0.34], [0.46, -1.36, 0.32], [-0.12, -1.72, 0.4], [0.24, -1.8, 0.3], [-0.5, -1.72, 0.22]]) {
    g.beginPath(); g.arc(x + dx * s, y + dy * s, r * s, 0, TAU);
    const rg = g.createRadialGradient(x + dx * s - r * s * 0.4, y + dy * s - r * s * 0.5, 0, x + dx * s, y + dy * s, r * s);
    rg.addColorStop(0, sh(M.top, 1.4)); rg.addColorStop(1, sh(M.top, 0.5)); g.fillStyle = rg; g.fill(); stroke(c);
  }
  g.strokeStyle = sh(M.top, 0.95); g.lineWidth = c.lw;
  for (let i = 0; i < 12; i++) { const px = x + (i / 11 - 0.5) * 1.3 * s, py = y - (1.2 + Math.abs(i - 5.5) * 0.02) * s; g.beginPath(); g.moveTo(px, py); g.lineTo(px, py + (0.25 + c.rnd() * 0.35) * s); g.stroke(); }
  arch(c, x - 0.02 * s, y + 0.02 * s, 0.18 * s, 0.32 * s, '#0c0806', false);
  g.fillStyle = sh(M.acc, 0.8, 0.8); g.fillRect(x - 0.06 * s, y - 0.12 * s, 0.08 * s, 0.14 * s);
  g.beginPath(); g.arc(x - 0.04 * s, y - 0.66 * s, 0.07 * s, 0, TAU); g.fillStyle = sh(M.acc, 1.1); g.fill(); stroke(c);
  glow(g, x - 0.04 * s, y - 0.66 * s, 0.3 * s, M.acc, 0.5);
  g.strokeStyle = tr; g.lineWidth = 0.05 * s; g.lineCap = 'round';
  for (const [a, b2x] of [[-0.3, -0.7], [0.3, 0.72]]) { g.beginPath(); g.moveTo(x + a * s, y + 0.06 * s); g.quadraticCurveTo(x + (a + b2x) * 0.5 * s, y - 0.02 * s, x + b2x * s, y + 0.14 * s); g.stroke(); }
  g.lineCap = 'butt';
}

/* 4 · KATEDRAL */
function c1(c, x, y) {
  const s = c.s, M = c.M, g = c.g;
  shadow(c, x, y + 0.04 * s, 0.4 * s);
  const p = box(c, x, y + 0.06 * s, 0.34 * s, 0.22 * s, 0.14 * s, M.stone);
  const st = sh(M.stone, 1.1);
  const f = (gg) => { gg.beginPath(); gg.moveTo(p.x - 0.14 * s, p.t); gg.quadraticCurveTo(p.x - 0.12 * s, p.t - 0.5 * s, p.x - 0.07 * s, p.t - 0.66 * s);
    gg.arc(p.x, p.t - 0.72 * s, 0.09 * s, Math.PI * 0.8, Math.PI * 2.2); gg.quadraticCurveTo(p.x + 0.12 * s, p.t - 0.5 * s, p.x + 0.14 * s, p.t); gg.closePath(); };
  ext(c, f, 0.06 * s, st, sh(M.stone, 0.5));
  g.fillStyle = '#0c0814'; g.beginPath(); g.ellipse(p.x, p.t - 0.7 * s, 0.05 * s, 0.06 * s, 0, 0, TAU); g.fill();
  g.fillStyle = sh(M.acc, 1); g.beginPath(); g.arc(p.x, p.t - 0.62 * s, 0.03 * s, 0, TAU); g.fill(); glow(g, p.x, p.t - 0.62 * s, 0.2 * s, M.acc, 0.5);
  for (const [dx, dy, h] of [[-0.5, 0.06, 0.14], [-0.36, 0.14, 0.1], [0.4, 0.12, 0.12], [0.56, 0.02, 0.16], [0.24, 0.2, 0.08], [-0.2, 0.2, 0.07]]) candle(c, x + dx * s, y + dy * s, h * s, M.acc2);
}
function c2(c, x, y) {
  const s = c.s, M = c.M, g = c.g;
  shadow(c, x, y + 0.06 * s, 0.46 * s);
  for (const k of [-1, 1]) poly(c, [[x + k * 0.3 * s, y + 0.1 * s], [x + k * 0.2 * s, y + 0.1 * s], [x + k * 0.2 * s, y - 0.5 * s]], sh(M.stone, k < 0 ? 1 : 0.6));
  const b = box(c, x, y + 0.08 * s, 0.4 * s, 1.26 * s, 0.2 * s, M.stone);
  for (let i = 0; i < 3; i++) arch(c, b.x, b.t + (0.34 + i * 0.3) * s, (0.1 - i * 0.015) * s, (0.24 - i * 0.03) * s, i ? sh(M.acc2, 1) : sh(M.acc, 1), true, i ? M.acc2 : M.acc);
  arch(c, b.x, b.y, 0.14 * s, 0.24 * s, '#0a0612', true);
  for (const k of [b.x0, b.x1]) spire(c, k, b.t, 0.08 * s, 0.22 * s, 0.04 * s, M.stone);
  const ap = spire(c, b.x, b.t, 0.36 * s, 0.78 * s, 0.2 * s, '#2e2644');
  g.fillStyle = sh(M.acc, 1); g.fillRect(ap[0] - 0.012 * s, ap[1] - 0.12 * s, 0.024 * s, 0.12 * s); g.fillRect(ap[0] - 0.045 * s, ap[1] - 0.09 * s, 0.09 * s, 0.022 * s);
}
function c3(c, x, y) {
  const s = c.s, M = c.M, g = c.g;
  shadow(c, x, y + 0.06 * s, 0.7 * s);
  const x0 = x - 0.6 * s, x1 = x + 0.46 * s, by = y + 0.08 * s, d = 0.3 * s, dy = d * 0.5;
  const top = [[x0, by - 0.64 * s], [x0 + 0.22 * s, by - 0.7 * s], [x0 + 0.36 * s, by - 0.5 * s], [x0 + 0.5 * s, by - 0.56 * s], [x0 + 0.66 * s, by - 0.34 * s], [x0 + 0.8 * s, by - 0.42 * s], [x1, by - 0.62 * s]];
  const gab = [[x1, by], [x1 + d, by - dy], [x1 + d, by - 0.62 * s - dy], [x1 + d / 2, by - 0.98 * s - dy / 2], [x1, by - 0.62 * s]];
  poly(c, gab, sh(M.stone, 0.62));
  g.beginPath(); g.arc(x1 + d / 2, by - 0.6 * s - dy / 2, 0.1 * s, 0, TAU); g.fillStyle = sh(M.acc, 1); g.fill(); stroke(c);
  g.strokeStyle = '#0c0814'; g.lineWidth = c.lw; for (let i = 0; i < 4; i++) { const a = i / 4 * Math.PI; g.beginPath(); g.moveTo(x1 + d / 2 + Math.cos(a) * 0.1 * s, by - 0.6 * s - dy / 2 + Math.sin(a) * 0.1 * s); g.lineTo(x1 + d / 2 - Math.cos(a) * 0.1 * s, by - 0.6 * s - dy / 2 - Math.sin(a) * 0.1 * s); g.stroke(); }
  glow(g, x1 + d / 2, by - 0.6 * s - dy / 2, 0.36 * s, M.acc, 0.45);
  poly(c, [[x0, by]].concat(top, [[x1, by]]), sh(M.stone, 1.02));
  for (let i = 0; i < 3; i++) { const ax = x0 + (i + 0.5) * (x1 - x0) / 3; arch(c, ax, by, 0.2 * s, 0.4 * s, '#140e24', true, M.acc2); glow(g, ax, by - 0.15 * s, 0.22 * s, M.acc2, 0.25); }
  g.fillStyle = sh(M.stone, 0.9); for (const [dx, sz] of [[-0.2, 0.08], [0.1, 0.06], [0.64, 0.07]]) { poly(c, [[x + dx * s - sz * s, y + 0.2 * s], [x + dx * s + sz * s, y + 0.18 * s], [x + dx * s + sz * 0.3 * s, y + 0.12 * s]], sh(M.stone, 0.9)); }
}
function cb(c, x, y) {
  const s = c.s, M = c.M, g = c.g;
  shadow(c, x, y + 0.08 * s, 0.85 * s);
  const n = box(c, x + 0.32 * s, y - 0.02 * s, 0.84 * s, 0.6 * s, 0.34 * s, M.stone, true);
  roofX(c, n, 0.32 * s, '#2a2240');
  for (let i = 0; i < 4; i++) arch(c, n.x0 + (i + 0.5) * n.w / 4, n.t + 0.46 * s, 0.08 * s, 0.3 * s, sh(M.acc2, 1), true, i % 2 ? null : M.acc2);
  for (let i = 0; i < 4; i++) { const px = n.x0 + (i + 0.5) * n.w / 4; poly(c, [[px, n.t], [px + 0.04 * s, n.t], [px + 0.02 * s, n.t - 0.12 * s]], M.stone); }
  const f = box(c, x - 0.36 * s, y + 0.1 * s, 0.62 * s, 0.9 * s, 0.24 * s, M.stone, true);
  const ap0 = roofZ(c, f, 0.3 * s, '#2a2240');
  g.beginPath(); g.arc(f.x, f.t + 0.24 * s, 0.14 * s, 0, TAU); g.fillStyle = '#0c0814'; g.fill(); stroke(c);
  const glass = [sh(M.acc, 1.1), sh(M.acc2, 1.1), '#e0b04a', sh(M.acc, 0.8)];
  for (let i = 0; i < 12; i++) { const a0 = i / 12 * TAU; g.beginPath(); g.moveTo(f.x, f.t + 0.24 * s); g.arc(f.x, f.t + 0.24 * s, 0.12 * s, a0 + 0.04, a0 + TAU / 12 - 0.04); g.closePath(); g.fillStyle = glass[i % 4]; g.fill(); }
  g.beginPath(); g.arc(f.x, f.t + 0.24 * s, 0.035 * s, 0, TAU); g.fillStyle = '#ffe0a0'; g.fill();
  glow(g, f.x, f.t + 0.24 * s, 0.5 * s, M.acc, 0.4);
  arch(c, f.x, f.y, 0.2 * s, 0.36 * s, '#0a0612', true);
  g.fillStyle = sh(M.acc, 0.9, 0.55); g.fillRect(f.x - 0.05 * s, f.y - 0.16 * s, 0.1 * s, 0.16 * s);
  for (const k of [-1, 1]) {
    const t = box(c, f.x + k * 0.36 * s, y + 0.12 * s, 0.2 * s, 1.34 * s, 0.12 * s, M.stone);
    for (let i = 0; i < 3; i++) arch(c, t.x, t.t + (0.3 + i * 0.3) * s, 0.06 * s, 0.16 * s, sh(M.acc2, 1), true, null);
    spire(c, t.x, t.t, 0.24 * s, 0.7 * s, 0.12 * s, '#2a2240');
  }
  g.fillStyle = sh(M.acc, 1); g.fillRect(f.x - 0.012 * s, ap0 - 0.14 * s, 0.024 * s, 0.14 * s); g.fillRect(f.x - 0.05 * s, ap0 - 0.1 * s, 0.1 * s, 0.022 * s);
}

/* 5 · HİÇLİK */
function h1(c, x, y) {
  const s = c.s, M = c.M, g = c.g;
  for (const [dx, dy, h, br] of [[-0.46, -0.06, 0.95, true], [0.02, -0.1, 1.35, false], [0.44, 0.02, 0.55, true]]) { shadow(c, x + dx * s, y + dy * s, 0.14 * s); column(c, x + dx * s, y + dy * s, 0.08 * s, h * s, M.stone, br, c.rnd); }
  const fx = x + 0.1 * s, fy = y + 0.16 * s;
  g.beginPath(); g.moveTo(fx - 0.3 * s, fy - 0.07 * s); g.lineTo(fx + 0.22 * s, fy - 0.1 * s); g.ellipse(fx + 0.22 * s, fy - 0.02 * s, 0.03 * s, 0.08 * s, -0.05, -Math.PI / 2, Math.PI / 2); g.lineTo(fx - 0.3 * s, fy + 0.07 * s); g.closePath();
  const lg = g.createLinearGradient(0, fy - 0.1 * s, 0, fy + 0.07 * s); lg.addColorStop(0, sh(M.stone, 1.2)); lg.addColorStop(1, sh(M.stone, 0.55)); g.fillStyle = lg; g.fill(); stroke(c);
  g.beginPath(); g.ellipse(fx - 0.3 * s, fy, 0.03 * s, 0.07 * s, 0, 0, TAU); g.fillStyle = sh(M.stone, 1.1); g.fill(); stroke(c);
}
function h2(c, x, y) {
  const s = c.s, M = c.M, g = c.g;
  shadow(c, x, y + 0.04 * s, 0.34 * s);
  box(c, x, y + 0.08 * s, 0.5 * s, 0.08 * s, 0.24 * s, '#2a2a30');
  const b = box(c, x, y, 0.28 * s, 1.4 * s, 0.14 * s, '#141418');
  spire(c, b.x, b.t, 0.28 * s, 0.24 * s, 0.14 * s, '#141418');
  g.save(); g.globalCompositeOperation = 'lighter'; g.lineJoin = 'round';
  const pts = [[b.x - 0.02 * s, b.t + 0.12 * s], [b.x + 0.04 * s, b.t + 0.4 * s], [b.x - 0.03 * s, b.t + 0.66 * s], [b.x + 0.03 * s, b.t + 0.96 * s], [b.x, b.t + 1.26 * s]];
  for (const [w, a] of [[0.07, 0.12], [0.03, 0.4], [0.012, 0.95]]) { g.strokeStyle = sh(M.acc, 1, a); g.lineWidth = w * s; g.beginPath(); pts.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.stroke(); }
  g.restore();
  glow(g, b.x, b.t + 0.6 * s, 0.5 * s, M.acc, 0.14);
  for (const [dx, dy, sz, r] of [[-0.42, -0.9, 0.08, 0.4], [0.44, -1.1, 0.06, -0.3], [0.36, -0.5, 0.1, 0.8], [-0.34, -0.36, 0.06, -0.6]]) {
    g.save(); g.translate(x + dx * s, y + dy * s); g.rotate(r);
    poly(c, [[-sz * s, 0], [0, -sz * 0.8 * s], [sz * s, -sz * 0.1 * s], [sz * 0.2 * s, sz * s]], '#1a1a22');
    g.strokeStyle = 'rgba(240,236,228,0.75)'; g.lineWidth = c.lw * 0.8; g.beginPath(); g.moveTo(-sz * s, 0); g.lineTo(0, -sz * 0.8 * s); g.lineTo(sz * s, -sz * 0.1 * s); g.stroke();
    g.restore();
  }
}
function h3(c, x, y) {
  const s = c.s, M = c.M, g = c.g;
  shadow(c, x - 0.2 * s, y + 0.08 * s, 0.4 * s);
  for (let i = 0; i < 6; i++) box(c, x - 0.52 * s + i * 0.14 * s, y + 0.1 * s - i * 0.02 * s, 0.15 * s, (0.1 + i * 0.12) * s, 0.26 * s, M.stone);
  for (const [dx, dy, r, k] of [[0.46, -0.94, 0.12, 0.9], [0.62, -1.18, -0.18, 0.75], [0.76, -1.44, 0.3, 0.55]]) {
    g.save(); g.translate(x + dx * s, y + dy * s); g.rotate(r); g.scale(k, k);
    box(c, 0, 0, 0.15 * s, 0.09 * s, 0.26 * s, M.stone);
    g.restore();
  }
  glow(g, x + 0.9 * s, y - 1.5 * s, 0.4 * s, M.acc, 0.2);
}
function hb(c, x, y) {
  const s = c.s, M = c.M, g = c.g;
  const hx0 = x + 0.02 * s, hy = y - 1.5 * s, hr = 0.5 * s;
  glow(g, hx0, hy, hr * 2.2, M.acc, 0.25);
  g.strokeStyle = 'rgba(255,252,240,0.9)'; g.lineWidth = 0.035 * s; g.beginPath(); g.arc(hx0, hy, hr, 0, TAU); g.stroke();
  g.strokeStyle = '#040406'; g.lineWidth = 0.09 * s; g.beginPath(); g.arc(hx0, hy, hr * 0.9, 0, TAU); g.stroke();
  shadow(c, x, y + 0.08 * s, 0.7 * s);
  for (let i = 0; i < 3; i++) box(c, x, y + 0.12 * s - i * 0.1 * s, (1.3 - i * 0.3) * s, 0.1 * s, (0.5 - i * 0.1) * s, M.stone);
  const by = y - 0.18 * s;
  const back = [[x - 0.26 * s, by], [x - 0.26 * s, by - 1.1 * s], [x - 0.34 * s, by - 1.36 * s], [x - 0.14 * s, by - 1.26 * s], [x, by - 1.62 * s], [x + 0.14 * s, by - 1.26 * s], [x + 0.34 * s, by - 1.36 * s], [x + 0.26 * s, by - 1.1 * s], [x + 0.26 * s, by]];
  g.save(); g.translate(0.08 * s, -0.04 * s); poly(c, back, '#0c0c10'); g.restore();
  poly(c, back, '#1a1a20');
  g.strokeStyle = 'rgba(240,236,228,0.5)'; g.lineWidth = c.lw; g.beginPath(); back.slice(0, 5).forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.stroke();
  box(c, x, by + 0.02 * s, 0.6 * s, 0.26 * s, 0.26 * s, '#22222a');
  for (const k of [-1, 1]) box(c, x + k * 0.34 * s, by + 0.02 * s, 0.1 * s, 0.4 * s, 0.26 * s, '#22222a');
  g.fillStyle = sh(M.acc, 1); g.beginPath(); g.arc(x, by - 1.0 * s, 0.05 * s, 0, TAU); g.fill(); glow(g, x, by - 1.0 * s, 0.26 * s, M.acc, 0.6);
}

/* 6 · RÜZGÂR BAHÇESİ (v74, eski GÖKÇE ADA) — kopan kıtanın YAŞAYAN bahçesi.
   Arena paletiyle (propModels gokada) aynı dil: bal rengi kireç taşı, kiremit
   çatı, bakır pası kubbe, badem çiçeği, servi, adadan boşluğa dökülen çağlayan.
   Mor kristal + zincir dili kalktı (kullanıcı beğenmedi; arena ile çelişiyordu). */
function puffs(c, x, y, P, col) {
  const g = c.g, lw = c.lw;
  g.fillStyle = OL;
  for (const [dx, dy, r] of P) { g.beginPath(); g.arc(x + dx, y + dy, r + lw * 1.1, 0, TAU); g.fill(); }
  g.fillStyle = sh(col, 0.7);
  for (const [dx, dy, r] of P) { g.beginPath(); g.arc(x + dx, y + dy, r, 0, TAU); g.fill(); }
  g.fillStyle = col;
  for (const [dx, dy, r] of P) { g.beginPath(); g.arc(x + dx - r * 0.12, y + dy - r * 0.16, r * 0.84, 0, TAU); g.fill(); }
  g.fillStyle = sh(col, 1.14);
  for (const [dx, dy, r] of P) { g.beginPath(); g.arc(x + dx - r * 0.3, y + dy - r * 0.36, r * 0.4, 0, TAU); g.fill(); }
}
/** Badem ağacı: eğik gövde + çiçek yastıkları + süzülen yapraklar. */
function bloom(c, x, y, h, lean, col) {
  const g = c.g, M = c.M, k = lean < 0 ? -1 : 1, tx = x + lean * h * 0.3, ty = y - h * 0.6;
  shadow(c, x + lean * h * 0.2, y, h * 0.4);
  g.lineCap = 'round';
  const trunk = () => {
    g.beginPath(); g.moveTo(x, y);
    g.bezierCurveTo(x - lean * h * 0.12, y - h * 0.25, tx - lean * h * 0.1, ty + h * 0.2, tx, ty);
    g.moveTo(x + lean * h * 0.01, y - h * 0.3);
    g.quadraticCurveTo(x - k * h * 0.12, y - h * 0.4, x - k * h * 0.26, ty + h * 0.1);
  };
  trunk(); g.strokeStyle = OL; g.lineWidth = h * 0.1; g.stroke();
  trunk(); g.strokeStyle = sh(M.wood, 1.3); g.lineWidth = h * 0.062; g.stroke();
  g.lineCap = 'butt';
  const r = h * 0.2;
  puffs(c, tx, ty, [[-k * h * 0.4, h * 0.1, r * 0.78], [k * h * 0.32, h * 0.06, r * 0.86], [0, 0, r * 1.14], [-k * h * 0.16, -h * 0.13, r * 0.84], [k * h * 0.14, -h * 0.15, r * 0.74]], col);
  g.fillStyle = sh(col, 1.1);
  for (let i = 0; i < 5; i++) { g.beginPath(); g.ellipse(tx + (c.rnd() - 0.3) * h * 0.8 * k, ty + h * (0.28 + c.rnd() * 0.36), h * 0.02, h * 0.011, c.rnd() * 3, 0, TAU); g.fill(); }
}
/** Servi: alev biçimli koyu yeşil, sol üstten ışık. */
function cypress(c, x, y, h, col) {
  const g = c.g, w = h * 0.16;
  shadow(c, x, y, w * 1.1);
  g.fillStyle = sh(c.M.wood, 0.9); g.fillRect(x - w * 0.12, y - h * 0.1, w * 0.24, h * 0.1);
  const p = () => { g.beginPath(); g.moveTo(x, y - h); g.bezierCurveTo(x + w * 1.25, y - h * 0.62, x + w * 1.05, y - h * 0.16, x, y - h * 0.08);
    g.bezierCurveTo(x - w * 1.05, y - h * 0.16, x - w * 1.25, y - h * 0.62, x, y - h); g.closePath(); };
  p(); g.fillStyle = col; g.fill();
  g.save(); p(); g.clip();
  g.fillStyle = sh(col, 0.62); g.fillRect(x + w * 0.12, y - h, w * 1.4, h);
  g.fillStyle = sh(col, 1.35); g.beginPath(); g.ellipse(x - w * 0.42, y - h * 0.6, w * 0.2, h * 0.24, 0, 0, TAU); g.fill();
  g.restore();
  p(); stroke(c);
}
/** Çağlayan: açık mavi şerit + beyaz akış çizgileri + dipte buhar. */
function fall(c, x, y0, y1, w) {
  const g = c.g, h = y1 - y0;
  const lg = g.createLinearGradient(0, y0, 0, y1);
  lg.addColorStop(0, 'rgba(222,244,255,0.96)'); lg.addColorStop(0.65, 'rgba(176,222,250,0.6)'); lg.addColorStop(1, 'rgba(176,222,250,0)');
  g.beginPath(); g.moveTo(x - w, y0); g.lineTo(x + w, y0); g.lineTo(x + w * 1.6, y1); g.lineTo(x - w * 1.6, y1); g.closePath();
  g.fillStyle = lg; g.fill();
  g.strokeStyle = 'rgba(255,255,255,0.8)'; g.lineWidth = Math.max(0.5, w * 0.2); g.lineCap = 'round';
  for (const k of [-0.5, 0.1, 0.55]) { g.beginPath(); g.moveTo(x + k * w, y0 + h * 0.04); g.lineTo(x + k * w * 1.5, y0 + h * (0.46 + Math.abs(k) * 0.3)); g.stroke(); }
  g.lineCap = 'butt';
  glow(g, x, y1 - h * 0.3, w * 4, '#d8f0ff', 0.22);
}
/** Teras: kireç taşı blok, çimli tepe, önden sarkan sarmaşık. */
function terrace(c, x, y, w, h, d) {
  const M = c.M, g = c.g, b = box(c, x, y, w, h, d, M.stone, true);
  poly(c, [[b.x0, b.t], [b.x1, b.t], [b.x1 + d, b.t - b.dy], [b.x0 + d, b.t - b.dy]], sh(M.top, 1.12));
  g.strokeStyle = sh(M.top, 0.82); g.lineCap = 'round'; g.lineWidth = Math.max(0.8, c.s * 0.026);
  for (let i = 0; i < 7; i++) { const px = b.x0 + (i + 0.3 + c.rnd() * 0.4) * w / 7, len = h * (0.18 + c.rnd() * 0.4); g.beginPath(); g.moveTo(px, b.t); g.quadraticCurveTo(px + w * 0.02, b.t + len * 0.5, px, b.t + len); g.stroke(); }
  g.lineCap = 'butt';
  return b;
}
function g1(c, x, y) {
  const s = c.s, M = c.M;
  cypress(c, x + 0.56 * s, y - 0.02 * s, 0.95 * s, M.leaf);
  bloom(c, x - 0.1 * s, y + 0.06 * s, 1.05 * s, 0.6, M.acc);
  box(c, x + 0.26 * s, y + 0.16 * s, 0.22 * s, 0.07 * s, 0.08 * s, M.stone);
  box(c, x - 0.62 * s, y + 0.12 * s, 0.14 * s, 0.06 * s, 0.07 * s, M.stone);
}
/* rüzgâr değirmeni: taş gövde, kiremit külah, dört kanat */
function g2(c, x, y) {
  const s = c.s, M = c.M, g = c.g;
  shadow(c, x, y + 0.06 * s, 0.5 * s);
  bloom(c, x - 0.58 * s, y + 0.02 * s, 0.6 * s, -0.5, M.acc);
  const bx = x + 0.05 * s, by = y + 0.08 * s, w0 = 0.46 * s, w1 = 0.3 * s, h = 0.95 * s, top = by - h;
  poly(c, [[bx + w0 / 2, by], [bx + w0 / 2 + 0.08 * s, by - 0.04 * s], [bx + w1 / 2 + 0.06 * s, top - 0.03 * s], [bx + w1 / 2, top]], sh(M.stone, 0.6));
  const lg = g.createLinearGradient(bx - w0 / 2, 0, bx + w0 / 2, 0); lg.addColorStop(0, sh(M.stone, 1.12)); lg.addColorStop(1, sh(M.stone, 0.84));
  poly(c, [[bx - w0 / 2, by], [bx + w0 / 2, by], [bx + w1 / 2, top], [bx - w1 / 2, top]], lg);
  g.strokeStyle = 'rgba(70,40,20,0.22)'; g.lineWidth = c.lw * 0.7;
  for (let i = 1; i < 5; i++) { const t = i / 5, ww = (w0 + (w1 - w0) * t) / 2; g.beginPath(); g.moveTo(bx - ww, by - h * t); g.lineTo(bx + ww, by - h * t); g.stroke(); }
  arch(c, bx, by, 0.12 * s, 0.22 * s, '#2a1a10', false);
  arch(c, bx, by - 0.52 * s, 0.07 * s, 0.11 * s, sh(M.acc2, 1), false, M.acc2);
  spire(c, bx, top, w1 * 1.35, 0.28 * s, 0.07 * s, M.roof);
  const hx0 = bx, hy0 = top - 0.05 * s, L = 0.66 * s;
  for (let k = 0; k < 4; k++) {
    g.save(); g.translate(hx0, hy0); g.rotate(0.45 + k * Math.PI / 2);
    g.fillStyle = OL; g.fillRect(-0.018 * s, 0, 0.036 * s, L);
    poly(c, [[0.02 * s, L * 0.2], [0.15 * s, L * 0.25], [0.15 * s, L], [0.02 * s, L]], '#f2e6c8');
    g.strokeStyle = 'rgba(100,66,34,0.55)'; g.lineWidth = c.lw * 0.6;
    for (let i = 1; i < 4; i++) { const yy = L * (0.2 + i * 0.2); g.beginPath(); g.moveTo(0.02 * s, yy); g.lineTo(0.15 * s, yy); g.stroke(); }
    g.restore();
  }
  g.fillStyle = sh(M.wood, 1.3); g.beginPath(); g.arc(hx0, hy0, 0.045 * s, 0, TAU); g.fill(); stroke(c);
}
/* teraslı bahçe + çağlayan + bakır kubbeli köşk */
function g3(c, x, y) {
  const s = c.s, M = c.M;
  shadow(c, x, y + 0.08 * s, 0.62 * s);
  const a = terrace(c, x, y + 0.12 * s, 1.0 * s, 0.24 * s, 0.26 * s);
  const b = terrace(c, x - 0.08 * s, a.t - a.dy * 0.35, 0.62 * s, 0.3 * s, 0.18 * s);
  fall(c, b.x + 0.1 * s, b.t + 0.01 * s, y + 0.24 * s, 0.05 * s);
  cypress(c, b.x0 + 0.12 * s, b.t - b.dy * 0.3, 0.72 * s, M.leaf);
  const gz = cyl(c, b.x + 0.2 * s, b.t - b.dy * 0.4, 0.1 * s, 0.16 * s, M.stone);
  dome(c, b.x + 0.2 * s, gz, 0.12 * s, 0.13 * s, M.cu);
  bloom(c, a.x1 - 0.14 * s, a.t - a.dy * 0.1, 0.5 * s, 0.4, M.acc);
}
/* BOSS · ASMA BAHÇELER: üç teras, kiremit çatılı salon, bakır kubbeli kule,
   tepeden tabana inen çağlayan, önde iki badem ağacı */
function gb(c, x, y) {
  const s = c.s, M = c.M, g = c.g;
  shadow(c, x, y + 0.1 * s, 0.9 * s);
  const a = terrace(c, x, y + 0.14 * s, 1.5 * s, 0.26 * s, 0.34 * s);
  const b = terrace(c, x - 0.04 * s, a.t - a.dy * 0.3, 1.1 * s, 0.28 * s, 0.26 * s);
  for (let i = 0; i < 5; i++) if (i !== 3) arch(c, b.x0 + (i + 0.5) * b.w / 5, b.y - 0.01 * s, 0.07 * s, 0.12 * s, i === 1 ? sh(M.acc2, 1) : '#3a2616', false, i === 1 ? M.acc2 : null);
  const t3 = terrace(c, x - 0.06 * s, b.t - b.dy * 0.3, 0.72 * s, 0.26 * s, 0.2 * s);
  fall(c, t3.x + 0.14 * s, t3.t + 0.01 * s, a.y + 0.12 * s, 0.055 * s);
  cypress(c, t3.x0 + 0.08 * s, t3.t - t3.dy * 0.3, 0.62 * s, M.leaf);
  const hb = box(c, t3.x - 0.04 * s, t3.t - t3.dy * 0.35, 0.42 * s, 0.32 * s, 0.2 * s, M.stone, true);
  for (let i = 0; i < 3; i++) arch(c, hb.x0 + (i + 0.5) * hb.w / 3, hb.y - 0.04 * s, 0.07 * s, 0.15 * s, sh(M.acc2, 1), false, i === 1 ? M.acc2 : null);
  roofZ(c, hb, 0.2 * s, M.roof);
  const tw = box(c, t3.x1 - 0.1 * s, t3.t - t3.dy * 0.2, 0.16 * s, 0.7 * s, 0.1 * s, M.stone);
  arch(c, tw.x, tw.t + 0.22 * s, 0.06 * s, 0.12 * s, sh(M.acc2, 1), false, M.acc2);
  const dt = dome(c, tw.x + 0.05 * s, tw.t, 0.13 * s, 0.16 * s, M.cu);
  g.fillStyle = sh(M.cu, 1.25); g.fillRect(tw.x + 0.04 * s, dt - 0.12 * s, 0.02 * s, 0.12 * s);
  glow(g, tw.x + 0.05 * s, dt - 0.13 * s, 0.14 * s, M.acc2, 0.5);
  bloom(c, a.x0 + 0.2 * s, a.t - a.dy * 0.1, 0.62 * s, -0.5, M.acc);
  bloom(c, a.x1 - 0.12 * s, a.t - a.dy * 0.2, 0.54 * s, 0.5, M.acc);
}

/* 7 · TUZLA */
function cube(c, x, y, e, col, rot) {
  const g = c.g; g.save(); g.translate(x, y); g.rotate(rot || 0);
  const h = e * 0.5;
  poly(c, [[0, 0], [e * 0.87, -h], [e * 0.87, -h - e], [0, -e]], sh(col, 0.66));
  poly(c, [[0, 0], [-e * 0.87, -h], [-e * 0.87, -h - e], [0, -e]], sh(col, 1.02));
  poly(c, [[0, -e], [e * 0.87, -h - e], [0, -e * 2], [-e * 0.87, -h - e]], sh(col, 1.24));
  g.restore();
}
function t1(c, x, y) {
  const s = c.s, M = c.M, g = c.g;
  shadow(c, x, y + 0.06 * s, 0.6 * s);
  glow(g, x, y - 0.3 * s, 0.7 * s, M.acc, 0.2);
  for (const [dx, dy, e, r] of [[-0.3, 0.02, 0.28, -0.15], [0.3, 0.02, 0.24, 0.2], [0.02, -0.08, 0.42, 0.05], [-0.1, 0.16, 0.2, -0.3], [0.5, 0.14, 0.14, 0.4], [-0.56, 0.12, 0.13, -0.1], [0.16, 0.18, 0.12, 0.6]]) cube(c, x + dx * s, y + dy * s, e * s, '#ece2cc', r);
}
function t2(c, x, y) {
  const s = c.s, M = c.M, g = c.g;
  shadow(c, x, y + 0.08 * s, 0.7 * s);
  g.save(); g.translate(x, y + 0.06 * s); g.rotate(-0.16);
  g.strokeStyle = '#2e2014'; g.lineWidth = 0.05 * s; g.beginPath(); g.moveTo(0.05 * s, -0.2 * s); g.lineTo(0.12 * s, -1.2 * s); g.stroke();
  g.strokeStyle = '#6a5034'; g.lineWidth = 0.03 * s; g.stroke();
  g.lineWidth = 0.03 * s; g.beginPath(); g.moveTo(-0.26 * s, -0.95 * s); g.lineTo(0.42 * s, -1.02 * s); g.stroke();
  g.beginPath(); g.moveTo(0.4 * s, -1.0 * s); g.quadraticCurveTo(0.5 * s, -0.7 * s, 0.34 * s, -0.5 * s); g.lineTo(0.22 * s, -0.58 * s); g.lineTo(0.28 * s, -0.66 * s); g.lineTo(0.16 * s, -0.7 * s); g.lineTo(0.14 * s, -0.98 * s); g.closePath();
  g.fillStyle = '#c8b494'; g.fill(); stroke(c);
  g.beginPath(); g.moveTo(-0.66 * s, -0.36 * s); g.quadraticCurveTo(-0.5 * s, 0.06 * s, 0.1 * s, 0.04 * s); g.quadraticCurveTo(0.56 * s, 0.02 * s, 0.7 * s, -0.3 * s);
  g.lineTo(0.5 * s, -0.24 * s); g.quadraticCurveTo(0, -0.18 * s, -0.66 * s, -0.36 * s); g.closePath();
  const lg = g.createLinearGradient(0, -0.3 * s, 0, 0.04 * s); lg.addColorStop(0, sh(M.wood, 1.3)); lg.addColorStop(1, sh(M.wood, 0.7)); g.fillStyle = lg; g.fill(); stroke(c);
  g.strokeStyle = 'rgba(0,0,0,0.3)'; g.lineWidth = c.lw * 0.7;
  for (const k of [-0.14, -0.06]) { g.beginPath(); g.moveTo(-0.6 * s, k * s - 0.14 * s); g.quadraticCurveTo(0, k * s + 0.08 * s, 0.62 * s, k * s - 0.12 * s); g.stroke(); }
  g.fillStyle = '#0c0806'; g.beginPath(); g.ellipse(0.2 * s, -0.08 * s, 0.1 * s, 0.05 * s, 0.2, 0, TAU); g.fill();
  g.restore();
  g.fillStyle = sh(M.top, 1.2); g.beginPath(); g.ellipse(x - 0.05 * s, y + 0.12 * s, 0.6 * s, 0.07 * s, 0, 0, TAU); g.fill();
}
function t3(c, x, y) {
  const s = c.s, M = c.M, g = c.g;
  shadow(c, x + 0.3 * s, y, 0.3 * s);
  const a = box(c, x + 0.32 * s, y - 0.04 * s, 0.56 * s, 0.62 * s, 0.14 * s, M.stone, true);
  g.fillStyle = sh(M.top, 0.6); arch(c, a.x, a.y, 0.3 * s, 0.46 * s, '#2a1e12', false);
  poly(c, [[a.x0, a.t], [a.x0 + 0.16 * s, a.t - 0.06 * s], [a.x0 + 0.3 * s, a.t], [a.x1, a.t + 0.08 * s], [a.x1 + a.d, a.t + 0.08 * s - a.dy], [a.x0 + a.d, a.t - a.dy]], sh(M.stone, 1.2));
  const sx = x - 0.28 * s, sy = y + 0.1 * s;
  shadow(c, sx, sy, 0.26 * s);
  g.strokeStyle = OL; g.lineCap = 'round'; g.lineWidth = 0.08 * s;
  const horn = (k) => { g.beginPath(); g.moveTo(sx + k * 0.1 * s, sy - 0.3 * s); g.quadraticCurveTo(sx + k * 0.46 * s, sy - 0.32 * s, sx + k * 0.44 * s, sy - 0.62 * s); };
  for (const k of [-1, 1]) { horn(k); g.strokeStyle = OL; g.lineWidth = 0.08 * s; g.stroke(); g.strokeStyle = '#e8dcc0'; g.lineWidth = 0.05 * s; g.stroke(); }
  g.lineCap = 'butt';
  g.beginPath(); g.moveTo(sx - 0.16 * s, sy - 0.36 * s); g.quadraticCurveTo(sx, sy - 0.46 * s, sx + 0.16 * s, sy - 0.36 * s); g.lineTo(sx + 0.07 * s, sy); g.lineTo(sx - 0.07 * s, sy); g.closePath();
  g.fillStyle = '#e8dcc0'; g.fill(); stroke(c);
  g.fillStyle = '#2a1e12'; for (const k of [-1, 1]) { g.beginPath(); g.ellipse(sx + k * 0.07 * s, sy - 0.28 * s, 0.035 * s, 0.045 * s, 0, 0, TAU); g.fill(); }
}
/* v74 BOSS · KARAYA OTURMUŞ KADİRGA — "Gemi olduğu yerde kaldı": göl çekilince
   tuz kabuğuna gömülüp yan yatan gemi, gövdesini delip çıkan halit küpleri,
   kıç fenerinde hâlâ yanan ışık, kabuğun altından sızan ışık çatlakları.
   Basamaklı zigurat kalktı (kullanıcı beğenmedi). */
function tb(c, x, y) {
  const s = c.s, M = c.M, g = c.g;
  shadow(c, x, y + 0.12 * s, 0.95 * s);
  const CR = [[-0.8, 0.16], [-0.52, 0.22], [-0.3, 0.15], [0, 0.24], [0.3, 0.17], [0.6, 0.23], [0.84, 0.15]];
  g.save(); g.globalCompositeOperation = 'lighter'; g.lineCap = 'round'; g.lineJoin = 'round';
  for (const [w, a] of [[0.06, 0.25], [0.018, 0.9]]) {
    g.strokeStyle = sh(M.acc, 1, a); g.lineWidth = w * s; g.beginPath();
    CR.forEach(([px, py], i) => (i ? g.lineTo(x + px * s, y + py * s) : g.moveTo(x + px * s, y + py * s))); g.stroke();
  }
  g.restore();
  g.save(); g.translate(x, y + 0.1 * s); g.rotate(-0.09);
  const S = s, P = (px, py) => [px * S, py * S];
  const mast = (mx, y0, y1) => { g.lineCap = 'round'; for (const [w, col] of [[0.055, OL], [0.034, sh(M.wood, 1.35)]]) { g.strokeStyle = col; g.lineWidth = w * S; g.beginPath(); g.moveTo(mx * S, y0 * S); g.lineTo(mx * S, y1 * S); g.stroke(); } g.lineCap = 'butt'; };
  const yard = (mx, yy, hw) => { g.strokeStyle = OL; g.lineWidth = 0.034 * S; g.beginPath(); g.moveTo((mx - hw) * S, yy * S); g.lineTo((mx + hw) * S, yy * S); g.stroke(); g.strokeStyle = sh(M.wood, 1.3); g.lineWidth = 0.018 * S; g.stroke(); };
  const sail = (mx, y0, y1, hw, torn) => {
    const pts = [P(mx - hw, y0), P(mx + hw, y0)], n = 6;
    for (let i = 0; i <= n; i++) { const t = 1 - i / n, px = mx - hw + t * hw * 2 * (torn ? 0.7 : 1); pts.push(P(px + hw * 0.08, y1 - (i % 2 ? 0.07 : 0) - (torn && t > 0.5 ? 0.1 : 0))); }
    const lg = g.createLinearGradient(0, y0 * S, 0, y1 * S); lg.addColorStop(0, '#efe4c8'); lg.addColorStop(1, '#b8a47e');
    poly(c, pts, lg);
    g.fillStyle = 'rgba(80,56,30,0.18)'; g.fillRect((mx + hw * 0.2) * S, y0 * S, hw * 0.8 * S, (y1 - y0) * 0.8 * S);
  };
  g.strokeStyle = 'rgba(24,16,8,0.62)'; g.lineWidth = Math.max(0.6, 0.012 * S);
  for (const [ax, ay, bx2, by2] of [[0.05, -1.5, -0.86, -0.7], [0.05, -1.5, 0.56, -1.2], [0.56, -1.2, 0.98, -0.64], [0.05, -1.3, -0.6, -0.56]]) { g.beginPath(); g.moveTo(ax * S, ay * S); g.lineTo(bx2 * S, by2 * S); g.stroke(); }
  mast(0.05, -0.46, -1.52); mast(0.56, -0.5, -1.22);
  yard(0.05, -1.3, 0.3); yard(0.05, -0.96, 0.38); yard(0.56, -1.06, 0.26);
  sail(0.05, -1.3, -1.02, 0.28, false); sail(0.05, -0.96, -0.62, 0.36, true); sail(0.56, -1.06, -0.8, 0.24, false);
  poly(c, [P(0.05, -1.52), P(0.26, -1.47), P(0.05, -1.42)], '#c4503a');
  const hull = () => {
    g.beginPath(); g.moveTo(-0.86 * S, -0.68 * S); g.lineTo(-0.62 * S, -0.54 * S);
    g.quadraticCurveTo(0, -0.44 * S, 0.62 * S, -0.48 * S); g.lineTo(0.98 * S, -0.64 * S);
    g.quadraticCurveTo(0.86 * S, -0.2 * S, 0.46 * S, -0.04 * S); g.quadraticCurveTo(0, 0.04 * S, -0.56 * S, -0.02 * S);
    g.quadraticCurveTo(-0.84 * S, -0.1 * S, -0.86 * S, -0.68 * S); g.closePath();
  };
  const hg = g.createLinearGradient(0, -0.6 * S, 0, 0); hg.addColorStop(0, sh(M.wood, 1.3)); hg.addColorStop(1, sh(M.wood, 0.55));
  hull(); g.fillStyle = hg; g.fill();
  g.save(); hull(); g.clip();
  g.strokeStyle = 'rgba(0,0,0,0.3)'; g.lineWidth = c.lw * 0.8;
  for (const k of [-0.4, -0.3, -0.2, -0.1]) { g.beginPath(); g.moveTo(-0.9 * S, (k - 0.08) * S); g.quadraticCurveTo(0, (k + 0.06) * S, 1.0 * S, (k - 0.12) * S); g.stroke(); }
  g.fillStyle = 'rgba(0,0,0,0.22)'; g.fillRect(0.3 * S, -0.7 * S, 0.8 * S, 0.8 * S);
  g.beginPath(); g.moveTo(-1 * S, -0.14 * S);
  for (let i = 0; i <= 10; i++) g.lineTo((-1 + i * 0.2) * S, (-0.07 - (i % 2 ? 0.035 : 0) - i * 0.004) * S);
  g.lineTo(1 * S, 0.2 * S); g.lineTo(-1 * S, 0.2 * S); g.closePath();
  g.fillStyle = 'rgba(244,236,216,0.94)'; g.fill();
  g.restore();
  hull(); stroke(c);
  g.strokeStyle = sh(M.wood, 1.6); g.lineWidth = c.lw * 1.3;
  g.beginPath(); g.moveTo(-0.84 * S, -0.66 * S); g.lineTo(-0.62 * S, -0.53 * S); g.quadraticCurveTo(0, -0.43 * S, 0.62 * S, -0.47 * S); g.lineTo(0.95 * S, -0.62 * S); g.stroke();
  for (let i = 0; i < 4; i++) { const px = (-0.28 + i * 0.22) * S, py = -0.33 * S; g.fillStyle = i === 1 ? sh(M.acc, 1.1) : '#1a120a'; g.beginPath(); g.arc(px, py, 0.035 * S, 0, TAU); g.fill(); if (i === 1) glow(g, px, py, 0.14 * S, M.acc, 0.5); }
  const cb2 = box(c, -0.66 * S, -0.54 * S, 0.3 * S, 0.22 * S, 0.1 * S, M.wood);
  for (const k of [-1, 1]) arch(c, cb2.x + k * 0.07 * S, cb2.y - 0.05 * S, 0.06 * S, 0.1 * S, sh(M.acc, 1.1), false, M.acc);
  box(c, cb2.x, cb2.t + 0.01 * S, 0.36 * S, 0.035 * S, 0.12 * S, M.wood);
  g.strokeStyle = OL; g.lineWidth = 0.02 * S; g.beginPath(); g.moveTo(-0.8 * S, cb2.t); g.lineTo(-0.86 * S, cb2.t - 0.22 * S); g.lineTo(-0.94 * S, cb2.t - 0.22 * S); g.stroke();
  const lx = -0.94 * S, ly = cb2.t - 0.14 * S;
  glow(g, lx, ly, 0.34 * S, M.acc, 0.7);
  g.fillStyle = '#fff4d0'; g.beginPath(); g.ellipse(lx, ly, 0.035 * S, 0.05 * S, 0, 0, TAU); g.fill(); stroke(c, 0.6);
  g.restore();
  for (const [dx, dy, e, r, col] of [[0.34, 0.2, 0.17, -0.12, '#f4ecda'], [0.52, 0.24, 0.1, 0.3, '#ece2cc'], [0.74, 0.18, 0.26, 0.28, '#ece2cc'], [0.94, 0.14, 0.15, 0.5, '#e4d8bc'], [-0.62, 0.22, 0.22, -0.2, '#ece2cc'], [-0.88, 0.16, 0.14, -0.4, '#e4d8bc'], [0.08, 0.26, 0.13, 0.5, '#f4ecda']]) cube(c, x + dx * s, y + dy * s, e * s, col, r);
}

/* 8 · BUZUL */
function z1(c, x, y) {
  const s = c.s, M = c.M, g = c.g;
  shadow(c, x, y + 0.05 * s, 0.5 * s);
  glow(g, x, y - 0.4 * s, 0.8 * s, M.acc, 0.2);
  for (const [dx, dy, w, h, r] of [[-0.44, 0.04, 0.14, 0.5, -0.5], [0.4, 0.06, 0.14, 0.6, 0.45], [-0.18, 0.0, 0.2, 0.9, -0.18], [0.14, -0.02, 0.24, 1.3, 0.1], [0.3, 0.14, 0.12, 0.4, 0.8], [-0.02, 0.14, 0.14, 0.44, -0.4]]) crystal(c, x + dx * s, y + dy * s, w * s, h * s, r, '#8ccfee', null);
}
function z2(c, x, y) {
  const s = c.s, M = c.M, g = c.g;
  pine(c, x + 0.52 * s, y - 0.02 * s, 0.9 * s, '#2a4a52', '#f0f8ff');
  shadow(c, x - 0.1 * s, y + 0.06 * s, 0.5 * s);
  const dt = dome(c, x - 0.1 * s, y + 0.06 * s, 0.46 * s, 0.46 * s, '#dceaf4');
  g.save(); g.beginPath(); g.ellipse(x - 0.1 * s, y + 0.06 * s, 0.46 * s, 0.46 * s, 0, Math.PI, TAU); g.clip();
  g.strokeStyle = 'rgba(60,100,130,0.35)'; g.lineWidth = c.lw * 0.8;
  for (let i = 1; i < 4; i++) { g.beginPath(); g.ellipse(x - 0.1 * s, y + 0.06 * s, 0.46 * s, 0.46 * s * (1 - i * 0.24), 0, Math.PI, TAU); g.stroke(); }
  g.restore();
  dome(c, x - 0.34 * s, y + 0.12 * s, 0.17 * s, 0.2 * s, '#e4f0f8');
  arch(c, x - 0.38 * s, y + 0.12 * s, 0.12 * s, 0.16 * s, '#ffd08a', false, '#ffc070');
  glow(g, x - 0.38 * s, y + 0.06 * s, 0.3 * s, '#ffc070', 0.35);
  void dt;
}
function z3(c, x, y) {
  const s = c.s;
  for (const [dx, dy, h] of [[0.36, -0.1, 1.05], [-0.36, -0.06, 1.4], [0.0, 0.06, 0.9], [0.6, 0.1, 0.55], [-0.62, 0.12, 0.6]]) { shadow(c, x + dx * s, y + dy * s, 0.16 * s); pine(c, x + dx * s, y + dy * s, h * s, '#24444e', '#f2f9ff'); }
}
function zb(c, x, y) {
  const s = c.s, M = c.M, g = c.g;
  shadow(c, x, y + 0.08 * s, 0.8 * s);
  glow(g, x, y - 1.0 * s, 1.1 * s, M.acc, 0.18);
  crystal(c, x + 0.5 * s, y - 0.1 * s, 0.24 * s, 1.5 * s, 0.1, '#8ccfee', M.acc);
  crystal(c, x - 0.46 * s, y - 0.06 * s, 0.24 * s, 1.3 * s, -0.12, '#8ccfee', M.acc);
  const b = box(c, x, y + 0.1 * s, 1.0 * s, 0.5 * s, 0.3 * s, '#a8cce0');
  for (let i = 0; i < 5; i++) arch(c, b.x0 + (i + 0.5) * b.w / 5, b.t + 0.34 * s, 0.07 * s, 0.18 * s, sh(M.acc, 1), true, i % 2 ? null : M.acc);
  arch(c, b.x, b.y, 0.18 * s, 0.3 * s, '#0e2a3a', true);
  g.fillStyle = '#f4faff'; g.beginPath(); g.ellipse(b.x + b.d / 2, b.t - b.dy / 2, b.w * 0.52, b.dy * 0.9, 0, 0, TAU); g.fill();
  crystal(c, x + 0.04 * s, b.t - 0.06 * s, 0.34 * s, 1.8 * s, 0.0, '#9ad8f4', M.acc);
  for (const [dx, h, r] of [[-0.2, 0.7, -0.25], [0.26, 0.8, 0.25]]) crystal(c, x + dx * s, b.t - 0.04 * s, 0.16 * s, h * s, r, '#9ad8f4', null);
}

/* 9 · KEMİK BAHÇESİ */
/** Kemik zambağı: bahçenin "çiçeği" — göz/yüz taşımaz. */
function lily(c, x, y, h, M) {
  const g = c.g;
  g.lineCap = 'round';
  for (const [col, lw] of [[OL, h * 0.1], [sh(M.stone, 0.9), h * 0.055]]) {
    g.strokeStyle = col; g.lineWidth = Math.max(0.6, lw);
    g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + h * 0.18, y - h * 0.5, x + h * 0.05, y - h); g.stroke();
  }
  g.lineCap = 'butt';
  const fx = x + h * 0.05, fy = y - h;
  glow(g, fx, fy + h * 0.12, h * 0.6, M.acc, 0.4);
  for (const k of [-1, 1, 0]) {
    g.beginPath(); g.moveTo(fx, fy);
    g.quadraticCurveTo(fx + k * h * 0.3 + (k ? 0 : h * 0.02), fy - h * 0.04, fx + k * h * 0.22, fy + h * 0.26);
    g.quadraticCurveTo(fx + k * h * 0.07, fy + h * 0.13, fx, fy);
    g.fillStyle = sh(M.stone, k ? 0.92 : 1.18); g.fill(); stroke(c, 0.6);
  }
  g.fillStyle = sh(M.acc, 1.2); g.beginPath(); g.arc(fx, fy + h * 0.16, h * 0.05, 0, TAU); g.fill();
}
function e1(c, x, y) {
  const s = c.s, M = c.M, g = c.g;
  shadow(c, x, y + 0.04 * s, 0.4 * s);
  deadTree(c, x - 0.05 * s, y + 0.04 * s, 1.5 * s, M.stone, c.rnd, true);
  for (const [dx, dy] of [[-0.42, -0.9], [0.36, -1.0], [0.12, -0.7]]) {
    g.strokeStyle = 'rgba(40,30,16,0.8)'; g.lineWidth = c.lw * 0.7; g.beginPath(); g.moveTo(x + dx * s, y + dy * s - 0.12 * s); g.lineTo(x + dx * s, y + dy * s - 0.06 * s); g.stroke();
    g.beginPath(); g.arc(x + dx * s, y + dy * s, 0.045 * s, 0, TAU); g.fillStyle = sh(M.acc, 1.1); g.fill(); glow(g, x + dx * s, y + dy * s, 0.2 * s, M.acc, 0.5);
  }
  for (const [dx, dy, h] of [[-0.52, 0.1, 0.34], [-0.34, 0.17, 0.24], [0.42, 0.15, 0.38], [0.6, 0.06, 0.28]]) lily(c, x + dx * s, y + dy * s, h * s, M);
}
function e2(c, x, y) {
  const s = c.s, M = c.M, g = c.g;
  shadow(c, x, y + 0.04 * s, 0.6 * s);
  const tusk = (k, z) => {
    const bx = x + k * 0.5 * s, by = y + z * s;
    g.beginPath(); g.moveTo(bx - 0.07 * s, by); g.bezierCurveTo(bx - k * 0.08 * s, by - 0.7 * s, x + k * 0.26 * s, by - 1.2 * s, x + k * 0.02 * s, by - 1.26 * s);
    g.bezierCurveTo(x + k * 0.16 * s, by - 1.1 * s, bx + k * 0.08 * s - k * 0.1 * s, by - 0.6 * s, bx + 0.07 * s, by); g.closePath();
    const lg = g.createLinearGradient(bx - 0.1 * s, 0, bx + 0.1 * s, 0); lg.addColorStop(0, sh(M.stone, 1.2)); lg.addColorStop(1, sh(M.stone, 0.62)); g.fillStyle = lg; g.fill(); stroke(c);
  };
  tusk(-1, -0.06); tusk(1, -0.04);
  g.fillStyle = sh(M.acc, 1); g.beginPath(); g.arc(x, y - 1.18 * s, 0.05 * s, 0, TAU); g.fill(); glow(g, x, y - 1.18 * s, 0.3 * s, M.acc, 0.5);
  g.strokeStyle = 'rgba(40,30,16,0.9)'; g.lineWidth = c.lw * 0.8; g.beginPath(); g.moveTo(x, y - 1.24 * s); g.lineTo(x, y - 1.13 * s); g.stroke();
  for (const [dx, h] of [[-0.2, 0.36], [0.06, 0.46], [0.28, 0.3]]) { g.strokeStyle = OL; g.lineCap = 'round'; g.lineWidth = 0.06 * s; g.beginPath(); g.moveTo(x + dx * s, y + 0.12 * s); g.quadraticCurveTo(x + dx * s - 0.12 * s, y + 0.12 * s - h * s * 0.6, x + dx * s + 0.02 * s, y + 0.12 * s - h * s); g.stroke(); g.strokeStyle = sh(M.stone, 1.05); g.lineWidth = 0.035 * s; g.stroke(); }
  g.lineCap = 'butt';
}
/* ekili bahçe tarhları: kemik filizi sıraları + zambaklar + fener direği */
function e3(c, x, y) {
  const s = c.s, M = c.M, g = c.g;
  shadow(c, x, y + 0.06 * s, 0.62 * s);
  const lx = x + 0.7 * s, ly = y - 0.02 * s;
  g.lineCap = 'round';
  for (const [col, lw] of [[OL, 0.055 * s], [sh(M.stone, 1.05), 0.032 * s]]) {
    g.strokeStyle = col; g.lineWidth = lw;
    g.beginPath(); g.moveTo(lx, ly); g.lineTo(lx, ly - 0.66 * s); g.quadraticCurveTo(lx, ly - 0.74 * s, lx - 0.14 * s, ly - 0.7 * s); g.stroke();
  }
  g.lineCap = 'butt';
  box(c, lx - 0.14 * s, ly - 0.54 * s, 0.08 * s, 0.11 * s, 0.03 * s, '#4a3a22');
  g.fillStyle = sh(M.acc, 1.15); g.fillRect(lx - 0.165 * s, ly - 0.63 * s, 0.05 * s, 0.07 * s);
  glow(g, lx - 0.14 * s, ly - 0.6 * s, 0.34 * s, M.acc, 0.55);
  const bed = (bx, by, w, d) => {
    const b = box(c, bx, by, w, 0.1 * s, d, '#6a5838');
    poly(c, [[b.x0 + w * 0.05, b.t - b.dy * 0.1], [b.x1 - w * 0.03, b.t - b.dy * 0.1], [b.x1 + b.d * 0.9, b.t - b.dy * 0.92], [b.x0 + b.d * 0.95, b.t - b.dy * 0.92]], '#2a2012', true);
    return b;
  };
  const A = bed(x - 0.26 * s, y + 0.0 * s, 0.66 * s, 0.3 * s);
  g.lineCap = 'round';
  for (let r = 0; r < 2; r++) for (let i = 0; i < 5; i++) {
    const u = (i + 0.5) / 5, v = 0.3 + r * 0.4, px = A.x0 + u * A.w + v * A.d, py = A.t - v * A.dy, h = 0.17 * s * (0.8 + c.rnd() * 0.4);
    for (const [col, lw] of [[OL, 0.045 * s], [sh(M.stone, 1.05), 0.026 * s]]) {
      g.strokeStyle = col; g.lineWidth = lw;
      g.beginPath(); g.moveTo(px, py); g.quadraticCurveTo(px - h * 0.55, py - h * 0.6, px - h * 0.1, py - h); g.stroke();
    }
  }
  g.lineCap = 'butt';
  const B = bed(x + 0.3 * s, y + 0.17 * s, 0.5 * s, 0.24 * s);
  for (let i = 0; i < 3; i++) lily(c, B.x0 + (i + 0.5) / 3 * B.w + 0.5 * B.d, B.t - 0.5 * B.dy, (0.34 + (i % 2) * 0.08) * s, M);
}
/* FİLDİŞİ SERA — boss: kaburga iskeletli cam kubbe + iki cam kanat.
   Kullanıcı: "gözleri olan bir bina istemiyorum" → dev kafatası kalesi kalktı. */
function glassHouse(c, x, y, w, h, d, M) {
  const g = c.g, b = box(c, x, y, w, h, d, '#34402a', true);
  g.save(); g.beginPath(); g.rect(b.x0, b.t, b.w, b.h); g.clip();
  glow(g, b.x, b.y - b.h * 0.3, b.w * 0.8, M.acc, 0.4);
  g.fillStyle = '#7a8a50';
  for (let i = 0; i < 4; i++) { g.beginPath(); g.ellipse(b.x0 + (i + 0.5) * b.w / 4, b.y - b.h * 0.12, b.w * 0.1, b.h * 0.32, 0, 0, TAU); g.fill(); }
  g.fillStyle = 'rgba(255,240,200,0.14)'; g.fillRect(b.x0, b.t, b.w, b.h);
  g.restore();
  g.strokeStyle = sh(M.stone, 1); g.lineWidth = Math.max(0.7, w * 0.035);
  for (let i = 1; i < 4; i++) { const px = b.x0 + i * b.w / 4; g.beginPath(); g.moveTo(px, b.y); g.lineTo(px, b.t); g.stroke(); }
  g.beginPath(); g.moveTo(b.x0, b.t + b.h * 0.42); g.lineTo(b.x1, b.t + b.h * 0.42); g.stroke();
  const ry = roofX(c, b, h * 0.42, '#c8bc98');
  g.strokeStyle = 'rgba(255,250,230,0.6)'; g.lineWidth = Math.max(0.6, w * 0.015);
  for (let i = 1; i < 4; i++) { const px = b.x0 + i * b.w / 4; g.beginPath(); g.moveTo(px, b.t); g.lineTo(px + b.d / 2, ry); g.stroke(); }
  return b;
}
function glassDome(c, x, y, rw, rh, M) {
  const g = c.g;
  g.beginPath(); g.ellipse(x, y, rw, rh, 0, Math.PI, TAU); g.ellipse(x, y, rw, rw * 0.28, 0, 0, Math.PI);
  const lg = g.createLinearGradient(0, y - rh, 0, y);
  lg.addColorStop(0, '#3c4630'); lg.addColorStop(1, '#262e1c'); g.fillStyle = lg; g.fill();
  g.save(); g.clip();
  glow(g, x, y - rh * 0.3, rw * 1.2, M.acc, 0.5);
  g.fillStyle = '#7a8a50';
  g.beginPath(); g.ellipse(x - rw * 0.1, y - rh * 0.35, rw * 0.16, rh * 0.42, 0.1, 0, TAU); g.fill();
  for (const k of [-0.6, -0.3, 0.3, 0.62]) { g.beginPath(); g.ellipse(x + k * rw, y - rh * 0.1, rw * 0.16, rh * 0.2, 0, 0, TAU); g.fill(); }
  g.fillStyle = 'rgba(255,244,210,0.12)'; g.fillRect(x - rw, y - rh, rw * 2, rh + rw * 0.3);
  g.restore();
  g.lineCap = 'round';
  for (const [col, lw] of [[OL, rw * 0.075], [sh(M.stone, 1.08), rw * 0.042]]) {
    g.strokeStyle = col; g.lineWidth = lw;
    for (const k of [-1, -0.55, 0, 0.55, 1]) {
      g.beginPath(); g.moveTo(x + k * rw, y + Math.sqrt(1 - k * k) * rw * 0.28);
      g.quadraticCurveTo(x + k * rw, y - rh * 0.92, x, y - rh); g.stroke();
    }
    g.beginPath(); g.ellipse(x, y - rh * 0.45, rw * 0.9, rw * 0.22, 0, 0, Math.PI); g.stroke();
    g.beginPath(); g.ellipse(x, y, rw, rw * 0.28, 0, 0, Math.PI); g.stroke();
  }
  g.lineCap = 'butt';
  g.strokeStyle = 'rgba(255,255,255,0.4)'; g.lineWidth = rw * 0.05;
  g.beginPath(); g.ellipse(x, y, rw * 0.78, rh * 0.82, 0, Math.PI * 1.12, Math.PI * 1.36); g.stroke();
  return y - rh;
}
function eb(c, x, y) {
  const s = c.s, M = c.M, g = c.g;
  shadow(c, x, y + 0.08 * s, 0.85 * s);
  box(c, x, y + 0.14 * s, 1.36 * s, 0.08 * s, 0.44 * s, M.stone);
  glassHouse(c, x + 0.5 * s, y + 0.0 * s, 0.46 * s, 0.34 * s, 0.22 * s, M);
  glassHouse(c, x - 0.52 * s, y + 0.06 * s, 0.46 * s, 0.34 * s, 0.22 * s, M);
  const top = cyl(c, x, y + 0.1 * s, 0.4 * s, 0.3 * s, M.stone);
  for (let i = 0; i < 3; i++) arch(c, x + (i - 1) * 0.2 * s, y + 0.1 * s, (i === 1 ? 0.12 : 0.07) * s, (i === 1 ? 0.24 : 0.16) * s, sh(M.acc, 1), i !== 1, i === 1 ? M.acc : null);
  const ap = glassDome(c, x, top, 0.42 * s, 0.68 * s, M);
  g.lineCap = 'round';
  for (const [col, lw] of [[OL, 0.06 * s], [sh(M.stone, 1.1), 0.035 * s]]) { g.strokeStyle = col; g.lineWidth = lw; g.beginPath(); g.moveTo(x, ap); g.lineTo(x, ap - 0.3 * s); g.stroke(); }
  for (const k of [-1, 1]) for (const [col, lw] of [[OL, 0.06 * s], [sh(M.stone, 1.1), 0.036 * s]]) {
    g.strokeStyle = col; g.lineWidth = lw;
    g.beginPath(); g.moveTo(x + k * 0.2 * s, y + 0.2 * s); g.quadraticCurveTo(x + k * 0.26 * s, y - 0.16 * s, x + k * 0.03 * s, y - 0.22 * s); g.stroke();
  }
  g.lineCap = 'butt';
  g.beginPath(); g.ellipse(x, ap - 0.36 * s, 0.05 * s, 0.08 * s, 0, 0, TAU); g.fillStyle = sh(M.acc, 1.2); g.fill();
  glow(g, x, ap - 0.36 * s, 0.34 * s, M.acc, 0.6);
  lily(c, x - 0.8 * s, y + 0.2 * s, 0.22 * s, M);
  lily(c, x + 0.76 * s, y + 0.22 * s, 0.2 * s, M);
}

/* 10 · YILDIZ DÖKÜMHANESİ (v74, eski GÖK ÇARKI) — yıldızların dökülüp göğe
   asıldığı yer. Arena paletiyle aynı dil: bazalt sütun başları + pirinç
   mekanizma; "ışık" artık mor değil erimiş YILDIZ METALİ (buz beyazı).
   Çark/halka YOK (kullanıcı: "dönme dolap istemiyorum"). */
function star4(g, x, y, r, col) {
  g.fillStyle = col; g.beginPath(); g.moveTo(x, y - r);
  g.quadraticCurveTo(x + r * 0.12, y - r * 0.12, x + r, y); g.quadraticCurveTo(x + r * 0.12, y + r * 0.12, x, y + r);
  g.quadraticCurveTo(x - r * 0.12, y + r * 0.12, x - r, y); g.quadraticCurveTo(x - r * 0.12, y - r * 0.12, x, y - r); g.fill();
}
function star8(g, x, y, r) {
  g.save(); g.translate(x, y); g.rotate(Math.PI / 4); star4(g, 0, 0, r * 0.62, 'rgba(214,238,255,0.9)'); g.restore();
  star4(g, x, y, r, '#f4faff');
  g.fillStyle = '#ffffff'; g.beginPath(); g.arc(x, y, r * 0.2, 0, TAU); g.fill();
}
/** Dik altıgen bazalt sütun (tepesi görünür). Dönüş: tepe y. */
function hexCol(c, x, y, w, h, col) {
  const t = y - h, e = w * 0.3, P = [];
  for (let k = 0; k < 6; k++) { const a = k * Math.PI / 3; P.push([x + Math.cos(a) * w / 2, t + Math.sin(a) * e]); }
  for (const [i, j, f] of [[0, 1, 0.62], [1, 2, 0.9], [2, 3, 1.15]]) poly(c, [P[i], P[j], [P[j][0], P[j][1] + h], [P[i][0], P[i][1] + h]], sh(col, f));
  poly(c, P, sh(col, 1.32));
  return t;
}
/** Pirinç pota (eğik). Dönüş: döküm ağzı (dünya koordinatı). */
function crucible(c, x, y, rw, h, rot) {
  const g = c.g, M = c.M;
  g.save(); g.translate(x, y); g.rotate(rot);
  const lg = g.createLinearGradient(-rw, 0, rw, 0); lg.addColorStop(0, sh(M.acc2, 0.9)); lg.addColorStop(0.35, sh(M.acc2, 1.3)); lg.addColorStop(1, sh(M.acc2, 0.5));
  poly(c, [[-rw, -h], [rw, -h], [rw * 0.7, 0], [-rw * 0.7, 0]], lg);
  g.fillStyle = sh(M.acc2, 0.55); g.fillRect(-rw * 0.9, -h * 0.58, rw * 1.8, h * 0.1);
  g.beginPath(); g.ellipse(0, -h, rw, rw * 0.3, 0, 0, TAU); g.fillStyle = sh(M.acc2, 0.7); g.fill(); stroke(c);
  g.beginPath(); g.ellipse(0, -h + rw * 0.02, rw * 0.8, rw * 0.22, 0, 0, TAU); g.fillStyle = '#f2fbff'; g.fill();
  g.restore();
  const cx = x + Math.cos(rot) * rw + Math.sin(rot) * h, cy = y + Math.sin(rot) * rw - Math.cos(rot) * h;
  glow(g, cx, cy, rw * 2.4, M.acc, 0.55);
  return [cx, cy];
}
/** Erimiş yıldız metali akışı + sıçrayan kıvılcım. */
function pour(c, x0, y0, x1, y1, w) {
  const g = c.g, M = c.M;
  const p = () => { g.beginPath(); g.moveTo(x0, y0); g.quadraticCurveTo(x0 + (x1 - x0) * 0.75, y0 + (y1 - y0) * 0.04, x1, y1); };
  g.save(); g.globalCompositeOperation = 'lighter'; g.lineCap = 'round';
  p(); g.strokeStyle = sh(M.acc, 1, 0.22); g.lineWidth = w * 3.4; g.stroke();
  p(); g.strokeStyle = sh(M.acc, 1, 0.7); g.lineWidth = w * 1.4; g.stroke();
  p(); g.strokeStyle = 'rgba(255,255,255,0.95)'; g.lineWidth = w * 0.6; g.stroke();
  g.restore();
  glow(g, x1, y1, w * 9, M.acc, 0.55);
  g.fillStyle = '#ffffff';
  for (let i = 0; i < 7; i++) { g.beginPath(); g.arc(x1 + (c.rnd() - 0.5) * w * 11, y1 - c.rnd() * w * 9, w * 0.34, 0, TAU); g.fill(); }
}
/** Yıldız kalıbı: taş disk + içinde parlayan yıldız. */
function mold(c, x, y, rw) {
  const g = c.g, M = c.M, t = cyl(c, x, y, rw, rw * 0.26, M.stone);
  g.beginPath(); g.ellipse(x, t, rw * 0.8, rw * 0.22, 0, 0, TAU); g.fillStyle = '#10141e'; g.fill();
  glow(g, x, t, rw * 1.6, M.acc, 0.6);
  g.save(); g.translate(x, t); g.scale(1, 0.3); star4(g, 0, 0, rw * 0.7, '#f4faff'); g.restore();
  return t;
}
function gear(c, x, y, r) {
  const g = c.g, M = c.M, n = 10;
  g.beginPath();
  for (let i = 0; i < n; i++) {
    const a = i / n * TAU;
    for (const [da, rr] of [[-0.14, 0.78], [-0.08, 1], [0.08, 1], [0.14, 0.78]]) { const px = x + Math.cos(a + da) * r * rr, py = y + Math.sin(a + da) * r * rr; i || da !== -0.14 ? g.lineTo(px, py) : g.moveTo(px, py); }
  }
  g.closePath(); g.fillStyle = sh(M.acc2, 1.05); g.fill(); stroke(c);
  g.fillStyle = sh(M.acc2, 0.62); g.beginPath(); g.arc(x, y, r * 0.5, 0, TAU); g.fill();
  g.fillStyle = sh(M.acc2, 1.3); g.beginPath(); g.arc(x, y, r * 0.18, 0, TAU); g.fill();
}
function chimney(c, x, y, h) {
  const s = c.s, M = c.M, g = c.g;
  const ch = box(c, x, y, 0.15 * s, h, 0.1 * s, M.stone);
  box(c, ch.x, ch.t + 0.05 * s, 0.21 * s, 0.07 * s, 0.12 * s, M.acc2);
  const cx = ch.x + 0.05 * s, cy = ch.t - 0.06 * s;
  glow(g, cx, cy - 0.1 * s, 0.34 * s, M.acc, 0.45);
  g.fillStyle = '#ffffff';
  for (let i = 0; i < 5; i++) { g.beginPath(); g.arc(cx + (c.rnd() - 0.4) * 0.2 * s, cy - (0.08 + c.rnd() * 0.36) * s, 0.012 * s, 0, TAU); g.fill(); }
  return ch;
}
/* ocak + pota + yıldız kalıbı, yanında fener sütunu */
function w1(c, x, y) {
  const s = c.s, M = c.M, g = c.g;
  shadow(c, x, y + 0.06 * s, 0.6 * s);
  const pt = hexCol(c, x - 0.6 * s, y + 0.02 * s, 0.14 * s, 0.78 * s, M.stone);
  glow(g, x - 0.6 * s, pt - 0.16 * s, 0.3 * s, M.acc, 0.55);
  star8(g, x - 0.6 * s, pt - 0.16 * s, 0.09 * s);
  const hb = box(c, x - 0.18 * s, y + 0.08 * s, 0.5 * s, 0.26 * s, 0.22 * s, M.stone);
  arch(c, hb.x, hb.y - 0.02 * s, 0.2 * s, 0.15 * s, '#eaf6ff', false, M.acc);
  const [lx, ly] = crucible(c, hb.x + 0.04 * s, hb.t - hb.dy * 0.4, 0.15 * s, 0.2 * s, 0.55);
  const mx = x + 0.44 * s, mt = mold(c, mx, y + 0.16 * s, 0.24 * s);
  pour(c, lx, ly, mx, mt, 0.03 * s);
}
/* bazalt sütun kümesi + pirinç vinç + asılı yeni yıldız */
function w2(c, x, y) {
  const s = c.s, M = c.M, g = c.g;
  shadow(c, x, y + 0.06 * s, 0.55 * s);
  const C = [[-0.3, -0.04, 0.2, 0.9], [-0.1, 0.02, 0.22, 1.2], [0.12, -0.02, 0.2, 0.7], [-0.46, 0.08, 0.18, 0.45], [0.28, 0.1, 0.18, 0.36]].sort((a, b) => a[1] - b[1]);
  let ax = x, ay = y;
  for (const [dx, dy, w, h] of C) { const t = hexCol(c, x + dx * s, y + dy * s, w * s, h * s, M.stone); if (h === 1.2) { ax = x + dx * s; ay = t; } }
  gear(c, x - 0.3 * s + 0.01 * s, y - 0.52 * s, 0.12 * s);
  const ex = ax + 0.62 * s, ey = ay - 0.1 * s;
  g.lineCap = 'round';
  for (const [w, col] of [[0.07, OL], [0.04, sh(M.acc2, 1.15)]]) { g.strokeStyle = col; g.lineWidth = w * s; g.beginPath(); g.moveTo(ax, ay); g.lineTo(ex, ey); g.stroke(); }
  g.strokeStyle = sh(M.acc2, 0.8); g.lineWidth = 0.022 * s; g.beginPath(); g.moveTo(ax + 0.06 * s, ay + 0.34 * s); g.lineTo(ax + 0.36 * s, ay - 0.05 * s); g.stroke();
  g.lineCap = 'butt';
  const sy2 = ey + 0.56 * s;
  g.strokeStyle = sh(M.acc2, 0.95); g.lineWidth = Math.max(0.6, 0.014 * s); g.beginPath(); g.moveTo(ex, ey); g.lineTo(ex, sy2 - 0.12 * s); g.stroke();
  glow(g, ex, sy2, 0.5 * s, M.acc, 0.6);
  star8(g, ex, sy2, 0.16 * s);
}
/* kovan fırını + baca */
function w3(c, x, y) {
  const s = c.s, M = c.M, g = c.g;
  shadow(c, x, y + 0.06 * s, 0.56 * s);
  const ch = chimney(c, x + 0.34 * s, y - 0.08 * s, 1.08 * s);
  g.strokeStyle = OL; g.lineWidth = 0.07 * s; g.beginPath(); g.moveTo(x, y - 0.46 * s); g.lineTo(ch.x, y - 0.5 * s); g.stroke();
  g.strokeStyle = sh(M.acc2, 1.1); g.lineWidth = 0.045 * s; g.stroke();
  const kt = cyl(c, x - 0.08 * s, y + 0.1 * s, 0.44 * s, 0.2 * s, M.stone);
  dome(c, x - 0.08 * s, kt, 0.44 * s, 0.46 * s, M.stone);
  g.strokeStyle = sh(M.acc2, 1.05); g.lineWidth = 0.03 * s;
  for (const k of [0.3, 0.62]) { g.beginPath(); g.ellipse(x - 0.08 * s, kt - 0.46 * s * k, 0.44 * s * Math.sqrt(1 - k * k), 0.1 * s, 0, 0.1, Math.PI - 0.1); g.stroke(); }
  arch(c, x - 0.08 * s, y + 0.2 * s, 0.24 * s, 0.28 * s, '#eaf6ff', false, M.acc);
  glow(g, x - 0.08 * s, y + 0.1 * s, 0.4 * s, M.acc, 0.4);
  box(c, x - 0.62 * s, y + 0.16 * s, 0.16 * s, 0.1 * s, 0.08 * s, M.acc2);
}
/* BOSS · BÜYÜK DÖKÜMHANE: iki baca, pirinç çatılı salon, çatıdaki A-kulesinden
   dökülen dev pota, önde kalıpta doğan yıldız, tepede asılmayı bekleyen ilk yıldız */
function wb(c, x, y) {
  const s = c.s, M = c.M, g = c.g;
  shadow(c, x, y + 0.1 * s, 0.9 * s);
  chimney(c, x - 0.5 * s, y - 0.12 * s, 1.5 * s);
  chimney(c, x + 0.5 * s, y - 0.14 * s, 1.2 * s);
  for (let i = 0; i < 3; i++) box(c, x, y + 0.14 * s - i * 0.08 * s, (1.3 - i * 0.14) * s, 0.08 * s, (0.5 - i * 0.06) * s, M.stone);
  const hall = box(c, x - 0.1 * s, y - 0.1 * s, 0.8 * s, 0.5 * s, 0.3 * s, M.stone);
  for (let i = 0; i < 4; i++) if (i !== 1) arch(c, hall.x0 + (i + 0.5) * hall.w / 4, hall.t + 0.3 * s, 0.07 * s, 0.16 * s, '#dff0ff', true, i === 2 ? M.acc : null);
  arch(c, hall.x0 + 1.5 * hall.w / 4, hall.y, 0.16 * s, 0.3 * s, '#eaf6ff', true, M.acc);
  glow(g, hall.x0 + 1.5 * hall.w / 4, hall.y - 0.1 * s, 0.45 * s, M.acc, 0.35);
  roofX(c, hall, 0.2 * s, M.acc2);
  const fx = x - 0.3 * s, fy = hall.t - 0.06 * s, apx = fx + 0.02 * s, apy = fy - 0.56 * s;
  g.lineCap = 'round';
  for (const [w, col] of [[0.05, OL], [0.03, sh(M.acc2, 1.1)]]) { g.strokeStyle = col; g.lineWidth = w * s; g.beginPath(); g.moveTo(fx - 0.16 * s, fy); g.lineTo(apx, apy); g.lineTo(fx + 0.18 * s, fy); g.stroke(); }
  g.lineCap = 'butt';
  const [lx, ly] = crucible(c, apx + 0.02 * s, apy + 0.24 * s, 0.2 * s, 0.24 * s, 0.6);
  const mx = x + 0.5 * s, mt = mold(c, mx, y + 0.2 * s, 0.26 * s);
  pour(c, lx, ly, mx, mt, 0.036 * s);
  const sx = x + 0.12 * s, sy = y - 1.5 * s;
  glow(g, sx, sy, 0.7 * s, M.acc, 0.5);
  star8(g, sx, sy, 0.22 * s);
  g.fillStyle = '#ffffff';
  for (const [a, r] of [[0.6, 0.34], [2.4, 0.3], [3.9, 0.36], [5.3, 0.28]]) { g.beginPath(); g.arc(sx + Math.cos(a) * r * s, sy + Math.sin(a) * r * 0.5 * s, 0.018 * s, 0, TAU); g.fill(); }
}

/* ═══════════ DÜNYA TABLOSU ═══════════
   H: yerli yükseklik (rx cinsinden), taç kısması için. */
const WORLD = {
  mezarlik: { M: { top: '#4a5842', soil: '#3b2d22', rock: '#4a3f35', low: '#1c1611', stone: '#76727e', wood: '#2e231c', acc: '#ff5a5a', acc2: '#ff9a7a', bounce: '#ff3b4e' },
    edge: '#56664a', hang: 'roots', speck: 'rgba(120,140,100,0.5)', L: [[mz1, 1.5], [mz2, 0.85], [mz3, 1.9], [mzb, 2.35]] },
  kul: { M: { top: '#3a2c28', soil: '#2a1a14', rock: '#3a2620', low: '#140c09', stone: '#4a3c36', wood: '#2a1c16', acc: '#ff7a2c', acc2: '#ffb060', bounce: '#ff6a2c' },
    edge: null, hang: 'lava', speck: 'rgba(255,120,40,0.55)', L: [[k1, 1.35], [k2, 1.75], [k3, 1.3], [kb, 2.2]] },
  bataklik: { M: { top: '#2e5a3c', soil: '#243020', rock: '#2c3a30', low: '#0e1812', stone: '#5a6a5e', wood: '#4a3a26', acc: '#b8ff7a', acc2: '#6fd0a4', bounce: '#3ac8a0' },
    edge: '#3a7048', hang: 'moss', speck: 'rgba(90,160,100,0.5)', L: [[b1, 1.3], [b2, 1.45], [b3, 1.5], [bb, 2.3]] },
  katedral: { M: { top: '#3a3052', soil: '#2a1f3a', rock: '#342b4c', low: '#140e24', stone: '#6c6484', wood: '#3a2a30', acc: '#ff4a6a', acc2: '#b08cff', bounce: '#9b6cff' },
    edge: null, hang: 'roots', speck: 'rgba(200,60,90,0.45)', L: [[c1, 1.3], [c2, 2.15], [c3, 1.1], [cb, 2.3]] },
  hiclik: { M: { top: '#2c2c34', soil: '#1c1c22', rock: '#2a2a32', low: '#0a0a0e', stone: '#cdc8bc', wood: '#2a2a30', acc: '#f4f0ff', acc2: '#bdb8d0', bounce: '#c8c4d8' },
    edge: null, hang: 'shard', speck: 'rgba(240,236,228,0.35)', L: [[h1, 1.45], [h2, 1.75], [h3, 1.7], [hb, 2.3]] },
  gokada: { M: { top: '#6a9a4e', soil: '#7a5634', rock: '#a88a62', low: '#3a2c20', stone: '#e2cfa2', wood: '#5a3c26', acc: '#f6aac6', acc2: '#ffc46a', bounce: '#ff9ec0', leaf: '#3c6a3e', roof: '#c4583a', cu: '#5cb8a0' },
    edge: '#7aab58', hang: 'falls', speck: 'rgba(255,196,218,0.75)', L: [[g1, 1.2], [g2, 1.75], [g3, 1.25], [gb, 1.9]] },
  tuzla: { M: { top: '#d8ccb0', soil: '#8a7658', rock: '#7a6448', low: '#2e2418', stone: '#c8b088', wood: '#5a4630', acc: '#ffd68c', acc2: '#ffe8b8', bounce: '#ffc070' },
    edge: '#efe6d2', hang: 'salt', speck: 'rgba(255,255,255,0.6)', L: [[t1, 1.1], [t2, 1.4], [t3, 0.95], [tb, 1.65]] },
  buzul: { M: { top: '#dceaf2', soil: '#8ab0c8', rock: '#3e5a72', low: '#122030', stone: '#a8c8dc', wood: '#3a3a44', acc: '#8cf0ff', acc2: '#cdeeff', bounce: '#8cdcff' },
    edge: '#f6fbff', hang: 'icicle', speck: 'rgba(160,200,230,0.5)', L: [[z1, 1.4], [z2, 0.95], [z3, 1.45], [zb, 2.4]] },
  kemikbahce: { M: { top: '#62573c', soil: '#3e3424', rock: '#4a4232', low: '#1c180e', stone: '#e4d8b4', wood: '#3a2e1c', acc: '#ffcc60', acc2: '#fff0c0', bounce: '#ffe296' },
    edge: '#72663f', hang: 'bone', speck: 'rgba(230,214,168,0.55)', L: [[e1, 1.55], [e2, 1.3], [e3, 0.9], [eb, 1.95]] },
  gokcark: { M: { top: '#464c64', soil: '#30323f', rock: '#383d52', low: '#0e1018', stone: '#667088', wood: '#3a3442', acc: '#cfeaff', acc2: '#d6a24e', bounce: '#6f9bff' },
    edge: null, hang: 'basalt', speck: 'rgba(160,190,255,0.35)', L: [[w1, 1.1], [w2, 1.45], [w3, 1.35], [wb, 1.9]] },
};

export const ISLE_BOSS_DEPTH = 1.3;

/**
 * Bir gök adasını çizer.
 * @param g   2B bağlam (DPR ölçeği çağırana ait)
 * @param wd  dünya kaydı (worlds.js)
 * @param slot 0-2 görev varyantı ya da 'b' (boss)
 * @param x,y plato merkezi · rx plato yarı genişliği
 * @param o   { room: y'nin üstündeki boş pay (px), seed }
 */
export function drawIsle(g, wd, slot, x, y, rx, o) {
  const W = WORLD[wd.floor] || WORLD.mezarlik;
  const boss = slot === 'b';
  const idx = boss ? 3 : ((slot % 3) + 3) % 3;
  const rnd = rng(wd.id * 7331 + ((o && o.seed) | 0) * 131 + idx * 17 + 3);
  const [fn, H] = W.L[idx];
  const room0 = o && o.room > 0 ? o.room : 1e9;
  /* PAY DARSA ADA DA KÜÇÜLÜR (sprite döneminin sözleşmesi): yalnız yapıyı
     kısmak önizlemede boss'u dev bir platonun üstünde oyuncak kaleye
     çeviriyordu (1:1 bakışta görüldü). Plato en fazla %40 daralır;
     merkez (x, y) sabit, yani düğümler kaymaz. */
  rx *= Math.max(0.6, Math.min(1, room0 / (H * rx)));
  const c = { g, s: rx, M: W.M, rnd, lw: Math.max(0.55, rx * 0.022) };
  g.save();
  island(c, x, y, rx, { depth: boss ? ISLE_BOSS_DEPTH : 0.95 + rnd() * 0.2, edge: W.edge, hang: W.hang, speck: W.speck });
  const cap = rx * (boss ? 3.0 : 2.1);
  const k = Math.min(1, Math.min(cap, room0) / (H * rx));
  if (rx > 9) {
    g.translate(x, y); g.scale(k, k); g.translate(-x, -y);
    c.lw = Math.max(0.55, rx * 0.022) / k;
    fn(c, x, y);
  }
  g.restore();
}
