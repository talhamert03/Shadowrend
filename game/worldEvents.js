/* ═══════════════════════════════════════════════════════════
   v62 · DÜNYA OLAYLARI (İ3) + SUNAK (D3) — koşu içinde ritim kırıcı küçük anlar.
   Boss dalgası, kule, mühür ve ilk görev (FTUE) dışında ~95-120 sn'de bir olay:
     SUNAK      — oyuncunun 420-560 birim ötesinde taş halka; içinde 2,4 sn dur → üç
                  nimetten biri (mıknatıs · %35 can · kalıcı hasar +%6). 30 sn'de söner.
     RUH SELİ   — 18 sn tecrübe +%50.
     RÜZGÂR     — 14 sn hız +%18.
   Hiçbiri düşman gücünü değiştirmez. Çizim dünya uzayında (tahsis yok, sabit sayılar).
   ═══════════════════════════════════════════════════════════ */
const EV = [
  { id: 'altar', name: 'SUNAK BELİRDİ', sub: 'Halkaya gir ve bekle', col: '#f0c77a', w: 5 },
  { id: 'xp',    name: 'RUH SELİ',      sub: '18 sn tecrübe +%50',  col: '#9fd8ff', w: 3 },
  { id: 'wind',  name: 'RÜZGÂR',        sub: '14 sn hız +%18',       col: '#bff2d0', w: 2 },
  { id: 'thief', name: 'ALTIN KAÇAK',   sub: 'Keseyle kaçıyor — 20 sn', col: '#f5c044', w: 3 },
];
/* v71 C3 · ALTIN KAÇAK — AV'ın kaçış davranışı (engelden ±55°/±110° dönme) olay olarak.
   Vuruldukça her %25 canda altın saçar, ölünce altın yağmuru; 20 sn'de kaçar (sıradan düşmana döner).
   v71 B4 · SUNAK 2.0 — bekleyişten sonra üç yol (sim donuk, süre sınırı yok):
   KAN AHDİ (can −%25 → hasar +%12 kalıcı; KAN KURUSU'nda ve can ≤%35'te çıkmaz) ·
   ŞİFA PINARI (can +%35 + ruh mıknatısı) · MEYDAN (5 elit; 25 sn'de devirirsen saha sandığı ödülü). */
const THIEF_T = 20, DUEL_N = 5, DUEL_T = 25;
const ALTAR_R = 88, ALTAR_HOLD = 2.4, ALTAR_LIFE = 30;

export class WorldEvents {
  constructor(game) { this.game = game; this.reset(); }
  reset() {
    this.next = 70 + Math.random() * 25;
    this.altar = { on: false, x: 0, y: 0, t: 0, hold: 0 };
    this.buff = null; this.buffT = 0; this.count = 0;
    this.thief = null; this.thiefT = 0;
    this.duel = { on: false, x: 0, y: 0, t: 0, left: 0, tok: 0 };
  }
  onKill(e) {
    const g = this.game;
    if (e.thief && e === this.thief) {
      this.thief = null; e.thief = false;
      const amt = this._gold() * 3;
      if (g.addRubies) g.addRubies(amt);
      if (g.fieldChests) g.fieldChests.gold += amt;
      for (let i = 0; i < 3; i++) g.spawnBurst(e.x, e.y - 10, i ? '#f5c044' : '#fff3c0', 16, 300, 3.4, 0.8, true);
      if (g.pools.rings) g.pools.rings.obtain(e.x, e.y, 160, 0.5, '#f5c044');
      g.spawnText(e.x, e.y - 70, 'ALTIN YAĞMURU +' + amt, '#f5c044', 20, true);
      g.audio.play('coin');
      if (g.ui && g.ui.refreshWallet) g.ui.refreshWallet();
    }
    const D = this.duel;
    if (D.on && e.duelTok === D.tok) {
      e.duelTok = 0;
      if (--D.left <= 0) {
        D.on = false;
        if (g.fieldChests && g.fieldChests._reward) g.fieldChests._reward({ x: e.x, y: e.y });
        g.spawnText(g.player.x, g.player.y - 90, 'MEYDAN KAZANILDI', '#f0c77a', 20, true);
        g.audio.play('altar');
      }
    }
  }
  _gold() {
    const g = this.game, w = g.worldId || 1;
    return Math.round((10 + w * 5) * (0.85 + Math.random() * 0.3));
  }
  _spawnMarked(x, y) {
    const g = this.game, E = g.enemies, before = E.pool.count;
    E.spawnOne(E.weights, E.hpMul, E.dmgMul);
    if (E.pool.count === before) return null;
    const e = E.pool.active[E.pool.count - 1];
    if (!e) return null;
    if (x !== undefined) { e.x = x; e.y = y; }
    return e;
  }
  _updThief(dt) {
    const e = this.thief, g = this.game, p = g.player;
    if (!e) return;
    if (e.hp <= 0 || !e.thief) { this.thief = null; return; }
    this.thiefT -= dt;
    if (this.thiefT <= 0) {
      e.thief = false; this.thief = null;
      g.spawnText(e.x, e.y - 50, 'KAÇTI', '#b8b0c0', 15, true);
      g.spawnBurst(e.x, e.y, '#6e6478', 14, 200, 3, 0.6, false);
      return;
    }
    const st = 4 - Math.ceil(4 * e.hp / e.maxHp);   // her %25 kayıpta bir saçılma
    if (st > (e.thiefStep | 0)) {
      e.thiefStep = st;
      const amt = Math.max(2, Math.round(this._gold() / 3));
      if (g.addRubies) g.addRubies(amt);
      if (g.fieldChests) g.fieldChests.gold += amt;
      g.spawnBurst(e.x, e.y - 14, '#f5c044', 10, 220, 3, 0.5, true);
      g.spawnText(e.x, e.y - 44, '+' + amt, '#f5c044', 14, false);
      g.audio.play('coin');
    }
    const dx = e.x - p.x, dy = e.y - p.y, d = Math.hypot(dx, dy) || 1;
    if (d < 700) {
      const k = e.speed * 1.6 * dt / d, F = g.props;
      let ux = dx * k, uy = dy * k;
      if (F && F.blocked(e.x + ux * 6, e.y + uy * 6, e.radius)) {
        const tries = [0.96, -0.96, 1.92, -1.92];
        for (let q = 0; q < 4; q++) {
          const c = Math.cos(tries[q]), s = Math.sin(tries[q]);
          const vx = ux * c - uy * s, vy = ux * s + uy * c;
          if (!F.blocked(e.x + vx * 6, e.y + vy * 6, e.radius)) { ux = vx; uy = vy; break; }
        }
      }
      e.x += ux; e.y += uy;
    }
    const A = g.arena; if (A) { e.x = Math.max(A.l + 40, Math.min(A.r - 40, e.x)); e.y = Math.max(A.t + 40, Math.min(A.b - 40, e.y)); }
  }
  _eligible() {
    const g = this.game;
    if (g.towerRun || g.sealRun) return false;
    if (!g.meta.ftue && !((g.progress && g.progress[1]) | 0)) return false;
    if (g.isBossWave && g.isBossWave(g.wave)) return false;
    return true;
  }
  update(dt) {
    const g = this.game, p = g.player;
    if (!p) return;
    if (this.buffT > 0) { this.buffT -= dt; if (this.buffT <= 0) this._endBuff(); }
    this._updThief(dt);
    const D = this.duel;
    if (D.on && (D.t += dt) > DUEL_T) {
      D.on = false; D.tok = 0;
      g.spawnText(p.x, p.y - 90, 'MEYDAN KAYBEDİLDİ', '#b8b0c0', 18, true);
    }
    const A = this.altar;
    if (A.on) {
      A.t += dt;
      const dx = p.x - A.x, dy = p.y - A.y;
      if (dx * dx + dy * dy < ALTAR_R * ALTAR_R) {
        A.hold += dt;
        if (A.hold >= ALTAR_HOLD) this._blessAltar();
      } else A.hold = Math.max(0, A.hold - dt * 1.5);
      if (A.t > ALTAR_LIFE && A.on) { A.on = false; }
    }
    if (!this._eligible()) return;
    this.next -= dt;
    if (this.next > 0 || A.on || this.buffT > 0 || this.thief || D.on) return;
    this.next = 95 + Math.random() * 25;
    let tot = 0; for (const e of EV) tot += e.w;
    let r = Math.random() * tot, E = EV[0];
    for (const e of EV) { r -= e.w; if (r <= 0) { E = e; break; } }
    this._start(E);
  }
  _start(E) {
    const g = this.game, p = g.player;
    this.count++;
    if (E.id === 'altar') {
      /* objectives._free: arena sınırına kıstırır + engelden çıkarır (kubbe payı 150 → 60) */
      const O = g.objectives;
      const a = Math.random() * Math.PI * 2, d = 420 + Math.random() * 140;
      let x = p.x + Math.cos(a) * d, y = p.y + Math.sin(a) * d;
      if (O && O._free) { x = O._free(x, y); y = O._freeY; }
      Object.assign(this.altar, { on: true, x, y, t: 0, hold: 0 });
    } else if (E.id === 'xp') { this.buff = 'xp'; this.buffT = 18; p.xpMult += 0.5; }
    else if (E.id === 'wind') { this.buff = 'wind'; this.buffT = 14; p.speed *= 1.18; }
    else if (E.id === 'thief') {
      const a = Math.random() * Math.PI * 2;
      const e = this._spawnMarked(p.x + Math.cos(a) * 520, p.y + Math.sin(a) * 520);
      if (!e) return;
      e.maxHp = Math.round(e.maxHp * 5); e.hp = e.maxHp; e.dmg = 0; e.xp = Math.max(8, e.xp * 2);
      e.thief = true; e.thiefStep = 0; e.affixCol = '#f5c044';
      this.thief = e; this.thiefT = THIEF_T;
    }
    if (g.audio) g.audio.play('event');
    if (g.ui && g.ui.eventBanner) g.ui.eventBanner(E.name, E.sub, E.col);
  }
  _endBuff() {
    const p = this.game.player;
    if (this.buff === 'xp') p.xpMult -= 0.5;
    else if (this.buff === 'wind') p.speed /= 1.18;
    this.buff = null; this.buffT = 0;
  }
  _blessAltar() {
    const g = this.game, p = g.player, A = this.altar;
    A.on = false;
    g.spawnBurst(A.x, A.y, '#f0c77a', 26, 300, 3.4, 0.8, true);
    if (g.pools && g.pools.rings) g.pools.rings.obtain(A.x, A.y, ALTAR_R * 2.2, 0.6, '#f0c77a');
    if (g.audio) g.audio.play('altar');
    const list = [];
    if (!p.noHeal && p.hp > p.maxHp * 0.35) list.push({ id: 'blood', name: 'KAN AHDİ', plus: 'Hasar +%12 · kalıcı', minus: 'Canın %25\'i gider', col: '#ff5a6e' });
    list.push({ id: 'spring', name: 'ŞİFA PINARI', plus: p.noHeal ? 'Ruh mıknatısı · hasar +%4' : 'Can +%35 · ruh mıknatısı', minus: 'Bedel yok', col: '#8fd6a4' });
    list.push({ id: 'duel', name: 'MEYDAN', plus: 'Saha sandığı ödülü', minus: DUEL_N + ' elit · ' + DUEL_T + ' sn', col: '#f0c77a' });
    if (!g.ui || !g.ui.showBlessPick) { this._altarApply(list[list.length - 2]); return; }
    g.ui._ldHold = true;
    g.ui.showBlessPick(list, (b) => { g.ui._ldHold = false; g.last = performance.now(); this._altarApply(b); },
      { k: 'SUNAK', t: 'BİR YOL SEÇ', s: 'Sunak üç bedel sunar · biri seçilir', stamp: 'KABUL', cls: 'bp2-altar', label: 'Sunak seçimi', endSnd: 'altar' });
  }
  _altarApply(b) {
    const g = this.game, p = g.player, A = this.altar;
    if (!b) return;
    if (b.id === 'blood') {
      p.hp = Math.max(1, Math.round(p.hp - p.maxHp * 0.25));
      p.dmgMult += 0.12;
      g.spawnBurst(p.x, p.y, '#ff4d5e', 22, 260, 3.2, 0.7, true);
      g.spawnText(p.x, p.y - 90, 'KAN AHDİ · HASAR +%12', '#ff8a94', 18, true);
      if (g.ui) g.ui.hurtFlash();
    } else if (b.id === 'spring') {
      if (p.noHeal) p.dmgMult += 0.04; else p.hp = Math.min(p.maxHp, p.hp + Math.round(p.maxHp * 0.35));
      if (g.powerups) g.powerups.collect('magnet');
      g.spawnBurst(p.x, p.y, '#8fd6a4', 22, 240, 3.2, 0.7, true);
      g.spawnText(p.x, p.y - 90, 'ŞİFA PINARI', '#bff2d0', 18, true);
    } else {
      const D = this.duel;
      D.tok = (D.tok | 0) + 1; D.on = true; D.t = 0; D.left = 0; D.x = A.x; D.y = A.y;
      for (let i = 0; i < DUEL_N; i++) {
        const a = (i / DUEL_N) * Math.PI * 2, e = this._spawnMarked(A.x + Math.cos(a) * 330, A.y + Math.sin(a) * 330);
        if (!e) continue;
        if (!e.elite) { e.elite = true; e.maxHp = Math.round(e.maxHp * 3.2); e.hp = e.maxHp; e.dmg *= 1.5; e.radius *= 1.28; }
        e.duelTok = D.tok; e.affixCol = '#f0c77a';
        D.left++;
      }
      if (!D.left) { D.on = false; return; }
      if (g.ui && g.ui.eventBanner) g.ui.eventBanner('MEYDAN', D.left + ' elit · ' + DUEL_T + ' sn', '#f0c77a');
      g.audio.play('event');
    }
  }
  /* dünya uzayı — renderObjectiveArrow'dan önce çağrılır */
  render(ctx) {
    const e = this.thief;
    if (e && e.hp > 0) {
      const t0 = this.game.time || 0;
      ctx.save(); ctx.translate(e.x, e.y); ctx.scale(1, 0.62);
      ctx.strokeStyle = '#f5c044'; ctx.lineWidth = 3; ctx.globalAlpha = 0.55 + 0.45 * Math.sin(t0 * 7);
      ctx.beginPath(); ctx.arc(0, 0, e.radius + 14, 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
    }
    const A = this.altar;
    if (!A.on) return;
    const t = this.game.time || 0;
    const fade = A.t > ALTAR_LIFE - 3 ? Math.max(0, (ALTAR_LIFE - A.t) / 3) : Math.min(1, A.t / 0.5);
    ctx.save();
    ctx.globalAlpha = fade;
    ctx.translate(A.x, A.y);
    ctx.scale(1, 0.62);
    ctx.lineWidth = 5; ctx.strokeStyle = 'rgba(20,12,8,0.7)';
    ctx.beginPath(); ctx.arc(0, 0, ALTAR_R, 0, Math.PI * 2); ctx.stroke();
    ctx.lineWidth = 3; ctx.strokeStyle = '#f0c77a';
    ctx.setLineDash([14, 10]); ctx.lineDashOffset = -t * 30;
    ctx.beginPath(); ctx.arc(0, 0, ALTAR_R, 0, Math.PI * 2); ctx.stroke();
    ctx.setLineDash([]);
    if (A.hold > 0) {
      ctx.lineWidth = 7; ctx.strokeStyle = '#fff2c8';
      ctx.beginPath(); ctx.arc(0, 0, ALTAR_R - 10, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.min(1, A.hold / ALTAR_HOLD)); ctx.stroke();
    }
    ctx.fillStyle = 'rgba(240,199,122,' + (0.1 + 0.06 * Math.sin(t * 3)).toFixed(3) + ')';
    ctx.beginPath(); ctx.arc(0, 0, ALTAR_R - 4, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    ctx.save();
    ctx.globalAlpha = fade;
    ctx.translate(A.x, A.y);
    const bob = Math.sin(t * 2.4) * 4;
    ctx.fillStyle = '#2a2230'; ctx.strokeStyle = '#0b0910'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(-22, 6); ctx.lineTo(22, 6); ctx.lineTo(16, -30); ctx.lineTo(-16, -30); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#f0c77a';
    ctx.beginPath(); ctx.moveTo(0, -60 + bob); ctx.lineTo(10, -46 + bob); ctx.lineTo(0, -32 + bob); ctx.lineTo(-10, -46 + bob); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#0b0910'; ctx.lineWidth = 2; ctx.stroke();
    ctx.restore();
  }
  /* kurtarma oku gibi: sunak ekran dışındaysa oyuncunun yanında küçük altın ok */
  arrow(ctx) {
    const p = this.game.player;
    const A = this.altar.on ? this.altar : (this.thief && this.thief.hp > 0 ? this.thief : null);
    if (!A || !p) return;
    const dx = A.x - p.x, dy = A.y - p.y, d = Math.hypot(dx, dy);
    if (d < 260) return;
    const a = Math.atan2(dy, dx), R = 96;
    ctx.save();
    ctx.translate(p.x + Math.cos(a) * R, p.y + 14 + Math.sin(a) * R);
    ctx.rotate(a);
    ctx.fillStyle = '#f0c77a'; ctx.strokeStyle = 'rgba(11,9,16,0.85)'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(14, 0); ctx.lineTo(-8, -9); ctx.lineTo(-3, 0); ctx.lineTo(-8, 9); ctx.closePath(); ctx.stroke(); ctx.fill();
    ctx.restore();
  }
}
