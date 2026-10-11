/* ═══════════ KABUS DÖNGÜSÜ (v54 H2, 2026-09-28) ═══════════
   Dünya 10 bitince aynı on dünya GECE yüzüyle yeniden açılır: yeni harita
   çizmeden oyun ömrünü ikiye katlar. Sıralı ilerler (D1-G1 → D10-G5).
   ZORLUK: her görev en az D10 eğrisinde başlar (Kule v53i dersi — harita
   dönünce zorluk çökmesin), üstüne ×1,30 can · ×1,20 hasar ve dünya başı
   +%6; her elit İKİ değiştirici, elit şansı ×1,6, en az %6.
   ÖDÜL: altın ×2 (tekrar ödülü üstüne), görev başı ilk Kabus zaferi 8 gem,
   dünyanın boss görevinde 20 gem. 10 Kabus zaferinde KABUS ÇERÇEVESİ
   (kozmetik, güç vermez). Kayıt meta.nm { w, m, done[], clears }. */
import { worldCurve } from './balance.js?v=20260930m';

export const NM = { hp: 1.30, dmg: 1.20, perWorld: 0.06, elite: 1.6, eliteMin: 0.06, gold: 2, gem: 8, bossGem: 20, frameAt: 10 };

export function nmBook(meta) {
  if (!meta.nm || typeof meta.nm !== 'object') meta.nm = { w: 1, m: 1, done: [], clears: 0 };
  const N = meta.nm;
  if (!(N.w >= 1)) N.w = 1;
  if (!(N.m >= 1)) N.m = 1;
  if (!Array.isArray(N.done)) N.done = [];
  N.clears = N.clears | 0;
  return N;
}

export const Nightmare = {
  open(progress, worldCount, mpw) { return (progress[worldCount] | 0) >= mpw; },
  hasFrame(meta) { return nmBook(meta).clears >= NM.frameAt; },
  applyWave(g) {
    if (!g.nmRun) return;
    const E = g.enemies, w = g.worldId | 0;
    const top = worldCurve(10), cur = worldCurve(w);
    const k = 1 + NM.perWorld * (w - 1);
    if (E.hpMul) E.hpMul *= Math.max(1, top.hpMul / cur.hpMul) * NM.hp * k;
    if (E.bossHpMul) E.bossHpMul *= Math.max(1, top.bossHpMul / cur.bossHpMul) * NM.hp * k;
    if (E.dmgMul) E.dmgMul *= Math.max(1, top.dmgMul / cur.dmgMul) * NM.dmg * k;
    E.eliteChance = Math.max(NM.eliteMin, (E.eliteChance || 0) * NM.elite);
  },
  finish(g, won, mpw, worldCount) {
    const N = nmBook(g.meta), w = g.worldId, m = g.missionId, key = w + '-' + m;
    let gem = 0, first = false;
    if (won) {
      if (!N.done.includes(key)) {
        N.done.push(key); first = true;
        gem = m === mpw ? NM.bossGem : NM.gem;
        N.clears++;
      }
      if (w === N.w && m === N.m) {
        if (m < mpw) N.m++;
        else if (w < worldCount) { N.w++; N.m = 1; }
      }
      if (gem) g.addStones(gem);
    }
    g.saveMeta();
    document.documentElement.classList.toggle('nm-frame', this.hasFrame(g.meta));
    return { w, m, won, gem, first, clears: N.clears, frame: N.clears === NM.frameAt && first };
  },
};
