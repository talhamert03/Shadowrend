/* ═══════════════════════════════════════════════════════════
   arenaPlan.js — ON YER PLANI (kompozisyon + dağarcık)

   Bir harita burada BİR YER olur. Kural: her plan hem ZEMİNİ boyar hem
   NESNELERİ dizer ve ikisi AYNI sabitleri okur (`L`). İki liste ayrı
   yazılsaydı ilk dokunuşta ayrışır ve "yapılar zeminin üstünde yüzüyor"
   hissi doğardı — bu bir kez yaşandı.

   ── ON PLANIN MANTIĞI (rastgele süs değil, YER) ────────────
   1  mezarlik  · HALKA MEZARLIK: kutsanmış daire, çevre yolu, ışınsal
                  patikalar, dilim dilim mezar parselleri, şapel, kemikhane
   2  kul       · KÖMÜR OCAĞI: üç teras, zikzak servis yolu, kömür fırını
                  çukurları, çöken ocak, kor yarıkları
   3  bataklik  · TAKIMADA: beş ada, ahşap iskele ağı (yol = iskele),
                  balıkçı kampı, batmış mavna, servi sığlıkları
   4  katedral  · NEF: narteks → nef → transept → apsis eksenel planı,
                  iki sıra sütun, sıralar, vitray ışık gölleri
   5  hiclik    · İÇ İÇE MEYDAN: kare → eşkenar dörtgen → kare, tahta
                  giden tören yolu, sıra sıra heykel, dikilitaş halkası
   6  gokada    · ÜÇ LOB: yonca biçimli yüzen ada, dışa açılan uçurum
                  kamaları, üç köprü, teraslı bahçe, fener direği
   7  tuzla     · TUZLA: dev tuz kabuğu çokgenleri, kervan izi, buharlaşma
                  havuzları ızgarası, karaya oturmuş gemi, tuz sütunları
   8  buzul     · GÖL + KIYI: kuzey kıyı şeridinde balıkçı köyü, buz
                  plakaları, basınç sırtları, açık su yarığı
   9  kemikbahce· KABURGA KORİDORU: omurga geçidi, iki yanda kaburga
                  kemerleri, kafatası höyüğü, kemik tarlası, harman yeri
   10 gokcark   · ÇARK: göbek kadranı, sekiz ışınsal kol, jant yolu,
                  dört yıldız kapısı, usturlap halkaları

   HİÇBİR PLAN BAŞKASININ DAĞARCIĞINI KULLANMAZ. Mezar taşı yalnız
   mezarlıkta; buz gölünde çam ve buz dikeni, katedralde sütun ve sıra,
   tuzlada tuz sütunu ve gemi. Ağaç türü iklime göre değişir (kuru meşe ·
   servi · çam) — aynı model iki farklı iklimde durmaz.

   ── YERLEŞİM SÖZLEŞMESİ (2026-08-30) ───────────────────────
   Kullanıcının teşhisi üç maddeydi ve üçü de KOMPOZİSYON hatasıydı,
   model hatası değil: (a) yolun ortasında direk/sütun/kilometre taşı,
   (b) çitler eğri ve rastgele delikli, (c) yapıların çevresi anlamsız.

   1. HER PLAN İLK İŞ OLARAK KORİDORLARINI BİLDİRİR (`A.path` ·
      `A.ringPath` · `A.spokePath` · `A.area` · `A.zone`) ve bu değerler
      `floor()`un çizdiği AYNI `L` sabitlerinden gelir. Koridora giren
      hiçbir nesne doğmaz; istisna elle yazılır (`onPath: true` — kemer
      kapı yolun üstünde durur, çünkü kapı odur).
   2. ÇİT BİR ÇEVREDİR: `A.enclosure` segmentleri uç uca ve DİK dizer,
      yalnız İKİ kapı açar (bir giriş + bir çıkış), kapıların yanına
      söve koyar ve kapı ağzını koridor olarak korur. Eski `rect` dört
      kenarda rastgele delik açıyordu.
   3. BİR YAPI TEK BAŞINA KONMAZ: `A.homestead` kapı yönünü, kapı önü
      sahanlığını (boş), servis nesnelerinin duvara yaslı yerlerini ve
      kapı fenerini birlikte kurar.
   4. SIKLIK DÜŞÜRÜLDÜ (~208 → ~140 nesne/harita): çeper halkaları
      yarıya, serpme kümeleri üçte bire indi; tuzlanın 90 duvarlık havuz
      ızgarası üç sırta indi. Ölçüt "kaç nesne sığıyor" değil, oyuncunun
      YER olarak okuyup okumadığı.
   ═══════════════════════════════════════════════════════════ */

import { TAU, eachSide, alpha } from './arenaPaint.js?v=20260930m';

/* ── KENAR BOYACILARI: hacim yalnız burada yaşar ──────────────
   `paintMacro` evenodd ile kırpar, yani buradaki boyacı dış boşluğu tam
   tuval olarak doldurabilir (kırpma olmadan zemini siliyordu — bir kez
   bu tuzağa düşüldü, göbek simsiyah çıktı).
   Her harita kendi çeperini alır: demir parmaklık yalnız mezarlığın
   çeperidir, buz gölünün çeperi basınç sırtıdır.                     */

/* mezarlık: taş duvar + demir mızrak parmaklık */
function edgeFence(g, E, Q) {
  const B = E.B, full = E.full;
  g.fillStyle = Q.void; g.fillRect(0, 0, full, full);
  eachSide(g, E, (gg) => {
    gg.fillStyle = Q.wall; gg.fillRect(0, B * 0.32, full, B * 0.68);
    gg.fillStyle = Q.wallTop; gg.fillRect(0, B * 0.32, full, 8);
    for (let x = 0; x < full; x += 68) {
      gg.fillStyle = 'rgba(0,0,0,0.26)'; gg.fillRect(x + 3, B * 0.38, 6, B * 0.62);
      gg.fillStyle = 'rgba(170,176,150,0.075)'; gg.fillRect(x + 11, B * 0.40, 46, 7);
    }
    for (let x = 18; x < full; x += 44) {
      gg.fillStyle = Q.spike;
      gg.fillRect(x, B * 0.05, 6, B * 0.30);
      gg.beginPath(); gg.moveTo(x - 3, B * 0.07); gg.lineTo(x + 3, 0); gg.lineTo(x + 9, B * 0.07);
      gg.closePath(); gg.fill();
    }
    const v = gg.createLinearGradient(0, 0, 0, B * 0.34);
    v.addColorStop(0, 'rgba(0,0,0,0.78)'); v.addColorStop(1, 'rgba(0,0,0,0)');
    gg.fillStyle = v; gg.fillRect(0, 0, full, B * 0.34);
  });
}

/* kül: kavrulmuş moloz sırtı + kor damarı */
function edgeAsh(g, E, Q) {
  const B = E.B, full = E.full;
  g.fillStyle = Q.void; g.fillRect(0, 0, full, full);
  eachSide(g, E, (gg) => {
    gg.fillStyle = Q.wall; gg.fillRect(0, B * 0.18, full, B * 0.82);
    for (let x = -20; x < full; x += 46) {
      const h = B * (0.28 + ((x * 37) % 11) / 34);
      gg.fillStyle = 'rgba(24,18,14,0.86)';
      gg.beginPath();
      gg.moveTo(x, B); gg.lineTo(x + 16, B - h); gg.lineTo(x + 34, B - h * 0.62); gg.lineTo(x + 46, B);
      gg.closePath(); gg.fill();
      gg.fillStyle = 'rgba(190,150,110,0.10)';
      gg.fillRect(x + 14, B - h, 20, 5);
    }
    const em = gg.createLinearGradient(0, B * 0.62, 0, B);
    em.addColorStop(0, 'rgba(255,110,40,0)'); em.addColorStop(1, 'rgba(255,120,44,0.14)');
    gg.fillStyle = em; gg.fillRect(0, B * 0.62, full, B * 0.38);
    const v = gg.createLinearGradient(0, 0, 0, B * 0.30);
    v.addColorStop(0, 'rgba(0,0,0,0.82)'); v.addColorStop(1, 'rgba(0,0,0,0)');
    gg.fillStyle = v; gg.fillRect(0, 0, full, B * 0.30);
  });
}

/* bataklık: derin su + saz duvarı */
function edgeReed(g, E, Q) {
  const B = E.B, full = E.full;
  g.fillStyle = Q.void; g.fillRect(0, 0, full, full);
  eachSide(g, E, (gg) => {
    const w = gg.createLinearGradient(0, 0, 0, B);
    w.addColorStop(0, '#07110e'); w.addColorStop(1, Q.wall);
    gg.fillStyle = w; gg.fillRect(0, 0, full, B);
    gg.lineCap = 'round';
    for (let x = 0; x < full; x += 7) {
      const h = B * (0.30 + ((x * 53) % 17) / 26);
      gg.strokeStyle = ((x / 7) | 0) % 3 ? 'rgba(120,146,74,0.34)' : 'rgba(18,30,20,0.60)';
      gg.lineWidth = 3.4;
      gg.beginPath();
      gg.moveTo(x, B); gg.lineTo(x + ((x * 29) % 9) - 4, B - h); gg.stroke();
    }
    gg.fillStyle = 'rgba(150,255,200,0.05)'; gg.fillRect(0, B - 10, full, 10);
  });
}

/* katedral: payandalı taş duvar + vitray pencere boşlukları */
function edgeNave(g, E, Q) {
  const B = E.B, full = E.full;
  g.fillStyle = Q.void; g.fillRect(0, 0, full, full);
  eachSide(g, E, (gg) => {
    gg.fillStyle = Q.wall; gg.fillRect(0, 0, full, B);
    gg.fillStyle = Q.wallTop; gg.fillRect(0, B * 0.20, full, 7);
    for (let x = 0; x < full; x += 150) {
      /* payanda: duvardan içeriye doğru kalınlaşan blok */
      gg.fillStyle = 'rgba(0,0,0,0.34)'; gg.fillRect(x + 40, B * 0.20, 46, B * 0.80);
      gg.fillStyle = 'rgba(150,140,170,0.13)'; gg.fillRect(x + 40, B * 0.20, 46, 8);
      /* vitray: renkli ışık — dünyanın tek doygun kenar aksanı */
      const cols = ['rgba(196,54,86,0.30)', 'rgba(120,80,220,0.26)', 'rgba(230,180,90,0.24)'];
      gg.fillStyle = cols[((x / 150) | 0) % 3];
      gg.beginPath();
      gg.roundRect(x + 100, B * 0.26, 34, B * 0.52, [17, 17, 3, 3]);
      gg.fill();
      gg.strokeStyle = 'rgba(10,8,14,0.60)'; gg.lineWidth = 5; gg.stroke();
    }
    const v = gg.createLinearGradient(0, 0, 0, B * 0.22);
    v.addColorStop(0, 'rgba(0,0,0,0.86)'); v.addColorStop(1, 'rgba(0,0,0,0)');
    gg.fillStyle = v; gg.fillRect(0, 0, full, B * 0.22);
  });
}

/* hiçlik: kırılan plaka kenarı → boşluk. Duvar YOK; harita biter. */
function edgeVoid(g, E, Q) {
  const B = E.B, full = E.full;
  g.fillStyle = Q.void; g.fillRect(0, 0, full, full);
  eachSide(g, E, (gg) => {
    /* kırık kenar: düzensiz dişli plaka ağzı */
    gg.fillStyle = Q.wall;
    gg.beginPath();
    gg.moveTo(0, B);
    for (let x = 0; x <= full; x += 34) {
      const d = B * (0.30 + ((x * 41) % 13) / 30);
      gg.lineTo(x, B - d);
    }
    gg.lineTo(full, B); gg.closePath(); gg.fill();
    gg.strokeStyle = Q.wallTop; gg.lineWidth = 5; gg.stroke();
    /* sis: boşluğa doğru beyaz solma */
    const v = gg.createLinearGradient(0, 0, 0, B);
    v.addColorStop(0, 'rgba(226,230,242,0.20)'); v.addColorStop(1, 'rgba(226,230,242,0)');
    gg.fillStyle = v; gg.fillRect(0, 0, full, B);
  });
}

/* gökçe ada: bulut denizi + uçurum dudağı */
function edgeCloud(g, E, Q) {
  const B = E.B, full = E.full;
  g.fillStyle = Q.void; g.fillRect(0, 0, full, full);
  eachSide(g, E, (gg) => {
    for (let i = 0; i < 26; i++) {
      const x = (i * 191) % full, y = B * (0.1 + ((i * 37) % 9) / 16), r = 40 + ((i * 53) % 60);
      const v = gg.createRadialGradient(x, y, r * 0.1, x, y, r);
      v.addColorStop(0, 'rgba(190,215,255,0.26)'); v.addColorStop(1, 'rgba(190,215,255,0)');
      gg.fillStyle = v; gg.fillRect(x - r, y - r, r * 2, r * 2);
    }
    /* uçurum dudağı: aydınlık üst kenar + hemen altında derin gölge */
    gg.fillStyle = Q.wall; gg.fillRect(0, B * 0.62, full, B * 0.38);
    gg.fillStyle = Q.wallTop; gg.fillRect(0, B * 0.62, full, 9);
    for (let x = 0; x < full; x += 58) {
      gg.fillStyle = 'rgba(0,0,0,0.32)';
      gg.beginPath();
      gg.moveTo(x, B * 0.70); gg.lineTo(x + 22, B); gg.lineTo(x + 44, B * 0.70);
      gg.closePath(); gg.fill();
    }
  });
}

/* tuzla: tuz sırtı + kurumuş kıyı çizgisi */
function edgeSalt(g, E, Q) {
  const B = E.B, full = E.full;
  g.fillStyle = Q.void; g.fillRect(0, 0, full, full);
  eachSide(g, E, (gg) => {
    gg.fillStyle = Q.wall; gg.fillRect(0, B * 0.26, full, B * 0.74);
    /* eski kıyı basamakları: gölün çekilme çizgileri */
    for (let i = 0; i < 3; i++) {
      gg.fillStyle = 'rgba(236,228,196,' + (0.10 - i * 0.025) + ')';
      gg.fillRect(0, B * (0.30 + i * 0.16), full, 6);
    }
    for (let x = 0; x < full; x += 40) {
      const h = B * (0.18 + ((x * 31) % 7) / 22);
      gg.fillStyle = 'rgba(248,242,216,0.13)';
      gg.beginPath();
      gg.moveTo(x, B * 0.26); gg.lineTo(x + 20, B * 0.26 - h); gg.lineTo(x + 40, B * 0.26);
      gg.closePath(); gg.fill();
    }
    const v = gg.createLinearGradient(0, 0, 0, B * 0.28);
    v.addColorStop(0, 'rgba(0,0,0,0.70)'); v.addColorStop(1, 'rgba(0,0,0,0)');
    gg.fillStyle = v; gg.fillRect(0, 0, full, B * 0.28);
  });
}

/* buzul: basınç sırtı — kırılıp yukarı itilmiş buz blokları */
function edgeIce(g, E, Q) {
  const B = E.B, full = E.full;
  g.fillStyle = Q.void; g.fillRect(0, 0, full, full);
  eachSide(g, E, (gg) => {
    gg.fillStyle = Q.wall; gg.fillRect(0, B * 0.36, full, B * 0.64);
    for (let x = -16; x < full; x += 38) {
      const h = B * (0.34 + ((x * 43) % 13) / 26);
      const lean = ((x * 17) % 9) - 4;
      gg.fillStyle = 'rgba(196,226,244,0.26)';
      gg.beginPath();
      gg.moveTo(x, B * 0.40); gg.lineTo(x + 12 + lean, B * 0.40 - h);
      gg.lineTo(x + 30, B * 0.40 - h * 0.5); gg.lineTo(x + 38, B * 0.40);
      gg.closePath(); gg.fill();
      gg.strokeStyle = 'rgba(240,252,255,0.34)'; gg.lineWidth = 2.6; gg.stroke();
    }
    gg.fillStyle = 'rgba(140,220,255,0.06)'; gg.fillRect(0, B * 0.36, full, B * 0.64);
    const v = gg.createLinearGradient(0, 0, 0, B * 0.38);
    v.addColorStop(0, 'rgba(6,14,20,0.80)'); v.addColorStop(1, 'rgba(6,14,20,0)');
    gg.fillStyle = v; gg.fillRect(0, 0, full, B * 0.38);
  });
}

/* kemik bahçesi: dikilmiş kaburga çiti */
function edgeRib(g, E, Q) {
  const B = E.B, full = E.full;
  g.fillStyle = Q.void; g.fillRect(0, 0, full, full);
  eachSide(g, E, (gg) => {
    gg.fillStyle = Q.wall; gg.fillRect(0, B * 0.44, full, B * 0.56);
    for (let x = 0; x < full; x += 52) {
      const h = B * (0.52 + ((x * 29) % 11) / 24);
      gg.strokeStyle = 'rgba(214,204,172,0.30)'; gg.lineWidth = 9; gg.lineCap = 'round';
      gg.beginPath();
      gg.moveTo(x, B); gg.quadraticCurveTo(x + 14, B - h * 0.7, x + 6, B - h);
      gg.stroke();
      gg.strokeStyle = 'rgba(20,18,14,0.40)'; gg.lineWidth = 3.4;
      gg.beginPath();
      gg.moveTo(x + 3, B); gg.quadraticCurveTo(x + 17, B - h * 0.7, x + 9, B - h);
      gg.stroke();
    }
    const v = gg.createLinearGradient(0, 0, 0, B * 0.46);
    v.addColorStop(0, 'rgba(0,0,0,0.76)'); v.addColorStop(1, 'rgba(0,0,0,0)');
    gg.fillStyle = v; gg.fillRect(0, 0, full, B * 0.46);
  });
}

/* gök çarkı: bazalt sütun ormanı + dişli kuşağı */
function edgeBasalt(g, E, Q) {
  const B = E.B, full = E.full;
  g.fillStyle = Q.void; g.fillRect(0, 0, full, full);
  eachSide(g, E, (gg) => {
    for (let x = 0; x < full; x += 26) {
      const h = B * (0.42 + ((x * 47) % 15) / 24);
      const k = 0.7 + ((x * 13) % 7) / 18;
      gg.fillStyle = 'rgb(' + (46 * k | 0) + ',' + (48 * k | 0) + ',' + (60 * k | 0) + ')';
      gg.fillRect(x, B - h, 26, h);
      gg.fillStyle = 'rgba(190,200,240,0.10)'; gg.fillRect(x, B - h, 26, 5);
      gg.fillStyle = 'rgba(0,0,0,0.30)'; gg.fillRect(x + 23, B - h, 3, h);
    }
    /* dişli kuşağı: kenarın kendisi bir mekanizma */
    gg.fillStyle = 'rgba(120,124,150,0.20)'; gg.fillRect(0, B * 0.10, full, 16);
    for (let x = 0; x < full; x += 44) {
      gg.fillStyle = 'rgba(150,154,186,0.22)';
      gg.fillRect(x, B * 0.10 - 9, 20, 9);
    }
    const v = gg.createLinearGradient(0, 0, 0, B * 0.16);
    v.addColorStop(0, 'rgba(0,0,0,0.84)'); v.addColorStop(1, 'rgba(0,0,0,0)');
    gg.fillStyle = v; gg.fillRect(0, 0, full, B * 0.16);
  });
}

/* ═══════════════════════════════════════════════════════════
   1 · SOLGUN MEZARLIK — HALKA MEZARLIK
   Kullanıcının verdiği örnek: yuvarlak mezarlık alanı ve içinden geçen
   yol. Gerçek mezarlıkların planı budur: kutsanmış bir DAİRE, çevresini
   dolanan bir yol, dört kapıdan merkeze giden ışınsal patikalar ve
   aradaki DİLİMLERE sıra sıra dizilmiş mezarlar. Şapel dairenin
   kuzeydoğu yayında, kemikhane güneybatıda, gölet çeperin dışında.
   ═══════════════════════════════════════════════════════════ */
const L1 = {
  c: [0.5, 0.5], holy: 0.435, ring: 0.300, outer: 0.408,
  chapel: [0.500 + Math.cos(-1.05) * 0.300, 0.500 + Math.sin(-1.05) * 0.300],
  ossu: [0.500 + Math.cos(2.30) * 0.300, 0.500 + Math.sin(2.30) * 0.300],
  pond: [0.815, 0.800], gate: [0.5, 0.055],
  wedges: 6, rows: [0.356],
  nests: [[0.130, 0.140], [0.870, 0.150], [0.150, 0.870]],
};

const mezarlik = {
  surf: 'cim', sat: 0.86, night: 0.22, edge: edgeFence, nests: L1.nests,
  floor(g, E, Q, K) {
    const { U, V, R, rnd } = E;
    K.base(3000, 240);
    /* KUTSANMIŞ DAİRE: içi bakımlı (açık), dışı yabani (koyu). Sınırı
       tek bir renk sıçraması değil, iki halka: dış gölge + iç aydınlık. */
    const cx = U(L1.c[0]), cy = V(L1.c[1]), hr = R(L1.holy);
    g.save();
    g.beginPath(); g.arc(cx, cy, hr, 0, TAU); g.clip();
    const v = g.createRadialGradient(cx, cy, hr * 0.2, cx, cy, hr);
    v.addColorStop(0, 'rgba(150,164,112,0.13)');
    v.addColorStop(0.8, 'rgba(150,164,112,0.07)');
    v.addColorStop(1, 'rgba(150,164,112,0)');
    g.fillStyle = v; g.fillRect(cx - hr, cy - hr, hr * 2, hr * 2);
    g.restore();
    g.strokeStyle = 'rgba(12,16,10,0.34)'; g.lineWidth = 26;
    g.beginPath(); g.arc(cx, cy, hr, 0, TAU); g.stroke();
    g.strokeStyle = 'rgba(186,196,150,0.16)'; g.lineWidth = 9;
    g.beginPath(); g.arc(cx, cy, hr - 16, 0, TAU); g.stroke();

    /* iki halka yol + dört ışınsal patika (kapılar hizasında) */
    K.ring(L1.c[0], L1.c[1], L1.outer, 0.017);
    K.ring(L1.c[0], L1.c[1], L1.ring, 0.023);
    for (let i = 0; i < 4; i++) {
      const a = -Math.PI / 2 + i * Math.PI / 2;
      K.spoke(L1.c[0], L1.c[1], 0.478, 0.150, a, 0.022);
    }
    /* dilim ayırıcıları: mezar parsellerini ayıran ışınsal patikalar */
    for (let i = 0; i < L1.wedges; i++) {
      const a = (i / L1.wedges) * TAU + 0.52;
      K.spoke(L1.c[0], L1.c[1], L1.ring + 0.004, L1.outer - 0.004, a, 0.010, { noRut: true });
    }
    /* ŞAPEL AVLUSU: taş döşeme + oyulmuş halkalar */
    K.cobble(L1.chapel[0], L1.chapel[1], 0.082, { cell: 0.0110 });
    K.engrave(L1.chapel[0], L1.chapel[1], 0.058, 3);
    /* KEMİKHANE avlusu (daha küçük, daha kaba döşeme) */
    K.cobble(L1.ossu[0], L1.ossu[1], 0.062, { cell: 0.0135 });
    /* KAPI ÖNÜ: tören döşemesi */
    K.cobble(L1.gate[0], L1.gate[1] + 0.030, 0.050, { cell: 0.0105 });
    /* GÖLET: çeperin dışında, tek doygun alan */
    K.water(L1.pond[0], L1.pond[1], 0.078, { reeds: 130 });
    /* dilimlerde tırmıklanmış toprak: mezar sıralarının yatağı */
    for (let i = 0; i < L1.wedges; i++) {
      const a0 = (i / L1.wedges) * TAU + 0.60, a1 = ((i + 1) / L1.wedges) * TAU + 0.44;
      for (let r = 0; r < L1.rows.length; r++) {
        const rr = L1.rows[r];
        g.strokeStyle = 'rgba(38,40,30,0.40)'; g.lineWidth = R(0.020);
        g.beginPath(); g.arc(cx, cy, R(rr), a0, a1); g.stroke();
        g.strokeStyle = 'rgba(140,142,120,0.14)'; g.lineWidth = R(0.004);
        g.beginPath(); g.arc(cx, cy, R(rr - 0.008), a0, a1); g.stroke();
      }
    }
    /* çeperin DIŞI: yabani otlar, devrilmiş taşlar, moloz */
    for (let i = 0; i < 5; i++) {
      const a = 0.7 + i * 1.15;
      K.rubble(0.5 + Math.cos(a) * 0.465, 0.5 + Math.sin(a) * 0.465, 0.045, 16);
    }
    K.core(0.5, 0.5, 0.150);
    /* göbekteki anıt mührü: haçın izi */
    K.rays(0.5, 0.5, 0.030, 0.115, 4, { off: 0.7854, w: 10 });
    K.wear(54);
    K.haze(9);
  },
  props(A) {
    /* v49 — ÇEVRE DÜZENİ (kullanıcı: "dağınık değil, düzenli yerleştirme").
       Mezarlık bir BAHÇEDİR: kapıdan göbeğe SERVİ ALEYİ, halka dilimlerinde
       boyalı yatakların üstünde servi SIRALARI, göbekte dört servi + dört
       kandil, gölette söğüt yayı, köşelerde söğüt korusu. Eski mezar, haç,
       şapel, mahzen, lahit, heykel, çit kalktı (v49). */
    const c = L1.c, DK = ['ot', 'ot', 'cicek', 'tas'], GR = ['mum', 'cicek', 'ot'];
    const WL = ['ot', 'mantar', 'yaprakP', 'tas'];
    A.ringPath(c[0], c[1], L1.outer, 0.015);
    A.ringPath(c[0], c[1], L1.ring, 0.020);
    for (let i = 0; i < 4; i++) A.spokePath(c[0], c[1], 0.150, 0.478, -Math.PI / 2 + i * Math.PI / 2, 0.018);
    A.area(L1.gate[0], L1.gate[1] + 0.040, 0.044);
    A.area(c[0], c[1], 0.128);
    const at = (ang, r) => [c[0] + Math.cos(ang) * r, c[1] + Math.sin(ang) * r];
    const AC = -1.05, AO = 2.30;
    let i0 = A.mark();
    /* KAPI + SERVİ ALEYİ: kapıda iki kandil, kuzey kolunda iki yanda üçer servi */
    A.add('fener', L1.gate[0] - 0.040, L1.gate[1] + 0.034); A.add('fener', L1.gate[0] + 0.040, L1.gate[1] + 0.034);
    for (const v of [0.110, 0.150, 0.190]) { A.add('fidan', 0.5 - 0.040, v, { exact: true }); A.add('fidan', 0.5 + 0.040, v, { exact: true }); }
    A.dressFrom(i0, DK, 3);
    /* ANMA ÇEMBERİ (eski şapel yeri): dört servi, ortada sunak kazanı, iki kandil */
    i0 = A.mark();
    const P1 = at(AC, 0.352);
    A.add('kazan', P1[0], P1[1]);
    A.ringN('fidan', P1[0], P1[1], 0.050, 4, { off: 0.7854, exact: true });
    const F1 = at(AC - 0.100, 0.352), F2 = at(AC + 0.100, 0.352);
    A.add('fener', F1[0], F1[1]); A.add('fener', F2[0], F2[1]);
    A.dressFrom(i0, GR, 4);
    A.patch(['cicek', 'mum'], P1[0], P1[1], 0.036, 8);
    /* KEMİKHANE AVLUSU: mezar levhası çifti + totem + iki kandil */
    i0 = A.mark();
    const P2 = at(AO, 0.352);
    A.add('totem', P2[0], P2[1]);
    A.arc('plaka', c[0], c[1], 0.352, AO + 0.090, AO + 0.150, 2, { face: true, exact: true });
    A.arc('plaka', c[0], c[1], 0.352, AO - 0.090, AO - 0.150, 2, { face: true, exact: true });
    const D1 = at(AO, 0.300 + 0.030), D2 = at(AO, 0.400);
    A.add('fener', D1[0] - 0.030, D1[1]); A.add('kemik', D2[0], D2[1]);
    A.dressFrom(i0, ['ot', 'mum', 'tas'], 4);
    /* AİLE PARSELİ: 2×2 mezar levhası, köşelerinde servi */
    i0 = A.mark();
    A.grid('plaka', 0.132, 0.132, 0.172, 0.172, 2, 2, { exact: true });
    for (const [u, v] of [[0.108, 0.108], [0.196, 0.108], [0.108, 0.196], [0.196, 0.196]]) A.add('fidan', u, v, { exact: true });
    A.dressFrom(i0, GR, 2);
    A.patch(['cicek', 'ot'], 0.152, 0.152, 0.028, 8);
    /* DİLİMLER: boyalı yatak boyunca DÜZENLİ servi sırası + çiçek bordürü */
    const near = (a, b) => Math.abs(((a - b + Math.PI * 3) % TAU) - Math.PI) < 0.62;
    for (let w = 0; w < L1.wedges; w++) {
      const a0 = (w / L1.wedges) * TAU + 0.66, a1 = ((w + 1) / L1.wedges) * TAU + 0.38, am = (a0 + a1) / 2;
      if (near(am, AC) || near(am, AO)) continue;
      A.group(w % 2 ? 1 : 0, () => {
        const k0 = A.mark();
        A.arc('fidan', c[0], c[1], L1.rows[0], am - 0.21, am + 0.21, 3, { exact: true });
        A.dressFrom(k0, GR, 3);
      });
      for (let q = 0; q < 7; q++) { const p = at(am - 0.24 + q * 0.08, L1.rows[0] + 0.028); A.decor(q % 2 ? 'mum' : 'cicek', p[0], p[1]); }
    }
    /* GÖLET: söğüt YAYI (batı-kuzey kıyısı), saz halkası, nilüfer */
    A.group(1, () => {
      const k0 = A.mark();
      for (const a of [2.6, 3.4, 4.2, 5.0]) A.add('agac', L1.pond[0] + Math.cos(a) * 0.114, L1.pond[1] + Math.sin(a) * 0.100, { exact: true });
      A.add('fener', L1.pond[0] - 0.040, L1.pond[1] - 0.120);
      A.dressFrom(k0, WL, 3);
    });
    for (let q = 0; q < 16; q++) { const a = q / 16 * TAU; A.decor(['saz', 'saz', 'ot'], L1.pond[0] + Math.cos(a) * 0.080, L1.pond[1] + Math.sin(a) * 0.080); }
    for (let q = 0; q < 4; q++) A.decor('nilufer', L1.pond[0] + Math.cos(q * 1.7) * 0.040, L1.pond[1] + Math.sin(q * 1.7) * 0.036);
    A.fx('atesbocegi', L1.pond[0], L1.pond[1], { n: 8, r: 120, h: 50 });
    /* KÖŞE KORULARI: söğüt üçgeni + servi eşlik */
    for (const [u, v, sx, sy] of [[0.880, 0.120, -1, 1], [0.130, 0.880, 1, -1]]) {
      A.group(2, () => {
        const k0 = A.mark();
        A.add('agac', u, v, { exact: true });
        A.add('agac', u + sx * 0.052, v + 0.012, { exact: true });
        A.add('fidan', u + 0.010, v + sy * 0.056, { exact: true });
        A.dressFrom(k0, WL, 4);
        A.fx('atesbocegi', u, v, { n: 4, r: 90, h: 60 });
      });
    }
    /* GÖBEK: köşegenlerde dört servi, kollarda dört kandil */
    i0 = A.mark();
    A.ringN('fidan', 0.5, 0.5, 0.160, 4, { off: 0.7854, exact: true });
    A.dressFrom(i0, ['mum', 'cicek', 'ot'], 3);
    A.group(1, () => { const k0 = A.mark(); A.ringN('fener', 0.5, 0.5, L1.ring - 0.028, 4, { off: -0.7854 }); A.dressFrom(k0, DK, 2); });
    A.edge(['fidan', 'agac'], { pri: 3, step: 0.3, skip: 0.45, dress: WL });
    A.cover(['ot', 'ot', 'cicek', 'tas', 'mantar'], { calm: ['cicek', 'tas'] });
  },
};

/* ═══════════════════════════════════════════════════════════
   2 · KÜL ÇUKURLARI — TERASLI KÖMÜR OCAĞI
   Endüstriyel bir yer: kuzeybatıdan güneydoğuya inen üç TERAS,
   terasları kesen ZİKZAK servis yolu, her terasta kömür fırını
   çukurları, en altta ÇÖKEN OCAK. Yamacın yönü tek bir eksenden
   gelir — teras çizgileri, yarıklar ve moloz yelpazesi hepsi ona bakar.
   ═══════════════════════════════════════════════════════════ */
const L2 = {
  /* iki istinat duvarı: yamacı üç banda böler (KD-GB doğrultusunda) */
  scarps: [
    [[0.020, 0.360], [0.300, 0.500], [0.560, 0.660], [0.760, 0.860], [0.900, 0.980]],
    [[0.140, 0.030], [0.420, 0.180], [0.680, 0.340], [0.900, 0.520], [0.985, 0.640]],
  ],
  road: [[0.500, 0.010], [0.470, 0.090], [0.270, 0.190], [0.600, 0.320],
    [0.280, 0.470], [0.640, 0.620], [0.420, 0.800], [0.500, 0.990]],
  kilns: [[0.230, 0.170, 0.052], [0.735, 0.245, 0.058], [0.165, 0.615, 0.048],
    [0.780, 0.630, 0.062], [0.455, 0.855, 0.050]],
  furnace: [0.812, 0.856],
  fissures: [
    [[0.060, 0.120], [0.220, 0.300], [0.300, 0.520], [0.420, 0.700], [0.470, 0.930]],
    [[0.560, 0.040], [0.660, 0.230], [0.800, 0.400], [0.880, 0.600]],
    [[0.030, 0.700], [0.160, 0.820], [0.250, 0.960]],
  ],
  nests: [[0.120, 0.420], [0.900, 0.180], [0.640, 0.900]],
};

const kul = {
  surf: 'kul', sat: 0.74, night: 0.24, edge: edgeAsh, nests: L2.nests,
  floor(g, E, Q, K) {
    const { U, V, R } = E;
    K.base(3200, 200);
    /* KOT FARKI: üst bandı aydınlat, alt bandı karart. Bir yamacın
       tepeden bakınca okunmasının tek yolu bu — teras çizgisi tek başına
       "yerde bir çizgi" okunur. */
    const band = (pts, up) => {
      g.save();
      g.beginPath();
      g.moveTo(U(pts[0][0]), V(pts[0][1]));
      for (let i = 1; i < pts.length; i++) g.lineTo(U(pts[i][0]), V(pts[i][1]));
      g.lineTo(U(1.1), V(up ? -0.1 : 1.1)); g.lineTo(U(-0.1), V(up ? -0.1 : 1.1));
      g.closePath(); g.clip();
      g.fillStyle = up ? 'rgba(226,200,170,0.055)' : 'rgba(6,5,4,0.16)';
      g.fillRect(E.x0, E.y0, E.P, E.P);
      g.restore();
    };
    band(L2.scarps[1], true);
    band(L2.scarps[0], false);
    for (let i = 0; i < L2.scarps.length; i++) {
      K.scarp(L2.scarps[i], { drop: 0.016, crest: 'rgba(216,182,140,0.24)' });
    }
    /* ZİKZAK SERVİS YOLU: terasları kesen tek geçit */
    K.road(L2.road, 0.028, { lite: 'rgba(180,132,74,0.30)' });
    /* KOR YARIKLARI: yamaç doğrultusunda, yolu kesiyor */
    for (let i = 0; i < L2.fissures.length; i++) {
      K.fissure(L2.fissures[i], 0.011, { glow: 'rgba(255,120,44,1)' });
    }
    /* FIRIN ÇUKURLARI: kömür yakma çukurları — kabarık sırt + kor */
    for (let i = 0; i < L2.kilns.length; i++) {
      const k = L2.kilns[i];
      K.pit(k[0], k[1], k[2], { glow: 'rgba(255,130,50,1)', rim: 'rgba(150,132,110,0.30)' });
      K.engrave(k[0], k[1], k[2] * 1.5, 2, { col: 'rgba(30,22,16,0.30)', w: 9 });
    }
    /* ÇÖKEN OCAK: moloz yelpazesi + cüruf akıntısı */
    K.rubble(L2.furnace[0], L2.furnace[1], 0.115, 40, { stone: 'rgba(120,106,92,0.30)' });
    K.fissure([[L2.furnace[0], L2.furnace[1]], [0.700, 0.930], [0.600, 0.985]], 0.020,
      { glow: 'rgba(255,150,60,1)', dark: 'rgba(20,10,6,0.8)' });
    /* cüruf yığınları: yamaçtan dökülen koyu yelpazeler */
    for (let i = 0; i < 7; i++) {
      const t = i / 6;
      K.rubble(0.10 + t * 0.80, 0.10 + t * 0.30 + (i % 2) * 0.28, 0.038, 14,
        { stone: 'rgba(58,52,48,0.34)', dust: 'rgba(40,32,26,0.22)' });
    }
    K.core(0.5, 0.480, 0.140, { shard: 'rgba(60,54,50,0.26)' });
    K.wear(46);
    K.haze(9);
  },
  props(A) {
    /* v49: ocak düzeni — beş kor çukuru, her birinin başında KAZAN + kandil
       + iki kömürleşmiş ağaç (ocak kapısı gibi karşılıklı); yol boyunca
       kandil/ağaç dönüşümü; çöken ocağın yerinde yanan ağaç halkası. Fırın,
       baca, odun, duvar kalktı. */
    const K = ['kor', 'tas', 'tas', 'ot'];
    A.path(L2.road, 0.020);
    for (const k of L2.kilns) A.area(k[0], k[1], k[2] * 1.05);
    for (let i = 0; i < L2.kilns.length; i++) {
      const k = L2.kilns[i], r = k[2];
      A.group(i < 3 ? 0 : 1, () => {
        const i0 = A.mark();
        A.add('kazan', k[0], k[1] - r * 1.7);
        A.add('fidan', k[0] - r * 1.5, k[1] - r * 1.2, { exact: true });
        A.add('fidan', k[0] + r * 1.5, k[1] - r * 1.2, { exact: true });
        A.add('fener', k[0], k[1] + r * 1.7);
        A.dressFrom(i0, K, 4);
        for (let q = 0; q < 10; q++) { const a = q / 10 * TAU + i; A.decor(['kor', 'tas'], k[0] + Math.cos(a) * r * 1.25, k[1] + Math.sin(a) * r * 1.25); }
        A.fx('kor', k[0], k[1], { n: 5, r: 40, h: 150 });
      });
    }
    /* ÇÖKEN OCAK: altılı yanık ağaç halkası, ortada iki kazan */
    const F = L2.furnace;
    let i0 = A.mark();
    A.add('kazan', F[0] - 0.030, F[1]); A.add('kazan', F[0] + 0.030, F[1]);
    A.ringN('agac', F[0], F[1], 0.094, 6, { off: 0.52, exact: true });
    A.dressFrom(i0, K, 3);
    A.fx('kor', F[0], F[1], { n: 6, r: 60, h: 220 });
    /* SIRTLAR: segment ortasında üçlü kütük dizisi */
    for (let s = 0; s < L2.scarps.length; s++) {
      const p = L2.scarps[s];
      A.group(s ? 1 : 0, () => {
        const k0 = A.mark();
        for (const i of [0, 2]) {
          const a = p[i], b = p[i + 1];
          A.line('fidan', a[0] + (b[0] - a[0]) * 0.34, a[1] + (b[1] - a[1]) * 0.34 + 0.014,
            a[0] + (b[0] - a[0]) * 0.66, a[1] + (b[1] - a[1]) * 0.66 + 0.014, 3, { exact: true });
        }
        A.dressFrom(k0, K, 2);
      });
    }
    i0 = A.mark();
    A.wayside('fener', L2.road, 4, 0.036, { side: 1 });
    A.wayside('agac', L2.road, 4, 0.044, { side: -1 });
    A.dressFrom(i0, K, 2);
    A.verge(['tas', 'kor'], L2.road, 18, 0.032);
    /* KÖMÜR DURAKLARI: küfe çifti + kütük */
    for (const [u, v] of [[0.870, 0.360], [0.080, 0.500], [0.620, 0.080]]) {
      A.group(2, () => {
        const k0 = A.mark();
        A.add('kupa', u, v); A.add('kupa', u + 0.030, v + 0.010);
        A.add('fidan', u - 0.030, v + 0.018, { exact: true });
        A.dressFrom(k0, K, 3);
      });
    }
    A.edge(['fidan', 'agac'], { pri: 3, step: 0.3, skip: 0.4, dress: K });
    A.cover(['kor', 'tas', 'ot', 'tas'], { calm: ['tas', 'kor'] });
  },
};

/* ═══════════════════════════════════════════════════════════
   3 · ZEHİR BATAKLIĞI — TAKIMADA + İSKELE
   Burada YOL ahşap iskeledir ve ada ada atlar. Beş turba adası: göbek
   (dövüş alanı), kuzeybatıda balıkçı kampı, kuzeydoğuda servi korusu,
   güneybatıda batmış mavna, güneydoğuda batık idol. Dört kapıdan gelen
   iskele göbekte birleşir — hem mantıklı hem oynanışın istediği şey.
   Su GEÇİLEBİLİR (sığ): batakta boğulma yok, sazlık ve kütük engeldir.
   ═══════════════════════════════════════════════════════════ */
const L3 = {
  isles: [[0.500, 0.500, 0.152], [0.215, 0.245, 0.132], [0.780, 0.255, 0.108],
    [0.235, 0.765, 0.116], [0.775, 0.775, 0.124]],
  walks: [
    [[0.500, 0.020], [0.480, 0.160], [0.500, 0.330]],
    [[0.500, 0.980], [0.520, 0.830], [0.500, 0.670]],
    [[0.020, 0.500], [0.170, 0.520], [0.330, 0.500]],
    [[0.980, 0.500], [0.830, 0.480], [0.670, 0.500]],
    [[0.330, 0.420], [0.280, 0.350], [0.245, 0.300]],
    [[0.640, 0.410], [0.720, 0.340], [0.762, 0.310]],
    [[0.370, 0.600], [0.300, 0.680], [0.262, 0.716]],
    [[0.630, 0.610], [0.710, 0.690], [0.752, 0.726]],
  ],
  nests: [[0.130, 0.500], [0.870, 0.640], [0.480, 0.130]],
};

const bataklik = {
  surf: 'batak', sat: 0.90, night: 0.22, edge: edgeReed, nests: L3.nests,
  floor(g, E, Q, K) {
    const { U, V, R, rnd } = E;
    /* SU TABANI: haritanın çoğu durgun su. Adalar bunun ÜSTÜNE çizilir,
       yani "adaların arası su" değil "suyun içinde ada" okunur. */
    K.base(2200, 300);
    g.save();
    g.beginPath(); g.rect(E.x0, E.y0, E.P, E.P); g.clip();
    for (let i = 0; i < 26; i++) {
      const x = E.x0 + rnd() * E.P, y = E.y0 + rnd() * E.P, r = R(0.10 + rnd() * 0.16);
      const v = g.createRadialGradient(x, y, r * 0.1, x, y, r);
      v.addColorStop(0, 'rgba(10,32,30,0.40)');
      v.addColorStop(1, 'rgba(10,32,30,0)');
      g.fillStyle = v; g.fillRect(x - r, y - r, r * 2, r * 2);
    }
    g.restore();
    /* durgun su yansıma çizgileri: geniş, yatay, seyrek */
    for (let i = 0; i < 220; i++) {
      const x = E.x0 + rnd() * E.P, y = E.y0 + rnd() * E.P, w = 60 + rnd() * 220;
      g.strokeStyle = Q.waterLine.replace('A', (0.04 + rnd() * 0.06).toFixed(3));
      g.lineWidth = 2 + rnd() * 4;
      g.beginPath(); g.moveTo(x, y); g.lineTo(x + w, y); g.stroke();
    }
    /* ADALAR: turba — kenarda çamur halkası, üstte kuru ot */
    for (let i = 0; i < L3.isles.length; i++) {
      const is = L3.isles[i];
      const X = U(is[0]), Y = V(is[1]), RR = R(is[2]);
      g.save();
      E.poly(X, Y, RR * 1.12, 16, 0.16, 0.92); g.clip();
      g.fillStyle = 'rgba(58,54,36,0.60)';
      g.fillRect(X - RR * 1.3, Y - RR * 1.3, RR * 2.6, RR * 2.6);
      g.restore();
      g.save();
      E.poly(X, Y, RR, 16, 0.14, 0.92); g.clip();
      g.fillStyle = '#4a4d34';
      g.fillRect(X - RR * 1.2, Y - RR * 1.2, RR * 2.4, RR * 2.4);
      const v = g.createRadialGradient(X, Y - RR * 0.2, RR * 0.1, X, Y, RR);
      v.addColorStop(0, 'rgba(146,150,96,0.24)');
      v.addColorStop(1, 'rgba(146,150,96,0)');
      g.fillStyle = v; g.fillRect(X - RR, Y - RR, RR * 2, RR * 2);
      for (let q = 0; q < 90; q++) {
        const a = rnd() * TAU, rr = RR * Math.sqrt(rnd());
        const w = 14 + rnd() * 40;
        g.fillStyle = rnd() < 0.5 ? 'rgba(120,126,74,0.22)' : 'rgba(14,20,12,0.30)';
        g.beginPath();
        g.ellipse(X + Math.cos(a) * rr, Y + Math.sin(a) * rr, w, w * 0.5, rnd() * 3, 0, TAU);
        g.fill();
      }
      g.restore();
      /* kıyı sazlığı: adanın çevresini SARAR, silueti yumuşatır */
      g.lineCap = 'round';
      for (let q = 0; q < 150; q++) {
        const a = rnd() * TAU, rr = RR * (0.96 + rnd() * 0.18);
        const px = X + Math.cos(a) * rr, py = Y + Math.sin(a) * rr * 0.92;
        const hh = 14 + rnd() * 26;
        g.strokeStyle = rnd() < 0.5 ? Q.reed0 : Q.reed1;
        g.lineWidth = 2.4 + rnd() * 2.2;
        g.beginPath(); g.moveTo(px, py); g.lineTo(px + (rnd() - 0.5) * 12, py - hh); g.stroke();
      }
    }
    /* İSKELE AĞI: yol budur */
    for (let i = 0; i < L3.walks.length; i++) K.plank(L3.walks[i], 0.026, { wood: [116, 88, 56] });
    /* balıkçı kampının çamur avlusu */
    K.cobble(0.215, 0.245, 0.052, { cell: 0.0135, base: 'rgba(60,56,40,0.9)', stone: [98, 96, 74] });
    K.core(0.5, 0.5, 0.128, { shard: 'rgba(96,102,70,0.22)' });
    K.wear(40, 0.08, 0.30);
    K.haze(11, { r0: 0.24 });
  },
  props(A) {
    /* v49: balıkçı kampı (kazan + küp + kandil, iki mangrov gölgeliği),
       SELVİ KORUSU iki sıra düzeninde, idolün çevresinde dörtlü mangrov,
       göbekte dört selvi, iskele başında fener çifti. Kulübe, kayık,
       iskele engeli kalktı. */
    const W = ['saz', 'saz', 'ot', 'mantar'], ISL = ['ot', 'mantar', 'saz'];
    for (const w of L3.walks) A.path(w, 0.018);
    A.area(0.5, 0.5, 0.118);
    let i0 = A.mark();
    A.add('kazan', 0.200, 0.240);
    A.add('kupa', 0.246, 0.226); A.add('kupa', 0.160, 0.270);
    A.add('fener', 0.200, 0.300);
    A.add('fidan', 0.150, 0.200, { exact: true }); A.add('fidan', 0.250, 0.290, { exact: true });
    A.dressFrom(i0, ISL, 4);
    A.fx('atesbocegi', 0.20, 0.25, { n: 5, r: 120, h: 60, col: [0.28, 0.58, 0.44] });
    /* SELVİ KORUSU: 2×3 düzen */
    i0 = A.mark();
    A.grid('agac', 0.748, 0.212, 0.832, 0.300, 3, 2, { exact: true });
    A.dressFrom(i0, W, 3);
    A.fx('atesbocegi', 0.79, 0.255, { n: 6, r: 110, h: 70, col: [0.28, 0.6, 0.44] });
    A.group(1, () => {
      const k0 = A.mark();
      A.add('fener', 0.170, 0.722); A.add('fener', 0.300, 0.812);
      A.add('kupa', 0.205, 0.815);
      A.add('fidan', 0.235, 0.765, { exact: true });
      A.dressFrom(k0, W, 3);
    });
    i0 = A.mark();
    A.add('totem', 0.775, 0.775);
    A.add('kazan', 0.775, 0.846);
    A.ringN('fidan', 0.775, 0.775, 0.088, 4, { off: 0.785, exact: true });
    A.dressFrom(i0, ['mum', 'mantar', 'saz'], 3);
    A.fx('atesbocegi', 0.775, 0.775, { n: 5, r: 90, h: 80, col: [0.34, 0.62, 0.5] });
    A.group(1, () => { const k0 = A.mark(); A.ringN('agac', 0.5, 0.5, 0.150, 4, { off: 0.785, exact: true }); A.dressFrom(k0, ISL, 4); });
    A.group(2, () => { const k0 = A.mark(); A.add('agac', 0.360, 0.140); A.add('fidan', 0.398, 0.172); A.dressFrom(k0, W, 3); });
    A.group(2, () => { const k0 = A.mark(); A.add('agac', 0.620, 0.870); A.add('fidan', 0.658, 0.842); A.dressFrom(k0, W, 3); });
    A.edge(['agac', 'fidan'], { pri: 3, step: 0.3, skip: 0.35, dress: W });
    for (const w of L3.walks) A.verge(['kazik'], w, 4, 0.030);
    for (const is of L3.isles) {
      for (let q = 0; q < 12; q++) { const a = q / 12 * TAU + is[0] * 7; A.decor(['saz', 'saz', 'ot'], is[0] + Math.cos(a) * is[2] * 1.02, is[1] + Math.sin(a) * is[2] * 0.95); }
    }
    A.cover(['nilufer', 'saz', 'nilufer', 'mantar'], { calm: ['ot', 'mantar'] });
  },
};

/* ═══════════════════════════════════════════════════════════
   4 · KAN KATEDRALİ — NEFİN İÇİ
   Oyuncu bir binanın İÇİNDE dövüşür. Eksenel bazilika planı: güneyde
   narteks, kuzeye doğru nef, iki sıra sütun, ortada TRANSEPT kesişimi
   (dövüş göbeği tam burada — planın kendisi merkezi boş bırakıyor),
   kuzeyde apsis ve sunak. Vitray ışık gölleri zemine eğik düşer.
   ═══════════════════════════════════════════════════════════ */
const L4 = {
  nave: { x0: 0.300, x1: 0.700, y0: 0.170, y1: 0.900 },
  aisle: { l: 0.300, r: 0.700 },
  cols: { l: 0.352, r: 0.648, y0: 0.250, y1: 0.870, n: 9 },
  cross: { y: 0.500, x0: 0.100, x1: 0.900, h: 0.108 },
  apse: [0.500, 0.180], altar: [0.500, 0.228], narthex: [0.500, 0.915],
  glass: [[0.360, 0.320, 'rgba(196,54,86,0.15)'], [0.640, 0.400, 'rgba(120,80,220,0.13)'],
    [0.330, 0.640, 'rgba(230,180,90,0.11)'], [0.660, 0.720, 'rgba(196,54,86,0.12)'],
    [0.180, 0.500, 'rgba(120,80,220,0.12)'], [0.820, 0.500, 'rgba(230,180,90,0.10)']],
  /* ÜÇÜNCÜ YUVA KAPI AĞZINDAN ÇEKİLDİ (ölçümle bulundu). (0,500 0,960)
     tam narteks kemerinin üzerindeydi: `A.nest()` her şeyden ÖNCE çalıştığı
     için yuva yeri kapıyor ve katedralin ÖN KAPISI sessizce reddediliyordu.
     Yuva doğru davranıyordu — hatalı olan koordinat: bir görev hedefi de
     kapı ağzında doğmamalı (oyuncu kemeri hiç görmez, hedefi kapıda döver).
     Eksenden çıktı: narteksin güneydoğu köşesi. */
  nests: [[0.150, 0.220], [0.850, 0.230], [0.660, 0.952]],
};

const katedral = {
  surf: 'mermer', sat: 0.88, night: 0.30, edge: edgeNave, nests: L4.nests,
  floor(g, E, Q, K) {
    const { U, V, R, rnd } = E;
    K.base(2400, 260);
    const N = L4.nave, C = L4.cross;
    /* YAN SAHINLAR: daha küçük levha, daha koyu — nefi ayıran şey ölçek */
    K.slabs(0.075, 0.150, 0.925, 0.930, 0.0290, { base: 'rgba(46,40,56,0.86)' });
    /* TRANSEPT KOLLARI */
    K.slabs(C.x0, C.y - C.h, C.x1, C.y + C.h, 0.0380);
    /* NEF: büyük levha döşeme */
    K.slabs(N.x0, N.y0, N.x1, N.y1, 0.0420);
    /* NEF HALISI: orta eksende kızıl yürüyüş şeridi. Eksenin okunması
       tamamen buna bağlı; halı olmadan nef "büyük bir oda" okunur. */
    g.save();
    g.beginPath(); g.rect(U(0.452), V(0.200), R(0.096), R(0.700)); g.clip();
    g.fillStyle = 'rgba(96,20,34,0.60)';
    g.fillRect(U(0.452), V(0.200), R(0.096), R(0.700));
    for (let i = 0; i < 46; i++) {
      const y = V(0.200 + (i / 46) * 0.700);
      g.strokeStyle = i % 2 ? 'rgba(20,6,10,0.34)' : 'rgba(190,110,120,0.10)';
      g.lineWidth = 5;
      g.beginPath(); g.moveTo(U(0.452), y); g.lineTo(U(0.548), y); g.stroke();
    }
    g.strokeStyle = 'rgba(232,190,110,0.18)'; g.lineWidth = 7;
    g.beginPath(); g.rect(U(0.458), V(0.206), R(0.084), R(0.688)); g.stroke();
    g.restore();
    /* APSİS: yarım daire sahanlık + basamaklar */
    const ax = U(L4.apse[0]), ay = V(L4.apse[1]), ar = R(0.150);
    g.save();
    g.beginPath(); g.arc(ax, ay + ar * 0.15, ar, Math.PI, TAU); g.closePath(); g.clip();
    K.cobble(L4.apse[0], L4.apse[1] + 0.02, 0.170,
      { cell: 0.0125, hardEdge: true, clip: () => { g.beginPath(); g.arc(ax, ay + ar * 0.15, ar, Math.PI, TAU); g.closePath(); g.clip(); } });
    g.restore();
    for (let i = 0; i < 3; i++) {
      g.strokeStyle = i % 2 ? 'rgba(216,200,236,0.14)' : 'rgba(12,8,16,0.34)';
      g.lineWidth = 10;
      g.beginPath(); g.arc(ax, ay + ar * 0.15, ar * (0.62 + i * 0.19), Math.PI, TAU); g.stroke();
    }
    /* SUNAK MÜHRÜ: apsisin göbeğinde ışınsal oyma */
    K.rays(L4.altar[0], L4.altar[1], 0.020, 0.058, 12, { w: 5, col: 'rgba(255,190,230,0.13)' });
    /* NARTEKS: girişin taş sahanlığı + gül pencere gölgesi */
    K.cobble(L4.narthex[0], L4.narthex[1], 0.088, { cell: 0.0115 });
    K.engrave(L4.narthex[0], L4.narthex[1] - 0.010, 0.062, 3, { w: 6 });
    K.rays(L4.narthex[0], L4.narthex[1] - 0.010, 0.014, 0.058, 16, { w: 4 });
    /* ZEMİN MEZAR LEVHALARI: yan sahınlarda gömü taşları (yazıtlı) */
    for (let s = 0; s < 2; s++) {
      for (let i = 0; i < 7; i++) {
        const x = s ? 0.760 : 0.170, y = 0.230 + i * 0.096;
        g.save();
        g.translate(U(x), V(y)); g.rotate((rnd() - 0.5) * 0.05);
        g.fillStyle = 'rgba(14,10,20,0.44)';
        g.fillRect(-R(0.048), -R(0.030), R(0.096), R(0.060));
        g.fillStyle = 'rgba(126,118,146,0.34)';
        g.fillRect(-R(0.044), -R(0.026), R(0.088), R(0.052));
        for (let q = 0; q < 4; q++) {
          g.fillStyle = 'rgba(18,12,24,0.30)';
          g.fillRect(-R(0.032), -R(0.016) + q * R(0.011), R(0.064) * (0.5 + rnd() * 0.5), R(0.004));
        }
        g.restore();
      }
    }
    /* VİTRAY IŞIK GÖLLERİ: eğik, uzun, renkli. Katedralin imzası ve
       haritanın tek renk kaynağı. Kenar keskin DEĞİL — ışık yumuşar. */
    for (let i = 0; i < L4.glass.length; i++) {
      const gl = L4.glass[i];
      const x = U(gl[0]), y = V(gl[1]), w = R(0.075), h = R(0.230);
      g.save();
      g.translate(x, y); g.rotate(-0.62);
      const v = g.createLinearGradient(0, -h / 2, 0, h / 2);
      v.addColorStop(0, gl[2]);
      v.addColorStop(0.6, alpha(gl[2], 0.06));
      v.addColorStop(1, alpha(gl[2], 0));
      g.fillStyle = v;
      g.beginPath(); g.roundRect(-w / 2, -h / 2, w, h, [w / 2, w / 2, 8, 8]); g.fill();
      /* kurşun bölmeler: ışığın içindeki koyu ızgara */
      g.strokeStyle = 'rgba(10,8,14,0.16)'; g.lineWidth = 4;
      for (let q = 1; q < 5; q++) {
        g.beginPath(); g.moveTo(-w / 2, -h / 2 + (q / 5) * h); g.lineTo(w / 2, -h / 2 + (q / 5) * h); g.stroke();
      }
      g.restore();
    }
    /* ÇÖKEN TONOZ: kuzeydoğu sahnında moloz + açık gökyüzü lekesi */
    K.rubble(0.790, 0.330, 0.098, 34, { stone: 'rgba(150,142,170,0.30)' });
    K.rubble(0.212, 0.780, 0.076, 24, { stone: 'rgba(150,142,170,0.26)' });
    K.core(0.5, L4.cross.y, 0.140, { shard: 'rgba(140,130,160,0.24)' });
    K.wear(38);
    K.haze(8);
  },
  props(A) {
    /* v49: nef = SAKSI DEFNE ALEYİ. İki sıra sütunun yerinde iki sıra saksı
       ağacı, sunakta kazan + kandil + küçük saksı yayı, yan nişlerde levha
       çiftleri, transeptte küçük saksı dizisi, kesişimde dört şamdan.
       Sütun, sıra, heykel, lahit, kemer, çan, duvar kalktı. */
    const C = L4.cols, RB = ['tas', 'tas', 'mum'], CAN = ['mum', 'mum', 'tas'];
    A.zone(0.452, 0.276, 0.548, 0.900);
    A.zone(L4.cross.x0, L4.cross.y - 0.046, L4.cross.x1, L4.cross.y + 0.046);
    A.area(0.500, 0.300, 0.048);
    A.area(L4.narthex[0], L4.narthex[1], 0.052);
    let i0 = A.mark();
    A.line('agac', C.l, C.y0, C.l, C.y1, 5, { exact: true, skip: [2] });
    A.line('agac', C.r, C.y0, C.r, C.y1, 5, { exact: true, skip: [2] });
    A.dressFrom(i0, ['tas', 'mum'], 2);
    for (let b = 0; b < 2; b++) {
      const y0 = b ? 0.300 : 0.640;
      for (let i = 0; i < 3; i++) for (let q = 0; q < 3; q++) { A.decor('mum', 0.392 + q * 0.016, y0 + i * 0.056); A.decor('mum', 0.576 + q * 0.016, y0 + i * 0.056); }
    }
    i0 = A.mark();
    A.add('kazan', L4.altar[0], L4.altar[1]);
    A.ringN('fidan', L4.apse[0], L4.apse[1] + 0.020, 0.130, 6, { skip: (a) => Math.sin(a) > -0.25, exact: true });
    A.add('fener', L4.altar[0] - 0.068, L4.altar[1] + 0.016);
    A.add('fener', L4.altar[0] + 0.068, L4.altar[1] + 0.016);
    A.dressFrom(i0, CAN, 4);
    i0 = A.mark();
    A.add('fener', L4.narthex[0] - 0.076, L4.narthex[1] - 0.030);
    A.add('fener', L4.narthex[0] + 0.076, L4.narthex[1] - 0.030);
    A.add('fidan', L4.narthex[0] - 0.120, L4.narthex[1] - 0.030, { exact: true });
    A.add('fidan', L4.narthex[0] + 0.120, L4.narthex[1] - 0.030, { exact: true });
    A.dressFrom(i0, CAN, 3);
    i0 = A.mark();
    A.add('plaka', 0.790, 0.330, { rot: 0.3 });
    A.add('kupa', 0.760, 0.300); A.add('kupa', 0.820, 0.360);
    A.dressFrom(i0, RB, 4);
    A.patch(['tas', 'tas', 'kristal'], 0.79, 0.33, 0.07, 14);
    A.fx('toz', 0.79, 0.33, { n: 6, r: 90, h: 120 });
    for (const x of [0.168, 0.832]) {
      A.group(1, () => {
        const k0 = A.mark();
        A.line('plaka', x, 0.260, x, 0.420, 2, { exact: true });
        A.line('plaka', x, 0.580, x, 0.740, 2, { exact: true });
        A.add('kazan', x, 0.820);
        A.dressFrom(k0, CAN, 3);
      });
    }
    A.group(2, () => {
      const k0 = A.mark();
      for (const y of [0.430, 0.570]) { A.line('fidan', 0.160, y, 0.280, y, 3, { exact: true }); A.line('fidan', 0.720, y, 0.840, y, 3, { exact: true }); }
      A.dressFrom(k0, RB, 2);
    });
    A.group(1, () => { const k0 = A.mark(); A.ringN('fener', 0.5, L4.cross.y, 0.168, 4, { off: 0.7854 }); A.dressFrom(k0, CAN, 2); });
    A.group(3, () => { for (const [u, v] of [[0.105, 0.300], [0.895, 0.300], [0.105, 0.700], [0.895, 0.700]]) A.dress(A.add('kupa', u, v), CAN, 2); });
    A.patch(['tas', 'tas', 'kristal'], 0.212, 0.78, 0.055, 10);
    for (const gl of L4.glass) { A.patch(['kristal'], gl[0], gl[1], 0.03, 3); A.fx('toz', gl[0], gl[1], { n: 3, r: 70, h: 110, col: [0.22, 0.14, 0.2] }); }
    A.cover(['tas', 'mum', 'tas'], { calm: ['tas'] });
  },
};

/* ═══════════════════════════════════════════════════════════
   5 · HİÇLİK TAHTI — İÇ İÇE MEYDANLAR
   Geometri anlatıyor: kare meydan → 45° döndürülmüş eşkenar dörtgen →
   küçük kare → boş göbek. Güneyden kuzeye tek bir TÖREN YOLU ve yolun
   ucunda taht. Ağaç, ot, su YOK — yalnız beyaz taş, sıra sıra heykel
   ve sis. Bu boşluk kasıtlı: dünyanın bittiği yer.
   ═══════════════════════════════════════════════════════════ */
const L5 = {
  sq: [0.085, 0.915], dia: 0.300, inner: 0.170,
  throne: [0.500, 0.190], way: { x: 0.500, y0: 0.300, y1: 0.940 },
  nests: [[0.140, 0.140], [0.860, 0.145], [0.500, 0.880]],
};

const hiclik = {
  /* HİYERARŞİ KORUNUR, SEVİYE DÜŞER: üç kademeyi açmak ortalamayı 59,2'ye
     çıkardı (tavan 52). Kademeleri geri kısmak hiyerarşiyi yeniden
     öldürürdü; gece yıkaması hepsini ORANLA düşürür, yani basamak
     (~%12 lum) yerinde kalır. Bu yüzden 0,33 → 0,44. */
  surf: 'solgun', sat: 0.86, night: 0.44, edge: edgeVoid, nests: L5.nests,
  floor(g, E, Q, K) {
    const { U, V, R } = E;
    K.base(2000, 320);
    const S = L5.sq;
    /* DIŞ MEYDAN: büyük levha döşeme, kenarı kırık */
    K.slabs(S[0], S[0], S[1], S[1], 0.0460);
    /* EŞKENAR DÖRTGEN: aynı döşeme, 45° dönmüş — dönüşü okutan şey
       kenarın kendisi, o yüzden kenara açık bir sırt çizilir. */
    const dia = (k) => {
      const c = U(0.5), cy = V(0.5), r = R(L5.dia * k);
      g.beginPath();
      g.moveTo(c, cy - r); g.lineTo(c + r, cy); g.lineTo(c, cy + r); g.lineTo(c - r, cy);
      g.closePath();
    };
    /* ÜÇ KADEME, ÜÇ PARLAKLIK. Planın tek fikri bu hiyerarşi; ölçüldü ve
       ilk sürümde ÇÖKTÜ (dış 56,6 · dörtgen 50,9 · iç 52,0 — hem görünmez
       hem TERS). Sebep parlaklık düzeltmesinde dış karenin taşı ile
       dörtgenin override'ına aynı değerin verilmesiydi. Basamak ~14-20
       lum olmak zorunda ve büyütme İÇ kademelerden yapılır: dış kare
       alanın %69'u, onu açmak zemin ortalamasını bandın dışına atar. */
    g.save(); dia(1); g.clip();
    K.slabs(0.14, 0.14, 0.86, 0.86, 0.0330, { base: 'rgba(56,60,70,0.9)', stone: [126, 132, 148] });
    g.restore();
    dia(1); g.strokeStyle = 'rgba(238,242,255,0.16)'; g.lineWidth = 14; g.stroke();
    dia(0.985); g.strokeStyle = 'rgba(12,13,18,0.44)'; g.lineWidth = 6; g.stroke();
    /* İÇ KARE: en açık taş, en büyük levha */
    K.slabs(0.5 - L5.inner, 0.5 - L5.inner, 0.5 + L5.inner, 0.5 + L5.inner, 0.0520,
      { base: 'rgba(72,76,88,0.92)', stone: [156, 162, 178] });
    g.strokeStyle = 'rgba(246,248,255,0.16)'; g.lineWidth = 10;
    g.strokeRect(U(0.5 - L5.inner), V(0.5 - L5.inner), R(L5.inner * 2), R(L5.inner * 2));
    /* TÖREN YOLU: güneyden tahta, tek eksen */
    K.road([[L5.way.x, L5.way.y1], [L5.way.x, (L5.way.y0 + L5.way.y1) / 2], [L5.way.x, L5.way.y0]],
      0.052, { fill: 'rgba(84,88,100,0.60)', lite: 'rgba(206,212,232,0.14)', edge: 'rgba(14,15,20,0.40)', noRut: true });
    /* TAHT SAHANLIĞI: sekizgen, üç basamak */
    const tx = U(L5.throne[0]), ty = V(L5.throne[1]), tr = R(0.108);
    const oct = (k) => {
      g.beginPath();
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * TAU + 0.3927;
        const x = tx + Math.cos(a) * tr * k, y = ty + Math.sin(a) * tr * k;
        i ? g.lineTo(x, y) : g.moveTo(x, y);
      }
      g.closePath();
    };
    for (let i = 3; i >= 1; i--) {
      oct(0.6 + i * 0.14);
      g.fillStyle = 'rgba(72,76,86,' + (0.30 + i * 0.10) + ')'; g.fill();
      g.strokeStyle = 'rgba(240,244,255,0.10)'; g.lineWidth = 7; g.stroke();
    }
    K.engrave(L5.throne[0], L5.throne[1], 0.062, 3, { col: 'rgba(246,248,255,0.10)', w: 6 });
    /* KIRIK PLAKALAR: dış köşelerde zeminin boşluğa döküldüğü yer */
    for (const [x, y] of [[0.115, 0.115], [0.885, 0.118], [0.118, 0.885], [0.885, 0.882]]) {
      K.rubble(x, y, 0.082, 22, { stone: 'rgba(180,186,204,0.26)', dust: 'rgba(200,206,226,0.14)' });
      const v = g.createRadialGradient(U(x), V(y), R(0.01), U(x), V(y), R(0.09));
      v.addColorStop(0, 'rgba(8,9,14,0.44)'); v.addColorStop(1, 'rgba(8,9,14,0)');
      g.fillStyle = v; g.fillRect(U(x) - R(0.09), V(y) - R(0.09), R(0.18), R(0.18));
    }
    K.core(0.5, 0.5, 0.130, { shard: 'rgba(190,196,214,0.20)' });
    K.wear(30);
    /* SİS: bu haritada kimliğin parçası, o yüzden daha güçlü */
    K.haze(14, { r0: 0.30, col: 'rgba(226,232,248,0.06)' });
  },
  props(A) {
    /* v49: tören düzeni KRİSTAL ağaçla kurulur — tahtın yerinde kristal
       ağaç yayı + kazan, yol boyunca karşılıklı kristal ağaç çiftleri,
       dörtgen köşelerinde kristal fidan, dış meydanın kare düzeninde
       fidan, dört çeyrekte kırık levha + kristal ağaç. Taht, heykel,
       sütun, dikilitaş kalktı. */
    const RN = ['kristal', 'tas', 'tas'];
    A.path([[L5.way.x, L5.way.y1], [L5.way.x, L5.way.y0]], 0.032);
    A.area(L5.throne[0], L5.throne[1] + 0.062, 0.044);
    A.area(0.5, 0.5, 0.120);
    let i0 = A.mark();
    A.add('kazan', L5.throne[0], L5.throne[1]);
    A.ringN('agac', L5.throne[0], L5.throne[1], 0.110, 5, { skip: (a) => Math.sin(a) > 0.35, exact: true });
    A.dressFrom(i0, RN, 3);
    A.fx('toz', L5.throne[0], L5.throne[1], { n: 6, r: 110, h: 140, col: [0.2, 0.18, 0.3] });
    i0 = A.mark();
    for (const v of [0.360, 0.650, 0.745, 0.840]) { A.add('agac', 0.420, v, { exact: true }); A.add('agac', 0.580, v, { exact: true }); }
    A.dressFrom(i0, RN, 2);
    i0 = A.mark();
    A.add('totem', 0.797, 0.5); A.add('totem', 0.203, 0.5);
    for (const [u, v] of [[0.33, 0.33], [0.67, 0.33], [0.33, 0.67], [0.67, 0.67]]) A.add('fidan', u, v, { exact: true });
    A.dressFrom(i0, RN, 3);
    A.group(1, () => { const k0 = A.mark(); for (const u of [0.797, 0.203]) { A.add('fener', u, 0.455); A.add('fener', u, 0.545); } A.dressFrom(k0, RN, 2); });
    A.group(1, () => {
      const k0 = A.mark();
      for (const [u, v] of [[0.14, 0.14], [0.86, 0.14], [0.14, 0.86], [0.86, 0.86], [0.5, 0.10], [0.10, 0.5], [0.90, 0.5]]) A.add('fidan', u, v, { exact: true });
      A.dressFrom(k0, RN, 3);
    });
    for (const [u, v] of [[0.30, 0.22], [0.72, 0.24], [0.26, 0.76], [0.74, 0.78]]) {
      A.group(2, () => {
        const k0 = A.mark();
        A.add('agac', u, v);
        A.add('plaka', u + 0.040, v + 0.020, { rot: 0.4 });
        A.add('plaka', u - 0.034, v + 0.032, { rot: -0.3 });
        A.dressFrom(k0, RN, 3);
        A.fx('toz', u, v, { n: 3, r: 60, h: 100, col: [0.18, 0.16, 0.28] });
      });
    }
    A.group(3, () => { for (const [x, y] of [[0.115, 0.115], [0.885, 0.118], [0.118, 0.885], [0.885, 0.882]]) A.dress(A.add('plaka', x + 0.020, y + 0.030, { rot: 0.5 }), RN, 2); });
    A.cover(['kristal', 'tas', 'tas'], { calm: ['tas'] });
  },
};

/* ═══════════════════════════════════════════════════════════
   6 · GÖKÇE ADA — ÜÇ LOBLU YÜZEN ADA
   Ada YONCA biçimlidir: üç lob ortada birleşir (göbek açık kalır),
   loblar arasına DIŞTAN içeriye uçurum kamaları girer ve kamaların
   üstünden taş köprüler geçer. Kuzeybatı lobu teraslı bahçe, doğu lobu
   fener direği, güney lobu tapınak. Çam ağaçları rüzgâra yatık.
   ═══════════════════════════════════════════════════════════ */
const L6 = {
  lobes: [[0.320, 0.320, 0.290], [0.740, 0.470, 0.250], [0.450, 0.760, 0.245]],
  /* uçurum kamaları: DIŞTAN merkeze doğru, merkeze VARMAZ */
  chasms: [
    { a: -0.62, r0: 0.500, r1: 0.185, w: 0.052 },
    { a: 1.62, r0: 0.500, r1: 0.190, w: 0.056 },
    { a: 3.05, r0: 0.500, r1: 0.185, w: 0.050 },
  ],
  garden: { x0: 0.130, y0: 0.180, x1: 0.400, y1: 0.400 },
  beacon: [0.800, 0.430], shrine: [0.455, 0.800],
  nests: [[0.180, 0.520], [0.860, 0.660], [0.560, 0.140]],
};

const gokada = {
  surf: 'yayla', sat: 0.86, night: 0.24, edge: edgeCloud, nests: L6.nests,
  floor(g, E, Q, K) {
    const { U, V, R, rnd } = E;
    K.base(2600, 220);
    /* LOBLAR: yeşil örtü — adanın gövdesi */
    for (let i = 0; i < L6.lobes.length; i++) {
      const l = L6.lobes[i];
      const X = U(l[0]), Y = V(l[1]), RR = R(l[2]);
      g.save();
      E.poly(X, Y, RR, 20, 0.10, 0.95); g.clip();
      const v = g.createRadialGradient(X, Y - RR * 0.2, RR * 0.1, X, Y, RR);
      v.addColorStop(0, 'rgba(104,132,90,0.30)');
      v.addColorStop(0.7, 'rgba(78,102,74,0.18)');
      v.addColorStop(1, 'rgba(78,102,74,0)');
      g.fillStyle = v; g.fillRect(X - RR, Y - RR, RR * 2, RR * 2);
      g.restore();
    }
    /* UÇURUM KAMALARI: dıştan giren V. Dibi koyu, dudakları aydınlık —
       yürünebilir (tuzak yok) ama gözün okuduğu yol köprüdür. */
    for (let i = 0; i < L6.chasms.length; i++) {
      const c = L6.chasms[i];
      const x0 = 0.5 + Math.cos(c.a) * c.r0, y0 = 0.5 + Math.sin(c.a) * c.r0;
      const x1 = 0.5 + Math.cos(c.a) * c.r1, y1 = 0.5 + Math.sin(c.a) * c.r1;
      const nx = -Math.sin(c.a), ny = Math.cos(c.a);
      g.save();
      g.beginPath();
      g.moveTo(U(x0 + nx * c.w), V(y0 + ny * c.w));
      g.lineTo(U(x0 - nx * c.w), V(y0 - ny * c.w));
      g.lineTo(U(x1 - nx * c.w * 0.22), V(y1 - ny * c.w * 0.22));
      g.lineTo(U(x1 + nx * c.w * 0.22), V(y1 + ny * c.w * 0.22));
      g.closePath();
      g.clip();
      g.fillStyle = '#0a1020'; g.fillRect(E.x0, E.y0, E.P, E.P);
      /* bulut: boşluğun dibinde ışıyan sis */
      for (let q = 0; q < 30; q++) {
        const t = rnd();
        const bx = U(x0 + (x1 - x0) * t + (rnd() - 0.5) * 0.02);
        const by = V(y0 + (y1 - y0) * t + (rnd() - 0.5) * 0.02);
        const r = R(0.016 + rnd() * 0.028);
        const v = g.createRadialGradient(bx, by, r * 0.1, bx, by, r);
        v.addColorStop(0, 'rgba(180,210,255,0.20)'); v.addColorStop(1, 'rgba(180,210,255,0)');
        g.fillStyle = v; g.fillRect(bx - r, by - r, r * 2, r * 2);
      }
      g.restore();
      /* dudak: iki yanda aydınlık kaya sırtı */
      for (const s of [1, -1]) {
        g.strokeStyle = 'rgba(214,226,244,0.22)'; g.lineWidth = 13;
        g.beginPath();
        g.moveTo(U(x0 + nx * c.w * s), V(y0 + ny * c.w * s));
        g.lineTo(U(x1 + nx * c.w * 0.22 * s), V(y1 + ny * c.w * 0.22 * s));
        g.stroke();
        g.strokeStyle = 'rgba(8,10,18,0.50)'; g.lineWidth = 6;
        g.beginPath();
        g.moveTo(U(x0 + nx * (c.w - 0.006) * s), V(y0 + ny * (c.w - 0.006) * s));
        g.lineTo(U(x1 + nx * (c.w * 0.22 - 0.004) * s), V(y1 + ny * (c.w * 0.22 - 0.004) * s));
        g.stroke();
      }
      /* KÖPRÜ: kamanın ortasında, kalas + korkuluk */
      const t = 0.52;
      const mx = x0 + (x1 - x0) * t, my = y0 + (y1 - y0) * t;
      K.plank([[mx + nx * c.w * 1.1, my + ny * c.w * 1.1], [mx, my],
        [mx - nx * c.w * 1.1, my - ny * c.w * 1.1]], 0.030, { wood: [136, 120, 96] });
    }
    /* lob içi yollar: göbekten üç loba */
    for (let i = 0; i < L6.lobes.length; i++) {
      const l = L6.lobes[i];
      K.road([[0.5, 0.5], [(0.5 + l[0]) / 2, (0.5 + l[1]) / 2], [l[0], l[1]]], 0.024);
    }
    /* TERASLI BAHÇE (kuzeybatı lobu): yay çizen sıralar */
    const G = L6.garden;
    for (let r = 0; r < 5; r++) {
      const t = r / 4;
      const bend = Math.sin(t * 3.14) * 0.024;
      K.furrow(G.x0 + bend, G.y0 + t * (G.y1 - G.y0), (G.x1 - G.x0) - bend * 1.4, 0.036,
        (t - 0.5) * 0.10, { bed: 'rgba(52,58,44,0.60)', ridge: 'rgba(130,150,110,0.20)' });
    }
    /* FENER SAHANLIĞI (doğu lobu) */
    K.cobble(L6.beacon[0], L6.beacon[1], 0.070, { cell: 0.0110 });
    K.rays(L6.beacon[0], L6.beacon[1], 0.014, 0.052, 8, { w: 5 });
    /* TAPINAK SAHANLIĞI (güney lobu) */
    K.cobble(L6.shrine[0], L6.shrine[1], 0.078, { cell: 0.0120, base: 'rgba(58,64,80,0.9)' });
    K.engrave(L6.shrine[0], L6.shrine[1], 0.056, 3);
    K.core(0.5, 0.5, 0.140);
    K.wear(36, 0.12, 0.40);
    K.haze(10, { col: 'rgba(200,225,255,0.06)' });
  },
  props(A) {
    /* v49: tek YAŞAYAN harita — bostanın yerinde ÇİÇEKLİ MEYVE BAHÇESİ
       (3×2 fidan, köşe kandili), fener tepesinde rüzgâr çamı + kandil
       çifti, tapınakta kazan + çiçekli fidan yayı, lob kenarında üçlü çam
       kümeleri, merkezde üç kandil. Ev, çit, odun, sütun, heykel kalktı. */
    const M = ['ot', 'ot', 'cicek', 'cicek', 'mantar', 'tas'];
    for (const l of L6.lobes) A.path([[0.5, 0.5], [(0.5 + l[0]) / 2, (0.5 + l[1]) / 2], [0.5 + (l[0] - 0.5) * 0.86, 0.5 + (l[1] - 0.5) * 0.86]], 0.016);
    for (const ch of L6.chasms) { const r = ch.r0 + (ch.r1 - ch.r0) * 0.52; A.area(0.5 + Math.cos(ch.a) * r, 0.5 + Math.sin(ch.a) * r, ch.w * 0.9); }
    A.area(L6.beacon[0], L6.beacon[1] + 0.044, 0.026);
    A.area(L6.shrine[0], L6.shrine[1] + 0.050, 0.026);
    let i0 = A.mark();
    A.grid('fidan', 0.190, 0.230, 0.290, 0.320, 3, 2, { exact: true });
    A.add('fener', 0.170, 0.210); A.add('fener', 0.310, 0.340);
    A.add('kazan', 0.176, 0.140);
    A.add('kupa', 0.214, 0.132);
    A.dressFrom(i0, M, 2);
    A.patch(['cicek', 'ot'], 0.24, 0.275, 0.045, 12);
    A.fx('atesbocegi', 0.24, 0.27, { n: 5, r: 120, h: 60, col: [0.5, 0.48, 0.2] });
    i0 = A.mark();
    A.add('agac', L6.beacon[0], L6.beacon[1] - 0.020);
    A.add('fener', L6.beacon[0] - 0.050, L6.beacon[1] + 0.030);
    A.add('fener', L6.beacon[0] + 0.050, L6.beacon[1] + 0.030);
    A.dressFrom(i0, M, 3);
    i0 = A.mark();
    A.add('kazan', L6.shrine[0], L6.shrine[1] - 0.010);
    A.ringN('fidan', L6.shrine[0], L6.shrine[1], 0.068, 5, { skip: (a) => Math.sin(a) > 0.4, exact: true });
    A.dressFrom(i0, ['cicek', 'mum', 'ot'], 3);
    A.group(1, () => {
      for (const ch of L6.chasms) {
        const nx = -Math.sin(ch.a), ny = Math.cos(ch.a);
        for (const s of [1, -1]) {
          const t = 0.30, r = ch.r0 + (ch.r1 - ch.r0) * t, w = ch.w * (1 - t * 0.78) + 0.016;
          A.dress(A.add('plaka', 0.5 + Math.cos(ch.a) * r + nx * w * s, 0.5 + Math.sin(ch.a) * r + ny * w * s), ['ot', 'tas'], 3);
        }
      }
    });
    const PC = [[0.12, 0.30], [0.36, 0.08], [0.93, 0.36], [0.86, 0.66], [0.26, 0.92], [0.62, 0.93]];
    for (let q = 0; q < PC.length; q++) {
      A.group(q < 3 ? 1 : 2, () => {
        const k0 = A.mark();
        for (let t = 0; t < 3; t++) { const a = t * 2.094 + q * 0.5; A.add(t ? 'fidan' : 'agac', PC[q][0] + Math.cos(a) * 0.026, PC[q][1] + Math.sin(a) * 0.026, { exact: true }); }
        A.dressFrom(k0, M, 3);
      });
    }
    A.group(2, () => { const k0 = A.mark(); A.add('kupa', 0.660, 0.600); A.add('kupa', 0.700, 0.620); A.add('fidan', 0.680, 0.570, { exact: true }); A.dressFrom(k0, M, 3); });
    A.group(1, () => { const k0 = A.mark(); A.ringN('fener', 0.5, 0.5, 0.172, 3, { off: 1.4 }); A.dressFrom(k0, M, 2); });
    A.cover(['ot', 'cicek', 'cicek', 'mantar', 'tas'], { calm: ['cicek'] });
  },
};

/* ═══════════════════════════════════════════════════════════
   7 · TUZ TABANI — KURUMUŞ GÖL + TUZLA
   Zeminin tamamı dev tuz kabuğu çokgeni. İçinden kervan izi geçer,
   doğuda buharlaşma havuzları IZGARASI (gerçek bir tuzla böyle
   çalışır: alçak setlerle bölünmüş sığ havuzlar), batıda karaya
   oturmuş GEMİ, güneyde tuz sütunu tarlası, kuzeyde kurumuş kaynak.
   ═══════════════════════════════════════════════════════════ */
const L7 = {
  track: [[0.030, 0.100], [0.240, 0.300], [0.460, 0.470], [0.660, 0.640], [0.900, 0.900]],
  pans: { x0: 0.600, y0: 0.170, x1: 0.940, y1: 0.640, c: 3, r: 3 },
  ship: [0.230, 0.470], spring: [0.470, 0.140],
  pillars: { x0: 0.330, y0: 0.700, x1: 0.700, y1: 0.930 },
  nests: [[0.120, 0.760], [0.880, 0.760], [0.140, 0.180]],
};

const tuzla = {
  surf: 'tuz', sat: 0.84, night: 0.30, edge: edgeSalt, nests: L7.nests,
  floor(g, E, Q, K) {
    const { U, V, R, rnd } = E;
    K.base(2400, 280);
    /* DEV KABUK: makro ölçekte de çokgen. Detay katmanı küçük
       çokgenleri veriyor; ikisinin ÖLÇEK farkı derinlik yapar.
       PARLAKLIK ÖLÇÜLDÜ: `plates` dolgusu OPAKTIR, yani taş rengi zemin
       ortalamasını doğrudan yazıyor. İlk sürüm [136,130,108] seçti ve
       harita 93,3 okudu (tavan 52) — "beyaz göl" istenirken zemin
       efektlerle yarışan bir levhaya dönüştü. Kimlik gece yıkaması +
       kabuk deseninde yaşar, PARLAKLIKTA değil. */
    K.plates(0.0, 0.0, 1.0, 1.0, 0.062, {
      stone: [92, 88, 72], jitter: 0.26,
      ridge: 'rgba(246,240,216,0.13)', ridgeW: 7, joint: 'rgba(34,30,22,0.26)',
    });
    /* KERVAN İZİ: iki paralel tekerlek oyuğu — tek şerit "yol" değil
       "iz" okunmalı, o yüzden ikili. */
    for (const off of [-0.008, 0.008]) {
      K.road(L7.track.map((p) => [p[0] + off, p[1] - off]), 0.011,
        { fill: 'rgba(74,68,52,0.50)', lite: 'rgba(180,170,138,0.16)', edge: 'rgba(30,26,18,0.26)', noRut: true });
    }
    K.road(L7.track, 0.030, { fill: 'rgba(96,90,72,0.20)', lite: 'rgba(0,0,0,0)', edge: 'rgba(40,36,26,0.16)', noRut: true });
    /* BUHARLAŞMA HAVUZLARI: ızgara. Her havuz farklı doygunlukta —
       tuzlanın kimliği bu renk basamağıdır (taze → kuru). */
    const P7 = L7.pans;
    const cw = (P7.x1 - P7.x0) / P7.c, ch = (P7.y1 - P7.y0) / P7.r;
    for (let r = 0; r < P7.r; r++) {
      for (let c = 0; c < P7.c; c++) {
        const x = P7.x0 + c * cw, y = P7.y0 + r * ch;
        const k = (r * P7.c + c) / (P7.r * P7.c - 1);
        g.save();
        g.beginPath(); g.rect(U(x + 0.010), V(y + 0.010), R(cw - 0.020), R(ch - 0.020)); g.clip();
        const v = g.createLinearGradient(U(x), V(y), U(x + cw), V(y + ch));
        v.addColorStop(0, 'rgba(' + (60 + k * 110 | 0) + ',' + (110 + k * 80 | 0) + ',' + (108 + k * 60 | 0) + ',0.62)');
        v.addColorStop(1, 'rgba(' + (40 + k * 90 | 0) + ',' + (78 + k * 70 | 0) + ',' + (80 + k * 50 | 0) + ',0.52)');
        g.fillStyle = v; g.fillRect(U(x), V(y), R(cw), R(ch));
        for (let q = 0; q < 20; q++) {
          const lx = U(x) + rnd() * R(cw), ly = V(y) + rnd() * R(ch);
          g.strokeStyle = 'rgba(236,246,240,' + (0.05 + rnd() * 0.08).toFixed(3) + ')';
          g.lineWidth = 2 + rnd() * 3;
          g.beginPath(); g.moveTo(lx, ly); g.lineTo(lx + 40 + rnd() * 90, ly); g.stroke();
        }
        /* kenarda kristal kabuğu: kuruyan havuzun beyaz halkası */
        g.strokeStyle = 'rgba(255,252,236,0.24)'; g.lineWidth = 16;
        g.strokeRect(U(x + 0.012), V(y + 0.012), R(cw - 0.024), R(ch - 0.024));
        g.restore();
        /* SET: havuzları ayıran alçak toprak sırt */
        g.strokeStyle = 'rgba(120,112,90,0.44)'; g.lineWidth = 18;
        g.strokeRect(U(x + 0.006), V(y + 0.006), R(cw - 0.012), R(ch - 0.012));
        g.strokeStyle = 'rgba(238,230,200,0.14)'; g.lineWidth = 6;
        g.strokeRect(U(x + 0.004), V(y + 0.004), R(cw - 0.012), R(ch - 0.012));
      }
    }
    /* GEMİ: gövdenin altında kum yığılması + moloz kuyruğu */
    K.rubble(L7.ship[0], L7.ship[1], 0.105, 26, { stone: 'rgba(120,96,64,0.30)', dust: 'rgba(196,186,156,0.20)' });
    g.save();
    g.translate(U(L7.ship[0]), V(L7.ship[1])); g.rotate(-0.42);
    const sv = g.createLinearGradient(0, -R(0.09), 0, R(0.09));
    sv.addColorStop(0, 'rgba(214,204,176,0.20)'); sv.addColorStop(1, 'rgba(20,16,12,0.34)');
    g.fillStyle = sv;
    g.beginPath(); g.ellipse(0, 0, R(0.135), R(0.048), 0, 0, TAU); g.fill();
    g.restore();
    /* KURUMUŞ KAYNAK: kabuklu halkalar */
    K.pit(L7.spring[0], L7.spring[1], 0.070, { core: 'rgba(30,28,20,0.80)', rim: 'rgba(240,232,204,0.20)' });
    K.engrave(L7.spring[0], L7.spring[1], 0.098, 4, { col: 'rgba(248,242,216,0.10)', w: 12 });
    /* TUZ SÜTUNU TARLASI: zeminde tuz birikintisi lekeleri */
    const PL = L7.pillars;
    for (let i = 0; i < 26; i++) {
      const x = PL.x0 + rnd() * (PL.x1 - PL.x0), y = PL.y0 + rnd() * (PL.y1 - PL.y0);
      E.soft(U(x), V(y), R(0.020 + rnd() * 0.024), 'rgba(255,252,236,0.10)');
    }
    K.core(0.5, 0.500, 0.140, { shard: 'rgba(180,172,146,0.24)' });
    K.wear(34);
    K.haze(8, { col: 'rgba(240,234,210,0.05)' });
  },
  props(A) {
    /* v49: kervan izi AKASYA ALEYİ (iz boyunca bir yanda akasya, öbür yanda
       kandil), karaya oturmuş geminin yerinde kervan durağı (kazan + yük
       küpleri + iki akasya), tuz havuzlarının kıyısında tuz çalısı sırası,
       sütun tarlası 3×3, kaynakta tuz sütunu halkası. Gemi, iskele,
       duvar, yığın, kayık, dikilitaş kalktı. */
    const P7 = L7.pans, cw = (P7.x1 - P7.x0) / P7.c, ch = (P7.y1 - P7.y0) / P7.r;
    const S = ['kristal', 'tas', 'ot'];
    A.path(L7.track, 0.026);
    A.area(L7.spring[0], L7.spring[1], 0.048);
    let i0 = A.mark();
    A.add('kazan', L7.ship[0], L7.ship[1]);
    A.add('kupa', L7.ship[0] - 0.036, L7.ship[1] + 0.040);
    A.add('kupa', L7.ship[0] + 0.004, L7.ship[1] + 0.056);
    A.add('fener', L7.ship[0] + 0.060, L7.ship[1] - 0.040);
    A.add('agac', L7.ship[0] - 0.070, L7.ship[1] - 0.040);
    A.add('agac', L7.ship[0] + 0.080, L7.ship[1] + 0.050);
    A.dressFrom(i0, S, 3);
    i0 = A.mark();
    A.line('fidan', P7.x0 + 0.010, P7.y0 - 0.020, P7.x1 - 0.010, P7.y0 - 0.020, 4, { exact: true });
    A.line('fidan', P7.x0 + 0.010, P7.y1 + 0.030, P7.x1 - 0.010, P7.y1 + 0.030, 4, { exact: true, skip: [1] });
    A.add('fener', P7.x0 - 0.024, P7.y0 + ch * 1.5);
    A.add('kazan', P7.x0 + cw * 1.5, P7.y1 + 0.060);
    A.dressFrom(i0, S, 2);
    A.fx('toz', P7.x0 + cw * 1.5, P7.y0 + ch * 1.5, { n: 8, r: 260, h: 60, col: [0.26, 0.26, 0.24] });
    A.group(1, () => {
      const k0 = A.mark();
      A.grid('tuzsutun', L7.pillars.x0 + 0.04, L7.pillars.y0 + 0.02, L7.pillars.x1 - 0.04, L7.pillars.y1 - 0.02, 3, 3, { exact: true });
      A.dressFrom(k0, S, 3);
    });
    i0 = A.mark();
    A.ringN('tuzsutun', L7.spring[0], L7.spring[1], 0.100, 5, { off: 0.3, exact: true });
    A.add('totem', L7.spring[0], L7.spring[1] + 0.112);
    A.dressFrom(i0, S, 3);
    i0 = A.mark();
    A.wayside('agac', L7.track, 4, 0.048, { side: 1 });
    A.wayside('fener', L7.track, 3, 0.040, { side: -1 });
    A.dressFrom(i0, S, 2);
    A.verge(['tas', 'ot'], L7.track, 14, 0.040);
    A.group(2, () => { const k0 = A.mark(); A.add('kupa', 0.560, 0.600); A.add('kupa', 0.585, 0.585); A.add('fidan', 0.530, 0.632, { exact: true }); A.dressFrom(k0, S, 3); });
    A.edge(['tuzsutun', 'fidan'], { pri: 3, step: 0.3, skip: 0.4, dress: S });
    A.cover(['kristal', 'tas', 'ot', 'kristal'], { calm: ['tas'] });
  },
};

/* ═══════════════════════════════════════════════════════════
   8 · DONMUŞ GÖL — GÖL + KUZEY KIYISI
   Harita iki YER: kuzeyde karlı kıyı şeridi (balıkçı köyü, çam ormanı,
   kızaklar) ve güneyde donmuş göl yüzeyi (dev buz plakaları, basınç
   sırtları, açık su yarığı). Kıyı çizgisi bir YAY — dümdüz bir çizgi
   "harita ikiye bölünmüş" okunur, yay "burası bir göl" okunur.
   ═══════════════════════════════════════════════════════════ */
const L8 = {
  shore: [[0.000, 0.300], [0.250, 0.352], [0.500, 0.378], [0.750, 0.340], [1.000, 0.282]],
  village: [[0.170, 0.185], [0.330, 0.150], [0.560, 0.175], [0.760, 0.145]],
  ridges: [
    [[0.060, 0.560], [0.300, 0.600], [0.520, 0.580], [0.760, 0.620], [0.960, 0.590]],
    [[0.180, 0.860], [0.400, 0.900], [0.640, 0.870], [0.880, 0.910]],
  ],
  lead: [[0.020, 0.740], [0.280, 0.762], [0.520, 0.748], [0.780, 0.770], [0.980, 0.752]],
  wreck: [0.720, 0.630], holes: [[0.300, 0.470], [0.520, 0.500], [0.680, 0.455], [0.420, 0.560]],
  nests: [[0.130, 0.640], [0.880, 0.480], [0.500, 0.930]],
};

const buzul = {
  surf: 'buz', sat: 0.88, night: 0.37, edge: edgeIce, nests: L8.nests,
  floor(g, E, Q, K) {
    const { U, V, R, rnd } = E;
    K.base(2200, 240);
    /* GÖL: kıyı yayının GÜNEYİ. Dev buz plakaları yalnız burada. */
    const lake = () => {
      g.beginPath();
      g.moveTo(U(0), V(L8.shore[0][1]));
      for (let i = 1; i < L8.shore.length; i++) {
        const p = L8.shore[i], pv = L8.shore[i - 1];
        const mx = (p[0] + pv[0]) / 2, my = (p[1] + pv[1]) / 2;
        g.quadraticCurveTo(U(pv[0]), V(pv[1]), U(mx), V(my));
      }
      g.lineTo(U(1), V(L8.shore[4][1]));
      g.lineTo(U(1), V(1)); g.lineTo(U(0), V(1));
      g.closePath();
    };
    g.save(); lake(); g.clip();
    /* buzun altındaki koyu su: plakalardan ÖNCE, yoksa plakalar
       "beyaz fayans" okunur */
    const v = g.createLinearGradient(0, V(0.32), 0, V(1));
    v.addColorStop(0, 'rgba(16,44,60,0.30)');
    v.addColorStop(0.6, 'rgba(10,32,46,0.44)');
    v.addColorStop(1, 'rgba(8,24,36,0.54)');
    g.fillStyle = v; g.fillRect(E.x0, E.y0, E.P, E.P);
    K.plates(-0.02, 0.28, 1.02, 1.02, 0.090, {
      stone: [84, 102, 116], jitter: 0.22,
      ridge: 'rgba(236,250,255,0.13)', ridgeW: 6, joint: 'rgba(10,26,36,0.40)',
      clip: () => { lake(); g.clip(); },
    });
    g.restore();
    /* KIYI: karlı bant — açık, yumuşak, plakasız */
    g.save();
    g.beginPath();
    g.moveTo(U(0), V(0)); g.lineTo(U(1), V(0));
    g.lineTo(U(1), V(L8.shore[4][1]));
    for (let i = L8.shore.length - 1; i > 0; i--) {
      const p = L8.shore[i], pv = L8.shore[i - 1];
      const mx = (p[0] + pv[0]) / 2, my = (p[1] + pv[1]) / 2;
      g.quadraticCurveTo(U(p[0]), V(p[1]), U(mx), V(my));
    }
    g.lineTo(U(0), V(L8.shore[0][1]));
    g.closePath(); g.clip();
    g.fillStyle = 'rgba(196,214,226,0.11)'; g.fillRect(E.x0, E.y0, E.P, E.P);
    for (let i = 0; i < 60; i++) {
      E.soft(E.x0 + rnd() * E.P, E.y0 + rnd() * E.P * 0.4, R(0.03 + rnd() * 0.06), 'rgba(255,255,255,0.05)');
    }
    g.restore();
    /* KIYI ÇİZGİSİ: kar birikmesi + koyu su kenarı */
    K.scarp(L8.shore, { drop: 0.014, crest: 'rgba(255,255,255,0.26)', face: 'rgba(30,56,72,0.44)', shadow: 'rgba(8,20,30,0.40)' });
    /* KÖY YOLU: kıyı boyunca ezilmiş kar */
    K.road([[0.060, 0.230], [0.300, 0.200], [0.560, 0.225], [0.820, 0.190], [0.960, 0.215]], 0.024,
      { fill: 'rgba(120,132,140,0.44)', lite: 'rgba(226,240,250,0.20)', edge: 'rgba(20,32,40,0.34)' });
    /* iskeleden göle inen yol: köyün gölle bağı */
    K.road([[0.400, 0.210], [0.420, 0.320], [0.440, 0.430]], 0.020,
      { fill: 'rgba(120,132,140,0.40)', lite: 'rgba(226,240,250,0.16)', edge: 'rgba(20,32,40,0.30)' });
    /* BASINÇ SIRTLARI: buzun kırılıp yukarı itildiği hatlar */
    for (let i = 0; i < L8.ridges.length; i++) {
      K.scarp(L8.ridges[i], { drop: 0.020, crest: 'rgba(244,254,255,0.30)', face: 'rgba(150,190,214,0.24)', shadow: 'rgba(8,22,32,0.44)' });
    }
    /* AÇIK SU YARIĞI: buzun tamamen açıldığı koyu şerit */
    K.fissure(L8.lead, 0.026, { dark: 'rgba(6,20,30,0.90)', lip: 'rgba(226,244,255,0.24)', glow: 'rgba(120,200,255,1)' });
    /* BUZ DELİKLERİ: balık avı — küçük koyu daireler + kar sırtı */
    for (let i = 0; i < L8.holes.length; i++) {
      const h = L8.holes[i];
      K.pit(h[0], h[1], 0.022, { core: 'rgba(6,20,30,0.90)', rim: 'rgba(240,252,255,0.24)' });
    }
    /* ENKAZ: buza donmuş gövde */
    K.rubble(L8.wreck[0], L8.wreck[1], 0.086, 20, { stone: 'rgba(96,84,64,0.30)', dust: 'rgba(200,224,238,0.16)' });
    K.core(0.5, 0.620, 0.140, { shard: 'rgba(190,216,230,0.22)' });
    K.wear(30, 0.10, 0.30);
    K.haze(10, { col: 'rgba(214,240,255,0.06)' });
  },
  props(A) {
    /* v49: köy yolu boyunca KÖKNAR ALEYİ, üç kamp (kazan + fıçı + kandil,
       iki köknar rüzgârlık), kıyıda ikili/üçlü köknar kümeleri, basınç
       sırtında üçlü buz kristali, delik başlarında balıkçı kampı. Ev,
       kızak, gemi, iskele, kayık, buz dikeni kalktı. */
    const VROAD = [[0.060, 0.230], [0.300, 0.200], [0.560, 0.225], [0.820, 0.190], [0.960, 0.215]];
    const PIER = [[0.400, 0.210], [0.420, 0.320], [0.440, 0.430]];
    const SN = ['kar', 'kar', 'ot', 'tas'], IC = ['kristal', 'kar', 'tas'];
    A.path(VROAD, 0.020);
    A.path(PIER, 0.018);
    let i0 = A.mark();
    A.add('kazan', L8.wreck[0], L8.wreck[1]);
    A.ringN('tuzsutun', L8.wreck[0], L8.wreck[1], 0.070, 4, { off: 0.4, exact: true });
    A.dressFrom(i0, IC, 4);
    for (const u of [0.170, 0.470, 0.790]) {
      i0 = A.mark();
      A.add('kazan', u, 0.140);
      A.add('kupa', u + 0.040, 0.150);
      A.add('fener', u - 0.040, 0.160);
      A.add('fidan', u - 0.050, 0.110, { exact: true }); A.add('fidan', u + 0.050, 0.110, { exact: true });
      A.dressFrom(i0, SN, 3);
    }
    A.group(1, () => { const k0 = A.mark(); A.wayside('agac', VROAD, 5, 0.050, { side: 1 }); A.dressFrom(k0, SN, 2); });
    A.verge(['kar', 'tas'], VROAD, 16, 0.030);
    const PN = [[0.06, 0.07], [0.25, 0.06], [0.62, 0.07], [0.90, 0.07], [0.08, 0.34], [0.30, 0.32], [0.66, 0.32], [0.93, 0.31]];
    for (let q = 0; q < PN.length; q++) {
      A.group(q < 4 ? 1 : 2, () => {
        const k0 = A.mark(), n = 2 + (q % 2);
        for (let t = 0; t < n; t++) { const a = t * 2.094 + q; A.add(t ? 'fidan' : 'agac', PN[q][0] + Math.cos(a) * 0.022, PN[q][1] + Math.sin(a) * 0.020, { exact: true }); }
        A.dressFrom(k0, SN, 3);
      });
    }
    const ridge = (p, pri) => {
      for (const q of [0, 2]) {
        A.group(pri, () => {
          const k0 = A.mark(), a = p[q], b = p[q + 1];
          for (let t = 0; t < 3; t++) { const f = 0.35 + t * 0.15; A.add('tuzsutun', a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, { exact: true }); }
          A.dressFrom(k0, IC, 3);
        });
      }
    };
    ridge(L8.ridges[0], 0);
    ridge(L8.ridges[1], 1);
    for (let i = 0; i < L8.holes.length; i++) {
      const h = L8.holes[i];
      A.area(h[0], h[1], 0.026);
      A.group(i < 2 ? 0 : 1, () => {
        const k0 = A.mark();
        A.add('kupa', h[0] + 0.044, h[1] + 0.026);
        if (i % 2 === 0) A.add('fener', h[0] - 0.034, h[1] - 0.034);
        A.dressFrom(k0, SN, 3);
      });
    }
    A.edge(['agac', 'fidan'], { pri: 3, step: 0.3, skip: 0.45, sides: [1, 2, 3], dress: SN });
    A.fx('toz', 0.5, 0.62, { n: 10, r: 700, h: 120, col: [0.16, 0.2, 0.24] });
    A.cover(['kar', 'kristal', 'tas', 'kar'], { calm: ['kar', 'tas'] });
  },
};

/* ═══════════════════════════════════════════════════════════
   9 · KEMİK BAHÇESİ — KABURGA KORİDORU
   Yarı gömülü kolosal bir iskelet. Kuzeybatıdan güneydoğuya uzanan
   OMURGA bir geçit; iki yanında kaburgalar kemer kemer yükselir ve bir
   revak oluşturur. Güneydoğuda kafatası höyüğü. Kuzeydoğuda kemik unu
   tarlası (burada gerçekten ÇİFTÇİLİK yapılıyor), güneybatıda harman
   yeri. Merkez iki kaburga çiftinin arası — açık.
   ═══════════════════════════════════════════════════════════ */
const L9 = {
  spine: [[0.130, 0.150], [0.300, 0.310], [0.480, 0.470], [0.660, 0.640], [0.850, 0.855]],
  /* KABURGA ADEDİ TEK YERDE: `floor()` kemer GÖLGESİNİ, `props()` kemerin
     KENDİSİNİ bu sayıdan üretir. 7 → 5 (seyreltme) yapılırken props tarafta
     yerel bir sabit yazılsaydı iki gölge kemersiz kalırdı — zeminde duran
     ama üstünde hiçbir şey olmayan gölge, "nesne kayboldu" okunur. */
  ribs: 5, skull: [0.868, 0.880], pelvis: [0.118, 0.132],
  field: { x0: 0.620, y0: 0.130, x1: 0.930, y1: 0.400 },
  threshing: [0.220, 0.720],
  nests: [[0.420, 0.180], [0.880, 0.560], [0.180, 0.900]],
};

const kemikbahce = {
  surf: 'kemik', sat: 0.86, night: 0.20, edge: edgeRib, nests: L9.nests,
  floor(g, E, Q, K) {
    const { U, V, R, rnd } = E;
    K.base(2600, 230);
    /* OMURGA GEÇİDİ: yol + üstünde omur segmentleri (açık plakalar) */
    K.road(L9.spine, 0.040, { fill: 'rgba(96,88,70,0.56)', lite: 'rgba(214,204,172,0.22)' });
    const seg = 26;
    for (let i = 0; i <= seg; i++) {
      const t = i / seg;
      const p = splineAt(L9.spine, t);
      const a = splineAng(L9.spine, t);
      g.save();
      g.translate(U(p[0]), V(p[1])); g.rotate(a);
      g.fillStyle = 'rgba(20,18,14,0.40)';
      g.fillRect(-R(0.011), -R(0.020), R(0.022), R(0.040));
      g.fillStyle = 'rgba(206,196,166,0.30)';
      g.fillRect(-R(0.009), -R(0.018), R(0.018), R(0.036));
      g.fillStyle = 'rgba(240,232,204,0.16)';
      g.fillRect(-R(0.009), -R(0.018), R(0.018), R(0.008));
      g.restore();
    }
    /* KABURGA GÖLGELERİ: kemerlerin zemine düşen izi. Kaburga
       nesneleri bunun üstüne oturur (görsel = çarpışma). */
    for (let i = 0; i < L9.ribs; i++) {
      const t = 0.12 + i * (0.76 / (L9.ribs - 1));
      const p = splineAt(L9.spine, t);
      const a = splineAng(L9.spine, t);
      for (const s of [1, -1]) {
        const nx = -Math.sin(a) * s, ny = Math.cos(a) * s;
        g.save();
        g.strokeStyle = 'rgba(10,10,8,0.30)'; g.lineWidth = 26; g.lineCap = 'round';
        g.beginPath();
        g.moveTo(U(p[0] + nx * 0.030), V(p[1] + ny * 0.030));
        g.quadraticCurveTo(U(p[0] + nx * 0.130), V(p[1] + ny * 0.100),
          U(p[0] + nx * 0.190), V(p[1] + ny * 0.180));
        g.stroke();
        g.restore();
      }
    }
    /* KAFATASI HÖYÜĞÜ: toprak yığını + göz çukuru gölgeleri */
    const SK = L9.skull;
    K.rubble(SK[0], SK[1], 0.120, 30, { stone: 'rgba(214,204,172,0.26)', dust: 'rgba(150,142,116,0.24)' });
    K.engrave(SK[0], SK[1], 0.095, 3, { col: 'rgba(20,18,14,0.20)', w: 14 });
    /* PELVİS KAPISI: kuzeybatı girişi */
    K.cobble(L9.pelvis[0] + 0.030, L9.pelvis[1] + 0.030, 0.056, { cell: 0.0125 });
    /* KEMİK UNU TARLASI: tırmıklanmış sıralar (gerçek tarla) */
    const F = L9.field;
    for (let r = 0; r < 6; r++) {
      const t = r / 5;
      const bend = Math.sin(t * 3.14) * 0.020;
      K.furrow(F.x0 + bend, F.y0 + t * (F.y1 - F.y0), (F.x1 - F.x0) - bend * 1.3, 0.034,
        (t - 0.5) * 0.06, { bed: 'rgba(58,54,44,0.62)', ridge: 'rgba(200,190,158,0.20)', clod: 'rgba(226,218,188,0.22)' });
    }
    /* HARMAN YERİ: dövülmüş toprak dairesi + öğütme izleri */
    K.cobble(L9.threshing[0], L9.threshing[1], 0.096,
      { cell: 0.0130, base: 'rgba(62,56,44,0.92)', stone: [140, 132, 106] });
    K.engrave(L9.threshing[0], L9.threshing[1], 0.078, 4, { col: 'rgba(226,216,186,0.10)', w: 8 });
    K.rays(L9.threshing[0], L9.threshing[1], 0.020, 0.070, 10, { w: 5, col: 'rgba(24,22,17,0.22)' });
    K.core(0.5, 0.480, 0.140, { shard: 'rgba(220,210,178,0.24)' });
    K.wear(40);
    K.haze(9, { col: 'rgba(240,232,200,0.05)' });
  },
  props(A) {
    /* v49: omurga yolu KEMİK AĞACI ALEYİ (kaburga çiftlerinin yerinde,
       karşılıklı), kafatası höyüğünde kaburga filizi yayı, eşik kapısında
       kandil çifti, tarlanın köşelerinde kandil, harman yerinde altılı
       filiz halkası + totem. Kaburga, kemer, çit, duvar kalktı. */
    const BN = ['kemikP', 'ot', 'tas'], RIT = ['mum', 'kemikP', 'mantar'];
    A.path(L9.spine, 0.028);
    A.area(L9.threshing[0], L9.threshing[1], 0.054);
    A.area(L9.pelvis[0] + 0.042, L9.pelvis[1] + 0.042, 0.034);
    let i0 = A.mark();
    const RB = L9.ribs;
    for (let i = 0; i < RB; i++) {
      const t = 0.12 + i * (0.76 / (RB - 1));
      const p = splineAt(L9.spine, t), a = splineAng(L9.spine, t);
      for (const s of [1, -1]) {
        const nx = -Math.sin(a) * s, ny = Math.cos(a) * s;
        A.add(i % 2 ? 'fidan' : 'agac', p[0] + nx * 0.064, p[1] + ny * 0.060, { exact: true });
      }
    }
    A.dressFrom(i0, BN, 3);
    i0 = A.mark();
    A.add('kafatasi', L9.skull[0], L9.skull[1], { onPath: true });
    A.ringN('fidan', L9.skull[0], L9.skull[1], 0.138, 5, { skip: (a) => Math.cos(a) > 0.3 || Math.sin(a) > 0.5, exact: true });
    A.dressFrom(i0, RIT, 4);
    A.fx('atesbocegi', L9.skull[0], L9.skull[1], { n: 6, r: 140, h: 90, col: [0.46, 0.42, 0.24] });
    i0 = A.mark();
    A.add('fener', L9.pelvis[0] + 0.066, L9.pelvis[1] + 0.010);
    A.add('fener', L9.pelvis[0] + 0.010, L9.pelvis[1] + 0.066);
    A.dressFrom(i0, BN, 3);
    i0 = A.mark();
    for (const [u, v] of [[0.700, 0.200], [0.860, 0.200], [0.700, 0.320], [0.860, 0.320]]) A.add('fener', u, v, { exact: true });
    A.add('kazan', L9.field.x0 + 0.026, L9.field.y1 + 0.046);
    A.dressFrom(i0, BN, 2);
    for (let r = 0; r < 3; r++) for (let c = 0; c < 5; c++) A.decor(['kemikP', 'ot'], 0.715 + c * 0.032, 0.228 + r * 0.034);
    i0 = A.mark();
    A.ringN('fidan', L9.threshing[0], L9.threshing[1], 0.118, 6, { exact: true });
    A.add('totem', L9.threshing[0], L9.threshing[1] - 0.064);
    A.add('kupa', L9.threshing[0] - 0.056, L9.threshing[1] + 0.060);
    A.dressFrom(i0, RIT, 3);
    for (const [u, v] of [[0.300, 0.520], [0.660, 0.360], [0.460, 0.860]]) {
      A.group(2, () => {
        const k0 = A.mark();
        A.add('kemik', u, v); A.add('kemik', u + 0.028, v + 0.015); A.add('kupa', u - 0.022, v + 0.022);
        A.dressFrom(k0, BN, 3);
      });
    }
    A.edge(['fidan', 'agac'], { pri: 3, step: 0.3, skip: 0.4, dress: BN });
    A.cover(['kemikP', 'ot', 'tas', 'mantar'], { calm: ['kemikP', 'tas'] });
  },
};

/* ═══════════════════════════════════════════════════════════
   10 · GÖK ÇARKI — ÇARKIN KENDİSİ
   Harita bir MEKANİZMA: göbekte yıldız kadranı, sekiz ışınsal kol,
   dıştan jant yolu, dört ana kolun ucunda yıldız kapısı. Üstünden
   usturlap halkaları geçer. Kollar arasındaki bölmeler bazalt sütun
   tarlası (yüzey onu veriyor) — yani boşluk da desenin parçası.
   ═══════════════════════════════════════════════════════════ */
const L10 = {
  hub: 0.140, rim: 0.420, spokes: 8,
  gates: [0, 2, 4, 6],
  orrery: [[0.5, 0.5, 0.470, 0.240, -0.5], [0.5, 0.5, 0.360, 0.150, 0.9], [0.5, 0.5, 0.250, 0.420, 2.1]],
  nests: [[0.500, 0.860], [0.140, 0.300], [0.860, 0.320]],
};

const gokcark = {
  surf: 'bazalt', sat: 0.90, night: 0.30, edge: edgeBasalt, nests: L10.nests,
  floor(g, E, Q, K) {
    const { U, V, R, rnd } = E;
    K.base(2400, 200);
    /* JANT YOLU + kollar: mekanizmanın iskeleti */
    K.ring(0.5, 0.5, L10.rim, 0.030, { lite: 'rgba(180,190,230,0.22)' });
    K.ring(0.5, 0.5, L10.rim + 0.026, 0.008, { fill: 'rgba(120,124,150,0.34)', lite: 'rgba(0,0,0,0)', edge: 'rgba(10,11,16,0.30)' });
    for (let i = 0; i < L10.spokes; i++) {
      const a = (i / L10.spokes) * TAU;
      K.spoke(0.5, 0.5, L10.hub, L10.rim + 0.030, a, 0.034, { lite: 'rgba(176,186,226,0.20)' });
      /* DİŞ: kolun iki yanında çıkıntılar — kol "yol" değil "kol" olur */
      const nx = -Math.sin(a), ny = Math.cos(a);
      for (let q = 0; q < 7; q++) {
        const r = L10.hub + 0.030 + q * 0.040;
        for (const s of [1, -1]) {
          const x = U(0.5 + Math.cos(a) * r + nx * 0.024 * s);
          const y = V(0.5 + Math.sin(a) * r + ny * 0.024 * s);
          g.save();
          g.translate(x, y); g.rotate(a);
          g.fillStyle = 'rgba(12,13,18,0.42)';
          g.fillRect(-R(0.008), -R(0.009), R(0.016), R(0.018));
          g.fillStyle = 'rgba(150,156,190,0.26)';
          g.fillRect(-R(0.007), -R(0.008), R(0.014), R(0.016));
          g.restore();
        }
      }
    }
    /* GÖBEK KADRANI: bronz disk + yıldız haritası. Merkez SAKİN kalır
       (hacim yok), ama desen zengin — göbek "boş duvar" okunmasın. */
    K.cobble(0.5, 0.5, L10.hub, { cell: 0.0100, base: 'rgba(48,48,60,0.95)', stone: [102, 98, 116] });
    K.engrave(0.5, 0.5, L10.hub * 0.86, 4, { col: 'rgba(214,220,255,0.13)', w: 6 });
    K.rays(0.5, 0.5, 0.028, L10.hub * 0.92, 24, { w: 4, col: 'rgba(214,220,255,0.10)' });
    K.rays(0.5, 0.5, 0.050, L10.hub * 0.94, 8, { w: 9, col: 'rgba(232,220,180,0.13)', off: 0.3927 });
    /* yıldızlar: kadranın üstünde tek tek nokta ışıkları */
    for (let i = 0; i < 60; i++) {
      const a = rnd() * TAU, rr = R(L10.hub) * Math.sqrt(rnd()) * 0.92;
      const x = U(0.5) + Math.cos(a) * rr, y = V(0.5) + Math.sin(a) * rr;
      const s = 2 + rnd() * 5;
      g.fillStyle = 'rgba(240,236,255,' + (0.10 + rnd() * 0.22).toFixed(3) + ')';
      g.beginPath(); g.arc(x, y, s, 0, TAU); g.fill();
    }
    /* USTURLAP HALKALARI: eğik elipsler — tüm haritayı kuşatır */
    for (let i = 0; i < L10.orrery.length; i++) {
      const o = L10.orrery[i];
      g.save();
      g.translate(U(o[0]), V(o[1])); g.rotate(o[4]);
      for (let pass = 0; pass < 2; pass++) {
        g.strokeStyle = pass ? 'rgba(10,11,16,0.34)' : 'rgba(196,204,246,0.16)';
        g.lineWidth = pass ? 7 : 16;
        g.beginPath(); g.ellipse(0, 0, R(o[2]), R(o[3]), 0, 0, TAU); g.stroke();
      }
      g.restore();
    }
    /* KAPI SAHANLIKLARI: dört ana kolun ucunda */
    for (let i = 0; i < L10.gates.length; i++) {
      const a = (L10.gates[i] / L10.spokes) * TAU;
      const x = 0.5 + Math.cos(a) * (L10.rim + 0.012), y = 0.5 + Math.sin(a) * (L10.rim + 0.012);
      K.cobble(x, y, 0.058, { cell: 0.0110, base: 'rgba(52,54,66,0.92)', stone: [116, 118, 142] });
      K.rays(x, y, 0.010, 0.046, 8, { w: 4, col: 'rgba(214,220,255,0.12)' });
    }
    /* BÖLMELER: kollar arasında kırık plaka lekeleri */
    for (let i = 0; i < L10.spokes; i++) {
      const a = ((i + 0.5) / L10.spokes) * TAU;
      K.rubble(0.5 + Math.cos(a) * 0.290, 0.5 + Math.sin(a) * 0.290, 0.062, 16,
        { stone: 'rgba(150,154,186,0.24)', dust: 'rgba(120,126,160,0.14)' });
    }
    K.core(0.5, 0.5, 0.116, { shard: 'rgba(150,156,190,0.22)' });
    K.wear(30, 0.16, 0.44);
    K.haze(9, { col: 'rgba(196,204,255,0.055)' });
  },
  props(A) {
    /* v49: çark planı — kapılarda kandil çifti, bölmelerde dönüşümlü İKİ
       sahne (dişli atölyesi: dişli + kapsül + yıldız filizi · pirinç
       bahçe: saat ağacı + levha + kazan), göbekte sekiz ağaç/filiz halkası,
       çeperin dışında dört saat ağacı. Kemer, halka, dikilitaş, sütun kalktı. */
    const GR = ['disliP', 'tas', 'kristal'];
    A.ringPath(0.5, 0.5, L10.rim, 0.022);
    for (let i = 0; i < L10.spokes; i++) A.spokePath(0.5, 0.5, L10.hub, L10.rim + 0.032, (i / L10.spokes) * TAU, 0.024);
    A.area(0.5, 0.5, L10.hub * 0.94);
    let i0 = A.mark();
    for (let i = 0; i < L10.gates.length; i++) {
      const a = (L10.gates[i] / L10.spokes) * TAU, r = L10.rim + 0.012;
      const nx = -Math.sin(a), ny = Math.cos(a);
      A.add('fener', 0.5 + Math.cos(a) * (r - 0.034) + nx * 0.042, 0.5 + Math.sin(a) * (r - 0.034) + ny * 0.042, { exact: true, onPath: true });
      A.add('fener', 0.5 + Math.cos(a) * (r - 0.034) - nx * 0.042, 0.5 + Math.sin(a) * (r - 0.034) - ny * 0.042, { exact: true, onPath: true });
    }
    A.dressFrom(i0, GR, 2);
    for (let i = 0; i < L10.spokes; i++) {
      const a = ((i + 0.5) / L10.spokes) * TAU;
      const at = (r) => [0.5 + Math.cos(a) * r, 0.5 + Math.sin(a) * r];
      A.group(i % 2 ? 1 : 0, () => {
        const k0 = A.mark();
        if (i % 2) {
          const p = at(0.260); A.add('disli', p[0], p[1], { rot: a });
          const q = at(0.340); A.add('fidan', q[0], q[1], { exact: true });
          const s = at(0.200); A.add('kupa', s[0], s[1]);
        } else {
          const p = at(0.300); A.add('agac', p[0], p[1], { exact: true });
          const q = at(0.225); A.add('kazan', q[0], q[1]);
          const s = at(0.360); A.add('plaka', s[0], s[1], { rot: a });
        }
        A.dressFrom(k0, GR, 3);
        const c2 = at(0.280); A.patch(GR, c2[0], c2[1], 0.04, 6);
        A.fx('toz', c2[0], c2[1], { n: 2, r: 80, h: 90, col: [0.22, 0.18, 0.3] });
      });
    }
    i0 = A.mark();
    A.ringN(['agac', 'fidan'], 0.5, 0.5, L10.hub + 0.034, 8, { off: 0.3927, exact: true });
    A.dressFrom(i0, GR, 2);
    A.group(2, () => { const k0 = A.mark(); A.ringN('agac', 0.5, 0.5, L10.rim + 0.056, 4, { off: 0.7854, exact: true }); A.dressFrom(k0, GR, 3); });
    A.edge(['disli', 'fidan'], { pri: 3, step: 0.34, skip: 0.45, dress: GR });
    A.cover(['disliP', 'tas', 'kristal'], { calm: ['disliP', 'tas'] });
  },
};

/* ── omurga eğrisi: yol boyacısıyla AYNI eğriyi örnekler ─────
   Kaburgaların yolun tam üstüne oturmasının tek yolu aynı fonksiyonu
   okumaktır; ayrı bir yaklaşım yazılsaydı kemerler yoldan kayardı. */
function splineAt(pts, t) {
  const n = pts.length - 1;
  const f = Math.min(n - 0.0001, t * n);
  const i = Math.floor(f), u = f - i;
  const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[Math.min(n, i + 1)], p3 = pts[Math.min(n, i + 2)];
  const c = (a, b, cc, d) => 0.5 * ((2 * b) + (-a + cc) * u + (2 * a - 5 * b + 4 * cc - d) * u * u + (-a + 3 * b - 3 * cc + d) * u * u * u);
  return [c(p0[0], p1[0], p2[0], p3[0]), c(p0[1], p1[1], p2[1], p3[1])];
}
function splineAng(pts, t) {
  const a = splineAt(pts, Math.max(0, t - 0.01)), b = splineAt(pts, Math.min(1, t + 0.01));
  return Math.atan2(b[1] - a[1], b[0] - a[0]);
}

export const PLANS = { mezarlik, kul, bataklik, katedral, hiclik, gokada, tuzla, buzul, kemikbahce, gokcark };
