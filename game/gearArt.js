/* ═══════════════════════════════════════════════════════════
   gearArt.js — PREMİUM EŞYA SANATI v3
   64×64 çok katmanlı vektör illüstrasyonlar. Her eşyanın KENDİ
   çizimi vardır — gerçek nesne silüetleri (kılıç, yay, hançer,
   kupa zırhı, sabaton...) + tema süsleri (buz, kan, fırtına).
   Işık sol üstten; kontur #0e1220; degradeler eşya-önekli id'ler.
   ═══════════════════════════════════════════════════════════ */

import { WEAPON_ART } from './weaponArt.js?v=20260930m';
import { ARMOR_ART } from './armorArt.js?v=20260930m';

const O = '#0e1220';
const S2 = 'stroke="' + O + '" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"';
const S16 = 'stroke="' + O + '" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round"';
const S12 = 'stroke="' + O + '" stroke-width="1.2" stroke-linejoin="round" stroke-linecap="round"';

function stops(arr) {
  let s = '';
  for (const [o, c] of arr) s += '<stop offset="' + o + '" stop-color="' + c + '"/>';
  return s;
}
/* rot: 'v' dikey · 'h' yatay · 'd' çapraz */
function lg(id, rot, arr) {
  const c = rot === 'h' ? 'x1="0" y1="0" x2="1" y2="0"' : rot === 'd' ? 'x1="0" y1="0" x2="1" y2="1"' : 'x1="0" y1="0" x2="0" y2="1"';
  return '<linearGradient id="' + id + '" ' + c + '>' + stops(arr) + '</linearGradient>';
}
function rg(id, arr, fx, fy) {
  return '<radialGradient id="' + id + '" cx="' + (fx || 0.38) + '" cy="' + (fy || 0.32) + '" r="0.95">' + stops(arr) + '</radialGradient>';
}
/* 4 uçlu parıltı yıldızı */
function star(x, y, s, c, o) {
  return '<path d="M' + x + ' ' + (y - s) + ' L' + (x + s * 0.26) + ' ' + (y - s * 0.26) + ' L' + (x + s) + ' ' + y +
    ' L' + (x + s * 0.26) + ' ' + (y + s * 0.26) + ' L' + x + ' ' + (y + s) + ' L' + (x - s * 0.26) + ' ' + (y + s * 0.26) +
    ' L' + (x - s) + ' ' + y + ' L' + (x - s * 0.26) + ' ' + (y - s * 0.26) + ' Z" fill="' + c + '" opacity="' + (o == null ? 0.9 : o) + '"/>';
}
function bdrop(x, y, s, c) {
  return '<path d="M' + x + ' ' + (y - s * 1.5) + ' C' + (x + s) + ' ' + (y - s * 0.3) + ' ' + (x + s) + ' ' + (y + s * 0.55) +
    ' ' + x + ' ' + (y + s * 0.75) + ' C' + (x - s) + ' ' + (y + s * 0.55) + ' ' + (x - s) + ' ' + (y - s * 0.3) + ' ' + x + ' ' + (y - s * 1.5) +
    ' Z" fill="' + c + '" ' + S12 + '/>';
}
const art = (defs, body) => '<svg viewBox="0 0 64 64">' + (defs ? '<defs>' + defs + '</defs>' : '') + body + '</svg>';

/* ── ortak paletler ── */
const STEEL   = [['0', '#f4f9ff'], ['0.5', '#b9c9dd'], ['1', '#5f7189']];
const STEELD  = [['0', '#9fb0c4'], ['0.55', '#5c6b80'], ['1', '#2e3848']];
const GOLD    = [['0', '#ffec9e'], ['0.5', '#f2bb40'], ['1', '#8f6212']];
const DKLTH   = [['0', '#8a6038'], ['0.5', '#5c3c1a'], ['1', '#31200a']];
const WOOD    = [['0', '#b07f45'], ['0.5', '#7a4e1e'], ['1', '#42280c']];
const BLOOD   = [['0', '#ff7583'], ['0.5', '#d2263c'], ['1', '#6e0e1e']];
const ICE     = [['0', '#f0fbff'], ['0.5', '#8fd8ff'], ['1', '#2f7fc0']];
const PURPLE  = [['0', '#d9b8ff'], ['0.5', '#9b5cf0'], ['1', '#4a1898']];
const NIGHTP  = [['0', '#7a6ab0'], ['0.5', '#453575'], ['1', '#201540']];
const TEAL    = [['0', '#c8ffef'], ['0.5', '#59e3c8'], ['1', '#1c8a72']];
const BONE    = [['0', '#fffbe8'], ['0.55', '#e8d9ae'], ['1', '#9c8450']];
const EMBER   = [['0', '#ffe08a'], ['0.45', '#ff8a30'], ['1', '#c22e10']];
const BLACKM  = [['0', '#565e74'], ['0.5', '#2c3244'], ['1', '#14182a']];

/* leather sargılı kabza */
function grip(x, y, w, h, gradId, n) {
  let s = '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="' + (w / 2.2) + '" fill="url(#' + gradId + ')" ' + S16 + '/>';
  const k = n || 3;
  for (let i = 1; i <= k; i++) {
    const yy = y + (h / (k + 1)) * i;
    s += '<path d="M' + x + ' ' + (yy + 1) + ' L' + (x + w) + ' ' + (yy - 1) + '" stroke="rgba(10,8,4,0.55)" stroke-width="1.3"/>';
  }
  return s;
}

export const GEAR_ART = {};

/* ═════════════════ KOŞU SİLAHLARI ═════════════════ */

/* Hilal Kılıcı — kavisli pala/saber, altın hilal siperlik, ay taşı topuz */
GEAR_ART.kilic = art(
  lg('kA', 'h', STEEL) + lg('kB', 'v', GOLD) + lg('kC', 'v', [['0', '#8a3040'], ['1', '#4a1420']]),
  '<g transform="rotate(42 32 32)">' +
    '<path d="M31 3 C39.5 11.5 41.6 24 35.2 40 L28.4 40 C31.6 26 30.4 13.5 26.6 8 Z" fill="url(#kA)" ' + S2 + '/>' +
    '<path d="M33.2 11 C35.8 20 35.6 30 32.8 39" stroke="#46536b" stroke-width="1.4" fill="none"/>' +
    '<path d="M29 7.6 C31.8 14.5 32.6 27 29.8 39" stroke="#ffffff" stroke-width="1.5" fill="none" opacity="0.75"/>' +
    '<path d="M20.5 40 Q32 46.8 43.5 40 L43.5 43.4 Q32 49.6 20.5 43.4 Z" fill="url(#kB)" ' + S16 + '/>' +
    '<circle cx="20.8" cy="41.6" r="1.8" fill="url(#kB)" ' + S12 + '/><circle cx="43.2" cy="41.6" r="1.8" fill="url(#kB)" ' + S12 + '/>' +
    grip(29, 46.4, 6, 10.4, 'kC') +
    '<circle cx="32" cy="59" r="3.1" fill="url(#kB)" ' + S16 + '/><circle cx="32" cy="59" r="1.2" fill="#ffe9f2"/>' +
  '</g>' + star(20, 12, 3.4, '#ffffff', 0.9) + star(44, 26, 2.2, '#cfe0ff', 0.7)
);

/* Gölge Bıçakları — çapraz ikiz hançer, gece moru + teal ağız */
GEAR_ART.bicak = art(
  lg('biA', 'v', NIGHTP) + lg('biB', 'v', [['0', '#3a3058'], ['1', '#191030']]) + lg('biC', 'v', TEAL),
  '<g transform="translate(32 41) rotate(-34)">' +
    '<path d="M0 -30 L3.8 -9 L0 -1.5 L-3.8 -9 Z" fill="url(#biB)" ' + S16 + '/>' +
    '<rect x="-6.4" y="-2" width="12.8" height="3" rx="1.4" fill="#2c3244" ' + S12 + '/>' +
    '<rect x="-2" y="1" width="4" height="9.6" rx="1.8" fill="#231a3e" ' + S12 + '/>' +
  '</g>' +
  '<g transform="translate(32 41) rotate(34)">' +
    '<path d="M0 -30 L3.8 -9 L0 -1.5 L-3.8 -9 Z" fill="url(#biA)" ' + S16 + '/>' +
    '<path d="M0.4 -27 L2.6 -9.5 L0.4 -3.5 Z" fill="url(#biC)" opacity="0.85"/>' +
    '<rect x="-6.4" y="-2" width="12.8" height="3" rx="1.4" fill="#4a5468" ' + S12 + '/>' +
    '<circle cx="0" cy="-0.5" r="1.4" fill="#59e3c8"/>' +
    '<rect x="-2" y="1" width="4" height="9.6" rx="1.8" fill="#2a2048" ' + S12 + '/>' +
    '<path d="M-2 3.4 L2 4.6 M-2 6.4 L2 7.6" stroke="rgba(10,8,20,0.6)" stroke-width="1.1"/>' +
    '<path d="M0 10.6 L1.8 14 L0 13 L-1.8 14 Z" fill="#4a5468" ' + S12 + '/>' +
  '</g>' +
  star(15, 15, 2.8, '#7df2dc', 0.9) + star(49, 15, 2.8, '#b9a8ff', 0.85) + star(32, 8, 2, '#ffffff', 0.7)
);

/* Kor Çemberi — ateş halkası: perspektif çember + üç alev dili */
GEAR_ART.kor = art(
  lg('koA', 'v', EMBER) + rg('koB', [['0', '#fff3c0'], ['0.5', '#ffb040'], ['1', 'rgba(200,40,10,0)']], 0.5, 0.5) + lg('koC', 'v', [['0', '#ffd268'], ['0.6', '#ff7a2e'], ['1', '#d2401a']]),
  '<ellipse cx="32" cy="43" rx="20" ry="8" fill="none" stroke="#5e1c08" stroke-width="6"/>' +
  '<ellipse cx="32" cy="43" rx="20" ry="8" fill="url(#koB)" opacity="0.4"/>' +
  '<path d="M32 8 C27 15 24.6 20 26.2 27.5 C22.4 25.5 21.8 22 21.6 19 C16.6 26 18.4 35 32 39.5 C45.6 35 47.4 26 42.4 19 C42.2 22 41.6 25.5 37.8 27.5 C39.4 20 37 15 32 8 Z" fill="url(#koC)" ' + S16 + '/>' +
  '<path d="M32 17 C29.4 22 28.6 25.5 30 30.5 C27.6 29 27 27 26.8 25.2 C24.4 30 26.4 34.5 32 36.6 C37.6 34.5 39.6 30 37.2 25.2 C37 27 36.4 29 34 30.5 C35.4 25.5 34.6 22 32 17 Z" fill="#ffdf7e"/>' +
  '<ellipse cx="32" cy="33.4" rx="3.6" ry="4.4" fill="#fff8dc"/>' +
  '<path d="M12 43 A20 8 0 0 0 52 43" fill="none" stroke="url(#koA)" stroke-width="5.5" stroke-linecap="round"/>' +
  '<path d="M12 43 A20 8 0 0 0 52 43" fill="none" ' + S12 + ' opacity="0.9"/>' +
  '<circle cx="15" cy="26" r="1.5" fill="#ffb050"/><circle cx="50" cy="30" r="1.2" fill="#ffd070"/>' + star(48, 14, 2.6, '#ffd97a', 0.9)
);

/* Gök Gazabı — fırtına bulutundan inen kalın yıldırım */
GEAR_ART.yildirim = art(
  lg('ylA', 'v', [['0', '#fffbe0'], ['0.45', '#ffd84e'], ['1', '#e08a10']]) + lg('ylB', 'v', [['0', '#5a6478'], ['0.6', '#39415a'], ['1', '#232a40']]),
  '<path d="M8 15 C8 9.5 12.5 6 17.5 6.8 C19 3.2 23.6 1.6 27.4 3.4 C31.6 1 37.4 2.6 39 7.2 C43.6 7.4 46.6 11 45.8 15.2 C45 19 41.6 20.8 38 20.4 L12.6 20.4 C9.8 19.8 8 17.6 8 15 Z" fill="url(#ylB)" ' + S2 + '/>' +
  '<path d="M11.5 13.4 C12 10.4 14.6 8.6 17.6 9.2" stroke="#8e9ab4" stroke-width="1.6" fill="none" opacity="0.8"/>' +
  '<path d="M31 14 L18 36 H26.6 L20.6 58 L45 29 H35.4 L43 14 Z" fill="url(#ylA)" ' + S2 + '/>' +
  '<path d="M33.6 17 L25.4 32 H30.8 L27.6 46 L38.6 32.4 H32.8 L37.6 17 Z" fill="#fff6cf" opacity="0.9"/>' +
  '<path d="M14 27 L11 32 L15 33 L12.6 38" stroke="#9fdcff" stroke-width="1.7" fill="none" stroke-linecap="round"/>' +
  '<path d="M48 22 L45.4 26.4 L49 27.2 L46.6 31.6" stroke="#9fdcff" stroke-width="1.7" fill="none" stroke-linecap="round"/>' +
  star(50, 44, 3, '#cfe9ff', 0.9) + star(16, 46, 2.2, '#9fdcff', 0.8)
);

/* Ruh Oku — teal kristal uçlu tayf oku, ruh alevi tüyler */
GEAR_ART.ok = art(
  lg('okA', 'v', TEAL) + lg('okB', 'v', BONE) + rg('okC', [['0', 'rgba(160,255,230,0.85)'], ['1', 'rgba(89,227,200,0)']], 0.5, 0.5),
  '<g transform="rotate(-42 32 32)">' +
    '<circle cx="32" cy="10" r="9" fill="url(#okC)"/>' +
    '<path d="M32 2 L37.6 13.6 L32 18 L26.4 13.6 Z" fill="url(#okA)" ' + S16 + '/>' +
    '<path d="M32 4.6 L34.8 12.8 L32 15.2 Z" fill="#eafff8" opacity="0.85"/>' +
    '<rect x="30.9" y="17.4" width="2.2" height="30" rx="1.1" fill="url(#okB)" ' + S12 + '/>' +
    '<path d="M31 47 C26.5 49 25 54 25.8 58.5 C28.4 55.5 30 54.4 31 53.6 Z" fill="#59e3c8" opacity="0.85" ' + S12 + '/>' +
    '<path d="M33 47 C37.5 49 39 54 38.2 58.5 C35.6 55.5 34 54.4 33 53.6 Z" fill="#38b89e" opacity="0.85" ' + S12 + '/>' +
    '<path d="M32 48 L32 58" stroke="#c8ffef" stroke-width="1.4"/>' +
    '<path d="M26.5 20 C24.8 27 24.8 34 26.2 41" stroke="#7df2dc" stroke-width="1.4" fill="none" opacity="0.5"/>' +
    '<path d="M37.5 22 C39 29 39 35 37.8 41" stroke="#7df2dc" stroke-width="1.2" fill="none" opacity="0.35"/>' +
  '</g>' + star(16, 44, 2.6, '#a0ffe6', 0.85) + star(46, 16, 3.2, '#d8fff4', 0.95)
);

/* Ay Küresi — sedef ay küre + eğik hale halkası */
GEAR_ART.kure = art(
  rg('kuA', [['0', '#ffffff'], ['0.45', '#cdd6ee'], ['1', '#5f6898']]) + lg('kuB', 'h', [['0', '#dfe7ff'], ['1', '#7f8fd0']]),
  '<g transform="rotate(-16 32 30)"><path d="M11 30 A21 6.6 0 0 0 53 30" fill="none" stroke="#8494d4" stroke-width="2.6" opacity="0.55"/></g>' +
  '<circle cx="32" cy="29" r="13.5" fill="url(#kuA)" ' + S2 + '/>' +
  '<ellipse cx="27" cy="24" rx="3.4" ry="2.6" fill="#a8b2d8" opacity="0.6"/><ellipse cx="36.5" cy="31" rx="2.4" ry="1.9" fill="#a8b2d8" opacity="0.5"/><ellipse cx="29" cy="35" rx="1.7" ry="1.3" fill="#a8b2d8" opacity="0.5"/>' +
  '<path d="M39 17.5 A13.5 13.5 0 0 1 39 40.5 A17 17 0 0 0 39 17.5 Z" fill="#3c4470" opacity="0.5"/>' +
  '<circle cx="26.6" cy="22.6" r="3" fill="#ffffff" opacity="0.85"/>' +
  '<g transform="rotate(-16 32 30)"><path d="M11 30 A21 6.6 0 0 1 53 30" fill="none" stroke="url(#kuB)" stroke-width="3" stroke-linecap="round"/><path d="M11 30 A21 6.6 0 0 1 53 30" fill="none" ' + S12 + ' opacity="0.7"/></g>' +
  star(50, 12, 3.2, '#e8eeff', 0.95) + star(13, 46, 2.4, '#c8d4ff', 0.8) + star(52, 46, 1.8, '#ffffff', 0.7)
);

/* Ay Yayı — gümüş recurve yay, buz uçlu nazik kirişli, ay tılsımı */
GEAR_ART.yay = art(
  lg('yyA', 'v', [['0', '#f2f7ff'], ['0.5', '#c2cfe4'], ['1', '#71829e']]) + lg('yyB', 'v', GOLD) + lg('yyC', 'h', ICE),
  '<g transform="rotate(-30 32 32)">' +
    '<path d="M21 7 C37 12 43.5 21 43.5 32 C43.5 43 37 52 21 57" fill="none" stroke="url(#yyA)" stroke-width="4.6" stroke-linecap="round"/>' +
    '<path d="M21 7 C37 12 43.5 21 43.5 32 C43.5 43 37 52 21 57" fill="none" ' + S12 + ' opacity="0.85"/>' +
    '<path d="M23 10 C34 14.5 39.5 22 40 30" stroke="#ffffff" stroke-width="1.5" fill="none" opacity="0.8"/>' +
    '<path d="M21 7 C17.6 5.2 15.8 7 16.8 10.2" fill="none" stroke="url(#yyA)" stroke-width="3.4" stroke-linecap="round"/>' +
    '<path d="M21 57 C17.6 58.8 15.8 57 16.8 53.8" fill="none" stroke="url(#yyA)" stroke-width="3.4" stroke-linecap="round"/>' +
    '<circle cx="17" cy="9.4" r="1.9" fill="url(#yyB)" ' + S12 + '/><circle cx="17" cy="54.6" r="1.9" fill="url(#yyB)" ' + S12 + '/>' +
    '<path d="M17.4 10.6 L17.4 53.4" stroke="#eef4ff" stroke-width="1.5"/>' +
    '<rect x="40.6" y="26" width="5.4" height="12" rx="2.5" fill="#5c3c1a" ' + S16 + '/>' +
    '<path d="M41 29 H46 M41 32 H46 M41 35 H46" stroke="rgba(12,8,4,0.5)" stroke-width="1.1"/>' +
    '<path d="M8 32 H50" stroke="#e6d9b8" stroke-width="2.2" stroke-linecap="round"/>' +
    '<path d="M50 32 L57 32 L49.5 27.6 L51.5 32 L49.5 36.4 Z" fill="url(#yyC)" ' + S12 + '/>' +
    '<path d="M10 29.6 L14 32 L10 34.4 L12 32 Z" fill="#8fd8ff" ' + S12 + '/>' +
    '<path d="M46.5 41 A4.2 4.2 0 1 1 42.5 45.8 A3.1 3.1 0 0 0 46.5 41 Z" fill="url(#yyB)" ' + S12 + '/>' +
  '</g>' + star(14, 14, 3, '#dff0ff', 0.95) + star(51, 49, 2.4, '#a8d8ff', 0.85)
);

/* Büyücü Asası — çatal budaklı tepe, mor küre, altın bilezik */
GEAR_ART.asa = art(
  lg('asA', 'v', WOOD) + rg('asB', [['0', '#f2e4ff'], ['0.45', '#b06cff'], ['1', '#571ba0']]) + lg('asC', 'v', GOLD) + rg('asD', [['0', 'rgba(176,108,255,0.5)'], ['1', 'rgba(176,108,255,0)']], 0.5, 0.5),
  '<g transform="rotate(14 32 32)">' +
    '<circle cx="32" cy="12" r="11" fill="url(#asD)"/>' +
    '<rect x="30.6" y="21" width="2.8" height="36" rx="1.4" fill="url(#asA)" ' + S16 + '/>' +
    '<path d="M31.4 26 C30.8 34 30.8 44 31.4 52" stroke="rgba(20,10,2,0.5)" stroke-width="1"/>' +
    '<path d="M30.4 22 C24.4 19 23 12.5 26.8 7.4 C26.4 12.5 27.8 15.6 31 17.8 Z" fill="url(#asA)" ' + S16 + '/>' +
    '<path d="M33.6 22 C39.6 19 41 12.5 37.2 7.4 C37.6 12.5 36.2 15.6 33 17.8 Z" fill="url(#asA)" ' + S16 + '/>' +
    '<circle cx="32" cy="12" r="5.8" fill="url(#asB)" ' + S16 + '/>' +
    '<circle cx="30" cy="10" r="1.8" fill="#ffffff" opacity="0.85"/>' +
    '<rect x="28.8" y="21.2" width="6.4" height="3.4" rx="1.5" fill="url(#asC)" ' + S12 + '/>' +
    '<path d="M29.8 55 L34.2 55 L32 60 Z" fill="url(#asC)" ' + S12 + '/>' +
    '<path d="M22 16 L23 18.2 L25.2 19.2 L23 20.2 L22 22.4 L21 20.2 L18.8 19.2 L21 18.2 Z" fill="#e6ccff" opacity="0.9"/>' +
  '</g>' + star(46, 22, 2.6, '#d8b8ff', 0.9)
);

/* Savaş Topuzu (sopa) — çivili meşe tokmak */
GEAR_ART.sopa = art(
  lg('spA', 'v', WOOD) + lg('spB', 'v', STEELD),
  '<g transform="rotate(38 32 32)">' +
    '<path d="M25 8.5 C25 6 27 4.6 29.4 5 L34.6 5 C37 4.6 39 6 39 8.5 L36.6 44 C36.4 47 34.6 48.6 32 48.6 C29.4 48.6 27.6 47 27.4 44 Z" fill="url(#spA)" ' + S2 + '/>' +
    '<path d="M27.6 8 C27.4 18 27.6 30 28.4 42" stroke="rgba(20,10,2,0.45)" stroke-width="1.2" fill="none"/>' +
    '<ellipse cx="32" cy="6.4" rx="6.2" ry="2.6" fill="#c09055" ' + S12 + '/>' +
    '<rect x="24.6" y="13" width="14.8" height="4.6" rx="2" fill="url(#spB)" ' + S16 + '/>' +
    '<path d="M24.8 15.2 L19.6 15.2 L24.8 12.6 Z" fill="url(#spB)" ' + S12 + '/>' +
    '<path d="M39.2 15.2 L44.4 15.2 L39.2 12.6 Z" fill="url(#spB)" ' + S12 + '/>' +
    '<circle cx="29.4" cy="15.2" r="1.1" fill="#d8e2ee"/><circle cx="34.6" cy="15.2" r="1.1" fill="#d8e2ee"/>' +
    '<rect x="24.9" y="24" width="14" height="4.2" rx="1.9" fill="url(#spB)" ' + S16 + '/>' +
    grip(29.2, 48.4, 5.6, 9, 'spA', 2) +
    '<circle cx="32" cy="59.4" r="2.4" fill="#54320f" ' + S12 + '/>' +
  '</g>' + '<path d="M13 20 A22 22 0 0 1 22 9" stroke="#8b90a3" stroke-width="1.6" fill="none" opacity="0.5" stroke-linecap="round" stroke-dasharray="3 4"/>'
);

/* Hasat Tırpanı — uzun saplı orak, ruh ışıltılı çelik ağız */
GEAR_ART.tirpan = art(
  lg('trA', 'd', STEEL) + lg('trB', 'v', [['0', '#6a4c26'], ['1', '#38230c']]),
  '<path d="M41.5 7 C37 22 31 40 23 57" fill="none" stroke="url(#trB)" stroke-width="4.6" stroke-linecap="round"/>' +
  '<path d="M41.5 7 C37 22 31 40 23 57" fill="none" ' + S12 + ' opacity="0.7"/>' +
  '<path d="M40 10 C36.4 22 31.6 36 25.6 50" stroke="#9a7442" stroke-width="1.3" fill="none" opacity="0.8"/>' +
  '<rect x="31" y="27.5" width="8" height="3.4" rx="1.6" transform="rotate(24 35 29)" fill="#54320f" ' + S12 + '/>' +
  '<rect x="24.5" y="41.5" width="8" height="3.4" rx="1.6" transform="rotate(24 28.5 43)" fill="#54320f" ' + S12 + '/>' +
  '<path d="M41.5 8 C33 1.5 17 2.5 7.5 12 C16.5 8.6 27 10.4 34 16.2 C37.6 19.2 42.6 14 41.5 8 Z" fill="url(#trA)" ' + S2 + '/>' +
  '<path d="M38.5 6.4 C30.5 2.6 18.5 4 10.5 10 C18.5 7.4 28 8.8 34.5 13.6" stroke="#6ff0b0" stroke-width="1.5" fill="none" opacity="0.7" stroke-linecap="round"/>' +
  '<ellipse cx="40.6" cy="9.8" rx="2.6" ry="2.9" fill="#3c4a5e" ' + S12 + '/>' +
  star(10, 20, 2.8, '#8df5c8', 0.85) + star(48, 20, 2.2, '#d8ffe9', 0.7)
);

/* Kemik Tabanca — fildişi kabza, çelik namlu, altın horoz */
GEAR_ART.tabanca = art(
  lg('tbA', 'v', BONE) + lg('tbB', 'v', STEELD) + lg('tbC', 'v', GOLD),
  '<g transform="rotate(-8 32 32)">' +
    '<rect x="24" y="21.5" width="32" height="7.4" rx="2.6" fill="url(#tbB)" ' + S2 + '/>' +
    '<path d="M26 23.2 H52" stroke="#8e9ab4" stroke-width="1.3" opacity="0.8"/>' +
    '<rect x="50" y="20.4" width="5.4" height="9.6" rx="1.6" fill="url(#tbC)" ' + S16 + '/>' +
    '<path d="M12.5 21.5 H28 V29 C28 34 24.6 35.6 20.8 38.4 C16.6 41.4 15 45.6 16.4 50 C10.6 47.6 8.6 41 11 34.6 C12.2 31.4 12.5 26.5 12.5 21.5 Z" fill="url(#tbA)" ' + S2 + '/>' +
    '<path d="M14.8 24 C14.8 30 13.6 34 12.6 37.4" stroke="#b8a878" stroke-width="1.3" fill="none" opacity="0.8"/>' +
    '<circle cx="16.6" cy="41.8" r="1.3" fill="#8a7440"/><circle cx="14" cy="36.8" r="1.1" fill="#8a7440"/>' +
    '<path d="M27 21.5 C26 16.5 28.6 14 31.6 14.8 C33.8 15.4 34.6 17.6 33.6 19.6 L31.4 21.5 Z" fill="url(#tbC)" ' + S16 + '/>' +
    '<path d="M27 30 C28 35.4 32.4 36.8 36 35.4" fill="none" stroke="url(#tbC)" stroke-width="2.6" stroke-linecap="round"/>' +
    '<path d="M30.5 30 L31.6 34" stroke="' + O + '" stroke-width="2" stroke-linecap="round"/>' +
    '<circle cx="23" cy="25.2" r="2" fill="url(#tbC)" ' + S12 + '/>' +
  '</g>' + star(58, 16, 3, '#ffe9a8', 0.9) + star(52, 34, 1.8, '#fff', 0.6)
);

/* Saçma Namlu — çan ağızlı dolma tüfek (blunderbuss) */
GEAR_ART.sacma = art(
  lg('scA', 'v', WOOD) + lg('scB', 'v', STEELD) + lg('scC', 'v', GOLD),
  '<g transform="rotate(-10 32 34)">' +
    '<path d="M7 36 C6.4 31.4 9.6 28.6 14 29 L27 30.2 V38.6 L14.6 40.2 C10.6 40.7 7.5 39.6 7 36 Z" fill="url(#scA)" ' + S2 + '/>' +
    '<path d="M10 33 C13 32.2 17 32 21 32.4" stroke="rgba(20,10,2,0.45)" stroke-width="1.2" fill="none"/>' +
    '<rect x="25" y="28.4" width="10.4" height="9.4" rx="1.8" fill="url(#scB)" ' + S16 + '/>' +
    '<path d="M28.5 28.6 C27.5 24.4 30 22.2 32.6 23 C34.6 23.6 35.2 25.6 34.2 27.4 L32.4 28.6 Z" fill="url(#scC)" ' + S12 + '/>' +
    '<path d="M34.5 29.6 L48 28 C52 27.2 54.6 25.2 56.6 22 L56.6 42.4 C54.6 39.2 52 37.6 48 37 L34.5 36 Z" fill="url(#scB)" ' + S2 + '/>' +
    '<ellipse cx="56.4" cy="32.2" rx="2.2" ry="10" fill="#232a38" ' + S12 + '/>' +
    '<path d="M36 30.6 L47 29.4" stroke="#8e9ab4" stroke-width="1.2" opacity="0.85"/>' +
    '<rect x="41" y="27.6" width="3.6" height="9.8" rx="1.4" fill="url(#scC)" ' + S12 + '/>' +
  '</g>' +
  '<circle cx="57" cy="13" r="2.2" fill="#c8ccd8" ' + S12 + '/><circle cx="51" cy="8.6" r="1.7" fill="#a8aebc" ' + S12 + '/><circle cx="60.5" cy="6.5" r="1.5" fill="#a8aebc" ' + S12 + '/>' +
  '<path d="M46 14 L50 11.4 M53 17 L56.6 14.8" stroke="#8b90a3" stroke-width="1.4" opacity="0.7" stroke-linecap="round"/>'
);

/* Kor Havanı — kara demir bomba, yanan fitil, kor çatlaklar */
GEAR_ART.bomba = art(
  rg('bmA', [['0', '#6a7288'], ['0.5', '#333a4c'], ['1', '#171c2a']]) + lg('bmB', 'v', GOLD) + lg('bmC', 'v', EMBER),
  '<circle cx="29" cy="37" r="16.5" fill="url(#bmA)" ' + S2 + '/>' +
  '<path d="M17.5 30 A14 14 0 0 1 27 24" stroke="#9aa4b8" stroke-width="2" fill="none" opacity="0.7" stroke-linecap="round"/>' +
  '<path d="M13.4 39.5 H44.6" stroke="url(#bmB)" stroke-width="3.2"/>' +
  '<path d="M13.4 39.5 H44.6" ' + S12 + ' fill="none" opacity="0.5"/>' +
  '<circle cx="19" cy="39.5" r="1" fill="#7a5210"/><circle cx="29" cy="39.5" r="1" fill="#7a5210"/><circle cx="39" cy="39.5" r="1" fill="#7a5210"/>' +
  '<path d="M33 45 L36 50 M27 47 L28.5 52.4 M37.5 41.5 L42.5 44.5" stroke="url(#bmC)" stroke-width="1.8" stroke-linecap="round"/>' +
  '<rect x="31.5" y="17.4" width="9" height="6.6" rx="1.8" transform="rotate(-24 36 20.7)" fill="url(#bmB)" ' + S16 + '/>' +
  '<path d="M40 15.5 C44.5 12 48.6 13.6 50.6 9.4" stroke="#8a6034" stroke-width="2.4" fill="none" stroke-linecap="round"/>' +
  star(52, 7.5, 4, '#ffd75e', 1) + '<circle cx="52" cy="7.5" r="1.7" fill="#fff5cf"/>' + star(46, 3.5, 1.8, '#ff9a40', 0.9)
);

/* ═════════════════ SİLAH KATI (kuşanım) ═════════════════ */

/* Keskin Bileme — taze bilenmiş şövalye kılıcı, bileme kıvılcımları */
GEAR_ART.w_bileme = art(
  lg('wbA', 'h', STEEL) + lg('wbB', 'v', [['0', '#d8ba6a'], ['1', '#7a5a1c']]) + lg('wbC', 'v', DKLTH),
  '<g transform="rotate(44 32 32)">' +
    '<path d="M32 3 L35.4 9.5 L34.4 39 H29.6 L28.6 9.5 Z" fill="url(#wbA)" ' + S2 + '/>' +
    '<path d="M32 8 L32 37.5" stroke="#59677f" stroke-width="1.5"/>' +
    '<path d="M29.6 10 L30.4 37" stroke="#ffffff" stroke-width="1.2" opacity="0.85"/>' +
    '<path d="M34.4 10 L33.6 37" stroke="#ffffff" stroke-width="1.2" opacity="0.55"/>' +
    '<rect x="21.5" y="39" width="21" height="3.8" rx="1.8" fill="url(#wbB)" ' + S16 + '/>' +
    '<circle cx="22.4" cy="40.9" r="1.5" fill="url(#wbB)" ' + S12 + '/><circle cx="41.6" cy="40.9" r="1.5" fill="url(#wbB)" ' + S12 + '/>' +
    grip(29.4, 42.8, 5.2, 10, 'wbC') +
    '<circle cx="32" cy="55.4" r="2.9" fill="url(#wbB)" ' + S16 + '/>' +
  '</g>' +
  star(19.5, 24, 3.2, '#ffe9a8', 0.95) + star(25, 31, 2, '#ffd75e', 0.85) + star(15, 30, 1.6, '#fff2c8', 0.8)
);

/* Gergin Kiriş — TAM ÇEKİLİ porsuk yayı, kurulu ok */
GEAR_ART.w_kiris = art(
  lg('wkA', 'v', WOOD) + lg('wkB', 'v', STEEL) + lg('wkC', 'v', TEAL),
  '<g transform="rotate(-28 32 32)">' +
    '<path d="M22 6 C36.5 10.5 42.5 20.5 42.5 32 C42.5 43.5 36.5 53.5 22 58" fill="none" stroke="url(#wkA)" stroke-width="4.8" stroke-linecap="round"/>' +
    '<path d="M22 6 C36.5 10.5 42.5 20.5 42.5 32 C42.5 43.5 36.5 53.5 22 58" fill="none" ' + S12 + ' opacity="0.85"/>' +
    '<path d="M24.5 9.5 C34 13.8 39 21 39.6 29" stroke="#d8a868" stroke-width="1.4" fill="none" opacity="0.85"/>' +
    '<rect x="39.6" y="26.5" width="5.6" height="11" rx="2.5" fill="#4a2e10" ' + S16 + '/>' +
    '<path d="M22 6 L8.5 32 L22 58" fill="none" stroke="#eef2fa" stroke-width="1.7" stroke-linejoin="round"/>' +
    '<path d="M8.5 32 H51" stroke="#e6d9b8" stroke-width="2.2" stroke-linecap="round"/>' +
    '<path d="M51 32 L58 32 L50.5 27.8 L52.5 32 L50.5 36.2 Z" fill="url(#wkB)" ' + S12 + '/>' +
    '<path d="M9 29.8 L14.5 27.4 L13 32 L14.5 36.6 L9 34.2 Z" fill="url(#wkC)" ' + S12 + '/>' +
    '<path d="M17.5 3.5 A34 34 0 0 1 24 5.4 M17.5 60.5 A34 34 0 0 0 24 58.6" stroke="#8b90a3" stroke-width="1.4" fill="none" opacity="0.55" stroke-dasharray="2.5 3"/>' +
  '</g>' + star(50, 14, 2.8, '#c8ffe8', 0.9)
);

/* Kan Oluğu — rondel hançer, kızıl kan kanallı */
GEAR_ART.w_kanoluk = art(
  lg('woA', 'h', STEEL) + lg('woB', 'v', BLOOD) + lg('woC', 'v', BLACKM),
  '<g transform="rotate(44 32 32)">' +
    bdrop(32, 3.2, 2.2, '#e0344a') +
    '<path d="M32 7 L34.8 13 L33.5 37 H30.5 L29.2 13 Z" fill="url(#woA)" ' + S2 + '/>' +
    '<path d="M31.3 12 L31.5 34.5 H32.5 L32.7 12 C32.5 10.6 31.5 10.6 31.3 12 Z" fill="url(#woB)" stroke="#5e0a16" stroke-width="0.9"/>' +
    '<path d="M29.8 13 L30.4 35" stroke="#ffffff" stroke-width="1.1" opacity="0.8"/>' +
    '<ellipse cx="32" cy="38.6" rx="8" ry="2.9" fill="url(#woC)" ' + S16 + '/>' +
    '<circle cx="32" cy="38.4" r="1.5" fill="#e0344a" ' + S12 + '/>' +
    grip(29.6, 41, 4.8, 9.4, 'woC') +
    '<ellipse cx="32" cy="52.4" rx="5.4" ry="2.5" fill="url(#woC)" ' + S16 + '/>' +
    '<circle cx="32" cy="52.4" r="1.2" fill="#8b90a3"/>' +
  '</g>' + bdrop(44.5, 46, 2, '#d2263c') + star(18, 18, 2.6, '#ffd8dd', 0.8)
);

/* Ejder Kabzası — ejder pençesi kehribar küreyi kavrar */
GEAR_ART.w_ejderkabza = art(
  lg('weA', 'v', [['0', '#5c4028'], ['1', '#2e1c0a']]) + rg('weB', [['0', '#ffe6b0'], ['0.45', '#ff9040'], ['1', '#a02810']]) + lg('weC', 'v', GOLD) + lg('weD', 'v', BLOOD) + rg('weE', [['0', 'rgba(255,150,60,0.45)'], ['1', 'rgba(255,150,60,0)']], 0.5, 0.5),
  '<g transform="rotate(15 32 32)">' +
    '<circle cx="32" cy="13.5" r="11.5" fill="url(#weE)"/>' +
    '<rect x="30.6" y="24" width="2.8" height="32" rx="1.4" fill="url(#weA)" ' + S16 + '/>' +
    '<path d="M28.6 23 C24.2 18.6 24 12 28.2 7.6 C27.2 12.4 28.4 16 32 18.6 L30.8 21.8 Z" fill="url(#weC)" ' + S16 + '/>' +
    '<path d="M35.4 23 C39.8 18.6 40 12 35.8 7.6 C36.8 12.4 35.6 16 32 18.6 L33.2 21.8 Z" fill="url(#weC)" ' + S16 + '/>' +
    '<path d="M32 22.8 C29.6 20.6 29.2 17.4 30.6 14.6 C31 17.2 31.6 18.6 33.4 19.8 Z" fill="url(#weC)" ' + S12 + '/>' +
    '<circle cx="32" cy="13.5" r="5.6" fill="url(#weB)" ' + S16 + '/>' +
    '<circle cx="30.2" cy="11.6" r="1.6" fill="#fff3d0" opacity="0.9"/>' +
    '<path d="M28.2 24 H35.8 L35 28.4 C33 29.6 31 29.6 29 28.4 Z" fill="url(#weD)" ' + S12 + '/>' +
    '<path d="M29.4 26.4 Q32 27.8 34.6 26.4" stroke="#5e0a16" stroke-width="1" fill="none"/>' +
    '<path d="M29.8 55.5 H34.2 L32 60.5 Z" fill="url(#weC)" ' + S12 + '/>' +
    '<circle cx="20" cy="8" r="1.4" fill="#ffb050"/><circle cx="45" cy="19" r="1.2" fill="#ff9040"/>' +
  '</g>'
);

/* İnfaz Ağzı — düz uçlu cellat palası, delikli ağız, mor püskül */
GEAR_ART.w_infaz = art(
  lg('wiA', 'h', STEELD) + lg('wiB', 'v', BLACKM) + lg('wiC', 'v', PURPLE),
  '<g transform="rotate(44 32 32)">' +
    '<path d="M27 6.5 L33.8 4 L37 8 L35.8 39 H28.2 Z" fill="url(#wiA)" ' + S2 + '/>' +
    '<circle cx="32.2" cy="11.5" r="1.8" fill="' + O + '"/>' +
    '<path d="M29 9 L29.6 37" stroke="#dfe7f2" stroke-width="1.4" opacity="0.9"/>' +
    '<path d="M35.4 10 L34.6 37" stroke="#1c2230" stroke-width="1.2" opacity="0.7"/>' +
    '<rect x="23" y="39" width="18" height="4.4" rx="1.6" fill="url(#wiB)" ' + S16 + '/>' +
    '<circle cx="25.6" cy="41.2" r="1" fill="#8b90a3"/><circle cx="38.4" cy="41.2" r="1" fill="#8b90a3"/>' +
    grip(29.6, 43.4, 4.8, 11, 'wiB') +
    '<path d="M32 56.6 L34.6 58.2 L32 59.8 L29.4 58.2 Z" fill="url(#wiA)" ' + S12 + '/>' +
    '<path d="M34.5 57.6 C37.5 58.4 38.6 61 38 64" stroke="url(#wiC)" stroke-width="2.2" fill="none" stroke-linecap="round"/>' +
    '<path d="M36.6 60 C37.8 61.4 38 62.8 37.8 64.2" stroke="#c9a2ff" stroke-width="1.2" fill="none" stroke-linecap="round"/>' +
  '</g>' + star(18, 14, 2.6, '#c8d4e2', 0.8)
);

/* Kadim Namlu — yivli altın topuz, kor çekirdek */
GEAR_ART.w_kadimnamlu = art(
  lg('wnA', 'v', GOLD) + rg('wnB', [['0', '#fff0c0'], ['0.5', '#ffb040'], ['1', '#b04010']]) + lg('wnC', 'v', BLACKM),
  '<g transform="rotate(40 32 32)">' +
    '<ellipse cx="32" cy="15" rx="4" ry="8.6" fill="url(#wnB)" ' + S12 + '/>' +
    '<path d="M30.6 5.5 C25.6 7.5 23 12.5 23.6 19.5 L28 21.6 C26.8 15.5 27.8 10 30.6 5.5 Z" fill="url(#wnA)" ' + S16 + '/>' +
    '<path d="M33.4 5.5 C38.4 7.5 41 12.5 40.4 19.5 L36 21.6 C37.2 15.5 36.2 10 33.4 5.5 Z" fill="url(#wnA)" ' + S16 + '/>' +
    '<path d="M32 4.4 C30.4 9 30.2 16 31 22.4 H33 C33.8 16 33.6 9 32 4.4 Z" fill="#ffe9a8" ' + S16 + '/>' +
    '<circle cx="32" cy="3.6" r="2.2" fill="url(#wnA)" ' + S12 + '/>' +
    '<rect x="28.4" y="22.2" width="7.2" height="3.6" rx="1.6" fill="url(#wnA)" ' + S16 + '/>' +
    '<rect x="30.7" y="25.8" width="2.6" height="28" rx="1.3" fill="url(#wnC)" ' + S16 + '/>' +
    '<rect x="29.3" y="31" width="5.4" height="2.6" rx="1.2" fill="url(#wnA)" ' + S12 + '/>' +
    '<rect x="29.3" y="44" width="5.4" height="2.6" rx="1.2" fill="url(#wnA)" ' + S12 + '/>' +
    '<circle cx="32" cy="56.4" r="2.6" fill="url(#wnA)" ' + S16 + '/>' +
    '<circle cx="26.4" cy="12" r="1.2" fill="#ffcc60"/><circle cx="38" cy="18" r="1" fill="#ffb050"/>' +
  '</g>' + star(46, 13, 3, '#ffe9a8', 0.95) + star(16, 26, 2, '#ffd75e', 0.8)
);

/* Kan İçen Ağız — vampir tırpanı: altın sap, kan damlatan kızıl ağız */
GEAR_ART.w_kanici = art(
  lg('wvA', 'd', [['0', '#3c2030'], ['0.5', '#701828'], ['1', '#2a0c14']]) + lg('wvB', 'v', GOLD) + lg('wvC', 'h', BLOOD),
  '<path d="M42 8 C37.5 23 31.5 40 23.5 57" fill="none" stroke="url(#wvB)" stroke-width="4.6" stroke-linecap="round"/>' +
  '<path d="M42 8 C37.5 23 31.5 40 23.5 57" fill="none" ' + S12 + ' opacity="0.75"/>' +
  '<path d="M40.4 11 C37 22 32.6 34 27 47" stroke="#ffe9a8" stroke-width="1.2" fill="none" opacity="0.75"/>' +
  '<rect x="27" y="38.5" width="8.4" height="3.4" rx="1.6" transform="rotate(24 31 40)" fill="url(#wvB)" ' + S12 + '/>' +
  '<path d="M42 9 C33.5 2 17.5 3 8 12.5 C17 9.2 27.5 11 34.5 17 C38 20 43 15 42 9 Z" fill="url(#wvA)" ' + S2 + '/>' +
  '<path d="M39 7 C31 3.6 19.5 4.6 11.5 10.6 C19.5 8.2 29 9.6 35.5 14.4 C37.6 15.9 40 12 39 7 Z" fill="url(#wvC)" opacity="0.9"/>' +
  '<path d="M14.5 9.2 L16 12.8 M20.5 8.6 L21.6 12.6 M27 9.6 L27.6 13.6" stroke="#2a0c14" stroke-width="1.4" stroke-linecap="round"/>' +
  bdrop(18, 18.5, 2.2, '#e0344a') + bdrop(28, 21.5, 1.7, '#d2263c') +
  '<circle cx="41" cy="11" r="2.7" fill="url(#wvB)" ' + S12 + '/><circle cx="41" cy="11" r="1.2" fill="#ff3b4e"/>' +
  '<path d="M46 16 C50 14.5 52 11 51.5 7 C54.5 11 54 16.5 49.5 19.4 Z" fill="url(#wvA)" ' + S12 + '/>' +
  star(10, 26, 2.6, '#ff9aa6', 0.85)
);

/* ZIRH · ELDİVEN · ÇİZME v4 armorArt.js'e taşındı (eşya başına ayrı siluet);
   v3 çizimleri + gauntletBase/cuff silindi (ölü kod). */
Object.assign(GEAR_ART, ARMOR_ART);

/* CEPHANE silahları (w_cy_* … w_ef_*) v4 ile weaponArt.js'e taşındı: kademe
   başına ayrı siluet. v3'ün "tek siluet × beş renk" çizimleri silindi (ölü kod). */
Object.assign(GEAR_ART, WEAPON_ART);

/* eski anahtar takma adları — pasif rünler ve geriye dönük çağrılar */
GEAR_ART.zirh = GEAR_ART.z_celik;
GEAR_ART.cizme = GEAR_ART.b_firtina;
GEAR_ART.el = GEAR_ART.g_deri;
GEAR_ART.hancer = GEAR_ART.w_kanoluk;
GEAR_ART.bomb = GEAR_ART.bomba;
