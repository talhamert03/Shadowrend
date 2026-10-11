/* ═══════════════════════════════════════════════════════════
   render3d.js — Three.js 3D Render Motoru

   Oyunun tüm oynanış sahnesi (zemin, Kurt/oyuncu, düşmanlar,
   mermiler, cevherler, parçacıklar, alanlar) burada WebGL ile
   çizilir. 2D <canvas id="game"> katmanı yalnız uçan hasar
   yazıları + can barı + joystick için şeffaf bir üst katman
   olarak kalır (main.js render()).

   Koordinat eşlemesi: oyun-dünyası (x, y) → three (x, 0, z=y).
   Kamera: yukarıdan hafif açılı ortografik — eski 2D görüş
   alanı (viewL/viewR/viewT/viewB) matematiğiyle uyumlu kalması
   için ölçek birebir korunur (1 dünya birimi ≈ 1 ekran pikseli).
   ═══════════════════════════════════════════════════════════ */

import * as THREE from 'three';
import { TMP, AXIS_Y, hexOf, commitInstanced, uploadInstances,
         Quality, Perf, Warmup, precompileScene, budgetTextures } from './perf.js?v=20260930m';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { clone as skeletonClone } from 'three/addons/utils/SkeletonUtils.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { CHARACTERS, DEFAULT_CHAR, COLORS, DRAGON, HAZARD_CAP } from './config.js?v=20260930m';
import { loadDecimatedHero, loadDecimatedProp, stripRootMotion } from './heroModel.js?v=20260930m';
import { CHAR_SCALE, BOSS_SCALE, scaleCharTable, applyCharLook, applyCharLookTo } from './charLook.js?v=20260930m';
import { alignLongAxisToX } from './propAlign.js?v=20260930m';
import { PROP_TYPES } from './arenaProps.js?v=20260930m';
import { propGeometries, humanGeometry, setPropDetail } from './propModels.js?v=20260930m';
import { ShieldDome } from './shieldDome.js?v=20260930m';
import { bossPose, BOSS_POSE, dragonPose, DRAGON_POSE } from './bossMotion.js?v=20260930m';
import { decorGeometries, DECOR_SWAY, DECOR_SCALE } from './decorModels.js?v=20260930m';
import { FieldChestView } from './fieldChest3d.js?v=20260930m';

/* ═══ v47 RÜZGÂR: `project_vertex` yerine — örnek matrisinden SONRA dünya
   uzayında salla (ağaç ve ot aynı rüzgârı paylaşır, faz dünya konumundan:
   çayır boyunca dalga geçer). Genlik yükseklik² (dip sabit, zemin teması
   bozulmaz). uPush > 0: oyuncu otu yarar. Tek program (cache key sabit),
   malzeme başına yalnız uniform farklı. ═══ */
const TREE_SWAY = { agac: 1, fidan: 1 };
const WIND_VS = `
vec4 mvPosition = vec4( transformed, 1.0 );
#ifdef USE_INSTANCING
  mvPosition = instanceMatrix * mvPosition;
#endif
float khH = max( transformed.y, 0.0 );
float khP = uTime * 1.55 + mvPosition.x * 0.011 + mvPosition.z * 0.007;
float khW = sin( khP ) * 0.62 + sin( khP * 2.3 + 1.3 ) * 0.38;
mvPosition.x += khW * khH * khH * uSway;
mvPosition.z += khW * khH * khH * uSway * 0.45;
if ( uPush > 0.0 ) {
  vec2 khD = mvPosition.xz - uPlayer;
  float khL = length( khD ) + 0.001;
  float khF = ( 1.0 - smoothstep( 16.0, 72.0, khL ) ) * min( khH, 30.0 ) * uPush;
  mvPosition.xz += khD / khL * khF;
  mvPosition.y -= khF * 0.3;
}
vKhW = mvPosition.xyz;
mvPosition = modelViewMatrix * mvPosition;
gl_Position = projectionMatrix * mvPosition;
`;
/* ═══ v49 AĞAÇ ŞEFFAFLIĞI: oyuncunun ÖNÜNDEKİ (kameraya yakın) taç, onun
   silueti üstüne düştüğü yerde 4×4 Bayer ile seyrelir (en çok %72). Sıralama
   yok, saydamlık yok — discard: opak geçişte kalır, maliyeti ölçülemez.
   İzdüşüm: 44° kamera, y yüksekliğindeki nokta zeminde z − 0,966·y'yi örter;
   kahramanın görünen gövdesi zeminde [z−88, z] bandına düşer. ═══ */
const FADE_FS = `
if ( uFade > 0.0 && vKhW.y > 30.0 && vKhW.z > uPlayer.y + 6.0 ) {
  vec2 khQ = vec2( vKhW.x - uPlayer.x, ( vKhW.z - vKhW.y * 0.966 ) - ( uPlayer.y - 44.0 ) );
  float khR = length( khQ * vec2( 1.0, 0.82 ) );
  float khK = 1.0 - smoothstep( 54.0, 98.0, khR );
  if ( khK > 0.0 ) {
    vec2 khC = mod( floor( gl_FragCoord.xy ), 4.0 );
    vec2 khA = mod( khC, 2.0 ), khB2 = floor( khC * 0.5 );
    float khBy = ( mod( khA.x * 2.0 + khA.y * 3.0, 4.0 ) * 4.0 + mod( khB2.x * 2.0 + khB2.y * 3.0, 4.0 ) ) / 16.0;
    if ( khBy < khK * uFade * 0.72 ) discard;
  }
}
`;
/* ═══ v47 FX: hale · ateşböceği · kor · sandık parıltısı · toz. Hareket
   tamamen vertex şaderinde (kare başına CPU yok). POI'ye çivili; ateşböceği,
   kor ve toz OYUNCUYA YAKLAŞINCA SÖNER (kapatılan atmoPoints dersi:
   "oyuncunun üstünde yıldızımsı noktalar"). Renk EKRAN uzayında eklenen
   yoğunluktur: ShaderMaterial çıktıyı kodlamaz, additive ham değeri toplar. */
const FX_VS = `
attribute vec4 aA; attribute vec4 aB; attribute vec3 aC;
uniform float uTime; uniform vec2 uPlayer;
varying vec2 vUv; varying vec3 vCol;
void main() {
  float m = aA.w, ph = aB.x, sz = aB.y, R = aB.z, H = aB.w, t = uTime, a = 1.0;
  vec3 p = aA.xyz;
  if (m < 0.5) { a = 0.8 + 0.2 * sin(t * 6.3 + ph) * sin(t * 2.1 + ph * 1.7); }
  else if (m < 1.5) { p += vec3(sin(t * 0.31 + ph) * R, sin(t * 0.83 + ph * 2.0) * H * 0.3 + H * 0.45, cos(t * 0.27 + ph * 1.3) * R); a = 0.12 + 0.88 * pow(max(0.0, sin(t * 1.15 + ph * 3.0)), 3.0); }
  else if (m < 2.5) { float l = fract(t * 0.21 + ph * 0.159); p += vec3(sin(l * 5.0 + ph) * R * 0.5, l * H, cos(l * 4.0 + ph) * R * 0.5); a = sin(l * 3.14159); sz *= 1.0 - l * 0.55; }
  else if (m < 3.5) { float s = pow(max(0.0, sin(t * 1.6 + ph)), 30.0); a = s; sz *= 0.5 + s; }
  else { p += vec3(sin(t * 0.13 + ph) * R, H * 0.5 + sin(t * 0.21 + ph) * H * 0.4, cos(t * 0.11 + ph * 1.1) * R); a = 0.45 + 0.55 * sin(t * 0.7 + ph); }
  if ((m > 0.5 && m < 2.5) || m > 3.5) a *= smoothstep(40.0, 150.0, distance(p.xz, uPlayer));
  vec4 mv = viewMatrix * vec4(p, 1.0);
  mv.xy += position.xy * sz;
  gl_Position = projectionMatrix * mv;
  vUv = position.xy; vCol = aC * max(a, 0.0);
}`;
const FX_FS = `
varying vec2 vUv; varying vec3 vCol;
void main() {
  float d = length(vUv) * 2.0;
  float k = exp(-d * d * 3.0) * (1.0 - smoothstep(0.8, 1.0, d));
  gl_FragColor = vec4(vCol * k, 1.0);
}`;

/* ═══ KAN RUHU (XP) KADEMELERİ ═══
   Üç kademe de kan kırmızısı ailesinde; ayrım boyut + parlaklıkla yapılır
   (c: gövde, g: hale). Kare başına yeniden yaratılmasın diye modül düzeyinde. */
const GEM_SOULS = [
  { c: '#c4162a', k: '#ff7d84', g: '#7e0c18', r: 4.4 },   // sönük ruh — küçük
  { c: '#e01e34', k: '#ff96a0', g: '#9c0f1e', r: 5.6 },   // kızıl ruh
  { c: '#ff2f3e', k: '#ffb3b8', g: '#c01526', r: 7.0 },   // kor ruh — iri
];

/* Billboard quad'ların kendi ekseninde döndürülmesi için (kamera
   quaternion'u × Z ekseni dönüşü). Modül düzeyinde: kare başına
   yaratılmaz. */
const AXIS_Z = new THREE.Vector3(0, 0, 1);
const AXIS_X = new THREE.Vector3(1, 0, 0);
/* Kemik pozu için tek paylaşılan quaternion (sıcak döngüde tahsis yasak) */
const BONE_Q = new THREE.Quaternion();
const CAST_AXIS = { x: AXIS_X, y: AXIS_Y, z: AXIS_Z };

/** Büyük Meshy dokularını (tıpik 2048², PBR başına ~16MB VRAM) mobil GPU
    belleğine sığdırmak için yükleme anında aşağı ölçekler. 4 doku birden
    (albedo+normal+metallic+roughness) 2048²'de ~85MB VRAM tutuyordu — bu da
    düşük bellekli mobil GPU'larda WebGL context kaybına (siyah/bozuk ekran)
    yol açıyordu. maxSize'a indirmek bunu ~5-10× azaltır, gözle fark edilmez
    (karakter ekranda hiçbir zaman bu kadar büyük kaplamaz). */
async function loadTextureDownscaled(url, maxSize) {
  const img = await new Promise((resolve, reject) => {
    const im = new Image();
    im.crossOrigin = 'anonymous';
    im.onload = () => resolve(im);
    im.onerror = reject;
    im.src = url;
  });
  const scale = Math.min(1, maxSize / Math.max(img.naturalWidth, img.naturalHeight));
  const w = Math.max(1, Math.round(img.naturalWidth * scale));
  const h = Math.max(1, Math.round(img.naturalHeight * scale));
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0, w, h);
  const tex = new THREE.CanvasTexture(canvas);
  tex.flipY = false;   // FBX UV'leri flipY=false bekliyor (orijinal TextureLoader davranışıyla eşleşir)
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.anisotropy = 4;
  return tex;
}

/* ═══════════ KARAKTER MODEL KAYDI ═══════════
   Meshy AI'dan yeni bir karakter geldiğinde TEK YAPILACAK ŞEY:
   buraya { dir, file, texPrefix, height } eklemek. Kayıtta olmayan
   karakterler otomatik olarak CHARACTERS[id].colors ile boyanan
   yer tutucu kapsüle düşer — oyun asla kırılmaz. */
const CHARACTER_MODELS = {
  /* Elf Nişancı — GLB (gömülü doku + yürüyüş klibi). Eli boş: silah
     (Ay Yayı) yanında süzülür, bkz. _buildBow / _updateBow. */
  /* BOY 60 → 37 (2026-08-10). Otomatik boy uydurma (_loadCharacterModel'deki
     `scale = height / max(1, size.y)`) bu rigde SESSİZCE başarısız oluyordu:
     okçunun ağı bir Armature düğümünün altında (yerel ölçek 0.01) duruyor ve
     köşeler KEMİKLERLE dönüştürülüyor, yani Box3.setFromObject düğüm kutusunu
     (1.02 birim) ölçüyor. max(1, …) o değeri 1'e kırpınca bölme etkisiz kalıyor
     ve `height` bir HEDEF BOY değil HAM ÖLÇEK çarpanına dönüşüyor.
     Ölçüldü (iskelet dünya kutusu, tepe kemik): okçu 102.5 · Seher 58.8 ·
     Kraliçe 63.3 · Savaşçı 63.7 · Şimşek 64.1 · Gökalev 59.1 — yani okçu
     kadronun ~%60 üstünde duruyordu. 37 = 60 × (61.8 / 100.6), kalan altı
     kahramanın kemik açıklığı ortalamasına oturur.
     NOT: diğer kahramanların değerlerine DOKUNMA — onlarda da bölme kırpılıyor
     (hepsi ~0.98 birimlik Tripo ağı), yani 76 zaten çalışan ham ölçektir. */
  okcu: { glb: 'assets/okcu/okcu_walk.glb', height: 37 },
  /* SEHER (destan) — Tripo ihracı: 390k üçgen, 41 kemik, tek yürüyüş klibi.
     Ham hâli mobil bütçenin ~40 katı olduğu için heroModel.js ile ÇALIŞMA
     ANINDA sadeleştirilir (deri korunarak ~20k üçgen) ve IndexedDB'ye yazılır;
     ikinci açılışta ağ/Draco yok. İmza kılıcı elinde değil, yanında havada
     süzülür — bkz. _buildSword / _updateSword. */
  seher: {
    /* height 76: destan kahramanı silueti çıraklık boyunda durmamalı — tepeden
       kamerada 60 birim, kalabalık sahnede düşmanların arasında kayboluyordu.
       targetTris 34k + 1536² doku: yüz ve zırh detayı bu ölçekte okunur olsun. */
    glb: 'assets/seher/seher.glb', height: 76, floatingWeapon: 'kilic',
    decimate: { key: 'seher', targetTris: 34000, texSize: 1536, headFrom: 0.70 },
  },
  /* ŞİMŞEK (efsane) — Tripo iki yürüyüş klibiyle geldi (Blender NLA ihracı,
     adları anlamsız: "NlaTrack"/"NlaTrack.001"). İkinci klip (.001, 3.7 sn)
     daha "havallı" — gövde/kalça karşı dönüşü belirgin, ilki (2.4 sn) düz bir
     yürüyüş. walkClipName ile açıkça seçilir; walkRate onu oyun temposuna
     çeker (native 3.7 sn/adım sahne temposu için ağır kalıyordu). */
  simsek: {
    glb: 'assets/simsek/simsek.glb', height: 78, floatingWeapon: 'simsek',
    walkClipName: 'NlaTrack.001', walkRate: 1.5,
    decimate: { key: 'simsek', targetTris: 34000, texSize: 1536, headFrom: 0.70 },
  },
  /* SAVAŞÇI (adi) — Tripo ihracı, İSKELETSİZ statik heykel (4.9k üçgen,
     zaten bütçenin altında — decimate YOK). Yürüyüş klibi yok; hareket
     halindeyken _updatePlayer'daki mixer'siz-model dalı basit bir sıçrama
     ekler. Palası elde: floating DEĞİL, bkz. _buildBlade / _updateBlade. */
  /* SAVAŞÇI (adi) — Tripo ihracı, yürüyüş klipli iskeletli model (bkz.
     stripRoot: kalça kemiği klip boyunca kayıyordu, ilk kareye dondurulur).
     Palası SEHER/ŞİMŞEK ile aynı desende yanında havada süzülür — bkz.
     _buildBlade / _updateBlade. */
  savasci: { glb: 'assets/savasci/savasci.glb', height: 76, floatingWeapon: 'pala', stripRoot: true },
  /* GÖKALEV (efsane) — Tripo ihracı, İSKELETLİ (41 eklem) + 'NlaTrack'
     yürüyüş klibi. İlk sürüm iskeletsiz heykeldi; bu sürümde gerçek bacak
     animasyonu var, o yüzden _updatePlayer'ın prosedürel-yürüyüş dalı artık
     devreye girmez (mixer var). stripRoot: Tripo NLA ihraçları kalçayı klip
     boyunca kaydırıyor — SAVAŞÇI'da da aynısı gerekti (yoksa karakter
     yürürken kendi gölgesinin dışına kayıyor). İmza silahı mavi alev. */
  gokalev: {
    glb: 'assets/gokalev/gokalev.glb', height: 76, floatingWeapon: 'alev',
    walkClipName: 'NlaTrack', stripRoot: true,
  },
  /* KARA KAPTAN (efsane) — Tripo ihracı: 585k üçgen, 41 kemik, tek 'NlaTrack'
     yürüyüş klibi (2.375 sn), 1024² gömülü doku. heroModel.js ile çalışma
     anında ~30k üçgene indirilir ve IndexedDB'ye yazılır. Boy 80: kadronun
     en iri silueti — tricorn şapka + omuzlu ceket tepeden kamerada diğer
     kahramanlardan ilk bakışta ayrılmalı. İmza silahı elde değil: yanında
     süzülen hayalet topu (bkz. _buildCannon / _updateCannon).
     walkRate 1.25: 2.375 sn'lik adım sahne temposunda ağır kalıyordu. */
  korsan: {
    glb: 'assets/korsan/korsan.glb', height: 80, floatingWeapon: 'topatar',
    walkClipName: 'NlaTrack', walkRate: 1.25, lift: 0.80,
    decimate: { key: 'korsan', targetTris: 30000, texSize: 1024, headFrom: 0.70 },
  },
  /* GECE KRALİÇESİ (destan) — Tripo ihracı ÇOK PARÇALI: 13 ayrı iskeletli ağ,
     785k üçgen, 13 ayrı doku (heroModel.js'in çok parçalı yolu tam bunun için
     yazıldı — tek ağ varsayan eski sürüm bu modelin yalnız bir parçasını
     çizerdi). Üçgen bütçesi parçaların kaynak oranına göre bölünür.
     Süzülen taç kılıcı: SWORD_SPECS.tackilic (Seher'in rigi, mavi palet). */
  kralice: {
    glb: 'assets/kralice/kralice.glb', height: 76, floatingWeapon: 'tackilic',
    walkClipName: 'NlaTrack', lift: 0.62,
    decimate: { key: 'kralice', targetTris: 30000, texSize: 1024, headFrom: 0.72 },
  },
  /* AYAZ (nadir) — Tripo ihracı: TEK ağ, 140k üçgen, 41 kemik, 'NlaTrack'
     yürüyüş klibi, 1024² gömülü WebP (baseColor + normal + rm).
     Kraliçe'nin 13 parçalı ihracının aksine tek parça, yani heroModel'in
     basit yolundan geçer ve TEK çizim çağrısı eder.
     targetTris 26k: nadir kademe destanın (30-34k) bir tık altında —
     kadronun içinde kalıp bütçeyi büyütmez. Zırh plakalarının kenarı bu
     yoğunlukta hâlâ keskin okunur (ölçüldü).
     lift YOK: gümüş plaka zaten parlak; Kaptan/Kraliçe'deki koyu doku
     sorunu burada yok, emissiveMap eklemek zırhı grileştirirdi. */
  sovalye: {
    glb: 'assets/sovalye/sovalye.glb', height: 76, floatingWeapon: 'yemin',
    walkClipName: 'NlaTrack',
    decimate: { key: 'sovalye', targetTris: 26000, texSize: 1024, headFrom: 0.72 },
  },
  /* SAPANCI (adi) — Tripo ihracı: TEK ağ, 41 kemik, 'NlaTrack' yürüyüş klibi.
     Kadronun EN UCUZ modeli: 4.926 üçgen (ölçüldü), yani hedefin çok altında
     ve fitCluster hiç çalışmaz (heroModel: srcTris <= share*1.25 → kümeleme
     atlanır). decimate kaydı buna rağmen AÇIK: doku küçültme ve IndexedDB
     önbelleği o yoldan geçiyor, kayıt olmasa model her açılışta ham yüklenir.

     height 74 ÖLÇÜLDÜ, tablodan okunmadı: iskelet açıklığı ölçek 1'de 0,833
     → 74 × 0,833 = 61,6 (hedef bant ~59-64). Diğer kahramanlarda 76 çalışıyor
     çünkü onların ağı ~0,98 birim; bu model daha uzun geldiği için 76 yazmak
     onu kadronun bir baş üstünde bırakırdı (bkz. CLAUDE.md okcu dersi).

     lift YOK: doku zaten açık (bej ten + kızıl boyun bezi), emissiveMap
     eklemek koyu tuniği grileştirirdi. İmza silahı Kavlak Sapan — elde
     DEĞİL, yanında süzülür (bkz. _buildSling / _updateSling). */
  sapanci: {
    glb: 'assets/sapanci/sapanci.glb', height: 74, floatingWeapon: 'sapan',
    walkClipName: 'NlaTrack',
    decimate: { key: 'sapanci', targetTris: 26000, texSize: 1024, headFrom: 0.72 },
  },
};

/* ═══════════ SÜZÜLEN İMZA KILICI PALETLERİ ═══════════
   Seher ile Gece Kraliçesi AYNI kılıç rigini paylaşır (_buildSword /
   _updateSword): yay-sönüm süzülme, savuruş koreografisi, iz, hale, yankı,
   şok dalgası, hilal dalgaları. Fark YALNIZCA model + renk dilidir; ayrı bir
   400 satırlık kopya yazmak iki karakteri de bakımsız bırakırdı.

   flip: propAlign PCA ekseninin işaretini düzeltir — bıçağın UCU daima
   +X'e bakmalı (pivot kabzada). İki model için de görsel olarak ölçüldü. */
const SWORD_SPECS = {
  kilic: {
    weapon: 'kilic', glb: 'assets/seher/kilic.glb', flip: false, len: 74,
    /* Kızıl Hasat paleti: kor kızıl → turuncu → ak kızıl */
    flameHex: [0xff4a1e, 0xff6524, 0xff8a3c], coreHex: 0xffd28a,
    trailInner: [1.00, 0.26, 0.30], trailOuter: [1.00, 0.90, 0.74],
    echoHex: 0xc9a6ff, shockHex: [0xdfeeff, 0xffc98a], waveHex: 0xd8ecff,
    trailFade: 9,
  },
  tackilic: {
    weapon: 'tackilic', glb: 'assets/kralice/tackilic.glb', flip: true, len: 76,
    /* Kraliçenin dili KASITLI ZİT: soğuk mavi çekirdek + meneşşe kenar.
       Bıçak dokusu zaten mavi ışıyor; efektler onu örtmez, uzatır. */
    flameHex: [0x3f8cff, 0x5fa8ff, 0x9fd0ff], coreHex: 0xdfefff,
    trailInner: [0.44, 0.36, 1.00], trailOuter: [0.66, 0.92, 1.00],
    echoHex: 0xa88cff, shockHex: [0xcfe4ff, 0x9a8cff], waveHex: 0x8fd4ff,
    /* izın kuyruğu daha uzun: kesik ileri fırladığı için savuruşun kendisi
       de daha "akışkan" okunmalı */
    trailFade: 12,
  },
  /* AYAZ — BUZ paleti. Kraliçe'nin menekşe-mavisiyle karışmaması KASITLI
     olarak çözüldü: Kraliçe MOR'a kaçan gece mavisi, Ayaz ise doygunluğu
     düşük CAM GÖĞÜ + beyaz çekirdek. Kılıcın kendi dokusu da buz mavisi
     (bronz kabza) — efektler onu boyamaz, uzatır.
     trailFade 10: Seher (9) ile Kraliçe (12) arası; şövalyenin savuruşu
     Kraliçeninki kadar akışkan değil, ağırlığı olan bir yemin darbesi. */
  yemin: {
    weapon: 'yemin', glb: 'assets/sovalye/yeminkilic.glb', flip: true, len: 75,
    flameHex: [0x2fd0ff, 0x7ae4ff, 0xc6f4ff], coreHex: 0xffffff,
    trailInner: [0.32, 0.86, 1.00], trailOuter: [0.92, 1.00, 1.00],
    echoHex: 0x9fe4ff, shockHex: [0xeafcff, 0x6fc8ff], waveHex: 0xa8eeff,
    trailFade: 10,
  },
};

/* ═══════════ DÜNYAYA ÖZGÜ DÜŞMAN MODELLERİ ═══════════
   Düşmanların TAMAMI tek InstancedMesh (kapsül) olarak çizilir — 400+
   düşmanı tek çizim çağrısıyla taşımanın tek yolu bu. Buna karşılık
   dünyaya özgü GERÇEK model, oyuncunun gözünün gittiği yere ayrılır:
   oyuncuya EN YAKIN N yakın-dövüş düşmanı iskeletli GLB klonuyla çizilir,
   arkadaki kalabalık kapsül olarak kalır. N cihaz kademesine bağlıdır,
   böylece mobilde kare hızı düşmez.

   Yeni dünya modeli eklemek: buraya floor kimliğiyle bir kayıt aç. */
export const WORLD_ENEMY_MODELS = {
  /* ── DÜNYA 1: MEZARLIK ──
     Mezar Muhafızı: yüksek canlı, yavaş, ağır yakın dövüş. Zırhlı silueti
     iskelet savaşçıdan ilk bakışta ayrılsın diye BOYU belirgin şekilde
     büyük (104 birim; kahraman 60, iskelet 76). Oyuncu tehdidi tanımak
     için can barını okumak zorunda kalmaz — silueti okur. */
  mezarlik: [
    {
      /* Hortlak: ilk haritanın omurgası — düşük canlı, hızlı, kalabalık
         yakın dövüş düşmanı. Sahnede sürekli 15–40 tanesi bulunur, bu
         yüzden ucuz olması ZORUNLU: 3060 üçgen (muhafız 10208, yani
         ~3.3× hafif). Bütçenin aslan payını bu grup alır. */
      id: 'hortlak',
      glb: 'assets/mezarlik/hortlak.glb',
      types: ['zombi'],
      /* 76 birim: kahraman 60'ın hemen üstü. Kasıtlı olarak muhafızdan
         (104) belirgin şekilde kısa — oyuncu iki tehdidi silüetten,
         can barını okumadan ayırt etmeli. */
      height: 76,
      /* 'Running' seçildi (dosyada 'Walking' de var): bu düşman hızlı
         (46 birim/sn). Yürüme klibi o hızda ayakların yerde kaymasına
         yol açardı — muhafızda tam tersi gerekçeyle 'Walking' seçilmişti. */
      clip: 'Running',
      /* Bütçe payı 0.75 → 0.62: menzilli büyücü (0.18) gruba katıldı.
         Pay KALABALIK gruptan alınır ve kalabalık grup dizide ÖNCE gelir —
         bütçe daralınca kesme SONDAN başlar, yani sahneyi dolduran hortlak
         modelli kalır (CLAUDE.md: "boş ama keskin" sahne istenmez). */
      share: 0.54,
      shadowR: 11,
      stepRate: 0.62, stepMin: 0.5, stepMax: 0.85,
      emissiveIntensity: 1.0,
      /* lift 0.30 — SADELEŞTİRMENİN SESSİZ YAN ETKİSİNİ KAPATIR.
         Ham GLB iki doku taşıyordu (baseColor + emissive); heroModel yalnız
         baseColor'ı pişirir, yani emissive kanalı DÜŞER ve figür karanlık
         zeminde koyulaşır (tezgahta ölçüldü). Yeni ışık YASAK; çözüm
         projenin kendi kalıbı: dokunun KENDİSİ emissiveMap olur. Kemik beji
         zaten açık olduğu için değer kadronun en düşüğü (Büyücü 0,42 ·
         Kralıçe 0,62 · Kaptan 0,80). */      lift: 0.54,
      /* 3060 üçgen ZATEN bütçenin altında — kümeleme (heroModel:
         srcTris <= target*1.25 → atla) hiç çalışmaz. Kayıt buna rağmen
         AÇIK, çünkü asıl kazanç diğer ikisi: doku 512² WebP'ye iner ve
         sonuç IndexedDB'ye yazılır — ikinci açılışta ne ağ isteği ne Draco
         çözümlemesi olur (SAPANCI kaydıyla aynı gerekçe). */
      decimate: { targetTris: 3000, texSize: 512 },
    },
    {
      id: 'muhafiz',
      glb: 'assets/mezarlik/muhafiz.glb',
      types: ['muhafiz'],
      height: 104,
      /* 'Walking' seçildi ('Running' de dosyada var): bu düşman yavaş
         (hız 33 / iskelet 46). Koşu klibi ağır bir tankta yanlış görünür —
         ayaklar yere basmaz, "kayıyor" hissi verir. */
      clip: 'Walking',
      /* Toplam modelli-düşman bütçesinin payı. Düşük tutulmasının iki
         sebebi var: (a) bu düşman seyrek doğar, (b) 10.2k üçgen ile
         iskeletten ~2× pahalı. Yüksek kademede ~10 eşzamanlı slot. */
      share: 0.18,
      shadowR: 15,
      stepRate: 0.55, stepMin: 0.45, stepMax: 0.75,
      emissiveIntensity: 0.85,
      /* lift 0.40 — hortlakla aynı gerekçe (düşen emissive kanalının yerine).
         Hortlaktan yüksek: bu doku koyu deri + is karası zırh, ortalama
         parlaklığı belirgin daha altında — aynı değer verilse muhafız
         zeminden ayrışmazdı. */
      lift: 0.46,
      /* 10.208 → ~4,2k. Kadronun EN UZUN düşmanı (104 birim) olduğu için
         hedef en büyük: ekranda en çok yer kaplayan siluet zırh
         plakalarının köşesini korumak zorunda. headFrom 0.86 — kahramanda
         0,70-0,72 (yüz okunur olsun), düşmanda baş ~12 px: ince ızgarayı
         yüzde harcamak boşuna, üçgenler gövdeye gitsin. */
      decimate: { targetTris: 4200, texSize: 512, headFrom: 0.86 },
    },
    {
      /* İSKELET BÜYÜCÜ — haritanın MENZİLLİ rolü ('atici' tipi, Nekro
         Efendisi sayıları). Yakın dövüşün iki modeli arasına üçüncü bir
         SİLUET sokar: hortlak kısa-hızlı, muhafız geniş-ağır, büyücü
         İNCE ve UZUN (82 birim). Oyuncu tehdidin menzilli olduğunu can
         barını okumadan, siluetten anlar — kaçarken hangisine sırtını
         döneceğini bilmesi gerekiyor.

         Klip: dosyada TEK klip var ('NlaTrack', 2,375 sn — Tripo ihracı
         klibi hep böyle adlandırır). def.clip yazılıdır ama yükleyici
         eşleşme bulamazsa ilk klibe düşer; adı elle değiştirilirse
         sessizce çalışmaya devam eder. */
      id: 'buyucu',
      glb: 'assets/mezarlik/buyucu.glb',
      types: ['atici'],
      height: 82,
      clip: 'NlaTrack',
      /* 10,6k üçgen — muhafızla aynı sınıf, hortlaktan ~3,5× pahalı.
         Menzilli düşman doğum ağırlığı da düşük (waveWeights: 2. dalgada
         girer), yani sahnede aynı anda ~3-6 tane olur; 0.18 payı yüksek
         kademede 9 slot demektir — hepsine yeter. */
      share: 0.18,
      shadowR: 10,
      stepRate: 0.58, stepMin: 0.45, stepMax: 0.8,
      /* idleRate — DURURKEN YÜRÜME KLİBİ TAM HIZDA ÇALIŞMAZ.
         Dosyadaki tek klip yürüyüş ve animasyon hızı e.speed'den türetilir;
         büyücü menzil bandında durduğunda bacakları tam tempoda yürümeye
         devam ediyordu — yerinde adımlayan bir figür "bana doğru geliyor"
         diye okunur (kullanıcının teşhisi tam buydu). Durunca klip %14 hıza
         düşer: ağırlık aktarma / hafif sallanma olarak okunur, atış pozu da
         üzerine biner. Yeni klip gerekmez. */
      idleRate: 0.14,
      emissiveIntensity: 1.0,
      /* lift — KOYU DOKUYU OKUNUR YAPMA (Kaptan/Kraliçe ile aynı çözüm,
         bkz. CLAUDE.md): baseColor ortalama parlaklığı 79, koyu piksel %58,
         doygunluk 0,18 — yani kemik beji + is karası bir figür, zemin ise
         zaten koyu (arena ort. 32-47). Yeni ışık YASAK, düz emissive rengi
         de her şeyi grileştirir; doku KENDİ rengini az miktarda yayar. */
      lift: 0.42,
      /* cast: atış anında (e.atkAnim) gövde geriye yaslanıp asa yükselir.
         Klip tek olduğu için atışın kendi animasyonu YOK — bu poz onun
         yerine geçer ve mixer'ı hiç bozmaz (rig'in ÜSTÜNDEN çarpar). */
      cast: 1,
      /* castAxis — kolun HANGİ yerel eksende kalktığı rig'e göre değişir ve
         tahmin edilemez; `_bosstest.html`in donmuş atış pozu slotunda GÖZLE
         seçilir (propAlign'daki `flip` ile aynı mantık). */
      castAxis: 'z',
      /* 10.633 → ~3,8k. Muhafızdan küçük hedef: büyücü İNCE bir siluet
         (82 birim, ekranda dar) ve `cast` pozu üç kemiği sürüyor —
         sadeleştirmenin deri ağırlıklarını koruyup korumadığı en çok bu
         modelde önemli, o yüzden tezgahta atan kol da gözle denetlenir. */
      decimate: { targetTris: 3800, texSize: 512, headFrom: 0.86 },
    },
    {
      /* ═══ İSKELET KRAL — SOLGUN MEZARLIĞIN EN GÜÇLÜSÜ (2026-08-29) ═══
         Kullanıcı isteği: haritanın en güçlü karakteri, etrafına ölüm saçan,
         çok hızlı ilerlemeyen, canı yüksek, BOSS GİBİ ama boss değil.
         Oynanış tarafı config.ENEMY_TYPES.kral'da (nabız, hız, can); burada
         yalnız sanatı var.

         BOY 126 — hiyerarşinin en tepesi, boss'un (150) hemen altı:
         kahraman 60 · hortlak 76 · büyücü 82 · muhafız 104 · KRAL 126 ·
         lord 150. Oyuncu kralı ekranda gördüğü anda can barını okumadan
         "bu diğerleri gibi değil" demeli; 126 tam o aralık.

         PAY 0,10 — kadronun en küçüğü (3 slot). Kral nadir doğar
         (TYPE_CURVES: 6. dalgadan sonra ~%2,5) ve pay KALABALIK gruptan
         alınır (hortlak 0,62 → 0,54), seyrek gruplardan değil — sahneyi
         dolduran model her zaman modelli kalır. */
      id: 'iskelet_kral',
      glb: 'assets/mezarlik/iskelet_kral.glb',
      types: ['kral'],
      height: 126,
      clip: 'NlaTrack',
      share: 0.10,
      shadowR: 21,
      /* YÜRÜYÜŞ KLİBİ YAVAŞLATILIR: kral 20 birim/sn ile kadronun en yavaşı ve
         klip hızı e.speed'den türetiliyor — stepMin tabanı olmasa adımları
         görünmez derecede yavaş kalır, olması gerekenden fazla düşürse de
         "kayarak geliyor" görünür. 0,42-0,62 bandı ağır bir kral yürüyüşü. */
      stepRate: 0.62, stepMin: 0.42, stepMax: 0.62,
      emissiveIntensity: 0.95,
      lift: 0.36,     // ölçülen oran ×2,12 (bant 1,8-4,5)
      /* Kadronun EN PAHALI ihracı (662k üçgen, Draco). Hedef diğerlerinden
         yüksek (5000): ekranda en büyük siluet, taç ve omuz plakalarının
         köşesi korunmak zorunda. Doku da 640 — tek figure için +0,6 MB. */
      decimate: { targetTris: 5000, texSize: 640, headFrom: 0.86 }, decKey: 'iskelet_kral_a1',
    },
  ],
  /* ══ DÜNYA 2: KÜL ÇUKURLARI (2026-08-29) ══
     Üç model, mezarlığın üç rolünün birebir karşılığı: kalabalık · tank ·
     menzil. Sanat dünyaya göre değişir, OYNANIŞ TİPİ aynı kalır — yeni tip
     açmak yeni denge ölçümü demektir ve buranın ihtiyacı o değildi. */
  kul: [
    {
      /* ALEV DELİSİ — kalabalık. Boy 78: kahraman 60'ın hemen üstü,
         hortlakla (76) aynı sınıf, yani oyuncu dünya değiştirince tehdit
         ölçeğini yeniden öğrenmek zorunda kalmaz. */
      id: 'alev_deli', glb: 'assets/kul/alev_deli.glb', types: ['zombi'],
      height: 78, clip: 'NlaTrack', share: 0.58, shadowR: 11,
      stepRate: 0.62, stepMin: 0.5, stepMax: 0.85,
      emissiveIntensity: 1.0,
      /* lift ÖLÇÜLDÜ (_newenemytest): albedo midtonları offline kaldırıldıktan
         sonra figür/zemin oranı ×2.19 — bant 1,8-4,5. */
      lift: 0.42,
    },
    {
      /* KOR LORDU — tank. 112 birim: kadronun en uzun yakın dövüşçüsü
         (mezar muhafızı 104). Kül dünyasının tehdidi BOYDAN okunur. */
      id: 'kor_lordu', glb: 'assets/kul/kor_lordu.glb', types: ['muhafiz'],
      height: 112, clip: 'NlaTrack', share: 0.22, shadowR: 16,
      stepRate: 0.55, stepMin: 0.45, stepMax: 0.75,
      emissiveIntensity: 0.9,
      /* 0,44 iken oran ×1,76 ölçüldü — bandın DİBİNİN altı. CLAUDE.md kuralı:
         sınıra değen değer yuvarlanmaz, düzeltilir. Bu doku kadronun en
         koyusu (ort. 40 → offline 96) ve figür siyah cüppeli. */
      lift: 0.58,
    },
    {
      /* MUM BÜYÜCÜSÜ — menzil ('atici'). Kukuletalı, ince, uzun silüet;
         asa pozu iskelet büyücüyle aynı kemik adlarını kullanır (Tripo
         insansı rig standardı), o yüzden cast/castAxis aynen geçerli. */
      id: 'mum_buyucu', glb: 'assets/kul/mum_buyucu.glb', types: ['atici'],
      height: 86, clip: 'NlaTrack', share: 0.20, shadowR: 10,
      stepRate: 0.58, stepMin: 0.45, stepMax: 0.8,
      idleRate: 0.14, emissiveIntensity: 1.0, lift: 0.42,
      cast: 1, castAxis: 'z',
    },
  ],

  /* ══ DÜNYA 3: ZEHİR BATAKLIĞI ══
     İki yakın dövüş modeli; MENZİLLİ YOK (worlds.roster'da atici kapalı).
     Uzaktan gelen tek tehdit boss'un zehir salvosudur. */
  bataklik: [
    {
      id: 'batak_yaratigi', glb: 'assets/bataklik/batak_yaratigi.glb', types: ['zombi'],
      /* 80 → 74: tabanı 78 birim genişti, çarpışma dairesi 30 (oran 2,60 —
         shipped bandın tepesi 2,36). Taban 72'ye iner, oran 2,40. */
      height: 74, clip: 'NlaTrack', share: 0.62, shadowR: 12,
      stepRate: 0.66, stepMin: 0.5, stepMax: 0.9,
      emissiveIntensity: 1.0, lift: 0.42,
      /* Tripo "yüksek kalite" ihracı: 622k üçgen + Draco. Çalışma anında
         sadeleştirilir ve IndexedDB'ye yazılır (ikinci açılışta bedava).
         decKey ölçüm tezgahıyla ORTAK — aynı iş iki kez yapılmaz. */
      decimate: { targetTris: 3400, texSize: 512, headFrom: 0.86 }, decKey: 'batak_yaratigi_a1',
    },
    {
      id: 'batak_devi', glb: 'assets/bataklik/batak_devi.glb', types: ['muhafiz'],
      height: 106,     // taban 107 → 99,5; oran 2,55 → 2,37 clip: 'NlaTrack', share: 0.38, shadowR: 17,
      stepRate: 0.54, stepMin: 0.45, stepMax: 0.74,
      emissiveIntensity: 0.9, lift: 0.40,
    },
  ],

  /* ══ DÜNYA 7: TUZ TABANI ══
     Menzilli yerine PATLAYICI KOŞUCU. Üç siluet: minik-hızlı böcek,
     iri-yavaş pençe, ve üstüne koşan bomba. */
  tuzla: [
    {
      /* TUZ BÖCEĞİ — kadronun en KISASI (46). Kalabalık dalgada zeminde
         akan bir sürü gibi okunur; boyu kasıtlı olarak kahramanın altında. */
      id: 'tuz_bocegi', glb: 'assets/tuzla/tuz_bocegi.glb', types: ['zombi'],
      height: 46, clip: 'NlaTrack', share: 0.46, shadowR: 12,
      stepRate: 0.8, stepMin: 0.6, stepMax: 1.1,
      emissiveIntensity: 1.0,
      lift: 0.56,     // ölçülen ×1,77 → banda çekildi (bkz. kor_lordu notu)
    },
    {
      id: 'tuz_pencesi', glb: 'assets/tuzla/tuz_pencesi.glb', types: ['muhafiz'],
      height: 92, clip: 'NlaTrack', share: 0.24, shadowR: 15,
      stepRate: 0.56, stepMin: 0.45, stepMax: 0.78,
      emissiveIntensity: 0.9, lift: 0.40,
    },
    {
      /* KOŞUCU — fitil yanarken DURUR (enemyManager). Klip 1,29 sn ve
         hızlı: stepRate yüksek, çünkü bu düşmanın kimliği HIZ. */
      id: 'kosucu', glb: 'assets/tuzla/kosucu.glb', types: ['patlayici'],
      /* KULLANICININ İŞARET ETTİĞİ MODEL. Tabanı 89 birimdi, dairesi 30:
         oran 2,97 — kadronun en kötüsü. İki koldan düzeltildi (boy 72 → 66
         VE tip yarıçapı 15 → 19), çünkü tek başına boyu kesmek onu tuz
         böceğinin (46) hemen üstüne düşürüp "en hızlı" siluetini siliyordu. */
      height: 66, clip: 'NlaTrack', share: 0.30, shadowR: 11,
      stepRate: 0.95, stepMin: 0.7, stepMax: 1.3,
      emissiveIntensity: 1.1,
      lift: 0.62,     // ölçülen ×1,76 → banda; ayrıca fitil parlaması bunun üstüne biner
    },
  ],

  /* ══ DÜNYA 8: DONMUŞ GÖL ══
     DÖRT model — kadronun en kalabalık dünyası. Dört siluet dört karar:
     kurt (en düşük canlı, sürü), ayı (tank), yeti (ağır), tilki (menzil). */
  buzul: [
    {
      /* BUZ KURDU — kullanıcı isteği: "biomun en düşük canlı karakteri".
         Dört ayaklı, boy 52 (kahramanın altında) ama GÖVDESİ uzun: tehdit
         kalabalıktan gelir, boydan değil. */
      id: 'buz_kurdu', glb: 'assets/buzul/buz_kurdu.glb', types: ['zombi'],
      height: 52, clip: 'NlaTrack', share: 0.50, shadowR: 13,
      stepRate: 0.75, stepMin: 0.6, stepMax: 1.05,
      emissiveIntensity: 1.0, lift: 0.42,
      /* DÖRT AYAKLI TRIPO RİGİ: kök kemik `tripo::Root` ve three.js bone
         adlarını sanitize eder (`:` → `_`), yani kayıt İKİ yazımı da
         içermek zorunda — yoksa kök hareketi sökülmez ve figür kendi
         gölgesinin önünde yürür (2026-08-22 dersi). */
      rootBones: ['tripo__Root', 'tripo::Root', 'tripo__Spine_0', 'Root', 'Hip', 'Pelvis', 'Hips', 'Armature'],
    },
    {
      /* BUZ AYISI — yawFix ÖLÇÜLDÜ (_facetest, dört yaw yan yana): model
         +X'e bakıyor, yani düzeltilmeden YAN YÜRÜR. Kemik ölçümü de aynı
         sayıyı verdi (+1,55) ama karar dört-yaw panelinde verildi. */
      id: 'buz_ayisi', glb: 'assets/buzul/buz_ayisi.glb', types: ['muhafiz'],
      height: 76,      // dört ayaklı, tabanı 112 birim: oran 2,67 → 2,36 clip: 'NlaTrack', share: 0.18, shadowR: 18,
      stepRate: 0.6, stepMin: 0.45, stepMax: 0.8,
      emissiveIntensity: 0.9, lift: 0.38,
      yawFix: Math.PI / 2,
      rootBones: ['tripo__Root', 'tripo::Root', 'tripo__Spine_0', 'Root', 'Hip', 'Pelvis', 'Hips', 'Armature'],
      decimate: { targetTris: 4200, texSize: 512, headFrom: 0.9 }, decKey: 'buz_ayisi_a1',
    },
    {
      /* YETİ — 'agir' tipinin 3B karşılığı. 118 birim: kadronun en irisi
         (kral 126 hariç). Ağır tipin varlık sebebi bu siluet. */
      id: 'yeti', glb: 'assets/buzul/yeti.glb', types: ['agir'],
      height: 118, clip: 'NlaTrack', share: 0.16, shadowR: 19,
      stepRate: 0.5, stepMin: 0.4, stepMax: 0.7,
      emissiveIntensity: 0.9, lift: 0.34,
      decimate: { targetTris: 4400, texSize: 512, headFrom: 0.86 }, decKey: 'yeti_a1',
    },
    {
      /* KAR TİLKİSİ BÜYÜCÜSÜ — menzil. İnsansı asa pozu YOK (rig dört
         ayaklı Tripo: R_Upperarm yok), o yüzden `cast` yazılmadı — kayıt
         bulunamayan kemikte sessizce atlanır ama gereksiz iş yapmayız.
         Duruşu klip yavaşlatmayla verilir (idleRate). */
      id: 'kar_tilkisi', glb: 'assets/buzul/kar_tilkisi.glb', types: ['atici'],
      height: 62, clip: 'NlaTrack', share: 0.16, shadowR: 12,
      stepRate: 0.62, stepMin: 0.5, stepMax: 0.85,
      idleRate: 0.22, emissiveIntensity: 1.0, lift: 0.42,
      rootBones: ['tripo__Root', 'tripo::Root', 'tripo__Spine_0', 'Root', 'Hip', 'Pelvis', 'Hips', 'Armature'],
      decimate: { targetTris: 3600, texSize: 512, headFrom: 0.9 }, decKey: 'kar_tilkisi_a1',
    },
  ],
  hiclik: [
    {
      id: 'void_biped',
      glb: 'assets/hiclik/void_biped.glb',
      types: ['zombi'],            // yakın dövüş; 'atici' sonra eklenecek
      height: 76,                  // radius 15 düşman için hedef boy (kahraman 60)
      clip: 'Running',
      share: 1,
      shadowR: 11,
      /* Adım tempo çarpanı: klip hıza göre hızlanır ama çok kısıtlı — aksi halde
         ayaklar komik derecede tepiniyor. 1'in altı = klip ağır çalışır. */
      stepRate: 0.62, stepMin: 0.5, stepMax: 0.85,
      /* Meshy materyali kendi emissive dokusunu taşıyor (koyu mor görünümün
         kaynağı) — renge MÜDAHALE ETMİYORUZ, sadece şiddetini dengeliyoruz. */
      emissiveIntensity: 1.0,
    },
  ],
};
/* eşzamanlı iskeletli düşman bütçesi (mixer maliyeti CPU'da). Ekrandaki tüm
   yakın dövüş düşmanlarını kapsayacak kadar geniş tutulur — böylece kapsül
   yer tutucuya düşen düşmanlar yalnızca EKRAN DIŞINDA kalır, oyuncu "patates
   → model" dönüşümünü hiç görmez. */
const TIER_MODEL_ENEMIES = { low: 18, mid: 34, high: 52 };

/* CESET ÖMRÜ (sn) — ölüm patlamasının yerine gelen çöküş. 0,5 sn ÖLÇÜLMÜŞ bir
   takastır: altında hareket okunmuyor ("kayboldu" hissi geri geliyor),
   üstünde kalabalık dalgada slotlar cesetlerle dolup canlı düşmanlar kapsüle
   düşüyor — yani ölüm animasyonu YAŞAYAN düşmanın modelini çalıyor. */
const CORPSE_T = 0.5;

/* ═══════════ BOSS MODELİ — HASAT LORDU ═══════════
   Kadronun EN GÜÇLÜ boss sanatı. Yer tutucu kapsül+boynuz mesh'i (eski
   `bossMesh`) henüz duruyor ama yalnız YEDEK olarak: model yüklenene
   kadar bir kare bile boş sahne olmasın. Yüklendiğinde kapsül gizlenir.

   İki tasarım kararı:
   • İSKELET YOK, KLİP YOK — lord yürümez, süzülür. Hareketin tamamı
     `bossMotion.js` içinde tek saf fonksiyondur (tezgah da onu okur).
   • TÜM DÜNYALAR aynı modeli kullanır. Dünya başına boss sanatı gelene
     kadar en iyi varlık her yerde en iyi varlıktır; kapsül yer tutucuyu
     altı dünyada göstermenin savunulacak tarafı yok. Dünyaya özgü boss
     geldiğinde bu kayıt `{ mezarlik: {...} }` tablosuna açılır. */
const BOSS_MODEL = {
  glb: 'assets/mezarlik/hasat_lordu.glb',
  /* Boy hiyerarşisi (CLAUDE.md): kahraman 60 · hortlak 76 · büyücü 82 ·
     muhafız 104 · LORD 150. Tehdit siluetten okunur: lord muhafızın ~1,45×ı,
     yani ekranda hiçbir şeye benzemez. Çarpışma yarıçapı (BOSS.radius 47)
     DEĞİŞMEDİ — görsel boy dengeye dokunmaz. */
  height: 150,
  /* zemindeki yuvarlak gölgenin yarıçapı (süzülme yüksekliğiyle küçülür) */
  shadowR: 34,
  /* Doku 1024² WebP. Kapsül düşmanlar 512'ye indirilir (`tex` bütçesi) ama
     boss ekranda ~300 px kaplar ve dövüş dakikalarca sürer: tek bir figure
     için +3 MB VRAM'in karşılığı net alınır. */
  tex: 1024,
  /* altın + koyu kızıl dokusu (ort. parlaklık 87, doygunluk 0,34) zaten
     ayrışıyor; lift yalnız altını kor gibi tutmak için — büyücüden (0,42)
     belirgin düşük, yoksa gövde plastikleşir. */
  lift: 0.26,
};

/* ═══ BATAK EJDERİ — ZEHİR BATAKLIĞI'NIN BOSS SANATI (2026-08-29) ═══
   Dünyaya özgü boss modeli tablosu. Kayıtlı olmayan dünya Hasat Lordu'nu
   kullanır (dokuz dünyanın ortak boss'u; dünyaya özgü sanat geldikçe bu
   tabloya satır eklenir).

   Üç şeyi Hasat Lordu'ndan AYIRIR ve üçü de model dosyasının gerçeğinden
   gelir, tercihten değil:
   • İSKELET YOK, KLİP YOK → hareket prosedürel (bossMotion.dragonPose) ve
     YÜRÜME diye bir şey yok: ejder yerinde durur, döner, ZIPLAR.
   • 605k üçgenlik Tripo ihracı → statik prop boru hattı (prop: {...}),
     iskeletli yol bu modeli reddediyor.
   • +X'e bakıyor → yawFix. Ölçüm _facetest.html'in dört-yaw panelinde. */
const BOSS_MODELS = {
  bataklik: {
    glb: 'assets/bataklik/batak_ejderi.glb',
    kind: 'ejder',
    /* Lord ile AYNI boy (150): ikisi de "boss" sınıfını temsil ediyor ve
       oyuncunun tehdit ölçeği dünya değişince kaymamalı. Çarpışma yarıçapı
       (BOSS.radius 47) değişmez — görsel boy dengeye dokunmaz. */
    height: 150,
    shadowR: 38,          // dört ayaklı, geniş gövde: lordun (34) üstü
    prop: { targetTris: 6000, texSize: 768 },
    decKey: 'batak_ejderi_a1',
    /* lift 0,34 — ölçülen figür/zemin oranı bant içinde. Ejder dokusu
       offline midton düzeltmesinden geçti (ort. 37 → 109); ham dokuyla
       oran ×0,80'di, yani boss zemine karışıyordu. */
    lift: 0.34,
    yawFix: Math.PI / 2,
  },
};

/* ═══════════ KADRO ÖLÇEĞİ — TEK ÇARPAN, DÖRT TABLO ═══════════
   Kullanıcı isteği (2026-09-02): "karakter modelleri daha büyük, daha
   telefon oyunu gibi olmalı; ne aşırı büyük ne aşırı küçük."
   Otuz küsur `height` sayısına elle dokunmak boy HİYERARŞİSİNİ (kahraman
   < hortlak < büyücü < muhafız < kral < boss) sessizce bozar ve her yeni
   düşmanda yeniden bozulur. Çarpan charLook.js'te TEK YERDE durur, burada
   tabloların TAMAMINA uygulanır — türetilmiş her ölçü (can barı yüksekliği
   `__mdlTop`, batma derinliği, gölge yarıçapı, `_bossTopY`) tablodan
   okuduğu için kendiliğinden hizalanır.
   ÇARPIŞMA YARIÇAPLARI (config.ENEMY_TYPES.radius) DEĞİŞMEZ: bu paso
   görseldir, dengeye dokunmaz. */
scaleCharTable(CHARACTER_MODELS, CHAR_SCALE);
scaleCharTable(WORLD_ENEMY_MODELS, CHAR_SCALE);
scaleCharTable(BOSS_MODEL, BOSS_SCALE);
scaleCharTable(BOSS_MODELS, BOSS_SCALE);

const TILT = THREE.MathUtils.degToRad(44);   // Clash Royale tarzı: tepeden ama dik değil — karakterler boy gösterir

const CAM_FOV = 28;   // dar 'tele' lens — CR'ın karakteristik diorama/oyuncak hissi: hafif derinlik var ama kenarlarda distorsiyon yok
const MAX_PARTICLES = 700;
/* Kameranın yaw'ı sabit olduğu için dünya→ekran açısı tek katsayıyla
   çözülür: dikey (Z) bileşen cos(TILT) kadar kısalır. Kuyruklu ateş
   topunun kuyruğu bununla hizalanır (bkz. addFire). */
const COS_TILT = Math.cos(TILT);
const TIER_PARTICLES = { low: 220, mid: 450, high: 700 };
const TIER_DPR3D     = { low: 1,   mid: 1.35, high: 2 };
/* sıcak döngüde yeniden yaratılmasın diye modül düzeyinde: */
const BY_SCORE = (a, b) => a.__score - b.__score;
const FLAME_HEX = [0x8fe6ff, 0xffc24d, 0xff6a2c, 0xffe6a0];

/* ═══ YALIM PALETLERİ (addFire) ═══
   Kuyruklu alev silueti TEK kod yolundan çizilir; kimlik yalnız RENKTEN
   gelir. Çekirdek her zaman sıcak-beyaza yakın kalır (parlak çekirdek
   olmadan yalım "boyanmış duman" gibi okunur), ayrışma halede ve kuyrukta.
   c* = çekirdek · g* = hale · t* = kuyruk · f* = saçak. */
const FIRE_PAL = {
  /* Gökalev'in mavi koru (oyuncu mermisi) */
  blue:  { cr: 0.94, cg: 0.98, cb: 1.00, gx: 0.13, gy: 0.46, gz: 0.96,
           tx: 0.34, ty: 0.78, tz: 1.00, fx: 0.10, fy: 0.40, fz: 0.92 },
  /* İskelet Büyücü — nekro yeşili: zehirli, soğuk, yeşil-beyaz çekirdek.
     Mezarlık zemini (ort. parlaklık 35, doygunluk 0,24) kırmızı-turuncu
     ailesinde; yeşil o zeminde en çok ayrışan renktir. */
  necro: { cr: 0.84, cg: 1.00, cb: 0.88, gx: 0.14, gy: 0.82, gz: 0.42,
           tx: 0.30, ty: 0.96, tz: 0.50, fx: 0.08, fy: 0.62, fz: 0.32 },
  /* KADİM HASATÇI — hasat kızılı + altın çekirdek (lordun kendi dili) */
  harvest: { cr: 1.00, cg: 0.93, cb: 0.72, gx: 0.86, gy: 0.16, gz: 0.20,
             tx: 1.00, ty: 0.42, tz: 0.24, fx: 0.72, fy: 0.14, fz: 0.16 },
};

/* ═══ v53 B2 — PİŞİRİLMİŞ POZ (BAKED POSE) ═══
   mixer.update her rig'de PropertyBinding + PropertyMixer katmanlarından
   geçer (biriktir → uygula → "değişti mi" testi). Klip yüklemede 30 Hz'de
   bir kez örneklenir (Float32Array, klip başına TEK kopya, rig'ler paylaşır);
   karede yalnız iki kare arası lerp/nlerp doğrudan kemiğe yazılır. Tahsis
   yok. Kemiği bulunamayan iz atlanır; hiç iz bağlanmazsa rig mixer yolunda
   kalır (güvenli geri dönüş). Skinning hâlâ GPU'da three.js'in kendi yolu. */
const BAKE_FPS = 30;
const _bakeCache = new Map();
function bakeClip(clip) {
  let B = _bakeCache.get(clip.uuid);
  if (B) return B;
  const dur = Math.max(1e-3, clip.duration);
  const F = Math.max(2, Math.round(dur * BAKE_FPS) + 1);
  const tracks = [];
  let stride = 0;
  for (const tr of clip.tracks) {
    const dot = tr.name.lastIndexOf('.');
    const prop = tr.name.slice(dot + 1), node = tr.name.slice(0, dot);
    if (prop !== 'quaternion' && prop !== 'position' && prop !== 'scale') continue;
    const size = tr.getValueSize();
    tracks.push({ node, prop, size, off: stride, tr });
    stride += size;
  }
  const data = new Float32Array(F * Math.max(1, stride));
  for (const t of tracks) {
    const ip = t.tr.createInterpolant();
    for (let f = 0; f < F; f++) {
      const v = ip.evaluate(Math.min(dur, (f / (F - 1)) * dur));
      for (let k = 0; k < t.size; k++) data[f * stride + t.off + k] = v[k];
    }
    t.tr = null;
  }
  B = { dur, F, stride, tracks, data };
  _bakeCache.set(clip.uuid, B);
  return B;
}
function bindBake(B, rig) {
  const nodes = [];
  let ok = 0;
  for (const t of B.tracks) {
    const pb = THREE.PropertyBinding.parseTrackName(t.node + '.' + t.prop);
    const o = THREE.PropertyBinding.findNode(rig, pb.nodeName) || null;
    nodes.push(o && o[t.prop] ? o[t.prop] : null);
    if (o) ok++;
  }
  return ok ? nodes : null;
}
function sampleBake(B, nodes, time) {
  let x = (time / B.dur) % 1; if (x < 0) x += 1;
  const fx = x * (B.F - 1), a = fx | 0, b = Math.min(B.F - 1, a + 1), u = fx - a;
  const D = B.data, s = B.stride, oa = a * s, ob = b * s;
  for (let i = 0; i < B.tracks.length; i++) {
    const tgt = nodes[i];
    if (!tgt) continue;
    const t = B.tracks[i], ia = oa + t.off, ib = ob + t.off;
    if (t.size === 4) {
      let bx = D[ib], by = D[ib + 1], bz = D[ib + 2], bw = D[ib + 3];
      const ax = D[ia], ay = D[ia + 1], az = D[ia + 2], aw = D[ia + 3];
      if (ax * bx + ay * by + az * bz + aw * bw < 0) { bx = -bx; by = -by; bz = -bz; bw = -bw; }
      const qx = ax + (bx - ax) * u, qy = ay + (by - ay) * u, qz = az + (bz - az) * u, qw = aw + (bw - aw) * u;
      const l = 1 / (Math.sqrt(qx * qx + qy * qy + qz * qz + qw * qw) || 1);
      tgt.set(qx * l, qy * l, qz * l, qw * l);
    } else {
      tgt.set(D[ia] + (D[ib] - D[ia]) * u, D[ia + 1] + (D[ib + 1] - D[ia + 1]) * u, D[ia + 2] + (D[ib + 2] - D[ia + 2]) * u);
    }
  }
}
export const BakeStats = { rigs: 0, mixer: 0 };

export class Renderer3D {
  constructor(game) {
    this.game = game;
    /* Kademe artık Quality'de yaşar — 2D katman, 3D katman ve bütçeler
       aynı tek kaynaktan okur (eskiden üç yerde ayrı hesaplanıyordu). */
    this.tier = Quality.tier;
    this.canvas = document.getElementById('game3d');
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: this.tier === 'high',
      powerPreference: 'high-performance',
      alpha: false,
    });
    this.renderer.setPixelRatio(Quality.dpr());
    this.renderer.shadowMap.enabled = false;   // performans: karakter/düşman altı yer gölgeleri zaten çizili (blob shadow)
    if ('outputColorSpace' in this.renderer) this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x07080d);
    /* NOT: sis (fog) kasıtlı olarak KAPALI. Ortografik kamerada derinlik,
       ekran konumuna göre çok değişken bir mesafeye denk geliyor — bu da
       savaş alanının bir kısmını (özellikle üst kenarı) beklenmedik şekilde
       karartıp görüşü kısıtlıyordu. Arena kenarındaki derinlik hissi artık
       sade koyu "boşluk" zeminiyle (voidGround) veriliyor. */

    /* NOT: ORTOGRAFİK kameradan GERÇEK PERSPEKTİFE geçildi. Ortografik izdüşümde
       paralel çizgiler hiç yakınsamaz — bu da derinlik/hacim ipucu olmadığı için
       3B kahraman modelinin (ve tüm sahnenin) düz bir çıkartma gibi "basık"
       görünmesine yol açıyordu. Clash Royale'in tanıdık "diorama" hissi tam da
       bu hafif perspektif yakınsamasından gelir — dar FOV + kameradan mesafeyi
       ayarlayarak eski ortografik "zoom" davranışı (1 dünya birimi ≈ 1 ekran
       pikseli) merkez noktada korunuyor (bkz. resize()). */
    this.camera = new THREE.PerspectiveCamera(CAM_FOV, 1, 80, 3200);
    this.camDist = 1150;

    this._clock = performance.now();
    this._yaw = 0;
    this._lastArenaCanvas = null;
    this._lastFloorCanvas = null;

    this._buildLights();
    this._buildGround();
    this._buildAtmosphere();
    this._buildPlaceholderPlayer();
    this._buildEnemyPools();
    this._buildProjectilePools();
    this._buildArrowPool();
    this._buildBow();
    this._buildSling();
    /* İMZA KILICI rigi KARAKTER YÜKLENİRKEN kurulur (Seher kızıl, Gece
       Kraliçesi mavi — bkz. SWORD_SPECS / loadCharacter): tek rig, iki palet.
       Kılıcı olmayan kahramanda hiç kurulmaz. */
    this._swordSpec = null;
    this._buildLightningShard();
    this._buildBlade();
    this._buildFlame();
    this._buildFireFx();
    this._buildImpactFx();
    this._buildCannon();
    this._buildJudgement();
    this._buildLightningArcs();
    this._buildGemPool();
    this._buildParticles();
    this._buildZoneRingBoltBombPools();
    this._buildOrbitBlades();
    this._buildSwordArc();
    this._buildHpBars();
    this._currentCharId = null;
    this.loadCharacter(this.game.player.charId || DEFAULT_CHAR);

    /* WebGL context kaybı kurtarma: düşük bellekli mobil GPU'larda (ya da
       arka planda çok sekme açıkken) tarayıcı context'i düşürebilir —
       bu olmadan sahne kalıcı olarak siyah/bozuk kalırdı. Kayıp anında
       render'ı durdurur, geri geldiğinde tüm sahneyi sıfırdan kurar. */
    /* ── WebGL context kaybı kurtarma ──
       Mobil tarayıcılar (ve Chrome) arka plana alınan / bellek baskısı
       altındaki sekmelerin WebGL context'ini DÜŞÜRÜR. 2D kanvas (hasar
       yazıları, joystick) hayatta kalır, oyun mantığı sürer — ama 3D sahne
       kararır. 'restored' olayı çoğu mobil tarayıcıda HİÇ tetiklenmez.
       Tek güvenilir kurtarma: #game3d kanvasını TAZE bir kanvasla değiştir
       (bir kanvas ömrü boyunca yalnızca TEK context döndürür; kaybolan
       context asla geri gelmez) ve sıfırdan yeni bir Renderer3D kur. */
    this._lost = false;
    this.canvas.addEventListener('webglcontextlost', (e) => {
      e.preventDefault();
      if (this._lost) return;
      this._lost = true;
      console.warn('WebGL context kayboldu — taze kanvasla yeniden kuruluyor…');
      setTimeout(() => { if (this._lost) this.recover(); }, 80);
    }, false);

    this.resize();
    Perf.init(this.renderer);

    /* ── ISITMA GÖREVLERİ ──
       Bir shader ilk çizildiğinde sürücü onu derler (20–150 ms). Bu savaşın
       ortasında olursa "yeni düşman gelince takılıyor" şikayeti doğar.
       Açılış ekranında hallediyoruz; oyuncu zaten bekliyor. */
    Warmup.add('sahne shaderları', () => precompileScene(this.renderer, this.scene, this.camera));
    Warmup.add('ilk kare', () => { this.renderer.render(this.scene, this.camera); });
  }

  /** context kaybını gerçekten kurtaran tek yol: kanvası taze bir kopyayla
      değiştirip yeni bir Renderer3D kurmak. */
  recover() {
    if (this._recovered) return;
    this._recovered = true;
    this._lost = false;
    try { this.renderer.dispose(); } catch (e) { /* yut */ }
    const old = this.canvas;
    const fresh = old.cloneNode(false);          // id/class/style korunur, context YOK
    fresh.removeAttribute('width');
    fresh.removeAttribute('height');
    if (old.parentNode) old.parentNode.replaceChild(fresh, old);
    const g = this.game;
    g.renderer3d = new Renderer3D(g);            // taze #game3d'yi yakalar
  }

  /** dışarıdan (ana döngü / sekmeye geri dönüş) proaktif kontrol için. */
  contextIsLost() {
    if (this._lost) return true;
    const gl = this._gl || (this._gl = this.renderer && this.renderer.getContext
      ? this.renderer.getContext() : null);
    return !!(gl && gl.isContextLost && gl.isContextLost());
  }

  /* ═══════════ KURULUM ═══════════ */

  _buildLights() {
    const amb = new THREE.HemisphereLight(0x5a6a9a, 0x1c1822, 1.55);
    this.scene.add(amb);

    const moon = new THREE.DirectionalLight(0xd8e4ff, 1.7);
    moon.position.set(-260, 420, -180);
    this.scene.add(moon);
    this.moonLight = moon;

    const rim = new THREE.DirectionalLight(0xff3b4e, 0.4);
    rim.position.set(320, 160, 260);
    this.scene.add(rim);
    this.rimLight = rim;

    const fill = new THREE.AmbientLight(0x8090c0, 0.65);
    this.scene.add(fill);

    /* kahraman spotu: koyu zeminde 3B modelin okunaklılığı düz 2B düşman
       çizimlerinden daha zayıftı (gölgeleniyor, sönük kalıyordu) — oyuncuyu
       her zaman takip eden yumuşak bir üst ışık onu sahnede net öne çıkarır. */
    const heroLight = new THREE.PointLight(0xdfe8ff, 1.6, 420, 1.8);
    heroLight.position.set(0, 140, 0);
    this.scene.add(heroLight);
    this.heroLight = heroLight;

    /* kahraman ön dolgu ışığı: heroLight yalnızca tepeden vuruyor — omuz/baş
       üstünü aydınlatır ama kameraya dönük ön yüzü (pelerin kıvrımları, zırh
       deseni) neredeyse karanlıkta bırakır. Kamerayla aynı taraftan (oyuncunun
       +Z'sinden), alçak açıdan gelen ılık bir ışık normal map detaylarını
       görünür kılar. */
    const heroFill = new THREE.PointLight(0xfff1da, 1.15, 260, 2);
    heroFill.position.set(0, 55, 70);
    this.scene.add(heroFill);
    this.heroFill = heroFill;
  }

  _buildGround() {
    /* zemin dokusu 2D fırınında kendi ışığıyla (ay ışığı, gölge, vinyet)
       önceden pişirilmiş — burada OLDUĞU GİBİ, ışıktan bağımsız (unlit)
       gösterilir; gerçekçi aydınlatma özgün sanatı karartır. */
    const geo = new THREE.PlaneGeometry(1, 1, 1, 1);
    geo.rotateX(-Math.PI / 2);
    const mat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    /* ═══ ÇİFT DOKULU ZEMİN (2026-08-23) ═══════════════════════════
       Saha 1900 → 4000 px'e çıktı. Tek 2048² doku 4280 px'e gerildiğinde
       dünya pikseli başına 0,48 doku örneği kalır — istenen "HD"nin tam
       tersi. İki katman:
         map      : makro kompozisyon (arenaya gerilir, düşük frekans)
         uDetail  : döşenen mikro doku (1024² / 512 dünya px = 2,0 örnek/px)

       Neden ikinci bir DÜZLEM değil: üst üste binen yarı saydam tam ekran
       katmanı mobil tiled GPU'da fillrate'i ikiye katlar (CLAUDE.md overdraw
       yasağı). onBeforeCompile ile tek materyalde iki örnekleme = TEK çizim
       çağrısı, tek geçiş, +1 doku okuması.

       Çarpım biçimi: macro × (1-k + k·2·detail). Detay ortalaması ~0,5
       olduğu için k ne olursa olsun makro parlaklığı KORUNUR; k yalnız
       mikro kontrastı ayarlar. Toplamsal olsaydı koyu zemin gri sise
       dönerdi (zemin koyu ve düşük doygunlukta kalmak zorunda — kural 5). */
    mat.onBeforeCompile = (sh) => {
      sh.uniforms.uDetail = { value: this._groundDetailTex || null };
      sh.uniforms.uDetailRep = { value: 1 };
      sh.uniforms.uDetailK = { value: 0.9 };
      sh.uniforms.uDetailMid = { value: 0.216 };
      sh.uniforms.uDetailBreak = { value: 0 };
      sh.uniforms.uMacroK = { value: Quality.tier === 'low' ? 0 : 1 };   // v54 E3
      /* İKİNCİ ÖLÇEK = TEKRAR MASKESİ (2026-09-01). Karo 640 dünya px'te
         döşenir, telefon ekranı ~400 px: yani aynı desen bir buçuk ekranda
         bir geri gelir ve göz bunu "duvar kâğıdı" olarak yakalar. Aynı doku
         0,383 ölçekte İKİNCİ kez okunur (yeni doku YOK, yeni bellek YOK) ve
         yalnız DÜŞÜK FREKANSLI bir çarpan olarak kullanılır: iki periyot
         asalvari oranda olduğu için bileşik desenin tekrarı ~11 karoya
         çıkar. Maliyet tek bir ek doku okumasıdır — ikinci bir DÜZLEM
         (overdraw) ya da ikinci bir doku (VRAM) yerine bilerek bu seçildi.
         `.g` kanalı okunur: tek kanal, ölçüm luma ortalamasına yakın. */
      sh.fragmentShader = 'uniform sampler2D uDetail;\nuniform float uDetailRep;\nuniform float uDetailK;\nuniform float uDetailMid;\nuniform float uDetailBreak;\nuniform float uMacroK;\n'
        + sh.fragmentShader.replace('#include <map_fragment>',
          '#include <map_fragment>\n'
          + '#ifdef USE_MAP\n'
          + '  vec3 khDetail = texture2D( uDetail, vMapUv * uDetailRep ).rgb / uDetailMid;\n'
          + '  float khBreak = texture2D( uDetail, vMapUv * ( uDetailRep * 0.383 ) + vec2( 0.37, 0.19 ) ).g / uDetailMid;\n'
          + '  khDetail *= mix( 1.0, khBreak, uDetailBreak );\n'
          + '  diffuseColor.rgb *= ( 1.0 - uDetailK ) + uDetailK * khDetail;\n'
          /* v54 E3: MAKRO LEKE — dokusuz değer gürültüsü (iki oktav), hücre ≈ 880 dünya px
             (karo 640 ile asal oran); ±%9 parlaklık + hafif sıcak/soğuk kayma. Karo tekrarını "yer
             yer ıslak/kurumuş toprak" gibi kırar. Ek doku okuması YOK. */
          + '  vec2 khP = vMapUv * ( uDetailRep * 0.73 );\n'
          + '  vec2 khI = floor( khP ), khF = fract( khP ); khF = khF * khF * ( 3.0 - 2.0 * khF );\n'
          + '  float kh00 = fract( sin( dot( khI, vec2( 127.1, 311.7 ) ) ) * 43758.5 );\n'
          + '  float kh10 = fract( sin( dot( khI + vec2( 1.0, 0.0 ), vec2( 127.1, 311.7 ) ) ) * 43758.5 );\n'
          + '  float kh01 = fract( sin( dot( khI + vec2( 0.0, 1.0 ), vec2( 127.1, 311.7 ) ) ) * 43758.5 );\n'
          + '  float kh11 = fract( sin( dot( khI + vec2( 1.0, 1.0 ), vec2( 127.1, 311.7 ) ) ) * 43758.5 );\n'
          + '  float khM = mix( mix( kh00, kh10, khF.x ), mix( kh01, kh11, khF.x ), khF.y );\n'
          + '  diffuseColor.rgb *= mix( vec3( 0.91, 0.92, 0.96 ), vec3( 1.08, 1.05, 1.0 ), khM * uMacroK + ( 1.0 - uMacroK ) * 0.5 );\n'
          + '#endif');
      this._groundShader = sh;
    };
    mat.customProgramCacheKey = () => 'khGround4';
    this.groundMat = mat;
    this.ground = new THREE.Mesh(geo, mat);
    this.scene.add(this.ground);

    /* dış boşluk: arenanın etrafını kaplayan büyük koyu zemin.
       12000: 4280 px'lik arena köşesinden bakıldığında kenarı görünmemeli
       (6000 iken 4000'lik sahada boşluğun bittiği yer ekrana giriyordu). */
    const voidGeo = new THREE.PlaneGeometry(12000, 12000, 1, 1);
    voidGeo.rotateX(-Math.PI / 2);
    this.voidGround = new THREE.Mesh(voidGeo, new THREE.MeshBasicMaterial({
      color: 0x171d2c,
      /* NOT: eski -0.5 birimlik ayrım, kamera odaktan ~1150 birim uzaktayken
         mobil GPU'ların sık kullandığı 16-bit derinlik tamponında yeterli
         değildi — zemin ile boşluk katmanı birbirine "z-fighting" yapıp eğik
         kamerada eğri/dairesel bir artıfakt gibi görünüyordu (kullanıcının
         "mercekten bakıyor gibi" tarif ettiği hata). Çok daha büyük bir
         ayrım + polygonOffset ikili güvence sağlıyor. */
      polygonOffset: true,
      polygonOffsetFactor: 4,
      polygonOffsetUnits: 4,
    }));
    this.voidGround.position.y = -12;
    this.scene.add(this.voidGround);

    /* NÖTR DETAY: harita detay katmanı vermezse sampler boş kalmasın.
       Boş sampler bazı sürücülerde SİYAH okunur — zemin komple kararmasın. */
    {
      const nc = document.createElement('canvas');
      nc.width = nc.height = 4;
      const ng = nc.getContext('2d');
      ng.fillStyle = '#808080'; ng.fillRect(0, 0, 4, 4);
      const nt = new THREE.CanvasTexture(nc);
      nt.wrapS = nt.wrapT = THREE.RepeatWrapping;
      if ('colorSpace' in nt) nt.colorSpace = THREE.SRGBColorSpace;
      this._groundDetailTex = nt;
      this._neutralDetail = nt;
    }
    this._buildProps();
    this._buildObjective();
    /* v49: saha sandığı (mağazanın gümüş 3B modeli, ilk görev yüklemesinde kurulur) */
    this.fieldChestView = new FieldChestView(this);

    /* ISITMA ZORUNLU: `ground` arena kurulana kadar visible = false doğar,
       yani precompileScene onu gezmez ve çift dokulu shader ilk göründüğü
       karede — tam savaşın ilk karesinde — derlenir (isabet katmanındaki
       aynı ders). Bir kare için 4×4 dokularla görünür yapıp derletiyoruz.
       Engel/insan/kubbe materyalleri de aynı kapsamda: kubbe ve fener
       ADDITIVE harmanlı ayrı shader varyantlarıdır ve ilk kurtarma
       noktasına varıldığında tek karelik takılma yapardı. */
    /* ISITMA HİÇBİR KOŞULDA AÇILIŞI KİLİTLEMEZ.
       Ölçüm bunu açıkça gösterdi: taze yüklemede kare döngüsü hiç
       başlamadı (game.time 0,00'da kaldı) ve konsolda HATA YOKTU — ısıtma
       kuyruğunda atılan bir istisna açılış dizisini sessizce durduruyor.
       Isıtma bir OPTİMİZASYONDUR: başarısız olursa ilk vuruşta bir karelik
       takılma olur; oyunun hiç açılmaması ise ürünün ölümü. Bu yüzden
       gövde try/catch içinde ve hata YUTULMAZ, günlüğe yazılır. */
    Warmup.add('zemin · engel · kubbe shaderları', () => {
      try {
      const gv = this.ground.visible;
      if (!this.groundMat.map) {
        this.groundMat.map = this._neutralDetail;
        this.groundMat.needsUpdate = true;
        this._warmMap = true;
      }
      this.ground.visible = true;
      /* her arketipten bir örnek: her geometri aynı materyali paylaşıyor,
         yani tek bir mesh derlemeyi getirir — ama insan/kubbe/fener ayrı. */
      const warm = [];
      for (const k in this.propGeos) {
        const m = new THREE.Mesh(this.propGeos[k], this.propMat);
        m.position.set(0, -4000, 0);
        this.scene.add(m); warm.push(m);
      }
      const nv = this.npcMesh.visible, dv = this.domeMesh.visible, bv = this.beacon.visible;
      const dr = this.domeRing.visible, br = this.beaconRing.visible;
      this.npcMesh.visible = this.domeMesh.visible = this.beacon.visible = true;
      this.domeRing.visible = this.beaconRing.visible = true;
      this.renderer.render(this.scene, this.camera);
      for (let i = 0; i < warm.length; i++) this.scene.remove(warm[i]);
      this.npcMesh.visible = nv; this.domeMesh.visible = dv; this.beacon.visible = bv;
      this.domeRing.visible = dr; this.beaconRing.visible = br;
      this.ground.visible = gv;
      if (this._warmMap) { this.groundMat.map = null; this.groundMat.needsUpdate = true; this._warmMap = false; }
      } catch (e) {
        console.error('[warmup] shader ısıtma atlandı:', e);
      }
    });
  }

  /* ═══════════ HARİTA İÇİ ENGELLER ═══════════════════════════
     ARKETİP BAŞINA BİR InstancedMesh (bkz. propModels.js).

     ÖNCEKİ SÜRÜM TEK bir kutu meshiydi ve "tek çizim çağrısı" diye
     savunuluyordu. Ölçüm yeşildi, sonuç amatördü: mezar taşı, lahit,
     mahzen, çit — hepsi aynı dikdörtgen prizma. Yanlış olan ölçüm değil
     ÖLÇÜTTÜ. Çizim çağrısı artık ~17 (arketip sayısı, örnek sayısı
     değil) ve üçgen ~31k — düşman kadrosu 118k, yani ikisi de bütçenin
     çok içinde. Kazanılan şey: siluet.

     Örnek renkleri artık geometride PİŞMİŞ (albedo + yönlü difüz + zemine
     yakın temas karartması), yani `instanceColor` yalnız vuruş parlaması
     için kullanılır — normalde beyaz. Gölge hâlâ çizilmez: haritanın
     makro dokusuna pişer (statik → sıfır maliyet).
     Tampon YALNIZ bir şey değiştiğinde yüklenir (PropField.dirty). */
  _buildProps() {
    this.propMat = new THREE.MeshBasicMaterial({
      map: this._propTexture(),
      vertexColors: true,
    });
    this.propGeos = null;        // palet başına set; ilk _updateProps'ta alınır
    this._propPal = null;
    this.propMeshes = {};        // kind → InstancedMesh (haritaya göre kurulur)
    this.propGroup = new THREE.Group();
    this.scene.add(this.propGroup);
    this._propStamp = -1;
    this._buildDecor();
  }

  /* ═══════════ v47 SÜS · RÜZGÂR · FX ══════════════════════════
     Süs: tür başına bir InstancedMesh, harita başına BIR KEZ kurulur
     (stamp), kare başına tampon yüklemesi YOK — rüzgâr ve itme şaderde,
     kare başına yalnız iki uniform yazılır. FX adedi `atmo` kademesinden
     (instanceCount — yeniden yükleme olmadan kısılır). */
  _buildDecor() {
    const W = this._windU = { uTime: { value: 0 }, uPlayer: { value: new THREE.Vector2(0, 0) } };
    const wind = (sway, push, fade) => {
      const m = new THREE.MeshBasicMaterial({ map: this.propMat.map, vertexColors: true });
      const uS = { value: sway }, uP = { value: push }, uF = { value: fade || 0 };
      m.onBeforeCompile = (sh) => {
        sh.uniforms.uTime = W.uTime; sh.uniforms.uPlayer = W.uPlayer;
        sh.uniforms.uSway = uS; sh.uniforms.uPush = uP; sh.uniforms.uFade = uF;
        sh.vertexShader = 'uniform float uTime;\nuniform vec2 uPlayer;\nuniform float uSway;\nuniform float uPush;\nvarying vec3 vKhW;\n'
          + sh.vertexShader.replace('#include <project_vertex>', WIND_VS);
        sh.fragmentShader = 'uniform vec2 uPlayer;\nuniform float uFade;\nvarying vec3 vKhW;\n'
          + sh.fragmentShader.replace('void main() {', 'void main() {\n' + FADE_FS);
      };
      m.customProgramCacheKey = () => 'khWind49';
      return m;
    };
    /* v49: biyom ağaçları daha iri taç taşıyor — salgı bir tık artı (h² ile) */
    this.treeMat = wind(1.1e-4, 0, 1);
    this.decorMat = wind(0.012, 1.1, 0);
    this.decorMeshes = {};
    this.decorGroup = new THREE.Group();
    this.scene.add(this.decorGroup);
    this._decorStamp = -1;
    const geo = new THREE.InstancedBufferGeometry();
    const q = new THREE.PlaneGeometry(1, 1);
    geo.index = q.index;
    geo.setAttribute('position', q.attributes.position);
    const CAP = 160;
    this._fxA = new THREE.InstancedBufferAttribute(new Float32Array(CAP * 4), 4);
    this._fxB = new THREE.InstancedBufferAttribute(new Float32Array(CAP * 4), 4);
    this._fxC = new THREE.InstancedBufferAttribute(new Float32Array(CAP * 3), 3);
    geo.setAttribute('aA', this._fxA); geo.setAttribute('aB', this._fxB); geo.setAttribute('aC', this._fxC);
    geo.instanceCount = 0;
    this._fxCap = CAP; this._fxN = 0;
    this.fxMat = new THREE.ShaderMaterial({
      uniforms: { uTime: W.uTime, uPlayer: W.uPlayer },
      vertexShader: FX_VS, fragmentShader: FX_FS,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    });
    this.fxMesh = new THREE.Mesh(geo, this.fxMat);
    this.fxMesh.frustumCulled = false;
    this.fxMesh.renderOrder = 3;
    this.fxMesh.visible = false;
    this.scene.add(this.fxMesh);
    Warmup.add('süs · rüzgâr · fx shaderları', () => {
      try {
        const g = new THREE.BoxGeometry(4, 4, 4);
        const a = new THREE.InstancedMesh(g, this.decorMat, 1), b = new THREE.InstancedMesh(g, this.treeMat, 1);
        TMP.m4.makeTranslation(0, -4000, 0);
        a.setMatrixAt(0, TMP.m4); b.setMatrixAt(0, TMP.m4);
        TMP.col.setHex(0xffffff); a.setColorAt(0, TMP.col); b.setColorAt(0, TMP.col);
        this.scene.add(a, b);
        const fv = this.fxMesh.visible, fc = geo.instanceCount;
        this.fxMesh.visible = true; geo.instanceCount = Math.max(1, fc);
        this.renderer.render(this.scene, this.camera);
        this.fxMesh.visible = fv; geo.instanceCount = fc;
        this.scene.remove(a, b); a.dispose(); b.dispose(); g.dispose();
      } catch (e) { console.error('[warmup] süs/fx ısıtma atlandı:', e); }
    });
  }

  _updateDecor(game) {
    const W = this._windU;
    if (!W) return;
    W.uTime.value = (this._clock || 0) / 1000;
    if (game.player) W.uPlayer.value.set(game.player.x, game.player.y);
    const st = game.decorStamp | 0;
    if (st !== this._decorStamp) this._syncDecor(game, st);
    if (this._fxN) this.fxMesh.geometry.instanceCount = Math.min(this._fxN, Quality.budget('atmo') || 70);
  }

  _syncDecor(game, st) {
    this._decorStamp = st;
    for (const k in this.decorMeshes) { this.decorGroup.remove(this.decorMeshes[k]); this.decorMeshes[k].dispose(); }
    this.decorMeshes = {};
    const list = game.decor || [];
    const geos = decorGeometries(game.arenaMapId || 'mezarlik');
    const by = {};
    for (const d of list) (by[d.kind] || (by[d.kind] = [])).push(d);
    for (const k in by) {
      const geo = geos[k];
      if (!geo) continue;
      const L = by[k];
      const m = new THREE.InstancedMesh(geo, DECOR_SWAY[k] ? this.decorMat : this.propMat, L.length);
      m.frustumCulled = false;
      m.renderOrder = 1;
      for (let i = 0; i < L.length; i++) {
        const d = L[i];
        TMP.eul.set(0, d.rot || 0, 0); TMP.q.setFromEuler(TMP.eul);
        TMP.v.set(d.x, 0, d.y); TMP.vb.setScalar((d.s || 1) * (DECOR_SCALE[k] || 2));
        TMP.m4.compose(TMP.v, TMP.q, TMP.vb);
        m.setMatrixAt(i, TMP.m4);
        const h = d.x * 0.0173 + d.y * 0.0091, v1 = h - Math.floor(h);
        TMP.col.setRGB(0.9 + v1 * 0.2, 0.92 + v1 * 0.12, 0.9 + (1 - v1) * 0.16);
        m.setColorAt(i, TMP.col);
      }
      m.instanceMatrix.needsUpdate = true;
      if (m.instanceColor) m.instanceColor.needsUpdate = true;
      this.decorMeshes[k] = m;
      this.decorGroup.add(m);
    }
    const fx = game.fx || [];
    const n = Math.min(fx.length, this._fxCap);
    const A = this._fxA.array, B = this._fxB.array, C = this._fxC.array;
    for (let i = 0; i < n; i++) {
      const f = fx[i];
      A[i * 4] = f[0]; A[i * 4 + 1] = f[1]; A[i * 4 + 2] = f[2]; A[i * 4 + 3] = f[3];
      B[i * 4] = f[4]; B[i * 4 + 1] = f[5]; B[i * 4 + 2] = f[6]; B[i * 4 + 3] = f[7];
      C[i * 3] = f[8]; C[i * 3 + 1] = f[9]; C[i * 3 + 2] = f[10];
    }
    this._fxA.needsUpdate = this._fxB.needsUpdate = this._fxC.needsUpdate = true;
    this._fxN = n;
    this.fxMesh.geometry.instanceCount = n;
    this.fxMesh.visible = n > 0;
  }

  /** Gren dokusu — ortalaması ≈ 1,0 NÖTR çarpandır.
      Sebep: renk artık vertex'te (propModels). Doku bir daha renk
      TAŞIMAZ, yalnız yüzeye mikro kırılma verir; ortalaması 1'den saparsa
      bütün palet sessizce kayar.

      2026-08-30 — İKİ İYİLEŞTİRME (kullanıcı: "dokular daha HD olmalı"):
      ① 256² → 512² ve İKİ FREKANS BANDI. Nesneler ekranda 30-200 px
        arası çizilir ve gren 58 dünya birimi başına bir kez tekrar
        eder: 256² dokuda yakın plandaki bir mahzen duvarı texel başına
        ~0,7 ekran pikseli alıyordu, yani doku BULANIKTI. 512² + ince
        band (1-2 px konfeti) yakın planda malzeme dokusu verir, kaba
        band (4-9 px leke) uzakta hayatta kalan tek şeydir.
      ② ORTALAMA ARTIK ÖLÇÜLÜP KİLİTLENİYOR. Önceki sürümde ortalama
        çizim sabitlerinden UMULUYORDU; leke sayısını ya da alfa'yı
        değiştiren biri bütün paleti fark etmeden kaydırır (palet
        parlaklığı `_proptest`te 45-95 bandına ayarlı). Şimdi doku
        pişince ortalaması ölçülür ve 242'ye normalize edilir — yani
        gren zenginleştirilebilir, palet kaymaz.
      VRAM: 512² RGBA + mip ≈ 1,4 MB (öncesi 0,35 MB). */
  _propTexture() {
    const S = 512;
    const c = document.createElement('canvas');
    c.width = c.height = S;
    const g = c.getContext('2d');
    g.fillStyle = '#f2f2f0'; g.fillRect(0, 0, S, S);
    /* kaba band: uzaktan okunan leke (mip zincirinde hayatta kalır) */
    for (let i = 0; i < 2600; i++) {
      const x = Math.random() * S, y = Math.random() * S, r = 2 + Math.random() * 7;
      g.fillStyle = Math.random() < 0.5 ? 'rgba(255,255,255,0.42)' : 'rgba(96,92,86,0.15)';
      g.beginPath(); g.arc(x, y, r, 0, 6.283); g.fill();
    }
    /* ince band: yakın planda malzeme hissi (1-2 px) */
    for (let i = 0; i < 9000; i++) {
      const x = Math.random() * S, y = Math.random() * S, r = 0.5 + Math.random() * 1.4;
      g.fillStyle = Math.random() < 0.5 ? 'rgba(255,255,255,0.30)' : 'rgba(80,76,70,0.13)';
      g.beginPath(); g.arc(x, y, r, 0, 6.283); g.fill();
    }
    /* lif/çatlak: yönlü iz — taşta damar, ahşapta lif okunur */
    for (let i = 0; i < 90; i++) {
      g.strokeStyle = Math.random() < 0.6 ? 'rgba(84,80,74,0.11)' : 'rgba(255,255,255,0.16)';
      g.lineWidth = 0.8 + Math.random() * 2.2;
      const x = Math.random() * S, y = Math.random() * S, a = Math.random() * 6.283;
      const len = 40 + Math.random() * 150;
      g.beginPath();
      g.moveTo(x, y);
      g.quadraticCurveTo(x + Math.cos(a) * len * 0.5 + 12, y + Math.sin(a) * len * 0.5 - 9,
        x + Math.cos(a) * len, y + Math.sin(a) * len);
      g.stroke();
    }
    /* ORTALAMA KİLİDİ: hedef 242 (dokunun taban tonu) */
    const img = g.getImageData(0, 0, S, S);
    const d = img.data;
    let sum = 0;
    for (let i = 0; i < d.length; i += 4) sum += d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114;
    const mean = sum / (d.length / 4);
    const k = mean > 1 ? 242 / mean : 1;
    if (Math.abs(k - 1) > 0.002) {
      for (let i = 0; i < d.length; i += 4) {
        d[i] = Math.min(255, d[i] * k);
        d[i + 1] = Math.min(255, d[i + 1] * k);
        d[i + 2] = Math.min(255, d[i + 2] * k);
      }
      g.putImageData(img, 0, 0);
    }
    const t = new THREE.CanvasTexture(c);
    if ('colorSpace' in t) t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.generateMipmaps = true;
    t.minFilter = THREE.LinearMipmapLinearFilter;
    t.magFilter = THREE.LinearFilter;
    /* 44° eğik bakışta izotropik mip dokuyu gereğinden fazla
       bulanıklaştırır (zemin dersi aynen geçerli): anizotropi 4 → 8. */
    t.anisotropy = Math.min(8, this.renderer.capabilities.getMaxAnisotropy());
    return t;
  }

  /** Harita değiştiğinde arketip meshlerini yeniden boyutlandır.
      Tahsis GÖREV BAŞINA bir kez olur (perde arkasında), sıcak döngüde asla. */
  /** Haritanın nesne geometrilerini ÖNCEDEN pişir (görev yüklemesi,
      perde arkası). Çağrılmazsa maliyeti ilk kare öder. */
  prewarmFieldChests() { if (this.fieldChestView) this.fieldChestView.prewarm(); }

  prewarmProps(pal) {
    setPropDetail(Quality.tier === 'low');
    propGeometries(pal || 'mezarlik');
    decorGeometries(pal || 'mezarlik');
  }

  _syncPropMeshes(F, pal) {
    this._propStamp = F.stamp;
    /* PALET DEĞİŞTİ → GEOMETRİ SETİ DEĞİŞTİ. Nesne albedosu vertex'e pişer
       (materyal unlit), yani her haritanın kendi geometri seti var. Mevcut
       mesh'ler ESKİ tampona bakıyor ve o tampon önbellekten atılınca (LRU)
       dispose edilir: mesh'ler burada yeniden kurulmazsa sahne sessizce boş
       çizer. */
    const lite = Quality.tier === 'low';
    if (pal !== this._propPal || lite !== this._propLite) {
      this._propPal = pal;
      this._propLite = lite;
      setPropDetail(lite);
      this.propGeos = propGeometries(pal);
      for (const k in this.propMeshes) {
        const m = this.propMeshes[k];
        this.propGroup.remove(m);
        m.dispose();
      }
      this.propMeshes = {};
    }
    for (const k in F.byKind) {
      const need = F.byKind[k].length;
      let m = this.propMeshes[k];
      if (m && m.instanceMatrix.count >= need) continue;
      if (m) { this.propGroup.remove(m); m.dispose(); }
      const geo = this.propGeos[k];
      if (!geo) continue;
      m = new THREE.InstancedMesh(geo, TREE_SWAY[k] ? this.treeMat : this.propMat, Math.max(4, need));
      m.frustumCulled = false;
      m.renderOrder = 1;
      m.count = 0;
      TMP.col.setHex(0xffffff);
      for (let i = 0; i < m.instanceMatrix.count; i++) m.setColorAt(i, TMP.col);
      this.propMeshes[k] = m;
      this.propGroup.add(m);
    }
    /* haritada olmayan arketipler görünmez kalır (mesh atılmaz: sonraki
       görevde aynı arketip gelirse yeniden tahsis etmemek daha iyidir) */
    for (const k in this.propMeshes) {
      if (!F.byKind[k]) this.propMeshes[k].count = 0;
    }
  }

  _updateProps(game) {
    const F = game.props;
    if (!F || !F.n) {
      for (const k in this.propMeshes) this.propMeshes[k].count = 0;
      return;
    }
    if (F.stamp !== this._propStamp || (game.arenaMapId || 'mezarlik') !== this._propPal) {
      this._syncPropMeshes(F, game.arenaMapId || 'mezarlik');
    }
    if (!F.dirty) return;
    for (const k in F.byKind) {
      const mesh = this.propMeshes[k];
      if (!mesh) continue;
      const list = F.byKind[k];
      let n = 0;
      for (let j = 0; j < list.length; j++) {
        const i = list[j];
        if (F.dead[i]) continue;          // devrilmesi bitti: yuvayı boşalt
        const brk = F.brk[i];
        let sy = 1, lean = 0;
        if (brk > 0) {                    // devriliyor: çök + yana yat
          const t = 1 - brk / 0.30;
          sy = 1 - t * 0.86;
          lean = t * 1.05;
        }
        TMP.eul.set(lean * 0.66, F.rot[i], lean * 0.5);
        TMP.q.setFromEuler(TMP.eul);
        TMP.v.set(F.x[i], 0, F.y[i]);
        /* X/Z ÖLÇEĞİ ZORUNLU: span türlerinin (çit · duvar · iskele)
           çarpışma kutusu aralıktan türetilir ve eskiden görsel her zaman
           model boyunda çiziliyordu — bloklar arasındaki boşluk görünmez
           duvardı ("boş alanda ilerleyemiyorum"). Ölçek MODEL uzayındadır,
           yani dönüşten etkilenmez. */
        TMP.vb.set(F.sx[i], sy, F.sz[i]);
        TMP.m4.compose(TMP.v, TMP.q, TMP.vb);
        mesh.setMatrixAt(n, TMP.m4);
        const f = F.flash[i];
        /* ÖRNEK BAŞINA TON KIRILMASI. Aynı arketipin 20 kopyası BİREBİR aynı
           renkte olduğunda göz onları nesne olarak değil "kopyala-yapıştır"
           olarak okur — "yapay" hissinin büyük kısmı model kalitesinden değil
           buradan gelir. Kırılma KONUMDAN türetilir: deterministik (kare arası
           oynamaz, kayıt gerekmez, tahsis yok) ve ±%8'i geçmez — malzeme
           kimliği korunur, yalnız "aynı taş ocağından farklı blok" eklenir. */
        const h1 = F.x[i] * 0.0173 + F.y[i] * 0.0091;
        const h2 = F.x[i] * 0.0067 - F.y[i] * 0.0151;
        const v1 = h1 - Math.floor(h1), v2 = h2 - Math.floor(h2);
        const tr = 0.92 + v1 * 0.16, tg = 0.93 + (v1 + v2) * 0.07, tb = 0.92 + v2 * 0.16;
        TMP.col.setRGB(tr, tg, tb);
        if (f > 0) {
          TMP.colb.setRGB(2.4, 2.1, 1.6);
          TMP.col.lerp(TMP.colb, Math.min(1, f * 7));
        }
        mesh.setColorAt(n, TMP.col);
        n++;
      }
      commitInstanced(mesh, n, true);
      mesh.visible = n > 0;
    }
    F.dirty = false;
  }

  /* ═══════════ GÖREV ÇIPALARI ══════════════════════════════
     KURTARILACAK İNSAN + KALKAN KUBBESİ + VARIŞ FENERİ.

     Kullanıcı isteği: "escort görevi için koruma kalkanı içerisinde bir
     insan kurtarılmayı beklesin". Kubbe bir süs değil OKUMA aracı:
     4000 px'lik sahada uzaktan görünen tek şey odur, oyuncu "orada bir
     şey var" diye oraya gider. Kubbe kırılınca escort başlar.

     Kubbe YARI SAYDAM ama KÜÇÜK: CLAUDE.md'nin yasağı ekranın büyük
     bölümünü kaplayan katmanlar içindir; 150 birimlik yerel bir kubbe
     birkaç yüz pikseldir, fillrate maliyeti ölçülemez. İki yüz de çizilmez
     (`side: FrontSide`) — iç yüz overdraw'u bedava değil.

     İnsan modeli propModels'ten gelir (pelerin + kapüşon + parlayan fener),
     yani kutu değil; örneklenmiyor çünkü sahada bir tane var. */
  _buildObjective() {
    this.objGroup = new THREE.Group();
    this.scene.add(this.objGroup);

    this.npcMesh = new THREE.Mesh(humanGeometry(), this.propMat);
    this.npcMesh.frustumCulled = false;
    this.npcMesh.renderOrder = 2;
    this.npcMesh.visible = false;
    this.objGroup.add(this.npcMesh);

    /* kalkan kubbesi (v43): panel kafes + perde + rün halkası + yayıcı
       kaideler + tepe mücevheri — bkz. shieldDome.js. Isıtma bloğu grubu
       `domeMesh` adıyla görünür yapar, yani bütün çocuk malzemeler derlenir. */
    this.shield = new ShieldDome(this.propMat);
    this.objGroup.add(this.shield.group);
    this.domeMesh = this.shield.group;
    this.domeRing = this.shield.ring;
    const rg = new THREE.TorusGeometry(1, 0.045, 6, 30);
    rg.rotateX(Math.PI / 2);

    /* varış feneri: taş kaide + nabzı yÜKSEKLİKLE atan ışık sütunu.
       Opaklıkla nefes almak yerine ölçekle: yarı saydamın alanı büyüyor,
       ölçeğin maliyeti yok. */
    const cg = new THREE.CylinderGeometry(1, 1.25, 1, 12, 1, true);
    cg.translate(0, 0.5, 0);
    this.beaconMat = new THREE.MeshBasicMaterial({
      color: 0x7fe3b0, transparent: true, opacity: 0.30,
      blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
    });
    this.beacon = new THREE.Mesh(cg, this.beaconMat);
    this.beacon.frustumCulled = false;
    this.beacon.renderOrder = 6;
    this.beacon.visible = false;
    this.objGroup.add(this.beacon);

    this.beaconRing = new THREE.Mesh(rg, new THREE.MeshBasicMaterial({
      color: 0x9ff2c4, transparent: true, opacity: 0.8,
      blending: THREE.AdditiveBlending, depthWrite: false,
    }));
    this.beaconRing.frustumCulled = false;
    this.beaconRing.renderOrder = 6;
    this.beaconRing.visible = false;
    this.objGroup.add(this.beaconRing);
  }

  _updateObjective(game) {
    const O = game.objectives;
    if (!O) return;
    const t = game.time;
    const ph = O.phase;

    /* ── İNSAN ── */
    if (ph === 'waiting' || ph === 'escort') {
      const p = O.npc;
      const moving = (p.vx * p.vx + p.vy * p.vy) > 900;
      /* yürüyüş: gövde sallandırılır + hafif zıplar. Klip yok — pozu
         prosedürel yaz (bossMotion dersi: hareket eklemde yaşar). */
      const sway = moving ? Math.sin(p.anim) * 0.10 : Math.sin(t * 1.6) * 0.035;
      const bob = moving ? Math.abs(Math.sin(p.anim)) * 3.4 : Math.sin(t * 1.6) * 0.7;
      const face = moving ? Math.atan2(p.vx, p.vy) : (p.face || 0);
      p.face = face;
      TMP.eul.set(sway * 0.35, face, sway);
      TMP.q.setFromEuler(TMP.eul);
      TMP.v.set(p.x, bob, p.y);
      TMP.vb.set(1, 1, 1);
      TMP.m4.compose(TMP.v, TMP.q, TMP.vb);
      this.npcMesh.matrix.copy(TMP.m4);
      this.npcMesh.matrixAutoUpdate = false;
      this.npcMesh.visible = true;
    } else if (this.npcMesh.visible) {
      this.npcMesh.visible = false;
    }

    /* ── KALKAN KUBBESİ: beklerken durur, kırılırken genişleyip söner ── */
    const shat = O.domeT;              // 0 = sağlam, 1 = tamamen kırıldı
    this.shield.update(t, O.npc.x, O.npc.y, shat, ph === 'waiting' || shat > 0);

    /* ── VARIŞ FENERİ: yalnız taşırken ── */
    if (ph === 'escort') {
      const d = O.dest;
      const pulse = 0.5 + Math.sin(t * 2.3) * 0.5;
      this.beacon.position.set(d.x, 0, d.y);
      this.beacon.scale.set(58, 300 + pulse * 210, 58);
      this.beaconMat.opacity = 0.16 + pulse * 0.16;
      this.beacon.visible = true;
      this.beaconRing.position.set(d.x, 2, d.y);
      const rr = 150 + pulse * 26;
      this.beaconRing.scale.set(rr, rr, rr);
      this.beaconRing.visible = true;
    } else if (this.beacon.visible) {
      this.beacon.visible = false;
      this.beaconRing.visible = false;
    }
  }

  /** ═══════════ DÜNYA ATMOSFERİ ═══════════
      Her dünyanın kendine has havası: tema tonuna boyanmış zemin/ışık +
      sürüklenen ortam parçacıkları (kor/spor/toz/ışık zerresi/enkaz) +
      ufukta sabit duran devasa bir simge (yanardağ, mantar, gül pencere…).
      Kamerayı takip eden voidGround gibi bunlar da (cx,cy)'ye göre sabit
      bir göreli konumda kalır — oyuncu nereye giderse gitsin ufuk hep
      aynı yerde durur (paralaks arka plan hissi, gerçek dünya konumu yok). */
  _buildAtmosphere() {
    const ATMO = {
      mezarlik: { color: 0xffd98a, count: 70, mode: 'drift', rise: 5,  sway: 16, size: 3.4 },
      kul:      { color: 0xff8a44, count: 110, mode: 'rise',  rise: 46, sway: 14, size: 4.2 },
      bataklik: { color: 0x7ef2cf, count: 90, mode: 'rise',  rise: 20, sway: 22, size: 3.6 },
      katedral: { color: 0xd8b8ff, count: 55, mode: 'drift', rise: 5,  sway: 12, size: 3.2 },
      hiclik:   { color: 0xc8c4ff, count: 70, mode: 'orbit', rise: 0,  sway: 0,  size: 3 },
      gokada:   { color: 0xc08aff, count: 100, mode: 'rise',  rise: 34, sway: 20, size: 3.8 },
    };
    this._ATMO = ATMO;
    this.atmoGroup = new THREE.Group();
    this.scene.add(this.atmoGroup);

    /* ortam parçacıkları: tek THREE.Points, dünya değişince renk/davranış
       yeniden atanır. Konumlar kamera merkezine göre YEREL ofset olarak
       JS tarafında tutulur, her kare buffer'a yazılır. */
    const CAP = 110;
    this._atmoCap = CAP;
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(CAP * 3);
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({
      color: 0xffffff, size: 4, transparent: true, opacity: 0.65,
      depthWrite: false, sizeAttenuation: true, blending: THREE.AdditiveBlending,
    });
    this.atmoPoints = new THREE.Points(geo, mat);
    this.atmoPoints.visible = false;   // KAPALI: oyuncunun üstünde "yıldızımsı" parlayan noktalar rahatsız ediciydi
    this.atmoGroup.add(this.atmoPoints);
    this._atmoState = [];
    for (let i = 0; i < CAP; i++) {
      this._atmoState.push({ ox: 0, oy: 0, oz: 0, phase: Math.random() * 6.283, spd: 0.6 + Math.random() * 0.8 });
    }

    /* ufuk simgesi: dünyaya özgü devasa siluet, sabit göreli konumda */
    this._landmark = null;
    this._atmoWorldId = null;
  }

  _respawnAtmoParticle(s, cfg, initial) {
    const spread = 520;
    s.ox = (Math.random() - 0.5) * spread;
    s.oz = (Math.random() - 0.5) * spread - 120;
    if (cfg.mode === 'rise') {
      s.oy = initial ? Math.random() * cfg.rise * 4 : -6 - Math.random() * 10;
    } else if (cfg.mode === 'orbit') {
      const a = Math.random() * 6.283, r = 80 + Math.random() * (spread * 0.42);
      s.ox = Math.cos(a) * r; s.oz = Math.sin(a) * r - 120;
      s.oy = 20 + Math.random() * 160;
      s.orbitA = a; s.orbitR = r;
    } else {
      s.oy = 10 + Math.random() * 150;
    }
  }

  /** dünyaya özgü devasa ufuk simgesi (basit, uzaktan-siluet kalitesinde). */
  _buildLandmark(floor, colorHex) {
    const g = new THREE.Group();
    if (floor === 'kul') {
      const cone = new THREE.Mesh(new THREE.ConeGeometry(230, 340, 8),
        new THREE.MeshBasicMaterial({ color: 0x160e0c }));
      cone.position.y = 150;
      const lava = new THREE.Mesh(new THREE.CircleGeometry(46, 20),
        new THREE.MeshBasicMaterial({ color: 0xff5a2c }));
      lava.rotation.x = -Math.PI / 2;
      lava.position.y = 318;
      g.add(cone, lava);
    } else if (floor === 'bataklik') {
      for (const [ox, sc] of [[-160, 1], [140, 0.8], [30, 0.55]]) {
        const stem = new THREE.Mesh(new THREE.CylinderGeometry(14 * sc, 18 * sc, 130 * sc, 8),
          new THREE.MeshBasicMaterial({ color: 0x122820 }));
        stem.position.set(ox, 65 * sc, -60);
        const cap = new THREE.Mesh(new THREE.SphereGeometry(64 * sc, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2),
          new THREE.MeshBasicMaterial({ color: 0x1f4a3a }));
        cap.position.set(ox, 130 * sc, -60);
        g.add(stem, cap);
      }
    } else if (floor === 'katedral') {
      const wall = new THREE.Mesh(new THREE.BoxGeometry(420, 260, 20),
        new THREE.MeshBasicMaterial({ color: 0x1c1628 }));
      wall.position.set(0, 130, -80);
      const rose = new THREE.Mesh(new THREE.CircleGeometry(90, 24),
        new THREE.MeshBasicMaterial({ color: colorHex }));
      rose.position.set(0, 190, -68);
      g.add(wall, rose);
    } else if (floor === 'hiclik') {
      for (let i = 0; i < 4; i++) {
        const ring = new THREE.Mesh(new THREE.TorusGeometry(70 + i * 44, 4, 6, 28),
          new THREE.MeshBasicMaterial({ color: 0xb4aaff, transparent: true, opacity: 0.4 - i * 0.06 }));
        ring.rotation.x = Math.PI / 2.3;
        ring.position.set(0, 220, -100);
        g.add(ring);
      }
    } else {
      const doorMat = new THREE.MeshBasicMaterial({ color: 0x100c16 });
      const pillarL = new THREE.Mesh(new THREE.BoxGeometry(30, 220, 24), doorMat);
      pillarL.position.set(-100, 110, -90);
      const pillarR = pillarL.clone(); pillarR.position.x = 100;
      const lintel = new THREE.Mesh(new THREE.BoxGeometry(230, 34, 24), doorMat);
      lintel.position.set(0, 224, -90);
      g.add(pillarL, pillarR, lintel);
    }
    return g;
  }

  _disposeAtmoGroup(g) {
    g.traverse((o) => {
      if (o.isMesh) {
        o.geometry.dispose();
        if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => m.dispose());
      }
    });
  }

  _setWorldAtmosphere(wd) {
    this._atmoWorldId = wd.id;
    const colorHex = new THREE.Color(wd.color).getHex();
    const moonHex = new THREE.Color(wd.moon[0]).getHex();

    /* zemin/gökyüzü tonu — sade ama dünyaya göre ayrışan koyu ton */
    const voidTint = new THREE.Color(0x171d2c).lerp(new THREE.Color(wd.color), 0.24);
    this.voidGround.material.color.copy(voidTint);
    this.scene.background = new THREE.Color(0x07080d).lerp(new THREE.Color(wd.color), 0.05);
    if (this.moonLight) this.moonLight.color.setHex(moonHex);
    if (this.rimLight) this.rimLight.color.setHex(colorHex);

    /* ufuk simgesi KALDIRILDI: kamerayı 1:1 takip eden silüet "dünya benimle
       yürüyor" hissi veriyordu. Ufuk artık dünya tonundaki sisle verilir. */
    if (this._landmark) { this.atmoGroup.remove(this._landmark); this._disposeAtmoGroup(this._landmark); this._landmark = null; }
    if (this.scene.fog) this.scene.fog.color.copy(voidTint);

    /* parçacık havuzunu yeni tema ile sıfırla */
    const cfg = this._ATMO[wd.floor] || this._ATMO.mezarlik;
    this._atmoCfg = cfg;
    this.atmoPoints.material.color.setHex(new THREE.Color(cfg.color).getHex());
    this.atmoPoints.material.size = cfg.size;
    for (const s of this._atmoState) this._respawnAtmoParticle(s, cfg, true);

    /* dekor yok: bu tarz oyunlar düz zeminde oynanır — derinlik zemin
       sanatı + atmosfer parçacıklarıyla verilir. */
    if (this._decor) { this.scene.remove(this._decor); this._disposeAtmoGroup(this._decor); this._decor = null; }
  }

  _updateAtmosphere(game, dt) {
    const wd = game.worldDef ? game.worldDef() : null;
    if (!wd) return;
    if (this._atmoWorldId !== wd.id) this._setWorldAtmosphere(wd);
    const cfg = this._atmoCfg;
    if (!cfg) return;
    const cx = game.cam.x, cy = game.cam.y;

    
    this.atmoGroup.position.set(0, 0, 0);

    const posAttr = this.atmoPoints.geometry.attributes.position;
    const arr = posAttr.array;
    const t = this._clock / 1000;
    for (let i = 0; i < this._atmoState.length; i++) {
      const s = this._atmoState[i];
      if (cfg.mode === 'rise') {
        s.oy += cfg.rise * dt * s.spd;
        s.ox += Math.sin(t * 0.8 + s.phase) * cfg.sway * dt;
        if (s.oy > 260) this._respawnAtmoParticle(s, cfg, false);
      } else if (cfg.mode === 'orbit') {
        s.orbitA += dt * 0.15 * s.spd;
        s.ox = Math.cos(s.orbitA) * s.orbitR;
        s.oz = Math.sin(s.orbitA) * s.orbitR - 120;
        s.oy += Math.sin(t * 0.5 + s.phase) * 4 * dt;
      } else {
        s.ox += Math.sin(t * 0.35 + s.phase) * cfg.sway * dt;
        s.oz += Math.cos(t * 0.3 + s.phase) * cfg.sway * dt;
        s.oy += Math.sin(t * 0.6 + s.phase) * 2.4 * dt;
      }
      arr[i * 3] = cx + s.ox;
      arr[i * 3 + 1] = s.oy;
      arr[i * 3 + 2] = cy + s.oz;
    }
    posAttr.needsUpdate = true;
  }

  _buildPlaceholderPlayer(charId) {
    const def = CHARACTERS[charId] || CHARACTERS[DEFAULT_CHAR];
    const col = def.colors || {};
    const g = new THREE.Group();
    const body = new THREE.Mesh(
      new THREE.CapsuleGeometry(9, 18, 4, 8),
      new THREE.MeshStandardMaterial({ color: col.cloak || '#3a4a5c', roughness: 0.8 })
    );
    body.position.y = 23;
    body.castShadow = true;
    const eyeMat = new THREE.MeshStandardMaterial({ color: 0x000000, emissive: col.eye || '#4fd0ff', emissiveIntensity: 2.2 });
    const eyeL = new THREE.Mesh(new THREE.SphereGeometry(2, 8, 8), eyeMat);
    const eyeR = eyeL.clone();
    eyeL.position.set(-3, 34, 8);
    eyeR.position.set(3, 34, 8);
    g.add(body, eyeL, eyeR);
    return g;
  }

  /** Kayıtlı bir Meshy modeli varsa yükler; yoksa renkli yer tutucuya düşer.
      Karakter değiştiğinde (kuşam ekranı, koşu başlangıcı) tekrar çağrılabilir. */
  loadCharacter(charId) {
    if (this._currentCharId === charId) return;
    this._currentCharId = charId;

    if (!this.playerRoot) {
      this.playerRoot = new THREE.Group();
      this.scene.add(this.playerRoot);
      const shadowMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.4, depthWrite: false });
      this.playerShadow = new THREE.Mesh(new THREE.CircleGeometry(1, 24), shadowMat);
      this.playerShadow.rotation.x = -Math.PI / 2;
      this.playerShadow.position.y = 0.4;
      this.scene.add(this.playerShadow);
    }

    /* önceki modeli/yer tutucuyu temizle */
    if (this.heroMesh) { this.playerRoot.remove(this.heroMesh); this.heroMesh = null; }
    if (this.playerPlaceholder) { this.playerRoot.remove(this.playerPlaceholder); this.playerPlaceholder = null; }
    this.mixer = null; this.walkAction = null; this.armBones = null; this.idleBones = null;
    this._idleFrozen = false; this.heroReady = false;

    const placeholder = this._buildPlaceholderPlayer(charId);
    this.playerPlaceholder = placeholder;
    this.playerRoot.add(placeholder);

    const modelDef = CHARACTER_MODELS[charId];

    /* İMZA KILICI: kahramanın süzülen kılıcı varsa ona ait model + paletle
       kurulur. Karışık kadroda (Seher ↔ Kraliçe) geçişte eski rig sökülür;
       aksi halde her geçişte sahnede bir kılıç daha birikirdi. */
    const swSpec = (modelDef && SWORD_SPECS[modelDef.floatingWeapon]) || null;
    const curW = this._swordSpec ? this._swordSpec.weapon : null;
    const newW = swSpec ? swSpec.weapon : null;
    if (curW !== newW) {
      this._disposeSword();
      if (swSpec) this._buildSword(swSpec);
    }

    if (modelDef) this._loadCharacterModel(charId, modelDef);
  }

  /** Süzülen kılıç rigini sahneden söker (karakter değişimi).
      DOKULAR BİLEREK BıRAKILMAZ: iz/hale dokuları (_softBlobTexture,
      _slashTexture, _shockTexture) tüm efektlerde PAYLAŞILIR — burada
      dispose edilirse alev halesi ve şok halkaları da kararmış olurdu. */
  _disposeSword() {
    const kill = (o) => {
      if (!o) return;
      if (o.parent) o.parent.remove(o);
      o.traverse((c) => {
        if (c.geometry) c.geometry.dispose();
        const mats = Array.isArray(c.material) ? c.material : (c.material ? [c.material] : []);
        for (const mt of mats) mt.dispose();
      });
    };
    kill(this.swordPivot);
    kill(this.swordEchoGroup);
    if (this.shockRings) for (let i = 0; i < this.shockRings.length; i++) kill(this.shockRings[i]);
    if (this.waveGroups) for (let i = 0; i < this.waveGroups.length; i++) kill(this.waveGroups[i]);
    this.swordPivot = null; this.swordInner = null; this.swordSpinner = null;
    this.swordTrail = null; this.swordFlame = null; this.swordFlameCore = null;
    this.swordEcho = null; this.swordEchoGroup = null;
    this.shockRings = null;
    this.waveGroups = []; this.waveMeshes = [];
    this.swordReady = false;
    this._swordSpec = null;
  }

  /** Modeli önceden getir (ağ + parse + doku) ve promise'i cache'le —
      menüde çağrılır ki savaşa girildiğinde model ANINDA hazır olsun ve
      2-3 saniye "patates" yer tutucu görünmesin. Ağ/parse yalnızca bir
      kez yapılır; her takılmada SkeletonUtils.clone ile taze kopya alınır. */
  preloadCharacter(charId) {
    const modelDef = CHARACTER_MODELS[charId];
    if (modelDef) this._fetchModel(charId, modelDef).catch(() => {});
  }

  /** Draco kod-çözücü — Meshy GLB'leri sıkıştırılmış geldiğinden hem karakter
      hem imza silahı yükleyicilerinde paylaşılır. Tek örnek, tembel kurulur. */
  _getDraco() {
    if (!this._draco) {
      this._draco = new DRACOLoader();
      this._draco.setDecoderPath(window.__SR_DRACO || 'https://www.gstatic.com/draco/versioned/decoders/1.5.7/');
    }
    return this._draco;
  }

  _fetchModel(charId, modelDef) {
    if (!this._modelPromises) this._modelPromises = {};
    if (this._modelPromises[charId]) return this._modelPromises[charId];
    const p = (async () => {
      let model, animations;
      const HERO_TEX = Quality.budget('texHero');
      if (modelDef.decimate) {
        /* Ağır Tripo/Meshy ihracı: deri korunarak sadeleştirilir + önbelleklenir.
           Ham 390k üçgenlik ağ GPU'ya HİÇ yüklenmez. */
        const d = modelDef.decimate;
        const res = await loadDecimatedHero(THREE, { GLTFLoader, DRACOLoader }, modelDef.glb, {
          key: d.key, targetTris: d.targetTris,
          texSize: Math.min(d.texSize || 1024, HERO_TEX),
          headFrom: d.headFrom,
        });
        model = res.model;
        animations = res.animations;
        model.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; o.frustumCulled = false; } });
        /* İŞIK KALDIRMA (opt-in, `lift`): bazı Tripo dokuları kendi içinde ÇOK
           KOYU gelir (Kara Kaptan'ın yeşil-siyah ceketi, Kraliçenin mor
           zırhı) — karanlık mezarlıkta silueti okunmuyor. Çözüm YENİ IŞIK
           DEĞİL (yasak, bkz. CLAUDE.md): dokunun kendisi emissiveMap olarak
           kullanılır, yani her piksel KENDİ rengini az miktarda yayar.
           Düz emissive rengi (eski denemede 0x14100c) siyahları birlikte
           kaldırıp her şeyi grileştiriyordu; çarpımsal maskede bu olmaz.
           Önbellekten BAĞIMSIZ uygulanır — FORMAT'ı artırmaya gerek yok. */
        if (modelDef.lift) {
          model.traverse((o) => {
            if (!o.isMesh || !o.material) return;
            const mats = Array.isArray(o.material) ? o.material : [o.material];
            for (const mt of mats) {
              if (!mt || !mt.emissive) continue;
              mt.emissive.setHex(0xffffff);
              mt.emissiveMap = mt.map || null;
              mt.emissiveIntensity = modelDef.lift;
              /* pürüz kelepçesi 0.62 → 0.52: hafif bir parlama silueti tanımlar
                 (şapkanın kenarı, sırma işlemeler). metalness YÜKSELTİLMEZ —
                 env map olmadan metal yüzey daha da kararlır. */
              if (mt.roughness != null) mt.roughness = Math.min(mt.roughness, modelDef.rough || 0.52);
              mt.needsUpdate = true;
            }
          });
        }
        /* PREMİUM MOBİL PASO: pürüz kelepçesi + kenar ışığı + anizotropi 8.
           lift'ten SONRA çağrılır — emissiveMap o blokta bağlanıyor ve
           pasonun filtre ayarı onu da kapsamak zorunda. */
        applyCharLookTo(model);
      } else if (modelDef.glb) {
        /* GLB: gömülü PBR materyal + animasyon (Meshy 'withSkin' ihracı). */
        const loader = new GLTFLoader();
        loader.setDRACOLoader(this._getDraco());
        const gltf = await loader.loadAsync(modelDef.glb);
        model = gltf.scene;
        animations = gltf.animations;
        /* SAVAŞÇI gibi bazı Tripo/Blender NLA ihraçları kalça kemiğini klip
           boyunca kaydırır (root motion) — oyun konumu kendi mantığından
           verdiği için karakter yürürken yere batar/kayar. Yalnız opt-in
           (bkz. heroModel.stripRootMotion — hero decimate yolunun aynısı). */
        if (modelDef.stripRoot) {
          const rootNames = new Set(modelDef.rootBones || ['Root', 'Hip', 'Pelvis', 'Hips', 'Armature']);
          for (const clip of animations || []) stripRootMotion(clip, rootNames);
        }
        /* Gömülü Meshy dokuları 1024²–2048² gelir ve GLB yolunda hiç
           bütçelenmiyordu (FBX yolunda vardı). Kahraman modelleri ekranda
           büyük görünür → texHero; düşmanlar küçük → tex. */
        budgetTextures(model, Quality.budget('texHero'));
        model.traverse((o) => {
          if (o.isMesh) {
            o.castShadow = true;
            o.receiveShadow = true;
            /* skinned mesh'in hatalı bounding-sphere culling'i modeli
               görünmez yapıyordu — kapat. */
            o.frustumCulled = false;
            /* Tripo/Meshy ihraçları doubleSided:true gelir — mobil GPU'da
               her üçgen iki kez rasterize edilir (fillrate ×2), kapalı
               gövdede sıfır görsel fark (bkz. CLAUDE.md). */
            const mats = Array.isArray(o.material) ? o.material : [o.material];
            for (const mt of mats) {
              if (!mt) continue;
              mt.side = THREE.FrontSide;
              /* PÜRÜZ KELEPÇESİ — okunurluk için kritik: Tripo materyali
                 roughness 0.9 ile gelir, yani tamamen mat. Sahnede env map
                 yok, o yüzden 0.9'da modelin üstünde formu tanımlayan HİÇ
                 parlama olmaz: karanlık zeminde yassı, koyu bir leke gibi
                 durur ("detaylı gözükmüyor, tam göremiyorum").
                 Decimate yolundan geçen kahramanlar (Seher/Şimşek) bunu
                 zaten alıyordu (heroModel.js → min(0.62, ...)); ham GLB
                 yolundan gelenler (GÖKALEV/SAVAŞÇI) almıyordu. Aynı
                 değerlere hizalandı. */
              if (mt.roughness != null) mt.roughness = Math.min(0.62, mt.roughness);
              if (mt.metalness != null) mt.metalness = Math.max(0.05, Math.min(0.25, mt.metalness));
              applyCharLook(mt);
            }
          }
        });
      } else {
        const dir = modelDef.dir, tp = modelDef.texPrefix;
        const loader = new FBXLoader();
        const [fbx, albedo, normalMap, metalMap, roughMap] = await Promise.all([
          loader.loadAsync(dir + modelDef.file),
          /* Sabit 1536/768 yazılıydı — kural 4 ihlali. Artık kademeye göre:
             yüksekte aynı (1536), ortada 1024, düşükte 768. Telefon
             ekranında ~300 px boyunda görünen bir karakterde 1536² dokunun
             fazlası mipmap'e gidiyor, yani boşa harcanan GPU belleği. */
          loadTextureDownscaled(dir + tp + '_albedo.png', HERO_TEX),
          loadTextureDownscaled(dir + tp + '_normal.png', HERO_TEX),
          loadTextureDownscaled(dir + tp + '_metallic.png', HERO_TEX >> 1),
          loadTextureDownscaled(dir + tp + '_roughness.png', HERO_TEX >> 1),
        ]);
        if ('colorSpace' in albedo) albedo.colorSpace = THREE.SRGBColorSpace;
        fbx.traverse((o) => {
          if (o.isMesh) {
            o.castShadow = true;
            o.receiveShadow = true;
            o.frustumCulled = false;
            o.material = new THREE.MeshStandardMaterial({
              map: albedo, normalMap, metalnessMap: metalMap, roughnessMap: roughMap,
              metalness: 1, roughness: 1,
            });
          }
        });
        model = fbx;
        animations = fbx.animations;
      }
      return { model, animations };
    })();
    this._modelPromises[charId] = p;
    p.catch(() => { if (this._modelPromises[charId] === p) delete this._modelPromises[charId]; });
    return p;
  }

  async _loadCharacterModel(charId, modelDef) {
    try {
      const cached = await this._fetchModel(charId, modelDef);
      if (this._currentCharId !== charId) return;   // kullanıcı bu arada karakter değiştirdi
      /* Cache'lenen ham modelden taze bir kopya al — ölçekleme/konum
         mantığı kopyaya uygulanır, cache'teki orijinal bozulmaz. */
      const model = skeletonClone(cached.model);
      /* ÇOK PARÇALI KAHRAMANDA TEK İSKELET — skeletonClone'u geri al.
         heroModel.buildFromCache 13 parçanın hepsini TEK Skeleton'a bağlar
         (kemik dokusu bir kez yüklensin diye), ama SkeletonUtils klonu her
         SkinnedMesh için AYRI bir Skeleton kurar ve bunu bozar: Kraliçe'de
         kare başına 1 yerine 13 kemik dokusu bağlanıyordu (ölçüldü:
         boneTextures 13). Klondaki kemik ağacı ortaktır ve tüm parçalar aynı
         41 kemiği aynı sırada indeksler (heroModel skinIndex'leri ortak
         sıraya çeviriyor), bu yüzden İLK parçanın iskeletini hepsine yeniden
         bağlamak güvenlidir. Tek ağlı kahramanlarda (Seher/Kaptan) no-op. */
      {
        let first = null, extra = 0;
        model.traverse((o) => {
          if (!o.isSkinnedMesh) return;
          if (!first) { first = o; return; }
          if (o.skeleton !== first.skeleton) {
            o.bind(first.skeleton, o.bindMatrix);
            extra++;
          }
        });
        if (extra) console.info('[hero] ' + charId + ': ' + (extra + 1) + ' parça tek iskelete bağlandı');
      }
      const animations = cached.animations;

      /* boyu hedef yüksekliğe getir, ayaklar zemine otursun */
      const box = new THREE.Box3().setFromObject(model);
      const size = new THREE.Vector3(); box.getSize(size);
      const targetHeight = modelDef.height || 46;
      const scale = targetHeight / Math.max(1, size.y);
      model.scale.setScalar(scale);
      const box2 = new THREE.Box3().setFromObject(model);
      model.position.y -= box2.min.y;
      /* X/Z MERKEZLEME — kritik: Tripo ihraçları origin'de merkezli GELMEZ.
         GÖKALEV'in ağı Z ekseninde 1.33→1.98 aralığındaydı, yani ölçekten
         sonra oyuncunun gerçek konumundan ~122 birim uzakta çiziliyordu:
         gölge, can barı ve vuruş alanı bir yerde, görünen gövde başka
         yerde — "havada uçuyor / bozuk" görüntüsünün sebebi buydu.
         Zaten merkezli modellerde (Seher/Şimşek/Savaşçı) bu işlem no-op. */
      model.position.x -= (box2.min.x + box2.max.x) / 2;
      model.position.z -= (box2.min.z + box2.max.z) / 2;
      this._heroBaseY = model.position.y;
      this._heroBaseX = model.position.x;
      this._heroBaseZ = model.position.z;
      this._heroTopY = box2.max.y - box2.min.y;   // ölçekli gerçek boy (~hedef yükseklik)

      if (this.playerPlaceholder) { this.playerRoot.remove(this.playerPlaceholder); this.playerPlaceholder = null; }
      this.playerRoot.add(model);
      this.heroMesh = model;

      if (animations && animations.length) {
        /* İsimli klip varsa yürüyüşü ona göre seç (bazı GLB'ler "Running" gibi
           başka bir klibi 0. sırada tutuyor); modelDef.walkClipName açıkça
           hangi klibi kullanacağını söyleyebilir (Blender NLA ihraçları
           "NlaTrack.001" gibi anlamsız adlar taşıyabilir — bkz. ŞİMŞEK).
           yoksa ilk klibe düş. */
        const walkClip = (modelDef.walkClipName && animations.find((a) => a.name === modelDef.walkClipName))
          || animations.find((a) => /walk/i.test(a.name)) || animations[0];
        this.mixer = new THREE.AnimationMixer(model);
        this.walkAction = this.mixer.clipAction(walkClip);
        this.walkAction.play();
        if (modelDef.walkRate) this.walkAction.timeScale = modelDef.walkRate;
      }

      /* Kemik tablosu — FBX (RightArm/Neck/Spine2) ve GLB (RightArm/neck/Spine02)
         adlandırmalarını birlikte kapsar. */
      const bones = {};
      model.traverse((o) => { if (o.isBone) bones[o.name] = o; });
      /* KOL İNDİRME DÜZELTMESİ yalnız armFix'li FBX'lerde: bazı Meshy yürüyüş
         kliplerinde kollar T-poz çapraz kalıyor — tepeden kamerada "uçuşan
         enkaz" gibi görünüyor. GLB okçunun yürüyüş klibi kolları doğru tutar,
         ona dokunulmaz. */
      if (modelDef.armFix && bones.RightArm && bones.LeftArm) {
        this.armBones = { r: bones.RightArm, l: bones.LeftArm };
      }
      /* göğüs/boyun/baş kemikleri — gerçek "yerinde durma" klibi yok; bu
         kemikleri prosedürel nefes alma / baş sallama için kullanıyoruz. */
      const idle = {
        chest: bones.Spine2 || bones.Chest || bones.Spine02 || bones.Spine1 || bones.Spine01,
        spine: bones.Spine,
        neck: bones.Neck || bones.neck || bones.NeckTwist01,
        head: bones.Head,
      };
      /* İSKELETSİZ modelde (Tripo heykel ihracı — GÖKALEV, SAVAŞÇI'nın ilk
         hâli) bu alanların HEPSİ undefined olur, ama nesnenin kendisi
         truthy'dir. Eskiden bu yüzden _updatePlayer'ın "yerinde durma" dalı
         seçiliyor, prosedürel yürüyüşün yatma açısı hiç sıfırlanmıyordu —
         karakter durunca eğik kalıyordu. Kemik bulunmadıysa null bırak. */
      const hasBones = !!(idle.chest || idle.spine || idle.neck || idle.head);
      this.idleBones = hasBones ? idle : null;
      /* Prosedürel kemik düzeltmeleri (kol indirme, nefes, baş dönüşü) her
         karede pozun ÜSTÜNE eklenir. Mixer varken mixer.update() pozu her
         karede sıfırlar; mixer YOKKEN (animasyonsuz model) rotasyonlar kare
         kare BİRİKİP kafanın çevresinde dönen bozuntulara yol açıyordu.
         Taban quaternion'ları kaydet — her karede geri yükleyip öyle ekle. */
      this._poseBase = [];
      const seen = new Set();
      for (const b of [this.armBones && this.armBones.r, this.armBones && this.armBones.l,
                       idle.chest, idle.spine, idle.neck, idle.head]) {
        if (b && !seen.has(b)) { seen.add(b); this._poseBase.push({ b, q: b.quaternion.clone() }); }
      }

      this.heroReady = true;
    } catch (err) {
      console.warn('Karakter modeli (' + charId + ') yüklenemedi, yer tutucu kalıyor.', err);
    }
  }

  _buildEnemyPools() {
    const MAX = (this.game.maxEnemies || 460) + 20;
    this._enemyMax = MAX;
    const bodyGeo = new THREE.CapsuleGeometry(6, 10, 4, 8);
    const bodyMat = new THREE.MeshStandardMaterial({ roughness: 0.7, metalness: 0.05 });
    this.enemyMesh = new THREE.InstancedMesh(bodyGeo, bodyMat, MAX);
    this.enemyMesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(MAX * 3), 3);
    this.enemyMesh.count = 0;
    /* KRİTİK: InstancedMesh'in frustum testi TEK örneğin (origin merkezli,
       ~birkaç birimlik) bounding sphere'ıyla yapılır — kamera dünya
       merkezinden uzaklaşınca TÜM düşmanlar aynı anda "kayboluyordu".
       Örnekler haritanın her yerinde olabildiği için culling kapatılır. */
    this.enemyMesh.frustumCulled = false;
    this.enemyMesh.castShadow = true;
    this.scene.add(this.enemyMesh);

    const eyeGeo = new THREE.SphereGeometry(1, 6, 6);
    const eyeMat = new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0xffffff, emissiveIntensity: 2 });
    this.eyeMesh = new THREE.InstancedMesh(eyeGeo, eyeMat, MAX);
    this.eyeMesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(MAX * 3), 3);
    this.eyeMesh.count = 0;
    this.eyeMesh.frustumCulled = false;
    this.scene.add(this.eyeMesh);

    /* düşmanların altına yumuşak gölge — zemine basar gibi görünsün */
    const shGeo = new THREE.CircleGeometry(1, 12);
    shGeo.rotateX(-Math.PI / 2);
    const shMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.35, depthWrite: false });
    this.enemyShadowMesh = new THREE.InstancedMesh(shGeo, shMat, MAX);
    this.enemyShadowMesh.count = 0;
    this.enemyShadowMesh.frustumCulled = false;
    this.scene.add(this.enemyShadowMesh);

    /* boss: yer tutucu kapsül + boynuzlar. GERÇEK boss modeli (Hasat Lordu)
       asıl sanattır ve `_ensureBossModel` ile yüklenir; bu grup yalnız o
       yüklenene kadar (ilk savaşta ~1 sn) görünür, sonra bir daha çizilmez. */
    const bossGroup = new THREE.Group();
    const fallback = new THREE.Group();
    const bossBody = new THREE.Mesh(
      new THREE.CapsuleGeometry(30, 40, 4, 10),
      new THREE.MeshStandardMaterial({ color: 0x2a1420, roughness: 0.6 })
    );
    bossBody.position.y = 55;
    bossBody.castShadow = true;
    const hornMat = new THREE.MeshStandardMaterial({ color: 0xd8d4c4, roughness: 0.4 });
    const hornL = new THREE.Mesh(new THREE.ConeGeometry(6, 30, 6), hornMat);
    const hornR = hornL.clone();
    hornL.position.set(-14, 100, 0); hornL.rotation.z = 0.3;
    hornR.position.set(14, 100, 0); hornR.rotation.z = -0.3;
    const coreMat = new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0xff3b4e, emissiveIntensity: 2.4 });
    const core = new THREE.Mesh(new THREE.SphereGeometry(10, 10, 10), coreMat);
    core.position.y = 60;
    fallback.add(bossBody, hornL, hornR, core);
    bossGroup.add(fallback);
    bossGroup.visible = false;
    this.scene.add(bossGroup);
    this.bossMesh = bossGroup;
    this.bossFallback = fallback;
    this.bossRig = null;      // gerçek model yüklendiğinde dolar
    this.bossMats = null;
    this._bossTopY = 108;     // can barının okuduğu görsel tepe (yer tutucu değeri)
  }

  _buildProjectilePools() {
    const MAX = 220;
    const geo = new THREE.SphereGeometry(1, 8, 8);
    const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0x333333, emissiveIntensity: 1, roughness: 0.3 });
    this.bulletMesh = new THREE.InstancedMesh(geo, mat, MAX);
    this.bulletMesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(MAX * 3), 3);
    this.bulletMesh.count = 0;
    this.bulletMesh.frustumCulled = false;
    this.scene.add(this.bulletMesh);
    this._bulletMax = MAX;

    /* ── METAL GÜLLE MESH'İ (Kaptan Topu) ──────────────────────────────
       Ayrı bir mesh gerekiyor çünkü yukarıdaki ortak materyalin `emissive:
       0x333333` düz katkısı VAR: her mermiye sabit gri bir parlaklık ekler.
       Kor topu/ruh mermisi için doğru (kendi ışığını yayarlar), ama DÖKÜM
       DEMİR bir gülle için yanlış — o düz katkı gölgeleri düzleştirip
       küreyi plastik bir topa çeviriyor. Gülle kendi başına ışımaz;
       görünürlüğünü sahnedeki ışıkların üzerinde bıraktığı KESKİN
       parlamadan alır (metalness 0.95 + düşük pürüz).

       Maliyeti tek bir çizim çağrısıdır ve yalnız metal mermi sahnedeyken
       (count > 0) ödenir; havuz 96 örnekle sınırlı — bordo ateşi (7 gülle)
       + saçılma (her biri 6 parça) en kötü durumda ~45 örnek eder. */
    const mMat = new THREE.MeshStandardMaterial({
      color: 0xffffff, metalness: 0.95, roughness: 0.34,
      emissive: 0x0b0c0e, emissiveIntensity: 1,
    });
    const MMAX = 96;
    this.bulletMetalMesh = new THREE.InstancedMesh(geo, mMat, MMAX);
    this.bulletMetalMesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(MMAX * 3), 3);
    this.bulletMetalMesh.count = 0;
    this.bulletMetalMesh.frustumCulled = false;
    this.scene.add(this.bulletMetalMesh);
    this._bulletMetalMax = MMAX;
  }

  /* Oklar için ayrı InstancedMesh — gerçek ok silueti (gövde+uç+tüy), hıza
     göre yönlenir, alev kademesine göre renklenir/büyür. */
  _buildArrowPool() {
    const MAX = 140;
    const shaft = new THREE.CylinderGeometry(0.55, 0.55, 15, 6);
    shaft.rotateX(Math.PI / 2);          // Y ekseninden Z eksenine (ok +Z bakar)
    shaft.translate(0, 0, -1.5);
    const tip = new THREE.ConeGeometry(2.0, 6, 8);
    tip.rotateX(Math.PI / 2);
    tip.translate(0, 0, 8.5);
    const fletch = new THREE.BoxGeometry(0.4, 3.4, 3.6);
    fletch.translate(0, 0, -8);
    const arrowGeo = mergeGeometries([shaft, tip, fletch], false);
    const mat = new THREE.MeshBasicMaterial({ toneMapped: false });
    this.arrowMesh = new THREE.InstancedMesh(arrowGeo, mat, MAX);
    this.arrowMesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(MAX * 3), 3);
    this.arrowMesh.count = 0;
    this.arrowMesh.frustumCulled = false;
    this.scene.add(this.arrowMesh);
    this._arrowMax = MAX;
  }

  /* BROTATO TARZI SÜZÜLEN YAY: karakter yalnız yürür; Ay Yayı yanında
     süzülür, en yakın düşmana kilitlenir, kendi kendine gerilip atar.
     Statik GLB — gerilme/geri tepme prosedürel (bkz. _updateBow). */
  _buildBow() {
    this.bowReady = false;
    this.bowRig = null;
    this.bowOrbit = Math.random() * Math.PI * 2;
    this.bowRecoil = 0;
    this._lastBowFire = 0;
    this._bowYaw = 0;
    const loader = new GLTFLoader();
    loader.loadAsync('assets/yay/yay.glb').then((gltf) => {
      const bow = gltf.scene;
      bow.traverse((o) => {
        if (o.isMesh) { o.frustumCulled = false; o.castShadow = false; }
      });
      const b0 = new THREE.Box3().setFromObject(bow);
      const sz = new THREE.Vector3(); b0.getSize(sz);
      const sc = 46 / Math.max(0.001, sz.y);       // ~46 birim boy (limbs Y ekseninde)
      bow.scale.setScalar(sc);
      const b1 = new THREE.Box3().setFromObject(bow);
      const c = new THREE.Vector3(); b1.getCenter(c);
      bow.position.sub(c);                           // merkezi orijine

      /* iç grup: ham yay +X yönüne atar → +Z'ye çevir ki oyuncu yaw formülü
         (atan2(dx,dz)) ile hizalanabilsin. */
      const inner = new THREE.Group();
      inner.add(bow);
      inner.rotation.y = Math.PI / 2;

      /* gerilme enerjisi: yay merkezinde parlayan nokta (draw ile büyür) */
      const nockMat = new THREE.MeshBasicMaterial({ color: 0x9fe8ff, transparent: true, opacity: 0.92, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
      const nock = new THREE.Mesh(new THREE.SphereGeometry(3.0, 10, 10), nockMat);
      nock.visible = false;
      inner.add(nock);
      this.bowNock = nock;

      const rig = new THREE.Group();
      rig.add(inner);
      rig.visible = false;
      this.scene.add(rig);
      this.bowRig = rig;
      this.bowInner = inner;
      this.bowReady = true;
    }).catch((err) => console.warn('Yay modeli yüklenemedi.', err));
  }

  _updateBow(game, dt) {
    if (!this.bowReady || !this.bowRig) return;
    const W = game.weapons;
    const show = !!(W && W.lvl && W.lvl('yay') > 0);
    this.bowRig.visible = show;
    if (!show) { if (this.bowNock) this.bowNock.visible = false; return; }
    const p = game.player;

    /* süzülme: karakterin sağ yanında SABİT durur — artık etrafında 360°
       dönmez. Yalnızca hafifçe nefes alır (yukarı-aşağı) ve salınır. */
    this.bowOrbit += dt;
    const bx = p.x + 46 + Math.sin(this.bowOrbit * 0.9) * 4;
    const bz = p.y + 12;
    const by = 40 + Math.sin(this.bowOrbit * 1.6) * 5;
    this.bowRig.position.set(bx, by, bz);

    /* en yakın düşmana nişan (yaydan), yoksa yürüme yönü */
    const n = W.nearest;
    const aim = n ? Math.atan2(n.x - bx, n.y - bz)
                  : Math.atan2(Math.cos(p.facing), Math.sin(p.facing));
    let d = aim - this._bowYaw;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    this._bowYaw += d * Math.min(1, dt * 12);
    this.bowRig.rotation.y = this._bowYaw;

    /* ateş algıla → geri tepme darbesi */
    const fc = W.bowFireCount || 0;
    if (fc !== this._lastBowFire) { this._lastBowFire = fc; this.bowRecoil = 1; }
    if (this.bowRecoil > 0) this.bowRecoil = Math.max(0, this.bowRecoil - dt * 7);

    /* gerilme (draw): sonraki atış yaklaşırken yay çekilir, nock parlar */
    const draw = Math.max(0, Math.min(1, W.bowDraw || 0));
    const kick = this.bowRecoil * this.bowRecoil;
    this.bowInner.position.z = draw * 3 - kick * 7;
    this.bowInner.rotation.z = Math.sin(game.time * 3) * 0.05 - kick * 0.22;
    this.bowInner.scale.x = 1 - draw * 0.12;
    if (this.bowNock) {
      const ns = draw > 0.03 ? 0.35 + draw * 1.15 : 0;
      this.bowNock.visible = ns > 0;
      if (ns > 0) {
        this.bowNock.scale.setScalar(ns);
        const ft = (W.W && W.W.yay) ? (W.W.yay.flame | 0) : 0;
        this.bowNock.material.color.set(ft >= 2 ? 0xff7a3c : ft === 1 ? 0xffb24d : 0x9fe8ff);
      }
    }

    /* okların yaydan çıkması için dünya konumu paylaş (game koordinatı: x, z→y) */
    W.bowPos.x = bx; W.bowPos.y = bz;
    W.bowAim = this._bowYaw;
  }

  /* ═══════════════════════════════════════════════════════════════════
     SÜZÜLEN SAPAN — SAPANCI'nın imza silahı

     Yay ile AYNI sözleşme (statik GLB, karakterin yanında süzülür, en
     yakın düşmana kilitlenir, kendi kendine atar) ama KOREOGRAFİSİ
     kasıtlı olarak farklı. Yay GERİLİR; sapan SAVRULUR:

       hazırlık → bekleme dolarken kese geriye yatar (kurulur)
       bırakış  → öne snap eder, taş kesede kalmaz
       toparlanma → yay-sönümle hazırlık yatışına geri salınır

     Bu ayrım önemli: iki menzilli imza silahı aynı hareketi yaparsa
     oyuncu kahraman değiştirdiğini fark etmez.

     ÜÇ KATMANLI HİYERARŞİ (tek grupla yapılamaz):
       slingRig     → konum + nişan yaw'ı
        └ slingInner → geri tepme ötelemesi, ham +X'i +Z'ye çeviren PI/2
           └ slingSpin → savuruş yayı (local Z)
     Savuruşu inner'a yazsaydık Euler sırası (XYZ) yüzünden yaw ile
     karışır ve kese nişan yönünden saparak eğri bir çember çizerdi.

     PARALAKS: taş gövdeden değil KESENİN ÖNÜNDEN çıkar. W.slingPos bu
     noktaya yazılır ve weapons.js atış AÇISINI da aynı noktadan ölçer —
     aksi halde namlu oyuncu→hedef doğrultusunu gösterirken taş
     sapan→hedef doğrultusunda uçar ve arada açı kalır (bkz. CLAUDE.md
     _updateCannon / _updateFlame dersi). */
  _buildSling() {
    this.slingReady = false;
    this.slingRig = null;
    this.slingBob = Math.random() * Math.PI * 2;
    this.slingRecoil = 0;
    this._lastSlingFire = 0;
    this._slingYaw = 0;
    this._slWhirl = 0;
    this._slStoneHide = 0;
    const loader = new GLTFLoader();
    loader.loadAsync('assets/sapanci/sapan.glb').then((gltf) => {
      const sling = gltf.scene;
      sling.traverse((o) => {
        if (!o.isMesh) return;
        o.frustumCulled = false; o.castShadow = false;
        for (const mt of (Array.isArray(o.material) ? o.material : [o.material])) {
          if (mt) mt.side = THREE.FrontSide;   // Tripo ihracı doubleSided gelir
        }
      });

      /* UZUN EKSEN → +X. Sınır kutusuna göre eksen seçmek BU MODELDE
         çalışmaz: ölçülen kutu 1.00 × 0.89 × 0.97, yani neredeyse küp —
         en uzun kenar rastgele bir eksen verir. PCA şart. flip görsel
         olarak _weapontest ile doğrulanacak; kese ucunun +X'te olması
         beklenir. */
      alignLongAxisToX(THREE, sling, 44, { flip: false });

      const spin = new THREE.Group();
      spin.add(sling);

      /* kesedeki taş: MAT, ışımaz. Kor topu ya da ruh mermisi kendi ışığını
         yayar, taş yaymaz — düz emissive katkısı küreyi plastiğe çevirirdi
         (bkz. CLAUDE.md `metallic` dersi). */
      const stone = new THREE.Mesh(
        new THREE.IcosahedronGeometry(3.4, 0),
        new THREE.MeshStandardMaterial({ color: 0x9a9284, roughness: 0.86, metalness: 0.04 }));
      stone.position.x = 19;
      stone.frustumCulled = false;
      spin.add(stone);
      this.slingStone = stone;

      const inner = new THREE.Group();
      inner.add(spin);
      inner.rotation.y = Math.PI / 2;          // +X → +Z (yaw formülüyle hizalı)

      const rig = new THREE.Group();
      rig.add(inner);
      rig.visible = false;
      this.scene.add(rig);
      this.slingRig = rig;
      this.slingInner = inner;
      this.slingSpin = spin;
      this.slingReady = true;
    }).catch((err) => console.warn('Sapan modeli yüklenemedi.', err));
  }

  _updateSling(game, dt) {
    if (!this.slingReady || !this.slingRig) return;
    const W = game.weapons;
    const modelDef = CHARACTER_MODELS[this._currentCharId];
    const show = !!(modelDef && modelDef.floatingWeapon === 'sapan'
                    && W && W.lvl && W.lvl('sapan') > 0);
    this.slingRig.visible = show;
    if (!show) { this._slingInit = false; return; }
    const p = game.player;

    /* süzülme: sağ yanda sabit, hafif nefes + salınım (yay ile aynı yer —
       nişan/paralaks matematiği ikisinde de aynı olsun) */
    this.slingBob += dt;
    const bx = p.x + 44 + Math.sin(this.slingBob * 0.9) * 4;
    const bz = p.y + 12;
    const by = 40 + Math.sin(this.slingBob * 1.5) * 5;
    this.slingRig.position.set(bx, by, bz);

    /* en yakın düşmana nişan (SAPANIN kendi konumundan), yoksa yürüme yönü */
    const n = W.nearest;
    const aim = n ? Math.atan2(n.x - bx, n.y - bz)
                  : Math.atan2(Math.cos(p.facing), Math.sin(p.facing));
    if (!this._slingInit) { this._slingYaw = aim; this._slingInit = true; }
    let d = aim - this._slingYaw;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    this._slingYaw += d * Math.min(1, dt * 12);
    this.slingRig.rotation.y = this._slingYaw;

    /* ateş algıla → savuruş öne snap eder, taş kısa süre görünmez
       (kesede artık yok) */
    const fc = W.slingFireCount || 0;
    if (fc !== this._lastSlingFire) {
      this._lastSlingFire = fc;
      this.slingRecoil = 1;
      this._slStoneHide = 0.16;
    }
    if (this.slingRecoil > 0) this.slingRecoil = Math.max(0, this.slingRecoil - dt * 5.2);
    if (this._slStoneHide > 0) this._slStoneHide -= dt;

    /* SAVURUŞ — 360° ÇEVİRME KALDIRILDI (2026-08-18)
       Kese eskiden yerinde tam tur atıyordu: durmadan dönen bir nesne
       "motor" okunur, atış anı hiç ayrışmaz (dönüş zaten sürekli) ve
       oyuncu bunu bir hata olarak görür. Şimdi TEK olay var — savuruş:

         hazırlık → bekleme dolarken kese GERİYE yatar (yalnız yatar,
                    tur atmaz), yani yay gibi kurulur
         bırakış  → öne savrulur, taş kesede yok
         toparlanma → sönümlenerek hazırlık yatışına döner

       Yay ile karışmaz: yay GERİLİR ve elde durur, sapan SAVRULUR. */
    const wind = Math.max(0, Math.min(1, W.slingWind || 0));
    const kick = this.slingRecoil * this.slingRecoil;
    this.slingSpin.rotation.z = -0.30 - 0.55 * wind * wind + this.slingRecoil * 2.30;
    this.slingInner.position.z = wind * 2 - kick * 9;
    this.slingInner.rotation.x = -kick * 0.30;
    this.slingSpin.scale.setScalar(1 + wind * 0.06 - kick * 0.10);
    if (this.slingStone) this.slingStone.visible = this._slStoneHide <= 0;

    /* PARALAKS: taşın çıkış noktası kesenin ÖNÜ (gövde değil) */
    const fwx = Math.sin(this._slingYaw), fwz = Math.cos(this._slingYaw);
    if (W.slingPos) { W.slingPos.x = bx + fwx * 26; W.slingPos.y = bz + fwz * 26; }
    W.slingAim = this._slingYaw;
  }

  /** En kısa açı yolu ile a'yı ref'e taşı (sürekli yaw uzayı için). */
  _nearAngle(a, ref) {
    let d = a - ref;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    return ref + d;
  }

  /** Yumuşak kenarlı alev/parıltı dokusu — AÇILIŞTA BİR KEZ.
      Neden gerekli: düz `PlaneGeometry` + toplayıcı karışım, dokusuz
      kullanıldığında düzlemin KARE kenarını görünür yapar (kullanıcının
      "alev kare bir alan içinde" dediği kusur). Tüylenmiş eliptik alfa
      ile kenar tamamen erir. */
  _softBlobTexture() {
    if (this._blobTex) return this._blobTex;
    const cv = document.createElement('canvas');
    cv.width = 128; cv.height = 64;
    const g = cv.getContext('2d');
    g.translate(64, 32);
    g.scale(1, 0.5);                              // yatay uzatılmış elips
    const rg = g.createRadialGradient(0, 0, 0, 0, 0, 62);
    rg.addColorStop(0.00, 'rgba(255,255,255,1)');
    rg.addColorStop(0.30, 'rgba(255,255,255,0.78)');
    rg.addColorStop(0.62, 'rgba(255,255,255,0.30)');
    rg.addColorStop(1.00, 'rgba(255,255,255,0)');
    g.fillStyle = rg;
    g.fillRect(-64, -64, 128, 128);
    /* düzensiz alev dilleri: tek düzgen elips "gaz lambası" gibi duruyor */
    g.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 7; i++) {
      const x = -46 + i * 15, r = 13 + (i % 3) * 7;
      const lg = g.createRadialGradient(x, 0, 0, x, 0, r);
      lg.addColorStop(0, 'rgba(255,255,255,0.5)');
      lg.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = lg;
      g.fillRect(x - r, -r, r * 2, r * 2);
    }
    const t = new THREE.CanvasTexture(cv);
    t.needsUpdate = true;
    this._blobTex = t;
    return t;
  }

  /** YUVARLAK PARILTI — sahte bloom'un yapı taşı. AÇILIŞTA BİR KEZ.
      Post-processing yasak (CLAUDE.md), o yüzden "parlama" üç FARKLI
      boyutta toplayıcı parıltı katmanının toplamıdır: dar+parlak çekirdek,
      orta gövde, geniş ve sönük hale. Düşüş eğrisi kasıtlı olarak dik
      çekirdek + uzun kuyruk — gerçek bloom'un ışık dağılımı budur;
      tek düzgün gradyan "buzlu cam lekesi" gibi duruyor. */
  _glowTexture() {
    if (this._glowTex) return this._glowTex;
    const S = 128;
    const cv = document.createElement('canvas');
    cv.width = cv.height = S;
    const g = cv.getContext('2d');
    const rg = g.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
    rg.addColorStop(0.00, 'rgba(255,255,255,1)');
    rg.addColorStop(0.10, 'rgba(255,255,255,0.90)');
    rg.addColorStop(0.26, 'rgba(255,255,255,0.48)');
    rg.addColorStop(0.48, 'rgba(255,255,255,0.17)');
    rg.addColorStop(0.74, 'rgba(255,255,255,0.045)');
    rg.addColorStop(1.00, 'rgba(255,255,255,0)');
    g.fillStyle = rg;
    g.fillRect(0, 0, S, S);
    const t = new THREE.CanvasTexture(cv);
    t.needsUpdate = true;
    this._glowTex = t;
    return t;
  }

  /** DİKEY YALIM dokusu — kor topunun ve imza alevinin gövdesi.
      AÇILIŞTA BİR KEZ. Tabanı geniş, ucu ince, kenarları tüylenmiş,
      içinde düzensiz diller olan bir alev dili: küre değil YALIM okunur.
      Renk beyaz tutulur, ton instanceColor'dan gelir (mavi kor / kızıl kor
      aynı dokuyu paylaşır — ikinci doku = ikinci yükleme). */
  _flameSpriteTexture() {
    if (this._flameTex) return this._flameTex;
    const W = 128, H = 192;
    const cv = document.createElement('canvas');
    cv.width = W; cv.height = H;
    const g = cv.getContext('2d');
    g.globalCompositeOperation = 'lighter';
    let r = 20260804;
    const rnd = () => { r = (r * 1103515245 + 12345) & 0x7fffffff; return (r % 1000) / 1000; };
    /* gövde: tabandan uca daralan, hafif kıvrımlı yalım */
    const N = 30;
    for (let i = 0; i < N; i++) {
      const u = i / (N - 1);
      const y = H - 14 - u * (H - 34);
      const rad = (34 - u * 27) * (1 + Math.sin(u * 8.3) * 0.07);
      const x = W / 2 + Math.sin(u * 3.4) * 9 * u * u;
      const a = 0.26 * (1 - u * 0.42);
      const lg = g.createRadialGradient(x, y, 0, x, y, rad);
      lg.addColorStop(0.00, 'rgba(255,255,255,' + a + ')');
      lg.addColorStop(0.50, 'rgba(255,255,255,' + (a * 0.44) + ')');
      lg.addColorStop(1.00, 'rgba(255,255,255,0)');
      g.fillStyle = lg;
      g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
    }
    /* iç çekirdek: gövdenin alt yarısında çok daha parlak ince bir sütun —
       yalımın "sıcak" merkezi. Tek katman alev düz bir leke gibi duruyor. */
    for (let i = 0; i < 16; i++) {
      const u = i / 15;
      const y = H - 22 - u * (H * 0.56);
      const rad = 15 - u * 11;
      const x = W / 2 + Math.sin(u * 4.1) * 4;
      const lg = g.createRadialGradient(x, y, 0, x, y, rad);
      lg.addColorStop(0.00, 'rgba(255,255,255,0.42)');
      lg.addColorStop(1.00, 'rgba(255,255,255,0)');
      g.fillStyle = lg;
      g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
    }
    /* yan diller: alevin siluetini düzensizleştirir (simetri = maket) */
    for (let i = 0; i < 7; i++) {
      const u = 0.15 + rnd() * 0.7;
      const y = H - 20 - u * (H - 40);
      const side = rnd() > 0.5 ? 1 : -1;
      const rad = 8 + rnd() * 9;
      const x = W / 2 + side * (10 + rnd() * 16) * (1 - u * 0.6);
      const lg = g.createRadialGradient(x, y, 0, x, y, rad);
      lg.addColorStop(0.00, 'rgba(255,255,255,0.20)');
      lg.addColorStop(1.00, 'rgba(255,255,255,0)');
      g.fillStyle = lg;
      g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
    }
    const t = new THREE.CanvasTexture(cv);
    t.needsUpdate = true;
    this._flameTex = t;
    return t;
  }

  /** Şok halkası dokusu: parlak çeper, içi ve dışı tüylenmiş. */
  _shockTexture() {
    if (this._shockTex) return this._shockTex;
    const S = 128;
    const cv = document.createElement('canvas');
    cv.width = cv.height = S;
    const g = cv.getContext('2d');
    const rg = g.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
    rg.addColorStop(0.00, 'rgba(255,255,255,0)');
    rg.addColorStop(0.58, 'rgba(255,255,255,0.05)');
    rg.addColorStop(0.80, 'rgba(255,255,255,0.85)');
    rg.addColorStop(0.90, 'rgba(255,255,255,1)');
    rg.addColorStop(1.00, 'rgba(255,255,255,0)');
    g.fillStyle = rg;
    g.fillRect(0, 0, S, S);
    const t = new THREE.CanvasTexture(cv);
    t.needsUpdate = true;
    this._shockTex = t;
    return t;
  }

  /** İnce hilal iz dokusu: iç ve dış kenarı tüylenmiş dar bir çeper.
      Eski iz DOKUSUZ geniş bir halkaydı — kenarları jilet gibi kesiliyor,
      alanı doldurduğu için de "beyaz yelpaze" gibi duruyordu. Alfa burada
      dar bir bantta yaşar: kenarlar erir, iz bıçağın ucunda kalır. */
  _slashTexture() {
    if (this._slashTex) return this._slashTex;
    const S = 128;
    const cv = document.createElement('canvas');
    cv.width = cv.height = S;
    const g = cv.getContext('2d');
    const rg = g.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
    /* halka yarıçapı 0.76–1.00 arası; tepe 0.90'da, iki yana tüylenir */
    rg.addColorStop(0.00, 'rgba(255,255,255,0)');
    rg.addColorStop(0.74, 'rgba(255,255,255,0)');
    rg.addColorStop(0.83, 'rgba(255,255,255,0.42)');
    rg.addColorStop(0.91, 'rgba(255,255,255,1)');
    rg.addColorStop(0.97, 'rgba(255,255,255,0.30)');
    rg.addColorStop(1.00, 'rgba(255,255,255,0)');
    g.fillStyle = rg;
    g.fillRect(0, 0, S, S);
    const t = new THREE.CanvasTexture(cv);
    t.needsUpdate = true;
    this._slashTex = t;
    return t;
  }

  /* ═══════════ SEHER'İN SÜZÜLEN İMZA KILICI (premium) ═══════════
     Kılıç Seher'in elinde DEĞİL: yanında havada yaşar.

       1. SÜZÜLME (boşta)  YAY-SÖNÜM (spring-damper) ile bir çapa noktasını
          takip eder. Düz ofsetle (p.x + 54) bağlamak kılıcı karaktere
          İKIZ yapıyordu: anında ışınlanıyor, sin() salınımı gövdenin
          içine sokuyor, hızlı koşuda geride kalmıyordu. Yay ile kılıç
          bir KÜTLE gibi davranır: gecikir, sallanır, yetişir. Ayrıca
          gövdeye asgari mesafe zorlanır — karakterin içine girmez.
       2. SAVURUŞ (vuruşta) weapons.swingKind dört koreografi seçer:
          normal · spin (girdap 360°) · twin (ikiz) · echo (hayalet iz)
       3. KİŞİSEL EFEKT  kartlarla açılan kızıl alev; savurma izi
          kÖŞE RENKLİ şerittir (kuyrukta saydam → başta parlak), düz beyaz
          dolgu değil. Post-processing/bloom YOK (CLAUDE.md).

     Hareketin tamamı prosedüreldir; GLB durağandır. */
  _buildSword(spec) {
    this._swordSpec = spec;
    this.swordReady = false;
    this.swordPivot = null;
    this.swordOrbit = Math.random() * Math.PI * 2;
    this._lastSwordSwingId = 0;
    this._swordSwingT = 1;
    this._swordYaw = 0;
    this._swSwept = 0;
    this._swordReach = 6;
    this._swordRoll = 0;
    this._swordKind = 'normal';
    this._swordDur = 0.34;
    this._echoT = 1;
    this._echoYaw = 0;
    this._echoSwept = 0;
    /* yay-sönüm durumu (kareler arası kalıcı — TMP KULLANILMAZ) */
    this._swX = 0; this._swY = 58; this._swZ = 0;
    this._swVX = 0; this._swVY = 0; this._swVZ = 0;
    this._swInit = false;
    this._shockT = 1;
    const loader = new GLTFLoader();
    loader.setDRACOLoader(this._getDraco());
    loader.loadAsync(spec.glb).then((gltf) => {
      const sword = gltf.scene;
      /* Kılıç ekranda kahramanın yarısı kadar yer kaplar ve SÜREKLİ görünür:
         512² doku bıçak üzerindeki oyma/rün detayını lapa yapıyordu. */
      budgetTextures(sword, Math.min(1024, Quality.budget('texHero')));
      sword.traverse((o) => {
        if (o.isMesh) {
          o.frustumCulled = false; o.castShadow = false;
          if (o.material) {
            /* doubleSided KAPALI (CLAUDE.md): kapalı gövdede görsel fark yok,
               mobil GPU'da her üçgeni iki kez rasterize etmekten kurtarır. */
            o.material.side = THREE.FrontSide;
            /* metalness 0.45 + emissive 0x39445c, bıçağın üstüne gri bir perde
               çekip renkleri SOLDURUYORDU. Metal yansıması düşük, öz-ışık çok
               kısık: doku kendi rengiyle görünür. */
            o.material.metalness = 0.22;
            o.material.roughness = 0.44;
            if (o.material.emissive) {
              o.material.emissive.setHex(0x120e0a);
              o.material.emissiveIntensity = 1;
            }
          }
        }
      });
      /* UZUN EKSEN → +X, İŞ UCU +X'e (PCA — bkz. propAlign.js).
         Eski yöntem sınır kutusunun en uzun KENARINI seçiyordu; Kraliçenin
         taç kılıcı model uzayında ÇAPRAZ geldiği için (eksen 0.02, 0.55,
         −0.83) o yöntemle bıçak yana yatık kalıyordu. PCA gerçek birincil
         ekseni bulur; `flip` işaret düzeltmesidir (her iki model için
         görsel olarak ölçüldü). */
      alignLongAxisToX(THREE, sword, spec.len || 74, { flip: !!spec.flip });
      /* pivot KABZADA (−X ucu): kılıç koldan uzanır, uçtan savrulur. */
      const b2 = new THREE.Box3().setFromObject(sword);
      sword.position.x -= b2.min.x;
      const bladeLen = b2.max.x - b2.min.x;
      this._swordBladeLen = bladeLen;

      /* fıçı dönüşü (kendi uzun ekseni) için ayrı grup */
      const spinner = new THREE.Group();
      spinner.add(sword);

      /* AURA KALDIRILDI: bıçağı saran parıltı düzlemi kılıcın dokusunu ve
         siluetini yutuyordu ("bloom" hissi). */
      this.swordAura = null;

      /* KIZIL ALEV — kartlarla açılır. İki çapraz düzlem, TÜYLENMİŞ ALFA
         DOKUSU ile: kare kenar yok, alev bıçaktan dışa doğru erir. */
      const blob = this._softBlobTexture();
      const flameGroup = new THREE.Group();
      for (let i = 0; i < 2; i++) {
        const fm = new THREE.MeshBasicMaterial({
          map: blob, color: spec.flameHex[0], transparent: true, opacity: 0,
          side: THREE.DoubleSide, blending: THREE.AdditiveBlending,
          depthWrite: false, toneMapped: false,
        });
        const f = new THREE.Mesh(new THREE.PlaneGeometry(bladeLen * 1.22, bladeLen * 0.5), fm);
        f.position.set(bladeLen * 0.5, 0, 0);
        f.rotation.x = i * Math.PI / 2;         // çapraz çift: her açıdan görünür
        flameGroup.add(f);
      }
      spinner.add(flameGroup);
      this.swordFlame = flameGroup;
      /* sıcak çekirdek: bıçağın üzerine oturan daha parlak, daha ince şerit */
      const core = new THREE.Mesh(
        new THREE.PlaneGeometry(bladeLen * 1.0, bladeLen * 0.2),
        new THREE.MeshBasicMaterial({
          map: blob, color: spec.coreHex, transparent: true, opacity: 0,
          side: THREE.DoubleSide, blending: THREE.AdditiveBlending,
          depthWrite: false, toneMapped: false,
        }));
      core.position.set(bladeLen * 0.5, 0, 0);
      spinner.add(core);
      this.swordFlameCore = core;

      const inner = new THREE.Group();
      inner.add(spinner);
      inner.position.set(this._swordReach, 0, 0);

      const pivot = new THREE.Group();
      pivot.add(inner);

      /* ── SAVURMA İZİ: İNCE KIZIL HİLAL ──
         Eski hâli kabzadan uca kadar uzanan GENİŞ, dokusuz, ak bir
         halkaydı: ekranın yarısını dolduruyor ve "beyaz yelpaze" gibi
         duruyordu. Yeni iz üç kuralla çalışır:
           1. DAR  — yalnız bıçağın uç bandı (yarıçapın %78–100'ü),
           2. TÜYLÜ — alfa dokusu iki kenarı de eritir (jilet kenar yok),
           3. KISA — kuyruk ~65°'de tamamen söner; beyaz değil, uçta
              solgun altın, içte kızıl.
         Geometri AÇILIŞTA BİR KEZ kurulur; her karede yalnız drawRange ve
         ölçek değişir — sıcak döngüde tahsis YOK. */
      const TRAIL_SEGS = 48;
      this._trailSegs = TRAIL_SEGS;
      this._trailBaseR = this._swordReach + bladeLen * 0.98;
      const trailGeo = new THREE.RingGeometry(
        this._trailBaseR * 0.74,
        this._trailBaseR,
        TRAIL_SEGS, 1, 0, Math.PI * 2);
      const nTV = trailGeo.attributes.position.count;
      const tCol = new Float32Array(nTV * 3);
      /* SABİT GRADYAN — her karede yazmaya gerek yok.
         İz pivotun yerel 0° açısında BAŞLAR, theta büyüdükçe bıçağın
         geçtiği yöne uzanır: i=0 en parlak, ~9. dilimde (≈65°) siyah.
         Toplayıcı karışımda siyah = görünmez, yani kuyruk kendiliğinden
         erir ve iz kısa bir hilal olarak okunur. Yarıçap boyunca DIŞ kenar
         solgun altın (bıçak ucu), İÇ kenar kızıl — Kızıl Hasat paleti. */
      const RS = TRAIL_SEGS + 1;
      const FADE = spec.trailFade || 9;      // kaç dilimde sönsün (≈9→65°)
      const tIn = spec.trailInner, tOut = spec.trailOuter;
      for (let i = 0; i <= TRAIL_SEGS; i++) {
        const f = Math.pow(Math.max(0, 1 - i / FADE), 2.1);
        const inn = i * 3, out = (RS + i) * 3;
        tCol[inn] = tIn[0] * f;  tCol[inn + 1] = tIn[1] * f;  tCol[inn + 2] = tIn[2] * f;
        tCol[out] = tOut[0] * f; tCol[out + 1] = tOut[1] * f; tCol[out + 2] = tOut[2] * f;
      }
      trailGeo.setAttribute('color', new THREE.BufferAttribute(tCol, 3));
      this._trailRing = RS;
      const trail = new THREE.Mesh(trailGeo, new THREE.MeshBasicMaterial({
        map: this._slashTexture(),
        vertexColors: true, transparent: true, opacity: 1, side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false,
      }));
      trail.rotation.x = -Math.PI / 2;
      trail.frustumCulled = false;
      trail.visible = false;
      pivot.add(trail);
      this.swordTrail = trail;

      pivot.visible = false;
      this.scene.add(pivot);
      this.swordPivot = pivot;
      this.swordInner = inner;
      this.swordSpinner = spinner;

      /* HAYALET İZ (Ruh Yankısı): kılıç yerinde kalır, menekşe bir savuruş
         izi oyuncunun çevresinde tek başına süpürür. */
      const echoMat = new THREE.MeshBasicMaterial({
        color: spec.echoHex, transparent: true, opacity: 0, side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false,
      });
      this._echoBaseR = 110;
      const echoGeo = new THREE.RingGeometry(26, this._echoBaseR, TRAIL_SEGS, 1, 0, Math.PI * 2);
      const echo = new THREE.Mesh(echoGeo, echoMat);
      echo.rotation.x = -Math.PI / 2;
      echo.frustumCulled = false;
      const echoGrp = new THREE.Group();
      echoGrp.add(echo);
      echoGrp.visible = false;
      this.scene.add(echoGrp);
      this.swordEcho = echo;
      this.swordEchoGroup = echoGrp;

      /* ── GİRDAP ŞOK DALGASI ──
         Eski hâli havuzdan düz bir halka alıyordu (diğer patlamalarla aynı
         görsel) — "amatörce" duran buydu. Şimdi kendine ait İKİ katman:
         geniş soğuk çeper + içte hızlı sıcak çeper, ikisi de tüylenmiş
         doku ile ve farklı hızda açılır — tek halkadan çok daha derin. */
      const shockTex = this._shockTexture();
      this.shockRings = [];
      for (let i = 0; i < 2; i++) {
        const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({
          map: shockTex, color: i === 0 ? spec.shockHex[0] : spec.shockHex[1],
          transparent: true, opacity: 0, blending: THREE.AdditiveBlending,
          depthWrite: false, toneMapped: false, side: THREE.DoubleSide,
        }));
        m.rotation.x = -Math.PI / 2;
        m.frustumCulled = false;
        m.visible = false;
        this.scene.add(m);
        this.shockRings.push(m);
      }

      this.swordReady = true;
    }).catch((err) => console.warn('Kılıç modeli yüklenemedi.', err));

    /* AY KESİĞİ dalgaları: sabit yuvalı hilal havuzu (weapons.waves).
       Her yuva bir GRUP (konum + yaw) + içinde yatay yatırılmış hilal mesh:
       tek nesnede rotation.x + rotation.y karıştırmak Euler sırası yüzünden
       hilalin yana yatmasına yol açıyor. */
    this.waveGroups = [];
    this.waveMeshes = [];
    const waveMat = new THREE.MeshBasicMaterial({
      map: this._slashTexture(), color: spec.waveHex, vertexColors: true,
      transparent: true, opacity: 0, side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false,
    });
    /* KESİK GEOMETRİSİ — TÜM YUVALAR PAYLAŞIR (16 ayrı ring geometrisi
       gereksiz bellekti). Üç kural:
         1. dokusuz ring kenarı jİlet gibi kesiyordu → tüylenmiş alfa dokusu
            (_slashTexture) alfayı dar bir banda hapseder,
         2. radyal köşe rengi dış kenarı parlak, iç kenarı sönük yapar —
            tek mesh ile derinlik,
         3. theta boyunca konikleşme (sin ramp) hilalin İKİ UCUNU eritir;
            eski hâli iki uçtan düz kesikti ve "blok bir C harfi" gibi
            duruyordu — Gece Kraliçesi'nin kimliği bu kesik olduğu için
            kabul edilemez. */
    const WTS = 22;
    const waveGeo = new THREE.RingGeometry(28, 46, WTS, 1, -0.72, 1.44);
    {
      const cnt = waveGeo.attributes.position.count;
      const col = new Float32Array(cnt * 3);
      const ring = WTS + 1;
      for (let j = 0; j <= 1; j++) {
        const lum = j === 0 ? 0.42 : 1.0;      // iç kenar sönük, dış kenar parlak
        for (let i = 0; i <= WTS; i++) {
          const taper = Math.pow(Math.sin((i / WTS) * Math.PI), 0.55);
          const o = (j * ring + i) * 3;
          const v = lum * taper;
          col[o] = v; col[o + 1] = v; col[o + 2] = v;
        }
      }
      waveGeo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    }
    this._waveGeo = waveGeo;
    /* 6 → 16 yuva: Gece Kraliçesi HER savuruşta kesik fırlatır ve Üçlü Kesik
       kartı beşe kadar çıkarır; 6 yuvada kesikler görünmeden yutuluyordu
       (weapons.waves da 16 yuvaya çıktı). */
    for (let i = 0; i < 16; i++) {
      const m = new THREE.Mesh(waveGeo, waveMat.clone());
      m.rotation.x = -Math.PI / 2;
      m.frustumCulled = false;
      const grp = new THREE.Group();
      grp.add(m);
      grp.visible = false;
      this.scene.add(grp);
      this.waveGroups.push(grp);
      this.waveMeshes.push(m);
    }
  }

  _updateSword(game, dt) {
    if (!this.swordReady || !this.swordPivot) return;
    const W = game.weapons;
    const spec = this._swordSpec;
    const wid = spec ? spec.weapon : 'kilic';
    const modelDef = CHARACTER_MODELS[this._currentCharId];
    const show = !!(modelDef && modelDef.floatingWeapon === wid && W && W.lvl && W.lvl(wid) > 0);
    this.swordPivot.visible = show;
    if (!show) {
      if (this.swordTrail) this.swordTrail.visible = false;
      if (this.swordEchoGroup) this.swordEchoGroup.visible = false;
      if (this.swordFlame) this.swordFlame.visible = false;
      if (this.swordFlameCore) this.swordFlameCore.visible = false;
      if (this.shockRings) for (let i = 0; i < this.shockRings.length; i++) this.shockRings[i].visible = false;
      for (let i = 0; i < this.waveGroups.length; i++) this.waveGroups[i].visible = false;
      this._swInit = false;                    // yeniden görünürken çapaya snıçra
      return;
    }
    const p = game.player;
    this.swordOrbit += dt;
    const o = this.swordOrbit;

    /* ── SÜZÜLME: YAY-SÖNÜM (spring-damper) TAKİP ──
       Düz ofsetle (p.x + 54 + sin…) bağlamak kılıcı karakterin İKİZİ
       yapıyordu: anında ışınlanıyor, sin() salınımı gövdenin içine
       sokuyor, hızlı koşuda hiç geride kalmıyordu — yani hiç AĞIRLIĞI
       yoktu. Yay ile kılıç bir KÜTLE gibi davranır: gecikir, savrulur,
       yetişir, hafifçe aşar. Ayrıca gövdeye asgari mesafe zorlanır. */
    const ax = p.x + 50;
    const az = p.y + 22;
    const ay = 58 + Math.sin(o * 1.15) * 7;
    if (!this._swInit) {                       // ilk kare: ışınlanmayı önle
      this._swInit = true;
      this._swX = ax; this._swZ = az; this._swY = ay;
      this._swVX = 0; this._swVZ = 0; this._swVY = 0;
    }
    /* dt kelepçesi: sekme/yükleme sonrası büyük dt yayı patlatır */
    const sdt = dt > 0.05 ? 0.05 : dt;
    const K = 46, D = 9.5;                     // sertlik / sönüm
    this._swVX += ((ax - this._swX) * K - this._swVX * D) * sdt;
    this._swVZ += ((az - this._swZ) * K - this._swVZ * D) * sdt;
    this._swVY += ((ay - this._swY) * K - this._swVY * D) * sdt;
    this._swX += this._swVX * sdt;
    this._swZ += this._swVZ * sdt;
    this._swY += this._swVY * sdt;
    /* ASGARİ MESAFE: kılıç karakterin içine girmez */
    let ddx = this._swX - p.x, ddz = this._swZ - p.y;
    const dd = Math.sqrt(ddx * ddx + ddz * ddz);
    if (dd < 34) {
      const k = dd > 0.001 ? 34 / dd : 1;
      if (dd > 0.001) { this._swX = p.x + ddx * k; this._swZ = p.y + ddz * k; }
      else { this._swX = p.x + 34; }
    }
    const fx = this._swX, fz = this._swZ, fy = this._swY;
    /* hıza bağlı eğim: hızlanırken uç geride kalır — ağırlık okuması */
    const lag = Math.max(-0.34, Math.min(0.34,
      (this._swVX * Math.cos(-this._swordYaw) + this._swVZ * Math.sin(-this._swordYaw)) * -0.0016));

    /* NİŞAN ALMA: açı OYUNCU merkezinden ölçülür, kılıcın süzüldüğü
       noktadan değil. Kaynak kılıç olunca, kılıç oyuncunun sağında
       dururken solundaki düşman için açı tersine dönüyor ve bıçak
       düşmana ARKASINI dönüyordu. */
    const n = W.nearest;
    const aimDir = n ? Math.atan2(n.y - p.y, n.x - p.x) : p.facing;
    const restYaw = -aimDir;
    let orbitK = 0;              // 0 = yanda süzülür · 1 = karakterin çevresinde

    /* ── yeni savuruş? kademe kartına göre koreografi seç ── */
    const swingId = W.swingId || 0;
    if (swingId !== this._lastSwordSwingId) {
      this._lastSwordSwingId = swingId;
      const kind = W.swingKind || 'normal';
      const dir = (typeof W.swingDir === 'number') ? W.swingDir : aimDir;
      if (kind === 'echo') {
        /* kılıç yerinde kalır — hayalet iz savurur */
        this._echoT = 0;
        this._echoYaw = -dir + 1.1;
        this._echoSwept = 0;
        this._echoDir = dir;
      } else {
        this._swordKind = kind;
        this._swordSwingT = 0;
        this._swSwept = 0;
        this._swordDur = kind === 'spin' ? 0.46 : (kind === 'twin' ? 0.28 : 0.34);
        if (kind === 'spin') this._shockT = 0;      // girdap şok dalgasını ateşle
        const tgtYaw = -dir;
        this._swStartYaw = this._swordYaw;
        if (kind === 'spin') {
          /* GİRDAP: tam tur (yön hedefe göre, iki fıçı dönüşü ile) */
          this._swWindup = this._nearAngle(tgtYaw + 0.5, this._swordYaw);
          this._swTo = this._swWindup - Math.PI * 2;
        } else {
          const half = kind === 'twin' ? 1.0 : 1.15;
          this._swWindup = this._nearAngle(tgtYaw + half + 0.30, this._swordYaw);
          this._swTo = this._swWindup - (2 * half + 0.30);
        }
        this._swRollFrom = this._swordRoll;
        /* Savuruş fıçı dönüşü TAM turların katı kadar döner ve bittiğinde
           roll tekrar 0'a normalize edilir — böylece bıçak her zaman DÜZ
           (sırtı yukarı) konumda durur. */
        this._swRollTo = this._swRollFrom + (kind === 'spin' ? Math.PI * 4 : Math.PI * 2);
      }
    }

    const sm = (x) => x * x * (3 - 2 * x);
    let pitch = 0.12, roll = 0;
    const spinning = this._swordKind === 'spin';

    if (this._swordSwingT < 1) {
      this._swordSwingT = Math.min(1, this._swordSwingT + dt / this._swordDur);
      const t = this._swordSwingT;
      const W1 = 0.24, W2 = 0.58;              // hazırlık / savurma / toparlanma
      if (t < W1) {
        const u = sm(t / W1);
        this._swordYaw = this._swStartYaw + (this._swWindup - this._swStartYaw) * u;
        pitch = 0.12 + 0.30 * u;
        orbitK = u;
        this._swordRoll = this._swRollFrom + (this._swRollTo - this._swRollFrom) * u * 0.15;
      } else if (t < W2) {
        const u = sm((t - W1) / (W2 - W1));
        this._swordYaw = this._swWindup + (this._swTo - this._swWindup) * u;
        pitch = 0.42 - 0.56 * u;
        roll = -0.20;
        orbitK = 1;
        this._swordRoll = this._swRollFrom + (this._swRollTo - this._swRollFrom) * (0.15 + 0.8 * u);
      } else {
        const u = sm((t - W2) / (1 - W2));
        const back = this._nearAngle(restYaw, this._swTo);
        this._swordYaw = this._swTo + (back - this._swTo) * u;
        pitch = -0.14 + 0.26 * u;
        roll = -0.20 * (1 - u);
        orbitK = 1 - u;
        this._swordRoll = this._swRollFrom + (this._swRollTo - this._swRollFrom) * (0.95 + 0.05 * u);
      }

      /* bıçağa bağlı iz: süpürülen açı kadar hilal, ortada en parlak */
      const tr = this.swordTrail;
      if (tr) {
        if (t < W2) this._swSwept = Math.abs(this._swWindup - this._swordYaw);
        const a = Math.min(Math.PI * 2, this._swSwept || 0);
        const sN = (t - 0.20) / 0.55;
        if (a > 0.05 && sN > 0 && sN < 1) {
          /* tahsis yok: yalnız çizilecek dilim sayısı ve ÖLÇEK değişir */
          const segs = Math.max(1, Math.min(this._trailSegs, Math.ceil(a / (Math.PI * 2 / this._trailSegs))));
          tr.geometry.setDrawRange(0, segs * 6);
          /* menzil kartı alındıkça iz de bÜYÜR: vuruş alanı görünür olur */
          const rk = Math.max(0.7, (W.swingRange || this._trailBaseR) / this._trailBaseR);
          tr.scale.set(rk, rk, 1);
          tr.material.opacity = Math.sin(sN * Math.PI) * (spinning ? 0.62 : 0.5);
          tr.visible = true;
        } else tr.visible = false;
      }
    } else {
      /* ── HAZIRDA: bıçak DÜZ durur ve hedefi ANLIK takip eder ──
         Önceki sürümde yaw'a sin() salınımı ekleniyor, roll ayrıca
         salınıyordu; ikisi birleşince bıçak hedefin yanına bakan ve
         yana yatık bir hâlde duruyordu. Şimdi:
           • yaw'a salınım EKLENMEZ — doğrudan hedefe kilitlenir,
           • açı hatası büyükse (düşman değişti) SIÇRAR, küçükse yumuşar,
           • roll tam 0'a oturur — sırtı daima yukarı,
           • süzülme hissi yalnız KONUM ve hafif pitch ile verilir. */
      const tgt = this._nearAngle(restYaw, this._swordYaw);
      const err = tgt - this._swordYaw;
      if (Math.abs(err) > 1.0) this._swordYaw = tgt;      // hedef değişti: anında dön
      else this._swordYaw += err * Math.min(1, dt * 16);
      pitch = 0.10 + Math.sin(o * 1.4) * 0.07 + lag;
      roll = 0;
      this._swordRoll += (0 - (this._swordRoll % (Math.PI * 2))) * Math.min(1, dt * 9);
      if (Math.abs(this._swordRoll) < 0.004) this._swordRoll = 0;
      if (this.swordTrail) this.swordTrail.visible = false;
    }

    /* savururken pivot karakter merkezine kayar → bıçak karakterin
       çevresinde yay çizer; bitince yana süzülür. */
    const px = fx + (p.x - fx) * orbitK;
    const pz = fz + (p.y - fz) * orbitK;
    const py = fy - orbitK * 5;
    this.swordPivot.position.set(px, py, pz);
    this.swordPivot.rotation.y = this._swordYaw;
    this.swordInner.rotation.z = pitch;
    this.swordInner.rotation.x = roll;
    if (this.swordSpinner) this.swordSpinner.rotation.x = this._swordRoll;

    /* aura + rün halkası: savuruşta parlar, boşta nefes alır */
    const heat = this._swordSwingT < 1 ? Math.sin(this._swordSwingT * Math.PI) : 0;
    if (this.swordAura) {
      this.swordAura.material.opacity = 0.14 + 0.10 * Math.sin(o * 2.2) + heat * 0.45;
      this.swordAura.rotation.x = o * 0.7;
    }

    /* ── BİÇAK HALESİ: alınan imza kartı sayısıyla güçlenir ──
       Seher'de kızıl alev, Gece Kraliçesi'nde mavi hüküm ışığı (SWORD_SPECS).
       Kraliçede `wave` TABANDA 1 olduğu için hale ilk kareden itibaren yanar —
       kılıcının kimliği budur. */
    const wk = W.W && W.W[wid];
    if (this.swordFlame && wk) {
      const tier = (wk.spin | 0) + (wk.twin | 0) + (wk.wave | 0) + (wk.echo | 0) + (wk.fan | 0);
      if (tier > 0) {
        /* iki bandın titreşimi FARKLI frekansta: tek frekans "yanıp sönen
           lamba" gibi duruyor, iki frekans alev gibi. */
        const flick = 0.62 + 0.24 * Math.sin(o * 11.3) + 0.14 * Math.sin(o * 27.7);
        const base = Math.min(0.85, 0.22 + tier * 0.14) * flick + heat * 0.5;
        const ch = this.swordFlame.children;
        for (let i = 0; i < ch.length; i++) {
          ch[i].material.opacity = base * (i === 0 ? 1 : 0.72);
          ch[i].scale.set(1, 0.85 + 0.3 * Math.sin(o * (8 + i * 5) + i), 1);
        }
        this.swordFlame.visible = true;
        this.swordFlame.rotation.x = Math.sin(o * 2.6) * 0.22;
        if (this.swordFlameCore) {
          this.swordFlameCore.visible = true;
          this.swordFlameCore.material.opacity = Math.min(0.95, base * 1.25);
        }
        /* hale rengi kademeye göre ısınır/parlar (palet silaha ait) */
        const fh = spec ? spec.flameHex : [0xff4a1e, 0xff6524, 0xff8a3c];
        const hex = tier >= 4 ? fh[2] : (tier >= 2 ? fh[1] : fh[0]);
        for (let i = 0; i < ch.length; i++) ch[i].material.color.setHex(hex);
      } else {
        this.swordFlame.visible = false;
        if (this.swordFlameCore) this.swordFlameCore.visible = false;
      }
    }

    /* ── RUH YANKISI: hayalet iz (kılıçtan bağımsız) ── */
    const ec = this.swordEcho, eg = this.swordEchoGroup;
    if (ec && eg) {
      if (this._echoT < 1) {
        this._echoT = Math.min(1, this._echoT + dt / 0.36);
        const t = this._echoT;
        const a = Math.max(0.06, 2.3 * sm(Math.min(1, t / 0.7)));
        const segs = Math.max(1, Math.min(this._trailSegs, Math.ceil(a / (Math.PI * 2 / this._trailSegs))));
        ec.geometry.setDrawRange(0, segs * 6);
        ec.rotation.z = -a / 2;                       // yayı savuruş yönüne ortala
        const k = ((W.swingRange || 110) * 0.98) / this._echoBaseR;
        ec.scale.set(k, k, 1);
        eg.position.set(p.x, 46, p.y);
        eg.rotation.y = -(this._echoDir || 0);
        ec.material.opacity = Math.sin(t * Math.PI) * 0.55;
        eg.visible = true;
      } else eg.visible = false;
    }

    /* ── GİRDAP ŞOK DALGASI ──
       İki katman FARKLI hızda açılır: dışta geniş/yavaş soğuk çeper, içte
       hızlı/sıcak çeper. Tek halka (eski hâli, jenerik patlama havuzundan
       alınıyordu) yassı ve amatör duruyordu; iki farklı hız derinlik verir. */
    if (this.shockRings) {
      if (this._shockT < 1) {
        this._shockT = Math.min(1, this._shockT + dt / 0.5);
        const t = this._shockT;
        const R = (W.swingRange || 150) * 1.3;
        for (let i = 0; i < this.shockRings.length; i++) {
          const m = this.shockRings[i];
          /* dış katman geç başlar ve daha geniş açılır */
          const sp = i === 0 ? 1 : 1.55;
          const e = Math.min(1, t * sp);
          const r = R * (0.22 + 1.05 * (1 - (1 - e) * (1 - e)));   // ease-out
          m.position.set(p.x, 22 + i * 3, p.y);
          m.scale.set(r, r, 1);
          m.material.opacity = Math.sin(Math.min(1, e) * Math.PI) * (i === 0 ? 0.8 : 0.5);
          m.visible = e < 1;
        }
      } else if (this.shockRings[0].visible) {
        for (let i = 0; i < this.shockRings.length; i++) this.shockRings[i].visible = false;
      }
    }

    /* ── AY KESİĞİ: hilal dalgalar ── */
    const waves = W.waves;
    if (waves) {
      for (let i = 0; i < this.waveGroups.length; i++) {
        const grp = this.waveGroups[i], m = this.waveMeshes[i];
        const w = waves[i];
        if (!w || w.life <= 0) { grp.visible = false; continue; }
        const k = w.life / w.max;                  // 1 → 0
        grp.position.set(w.x, 30, w.y);
        grp.rotation.y = -w.dir;
        /* ÖLÇEK HASAR YARIÇAPINI İZLER: mesh'in dış yarıçapı 46, dalganın
           vuruş yarıçapı w.r. Eski 34 tabanlı form görseli hasar alanının
           ~2 katına kadar büyütüyordu; oyuncu vurduğunu sandığı yerde
           vurmuyordu. Yaşlanırken hafif genişleme (×1.30) kalır. */
        const grow = (w.r / 44) * (1 + (1 - k) * 0.30);
        m.scale.set(grow, grow, 1);
        /* opaklık 0.75 → 0.92: kesik Gece Kraliçesi'nin TEK vuruş göstergesi
           (Seher'de yardımcı bir efektti) — sahnede net okunmalı. */
        m.material.opacity = 0.92 * Math.min(1, k * 1.7);
        grp.visible = true;
      }
    }
  }

  /* ═══════════ ŞİMŞEK'İN SÜZÜLEN İMZA SİLAHI (Şimşek Kırığı) ═══════════
     Seher'in kılıcıyla AYNI süzülme dili (yay-sönüm takip) ama daha basit:
     savuruş koreografisi yok — sabit süzülüyor, kendi ekseninde yavaşça
     döner, ATIŞ anında kısa bir şarj parlaması yapar. Asıl gösteri
     ZİNCİRLEME YILDIRIM KAVİSİ (_buildLightningArcs) ve fırtına çağrısı
     efektidir — bkz. aşağı. Statik GLB, hiç iskelet yok (bkz. _buildBow). */
  /** SAVAŞÇI'nın Kale Palası — Seher'in süzülen kılıcıyla AYNI desen:
      yanında havada süzülür, yay-sönüm (spring-damper) ile karakteri bir
      kütle gibi gecikerek takip eder. Trail/flame/echo/wave YOK (Seher'e
      özel signature'lar) — süzülme + basit savuruş tepkisi yeterli, adi
      kademeye göre ölçeklendirilmiş görsel karmaşıklık. */
  _buildBlade() {
    this.bladeReady = false;
    this.bladePivot = null;
    this._bladeLastSwingId = 0;
    this._bladeSwingT = 1;
    this._bladeInit = false;
    this._blX = 0; this._blY = 58; this._blZ = 0;
    this._blVX = 0; this._blVY = 0; this._blVZ = 0;
    loadDecimatedProp(THREE, { GLTFLoader, DRACOLoader }, 'assets/savasci/pala.glb', {
      key: 'pala', targetTris: 9000, texSize: 1024,
    }).then((res) => {
      const blade = res.model;
      blade.traverse((o) => { if (o.isMesh) { o.castShadow = false; o.frustumCulled = false; } });

      /* Seher'in kılıcıyla AYNI kural: uzun eksen +X'e getirilir, böylece
         pivot.rotation.y süzülme yönünü doğrudan yönetir. */
      const b0 = new THREE.Box3().setFromObject(blade);
      const sz0 = new THREE.Vector3(); b0.getSize(sz0);
      if (sz0.z >= sz0.x && sz0.z >= sz0.y) blade.rotation.y = Math.PI / 2;
      else if (sz0.y >= sz0.x && sz0.y >= sz0.z) blade.rotation.z = Math.PI / 2;
      blade.updateMatrixWorld(true);

      const b1 = new THREE.Box3().setFromObject(blade);
      const sz1 = new THREE.Vector3(); b1.getSize(sz1);
      /* 74 birim: Seher'in kılıcıyla AYNI uzunluk (bkz. _buildSword) —
         46 birimde 76 birimlik gövdenin yanında oyuncak gibi duruyordu. */
      blade.scale.setScalar(74 / Math.max(0.001, sz1.x));
      blade.updateMatrixWorld(true);
      const b2 = new THREE.Box3().setFromObject(blade);
      /* pivot kabzada (-X ucu): kılıç ondan +X'e uzanır */
      blade.position.set(-b2.min.x, -(b2.min.y + b2.max.y) / 2, -(b2.min.z + b2.max.z) / 2);

      const inner = new THREE.Group();
      inner.add(blade);
      inner.position.set(6, 0, 0);   // Seher'in _swordReach'i ile aynı

      const pivot = new THREE.Group();
      pivot.add(inner);
      pivot.visible = false;
      this.scene.add(pivot);
      this.bladePivot = pivot;
      this.bladeInner = inner;
      this.bladeReady = true;
    }).catch((err) => console.warn('Pala modeli yüklenemedi.', err));
  }

  _updateBlade(game, dt) {
    if (!this.bladeReady || !this.bladePivot) return;
    const W = game.weapons;
    const modelDef = CHARACTER_MODELS[this._currentCharId];
    const show = !!(modelDef && modelDef.floatingWeapon === 'pala' && W && W.lvl && W.lvl('pala') > 0);
    this.bladePivot.visible = show;
    if (!show) { this._bladeInit = false; return; }

    const p = game.player;
    /* SÜZÜLME: Seher'in yay-sönüm takibiyle aynı desen — düz ofis değil,
       kılıç bir kütle gibi gecikir/savrulur, karakterin ikizi olmaz. */
    /* çapa Seher'in kılıcıyla AYNI: sağ omuz hizası, gövdeden 50 birim.
       Eskiden solda (−46) ve 40 birim yükseklikteydi — hem gövdeye çok
       yakın hem de kalça hizasında duruyordu. */
    const ax = p.x + 50, az = p.y + 22;
    const ay = 58 + Math.sin(game.time * 1.15) * 7;
    if (!this._bladeInit) {
      this._bladeInit = true;
      this._blX = ax; this._blZ = az; this._blY = ay;
      this._blVX = 0; this._blVZ = 0; this._blVY = 0;
    }
    const sdt = Math.min(dt, 0.05);
    const K = 46, D = 9.5;
    this._blVX += ((ax - this._blX) * K - this._blVX * D) * sdt;
    this._blVZ += ((az - this._blZ) * K - this._blVZ * D) * sdt;
    this._blVY += ((ay - this._blY) * K - this._blVY * D) * sdt;
    this._blX += this._blVX * sdt; this._blZ += this._blVZ * sdt; this._blY += this._blVY * sdt;
    const ddx = this._blX - p.x, ddz = this._blZ - p.y;
    const dd = Math.sqrt(ddx * ddx + ddz * ddz);
    if (dd < 34) {
      const k = dd > 0.001 ? 34 / dd : 1;
      this._blX = p.x + ddx * k; this._blZ = p.y + ddz * k;
    }
    this.bladePivot.position.set(this._blX, this._blY, this._blZ);

    /* NİŞAN: en yakın düşmana döner, yoksa yürüme yönü. Açı OYUNCU
       merkezinden ölçülür (kılıcın süzüldüğü noktadan değil) — yoksa
       kılıç sağda dururken soldaki düşmana arkasını dönüyor. Seher'in
       kuralının aynısı, bkz. _updateSword. */
    const n = W.nearest;
    const aimDir = n ? Math.atan2(n.y - p.y, n.x - p.x) : p.facing;

    if (W.swingId !== this._bladeLastSwingId) {
      this._bladeLastSwingId = W.swingId;
      this._bladeSwingT = 0;
    }
    const dur = Math.max(0.05, W.swingDur || 0.18);
    this._bladeSwingT = Math.min(1, this._bladeSwingT + dt / dur);
    const t = this._bladeSwingT;
    const sm = t * t * (3 - 2 * t);
    /* basit savuruş tepkisi: vuruş anında geriden gelip nişana "yetişir" */
    const kick = (W.swingKind === 'spin') ? Math.PI * 2 : Math.PI * 0.62;
    const sweep = (1 - sm) * kick;

    /* YAW YUMUŞATMA: hedef değişince (düşman ölünce sıradakine geçer)
       ham -aimDir anında zıplıyordu. En kısa yönden kayarak döner, yani
       pala hedefi TAKİP ediyor gibi okunur. */
    let want = -aimDir;
    if (this._blYaw === undefined) this._blYaw = want;
    let d = want - this._blYaw;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    this._blYaw += d * Math.min(1, dt * 9);

    this.bladePivot.rotation.y = this._blYaw - sweep;
    this.bladePivot.rotation.x = -0.30 + Math.sin(game.time * 1.4) * 0.04;
    this.bladePivot.rotation.z = 0.1;
  }

  /* ═══════════ MAVİ ALEV (GÖKALEV'in imza silahı) ═══════════
     Kullanıcının Tripo ile tasarladığı GLB (4.9k üçgen, gömülü webp doku).
     Mavi gövde / kızıl uç ARTIK MODELİN KENDİ DOKUSUNDAN gelir — eski
     prosedürel lathe gövde kaldırıldı.

     Süzülme/nişan/titreme mantığı Seher'in kılıcıyla BİREBİR aynı desendir
     (yay-sönüm takip + asgari mesafe + yumuşatılmış hedef yaw'ı) — böylece
     dört imza silahı aynı ağırlık hissini paylaşır. */
  _buildFlame() {
    this.flameReady = false;
    this.flamePivot = null;
    this._flInit = false;
    this._flX = 0; this._flY = 58; this._flZ = 0;
    this._flVX = 0; this._flVY = 0; this._flVZ = 0;
    this._flYaw = 0;
    this._flCharge = 0;
    this._lastFlameFire = 0;

    /* 42 birim: kılıç 74, şimşek kırığı 34. Alev HACİMLİ olduğu için ince
       bir kılıçla aynı boyda olmamalı — 50'de karakterin siluetiyle
       yarışıyordu; 42 belirgin ama gövdeyi bastırmıyor. */
    const H = 42;
    this._buildFlameAura(H);
    const loader = new GLTFLoader();
    loader.setDRACOLoader(this._getDraco());
    loader.loadAsync('assets/gokalev/mavialev.glb').then((gltf) => {
      const flame = gltf.scene;
      budgetTextures(flame, Math.min(1024, Quality.budget('texHero')));
      flame.traverse((o) => {
        if (o.isMesh) {
          o.frustumCulled = false;
          o.castShadow = false;
          const mats = Array.isArray(o.material) ? o.material : [o.material];
          for (const mt of mats) {
            if (!mt) continue;
            /* Tripo doubleSided gönderir — fillrate ×2, görsel fark yok */
            mt.side = THREE.FrontSide;
            mt.metalness = 0.0;
            mt.roughness = 0.45;
            /* ALEV KENDİ IŞIĞINI YAYAR: gerçek zamanlı ışık eklemek yasak
               (bkz. CLAUDE.md), parlama emissive ile yapılır. Doku rengini
               emissiveMap olarak da kullanınca mavi gövde/kızıl uç ayrımı
               karanlıkta da korunur — tek renk emissive hepsini aynı
               tona boyuyordu. */
            if (mt.emissive) {
              mt.emissive.setHex(0xffffff);
              mt.emissiveMap = mt.map || null;
              /* toneMapped KAPALI: sahne karanlık ve tone map parlak
                 emissive'i bastırıyordu — alev ateş değil, mat mor bir leke
                 gibi duruyordu. Yalnız bu materyalde kapatılır. */
              mt.toneMapped = false;
              mt.emissiveIntensity = 2.4;
              this._flameMats = this._flameMats || [];
              this._flameMats.push(mt);
            }
          }
        }
      });

      /* ölçek: dikey damla olduğu için BOYA göre (Y) normalize edilir */
      const b0 = new THREE.Box3().setFromObject(flame);
      const sz0 = new THREE.Vector3(); b0.getSize(sz0);
      flame.scale.setScalar(H / Math.max(0.001, sz0.y));
      flame.updateMatrixWorld(true);
      /* taban y=0'a, X/Z merkeze — Tripo ağı origin'de merkezli GELMEZ
         (kahraman yükleyicisindeki aynı tuzak, bkz. _loadCharacterModel) */
      const b1 = new THREE.Box3().setFromObject(flame);
      flame.position.set(-(b1.min.x + b1.max.x) / 2, -b1.min.y, -(b1.min.z + b1.max.z) / 2);

      /* titreme grubu: alev TABANINDAN büyür (ortadan değil) — gerçek
         alevler kökünden yükselir, ortadan ölçeklemek nabız gibi durur */
      const flicker = new THREE.Group();
      flicker.add(flame);

      const inner = new THREE.Group();
      flicker.position.y = -H * 0.45;   // pivot alevin ORTA yüksekliğinde olsun
      inner.add(flicker);
      inner.position.set(6, 0, 0);      // Seher'in _swordReach'i ile aynı

      const pivot = new THREE.Group();
      pivot.add(inner);
      pivot.visible = false;
      this.scene.add(pivot);

      this.flamePivot = pivot;
      this.flameInner = inner;
      this.flameFlicker = flicker;
      this.flameReady = true;
    }).catch((err) => console.warn('Mavi Alev modeli yüklenemedi.', err));
  }

  /** İMZA ALEVİNİN PARLAMA KATMANLARI — modelden BAĞIMSIZ kurulur
      (GLB gelmese de sahne tutarlı kalır) ve SAHNE düzeyinde yaşar: pivot
      hedefe döndüğü için kameraya bakan quad'ları onun altına asmak yaw'la
      birlikte eğip bozardı.

      ÜÇ PARÇA, ÜÇ ÇİZİM ÇAĞRISI (yalnız GÖKALEV sahnedeyken):
        glow    — 4 örnek: dar+parlak çekirdek, orta gövde, geniş hale,
                  namlu flaşı. Üç boyutun toplamı = sahte bloom.
        tongues — alevin içinden yükselip sönen yalımlar: silah artık
                  "parlayan bir model" değil YANAN bir şey gibi okunur.
        spill   — zeminde mavi ışık lekesi. Gerçek ışık eklemek yasak
                  (CLAUDE.md); ışığın DÜŞTÜĞÜ yeri boyamak bedava. */
  _buildFlameAura(H) {
    const mkInst = (map, max, order) => {
      const mesh = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1),
        new THREE.MeshBasicMaterial({
          map, transparent: true, blending: THREE.AdditiveBlending,
          depthWrite: false, toneMapped: false, side: THREE.DoubleSide,
        }), max);
      mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(max * 3), 3);
      mesh.count = 0;
      mesh.frustumCulled = false;
      mesh.renderOrder = order;
      mesh.visible = false;
      this.scene.add(mesh);
      return mesh;
    };
    this.flameGlow = mkInst(this._glowTexture(), 4, 3);
    this.flameTongues = mkInst(this._flameSpriteTexture(), 7, 4);
    this._flameH = H;
    /* yalım fazları: sabit ve düzensiz — eşit aralıklı fazlar "döner lâmba"
       gibi ritmik okunuyor, alev düzensiz olmalı. */
    this._flTonguePh = [0.00, 0.37, 0.62, 0.14, 0.83, 0.49, 0.26];

    const spill = new THREE.Mesh(new THREE.PlaneGeometry(H * 4.2, H * 4.2),
      new THREE.MeshBasicMaterial({
        map: this._glowTexture(), color: 0x2f7fe0, transparent: true, opacity: 0,
        blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false,
      }));
    spill.rotation.x = -Math.PI / 2;
    spill.position.y = 1.6;
    spill.frustumCulled = false;
    spill.visible = false;
    this.scene.add(spill);
    this.flameSpill = spill;
  }

  _updateFlame(game, dt) {
    if (!this.flameReady || !this.flamePivot) return;
    const W = game.weapons;
    const modelDef = CHARACTER_MODELS[this._currentCharId];
    const show = !!(modelDef && modelDef.floatingWeapon === 'alev' && W && W.lvl && W.lvl('alev') > 0);
    this.flamePivot.visible = show;
    if (!show) {
      this._flInit = false;
      if (this.flameGlow) this.flameGlow.visible = false;
      if (this.flameTongues) this.flameTongues.visible = false;
      if (this.flameSpill) this.flameSpill.visible = false;
      return;
    }

    const p = game.player;
    /* SÜZÜLME: diğer üç imza silahıyla AYNI yay-sönüm takip (bkz.
       _updateSword) — kütle hissi, ışınlanma yok, gövdeye asgari mesafe. */
    const ax = p.x + 50, az = p.y + 22;
    const ay = 54 + Math.sin(game.time * 1.25) * 7;
    if (!this._flInit) {
      this._flInit = true;
      this._flX = ax; this._flZ = az; this._flY = ay;
      this._flVX = 0; this._flVZ = 0; this._flVY = 0;
    }
    const sdt = dt > 0.05 ? 0.05 : dt;
    const K = 44, D = 9.0;              // kılıçtan bir tık yumuşak: alev savrulur
    this._flVX += ((ax - this._flX) * K - this._flVX * D) * sdt;
    this._flVZ += ((az - this._flZ) * K - this._flVZ * D) * sdt;
    this._flVY += ((ay - this._flY) * K - this._flVY * D) * sdt;
    this._flX += this._flVX * sdt; this._flZ += this._flVZ * sdt; this._flY += this._flVY * sdt;
    const ddx = this._flX - p.x, ddz = this._flZ - p.y;
    const dd = Math.sqrt(ddx * ddx + ddz * ddz);
    if (dd < 34) {
      const k = dd > 0.001 ? 34 / dd : 1;
      this._flX = p.x + ddx * k; this._flZ = p.y + ddz * k;
    }
    this.flamePivot.position.set(this._flX, this._flY, this._flZ);

    /* NAMLU: kor topu alevin GÖVDESİNDEN değil, hedefe bakan UCUNDAN çıkar.
       Nokta analitik hesaplanır (getWorldPosition'a gerek yok): pivot
       rotation.y = _flYaw olduğu için yerel +X ekseni nişan doğrultusudur
       (bkz. _updateCannon'daki aynı desen).
       PARALAKS UYARISI (CLAUDE.md): mermi bu noktadan çıkıp oyuncu→hedef
       doğrultusunda uçarsa namlu ile yol arasında açı kalır; fireGun ATIŞ
       AÇISINI da bu noktadan ölçer (ox/oy = flamePos), o yüzden hizalı. */
    const fwx = Math.cos(this._flYaw), fwz = -Math.sin(this._flYaw);
    const mx = this._flX + fwx * 18, mz = this._flZ + fwz * 18;
    const my = this._flY - 10;                 // kor topunun uçuş yüksekliği
    W.flamePos.x = mx; W.flamePos.y = mz;

    /* NİŞAN: en yakın düşmana döner (açı oyuncu merkezinden, bkz.
       _updateBlade); hedef değişince kayarak, zıplamadan. */
    const n = W.nearest;
    const aimDir = n ? Math.atan2(n.y - p.y, n.x - p.x) : p.facing;
    let d = -aimDir - this._flYaw;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    this._flYaw += d * Math.min(1, dt * 8);
    this.flamePivot.rotation.y = this._flYaw;

    /* ateş algıla → parlama + ileri savrulma darbesi */
    const fc = W.flameFireCount || 0;
    if (fc !== this._lastFlameFire) { this._lastFlameFire = fc; this._flCharge = 1; }
    if (this._flCharge > 0) this._flCharge = Math.max(0, this._flCharge - dt * 3.4);
    const ch = this._flCharge;

    /* TİTREME: iki farklı frekansın toplamı — tek sinüs "nefes alan balon"
       gibi okunuyordu, alev düzensiz oynamalı. */
    const t = game.time;
    const wob = Math.sin(t * 13.0) * 0.06 + Math.sin(t * 7.3 + 1.7) * 0.04;
    const sy = 1 + wob * 1.6 + ch * 0.30;
    const sxz = 1 - wob * 0.9 + ch * 0.12;     // uzarken incelir (hacim korunur gibi)
    this.flameFlicker.scale.set(sxz, sy, sxz);
    /* ateş anında hedefe doğru yatar — vuruşun yönü okunur */
    this.flameFlicker.rotation.z = -0.10 - ch * 0.42 + Math.sin(t * 5.1) * 0.05;

    /* parlama: modelin kendi dokusu emissiveMap olduğu için yalnız ŞİDDET
       değişir — mavi gövde/kızıl uç ayrımı korunur (renk ezilmez). */
    const mats = this._flameMats;
    if (mats) {
      const inten = 2.20 + ch * 1.30 + wob * 2.6;
      for (let i = 0; i < mats.length; i++) mats[i].emissiveIntensity = inten;
    }

    /* ── SAHTE BLOOM: üç boyutta parıltı, HER BİRİ FARKLI frekansta ──
       Eşit titreşen katmanlar "yanıp sönen ampul" gibi okunuyor; farklı
       frekansların toplamı yanan bir şey gibi. */
    const H = this._flameH || 42;
    const gm = this.flameGlow;
    if (gm) {
      gm.visible = true;
      const f1 = 0.70 + 0.20 * Math.sin(t * 12.4) + 0.10 * Math.sin(t * 29.1);
      const f2 = 0.64 + 0.24 * Math.sin(t * 7.9 + 1.1);
      const f3 = 0.56 + 0.18 * Math.sin(t * 4.6 + 2.3);
      const cy = this._flY + 2;
      this._bb(gm, 0, this._flX, cy, this._flZ, H * 0.80, H * 1.05, 0,
        (0.38 + ch * 0.42) * f1, (0.62 + ch * 0.24) * f1, 0.86 * f1);
      this._bb(gm, 1, this._flX, cy, this._flZ, H * 1.70, H * 2.00, 0,
        (0.10 + ch * 0.18) * f2, (0.34 + ch * 0.15) * f2, 0.78 * f2);
      this._bb(gm, 2, this._flX, cy, this._flZ, H * 3.10, H * 3.35, 0,
        0.045 * f3, 0.145 * f3, 0.38 * f3);
      /* namlu flaşı: yalnız atış anında — merminin ÇIKTIĞI noktayı işaretler,
         "alev oradan fırlatılıyor" okunmasının anahtarı budur. */
      const mf = ch * ch;
      const ms = 22 + ch * 34;
      this._bb(gm, 3, mx, my + 4, mz, ms, ms, 0, mf, mf * 0.94, mf * 0.82);
      commitInstanced(gm, 4, true);
    }

    /* ── YÜKSELEN YALIMLAR: silah "parlayan model" değil YANAN şey olsun ── */
    const tg = this.flameTongues;
    if (tg) {
      tg.visible = true;
      const cap = Quality.stress > 0.6 ? 4 : 7;
      const phs = this._flTonguePh;
      for (let i = 0; i < cap; i++) {
        const u = (t * 1.45 + phs[i]) % 1;                 // 0 doğum → 1 ölüm
        const sway = Math.sin(t * 5.3 + i * 2.1) * (4 + u * 10);
        const w = H * (0.40 - u * 0.20) * (1 + Math.sin(t * 17 + i * 3.7) * 0.12);
        const hh = H * (0.74 - u * 0.30);
        /* doğumda hızla açılır, ölümde söner: sert kesim "pop" gibi durur */
        const a = (1 - u) * (0.50 + ch * 0.45) * (u < 0.14 ? u / 0.14 : 1);
        this._bb(tg, i,
          this._flX + sway * 0.45 + fwx * 5, this._flY - H * 0.26 + u * H * 1.10, this._flZ + sway * 0.45 + fwz * 5,
          w, hh, Math.sin(t * 3.1 + i) * 0.14,
          a * 0.52, a * 0.84, a);
      }
      commitInstanced(tg, cap, true);
    }

    /* zeminde ışık lekesi — gerçek ışık yasak, ışığın DÜŞTÜĞÜ yer bedava */
    const sl = this.flameSpill;
    if (sl) {
      sl.visible = true;
      sl.position.set(this._flX, 1.6, this._flZ);
      sl.material.opacity = 0.11 + wob * 0.45 + ch * 0.10;
    }
  }

  /** Kameraya bakan tek bir instanced quad yazar (billboard).
      Toplayıcı karışımda ALFA renkten gelir — instanced'da örnek başına
      materyal opacity'si yoktur, o yüzden rgb doğrudan parlaklıkla çarpılır:
      hem ton hem şiddet tek yerden yönetilir. Tahsis YOK (TMP). */
  _bb(mesh, i, x, y, z, sx, sy, spin, cr, cg, cb) {
    const m = TMP.m4, q = TMP.q, s = TMP.v, pos = TMP.vb, col = TMP.col;
    q.copy(this.camera.quaternion);
    if (spin) { TMP.qb.setFromAxisAngle(AXIS_Z, spin); q.multiply(TMP.qb); }
    m.compose(pos.set(x, y, z), q, s.set(sx, sy, 1));
    mesh.setMatrixAt(i, m);
    col.setRGB(cr > 0 ? cr : 0, cg > 0 ? cg : 0, cb > 0 ? cb : 0);
    mesh.setColorAt(i, col);
  }

  /* ═══════════ İSABET KATMANI — TÜM SİLAHLAR (2026-08-18) ═══════════
     Bugüne kadar vuruşun 3B'de HİÇ izi yoktu: yalnız 2D kan spreyi, hasar
     yazısı ve (kritikte) kıvılcım vardı. Kor topu, yıldırım ve gök kılıcı
     kendi isabet efektlerini taşıyordu — yani sahnede "iyi görünen" tek şey
     üç imza yeteneğiydi, geri kalan her vuruş sessizdi.

     Bu katman ORTAK: hangi kahraman, hangi silah olursa olsun her isabet
     buradan geçer, dolayısıyla tek sistem tüm kadronun dövüş hissini
     yükseltir. Üç parça, hepsi kameraya bakan tek quad (bkz. _bb):

       ① ÇEKİRDEK  iki karede tepeye çıkan sıcak flaş — "değdi" anı
       ② KESİK     darbe DOĞRULTUSUNDA uzayıp incelen çizgi — "nereden geldi"
       ③ HALKA     basık şok diski — yalnız kritik/ağır, sıradan vuruşta
                   çizilirse ekran halka çorbasına döner

     Renk dili KASITLI olarak yetenek renklerinden ayrıdır: hasar sıcak
     beyaz, kritik altın, ölüm koyu kızıl. Mavi alev / mor şimşek kendi
     kimliğini korur, oyuncu "bu bir vuruş" ile "bu bir yetenek"i renkten
     ayırır.

     Maliyet: 3 çizim çağrısı ve YALNIZ sahnede isabet varken (count 0'da
     mesh görünmez). Feda sırası: sıradan isabetin kesiği → sıradan isabetin
     tamamı → kritik asla düşmez. */
  _buildImpactFx() {
    const mk = (map, max, order) => {
      const mesh = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1),
        new THREE.MeshBasicMaterial({
          map, transparent: true, blending: THREE.AdditiveBlending,
          depthWrite: false, toneMapped: false, side: THREE.DoubleSide,
        }), max);
      mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(max * 3), 3);
      mesh.count = 0;
      mesh.frustumCulled = false;
      mesh.renderOrder = order;
      mesh.visible = false;
      this.scene.add(mesh);
      return mesh;
    };
    /* 26 eşzamanlı isabet: 60 fps'te 0,22 sn ömürle saniyede ~118 vuruşa
       yeter; fazlası zaten gözle ayrılamaz ve halka tamponu geri döner. */
    this._impMax = 26;
    this.impCoreMesh = mk(this._glowTexture(), this._impMax, 6);
    this.impSlashMesh = mk(this._slashTexture(), this._impMax, 6);
    this.impRingMesh = mk(this._shockTexture(), this._impMax, 5);
    this._imps = [];
    for (let i = 0; i < this._impMax; i++) {
      this._imps.push({ t: -1, max: 0.22, x: 0, z: 0, spin: 0, sc: 1, tier: 0, cr: 1, cg: 1, cb: 1 });
    }
    this._impNext = 0;
    this._castNext = 0;
    this._impPrev = 0;

    /* KURAL 5 — ilk kullanımda derlenen hiçbir şey savaşta olmaz.
       Bu üç materyal `visible = false` doğuyor ve precompileScene sahneyi
       GÖRÜNÜR düğümler üzerinden gezdiği için derlenmemiş kalıyorlardı:
       oyuncunun ilk vuruşu shader derlemesini tetikler, yani savaşın ilk
       saniyesinde tek karelik bir takılma olur. Isıtma sırasında üçünü
       görünür yapıp bir kare çizdiriyor, sonra geri kapatıyoruz. */
    Warmup.add('isabet katmanı shaderı', () => {
      const ms = [this.impCoreMesh, this.impSlashMesh, this.impRingMesh];
      for (const m of ms) { m.visible = true; m.count = 1; }
      this._bb(this.impCoreMesh, 0, 0, 30, 0, 8, 8, 0, 1, 1, 1);
      this._bb(this.impSlashMesh, 0, 0, 30, 0, 8, 4, 0, 1, 1, 1);
      this._bb(this.impRingMesh, 0, 0, 6, 0, 16, 8, 0, 1, 1, 1);
      commitInstanced(this.impCoreMesh, 1, true);
      commitInstanced(this.impSlashMesh, 1, true);
      commitInstanced(this.impRingMesh, 1, true);
      this.renderer.render(this.scene, this.camera);
      for (const m of ms) { m.visible = false; m.count = 0; }
    });
  }

  /** İsabet flaşı. combat.applyHit (her vuruş), enemyManager.onDeath (ölüm)
      ve main.explode (alan hasarı) çağırır.
      @param ang dünya düzlemindeki darbe açısı — ekran açısına çevrilir
      @param tier 0 sıradan · 1 kritik · 2 ağır (patlama/ölüm) */
  spawnHit(x, y, ang, tier, cr, cg, cb) {
    const list = this._imps;
    if (!list) return;
    /* Cihaz zorlanıyorsa İLK feda edilen sıradan isabettir; kritik ve
       patlama her koşulda çizilir (bilgi taşıyorlar). */
    if (tier === 0 && Quality.stress > 0.7) return;
    /* Canlı yuva penceresi bütçeden gelir — düşük kademeli cihazda 14,
       yüksekte 30. Halka tamponu pencere içinde döner. */
    /* Son ÜÇ yuva imza anına ayrılmıştır (bkz. spawnCast) — sıradan isabet
       penceresi onları hiç kullanmaz. */
    const cap = Math.min(list.length - 3, Quality.budget('impacts') || list.length);
    const s = list[this._impNext % cap];
    this._impNext++;
    s.t = 0;
    s.max = tier >= 2 ? 0.42 : (tier === 1 ? 0.32 : 0.20);
    s.x = x; s.z = y;
    /* dünya→ekran: kamera yaw'ı sabit, dikey bileşen cos(TILT) kadar kısalır */
    s.spin = -Math.atan2(Math.sin(ang) * COS_TILT, Math.cos(ang));
    s.tier = tier;
    s.sc = tier >= 2 ? 1.7 : (tier === 1 ? 1.2 : 0.85);
    s.cr = cr !== undefined ? cr : 1;
    s.cg = cg !== undefined ? cg : 0.92;
    s.cb = cb !== undefined ? cb : 0.76;
  }

  /** İMZA ANI — bir kahramanın imza yeteneği ateşlendiğinde oyuncunun
      ayağından yükselen sütun + geniş zemin mührü. "Bir şey OLDU" cümlesini
      hasar sayısından önce söyler; yetenek kendi efektini (girdap, hüküm,
      yan ateş, ayaz halkası) bunun ÜSTÜNE çizer.

      Kademe 3 olarak ortak isabet havuzunda yaşar: yeni mesh YOK, yeni
      çizim çağrısı YOK, yeni doku YOK — üç mevcut quad katmanı paylaşılır.
      Son üç yuva buna ayrılmıştır, yani kalabalıkta yüz vuruş olsa da imza
      anı yuvasını asla kaptırmaz (bilgi taşıyan olay feda edilmez).

      Renk yeteneğin kendi dilinden gelir: Ayaz cam göğü · Kraliçe menekşe ·
      Kaptan barut kehribarı · Seher kor · Gökalev mavi alev. */
  spawnCast(x, y, cr, cg, cb) {
    const list = this._imps;
    if (!list) return;
    const s = list[list.length - 3 + (this._castNext % 3)];
    this._castNext++;
    s.t = 0;
    s.max = 0.62;
    s.x = x; s.z = y;
    s.tier = 3;
    s.spin = 0;
    s.sc = 1;
    s.cr = cr; s.cg = cg; s.cb = cb;
  }

  _updateImpacts(dt) {    const cm = this.impCoreMesh;
    if (!cm) return;
    let live = 0;
    for (let i = 0; i < this._imps.length; i++) if (this._imps[i].t >= 0) live++;
    if (live === 0 && !this._impPrev) return;   // bkz. aşağıdaki not
    const sm = this.impSlashMesh, rm = this.impRingMesh;
    let c = 0, sl = 0, rg = 0;
    const lite = Quality.stress > 0.5;
    for (let i = 0; i < this._imps.length; i++) {
      const s = this._imps[i];
      if (s.t < 0) continue;
      s.t += dt;
      if (s.t >= s.max) { s.t = -1; continue; }
      const e = s.t / s.max, inv = 1 - e;
      /* ── TIER 3: İMZA ANI (dikey okunur) ── */
      if (s.tier === 3) {
        /* yerden yükselen sütun: ilk %18'de açılır, sonra süzülerek söner */
        const up = e < 0.18 ? e / 0.18 : 1;
        const fade = e < 0.18 ? 1 : Math.pow(1 - (e - 0.18) / 0.82, 2.2);
        const h = 42 + 176 * up;
        const w = (46 + 26 * up) * (0.5 + 0.5 * fade);
        this._bb(cm, c++, s.x, 8 + h * 0.5, s.z, w, h,
                 0, fade * s.cr, fade * s.cg, fade * s.cb);
        /* geniş zemin mührü: hızlı açılır, yavaş söner — "burada bir şey oldu" */
        const u = Math.min(1, e / 0.62), k = (1 - u) * (1 - u) * 0.62;
        const rr = 34 + 168 * Math.sqrt(u);
        this._bb(rm, rg++, s.x, 6, s.z, rr * 2, rr, 0, k * s.cr, k * s.cg, k * s.cb);
        continue;
      }
      const Y = 24 + s.tier * 7;
      /* ① ÇEKİRDEK — süre değil EĞRİ vuruş hissini verir: iki karede tepeye
         çıkar, küple söner. Uzun sönüm "duman" gibi durur. */
      const grow = e < 0.15 ? e / 0.15 : 1;
      const a = inv * inv * inv;
      const core = (10 + 24 * grow) * s.sc;
      this._bb(cm, c++, s.x, Y, s.z, core, core, 0, a * s.cr, a * s.cg, a * s.cb);
      /* ② KESİK — darbenin doğrultusunu söyler; uzarken incelir */
      if (s.tier > 0 || !lite) {
        const len = (26 + 74 * e) * s.sc;
        const wid = (15 * inv * inv + 2) * s.sc;
        const b = inv * inv * 0.8;
        this._bb(sm, sl++, s.x, Y, s.z, len, wid, s.spin, b * s.cr, b * s.cg, b * s.cb);
      }
      /* ③ HALKA — basık disk (dikeyde 0,5×): kabarcık değil zemine yayılan
         darbe okunur. Yalnız kritik ve ağır olayda. */
      if (s.tier > 0 && e < 0.72) {
        const u = e / 0.72, k = (1 - u) * (1 - u) * 0.46;
        const rr = (18 + 66 * u) * s.sc;
        this._bb(rm, rg++, s.x, 7, s.z, rr * 2, rr, 0, k * s.cr, k * s.cg, k * s.cb);
      }
    }
    commitInstanced(cm, c, true);
    commitInstanced(sm, sl, true);
    commitInstanced(rm, rg, true);
    cm.visible = c > 0; sm.visible = sl > 0; rm.visible = rg > 0;
    /* SAHNEDE İSABET YOKKEN TAMPON YÜKLENMEZ. commitInstanced(mesh, 0) bile
       küçük bir GPU trafiğidir ve bu katman TÜM kahramanlarda yaşıyor —
       kılıçlı bir koşuda menzilli efektler hiç açılmasa da her kare üç kez
       ödenirdi. Sayaç sıfırdan sıfıra geçtiğinde tamamen atlanır. */
    this._impPrev = c + sl + rg;
  }

  /* ═══════════ KOR TOPU + İSABET (GÖKALEV) ═══════════
     Eski hâli tek örnekli emissive KÜREYDİ (addBullet): hacimsiz, hareketsiz
     ve "top" gibi okunuyordu. Artık her kor topu kameraya bakan 3 yalım +
     2 kuyruk tutamı + parlak bir çekirdek olarak çizilir; türbülans mermi
     başına FAZ (b.ph) ile ayrışır, yani yan yana iki alev asla aynı kareyi
     göstermez.

     Maliyet ÜÇ çizim çağrısı (yalım / parıltı / şok halkası) ve yalnız
     sahnede kor topu ya da isabet varken. Örnek adedi Quality.stress ile
     kısılır: ilk feda edilen kuyruk tutamları, en son çekirdek flaşı —
     yani cihaz zorlandığında alev incelir ama VURUŞ HİSSİ kaybolmaz. */
  _buildFireFx() {
    const mkInst = (map, max, order) => {
      const mesh = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1),
        new THREE.MeshBasicMaterial({
          map, transparent: true, blending: THREE.AdditiveBlending,
          depthWrite: false, toneMapped: false, side: THREE.DoubleSide,
        }), max);
      mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(max * 3), 3);
      mesh.count = 0;
      mesh.frustumCulled = false;
      mesh.renderOrder = order;
      this.scene.add(mesh);
      return mesh;
    };
    this._fireFlameMax = 200;
    this._fireGlowMax = 120;
    this._fireRingMax = 18;
    this.fireFlameMesh = mkInst(this._flameSpriteTexture(), this._fireFlameMax, 4);
    this.fireGlowMesh = mkInst(this._glowTexture(), this._fireGlowMax, 5);
    this.fireRingMesh = mkInst(this._shockTexture(), this._fireRingMax, 5);
    this._fbUsed = 0; this._fgUsed = 0;
    /* isabet yuvaları: önceden tahsisli, halka şeklinde geri dönüşen 8 slot.
       Sekiz eşzamanlı isabetten fazlası gözle ayrılamıyor. */
    this._fireHits = [];
    for (let i = 0; i < 8; i++) this._fireHits.push({ t: -1, x: 0, y: 0, ph: 0, dir: 0, sc: 1 });
    this._fireHitNext = 0;
    this._fireHitY = 44;               // kor topunun uçuş yüksekliği
  }

  /** weapons.js isabet anında çağırır. SARSINTI YOK (CLAUDE.md: rutin olay
      kamerayı sarsmaz) — vuruş hissi ANI flaş + saçılan yalım + şok
      halkasıyla verilir. */
  spawnFlameImpact(x, y, ang, scale) {
    const slots = this._fireHits;
    if (!slots) return;
    const s = slots[this._fireHitNext % slots.length];
    this._fireHitNext++;
    s.t = 0; s.x = x; s.y = y; s.ph = Math.random() * 6.2831;
    /* geliş yönü: saçılan yalımlar İLERİYE ağırlıklı saçılır. Eşit dağılan
       bir yıldız "patlama ikonu" gibi duruyor; önde yoğun bir saçılma
       merminin ÇARPTIĞINI anlatır. */
    s.dir = ang === undefined ? s.ph : ang;
    /* sc > 1 → MAVİ NOVA (sig_a7). Aynı eğri, büyük ölçek: yalımlar tüm
       çembere yayılır, halka iki kat, ömür uzar. Ayrı bir sistem yazmak
       yerine ölçek vermek hem ucuz hem de iki efekti AYNI DİLDE tutar. */
    s.sc = scale || 1;
  }

  /** İsabet flaşlarını çizer ve ÜÇ ateş mesh'ini birlikte yükler.
      _updateProjectiles mermileri aynı mesh'lere yazdığı için commit
      BURADA, en sonda yapılır (iki kez yükleme = iki kez GPU trafiği). */
  _updateFireHits(game, dt) {
    const fm = this.fireFlameMesh;
    if (!fm) return;
    const gm = this.fireGlowMesh, rm = this.fireRingMesh;
    let fb = this._fbUsed || 0, fg = this._fgUsed || 0, fr = 0;
    const slots = this._fireHits;
    const Y = this._fireHitY;
    const LIFE = 0.30;
    const lite = Quality.stress > 0.55;
    const T = game.time;
    const zs = game.pools.zones.active;
    let blueZones = 0;
    for (let i = 0; i < zs.length; i++) { if (zs[i].blue) blueZones++; }
    const cyc = (game.weapons && game.weapons.cycloneN) | 0;
    let any = false;
    for (let i = 0; i < slots.length; i++) { if (slots[i].t >= 0) { any = true; break; } }
    if (!any && !blueZones && !cyc && fb === 0 && fg === 0) {
      /* sahnede ne kor topu ne isabet var: tampon yüklemesi BİLE yapılmaz.
         needsUpdate = true, count 0 olsa da kare başına üç küçük GPU
         yüklemesi demektir — diğer dört kahramanda bu bedava olmalı. */
      if (fm.count || gm.count || rm.count) {
        fm.count = 0; gm.count = 0; rm.count = 0;
      }
      fm.visible = false; gm.visible = false; rm.visible = false;
      return;
    }
    for (let i = 0; i < slots.length; i++) {
      const s = slots[i];
      if (s.t < 0) continue;
      s.t += dt;
      const sc = s.sc || 1, nova = sc > 1.4;
      /* NOVA daha uzun yaşar: büyük bir olay 0,30 sn'de biterse göz onu
         "büyük" değil "kaçırılmış" okur. Ölçek büyüdükçe süre de büyür. */
      const life = nova ? LIFE * 1.55 : LIFE;
      if (s.t >= life) { s.t = -1; continue; }
      const e = s.t / life, inv = 1 - e;
      const petals = nova ? (lite ? 7 : 11) : (lite ? 3 : 5);
      /* 1) BEYAZ ÇEKIRDEK FLAŞI — iki karede tepeye çıkıp sert söner.
         Vuruş hissini veren şey süre değil EĞRİ: uzun sönüm "duman",
         ani ve kısa olan "darbe" okunur. */
      if (fg < this._fireGlowMax) {
        const k = e < 0.16 ? e / 0.16 : (inv / 0.84) * (inv / 0.84);
        const sz = (32 + e * 44) * sc;
        this._bb(gm, fg++, s.x, Y, s.y, sz, sz, 0, k, k * 0.98, k * 0.93);
      }
      /* 2) mavi hale: flaşın arkasında daha geniş, biraz daha uzun ömürlü */
      if (fg < this._fireGlowMax) {
        const k = inv * inv * 0.9;
        const sz = (48 + e * 104) * sc;
        this._bb(gm, fg++, s.x, Y, s.y, sz, sz, 0, k * 0.18, k * 0.56, k);
      }
      /* 3) saçılan yalımlar: geliş yönüne ağırlıklı, dışa fırlayıp küçülen diller.
         NOVA'da yelpaze TAM ÇEMBER olur: mermi durmuş, patlama her yöne. */
      const fan = nova ? 6.2831 : 3.9;
      for (let k2 = 0; k2 < petals && fb < this._fireFlameMax; k2++) {
        const a = s.dir + ((k2 + 0.5) / petals - 0.5) * fan + Math.sin(s.ph + k2) * 0.25;
        const d = (7 + e * 44) * sc;
        const w = 23 * inv * (nova ? sc * 0.62 : 1);
        this._bb(fm, fb++,
          s.x + Math.cos(a) * d, Y + Math.sin(s.ph + k2 * 2.1) * 9 + e * 14 * sc, s.y + Math.sin(a) * d,
          w, w * 1.5, a + e * 1.1, inv * 0.30, inv * 0.72, inv);
      }
      /* 4) şok halkası: darbenin "sesi" — KİSA yaşar (ömrün ilk %55'i) ve
         dikeyde basıktır. Uzun yaşayan bir halka kabarcık gibi okunuyor. */
      if (fr < this._fireRingMax && e < 0.55) {
        const re = e / 0.55, rinv = 1 - re;
        const sz = (20 + (1 - rinv * rinv) * 66) * sc;
        const k = rinv * rinv * 0.75;
        this._bb(rm, fr++, s.x, Y - 4, s.y, sz, sz * 0.58, 0, k * 0.30, k * 0.58, k * 0.80);
        /* NOVA'nın İKİNCİ halkası: daha yavaş açılan, daha geniş, daha sönük
           bir çeper. Tek halka "ok" der, iki farklı hızda halka "şok dalgası". */
        if (nova && fr < this._fireRingMax) {
          const sz2 = (14 + re * 118) * sc;
          this._bb(rm, fr++, s.x, Y - 8, s.y, sz2, sz2 * 0.5, 0,
            rinv * 0.16, rinv * 0.38, rinv * 0.62);
        }
      }
    }
    if (cyc) {
      this._fbN = fb; this._fgN = fg;
      this._pushCyclone(game.weapons, cyc, T);
      fb = this._fbN; fg = this._fgN;
    }
    if (blueZones) {
      this._fbN = fb; this._fgN = fg;
      this._pushFireZones(zs, T);
      fb = this._fbN; fg = this._fgN;
    }
    commitInstanced(fm, fb, true);
    commitInstanced(gm, fg, true);
    commitInstanced(rm, fr, true);
    fm.visible = fb > 0; gm.visible = fg > 0; rm.visible = fr > 0;
  }

  /** MAVİ KOR BİRİKİNTİSİ (sig_a7) — zemindeki mavi disk TEK BAŞINA
      "boyanmış leke" gibi duruyor; yanan şeyi YALIMLAR satar. Yalımlar
      birikintinin tohumundan (z.seed) türetilir: her birikinti kendi
      düzensiz ritmini alır, yan yana ikisi aynı kareyi göstermez.
      Ateş mesh'lerini kor topuyla PAYLAŞIR (commit çağıranın işi). */
  _pushFireZones(zs, T) {
    const fm = this.fireFlameMesh, gm = this.fireGlowMesh;
    let fb = this._fbN, fg = this._fgN;
    const n = Quality.stress > 0.55 ? 3 : 5;
    for (let i = 0; i < zs.length; i++) {
      const z = zs[i];
      if (!z.blue) continue;
      /* doğuşta hızla açılır, sönerken kısalır — sert kesim "kapatıldı" durur */
      const fade = Math.min(1, (z.max - z.life) * 5, z.life * 1.5);
      for (let k = 0; k < n && fb < this._fireFlameMax; k++) {
        const u = (T * 1.2 + z.seed * 0.37 + k * 0.41) % 1;      // 0 doğum → 1 ölüm
        const ang = z.seed + k * 2.399;                          // altın açı dağılımı
        const rr = z.r * (0.16 + 0.60 * ((k * 0.37 + z.seed * 0.21) % 1));
        const w = z.r * (0.46 - u * 0.22);
        const h = z.r * (1.00 - u * 0.38);
        const a = fade * (1 - u) * (u < 0.16 ? u / 0.16 : 1);
        this._bb(fm, fb++,
          z.x + Math.cos(ang) * rr, 5 + u * z.r * 1.05, z.y + Math.sin(ang) * rr,
          w, h, Math.sin(T * 3.2 + k * 1.7) * 0.15,
          a * 0.28, a * 0.68, a * 0.96);
      }
      if (fg < this._fireGlowMax) {
        const fl = 0.62 + 0.22 * Math.sin(T * 9 + z.seed) + 0.12 * Math.sin(T * 21 + z.seed * 2);
        this._bb(gm, fg++, z.x, 9, z.y, z.r * 2.5, z.r * 1.5, 0,
          fade * fl * 0.13, fade * fl * 0.38, fade * fl * 0.78);
      }
    }
    this._fbN = fb; this._fgN = fg;
  }

  /** KOR KASIRGASI (sig_a8) — kahramanın çevresinde dönen mavi alev küreleri.
      Her küre üç katmandır (dış hacim · gövde · beyaz uç) + bir çekirdek
      parıltısı, artı GERİYE düşen iki iz tutamı: iz olmadan küreler dönmüyor,
      "kaydırılıyor" gibi okunuyor. Faz küre indisinden türetilir, yani
      hiçbir ikisi aynı kareyi göstermez.

      Ateş mesh'lerini kor topu ve isabetle PAYLAŞIR — commit çağıranın işi. */
  _pushCyclone(W, n, T) {
    const fm = this.fireFlameMesh, gm = this.fireGlowMesh;
    let fb = this._fbN, fg = this._fgN;
    const orbs = W.cycloneOrbs;
    const lite = Quality.stress > 0.55;
    const R = 13;
    for (let i = 0; i < n; i++) {
      const o = orbs[i];
      if (!o) break;
      const ph = i * 1.77;
      const w1 = Math.sin(T * 17.0 + ph * 3.1);
      const w2 = Math.sin(T * 10.3 + ph * 5.7);
      /* yörünge teğeti: iz küreden GERİYE düşsün (dönüş yönünün tersi) */
      const bx = Math.sin(o.a), bz = -Math.cos(o.a);
      const Y = 34 + Math.sin(T * 3.4 + ph) * 5;
      if (fb + 3 <= this._fireFlameMax) {
        this._bb(fm, fb++, o.x, Y, o.y,
          R * 3.2 * (1 + w1 * 0.10), R * 4.2 * (1 + w2 * 0.16), w1 * 0.16,
          0.06, 0.34, 0.98);
        this._bb(fm, fb++, o.x, Y + R * 0.25, o.y,
          R * 2.0 * (1 - w2 * 0.10), R * 2.8 * (1 + w1 * 0.12), -w2 * 0.20,
          0.26, 0.68, 1.0);
        this._bb(fm, fb++, o.x, Y + R * 0.8, o.y,
          R * 1.05, R * 1.7 * (1 + w1 * 0.22), w2 * 0.30,
          0.85, 0.95, 1.0);
      }
      if (!lite && fb + 2 <= this._fireFlameMax) {
        this._bb(fm, fb++, o.x + bx * R * 1.8, Y - R * 0.15, o.y + bz * R * 1.8,
          R * 1.7 * (1 + w2 * 0.18), R * 2.2, w2 * 0.5, 0.14, 0.42, 0.84);
        this._bb(fm, fb++, o.x + bx * R * 3.2, Y - R * 0.30, o.y + bz * R * 3.2,
          R * 1.15 * (1 + w1 * 0.20), R * 1.4, -w1 * 0.6, 0.06, 0.20, 0.48);
      }
      if (fg < this._fireGlowMax) {
        const c = 0.80 + w1 * 0.12;
        this._bb(gm, fg++, o.x, Y + R * 0.2, o.y, R * 2.4, R * 2.4, 0,
          c * 0.62, c * 0.86, c);
      }
    }
    this._fbN = fb; this._fgN = fg;
  }

  /* ═══════════ KAPTAN TOPU (KARA KAPTAN'ın imza silahı) ═══════════
     Tripo ihracı çakmaklı hayalet tabancası (703k üçgen — loadDecimatedProp
     ile ~9k'ya iner ve IndexedDB'ye yazılır; SAVAŞÇI'nın palasıyla aynı yol).

     Süzülme/nişan dili diğer dört imza silahıyla BİREBİR aynıdır (yay-sönüm
     takip + gövdeye asgari mesafe + yumuşatılmış hedef yaw'ı) — beş silah
     aynı ağırlık hissini paylaşır.

     Farkı NAMLU UCU: gülle gövdeden değil namlunun ucundan çıkar. Bu yüzden
     her karede namlu ucunun GERÇEK dünya konumu weapons.cannonPos'a yazılır
     (getWorldPosition ile — pitch ve geri tepme dahil, yaklaşıklık değil) ve
     weapons.fireGun oradan ateşler. Ateşte namlu ucunda barut parlaması +
     geriye doğru geri tepme darbesi olur. */
  _buildCannon() {
    this.cannonReady = false;
    this.cannonPivot = null;
    this._caInit = false;
    this._caX = 0; this._caY = 54; this._caZ = 0;
    this._caVX = 0; this._caVY = 0; this._caVZ = 0;
    this._caYaw = 0;
    this._caKick = 0;
    this._lastCannonFire = 0;
    this._lastBroadside = 0;

    /* 46 birim: kılıç 74, alev 42, şimşek kırığı 34. Tabanca KISA bir silah;
       80 birimlik gövdenin yanında kılıç boyunda olsa top değil tüfek olurdu. */
    const LEN = 46;
    loadDecimatedProp(THREE, { GLTFLoader, DRACOLoader }, 'assets/korsan/topatar.glb', {
      key: 'topatar', targetTris: 9000, texSize: 1024, metalness: 0.30, roughness: 0.48,
    }).then((res) => {
      const gun = res.model;
      gun.traverse((o) => { if (o.isMesh) { o.castShadow = false; o.frustumCulled = false; } });

      /* UZUN EKSEN → +X, NAMLU +X'e (PCA; flip görsel olarak ölçüldü — ham
         modelde namlu −X'e bakıyor, bkz. propAlign.js) */
      alignLongAxisToX(THREE, gun, LEN, { flip: true });
      const b2 = new THREE.Box3().setFromObject(gun);
      gun.position.x -= b2.min.x;            // pivot KABZADA, namlu +X'e uzanır
      const barrelLen = b2.max.x - b2.min.x;

      const spinner = new THREE.Group();     // geri tepme öteleme grubu
      spinner.add(gun);

      /* NAMLU AĞZI: gülle burada doğar. Görünmez düğüm — dünya konumu
         getWorldPosition ile birebir okunur (yaklaşık trigonometri yok). */
      const muzzle = new THREE.Object3D();
      muzzle.position.set(barrelLen * 1.02, 0, 0);
      spinner.add(muzzle);
      this.cannonMuzzle = muzzle;

      /* BARUT PARLAMASI: iki çapraz düzlem, tüylenmiş alfa dokusu (kare kenar
         yok). Ateş anında açılır, geri tepmeyle birlikte söner. */
      const blob = this._softBlobTexture();
      const flash = new THREE.Group();
      for (let i = 0; i < 2; i++) {
        const m = new THREE.Mesh(new THREE.PlaneGeometry(LEN * 0.85, LEN * 0.6),
          new THREE.MeshBasicMaterial({
            map: blob, color: i === 0 ? 0xfff0c0 : 0xff8a3c, transparent: true, opacity: 0,
            side: THREE.DoubleSide, blending: THREE.AdditiveBlending,
            depthWrite: false, toneMapped: false,
          }));
        m.position.set(LEN * 0.26, 0, 0);
        m.rotation.x = i * Math.PI / 2;
        flash.add(m);
      }
      flash.visible = false;
      muzzle.add(flash);
      this.cannonFlash = flash;

      const inner = new THREE.Group();
      inner.add(spinner);
      inner.position.set(6, 0, 0);           // Seher'in _swordReach'i ile aynı

      const pivot = new THREE.Group();
      pivot.add(inner);
      pivot.visible = false;
      this.scene.add(pivot);
      this.cannonPivot = pivot;
      this.cannonInner = inner;
      this.cannonSpinner = spinner;
      this.cannonReady = true;
    }).catch((err) => console.warn('Kaptan Topu modeli yüklenemedi.', err));
  }

  _updateCannon(game, dt) {
    if (!this.cannonReady || !this.cannonPivot) return;
    const W = game.weapons;
    const modelDef = CHARACTER_MODELS[this._currentCharId];
    const show = !!(modelDef && modelDef.floatingWeapon === 'topatar' && W && W.lvl && W.lvl('topatar') > 0);
    this.cannonPivot.visible = show;
    if (!show) { this._caInit = false; if (this.cannonFlash) this.cannonFlash.visible = false; return; }

    const p = game.player;
    /* SÜZÜLME: dört imza silahıyla aynı yay-sönüm takip (bkz. _updateSword) */
    const ax = p.x + 50, az = p.y + 22;
    const ay = 54 + Math.sin(game.time * 1.05) * 6;
    if (!this._caInit) {
      this._caInit = true;
      this._caX = ax; this._caZ = az; this._caY = ay;
      this._caVX = 0; this._caVZ = 0; this._caVY = 0;
    }
    const sdt = dt > 0.05 ? 0.05 : dt;
    /* K 40 / D 8.6: kılıçtan (46 / 9.5) daha AĞIR — top demir bir kütle gibi
       gecikerek gelir, kılıç gibi çevik savrulmaz. */
    const K = 40, D = 8.6;
    this._caVX += ((ax - this._caX) * K - this._caVX * D) * sdt;
    this._caVZ += ((az - this._caZ) * K - this._caVZ * D) * sdt;
    this._caVY += ((ay - this._caY) * K - this._caVY * D) * sdt;
    this._caX += this._caVX * sdt; this._caZ += this._caVZ * sdt; this._caY += this._caVY * sdt;
    const ddx = this._caX - p.x, ddz = this._caZ - p.y;
    const dd = Math.sqrt(ddx * ddx + ddz * ddz);
    if (dd < 34) {
      const k = dd > 0.001 ? 34 / dd : 1;
      this._caX = p.x + ddx * k; this._caZ = p.y + ddz * k;
    }
    this.cannonPivot.position.set(this._caX, this._caY, this._caZ);

    /* NİŞAN: en yakın düşmana döner. Açı SİLAHIN KENDİ konumundan ölçülür
       (yayın yaptığı gibi) — oyuncu merkezinden ölçmek PARALAKS hatası verir:
       namlu oyuncu→hedef doğrultusunu gösterirken gülle namlu→hedef
       doğrultusunda uçar. Top gövdeden ~105 birim uzakta süzüldüğü için bu
       sapma 220 birimlik hedefte ~11° ölçüldü ve düşman yaklaştıkça büyüyor:
       gülle görünür biçimde namlunun yanından sıyrılıyordu.
       (_updateFlame oyuncu merkezini kullanır ve bu ORADA doğrudur — küçük
       bir kor küresinin okunabilir bir namlusu yoktur.) */
    const n = W.nearest;
    const aimDir = n ? Math.atan2(n.y - this._caZ, n.x - this._caX) : p.facing;
    let d = -aimDir - this._caYaw;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    this._caYaw += d * Math.min(1, dt * 9);
    this.cannonPivot.rotation.y = this._caYaw;

    /* ATEŞ ALGILA → geri tepme + namlu parlaması. Bordo ateşi (yedi gülle)
       aynı darbeyi neredeyse iki kat sert yaptırır: tek gülle ile salvo
       arasındaki fark elde hissedilmeli. */
    const fc = W.cannonFireCount || 0;
    if (fc !== this._lastCannonFire) {
      this._lastCannonFire = fc;
      const bs = W.cannonBroadside || 0;
      const big = bs !== this._lastBroadside;
      if (big) this._lastBroadside = bs;
      this._caKick = big ? 1.8 : 1;
    }
    if (this._caKick > 0) this._caKick = Math.max(0, this._caKick - dt * 6.5);
    const kick = this._caKick;

    /* geri tepme: namlu geriye kaçar, ucu yukarı kalkar */
    this.cannonSpinner.position.x = -kick * 7;
    this.cannonInner.rotation.z = 0.06 + kick * 0.40 + Math.sin(game.time * 1.6) * 0.04;
    this.cannonInner.rotation.x = Math.sin(game.time * 1.2) * 0.05;

    if (this.cannonFlash) {
      const on = kick > 0.42;
      this.cannonFlash.visible = on;
      if (on) {
        const ch = this.cannonFlash.children;
        const a = Math.min(1, (kick - 0.42) * 2.2 + 0.3);
        const s = 0.7 + kick * 0.55;
        for (let i = 0; i < ch.length; i++) {
          ch[i].material.opacity = (i === 0 ? 0.95 : 0.6) * a;
          ch[i].scale.set(s, s, 1);
        }
        this.cannonFlash.rotation.x = game.time * 9;   // her ateşte farklı yalım
      }
    }

    /* NAMLU UCUNUN GERÇEK DÜNYA KONUMU → weapons.fireGun buradan ateşler.
       Matrisler bu karede tazelenir; bir kare geriden gelen konum hızlı
       hareket ederken gülleyi namlunun arkasında doğuruyordu. */
    this.cannonPivot.updateMatrixWorld(true);
    const mp = this.cannonMuzzle.getWorldPosition(TMP.v);
    W.cannonPos.x = mp.x; W.cannonPos.y = mp.z;
    W.cannonAim = this._caYaw;
  }

  /* ═══════════ GÖK KILICI (GECE KRALİÇESİ'nin imza vuruşu) ═══════════
     Gökten inen tek, devasa mavi hüküm. Şimşek'in fırtına sütunundan
     KASITLI olarak farklı okunur: yıldırım çentikli ve stroboskopiktir,
     hüküm ise DÜZ, keskin ve bir kılıç gibi aşağı saplanır — iki farklı
     kahraman aynı görseli paylaşmamalı.

     Üç katman: dar parlak çekirdek + geniş yumuşak hale (ikisi de çapraz
     çift düzlem) + zeminde iki farklı hızda açılan çeper. Post-processing
     YOK (CLAUDE.md); parlama tamamen toplayıcı karışımla. */
  _beamTexture() {
    if (this._beamTex) return this._beamTex;
    const Wc = 64, Hc = 256;
    const cv = document.createElement('canvas');
    cv.width = Wc; cv.height = Hc;
    const g = cv.getContext('2d');
    /* yatay: ortada parlak çekirdek, kenarlar tamamen erir */
    const lg = g.createLinearGradient(0, 0, Wc, 0);
    lg.addColorStop(0.00, 'rgba(255,255,255,0)');
    lg.addColorStop(0.34, 'rgba(255,255,255,0.42)');
    lg.addColorStop(0.50, 'rgba(255,255,255,1)');
    lg.addColorStop(0.66, 'rgba(255,255,255,0.42)');
    lg.addColorStop(1.00, 'rgba(255,255,255,0)');
    g.fillStyle = lg;
    g.fillRect(0, 0, Wc, Hc);
    /* dikey maske: tepe sönük (gökten geliyor), taban parlak (çarpma) */
    g.globalCompositeOperation = 'multiply';
    const vg = g.createLinearGradient(0, 0, 0, Hc);
    vg.addColorStop(0.00, 'rgba(255,255,255,0.10)');
    vg.addColorStop(0.42, 'rgba(255,255,255,0.72)');
    vg.addColorStop(1.00, 'rgba(255,255,255,1)');
    g.fillStyle = vg;
    g.fillRect(0, 0, Wc, Hc);
    const t = new THREE.CanvasTexture(cv);
    t.needsUpdate = true;
    this._beamTex = t;
    return t;
  }

  _buildJudgement() {
    const tex = this._beamTexture();
    const grp = new THREE.Group();
    const mk = (w, h, hex) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({
        map: tex, color: hex, transparent: true, opacity: 0, side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false,
      }));
      m.position.y = h / 2;
      m.frustumCulled = false;
      return m;
    };
    /* çekirdek (ince, ak-mavi) + hale (geniş, menekşe) — çapraz çift */
    this._judgeCore = [mk(22, 400, 0xeaf6ff), mk(22, 400, 0xeaf6ff)];
    this._judgeGlow = [mk(78, 400, 0x7f9cff), mk(78, 400, 0x7f9cff)];
    this._judgeCore[1].rotation.y = Math.PI / 2;
    this._judgeGlow[1].rotation.y = Math.PI / 2;
    for (let i = 0; i < 2; i++) grp.add(this._judgeGlow[i]);
    for (let i = 0; i < 2; i++) grp.add(this._judgeCore[i]);
    grp.visible = false;
    this.scene.add(grp);
    this.judgeGroup = grp;

    const shockTex = this._shockTexture();
    this.judgeRings = [];
    for (let i = 0; i < 2; i++) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({
        map: shockTex, color: i === 0 ? 0xdfeeff : 0x9a8cff, transparent: true, opacity: 0,
        blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, side: THREE.DoubleSide,
      }));
      m.rotation.x = -Math.PI / 2;
      m.frustumCulled = false; m.visible = false;
      this.scene.add(m);
      this.judgeRings.push(m);
    }
    this._judgeT = 1;
    this._judgeX = 0; this._judgeZ = 0;
  }

  /** weapons.fireJudgement her vuruşta çağırır. */
  spawnJudgement(x, y) {
    if (!this.judgeGroup) return;
    this._judgeX = x; this._judgeZ = y;
    this._judgeT = 0;
  }

  _updateJudgement(dt) {
    if (!this.judgeGroup) return;
    if (this._judgeT >= 1) {
      if (this.judgeGroup.visible) {
        this.judgeGroup.visible = false;
        this.judgeRings[0].visible = false;
        this.judgeRings[1].visible = false;
      }
      return;
    }
    this._judgeT = Math.min(1, this._judgeT + dt / 0.62);
    const t = this._judgeT;
    this.judgeGroup.position.set(this._judgeX, 0, this._judgeZ);
    this.judgeGroup.visible = true;
    /* İNİŞ: sütun ilk %22'de yukarıdan aşağı SAPLANIR (dikey ölçek), sonra
       yerinde parlayıp söner. */
    const drop = Math.min(1, t / 0.22);
    const fade = t < 0.22 ? 1 : Math.max(0, 1 - (t - 0.22) / 0.78);
    const stretch = 0.25 + 0.75 * (drop * drop * (3 - 2 * drop));
    for (let i = 0; i < 2; i++) {
      const c = this._judgeCore[i], gl = this._judgeGlow[i];
      c.scale.set(0.8 + 0.4 * fade, stretch, 1);
      gl.scale.set(1 + 0.5 * (1 - fade), stretch, 1);
      c.material.opacity = 0.95 * fade;
      gl.material.opacity = 0.45 * fade * fade;
    }
    /* zemin çeperi: iki farklı hız (derinlik) */
    for (let i = 0; i < 2; i++) {
      const m = this.judgeRings[i];
      const sp = i === 0 ? 1.5 : 2.4;
      const e = Math.min(1, t * sp);
      const r = 240 * (0.16 + 0.9 * (1 - (1 - e) * (1 - e)));
      m.position.set(this._judgeX, 20 + i * 3, this._judgeZ);
      m.scale.set(r, r, 1);
      m.material.opacity = Math.sin(Math.min(1, e) * Math.PI) * (i === 0 ? 0.85 : 0.5);
      m.visible = e < 1;
    }
  }

  _buildLightningShard() {
    this.shardReady = false;
    this.shardPivot = null;
    this.shardOrbit = Math.random() * Math.PI * 2;
    this._shX = 0; this._shY = 58; this._shZ = 0;
    this._shVX = 0; this._shVY = 0; this._shVZ = 0;
    this._shInit = false;
    this._shYaw = 0;
    this._lastSimsekFire = 0;
    this._shCharge = 0;
    this._buildShardAura();
    const loader = new GLTFLoader();
    loader.setDRACOLoader(this._getDraco());
    loader.loadAsync('assets/simsek/yildirim_parca.glb').then((gltf) => {
      const shard = gltf.scene;
      budgetTextures(shard, Math.min(1024, Quality.budget('texHero')));
      shard.traverse((o) => {
        if (o.isMesh) {
          o.frustumCulled = false; o.castShadow = false;
          if (o.material) {
            o.material.side = THREE.FrontSide;
            o.material.metalness = 0.2;
            o.material.roughness = 0.35;
            if (o.material.emissive) { o.material.emissive.setHex(0x2a4a6e); o.material.emissiveIntensity = 1.2; }
          }
        }
      });
      const b0 = new THREE.Box3().setFromObject(shard);
      const sz0 = new THREE.Vector3(); b0.getSize(sz0);
      const scale = 34 / Math.max(sz0.x, sz0.y, sz0.z, 0.001);
      shard.scale.setScalar(scale);
      const b1 = new THREE.Box3().setFromObject(shard);
      const c = new THREE.Vector3(); b1.getCenter(c);
      shard.position.sub(c);

      const spinner = new THREE.Group();
      spinner.add(shard);
      this.shardSpinner = spinner;

      const inner = new THREE.Group();
      inner.add(spinner);
      const pivot = new THREE.Group();
      pivot.add(inner);
      pivot.visible = false;
      this.scene.add(pivot);
      this.shardPivot = pivot;
      this.shardInner = inner;
      this.shardReady = true;
    }).catch((err) => console.warn('Şimşek Kırığı modeli yüklenemedi.', err));
  }

  /** ŞİMŞEK KIRIĞININ ELEKTRİĞİ — modelden bağımsız, SAHNE düzeyinde
      (kırık kendi ekseninde döndüğü için kameraya bakan quad'lar onun
      altında yaşayamaz — dönüşle birlikte eğrilirdi).

      İKİ PARÇA, İKİ ÇİZİM ÇAĞRISI (yalnız ŞİMŞEK sahnedeyken):
        glow — 4 örnek: dar çekirdek, orta gövde, geniş hale, boşalma
               flaşı. Üç boyutun toplamı = sahte bloom (post-proc yasak).
        arcs — 6 yuva: kırığın çevresinde beliren kısa çentikli kavisler.
               Zaten var olan _boltZigzagTexture'ı kullanır (zincir kavisleri
               de ondan çizilir) — yeni doku = yeni yükleme. */
  _buildShardAura() {
    const mkInst = (map, max, order) => {
      const mesh = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1),
        new THREE.MeshBasicMaterial({
          map, transparent: true, blending: THREE.AdditiveBlending,
          depthWrite: false, toneMapped: false, side: THREE.DoubleSide,
        }), max);
      mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(max * 3), 3);
      mesh.count = 0;
      mesh.frustumCulled = false;
      mesh.renderOrder = order;
      mesh.visible = false;
      this.scene.add(mesh);
      return mesh;
    };
    this.shardGlow = mkInst(this._glowTexture(), 4, 3);
    this.shardArcs = mkInst(this._boltZigzagTexture(2), 6, 4);
    /* Gerçek yıldırım SÜREKLİ değildir: kanal 30-60 ms yaşar, söner, başka
       yerde yeniden doğar. Bu yüzden her yuvanın kendi ömür sayacı ve ÖLÜ
       ZAMANI var — sinüsle titretilen sabit bir kavis "neon tüp" okunuyor. */
    this._shArcs = [];
    for (let i = 0; i < 6; i++) {
      this._shArcs.push({ t: -1, max: 0.08, ang: 0, rad: 14, len: 34, tilt: 0 });
    }
    this._shBlink = 1; this._shBlinkT = 0;

    const spill = new THREE.Mesh(new THREE.PlaneGeometry(150, 150),
      new THREE.MeshBasicMaterial({
        map: this._glowTexture(), color: 0x4aa6ff, transparent: true, opacity: 0,
        blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false,
      }));
    spill.rotation.x = -Math.PI / 2;
    spill.position.y = 1.6;
    spill.frustumCulled = false;
    spill.visible = false;
    this.scene.add(spill);
    this.shardSpill = spill;
  }

  _updateLightningShard(game, dt) {
    if (!this.shardReady || !this.shardPivot) return;
    const W = game.weapons;
    const modelDef = CHARACTER_MODELS[this._currentCharId];
    const show = !!(modelDef && modelDef.floatingWeapon === 'simsek' && W && W.lvl && W.lvl('simsek') > 0);
    this.shardPivot.visible = show;
    if (!show) {
      if (this.shardGlow) this.shardGlow.visible = false;
      if (this.shardArcs) this.shardArcs.visible = false;
      if (this.shardSpill) this.shardSpill.visible = false;
      return;
    }
    const p = game.player;
    this.shardOrbit += dt;
    const o = this.shardOrbit;

    /* süzülme: kılıçla AYNI yay-sönüm takip (bkz. _updateSword) — kütle
       hissi, ışınlanma yok. Karakterin sağında sabit süzülür. */
    const ax = p.x + 48;
    const az = p.y + 20;
    const ay = 60 + Math.sin(o * 1.3) * 8;
    if (!this._shInit) { this._shInit = true; this._shX = ax; this._shZ = az; this._shY = ay; }
    const sdt = dt > 0.05 ? 0.05 : dt;
    const K = 50, D = 10;
    this._shVX += ((ax - this._shX) * K - this._shVX * D) * sdt;
    this._shVZ += ((az - this._shZ) * K - this._shVZ * D) * sdt;
    this._shVY += ((ay - this._shY) * K - this._shVY * D) * sdt;
    this._shX += this._shVX * sdt; this._shZ += this._shVZ * sdt; this._shY += this._shVY * sdt;

    this.shardPivot.position.set(this._shX, this._shY, this._shZ);
    /* yayın/kılıcın aksine hedefe nişan almaz — kendi ekseninde döner,
       zincirleme atış yönünü ARK efekti (_updateLightningArcs) taşır. */
    this._shYaw += dt * 1.4;
    this.shardInner.rotation.y = this._shYaw;
    this.shardSpinner.rotation.z = Math.sin(o * 2.1) * 0.18;

    /* dünya konumunu weapons.js'e bildir (zincirin ilk sıçrama noktası) */
    W.simsekPos.x = this._shX; W.simsekPos.y = this._shZ;

    /* ateş algıla → boşalma: kavisler UZUN ve parlak doğar */
    const fc = W.simsekFireCount || 0;
    let burst = false;
    if (fc !== this._lastSimsekFire) { this._lastSimsekFire = fc; this._shCharge = 1; burst = true; }
    if (this._shCharge > 0) this._shCharge = Math.max(0, this._shCharge - dt * 3.2);
    const ch = this._shCharge;

    /* ELEKTRİK TITREŞIĞİ: sinüs değil BASAMAKLI rastgele — elektrik düzgün
       nefes almaz, kesik kesik çarpar. 40-90 ms'de bir yeni değer. */
    this._shBlinkT -= dt;
    if (this._shBlinkT <= 0) {
      this._shBlinkT = 0.04 + Math.random() * 0.05;
      this._shBlink = 0.66 + Math.random() * 0.52;
    }
    const bl = this._shBlink;

    /* ── SAHTE BLOOM: üç boyutta parıltı + boşalma flaşı ── */
    const gm = this.shardGlow;
    if (gm) {
      gm.visible = true;
      const cy = this._shY;
      this._bb(gm, 0, this._shX, cy, this._shZ, 27, 27, 0,
        (0.40 + ch * 0.38) * bl, (0.62 + ch * 0.22) * bl, 0.86 * bl);
      this._bb(gm, 1, this._shX, cy, this._shZ, 62, 62, 0,
        (0.10 + ch * 0.18) * bl, (0.30 + ch * 0.18) * bl, 0.70 * bl);
      this._bb(gm, 2, this._shX, cy, this._shZ, 124, 124, 0,
        0.04 * bl, 0.13 * bl, 0.34 * bl);
      const mf = ch * ch;
      this._bb(gm, 3, this._shX, cy, this._shZ, 48 + ch * 66, 48 + ch * 66, 0,
        mf * 0.55, mf * 0.72, mf * 0.90);
      commitInstanced(gm, 4, true);
    }

    /* ── ÇATIRTI: kırığın çevresinde doğup sönen kısa kavisler ── */
    const am = this.shardArcs;
    if (am) {
      const arcs = this._shArcs;
      const cap = Quality.stress > 0.6 ? 3 : arcs.length;
      let ac = 0;
      for (let i = 0; i < cap; i++) {
        const s = arcs[i];
        s.t -= dt;
        if (burst) {
          /* boşalma: hepsi aynı anda, biraz daha uzun ve parlak */
          s.ang = Math.random() * 6.2831;
          s.len = 30 + Math.random() * 26;
          s.rad = 12 + Math.random() * 20;
          s.tilt = s.ang + (Math.random() < 0.5 ? 1.5708 : 0) + (Math.random() - 0.5) * 1.0;
          s.max = 0.09 + Math.random() * 0.06;
          s.t = s.max;
        } else if (s.t <= -0.02) {
          s.ang = Math.random() * 6.2831;
          s.len = 15 + Math.random() * 22;
          s.rad = 9 + Math.random() * 17;
          s.tilt = s.ang + (Math.random() < 0.5 ? 1.5708 : 0) + (Math.random() - 0.5) * 1.0;
          s.max = 0.05 + Math.random() * 0.08;
          /* ölü zaman: kanal söndükten sonra bir süre hiçbir şey yok */
          s.t = s.max + Math.random() * 0.14;
        }
        if (s.t <= 0 || s.t > s.max) continue;
        const k = s.t / s.max;
        /* kavis MERKEZİ dışa ötelenir: hepsi çekirdekten çıkarsa şekil "yıldız
           ikonu" gibi simetrik okunuyor. Çatırtı gövdeye YAKIN, dağınık ve
           asimetrik olmalı. */
        this._bb(am, ac++,
          this._shX + Math.cos(s.ang) * s.rad,
          this._shY + Math.sin(s.ang) * s.rad * 0.9,
          this._shZ,
          s.len, s.len * 0.34, s.tilt,
          k * 0.48, k * 0.68, k * 0.86);
      }
      commitInstanced(am, ac, true);
      am.visible = ac > 0;
    }

    /* Kıvılcım: yalnız boşalma anında, adet BÜTÇEDEN (CLAUDE.md kural 4) */
    if (burst) {
      const n = Math.min(7, Math.max(2, Quality.budget('particles') >> 6));
      for (let i = 0; i < n; i++) {
        const a = Math.random() * 6.2831;
        const sp = 70 + Math.random() * 120;
        game.pools.particles.obtain(this._shX, this._shZ, Math.cos(a) * sp, Math.sin(a) * sp * 0.7,
          0.26, 2.2, i % 3 === 0 ? '#ffffff' : '#9fdcff', 0.94, -30, true);
      }
    }

    /* zeminde ışık lekesi — gerçek ışık yasak */
    const sl = this.shardSpill;
    if (sl) {
      sl.visible = true;
      sl.position.set(this._shX, 1.6, this._shZ);
      sl.material.opacity = 0.07 + bl * 0.05 + ch * 0.14;
    }
  }

  /* ═══════════ ZİNCİRLEME YILDIRIM KAVİSİ (Şimşek'in vuruş göstergesi) ═══════════
     Kaynak → hedef → hedef… arasında beliren, hızla sönen çentikli ışık
     şeridi. Gerçek 3B tüp geometrisi yerine (pahalı, kare başına yeniden
     kurulmalı) ÖNCEDEN ÇİZİLMİŞ çentikli doku + tek düzlem: sıcak yolda
     sıfır tahsis, sabit 10 yuvalı havuz (tek draw call'luk mesh başına). */
  _boltZigzagTexture(seed) {
    this._boltTexCache = this._boltTexCache || {};
    if (this._boltTexCache[seed]) return this._boltTexCache[seed];
    const Wc = 256, Hc = 64;
    const cv = document.createElement('canvas');
    cv.width = Wc; cv.height = Hc;
    const g = cv.getContext('2d');
    let r = seed * 374761393 + 12345;
    const rnd = () => { r = (r * 1103515245 + 12345) & 0x7fffffff; return (r % 1000) / 1000; };
    const N = 8;
    const pts = [];
    for (let i = 0; i <= N; i++) {
      const x = (i / N) * Wc;
      const y = (i === 0 || i === N) ? Hc / 2 : Hc / 2 + (rnd() - 0.5) * Hc * 0.7;
      pts.push([x, y]);
    }
    const drawPath = () => { g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); };
    g.lineJoin = 'round'; g.lineCap = 'round';
    g.strokeStyle = 'rgba(130,200,255,0.5)'; g.lineWidth = 16; drawPath(); g.stroke();
    g.strokeStyle = 'rgba(190,230,255,0.8)'; g.lineWidth = 7; drawPath(); g.stroke();
    g.strokeStyle = '#ffffff'; g.lineWidth = 2.4; drawPath(); g.stroke();
    for (let i = 1; i < N; i += 2) {
      const [x, y] = pts[i];
      const bx = x + (rnd() - 0.5) * 26, by = y + (rnd() > 0.5 ? 1 : -1) * (12 + rnd() * 14);
      g.strokeStyle = 'rgba(200,230,255,0.55)'; g.lineWidth = 1.6;
      g.beginPath(); g.moveTo(x, y); g.lineTo(bx, by); g.stroke();
    }
    const t = new THREE.CanvasTexture(cv);
    t.needsUpdate = true;
    this._boltTexCache[seed] = t;
    return t;
  }

  _buildLightningArcs() {
    const texs = [this._boltZigzagTexture(1), this._boltZigzagTexture(2), this._boltZigzagTexture(3)];
    this._boltArcTexs = texs;
    this.boltArcs = [];
    for (let i = 0; i < 10; i++) {
      const mat = new THREE.MeshBasicMaterial({
        map: texs[i % 3], color: 0xcfeaff, transparent: true, opacity: 0,
        blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, side: THREE.DoubleSide,
      });
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat);
      mesh.visible = false; mesh.frustumCulled = false; mesh.renderOrder = 5;
      this.scene.add(mesh);
      this.boltArcs.push({ mesh, life: 0, max: 0.22, x1: 0, y1: 0, x2: 0, y2: 0 });
    }
    this._boltArcNext = 0;

    /* FIRTINA ÇAĞRISI: gökten inen devasa tekil şok — iki kalın çapraz
       sütun + zeminde genişleyen çift halka (kendi havuzu, jenerik
       patlamayla karışmasın diye ayrı tutulur). */
    this.stormBolt = new THREE.Group();
    const stormMat = new THREE.MeshBasicMaterial({
      color: 0xdff3ff, transparent: true, opacity: 0, side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false,
    });
    const sp1 = new THREE.Mesh(new THREE.PlaneGeometry(20, 340), stormMat);
    const sp2 = new THREE.Mesh(new THREE.PlaneGeometry(20, 340), stormMat.clone());
    sp2.rotation.y = Math.PI / 2;
    sp1.position.y = sp2.position.y = 150;
    this.stormBolt.add(sp1, sp2);
    this.stormBolt.visible = false;
    this.scene.add(this.stormBolt);
    this._stormMeshes = [sp1, sp2];
    const shockTex = this._shockTexture();
    this.stormRings = [];
    for (let i = 0; i < 2; i++) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({
        map: shockTex, color: i === 0 ? 0xdfeeff : 0x9fd0ff, transparent: true, opacity: 0,
        blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, side: THREE.DoubleSide,
      }));
      m.rotation.x = -Math.PI / 2;
      m.frustumCulled = false; m.visible = false;
      this.scene.add(m);
      this.stormRings.push(m);
    }
    this._stormT = 1;
  }

  /** Kaynak → hedef zincir sıçraması (weapons.fireChain her vuruşta çağırır). */
  spawnLightningArc(x1, y1, x2, y2) {
    if (!this.boltArcs) return;
    const slot = this.boltArcs[this._boltArcNext];
    this._boltArcNext = (this._boltArcNext + 1) % this.boltArcs.length;
    slot.x1 = x1; slot.y1 = y1; slot.x2 = x2; slot.y2 = y2; slot.life = slot.max;
    slot.mesh.material.map = this._boltArcTexs[(Math.random() * this._boltArcTexs.length) | 0];
  }

  /** Fırtına Çağrısı imza yeteneği: hedef noktaya devasa tekil vuruş. */
  spawnStormStrike(x, y) {
    if (!this.stormBolt) return;
    this._stormX = x; this._stormY = y; this._stormT = 0;
  }

  _updateLightningArcs(dt) {
    if (this.boltArcs) {
      for (let i = 0; i < this.boltArcs.length; i++) {
        const a = this.boltArcs[i];
        if (a.life <= 0) { if (a.mesh.visible) a.mesh.visible = false; continue; }
        a.life -= dt;
        const k = Math.max(0, a.life / a.max);
        const dx = a.x2 - a.x1, dy = a.y2 - a.y1;
        const dist = Math.max(1, Math.hypot(dx, dy));
        a.mesh.position.set((a.x1 + a.x2) / 2, 40 + Math.sin(k * 30) * 3, (a.y1 + a.y2) / 2);
        a.mesh.rotation.set(0, Math.atan2(-dy, dx), 0);
        a.mesh.scale.set(dist, 26, 1);
        a.mesh.material.opacity = Math.min(1, k * 4) * 0.95;
        a.mesh.visible = true;
      }
    }
    if (this.stormBolt) {
      if (this._stormT < 1) {
        this._stormT = Math.min(1, this._stormT + dt / 0.4);
        const t = this._stormT;
        const flick = t < 0.5 ? 1 : (0.4 + Math.sin(t * 60) * 0.3);
        this.stormBolt.position.set(this._stormX, 0, this._stormY);
        for (const m of this._stormMeshes) m.material.opacity = (1 - t) * 0.9 * Math.max(0, flick);
        this.stormBolt.visible = true;
        for (let i = 0; i < this.stormRings.length; i++) {
          const m = this.stormRings[i];
          const sp = i === 0 ? 1 : 1.5;
          const e = Math.min(1, t * sp);
          const rr = 140 * (0.2 + 1.1 * (1 - (1 - e) * (1 - e)));
          m.position.set(this._stormX, 22 + i * 3, this._stormY);
          m.scale.set(rr, rr, 1);
          m.material.opacity = Math.sin(Math.min(1, e) * Math.PI) * (i === 0 ? 0.85 : 0.5);
          m.visible = e < 1;
        }
      } else if (this.stormBolt.visible) {
        this.stormBolt.visible = false;
        for (const m of this.stormRings) m.visible = false;
      }
    }
  }

  /* YOLDAŞ (PET) sistemi 2026-08-18'de komple söküldü — rig, ejder modeli,
     alev jeti, gölge quad'ı ve güncelleme yolu dahil. */

  _buildGemPool() {
    const MAX = 380;
    /* ═══ RUH ALEVİ (XP) ═══
       Silueti bilinçli olarak "vuruş efekti"nden ayrışır: vuruşlar anı parlayan
       yuvarlak flaşlar; ruh ise uzun kuyruklu, dikey, sivri bir alev fitili +
       zeminde duran ince bir mührür halka. Üç parça da instanced (3 draw call). */
    const soulProfile = [
      new THREE.Vector2(0.00, 0.00),
      new THREE.Vector2(0.24, 0.02),
      new THREE.Vector2(0.44, 0.13),
      new THREE.Vector2(0.52, 0.33),
      new THREE.Vector2(0.45, 0.55),
      new THREE.Vector2(0.31, 0.75),
      new THREE.Vector2(0.21, 0.97),
      new THREE.Vector2(0.13, 1.22),
      new THREE.Vector2(0.06, 1.48),
      new THREE.Vector2(0.00, 1.78),
    ];
    const geo = new THREE.LatheGeometry(soulProfile, 14);
    geo.translate(0, -0.42, 0);
    /* Kendinden ışıyan kızıl: MeshStandardMaterial'ın beyaz emissive'i
       instanceColor ile çarpılmadığı için ruhlar bembeyaz görünüyordu —
       ışıksız (Basic) malzeme: gerçek renk + daha az GPU yükü. */
    const mat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9, depthWrite: true });
    this.gemMesh = new THREE.InstancedMesh(geo, mat, MAX);
    this.gemMesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(MAX * 3), 3);
    this.gemMesh.count = 0;
    this.gemMesh.frustumCulled = false;
    this.scene.add(this.gemMesh);
    this._gemMax = MAX;

    /* iç çekirdek: gövdenin içinde daha parlak, daha ince ikinci alev →
       ruh "içi dolu" görünür, dümdüz tek renk bir blob gibi durmaz */
    const coreGeo = new THREE.LatheGeometry(soulProfile, 10);
    coreGeo.translate(0, -0.42, 0);
    coreGeo.scale(0.46, 0.72, 0.46);
    const coreMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.75, blending: THREE.AdditiveBlending, depthWrite: false });
    this.gemCoreMesh = new THREE.InstancedMesh(coreGeo, coreMat, MAX);
    this.gemCoreMesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(MAX * 3), 3);
    this.gemCoreMesh.count = 0;
    this.gemCoreMesh.frustumCulled = false;
    this.scene.add(this.gemCoreMesh);

    /* zeminde yatan ince mührür halka: "burada duran bir eşya" hissi verir,
       uçup geçen vuruş kıvılcımlarıyla asla karışmaz */
    const ringGeo = new THREE.TorusGeometry(0.92, 0.055, 5, 18);
    ringGeo.rotateX(-Math.PI / 2);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.45, blending: THREE.AdditiveBlending, depthWrite: false });
    this.gemRingMesh = new THREE.InstancedMesh(ringGeo, ringMat, MAX);
    this.gemRingMesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(MAX * 3), 3);
    this.gemRingMesh.count = 0;
    this.gemRingMesh.frustumCulled = false;
    this.scene.add(this.gemRingMesh);

    /* yumuşak hale dokusu (sert kenarlı kare olmasin diye radial gradient) */
    const glowCanvas = document.createElement('canvas');
    glowCanvas.width = glowCanvas.height = 128;
    const gctx = glowCanvas.getContext('2d');
    const grad = gctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    grad.addColorStop(0, 'rgba(255,255,255,0.95)');
    grad.addColorStop(0.22, 'rgba(255,255,255,0.42)');
    grad.addColorStop(0.55, 'rgba(255,255,255,0.13)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    gctx.fillStyle = grad;
    gctx.fillRect(0, 0, 128, 128);
    const glowTex = new THREE.CanvasTexture(glowCanvas);
    this._softGlowTex = glowTex;

    const glowGeo = new THREE.PlaneGeometry(1, 1);
    const glowMat = new THREE.MeshBasicMaterial({ map: glowTex, color: 0xffffff, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
    this.gemGlowMesh = new THREE.InstancedMesh(glowGeo, glowMat, MAX);
    this.gemGlowMesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(MAX * 3), 3);
    this.gemGlowMesh.count = 0;
    this.gemGlowMesh.frustumCulled = false;
    this.scene.add(this.gemGlowMesh);

    this._buildHeartPool();
  }

  _buildHeartPool() {
    const MAX = 40;
    /* ═══ KAN KALBİ (can toplamağı) ═══
       Ruh alevlerinden ve vuruş flaşlarından tamamen ayrı okunur: katı,
       hacimli, parlak pembe-kırmızı bir kalp; kalp atışı ritminde nabız. */
    const sh = new THREE.Shape();
    sh.moveTo(0, -1.0);
    sh.bezierCurveTo(-1.32, 0.12, -0.86, 1.18, 0, 0.5);
    sh.bezierCurveTo(0.86, 1.18, 1.32, 0.12, 0, -1.0);
    const geo = new THREE.ExtrudeGeometry(sh, {
      depth: 0.5, bevelEnabled: true, bevelThickness: 0.16, bevelSize: 0.16,
      bevelSegments: 2, curveSegments: 10,
    });
    geo.center();
    const mat = new THREE.MeshStandardMaterial({
      color: 0xff3346, emissive: 0x9c0d1c, emissiveIntensity: 0.9,
      roughness: 0.3, metalness: 0.1,
    });
    this.heartMesh = new THREE.InstancedMesh(geo, mat, MAX);
    this.heartMesh.count = 0;
    this.heartMesh.frustumCulled = false;
    this.scene.add(this.heartMesh);
    this._heartMax = MAX;

    const glowMat = new THREE.MeshBasicMaterial({
      map: this._softGlowTex, color: 0xff5f72, transparent: true, opacity: 0.55,
      blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
    });
    this.heartGlowMesh = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), glowMat, MAX);
    this.heartGlowMesh.count = 0;
    this.heartGlowMesh.frustumCulled = false;
    this.scene.add(this.heartGlowMesh);
  }

  _updateHearts(game) {
    if (!this.heartMesh) return;
    const m = this._hTmpM || (this._hTmpM = new THREE.Matrix4());
    const q = this._hTmpQ || (this._hTmpQ = new THREE.Quaternion());
    const qt = this._hTmpQT || (this._hTmpQT = new THREE.Quaternion());
    const eul = this._hTmpE || (this._hTmpE = new THREE.Euler());
    const s = this._hTmpS || (this._hTmpS = new THREE.Vector3());
    const pos = this._hTmpP || (this._hTmpP = new THREE.Vector3());
    const t = game.time;
    const camQuat = this.camera.quaternion;
    let idx = 0;
    const max = this._heartMax;
    game.pools.hearts.each((h) => {
      if (idx >= max) return;
      const ph = h.bob;
      const bob = Math.sin(ph + t * 2.4) * 2.2;
      const y = 17 + bob;
      /* KALP ATİŞI: kısa-kısa çift vuruş, arasında dinlenme (sinüsün 8. kuvveti
         bedava "thump" eğrisi verir) */
      const beatPhase = Math.sin(t * 3.1 + ph);
      const thump = Math.pow(Math.abs(beatPhase), 8) * (beatPhase > 0 ? 1 : 0.55);
      const sc = 7.0 * (1 + thump * 0.22);
      /* kameraya dönük ama hafifçe sallanan eğim → katı bir eşya gibi durur */
      eul.set(0, 0, Math.sin(t * 1.6 + ph) * 0.16);
      qt.setFromEuler(eul);
      q.copy(camQuat).multiply(qt);
      pos.set(h.x, y, h.y);
      m.compose(pos, q, s.set(sc, sc, sc * 0.8));
      this.heartMesh.setMatrixAt(idx, m);
      /* sönen kalp: son 4 saniyede halesi hızlı nefes alır (uyarı) */
      const fade = h.life < 4 ? 0.55 + Math.sin(t * 14) * 0.35 : 1;
      const halo = sc * (2.5 + thump * 0.5) * fade;
      m.compose(pos, camQuat, s.set(halo, halo, halo));
      this.heartGlowMesh.setMatrixAt(idx, m);
      idx++;
    });
    commitInstanced(this.heartMesh, idx, false);
    commitInstanced(this.heartGlowMesh, idx, false);
  }

  _buildParticles() {
    /* tampon en yüksek kademeye göre AYRILIR (kalite yükselirse yeniden
       tahsis gerekmesin); kare başına çizilen adet Quality.budget() ile
       canlı belirlenir. */
    const cap = MAX_PARTICLES;
    this._particleCap = cap;
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(cap * 3);
    const col = new Float32Array(cap * 3);
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    geo.setDrawRange(0, 0);
    const mat = new THREE.PointsMaterial({ size: 4, vertexColors: true, transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true });
    this.particlePoints = new THREE.Points(geo, mat);
    /* Points geometrisinin bounding sphere'ı başlangıç (0,0,0) verisinden
       hesaplanır ve güncellenmez — kamera uzaklaşınca tüm parçacıklar
       kaybolmasın diye culling kapalı. */
    this.particlePoints.frustumCulled = false;
    this.scene.add(this.particlePoints);
  }

  _buildZoneRingBoltBombPools() {
    /* kor çemberi alanları */
    this.zoneMeshes = [];
    for (let i = 0; i < 4; i++) {
      const m = new THREE.Mesh(new THREE.CircleGeometry(1, 24), new THREE.MeshBasicMaterial({ color: 0xff5a3c, transparent: true, opacity: 0.3, blending: THREE.AdditiveBlending, depthWrite: false }));
      m.rotation.x = -Math.PI / 2;
      m.visible = false;
      this.scene.add(m);
      this.zoneMeshes.push(m);
    }
    /* patlama halkaları */
    this.ringMeshes = [];    for (let i = 0; i < 24; i++) {
      const m = new THREE.Mesh(new THREE.RingGeometry(0.9, 1, 28), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.7, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false }));
      m.rotation.x = -Math.PI / 2;
      m.visible = false;
      this.scene.add(m);
      this.ringMeshes.push(m);
    }
    /* ═══ TEHLİKE ALANLARI — DÜŞMANIN YER HASARI (2026-08-29) ═══
       Kralın ölüm nabzı ve ejderin zehir/zıplama alanları aynı sekiz mesh'i
       paylaşır. Sekiz: ejderin üç bombası + zıplama alanı + iki kral nabzı +
       pay. Alan yokken hepsi visible=false, yani ÇİZİM ÇAĞRISI YOK.

       TEK MESH, İKİ İŞ: dolgu diski hem "burası" hem "ne kadar kaldı"
       söyler — telegraf süresince opaklık artar. İkinci bir kenar halkası
       eklemek çizim çağrısını ikiye katlardı; patlama anının kenarı zaten
       mevcut `rings` havuzundan basılıyor (main.updateHazards). */
    this.hazardMeshes = [];
    this.hazardFills = [];
    /* v56 B5 · TEHLİKE BİÇİM DİLİ: renk tek başına yetmez (renk körlüğü + 60 düşmanlık kalabalık).
       Patlama telegrafı SEKİZGEN halka + sekizgen dolgu, yavaş döner; zehir gölü YUVARLAK kalır;
       düşman mermisi zaten yuvarlak küre. Geometri paylaşılır, karede yalnız referans değişir. */
    this._hzGeo = { ringR: new THREE.RingGeometry(0.84, 1, 34), fillR: new THREE.CircleGeometry(1, 30),
      ringO: new THREE.RingGeometry(0.8, 1, 8, 1, Math.PI / 8), fillO: new THREE.CircleGeometry(1, 8, Math.PI / 8) };
    for (let i = 0; i < HAZARD_CAP; i++) {
      /* KENAR HALKASI — tehlikenin S I N I R I. İlk sürüm dolgu diskiydi ve
         ekranda "kırmızı halı" gibi duruyordu: 264 px'lik opak katkısal bir
         daire zemini yakıyor, üzerindeki düşman siluetini de yutuyordu.
         Nişan halkası hem premium okunur hem overdraw'ı ~%20'ye düşürür. */
      const m = new THREE.Mesh(this._hzGeo.ringR,
        new THREE.MeshBasicMaterial({
          color: 0xff4a5e, transparent: true, opacity: 0.5, side: THREE.DoubleSide,
          blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false,
        }));
      m.rotation.x = -Math.PI / 2;
      m.position.y = 1.4;
      m.visible = false; m.renderOrder = 4;
      this.scene.add(m);
      this.hazardMeshes.push(m);
      /* DOLU İÇ — "ne kadar kaldı" sorusunun cevabı: telegraf boyunca
         merkezden kenara DOLAR. Opaklığı kasten çok düşük (0,18): bilgi
         halkada, bu yalnız zamanlama. */
      const f = new THREE.Mesh(this._hzGeo.fillR,
        new THREE.MeshBasicMaterial({
          color: 0xff4a5e, transparent: true, opacity: 0.18,
          blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false,
        }));
      f.rotation.x = -Math.PI / 2;
      f.position.y = 1.2;
      f.visible = false; f.renderOrder = 3;
      this.scene.add(f);
      this.hazardFills.push(f);
    }
    /* Kural 5: bu materyaller alan İLK ÇIKTIĞINDA derlenirdi — yani tam kralın
       ilk nabzında ya da boss zıplamasında tek karelik donma. Isıtılır. */
    Warmup.add('tehlike alanı shaderı', () => {
      const m = this.hazardMeshes[0], f = this.hazardFills[0];
      m.visible = true; m.scale.setScalar(40);
      f.visible = true; f.scale.setScalar(30);
      this.renderer.render(this.scene, this.camera);
      m.visible = false; f.visible = false;
    });
    /* yıldırım sütunları: çapraz iki ince ışıklı düzlem — geniş gövdeli
       silindirin fasetlenmiş/kafes görünümü yerine her açıdan net bir çizgi */
    this.boltMeshes = [];
    const boltGeo = new THREE.PlaneGeometry(7, 210);
    for (let i = 0; i < 8; i++) {
      const g = new THREE.Group();
      const mat = new THREE.MeshBasicMaterial({ color: 0x9fd8ff, transparent: true, opacity: 0.6, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false });
      const p1 = new THREE.Mesh(boltGeo, mat);
      const p2 = new THREE.Mesh(boltGeo, mat.clone());
      p2.rotation.y = Math.PI / 2;
      p1.position.y = p2.position.y = 105;
      g.add(p1, p2);
      g.visible = false;
      this.scene.add(g);
      this.boltMeshes.push(g);
    }
    /* kor havanı fıçıları */
    this.bombMeshes = [];
    for (let i = 0; i < 16; i++) {
      const m = new THREE.Mesh(new THREE.CylinderGeometry(6, 6, 16, 8), new THREE.MeshStandardMaterial({ color: 0x3a2a1c, roughness: 0.7 }));
      m.visible = false;
      this.scene.add(m);
      this.bombMeshes.push(m);
    }
  }

  _buildOrbitBlades() {
    this.bladeMeshes = [];
    for (let i = 0; i < 6; i++) {
      const m = new THREE.Mesh(new THREE.ConeGeometry(5, 16, 4), new THREE.MeshStandardMaterial({ color: 0xaeb8d8, emissive: 0x59e3c8, emissiveIntensity: 0.4, roughness: 0.3 }));
      m.visible = false;
      this.scene.add(m);
      this.bladeMeshes.push(m);
    }
  }

  _buildSwordArc() {
    const mat = new THREE.MeshBasicMaterial({ color: 0xfffdf5, transparent: true, opacity: 0.55, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false });
    this.swordArc = new THREE.Mesh(new THREE.RingGeometry(1, 1.01, 2), mat);
    this.swordArc.rotation.x = -Math.PI / 2;
    this.swordArc.visible = false;
    this.scene.add(this.swordArc);
  }

  /** Oyuncu + tüm düşmanlar (elit/boss dahil) için tek instanced billboard can
      barı sistemi — her zaman kameraya dönük, karının üzerinde yüzüyor. */
  _buildHpBars() {
    const geo = new THREE.PlaneGeometry(1, 1);
    geo.translate(0.5, 0, 0);   // pivot sol kenarda — dolum sağdan sola azalır
    const MAX = this._enemyMax + 2;
    this._hpMax = MAX;

    const bgMat = new THREE.MeshBasicMaterial({ color: 0x0a0c12, transparent: true, opacity: 0.72, depthTest: false, depthWrite: false });
    this.hpBgMesh = new THREE.InstancedMesh(geo, bgMat, MAX);
    this.hpBgMesh.count = 0;
    this.hpBgMesh.frustumCulled = false;
    this.hpBgMesh.renderOrder = 998;
    this.scene.add(this.hpBgMesh);

    const fillMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.95, depthTest: false, depthWrite: false });
    this.hpFillMesh = new THREE.InstancedMesh(geo, fillMat, MAX);
    this.hpFillMesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(MAX * 3), 3);
    this.hpFillMesh.count = 0;
    this.hpFillMesh.frustumCulled = false;
    this.hpFillMesh.renderOrder = 999;
    this.scene.add(this.hpFillMesh);
  }

  /* ═══════════ BOYUTLANDIRMA ═══════════ */

  resize() {
    const g = this.game;
    const w = Math.max(1, g.w || window.innerWidth);
    const h = Math.max(1, g.h || window.innerHeight);
    /* düşük FPS'te oyunun kendi dinamik çözünürlük sistemi (g.renderScale)
       2D katmanı zaten küçültüyordu ama WebGL katmanını hiç etkilemiyordu —
       asıl ağır iş burada olduğu için performans güvencesi etkisizdi.
       Artık ikisi birlikte ölçekleniyor. */
    /* Tek doğruluk kaynağı: Quality. 2D katman ve WebGL katmanı aynı
       ölçeği kullanır — eskiden ikisi ayrı hesaplanıyordu. */
    /* v73b: aynı boyut + aynı DPR → yeniden ayırma YOK. Quality stres adımında onChange + döngü aynı
       karede iki kez resize çağırıyordu; setSize tuvali yeniden boyutlandırır = takılma. */
    const pr = Quality.dpr();
    this._needsFrame = true;   // v73: donuk kaplamada bile bir kare çizilsin (main.render)
    if (pr === this._rsPr && w === this._rsW && h === this._rsH) return;
    this._rsPr = pr; this._rsW = w; this._rsH = h;
    this.renderer.setPixelRatio(pr);
    this.renderer.setSize(w, h, true);

    const ZOOM = 1.05;   // geniş, okunaklı savaş alanı — yaklaşan düşmanları erken gör
    /* dikey yarı görüş (bakılan nokta düzleminde, kameraya dik) — eski
       ortografik halfH ile birebir aynı hedef değer. */
    const halfHPerp = h / 2 / ZOOM;
    const halfH = halfHPerp / Math.cos(TILT);    // zemin düzlemine (eğime bağlı) izdüşüm
    const halfW = (w / 2) / ZOOM;

    this.camera.aspect = w / h;
    this.camera.fov = CAM_FOV;
    this.camera.updateProjectionMatrix();
    /* kameradan hedefe mesafeyi, bakılan noktadaki dikey yarı görüş tam
       halfHPerp'e denk gelecek şekilde ayarla — böylece merkezde eski
       ortografik ölçek (1 dünya birimi ≈ 1 ekran pikseli) korunur; kenarlara
       doğru gerçek perspektif yakınsaması (CR'ın diorama hissi) devreye girer. */
    this.camDist = halfHPerp / Math.tan(THREE.MathUtils.degToRad(CAM_FOV) / 2);

    /* main.js hâlâ bu alanları klasik ortografik frustum gibi okuyor
       (spawn/culling sınırları) — perspektifte zemin düzlemi tam dikdörtgen
       değil (trapez) ama merkezdeki bu yaklaşık dikdörtgen + mevcut 140birim
       güvenlik payı yeterince kapsıyor. */
    this.camera.left = -halfW; this.camera.right = halfW;
    this.camera.top = halfH; this.camera.bottom = -halfH;
  }

  /* ═══════════ ANA RENDER ═══════════ */

  render(game) {
    if (this._lost) return;   // context kaybedildi — restore olayı yeni bir Renderer3D kuracak
    const now = performance.now();
    const dt = Math.min(0.1, (now - this._clock) / 1000);
    this._clock = now;

    if (game.player.charId && game.player.charId !== this._currentCharId) {
      this.loadCharacter(game.player.charId);
    }

    this._updateCamera(game);
    this._updateGround(game);
    this._updateProps(game);
    this._updateDecor(game);
    this._updateObjective(game);
    if (this.fieldChestView) this.fieldChestView.update(game);
    this._updateAtmosphere(game, dt);
    Perf.section('kahraman');
    this._updatePlayer(game, dt);
    this._updateBow(game, dt);
    this._updateSling(game, dt);
    this._updateSword(game, dt);
    this._updateLightningShard(game, dt);
    this._updateBlade(game, dt);
    this._updateFlame(game, dt);
    this._updateCannon(game, dt);
    this._updateJudgement(dt);
    this._updateLightningArcs(dt);
    Perf.section('düşman');
    this._updateEnemies(game, dt);
    Perf.section('efekt');
    this._updateProjectiles(game);
    this._updateFireHits(game, dt);
    this._updateImpacts(dt);
    this._updateGems(game);
    this._updateHearts(game);
    this._updateParticles(game);
    this._updateZones(game);
    this._updateHazards(game);
    this._updateRings(game);
    this._updateBolts(game);
    this._updateBombs(game);
    this._updateOrbitBlades(game);
    this._updateSwordArc(game);
    this._updateHpBars(game);
    Perf.section('gpu');
    this.renderer.render(this.scene, this.camera);
    Perf.endSection();
  }

  _updateCamera(game) {
    const cx = game.cam.x + game.shakeX;
    const cy = game.cam.y + game.shakeY;
    /* zoom vurgusu (main.punch) mesafeyi kısar; 2B katman aynı oranı kullanır */
    const dist = this.camDist * (1 - (game.zoomP || 0));
    const height = dist * Math.cos(TILT);
    const back = dist * Math.sin(TILT);
    this.camera.position.set(cx, height, cy + back);
    /* mikro yuvarlanma: yalnız büyük travmada (≤ 0,7°), küçük açı yaklaşımı */
    const rl = game.shakeR || 0;
    this.camera.up.set(rl, 1, 0);
    this.camera.lookAt(cx, 0, cy);
    this.moonLight.target.position.set(cx, 0, cy);
    this.moonLight.target.updateMatrixWorld();
    this.voidGround.position.x = cx;
    this.voidGround.position.z = cy;
  }

  _updateGround(game) {
    if (game.arena && game.arenaCanvas) {
      const A = game.arena;
      this.ground.visible = true;
      this.ground.scale.set(A.w, 1, A.h);
      this.ground.position.set(A.x0 + A.w / 2, 0, A.y0 + A.h / 2);
      /* DÖŞENEN DETAY: harita değiştiğinde bir kez kurulur. Tekrar sayısı
         arena kenarı / karo dünya boyu — yani doku dünyaya çivilidir,
         saha büyüyünce daha çok döşenir, ÖRNEK YOĞUNLUĞU DÜŞMEZ. */
      if (game.arenaDetail && this._lastDetailCanvas !== game.arenaDetail) {
        this._lastDetailCanvas = game.arenaDetail;
        const dt = new THREE.CanvasTexture(game.arenaDetail);
        if ('colorSpace' in dt) dt.colorSpace = THREE.SRGBColorSpace;
        dt.wrapS = dt.wrapT = THREE.RepeatWrapping;
        dt.generateMipmaps = true;
        dt.minFilter = THREE.LinearMipmapLinearFilter;
        dt.magFilter = THREE.LinearFilter;
        dt.anisotropy = Math.min(8, this.renderer.capabilities.getMaxAnisotropy());
        dt.needsUpdate = true;
        if (this._groundDetailTex) this._groundDetailTex.dispose();
        this._groundDetailTex = dt;
        if (this._groundShader) this._groundShader.uniforms.uDetail.value = dt;
      }
      if (this._groundShader) {
        this._groundShader.uniforms.uDetailRep.value = game.arenaTile ? A.w / game.arenaTile : 1;
        this._groundShader.uniforms.uDetailK.value = game.arenaDetail ? 0.9 : 0;
        this._groundShader.uniforms.uDetailMid.value = game.arenaDetailMid || 0.216;
        this._groundShader.uniforms.uDetailBreak.value = game.arenaDetail ? 0.34 : 0;
      }
      if (this._lastArenaCanvas !== game.arenaCanvas) {
        this._lastArenaCanvas = game.arenaCanvas;
        const tex = new THREE.CanvasTexture(game.arenaCanvas);
        if ('colorSpace' in tex) tex.colorSpace = THREE.SRGBColorSpace;
        /* MIPMAP AÇIK — ve doku 2'NİN KUVVETİ (2048², bkz. arenaMaps POT).

           Eskiden mipmap KAPALIydi: doku boyutu 2'nin kuvveti olmadığı için
           bazı sürýcülerde mip geçişleri eğri bir karartma sınırı gibi
           görünüyordu. Ama kapatmanın bedeli daha kötüydü: 2438² doku
           ekranda ~1000 px'e sığdığı için her piksel dokudan ~2,4 örnek
           atlar; kamera kıpırdadıkça hangi örneğin okunduğu değişir ve
           zemin TİTRER (kullanıcının teşhisi tam olarak buydu). Bu, minifikasyon
           aliasing'idir ve tek çözümü mipmap'tir.

           Doğru çözüm ikisini birden almak: dokuyu POT yap (arenaMaps res'i
           2048/full olarak hesaplar), sonra mipmap + anizotropiyi AÇ. POT'ta
           mip zinciri tam bölünür, yani eski eğri artifakt da oluşmaz.
           Anizotropi 44° eğik zeminde şart: izotropik mip uzak zemini
           gereğinden fazla bulanıklaştırır.

           VRAM: 2048² RGBA = 16,8 MB, mip zinciriyle ~22,4 MB (öncesi
           2438² mipsiz = 23,8 MB) — yani titreme düzelirken bellek de düştü. */
        tex.generateMipmaps = true;
        tex.minFilter = THREE.LinearMipmapLinearFilter;
        tex.magFilter = THREE.LinearFilter;
        tex.anisotropy = Math.min(8, this.renderer.capabilities.getMaxAnisotropy());
        tex.wrapS = THREE.ClampToEdgeWrapping;
        tex.wrapT = THREE.ClampToEdgeWrapping;
        tex.needsUpdate = true;
        if (this.groundMat.map) this.groundMat.map.dispose();
        this.groundMat.map = tex;
        this.groundMat.needsUpdate = true;
      }
    } else if (game.floorCanvas) {
      this.ground.visible = true;
      const TILE = 1024;
      this.ground.scale.set(3600, 1, 3600);
      /* KRİTİK: zemin düzlemi kamerayı KARO KATLARIYLA takip eder. Eskiden
         düzlem kameraya yapışıp doku ofsetiyle kaydırılıyordu — ofset işaretleri
         ters olduğu için desen oyuncuyla BİRLİKTE (ve ters yönde) akıyor,
         "ileri basınca geri gidiyorum" yanılsaması yaratıyordu. Karo katına
         yuvarlanan konum + sıfır ofset = desen dünyaya çivili, hareket doğru. */
      this.ground.position.set(
        Math.round(game.cam.x / TILE) * TILE, 0,
        Math.round(game.cam.y / TILE) * TILE);
      if (this._lastFloorCanvas !== game.floorCanvas) {
        this._lastFloorCanvas = game.floorCanvas;
        const tex = new THREE.CanvasTexture(game.floorCanvas);
        tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
        tex.repeat.set(3600 / TILE, 3600 / TILE);
        if ('colorSpace' in tex) tex.colorSpace = THREE.SRGBColorSpace;
        /* MIPMAP AÇIK — TILE 1024 zaten 2'nin kuvveti, yani mip zinciri temiz
           bölünür ve eski "eğri karartma" artifaktı burada hiç oluşamaz.
           Mipmap olmadan bu karo yol da titriyordu (arena dalıyla aynı
           minifikasyon aliasing'i) — tekrarlanan dokuda daha da belirgin,
           çünkü desen uzakta karo frekansına yaklaşır. */
        tex.generateMipmaps = true;
        tex.minFilter = THREE.LinearMipmapLinearFilter;
        tex.magFilter = THREE.LinearFilter;
        tex.anisotropy = Math.min(8, this.renderer.capabilities.getMaxAnisotropy());
        if (this.groundMat.map) this.groundMat.map.dispose();
        this.groundMat.map = tex;
        this.groundMat.needsUpdate = true;
        this._floorTex = tex;
      }
      /* doku ofseti YOK — desen dünyaya çivili (yukarıdaki karo-katı takip) */
    } else {
      this.ground.visible = false;
    }
  }

  _updatePlayer(game, dt) {
    const p = game.player;
    const root = this.playerRoot;
    root.position.set(p.x, 0, p.y);
    this.playerShadow.position.set(p.x, 0.4, p.y);
    const shScale = 15 + Math.sin(game.time * 2) * 0;
    this.playerShadow.scale.setScalar(shScale);
    if (this.heroLight) this.heroLight.position.set(p.x, 140, p.y);
    if (this.heroFill) this.heroFill.position.set(p.x, 55, p.y + 70);

    const dx = Math.cos(p.facing), dz = Math.sin(p.facing);
    const targetYaw = Math.atan2(dx, dz);
    let diff = targetYaw - this._yaw;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    if (p.moving) this._yaw += diff * Math.min(1, dt * 10);
    root.rotation.y = this._yaw;

    /* hasar aldığında kısa flaş: hafif kırmızı ışık titremesi */
    const flick = p.invuln > 0 && ((game.time * 24) | 0) % 2 === 0;
    root.visible = !flick;

    /* Taban pozu HER karede geri yükle (mixer'dan ÖNCE): yürüme klibi her
       kemiği track'lemez (özellikle boyun/kafa) — track'lenmeyen kemikler
       mixer.update ile sıfırlanmaz ve prosedürel rotasyonlar birikip kafada
       glitch/bozuntu oluşturur. Restore → mixer → prosedürel ekleme sırası
       her kemiği deterministik yapar. */
    if (this._poseBase) {
      for (const e of this._poseBase) e.b.quaternion.copy(e.q);
    }
    if (this.mixer) {
      if (p.moving) {
        if (this.walkAction) this.walkAction.paused = false;
        this.mixer.update(dt);
      } else {
        /* Eskiden dururken klip OLDUĞU YERDE donuyordu — oyuncu ne zaman
           bıraktıysa (ayak havada, kol çapraz) o garip anda kalıyordu.
           Bunun yerine klibi temiz bir "nötr" kareye (t=0) kilitliyoruz.
           ÖNEMLİ: mixer.update(0) HER KAREDE çağrılmalı (yalnızca geçişte
           değil) — yoksa kemik pozu sıfırlanmaz ve aşağıdaki prosedürel
           nefes/baş dönüşü düzeltmeleri kare kare BİRİKİR (kafanın etrafında
           titreyen/döner beyaz parça artıfaktına yol açan asıl sebep buydu). */
        if (this.walkAction && !this.walkAction.paused) {
          this.walkAction.time = 0;
          this.walkAction.paused = true;
        }
        this.mixer.update(0);
      }
    }
    if (this.armBones) {
      this.armBones.r.rotateZ(-1.3);
      this.armBones.l.rotateZ(1.3);
    }
    if (!p.moving && this.idleBones) {
      /* Prosedürel "yerinde durma" animasyonu: gerçek bir idle klibi
         yok — nefes alma + hafif baş çevirme + kol sallanması bindirerek
         karakter cansız bir heykel gibi durmak yerine canlı görünür. */
      const t = game.time;
      const breathe = Math.sin(t * 1.7);
      if (this.idleBones.chest) this.idleBones.chest.rotateX(breathe * 0.028);
      if (this.idleBones.spine) this.idleBones.spine.rotateX(breathe * 0.018);
      if (this.idleBones.neck) this.idleBones.neck.rotateY(Math.sin(t * 0.45) * 0.06);
      if (this.idleBones.head) {
        this.idleBones.head.rotateY(Math.sin(t * 0.33 + 1.2) * 0.05);
        this.idleBones.head.rotateX(Math.sin(t * 0.8) * 0.02);
      }
      if (this.armBones) {
        this.armBones.r.rotateX(breathe * 0.05);
        this.armBones.l.rotateX(-breathe * 0.05);
      }
      if (this.heroMesh && this._heroBaseY !== undefined) {
        this.heroMesh.position.y = this._heroBaseY + breathe * 0.4;
      }
    } else if (this.heroMesh && this._heroBaseY !== undefined) {
      /* İSKELETSİZ KAHRAMAN (mixer yok) — PROSEDÜREL YÜRÜYÜŞ.
         Gerçek bacak animasyonu olmadığı için heykel gibi kayarak
         gidiyordu ("havada uçuyor gibi"). Tek eksenli sıçrama da yetmedi;
         inandırıcı adım ÜÇ hareketin toplamıdır:
           1. DÜŞEY ZİPLAMA — adım döngüsünde İKİ tepe (her ayak için bir),
           2. YANA YATMA — ağırlık ayaktan ayağa geçer (yarı frekans),
           3. ÖNE EĞİLME — hızlanırken gövde ivmeye yaslanır.
         Mixer'lı kahramanlarda bu dal HİÇ çalışmaz. */
      const hm = this.heroMesh;
      if (p.moving && !this.mixer) {
        this._strideT = (this._strideT || 0) + dt;
        const ph = this._strideT * 8.4;             // adım frekansı
        hm.position.y = this._heroBaseY + Math.abs(Math.sin(ph)) * 2.2;
        hm.rotation.z = Math.sin(ph * 0.5) * 0.055;  // yana yatma (yarım frekans)
        hm.rotation.x = -0.07 + Math.cos(ph * 2) * 0.012;
      } else {
        /* durunca taban poza YUMUŞAK dön — anında sıfırlamak görünür bir
           sarsıntı yapıyordu; nefes alıp verme yerinde de sürer. */
        const k = Math.min(1, dt * 8);
        const breathe = Math.sin(game.time * 1.7) * 0.5;
        hm.position.y += ((this._heroBaseY + breathe) - hm.position.y) * k;
        hm.rotation.z += (0 - hm.rotation.z) * k;
        hm.rotation.x += (0 - hm.rotation.x) * k;
      }
    }
  }

  /** Koşu başlamadan (bulut perdesi kapalıyken) modeli yükler. */
  prepareWorldEnemies(floor) { this._ensureEnemyModels(floor); this._ensureBossModel(); }

  /* ── HASAT LORDU (boss modeli) ──
     Bir kez yüklenir ve koşu boyunca (dünya değişse de) yaşar: boss dalgası
     ortasında 750 KB indirmek görünür bir takılma olurdu. Yükleme savaş
     perdesi kapalıyken başlar (prepareWorldEnemies), yani oyuncu bekleme
     ekranındayken biter. */
  /** Bu dünyanın boss sanatı. Tablo yoksa Hasat Lordu (dokuz dünyanın ortak
      boss'u); bataklıkta BATAK EJDERİ. */
  _bossDefFor(floor) { return BOSS_MODELS[floor] || BOSS_MODEL; }

  /**
   * Boss modelini yükler / dünyaya göre değiştirir.
   *
   * İKİ BOSS SANATI VAR ve ikisi ayrı yüklenir. Tek bossRig alanı vardı;
   * dünya değiştirdiğinde aynı rig kullanılmaya devam ediyordu, yani
   * bataklıkta lord çıkardı. Yüklenmiş rigler _bossRigs içinde GLB yoluna
   * göre saklanır: bir kez yüklenir, dünya arasında yeniden indirilmez
   * (boss dalgası ortasında indirme görünür bir takılmadır) ve
   * kullanılmayanı görünmez kalır.
   */
  _ensureBossModel(floor) {
    const def = this._bossDefFor(floor != null ? floor : this._emFloor);
    if (this._bossDef !== def) {
      this._bossDef = def;
      this._bossKind = def.kind || 'lord';
      if (this.bossRig) this.bossRig.visible = false;
      const cached = this._bossRigs && this._bossRigs[def.glb];
      if (cached) {
        this.bossRig = cached.rig; this.bossMats = cached.mats;
        this.bossRig.visible = true;
        this.bossFallback.visible = false;
        this._bossEmI = -1;               // ışıma önbelleği rig başına anlamlı
        return;
      }
      this.bossRig = null; this.bossMats = null; this._bossLoading = false;
    }
    if (this._bossLoading || this.bossRig || this._lost) return;
    this._bossLoading = true;

    /* İSKELETSİZ MODELİN YOLU AYRIDIR. Hasat Lordu 10,4k üçgenle HAM yüklenir
       (bütçenin içinde). Batak Ejderi Tripo'nun 'yüksek kalite' ihracı:
       605k üçgen — statik prop boru hattından geçer (loadDecimatedProp,
       iskelet aramaz) ve sonuç IndexedDB'ye yazılır. loadDecimatedHero BURADA
       ÇALIŞMAZ: 'modelde iskeletli ağ yok' diye reddeder (tezgahta ölçüldü). */
    const src$ = def.prop
      ? loadDecimatedProp(THREE, { GLTFLoader, DRACOLoader }, def.glb, {
        key: 'e_' + (def.decKey || 'boss'), targetTris: def.prop.targetTris,
        texSize: Math.min(def.prop.texSize, Quality.budget('texHero') || def.prop.texSize),
      }).then((r) => ({ scene: r.model }))
      : (() => {
        const loader = new GLTFLoader();
        loader.setDRACOLoader(this._getDraco());
        return loader.loadAsync(def.glb);
      })();

    src$.then((gltf) => {
      if (this._lost) { this._bossLoading = false; return; }
      const src = gltf.scene;
      /* boss dokusu kahraman bütçesinden okunur (texHero), düşman bütçesinden
         değil: ekranda ~300 px kaplar ve dövüş uzun sürer. Prop yolunda doku
         ZATEN indirildi — ikinci kez küçültmek boşa iş. */
      if (!def.prop) budgetTextures(src, Math.min(def.tex, Quality.budget('texHero') || def.tex));
      const box = new THREE.Box3().setFromObject(src);
      const modelH = Math.max(0.001, box.max.y - box.min.y);
      const s = def.height / modelH;
      const mats = [];
      src.traverse((o) => {
        if (!o.isMesh) return;
        o.frustumCulled = false;
        o.castShadow = false;
        const mt = o.material;
        mt.transparent = false; mt.depthWrite = true;
        /* Tripo/Meshy varsayılanı doubleSided: mobil GPU'da her üçgen İKİ
           KEZ rasterize edilir, kapalı gövdede sıfır görsel fark. */
        mt.side = THREE.FrontSide;
        if (def.lift && mt.map && !mt.emissiveMap) {
          mt.emissiveMap = mt.map;
          mt.emissive.setScalar(def.lift);
        }
        if (mt.map) {
          mt.map.anisotropy = 4; mt.map.generateMipmaps = true;
          mt.map.minFilter = THREE.LinearMipmapLinearFilter; mt.map.needsUpdate = true;
        }
        applyCharLook(mt);
        mats.push(mt);
      });
      src.scale.setScalar(s);
      /* ayak/pelerin tabanı rig'in 0'ına, gövde XZ merkezine — süzülme
         yüksekliği ve dönüş ekseni buna bağlı (kayık merkez, dönerken
         lordu kendi etrafında savuruyor gibi gösterir) */
      src.position.set(-((box.min.x + box.max.x) / 2) * s, -box.min.y * s,
                       -((box.min.z + box.max.z) / 2) * s);
      const rig = new THREE.Group();
      /* yawFix: ejder modeli +X'e bakıyor (_facetest dört-yaw panelinde
         ölçüldü). Düzeltme İÇ düğüme yazılır; rig'in kendi rotation'ı her
         karede poz tarafından (pitch/roll) sürülüyor. */
      if (def.yawFix) src.rotation.y += def.yawFix;
      rig.add(src);
      this.bossMesh.add(rig);
      if (!this._bossRigs) this._bossRigs = {};
      this._bossRigs[def.glb] = { rig, mats };
      /* DÜNYA DEĞİŞTİYSE bu yükleme ARTIK GEÇERLİ DEĞİL: rig saklanır ama
         görünmez kalır, aktif olan kaydedilmiş diğeridir. */
      if (this._bossDef !== def) { rig.visible = false; this._bossLoading = false; return; }
      this.bossRig = rig;
      this.bossMats = mats;
      this._bossEmI = -1;
      this.bossFallback.visible = false;
      this._bossLoading = false;
      /* Kural 5 — İLK KULLANIMDA DERLENEN HİÇBİR ŞEY SAVAŞTA OLMAZ.
         Boss mesh'i visible=false doğar, yani precompileScene onu gezmez ve
         shader ilk göründüğü karede derlenir: tam boss uyanışında tek karelik
         donma. Burada bir kare görünür yapıp derletiyoruz. */
      try {
        const wasV = this.bossMesh.visible;
        this.bossMesh.visible = true;
        const after = () => { this.bossMesh.visible = wasV; };
        if (this.renderer.compileAsync) this.renderer.compileAsync(this.scene, this.camera).then(after, after);
        else { this.renderer.compile(this.scene, this.camera); after(); }
      } catch (err) { console.warn('boss shader ön-derlemesi atlandı', err); }
    }).catch((err) => {
      this._bossLoading = false;      // yeniden denenebilir (kapsül yedek çizilir)
      console.warn('Boss modeli yüklenemedi', err);
    });
  }

  /**
   * Hasat Lordu'nu sürer: konum + yön grupta, SÜZÜLME/POZ rig'de.
   * Poz matematiği bossMotion.js'te (tezgah aynı fonksiyonu okur).
   * @returns güncellenmiş gölge örneği sayacı
   */
  _driveBoss(game, e, sh, dt) {
    this._ensureBossModel();
    const B = this.bossMesh;
    B.visible = true;
    B.position.set(e.x, 0, e.y);
    /* EJDER YERİNDE DÖNER, ANINDA DÖNMEZ. Lord süzüldüğü için anında
       yönelmesi sorun değildi; yürüme klibi olmayan, yerde duran bir
       gövdenin bir karede 180° dönmesi "ışınlandı" gibi okunur. Dönüş hızı
       config.DRAGON.turnRate (rad/sn) — zıplama dışındaki tek hareketi bu. */
    const want = Math.atan2(game.player.x - e.x, game.player.y - e.y);
    if (this._bossKind === 'ejder') {
      let d = want - (this._bossYaw != null ? this._bossYaw : want);
      while (d > Math.PI) d -= Math.PI * 2;
      while (d < -Math.PI) d += Math.PI * 2;
      const step = DRAGON.turnRate * (dt || 0.016);
      this._bossYaw = (this._bossYaw != null ? this._bossYaw : want)
        + Math.max(-step, Math.min(step, d));
      B.rotation.y = this._bossYaw;
    } else {
      B.rotation.y = want;
      this._bossYaw = want;
    }
    const sc = e.radius / 47;
    B.scale.setScalar(sc);
    const rig = this.bossRig;
    const bdef = this._bossDef || BOSS_MODEL;
    if (!rig) { this._bossTopY = 108 * sc; return sh; }   // yer tutucu kapsül

    const P = this._bossKind === 'ejder'
      ? dragonPose(DRAGON_POSE, game.time, e.atkAnim || 0, e.state, e.stateT)
      : bossPose(BOSS_POSE, game.time, e.atkAnim || 0, e.state, e.stateT);
    /* push: darbe anında baktığı yöne doğru kısa atılış. Grup yaw'ı zaten
       uygulanmış olduğu için LOKAL +Z ileriyi gösterir. */
    rig.position.set(0, P.y, P.push);
    rig.rotation.set(P.pitch, 0, P.roll);
    this._bossTopY = (P.y + bdef.height) * sc;

    /* Tek kanal, iki iş: vurulma parlaması (beyaza yakın sıçrama) ve hücum
       telegrafı (windup boyunca kor gibi ısınma). İKİSİ AYRI OKUNMAK ZORUNDA:
       telegraf tavanı 2,9'da tutulur, isabet 3,8'e çıkar — eşitlenirse
       telegraf sırasında vurmak sessiz kalır. Yeni ışık YASAK; ışıma
       dokunun kendi emissiveMap'inden gelir (lift). */
    const wantI = e.flash > 0 ? 3.8 : 1 + P.glow * 1.9;
    if (Math.abs((this._bossEmI || 1) - wantI) > 0.02) {
      this._bossEmI = wantI;
      const m = this.bossMats;
      for (let i = 0; i < m.length; i++) m[i].emissiveIntensity = wantI;
    }

    /* YUVARLAK ZEMİN GÖLGESİ — düşmanların instanced gölge mesh'inde tek
       yuva: yeni mesh, yeni çizim çağrısı YOK. Yükseldikçe küçülür
       (bossMotion P.shadow); uçtuğunu söyleyen şey bu boşluktur. */
    if (sh < this._enemyMax) {
      const shM = TMP.m4b, shPos = TMP.vc, q = TMP.q, s = TMP.v;
      shM.compose(shPos.set(e.x, 0.35, e.y), q.identity(),
                  s.setScalar(bdef.shadowR * sc * P.shadow));
      this.enemyShadowMesh.setMatrixAt(sh++, shM);
    }
    return sh;
  }

  /* Dünya değişince iskeletli düşman havuzunu kur (ya da at). Havuz bir kez
     yüklenir, koşu boyunca yeniden kullanılır — koşu başında takılma olmaz. */
  _ensureEnemyModels(floor) {
    if (this._emFloor === floor) return;
    this._emFloor = floor;
    this._releaseEnemyModels();
    const defs = WORLD_ENEMY_MODELS[floor];
    if (!defs || !defs.length) return;
    this._enemyModels = [];
    const total = Quality.budget('modelEnemies') || 10;
    for (let di = 0; di < defs.length; di++) this._loadModelGroup(floor, defs[di], total);
  }

  /** Tek bir düşman modelini yükler ve kendi slot havuzunu kurar. */
  _loadModelGroup(floor, def, totalBudget) {
    /* ── SADELEŞTİRME YOLU (def.decimate) ──
       Düşman modelleri de kahramanların boru hattından geçer. Kayıt açılana
       kadar Tripo/Meshy ihraçları HAM yükleniyordu: muhafız 10.208 ve büyücü
       10.633 üçgen, oysa CLAUDE.md'nin kendi ölçütü "düşman için 2–4k
       yeterli" diyor — kadronun kalabalık modeli (hortlak) 3.060 ile o
       bandın içindeydi, pahalı ikisi 2,5-3,5 katıydı.

       MESAFE LOD'U BU OYUNDA İŞE YARAMAZ ve bu yüzden yazılmadı: kamera
       tepeden bakar, ekrandaki her düşman kameradan neredeyse AYNI uzaklıkta
       durur. Klasik "uzaktakini kaba çiz" tekniği hiçbir şey kazandırmaz —
       kazanç TABAN üçgen sayısını düşürmekten gelir, bu da her düşman için
       her karede ödenir.

       İkinci ve gizli kazanç açılış hızıdır: sonuç IndexedDB'ye yazıldığı
       için ikinci açılışta ne ağ isteği ne Draco çözümlemesi olur. */
    const src$ = def.decimate
      ? loadDecimatedHero(THREE, { GLTFLoader, DRACOLoader }, def.glb, {
        /* decKey: ölçüm tezgahı (_newenemytest) ile ORTAK anahtar. Aynı model
           iki ayrı anahtarla iki kez sadeleştirilmez; ayrıca kaynak dosya
           güncellenirse anahtarı yükseltmek önbelleği geçersiz kılmannın TEK
           yoludur (anahtar dosya içeriğini bilmez). */
        key: 'e_' + (def.decKey || def.id),
        targetTris: def.decimate.targetTris,
        texSize: Math.min(def.decimate.texSize || 512, Quality.budget('tex')),
        headFrom: def.decimate.headFrom != null ? def.decimate.headFrom : 0.84,
        rootBones: def.rootBones,
      }).then((r) => ({ scene: r.model, animations: r.animations, __tris: r.tris }))
      : (() => {
        const loader = new GLTFLoader();
        loader.setDRACOLoader(this._getDraco());
        return loader.loadAsync(def.glb);
      })();
    src$.then((gltf) => {
      if (this._emFloor !== floor || this._lost || !this._enemyModels) return;
      const src = gltf.scene;
      /* DOKU BELLEK BÜTÇESİ — kritik: bu doku n adet rig tarafından
         PAYLAŞILIR, ama tek kopyası bile 1024²=4 MB (mipmap'le 5.3 MB).
         Düşman ekranda ~120 px görünür; 512² gözle ayırt edilemez ve
         belleği dörde böler. 2 GB'lık telefonlarda WebView'in ~350 MB'ta
         öldürülmesini önleyen şey budur. Küçültme skeletonClone'dan ÖNCE
         yapılır, yoksa her klon tam boy dokuyu referanslar. */
      /* Sadeleştirme yolunda doku ZATEN texSize'a indirilmiş ve WebP'ye
         çevrilmiştir; ikinci kez küçültmek boşa iş (ve tuval blit'i). */
      if (!def.decimate) budgetTextures(src, Quality.budget('tex'));
      const box = new THREE.Box3().setFromObject(src);
      const modelH = Math.max(0.001, box.max.y - box.min.y);
      const baseScale = def.height / modelH;
      const clips = gltf.animations || [];
      /* KÖK HAREKETİ SÖKÜLÜR — KOŞULSUZ, HER DÜŞMAN MODELİNDE.
         Tripo/Meshy NLA ihraçları yürüyüşü kalça track'ine yazar: ağ klip
         boyunca ileri kayar (buyucu'da ölçüldü: kalça 2,38 sn'de ~108 dünya
         birimi = 1,3 gövde boyu), klip başa sarınca da aniden geri sıçrar.
         Düşmanın dünya konumu HER ZAMAN oyun mantığından gelir ve instanced
         gölge e.x/e.y'ye çizilir, yani kayan ağ iki belirti üretir:
         figür kendi gölgesinin önünde yürür ve her sarışta ışınlanır.
         Kahraman yolunda bu sorun `stripRoot` bayrağıyla çözülmüştü
         (render3d ~974, savasci/gokalev); düşman yolunda hiç uygulanmamıştı.
         BURADA OPT-IN DEĞİL: yerinde oynanmayan bir düşman klibi yok, yani
         bayrak unutulduğunda hata sessizce geri gelir. */
      const rootNames = new Set(def.rootBones || ['Root', 'Hip', 'Pelvis', 'Hips', 'Armature']);
      /* AD LİSTESİ YETMEZ — İSKELETİN KÖKÜ ÖLÇÜLEREK BULUNUR (2026-08-30).
         Elle yazılmış liste her yeni ihraçta sessizce geçersizleşiyor: Tripo
         rigleri köke `tripo::Root` diyor ve three.js düğüm adlarını sanitize
         ediyor (`tripo__Root`), yani listenin İKİ yazımı da içermesi
         gerekiyordu ve kadronun yarısında unutulmuştu — o modellerde kök
         hareketi HİÇ sökülmedi: figür kendi çarpışma dairesinden kayarak
         yürüyor ve klip başa sarınca geri sıçrıyor ("oldukları yerde
         durmuyorlar", "hitbox'ları apayrı ilerliyor").
         Kemiğin ADI değil YERİ sorulur: bone ebeveyni bone OLMAYAN her kemik
         iskeletin köküdür, adı ne olursa olsun. Liste yedek olarak durur. */
      src.traverse((o) => {
        if (o.isBone && !(o.parent && o.parent.isBone)) rootNames.add(o.name);
      });
      for (const c of clips) stripRootMotion(c, rootNames);
      const clip = clips.find((c) => c.name === def.clip) || clips[0] || null;
      /* Bütçe paylaşımı: pahalı model az slot alır. En az 2 — tek slot
         "bir tanesi modelli, diğerleri kapsül" gibi tutarsız görünür. */
      const n = Math.max(2, Math.round(totalBudget * (def.share != null ? def.share : 1)));
      const pool = [];
      for (let i = 0; i < n; i++) {
        const rig = skeletonClone(src);
        const mats = [];
        rig.traverse((o) => {
          if (!o.isMesh) return;
          o.frustumCulled = false;
          o.castShadow = false;
          /* materyali klonla: vurulma parlamasını örnek başına sürebilmek için
             (doku referansı paylaşılır → ek VRAM maliyeti yok) */
          o.material = o.material.clone();
          const mt = o.material;
          mt.transparent = false; mt.depthWrite = true;
          /* ARKA YÜZ AYIKLAMA: Meshy varsayılan olarak doubleSided=true
             verir; bu, mobil GPU'da her üçgeni İKİ KEZ rasterize etmek
             demektir (fillrate ×2). Kapalı bir karakter gövdesinde arka
             yüzler zaten görünmez — hiçbir görsel fark yok. */
          mt.side = THREE.FrontSide;
          /* GLB'nin kendi baseColor + emissive dokusu korunur; sadece
             emissive şiddeti ve doku filtresi ayarlanır. */
          if (mt.emissiveIntensity != null) mt.emissiveIntensity = def.emissiveIntensity;
          /* lift: dokunun KENDİSİ emissiveMap olur — her piksel kendi rengini
             az miktarda yayar (çarpımsal maske). Düz emissive rengi siyahları
             birlikte kaldırıp figürü grileştirir; bu olmaz. */
          if (def.lift && mt.map && !mt.emissiveMap) {
            mt.emissiveMap = mt.map;
            mt.emissive.setScalar(def.lift);
          }
          if (mt.map) { mt.map.anisotropy = 4; mt.map.generateMipmaps = true; mt.map.minFilter = THREE.LinearMipmapLinearFilter; mt.map.needsUpdate = true; }
          if (mt.emissiveMap) mt.emissiveMap.anisotropy = 4;
          applyCharLook(mt);
          mats.push(mt);
        });
        const holder = new THREE.Group();
        /* KONUM İLERİDE ÖLÇÜMLE YAZILIR (_fitEnemyRig). Burada sıfırlanır:
           bind pozunun kutusu boy ölçüsü olarak GÜVENİLİR DEĞİL. */
        rig.position.set(0, 0, 0);
        /* ══ yawFix — MODELİN CEPHESİ ÖLÇÜLER ══
           Oyun holder yaw'ını `atan2(px-ex, py-ey)` ile sürer, yani yaw=0
           iken modelin YEREL +Z'si oyuncuya bakmak zorundadır. Dört ayaklı
           Tripo ihraçlarının bir kısmı +X'e bakıyor — düzeltilmezse düşman
           YAN YÜRÜR. Değer TAHMİN EDİLEMEZ: `_facetest.html` aynı modeli dört
           yaw ile yan yana çizer, cepheye bakan seçilir (bbox uzun ekseni
           yalnız ipuçtur; kolları açık bir insansıda o ölçüm YANILIR).
           Düzeltme rig'e yazılır, holder'a değil: holder'ın yaw'ı her karede
           hedeflemeden geliyor ve buraya yazılan değer ezilirdi. */
        if (def.yawFix) rig.rotation.y = def.yawFix;
        holder.add(rig);
        /* MENZİLLİ DÜŞMANIN POZ KEMİKLERİ (def.cast): asa kolu + gövde + baş.
           Adlar Tripo/Meshy insansı rigin standardı; bulunamazsa poz sessizce
           atlanır (model değişirse çökmez, sadece pozsuz kalır). */
        let bones = null;
        if (def.cast) {
          const b = {};
          rig.traverse((o) => {
            if (!o.isBone) return;
            if (o.name === 'R_Upperarm') b.arm = o;
            else if (o.name === 'R_Forearm') b.fore = o;
            else if (o.name === 'Spine01') b.spine = o;
            else if (o.name === 'Head') b.head = o;
          });
          if (b.arm || b.spine) bones = b;
        }
        holder.visible = false;
        this.scene.add(holder);
        const mixer = new THREE.AnimationMixer(rig);
        let bake = null, bakeNodes = null;
        if (clip) {
          try { bake = bakeClip(clip); bakeNodes = bindBake(bake, rig); } catch (err) { bake = null; bakeNodes = null; }
          if (bakeNodes) BakeStats.rigs++; else BakeStats.mixer++;
        }
        if (clip) {
          const a = mixer.clipAction(clip);
          a.play();
          /* POZ ÖNCESİ DEĞER SAKLANIR — "SÜRÜLME ÖLÇÜMÜ" YERİNE.
             Önceki yol klibin hangi kemiği gerçekten sürdüğünü ÖLÇÜYOR,
             sürülene delta çarpıyor, sürülmeyene bind değerini mutlak
             yazıyordu. Ölçüm doğruydu ama YETMİYORDU: three.js'te
             `PropertyMixer.apply` kemiğe yalnız DEĞER DEĞİŞTİYSE yazar
             (kaynakta "value has changed -> update scene graph").
             Büyücü ateş ederken YERİNDE DURUR: klip zamanı `restT`ye
             kilitli, `mixer.update(0)` çağrılıyor ama hiçbir bağlama
             değişmediği için kemiğe TEK BİR YAZMA olmuyor. Delta o
             karelerde sıfırlanmayınca üst üste biniyor ve kol/gövde tur
             atıyordu — kullanıcının teşhisi "büyü atarken 360 dönüyor".
             Çözüm sürülme testini ölçmek değil, POZU GERİ ALMAK: poz
             uygulanmadan önceki kuaterniyon slotta saklanır ve her
             karede mixer'dan ÖNCE geri yazılır. Kemiğin sürülüp
             sürülmediği artık hiç sorulmaz (o soru her yeni klipte
             yeniden yanlış cevaplanabilirdi). */
          if (bones) {
            for (const k of ['arm', 'fore', 'spine', 'head']) {
              if (bones[k]) bones[k + 'S'] = bones[k].quaternion.clone();
            }
            bones.saved = true;
          }
          a.time = Math.random() * clip.duration;   // hepsi aynı adımda yürümesin
          mixer.update(0);
          /* DİNLENME KARESİ ÖLÇÜLÜR (bir kez, ilk slotta): duruş klibi yok,
             o yüzden yürüyüş klibinin İÇİNDEN en "ayakta duran" kare seçilir.
             ÖLÇÜT İKİ KADEMELİDİR ve sırası kritiktir:
               ① önce İKİ AYAK DA ZEMİNDE olan kareler ayıklanır,
               ② sonra o küme içinde ayakların yatay mesafesi küçültülür.
             Yalnız yatay mesafeye bakmak (ilk sürüm) her zaman GEÇİŞ karesini
             seçer — bir bacak diğerinin yanından geçerken havadadır, yani
             ölçüt olabilecek EN KÖTÜ duruşu bulur. Bu modelde ölçüldü:
             yalnız-gap → t=0,67 (bir ayak 3,6 birim havada, "yarıda kalmış"),
             iki kademeli → t≈0,20 (iki ayak da basıyor, en dar duruş). */
          if (def.cast && def.restT == null) {
            const feet = [];
            rig.traverse((o) => { if (o.isBone && /foot/i.test(o.name)) feet.push(o); });
            if (feet.length >= 2) {
              const STEPS = 48;
              const hi = new Float32Array(STEPS), gp = new Float32Array(STEPS);
              let minHi = 1e9, maxHi = -1e9;
              for (let si = 0; si < STEPS; si++) {
                const tt = (si / STEPS) * clip.duration;
                a.time = tt; mixer.update(0); rig.updateMatrixWorld(true);
                const A0 = feet[0].matrixWorld.elements, B0 = feet[1].matrixWorld.elements;
                const fx = A0[12] - B0[12], fz = A0[14] - B0[14];
                hi[si] = Math.max(A0[13], B0[13]);      // havadaki ayağın yüksekliği
                gp[si] = fx * fx + fz * fz;
                if (hi[si] < minHi) minHi = hi[si];
                if (hi[si] > maxHi) maxHi = hi[si];
              }
              /* EŞİK ÖLÇEKTEN BAĞIMSIZ OLMAK ZORUNDA. Mutlak bir sayı (ilk
                 sürüm: minHi + 0.5) burada sessizce no-op oluyordu: ölçüm
                 model-YEREL uzayda yapılıyor (rig ölçeği ~48×), yani tüm
                 kareler bandın içine düşüp birinci kademe hiç elemiyordu ve
                 ölçüt eski "yalnız açıklık" sürümüne — düzeltilmek istenen
                 hataya — geri dönüyordu. Eşik artık klibin KENDİ ayak
                 genliğine oranlıdır, hangi birimde ölçülürse ölçülsün aynı
                 kareyi seçer. */
              const lim = minHi + 0.15 * (maxHi - minHi);
              let best = 1e9, bestT = 0;
              for (let si = 0; si < STEPS; si++) {
                if (hi[si] > lim || gp[si] >= best) continue;
                best = gp[si]; bestT = (si / STEPS) * clip.duration;
              }
              def.restT = bestT;
            } else def.restT = 0;
            a.time = Math.random() * clip.duration;
            mixer.update(0);
          }
        } else if (bones) {
          for (const k of ['arm', 'fore', 'spine', 'head']) {
            if (bones[k]) bones[k + 'S'] = bones[k].quaternion.clone();
          }
          bones.saved = true;
        }
        pool.push({
          holder, mixer, mats, _emI: def.emissiveIntensity,          /* rig: holder'ın çocuğu. Atış pozu (def.cast) rig'in ÜSTÜNDEN
             çarpar — mixer kemikleri sürerken bu dönüş gövdenin tamamını
             yaslar, yani tek klipli modelde de "atış anı" görünür. */
          rig, rigY0: rig.position.y, bones, act: clip ? mixer.clipAction(clip) : null,
          bake: bakeNodes ? bake : null, bakeNodes,
          e: null, seed: -1,          // bağlı düşman (kalıcı atama) + kimlik damgası
          yaw: 0, sx: 0, sz: 0,       // yumuşatılmış konum/yön
          /* CESET ve İSABET ALANLARI FABRİKADA TANIMLANIR (perf sözleşmesi
             kural 1 / `isPet` dersi): ilk ölümde eklenirse her karede
             gezilen bu nesnelerin hidden class'ı koşu ortasında değişir. */
          dead: 0, deadAng: 0, fl: 0, _hs: 0,
        });
      }
      /* ═══ BOY, ZEMİN TEMASI ve MERKEZ ÖLÇÜLER (2026-08-30) ═══
         Kullanıcı teşhisi: "bazı karakterler orantısız, ayakları yere tam
         basmıyor, hitbox'ları apayrı ilerliyor." ÜÇ ayrı sebebi vardı ve
         hepsi tek bir kök hatadan geliyordu: ölçüler BİND POZUNDAN okunuyordu.

         ① BOY: Tripo ihraçlarının bind pozu duruş değildir (kollar açık,
           dört ayaklılar geriş). O kutunun yüksekliğine bölmek modeli
           oynanıştaki gerçek boyundan farklı ölçekliyordu — "orantısız".
         ② ZEMİN: bind kutusunun altı ayak tabanı değil; yürüyüş klibi
           oynarken ayak o noktanın altına iniyor (gömme) ya da hiç
           ulaşmıyor (havada yürüme).
         ③ MERKEZ: XZ HİÇ MERKEZLENMİYORDU. Boss yükleyicisi merkezliyor,
           düşman yükleyicisi merkezlemiyordu: modelin kendi orijini gövdenin
           yanında olan bir ihraç (Tripo'da sık), çarpışma dairesinden
           kayarak yürüyor — kullanıcının gördüğü "hitbox apayrı ilerliyor"
           birebir bu.

         Çözüm: ölçü DERİ ÇÖZDÜRÜLMÜŞ (skinned) kutudan, klibin on iki
         karesi boyunca alınır. `SkinnedMesh.computeBoundingBox()` kemik
         dönüşümünü uygular — `Box3.setFromObject` UYGULAMAZ (geometrinin
         bind kutusunu kullanır), o yüzden eski ölçüm animasyonu hiç
         görmüyordu. Yalnız İLK slotta ölçülür (diğerleri kopyası) ve
         sonuç tüm slotlara yazılır; kare başına maliyet SIFIR. */
      let fitScale = baseScale;
      if (pool.length) {
        const fit = this._fitEnemyRig(pool[0], def, clip);
        if (fit) {
          fitScale = fit.scale;
          for (const p of pool) { p.rig.position.copy(fit.pos); p.rigY0 = fit.pos.y; }
        }
      }
      this._enemyModels.push({
        pool, def, baseScale: fitScale, emI: def.emissiveIntensity,
        types: def.types, shadowR: def.shadowR || 11,
      });

      /* Shader'ı ŞİMDİ derle (kural 5). compileAsync varsa onu tercih
         ederiz: senkron compile() ana iş parçacığını kilitler ve tam da
         önlemek istediğimiz takılmayı kendisi üretir. */
      try {
        const first = pool[0];
        if (first) {
          const wasVisible = first.holder.visible;
          first.holder.visible = true;
          const after = () => { first.holder.visible = wasVisible; };
          if (this.renderer.compileAsync) {
            this.renderer.compileAsync(this.scene, this.camera).then(after, after);
          } else {
            this.renderer.compile(this.scene, this.camera);
            after();
          }
        }
      } catch (e) { console.warn('model shader ön-derlemesi atlandı', e); }
    }).catch((err) => console.warn('Düşman modeli yüklenemedi (' + floor + '/' + def.id + ')', err));
  }

  _releaseEnemyModels() {
    this._flyN = 0;
    const groups = this._enemyModels;
    this._enemyModels = null;
    if (!groups) return;
    /* v54 F4: BELLEK TAVANI — eskiden yalnız materyal atılıyordu; geometri, doku ve
       pişmiş poz verisi dünya değiştikçe birikiyordu. Klonlar geometriyi paylaşır →
       benzersiz kümeyle bir kez atılır. dispose yalnız GPU belleğini boşaltır; aynı
       dünyaya dönülürse three.js ilk çizimde yeniden yükler (güvenli). */
    const geos = new Set(), texs = new Set();
    for (let gi = 0; gi < groups.length; gi++) {
      const pool = groups[gi].pool;
      for (let i = 0; i < pool.length; i++) {
        const p = pool[i];
        p.mixer.stopAllAction();
        if (p.mixer.uncacheRoot) p.mixer.uncacheRoot(p.mixer.getRoot());
        this.scene.remove(p.holder);
        p.holder.traverse((o) => {
          if (o.geometry) geos.add(o.geometry);
          const ms = o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : null;
          if (ms) for (const m of ms) for (const k of ['map', 'normalMap', 'emissiveMap', 'roughnessMap', 'metalnessMap', 'aoMap']) if (m[k]) texs.add(m[k]);
        });
        for (let mi = 0; mi < p.mats.length; mi++) p.mats[mi].dispose();
      }
    }
    geos.forEach((g) => g.dispose());
    texs.forEach((t) => t.dispose());
    _bakeCache.clear();
  }

  /**
   * Tek bir model grubunu sürer (kalıcı slot atama + animasyon LOD).
   * Dünya başına birden fazla düşman modeli olabildiği için gruplara
   * ayrıldı; her grubun kendi havuzu, boyu, klibi ve bütçesi var.
   * @returns güncellenmiş gölge örneği sayacı (sh)
   */
  _driveModelGroup(game, dt, EM, act, tok, sh, af) {
    const q = TMP.q, s = TMP.v, shM = TMP.m4b, shPos = TMP.vc;
    const pool = EM.pool, cap = pool.length;
      const px = game.player.x, py = game.player.y;
      const types = EM.def.types;
      const inV = this._inV || (this._inV = (e) => this.game.inView(e.x, e.y, 110));

      /* 0) CESETLER — ÖLÜM PATLAMASININ YERİNE GELEN ÇÖKÜŞ (2026-08-29)
         Slot düşmandan KOPTU (p.e = null) ama holder bir süre daha yaşar:
         gövde darbenin geldiği yöne devrilir, ezilir ve zemine GÖMÜLEREK
         kaybolur. Görünmez olmasını sağlayan şey solma DEĞİL (şeffaflık
         açmak sıralama sorunu ve fillrate demektir): opak zemin düzlemi
         onu keser. Yeni materyal, yeni mesh, yeni çizim çağrısı YOK.

         Ceset OYNANIŞA HiÇ DOKUNMAZ: düşman nesnesi çoktan havuza döndü,
         hedeflemede/çarpışmada yok. "Ölen düşman biraz daha yaşasa" diye
         oyun mantığına ölüm durumu eklemek (dying flag) hedefleme, çarpışma,
         ganimet ve canlı tavanı gibi beş sistemi birden kirletirdi. */
      for (let i = 0; i < cap; i++) {
        const p = pool[i];
        if (!(p.dead > 0)) continue;
        p.dead -= dt;
        if (p.dead <= 0) {
          p.dead = 0;
          if (p.fl) { p.fl = 0; this._flyN = Math.max(0, (this._flyN | 0) - 1); }
          p.holder.visible = false;
          p.holder.rotation.set(0, p.yaw, 0);
          p.holder.position.y = 0;
          p.holder.scale.setScalar(EM.baseScale);
          continue;
        }
        const k = 1 - p.dead / CORPSE_T;                 // 0 → 1
        const fall = k < 0.22 ? (k / 0.22) * (k / 0.22) : 1;
        const sink = k < 0.30 ? 0 : (k - 0.30) / 0.70;
        /* devrilme yönü GÖVDEYE GÖRE hesaplanır: darbe açısı slotun yaw'ından
           çıkarılır, yoksa yandan gelen bir vuruşta ceset öne devrilir. */
        const rel = p.deadAng - p.yaw;
        const amt = 1.24 * fall;
        p.holder.rotation.set(Math.cos(rel) * amt, p.yaw, -Math.sin(rel) * amt);
        /* v71 A2 · ÖLÜM FIRLATMASI: ilk 0,25 sn vuruş yönünde balistik kavis (tahsis yok) */
        let fx = p.sx, fz = p.sz, fy = 0;
        if (p.fl) {
          const kk = Math.min(1, k / 0.5), ez = 1 - (1 - kk) * (1 - kk);
          fx += Math.cos(p.deadAng) * p.fl * ez; fz += Math.sin(p.deadAng) * p.fl * ez;
          fy = Math.sin(Math.PI * kk) * p.fl * 0.45;
        }
        p.holder.position.set(fx, fy - EM.def.height * 0.62 * sink * sink, fz);
        const sq = 1 - 0.22 * fall;
        p.holder.scale.set(EM.baseScale * (1 + 0.10 * fall), EM.baseScale * sq,
                           EM.baseScale * (1 + 0.10 * fall));
        /* gölge cesetle birlikte KÜÇÜLÜR — kalan bir gölge "görünmez düşman"
           gibi okunur ve oyuncu boş yere vurur. */
        if (sh < this._enemyMax) {
          shM.compose(shPos.set(p.sx, 0.3, p.sz), q.identity(),
                      s.setScalar(EM.shadowR * (1 - 0.75 * k)));
          this.enemyShadowMesh.setMatrixAt(sh++, shM);
        }
      }

      /* 1) aday havuzu: modellenecek tipteki canlı düşmanlar */
      const cand = this._emCand || (this._emCand = []);
      cand.length = 0;
      for (let i = 0; i < act.length; i++) {
        const e = act[i];
        if (e.isBoss || types.indexOf(e.type) < 0) continue;
        e.__aliveTok = tok;
        e.__bound = false;
        cand.push(e);
      }

      /* 2) mevcut bağları doğrula (ölü / havuzdan geri dönmüş nesneleri bırak) */
      let free = 0;
      for (let i = 0; i < cap; i++) {
        const p = pool[i];
        if (p.dead > 0) continue;                 // ceset: slot meşgul
        const e = p.e;
        if (e && e.__aliveTok === tok && e.seed === p.seed && e.hp > 0) {
          e.__bound = true;
        } else {
          p.e = null; free++;
          if (p.holder.visible) p.holder.visible = false;
        }
      }

      /* 3) boş slotları doldur: önce ekranda olanlar, sonra oyuncuya yakınlar */
      if (free > 0 && cand.length) {
        for (let i = 0; i < cand.length; i++) {
          const e = cand[i];
          e.__score = (e.x - px) * (e.x - px) + (e.y - py) * (e.y - py) + (inV(e) ? 0 : 4e8);
        }
        cand.sort(BY_SCORE);
        for (let ci = 0; ci < cand.length && free > 0; ci++) {
          const e = cand[ci];
          if (e.__bound) continue;
          for (let i = 0; i < cap; i++) {
            const p = pool[i];
            if (p.e || p.dead > 0) continue;
            p.e = e; p.seed = e.seed; e.__bound = true; free--;
            p.sx = e.x; p.sz = e.y;                     // ilk karede kayarak gelmesin
          p.aAcc = 0;
            p.yaw = Math.atan2(px - e.x, py - e.y);
            p.holder.scale.setScalar(EM.baseScale);
            break;
          }
        }
      }

      /* 4) ekran dışı bağları, ekrandaki bağlanmamış düşmanlara devret (histerezis:
            yalnızca gerçekten görünür olan bir aday için slot çalınır) */
      let steal = -1;
      for (let ci = 0; ci < cand.length; ci++) {
        const e = cand[ci];
        if (e.__bound || !inV(e)) continue;
        if (steal < 0) steal = 0;
        let done = false;
        for (; steal < cap && !done; steal++) {
          const p = pool[steal];
          if (p.dead > 0 || !p.e || inV(p.e)) continue;
          p.e.__bound = false;
          p.e = e; p.seed = e.seed; e.__bound = true;
          p.sx = e.x; p.sz = e.y;
          p.aAcc = 0;
          p.yaw = Math.atan2(px - e.x, py - e.y);
          p.holder.scale.setScalar(EM.baseScale);
          done = true;
        }
        if (!done) break;                              // devredilecek slot kalmadı
      }

      /* 5) bağlı slotları sür: konum/yön yumuşatılır (sim 60Hz, ekran daha hızlı
            olabilir — ham konum kopyalamak mikro titreme üretiyordu) */
      const sp = EM.def;
      const kPos = 1 - Math.exp(-dt * 26);
      const kRot = 1 - Math.exp(-dt * 14);
      /* ANİMASYON LOD sayacı: her slot farklı karede güncellenir, böylece
         maliyet karelere yayılır (hepsi aynı karede güncellenirse o kare
         sivri uç yapar — ortalama iyi, hissiyat kötü). */
      const camX = game.cam.x, camY = game.cam.y;
      for (let i = 0; i < cap; i++) {
        const p = pool[i];
        const e = p.e;
        if (!e) continue;
        e.__mdlTok = tok;                              // kapsül döngüsü bunu atlar
        /* CAN BARI için gerçek görsel boy: model havuzu holder'ı SABİT
           ölçekle (baseScale) sürülür, yani figürün dünya boyu tam olarak
           def.height'tır. Bar bunu okur — yoksa kapsül yarıçapından
           türetilen eski tahmin 104 birimlik muhafızın göğsüne düşüyordu. */
        e.__mdlTop = sp.height;
        p.sx += (e.x - p.sx) * kPos;
        p.sz += (e.y - p.sz) * kPos;
        let dYaw = Math.atan2(px - e.x, py - e.y) - p.yaw;
        while (dYaw > Math.PI) dYaw -= Math.PI * 2;
        while (dYaw < -Math.PI) dYaw += Math.PI * 2;
        p.yaw += dYaw * kRot;
        /* ── EKRAN DIŞI RİG'İ ÇİZME ──
           Slot bağları kalıcıdır (ışınlanmayı önlemek için), yani bir rig
           düşman ekrandan çıktıktan sonra da ona bağlı kalır. Eskiden
           holder her karede visible=true yapılıyordu: rig'ler
           frustumCulled=false olduğu için ekran dışındaki figürler de
           ÇİZİLİYOR (draw call + iskelet dönüşümü + skinning) ama tek bir
           piksel üretmiyordu. Görünürlük artık gerçek görüş testine bağlı:
           kalabalık dalgada çizim çağrısı ve üçgen sayısı doğrudan düşer.
           Bağ KOPMAZ — düşman geri girdiğinde aynı rig aynı animasyon
           fazıyla görünür (aAcc birikmiş dt'yi taşır). */
        const vis = inV(e);
        p.holder.visible = vis;
        if (!vis) {
          /* görünmeyen rig'in iskeleti çözülmez; geçen zaman biriktirilir,
             geri döndüğünde yürüyüş doğru fazda devam eder */
          p.aAcc = (p.aAcc || 0) + dt * sp.stepRate;
          if (p.aAcc > 1) p.aAcc = 1;      // uzun yokluk sonrası dev adım atmasın
          continue;
        }
        p.holder.position.set(p.sx, 0, p.sz);
        p.holder.rotation.y = p.yaw;
        /* ══ İSABET EZİLMESİ (2026-08-29) — premium vuruş hissinin gövde tarafı ══
           Flaş rengi "değdi" der ama gövde hiç tepki vermiyordu: 3B'de vuruş
           yalnız ışık olarak vardı, KÜTLE olarak yoktu. İki kanal eklendi ve
           ikisi de bedava (matris zaten her karede yazılıyor):
             • EZİLME: dikeyde %14 sıkışma, yatayda %8 genişleme (hacim korunur
               gibi okunur — sadece küçülmek "uzaklaşıyor" gibi görünür).
             • GERİ TEPME: darbe yönünde 5 birim kayma; 0,13 sn'de geri gelir.
           Süre KISA olmak zorunda (0,13-0,18): daha uzunu hızlı silahlarda
           sürekli titreyen bir gövde üretir ve "lastik" gibi okunur. */
        /* v39: EĞRİ YAYLI. Eskisi doğrusal geri dönüştü (ezil → yavaşça
           düzel); kas gibi okunması için ezilmeden sonra kısa bir ESNEME
           (aşım) gelir: cos(4,7u)·(1−u)² — u=0'da tam ezilme, u≈0,33'te
           nötr, u≈0,6'da %2 esneme, u=1'de sıfır. Yerel donma (e.stopT)
           sürerken hitT enemyManager'da ERTİLENMEZ, yani ezilme tepede
           tutulur ve poz da donar (aşağıda aAcc). */
        if (e.hitT > 0) {
          const hu = 1 - e.hitT / (e.hitD || 0.15);
          const iu = 1 - hu;
          const sq = Math.cos(hu * 4.7) * iu * iu;
          const wd = EM.baseScale * (1 + 0.09 * sq);
          p.holder.scale.set(wd, EM.baseScale * (1 - 0.15 * sq), wd);
          p.holder.position.x += Math.cos(e.hurtAng || 0) * 6 * iu * iu;
          p.holder.position.z += Math.sin(e.hurtAng || 0) * 6 * iu * iu;
          p._hs = 1;
        } else if (p._hs) {
          p._hs = 0;
          p.holder.scale.setScalar(EM.baseScale);
        }
        /* ── ANİMASYON LOD ──
           İskelet çözümü (mixer.update + kemik matrisi + skinning) 34 rig'de
           EN PAHALI CPU işidir; kalabalıkta kare süresinin yarısını yer.
           Uzaktaki düşmanı 60 Hz'de çözmek boşa gider: ekranda 60 piksel
           kaplayan bir figürün bacak açısı 20 Hz'de de aynı görünür.

           KRİTİK: dt BİRİKTİRİLİR (p.aAcc). Yani animasyonun HIZI hiç
           değişmez — sadece daha seyrek, daha büyük adımlarla ilerler.
           Atlamak yerine yavaşlatmak, yürüyüşü ağır çekime düşürürdü. */
        const idle = sp.idleRate != null && (e.mvAmt || 0) < 6;
        const adt = dt * Math.max(sp.stepMin, Math.min(sp.stepMax, ((e.speed || 46) / 46) * sp.stepRate))
                       * (idle ? sp.idleRate : 1);
        /* yerel isabet donması: poz saati durur (biriktirilmez — biriktirmek
           bırakılınca ileri zıplatırdı) */
        p.aAcc = (p.aAcc || 0) + (e.stopT > 0 ? 0 : adt);
        const ddx = p.sx - camX, ddy = p.sz - camY;
        const d2 = ddx * ddx + ddy * ddy;
        /* 260 birim ≈ ekranın orta yarısı: oyuncunun gözü oradadır.
           Eşikler dünya birimi, çünkü kamera ölçeği 1 birim ≈ 1 piksel. */
        /* v44: 'low' kademede halkalar daralır ve uzak halka 4 karede bir
           çözülür — düşük telefonda iskelet CPU'su ~%35 iner, yakın halka
           (oyuncunun baktığı yer) yine her kare. */
        const lowT = Quality.tier === 'low';
        /* v53 B2 (ilk adım, VAT öncesi): GÖRÜŞ DIŞI rig 8 karede bir çözülür
           (dt yine biriktirilir → ekrana girdiğinde doğru pozda), stres
           yüksekken (Quality.stress > 0,5) orta/uzak halka bir kademe seyrelir. */
        const off = !game.inView(e.x, e.y, 60);
        const hot = (Quality.stress || 0) > 0.5 ? 1 : 0;
        const every = off ? 8 : lowT
          ? (d2 < 200 * 200 ? 1 : (d2 < 440 * 440 ? 2 + hot : 4 + hot))
          : (d2 < 260 * 260 ? 1 : (d2 < 560 * 560 ? 2 + hot : 3 + hot));
        if (every === 1 || ((af + i) % every) === 0) {
          /* DURUŞ: KLİBİ YAVAŞLATMAK YETMEZ, DİNLENME KARESİNE GÖTÜRÜLÜR.
             Önceki sürüm klibi %14 hıza düşürüyordu; figür nerede durduysa
             orada — çoğu zaman bir bacak havadayken — asılı kalıyordu:
             "animasyon yarıda kalmış" görüntüsü buydu. Şimdi klip zamanı
             ayakların BİRLEŞTİĞİ kareye (sp.restT, yüklemede ölçülür) EN KISA
             yoldan kaydırılır ve orada tutulur; nefes/ağırlık aktarma
             _poseCaster'dan biner. */
          /* POZU GERİ AL — MIXER'DAN ÖNCE. Delta çarpımı ancak kemik
             poz-öncesi değere döndürülmüşse tekrarlanabilir; mixer değer
             değişmediğinde kemiğe yazmıyor (bkz. _poseCaster). */
          if (p.bones && p.bones.saved) this._unposeCaster(p);
          if (idle && p.act && sp.restT != null) {
            const dur = p.act.getClip().duration;
            let dT = sp.restT - p.act.time;
            dT -= Math.round(dT / dur) * dur;             // sarmalı hesaba kat
            const step = p.aAcc * 3.2 + dt * 0.55;
            p.act.time = dT > step ? p.act.time + step
                       : (dT < -step ? p.act.time - step : sp.restT);
            if (p.act.time < 0) p.act.time += dur;
            else if (p.act.time > dur) p.act.time -= dur;
            if (p.bake) sampleBake(p.bake, p.bakeNodes, p.act.time);
            else p.mixer.update(0);
          } else if (p.bake) {
            /* v53 B2: klip saati elle ilerler (timeScale korunur), poz pişmiş tablodan */
            const dur = p.bake.dur;
            let t = p.act.time + p.aAcc * p.act.timeScale;
            t -= Math.floor(t / dur) * dur;
            p.act.time = t;
            sampleBake(p.bake, p.bakeNodes, t);
          } else {
            p.mixer.update(p.aAcc);
          }
          p.aAcc = 0;
          /* POZ, MIXER'IN HEMEN ARDINDAN uygulanır: kemik dönüşü mixer'ın
             yazdığı MUTLAK değerin üstüne bir DELTA olarak çarpılır. LOD
             karesinde mixer yazmadığı için delta ikinci kez çarpılsa kol
             tur atarak sürüklenirdi — bu yüzden ikisi tek blokta. */
          if (p.bones) this._poseCaster(p, e, game.time, sp);
        }
        const wantI = e.flash > 0 ? 3.2 : (e.elite ? EM.emI * 1.5 : EM.emI);
        if (p._emI !== wantI) {
          p._emI = wantI;
          for (let mi = 0; mi < p.mats.length; mi++) p.mats[mi].emissiveIntensity = wantI;  // renk GLB'den, sadece şiddet
        }
        shM.compose(shPos.set(p.sx, 0.3, p.sz), q.identity(), s.setScalar(EM.shadowR));
        this.enemyShadowMesh.setMatrixAt(sh++, shM);
      }
    return sh;
  }

  /**
   * MENZİLLİ DÜŞMANIN ASA POZU + YERİNDE DURMA (prosedürel, kemik düzeyinde).
   *
   * Model dosyasında TEK klip var (yürüyüş) — ne duruş ne atış klibi. İki
   * açık da burada kapanır ve ikisi de KEMİK üstünde çalışır, rig'i havaya
   * kaldırmaz: eski sürüm `rig.position.y += 4` yapıyordu ve büyücü her
   * atışta ZIPLIYOR gibi görünüyordu (kullanıcının teşhisi).
   *
   * Delta rotasyonlar mixer'ın yazdığı değerin üstüne çarpılır — klip
   * bozulmaz, yalnızca üstüne biner.
   */
  _poseCaster(p, e, t, sp) {
    const B = p.bones, Q = BONE_Q, AX = CAST_AXIS[sp.castAxis || 'z'];
    const moving = (e.mvAmt || 0) > 6;
    /* ATIŞ: e.atkAnim ateş anında 0,55'e kurulur ve geriye sayar, yani
       f = 1 tam ateş anıdır. Kol ÖNCE savrulur (f²: ani), sonra yavaşça
       geri gelir — kırbaç zamanlaması. */
    const a = e.atkAnim > 0 ? Math.min(1, e.atkAnim / 0.55) : 0;
    const f = a * a;
    /* DURMA: nefes + ağırlık aktarma. Genlik kasıtlı olarak küçük (0,03 rad):
       duran figür "canlı" olmalı ama sallanan bir figür sarhoş okunur. */
    const br = moving ? 0 : Math.sin(t * 1.5 + e.seed) * (1 - f);
    const sw = moving ? 0 : Math.sin(t * 0.9 + e.seed * 1.7) * (1 - f);
    /* SIRA: (mixer yazdı ya da yazmadı) → poz-ÖNCESİ değeri SAKLA →
       deltayı çarp. Saklama olmadan delta bir sonraki karede kendi
       sonucunun üstüne binerdi; mixer'ın "değer değişmediyse yazmam"
       davranışı yüzünden bu her DURAN büyücüde oluyordu (yani tam olarak
       ateş ettiği anda). Kapanış fonksiyonu kullanılmaz: bu yol her
       karede her büyücü için çalışır ve closure tahsisi GC duraklaması
       demektir (perf kural 1). */
    if (B.arm) {
      B.armS.copy(B.arm.quaternion);
      Q.setFromAxisAngle(AX, -1.35 * f - 0.07 * br); B.arm.quaternion.multiply(Q);
    }
    if (B.fore) {
      B.foreS.copy(B.fore.quaternion);
      Q.setFromAxisAngle(AX, -0.55 * f); B.fore.quaternion.multiply(Q);
    }
    if (B.spine) {
      B.spineS.copy(B.spine.quaternion);
      Q.setFromAxisAngle(AXIS_X, 0.11 * f + 0.03 * br); B.spine.quaternion.multiply(Q);
    }
    if (B.head) {
      B.headS.copy(B.head.quaternion);
      Q.setFromAxisAngle(AXIS_X, -0.06 * f - 0.02 * br); B.head.quaternion.multiply(Q);
    }
    /* gövdenin tamamı: atışta hafif geri tepme yatışı + dururken ağırlık
       aktarma. DİKEY hareket YOK — zıplama buradan geliyordu. */
    p.rig.rotation.z = 0.05 * f + 0.014 * sw;
    p.rig.position.y = p.rigY0;
  }

  /**
   * Bir düşman rig'inin ÖLÇÜLEN boy/zemin/merkez düzeltmesi.
   *
   * Klibin on iki karesinde deri-çözdürülmüş kutuların BİRLEŞİMİ alınır:
   * • min.y → ayağın döngü boyunca indiği EN ALÇAK nokta (zemin teması)
   * • max.y − min.y → figürün oynanıştaki gerçek boyu (ölçek buna bölünür)
   * • XZ merkezi → süpürülen hacmin merkezi (kol/bacak salınımı ortalanır)
   *
   * `Box3.setFromObject` BURADA KULLANILAMAZ: deri çözdürmeyi uygulamaz,
   * geometrinin bind kutusunu döndürür — eski ölçüm bu yüzden animasyonu
   * hiç görmüyordu. `SkinnedMesh.computeBoundingBox()` kemik dönüşümünü
   * uygular ve sonucu mesh'in YEREL uzayında verir (matrixWorld ile
   * holder uzayına taşınır; holder yükleme anında birim ölçekte).
   *
   * yawFix ZATEN rig'e yazılmış olarak ölçülür — merkez düzeltmesinin
   * dönüşle çarpımını elle hesaplamak gerekmez, ölçüm onu içeriyor.
   */
  _fitEnemyRig(p, def, clip) {
    const rig = p.rig, mixer = p.mixer, act = p.act;
    const meshes = [];
    rig.traverse((o) => { if (o.isMesh) meshes.push(o); });
    if (!meshes.length) return null;
    const box = new THREE.Box3(), tmp = new THREE.Box3();
    box.makeEmpty();
    rig.position.set(0, 0, 0);
    const anim = !!(act && clip && clip.duration > 0);
    const t0 = anim ? act.time : 0;
    const N = anim ? 12 : 1;
    for (let i = 0; i < N; i++) {
      if (anim) { act.time = (i / N) * clip.duration; mixer.update(0); }
      rig.updateMatrixWorld(true);
      for (const m of meshes) {
        if (m.isSkinnedMesh && m.computeBoundingBox) {
          m.computeBoundingBox();
          if (!m.boundingBox) continue;
          tmp.copy(m.boundingBox);
        } else {
          if (!m.geometry.boundingBox) m.geometry.computeBoundingBox();
          if (!m.geometry.boundingBox) continue;
          tmp.copy(m.geometry.boundingBox);
        }
        tmp.applyMatrix4(m.matrixWorld);
        box.union(tmp);
      }
    }
    if (anim) { act.time = t0; mixer.update(0); }
    if (box.isEmpty()) return null;
    const h = box.max.y - box.min.y;
    if (!(h > 0.0001)) return null;
    return {
      scale: def.height / h,
      pos: new THREE.Vector3(-(box.min.x + box.max.x) / 2, -box.min.y,
                             -(box.min.z + box.max.z) / 2),
    };
  }

  /**
   * DÜŞMAN ÖLDÜ — modelli slot varsa CESEDE ÇEVİRİR (2026-08-29).
   *
   * enemyManager.onDeath çağırır. Eski ölüm geri bildirimi ortak isabet
   * katmanının kademe 2 mührüydü (geniş katkısal halka + flaş) ve kullanıcı
   * haklı olarak "her ölümde patlama oluyor, iyi durmuyor" dedi: patlama
   * ekranda kritik vuruş ve alan hasarıyla AYNI dili konuşuyor, üstelik ölen
   * şeyin nereye gittiğini anlatmıyordu.
   *
   * İki önemli kapı:
   * • EKRAN DIŞINDA ÇÖKÜŞ YOK — görünmeyen ceset yarım saniye boyunca bir
   *   model slotunu ve bir gölge yuvasını tutar; kalabalık dalgada bu,
   *   oyuncunun GÖRDÜĞÜ düşmanların kapsüle düşmesi demektir (isabet
   *   katmanının görüş kapısıyla birebir aynı gerekçe).
   * • PATLAYICI KOŞUCU cesedi Bırakmaz (quiet=true): o düşman kendini
   *   havaya uçurdu, geride yatıp devrilecek bir gövde yok.
   *
   * @param ang   son darbenin açısı (combat.applyHit → e.hurtAng)
   * @param quiet ceset bırakma (patlayarak ölen düşman)
   */
  enemyDeath(e, ang, quiet) {
    const groups = this._enemyModels;
    if (!groups) return;
    for (let gi = 0; gi < groups.length; gi++) {
      const pool = groups[gi].pool;
      for (let i = 0; i < pool.length; i++) {
        const p = pool[i];
        if (p.e !== e) continue;
        p.e = null;
        if (quiet || !p.holder.visible) { p.holder.visible = false; return; }
        p.dead = CORPSE_T;
        p.deadAng = ang || 0;
        p.sx = e.x; p.sz = e.y;
        p.fl = 0;
        if ((this._flyN | 0) < 12 && !e.elite) { p.fl = e.stopMv ? 64 : 28; this._flyN = (this._flyN | 0) + 1; }
        return;
      }
    }
  }

  /** Poz deltasını geri al: kemikler mixer'ın (en son) yazdığı değere döner. */  _unposeCaster(p) {
    const B = p.bones;
    if (B.arm) B.arm.quaternion.copy(B.armS);
    if (B.fore) B.fore.quaternion.copy(B.foreS);
    if (B.spine) B.spine.quaternion.copy(B.spineS);
    if (B.head) B.head.quaternion.copy(B.headS);
  }

  _updateEnemies(game, dt) {
    const act = game.enemies.pool.active;
    /* SIFIR TAHSİS: geçiciler perf.js'teki paylaşılan kümeden gelir.
       Eskiden burada kare başına 9 nesne + düşman başına 1 Vector3
       (kalabalıkta saniyede ~28.000) tahsis ediliyordu — GC duraklamalarının
       ana kaynağı buydu. */
    const m = TMP.m4, q = TMP.q, s = TMP.v, pos = TMP.vb;
    const col = TMP.col, eyeCol = TMP.colb;
    const AX = AXIS_Y;
    let idx = 0;
    let bossFound = null;
    const shM = TMP.m4b, shPos = TMP.vc;
    let sh = 0;

    /* ── dünyaya özgü iskeletli düşmanlar ──
       KALICI ATAMA: bir model slotu bir düşmana bağlanır ve düşman ölene (ya da
       ekran dışına çıkıp yerini ekrandaki birine bırakana) kadar onda kalır.
       Eskiden slotlar her karede mesafeye göre yeniden sıralanıyordu; aynı rig
       kare arasında başka düşmana geçince ışınlanma + animasyon teklemesi
       görünüyordu. Boy TEK TİP sabittir (radius/elit ölçeği uygulanmaz) —
       boss / yüksek canlı / farklı tipler kendi tasarımlarını alacak. */
    const wdEM = game.worldDef ? game.worldDef() : null;
    this._ensureEnemyModels(wdEM ? wdEM.floor : null);
    const groups = this._enemyModels;
    const tok = (this._mdlTok = (this._mdlTok || 0) + 1);
    /* DÜNYA BAŞINA ÇOK MODEL: her tip kendi slot havuzunu, boyunu ve
       animasyon klibini taşır. Gruplar sırayla sürülür; bir düşman types
       eşlemesi gereği yalnızca TEK bir gruba ait olduğu için bağlama
       damgaları (__bound / __aliveTok) gruplar arasında çakışmaz. */
    if (groups) {
      /* Animasyon LOD sayacı gruplar ARASINDA paylaşılır — her grup kendi
         sayacını tutsaydı hepsi aynı karede güncellenip sivri uç yapardı. */
      const af = (this._animFrame = ((this._animFrame || 0) + 1) & 1023);
      for (let gi = 0; gi < groups.length; gi++) {
        sh = this._driveModelGroup(game, dt, groups[gi], act, tok, sh, af);
      }
    }

    for (let i = 0; i < act.length; i++) {
      const e = act[i];
      if (e.isBoss) { bossFound = e; continue; }
      if (e.__mdlTok === tok) continue;         // gerçek modelle çizildi
      if (idx >= this._enemyMax) break;
      const scale = e.radius * (e.elite ? 1.28 : 1) / 15;
      const bob = Math.sin(e.bob * 4 + e.seed) * 1.6;
      pos.set(e.x, 11 * scale + bob, e.y);
      const yaw = Math.atan2(game.player.x - e.x, game.player.y - e.y);
      q.setFromAxisAngle(AX, yaw);
      /* v39: modelsiz (örnekli) düşmanlar da aynı yaylı ezilmeyi alır —
         kalabalığın büyük kısmı bunlar ve vuruşa hiç gövde tepkisi yoktu */
      if (e.hitT > 0) {
        const hu = 1 - e.hitT / (e.hitD || 0.15), iu = 1 - hu;
        const sq = Math.cos(hu * 4.7) * iu * iu;
        pos.x += Math.cos(e.hurtAng || 0) * 6 * iu * iu;
        pos.z += Math.sin(e.hurtAng || 0) * 6 * iu * iu;
        m.compose(pos, q, s.set(scale * (1 + 0.09 * sq), scale * (1 - 0.15 * sq), scale * (1 + 0.09 * sq)));
      } else {
        m.compose(pos, q, s.setScalar(scale));
      }
      this.enemyMesh.setMatrixAt(idx, m);
      col.setHex(e.flash > 0 ? 0xffffff : hexOf(e.color));
      this.enemyMesh.setColorAt(idx, col);

      const eyePos = TMP.vd.copy(pos);
      eyePos.x += Math.sin(yaw) * 5 * scale;
      eyePos.z += Math.cos(yaw) * 5 * scale;
      eyePos.y += 8 * scale;
      m.compose(eyePos, q, s.set(2.2 * scale, 2.2 * scale, 2.2 * scale));
      this.eyeMesh.setMatrixAt(idx, m);
      eyeCol.setHex(e.type === 'atici' ? 0x8ff5c8 : 0xbaf29a);
      this.eyeMesh.setColorAt(idx, eyeCol);

      shM.compose(shPos.set(e.x, 0.3, e.y), q.identity(), s.setScalar(scale * 9));
      if (sh < this._enemyMax) this.enemyShadowMesh.setMatrixAt(sh++, shM);
      idx++;
    }

    /* Boss KISMİ YÜKLEMEDEN ÖNCE sürülür: yuvarlak zemin gölgesi aynı
       instanced mesh'in bir yuvasını kullanıyor, commit'ten sonra yazılsa
       o yuva bu karede GPU'ya hiç gitmezdi (bir kare gecikmeli gölge). */
    if (bossFound) sh = this._driveBoss(game, bossFound, sh, dt);
    else this.bossMesh.visible = false;

    /* KISMİ YÜKLEME: sahnede 12 düşman varken 480 örnekli tamponun
       tamamını GPU'ya göndermek (3 mesh × 30 KB × 60 kare ≈ 5 MB/sn)
       mobil bellek yolunda doğrudan kare süresine dönüşüyordu. */
    commitInstanced(this.enemyMesh, idx, true);
    commitInstanced(this.eyeMesh, idx, true);
    commitInstanced(this.enemyShadowMesh, sh, false);
  }

  _updateProjectiles(game) {
    const m = TMP.m4, q = TMP.q, s = TMP.v, pos = TMP.vb, col = TMP.col;
    let idx = 0;
    const max = this._bulletMax;

    const addBullet = (x, y, r, colorHex) => {
      if (idx >= max) return;
      m.compose(pos.set(x, Math.max(6, r), y), q.identity(), s.setScalar(Math.max(1, r)));
      this.bulletMesh.setMatrixAt(idx, m);
      col.setHex(hexOf(colorHex));
      this.bulletMesh.setColorAt(idx, col);
      idx++;
    };

    /* metal gülleler ayrı mesh'te — öz-ışık katkısı olmayan materyal */
    let mi = 0;
    const mmax = this._bulletMetalMax;
    const addMetal = (x, y, r, colorHex) => {
      if (mi >= mmax) return;
      m.compose(pos.set(x, Math.max(6, r), y), q.identity(), s.setScalar(Math.max(1, r)));
      this.bulletMetalMesh.setMatrixAt(mi, m);
      col.setHex(hexOf(colorHex));
      this.bulletMetalMesh.setColorAt(mi, col);
      mi++;
    };

    /* oklar ayrı mesh'te: gerçek siluet + hıza göre yön + alev tonu/ölçek */
    const AXY = AXIS_Y;
    const acol = TMP.colb;
    let ai = 0;
    const amax = this._arrowMax;

    /* KOR TOPU (GÖKALEV): küre yerine kameraya bakan yalım katmanları.
       Ateş mesh'leri isabet flaşlarıyla PAYLAŞILIR — commit _updateFireHits
       içinde, hepsi yazıldıktan sonra bir kez yapılır. */
    let fb = 0, fg = 0;
    const fbmax = this._fireFlameMax, fgmax = this._fireGlowMax;
    const fmesh = this.fireFlameMesh, gmesh = this.fireGlowMesh;
    const lite = Quality.stress > 0.55;
    const T = game.time;
    const FY = this._fireHitY || 44;
    /* ATEŞ TOPU (kuyruklu yıldız) ─ DİKEY MUM ALEVİ DEĞİL.
       İlk sürüm yalımları ekranda dikey çiziyordu: mermi uçuyor ama alev
       yukarı bakıyordu, bu yüzden "mum" gibi okunuyordu. Artık silue:
       ÖNDE beyaz-sıcak BAŞ (yuvarlak) + ARKAYA savrulan yalım kuyruğu.
       Yalım dokusunun ucu (yerel +Y) EKRAN uzayında hızın TERSİNE döndürülür;
       kamera yaw'ı sabit olduğu için bu tek bir atan2 ile hesaplanır
       (dünya +Z ekrana doğru gelir, o yüzden dikey bileşen cos(TILT) ile
       kısalır — aksi halde kuyruk ekranda yanlış açıda durur). */
    const addFire = (b, P, rs) => {
      P = P || FIRE_PAL.blue;
      const ph = b.ph || 0;
      const r = (b.r || 10) * (rs || 1);
      const sp = Math.sqrt(b.vx * b.vx + b.vy * b.vy) || 1;
      const ux = b.vx / sp, uy = b.vy / sp;           // ileri (dünya)
      const pxx = -uy, pzz = ux;                      // dik (salınım için)
      /* sprite ucunu kuyruğa çevir: (0,1) → ekranda -hız yönü */
      const spin = Math.atan2(b.vx, b.vy * COS_TILT);
      const w1 = Math.sin(T * 17.0 + ph * 3.1);
      const w2 = Math.sin(T * 11.3 + ph * 5.7);
      /* BAŞ: beyaz-sıcak çekirdek + mavi hale (referanstaki parlak çekirdek) */
      if (fg + 2 <= fgmax) {
        const c = 0.90 + w1 * 0.08;
        this._bb(gmesh, fg++, b.x, FY, b.y, r * 2.0, r * 2.0, 0, c * P.cr, c * P.cg, c * P.cb);
        this._bb(gmesh, fg++, b.x, FY, b.y, r * 5.2, r * 4.6, 0, P.gx, P.gy, P.gz);
      }
      /* KUYRUK: geriye doğru küçülen üç yalım. Her biri dik yönde ayrı
         frekansta salınır — tek hizada dizilirse "roket izi" gibi düz durur. */
      const segs = lite ? 2 : 3;
      for (let k = 0; k < segs && fb < fbmax; k++) {
        const d = r * (1.5 + k * 2.0);
        const wob = Math.sin(T * 15 + ph * 2.3 + k * 2.1) * r * (0.22 + k * 0.16);
        const len = r * (5.0 - k * 1.1);
        const wid = r * (3.0 - k * 0.55);
        const a = 1 - k * 0.30;
        this._bb(fmesh, fb++,
          b.x - ux * d + pxx * wob, FY + Math.sin(T * 9 + k) * r * 0.10, b.y - uy * d + pzz * wob,
          wid, len, spin + Math.sin(T * 8.5 + ph + k * 1.7) * 0.16,
          a * P.tx * (1 - k * 0.22), a * P.ty * (1 - k * 0.22), a * P.tz);
      }
      /* SAÇAK: başın iki yanından geriye kopan ince diller — referanstaki
         yırtık kenarı veren şey bu (tek düzgün kuyruk "jet" okunur). */
      if (!lite && fb + 2 <= fbmax) {
        for (let k = 0; k < 2; k++) {
          const s2 = k === 0 ? 1 : -1;
          const d = r * (1.9 + (k === 0 ? w1 : w2) * 0.5);
          const off = s2 * r * (1.05 + 0.25 * (k === 0 ? w2 : w1));
          this._bb(fmesh, fb++,
            b.x - ux * d + pxx * off, FY + s2 * r * 0.18, b.y - uy * d + pzz * off,
            r * 1.15, r * 3.4, spin + s2 * (0.34 + (k === 0 ? w1 : w2) * 0.18),
            P.fx, P.fy, P.fz);
        }
      }
    };

    game.pools.pBullets.each((b) => {
      if (b.fireball) {
        addFire(b);
      } else if (b.isArrow) {
        if (ai >= amax) return;
        const yaw = Math.atan2(b.vx, b.vy);           // +Z ok → hız yönü
        q.setFromAxisAngle(AXY, yaw);
        const ft = Math.min(3, b.flame | 0);
        const sc = 1 + ft * 0.16;
        m.compose(pos.set(b.x, 20, b.y), q, s.set(sc, sc, sc));
        this.arrowMesh.setMatrixAt(ai, m);
        acol.setHex(FLAME_HEX[ft]);
        this.arrowMesh.setColorAt(ai, acol);
        ai++;
      } else if (b.metal) {
        addMetal(b.x, b.y, b.r, b.color);
      } else {
        addBullet(b.x, b.y, b.r, b.color);
      }
    });
    /* DÜŞMAN MERMİSİ — artık küre değil YALIM: oyuncunun kor topuyla aynı
       kuyruklu alev yolundan geçer, kimlik yalnız renkten gelir (büyücü
       nekro yeşili · boss hasat kızılı). Yeni mesh/doku YOK; çarışma
       yarıçapı (b.r) DEĞİŞMEZ, yalnız görsel ölçek büyür (rs) — 5 birimlik
       küre "yeşil ufak top" olarak okunuyordu. */
    game.pools.eBullets.each((b) => addFire(b, b.hue ? FIRE_PAL.harvest : FIRE_PAL.necro, 1.45));

    this._fbUsed = fb; this._fgUsed = fg;
    commitInstanced(this.bulletMesh, idx, true);
    commitInstanced(this.bulletMetalMesh, mi, true);
    commitInstanced(this.arrowMesh, ai, true);
  }

  _updateGems(game) {
    /* Tüm geçici nesneler modül/örnek düzeyinde tutuluyor: kare başına 380
       cevher × (Vector3+Euler+dizi) tahsisi GC'yi tetikleyip FPS düşürüyordu. */
    const m = this._gTmpM || (this._gTmpM = new THREE.Matrix4());
    const q = this._gTmpQ || (this._gTmpQ = new THREE.Quaternion());
    const s = this._gTmpS || (this._gTmpS = new THREE.Vector3());
    const pos = this._gTmpP || (this._gTmpP = new THREE.Vector3());
    const eul = this._gTmpE || (this._gTmpE = new THREE.Euler());
    const col = this._gTmpC || (this._gTmpC = new THREE.Color());
    const colGlow = this._gTmpCG || (this._gTmpCG = new THREE.Color());
    const colCore = this._gTmpCK || (this._gTmpCK = new THREE.Color());
    const qr = this._gTmpQR || (this._gTmpQR = new THREE.Quaternion());
    const posR = this._gTmpPR || (this._gTmpPR = new THREE.Vector3());
    const TIERS = GEM_SOULS;
    let idx = 0;
    const max = this._gemMax;
    const t = game.time;
    const camQuat = this.camera.quaternion;
    game.pools.gems.each((g) => {
      if (idx >= max) return;
      const tier = TIERS[g.tier] || TIERS[0];
      const ph = g.bob;
      /* YERİNDE DURMA ANİMASYONU — hepsi sinüs, ek çizim yok:
         yavaş süzülme + ekseninde tembel dönüş + alev fitili gibi uzayıp
         kısalma (dikey/yatay ters faz). Vuruş flaşları ani ve kısa ömürlüdür;
         ruh ise sürekli, yavaş ve dikey — gözde asla karışmaz. */
      const bob = Math.sin(ph + t * 1.7) * 1.8;
      const y = 16 + bob;
      const spin = t * 0.75 + ph;
      const tilt = Math.sin(t * 2.0 + ph * 1.7) * 0.075;
      eul.set(tilt, spin, tilt * 0.5);
      q.setFromEuler(eul);
      /* alev flikeri: boy uzarken en daralır (hacim korunur gibi) */
      const flick = Math.sin(t * 3.6 + ph) * 0.10 + Math.sin(t * 7.9 + ph * 2.3) * 0.035;
      const hS = tier.r * (1 + flick);
      const wS = tier.r * (1 - flick * 0.55);
      pos.set(g.x, y, g.y);
      m.compose(pos, q, s.set(wS, hS, wS));
      this.gemMesh.setMatrixAt(idx, m);
      col.setHex(hexOf(tier.c));
      this.gemMesh.setColorAt(idx, col);

      /* iç çekirdek: ters fazda titrer → içinde bir şey yanıyor izlenimi */
      m.compose(pos, q, s.set(wS * 0.98, hS * (1 - flick * 0.8), wS * 0.98));
      this.gemCoreMesh.setMatrixAt(idx, m);
      colCore.setHex(hexOf(tier.k));
      this.gemCoreMesh.setColorAt(idx, colCore);

      /* zemindeki mührür halka: ters yönde ağır ağır döner, hafif nefes alır */
      eul.set(0, -spin * 0.5, 0);
      qr.setFromEuler(eul);
      posR.set(g.x, 0.7, g.y);
      const ringS = tier.r * (1.45 + Math.sin(t * 1.9 + ph) * 0.09);
      m.compose(posR, qr, s.set(ringS, ringS, ringS));
      this.gemRingMesh.setMatrixAt(idx, m);
      this.gemRingMesh.setColorAt(idx, col);

      /* kameraya dönük kızıl hale — gövdeyle ters fazda nefes alır */
      const halo = 2.9 + Math.sin(t * 2.4 + ph * 1.3) * 0.3;
      m.compose(pos, camQuat, s.setScalar(tier.r * halo));
      this.gemGlowMesh.setMatrixAt(idx, m);
      colGlow.setHex(hexOf(tier.g));
      this.gemGlowMesh.setColorAt(idx, colGlow);
      idx++;
    });
    /* 4 mesh × 400 örnek = kare başına ~102 KB tam tampon yüklemesiydi
       (yerde 3 cevher varken bile). Artık yalnızca kullanılan ön kısım. */
    commitInstanced(this.gemMesh, idx, true);
    commitInstanced(this.gemCoreMesh, idx, true);
    commitInstanced(this.gemRingMesh, idx, true);
    commitInstanced(this.gemGlowMesh, idx, true);
  }

  _updateParticles(game) {
    const geo = this.particlePoints.geometry;
    const posAttr = geo.attributes.position;
    const colAttr = geo.attributes.color;
    const col = TMP.col;
    /* bütçe artık uyarlanır: cihaz zorlanınca Quality.stress partikül
       adedini kısar (bkz. perf.js FLEX tablosu) — kapasiteyi aşan
       partiküller çizilmez ama simülasyonda yaşamaya devam eder. */
    const cap = Math.min(this._particleCap, Quality.budget('particles'));
    let idx = 0;
    const act = game.pools.particles.active;
    for (let i = 0; i < act.length && idx < cap; i++) {
      const o = act[i];
      posAttr.setXYZ(idx, o.x, 6, o.y);
      col.setHex(hexOf(o.color));
      const a = Math.max(0, Math.min(1, o.life / o.max));
      colAttr.setXYZ(idx, col.r * a, col.g * a, col.b * a);
      idx++;
    }
    uploadInstances(posAttr, idx, 3);
    uploadInstances(colAttr, idx, 3);
    geo.setDrawRange(0, idx);
  }

  _updateZones(game) {
    const zones = game.pools.zones.active;
    for (let i = 0; i < this.zoneMeshes.length; i++) {
      const mesh = this.zoneMeshes[i];
      const z = zones[i];
      if (!z) { mesh.visible = false; continue; }
      mesh.visible = true;
      const pulse = 1 + Math.sin(game.time * 6 + z.seed) * 0.05;
      const a = Math.min(1, (z.max - z.life) * 4, z.life * 1.6);
      mesh.position.set(z.x, 1, z.y);
      mesh.scale.setScalar(z.r * pulse);
      /* MAVİ KOR birikintisi aynı havuzu kullanır, rengi ayrı: disk daha
         sönük çünkü asıl gösteri üstündeki yalımlar (_pushFireZones). */
      const zh = z.blue ? 0x2f86ff : 0xff5a3c;
      if (mesh.__zhex !== zh) { mesh.__zhex = zh; mesh.material.color.setHex(zh); }
      mesh.material.opacity = (z.blue ? 0.20 : 0.3) * a;
    }
  }

  /** TEHLİKE ALANLARI — düşmanın yer hasarı (kral nabzı · ejder zehri/zıplaması).
      İki dil, tek mesh: KIZIL = birazdan patlayacak, YEŞİL = zehir gölü.
      Telegraf opaklığı zamanla ARTAR (0,16 → 0,52): oyuncu "ne kadar kaldı"
      sorusunu sayı okumadan cevaplar. */
  _updateHazards(game) {
    const ms = this.hazardMeshes, fs = this.hazardFills;
    if (!ms) return;
    const hz = game.pools.hazards ? game.pools.hazards.active : null;
    for (let i = 0; i < ms.length; i++) {
      const mesh = ms[i], fill = fs[i];
      const h = hz ? hz[i] : null;
      if (!h) {
        if (mesh.visible) { mesh.visible = false; fill.visible = false; }
        continue;
      }
      mesh.visible = true; fill.visible = true;
      mesh.position.set(h.x, 1.4, h.y);
      fill.position.set(h.x, 1.2, h.y);
      const oct = h.kind === 0, G = this._hzGeo;
      if (mesh.__oct !== oct) { mesh.__oct = oct; mesh.geometry = oct ? G.ringO : G.ringR; fill.geometry = oct ? G.fillO : G.fillR; }
      if (oct) { mesh.rotation.z = h.t * 0.9; fill.rotation.z = mesh.rotation.z; }
      if (h.kind === 0) {
        const k = Math.min(1, h.t / Math.max(0.001, h.tell));
        /* patlama anından sonra hızla sönüyor — sönmezse oyuncu tehdidin
           bittiğini anlamaz ve o noktadan kaçınmaya devam eder */
        const after = h.t > h.tell ? Math.max(0, 1 - (h.t - h.tell) / 0.28) : 1;
        mesh.scale.setScalar(h.r);
        mesh.material.opacity = (0.34 + 0.34 * k) * after;
        fill.scale.setScalar(h.r * k);
        fill.material.opacity = 0.20 * after;
      } else {
        /* zehir gölü: yavaş nefes alır, sonunda solar */
        const fade = Math.min(1, (h.dur - h.t) * 2.2, h.t * 4);
        const br = 1 + Math.sin(game.time * 2.4 + h.seed) * 0.03;
        mesh.scale.setScalar(h.r * br);
        mesh.material.opacity = 0.42 * Math.max(0, fade);
        fill.scale.setScalar(h.r * 0.96 * br);
        fill.material.opacity = 0.17 * Math.max(0, fade);
      }
      const hex = h.hue ? 0x6ad65a : 0xff4a5e;
      if (mesh.__hz !== hex) {
        mesh.__hz = hex;
        mesh.material.color.setHex(hex);
        fill.material.color.setHex(hex);
      }
    }
  }

  _updateRings(game) {
    const rings = game.pools.rings.active;
    for (let i = 0; i < this.ringMeshes.length; i++) {
      const mesh = this.ringMeshes[i];
      const o = rings[i];
      if (!o) { mesh.visible = false; continue; }
      mesh.visible = true;
      const a = o.life / o.maxLife;
      mesh.position.set(o.x, 4, o.y);
      mesh.scale.setScalar(Math.max(0.1, o.r));
      mesh.material.opacity = a * 0.85;
      const rh = hexOf(o.color);
      if (mesh.__hex !== rh) { mesh.__hex = rh; mesh.material.color.setHex(rh); }
    }
  }

  _updateBolts(game) {
    const bolts = this.game.weapons ? this.game.weapons.bolts : null;
    if (!bolts) return;
    for (let i = 0; i < this.boltMeshes.length; i++) {
      const mesh = this.boltMeshes[i];
      const b = bolts[i];
      if (!b || b.life <= 0) { mesh.visible = false; continue; }
      mesh.visible = true;
      const a = b.life / 0.28;
      mesh.position.set(b.x, 0, b.y);
      mesh.children[0].material.opacity = 0.6 * a;
      mesh.children[1].material.opacity = 0.6 * a;
    }
  }

  _updateBombs(game) {
    const bombs = game.pools.bombs.active;
    for (let i = 0; i < this.bombMeshes.length; i++) {
      const mesh = this.bombMeshes[i];
      const b = bombs[i];
      if (!b) { mesh.visible = false; continue; }
      mesh.visible = true;
      mesh.position.set(b.x, 8 + b.h, b.y);
      mesh.rotation.y = b.spin;
    }
  }

  _updateOrbitBlades(game) {
    const W = game.weapons;
    const lvl = W ? W.lvl('bicak') : 0;
    if (!lvl) { for (const m of this.bladeMeshes) m.visible = false; return; }
    const conf = W.W.bicak;
    const L = lvl - 1;
    const n = conf.count[L];
    const R = conf.radius[L];
    const p = game.player;
    for (let i = 0; i < this.bladeMeshes.length; i++) {
      const mesh = this.bladeMeshes[i];
      if (i >= n) { mesh.visible = false; continue; }
      mesh.visible = true;
      const a = W.orbitA + (i / n) * Math.PI * 2;
      mesh.position.set(p.x + Math.cos(a) * R, 20, p.y + Math.sin(a) * R);
      mesh.rotation.y = -a;
    }
  }

  _updateSwordArc() {
    /* Eski düz yer-halkası KALDIRILDI: savurma izi artık kılıç bıçağına bağlı
       (bkz. _updateSword → swordTrail), yerde yatan ikinci bir halka izi
       çiftleştiriyordu. Halka kapalı tutulur; eski gövde (her karede
       dispose + new RingGeometry yapan sürüm) tamamen silindi. */
    if (this.swordArc) this.swordArc.visible = false;
  }

  _updateHpBars(game) {
    const bg = this.hpBgMesh, fill = this.hpFillMesh;
    const m = TMP.m4, s = TMP.v, pos = TMP.vb, col = TMP.col;
    const q = this.camera.quaternion;
    let idx = 0;
    const max = this._hpMax;

    const addBar = (x, y, z, width, height, frac, colorHex) => {
      if (idx >= max) return;
      pos.set(x - width / 2, y, z);
      m.compose(pos, q, s.set(width, height, 1));
      bg.setMatrixAt(idx, m);
      m.compose(pos, q, s.set(Math.max(0.001, width * frac), height, 1));
      fill.setMatrixAt(idx, m);
      col.setHex(hexOf(colorHex));
      fill.setColorAt(idx, col);
      idx++;
    };

    const p = game.player;
    if (p.hp < p.maxHp - 0.5) {
      const frac = Math.max(0, p.hp / p.maxHp);
      /* karakterin BAŞININ ÜSTÜNDE yüzsün (gövdenin içine girmesin) */
      const py = (this._heroTopY || 60) + 12;
      addBar(p.x, py, p.y, 34, 5, frac, frac > 0.35 ? COLORS.gold : COLORS.blood);
    }

    const act = game.enemies.pool.active;
    for (let i = 0; i < act.length; i++) {
      const e = act[i];
      if (e.hp >= e.maxHp - 0.5 && !e.affix) continue;
      const frac = Math.max(0, e.hp / e.maxHp);
      if (e.isBoss) {
        /* Görsel tepe _driveBoss'ta ÖLÇÜLÜR (süzülme yüksekliği + model boyu),
           tahmin edilmez: eski sabit 108 birim yer tutucu kapsülün ölçüsüydü
           ve 150 birimlik lordun göğsüne düşüyordu. */
        addBar(e.x, (this._bossTopY || 108) + 16, e.y, 120, 7, frac, COLORS.blood);
      } else {
        /* Bar YÜKSEKLİĞİ artık düşmanın GERÇEK görsel boyundan gelir:
           modelli düşmanda kayıtlı model boyu (hortlak 76, muhafız 104…),
           kapsül düşmanda kapsülün tepe noktası (22 birim × ölçek).
           Eski sabit formül (34×ölçek+14) uzun modellerde barı figürün
           göğsüne, kısa kapsüllerde çok yükseğe koyuyordu. */
        const scale = e.radius * (e.elite ? 1.28 : 1) / 15;
        const top = (e.__mdlTok === this._mdlTok && e.__mdlTop) ? e.__mdlTop : 22 * scale;
        const w = Math.max(18, Math.min(48, top * 0.42));
        if (e.affix) {
          /* v53 D5: elit çubuğu her zaman görünür, değiştirici renginde; kalkan üstte ince şerit */
          const ww = w * 1.25;
          addBar(e.x, top + 8 + top * 0.07, e.y, ww, 5.5, frac, e.affixCol || COLORS.blood);
          if (e.shieldHp > 0) addBar(e.x, top + 15 + top * 0.07, e.y, ww, 2.5, e.shieldHp / e.shieldMax, '#cfd6e2');
        } else addBar(e.x, top + 8 + top * 0.07, e.y, w, 4.5, frac, COLORS.blood);
      }
    }

    commitInstanced(bg, idx, false);
    commitInstanced(fill, idx, true);
  }
}
