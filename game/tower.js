/* ═══════════ SONSUZ KULE (v53, 2026-09-28) — yol haritası D2 ═══════════
   Geç oyunun ana hedefi. Yeni sanat YOK: on harita sırayla döner, her 5.
   kat boss katıdır (dünyanın boss görevi). Zorluk: bkz. TOWER (v53i).
   Kayıt meta.tower { cur, best, paid[] }. Yenilgide son 5'in katına döner
   (kontrol noktası) — sonsuz modda her ölümde sıfırlamak cezadır, ödül değil.
   Her kat altın, her 10. kat sabit gem ödülü (bir kez). */

import { worldCurve } from './balance.js?v=20260930m';

/* v53i ÖLÇÜLEN KUSUR: kat çarpanı dünya eğrisinin ÜSTÜNE binince harita
   döndüğünde zorluk ÇÖKÜYORDU — kat 10 (D10) can ×21,75 → kat 11 (D1) ×2,00
   (maks güce göre öldürme süresi 4,64 → 0,43). Artık ilk on kat dünyanın
   kendi eğrisi (çarpan 1), sonrası D10 eğrisinden kat başı +%7 can, +%4
   hasar; harita yalnız görünüştür. Ölçülen: kat 11 ×12,25 · 15 ×15,46 ·
   20 ×19,46 · 30 ×27,48 — tekdüze artan. */
export const TOWER = { bossEvery: 5, checkpoint: 5, hpK: 0.07, dmgK: 0.04 };

export function towerBook(meta) {
  if (!meta.tower || typeof meta.tower !== 'object') meta.tower = { cur: 1, best: 0, paid: [] };
  const T = meta.tower;
  if (!(T.cur >= 1)) T.cur = 1;
  if (!Array.isArray(T.paid)) T.paid = [];
  return T;
}

export function floorDef(k, worldCount, missionsPerWorld) {
  const w = 1 + ((k - 1) % worldCount);
  const boss = k % TOWER.bossEvery === 0;
  const m = boss ? missionsPerWorld : 1 + ((k - 1) % Math.max(1, missionsPerWorld - 1));
  return { k, w, m, boss };
}

export const Tower = {
  /** beginWave'den sonra: kat çarpanı düşman tarafına. */
  applyWave(g) {
    if (!g.towerRun) return;
    const E = g.enemies, k = g.towerRun.k;
    if (k <= 10) return;
    const w = g.worldId | 0, top = worldCurve(10), cur = worldCurve(w);
    const hm = (top.hpMul / cur.hpMul) * (1 + TOWER.hpK * (k - 10));
    const bm = (top.bossHpMul / cur.bossHpMul) * (1 + TOWER.hpK * (k - 10));
    const dm = (top.dmgMul / cur.dmgMul) * (1 + TOWER.dmgK * (k - 10));
    if (E.hpMul) E.hpMul *= hm;
    if (E.bossHpMul) E.bossHpMul *= bm;
    if (E.dmgMul) E.dmgMul *= dm;
  },
  floorGold(k) { return 40 + k * 8; },
  finish(g, won) {
    const T = towerBook(g.meta), k = g.towerRun.k;
    let gold = 0, gem = 0, milestone = false;
    const prevBest = T.best;
    if (won) {
      gold = this.floorGold(k);
      if (k > T.best) T.best = k;
      if (k % 10 === 0 && !T.paid.includes(k)) { T.paid.push(k); gem = 10 + k; milestone = true; }
      T.cur = k + 1;
    } else {
      T.cur = Math.max(1, Math.floor((k - 1) / TOWER.checkpoint) * TOWER.checkpoint + 1);
    }
    if (gold) g.addRubies(gold);
    if (gem) g.addStones(gem);
    g.saveMeta();
    return { k, won, gold, gem, milestone, best: T.best, isBest: won && k > prevBest, next: T.cur };
  },
};
