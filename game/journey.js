/* ═══════════ journey.js (v56, 2026-09-28) — OYUNCU YOLCULUĞU ═══════════
   Yol haritası v3'ün meta katmanı, tek dosya, hiçbiri güç bütçesini büyütmez:
     nextGoal   A2/C1 · menüde ve sonuç ekranında "en yakın hedef" (tek satır)
     Daily      C2    · günde üç kısa hedef, üçü bitince tahta sandık
     BLESSINGS  C3    · koşu başı kutsama — her biri bir artı + bir eksi (≈ sıfır toplam, balance.W)
     Gift       C5    · uzakta geçen süre (tavan 8 sa) → altın (+6 sa'te sandık); saat Clock.now()
     Ghost      D2    · kendi rekorunla yarış: görev başına 4 sn'lik kıyım eğrisi, HUD'da fark
   Sıcak döngüde tahsis yok: Ghost önceden ayrılmış Int16Array'e yazar. */

import { dayKey } from './dailies.js?v=20260930m';
import { Clock } from './clock.js?v=20260930m';
import { Ledger } from './ledger.js?v=20260930m';

/* ── C2 · GÜNLÜK ÜÇ HEDEF ── (koşu sonu özetinden sınanır; tek koşuda biter) */
export const DAILY_POOL = [
  { id: 'k150', t: 'Bir koşuda 150 kıyım', ok: (r) => r.kills >= 150 },
  { id: 'win', t: 'Bir görev kazan', ok: (r) => r.won },
  { id: 'lv12', t: 'Koşuda seviye 12\'ye ulaş', ok: (r) => r.lvl >= 12 },
  { id: 'fc2', t: 'Bir koşuda 2 saha sandığı aç', ok: (r) => r.fc >= 2 },
  { id: 'hp', t: 'Canın yarıya inmeden kazan', ok: (r) => r.won && r.hpFloor >= 0.5 },
  { id: 'el3', t: 'Bir koşuda 3 elit öldür', ok: (r) => r.elites >= 3 },
  { id: 'evo', t: 'Bir koşuda evrim aç', ok: (r) => r.evo },
  { id: 'boss', t: 'Bir boss devir', ok: (r) => r.boss },
];
const DAILY_CHEST = 'ahsap';

function hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }

export const Daily = {
  book(meta) {
    const d = dayKey();
    if (!meta.dg || meta.dg.d !== d) {
      let h = hash('dg' + d);
      const pool = DAILY_POOL.map((q) => q.id), ids = [];
      while (ids.length < 3) { h = Math.imul(h ^ (h >>> 15), 2246822519) >>> 0; const i = h % pool.length; ids.push(pool.splice(i, 1)[0]); }
      meta.dg = { d, ids, done: [0, 0, 0], paid: 0 };
    }
    return meta.dg;
  },
  list(meta) { const B = this.book(meta); return B.ids.map((id, i) => ({ id, t: (DAILY_POOL.find((q) => q.id === id) || {}).t || id, done: !!B.done[i] })); },
  left(meta) { const B = this.book(meta); return 3 - B.done.reduce((a, b) => a + (b ? 1 : 0), 0); },
  onRun(g, r) {
    const B = this.book(g.meta), fresh = [];
    B.ids.forEach((id, i) => { const q = DAILY_POOL.find((x) => x.id === id); if (!B.done[i] && q && q.ok(r)) { B.done[i] = 1; fresh.push(q.t); } });
    let chest = null;
    if (!B.paid && B.done.every(Boolean)) { B.paid = 1; chest = DAILY_CHEST; if (!g.chests.grant(DAILY_CHEST)) g.addRubies(120); }
    return { fresh, chest, left: this.left(g.meta) };
  },
};

/* ── C3 · KUTSAMA ── her satır balance.W ile ≈ 0 (hasar %1 = 1 puan, can 1 = 0,5) */
export const BLESSINGS = [
  { id: 'cam', name: 'CAM KILIÇ', plus: 'Hasar +%12', minus: 'Can −24', mods: { dmgPct: 0.12, maxHp: -24 }, col: '#d8a284' },
  { id: 'demir', name: 'DEMİR DERİ', plus: 'Can +24', minus: 'Hasar −%12', mods: { maxHp: 24, dmgPct: -0.12 }, col: '#cfd6e2' },
  { id: 'ruzgar', name: 'RÜZGÂR ADIMI', plus: 'Hız +%10 · Mıknatıs +%30', minus: 'Can −20', mods: { speedPct: 0.10, magnetPct: 0.30, maxHp: -20 }, col: '#9fb4c9' },
  { id: 'kan', name: 'KAN ANDI', plus: 'Can çalma +%3', minus: 'Hasar −%6', mods: { lifeSteal: 0.03, dmgPct: -0.06 }, col: '#c85a5a' },
  { id: 'goz', name: 'ŞAHİN GÖZÜ', plus: 'Kritik +%6', minus: 'Hasar −%6', mods: { critChance: 0.06, dmgPct: -0.06 }, col: '#f0c77a' },
  { id: 'hasat', name: 'HASAT AYI', plus: 'Tecrübe +%15', minus: 'Hasar −%5', mods: { xpPct: 0.15, dmgPct: -0.05 }, col: '#b5d68a' },
];
export function rollBlessings(n) {
  const a = BLESSINGS.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; const t = a[i]; a[i] = a[j]; a[j] = t; }
  return a.slice(0, n);
}

/* ── C5 · DÖNÜŞ HEDİYESİ ── */
export const Gift = {
  CAP_H: 8,
  /** Açılışta bir kez (kurucu, ilk saveMeta'dan ÖNCE). Geri alınan saat 0 verir. */
  collect(g) {
    const now = Clock.now(), t = +g.meta.awayT || 0;
    if (!t || now <= t) return null;
    const h = Math.min(this.CAP_H, (now - t) / 36e5);
    if (h < 1) return null;
    const gold = Math.round(h * 28 + Math.min(40, g.accountLevel() * 2) * h / 2);
    g.addRubies(gold);
    let chest = null;
    if (h >= 6) { chest = 'ahsap'; if (!g.chests.grant('ahsap')) chest = null; }
    return { h, gold, chest, full: h >= this.CAP_H };
  },
};

/* ── A2 / C1 · EN YAKIN HEDEF ── en küçük "kalan oran" kazanır; hazır olan her zaman önce */
export function nextGoal(g) {
  const out = [];
  const vc = g.chests.vicCount(), vn = g.chests.vicNeed;
  if (vc < vn) out.push({ k: (vn - vc) / vn, txt: (vn - vc) + ' ZAFER → ZAFER SANDIĞI', page: 'savas' });
  const id = g.meta.selectedChar, need = g.cardsForNext(id), def = g.charDef(id);
  if (need != null && def) {
    const have = g.charCardCount(id), nm = def.name, sv = g.charLevel(id) + 1;
    if (have >= need) {
      const gold = g.goldForNext(id), rub = g.readRubies();
      out.push(rub >= gold ? { k: 0, txt: nm + ' SV ' + sv + ' HAZIR · GELİŞTİR', page: 'kahraman', hot: true }
        : { k: 0.5 * (gold - rub) / gold, txt: (gold - rub) + ' ALTIN → ' + nm + ' SV ' + sv, page: 'kahraman' });
    } else out.push({ k: (need - have) / need, txt: (need - have) + ' KART → ' + nm + ' SV ' + sv, page: 'kahraman' });
  }
  const M = Ledger.mastery(g.meta, id);
  if (!M.max) out.push({ k: 1 - M.frac, txt: M.toNext + ' USTALIK → KADEME ' + (M.lv + 1), page: 'kahraman' });
  const A = g.accountProgress();
  if (A.need > 0) out.push({ k: 1 - A.cur / A.need, txt: (A.need - A.cur) + ' XP → HESAP SV ' + (g.accountLevel() + 1), page: 'savas' });
  const dl = Daily.left(g.meta);
  if (dl > 0) out.push({ k: dl / 3 * 0.9, txt: 'GÜNLÜK HEDEF ' + (3 - dl) + '/3 → TAHTA SANDIK', page: 'savas', daily: true });
  out.sort((a, b) => a.k - b.k);
  return out[0] || null;
}

/* ── D2 · KENDİ HAYALETİN ── görev başına kıyım eğrisi (4 sn adım, 150 örnek = 10 dk) */
const STEP = 4, N = 150;
const cur = new Int16Array(N);
export const Ghost = {
  best: null, t: 0, n: 0, key: '',
  begin(g) {
    this.key = g.towerRun ? 'tw' : g.sealRun ? 'sl' : g.nmRun ? 'nm' + g.worldId + '-' + g.missionId : g.worldId + '-' + g.missionId;
    const all = g.meta.ghost || {};
    this.best = Array.isArray(all[this.key]) ? all[this.key] : null;
    this.t = 0; this.n = 0; cur.fill(0);
  },
  tick(g, dt) {
    this.t += dt;
    while (this.n < N && this.t >= (this.n + 1) * STEP) { cur[this.n] = Math.min(32767, g.kills | 0); this.n++; }
  },
  /** HUD: aynı andaki rekor kıyıma göre fark (null = rekor yok). */
  delta(g) {
    if (!this.best || !this.best.length) return null;
    const i = Math.min(this.best.length - 1, Math.floor(this.t / STEP));
    if (i < 1) return null;
    return (g.kills | 0) - (this.best[i] | 0);
  },
  end(g) {
    if (!this.n) return false;
    const fin = g.kills | 0, prev = this.best ? this.best[this.best.length - 1] | 0 : -1;
    if (fin <= prev) return false;
    if (!g.meta.ghost) g.meta.ghost = {};
    const a = Array.from(cur.subarray(0, this.n)); a.push(fin);
    g.meta.ghost[this.key] = a;
    return prev >= 0;
  },
};

/* ── D3 · SEZON YOLU ── 6 haftalık yay, hafta indeksinden (sunucu yok) */
export const SEASON = [
  { n: 'KIZIL AY DOĞAR', l: 'Mezarlıkta ilk kor yandı. Hasat başlıyor.' },
  { n: 'KÜL YEMİNİ', l: 'Küllerden kalkan tarikat seni arıyor.' },
  { n: 'BATAKTAKİ ÇAN', l: 'Sisin içinde bir çan çalıyor, kimse çalmıyor.' },
  { n: 'CAM KATEDRAL', l: 'Kırık vitraylarda başka bir göğün ışığı.' },
  { n: 'HİÇLİK KAPISI', l: 'Kapı aralandı. Ötesi seni tanıyor.' },
  { n: 'KIZIL AY BATAR', l: 'Son hasat. Ay batmadan tırpanı kaldır.' },
];
export function seasonWeek() { return Math.floor(Clock.now() / 6048e5) % SEASON.length; }
