/* ═══════════════════════════════════════════════════════════
   arenaPaint.js — ORTAK BOYAMA KİTİ (kompozisyon DEĞİL, malzeme)

   NEDEN AYRILDI (2026-08-25): `arenaMaps.makeMap()` on haritayı TEK
   `floor()` ve TEK `props()` ile boyuyordu. Fark yalnız palet, yüzey
   reçetesi ve üç düzen arketipiydi — yani on haritanın hepsinde aynı
   yedi tesis vardı (taş meydan + kuyu, sekizgen tapınak sahanlığı,
   gölet + sazlık, yedi sıralı parsel tarlası, kolonad, mahzen avlusu,
   dövüş göbeği), sadece yerleri ve renkleri değişiyordu. Kullanıcının
   teşhisi birebir doğruydu: "her harita aynı terrain, sadece renkleri
   farklı."

   FABRİKA KODDA DOĞRUYDU, TASARIMDA YANLIŞTI. Bu dosyanın geçmişindeki
   her ders (kenar evenodd ile kırpılır · grade piksel döngüsüyle
   yazılmaz · wrap içinde rnd() dikişi bozar · öğe boyu dünya pikselinde
   yazılır) tek bir yerde yaşamak zorunda — o yüzden MALZEME burada
   ortak kalır. Ama KOMPOZİSYON haritanın kendi dosyasında yaşar
   (`arenaPlan.js`): on ayrı zemin planı, on ayrı nesne dağarcığı.

   BURADA OLAN: renk/ışık geçişleri, ölçüm koruyucuları, ve bir yer
   planının çizebileceği ilkel öğeler (yol, döşeme, plaka, tarla,
   su, çukur, iskele, çatlak…). BURADA OLMAYAN: hangi haritada hangi
   öğenin nerede olduğu.
   ═══════════════════════════════════════════════════════════ */

export const TAU = 6.28318;

/* deterministik rng: aynı harita her pişirmede aynı */
export function rng(seed) {
  let s = (seed | 0) || 1;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

export function seedOf(id) {
  let seed = 7;
  for (let i = 0; i < id.length; i++) seed = (seed * 131 + id.charCodeAt(i)) % 2147483647;
  return seed;
}

/* ── ortam: birim koordinat (0..1) → tuval pikseli ───────────
   Plan dosyaları HER ZAMAN birim koordinatta yazılır. Sebep: saha bir
   kez 1900'den 4000'e çıktı ve o taşınmada piksel sabitiyle yazılmış
   her şey sessizce yanlış yere gitti. */
export function env(g, P, B, seed) {
  const rnd = rng(seed);
  const full = P + B * 2;
  const cx = full / 2, cy = full / 2;
  const E = {
    g, P, B, full, cx, cy, x0: B, y0: B, rnd, res: 1,
    U: (u) => B + u * P,
    V: (v) => B + v * P,
    R: (k) => P * k,
    soft(x, y, r, col) {
      const v = g.createRadialGradient(x, y, r * 0.05, x, y, r);
      v.addColorStop(0, col); v.addColorStop(1, fade(col));
      g.fillStyle = v; g.fillRect(x - r, y - r, r * 2, r * 2);
    },
    /* düzensiz çokgen: çatlak/plaka/leke ortak temeli */
    poly(x, y, r, n, jitter, sy) {
      g.beginPath();
      for (let i = 0; i <= n; i++) {
        const a = (i / n) * TAU;
        const rr = r * (1 - jitter + rnd() * jitter * 2);
        const px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr * (sy || 1);
        i ? g.lineTo(px, py) : g.moveTo(px, py);
      }
      g.closePath();
    },
    spot(minK, maxK) {
      const a = rnd() * TAU;
      const r = P * (minK + rnd() * ((maxK || 0.46) - minK));
      return [cx + Math.cos(a) * r, cy + Math.sin(a) * r];
    },
  };
  return E;
}

/* alfa'yı sıfıra çeken güvenli yol: rgba/hex ikisini de yer */
export function fade(col) {
  if (col.indexOf('rgba') === 0) return col.replace(/[\d.]+\)$/, '0)');
  if (col.indexOf('rgb(') === 0) return col.replace('rgb(', 'rgba(').replace(')', ',0)');
  return 'rgba(0,0,0,0)';
}

/* alfa değiştir (rgba/rgb) */
export function alpha(col, a) {
  if (col.indexOf('rgba') === 0) return col.replace(/[\d.]+\)$/, a + ')');
  if (col.indexOf('rgb(') === 0) return col.replace('rgb(', 'rgba(').replace(')', ',' + a + ')');
  return col;
}

/* dört kenarı aynı kodla boya: üst kenar koordinatlarında çiz */
export function eachSide(g, E, fn) {
  for (let s = 0; s < 4; s++) {
    g.save();
    g.translate(E.full / 2, E.full / 2);
    g.rotate(s * Math.PI / 2);
    g.translate(-E.full / 2, -E.full / 2);
    fn(g, s);
    g.restore();
  }
}

/* iç eşik şeridi: sınırın UZAKTAN okunması. Harita BİTER. */
export function threshold(g, E, col, w) {
  const t = w || 5;
  g.strokeStyle = col; g.lineWidth = t;
  g.strokeRect(E.x0 + t / 2, E.y0 + t / 2, E.P - t, E.P - t);
}

/* ── renk tashihi: OYNANABİLİR KARENİN kromasını kısar ────────
   Parlaklığı AYNEN korur. İlk sürüm bunu JS'te piksel piksel yapıyordu
   ve pişirmeyi 11 → 329 ms'ye çıkardı; iş yerel tuval filtresine
   devredildi (~13 ms). */
export function grade(g, E, sat) {
  if (!sat || sat >= 1) return;
  const R = E.res;
  const x = Math.round(E.x0 * R), y = Math.round(E.y0 * R);
  const w = Math.max(1, Math.round(E.P * R));
  const t = document.createElement('canvas');
  t.width = w; t.height = w;
  const tg = t.getContext('2d');
  tg.filter = 'saturate(' + Math.round(sat * 100) + '%)';
  tg.drawImage(g.canvas, x, y, w, w, 0, 0, w, w);
  g.save();
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.filter = 'none';
  g.drawImage(t, x, y);
  g.restore();
}

/* gece yıkaması: kontrast oranlarını korur, tonu geceye çeker */
export function night(g, E, a) {
  g.fillStyle = 'rgba(10,9,18,' + a + ')';
  g.fillRect(E.x0, E.y0, E.P, E.P);
}

/* ── dünya kimliği: ay yıkaması + kapı ışıkları ───────────────
   ÖLÇÜM DERSİ: ay yıkaması 0,14 iken tint'in tepe noktasına denk gelen
   köşe doygunluk 0,39 okuyordu — zemin değil TINT doyguntu. 0,08'de
   kimlik korunur, ölçüm banda döner. */
export function worldTint(g, E, wd) {
  if (!wd) return;
  const glow = wd.glow || 'rgba(255,59,78,0.5)';
  const a = (v) => alpha(glow, v);
  const { full, x0, y0, P } = E;
  const moon = g.createRadialGradient(full * 0.3, 0, 60, full * 0.3, 0, full * 0.95);
  moon.addColorStop(0, a(0.06));
  moon.addColorStop(0.45, a(0.03));
  moon.addColorStop(1, a(0));
  g.fillStyle = moon; g.fillRect(0, 0, full, full);
  for (const [gx, gy] of [[0.5, 0.03], [0.5, 0.97], [0.03, 0.5], [0.97, 0.5]]) {
    const cx2 = x0 + gx * P, cy2 = y0 + gy * P;
    const rg = g.createRadialGradient(cx2, cy2, 6, cx2, cy2, 130);
    rg.addColorStop(0, a(0.13)); rg.addColorStop(1, a(0));
    g.fillStyle = rg; g.fillRect(cx2 - 130, cy2 - 130, 260, 260);
  }
}

/* köşe karartma. Sert dairesel vinyet YOK ("delikten bakıyorum"). */
export function closeOut(g, E, glow) {
  const k = E.P * 0.5;
  for (const [x, y] of [[E.x0, E.y0], [E.x0 + E.P, E.y0], [E.x0, E.y0 + E.P], [E.x0 + E.P, E.y0 + E.P]]) {
    const v = g.createRadialGradient(x, y, k * 0.15, x, y, k);
    v.addColorStop(0, 'rgba(0,0,0,0.2)'); v.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = v; g.fillRect(x - k, y - k, k * 2, k * 2);
  }
  const mx = E.x0 + E.P * 0.22, my = E.y0 + E.P * 0.16, r = E.P * 0.3;
  const v2 = g.createRadialGradient(mx, my, r * 0.1, mx, my, r);
  v2.addColorStop(0, alpha(glow, 0.03));
  v2.addColorStop(1, alpha(glow, 0));
  g.fillStyle = v2; g.fillRect(mx - r, my - r, r * 2, r * 2);
}

/* ── döşenen detay katmanı ortamı. Dikişsizlik ZORUNLU. ─────── */
export function denv(S, tileWorld, seed) {
  const rnd = rng(seed);
  return {
    S, rnd, tileWorld, k: S / tileWorld,
    wrap(x, y, pad, fn) {
      fn(x, y);
      const wx = x < pad ? S : (x > S - pad ? -S : 0);
      const wy = y < pad ? S : (y > S - pad ? -S : 0);
      if (wx) fn(x + wx, y);
      if (wy) fn(x, y + wy);
      if (wx && wy) fn(x + wx, y + wy);
    },
    /* yerel olarak ORTAK yön alanı: rastgele açı kamuflaj okunur,
       öbek öbek aynı yöne yatan öğe rüzgâr/akış/katman okunur. */
    field(cell) {
      const c = cell * this.k;
      return (x, y) => Math.sin(Math.floor(x / c) * 12.9898 + Math.floor(y / c) * 78.233) * 3.1416;
    },
  };
}

/* ═══════════════ KOMPOZİSYON İLKELLERİ ═══════════════════════
   Bir yer planının çizebileceği parçalar. Hepsi birim koordinat alır,
   hiçbiri NEREDE olduğuna karar vermez.
   ═════════════════════════════════════════════════════════════ */
export function kit(g, E, Q) {
  const { U, V, R, rnd } = E;
  const K = {
    /* ── zemin tabanı: taban rengi + tonal göletler + yönlü fırça ──
       Makro katman 0,48 texel/px ile örneklenir: yuvarlak leke o
       ölçekte yumuşak bir yamaya dönüp "kamuflaj" okunuyor, YÖNLÜ iz
       bulanıklaşsa bile akış gibi okunur. */
    base(brushA, cell) {
      g.fillStyle = Q.g0; g.fillRect(E.x0, E.y0, E.P, E.P);
      for (let i = 0; i < 40; i++) {
        E.soft(E.x0 + rnd() * E.P, E.y0 + rnd() * E.P, R(0.05 + rnd() * 0.13), Q.pool[i % Q.pool.length]);
      }
      const c = cell || 240, n = brushA || 3000;
      g.lineCap = 'round';
      for (let i = 0; i < n; i++) {
        const x = E.x0 + rnd() * E.P, y = E.y0 + rnd() * E.P;
        const a = Math.sin(Math.floor(x / c) * 12.9898 + Math.floor(y / c) * 78.233) * 3.1416;
        const len = 18 + rnd() * 30;
        g.strokeStyle = rnd() < 0.5 ? Q.brush0 : Q.brush1;
        g.lineWidth = 4 + rnd() * 6;
        g.beginPath();
        g.moveTo(x, y); g.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len);
        g.stroke();
      }
    },

    /* ── YOL: yumuşak eğri + çiğnenmiş kenar geçişi ──────────
       Kenar geçişi olmadan yol zemine YAPIŞTIRILMIŞ bir şerit gibi
       durur. pts birim koordinatta. */
    road(pts, w, o) {
      const op = o || {};
      const path = () => {
        g.beginPath();
        g.moveTo(U(pts[0][0]), V(pts[0][1]));
        for (let i = 1; i < pts.length - 1; i++) {
          const mx = (pts[i][0] + pts[i + 1][0]) / 2, my = (pts[i][1] + pts[i + 1][1]) / 2;
          g.quadraticCurveTo(U(pts[i][0]), V(pts[i][1]), U(mx), V(my));
        }
        const l = pts[pts.length - 1];
        g.quadraticCurveTo(U(l[0]), V(l[1]), U(l[0]), V(l[1]));
      };
      const W = R(w);
      g.lineCap = op.cap || 'round'; g.lineJoin = 'round';
      path(); g.strokeStyle = op.edge || Q.roadEdge; g.lineWidth = W + 26; g.stroke();
      path(); g.strokeStyle = op.fill || Q.road; g.lineWidth = W; g.stroke();
      path(); g.strokeStyle = op.lite || Q.roadLite; g.lineWidth = W * 0.66; g.stroke();
      if (!op.noRut) { path(); g.strokeStyle = 'rgba(20,20,16,0.30)'; g.lineWidth = W * 0.16; g.stroke(); }
    },

    /* halka yol: merkez + yarıçap. Dört kapı hizasında AŞINMA açar. */
    ring(cx, cy, r, w, o) {
      const op = o || {};
      const X = U(cx), Y = V(cy), RR = R(r), W = R(w);
      const arc = () => { g.beginPath(); g.arc(X, Y, RR, 0, TAU); };
      g.lineCap = 'butt';
      arc(); g.strokeStyle = op.edge || Q.roadEdge; g.lineWidth = W + 26; g.stroke();
      arc(); g.strokeStyle = op.fill || Q.road; g.lineWidth = W; g.stroke();
      arc(); g.strokeStyle = op.lite || Q.roadLite; g.lineWidth = W * 0.6; g.stroke();
      arc(); g.strokeStyle = 'rgba(18,18,14,0.26)'; g.lineWidth = W * 0.14; g.stroke();
    },

    /* ışınsal kol: merkezden dışa düz yol */
    spoke(cx, cy, r0, r1, ang, w, o) {
      const c = Math.cos(ang), s = Math.sin(ang);
      K.road([[cx + c * r0, cy + s * r0],
        [cx + c * (r0 + r1) / 2, cy + s * (r0 + r1) / 2],
        [cx + c * r1, cy + s * r1]], w, o);
    },

    /* ── TAŞ DÖŞEME (daire): taşlar TEK TEK çizilir ──────────
       Izgara + dikiş çizgisi yaklaşımı 0,48 texel/px'te gri bulamaç
       verir; tek tek çizilen 34-46 px'lik taş 16-22 texel = net. */
    cobble(cx, cy, rad, o) {
      const op = o || {};
      const X = U(cx), Y = V(cy), RAD = R(rad), cell = R(op.cell || 0.0115);
      const sc = op.stone || Q.cobStone;
      g.save();
      if (op.clip) op.clip(); else { g.beginPath(); g.arc(X, Y, RAD, 0, TAU); g.clip(); }
      g.fillStyle = op.base || Q.cobBase;
      g.fillRect(X - RAD * 1.4, Y - RAD * 1.4, RAD * 2.8, RAD * 2.8);
      const n = Math.ceil((RAD * 2.8) / cell) + 1;
      const rot = op.rot || 0;
      g.save();
      g.translate(X, Y); g.rotate(rot); g.translate(-X, -Y);
      for (let r = 0; r < n; r++) {
        for (let c = 0; c < n; c++) {
          const ox = (r & 1) ? cell * 0.5 : 0;
          const px = X - RAD * 1.4 + c * cell + ox + (rnd() - 0.5) * 4;
          const py = Y - RAD * 1.4 + r * cell + (rnd() - 0.5) * 4;
          const w = cell * (0.76 + rnd() * 0.16), h = cell * (0.66 + rnd() * 0.2);
          const k = 0.82 + rnd() * 0.36;
          g.save();
          g.translate(px, py); g.rotate((rnd() - 0.5) * 0.22);
          g.fillStyle = 'rgba(10,12,14,0.42)';
          g.beginPath(); g.roundRect(-w / 2 + 2, -h / 2 + 3, w, h, 5); g.fill();
          g.fillStyle = 'rgb(' + (sc[0] * k | 0) + ',' + (sc[1] * k | 0) + ',' + (sc[2] * k | 0) + ')';
          g.beginPath(); g.roundRect(-w / 2, -h / 2, w, h, 5); g.fill();
          g.fillStyle = 'rgba(230,234,220,0.13)';
          g.beginPath(); g.roundRect(-w / 2 + 1.5, -h / 2 + 1.5, w - 3, h * 0.3, 4); g.fill();
          g.restore();
        }
      }
      g.restore();
      if (!op.hardEdge) {
        const v = g.createRadialGradient(X, Y, RAD * 0.62, X, Y, RAD);
        v.addColorStop(0, Q.blend0);
        v.addColorStop(1, Q.blend1);
        g.fillStyle = v; g.fillRect(X - RAD, Y - RAD, RAD * 2, RAD * 2);
      }
      g.restore();
    },

    /* ── BÜYÜK LEVHA DÖŞEME (dikdörtgen): katedral/plaza zemini ──
       Döşeme taşı BÜYÜK: 90-130 dünya px. Küçük karo makroda kaybolur
       ve o zemin "gri" okunur; büyük levha derz çizgisiyle birlikte
       gerçek bir iç mekân döşemesi gibi durur. */
    slabs(x0, y0, x1, y1, cellK, o) {
      const op = o || {};
      const X0 = U(x0), Y0 = V(y0), X1 = U(x1), Y1 = V(y1);
      const cell = R(cellK), sc = op.stone || Q.limeStone;
      g.save();
      if (op.clip) { op.clip(); } else { g.beginPath(); g.rect(X0, Y0, X1 - X0, Y1 - Y0); g.clip(); }
      g.fillStyle = op.base || Q.limeBase; g.fillRect(X0, Y0, X1 - X0, Y1 - Y0);
      const cols = Math.ceil((X1 - X0) / cell), rows = Math.ceil((Y1 - Y0) / cell);
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const px = X0 + c * cell, py = Y0 + r * cell;
          const k = 0.84 + rnd() * 0.32;
          const inset = 3 + rnd() * 3;
          g.fillStyle = 'rgba(8,10,12,0.40)';
          g.fillRect(px, py, cell, cell);
          g.fillStyle = 'rgb(' + (sc[0] * k | 0) + ',' + (sc[1] * k | 0) + ',' + (sc[2] * k | 0) + ')';
          g.fillRect(px + inset, py + inset, cell - inset * 2, cell - inset * 2);
          /* köşe kırıkları: düz dikdörtgen "linolyum" okunur */
          if (rnd() < 0.35) {
            g.fillStyle = 'rgba(10,12,10,0.30)';
            const w = cell * (0.12 + rnd() * 0.2);
            g.beginPath();
            const cxx = px + (rnd() < 0.5 ? inset : cell - inset - w);
            const cyy = py + (rnd() < 0.5 ? inset : cell - inset - w);
            g.moveTo(cxx, cyy); g.lineTo(cxx + w, cyy); g.lineTo(cxx, cyy + w);
            g.closePath(); g.fill();
          }
          if (rnd() < 0.22) {
            g.strokeStyle = 'rgba(14,16,14,0.34)'; g.lineWidth = 2.4;
            g.beginPath();
            g.moveTo(px + inset + rnd() * cell * 0.3, py + inset);
            g.lineTo(px + cell * (0.4 + rnd() * 0.5), py + cell - inset);
            g.stroke();
          }
        }
      }
      g.restore();
    },

    /* ── PLAKA ÖRTÜSÜ: jitterlı örgü üzerinde çokgen kabuk ──────
       Tuz kabuğu, buz plakası, bazalt sütunu — üçü de bu. Köşeler
       PAYLAŞILIR (aynı örgüden okunur), yoksa plakalar arasında boşluk
       kalır ve desen "pul" okunur. */
    plates(x0, y0, x1, y1, cellK, o) {
      const op = o || {};
      const X0 = U(x0), Y0 = V(y0), X1 = U(x1), Y1 = V(y1);
      const cell = R(cellK), jit = (op.jitter != null ? op.jitter : 0.30) * cell;
      const cols = Math.ceil((X1 - X0) / cell) + 2, rows = Math.ceil((Y1 - Y0) / cell) + 2;
      const px = [], py = [];
      const h = (i, j, s) => {
        const v = Math.sin(i * 127.1 + j * 311.7 + s * 74.7) * 43758.5453;
        return v - Math.floor(v);
      };
      for (let r = 0; r <= rows; r++) {
        for (let c = 0; c <= cols; c++) {
          const stagger = (r & 1) ? cell * 0.5 : 0;
          px.push(X0 - cell + c * cell + stagger + (h(c, r, 1) - 0.5) * jit * 2);
          py.push(Y0 - cell + r * cell + (h(c, r, 2) - 0.5) * jit * 2);
        }
      }
      const P4 = (c, r) => { const i = r * (cols + 1) + c; return [px[i], py[i]]; };
      g.save();
      if (op.clip) op.clip(); else { g.beginPath(); g.rect(X0, Y0, X1 - X0, Y1 - Y0); g.clip(); }
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const a = P4(c, r), b = P4(c + 1, r), d = P4(c + 1, r + 1), e = P4(c, r + 1);
          const k = 0.86 + h(c, r, 3) * 0.30;
          g.beginPath();
          g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.lineTo(d[0], d[1]); g.lineTo(e[0], e[1]);
          g.closePath();
          const s = op.stone || Q.plateStone || [140, 138, 122];
          g.fillStyle = 'rgb(' + (s[0] * k | 0) + ',' + (s[1] * k | 0) + ',' + (s[2] * k | 0) + ')';
          g.fill();
          /* KABARIK DERZ: tuz/buz kabuğunun kimliği yükselen sırttır.
             Çizginin bir yanı açık, diğer yanı koyu — o iki çizgi
             birlikte "kabarma" okunur, tek çizgi "çizik" okunur. */
          g.lineJoin = 'round';
          g.strokeStyle = op.ridge || 'rgba(240,238,220,0.30)';
          g.lineWidth = op.ridgeW || 7;
          g.stroke();
          g.strokeStyle = op.joint || 'rgba(16,18,14,0.36)';
          g.lineWidth = (op.ridgeW || 7) * 0.42;
          g.stroke();
        }
      }
      g.restore();
    },

    /* altıgen sütun başları (bazalt): tepeden bakılan sütun ormanı */
    hexes(x0, y0, x1, y1, radK, o) {
      const op = o || {};
      const X0 = U(x0), Y0 = V(y0), X1 = U(x1), Y1 = V(y1);
      const rad = R(radK), dx = rad * 1.732, dy = rad * 1.5;
      g.save();
      if (op.clip) op.clip(); else { g.beginPath(); g.rect(X0, Y0, X1 - X0, Y1 - Y0); g.clip(); }
      for (let r = -1; Y0 + r * dy < Y1 + dy; r++) {
        for (let c = -1; X0 + c * dx < X1 + dx; c++) {
          const cx = X0 + c * dx + ((r & 1) ? dx * 0.5 : 0);
          const cy = Y0 + r * dy;
          const k = 0.82 + rnd() * 0.34;
          const rr = rad * (0.88 + rnd() * 0.1);
          g.beginPath();
          for (let i = 0; i < 6; i++) {
            const a = i * TAU / 6 + 0.2618;
            const x = cx + Math.cos(a) * rr, y = cy + Math.sin(a) * rr;
            i ? g.lineTo(x, y) : g.moveTo(x, y);
          }
          g.closePath();
          const s = op.stone || Q.plateStone || [110, 112, 130];
          g.fillStyle = 'rgb(' + (s[0] * k | 0) + ',' + (s[1] * k | 0) + ',' + (s[2] * k | 0) + ')';
          g.fill();
          g.strokeStyle = op.joint || 'rgba(10,11,16,0.52)';
          g.lineWidth = 5; g.stroke();
          /* üst yüz aydınlığı: sütun başı ışığı tutar */
          g.fillStyle = 'rgba(214,222,255,0.07)';
          g.beginPath(); g.ellipse(cx, cy - rr * 0.18, rr * 0.6, rr * 0.34, 0, 0, TAU); g.fill();
        }
      }
      g.restore();
    },

    /* ── SU: haritanın tek doygun alanı; gözü oraya çeker ────── */
    water(cx, cy, rad, o) {
      const op = o || {};
      const X = U(cx), Y = V(cy), RAD = R(rad);
      g.save();
      if (op.clip) op.clip(); else E.poly(X, Y, RAD, op.n || 18, op.jitter || 0.20, op.sy || 0.80);
      if (!op.clip) g.clip(); else g.clip();
      const v = g.createRadialGradient(X, Y - RAD * 0.2, RAD * 0.1, X, Y, RAD * (op.grad || 1));
      v.addColorStop(0, Q.water[0]);
      v.addColorStop(0.55, Q.water[1]);
      v.addColorStop(1, Q.water[2]);
      g.fillStyle = v; g.fillRect(X - RAD * 1.6, Y - RAD * 1.6, RAD * 3.2, RAD * 3.2);
      for (let i = 0; i < (op.lines || 34); i++) {
        const lx = X + (rnd() - 0.5) * RAD * 1.8, ly = Y + (rnd() - 0.5) * RAD * 1.4;
        const w = 30 + rnd() * 110;
        g.strokeStyle = Q.waterLine.replace('A', (0.06 + rnd() * 0.10).toFixed(3));
        g.lineWidth = 2 + rnd() * 3;
        g.beginPath(); g.moveTo(lx, ly); g.lineTo(lx + w, ly); g.stroke();
      }
      g.restore();
      if (op.shore !== false) {
        g.strokeStyle = Q.shore; g.lineWidth = op.shoreW || 22;
        E.poly(X, Y, RAD * 1.02, op.n || 18, op.jitter || 0.20, op.sy || 0.80); g.stroke();
      }
      if (op.reeds) {
        g.lineCap = 'round';
        for (let i = 0; i < op.reeds; i++) {
          const a = rnd() * TAU, rr = RAD * (0.98 + rnd() * 0.14);
          const lx = X + Math.cos(a) * rr, ly = Y + Math.sin(a) * rr * (op.sy || 0.8);
          const hh = 12 + rnd() * 22;
          g.strokeStyle = rnd() < 0.5 ? Q.reed0 : Q.reed1;
          g.lineWidth = 2.4 + rnd() * 2;
          g.beginPath(); g.moveTo(lx, ly); g.lineTo(lx + (rnd() - 0.5) * 10, ly - hh); g.stroke();
        }
      }
    },

    /* ── ÇUKUR / KRATER: koyu göbek + kabarık sırt (+ kor) ───── */
    pit(cx, cy, rad, o) {
      const op = o || {};
      const X = U(cx), Y = V(cy), RAD = R(rad);
      g.save();
      E.poly(X, Y, RAD * 1.16, 16, 0.14, 0.94); g.clip();
      g.fillStyle = op.rim || 'rgba(120,112,96,0.30)';
      g.fillRect(X - RAD * 1.3, Y - RAD * 1.3, RAD * 2.6, RAD * 2.6);
      g.restore();
      g.save();
      E.poly(X, Y, RAD, 16, 0.12, 0.94); g.clip();
      const v = g.createRadialGradient(X, Y, RAD * 0.05, X, Y, RAD);
      v.addColorStop(0, op.core || 'rgba(8,8,10,0.86)');
      v.addColorStop(0.6, op.mid || 'rgba(14,14,16,0.66)');
      v.addColorStop(1, 'rgba(20,20,22,0.20)');
      g.fillStyle = v; g.fillRect(X - RAD, Y - RAD, RAD * 2, RAD * 2);
      if (op.glow) {
        const e = g.createRadialGradient(X, Y, RAD * 0.02, X, Y, RAD * 0.62);
        e.addColorStop(0, alpha(op.glow, 0.5));
        e.addColorStop(0.5, alpha(op.glow, 0.16));
        e.addColorStop(1, alpha(op.glow, 0));
        g.fillStyle = e; g.fillRect(X - RAD, Y - RAD, RAD * 2, RAD * 2);
        for (let i = 0; i < 26; i++) {
          const a = rnd() * TAU, rr = RAD * rnd() * 0.7;
          g.fillStyle = alpha(op.glow, 0.10 + rnd() * 0.3);
          g.beginPath();
          g.ellipse(X + Math.cos(a) * rr, Y + Math.sin(a) * rr, 4 + rnd() * 12, 3 + rnd() * 8, rnd() * 3, 0, TAU);
          g.fill();
        }
      }
      g.restore();
    },

    /* ── ÇATLAK / YARIK: kırıklı yol + isteğe bağlı kor ışığı ── */
    fissure(pts, w, o) {
      const op = o || {};
      const path = (k) => {
        g.beginPath();
        g.moveTo(U(pts[0][0]), V(pts[0][1]));
        for (let i = 1; i < pts.length; i++) g.lineTo(U(pts[i][0]) + k, V(pts[i][1]) + k);
      };
      const W = R(w);
      g.lineCap = 'round'; g.lineJoin = 'round';
      path(0); g.strokeStyle = op.lip || 'rgba(150,142,124,0.20)'; g.lineWidth = W * 2.6; g.stroke();
      path(0); g.strokeStyle = op.dark || 'rgba(6,6,8,0.86)'; g.lineWidth = W; g.stroke();
      if (op.glow) {
        path(0); g.strokeStyle = alpha(op.glow, 0.22); g.lineWidth = W * 0.52; g.stroke();
        path(0); g.strokeStyle = alpha(op.glow, 0.5); g.lineWidth = W * 0.20; g.stroke();
      }
    },

    /* ── TARLA SIRALARI: tırmıklanmış toprak + taş bordür ─────
       Bordür 12 px = makroda 6 texel, okunur; hairline 0,48 texel/px'te
       tamamen kaybolur (yerel kontrast 3,4 okumuştu). */
    furrow(x, y, w, h, rot, o) {
      const op = o || {};
      const X = U(x), Y = V(y), W = R(w), H = R(h);
      g.save();
      g.translate(X + W / 2, Y + H / 2); g.rotate(rot); g.translate(-(X + W / 2), -(Y + H / 2));
      g.fillStyle = op.bed || Q.plot;
      g.beginPath(); g.roundRect(X, Y, W, H, 10); g.fill();
      if (op.kerb !== false) {
        g.strokeStyle = op.kerbCol || 'rgba(158,158,140,0.30)'; g.lineWidth = 12;
        g.beginPath(); g.roundRect(X + 6, Y + 6, W - 12, H - 12, 8); g.stroke();
      }
      g.strokeStyle = 'rgba(10,12,8,0.42)'; g.lineWidth = 5;
      g.beginPath(); g.roundRect(X, Y, W, H, 10); g.stroke();
      const step = op.step || 18;
      for (let i = 0; i < H / step; i++) {
        const py = Y + 12 + i * step;
        g.strokeStyle = i % 2 ? 'rgba(10,12,8,0.34)' : (op.ridge || 'rgba(112,112,96,0.20)');
        g.lineWidth = 5.5;
        g.beginPath(); g.moveTo(X + 14, py); g.lineTo(X + W - 14, py); g.stroke();
      }
      for (let i = 0; i < (W * H) / 5200; i++) {
        const sx = X + 16 + rnd() * (W - 32), sy = Y + 16 + rnd() * (H - 32);
        const rr = 8 + rnd() * 12;
        g.beginPath(); g.ellipse(sx, sy, rr, rr * (0.55 + rnd() * 0.4), rnd() * 3.14, 0, TAU);
        g.fillStyle = rnd() < 0.5 ? (op.clod || 'rgba(150,152,134,0.24)') : 'rgba(12,14,10,0.34)';
        g.fill();
      }
      g.restore();
    },

    /* ── AHŞAP İSKELE / TAHTA YOL: enine kalaslar ─────────────
       Bataklığın yolu budur. Kalaslar TEK TEK çizilir; şerit + çizgi
       yaklaşımı makroda "bant" okunur, kalas okunmaz. */
    plank(pts, w, o) {
      const op = o || {};
      const W = R(w);
      for (let s = 0; s < pts.length - 1; s++) {
        const ax = U(pts[s][0]), ay = V(pts[s][1]), bx = U(pts[s + 1][0]), by = V(pts[s + 1][1]);
        const len = Math.hypot(bx - ax, by - ay);
        const a = Math.atan2(by - ay, bx - ax);
        const n = Math.max(2, Math.round(len / (W * 0.30)));
        g.save();
        g.translate(ax, ay); g.rotate(a);
        /* alt kiriş gölgesi: iskelenin suyun ÜSTÜNDE olduğu buradan okunur */
        g.fillStyle = 'rgba(6,10,10,0.52)';
        g.fillRect(0, -W / 2 - 6, len, W + 14);
        for (let i = 0; i < n; i++) {
          const t = (i / n) * len, pw = len / n;
          const k = 0.80 + rnd() * 0.36;
          const wc = op.wood || [124, 92, 58];
          g.fillStyle = 'rgb(' + (wc[0] * k | 0) + ',' + (wc[1] * k | 0) + ',' + (wc[2] * k | 0) + ')';
          g.fillRect(t + 1.5, -W / 2, pw - 3, W);
          g.fillStyle = 'rgba(226,214,186,0.10)';
          g.fillRect(t + 1.5, -W / 2, pw - 3, W * 0.16);
          g.fillStyle = 'rgba(10,12,10,0.30)';
          g.fillRect(t + 1.5, W / 2 - W * 0.12, pw - 3, W * 0.12);
        }
        /* uzunlamasına iki kiriş: kalasların üstünde değil ALTINDA
           okunması için kenarda koyu şerit */
        g.fillStyle = 'rgba(8,10,8,0.34)';
        g.fillRect(0, -W / 2, len, 3); g.fillRect(0, W / 2 - 3, len, 3);
        g.restore();
      }
    },

    /* ── SET / İSTİNAT DUVARI ÇİZGİSİ: teras kenarı ──────────
       Kot farkını tek bir çizgi anlatır: üstte açık sırt, altta uzun
       yumuşak gölge. Bu ikili olmadan teras "renk bandı" okunur. */
    scarp(pts, o) {
      const op = o || {};
      const path = (dy) => {
        g.beginPath();
        g.moveTo(U(pts[0][0]), V(pts[0][1]) + dy);
        for (let i = 1; i < pts.length - 1; i++) {
          const mx = (pts[i][0] + pts[i + 1][0]) / 2, my = (pts[i][1] + pts[i + 1][1]) / 2;
          g.quadraticCurveTo(U(pts[i][0]), V(pts[i][1]) + dy, U(mx), V(my) + dy);
        }
        const l = pts[pts.length - 1];
        g.quadraticCurveTo(U(l[0]), V(l[1]) + dy, U(l[0]), V(l[1]) + dy);
      };
      const d = R(op.drop || 0.012);
      g.lineCap = 'round';
      path(d * 0.7); g.strokeStyle = op.shadow || 'rgba(8,9,7,0.44)'; g.lineWidth = d * 1.5; g.stroke();
      path(0); g.strokeStyle = op.face || 'rgba(30,30,24,0.50)'; g.lineWidth = d * 0.8; g.stroke();
      path(-d * 0.28); g.strokeStyle = op.crest || 'rgba(176,172,150,0.26)'; g.lineWidth = d * 0.34; g.stroke();
    },

    /* oyulmuş halkalar: sahanlık/mühür süsü */
    engrave(cx, cy, rad, n, o) {
      const op = o || {};
      const X = U(cx), Y = V(cy), RAD = R(rad);
      for (let i = 1; i <= n; i++) {
        g.beginPath(); g.arc(X, Y, RAD * (i / (n + 0.4)), 0, TAU);
        g.strokeStyle = op.col || Q.engrave; g.lineWidth = op.w || 5; g.stroke();
      }
    },

    /* ışınsal oyma: çark/tapınak mührü */
    rays(cx, cy, r0, r1, n, o) {
      const op = o || {};
      const X = U(cx), Y = V(cy);
      g.lineCap = 'butt';
      for (let i = 0; i < n; i++) {
        const a = (i / n) * TAU + (op.off || 0);
        g.strokeStyle = op.col || Q.engrave; g.lineWidth = op.w || 6;
        g.beginPath();
        g.moveTo(X + Math.cos(a) * R(r0), Y + Math.sin(a) * R(r0));
        g.lineTo(X + Math.cos(a) * R(r1), Y + Math.sin(a) * R(r1));
        g.stroke();
      }
    },

    /* ── DÖVÜŞ GÖBEĞİ: çiğnenmiş zemin + kırık döşeme mozaiği ──
       "Merkez sakin" kuralı gereği hacimli engel YOK, ama tamamen düz
       bir alan yerel kontrast bandının altına düşüp "boş duvar" okunur
       (ölçüldü: 4,4 ile bandın dibinde). Öğeler 14-84 px = düşman
       siluetinin (~30 px) ÜSTÜNDE, yani kural 3 korunur. */
    core(cx, cy, rad, o) {
      const op = o || {};
      const X = U(cx), Y = V(cy), RAD = R(rad);
      const v = g.createRadialGradient(X, Y, RAD * 0.15, X, Y, RAD);
      v.addColorStop(0, Q.core0);
      v.addColorStop(0.7, Q.core1);
      v.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = v; g.fillRect(X - RAD, Y - RAD, RAD * 2, RAD * 2);
      for (let i = 0; i < 54; i++) {
        const a = rnd() * TAU, rr = RAD * (0.15 + rnd() * 0.85);
        const w = 24 + rnd() * 56;
        g.beginPath();
        g.ellipse(X + Math.cos(a) * rr, Y + Math.sin(a) * rr, w, w * (0.36 + rnd() * 0.3), rnd() * 3.14, 0, TAU);
        g.fillStyle = rnd() < 0.5 ? Q.coreSpot0 : Q.coreSpot1;
        g.fill();
      }
      if (op.shards !== false) {
        for (let i = 0; i < 40; i++) {
          const a = rnd() * TAU, rr = RAD * (0.2 + rnd() * 0.78);
          const w = 16 + rnd() * 26, h = w * (0.5 + rnd() * 0.5);
          g.save();
          g.translate(X + Math.cos(a) * rr, Y + Math.sin(a) * rr); g.rotate(rnd() * 3.14);
          g.fillStyle = op.shard || 'rgba(122,124,112,0.22)';
          g.fillRect(-w / 2, -h / 2, w, h);
          g.fillStyle = 'rgba(10,13,9,0.28)';
          g.fillRect(-w / 2, h / 2 - 3, w, 3);
          g.restore();
        }
      }
      for (let i = 0; i < 2; i++) {
        g.beginPath(); g.arc(X, Y, RAD * (0.92 - i * 0.13), 0, TAU);
        g.strokeStyle = Q.seal; g.lineWidth = 8 - i * 3; g.stroke();
      }
    },

    /* aşınma lekeleri: yol kenarı, geçiş, çiğnenmiş toprak */
    wear(n, minK, maxK) {
      for (let i = 0; i < n; i++) {
        const sp = E.spot(minK || 0.10, maxK || 0.47);
        E.soft(sp[0], sp[1], 30 + rnd() * 76, Q.wear);
      }
    },

    /* moloz yığını: yıkılmış yapının izi */
    rubble(cx, cy, rad, n, o) {
      const op = o || {};
      const X = U(cx), Y = V(cy), RAD = R(rad);
      const v = g.createRadialGradient(X, Y, RAD * 0.1, X, Y, RAD);
      v.addColorStop(0, op.dust || 'rgba(110,108,96,0.26)');
      v.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = v; g.fillRect(X - RAD, Y - RAD, RAD * 2, RAD * 2);
      for (let i = 0; i < n; i++) {
        const a = rnd() * TAU, rr = RAD * Math.sqrt(rnd());
        const w = 18 + rnd() * 44, h = w * (0.4 + rnd() * 0.5);
        g.save();
        g.translate(X + Math.cos(a) * rr, Y + Math.sin(a) * rr); g.rotate(rnd() * 3.14);
        g.fillStyle = 'rgba(8,10,10,0.40)';
        g.fillRect(-w / 2 + 3, -h / 2 + 4, w, h);
        g.fillStyle = op.stone || 'rgba(140,140,128,0.30)';
        g.fillRect(-w / 2, -h / 2, w, h);
        g.fillStyle = 'rgba(228,230,216,0.10)';
        g.fillRect(-w / 2, -h / 2, w, h * 0.26);
        g.restore();
      }
    },

    /* sis bankı: yalnız kenarlarda, göbek berrak.
       ÖLÇÜM DERSİ: 16 bank × 0,075 alfa yerel kontrastı düzleyip
       haritayı hazlandırıyordu. Dokuz bank × 0,05. */
    haze(n, o) {
      const op = o || {};
      for (let i = 0; i < (n || 9); i++) {
        const a = rnd() * TAU, r = E.P * ((op.r0 || 0.36) + rnd() * 0.12);
        const x = E.cx + Math.cos(a) * r, y = E.cy + Math.sin(a) * r;
        const w = E.P * (0.08 + rnd() * 0.08);
        const v = g.createRadialGradient(x, y, w * 0.1, x, y, w);
        v.addColorStop(0, op.col || Q.haze); v.addColorStop(1, 'rgba(0,0,0,0)');
        g.fillStyle = v; g.fillRect(x - w, y - w, w * 2, w * 2);
      }
    },
  };
  return K;
}

/* ── ENGEL TABANLARI: gölge + kaide + moloz lekesi ──────────
   Statik olan her şey dokuya PİŞER. Kırılan engelin lekesi yerinde
   kalır — o leke zaten molozdur, yani kusur değil devamlılıktır.
   Işık sol üstten (kızıl ay lekesiyle aynı yön) → gölge sağ aşağı. */
export function paintPropBases(g, E, list, TYPES) {
  if (!list || !list.length) return;
  for (let i = 0; i < list.length; i++) {
    const p = list[i], T = TYPES[p.kind];
    if (!T) continue;
    const hx = p.hx || T.hx, hz = p.hz || T.hz, h = p.h || T.h;
    /* v49: AĞAÇ GÖLGESİ TACI OKUR (görsel = gölge) — gövde kutusu 20 birim,
       taç 58: kutudan türeyen leke tacın altında "ikişer piksel" kalıyordu. */
    const ox = T.crown ? h * 0.18 : h * 0.30, oy = T.crown ? h * 0.22 : h * 0.40;
    const rx = T.crown ? T.crown * 1.02 : hx * 1.25 + h * 0.10, ry = T.crown ? T.crown * 0.8 : hz * 1.25 + h * 0.07;
    const mx = Math.max(rx, ry);
    const v = g.createRadialGradient(p.x + ox, p.y + oy, 1, p.x + ox, p.y + oy, mx);
    v.addColorStop(0, 'rgba(4,6,8,0.5)');
    v.addColorStop(0.55, 'rgba(4,6,8,0.3)');
    v.addColorStop(1, 'rgba(4,6,8,0)');
    g.save();
    g.translate(p.x + ox, p.y + oy); g.scale(1, ry / mx); g.translate(-(p.x + ox), -(p.y + oy));
    g.fillStyle = v;
    g.fillRect(p.x + ox - rx, p.y + oy - mx, rx * 2, mx * 2);
    g.restore();
  }
  for (let i = 0; i < list.length; i++) {
    const p = list[i], T = TYPES[p.kind];
    if (!T) continue;
    const hx = p.hx || T.hx, hz = p.hz || T.hz;
    if (T.lamp) {
      const R = 132;
      const v = g.createRadialGradient(p.x, p.y, 4, p.x, p.y, R);
      v.addColorStop(0, 'rgba(255,196,120,0.15)');
      v.addColorStop(0.5, 'rgba(255,170,96,0.06)');
      v.addColorStop(1, 'rgba(255,170,96,0)');
      g.fillStyle = v; g.fillRect(p.x - R, p.y - R, R * 2, R * 2);
    }
    if (T.base === 'slab') {
      g.fillStyle = 'rgba(96,98,88,0.20)';
      g.beginPath();
      g.roundRect(p.x - hx * 1.5, p.y - hz * 1.7, hx * 3, hz * 3.4, 5);
      g.fill();
      g.strokeStyle = 'rgba(18,20,16,0.34)'; g.lineWidth = 3; g.stroke();
    } else if (T.base === 'dirt') {
      g.fillStyle = 'rgba(30,28,22,0.34)';
      g.beginPath(); g.ellipse(p.x, p.y, hx * 2.1, hz * 1.7, 0, 0, TAU); g.fill();
    } else if (T.base === 'pale') {
      g.fillStyle = 'rgba(150,144,124,0.14)';
      g.beginPath(); g.ellipse(p.x, p.y, hx * 1.8, hz * 1.6, 0, 0, TAU); g.fill();
    } else if (T.base === 'wet') {
      g.fillStyle = 'rgba(12,26,24,0.34)';
      g.beginPath(); g.ellipse(p.x, p.y, hx * 2.0, hz * 1.8, 0, 0, TAU); g.fill();
      g.strokeStyle = 'rgba(150,190,170,0.10)'; g.lineWidth = 4;
      g.beginPath(); g.ellipse(p.x, p.y, hx * 2.2, hz * 2.0, 0, 0, TAU); g.stroke();
    } else if (T.base === 'scorch') {
      g.fillStyle = 'rgba(14,10,8,0.44)';
      g.beginPath(); g.ellipse(p.x, p.y, hx * 2.2, hz * 1.9, 0, 0, TAU); g.fill();
      g.fillStyle = 'rgba(255,150,70,0.05)';
      g.beginPath(); g.ellipse(p.x, p.y, hx * 1.3, hz * 1.1, 0, 0, TAU); g.fill();
    }
  }
}
