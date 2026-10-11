/* ═══════════════════════════════════════════════════════════
   v63 · GÖREV TÜRLERİ (İ4) — dalga iskeleti AYNI (süre 4-7 dk bandı korunur),
   görevin BİTİŞ şartı türe göre değişir:
     HAYATTA KAL — son dalga biter → zafer (eski davranış)
     SAVUN  — merkezde TOTEM; yakınındaki düşmanlar onu aşındırır; totem düşerse yenilgi.
              Düşmanların bir kısmı totemi hedefler (yakındaysa totem yönüne itilir).
     AV     — 2. dalgada KAÇAN ELİT (işaretli, oyuncudan kaçar). Son dalga bittiğinde
              av hâlâ yaşıyorsa UZATMA: av durur, yeri okla gösterilir, ölünce zafer.
     KAÇIŞ  — son dalgada ÇIKIŞ belirir, çevresinde daralan halka; halka dışı can yakar.
              Çıkışa varınca zafer.
   Sıcak yolda tahsis yok (scratch dizi, sabit sayılar). Kule/mühür koşusu etkilenmez.
   ═══════════════════════════════════════════════════════════ */
export const MTYPE = {
  survive: { name: 'HAYATTA KAL', col: '#cfd6e2' },
  defend:  { name: 'SAVUN',       col: '#9ff2c4' },
  hunt:    { name: 'AV',          col: '#ff8a4a' },
  escape:  { name: 'KAÇIŞ',       col: '#9fd8ff' },
};
/* görev sırası: aynı tür arka arkaya gelmez; dünyada ≥3 farklı tür (D1'in ilk iki görevi öğretici) */
const ORDER = ['survive', 'defend', 'survive', 'hunt', 'survive', 'escape', 'defend', 'hunt', 'escape'];
export function missionType(w, m) {
  if (m >= 10) return 'survive';
  if (w === 1 && m <= 2) return 'survive';
  return ORDER[m - 1] || 'survive';
}

/* v71 C1 · BOSS KUŞATMASI (yalnız Dünya 5 ve 10 boss'u): boss uyanınca oyuncunun çevresinde
   kızıl halka 1300 → 620 birime 5 sn'de kapanır ve kalır. Dışarısı 0,5 sn'de %4 can yakar,
   boss halkanın içine kıstırılır, sürü halkanın dışından içeri akar (doğum yeri değişmez). */
const SIEGE_R0 = 1300, SIEGE_R1 = 620, SIEGE_T = 5, SIEGE_COL = '#ff5a6e';
const TOTEM_HP = 100, TOTEM_R = 70, ESC_R0 = 1500, ESC_R1 = 150, ESC_T = 40;

export class MissionMode {
  constructor(game) { this.game = game; this._sc = []; this.begin('survive'); }
  begin(type) {
    this.type = type || 'survive';
    this.done = this.type === 'survive' || this.type === 'defend';   // savunmada yenilgi totemden gelir
    this.over = false;
    this.totem = { on: false, x: 0, y: 0, hp: TOTEM_HP, hit: 0 };
    this.prey = null; this.preyDone = false;
    this.esc = { on: false, x: 0, y: 0, r: ESC_R0, t: 0, burn: 0 };
    this.siege = { on: false, x: 0, y: 0, r: SIEGE_R0, t: 0, burn: 0 };
    this._placed = false;
  }
  _spot(x, y) {
    const O = this.game.objectives;
    if (O && O._free) { const nx = O._free(x, y); return [nx, O._freeY]; }
    return [x, y];
  }
  onWave(w) {
    const g = this.game, p = g.player;
    const M = g.msn;
    if (M && M.isBoss && (M.world === 5 || M.world === 10) && !g.towerRun && !g.sealRun && g.isBossWave(w) && !this.siege.on) {
      Object.assign(this.siege, { on: true, x: p.x, y: p.y, r: SIEGE_R0, t: 0, burn: 0 });
      if (g.ui && g.ui.eventBanner) g.ui.eventBanner('KUŞATMA', 'Halka kapanıyor — kaçış yok', SIEGE_COL);
    }
    if (this.type === 'defend' && !this.totem.on) {
      const [x, y] = this._spot(p.x, p.y - 120);
      Object.assign(this.totem, { on: true, x, y, hp: TOTEM_HP, hit: 0 });
      if (g.ui && g.ui.eventBanner) g.ui.eventBanner('TOTEMİ SAVUN', 'Düşmanlar totemi aşındırır — yanında kal', MTYPE.defend.col);
    }
    if (this.type === 'hunt' && !this.preyDone && w >= 2 && !(this.prey && this.prey.hp > 0 && this.prey.prey)) this._spawnPrey(w === 2);
    if (this.type === 'escape' && w >= g.msn.waves && !this.esc.on) {
      const a = Math.random() * Math.PI * 2;
      const [x, y] = this._spot(p.x + Math.cos(a) * 900, p.y + Math.sin(a) * 900);
      Object.assign(this.esc, { on: true, x, y, r: ESC_R0, t: 0, burn: 0 });
      if (g.ui && g.ui.eventBanner) g.ui.eventBanner('KAÇIŞ YOLU AÇILDI', 'Halka daralıyor — çıkışa koş', MTYPE.escape.col);
      if (g.audio) g.audio.play('event');
    }
  }
  _spawnPrey(first) {
    const g = this.game, E = g.enemies;
    const before = E.pool.count;
    E.spawnOne(E.weights, E.hpMul, E.dmgMul);
    if (E.pool.count === before) return;
    const e = E.pool.active[E.pool.count - 1];
    if (!e) return;
    if (!e.elite) { e.elite = true; e.maxHp = Math.round(e.maxHp * 3.2); e.dmg *= 1.5; e.radius *= 1.28; e.knockRes *= 0.6; }
    e.maxHp = Math.round(e.maxHp * 2.2); e.hp = e.maxHp;
    e.xp = Math.max(20, e.xp * 4);
    e.prey = true; e.affixCol = MTYPE.hunt.col;
    this.prey = e;
    if (first && g.ui && g.ui.eventBanner) g.ui.eventBanner('AV BAŞLADI', 'Kaçan elit haritada — bul ve devir', MTYPE.hunt.col);
  }
  onKill(e) {
    if (e && e.prey && e === this.prey) {
      this.preyDone = true; this.done = true; this.prey = null; e.prey = false;
      const g = this.game;
      g.spawnText(e.x, e.y - 60, 'AV DÜŞTÜ', MTYPE.hunt.col, 22, true);
      if (g.audio) g.audio.play('altar');
      if (this.over) g.missionComplete();
    }
  }
  /** endWave son dalgada sorar: false → uzatma (dalga sürer, mod bitirir) */
  canFinish() {
    if (this.done) return true;
    if (!this.over) {
      this.over = true;
      const g = this.game;
      if (g.ui && g.ui.eventBanner) g.ui.eventBanner(this.type === 'hunt' ? 'AV KAÇIYOR' : 'ÇIKIŞA KOŞ', this.type === 'hunt' ? 'Av artık durdu — izini takip et' : 'Halka kapanıyor', MTYPE[this.type].col);
    }
    return false;
  }
  update(dt) {
    const g = this.game, p = g.player;
    if (!p || g.state !== 'playing') return;
    const T = this.totem;
    if (this.type === 'defend' && !T.on && T.hp <= 0 && !g._dying) { T.on = true; T.hp = TOTEM_HP * 0.5; }   // diriliş: totem yarı canla döner
    if (T.on) {
      const out = g.enemies.queryCircle(T.x, T.y, 460, this._sc);
      let near = 0;
      for (let i = 0; i < out.length; i++) {
        const e = out[i]; if (e.hp <= 0 || e.isBoss) continue;
        const dx = T.x - e.x, dy = T.y - e.y, d = Math.hypot(dx, dy) || 1;
        if (d < TOTEM_R + e.radius) { near++; continue; }
        if (i % 3 === 0) { const k = e.speed * 0.45 * dt / d; e.x += dx * k; e.y += dy * k; }
      }
      if (near) { T.hp -= near * 1.6 * dt; T.hit = 0.25; }
      if (T.hit > 0) T.hit -= dt;
      if (T.hp <= 0) { T.on = false; g.spawnBurst(T.x, T.y, '#9ff2c4', 30, 300, 4, 0.8, true); if (g.audio) g.audio.play('objfail'); g.gameOver(); return; }
    }
    const e = this.prey;
    if (e) {
      if (e.hp <= 0 || !e.prey) { this.prey = null; }
      else if (!this.over) {
        const dx = e.x - p.x, dy = e.y - p.y, d = Math.hypot(dx, dy) || 1;
        if (d < 700) {
          /* v65: kaçış yönü engele çarparsa ±55°/±110° dener (köşeye sıkışıp duvara sürtünme yoktu ama takılıyordu) */
          const k = e.speed * 1.55 * dt / d, F = g.props;
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
      } else { e.speed = Math.min(e.speed, 20); }
    }
    const Q = this.siege;
    if (Q.on) {
      Q.t += dt;
      const u = Math.min(1, Q.t / SIEGE_T);
      Q.r = SIEGE_R0 + (SIEGE_R1 - SIEGE_R0) * (1 - (1 - u) * (1 - u));
      const B = g.enemies.pool.active;
      for (let i = 0; i < B.length; i++) {
        const b = B[i];
        if (!b.isBoss || b.hp <= 0) continue;
        const bx = b.x - Q.x, by = b.y - Q.y, bd = Math.hypot(bx, by), lim = Q.r - b.radius - 20;
        if (bd > lim && bd > 0) { b.x = Q.x + bx / bd * lim; b.y = Q.y + by / bd * lim; }
      }
      const dx = p.x - Q.x, dy = p.y - Q.y;
      if (dx * dx + dy * dy > Q.r * Q.r && p.invuln <= 0) {
        Q.burn += dt;
        if (Q.burn > 0.5) { Q.burn = 0; p.hp -= Math.max(1, Math.round(p.maxHp * 0.04)); g.spawnText(p.x, p.y - 30, 'KUŞATMA', SIEGE_COL, 13, false); if (g.ui) g.ui.hurtFlash(); if (p.hp <= 0) g.gameOver(); }
      } else Q.burn = 0;
    }
    const S = this.esc;
    if (S.on) {
      S.t += dt;
      S.r = ESC_R1 + (ESC_R0 - ESC_R1) * Math.max(0, 1 - S.t / ESC_T);
      const dx = p.x - S.x, dy = p.y - S.y, d = Math.hypot(dx, dy);
      if (d < 80) { S.on = false; this.done = true; g.spawnBurst(S.x, S.y, '#9fd8ff', 30, 320, 4, 0.8, true); if (g.audio) g.audio.play('delivered'); g.missionComplete(); return; }
      if (d > S.r && p.invuln <= 0) {
        S.burn += dt;
        if (S.burn > 0.5) { S.burn = 0; p.hp -= Math.max(1, Math.round(p.maxHp * 0.05)); g.spawnText(p.x, p.y - 30, 'HALKA', '#9fd8ff', 13, false); if (p.hp <= 0) g.gameOver(); }
      }
    }
  }
  /* dünya uzayı */
  render(ctx) {
    const g = this.game, t = g.time || 0;
    /* v63 İ2 telegraf sözlüğü: ÇİZGİ = saldırı yönü. Lordun hücum hazırlığında yön şeridi. */
    const B = g.enemies && g.enemies.pool ? g.enemies.pool.active : null;
    if (B) for (let i = 0; i < B.length; i++) {
      const b = B[i];
      if (!b.isBoss || b.state !== 'windup' || b.bossKind === 'ejder') continue;
      const L = 520, k = Math.max(0, Math.min(1, 1 - b.stateT / 0.62));
      ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(Math.atan2(b.diry, b.dirx));
      ctx.fillStyle = 'rgba(255,59,78,' + (0.12 + 0.18 * k).toFixed(3) + ')'; ctx.fillRect(0, -b.radius * 0.7, L, b.radius * 1.4);
      ctx.fillStyle = 'rgba(255,59,78,0.55)'; ctx.fillRect(0, -2, L * k, 4);
      ctx.restore();
    }
    const T = this.totem;
    if (T.on) {
      ctx.save(); ctx.translate(T.x, T.y);
      ctx.save(); ctx.scale(1, 0.62);
      ctx.strokeStyle = 'rgba(159,242,196,0.55)'; ctx.lineWidth = 3; ctx.setLineDash([10, 8]); ctx.lineDashOffset = -t * 20;
      ctx.beginPath(); ctx.arc(0, 0, TOTEM_R, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]); ctx.restore();
      const sh = T.hit > 0 ? Math.sin(t * 60) * 2 : 0;
      ctx.fillStyle = '#2a2230'; ctx.strokeStyle = '#0b0910'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(-16 + sh, 4); ctx.lineTo(16 + sh, 4); ctx.lineTo(10 + sh, -58); ctx.lineTo(-10 + sh, -58); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#9ff2c4'; ctx.beginPath(); ctx.arc(sh, -40, 6 + Math.sin(t * 3) * 1.5, 0, Math.PI * 2); ctx.fill();
      const k = Math.max(0, T.hp / TOTEM_HP);
      ctx.fillStyle = 'rgba(11,9,16,0.85)'; ctx.fillRect(-30, -78, 60, 7);
      ctx.fillStyle = k > 0.35 ? '#9ff2c4' : '#ff4d5e'; ctx.fillRect(-29, -77, 58 * k, 5);
      ctx.restore();
    }
    const e = this.prey;
    if (e && e.hp > 0) {
      ctx.save(); ctx.translate(e.x, e.y); ctx.scale(1, 0.62);
      ctx.strokeStyle = MTYPE.hunt.col; ctx.lineWidth = 3; ctx.globalAlpha = 0.6 + 0.4 * Math.sin(t * 6);
      ctx.beginPath(); ctx.arc(0, 0, e.radius + 14, 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
    }
    const Q = this.siege;
    if (Q.on) {
      ctx.save(); ctx.translate(Q.x, Q.y); ctx.scale(1, 0.62);
      ctx.strokeStyle = 'rgba(20,6,10,0.75)'; ctx.lineWidth = 12;
      ctx.beginPath(); ctx.arc(0, 0, Q.r, 0, Math.PI * 2); ctx.stroke();
      ctx.strokeStyle = SIEGE_COL; ctx.lineWidth = 4; ctx.globalAlpha = 0.75 + 0.25 * Math.sin(t * 5);
      ctx.setLineDash([22, 12]); ctx.lineDashOffset = t * 40;
      ctx.beginPath(); ctx.arc(0, 0, Q.r, 0, Math.PI * 2); ctx.stroke();
      ctx.setLineDash([]); ctx.globalAlpha = 0.16; ctx.lineWidth = 30;
      ctx.beginPath(); ctx.arc(0, 0, Q.r + 18, 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
    }
    const S = this.esc;
    if (S.on) {
      ctx.save(); ctx.translate(S.x, S.y);
      ctx.save(); ctx.scale(1, 0.62);
      ctx.strokeStyle = 'rgba(159,216,255,0.8)'; ctx.lineWidth = 6;
      ctx.beginPath(); ctx.arc(0, 0, S.r, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = 'rgba(159,216,255,0.18)'; ctx.beginPath(); ctx.arc(0, 0, 80, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
      ctx.fillStyle = '#9fd8ff'; ctx.globalAlpha = 0.5 + 0.3 * Math.sin(t * 4);
      ctx.fillRect(-6, -110, 12, 110);
      ctx.restore();
    }
  }
  /** yön oku: kaçış çıkışı (her zaman) · av (yalnız uzatmada) */
  arrowTarget() {
    if (this.esc.on) return this.esc;
    if (this.over && this.prey && this.prey.hp > 0) return this.prey;
    return null;
  }
  arrow(ctx) {
    const q = this.arrowTarget(), p = this.game.player;
    if (!q || !p) return;
    const dx = q.x - p.x, dy = q.y - p.y, d = Math.hypot(dx, dy);
    if (d < 220) return;
    const a = Math.atan2(dy, dx), R = 104;
    ctx.save();
    ctx.translate(p.x + Math.cos(a) * R, p.y + 14 + Math.sin(a) * R);
    ctx.rotate(a);
    ctx.fillStyle = this.esc.on ? MTYPE.escape.col : MTYPE.hunt.col; ctx.strokeStyle = 'rgba(11,9,16,0.85)'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(16, 0); ctx.lineTo(-9, -10); ctx.lineTo(-3, 0); ctx.lineTo(-9, 10); ctx.closePath(); ctx.stroke(); ctx.fill();
    ctx.restore();
  }
}
