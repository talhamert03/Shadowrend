/* ═══════════════════════════════════════════════════════════
   cardArt.js — Savaş içi seçim kartlarının ÖZEL glif seti.
   Cephane (ekipman) sanatından tamamen bağımsız: rün dilinde,
   kalın konturlu, tek renk (currentColor) ikonlar. Kart vurgu
   rengini otomatik alır, kademe rengiyle birlikte boyanır.
   ═══════════════════════════════════════════════════════════ */

const W = (body) =>
  '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">' + body + '</svg>';

/* ── İMZA SİLAH GLİFLERİ (silah kimliği) ── */
const WEAPON_GLYPHS = {
  /* deri sapan: kese + iki kayış + kesedeki taş — SAPANCI'nın imzası */
  sapan: W('<path d="M8 9 Q17 21 24 26" stroke-width="2.2"/>' +
        '<path d="M8 39 Q17 27 24 26" stroke-width="2.2"/>' +
        '<path d="M24 20 Q36 26 24 32 Q30 26 24 20 Z" stroke-width="2"/>' +
        '<circle cx="29" cy="26" r="4.2" fill="currentColor" stroke="none"/>' +
        '<circle cx="8" cy="9" r="2.2" fill="currentColor" stroke="none"/>' +
        '<circle cx="8" cy="39" r="2.2" fill="currentColor" stroke="none"/>'),
  /* yay + gerili ok — okçunun imzası */
  yay: W('<path d="M14 8 Q34 24 14 40"/><path d="M14 8 L14 40"/>' +
        '<path d="M10 24 H34"/><path d="M34 24 L27 20 M34 24 L27 28"/>' +
        '<circle cx="38" cy="24" r="1.6" fill="currentColor" stroke="none"/>'),
  ok: W('<path d="M16 6 Q38 24 16 42"/><path d="M16 6 L16 42"/>' +
        '<path d="M12 24 H36"/><path d="M36 24 L29 20 M36 24 L29 28"/>'),
  kilic: W('<path d="M12 36 L32 16 L38 10 L40 8"/><path d="M36 6 L42 12"/>' +
        '<path d="M15 29 L19 33"/><path d="M10 34 L14 38 M8 40 L12 36"/>' +
        '<path d="M30 10 Q37 15 38 22" stroke-width="1.6" opacity="0.6"/>'),
  /* Kale Palası — düz, dürüst pala (kılıcın savrulan-yay hissine karşı dik ve sade) */
  pala: W('<path d="M24 4 L24 30" stroke-width="3.4"/><path d="M24 4 L21.5 9 M24 4 L26.5 9" stroke-width="2"/>' +
        '<path d="M14 13 H34" stroke-width="2.6"/>' +
        '<path d="M20 30 H28 V37 L24 42 L20 37 Z"/>'),
  alev: W('<path d="M24 4 C31 13 36 19 36 27 C36 35 30.5 42 24 42 C17.5 42 12 35 12 27 C12 19 17 13 24 4 Z"/>' +
        '<path d="M24 17 C27.5 22 29.5 25 29.5 29 C29.5 34 27 37.5 24 37.5 C21 37.5 18.5 34 18.5 29 C18.5 25 20.5 22 24 17 Z" stroke-width="1.8" opacity="0.65"/>'),
  bicak: W('<circle cx="24" cy="24" r="13" stroke-dasharray="4 6" stroke-width="1.8" opacity="0.7"/>' +
        '<path d="M24 6 L28 12 L24 16 L20 12 Z" fill="currentColor" stroke="none"/>' +
        '<path d="M40 30 L34 32 L32 27 L38 26 Z" fill="currentColor" stroke="none"/>' +
        '<path d="M10 32 L16 33 L17 28 L11 27 Z" fill="currentColor" stroke="none"/>' +
        '<circle cx="24" cy="24" r="2.4" fill="currentColor" stroke="none"/>'),
  kor: W('<path d="M24 6 C30 14 36 18 36 28 A12 12 0 0 1 12 28 C12 20 18 15 24 6 Z"/>' +
        '<path d="M24 22 C27 26 29 27 29 31 A5 5 0 0 1 19 31 C19 27 21 26 24 22 Z" fill="currentColor" stroke="none" opacity="0.85"/>'),
  yildirim: W('<path d="M27 4 L14 26 H23 L20 44 L36 20 H26 L30 4 Z"/>'),
  kure: W('<circle cx="24" cy="24" r="14"/><path d="M15 17 A11 11 0 0 0 17 33" stroke-width="1.8" opacity="0.65"/>' +
        '<circle cx="30" cy="18" r="2" fill="currentColor" stroke="none"/>' +
        '<path d="M38 8 L39.4 11 L42.5 12.2 L39.4 13.4 L38 16.5 L36.6 13.4 L33.5 12.2 L36.6 11 Z" fill="currentColor" stroke="none"/>'),
  sacma: W('<path d="M8 30 L22 22 L26 30 L12 36 Z"/><path d="M22 22 L20 15"/>' +
        '<circle cx="32" cy="16" r="2" fill="currentColor" stroke="none"/>' +
        '<circle cx="38" cy="22" r="2" fill="currentColor" stroke="none"/>' +
        '<circle cx="36" cy="10" r="2" fill="currentColor" stroke="none"/>'),
  bomba: W('<circle cx="22" cy="28" r="12"/><path d="M28 18 L32 12"/>' +
        '<path d="M32 12 L30 9 M32 12 L36 12 M32 12 L34 8" stroke-width="1.8"/>' +
        '<path d="M17 25 A6 6 0 0 1 22 22" stroke-width="1.8" opacity="0.65"/>'),

  /* ── SEVİYE İLE AÇILAN OKÇU YETENEKLERİ (efsanevi kartlar) ── */
  /* patlayıcı uç: ok + saçılan şok halkası */
  patlayici: W('<path d="M6 42 L20 28"/><path d="M6 42 L6 36 M6 42 L12 42" stroke-width="2"/>' +
        '<circle cx="29" cy="19" r="7"/>' +
        '<path d="M29 4 V10 M44 19 H38 M39.6 8.4 L35.4 12.6 M39.6 29.6 L35.4 25.4 M18.4 8.4 L22.6 12.6" stroke-width="2.2"/>' +
        '<circle cx="29" cy="19" r="2.6" fill="currentColor" stroke="none"/>'),
  /* takipçi ok: kavis çizen yörünge + hedef */
  takipci: W('<path d="M5 40 C16 40 12 14 30 14"/>' +
        '<path d="M30 14 L23 10 M30 14 L23 18" stroke-width="2.2"/>' +
        '<circle cx="37" cy="14" r="6" stroke-dasharray="3 4" stroke-width="1.8"/>' +
        '<circle cx="37" cy="14" r="1.8" fill="currentColor" stroke="none"/>'),
  /* ay nişancısı: hilal + artı nişan */
  nisanci: W('<path d="M31 6 A18 18 0 1 0 31 42 A14 14 0 1 1 31 6 Z" opacity="0.55"/>' +
        '<circle cx="31" cy="24" r="9"/><path d="M31 11 V17 M31 31 V37 M18 24 H24 M38 24 H44" stroke-width="2.2"/>' +
        '<circle cx="31" cy="24" r="2.2" fill="currentColor" stroke="none"/>'),
  /* ok yağmuru: gökten inen üç ok + yer halkası */
  yagmur: W('<path d="M12 5 V26 M24 3 V30 M36 5 V26"/>' +
        '<path d="M8.5 21 L12 26 L15.5 21 M20.5 25 L24 30 L27.5 25 M32.5 21 L36 26 L39.5 21" stroke-width="2.2"/>' +
        '<path d="M8 37 Q24 31 40 37" stroke-width="2" opacity="0.7"/>' +
        '<path d="M12 42 Q24 36 36 42" stroke-width="1.6" opacity="0.45"/>'),
  /* dolunay salvosu: dolu ay diski önünde üç ok yelpazesi */
  salvo: W('<circle cx="24" cy="24" r="13" opacity="0.35"/>' +
        '<path d="M6 24 H40 M8 14 L38 20 M8 34 L38 28"/>' +
        '<path d="M40 24 L33 20 M40 24 L33 28" stroke-width="2.2"/>' +
        '<path d="M38 20 L31 17.6 M38 28 L31 30.4" stroke-width="1.8" opacity="0.8"/>'),

  /* ── ŞİMŞEK KIRIĞI: efsanevi kahramanın imza silahı (temel kademeler) ── */
  simsek: W('<path d="M25 3 L12 24 H19 L14 45 L37 20 H28 Z"/>' +
        '<circle cx="8" cy="10" r="1.6" fill="currentColor" stroke="none" opacity="0.7"/>' +
        '<circle cx="41" cy="16" r="1.4" fill="currentColor" stroke="none" opacity="0.7"/>' +
        '<circle cx="10" cy="38" r="1.4" fill="currentColor" stroke="none" opacity="0.7"/>'),

  /* ── KAPTAN TOPU: çakmaklı hayalet tabancası + uçan gülle ── */
  topatar: W('<path d="M6 16 H30 L30 24 H10 Z"/>' +
        '<path d="M6 13 V27" stroke-width="3.2"/>' +
        '<path d="M26 24 L31 38 L23 41 L20 30" stroke-width="2.4"/>' +
        '<path d="M22 16 L26 10" stroke-width="2"/>' +
        '<circle cx="41" cy="20" r="5" fill="currentColor" stroke="none" opacity="0.9"/>' +
        '<path d="M12 19 H24" stroke-width="1.6" opacity="0.55"/>'),

  /* ── TAÇ KILICI: taç kabzalı kılıç + ileri fırlayan kesik ── */
  tackilic: W('<path d="M24 5 L27 30 H21 L24 5 Z" stroke-width="2.4"/>' +
        '<path d="M15 30 H33" stroke-width="2.6"/>' +
        '<path d="M20 34 H28 L26 41 H22 Z"/>' +
        '<path d="M18 12 L21 6 L24 11 L27 6 L30 12" stroke-width="1.8" opacity="0.75"/>' +
        '<path d="M8 20 A18 18 0 0 0 8 40" stroke-width="2" opacity="0.7"/>' +
        '<path d="M40 20 A18 18 0 0 1 40 40" stroke-width="2" opacity="0.7"/>'),

  /* ── YEMİN KILICI: kalkan kabzalı dik kılıç + iki yanda ayaz halkası ──
     Taç Kılıcı ile aynı "dik kılıç" iskeletini paylaşır (ikisi de süzülen
     imza kılıcı), ama kabzası taç değil KALKAN ve yanlardaki yaylar
     kesik değil zeminde çatlayan halkadır — Ayaz'ın taban şoku. */
  yemin: W('<path d="M24 4 L27 29 H21 L24 4 Z" stroke-width="2.4"/>' +
        '<path d="M14 29 H34" stroke-width="2.6"/>' +
        '<path d="M24 33 L30 36 V40 C30 43 27 45 24 46 C21 45 18 43 18 40 V36 Z"/>' +
        '<path d="M6 30 Q13 26 13 20" stroke-width="2" opacity="0.7"/>' +
        '<path d="M42 30 Q35 26 35 20" stroke-width="2" opacity="0.7"/>' +
        '<path d="M4 38 L10 35 M44 38 L38 35" stroke-width="1.6" opacity="0.45"/>'),

  /* ── PETİN SAVAŞ KATKISI (yoldaş kartı) ── */
  pet: W('<path d="M24 14 C28 14 31 17 31 21 C31 26 27 30 24 34 C21 30 17 26 17 21 C17 17 20 14 24 14 Z"/>' +
        '<path d="M17 20 C11 14 6 13 4 15 C6 20 10 23 16 24 Z"/>' +
        '<path d="M31 20 C37 14 42 13 44 15 C42 20 38 23 32 24 Z"/>' +
        '<circle cx="21.5" cy="21" r="1.5" fill="currentColor" stroke="none"/>' +
        '<circle cx="26.5" cy="21" r="1.5" fill="currentColor" stroke="none"/>'),
};

/* ── PASİF RÜN GLİFLERİ ── */
const PASSIVE_GLYPHS = {
  /* can */
  kalp: W('<path d="M24 40 C10 30 6 22 9 15 C12 9 20 9 24 16 C28 9 36 9 39 15 C42 22 38 30 24 40 Z"/>' +
        '<path d="M16 18 C17 15 19 14 21 14.5" stroke-width="1.8" opacity="0.7"/>'),
  /* hareket hızı */
  cizme: W('<path d="M14 10 L30 24 L14 38" opacity="0.45"/><path d="M22 10 L38 24 L22 38"/>' +
        '<path d="M6 17 H12 M4 24 H10 M6 31 H12" stroke-width="1.8" opacity="0.7"/>'),
  /* saldırı hızı */
  cabukluk: W('<path d="M38 20 A15 15 0 1 0 40 28"/><path d="M40 12 V21 H31"/>' +
        '<path d="M24 17 V25 L30 29" stroke-width="2.2"/>'),
  /* çekim alanı */
  miknatis: W('<path d="M17 20 A7 7 0 0 1 31 20 V32 H24 17 Z" transform="rotate(0 24 24)"/>' +
        '<path d="M17 26 H31" stroke-width="1.8"/><path d="M20 36 L18 41 M28 36 L30 41 M24 37 V43" stroke-width="1.8" opacity="0.75"/>'),
  /* kritik */
  keskinlik: W('<circle cx="24" cy="24" r="13"/><path d="M24 5 V13 M24 35 V43 M5 24 H13 M35 24 H43"/>' +
        '<circle cx="24" cy="24" r="3" fill="currentColor" stroke="none"/>'),
  /* zırh */
  zirh: W('<path d="M24 5 L39 11 V22 C39 32 32 38 24 42 C16 38 9 32 9 22 V11 Z"/>' +
        '<path d="M24 12 V35" stroke-width="1.8" opacity="0.6"/><path d="M15 20 H33" stroke-width="1.8" opacity="0.6"/>'),
  /* hasar */
  gazap: W('<path d="M24 4 L28 16 L40 14 L31 23 L42 30 L29 30 L31 43 L24 33 L17 43 L19 30 L6 30 L17 23 L8 14 L20 16 Z"/>'),
  /* v70 B1 */
  kiragi: W('<path d="M24 5 L39 11 V22 C39 32 32 38 24 42 C16 38 9 32 9 22 V11 Z"/><path d="M24 14 V32 M16 19 L32 27 M32 19 L16 27" stroke-width="1.8" opacity="0.75"/>'),
  buzkalp: W('<path d="M24 40 C10 30 6 22 9 15 C12 9 20 9 24 16 C28 9 36 9 39 15 C42 22 38 30 24 40 Z"/><path d="M24 18 V32 M18 21 L30 29 M30 21 L18 29" stroke-width="1.6" opacity="0.8"/>'),
  hayalet: W('<path d="M14 40 V20 A10 10 0 0 1 34 20 V40 L30 36 L26 40 L22 36 L18 40 Z"/><circle cx="20" cy="22" r="1.6" fill="currentColor" stroke="none"/><circle cx="28" cy="22" r="1.6" fill="currentColor" stroke="none"/>'),
  hasatrun: W('<path d="M24 6 C31 14 34 20 34 26 A10 10 0 0 1 14 26 C14 20 17 14 24 6 Z"/><path d="M8 40 H40" stroke-width="1.8" opacity="0.6"/><path d="M19 27 A5 5 0 0 0 24 32" stroke-width="1.8" opacity="0.7"/>'),
  kanemici: W('<path d="M24 6 C31 16 35 22 35 28 A11 11 0 0 1 13 28 C13 22 17 16 24 6 Z"/><path d="M19 26 L24 31 L29 26" stroke-width="2"/>'),
  statik: W('<path d="M27 4 L13 26 H23 L20 44 L35 20 H25 Z"/>'),
  demir: W('<rect x="11" y="14" width="26" height="22" rx="3"/><path d="M11 22 H37 M11 29 H37 M20 14 V36 M28 14 V36" stroke-width="1.6" opacity="0.6"/>'),
  kulkani: W('<path d="M24 5 C30 13 36 18 36 27 A12 12 0 0 1 12 27 C12 21 16 17 18 12 C20 17 22 19 24 19 C24 14 23 10 24 5 Z"/><circle cx="24" cy="30" r="3" fill="currentColor" stroke="none"/>'),
};

/* ── NİMETLER ── */
const BOON_GLYPHS = {
  heal: W('<path d="M20 6 H28 V14 L34 20 V40 A3 3 0 0 1 31 43 H17 A3 3 0 0 1 14 40 V20 L20 14 Z"/>' +
        '<path d="M24 24 V36 M18 30 H30" stroke-width="3"/>'),
  heal2: W('<path d="M20 6 H28 V14 L34 20 V40 A3 3 0 0 1 31 43 H17 A3 3 0 0 1 14 40 V20 L20 14 Z"/>' +
        '<path d="M24 24 V36 M18 30 H30" stroke-width="3"/>'),
  guc: W('<path d="M24 42 V14"/><path d="M14 24 L24 14 L34 24"/>' +
        '<path d="M14 12 L24 4 L34 12" opacity="0.5"/>'),
};

/* ── SEHER'İN SÜZÜLEN KILICI: seviye ile açılan efsanevi kart glifleri ──
   Silah gliflerine karıştırılmadan ayrı tutulur; hepsi kartın vurgu
   rengini (currentColor) alır. */
const SEHER_GLYPHS = {
  /* girdap: kılıcın 360° dönüşü — sarmal + iki bıçak izi */
  girdap: W('<path d="M24 24 C24 16 31 11 38 13" stroke-width="2.2"/>' +
        '<path d="M24 24 C24 32 17 37 10 35" stroke-width="2.2"/>' +
        '<path d="M38 13 L33 9.5 M38 13 L34.5 18" stroke-width="2"/>' +
        '<path d="M10 35 L15 38.5 M10 35 L13.5 30" stroke-width="2"/>' +
        '<circle cx="24" cy="24" r="14" stroke-dasharray="3 7" stroke-width="1.5" opacity="0.65"/>' +
        '<circle cx="24" cy="24" r="2.4" fill="currentColor" stroke="none"/>'),
  /* ikiz savuruş: karşılıklı iki hilal */
  ikiz: W('<path d="M17 6 A18 18 0 0 0 17 42" stroke-width="2.4"/>' +
        '<path d="M31 8 A15 15 0 0 1 31 40" stroke-width="2.4" opacity="0.75"/>' +
        '<path d="M17 6 L13 11 M17 42 L13 37" stroke-width="2"/>' +
        '<path d="M31 8 L35 13 M31 40 L35 35" stroke-width="2" opacity="0.75"/>'),
  /* ay kesiği: fırlayan hilal dalga */
  kesik: W('<path d="M12 8 A20 20 0 0 1 12 40" stroke-width="2.6"/>' +
        '<path d="M21 12 A14 14 0 0 1 21 36" stroke-width="2" opacity="0.7"/>' +
        '<path d="M30 16 A9 9 0 0 1 30 32" stroke-width="1.6" opacity="0.45"/>' +
        '<path d="M36 20 L42 24 L36 28" stroke-width="2.2"/>'),
  /* ruh yankısı: kılıç + hayalet ikizi */
  yanki: W('<path d="M14 38 L30 22 L36 15" stroke-width="2.4"/>' +
        '<path d="M32 12 L37 17" stroke-width="2.2"/>' +
        '<path d="M11 33 L15 37" stroke-width="2"/>' +
        '<path d="M20 42 L36 26 L41 20" stroke-width="1.8" opacity="0.42"/>' +
        '<path d="M38 17 L43 22" stroke-width="1.6" opacity="0.42"/>'),
  /* seher nişanı: doğan güneş + hilal + nişan çentiği */
  nisan: W('<path d="M31 7 A17 17 0 1 0 31 41 A13 13 0 1 1 31 7 Z" opacity="0.5"/>' +
        '<path d="M6 40 H42" stroke-width="2"/>' +
        '<path d="M12 34 L16 30 M36 34 L32 30" stroke-width="1.8" opacity="0.7"/>' +
        '<circle cx="28" cy="22" r="7" stroke-width="2.2"/>' +
        '<circle cx="28" cy="22" r="2" fill="currentColor" stroke="none"/>'),
};

/* ── ŞİMŞEK'İN SÜZÜLEN YILDIRIMI: seviye ile açılan efsanevi kart glifleri ──
   Seher_GLYPHS'ten bağımsız tutulur; hepsi kartın vurgu rengini alır. */
const SIMSEK_GLYPHS = {
  /* zincirleme: üç düğüm arası sıçrayan çentikli hat */
  zincir: W('<circle cx="8" cy="34" r="3.4"/><circle cx="24" cy="14" r="3.4"/><circle cx="40" cy="30" r="3.4"/>' +
        '<path d="M11 32 L15 24 L20 27 L22 17" stroke-width="2.2"/>' +
        '<path d="M27 16 L32 22 L28 25 L37 28" stroke-width="2.2"/>'),
  /* şok dalgası: bolt + genişleyen çift halka */
  sokdalga: W('<path d="M26 4 L14 24 H21 L17 44 L34 20 H25 Z"/>' +
        '<circle cx="24" cy="24" r="16" stroke-dasharray="3 6" stroke-width="1.6" opacity="0.55"/>' +
        '<circle cx="24" cy="24" r="21" stroke-dasharray="2 8" stroke-width="1.3" opacity="0.35"/>'),
  /* yıkıcı çarpma: bolt + savrulma okları */
  yikici: W('<path d="M25 3 L14 22 H20 L16 41 L32 18 H24 Z"/>' +
        '<path d="M4 24 H9 M39 24 H44 M9 9 L12.5 12.5 M39 9 L35.5 12.5 M9 39 L12.5 35.5 M39 39 L35.5 35.5" stroke-width="2.2"/>'),
  /* fırtına çağrısı: bulut + iki çakan bolt */
  firtina: W('<path d="M13 22 A8 8 0 0 1 15 6.4 A9 9 0 0 1 32 8 A7 7 0 0 1 35 22 Z"/>' +
        '<path d="M20 24 L15 34 H19 L15 44" stroke-width="2.2"/>' +
        '<path d="M31 24 L26 33 H30 L27 41" stroke-width="2.2"/>'),
  /* kadim fırtına: halo + büyük bolt + yörünge kıvılcımları (ultimate) */
  kadimfirtina: W('<circle cx="24" cy="24" r="17" opacity="0.5"/>' +
        '<path d="M27 6 L14 26 H22 L18 42 L36 20 H26 Z"/>' +
        '<circle cx="9" cy="14" r="1.8" fill="currentColor" stroke="none"/>' +
        '<circle cx="40" cy="32" r="1.8" fill="currentColor" stroke="none"/>'),
};

/* ── SAVAŞÇI'NIN KALE PALASI: seviye ile açılan nöbetçi kart glifleri ──
   Diğer ikisinden bağımsız; kart vurgu rengini (currentColor) alır. */
const SAVASCI_GLYPHS = {
  /* kalkan duruşu: kalkan + merkez perçin */
  kalkan: W('<path d="M24 5 L38 11 V23 C38 33 32 39 24 43 C16 39 10 33 10 23 V11 Z"/>' +
        '<circle cx="24" cy="21" r="4"/><path d="M24 25 V33" stroke-width="2.2"/>'),
  /* kasırga vuruşu: dönen ok + dik pala */
  cevirme: W('<path d="M36 16 A14 14 0 1 0 38 26" stroke-width="2.4"/><path d="M38 8 L36 16 L29 13" stroke-width="2.2"/>' +
        '<path d="M24 15 V33" stroke-width="2.8"/><path d="M18 20 H30" stroke-width="2"/>'),
  /* çifte vuruş: iki paralel çapraz kesik */
  ikincidarbe: W('<path d="M9 18 L29 4" stroke-width="2.6"/><path d="M25 8 L30 5 M25 8 L27 13" stroke-width="2"/>' +
        '<path d="M18 44 L38 30" stroke-width="2.6" opacity="0.6"/><path d="M34 34 L39 31 M34 34 L36 39" stroke-width="2" opacity="0.6"/>'),
  /* sarsıcı darbe: merkez çarpma + saçılan çentikler */
  sarsinti: W('<circle cx="24" cy="24" r="6"/>' +
        '<path d="M24 4 V13 M24 35 V44 M4 24 H13 M35 24 H44 M10 10 L16 16 M38 10 L32 16 M10 38 L16 32 M38 38 L32 32" stroke-width="2.4"/>'),
  /* son nöbet: kalkan + merkez yıldız (kademeli finale) */
  nobetson: W('<path d="M24 5 L38 11 V23 C38 33 32 39 24 43 C16 39 10 33 10 23 V11 Z"/>' +
        '<path d="M24 15 L27 21 L33 22 L28 26 L30 32 L24 28 L18 32 L20 26 L15 22 L21 21 Z" fill="currentColor" stroke="none"/>'),
};

/* ── GÖKALEV'İN MAVİ ALEVİ: seviye ile açılan ateş kart glifleri ──
   Vurgu rengini (currentColor) karttan alır — çerçeve mavi hatta çekildiği
   için glifler de kendiliğinden mavi okunur. */
const GOKALEV_GLYPHS = {
  /* MAVİ NOVA: merkez alev çekirdeği + iki genişleyen şok çeperi.
     İki farklı yarıçapta yay, tek halkadan çok daha iyi "patladı" okunur. */
  nova: W('<path d="M24 15 C28.5 21 31.5 25 31.5 29 C31.5 33.6 28.2 37 24 37 C19.8 37 16.5 33.6 16.5 29 C16.5 25 19.5 21 24 15 Z"/>' +
        '<circle cx="24" cy="30" r="4" fill="currentColor" stroke="none" opacity="0.9"/>' +
        '<path d="M9.5 15.5 A19 19 0 0 0 9.5 38.5 M38.5 15.5 A19 19 0 0 1 38.5 38.5" stroke-width="2.4" opacity="0.85"/>' +
        '<path d="M4 10 A27 27 0 0 0 4 44 M44 10 A27 27 0 0 1 44 44" stroke-width="1.8" opacity="0.45"/>'),
  /* KOR KASIRGASI: merkez + yörüngedeki üç alev küresi, biri kuyruklu.
     Yörünge çizgisi kesikli çizilir — döndüğü anlaşılsın. */
  kasirga: W('<circle cx="24" cy="24" r="14.5" stroke-width="1.8" stroke-dasharray="5 4" opacity="0.55"/>' +
        '<path d="M24 4.5 C27 8 28.8 10.4 28.8 12.9 C28.8 15.9 26.6 18 24 18 C21.4 18 19.2 15.9 19.2 12.9 C19.2 10.4 21 8 24 4.5 Z" fill="currentColor" stroke="none"/>' +
        '<path d="M39 30.5 C41.4 33.3 42.8 35.2 42.8 37.2 C42.8 39.6 41 41.3 39 41.3 C37 41.3 35.2 39.6 35.2 37.2 C35.2 35.2 36.6 33.3 39 30.5 Z" fill="currentColor" stroke="none" opacity="0.85"/>' +
        '<path d="M9 30.5 C11.4 33.3 12.8 35.2 12.8 37.2 C12.8 39.6 11 41.3 9 41.3 C7 41.3 5.2 39.6 5.2 37.2 C5.2 35.2 6.6 33.3 9 30.5 Z" fill="currentColor" stroke="none" opacity="0.85"/>' +
        '<circle cx="24" cy="24" r="3.4" fill="currentColor" stroke="none" opacity="0.75"/>'),
  /* mavi kor: alev + içinde parlayan çekirdek */
  mavikor: W('<path d="M24 5 C31 14 36 20 36 28 C36 36 30.5 43 24 43 C17.5 43 12 36 12 28 C12 20 17 14 24 5 Z"/>' +
        '<circle cx="24" cy="29" r="5.5" fill="currentColor" stroke="none" opacity="0.85"/>'),
  /* alev patlaması: merkez alev + saçılan kıvılcımlar */
  alevpatlama: W('<path d="M24 14 C28.5 20 31.5 24 31.5 28.5 C31.5 33.5 28 37 24 37 C20 37 16.5 33.5 16.5 28.5 C16.5 24 19.5 20 24 14 Z"/>' +
        '<path d="M24 4 V10 M6 24 H12 M36 24 H42 M11 11 L15 15 M37 11 L33 15 M11 40 L15 36 M37 40 L33 36" stroke-width="2.4"/>'),
  /* takipçi alev: alev + kavisli takip izi ve ok ucu */
  takipalev: W('<path d="M17 10 C21 15 23.5 18 23.5 21.5 C23.5 25.5 20.8 28.5 17 28.5 C13.2 28.5 10.5 25.5 10.5 21.5 C10.5 18 13 15 17 10 Z"/>' +
        '<path d="M22 32 Q31 34 35 26" stroke-width="2.2"/><path d="M36 19 L35 26 L29.5 24" stroke-width="2.2"/>'),
  /* alev yağmuru: yukarıdan inen üç alev damlası */
  alevyagmur: W('<path d="M13 20 C15.6 23.5 17 25.6 17 28 C17 31.2 15.2 33.4 13 33.4 C10.8 33.4 9 31.2 9 28 C9 25.6 10.4 23.5 13 20 Z"/>' +
        '<path d="M24 26 C26.6 29.5 28 31.6 28 34 C28 37.2 26.2 39.4 24 39.4 C21.8 39.4 20 37.2 20 34 C20 31.6 21.4 29.5 24 26 Z"/>' +
        '<path d="M35 20 C37.6 23.5 39 25.6 39 28 C39 31.2 37.2 33.4 35 33.4 C32.8 33.4 31 31.2 31 28 C31 25.6 32.4 23.5 35 20 Z"/>' +
        '<path d="M13 6 V14 M24 4 V18 M35 6 V14" stroke-width="2.2" opacity="0.6"/>'),
  /* mavi cehennem: büyük alev + içinde yıldız (kademeli finale) */
  cehennem: W('<path d="M24 3 C32 13 38 20 38 28.5 C38 37 31.8 44 24 44 C16.2 44 10 37 10 28.5 C10 20 16 13 24 3 Z"/>' +
        '<path d="M24 19 L27 26 L34 27 L29 31.5 L31 38.5 L24 34.5 L17 38.5 L19 31.5 L14 27 L21 26 Z" fill="currentColor" stroke="none"/>'),
};

const FALLBACK = W('<path d="M24 6 L38 24 L24 42 L10 24 Z"/><path d="M24 15 L31 24 L24 33 L17 24 Z" fill="currentColor" stroke="none" opacity="0.7"/>');

/* ── KARA KAPTAN'IN TOPU: seviye ile açılan barut kartı glifleri ──
   Kimlik dili AĞIR DEMİR + BARUT: yuvarlak gülleler, fıçı, namlu.
   Kraliçenin ince kavisli kesikleriyle kasıtlı zıt okunur. */
const KORSAN_GLYPHS = {
  /* saçılan gülle: büyük gülle + üç parçaya ayrılma */
  sacilan: W('<circle cx="13" cy="24" r="7.5" fill="currentColor" stroke="none"/>' +
        '<circle cx="36" cy="11" r="3.6" fill="currentColor" stroke="none" opacity="0.9"/>' +
        '<circle cx="40" cy="25" r="3.6" fill="currentColor" stroke="none" opacity="0.9"/>' +
        '<circle cx="34" cy="38" r="3.6" fill="currentColor" stroke="none" opacity="0.9"/>' +
        '<path d="M21 20 L31 13 M22 24 L35 25 M21 29 L30 35" stroke-width="1.8" opacity="0.6"/>'),
  /* barut fıçısı: fıçı + fitil + saçılan çentikler */
  barutfici: W('<path d="M14 16 H34 V36 H14 Z"/>' +
        '<path d="M14 22 H34 M14 30 H34" stroke-width="1.6" opacity="0.6"/>' +
        '<path d="M28 16 L33 9" stroke-width="2.2"/>' +
        '<path d="M33 9 L31 5 M33 9 L38 8 M33 9 L36 4" stroke-width="1.8"/>' +
        '<path d="M8 12 L11 15 M40 30 L44 32 M8 40 L11 37" stroke-width="2" opacity="0.7"/>'),
  /* çifte namlu: iki paralel namlu + iki gülle */
  ciftnamlu: W('<path d="M6 14 H28 V21 H6 Z"/><path d="M6 27 H28 V34 H6 Z"/>' +
        '<circle cx="37" cy="17" r="4.4" fill="currentColor" stroke="none"/>' +
        '<circle cx="40" cy="31" r="4.4" fill="currentColor" stroke="none"/>' +
        '<path d="M6 11 V37" stroke-width="2.8"/>'),
  /* bordo ateşi: gemi bordası + üç namludan salvo */
  bordo: W('<path d="M7 30 H41 L36 41 H12 Z"/>' +
        '<path d="M11 12 H19 V22 H11 Z M20 12 H28 V22 H20 Z M29 12 H37 V22 H29 Z" stroke-width="2"/>' +
        '<path d="M15 12 V5 M24 12 V3 M33 12 V5" stroke-width="2.2" opacity="0.8"/>' +
        '<circle cx="15" cy="3" r="1.8" fill="currentColor" stroke="none"/>' +
        '<circle cx="33" cy="3" r="1.8" fill="currentColor" stroke="none"/>'),
  /* hayalet salvosu: kuru kafa + nişan halkası (kademeli finale) */
  hayaletsalvo: W('<circle cx="24" cy="22" r="16" stroke-dasharray="4 6" stroke-width="1.6" opacity="0.55"/>' +
        '<path d="M24 8 C31 8 35 13 35 19 C35 23 33 26 30 28 L30 33 H18 V28 C15 26 13 23 13 19 C13 13 17 8 24 8 Z"/>' +
        '<circle cx="19.5" cy="19" r="2.6" fill="currentColor" stroke="none"/>' +
        '<circle cx="28.5" cy="19" r="2.6" fill="currentColor" stroke="none"/>' +
        '<path d="M22 25 H26" stroke-width="1.8"/>' +
        '<path d="M24 38 V44 M8 22 H2 M46 22 H40" stroke-width="2" opacity="0.75"/>'),
};

/* ── GECE KRALİÇESİ'NİN TAÇ KILICI: kesik glifleri ──
   Kimlik dili İNCE KAVİS + TAÇ: kesikler ileriye fırlayan hilaller,
   finalde taç. Seher'in hilalleriyle karışmaması için hepsinde taç/kanat
   motifi ya da ileri yön oku bulunur. */
const KRALICE_GLYPHS = {
  /* üçlü kesik: yelpaze halinde üç hilal */
  uclu: W('<path d="M14 6 A20 20 0 0 1 14 42" stroke-width="2.6"/>' +
        '<path d="M24 11 A15 15 0 0 1 24 37" stroke-width="2.2" opacity="0.78"/>' +
        '<path d="M33 16 A10 10 0 0 1 33 32" stroke-width="1.8" opacity="0.5"/>' +
        '<path d="M39 20 L45 24 L39 28" stroke-width="2.2"/>'),
  /* kanat kesiği: geniş hilal + kanat tüyleri */
  kanat: W('<path d="M12 5 A21 21 0 0 1 12 43" stroke-width="2.8"/>' +
        '<path d="M18 12 A14 14 0 0 1 18 36" stroke-width="1.8" opacity="0.55"/>' +
        '<path d="M28 14 L40 10 M30 20 L44 18 M30 28 L44 30 M28 34 L40 38" stroke-width="2" opacity="0.85"/>'),
  /* ikiz ferman: karşılıklı iki kesik + ortada taç taşı */
  ikizferman: W('<path d="M15 5 A19 19 0 0 0 15 43" stroke-width="2.5"/>' +
        '<path d="M33 8 A15 15 0 0 1 33 40" stroke-width="2.5" opacity="0.78"/>' +
        '<path d="M24 19 L28 24 L24 29 L20 24 Z" fill="currentColor" stroke="none"/>'),
  /* gök kılıcı: gökten inen hüküm kılıcı + zemin çeperi */
  gokkilic: W('<path d="M24 3 L27 26 H21 L24 3 Z" fill="currentColor" stroke="none"/>' +
        '<path d="M16 26 H32" stroke-width="2.6"/>' +
        '<path d="M24 26 V38" stroke-width="2.2"/>' +
        '<path d="M9 40 Q24 33 39 40" stroke-width="2.2"/>' +
        '<path d="M5 45 Q24 37 43 45" stroke-width="1.6" opacity="0.45"/>' +
        '<path d="M14 10 L18 16 M34 10 L30 16" stroke-width="1.8" opacity="0.6"/>'),
  /* taç nişanı: taç + nişan halkası (kademeli finale) */
  tacnisan: W('<path d="M11 30 L8 12 L17 20 L24 8 L31 20 L40 12 L37 30 Z"/>' +
        '<path d="M11 35 H37" stroke-width="2.6"/>' +
        '<circle cx="24" cy="22" r="2.4" fill="currentColor" stroke="none"/>' +
        '<path d="M24 40 V45 M4 26 H9 M44 26 H39" stroke-width="2" opacity="0.7"/>'),
};

/* ── AYAZ'IN YEMİN KILICI: sur şövalyesi glifleri ──
   Kimlik dili DÜZ HAT + KIRIK BUZ: kalkan, dik kılıç, altıgen kristal.
   Kraliçenin ince hilalleriyle ve Seher'in sarmallarıyla karışmasın diye
   burada EĞRİ neredeyse yok — bir yemin köşelidir. */
const SOVALYE_GLYPHS = {
  /* kalkan duruşu: kalkan + zeminde çatlayan ayaz halkası */
  durus: W('<path d="M24 4 L38 10 V22 C38 32 32 38 24 42 C16 38 10 32 10 22 V10 Z"/>' +
        '<path d="M24 13 L29 20 L24 27 L19 20 Z" fill="currentColor" stroke="none"/>' +
        '<path d="M4 42 L11 38 M44 42 L37 38" stroke-width="2" opacity="0.7"/>'),
  /* ayaz kabuğu: içteki figürü saran altıgen buz kabuğu + dışa patlayan
     kırık uçlar. Tepkisel olduğu için ok İÇERİDEN DIŞARI bakar — Kraliçenin
     ileri fırlayan kesiğinin tersi. */
  kabuk: W('<path d="M24 9 L35 15 V27 L24 33 L13 27 V15 Z" stroke-width="2.4"/>' +
        '<path d="M24 16 L29 19 V25 L24 28 L19 25 V19 Z" fill="currentColor" stroke="none" opacity="0.85"/>' +
        '<path d="M24 7 V2 M38 13 L43 10 M38 29 L43 32 M24 35 V40 M10 29 L5 32 M10 13 L5 10" stroke-width="2"/>' +
        '<path d="M44 8 L46 12 L42 12 Z M2 8 L6 12 L2 12 Z" fill="currentColor" stroke="none" opacity="0.6"/>'),
  /* ayaz kesiği: ileri fırlayan köşeli buz dalgası */
  ayazkesik: W('<path d="M13 7 L21 24 L13 41" stroke-width="2.8"/>' +
        '<path d="M23 12 L29 24 L23 36" stroke-width="2.2" opacity="0.72"/>' +
        '<path d="M32 17 L36 24 L32 31" stroke-width="1.8" opacity="0.45"/>' +
        '<path d="M39 20 L45 24 L39 28" stroke-width="2.2"/>'),
  /* kasırga nöbeti: kılıcın çevresinde köşeli 360° iz */
  nobet: W('<path d="M24 8 L37 15 V31 L24 38 L11 31 V15 Z" stroke-width="2.2"/>' +
        '<path d="M24 14 V30 M19 28 H29" stroke-width="2.4"/>' +
        '<path d="M40 12 L45 9 M8 12 L3 9 M40 36 L45 39 M8 36 L3 39" stroke-width="1.8" opacity="0.55"/>'),
  /* yemin nişanı: kalkan + altıgen kristal nişanı (kademeli finale) */
  yeminnisan: W('<path d="M24 4 L38 10 V22 C38 32 32 38 24 42 C16 38 10 32 10 22 V10 Z" opacity="0.55"/>' +
        '<path d="M24 12 L32 17 V27 L24 32 L16 27 V17 Z" fill="currentColor" stroke="none"/>' +
        '<path d="M24 44 V47 M2 22 H6 M42 22 H46" stroke-width="2" opacity="0.7"/>'),
};

/* ── SAPANCI'NIN KAVLAK SAPANI: seviye ile açılan tarla bekçisi glifleri ──
   Kimlik dili YUVARLAK TAŞ + KAVİS: her glifte ya bir daire (taş) ya da
   sekmeyi anlatan kırık bir hat var. Kadronun geri kalanı keskin (Ayaz'ın
   buzu köşeli, Kraliçenin kesikleri ince hilal, Kaptanın gülleleri ağır
   demir) — sapanın dili KÜÇÜK ve ÇOK: tek büyük kütle yerine üç ufak taş. */
const SAPANCI_GLYPHS = {
  /* çift kayış: iki gerili kayış + iki taş */
  ciftkayis: W('<path d="M10 8 Q20 22 10 38" stroke-width="2.2"/>' +
        '<path d="M18 8 Q28 22 18 38" stroke-width="2.2"/>' +
        '<circle cx="32" cy="17" r="4.6" fill="currentColor" stroke="none"/>' +
        '<circle cx="38" cy="31" r="4.6" fill="currentColor" stroke="none"/>'),
  /* kırık taş: büyük taş + üçe ayrılma */
  kiriktas: W('<circle cx="14" cy="24" r="7" fill="currentColor" stroke="none"/>' +
        '<path d="M22 24 L33 15 M22 24 L36 24 M22 24 L33 33" stroke-width="2" opacity="0.85"/>' +
        '<circle cx="36" cy="13" r="3.1" fill="currentColor" stroke="none"/>' +
        '<circle cx="40" cy="24" r="3.1" fill="currentColor" stroke="none"/>' +
        '<circle cx="36" cy="35" r="3.1" fill="currentColor" stroke="none"/>'),
  /* taş yağmuru: gökten düşen üç taş + zemin çizgisi */
  tasyagmuru: W('<circle cx="13" cy="9" r="3.6" fill="currentColor" stroke="none"/>' +
        '<circle cx="25" cy="14" r="3.6" fill="currentColor" stroke="none"/>' +
        '<circle cx="36" cy="8" r="3.6" fill="currentColor" stroke="none"/>' +
        '<path d="M13 16 V27 M25 21 V31 M36 15 V26" stroke-width="1.8" opacity="0.7"/>' +
        '<path d="M8 38 H40" stroke-width="2.4"/>'),
  /* sapan ustası: nişan halkası içinde taş */
  sapanustasi: W('<circle cx="24" cy="24" r="13" stroke-width="2.2"/>' +
        '<circle cx="24" cy="24" r="4.4" fill="currentColor" stroke="none"/>' +
        '<path d="M24 5 V11 M24 37 V43 M5 24 H11 M37 24 H43" stroke-width="2"/>'),
  /* gülle: ağır tek kütle + çarpma çizgileri (yavaşlığı ağırlık anlatır) */
  gulle: W('<circle cx="22" cy="25" r="11" fill="currentColor" stroke="none"/>' +
        '<path d="M36 12 L42 7 M38 22 H45 M36 37 L42 42" stroke-width="2.4"/>' +
        '<path d="M8 40 Q22 44 36 40" stroke-width="2" opacity="0.6"/>'),
};

/** Seçim kartı için glif: imza/silah kartları silah kimliğini,
    pasifler kendi rünlerini, nimetler şişe/gücü gösterir. */
export function cardGlyph(c) {
  if (c.kind === 'passive') return PASSIVE_GLYPHS[c.id] || FALLBACK;
  if (c.kind === 'heal' || c.kind === 'guc') return BOON_GLYPHS[c.id] || FALLBACK;
  /* special / sig / weapon: silah kimliği (icon = silah id) ya da
     kahramana özel yetenek glifi */
  const ic = c.icon || c.id;
  return SEHER_GLYPHS[ic] || SIMSEK_GLYPHS[ic] || SAVASCI_GLYPHS[ic] || GOKALEV_GLYPHS[ic] ||
         KORSAN_GLYPHS[ic] || KRALICE_GLYPHS[ic] || SOVALYE_GLYPHS[ic] ||
         SAPANCI_GLYPHS[ic] ||
         WEAPON_GLYPHS[ic] || FALLBACK;
}
