/* ═══════════════════════════════════════════════════════════
   dailies.js — GÜNLÜK GİRİŞ + HAFTALIK GÖREVLER

   NEDEN AYRI DOSYA: iki sistem de TAKVİMLE çalışır (yerel gün, ISO
   hafta) ve takvim mantığı savaş kodunun içine gömülürse hiç test
   edilemez. Burada saf: hiçbir DOM'a, hiçbir sese dokunmaz; yalnız
   `meta.quests` dilimini okur/yazar ve ödül tanımını döndürür. Ödülü
   VEREN taraf main.js'tir (cüzdan ve sandık orada yaşıyor).

   ─── TASARIM KARARLARI ───
   • GÜN İLERLEMESİ ÖDÜL ALINDIĞINDA OLUR, gün değiştiğinde değil.
     Oyuncu bir gün oyunu açıp ödülü almazsa yuvası KAYBOLMAZ — açtığı
     ama oynamadığı gün onu cezalandırmaz. Takvim "gün sayacı" değil,
     "alınmış ödül sayacı"dır.
   • TELAFİ HAKKI (hafta başına 1): bir gün tamamen kaçırılırsa seri
     sıfırlanmak yerine telafi hakkı yenir. Streak sistemlerinin
     oyuncuyu kaybettiği yer 7 günün 6'sını yapıp 7'yi kaçırmaktır;
     ceza orada duygusal olarak kaybı ikiye katlar.
   • HAFTALIK GÖREVLER İLERLEMEYİ KOŞU SONUNDA YAZAR (main.saveRecord),
     her karede değil: sıcak döngüde localStorage'a yazmak yasak.
   • Görev hedefleri SABİT. Dinamik hedef ("son haftanın %120'si")
     iyi oynayan oyuncuyu cezalandırır ve haftalar arasında
     karşılaştırılamaz hale gelir.
   ═══════════════════════════════════════════════════════════ */

/* ── GÜNLÜK GİRİŞ: 7 günlük döngü ──
   Eğri artan ve 7. gün belirgin biçimde en büyük ödül: seri ancak
   sonunda gerçek bir vitrin varsa "seri" gibi hissedilir. */
import { Clock } from './clock.js?v=20260930m';

export const DAILY_STREAK = [
  { day: 1, reward: { kind: 'rubies', amount: 90 } },
  { day: 2, reward: { kind: 'stone', amount: 6 } },
  { day: 3, reward: { kind: 'rubies', amount: 180 } },
  { day: 4, reward: { kind: 'chest', chest: 'yaygin' } },
  { day: 5, reward: { kind: 'rubies', amount: 320 } },
  { day: 6, reward: { kind: 'stone', amount: 14 } },
  { day: 7, reward: { kind: 'chest', chest: 'kan' } },
];

/* ── HAFTALIK GÖREVLER ──
   Beş görev, farklı OYNAYIŞ ekseni: öldürme (savaş) · görev (ilerleme) ·
   boss (doruk) · saha görevi (harita içi) · dalga (dayanıklılık). Aynı
   ekseni ölçen iki görev, tek görevin iki kez sayılması olur.
   `pts` vitrin ilerlemesini sürer; toplam 60 = son kademe. */
export const WEEKLY_QUESTS = [
  { id: 'kills',      label: 'DÜŞMAN DEVİR',      need: 400, pts: 12, reward: { kind: 'rubies', amount: 260 } },
  { id: 'missions',   label: 'GÖREV TAMAMLA',     need: 6,   pts: 12, reward: { kind: 'rubies', amount: 300 } },
  { id: 'boss',       label: 'BOSS DEVİR',        need: 2,   pts: 14, reward: { kind: 'stone',  amount: 16 } },
  { id: 'objectives', label: 'SAHA GÖREVİ BİTİR', need: 4,   pts: 12, reward: { kind: 'rubies', amount: 240 } },
  { id: 'waves',      label: 'DALGA ATLAT',       need: 40,  pts: 10, reward: { kind: 'rubies', amount: 200 } },
];

/* ── VİTRİN: haftalık puanla açılan üç kademe ──
   Görev ödülleri "yaptım" der, vitrin "haftayı bitirdim" der. İkisi
   ayrı olmadan haftalık sistem bir yapılacaklar listesine benziyor. */
export const WEEKLY_TIERS = [
  { pts: 20, reward: { kind: 'chest',  chest: 'kemik' } },
  { pts: 40, reward: { kind: 'stone',  amount: 30 } },
  { pts: 60, reward: { kind: 'chest',  chest: 'mistik' } },
];

export const WEEKLY_MAX_PTS = WEEKLY_QUESTS.reduce((a, q) => a + q.pts, 0);

/* ═══════════ TAKVİM ═══════════
   YEREL gün kullanılır, UTC değil: oyuncunun "bugün"ü saat diliminde
   olduğu gündür. Gün anahtarı sıralanabilir metin (YYYY-MM-DD), yani
   iki günün farkı da metinden değil TARİHTEN hesaplanır. */
function two(n) { return (n < 10 ? '0' : '') + n; }

export function dayKey(d) {
  const t = d || new Date(Clock.now());
  return t.getFullYear() + '-' + two(t.getMonth() + 1) + '-' + two(t.getDate());
}

function dayNum(key) {
  const p = String(key || '').split('-');
  if (p.length !== 3) return NaN;
  return Math.floor(Date.UTC(+p[0], +p[1] - 1, +p[2]) / 86400000);
}

/** İki gün anahtarı arasındaki tam gün farkı. Bilinmeyen için 1. */
export function dayGap(a, b) {
  const x = dayNum(a), y = dayNum(b);
  return (Number.isFinite(x) && Number.isFinite(y)) ? (y - x) : 1;
}

/** Hafta anahtarı: PAZARTESİ başlar. Yıl sınırında ISO hafta numarası
    yerine "haftanın pazartesi tarihi" kullanılır — aynı işi yapar,
    31 Aralık tuzağı yoktur. */
export function weekKey(d) {
  const t = d ? new Date(d) : new Date(Clock.now());
  const wd = (t.getDay() + 6) % 7;              // 0 = pazartesi
  t.setDate(t.getDate() - wd);
  return 'H' + dayKey(t);
}

/** Haftanın bitişine kalan süre (ms) — geri sayım için. */
export function weekLeftMs(now) {
  const t = now ? new Date(now) : new Date(Clock.now());
  const end = new Date(t);
  const wd = (t.getDay() + 6) % 7;
  end.setDate(end.getDate() - wd + 7);
  end.setHours(0, 0, 0, 0);
  return Math.max(0, end - t);
}

/* ═══════════ DURUM ═══════════ */

/** Kayıttan gelen dilimi doğrular. Bozuk/eksik alan sessizce onarılır:
    tek bir bozuk sayı yüzünden görev ekranı açılmamalı. */
export function normalizeQuests(q) {
  const s = (q && typeof q === 'object') ? q : {};
  const prog = {};
  for (const def of WEEKLY_QUESTS) {
    const v = s.prog ? s.prog[def.id] : 0;
    prog[def.id] = Math.max(0, Math.min(def.need * 9, v | 0));
  }
  const slot = Math.max(1, Math.min(7, s.slot | 0 || 1));
  return {
    day: typeof s.day === 'string' ? s.day : '',
    claimDay: typeof s.claimDay === 'string' ? s.claimDay : '',
    slot,
    cycle: Math.max(1, s.cycle | 0 || 1),
    makeup: Math.max(0, Math.min(1, s.makeup == null ? 1 : s.makeup | 0)),
    makeupUsed: typeof s.makeupUsed === 'string' ? s.makeupUsed : '',
    week: typeof s.week === 'string' ? s.week : '',
    prog,
    claimed: Array.isArray(s.claimed) ? s.claimed.filter((x) => typeof x === 'string') : [],
    tiers: Array.isArray(s.tiers) ? s.tiers.filter((x) => Number.isFinite(x)) : [],
  };
}

export class Dailies {
  constructor(game) {
    this.game = game;
    if (!game.meta.quests) game.meta.quests = normalizeQuests(null);
    this.touch();
  }

  get q() { return this.game.meta.quests; }

  /** Gün/hafta dönüşünü uygula. Menüye her girişte ve ekran açılışında
      çağrılabilir — idempotenttir (aynı gün ikinci çağrı hiçbir şey
      yapmaz), yani "hangi geçiş noktasında çağırdım" sorusu doğmaz. */
  touch() {
    const q = this.q;
    let dirty = false;
    const today = dayKey();

    if (q.week !== weekKey()) {
      /* HAFTA DÖNDÜ: ilerleme ve alınan ödüller sıfırlanır, telafi
         hakkı yenilenir. Puan da sıfırlanır — vitrin haftalıktır. */
      for (const def of WEEKLY_QUESTS) q.prog[def.id] = 0;
      q.claimed = [];
      q.tiers = [];
      q.makeup = 1;
      q.week = weekKey();
      dirty = true;
    }

    if (q.day !== today) {
      const gap = q.day ? dayGap(q.day, today) : 1;
      const claimedPrev = q.claimDay && q.claimDay === q.day;
      if (claimedPrev) {
        if (gap === 1) this._advance();
        else if (q.makeup > 0) {
          /* TELAFİ: bir (ya da daha fazla) gün kaçtı ama hak var —
             seri korunur ve hak yenir. Oyuncuya söylenir (rozet). */
          q.makeup = 0;
          q.makeupUsed = today;
          this._advance();
        } else {
          q.slot = 1;
          q.cycle++;
        }
      } else if (gap > 1 && q.makeup <= 0) {
        /* Ne aldı ne de geldi: döngü baştan. */
        q.slot = 1;
      }
      q.day = today;
      dirty = true;
    }
    if (dirty) this.game.saveMeta();
  }

  _advance() {
    const q = this.q;
    if (q.slot >= 7) { q.slot = 1; q.cycle++; } else q.slot++;
  }

  /* ── GÜNLÜK ── */

  todaySlot() { return DAILY_STREAK[Math.max(0, Math.min(6, this.q.slot - 1))]; }
  claimedToday() { return !!this.q.claimDay && this.q.claimDay === dayKey(); }
  usedMakeupToday() { return this.q.makeupUsed === dayKey(); }

  /** Günün ödülünü al. Ödülü game.grantQuestReward verir; buradaki tek
      iş takvim durumunu ilerletmek. */
  claimDaily() {
    if (this.claimedToday()) return null;
    const slot = this.todaySlot();
    this.q.claimDay = dayKey();
    this.game.saveMeta();
    return slot.reward;
  }

  /* ── HAFTALIK ── */

  points() {
    let p = 0;
    for (const def of WEEKLY_QUESTS) if (this.done(def)) p += def.pts;
    return p;
  }
  prog(def) { return Math.min(def.need, this.q.prog[def.id] | 0); }
  done(def) { return (this.q.prog[def.id] | 0) >= def.need; }
  claimedQuest(id) { return this.q.claimed.includes(id); }

  /** Koşu sonunda çağrılır (main.saveRecord). Tamamlanmış görevin
      sayacı büyümeye devam etmez: 400/400 gösterip 812 yazmak "fazla
      oynadım, boşa gitti" duygusu verir. */
  add(id, n) {
    if (!(n > 0)) return;
    const def = WEEKLY_QUESTS.find((d) => d.id === id);
    if (!def) return;
    const cur = this.q.prog[id] | 0;
    if (cur >= def.need) return;
    this.q.prog[id] = Math.min(def.need, cur + Math.floor(n));
  }

  claimQuest(id) {
    const def = WEEKLY_QUESTS.find((d) => d.id === id);
    if (!def || !this.done(def) || this.claimedQuest(id)) return null;
    this.q.claimed.push(id);
    this.game.saveMeta();
    return def.reward;
  }

  tierReady(i) {
    const t = WEEKLY_TIERS[i];
    return !!t && this.points() >= t.pts && !this.q.tiers.includes(i);
  }
  claimTier(i) {
    if (!this.tierReady(i)) return null;
    this.q.tiers.push(i);
    this.game.saveMeta();
    return WEEKLY_TIERS[i].reward;
  }

  /** Alt sekme rozeti: alınmayı bekleyen bir şey var mı? */
  pending() {
    if (!this.claimedToday()) return true;
    for (const def of WEEKLY_QUESTS) if (this.done(def) && !this.claimedQuest(def.id)) return true;
    for (let i = 0; i < WEEKLY_TIERS.length; i++) if (this.tierReady(i)) return true;
    return false;
  }
}
