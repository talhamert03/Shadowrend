/* ═══════════════════════════════════════════════════════════
   arenaMaps.js — SAVAŞ ALANI HARİTALARI (montaj + palet + dizilim)

   Bu dosya artık HARİTA ÇİZMİYOR. Üç iş yapar:
     ① harita tablosu ve dünya eşlemesi,
     ② on palet (renk kimliği — ölçülmüş bantta),
     ③ dizilim yardımcıları (`A`) + pişirme sözleşmesi.
   Kompozisyon `arenaPlan.js`te, malzeme `arenaPaint.js`te, yüzey
   `arenaSurf.js`te.

   NEDEN BÖLÜNDÜ (2026-08-25): tek `makeMap()` on haritayı aynı yedi
   tesisle boyuyordu — on harita tek bir yerin on paletiydi. Ayrım
   kodu değil TASARIMI çoğaltmak için: ortak malzeme tek yerde kalır
   (o dosyaların geçmişindeki her ders orada yaşıyor), ama "burası
   neresi" sorusunun cevabı her harita için ayrı yazılır.

   İKİ SÖZLEŞME YAŞIYOR:
   1) bakeArenaMap(id, opts) → { macro, detail, detailMid, tile, props }
      Oyunun yolu. Çift katman: makro 2048² arenaya GERİLİR (0,48
      örnek/px — kompozisyon), detay 1024²/2048² DÖŞENİR (2,0-4,0
      örnek/px — malzeme). Zeminde tek materyalde çarpılır.
   2) paintArenaMap(id, opts) → tek tuval (tezgah + önizleme).
   ═══════════════════════════════════════════════════════════ */

import { PROP_TYPES } from './arenaProps.js?v=20260930m';
import { Quality } from './perf.js?v=20260930m';
import {
  TAU, env, denv, seedOf, grade, night, worldTint, closeOut, threshold, kit, paintPropBases,
} from './arenaPaint.js?v=20260930m';
import { SURF, tileGrid } from './arenaSurf.js?v=20260930m';
import { aiDetail } from './aiDetail.js?v=20260930m';
import { PLANS } from './arenaPlan.js?v=20260930m';

export const ARENA_MAPS = [
  { id: 'mezarlik', name: 'SOLGUN MEZARLIK', short: 'MEZAR', sub: 'Halka mezarlık, şapel, gölet',
    lore: 'Kutsanmış daireyi çit değil korku çevreliyor. Yol hâlâ şapele çıkıyor.' },
  { id: 'kul', name: 'KÜL ÇUKURLARI', short: 'KÜL', sub: 'Teraslı kömür ocağı',
    lore: 'Üç terası da ateş kazdı. En alttaki ocak hiç sönmedi.' },
  { id: 'bataklik', name: 'ZEHİR BATAKLIĞI', short: 'BATAK', sub: 'Takımada, ahşap iskele',
    lore: 'Adalar arasında yalnız iskele var. Kalasların altındaki şey bekliyor.' },
  { id: 'katedral', name: 'KAN KATEDRALİ', short: 'KATEDRAL', sub: 'Nef, transept, apsis',
    lore: 'Vitraydan süzülen ışık zemine kan rengiyle düşüyor. Sıralar hâlâ dizili.' },
  { id: 'hiclik', name: 'HİÇLİK TAHTI', short: 'HİÇLİK', sub: 'İç içe meydanlar, tören yolu',
    lore: 'Kare, dörtgen, kare. Yolun sonunda taht ve tahtta kimse yok.' },
  { id: 'gokada', name: 'RÜZGÂR BAHÇESİ', short: 'BAHÇE', sub: 'Üç lob, uçurum, köprü',
    lore: 'Ada üç parçaya ayrılmadan önce burada bahçe vardı. Teraslar duruyor.' },
  { id: 'tuzla', name: 'TUZ TABANI', short: 'TUZ', sub: 'Kervan izi, buharlaşma havuzları',
    lore: 'Göl çekildi, tuzla çalışmaya devam etti. Gemi olduğu yerde kaldı.' },
  { id: 'buzul', name: 'DONMUŞ GÖL', short: 'BUZUL', sub: 'Kuzey kıyısı, buz plakaları',
    lore: 'Köy kıyıda, av delikleri buzda. Yarık her gece biraz daha açılıyor.' },
  { id: 'kemikbahce', name: 'KEMİK BAHÇESİ', short: 'KEMİK', sub: 'Kaburga koridoru, kemik tarlası',
    lore: 'Omurga bir geçit oldu, kaburgalar revak. Tarlayı hâlâ birileri sürüyor.' },
  { id: 'gokcark', name: 'YILDIZ DÖKÜMHANESİ', short: 'DÖKÜM', sub: 'Göbek kadranı, sekiz kol',
    lore: 'Yıldızlar burada döküldü, kollar onları göğe taşıdı. Ocaklar hiç sönmedi.' },
];

export const MAP_IDS = ARENA_MAPS.map((m) => m.id);
export const mapDef = (id) => ARENA_MAPS.find((m) => m.id === id) || ARENA_MAPS[0];
/* Yüzey TEK yerde yaşar (plan dosyası). Tezgah onu buradan okur —
   tabloya ikinci bir kopya yazmak `waveDuration` tuzağının aynısı olurdu.
   "Düzen" kolonu kalktı: düzen artık haritanın KENDİSİ, ayrı bir arketip
   değil (on plan, on topoloji). */
export const mapSurf = (id) => (PLANS[id] || PLANS.mezarlik).surf;

/* ── DÜNYA → HARİTA: on dünya, on harita. Paylaşım YOK.
   (Önceki sürümde altı dünya beş haritayı paylaşıyordu; on harita
   yazıldıktan sonra paylaşmanın hiçbir gerekçesi kalmadı.) */
export const WORLD_MAPS = {
  1: 'mezarlik', 2: 'kul', 3: 'bataklik', 4: 'katedral', 5: 'hiclik',
  6: 'gokada', 7: 'tuzla', 8: 'buzul', 9: 'kemikbahce', 10: 'gokcark',
};
export const worldMapId = (worldId) => WORLD_MAPS[worldId] || 'mezarlik';

/* ═══════════════ PALETLER ═══════════════════════════════════
   PALET SÖZLEŞMESİ: zemin ORTALAMASI 26-52 bandında (koyu ama siyah
   değil), p95 < 150 (efekt 200+ ayrışsın), doygunluk < 0,40.
   "Canlı renk" isteği DEĞERİ değil KROMAYI büyütür.

   ÖLÇÜM DERSİ (2026-08-25): dizilim kodundaki bir değişiklik ZEMİN
   ÖLÇÜMÜNÜ de geçersiz kılar — props() ve floor() aynı rastgele akışı
   paylaşıyor, `add` sırası değişince zemin tonu havuzundan çekilen
   değerler de kayıyor. Sayı değiştiren her dokunuştan sonra ölç.
   ═════════════════════════════════════════════════════════════ */
const PAL = {
  mezarlik: {
    g0: '#2c4429',
    pool: ['rgba(74,104,54,0.34)', 'rgba(16,26,16,0.40)', 'rgba(56,92,66,0.26)', 'rgba(96,116,52,0.22)', 'rgba(38,64,44,0.30)'],
    brush0: 'rgba(78,106,54,0.30)', brush1: 'rgba(15,23,14,0.30)',
    road: '#5c4c33', roadLite: 'rgba(146,124,86,0.34)', roadEdge: 'rgba(30,34,22,0.42)',
    cobBase: '#3f4750', cobStone: [86, 96, 104],
    limeBase: '#4b4740', limeStone: [126, 118, 98], plateStone: [120, 126, 104],
    limeRim: 'rgba(180,168,132,0.20)', engrave: 'rgba(232,208,150,0.11)',
    blend0: 'rgba(44,68,41,0)', blend1: 'rgba(44,68,41,0.78)',
    water: ['#2a6a6e', '#17434a', '#0d2429'], waterLine: 'rgba(178,232,224,A)',
    shore: 'rgba(64,60,40,0.46)', reed0: 'rgba(126,142,72,0.42)', reed1: 'rgba(28,38,24,0.42)',
    plot: 'rgba(40,42,34,0.62)', slab: '#43423c',
    core0: 'rgba(78,66,44,0.40)', core1: 'rgba(66,58,40,0.22)',
    coreSpot0: 'rgba(96,102,62,0.19)', coreSpot1: 'rgba(14,17,12,0.23)',
    seal: 'rgba(226,208,150,0.05)', wear: 'rgba(70,62,44,0.22)',
    haze: 'rgba(176,190,180,0.05)', rim: 'rgba(206,222,186,0.34)', glow: 'rgba(255,120,96,1)',
    void: '#101610', wall: '#26261f', wallTop: 'rgba(170,176,150,0.20)', spike: '#1a1d20',
  },
  kul: {
    g0: '#2c2724',
    pool: ['rgba(100,76,58,0.32)', 'rgba(18,15,13,0.44)', 'rgba(84,70,58,0.28)', 'rgba(122,92,62,0.20)', 'rgba(48,40,34,0.32)'],
    brush0: 'rgba(110,78,52,0.30)', brush1: 'rgba(16,13,10,0.32)',
    road: '#4a3a2a', roadLite: 'rgba(168,118,64,0.32)', roadEdge: 'rgba(24,16,12,0.46)',
    cobBase: '#3c322c', cobStone: [104, 84, 70],
    limeBase: '#463830', limeStone: [132, 100, 74], plateStone: [116, 96, 78],
    limeRim: 'rgba(214,150,80,0.22)', engrave: 'rgba(255,170,90,0.13)',
    blend0: 'rgba(51,37,31,0)', blend1: 'rgba(51,37,31,0.78)',
    water: ['#8a3a16', '#4c1e0c', '#210c05'], waterLine: 'rgba(255,196,120,A)',
    shore: 'rgba(58,38,24,0.50)', reed0: 'rgba(190,110,48,0.38)', reed1: 'rgba(30,18,12,0.44)',
    plot: 'rgba(44,34,28,0.64)', slab: '#413630',
    core0: 'rgba(120,68,32,0.36)', core1: 'rgba(80,48,28,0.22)',
    coreSpot0: 'rgba(160,96,44,0.18)', coreSpot1: 'rgba(16,11,8,0.26)',
    seal: 'rgba(255,180,100,0.06)', wear: 'rgba(74,50,32,0.24)',
    haze: 'rgba(210,160,120,0.055)', rim: 'rgba(255,186,120,0.34)', glow: 'rgba(255,138,60,1)',
    void: '#150d0a', wall: '#2a2019', wallTop: 'rgba(190,150,110,0.20)', spike: '#1f1712',
  },
  bataklik: {
    g0: '#1e3a30',
    pool: ['rgba(58,120,88,0.32)', 'rgba(10,24,20,0.44)', 'rgba(96,140,70,0.24)', 'rgba(40,90,80,0.30)', 'rgba(24,52,44,0.32)'],
    brush0: 'rgba(62,124,86,0.30)', brush1: 'rgba(10,22,18,0.32)',
    road: '#4a4a30', roadLite: 'rgba(136,146,88,0.32)', roadEdge: 'rgba(16,28,22,0.46)',
    cobBase: '#33443e', cobStone: [78, 108, 96],
    limeBase: '#3a4a40', limeStone: [104, 130, 108], plateStone: [92, 118, 100],
    limeRim: 'rgba(140,214,168,0.22)', engrave: 'rgba(150,255,200,0.12)',
    blend0: 'rgba(30,58,48,0)', blend1: 'rgba(30,58,48,0.78)',
    water: ['#3aa06a', '#175040', '#0a2620'], waterLine: 'rgba(180,255,210,A)',
    shore: 'rgba(46,58,34,0.48)', reed0: 'rgba(140,180,80,0.42)', reed1: 'rgba(20,36,26,0.44)',
    plot: 'rgba(34,44,36,0.64)', slab: '#3c443e',
    core0: 'rgba(64,96,56,0.36)', core1: 'rgba(48,74,52,0.22)',
    coreSpot0: 'rgba(110,150,70,0.19)', coreSpot1: 'rgba(10,20,15,0.26)',
    seal: 'rgba(170,255,210,0.055)', wear: 'rgba(52,66,42,0.22)',
    haze: 'rgba(150,220,180,0.06)', rim: 'rgba(176,255,214,0.32)', glow: 'rgba(89,227,200,1)',
    void: '#0b1a15', wall: '#1e2b24', wallTop: 'rgba(150,200,160,0.18)', spike: '#16211c',
  },
  katedral: {
    g0: '#2a2038',
    pool: ['rgba(92,58,140,0.32)', 'rgba(14,10,22,0.44)', 'rgba(120,50,80,0.26)', 'rgba(66,44,110,0.30)', 'rgba(40,28,58,0.32)'],
    brush0: 'rgba(96,62,146,0.28)', brush1: 'rgba(14,10,20,0.32)',
    road: '#453048', roadLite: 'rgba(150,112,168,0.30)', roadEdge: 'rgba(20,14,28,0.46)',
    cobBase: '#3a3448', cobStone: [96, 88, 118],
    limeBase: '#3a3146', limeStone: [104, 92, 120], plateStone: [104, 96, 122],
    limeRim: 'rgba(214,168,255,0.22)', engrave: 'rgba(255,190,230,0.13)',
    blend0: 'rgba(42,32,56,0)', blend1: 'rgba(42,32,56,0.78)',
    water: ['#8e1f3a', '#4a1024', '#210813'], waterLine: 'rgba(255,170,200,A)',
    shore: 'rgba(50,32,50,0.50)', reed0: 'rgba(168,90,140,0.38)', reed1: 'rgba(24,14,28,0.44)',
    plot: 'rgba(38,32,46,0.64)', slab: '#3f3848',
    core0: 'rgba(96,56,120,0.36)', core1: 'rgba(66,44,88,0.22)',
    coreSpot0: 'rgba(140,84,170,0.18)', coreSpot1: 'rgba(14,10,20,0.26)',
    seal: 'rgba(240,190,255,0.06)', wear: 'rgba(62,48,74,0.22)',
    haze: 'rgba(200,170,240,0.06)', rim: 'rgba(226,190,255,0.32)', glow: 'rgba(155,108,255,1)',
    void: '#120c1a', wall: '#241d30', wallTop: 'rgba(180,160,210,0.20)', spike: '#1a1524',
  },
  hiclik: {
    g0: '#2e3038',
    pool: ['rgba(110,116,138,0.30)', 'rgba(14,15,20,0.44)', 'rgba(88,96,124,0.26)', 'rgba(140,144,160,0.20)', 'rgba(44,48,60,0.32)'],
    brush0: 'rgba(116,122,144,0.26)', brush1: 'rgba(14,15,19,0.32)',
    road: '#484c58', roadLite: 'rgba(154,160,180,0.30)', roadEdge: 'rgba(18,19,25,0.46)',
    cobBase: '#3e424c', cobStone: [110, 116, 128],
    limeBase: '#33363e', limeStone: [88, 94, 108], plateStone: [96, 102, 116],
    limeRim: 'rgba(226,230,244,0.24)', engrave: 'rgba(240,244,255,0.13)',
    blend0: 'rgba(46,48,56,0)', blend1: 'rgba(46,48,56,0.78)',
    water: ['#4c6e9a', '#243c58', '#0f1c2c'], waterLine: 'rgba(214,232,255,A)',
    shore: 'rgba(56,58,68,0.48)', reed0: 'rgba(150,158,180,0.36)', reed1: 'rgba(22,24,30,0.44)',
    plot: 'rgba(44,46,54,0.62)', slab: '#454956',
    core0: 'rgba(110,116,136,0.34)', core1: 'rgba(74,80,96,0.22)',
    coreSpot0: 'rgba(146,152,172,0.18)', coreSpot1: 'rgba(14,16,20,0.26)',
    seal: 'rgba(240,244,255,0.06)', wear: 'rgba(70,74,86,0.22)',
    haze: 'rgba(220,228,245,0.06)', rim: 'rgba(240,244,255,0.34)', glow: 'rgba(232,228,216,1)',
    void: '#0f1116', wall: '#282c34', wallTop: 'rgba(200,208,224,0.20)', spike: '#1d2027',
  },
  gokada: {
    g0: '#28304a',
    pool: ['rgba(78,104,180,0.30)', 'rgba(12,16,28,0.44)', 'rgba(120,96,190,0.26)', 'rgba(64,120,170,0.28)', 'rgba(38,46,74,0.32)'],
    brush0: 'rgba(84,110,186,0.26)', brush1: 'rgba(12,15,26,0.32)',
    road: '#414a66', roadLite: 'rgba(142,158,200,0.30)', roadEdge: 'rgba(16,20,32,0.46)',
    cobBase: '#38405c', cobStone: [96, 106, 138],
    limeBase: '#414a64', limeStone: [126, 138, 168], plateStone: [110, 122, 150],
    limeRim: 'rgba(200,214,255,0.24)', engrave: 'rgba(190,220,255,0.14)',
    blend0: 'rgba(40,48,74,0)', blend1: 'rgba(40,48,74,0.78)',
    water: ['#4a7ad0', '#22406e', '#0c1830'], waterLine: 'rgba(200,225,255,A)',
    shore: 'rgba(50,58,84,0.48)', reed0: 'rgba(130,158,220,0.36)', reed1: 'rgba(18,24,38,0.44)',
    plot: 'rgba(40,46,62,0.62)', slab: '#3e465e',
    core0: 'rgba(88,110,180,0.34)', core1: 'rgba(60,76,120,0.22)',
    coreSpot0: 'rgba(130,156,220,0.18)', coreSpot1: 'rgba(12,16,26,0.26)',
    seal: 'rgba(200,224,255,0.06)', wear: 'rgba(60,70,96,0.22)',
    haze: 'rgba(190,215,255,0.065)', rim: 'rgba(214,232,255,0.34)', glow: 'rgba(180,101,255,1)',
    void: '#0b1020', wall: '#232a40', wallTop: 'rgba(180,200,240,0.20)', spike: '#181d2c',
  },
  tuzla: {
    g0: '#28261f',
    pool: ['rgba(120,114,94,0.26)', 'rgba(18,17,13,0.46)', 'rgba(94,90,76,0.24)', 'rgba(136,128,106,0.17)', 'rgba(44,42,34,0.34)'],
    brush0: 'rgba(156,150,124,0.26)', brush1: 'rgba(20,19,15,0.30)',
    road: '#54503f', roadLite: 'rgba(176,168,134,0.30)', roadEdge: 'rgba(24,22,17,0.44)',
    cobBase: '#494538', cobStone: [128, 122, 100],
    limeBase: '#524d3e', limeStone: [156, 148, 120], plateStone: [136, 130, 108],
    limeRim: 'rgba(236,228,196,0.24)', engrave: 'rgba(255,248,214,0.13)',
    blend0: 'rgba(58,56,48,0)', blend1: 'rgba(58,56,48,0.78)',
    water: ['#6a8c86', '#33504e', '#16282a'], waterLine: 'rgba(226,242,236,A)',
    shore: 'rgba(66,62,48,0.46)', reed0: 'rgba(170,162,116,0.36)', reed1: 'rgba(26,24,18,0.42)',
    plot: 'rgba(52,50,42,0.62)', slab: '#4d493c',
    core0: 'rgba(140,132,104,0.32)', core1: 'rgba(96,90,72,0.22)',
    coreSpot0: 'rgba(170,162,132,0.18)', coreSpot1: 'rgba(20,19,14,0.24)',
    seal: 'rgba(255,248,214,0.055)', wear: 'rgba(84,78,60,0.22)',
    haze: 'rgba(238,232,208,0.055)', rim: 'rgba(248,240,212,0.34)', glow: 'rgba(255,214,140,1)',
    void: '#151410', wall: '#302c22', wallTop: 'rgba(210,200,170,0.20)', spike: '#211e18',
  },
  buzul: {
    g0: '#1f2c35',
    pool: ['rgba(84,124,152,0.30)', 'rgba(12,18,24,0.46)', 'rgba(112,150,176,0.24)', 'rgba(62,98,134,0.28)', 'rgba(30,42,53,0.34)'],
    brush0: 'rgba(104,146,176,0.26)', brush1: 'rgba(12,18,23,0.32)',
    road: '#3f4a54', roadLite: 'rgba(150,174,196,0.28)', roadEdge: 'rgba(14,20,26,0.46)',
    cobBase: '#36444e', cobStone: [100, 122, 138],
    limeBase: '#3e4c56', limeStone: [128, 150, 166], plateStone: [124, 148, 164],
    limeRim: 'rgba(214,238,252,0.24)', engrave: 'rgba(220,246,255,0.14)',
    blend0: 'rgba(38,52,62,0)', blend1: 'rgba(38,52,62,0.78)',
    water: ['#5aa8c8', '#26596e', '#0e2530'], waterLine: 'rgba(226,248,255,A)',
    shore: 'rgba(48,60,68,0.48)', reed0: 'rgba(140,178,196,0.34)', reed1: 'rgba(16,24,30,0.44)',
    plot: 'rgba(40,50,58,0.62)', slab: '#3c4850',
    core0: 'rgba(100,140,168,0.32)', core1: 'rgba(68,98,120,0.22)',
    coreSpot0: 'rgba(140,178,204,0.18)', coreSpot1: 'rgba(12,18,24,0.26)',
    seal: 'rgba(226,248,255,0.06)', wear: 'rgba(58,72,84,0.22)',
    haze: 'rgba(214,240,255,0.065)', rim: 'rgba(230,248,255,0.34)', glow: 'rgba(140,220,255,1)',
    void: '#0c141a', wall: '#212c34', wallTop: 'rgba(190,220,238,0.20)', spike: '#172026',
  },
  kemikbahce: {
    g0: '#24221c',
    pool: ['rgba(116,108,86,0.28)', 'rgba(17,16,12,0.48)', 'rgba(90,82,66,0.24)', 'rgba(130,122,96,0.17)', 'rgba(42,39,31,0.34)'],
    brush0: 'rgba(152,142,112,0.26)', brush1: 'rgba(19,17,13,0.32)',
    road: '#4e4736', roadLite: 'rgba(172,158,120,0.30)', roadEdge: 'rgba(22,20,15,0.46)',
    cobBase: '#453f34', cobStone: [124, 114, 92],
    limeBase: '#4d4638', limeStone: [154, 142, 112], plateStone: [140, 130, 104],
    limeRim: 'rgba(240,230,198,0.24)', engrave: 'rgba(255,246,210,0.13)',
    blend0: 'rgba(56,53,44,0)', blend1: 'rgba(56,53,44,0.78)',
    water: ['#7a6a4a', '#42381f', '#1e1a0e'], waterLine: 'rgba(246,236,196,A)',
    shore: 'rgba(62,56,42,0.48)', reed0: 'rgba(176,162,110,0.38)', reed1: 'rgba(24,22,16,0.44)',
    plot: 'rgba(48,44,36,0.64)', slab: '#494336',
    core0: 'rgba(136,124,96,0.34)', core1: 'rgba(92,84,64,0.22)',
    coreSpot0: 'rgba(166,154,120,0.18)', coreSpot1: 'rgba(18,17,13,0.26)',
    seal: 'rgba(255,246,210,0.06)', wear: 'rgba(78,72,54,0.22)',
    haze: 'rgba(240,232,200,0.055)', rim: 'rgba(250,242,210,0.34)', glow: 'rgba(255,226,150,1)',
    void: '#131208', wall: '#2d2820', wallTop: 'rgba(212,200,164,0.20)', spike: '#201c16',
  },
  gokcark: {
    g0: '#282a34',
    pool: ['rgba(92,96,126,0.30)', 'rgba(12,13,18,0.46)', 'rgba(120,110,164,0.24)', 'rgba(70,80,116,0.28)', 'rgba(36,38,50,0.32)'],
    brush0: 'rgba(96,100,132,0.26)', brush1: 'rgba(12,13,17,0.34)',
    road: '#3e404e', roadLite: 'rgba(142,146,176,0.28)', roadEdge: 'rgba(15,16,22,0.48)',
    cobBase: '#353846', cobStone: [92, 96, 120],
    limeBase: '#3d404e', limeStone: [120, 124, 148], plateStone: [110, 114, 138],
    limeRim: 'rgba(200,206,246,0.24)', engrave: 'rgba(210,220,255,0.14)',
    blend0: 'rgba(40,42,52,0)', blend1: 'rgba(40,42,52,0.78)',
    water: ['#5a4ea8', '#2a2456', '#110e26'], waterLine: 'rgba(214,214,255,A)',
    shore: 'rgba(46,48,60,0.50)', reed0: 'rgba(128,130,180,0.34)', reed1: 'rgba(15,16,24,0.46)',
    plot: 'rgba(38,40,50,0.64)', slab: '#3b3e4c',
    core0: 'rgba(92,96,140,0.34)', core1: 'rgba(62,66,96,0.22)',
    coreSpot0: 'rgba(130,132,182,0.18)', coreSpot1: 'rgba(12,13,18,0.28)',
    seal: 'rgba(214,220,255,0.06)', wear: 'rgba(58,60,78,0.22)',
    haze: 'rgba(196,204,255,0.06)', rim: 'rgba(220,226,255,0.34)', glow: 'rgba(170,150,255,1)',
    void: '#0a0b12', wall: '#22242e', wallTop: 'rgba(180,186,220,0.20)', spike: '#171922',
  },
};

const GRID = 128;

/* ═══════════════ ÖLÇÜLMÜŞ TON DÜZELTMESİ (2026-09-01) ══════
   Bantlar artık `_terrtest.html`te OYUNUN GERÇEK ŞADER MATEMATİĞİYLE
   ölçülüyor: `sRGB( lin(makro) × (1−k + k·lin(detay)/mid · maske) )`.
   Eski tezgah bunu Canvas2D 'overlay' ile taklit ediyordu ve İYİMSERDİ
   — aynı mezarlık 0,458 doygunluk yerine 0,42, 53 ortalama yerine 39
   okuyordu. Yani "bantta" denen on harita aslında bantta değildi;
   ölçütü düzeltince sapma göründü.

   Sapma TEK YERDEN kapatılır (on plan dosyasına dağılmış sihirli sayı
   yok): `night` gece yıkamasına EKLENİR, `sat` plandaki kroma kısmasıyla
   ÇARPILIR. Kullanıcı seçimi "zemin karanlık kalsın" olduğu için hedef
   ortalama bandın üst-ortası (~48): daha koyu hedef yerel kontrastı
   (1−a ile ölçeklenir) bandın altına düşürüyordu — hiçlik ve buz gibi
   düşük kontrastlı yüzeylerde ölçüldü. */
const TONE = {
  mezarlik:   { night: 0.10, sat: 0.62 },
  kul:        { night: 0,    sat: 0.70 },
  bataklik:   { night: 0.32, sat: 0.77 },
  katedral:   { night: 0.12, sat: 0.68 },
  hiclik:     { night: 0.27, sat: 1 },
  gokada:     { night: 0.17, sat: 0.72 },
  tuzla:      { night: 0.29, sat: 1 },
  buzul:      { night: 0.19, sat: 0.94 },
  kemikbahce: { night: 0.14, sat: 1 },
  gokcark:    { night: 0.22, sat: 1 },
};

/* ═══════════════ DİZİLİM YARDIMCILARI ═══════════════════════
   Plan dosyası `A.*` çağırır; birim koordinat girer, çarpışma kutusu
   ile birlikte liste çıkar.

   ÇAKIŞMA REDDİ ZORUNLU: iki kutu birbirine geçince daire-AABB itmesi
   oyuncuyu İKİ kez iter ve hareket zıplar.

   DÖNÜŞ KAPISI: çarpışma kutusu eksene hizalıdır, o yüzden serbest
   dönüş yalnız AYAK İZİ KAREYE YAKIN olan nesnelerde verilir. Uzun
   nesne (çit, duvar, sıra, gemi, kemer) 90°'ye SNAP edilir ve hx/hz
   takas edilir — böylece görünen kutu ile çarpışan kutu aynı kalır
   ("görsel = çarpışma" kuralı). Bu kapı olmadan yan yatmış bir gemi
   ekranda yatay, çarpışmada dikey oluyordu.
   ═════════════════════════════════════════════════════════════ */
function layout(E, plan) {
  const { U, V, rnd } = E;
  const out = [];
  /* ═══ KORİDOR KAYDI — "YOLUN ORTASINDA DİREK OLMAZ" ═══════════
     2026-08-30'a kadar `floor()` yolu boyuyordu, `props()` nesneyi
     diziyordu ve İKİSİ BİRBİRİNİ HİÇ GÖRMÜYORDU. Sonuç: kervan izinin
     ortasında kilometre taşı, iskele kalasının üstünde direk (direkler
     ±0,020 birimde, kalas yarı genişliği 0,026 — yani TAM ÜSTÜNDE), gök
     çarkının kolları üzerinde dişli. Hiçbiri ölçümlerde görünmüyordu
     çünkü ölçülen şey adet ve erişilebilirlikti; "yol yol gibi duruyor
     mu" ölçütü YOKTU.

     Artık her plan, `floor()` ile AYNI `L` sabitlerinden koridorlarını
     KAYDEDER (`A.path` · `A.ringPath` · `A.spokePath` · `A.area` ·
     `A.zone`) ve `add()` koridora giren her nesneyi reddeder. İki taraf
     aynı sayıyı okuduğu için ayrışamaz — yol verisi tek yerde yaşar.

     KASITLI İSTİSNA `onPath: true`: kemer kapı yolun ÜSTÜNDE durur
     (kapı yolu keser, o yüzden kapıdır) ve kapı sövesi. Bu bayrak elle
     yazılır, sessizce olmaz.

     Koridora giren nesne `rejPath`e sayılır. pri 0 bir çıpa koridora
     düşerse `rej`e de sayılır — yani ÖLÇÜT bozulur ve tezgah kırmızı
     yanar (çıpanın yeri yanlış demektir, koridor değil). */
  const clears = [], gates = [], encRects = [];
  let encN = 0;
  /* SIRA SAYACI: koridor SONRAKİ yerleşimleri kısıtlar (motorun anlamı
     budur). Bir kapı ağzı koridoru, o kapıyı kuran çitten ve avlunun
     içindeki EVDEN sonra kaydedilir; geriye dönük denetim bu ikisini
     "yol üstünde" sayıp yalancı ihlal üretiyordu (tezgahta ev×1, çit×4).
     Prop ve koridor aynı sayaçla damgalanır; ihlal ancak prop koridordan
     SONRA konduysa gerçektir. */
  let seqN = 0;
  const cseg = (u0, v0, u1, v1, w) => {
    clears.push({ x0: U(u0), y0: V(v0), x1: U(u1), y1: V(v1), r: E.P * w, seq: seqN });
  };
  /* KUTU × KORİDOR — DOĞRU TEST KUTU-DAİREDİR.
     ① İlk sürüm nesneyi çevrel DAİREYLE test etti (hypot(hx,hz)) ve bir
     evin çevrel yarıçapı 105 birim olduğu için köy yolunun 0,040 birim
     yanında duran EV reddedildi: kural tam olarak istediğimiz şeyi
     (yol kenarında ev) yasaklıyordu.
     ② İkinci sürüm örneklenen koridor noktasını GENİŞLETİLMİŞ AABB ile
     test etti (|dx| < hx+r VE |dy| < hz+r). Bu köşelerde YALANCI ÇARPMA
     üretir: eksenden 45° sapmış bir nokta iki testi de geçer ama kutuya
     olan gerçek uzaklığı r'den büyüktür. Ölçülen sonuç: mezarlığın
     şapeli ve kemikhanesi (iki halka yol arasındaki bantta, yola 160
     birim uzakta) sessizce reddediliyordu — haritanın iki işaret yapısı
     hiç doğmuyordu.
     Doğrusu: kutuya en yakın nokta ile örnek arası uzaklık < r.
     Nokta-koridor (daire: avlu, çukur ağzı) aynı testin tek örnekli
     halidir, yani ayrı kod yok. */
  const inClear = (x, y, hx, hz) => {
    for (let i = 0; i < clears.length; i++) {
      const c = clears[i];
      const dx = c.x1 - c.x0, dy = c.y1 - c.y0;
      const len = Math.hypot(dx, dy);
      const n = len ? Math.max(1, Math.ceil(len / Math.max(14, c.r * 0.7))) : 0;
      const rr = c.r * c.r;
      for (let s = 0; s <= n; s++) {
        const t = n ? s / n : 0;
        let qx = c.x0 + dx * t - x, qy = c.y0 + dy * t - y;
        qx = (qx < 0 ? -qx : qx) - hx; if (qx < 0) qx = 0;
        qy = (qy < 0 ? -qy : qy) - hz; if (qy < 0) qy = 0;
        if (qx * qx + qy * qy < rr) return true;
      }
    }
    return false;
  };
  /* polyline örnekleyici: yol kenarı dizilimi yolun KENDİ eğrisinden
     türetilir (boyacının okuduğu nokta listesi), elle yazılmaz. */
  const polyAt = (pts, t) => {
    let total = 0;
    for (let i = 1; i < pts.length; i++) total += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    let d = t * total;
    for (let i = 1; i < pts.length; i++) {
      const ax = pts[i - 1][0], ay = pts[i - 1][1];
      const L = Math.hypot(pts[i][0] - ax, pts[i][1] - ay);
      if (d <= L || i === pts.length - 1) {
        const k = L ? d / L : 0;
        return [ax + (pts[i][0] - ax) * k, ay + (pts[i][1] - ay) * k,
          L ? (pts[i][0] - ax) / L : 1, L ? (pts[i][1] - ay) / L : 0];
      }
      d -= L;
    }
    return [pts[0][0], pts[0][1], 1, 0];
  };
  /* REDDEDİLEN ÇAĞRILAR ÖLÇÜLÜR — AMA NİYETİNE GÖRE İKİ KOVAYA.
     `add` çakışma ya da sınır yüzünden null dönebilir ve bu SESSİZDİR:
     buzulda gemi enkazı (haritanın çıpası) bir buz dikeninin üstüne
     düştüğü için hiç doğmuyordu ve nesne sayısı doğru göründüğü için
     tezgah bile yakalamadı.

     AMA TÜRE GÖRE SAYMAK YANLIŞ ALARM ÜRETİR (ölçüldü): aynı tür hem
     çıpa hem süs olarak kullanılıyor. Kül çukurlarında `baca` bir kez
     ismiyle konur (çöken ocak — çıpa) ve bir kez altılı kenar halkasında
     geçer; halkadaki ret DİZİLİMİ OTURTAN MEKANİZMADIR, kayıp değil.
     `ringN`/`scatter`/`line`/`grid` çakışma reddiyle çalışır: altı baca
     istenip dördünün sığması tasarımın kendisidir.

     Bu yüzden ret İKİ KOVADA: `rej` doğrudan `A.add` çağrıları (isimle
     konmuş, tek bir yeri olan nesne — pri 0 ise HATA), `rejFill`
     üreticiler (bilgi amaçlı). Ayırım olmadan ölçüt ya yanlış alarm
     verir ya da susturulur; ikisi de ölçümü öldürür. */
  let grp = 0, grpP = 0, grpN = 0;
  const rej = {};
  const rejFill = {};
  const rejPath = {};
  let fillDepth = 0;
  /* SESSİZ DENEME: `nest()` yuvayı spiralle arıyor ve her başarısız
     deneme normalde `rej`e sayılırdı — ilk ölçümde bu tek başına
     "yuva×31 reddedildi" gibi okundu ve GERÇEK çıpa hatalarını (mahzen,
     şapel) gürültüye boğdu. Arama denemesi kayıp değildir. */
  let quiet = 0;

  const fits = (x, y, hx, hz, slack, kind) => {
    for (let i = 0; i < out.length; i++) {
      const o = out[i], T = PROP_TYPES[o.kind];
      const ohx = o.hx || T.hx, ohz = o.hz || T.hz;
      /* gevşeklik YALNIZ eş türe karşı: çit zinciri uç uca dizilebilir,
         ama çit bir mezar taşının içine giremez. */
      const sl = (slack != null && o.kind === kind) ? slack : 1.02;
      if (Math.abs(o.x - x) < (ohx + hx) * sl && Math.abs(o.y - y) < (ohz + hz) * sl) return false;
    }
    return true;
  };

  const pick = (k) => (typeof k === 'string' ? k : k[(rnd() * k.length) | 0]);

  const place = (kindIn, u, v, o) => {
    const kind = pick(kindIn);
    const T = PROP_TYPES[kind];
    if (!T) return null;
    let hx = (o && o.hx) || T.hx, hz = (o && o.hz) || T.hz;
    /* GÖRSEL = ÇARPIŞMA — ÖLÇEK MODEL UZAYINDA SAKLANIR.
       `A.line` span türlerinde (çit · duvar · iskele) yarı uzunluğu
       ARALIKTAN türetiyor, ama renderer örneği her zaman model boyunda
       çiziyordu (`TMP.vb.set(1, sy, 1)`): kullanıcının "boş alanda
       ilerleyemiyorum" dediği şey buydu — kül haritasının teras
       duvarlarında blok başına 324 px çarpışma, ~120 px görsel, yani
       bloklar arasındaki boşluk GÖRÜNMEZ DUVARDI. Ölçümlerde de
       görünmedi: `_placetest` çarpışma kutusunu çiziyor, GÖRSELİ değil
       (erişim %100'dü — geçilecek yer vardı, ama göz başka yer gösteriyordu).
       Ölçek dönüşden ÖNCE hesaplanır: p.hx/p.hz sonraki blokta dünya
       eksenine çevrilebilir, ama mesh döndürüldüğü için ölçeği kendi
       yerel ekseninde ister. */
    const sx = hx / T.hx, sz = hz / T.hz;
    let rot = (o && o.rot != null) ? o.rot : 0;
    /* serbest dönüş yalnız kareye yakın ayak izinde */
    const square = Math.abs(hx - hz) / Math.max(hx, hz) < 0.25;
    if (!square && Math.abs(rot) > 0.35) {
      const q = Math.round(rot / (Math.PI / 2));
      rot = q * (Math.PI / 2);
      if (q % 2) { const t = hx; hx = hz; hz = t; }
    }
    /* ±0,03 rad SALLANTI YALNIZ SÜSTE. Kullanıcının teşhisi "çitler
       düzgün düzenli yerleştirilmeli"ydi: her nesneye koşulsuz eklenen
       rastgele dönüş, uç uca dizilmiş bir çit zincirini testere dişine
       çeviriyordu (segment başına ~2°; on segmentte göz bunu "eğri çit"
       okur). Yapılmış olan şey (çit, duvar, ev, kemer, sıra, ızgara)
       DİK durur: `exact` ya da tip tablosunda `built`. Sallantı moloza,
       fıçıya, kemiğe kalır. */
    if (!(o && o.exact) && !T.built) rot += (rnd() - 0.5) * 0.06;
    let x = U(u), y = V(v);
    if (o && o.jitter) { x += (rnd() - 0.5) * E.P * o.jitter * 2; y += (rnd() - 0.5) * E.P * o.jitter * 2; }
    /* oyun alanı dışına taşma yok: kenar bandı çarpışmasız olmalı */
    const m = E.B + 24;
    const rb = fillDepth ? rejFill : rej;
    if (x < m || y < m || x > E.full - m || y > E.full - m) {
      if (!quiet) rb[kind] = (rb[kind] || 0) + 1;
      return null;
    }
    if (!(o && o.onPath) && inClear(x, y, hx, hz)) {
      if (!quiet) {
        rejPath[kind] = (rejPath[kind] || 0) + 1;
        if (!fillDepth) rb[kind] = (rb[kind] || 0) + 1;
      }
      return null;
    }
    if (!fits(x, y, hx, hz, o && o.slack, kind)) {
      if (!quiet) rb[kind] = (rb[kind] || 0) + 1;
      return null;
    }
    const p = { kind, x, y, rot, pri: T.pri, seq: seqN++, g: grp, gp: grpP };
    if (o && o.onPath) p.onPath = 1;   // ölçüm: kasıtlı yol üstü (kapı, söve)
    if (hx !== T.hx) p.hx = hx;
    if (hz !== T.hz) p.hz = hz;
    if (sx < 0.995 || sx > 1.005) p.sx = sx;
    if (sz < 0.995 || sz > 1.005) p.sz = sz;
    if (o && o.h) p.h = o.h;
    out.push(p);
    return p;
  };

  /* ELLE KONAN NESNE KAYBOLMAZ — KÜÇÜK SPİRALLE KAYDIRILIR.
     `A.add` çağrısı bir KARAR'dır: "şu evın sağ duvarında odun yığını,
     şu kapının yanında fener". Reddedilmesi tasarım değil KAYIPTır ve
     tezgah bunu on haritada 14 nesnede yakaladı (odun, kazan, fener,
     küp, sıra, yığın, kayık) — hepsi sessizce yok oluyordu, çünkü eski
     ölçüt yalnız pri 0'ı sayarken bunların hiçbiri pri 0 değildi.

     ÜÇ KADEMELİ YARIÇAP, üçü de nesnenin ne olduğundan türetilir:
      · sandık 0,070 (ödül: "o bölgede" olması yeter),
      · süs 0,030 ("şu yapının yanında" korunur),
      · span (çit/duvar/iskele) HİÇ: zincirin hizası anlamın kendisidir,
        kaydırılan bir panel "düzgün çit" ölçütünü bozar.
     Kaydırma denemeleri SESSİZdır (arama kayıp değildir); spiral de
     başarısız olursa GERÇEK kayıp sayılır ve tezgah kırmızı yanar —
     o zaman sorun koordinat değil KOMPOZİSYONdur (yer gerçekten yok).
     Üreticilerin (ringN/scatter/grid/wayside) reddi kurtarılmaz: orada
     ret, dizilimi oturtan mekanizmadır. */
  const add = (kindIn, u, v, o) => {
    const k0 = typeof kindIn === 'string' ? kindIn : kindIn[0];
    const T0 = PROP_TYPES[k0];
    if (fillDepth || !T0 || T0.span) return place(kindIn, u, v, o);
    const step = T0.chest ? 0.014 : 0.006;
    quiet++;
    let ok = place(kindIn, u, v, o);
    for (let s = 1; s <= 5 && !ok; s++) {
      for (let q = 0; q < 8 && !ok; q++) {
        const a = q * 0.7854 + s * 0.35, rr = step * s;
        ok = place(kindIn, u + Math.cos(a) * rr, v + Math.sin(a) * rr, o);
      }
    }
    quiet--;
    if (!ok) rej[k0] = (rej[k0] || 0) + 1;
    return ok;
  };

  /* ═══ v47 — GRUP · SÜS · FX ════════════════════════════════════
     KÖK NEDEN (1:1 ölçüldü): planlar 95-130 engel üretiyordu, bütçe
     66/72/78; `thinProps` liste sırasıyla kesince mezar sıraları YARIDA
     kalıyor, halka ağaçları hiç doğmuyor, zemine boyanmış yatak/gölge
     nesnesiz kalıyordu — kullanıcının "dağınık" dediği şey buydu.
     Artık her sahne bir GRUPTUR (`A.group(pri, fn)`) ve kırpma BÜTÜN
     grubu atar; kısmi kesim ölçülür (`partial`, hedef 0).
     SÜS (çarpışmasız, instanced, rüzgârlı) ayrı listede yaşar: "etrafta
     bir şeyler olsun" isteği engel sayısını artırmadan karşılanır. */
  const decor = [], fxA = [];
  const PATH_OK = { tas: 1, yaprakP: 1, kemikP: 1, disliP: 1, kar: 1, kor: 1 };
  const inBox = (x, y, pad) => {
    for (let i = 0; i < out.length; i++) {
      const o = out[i], T = PROP_TYPES[o.kind];
      if (T.pass) continue;
      const hx = (o.hx || T.hx) + pad, hz = (o.hz || T.hz) + pad;
      if (Math.abs(o.x - x) < hx && Math.abs(o.y - y) < hz) return true;
    }
    return false;
  };
  /* süs: dünya-px (x,y) ile doğrudan; kutunun ya da koridorun içine düşmez */
  const putD = (kindIn, x, y, s, dp) => {
    const kind = pick(kindIn);
    const m = E.B + 30;
    if (x < m || y < m || x > E.full - m || y > E.full - m) return null;
    if (inBox(x, y, -3)) return null;
    if (!PATH_OK[kind] && inClear(x, y, 4, 4)) return null;
    const d = { kind, x, y, rot: rnd() * TAU, s: s || (0.8 + rnd() * 0.45), g: grp, gp: grpP, dp: dp || 0 };
    decor.push(d);
    return d;
  };
  const A = {
    rnd, U, V, add,
    group(pri, fn) {
      const pg = grp, pp = grpP;
      grp = ++grpN; grpP = pri;
      fn();
      grp = pg; grpP = pp;
    },
    mark() { return out.length; },
    /* bir engelin DİBİNE süs: kutunun şişirilmiş çevresinden örneklenir,
       yani ot/mum/taş nesneye YASLANIR (sticker değil zemine oturma) */
    dress(p, kinds, n, o) {
      if (!p) return;
      const T = PROP_TYPES[p.kind];
      const hx = p.hx || T.hx, hz = p.hz || T.hz;
      const sp = (o && o.spread) || 20;
      for (let i = 0; i < n; i++) {
        const per = rnd() * (hx + hz) * 2;
        let x, y;
        if (per < hx * 2) { x = p.x - hx + per; y = p.y + (rnd() < 0.5 ? -1 : 1) * hz; }
        else { x = p.x + (rnd() < 0.5 ? -1 : 1) * hx; y = p.y - hz + (per - hx * 2); }
        const nx = x - p.x, ny = y - p.y, L = Math.hypot(nx, ny) || 1;
        const k = 9 + rnd() * sp;
        putD(kinds, x + nx / L * k, y + ny / L * k, 0, 0);
      }
    },
    dressFrom(i0, kinds, n, o) { for (let i = i0; i < out.length; i++) A.dress(out[i], kinds, n, o); },
    decor(kinds, u, v, o) { return putD(kinds, U(u), V(v), o && o.s, (o && o.dp) || 1); },
    /* süs öbeği: disk içinde, merkeze doğru sıklaşan */
    patch(kinds, u, v, r, n, o) {
      for (let i = 0; i < n; i++) {
        const a = rnd() * TAU, rr = r * Math.pow(rnd(), 0.7);
        putD(kinds, U(u + Math.cos(a) * rr), V(v + Math.sin(a) * rr), 0, (o && o.dp) || 2);
      }
    },
    /* yol kenarı süsü: yolun kendi eğrisinden, iki yana */
    verge(kinds, pts, n, off) {
      for (let i = 0; i < n; i++) {
        const p = polyAt(pts, (i + rnd()) / n);
        const s = rnd() < 0.5 ? -1 : 1, o2 = off * (0.9 + rnd() * 0.5);
        putD(kinds, U(p[0] - p[3] * o2 * s), V(p[1] + p[2] * o2 * s), 0, 3);
      }
    },
    /* KENAR ÇERÇEVESİ: kare sınıra organik kümeler (halka DEĞİL). Kümeler
       arası boşluk rastgele, küme 2-3 engel + dip süsü. Koridor (kenara
       ulaşan yol) varsa küme orada reddedilir: yol ağzı açık kalır. */
    edge(kinds, o) {
      fillDepth++;
      const op = o || {};
      const step = op.step || 0.2, d0 = op.d0 || 0.034, d1 = op.d1 || 0.07;
      const dk = op.dress || null;
      for (let s = 0; s < 4; s++) {
        if (op.sides && op.sides.indexOf(s) < 0) continue;
        for (let t = 0.08 + rnd() * 0.06; t < 0.94; t += step * (0.8 + rnd() * 0.5)) {
          if (rnd() < (op.skip || 0.25)) continue;
          const d = d0 + rnd() * (d1 - d0);
          const pt = [[t, d], [1 - d, t], [1 - t, 1 - d], [d, 1 - t]][s];
          A.group(op.pri == null ? 2 : op.pri, () => {
            const n = op.n || (1 + (rnd() < 0.55 ? 1 : 0));
            for (let q = 0; q < n; q++) {
              const a = rnd() * TAU, r = q ? 0.014 + rnd() * 0.016 : 0;
              const p = place(kinds, pt[0] + Math.cos(a) * r, pt[1] + Math.sin(a) * r, { jitter: 0.002 });
              if (p && dk) A.dress(p, dk, 3);
            }
          });
        }
      }
      fillDepth--;
    },
    /* EKRAN HÜCRESİ KURALI: 8×8 hücre (500 px). İçinde engel ve ≥3 süs
       olmayan hücreye bir süs öbeği düşer — boş ekran kalmaz. */
    cover(kinds, o) {
      const op = o || {}, N = 8, cs = 1 / N;
      /* YETİM YOK: dibinde iki süsü olmayan her engel (sandık, kandil, sıra)
         son pasoda giydirilir — zemine oturmayan nesne "yapıştırılmış" okunur. */
      for (let i = 0; i < out.length; i++) {
        const p = out[i], T = PROP_TYPES[p.kind];
        if (T.pass || T.span) continue;
        const R = Math.max(p.hx || T.hx, p.hz || T.hz) + 40;
        let k = 0;
        for (let j = 0; j < decor.length && k < 2; j++) if (Math.abs(decor[j].x - p.x) < R && Math.abs(decor[j].y - p.y) < R) k++;
        if (k < 2) { const pg = grp, pp = grpP; grp = p.g | 0; grpP = p.gp | 0; A.dress(p, ['tas'].concat(kinds), 4, { spread: 10 }); grp = pg; grpP = pp; }
      }
      for (let cy = 0; cy < N; cy++) {
        for (let cx = 0; cx < N; cx++) {
          const x0 = U(cx * cs), x1 = U((cx + 1) * cs), y0 = V(cy * cs), y1 = V((cy + 1) * cs);
          let ob = 0, dc = 0;
          /* yalnız ATILAMAYAN (gp ≤ 1) içerik sayılır: kenar kümesi (gp 3)
             düşük kademede atılınca hücre boş kalmasın */
          for (let i = 0; i < out.length; i++) if ((out[i].gp | 0) <= 1 && out[i].x >= x0 && out[i].x < x1 && out[i].y >= y0 && out[i].y < y1) ob++;
          for (let i = 0; i < decor.length; i++) if ((decor[i].gp | 0) <= 1 && decor[i].x >= x0 && decor[i].x < x1 && decor[i].y >= y0 && decor[i].y < y1) dc++;
          if (ob || dc >= 3) continue;
          for (let tr = 0; tr < 12; tr++) {
            const u = (cx + 0.2 + rnd() * 0.6) * cs, v = (cy + 0.2 + rnd() * 0.6) * cs;
            if (inBox(U(u), V(v), 30)) continue;
            /* yol/göbek üstü hücre: yalnız yola uygun düz süs (çakıl, kemik kırığı) */
            const onP = inClear(U(u), V(v), 20, 20);
            const calm = Math.hypot(u - 0.5, v - 0.5) < 0.14;
            const before = decor.length;
            A.patch(onP ? (op.path || ['tas']) : (calm && op.calm ? op.calm : kinds), u, v, 0.022, op.n || 6, { dp: 1 });
            if (decor.length > before) break;
          }
        }
      }
    },
    /* FX çıpası (ateşböceği · kor · toz): POI'ye çivili, kamerayı izlemez */
    fx(mode, u, v, o) {
      const op = o || {};
      fxA.push({ mode, x: U(u), y: V(v), n: op.n || 6, r: op.r || 60, h: op.h || 60, col: op.col || null, g: grp });
    },


    /* ── KORİDOR BİLDİRİMİ ─────────────────────────────────
       Plan bunları `floor()`un okuduğu AYNI sabitlerden çağırır.
       Genişlik yolun yarı genişliği + biraz pay: yolun kenar çizgisi
       de yol sayılır (nesnenin ayağı kaldırıma taşmasın). */
    /* YOL KORİDORU BOYACININ EĞRİSİNİ ÖRNEKLER.
       `K.road` nokta listesini DÜZ ÇİZGİ olarak ÇİZMEZ: ara noktaları
       kontrol noktası yapıp ORTA NOKTALARDAN geçen quadratic eğri çizer.
       İlk sürüm koridoru düz kırık çizgi olarak kaydediyordu ve panelde
       görüldü: kül çukurlarının zikzak servis yolunda camgöbeği şerit
       boyalı yoldan sapıyordu (en büyük sapma keskin dönüşlerde). Aynı
       eğri burada da örneklenir — iki taraf tek eğriyi paylaşır. */
    path(pts, w) {
      if (pts.length < 3) {
        for (let i = 1; i < pts.length; i++) cseg(pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1], w);
        return;
      }
      const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
      const qs = [];                       // [başlangıç, kontrol, bitiş]
      let cur = pts[0];
      for (let i = 1; i < pts.length - 1; i++) {
        const end = mid(pts[i], pts[i + 1]);
        qs.push([cur, pts[i], end]);
        cur = end;
      }
      qs.push([cur, pts[pts.length - 1], pts[pts.length - 1]]);
      for (let q = 0; q < qs.length; q++) {
        const p0 = qs[q][0], p1 = qs[q][1], p2 = qs[q][2];
        const N = 6;
        let px = p0[0], py = p0[1];
        for (let st = 1; st <= N; st++) {
          const t = st / N, it = 1 - t;
          const x = it * it * p0[0] + 2 * it * t * p1[0] + t * t * p2[0];
          const y = it * it * p0[1] + 2 * it * t * p1[1] + t * t * p2[1];
          cseg(px, py, x, y, w);
          px = x; py = y;
        }
      }
    },
    ringPath(cu, cv, r, w, n) {
      const N = n || 36;
      for (let i = 0; i < N; i++) {
        const a0 = (i / N) * TAU, a1 = ((i + 1) / N) * TAU;
        cseg(cu + Math.cos(a0) * r, cv + Math.sin(a0) * r, cu + Math.cos(a1) * r, cv + Math.sin(a1) * r, w);
      }
    },
    spokePath(cu, cv, r0, r1, a, w) {
      cseg(cu + Math.cos(a) * r0, cv + Math.sin(a) * r0, cu + Math.cos(a) * r1, cv + Math.sin(a) * r1, w);
    },
    /* daire: avlu göbeği, kapı önü sahanlığı, çukur ağzı */
    area(cu, cv, r) { cseg(cu, cv, cu, cv, r); },
    /* dikdörtgen salon/koridor: uzun eksen boyunca tek koridor */
    zone(u0, v0, u1, v1) {
      const w = Math.abs(u1 - u0), h = Math.abs(v1 - v0);
      const cu = (u0 + u1) / 2, cv = (v0 + v1) / 2;
      if (w >= h) cseg(u0 + h / 2, cv, u1 - h / 2, cv, h / 2);
      else cseg(cu, v0 + w / 2, cu, v1 - w / 2, w / 2);
    },

    /* GÖREV YUVALARI EN BAŞTA: hedefin var olmaması, bir fıçının
       kaybolmasından kat kat pahalıdır. Koridora düşen yuva ise
       reddedilmez — SPİRALLE KAYDIRILIR: yolun ortasında bir yuva da
       istemiyoruz ama "hedef yok" hiç istemiyoruz. */
    /* ── MOR HÖYÜKLER KALDIRILDI (2026-08-30, kullanıcı isteği) ───
       `yuva` görev varlığı sahada mor bir kubbe olarak duruyordu ve
       kullanıcı onu haritalardan çıkarmak istedi: "2. fotoğraftaki mor
       nesneyi tüm haritalardan kaldır."

       TEK YERDEN kapatıldı, on planın içinden tek tek silinmedi:
       koordinatlar (`plan.nests`) ve `PROP_TYPES.yuva` yerinde kalır,
       yani başka bir görsel dille (kırık sunak, kemik yığını) geri
       getirilmesi tek satırdır. On yerden silmek o kapıyı kapatırdı.

       Sonucu: `objectives.js` yuva görevini hiç kurmaz (`byKind.yuva`
       boş → `nests` boş → sayaç ve "YUVALAR SUSTU" ödülü hiç tetiklenmez).
       Saha görevi ESCORT olarak yaşamaya devam eder — kalkan kubbesi,
       varış feneri ve kart ödülü değişmedi. */
    nest() {},

    _nestDisabled() {
      const N = plan.nests || [[0.12, 0.13], [0.88, 0.52], [0.42, 0.90]];
      for (let i = 0; i < N.length; i++) {
        /* İLK deneme de SESSİZ: koordinat yola denk gelip spiral onu
           kurtardığında bu bir kayıp değildir. İlk sürüm ilk denemeyi
           sayıyordu ve tezgah "yuva×3 reddedildi" diye kırmızı yanıyordu
           — oysa üç yuva da doğmuştu, yalnız kaydırılmışlardı. */
        quiet++;
        let ok = add('yuva', N[i][0], N[i][1]);
        for (let s = 1; s <= 12 && !ok; s++) {
          for (let q = 0; q < 6 && !ok; q++) {
            const a = q * 1.047 + s * 0.4, r = 0.022 * s;
            ok = add('yuva', N[i][0] + Math.cos(a) * r, N[i][1] + Math.sin(a) * r);
          }
        }
        quiet--;
        if (!ok) rej.yuva = (rej.yuva || 0) + 1;   // gerçek kayıp: hedef yok
      }
    },

    /* düz dizi. `span` bayraklı türler (çit, duvar, iskele) uç uca
       BİRLEŞİR: yarı uzunluk aralıktan türetilir, elle yazılmaz. */
    line(kind, u0, v0, u1, v1, n, o) {
      fillDepth++;
      const op = o || {};
      const ax = U(u0), ay = V(v0), bx = U(u1), by = V(v1);
      const len = Math.hypot(bx - ax, by - ay);
      const horiz = Math.abs(bx - ax) > Math.abs(by - ay);
      const k0 = typeof kind === 'string' ? kind : kind[0];
      /* v49: sahadan kalkan tür (çit, duvar, sütun…) sessizce atlanır */
      if (!PROP_TYPES[k0]) { fillDepth--; return; }
      const span = PROP_TYPES[k0].span;
      /* SEGMENT SAYISI SPAN'DA ÖLÇÜMLE TÜRETİLİR (skip yoksa).
         Kül haritası gerilme 1,90'da çakılı kaldı ve elle 3→4 yapmak
         değiştirmedi: teras çizgileri 1164 px, yani 4 segmentte bile blok
         başına 285 px isteniyordu. Çağıranın yazdığı sayıya güvenmek
         her yeni haritada aynı hatayı doğurur — uzunluk zaten burada
         biliniyor. `skip` verilmişse DOKUNULMAZ: o indeksler kapı yeridir
         ve n değişince kapı kayar (tezgah o çağrıları gerilmeyle denetler). */
      if (span && !op.skip) {
        n = Math.max(n, Math.ceil(len / (PROP_TYPES[k0].hx * 2 * 1.35)));
      }
      /* Yarı uzunluk aralıktan türetilir (bloklar UÇ UCA — zincirde delik
         olmaz) ve görsel artık bu kutuyu ölçekle takip eder.
         ÜST SINIR 1,9× BİR SİGORTADIR, ayar değil: gren dünya konumundan
         pişmiştir, 2× gerilmiş bir duvar dokusu görünür. Ama sınır
         BAĞLARSA kutu kısalır ve zincirde boşluk açılır — oyuncu çitin
         arasından sızıp "bir giriş bir çıkış" kuralını boşa çıkarır.
         Bu yüzden tezgah gerilmeyi ÖLÇER (`_placetest` gerilme kolonu):
         değer 1,9'a değiyorsa çözüm sınırı yükseltmek değil, o çağrıda
         SEGMENT SAYISINI arttırmaktır. */
      const half = Math.min(len / n / 2 - 3, PROP_TYPES[k0].hx * 1.9);
      for (let i = 0; i < n; i++) {
        if (op.skip && op.skip.indexOf(i) >= 0) continue;
        const t = (i + 0.5) / n;
        const oo = { rot: op.rot != null ? op.rot : 0, jitter: op.jitter, exact: op.exact, onPath: op.onPath, slack: op.slack != null ? op.slack : (span ? 0.8 : undefined) };
        /* KALINLIK TİP TABLOSUNDAN. Sabit `8` `cit`in kalınlığıydı (hz 8)
           ve bütün span türlerine yazılıyordu: `duvar` (hz 29) çarpışmada
           8, görselde 8/29 = 0,28 ölçekle çiziliyor, yani harap istinat
           duvarı KAĞIT GİBİ İNCE oluyordu. Önceki sürümde görsel ölçekten
           bağımsız olduğu için bu yalnız "duvarın yanından geçerken
           takılma" olarak fark ediliyordu. */
        if (span) { oo.hx = half; oo.hz = PROP_TYPES[k0].hz; oo.rot = horiz ? 0 : Math.PI / 2; }
        add(kind, u0 + (u1 - u0) * t, v0 + (v1 - v0) * t, oo);
      }
      fillDepth--;
    },

    /* yay üstünde dizi. `face` merkeze bakma isteğidir; kutu eksene
       hizalı kaldığı için yalnız kareye yakın ayak izinde uygulanır. */
    arc(kind, cu, cv, r, a0, a1, n, o) {
      fillDepth++;
      const op = o || {};
      for (let i = 0; i < n; i++) {
        const t = n === 1 ? 0.5 : i / (n - 1);
        const a = a0 + (a1 - a0) * t;
        add(kind, cu + Math.cos(a) * r, cv + Math.sin(a) * r,
          { rot: op.face ? a + Math.PI / 2 : 0, jitter: op.jitter, slack: op.slack, exact: op.exact });
      }
      fillDepth--;
    },

    /* daire çevresinde n adet. `skip(a)` yön kapısı (yapının önü boş). */
    ringN(kind, cu, cv, r, n, o) {
      fillDepth++;
      const op = o || {};
      const off = op.off || 0, sy = op.sy || 1;
      for (let i = 0; i < n; i++) {
        const a = off + (i / n) * TAU;
        if (op.skip && op.skip(a)) continue;
        add(kind, cu + Math.cos(a) * r, cv + Math.sin(a) * r * sy,
          { rot: op.rot != null ? op.rot : a + Math.PI / 2, jitter: op.jitter, h: op.h, hx: op.hx, hz: op.hz, slack: op.slack, exact: op.exact });
      }
      fillDepth--;
    },

    /* ── ÇEVRE ÇİTİ: TEK GİRİŞ, TEK ÇIKIŞ ────────────────────
       Kullanıcının cümlesi: "bir mezarlık etrafındaki çitler düzgün
       düzenli yerleştirilmeli ve bir giriş bir çıkış alanı olmalı."
       Eski `rect` bunu YAPMIYORDU: `gates:[1,2]` her kenarda
       `(gate+s)%n` indeksini atlıyor, yani DÖRT kenarda ikişer rastgele
       delik açıyordu — ne giriş ne çıkış, sadece delikli bir çit.

       Burada segment sayısı TEK'e yuvarlanır (kapı tam ORTAYA gelsin),
       kapı yalnız `entry` ve `exit` kenarında açılır, iki yanına söve
       (fener/sütun) konur ve kapı ağzı KORİDOR olarak kaydedilir —
       böylece sonraki hiçbir süs kapının önünü kapatamaz.
       Segmentler `exact`: sallantı yok, uçlar birleşir. */
    enclosure(kind, u0, v0, u1, v1, o) {
      const op = o || {}, sp = op.seg || 0.036;
      const eid = encN++;
      encRects.push({ x0: U(Math.min(u0, u1)), y0: V(Math.min(v0, v1)), x1: U(Math.max(u0, u1)), y1: V(Math.max(v0, v1)), enc: eid });
      /* KAPI YAKLAŞMA KORİDORU SİMETRİK DEĞİLDİR.
         İlk sürüm ağzın İKİ YANINA da 1,5 panel uzatıyordu ve içeri
         doğru uzayan yarı, karşı kapınınkiyle birleşip parselin içini
         boydan boya 86 px'lik yasak bir şeride çeviriyordu: mezarlığın
         aile parseli BİR BOŞ AĞIL olarak sevk edildi (dört mezarın dördü
         de sessizce reddedilmiş). Dışarı uzun (yaklaşma yolu boş kalmalı),
         içeri KISA: kapının hemen ardı boş, parselin göbeği kullanılabilir. */
      const NORM = [[0, -1], [1, 0], [0, 1], [-1, 0]];
      const SIDE = { north: 0, east: 1, south: 2, west: 3 };
      const entry = SIDE[op.entry || 'south'];
      const exit = op.exit === false ? -1 : SIDE[op.exit || 'north'];
      const sides = [[u0, v0, u1, v0], [u1, v0, u1, v1], [u1, v1, u0, v1], [u0, v1, u0, v0]];
      for (let s = 0; s < 4; s++) {
        const sd = sides[s];
        const len = Math.hypot(sd[2] - sd[0], sd[3] - sd[1]);
        let n = Math.max(3, Math.round(len / sp));
        const door = (s === entry || s === exit);
        /* TEK sayı yalnız KAPILI kenarda zorlanır (kapı tam ortaya
           gelsin); kapısız kenarda zorlamak segment adedini boşa
           büyütüyordu — adet düşürmek bu turun ana isteklerinden biri. */
        if (door && n % 2 === 0) n++;
        const mid = (n - 1) / 2;
        A.line(kind, sd[0], sd[1], sd[2], sd[3], n,
          { skip: door ? [mid] : [], slack: op.slack || 0.82, exact: true });
        if (!door) continue;
        const t = (mid + 0.5) / n;
        const gx = sd[0] + (sd[2] - sd[0]) * t, gy = sd[1] + (sd[3] - sd[1]) * t;
        const w = len / n;
        const dx = (sd[2] - sd[0]) / len, dy = (sd[3] - sd[1]) / len;
        gates.push({ x: U(gx), y: V(gy), w: E.P * w, side: s, enc: eid });
        const nx2 = NORM[s][0], ny2 = NORM[s][1];
        cseg(gx + nx2 * w * 1.60, gy + ny2 * w * 1.60,
          gx - nx2 * w * 0.55, gy - ny2 * w * 0.55, w * 0.40);        cseg(gx - dy * w * 1.5, gy + dx * w * 1.5, gx + dy * w * 1.5, gy - dx * w * 1.5, w * 0.40);
        if (op.post) {
          /* SÖVE ÇİT HATTININ ÜZERİNE KONMAZ — DIŞ NORMALE KAYAR.
             İlk sürüm söveyi kenar doğrultusunda 0,62w öteye koyuyordu ve
             komşu panel merkezi w ötede, yarı uzunluğu w/2−3, yani iç
             kenarı ağız merkezinden 56 px'te bitiyor; sırf hat üzerinde
             durduğu için söve (66±11 px) panelle HER ZAMAN çakışıyordu ve
             `fits` dördünü de reddediyordu: dört çevrenin hiçbirinde kapı
             lambası yoktu (deterministik, yani "bazen olmuyor" değil HİÇ
             olmuyordu). Artık ağız kenarında (±0,5w) ve çitin bir tık
             DIŞINDA durur — kapı feneri fiziksel olarak da oraya konur. */
          const pT = PROP_TYPES[op.post] || { hx: 11 };
          const cT = PROP_TYPES[kind] || { hz: 8 };
          const nrm = (cT.hz + pT.hx + 6) / E.P;
          for (const sg of [1, -1]) {
            add(op.post, gx + dx * w * 0.5 * sg + nx2 * nrm,
              gy + dy * w * 0.5 * sg + ny2 * nrm, { exact: true, onPath: true });
          }
        }
      }
      if (op.corner) {
        for (const c of [[u0, v0], [u1, v0], [u1, v1], [u0, v1]]) add(op.corner, c[0], c[1], { exact: true });
      }
    },

    /* ── YOL KENARI: nesne yolun İÇİNE değil KENARINA dizilir ──
       Fener direği, kilometre taşı, çit kazığı yolun kendi eğrisinden
       örneklenir ve dik doğrultuda `off` kadar itilir; taraf dönüşümlü
       (aynı tarafta sıralanan direkler "çit" okunur, yol kenarı değil). */
    wayside(kind, pts, n, off, o) {
      fillDepth++;
      const op = o || {};
      for (let i = 0; i < n; i++) {
        const t = op.t0 != null
          ? op.t0 + (op.t1 - op.t0) * (n === 1 ? 0.5 : i / (n - 1))
          : (i + 0.5) / n;
        const p = polyAt(pts, t);
        const s = op.side || ((i % 2) ? -1 : 1);
        add(kind, p[0] - p[3] * off * s, p[1] + p[2] * off * s,
          { exact: true, rot: op.rot, slack: op.slack });
      }
      fillDepth--;
    },

    /* ── EV + AVLUSU ────────────────────────────────────────
       Kullanıcının cümlesi: "haritadaki bir evin etrafında mantıklı
       şeyler durmalı." Eskiden ev tek başına konuyor, odun/fıçı/kızak
       ise ±0,05 birim ötede rastgele bir yöne düşüyordu — kapının
       önüne, çatının altına, komşunun avlusuna.

       Bir ev burada bir YERLEŞİM olur: kapı yönü (`face`) bellidir,
       kapı önü sahanlığı KORİDORDUR (boş kalır), servis nesneleri
       (odun yığını, fıçı, kızak) YAN ve ARKA duvara yaslıdır, fener
       kapının yanında durur — önünde değil. Avlu çiti istenirse tek
       giriş/tek çıkışla kurulur. */
    homestead(kind, u, v, o) {
      const op = o || {}, T = PROP_TYPES[kind];
      if (!T) return null;
      const FA = { south: 0, west: 1, north: 2, east: 3 };
      const f = FA[op.face || 'south'] || 0;
      const ca = Math.cos(f * Math.PI / 2), sa = Math.sin(f * Math.PI / 2);
      /* yerel (sağ, ön) → dünya. Ön yön güneydir (v+), f çeyrek döner. */
      const w2 = (a, b) => [u + a * ca - b * sa, v + a * sa + b * ca];
      const hxU = T.hx / E.P, hzU = T.hz / E.P;
      const rot = op.rot != null ? op.rot : f * (Math.PI / 2);
      const home = add(kind, u, v, { exact: true, rot });
      if (!home) return null;
      /* kapı önü: sahanlık + yaklaşma koridoru. Yapının KENDİ kutusuna
         değmemesi için eşikten 0,026 birim ileride başlar (ilk sürüm
         0,014'te başlıyor ve r 0,026 ile evin kendisini "yol üstünde"
         gösteriyordu — tezgahta yedi ihlal). */
      const d0 = w2(0, hzU + 0.026), d1 = w2(0, hzU + 0.072);
      cseg(d0[0], d0[1], d1[0], d1[1], 0.020);
      /* servis nesneleri: yan duvar → yan duvar → arka duvar sırası */
      const svc = op.svc || [];
      const spots = [
        [hxU + 0.015, -hzU * 0.35], [-hxU - 0.015, -hzU * 0.35],
        [hxU * 0.45, -hzU - 0.017], [-hxU * 0.45, -hzU - 0.017],
        [hxU + 0.015, hzU * 0.45], [-hxU - 0.015, hzU * 0.45],
      ];
      for (let i = 0; i < svc.length && i < spots.length; i++) {
        const p = w2(spots[i][0], spots[i][1]);
        add(svc[i], p[0], p[1], { exact: true, rot: rot + (i < 2 || i > 3 ? Math.PI / 2 : 0) });
      }
      /* kapı feneri: eşiğin YANINDA */
      if (op.lamp !== false) {
        const lp = w2(hxU * 0.86, hzU + 0.020);
        add(op.lamp || 'fener', lp[0], lp[1], { exact: true });
      }
      if (op.yard) {
        const yx = op.yard[0], yy = op.yard[1];
        const c0 = w2(-yx, -yy), c1 = w2(yx, yy);
        const FS = ['south', 'west', 'north', 'east'];
        A.enclosure(op.fence || 'cit',
          Math.min(c0[0], c1[0]), Math.min(c0[1], c1[1]),
          Math.max(c0[0], c1[0]), Math.max(c0[1], c1[1]),
          { entry: FS[f], exit: FS[(f + 2) % 4], seg: op.seg, post: op.gatePost });
      }
      return home;
    },

    /* KAPALI ÇEVRE YASAK: her kenarda en az iki segment atlanır.
       Kapalı bir avluda doğan oyuncu joystick'i "takılmış" sanır.
       (Eski yol; yeni planlar `enclosure` kullanır.) */
    rect(kind, u0, v0, u1, v1, o) {
      const op = o || {}, seg = op.seg || 0.030;
      const gates = op.gates || [1, 2];
      const sides = [[u0, v0, u1, v0], [u1, v0, u1, v1], [u1, v1, u0, v1], [u0, v1, u0, v0]];
      for (let s = 0; s < 4; s++) {
        const sd = sides[s];
        const len = Math.hypot(sd[2] - sd[0], sd[3] - sd[1]);
        const n = Math.max(3, Math.round(len / seg));
        const skip = [];
        for (let q = 0; q < gates.length; q++) skip.push((gates[q] + s) % n);
        A.line(kind, sd[0], sd[1], sd[2], sd[3], n, { skip, slack: op.slack || 0.8 });
      }
    },

    /* ızgara dizi. ARALIK ÖLÇÜLÜR VE ARTIK ZORLANIR: engel yarı
       genişliği + oyuncu 19 → merkez aralığı en az (hx+19)×2 dünya px.
       Eskiden bu yalnız YORUMDU ve çağıran elle uyuyordu; ilk ihlalde
       (tuzlada 6×4 tuz sütunu) aradan geçilemeyen bir tarla oluşuyordu.
       Şimdi kolon/satır sayısı aralığa göre KISILIR. */
    grid(kind, u0, v0, u1, v1, cols, rows, o) {
      fillDepth++;
      const op = o || {};
      const T0 = PROP_TYPES[typeof kind === 'string' ? kind : kind[0]] || { hx: 20, hz: 20 };
      const need = (Math.max(T0.hx, T0.hz) + 19) * 2 / E.P;
      cols = Math.max(1, Math.min(cols, Math.floor(Math.abs(u1 - u0) / need) + 1));
      rows = Math.max(1, Math.min(rows, Math.floor(Math.abs(v1 - v0) / need) + 1));
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const u = cols === 1 ? (u0 + u1) / 2 : u0 + (c / (cols - 1)) * (u1 - u0);
          const v = rows === 1 ? (v0 + v1) / 2 : v0 + (r / (rows - 1)) * (v1 - v0);
          add(kind, u, v, { jitter: op.jitter, slack: op.slack, exact: op.exact });
        }
      }
      fillDepth--;
    },

    /* merkez halkasına serpme: göbek boş kalır */
    scatter(kind, n, r0, r1, o) {
      fillDepth++;
      const op = o || {};
      for (let i = 0; i < n; i++) {
        const a = rnd() * TAU, rr = r0 + rnd() * (r1 - r0);
        add(kind, 0.5 + Math.cos(a) * rr, 0.5 + Math.sin(a) * rr, { slack: op.slack });
      }
      fillDepth--;
    },

    /* ışınsal parmaklık: iki ucu AÇIK (kapalı çevre yok), segmentler
       uç uca ve DİK (exact) — "çitler düzgün düzenli" ölçütü. */
    radialFence(cu, cv, r0, r1, ang) {
      const c = Math.cos(ang), s = Math.sin(ang);
      A.line('cit', cu + c * r0, cv + s * r0, cu + c * r1, cv + s * r1,
        Math.max(2, Math.round((r1 - r0) / 0.036)), { slack: 0.8, exact: true });
    },
  };

  plan.props(A);
  out.decor = decor;
  out.fxA = fxA;
  out.rej = rej;
  out.rejFill = rejFill;
  out.rejPath = rejPath;
  out.clears = clears;
  out.gates = gates;
  out.encRects = encRects;
  return out;
}

/* Bütçe: adet kademeden gelir, STRES'ten gelmez (FLEX 0).
   Yüksek pri = önce atılan süs. pri 0 (yapı, çit, mihrap, sandık,
   görev yuvası) asla atılmaz: avluda delik açmak düzeni anlamsız,
   çarpışmayı yalancı yapar. */
function thinProps(list, cap) {
  if (!list) return [];
  const lim = cap || Quality.budget('props') || 260;
  let out = list;
  const drop = new Set();
  if (list.length > lim) {
    /* v47: GRUP BÜTÜN ATILIR. Önce en yüksek grup pri'si, eşitse SONRA
       ilan edilen. Grup 0 (çekirdek) ve gp 0 asla atılmaz. */
    const G = new Map();
    for (const p of list) {
      const g = p.g | 0;
      if (!G.has(g)) G.set(g, { id: g, gp: p.gp | 0, n: 0 });
      G.get(g).n++;
    }
    const cand = [...G.values()].filter((x) => x.id && x.gp > 0).sort((a, b) => b.gp - a.gp || b.id - a.id);
    let n = list.length;
    for (const c of cand) { if (n <= lim) break; drop.add(c.id); n -= c.n; }
    out = list.filter((p) => !drop.has(p.g | 0));
    /* SON ÇARE: çekirdek tavanı aşıyorsa eski pri sırası — ama ARTIK
       ÖLÇÜLÜR: kesilen üye sayısı `partial`a yazılır (tezgah kırmızı). */
    let partial = 0;
    if (out.length > lim) {
      const keep = [];
      for (let pri = 0; pri <= 3 && keep.length < lim; pri++) {
        for (let i = 0; i < out.length && keep.length < lim; i++) if ((out[i].pri | 0) === pri) keep.push(out[i]);
      }
      partial = out.length - keep.length;
      out = keep;
    }
    out.partial = partial;
  }
  if (out !== list) {
    for (const k of ['rej', 'rejFill', 'rejPath', 'clears', 'gates', 'encRects', 'decor', 'fxA']) out[k] = list[k];
  }
  out.dropped = drop;
  return out;
}

/* SÜS BÜTÇESİ: atılan grubun süsü de gider; engel kutusuna düşen süs
   temizlenir (engel süsten SONRA konmuş olabilir); tavan aşılırsa en
   yüksek dp'den EŞİT ARALIKLA seyreltilir (öbek incelir, yok olmaz). */
function thinDecor(list, cap) {
  const src = list.decor || [];
  const lim = cap || Math.max(240, Math.round((Quality.budget('particles') || 450) * 0.7));
  const dropped = list.dropped || new Set();
  let d = src.filter((q) => {
    if (dropped.has(q.g | 0)) return false;
    for (let i = 0; i < list.length; i++) {
      const o = list[i], T = PROP_TYPES[o.kind];
      if (T.pass) continue;
      if (Math.abs(o.x - q.x) < (o.hx || T.hx) - 3 && Math.abs(o.y - q.y) < (o.hz || T.hz) - 3) return false;
    }
    return true;
  });
  /* HÜCRE KORUMASI: seyreltme bir hücreyi 3 süsün altına İNDİRMEZ —
     aksi hâlde düşük kademede kapsam %48'e düşüyordu (ölçüldü). */
  const cell = (q) => Math.min(7, Math.max(0, ((q.y - 140) / 500) | 0)) * 8 + Math.min(7, Math.max(0, ((q.x - 140) / 500) | 0));
  const cnt = new Int32Array(64);
  for (const q of d) cnt[cell(q)]++;
  for (let dp = 3; dp >= 0 && d.length > lim; dp--) {
    const pool = d.filter((q) => q.dp === dp);
    const over = d.length - lim;
    if (!pool.length) continue;
    const kill = new Set();
    const step = Math.max(1, pool.length / Math.min(over, pool.length));
    for (let pass = 0; pass < 3 && kill.size < over; pass++) {
      for (let f = pass * 0.37 * step; f < pool.length && kill.size < over; f += step) {
        const q = pool[f | 0], c = cell(q);
        if (kill.has(q) || cnt[c] <= 3) continue;
        kill.add(q); cnt[c]--;
      }
    }
    d = d.filter((q) => !kill.has(q));
  }
  if (d.length > lim) d = d.slice(0, lim);
  return d;
}

/* FX ÇIPALARI: planın ilan ettiği + HAYATTA KALAN engellerden türeyen.
   Sıra ÖNEM sırasıdır (render kademe tavanında sondan keser, sandık
   parıltısı hep kalır). Renk EKRAN uzayında eklenen yoğunluktur (v43). */
const FX_MODE = { hale: 0, atesbocegi: 1, kor: 2, parilti: 3, toz: 4 };
function fxList(list) {
  const out = [];
  const dropped = list.dropped || new Set();
  const P = (mode, x, y, z, ph, size, r, h, col) => out.push([x, z, y, mode, ph, size, r, h, col[0], col[1], col[2]]);
  for (const p of list) {
    const T = PROP_TYPES[p.kind], ph = (p.x * 0.0071 + p.y * 0.0113) % 6.283;
    if (T.lamp) P(0, p.x, p.y, (p.h || T.h) * 0.8, ph, 74, 0, 0, [0.30, 0.22, 0.12]);
    else if (p.kind === 'kazan') P(0, p.x, p.y, 44, ph, 56, 0, 0, [0.14, 0.12, 0.08]);
  }
  const COL = { 1: [0.55, 0.62, 0.22], 2: [0.7, 0.3, 0.08], 4: [0.22, 0.2, 0.26] };
  for (const a of list.fxA || []) {
    if (dropped.has(a.g | 0)) continue;
    const m = FX_MODE[a.mode] != null ? FX_MODE[a.mode] : 1;
    for (let i = 0; i < a.n; i++) {
      const ph = (a.x * 0.37 + a.y * 0.23 + i * 1.9) % 6.283;
      P(m, a.x + Math.cos(i * 2.4) * a.r * 0.3, a.y + Math.sin(i * 2.4) * a.r * 0.3, m === 2 ? 12 : 10, ph,
        m === 2 ? 7 : (m === 4 ? 5 : 9), a.r, a.h, a.col || COL[m] || COL[1]);
    }
  }
  return out;
}

/* SÜS TABANI: her süsün altına yumuşak temas lekesi (makroya pişer) */
function paintDecorBases(g, E, list) {
  if (!list || !list.length) return;
  g.save();
  g.beginPath(); g.rect(E.B, E.B, E.P, E.P); g.clip();
  g.fillStyle = 'rgba(6,8,6,0.20)';
  for (const d of list) {
    const r = 26 * (d.s || 1);
    g.beginPath(); g.ellipse(d.x + 5, d.y + 7, r, r * 0.68, 0, 0, 6.283); g.fill();
  }
  g.restore();
}

/* Makro katman: tüm haritalar için ortak SIRA (boyacılar değişir). */
function paintMacro(g, E, plan, Q, list, sat) {
  const K = kit(g, E, Q);
  g.save();
  g.beginPath(); g.rect(E.B, E.B, E.P, E.P); g.clip();
  plan.floor(g, E, Q, K);
  g.restore();
  grade(g, E, sat);
  /* KENAR: yalnız oyun alanının DIŞI. evenodd kırpma ZORUNLU — kenar
     boyacıları dış boşluğu tam tuval olarak doldurur, kırpma olmadan
     zemini siliyorlar (bir kez bu tuzağa düşüldü: göbek simsiyah çıktı). */
  g.save();
  g.beginPath(); g.rect(0, 0, E.full, E.full); g.rect(E.B, E.B, E.P, E.P);
  g.clip('evenodd');
  plan.edge(g, E, Q);
  g.restore();
  threshold(g, E, Q.rim, 10);
  if (list && list.length) {
    g.save();
    g.beginPath(); g.rect(E.B, E.B, E.P, E.P); g.clip();
    paintDecorBases(g, E, list.decorKept);
    paintPropBases(g, E, list, PROP_TYPES);
    g.restore();
  }
}

function paintDetail(dg, id, plan, dpot, tile) {
  const D = denv(dpot, tile, seedOf(id) ^ 0x5f3a);
  SURF[plan.surf](dg, D);
  tileGrid(dg, D, GRID);
  return D;
}

/* ═══════════════════════════════════════════════════════════
   YENİ SÖZLEŞME — HD çift katman.
   props DÜNYA koordinatındadır (arena merkezi 0,0); boyacı tuval
   koordinatında üretir, dönüşüm burada TEK yerde yapılır.
   ═══════════════════════════════════════════════════════════ */
/* CANVAS2D KOMUTLARI TEMBELDİR — ÖLÇERKEN FLUŞ ZORUNLU (2026-09-01).
   Faz zamanlayıcıları ilk sürümde komut GÖNDERİMİNİ ölçüyordu, rasterleşmeyi
   değil: mezarlık "makro 26 ms" okurken toplam 530 ms'ti ve aradaki 419 ms
   hiçbir faza yazılmıyordu. Rasterleşme ilk `getImageData`ya kadar
   ertelenir, yani maliyet o çağrıyı yapanın sırtına biner. Tek piksellik
   bir okuma kuyruğu boşaltır ve fazı kendi maliyetiyle baş başa bırakır. */
function flush(g) { g.getImageData(0, 0, 1, 1); }

export function bakeArenaMap(id, opts = {}) {
  const plan = PLANS[id] || PLANS.mezarlik;
  const Q = PAL[id] || PAL.mezarlik;
  const P = opts.play || 4000, B = opts.border != null ? opts.border : 140;
  const full = P + B * 2;
  /* ÇÖZÜNÜRLÜK KADEMEDEN GELİR — kullanıcı seçimi (2026-09-01):
     üst kademede KALİTE ÖNCELİKLİ (~60 MB doku bütçesi).

     Makro 2048² KALIR ve bu bilerek: doku 2'nin kuvveti olmadığında bazı
     sürücülerde mip geçişi eğri bir karartma sınırı gibi görünüyor
     (render3d._updateGround dersi). Bütçe bu yüzden DETAY katmanına
     harcanır — "HD" hissi zaten oradan gelir:

       kademe | makro | detay | karo  | örnek/px | VRAM (mip dahil)
       high   | 2048² | 2048² | 640px |   3,20   | ~43 MB
       mid    | 2048² | 1024² | 512px |   2,00   | ~28 MB
       low    | 1536² | 1024² | 512px |   2,00   | ~19 MB

     Karo 640 (512 değil) yalnız üst kademede: örnek yoğunluğu 3,2'ye
     çıkarken tekrar periyodu da 640 px'e uzar (telefon ekranı ~400 px,
     yani tekrar bir buçuk ekranda bir gelir). Tekrar deseni ayrıca
     şaderde ikinci bir ölçekle maskelenir (uDetailBreak). */
  const hi = Quality.budget('tex') >= 1024;
  const pot = opts.pot || (hi ? 2048 : Quality.budget('tex') >= 512 ? 2048 : 1536);
  const RES = pot / full;

  const _ta = performance.now();
  const c = document.createElement('canvas');
  c.width = pot; c.height = pot;
  const g = c.getContext('2d');
  g.scale(RES, RES);
  let msAlloc = performance.now() - _ta;
  const E = env(g, P, B, seedOf(id));
  E.res = RES;

  const _tl = performance.now();
  const list = thinProps(layout(E, plan), opts.propCap);
  const decorL = thinDecor(list, opts.decorCap);
  const fxL = fxList(list);
  list.decorKept = decorL;
  const msLayout = performance.now() - _tl;
  const T = TONE[id] || { night: 0, sat: 1 };
  const _tm = performance.now();
  paintMacro(g, E, plan, Q, list, (plan.sat != null ? plan.sat : 1) * (T.sat != null ? T.sat : 1));
  night(g, E, (plan.night != null ? plan.night : 0.22) + T.night);
  worldTint(g, E, opts.world);
  closeOut(g, E, Q.glow);
  const msMacro = (flush(g), performance.now() - _tm);

  /* ══ DÖŞENEN DETAY ══ İki kaynak, TEK sözleşme (canvas + mid + tile).
     AI karosu varsa prosedürel yüzey HİÇ pişmez: aynı yüzeyi iki kez
     üretip birini çöpe atmak, görev açılışına bedava 200-400 ms bindirir.
     Isıtma çağrısı (opts.ai === false) bilerek prosedürel yolda kalır —
     ısıtmanın amacı boyacı kitinin kod yollarını derletmek (perf kuralı 5). */
  let tile, dc, dmid, msDetail = 0;
  const ai = opts.ai === false ? null : aiDetail(id);
  if (ai) {
    dc = ai.canvas;
    tile = opts.tile || ai.tile;
    dmid = ai.mid;
  } else {
    /* Karo ve detay çözünürlüğü kademeden gelir (tablo yukarıda). */
    tile = opts.tile || (hi ? 640 : 512);
    const dpot = opts.detailPot || (hi ? 2048 : 1024);
    const _ta2 = performance.now();
    dc = document.createElement('canvas');
    dc.width = dpot; dc.height = dpot;
    const _dg = dc.getContext('2d');
    msAlloc += performance.now() - _ta2;
    const _td = performance.now();
    paintDetail(_dg, id, plan, dpot, tile);
    msDetail = (flush(_dg), performance.now() - _td);
    /* TAM TUVAL OKUMASI BİR MALİYET KALEMİDİR (2048² = 16 MB geri okuma):
       iki tuvalin tahsisi/sıfırlanmasıyla birlikte ölçülür, yoksa faz
       sütunlarının toplamı gerçek toplamı tutmaz (~75-100 ms atfedilmemiş
       kalıyordu). Tabloya bakan kişi BÜTÜN maliyeti görmek zorunda. */
    const _tr = performance.now();
    dmid = linearMean(_dg, dpot);
    msAlloc += performance.now() - _tr;
  }

  const off = B + P / 2;
  const decor = decorL.map((d) => ({ kind: d.kind, x: d.x - off, y: d.y - off, rot: d.rot, s: d.s }));
  const fx = fxL.map((f) => { f[0] -= off; f[2] -= off; return f; });
  const props = [];
  for (let i = 0; i < list.length; i++) {
    const p = list[i];
    props.push({ kind: p.kind, x: p.x - off, y: p.y - off, rot: p.rot, hx: p.hx, hz: p.hz, h: p.h, sx: p.sx, sz: p.sz, onPath: p.onPath, seq: p.seq, pri: p.pri | 0 });
  }
  /* Koridorlar DÜNYA koordinatında dışarı verilir: tezgah bunları nesne
     listesiyle YAN YANA ölçer ("yolun ortasında ne var" sorusunun
     cevabı ancak iki liste aynı uzayda olduğunda okunur). */
  const cl = list.clears || [];
  const clears = [];
  for (let i = 0; i < cl.length; i++) {
    clears.push({ x0: cl[i].x0 - off, y0: cl[i].y0 - off, x1: cl[i].x1 - off, y1: cl[i].y1 - off, r: cl[i].r, seq: cl[i].seq });
  }
  const gt = list.gates || [];
  const gates = [];
  for (let i = 0; i < gt.length; i++) {
    gates.push({ x: gt[i].x - off, y: gt[i].y - off, w: gt[i].w, side: gt[i].side, enc: gt[i].enc });
  }
  const er = list.encRects || [];
  const encRects = [];
  for (let i = 0; i < er.length; i++) {
    encRects.push({ x0: er[i].x0 - off, y0: er[i].y0 - off, x1: er[i].x1 - off, y1: er[i].y1 - off, enc: er[i].enc });
  }
  return {
    macro: c, detail: dc, detailMid: dmid, tile, props, clears, gates, encRects, decor, fx,
    partial: list.partial | 0, droppedGroups: list.dropped ? list.dropped.size : 0,
    detailSrc: ai ? 'ai' : 'proc',
    msMacro, msDetail, msLayout, msAlloc,
    rej: list.rej || {}, rejFill: list.rejFill || {},
    rejPath: list.rejPath || {}, mapId: id, play: P, border: B,
  };
}

/* ═══════════════════════════════════════════════════════════
   DETAY KATMANININ LİNEER ORTALAMASI — shader'ın kendini normalize
   etmesi. ÖLÇÜM DERSİ (oyunda görüldü, TEZGAHTA GÖRÜNMEDİ): tezgah
   pişmiş tuvali sRGB okuyup "ortalama 128 → nötr çarpan" diyordu, ama
   shader dokuyu sRGB → LİNEER çözerek örnekler (sRGB 128 ≈ lineer
   0,216), yani çarpan 1,0 yerine ~0,49 çıkıyor ve zemin oyunda
   tezgahın YARISI kadar parlak oluyordu. Artık dokunun kendi lineer
   ortalamasına bölünür: her harita kendini normalize eder.
   ═══════════════════════════════════════════════════════════ */
function linearMean(g, S) {
  const d = g.getImageData(0, 0, S, S).data;
  let s = 0, n = 0;
  for (let i = 0; i < d.length; i += 4 * 31) {
    const v = (d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114) / 255;
    s += v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    n++;
  }
  return n ? Math.max(0.02, s / n) : 0.216;
}

/* ── ESKİ SÖZLEŞME: tek tuval (tezgah + önizleme).
   İki katmanı overlay ile birleştirir, yani önizleme oyuncunun GÖRDÜĞÜ
   bileşiği gösterir. */
export function paintArenaMap(id, opts = {}) {
  const plan = PLANS[id] || PLANS.mezarlik;
  const Q = PAL[id] || PAL.mezarlik;
  const P = opts.play || 4000, B = opts.border != null ? opts.border : 140;
  const full = P + B * 2;
  const RES = opts.pot ? opts.pot / full : (opts.res || 0.5);
  const px = opts.pot || Math.round(full * RES);
  const c = document.createElement('canvas');
  c.width = px; c.height = px;
  const g = c.getContext('2d');
  g.scale(RES, RES);
  const E = env(g, P, B, seedOf(id));
  E.res = RES;
  const list = thinProps(layout(E, plan), opts.propCap);
  const T = TONE[id] || { night: 0, sat: 1 };
  paintMacro(g, E, plan, Q, list, (plan.sat != null ? plan.sat : 1) * (T.sat != null ? T.sat : 1));
  {
    const tile = 512, dpot = 1024;
    const dc = document.createElement('canvas');
    dc.width = dpot; dc.height = dpot;
    paintDetail(dc.getContext('2d'), id, plan, dpot, tile);
    g.save();
    g.globalCompositeOperation = 'overlay';
    g.globalAlpha = opts.detailAlpha != null ? opts.detailAlpha : 0.9;
    const pat = g.createPattern(dc, 'repeat');
    const mtx = new DOMMatrix();
    g.fillStyle = pat;
    pat.setTransform(mtx.scale(tile / dpot, tile / dpot));
    g.fillRect(0, 0, full, full);
    g.restore();
  }
  night(g, E, (plan.night != null ? plan.night : 0.22) + T.night);
  worldTint(g, E, opts.world);
  closeOut(g, E, Q.glow);
  return c;
}
