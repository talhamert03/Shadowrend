/* ═══════════════════════════════════════════════════════════
   chestArt.js — SANDIK SANATI v8 (2D vitrin glifleri)
   64×58 · 7 kademe. TEK ortak silüet (referans krat dili:
   tombul fıçı kapak + trapez gövde + kalın metal kuşaklar +
   iri kabaralar) — kademe kimliği malzeme/ışık/aksesuarla
   anlatılır, 3D açılış sandığıyla birebir eş görünür.
   t1 tahta · t2 gümüş · t3 altın · t4 büyülü(açık mor) ·
   t5 buzul · t6 mistik(koyu mor) · t7 ejderha
   ═══════════════════════════════════════════════════════════ */

const O = '#0a0c14';
const S2 = 'stroke="' + O + '" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"';
const S15 = 'stroke="' + O + '" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round"';
const S1 = 'stroke="' + O + '" stroke-width="1.1" stroke-linejoin="round" stroke-linecap="round"';

function stops(arr) { let s = ''; for (const [o, c] of arr) s += '<stop offset="' + o + '" stop-color="' + c + '"/>'; return s; }
function lg(id, rot, arr) {
  const c = rot === 'h' ? 'x1="0" y1="0" x2="1" y2="0"' : 'x1="0" y1="0" x2="0" y2="1"';
  return '<linearGradient id="' + id + '" ' + c + '>' + stops(arr) + '</linearGradient>';
}
function rg(id, arr) { return '<radialGradient id="' + id + '" cx="0.5" cy="0.5" r="0.55">' + stops(arr) + '</radialGradient>'; }

function starP(x, y, s, c, o) {
  return '<path d="M' + x + ' ' + (y - s) + ' L' + (x + s * 0.26) + ' ' + (y - s * 0.26) + ' L' + (x + s) + ' ' + y +
    ' L' + (x + s * 0.26) + ' ' + (y + s * 0.26) + ' L' + x + ' ' + (y + s) + ' L' + (x - s * 0.26) + ' ' + (y + s * 0.26) +
    ' L' + (x - s) + ' ' + y + ' L' + (x - s * 0.26) + ' ' + (y - s * 0.26) + ' Z" fill="' + c + '"' + (o != null ? ' opacity="' + o + '"' : '') + '/>';
}
function tw(x, y, s, c, dur, beg) {
  return '<g opacity="0">' + starP(x, y, s, c) +
    '<animate attributeName="opacity" values="0;1;0" dur="' + dur + 's" begin="' + beg + 's" repeatCount="indefinite"/>' +
    '</g>';
}
function pulse(a, b, dur, beg) {
  return '<animate attributeName="opacity" values="' + a + ';' + b + ';' + a + '" dur="' + dur + 's" begin="' + (beg || 0) + 's" repeatCount="indefinite" calcMode="spline" keySplines="0.45 0 0.55 1;0.45 0 0.55 1" keyTimes="0;0.5;1"/>';
}
function bob(px, dur, beg) {
  return '<animateTransform attributeName="transform" type="translate" values="0 0;0 -' + px + ';0 0" dur="' + dur + 's" begin="' + (beg || 0) + 's" repeatCount="indefinite" calcMode="spline" keySplines="0.45 0 0.55 1;0.45 0 0.55 1" keyTimes="0;0.5;1" additive="sum"/>';
}
const svgo = (defs, body) => '<svg viewBox="0 0 64 58" class="chest-svg">' + (defs ? '<defs>' + defs + '</defs>' : '') + body + '</svg>';

/* fıçı kapak üst kavisinin |dx| ofsetindeki y değeri (cx=32, rx=22, ry=17.5, rim y=29) */
const domeY = (dx) => 29 - 17.5 * Math.sqrt(Math.max(0, 1 - (dx / 22) * (dx / 22)));

/* ── ORTAK GÖVDE — referans krat silüeti ──
   o: { wood, lid, metal, metalDk, plank, rimLight, stud, studHi, noStrapBody } */
function chestBase(o) {
  const SX = 12;                       // kuşak merkez ofseti
  const yT = domeY(SX) - 1;            // kuşağın kubbe üstünde başladığı y
  let s = '';
  /* gövde (hafif trapez) */
  s += '<path d="M11.5 29 H52.5 L50 51 H14 Z" fill="url(#' + o.wood + ')" ' + S2 + '/>';
  s += '<path d="M22 30 L22.7 50.5 M32 30 V50.5 M42 30 L41.3 50.5" stroke="' + o.plank + '" stroke-width="1.4" fill="none" opacity="0.8"/>';
  s += '<path d="M16.5 33 C17.3 38 17 43 16.5 48 M47.5 33 C46.7 38 47 43 47.5 48" stroke="rgba(6,6,10,0.35)" stroke-width="1" fill="none"/>';
  /* fıçı kapak */
  s += '<path d="M10 29 Q10 11.5 32 11.5 Q54 11.5 54 29 Z" fill="url(#' + o.lid + ')" ' + S2 + '/>';
  s += '<path d="M22 13.7 Q21.2 20.6 21.4 27.5 M32 11.5 V27.5 M42 13.7 Q42.8 20.6 42.6 27.5" stroke="' + o.plank + '" stroke-width="1.3" fill="none" opacity="0.8"/>';
  s += '<path d="M13.5 19.5 Q18.8 12.9 27 12" stroke="' + o.rimLight + '" stroke-width="1.6" fill="none" opacity="0.6"/>';
  /* derz bandı (kapak-gövde) */
  s += '<rect x="8" y="27" width="48" height="4.6" rx="2.3" fill="url(#' + o.metal + ')" ' + S15 + '/>';
  s += '<circle cx="12.5" cy="29.3" r="1" fill="' + o.stud + '"/><circle cx="51.5" cy="29.3" r="1" fill="' + o.stud + '"/>';
  /* kuşaklar: kubbe üstünden etek altına */
  for (const k of [-1, 1]) {
    const x = 32 + k * SX - 3.4;
    s += '<rect x="' + x.toFixed(1) + '" y="' + yT.toFixed(1) + '" width="6.8" height="' + (49.5 - yT).toFixed(1) + '" rx="2.6" fill="url(#' + o.metal + ')" ' + S15 + '/>';
    for (const sy of [19, 36, 45]) {
      s += '<circle cx="' + (32 + k * SX) + '" cy="' + sy + '" r="1.05" fill="' + (sy === 19 ? o.studHi : o.stud) + '"/>';
    }
  }
  /* etek + ayaklar */
  s += '<rect x="9.5" y="48.6" width="45" height="5.6" rx="2.4" fill="url(#' + o.metalDk + ')" ' + S15 + '/>';
  s += '<circle cx="15" cy="51.4" r="0.9" fill="' + o.stud + '"/><circle cx="49" cy="51.4" r="0.9" fill="' + o.stud + '"/>';
  return s;
}

/* kilit plakası (iri, referans oranında) — inner: plaka içi süs */
function lockPlate(metalId, inner) {
  return '<rect x="25.4" y="24" width="13.2" height="15" rx="3" fill="url(#' + metalId + ')" ' + S15 + '/>' +
    '<circle cx="27.8" cy="26.6" r="0.75" fill="rgba(10,12,20,0.55)"/><circle cx="36.2" cy="26.6" r="0.75" fill="rgba(10,12,20,0.55)"/>' +
    '<circle cx="27.8" cy="36.4" r="0.75" fill="rgba(10,12,20,0.55)"/><circle cx="36.2" cy="36.4" r="0.75" fill="rgba(10,12,20,0.55)"/>' +
    inner;
}
const keyhole = (glow) =>
  '<circle cx="32" cy="29.6" r="2.1" fill="#14100c"/>' +
  '<path d="M32 30.4 L33.5 35.2 H30.5 Z" fill="#14100c"/>' +
  (glow ? '<circle cx="32" cy="29.6" r="1" fill="' + glow + '"><animate attributeName="opacity" values="0.45;1;0.6;1;0.45" dur="2.6s" repeatCount="indefinite"/></circle>' : '');

/* ─────────── t1 · TAHTA — kara meşe + dövme demir ─────────── */
function t1() {
  const defs =
    lg('c1w', 'v', [['0', '#96632c'], ['0.55', '#6a4015'], ['1', '#3a2409']]) +
    lg('c1l', 'v', [['0', '#a8743a'], ['0.55', '#7a4c1a'], ['1', '#4a2c0c']]) +
    lg('c1m', 'v', [['0', '#7e8798'], ['0.5', '#525c70'], ['1', '#2c3444']]) +
    lg('c1md', 'v', [['0', '#6a7488'], ['1', '#2e3646']]) +
    rg('c1e', [['0', 'rgba(255,190,90,0.9)'], ['0.5', 'rgba(255,140,50,0.4)'], ['1', 'rgba(255,120,40,0)']]);
  return svgo(defs,
    chestBase({ wood: 'c1w', lid: 'c1l', metal: 'c1m', metalDk: 'c1md', plank: '#33200a', rimLight: '#c89050', stud: '#d8e0ea', studHi: '#eef2f8' }) +
    '<circle cx="32" cy="31" r="7.5" fill="url(#c1e)">' + pulse(0.2, 0.55, 3) + '</circle>' +
    lockPlate('c1m', keyhole('#ff9a3c')) +
    '<g><circle cx="27" cy="23" r="0.9" fill="#ffb45c"><animate attributeName="opacity" values="0;0.8;0" dur="3.2s" begin="-0.5s" repeatCount="indefinite"/></circle>' +
    '<animateTransform attributeName="transform" type="translate" values="0 0;0 -8" dur="3.2s" begin="-0.5s" repeatCount="indefinite"/></g>'
  );
}

/* ─────────── t2 · GÜMÜŞ — bal meşesi + cilalı gümüş kuşaklar ─────────── */
function t2() {
  const defs =
    lg('c2w', 'v', [['0', '#b8813c'], ['0.55', '#8a5a22'], ['1', '#54350f']]) +
    lg('c2l', 'v', [['0', '#c9924a'], ['0.55', '#9a6828'], ['1', '#603d12']]) +
    lg('c2m', 'v', [['0', '#f2f7fc'], ['0.42', '#c2d0dc'], ['1', '#77879a']]) +
    lg('c2md', 'v', [['0', '#aebccb'], ['1', '#5a6a7c']]) +
    '<clipPath id="c2clip"><path d="M10 29 Q10 11.5 32 11.5 Q54 11.5 54 29 Z"/><path d="M11.5 29 H52.5 L50 51 H14 Z"/></clipPath>';
  return svgo(defs,
    chestBase({ wood: 'c2w', lid: 'c2l', metal: 'c2m', metalDk: 'c2md', plank: '#4a2f10', rimLight: '#e8c088', stud: '#f5c044', studHi: '#ffe9a8' }) +
    /* gümüş köşe mahmuzları */
    '<path d="M11.5 29.5 L15 33 M52.5 29.5 L49 33" stroke="#e8f0f8" stroke-width="2.2" stroke-linecap="round" opacity="0.8"/>' +
    lockPlate('c2m', keyhole('#bcd8ee')) +
    /* ışık taraması */
    '<g clip-path="url(#c2clip)"><rect x="-14" y="4" width="9" height="52" fill="#ffffff" opacity="0.22" transform="skewX(-16)">' +
    '<animateTransform attributeName="transform" type="translate" values="-6 0;-6 0;86 0" keyTimes="0;0.5;1" dur="4.4s" repeatCount="indefinite" additive="sum"/></rect></g>' +
    tw(14, 13, 2.3, '#ffffff', 3.4, -0.7) + tw(50, 10, 1.9, '#e8f2fa', 4, -2.2) + tw(55, 34, 1.7, '#ffffff', 3.6, -1.3)
  );
}

/* ─────────── t3 · ALTIN — kral altını, güneş oyması, yakut mühür ─────────── */
function t3() {
  const defs =
    lg('c3w', 'v', [['0', '#f2c353'], ['0.5', '#cd8f1a'], ['1', '#7a4e08']]) +
    lg('c3l', 'v', [['0', '#ffd97a'], ['0.5', '#dc9e24'], ['1', '#8a5a0c']]) +
    lg('c3m', 'v', [['0', '#ffeead'], ['0.55', '#f2bb40'], ['1', '#a87818']]) +
    lg('c3md', 'v', [['0', '#a87422'], ['1', '#5e3c0a']]) +
    rg('c3rg', [['0', 'rgba(255,120,140,0.9)'], ['0.55', 'rgba(255,60,90,0.4)'], ['1', 'rgba(255,60,90,0)']]) +
    '<clipPath id="c3clip"><path d="M10 29 Q10 11.5 32 11.5 Q54 11.5 54 29 Z"/><path d="M11.5 29 H52.5 L50 51 H14 Z"/></clipPath>';
  /* kapakta güneş oyması */
  let rays = '';
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    const x1 = (32 + Math.cos(a) * 4.6).toFixed(1), y1 = (19 + Math.sin(a) * 4).toFixed(1);
    const x2 = (32 + Math.cos(a) * (i % 2 ? 6.6 : 8.4)).toFixed(1), y2 = (19 + Math.sin(a) * (i % 2 ? 5.6 : 7.2)).toFixed(1);
    rays += 'M' + x1 + ' ' + y1 + ' L' + x2 + ' ' + y2 + ' ';
  }
  return svgo(defs,
    chestBase({ wood: 'c3w', lid: 'c3l', metal: 'c3m', metalDk: 'c3md', plank: '#7a4e08', rimLight: '#ffefb8', stud: '#7a4e08', studHi: '#ffd8dd' }) +
    '<path d="' + rays + '" stroke="#7a4e08" stroke-width="1.5" stroke-linecap="round" fill="none"/>' +
    '<ellipse cx="32" cy="19" rx="3.4" ry="3" fill="none" stroke="#7a4e08" stroke-width="1.5"/>' +
    '<path d="' + rays + '" stroke="#ffe9a8" stroke-width="0.8" stroke-linecap="round" fill="none">' + pulse(0.2, 0.8, 3) + '</path>' +
    /* gövde filigran kıvrımları */
    '<path d="M17 39 C19.5 36.2 22.5 36.2 24.5 39 M47 39 C44.5 36.2 41.5 36.2 39.5 39" stroke="#7a4e08" stroke-width="1.4" fill="none"/>' +
    '<circle cx="32" cy="32" r="8" fill="url(#c3rg)">' + pulse(0.25, 0.6, 2.6) + '</circle>' +
    /* kalkan plakası + yakut */
    '<path d="M26 24.5 H38 V30.5 Q38 35.6 32 38 Q26 35.6 26 30.5 Z" fill="url(#c3m)" ' + S15 + '/>' +
    '<path d="M32 26.8 L35 30.4 L32 34 L29 30.4 Z" fill="#ff2440" ' + S1 + '/>' +
    '<path d="M32 27.9 L33.7 30 L32 30.9 L30.3 30 Z" fill="#ffb8c2" opacity="0.9"/>' +
    '<g clip-path="url(#c3clip)"><rect x="-14" y="0" width="10" height="58" fill="#fff6d8" opacity="0.32" transform="skewX(-16)">' +
    '<animateTransform attributeName="transform" type="translate" values="-6 0;-6 0;86 0" keyTimes="0;0.42;1" dur="3.8s" repeatCount="indefinite" additive="sum"/></rect></g>' +
    tw(10, 12, 2.6, '#fff2c4', 3, -0.8) + tw(54, 15, 2.2, '#ffe9a8', 3.8, -2.4) + tw(43, 6, 1.8, '#ffffff', 3.4, -1.5)
  );
}

/* ─────────── t4 · BÜYÜLÜ — açık mor: atan ametist kalp, kristal filizler ─────────── */
function t4() {
  const defs =
    lg('c4w', 'v', [['0', '#4a3a72'], ['0.5', '#31234f'], ['1', '#1c1232']]) +
    lg('c4l', 'v', [['0', '#584689'], ['0.5', '#3a2a5e'], ['1', '#241740']]) +
    lg('c4m', 'v', [['0', '#6a5f94'], ['0.5', '#453a68'], ['1', '#292040']]) +
    lg('c4md', 'v', [['0', '#453a68'], ['1', '#221a3c']]) +
    lg('c4c', 'v', [['0', '#efe0ff'], ['0.45', '#b47af8'], ['1', '#6a24c0']]) +
    rg('c4g', [['0', 'rgba(215,155,255,0.95)'], ['0.5', 'rgba(185,110,255,0.42)'], ['1', 'rgba(185,110,255,0)']]);
  return svgo(defs,
    /* kapak üstü kristal filizler (tabandan çizilir ki kapak arkada kalsın) */
    '<ellipse cx="32" cy="12" rx="14" ry="5.5" fill="url(#c4g)">' + pulse(0.3, 0.6, 2.8) + '</ellipse>' +
    '<g transform="translate(24 14) rotate(-16)"><path d="M0 -10.5 L3.9 0 H-3.9 Z" fill="url(#c4c)" ' + S15 + '/><path d="M-1.2 -7.5 L-2.2 -1.2" stroke="#f0e0ff" stroke-width="1"/></g>' +
    '<g transform="translate(40.5 14.5) rotate(14)"><path d="M0 -9 L3.5 0 H-3.5 Z" fill="url(#c4c)" ' + S15 + '/></g>' +
    '<path d="M32 0.6 L36.6 13.5 H27.4 Z" fill="url(#c4c)" ' + S15 + '/>' +
    '<path d="M30.4 4.5 L29.2 11.8" stroke="#f4e8ff" stroke-width="1.2"/>' +
    chestBase({ wood: 'c4w', lid: 'c4l', metal: 'c4m', metalDk: 'c4md', plank: '#241844', rimLight: '#8e7ec0', stud: '#cf9aff', studHi: '#efe0ff' }) +
    /* gövde enerji derzleri */
    '<path d="M20 33 L23.5 38 L21.5 45 M44 33 L40.5 38.5 L42.5 45" fill="none" stroke="#e2b8ff" stroke-width="1.3" stroke-linecap="round"><animate attributeName="opacity" values="0.15;0.85;0.3;0.9;0.15" dur="3.4s" repeatCount="indefinite"/></path>' +
    /* atan ametist kalp */
    '<circle cx="32" cy="32" r="8" fill="url(#c4g)"><animate attributeName="r" values="7.5;10;7.5" dur="1.6s" repeatCount="indefinite"/>' + pulse(0.55, 0.2, 1.6) + '</circle>' +
    '<circle cx="32" cy="32" r="6.6" fill="none" stroke="url(#c4m)" stroke-width="3"/>' +
    '<circle cx="32" cy="32" r="6.6" fill="none" ' + S1 + ' opacity="0.7"/>' +
    '<path d="M32 26.8 L36.4 32 L32 37.2 L27.6 32 Z" fill="url(#c4c)" ' + S15 + '/>' +
    '<path d="M32 28.5 L34.5 31.4 L32 32.8 L29.5 31.4 Z" fill="#f0e2ff" opacity="0.9"/>' +
    /* süzülen kıymıklar */
    '<g><path d="M6.5 30 L8.4 32.4 L6.5 34.8 L4.6 32.4 Z" fill="url(#c4c)" ' + S1 + ' opacity="0.9"/>' + bob(3, 3.2, -0.6) + '</g>' +
    '<g><path d="M58 25 L59.7 27.2 L58 29.4 L56.3 27.2 Z" fill="url(#c4c)" ' + S1 + ' opacity="0.85"/>' + bob(2.6, 4, -1.8) + '</g>' +
    tw(13, 9, 2.4, '#e2b8ff', 3, -1) + tw(51, 7, 2.6, '#f4e8ff', 3.6, -2.5) + tw(58, 44, 1.8, '#cf8aff', 2.8, -0.2)
  );
}

/* ─────────── t5 · BUZUL — don çeliği, derzden taşan buz kristalleri ─────────── */
function t5() {
  const defs =
    lg('c5w', 'v', [['0', '#4a6a88'], ['0.5', '#31506a'], ['1', '#1a2f44']]) +
    lg('c5l', 'v', [['0', '#587a98'], ['0.5', '#3a5a78'], ['1', '#22384e']]) +
    lg('c5m', 'v', [['0', '#dceaf4'], ['0.45', '#a8c4d8'], ['1', '#5c7890']]) +
    lg('c5md', 'v', [['0', '#8aa6bc'], ['1', '#43596c']]) +
    lg('c5i', 'v', [['0', '#f0fbff'], ['0.5', '#8fd8ff'], ['1', '#3a8ac8']]) +
    rg('c5g', [['0', 'rgba(150,225,255,0.9)'], ['0.5', 'rgba(115,195,255,0.4)'], ['1', 'rgba(115,195,255,0)']]);
  /* derzden taşan kristal sırası */
  let seamIce = '';
  for (const [x, h, w2] of [[14, 4.5, 2.6], [20, 6.5, 3], [27, 5, 2.6], [37, 6, 3], [44, 4.5, 2.4], [50, 5.5, 2.8]]) {
    seamIce += '<path d="M' + (x - w2) + ' 28.6 L' + x + ' ' + (28.6 - h) + ' L' + (x + w2) + ' 28.6 Z" fill="url(#c5i)" ' + S1 + '/>';
  }
  return svgo(defs,
    '<circle cx="32" cy="26" r="17" fill="url(#c5g)">' + pulse(0.18, 0.42, 3) + '</circle>' +
    chestBase({ wood: 'c5w', lid: 'c5l', metal: 'c5m', metalDk: 'c5md', plank: '#16283a', rimLight: '#b8dcee', stud: '#e8f6fc', studHi: '#ffffff' }) +
    /* kapakta buz oyması */
    '<g stroke="#8fdcff" stroke-width="1.3" fill="none" stroke-linecap="round"><path d="M29 19 H35 M32 16 V22 M30 17 L34 21 M34 17 L30 21">' + pulse(0.3, 0.9, 3) + '</path></g>' +
    /* derz kristalleri */
    seamIce +
    /* gövdeden sarkan buz sarkıtları */
    '<path d="M15 31.5 L17 39 L19 31.5 Z" fill="url(#c5i)" opacity="0.95" ' + S1 + '/>' +
    '<path d="M45 31.5 L47 37.5 L49 31.5 Z" fill="url(#c5i)" opacity="0.9" ' + S1 + '/>' +
    /* gövde buz glifleri */
    '<g stroke="#8fdcff" stroke-width="1.5" fill="none" stroke-linecap="round">' +
      '<path d="M18 40 Q21.5 36.8 25 40 M39 40 Q42.5 36.8 46 40">' + pulse(0.25, 0.7, 3.2, -1.2) + '</path>' +
    '</g>' +
    '<circle cx="32" cy="32.5" r="7.5" fill="url(#c5g)">' + pulse(0.3, 0.75, 2.4) + '</circle>' +
    /* altıgen çerçeveli buz mücevheri */
    '<path d="M26.8 27.8 H37.2 L39.6 32.2 L37.2 36.6 H26.8 L24.4 32.2 Z" fill="url(#c5m)" ' + S15 + '/>' +
    '<path d="M32 28.2 L35.6 32.2 L32 36.2 L28.4 32.2 Z" fill="url(#c5i)" ' + S1 + '/>' +
    '<path d="M32 29.4 L33.9 31.6 L32 32.6 L30.1 31.6 Z" fill="#eafaff" opacity="0.9"/>' +
    tw(13, 12, 2.6, '#eafaff', 3.2, -0.6) + tw(50, 9, 2.2, '#bfe8ff', 4, -2.2) + tw(56, 33, 1.8, '#ffffff', 3.6, -1.4) +
    /* soğuk buhar */
    '<g><ellipse cx="24" cy="24" rx="2.4" ry="1" fill="#cfeeff" opacity="0"><animate attributeName="opacity" values="0;0.5;0" dur="3.6s" begin="-1s" repeatCount="indefinite"/></ellipse>' +
    '<animateTransform attributeName="transform" type="translate" values="0 0;3 -7" dur="3.6s" begin="-1s" repeatCount="indefinite"/></g>'
  );
}

/* ─────────── t6 · MİSTİK — koyu mor: kara ahşap, derzlerden sızan büyü ─────────── */
function t6() {
  const defs =
    lg('c6w', 'v', [['0', '#463060'], ['0.5', '#2e1d46'], ['1', '#190e2c']]) +
    lg('c6l', 'v', [['0', '#54396e'], ['0.5', '#382250'], ['1', '#1f1234']]) +
    lg('c6m', 'v', [['0', '#4c4258'], ['0.5', '#332c40'], ['1', '#1c1826']]) +
    lg('c6md', 'v', [['0', '#332c40'], ['1', '#171320']]) +
    rg('c6i', [['0', '#e6ccff'], ['0.45', '#b465ff'], ['1', '#5c14a8']]) +
    rg('c6gl', [['0', 'rgba(180,101,255,0.8)'], ['0.5', 'rgba(160,80,255,0.34)'], ['1', 'rgba(160,80,255,0)']]);
  return svgo(defs,
    '<ellipse cx="32" cy="54.5" rx="17" ry="2.6" fill="none" stroke="#b465ff" stroke-width="1">' + pulse(0.12, 0.45, 4) + '</ellipse>' +
    chestBase({ wood: 'c6w', lid: 'c6l', metal: 'c6m', metalDk: 'c6md', plank: '#120a20', rimLight: '#7a5f9e', stud: '#b465ff', studHi: '#e6ccff' }) +
    /* kalas derzlerinden SIZAN mor ışık — imza detay */
    '<g stroke="#c98fff" stroke-linecap="round" fill="none">' +
      '<path d="M22 30.5 L22.7 50" stroke-width="1.8">' + pulse(0.15, 0.8, 2.6) + '</path>' +
      '<path d="M42 30.5 L41.3 50" stroke-width="1.8">' + pulse(0.15, 0.8, 2.6, -1.3) + '</path>' +
      '<path d="M22 14.2 Q21.2 20.8 21.4 27" stroke-width="1.6">' + pulse(0.1, 0.7, 3.2, -0.6) + '</path>' +
      '<path d="M42 14.2 Q42.8 20.8 42.6 27" stroke-width="1.6">' + pulse(0.1, 0.7, 3.2, -2) + '</path>' +
    '</g>' +
    /* derz bandının altından taşan ışık */
    '<rect x="10" y="27.8" width="44" height="1.6" rx="0.8" fill="#c98fff" opacity="0.2"><animate attributeName="opacity" values="0.1;0.55;0.1" dur="3s" repeatCount="indefinite"/></rect>' +
    /* gövde rün glifleri */
    '<g stroke="#c98fff" stroke-width="1.4" fill="none" stroke-linecap="round">' +
      '<path d="M17.5 36 L19 39 L17.5 42 M18 39 H20.4">' + pulse(0.2, 0.9, 2.2) + '</path>' +
      '<path d="M46.5 36 L45 39 L46.5 42 M46 39 H43.6">' + pulse(0.2, 0.9, 2.2, -1.1) + '</path>' +
    '</g>' +
    '<circle cx="32" cy="32" r="9" fill="url(#c6gl)">' + pulse(0.3, 0.7, 2.8) + '</circle>' +
    /* mühür: karanlık göz taşı */
    lockPlate('c6m',
      '<circle cx="32" cy="31.5" r="4.6" fill="url(#c6i)" ' + S1 + '/>' +
      '<ellipse cx="32" cy="31.5" rx="1.5" ry="2.9" fill="#180826"><animate attributeName="rx" values="1.5;0.8;1.5" dur="5s" repeatCount="indefinite"/></ellipse>' +
      '<circle cx="30.6" cy="29.9" r="0.85" fill="#ffffff" opacity="0.9"/>') +
    /* süzülen rün taşı */
    '<g><path d="M58 27 L59.8 29.4 L58 31.8 L56.2 29.4 Z" fill="url(#c6i)" ' + S1 + ' opacity="0.9"/>' + bob(2.8, 3.6, -0.9) + '</g>' +
    '<g><path d="M6 33 L7.6 35.2 L6 37.4 L4.4 35.2 Z" fill="url(#c6i)" ' + S1 + ' opacity="0.85"/>' + bob(2.4, 4.2, -2.2) + '</g>' +
    tw(9, 13, 2.4, '#dfb8ff', 3, -0.7) + tw(55, 12, 2.4, '#efe0ff', 3.6, -2) + tw(59, 45, 1.7, '#c98fff', 3.2, -1.3)
  );
}

/* ─────────── t7 · EJDERHA — kızıl pul zırh, kara demir dikenler, ejder başı ─────────── */
function t7() {
  const defs =
    lg('c7w', 'v', [['0', '#a8323a'], ['0.5', '#7a1c24'], ['1', '#420d14']]) +
    lg('c7l', 'v', [['0', '#b83c42'], ['0.5', '#88222a'], ['1', '#4c1017']]) +
    lg('c7m', 'v', [['0', '#565060'], ['0.5', '#3a3440'], ['1', '#201c26']]) +
    lg('c7md', 'v', [['0', '#3a3440'], ['1', '#191620']]) +
    lg('c7h', 'v', [['0', '#5c5666'], ['0.5', '#403a4a'], ['1', '#262230']]) +
    rg('c7e', [['0', 'rgba(255,120,70,0.95)'], ['0.5', 'rgba(255,80,50,0.45)'], ['1', 'rgba(255,80,50,0)']]);
  /* gövde pul dokusu: bindirmeli yarım daireler */
  let scales = '';
  for (let r = 0; r < 4; r++) {
    const y = 33.5 + r * 4.6;
    for (let i = 0; i < 7; i++) {
      const x = 16 + i * 5.2 + (r % 2 ? 2.6 : 0);
      if (x < 15 || x > 49) continue;
      scales += 'M' + (x - 2.5) + ' ' + y + ' Q' + x + ' ' + (y + 3.4) + ' ' + (x + 2.5) + ' ' + y + ' ';
    }
  }
  /* kapak pulları (kavise oturur) */
  let lidScales = '';
  for (const [x, y] of [[24, 20], [32, 18.6], [40, 20], [20, 25], [28, 24], [36, 24], [44, 25]]) {
    lidScales += 'M' + (x - 2.6) + ' ' + y + ' Q' + x + ' ' + (y + 3.6) + ' ' + (x + 2.6) + ' ' + y + ' ';
  }
  /* kuşak dikenleri */
  const spike = (x, y, k) => '<path d="M' + x + ' ' + y + ' L' + (x + 2.4 * k) + ' ' + (y - 4.6) + ' L' + (x + 4.8 * k) + ' ' + y + ' Z" fill="url(#c7h)" ' + S1 + '/>';
  return svgo(defs,
    '<ellipse cx="32" cy="30" rx="20" ry="14" fill="url(#c7e)">' + pulse(0.14, 0.34, 3.2) + '</ellipse>' +
    chestBase({ wood: 'c7w', lid: 'c7l', metal: 'c7m', metalDk: 'c7md', plank: '#38090f', rimLight: '#d86a5c', stud: '#c8323a', studHi: '#ff7a5c' }) +
    /* pul zırh dokusu */
    '<path d="' + scales + '" stroke="#38090f" stroke-width="1.2" fill="none" opacity="0.9"/>' +
    '<path d="' + lidScales + '" stroke="#38090f" stroke-width="1.1" fill="none" opacity="0.85"/>' +
    /* derz bandı dikenleri */
    spike(12, 27.2, 1) + spike(21.5, 27.2, 1) + spike(37.5, 27.2, 1) + spike(47, 27.2, 1) +
    /* etek dikenleri */
    '<path d="M13 48.8 L15.5 44.5 L18 48.8 Z M46 48.8 L48.5 44.5 L51 48.8 Z" fill="url(#c7h)" ' + S1 + '/>' +
    /* ═ EJDER BAŞI (kapak tepesinde, öne bakar) ═ */
    '<g>' +
      /* boynuzlar */
      '<path d="M24.5 8.5 C21.5 6 20 2.8 21.5 0.6 C23.5 3 26 4.4 28.5 5.2 Z" fill="url(#c7h)" ' + S15 + '/>' +
      '<path d="M39.5 8.5 C42.5 6 44 2.8 42.5 0.6 C40.5 3 38 4.4 35.5 5.2 Z" fill="url(#c7h)" ' + S15 + '/>' +
      /* kafa */
      '<path d="M23.5 9.5 Q23.5 4.4 32 4.4 Q40.5 4.4 40.5 9.5 L39.5 13.5 Q36 15.8 32 15.8 Q28 15.8 24.5 13.5 Z" fill="url(#c7l)" ' + S2 + '/>' +
      /* alın pulu + kaş çıkıntısı */
      '<path d="M29 6.2 Q32 4.8 35 6.2 L32 8.4 Z" fill="#5c1219" ' + S1 + '/>' +
      '<path d="M25.5 8.8 L29.5 8 M38.5 8.8 L34.5 8" stroke="#38090f" stroke-width="1.6" stroke-linecap="round"/>' +
      /* GÖZLER — ışıyan kor */
      '<circle cx="27.8" cy="10" r="2" fill="url(#c7e)"/>' +
      '<circle cx="36.2" cy="10" r="2" fill="url(#c7e)"/>' +
      '<circle cx="27.8" cy="10" r="1.15" fill="#ff5a3c"><animate attributeName="opacity" values="0.6;1;0.7;1;0.6" dur="2.4s" repeatCount="indefinite"/></circle>' +
      '<circle cx="36.2" cy="10" r="1.15" fill="#ff5a3c"><animate attributeName="opacity" values="0.6;1;0.7;1;0.6" dur="2.4s" begin="-1.2s" repeatCount="indefinite"/></circle>' +
      /* burun + burun delikleri + diş */
      '<path d="M28.5 13 Q32 14.6 35.5 13" stroke="#38090f" stroke-width="1.3" fill="none" stroke-linecap="round"/>' +
      '<circle cx="30.4" cy="13.1" r="0.6" fill="#2a060b"/><circle cx="33.6" cy="13.1" r="0.6" fill="#2a060b"/>' +
      '<path d="M27 14.2 L28 16 L29 14.4 M35 14.4 L36 16 L37 14.2" fill="none" stroke="#e8e4d8" stroke-width="1.1" stroke-linecap="round"/>' +
    '</g>' +
    /* kilit: kara demir + kor elmas */
    lockPlate('c7m',
      '<path d="M32 26.6 L35.4 31.5 L32 36.4 L28.6 31.5 Z" fill="#ff5a3c" ' + S1 + '><animate attributeName="opacity" values="0.75;1;0.75" dur="2s" repeatCount="indefinite"/></path>' +
      '<path d="M32 28.4 L33.6 30.8 L32 31.8 L30.4 30.8 Z" fill="#ffd0a8" opacity="0.9"/>') +
    /* yükselen kor zerreleri */
    '<g><circle cx="20" cy="26" r="1" fill="#ff9a5c"><animate attributeName="opacity" values="0;0.9;0" dur="2.8s" begin="-0.4s" repeatCount="indefinite"/></circle>' +
    '<animateTransform attributeName="transform" type="translate" values="0 0;-2 -10" dur="2.8s" begin="-0.4s" repeatCount="indefinite"/></g>' +
    '<g><circle cx="45" cy="24" r="0.85" fill="#ff7a3c"><animate attributeName="opacity" values="0;0.85;0" dur="3.4s" begin="-1.8s" repeatCount="indefinite"/></circle>' +
    '<animateTransform attributeName="transform" type="translate" values="0 0;2 -9" dur="3.4s" begin="-1.8s" repeatCount="indefinite"/></g>' +
    tw(11, 16, 2, '#ffb08a', 3.4, -1) + tw(54, 18, 1.8, '#ff8a5c', 3.8, -2.4)
  );
}

const BUILDERS = [null, t1, t2, t3, t4, t5, t6, t7];
const CACHE = {};

/** Kademeye göre sandık glifi (SVG dizesi) — sonuç önbelleklenir. */
export function chestArt(tier) {
  const t = Math.min(7, Math.max(1, tier | 0));
  if (!CACHE[t]) CACHE[t] = BUILDERS[t]();
  return CACHE[t];
}

/* ── v54 E6: 3B SANDIK PALETİ (chestModel3d okur). Değerler yukarıdaki tN()
   gradyan duraklarıyla AYNI olmalı; gradyan değişirse burası da değişir —
   iki dosyada ayrı kopya artık YOK. ── */
export const CHEST_PAL = {
  1: { wood: [[0, '#96632c'], [0.55, '#6a4015'], [1, '#3a2409']], lid: [[0, '#a8743a'], [0.55, '#7a4c1a'], [1, '#4a2c0c']],
       metal: ['#7e8798', '#525c70', '#2c3444'], metalDk: ['#6a7488', '#2e3646'], plank: '#33200a', rim: '#c89050',
       stud: '#d8e0ea', studHi: '#eef2f8', glow: '#ffbe5a', key: '#ff9a3c' },
  2: { wood: [[0, '#b8813c'], [0.55, '#8a5a22'], [1, '#54350f']], lid: [[0, '#c9924a'], [0.55, '#9a6828'], [1, '#603d12']],
       metal: ['#f2f7fc', '#c2d0dc', '#77879a'], metalDk: ['#aebccb', '#5a6a7c'], plank: '#4a2f10', rim: '#e8c088',
       stud: '#f5c044', studHi: '#ffe9a8', glow: '#dce8f2', key: '#bcd8ee', spur: '#e8f0f8', sheen: [0xffffff, 0.22, 4.4, 0.5] },
  3: { wood: [[0, '#f2c353'], [0.5, '#cd8f1a'], [1, '#7a4e08']], lid: [[0, '#ffd97a'], [0.5, '#dc9e24'], [1, '#8a5a0c']],
       metal: ['#ffeead', '#f2bb40', '#a87818'], metalDk: ['#a87422', '#5e3c0a'], plank: '#7a4e08', rim: '#ffefb8',
       stud: '#7a4e08', studHi: '#ffd8dd', glow: '#ff788c', gem: '#ff2440', line: '#ffe9a8', sheen: [0xfff6d8, 0.32, 3.8, 0.42] },
  4: { wood: [[0, '#4a3a72'], [0.5, '#31234f'], [1, '#1c1232']], lid: [[0, '#584689'], [0.5, '#3a2a5e'], [1, '#241740']],
       metal: ['#6a5f94', '#453a68', '#292040'], metalDk: ['#453a68', '#221a3c'], plank: '#241844', rim: '#8e7ec0',
       stud: '#cf9aff', studHi: '#efe0ff', glow: '#d79bff', line: '#e2b8ff', crystal: ['#efe0ff', '#b47af8', '#6a24c0'] },
  5: { wood: [[0, '#4a6a88'], [0.5, '#31506a'], [1, '#1a2f44']], lid: [[0, '#587a98'], [0.5, '#3a5a78'], [1, '#22384e']],
       metal: ['#dceaf4', '#a8c4d8', '#5c7890'], metalDk: ['#8aa6bc', '#43596c'], plank: '#16283a', rim: '#b8dcee',
       stud: '#e8f6fc', studHi: '#ffffff', glow: '#96e1ff', line: '#8fdcff', crystal: ['#f0fbff', '#8fd8ff', '#3a8ac8'] },
  6: { wood: [[0, '#463060'], [0.5, '#2e1d46'], [1, '#190e2c']], lid: [[0, '#54396e'], [0.5, '#382250'], [1, '#1f1234']],
       metal: ['#4c4258', '#332c40', '#1c1826'], metalDk: ['#332c40', '#171320'], plank: '#120a20', rim: '#7a5f9e',
       stud: '#b465ff', studHi: '#e6ccff', glow: '#b465ff', line: '#c98fff', crystal: ['#e6ccff', '#b465ff', '#5c14a8'] },
  7: { wood: [[0, '#a8323a'], [0.5, '#7a1c24'], [1, '#420d14']], lid: [[0, '#b83c42'], [0.5, '#88222a'], [1, '#4c1017']],
       metal: ['#565060', '#3a3440', '#201c26'], metalDk: ['#3a3440', '#191620'], plank: '#38090f', rim: '#d86a5c',
       stud: '#c8323a', studHi: '#ff7a5c', glow: '#ff7846', gem: '#ff5a3c', horn: ['#5c5666', '#403a4a', '#262230'] },
};
