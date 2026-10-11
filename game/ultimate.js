/* ═══════════════════════════════════════════════════════════
   v64 · SÜPER YETENEK 2.0 — her kahramanın KENDİ sahnesi.
   v61'deki tek halka + anında hasar "çok basit" bulundu (kullanıcı). Artık süper
   1,0-1,5 sn süren bir SAHNE: hasar vuruşların İNDİĞİ anda, yalnız vuruş alanında.
     okcu    AY YAĞMURU    gökte hilal doğar, hilal uçlu gümüş oklar yağar, oklar yere saplanır
     simsek  GÖK ÖFKESİ    hedef işareti → gökten zikzak yıldırım + dal, çarpma parlaması
     gokalev MAVİ KIYAMET  çapraz düşen mavi göktaşları, kuyruklu, geniş patlama
     korsan  HAYALET BORDA arkadaki hayalet bordadan kavisli gülleler
     sapanci TAŞ FIRTINASI kahramandan fırlayan seken taşlar
     kralice GECE HÜKMÜ    hedeflerde çapraz hilal kesikleri + yıldız kıvılcımı
     sovalye AYAZ SURU     dışa doğru üç halka buz sivrisi fışkırır
     seher   SEHER GİRDABI dönen üç güneş kılıcı genişleyerek süpürür
     savasci KALE ÇIĞLIĞI  yer yarılır: çatlaklı şok dalgası
   Nadirlik (1-4) gücü belirler: yarıçap · vuruş sayısı · hasar · dokunulmazlık · iyileşme.
   Düşman başına TEK vuruş (e._ultN damgası). Havuz önceden ayrılır; karede tahsis yok.
   ═══════════════════════════════════════════════════════════ */
import { applyHit } from './combat.js?v=20260930m';
import { Haptics } from './perf.js?v=20260930m';

export const ULT_NEED = 80;
export const ULT_TIER = [null,
  { r: 250, norm: 0.60, elite: 0.22, boss: 0.03, inv: 1.0, heal: 0,    n: 1.0, label: 'ADİ' },
  { r: 290, norm: 0.80, elite: 0.32, boss: 0.04, inv: 1.2, heal: 0.05, n: 1.2, label: 'NADİR' },
  { r: 330, norm: 1.00, elite: 0.45, boss: 0.05, inv: 1.5, heal: 0.10, n: 1.4, label: 'DESTANSI' },
  { r: 380, norm: 1.00, elite: 0.60, boss: 0.06, inv: 1.8, heal: 0.15, n: 1.6, label: 'EFSANE' },
];
/* k: sahne türü · base: taban vuruş sayısı · hr: vuruş alanı · desc: kahraman incelemesinde */
export const ULT_ID = {
  okcu:    { name: 'AY YAĞMURU',    col: '#cfe8ff', c2: '#7fb2ff', k: 'moon',   base: 16, hr: 70,  desc: 'Gökte hilal doğar; hilal uçlu ay okları yağar.' },
  simsek:  { name: 'GÖK ÖFKESİ',    col: '#e6f6ff', c2: '#6cc8ff', k: 'bolt',   base: 10, hr: 90,  desc: 'Gök yarılır; düşmanların üstüne zikzak yıldırımlar iner.' },
  gokalev: { name: 'MAVİ KIYAMET',  col: '#bfe9ff', c2: '#2f8dff', k: 'meteor', base: 8,  hr: 115, desc: 'Mavi alevli göktaşları çapraz düşer, geniş patlar.' },
  korsan:  { name: 'HAYALET BORDA', col: '#c8ffe6', c2: '#2fcf98', k: 'cannon', base: 10, hr: 90,  desc: 'Arkada hayalet gemi belirir, borda ateşi yağar.' },
  sapanci: { name: 'TAŞ FIRTINASI', col: '#f0dcb4', c2: '#a8804a', k: 'stone',  base: 13, hr: 70,  desc: 'Sapan fırtınası: seken taşlar kalabalığı döver.' },
  kralice: { name: 'GECE HÜKMÜ',    col: '#e8d4ff', c2: '#9a6aff', k: 'slash',  base: 14, hr: 80,  desc: 'Karanlıkta çapraz hilal kesikleri açılır.' },
  sovalye: { name: 'AYAZ SURU',     col: '#e6f8ff', c2: '#8fd6ff', k: 'spike',  base: 0,  hr: 70,  desc: 'Buz surları dışa doğru üç halka hâlinde fışkırır.' },
  seher:   { name: 'SEHER GİRDABI', col: '#fff0c4', c2: '#ff9a4a', k: 'vortex', base: 0,  hr: 0,   desc: 'Üç güneş kılıcı dönerek genişler, her şeyi süpürür.' },
  savasci: { name: 'KALE ÇIĞLIĞI',  col: '#ffd8bf', c2: '#d8623a', k: 'slam',   base: 0,  hr: 0,   desc: 'Kalkan yere iner; çatlaklı şok dalgası yayılır.' },
};
const DEF_ID = ULT_ID.okcu;
/* sahne başına zamanlama: fall = havada kalma (s), spread = vuruşların yayılma süresi, linger = iz */
const KIND = {
  moon:   { fall: 0.26, spread: 1.0,  linger: 0.55 },
  bolt:   { fall: 0.16, spread: 1.15, linger: 0.26 },
  meteor: { fall: 0.42, spread: 1.0,  linger: 0.35 },
  cannon: { fall: 0.5,  spread: 1.0,  linger: 0.3 },
  stone:  { fall: 0.34, spread: 0.9,  linger: 0.25 },
  slash:  { fall: 0.1,  spread: 0.9,  linger: 0.34 },
  spike:  { fall: 0.08, spread: 0.7,  linger: 0.6 },
};
const MAXS = 48;
const TAU = Math.PI * 2;
const hash = (s, i) => { const v = Math.sin(s * 12.9898 + i * 78.233) * 43758.5453; return v - Math.floor(v); };

export class Ultimate {
  constructor(game) {
    this.game = game; this._sc = [];
    this.S = [];
    for (let i = 0; i < MAXS; i++) this.S.push({ on: false, x: 0, y: 0, sx: 0, sy: 0, t: 0, hit: false, seed: 0, a: 0 });
    this.wave = { on: false, t: 0, dur: 0, r: 0 };
    this.reset(1, null);
  }
  reset(rarity, id) {
    this.rar = Math.max(1, Math.min(4, rarity | 0 || 1));
    this.id = ULT_ID[id] || DEF_ID;
    this.charge = 0; this.ready = false; this.fx = 0; this.uses = 0; this._told = false; this._sndT = 0;
    for (const s of this.S) s.on = false;
    this.wave.on = false;
  }
  get tier() { return ULT_TIER[this.rar]; }
  onKill(e) {
    if (this.ready || this.fx > 0) return;
    this.charge += e && e.elite ? 4 : 1;
    if (this.charge >= ULT_NEED) {
      this.charge = ULT_NEED; this.ready = true;
      const g = this.game;
      if (g.audio) g.audio.play('ultready');
      Haptics.fire('ui');
      if (!this._told && g.ui && g.ui.toast) { this._told = true; g.ui.toast(this.id.name + ' HAZIR — sağ alttaki mühre dokun'); }
    }
  }
  _hit(e, ang) {
    if (e.hp <= 0 || e._ultN === this.uses) return;
    e._ultN = this.uses;
    const T = this.tier;
    let dmg;
    if (e.isBoss) dmg = e.maxHp * T.boss;
    else if (e.elite) dmg = Math.min(e.hp - 1, e.maxHp * T.elite);
    else dmg = T.norm >= 1 ? e.hp + 1 : e.maxHp * T.norm;
    if (dmg > 0) applyHit(this.game, e, Math.ceil(dmg), ang, 380, 0, false);
  }
  _area(x, y, r) {
    const g = this.game;
    const out = g.enemies ? g.enemies.queryCircle(x, y, r + 30, this._sc) : [];
    for (let i = 0; i < out.length; i++) {
      const e = out[i], dx = e.x - x, dy = e.y - y, rr = r + e.radius;
      if (dx * dx + dy * dy <= rr * rr) this._hit(e, Math.atan2(dy, dx));
    }
  }
  _slot() { for (const s of this.S) if (!s.on) return s; return null; }
  fire() {
    const g = this.game, p = g.player;
    if (!this.ready || g.state !== 'playing' || !p) return false;
    const T = this.tier, C = this.id, R = T.r;
    this.ready = false; this.charge = 0; this.uses++;
    this.t = 0; this.ox = p.x; this.oy = p.y;
    p.invuln = Math.max(p.invuln || 0, T.inv);
    if (T.heal > 0 && !p.noHeal) p.hp = Math.min(p.maxHp, p.hp + Math.round(p.maxHp * T.heal));
    for (const s of this.S) s.on = false;
    const k = C.k;
    if (k === 'vortex' || k === 'slam') {
      Object.assign(this.wave, { on: true, t: 0, dur: k === 'slam' ? 0.55 : 1.05, r: 0 });
      this.fx = this.wave.dur + 0.5;
    } else if (k === 'spike') {
      /* üç halka, dışa doğru gecikmeli: 8 · 12 · 16 sivri */
      const rings = [[0.36, 8], [0.68, 12], [1.0, 16]];
      for (let ri = 0; ri < 3; ri++) {
        const [f, n] = rings[ri], off = ri * 0.37;
        for (let j = 0; j < n; j++) {
          const s = this._slot(); if (!s) break;
          const a = off + (j / n) * TAU;
          Object.assign(s, { on: true, x: p.x + Math.cos(a) * R * f, y: p.y + Math.sin(a) * R * f * 0.9, t: -f * 0.55, hit: false, seed: Math.random() * 100, a });
        }
      }
      this.fx = 1.4;
    } else {
      /* hedefli sahne: önce menzildeki düşmanlar (en yakından), kalan vuruşlar alana serpilir */
      const n = Math.min(MAXS, Math.round(C.base * T.n));
      const out = g.enemies ? g.enemies.queryCircle(p.x, p.y, R, this._sc) : [];
      const K = KIND[k];
      for (let j = 0; j < n; j++) {
        const s = this._slot(); if (!s) break;
        let x, y;
        const e = out[j];
        if (e && e.hp > 0) { x = e.x + (Math.random() - 0.5) * 16; y = e.y + (Math.random() - 0.5) * 16; }
        else { const a = Math.random() * TAU, d = Math.sqrt(Math.random()) * R; x = p.x + Math.cos(a) * d; y = p.y + Math.sin(a) * d * 0.85; }
        let sx = x, sy = y;
        if (k === 'moon') { sx = x - 170; sy = y - 560; }
        else if (k === 'meteor') { sx = x + 360; sy = y - 620; }
        else if (k === 'cannon') { sx = p.x - 260 + (Math.random() - 0.5) * 60; sy = p.y - 240; }
        else if (k === 'stone') { sx = p.x; sy = p.y - 20; }
        Object.assign(s, { on: true, x, y, sx, sy, t: -(j / n) * K.spread - Math.random() * 0.06, hit: false, seed: Math.random() * 100, a: Math.random() * TAU });
      }
      this.fx = K.spread + K.fall + K.linger + 0.35;
    }
    if (g.addShake) g.addShake(0.12 + this.rar * 0.03);
    if (g.punch) g.punch(0.03);
    if (g.audio) { g.audio.ultTier = this.rar; g.audio.ultKind = k; g.audio.play('ultfire'); }
    if (g.spawnText) g.spawnText(p.x, p.y - 118, C.name, C.col, 26, true);
    if (g.ui && g.ui.ultFlash) g.ui.ultFlash(C.c2, this.rar);
    Haptics.fire('death');
    return true;
  }
  _impact(s) {
    const g = this.game, C = this.id, k = C.k;
    s.hit = true;
    this._area(s.x, s.y, C.hr);
    if (g.props && (k === 'meteor' || k === 'cannon')) g.props.damageArea(s.x, s.y, C.hr * 0.6, 200);
    const big = k === 'meteor' || k === 'cannon' || k === 'bolt';
    if (g.inView && g.inView(s.x, s.y, 60)) {
      g.spawnBurst(s.x, s.y, C.col, big ? 14 : 8, big ? 300 : 200, big ? 3.6 : 2.6, 0.5, true);
      g.spawnBurst(s.x, s.y, C.c2, big ? 10 : 5, big ? 220 : 140, 3, 0.55, true);
      if (g.pools && g.pools.rings) g.pools.rings.obtain(s.x, s.y, C.hr * (big ? 1.2 : 0.9), big ? 0.42 : 0.3, C.col);
      if (big && g.renderer3d && g.renderer3d.spawnHit) g.renderer3d.spawnHit(s.x, s.y, 0, 1, 1, 0.6, 0.3);
    }
    if (big && g.addShake) g.addShake(0.05);
    if (this._sndT <= 0 && g.audio) { this._sndT = 0.075; g.audio.ultKind = k; g.audio.play('ulthit'); }
  }
  update(dt) {
    if (this.fx <= 0) return;
    this.fx = Math.max(0, this.fx - dt);
    this.t += dt;
    if (this._sndT > 0) this._sndT -= dt;
    const C = this.id, K = KIND[C.k];
    if (K) {
      for (let i = 0; i < MAXS; i++) {
        const s = this.S[i]; if (!s.on) continue;
        s.t += dt;
        if (!s.hit && s.t >= K.fall) this._impact(s);
        if (s.t > K.fall + K.linger) s.on = false;
      }
    }
    const W = this.wave;
    if (W.on) {
      W.t += dt;
      const u = Math.min(1, W.t / W.dur), R = this.tier.r;
      W.r = C.k === 'slam' ? R * (1 - Math.pow(1 - u, 2.2)) : 40 + (R - 40) * u;
      const p = this.game.player;
      const cx = C.k === 'slam' ? this.ox : p.x, cy = C.k === 'slam' ? this.oy : p.y;
      this._area(cx, cy, W.r);
      if (C.k === 'vortex' && Math.random() < dt * 30) this.game.spawnBurst(cx + Math.cos(W.t * 9) * W.r, cy + Math.sin(W.t * 9) * W.r * 0.62, C.col, 2, 90, 2.4, 0.4, true);
      if (W.t >= W.dur) W.on = false;
    }
  }

  /* ═══ ÇİZİM (dünya uzayı, 2B üst tuval) — gradyan/tahsis yok, 'lighter' ile parlama ═══ */
  render(ctx) {
    if (this.fx <= 0) return;
    const g = this.game, p = g.player, C = this.id, k = C.k, K = KIND[k];
    const t = this.t;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    if (k === 'moon') this._drawSkyMoon(ctx, p.x, p.y - 300, t);
    if (k === 'cannon') this._drawGhostShip(ctx, this.ox - 260, this.oy - 250, t);
    if (K) for (let i = 0; i < MAXS; i++) {
      const s = this.S[i]; if (!s.on || s.t < -0.001) continue;
      const u = Math.min(1, s.t / K.fall), post = s.t - K.fall;
      switch (k) {
        case 'moon': this._drawMoonArrow(ctx, s, u, post, K); break;
        case 'bolt': this._drawBolt(ctx, s, u, post, K); break;
        case 'meteor': this._drawMeteor(ctx, s, u, post, K); break;
        case 'cannon': this._drawBall(ctx, s, u, post, K, 150, 12, '#c8ffe6', '#2fcf98'); break;
        case 'stone': this._drawBall(ctx, s, u, post, K, 110, 7, '#f0dcb4', '#a8804a'); break;
        case 'slash': this._drawSlash(ctx, s, u, post, K); break;
        case 'spike': this._drawSpike(ctx, s, u, post, K); break;
      }
    }
    const W = this.wave;
    if (k === 'vortex' && (W.on || this.fx > 0.2)) this._drawVortex(ctx, p.x, p.y, W.r || this.tier.r, t);
    if (k === 'slam' && (W.on || this.fx > 0.2)) this._drawSlam(ctx, this.ox, this.oy, W.r || this.tier.r, t, W.dur);
    ctx.restore();
  }
  _fadeOut() { return Math.min(1, this.fx / 0.35); }
  _drawSkyMoon(ctx, x, y, t) {
    const a = Math.min(1, t / 0.25) * this._fadeOut();
    if (a <= 0) return;
    const r = 46 + this.rar * 4;
    ctx.globalAlpha = a * 0.35; ctx.fillStyle = '#7fb2ff';
    ctx.beginPath(); ctx.arc(x, y, r * 1.9, 0, TAU); ctx.fill();
    ctx.globalAlpha = a;
    ctx.fillStyle = '#e8f4ff';
    ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.arc(x + r * 0.42, y - r * 0.18, r * 0.86, 0, TAU, true); ctx.fill('evenodd');
    ctx.globalAlpha = a * 0.6; ctx.strokeStyle = '#bfe3ff'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(x, y, r + 8 + Math.sin(t * 6) * 2, 0, TAU); ctx.stroke();
  }
  _drawMoonArrow(ctx, s, u, post, K) {
    if (post < 0) {
      const e = u * u;
      const x = s.sx + (s.x - s.sx) * e, y = s.sy + (s.y - s.sy) * e;
      const dx = s.x - s.sx, dy = s.y - s.sy, L = Math.hypot(dx, dy), ux = dx / L, uy = dy / L;
      ctx.globalAlpha = 0.35; ctx.strokeStyle = '#7fb2ff'; ctx.lineWidth = 7;
      ctx.beginPath(); ctx.moveTo(x - ux * 90, y - uy * 90); ctx.lineTo(x, y); ctx.stroke();
      ctx.globalAlpha = 1; ctx.strokeStyle = '#eaf6ff'; ctx.lineWidth = 2.4;
      ctx.beginPath(); ctx.moveTo(x - ux * 46, y - uy * 46); ctx.lineTo(x, y); ctx.stroke();
      this._crescent(ctx, x, y, Math.atan2(uy, ux), 9, '#ffffff');
      /* hedef işareti: yerde ince hilal gölgesi */
      ctx.globalAlpha = 0.25 + u * 0.35; ctx.strokeStyle = '#bfe3ff'; ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.ellipse(s.x, s.y, 20 - u * 8, (20 - u * 8) * 0.55, 0, 0, TAU); ctx.stroke();
    } else {
      const f = 1 - post / K.linger;
      const ang = Math.atan2(s.y - s.sy, s.x - s.sx);
      ctx.globalAlpha = f; ctx.strokeStyle = '#dbeeff'; ctx.lineWidth = 2.2;
      ctx.beginPath(); ctx.moveTo(s.x - Math.cos(ang) * 26, s.y - Math.sin(ang) * 26); ctx.lineTo(s.x, s.y); ctx.stroke();
      ctx.globalAlpha = f * 0.8; ctx.fillStyle = '#bfe3ff';
      ctx.beginPath(); ctx.ellipse(s.x, s.y, 30 * (1 - f * 0.5), 16 * (1 - f * 0.5), 0, 0, TAU); ctx.fill();
      this._crescent(ctx, s.x, s.y - 4, -Math.PI / 2, 14 * (1.4 - f * 0.4), '#ffffff', f);
    }
  }
  _crescent(ctx, x, y, a, r, col, alpha) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(a);
    if (alpha != null) ctx.globalAlpha = alpha;
    ctx.fillStyle = col;
    ctx.beginPath(); ctx.arc(0, 0, r, -Math.PI / 2, Math.PI / 2); ctx.arc(-r * 0.45, 0, r * 0.9, Math.PI / 2, -Math.PI / 2, true); ctx.fill();
    ctx.restore();
  }
  _drawBolt(ctx, s, u, post, K) {
    if (post < 0) {
      ctx.globalAlpha = 0.5 + u * 0.5; ctx.strokeStyle = '#6cc8ff'; ctx.lineWidth = 2;
      const rr = 30 - u * 18;
      ctx.beginPath(); ctx.ellipse(s.x, s.y, rr, rr * 0.55, 0, 0, TAU); ctx.stroke();
      return;
    }
    const f = 1 - post / K.linger;
    if (f <= 0) return;
    const flick = (hash(s.seed, Math.floor(post * 40)) > 0.3) ? 1 : 0.4;
    const top = s.y - 640, N = 8;
    for (let pass = 0; pass < 2; pass++) {
      ctx.globalAlpha = f * flick * (pass ? 1 : 0.4);
      ctx.strokeStyle = pass ? '#ffffff' : '#6cc8ff';
      ctx.lineWidth = pass ? 3 : 11;
      ctx.beginPath(); ctx.moveTo(s.x + (hash(s.seed, 0) - 0.5) * 60, top);
      for (let i = 1; i <= N; i++) {
        const v = i / N, jx = i === N ? 0 : (hash(s.seed, i) - 0.5) * 70 * (1 - v * 0.5);
        ctx.lineTo(s.x + jx, top + (s.y - top) * v);
      }
      ctx.stroke();
      /* dal */
      const bi = 3 + ((hash(s.seed, 9) * 3) | 0), bv = bi / N;
      const bx = s.x + (hash(s.seed, bi) - 0.5) * 70 * (1 - bv * 0.5), by = top + (s.y - top) * bv;
      ctx.lineWidth = pass ? 1.6 : 6;
      ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx + (hash(s.seed, 11) - 0.5) * 120, by + 60); ctx.lineTo(bx + (hash(s.seed, 12) - 0.5) * 160, by + 130); ctx.stroke();
    }
    ctx.globalAlpha = f * 0.7; ctx.fillStyle = '#e6f6ff';
    ctx.beginPath(); ctx.ellipse(s.x, s.y, 46 * (1.2 - f * 0.4), 24 * (1.2 - f * 0.4), 0, 0, TAU); ctx.fill();
  }
  _drawMeteor(ctx, s, u, post, K) {
    if (post < 0) {
      const e = u * u;
      const x = s.sx + (s.x - s.sx) * e, y = s.sy + (s.y - s.sy) * e;
      const dx = s.x - s.sx, dy = s.y - s.sy, L = Math.hypot(dx, dy), ux = dx / L, uy = dy / L;
      for (let i = 5; i >= 0; i--) {
        ctx.globalAlpha = 0.18 + (5 - i) * 0.1;
        ctx.fillStyle = i > 2 ? '#2f8dff' : '#9fd8ff';
        ctx.beginPath(); ctx.arc(x - ux * i * 18, y - uy * i * 18, 16 - i * 2, 0, TAU); ctx.fill();
      }
      ctx.globalAlpha = 1; ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.arc(x, y, 8, 0, TAU); ctx.fill();
      ctx.globalAlpha = 0.3 + u * 0.4; ctx.strokeStyle = '#2f8dff'; ctx.lineWidth = 2.4;
      ctx.beginPath(); ctx.ellipse(s.x, s.y, 70 * (1 - u * 0.3), 38 * (1 - u * 0.3), 0, 0, TAU); ctx.stroke();
    } else {
      const f = 1 - post / K.linger;
      ctx.globalAlpha = f * 0.8; ctx.fillStyle = '#6fbfff';
      ctx.beginPath(); ctx.ellipse(s.x, s.y, 120 * (1.3 - f * 0.5), 64 * (1.3 - f * 0.5), 0, 0, TAU); ctx.fill();
      ctx.globalAlpha = f; ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.ellipse(s.x, s.y, 44 * f, 24 * f, 0, 0, TAU); ctx.fill();
    }
  }
  _drawBall(ctx, s, u, post, K, arc, r, c1, c2) {
    if (post < 0) {
      const x = s.sx + (s.x - s.sx) * u, y = s.sy + (s.y - s.sy) * u - Math.sin(u * Math.PI) * arc;
      ctx.globalAlpha = 0.35; ctx.fillStyle = c2;
      ctx.beginPath(); ctx.arc(x, y, r * 1.9, 0, TAU); ctx.fill();
      ctx.globalAlpha = 1; ctx.fillStyle = c1;
      ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
      ctx.globalAlpha = 0.25 + u * 0.3; ctx.strokeStyle = c2; ctx.lineWidth = 1.8;
      ctx.beginPath(); ctx.ellipse(s.x, s.y, r * 3, r * 1.6, 0, 0, TAU); ctx.stroke();
    } else {
      const f = 1 - post / K.linger;
      ctx.globalAlpha = f * 0.7; ctx.fillStyle = c2;
      ctx.beginPath(); ctx.ellipse(s.x, s.y, r * 8 * (1.2 - f * 0.4), r * 4.4 * (1.2 - f * 0.4), 0, 0, TAU); ctx.fill();
      ctx.globalAlpha = f; ctx.fillStyle = c1;
      ctx.beginPath(); ctx.ellipse(s.x, s.y, r * 3 * f, r * 1.8 * f, 0, 0, TAU); ctx.fill();
    }
  }
  _drawSlash(ctx, s, u, post, K) {
    const f = post < 0 ? 1 : 1 - post / K.linger;
    const sweep = post < 0 ? u : 1;
    for (let j = 0; j < 2; j++) {
      const a0 = s.a + j * 1.7;
      ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(a0); ctx.scale(1, 0.62);
      for (let pass = 0; pass < 2; pass++) {
        ctx.globalAlpha = f * (pass ? 1 : 0.4);
        ctx.strokeStyle = pass ? '#ffffff' : '#9a6aff';
        ctx.lineWidth = pass ? 3 : 12;
        ctx.beginPath(); ctx.arc(0, 0, 52, -1.1, -1.1 + 2.2 * sweep); ctx.stroke();
      }
      ctx.restore();
    }
    if (post >= 0) {
      ctx.globalAlpha = f; ctx.fillStyle = '#e8d4ff';
      for (let i = 0; i < 4; i++) {
        const a = s.a + i * 1.57, d = 20 + post * 120;
        const x = s.x + Math.cos(a) * d, y = s.y + Math.sin(a) * d * 0.62, r = 5 * f;
        ctx.beginPath(); ctx.moveTo(x, y - r * 2); ctx.lineTo(x + r * 0.5, y); ctx.lineTo(x, y + r * 2); ctx.lineTo(x - r * 0.5, y); ctx.closePath(); ctx.fill();
        ctx.beginPath(); ctx.moveTo(x - r * 2, y); ctx.lineTo(x, y + r * 0.5); ctx.lineTo(x + r * 2, y); ctx.lineTo(x, y - r * 0.5); ctx.closePath(); ctx.fill();
      }
    }
  }
  _drawSpike(ctx, s, u, post, K) {
    const rise = post < 0 ? u : (post > K.linger - 0.18 ? Math.max(0, (K.linger - post) / 0.18) : 1);
    if (rise <= 0) return;
    const h = (38 + hash(s.seed, 1) * 20) * rise, w = 11;
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = '#bfe9ff'; ctx.strokeStyle = 'rgba(11,9,16,0.7)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(s.x - w, s.y); ctx.lineTo(s.x - w * 0.2, s.y - h); ctx.lineTo(s.x + w, s.y); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.moveTo(s.x - w * 0.2, s.y - h); ctx.lineTo(s.x + w, s.y); ctx.lineTo(s.x + w * 0.2, s.y); ctx.closePath(); ctx.fill();
    ctx.globalCompositeOperation = 'lighter';
    if (post >= 0 && post < 0.25) {
      ctx.globalAlpha = 1 - post / 0.25; ctx.fillStyle = '#8fd6ff';
      ctx.beginPath(); ctx.ellipse(s.x, s.y, 40, 20, 0, 0, TAU); ctx.fill();
      ctx.globalAlpha = 1;
    }
  }
  _drawVortex(ctx, x, y, r, t) {
    const a = this._fadeOut();
    ctx.globalAlpha = a * 0.5; ctx.fillStyle = '#ffd98a';
    ctx.beginPath(); ctx.arc(x, y - 20, 26 + Math.sin(t * 10) * 3, 0, TAU); ctx.fill();
    for (let j = 0; j < 3; j++) {
      const a0 = t * 9 + j * (TAU / 3);
      ctx.save(); ctx.translate(x, y); ctx.scale(1, 0.62);
      for (let pass = 0; pass < 2; pass++) {
        ctx.globalAlpha = a * (pass ? 1 : 0.35);
        ctx.strokeStyle = pass ? '#fff4d8' : '#ff9a4a';
        ctx.lineWidth = pass ? 4 : 16;
        ctx.beginPath(); ctx.arc(0, 0, r, a0, a0 + 1.2); ctx.stroke();
      }
      ctx.globalAlpha = a * 0.25; ctx.strokeStyle = '#ffd98a'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(0, 0, r * 0.6, a0 + 0.6, a0 + 1.6); ctx.stroke();
      ctx.restore();
    }
  }
  _drawSlam(ctx, x, y, r, t, dur) {
    const u = Math.min(1, t / dur), a = (1 - u * 0.6) * this._fadeOut();
    ctx.save(); ctx.translate(x, y); ctx.scale(1, 0.62);
    for (let pass = 0; pass < 2; pass++) {
      ctx.globalAlpha = a * (pass ? 1 : 0.4);
      ctx.strokeStyle = pass ? '#ffe8d8' : '#d8623a';
      ctx.lineWidth = pass ? 4 : 18 * (1 - u * 0.5);
      ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.stroke();
    }
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = Math.min(1, a * 1.4); ctx.strokeStyle = '#2a120c'; ctx.lineWidth = 4;
    for (let i = 0; i < 9; i++) {
      const aa = i * (TAU / 9) + 0.2, L = r * (0.55 + 0.4 * ((i * 37) % 10) / 10);
      ctx.beginPath(); ctx.moveTo(Math.cos(aa) * 20, Math.sin(aa) * 20);
      ctx.lineTo(Math.cos(aa + 0.12) * L * 0.5, Math.sin(aa + 0.12) * L * 0.5);
      ctx.lineTo(Math.cos(aa - 0.06) * L, Math.sin(aa - 0.06) * L); ctx.stroke();
    }
    ctx.strokeStyle = '#ff9a6a'; ctx.lineWidth = 1.5; ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 9; i++) {
      const aa = i * (TAU / 9) + 0.2, L = r * (0.55 + 0.4 * ((i * 37) % 10) / 10);
      ctx.beginPath(); ctx.moveTo(Math.cos(aa) * 20, Math.sin(aa) * 20);
      ctx.lineTo(Math.cos(aa + 0.12) * L * 0.5, Math.sin(aa + 0.12) * L * 0.5);
      ctx.lineTo(Math.cos(aa - 0.06) * L, Math.sin(aa - 0.06) * L); ctx.stroke();
    }
    ctx.restore();
  }
  _drawGhostShip(ctx, x, y, t) {
    const a = Math.min(1, t / 0.3) * this._fadeOut() * 0.75;
    if (a <= 0) return;
    const bob = Math.sin(t * 3) * 5;
    ctx.globalAlpha = a; ctx.fillStyle = '#2fcf98'; ctx.strokeStyle = '#c8ffe6'; ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x - 90, y + bob); ctx.lineTo(x + 90, y + bob); ctx.lineTo(x + 64, y + 30 + bob); ctx.lineTo(x - 70, y + 30 + bob); ctx.closePath();
    ctx.globalAlpha = a * 0.45; ctx.fill(); ctx.globalAlpha = a; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x - 10, y + bob); ctx.lineTo(x - 10, y - 90 + bob); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x - 8, y - 84 + bob); ctx.quadraticCurveTo(x + 40, y - 56 + bob, x - 6, y - 20 + bob); ctx.closePath();
    ctx.globalAlpha = a * 0.35; ctx.fill(); ctx.globalAlpha = a; ctx.stroke();
    for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.arc(x - 50 + i * 30, y + 14 + bob, 4, 0, TAU); ctx.stroke(); }
  }
}
