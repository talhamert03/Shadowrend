/* ═══════════════════════════════════════════════════════════
   balance.js — DENGE TEMELİ (v49)

   Kullanıcı: "karakterleri (nadirliğe göre) ve ekipmanların kazandırdığı
   saldırı, saldırı hızı vs. her şeyi dengele; bundan sonra eklenecek
   karakterlere de bir temel atalım."

   TEK KURAL: HER STAT BİR GÜÇ PUANIDIR, HER NADİRLİĞİN BİR BÜTÇESİ VARDIR.
   · `W` — bir statın 1 biriminin kaç puan ettiği. 1 puan ≈ tek hedefe
     %1 hasar/sn ya da ona denk hayatta kalma. (hasar %100 = 100 puan,
     can +1 = 0,5 puan, çünkü taban can 100 ve hayatta kalma hasarın
     yarısı kadar sayılır.)
   · `HERO_BUDGET[nadirlik]` / `GEAR_BUDGET[sıra]` × `SLOT_K[yuva]` —
     o kademenin toplam puanı. Negatif stat (bedel) bütçeden düşer, yani
     "−5 can" alan eşya o kadar fazla saldırı taşır.
   · config.js yüklenirken HER kahramanın ve eşyanın `mods`u bütçesine
     ÖLÇEKLENİR (`fitMods`): oranlar (kimlik) korunur, toplam bütçeye
     oturur. Yeni kahraman/eşya eklemek = kimlik oranlarını yazmak;
     sayıyı bütçe verir. Bir eşya bilinçli olarak bütçe dışı kalacaksa
     `fixed: true` yazılır.
   · Dünya eğrisi (`worldCurve`) aynı modelden: oyuncunun o dünyaya
     vardığında BEKLENEN meta gücü (kahraman seviyesi, eşya sırası/seviyesi,
     imza nadirliği) hesaplanır; düşman canı = beklenen hasar gücü ×
     meydan okuma, düşman hasarı = beklenen can gücü × meydan okuma.
     Eski tablo (can ×48, 10. görevle ×100) beklenen gücü (~×3,5) on dört
     kat aşıyordu: geç dünyalarda sıradan düşman "sünger" olmuştu.

   Bu dosya HİÇBİR ŞEY import etmez (config.js ve worlds.js onu okur;
   döngü yok). Tezgah: `_baltest.html` ⑪ bütçe tablosu + ⑫ dünya eğrisi.
   ═══════════════════════════════════════════════════════════ */

export const W = {
  dmgPct: 100, atkPct: 90, critChance: 120, critMult: 40, lifeSteal: 140,
  maxHp: 0.5, armor: 4, speedPct: 40, dodge: 80, regen: 3,
};

/* Kahraman nadirliği 1-4 (CHAR_RARITIES). İmza silahının kendi gücü
   (`signaturePower`) AYRI eksendir; bu bütçe yalnız kahramanın pasif
   `mods`u içindir. Basamak ~×1,5: bir üst nadirlik "hissedilir" ama
   eşyası iyi bir alt nadirliği ezmez. */
export const HERO_BUDGET = [0, 10, 16, 24, 32];

/* Eşya sırası 1-5 (ÇOK YAYGIN · YAYGIN · NADİR · EPİK · EFSANEVİ).
   DİKKAT: RARITIES DİZİNİ SIRA DEĞİLDİR (5 = NADİR) → `GEAR_RANK`. */
export const GEAR_BUDGET = [0, 6, 11, 16, 23, 30];
export const GEAR_RANK = { 1: 1, 2: 2, 5: 3, 3: 4, 4: 5 };
/* silah yuvası taşıyıcıdır; diğer üçü onun %75'i (dört yuva dolu bir
   kuşanımda silah ≈ %31 — tek yuva build'i belirlemesin) */
export const SLOT_K = { silah: 1, zirh: 0.75, eldiven: 0.75, cizme: 0.75 };

export function powerOf(mods) {
  let s = 0;
  if (mods) for (const k in mods) s += (W[k] || 0) * mods[k];
  return s;
}

/* yuvarlama: yüzdeler 0,005 adım (0,5 puan), can/zırh tam sayı */
const RND = { maxHp: 1, armor: 1, regen: 0.1 };
function rnd(k, v) { const q = RND[k] || 0.005; return Math.round(v / q) * q; }

/* TAVANLAR: bütçe büyütürken bile tek stat buradan geçmez (hız %10'u
   aşınca joystick kayar, can çalma %8'i aşınca ölüm biter). Tavana
   takılan pay diğer pozitif statlara dağıtılır. */
export const CAPS = { speedPct: 0.10, critChance: 0.08, lifeSteal: 0.08, armor: 2, dodge: 0.08 };

/** mods'u bütçeye ölçekle: pozitifler aynı oranda büyür/küçülür, negatif
    (bedel) sabit kalır ve bütçeden düşer. Yeni nesne döner. */
export function fitMods(mods, budget) {
  if (!mods || !(budget > 0)) return mods;
  let pos = 0, neg = 0;
  for (const k in mods) { const p = (W[k] || 0) * mods[k]; if (p > 0) pos += p; else neg += p; }
  if (pos <= 0) return mods;
  const out = {}, capped = {};
  for (let it = 0; it < 4; it++) {
    let free = 0, fixed = 0;
    for (const k in mods) {
      const p = (W[k] || 0) * mods[k];
      if (p <= 0) continue;
      if (capped[k]) fixed += W[k] * CAPS[k]; else free += p;
    }
    if (free <= 0) break;
    const f = (budget - neg - fixed) / free;
    let hit = false;
    for (const k in mods) {
      if ((W[k] || 0) * mods[k] <= 0 || capped[k]) continue;
      if (CAPS[k] != null && mods[k] * f > CAPS[k]) { capped[k] = true; hit = true; }
    }
    if (hit) continue;
    for (const k in mods) {
      const v = mods[k];
      if ((W[k] || 0) * v > 0) out[k] = capped[k] ? CAPS[k] : rnd(k, v * f);
      else out[k] = v;
      if (out[k] === 0 && v !== 0) out[k] = RND[k] || 0.005;
    }
    return out;
  }
  for (const k in mods) out[k] = capped[k] ? CAPS[k] : mods[k];
  return out;
}

export function heroBudget(rarity) { return HERO_BUDGET[rarity | 0] || HERO_BUDGET[1]; }
export function gearBudget(slot, rarityIdx) {
  const r = GEAR_RANK[rarityIdx] || 1;
  return GEAR_BUDGET[r] * (SLOT_K[slot] || 0.75);
}

/* ── BEKLENEN META GÜÇ (dünya w'ye varıldığında) ──
   Varsayımlar YAZILI (tezgah ⑫ bunları basar):
   · kahraman seviyesi 1 + 0,9·(w−1), tavan 9
   · kahraman nadirliği 1 + 0,4·(w−1), tavan 4 (imza gücü bundan)
   · eşya sırası 1 + 0,45·(w−1), tavan 5 · eşya seviyesi 1 + 0,55·(w−1), tavan 6
   · silah dışı yuvaların puanının YARISI hasara, yarısı cana gider
   Formüller config ile AYNI (charLevelMods · gearLevelMods · signaturePower);
   değişirlerse burası da değişir — tezgah ⑫ ikisini yan yana basar. */
const SIG = [1, 1, 1.12, 1.25, 1.45];
const lerpA = (a, x) => { const i = Math.min(a.length - 2, Math.max(1, Math.floor(x))); return a[i] + (a[i + 1] - a[i]) * Math.min(1, Math.max(0, x - i)); };
export function expectedPower(w) {
  const k = Math.max(0, w - 1);
  const L = Math.min(9, 1 + 0.9 * k), b = L - 1;
  const heroDmg = (1 + 0.07 * b) * (1 + 0.02 * b);
  const heroHp = 1 + 0.08 * b;
  const rank = Math.min(5, 1 + 0.45 * k), gl = Math.min(6, 1 + 0.55 * k);
  const glm = 1 + 0.12 * (gl - 1);
  const wpn = lerpA(GEAR_BUDGET, rank) * glm, oth = 3 * lerpA(GEAR_BUDGET, rank) * 0.75 * glm;
  const dmg = heroDmg * (1 + (wpn + oth * 0.5) / 100) * lerpA(SIG, Math.min(4, 1 + 0.4 * k));
  const hp = heroHp * (1 + (oth * 0.5 * 2) / 100);
  return { level: L, rank, gearLevel: gl, dmg, hp };
}

/* MEYDAN OKUMA: beklenen güce göre ne kadar zor. Dünya başına öldürme
   süresi +%16, gelen hasar +%9 — geri kalan zorluk kalabalık, hız, elit
   ve kadrodan (worlds.js) gelir. İlk dünya tam 1. */
export const CHALLENGE = { hp: 0.16, dmg: 0.09, bossHp: 0.10 };
const P1 = expectedPower(1);
export function worldCurve(w) {
  const P = expectedPower(w), k = Math.max(0, w - 1);
  const pd = P.dmg / P1.dmg, ph = P.hp / P1.hp;
  const r2 = (v) => Math.round(v * 100) / 100;
  return {
    hpMul: r2(pd * (1 + CHALLENGE.hp * k)),
    dmgMul: r2(ph * (1 + CHALLENGE.dmg * k)),
    bossHpMul: r2(pd * (1 + CHALLENGE.bossHp * k)),
    power: r2(pd), toughness: r2(ph),
  };
}

/* ── STAT SATIRI: kahraman kartındaki sayı mods'tan TÜRER (bütçe
   değişince metin eskimesin — v49'a kadar elle yazılıyordu). ── */
const LBL = { dmgPct: 'hasar', atkPct: 'saldırı hızı', critChance: 'kritik', critMult: 'kritik hasarı',
  lifeSteal: 'can çalma', speedPct: 'hız', dodge: 'kaçınma', maxHp: 'azami can', armor: 'zırh', regen: 'yenilenme' };
const ORD = ['dmgPct', 'atkPct', 'critChance', 'critMult', 'lifeSteal', 'speedPct', 'dodge', 'maxHp', 'armor', 'regen'];
export function modsLine(mods) {
  const parts = [];
  for (const k of ORD) {
    if (!mods || mods[k] == null || mods[k] === 0) continue;
    const v = mods[k], sg = v > 0 ? '+' : '−', a = Math.abs(v);
    const num = (k === 'maxHp' || k === 'armor' || k === 'regen') ? String(Math.round(a * 10) / 10) : '%' + String(Math.round(a * 1000) / 10).replace('.', ',');
    parts.push(LBL[k] + ' ' + sg + num);
  }
  const s = parts.join(', ');
  return s.charAt(0).toLocaleUpperCase('tr') + s.slice(1);
}
