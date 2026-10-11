/* ═══════════════════════════════════════════════════════════
   fieldChest.js — SAHA SANDIĞI (v49)

   Kullanıcı: "haritalardaki eski sandıkları kaldır; mağazadaki yeni 3B
   sandıklardan GÜMÜŞ sandığı oyuna koy, her haritada rastgele yerlerde
   olsun, yanına gidince OTOMATİK açılsın ve oyun içi ödül versin:
   mıknatıs, can, koruma kalkanı, tek seferlik patlayan PATLANGAÇ, altın."

   Bu dosya DAVRANIŞTIR (yer seçimi · açılış · ödül · 2B ödül madalyonu);
   GÖRÜNÜŞ `fieldChest3d.js`te (mağazanın kendi 3B modeli, tier 2).

   ── SÖZLEŞME ────────────────────────────────────────────
   1. SANDIK ENGEL DEĞİLDİR. Kırılmaz, çarpışmaz, vurulmaz: yaklaşınca
      açılır (openR). Eski `sandik` engeli kırılmak zorundaydı ve kılıcın
      menzilinde olmayan oyuncu onu fark etmiyordu.
   2. YER RASTGELE AMA ANLAMLI: engel içine, görev kubbesine, oyuncunun
      dibine ve başka sandığın 1000 birim yakınına düşmez. Harita başına
      aynı anda en çok MAX_LIVE; açılan sandığın yerine 35-52 sn sonra
      başka yerde yenisi doğar (koşu boyunca keşif sürer).
   3. ÖDÜL BOŞA GİTMEZ: can doluyken can → kalkan; etrafta ≤ 2 düşman
      varken patlangaç → altın (dolu çantaya can düşmez dersinin aynısı).
   4. ÖDÜL OYUNCUYA UÇAR: madalyon sandığın ağzından yükselir, sonra
      kahramana akar ve DEĞDİĞİ AN etki başlar (patlangaç hariç — o
      sandığın önüne düşer, fitil yanar, patlar). Görsel okunmadan etki
      başlasaydı ödülün NE olduğu kaybolurdu.
   5. SICAK DÖNGÜDE TAHSİS YOK: sandık ve madalyon sabit dizilerde yaşar.
   ═══════════════════════════════════════════════════════════ */

import { applyHit } from './combat.js?v=20260930m';
import { Haptics } from './perf.js?v=20260930m';

export const FIELD_CHEST = {
  maxLive: 3,          // haritada aynı anda
  first: [2, 18],      // koşu başında iki sandık hemen, üçüncüsü 18 sn sonra
  respawn: [35, 52],   // açılanın yerine yenisi (sn)
  openR: 84,           // kahraman merkezi → sandık merkezi
  wakeR: 250,          // yaklaşınca sandık "kıpırdar" (render okur)
  gap: 1000,           // iki sandık arası en az
  fromPlayer: 640,     // doğarken oyuncudan en az
  bombR: 420,          // patlangaç yarıçapı
  fuse: 0.8,           // patlangaç fitili (sn)
};

/* Ağırlıklar: dördü "nefes" (mıknatıs · can · kalkan · altın), biri
   "öfke" (patlangaç). Eşit dağıtım patlangacı sıradanlaştırırdı. */
const REWARDS = [
  ['magnet', 22], ['heal', 21], ['shield', 20], ['bomb', 18], ['gold', 19],
];
/* v54: renkler oyunun paletine çekildi (gece siyahı · kor · gümüş + kimlik rengi).
   hi/mid/lo = glif gradyanı (ışık sol üstten), col = yazı/kıvılcım. */
export const CHEST_REWARD = {
  magnet: { col: '#7cc8f0', hi: '#d8f1ff', mid: '#4f9fd6', lo: '#1d4f7e', label: 'MIKNATIS' },
  heal:   { col: '#ff5a66', hi: '#ffc2c6', mid: '#ff3b4e', lo: '#7a1020', label: 'CAN' },
  shield: { col: '#f0cf78', hi: '#fff0c4', mid: '#d9a642', lo: '#6e4a14', label: 'KALKAN' },
  bomb:   { col: '#ff8a3c', hi: '#ffd2a0', mid: '#e0662a', lo: '#5a1c10', label: 'PATLANGAÇ' },
  gold:   { col: '#f5c044', hi: '#fff3c0', mid: '#e8a930', lo: '#7a4a0c', label: 'ALTIN' },
};

const TAU = Math.PI * 2;
const POPS = 6;

export class FieldChests {
  constructor(game) {
    this.game = game;
    /* sandık: st 0 bekliyor · 1 açılıyor · 2 açık · 3 batıyor · -1 boş */
    this.list = [];
    for (let i = 0; i < FIELD_CHEST.maxLive; i++) this.list.push({ st: -1, x: 0, y: 0, t: 0, wake: 0, seed: i * 1.7 });
    this.pops = [];
    for (let i = 0; i < POPS; i++) this.pops.push({ on: false, kind: '', x: 0, y: 0, x0: 0, y0: 0, t: 0, amt: 0 });
    this.timers = [0, 0, 0];
    this._scratch = [];
    this.opened = 0;
    this.gold = 0;
  }

  reset() {
    for (const c of this.list) c.st = -1;
    for (const p of this.pops) p.on = false;
    this.opened = 0; this.gold = 0;
    const f = FIELD_CHEST.first;
    this.timers[0] = f[0]; this.timers[1] = f[0] + 0.4; this.timers[2] = f[1];
    this._armed = true;
  }

  /** Rastgele ama anlamlı bir yer; bulunamazsa null (sonra tekrar denenir). */
  _spot() {
    const g = this.game, A = g.arena, p = g.player;
    if (!A) return null;
    const lim = A.play / 2 - 230;
    const O = g.objectives;
    const npcOn = O && (O.phase === 'waiting' || O.phase === 'escort');
    for (let k = 0; k < 70; k++) {
      const x = (Math.random() * 2 - 1) * lim, y = (Math.random() * 2 - 1) * lim;
      if (p && Math.hypot(x - p.x, y - p.y) < FIELD_CHEST.fromPlayer) continue;
      if (g.props && g.props.blocked(x, y, 82)) continue;
      if (npcOn && Math.hypot(x - O.npc.x, y - O.npc.y) < 340) continue;
      if (npcOn && O.phase === 'escort' && Math.hypot(x - O.dest.x, y - O.dest.y) < 260) continue;
      let ok = true;
      for (const c of this.list) {
        if (c.st < 0) continue;
        if (Math.hypot(x - c.x, y - c.y) < FIELD_CHEST.gap) { ok = false; break; }
      }
      if (ok) return [x, y];
    }
    return null;
  }

  update(dt) {
    const g = this.game, p = g.player;
    if (!p || !g.arena) return;
    for (let i = 0; i < this.list.length; i++) {
      const c = this.list[i];
      if (c.st < 0) {
        this.timers[i] -= dt;
        if (this.timers[i] > 0) continue;
        const s = this._spot();
        if (!s) { this.timers[i] = 2; continue; }
        c.x = s[0]; c.y = s[1]; c.st = 0; c.t = 0; c.wake = 0;
        continue;
      }
      c.t += dt;
      const d = Math.hypot(p.x - c.x, p.y - c.y);
      if (c.st === 0) {
        const w = d < FIELD_CHEST.wakeR ? 1 : 0;
        c.wake += (w - c.wake) * Math.min(1, dt * 6);
        if (d < FIELD_CHEST.openR + p.radius) this._open(c);
      } else if (c.st === 1) {
        if (c.t >= 0.34) { c.st = 2; c.t = 0; this._reward(c); }
      } else if (c.st === 2) {
        if (c.t >= 1.7) { c.st = 3; c.t = 0; }
      } else if (c.st === 3) {
        if (c.t >= 0.5) {
          c.st = -1;
          const r = FIELD_CHEST.respawn;
          this.timers[i] = r[0] + Math.random() * (r[1] - r[0]);
        }
      }
    }
    this._updPops(dt);
  }

  _open(c) {
    const g = this.game;
    c.st = 1; c.t = 0;
    this.opened++;
    /* v59: tek ses 'fieldchest' açılışta (kilit+kapak+parıltı birlikte) */
    Haptics.fire('crit');
  }

  _pick(c) {
    const g = this.game, p = g.player;
    let tot = 0;
    for (const r of REWARDS) tot += r[1];
    let x = Math.random() * tot, kind = 'gold';
    for (const r of REWARDS) { x -= r[1]; if (x <= 0) { kind = r[0]; break; } }
    if (kind === 'heal' && p.hp > p.maxHp * 0.92) kind = 'shield';
    if (kind === 'bomb') {
      const near = g.enemies ? g.enemies.queryCircle(c.x, c.y, FIELD_CHEST.bombR, this._scratch) : null;
      if (!near || near.length <= 2) kind = 'gold';
    }
    return kind;
  }

  /** Görev ölçeğinde altın: ilk dünyada ~15, onuncuda ~60. */
  _goldAmt() {
    const g = this.game;
    const w = g.worldId || 1, m = g.missionId || 1;
    return Math.round((10 + w * 5) * (1 + (m - 1) * 0.06) * (0.85 + Math.random() * 0.3));
  }

  _reward(c) {
    const g = this.game;
    const kind = this._pick(c);
    const pop = this.pops.find((q) => !q.on);
    if (g.audio) g.audio.play('fieldchest');
    if (g.spawnBurst) {
      g.spawnBurst(c.x, c.y - 10, '#eef4ff', 22, 260, 3.6, 0.7, true);
      g.spawnBurst(c.x, c.y - 10, CHEST_REWARD[kind].col, 16, 200, 3.2, 0.65, true);
    }
    if (g.pools && g.pools.rings) g.pools.rings.obtain(c.x, c.y, 130, 0.45, '#dfe8ff');
    if (g.renderer3d && g.renderer3d.spawnHit) g.renderer3d.spawnHit(c.x, c.y, 0, 1, 0.9, 0.94, 1.0);
    if (g.addShake) g.addShake(0.06);
    if (!pop) { this._apply(kind, c.x, c.y, kind === 'gold' ? this._goldAmt() : 0); return; }
    pop.on = true; pop.kind = kind; pop.t = 0;
    pop.x0 = pop.x = c.x; pop.y0 = pop.y = c.y - 34;
    pop.amt = kind === 'gold' ? this._goldAmt() : 0;
  }

  _updPops(dt) {
    const g = this.game, p = g.player;
    for (const q of this.pops) {
      if (!q.on) continue;
      q.t += dt;
      if (q.kind === 'bomb') {
        /* sandığın önüne sekerek düşer, fitil yanar, patlar */
        const u = Math.min(1, q.t / 0.42);
        q.x = q.x0 + u * 26;
        q.y = q.y0 + 34 + 40 * u - Math.sin(u * Math.PI) * 58;
        if (q.t >= 0.42 + FIELD_CHEST.fuse) { this._boom(q.x, q.y); q.on = false; }
        continue;
      }
      if (q.t < 0.55) {
        const u = q.t / 0.55;
        q.x = q.x0; q.y = q.y0 - 58 * (1 - (1 - u) * (1 - u));
      } else {
        /* kahramana ak: her karede hedefi TAKİP eder (oyuncu kaçarken de yetişir) */
        const u = Math.min(1, (q.t - 0.55) / 0.3);
        const sx = q.x0, sy = q.y0 - 58;
        const k = u * u;
        q.x = sx + (p.x - sx) * k; q.y = sy + (p.y - 20 - sy) * k;
        if (u >= 1) { this._apply(q.kind, p.x, p.y, q.amt); q.on = false; }
      }
    }
  }

  _apply(kind, x, y, amt) {
    const g = this.game;
    const lab = CHEST_REWARD[kind];
    if (kind === 'gold') {
      if (g.addRubies) g.addRubies(amt);
      this.gold += amt;
      if (g.audio) g.audio.play('coin');
      if (g.spawnBurst) g.spawnBurst(x, y - 20, lab.col, 18, 220, 3.2, 0.6, true);
      if (g.spawnText) g.spawnText(x, y - 64, '+' + amt + ' ALTIN', lab.col, 20, true);
      if (g.ui && g.ui.refreshWallet) g.ui.refreshWallet();
      return;
    }
    if (g.powerups) g.powerups.collect(kind);
    if (g.spawnText) g.spawnText(x, y - 64, lab.label, lab.col, 20, true);
  }

  /** PATLANGAÇ: çevredeki sıradan düşmanı ÖLDÜRÜR; elit %65, boss %7 can. */
  _boom(x, y) {
    const g = this.game;
    const R = FIELD_CHEST.bombR;
    const out = g.enemies ? g.enemies.queryCircle(x, y, R + 30, this._scratch) : [];
    for (let i = 0; i < out.length; i++) {
      const e = out[i];
      if (e.hp <= 0) continue;
      const dx = e.x - x, dy = e.y - y;
      const reach = R + e.radius;
      if (dx * dx + dy * dy > reach * reach) continue;
      const dmg = e.isBoss ? e.maxHp * 0.07 : (e.elite ? e.maxHp * 0.65 : e.hp + 1);
      applyHit(g, e, Math.ceil(dmg), Math.atan2(dy, dx), 420, 0, false);
    }
    if (g.props) g.props.damageArea(x, y, R * 0.7, 400);
    if (g.spawnBurst) {
      g.spawnBurst(x, y, '#fff2c8', 34, 460, 4, 0.6, true);
      g.spawnBurst(x, y, '#ff8a3c', 28, 380, 4.6, 0.65, true);
      g.spawnBurst(x, y, '#ffd45a', 20, 300, 3.6, 0.6, true);
      g.spawnBurst(x, y, '#5a1a10', 14, 200, 3.4, 0.7, false);
    }
    if (g.pools && g.pools.rings) {
      g.pools.rings.obtain(x, y, R * 1.08, 0.55, '#ffd08a');
      g.pools.rings.obtain(x, y, R * 0.62, 0.4, '#fff2c8');
    }
    if (g.renderer3d && g.renderer3d.spawnHit) g.renderer3d.spawnHit(x, y, 0, 2, 1, 0.7, 0.4);
    if (g.addShake) g.addShake(0.24);
    if (g.addKick) g.addKick(-Math.PI / 2, 4);
    if (g.audio) g.audio.play('blast');
    if (g.spawnText) g.spawnText(x, y - 80, 'PATLANGAÇ!', '#ffb45a', 24, true);
    Haptics.fire('death');
  }

  /* ═══ 2B: ödül madalyonu (dünya uzayı bloğunda çizilir) ═══
     v54: madalyon bir kez ekran dışı tuvale pişirilir (gümüş kabartmalı çerçeve,
     emaye göbek, mürekkep konturlu glif); karede yalnız drawImage + dönen ışın +
     parıltı çizilir → gradyan/tahsis yok (perf kuralı 4). */
  render(ctx) {
    const g = this.game, t = g.time || 0;
    for (const q of this.pops) {
      if (!q.on) continue;
      const lab = CHEST_REWARD[q.kind];
      const inU = Math.min(1, q.t / 0.24);
      /* back-out giriş (~%14 aşma), sonra hafif söner; uçuşta küçülür */
      const bo = inU < 1 ? 1 + 2.4 * Math.pow(inU - 1, 3) + 1.4 * Math.pow(inU - 1, 2) : 1;
      const fly = q.t > 0.55 ? Math.min(1, (q.t - 0.55) / 0.3) : 0;
      const s = q.kind === 'bomb' ? 1 : (0.35 + 0.83 * bo) * (1 - fly * 0.35);
      ctx.save();
      ctx.translate(q.x, q.y);
      if (q.kind === 'bomb') { drawBomb(ctx, t, q.t); ctx.restore(); continue; }
      const bob = fly ? 0 : Math.sin(q.t * 7) * 2.2;
      ctx.translate(0, bob);
      ctx.scale(s, s);
      /* dönen ışın: dört yumuşak kama, kimlik renginde, additive */
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = lab.col;
      ctx.globalAlpha = 0.16 * (1 - fly);
      ctx.save(); ctx.rotate(t * 1.1);
      for (let k = 0; k < 4; k++) {
        ctx.rotate(TAU / 4);
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-7, -46); ctx.lineTo(7, -46); ctx.closePath(); ctx.fill();
      }
      ctx.restore();
      ctx.globalAlpha = 0.3;
      ctx.beginPath(); ctx.arc(0, 0, 31, 0, TAU); ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1;
      const sp = medal(q.kind);
      ctx.drawImage(sp, -MED_R, -MED_R, MED_R * 2, MED_R * 2);
      /* çerçevede gezen parıltı + sağ üstte dört köşeli yıldız */
      ctx.globalCompositeOperation = 'lighter';
      const a = t * 2.6;
      ctx.globalAlpha = 0.85;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.arc(Math.cos(a) * 22.5, Math.sin(a) * 22.5, 1.8, 0, TAU); ctx.fill();
      const tw = 0.5 + 0.5 * Math.sin(t * 5.3 + q.x);
      if (tw > 0.15) {
        const r = 2 + tw * 5;
        ctx.globalAlpha = tw;
        ctx.beginPath();
        ctx.moveTo(15, -21 - r); ctx.lineTo(16, -21); ctx.lineTo(15 + r, -20); ctx.lineTo(16, -19);
        ctx.lineTo(15, -19 + r - 1); ctx.lineTo(14, -19); ctx.lineTo(15 - r, -20); ctx.lineTo(14, -21);
        ctx.closePath(); ctx.fill();
      }
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1;
      ctx.restore();
    }
  }
}

/* ── MADALYON PİŞİRME (bir kez, tür başına) ── */
const MED_R = 27, MED_PX = 3;          // dünya yarıçapı · piksel yoğunluğu (DPR 3'e kadar keskin)
const _med = {};
function medal(kind) {
  if (_med[kind]) return _med[kind];
  const S = MED_R * 2 * MED_PX;
  const cv = typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(S, S) : Object.assign(document.createElement('canvas'), { width: S, height: S });
  const c = cv.getContext('2d');
  const L = CHEST_REWARD[kind];
  c.scale(MED_PX, MED_PX); c.translate(MED_R, MED_R);
  /* zemin gölgesi */
  c.fillStyle = 'rgba(0,0,0,0.45)';
  c.beginPath(); c.ellipse(0, 3, 24, 24, 0, 0, TAU); c.fill();
  /* gümüş çerçeve (ışık sol üstten) */
  let gr = c.createLinearGradient(-16, -24, 16, 24);
  gr.addColorStop(0, '#f4f7fb'); gr.addColorStop(0.35, '#b9c1cf'); gr.addColorStop(0.7, '#5d6474'); gr.addColorStop(1, '#2a2e38');
  c.fillStyle = gr;
  c.beginPath(); c.arc(0, 0, 23.5, 0, TAU); c.fill();
  /* dört elmas perçin */
  for (let k = 0; k < 4; k++) {
    const an = k * TAU / 4 - Math.PI / 2, x = Math.cos(an) * 21, y = Math.sin(an) * 21;
    c.fillStyle = '#0b0910';
    c.beginPath(); c.moveTo(x, y - 3.4); c.lineTo(x + 3.4, y); c.lineTo(x, y + 3.4); c.lineTo(x - 3.4, y); c.closePath(); c.fill();
    c.fillStyle = L.hi;
    c.beginPath(); c.moveTo(x, y - 2); c.lineTo(x + 2, y); c.lineTo(x, y + 2); c.lineTo(x - 2, y); c.closePath(); c.fill();
  }
  c.lineWidth = 1.4; c.strokeStyle = '#0b0910';
  c.beginPath(); c.arc(0, 0, 23.5, 0, TAU); c.stroke();
  /* iç yiv + emaye göbek */
  c.fillStyle = '#0b0910';
  c.beginPath(); c.arc(0, 0, 18.6, 0, TAU); c.fill();
  gr = c.createRadialGradient(-4, -6, 1, 0, 0, 18);
  gr.addColorStop(0, L.lo); gr.addColorStop(0.55, '#1a111a'); gr.addColorStop(1, '#0a0709');
  c.fillStyle = gr;
  c.beginPath(); c.arc(0, 0, 17.2, 0, TAU); c.fill();
  c.lineWidth = 1; c.strokeStyle = L.mid; c.globalAlpha = 0.55;
  c.beginPath(); c.arc(0, 0, 16.4, 0, TAU); c.stroke();
  c.globalAlpha = 1;
  /* glif */
  c.save(); c.translate(0, 0.5);
  GLYPH[kind](c, L);
  c.restore();
  /* üst cam parlaması */
  c.fillStyle = 'rgba(255,255,255,0.14)';
  c.beginPath(); c.ellipse(-3, -9, 11, 5.5, -0.35, 0, TAU); c.fill();
  c.lineWidth = 1.3; c.strokeStyle = 'rgba(255,255,255,0.7)';
  c.beginPath(); c.arc(0, 0, 22, -2.7, -1.9); c.stroke();
  return (_med[kind] = cv);
}

function lg(c, L, y0, y1) {
  const g = c.createLinearGradient(-6, y0, 6, y1);
  g.addColorStop(0, L.hi); g.addColorStop(0.45, L.mid); g.addColorStop(1, L.lo);
  return g;
}
/* çiz → mürekkep kontur (önce kalın koyu iz, sonra dolgu) */
function inked(c, path, fill, w) {
  path(c); c.lineWidth = w || 2.6; c.lineJoin = 'round'; c.strokeStyle = '#0b0910'; c.stroke();
  path(c); c.fillStyle = fill; c.fill();
}

/* ── GLİFLER: ~24 birimlik kutu, sol üst ışık, #0b0910 kontur ── */
const GLYPH = {
  /* at nalı mıknatıs: çelik mavi gövde, gümüş kutup uçları, iki çekim kıvılcımı */
  magnet(c, L) {
    const body = (k) => {
      k.beginPath();
      k.moveTo(-10.5, -9); k.lineTo(-10.5, 1.5);
      k.arc(0, 1.5, 10.5, Math.PI, 0, true);
      k.lineTo(10.5, -9); k.lineTo(4.6, -9); k.lineTo(4.6, 1.5);
      k.arc(0, 1.5, 4.6, 0, Math.PI, false);
      k.lineTo(-4.6, -9); k.closePath();
    };
    inked(c, body, lg(c, L, -10, 12));
    const tip = (x) => (k) => { k.beginPath(); k.rect(x, -12.5, 5.9, 5); };
    const sg = c.createLinearGradient(0, -12.5, 0, -7.5);
    sg.addColorStop(0, '#ffffff'); sg.addColorStop(1, '#8e97a8');
    inked(c, tip(-10.5), sg, 2); inked(c, tip(4.6), sg, 2);
    c.fillStyle = 'rgba(255,255,255,0.5)';
    c.fillRect(-9.4, -6.5, 1.6, 7);
    c.fillStyle = L.hi;
    c.beginPath(); c.arc(-7.6, -15.6, 1.3, 0, TAU); c.arc(7.6, -15.6, 1.3, 0, TAU); c.fill();
  },
  /* yakut kalp: yontulmuş yüzey, iç ışık */
  heal(c, L) {
    const heart = (k) => {
      k.beginPath();
      k.moveTo(0, 11.5);
      k.bezierCurveTo(-15, 2, -12, -11.5, -5.2, -10.4);
      k.bezierCurveTo(-2.2, -10, -0.5, -7.6, 0, -5.8);
      k.bezierCurveTo(0.5, -7.6, 2.2, -10, 5.2, -10.4);
      k.bezierCurveTo(12, -11.5, 15, 2, 0, 11.5);
      k.closePath();
    };
    inked(c, heart, lg(c, L, -11, 11));
    c.strokeStyle = 'rgba(11,9,16,0.45)'; c.lineWidth = 0.9;
    c.beginPath(); c.moveTo(0, -5.8); c.lineTo(0, 11); c.moveTo(-9.6, -3); c.lineTo(0, 2.6); c.lineTo(9.6, -3); c.stroke();
    c.fillStyle = 'rgba(255,255,255,0.6)';
    c.beginPath(); c.ellipse(-5.4, -5.2, 2.8, 1.7, -0.6, 0, TAU); c.fill();
    c.fillStyle = 'rgba(255,255,255,0.9)';
    c.beginPath(); c.arc(-6.4, -6, 0.9, 0, TAU); c.fill();
  },
  /* yaka kalkanı: gümüş kenar, altın alan, koyu rün */
  shield(c, L) {
    const sh = (k, r) => {
      k.beginPath();
      k.moveTo(0, -12.5 * r); k.lineTo(10.6 * r, -8.4 * r); k.lineTo(9.6 * r, 2.4 * r);
      k.quadraticCurveTo(6.6 * r, 9.6 * r, 0, 13 * r); k.quadraticCurveTo(-6.6 * r, 9.6 * r, -9.6 * r, 2.4 * r);
      k.lineTo(-10.6 * r, -8.4 * r); k.closePath();
    };
    const sg = c.createLinearGradient(-8, -12, 8, 12);
    sg.addColorStop(0, '#f4f7fb'); sg.addColorStop(0.5, '#a9b1bf'); sg.addColorStop(1, '#3d4250');
    inked(c, (k) => sh(k, 1), sg);
    sh(c, 0.74); c.fillStyle = lg(c, L, -9, 9); c.fill();
    c.strokeStyle = '#0b0910'; c.lineWidth = 2.2; c.lineCap = 'round';
    c.beginPath(); c.moveTo(0, -6.5); c.lineTo(0, 6.5); c.moveTo(-3.8, -2.6); c.lineTo(0, 1); c.lineTo(3.8, -2.6); c.stroke();
    c.fillStyle = 'rgba(255,255,255,0.35)';
    c.beginPath(); c.moveTo(0, -9.2); c.lineTo(-7.8, -6.2); c.lineTo(-7.2, 0); c.closePath(); c.fill();
  },
  /* sikke yığını: iki arka sikke + güneş damgalı ön sikke */
  gold(c, L) {
    const coin = (x, y, r) => (k) => { k.beginPath(); k.arc(x, y, r, 0, TAU); };
    inked(c, coin(-6.5, 3.5, 7), lg(c, L, -3, 10), 2.2);
    inked(c, coin(6.5, 3.5, 7), lg(c, L, -3, 10), 2.2);
    inked(c, coin(0, -2.5, 9.5), lg(c, L, -12, 7));
    c.strokeStyle = 'rgba(80,46,6,0.85)'; c.lineWidth = 1.2;
    c.beginPath(); c.arc(0, -2.5, 6.6, 0, TAU); c.stroke();
    c.fillStyle = 'rgba(90,52,8,0.9)';
    c.beginPath();
    for (let k = 0; k < 8; k++) {
      const an = k * TAU / 8 - Math.PI / 2, r = k % 2 ? 2 : 4.6;
      c.lineTo(Math.cos(an) * r, -2.5 + Math.sin(an) * r);
    }
    c.closePath(); c.fill();
    c.fillStyle = 'rgba(255,255,255,0.7)';
    c.beginPath(); c.ellipse(-4, -7.5, 2.6, 1.3, -0.6, 0, TAU); c.fill();
  },
};

/* ── PATLANGAÇ: gövde pişirilir (normal + kızgın), fitil/kıvılcım canlı ── */
const _bomb = [null, null];
function bombBody(hot) {
  if (_bomb[hot]) return _bomb[hot];
  const R = 20, P = 3, S = R * 2 * P;
  const cv = typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(S, S) : Object.assign(document.createElement('canvas'), { width: S, height: S });
  const c = cv.getContext('2d');
  c.scale(P, P); c.translate(R, R + 2);
  c.fillStyle = 'rgba(0,0,0,0.35)';
  c.beginPath(); c.ellipse(2, 13, 13, 4.5, 0, 0, TAU); c.fill();
  const gr = c.createRadialGradient(-4.5, -5, 1, 0, 0, 13);
  if (hot) { gr.addColorStop(0, '#ff9a6a'); gr.addColorStop(0.5, '#8a2a18'); gr.addColorStop(1, '#2a0a08'); }
  else { gr.addColorStop(0, '#5a5f70'); gr.addColorStop(0.5, '#23252f'); gr.addColorStop(1, '#0b0910'); }
  c.fillStyle = gr;
  c.beginPath(); c.arc(0, 0, 12.5, 0, TAU); c.fill();
  c.lineWidth = 2.4; c.strokeStyle = '#0b0910'; c.stroke();
  /* pirinç kuşak + perçin */
  c.save(); c.beginPath(); c.arc(0, 0, 12.5, 0, TAU); c.clip();
  const bg = c.createLinearGradient(0, -2, 0, 3);
  bg.addColorStop(0, '#f0d08a'); bg.addColorStop(1, '#7a5420');
  c.fillStyle = bg; c.fillRect(-13, -1.6, 26, 4);
  c.restore();
  c.fillStyle = '#fff0c4';
  for (let k = -2; k <= 2; k++) { c.beginPath(); c.arc(k * 4.6, 0.4, 0.8, 0, TAU); c.fill(); }
  c.fillStyle = 'rgba(255,255,255,0.3)';
  c.beginPath(); c.ellipse(-4.6, -5.4, 3.6, 2.2, -0.7, 0, TAU); c.fill();
  /* ağız */
  const mg = c.createLinearGradient(-4, -16, 4, -11);
  mg.addColorStop(0, '#f0d08a'); mg.addColorStop(1, '#6a4a18');
  c.fillStyle = '#0b0910'; c.fillRect(-4.6, -17, 9.2, 6.4);
  c.fillStyle = mg; c.fillRect(-3.6, -16, 7.2, 4.6);
  return (_bomb[hot] = cv);
}
function drawBomb(c, t, age) {
  const f = Math.max(0, age - 0.42) / FIELD_CHEST.fuse;
  const beat = 1 + Math.sin(t * (14 + f * 30)) * 0.05 * (0.4 + f);
  c.scale(beat, beat);
  c.drawImage(bombBody(f > 0.55 ? 1 : 0), -20, -22, 40, 40);
  c.lineWidth = 2; c.strokeStyle = '#6a5a40'; c.lineCap = 'round';
  const fx = 8.5 - f * 5, fy = -21 + f * 3;
  c.beginPath(); c.moveTo(0, -18); c.quadraticCurveTo(3, -23, fx, fy); c.stroke();
  c.globalCompositeOperation = 'lighter';
  const sp = 0.6 + Math.sin(t * 38) * 0.4;
  c.fillStyle = '#ffc85a';
  c.globalAlpha = 0.55 + sp * 0.4;
  c.beginPath(); c.arc(fx, fy, 3.2 + sp * 2.2, 0, TAU); c.fill();
  c.globalAlpha = 1;
  c.fillStyle = '#fffadc';
  c.beginPath(); c.arc(fx, fy, 1.6, 0, TAU); c.fill();
  c.globalCompositeOperation = 'source-over';
}
