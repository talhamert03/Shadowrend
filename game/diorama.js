/* ═══════════════════════════════════════════════════════════
   diorama.js — Dünya Diyoraması (Ana Ekran Haritası)

   Ana ekranın ortasındaki "yaşayan harita": seçili dünyanın
   yüzen adası, boss kulesi, görev taşları ve tema dekoru.
   TAMAMEN önbelleklidir — dünya/ilerleme değişmedikçe tek bir
   offscreen canvas'tan blit edilir; kare başı maliyeti SIFIR.
   Hareket hissi CSS transform animasyonlarıyla verilir (GPU).
   ═══════════════════════════════════════════════════════════ */

const cache = new Map();

function rng(seed) {
  let s = seed | 0 || 1;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

/* ── küçük dekor parçaları ───────────────────────────────── */

function tombstone(g, x, y, s, tone) {
  g.fillStyle = tone; g.strokeStyle = 'rgba(0,0,0,0.55)'; g.lineWidth = s * 0.16;
  g.beginPath();
  g.moveTo(x - s * 0.55, y);
  g.lineTo(x - s * 0.55, y - s * 0.9);
  g.arc(x, y - s * 0.9, s * 0.55, Math.PI, 0);
  g.lineTo(x + s * 0.55, y);
  g.closePath(); g.fill(); g.stroke();
  g.strokeStyle = 'rgba(0,0,0,0.35)'; g.lineWidth = s * 0.1;
  g.beginPath();
  g.moveTo(x, y - s * 1.05); g.lineTo(x, y - s * 0.55);
  g.moveTo(x - s * 0.28, y - s * 0.86); g.lineTo(x + s * 0.28, y - s * 0.86);
  g.stroke();
}

function deadTree(g, x, y, s, tone) {
  g.strokeStyle = tone; g.lineCap = 'round';
  g.lineWidth = s * 0.22;
  g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + s * 0.1, y - s * 0.9, x - s * 0.15, y - s * 1.6); g.stroke();
  g.lineWidth = s * 0.12;
  g.beginPath(); g.moveTo(x - s * 0.04, y - s * 0.8); g.quadraticCurveTo(x + s * 0.5, y - s * 1.1, x + s * 0.75, y - s * 1.5); g.stroke();
  g.beginPath(); g.moveTo(x - s * 0.1, y - s * 1.2); g.quadraticCurveTo(x - s * 0.55, y - s * 1.45, x - s * 0.7, y - s * 1.8); g.stroke();
  g.lineCap = 'butt';
}

function crystal(g, x, y, s, color, glow) {
  g.fillStyle = glow;
  g.beginPath(); g.arc(x, y - s * 0.5, s * 1.15, 0, 6.283); g.fill();
  g.fillStyle = color; g.strokeStyle = 'rgba(0,0,0,0.5)'; g.lineWidth = s * 0.12;
  g.beginPath();
  g.moveTo(x, y - s * 1.5); g.lineTo(x + s * 0.42, y - s * 0.3); g.lineTo(x + s * 0.2, y);
  g.lineTo(x - s * 0.25, y); g.lineTo(x - s * 0.4, y - s * 0.45);
  g.closePath(); g.fill(); g.stroke();
  g.fillStyle = 'rgba(255,255,255,0.35)';
  g.beginPath(); g.moveTo(x - s * 0.05, y - s * 1.3); g.lineTo(x + s * 0.14, y - s * 0.5); g.lineTo(x - s * 0.12, y - s * 0.5); g.closePath(); g.fill();
}

function candleClump(g, x, y, s, flame) {
  g.fillStyle = '#d8cfb8';
  g.fillRect(x - s * 0.5, y - s * 0.9, s * 0.34, s * 0.9);
  g.fillRect(x - s * 0.05, y - s * 1.25, s * 0.3, s * 1.25);
  g.fillRect(x + s * 0.35, y - s * 0.7, s * 0.28, s * 0.7);
  g.fillStyle = flame;
  for (const [fx, fy] of [[-0.33, -1.0], [0.1, -1.38], [0.49, -0.82]]) {
    g.beginPath(); g.ellipse(x + fx * s, y + fy * s, s * 0.12, s * 0.2, 0, 0, 6.283); g.fill();
  }
  g.fillStyle = 'rgba(255,220,150,0.14)';
  g.beginPath(); g.arc(x, y - s * 1.0, s * 1.3, 0, 6.283); g.fill();
}

function mushroom(g, x, y, s, cap, glow) {
  g.fillStyle = glow;
  g.beginPath(); g.arc(x, y - s * 0.55, s * 1.0, 0, 6.283); g.fill();
  g.fillStyle = '#cfe8d8';
  g.fillRect(x - s * 0.12, y - s * 0.6, s * 0.24, s * 0.6);
  g.fillStyle = cap; g.strokeStyle = 'rgba(0,0,0,0.45)'; g.lineWidth = s * 0.1;
  g.beginPath();
  g.moveTo(x - s * 0.55, y - s * 0.55);
  g.quadraticCurveTo(x, y - s * 1.25, x + s * 0.55, y - s * 0.55);
  g.closePath(); g.fill(); g.stroke();
}

function emberCrack(g, x, y, len, ang, w) {
  const grad = g.createLinearGradient(x, y, x + Math.cos(ang) * len, y + Math.sin(ang) * len);
  grad.addColorStop(0, 'rgba(255,150,70,0.75)');
  grad.addColorStop(1, 'rgba(255,70,30,0.05)');
  g.strokeStyle = grad; g.lineWidth = w; g.lineCap = 'round';
  g.beginPath();
  g.moveTo(x, y);
  g.lineTo(x + Math.cos(ang) * len * 0.45 + w, y + Math.sin(ang) * len * 0.45);
  g.lineTo(x + Math.cos(ang) * len, y + Math.sin(ang) * len);
  g.stroke();
  g.lineCap = 'butt';
}

function ruinColumn(g, x, y, s, tone) {
  g.fillStyle = tone; g.strokeStyle = 'rgba(0,0,0,0.5)'; g.lineWidth = s * 0.1;
  g.beginPath();
  g.moveTo(x - s * 0.3, y);
  g.lineTo(x - s * 0.26, y - s * 1.5);
  g.lineTo(x + s * 0.1, y - s * 1.7);
  g.lineTo(x + s * 0.3, y - s * 1.42);
  g.lineTo(x + s * 0.32, y);
  g.closePath(); g.fill(); g.stroke();
  g.strokeStyle = 'rgba(0,0,0,0.3)'; g.lineWidth = s * 0.06;
  g.beginPath();
  g.moveTo(x - s * 0.13, y - s * 1.55); g.lineTo(x - s * 0.1, y);
  g.moveTo(x + s * 0.08, y - s * 1.6); g.lineTo(x + s * 0.1, y);
  g.stroke();
}

/* ── ana ressam ──────────────────────────────────────────── */

/* ── dünyaya özgü imza manzarası (adanın arkasında) ────────
   Her dünya tek bakışta ayrışsın diye devasa bir landmark.   */
function paintLandmark(g, wd, rnd, CX, W, H, topY, isW) {
  g.save();
  if (wd.floor === 'kul') {
    /* ═ YANARDAĞ: koni + lav akıntısı + duman + kor yağmuru ═ */
    const vx = CX + W * 0.02, vb = topY + H * 0.02, vh = H * 0.34, vw = W * 0.36;
    /* duman sütunu */
    const smoke = g.createLinearGradient(vx, vb - vh, vx, vb - vh - H * 0.3);
    smoke.addColorStop(0, 'rgba(90,60,54,0.5)');
    smoke.addColorStop(1, 'rgba(90,60,54,0)');
    g.fillStyle = smoke;
    for (let i = 0; i < 3; i++) {
      g.beginPath();
      g.ellipse(vx + (i - 1) * W * 0.05, vb - vh - i * H * 0.08, W * 0.1 + i * W * 0.03, H * 0.07, 0, 0, 6.283);
      g.fill();
    }
    /* koni */
    g.fillStyle = '#1c1210';
    g.beginPath();
    g.moveTo(vx - vw, vb);
    g.lineTo(vx - vw * 0.22, vb - vh);
    g.lineTo(vx + vw * 0.22, vb - vh);
    g.lineTo(vx + vw, vb);
    g.closePath(); g.fill();
    /* kraterde parlayan lav */
    g.save(); g.shadowColor = '#ff7a2c'; g.shadowBlur = 24;
    g.fillStyle = '#ff8a3c';
    g.beginPath(); g.ellipse(vx, vb - vh, vw * 0.22, H * 0.015, 0, 0, 6.283); g.fill();
    g.restore();
    /* lav akıntıları */
    for (const off of [-0.4, 0.05, 0.5]) {
      const grad = g.createLinearGradient(vx + off * vw, vb - vh, vx + off * vw * 1.6, vb);
      grad.addColorStop(0, '#ffb257'); grad.addColorStop(0.5, '#ff5a2c'); grad.addColorStop(1, 'rgba(160,30,20,0.2)');
      g.strokeStyle = grad; g.lineWidth = 2.4 + rnd() * 2; g.lineCap = 'round';
      g.beginPath();
      g.moveTo(vx + off * vw * 0.2, vb - vh + 4);
      g.quadraticCurveTo(vx + off * vw * 0.8, vb - vh * 0.5, vx + off * vw * 1.3, vb);
      g.stroke();
    }
    g.lineCap = 'butt';
    /* kor yağmuru (statik noktalar) */
    for (let i = 0; i < 14; i++) {
      g.fillStyle = 'rgba(255,150,70,' + (0.3 + rnd() * 0.5) + ')';
      g.fillRect(vx - vw + rnd() * vw * 2, vb - vh - rnd() * H * 0.2, 1.6, 1.6 + rnd() * 2);
    }

  } else if (wd.floor === 'bataklik') {
    /* ═ DEV MANTAR ORMANI: kemer yapan koca mantarlar + spor ═ */
    for (const [ox, sc] of [[-0.34, 1.0], [0.32, 0.86], [-0.08, 0.64]]) {
      const mx = CX + ox * W, mb = topY + H * 0.03, mh = H * (0.2 + sc * 0.12), cw = W * (0.12 + sc * 0.06);
      g.strokeStyle = '#1a3028'; g.lineWidth = W * 0.03 * sc; g.lineCap = 'round';
      g.beginPath(); g.moveTo(mx, mb); g.quadraticCurveTo(mx + cw * 0.3, mb - mh * 0.6, mx + cw * 0.1, mb - mh); g.stroke();
      g.lineCap = 'butt';
      /* şapka aurası */
      g.save(); g.shadowColor = 'rgba(90,240,200,0.8)'; g.shadowBlur = 22;
      g.fillStyle = '#2f6e56';
      g.beginPath();
      g.moveTo(mx + cw * 0.1 - cw, mb - mh + cw * 0.2);
      g.quadraticCurveTo(mx + cw * 0.1, mb - mh - cw * 0.9, mx + cw * 0.1 + cw, mb - mh + cw * 0.2);
      g.closePath(); g.fill();
      g.restore();
      /* şapka benekleri (ışıyan) */
      g.fillStyle = '#7ef2cf';
      for (let i = 0; i < 4; i++) {
        g.beginPath(); g.arc(mx + cw * 0.1 + (rnd() - 0.5) * cw * 1.2, mb - mh - cw * 0.1 + rnd() * cw * 0.3, cw * 0.09, 0, 6.283); g.fill();
      }
    }
    /* yükselen spor bulutu */
    g.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 24; i++) {
      g.fillStyle = 'rgba(120,242,207,' + (0.1 + rnd() * 0.25) + ')';
      g.fillRect(CX - isW + rnd() * isW * 2, topY - rnd() * H * 0.4, 1.6, 1.6);
    }
    g.globalCompositeOperation = 'source-over';

  } else if (wd.floor === 'katedral') {
    /* ═ KATEDRAL: dev gül vitray + sivri kemerler + org ═ */
    const gx = CX, gy = topY - H * 0.16, gr = W * 0.15;
    /* arka duvar */
    g.fillStyle = '#241a38';
    g.fillRect(CX - W * 0.32, gy - gr * 1.4, W * 0.64, H * 0.34);
    /* sivri kemer pencereler */
    for (const ox of [-0.24, -0.12, 0.12, 0.24]) {
      const wx = CX + ox * W;
      g.fillStyle = 'rgba(180,120,255,0.22)';
      g.beginPath();
      g.moveTo(wx - W * 0.03, gy + gr * 1.4);
      g.lineTo(wx - W * 0.03, gy);
      g.quadraticCurveTo(wx, gy - gr * 0.5, wx + W * 0.03, gy);
      g.lineTo(wx + W * 0.03, gy + gr * 1.4);
      g.closePath(); g.fill();
    }
    /* gül penceresi */
    g.save(); g.shadowColor = '#b47aff'; g.shadowBlur = 26;
    const cols = ['#ff5a7a', '#7a4ae0', '#4fb0d4', '#ffc44a'];
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * 6.283;
      g.fillStyle = cols[i % 4];
      g.beginPath();
      g.moveTo(gx, gy);
      g.arc(gx, gy, gr, a, a + 6.283 / 8);
      g.closePath(); g.globalAlpha = 0.55; g.fill();
    }
    g.globalAlpha = 1; g.restore();
    g.strokeStyle = '#2a1e40'; g.lineWidth = 2;
    for (let i = 0; i < 8; i++) { const a = (i / 8) * 6.283; g.beginPath(); g.moveTo(gx, gy); g.lineTo(gx + Math.cos(a) * gr, gy + Math.sin(a) * gr); g.stroke(); }
    g.beginPath(); g.arc(gx, gy, gr, 0, 6.283); g.stroke();
    g.beginPath(); g.arc(gx, gy, gr * 0.4, 0, 6.283); g.stroke();

  } else if (wd.floor === 'hiclik') {
    /* ═ HİÇLİK: boşluk girdabı + ters yüzen adalar + enkaz ═ */
    const vx = CX, vy = topY - H * 0.14;
    g.save(); g.shadowColor = '#b4aaff'; g.shadowBlur = 20;
    for (let i = 0; i < 5; i++) {
      g.strokeStyle = 'rgba(200,196,255,' + (0.3 - i * 0.05) + ')';
      g.lineWidth = 2.5 - i * 0.4;
      g.beginPath(); g.ellipse(vx, vy, W * 0.06 + i * W * 0.045, H * 0.02 + i * H * 0.016, 0, 0, 6.283); g.stroke();
    }
    g.restore();
    /* çekirdek */
    g.fillStyle = '#e8e4ff';
    g.beginPath(); g.arc(vx, vy, W * 0.02, 0, 6.283); g.fill();
    /* ters yüzen adalar (aşağı sarkan) */
    for (const [ox, oy, sc] of [[-0.36, 0.34, 0.5], [0.38, 0.42, 0.42], [-0.2, 0.5, 0.3]]) {
      const ix = CX + ox * W, iy = oy * H, s = W * 0.05 * sc;
      g.fillStyle = '#2c2a3e';
      g.beginPath();
      g.moveTo(ix - s, iy); g.lineTo(ix + s, iy);
      g.lineTo(ix + s * 0.5, iy + s * 1.6); g.lineTo(ix, iy + s * 0.9); g.lineTo(ix - s * 0.5, iy + s * 1.6);
      g.closePath(); g.fill();
      g.fillStyle = '#3d3a54';
      g.beginPath(); g.ellipse(ix, iy, s, s * 0.32, 0, 0, 6.283); g.fill();
    }
    /* enkaz zerreleri */
    for (let i = 0; i < 16; i++) {
      g.fillStyle = 'rgba(200,196,255,' + (0.2 + rnd() * 0.4) + ')';
      const a = rnd() * 6.283, rr = W * 0.1 + rnd() * W * 0.22;
      g.fillRect(vx + Math.cos(a) * rr, vy + Math.sin(a) * rr * 0.4, 1.6 + rnd() * 2, 1.6 + rnd() * 2);
    }

  } else {
    /* ═ MEZARLIK: uzak kırık katedral kapısı silüeti ═ */
    g.fillStyle = 'rgba(20,16,26,0.6)';
    const ax = CX, ab = topY + H * 0.02, ah = H * 0.26, aw = W * 0.13;
    g.beginPath();
    g.moveTo(ax - aw, ab);
    g.lineTo(ax - aw, ab - ah * 0.7);
    g.quadraticCurveTo(ax, ab - ah * 1.15, ax + aw, ab - ah * 0.7);
    g.lineTo(ax + aw, ab);
    g.closePath(); g.fill();
    /* kırık tepe */
    g.fillStyle = '#151018';
    g.fillRect(ax - aw * 0.3, ab - ah * 1.05, aw * 0.6, ah * 0.2);
    /* yan sütun kırıkları */
    g.fillStyle = 'rgba(20,16,26,0.5)';
    g.fillRect(CX - W * 0.3, ab - ah * 0.5, W * 0.03, ah * 0.5);
    g.fillRect(CX + W * 0.27, ab - ah * 0.4, W * 0.03, ah * 0.4);
  }
  g.restore();
}

/**
 * Yüzen ada diyoraması.
 * @param wd       worlds.js dünya tanımı
 * @param cleared  geçilen görev sayısı (0-10) — yol taşları altınlanır
 * @param W,H      mantıksal boyut
 */
function paint(wd, cleared, W, H) {
  const cv = document.createElement('canvas');
  const DPR = Math.min(window.devicePixelRatio || 1, 2);
  cv.width = Math.round(W * DPR);
  cv.height = Math.round(H * DPR);
  const g = cv.getContext('2d');
  g.scale(DPR, DPR);
  const rnd = rng(wd.id * 7919 + 13);
  const CX = W / 2;

  /* tema tonları */
  const THEME = {
    mezarlik: { plateau: '#2c3242', plateauLip: '#3c4358', rock: '#1a1e2c', rock2: '#141826', prop: '#59627e' },
    kul:      { plateau: '#3a2a24', plateauLip: '#4c372c', rock: '#221713', rock2: '#180f0c', prop: '#6e4a36' },
    bataklik: { plateau: '#24382e', plateauLip: '#2f4a3a', rock: '#14231c', rock2: '#0e1a14', prop: '#4a6e56' },
    katedral: { plateau: '#332a44', plateauLip: '#443a5a', rock: '#1e1830', rock2: '#141024', prop: '#5c4e80' },
    hiclik:   { plateau: '#2c2a3e', plateauLip: '#3d3a54', rock: '#181628', rock2: '#100e1e', prop: '#565278' },
    gokada:   { plateau: '#332a4a', plateauLip: '#463a62', rock: '#1b142c', rock2: '#120c1e', prop: '#6a54a8' },
  };
  const T = THEME[wd.floor] || THEME.mezarlik;

  /* ── gökyüzü: yıldız tozu + dünya ışıması ── */
  const sky = g.createLinearGradient(0, 0, 0, H * 0.8);
  sky.addColorStop(0, wd.glow.replace(/[\d.]+\)$/, '0.12)'));
  sky.addColorStop(0.55, 'rgba(0,0,0,0)');
  g.fillStyle = sky;
  g.fillRect(0, 0, W, H);
  for (let i = 0; i < 34; i++) {
    g.fillStyle = 'rgba(230,228,255,' + (0.12 + rnd() * 0.3) + ')';
    const ss = 0.8 + rnd() * 1.6;
    g.fillRect(rnd() * W, rnd() * H * 0.55, ss, ss);
  }

  /* ── ay ── */
  const mx = CX + W * 0.24, my = H * 0.17, mr = W * 0.11;
  const moon = g.createRadialGradient(mx - mr * 0.3, my - mr * 0.3, mr * 0.1, mx, my, mr);
  moon.addColorStop(0, wd.moon[0]);
  moon.addColorStop(0.45, wd.moon[1]);
  moon.addColorStop(0.85, wd.moon[2]);
  moon.addColorStop(1, wd.moon[3]);
  g.save();
  g.shadowColor = wd.glow.replace(/[\d.]+\)$/, '0.8)');
  g.shadowBlur = 40;
  g.fillStyle = moon;
  g.beginPath(); g.arc(mx, my, mr, 0, 6.283); g.fill();
  g.restore();
  /* krater lekeleri */
  g.fillStyle = 'rgba(0,0,0,0.16)';
  g.beginPath(); g.arc(mx + mr * 0.3, my + mr * 0.15, mr * 0.2, 0, 6.283); g.fill();
  g.beginPath(); g.arc(mx - mr * 0.25, my + mr * 0.4, mr * 0.13, 0, 6.283); g.fill();

  /* ── uydu kayaları (arka planda süzülen) ── */
  for (const [ox, oy, os] of [[-0.36, 0.30, 0.045], [0.38, 0.48, 0.035], [-0.30, 0.62, 0.028]]) {
    const rx = CX + ox * W, ry = oy * H, rs = os * W;
    g.fillStyle = T.rock;
    g.beginPath();
    g.moveTo(rx - rs, ry);
    g.lineTo(rx - rs * 0.5, ry - rs * 0.7);
    g.lineTo(rx + rs * 0.7, ry - rs * 0.55);
    g.lineTo(rx + rs, ry + rs * 0.1);
    g.lineTo(rx, ry + rs * 1.4);
    g.closePath(); g.fill();
    g.fillStyle = T.plateau;
    g.beginPath(); g.ellipse(rx, ry - rs * 0.4, rs, rs * 0.34, 0, 0, 6.283); g.fill();
    if (rnd() < 0.8) crystal(g, rx, ry - rs * 0.5, rs * 0.5, wd.color, wd.glow.replace(/[\d.]+\)$/, '0.14)'));
  }

  /* ── dünyaya özgü imza manzarası (adanın arkasında) ── */
  paintLandmark(g, wd, rnd, CX, W, H, H * 0.60, W * 0.40);

  /* ── ada gövdesi ── */
  const isW = W * 0.40;                 // yarı genişlik
  const topY = H * 0.60;                // plato üst yüzeyi
  /* alt kaya katmanları (sarkıt) */
  const layers = [
    { w: isW * 1.0, d: H * 0.34, c: T.rock },
    { w: isW * 0.72, d: H * 0.26, c: T.rock2 },
  ];
  for (const L of layers) {
    g.fillStyle = L.c;
    g.beginPath();
    g.moveTo(CX - L.w, topY + 4);
    let px = CX - L.w;
    const segs = 7;
    for (let i = 1; i <= segs; i++) {
      const nx = CX - L.w + (2 * L.w / segs) * i;
      const dy = (i === segs ? 0 : L.d * (0.35 + rnd() * 0.65) * Math.sin((i / segs) * Math.PI));
      g.lineTo((px + nx) / 2, topY + 4 + dy);
      g.lineTo(nx, topY + 4 + (i === segs ? 0 : L.d * 0.2 * rnd()));
      px = nx;
    }
    g.closePath(); g.fill();
  }
  /* sarkan kökler/zincirler */
  g.strokeStyle = 'rgba(120,116,150,0.25)'; g.lineWidth = 1.4;
  for (let i = 0; i < 4; i++) {
    const x = CX - isW * 0.7 + rnd() * isW * 1.4;
    g.beginPath();
    g.moveTo(x, topY + H * 0.12 + rnd() * H * 0.1);
    g.quadraticCurveTo(x + 6, topY + H * 0.26, x - 4 + rnd() * 8, topY + H * 0.3 + rnd() * H * 0.06);
    g.stroke();
  }

  /* plato yüzeyi */
  g.fillStyle = T.plateauLip;
  g.beginPath(); g.ellipse(CX, topY, isW, H * 0.105, 0, 0, 6.283); g.fill();
  g.fillStyle = T.plateau;
  g.beginPath(); g.ellipse(CX, topY - 5, isW * 0.97, H * 0.095, 0, 0, 6.283); g.fill();

  /* yüzey dokusu — temaya göre */
  const clipSurface = () => {
    g.beginPath(); g.ellipse(CX, topY - 5, isW * 0.97, H * 0.095, 0, 0, 6.283); g.clip();
  };
  g.save(); clipSurface();
  if (wd.floor === 'kul') {
    for (let i = 0; i < 9; i++) {
      emberCrack(g, CX - isW * 0.8 + rnd() * isW * 1.6, topY - 14 + rnd() * 26, 16 + rnd() * 30, rnd() * 6.283, 1.6 + rnd());
    }
  } else if (wd.floor === 'bataklik') {
    for (let i = 0; i < 4; i++) {
      const px2 = CX - isW * 0.7 + rnd() * isW * 1.4, py2 = topY - 12 + rnd() * 22;
      const pr = 10 + rnd() * 16;
      g.fillStyle = 'rgba(80,220,180,0.16)';
      g.beginPath(); g.ellipse(px2, py2, pr, pr * 0.4, 0, 0, 6.283); g.fill();
      g.strokeStyle = 'rgba(140,255,220,0.25)'; g.lineWidth = 1;
      g.beginPath(); g.ellipse(px2, py2, pr * 0.7, pr * 0.26, 0, 0, 6.283); g.stroke();
    }
  } else if (wd.floor === 'katedral') {
    g.strokeStyle = 'rgba(220,190,255,0.10)'; g.lineWidth = 1;
    for (let i = -4; i <= 4; i++) {
      g.beginPath(); g.moveTo(CX + i * isW * 0.22 - 20, topY - 24); g.lineTo(CX + i * isW * 0.22 + 20, topY + 18); g.stroke();
      g.beginPath(); g.moveTo(CX + i * isW * 0.22 + 20, topY - 24); g.lineTo(CX + i * isW * 0.22 - 20, topY + 18); g.stroke();
    }
  } else if (wd.floor === 'hiclik') {
    g.strokeStyle = 'rgba(200,196,255,0.14)'; g.lineWidth = 1.1;
    g.beginPath(); g.ellipse(CX, topY - 4, isW * 0.55, H * 0.05, 0, 0, 6.283); g.stroke();
    g.beginPath(); g.ellipse(CX, topY - 4, isW * 0.34, H * 0.032, 0, 0, 6.283); g.stroke();
  } else {
    g.fillStyle = 'rgba(100,120,90,0.14)';
    for (let i = 0; i < 12; i++) {
      g.fillRect(CX - isW * 0.9 + rnd() * isW * 1.8, topY - 16 + rnd() * 28, 3 + rnd() * 5, 2);
    }
  }
  g.restore();

  /* ── BOSS KULESİ (merkez-arka) ── */
  const kw = W * 0.105, kh = H * 0.30;
  const kx = CX, kyB = topY - H * 0.028;
  /* kule aurası */
  g.fillStyle = wd.glow.replace(/[\d.]+\)$/, '0.10)');
  g.beginPath(); g.arc(kx, kyB - kh * 0.6, kh * 0.75, 0, 6.283); g.fill();
  /* gövde */
  g.fillStyle = '#191527';
  g.strokeStyle = 'rgba(0,0,0,0.6)'; g.lineWidth = 2;
  g.beginPath();
  g.moveTo(kx - kw, kyB);
  g.lineTo(kx - kw * 0.78, kyB - kh);
  g.lineTo(kx + kw * 0.78, kyB - kh);
  g.lineTo(kx + kw, kyB);
  g.closePath(); g.fill(); g.stroke();
  /* taş derzleri */
  g.strokeStyle = 'rgba(255,255,255,0.045)'; g.lineWidth = 1;
  for (let i = 1; i < 5; i++) {
    const yy = kyB - (kh / 5) * i;
    const ww = kw * (1 - 0.22 * (i / 5));
    g.beginPath(); g.moveTo(kx - ww, yy); g.lineTo(kx + ww, yy); g.stroke();
  }
  /* mazgallar */
  g.fillStyle = '#191527';
  for (let i = -2; i <= 2; i++) {
    g.fillRect(kx + i * kw * 0.38 - kw * 0.1, kyB - kh - kh * 0.08, kw * 0.2, kh * 0.09);
  }
  /* çatı sivrisi + bayrak */
  g.fillStyle = '#241d38';
  g.beginPath();
  g.moveTo(kx - kw * 0.5, kyB - kh - kh * 0.06);
  g.lineTo(kx, kyB - kh - kh * 0.34);
  g.lineTo(kx + kw * 0.5, kyB - kh - kh * 0.06);
  g.closePath(); g.fill(); g.stroke();
  g.strokeStyle = '#3a3350'; g.lineWidth = 2;
  g.beginPath(); g.moveTo(kx, kyB - kh - kh * 0.34); g.lineTo(kx, kyB - kh - kh * 0.52); g.stroke();
  g.fillStyle = wd.color;
  g.beginPath();
  g.moveTo(kx, kyB - kh - kh * 0.52);
  g.lineTo(kx + kw * 0.55, kyB - kh - kh * 0.44);
  g.lineTo(kx, kyB - kh - kh * 0.37);
  g.closePath(); g.fill();
  /* ışıyan kapı + pencereler */
  g.save();
  g.shadowColor = wd.color; g.shadowBlur = 12;
  g.fillStyle = wd.color;
  g.beginPath();
  g.moveTo(kx - kw * 0.26, kyB);
  g.lineTo(kx - kw * 0.26, kyB - kh * 0.22);
  g.arc(kx, kyB - kh * 0.22, kw * 0.26, Math.PI, 0);
  g.lineTo(kx + kw * 0.26, kyB);
  g.closePath(); g.fill();
  for (const wy of [0.5, 0.72]) {
    g.fillRect(kx - kw * 0.09, kyB - kh * wy - kh * 0.05, kw * 0.18, kh * 0.09);
  }
  g.restore();
  /* kapı parmaklığı */
  g.strokeStyle = 'rgba(10,8,18,0.85)'; g.lineWidth = 1.6;
  for (let i = -1; i <= 1; i++) {
    g.beginPath(); g.moveTo(kx + i * kw * 0.13, kyB); g.lineTo(kx + i * kw * 0.13, kyB - kh * 0.34); g.stroke();
  }

  /* ── yan kuleler / tema dekoru (plato üstü) ── */
  const propTone = T.prop;
  if (wd.floor === 'mezarlik') {
    tombstone(g, CX - isW * 0.62, topY + 8, 13, propTone);
    tombstone(g, CX - isW * 0.40, topY + 22, 10, propTone);
    tombstone(g, CX + isW * 0.55, topY + 10, 12, propTone);
    tombstone(g, CX + isW * 0.34, topY + 24, 9, propTone);
    deadTree(g, CX - isW * 0.8, topY - 2, 26, '#3c4358');
    candleClump(g, CX + isW * 0.72, topY + 4, 9, '#ffd08a');
  } else if (wd.floor === 'kul') {
    for (const [ox, oy, os] of [[-0.66, 6, 15], [-0.42, 20, 10], [0.56, 8, 13], [0.36, 22, 9]]) {
      g.fillStyle = '#1c1210';
      g.beginPath();
      g.moveTo(CX + ox * isW - os * 0.6, topY + oy);
      g.lineTo(CX + ox * isW, topY + oy - os * 1.5);
      g.lineTo(CX + ox * isW + os * 0.6, topY + oy);
      g.closePath(); g.fill();
      g.fillStyle = 'rgba(255,120,50,0.7)';
      g.fillRect(CX + ox * isW - 1.4, topY + oy - os * 1.1, 2.8, 4);
    }
    deadTree(g, CX - isW * 0.82, topY, 24, '#332018');
  } else if (wd.floor === 'bataklik') {
    mushroom(g, CX - isW * 0.6, topY + 12, 12, '#3ac8a0', 'rgba(80,220,180,0.15)');
    mushroom(g, CX - isW * 0.42, topY + 24, 8, '#59e3c8', 'rgba(80,220,180,0.12)');
    mushroom(g, CX + isW * 0.55, topY + 14, 11, '#2fa886', 'rgba(80,220,180,0.14)');
    deadTree(g, CX + isW * 0.76, topY + 2, 25, '#2f4a3a');
    deadTree(g, CX - isW * 0.8, topY - 1, 22, '#274034');
  } else if (wd.floor === 'katedral') {
    ruinColumn(g, CX - isW * 0.62, topY + 10, 16, propTone);
    ruinColumn(g, CX + isW * 0.6, topY + 12, 14, propTone);
    candleClump(g, CX - isW * 0.38, topY + 22, 9, '#ffd08a');
    candleClump(g, CX + isW * 0.4, topY + 20, 8, '#ffd08a');
    /* vitray parçası */
    g.save(); g.shadowColor = '#c86ee0'; g.shadowBlur = 8;
    g.fillStyle = '#8a4ae0';
    g.beginPath();
    g.moveTo(CX + isW * 0.76, topY + 6);
    g.lineTo(CX + isW * 0.76, topY - 18);
    g.arc(CX + isW * 0.8, topY - 18, 5, Math.PI, 0);
    g.lineTo(CX + isW * 0.85, topY + 6);
    g.closePath(); g.fill(); g.restore();
  } else {
    crystal(g, CX - isW * 0.6, topY + 10, 13, '#b8b2e8', 'rgba(200,196,255,0.14)');
    crystal(g, CX + isW * 0.56, topY + 12, 15, '#8f88c8', 'rgba(200,196,255,0.12)');
    crystal(g, CX + isW * 0.34, topY + 24, 8, '#d8d4ff', 'rgba(200,196,255,0.12)');
    ruinColumn(g, CX - isW * 0.8, topY + 4, 13, T.prop);
  }

  /* ── görev yolu: kapıdan öne kıvrılan 10 taş ── */
  const pathPts = [];
  for (let i = 0; i < 10; i++) {
    const k = i / 9;
    const wob = Math.sin(k * Math.PI * 1.8) * isW * 0.16;
    pathPts.push([kx + wob, kyB + 8 + k * (H * 0.115)]);
  }
  for (let i = 9; i >= 0; i--) {
    const [px2, py2] = pathPts[i];
    const done = (9 - i) < cleared;      // öndeki taş = görev 1
    const sw = 7 - i * 0.28;
    if (done) {
      g.save(); g.shadowColor = '#f5c044'; g.shadowBlur = 7;
      g.fillStyle = '#e8b544';
      g.beginPath(); g.ellipse(px2, py2, sw, sw * 0.5, 0, 0, 6.283); g.fill();
      g.restore();
    } else {
      g.fillStyle = 'rgba(200,205,225,0.30)';
      g.beginPath(); g.ellipse(px2, py2, sw, sw * 0.5, 0, 0, 6.283); g.fill();
    }
  }

  /* ── meşaleler (yol başı) ── */
  for (const side of [-1, 1]) {
    const tx = kx + side * isW * 0.2, ty2 = topY + H * 0.088;
    g.strokeStyle = '#42394f'; g.lineWidth = 2.4;
    g.beginPath(); g.moveTo(tx, ty2); g.lineTo(tx, ty2 - 18); g.stroke();
    g.fillStyle = wd.glow.replace(/[\d.]+\)$/, '0.22)');
    g.beginPath(); g.arc(tx, ty2 - 22, 9, 0, 6.283); g.fill();
    g.fillStyle = wd.color;
    g.beginPath(); g.ellipse(tx, ty2 - 21, 2.6, 4.6, 0, 0, 6.283); g.fill();
    g.fillStyle = '#fff0d8';
    g.beginPath(); g.ellipse(tx, ty2 - 20, 1.1, 2.2, 0, 0, 6.283); g.fill();
  }

  /* ── sis bantları ── */
  g.globalCompositeOperation = 'lighter';
  for (const [oy, alpha, ww] of [[0.015, 0.05, 1.15], [0.06, 0.035, 1.3]]) {
    g.fillStyle = 'rgba(160,170,220,' + alpha + ')';
    g.beginPath();
    g.ellipse(CX, topY + H * oy + 8, isW * ww, H * 0.028, 0, 0, 6.283);
    g.fill();
  }
  g.globalCompositeOperation = 'source-over';

  return cv;
}

/** Önbellekli erişim: dünya + ilerleme + boyut anahtarı. */
export function getDiorama(wd, cleared, W, H) {
  const key = wd.id + ':' + cleared + ':' + W + 'x' + H;
  let c = cache.get(key);
  if (!c) {
    c = paint(wd, cleared, W, H);
    /* aynı dünyanın eski ilerleme kareleri şişmesin */
    for (const k of cache.keys()) {
      if (k.startsWith(wd.id + ':') && k !== key) cache.delete(k);
    }
    cache.set(key, c);
  }
  return c;
}

/* ═══════════ YOLCULUK HARİTASI ZEMİNİ (Dünyalar sayfası) ═══════════
   Segment başına tema zemini: gökyüzü + ay + yan siluetler + sis.
   Orta şerit bilinçli boş bırakılır — görev yolu DOM üstünde yaşar. */

function paintJourney(wd, W, H) {
  const cv = document.createElement('canvas');
  const DPR = Math.min(window.devicePixelRatio || 1, 1.6);
  cv.width = Math.round(W * DPR);
  cv.height = Math.round(H * DPR);
  const g = cv.getContext('2d');
  g.scale(DPR, DPR);
  const rnd = rng(wd.id * 31337 + 5);

  /* zemin: dünyanın havası — karanlık ama OKUNUR (orta ton taban) */
  const base = g.createLinearGradient(0, 0, 0, H);
  base.addColorStop(0, wd.glow.replace(/[\d.]+\)$/, '0.16)'));
  base.addColorStop(0.4, 'rgba(18,21,32,0.6)');
  base.addColorStop(1, 'rgba(12,14,22,0.9)');
  g.fillStyle = '#151928';
  g.fillRect(0, 0, W, H);
  g.fillStyle = base;
  g.fillRect(0, 0, W, H);

  /* yıldızlar */
  for (let i = 0; i < 26; i++) {
    g.fillStyle = 'rgba(230,228,255,' + (0.08 + rnd() * 0.22) + ')';
    g.fillRect(rnd() * W, rnd() * H * 0.5, 1.2, 1.2);
  }

  /* ay — üst köşe */
  const mx = W * (0.16 + rnd() * 0.12), my = H * 0.13, mr = W * 0.085;
  const moon = g.createRadialGradient(mx - mr * 0.3, my - mr * 0.3, 2, mx, my, mr);
  moon.addColorStop(0, wd.moon[0]);
  moon.addColorStop(0.5, wd.moon[1]);
  moon.addColorStop(1, wd.moon[3]);
  g.save();
  g.shadowColor = wd.glow.replace(/[\d.]+\)$/, '0.65)'); g.shadowBlur = 26;
  g.fillStyle = moon;
  g.beginPath(); g.arc(mx, my, mr, 0, 6.283); g.fill();
  g.restore();

  /* uzak tepe siluetleri */
  g.fillStyle = 'rgba(10,12,20,0.75)';
  g.beginPath();
  g.moveTo(0, H * 0.34);
  let px = 0;
  while (px < W) {
    const nx = px + 40 + rnd() * 70;
    g.lineTo((px + nx) / 2, H * (0.24 + rnd() * 0.09));
    g.lineTo(nx, H * 0.34);
    px = nx;
  }
  g.lineTo(W, H * 0.42); g.lineTo(0, H * 0.42);
  g.closePath(); g.fill();

  /* kenar dekorları — orta %46 şerit boş */
  const edgeProp = (x, y, s) => {
    if (wd.floor === 'mezarlik') { if (rnd() < 0.5) tombstone(g, x, y, s, '#4a5470'); else deadTree(g, x, y, s * 1.6, '#39415a'); }
    else if (wd.floor === 'kul') {
      g.fillStyle = '#241612';
      g.beginPath(); g.moveTo(x - s, y); g.lineTo(x, y - s * 2.1); g.lineTo(x + s, y); g.closePath(); g.fill();
      g.fillStyle = 'rgba(255,120,50,0.65)'; g.fillRect(x - 1.2, y - s * 1.5, 2.4, 3.4);
    }
    else if (wd.floor === 'bataklik') mushroom(g, x, y, s, '#3ac8a0', 'rgba(80,220,180,0.13)');
    else if (wd.floor === 'katedral') { if (rnd() < 0.55) ruinColumn(g, x, y, s, '#5c4e80'); else candleClump(g, x, y, s * 0.7, '#ffd08a'); }
    else crystal(g, x, y, s, '#a8a2dd', 'rgba(200,196,255,0.13)');
  };
  for (let i = 0; i < 7; i++) {
    const left = rnd() < 0.5;
    const x = left ? W * (0.045 + rnd() * 0.16) : W * (0.79 + rnd() * 0.16);
    edgeProp(x, H * (0.4 + (i / 7) * 0.55 + rnd() * 0.04), 9 + rnd() * 8);
  }

  /* sis bantları */
  g.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 3; i++) {
    g.fillStyle = 'rgba(150,160,210,0.035)';
    g.beginPath();
    g.ellipse(W * (0.2 + rnd() * 0.6), H * (0.35 + i * 0.24), W * 0.5, 16 + rnd() * 12, 0, 0, 6.283);
    g.fill();
  }
  g.globalCompositeOperation = 'source-over';

  /* alt kenar karartması — sonraki segmente yumuşak geçiş */
  const fade = g.createLinearGradient(0, H - 60, 0, H);
  fade.addColorStop(0, 'rgba(9,10,16,0)');
  fade.addColorStop(1, 'rgba(9,10,16,0.9)');
  g.fillStyle = fade;
  g.fillRect(0, H - 60, W, 60);

  return cv;
}

export function getJourneyBg(wd, W, H) {
  const key = 'j' + wd.id + ':' + W + 'x' + H;
  let c = cache.get(key);
  if (!c) { c = paintJourney(wd, W, H); cache.set(key, c); }
  return c;
}
