import { worldCurve } from './balance.js?v=20260930m';
/* ═══════════════════════════════════════════════════════════
   worlds.js — Dünyalar ve Görevler (Kampanya Yapısı)

   10 dünya × 10 görev. Her görev "N dalga hayatta kal" tarzı
   bir koşudur; 10. görev dünya boss'udur. Görev ilk kez
   geçildiğinde büyük yakut ödülü + sandık verilir; tekrar
   oynanırsa dengeli (küçültülmüş) yakut ödülü verilir.

   Dünya kimliği görsellere işler: zemin dokusu, ay ışığı rengi,
   düşman palet tonu (hue) ve boss adı dünyaya göre değişir.
   ═══════════════════════════════════════════════════════════ */

export const WORLDS = [
  {
    id: 1, name: 'SOLGUN MEZARLIK', sub: 'Hasat burada başladı',
    color: '#ff3b4e', glow: 'rgba(255,59,78,0.5)',
    floor: 'mezarlik', hue: 0,
    /* KADRO (2026-08-29): üç temel tip + İSKELET KRAL. Kral yalnız burada
       yaşar ve 6. dalgadan sonra nadir doğar (config.TYPE_CURVES) —
       haritanın en güçlü düşmanı bir OLAY olmalı, rutin bir doğum değil. */
    roster: { zombi: 1, atici: 1, muhafiz: 1, kral: 1 },
    hpMul: 1.0, dmgMul: 1.0, speedMul: 1.0, gemMul: 1.0,
    density: 1.0, aliveCap: 110,
    eliteChance: 0,
    boss: 'KADİM HASATÇI',
    moon: ['#ff8d78', '#e0364a', '#7a1220', '#3d0a12'],
    lore: 'Kızıl ayın ilk değdiği toprak. Ölüler burada uyumayı unuttu.',
  },
  {
    id: 2, name: 'KÜL ÇUKURLARI', sub: 'Közler hiç sönmez',
    color: '#ff8a3c', glow: 'rgba(255,138,60,0.5)',
    floor: 'kul', hue: -18,
    /* KADRO: alev deli (kalabalık) · kor lordu (tank) · mum büyücüsü (menzil).
       Temel üçlünün aynen karşılığı: tıpkı mezarlıkta olduğu gibi sanat
       dünyaya göre değişir, oynanış tipi aynı kalır. */
    roster: { zombi: 1, atici: 1, muhafiz: 1 },
    hpMul: 1.85, dmgMul: 1.30, speedMul: 1.04, gemMul: 1.7,
    density: 1.10, aliveCap: 140,
    eliteChance: 0.05,
    boss: 'KOR ÇOBANI',
    moon: ['#ffc48a', '#e07a36', '#7a3d12', '#3d1e0a'],
    lore: 'Yanmış tarlaların altında hâlâ nefes alan bir fırın var.',
  },
  {
    id: 3, name: 'ZEHİR BATAKLIĞI', sub: 'Su bile ısırır',
    color: '#59e3c8', glow: 'rgba(89,227,200,0.5)',
    floor: 'bataklik', hue: 105,
    /* KADRO: batak yaratığı (kalabalık) · batak devi (tank). MENZİLLİ YOK —
       bu haritada uzaktan vuran tek şey BOSS'un zehir bombalarıdır; ikisi
       aynı sahnede olsaydı ejderin imzası kalabalıkta kaybolurdu.
       Menzilli baskı gittiği için tank payı bir tik yükseldi (1,25). */
    roster: { zombi: 1, muhafiz: 1.25 },
    hpMul: 3.0, dmgMul: 1.62, speedMul: 1.07, gemMul: 2.6,
    density: 1.20, aliveCap: 170,
    eliteChance: 0.08,
    boss: 'BATAK ANASI',
    moon: ['#a8f0d8', '#3ac8a0', '#12604c', '#0a2d24'],
    lore: 'Buradaki sis, içine çekeni bir daha geri vermez.',
  },
  {
    id: 4, name: 'KAN KATEDRALİ', sub: 'Dua etmek için çok geç',
    color: '#9b6cff', glow: 'rgba(155,108,255,0.5)',
    floor: 'katedral', hue: -55,
    hpMul: 4.7, dmgMul: 1.98, speedMul: 1.10, gemMul: 3.8,
    density: 1.30, aliveCap: 200,
    eliteChance: 0.11,
    boss: 'KIZIL PİSKOPOS',
    moon: ['#c8a8ff', '#7a4ae0', '#38127a', '#1a0a3d'],
    lore: 'Vitraylardan süzülen ışık bile burada kanla boyanır.',
  },
  {
    id: 5, name: 'HİÇLİK TAHTI', sub: 'Son kılıç, son kapı',
    color: '#e8e4d8', glow: 'rgba(232,228,216,0.45)',
    floor: 'hiclik', hue: 150,
    hpMul: 7.2, dmgMul: 2.38, speedMul: 1.13, gemMul: 5.2,
    density: 1.40, aliveCap: 230,
    eliteChance: 0.15,
    boss: 'HİÇLİK KRALI',
    moon: ['#f0ecff', '#9a94c8', '#3a3660', '#14122a'],
    lore: 'Dünyanın bittiği yerde, taht hâlâ birini bekliyor.',
  },
  {
    id: 6, name: 'RÜZGÂR BAHÇESİ', sub: 'Ada koptu, bahçe açmaya devam etti',
    color: '#ff9ec4', glow: 'rgba(255,158,196,0.5)',
    floor: 'gokada', hue: -70,
    hpMul: 10.6, dmgMul: 2.85, speedMul: 1.16, gemMul: 7.2,
    density: 1.50, aliveCap: 260,
    eliteChance: 0.18,
    boss: 'GÖK YARGICI',
    moon: ['#fff4f0', '#ffc2b0', '#c0587a', '#4a1e3a'],
    lore: 'Kopan kıtanın teraslarında rüzgâr hâlâ badem çiçeği taşıyor.',
  },
  {
    id: 7, name: 'TUZ TABANI', sub: 'Göl çekildi, altındaki şey çekilmedi',
    color: '#ffd68c', glow: 'rgba(255,214,140,0.5)',
    floor: 'tuzla', hue: 40,
    /* KADRO: tuz böceği (kalabalık) · tuz pençesi (tank) · PATLAYICI KOŞUCU.
       Kullanıcı kararı: burada MENZİLLİ DÜŞMAN YOK. Baskı uzaktan gelmiyor,
       oyuncunun ÜSTÜNE koşarak geliyor — haritanın kimliği bu. */
    roster: { zombi: 1, muhafiz: 1, patlayici: 1 },
    hpMul: 15.6, dmgMul: 3.35, speedMul: 1.19, gemMul: 9.8,
    density: 1.58, aliveCap: 280,
    eliteChance: 0.21,
    boss: 'TUZ MUHAFIZI',
    moon: ['#fff0c8', '#e0b060', '#7a5a1a', '#3d2c0d'],
    lore: 'Kurumuş göl tabanı bir kabuk. Altında yürüyen şeyler var.',
  },
  {
    id: 8, name: 'DONMUŞ GÖL', sub: 'Buzun altındakiler kıpırdıyor',
    color: '#8cdcff', glow: 'rgba(140,220,255,0.5)',
    floor: 'buzul', hue: 130,
    /* KADRO: buz kurdu (kalabalık, biomun EN DÜŞÜK canlısı) · buz ayısı (tank) ·
       YETİ (ağır) · kar tilkisi büyücüsü (menzil). Dört siluet: kısa-hızlı,
       geniş-ağır, iri-yavaş, ince-uzak. Kadronun en kalabalık dünyası. */
    roster: { zombi: 1, atici: 1, muhafiz: 1, agir: 1 },
    hpMul: 22.8, dmgMul: 3.90, speedMul: 1.22, gemMul: 13.2,
    density: 1.66, aliveCap: 300,
    eliteChance: 0.24,
    boss: 'AYAZ LORDU',
    moon: ['#dff4ff', '#68b8e0', '#1a4a6a', '#0c2434'],
    lore: 'Buzun altındaki siluetler seninle aynı hızda yürüyor.',
  },
  {
    id: 9, name: 'KEMİK BAHÇESİ', sub: 'Burada ekilen her şey kemik verdi',
    color: '#ffe296', glow: 'rgba(255,226,150,0.5)',
    floor: 'kemikbahce', hue: 30,
    hpMul: 33.2, dmgMul: 4.50, speedMul: 1.25, gemMul: 17.6,
    density: 1.74, aliveCap: 320,
    eliteChance: 0.27,
    boss: 'FİLDİŞİ BAHÇIVAN',
    moon: ['#fff4d0', '#e0c078', '#7a6428', '#3d3214'],
    lore: 'Hasatçılar burayı bahçe sanıyor. Belki haklılar.',
  },
  {
    id: 10, name: 'YILDIZ DÖKÜMHANESİ', sub: 'Yıldızlar burada dökülüp göğe asıldı',
    color: '#7aa6ff', glow: 'rgba(122,166,255,0.5)',
    floor: 'gokcark', hue: -85,
    hpMul: 48.0, dmgMul: 5.15, speedMul: 1.28, gemMul: 23.0,
    density: 1.82, aliveCap: 340,
    eliteChance: 0.30,
    boss: 'ÇARKIN İLK DİŞİ',
    moon: ['#ffffff', '#cfe4ff', '#4a6ab8', '#16204a'],
    lore: 'Son durak değil — gökyüzünün döküldüğü yer.',
  },
];

/* v49: DÜNYA EĞRİSİ BEKLENEN GÜÇTEN TÜRER (balance.worldCurve). Yukarıdaki
   elle yazılmış hpMul/dmgMul (can ×48, hasar ×5,15) ARTIK OKUNMAZ; dünya
   kimliği (kadro, hız, kalabalık, elit) aynen kalır. Kaynak tek: denge
   değişecekse balance.CHALLENGE ya da beklenen güç varsayımları değişir. */
for (const wd of WORLDS) {
  const cv = worldCurve(wd.id);
  wd.hpMul = cv.hpMul; wd.dmgMul = cv.dmgMul; wd.bossCurve = cv.bossHpMul;
}

export const MISSIONS_PER_WORLD = 10;

/* v63 İ4 görev türü sırası — missionTypes.js ile aynı (orada içe alınmaz: döngü olmasın) */
const M_ORDER = ['survive', 'defend', 'survive', 'hunt', 'survive', 'escape', 'defend', 'hunt', 'escape'];
function mType(w, m) { if (m >= 10 || (w === 1 && m <= 2)) return 'survive'; return M_ORDER[m - 1] || 'survive'; }

/** Bir görevin tam planı. w: 1-5, m: 1-10. */
export function missionDef(w, m) {
  const world = WORLDS[w - 1];
  const isBoss = m === MISSIONS_PER_WORLD;
  /* DALGA SAYISI (2026-08-18 revizyonu — hedef: normal görev ~5 dk).
     Eski tablo görev 1'i 1,9 dk'ya düşürüyordu: oyuncu daha silahını
     yükseltmeden görev bitiyor, kart seçimi bir karar olmaktan çıkıyordu.
     Yeni taban 4 dalga + görev başına 0,55 → görev 1 ~3,0 dk, görev 9
     ~6,3 dk, dünya ortalaması ~4,9 dk. Dalga süresi de uzadı
     (config.waveTime: 22 + 3,4w) — kısa dalga "koşu" değil "tur" gibi
     okunuyordu. 7 dk tavanı asla aşılmaz. */
  const waves = isBoss ? 8 : Math.min(9, 4 + Math.ceil(m * 0.55));
  /* görev içi zorluk temeli: dünya çarpanı × görev rampası.
     İlk dünyanın ilk görevleri öğreticidir — ekstra yumuşak. */
  const grace = (w === 1 && m <= 2) ? 0.72 : (w === 1 && m <= 4 ? 0.86 : 1);
  /* GÖREV RAMPASI YUMUŞATILDI (0.18 → 0.12 can, 0.07 → 0.045 hasar).
     Dünya çarpanı zaten büyük; ikisi çarpılınca 10. görev bir sonraki
     dünyadan daha zor oluyordu — dünya atlamanın anlamı kalmıyordu. */
  const hpMul = world.hpMul * (1 + (m - 1) * 0.12) * grace;
  const dmgMul = world.dmgMul * (1 + (m - 1) * 0.045) * grace;
  /* BOSS CANI ayrı eğri. Doğrusal dünya çarpanı boss'u 100 bin cana taşıyordu;
     0.78 kuvveti de yetmiyordu — ölçüm (bkz. _baltest ⑤) D6 boss'unu tam
     kurulu bir destan kahramanla 258 saniyede bitiriyordu, yani dört dakika
     boyunca tek hedefe vurmak. Kuvvet 0.44'e indi: boss süresi dünya 1'de
     ~33 sn, dünya 6'da ~93 sn (kuşanım ve kartlarla pratikte yarısı).
     Boss "uzun ama biten" bir düello olmalı; sünger olmamalı. */
  /* YUMUŞATILDI (2026-09-05, kullanıcı seçimi "daha kolay"): üs 0,34 → 0,28.
     ÖLÇÜLDÜ (_baltest ⑤): kadro medyanıyla boss düellosu 7. dünyada 116 sn,
     10. dünyada 170 sn sürüyordu — görevin toplamı 5,9 dk olduğu için son
     dünyalarda oyuncunun YARISINDAN FAZLASI tek bir sünger boss'a gidiyordu.
     Üssü kısmak doğru eksen: boss canı dünya canıyla AYNI hızda büyürse
     düello uzunluğu sabit kalmaz, çünkü oyuncunun hasarı kuşanımla değil
     kampanyayla artmıyor.
     İKİ KADEMEDE ÖLÇÜLDÜ: 0,28 son iki dünyada hâlâ bandın üstündeydi
     (122 ve 135 sn). 0,26 ile eğri 33 sn (D1) → 88 sn (D10) verir, yani
     bu fonksiyonun ÜSTÜNDEKİ orijinal tasarım notunun ("D1'de ~33 sn")
     tam kendisi — sayı oraya geri geldi, tesadüfen değil ölçülerek. */
  const bossHpMul = (world.bossCurve || 1) * (1 + (m - 1) * 0.08) * grace;
  /* dalga karışım kaydırması: ileri dünyalarda karışım baştan serttir.
     3 → 2: kaydırma da çarpansal zorluğa biniyordu. */
  const mixOffset = (w - 1) * 2 + Math.floor((m - 1) / 2);
  return {
    world: w, mission: m, waves, isBoss,
    hpMul, dmgMul, bossHpMul,
    /* KALABALIK dünyaya göre artar ama CANLI ÜST SINIRI da dünyaya bağlı:
       zorluk "daha çok düşman" ile gelir, "sonsuz düşman" ile değil. */
    density: world.density || 1,
    aliveCap: world.aliveCap || 120,
    speedMul: world.speedMul,
    /* DÜNYA KADROSU görevle taşınır: enemyManager.startWave onu waveWeights'e
       verir. Kadrosu yazılmamış dünya config.BASE_ROSTER'ı kullanır. */
    roster: world.roster || null,
    gemMul: world.gemMul * (1 + (m - 1) * 0.06),
    /* KOŞU XP NORMALİZASYONU (2026-09-05, ölçüldü — _baltest ⑧).
       Görev başına atlanan seviye sayısı SABİT olmak zorunda: build kimliği
       her haritada aynı derinlikte kurulmalı, yoksa oyuncu "bu haritada
       yeteneklerim eksik" hisseder. Seviye sayısını kaydıran tek değişken
       düşman ARZIydı (density 1,00 → 1,82) — para çarpanı ayrıldıktan sonra
       ölçülen artık tam bu orandı. Bir katsayı ICAT ETMEK yerine arzın
       TERSİ alınır: aynı sayı iki yerde yaşamaz. */
    xpMul: 1 / (world.density || 1),
    eliteChance: world.eliteChance + (m - 1) * 0.006,
    mixOffset,
    /* v63 İ4: görev türü (missionTypes.missionType ile AYNI tablo) */
    type: mType(w, m),
    objective: isBoss ? 'BOSS: ' + world.boss : ({ survive: waves + ' DALGA HAYATTA KAL', defend: 'SAVUN · totemi ' + waves + ' dalga koru', hunt: 'AV · kaçan eliti devir', escape: 'KAÇIŞ · ' + waves + '. dalgada çıkışa koş' })[mType(w, m)],
    /* tahmini süre (dk) — görev kartında gösterilir */
    estMin: Math.max(2, Math.round(waves * 0.85)),
  };
}

/** İlk geçiş yakut ödülü. */
export function missionReward(w, m) {
  return Math.round((22 + m * 11) * (1 + (w - 1) * 0.85) + (m === 10 ? 60 : 0));
}
/** Tekrar oynama ödülü. v56 C4: %30 → %42 — ölçüm (analitik, bu dosya + chests + config):
    D5 tekrar koşusu 143 altın (sandık ort. 40 dahil) iken beklenen kahraman Sv6 = 700 → 4,9 koşu;
    hedef bant 2-4 koşu. %42 ile 179 → 3,9 koşu · D1 Sv4 (120) 1,6 · D10 Sv8 (3000) 9,6 → geç oyun kule/kabus altınıyla. */
export function replayReward(w, m) {
  return Math.max(8, Math.round(missionReward(w, m) * 0.42));
}

/* ── İlerleme kalıcılığı ── */
const PROG_KEY = 'kh_progress';

export function loadProgress() {
  try {
    const p = JSON.parse(localStorage.getItem(PROG_KEY) || '{}');
    const out = {};
    for (let w = 1; w <= WORLDS.length; w++) out[w] = Math.min(MISSIONS_PER_WORLD, p[w] | 0);
    return out;
  } catch (e) {
    const out = {};
    for (let w = 1; w <= WORLDS.length; w++) out[w] = 0;
    return out;
  }
}

export function saveProgress(prog) {
  try { localStorage.setItem(PROG_KEY, JSON.stringify(prog)); } catch (e) { /* sessiz */ }
}

/** GERÇEK kilit durumu — rozet bunu gösterir.
    1. dünya hep açık; diğerleri önceki dünyanın boss'u ile açılır. */
export function worldCleared(prog, w) {
  if (w <= 1) return true;
  return (prog[w - 1] | 0) >= MISSIONS_PER_WORLD;
}

/** OYNANABİLİRLİK — şu an kilitli dünyalar da girilebilir (admin erişimi:
    kullanıcı bütün haritaları görmek ve oynamak istiyor).

    İKİ AYRI SORU, İKİ AYRI FONKSİYON: "kilitli mi görünüyor" ile "girilebilir
    mi" aynı şey değil. Tek fonksiyona iki anlam yüklemek, bu projede bir kez
    ödenmiş bir hataydı (waveDuration iki yerde yazılıydı ve config'ten süre
    ayarlayan kişi hiçbir şey değiştirmemiş oluyordu). Yayına çıkarken
    değişecek tek satır aşağıdaki return'dür. */
export function worldUnlocked(prog, w) {
  return true;   // yayında: return worldCleared(prog, w);
}

/** Görev kilidi: bir önceki görev geçilmiş olmalı. */
export function missionUnlocked(prog, w, m) {
  if (!worldUnlocked(prog, w)) return false;
  return m <= (prog[w] | 0) + 1;
}

/** Sıradaki (ilk geçilmemiş) görev — ana ekrandaki SAVAŞ butonu için. */
export function nextMission(prog) {
  for (let w = 1; w <= WORLDS.length; w++) {
    if (!worldUnlocked(prog, w)) break;
    const cleared = prog[w] | 0;
    if (cleared < MISSIONS_PER_WORLD) return { w, m: cleared + 1 };
  }
  return { w: WORLDS.length, m: MISSIONS_PER_WORLD };   // her şey bitti → son görev tekrar
}
