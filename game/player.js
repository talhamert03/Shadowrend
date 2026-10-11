/* ═══════════════════════════════════════════════════════════
   player.js — Hasatçı Avcısı (Görsel Rework v2)

   Hareket, XP toplama, seviye sistemi, KARA PAZAR ekonomisi ve
   karakter çizimi. Karakterler sprite değil, canvas vektörleriyle
   çizilir — v2: katmanlı pelerin, kemer + arma tokası, sırt
   silahı silüeti, çift ton kenar ışığı, IŞIYAN gözler ve zaman
   parametresiyle canlı mikro-animasyon (pelerin salınımı, göz
   nabzı, fitil kıvılcımı). Ekranda tek oyuncu olduğu için bu
   detay bütçesi kare hızına dokunmaz.

   İstatistik felsefesi (Brotato mantığı): tüm eşyalar ve pasif
   rünler player.applyMods() üzerinden KALICI olarak stat yığar.
   ═══════════════════════════════════════════════════════════ */

import { PLAYER, xpToNext, COLORS, CHARACTERS, DEFAULT_CHAR } from './config.js?v=20260930m';

/* Oyun içi karakter ölçeği — "birazcık daha büyük" isteği */
export const HUNTER_SCALE = 1.32;

/* ═══════════════════════════════════════════════════════════
   KAHRAMAN SPRITE SETLERİ — BÜYÜCÜ (cadi) + HASATÇI + KOLÇU
   Her karakter: walk / atk / idle / hit kare setleri.
   Kanonik bakış SAĞ; ':f' işaretli kareler yükleme anında
   aynalanır (sheet'te sola bakan kareler). Çapa: alt-orta.
   ═══════════════════════════════════════════════════════════ */
/* v3: kolçu/büyücü(cadı)/hasatçı artık piksel-art sprite DEĞİL — azrail/kasap/
   cellat ile aynı "tatlı" vektör çizim (drawHunter) kullanıyor. Ham sprite
   sistemi burada bilerek BOŞ bırakıldı; heroReady() hep false döner ve
   render()/drawCharPortrait() otomatik olarak vektöre düşer. */
const HERO_SHEETS = {};
const HERO_IMG = {};   // id -> { walk:[{img,w,h}], atk:[], idle:[], hit:[], ready, sc }
export let CADI_READY = false;      // büyücü sprite'ları hazır bayrağı
(function loadHeroes() {
  const mirror = (im) => {
    const c = document.createElement('canvas');
    c.width = im.naturalWidth; c.height = im.naturalHeight;
    const g = c.getContext('2d');
    g.translate(c.width, 0); g.scale(-1, 1);
    g.drawImage(im, 0, 0);
    return c;
  };
  for (const id in HERO_SHEETS) {
    const def = HERO_SHEETS[id];
    const store = { walk: [], atk: [], idle: [], hit: [], ready: false, sc: def.h / def.refH };
    HERO_IMG[id] = store;
    let left = def.walk.length + def.atk.length + def.idle.length + def.hit.length;
    const done = () => {
      if (--left > 0) return;
      store.ready = true;
      if (id === 'cadi') CADI_READY = true;
    };
    for (const set of ['walk', 'atk', 'idle', 'hit']) {
      def[set].forEach((spec, i) => {
        const flip = spec.endsWith(':f');
        const name = flip ? spec.slice(0, -2) : spec;
        const im = new Image();
        im.onload = () => {
          const img = flip ? mirror(im) : im;
          store[set][i] = { img, w: im.naturalWidth, h: im.naturalHeight };
          done();
        };
        im.onerror = done;
        im.src = def.dir + name + '.png?v=20260901t';
      });
    }
  }
})();

function heroReady(id) { const s = HERO_IMG[id]; return !!(s && s.ready); }

/** Kahraman sprite karesi çiz — alt-orta çapa (feetY = ayak çizgisi).
    phase: kesirli kare indeksi — ardışık iki kare çapraz geçişle (crossfade)
    harmanlanır, animasyon yumuşak akar. loop=false → son karede durur. */
function drawHero(ctx, id, x, feetY, faceLeft, set, phase, alpha, scale, loop) {
  const store = HERO_IMG[id];
  if (!store || !store.ready) return false;
  const arr = store[set];
  const n = arr.length;
  if (!n) return false;
  let i = Math.floor(phase), frac = phase - i, j;
  if (loop) { i = ((i % n) + n) % n; j = (i + 1) % n; }
  else if (i >= n - 1) { i = n - 1; frac = 0; j = i; }
  else { j = i + 1; }
  const s = scale || store.sc;
  ctx.save();
  /* piksel sanatı net kalsın — yumuşatma kapalı */
  ctx.imageSmoothingEnabled = false;
  ctx.translate(x, feetY);
  if (faceLeft) ctx.scale(-1, 1);
  const blit = (f, a) => {
    if (!f || a <= 0.02) return;
    ctx.globalAlpha = a;
    ctx.drawImage(f.img, -(f.w * s) / 2, -f.h * s, f.w * s, f.h * s);
  };
  blit(arr[i], alpha);
  if (j !== i) blit(arr[j], alpha * frac * 0.9);
  ctx.restore();
  ctx.globalAlpha = 1;
  return true;
}

/** Karakter göğüs nişanı — stroke/fill önceden ayarlanmış olmalı. */
export function drawEmblem(ctx, kind, x, y, s) {
  ctx.beginPath();
  switch (kind) {
    case 'arrow':
      ctx.moveTo(x, y - s);
      ctx.lineTo(x + s * 0.9, y + s * 0.8);
      ctx.lineTo(x, y + s * 0.25);
      ctx.lineTo(x - s * 0.9, y + s * 0.8);
      ctx.closePath();
      ctx.fill();
      break;
    case 'cleaver':
      ctx.moveTo(x - s, y - s * 0.7);
      ctx.lineTo(x + s * 0.7, y - s * 0.7);
      ctx.quadraticCurveTo(x + s * 1.1, y, x + s * 0.55, y + s * 0.75);
      ctx.lineTo(x - s * 0.45, y + s * 0.75);
      ctx.closePath();
      ctx.fill();
      break;
    case 'spark':
      for (let i = 0; i < 4; i++) {
        const a = i * Math.PI / 2;
        ctx.moveTo(x, y);
        ctx.lineTo(x + Math.cos(a - 0.35) * s * 0.4, y + Math.sin(a - 0.35) * s * 0.4);
        ctx.lineTo(x + Math.cos(a) * s * 1.15, y + Math.sin(a) * s * 1.15);
        ctx.lineTo(x + Math.cos(a + 0.35) * s * 0.4, y + Math.sin(a + 0.35) * s * 0.4);
      }
      ctx.closePath();
      ctx.fill();
      break;
    case 'star':
      for (let i = 0; i < 5; i++) {
        const a = -Math.PI / 2 + i * (Math.PI * 2 / 5);
        const b = a + Math.PI / 5;
        const m = i === 0 ? 'moveTo' : 'lineTo';
        ctx[m](x + Math.cos(a) * s * 1.1, y + Math.sin(a) * s * 1.1);
        ctx.lineTo(x + Math.cos(b) * s * 0.45, y + Math.sin(b) * s * 0.45);
      }
      ctx.closePath();
      ctx.fill();
      break;
    case 'skull':
      ctx.arc(x, y - s * 0.15, s * 0.85, Math.PI, 0);
      ctx.lineTo(x + s * 0.55, y + s * 0.5);
      ctx.lineTo(x + s * 0.2, y + s * 0.5);
      ctx.lineTo(x + s * 0.2, y + s * 0.8);
      ctx.lineTo(x - s * 0.2, y + s * 0.8);
      ctx.lineTo(x - s * 0.2, y + s * 0.5);
      ctx.lineTo(x - s * 0.55, y + s * 0.5);
      ctx.closePath();
      ctx.fill();
      break;
    case 'moon':
      ctx.save();
      ctx.strokeStyle = ctx.fillStyle;
      ctx.lineWidth = s * 0.5;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(x, y, s * 0.95, Math.PI * 0.34, Math.PI * 1.66);
      ctx.stroke();
      ctx.restore();
      break;
    case 'bolt':
      ctx.moveTo(x + s * 0.15, y - s * 1.1);
      ctx.lineTo(x - s * 0.65, y + s * 0.15);
      ctx.lineTo(x - s * 0.05, y + s * 0.15);
      ctx.lineTo(x - s * 0.35, y + s * 1.1);
      ctx.lineTo(x + s * 0.75, y - s * 0.15);
      ctx.lineTo(x + s * 0.15, y - s * 0.15);
      ctx.closePath();
      ctx.fill();
      break;
    case 'scythe':
      ctx.save();
      ctx.strokeStyle = ctx.fillStyle;
      ctx.lineWidth = s * 0.34;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(x + s * 0.35, y - s);
      ctx.lineTo(x - s * 0.15, y + s);          // sap
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x + s * 0.35, y - s);          // orak ağzı
      ctx.quadraticCurveTo(x - s * 1.15, y - s * 1.05, x - s * 1.05, y - s * 0.1);
      ctx.stroke();
      ctx.restore();
      break;
    case 'shield':
      /* SAVAŞÇI — kale nöbetçisi kalkanı: üstü düz, altı sivri */
      ctx.moveTo(x - s * 0.9, y - s * 0.85);
      ctx.lineTo(x + s * 0.9, y - s * 0.85);
      ctx.lineTo(x + s * 0.9, y + s * 0.1);
      ctx.quadraticCurveTo(x + s * 0.75, y + s * 0.85, x, y + s * 1.15);
      ctx.quadraticCurveTo(x - s * 0.75, y + s * 0.85, x - s * 0.9, y + s * 0.1);
      ctx.closePath();
      ctx.fill();
      break;
    case 'flame':
      /* GÖKALEV — mavi alev damlası: tabanı toparlak, ucu iğne */
      ctx.moveTo(x, y - s * 1.15);
      ctx.bezierCurveTo(x + s * 0.72, y - s * 0.28, x + s * 0.95, y + s * 0.16,
                        x + s * 0.62, y + s * 0.72);
      ctx.quadraticCurveTo(x, y + s * 1.28, x - s * 0.62, y + s * 0.72);
      ctx.bezierCurveTo(x - s * 0.95, y + s * 0.16, x - s * 0.72, y - s * 0.28,
                        x, y - s * 1.15);
      ctx.closePath();
      ctx.fill();
      break;
    default:
      ctx.arc(x, y, s, Math.PI * 0.25, Math.PI * 1.4);
      ctx.stroke();
  }
}

/** İki rengi kabaca karıştır (hex olmayan girdide ilkini döndürür). */
function shade(hex, k) {
  if (!hex || hex[0] !== '#' || hex.length !== 7) return hex;
  const n = parseInt(hex.slice(1), 16);
  const r = Math.max(0, Math.min(255, ((n >> 16) & 255) * k | 0));
  const g = Math.max(0, Math.min(255, ((n >> 8) & 255) * k | 0));
  const b = Math.max(0, Math.min(255, (n & 255) * k | 0));
  return '#' + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1);
}

/**
 * Ortak kahraman gövdesi v3 — CHIBI insansı mobil stil.
 * İri kafa + tombul gövde + kalın kontur + canlı yüz (göz akı,
 * iris, ışıltı, kaş, ağız). Her kahraman kendi başlığı ve el
 * silahıyla çizilir; def.colors kimliği korur.
 * s=ölçek · fx=bakış (-1..1) · t=zaman · wp=yürüyüş fazı · atk=0..1 savuruş
 */
export function drawHunter(ctx, x, ty, s, def, fx = 0, t = 0, wp = 0, atk = 0) {
  const C = def.colors;
  const id = def.id || 'hasatci';
  const SKIN = {
    hasatci: '#f0c298', kolcu: '#e8b488', cadi: '#f6dcc4', buyucu: '#eec9a2',
    seher: '#f7ddc2', okcu: '#f4dcc0',
    gulyabani: '#8fc45e', kasap: '#e0a878', cellat: '#d9a97e',
    barutcu: '#f0c298', azrail: '#ece6d2', tilki: '#f5d9bd',
  };
  const skin = SKIN[id] || '#f0c298';
  const OUT = '#141722';
  const big = id === 'kasap' || id === 'gulyabani';
  const wf = big ? 1.2 : 1;
  const sway = Math.sin(t * 2.2) * 0.7 * s;
  const step = Math.sin(wp * 9) * 2.5 * s;
  const swing = Math.sin(Math.max(0, Math.min(1, atk)) * Math.PI);

  const hipY = ty + 9 * s;
  const footY = ty + 18 * s;
  const headR = (big ? 8.9 : 9.4) * s;
  const headY = ty - 8.6 * s;
  const hx = x + fx * 0.9 * s;
  const robe = id === 'azrail';                  // uzun cüppe — bacak yok

  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  const lw = (k) => Math.max(0.8, k * s);
  /* v4: her blob'a hafif üst-sol yönlü ışık gradyanı bindirilir — düz renk
     yerine cilalı/rendered bir "fantastik kahraman" hissi verir. */
  const litGrad = ctx.createLinearGradient(x - 16 * s, ty - 24 * s, x + 8 * s, ty + 16 * s);
  litGrad.addColorStop(0, 'rgba(255,255,255,0.26)');
  litGrad.addColorStop(0.5, 'rgba(255,255,255,0.03)');
  litGrad.addColorStop(1, 'rgba(0,0,0,0.14)');
  const blob = (fill, path, k) => {
    ctx.fillStyle = fill; ctx.strokeStyle = OUT; ctx.lineWidth = lw(k || 1.7);
    ctx.beginPath(); path(); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.save();
    ctx.beginPath(); path(); ctx.closePath(); ctx.clip();
    ctx.fillStyle = litGrad;
    ctx.fillRect(x - 26 * s, ty - 40 * s, 52 * s, 70 * s);
    ctx.restore();
  };
  const dot = (fill, dx, dy, r) => { ctx.fillStyle = fill; ctx.beginPath(); ctx.arc(dx, dy, r, 0, 6.283); ctx.fill(); };
  const limb = (x1, y1, x2, y2, w, color) => {
    ctx.strokeStyle = OUT; ctx.lineWidth = w + lw(2.4);
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    ctx.strokeStyle = color; ctx.lineWidth = w;
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    /* aynı yumuşak ışık gradyanı kollara da */
    ctx.save();
    ctx.lineWidth = w; ctx.strokeStyle = litGrad;
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    ctx.restore();
  };

  const armW = (big ? 3.6 : 2.9) * s;
  const legW = (big ? 3.8 : 3.1) * s;
  const tunic = C.cloak;
  const legC = shade(C.cloak, 0.72);
  const bootC = shade(C.hood, 0.62);

  /* ── TİLKİ: özel, daha uzun/az "tatlı" siluet — ayrı çizim dalı ── */
  if (id === 'tilki') {
    const footY2 = ty + 24 * s;
    const hipY2 = ty + 6 * s;
    const waistY2 = ty - 6 * s;
    const shoulderY2 = ty - 15 * s;
    const headR2 = 7.6 * s;
    const headY2 = ty - 23 * s;
    const hx2 = x + fx * 1.1 * s;
    const swayT = Math.sin(t * 2.1) * 1.1 * s;
    const stepT = Math.sin(wp * 9) * 2.6 * s;

    /* kuyruk — arkada, kalça hizasından savrulan kürk */
    blob('#f2f0ea', () => {
      ctx.moveTo(x - 3.6 * s, hipY2 + 2 * s);
      ctx.quadraticCurveTo(x - 13 * s + swayT, hipY2 - 4 * s, x - 12 * s + swayT, hipY2 - 15 * s);
      ctx.quadraticCurveTo(x - 7.5 * s + swayT, hipY2 - 11 * s, x - 6.5 * s + swayT, hipY2 - 3 * s);
      ctx.quadraticCurveTo(x - 6.5 * s + swayT, hipY2 + 2 * s, x - 2 * s, hipY2 + 3 * s);
    }, 1.3);

    /* pelerin — kırmızı, kürk yakalı, omuzdan aşağı süzülen */
    blob(C.cloak, () => {
      ctx.moveTo(x - 6.2 * s, shoulderY2 + 1 * s);
      ctx.quadraticCurveTo(x - 12 * s + swayT, shoulderY2 + 10 * s, x - 10.5 * s + swayT, footY2 - 10 * s);
      ctx.quadraticCurveTo(x - 6 * s + swayT * 0.7, footY2 - 14 * s, x - 4 * s + swayT * 0.5, footY2 - 6 * s);
      ctx.quadraticCurveTo(x - 1 * s + swayT * 0.5, footY2 - 12 * s, x, hipY2 + 2 * s);
      ctx.quadraticCurveTo(x + 6.2 * s, shoulderY2 + 8 * s, x + 6.2 * s, shoulderY2 + 1 * s);
    }, 1.4);
    /* kürk yaka */
    blob('#eceae2', () => ctx.ellipse(x, shoulderY2 + 1 * s, 6.6 * s, 2.4 * s, 0, 0, 6.283), 1.1);

    /* bacaklar — çıplak uyluk + diz üstü çizme (referans: thigh-high boots) */
    limb(x - 2.6 * s, hipY2 + 3 * s, x - 3.2 * s - stepT * 0.6, footY2 - 8 * s, 2.6 * s, skin);
    limb(x + 2.6 * s, hipY2 + 3 * s, x + 3.2 * s + stepT * 0.6, footY2 - 8 * s, 2.6 * s, skin);
    blob('#1c1f28', () => ctx.roundRect(x - 4.6 * s - stepT * 0.6, footY2 - 9 * s, 3 * s, 9 * s, 1.2 * s), 1.1);
    blob('#1c1f28', () => ctx.roundRect(x + 1.6 * s + stepT * 0.6, footY2 - 9 * s, 3 * s, 9 * s, 1.2 * s), 1.1);
    blob('#12141c', () => ctx.ellipse(x - 3.2 * s - stepT * 0.6, footY2 - 0.5 * s, 2.6 * s, 1.6 * s, 0, 0, 6.283), 1.2);
    blob('#12141c', () => ctx.ellipse(x + 3.2 * s + stepT * 0.6, footY2 - 0.5 * s, 2.6 * s, 1.6 * s, 0, 0, 6.283), 1.2);

    /* etek — koyu, dar belden dışa açılan */
    blob('#262b38', () => {
      ctx.moveTo(x - 4.4 * s, waistY2 + 3 * s);
      ctx.lineTo(x - 7.6 * s, hipY2 + 5 * s);
      ctx.quadraticCurveTo(x, hipY2 + 8 * s, x + 7.6 * s, hipY2 + 5 * s);
      ctx.lineTo(x + 4.4 * s, waistY2 + 3 * s);
      ctx.quadraticCurveTo(x, waistY2 + 6 * s, x - 4.4 * s, waistY2 + 3 * s);
    }, 1.3);

    /* üst gövde — açık ton korse/bluz, dar bel */
    blob('#efe9dc', () => {
      ctx.moveTo(x - 5 * s, shoulderY2 + 2 * s);
      ctx.quadraticCurveTo(x, shoulderY2 - 1 * s, x + 5 * s, shoulderY2 + 2 * s);
      ctx.quadraticCurveTo(x + 5.2 * s, waistY2 - 2 * s, x + 3.6 * s, waistY2 + 3 * s);
      ctx.quadraticCurveTo(x, waistY2 + 6 * s, x - 3.6 * s, waistY2 + 3 * s);
      ctx.quadraticCurveTo(x - 5.2 * s, waistY2 - 2 * s, x - 5 * s, shoulderY2 + 2 * s);
    }, 1.2);
    blob('#1c1f28', () => ctx.roundRect(x - 3 * s, waistY2 - 1 * s, 6 * s, 3.6 * s, 1 * s), 1);

    /* arka kol — kılıcın kınına uzanan */
    limb(x - 5.4 * s, shoulderY2 + 2 * s, x - 8.4 * s, waistY2 + 6 * s, 2.4 * s, C.cloak);
    blob(skin, () => ctx.arc(x - 8.4 * s, waistY2 + 6.6 * s, 1.8 * s, 0, 6.283), 1.1);

    /* ön kol + katana — düz, ince, aksiyon pozunda öne uzanmış */
    const hdx2 = x + (7 + swing * 2.2) * s;
    const hdy2 = shoulderY2 + (4 - swing * 8) * s;
    limb(x + 5.4 * s, shoulderY2 + 2 * s, hdx2, hdy2, 2.4 * s, C.cloak);
    blob(skin, () => ctx.arc(hdx2, hdy2, 1.8 * s, 0, 6.283), 1.1);
    ctx.save();
    ctx.translate(hdx2, hdy2);
    ctx.rotate(0.45 - swing * 1.5);
    blob('#8a6a4a', () => ctx.roundRect(-2.2 * s, -3.4 * s, 4.4 * s, 3.4 * s, 0.6 * s), 0.9);
    ctx.strokeStyle = '#12141c'; ctx.lineWidth = lw(1.4);
    ctx.beginPath(); ctx.moveTo(0, -3.4 * s); ctx.lineTo(0, -14.5 * s); ctx.stroke();
    ctx.strokeStyle = '#c9ccd4'; ctx.lineWidth = lw(1);
    ctx.beginPath(); ctx.moveTo(0, -3.6 * s); ctx.lineTo(0, -14.4 * s); ctx.stroke();
    ctx.restore();

    /* kafa + uzun beyaz saç + tilki kulakları */
    blob(skin, () => ctx.arc(hx2, headY2, headR2, 0, 6.283), 1.6);
    ctx.fillStyle = 'rgba(0,0,0,0.08)';
    ctx.beginPath(); ctx.ellipse(hx2, headY2 + headR2 * 0.55, headR2 * 0.6, headR2 * 0.28, 0, 0, 6.283); ctx.fill();

    blob('#f5f6f8', () => {
      ctx.moveTo(hx2 - headR2 * 0.7, headY2 - headR2 * 0.25);
      ctx.quadraticCurveTo(hx2 - headR2 * 2, headY2 + 3 * s, hx2 - headR2 * 1.55 + swayT, headY2 + 13 * s);
      ctx.quadraticCurveTo(hx2 - headR2 * 1.05 + swayT, headY2 + 8 * s, hx2 - headR2 * 0.9, headY2 + 1 * s);
    }, 1.3);
    blob('#f5f6f8', () => {
      ctx.moveTo(hx2 + headR2 * 0.7, headY2 - headR2 * 0.25);
      ctx.quadraticCurveTo(hx2 + headR2 * 2, headY2 + 3 * s, hx2 + headR2 * 1.55 + swayT, headY2 + 13 * s);
      ctx.quadraticCurveTo(hx2 + headR2 * 1.05 + swayT, headY2 + 8 * s, hx2 + headR2 * 0.9, headY2 + 1 * s);
    }, 1.3);
    blob('#f5f6f8', () => ctx.arc(hx2, headY2 - 1 * s, headR2 * 1.06, Math.PI * 1.02, Math.PI * 1.98), 1.3);
    blob(C.hood, () => {
      ctx.moveTo(hx2 - headR2 * 0.55, headY2 - headR2 * 0.85);
      ctx.lineTo(hx2 - headR2 * 1.2, headY2 - headR2 * 2.1);
      ctx.lineTo(hx2 - headR2 * 0.02, headY2 - headR2 * 1.05);
    }, 1.2);
    blob(C.hood, () => {
      ctx.moveTo(hx2 + headR2 * 0.55, headY2 - headR2 * 0.85);
      ctx.lineTo(hx2 + headR2 * 1.2, headY2 - headR2 * 2.1);
      ctx.lineTo(hx2 + headR2 * 0.02, headY2 - headR2 * 1.05);
    }, 1.2);

    /* yüz — mavi göz, sade */
    const eyY2 = headY2 - 0.4 * s, eSp2 = 2.9 * s;
    blob('#ffffff', () => ctx.ellipse(hx2 - eSp2 + fx * s, eyY2, 1.9 * s, 2.2 * s, 0, 0, 6.283), 0.9);
    blob('#ffffff', () => ctx.ellipse(hx2 + eSp2 + fx * s, eyY2, 1.9 * s, 2.2 * s, 0, 0, 6.283), 0.9);
    dot(C.eye, hx2 - eSp2 + fx * 1.6 * s, eyY2 + 0.2 * s, 1.1 * s);
    dot(C.eye, hx2 + eSp2 + fx * 1.6 * s, eyY2 + 0.2 * s, 1.1 * s);
    dot('#141722', hx2 - eSp2 + fx * 1.6 * s, eyY2 + 0.2 * s, 0.55 * s);
    dot('#141722', hx2 + eSp2 + fx * 1.6 * s, eyY2 + 0.2 * s, 0.55 * s);

    /* kenar ışığı */
    ctx.save();
    ctx.shadowColor = C.eye; ctx.shadowBlur = 4 * s;
    ctx.strokeStyle = C.rim; ctx.lineWidth = lw(1.2);
    ctx.beginPath(); ctx.arc(hx2, headY2, headR2 + 0.3 * s, -0.5, 0.7); ctx.stroke();
    ctx.restore();
    return;
  }

  /* ── SIRT TAKIMI ── */
  if (id === 'kolcu') {
    ctx.strokeStyle = '#5a4228'; ctx.lineWidth = lw(2);
    ctx.beginPath(); ctx.arc(x - 5 * s, ty + 1 * s, 12 * s, Math.PI * 0.74, Math.PI * 1.4); ctx.stroke();
    ctx.strokeStyle = 'rgba(230,238,248,0.55)'; ctx.lineWidth = lw(0.8);
    ctx.beginPath();
    ctx.moveTo(x - 5 * s + Math.cos(Math.PI * 0.74) * 12 * s, ty + 1 * s + Math.sin(Math.PI * 0.74) * 12 * s);
    ctx.lineTo(x - 5 * s + Math.cos(Math.PI * 1.4) * 12 * s, ty + 1 * s + Math.sin(Math.PI * 1.4) * 12 * s);
    ctx.stroke();
  }

  /* ── ARKA KOL ── */
  limb(x - 6 * wf * s, ty + 0.5 * s, x - 8.2 * wf * s, ty + 6.5 * s + sway * 0.4, armW, tunic);
  blob(skin, () => ctx.arc(x - 8.2 * wf * s, ty + 7.2 * s + sway * 0.4, 1.9 * s, 0, 6.283), 1.2);

  /* ── BACAKLAR + BOTLAR ── */
  if (!robe) {
    limb(x - 3.4 * s, hipY, x - 3.4 * s - step * 0.7, footY - 1.4 * s, legW, legC);
    limb(x + 3.4 * s, hipY, x + 3.4 * s + step * 0.7, footY - 1.4 * s, legW, legC);
    blob(bootC, () => ctx.ellipse(x - 3.2 * s - step * 0.7, footY - 0.8 * s, 3 * s, 2 * s, 0, 0, 6.283), 1.3);
    blob(bootC, () => ctx.ellipse(x + 3.6 * s + step * 0.7, footY - 0.8 * s, 3 * s, 2 * s, 0, 0, 6.283), 1.3);
  }

  /* ── GÖVDE ── */
  if (robe) {
    blob(tunic, () => {
      ctx.moveTo(x - 6.6 * s, ty - 3.5 * s);
      ctx.quadraticCurveTo(x, ty - 5.5 * s, x + 6.6 * s, ty - 3.5 * s);
      ctx.quadraticCurveTo(x + 9 * s, ty + 8 * s, x + 7.5 * s + sway, footY + 0.5 * s);
      ctx.lineTo(x + 4.5 * s + sway, footY - 2.5 * s);
      ctx.lineTo(x + 1.5 * s + sway * 0.6, footY + 1 * s);
      ctx.lineTo(x - 1.5 * s + sway * 0.6, footY - 2.5 * s);
      ctx.lineTo(x - 4.5 * s + sway, footY + 1 * s);
      ctx.lineTo(x - 7.5 * s + sway, footY - 1.5 * s);
      ctx.quadraticCurveTo(x - 9 * s, ty + 8 * s, x - 6.6 * s, ty - 3.5 * s);
    });
    /* cüppe içi ışıltı */
    ctx.strokeStyle = C.rim; ctx.lineWidth = lw(1);
    ctx.beginPath();
    ctx.moveTo(x - 3 * s, ty + 2 * s);
    ctx.quadraticCurveTo(x - 3.5 * s + sway * 0.5, ty + 9 * s, x - 2.5 * s + sway, footY - 3 * s);
    ctx.stroke();
  } else {
    blob(tunic, () => {
      ctx.moveTo(x - 6.6 * wf * s, ty - 3.5 * s);
      ctx.quadraticCurveTo(x, ty - 5.5 * s, x + 6.6 * wf * s, ty - 3.5 * s);
      ctx.quadraticCurveTo(x + 8.4 * wf * s, ty + 5.5 * s, x + 6.6 * wf * s + sway * 0.4, hipY + 3 * s);
      ctx.quadraticCurveTo(x, hipY + 5.2 * s, x - 6.6 * wf * s + sway * 0.4, hipY + 3 * s);
      ctx.quadraticCurveTo(x - 8.4 * wf * s, ty + 5.5 * s, x - 6.6 * wf * s, ty - 3.5 * s);
    });
    ctx.strokeStyle = shade(C.cloak, 1.45); ctx.lineWidth = lw(1); ctx.globalAlpha = 0.65;
    ctx.beginPath();
    ctx.moveTo(x - 5 * wf * s, ty - 2.2 * s);
    ctx.quadraticCurveTo(x - 6.8 * wf * s, ty + 3 * s, x - 5.2 * wf * s, hipY + 1.5 * s);
    ctx.stroke();
    ctx.globalAlpha = 1;

    /* kemer + arma tokası */
    blob('#2a2018', () => {
      ctx.moveTo(x - 7.2 * wf * s, ty + 4.2 * s);
      ctx.quadraticCurveTo(x, ty + 6.4 * s, x + 7.2 * wf * s, ty + 4.2 * s);
      ctx.lineTo(x + 6.9 * wf * s, ty + 7 * s);
      ctx.quadraticCurveTo(x, ty + 9 * s, x - 6.9 * wf * s, ty + 7 * s);
    }, 1.1);
    blob(C.emblem, () => ctx.roundRect(x - 2.2 * s, ty + 4.9 * s, 4.4 * s, 3.4 * s, 1 * s), 1);
    dot('#141722', x, ty + 6.6 * s, 0.9 * s);
  }

  /* ── gövde özel katmanlar ── */
  if (id === 'kasap') {
    blob(shade(C.hood, 1.12), () => ctx.arc(x - 8.6 * s, ty - 3.2 * s, 4 * s, 0, 6.283), 1.3);
    blob(shade(C.hood, 1.12), () => ctx.arc(x + 8.6 * s, ty - 3.2 * s, 4 * s, 0, 6.283), 1.3);
    blob('#4a3226', () => {
      ctx.moveTo(x - 4.6 * s, ty - 2.5 * s); ctx.lineTo(x + 4.6 * s, ty - 2.5 * s);
      ctx.lineTo(x + 3.8 * s, hipY + 3.5 * s); ctx.lineTo(x - 3.8 * s, hipY + 3.5 * s);
    }, 1.2);
    dot('rgba(163,18,38,0.4)', x + 1.4 * s, ty + 4 * s, 1.8 * s);
  } else if (id === 'barutcu') {
    ctx.strokeStyle = '#4a3520'; ctx.lineWidth = lw(2.6);
    ctx.beginPath(); ctx.moveTo(x - 6 * s, ty - 3.5 * s); ctx.lineTo(x + 5.5 * s, ty + 6 * s); ctx.stroke();
    for (let i = 0; i < 3; i++) {
      blob('#1a1410', () => ctx.roundRect(x - 4.6 * s + i * 4 * s, ty - 2.4 * s + i * 2.9 * s, 2.4 * s, 3.6 * s, 0.8 * s), 0.8);
    }
  } else if (id === 'gulyabani') {
    ctx.strokeStyle = shade(C.cloak, 0.55); ctx.lineWidth = lw(1);
    ctx.beginPath();
    ctx.moveTo(x + 2 * s, ty - 1 * s); ctx.lineTo(x + 5 * s, ty + 2 * s);
    ctx.moveTo(x + 2.8 * s, ty + 1.4 * s); ctx.lineTo(x + 4.2 * s, ty - 0.4 * s);
    ctx.stroke();
  }

  /* ── KAFA ── */
  blob(skin, () => ctx.arc(hx, headY, headR, 0, 6.283), 1.8);
  /* çene gölgesi */
  ctx.fillStyle = 'rgba(0,0,0,0.08)';
  ctx.beginPath(); ctx.ellipse(hx, headY + headR * 0.55, headR * 0.62, headR * 0.3, 0, 0, 6.283); ctx.fill();

  const eyY = headY - 0.4 * s;
  const eSp = 3.5 * s;
  const face = id !== 'cellat' && id !== 'azrail';

  if (id === 'azrail') {
    /* KURUKAFA yüz — efsanevi patron havası */
    ctx.fillStyle = '#141722';
    ctx.beginPath(); ctx.ellipse(hx - 3.2 * s + fx * s, eyY, 2.6 * s, 3 * s, 0, 0, 6.283); ctx.fill();
    ctx.beginPath(); ctx.ellipse(hx + 3.2 * s + fx * s, eyY, 2.6 * s, 3 * s, 0, 0, 6.283); ctx.fill();
    ctx.shadowColor = C.eye; ctx.shadowBlur = 6 * s;
    dot(C.eye, hx - 3.2 * s + fx * 1.6 * s, eyY, 1.1 * s);
    dot(C.eye, hx + 3.2 * s + fx * 1.6 * s, eyY, 1.1 * s);
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#141722';
    ctx.beginPath();
    ctx.moveTo(hx + fx * s, headY + 2.2 * s);
    ctx.lineTo(hx - 1 * s + fx * s, headY + 4 * s);
    ctx.lineTo(hx + 1 * s + fx * s, headY + 4 * s);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#141722'; ctx.lineWidth = lw(1.1);
    ctx.beginPath(); ctx.moveTo(hx - 3.4 * s, headY + 6.2 * s); ctx.lineTo(hx + 3.4 * s, headY + 6.2 * s);
    for (let i = -1; i <= 1; i++) { ctx.moveTo(hx + i * 2 * s, headY + 6.2 * s); ctx.lineTo(hx + i * 2 * s, headY + 7.6 * s); }
    ctx.stroke();
    /* altın taç */
    blob('#f2b23c', () => {
      ctx.moveTo(hx - 6.5 * s, headY - 6.2 * s);
      ctx.lineTo(hx - 6 * s, headY - 11.5 * s); ctx.lineTo(hx - 3.4 * s, headY - 8.2 * s);
      ctx.lineTo(hx, headY - 13 * s); ctx.lineTo(hx + 3.4 * s, headY - 8.2 * s);
      ctx.lineTo(hx + 6 * s, headY - 11.5 * s); ctx.lineTo(hx + 6.5 * s, headY - 6.2 * s);
    }, 1.3);
    dot('#ff5063', hx, headY - 8.6 * s, 1 * s);
  } else if (id === 'cellat') {
    /* tam yüz kapatan infazcı kukuletası */
    blob(C.hood, () => {
      ctx.moveTo(hx - headR * 0.98, headY + headR * 0.55);
      ctx.quadraticCurveTo(hx - headR * 1.12, headY - headR * 0.7, hx - 2 * s, headY - headR * 1.12);
      ctx.quadraticCurveTo(hx + 3 * s, headY - headR * 1.35, hx + headR * 1.02, headY - headR * 0.25);
      ctx.quadraticCurveTo(hx + headR * 1.05, headY + headR * 0.6, hx, headY + headR * 0.98);
      ctx.quadraticCurveTo(hx - headR * 0.7, headY + headR * 0.9, hx - headR * 0.98, headY + headR * 0.55);
    }, 1.8);
    ctx.strokeStyle = shade(C.hood, 0.6); ctx.lineWidth = lw(1);
    ctx.beginPath(); ctx.moveTo(hx - 4 * s, headY - 7 * s); ctx.quadraticCurveTo(hx + 1 * s, headY - 9 * s, hx + 5 * s, headY - 5.5 * s); ctx.stroke();
    /* göz yarığı + kor gözler */
    ctx.fillStyle = '#0a0810';
    ctx.beginPath(); ctx.ellipse(hx + fx * s, eyY, 6 * s, 2.4 * s, 0, 0, 6.283); ctx.fill();
    ctx.shadowColor = C.eye; ctx.shadowBlur = 6 * s;
    ctx.fillStyle = C.eye;
    ctx.fillRect(hx - 3.6 * s + fx * 1.4 * s, eyY - 1 * s, 2 * s, 2 * s);
    ctx.fillRect(hx + 1.6 * s + fx * 1.4 * s, eyY - 1 * s, 2 * s, 2 * s);
    ctx.shadowBlur = 0;
  }

  if (face) {
    /* göz akı + iris + ışıltı */
    blob('#ffffff', () => ctx.ellipse(hx - eSp + fx * 1.2 * s, eyY, 2.35 * s, 2.7 * s, 0, 0, 6.283), 1);
    blob('#ffffff', () => ctx.ellipse(hx + eSp + fx * 1.2 * s, eyY, 2.35 * s, 2.7 * s, 0, 0, 6.283), 1);
    const ix = fx * 2 * s;
    dot(C.eye, hx - eSp + ix, eyY + 0.3 * s, 1.35 * s);
    dot(C.eye, hx + eSp + ix, eyY + 0.3 * s, 1.35 * s);
    dot('#141722', hx - eSp + ix, eyY + 0.3 * s, 0.7 * s);
    dot('#141722', hx + eSp + ix, eyY + 0.3 * s, 0.7 * s);
    dot('rgba(255,255,255,0.95)', hx - eSp + ix - 0.5 * s, eyY - 0.6 * s, 0.5 * s);
    dot('rgba(255,255,255,0.95)', hx + eSp + ix - 0.5 * s, eyY - 0.6 * s, 0.5 * s);
    /* kararlı kaşlar */
    ctx.strokeStyle = id === 'gulyabani' ? '#3e5c22' : '#3a2a1e'; ctx.lineWidth = lw(1.5);
    ctx.beginPath();
    ctx.moveTo(hx - eSp - 2 * s + ix, eyY - 4 * s); ctx.lineTo(hx - eSp + 1.7 * s + ix, eyY - 2.9 * s);
    ctx.moveTo(hx + eSp + 2 * s + ix, eyY - 4 * s); ctx.lineTo(hx + eSp - 1.7 * s + ix, eyY - 2.9 * s);
    ctx.stroke();

    if (id === 'gulyabani') {
      /* alt çeneli sırıtış + iki azı dişi */
      blob(shade(skin, 0.8), () => {
        ctx.moveTo(hx - 3.6 * s + fx * s, headY + 3.2 * s);
        ctx.quadraticCurveTo(hx + fx * s, headY + 6.6 * s, hx + 3.6 * s + fx * s, headY + 3.2 * s);
        ctx.quadraticCurveTo(hx + fx * s, headY + 4.6 * s, hx - 3.6 * s + fx * s, headY + 3.2 * s);
      }, 1.1);
      blob('#f4f0e2', () => { ctx.moveTo(hx - 2.8 * s + fx * s, headY + 3.6 * s); ctx.lineTo(hx - 1.9 * s + fx * s, headY + 1.8 * s); ctx.lineTo(hx - 1 * s + fx * s, headY + 3.6 * s); }, 0.8);
      blob('#f4f0e2', () => { ctx.moveTo(hx + 1 * s + fx * s, headY + 3.6 * s); ctx.lineTo(hx + 1.9 * s + fx * s, headY + 1.8 * s); ctx.lineTo(hx + 2.8 * s + fx * s, headY + 3.6 * s); }, 0.8);
    } else if (id === 'kasap') {
      /* deri ağız maskesi + dikişler */
      blob('#8a6248', () => {
        ctx.moveTo(hx - 5.4 * s, headY + 1.4 * s);
        ctx.quadraticCurveTo(hx + fx * s, headY + 3 * s, hx + 5.4 * s, headY + 1.4 * s);
        ctx.quadraticCurveTo(hx + 4 * s, headY + 7.4 * s, hx, headY + 7.8 * s);
        ctx.quadraticCurveTo(hx - 4 * s, headY + 7.4 * s, hx - 5.4 * s, headY + 1.4 * s);
      }, 1.2);
      ctx.strokeStyle = '#4a3226'; ctx.lineWidth = lw(0.9);
      ctx.beginPath();
      ctx.moveTo(hx - 2.6 * s, headY + 3.4 * s); ctx.lineTo(hx - 1 * s, headY + 5 * s);
      ctx.moveTo(hx - 1 * s, headY + 3.4 * s); ctx.lineTo(hx - 2.6 * s, headY + 5 * s);
      ctx.moveTo(hx + 1.2 * s, headY + 3.6 * s); ctx.lineTo(hx + 2.8 * s, headY + 5.2 * s);
      ctx.moveTo(hx + 2.8 * s, headY + 3.6 * s); ctx.lineTo(hx + 1.2 * s, headY + 5.2 * s);
      ctx.stroke();
      /* kel kafada yara izi */
      ctx.strokeStyle = shade(skin, 0.62); ctx.lineWidth = lw(1);
      ctx.beginPath();
      ctx.moveTo(hx - 4 * s, headY - 6.5 * s); ctx.lineTo(hx - 1.6 * s, headY - 4.2 * s);
      ctx.moveTo(hx - 3.6 * s, headY - 5 * s); ctx.lineTo(hx - 2.4 * s, headY - 5.9 * s);
      ctx.stroke();
    } else {
      /* kendinden emin yarım gülümseme */
      ctx.strokeStyle = '#141722'; ctx.lineWidth = lw(1.2);
      ctx.beginPath();
      ctx.moveTo(hx - 1.4 * s + fx * s, headY + 4.4 * s);
      ctx.quadraticCurveTo(hx + 1.2 * s + fx * s, headY + 5.8 * s, hx + 3.2 * s + fx * s, headY + 4 * s);
      ctx.stroke();
      dot('rgba(230,120,110,0.25)', hx - eSp - 1 * s, headY + 3.2 * s, 1.5 * s);
      dot('rgba(230,120,110,0.25)', hx + eSp + 1 * s, headY + 3.2 * s, 1.5 * s);
    }
  }

  /* ── BAŞLIK / SAÇ ── */
  if (id === 'gulyabani') {
    blob(skin, () => { ctx.moveTo(hx - headR * 0.86, headY - 2 * s); ctx.lineTo(hx - headR * 1.5, headY - 4.5 * s); ctx.lineTo(hx - headR * 0.72, headY - 5 * s); }, 1.2);
    blob(skin, () => { ctx.moveTo(hx + headR * 0.86, headY - 2 * s); ctx.lineTo(hx + headR * 1.5, headY - 4.5 * s); ctx.lineTo(hx + headR * 0.72, headY - 5 * s); }, 1.2);
    blob('#3e5c22', () => {
      ctx.moveTo(hx - 4.5 * s, headY - 7.4 * s);
      ctx.lineTo(hx - 3 * s, headY - 11.5 * s); ctx.lineTo(hx - 1.4 * s, headY - 8.4 * s);
      ctx.lineTo(hx + 0.4 * s, headY - 12.4 * s); ctx.lineTo(hx + 2 * s, headY - 8.2 * s);
      ctx.lineTo(hx + 4.2 * s, headY - 10.5 * s); ctx.lineTo(hx + 4.8 * s, headY - 6.8 * s);
    }, 1.2);
  } else if (id === 'cadi' || id === 'seher' || id === 'simsek') {
    /* Uzun ak saç: üçünde de aynı; ŞAPKA/kukuleta yalnız büyücüde.
       Seher/Şimşek başı açık gezer (portreleriyle tutarlı). */
    ctx.strokeStyle = '#e4dff2'; ctx.lineWidth = lw(2.2);
    ctx.beginPath();
    ctx.moveTo(hx - headR * 0.8, headY - 3 * s);
    ctx.quadraticCurveTo(hx - headR * 1.25, headY + 4 * s, hx - headR * 0.85 + sway, headY + 9 * s);
    ctx.moveTo(hx + headR * 0.8, headY - 3 * s);
    ctx.quadraticCurveTo(hx + headR * 1.25, headY + 4 * s, hx + headR * 0.85 + sway, headY + 9 * s);
    ctx.stroke();
    if (id === 'seher') {
      /* alından geriye taranmış ak perçem + tek altın toka */
      blob('#efe6d6', () => {
        ctx.moveTo(hx - 5.0 * s, headY - headR * 0.55);
        ctx.quadraticCurveTo(hx - 4.4 * s, headY - headR * 1.5, hx + 0.6 * s, headY - headR * 1.62);
        ctx.quadraticCurveTo(hx + 4.8 * s, headY - headR * 1.45, hx + 5.0 * s, headY - headR * 0.5);
        ctx.quadraticCurveTo(hx, headY - headR * 1.05, hx - 5.0 * s, headY - headR * 0.55);
      }, 1.3);
      dot(C.emblem, hx + 3.6 * s, headY - headR * 0.95, 1.2 * s);
    } else if (id === 'simsek') {
      /* şakakta çakan küçük şimşek işareti — altın toka yerine elektrik */
      ctx.save();
      ctx.shadowColor = C.eye; ctx.shadowBlur = 6 * s;
      ctx.strokeStyle = C.emblem; ctx.lineWidth = lw(1.6);
      ctx.beginPath();
      ctx.moveTo(hx + 3.2 * s, headY - headR * 1.3);
      ctx.lineTo(hx + 1.6 * s, headY - headR * 1.02);
      ctx.lineTo(hx + 2.6 * s, headY - headR * 0.96);
      ctx.lineTo(hx + 1.2 * s, headY - headR * 0.68);
      ctx.stroke();
      ctx.restore();
    } else {
    blob(C.hood, () => ctx.ellipse(hx, headY - headR * 0.62, headR * 1.18, 2.8 * s, -0.05, 0, 6.283), 1.4);
    blob(C.hood, () => {
      ctx.moveTo(hx - 4.8 * s, headY - headR * 0.7);
      ctx.quadraticCurveTo(hx - 3 * s, headY - headR * 1.7, hx - 2 * s, headY - headR * 2.15);
      ctx.quadraticCurveTo(hx - 1 * s, headY - headR * 2.55, hx + 3 * s + sway * 0.6, headY - headR * 2.4);
      ctx.quadraticCurveTo(hx, headY - headR * 1.9, hx + 4.8 * s, headY - headR * 0.68);
    }, 1.4);
    ctx.strokeStyle = shade(C.hood, 0.55); ctx.lineWidth = lw(1.6);
    ctx.beginPath(); ctx.moveTo(hx - 4.2 * s, headY - headR * 0.85); ctx.quadraticCurveTo(hx, headY - headR * 1.05, hx + 4.2 * s, headY - headR * 0.83); ctx.stroke();
    dot(C.emblem, hx - 0.3 * s, headY - headR * 1.15, 1.4 * s);
    }
  } else if (id === 'buyucu') {
    blob('#e8e4da', () => {
      ctx.moveTo(hx - 4.6 * s, headY + 2 * s);
      ctx.quadraticCurveTo(hx - 5 * s, headY + 9 * s, hx, headY + 11 * s);
      ctx.quadraticCurveTo(hx + 5 * s, headY + 9 * s, hx + 4.6 * s, headY + 2 * s);
      ctx.quadraticCurveTo(hx, headY + 5 * s, hx - 4.6 * s, headY + 2 * s);
    }, 1.2);
    blob(C.hood, () => ctx.ellipse(hx, headY - headR * 0.6, headR * 1.12, 2.6 * s, -0.05, 0, 6.283), 1.4);
    blob(C.hood, () => {
      ctx.moveTo(hx - 4.4 * s, headY - headR * 0.68);
      ctx.quadraticCurveTo(hx - 2 * s, headY - headR * 1.9, hx + 1.5 * s, headY - headR * 1.85);
      ctx.quadraticCurveTo(hx + 5 * s + sway * 0.5, headY - headR * 2.1, hx + 4.5 * s, headY - headR * 0.66);
    }, 1.4);
    dot(C.emblem, hx - 0.2 * s, headY - headR * 1.05, 1.3 * s);
  } else if (id === 'barutcu') {
    blob('#4a3520', () => {
      ctx.arc(hx, headY - 1.5 * s, headR * 0.99, Math.PI * 1.02, Math.PI * 1.98);
      ctx.quadraticCurveTo(hx + headR, headY - 4.2 * s, hx + headR * 0.9, headY - 3.6 * s);
      ctx.quadraticCurveTo(hx, headY - 2 * s, hx - headR * 0.9, headY - 3.6 * s);
    }, 1.4);
    /* alında pirinç gözlük */
    ctx.strokeStyle = '#2a1e10'; ctx.lineWidth = lw(1.6);
    ctx.beginPath(); ctx.moveTo(hx - headR * 0.9, headY - 5 * s); ctx.quadraticCurveTo(hx, headY - 6.6 * s, hx + headR * 0.9, headY - 5 * s); ctx.stroke();
    blob('#c8a84a', () => ctx.arc(hx - 3 * s, headY - 5.8 * s, 2.1 * s, 0, 6.283), 1);
    blob('#c8a84a', () => ctx.arc(hx + 3 * s, headY - 5.8 * s, 2.1 * s, 0, 6.283), 1);
    dot('#8fd8ff', hx - 3 * s, headY - 5.8 * s, 1.1 * s);
    dot('#8fd8ff', hx + 3 * s, headY - 5.8 * s, 1.1 * s);
    /* tepede fitil + kıvılcım */
    ctx.strokeStyle = '#8a6a3a'; ctx.lineWidth = lw(1.1);
    ctx.beginPath(); ctx.moveTo(hx + 1 * s, headY - headR * 1.02); ctx.quadraticCurveTo(hx + 3 * s, headY - headR * 1.3, hx + 4.6 * s, headY - headR * 1.16); ctx.stroke();
    const kp = 0.5 + Math.sin(t * 12.5) * 0.5;
    ctx.shadowColor = '#ff8a3c'; ctx.shadowBlur = 6 * s * kp;
    dot('#ffd08a', hx + 4.9 * s, headY - headR * 1.18, (1 + kp * 0.5) * s);
    ctx.shadowBlur = 0;
  } else if (id === 'kolcu') {
    blob(C.hood, () => {
      ctx.arc(hx, headY - 1 * s, headR * 1.02, Math.PI * 0.96, Math.PI * 2.06);
      ctx.quadraticCurveTo(hx + headR * 1.15, headY + 1 * s, hx + headR * 0.8, headY + 3 * s);
      ctx.quadraticCurveTo(hx + headR * 0.55, headY - 0.5 * s, hx + headR * 0.5, headY - 2 * s);
      ctx.moveTo(hx - headR * 1.02, headY - 1 * s);
      ctx.quadraticCurveTo(hx - headR * 1.15, headY + 1 * s, hx - headR * 0.8, headY + 3 * s);
      ctx.quadraticCurveTo(hx - headR * 0.55, headY - 0.5 * s, hx - headR * 0.5, headY - 2 * s);
    }, 1.5);
    ctx.strokeStyle = C.emblem; ctx.lineWidth = lw(1.2);
    ctx.beginPath();
    ctx.moveTo(hx + headR * 0.75, headY - headR * 0.62);
    ctx.quadraticCurveTo(hx + headR * 1.35, headY - headR * 0.35, hx + headR * 1.45, headY + 1 * s);
    ctx.stroke();
    /* saç perçemi */
    ctx.strokeStyle = '#6a4a2c'; ctx.lineWidth = lw(1.6);
    ctx.beginPath();
    ctx.moveTo(hx - 3.4 * s, headY - headR * 0.7); ctx.quadraticCurveTo(hx - 1.6 * s, headY - headR * 0.45, hx - 2.2 * s, headY - headR * 0.2);
    ctx.moveTo(hx + 0.4 * s, headY - headR * 0.75); ctx.quadraticCurveTo(hx + 2 * s, headY - headR * 0.5, hx + 1.4 * s, headY - headR * 0.22);
    ctx.stroke();
  } else if (id !== 'kasap' && id !== 'cellat' && id !== 'azrail') {
    /* HASATÇI: açık kapüşon çerçevesi + perçem */
    blob(C.hood, () => {
      ctx.arc(hx, headY - 1 * s, headR * 1.04, Math.PI * 0.92, Math.PI * 2.08);
      ctx.quadraticCurveTo(hx + headR * 1.1, headY + 2 * s, hx + headR * 0.72, headY + 4.5 * s);
      ctx.quadraticCurveTo(hx + headR * 0.6, headY, hx + headR * 0.52, headY - 2.5 * s);
      ctx.moveTo(hx - headR * 1.04, headY - 1 * s);
      ctx.quadraticCurveTo(hx - headR * 1.1, headY + 2 * s, hx - headR * 0.72, headY + 4.5 * s);
      ctx.quadraticCurveTo(hx - headR * 0.6, headY, hx - headR * 0.52, headY - 2.5 * s);
    }, 1.5);
    ctx.strokeStyle = '#6a4a2c'; ctx.lineWidth = lw(1.6);
    ctx.beginPath();
    ctx.moveTo(hx - 2.6 * s, headY - headR * 0.68); ctx.quadraticCurveTo(hx - 0.8 * s, headY - headR * 0.4, hx - 1.6 * s, headY - headR * 0.16);
    ctx.moveTo(hx + 1.2 * s, headY - headR * 0.7); ctx.quadraticCurveTo(hx + 2.8 * s, headY - headR * 0.44, hx + 2 * s, headY - headR * 0.18);
    ctx.stroke();
  }

  /* ── ÖN KOL + SİLAH ── */
  const hdx = x + (8.4 * wf + swing * 2.5) * s;
  const hdy = ty + (5.8 - swing * 10) * s;
  limb(x + 6 * wf * s, ty + 0.5 * s, hdx, hdy, armW, tunic);
  blob(skin, () => ctx.arc(hdx, hdy, 2 * s, 0, 6.283), 1.2);

  ctx.save();
  ctx.translate(hdx, hdy);
  ctx.rotate(0.5 - swing * 1.7);
  if (id === 'cadi' || id === 'buyucu') {
    ctx.strokeStyle = '#5a4430'; ctx.lineWidth = lw(2);
    ctx.beginPath(); ctx.moveTo(0, 4 * s); ctx.lineTo(0, -13 * s); ctx.stroke();
    const op = 0.75 + Math.sin(t * 2.8) * 0.25;
    ctx.shadowColor = C.eye; ctx.shadowBlur = 9 * s * op;
    dot(C.eye, 0, -15.2 * s, 2.6 * s);
    ctx.shadowBlur = 0;
    dot('rgba(255,255,255,0.85)', -0.8 * s, -16 * s, 0.8 * s);
  } else if (id === 'gulyabani') {
    blob('#7a5a38', () => {
      ctx.moveTo(-1.6 * s, -1 * s); ctx.lineTo(-2.6 * s, -11 * s);
      ctx.quadraticCurveTo(0, -14 * s, 2.6 * s, -11 * s); ctx.lineTo(1.6 * s, -1 * s);
    }, 1.4);
    dot('#3a2a18', -0.8 * s, -10 * s, 0.7 * s);
    dot('#3a2a18', 0.9 * s, -7.5 * s, 0.7 * s);
  } else if (id === 'kasap') {
    blob('#cfd4e0', () => {
      ctx.moveTo(-1.4 * s, -3.5 * s); ctx.lineTo(-1.4 * s, -12.5 * s);
      ctx.lineTo(6.8 * s, -12.5 * s); ctx.lineTo(7.6 * s, -4 * s);
    }, 1.4);
    blob('#4a3020', () => ctx.roundRect(-1.3 * s, -3.6 * s, 2.6 * s, 6 * s, 1 * s), 1.1);
    dot('#6a7085', 5.4 * s, -10.8 * s, 0.8 * s);
    dot('rgba(163,18,38,0.45)', 3 * s, -8 * s, 1.5 * s);
  } else if (id === 'cellat') {
    ctx.strokeStyle = '#5a4228'; ctx.lineWidth = lw(2.2);
    ctx.beginPath(); ctx.moveTo(0, 3 * s); ctx.lineTo(0, -13 * s); ctx.stroke();
    blob('#cfd4e0', () => {
      ctx.moveTo(0, -13.5 * s);
      ctx.quadraticCurveTo(6.5 * s, -14.5 * s, 7.5 * s, -8.5 * s);
      ctx.quadraticCurveTo(4 * s, -9.5 * s, 0, -9 * s);
    }, 1.4);
  } else if (id === 'azrail') {
    ctx.strokeStyle = '#4a3a52'; ctx.lineWidth = lw(2.2);
    ctx.beginPath(); ctx.moveTo(1.5 * s, 3 * s); ctx.lineTo(-1 * s, -15 * s); ctx.stroke();
    blob('#dfe4f0', () => {
      ctx.moveTo(-1 * s, -15 * s);
      ctx.quadraticCurveTo(-9.5 * s, -16.5 * s, -11 * s, -9.5 * s);
      ctx.quadraticCurveTo(-6 * s, -12.4 * s, -0.4 * s, -11.4 * s);
    }, 1.4);
    ctx.strokeStyle = C.eye; ctx.lineWidth = lw(0.9);
    ctx.beginPath();
    ctx.moveTo(-1.6 * s, -14.4 * s);
    ctx.quadraticCurveTo(-8 * s, -15.4 * s, -9.6 * s, -10.6 * s);
    ctx.stroke();
  } else if (id === 'kolcu') {
    blob('#dfe4f0', () => {
      ctx.moveTo(-1 * s, -2 * s); ctx.lineTo(-1.2 * s, -9 * s);
      ctx.quadraticCurveTo(0, -11 * s, 1.5 * s, -8.6 * s); ctx.lineTo(1 * s, -2 * s);
    }, 1.2);
    blob('#c8a84a', () => ctx.roundRect(-2 * s, -2.4 * s, 4 * s, 1.6 * s, 0.7 * s), 0.9);
  } else if (id === 'simsek') {
    /* elde değil: yanında süzülen şimşek kırığının küçük bir yankısı —
       parlayan çentikli bir cam parçası gibi */
    const zp = 0.7 + Math.sin(t * 9) * 0.3;
    ctx.save();
    ctx.shadowColor = C.eye; ctx.shadowBlur = 8 * s * zp;
    blob(C.emblem, () => {
      ctx.moveTo(0.6 * s, -14 * s);
      ctx.lineTo(-2.4 * s, -6.6 * s);
      ctx.lineTo(-0.4 * s, -6.2 * s);
      ctx.lineTo(-1.8 * s, -1 * s);
      ctx.lineTo(2.6 * s, -8.4 * s);
      ctx.lineTo(0.8 * s, -8.8 * s);
    }, 1);
    ctx.restore();
  } else {
    /* hasatçı: hilal kılıç */
    blob('#dfe4f0', () => {
      ctx.moveTo(-1.3 * s, -2.5 * s);
      ctx.lineTo(-1.7 * s, -12.5 * s);
      ctx.quadraticCurveTo(-0.4 * s, -16.5 * s, 2.6 * s, -14 * s);
      ctx.lineTo(1.5 * s, -2.5 * s);
    }, 1.4);
    ctx.strokeStyle = C.emblem; ctx.lineWidth = lw(0.9);
    ctx.beginPath(); ctx.moveTo(-0.9 * s, -3.5 * s); ctx.lineTo(-1.1 * s, -12 * s); ctx.stroke();
    blob('#c8a84a', () => ctx.roundRect(-2.4 * s, -2.6 * s, 4.8 * s, 1.8 * s, 0.8 * s), 0.9);
    dot('#c8a84a', 0, 2.6 * s, 1.1 * s);
  }
  ctx.restore();

  /* ── KENAR IŞIĞI ── */
  ctx.save();
  ctx.shadowColor = C.eye; ctx.shadowBlur = 4 * s;
  ctx.strokeStyle = C.rim; ctx.lineWidth = lw(1.3);
  ctx.beginPath(); ctx.arc(hx, headY, headR + 0.3 * s, -0.5, 0.7); ctx.stroke();
  ctx.globalAlpha = 0.6;
  ctx.beginPath(); ctx.arc(x, ty + 2 * s, 8 * wf * s, -0.15, 0.7); ctx.stroke();
  ctx.globalAlpha = 1;
  ctx.restore();
}

/** Karakter büst portresi — menü ve karakter kartları için. */
export function drawCharPortrait(ctx, cx, cy, r, def) {
  const s = (r / 20) * 1.12;   // "birazcık daha büyük" — portrelerde de tutarlı büyüme

  /* zemin aurası */
  const grad = ctx.createRadialGradient(cx, cy, r * 0.2, cx, cy, r * 1.15);
  grad.addColorStop(0, 'rgba(255,255,255,0.05)');
  grad.addColorStop(0.7, 'rgba(0,0,0,0)');
  ctx.fillStyle = grad;
  ctx.beginPath(); ctx.arc(cx, cy, r * 1.15, 0, 6.283); ctx.fill();

  /* rün halkası platform */
  ctx.strokeStyle = def.colors.rim;
  ctx.lineWidth = Math.max(1, r * 0.045);
  ctx.beginPath();
  ctx.ellipse(cx, cy + r * 1.0, r * 0.78, r * 0.2, 0, 0, 6.283);
  ctx.stroke();
  ctx.setLineDash([r * 0.12, r * 0.1]);
  ctx.beginPath();
  ctx.ellipse(cx, cy + r * 1.0, r * 0.6, r * 0.14, 0, 0, 6.283);
  ctx.stroke();
  ctx.setLineDash([]);

  /* yer gölgesi */
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.beginPath();
  ctx.ellipse(cx, cy + r * 1.0, r * 0.55, r * 0.12, 0, 0, 6.283);
  ctx.fill();

  /* Sprite seti olan kahramanlar: sprite ile portre */
  if (HERO_SHEETS[def.id] && heroReady(def.id)) {
    const f = HERO_IMG[def.id].idle[0];
    drawHero(ctx, def.id, cx, cy + r * 1.04, false, 'idle', 0, 1, (r * 2.15) / (f ? f.h : 110), false);
    return;
  }

  drawHunter(ctx, cx, cy + r * 0.05, s, def, 0, 0);
}

export class Player {
  constructor(game) {
    this.game = game;
    this.reset();
  }

  reset() {
    this.charId = this.charId || DEFAULT_CHAR;
    this.x = 0; this.y = 0;
    this.radius = PLAYER.radius;
    this.speed = PLAYER.speed;
    this.maxHp = PLAYER.maxHp;
    this.hp = PLAYER.maxHp;
    this.regen = PLAYER.regen;
    this.critChance = PLAYER.critChance;
    this.critMult = PLAYER.critMult;
    this.armor = PLAYER.armor;
    this.magnet = PLAYER.magnet;
    this.invulnTime = PLAYER.invulnTime;
    this.dmgMult = 1;

    /* ── Brotato stat'ları ── */
    this.atkPct = 0;
    this.dodge = 0;
    this.lifeSteal = 0;
    this.noHeal = false;
    this.luck = 0;
    this.harvest = 0;
    this.xpMult = 1;
    this.explodeChance = 0;
    this.explodeDmgPct = 0;
    this.explodeRPct = 0;

    /* ── Ekonomi ── */
    this.money = 0;
    this.totalMoney = 0;
    this.itemCounts = {};

    this.level = 1;
    this.xp = 0;
    this.xpNext = xpToNext(1);
    this.pendingLevels = 0;

    this.invuln = 0;
    this.facing = 0;
    this.walk = 0;
    this.moving = false;

    /* okçu sprite animasyon durumu */
    this.attackT = 0;
    this.hurtT = 0;                    // yara animasyonu sayacı
    this.faceHold = 0;                 // yakın dövüş savurması yön kilidi
    this.faceLeft = false;

    this.lsBucket = 0;
  }

  get atkMult() { return 1 / (1 + this.atkPct); }

  applyMods(m) {
    for (const k in m) {
      const v = m[k];
      switch (k) {
        case 'maxHp':
          this.maxHp = Math.max(10, this.maxHp + v);
          if (v > 0) this.hp = Math.min(this.maxHp, this.hp + v);
          else if (this.hp > this.maxHp) this.hp = this.maxHp;
          break;
        case 'regen':         this.regen += v; break;
        case 'speedPct':      this.speed *= (1 + v); break;
        case 'dmgPct':        this.dmgMult += v; break;
        case 'atkPct':        this.atkPct += v; break;
        case 'critChance':    this.critChance += v; break;
        case 'critMult':      this.critMult += v; break;
        case 'armor':         this.armor = Math.max(0, this.armor + v); break;
        case 'dodge':         this.dodge = Math.min(0.6, this.dodge + v); break;
        case 'magnetPct':     this.magnet *= (1 + v); break;
        case 'lifeSteal':     this.lifeSteal += v; break;
        case 'luck':          this.luck += v; break;
        case 'harvest':       this.harvest += v; break;
        case 'xpPct':         this.xpMult += v; break;
        case 'explodeChance': this.explodeChance += v; break;
        case 'explodeDmgPct': this.explodeDmgPct += v; break;
        case 'explodeRPct':   this.explodeRPct += v; break;
      }
    }
  }

  addItem(item) {
    this.itemCounts[item.id] = (this.itemCounts[item.id] || 0) + 1;
    this.applyMods(item.mods);
  }

  gainXP(v) {
    this.xp += v;
    while (this.xp >= this.xpNext) {
      this.xp -= this.xpNext;
      this.level++;
      this.pendingLevels++;
      this.xpNext = xpToNext(this.level);
    }
  }

  collectGem(v, xpV) {
    const mats = Math.max(1, Math.round(v * (1 + this.harvest)));
    this.money += mats;
    this.totalMoney += mats;
    /* PARA VE KOŞU XP'Sİ AYNI SAYIDAN GELMEZ (2026-09-05, ölçüldü).
       Eskiden tek değer vardı ve çağıran ona `gemMul`ı ÇARPARAK veriyordu;
       gemMul 1,00 → 35,42 arası büyüdüğü için geç dünyalarda koşu XP'si de
       35 kat şişiyordu: tezgahta (⑧) görev başına seviye 8 → 32 ölçüldü,
       yani oyuncunun build derinliği HARİTAYA göre değişiyordu. gemMul bir
       ÖDÜL çarpanıdır (dükkân parası), bir İLERLEME çarpanı değil.
       xpV verilmezse eski davranış (tek değer) korunur — havuz taşma yolu
       gibi çarpansız çağrılar bozulmasin. */
    this.gainXP((xpV == null ? v : xpV) * this.xpMult);
  }

  /** Uzak menzil saldırısı tetiklendiğinde (silahlar çağırır) — karaktere
      göre savurma/atış animasyonunu başlatır ve hedefe döndürür. */
  triggerRangedAttack(dir) {
    const hs = HERO_SHEETS[this.charId];
    this.attackT = hs ? hs.attackDur : 0.36;
    if (typeof dir === 'number') this.faceLeft = Math.cos(dir) < 0;
  }

  /** Yakın dövüş savurması — kılıç her savrulduğunda sprite animasyonu oynar. */
  triggerMeleeAttack(dir) { this.triggerRangedAttack(dir); }

  get lsCapPerSec() { return 3 + this.maxHp * 0.02; }

  drain(dmg) {
    if (this.noHeal) return;                 // v53 mühür KAN KURUSU: sonradan alınan kart da iyileştirmez
    if (this.lifeSteal <= 0 || this.hp >= this.maxHp || this.lsBucket <= 0) return;
    const want = dmg * this.lifeSteal;
    const heal = Math.min(want, this.lsBucket);
    if (heal <= 0) return;
    this.lsBucket -= heal;
    this.hp = Math.min(this.maxHp, this.hp + heal);
  }

  heal(v) {
    v = Math.round(v);
    if (v <= 0) return;
    this.hp = Math.min(this.maxHp, this.hp + v);
    this.game.spawnText(this.x, this.y - 26, '+' + v, '#7ef2a0', 15, false);
  }

  update(dt) {
    const inp = this.game.input;
    inp.sample();

    const mx = inp.mx, my = inp.my;
    const mag2 = mx * mx + my * my;
    this.moving = mag2 > 0.001;

    if (this.moving) {
      this.x += mx * this.speed * dt;
      this.y += my * this.speed * dt;
      /* sonlu arena: çitlerin içinde kal */
      const A = this.game.arena;
      if (A) {
        if (this.x < A.l) this.x = A.l; else if (this.x > A.r) this.x = A.r;
        if (this.y < A.t) this.y = A.t; else if (this.y > A.b) this.y = A.b;
      }
      /* HARİTA İÇİ ENGELLER: daire-AABB itmesi. Hareketi ENGELLEMEZ, kaydırır
         — duvara dik basılı tutulan joystick "takıldı" gibi okunur (input.js
         dersi), kenardan kayan hareket ise doğal gelir. */
      if (this.game.props) this.game.props.resolve(this, 19);
      this.facing = Math.atan2(my, mx);
      this.walk += dt * (0.6 + Math.sqrt(mag2) * 0.6);
      /* saldırı animasyonu sürerken hedefe dönük kal — yürüme yönü ezmesin */
      if (Math.abs(mx) > 0.05 && this.attackT <= 0 && this.faceHold <= 0) this.faceLeft = mx < 0;
    }

    if (this.attackT > 0) this.attackT -= dt;
    if (this.hurtT > 0) this.hurtT -= dt;
    if (this.faceHold > 0) this.faceHold -= dt;
    if (this.invuln > 0) this.invuln -= dt;
    if (this.hp < this.maxHp && !this.noHeal) {
      this.hp = Math.min(this.maxHp, this.hp + this.regen * dt);
    }
    if (this.lsBucket < this.lsCapPerSec) {
      this.lsBucket = Math.min(this.lsCapPerSec, this.lsBucket + this.lsCapPerSec * dt);
    }
    /* v53 C5: ADIM İZİ — hareket ederken 0,17 sn'de bir ayak dibinde biyom tonlu
       küçük toz; kalkışta (durmadan harekete) iki katı. Havuzdan, tahsis yok. */
    const g = this.game;
    if (this.moving) {
      this._stepT = (this._stepT || 0) - dt;
      if (!this._wasMoving) this._stepT = 0;
      if (this._stepT <= 0 && g.pools && g.pools.particles) {
        this._stepT = 0.17;
        const n = this._wasMoving ? 1 : 3;
        const col = (g.enemies && g.enemies.worldColor) || '#6a5a50';
        for (let i = 0; i < n; i++) g.pools.particles.obtain(this.x + (Math.random() - 0.5) * 10, this.y + 12,
          (Math.random() - 0.5) * 30, -12 - Math.random() * 14, 0.42, 2.2, i ? '#4a403a' : col, 0.9, 0, false);
      }
    }
    this._wasMoving = !!this.moving;
  }

  render(ctx) {
    const x = this.x, y = this.y;
    const def = CHARACTERS[this.charId] || CHARACTERS[DEFAULT_CHAR];
    const t = this.game.time;
    const S = HUNTER_SCALE;
    const bob = this.moving ? Math.sin(this.walk * 11) * 1.8 : Math.sin(t * 2.2) * 0.9;
    const fx = Math.cos(this.facing);
    const flicker = this.invuln > 0 && ((t * 24) | 0) % 2 === 0;

    /* zemin ruh ışığı — hafif, bloom yapmasın diye küçük ve düşük opaklık */
    ctx.fillStyle = def.colors.rim.replace(/[\d.]+\)$/, '0.05)');
    ctx.beginPath();
    ctx.ellipse(x, y + 13, 16, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    /* gölge */
    ctx.fillStyle = 'rgba(0,0,0,0.38)';
    ctx.beginPath();
    ctx.ellipse(x, y + 14, 13.5, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    if (HERO_SHEETS[this.charId] && heroReady(this.charId)) {
      /* sprite'lı kahramanlar: tam durum makinesi — kesirli faz + crossfade */
      const hs = HERO_SHEETS[this.charId];
      const st = HERO_IMG[this.charId];
      let set, ph, loop;
      if (this.hurtT > 0) {
        set = 'hit'; loop = false;
        ph = ((0.34 - this.hurtT) / 0.34) * st.hit.length;
      } else if (this.attackT > 0) {
        set = 'atk'; loop = false;
        ph = (1 - this.attackT / hs.attackDur) * st.atk.length;
      } else if (this.moving) {
        set = 'walk'; loop = true;
        ph = this.walk * 9;
      } else {
        set = 'idle'; loop = true;
        ph = t * 3.4;
      }
      drawHero(ctx, this.charId, x, y + 12, this.faceLeft, set, ph, flicker ? 0.42 : 1, 0, loop);
    } else {
      if (flicker) ctx.globalAlpha = 0.4;
      drawHunter(ctx, x, y - 9 + bob, S, def, fx, t, this.moving ? this.walk : 0, this.attackT > 0 ? 1 - this.attackT / 0.36 : 0);
      ctx.globalAlpha = 1;
    }

    /* can barı — karakterin ÜSTÜNDE yüzen ince pill (yalnız hasarlıyken) */
    if (this.hp < this.maxHp - 0.5) {
      const pct = Math.max(0, this.hp / this.maxHp);
      const bw = 32, bh = 5;
      const bx = x - bw / 2, by = y - 48;
      /* zemin + çerçeve */
      ctx.fillStyle = 'rgba(10, 12, 20, 0.85)';
      ctx.beginPath();
      ctx.roundRect(bx - 1.5, by - 1.5, bw + 3, bh + 3, 3.5);
      ctx.fill();
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.beginPath();
      ctx.roundRect(bx, by, bw, bh, 2.5);
      ctx.fill();
      /* dolu kısım */
      ctx.fillStyle = pct > 0.35 ? COLORS.gold : COLORS.blood;
      ctx.beginPath();
      ctx.roundRect(bx, by, Math.max(2, bw * pct), bh, 2.5);
      ctx.fill();
      /* üst parlama */
      ctx.fillStyle = 'rgba(255, 255, 255, 0.28)';
      ctx.beginPath();
      ctx.roundRect(bx, by, Math.max(2, bw * pct), bh * 0.42, 2.5);
      ctx.fill();
    }
  }
}
