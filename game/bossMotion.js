/* ═══════════════════════════════════════════════════════════
   bossMotion.js — HASAT LORDU'NUN SÜZÜLME + SALDIRI POZU
   Model (assets/mezarlik/hasat_lordu.glb) İSKELETSİZ gelir: tek ağ,
   kemik yok, klip yok. Bu bir eksik değil KARAR: lord yürümez, havada
   süzülür — yürüyüş klibi olsaydı ayakları yerde kayardı (aynı hata
   muhafızda 'Running' klibiyle yaşandı, bkz. CLAUDE.md klip seçimi).

   Bu yüzden hareketin TAMAMI prosedüreldir ve BURADA yaşar:
   tek saf fonksiyon, dışarıdan verilen bir çıkış nesnesine yazar —
   sıcak döngüde tahsis YOK (perf.js kural 1).

   Neden ayrı dosya: aynı matematiği hem oyun (render3d._updateBoss)
   hem ölçüm tezgahı (_bosstest.html) okur. Tezgah kendi kopyasını
   yazsaydı, oyundaki poz değiştiğinde tezgah sessizce yalan söylerdi —
   `waveDuration`ın iki yerde yazılı olduğu tuzağın aynısı.

   TASARIM SINIRI — "uçtuğu anlaşılsın, uçuşa gitmesin":
   süzülme yüksekliği gövde boyunun ~%8'i (12 birim / ~150 boy).
   Zemine değmez ama havaya da kaçmaz; uçtuğunu söyleyen şey yükseklik
   değil, yerdeki YUVARLAK GÖLGE ile arasındaki boşluktur.
   ═══════════════════════════════════════════════════════════ */

import { DRAGON } from './config.js?v=20260930m';

/** Taban süzülme yüksekliği (dünya birimi). Gövde ~150 birim. */
export const BOSS_HOVER = 12;
/** Tükürme (yayılan mermi) pozunun süresi — enemyManager e.atkAnim'i bu
    değerle kurar; ikisi AYNI sabit olmak zorunda, yoksa poz yarıda kesilir. */
export const BOSS_ATK = 0.62;
/** enemyManager.updateBoss durum süreleri (BOSS.chargeTime / windup 0.62).
    Poz ilerlemesi stateT'yi bunlara böler. */
export const BOSS_WINDUP = 0.62;
export const BOSS_CHARGE = 0.7;

/* Yumuşak giriş-çıkış (smoothstep). Lineer ilerleme mekanik görünüyordu:
   ağır bir gövdenin ivmesi yok, "asansör" gibi çıkıyordu. */
const ease = (k) => k * k * (3 - 2 * k);

/** Çıkış nesnesi — ÇAĞIRAN tutar (modül düzeyinde tek kopya yeterli). */
export const BOSS_POSE = { y: 0, pitch: 0, roll: 0, push: 0, shadow: 1, glow: 0 };

/**
 * Lordun o karedeki pozunu hesaplar.
 *
 * @param out    yazılacak nesne (BOSS_POSE)
 * @param t      oyun zamanı (sn)
 * @param atkT   e.atkAnim — tükürme pozu için GERİYE sayan süre (0 = yok)
 * @param state  enemyManager durum makinesi: 'chase' | 'windup' | 'charge'
 * @param stateT o durumda kalan süre (sn)
 *
 * pitch İŞARETİ: +X ekseni etrafında pozitif dönüş, modelin baktığı
 * yönü (+Z) AŞAĞI eğer — yani pitch > 0 "öne eğilme", < 0 "geriye yaslanma".
 */
export function bossPose(out, t, atkT, state, stateT) {
  /* iki frekanslı süzülme: tek sinüs metronom gibi okunuyordu */
  out.y = BOSS_HOVER + Math.sin(t * 1.05) * 2.4 + Math.sin(t * 2.31) * 0.55;
  out.pitch = 0.02 + Math.sin(t * 0.83) * 0.03;
  out.roll = Math.sin(t * 0.61) * 0.04;
  out.push = 0;
  out.glow = 0;

  if (state === 'windup') {
    /* HÜCUM TELEGRAFI — nadir olay (chargeCd 6 sn), o yüzden abartılabilir:
       yükselir, geriye yaslanır, titrer ve KOR GİBİ ISINIR. Oyuncunun
       kaçmak için 0,62 sn'si var; bu poz o süreyi okunur kılar. */
    const k = ease(1 - Math.max(0, stateT) / BOSS_WINDUP);
    out.y += 9 * k;
    out.pitch -= 0.30 * k;
    out.roll += Math.sin(t * 26) * 0.014 * k;      // güç birikirken titreme
    out.glow = k;
  } else if (state === 'charge') {
    /* dalış: öne eğilip zemine yakınsar — hız hissi yükseklikten gelir */
    const k = Math.min(1, (1 - Math.max(0, stateT) / BOSS_CHARGE) * 3.4);
    out.y -= 7 * k;
    out.pitch += 0.34 * k;
    out.roll += Math.sin(t * 19) * 0.03;
    out.glow = 0.85 - 0.5 * k;
  } else if (atkT > 0) {
    /* TÜKÜRME (12 mermi halkası, spitCd 3 sn): sık tekrarlanan olay, bu
       yüzden kamera sarsılmaz ve imza mührü BASILMAZ (CLAUDE.md) — geri
       bildirim yalnız gövdenin kendisidir: topla, savur, toparla. */
    const p = 1 - atkT / BOSS_ATK;
    if (p < 0.44) {
      const k = ease(p / 0.44);
      out.y += 6 * k; out.pitch -= 0.20 * k; out.glow = 0.55 * k;
    } else if (p < 0.64) {
      const k = (p - 0.44) / 0.20;
      out.y += 6 - 13 * k;
      out.pitch += -0.20 + 0.50 * k;
      out.push = 7 * k;
      out.glow = 0.55 - 0.55 * k;
    } else {
      const k = 1 - (p - 0.64) / 0.36;
      out.y -= 7 * k * k; out.pitch += 0.30 * k * k; out.push = 7 * k;
    }
  }

  /* Gölge yükseldikçe KÜÇÜLÜR (ve alfa sabit kalır): instanced gölge
     mesh'inde örnek başına renk/alfa yok, ölçek var — yükseklik hissi
     bu tek kanaldan okunur. 0,55 tabanı: gölge asla kaybolmaz, yoksa
     lordun zeminle bağı kopar ve "uçuşa" gider. */
  out.shadow = Math.max(0.55, 1 - (out.y - BOSS_HOVER) * 0.019);
  return out;
}

/* ═══════════════════════════════════════════════════════════
   BATAK EJDERİ — YÜRÜMEYEN BOSS'UN POZU (2026-08-29)

   Model iskeletsiz VE klipsiz (Tripo ihracı, 605k üçgen). Lordla aynı
   kısıt, farklı cevap: lord süzülür, ejder YERDE DURUR. Bu yüzden
   yürüme diye bir şey yok — ve tam bu yüzden ejderin duruşu ölü
   görünmemek zorunda: nefes, kuyruk/gövde salınımı ve baş sallanışı
   yerinde duran gövdeye "canlı" der.

   ÜÇ OLAY (enemyManager.updateDragon durum makinesiyle ORTAK):
     perch + atkT  → zehir salvosu: geriye çekilir, sonra ileri savurur
     tell          → çömelir, gerilir (kırmızı alan o sırada yerde büyür)
     leap          → havada YAY çizer: pitch öne, iniş anında sertçe geri

   ZIPLAMA YÜKSEKLİĞİ ÖLÇÜTÜ: yay tepesi gövde boyunun ~%30'u (44 / 150).
   Daha alçağı "kayıyor" görünür (zıplama okunmaz), daha yükseği
   ejderi uçan bir yaratığa çevirir — o başka bir tasarım.
   ═══════════════════════════════════════════════════════════ */
export const DRAGON_ATK = 0.60;     // salvo pozu süresi (enemyManager e.atkAnim)
/* TELEGRAF ve HAVADA KALMA SÜRESİ CONFIG'TEN OKUNUR, burada YAZILMAZ.
   İki yere yazılsaydı `waveDuration` tuzağının aynen tekrarı olurdu: dengeyi
   config'ten ayarlayan biri pozu yarıda kesilmiş bir ejder elde ederdi. */
const DRAGON_TELL = DRAGON.leapTell;
const DRAGON_LEAP = DRAGON.leapTime;
const LEAP_H = 44;

export const DRAGON_POSE = { y: 0, pitch: 0, roll: 0, push: 0, shadow: 1, glow: 0 };

/**
 * @param out    DRAGON_POSE
 * @param t      oyun zamanı
 * @param atkT   e.atkAnim (salvo pozu, geriye sayar)
 * @param state  'perch' | 'tell' | 'leap'
 * @param stateT o durumda kalan süre
 */
export function dragonPose(out, t, atkT, state, stateT) {
  /* YERDE DURUR: taban yükseklik 0. Nefes gövdeyi 1,5 birim oynatır —
     zıplama yayının (44) yanında görünmez küçük, ama duran bir gövdeyi
     "heykel" olmaktan çıkarmaya yeter. */
  out.y = Math.sin(t * 1.35) * 1.5 + Math.sin(t * 2.7) * 0.4;
  out.pitch = 0.015 + Math.sin(t * 0.9) * 0.025;
  out.roll = Math.sin(t * 0.72) * 0.05;        // gövde ağırlık aktarımı
  out.push = 0;
  out.glow = 0;

  if (state === 'leap') {
    /* HAVADAKİ YAY. k: 0 → 1 zıplama boyunca. sin(πk) yayı simetrik yapar;
       iniş anında pitch geri döner, yoksa ejder kafası yerde iner. */
    const k = 1 - Math.max(0, Math.min(1, stateT / DRAGON_LEAP));
    const arc = Math.sin(k * Math.PI);
    out.y += LEAP_H * arc;
    out.pitch += -0.26 * arc + 0.30 * (k > 0.72 ? (k - 0.72) / 0.28 : 0);
    out.roll += Math.sin(k * 11) * 0.05;
    out.glow = 0.5 * arc;
  } else if (state === 'tell') {
    /* ÇÖMELME — kırmızı alan yerde büyürken gövde gerilir. Oyuncunun
       kaçması için 0,78 sn var; poz o pencereyi okunur kılar (lordun
       hücum telegrafıyla aynı iş). */
    const k = ease(1 - Math.max(0, stateT) / DRAGON_TELL);
    out.y -= 5 * k;                 // çöker
    out.pitch += 0.14 * k;
    out.roll += Math.sin(t * 30) * 0.02 * k;   // birikmiş güç titremesi
    out.glow = 0.9 * k;
  } else if (atkT > 0) {
    /* ZEHİR SALVOSU: boyun geriye, sonra ileri savurma. Sık tekrarlanan
       olay (2,9 sn) → kamera sarsılmaz, imza mührü basılmaz (CLAUDE.md
       sarsıntı politikası; lordun tükürmesiyle aynı gerekçe). */
    const p = 1 - atkT / DRAGON_ATK;
    if (p < 0.40) {
      const k = ease(p / 0.40);
      out.pitch -= 0.22 * k; out.y += 3 * k; out.glow = 0.6 * k;
    } else {
      const k = Math.min(1, (p - 0.40) / 0.26);
      out.pitch += -0.22 + 0.40 * k;
      out.push = 9 * k * (1 - k) * 4;         // kısa ileri savurma
      out.y += 3 - 3 * k;
      out.glow = 0.6 - 0.6 * k;
    }
  }

  /* Gölge: ejder ZEMİNDE durduğu için taban 1,0 — yalnız zıplarken
     küçülür. Lordun tersi (o hep havada, gölgesi hep küçük): burada
     gölgenin büyüklüğü "yerde mi, havada mı" sorusunun tek cevabı. */
  out.shadow = Math.max(0.42, 1 - Math.max(0, out.y) * 0.011);
  return out;
}
