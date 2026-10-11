/* ═══════════════════════════════════════════════════════════
   armorArt.js — ZIRH · ELDİVEN · ÇİZME v4 (2026-09-23)
   weaponArt v4 ile aynı dil: 100×100, ışık sol üst, tek kontur,
   gövde AYDINLIK dolgu + kırpılmış sağ/alt gölge. Her eşya kendi
   silueti (deri yelek ≠ levha ≠ pullu zırh ≠ kanatlı muhafız).
   Element dili: Epik yıldırım/mor · Efsanevi ateş/altın.
   ═══════════════════════════════════════════════════════════ */
import { WA } from './weaponArt.js?v=20260930m';

const { OL, f, K, stops, lin, rad, loop, mirX, P, MAT, gem, disc, star, flame, leaf, bolt, halo, glowAt, ember } = WA;

const linU = (id, a, x1, y1, x2, y2) =>
  '<linearGradient id="' + id + '" gradientUnits="userSpaceOnUse" x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '">' + stops(a) + '</linearGradient>';

/* malzemeler: v3 gearArt paletlerinin devamı (LEATHER · DKLTH · STEEL · BLACKM · NIGHTP) */
const LTH = { lit: ['#e2b276', '#96622c'], shade: ['#7a4c20', '#2e1a08'], trim: MAT.ef.trim, gem: MAT.yg.gem };
const DLT = { lit: ['#9a6c40', '#4a2e12'], shade: ['#4a2e12', '#1c1006'], trim: MAT.ef.trim, gem: MAT.yg.gem };
const IRON = { lit: ['#e4e8ee', '#8b93a4'], shade: ['#6b7280', '#353a45'], trim: MAT.cy.trim, gem: MAT.cy.gem };
const STL = { lit: ['#ffffff', '#c2cfdc'], shade: ['#8d9bac', '#46505f'], trim: MAT.yg.trim, gem: MAT.yg.gem };
const BLK = { lit: ['#6a7288', '#2c3244'], shade: ['#2c3244', '#0e111c'], trim: ['#8a92a8', '#4c5468', '#20263a'], gem: ['#ffc8c0', '#ff2c40', '#6e0e1e'] };
const NIT = { lit: ['#8a7ac0', '#453575'], shade: ['#453575', '#1a1036'], trim: MAT.ep.trim, gem: ['#ffd0d6', '#e0344a', '#6e0e1e'] };
const BLD = { lit: ['#9a3a4a', '#42182a'], shade: ['#42182a', '#16060e'], trim: MAT.cy.trim, gem: MAT.ep.gem };

function defs(m, extra) {
  return lin('L', m.lit, 0, 0, 1, 1) + lin('S', m.shade, 0, 0, 1, 1) + lin('T', m.trim, 0, 0, 0.7, 1) +
    rad('J', m.gem) + linU('U', m.lit.concat(m.shade), 18, 6, 86, 94) + (MAT.ef.flame ? lin('F', MAT.ef.flame, 0, 1, 0, 0) : '') + (extra || '');
}
const svg = (d, tf, body, over) => '<svg viewBox="0 0 100 100"><defs>' + d + '</defs><g transform="' + tf + '">' + body + '</g>' + (over || '') + '</svg>';
const sym = (h) => loop(h.concat(mirX(h).reverse().slice(1, -1)));
const SHADE = {
  r: '<rect x="50" y="-20" width="80" height="140" fill="#000" opacity="0.2"/>',
  boot: '<rect x="50" y="-10" width="60" height="120" fill="#000" opacity="0.16"/><rect x="0" y="68" width="100" height="40" fill="#000" opacity="0.16"/>',
  none: '',
};
let CN = 0;
/* kırpılmış gövde: dolgu → iç ayrıntı → gölge → kontur */
function part(d, fill, inner, sh, w) {
  const id = 'c' + (CN++);
  return '<clipPath id="' + id + '"><path d="' + d + '"/></clipPath>' + P(d, fill) +
    '<g clip-path="url(#' + id + ')">' + (inner || '') + SHADE[sh || 'r'] +
    '<path d="' + d + '" fill="none" stroke="#fff" stroke-opacity="0.18" stroke-width="3" transform="translate(-1.2 -1.2)"/></g>' +
    P(d, 'none', w || 2.2);
}
const edgeBand = (d, c, w, o) => '<path d="' + d + '" fill="none" stroke="' + c + '" stroke-width="' + w + '"' + (o ? ' opacity="' + o + '"' : '') + '/>';
const rivet = (x, y, r, c) => '<circle cx="' + f(x) + '" cy="' + f(y) + '" r="' + (r || 1.3) + '" fill="' + (c || '#d0d4dc') + '"' + K(0.8) + '/>';
const drop = (x, y, s, c) => P('M' + f(x) + ' ' + f(y) + ' c' + f(s * 0.7) + ' ' + f(s) + ' ' + f(s) + ' ' + f(s * 1.7) + ' 0 ' + f(s * 2.2) + ' c' + f(-s) + ' ' + f(-s * 0.5) + ' ' + f(-s * 0.7) + ' ' + f(-s * 1.2) + ' 0 ' + f(-s * 2.2) + ' Z', c || '#d2263c', 1);
function sunRays(cx, cy, r1, r2a, r2b, n) {
  let s = '';
  for (let i = 0; i < n; i++) {
    const a = (i * 360 / n) * Math.PI / 180, r2 = i % 2 ? r2b : r2a;
    const x = (r, da) => f(cx + Math.cos(a + da) * r), y = (r, da) => f(cy + Math.sin(a + da) * r);
    s += '<path d="M' + x(r1, -0.2) + ' ' + y(r1, -0.2) + ' L' + x(r2, 0) + ' ' + y(r2, 0) + ' L' + x(r1, 0.2) + ' ' + y(r1, 0.2) + ' Z" fill="url(#T)"' + K(0.9) + '/>';
  }
  return s;
}
const flipL = (s) => '<g transform="translate(100 0) scale(-1 1)">' + s + '</g>';

export const ARMOR_ART = {};
const A = ARMOR_ART;

/* ═════════════ ZIRH (önden gövde) ═════════════ */
const TORSO = sym([[50, 23, 1], [59, 15], [74, 16], [82, 23], [80, 33], [75, 38, 1], [73, 52], [70, 64], [73, 76], [67, 85], [50, 88, 1]]);
const TFA = 'translate(50 51) scale(0.94) translate(-50 -51)';

/* Deri Zırh — bağcıklı deri yelek, dikiş, kemer */
A.z_deri = svg(defs(LTH), TFA,
  part(TORSO, 'url(#L)',
    '<path d="M46 23 L54 23 L55 88 L45 88 Z" fill="#2e1a08" opacity="0.85"/>' +
    [30, 40, 50].map((y) => '<path d="M44.6 ' + y + ' L55.4 ' + (y + 8) + ' M55.4 ' + y + ' L44.6 ' + (y + 8) + '" stroke="#f0d6a0" stroke-width="1.5"/>' + rivet(44.6, y, 1.1, '#f2bb40') + rivet(55.4, y, 1.1, '#f2bb40')).join('') +
    '<path d="' + TORSO + '" fill="none" stroke="#f0d6a0" stroke-opacity="0.55" stroke-width="1" stroke-dasharray="2.4 2" transform="translate(50 52) scale(0.86) translate(-50 -52)"/>' +
    '<ellipse cx="71" cy="21" rx="8" ry="4.4" transform="rotate(18 71 21)" fill="#5c3c1a"/><ellipse cx="29" cy="21" rx="8" ry="4.4" transform="rotate(-18 29 21)" fill="#7a5028"/>'
  ) +
  P('M27 64 Q50 68 73 64 L73.5 72.6 Q50 76.6 26.5 72.6 Z', '#4a2e12', 1.6) +
  '<rect x="44" y="63.6" width="12" height="11" rx="2" fill="none" stroke="' + OL + '" stroke-width="4.2"/>' +
  '<rect x="44" y="63.6" width="12" height="11" rx="2" fill="none" stroke="url(#T)" stroke-width="2.2"/>' +
  '<path d="M50 65 V73" stroke="url(#T)" stroke-width="1.6"/>'
);

/* Demir Levha — kaba perçinli göğüslük, eteklik lamları, ezik ve pas */
A.z_levha = (() => {
  const H = sym([[50, 25, 1], [60, 16], [75, 17], [83, 24], [78, 36, 1], [75, 52], [72, 66], [50, 70, 1]]);
  let lames = '';
  for (let k = 2; k >= 0; k--) {
    const y = 63 + k * 7.4, a = 29 - k * 1.6, b = 71 + k * 1.6;
    lames += P('M' + f(a) + ' ' + f(y) + ' Q50 ' + f(y + 5) + ' ' + f(b) + ' ' + f(y) + ' L' + f(b + 1) + ' ' + f(y + 8.6) + ' Q50 ' + f(y + 13.6) + ' ' + f(a - 1) + ' ' + f(y + 8.6) + ' Z', 'url(#S)', 1.6) +
      rivet(a + 2, y + 4.4, 1) + rivet(b - 2, y + 4.4, 1);
  }
  return svg(defs(IRON), TFA,
    lames +
    part(H, 'url(#L)',
      '<path d="M50 26 L50 68" stroke="#454b5a" stroke-width="1.1"/><path d="M48.8 27 L48.8 67" stroke="#fff" stroke-opacity="0.5" stroke-width="0.9"/>' +
      '<ellipse cx="61" cy="45" rx="5.4" ry="3.6" fill="#000" opacity="0.2"/><path d="M56.4 43 q4.6 -3.4 9.2 0" fill="none" stroke="#fff" stroke-opacity="0.6" stroke-width="1"/>' +
      '<g fill="#8a4a24"><ellipse cx="38" cy="54" rx="3.2" ry="2.2" opacity="0.5"/><ellipse cx="64" cy="30" rx="2.2" ry="1.6" opacity="0.5"/><circle cx="42" cy="36" r="1.2" opacity="0.5"/></g>' +
      [[40, 22], [60, 22], [28, 30], [72, 30], [31, 50], [69, 50], [34, 64], [66, 64]].map((p) => rivet(p[0], p[1], 1.3)).join('')
    )
  );
})();

/* Çelik Zırh — cilalı kupa zırhı, orta mahya, tunç kenar, boyunluk */
A.z_celik = svg(defs(STL), TFA,
  part(TORSO, 'url(#L)',
    edgeBand(TORSO, 'url(#T)', 6) +
    '<path d="M50 23 L50 88" stroke="#fff" stroke-width="1.6" stroke-opacity="0.85"/><path d="M51.4 24 L51.4 87" stroke="#46505f" stroke-width="1"/>' +
    '<path d="M33 42 Q41 34 49 41 M51 41 Q59 34 67 42" fill="none" stroke="#fff" stroke-opacity="0.55" stroke-width="1.4"/>' +
    '<path d="M30 70 Q50 76 70 70" fill="none" stroke="#46505f" stroke-width="1.1"/>'
  ) +
  P('M37 17 Q50 27 63 17 L65 22.4 Q50 34 35 22.4 Z', 'url(#L)', 1.6) +
  '<path d="M38.6 20.6 Q50 29.6 61.4 20.6" fill="none" stroke="url(#T)" stroke-width="1.4"/>' +
  disc(50, 60, 4.2) + gem(50, 60, 2.2),
  star(84, 14, 3, '#fff4d8', 0.85)
);

/* Ağır Plaka — katmanlı dev omuzluklar, altın perçin, göbek kalkanı */
A.z_plaka = (() => {
  let pa = '';
  for (let k = 2; k >= 0; k--) {
    const o = k * 6;
    const d = 'M61 ' + (15 + o) + ' C72 ' + (5 + o) + ' 90 ' + (10 + o) + ' 92 ' + (27 + o) + ' C84 ' + (24 + o) + ' 73 ' + (23 + o) + ' 63 ' + (28 + o) + ' Z';
    pa += P(d, k ? 'url(#S)' : 'url(#L)', 1.7) + '<path d="M91 ' + (26.4 + o) + ' C83 ' + (23.4 + o) + ' 73 ' + (22.4 + o) + ' 63.4 ' + (27.2 + o) + '" fill="none" stroke="url(#T)" stroke-width="1.4"/>';
  }
  pa += rivet(71, 13.6, 1.3, '#f6d59a');
  return svg(defs({ lit: ['#e6ebf2', '#98a5b8'], shade: ['#7c889a', '#3a4454'], trim: MAT.yg.trim, gem: MAT.yg.gem }), 'translate(50 52) scale(0.92) translate(-50 -52)',
    part(TORSO, 'url(#L)',
      '<path d="M50 23 L50 88" stroke="#fff" stroke-width="1.4" stroke-opacity="0.7"/>' +
      [62, 70, 78].map((y) => '<path d="M24 ' + y + ' Q50 ' + (y + 5) + ' 76 ' + y + '" fill="none" stroke="' + OL + '" stroke-width="1.3"/><path d="M24 ' + (y + 1.4) + ' Q50 ' + (y + 6.4) + ' 76 ' + (y + 1.4) + '" fill="none" stroke="#fff" stroke-opacity="0.35" stroke-width="0.9"/>').join('')
    ) +
    pa + flipL(pa) +
    disc(50, 44, 6.2) + gem(50, 44, 2.6) + rivet(40, 30, 1.2, '#f6d59a') + rivet(60, 30, 1.2, '#f6d59a'),
    star(86, 44, 2.8, '#fff4d8', 0.8)
  );
})();

/* Ejder Pulu Zırhı — pul sıraları, ejder gözü kopça, mor kenar, şimşek */
A.z_ejder = (() => {
  let sc = '';
  for (let r = 9; r >= 0; r--) {
    const y = 25 + r * 6.4, off = r % 2 ? 4 : 0;
    for (let x = 18 + off; x < 82; x += 8) sc += '<path d="M' + x + ' ' + y + ' q4 9 8 0 q-4 -2.4 -8 0 Z" fill="url(#Q)" stroke="' + OL + '" stroke-width="0.9"/>';
  }
  return svg(defs(MAT.ep, lin('Q', ['#b8f5e0', '#3aa88c', '#175448'], 0, 0, 0, 1) + halo('H', 'rgba(176,120,255,0.5)')), TFA,
    glowAt(50, 44, 44, 'H') +
    part(TORSO, 'url(#L)', sc + edgeBand(TORSO, 'url(#T)', 6)) +
    '<ellipse cx="50" cy="36" rx="9" ry="6.4" fill="url(#T)"' + K(1.5) + '/>' +
    '<ellipse cx="50" cy="36" rx="6" ry="3.8" fill="#ffcf5a"' + K(1.1) + '/><ellipse cx="50" cy="36" rx="1.3" ry="3.4" fill="' + OL + '"/>' +
    '<ellipse cx="48" cy="34.6" rx="1.4" ry="0.8" fill="#fff" opacity="0.8"/>' +
    bolt([[84, 6], [80, 14], [84.6, 16], [79, 27]], 1.2) + bolt([[16, 6], [20, 14], [15.4, 16], [21, 27]], 1.2),
    star(88, 40, 3, '#f3e8ff')
  );
})();

/* Kara Demir Zırh — dikenli omuz, kor çatlaklar, kan kalbi */
A.z_kara = svg(defs(BLK, rad('R', ['#ffc8c0', '#ff2c40', '#6e0e1e']) + halo('H', 'rgba(255,44,64,0.45)')), TFA,
  glowAt(50, 48, 40, 'H') +
  P('M68 19 L76 1 L80 21 Z', 'url(#L)', 1.4) + P('M77 22 L94 12 L84 28 Z', 'url(#L)', 1.4) +
  P('M32 19 L24 1 L20 21 Z', 'url(#L)', 1.4) + P('M23 22 L6 12 L16 28 Z', 'url(#L)', 1.4) +
  part(TORSO, 'url(#L)',
    '<path d="M50 30 L46 40 L52 48 L47 58 L53 68 L50 80 M52 48 L62 53 L66 63 M47 58 L37 62 L34 72" fill="none" stroke="#ff2c40" stroke-opacity="0.5" stroke-width="4.4" stroke-linejoin="round"/>' +
    '<path d="M50 30 L46 40 L52 48 L47 58 L53 68 L50 80 M52 48 L62 53 L66 63 M47 58 L37 62 L34 72" fill="none" stroke="#ffb0a0" stroke-width="1.2" stroke-linejoin="round"/>' +
    [44, 60, 74].map((y) => '<path d="M22 ' + y + ' Q50 ' + (y + 5) + ' 78 ' + y + '" fill="none" stroke="' + OL + '" stroke-opacity="0.6" stroke-width="1"/>').join('')
  ) +
  P('M38 17 L42 26 L46 19 L50 28 L54 19 L58 26 L62 17 Q50 24 38 17 Z', 'url(#S)', 1.3) +
  gem(50, 40, 4.8, 'R'),
  ember(20, 50, 1.3, '#ff6070') + ember(82, 60, 1.1, '#ff6070')
);

/* Kadim Muhafız Zırhı — altın gövde, güneş kabartması, kanat omuzluk, alev */
A.z_kadim = (() => {
  const wR = leaf(74, 22, 17, -24, 3.6, 'url(#T)', 1) + leaf(75, 27, 16, -6, 3.4, 'url(#T)', 1) + leaf(75, 32, 13, 12, 3, 'url(#T)', 1);
  return svg(defs(MAT.ef, halo('H', 'rgba(255,150,50,0.55)')), 'translate(50 52) scale(0.9) translate(-50 -52)',
    glowAt(50, 40, 46, 'H') +
    flame(84, 20, 18, 8, 4) + flame(16, 20, 18, 8, -4) +
    wR + flipL(wR) +
    part(TORSO, 'url(#L)', edgeBand(TORSO, '#8a5a10', 5, 0.6) +
      '<path d="M30 72 Q50 78 70 72" fill="none" stroke="#8a5a10" stroke-width="1.2"/>') +
    sunRays(50, 48, 7.4, 14, 11, 12) + disc(50, 48, 7.4) + gem(50, 48, 4.2) +
    gem(36, 74, 1.8) + gem(64, 74, 1.8),
    ember(10, 44, 1.4) + ember(90, 50, 1.2, '#ffd070') + star(88, 8, 3.4, '#fff3c0')
  );
})();

/* ═════════════ ELDİVEN (sırt, parmaklar yukarı) ═════════════ */
const FING = [[39, 14, 9], [50, 9, 9.4], [61, 13, 9], [71, 24, 8]];
const PALM = loop([[31, 42, 1], [77, 40, 1], [76.4, 58], [72, 70, 1], [34, 70, 1], [31, 58]]);
const THUMB = 'M34 62 C26 57 21 50 18 40';
const CUFF = loop([[33, 67, 1], [67, 67, 1], [74, 93, 1], [26, 93, 1]]);
const TFG = 'translate(50 54) rotate(-8) scale(0.9) translate(-50 -54)';
function glove(o) {
  const fill = o.fill || 'url(#U)';
  let s = (o.behind || '') +
    '<path d="' + THUMB + '" fill="none" stroke="' + OL + '" stroke-width="12.8" stroke-linecap="round"/>' +
    '<path d="' + THUMB + '" fill="none" stroke="' + fill + '" stroke-width="10.2" stroke-linecap="round"/>' +
    (o.thumb || '');
  for (const [cx, top, w] of FING) {
    const y1 = top + w / 2;
    s += '<path d="M' + cx + ' 46 L' + cx + ' ' + f(y1) + '" stroke="' + OL + '" stroke-width="' + f(w + 2.6) + '" stroke-linecap="round"/>' +
      '<path d="M' + cx + ' 46 L' + cx + ' ' + f(y1) + '" stroke="' + fill + '" stroke-width="' + w + '" stroke-linecap="round"/>' +
      '<path d="M' + f(cx - w * 0.26) + ' 44 L' + f(cx - w * 0.26) + ' ' + f(y1 + 1) + '" stroke="#fff" stroke-opacity="0.3" stroke-width="1"/>' +
      (o.finger ? o.finger(cx, top, w) : '');
  }
  s += (o.mid || '') + part(PALM, fill, o.palm || '', 'r', 2) + (o.cuffBehind || '') + part(o.cuffD || CUFF, o.cuffFill || 'url(#S)', o.cuff || '', 'r', 2) + (o.over || '');
  return s;
}
const knuckles = (c) => FING.map(([cx, top]) => '<path d="M' + f(cx - 3) + ' ' + f(top + 13) + ' h6 M' + f(cx - 3) + ' ' + f(top + 20) + ' h6" stroke="' + (c || OL) + '" stroke-opacity="0.45" stroke-width="0.9"/>').join('');

/* Deri Eldiven — dikişli sırt, tokalı kayış */
A.g_deri = svg(defs(LTH, lin('D', DLT.lit)), TFG, glove({
  finger: (cx, top) => '<path d="M' + f(cx - 3) + ' ' + f(top + 13) + ' h6" stroke="#2e1a08" stroke-opacity="0.5" stroke-width="0.9"/>',
  palm: '<path d="M38 52 Q54 46 70 52" fill="none" stroke="#f0d6a0" stroke-opacity="0.6" stroke-width="1" stroke-dasharray="2.2 1.8"/>',
  cuffFill: 'url(#D)',
  cuff: '<rect x="20" y="76" width="60" height="7.4" fill="#4a2e12"/><path d="M20 76 H80 M20 83.4 H80" stroke="' + OL + '" stroke-width="1"/>',
  over: '<rect x="54" y="74.6" width="9" height="10.2" rx="1.6" fill="none" stroke="' + OL + '" stroke-width="4"/><rect x="54" y="74.6" width="9" height="10.2" rx="1.6" fill="none" stroke="url(#T)" stroke-width="2"/>',
}));

/* Zincir Eldiven — halka örgü, çelik lamlı parmak, perçinli manşet */
A.g_zincir = (() => {
  let mail = '';
  for (let y = 43, r = 0; y < 72; y += 3.8, r++) for (let x = 29 + (r % 2 ? 2 : 0); x < 80; x += 4) mail += '<circle cx="' + x + '" cy="' + f(y) + '" r="1.7" fill="none" stroke="#46505f" stroke-width="0.9"/>';
  return svg(defs(STL), TFG, glove({
    finger: (cx, top, w) => [0, 1, 2, 3].map((i) => '<path d="M' + f(cx - w / 2) + ' ' + f(top + 9 + i * 8) + ' h' + w + '" stroke="' + OL + '" stroke-opacity="0.7" stroke-width="0.9"/>').join(''),
    palm: mail,
    cuffFill: 'url(#L)',
    cuff: '<path d="M26 80 H74" stroke="' + OL + '" stroke-width="1"/><path d="M26 81.4 H74" stroke="#fff" stroke-opacity="0.5" stroke-width="0.8"/>',
    over: rivet(36, 73) + rivet(64, 73) + rivet(32, 87) + rivet(68, 87),
  }), star(84, 20, 2.8, '#fff4d8', 0.85));
})();

/* Kan Emici Pençe — kara-kızıl deri, kan kırmızısı tırnaklar, damla */
A.g_kanpence = svg(defs(BLD, lin('R', ['#ffb0b8', '#e0344a', '#6e0e1e'], 0, 0, 0, 1)), TFG, glove({
  behind: FING.map(([cx, top, w]) => P('M' + f(cx - w * 0.4) + ' ' + f(top + 4) + ' L' + f(cx + 1.4) + ' ' + f(top - 9) + ' L' + f(cx + w * 0.42) + ' ' + f(top + 4) + ' Z', 'url(#R)', 1.2)).join('') +
    P('M14 42 L10 28 L22 38 Z', 'url(#R)', 1.2),
  finger: (cx, top) => '<path d="M' + f(cx - 3) + ' ' + f(top + 14) + ' h6" stroke="#ff7583" stroke-opacity="0.45" stroke-width="0.9"/>',
  palm: '<path d="M36 50 Q54 44 72 50" fill="none" stroke="#e0344a" stroke-opacity="0.7" stroke-width="1" stroke-dasharray="2 1.8"/>',
  cuff: '<path d="M28 80 H72" stroke="#e0344a" stroke-opacity="0.6" stroke-width="1" stroke-dasharray="2 1.8"/>',
}), drop(78, 70, 2.6) + drop(84, 82, 2) + drop(24, 12, 1.8));

/* Keskin Pençe — mafsallı mor çelik, boğum bıçakları, şimşek */
A.g_keskin = svg(defs(MAT.ep, lin('B', ['#ffffff', '#d6c6f6', '#7c5cc0'], 0, 0, 1, 1) + halo('H', 'rgba(176,120,255,0.5)')), TFG,
  glowAt(55, 26, 30, 'H') + glove({
    finger: (cx, top, w) => [0, 1, 2].map((i) => '<path d="M' + f(cx - w / 2) + ' ' + f(top + 11 + i * 9) + ' q' + f(w / 2) + ' 2.4 ' + w + ' 0" fill="none" stroke="' + OL + '" stroke-width="1"/>').join(''),
    palm: '<path d="M34 50 Q54 46 74 50" fill="none" stroke="#c9a8f5" stroke-opacity="0.7" stroke-width="1.2"/>',
    cuffFill: 'url(#L)',
    cuff: '<path d="M26 78 H74 M26 86 H74" stroke="' + OL + '" stroke-width="1"/>',
    over: [44.5, 55.5, 66].map((cx) => P(loop([[cx - 2.2, 46, 1], [cx - 3, 24], [cx + 0.6, 0, 1], [cx + 3, 24], [cx + 2.2, 46, 1]]), 'url(#B)', 1.3) +
      '<path d="M' + f(cx - 0.4) + ' 44 L' + f(cx + 0.2) + ' 6" stroke="#fff" stroke-opacity="0.8" stroke-width="0.8"/>').join('') +
      gem(54, 58, 3.6) + bolt([[84, 30], [80, 38], [84.6, 40], [80, 50]], 1.2),
  }), star(86, 12, 3.2, '#f3e8ff')
);

/* Vampir Eldiveni — gece moru deri, sivri parmak uçları, yarasa kanadı manşet, kan taşı */
A.g_vampir = svg(defs(NIT, rad('R', ['#ffd0d6', '#e0344a', '#6e0e1e'])), TFG, glove({
  behind: FING.map(([cx, top, w]) => P('M' + f(cx - w * 0.44) + ' ' + f(top + 4) + ' L' + cx + ' ' + f(top - 5) + ' L' + f(cx + w * 0.44) + ' ' + f(top + 4) + ' Z', 'url(#S)', 1.2)).join(''),
  finger: (cx, top) => '<path d="M' + f(cx - 3) + ' ' + f(top + 14) + ' h6" stroke="#1a1036" stroke-opacity="0.6" stroke-width="0.9"/>',
  cuffD: loop([[33, 66, 1], [67, 66, 1], [86, 70], [82, 80, 1], [75, 78], [71, 88, 1], [62, 83], [50, 94, 1], [38, 83], [29, 88, 1], [25, 78], [18, 80, 1], [14, 70]]),
  cuff: '<path d="M50 70 L50 92 M40 72 L36 84 M60 72 L64 84" stroke="' + OL + '" stroke-opacity="0.5" stroke-width="1"/>',
  over: gem(53, 56, 5, 'R'),
}), drop(22, 10, 1.8) + star(86, 18, 3, '#ffd0d6', 0.8));

/* Kadim Savaş Eldiveni — altın plaka, güneş kabartması, yakut, alev manşet */
A.g_kadim = svg(defs(MAT.ef, halo('H', 'rgba(255,150,50,0.55)')), TFG,
  glowAt(52, 50, 40, 'H') + glove({
    behind: flame(22, 90, 20, 9, -4) + flame(78, 90, 20, 9, 4),
    finger: (cx, top, w) => [0, 1, 2].map((i) => '<path d="M' + f(cx - w / 2) + ' ' + f(top + 11 + i * 9) + ' q' + f(w / 2) + ' 2.4 ' + w + ' 0" fill="none" stroke="#8a5a10" stroke-width="1"/>').join(''),
    palm: '<path d="M36 64 Q54 68 72 64" fill="none" stroke="#8a5a10" stroke-width="1.1"/>',
    cuffFill: 'url(#L)',
    cuff: '<path d="M26 79 H74" stroke="#8a5a10" stroke-width="1.2"/>',
    over: sunRays(54, 55, 6, 11.6, 9, 10) + disc(54, 55, 6) + gem(54, 55, 3.4) + gem(50, 86, 2.2),
  }),
  ember(12, 60, 1.4) + ember(88, 56, 1.2, '#ffd070') + star(86, 12, 3.4, '#fff3c0')
);

/* ═════════════ ÇİZME (yandan, burun sağa) ═════════════ */
const BOOT = loop([[34, 8, 1], [60, 8, 1], [60.5, 52], [64, 58], [78, 64], [88, 72], [89, 82, 1], [30, 82, 1], [29.5, 66], [33, 40]]);
const ANKLE = loop([[35, 30, 1], [60, 30, 1], [60.5, 52], [64, 58], [78, 64], [88, 72], [89, 82, 1], [30, 82, 1], [29.5, 66], [32, 46]]);
const SOLE = (c) => P('M27 81 L91 81 C92.4 85 90.4 89 86 89 L46 89 L45 94 L30 94 L28 88.6 Z', c || '#2a1c0a', 1.8) + '<path d="M47 89 H86" stroke="#fff" stroke-opacity="0.12" stroke-width="1"/>';
const TFB = 'translate(50 51) rotate(-4) scale(0.92) translate(-50 -51)';

/* Deri Çizme — katlanmış konç, bağcık, dikişli burun */
A.b_deri = svg(defs(LTH, lin('D', ['#f0c890', '#b07a40'])), TFB,
  SOLE() +
  part(BOOT, 'url(#L)',
    [26, 34, 42, 50].map((y) => '<path d="M55 ' + y + ' L61 ' + (y + 5) + ' M61 ' + y + ' L55 ' + (y + 5) + '" stroke="#f0d6a0" stroke-width="1.3"/>').join('') +
    '<path d="M66 60 Q74 68 71 81" fill="none" stroke="#f0d6a0" stroke-opacity="0.6" stroke-width="1" stroke-dasharray="2.2 1.8"/>' +
    '<path d="M33 60 Q42 62 44 81" fill="none" stroke="#2e1a08" stroke-opacity="0.5" stroke-width="1"/>', 'boot') +
  part(loop([[29, 6, 1], [65, 6, 1], [64, 21], [58, 23.4], [46, 21.6], [36, 23.4], [30, 21]]), 'url(#D)', '', 'r', 1.8)
);

/* Çevik Bot — hafif bilek botu, çapraz bağcık, kanatlı topuk, yeşil taş */
A.b_cevik = svg(defs({ lit: ['#e4bc84', '#a87840'], shade: ['#8a5c28', '#3e2810'], trim: MAT.yg.trim, gem: MAT.yg.gem }, lin('V', ['#fffbe8', '#e8d9ae', '#9c8450'])), TFB,
  SOLE() +
  part(ANKLE, 'url(#L)',
    [34, 41, 48, 55].map((y) => '<path d="M53 ' + y + ' L62 ' + (y + 5) + ' M62 ' + y + ' L53 ' + (y + 5) + '" stroke="#f6d59a" stroke-width="1.3"/>').join('') +
    '<path d="M35 30 L60 30" stroke="url(#T)" stroke-width="5"/>', 'boot') +
  leaf(34, 44, 22, -150, 4.4, 'url(#V)', 1.1) + leaf(33, 49, 19, -170, 4, 'url(#V)', 1.1) + leaf(33, 54, 15, 170, 3.4, 'url(#V)', 1.1) +
  gem(44, 52, 3),
  star(84, 30, 3, '#fff4d8', 0.85)
);

/* Zırhlı Bot — plakalı sabaton, dizlik, sivri burun, tunç perçin */
A.b_zirhli = svg(defs(STL), TFB,
  SOLE('#20242c') +
  P('M86 71 L97 80 L88 82 Z', 'url(#L)', 1.4) +
  part(BOOT, 'url(#L)',
    '<path d="M47 12 L47 56" stroke="#fff" stroke-opacity="0.7" stroke-width="1.4"/><path d="M48.4 12 L48.4 56" stroke="#46505f" stroke-width="1"/>' +
    [[60, 55, 63, 82], [68, 60, 72, 82], [77, 64, 81, 82]].map(([x1, y1, x2, y2]) => '<path d="M' + x1 + ' ' + y1 + ' Q' + (x1 + 6) + ' ' + ((y1 + y2) / 2) + ' ' + x2 + ' ' + y2 + '" fill="none" stroke="' + OL + '" stroke-width="1.3"/><path d="M' + (x1 + 1.4) + ' ' + y1 + ' Q' + (x1 + 7.4) + ' ' + ((y1 + y2) / 2) + ' ' + (x2 + 1.4) + ' ' + y2 + '" fill="none" stroke="#fff" stroke-opacity="0.4" stroke-width="0.9"/>').join('') +
    '<path d="M30 58 H60" stroke="url(#T)" stroke-width="3"/>', 'boot') +
  '<ellipse cx="47" cy="11" rx="17" ry="7.4" fill="url(#L)"' + K(1.8) + '/>' +
  '<path d="M33 11 Q47 4 61 11" fill="none" stroke="url(#T)" stroke-width="1.6"/>' +
  rivet(47, 11, 2, '#f6d59a') + rivet(36, 44, 1.2, '#f6d59a') + rivet(58, 44, 1.2, '#f6d59a')
);

/* Fırtına Çizmesi — mor bot, rüzgâr kıvrımları, yıldırım */
A.b_firtina = svg(defs(MAT.ep, halo('H', 'rgba(176,120,255,0.5)')), TFB,
  glowAt(46, 40, 38, 'H') +
  '<g fill="none" stroke="#c9a8f5" stroke-linecap="round" stroke-width="2.2" opacity="0.8">' +
    '<path d="M4 30 C12 25 22 28 27 35"/><path d="M8 46 C15 42 22 44 27 50"/><path d="M6 62 C14 58 22 60 28 66"/></g>' +
  SOLE('#150c26') +
  part(BOOT, 'url(#L)',
    '<path d="M33 12 H60" stroke="url(#T)" stroke-width="7"/>' +
    '<path d="M30 76 C50 74 70 74 90 78" fill="none" stroke="url(#T)" stroke-width="3"/>', 'boot') +
  bolt([[53, 14], [44, 32], [51, 34], [41, 54]], 1.8),
  star(86, 24, 3.2, '#f3e8ff') + star(16, 14, 2.2, '#e2ccff', 0.9)
);

/* Kan İzi Botu — kara bot, dikenli konç, kan tabanı, damla izi */
A.b_kanizi = svg(defs(BLK, rad('R', ['#ffc8c0', '#ff2c40', '#6e0e1e'])), TFB,
  SOLE('#6e0e1e') +
  [34, 42, 50].map((x) => P('M' + x + ' 10 L' + (x + 4) + ' -1 L' + (x + 8) + ' 10 Z', 'url(#L)', 1.3)).join('') +
  part(BOOT, 'url(#L)',
    '<path d="M29 76 C50 74 70 74 91 78" fill="none" stroke="#d2263c" stroke-width="2"/>' +
    '<path d="M40 20 L56 20 M40 30 L56 30" stroke="' + OL + '" stroke-opacity="0.6" stroke-width="1"/>', 'boot') +
  drop(46, 36, 3.4, 'url(#R)'),
  drop(62, 92, 2) + drop(78, 91, 1.6)
);

/* Kadim Avcı Çizmesi — kürk konç, altın baldırlık, yakut, alev izi */
A.b_kadim = svg(defs(DLT, lin('V', ['#fff6e0', '#d8c8a8', '#8a7858']) + lin('G2', MAT.ef.lit.concat(MAT.ef.shade)) + halo('H', 'rgba(255,150,50,0.5)')), TFB,
  glowAt(40, 60, 36, 'H') +
  flame(24, 82, 18, 8, -9) + flame(16, 70, 13, 6, -7) +
  SOLE() +
  part(BOOT, 'url(#L)',
    '<path d="M30 74 C50 72 70 72 90 76" fill="none" stroke="url(#T)" stroke-width="3"/>', 'boot') +
  part(loop([[46, 22, 1], [62, 22, 1], [63, 52], [57, 62, 1], [48, 54]]), 'url(#G2)', '', 'r', 1.6) +
  gem(55, 38, 3.4) +
  part(loop([[28, 9], [33, 3], [39, 7], [45, 2], [51, 6], [57, 2], [63, 7], [66, 14], [62, 23, 1], [32, 23, 1], [27, 15]]), 'url(#V)',
    '<path d="M34 12 l2 5 M42 10 l1.4 6 M50 11 l1 5 M58 10 l1.4 6" stroke="#8a7858" stroke-width="0.9"/>', 'r', 1.8),
  ember(10, 56, 1.3) + ember(20, 44, 1, '#ffd070') + star(84, 30, 3.2, '#fff3c0')
);
