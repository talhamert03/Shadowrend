/* ═══════════════════════════════════════════════════════════
   chestModel3d.js — 3B SANDIK MODELİ v7 (2026-09-25)
   Mağaza vitrin glifinin (chestArt.js v8) 3B karşılığı.

   SÖZLEŞME: 1 glif birimi = 1 dünya birimi. X = x − 32, Y = 54,2 − y
   (54,2 = etek altı = zemin). Böylece ön ortografik görünüş glifle
   ÇAKIŞIR ve yüzey süsleri (kalas, pul, güneş, rün) glifin KENDİ path
   dizeleriyle (Path2D) doğrudan dokuya boyanır — UV'ler ön izdüşümdür.
   Çıkıntılı her parça (bant, kuşak, kilit, kabara, diken, kristal, ejder
   başı) gerçek geometridir; mürekkep kontur = birleşik ters kabuk (grup
   başına 1 çizim çağrısı).
   Renkler chestArt.js tN() gradyan duraklarının birebir kopyası (PAL).
   ═══════════════════════════════════════════════════════════ */

import * as THREE from 'three';
import { mergeGeometries, toCreasedNormals } from 'three/addons/utils/BufferGeometryUtils.js';
import { Quality } from './perf.js?v=20260930m';
import { CHEST_PAL as PAL } from './chestArt.js?v=20260930m';

/* ── PALET: v54 E6 — TEK KAYNAK artık chestArt.js (CHEST_PAL). Vitrin glifi ve 3B
   model aynı nesneyi okur; renk değişikliği tek yerde yapılır. */

export const CHEST_GLOW = (tier) => (PAL[tier] || PAL[1]).glow;

/* ── ÖLÇÜ (chestArt.chestBase) ── */
const GROUND = 54.2;
const wy = (y) => GROUND - y;
const DK = 30 / 41;                                  // 3B derinlik/en (glif derinlik taşımaz)
const hwAt = (Y) => 18 + 2.5 * (Y - 3.2) / 22;       // trapez gövde: alt 36 → üst 41
const hdAt = (Y) => hwAt(Y) * DK;
const BODY_NZ = new THREE.Vector3(0, -2.5 / 22 * DK, 1).normalize();
const BAND_Y0 = wy(31.6), BAND_Y1 = wy(27);          // 22,6 · 27,2
const BAND_HW = 24, BAND_HD = hdAt(25.2) + 3.5;      // 18,5
const SKIRT_HW = 22.5, SKIRT_HD = hdAt(3.2) + 4.5;   // 17,7
const RIM = BAND_Y1, DH = wy(11.5) - RIM;            // 27,2 · 15,5
const T0 = 1 - Math.sqrt(DH / 17.5), K2 = 1 - T0 * T0, K1 = (1 - T0) * (1 - T0);
const LID_HW = 22 * K2;                              // 21,92
const LID_HD = hdAt(25.2) + (LID_HW - 20.5);
const HINGE_Y = RIM - 1.2;                           // kapak dudağı bandın içinde saklı
const STRAP_X = 12, STRAP_HW = 3.4, STRAP_T = 1.3;
const PLATE_Z0 = BAND_HD - 0.1, PLATE_Z1 = PLATE_Z0 + 2.4;
export const CHEST_DIM = { mouthY: RIM, bandHW: BAND_HW, lidHD: LID_HD, hingeY: HINGE_Y, plateZ: PLATE_Z1 };

/* kapak = glifin fıçı eğrisi (M10 29 Q10 11.5 32 11.5) iki eksende çarpım yastık */
const pT = (t) => 1 - (1 - t) * (1 - t) / K1;
const sT = (t) => (1 - t * t) / K2;
const Ps = (s) => { s = Math.min(1, Math.abs(s)); return pT(Math.sqrt(1 - s * K2)); };
const lidY = (x, z) => RIM + DH * Ps(x / LID_HW) * Ps(z / LID_HD);
const _n = new THREE.Vector3();
function lidN(x, z, out) {
  const e = 0.03;
  x = Math.max(-LID_HW + e, Math.min(LID_HW - e, x));
  z = Math.max(-LID_HD + e, Math.min(LID_HD - e, z));
  const dx = (lidY(x + e, z) - lidY(x - e, z)) / (2 * e);
  const dz = (lidY(x, z + e) - lidY(x, z - e)) / (2 * e);
  return out.set(-dx, 1, -dz).normalize();
}
/** kapak ön yüzünde glif yüksekliği y'ye denk gelen z (x sabit) */
function lidZAt(x, y) {
  const p = Math.min(0.999, (wy(y) - RIM) / (DH * Ps(x / LID_HW)));
  const t = 1 - (1 - T0) * Math.sqrt(1 - p);
  return sT(t) * LID_HD;
}

/* ── glif süsleri (chestArt.js v8 path dizeleri) ── */
const D = {
  planksBody: 'M22 30 L22.7 50.5 M32 30 V50.5 M42 30 L41.3 50.5',
  planksLid: 'M22 13.7 Q21.2 20.6 21.4 27.5 M32 11.5 V27.5 M42 13.7 Q42.8 20.6 42.6 27.5',
  filigree: 'M17 39 C19.5 36.2 22.5 36.2 24.5 39 M47 39 C44.5 36.2 41.5 36.2 39.5 39',
  shield: 'M26 24.5 H38 V30.5 Q38 35.6 32 38 Q26 35.6 26 30.5 Z',
  veins: 'M20 33 L23.5 38 L21.5 45 M44 33 L40.5 38.5 L42.5 45',
  snow: 'M29 19 H35 M32 16 V22 M30 17 L34 21 M34 17 L30 21',
  iceArcs: 'M18 40 Q21.5 36.8 25 40 M39 40 Q42.5 36.8 46 40',
  hex: 'M26.8 27.8 H37.2 L39.6 32.2 L37.2 36.6 H26.8 L24.4 32.2 Z',
  leakBody: 'M22 30.5 L22.7 50 M42 30.5 L41.3 50',
  leakLid: 'M22 14.2 Q21.2 20.8 21.4 27 M42 14.2 Q42.8 20.8 42.6 27',
  runes: 'M17.5 36 L19 39 L17.5 42 M18 39 H20.4 M46.5 36 L45 39 L46.5 42 M46 39 H43.6',
  head: 'M23.5 9.5 Q23.5 4.4 32 4.4 Q40.5 4.4 40.5 9.5 L39.5 13.5 Q36 15.8 32 15.8 Q28 15.8 24.5 13.5 Z',
  horn: 'M24.5 8.5 C21.5 6 20 2.8 21.5 0.6 C23.5 3 26 4.4 28.5 5.2 Z',
  brow: 'M29 6.2 Q32 4.8 35 6.2 L32 8.4 Z',
};
function sunRays() {
  let r = '';
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    r += 'M' + (32 + Math.cos(a) * 4.6).toFixed(1) + ' ' + (19 + Math.sin(a) * 4).toFixed(1) +
      ' L' + (32 + Math.cos(a) * (i % 2 ? 6.6 : 8.4)).toFixed(1) + ' ' + (19 + Math.sin(a) * (i % 2 ? 5.6 : 7.2)).toFixed(1) + ' ';
  }
  return r;
}
function dragonScales() {
  let s = '';
  for (let r = 0; r < 4; r++) {
    const y = 33.5 + r * 4.6;
    for (let i = 0; i < 7; i++) {
      const x = 16 + i * 5.2 + (r % 2 ? 2.6 : 0);
      if (x < 15 || x > 49) continue;
      s += 'M' + (x - 2.5) + ' ' + y + ' Q' + x + ' ' + (y + 3.4) + ' ' + (x + 2.5) + ' ' + y + ' ';
    }
  }
  return s;
}
function dragonLidScales() {
  let s = '';
  for (const [x, y] of [[24, 20], [32, 18.6], [40, 20], [20, 25], [28, 24], [36, 24], [44, 25]]) {
    s += 'M' + (x - 2.6) + ' ' + y + ' Q' + x + ' ' + (y + 3.6) + ' ' + (x + 2.6) + ' ' + y + ' ';
  }
  return s;
}

/* ── SVG path → THREE.Shape (yalnız mutlak M L H V Q C Z) ── */
function shapeOf(d, ox, oy, sx = 1) {
  const sh = new THREE.Shape();
  const tk = d.match(/[MLHVQCZ]|-?\d*\.?\d+/g);
  let i = 0, cx = 0, cy = 0, cmd = '';
  const X = (v) => (v - ox) * sx, Y = (v) => oy - v;
  const num = () => parseFloat(tk[i++]);
  while (i < tk.length) {
    if (/[A-Z]/.test(tk[i])) cmd = tk[i++];
    if (cmd === 'M') { cx = num(); cy = num(); sh.moveTo(X(cx), Y(cy)); cmd = 'L'; }
    else if (cmd === 'L') { cx = num(); cy = num(); sh.lineTo(X(cx), Y(cy)); }
    else if (cmd === 'H') { cx = num(); sh.lineTo(X(cx), Y(cy)); }
    else if (cmd === 'V') { cy = num(); sh.lineTo(X(cx), Y(cy)); }
    else if (cmd === 'Q') { const a = num(), b = num(); cx = num(); cy = num(); sh.quadraticCurveTo(X(a), Y(b), X(cx), Y(cy)); }
    else if (cmd === 'C') { const a = num(), b = num(), c = num(), e = num(); cx = num(); cy = num(); sh.bezierCurveTo(X(a), Y(b), X(c), Y(e), X(cx), Y(cy)); }
    else if (cmd === 'Z') { sh.closePath(); }
  }
  return sh;
}

/* ── geometri yardımcıları ── */
function rr(hw, hd, r, P) {
  P = P || new THREE.Shape();
  P.moveTo(-hw + r, -hd); P.lineTo(hw - r, -hd); P.absarc(hw - r, -hd + r, r, -Math.PI / 2, 0, false);
  P.lineTo(hw, hd - r); P.absarc(hw - r, hd - r, r, 0, Math.PI / 2, false);
  P.lineTo(-hw + r, hd); P.absarc(-hw + r, hd - r, r, Math.PI / 2, Math.PI, false);
  P.lineTo(-hw, -hd + r); P.absarc(-hw + r, -hd + r, r, Math.PI, 1.5 * Math.PI, false);
  return P;
}
/** yatay halka/levha: Y'de y0'dan h boyunda, pahlı (glifin rx'li bandı) */
function extY(shape, y0, h, bt, bs, segs) {
  const geo = new THREE.ExtrudeGeometry(shape, { depth: Math.max(0.05, h - 2 * bt), bevelEnabled: bt > 0, bevelThickness: bt, bevelSize: bs, bevelSegments: segs || 4, curveSegments: 10 });
  geo.rotateX(-Math.PI / 2);
  geo.translate(0, y0 + bt, 0);
  return toCreasedNormals(geo, 0.75);
}
/** öne bakan plaka: Z'de z0'dan d kalınlığında */
function extZ(shape, z0, d, bt, bs, segs) {
  const geo = new THREE.ExtrudeGeometry(shape, { depth: Math.max(0.05, d - 2 * bt), bevelEnabled: bt > 0, bevelThickness: bt, bevelSize: bs, bevelSegments: segs || 3, curveSegments: 12 });
  geo.translate(0, 0, z0 + bt);
  return toCreasedNormals(geo, 0.75);
}
/** normalleri dışa çevir (merkezden uzaklaşan) */
function outward(geo, cx, cy, cz) {
  geo.computeVertexNormals();
  const p = geo.attributes.position, n = geo.attributes.normal;
  let s = 0;
  for (let i = 0; i < p.count; i++) s += (p.getX(i) - cx) * n.getX(i) + (p.getY(i) - cy) * n.getY(i) + (p.getZ(i) - cz) * n.getZ(i);
  if (s < 0) {
    const ix = geo.index.array;
    for (let i = 0; i < ix.length; i += 3) { const t = ix[i + 1]; ix[i + 1] = ix[i + 2]; ix[i + 2] = t; }
    geo.index.needsUpdate = true;
    geo.computeVertexNormals();
  }
  return geo;
}
function gridGeo(rows, cols, fn) {
  const pos = new Float32Array(rows * cols * 3), uv = new Float32Array(rows * cols * 2), idx = [];
  const tmp = { x: 0, y: 0, z: 0, u: 0, v: 0 };
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    fn(r, c, tmp);
    const k = r * cols + c;
    pos[k * 3] = tmp.x; pos[k * 3 + 1] = tmp.y; pos[k * 3 + 2] = tmp.z;
    uv[k * 2] = tmp.u; uv[k * 2 + 1] = tmp.v;
    if (r < rows - 1 && c < cols - 1) { const a = k, b = k + 1, d = k + cols, e = d + 1; idx.push(a, d, b, b, d, e); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  g.setIndex(idx);
  return g;
}
const PROF_U = [-1, -0.97, -0.9, -0.76, -0.45, 0, 0.45, 0.76, 0.9, 0.97, 1];
const prof = (u) => Math.pow(Math.max(0, 1 - Math.pow(Math.abs(u), 4)), 0.25);
/* glif UV'si: kapak dokusu x 9..55 · y 11..28, gövde x 11..53 · y 28..53 */
const LT = { x0: 9, y0: 11, x1: 55, y1: 28 }, BT = { x0: 11, y0: 28, x1: 53, y1: 53 };
const uvOf = (R, X, Y, o) => { o.u = (32 + X - R.x0) / (R.x1 - R.x0); o.v = 1 - (GROUND - Y - R.y0) / (R.y1 - R.y0); };

function lidParam(i, n) {
  const f = -1 + 2 * i / n, t = T0 + (1 - T0) * (1 - Math.abs(f));
  return { s: Math.sign(f) * sT(t), p: pT(t) };
}
/** yastık kapak yüzeyi; off>0 → normal boyunca kabuk (ışıma katmanı) */
function lidGeo(off, frontOnly) {
  const NX = 44, NZ = 34, zs = [];
  for (let j = 0; j <= NZ; j++) { const q = lidParam(j, NZ); if (!frontOnly || q.s >= 0) zs.push(q); }
  const xs = []; for (let i = 0; i <= NX; i++) xs.push(lidParam(i, NX));
  const g = gridGeo(zs.length, xs.length, (r, c, o) => {
    const X = xs[c].s * LID_HW, Z = zs[r].s * LID_HD, Y = RIM + DH * xs[c].p * zs[r].p;
    uvOf(LT, X, Y, o);
    if (off) { lidN(X, Z, _n); o.x = X + _n.x * off; o.y = Y + _n.y * off; o.z = Z + _n.z * off; }
    else { o.x = X; o.y = Y; o.z = Z; }
  });
  return outward(g, 0, RIM - 12, 0);
}
/** kapak kuşağı: yüzeye oturan, kenarları yuvarlak kabarık bant */
function lidStrapGeo(cx) {
  const NZ = 36, zs = [];
  for (let j = 0; j <= NZ; j++) zs.push(lidParam(j, NZ).s * LID_HD * 0.999);
  const g = gridGeo(zs.length, PROF_U.length, (r, c, o) => {
    const u = PROF_U[c], X = cx + u * STRAP_HW, Z = zs[r];
    const Y = lidY(X, Z); lidN(X, Z, _n);
    const h = prof(u) * STRAP_T - 0.12;
    o.x = X + _n.x * h; o.y = Y + _n.y * h; o.z = Z + _n.z * h; o.u = 0; o.v = 0;
  });
  return outward(g, cx, RIM - 12, 0);
}
function bodyStrapGeo(cx, y0, y1) {
  const g = gridGeo(2, PROF_U.length, (r, c, o) => {
    const u = PROF_U[c], Y = r ? y1 : y0, h = prof(u) * STRAP_T - 0.12;
    o.x = cx + u * STRAP_HW; o.y = Y + BODY_NZ.y * h; o.z = hdAt(Y) + BODY_NZ.z * h; o.u = 0; o.v = 0;
  });
  return outward(g, cx, 12, 0);
}
function bodyGeo() {
  const pts = rr(20.5, 15, 3.6).getPoints(10);
  if (pts[0].distanceTo(pts[pts.length - 1]) < 1e-4) pts.pop();
  const n = pts.length, Y0 = 1, Y1 = BAND_Y0 + 1.2;
  const ys = [Y0, (Y0 + Y1) / 2, Y1];
  const g = gridGeo(ys.length, n + 1, (r, c, o) => {
    const p = pts[c % n], Y = ys[r], k = hwAt(Y) / 20.5;
    o.x = p.x * k; o.y = Y; o.z = -p.y * k; uvOf(BT, o.x, Y, o);
  });
  return outward(g, 0, 12, 0);
}
function hemi(r) { return new THREE.SphereGeometry(r, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2); }
const _q = new THREE.Quaternion(), _m = new THREE.Matrix4(), _up = new THREE.Vector3(0, 1, 0), _p = new THREE.Vector3(), _s = new THREE.Vector3(1, 1, 1);
function placed(geo, x, y, z, n, sc) {
  _q.setFromUnitVectors(_up, n || _up);
  _m.compose(_p.set(x, y, z), _q, sc ? _s.set(sc[0], sc[1], sc[2]) : _s.set(1, 1, 1));
  return geo.applyMatrix4(_m);
}
/** glifin 4 köşeli elmas path'inden fasetli taş (ön tepe + sığ arka) */
function gemGeo(d, depth) {
  const pts = d.match(/-?\d*\.?\d+/g).map(Number);
  const P = []; for (let i = 0; i + 1 < pts.length; i += 2) P.push([pts[i] - 32, wy(pts[i + 1])]);
  let cx = 0, cy = 0; for (const [x, y] of P) { cx += x; cy += y; } cx /= P.length; cy /= P.length;
  const v = [];
  for (let i = 0; i < P.length; i++) {
    const a = P[i], b = P[(i + 1) % P.length];
    const ia = [cx + (a[0] - cx) * 0.42, cy + (a[1] - cy) * 0.42], ib = [cx + (b[0] - cx) * 0.42, cy + (b[1] - cy) * 0.42];
    v.push(a[0], a[1], 0, b[0], b[1], 0, ib[0], ib[1], depth, a[0], a[1], 0, ib[0], ib[1], depth, ia[0], ia[1], depth);
    v.push(ia[0], ia[1], depth, ib[0], ib[1], depth, cx, cy, depth * 1.08);
    v.push(b[0], b[1], 0, a[0], a[1], 0, cx, cy, -0.4);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(v), 3));
  g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(v.length / 3 * 2), 2));
  g.computeVertexNormals();
  const n = g.attributes.normal, p = g.attributes.position;
  let s = 0; for (let i = 0; i < p.count; i++) s += (p.getX(i) - cx) * n.getX(i) + (p.getY(i) - cy) * n.getY(i) + p.getZ(i) * n.getZ(i);
  if (s < 0) { const a = p.array; for (let i = 0; i < a.length; i += 9) for (let k = 0; k < 3; k++) { const t = a[i + 3 + k]; a[i + 3 + k] = a[i + 6 + k]; a[i + 6 + k] = t; } g.computeVertexNormals(); }
  return g;
}
/** fasetli piramit (kristal/diken/buz): taban merkezde, tepe +Y; renk üst→alt */
function spikeGeo(w, h, sides, cols, jit, seed) {
  let g = new THREE.ConeGeometry(w, h, sides, 2);
  g.translate(0, h / 2, 0);
  g = g.toNonIndexed();
  const p = g.attributes.position;
  if (jit) for (let i = 0; i < p.count; i++) {
    const y = p.getY(i); if (y > h * 0.98 || y < 0.01) continue;
    const k = Math.sin(p.getX(i) * 7.1 + p.getZ(i) * 5.3 + seed) * jit;
    p.setX(i, p.getX(i) * (1 + k)); p.setZ(i, p.getZ(i) * (1 + k));
  }
  g.computeVertexNormals();
  if (cols) {
    const c = new Float32Array(p.count * 3), A = new THREE.Color(cols[0]), B = new THREE.Color(cols[1]), C = new THREE.Color(cols[2]), t = new THREE.Color();
    for (let i = 0; i < p.count; i++) {
      const f = 1 - p.getY(i) / h;
      if (f < 0.5) t.copy(A).lerp(B, f / 0.5); else t.copy(B).lerp(C, (f - 0.5) / 0.5);
      c[i * 3] = t.r; c[i * 3 + 1] = t.g; c[i * 3 + 2] = t.b;
    }
    g.setAttribute('color', new THREE.BufferAttribute(c, 3));
  }
  return g;
}

/* ── mürekkep kabuğu: pozisyonu paylaşan normallerin ortalaması boyunca itme ── */
const INK_VS = 'attribute vec3 inkN; uniform float uT; void main(){ vec3 p = position + inkN * uT; gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0); }';
const INK_FS = 'uniform vec3 uC; void main(){ gl_FragColor = vec4(uC, 1.0); }';
export function makeInkMat() {
  return new THREE.ShaderMaterial({ uniforms: { uT: { value: 0.78 }, uC: { value: new THREE.Vector3(0.039, 0.047, 0.078) } }, vertexShader: INK_VS, fragmentShader: INK_FS, side: THREE.BackSide });
}
function inkGeo(list) {
  let total = 0;
  const parts = list.map((geo) => { const g = geo.index ? geo.toNonIndexed() : geo; total += g.attributes.position.count; return g; });
  const pos = new Float32Array(total * 3), ink = new Float32Array(total * 3);
  let o = 0;
  for (const g of parts) {
    const p = g.attributes.position, n = g.attributes.normal, map = new Map();
    const key = (i) => (Math.round(p.getX(i) * 50) + 4096) * 67108864 + (Math.round(p.getY(i) * 50) + 4096) * 8192 + (Math.round(p.getZ(i) * 50) + 4096);
    for (let i = 0; i < p.count; i++) {
      const k = key(i); let a = map.get(k); if (!a) { a = [0, 0, 0]; map.set(k, a); }
      a[0] += n.getX(i); a[1] += n.getY(i); a[2] += n.getZ(i);
    }
    for (let i = 0; i < p.count; i++, o++) {
      const a = map.get(key(i)), l = Math.hypot(a[0], a[1], a[2]) || 1;
      pos[o * 3] = p.getX(i); pos[o * 3 + 1] = p.getY(i); pos[o * 3 + 2] = p.getZ(i);
      ink[o * 3] = a[0] / l; ink[o * 3 + 1] = a[1] / l; ink[o * 3 + 2] = a[2] / l;
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('inkN', new THREE.BufferAttribute(ink, 3));
  g.computeBoundingSphere();
  return g;
}

/* ── çevre haritası: üst aydınlık / alt karanlık stüdyo + dört yumuşak kutu.
   Metalin glifteki dikey gradyanı (açık üst → koyu alt) buradan doğar. ── */
export function makeEnv(renderer) {
  const s = new THREE.Scene();
  const sg = new THREE.SphereGeometry(60, 32, 16), p = sg.attributes.position;
  const c = new Float32Array(p.count * 3), top = new THREE.Color(0.95, 0.9, 1.0), hor = new THREE.Color(0.3, 0.27, 0.3), bot = new THREE.Color(0.018, 0.016, 0.02), t = new THREE.Color();
  for (let i = 0; i < p.count; i++) {
    const y = p.getY(i) / 60;
    if (y > 0) t.copy(hor).lerp(top, Math.pow(y, 0.7)); else t.copy(hor).lerp(bot, Math.pow(-y, 0.45));
    c[i * 3] = t.r; c[i * 3 + 1] = t.g; c[i * 3 + 2] = t.b;
  }
  sg.setAttribute('color', new THREE.BufferAttribute(c, 3));
  const mats = [new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide })];
  s.add(new THREE.Mesh(sg, mats[0]));
  const geos = [sg];
  for (const [x, y, z, w, h, r, g, b] of [[-34, 38, 30, 34, 22, 6, 5.3, 4.4], [46, 12, 24, 20, 30, 1.1, 1.4, 2.2], [0, 56, 0, 60, 10, 2.4, 2.3, 2.2], [0, 18, -52, 70, 12, 2.3, 1.7, 1.1], [0, -4, 52, 50, 10, 1.0, 0.82, 0.7]]) {
    const pg = new THREE.PlaneGeometry(w, h), pm = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide });
    pm.color.setRGB(r, g, b);
    const m = new THREE.Mesh(pg, pm); m.position.set(x, y, z); m.lookAt(0, 0, 0);
    s.add(m); geos.push(pg); mats.push(pm);
  }
  const pm = new THREE.PMREMGenerator(renderer);
  const rt = pm.fromScene(s, 0.035);
  pm.dispose();
  for (const g of geos) g.dispose();
  for (const m of mats) m.dispose();
  return rt;
}

/* ── glif uzayında boyanan doku ── */
function canvasFor(R, ppu) {
  const cv = document.createElement('canvas');
  cv.width = Math.round((R.x1 - R.x0) * ppu); cv.height = Math.round((R.y1 - R.y0) * ppu);
  const g = cv.getContext('2d');
  g.setTransform(ppu, 0, 0, ppu, -R.x0 * ppu, -R.y0 * ppu);
  g.lineCap = 'round'; g.lineJoin = 'round';
  return { cv, g };
}
function vgrad(g, y0, y1, stops, k) {
  const gr = g.createLinearGradient(0, y0, 0, y1), mid = new THREE.Color(stops[1][1]);
  for (const [o, c] of stops) gr.addColorStop(o, '#' + new THREE.Color(c).lerp(mid, 1 - (k == null ? 1 : k)).getHexString());
  return gr;
}
function texOf(cv, renderer, srgb = true) {
  const t = new THREE.CanvasTexture(cv);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  return t;
}
let PPU = 16;
function stroke(g, d, col, w, a, blur) {
  g.save(); g.globalAlpha = a == null ? 1 : a; g.strokeStyle = col; g.lineWidth = w;
  if (blur) { g.shadowColor = col; g.shadowBlur = blur * PPU; }
  g.stroke(new Path2D(d)); g.restore();
}
/** doğal lif + düğüm (yalnız ahşap kademeleri) */
function grain(g, x0, x1, y0, y1, col, seed) {
  let r = seed * 9301 + 49297;
  const rnd = () => ((r = (r * 9301 + 49297) % 233280) / 233280);
  g.save(); g.strokeStyle = col; g.lineWidth = 0.14;
  for (let i = 0; i < 70; i++) {
    const x = x0 + rnd() * (x1 - x0), w = (rnd() - 0.5) * 0.9;
    g.globalAlpha = 0.18 + rnd() * 0.22;
    g.beginPath(); g.moveTo(x, y0); g.bezierCurveTo(x + w, y0 + (y1 - y0) * 0.33, x - w, y0 + (y1 - y0) * 0.66, x + w * 0.5, y1); g.stroke();
  }
  for (let i = 0; i < 5; i++) {
    const x = x0 + 2 + rnd() * (x1 - x0 - 4), y = y0 + 2 + rnd() * (y1 - y0 - 4);
    g.globalAlpha = 0.4; g.lineWidth = 0.22;
    g.beginPath(); g.ellipse(x, y, 0.55, 0.95, 0, 0, 6.283); g.stroke();
    g.beginPath(); g.ellipse(x, y, 0.95, 1.6, 0, 0, 6.283); g.globalAlpha = 0.2; g.stroke();
  }
  g.restore();
}
function hammer(g, x0, x1, y0, y1, hi, lo, seed) {
  let r = seed * 7919 + 13;
  const rnd = () => ((r = (r * 9301 + 49297) % 233280) / 233280);
  g.save();
  for (let i = 0; i < 380; i++) {
    const x = x0 + rnd() * (x1 - x0), y = y0 + rnd() * (y1 - y0), rad = 0.25 + rnd() * 0.55;
    g.globalAlpha = 0.08 + rnd() * 0.1; g.fillStyle = rnd() < 0.5 ? hi : lo;
    g.beginPath(); g.arc(x, y, rad, 0, 6.283); g.fill();
  }
  g.restore();
}
/** kalas oluğu: koyu çizgi + ışık tarafında ince pah */
function planks(g, d, P, w) {
  stroke(g, d, P.plank, w, 0.85);
  g.save(); g.translate(0.62, 0); stroke(g, d, P.rim, 0.32, 0.28); g.restore();
}
/** kuşak/bant temas gölgesi (AO) — 3B parçaların dibine boyanır */
function contact(g, x0, x1, y0, y1, a) {
  g.save(); g.fillStyle = 'rgba(4,3,6,' + a + ')'; g.shadowColor = 'rgba(4,3,6,' + a + ')'; g.shadowBlur = 1.3 * PPU;
  g.fillRect(x0, y0, x1 - x0, y1 - y0); g.restore();
}

/* ═════════════════════ MODEL ═════════════════════ */
/**
 * @returns {{group, lidPivot, haloPos, haloR, anim(t, leak), dispose()}}
 */
export function buildChestModel(renderer, C, ink, fx) {
  const tier = Math.min(7, Math.max(1, C.tier | 0));
  const P = PAL[tier];
  const ppu = PPU = Math.max(12, Math.min(24, Math.floor(Quality.budget('texHero') / 46)));
  const texs = [], mats = [], geos = [];
  const keep = (x, arr) => { arr.push(x); return x; };
  const M = (o) => keep(new THREE.MeshStandardMaterial(o), mats);
  const col = (a, b, k) => new THREE.Color(a).lerp(new THREE.Color(b), k);

  const g = new THREE.Group();
  const lidPivot = new THREE.Group();
  lidPivot.position.set(0, HINGE_Y, -LID_HD);
  const toLid = new THREE.Matrix4().makeTranslation(0, -HINGE_Y, LID_HD);

  /* parça kovaları: (kova, materyal) → birleşik tek mesh; ink: kontura girer */
  const buckets = new Map();
  const inkBody = [], inkLid = [];
  const add = (geo, mat, lid, noInk) => {
    if (lid) geo.applyMatrix4(toLid);
    const k = (lid ? 'L' : 'B') + mat.uuid;
    let b = buckets.get(k); if (!b) { b = { mat, lid, list: [] }; buckets.set(k, b); }
    b.list.push(geo);
    if (!noInk) (lid ? inkLid : inkBody).push(geo);
    return geo;
  };

  /* ── materyaller ── */
  const woodTier = tier === 1 || tier === 2 || tier === 4 || tier === 6 || tier === 7;
  const metal = M({ color: col(P.metal[0], P.metal[1], tier === 3 ? 0.62 : 0.3), metalness: 0.7, roughness: tier === 1 ? 0.42 : 0.3, envMapIntensity: 1.15 });
  const metalDk = M({ color: col(P.metalDk[0], P.metalDk[1], 0.2), metalness: 0.7, roughness: 0.38, envMapIntensity: 1.1 });
  const hot = tier === 4 || tier === 6 || tier === 7;
  const studM = M({ color: P.stud, metalness: 0.5, roughness: 0.28, envMapIntensity: 1.4, emissive: hot ? P.stud : 0x000000, emissiveIntensity: hot ? 0.55 : 0 });
  const studHiM = M({ color: P.studHi, metalness: 0.45, roughness: 0.26, envMapIntensity: 1.5, emissive: hot ? P.studHi : 0x000000, emissiveIntensity: hot ? 0.45 : 0 });
  const rivetM = M({ color: 0x14161e, metalness: 0.7, roughness: 0.35 });
  const inkM = M({ color: 0x14100c, roughness: 0.9, metalness: 0 });

  /* ── dokular (glif uzayı) ── */
  const body = canvasFor(BT, ppu), lid = canvasFor(LT, ppu);
  {
    const b = body.g;
    b.fillStyle = vgrad(b, 29, 51, P.wood, 0.9); b.fillRect(BT.x0, BT.y0, 42, 25);
    if (woodTier) grain(b, BT.x0, BT.x1, BT.y0, BT.y1, P.plank, tier);
    if (tier === 3 || tier === 5) hammer(b, BT.x0, BT.x1, BT.y0, BT.y1, tier === 3 ? '#fff0b8' : '#dff2ff', P.plank, tier);
    if (tier === 7) { stroke(b, dragonScales(), P.plank, 1.2, 0.9); b.save(); b.translate(0, -0.5); stroke(b, dragonScales(), P.rim, 0.35, 0.35); b.restore(); }
    planks(b, D.planksBody, P, 1.4);
    /* temas: bant altı, etek üstü, kuşak kenarları */
    const sh = b.createLinearGradient(0, 31.2, 0, 34.5); sh.addColorStop(0, 'rgba(0,0,0,0.55)'); sh.addColorStop(1, 'rgba(0,0,0,0)');
    b.fillStyle = sh; b.fillRect(BT.x0, 31, 42, 3.6);
    const sk = b.createLinearGradient(0, 49, 0, 45.5); sk.addColorStop(0, 'rgba(0,0,0,0.5)'); sk.addColorStop(1, 'rgba(0,0,0,0)');
    b.fillStyle = sk; b.fillRect(BT.x0, 45.4, 42, 4);
    for (const k of [-1, 1]) contact(b, 32 + k * 12 - 3.6, 32 + k * 12 + 3.6, 30, 50, 0.35);
    contact(b, 25.6, 38.4, 30, 39.2, 0.3);
    /* kenar yuvarlama gölgesi (glif: M16.5 33 C17.3 38 …) */
    const edge = b.createLinearGradient(BT.x0, 0, BT.x1, 0);
    edge.addColorStop(0, 'rgba(0,0,0,0.42)'); edge.addColorStop(0.1, 'rgba(0,0,0,0)'); edge.addColorStop(0.9, 'rgba(0,0,0,0)'); edge.addColorStop(1, 'rgba(0,0,0,0.42)');
    b.fillStyle = edge; b.fillRect(BT.x0, BT.y0, 42, 25);

    const l = lid.g;
    l.fillStyle = vgrad(l, 11.5, 29, P.lid, 0.62); l.fillRect(LT.x0, LT.y0, 46, 17);
    if (woodTier) grain(l, LT.x0, LT.x1, LT.y0, LT.y1, P.plank, tier + 11);
    if (tier === 3 || tier === 5) hammer(l, LT.x0, LT.x1, LT.y0, LT.y1, tier === 3 ? '#fff4c8' : '#e8f6ff', P.plank, tier + 3);
    if (tier === 7) { stroke(l, dragonLidScales(), P.plank, 1.1, 0.85); l.save(); l.translate(0, -0.5); stroke(l, dragonLidScales(), P.rim, 0.32, 0.35); l.restore(); }
    planks(l, D.planksLid, P, 1.3);
    if (tier === 3) {
      const rays = sunRays();
      stroke(l, rays, P.plank, 1.5, 1);
      l.save(); l.strokeStyle = P.plank; l.lineWidth = 1.5; l.beginPath(); l.ellipse(32, 19, 3.4, 3, 0, 0, 6.283); l.stroke(); l.restore();
    }
    const lr = l.createLinearGradient(0, 24.8, 0, 27.4); lr.addColorStop(0, 'rgba(0,0,0,0)'); lr.addColorStop(1, 'rgba(0,0,0,0.5)');
    l.fillStyle = lr; l.fillRect(LT.x0, 24.8, 46, 3.2);
    for (const k of [-1, 1]) contact(l, 32 + k * 12 - 3.6, 32 + k * 12 + 3.6, 10, 28, 0.28);
  }
  const bodyTex = keep(texOf(body.cv, renderer), texs), lidTex = keep(texOf(lid.cv, renderer), texs);

  const surf = tier === 3 ? { metalness: 0.9, roughness: 0.3, envMapIntensity: 1.2 }
    : tier === 5 ? { metalness: 0.55, roughness: 0.36, envMapIntensity: 1.0 }
    : { metalness: 0.02, roughness: 0.64, envMapIntensity: 0.55 };
  const bodyM = M(Object.assign({ map: bodyTex }, surf));
  const lidM = M(Object.assign({ map: lidTex }, surf));
  const innerM = M({ map: lidTex, color: 0x241c22, roughness: 0.95, metalness: 0, emissive: P.glow, emissiveIntensity: 0.04 });

  /* ═ GÖVDE ═ */
  add(bodyGeo(), bodyM);
  /* derz bandı (glif: rect x8 y27 48×4,6 rx2,3) — halka, iç delik = gövde ağzı */
  {
    const bs = 1.1, bt = 1.9;
    const sh = rr(BAND_HW - bs, BAND_HD - bs, 5 - bs);
    sh.holes.push(rr(20.3 + bs, 14.85 + bs, 3.4 + bs, new THREE.Path()));
    add(extY(sh, BAND_Y0, BAND_Y1 - BAND_Y0, bt, bs, 5), metal);
  }
  /* etek (glif: rect x9,5 y48,6 45×5,6 rx2,4) */
  add(extY(rr(SKIRT_HW - 1.4, SKIRT_HD - 1.4, 3), 0, 5.6, 2.2, 1.4, 5), metalDk);
  /* kuşaklar: gövde + bant kelepçesi + kapak kabarık bandı */
  for (const k of [-1, 1]) {
    add(bodyStrapGeo(k * STRAP_X, 4.2, BAND_Y0 + 0.6), metal);
    add(extZ(rr(STRAP_HW - 0.45, 2.75 - 0.45, 1.3), BAND_HD - 0.7, 2.1, 0.45, 0.45), metal).translate(k * STRAP_X, (BAND_Y0 + BAND_Y1) / 2, 0);
    add(lidStrapGeo(k * STRAP_X), metal, true);
  }
  /* kabaralar */
  const NZ = new THREE.Vector3(0, 0, 1);
  for (const x of [-19.5, 19.5]) add(placed(hemi(1.25), x, wy(29.3), BAND_HD - 0.15, NZ), studM, false, true);
  for (const x of [-17, 17]) add(placed(hemi(1.15), x, wy(51.4), SKIRT_HD - 0.15, NZ), studM, false, true);
  for (const x of [-STRAP_X, STRAP_X]) {
    for (const y of [36, 45]) { const Y = wy(y); add(placed(hemi(1.3), x, Y + BODY_NZ.y * (STRAP_T - 0.2), hdAt(Y) + BODY_NZ.z * (STRAP_T - 0.2), BODY_NZ), studM, false, true); }
    const z = lidZAt(x, 19), Y = lidY(x, z); lidN(x, z, _n);
    add(placed(hemi(1.3), x + _n.x * (STRAP_T - 0.2), Y + _n.y * (STRAP_T - 0.2), z + _n.z * (STRAP_T - 0.2), _n.clone()), studHiM, true, true);
  }

  /* ═ KAPAK ═ */
  add(lidGeo(0), lidM, true);
  {
    const lip = rr(LID_HW - 0.2, LID_HD - 0.2, 0.8);
    lip.holes.push(rr(LID_HW - 1.5, LID_HD - 1.5, 0.6, new THREE.Path()));
    add(extY(lip, HINGE_Y, RIM - HINGE_Y + 0.15, 0.25, 0.2, 2), metalDk, true, true);
    const under = new THREE.ShapeGeometry(rr(LID_HW - 1.4, LID_HD - 1.4, 0.7));
    under.rotateX(Math.PI / 2); under.translate(0, HINGE_Y + 0.35, 0);
    { const p = under.attributes.position, uv = under.attributes.uv; for (let i = 0; i < p.count; i++) uv.setXY(i, 0.5 + p.getX(i) / 46, 0.5 + p.getZ(i) / 40); }
    add(under, innerM, true, true);
  }

  /* ═ KİLİT ═ */
  const LOCK_Y = wy(31.5);
  let seal = null, haloPos = new THREE.Vector3(0, wy(31.5), PLATE_Z0 + 0.25), haloR = 16;
  const lockPlate = (mat) => {
    add(extZ(rr(6.6 - 0.6, 7.5 - 0.6, 2.4), PLATE_Z0, PLATE_Z1 - PLATE_Z0, 0.6, 0.6), mat).translate(0, LOCK_Y, 0);
    for (const [x, y] of [[27.8, 26.6], [36.2, 26.6], [27.8, 36.4], [36.2, 36.4]]) add(placed(hemi(0.62), x - 32, wy(y), PLATE_Z1 - 0.12, NZ), rivetM, false, true);
  };
  const glowM = (c, o) => keep(new THREE.MeshBasicMaterial({ map: fx.glowTex, color: c, transparent: true, opacity: o, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }), mats);
  const sprites = [];
  const sprite = (c, o, x, y, z, sx, sy, parent) => {
    const m = new THREE.Mesh(fx.quad, glowM(c, o)); m.position.set(x, y, z); m.scale.set(sx, sy || sx, 1);
    (parent || g).add(m); sprites.push(m); return m;
  };
  const gemMat = (c, e, o) => M(Object.assign({ color: c, emissive: e || c, emissiveIntensity: 0.55, roughness: 0.1, metalness: 0.15, flatShading: true, envMapIntensity: 2.2 }, o || {}));
  const pulses = [];   // [mat, prop, a, b, dur, beg]
  const P1 = (mat, prop, a, b, dur, beg) => pulses.push([mat, prop, a, b, dur, beg || 0]);

  if (tier === 1 || tier === 2 || tier === 6 || tier === 7) lockPlate(metal);
  if (tier === 1 || tier === 2) {
    const kh = new THREE.Shape(); kh.absarc(0, 0, 2.1, 0, Math.PI * 2, false);
    const sl = shapeOf('M32 30.4 L33.5 35.2 H30.5 Z', 32, 29.6);
    const khg = new THREE.ExtrudeGeometry([kh, sl], { depth: 0.12, bevelEnabled: false, curveSegments: 16 });
    khg.translate(0, wy(29.6), PLATE_Z1 - 0.02);
    add(khg, inkM, false, true);
    const kg = keep(new THREE.MeshBasicMaterial({ color: P.key, transparent: true, opacity: 1, toneMapped: false }), mats);
    const dot = new THREE.Mesh(keep(new THREE.CircleGeometry(1, 20), geos), kg);
    dot.position.set(0, wy(29.6), PLATE_Z1 + 0.14); g.add(dot); seal = dot;
    P1(kg, 'opacity', 0.45, 1, 2.6);
    const h = sprite(P.key, 0.6, 0, wy(29.6), PLATE_Z1 + 0.2, 5);
    P1(h.material, 'opacity', 0.25, 0.7, 2.6);
    haloPos.set(0, wy(31), PLATE_Z0 + 0.3); haloR = 17;
  }
  if (tier === 2) {
    const spur = M({ color: P.spur, metalness: 0.9, roughness: 0.2, envMapIntensity: 1.5 });
    for (const k of [-1, 1]) {
      const a = new THREE.Vector3(k * 20.5, wy(29.5), BAND_HD + 0.3), b = new THREE.Vector3(k * 17, wy(33), hdAt(wy(33)) + 0.4);
      const cap = new THREE.CapsuleGeometry(1.1, a.distanceTo(b), 4, 10);
      const d = b.clone().sub(a).normalize();
      add(placed(cap, (a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2, d), spur);
    }
  }
  if (tier === 3) {
    add(extZ(shapeOf(D.shield, 32, GROUND), PLATE_Z0, 2.2, 0.6, 0.55), metal);
    const gm = gemMat(P.gem, P.gem);
    const gg = gemGeo('M32 26.8 L35 30.4 L32 34 L29 30.4 Z', 1.7); gg.translate(0, 0, PLATE_Z0 + 2.15);
    add(gg, gm, false, true); seal = { material: gm };
    P1(gm, 'emissiveIntensity', 0.45, 1.0, 2.6);
    haloPos.set(0, wy(32), PLATE_Z0 + 0.3); haloR = 18;
  }
  if (tier === 4) {
    const ring = keep(new THREE.TorusGeometry(6.6, 1.5, 14, 56), geos).clone();
    ring.translate(0, wy(32), PLATE_Z0 + 1.3); add(ring, metal);
    const cm = gemMat(0xffffff, P.crystal[1], { vertexColors: true, emissiveIntensity: 0.75 });
    const gg = gemGeo('M32 26.8 L36.4 32 L32 37.2 L27.6 32 Z', 2.2); gg.translate(0, 0, PLATE_Z0 + 1.2);
    const cc = new THREE.Color(P.crystal[1]); const ca = new Float32Array(gg.attributes.position.count * 3);
    for (let i = 0; i < ca.length; i += 3) { ca[i] = cc.r; ca[i + 1] = cc.g; ca[i + 2] = cc.b; }
    gg.setAttribute('color', new THREE.BufferAttribute(ca, 3));
    add(gg, cm, false, true); seal = { material: cm };
    P1(cm, 'emissiveIntensity', 0.55, 1.1, 1.6);
    haloPos.set(0, wy(32), PLATE_Z0 + 0.3); haloR = 20;
    /* kapak kristal filizleri (glif: translate(24 14) rotate(-16) · 40,5/14,5 +14 · taç 27,4-36,6/0,6-13,5) */
    for (const [x, y, rot, w, h, z] of [[24, 14, -16, 3.9, 10.5, 1.5], [40.5, 14.5, 14, 3.5, 9, 1.8], [32, 13.5, 0, 4.6, 12.9, 3]]) {
      const sg = spikeGeo(w * 1.12, h + 2.6, 6, P.crystal, 0.06, x); sg.translate(0, -0.8, 0);
      sg.translate(0, -1.8, 0); sg.rotateZ(-rot * Math.PI / 180); sg.translate(x - 32, wy(y), z);
      add(sg, cm, true);
    }
    sprite(P.glow, 0.45, 0, wy(12), -3, 30, 12, lidPivot).position.applyMatrix4(toLid);
  }
  if (tier === 5) {
    add(extZ(shapeOf(D.hex, 32, GROUND), PLATE_Z0, 2.2, 0.55, 0.5), metal);
    const im = gemMat(0xffffff, P.crystal[1], { vertexColors: true, emissiveIntensity: 0.5, roughness: 0.06 });
    const gg = gemGeo('M32 28.2 L35.6 32.2 L32 36.2 L28.4 32.2 Z', 1.8); gg.translate(0, 0, PLATE_Z0 + 2.15);
    const cc = new THREE.Color(P.crystal[1]); const ca = new Float32Array(gg.attributes.position.count * 3);
    for (let i = 0; i < ca.length; i += 3) { ca[i] = cc.r; ca[i + 1] = cc.g; ca[i + 2] = cc.b; }
    gg.setAttribute('color', new THREE.BufferAttribute(ca, 3));
    add(gg, im, false, true); seal = { material: im };
    P1(im, 'emissiveIntensity', 0.35, 0.85, 2.4);
    haloPos.set(0, wy(32.5), PLATE_Z0 + 0.3); haloR = 17;
    /* derzden taşan buz (glif: x, h, w2 · taban y 28,6) + sarkıtlar */
    for (const [x, h, w2] of [[14, 4.5, 2.6], [20, 6.5, 3], [27, 5, 2.6], [37, 6, 3], [44, 4.5, 2.4], [50, 5.5, 2.8]]) {
      const sg = spikeGeo(w2, h + 1.4, 4, P.crystal, 0.05, x); sg.translate(x - 32, wy(28.6) - 1.4, BAND_HD - 1.1);
      add(sg, im);
    }
    for (const [x, len, z] of [[17, 7.5, 0.2], [47, 6, 0]]) {
      const sg = spikeGeo(2, len + 0.8, 4, P.crystal, 0.04, x); sg.rotateX(Math.PI); sg.translate(x - 32, BAND_Y0 + 0.8, hdAt(BAND_Y0) + 2.2 + z);
      add(sg, im);
    }
    sprite(P.glow, 0.3, 0, wy(26), -16, 40);
  }
  if (tier === 6) {
    const irisCv = document.createElement('canvas'); irisCv.width = irisCv.height = 128;
    const ic = irisCv.getContext('2d'), gr = ic.createRadialGradient(64, 64, 0, 64, 64, 64);
    gr.addColorStop(0, P.crystal[0]); gr.addColorStop(0.45, P.crystal[1]); gr.addColorStop(1, P.crystal[2]);
    ic.fillStyle = gr; ic.fillRect(0, 0, 128, 128);
    const it = keep(texOf(irisCv, renderer), texs);
    const irisM = M({ map: it, emissiveMap: it, emissive: 0xffffff, emissiveIntensity: 0.8, roughness: 0.15, metalness: 0.1, envMapIntensity: 1.6 });
    const IR = 4.6 / Math.sin(Math.PI * 0.32), IZ = PLATE_Z1 + 0.05 - IR * Math.cos(Math.PI * 0.32) * 0.55;
    const iris = keep(new THREE.SphereGeometry(IR, 32, 12, 0, Math.PI * 2, 0, Math.PI * 0.32), geos).clone();
    iris.rotateX(Math.PI / 2); iris.scale(1, 1, 0.55); iris.translate(0, wy(31.5), IZ);
    const IT = IZ + IR * 0.55;
    { const p = iris.attributes.position, uv = iris.attributes.uv; for (let i = 0; i < p.count; i++) uv.setXY(i, 0.5 + p.getX(i) / 9.2, 0.5 + (p.getY(i) - wy(31.5)) / 9.2); }
    add(iris, irisM);
    P1(irisM, 'emissiveIntensity', 0.6, 1.1, 2.8);
    const pupM = M({ color: 0x180826, roughness: 0.3, metalness: 0.2 });
    const pup = new THREE.Mesh(keep(new THREE.SphereGeometry(1, 20, 12), geos), pupM);
    pup.position.set(0, wy(31.5), IT - 0.1); pup.scale.set(1.5, 2.9, 0.3); g.add(pup);
    const hiM = keep(new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9, toneMapped: false }), mats);
    const hi = new THREE.Mesh(keep(new THREE.CircleGeometry(0.85, 16), geos), hiM);
    hi.position.set(-1.4, wy(29.9), IT + 0.05); g.add(hi);
    seal = { material: irisM, pupil: pup };
    haloPos.set(0, wy(32), PLATE_Z0 + 0.3); haloR = 20;
    /* bant altından sızan ışık (glif: rect 10,27.8 44×1,6) */
    const strip = new THREE.Mesh(fx.quad, glowM(P.line, 0.3)); strip.position.set(0, wy(28.6), BAND_HD + 0.25); strip.scale.set(48, 3.4, 1); g.add(strip);
    P1(strip.material, 'opacity', 0.12, 0.55, 3);
    /* zemin büyü halkası (glif: ellipse cx32 cy54,5 rx17) */
    const rg = keep(new THREE.RingGeometry(25.2, 26.4, 72), geos);
    const rm = keep(new THREE.MeshBasicMaterial({ color: P.stud, transparent: true, opacity: 0.4, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false }), mats);
    const ring = new THREE.Mesh(rg, rm); ring.rotation.x = -Math.PI / 2; ring.position.y = 0.15; ring.scale.set(1, 0.9, 1); g.add(ring);
    P1(rm, 'opacity', 0.15, 0.55, 4);
  }
  if (tier === 7) {
    const em = gemMat(P.gem, P.gem, { emissiveIntensity: 0.9 });
    const gg = gemGeo('M32 26.6 L35.4 31.5 L32 36.4 L28.6 31.5 Z', 1.6); gg.translate(0, 0, PLATE_Z1 - 0.1);
    add(gg, em, false, true); seal = { material: em };
    P1(em, 'emissiveIntensity', 0.7, 1.3, 2);
    haloPos.set(0, wy(31.5), PLATE_Z0 + 0.3); haloR = 15;
    const hornM = M({ vertexColors: true, color: 0xffffff, metalness: 0.6, roughness: 0.34, envMapIntensity: 1.2, flatShading: true });
    /* derz dikenleri (glif spike(x,27.2)) + etek dikenleri */
    for (const x of [12, 21.5, 37.5, 47]) { const sg = spikeGeo(2.4, 5.6, 4, P.horn, 0, x); sg.translate(x + 2.4 - 32, wy(27.2) - 1, BAND_HD - 1.3); add(sg, hornM); }
    for (const x of [15.5, 48.5]) { const sg = spikeGeo(2.5, 5.2, 4, P.horn, 0, x); sg.translate(x - 32, wy(48.8) - 0.9, SKIRT_HD - 1.5); add(sg, hornM); }
    /* ═ EJDER BAŞI — glif path'leri birebir, kalın pahla hacim ═ */
    const HX = 32, HY = 10.1, HZ = lidZAt(0, 14.5) - 1.2;
    const head = new THREE.Group();
    const hm = M({ color: col(P.lid[0][1], P.lid[1][1], 0.35), roughness: 0.46, metalness: 0.12, envMapIntensity: 0.8 });
    const hg = new THREE.ExtrudeGeometry(shapeOf(D.head, HX, HY), { depth: 2.2, bevelEnabled: true, bevelThickness: 1.3, bevelSize: 0.9, bevelSegments: 5, curveSegments: 14 });
    hg.translate(0, 0, -1.1);
    const hgs = toCreasedNormals(hg, 0.8);
    const hornG = [];
    for (const k of [-1, 1]) {
      const sh = new THREE.ExtrudeGeometry(shapeOf(D.horn, HX, HY, k), { depth: 1.1, bevelEnabled: true, bevelThickness: 0.5, bevelSize: 0.35, bevelSegments: 3, curveSegments: 12 });
      sh.translate(0, 0, -1.4);
      const hc = toCreasedNormals(sh, 0.8), p = hc.attributes.position, cc = new Float32Array(p.count * 3), A = new THREE.Color(P.horn[0]), B = new THREE.Color(P.horn[2]), t = new THREE.Color();
      for (let i = 0; i < p.count; i++) { t.copy(A).lerp(B, Math.min(1, Math.max(0, (9.5 - p.getY(i)) / 7.9))); cc[i * 3] = t.r; cc[i * 3 + 1] = t.g; cc[i * 3 + 2] = t.b; }
      hc.setAttribute('color', new THREE.BufferAttribute(cc, 3));
      hornG.push(hc);
    }
    const dark = M({ color: 0x3a0a10, roughness: 0.5, metalness: 0.2 });
    const browG = new THREE.ExtrudeGeometry(shapeOf(D.brow, HX, HY), { depth: 0.4, bevelEnabled: true, bevelThickness: 0.25, bevelSize: 0.2, bevelSegments: 2 });
    browG.translate(0, 0, 2.45);
    const extra = [browG];
    for (const k of [-1, 1]) {
      const r = new THREE.CapsuleGeometry(0.42, 3.4, 3, 8); r.rotateZ(Math.PI / 2 + k * 0.2); r.translate(k * 3.5, 1.6, 2.6); extra.push(r);
      const ns = new THREE.SphereGeometry(0.5, 10, 8); ns.translate(k * 1.6, -3.0, 2.55); extra.push(ns);
    }
    const snout = new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(new THREE.Vector3(-3.5, -2.9, 2.6), new THREE.Vector3(0, -4.5, 2.5), new THREE.Vector3(3.5, -2.9, 2.6)), 12, 0.32, 6, false);
    extra.push(snout);
    const toothM = M({ color: 0xe8e4d8, roughness: 0.4, metalness: 0 });
    const teeth = [];
    for (const k of [-1, 1]) { const tg = new THREE.ConeGeometry(0.55, 2.1, 6); tg.rotateX(Math.PI); tg.translate(k * 4, -5.0, 2.45); teeth.push(tg); }
    const eyeM = keep(new THREE.MeshBasicMaterial({ color: P.gem, toneMapped: false }), mats);
    const eyes = [];
    for (const k of [-1, 1]) { const eg = new THREE.SphereGeometry(1.3, 14, 10); eg.scale(1, 1, 0.5); eg.translate(k * 4.2, 0.1, 2.55); eyes.push(eg); }
    const base = new THREE.Matrix4().makeRotationX(-0.22).premultiply(new THREE.Matrix4().makeTranslation(0, wy(HY), HZ));
    const put = (geo, mat, noInk) => add(geo.applyMatrix4(base), mat, true, noInk);
    put(hgs, hm); for (const h of hornG) put(h, hornM); put(mergeGeometries(extra.map((e) => (e.index ? e.toNonIndexed() : e))), dark, true);
    put(mergeGeometries(teeth.map((e) => e.toNonIndexed())), toothM, true);
    put(mergeGeometries(eyes.map((e) => e.toNonIndexed())), eyeM, true);
    for (const k of [-1, 1]) {
      const e = sprite(P.gem, 0.85, k * 4.2, 0.1, 3.4, 7, 7, lidPivot);
      e.position.applyMatrix4(base).applyMatrix4(toLid);
      P1(e.material, 'opacity', 0.6, 1, 2.4, k < 0 ? 0 : -1.2);
    }
    sprite(P.glow, 0.28, 0, wy(30), -18, 44, 32);
  }

  /* ═ IŞIMA / MÜREKKEP KABUKLARI: glifte kuşakların ÜSTÜNE çizilen süsler ═ */
  const shell = (lidSide, paint, additive, pulse) => {
    const R = lidSide ? LT : BT, c = canvasFor(R, ppu);
    if (additive) { c.g.fillStyle = '#000'; c.g.fillRect(R.x0, R.y0, R.x1 - R.x0, R.y1 - R.y0); }
    paint(c.g);
    const t = keep(texOf(c.cv, renderer), texs);
    const m = keep(new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false, toneMapped: false, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending, polygonOffset: true, polygonOffsetFactor: -2 }), mats);
    let geo;
    if (lidSide) geo = lidGeo(STRAP_T + 0.12, true);
    else {
      geo = gridGeo(2, 2, (r, cc, o) => {
        const Y = r ? BAND_Y0 + 0.4 : 1, X = cc ? 21.5 : -21.5, off = STRAP_T + 0.12;
        o.x = X; o.y = Y + BODY_NZ.y * off; o.z = hdAt(Y) + BODY_NZ.z * off; uvOf(BT, X, Y, o);
      });
    }
    const mesh = new THREE.Mesh(keep(geo, geos), m);
    mesh.renderOrder = 2;
    if (lidSide) { geo.applyMatrix4(toLid); lidPivot.add(mesh); } else g.add(mesh);
    if (pulse) P1(m, 'opacity', pulse[0], pulse[1], pulse[2], pulse[3]);
    return mesh;
  };
  const glowStroke = (d, w) => (c) => { stroke(c, d, P.line, w * 1.6, 0.5, 1.2); stroke(c, d, P.line, w, 1, 0); stroke(c, d, '#ffffff', w * 0.35, 0.6); };
  if (tier === 3) {
    shell(true, glowStroke(sunRays(), 0.8), true, [0.2, 0.8, 3]);
    shell(false, (c) => { stroke(c, D.filigree, P.plank, 1.4, 1); c.save(); c.translate(0, -0.45); stroke(c, D.filigree, P.rim, 0.35, 0.5); c.restore(); }, false);
  }
  if (tier === 4) shell(false, glowStroke(D.veins, 1.3), true, [0.15, 0.9, 3.4]);
  if (tier === 5) { shell(true, glowStroke(D.snow, 1.3), true, [0.3, 0.9, 3]); shell(false, glowStroke(D.iceArcs, 1.5), true, [0.25, 0.7, 3.2, -1.2]); }
  if (tier === 6) {
    shell(false, (c) => { glowStroke(D.leakBody, 1.8)(c); glowStroke(D.runes, 1.4)(c); }, true, [0.2, 0.85, 2.6]);
    shell(true, glowStroke(D.leakLid, 1.6), true, [0.12, 0.7, 3.2, -0.6]);
  }

  /* ═ SÜZÜLEN KIYMIKLAR (t4 kristal · t6 rün taşı) ═ */
  const bobbers = [];
  if (tier === 4 || tier === 6) {
    const sm = gemMat(0xffffff, P.crystal[1], { vertexColors: true, emissiveIntensity: 0.6 });
    const list = tier === 4 ? [[6.5, 32.4, 1.9, 2.4, 3, 3.2, -0.6], [58, 27.2, 1.7, 2.2, 2.6, 4, -1.8]] : [[58, 29.4, 1.8, 2.4, 2.8, 3.6, -0.9], [6, 35.2, 1.6, 2.2, 2.4, 4.2, -2.2]];
    for (const [x, y, w, h, amp, dur, beg] of list) {
      const og = keep(new THREE.OctahedronGeometry(1, 0), geos).clone(); og.scale(w * 1.1, h * 1.1, w * 0.8);
      const cc = new THREE.Color(P.crystal[1]), ca = new Float32Array(og.attributes.position.count * 3);
      for (let i = 0; i < og.attributes.position.count; i++) { const f = og.attributes.position.getY(i) > 0 ? new THREE.Color(P.crystal[0]) : cc; ca[i * 3] = f.r; ca[i * 3 + 1] = f.g; ca[i * 3 + 2] = f.b; }
      og.setAttribute('color', new THREE.BufferAttribute(ca, 3));
      keep(og, geos);
      const m = new THREE.Mesh(og, sm); m.position.set(x - 32, wy(y), 6);
      g.add(m); bobbers.push([m, wy(y), amp, dur, beg]);
    }
  }

  /* ═ BİRLEŞTİR ═ */
  const clean = (geo) => {
    const n = geo.index ? geo.toNonIndexed() : geo;
    const o = new THREE.BufferGeometry();
    o.setAttribute('position', n.attributes.position);
    if (!n.attributes.normal) n.computeVertexNormals();
    o.setAttribute('normal', n.attributes.normal);
    o.setAttribute('uv', n.attributes.uv || new THREE.BufferAttribute(new Float32Array(n.attributes.position.count * 2), 2));
    if (n.attributes.color) o.setAttribute('color', n.attributes.color);
    return o;
  };
  const hasCol = (m) => m.vertexColors;
  for (const b of buckets.values()) {
    const list = b.list.map(clean).map((q) => {
      if (hasCol(b.mat) && !q.attributes.color) { const a = new Float32Array(q.attributes.position.count * 3).fill(1); q.setAttribute('color', new THREE.BufferAttribute(a, 3)); }
      if (!hasCol(b.mat) && q.attributes.color) q.deleteAttribute('color');
      return q;
    });
    const merged = keep(mergeGeometries(list, false), geos);
    const mesh = new THREE.Mesh(merged, b.mat);
    (b.lid ? lidPivot : g).add(mesh);
  }
  for (const [list, parent] of [[inkBody, g], [inkLid, lidPivot]]) {
    if (!list.length) continue;
    const hull = new THREE.Mesh(keep(inkGeo(list.map((q) => { const c = clean(q); return c; })), geos), ink);
    hull.renderOrder = -1;
    parent.add(hull);
  }
  g.add(lidPivot);

  /* ═ PARILTI TARAMASI (t2 gümüş · t3 altın; glif: skewX(-16) ışık şeridi) ═ */
  let sheenU = null;
  if (P.sheen) {
    sheenU = { uSheen: { value: -99 }, uSheenC: { value: new THREE.Color(P.sheen[0]).multiplyScalar(P.sheen[1] * 2.4) } };
    for (const m of mats) {
      if (!m.isMeshStandardMaterial) continue;
      m.onBeforeCompile = (sh) => {
        sh.uniforms.uSheen = sheenU.uSheen; sh.uniforms.uSheenC = sheenU.uSheenC;
        sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vShW;')
          .replace('#include <project_vertex>', '#include <project_vertex>\nvShW = (modelMatrix * vec4(transformed, 1.0)).xyz;');
        sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vShW; uniform float uSheen; uniform vec3 uSheenC;')
          .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n{ float d = abs(vShW.x - vShW.y * 0.29 - uSheen); totalEmissiveRadiance += uSheenC * (1.0 - smoothstep(2.2, 4.8, d)); }');
      };
      m.customProgramCacheKey = () => 'chestSheen';
    }
  }

  const pulseAt = (t, a, b, dur, beg) => a + (b - a) * (0.5 - 0.5 * Math.cos(((t - beg) / dur) * Math.PI * 2));
  const anim = (t, leak) => {
    for (const [m, prop, a, b, dur, beg] of pulses) m[prop] = pulseAt(t, a, b, dur, beg) + (prop === 'opacity' ? 0 : leak * 0.6);
    for (const [m, y0, amp, dur, beg] of bobbers) {
      m.position.y = y0 + (0.5 - 0.5 * Math.cos(((t - beg) / dur) * Math.PI * 2)) * amp;
      m.rotation.y = t * 0.6;
    }
    if (seal && seal.pupil) seal.pupil.scale.x = 1.15 + 0.35 * Math.cos((t / 5) * Math.PI * 2);
    if (sheenU) {
      const [, , dur, hold] = P.sheen, ph = ((t % dur) / dur);
      sheenU.uSheen.value = ph < hold ? -99 : -40 + ((ph - hold) / (1 - hold)) * 92;
    }
  };

  return {
    group: g, lidPivot, haloPos, haloR, anim,
    dispose() {
      for (const x of texs) x.dispose();
      for (const x of mats) x.dispose();
      for (const x of geos) x.dispose();
    },
  };
}
