/* ═══════════ EKİPMAN SETLERİ (v54 H4, 2026-09-28) ═══════════
   Aynı kademeden 2 ve 4 parça kuşanınca set kimliği açılır. Kimlik, kademenin
   ELEMENT dilini izler (Sanat Rehberi: Nadir buz · Epik yıldırım · Efsanevi ateş).
   BÜTÇE: set gücü balance.W ölçeğinde 2 parça ≈ 6 puan, 4 parça ≈ +10 puan
   (bir kademe-1 eşyadan az) — set, doğru eşyayı seçmenin ödülü; zorunluluk değil.
   Tavanlar (balance.CAPS) aşılmaz: hız ≤ %4, kritik ≤ %5, kaçınma ≤ %4. */
export const RANK = { 1: 1, 2: 2, 5: 3, 3: 4, 4: 5 };   // RARITIES dizini → sıra

export const GEAR_SETS = {
  1: { name: 'GEZGİN',  col: '#b8a07a', p2: { magnetPct: 0.15 },               p4: { speedPct: 0.04 },
       l2: 'Toplama menzili +%15', l4: 'Hareket hızı +%4' },
  2: { name: 'TUNÇ',    col: '#d8a262', p2: { maxHp: 12 },                      p4: { regen: 0.8, armor: 1 },
       l2: 'Can +12', l4: 'Can yenileme +0,8/sn · Zırh +1' },
  3: { name: 'AYAZ',    col: '#7cc8f0', p2: { armor: 1 },                       p4: { dodge: 0.04, maxHp: 10 },
       l2: 'Zırh +1', l4: 'Kaçınma +%4 · Can +10' },
  4: { name: 'YILDIRIM', col: '#b48aff', p2: { atkPct: 0.06 },                  p4: { critChance: 0.05, critMult: 0.2 },
       l2: 'Saldırı hızı +%6', l4: 'Kritik şansı +%5 · Kritik hasar +%20' },
  5: { name: 'KOR',     col: '#ff8a3c', p2: { dmgPct: 0.06 },                   p4: { explodeChance: 0.06, explodeDmgPct: 0.25 },
       l2: 'Hasar +%6', l4: 'Vuruşta patlama şansı +%6 · Patlama hasarı +%25' },
};

/** Kuşanılı eşyalardan etkin setler: [{ r, n, S, on2, on4 }] (yalnız n ≥ 2). */
export function activeSets(items) {
  const c = {};
  for (const it of items) if (it) { const r = RANK[it.rarity] || 1; c[r] = (c[r] || 0) + 1; }
  const out = [];
  for (const r in c) if (c[r] >= 2) out.push({ r: +r, n: c[r], S: GEAR_SETS[r], on2: true, on4: c[r] >= 4 });
  return out.sort((a, b) => b.r - a.r);
}

/** Oyuncuya uygula (applyMetaToPlayer çağırır). */
export function applySets(player, items) {
  for (const A of activeSets(items)) {
    player.applyMods(A.S.p2);
    if (A.on4) player.applyMods(A.S.p4);
  }
}
