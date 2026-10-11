/* ═══════════ TAKVİM + HAFTALIK MÜHÜR (v53, 2026-09-28) — yol haritası D7 · D3 ═══════════
   %100 ÇEVRİMDIŞI. Tarih yalnız Clock.now()'dan okunur (geri alınan saat
   sayaçları dondurur — v44). Sunucu yok: takvim bu tablodur; her güncelleme
   tabloya satır ekler, kod değişmez.

   HAFTA ETKİNLİĞİ: hafta numarasına göre dönen dört tema + hafta sonu payı.
   HAFTALIK MÜHÜR: hafta numarasından türeyen tohumla SABİT görev + kural;
   skor bronz/gümüş/altın eşiklerine göre ödül (hafta başına eşik başı bir kez).
   Liderlik tablosunun çevrimdışı karşılığı: oyuncu kendi en iyisiyle yarışır. */

import { Clock } from './clock.js?v=20260930m';

const DAY = 864e5, WEEK = 7 * DAY;
const EPOCH = new Date(2026, 0, 5).getTime();          // pazartesi (yerel saat)

export const WEEK_EVENTS = [
  { id: 'kor',   name: 'KOR YAĞMURU',   line: 'Tüm görevlerde altın ×1,5', col: '#d8a284' },
  { id: 'avci',  name: 'BOSS AVI',      line: 'Boss görevlerinde altın ×2', col: '#ff6a5a' },
  { id: 'elit',  name: 'ELİT GECESİ',   line: 'Elit düşman ×1,6 sık · elit ganimeti artar', col: '#cfd6e2' },
  { id: 'biyom', name: 'BİYOM HAFTASI', line: 'Seçili haritada altın ×2', col: '#9fb4c9' },
];

export const SEAL_RULES = [
  { id: 'cam',  name: 'CAM TOP',     line: 'Canın %60 · düşmanlar aynı' },
  { id: 'elit', name: 'ELİT SELİ',   line: 'Elit düşman üç kat sık' },
  { id: 'hiz',  name: 'HIZLI GECE',  line: 'Düşmanlar %20 hızlı' },
  { id: 'kuru', name: 'KAN KURUSU',  line: 'Can yenilenmez · can çalma kapalı' },
];
export const SEAL_TIERS = [
  { id: 'bronz',  name: 'BRONZ',  need: 450,  reward: { kind: 'rubies', amount: 180 }, col: '#c98a52' },
  { id: 'gumus',  name: 'GÜMÜŞ',  need: 950,  reward: { kind: 'stones', amount: 12 },  col: '#cfd6e2' },
  { id: 'altin',  name: 'ALTIN',  need: 1500, reward: { kind: 'stones', amount: 30 },  col: '#f0c77a' },
];

export function weekIndex(now) { return Math.floor(((now || Clock.now()) - EPOCH) / WEEK); }
export function weekLeft(now) {
  const t = now || Clock.now();
  return EPOCH + (weekIndex(t) + 1) * WEEK - t;
}
function hash(n) { let x = (n * 2654435761) >>> 0; x ^= x >>> 15; x = Math.imul(x, 2246822519) >>> 0; x ^= x >>> 13; return x >>> 0; }

export const Calendar = {
  /** Bu haftanın etkinliği + hafta sonu durumu. */
  current(worldCount, now) {
    const t = now || Clock.now();
    const wi = weekIndex(t);
    const ev = WEEK_EVENTS[((wi % WEEK_EVENTS.length) + WEEK_EVENTS.length) % WEEK_EVENTS.length];
    const day = new Date(t).getDay();
    const featured = 1 + (hash(wi + 77) % Math.max(1, worldCount | 0));
    return { ev, weekend: day === 0 || day === 6, leftMs: weekLeft(t), featured, week: wi };
  },
  /** Görev sonu altın çarpanı. */
  goldMul(g) {
    const c = this.current(g._worldCount || 10);
    let k = 1;
    if (c.ev.id === 'kor') k *= 1.5;
    if (c.ev.id === 'avci' && g.msn && g.msn.isBoss) k *= 2;
    if (c.ev.id === 'biyom' && g.worldId === c.featured) k *= 2;
    if (c.weekend) k *= 1.25;
    if (g.sealRun) k = 1;                                  // mühür koşusu kendi ödülünü verir
    return k;
  },
  eliteMul() { return this.current(10).ev.id === 'elit' ? 1.6 : 1; },

  /* ── HAFTALIK MÜHÜR ── */
  seal(progress, worldCount) {
    const wi = weekIndex();
    const h = hash(wi);
    let open = 1;
    for (let w = 1; w <= worldCount; w++) if ((progress[w] | 0) > 0 || w === 1) open = w; else break;
    const w = 1 + (h % open);
    const m = 1 + ((h >>> 5) % Math.min(4, Math.max(1, (progress[w] | 0) + 1)));
    const rule = SEAL_RULES[(h >>> 11) % SEAL_RULES.length];
    return { week: wi, w, m, rule };
  },
  book(meta) {
    const wi = weekIndex();
    if (!meta.seal || meta.seal.wk !== wi) meta.seal = { wk: wi, best: 0, got: [], runs: 0 };
    return meta.seal;
  },
  score(g, won) {
    return Math.round((g.kills | 0) + (g.wave | 0) * 45 + (won ? 400 : 0) + Math.min(300, (g.time || 0) * 0.5));
  },
  /** Mühür koşusu sonu: yeni eşikleri verir, özet döndürür. */
  finish(g, won) {
    const S = this.book(g.meta);
    const sc = this.score(g, won);
    const prev = S.best;
    S.runs++;
    if (sc > S.best) S.best = sc;
    const fresh = [];
    for (const T of SEAL_TIERS) {
      if (S.best >= T.need && !S.got.includes(T.id)) {
        S.got.push(T.id); fresh.push(T);
        if (T.reward.kind === 'rubies') g.addRubies(T.reward.amount);
        else g.addStones(T.reward.amount);
      }
    }
    g.saveMeta();
    return { score: sc, best: S.best, isBest: sc > prev, fresh };
  },
  /** beginWave'den sonra: mühür kuralı + hafta etkinliği düşman tarafı. */
  applyWave(g) {
    const E = g.enemies;
    if (!E) return;
    E.eliteChance = (E.eliteChance || 0) * this.eliteMul();
    if (!g.sealRun) return;
    const r = g.sealRun.rule.id;
    if (r === 'elit') E.eliteChance = Math.max(0.05, E.eliteChance * 3);
    if (g.wave === 1) {
      if (r === 'hiz') E.speedMul = (E.speedMul || 1) * 1.2;   // v53i: dünyanın hızını EZMEZ, üstüne biner (bir kez)
      const p = g.player;
      if (r === 'cam') { p.maxHp = Math.max(10, Math.round(p.maxHp * 0.6)); p.hp = p.maxHp; }
      if (r === 'kuru') p.noHeal = true;   // v53j: regen/can çalma kartı sonradan alınsa da işlemez
    }
  },
};
