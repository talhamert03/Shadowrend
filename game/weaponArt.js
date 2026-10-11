/* ═══════════════════════════════════════════════════════════
   weaponArt.js — CEPHANE SİLAHLARI v4 (2026-09-23)
   5 arketip × 5 kademe. v3'te her tip 5 kademede AYNI siluetti ve
   yalnız renk değişiyordu (kart ızgarasında "aynı kılıcın beş rengi").
   Artık her kademe KENDİ formunu taşır: paslı kısa kılıç → tunç yaprak
   ağız → buz kılıcı → ejder kanatlı fırtına kılıcı → alevli güneş kılıcı.
   Işık sol üstten; ağızlar İKİ YARI (aydınlık / gölge) boyanır, sırt
   çizgisi + kenar parlaması ile metal okunur. viewBox 100×100.
   Kimlikler kısa ve SVG başına yereldir; ui.uniqSVG her montajda sonek verir.
   ═══════════════════════════════════════════════════════════ */

const OL = '#0b0910';
const f = (n) => Math.round(n * 10) / 10;
const K = (w) => ' stroke="' + OL + '" stroke-width="' + w + '" stroke-linejoin="round" stroke-linecap="round"';

function stops(a) {
  let s = '';
  for (let i = 0; i < a.length; i++) s += '<stop offset="' + f(i / Math.max(1, a.length - 1)) + '" stop-color="' + a[i] + '"/>';
  return s;
}
const lin = (id, a, x1 = 0, y1 = 0, x2 = 1, y2 = 1) =>
  '<linearGradient id="' + id + '" x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '">' + stops(a) + '</linearGradient>';
const rad = (id, a, cx = 0.36, cy = 0.32, r = 0.85) =>
  '<radialGradient id="' + id + '" cx="' + cx + '" cy="' + cy + '" r="' + r + '">' + stops(a) + '</radialGradient>';

/* Catmull-Rom → kübik Bézier. Nokta [x, y, sivri]: sivri noktada teğet 0 (köşe kalır). */
function seg(pts, move) {
  let d = (move ? 'M' : ' L') + f(pts[0][0]) + ' ' + f(pts[0][1]);
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
    const a = p1[2] ? 0 : 1 / 6, b = p2[2] ? 0 : 1 / 6;
    d += ' C' + f(p1[0] + (p2[0] - p0[0]) * a) + ' ' + f(p1[1] + (p2[1] - p0[1]) * a) + ' ' +
      f(p2[0] - (p3[0] - p1[0]) * b) + ' ' + f(p2[1] - (p3[1] - p1[1]) * b) + ' ' + f(p2[0]) + ' ' + f(p2[1]);
  }
  return d;
}
function loop(pts) {
  const n = pts.length;
  let d = 'M' + f(pts[0][0]) + ' ' + f(pts[0][1]);
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
    const a = p1[2] ? 0 : 1 / 6, b = p2[2] ? 0 : 1 / 6;
    d += ' C' + f(p1[0] + (p2[0] - p0[0]) * a) + ' ' + f(p1[1] + (p2[1] - p0[1]) * a) + ' ' +
      f(p2[0] - (p3[0] - p1[0]) * b) + ' ' + f(p2[1] - (p3[1] - p1[1]) * b) + ' ' + f(p2[0]) + ' ' + f(p2[1]);
  }
  return d + ' Z';
}
const mirX = (pts) => pts.map((p) => [100 - p[0], p[1], p[2]]);
const mirY = (pts) => pts.map((p) => [p[0], 100 - p[1], p[2]]);
const P = (d, fill, w, extra) => '<path d="' + d + '" fill="' + fill + '"' + (w ? K(w) : '') + (extra || '') + '/>';
const TF = (r, s = 1, tx = 0, ty = 0) => 'translate(' + (50 + tx) + ' ' + (50 + ty) + ') rotate(' + r + ') scale(' + s + ') translate(-50 -50)';

/* ── MALZEMELER (gearArt v3 paletlerinin devamı; yeni renk icat edilmedi) ── */
const MAT = {
  cy: { lit: ['#eef0f3', '#a3a9b4'], shade: ['#7b818d', '#40454f'], ridge: '#343843',
    trim: ['#a4aab4', '#5f646f', '#2c3038'], grip: ['#8c6440', '#3e2914'], wrap: 'rgba(22,14,6,0.8)',
    wood: ['#b8894f', '#5c3b18'], gem: ['#c9ccd4', '#6b707c', '#2a2d35'] },
  yg: { lit: ['#ffe9c8', '#e0a86c'], shade: ['#b8743f', '#643418'], ridge: '#55301a',
    trim: ['#f6d59a', '#c98a4a', '#6e4418'], grip: ['#6a4424', '#26150a'], wrap: 'rgba(246,213,154,0.6)',
    wood: ['#9c6634', '#3a2210'], gem: ['#eaffe9', '#5fcf6a', '#1f5226'] },
  nd: { lit: ['#ffffff', '#c4e6fb'], shade: ['#86bbea', '#2f5f98'], ridge: '#244a74',
    trim: ['#f2f9ff', '#94bde2', '#3b6594'], grip: ['#3a5274', '#121b2a'], wrap: 'rgba(170,220,255,0.75)',
    wood: ['#e8f5ff', '#7aa6d6'], gem: ['#f2fbff', '#5aa8ff', '#163f78'], ice: ['#ffffff', '#c6ecff', '#63b8f2'] },
  ep: { lit: ['#d3c0f4', '#7d60b6'], shade: ['#4c3a78', '#1d1334'], ridge: '#120a22',
    trim: ['#c9a8f5', '#6c45b2', '#2a1656'], grip: ['#35284e', '#0f0a1c'], wrap: 'rgba(200,160,255,0.8)',
    wood: ['#6a52a0', '#1c1232'], gem: ['#fbf4ff', '#b06cff', '#43197a'] },
  ef: { lit: ['#fff8dc', '#f6c85c'], shade: ['#d6952e', '#7a4a10'], ridge: '#6a3e08',
    trim: ['#fff2bc', '#f2bb40', '#8a5a10'], grip: ['#a8281a', '#420a06'], wrap: 'rgba(255,214,120,0.9)',
    wood: ['#fff0b0', '#c98a2a'], gem: ['#ffe2cc', '#ff4a2a', '#7a0a08'], flame: ['#8a1a08', '#e24a14', '#ffb040', '#fff3b0'] },
};
const BONE = { lit: ['#fffdf0', '#eee0b6'], shade: ['#cdb782', '#7c6434'], ridge: '#8a7446' };

function base(m, extra) {
  return lin('L', m.lit) + lin('S', m.shade) + lin('T', m.trim, 0, 0, 0.7, 1) + lin('G', m.grip, 0, 0, 1, 0) +
    lin('W', m.wood, 0, 0, 1, 1) + rad('J', m.gem) +
    (m.ice ? lin('I', m.ice, 0, 0, 0.5, 1) : '') + (m.flame ? lin('F', m.flame, 0, 1, 0, 0) : '') + (extra || '');
}
const W = (tf, defs, body, over) =>
  '<svg viewBox="0 0 100 100"><defs>' + defs + '</defs><g transform="' + tf + '">' + body + '</g>' + (over || '') + '</svg>';

/* ── ortak parçalar ── */
/* ağız: prof [y, solYarı, sağYarı?, merkezKayması?] uçtan tabana */
function blade(prof, m, o) {
  o = o || {};
  const L = [], R = [], M = [], n = prof.length;
  prof.forEach((p, i) => {
    const y = p[0], wl = p[1], wr = p[2] == null ? p[1] : p[2], c = p[3] || 0;
    const sh = i === 0 || i === n - 1 ? 1 : 0;
    L.push([50 + c - wl, y, sh]); R.push([50 + c + wr, y, sh]); M.push([50 + c + (wr - wl) / 2, y, sh]);
  });
  const rev = (a) => a.slice().reverse();
  const d = seg(L, true) + seg(rev(R), false) + ' Z';
  const lit = seg(L, true) + seg(rev(M), false) + ' Z';
  const shd = seg(R, true) + seg(rev(M), false) + ' Z';
  const hi = seg(L.slice(1, -1).map((p) => [p[0] + 1.3, p[1]]), true);
  const litId = o.lit || 'L', shdId = o.shade || 'S';
  const fill = P(shd, 'url(#' + shdId + ')') + P(lit, 'url(#' + litId + ')') +
    P(seg(M.slice(1), true), 'none', 0, ' stroke="' + (o.ridge || m.ridge) + '" stroke-width="1" opacity="0.8"') +
    P(hi, 'none', 0, ' stroke="#fff" stroke-opacity="' + (o.hi == null ? 0.6 : o.hi) + '" stroke-width="1.1"');
  const line = P(d, 'none', o.w || 2.2);
  return { d, fill, line, all: fill + line };
}
function grip(x1, y1, x2, y2, n, wrap, id) {
  const w = x2 - x1, h = y2 - y1;
  let s = '<rect x="' + f(x1) + '" y="' + f(y1) + '" width="' + f(w) + '" height="' + f(h) + '" rx="' + f(w * 0.42) + '" fill="url(#' + (id || 'G') + ')"' + K(1.7) + '/>';
  for (let i = 1; i < n; i++) {
    const yy = y1 + (h / n) * i;
    s += '<path d="M' + f(x1 + 0.7) + ' ' + f(yy + 1.5) + ' L' + f(x2 - 0.7) + ' ' + f(yy - 1.5) + '" stroke="' + wrap + '" stroke-width="1.3"/>';
  }
  return s + '<path d="M' + f(x1 + 1.7) + ' ' + f(y1 + 2.2) + ' V' + f(y2 - 2.2) + '" stroke="#fff" stroke-opacity="0.2" stroke-width="1"/>';
}
function gem(cx, cy, r, id) {
  return '<circle cx="' + f(cx) + '" cy="' + f(cy) + '" r="' + f(r) + '" fill="url(#' + (id || 'J') + ')"' + K(1.3) + '/>' +
    '<ellipse cx="' + f(cx - r * 0.3) + '" cy="' + f(cy - r * 0.34) + '" rx="' + f(r * 0.34) + '" ry="' + f(r * 0.22) + '" fill="#fff" opacity="0.85"/>';
}
function disc(cx, cy, r, id, w) {
  return '<circle cx="' + f(cx) + '" cy="' + f(cy) + '" r="' + f(r) + '" fill="url(#' + (id || 'T') + ')"' + K(w || 1.6) + '/>' +
    '<path d="M' + f(cx - r * 0.62) + ' ' + f(cy - r * 0.2) + ' A' + f(r * 0.66) + ' ' + f(r * 0.66) + ' 0 0 1 ' + f(cx + r * 0.1) + ' ' + f(cy - r * 0.64) + '" fill="none" stroke="#fff" stroke-opacity="0.55" stroke-width="1"/>';
}
function star(x, y, s, c, o) {
  const k = s * 0.24;
  return '<path d="M' + f(x) + ' ' + f(y - s) + ' L' + f(x + k) + ' ' + f(y - k) + ' L' + f(x + s) + ' ' + f(y) + ' L' + f(x + k) + ' ' + f(y + k) +
    ' L' + f(x) + ' ' + f(y + s) + ' L' + f(x - k) + ' ' + f(y + k) + ' L' + f(x - s) + ' ' + f(y) + ' L' + f(x - k) + ' ' + f(y - k) + ' Z" fill="' + (c || '#fff') + '" opacity="' + (o == null ? 0.95 : o) + '"/>';
}
/* alev dili: taban (x,y), boy h, en w, uç kayması lean */
function flame(x, y, h, w, lean, id, core) {
  const d = loop([[x + lean, y - h, 1], [x + w * 0.52 + lean * 0.35, y - h * 0.5], [x + w * 0.5, y - h * 0.08], [x, y + w * 0.32], [x - w * 0.5, y - h * 0.08], [x - w * 0.52 + lean * 0.35, y - h * 0.5]]);
  let s = P(d, 'url(#' + (id || 'F') + ')', 1.2);
  if (core !== false) {
    const d2 = loop([[x + lean * 0.7, y - h * 0.62, 1], [x + w * 0.24 + lean * 0.2, y - h * 0.24], [x, y + w * 0.08], [x - w * 0.24 + lean * 0.2, y - h * 0.24]]);
    s += P(d2, '#fff3b0', 0, ' opacity="0.9"');
  }
  return s;
}
/* buz kristali: taban (x,y), boy, açı (° · 0 sağ · 90 aşağı), yarı en */
function shard(x, y, len, ang, w, id) {
  const a = ang * Math.PI / 180, dx = Math.cos(a), dy = Math.sin(a), nx = -dy, ny = dx;
  const mx = x + dx * len * 0.36, my = y + dy * len * 0.36, tx = x + dx * len, ty = y + dy * len;
  return '<path d="M' + f(x) + ' ' + f(y) + ' L' + f(mx + nx * w) + ' ' + f(my + ny * w) + ' L' + f(tx) + ' ' + f(ty) + ' L' + f(mx - nx * w) + ' ' + f(my - ny * w) + ' Z" fill="url(#' + (id || 'I') + ')"' + K(1) + '/>' +
    '<path d="M' + f(x) + ' ' + f(y) + ' L' + f(tx) + ' ' + f(ty) + '" stroke="#fff" stroke-opacity="0.75" stroke-width="0.7"/>';
}
/* yaprak/tüy: taban (x,y), boy, açı, yarı en */
function leaf(x, y, len, ang, w, fill, sw) {
  const a = ang * Math.PI / 180, dx = Math.cos(a), dy = Math.sin(a), nx = -dy, ny = dx;
  const mx = x + dx * len * 0.45, my = y + dy * len * 0.45;
  return P(loop([[x, y, 1], [mx + nx * w, my + ny * w], [x + dx * len, y + dy * len, 1], [mx - nx * w, my - ny * w]]), fill, sw == null ? 1.1 : sw) +
    '<path d="M' + f(x) + ' ' + f(y) + ' L' + f(x + dx * len * 0.85) + ' ' + f(y + dy * len * 0.85) + '" stroke="' + OL + '" stroke-opacity="0.45" stroke-width="0.7"/>';
}
function bolt(pts, w, glow) {
  const d = 'M' + pts.map((p) => f(p[0]) + ' ' + f(p[1])).join(' L');
  return '<path d="' + d + '" fill="none" stroke="' + (glow || '#b58cff') + '" stroke-opacity="0.4" stroke-width="' + f((w || 1.4) * 3.4) + '" stroke-linejoin="round" stroke-linecap="round"/>' +
    '<path d="' + d + '" fill="none" stroke="#fff" stroke-width="' + (w || 1.4) + '" stroke-linejoin="round" stroke-linecap="round"/>';
}
const halo = (id, c) => rad(id, [c, 'rgba(0,0,0,0)'], 0.5, 0.5, 0.5);
const glowAt = (cx, cy, r, id) => '<circle cx="' + f(cx) + '" cy="' + f(cy) + '" r="' + f(r) + '" fill="url(#' + id + ')"/>';
const ember = (x, y, r, c) => '<circle cx="' + f(x) + '" cy="' + f(y) + '" r="' + f(r) + '" fill="' + (c || '#ffb040') + '"/>';

export const WEAPON_ART = {};
const A = WEAPON_ART;

/* ═════════════ KILIÇ ═════════════ */

/* Paslı Kılıç — kısa, çentikli, pas lekeli; düz demir balçak, ip sargı */
A.w_cy_kilic = (() => {
  const m = MAT.cy;
  const b = blade([[-4, 0], [5, 4.8], [16, 5.6], [27, 5.6], [30, 5.6, 4.1], [33, 5.6], [45, 5.8], [48, 4.4, 5.8], [51, 5.8], [62, 6.2]], m);
  return W(TF(45), base(m),
    b.fill +
    '<clipPath id="C"><path d="' + b.d + '"/></clipPath><g clip-path="url(#C)" fill="#8a4a24">' +
      '<ellipse cx="47" cy="40" rx="3" ry="6.5" opacity="0.5"/><ellipse cx="53.5" cy="19" rx="2.4" ry="3.8" opacity="0.45"/>' +
      '<ellipse cx="51" cy="57" rx="4.4" ry="3.2" opacity="0.55"/><circle cx="46" cy="12" r="1.3" opacity="0.5"/><circle cx="54" cy="47" r="1" opacity="0.6"/></g>' +
    b.line +
    P('M32.5 62.5 Q50 60.6 67.5 62.5 L67.5 67.5 Q50 69.4 32.5 67.5 Z', 'url(#T)', 1.8) +
    '<circle cx="32.5" cy="65" r="2.8" fill="url(#T)"' + K(1.4) + '/><circle cx="67.5" cy="65" r="2.8" fill="url(#T)"' + K(1.4) + '/>' +
    grip(46, 67.5, 54, 89, 6, m.wrap) +
    disc(50, 94.5, 5.6)
  );
})();

/* Bakır Kılıç — tunç yaprak ağız (gladius), kayık balçak, yeşil taş */
A.w_yg_kilic = (() => {
  const m = MAT.yg;
  const b = blade([[-4, 0], [6, 3.6], [20, 6.4], [32, 7.3], [44, 6.1], [54, 4.8], [61, 5.4]], m);
  return W(TF(45), base(m),
    b.all +
    P('M47.4 57 L50 36 L52.6 57', 'none', 0, ' stroke="#6e3c1a" stroke-width="0.9" opacity="0.85"') +
    P('M32.5 61.5 C40 58.4 60 58.4 67.5 61.5 C68.6 64.6 66.4 67.6 62.8 68.2 C56 66.4 44 66.4 37.2 68.2 C33.6 67.6 31.4 64.6 32.5 61.5 Z', 'url(#T)', 1.8) +
    gem(50, 63.6, 3.1) +
    grip(46, 68, 54, 88, 5, m.wrap) +
    '<rect x="45" y="71" width="10" height="2.6" rx="1.2" fill="url(#T)"' + K(1.1) + '/>' +
    '<rect x="45" y="83.6" width="10" height="2.6" rx="1.2" fill="url(#T)"' + K(1.1) + '/>' +
    disc(50, 93.6, 6.2) + gem(50, 93.6, 2.7),
    star(80, 16, 3.2, '#fff4d8', 0.85)
  );
})();

/* Buzul Kılıcı — uzun ağız, sırtından buz kristalleri büyür, hilal balçak */
A.w_nd_kilic = (() => {
  const m = MAT.nd;
  const b = blade([[-9, 0], [0, 5.0], [12, 6.0], [54, 6.0], [60, 7.0]], m);
  return W(TF(45), base(m, halo('H', 'rgba(140,210,255,0.55)')),
    glowAt(50, 20, 22, 'H') +
    shard(55.6, 11, 12, -58, 2.6) + shard(55.8, 28, 10, -52, 2.3) + shard(55.8, 44, 8, -48, 2) + shard(44.2, 35, 9, -125, 2.1) + shard(44, 50, 6, -130, 1.7) +
    b.all +
    P('M26.5 54.5 C33 63 41 65.6 50 65.6 C59 65.6 67 63 73.5 54.5 C72.4 63.4 63 70.8 50 70.8 C37 70.8 27.6 63.4 26.5 54.5 Z', 'url(#T)', 1.8) +
    gem(50, 66.6, 4.3) +
    grip(46.2, 70.8, 53.8, 88, 5, m.wrap) +
    P('M50 87.6 L55.8 94.6 L50 104 L44.2 94.6 Z', 'url(#I)', 1.5) +
    P('M50 88.4 L50 103', 'none', 0, ' stroke="#fff" stroke-opacity="0.7" stroke-width="0.8"'),
    star(86, 10, 4.2, '#ffffff') + star(67, 30, 2.4, '#d6f0ff', 0.9)
  );
})();

/* Fırtına Ejder Kılıcı — ejder dikenli sırt, kanat balçak, yıldırım oluğu */
A.w_ep_kilic = (() => {
  const m = MAT.ep;
  const b = blade([[-7, 0], [3, 5.4], [16, 7.0], [58, 7.0], [62, 8.2]], m);
  const spikes = [26, 37, 48].map((y) => P('M43.4 ' + (y - 3) + ' L35 ' + (y + 4) + ' L43.4 ' + (y + 3) + ' Z', 'url(#S)', 1.4)).join('');
  return W(TF(45), base(m, halo('H', 'rgba(176,120,255,0.55)')),
    glowAt(50, 26, 24, 'H') + spikes +
    b.all +
    '<path d="M50 6 L50 56" stroke="#b58cff" stroke-opacity="0.5" stroke-width="5.2" stroke-linecap="round"/>' +
    '<path d="M50 6 L50 56" stroke="#f6eeff" stroke-width="1.6" stroke-linecap="round"/>' +
    '<path d="M47.6 17 L52.4 19.4 M47.6 29 L52.4 31.4 M47.6 41 L52.4 43.4" stroke="#fff" stroke-opacity="0.75" stroke-width="0.9"/>' +
    bolt([[60, -2], [64.5, 8], [59.5, 13.5], [66.5, 24], [61, 29.5], [65, 38]], 1.4) +
    bolt([[39.5, 14], [34, 22], [38.6, 26], [33, 35]], 1.2) +
    P('M47 60 C40 57 31 52 21.5 44.5 C23 51 24.8 55 28 58 C25 58.4 22.8 59.8 21 62.2 C29 64 37 65.6 47 66.6 Z', 'url(#T)', 1.6) +
    P('M53 60 C60 57 69 52 78.5 44.5 C77 51 75.2 55 72 58 C75 58.4 77.2 59.8 79 62.2 C71 64 63 65.6 53 66.6 Z', 'url(#T)', 1.6) +
    '<path d="M44.5 62 L28.5 52.5 M44.5 64.4 L26.5 60.6 M55.5 62 L71.5 52.5 M55.5 64.4 L73.5 60.6" stroke="' + OL + '" stroke-opacity="0.5" stroke-width="0.9"/>' +
    disc(50, 63.4, 4.8) + gem(50, 63.4, 3.1) +
    grip(46, 66.8, 54, 88, 5, m.wrap) +
    P('M44.4 88 L55.6 88 L53.6 96 L50 104 L46.4 96 Z', 'url(#T)', 1.5) + gem(50, 92.6, 2.1),
    star(83, 12, 3.6, '#f3e8ff') + star(61, 46, 2.2, '#e2ccff', 0.9)
  );
})();

/* Güneş Alevi Kılıcı — dalgalı (flamberge) altın ağız, güneş kursu balçak, kenarlarından alev */
A.w_ef_kilic = (() => {
  const m = MAT.ef;
  const b = blade([[-4, 0], [5, 4.6], [12, 6.2], [19, 5.0], [26, 6.6], [33, 5.2], [40, 6.8], [47, 5.4], [54, 7.0], [60, 6.2], [63, 7.0]], m);
  let rays = '';
  for (let i = 0; i < 12; i++) {
    const a = (i * 30 + 15) * Math.PI / 180, r1 = 7, r2 = i % 2 ? 12.5 : 15;
    const x = (r, da) => f(50 + Math.cos(a + da) * r), y = (r, da) => f(66 + Math.sin(a + da) * r);
    rays += '<path d="M' + x(r1, -0.2) + ' ' + y(r1, -0.2) + ' L' + x(r2, 0) + ' ' + y(r2, 0) + ' L' + x(r1, 0.2) + ' ' + y(r1, 0.2) + ' Z" fill="url(#T)"' + K(1) + '/>';
  }
  return W(TF(45, 0.97), base(m, halo('H', 'rgba(255,150,50,0.6)')),
    glowAt(50, 30, 26, 'H') +
    flame(56.6, 26, 13, 7, 3.2) + flame(43.4, 36, 12, 6.5, -3.2) + flame(57.4, 47, 10, 6, 3) + flame(42.6, 55, 8, 5.2, -2.6) +
    rays + b.all +
    '<path d="M50 8 L50 58" stroke="#ff8a30" stroke-opacity="0.55" stroke-width="3.2" stroke-linecap="round"/><path d="M50 8 L50 58" stroke="#fff6cc" stroke-width="1" stroke-linecap="round"/>' +
    P('M29 63.4 Q50 59.4 71 63.4 L71 68.6 Q50 72.6 29 68.6 Z', 'url(#T)', 1.7) +
    disc(50, 66, 7) + gem(50, 66, 4) +
    grip(46, 72.4, 54, 90, 5, m.wrap) +
    disc(50, 95, 6.2) + gem(50, 95, 2.8),
    ember(18, 30, 1.6) + ember(30, 12, 1.1, '#ffd070') + ember(76, 48, 1.3) + star(86, 12, 4, '#fff3c0')
  );
})();

/* ═════════════ HANÇER ═════════════ */

/* Kör Hançer — tek ağızlı köylü bıçağı, ahşap sap, pirinç perçin */
A.w_cy_hancer = (() => {
  const m = MAT.cy;
  const b = blade([[6, 0, 0, -3.6], [14, 2.6, 3.8, -2.8], [28, 3.6, 6.1, -1.6], [44, 4, 6.8, -0.6], [55, 4.2, 7, 0]], m, { hi: 0.4 });
  return W(TF(45, 1.08, 0, -2), base(m),
    b.fill +
    '<clipPath id="C"><path d="' + b.d + '"/></clipPath><g clip-path="url(#C)" fill="#8a4a24"><ellipse cx="53" cy="36" rx="2.6" ry="4.4" opacity="0.45"/><circle cx="48" cy="22" r="1.4" opacity="0.5"/></g>' +
    b.line +
    '<rect x="42.6" y="54.4" width="17" height="6.2" rx="1.6" fill="url(#T)"' + K(1.6) + '/>' +
    '<rect x="44.4" y="60.4" width="13" height="31" rx="5.6" fill="url(#W)"' + K(1.8) + '/>' +
    '<path d="M47.6 64 C48.8 72 46.8 80 48.4 88" fill="none" stroke="#2a1a08" stroke-opacity="0.45" stroke-width="0.9"/>' +
    '<circle cx="51" cy="68" r="1.7" fill="#d8b070"' + K(0.9) + '/><circle cx="51" cy="83" r="1.7" fill="#d8b070"' + K(0.9) + '/>'
  );
})();

/* Suikastçı Hançeri — kavisli tunç ağız, S balçak, yeşil taş topuz */
A.w_yg_hancer = (() => {
  const m = MAT.yg;
  const b = blade([[2, 0, 0, 13], [9, 2.6, 2.6, 9.6], [20, 4.4, 4.4, 5.3], [34, 5.4, 5.4, 2], [48, 5.4, 5.4, 0.4], [56, 5.8, 5.8, 0]], m);
  return W(TF(45, 1.06, 0, -2), base(m),
    b.all +
    P('M35.5 54.6 C38.6 59.6 44 60.2 50 60.2 C56 60.2 61.4 60.8 64.5 65.2 C60.4 64 56 64.4 50 64.4 C44 64.4 38.2 62.2 35.5 54.6 Z', 'url(#T)', 1.6) +
    gem(50, 62.3, 2.2) +
    grip(45.6, 64.4, 54.4, 87.6, 6, m.wrap) +
    P('M44.4 87.4 L55.6 87.4 L53.2 91.6 L46.8 91.6 Z', 'url(#T)', 1.4) +
    gem(50, 95.2, 4.3),
    star(80, 14, 3, '#fff4d8', 0.85)
  );
})();

/* Buz İğnesi Hançeri — ince stiletto, kristal uçlu haç balçak */
A.w_nd_hancer = (() => {
  const m = MAT.nd;
  const b = blade([[-4, 0], [14, 2.2], [40, 3.5], [54, 4]], m);
  return W(TF(45, 1.02, 0, -1), base(m, halo('H', 'rgba(140,210,255,0.55)')),
    glowAt(50, 24, 20, 'H') +
    shard(53.6, 20, 9, -50, 2) + shard(46.6, 32, 8, -130, 1.9) + shard(53.6, 44, 6.5, -40, 1.6) +
    b.all +
    '<rect x="35.5" y="54" width="29" height="4.8" rx="2.2" fill="url(#T)"' + K(1.5) + '/>' +
    P('M36 56.4 L29.6 51.6 L26.4 56.4 L29.6 61.2 Z', 'url(#I)', 1.3) + P('M64 56.4 L70.4 51.6 L73.6 56.4 L70.4 61.2 Z', 'url(#I)', 1.3) +
    gem(50, 56.4, 3.5) +
    grip(46.6, 58.8, 53.4, 88, 6, m.wrap) +
    P('M50 87.6 L55.2 93 L50 101.4 L44.8 93 Z', 'url(#I)', 1.4),
    star(84, 10, 3.8, '#fff') + star(66, 34, 2.2, '#d6f0ff', 0.9)
  );
})();

/* Fısıltı Hançeri — dalgalı kris ağız, boynuz balçak, kenarında şimşek */
A.w_ep_hancer = (() => {
  const m = MAT.ep;
  const b = blade([[0, 0], [8, 3.4, 3.4, 2.2], [16, 4.6, 4.6, -1.6], [24, 5, 5, 2], [32, 5.4, 5.4, -1.6], [40, 5.8, 5.8, 1.6], [48, 6.2, 6.2, -0.4], [56, 7, 7, 0]], m);
  return W(TF(45, 1.04, 0, -1), base(m, halo('H', 'rgba(176,120,255,0.55)')),
    glowAt(50, 26, 22, 'H') +
    b.all +
    '<path d="M50 8 C51.6 16 48.4 24 51.6 32 C48.6 40 51 46 50 54" fill="none" stroke="#b58cff" stroke-opacity="0.55" stroke-width="3.6" stroke-linecap="round"/>' +
    '<path d="M50 8 C51.6 16 48.4 24 51.6 32 C48.6 40 51 46 50 54" fill="none" stroke="#f6eeff" stroke-width="1.1" stroke-linecap="round"/>' +
    bolt([[58, 2], [62.5, 11], [58.4, 16], [64, 25]], 1.2) + bolt([[40, 24], [35.4, 32], [39.6, 36], [34.6, 45]], 1.1) +
    P('M32.6 48.6 C34.6 56 41 59.2 50 59.2 C59 59.2 65.4 56 67.4 48.6 C68 57.4 61 63.8 50 63.8 C39 63.8 32 57.4 32.6 48.6 Z', 'url(#T)', 1.6) +
    gem(50, 60.8, 3.2) +
    grip(45.6, 63.8, 54.4, 87.6, 5, m.wrap) +
    P('M42.6 89.4 C44.6 97.6 55.4 97.6 57.4 89.4 C54.4 92.6 45.6 92.6 42.6 89.4 Z', 'url(#T)', 1.4) + gem(50, 92.8, 2.2),
    star(84, 12, 3.4, '#f3e8ff')
  );
})();

/* Ejder Dişi Hançeri — kavisli fildişi diş, altın pençe balçak, alev */
A.w_ef_hancer = (() => {
  const m = MAT.ef;
  const defs = base(m, lin('BL', BONE.lit) + lin('BS', BONE.shade) + halo('H', 'rgba(255,150,50,0.6)'));
  const b = blade([[0, 0, 0, 11], [10, 3.2, 3.2, 8], [24, 5.6, 5.6, 4], [40, 7.2, 7.2, 1.2], [54, 8, 8, 0]], m, { lit: 'BL', shade: 'BS', ridge: BONE.ridge });
  return W(TF(45, 1.02, 0, -1), defs,
    glowAt(52, 28, 24, 'H') +
    flame(59.6, 22, 13, 6.4, 4) + flame(41.6, 38, 11, 6, -3.4) + flame(57.8, 47, 9, 5.4, 3) +
    b.all +
    '<path d="M60 8 C57 20 54 34 52 50" fill="none" stroke="#b89a5a" stroke-opacity="0.6" stroke-width="0.9"/>' +
    P('M31.6 52.6 C38 57.8 44 57.4 50 57.4 C56 57.4 62 57.8 68.4 52.6 L65.6 62.6 C59 61 55 63.2 50 63.2 C45 63.2 41 61 34.4 62.6 Z', 'url(#T)', 1.6) +
    gem(50, 60, 3.5) +
    grip(45.4, 63.2, 54.6, 87.6, 5, m.wrap) +
    disc(50, 93.2, 5.8) + gem(50, 93.2, 2.6),
    ember(20, 34, 1.5) + ember(28, 14, 1.1, '#ffd070') + ember(78, 50, 1.3) + star(84, 12, 3.6, '#fff3c0')
  );
})();

/* ═════════════ BALTA ═════════════ */
const haft = (x1, y1, x2, y2, id) => '<rect x="' + x1 + '" y="' + y1 + '" width="' + (x2 - x1) + '" height="' + (y2 - y1) + '" rx="' + f((x2 - x1) / 2) + '" fill="url(#' + (id || 'W') + ')"' + K(1.8) + '/>' +
  '<path d="M' + (x1 + 1.6) + ' ' + (y1 + 3) + ' V' + (y2 - 3) + '" stroke="#fff" stroke-opacity="0.22" stroke-width="1"/>';

/* Çentik Balta — tek ağızlı el baltası, ağzı çentikli, ip sargılı sap */
A.w_cy_balta = (() => {
  const m = MAT.cy;
  const bit = 'M53 14 L60 13 C66 11 72 7.4 77 4.6 C81.6 14 82.6 27 79.6 38.4 C73.6 34.6 67 32 60.6 31.4 L53 31 Z';
  return W(TF(28, 0.9, 2, 0), base(m, lin('R', ['#c7ad7a', '#6e5830'], 0, 0, 1, 0)),
    haft(46.2, 8, 53.8, 99) +
    '<path d="M49 20 C50.4 40 48.6 60 50.2 94" fill="none" stroke="#2a1a08" stroke-opacity="0.35" stroke-width="0.9"/>' +
    P('M47 14 L41.4 15.6 L41.4 29.6 L47 31 Z', 'url(#T)', 1.7) +
    P(bit, 'url(#L)', 2.1) +
    '<clipPath id="C"><path d="' + bit + '"/></clipPath><g clip-path="url(#C)">' +
      '<path d="M77 4.6 C81.6 14 82.6 27 79.6 38.4 L75.4 35.6 C78 26 77.4 15.6 73.6 7.6 Z" fill="#fbfcfe" opacity="0.8"/>' +
      '<path d="M53 24 C62 24 70 27 79.6 38.4 L53 38 Z" fill="url(#S)" opacity="0.75"/>' +
      '<ellipse cx="64" cy="19" rx="3" ry="2.2" fill="#8a4a24" opacity="0.5"/><circle cx="70" cy="27" r="1.4" fill="#8a4a24" opacity="0.5"/></g>' +
    P(bit, 'none', 2.1) +
    P('M82.2 17 L78.6 19.2 L82.4 21.6 Z', OL) + P('M81.2 29 L78 30.4 L80.8 32.6 Z', OL) +
    '<rect x="45.6" y="12.4" width="8.8" height="20.6" rx="1.8" fill="url(#T)"' + K(1.6) + '/>' +
    '<circle cx="48" cy="16" r="0.9" fill="#d0d4dc"/><circle cx="52" cy="16" r="0.9" fill="#d0d4dc"/><circle cx="48" cy="29.4" r="0.9" fill="#d0d4dc"/><circle cx="52" cy="29.4" r="0.9" fill="#d0d4dc"/>' +
    grip(46.4, 72, 53.6, 93, 6, 'rgba(40,28,12,0.7)', 'R') +
    disc(50, 99, 3.6)
  );
})();

/* Bronz Balta — sakallı tunç ağız, çekiç arka, yeşil taş perçin */
A.w_yg_balta = (() => {
  const m = MAT.yg;
  const bit = 'M53 13 L60 12.4 C66.6 10.4 72 7 76.6 4 C82 15 83.6 31 79 46 C74.6 41 68.6 34.4 62 31 L53 30.6 Z';
  return W(TF(28, 0.9, 2, 0), base(m, lin('R', ['#7a4c26', '#2e1a0a'], 0, 0, 1, 0)),
    haft(46.2, 8, 53.8, 99) +
    '<rect x="39.6" y="14" width="7.8" height="15.4" rx="1.6" fill="url(#T)"' + K(1.7) + '/>' +
    '<path d="M41.2 16.4 V27" stroke="#fff" stroke-opacity="0.45" stroke-width="1"/>' +
    P(bit, 'url(#L)', 2.1) +
    '<clipPath id="C"><path d="' + bit + '"/></clipPath><g clip-path="url(#C)">' +
      '<path d="M76.6 4 C82 15 83.6 31 79 46 L75.6 42.4 C79.4 30 78.4 17 73.2 7.4 Z" fill="#fff1d6" opacity="0.75"/>' +
      '<path d="M53 22 C62 22 72 30 79 46 L53 46 Z" fill="url(#S)" opacity="0.7"/></g>' +
    P(bit, 'none', 2.1) +
    '<path d="M60.6 18.6 C64.6 16.4 69.4 17.6 69.4 21.8 C69.4 24.4 66.4 25 65.2 23" fill="none" stroke="#6e3c1a" stroke-width="1" opacity="0.85"/>' +
    '<rect x="45.6" y="11.6" width="8.8" height="20.6" rx="1.8" fill="url(#T)"' + K(1.6) + '/>' +
    gem(50, 21.8, 2.7) +
    '<rect x="45.8" y="70" width="8.4" height="3" rx="1.2" fill="url(#T)"' + K(1.2) + '/>' +
    grip(46.4, 73, 53.6, 92.6, 5, m.wrap, 'R') +
    P('M46.4 92.6 L53.6 92.6 L52.8 100 L47.2 100 Z', 'url(#T)', 1.5),
    star(84, 12, 3, '#fff4d8', 0.85)
  );
})();

/* Fırtına Baltası — çift ağızlı buz baltası, alt kenardan sarkıt, kristal tepe */
A.w_nd_balta = (() => {
  const m = MAT.nd;
  const R = [[53.5, 14, 1], [62, 11], [71, 6], [79, 2.4, 1], [85.4, 13.6], [86, 31], [80, 43, 1], [72, 39], [62.4, 34], [53.5, 32, 1]];
  const bitR = seg(R, true) + ' Z', bitL = seg(mirX(R), true) + ' Z';
  const edge = (s) => '<path d="' + (s > 0 ? 'M79 2.4 C85.4 13.6 86 31 80 43' : 'M21 2.4 C14.6 13.6 14 31 20 43') + '" fill="none" stroke="#ffffff" stroke-width="2.6" stroke-opacity="0.85"/>';
  return W(TF(28, 0.88, 2, 1), base(m, halo('H', 'rgba(140,210,255,0.5)')),
    glowAt(50, 22, 30, 'H') +
    haft(46.2, 10, 53.8, 99, 'G') +
    '<path d="M47.6 44 L52.4 46 M47.6 56 L52.4 58 M47.6 68 L52.4 70" stroke="' + m.wrap + '" stroke-width="1.2"/>' +
    P('M47 14 L50 -3 L53 14 Z', 'url(#I)', 1.4) +
    P(bitR, 'url(#L)') + P(bitL, 'url(#L)') +
    '<path d="M53.5 24 C64 26 74 33 80 43 L53.5 38 Z M46.5 24 C36 26 26 33 20 43 L46.5 38 Z" fill="url(#S)" opacity="0.6"/>' +
    edge(1) + edge(-1) + P(bitR, 'none', 2) + P(bitL, 'none', 2) +
    shard(66, 36.6, 9, 96, 1.8) + shard(73, 39.8, 7, 102, 1.6) + shard(34, 36.6, 9, 84, 1.8) + shard(27, 39.8, 7, 78, 1.6) +
    '<rect x="45.4" y="11" width="9.2" height="23.6" rx="2.2" fill="url(#T)"' + K(1.6) + '/>' +
    gem(50, 22.6, 3.6) +
    P('M50 94 L54 99 L50 106 L46 99 Z', 'url(#I)', 1.3),
    star(86, 16, 3.8, '#fff') + star(22, 12, 2.4, '#d6f0ff', 0.9)
  );
})();

/* Kaos Baltası — çift hilal kara-mor ağız, kenarlarında yıldırım, tepe mızrak */
A.w_ep_balta = (() => {
  const m = MAT.ep;
  const R = [[53.5, 12, 1], [61, 10.6], [68, 6.6], [72, -1, 1], [84, 9], [89, 24], [85, 40], [76, 50, 1], [72.6, 42], [64, 35.6], [53.5, 33, 1]];
  const bitR = seg(R, true) + ' Z', bitL = seg(mirX(R), true) + ' Z';
  return W(TF(28, 0.86, 2, 2), base(m, halo('H', 'rgba(176,120,255,0.5)')),
    glowAt(50, 22, 32, 'H') +
    haft(46.2, 10, 53.8, 97, 'G') +
    '<rect x="46.2" y="50" width="7.6" height="2.4" rx="1" fill="#c7a2ff" opacity="0.9"/><rect x="46.2" y="62" width="7.6" height="2.4" rx="1" fill="#c7a2ff" opacity="0.9"/>' +
    P('M46.6 12 L50 -7 L53.4 12 Z', 'url(#L)', 1.5) + '<path d="M50 -4 L50 10" stroke="#fff" stroke-opacity="0.6" stroke-width="0.8"/>' +
    P(bitR, 'url(#L)') + P(bitL, 'url(#L)') +
    '<path d="M53.5 24 C64 26 72 36 76 50 L53.5 40 Z M46.5 24 C36 26 28 36 24 50 L46.5 40 Z" fill="url(#S)" opacity="0.75"/>' +
    P(bitR, 'none', 2) + P(bitL, 'none', 2) +
    bolt([[73, 1], [80, 9], [77.4, 14], [85, 23], [81, 29], [84.4, 38]], 1.3) +
    bolt(mirX([[73, 1], [80, 9], [77.4, 14], [85, 23], [81, 29], [84.4, 38]]), 1.3) +
    '<rect x="44.8" y="10.4" width="10.4" height="24.4" rx="2.4" fill="url(#T)"' + K(1.6) + '/>' +
    gem(50, 22.6, 3.9) +
    P('M46.8 96.4 L53.2 96.4 L50 104.4 Z', 'url(#T)', 1.4),
    star(88, 16, 3.4, '#f3e8ff')
  );
})();

/* Kıyamet Baltası — dev altın çift ağız, kıvılcımlı alev tepe, yakut kurs */
A.w_ef_balta = (() => {
  const m = MAT.ef;
  const R = [[53.5, 13, 1], [60, 11], [67, 6], [72, 0, 1], [81, 9], [86, 25], [83, 40], [77, 48], [72, 52, 1], [68, 44], [61, 37.4], [53.5, 34, 1]];
  const bitR = seg(R, true) + ' Z', bitL = seg(mirX(R), true) + ' Z';
  return W(TF(28, 0.79, 2, 3), base(m, lin('R', ['#3a2020', '#140606'], 0, 0, 1, 0) + halo('H', 'rgba(255,150,50,0.55)')),
    glowAt(50, 20, 32, 'H') +
    haft(46.2, 10, 53.8, 98, 'R') +
    '<rect x="45.8" y="52" width="8.4" height="3" rx="1.2" fill="url(#T)"' + K(1.1) + '/><rect x="45.8" y="66" width="8.4" height="3" rx="1.2" fill="url(#T)"' + K(1.1) + '/>' +
    grip(46.4, 74, 53.6, 92, 5, m.wrap) +
    flame(72, 3, 12, 6.4, 2.6) + flame(28, 3, 12, 6.4, -2.6) + flame(83.4, 28, 9, 5, 3.4) + flame(16.6, 28, 9, 5, -3.4) +
    flame(50, 13, 18, 8, 0) +
    P(bitR, 'url(#L)') + P(bitL, 'url(#L)') +
    '<path d="M53.5 25 C63 27 70 38 72 52 L53.5 42 Z M46.5 25 C37 27 30 38 28 52 L46.5 42 Z" fill="url(#S)" opacity="0.7"/>' +
    P(bitR, 'none', 2) + P(bitL, 'none', 2) +
    '<path d="M59 19 C65 17 72 19.6 75 26 M41 19 C35 17 28 19.6 25 26" fill="none" stroke="#8a5a10" stroke-width="1" opacity="0.9"/>' +
    disc(50, 23, 6.6) + gem(50, 23, 3.9) +
    disc(50, 99.6, 3.6),
    ember(14, 16, 1.4) + ember(88, 44, 1.2, '#ffd070') + star(86, 12, 3.6, '#fff3c0')
  );
})();

/* ═════════════ YAY ═════════════ */
/* üst kol (dış + iç kenar) → alt kol y aynası; kiriş sol, ok sağa */
function limbs(outer, inner, fill, w) {
  const up = seg(outer, true) + seg(inner, false) + ' Z';
  const dn = seg(mirY(outer), true) + seg(mirY(inner), false) + ' Z';
  return P(up, fill, w || 1.9) + P(dn, fill, w || 1.9);
}
function arrow(x1, x2, shaftC, headFill, fletch) {
  return '<path d="M' + x1 + ' 50 L' + x2 + ' 50" stroke="' + OL + '" stroke-width="3.8" stroke-linecap="round"/>' +
    '<path d="M' + x1 + ' 50 L' + x2 + ' 50" stroke="' + shaftC + '" stroke-width="2" stroke-linecap="round"/>' +
    P('M' + x2 + ' 46.2 L' + (x2 + 9.6) + ' 50 L' + x2 + ' 53.8 L' + (x2 + 1.6) + ' 50 Z', headFill, 1.3) +
    P('M' + (x1 + 1) + ' 50 L' + (x1 - 4) + ' 45.4 L' + (x1 + 6) + ' 45.4 L' + (x1 + 9) + ' 50 Z', fletch, 1.1) +
    P('M' + (x1 + 1) + ' 50 L' + (x1 - 4) + ' 54.6 L' + (x1 + 6) + ' 54.6 L' + (x1 + 9) + ' 50 Z', fletch, 1.1);
}
const bowGrip = (id, wrap) => '<rect x="59.4" y="40.6" width="9" height="18.8" rx="3.4" fill="url(#' + (id || 'G') + ')"' + K(1.7) + '/>' +
  '<path d="M59.8 45 L68 43.4 M59.8 50 L68 48.4 M59.8 55 L68 53.4" stroke="' + wrap + '" stroke-width="1.2"/>';

/* Basit Avcı Yayı — düz ahşap self-yay, deri kabza, sade ok */
A.w_cy_yay = (() => {
  const m = MAT.cy;
  return W(TF(-45, 1.02, 3, -4), base(m),
    '<path d="M38.4 4 L31 50 L38.4 96" fill="none" stroke="#e9e2cc" stroke-width="1.2"/>' +
    limbs([[39, 2.6, 1], [50, 10], [59.4, 22], [64.4, 36], [65.6, 46, 1]], [[59.6, 46, 1], [58.4, 37], [53.8, 25], [46, 14.4], [37.4, 5.2, 1]], 'url(#W)') +
    '<path d="M42 7.4 C52 14 58 24 61.6 36" fill="none" stroke="#fff" stroke-opacity="0.3" stroke-width="1"/>' +
    bowGrip('G', m.wrap) +
    arrow(31, 83, '#b8894f', 'url(#T)', '#d8d0bc')
  );
})();

/* Composite Yay — geri kıvrık kollar, boynuz uçlar, tunç halkalı kabza */
A.w_yg_yay = (() => {
  const m = MAT.yg;
  const out = [[45.4, 1, 1], [41.2, 6], [46, 11.6], [56, 21.6], [63, 35], [65.8, 46, 1]];
  const inn = [[59.6, 46, 1], [57.8, 37], [51.8, 26.6], [43, 18], [36.4, 10.4], [40.4, 2.2, 1]];
  return W(TF(-45, 1.02, 3, -4), base(m, lin('HB', ['#fff6dc', '#c8b27a'])),
    '<path d="M41.6 3.4 L31 50 L41.6 96.6" fill="none" stroke="#efe4c4" stroke-width="1.2"/>' +
    limbs(out, inn, 'url(#W)') +
    '<ellipse cx="41.4" cy="4.4" rx="2.8" ry="3.4" fill="url(#HB)"' + K(1.2) + '/><ellipse cx="41.4" cy="95.6" rx="2.8" ry="3.4" fill="url(#HB)"' + K(1.2) + '/>' +
    '<path d="M47 14 C55 20 60 28 62.6 37" fill="none" stroke="#f6d59a" stroke-opacity="0.55" stroke-width="1"/>' +
    '<path d="M47 86 C55 80 60 72 62.6 63" fill="none" stroke="#f6d59a" stroke-opacity="0.35" stroke-width="1"/>' +
    bowGrip('G', m.wrap) +
    '<rect x="58.8" y="39" width="10.2" height="2.6" rx="1.2" fill="url(#T)"' + K(1.1) + '/><rect x="58.8" y="58.4" width="10.2" height="2.6" rx="1.2" fill="url(#T)"' + K(1.1) + '/>' +
    arrow(31, 83, '#9c6634', 'url(#T)', '#5fcf6a') + gem(64, 50, 2.4),
    star(84, 20, 3, '#fff4d8', 0.85)
  );
})();

/* Buz Rüzgârı Yayı — buz kristali kollar, parlayan kiriş, kristal ok */
A.w_nd_yay = (() => {
  const m = MAT.nd;
  const out = [[45.4, 1, 1], [41.2, 6], [46, 11.6], [56, 21.6], [63, 35], [65.8, 46, 1]];
  const inn = [[59.6, 46, 1], [57.8, 37], [51.8, 26.6], [43, 18], [36.4, 10.4], [40.4, 2.2, 1]];
  return W(TF(-45, 1.0, 3, -4), base(m, halo('H', 'rgba(140,210,255,0.5)')),
    glowAt(58, 50, 34, 'H') +
    '<path d="M41.6 3.4 L31 50 L41.6 96.6" fill="none" stroke="#9fd8ff" stroke-opacity="0.5" stroke-width="3.4"/>' +
    '<path d="M41.6 3.4 L31 50 L41.6 96.6" fill="none" stroke="#fff" stroke-width="1.1"/>' +
    shard(58, 23, 9, -28, 2) + shard(63.6, 36, 8, -8, 1.8) + shard(58, 77, 9, 28, 2) + shard(63.6, 64, 8, 8, 1.8) +
    limbs(out, inn, 'url(#I)') +
    '<path d="M46 13 L50 18 L55 20 M46 87 L50 82 L55 80" fill="none" stroke="#3b6594" stroke-opacity="0.7" stroke-width="0.9"/>' +
    '<path d="M47 13.4 C55 20 60 28 62.6 37" fill="none" stroke="#fff" stroke-opacity="0.7" stroke-width="1"/>' +
    bowGrip('G', m.wrap) + gem(64, 50, 2.6) +
    arrow(31, 83, '#c6ecff', 'url(#I)', '#e8f5ff'),
    star(86, 20, 3.8, '#fff') + star(20, 30, 2.2, '#d6f0ff', 0.9)
  );
})();

/* Ruh Emici Yay — köşeli kara-mor kollar, bıçak uçlar, yıldırım kiriş, tayf ok */
A.w_ep_yay = (() => {
  const m = MAT.ep;
  const out = [[42, 0.6, 1], [48.4, 8], [58.4, 18, 1], [63.4, 30], [66.2, 46, 1]];
  const inn = [[59.6, 46, 1], [57.8, 33.4], [52.8, 24.4, 1], [44.2, 14.6], [38.2, 6, 1]];
  return W(TF(-45, 0.94, 4, -3), base(m, halo('H', 'rgba(176,120,255,0.55)')),
    glowAt(60, 50, 34, 'H') +
    bolt([[40.6, 3], [36.4, 17], [38.4, 25], [33, 38], [31, 50], [33, 62], [38.4, 75], [36.4, 83], [40.6, 97]], 1.1) +
    P('M58.4 18 L66.4 13 L61 22.4 Z', 'url(#S)', 1.3) + P('M58.4 82 L66.4 87 L61 77.6 Z', 'url(#S)', 1.3) +
    limbs(out, inn, 'url(#W)') +
    '<path d="M44 8 C51 13 56 19 58 23" fill="none" stroke="#c9a8f5" stroke-opacity="0.7" stroke-width="1"/>' +
    P('M42 0.6 L36 -4.6 L38.2 6 Z', 'url(#L)', 1.2) + P('M42 99.4 L36 104.6 L38.2 94 Z', 'url(#L)', 1.2) +
    bowGrip('G', m.wrap) +
    '<path d="M31 50 L83 50" stroke="#b58cff" stroke-opacity="0.5" stroke-width="6" stroke-linecap="round"/>' +
    arrow(31, 83, '#f3e8ff', 'url(#J)', '#b06cff') +
    gem(64, 50, 2.6) +
    bolt([[88, 44], [92, 40], [90.4, 37]], 0.9),
    star(88, 14, 3.4, '#f3e8ff')
  );
})();

/* Şimşek Tanrı Yayı — kanat tüylü altın kollar, yakut kabza, alevli ok */
A.w_ef_yay = (() => {
  const m = MAT.ef;
  const out = [[45.4, 1, 1], [41.2, 6], [46, 11.6], [56, 21.6], [63, 35], [65.8, 46, 1]];
  const inn = [[59.6, 46, 1], [57.8, 37], [51.8, 26.6], [43, 18], [36.4, 10.4], [40.4, 2.2, 1]];
  const feathers = [[48.6, 13.8, -40], [55.6, 20.6, -30], [60.6, 28.6, -18], [63.8, 37.4, -6]];
  let fs = '';
  for (const [x, y, a] of feathers) fs += leaf(x, y, 12, a, 2.6, 'url(#T)', 1) + leaf(x, 100 - y, 12, -a, 2.6, 'url(#T)', 1);
  return W(TF(-45, 0.98, 3, -4), base(m, halo('H', 'rgba(255,150,50,0.55)')),
    glowAt(60, 50, 34, 'H') +
    '<path d="M41.6 3.4 L31 50 L41.6 96.6" fill="none" stroke="#fff3c0" stroke-width="1.3"/>' +
    fs +
    limbs(out, inn, 'url(#L)') +
    '<path d="M47 13.4 C55 20 60 28 62.6 37" fill="none" stroke="#fff" stroke-opacity="0.65" stroke-width="1"/>' +
    bowGrip('G', m.wrap) +
    flame(80, 48.4, 12, 6.2, -3.6) + flame(71, 48.6, 8, 5, -3) +
    arrow(31, 83, '#fff0b0', 'url(#T)', '#ff4a2a') +
    gem(64, 50, 3),
    ember(80, 16, 1.4) + ember(88, 32, 1.1, '#ffd070') + star(20, 28, 3, '#fff3c0')
  );
})();

/* ═════════════ ASA ═════════════ */

/* Çatlak Asa — budaklı ahşap, çatlak, iple bağlanmış donuk taş */
A.w_cy_asa = (() => {
  const m = MAT.cy;
  const shaftL = [[46.2, 20, 1], [45.6, 34], [46.8, 48], [45.4, 62], [46.6, 78], [46, 98, 1]];
  const shaftR = [[53.8, 98, 1], [54.4, 80], [53.2, 64], [54.6, 50], [53.4, 36], [54.2, 20, 1]];
  return W(TF(26, 0.95, 0, 1), base(m),
    P('M48 22 C45 17 41 14 37.4 8.4', 'none', 0, ' stroke="' + OL + '" stroke-width="6.6" stroke-linecap="round"') +
    P('M48 22 C45 17 41 14 37.4 8.4', 'none', 0, ' stroke="url(#W)" stroke-width="3.6" stroke-linecap="round"') +
    P('M52 22 C55.4 16 58 11.6 57.4 4.6', 'none', 0, ' stroke="' + OL + '" stroke-width="6.6" stroke-linecap="round"') +
    P('M52 22 C55.4 16 58 11.6 57.4 4.6', 'none', 0, ' stroke="url(#W)" stroke-width="3.6" stroke-linecap="round"') +
    P(seg(shaftL, true) + seg(shaftR, false) + ' Z', 'url(#W)', 1.9) +
    '<ellipse cx="47.4" cy="40" rx="1.4" ry="2.4" fill="#3a2510"/><ellipse cx="52.6" cy="70" rx="1.3" ry="2.2" fill="#3a2510"/>' +
    '<path d="M50.6 30 L49.2 36 L51.2 40 L49.6 46" fill="none" stroke="' + OL + '" stroke-width="1"/>' +
    gem(48.4, 11, 6.6) +
    '<path d="M42.4 9 L54.4 12.6 M42.8 13.6 L53.6 7.4" stroke="#c8ae7a" stroke-width="1.3"/>' +
    '<path d="M46.4 53 L53.6 53 M46.4 56 L53.6 56 M46.4 59 L53.6 59" stroke="#c8ae7a" stroke-width="1.4"/>' +
    '<path d="M46.4 53 L53.6 53 M46.4 56 L53.6 56 M46.4 59 L53.6 59" stroke="' + OL + '" stroke-opacity="0.35" stroke-width="0.5" transform="translate(0 0.9)"/>'
  );
})();

/* Söğüt Asası — çatal söğüt, filizlenen yapraklar, yeşil öz taşı */
A.w_yg_asa = (() => {
  const m = MAT.yg;
  const prong = (d) => P(d, 'none', 0, ' stroke="' + OL + '" stroke-width="6.4" stroke-linecap="round"') + P(d, 'none', 0, ' stroke="url(#W)" stroke-width="3.6" stroke-linecap="round"');
  return W(TF(26, 0.95, 0, 1), base(m, lin('V', ['#b8f09a', '#3a8a3c']) + halo('H', 'rgba(95,207,106,0.55)')),
    glowAt(50, 12, 18, 'H') +
    prong('M48 28 C42 21 39.6 13 42.4 3.4') + prong('M52 28 C58 21 60.4 13 57.6 3.4') +
    haft(46.2, 24, 53.8, 99, 'W') +
    gem(50, 13.4, 7) +
    leaf(46.6, 36, 11, 160, 2.8, 'url(#V)') + leaf(53.4, 46, 10, 20, 2.6, 'url(#V)') + leaf(42.4, 5, 8, -120, 2.2, 'url(#V)') + leaf(57.6, 6, 7, -60, 2, 'url(#V)') +
    '<rect x="45.8" y="26" width="8.4" height="3.6" rx="1.4" fill="url(#T)"' + K(1.3) + '/>' +
    grip(45.8, 62, 54.2, 78, 4, m.wrap, 'G') +
    '<rect x="46.4" y="96" width="7.2" height="4" rx="1.6" fill="url(#T)"' + K(1.2) + '/>',
    star(76, 12, 2.8, '#eaffe9', 0.85)
  );
})();

/* Buz Kristali Asası — kristal salkımı, donmuş yaka, süzülen kıymıklar */
A.w_nd_asa = (() => {
  const m = MAT.nd;
  return W(TF(26, 0.92, 0, 3), base(m, halo('H', 'rgba(140,210,255,0.6)')),
    glowAt(50, 12, 24, 'H') +
    haft(46.2, 26, 53.8, 99, 'W') +
    '<path d="M47.6 44 L52.4 46 M47.6 72 L52.4 74" stroke="#3b6594" stroke-opacity="0.8" stroke-width="1"/>' +
    P('M45.6 25 L37.4 10 L40.6 7.6 L47.8 20 Z', 'url(#I)', 1.3) + P('M54.4 25 L62.6 10 L59.4 7.6 L52.2 20 Z', 'url(#I)', 1.3) +
    P('M50 -5 L56.4 7.6 L54.4 26 L45.6 26 L43.6 7.6 Z', 'url(#I)', 1.6) +
    '<path d="M50 -4 L50 25 M43.6 7.6 L50 12 L56.4 7.6" fill="none" stroke="#fff" stroke-opacity="0.8" stroke-width="0.8"/>' +
    '<path d="M50 12 L54.4 26" stroke="#63b8f2" stroke-opacity="0.7" stroke-width="0.8"/>' +
    P('M44.6 25 L55.4 25 L54.4 31 L45.6 31 Z', 'url(#T)', 1.5) +
    P('M44.6 28 L41.6 34 L46.4 31 Z M55.4 28 L58.4 34 L53.6 31 Z', 'url(#I)', 1) +
    grip(45.8, 62, 54.2, 80, 5, m.wrap, 'G') +
    P('M50 95 L53.6 99.4 L50 105 L46.4 99.4 Z', 'url(#I)', 1.2),
    star(30, 22, 3.2, '#fff') + star(78, 8, 2.4, '#d6f0ff', 0.9) +
    '<path d="M24 38 L26.4 34 L28.8 38 L26.4 42 Z" fill="#c6ecff"' + K(0.9) + '/>'
  );
})();

/* Yıldırım Asası — kara demir sap, pençe kafes içinde fırtına küresi */
A.w_ep_asa = (() => {
  const m = MAT.ep;
  return W(TF(26, 0.9, 0, 4), base(m, rad('O', ['#ffffff', '#e2ccff', '#9b6cff', '#3a1a78'], 0.42, 0.38, 0.7) + halo('H', 'rgba(176,120,255,0.65)')),
    glowAt(50, 11, 26, 'H') +
    haft(46.2, 26, 53.8, 99, 'G') +
    '<rect x="46.2" y="46" width="7.6" height="2.4" rx="1" fill="#c7a2ff"/><rect x="46.2" y="84" width="7.6" height="2.4" rx="1" fill="#c7a2ff"/>' +
    grip(45.8, 58, 54.2, 76, 5, m.wrap, 'G') +
    '<circle cx="50" cy="11" r="8.6" fill="url(#O)"' + K(1.5) + '/>' +
    '<circle cx="47.4" cy="8.4" r="2.4" fill="#fff" opacity="0.9"/>' +
    bolt([[46, 8], [51, 11], [48.4, 13.4], [53, 16]], 0.9, '#fff') +
    P('M46.4 28 C37.6 24.4 35.6 13 40.6 2 C41.6 9.4 43.6 16 48.6 20.6 Z', 'url(#T)', 1.5) +
    P('M53.6 28 C62.4 24.4 64.4 13 59.4 2 C58.4 9.4 56.4 16 51.4 20.6 Z', 'url(#T)', 1.5) +
    P('M45 23 L55 23 L54 30 L46 30 Z', 'url(#T)', 1.5) + gem(50, 26.4, 2.2) +
    bolt([[40, 3], [34.4, -1], [36.4, -5]], 1) + bolt([[60, 3], [66, 6], [64.4, 11.6], [69, 14]], 1) +
    P('M46.8 96.4 L53.2 96.4 L50 104 Z', 'url(#T)', 1.2),
    star(80, 10, 3.2, '#f3e8ff') + star(22, 34, 2.2, '#e2ccff', 0.9)
  );
})();

/* Kadim Güneş Asası — altın sap, ışınlı güneş halkası, içinde alev küresi */
A.w_ef_asa = (() => {
  const m = MAT.ef;
  let rays = '';
  for (let i = 0; i < 12; i++) {
    const a = (i * 30) * Math.PI / 180, r1 = 12.4, r2 = i % 2 ? 16 : 18.6;
    const x = (r, da) => f(50 + Math.cos(a + da) * r), y = (r, da) => f(13 + Math.sin(a + da) * r);
    rays += '<path d="M' + x(r1, -0.12) + ' ' + y(r1, -0.12) + ' L' + x(r2, 0) + ' ' + y(r2, 0) + ' L' + x(r1, 0.12) + ' ' + y(r1, 0.12) + ' Z" fill="url(#T)"' + K(0.9) + '/>';
  }
  return W(TF(26, 0.9, 0, 4), base(m, rad('O', ['#ffffff', '#fff3b0', '#ffb040', '#e24a14', '#8a1a08'], 0.45, 0.4, 0.65) + halo('H', 'rgba(255,150,50,0.65)')),
    glowAt(50, 13, 28, 'H') +
    haft(46.2, 30, 53.8, 99, 'L') +
    grip(45.8, 58, 54.2, 78, 5, m.wrap, 'G') +
    rays +
    '<circle cx="50" cy="13" r="11.2" fill="none" stroke="' + OL + '" stroke-width="5.4"/>' +
    '<circle cx="50" cy="13" r="11.2" fill="none" stroke="url(#T)" stroke-width="3.2"/>' +
    '<circle cx="50" cy="13" r="6.6" fill="url(#O)"' + K(1.3) + '/>' +
    flame(50, 10, 9, 5.4, 0, 'F', false) +
    P('M44.4 23.6 C47 26 53 26 55.6 23.6 L54.6 31 L45.4 31 Z', 'url(#T)', 1.5) + gem(50, 28, 2.4) +
    disc(50, 99, 3.4),
    ember(22, 20, 1.4) + ember(80, 30, 1.2, '#ffd070') + ember(28, 44, 1) + star(82, 8, 3, '#fff3c0')
  );
})();

/* armorArt.js aynı kiti kullanır (tek kaynak) */
export const WA = { OL, f, K, stops, lin, rad, seg, loop, mirX, mirY, P, TF, MAT, gem, disc, star, flame, shard, leaf, bolt, halo, glowAt, ember };
