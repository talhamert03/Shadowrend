/* ═══════════════════════════════════════════════════════════
   decorModels.js — SÜS KATMANI (v47): çarpışmasız küçük nesneler

   Kullanıcı: "çok dolu olmasın, rahat dolaşılsın ama etrafta bir şeyler
   olsun; daha tatlı, premium." 1:1 teşhis: zemin karosu (tekrar eden desen)
   ile 100+ birimlik engel arasında ORTA ÖLÇEK hiç yoktu. Bu dosya o ölçeği
   verir: ot, çiçek, taş, mum, mantar, saz, kristal, kor, kemik/dişli
   parçası, yaprak, kar, nilüfer, iskele kazığı.

   SÖZLEŞME: propModels ile AYNI Builder (tek ışık yönü, temas karartması,
   lineer palet — `PROP_KIT`). Çarpışma YOK, kırılma YOK; bu yüzden engel
   bütçesine girmez, kendi bütçesi var (arenaMaps.thinDecor). Tıknaz ve
   yuvarlak: 30 px'te okunan şey siluettir, ince bıçak titrer.
   `DECOR_SWAY`: rüzgâr + oyuncu itmesi alan türler (render3d decorMat).
   ═══════════════════════════════════════════════════════════ */
import { PROP_KIT } from './propModels.js?v=20260930m';

const { Builder, U, xf, rgb, addOc, tcyl, lath, mul } = PROP_KIT;
const TAU = Math.PI * 2;
const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

export const DECOR_SWAY = { ot: 1, cicek: 1, saz: 1, mantar: 1 };
/* ÖLÇEK (1:1 oyun kamerasında ölçüldü): model birimi ≈ 15 birimlik tutam
   ekranda ~9 px kalıyor, AI zemin karosunun kendi ot yaprakları 60-100 px —
   süs zeminde KAYBOLUYORDU. Kahraman 91 birim; tutam onun ~yarısı olmalı. */
export const DECOR_SCALE = { ot: 2.4, cicek: 2.3, tas: 2.1, mum: 1.9, mantar: 1.9, saz: 1.8, kazik: 1.35, kristal: 2.1, kor: 2.0, kemikP: 2.0, disliP: 1.9, yaprakP: 2.3, kar: 2.1, nilufer: 2.3 };

/* HARİTA AKSANLARI — yalnız süste, küçük alanda (zemin doygunluk bandı
   bozulmaz). Çiçek "tatlı"nın taşıyıcısı ama pastel: kritik/hasar
   renkleriyle yarışmaz. */
const FLOWER = {
  mezarlik: [0xb6a6d6, 0xd6d0c2, 0x9a8cc4], gokada: [0xe6c65a, 0xdcd8cc, 0x8eaee4],
  katedral: [0xb03a52, 0xc86070, 0xd8c8b0], bataklik: [0xc8d890, 0xb8c8a8],
  kemikbahce: [0xc8b890, 0xb09c7c], def: [0xc8c0b0, 0xa8a0c0],
};
const MUSH = { bataklik: [0x5cc4a4, 0], gokada: [0xb8483a, 0], mezarlik: [0xa89a84, 0], kemikbahce: [0xc9bfa2, 0], def: [0x9a8c78, 0] };
const CRYS = { tuzla: [0xd4ccb2, 0], buzul: [0x9cc6dc, 0], hiclik: [0xcfc8ff, 1], gokcark: [0xcbb6ff, 1], katedral: [0xc86a90, 1], def: [0xb8c0d0, 0] };
const LEAF = { mezarlik: [0x7a5a30, 0x8a4a2a, 0x5c5a30], gokada: [0xa86a2a, 0x8a8a3a, 0x9a5a2a], def: [0x6a5a3a, 0x5a5030] };

function grass(P, id, k) {
  if (id === 'buzul') return mix(P.yaprakKoyu, rgb(0x96aab6), 0.35 + k * 0.3);
  if (id === 'tuzla') return mix(rgb(0x8a8260), rgb(0x6a6644), k);
  if (id === 'kul') return mix(rgb(0x5a4a34), rgb(0x3e3426), k);
  if (id === 'kemikbahce') return mix(rgb(0x7a7448), rgb(0x5a5634), k);
  return k < 0.5 ? mul(P.yaprak, 1.12) : P.yaprakKoyu;
}

/* OT TUTAMI — yedi tıknaz bıçak, dışa yatık (tek bıçak 30 px'te çizgi okunur) */
function ot(B, P, id) {
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * TAU + (i % 2) * 0.4, r = 1.5 + (i % 3) * 2.2;
    const h = 11 + ((i * 37) % 9), lean = 0.26 + (i % 3) * 0.09;
    B.addc(U.cone4, xf(Math.cos(a) * r, 0, Math.sin(a) * r, 2.7, h, 2.1,
      Math.sin(a) * lean, 0, -Math.cos(a) * lean), grass(P, id, (i % 3) / 2));
  }
  return B;
}
/* ÇİÇEK — üç sap + dolgun taç + göbek; taç rengi hafif kaldırılmış
   (temas karartması 10-17 birimde tacı söndürüyordu) */
function cicek(B, P, id) {
  const pal = FLOWER[id] || FLOWER.def;
  for (let i = 0; i < 3; i++) {
    const a = i * 2.1 + 0.3, r = 2.6 + i * 1.6, h = 9 + i * 3.4;
    const x = Math.cos(a) * r, z = Math.sin(a) * r;
    tcyl(B, 0.7, 0.9, h, 5, xf(x, 0, z, 1, 1, 1, 0, 0, 0.12), P.yaprakKoyu);
    B.addc(U.sphT, xf(x + h * 0.12, h, z, 3.3, 2.1, 3.3, 0, 0, 0), mul(rgb(pal[i % pal.length]), 1.3));
    B.addc(U.sphT, xf(x + h * 0.12, h + 1.4, z, 1.2, 1, 1.2, 0, 0, 0), rgb(0xe2c25a));
  }
  for (let i = 0; i < 3; i++) {
    const a = i * 2.3 + 1.1;
    B.addc(U.cone4, xf(Math.cos(a) * 3, 0, Math.sin(a) * 3, 2.4, 6, 1.2, Math.sin(a) * 0.9, 0, -Math.cos(a) * 0.9), P.yaprak);
  }
  return B;
}
/* ÇAKIL — üç yontulmuş taş, boy sırası (tek taş "leke" okunur) */
function tas(B, P) {
  const R = [[0, 0, 6.2], [7.5, 3, 4.2], [-4, 6, 3.2]];
  for (let i = 0; i < 3; i++) {
    const r = R[i][2];
    addOc(B, U.cyl6, { amp: 0.22, fa: 2, seed: i * 1.7, flare: 0.1 },
      xf(R[i][0], 0, R[i][1], r, r * 0.62, r * 0.86, 0, i * 1.3, 0), i ? P.tas : P.tasKoyu);
  }
  return B;
}
/* MUM KÜMESİ — üç boy, erimiş dip, ışıklı alev (unlit = kendiliğinden parlar) */
function mum(B, P, id) {
  const w = id === 'katedral' ? P.mermer : P.kemik;
  const C = [[0, 0, 2.6, 14], [5, 2.5, 2.1, 9], [-3.5, 4, 1.8, 6]];
  for (const c of C) {
    B.addc(U.sphT, xf(c[0], 0.4, c[1], c[2] * 1.7, 1.2, c[2] * 1.7, 0, 0, 0), mul(w, 0.9));
    tcyl(B, c[2], c[2] * 1.08, c[3], 7, xf(c[0], 0, c[1], 1, 1, 1, 0, 0, 0), w);
    B.addc(U.cone4, xf(c[0], c[3] + 0.4, c[1], 1.3, 4.2, 1.3, 0, 0.4, 0), P.cam, true);
  }
  return B;
}
/* MANTAR — dönel şapka (küre değil: altı görünen küre "top" okunur) */
function mantar(B, P, id) {
  const m = MUSH[id] || MUSH.def, cap = rgb(m[0]), glow = !!m[1];
  const C = [[0, 0, 6.5, 9], [6, 3, 4.2, 6], [-4, 5, 3.2, 4.5]];
  for (let i = 0; i < C.length; i++) {
    const [x, z, r, h] = C[i];
    tcyl(B, r * 0.28, r * 0.36, h, 6, xf(x, 0, z, 1, 1, 1, 0, 0, 0.08 * (i - 1)), mul(P.kemik, 0.95));
    lath(B, [[0, 0], [r, 0.4], [r * 0.92, r * 0.34], [r * 0.55, r * 0.62], [0, r * 0.7]], 8,
      xf(x + 0.08 * (i - 1) * h, h - 0.6, z, 1, 1, 1, 0, 0, 0), glow ? mul(cap, 0.9) : cap, null, glow);
    if (id === 'gokada' && i === 0) {
      for (let q = 0; q < 3; q++) B.addc(U.sphT, xf(x + Math.cos(q * 2.1) * r * 0.5, h + r * 0.45, z + Math.sin(q * 2.1) * r * 0.5, 1.1, 0.6, 1.1, 0, 0, 0), rgb(0xe8e0d0));
    }
  }
  return B;
}
/* SAZ — sekiz uzun bıçak + iki kedikuyruğu */
function saz(B, P, id) {
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * TAU + (i % 3) * 0.3, r = 1 + (i % 3) * 2;
    const h = 22 + ((i * 29) % 15), lean = 0.12 + (i % 2) * 0.1;
    B.addc(U.cone4, xf(Math.cos(a) * r, 0, Math.sin(a) * r, 1.6, h, 1.3, Math.sin(a) * lean, 0, -Math.cos(a) * lean),
      i % 3 ? mul(P.yaprak, 1.05) : mix(P.yaprak, rgb(0x8a8050), 0.5));
  }
  for (const [x, z, h] of [[1.5, 0.5, 30], [-2, 2, 25]]) {
    tcyl(B, 0.5, 0.6, h, 5, xf(x, 0, z, 1, 1, 1, 0, 0, 0), P.yaprakKoyu);
    tcyl(B, 1.6, 1.6, 6.5, 6, xf(x, h, z, 1, 1, 1, 0, 0, 0), rgb(0x5a3e26));
  }
  return B;
}
/* İSKELE KAZIĞI — v46'da ÇARPIŞMALIYDI (32 kazık, ince, oyuncu takılıyordu):
   iskele okuması için hacim gerekmez, siluet yeter. */
function kazik(B, P) {
  tcyl(B, 3.4, 4.2, 44, 6, xf(0, 0, 0, 1, 1, 1, 0.04, 0, 0.03), P.ahsapKoyu, false, { amp: 0.08, fa: 2, seed: 0.7 });
  B.addc(U.cyl8, xf(0, 29, 0, 4.4, 2.4, 4.4, 0, 0, 0), rgb(0x8a7a54));
  B.addc(U.cyl8, xf(0, 0, 0, 5, 7, 5, 0, 0, 0), P.yaprakKoyu);
  return B;
}
/* KRİSTAL KÜMESİ — tuz/buz/hiçlik/yıldız; büyülü haritada ışıklı */
function kristal(B, P, id) {
  const c = CRYS[id] || CRYS.def, col = rgb(c[0]), em = !!c[1];
  const S = [[0, 0, 3.6, 17, 0, 0], [4.5, 2, 2.6, 11, 0.35, 0.2], [-3.5, 3, 2.4, 9, -0.3, 0.3], [1, -4, 2, 7, 0.1, -0.4]];
  for (let i = 0; i < S.length; i++) {
    const s = S[i];
    B.addc(i % 2 ? U.cone4 : U.cone6, xf(s[0], 0, s[1], s[2], s[3], s[2], s[5], i * 0.7, s[4]),
      em ? mul(col, i ? 0.8 : 1) : mul(col, 0.9 + i * 0.05), em && i === 0);
  }
  return B;
}
/* KOR TAŞI — iki kavrulmuş taş + ışıyan çatlak + dumanlanan kor */
function kor(B, P) {
  const dk = rgb(0x2c2622), em = rgb(0xff8a3a);
  addOc(B, U.cyl6, { amp: 0.24, fa: 2, seed: 0.4 }, xf(0, 0, 0, 7, 5, 6, 0, 0.3, 0), dk);
  addOc(B, U.cyl6, { amp: 0.24, fa: 3, seed: 1.4 }, xf(7, 0, 3, 4.5, 3.4, 4, 0, 1.1, 0), dk);
  for (const [x, z, w] of [[1, 0, 5], [-2, 2, 3.5], [7, 3, 3]]) B.addc(U.box, xf(x, 0, z, w, 5.4, 1.1, 0, x, 0), em, true);
  B.addc(U.sphT, xf(3.5, 1, -4, 1.8, 1.4, 1.8, 0, 0, 0), em, true);
  return B;
}
/* KEMİK PARÇASI — çift topuzlu iki kısa kemik (v43 dili) */
function kemikP(B, P) {
  const k = P.kemik;
  B.addc(U.cyl8, xf(-6, 1.8, 0, 1.3, 12, 1.3, 0, 0, -Math.PI / 2), k);
  for (const x of [-6, 6]) for (const z of [-1.2, 1.2]) B.addc(U.sphT, xf(x, 1.8, z, 1.9, 1.9, 1.9, 0, 0, 0), k);
  B.addc(U.cyl8, xf(5, 1.6, -1, 1.1, 10, 1.1, Math.PI / 2, 0, 0), mul(k, 0.92));
  for (const z of [-1, 9]) B.addc(U.sphT, xf(5, 1.6, z, 1.7, 1.7, 1.7, 0, 0, 0), mul(k, 0.92));
  return B;
}
/* DİŞLİ PARÇASI — yatık küçük dişli + eğik ikincisi + cıvata */
function disliP(B, P) {
  const d = P.demir, dk = P.demirKoyu;
  const gear = (x, y, z, r, rx) => {
    B.addc(U.cyl8, xf(x, y, z, r, 2.2, r, rx, 0, 0), d);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * TAU;
      B.addc(U.box, xf(x + Math.cos(a) * r, y + Math.sin(a) * r * Math.sin(rx), z + Math.sin(a) * r * Math.cos(rx), 2.6, 2.2, 2.6, rx, -a, 0), d);
    }
    B.addc(U.cyl6, xf(x, y + 0.4, z, r * 0.35, 2.6, r * 0.35, rx, 0, 0), dk);
  };
  gear(0, 0, 0, 8, 0);
  gear(9, 2.5, 4, 5, 0.5);
  tcyl(B, 1.6, 1.6, 5, 6, xf(-6, 0, 6, 1, 1, 1, 0, 0, 0), dk);
  return B;
}
/* YAPRAK DÖKÜNTÜSÜ — yere yatık altı yaprak (y ≈ 0,5: z-kavgası yok) */
function yaprakP(B, P, id) {
  const pal = LEAF[id] || LEAF.def;
  for (let i = 0; i < 6; i++) {
    const a = i * 1.7, r = 3 + (i % 3) * 4;
    B.addc(U.box, xf(Math.cos(a) * r, 0.2, Math.sin(a) * r, 4.2, 0.7, 2.6, 0.08 * (i % 3), a * 1.3, 0), rgb(pal[i % pal.length]));
  }
  return B;
}
/* KAR YIĞINTISI — basık iki tümsek (v43: 0x96aab6 üstü "beyaz disk") */
function kar(B) {
  B.addc(U.sphLo, xf(0, 0, 0, 11, 5, 8, 0, 0, 0), rgb(0x92a6b2));
  B.addc(U.sphLo, xf(8, 0, 3, 6, 3.6, 5, 0, 0.6, 0), rgb(0x9cb0bc));
  return B;
}
/* NİLÜFER — üç yaprak + tek çiçek (su yüzeyinde, 1 birim) */
function nilufer(B, P) {
  const g = mul(P.yaprak, 1.08);
  for (const [x, z, r] of [[0, 0, 8], [10, 4, 6], [-6, 7, 5]]) B.addc(U.cyl8, xf(x, 0, z, r, 0.9, r, 0, x, 0), g);
  B.addc(U.sphT, xf(1, 1.4, -1, 2.6, 1.6, 2.6, 0, 0, 0), mul(rgb(0xd8b8c8), 1.2));
  return B;
}

const BUILD = { ot, cicek, tas, mum, mantar, saz, kazik, kristal, kor, kemikP, disliP, yaprakP, kar, nilufer };
export const DECOR_KINDS = Object.keys(BUILD);

const CACHE = new Map();
/** Haritanın süs geometrileri (LRU 2, görev başına bir kez pişer). */
export function decorGeometries(palId) {
  const key = palId + (PROP_KIT.lite() ? '~lite' : '');
  const hit = CACHE.get(key);
  if (hit) { CACHE.delete(key); CACHE.set(key, hit); return hit; }
  const P = PROP_KIT.pal(palId), set = {};
  for (const k in BUILD) set[k] = BUILD[k](new Builder(), P, palId).geo();
  CACHE.set(key, set);
  while (CACHE.size > 2) {
    const old = CACHE.keys().next().value, dead = CACHE.get(old);
    CACHE.delete(old);
    for (const k in dead) dead[k].dispose();
  }
  return set;
}
