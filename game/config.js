import { fitMods, heroBudget, gearBudget, modsLine } from './balance.js?v=20260930m';
/* ═══════════════════════════════════════════════════════════
   config.js — Denge Tabloları (Tek Doğruluk Kaynağı)
   Oyunun tüm sayıları burada yaşar. Denge ayarı = bu dosya.
   ═══════════════════════════════════════════════════════════ */

export const COLORS = {
  bg:      '#0b0d13',
  bone:    '#e8e4d8',
  dim:     '#8b90a3',
  blood:   '#ff3b4e',
  ember:   '#b87351',
  gold:    '#d8a284',
  spirit:  '#59e3c8',
  purple:  '#9b6cff',
  zombi:   '#6f9a5c',
  kosucu:  '#d9884a',
  tank:    '#7d6ba8',
  atici:   '#5fd190',
  muhafiz: '#c79a4a',          // yaşlanmış tunç — zırhlı Mezar Muhafızı
  boss:    '#c92a3c',
};

/* ── Game Feel (Ultra Blade standardı) ───────────────────── */
export const FX = {
  /* ── HIT-STOP TAMAMEN KALDIRILDI (2026-08-10) ──────────────────────────
     Dünyayı birkaç kare dondurmak konsolda "vuruş hissi" verir; dokunmatik
     bir mobil oyunda ise oyuncu bunu KARE KAYBI olarak okur — "efektte oyun
     anlık takılıyor". Üstelik kayıp gerçektir: donan karede simülasyon
     ilerlemez ama joystick girdisi birikir, yani kontrol da gecikir.
     Üç değer de 0 ve main.hitStop() artık no-op (çağrı yerleri bilerek
     bırakıldı — silmek 12 dosyaya dokunmak demekti ve hiçbir kazanç yok).
     Vuruşun geri bildirimi artık YALNIZ hasar yazısı + parçacık + sestir. */
  hitStopMs:      0,
  critStopMs:     0,
  bossHitStopMs:  0,
  /* ── EKRAN SARSINTISI (2026-08-04 revizyonu) ──────────────────────────
     ESKİ DEĞERLER BAŞ DÖNDÜRÜYORDU: her normal vuruş 0.07 travma ekliyordu
     ve saniyede 5-10 vuruş olan bir sahnede travma hiç sıfıra dönmüyordu —
     kamera sürekli titriyordu. Yeni politika:

       • RUTİN olay (normal vuruş, her savuruş, her atış) → SIFIR sarsıntı.
         Vuruşun geri bildirimi hasar yazısı, parçacık ve ses; kamera değil.
       • NADİR imza olayı (girdap, gök kılıcı, bordo ateşi, fırtına) → çok
         hafif (0.14-0.16).
       • Oyuncu hasar aldığında / boss olayları → hissedilir ama ölçülü.

     maxShakePx 16 → 7 ve sönme 2.6 → 3.6: travma² eğrisiyle birlikte küçük
     travmalar artık neredeyse görünmez, büyükleri de çabuk oturuyor. */
  shakeHit:       0,      // normal vuruş: SARSINTI YOK (en sık olay)
  shakeCrit:      0.09,   // kritik: yalnızca hafif bir vurgu
  shakeHurt:      0.26,   // oyuncu hasar aldığında
  shakeBoss:      0.40,   // boss olayları
  maxShakePx:     7,      // maksimum sarsıntı ofseti (piksel)
  shakeDecay:     3.6,    // travmanın saniyede sönme hızı
  floatTextLife:  0.85,   // hasar yazısı ömrü (sn)
  hitFlashTime:   0.09,   // düşman beyaz yanıp sönme süresi
};

/* ── Oyuncu ──────────────────────────────────────────────── */
export const PLAYER = {
  speed:       172,
  radius:      14,
  maxHp:       100,
  regen:       0.35,     // saniyede can yenileme (dengelendi: pasif iyileşme az)
  critChance:  0.08,
  critMult:    2.2,
  armor:       0,        // vuruş başına düz hasar azaltma
  magnet:      95,       // cevher çekim yarıçapı
  invulnTime:  0.42,     // hasar sonrası dokunulmazlık (sn) — daha kısa i-frame
  pickupR:     18,       // cevher toplama yarıçapı
};

/* ── XP eğrisi ───────────────────────────────────────────────
   YAVAŞLATILDI (2026-07-30): taban 6 → 13 ve çarpan 1.24 → 1.26.
   Eski eğride 2. seviye 10 XP istiyordu — ilk sürüde toplanan iki
   cevher kart ekranını açıyor, oyuncu daha yürümeye başlamadan seçim
   yapıyordu ("2 adım atıp level atlıyor"). Yeni eğri ilk seviyeyi ~20
   XP'ye çeker ve 10. seviyeye kadar eski maliyetin ~1,8 katını ister;
   kartlar seyrekleşince her biri gerçekten bir karar olur. */
/* YUMUŞATILDI (2026-09-05): taban 13 → 11, çarpan 1,26 → 1,235, doğrusal
   pay 6 → 5. Kullanıcı iki şey seçti: "daha kolay" ve "görev başına 12-15
   seviye". ÖlÇÜLDÜ (_baltest ⑧): eski eğri ve para çarpanı ayıklandıktan
   sonra 1. görevde yalnız 8 seviye atılıyordu — hedefin (10-16) altında.
   Daha fazla seviye = daha fazla kart = hem "daha kolay" hem "daha derin
   build": iki istek AYNI kolla karşılanır, iki ayrı ayar gerekmez. */
export function xpToNext(level) {
  return Math.floor(11 * Math.pow(1.235, level - 1) + 5 * level);
}

/* ── Düşman tipleri ──────────────────────────────────────── */
export const ENEMY_TYPES = {
  zombi: {
    name: 'İskelet Savaşçı', hp: 22, speed: 46, radius: 15, dmg: 12,
    xp: 1, color: COLORS.zombi, weight: 10, knockRes: 1.0,
  },
  atici: {
    /* Ad 3B modelle eşitlendi (2026-08-22): mezarlıkta bu tipi artık
       `assets/mezarlik/buyucu.glb` — asalı bir iskelet büyücü — canlandırıyor.
       Eski ad ('Nekro Efendisi') 2D kare setinden kalmıştı. */
    name: 'İskelet Büyücü', hp: 30, speed: 48, radius: 14, dmg: 10,
    xp: 2, color: COLORS.atici, weight: 0, knockRes: 0.9,
    range: 265, fireCd: 2.5, bulletSpeed: 155, bulletDmg: 13,
    /* MENZİL BANDI (2026-08-22) — büyücünün "büyücü" gibi okunması sayı işi.
       Durma mesafesi BURADA SABİT YAZILMAZ: enemyManager onu her karede
       görüş dikdörtgeninin kenarından türetir (ekranın kenarında durur,
       yani hem uzak hem GÖRÜNÜR). Sabit bir sayı dar kabukta ekran dışında,
       geniş kabukta fazla yakın kalıyordu.
       • backRange 120: bu kadar yaklaşınca geri çekilir (menzilli kimliği).
       • range 265: mermi/hedefleme menzili — durma mesafesinin tavanı. */
    backRange: 120,
  },
  /* ── MEZAR MUHAFIZI: yüksek canlı ağır yakın dövüş ──
     Tasarım niyeti: iskelet savaşçı "kalabalık", muhafız "engel". Bu yüzden
     istatistikleri tek tek karşıt seçildi:
     • hp 95 (iskeletin ~4×) — tek vuruşta ölmez, oyuncuyu konum değiştirmeye
       ya da silah yükseltmesine zorlar.
     • speed 33 (iskelet 46) — YAVAŞ olması adalettir. Hem yüksek canlı hem
       hızlı bir düşman kaçış imkânı bırakmaz; yavaşlık tehdidi haber verir.
     • radius 21 — daha büyük vurulma alanı. Yavaş bir tankın isabet ettirmesi
       KOLAY olmalı; zorluk canından gelsin, nişan almaktan değil.
     • knockRes 0.35 — geri tepmeyi neredeyse hiç yemez. Ağırlık hissini
       veren şey budur; iskelet gibi savrulan bir tank sadece "kalın iskelet"
       gibi görünürdü.
     • dmg 26 — temasın bedeli yüksek, oyuncu etrafından dolanmayı öğrenir. */
  muhafiz: {
    name: 'Mezar Muhafızı', hp: 88, speed: 33, radius: 21, dmg: 22,
    xp: 5, color: COLORS.muhafiz, weight: 0, knockRes: 0.35,
  },

  /* ══ AĞIR PENÇE (2026-08-29) — muhafız ile kral ARASINDAKİ basamak ══
     Donmuş Göl'de YETİ, Kül Çukurları'nda gerekmedi (orada tank rolü kor
     lordunda). Muhafızdan ayrı bir TİP olmasının tek gerekçesi var: dünya
     başına ÜÇ yakın dövüş silueti (kalabalık · tank · ağır) oyuncuya üç
     ayrı karar verdirir; aynı tipi iki modelle çizmek yalnız görsel çeşitlik
     olurdu, oynanış çeşitliliği değil.
     • hp 165 (muhafız 88'in ~1,9×) — kaçmak yerine kaynak harcatır.
     • speed 27 — muhafızdan da yavaş. Ağırlık hissi hızdan çalınır.
     • knockRes 0.24 — savrulmaz; savrulan bir ağır "kalın iskelet" olur.
     • radius 26 — büyük hedef: yavaş bir tankın vurulması KOLAY olmalı. */
  agir: {
    name: 'Ağır Pençe', hp: 165, speed: 27, radius: 26, dmg: 30,
    xp: 9, color: COLORS.tank, weight: 0, knockRes: 0.24,
  },

  /* ══ PATLAYICI KOŞUCU (Tuz Tabanı) ══
     Oyuncunun ÜSTÜNE koşar ve yaklaşınca patlar. Temas hasarı YOKTUR
     (dmg 0): bedeli patlama ödetir, yoksa aynı düşman iki kez vurmuş olur
     ve "neden öldüm" okunmaz hale gelir.
     • speed 78 — kadronun en hızlısı. Tehdit HIZDAN okunur.
     • hp 26 — bir vuruşluk. Menzilli/alan silahı onu havada durdurabilir;
       bu bir yetenek testidir, ceza değil.
     • fuse 0,55 sn TELEGRAF — patlama uyarısız olmaz. Kaçış penceresi
       oyuncunun tepki süresinin (~0,25 sn) iki katı.
     • blastR 104 / blastDmg 34: yarıçap oyuncu yarıçapının ~5 katı, yani
       "yanından geçtim ama yedim" hissi vermez; hasar bir temasın 1,5 katı. */
  patlayici: {
    /* radius 15 → 19 (2026-08-30): model tabanı 89 birimken 30 birimlik bir
       daireyle koşuyordu — kullanıcının gördüğü "orantısız" tam bu. Hitbox
       modele UYDURULUR, model hitbox'a küçültülmez; üstelik büyüyen hedef
       patlayıcıyı vurup durdurmayı KOLAYLAŞTIRIR, yani adalet yönünde. */
    name: 'Tuz Koşucusu', hp: 26, speed: 78, radius: 19, dmg: 0,
    xp: 3, color: COLORS.kosucu, weight: 0, knockRes: 0.75,
    fuseR: 62, fuse: 0.55, blastR: 104, blastDmg: 34,
  },

  /* ══ İSKELET KRAL (Solgun Mezarlık'ın en güçlüsü) ══
     Kullanıcı isteği: "o haritanın en güçlü karakteri, etrafından ölüm
     efektleri saçıp hasar vursun, çok hızlı ilerlemesin, boss gibi olsun,
     canı yüksek olsun, DENGELİ eklensin."

     "Boss gibi ama boss DEĞİL" ölçülebilir bir tariftir:
     • hp 560 — muhafızın 6,4×'i, boss'un (4100) yalnız %14'ü. Yani uzun bir
       dövüş, ama dalga akışını kilitlemez.
     • speed 20 — kadronun en yavaşı. Kaçılabilir olması ADALETTİR: hasarı
       alan etkisiyle veriyor, üstüne bir de yakalayamadığın hız verilirse
       kalabalıkta çıkışı olmayan bir kutu olur.
     • auraCd 3,1 sn + auraTell 0,62 sn: nabız TELEGRAFLIDIR ve halka
       yerden yükselir. Uyarısız alan hasarı ekranda "sebepsiz can gitti"
       diye okunur (bkz. boss hücum telegrafı).
     • auraR 132 / auraDmg 30 — yarıçap kral yarıçapının ~4×'i: dövüş
       "gir-çık" ritmine oturur, sürekli temas eden oyuncu cezalanır.
     • weight eğrisi 6. dalgada açılır ve yavaş büyür (bkz. TYPE_CURVES):
       ilk haritada oyuncu daha silah kurmadan kralla karşılaşmaz. */
  kral: {
    name: 'İskelet Kral', hp: 560, speed: 20, radius: 34, dmg: 34,
    xp: 26, color: COLORS.boss, weight: 0, knockRes: 0.10,
    auraCd: 3.1, auraTell: 0.62, auraR: 132, auraDmg: 30,
  },
};

/* ── Koşu yapısı: DALGALAR (Brotato düzeni) ──────────────────
   Koşu = art arda dalgalar. Dalga biter → kalan cevherler
   toplanır → (varsa) seviye seçimleri → KARA PAZAR → sonraki
   dalga. 10. dalga boss dalgasıdır; sonsuz modda her 5 dalgada
   bir boss döner. */
export const RUN = {
  bossWave:  10,      // son dalga = boss
  bossEvery: 5,       // sonsuz modda boss aralığı
};

/* ── DENGE EĞRİLERİ (2026-07 revizyonu) ────────────────────
   Eski eğriler çarpımsal olarak patlıyordu: dünya çarpanı × görev rampası
   × dalga rampası, 6. dünyanın 10. görevinde düşman canını taban değerin
   ~165 katına çıkarıyordu. Oyuncunun tam kurulu DPS'i ~90 kat; yani son
   dünyalar matematiksel olarak geçilemezdi. Üç eğri de yumuşatıldı ve
   HASAR eğrisi cana göre çok daha yavaş büyüyor: canı yüksek düşman
   "uzun dövüş", hasarı yüksek düşman "anlık ölüm" demektir; mobilde
   ikincisi adaletsiz hissedilir. */
/* UZATILDI (2026-09-05): kullanıcı hedefi "görev 5-7 dk" ama ÖLÇÜLEN değer
   4,2 dk'ydı (7 dalgalı görev, _baltest ③/⑧) — hedef YAZILIYDI ama hiç
   ölçülmüyordu. Çözüm dalga süresini değil TOPLAMI hedeflemek oldu:
   bkz. aşağıdaki waveTime. */
/* GÖREV SÜRESİ DALGA SAYISINDAN DEĞİL, HEDEFTEN TÜRER (2026-09-05).
   ÖLÇÜLDÜ (_baltest ③): sabit bir dalga süresi eğrisiyle görev uzunluğu
   3,8 dk (5 dalga) ile 8,0 dk (9 dalga) arasında geziyordu, yani kullanıcı
   hedefi olan 5-7 dk bandının İKİ YANINA birden düşüyordu. İki tur üst üste
   sabiti büyütmek (22+3,4w → 30+4,2w) yanlış eksendi: dalga SAYISI 5→9
   arasında 1,8 kat değiştiği için dalga başına süre sabit tutulduğunda
   TOPLAM da 1,8 kat değişir — hangi sabit seçilirse seçilsin.

   Doğrusu hedefi ÖNCE yazmak: T = 300 + 18·(n−5) saniye (5 dalga 5,0 dk →
   9 dalga 6,2 dk; hepsi bantta, uzun görev gene de daha uzun). Toplam,
   yükselen bir ağırlıkla dalgalara bölünür (son dalga ilkin ~1,45 katı):
   tırmanış korunur, band bağlanır.

   `waves` verilmezse eski davranışa düşer — dalga sayısını bilmeyen bir
   çağrıanın sessizce 0 alması kabul edilemez. Dalga süresi aynı zamanda XP
   ARZIdir: bu fonksiyon değiştirilince ⑧'deki seviye tablosu YENİDEN okunur. */
export function waveTime(w, waves) {
  if (!waves || waves < 1) return Math.min(70, 30 + w * 4.2);
  /* v49: dalga başı +18 → +11 sn — ölçüldü (_baltest ③): G8-10 6,6-6,9 dk
     tavanı (6,5) aşıyordu. */
  const total = 300 + 11 * (waves - 5);
  const sum = waves * 0.8 + 0.06 * waves * (waves - 1) / 2;
  return total * (0.8 + 0.06 * (w - 1)) / sum;
}

/* ── GİRİŞ EĞRİSİ (2026-08-29) ─────────────────────────────
   Kullanıcı teşhisi: "erken dalgada çok düşman, giriş dik". Sebep tek bir
   sayı değil: waveBatch(1) = 2 ve waveInterval(1) = 1.30, yani ilk
   saniyeden itibaren saniyede ~1,5 düşman — oyuncu daha ilk kartı
   seçmeden çevriliyordu.

   ERKEN DALGALAR ELLE YAZILIR, formül GEÇ dalgaları sürer. Tek bir üsle
   iki ucu birden ayarlamak denenip bırakıldı: üssü büyütmek girişi
   yumuşatırken geç dalgaları tehditsiz bırakıyor, küçültmek tersini
   yapıyor. İki uç aynı sayıyla ayarlanamaz.

   Baskının ÜÇ kaldıracı var ve üçü AYRI şeyler (birini diğerinin yerine
   kullanmak sonraki ölçümde ayrılamaz hale gelir):
     • dalga eğrisi (buradaki iki fonksiyon)  → dalga numarasına göre baskı
     • nefes penceresi (RAMP.breath*)         → koşunun ilk saniyeleri
     • doğuş yayması (RAMP.spread)            → aynı KAREDE kaç düşman doğar */
export function waveInterval(w) {
  if (w <= 3) return [1.90, 1.65, 1.40][w - 1];
  return Math.max(0.34, 1.22 * Math.pow(0.91, w - 3));
}
export function waveBatch(w) {
  if (w <= 2) return 1;
  return Math.min(10, 1 + Math.ceil((w - 2) * 0.8));   // 3:2 · 5:4 · 10:8 · 13:10
}
/* "DAHA KOLAY" (kullanıcı seçimi 2026-09-05) İKİ KOLDAN GELİR ve ikisi de
   ölçülebilir: dalga başına can artışı 0,30 → 0,25 (son dalgada düşman
   canı ×3,7 → ×2,75) ve hasar artışı 0,10 → 0,085. Hasarı CANDAN daha az
   kısmak kasıtlı: "uzun dövüş" şikayeti canla, "anında ölüm" şikayeti
   hasarla ilgilidir ve mobilde ikincisi zaten daha nadir duyuluyor. */
export function waveHpMul(w)   { return 1 + (w - 1) * 0.25; }
export function waveDmgMul(w)  { return 1 + (w - 1) * 0.085; }

/* ── NEFES PENCERESİ · DALGA YUMUŞAMASI · DOĞUŞ YAYMASI ────
   RAMP oyuncunun ZAMANINA bakar, dalga numarasına değil. Nefes penceresi
   koşunun ilk ~50 saniyesidir: oyuncu sistemleri (savuruş menzili, imza
   silahı, kart seçimi) o pencerede öğrenir. Dalga yumuşaması ise her
   dalganın ilk saniyelerinde geçerlidir — dalga sonu kart ekranından
   çıkan oyuncu doğrudan tam baskıya düşmez.

   Çarpanlar ÇARPILIR: koşunun ilk karesinde 0.60 × 0.55 = 0.33. "Boş"
   görünen o pencere kasıtlıdır ve ölçütü var (aşağıdaki bant). */
export const RAMP = {
  breathSec:   50,     // nefes penceresi süresi (sn, koşu zamanı)
  breathMul:   0.60,   // pencerenin başındaki baskı çarpanı → doğrusal olarak 1'e çıkar
  waveEaseSec: 6,      // her dalganın başındaki yumuşama süresi (sn)
  waveEaseMul: 0.55,   // o yumuşamanın başlangıç çarpanı
  gapMax:      2.9,    // doğum aralığı tavanı (sn) — sahne tamamen boşalmasın
  spread:      0.09,   // AYNI grubun düşmanları arası doğum aralığı (sn)
};

/* Görüş alanında AYNI ANDA en fazla kaç düşman olabilir. "Yığılma"
   şikayetinin doğrudan karşılığı: canlı üst sınır (aliveCap 120) 4000
   px'lik sahanın TAMAMI için geçerli, oysa oyuncu haritanın ~%8'ini
   görüyor — 40 düşman ekranın içinde toplanınca sahne okunmaz hale gelir.
   Dalgayla büyür: geç dalgada kalabalık İSTENİR, erken dalgada değil. */
export function onScreenCap(w) { return Math.min(64, 18 + w * 4); }

/** Doğum baskı çarpanı — TEK KAYNAK. Aynı fonksiyonu hem sıcak döngü
    (enemyManager.pressure) hem ölçüm tezgahı (_baltest ⑥) çağırır.
    İkinci bir kopya yazmak `waveDuration` tuzağının aynen tekrarı olurdu:
    eğriyi buradan ayarlayan biri tezgahta hiçbir şey değiştirmemiş olurdu.
    Tahsissiz, dallanması sabit. */
export function pressureAt(runT, waveT, dyn) {
  let f = (dyn == null || !Number.isFinite(dyn)) ? 1 : dyn;
  if (runT < RAMP.breathSec) f *= RAMP.breathMul + (1 - RAMP.breathMul) * (runT / RAMP.breathSec);
  if (waveT < RAMP.waveEaseSec) f *= RAMP.waveEaseMul + (1 - RAMP.waveEaseMul) * (waveT / RAMP.waveEaseSec);
  return f;
}

/* İKİ KALDIRAÇ, KAREKÖKLÜ PAYLAŞIM. Baskı çarpanı hem gruba hem
   aralığa TAM uygulandığında etkisi KARELİ oluyordu: 0,78–1,06'lık
   dinamik pay sahada %46'lık bir fark üretti (ölçüldü, _baltest ⑥) —
   yani "görünmez ince ayar" gizli bir zorluk seçicisine dönüşmüştü.
   Çözüm tek kaldıraca inmek DEĞİL (grup boyu ve nabız ayrı şeylerdir;
   yalnız aralığı uzatmak "tek tek gelen düşman" duygusu verir):
   çarpanın KAREKÖKÜ her iki kaldıraca uygulanır, çarpımı tam olarak
   doğrusal kalır — batch/gap = (b·√p)/(g/√p) = (b/g)·p.

   İki fonksiyon, tek tahsis yok: sıcak döngüde her karede çağrılır,
   nesne döndüren tek bir yardımcı (→ {gap, batch}) GC üretirdi. */
export function spawnGap(wave, pr) {
  return Math.min(RAMP.gapMax, waveInterval(wave) / Math.sqrt(Math.max(0.05, pr)));
}
export function spawnBatch(wave, density, pr) {
  const b = Math.max(1, Math.round(waveBatch(wave) * (density || 1)));
  return Math.max(1, Math.round(b * Math.sqrt(Math.max(0.05, pr))));
}

/* ── DİNAMİK ZORLUK (görünmez, sınırlı, ölçülebilir) ───────
   Sabit eğri herkese aynı hissettirir: aynı dalga bir oyuncuya duvar,
   diğerine boş. Bu pay AGRESİF rubber-banding DEĞİL — bantı dar
   (0.78–1.06), adımı küçük, ve YALNIZ doğum baskısına dokunur:
   düşman canına/hasarına dokunmak oyuncunun vuruşunu yalanlar ("aynı
   kılıçla dün üç vuruşta ölüyordu") ve ölçüm tezgahını da geçersiz kılar.
   Kalıcıdır (meta.dyn) çünkü koşu içinde değişen zorluk fark edilir. */
export const DYN = {
  min: 0.78, max: 1.06,
  onDeath: 0.06,       // her ölümde baskı bu kadar düşer
  onWin:   0.035,      // her zaferde geri tırmanır (yükselme YAVAŞ olmalı)
  winFlawless: 0.06,   // hiç ciddi hasar almadan geçilen görev daha çok tırmandırır
};

/* ── Dalgaya göre düşman karışımı ──────────────────────────
   TİP EĞRİLERİ TEK YERDE (2026-08-29). Üç yeni tip (ağır · patlayıcı ·
   kral) geldi ve hepsi YALNIZ belirli dünyalarda yaşıyor: tuz tabanında
   menzilli düşman YOK (kullanıcı kararı), bataklıkta da yok (kadro iki
   yakın dövüş + boss), kral yalnız mezarlıkta, ağır yalnız buzulda.

   Bunu `waveWeights` içinde if'lerle yazmak `waveDuration` tuzağının
   aynısı olurdu: dünya kadrosunu değiştiren biri config'te bir şey
   bulamazdı. Kadro DÜNYANIN VERİSİDİR (worlds.js → roster) ve buradaki
   eğri yalnız "dalga ilerledikçe bu tip ne kadar sıklaşır" sorusunu
   cevaplar. Roster çarpanı 0 ise o tip o dünyada HİÇ doğmaz.

   ÖNEMLİ: modeli olmayan bir tipi bir dünyaya açmak, o dünyada KAPSÜL
   çizilmesi demektir (render3d.WORLD_ENEMY_MODELS eşlemesi). Yeni tip
   açarken önce model kaydı yazılır. */
const TYPE_CURVES = {
  zombi:     () => 10,
  atici:     (w) => (w >= 2 ? 1 + (w - 1) * 0.6 : 0),
  /* Muhafız 3. dalgada girer ve YAVAŞ artar: 3. dalgada doğumların ~%5'i,
     10. dalgada ~%14'ü. Erken bollaşırsa oyuncu daha silah bulmadan duvara
     çarpar; hiç artmazsa geç dalgalar tehditsiz kalır. */
  muhafiz:   (w) => (w >= 3 ? 0.5 + (w - 3) * 0.25 : 0),
  /* Ağır: muhafızdan bir dalga sonra ve ondan seyrek — ikisi aynı anda
     bollaşırsa buzul dünyası "iki tank duvarı" olur. */
  agir:      (w) => (w >= 4 ? 0.34 + (w - 4) * 0.16 : 0),
  /* Patlayıcı 2. dalgada girer (tuz tabanının menzilli düşman YERİNE
     aldığı baskı) ve muhafızdan hızlı artar: haritanın imzası bu. */
  patlayici: (w) => (w >= 2 ? 0.9 + (w - 2) * 0.42 : 0),
  /* Kral: 6. dalgadan önce YOK, sonra da nadir. 10. dalgada tüm doğumların
     ~%2,5'i — yani bir koşuda ortalama 1-3 kral görürsün. Daha sıkı olsa
     "mini boss" olmaktan çıkar, daha bol olsa dalga akışı kilitlenir. */
  kral:      (w) => (w >= 6 ? 0.16 + (w - 6) * 0.06 : 0),
};
/* Kadrosu yazılmamış dünyalar ilk haritanın kadrosunu kullanır. */
export const BASE_ROSTER = { zombi: 1, atici: 1, muhafiz: 1 };

export function waveWeights(w, roster) {
  const R = roster || BASE_ROSTER;
  const o = {};
  for (const k in TYPE_CURVES) {
    const mul = R[k];
    if (!mul) continue;                       // 0 / tanımsız = bu dünyada yok
    const v = TYPE_CURVES[k](w) * mul;
    if (v > 0) o[k] = v;
  }
  if (!o.zombi) o.zombi = 10;                 // kadro boş kalmasın (güvenlik)
  return o;
}

export const WAVES = {
  maxEnemies: 420,    // sahnedeki sert üst sınır (520 → 420: hem denge hem fillrate)
  spawnDist:  60,     // ekran kenarından bu kadar dışarıda doğar
};

/* ── Boss ────────────────────────────────────────────────── */
export const BOSS = {
  name:      'KADİM HASATÇI',
  hp:        4100,        // 4600 → 4100: boss eğrisi (worlds.bossHpMul 0.34) ile birlikte
  speed:     60,
  radius:    47,
  dmg:       44,
  xp:        60,
  knockRes:  0.02,
  chargeCd:  6.0,
  chargeSpeed: 360,
  chargeTime:  0.7,
  spitCd:    3.0,
  spitCount: 12,
  bulletSpeed: 145,
  bulletDmg: 17,
};

/* ═══ BATAK EJDERİ — ZEHİR BATAKLIĞI'NIN BOSS'U (2026-08-29) ═══
   Model klipsiz ve YÜRÜME ANİMASYONU YOK (kullanıcı tespiti). Bu bir
   eksik değil, dövüşün tasarım kısıtı: ejder YÜRÜMEZ. Yer değiştirmesinin
   tek yolu ZIPLAMAKtır, yani her konum değişikliği oyuncuya önceden
   bildirilen bir OLAYdır. Hasat Lordu ile aynı kararın başka bir yüzü
   (o süzülür, bu sıçrar) — ikisi de "ayaklar yerde kaymasın" diye.

   ÜÇ SAYI DENGEYİ TUTAR:
   • spitCd 2.9 — üç bombalık salvo. Daha sık olsa saha zehirle kaplanır
     ve kaçış yeri kalmaz; daha seyrek olsa boss "duruyor" gibi görünür.
   • leapCd 6.4 — zıplama. Telegraf 0.78 sn oyuncunun kaçması için
     yeterli (tepki ~0.25 sn + iki adım). Boss'un hücum telegrafıyla
     (0.62) aynı sınıf.
   • spitSpread 96 — üç bombanın yan açıklığı. Oyuncu yarıçapının ~5 katı:
     "üçe ayrılmış" okunur ama aradan geçilebilir. Kaçış yolu BIRAKILIR. */
/** Sahada aynı anda yaşayabilen tehlike alanı sayısı — HAVUZ TAVANI ve
    GÖRSEL MESH SAYISI bu tek sayıdan türer (main.pools.hazards ve
    render3d.hazardMeshes). İkisi ayrı yazılıydı ve ayrıştı: havuz 14, mesh 8,
    yani dokuzuncu alan telegrafsız hasar veriyordu.
    12 ölçülmüş bir tavan: ejderin üç bombası (patlamadan sonra AYNI yuvada
    zehir gölüne dönüşürler, yani ek yuva istemezler) + zıplama alanı + iki
    kral nabzı + eşzamanlı koşucu patlamaları için pay. */
export const HAZARD_CAP = 12;

export const DRAGON = {
  spitCd:     2.9,
  spitCount:  3,
  spitTell:   0.85,      // bombanın yerdeki uyarı süresi
  spitR:      64,        // isabet yarıçapı
  spitDmg:    26,        // patlama anı
  poisonDur:  3.4,       // ardında kalan zehir gölü
  poisonDmg:  9,         // yarım saniyelik tik
  spitSpread: 96,
  leapCd:     6.4,
  leapTell:   0.78,      // kırmızı alan bu kadar önce çıkar
  leapTime:   0.42,      // havada geçen süre
  leapR:      104,
  leapDmg:    46,
  turnRate:   2.2,       // yerinde dönme hızı (rad/sn) — yürümüyor, dönüyor
};

/* ── Silahlar (5 seviye) ─────────────────────────────────── */
export const WEAPONS = {
  kilic: {
    name: 'Seher Kılıcı',
    descNew: 'Seher’in yanında süzülen ruh kılıcı — hedefine hilal bir kesik savurur.',
    descUp: ['Hasar +6, menzil biraz uzar', 'Daha çabuk savurur', 'Hasar +11, darbe sertleşir', 'Ağır hilal, geri tepme +'],
    dmg:      [14, 20, 28, 39, 53],
    cooldown: [0.90, 0.82, 0.76, 0.68, 0.60],
    /* MENZİL GERİ ÇEKİLDİ (2026-07-30): taban 202px + 5 kademe Uzun Kavis
       (×1.20⁵ = ×2.49) + girdap ×1.35 = ~680px, yani ekranın neredeyse
       tamamı. Yakın dövüş silahının bir DÖVÜŞ MESAFESİ olmalı; taban
       172'ye indi, kart çarpanı ×1.08'e düştü ve swordStrike içinde 300px
       sert tavan var. Yay da aynı sebeple kısıldı (195° → 178°). */
    range:    [118, 122, 126, 130, 134],
    /* YAY KADEMEYLE SABİT (2026-08-29) — unutulmuş DEĞİL, ölçülmüş karar:
       range ve arc birlikte büyüdüğünde kalabalık payı ÇARPIMSAL büyüyor
       ve yakın dövüş L5'te menzilliyi ikiye katlıyordu (_baltest ① ②).
       Kademe artık hasar + tempo satın alır. Yayı geri açan kişi descUp
       metinlerini de düzeltmek zorundadır. */
    arc:      [2.10, 2.10, 2.10, 2.10, 2.10],
    knock:    [240, 260, 285, 315, 360],
    /* ── SEHER İMZA SAYAÇLARI (kartlarla büyür; bkz. SIGNATURES.seher) ──
       Hepsi 0'dan başlar. applySpecial bu alanları ARTIRIR; hem oynanış
       (weapons.js updateSword) hem görsel (render3d _updateSword) okur.
       Alanların burada TANIMLI olması şarttir: applySpecial yalnızca zaten
       sayı olan alanlara ekleme yapar. */
    spin: 0,        // girdap: her N. savuruş 360° (kademe arttıkça sıklaşır)
    twin: 0,        // ikiz savuruş: ters yöne gecikmeli ek savuruş
    wave: 0,        // ay kesiği: savuruştan hilal dalga fırlar
    echo: 0,        // ruh yankısı: gecikmeli hayalet tekrar
    critAdd: 0,     // kılıç kritiği
    critMultAdd: 0, // kritik hasarı (oyuncu statine akar)
  },
  /* ── KALE PALASI — SAVAŞÇI'nın imza silahı ──
     Kılıç ile aynı motoru paylaşır (weapons.js updateSword artık silah
     kimliğine göre çalışır) — elde tutulan düz bir pala, floating değil.
     Sayaçlar (spin/twin/shock/critAdd/critMultAdd) SIGNATURES.savasci
     kartlarıyla büyür; wave/echo bilerek YOK — bu ikisi Seher'in süzülen
     kılıcına özel görsel gerektirir (bkz. render3d._buildSword). */
  pala: {
    name: 'Kale Palası',
    descNew: 'Nöbetçinin elinde sıkı tuttuğu ağır pala — önüne geleni yarar.',
    descUp: ['Hasar +6, menzil biraz uzar', 'Daha çabuk savurur', 'Hasar +12, darbe sertleşir', 'Ağır darbe, geri tepme +'],
    dmg:      [20, 26, 36, 48, 62],
    cooldown: [0.88, 0.80, 0.74, 0.66, 0.58],
    range:    [112, 116, 120, 124, 128],
    arc:      [2.05, 2.05, 2.05, 2.05, 2.05],
    knock:    [260, 285, 310, 345, 390],
    spin: 0,         // kasırga vuruşu: her N. savuruş 360° (imza)
    twin: 0,         // çifte vuruş: ters yöne gecikmeli ek savuruş (imza)
    shock: 0,        // sarsıcı darbe: her savuruş küçük şok dalgası (imza)
    critAdd: 0,
    critMultAdd: 0,
  },
  /* ── YEMİN KILICI — AYAZ'ın imza silahı (nadir kademe) ──
     kilic/tackilic/pala ile AYNI motoru paylaşır (weapons.updateSword id
     parametreli); ayrı bir mekanik motoru YOK, ayrımı sayılar + TABAN
     SAYACI yapar.

     KİMLİK: `shock` TABANDA 1'dir. Yani her savuruş (yankı hariç) darbe
     noktasında küçük bir ayaz halkası bırakır — kart gerektirmez, ilk
     koşudan itibaren görünür. Kadrodaki karşılıkları:
       • Kraliçe → taban `wave: 1`  (menzil: kesik ileri fırlar)
       • Ayaz    → taban `shock: 1` (temas: darbe noktası çatlar)
       • Seher / Savaşçı → taban sayaç YOK
     Böylece üç süzülen kılıç aynı rigi paylaşırken üç farklı şey öğretir.

     DENGE. signaturePower NADİR = ×1,12 (tablo: [1, 1, 1.12, 1.25, 1.45];
     indis nadirliktir — adi 1, nadir 2, destan 3, efsane 4). Yani taban
     sayılar koşuda ×1,12 ile çarpılır ve tablo BUNU hesaba katarak yazıldı.

     L1 tek hedef DPS (imza çarpanı + kahraman modu dahil):
       pala   (adi, ×1,00)    19,3   — Savaşçı'nın hasar modu yok
       YEMİN  (nadir, ×1,12)  21,8   — 16×1,12/0,88 = 20,4, sonra ×1,07
       kilic  (destan, ×1,25) 24,9   — 16×1,25/0,90 = 22,2, sonra ×1,12
     Merdiven kasıtlı ve aralıklar eşit: her kademe bir öncekinin ~%13
     üstünde. İlk sürüm 17 tabanla yazılmıştı ve ×1,12 çarpanı unutulduğu
     için destanın %97'sine çıkıyordu — üstelik BEDAVA alan hasarıyla.

     Kalabalıkta taban şok (hasar ×0,30, r 33) onu palanın belirgin üstüne
     çıkarır; tek hedefte kasıtlı olarak çıkarmaz.

     GERİ TEPME sınıfın en yükseği (300 → 450): şövalye hattı tutar,
     düşmanı üstünden atar. Yakın dövüşte hayatta kalmanın görünür aracı
     budur ve nadir kademede fazla hasar vermeden değer üretir.

     `echo` (Seher) ve `fan`/`judge` (Kraliçe) BİLEREK YOK: o üçü destan
     kahramanların kimlik mekanikleri. Alan tanımlı olmadığı için
     applySpecial onlara sessizce dokunmaz. */
  yemin: {
    name: 'Yemin Kılıcı',
    descNew: 'Ayaz’ın yanında süzülen yemin kılıcı — her darbede zemin ayazla çatlar.',
    descUp: ['Hasar +4, menzil biraz uzar', 'Daha çabuk savurur', 'Hasar +9, darbe sertleşir', 'Ağır yemin, geri tepme +'],
    dmg:      [13, 17, 24, 33, 45],
    cooldown: [0.88, 0.80, 0.74, 0.67, 0.60],
    range:    [120, 124, 128, 132, 136],
    arc:      [2.02, 2.02, 2.02, 2.02, 2.02],
    knock:    [300, 330, 360, 400, 450],
    shock: 1,        // TABAN: her savuruş ayaz halkası bırakır (kimlik)
    spin: 0,         // kasırga nöbeti: her N. savuruş 360° (imza)
    wave: 0,         // ayaz kesiği: savuruştan delip geçen dalga (imza)
    /* AYAZ KABUĞU — kadronun TEK TEPKİSEL mekaniği: oyuncu hasar aldığında
       tetiklenir, saldırı temposuyla ilgisi yoktur. twin (çifte savuruş)
       BİLEREK yok: Seher'de zaten var ve Gece Kraliçesi'nin yelpazesiyle
       görsel olarak neredeyse aynı okunuyordu — üç kılıç kahramanının
       birbirinden ayrışması gerekiyor. */
    carapace: 0,
    critAdd: 0,
    critMultAdd: 0,
  },
  /* ── MAVİ ALEV — GÖKALEV'in imza silahı ──
     'gun' sınıfının ortak motorunu kullanır (updateGun/fireGun/updateArrow) —
     yani volley/pierce/explode/homing/rain/flame sayakları ZATEN jeneriktir,
     yeni motor kodu gerekmez. Mermi yanan mavi bir kor topudur; iz ve
     patlama renkleri flameColor/orbGrad ile MAVİ hatta çekilir (varsayİlan
     turuncu/menekşe sabitler yerine). */
  alev: {
    name: 'Mavi Alev', kind: 'gun', class: 'buyu', orb: true, flameVisual: true, fireball: true,
    descNew: 'Gökalev’in yanında süzülen mavi alev — en yakın düşmana kor topu savurur, delip geçer.',
    descUp: ['Hasar +, +1 delme', 'Daha çabuk savurur', '+1 delme, hasar +', 'Ağır kor — hasar büyük artış'],
    dmg:      [24, 34, 46, 63, 83],
    pierce:   [1, 2, 2, 3, 4],
    cooldown: [1.00, 0.92, 0.85, 0.78, 0.72],
    speed:    445,
    /* ÇİFT ATIŞ KALDIRILDI (2026-08-18): L5'te volley 2 hasarı ikiye
       katlıyor, delme artışı da kalabalık payını %76 büyütüyordu — imza
       silahları L1'den L5'e ×13-19 büyüyor, yani geç koşuda menzilli
       efsane kahramanlar yakın dövüşün iki katı oluyordu (ölçüm:
       _baltest ②). İmza silahlarında tek mermi kalır, büyüme hasardan
       ve delmeden gelir; çift atış imza OLMAYAN silahlarda (ok/küre/
       tabanca/saçma) duruyor. */
    volley:   [1, 1, 1, 1, 1],
    spread:   0.15, bulletLife: 1.7, color: '#4fa8ff', r: 11,
    /* fireball: mermi 3B'de KÜRE DEĞİL, kameraya bakan yalım katmanları
       olarak çizilir (render3d addFire) ve isabette kendi flaşını bırakır
       (spawnFlameImpact). 'thunder' Şimşek'in sesi; alev kendi sesini seçer. */
    sfx: 'shoot',
    rainColor: '#7fc4ff',
    flame: 0,          // mavi kor izi kademesi (imza)
    explode: 0,        // alev patlaması (imza)
    nova: 0,           // MAVİ NOVA — isabette patlama (imza sig_a7)
    cyclone: 0,        // KOR KASIRGASI — yörüngedeki alev küreleri (imza sig_a8)
    homing: 0,         // takipçi alev (imza)
    rain: 0,           // alev yağmuru (imza)
    critAdd: 0,
    critMultAdd: 0,
  },
  /* ── TAÇ KILICI — GECE KRALİÇESİ'nin imza silahı ──
     Kılıç/pala ile AYNI motoru kullanır (weapons.updateSword) ama kimliği
     tersine çevrilmiştir: asıl hasarı bıçağın DEĞDİĞİ yer değil, savuruştan
     fırlayan MAVİ KESİK dalgası verir (League of Legends'ın Kayle'i gibi:
     temas şart değil). Bu yüzden `wave` 1'DEN BAŞLAR — diğer kılıçlarda
     kartla açılan mekanik burada tabandır.

     DENGE NOTU (2026-08-04 nerf): kesik hasarı tabanın %85'i değil %60'ı.
     Eski hâlinde yakınındaki düşman hem yaydan hem kesikten vuruluyordu
     (×1,85) ve L1 yakın mesafe DPS'i 28 çıkıyordu — DESTAN kademesindeki bu
     silah, EFSANE Seher Kılıcı'nı (17,8) %57 geçiyordu. Artık ×1,60:
     yakın mesafede Seher'le baş baş, MENZİLDE ise (yalnız kesik) belirgin
     zayıf. Kimlik korunuyor — kalabalıkta kazanır, tek hedefte kaybeder.
     Menzili de kısa (104-152 vs Seher 118-172). */
  tackilic: {
    name: 'Taç Kılıcı',
    descNew: 'Kraliçenin yanında süzlen taç kılıcı — her savuruşta ileriye mavi bir kesik fırlatır.',
    descUp: ['Hasar +3, kesik genişler', 'Daha çabuk savurur', 'Hasar +7, kesik güçlenir', 'Ağır hüküm, geri tepme +'],
    dmg:      [13, 16, 21, 28, 36],
    cooldown: [0.94, 0.86, 0.78, 0.68, 0.58],
    range:    [104, 108, 112, 116, 120],
    arc:      [2.02, 2.02, 2.02, 2.02, 2.02],
    knock:    [200, 220, 240, 265, 300],
    wave: 1,        // TABAN: her savuruş bir mavi kesik fırlatır
    waveR: 1,       // kesik yarıçapı çarpanı (imza kartıyla büyür)
    waveLife: 1,    // kesiğin uçuş süresi çarpanı = menzil
    fan: 0,         // üçlü/beşli kesik yelpazesi (imza)
    judge: 0,       // gök kılıcı: aralıklı devasa tekil hüküm (imza)
    spin: 0,
    twin: 0,
    echo: 0,
    critAdd: 0,
    critMultAdd: 0,
  },
  /* ── KAPTAN TOPU — KARA KAPTAN'ın imza silahı ──
     'gun' sınıfının ortak motoru; farkı AĞIR olması: yavaş mermi (400),
     uzun bekleme, büyük tek vuruş ve YUVARLAK gülle (r 13). Kartlar iki
     yeni mekanik açar: SAÇILAN GÜLLE (isabette 3-5 parçaya bölünme) ve
     BORDO ATEŞİ (aralıklı yedi gülleli yan ateş).

     cannonVisual: mermi karakterin gövdesinden değil, süzülen namlunun
     UCUNDAN çıkar (bkz. render3d._updateCannon → W.cannonPos/cannonAim).

     DENGE NOTU (2026-08-04 buff): "yavaş ama yıkıcı" kimliği sayılara
     yansımamıştı — eski hâli AYNI kademedeki (efsane) Mavi Alev'in her
     seviyede ALTINDAydi: L1 DPS 22,6 vs 24, delmesi daha az, mermisi daha
     yavaş. Yani yavaş VE zayıftı. Vuruş başına hasar +%23, bekleme hafif
     kısaldı, erken delme 1→2: artık L1 DPS 27,8 (Alev'in %16 üstü) — farkı
     yavaş mermi (400 vs 445), yüksek bekleme ve takip/yağmur mekaniklerinin
     tabanda olmaması dengeliyor. */
  topatar: {
    name: 'Kaptan Topu', kind: 'gun', class: 'atesli', orb: true, cannonVisual: true,
    /* SES: 'cannon' (audio.js). Bu satır olmadan `orb: true` dalı ŞİMŞEK'in
       'thunder' gürlemesine düşüyordu — kullanıcının şikâyet ettiği rahatsız
       edici ses buydu. Bir yan bayrağın (orb) ses seçmesi kaza; ses KİMLİK. */
    sfx: 'cannon',
    descNew: 'Kaptanın yanında süzülen hayalet topu — en yakın düşmana ağır bir gülle savurur.',
    descUp: ['Hasar +, +1 delme', 'Daha çabuk doldurur', '+1 delme, hasar +', 'Ağır bordo güllesi — hasar büyük artış'],
    dmg:      [26, 39, 56, 77, 100],
    pierce:   [1, 1, 2, 2, 3],
    cooldown: [1.08, 1.00, 0.93, 0.86, 0.78],
    speed:    400,
    volley:   [1, 1, 1, 1, 1],   // bkz. alev: imza silahlarında çift atış yok
    /* r 13 → 7: büyük gemi topundan değil KÜÇÜK TABANCA topundan çıkan
       gülle. Renk sıcak altın değil KOYU SOLUK GRİ döküm demir — gülle
       kendi başına ışımayan bir metal kütledir; ekrandaki tek parlak şey
       namlu ateşi ve barut dumanı olmalı. */
    spread:   0.11, bulletLife: 1.6, color: '#8d9096', r: 7, metallic: true,
    rainColor: '#8d9096', smokeTrail: true,
    /* sfx yok → fireGun `orb` dalından 'thunder' çalar: top sesi patlamalı */
    split: 0,       // saçılan gülle: isabette parçalara bölünür (imza)
    broadside: 0,   // bordo ateşi: aralıklı yedi gülleli yan ateş (imza)
    explode: 0,     // barut fıçısı: son hedefte patlama (imza)
    homing: 0,
    rain: 0,
    flame: 0,
    bounce: 0,
    critAdd: 0,
    critMultAdd: 0,
  },
  bicak: {
    name: 'Gölge Bıçakları',
    descNew: 'Etrafında yörüngede dönen koruyucu bıçaklar.',
    descUp: ['+1 bıçak', '+1 bıçak, hasar artar', '+1 bıçak, yörünge genişler', '+1 bıçak, daha hızlı döner'],
    count:  [2, 3, 4, 5, 6],
    dmg:    [10, 14, 18, 24, 31],
    radius: [68, 74, 80, 88, 97],
    spin:   [2.6, 2.8, 3.0, 3.2, 3.5],
    hitCd:  0.38,
  },
  kor: {
    name: 'Kor Çemberi', kind: 'zone', class: 'atesli',
    descNew: 'Yerde beliren ve içindekileri kavuran ateş alanı.',
    descUp: ['Daha sık belirir', '+1 eşzamanlı alan, DPS +', 'Alan büyür', '+1 alan, DPS büyük artış'],
    maxZones: [1, 1, 2, 2, 3],
    dps:      [10, 15, 20, 27, 36],
    radius:   [56, 62, 70, 78, 88],
    duration: 4.0,
    spawnCd:  [4.2, 3.5, 3.1, 2.7, 2.2],
  },
  yildirim: {
    name: 'Gök Gazabı', kind: 'magic', class: 'buyu',
    descNew: 'Rastgele düşmanlara inen yakıcı yıldırımlar.',
    descUp: ['Daha sık çakar', '+1 hedef, hasar +', '+1 hedef', '+1 hedef, hasar büyük artış'],
    targets:  [2, 3, 3, 4, 5],
    dmg:      [26, 36, 48, 62, 82],
    cooldown: [5.2, 4.5, 3.9, 3.3, 2.7],
    critBonus: 0.25,
  },
  ok: {
    name: 'Ruh Oku', kind: 'gun', class: 'ruh',
    descNew: 'En yakın düşmana kilitlenen, delip geçen hayalet ok.',
    descUp: ['+1 delme, hasar +', 'Daha hızlı atış', '+1 delme, hasar +', 'Çift ok fırlatır'],
    dmg:      [16, 22, 29, 38, 50],
    pierce:   [1, 2, 3, 4, 5],
    cooldown: [1.35, 1.15, 1.00, 0.86, 0.68],
    speed:    520,
    volley:   [1, 1, 1, 1, 2],
    spread:   0.14, bulletLife: 1.6, color: '#59e3c8',
    fireDelay: 0.38,   // yay gerilme süresi — ok, release karesinde çıkar
    arrow: true,       // gerçek ok görseli + yay ucundan çıkış
    bounce: 0,         // seken ok sayısı (imza skilli ile artar)
  },
  yay: {
    name: 'Ay Yayı', kind: 'gun', class: 'ruh', bowVisual: true,
    descNew: 'Yanında süzülen ruh yayı — en yakın düşmana kilitlenir, delip geçer.',
    descUp: ['+1 delme, hasar +', 'Daha hızlı gerilir', '+1 delme, hasar +', 'Ay okuyla — hasar büyük artış'],
    dmg:      [26, 38, 53, 73, 101],
    pierce:   [2, 2, 3, 4, 5],
    cooldown: [1.05, 0.95, 0.86, 0.77, 0.68],
    speed:    560,
    volley:   [1, 1, 1, 1, 1],   // bkz. alev: imza silahlarında çift atış yok
    spread:   0.13, bulletLife: 1.7, color: '#7fd8ff',
    fireDelay: 0.30,   // yay gerilme süresi — ok release karesinde çıkar
    arrow: true,       // gerçek ok görseli
    bounce: 0,         // seken ok sayısı (imza ile artar)
    flame: 0,          // alev kademesi (imza ile artar) — ok görünüşü + hasar
    /* seviye ile açılan imza yetenekleri bu sayaçları büyütür (bkz. SIGNATURES.okcu) */
    explode: 0,        // delme bitince patlama kademesi
    homing: 0,         // hedefi kovalama kademesi
    critAdd: 0,        // yaya özel kritik şansı
    critMultAdd: 0,    // yaya özel kritik hasarı
    rain: 0,           // ok sağanağı kademesi
  },
  /* ═══ KAVLAK SAPAN — SAPANCI'nın imza silahı ═══
     Adi kademe (signaturePower(1) = ×1.00). L1 tek hedef dps 14,5 — Kale
     Palası'nın (19,3) BELİRGİN altında ve bu kasıtlı: bedava kahraman
     sistemi öğretir, koşuyu bitirmez.

     DENGE REVİZYONU (2026-08-18) — üç şey aynı anda bozuktu:
     · bekleme 0,44-0,36 sn menzilli bir ADİ silah için çok hızlıydı
       (Ay Okçusu'na yakın tempo, bedavaya). 0,62-0,50'ye çıktı, hasar
       telafi olarak yükseldi: tempo düştü, dps neredeyse aynı kaldı —
       yani silah artık "makineli" değil "savuruş" okunuyor.
     · menzil 520-700 arena yarısını (950) buluyordu; oyuncu düşmanı
       göremeden vuruyordu ve yaklaşma gerilimi yoktu. 360-470'e indi
       (`updateGun` angajman kapısı bu sayıdan okunur — düşman YAKLAŞINCA
       ateşlenir, bekleme kapıda tüketilmez).
     · TABAN sekme kademe 1'de AÇIKTI: karakterin kimliği ilk atışta
       bedavaya geliyordu, yani "geliştirme" diye bir şey kalmıyordu.
       Artık kademe 3'te açılır; daha erken istenirse Yassı Taş (sig_s3)
       kartı vardır. Söz ("Seken Taş") duruyor, bedava değil.

     Mermi ömrü menzille birlikte kısaldı: speed 420 × life 1,1 = 462 px
     yol, yani taş angajman menzilinin biraz ötesinde düşer — kaçan düşmanı
     kovalar ama ekranın öbür ucuna varmaz.

     bounceLv TABAN sekmedir (kart gerektirmez); kartla gelen `bounce` onun
     ÜSTÜNE eklenir — weapons.js ikisini toplar. İki ayrı alan olmasının
     sebebi: applySpecial yalnız skaler alanlara ekleme yapar, kademe
     tablosuna dokunamaz.

     `flame` ve `homing` BİLEREK TANIMSIZ: o kartlar havuza girse bile
     applySpecial sessizce dokunmaz (bkz. CLAUDE.md — alan yoksa kart ölü). */
  sapan: {
    name: 'Kavlak Sapan', kind: 'gun', class: 'atesli', slingVisual: true,
    descNew: 'Yanında süzülen deri sapan — yaklaşan düşmana taş savurur. Ustalaştıkça taş sekip ikinciyi de vurur.',
    descUp: ['Hasar +, menzil +', '+1 delme, TAŞ SEKMEYE BAŞLAR', 'Hasar +, daha sık savurur', 'Taş bir kez daha seker'],
    /* v44 DENGE: L5 hedefin %22,6 altındaydı (L5/L1 ×4,24). Üst iki kademe
       +%12 / +%17 hasar, L5 bekleme 0,44 → 0,42 → L5 ≈ +%22, L5/L1 ≈ ×5,2
       (bant 3,0-6,5). L1-L3 dokunulmadı: erken oyun hissi aynı. */
    dmg:      [18, 23, 31, 48, 70],
    pierce:   [1, 1, 1, 2, 2],
    cooldown: [0.55, 0.52, 0.50, 0.47, 0.42],
    range:    [360, 385, 410, 435, 470],
    speed:    420,
    volley:   [1, 1, 1, 1, 1],
    spread:   0.10, bulletLife: 1.1, color: '#c9bfa8', r: 8,
    stone: true,        // taş görseli (ışımayan, mat) — bkz. render3d _pushStones
    bounceLv: [0, 1, 1, 2, 2],   // TABAN sekme kademe 2'de AÇILIR (bkz. yukarı)
    /* seviye ile açılan imza yetenekleri bu sayaçları büyütür (SIGNATURES.sapanci) */
    bounce: 0,          // kartla eklenen ek sekme
    shatter: 0,         // sekerken üçe ayrılma kademesi
    rain: 0,            // taş yağmuru kademesi
    knock: 1,           // geri tepme çarpanı (GÜLLE ×2 yapar)
    critAdd: 0,
    critMultAdd: 0,
  },
  kure: {
    name: 'Ay Küresi', kind: 'gun', class: 'buyu', orb: true,
    descNew: 'Asasını savurup en yakın düşmana süzülen ay enerjisi küresi — delip geçer.',
    descUp: ['Hasar +, +1 delme', 'Daha hızlı savurur', '+1 delme, hasar +', 'Çift küre fırlatır'],
    dmg:      [22, 26, 31, 34, 37],
    pierce:   [1, 2, 2, 3, 4],
    cooldown: [1.05, 0.92, 0.80, 0.68, 0.56],
    speed:    430,
    volley:   [1, 1, 1, 1, 2],
    spread:   0.16, bulletLife: 1.7, color: '#c79bff', r: 11,
  },
  bomba: {
    name: 'Kor Havanı',
    descNew: 'Sürünün ortasına kor dolu fıçı fırlatır — alan patlaması.',
    descUp: ['Daha sık fırlatır', 'Hasar ve alan artar', 'Daha da sık fırlatır', 'Devasa patlama'],
    dmg:      [42, 56, 74, 98, 132],
    radius:   [72, 80, 88, 98, 112],
    cooldown: [3.4, 3.0, 2.7, 2.3, 1.9],
    fuse:     0.85,     // fıçının uçuş süresi (sn)
  },
  tabanca: {
    name: 'Kemik Tabanca', kind: 'gun', class: 'atesli',
    descNew: 'En yakına hızlı tek kurşun sıkar — yüksek atış hızı.',
    descUp: ['Hasar +, daha hızlı', '+1 delme', 'Daha hızlı atış', 'Çift kurşun'],
    dmg:      [11, 14, 16, 19, 22],
    pierce:   [0, 0, 1, 1, 2],
    cooldown: [0.55, 0.47, 0.40, 0.34, 0.28],
    speed:    620,
    volley:   [1, 1, 1, 1, 2],
    spread:   0.05, bulletLife: 1.1, color: '#ffd08a',
  },
  sacma: {
    name: 'Saçma Namlu', kind: 'gun', class: 'atesli',
    descNew: 'Yelpaze halinde saçma savurur — yakın mesafede yıkıcı.',
    descUp: ['+1 saçma, hasar +', 'Daha geniş yelpaze', '+2 saçma', 'Hasar büyük artış'],
    dmg:      [8, 9, 11, 12, 15],
    pierce:   [0, 0, 0, 1, 1],
    cooldown: [1.15, 1.02, 0.90, 0.78, 0.64],
    speed:    480,
    volley:   [4, 5, 5, 7, 8],
    spread:   0.62, bulletLife: 0.42, color: '#ff8a3c',
  },
  /* ── ŞİMŞEK KIRIĞI — efsanevi kahramanın imza silahı ──
     En yakın düşmana çarpar, sonra ZİNCİRLEME olarak yakındaki başka
     düşmanlara sıçrar (chains kademesi). Her sıçramada hasar chainFalloff
     ile azalır. Sayaçlar (chain/shock/knock/storm) SIGNATURES.simsek
     kartlarıyla büyür — applySpecial yalnızca burada TANIMLI alanlara
     ekleme yapar. */
  simsek: {
    name: 'Şimşek Kırığı', kind: 'magic', class: 'buyu',
    descNew: 'Şimşek’in yanında süzülen gökyüzü parçası — en yakın düşmana çarpar, yakındakilere zincirleme sıçrar.',
    descUp: ['Hasar +, bir hedefe daha sıçrar', 'Daha çabuk çakar', 'Sıçrama menzili genişler, hasar +', 'Bir hedefe daha sıçrar, hasar büyük artış'],
    dmg:        [17, 23, 31, 40, 50],
    cooldown:   [0.92, 0.84, 0.77, 0.70, 0.62],
    range:      [330, 350, 370, 395, 425],
    chains:     [2, 3, 3, 4, 5],
    chainRange: [150, 162, 175, 190, 208],
    chainFalloff: 0.80,
    chain: 0,        // zincirleme: ekstra sıçrama (imza)
    shock: 0,        // şok dalgası: her sıçramada küçük alan patlaması (imza)
    knock: 0,        // yıkıcı çarpma: geri tepme çarpanı kademesi (imza)
    storm: 0,        // fırtına çağrısı: bağımsız periyodik büyük vuruş kademesi (imza)
    critAdd: 0,
    critMultAdd: 0,
  },
};

/* Seviye kartlarında gösterilen silah istatistikleri:
   [configAnahtarı, etiket, birim?] */
export const WEAPON_STATS = {
  kilic:    [['dmg', 'Hasar'], ['cooldown', 'Bekleme', 'sn'], ['range', 'Menzil']],
  tackilic: [['dmg', 'Hasar'], ['cooldown', 'Bekleme', 'sn'], ['range', 'Menzil']],
  topatar:  [['dmg', 'Hasar'], ['pierce', 'Delme'], ['cooldown', 'Bekleme', 'sn']],
  pala:     [['dmg', 'Hasar'], ['cooldown', 'Bekleme', 'sn'], ['range', 'Menzil']],
  bicak:    [['count', 'Bıçak'], ['dmg', 'Hasar'], ['radius', 'Yörünge']],
  kor:      [['dps', 'Alan DPS'], ['radius', 'Yarıçap'], ['maxZones', 'Alan']],
  yildirim: [['targets', 'Hedef'], ['dmg', 'Hasar'], ['cooldown', 'Bekleme', 'sn']],
  ok:       [['dmg', 'Hasar'], ['pierce', 'Delme'], ['cooldown', 'Bekleme', 'sn']],
  yay:      [['dmg', 'Hasar'], ['pierce', 'Delme'], ['cooldown', 'Bekleme', 'sn']],
  kure:     [['dmg', 'Hasar'], ['pierce', 'Delme'], ['cooldown', 'Bekleme', 'sn']],
  alev:     [['dmg', 'Hasar'], ['pierce', 'Delme'], ['cooldown', 'Bekleme', 'sn']],
  bomba:    [['dmg', 'Hasar'], ['radius', 'Yarıçap'], ['cooldown', 'Bekleme', 'sn']],
  tabanca:  [['dmg', 'Hasar'], ['cooldown', 'Bekleme', 'sn'], ['pierce', 'Delme']],
  sacma:    [['dmg', 'Hasar'], ['volley', 'Saçma'], ['cooldown', 'Bekleme', 'sn']],
  simsek:   [['dmg', 'Hasar'], ['chains', 'Zincir'], ['cooldown', 'Bekleme', 'sn']],
};

/* ── Silah sınıfları (build kimliği) ── */
export const WEAPON_CLASSES = {
  kesici: { name: 'Kesici', color: '#e8e4d8' },
  ruh:    { name: 'Ruh',    color: '#59e3c8' },
  atesli: { name: 'Ateşli', color: '#b87351' },
  buyu:   { name: 'Büyü',   color: '#9b6cff' },
};

/* ── SINIF SİNERJİLERİ (koşu içi, Brotato tarzı) ──
   Aynı sınıftan N silah taşıyana kalıcı koşu bonusu. Silah
   kazanıldığı an kontrol edilir; eşik aşılınca bir kez uygulanır. */
export const CLASS_SYNERGIES = {
  ruh: [
    { need: 2, name: 'Ruh Bağı',      desc: 'Saldırı hızı +%8',           mods: { atkPct: 0.08 } },
  ],
  atesli: [
    { need: 2, name: 'Barut Kokusu',  desc: 'Patlama şansı +%8',           mods: { explodeChance: 0.08 } },
    { need: 3, name: 'Yangın Hattı',  desc: 'Patlama hasarı +%30',         mods: { explodeDmgPct: 0.30 } },
  ],
  buyu: [
    { need: 2, name: 'Kadim Akım',    desc: 'Saldırı hızı +%8, çekim +%20', mods: { atkPct: 0.08, magnetPct: 0.20 } },
  ],
};

/* ── ÖZEL PERKLER (build evrimleri) ──
   Bir silahı 3. seviyeye taşıyan oyuncunun kart havuzuna girer;
   seçilirse o silahı kalıcı dönüştürür. Her biri koşu başına 1 kez. */
export const SPECIAL_PERKS = [
  { id: 'kanoragi',   name: 'Kan Orağı',       icon: 'kilic',    need: { weapon: 'kilic',    lvl: 3 },
    desc: 'Kılıç hasarı +%40, yay +%25 genişler.',
    boost: { weapon: 'kilic',    dmg: 1.4, arc: 1.25 } },
  { id: 'hayalet',    name: 'Hayalet Yağmuru',  icon: 'ok',       need: { weapon: 'ok',       lvl: 3 },
    desc: 'Ruh Oku çift atılır, delme +2.',
    boost: { weapon: 'ok',       volley: 1, pierce: 2 } },
  { id: 'ciftnamlu',  name: 'Çift Namlu',       icon: 'tabanca',  need: { weapon: 'tabanca',  lvl: 3 },
    desc: 'Her tetikte +1 kurşun, bekleme −%15.',
    boost: { weapon: 'tabanca',  volley: 1, cd: 0.85 } },
  { id: 'domuzfisek', name: 'Domuz Fişeği',     icon: 'sacma',    need: { weapon: 'sacma',    lvl: 3 },
    desc: 'Yelpazeye +3 saçma, hasar +%20.',
    boost: { weapon: 'sacma',    volley: 3, dmg: 1.2 } },
  { id: 'kiyametfi',  name: 'Kıyamet Fıçısı',   icon: 'bomba',    need: { weapon: 'bomba',    lvl: 3 },
    desc: 'Patlama alanı +%30, hasarı +%30.',
    boost: { weapon: 'bomba',    dmg: 1.3, radius: 1.3 } },
  { id: 'cehennem',   name: 'Cehennem Ağzı',    icon: 'kor',      need: { weapon: 'kor',      lvl: 3 },
    desc: 'Kor alanı %40 daha kavurucu, %20 geniş.',
    boost: { weapon: 'kor',      dmg: 1.4, radius: 1.2 } },
  { id: 'kasirga',    name: 'Gölge Kasırgası',  icon: 'bicak',    need: { weapon: 'bicak',    lvl: 3 },
    desc: 'Yörüngeye +2 bıçak, %25 hızlı dönüş.',
    boost: { weapon: 'bicak',    count: 2, spin: 1.25 } },
  { id: 'gokyarigi',  name: 'Gök Yarığı',       icon: 'yildirim', need: { weapon: 'yildirim', lvl: 3 },
    desc: 'Yıldırım +2 hedef vurur, hasar +%25.',
    boost: { weapon: 'yildirim', targets: 2, dmg: 1.25 } },
  { id: 'ayfirtinasi', name: 'Ay Fırtınası',     icon: 'kure',     need: { weapon: 'kure',     lvl: 3 },
    desc: 'Küre çiftlenir, delme +2, hasar +%25.',
    boost: { weapon: 'kure',     volley: 1, pierce: 2, dmg: 1.25 } },
  { id: 'alevyagmuru', name: 'Alev Yağmuru',    icon: 'yay',      need: { weapon: 'yay',      lvl: 3 },
    desc: 'Her gerişte +1 tutuşan ok, delme +2.',
    boost: { weapon: 'yay',      volley: 1, pierce: 2, flame: 1 } },
];

/* ── Silah kimliği — HER SİLAH BİR KAHRAMANIN İMZASIDIR ──
   hero: bu silahı yalnız o kahraman(lar) kullanabilir; başkasının
   koşusunda kart havuzuna da Kara Pazar'a da GİRMEZ. hero'suz
   silahlar nötrdür (herkese açık). 'silahsor' gelecek kahraman
   için rezervdir. */
export const WEAPON_META = {
  kilic:    { class: 'kesici', unlock: 0, hero: ['seher'] },
  tackilic: { class: 'kesici', unlock: 0, hero: ['kralice'] },
  topatar:  { class: 'atesli', unlock: 0, hero: ['korsan'] },
  pala:     { class: 'kesici', unlock: 0, hero: ['savasci'] },
  yemin:    { class: 'kesici', unlock: 0, hero: ['sovalye'] },
  /* Kadro Ay Okçusu + Seher'e indirildiğinde sahipsiz kalan imza silahları
     NÖTRE çevrildi: sahibi olmayan bir silah 'hero' listesiyle kilitli
     kalırsa hiçbir koşuda kart havuzuna girmez ve cephanelik boşalır. */
  ok:       { class: 'ruh',    unlock: 0 },
  yay:      { class: 'ruh',    unlock: 0, hero: ['okcu'] },
  kure:     { class: 'buyu',   unlock: 0 },
  bicak:    { class: 'ruh',    unlock: 0 },
  tabanca:  { class: 'atesli', unlock: 0 },
  sacma:    { class: 'atesli', unlock: 0 },
  kor:      { class: 'atesli', unlock: 0 },
  bomba:    { class: 'buyu',   unlock: 0 },
  yildirim: { class: 'buyu',   unlock: 0 },
  simsek:   { class: 'buyu',   unlock: 0, hero: ['simsek'] },
  alev:     { class: 'buyu',   unlock: 0, hero: ['gokalev'] },
};

/* Başlangıç cephanelik slotu (koşuya kaç silahla girilir) */
export const WEAPON_SLOTS = { start: 3, max: 5, unlockPrice: [180, 320] };

/* ═══════════ KARAKTERLER (Brotato referans) ═══════════
   Ana karakter bedava; diğerleri Altın ile açılır.
   Her karakter: başlangıç silahı (slot harcamaz) + kalıcı kimlik
   modları + çizim paleti (pelerin/kapüşon/göz/nişan).
   style: 'melee' ana vuruşu yakın, 'ranged' uzaktan. */
export const CHARACTERS = {
  okcu: {
    id: 'okcu', rarity: 2,
    name: 'AY OKÇUSU', title: 'Elf Nişancı', price: 220, stonePrice: 40, style: 'ranged',
    startWeapon: 'yay',
    lore: 'Solgun ormanın derinliğinden gelen elf nişancı; yanında süzülen ruh yayı, o yürürken kendi kendine avlanır.',
    mods: { atkPct: 0.08, speedPct: 0.05, maxHp: -10 },
    perks: ['İmza: Ay Yayı — yanında süzülen otomatik yay', 'Saldırı hızı +%8, hız +%5', 'Azami can −10', '3D animasyonlu model — yürür, yay tek başına saldırır'],
    colors: { cloak: '#2f5c3a', hood: '#3f7a4c', eye: '#7fd8ff', emblem: '#7fd8ff', rim: 'rgba(127,216,255,0.48)' },
    emblem: 'arrow',
  },
  /* ═══ SAPANCI — ADİ KADEMENİN MENZİLLİSİ ═══
     Nadirlik × mesafe ızgarasında adi-menzilli kutusu boştu: Savaşçı (adi)
     yakın dövüş, Ay Okçusu ise nadir. Sapancı o kutuyu dolduruyor ve
     Savaşçı ile KASITLI zıt kutup: ucuz, kırılgan, çevik ve uzaktan.

     Öğrettiği ders SEKME — oyuncu ilk kez tek düşmanı değil HATTI hedefler,
     iki düşmanın dizilmesini bekler. Bu ders sonra Hasatçı'nın dönen
     orağında karşılığını bulur.

     Tavanı bilerek düşük: taban dps kadronun en zayıfı ve efsanevi kartı
     (GÜLLE) TAKASLI — hasarı büyütürken sekmeyi bozar. Bedava kahramanın
     geç oyunda ücretli kahramanların işini yapmaması için. */
  sapanci: {
    id: 'sapanci', rarity: 1,
    name: 'SAPANCI', title: 'Seken Taş', price: 90, stonePrice: 14, style: 'ranged',
    startWeapon: 'sapan',
    lore: 'Kızıl Hasat tarlasının bekçisi. Kuş kovmak için sapan sallamayı öğrenmiş bir çocuktu; kovduğu şey değişti, sapanı değişmedi. Deri kese şimdi yanında havada süzülüyor ve o yürüdükçe kendi kendine savuruyor.',
    mods: { atkPct: 0.06, speedPct: 0.05, maxHp: -4 },
    perks: [
      'İmza: Kavlak Sapan — yanında süzülen deri sapan',
      'Kısa menzil — düşman yaklaşınca savurur',
      'Sapan ustalaşınca taş sekip ikinciyi de vurur',
      'Hız +%6, azami can −4',
      'Adi — ilk koşuda alınabilir',
    ],
    colors: { cloak: '#2e2e33', hood: '#a83a32', eye: '#ffe6b0', emblem: '#c9bfa8', rim: 'rgba(201,191,168,0.45)' },
    emblem: 'arrow',
  },
  /* ═══ SEHER — DESTAN (epik) KAHRAMAN ═══
     Tasarım niyeti: oyunun ilk PREMİUM hissiyatlı kahramanı. Kılıcı elinde
     DEĞİL; yanında havada süzülen bir ruh kılıcıdır (render3d _updateSword).
     Nadirliği destan olduğu için imza silahı signaturePower(3) = ×1.25 ile
     başlar ve seviye ile açılan beş efsanevi kartı vardır (SIGNATURES.seher):
     girdap, ikiz savuruş, ay kesiği, ruh yankısı, seher nişanı. */
  seher: {
    id: 'seher', rarity: 3,
    name: 'SEHER', title: 'Süzülen Kılıç', price: 900, stonePrice: 95, style: 'melee',
    startWeapon: 'kilic',
    lore: 'Solgun ormanın tan vaktinde yürüyen ak saçlı savaşçı. Kılıcını yıllar önce elinden bıraktı; o gün beri kılıç yanında havada süzülüyor ve o vurdukça kendi savuruşunu yapıyor.',
    mods: { dmgPct: 0.12, atkPct: 0.08, critChance: 0.04 },
    perks: [
      'İmza: Seher Kılıcı — yanında havada süzülen ruh kılıcı',
      'Hasar +%12, saldırı hızı +%8, kritik +%4',
      'Seviye ile açılan 5 efsanevi kılıç yeteneği',
      'Destan — Altın ya da Gem ile açılır',
    ],
    colors: { cloak: '#6b4a2e', hood: '#8a6438', eye: '#ffe6b0', emblem: '#ffd98a', rim: 'rgba(255,222,158,0.5)' },
    emblem: 'star',
  },
  /* ═══ ŞİMŞEK — EFSANE (efsanevi) KAHRAMAN ═══
     Kadronun ilk EFSANE kademeli kahramanı — Seher'in destan kademesinin
     bir üstü. İmza silahı da elde DEĞİL: aynı desen, yanında havada süzülen
     bir gökyüzü parçası (bkz. render3d._buildLightningShard). Farkı: sabit
     bir yay/kılıç savuruşu değil, en yakın düşmana çarpıp yakındakilere
     ZİNCİRLEME sıçrayan bir güç (bkz. weapons.fireChain). */
  simsek: {
    id: 'simsek', rarity: 4,
    name: 'ŞİMŞEK', title: 'Süzülen Yıldırım', price: 1400, stonePrice: 150, style: 'ranged',
    startWeapon: 'simsek',
    lore: 'Fırtınanın tam ortasında doğduğu söylenir; gökyüzü onu hiç terk etmedi. Elinden düşen gökyüzü parçası şimdi yanında süzülüyor ve o yürüdükçe düşmandan düşmana sıçrıyor.',
    mods: { dmgPct: 0.13, atkPct: 0.10, critChance: 0.05 },
    perks: [
      'İmza: Şimşek Kırığı — yanında süzülen gökyüzü parçası',
      'Hasar +%13, saldırı hızı +%10, kritik +%5',
      'Seviye ile açılan 5 efsanevi fırtına yeteneği',
      'Efsane — kadronun en nadir kademesi',
    ],
    colors: { cloak: '#1c2a4a', hood: '#2e3f6e', eye: '#bfe8ff', emblem: '#7fdfff', rim: 'rgba(150,220,255,0.52)' },
    emblem: 'bolt',
  },
  /* ═══ SAVAŞÇI — ADİ (en yaygın) KAHRAMAN ═══
     Kadronun ilk "adi" kademeli kahramanı — imza silahı floating DEĞİL,
     elde tutulan düz bir pala (bkz. render3d._buildBlade). Kimliği süs
     değil dayanıklılık: can+zırh, mütevazı sayı artışları. Signature
     kartları kilic ile AYNI motoru (weapons.js updateSword) paylaşır,
     silah id'siyle ayrışır. */
  savasci: {
    id: 'savasci', rarity: 1,
    name: 'SAVAŞÇI', title: 'Kale Nöbetçisi', price: 70, stonePrice: 12, style: 'melee',
    startWeapon: 'pala',
    lore: 'Kalenin nöbet kulesinde büyüdü, palasını babasından öğrendi. Ne sihri var ne unvanı — sadece asla kaçmayan bir omuz.',
    mods: { maxHp: 15, armor: 1 },
    perks: [
      'İmza: Kale Palası — elde tutulan, dürüst bir pala',
      'Azami can +15, zırh +1',
      'Seviye ile açılan 5 nöbetçi yeteneği',
      'Adi — kadronun en yaygın kademesi',
    ],
    colors: { cloak: '#4a5262', hood: '#5c6575', eye: '#dfe4ec', emblem: '#b8c0cc', rim: 'rgba(184,192,204,0.42)' },
    emblem: 'shield',
  },
  /* ═══ GÖKALEV — EFSANE kademe, mavi ateş büyücüsü ═══
     İmza silahı yine elde değil: yanında süzülen bir MAVİ ALEV (prosedürel
     model — bkz. render3d._buildFlame; gövdesi mavi, uçları kızıl). Kimliği
     saf büyü hasarı: Şimşek zincirleme yayılırken Gökalev tek hedefe delip
     geçen kor topları savurur ve kartlarla ateş mekaniklerini açar. */
  gokalev: {
    id: 'gokalev', rarity: 4,
    name: 'GÖKALEV', title: 'Mavi Ateş Büyücüsü', price: 1500, stonePrice: 160, style: 'ranged',
    startWeapon: 'alev',
    lore: 'Kitaplarını yıllarca mavi bir alevin ışığında okudu; o alev artık sönmüyor, peşinden geliyor. Dokunduğu şey ısınmaz — doğrudan kül olur.',
    mods: { dmgPct: 0.14, atkPct: 0.08, critChance: 0.05, maxHp: -5 },
    perks: [
      'İmza: Mavi Alev — yanında süzülen mavi ateş',
      'Hasar +%14, saldırı hızı +%8, kritik +%5, can −5',
      'Seviye ile açılan 5 efsanevi ateş yeteneği',
      'Efsane — kadronun en nadir kademesi',
    ],
    colors: { cloak: '#2b2f6e', hood: '#3d47a0', eye: '#9fd8ff', emblem: '#6fb7ff', rim: 'rgba(120,180,255,0.52)' },
    emblem: 'flame',
  },
  /* ═══ KARA KAPTAN — EFSANE kademe, top atar hayalet korsan ═══
     İmza silahı yine elde değil: yanında süzülen bir HAYALET TOPU (bkz.
     render3d._buildCannon) — namlusu en yakın düşmanı kendi kendine takip
     eder ve gülle namlunun ucundan çıkar. Kimliği AĞIRLIK: Gökalev delip
     geçen hızlı kor topları savururken Kaptan yavaş ama yıkıcı gülleler
     atar; kartları gülleyi PARÇALARA böler (saçılan gülle) ve aralıklı
     yan ateş (bordo) açar. Bu yüzden canı artı (+10): menzilli ama yavaş
     tempolu bir kahramanın kalabalığı göğüslemesi gerekir. */
  korsan: {
    id: 'korsan', rarity: 4,
    name: 'KARA KAPTAN', title: 'Hayalet Top Atar', price: 1600, stonePrice: 175, style: 'ranged',
    startWeapon: 'topatar',
    lore: 'Gemisi kırk yıl önce battı; o batmadı. Kemikleri tuz tuttu, ceketinin sırması hiç solmadı. Elinden düşen top artık yanında süzülüyor ve her gece kendine yeni bir hedef seçiyor.',
    mods: { dmgPct: 0.16, atkPct: 0.09, critChance: 0.045, maxHp: 4 },
    perks: [
      'İmza: Kaptan Topu — yanında süzülen hayalet top',
      'Hasar +%15, saldırı hızı +%8, kritik +%4, can +10',
      'Seviye ile açılan 5 efsanevi barut yeteneği',
      'Efsane — kadronun en nadir kademesi',
    ],
    colors: { cloak: '#1f4a33', hood: '#2f6b45', eye: '#ff4a3c', emblem: '#f5c044', rim: 'rgba(245,192,68,0.5)' },
    emblem: 'cleaver',
  },
  /* ═══ GECE KRALİÇESİ — DESTAN (epik) kademe, alan vuran kılıç ═══
     Seher ile AYNI süzülen-kılıç dilini konuşur ama oynanışı tam zıttır:
     Seher bıçağın değdiği yeri biçer, Kraliçe KESİĞİN İZLERİYLE vurur —
     her savuruş ileriye mavi bir hüküm dalgası fırlatır, temas şart değil.
     Bu yüzden taban hasarı ve menzili kısa tutulur (bkz. WEAPONS.tackilic
     denge notu): tek hedefte değil KALABALIKTA kazanır. */
  kralice: {
    id: 'kralice', rarity: 3,
    name: 'GECE KRALİÇESİ', title: 'Mavi Kesik', price: 950, stonePrice: 105, style: 'melee',
    startWeapon: 'tackilic',
    lore: 'Tacını kendi eliyle dövdü, tahtını kendi eliyle bıraktı. Taç kılıcı artık avucunda değil yanında süzlüyor; o savurduğu her yerde geriye mavi bir hüküm izi kalıyor.',
    mods: { dmgPct: 0.04, atkPct: 0.04, critChance: 0.02, maxHp: 20 },
    perks: [
      'İmza: Taç Kılıcı — her savuruşta ileriye mavi kesik fırlatır',
      'Alan vurur: kılıcın değmesi şart değil',
      'Hasar +%6, saldırı hızı +%5, kritik +%2, can +5',
      'Destan — Altın ya da Gem ile açılır',
    ],
    colors: { cloak: '#432a6e', hood: '#5c3a95', eye: '#bfe3ff', emblem: '#c9a6ff', rim: 'rgba(160,200,255,0.5)' },
    emblem: 'star',
  },
  /* ═══ AYAZ — NADİR (mavi) kademe, sur şövalyesi ═══
     Kadronun ilk NADİR yakın dövüşçüsü ve okçudan sonraki ikinci nadir
     kahramanı. İkisi kasıtlı olarak zıt kutuplardır: okçu kırılgan-hızlı
     (can −10), Ayaz dayanıklı-ağır (can +12, zırh +1).

     Kimliği "hattı tutmak"tır: en yüksek geri tepme ve her savuruşta
     TABANDAN gelen ayaz halkası (bkz. WEAPONS.yemin `shock: 1`). Savaşçı
     ile aynı dürüst yakın dövüş hattında durur ama bir kademe üstündedir —
     farkı süs değil, +%7 hasar ve taban şok.

     İmza kılıcı elde DEĞİL: Seher ve Gece Kraliçesi ile aynı süzülen kılıç
     rigini paylaşır (render3d SWORD_SPECS.yemin, buz paleti). */
  sovalye: {
    id: 'sovalye', rarity: 2,
    name: 'AYAZ', title: 'Sur Şövalyesi', price: 260, stonePrice: 45, style: 'melee',
    startWeapon: 'yemin',
    lore: 'Sur kapısını kırk kış tek başına tuttu; yemin ettiği gün kılıcını taşa sapladı, taş onu geri vermedi. O gün beri kılıç avucunda değil yanında süzülüyor ve her indiğinde zemin ayazla çatlıyor.',
    mods: { dmgPct: 0.07, maxHp: 12, armor: 1 },
    perks: [
      'İmza: Yemin Kılıcı — yanında süzülen buz kılıcı',
      'Her savuruş zemine ayaz halkası bırakır (taban)',
      'Hasar +%7, azami can +12, zırh +1',
      'Nadir — Altın ya da Gem ile açılır',
    ],
    colors: { cloak: '#2e4a6b', hood: '#42688f', eye: '#8ff0ff', emblem: '#9fe8ff', rim: 'rgba(150,232,255,0.5)' },
    emblem: 'shield',
  },
};
/* ═══════════ SAVAŞ GEÇİŞİ (Battle Pass) ═══════════
   50 kademe · ÜCRETSİZ + PREMİUM (Gem ile) hat.
   Her görev tamamlaması Geçiş XP'si verir; kademe XP eşiğini
   geçince açılır, dokunarak alınır. Kahraman ödülleri (nadir/
   destan/efsane) şimdilik gizli "?" kart — hangi kahramanın
   hangi kademeye gireceği sonradan netleşecek; kart açıldığında
   o nadirlikten sahip olunmayan bir kahraman rastgele verilir. */
export const BATTLE_PASS = {
  maxTier: 50,
  xpPerTier: 120,
  premiumPrice: 280,       // Gem
  season: 'SEZON I — KIZIL AY',
};

/* Sandık planı (kitap sayfaları):
   ÜCRETSİZ (sol sayfa) — 2 yaygın, sona doğru 1 epik, finalde efsane.
   PREMİUM (sağ sayfa) — 2 yaygın, 3 nadir, 2 epik, 2 efsane, finalde mistik. */
const BP_FREE_CHESTS = { 15: 'yaygin', 28: 'yaygin', 42: 'kan', 50: 'kadim' };
const BP_PREM_CHESTS = { 6: 'yaygin', 9: 'kemik', 13: 'yaygin', 21: 'kemik', 26: 'kan', 30: 'kadim', 33: 'kemik', 44: 'kan', 47: 'kadim', 50: 'mistik' };

/** 50 kademelik ödül planı — programatik üretilir (elle 100 satır yazmak yerine). */
export const BATTLE_PASS_TIERS = (() => {
  const tiers = [];
  for (let i = 1; i <= 50; i++) {
    let free, premium;
    if (i % 10 === 0) {
      free = { kind: 'rubies', amount: 60 + i * 4 };
      premium = { kind: 'char', hidden: true, rarity: Math.min(4, 1 + i / 10) };
    } else if (i % 5 === 0) {
      free = { kind: 'rubies', amount: 45 + i * 4 };
      premium = { kind: 'stone', amount: 6 + Math.floor(i / 5) * 2 };
    } else if (i % 3 === 0) {
      free = { kind: 'rubies', amount: 18 + i * 2 };
      premium = { kind: 'gear', rarityMax: Math.min(4, 1 + Math.floor(i / 12)) };
    } else {
      free = { kind: 'rubies', amount: 14 + i * 2 };
      premium = { kind: 'rubies', amount: 32 + i * 3 };
    }
    if (BP_FREE_CHESTS[i]) free = { kind: 'chest', chest: BP_FREE_CHESTS[i] };
    if (BP_PREM_CHESTS[i]) premium = { kind: 'chest', chest: BP_PREM_CHESTS[i] };
    tiers.push({ tier: i, free, premium });
  }
  return tiers;
})();

export const DEFAULT_CHAR = 'okcu';

/* ═══════════ HESAP SEVİYESİ (kalıcı, hiç sıfırlanmayan ilerleme) ═══════════
   Savaş Bileti (battle pass) sezonluktur; hesap seviyesi ise oyuncunun
   TÜM zamanının özeti — görev bitirdikçe büyür, belirli seviyelerde
   sandık ödülü verir. */
export function accountXpToNext(level) {
  return Math.floor(60 * Math.pow(1.14, level - 1) + 26 * level);
}
const ACCOUNT_LEVEL_CHESTS = { 3: 'ahsap', 6: 'yaygin', 10: 'kemik', 15: 'kan', 20: 'kadim', 26: 'mistik', 33: 'ejderha' };
export function accountLevelChest(level) {
  if (ACCOUNT_LEVEL_CHESTS[level]) return ACCOUNT_LEVEL_CHESTS[level];
  if (level > 33 && (level - 33) % 8 === 0) return 'ejderha';
  return null;
}
/** Yolculuk ekranında gösterilecek kilometre taşı listesi (mevcut seviyenin birkaç ötesine kadar). */
export function accountJourneyMilestones(uptoLevel) {
  const list = [];
  for (let lv = 1; lv <= uptoLevel; lv++) {
    const chest = accountLevelChest(lv);
    if (chest) list.push({ level: lv, chest });
  }
  return list;
}

/* ═══════════ İMZA SİLAHI SİSTEMİ (kahraman kimliği) ═══════════
   Her kahramanın BİR imza silahı (startWeapon) vardır:
   • O kahramanla oynarken imza silahı HEP açıktır ve koşuya onunla girilir.
   • İmza silahı kahramanın NADIRLİĞİNDEN güç alır (signaturePower).
   • İMZA SKİLLERİ 5 KADEMELİDİR: aynı skill tekrar tekrar seçilir,
     her kademe boost'u BİR KEZ daha uygular (gri→yeşil→mavi→mor→altın).
     Değerler KÜÇÜK adımlardır; 5 kademe toplamı güçlü bir build eder. */

/** Nadirliğe göre imza silahı hasar çarpanı (koşu başında uygulanır). */
export function signaturePower(rarity) {
  return [1, 1, 1.12, 1.25, 1.45][rarity] || 1;
}

export const SIGNATURES = {
  /* ═══ SAPANCI — KAVLAK SAPAN ═══
     Temel adımlar ~%12: adi kademe, Ay Okçusu'nun %10'u ile Ayaz'ın %18'i
     arasında. minLvl taşıyan beşi oynanışı değiştirir; `sapanci` bayrağı
     kartı karaktere özel premium çerçeveyle çizer (style.css .lv-card.sapanci).
     DİKKAT: bu bayrak İKİ yerde yaşar — burada ve weapons.rollChoices'in
     teklif nesnesinde. Biri atlanırsa kart sessizce jenerik turuncu myth
     çerçevesine düşer ve kart sanatı hiç çalışmaz. */
  sapanci: [
    { id: 'sig_s1', name: 'Ağır Taş',    desc: 'Sapan hasarı +%12.',
      boost: { weapon: 'sapan', dmg: 1.12 } },
    { id: 'sig_s2', name: 'Hızlı Kol',   desc: 'Sapan %10 daha sık savrulur.',
      boost: { weapon: 'sapan', cd: 0.90 } },
    { id: 'sig_s3', name: 'Yassı Taş',   desc: 'Taş bir kez daha seker.',
      boost: { weapon: 'sapan', bounceAdd: 1 } },
    { id: 'sig_s4', name: 'Uzun Kayış',  desc: 'Menzil +%12, taş %8 daha hızlı uçar.',
      boost: { weapon: 'sapan', range: 1.12, speed: 1.08 } },
    { id: 'sig_s5', name: 'Sivri Çakıl', desc: 'Taş bir düşmanı deler geçer.',
      boost: { weapon: 'sapan', pierce: 1 } },
    { id: 'sig_s6', name: 'Nişan Alışkanlığı', desc: 'Kritik şansı +%5, kritik hasarı +%18.',
      boost: { weapon: 'sapan', critAdd: 0.05, critMultAdd: 0.18 } },

    { id: 'sig_s7',  name: 'Çift Kayış', minLvl: 1, myth: true, sapanci: true, glyph: 'ciftkayis',
      desc: 'Her savuruşta ikinci taş fırlar.',
      boost: { weapon: 'sapan', volley: 1 } },
    { id: 'sig_s8',  name: 'Kırık Taş', minLvl: 1, myth: true, sapanci: true, glyph: 'kiriktas',
      desc: 'Taş sekerken üçe ayrılır, parçalar saçılır.',
      boost: { weapon: 'sapan', shatterAdd: 1 } },
    { id: 'sig_s9',  name: 'Taş Yağmuru', minLvl: 2, myth: true, sapanci: true, glyph: 'tasyagmuru',
      desc: 'Her 5. savuruşta gökten taş yağar.',
      boost: { weapon: 'sapan', rainAdd: 1 } },
    { id: 'sig_s10', name: 'Sapan Ustası', minLvl: 3, myth: true, sapanci: true, glyph: 'sapanustasi',
      desc: 'Kritik şansı +%10, kritik hasarı +%35.',
      boost: { weapon: 'sapan', critAdd: 0.10, critMultAdd: 0.35 } },
    /* KADRONUN TEK TAKASLI KARTI: hasarı büyütürken sekmeyi bozar (yavaş
       taş ikinci hedefe yetişmeden ömrü biter). Adi kahramanın efsanevi
       kartı "daha çok" değil "başka türlü" olmalı — yoksa bedava kahraman
       geç oyunda ücretlilerin işini yapar. */
    { id: 'sig_s11', name: 'Gülle', minLvl: 4, myth: true, sapanci: true, glyph: 'gulle',
      desc: 'Taş ağırlaşır: hasar +%40, geri tepme iki katı, ama %20 yavaş.',
      boost: { weapon: 'sapan', dmg: 1.40, knock: 2.0, speed: 0.80 } },
  ],
  okcu: [
    { id: 'sig_o1', name: 'Çatal Kiriş',  desc: 'Her gerişte bir ok daha fırlar.',
      boost: { weapon: 'yay', volley: 1 } },
    { id: 'sig_o2', name: 'Delici Uç',    desc: 'Ok bir düşmanı daha deler geçer.',
      boost: { weapon: 'yay', pierce: 1 } },
    { id: 'sig_o3', name: 'Kor Uç',       desc: 'Oklar tutuşur, yakıcı hasar ekler.',
      boost: { weapon: 'yay', flame: 1, dmg: 1.07 } },
    { id: 'sig_o4', name: 'Gergin Tel',   desc: 'Yay %7 daha çabuk gerilir.',
      boost: { weapon: 'yay', cd: 0.93 } },
    { id: 'sig_o5', name: 'Seken Ok',     desc: 'Ok saplandıktan sonra sekip vurur.',
      boost: { weapon: 'yay', bounceAdd: 1 } },
    { id: 'sig_o6', name: 'Uzun Kiriş',  desc: 'Ok hasarı +%12, uçuş hızı +%8.',
      boost: { weapon: 'yay', dmg: 1.12, speed: 1.08 } },

    /* ═══ SEVİYE İLE AÇILAN İMZA YETENEKLERİ (Ay Okçusu) ═══
       Kahraman seviyesi (sandık kartlarıyla yükselen kalıcı seviye) yeni
       yetenek AÇAR — sadece sayı büyütmez, oynanışı değiştirir. Her biri
       yine 5 kademelidir; `myth` bayrağı kartı efsanevi çerçeveyle çizer.
       Tasarım niyeti: her açılış okçuluğu farklı bir yöne büker —
       patlama (alan), takip (isabet), kritik (tavan hasar), yağmur
       (kalabalık), salvo (yoğunluk). Beşi birden alınabilir ama koşu
       başına gelen kart sayısı sınırlı olduğu için oyuncu SEÇMEK zorunda. */
    { id: 'sig_o7',  name: 'Patlayıcı Uç', minLvl: 2, myth: true, glyph: 'patlayici',
      desc: 'Ok son hedefte patlar, çevreyi biçer.',
      boost: { weapon: 'yay', explodeAdd: 1 } },
    { id: 'sig_o8',  name: 'Takipçi Ok',   minLvl: 3, myth: true, glyph: 'takipci',
      desc: 'Oklar hedefi kovalar, ıskalamaz.',
      boost: { weapon: 'yay', homingAdd: 1 } },
    { id: 'sig_o9',  name: 'Ay Nişancısı', minLvl: 5, myth: true, glyph: 'nisanci',
      desc: 'Kritik şansı +%7, kritik hasarı +%25.',
      boost: { weapon: 'yay', critAdd: 0.07, critMultAdd: 0.25 } },
    { id: 'sig_o10', name: 'Ok Sağanağı',  minLvl: 7, myth: true, glyph: 'yagmur',
      desc: 'Her 4. gerişte gökten ok sağanağı iner.',
      boost: { weapon: 'yay', rainAdd: 1 } },
    { id: 'sig_o11', name: 'Dolunay Salvosu', minLvl: 9, myth: true, glyph: 'salvo',
      desc: 'Her gerişte +2 ok, yelpaze genişler.',
      boost: { weapon: 'yay', volley: 2, spreadMul: 1.12 } },
  ],
  /* ═══ SEHER — SÜZÜLEN KILIÇ ═══
     İlk altı kademe klasik "sayıyı büyüt" hattıdır (5 kademe her biri).
     minLvl taşıyan beşi ise OYNANIŞI DEĞİŞTİRİR ve kart havuzuna kahraman
     o seviyeye gelince girer; `myth` bayrağı kartı efsanevi çerçeveyle,
     `seher` bayrağı ise karaktere özel premium kart sanatıyla çizer. */
  seher: [
    /* Temel kademeler BİLEREK yüksek tutuldu: destan kahramanının kartı alınınca
       fark hemen hissedilmeli. Okçu kademeleri ~%10 iken burada ~%22.
       İSTİSNA — yay ve menzil (sig_e3/sig_e4): beş kademe üst üste binince
       kılıç haritanın yarısını biçiyordu; artık küçük adımlarla büyürler. */
    { id: 'sig_e1', name: 'Tan Kesiği',    desc: 'Kılıç hasarı +%25.',
      boost: { weapon: 'kilic', dmg: 1.25 } },
    { id: 'sig_e2', name: 'Hafif El',      desc: 'Kılıç %18 daha sık savrulur.',
      boost: { weapon: 'kilic', cd: 0.82 } },
    { id: 'sig_e3', name: 'Geniş Hilal',   desc: 'Savuruş yayı %12 genişler.',
      boost: { weapon: 'kilic', arc: 1.12 } },
    { id: 'sig_e4', name: 'Uzun Kavis',    desc: 'Menzil +%8, hasar +%10.',
      boost: { weapon: 'kilic', range: 1.08, dmg: 1.10 } },
    { id: 'sig_e5', name: 'Ağır Savuruş',  desc: 'Geri tepme +%35, hasar +%15.',
      boost: { weapon: 'kilic', knock: 1.35, dmg: 1.15 } },
    { id: 'sig_e6', name: 'Keskin Ruh',    desc: 'Kritik şansı +%8, kritik hasarı +%30.',
      boost: { weapon: 'kilic', critAdd: 0.08, critMultAdd: 0.30 } },

    /* ═══ SEVİYE İLE AÇILAN İMZA YETENEKLERİ (Seher) ═══ */
    /* SEVİYE KİLİDİ — DÜŞÜRÜLDÜ: kapılar 2/3/5/7/9 iken destan kahramanı
       900 altına satın alıp ilk koşuya girildiğinde HİÇBİR imza yeteneği
       kart havuzunda görünmüyordu — premium hissin tam tersi. İlk iki
       yetenek artık seviye 1'de açık. Kart havuzundaki SIKLIĞI ise
       weapons.rollChoices kısıtlar: bir seçimde en fazla BİR efsanevi kart. */
    { id: 'sig_e7',  name: 'Girdap', minLvl: 1, myth: true, seher: true, glyph: 'girdap',
      desc: 'Aralıklı 360° savuruş; kademe sıklaştırır.',
      boost: { weapon: 'kilic', spinAdd: 1 } },
    { id: 'sig_e8',  name: 'İkiz Savuruş', minLvl: 1, myth: true, seher: true, glyph: 'ikiz',
      desc: 'Aynı hedefe ters yönden ikinci kesik.',
      boost: { weapon: 'kilic', twinAdd: 1 } },
    { id: 'sig_e9',  name: 'Ay Kesiği', minLvl: 2, myth: true, seher: true, glyph: 'kesik',
      desc: 'Savuruştan delip geçen hilal dalga çıkar.',
      boost: { weapon: 'kilic', waveAdd: 1 } },
    { id: 'sig_e10', name: 'Ruh Yankısı', minLvl: 3, myth: true, seher: true, glyph: 'yanki',
      desc: 'Savuruş hayalet olarak bir kez tekrarlar.',
      boost: { weapon: 'kilic', echoAdd: 1 } },
    { id: 'sig_e11', name: 'Seher Nişanı', minLvl: 4, myth: true, seher: true, glyph: 'nisan',
      desc: 'Kritik şansı +%15, kritik hasarı +%60.',
      boost: { weapon: 'kilic', critAdd: 0.15, critMultAdd: 0.60 } },
  ],
  /* ═══ ŞİMŞEK — SÜZÜLEN YILDIRIM ═══
     İlk altı kademe klasik "sayıyı büyüt" hattı. minLvl taşıyan beşi
     OYNANIŞI DEĞİŞTİRİR: `myth` efsanevi çerçeve, `simsek` karaktere özel
     premium kart sanatı (style.css → .lv-card.simsek). */
  simsek: [
    { id: 'sig_z1', name: 'Fırtına Gücü', desc: 'Şimşek hasarı +%25.',
      boost: { weapon: 'simsek', dmg: 1.25 } },
    { id: 'sig_z2', name: 'Kısa Devre',   desc: 'Şimşek %18 daha sık çakar.',
      boost: { weapon: 'simsek', cd: 0.82 } },
    { id: 'sig_z3', name: 'Uzun Akım',    desc: 'Menzil +%15.',
      boost: { weapon: 'simsek', range: 1.15 } },
    { id: 'sig_z4', name: 'Geniş Sıçrama', desc: 'Sıçrama menzili +%20, hasar +%8.',
      boost: { weapon: 'simsek', chainRange: 1.20, dmg: 1.08 } },
    { id: 'sig_z5', name: 'Yakıcı Volt',   desc: 'Hasar +%15, bekleme −%10.',
      boost: { weapon: 'simsek', dmg: 1.15, cd: 0.90 } },
    { id: 'sig_z6', name: 'Kadim Volt',    desc: 'Kritik şansı +%8, kritik hasarı +%30.',
      boost: { weapon: 'simsek', critAdd: 0.08, critMultAdd: 0.30 } },

    /* ═══ SEVİYE İLE AÇILAN İMZA YETENEKLERİ (Şimşek) ═══ */
    { id: 'sig_z7',  name: 'Zincirleme',      minLvl: 1, myth: true, simsek: true, glyph: 'zincir',
      desc: 'Bir hedefe daha sıçrar.',
      boost: { weapon: 'simsek', chainAdd: 1 } },
    { id: 'sig_z8',  name: 'Şok Dalgası',     minLvl: 1, myth: true, simsek: true, glyph: 'sokdalga',
      desc: 'Her sıçrama küçük bir alan patlaması bırakır.',
      boost: { weapon: 'simsek', shockAdd: 1 } },
    { id: 'sig_z9',  name: 'Yıkıcı Çarpma',   minLvl: 2, myth: true, simsek: true, glyph: 'yikici',
      desc: 'Geri tepme büyük artar, düşmanlar savrulur.',
      boost: { weapon: 'simsek', knockAdd: 1 } },
    { id: 'sig_z10', name: 'Fırtına Çağrısı', minLvl: 3, myth: true, simsek: true, glyph: 'firtina',
      desc: 'Aralıklı gökten devasa bir yıldırım düşer.',
      boost: { weapon: 'simsek', stormAdd: 1 } },
    { id: 'sig_z11', name: 'Kadim Fırtına',   minLvl: 4, myth: true, simsek: true, glyph: 'kadimfirtina',
      desc: 'Kritik şansı +%15, kritik hasarı +%60.',
      boost: { weapon: 'simsek', critAdd: 0.15, critMultAdd: 0.60 } },
  ],
  /* ═══ SAVAŞÇI — KALE PALASI ═══
     İlk altı kademe klasik "sayıyı büyüt" hattı (kilic/simsek ile aynı
     desen, adi kademeye göre biraz daha ufak adımlar). minLvl taşıyan
     beşi OYNANIŞI DEĞİŞTİRİR: `myth` efsanevi çerçeve — karaktere özel
     premium kart YOK (adi kademe, sade dursun; bkz. ui.js showLevelUp). */
  savasci: [
    { id: 'sig_s1', name: 'Ağır Darbe',       desc: 'Pala hasarı +%20.',
      boost: { weapon: 'pala', dmg: 1.20 } },
    { id: 'sig_s2', name: 'Tez Adım',         desc: 'Pala %15 daha sık savrulur.',
      boost: { weapon: 'pala', cd: 0.85 } },
    { id: 'sig_s3', name: 'Geniş Yay',        desc: 'Savuruş yayı %10 genişler.',
      boost: { weapon: 'pala', arc: 1.10 } },
    { id: 'sig_s4', name: 'Uzun Kol',         desc: 'Menzil +%8, hasar +%6.',
      boost: { weapon: 'pala', range: 1.08, dmg: 1.06 } },
    { id: 'sig_s5', name: 'Kalkan Yumruğu',   desc: 'Geri tepme +%30, hasar +%10.',
      boost: { weapon: 'pala', knock: 1.30, dmg: 1.10 } },
    { id: 'sig_s6', name: 'Nöbetçi Refleksi', desc: 'Kritik şansı +%6, kritik hasarı +%20.',
      boost: { weapon: 'pala', critAdd: 0.06, critMultAdd: 0.20 } },

    /* ═══ SEVİYE İLE AÇILAN İMZA YETENEKLERİ (Savaşçı) ═══ */
    { id: 'sig_s7',  name: 'Kalkan Duruşu',  minLvl: 1, myth: true, glyph: 'kalkan',
      desc: 'Zırh +2, kalıcı olarak yerleşir.',
      boost: { weapon: 'pala', armorAdd: 2 } },
    { id: 'sig_s8',  name: 'Kasırga Vuruşu', minLvl: 2, myth: true, glyph: 'cevirme',
      desc: 'Aralıklı geniş bir çevirme vuruşu savurur.',
      boost: { weapon: 'pala', spinAdd: 1 } },
    { id: 'sig_s9',  name: 'Çifte Vuruş',    minLvl: 3, myth: true, glyph: 'ikincidarbe',
      desc: 'Ters yönden gecikmeli ikinci bir vuruş gelir.',
      boost: { weapon: 'pala', twinAdd: 1 } },
    { id: 'sig_s10', name: 'Sarsıcı Darbe',  minLvl: 4, myth: true, glyph: 'sarsinti',
      desc: 'Her savuruş küçük bir şok dalgası bırakır.',
      boost: { weapon: 'pala', shockAdd: 1 } },
    { id: 'sig_s11', name: 'Son Nöbet',      minLvl: 5, myth: true, glyph: 'nobetson',
      desc: 'Kritik şansı +%15, kritik hasarı +%55.',
      boost: { weapon: 'pala', critAdd: 0.15, critMultAdd: 0.55 } },
  ],
  /* ═══ GÖKALEV — MAVİ ALEV ═══
     Efsane kademe: temel altı kademe SEHER/ŞİMŞEK ile aynı hızda (~%22-25)
     büyür. minLvl taşıyan beşi ATEŞ mekaniği açar; hepsi 'gun' motorunun
     ZATEN var olan jenerik sayaklarını kullanır (flame/explode/homing/rain) —
     yeni oynanış kodu YOK, bu yüzden risksiz ve tutarlı. */
  gokalev: [
    { id: 'sig_a1', name: 'Alev Gücü',      desc: 'Mavi Alev hasarı +%24.',
      boost: { weapon: 'alev', dmg: 1.24 } },
    { id: 'sig_a2', name: 'Çabuk Kıvılcım', desc: 'Alev %16 daha sık savrulur.',
      boost: { weapon: 'alev', cd: 0.84 } },
    { id: 'sig_a3', name: 'Delici Kor',     desc: 'Kor topu bir düşmanı daha deler.',
      boost: { weapon: 'alev', pierce: 1 } },
    { id: 'sig_a4', name: 'Hızlı Alev',     desc: 'Alev %14 hızlı uçar, hasar +%8.',
      boost: { weapon: 'alev', speed: 1.14, dmg: 1.08 } },
    { id: 'sig_a5', name: 'Geniş Kor',      desc: 'Alev daha uzun yaşar, hasar +%12.',
      boost: { weapon: 'alev', life: 1.25, dmg: 1.12 } },
    { id: 'sig_a6', name: 'Kül Keskinliği', desc: 'Kritik şansı +%8, kritik hasarı +%30.',
      boost: { weapon: 'alev', critAdd: 0.08, critMultAdd: 0.30 } },

    /* ═══ SEVİYE İLE AÇILAN İMZA YETENEKLERİ (Gökalev) ═══ */
    /* İlk iki imza YENİDEN TASARLANDI (2026-08-04). Eskileri ("Mavi Kor" —
       yanan zemin, "Alev Patlaması" — delme bitince patlama) sayılarda da
       hissiyatta da zayıftı: biri saniyede ~14 dps'lik bir leke bırakıyor,
       diğeri yalnız delme hakkı TÜKENDİĞİNDE çalışıyordu (L1'de tek
       düşmana atışta neredeyse hiç). Yerlerine Gökalev'in İKİ BOŞLUĞUNU
       dolduran iki mekanik geldi — menzilde alan hasarı (Nova) ve yakın
       mesafe savunması (Kasırga). İkisi de kart alınır alınmaz görünür. */
    { id: 'sig_a7',  name: 'Mavi Nova',      minLvl: 1, myth: true, glyph: 'nova',
      desc: 'Kor topu çarptığı anda patlar: geniş alana hasar + yanan zemin.',
      boost: { weapon: 'alev', novaAdd: 1 } },
    { id: 'sig_a8',  name: 'Kor Kasırgası',  minLvl: 1, myth: true, glyph: 'kasirga',
      desc: 'Çevrende dönen mavi alev küreleri, değdiğini yakar.',
      boost: { weapon: 'alev', cycloneAdd: 1 } },
    { id: 'sig_a9',  name: 'Takipçi Alev',   minLvl: 3, myth: true, glyph: 'takipalev',
      desc: 'Alev hedefi kovalar, ıskalamaz.',
      boost: { weapon: 'alev', homingAdd: 1 } },
    { id: 'sig_a10', name: 'Alev Yağmuru',   minLvl: 4, myth: true, glyph: 'alevyagmur',
      desc: 'Her 4. savuruşta gökten kor sağanak iner.',
      boost: { weapon: 'alev', rainAdd: 1 } },
    { id: 'sig_a11', name: 'Mavi Cehennem',  minLvl: 5, myth: true, glyph: 'cehennem',
      desc: 'Kritik şansı +%15, kritik hasarı +%60.',
      boost: { weapon: 'alev', critAdd: 0.15, critMultAdd: 0.60 } },
  ],
  /* ═══ KARA KAPTAN — KAPTAN TOPU ═══
     Efsane kademe: temel altı kademe GÖKALEV/ŞİMŞEK ile aynı hızda (~%24)
     büyür. minLvl taşıyan beşi BARUT mekaniği açar; `korsan` bayrağı kartı
     karaktere özel premium sanatla çizer (style.css → .lv-card.korsan). */
  korsan: [
    { id: 'sig_k1', name: 'Ağır Gülle',    desc: 'Gülle hasarı +%24.',
      boost: { weapon: 'topatar', dmg: 1.24 } },
    { id: 'sig_k2', name: 'Kuru Barut',    desc: 'Top %16 daha çabuk doldurulur.',
      boost: { weapon: 'topatar', cd: 0.84 } },
    { id: 'sig_k3', name: 'Demir Gülle',   desc: 'Gülle bir düşmanı daha deler.',
      boost: { weapon: 'topatar', pierce: 1 } },
    { id: 'sig_k4', name: 'Uzun Namlu',    desc: 'Gülle %14 hızlı uçar, hasar +%8.',
      boost: { weapon: 'topatar', speed: 1.14, dmg: 1.08 } },
    { id: 'sig_k5', name: 'Ağır Yük',      desc: 'Gülle daha uzun uçar, hasar +%12.',
      boost: { weapon: 'topatar', life: 1.22, dmg: 1.12 } },
    { id: 'sig_k6', name: 'Kaptan Nişanı', desc: 'Kritik şansı +%8, kritik hasarı +%30.',
      boost: { weapon: 'topatar', critAdd: 0.08, critMultAdd: 0.30 } },

    /* ═══ SEVİYE İLE AÇILAN İMZA YETENEKLERİ (Kara Kaptan) ═══ */
    { id: 'sig_k7',  name: 'Saçılan Gülle',   minLvl: 1, myth: true, korsan: true, glyph: 'sacilan',
      desc: 'Gülle isabette üç parçaya bölünür.',
      boost: { weapon: 'topatar', splitAdd: 1 } },
    { id: 'sig_k8',  name: 'Barut Fıçısı',    minLvl: 1, myth: true, korsan: true, glyph: 'barutfici',
      desc: 'Gülle son hedefte patlar, çevreyi biçer.',
      boost: { weapon: 'topatar', explodeAdd: 1 } },
    { id: 'sig_k9',  name: 'Çifte Namlu',     minLvl: 2, myth: true, korsan: true, glyph: 'ciftnamlu',
      desc: 'Her tetikte bir gülle daha çıkar.',
      boost: { weapon: 'topatar', volley: 1, spreadMul: 1.10 } },
    { id: 'sig_k10', name: 'Bordo Ateşi',     minLvl: 3, myth: true, korsan: true, glyph: 'bordo',
      desc: 'Aralıklı yedi gülleli yan ateş açar.',
      boost: { weapon: 'topatar', broadsideAdd: 1 } },
    { id: 'sig_k11', name: 'Hayalet Salvosu', minLvl: 4, myth: true, korsan: true, glyph: 'hayaletsalvo',
      desc: 'Kritik şansı +%15, kritik hasarı +%60.',
      boost: { weapon: 'topatar', critAdd: 0.15, critMultAdd: 0.60 } },
  ],
  /* ═══ GECE KRALİÇESİ — TAÇ KILICI ═══
     Destan kademe: temel altı kademe SEHER hızında (~%22-25). minLvl
     taşıyan beşi KESİK mekaniğini büker (yelpaze, geniş dalga, ikiz,
     gökten inen hüküm); `kralice` bayrağı kartı premium çerçeveyle çizer. */
  kralice: [
    { id: 'sig_q1', name: 'Mavi Hüküm',        desc: 'Kesik hasarı +%25.',
      boost: { weapon: 'tackilic', dmg: 1.25 } },
    { id: 'sig_q2', name: 'Çevik Taç',         desc: 'Kılıç %18 daha sık savrulur.',
      boost: { weapon: 'tackilic', cd: 0.82 } },
    { id: 'sig_q3', name: 'Geniş Kesik',       desc: 'Kesik %14 genişler, yay %8 açılır.',
      boost: { weapon: 'tackilic', waveR: 1.14, arc: 1.08 } },
    { id: 'sig_q4', name: 'Uzun Ferman',       desc: 'Kesik %18 daha uzak gider, hasar +%8.',
      boost: { weapon: 'tackilic', waveLife: 1.18, dmg: 1.08 } },
    { id: 'sig_q5', name: 'Ağır Ferman',       desc: 'Geri tepme +%35, hasar +%15.',
      boost: { weapon: 'tackilic', knock: 1.35, dmg: 1.15 } },
    { id: 'sig_q6', name: 'Menekşe Keskinlik', desc: 'Kritik şansı +%8, kritik hasarı +%30.',
      boost: { weapon: 'tackilic', critAdd: 0.08, critMultAdd: 0.30 } },

    /* ═══ SEVİYE İLE AÇILAN İMZA YETENEKLERİ (Gece Kraliçesi) ═══ */
    { id: 'sig_q7',  name: 'Üçlü Kesik',   minLvl: 1, myth: true, kralice: true, glyph: 'uclu',
      desc: 'Her savuruşta üç kesik yelpazesi fırlar.',
      boost: { weapon: 'tackilic', fanAdd: 1 } },
    { id: 'sig_q8',  name: 'Kanat Kesiği', minLvl: 1, myth: true, kralice: true, glyph: 'kanat',
      desc: 'Kesikler güçlenir ve daha geniş vurur.',
      boost: { weapon: 'tackilic', waveAdd: 1 } },
    { id: 'sig_q9',  name: 'İkiz Ferman',  minLvl: 2, myth: true, kralice: true, glyph: 'ikizferman',
      desc: 'Ters yönden gecikmeli ikinci bir kesik gelir.',
      boost: { weapon: 'tackilic', twinAdd: 1 } },
    { id: 'sig_q10', name: 'Gök Kılıcı',  minLvl: 3, myth: true, kralice: true, glyph: 'gokkilic',
      desc: 'Aralıklı gökten mavi bir hüküm kılıcı iner.',
      boost: { weapon: 'tackilic', judgeAdd: 1 } },
    { id: 'sig_q11', name: 'Taç Nişanı',   minLvl: 4, myth: true, kralice: true, glyph: 'tacnisan',
      desc: 'Kritik şansı +%15, kritik hasarı +%60.',
      boost: { weapon: 'tackilic', critAdd: 0.15, critMultAdd: 0.60 } },
  ],
  /* ═══ AYAZ — YEMİN KILICI ═══
     NADİR kademe. Kademe adımları kasıtlı olarak ARADA: okçu (nadir, ~%10)
     ile Seher/Kraliçe (destan, ~%22-25) arasında ~%18. Nadir kahraman kartı
     alınca fark hissedilmeli ama destanın yerini almamalı.

     minLvl taşıyan beşi mekaniği büker. Seçim SEHER'in havuzuyla kasıtlı
     olarak ÖRTÜŞÜR (şok, ikiz, kesik, girdap) — çünkü ikisi aynı rigi
     kullanır — ama iki yerde ayrılır:
       • Ayaz'ın taban sayacı ZATEN shock:1, yani Kalkan Duruşu var olan
         bir şeyi BÜYÜTÜR (yeni mekanik öğretmez) — nadir kademeye uygun,
         okuması ilk kareden itibaren kolay.
       • `echo` (Ruh Yankısı) BİLEREK YOK: o Seher'in destan kimliği.
     Kritik kartı da bir kademe zayıf: 0.12/0.45 (destan 0.15/0.60).

     `sovalye` bayrağı kartı karaktere özel premium sanatla çizer
     (style.css → .lv-card.sovalye). Bayrak İKİ yerde yaşar: burada ve
     weapons.rollChoices teklif nesnesinde — biri atlanırsa kart sessizce
     jenerik turuncu myth çerçevesine düşer. */
  sovalye: [
    { id: 'sig_v1', name: 'Ağır Yemin',   desc: 'Kılıç hasarı +%18.',
      boost: { weapon: 'yemin', dmg: 1.18 } },
    { id: 'sig_v2', name: 'Çevik Kabza',  desc: 'Kılıç %13 daha sık savrulur.',
      boost: { weapon: 'yemin', cd: 0.87 } },
    { id: 'sig_v3', name: 'Geniş Nöbet',  desc: 'Savuruş yayı %10 genişler.',
      boost: { weapon: 'yemin', arc: 1.10 } },
    { id: 'sig_v4', name: 'İleri Adım',   desc: 'Menzil +%9, hasar +%7.',
      boost: { weapon: 'yemin', range: 1.09, dmg: 1.07 } },
    { id: 'sig_v5', name: 'Sur Darbesi',  desc: 'Geri tepme +%30, hasar +%12.',
      boost: { weapon: 'yemin', knock: 1.30, dmg: 1.12 } },
    { id: 'sig_v6', name: 'Keskin Ayaz',  desc: 'Kritik şansı +%7, kritik hasarı +%25.',
      boost: { weapon: 'yemin', critAdd: 0.07, critMultAdd: 0.25 } },

    /* ═══ SEVİYE İLE AÇILAN İMZA YETENEKLERİ (Ayaz) ═══ */
    { id: 'sig_v7',  name: 'Kalkan Duruşu', minLvl: 1, myth: true, sovalye: true, glyph: 'durus',
      desc: 'Ayaz halkası büyür ve daha sert vurur.',
      boost: { weapon: 'yemin', shockAdd: 1 } },
    /* Tepkisel: SALDIRMAK değil DAYANMAK ödüllendirilir. Kadroda başka
       örneği yok; "sur şövalyesi hattı tutar" kimliğinin mekanik karşılığı
       budur. Kademe hasarı değil YARIÇAPI ve bekleme süresini iyileştirir. */
    { id: 'sig_v8',  name: 'Ayaz Kabuğu',   minLvl: 1, myth: true, sovalye: true, glyph: 'kabuk',
      desc: 'Hasar aldığında çevrene ayaz patlar: alan hasarı + sert geri tepme.',
      boost: { weapon: 'yemin', carapaceAdd: 1 } },
    { id: 'sig_v9',  name: 'Ayaz Kesiği',   minLvl: 2, myth: true, sovalye: true, glyph: 'ayazkesik',
      desc: 'Savuruştan delip geçen buz dalgası çıkar.',
      boost: { weapon: 'yemin', waveAdd: 1 } },
    { id: 'sig_v10', name: 'Kasırga Nöbeti', minLvl: 3, myth: true, sovalye: true, glyph: 'nobet',
      desc: 'Aralıklı 360° savuruş; kademe sıklaştırır.',
      boost: { weapon: 'yemin', spinAdd: 1 } },
    { id: 'sig_v11', name: 'Yemin Nişanı',  minLvl: 4, myth: true, sovalye: true, glyph: 'yeminnisan',
      desc: 'Kritik şansı +%12, kritik hasarı +%45.',
      boost: { weapon: 'yemin', critAdd: 0.12, critMultAdd: 0.45 } },
  ],
};

/** Kahramanın seviye ile açılan imza yetenekleri (kilit rozetleri için).
    Kilitliyse `locked` true döner — karakter inceleme ekranı bunu çizer. */
export function signatureUnlocks(charId, charLevel) {
  const list = SIGNATURES[charId] || [];
  const out = [];
  for (const s of list) {
    if (!s.minLvl) continue;
    out.push({ id: s.id, name: s.name, desc: s.desc, minLvl: s.minLvl, glyph: s.glyph || null,
               locked: (charLevel | 0) < s.minLvl, myth: !!s.myth });
  }
  return out;
}

/* ⚙ GEÇİCİ TEST BAYRAĞI — tüm karakterleri açık başlat.
   Yayına almadan önce false yap (ya da bu satırı sil). */
export const UNLOCK_ALL_CHARS = /[?&]dev=1\b/.test(typeof location !== 'undefined' ? location.search : '');

/* ── Gem paketleri — gerçek para ile satın alma (mağaza) ──
   amount: verilen taş · bonus: hediye · price: ₺ etiketi. */
export const STONE_PACKS = [
  { id: 'kese',   name: 'KAN KESESİ',  amount: 80,   bonus: 0,   price: '₺29,99',  tag: '' },
  { id: 'avuc',   name: 'DOLU AVUÇ',   amount: 250,  bonus: 25,  price: '₺79,99',  tag: '+%10' },
  { id: 'sandik', name: 'TAŞ SANDIĞI', amount: 600,  bonus: 120, price: '₺149,99', tag: 'EN POPÜLER' },
  { id: 'kule',   name: 'KAN KULESİ',  amount: 1400, bonus: 400, price: '₺299,99', tag: 'EN İYİ DEĞER' },
];

/* ── Bozdurma: Gem → Altın (oyun parası) ──
   stone: harcanan taş · rubies: kazanılan yakut · tag: bonus etiketi. */
export const RUBY_EXCHANGE = [
  { id: 'ex1', stone: 10,  rubies: 120,  tag: '' },
  { id: 'ex2', stone: 40,  rubies: 550,  tag: '+%15' },
  { id: 'ex3', stone: 100, rubies: 1500, tag: '+%25' },
];

/* ── Karakter nadirlik kademeleri (Clash Royale tarzı) ──────
   Kartları çerçeve rengi + rozet ile ayırır; sandık düşüşünde
   ağırlık ve tören tantanası bu kademeye göre ölçeklenir. */
export const CHAR_RARITIES = [
  null,
  { name: 'ADİ',    color: '#b8c0cc', glow: 'rgba(184,192,204,0.30)', dropW: 100 },
  { name: 'NADİR',  color: '#5aa9ff', glow: 'rgba(90,169,255,0.38)',  dropW: 34  },
  { name: 'DESTAN', color: '#b96cff', glow: 'rgba(185,108,255,0.44)', dropW: 10  },
  { name: 'EFSANE', color: '#c98a52', glow: 'rgba(255,122,44,0.58)',  dropW: 3   },
];

/* ── KARAKTER SEVİYE (Clash Royale mantığı) ────────────────
   Sandıktan KART düşer; kart biriktikçe karakter seviye atlar.
   cardReq[L] = L seviyesine geçmek için gereken kart sayısı.
   goldCost[L] = o seviyede ek olarak harcanan Altın.
   Her seviye can + hasar + atış hızı verir (oyunda güçlenir). */
export const CHAR_MAX_LEVEL = 9;
export const CHAR_CARD_REQ = [0, 0, 2, 4, 10, 20, 50, 100, 200, 400];
export const CHAR_GOLD_COST = [0, 0, 20, 50, 120, 300, 700, 1500, 3000, 6000];

/** Seviyeye göre stat çarpanları (seviye 1 = taban). */
export function charLevelMods(level) {
  const b = Math.max(0, (level | 0) - 1);
  return { hpMul: 1 + 0.08 * b, dmgAdd: 0.07 * b, atkAdd: 0.02 * b };
}

/** Sandık kart düşüşünde nadirliğe göre kaç kart verilir (CR his). */
export function charCardDrop(rarity) {
  if (rarity >= 4) return 1;
  if (rarity === 3) return 1 + (Math.random() < 0.4 ? 1 : 0);
  if (rarity === 2) return 2 + (Math.random() < 0.5 ? 1 : 0);
  return 2 + (Math.random() * 3 | 0);   // adi: 2-4 kart
}

/* ── ETKİNLİKLER: Hayatta Kalma Kupası ─────────────────────
   Toplam hayatta kalma süresi (dk) biriktikçe ödüller açılır.
   need: gereken dakika · reward: {kind, ...}. Sandıklar yuvaya
   düşer; yuva doluysa yakuta çevrilir. */
export const SURVIVAL_MILESTONES = [
  { id: 'm1', need: 2,  reward: { kind: 'rubies', amount: 150 } },
  { id: 'm2', need: 5,  reward: { kind: 'chest',  chest: 'ahsap' } },
  { id: 'm3', need: 9,  reward: { kind: 'rubies', amount: 320 } },
  { id: 'm4', need: 15, reward: { kind: 'chest',  chest: 'kemik' } },
  { id: 'm5', need: 23, reward: { kind: 'cards',  char: 'seher', amount: 2 } },
  { id: 'm6', need: 34, reward: { kind: 'chest',  chest: 'kan' } },
  { id: 'm7', need: 50, reward: { kind: 'rubies', amount: 900 } },
  { id: 'm8', need: 70, reward: { kind: 'chest', chest: 'kadim' } },
];

/* ── Pasif rünler (seviye atlama havuzu, 4 seviye) ───────── */
/* Her rün, oyuncu stat sistemine eklenen bir `mods` paketidir —
   eşyalarla aynı dili konuşur (player.applyMods). */
/* KİMLİK: rün adları üç kelimeyi geçmez, açıklama TEK cümledir ve
   "ne olduğunu" oyuncu diliyle söyler — stat adıyla değil. Kart yüzünde
   dört satıra sığması için 46 karakter sınırı vardır. */
export const PASSIVES = {
  kalp: {
    name: 'Kadim Yürek',
    desc: 'Azami can +22 — aldığın an dolar.',
    maxLevel: 4,
    mods: { maxHp: 22 },
  },
  cizme: {
    name: 'Rüzgâr Adımı',
    desc: '%10 daha hızlı koşarsın.',
    maxLevel: 4,
    mods: { speedPct: 0.10 },
  },
  miknatis: {
    name: 'Ruh Feneri',
    desc: 'Cevherleri %55 daha uzaktan çeker.',
    maxLevel: 4,
    mods: { magnetPct: 0.55 },
  },
  keskinlik: {
    name: 'Kan Keskinliği',
    desc: 'Kritik şansı +%6, kritik hasarı +%15.',
    maxLevel: 4,
    mods: { critChance: 0.06, critMult: 0.15 },
  },
  zirh: {
    name: 'Kemik Zırh',
    desc: 'Yediğin her vuruştan 2 hasar siler.',
    maxLevel: 4,
    mods: { armor: 2 },
  },
  /* DENGE (2026-08-18): gazap havuzun EN İYİ kartıydı — tek kartta +%12 hasar
     ve tek başına 5 kademe (diğerleri 4). Toplam +%60 hasar, ikinci en iyi
     kartın (çabukluk, ~+%26 dps) iki katı. Artık 4 kademe × +%11 = +%44 ve
     çabukluk/keskinlik onun bandına girdi: seçim gerçekten bir tercih olsun. */
  gazap: {
    name: 'Kan Gazabı',
    desc: 'Verdiğin bütün hasar +%11.',
    maxLevel: 4,
    mods: { dmgPct: 0.11 },
  },
  cabukluk: {
    name: 'Gölge Çabukluğu',
    desc: 'Bütün silahlar %10 daha sık vurur.',
    maxLevel: 4,
    mods: { atkPct: 0.10 },
  },
};

/* Başlangıç silahı */
export const STARTING_WEAPON = 'kilic';

/* XP cevheri kademeleri: [eşik değer, renk, yarıçap] — kan kırmızısı, karanlık sahneye uygun */
export const GEM_TIERS = [
  { min: 0,  color: '#8a1620', r: 4.5, glow: 'rgba(180,30,42,0.42)' },
  { min: 3,  color: '#d81f34', r: 6.0, glow: 'rgba(216,31,52,0.55)' },
  { min: 10, color: '#ff3b4e', r: 8.0, glow: 'rgba(255,59,78,0.65)' },
];

/* ═══════════ KARA PAZAR (Brotato tarzı dükkân) ═══════════ */

/* Nadirlik kademeleri (1-4) */
export const RARITIES = [
  null,
  { name: 'ÇOK YAYGIN', color: '#8b90a3', glow: 'rgba(139,144,163,0.22)' },
  { name: 'YAYGIN',     color: '#c98a5a', glow: 'rgba(201,138,90,0.30)'  },
  { name: 'EPİK',       color: '#9b6cff', glow: 'rgba(155,108,255,0.35)' },
  { name: 'EFSANEVİ',   color: '#c98a52', glow: 'rgba(255,122,44,0.48)'  },
  { name: 'NADİR',      color: '#3d9bff', glow: 'rgba(61,155,255,0.40)'  },
];

/* Stat gösterim etiketleri */
export const MODS = {
  maxHp:         { label: 'Azami Can',      fmt: 'flat' },
  regen:         { label: 'Can Yenileme',   fmt: 'persec' },
  speedPct:      { label: 'Hız',            fmt: 'pct' },
  dmgPct:        { label: 'Hasar',          fmt: 'pct' },
  atkPct:        { label: 'Saldırı Hızı',   fmt: 'pct' },
  critChance:    { label: 'Kritik Şansı',   fmt: 'pct' },
  critMult:      { label: 'Kritik Hasarı',  fmt: 'pct' },
  armor:         { label: 'Zırh',           fmt: 'flat' },
  dodge:         { label: 'Sıyrılma',       fmt: 'pct' },
  magnetPct:     { label: 'Çekim Alanı',    fmt: 'pct' },
  lifeSteal:     { label: 'Can Çalma',      fmt: 'pct' },
  luck:          { label: 'Şans',           fmt: 'pct' },
  harvest:       { label: 'Hasat',          fmt: 'pct' },
  xpPct:         { label: 'Tecrübe',        fmt: 'pct' },
  explodeChance: { label: 'Patlama Şansı',  fmt: 'pct' },
  explodeDmgPct: { label: 'Patlama Hasarı', fmt: 'pct' },
  explodeRPct:   { label: 'Patlama Alanı',  fmt: 'pct' },
};

/* Eşyalar — Brotato mantığı: stat yığma, üst üste alınabilir */
export const ITEMS = [
  /* ── ADİ ── */
  { id: 'kemik',  name: 'Kemik Tılsımı',   rarity: 1, price: 12, icon: 'tilsim',
    desc: 'Mezar tozuyla kutsanmış omur.', mods: { maxHp: 12 } },
  { id: 'pasli',  name: 'Paslı Yüzük',     rarity: 1, price: 13, icon: 'yuzuk',
    desc: 'Kimin parmağından çıktığı meçhul.', mods: { dmgPct: 0.06 } },
  { id: 'mum',    name: 'Kara Mum',        rarity: 1, price: 12, icon: 'mum',
    desc: 'Alevi zayıf noktaları gösterir.', mods: { critChance: 0.03 } },
  { id: 'yama',   name: 'Yamalı Pelerin',  rarity: 1, price: 13, icon: 'pelerin',
    desc: 'Yamalar darbeyi dağıtır.', mods: { armor: 1, dodge: 0.02 } },
  { id: 'kese',   name: 'Çıngırak Kesesi', rarity: 1, price: 14, icon: 'kese',
    desc: 'İçine düşen her cevher çoğalır.', mods: { harvest: 0.12 } },
  { id: 'fener',  name: 'Soluk Fener',     rarity: 1, price: 11, icon: 'fener',
    desc: 'Ruh cevherleri ışığa gelir.', mods: { magnetPct: 0.30 } },

  /* ── NADİR ── */
  { id: 'nektar', name: 'Kan Kolyesi',     rarity: 2, price: 27, icon: 'kolye',
    desc: 'Verdiğin her yara seni onarır.', mods: { lifeSteal: 0.02 } },
  { id: 'tuylu',  name: 'Tüylü Çizme',     rarity: 2, price: 24, icon: 'cizme',
    desc: 'Kuzgun tüyü — adım sessiz, gölge hızlı.', mods: { speedPct: 0.08, dodge: 0.03 } },
  { id: 'korkup', name: 'Barut Boynuzu',   rarity: 2, price: 28, icon: 'boynuz',
    desc: 'Ölen düşman bazen kor gibi patlar.', mods: { explodeChance: 0.10 } },
  { id: 'dis',    name: 'Kasap Palası',    rarity: 2, price: 25, icon: 'pala',
    desc: 'Ağır kesik, ağır bedel.', mods: { dmgPct: 0.10, maxHp: -5 } },
  { id: 'sarap',  name: 'Ay İksiri',       rarity: 2, price: 24, icon: 'iksir',
    desc: 'Kızıl ayın ışığında mayalanmış.', mods: { regen: 1.2 } },
  { id: 'zar',    name: 'Kurşun Zar',      rarity: 2, price: 26, icon: 'zar',
    desc: 'Hep hile yapar — senin lehine.', mods: { luck: 0.15 } },

  /* ── DESTANSI ── */
  { id: 'el',     name: 'Hasatçı Eli',     rarity: 3, price: 55, icon: 'el',
    desc: 'Kuruyup kalmış ama hâlâ çok çabuk.', mods: { atkPct: 0.12 } },
  { id: 'muska',  name: 'Kızıl Muska',     rarity: 3, price: 58, icon: 'muska',
    desc: 'Damarların atışını duyar.', mods: { critChance: 0.07, critMult: 0.25 } },
  { id: 'fici',   name: 'Barut Fıçısı',    rarity: 3, price: 60, icon: 'fici',
    desc: 'Her ölüm bir fitil olabilir.', mods: { explodeChance: 0.15, explodeDmgPct: 0.40 } },
  { id: 'golge',  name: 'Gölge Zırhı',     rarity: 3, price: 52, icon: 'zirh',
    desc: 'Dokunulamayanı vuramazsın.', mods: { armor: 3, dodge: 0.05 } },
  { id: 'kadeh',  name: 'Ruh Kadehi',      rarity: 3, price: 50, icon: 'kadeh',
    desc: 'Düşen her ruh son damlasına dek içilir.', mods: { xpPct: 0.20 } },
  { id: 'yurek2', name: 'Demir Yürek',     rarity: 3, price: 48, icon: 'kalp',
    desc: 'Ağır ama durdurulamaz.', mods: { maxHp: 30, speedPct: -0.04 } },

  /* ── KADİM ── */
  { id: 'fitil',  name: 'Kıyamet Fitili',  rarity: 4, price: 110, icon: 'boynuz',
    desc: 'Dünyanın sonunu prova eder.', mods: { explodeChance: 0.20, explodeRPct: 0.60 } },
  { id: 'tac',    name: 'Hasat Tacı',      rarity: 4, price: 95, icon: 'tac',
    desc: 'Tarlanın tek sahibi sensin.', mods: { harvest: 0.35, luck: 0.25 } },
  { id: 'kadim',  name: 'Kadim Kalp',      rarity: 4, price: 100, icon: 'kalp',
    desc: 'Hâlâ atıyor. Artık senin göğsünde.', mods: { maxHp: 50, regen: 2 } },
  { id: 'cikrik', name: 'Ölüm Çıkrığı',    rarity: 4, price: 115, icon: 'kum',
    desc: 'İpi eğirdikçe tırpan hızlanır.', mods: { atkPct: 0.20, dmgPct: 0.15 } },
  { id: 'vampir', name: 'Vampir Kolyesi',  rarity: 4, price: 105, icon: 'kolye',
    desc: 'Gece seninle beslenir.', mods: { lifeSteal: 0.05, critChance: 0.05 } },
];

/* Dükkân kuralları */
export const SHOP = {
  slots: 4,
  weaponChance: 0.34,                    // slot başına silah teklifi olasılığı
  weaponPrice: [15, 25, 38, 55, 75],     // hedef seviyeye göre (indeks = mevcut seviye)
  priceMul: (w) => 1 + (w - 1) * 0.12,   // dalga enflasyonu
  rerollCost: (w, n) => Math.ceil((4 + w * 1.5) * (1 + 0.6 * n)),
};

/* ═══════════ ALTIN — Kalıcı Gelişim (meta) ═══════════
   Koşu bitince (ölüm ya da zafer) kazanılır, menüdeki KUŞANIM'da
   harcanır. Yeni sistem: eşyalar KARAKTERE GİYİLİR — her kahramanın
   kendi kuşanımı (silah katı / zırh / eldiven / çizme) vardır.
   Bazı eşyalar sınıfa özeldır (yay yalnız okçuya, asa büyücüye…). */

/* Koşu sonu yakut ödülü: dalga + kıyım + zafer bonusu */
export function rubyReward(wave, kills, won) {
  return Math.round(wave * 4 + kills * 0.12 + (won ? 60 : 0));
}

/* ── KUŞANIM YUVALARI: her kahramanda 4 sabit yuva ── */
export const EQUIP_SLOTS = [
  { id: 'silah',   name: 'SİLAH KATI', hint: 'İmza silahını saran kat — saldırı gücü' },
  { id: 'zirh',    name: 'ZIRH',       hint: 'Gövde koruması — can ve savunma' },
  { id: 'eldiven', name: 'ELDİVEN',    hint: 'El işçiliği — kritik, hız, kan' },
  { id: 'cizme',   name: 'ÇİZME',      hint: 'Ayak işi — hız ve kaçış' },
];

/* ── EŞYALAR: Altın ile alınır, karaktere giyilir ──
   Yalnızca 4 kuşam türü: SİLAH (kılıç/yay/asa eki), ZIRH, ELDİVEN, ÇİZME —
   kalkan/iksir/mum gibi yabancı eşya fikirleri yok. Her eşya yalnızca
   4 stattan besleniyor: Hasar, Can Çalma, Saldırı Hızı, Can.
   slot: hangi yuvaya girer · only: yalnız bu kahramanlar giyebilir
   (yoksa herkes). Nadirlik yükseldikçe güç ve fiyat artar. */
export const EQUIPMENT = [
  /* ── SİLAH KATI: 5 kademe × 5 arketip (Kılıç / Balta / Yay / Asa / Hançer) ── */
  { id: 'e_cy_kilic',  name: 'Paslı Kılıç',        slot: 'silah', rarity: 1, price: 40, icon: 'w_cy_kilic',
    desc: 'Eski ama hâlâ keser.', mods: { dmgPct: 0.05 } },
  { id: 'e_cy_balta',  name: 'Çentik Balta',       slot: 'silah', rarity: 1, price: 42, icon: 'w_cy_balta',
    desc: 'Sapı gıcırdar, ağzı iş görür.', mods: { dmgPct: 0.06 } },
  { id: 'e_cy_yay',    name: 'Basit Avcı Yayı',    slot: 'silah', rarity: 1, price: 40, icon: 'w_cy_yay',
    desc: 'Köylü işi, ama gerer.', mods: { atkPct: 0.05 } },
  { id: 'e_cy_asa',    name: 'Çatlak Asa',         slot: 'silah', rarity: 1, price: 42, icon: 'w_cy_asa',
    desc: 'Çırağın ilk asası.', mods: { dmgPct: 0.05, atkPct: 0.02 } },
  { id: 'e_cy_hancer', name: 'Kör Hançer',         slot: 'silah', rarity: 1, price: 38, icon: 'w_cy_hancer',
    desc: 'Bilenmesi gerek, ama iş görür.', mods: { atkPct: 0.07 } },

  { id: 'e_yg_kilic',  name: 'Bakır Kılıç',        slot: 'silah', rarity: 2, price: 110, icon: 'w_yg_kilic',
    desc: 'Parlatılmış tunç, dengeli darbe.', mods: { dmgPct: 0.10 } },
  { id: 'e_yg_balta',  name: 'Bronz Balta',        slot: 'silah', rarity: 2, price: 115, icon: 'w_yg_balta',
    desc: 'Ustaca dövülmüş bronz ağız.', mods: { dmgPct: 0.12 } },
  { id: 'e_yg_yay',    name: 'Composite Yay',      slot: 'silah', rarity: 2, price: 112, icon: 'w_yg_yay',
    desc: 'Katmanlı ahşap, sert gerilim.', mods: { atkPct: 0.10, dmgPct: 0.02 } },
  { id: 'e_yg_asa',    name: 'Söğüt Asası',        slot: 'silah', rarity: 2, price: 108, icon: 'w_yg_asa',
    desc: 'Söğüt özünden büyü akar.', mods: { dmgPct: 0.08, atkPct: 0.05 } },
  { id: 'e_yg_hancer', name: 'Suikastçı Hançeri',  slot: 'silah', rarity: 2, price: 105, icon: 'w_yg_hancer',
    desc: 'Sessiz, hızlı, ölümcül.', mods: { atkPct: 0.13 } },

  { id: 'e_nd_kilic',  name: 'Buzul Kılıcı',       slot: 'silah', rarity: 5, price: 260, icon: 'w_nd_kilic',
    desc: 'Ağzı hiç erimeyen bir kışın parçası.', mods: { dmgPct: 0.15, atkPct: 0.03 } },
  { id: 'e_nd_balta',  name: 'Fırtına Baltası',    slot: 'silah', rarity: 5, price: 270, icon: 'w_nd_balta',
    desc: 'Her darbe don damarları bırakır.', mods: { dmgPct: 0.17 } },
  { id: 'e_nd_yay',    name: 'Buz Rüzgârı Yayı',   slot: 'silah', rarity: 5, price: 265, icon: 'w_nd_yay',
    desc: 'Fırlattığı her ok kışı taşır.', mods: { atkPct: 0.14, dmgPct: 0.04 } },
  { id: 'e_nd_asa',    name: 'Buz Kristali Asası', slot: 'silah', rarity: 5, price: 255, icon: 'w_nd_asa',
    desc: 'Kristal öz büyüyü donduruyor.', mods: { dmgPct: 0.13, atkPct: 0.06 } },
  { id: 'e_nd_hancer', name: 'Buz İğnesi Hançeri', slot: 'silah', rarity: 5, price: 250, icon: 'w_nd_hancer',
    desc: 'İnce, soğuk, sessiz bir son.', mods: { atkPct: 0.16, dmgPct: 0.02 } },

  { id: 'e_ep_kilic',  name: 'Fırtına Ejder Kılıcı', slot: 'silah', rarity: 3, price: 400, icon: 'w_ep_kilic',
    desc: 'Her savuruşta yıldırım çatlar.', mods: { dmgPct: 0.20, atkPct: 0.04 } },
  { id: 'e_ep_balta',  name: 'Kaos Baltası',       slot: 'silah', rarity: 3, price: 410, icon: 'w_ep_balta',
    desc: 'Vuruşları gökyüzünü yırtar.', mods: { dmgPct: 0.22 } },
  { id: 'e_ep_yay',    name: 'Ruh Emici Yay',      slot: 'silah', rarity: 3, price: 405, icon: 'w_ep_yay',
    desc: 'Her ok bir şimşek çatalı taşır.', mods: { atkPct: 0.16, dmgPct: 0.08 } },
  { id: 'e_ep_asa',    name: 'Yıldırım Asası',     slot: 'silah', rarity: 3, price: 395, icon: 'w_ep_asa',
    desc: 'Fırtınayı avucunda tutar.', mods: { dmgPct: 0.18, atkPct: 0.08 } },
  { id: 'e_ep_hancer', name: 'Fısıltı Hançeri',    slot: 'silah', rarity: 3, price: 390, icon: 'w_ep_hancer',
    desc: 'Çakan bir sessizlikle vurur.', mods: { atkPct: 0.20, dmgPct: 0.06 } },

  { id: 'e_ef_kilic',  name: 'Güneş Alevi Kılıcı', slot: 'silah', rarity: 4, price: 620, icon: 'w_ef_kilic',
    desc: 'Kadim güneşten dökülmüş alev.', mods: { dmgPct: 0.26, atkPct: 0.06 } },
  { id: 'e_ef_balta',  name: 'Kıyamet Baltası',    slot: 'silah', rarity: 4, price: 640, icon: 'w_ef_balta',
    desc: 'Her darbesi bir son provası.', mods: { dmgPct: 0.30 } },
  { id: 'e_ef_yay',    name: 'Şimşek Tanrı Yayı',  slot: 'silah', rarity: 4, price: 630, icon: 'w_ef_yay',
    desc: 'Fırlattığı alev göğü yakar.', mods: { atkPct: 0.20, dmgPct: 0.12 } },
  { id: 'e_ef_asa',    name: 'Kadim Güneş Asası',  slot: 'silah', rarity: 4, price: 615, icon: 'w_ef_asa',
    desc: 'Güneşin son kıvılcımını taşır.', mods: { dmgPct: 0.24, atkPct: 0.10 } },
  { id: 'e_ef_hancer', name: 'Ejder Dişi Hançeri', slot: 'silah', rarity: 4, price: 610, icon: 'w_ef_hancer',
    desc: 'Bir ejderin son nefesinden dökülmüş.', mods: { atkPct: 0.24, dmgPct: 0.10 } },

  /* ── ZIRH: gövde koruması ── */
  { id: 'e_derizirh', name: 'Deri Zırh',          slot: 'zirh', rarity: 1, price: 45, icon: 'z_deri',
    desc: 'Hafif ama işini görür.', mods: { maxHp: 14 } },
  { id: 'e_demirlevha', name: 'Demir Levha',      slot: 'zirh', rarity: 1, price: 50, icon: 'z_levha',
    desc: 'Ağır ama güvenilir bir kalkanlama.', mods: { maxHp: 12, dmgPct: 0.03 } },
  { id: 'e_celikzirh', name: 'Çelik Zırh',        slot: 'zirh', rarity: 2, price: 110, icon: 'z_celik',
    desc: 'Nöbetçi zırhıymış — sağlam görünüyor.', mods: { maxHp: 22 } },
  { id: 'e_agirplaka', name: 'Ağır Plaka',        slot: 'zirh', rarity: 2, price: 125, icon: 'z_plaka',
    desc: 'Koruma ağırlığıyla gelir.', mods: { maxHp: 28, atkPct: -0.03 } },
  { id: 'e_ejderpul',  name: 'Ejder Pulu Zırhı',  slot: 'zirh', rarity: 3, price: 210, icon: 'z_ejder',
    desc: 'Her pul kadim bir savaşın izini taşır.', mods: { maxHp: 32, dmgPct: 0.05 } },
  { id: 'e_karademir', name: 'Kara Demir Zırh',   slot: 'zirh', rarity: 3, price: 220, icon: 'z_kara',
    desc: 'Kanı emen kara bir alaşım.', mods: { maxHp: 28, lifeSteal: 0.02 } },
  { id: 'e_kadimzirh', name: 'Kadim Muhafız Zırhı', slot: 'zirh', rarity: 4, price: 390, icon: 'z_kadim',
    desc: 'Sayısız savaş görmüş, hiç kırılmamış.', mods: { maxHp: 48, dmgPct: 0.06 } },

  /* ── ELDİVEN: el işçiliği ── */
  { id: 'e_derield',   name: 'Deri Eldiven',      slot: 'eldiven', rarity: 1, price: 40, icon: 'g_deri',
    desc: 'İyi bir kavrama her şeyi değiştirir.', mods: { atkPct: 0.06 } },
  { id: 'e_zincirel',  name: 'Zincir Eldiven',    slot: 'eldiven', rarity: 2, price: 110, icon: 'g_zincir',
    desc: 'Halkalar arasında hız saklı.', mods: { atkPct: 0.10, maxHp: -5 } },
  { id: 'e_kanpence',  name: 'Kan Emici Pençe',   slot: 'eldiven', rarity: 2, price: 120, icon: 'g_kanpence',
    desc: 'Tuttuğu her şeyden bir pay alır.', mods: { lifeSteal: 0.03 } },
  { id: 'e_keskinpence', name: 'Keskin Pençe',    slot: 'eldiven', rarity: 3, price: 210, icon: 'g_keskin',
    desc: 'Vuruş hem sert hem çevik.', mods: { dmgPct: 0.10, atkPct: 0.05 } },
  { id: 'e_vampirel',  name: 'Vampir Eldiveni',   slot: 'eldiven', rarity: 3, price: 220, icon: 'g_vampir',
    desc: 'Gece beslenmeyi öğretir.', mods: { lifeSteal: 0.04, dmgPct: 0.06, maxHp: -6 } },
  { id: 'e_savaseldiven', name: 'Kadim Savaş Eldiveni', slot: 'eldiven', rarity: 4, price: 380, icon: 'g_kadim',
    desc: 'Sayısız düşman bu eli tanıdı.', mods: { dmgPct: 0.12, atkPct: 0.08 } },

  /* ── ÇİZME: ayak işi ── */
  { id: 'e_derizizme', name: 'Deri Çizme',        slot: 'cizme', rarity: 1, price: 40, icon: 'b_deri',
    desc: 'Sessiz adımlar, hızlı vuruş.', mods: { atkPct: 0.06 } },
  { id: 'e_cevikbot',  name: 'Çevik Bot',         slot: 'cizme', rarity: 2, price: 110, icon: 'b_cevik',
    desc: 'Hafiflik hıza dönüşür.', mods: { atkPct: 0.10, maxHp: -5 } },
  { id: 'e_zirhlibot', name: 'Zırhlı Bot',        slot: 'cizme', rarity: 2, price: 115, icon: 'b_zirhli',
    desc: 'Ağır adımlar, sağlam duruş.', mods: { maxHp: 18 } },
  { id: 'e_firtinacizme', name: 'Fırtına Çizmesi', slot: 'cizme', rarity: 3, price: 210, icon: 'b_firtina',
    desc: 'Her adım bir önceki rüzgârı taşır.', mods: { atkPct: 0.14 } },
  { id: 'e_kanizi',    name: 'Kan İzi Botu',      slot: 'cizme', rarity: 3, price: 215, icon: 'b_kanizi',
    desc: 'Bastığı yerde iz değil, kan bırakır.', mods: { lifeSteal: 0.03, atkPct: 0.05 } },
  { id: 'e_avcicizme', name: 'Kadim Avcı Çizmesi', slot: 'cizme', rarity: 4, price: 380, icon: 'b_kadim',
    desc: 'Hiçbir av bu adımlardan kaçamaz.', mods: { atkPct: 0.15, dmgPct: 0.06 } },
];

/* ── EŞYA GELİŞTİRME (Clash Royale mantığı): sandıktan düşen aynı eşyanın
   fazlaları KART olarak birikir; kart + Altın harcanarak seviye atlanır.
   Maks 6 seviye — dengeyi bozmasın diye toplam güç artışı %60 ile sınırlı
   (bkz. gearLevelMods). Eşyalar SADECE sandıktan çıkar, doğrudan satın alınmaz. */
export const GEAR_MAX_LEVEL = 6;
export const GEAR_CARD_REQ = [0, 0, 2, 4, 8, 14, 22];
export const GEAR_GOLD_COST = [0, 0, 25, 60, 130, 260, 480];

/** Seviyeye göre eşya güç çarpanı (seviye 1 = taban, seviye 6 = +%60). */
export function gearLevelMods(level) {
  const b = Math.max(0, (level | 0) - 1);
  return 1 + 0.12 * b;
}

/* Nadirlik zarı: dalga ilerledikçe ve şans arttıkça yükselir */
export function rarityRoll(w, luck) {
  const l = 1 + luck;
  const c = [
    Math.max(12, 90 - w * 7),
    (14 + w * 3.2) * l,
    w >= 3 ? (3 + w * 2.4) * l : 0,
    w >= 5 ? (0.5 + w * 1.1) * l : 0,
  ];
  const tot = c[0] + c[1] + c[2] + c[3];
  let r = Math.random() * tot;
  for (let i = 0; i < 4; i++) { r -= c[i]; if (r <= 0) return i + 1; }
  return 1;
}

/* ═══ v49 DENGE TEMELİ — bütçeye oturtma (balance.js) ═══
   Kahramanın pasif mods'u nadirlik bütçesine, eşyanınki sıra × yuva
   bütçesine ölçeklenir; yazılan sayılar KİMLİK ORANIDIR. Bütçe dışı
   kalması gereken kayıt `fixed: true` taşır. Yükleme anında bir kez. */
for (const id in CHARACTERS) {
  const ch = CHARACTERS[id];
  if (ch.mods && !ch.fixed) ch.mods = fitMods(ch.mods, heroBudget(ch.rarity));
  /* stat satırı(ları) mods'tan yeniden yazılır */
  if (Array.isArray(ch.perks)) {
    const STAT = /^(Hasar|Hız|Azami can|Saldırı hızı)\s*[+−-]/;
    const at = ch.perks.findIndex((p) => STAT.test(p));
    if (at >= 0) {
      ch.perks = ch.perks.filter((p) => !STAT.test(p));
      ch.perks.splice(at, 0, modsLine(ch.mods));
    }
  }
}
for (const e of EQUIPMENT) {
  if (e.mods && !e.fixed) e.mods = fitMods(e.mods, gearBudget(e.slot, e.rarity));
}
