/* ═══════════════════════════════════════════════════════════
   chests.js — Sandık Sistemi ve Açılış Töreni

   • 4 sandık yuvası (ana ekranda). Görev ilk geçişinde sandık
     kazanılır; yuva doluysa sandık yanar (uyarı gösterilir).
   • Kilit süreleri kısa tutuldu (mobil oturum dostu). Aynı anda
     tek sandık açılır (kilit çözme sırası — strateji hissi).
   • Açılış töreni: canvas'a vektörle çizilen sandık; dokun →
     sarsılır → kapak fırlar → ışık huzmeleri → ödül kartları
     sırayla döner. Tamamen sentez, sıfır asset.
   ═══════════════════════════════════════════════════════════ */

import { EQUIPMENT, RARITIES, WEAPONS, WEAPON_META, CHARACTERS, CHAR_RARITIES, charCardDrop, CHAR_MAX_LEVEL } from './config.js?v=20260930m';
import { drawCharPortrait } from './player.js?v=20260930m';
import { ChestScene3D } from './chestScene3d.js?v=20260930m';
import { Clock } from './clock.js?v=20260930m';

/* ── NADİRLİK SIRASI (v44 düzeltmesi) ──
   RARITIES dizini sıra DEĞİLDİR: 5 = NADİR (mavi) YAYGIN ile EPİK arasında
   durur. Eski kod `rarity >= 4` ile NADİR'i EFSANE sayıyordu → NADİR eşya
   çıkan sandıkta efsane şansı ×0,05'e kısılıyor, tören NADİR'i en sona
   koyuyor, Mistik "efsane garanti" sandığı NADİR verebiliyordu; ayrıca
   `rarity <= rarityMax` (tavan 4) NADİR eşyayı sandık havuzundan HİÇ
   çıkarmıyordu. Artık her karşılaştırma bu sıradan geçer (1-4 ölçeği,
   NADİR = 2,5 — kahraman NADİR'i 2'dir, sahne eşiği ≥3 değişmez). */
export const rk = (r) => (r === 5 ? 2.5 : (r || 0));
export const rkOf = (o) => (o && o.kind === 'gear' ? rk(o.rarity) : (o && o.rarity) || 0);
const isLegend = (o) => rkOf(o) >= 4;

/* ── EFSANE GARANTİSİ (merhamet sayacı) ──
   HER sandık açılışı sayılır (ücretsiz, görev, mağaza, zafer). Efsane
   çıkmayan her açılış sayacı bir artırır; PITY_N'inci açılış efsaneyi
   garanti eder ve sayaç sıfırlanır. Doğal efsane de sıfırlar. 40:
   ortalama oyuncu ~3 haftada bir, sıkı oyuncu haftada bir garantiye
   ulaşır — doğal şansı gölgelemez, kötü şans serisini keser. */
export const PITY_N = 40;

/* 7 nadirlik kademesi (Clash Royale mantığı): TAHTA → GÜMÜŞ → ALTIN →
   BÜYÜLÜ → BUZUL → MİSTİK → EJDERHA. Kilit süresi + ödül gücü kademeyle büyür.
   stoneChance/stoneDrop: Gem (gem) düşüş olasılığı ve miktarı —
   bir sandıkta en fazla 5 gem çıkar. Paletler 2D glif + 3D sahneyle EŞ:
   önizleme neyse açılan sandık da odur. */
export const CHESTS = {
  /* Tahta Sandık — kara meşe kalaslar, dövme demir kuşaklar */
  ahsap: {
    name: 'TAHTA SANDIK', tier: 1, time: 3600, lock: 'plate',
    color: '#8a5a28', rim: '#3a2409', metal: '#8a94a4', accent: '#d8a05c', glow: 'rgba(230,170,100,0.45)',
    rubies: [16, 30], gear: [0, 1], gearChance: 0.5, rarityMax: 1, weaponChance: 0,
    charChance: 0.04, charRarityMax: 1, stoneChance: 0.10, stoneDrop: [1, 1],
    price: 0, stonePrice: 8, desc: 'Sefer dönüşü ganimeti: is tutmuş kara meşe kalaslar, dövme demir kuşaklar ve yalın bir demir kilit.',
  },
  /* Gümüş Sandık — bal rengi ahşap, cilalı gümüş kuşaklar, kabaralar */
  yaygin: {
    name: 'GÜMÜŞ SANDIK', tier: 2, time: 5400, lock: 'plate',
    color: '#a06a2e', rim: '#4a2f10', metal: '#d8e2ec', accent: '#eef4fa', glow: 'rgba(210,225,240,0.5)',
    rubies: [24, 42], gear: [1, 1], gearChance: 0.75, rarityMax: 2, weaponChance: 0.04,
    charChance: 0.06, charRarityMax: 1, stoneChance: 0.18, stoneDrop: [1, 2],
    price: 55, stonePrice: 14, desc: 'Bal rengi meşe gövdeye cilalı gümüş kuşaklar dolanmış; kabaraları ay ışığında parıldar.',
  },
  /* Altın Sandık — kral altını, filigran kabartma, yakut mühür */
  kemik: {
    name: 'ALTIN SANDIK', tier: 3, time: 7200, lock: 'shield',
    color: '#d8961d', rim: '#5f3c06', metal: '#ffd97a', accent: '#ffc94f', glow: 'rgba(255,205,90,0.62)',
    rubies: [34, 60], gear: [1, 1], gearChance: 1, rarityMax: 2, weaponChance: 0.08,
    charChance: 0.08, charRarityMax: 2, stoneChance: 0.30, stoneDrop: [1, 3],
    price: 90, stonePrice: 22, desc: 'Koyu kral altını, filigran kabartmalar ve güneş oymalı kapak. Kalbinde gerçek bir yakut mühür.',
  },
  /* Büyülü Sandık — açık mor: obsidyen kafeste atan ametist kalp */
  kan: {
    name: 'BÜYÜLÜ SANDIK', tier: 4, time: 10800, lock: 'crystal',
    color: '#8a4ae8', rim: '#301468', metal: '#2c2842', accent: '#cf9aff', glow: 'rgba(210,150,255,0.65)',
    rubies: [70, 120], gear: [1, 2], gearChance: 1, rarityMax: 3, weaponChance: 0.2,
    charChance: 0.13, charRarityMax: 3, stoneChance: 0.55, stoneDrop: [2, 4],
    price: 220, stonePrice: 34, desc: 'Obsidyen kafesin içinde nabız gibi atan açık mor bir ametist kalp. Rün eteği ışıkla yanıp söner.',
  },
  /* Buzul Sandık — don çeliği gövde, derzden taşan buz kristalleri */
  kadim: {
    name: 'BUZUL SANDIK', tier: 5, time: 14400, lock: 'gem',
    color: '#31506a', rim: '#122435', metal: '#a8c4d8', accent: '#8fdcff', glow: 'rgba(140,220,255,0.62)',
    rubies: [140, 240], gear: [2, 2], gearChance: 1, rarityMax: 4, weaponChance: 0.45,
    charChance: 0.22, charRarityMax: 4, stoneChance: 0.85, stoneDrop: [2, 5],
    price: 450, stonePrice: 75, desc: 'Bin yıllık buzuldan sökülmüş; don çeliği gövdesinin derzlerinden buz mavisi kristaller taşar.',
  },
  /* MİSTİK — koyu mor büyülü: kara ahşap, derzlerden sızan mor ışık.
     İçinden SADECE 1 adet EFSANEVİ kart çıkar — garanti. */
  mistik: {
    name: 'MİSTİK SANDIK', tier: 6, time: 21600, lock: 'eye',
    color: '#3a2454', rim: '#170c2c', metal: '#8a6bc0', accent: '#b465ff', glow: 'rgba(180,101,255,0.62)',
    rubies: [0, 0], gear: [0, 0], gearChance: 0, rarityMax: 4, weaponChance: 0,
    charChance: 0, charRarityMax: 4, stoneChance: 0, stoneDrop: [0, 0],
    price: 900, stonePrice: 150, pureLegendary: true,
    desc: 'Karanlık büyüyle mühürlü kara ahşap; derzlerinden mor ışık sızar. İçinde TEK bir efsane uyur — garanti.',
  },
  /* EJDERHA — en nadir: kara demir + kızıl pul zırh, kapağında uyuyan ejder başı.
     Efsanevi GARANTİ + dolup taşan ganimet. */
  ejderha: {
    name: 'EJDERHA SANDIĞI', tier: 7, time: 28800, lock: 'dragon',
    color: '#8a1e26', rim: '#360a10', metal: '#3a3440', accent: '#ff5a3c', glow: 'rgba(255,90,60,0.65)',
    rubies: [260, 420], gear: [2, 3], gearChance: 1, rarityMax: 4, weaponChance: 0.6,
    charChance: 0.35, charRarityMax: 4, stoneChance: 1, stoneDrop: [3, 5], minTop: 4,
    price: 1600, stonePrice: 260,
    desc: 'Ejder yavrusunun sarıldığı kara demir sandık; pulları sıcak, gözleri hiç kapanmaz. İçinde efsane GARANTİ.',
  },
};

/* v51 — Kilidi Gem ile anında bitirme. YALNIZ çözülmekte olan sandıkta sunulur.
   Tam sürenin fiyatı = mağazadaki Gem fiyatının %80'i (sahip olduğun sandığı
   beklememek, yenisini almaktan asla pahalı olmamalı). Kalan süre oranı r
   içbükey eğriyle (r^0,8) fiyatı düşürür: yarı yolda ~%57, son dakikalarda
   1-2 Gem. Tam fiyat: tahta 6 · gümüş 11 · altın 18 · büyülü 27 ·
   buzul 60 · mistik 120 · ejderha 208. */
const SKIP_FULL_RATIO = 0.8;
const SKIP_CURVE = 0.8;
export function skipCost(chestType, remainingMs) {
  const C = CHESTS[chestType];
  const total = Math.max(1, C.time * 1000);
  const r = Math.min(1, Math.max(0, remainingMs) / total);
  const full = Math.max(2, Math.round((C.stonePrice || 10) * SKIP_FULL_RATIO));
  return Math.max(1, Math.ceil(full * Math.pow(r, SKIP_CURVE)));
}

export const CHEST_SLOTS = 4;

/* ── BOSS GANİMET ZARI ─────────────────────────────────────
   Boss kesildiğinde düşen sandık nadirliğe göre zar atar.
   Oyuncunun ŞANS statı üst kademelerin ağırlığını artırır. */
const BOSS_DROP = [
  ['ahsap',  32, 0.0],
  ['yaygin', 27, 0.3],
  ['kemik',  24, 0.6],
  ['kan',    13, 1.2],
  ['kadim',   4, 2.0],
];
export function rollBossChest(luck = 0) {
  let total = 0;
  const w = BOSS_DROP.map(([t, base, lb]) => {
    const v = base * (1 + Math.max(0, luck) * lb);
    total += v;
    return [t, v];
  });
  let r = Math.random() * total;
  for (const [t, v] of w) { r -= v; if (r <= 0) return t; }
  return 'ahsap';
}

/* ── GÖREV GANİMETİ: her bölüm tamamlandığında GARANTİ 1 sandık.
   Nadirlik zarı sıradan → efsane doğru gittikçe zorlaşır; boss
   görevlerinde üst kademelere doğru kaydırılır. ── */
const MISSION_DROP = [
  ['ahsap',  44, 0.0],
  ['yaygin', 29, 0.3],
  ['kemik',  16, 0.6],
  ['kan',     8, 1.0],
  ['kadim',   3, 1.6],
];
export function rollMissionChest(luck = 0, boss = false) {
  let total = 0;
  const w = MISSION_DROP.map(([t, base, lb]) => {
    let v = base * (1 + Math.max(0, luck) * lb);
    if (boss) v *= (t === 'ahsap' ? 0.35 : t === 'yaygin' ? 0.8 : 1.7);
    total += v;
    return [t, v];
  });
  let r = Math.random() * total;
  for (const [t, v] of w) { r -= v; if (r <= 0) return t; }
  return 'ahsap';
}

const KEY = 'kh_chests';
const FREE_KEY = 'kh_freechest';
export const FREE_CHEST_CD = 6 * 60 * 60 * 1000;   // 6 saatte bir ücretsiz ahşap

function fmtDur(ms) {
  const s = Math.max(0, Math.ceil(ms / 1000));
  if (s >= 3600) return Math.floor(s / 3600) + 'sa ' + Math.floor((s % 3600) / 60) + 'dk';
  if (s >= 60) return Math.floor(s / 60) + 'dk ' + (s % 60 ? (s % 60) + 'sn' : '');
  return s + 'sn';
}
export { fmtDur };

export class ChestSystem {
  constructor(game) {
    this.game = game;
    this.slots = this.load();          // [{t, st:'locked'|'unlocking'|'ready', at}] | null
    this.ceremonyActive = false;
  }

  load() {
    try {
      const raw = JSON.parse(localStorage.getItem(KEY) || 'null');
      if (!Array.isArray(raw)) return [null, null, null, null];
      const out = [];
      for (let i = 0; i < CHEST_SLOTS; i++) {
        const c = raw[i];
        out.push(c && CHESTS[c.t]
          ? { t: c.t, st: c.st || 'locked', at: c.at || 0, ad: !!c.ad, cut: c.cut || 0 }
          : null);
      }
      return out;
    } catch (e) { return [null, null, null, null]; }
  }

  save() {
    try { localStorage.setItem(KEY, JSON.stringify(this.slots)); } catch (e) { /* sessiz */ }
  }

  /** Süresi dolanları hazıra çevirir. Değişiklik olduysa true döner. */
  tick() {
    let changed = false;
    const now = Clock.now();
    for (const c of this.slots) {
      if (c && c.st === 'unlocking' && now >= c.at) { c.st = 'ready'; changed = true; }
      if (c && c.st === 'locked' && CHESTS[c.t].time === 0) { c.st = 'ready'; changed = true; }
    }
    if (changed) this.save();
    return changed;
  }

  /** Görev ödülü sandığı ver. Yuva yoksa false. */
  grant(type) {
    for (let i = 0; i < CHEST_SLOTS; i++) {
      if (!this.slots[i]) {
        const ready = CHESTS[type].time === 0;
        this.slots[i] = { t: type, st: ready ? 'ready' : 'locked', at: 0, ad: false, cut: 0 };
        this.save();
        return true;
      }
    }
    return false;
  }

  hasFreeSlot() { return this.slots.some((c) => !c); }
  anyUnlocking() { return this.slots.some((c) => c && c.st === 'unlocking'); }

  /** Bu yuvanın GERÇEK kilit süresi (ms) — izlenen reklam indirimi düşülmüş. */
  lockMs(i) {
    const c = this.slots[i];
    if (!c) return 0;
    return Math.max(0, CHESTS[c.t].time * 1000 - (c.cut || 0));
  }

  startUnlock(i) {
    const c = this.slots[i];
    if (!c || c.st !== 'locked' || this.anyUnlocking()) return false;
    const ms = this.lockMs(i);
    if (ms <= 0) { c.st = 'ready'; c.at = 0; this.save(); return true; }
    c.st = 'unlocking';
    c.at = Clock.now() + ms;
    this.save();
    return true;
  }

  /* ── REKLAM HIZLANDIRMASI: her sandıkta BİR kez, 30 dakika ── */
  get adBoostMs() { return 30 * 60 * 1000; }
  /** Sandık başına tek kullanım; YALNIZ çözülmekte olan sandıkta (v51). */
  canAdBoost(i) {
    const c = this.slots[i];
    return !!c && !c.ad && c.st === 'unlocking';
  }
  /** Reklam izlendi: kilit süresi 30 dk kısalır (kilitliyse toplam süreden). */
  applyAdBoost(i) {
    const c = this.slots[i];
    if (!this.canAdBoost(i)) return false;
    c.ad = true;
    if (c.st === 'unlocking') {
      c.at -= this.adBoostMs;
      if (Clock.now() >= c.at) { c.st = 'ready'; c.at = 0; }
    } else {
      c.cut = (c.cut || 0) + this.adBoostMs;
      if (this.lockMs(i) <= 0) { c.st = 'ready'; c.at = 0; }
    }
    this.save();
    return true;
  }

  /** Gem ile kilidi anında bitir (yalnız o an açılan sandık). */
  skipCostFor(i) {
    const c = this.slots[i];
    if (!c) return 0;
    if (c.st === 'ready') return 0;
    if (c.st === 'unlocking') return skipCost(c.t, c.at - Clock.now());
    return skipCost(c.t, this.lockMs(i));      // kilitli: tam süre üzerinden
  }
  finishWithStone(i, game) {
    const c = this.slots[i];
    if (!c || c.st !== 'unlocking') return false;
    const cost = this.skipCostFor(i);
    if (!game.spendStones(cost)) return false;
    c.st = 'ready';
    c.at = 0;
    this.save();
    return true;
  }

  /* ── Ücretsiz sandık ── */
  freeReadyIn() {
    let last = 0;
    try { last = Number(localStorage.getItem(FREE_KEY) || 0); } catch (e) { /* */ }
    return Math.max(0, last + FREE_CHEST_CD - Clock.now());
  }
  claimFree() {
    if (this.freeReadyIn() > 0) return false;
    try { localStorage.setItem(FREE_KEY, String(Clock.now())); } catch (e) { /* */ }
    return true;
  }

  /* ── Zafer sandığı: her N galibiyette bir açılır ── */
  get vicNeed() { return 5; }
  vicCount() {
    try { return Number(localStorage.getItem('kh_vicchest') || 0); } catch (e) { return 0; }
  }
  addVictory() {
    try { localStorage.setItem('kh_vicchest', String(this.vicCount() + 1)); } catch (e) { /* */ }
  }
  claimVictory() {
    try { localStorage.setItem('kh_vicchest', String(Math.max(0, this.vicCount() - this.vicNeed))); } catch (e) { /* */ }
  }

  /* ═══════════ ÖDÜL ZARI ═══════════ */

  rollRewards(type) {
    const g = this.game;
    const C = CHESTS[type];

    /* MİSTİK: tören TEK bir EFSANEVİ kartla yaşar — başka hiçbir şey.
       %45 kahraman, kalanı ekipman; hepsi 4. kademe.
       v44: kahraman kesimi eskiden min(3, tepe) idi → DESTAN (3) kahraman
       "efsane garanti" sandıktan %17 çıkıyordu (olasılık beyanı ölçtü).
       Artık yalnız 4. kademe; kadroda 4 yoksa ekipman dalına düşer. */
    if (C.pureLegendary) {
      const heroPool = Object.values(CHARACTERS).filter((c) => (c.rarity || 1) >= 4);
      if (heroPool.length && Math.random() < 0.45) {
        const fresh = heroPool.filter((c) => !(g.ownsChar(c.id) && g.charLevel(c.id) >= CHAR_MAX_LEVEL));
        const src = fresh.length ? fresh : heroPool;
        const ch = src[(Math.random() * src.length) | 0];
        if (ch) return [{ kind: 'char', id: ch.id, name: ch.name, rarity: ch.rarity || 4, char: ch,
                          cards: charCardDrop(ch.rarity || 4), isNew: !g.ownsChar(ch.id) }];
      }
      const pool = EQUIPMENT.filter((it) => rk(it.rarity) >= 4);
      const it = pool[(Math.random() * pool.length) | 0];
      return [{ kind: 'gear', id: it.id, name: it.name, icon: it.icon, rarity: it.rarity,
                desc: it.desc, mods: it.mods, cards: charCardDrop(it.rarity), isNew: !g.ownsGear(it.id) }];
    }

    const out = [];
    let rubies = C.rubies[0] + Math.round(Math.random() * (C.rubies[1] - C.rubies[0]));

    /* Nadirlik ağırlıkları: EFSANEVİ (4) artık havuzdan eşit şansla değil,
       belirgin düşük ağırlıkla çekilir. Aynı sandıkta İKİNCİ efsanevi
       neredeyse imkânsız (×0.05). */
    const GEAR_W = [0, 100, 46, 15, 2.2, 28];     // [5] = NADİR, YAYGIN ile EPİK arası
    const hasLegend = () => out.some(isLegend);
    const pickWeighted = (pool) => {
      const damp = hasLegend() ? 0.05 : 1;
      let tot = 0;
      const ws = pool.map((it) => { const w = (GEAR_W[it.rarity] || 10) * (rk(it.rarity) >= 4 ? damp : 1); tot += w; return w; });
      let r = Math.random() * tot;
      for (let i = 0; i < pool.length; i++) { r -= ws[i]; if (r <= 0) return pool[i]; }
      return pool[pool.length - 1];
    };

    /* ekipman: nadirlik havuzundan seç; sahip olunanlar KART (kopya) olarak
       düşer ve geliştirme için birikir — Clash Royale mantığı. kadimde biri
       yüksek nadirlik. */
    let gearN = C.gear[0] + Math.round(Math.random() * (C.gear[1] - C.gear[0]));
    if (gearN > 0 && Math.random() > C.gearChance) gearN = 0;
    for (let k = 0; k < gearN; k++) {
      /* kadim: biri yüksek nadirlik · ejderha: ilk eşya EFSANEVİ GARANTİ */
      const wantHigh = (type === 'kadim' || C.minTop) && k === 0;
      const minR = C.minTop || 3;
      const pool = EQUIPMENT.filter((it) =>
        rk(it.rarity) <= C.rarityMax &&
        (!wantHigh || rk(it.rarity) >= minR) &&
        !out.some((o) => o.id === it.id));
      if (pool.length === 0) { rubies += 25 + k * 20; continue; }
      const it = pickWeighted(pool);
      const cards = charCardDrop(it.rarity);
      out.push({ kind: 'gear', id: it.id, name: it.name, icon: it.icon,
                 rarity: it.rarity, desc: it.desc, mods: it.mods, cards,
                 isNew: !g.ownsGear(it.id) });
    }

    /* silah kilidi */
    if (Math.random() < C.weaponChance) {
      const locked = Object.keys(WEAPON_META).filter((id) =>
        WEAPON_META[id].unlock > 0 && !g.meta.weaponsOwned.includes(id));
      if (locked.length > 0) {
        locked.sort((a, b) => WEAPON_META[a].unlock - WEAPON_META[b].unlock);
        const id = locked[0];
        out.push({ kind: 'weapon', id, name: WEAPONS[id].name, icon: id,
                   rarity: 3, desc: WEAPONS[id].descNew });
      } else {
        rubies += 40;
      }
    }

    /* KAHRAMAN kart düşüşü: nadirliğe göre ağırlıklı KART (Clash Royale).
       İlk kart karakteri açar; sonraki kartlar seviye atlatmak için birikir. */
    if (C.charChance && Math.random() < C.charChance) {
      const ch = this.pickDropChar(type, hasLegend());
      if (ch) {
        const cards = charCardDrop(ch.rarity || 1);
        out.push({ kind: 'char', id: ch.id, name: ch.name,
                   rarity: ch.rarity || 1, char: ch, cards,
                   isNew: !g.ownsChar(ch.id) });
      } else {
        rubies += 60;   // tüm uygun kahramanlar zaten açık → altın telafisi
      }
    }

    /* NADİRLİK SIRASI: en nadir ödül HER ZAMAN en son gösterilir — gerilim
       artarak biter, tıpkı Clash Royale'de olduğu gibi. (Eşit nadirlikte
       toplanma sırası korunur — stabil sıralama.) */
    out.sort((a, b) => rkOf(a) - rkOf(b));

    /* GEM (gem) düşüşü — nadirliğe göre; en fazla 5 taş.
       Ödül sırası hep PARA ÖNCE (Clash Royale mantığı): altın > gem > gerisi. */
    if (C.stoneChance && Math.random() < C.stoneChance) {
      const [lo, hi] = C.stoneDrop;
      const amt = Math.min(5, lo + Math.round(Math.random() * (hi - lo)));
      if (amt > 0) out.unshift({ kind: 'stone', amount: amt, name: 'GEM',
                                  icon: 'stone', rarity: 0, desc: '' });
    }
    /* altın kartı her zaman ilk sırada */
    out.unshift({ kind: 'rubies', amount: rubies, name: 'ALTIN',
                  icon: 'ruby', rarity: 0, desc: '' });
    return out;
  }

  /* ═══════════ EFSANE GARANTİSİ ═══════════ */
  pityCount() { return Math.max(0, (this.game.meta && this.game.meta.pity) | 0); }
  pityLeft() { return Math.max(1, PITY_N - this.pityCount()); }
  /** Açılış sonucu sayaçtan geçer. rollRewards SAF kalır (olasılık
      simülasyonu onu okur); sayaç yalnız gerçek açılışta ilerler. */
  applyPity(rewards) {
    const g = this.game;
    if (rewards.some(isLegend)) { g.meta.pity = 0; g.saveMeta(); return rewards; }
    const n = this.pityCount() + 1;
    if (n < PITY_N) { g.meta.pity = n; g.saveMeta(); return rewards; }
    /* Garanti ödülü KANITLI efsane olmalı: mistik zarı atılır ve efsane
       olmayan sonuç kabul edilmez (koruma döngüsü; mistik artık hep 4 verir). */
    let leg = null;
    for (let i = 0; i < 8 && !leg; i++) leg = this.rollRewards('mistik').find(isLegend) || null;
    if (leg) { leg.pity = true; rewards.push(leg); rewards.sort((a, b) => (a.kind === 'rubies' || a.kind === 'stone' ? -1 : 0) - (b.kind === 'rubies' || b.kind === 'stone' ? -1 : 0) || rkOf(a) - rkOf(b)); }
    g.meta.pity = 0; g.saveMeta();
    return rewards;
  }

  /* ═══════════ OLASILIKLAR (Play "loot box" beyanı) ═══════════
     Formülden değil, OYUNUN KENDİ zarından ölçülür: rollRewards 4000 kez
     atılır (saf, hiçbir şey yazmaz). Böylece beyan edilen oran koddaki
     oranla ayrışamaz; oyuncunun koleksiyonu (sahip olunan / zirve
     seviyedeki kahraman ağırlığı) da hesaba girer. Sandık başına önbellek. */
  odds(type, N = 4000) {
    this._odds = this._odds || {};
    const hit = this._odds[type];
    if (hit && hit.rev === this._oddsRev) return hit;
    const tiers = [0, 0, 0, 0, 0];   // [0] = yalnız altın/gem      // en yüksek kademe: 0 yok · 1 yaygın · 2 nadir · 3 epik · 4 efsane
    let gem = 0, gemLo = 99, gemHi = 0, gold = 0, goldLo = 1e9, goldHi = 0, hero = 0, heroLeg = 0, weapon = 0;
    for (let i = 0; i < N; i++) {
      const rw = this.rollRewards(type);
      let top = 0;
      for (const r of rw) {
        if (r.kind === 'rubies') { gold += r.amount; goldLo = Math.min(goldLo, r.amount); goldHi = Math.max(goldHi, r.amount); continue; }
        if (r.kind === 'stone') { gem++; gemLo = Math.min(gemLo, r.amount); gemHi = Math.max(gemHi, r.amount); continue; }
        if (r.kind === 'char') { hero++; if (isLegend(r)) heroLeg++; }
        if (r.kind === 'weapon') weapon++;
        const t = rkOf(r);
        const b = t >= 4 ? 4 : t >= 3 ? 3 : t >= 2 ? 2 : t >= 1 ? 1 : 0;
        if (b > top) top = b;
      }
      tiers[top]++;
    }
    const p = (x) => x / N;
    const out = {
      rev: this._oddsRev, n: N,
      gold: goldHi ? [goldLo, goldHi] : null,
      gem: p(gem), gemRange: gem ? [gemLo, gemHi] : null,
      hero: p(hero), heroLeg: p(heroLeg), weapon: p(weapon),
      top: { legend: p(tiers[4]), epic: p(tiers[3]), rare: p(tiers[2]), common: p(tiers[1]), none: p(tiers[0]) },
    };
    this._odds[type] = out;
    return out;
  }
  /** Koleksiyon değişince beyan yeniden ölçülsün. */
  invalidateOdds() { this._oddsRev = (this._oddsRev || 0) + 1; }

  /** Sandık kademesine uygun bir kahramanı nadirlik ağırlığıyla seçer.
      Sahip olunanlar da düşer (seviye atlatmak için kart); zirve seviyedekiler nadiren.
      dampLegend: sandıkta zaten bir efsanevi varsa 4. kademe çok daha da nadirleşir. */
  pickDropChar(type, dampLegend) {
    const g = this.game;
    const maxR = CHESTS[type].charRarityMax || 1;
    const pool = [];
    let total = 0;
    for (const id in CHARACTERS) {
      const c = CHARACTERS[id];
      const r = c.rarity || 1;
      if (r > maxR) continue;
      let w = (CHAR_RARITIES[r] && CHAR_RARITIES[r].dropW) || 10;
      if (r >= 3) w *= dampLegend ? 0.06 : 0.55;   // efsanevi şansı kısıldı
      if (g.ownsChar(id) && g.charLevel(id) >= CHAR_MAX_LEVEL) w *= 0.12;
      pool.push([c, w]);
      total += w;
    }
    if (!pool.length) return null;
    let r = Math.random() * total;
    for (const [c, w] of pool) { r -= w; if (r <= 0) return c; }
    return pool[0][0];
  }

  /** Ödülleri cüzdana/envantere işler. */
  applyRewards(rewards) {
    const g = this.game;
    for (const r of rewards) {
      if (r.kind === 'rubies') g.addRubies(r.amount);
      else if (r.kind === 'stone') g.addStones(r.amount);
      else if (r.kind === 'gear') {
        g.addGearCards(r.id, r.cards || 1);
      } else if (r.kind === 'weapon' && !g.meta.weaponsOwned.includes(r.id)) {
        g.meta.weaponsOwned.push(r.id);
        if (g.meta.weaponsEquipped.length < g.meta.weaponSlots) g.meta.weaponsEquipped.push(r.id);
      } else if (r.kind === 'char') {
        g.addCharCards(r.id, r.cards || 1);
      }
    }
    g.saveMeta();
    this.invalidateOdds();
  }

  /* ═══════════ AÇILIŞ TÖRENİ ═══════════ */

  /**
   * Sandık açma sahnesi. slotIdx null ise satın alınan/ücretsiz sandık
   * (yuva harcamaz). Bittiğinde onDone çağrılır.
   */
  ceremony(type, slotIdx, onDone) {
    if (this.ceremonyActive) return;
    this.ceremonyActive = true;
    const g = this.game;
    const C = CHESTS[type];
    const rewards = this.applyPity(this.rollRewards(type));

    /* tören tantanası için tepe nadirliği bul (kahraman/silah/ekipman) */
    let peak = 0, peakIsChar = false, peakRaw = 0;
    for (const r of rewards) {
      const rr = rkOf(r);
      if (rr > peak) { peak = rr; peakIsChar = r.kind === 'char'; peakRaw = r.rarity || 0; }
    }
    const peakRar = peak > 0 ? (peakIsChar ? CHAR_RARITIES[peakRaw] : RARITIES[peakRaw]) : null;
    const emColor = (peak >= 3 && peakRar) ? peakRar.color : (C.accent || C.color);
    const emGlow = (peak >= 3 && peakRar) ? peakRar.glow : C.glow;

    const scr = document.getElementById('screen-chest');
    const cv = document.getElementById('chest-canvas');
    const hintEl = document.getElementById('chest-hint');
    const rays = document.getElementById('chest-rays');
    const beam = document.getElementById('chest-beam');
    const cardsEl = document.getElementById('chest-rewards');
    const flashEl = document.getElementById('chest-flash');
    const wordEl = document.getElementById('chest-rarity-word');

    /* Satın alma ONAYI ARTIK BURADA DEĞİL (v18): mağaza kartı ve GÜNÜN
       FIRSATI gem'i küçük bir pop-up'ta (`ui.openChestBuy`) harcar; tören
       yalnız AÇILIŞTIR. Bu yüzden `onConfirm`/`costLabel` seçenekleri ve
       VAZGEÇ düğmesi söküldü — ölü bayrak bırakılmadı. */
    /* İpucu yazısı ARTIK YOK: açma kararı "SANDIĞI AÇ" butonundadır
       (v17). Eski dokunuş sayacı (TAPS/tapsLeft) tamamen kaldırıldı —
       ölü bayrak bırakılmaz. */
    hintEl.textContent = '';
    hintEl.classList.add('hidden');
    rays.classList.remove('on');
    rays.style.setProperty('--ray', emGlow);
    if (beam) { beam.classList.remove('fire'); beam.style.setProperty('--bc', emColor); }
    if (flashEl) { flashEl.className = 'chest-flash'; flashEl.style.setProperty('--fl', emColor); }
    if (wordEl) { wordEl.className = 'chest-rarity-word'; wordEl.textContent = ''; }
    cardsEl.innerHTML = '';
    scr.classList.remove('hidden');
    scr.classList.remove('revealed');

    const ctx = cv.getContext('2d');
    const DPR = Math.min(window.devicePixelRatio || 1, 2);
    /* daha büyük sahne: sandık ekranın tam ortasında, kameraya doğru
       BÜYÜYEREK süzülür — küçük bir kutuda değil, sahneye hükmeder. */
    const CW = 340, CH = 320;
    cv.width = CW * DPR; cv.height = CH * DPR;
    cv.style.width = CW + 'px'; cv.style.height = CH + 'px';
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);

    /* 3D sandık sahnesi (gövde + kapak + hazine ışığı). 2D katman (cv/ctx)
       artık yalnız partikül + şok halkalarını çizer; sandığın kendisi WebGL'de.
       WebGL kurulamazsa (nadir) 2D vektör sandığa (drawChest) düşülür. */
    if (this.game.ui && this.game.ui._ciReturnCanvas) this.game.ui._ciReturnCanvas();   // v53 B3: tek bağlam
    const cv3 = document.getElementById('chest-canvas-3d');
    let scene3d = this.scene3d;
    if (cv3 && !scene3d) {
      try { scene3d = this.scene3d = new ChestScene3D(cv3); }
      catch (e) { scene3d = null; console.warn('3D sandık sahnesi kurulamadı, 2D yedeğe düşüldü.', e); }
    }
    if (scene3d && cv3) {
      /* 3D sahne TÜM sahne alanını kaplar — küçük kare canvas sınırının
         parıltıları kesmesi "karesel alan" hissi veriyordu */
      const stage = cv.parentElement;
      const sw = Math.max(stage.clientWidth, CW), sh = Math.max(stage.clientHeight, CH);
      cv3.style.width = sw + 'px'; cv3.style.height = sh + 'px';
      cv3.style.display = 'block';
      scene3d.setSize(sw, sh);
      scene3d.setChest(C);
    }

    /* tören durumu */
    const S = {
      phase: 'drop',      // drop → idle → shake → burst → done
      t: 0, openT: 0, shakeT: 0, dropY: -560, approach: 0, landT: 0, landed: false, hopT: 0,
      miniT: 0,           // dokunuş sarsıntısı
      seam: 0,            // kapak aralığından sızan ışık (0-1)
      punch: 0,           // burst ölçek zımbası
      rot: 0,             // sallanma sırasında gövde eğimi (radyan)
      parts: [],          // tören partikülleri
      rings: [],          // şok halkaları
      revealed: 0,
      running: true,
    };

    const spawnParts = (n, power, up) => {
      for (let i = 0; i < n; i++) {
        const a = up ? (-Math.PI / 2 + (Math.random() - 0.5) * 1.6) : Math.random() * 6.283;
        const v = power * (0.4 + Math.random() * 0.8);
        S.parts.push({
          x: CW / 2 + (Math.random() - 0.5) * 60, y: CH * 0.62,
          vx: Math.cos(a) * v, vy: Math.sin(a) * v,
          life: 0.6 + Math.random() * 0.7, max: 1.3,
          size: 2 + Math.random() * 3.5,
          spin: (Math.random() - 0.5) * 10, rot: Math.random() * 6.283,
          color: Math.random() < 0.5 ? (C.accent || C.color) : (Math.random() < 0.5 ? '#ffe9a8' : C.metal),
        });
      }
    };
    const bounceOut = (x) => {
      const n1 = 7.5625, d1 = 2.75;
      if (x < 1 / d1) return n1 * x * x;
      if (x < 2 / d1) return n1 * (x -= 1.5 / d1) * x + 0.75;
      if (x < 2.5 / d1) return n1 * (x -= 2.25 / d1) * x + 0.9375;
      return n1 * (x -= 2.625 / d1) * x + 0.984375;
    };
    const ring = () => {};   // şok halkaları KALDIRILDI — kullanıcı: "beyaz/kara çizgiler olmasın, sadece sandık animasyonu"

    const drawChest = (cx, cy, w, h, openT, sx, rot) => {
      const lidH = h * 0.42;
      ctx.save();
      ctx.translate(cx + sx, cy);
      if (rot) ctx.rotate(rot);

      /* yer gölgesi */
      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      ctx.beginPath();
      ctx.ellipse(0, h * 0.56, w * 0.62, h * 0.13, 0, 0, 6.283);
      ctx.fill();

      /* iç ışık (kapak açılırken veya derz sızıntısı) */
      const leak = Math.max(openT, S.seam * 0.45);
      if (leak > 0.05) {
        const gl = ctx.createRadialGradient(0, -h * 0.1, 4, 0, -h * 0.1, w * 0.9);
        gl.addColorStop(0, 'rgba(255,240,190,' + 0.85 * leak + ')');
        gl.addColorStop(1, 'rgba(255,240,190,0)');
        ctx.fillStyle = gl;
        ctx.fillRect(-w, -h * 1.4, w * 2, h * 2);
      }

      const bw = w, bh = h * 0.58;

      /* gövde */
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#0a0c12';
      ctx.fillStyle = C.color;
      ctx.beginPath();
      ctx.roundRect(-bw / 2, -bh * 0.1, bw, bh, 7);
      ctx.fill(); ctx.stroke();
      /* gövde tahta/doku çizgileri */
      ctx.strokeStyle = C.rim;
      ctx.lineWidth = 2;
      for (let i = 1; i < 3; i++) {
        const yy = -bh * 0.1 + (bh / 3) * i;
        ctx.beginPath(); ctx.moveTo(-bw / 2 + 5, yy); ctx.lineTo(bw / 2 - 5, yy); ctx.stroke();
      }
      /* metal bantlar */
      ctx.fillStyle = C.metal;
      ctx.strokeStyle = '#0a0c12';
      ctx.lineWidth = 2;
      for (const bx of [-bw * 0.3, bw * 0.3]) {
        ctx.beginPath();
        ctx.roundRect(bx - 7, -bh * 0.12, 14, bh + 6, 3);
        ctx.fill(); ctx.stroke();
      }

      /* kapak (arka menteşeden döner) */
      ctx.save();
      ctx.translate(0, -bh * 0.1);
      ctx.rotate(-openT * 1.9);
      ctx.fillStyle = C.color;
      ctx.strokeStyle = '#0a0c12';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-bw / 2, 0);
      ctx.lineTo(-bw / 2, -lidH * 0.45);
      ctx.quadraticCurveTo(-bw / 2, -lidH, -bw * 0.2, -lidH);
      ctx.lineTo(bw * 0.2, -lidH);
      ctx.quadraticCurveTo(bw / 2, -lidH, bw / 2, -lidH * 0.45);
      ctx.lineTo(bw / 2, 0);
      ctx.closePath();
      ctx.fill(); ctx.stroke();
      /* kapak bantları */
      ctx.fillStyle = C.metal;
      ctx.lineWidth = 2;
      for (const bx of [-bw * 0.3, bw * 0.3]) {
        ctx.beginPath();
        ctx.roundRect(bx - 7, -lidH + 3, 14, lidH - 4, 3);
        ctx.fill(); ctx.stroke();
      }
      /* kapak kenar parlaması */
      ctx.strokeStyle = 'rgba(255,255,255,0.22)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-bw / 2 + 6, -lidH * 0.5);
      ctx.quadraticCurveTo(-bw / 2 + 6, -lidH + 6, -bw * 0.2, -lidH + 6);
      ctx.stroke();
      ctx.restore();

      /* derz ışığı: dokundukça kapak aralığı parlar */
      if (S.seam > 0.02 && openT < 0.2) {
        ctx.save();
        ctx.shadowColor = '#ffe9a8'; ctx.shadowBlur = 14 * S.seam;
        ctx.strokeStyle = 'rgba(255,235,175,' + (0.5 + 0.5 * S.seam) + ')';
        ctx.lineWidth = 1.6 + 2.4 * S.seam;
        ctx.beginPath();
        ctx.moveTo(-bw / 2 + 6, -bh * 0.1);
        ctx.lineTo(bw / 2 - 6, -bh * 0.1);
        ctx.stroke();
        ctx.restore();
      }

      /* kilit plakası + tip hikayesi: yarasa / yakut / rün / kalp */
      if (openT < 0.35) {
        ctx.globalAlpha = 1 - openT / 0.35;
        ctx.fillStyle = C.metal;
        ctx.strokeStyle = '#0a0c12';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.roundRect(-15, -bh * 0.16, 30, 34, 5);
        ctx.fill(); ctx.stroke();
        const lx = 0, ly = -bh * 0.16 + 17;
        const pulse = 0.55 + Math.sin(S.t * 5) * 0.25;
        if (C.lock === 'plate') {
          /* demir anahtar deliği */
          ctx.fillStyle = '#171a22';
          ctx.beginPath();
          ctx.arc(lx, ly - 2.4, 2.7, 0, 6.283);
          ctx.fill();
          ctx.beginPath();
          ctx.moveTo(lx, ly - 1.4); ctx.lineTo(lx + 2.1, ly + 7); ctx.lineTo(lx - 2.1, ly + 7);
          ctx.closePath();
          ctx.fill();
        } else {
          const glowCol = C.lock === 'shield' ? '#ff4a5e' : (C.lock === 'crystal' ? '#d36bff' : (C.lock === 'prism' ? '#52f0cc' : (C.lock === 'eye' ? '#ff5ee8' : '#8fdcff')));
          ctx.fillStyle = glowCol;
          ctx.globalAlpha *= pulse;
          ctx.beginPath();
          ctx.moveTo(lx, ly - 9);
          ctx.lineTo(lx + 7, ly);
          ctx.lineTo(lx, ly + 9);
          ctx.lineTo(lx - 7, ly);
          ctx.closePath();
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      }
      ctx.restore();
    };

    let last = performance.now();
    /* rAF gizli sekmede/iframe'de hiç ateşlenmez — tören donmasın diye
       görünürlük durumuna göre setTimeout yedeğine düşen zamanlayıcı */
    const sched = () => {
      if (document.hidden) setTimeout(() => loop(performance.now()), 33);
      else requestAnimationFrame(loop);
    };
    const loop = (now) => {
      if (!S.running) return;
      sched();
      let dt = (now - last) / 1000;
      last = now;
      /* gizli belgede zamanlayıcılar ~1sn'ye kısılır: sim gerçek zamanı
         yakalasın diye kelepçe gevşer (görünürde 0.05 sabit kalır) */
      if (dt > 0.05) dt = document.hidden ? Math.min(dt, 1) : 0.05;
      S.t += dt;

      ctx.clearRect(0, 0, CW, CH);

      /* faz makinesi */
      let sx = 0, cy = CH * 0.52, scale = 1, sqx = 1, sqy = 1, rot = 0;
      if (S.phase === 'drop') {
        /* kameraya doğru büyüyerek düşer, yere çarpıp Z I P L A R (bounceOut) */
        S.approach = Math.min(1, S.approach + dt * 0.62);
        const ease = bounceOut(S.approach);
        S.dropY = -560 * (1 - ease);
        cy += S.dropY;
        scale = 0.4 + 0.6 * Math.min(1, S.approach * 2.2);
        rot = Math.sin(S.approach * 7) * 0.05 * Math.max(0, 1 - S.approach * 2.2);
        if (!S.landed && S.approach >= 0.3636) {
          /* ilk yere çarpma: toz + sarsıntı (zıplamalar devam eder) */
          S.landed = true;
          S.landT = 0.24;
          spawnParts(26, 210, false);
          scr.classList.add('land');
          setTimeout(() => scr.classList.remove('land'), 260);
          g.audio.play('chestthud');
        }
        if (S.landT > 0) {
          S.landT = Math.max(0, S.landT - dt);
          const k = S.landT / 0.24;
          sqx = 1 + k * 0.16; sqy = 1 - k * 0.16;
        }
        if (S.approach >= 1) {
          S.phase = 'idle';
          S.landT = 0.16;
          /* İNİŞ ANI DAVETİ GETİRİR (v19): buton söküldü, yerine tek
             satır ipucu. İniş bitmeden gösterilirse oyuncu zıplayışı —
             yani sahnenin tüm sebebini — izlemeden dokunur. */
          hintEl.textContent = 'AÇMAK İÇİN EKRANA DOKUN';
          hintEl.classList.remove('hidden');
          spawnParts(10, 130, false);
        }
      } else if (S.phase === 'idle') {
        if (S.landT > 0) {
          S.landT = Math.max(0, S.landT - dt);
          const k = S.landT / 0.24;
          sqx = 1 + k * 0.16; sqy = 1 - k * 0.16;
        }
        scale = 1 + Math.sin(S.t * 2.4) * 0.012;
        if (S.miniT > 0) {
          S.miniT -= dt;
          sx = Math.sin(S.t * 55) * 5 * Math.max(0, S.miniT / 0.3);
        }
        /* bekleme közleri — sandık etrafında süzülen kıvılcımlar */
        if (Math.random() < dt * 6) {
          S.parts.push({
            x: CW / 2 + (Math.random() - 0.5) * 130, y: CH * 0.68,
            vx: (Math.random() - 0.5) * 16, vy: -26 - Math.random() * 22,
            life: 1 + Math.random() * 0.8, max: 1.8,
            size: 1.5 + Math.random() * 2, spin: 0, rot: 0,
            color: Math.random() < 0.6 ? C.color : '#ffe9a8',
          });
        }
      } else if (S.phase === 'shake') {
        S.shakeT -= dt;
        /* CR'deki gibi tırmanan gerilim: sarsıntı ilerledikçe genlik büyür,
           yalnızca yatay değil hafif dönüşle de sallanır — arka plan da
           kararıp sandığı spot gibi öne çıkarır (bkz. .chest-scene.tension). */
        const prog = 1 - Math.max(0, S.shakeT) / 0.85;
        const amp = 4 + prog * 8;
        sx = Math.sin(S.t * 44) * amp;
        rot = Math.sin(S.t * 44 + 0.6) * 0.04 * (0.4 + prog);
        if (Math.random() < dt * (14 + prog * 16)) spawnParts(2, 90, true);
        if (S.shakeT <= 0) {
          S.phase = 'burst';
          S.punch = 1;
          S.hopT = 0.55;
          scr.classList.remove('tension');
          scr.classList.add('burst-flare');
          setTimeout(() => scr.classList.remove('burst-flare'), 500);
          const boost = 1 + peak * 0.35;
          spawnParts(Math.round(52 * boost), 360, true);
          spawnParts(Math.round(24 * boost), 210, false);
          ring(120, 0.55, '#ffe9a8', 5);
          ring(90, 0.7, emColor, 3);
          rays.classList.add('on');
          scr.classList.add('punch');
          if (beam) { beam.classList.remove('fire'); void beam.offsetWidth; beam.classList.add('fire'); }
          setTimeout(() => scr.classList.remove('punch'), 450);
          g.audio.play('chestburst');
          /* NOT: nadirlik-özel flaş/söz/fanfar artık BURADA değil, ödül
             teker teker gösterilirken (revealRewards → show()) o kartın
             TAM ANINDA tetiklenir — oyuncu neyin nadir olduğunu görürken
             hisseder, genel patlama anında değil. Burada yalnız tepe
             nadirliğe göre büyütülmüş genel ışık/parçacık şöleni kalır. */
          if (peak >= 3) {
            ring(220, 0.8, emColor, 7);
            ring(300, 1.0, '#ffffff', 4);
            spawnParts(Math.round(60 * boost), 480, true);
          }
          setTimeout(() => this.revealRewards(cardsEl, rewards, finish, C, peak), 650);
        }
      } else if (S.phase === 'burst') {
        S.openT = Math.min(1, S.openT + dt * 1.7);
        S.punch = Math.max(0, S.punch - dt * 2.2);
        if (S.hopT > 0) S.hopT = Math.max(0, S.hopT - dt);
        scale = 1 + S.punch * 0.09;
      }

      if (scene3d) {
        /* sandık 3D katmanda; 2D katman (üstteki clearRect ile temizlendi)
           yalnız halka + partikül taşır */
        const hopY = S.hopT > 0 ? Math.sin((1 - S.hopT / 0.55) * Math.PI) * 9 : 0;
        const posY3 = Math.max(0, -S.dropY) * (150 / 560) + hopY;
        scene3d.renderFrame({
          posY: posY3,
          scaleX: scale * sqx, scaleY: scale * sqy, scaleZ: scale,
          shakeX: sx * 0.34, rotZ: rot,
          open: S.openT, seam: S.seam, dt,
        });
      } else {
        drawChest(CW / 2, cy, 172 * scale * sqx, 138 * scale * sqy, S.openT, sx, rot);
      }

      /* şok halkaları */
      for (let i = S.rings.length - 1; i >= 0; i--) {
        const r = S.rings[i];
        r.life -= dt;
        if (r.life <= 0) { S.rings.splice(i, 1); continue; }
        const k = 1 - r.life / r.maxLife;
        ctx.globalAlpha = (1 - k) * 0.9;
        ctx.strokeStyle = r.color;
        ctx.lineWidth = r.lw * (1 - k) + 1;
        ctx.beginPath();
        ctx.arc(CW / 2, CH * 0.5, r.max * k + 4, 0, 6.283);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;

      /* partiküller */
      for (let i = S.parts.length - 1; i >= 0; i--) {
        const p = S.parts[i];
        p.life -= dt;
        if (p.life <= 0) { S.parts.splice(i, 1); continue; }
        p.vy += 420 * dt;
        p.x += p.vx * dt; p.y += p.vy * dt;
        p.rot += (p.spin || 0) * dt;
        ctx.globalAlpha = Math.min(1, p.life / 0.4);
        ctx.fillStyle = p.color;
        if (p.spin) {
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rot);
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
          ctx.restore();
        } else {
          ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
        }
      }
      ctx.globalAlpha = 1;
    };
    sched();

    /* dokun → (nadirse birkaç kez) salla → patlat — NEREYE dokunulursa
       dokunulsun (sahne genelinde) çalışır, yalnızca sandığın üstüne
       basmak gerekmez. */
    /* ── AÇILIŞ: EKRANA DOKUN (v19, kullanıcı isteği) ──
       Buton söküldü: sandık iner, durur ve NEREYE dokunulursa dokunulsun
       açılır. v17'nin butonu "yanlış dokunuşla satın alma" sorununu
       çözmek için gelmişti; o iş artık onay pop-up'ının (v18) ve töreni
       başlatan tek bir kararın işi — töreni gören oyuncu sandığı çoktan
       almıştır, yani onu bir düğmeye daha bastırmak boş bir adımdır. */
    let opening = false;
    const startOpen = () => {
      if (opening || S.phase !== 'idle') return;
      opening = true;
      hintEl.classList.add('hidden');
      S.phase = 'shake';
      S.shakeT = 0.72;
      scr.classList.add('tension');
      g.audio.play('chestlatch');
      if (g.haptics && g.haptics.fire) g.haptics.fire('crit');
    };
    const onTap = () => { startOpen(); };
    scr.addEventListener('pointerdown', onTap);

    /* bitir */
    const finish = () => {
      scr.removeEventListener('pointerdown', onTap);
      S.running = false;
      const cv3b = document.getElementById('chest-canvas-3d');
      if (cv3b) cv3b.style.display = 'none';
      scr.classList.remove('tension', 'burst-flare');
      this.applyRewards(rewards);
      if (slotIdx != null) { this.slots[slotIdx] = null; this.save(); }
      scr.classList.add('hidden');
      this.ceremonyActive = false;
      g.audio.play('collect');
      if (onDone) onDone();
    };
  }

  /** Ödülleri TEK TEK gösterir: büyük kart + sayaç, dokun → sonraki.
      Nadirliğe göre "dram kademesi" belirler — sıradan bir altın kartı
      anında geçilebilir, ama efsane bir kahraman/eşya ekranı birkaç
      saniye kaplar: ışık, konfeti, gökkuşağı yazı, uzun fanfar. */
  revealRewards(cardsEl, rewards, onFinish, C, peak) {
    const ui = this.game.ui;
    const g = this.game;
    const scr = document.getElementById('screen-chest');
    const flashEl = document.getElementById('chest-flash');
    const wordEl = document.getElementById('chest-rarity-word');
    const raysEl = document.getElementById('chest-rays');
    if (scr) scr.classList.add('revealed');
    /* kutu k\u00fc\u00e7\u00fcl\u00fcnce 3D sahneyi YEN\u0130 boyuta g\u00f6re yeniden \u00f6l\u00e7ekle \u2014 yoksa eski
       (b\u00fcy\u00fck) canvas boyutu yeni k\u00fc\u00e7\u00fck kutuya s\u0131\u011fmay\u0131p ta\u015f\u0131yor/kesiliyordu. */
    const cv3r = document.getElementById('chest-canvas-3d');
    if (this.scene3d && cv3r) {
      requestAnimationFrame(() => {
        const stage = cv3r.parentElement;
        const sw = stage.clientWidth, sh = stage.clientHeight;
        if (sw > 0 && sh > 0) {
          cv3r.style.width = sw + 'px'; cv3r.style.height = sh + 'px';
          this.scene3d.setSize(sw, sh);
        }
      });
    }
    cardsEl.innerHTML =
      '<div class="reveal-stage" id="reveal-stage"></div>' +
      '<p class="reveal-summary-title hidden" id="reveal-summary-title">KAZANDIKLARIN</p>' +
      '<div class="reveal-tray" id="reveal-tray"></div>' +
      '<p class="reveal-hint" id="reveal-hint">DEVAM İÇİN DOKUN</p>';
    const stageEl = cardsEl.querySelector('#reveal-stage');
    const trayEl = cardsEl.querySelector('#reveal-tray');
    const hint2 = cardsEl.querySelector('#reveal-hint');
    const summaryTitle = cardsEl.querySelector('#reveal-summary-title');
    let idx = 0, busy = false, awaitingFinish = false, skipSpin = null;

    const countUp = (el, to, ms) => {
      if (!el) return;
      const t0 = performance.now();
      const tick = (now) => {
        const k = Math.min(1, (now - t0) / ms);
        const e = 1 - Math.pow(1 - k, 3);
        el.textContent = '+' + Math.round(to * e);
        if (k < 1 && el.isConnected) { if (document.hidden) setTimeout(() => tick(performance.now()), 33); else requestAnimationFrame(tick); }
      };
      requestAnimationFrame(tick);
    };

    /** dram kademesi: yalnız EFSANE (3) zorla bekletir — geri kalan her
        şey anında geçilebilir, oyuncu istediği kadar hızlı dokunabilir. */
    const dramaTierOf = (r) => {
      const isChar = r.kind === 'char';
      if (r.kind === 'rubies' || r.kind === 'stone') return 0;
      const rar = r.rarity || 0;
      if (rar >= 4) return 3;
      if (rar === 3) return 2;
      if (rar === 2) return isChar ? 2 : 1;
      return isChar ? 1 : 0;
    };
    const LEGENDARY_HOLD_MS = 3700; /* yalnız efsane (drama 3) bu kadar bekletir */

    /** Konfeti: yalnız efsane/destan anında — renkli küçük parçalar
        yukarıdan düşer, döner, solar. Tamamen DOM/CSS, tören bitince
        stageEl.innerHTML sıfırlanınca kendiliğinden temizlenir. */
    const spawnConfetti = (container, n, palette) => {
      const wrap = document.createElement('div');
      wrap.className = 'confetti-wrap';
      for (let i = 0; i < n; i++) {
        const p = document.createElement('i');
        const col = palette[(Math.random() * palette.length) | 0];
        const x = 6 + Math.random() * 88;
        const delay = Math.random() * 0.5;
        const dur = 1.8 + Math.random() * 1.4;
        const rot = (Math.random() * 720 - 360).toFixed(0);
        const drift = (Math.random() * 60 - 30).toFixed(0);
        p.style.cssText =
          'left:' + x + '%; background:' + col + '; animation-delay:' + delay + 's; ' +
          'animation-duration:' + dur + 's; --rot:' + rot + 'deg; --drift:' + drift + 'px;';
        wrap.appendChild(p);
      }
      container.appendChild(wrap);
    };

    const show = () => {
      const r = rewards[idx];
      const isChar = r.kind === 'char';
      const isCurrency = r.kind === 'rubies' || r.kind === 'stone';
      const rar = isCurrency ? null : (isChar ? CHAR_RARITIES[r.rarity] : RARITIES[r.rarity]);
      const color = r.kind === 'rubies' ? '#ff3b4e' : (r.kind === 'stone' ? '#9d5cff' : rar.color);
      const drama = dramaTierOf(r);
      let glyph, big = '';
      if (r.kind === 'rubies') {
        glyph = '<span class="ruby big-ruby"></span>';
        big = '<b class="rw-count" id="rw-count">+0</b>';
      } else if (r.kind === 'stone') {
        glyph = '<span class="stone big-stone"></span>';
        big = '<b class="rw-count" id="rw-count">+0</b>';
      } else if (isChar) {
        /* TÖRENDE DE KART PORTRESİ (pfp3): aynı kahraman kartta, avatarda ve
           törende AYNI yüzle çıkar. Portresi olmayan id vektör canvas'a düşer. */
        /* v48: vektör çizim (ilk dönemin basit figürleri) yalnız illüstrasyonu OLMAYAN id'de. */
        const pa = ui.cardPortrait(r.id) || ui.heroArtUrl(r.id);
        glyph = pa
          ? '<img class="rw-portrait is-art" alt="" src="' + pa + '">'
          : '<canvas class="rw-portrait" width="110" height="110" data-char="' + r.id + '"></canvas>';
        big = r.isNew ? '<b class="rw-count new">YENİ!</b>' : '<b class="rw-count" id="rw-count">+0</b>';
      } else {
        glyph = '<span class="rw-gicon">' + ui.gearArt(r.icon) + '</span>';
        if (r.kind === 'gear') big = r.isNew ? '<b class="rw-count new">YENİ!</b>' : '<b class="rw-count" id="rw-count">+0</b>';
      }
      const tag = r.kind === 'rubies' ? 'ALTIN'
        : (r.kind === 'stone' ? 'GEM'
        : (isChar ? rar.name + (r.isNew ? ' KAHRAMAN' : ' KART')
        : (r.kind === 'weapon' ? 'YENİ SİLAH' : rar.name + (r.isNew ? ' EKİPMAN' : ' KART'))));
      const drCls = drama === 3 ? ' legendary' : (drama === 2 ? ' epic' : (drama === 1 ? ' rare' : ''));
      /* CR tarzı: kart sandıktan (aşağıdan) yükselir, 360° döne döne gelir,
         yavaşlayarak durur ve yüzü ancak o zaman okunur. Dönüş süresi
         nadirlikle büyür; dönüş bitmeden geçilemez. */
      const spinCls = drama >= 3 ? ' spin-leg' : (drama === 2 ? ' spin-epic' : ' spin-base');
      stageEl.innerHTML =
        '<div class="cr-rise">' +
        '<div class="cr-spinner' + spinCls + '">' +
        '<div class="cr-card' + drCls + '" style="--rc:' + color + '">' +
          '<div class="cr-card-face">' +
            '<span class="rw-burst"></span>' +
            '<i class="cr-frame"></i>' +
            (drama >= 2 ? '<i class="cr-gem g1"></i><i class="cr-gem g2"></i><i class="cr-gem g3"></i><i class="cr-gem g4"></i>' : '') +
            '<span class="cr-card-tag" style="color:' + color + '">' + tag + '</span>' +
            '<div class="rw-glyph' + ((r.kind === 'gear' || r.kind === 'weapon') ? ' art' : '') + '">' + glyph + '</div>' + big +
            '<div class="cr-card-foot"><span class="rw-name">' + r.name + '</span></div>' +
          '</div>' +
          '<div class="cr-card-back" style="--rc:' + color + '"><i></i></div>' +
        '</div>' +
        '</div>' +
        '</div>';
      const pc = stageEl.querySelector('canvas.rw-portrait');
      if (pc) {
        const def = CHARACTERS[pc.getAttribute('data-char')];
        if (def) drawCharPortrait(pc.getContext('2d'), 55, 52, 38, def);
      }
      const cnt = stageEl.querySelector('#rw-count');
      if (r.kind === 'rubies' || r.kind === 'stone') countUp(cnt, r.amount, 620);
      else if (isChar && !r.isNew) countUp(cnt, r.cards || 1, 480);
      else if (r.kind === 'gear' && !r.isNew) countUp(cnt, r.cards || 1, 480);

      /* BÜYÜK AN: nadir/destansı/efsane bu kartın TAM ÜSTÜNDE patlar —
         ekran flaşı, dönen ışık huzmeleri, nadirlik sözü, (efsanede)
         gökkuşağı konfeti. Sıradan ödüller bunları hiç görmez ve — EFSANE
         DIŞINDA — oyuncuyu asla bekletmez, istediği kadar hızlı geçebilir. */
      if (drama >= 2 && raysEl) {
        raysEl.classList.remove('on'); void raysEl.offsetWidth;
        raysEl.style.setProperty('--ray', rar.glow || color);
        raysEl.classList.add('on');
        scr.classList.add('reveal-spot');
      } else {
        if (raysEl) raysEl.classList.remove('on');
        scr.classList.remove('reveal-spot');
      }
      if (drama >= 1 && flashEl) {
        flashEl.className = 'chest-flash';
        flashEl.style.setProperty('--fl', color);
        void flashEl.offsetWidth;
        flashEl.classList.add(drama >= 3 ? 'legendary' : drama === 2 ? 'epic' : 'rare');
      } else if (flashEl) {
        flashEl.className = 'chest-flash';
      }
      if (drama >= 2 && wordEl) {
        wordEl.className = 'chest-rarity-word';
        wordEl.textContent = drama >= 3 ? 'EFSANEVİ!' : rar.name + '!';
        wordEl.style.color = color;
        void wordEl.offsetWidth;
        wordEl.classList.add('show');
        if (drama >= 3) wordEl.classList.add('rainbow');
      } else if (wordEl) {
        wordEl.className = 'chest-rarity-word';
      }
      if (drama >= 3) {
        spawnConfetti(stageEl, 46, ['#ff5a2c', '#ff9a5c', '#cfd6e2', '#9b6cff', '#8b93a6', '#ffffff']);
      }

      if (drama >= 3) g.audio.play('legendary');
      else if (drama === 2) g.audio.play('epicpull');
      else if (drama === 1) g.audio.play('chestrare');
      else g.audio.play('reveal');

      /* Dönüş kilidi: efsane sonuna kadar bekletir; diğerlerinde ilk
         dokunuş animasyonu iptal edip kartı anında gösterir, ikinci
         dokunuş sonraki karta geçer. */
      const spinMs = drama >= 3 ? 3000 : (drama === 2 ? 1700 : 900);
      const holdMs = drama >= 3 ? LEGENDARY_HOLD_MS : spinMs;
      busy = true;
      skipSpin = null;
      if (hint2) hint2.classList.add('hidden');
      const finishSpin = () => {
        busy = false; skipSpin = null;
        if (hint2) hint2.classList.remove('hidden');
        if (drama >= 3) {
          if (raysEl) raysEl.classList.remove('on');
          scr.classList.remove('reveal-spot');
        }
      };
      const spinTimer = setTimeout(finishSpin, holdMs);
      if (drama < 3) {
        const spinnerEl = stageEl.querySelector('.cr-spinner');
        const riseEl = stageEl.querySelector('.cr-rise');
        skipSpin = () => {
          clearTimeout(spinTimer);
          if (riseEl) riseEl.style.animation = 'none';
          if (spinnerEl) { spinnerEl.style.animation = 'none'; spinnerEl.style.transform = 'none'; }
          finishSpin();
        };
      }
    };

    /* Özet tepsisi: her kazanım nadirlik çerçeveli MİNİ KART olarak dizilir —
       kahramanlar portreli, eşyalar glifli, para birimleri gem/altın ikonlu. */
    const toTray = () => {
      const r = rewards[idx];
      const isChar = r.kind === 'char';
      const isCurrency = r.kind === 'rubies' || r.kind === 'stone';
      const rar = isCurrency ? null : (isChar ? CHAR_RARITIES[r.rarity] : RARITIES[r.rarity]);
      const color = r.kind === 'rubies' ? '#ff3b4e' : (r.kind === 'stone' ? '#9d5cff' : rar.color);
      const tag = r.kind === 'rubies' ? 'ALTIN'
        : (r.kind === 'stone' ? 'GEM'
        : (isChar ? rar.name + (r.isNew ? ' KAHRAMAN' : '') : rar.name));
      let ic;
      if (r.kind === 'rubies') ic = '<span class="ruby"></span>';
      else if (r.kind === 'stone') ic = '<span class="stone"></span>';
      else if (isChar) {
        const pa = ui.cardPortrait(r.id) || ui.heroArtUrl(r.id);
        ic = pa
          ? '<img class="tc-portrait is-art" alt="" src="' + pa + '">'
          : '<canvas class="tc-portrait" width="72" height="72" data-char="' + r.id + '"></canvas>';
      }
      else ic = '<span class="tc-art">' + ui.gearArt(r.icon) + '</span>';
      const label = isCurrency ? (r.kind === 'rubies' ? 'Altın' : 'Gem') : r.name;
      const cnt = isCurrency ? '+' + r.amount : (r.isNew ? 'YENİ!' : '×' + (r.cards || 1));
      const hi = (!isCurrency && (r.rarity || 0) >= 3) ? ' hi' : '';
      trayEl.insertAdjacentHTML('beforeend',
        '<div class="tray-card' + hi + '" style="--rc:' + color + '">' +
          '<span class="tc-tag" style="color:' + color + '">' + tag + '</span>' +
          '<div class="tray-card-glyph">' + ic + '</div>' +
          '<span class="tray-card-label">' + label + '</span>' +
          '<b class="tc-count' + (r.isNew ? ' new' : '') + '">' + cnt + '</b>' +
        '</div>');
      const pc = trayEl.lastElementChild.querySelector('canvas.tc-portrait');
      if (pc) {
        const def = CHARACTERS[pc.getAttribute('data-char')];
        if (def) drawCharPortrait(pc.getContext('2d'), 36, 34, 25, def);
      }
    };

    const advance = () => {
      if (busy) {
        if (skipSpin) skipSpin();   // mavi/mor kartlar: ilk tık animasyonu atlar
        return;
      }
      if (awaitingFinish) {
        scr.removeEventListener('pointerdown', advance);
        onFinish();
        return;
      }
      toTray();
      idx++;
      if (idx >= rewards.length) {
        stageEl.innerHTML = '';
        if (summaryTitle) summaryTitle.classList.remove('hidden');
        if (trayEl) trayEl.classList.add('final');
        if (hint2) { hint2.textContent = 'İLERLEMEK İÇİN DOKUN'; hint2.classList.remove('hidden'); }
        awaitingFinish = true;
        /* Özet ekranında fanfar YOK: efsanevi çıktıysa kendi zafer melodisi
           zaten kart açılırken çaldı; her töreni aynı sesle bitirmek o anın
           değerini düşürüyordu. */
        return;
      }
      show();
    };
    scr.addEventListener('pointerdown', advance);
    show();
  }
}
