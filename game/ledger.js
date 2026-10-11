/* ═══════════ DEFTER (v53, 2026-09-28) — YILDIZ · REKOR · USTALIK ═══════════
   Çevrimdışı ilerleme katmanı. Tek kayıt: meta.ledger { st, rec, mas }.
   GÜÇ VERMEZ: yıldız ve ustalık yalnız para/gem öder, stat yazmaz —
   balance.js bütçesi bozulmaz (yol haritası D4 · D6 · D3-rekor).

   YILDIZ (görev başına 3):  ★ zafer · ★ can hiç %50'nin altına inmedi ·
   ★ en az 2 saha sandığı açıldı. Kazanılan yıldız bir daha kaybolmaz;
   her YENİ yıldız STAR_GEM gem öder.
   REKOR: görev başına en çok kıyım + en yüksek koşu seviyesi.
   USTALIK: kahraman başına puan (kıyım + zafer + boss); 10 kademe,
   kademe ödülü altın (5. ve 10. kademede gem). */

export const STAR_GEM = 2;
export const STAR_RULES = [
  { id: 'win', label: 'ZAFER' },
  { id: 'hp', label: 'CAN %50 ÜSTÜ' },
  { id: 'fc', label: '2 SAHA SANDIĞI' },
];
export const MASTERY_REQ = [0, 0, 250, 700, 1400, 2400, 3800, 5600, 7900, 10800, 14400];
export const MASTERY_MAX = 10;
const lvReward = (lv) => ({ gold: 50 + lv * 40, gem: lv === 5 ? 15 : lv === 10 ? 40 : 0 });

function book(meta) {
  if (!meta.ledger || typeof meta.ledger !== 'object') meta.ledger = {};
  const L = meta.ledger;
  if (!L.st) L.st = {};
  if (!L.rec) L.rec = {};
  if (!L.mas) L.mas = {};
  return L;
}

export function masteryLevel(xp) {
  let lv = 1;
  while (lv < MASTERY_MAX && xp >= MASTERY_REQ[lv + 1]) lv++;
  return lv;
}

export const Ledger = {
  stars(meta, w, m) { return (book(meta).st[w + '-' + m] | 0); },
  totalStars(meta) { let n = 0; const s = book(meta).st; for (const k in s) if (k.charCodeAt(k.length - 1) !== 109) n += s[k] | 0; return n; },   // 'm' anahtarı bit maskesidir, sayılmaz
  worldStars(meta, w, per) { let n = 0; for (let m = 1; m <= per; m++) n += this.stars(meta, w, m); return n; },
  mastery(meta, id) {
    const xp = book(meta).mas[id] | 0, lv = masteryLevel(xp);
    const a = MASTERY_REQ[lv], b = lv >= MASTERY_MAX ? a : MASTERY_REQ[lv + 1];
    return { xp, lv, max: lv >= MASTERY_MAX, frac: lv >= MASTERY_MAX ? 1 : (xp - a) / Math.max(1, b - a), toNext: Math.max(0, b - xp) };
  },

  /** Koşu sonu — main.gameOver / missionComplete çağırır. Ödülleri kendisi
      verir (g.addRubies / g.addStones) ve sonuç ekranı için özet döndürür. */
  onRun(g, won) {
    const L = book(g.meta);
    const key = g.worldId + '-' + g.missionId;
    const fc = Math.max(0, (g.fieldChests ? g.fieldChests.opened | 0 : 0) - (g._fc0 | 0));
    /* v53j: kule/mühür koşusu kampanya yıldızı ve rekoru YAZMAZ (kuralı farklı
       koşu kampanya görevinin yıldızını veriyordu); ustalık yine işler. */
    const side = !!(g.towerRun || g.sealRun || g.nmRun);
    const got = side ? [false, false, false] : [won, won && g._hpFloor >= 0.5, won && fc >= 2];
    const prevMask = L.st[key + 'm'] | 0;
    let mask = prevMask;
    got.forEach((ok, i) => { if (ok) mask |= 1 << i; });
    const newMask = mask & ~prevMask;
    let newCount = 0; for (let i = 0; i < 3; i++) if (newMask & (1 << i)) newCount++;
    L.st[key + 'm'] = mask;
    let cnt = 0; for (let i = 0; i < 3; i++) if (mask & (1 << i)) cnt++;
    L.st[key] = cnt;
    const starGem = newCount * STAR_GEM;

    const r = side ? { k: 0, lv: 0 } : (L.rec[key] || (L.rec[key] = { k: 0, lv: 0 }));
    const kills = g.kills | 0, lvl = g.player ? g.player.level | 0 : 0;
    const recKills = !side && kills > r.k && r.k > 0;
    const firstRec = !side && r.k === 0 && kills > 0;
    if (kills > r.k) r.k = kills;
    if (lvl > r.lv) r.lv = lvl;

    const cid = g.meta.selectedChar;
    const before = this.mastery(g.meta, cid);
    const gain = Math.round(Math.max(0, kills - (g._masK | 0)) * 0.6 + (won ? 60 : 15) + (won && g.msn && g.msn.isBoss ? 90 : 0));
    L.mas[cid] = (L.mas[cid] | 0) + gain;
    g._masK = kills;
    const after = this.mastery(g.meta, cid);
    const ups = [];
    let gold = 0, gem = starGem;
    for (let lv = before.lv + 1; lv <= after.lv; lv++) {
      const rw = lvReward(lv); ups.push({ lv, gold: rw.gold, gem: rw.gem });
      gold += rw.gold; gem += rw.gem;
    }
    if (gold) g.addRubies(gold);
    if (gem) g.addStones(gem);
    g.saveMeta();
    /* allStars: bitmask kazanım sırasıyla — sonuç ekranı yeni yıldızı damgalar */
    return {
      side, mask, newMask, starGem, total: this.totalStars(g.meta), fc,
      rec: { kills, best: r.k, isNew: recKills, first: firstRec },
      mas: { id: cid, gain, before, after, ups, gold, gem: gem - starGem },
    };
  },
};
