/* ═══════════════════════════════════════════════════════════
   weapons.js — Cephanelik ve Rün Seçimi

   Beş silahın tamamı burada yaşar:
   1. Hilal Kılıcı  — öne savrulan sektör (yay) hasarı, auto-aim
   2. Gölge Bıçakları — oyuncu çevresinde yörünge, temas hasarı
   3. Kor Çemberi   — yerde beliren, tık başı hasar veren alan
   4. Gök Gazabı    — ekrandaki rastgele hedeflere yıldırım
   5. Ruh Oku       — en yakın düşmana kilitli, delici mermi

   Ayrıca level-up ekranının seçim havuzu (rollChoices) ve
   seçimlerin uygulanması (applyChoice) buradadır.

   Performans notları:
   • Tüm sorgular enemyManager'ın spatial grid'inden geçer.
   • scratch dizileri yeniden kullanılır — sıcak yolda sıfır tahsis.
   • Kapanışlar (closure) kurucuda BİR KEZ yaratılır.
   ═══════════════════════════════════════════════════════════ */

import { WEAPONS, WEAPON_STATS, WEAPON_META, CLASS_SYNERGIES, SPECIAL_PERKS,
         SIGNATURES, PASSIVES, STARTING_WEAPON, COLORS } from './config.js?v=20260930m';
import { applyHit, resetFeel } from './combat.js?v=20260930m';
import { Haptics, Quality } from './perf.js?v=20260930m';

const TAU = Math.PI * 2;

/* ═══ v53 D1 — SİLAH EVRİMİ ═══
   İmza silahı üst forma geçer: kahramanın imza kademeleri toplamı ≥ 5 VE
   eşli pasif rün ≥ 2. seviye → kart havuzuna BİR KEZ "EVRİM" kartı girer.
   Güç payı sınırlı (hasar ×1,18 · bekleme ×0,90 ≈ +%31, bant ≤ +%35) — asıl
   ödül kimlik: yeni ad, altın kart, ekranda dönüşüm anı, koleksiyonda kayıt.
   Yalnız WEAPONS'ta TANIMLI alanlara yazılır (applySpecial sözleşmesi). */
/* v62 D2 · LANETLİ KARTLAR — artı ≈ 2× nimet, eksi gerçek (balance W: artı − eksi ≈ +8…+12 puan) */
/* v63 D1 · ETİKET SİNERJİSİ — her rün kartı bir etiket taşır; 2/4/6 kartta etiket bonusu açılır.
   Evrimden ayrı güç payı (balance W): 2 ≈ 5 · 4 ≈ 8 · 6 ≈ 12 puan → tam set ≈ 25, tek koşuda en çok bir tam set.
   Etiket kaynağı: pasif kimliği (PAS_TAG), imza/özel perk kahramanın etiketi (HERO_TAG), KADİM GÜÇ = KOR. */
export const TAGS = {
  KOR:      { col: '#ff8a4a', tiers: [
    { n: 2, name: 'Kor Kıvılcımı', desc: 'Hasar +%5',                    mods: { dmgPct: 0.05 } },
    { n: 4, name: 'Kor Patlaması', desc: 'Patlama şansı +%8',            mods: { explodeChance: 0.08 } },
    { n: 6, name: 'Kızıl Kıyamet', desc: 'Hasar +%10 · patlama hasarı +%25', mods: { dmgPct: 0.10, explodeDmgPct: 0.25 } } ] },
  AYAZ:     { col: '#8fd6ff', tiers: [
    { n: 2, name: 'Kırağı',        desc: 'Zırh +1',                      mods: { armor: 1 } },
    { n: 4, name: 'Buz Keskisi',   desc: 'Kritik şansı +%6',             mods: { critChance: 0.06 } },
    { n: 6, name: 'Ebedî Kış',     desc: 'Kaçınma +%6 · can +20',        mods: { dodge: 0.06, maxHp: 20 } } ] },
  YILDIRIM: { col: '#d9f2ff', tiers: [
    { n: 2, name: 'Statik',        desc: 'Atış hızı +%6',                mods: { atkPct: 0.06 } },
    { n: 4, name: 'Şimşek Adımı',  desc: 'Hareket hızı +%6',             mods: { speedPct: 0.06 } },
    { n: 6, name: 'Gök Gürlemesi', desc: 'Atış hızı +%10',               mods: { atkPct: 0.10 } } ] },
  RUH:      { col: '#59e3c8', tiers: [
    { n: 2, name: 'Ruh Çekimi',    desc: 'Mıknatıs +%25',                mods: { magnetPct: 0.25 } },
    { n: 4, name: 'Ruh Hasadı',    desc: 'Tecrübe +%15',                 mods: { xpPct: 0.15 } },
    { n: 6, name: 'Ruh Pınarı',    desc: 'Yenilenme +1,5 · can çalma +%2', mods: { regen: 1.5, lifeSteal: 0.02 } } ] },
  CELIK:    { name: 'ÇELİK', col: '#cfd6e2', tiers: [
    { n: 2, name: 'Demir Deri',    desc: 'Can +15',                      mods: { maxHp: 15 } },
    { n: 4, name: 'Kale Duvarı',   desc: 'Zırh +2',                      mods: { armor: 2 } },
    { n: 6, name: 'Yıkılmaz',      desc: 'Can +30 · zırh +1',            mods: { maxHp: 30, armor: 1 } } ] },
};
export const tagName = (t) => (TAGS[t] && TAGS[t].name) || t;
/* v70 B1 · PASİF HAVUZU 7 → 15. Etiket kaynağı eşitlendi (AYAZ 2 kaynaktan 4'e; her etiket ≥3).
   Yalnız MEVCUT mod anahtarları (player.applyMods) — yeni mekanik yok. Kademe başı ≈ 5-11 W puanı
   (balance W; mevcut pasifler 4-13 aralığında). config'e değil buraya: config 30 modülün içe aldığı dosya. */
const EXTRA_PASSIVES = {
  kiragi:   { name: 'Kırağı Kabuğu', desc: 'Zırh +1, azami can +10.',              maxLevel: 4, mods: { armor: 1, maxHp: 10 } },
  buzkalp:  { name: 'Buz Kalbi',     desc: 'Kritik vuruşların %22 daha sert.',      maxLevel: 4, mods: { critMult: 0.22 } },
  hayalet:  { name: 'Hayalet Adım',  desc: 'Kaçınma +%3, hız +%8.',                 maxLevel: 4, mods: { dodge: 0.03, speedPct: 0.08 } },
  hasatrun: { name: 'Ruh Hasadı',    desc: 'Tecrübe +%10, çekim alanı +%20.',       maxLevel: 4, mods: { xpPct: 0.10, magnetPct: 0.20 } },
  kanemici: { name: 'Kan Emici',     desc: 'Can çalma +%2, azami can +6.',          maxLevel: 4, mods: { lifeSteal: 0.02, maxHp: 6 } },
  statik:   { name: 'Statik Yük',    desc: 'Saldırı hızı +%6, hız +%4.',            maxLevel: 4, mods: { atkPct: 0.06, speedPct: 0.04 } },
  demir:    { name: 'Demir İrade',   desc: 'Azami can +10, zırh +1.',               maxLevel: 4, mods: { maxHp: 10, armor: 1 } },
  kulkani:  { name: 'Kül Kanı',      desc: 'Hasar +%4, patlama şansı +%5.',         maxLevel: 4, mods: { dmgPct: 0.04, explodeChance: 0.05, explodeDmgPct: 0.15 } },
};
for (const k in EXTRA_PASSIVES) if (!PASSIVES[k]) PASSIVES[k] = EXTRA_PASSIVES[k];
const PAS_TAG = { kalp: 'CELIK', zirh: 'CELIK', cizme: 'YILDIRIM', cabukluk: 'YILDIRIM', miknatis: 'RUH', keskinlik: 'AYAZ', gazap: 'KOR',
  kiragi: 'AYAZ', buzkalp: 'AYAZ', hayalet: 'AYAZ', hasatrun: 'RUH', kanemici: 'RUH', statik: 'YILDIRIM', demir: 'CELIK', kulkani: 'KOR' };
const HERO_TAG = { okcu: 'RUH', sapanci: 'CELIK', seher: 'KOR', simsek: 'YILDIRIM', savasci: 'CELIK', gokalev: 'KOR', korsan: 'KOR', kralice: 'RUH', sovalye: 'AYAZ' };

export const CURSES = [
  { id: 'cam',    name: 'Cam Kemik',     icon: 'guc',   desc: 'Hasar +%30 · Azami can −25%.',        mods: { dmgPct: 0.30, maxHp: -30 }, noHealBan: true },
  { id: 'kan',    name: 'Kan Anlaşması', icon: 'guc',   desc: 'Can çalma +%4 · Zırh −2.',           mods: { lifeSteal: 0.04, armor: -2 } },
  { id: 'hirs',   name: 'Hırs Laneti',   icon: 'guc',   desc: 'Atış hızı +%25 · Hız −%10.',        mods: { atkPct: 0.25, speedPct: -0.10 } },
  { id: 'kumar',  name: 'Kumarbaz',      icon: 'guc',   desc: 'Kritik +%12 · Kaçınma yok olur.', mods: { critChance: 0.12, dodge: -0.6 } },
  { id: 'aclik',  name: 'Açgözlü Ruh',   icon: 'guc',   desc: 'Tecrübe +%35 · Mıknatıs −%40.',    mods: { xpPct: 0.35, magnetPct: -0.40 } },
];

export const EVOLUTIONS = {
  okcu:    { weapon: 'yay',      pas: 'keskinlik', name: 'Tutulma Yayı',    desc: 'Ay Yayı evrimleşir: oklar kritik yağmuruna döner.',  boost: { dmg: 1.18, cd: 0.9, pierce: 1 } },
  sapanci: { weapon: 'sapan',    pas: 'gazap',     name: 'Göktaşı Sapanı',  desc: 'Sapan evrimleşir: taş her hedefte bir kez daha seker.', boost: { dmg: 1.18, cd: 0.9, bounceAdd: 1 } },
  seher:   { weapon: 'kilic',    pas: 'cabukluk',  name: 'Şafak Kılıcı',    desc: 'Seher Kılıcı evrimleşir: savuruş daha geniş, daha sık.', boost: { dmg: 1.18, cd: 0.9, arc: 1.1 } },
  simsek:  { weapon: 'simsek',   pas: 'gazap',     name: 'Gök Hükmü',       desc: 'Şimşek evrimleşir: zincir bir hedef daha sıçrar.',     boost: { dmg: 1.18, cd: 0.9, chainAdd: 1 } },
  savasci: { weapon: 'pala',     pas: 'zirh',      name: 'Sur Yıkan',       desc: 'Kale Palası evrimleşir: darbe geri iter, zırh +2.',    boost: { dmg: 1.18, cd: 0.9, armorAdd: 2 } },
  gokalev: { weapon: 'alev',     pas: 'keskinlik', name: 'Ak Alev',         desc: 'Mavi Alev evrimleşir: kor topu daha çok delip geçer.', boost: { dmg: 1.18, cd: 0.9, pierce: 1 } },
  korsan:  { weapon: 'topatar',  pas: 'gazap',     name: 'Hayalet Filo',    desc: 'Kaptan Topu evrimleşir: gülle parçalanır.',            boost: { dmg: 1.18, cd: 0.9, splitAdd: 1 } },
  kralice: { weapon: 'tackilic', pas: 'cabukluk',  name: 'Ay Tacı',         desc: 'Taç Kılıcı evrimleşir: kesik daha uzağa uçar.',        boost: { dmg: 1.18, cd: 0.9, waveLife: 1.2 } },
  sovalye: { weapon: 'yemin',    pas: 'zirh',      name: 'Buzul Yemini',    desc: 'Yemin Kılıcı evrimleşir: zırh +2, darbe genişler.',    boost: { dmg: 1.18, cd: 0.9, armorAdd: 2, arc: 1.08 } },
};

/* v71 B2 · HER SİLAHA EVRİM — imza dışı 8 silahın (Cephane'den kuşanılır) eş pasifi v70 B1
   pasifleridir. Koşul: silah elde + eş pasif ≥ 2 + oyuncu seviyesi ≥ 9. Koşu başına EN ÇOK BİR
   silah evrimi (kahraman evriminden ayrı). Güç payı imza evrimiyle aynı (×1,18 · ×0,90); ikincil
   silahın DPS payı %15-25 → toplam +%5-8, iki evrimle bant ≤ +%35 içinde kalır (balance). */
export const WEAPON_EVO = {
  bicak:    { pas: 'hayalet',  name: 'Kara Yelpaze',     desc: 'Gölge Bıçakları evrimleşir: bir bıçak daha, daha sık.',  boost: { dmg: 1.18, cd: 0.9, count: 1 } },
  kor:      { pas: 'kulkani',  name: 'Kıyamet Közü',     desc: 'Kor Çemberi evrimleşir: halka genişler, daha sert yakar.', boost: { dmg: 1.18, cd: 0.9, radius: 1.15 } },
  yildirim: { pas: 'statik',   name: 'Fırtına Tacı',     desc: 'Gök Gazabı evrimleşir: bir hedefe daha düşer.',          boost: { dmg: 1.18, cd: 0.9, targets: 1 } },
  ok:       { pas: 'hasatrun', name: 'Ruh Avcısı',       desc: 'Ruh Oku evrimleşir: oklar bir düşmanı daha deler.',      boost: { dmg: 1.18, cd: 0.9, pierce: 1 } },
  kure:     { pas: 'buzkalp',  name: 'Kutup Yörüngesi', desc: 'Ay Küresi evrimleşir: bir küre daha döner.',             boost: { dmg: 1.18, cd: 0.9, count: 1 } },
  bomba:    { pas: 'gazap',    name: 'Volkan Havanı',    desc: 'Kor Havanı evrimleşir: patlama alanı büyür.',             boost: { dmg: 1.18, cd: 0.9, radius: 1.15 } },
  tabanca:  { pas: 'kanemici', name: 'Kan Tabancası',    desc: 'Kemik Tabanca evrimleşir: mermi bir düşmanı daha deler.', boost: { dmg: 1.18, cd: 0.9, pierce: 1 } },
  sacma:    { pas: 'demir',    name: 'Demir Fırtına',    desc: 'Saçma Namlu evrimleşir: saçma daha sık, daha sert.',     boost: { dmg: 1.18, cd: 0.9, volley: 1 } },
};

export class WeaponManager {
  constructor(game) {
    this.game = game;
    this.scratch = [];            // grid sorguları için ortak tampon

    /* yıldırım görselleri: 8 slotluk sabit dizi (havuz gibi) */
    this.bolts = [];
    for (let i = 0; i < 8; i++) this.bolts.push({ x: 0, y: 0, life: 0 });

    this._zone = (z, dt) => this.updateZone(z, dt);
    this._arrow = (b, dt) => this.updateArrow(b, dt);
    this._bomb = (b, dt) => this.updateBombProj(b, dt);

    this.reset();
  }

  reset() {
    this.cursed = {}; this.curses = 0;   // v62 D2
    this.tagN = {}; this.tagDone = {};   // v63 D1
    /* Koşuya özel silah tablosu — ÖZEL PERK'ler bu kopyayı kalıcı büker,
       config'e asla dokunulmaz. */
    this.W = JSON.parse(JSON.stringify(WEAPONS));

    this.slots = {};                       // silah → seviye
    this.passives = {};                    // pasif rün → seviye
    this.synApplied = {};                  // sınıf sinerjisi → uygulanan eşikler
    this.specialTaken = {};                // alınan özel perkler (tek seçimlik)
    this.sigLvl = {};                      // imza skilleri → kademe (0-5)
    this.evolved = false;                  // v53 D1: bu koşuda evrim alındı mı
    this.wEvolved = false;                 // v71 B2: bu koşuda silah evrimi alındı mı

    /* silah zamanlayıcıları */
    this.swordT = 0.5;
    this.swing = 0;                        // savurma animasyonu kalan süre
    this.swingDur = 0.18;
    this.swingDir = 0;
    this.swingRange = 0;
    this.swingArc = 0;
    this.swingId = 0;                      // her savurma için benzersiz kimlik
    this.swingKind = 'normal';             // 'normal' | 'spin' | 'twin' | 'echo' (renderer okur)
    this.swingCount = 0;                   // girdap sayacı

    /* SEHER — gecikmeli savuruşlar (ikiz / ruh yankısı). Sıcak döngüde
       nesne tahsis etmemek için SABİT yuvalı havuz: life>0 = dolu. */
    this.swordQueue = [];
    for (let i = 0; i < 6; i++) this.swordQueue.push({ t: 0, dir: 0, mul: 1, kind: 'normal', on: false });

    /* SEHER — Ay Kesiği hilal dalgaları (sabit yuva; renderer okur).
       GECE KRALİÇESİ aynı havuzu paylaşır; RENK silahtan gelir (bkz.
       render3d SWORD_SPECS.waveHex), yuvada renk taşınmasına gerek yok —
       bir koşuda tek kahraman oynanır. Kraliçe HER savuruşta kesik
       fırlattığı ve Üçlü Kesik kartı beşe çıkardığı için yuva 10 → 16. */
    this.waves = [];
    for (let i = 0; i < 16; i++) this.waves.push({ x: 0, y: 0, dir: 0, life: 0, max: 1, dmg: 0, r: 0, wid: 0, spd: 0 });
    this._waveTok = 0;

    this.orbitA = 0;
    this.zoneT = 2.0;
    this.boltT = 3.0;
    this.bombT = 1.6;
    this.gunT = {};                        // gun silahı başına atış zamanlayıcısı

    /* ŞİMŞEK — zincirleme yıldırım durumu (renderer bowPos ile aynı desen:
       yazıcı render3d._updateLightningShard, okuyucu fireChain). */
    this.simsekT = 0.4;
    this.simsekPos = { x: 0, y: 0 };
    this.simsekFireCount = 0;
    this.simsekStormT = null;

    this.nearest = null;
    this.nearestD2 = Infinity;
    this.pending = [];                     // gecikmeli atışlar (yay gerilme anı)

    /* GÖKALEV — süzülen mavi alev durumu (bowPos/simsekPos ile aynı desen:
       yazıcı render3d._updateFlame, okuyucu fireGun). */
    this.flamePos = { x: 0, y: 0 };
    this.flameFireCount = 0;
    /* KOR KASIRGASI (sig_a8): kahramanın çevresinde dönen alev küreleri.
       Önceden tahsisli 6 yuva — kare başına nesne yaratmak yasak (perf.js).
       `a` yazıcısı updateCyclone, okuyucusu render3d._pushCyclone (izin
       hangi yöne düşeceğini yörünge teğetinden hesaplar). */
    this.cycloneOrbs = [];
    for (let i = 0; i < 6; i++) this.cycloneOrbs.push({ x: 0, y: 0, a: 0 });
    this.cycloneN = 0;
    this.cycloneAng = 0;
    this.cycloneT = 0;

    /* KARA KAPTAN — süzülen hayalet topu durumu. Yazan render3d._updateCannon,
       okuyan fireGun: gülle gövdeden değil NAMLUNUN UCUNDAN çıkar. */
    this.cannonPos = { x: 0, y: 0 };
    this.cannonAim = 0;
    this.cannonFireCount = 0;
    this.broadsideT = null;                // bordo ateşi sayacı (imza ile açılır)

    /* GECE KRALİÇESİ — Gök Kılıcı sayacı (imza ile açılır) */
    this.judgeT = null;

    /* süzülen yay (okcu) durumu — renderer yazar/okur */
    this.bowPos = { x: 0, y: 0 };
    this.bowAim = 0;
    this.bowFireCount = 0;
    this.rainShots = 0;                    // ok sağanağı sayacı (imza: Ok Yağmuru)
    this.bowDraw = 0;

    /* süzülen sapan (sapanci) durumu — yazıcı render3d._updateSling.
       slingWind 0→1: kese çevirme hızı. bowDraw'dan farklı hesaplanır çünkü
       sapanın fireDelay'i yok (yay gerilir, sapan çevrilir): kendi sayıcısı
       her atışta sıfırlanıp bekleme süresi boyunca dolar. */
    this.slingPos = { x: 0, y: 0 };
    this.slingAim = 0;
    this.slingFireCount = 0;
    this.slingWind = 0;
    this._slWindT = 0;

    for (let i = 0; i < this.bolts.length; i++) this.bolts[i].life = 0;

    resetFeel();
  }

  /** Başlangıç silahı (loadout boşsa yedek). game.startRun çağırır. */
  seedDefault() {
    if (Object.keys(this.slots).length === 0) this.slots[STARTING_WEAPON] = 1;
  }

  lvl(id) { return this.slots[id] || 0; }

  /* ═══════════ GÜNCELLEME ═══════════ */

  update(dt) {
    this.findNearest();

    /* KILIC, TAÇ KILICI, PALA ve YEMİN KILICI aynı motoru paylaşır
       (updateSword id parametreli) — hepsi hero-kilitli olduğundan bir
       koşuda ikisi asla birlikte aktif olmaz. Yeni bir yakın dövüş imza
       silahı eklerken BU ZİNCİRE de ekle: eklenmezse silah kart havuzunda
       görünür ama hiç savrulmaz. */
    const meleeId = this.lvl('kilic') > 0 ? 'kilic'
      : (this.lvl('tackilic') > 0 ? 'tackilic'
      : (this.lvl('pala') > 0 ? 'pala'
      : (this.lvl('yemin') > 0 ? 'yemin' : null)));
    if (meleeId)              this.updateSword(dt, meleeId);
    if (this.lvl('bicak'))    this.updateOrbit(dt);
    if (this.lvl('kor'))      this.updateKor(dt);
    if (this.lvl('yildirim')) this.updateBolt(dt);
    if (this.lvl('bomba'))    this.updateBomb(dt);
    if (this.lvl('simsek'))   this.updateSimsek(dt);
    if (this.lvl('topatar'))  this.updateBroadside(dt);
    if (this.lvl('alev'))     this.updateCyclone(dt);
    /* tüm 'gun' sınıfı silahlar (ok / tabanca / saçma) tek yoldan */
    for (const id in this.slots) {
      if (this.slots[id] > 0 && this.W[id] && this.W[id].kind === 'gun') this.updateGun(id, dt);
    }

    /* gecikmeli atışlar: yay gerilme animasyonu release anına gelince ok çıkar */
    for (let i = this.pending.length - 1; i >= 0; i--) {
      const q = this.pending[i];
      q.t -= dt;
      if (q.t <= 0) { this.fireGun(q.id); this.pending[i] = this.pending[this.pending.length - 1]; this.pending.length--; }
    }

    this.game.pools.zones.updateEach(this._zone, dt);
    this.game.pools.pBullets.updateEach(this._arrow, dt);
    this.game.pools.bombs.updateEach(this._bomb, dt);

    for (let i = 0; i < this.bolts.length; i++) {
      if (this.bolts[i].life > 0) this.bolts[i].life -= dt;
    }
    if (this.swing > 0) this.swing -= dt;

    /* süzülen yay gerilme fazı (renderer okur): bekleyen 'yay' atışının
       kalan süresine göre 0→1 (gerildikçe artar, release'te sıfırlanır). */
    if (this.slots.yay) {
      let pt = -1;
      for (let i = 0; i < this.pending.length; i++) {
        if (this.pending[i].id === 'yay') { pt = this.pending[i].t; break; }
      }
      const fd = this.W.yay.fireDelay || 0.3;
      this.bowDraw = pt >= 0 ? Math.max(0, Math.min(1, 1 - pt / fd)) : 0;
    }

    /* süzülen sapan kurulma fazı (renderer okur → kese geriye yatar).
       gunT'ye BAĞLI DEĞİL: kendi sayıcısını tutar, böylece zamanlayıcının
       iç semantiği değişse bile savuruş koreografisi bozulmaz. Saldırı hızı
       bonusu gerçek beklemeyi kısaltırsa kurulma 1'de erken doyar — görsel,
       hasarı etkilemez. */
    if (this.slots.sapan) {
      const L = Math.max(0, (this.lvl('sapan') | 0) - 1);
      const cd = this.W.sapan.cooldown[L] || 0.62;
      this._slWindT = Math.min(cd, this._slWindT + dt);
      this.slingWind = cd > 0 ? this._slWindT / cd : 0;
    }
  }

  /** En yakın düşmanı bul (ok hedefi + kılıç auto-aim için, karede bir kez). */
  findNearest() {
    const p = this.game.player;
    const act = this.game.enemies.pool.active;
    let best = null, bd = Infinity;
    for (let i = 0; i < act.length; i++) {
      const e = act[i];
      const dx = e.x - p.x, dy = e.y - p.y;
      const d2 = dx * dx + dy * dy;          // kare mesafe — sqrt yok
      if (d2 < bd) { bd = d2; best = e; }
    }
    this.nearest = best;
    this.nearestD2 = bd;
  }

  /* ── 1. SEHER KILICI — süzülen ruh kılıcı ──
     Temel savuruşun üstüne kahramanın imza kartları (SIGNATURES.seher)
     dört mekanik ekler. Hepsi BU fonksiyondan geçer; görselleri
     render3d._updateSword okur (swingKind / waves).
       • girdap (spin) : her N. savuruş 360° — kademe arttıkça N düşer
       • ikiz  (twin)  : 0.16 sn sonra ters yöne ek savuruş
       • yankı (echo)  : 0.30 sn sonra aynı yöne hayalet savuruş
       • kesik (wave)  : savuruştan delip geçen hilal dalga fırlar          */
  updateSword(dt, id) {
    /* gecikmeli savuruş kuyruğu (ikiz + yankı) */
    for (let i = 0; i < this.swordQueue.length; i++) {
      const q = this.swordQueue[i];
      if (!q.on) continue;
      q.t -= dt;
      if (q.t <= 0) { q.on = false; this.swordStrike(q.dir, q.mul, q.kind, q.id); }
    }
    this.updateWaves(dt);

    /* AYAZ KABUĞU (Ayaz imzası) — SALDIRI DEĞİL TEPKİ.
       Oyuncunun canı düştüğü karede tetiklenir. Hasar yolunu (player.hurt,
       çarpışma, boss, zemin hasarı…) hiç değiştirmemek için canı BURADAN
       izliyoruz: tek sayı karşılaştırması, tahsis yok, ve hasarın hangi
       kaynaktan geldiğine bakmaksızın çalışır. */
    const WC = this.W[id];
    if (WC && (WC.carapace | 0)) {
      const hpNow = this.game.player ? this.game.player.hp : 0;
      if (this._lastHp == null) { this._lastHp = hpNow; this._carapaceCd = 0; }
      this._carapaceCd -= dt;
      if (hpNow < this._lastHp && this._carapaceCd <= 0) this.fireCarapace(id, WC);
      this._lastHp = hpNow;
    }

    /* GÖK KILICI (Gece Kraliçesi imzası) — saldırı temposundan BAĞIMSIZ
       periyodik tekil hüküm. Bekleme döngüsünden ÖNCE işlenir, yoksa
       savuruş bekleme süresine takılıp hiç çalışmaz. */
    const WJ = this.W[id];
    if (WJ && (WJ.judge | 0)) {
      if (this.judgeT == null) this.judgeT = 3.6;
      this.judgeT -= dt;
      if (this.judgeT <= 0) {
        this.judgeT = Math.max(3.2, 7.0 - (WJ.judge | 0) * 0.9);
        this.fireJudgement(id, WJ);
      }
    }

    this.swordT -= dt;
    if (this.swordT > 0) return;

    const g = this.game, p = g.player;
    const L = this.lvl(id) - 1;
    const W = this.W[id];

    /* ── MENZİL KAPISI (2026-08-10) ──
       Eskiden savuruş KOŞULSUZDU: sahada tek düşman yokken de kahraman
       durup dururken kılıç sallıyordu — hem "neden vuruyor?" sorusuna yol
       açıyor hem her savuruşta girdap/kesik/şok efektlerini bedavaya
       tetikleyip sahneyi kirletiyordu.
       Artık düşman GERÇEKTEN erişime girmeden savurmaz. Kapı silahın KENDİ
       menzilini kullanır; +34 px karşılama payı düşmanın yarıçapı ve o
       karedeki yaklaşma mesafesi içindir — payı kaldırırsan savuruş düşman
       tam sınırdayken bir kare geç kalır.
       Bekleme süresi TÜKETİLMEZ: 0,1 sn sonra yeniden bakılır, yani düşman
       menzile girdiği an vuruş hazırdır (kapıda beklerken güç de birikmez).
       Aynı desen updateSimsek ve updateGun'da da var. */
    const reach = W.range[L] + 34;
    if (!this.nearest || this.nearestD2 > reach * reach) { this.swordT = 0.1; return; }

    this.swordT = W.cooldown[L] * p.atkMult;

    /* auto-aim: kapıdan geçtiysek hedef zaten var ve erişimdedir */
    let dir = Math.atan2(this.nearest.y - p.y, this.nearest.x - p.x);

    this.swingCount++;
    const spinLvl = W.spin | 0;
    /* GIRDAP: kademe 1 → her 2. savuruş, kademe 2+ → her savuruş girdap.
       (Eskiden her 4. savuruştu ve kart "hiçbir şey yapmıyor" gibi duruyordu.) */
    const every = spinLvl >= 2 ? 1 : (spinLvl === 1 ? 2 : 0);
    const kind = (every > 0 && this.swingCount % every === 0) ? 'spin' : 'normal';
    this.swordStrike(dir, 1, kind, id);

    /* twin/echo alanı OLMAYAN silahta (ör. yemin) bu ikisi 0'dır ve hiç
       tetiklenmez — applySpecial de tanımsız alana dokunmaz. */
    const twin = W.twin | 0, echo = W.echo | 0;
    /* İKİZ: tam güçlü (0.5 → 1.0). Kademe arttıkça hasarı aşar. */
    if (twin > 0) this.queueSwing(0.15, dir + Math.PI, 1 + 0.15 * (twin - 1), 'twin', id);
    /* YANKI: %45 → %80 */
    if (echo > 0) this.queueSwing(0.28, dir, 0.80 + 0.12 * (echo - 1), 'echo', id);
  }

  queueSwing(t, dir, mul, kind, id) {
    for (let i = 0; i < this.swordQueue.length; i++) {
      const q = this.swordQueue[i];
      if (q.on) continue;
      q.on = true; q.t = t; q.dir = dir; q.mul = mul; q.kind = kind; q.id = id;
      return;
    }
  }

  /** AYAZ KABUĞU: oyuncu hasar aldığında çevresinde ayaz patlar.
      Kademe HASARI değil YARIÇAPI ve bekleme süresini iyileştirir — amaç
      kalabalıkta nefes açmak, dps eklemek değil. Bu yüzden nadir kademede
      dengeyi bozmaz: en iyi hâlde 3,4 sn'de bir çıkar ve hasarı silahın
      kendi hasarının bir katıdır.

      g.explode KULLANILMAZ: turuncu köz saçar, sarı halka çizer ve sarsıntı
      ekler — Ayaz'ın buz dili değil (Mavi Nova'da aynı gerekçe). */
  fireCarapace(id, W) {
    const g = this.game, p = g.player;
    const k = W.carapace | 0;
    /* İMZA ANI — Ayazın buz dili (bkz. render3d.spawnCast) */
    if (g.renderer3d && g.renderer3d.spawnCast) g.renderer3d.spawnCast(p.x, p.y, 0.62, 0.88, 1);
    const L = Math.max(0, this.lvl(id) - 1);
    const r = 96 + 16 * k;
    this._carapaceCd = Math.max(3.4, 6.4 - 0.9 * k);

    const dmg = W.dmg[L] * (0.55 + 0.15 * k);
    const knock = W.knock[L] * 1.5;
    const out = g.enemies.queryCircle(p.x, p.y, r, this.scratch);
    for (let i = 0; i < out.length; i++) {
      const e = out[i];
      const dx = e.x - p.x, dy = e.y - p.y;
      const reach = r + e.radius;
      if (dx * dx + dy * dy > reach * reach) continue;
      applyHit(g, e, dmg, Math.atan2(dy, dx), knock, W.critAdd || 0, false);
    }

    /* İKİ HIZDA halka: tek halka "ok" der, iki farklı hızda halka "şok
       dalgası" (bkz. Mavi Nova notu). Sarsıntı YOK — oyuncu hasar aldığında
       kamera zaten 0,26 travma alıyor, üstüne binmesin. */
    g.pools.rings.obtain(p.x, p.y, r * 1.05, 0.34, '#eafcff');
    g.pools.rings.obtain(p.x, p.y, r * 0.62, 0.52, '#6fc8ff');
    const nP = Math.min(22, Math.max(8, Quality.budget('particles') >> 5));
    g.spawnBurst(p.x, p.y, '#bff0ff', nP, 210, 3, 0.5, true);
    g.spawnBurst(p.x, p.y, '#2fd0ff', nP >> 1, 140, 2.5, 0.6, true);
    g.audio.play('frostnova');
    Haptics.fire('hurt');
  }

  /** Tek savuruş: hasar + görsel durum + (varsa) hilal dalga. */
  swordStrike(dir, mul, kind, id) {
    const g = this.game, p = g.player;
    const L = Math.max(0, this.lvl(id) - 1);
    const W = this.W[id];
    const spin = kind === 'spin';

    this.swingId++;
    this.swingKind = kind;
    /* İMZA ANI — yalnız GIRDAP (360° tur). Sıradan savuruşta çağrılmaz:
       saniyede iki kez tekrarlanan bir olay "imza" olmaktan çıkar ve
       ekranı kirletir (sarsıntı politikasıyla aynı mantık). Renk kılıcın
       kendi dilinden: Seher kor · Kraliçe menekşe · Ayaz cam göğü. */
    if (spin && g.renderer3d && g.renderer3d.spawnCast) {
      if (id === 'tackilic')   g.renderer3d.spawnCast(p.x, p.y, 0.72, 0.46, 1);
      else if (id === 'yemin') g.renderer3d.spawnCast(p.x, p.y, 0.62, 0.88, 1);
      else                     g.renderer3d.spawnCast(p.x, p.y, 1, 0.72, 0.34);
    }
    this.swing = this.swingDur;
    this.swingDir = dir;
    /* GIRDAP tam tur atar VE menzili %35 aşar: kart alındığında ekranda
       görünür bir alan farkı olmalı. */
    const range = W.range[L] * (spin ? 1.35 : 1);
    const arc = spin ? TAU : W.arc[L];
    this.swingRange = range;
    this.swingArc = arc;

    if (kind === 'normal' || spin) {
      /* karakter savurduğu yöne döner (vuruş hissi) */
      p.faceLeft = Math.cos(dir) < 0;
      p.faceHold = 0.25;
      if (p.triggerMeleeAttack) p.triggerMeleeAttack(dir);
    }

    const half = arc / 2;
    /* girdap hasar ×1,6 — daha uzun bekleyişin ödülü */
    const dmg = W.dmg[L] * mul * (spin ? 1.6 : 1);
    const knock = W.knock[L] * (kind === 'echo' ? 0.4 : 1);
    const crit = W.critAdd || 0;
    const out = g.enemies.queryCircle(p.x, p.y, range + 26, this.scratch);

    for (let i = 0; i < out.length; i++) {
      const e = out[i];
      if (e.swordId === this.swingId) continue;         // bu savurma zaten vurdu
      const dx = e.x - p.x, dy = e.y - p.y;
      const reach = range + e.radius;
      if (dx * dx + dy * dy > reach * reach) continue;  // kare mesafe

      const a = Math.atan2(dy, dx);
      if (!spin) {
        let da = a - dir;
        while (da > Math.PI) da -= TAU;                  // açıyı -π..π'ye sar
        while (da < -Math.PI) da += TAU;
        /* kenar payı: iri düşmanlar yayın ucuna değse de vurulur */
        if (Math.abs(da) > half + e.radius / range) continue;
      }

      e.swordId = this.swingId;
      applyHit(g, e, dmg, a, knock, crit, kind === 'echo');
    }
    /* YAKIN DÖVÜŞ ENGELLERİ DE KIRAR. Eksikse yakın dövüş kahramanları taze
       bir haritada mahsur kalır: menzilli mermi taşı kırar, kılıç kırmazdı.
       Girdapta merkez, normal savuruşta yayın ortası hedeflenir. */
    if (g.props && g.props.n) {
      if (spin) g.props.damageArea(p.x, p.y, range * 0.9, dmg * 0.7);
      else g.props.damageArea(p.x + Math.cos(dir) * range * 0.55, p.y + Math.sin(dir) * range * 0.55, range * 0.5, dmg * 0.7);
    }

    /* AY KESİĞİ / MAVİ HÜKÜM: savuruştan hilal dalga fırlar (yankı hariç).
       Girdapta ÜÇ dalga birden çıkar (tüm yönlere) — kartın birleşimi
       görsel olarak da patlamalı. Gece Kraliçesi'nde `wave` TABANDA 1'dir
       ve `fan` kartı yelpazeyi 3'e, 5'e açar. */
    const wv = W.wave | 0;
    if (wv > 0 && kind !== 'echo') {
      /* KESİK HASAR KATSAYISI 0.85 → 0.60 (2026-08-04 Kraliçe nerf'i):
         `wave` tabandır, yani her savuruşta çıkar ve yakın düşman iki kez
         vurulur. 0.85'te bu ×1,85 demekti ve DESTAN kademesi EFSANE'yi
         geçiyordu. Seher'de kart ile açılan bir EK olduğu için oradaki etki
         de aşağı çekilir ama kademe büyümesi (0.2/kademe) korunur. */
      const wd = dmg * (0.60 + 0.2 * (wv - 1));
      const cr = W.critAdd || 0;
      if (spin) {
        this.spawnWave(dir, wd, wv, cr, W);
        this.spawnWave(dir + TAU / 3, wd, wv, cr, W);
        this.spawnWave(dir - TAU / 3, wd, wv, cr, W);
      } else {
        this.spawnWave(dir, wd, wv, cr, W);
        /* YELPAZE: yan kesikler %52 hasar taşır — tek hedefte toplam hasarı
           katlamaz, ama kalabalıkta kapsama alanını belirgin genişletir.
           (0.70 → 0.52: Üçlü Kesik tek hedefte de çok kazançlıydı.) */
        const fan = Math.min(2, W.fan | 0);
        for (let f = 1; f <= fan; f++) {
          const off = 0.30 * f;
          this.spawnWave(dir + off, wd * 0.52, wv, cr, W);
          this.spawnWave(dir - off, wd * 0.52, wv, cr, W);
        }
      }
    }

    /* SARSICI DARBE: her savuruş (yankı hariç) küçük bir şok dalgası bırakır —
       imza kartıyla açılır (bkz. SIGNATURES.savasci). kilic bu alanı hiç
       tanımlamaz, W.shock|0 daima 0 kalır — kod ikisine ortak, zararsız. */
    if ((W.shock | 0) > 0 && kind !== 'echo') {
      g.explode(p.x + Math.cos(dir) * range * 0.55, p.y + Math.sin(dir) * range * 0.55,
                dmg * 0.3, 26 + (W.shock | 0) * 7, true);
    }

    /* vuruş hissi: girdap ağır sarsıntı + şok halkası + kıvılcım kubbesi.
       Kartın "alındığı anlasılmalı" olmasını sağlayan şey bu görsel
       geri bildirim: sayı değişimi tek başına hissedilmiyor. */
    if (kind === 'echo') { /* yankı: sarsıntı yok — rutin olay */ }
    else {
      /* yalnız GİRDAP sarsıyor (nadir, kart ile açılır); normal savuruş değil */
      if (spin) g.addShake(0.14);
      g.audio.play('sword');
      if (spin) {
        /* jenerik patlama halkası (pools.rings) KALDIRILDI — diğer tüm
           patlamalarla aynı görseldi. Girdabın kendi iki katmanlı şok
           dalgası render3d._updateSword içinde sürülür. */
        const nP = Math.min(18, Math.max(6, Quality.budget('particles') >> 5));
        for (let i = 0; i < nP; i++) {
          const a = (i / nP) * TAU + dir;
          const sp = 190 + Math.random() * 130;
          g.pools.particles.obtain(
            p.x + Math.cos(a) * 26, p.y + Math.sin(a) * 26,
            Math.cos(a) * sp, Math.sin(a) * sp * 0.6,
            0.34, 2.6, i % 3 === 0 ? '#ffe9bd' : '#cfe6ff', 0.94, 0, true);
        }
        Haptics.fire('crit');
      }
    }
  }

  /** Hilal dalga: oyuncudan çıkar, düşmanları delip geçer (yuva havuzu).
      W verilirse silaha özel yarıçap/menzil çarpanlarını ve rengini uygular. */
  spawnWave(dir, dmg, tier, crit, W) {
    const p = this.game.player;
    let slot = null;
    for (let i = 0; i < this.waves.length; i++) {
      const w = this.waves[i];
      if (w.life <= 0) { slot = w; break; }
    }
    if (!slot) return;
    slot.x = p.x + Math.cos(dir) * 24;
    slot.y = p.y + Math.sin(dir) * 24;
    slot.dir = dir;
    /* menzil = hız × ömür; Uzun Ferman kartı ömrü uzatır */
    slot.max = 0.62 * (W && W.waveLife ? W.waveLife : 1);
    slot.life = slot.max;
    slot.dmg = dmg;
    slot.crit = crit || 0;
    /* dalga yarıçapı 30 → 46 taban: eski hâli ekranda ince bir çizgiydi */
    slot.r = (46 + tier * 8) * (W && W.waveR ? W.waveR : 1);
    slot.spd = 520;
    slot.wid = ++this._waveTok;
  }

  updateWaves(dt) {
    const g = this.game;
    for (let i = 0; i < this.waves.length; i++) {
      const w = this.waves[i];
      if (w.life <= 0) continue;
      w.life -= dt;
      const step = w.spd * dt;
      w.x += Math.cos(w.dir) * step;
      w.y += Math.sin(w.dir) * step;
      const out = g.enemies.queryCircle(w.x, w.y, w.r + 24, this.scratch);
      for (let k = 0; k < out.length; k++) {
        const e = out[k];
        if (e.waveHit === w.wid) continue;
        const dx = e.x - w.x, dy = e.y - w.y;
        const rr = w.r + e.radius;
        if (dx * dx + dy * dy > rr * rr) continue;
        e.waveHit = w.wid;
        applyHit(g, e, w.dmg, w.dir, 90, w.crit || 0, false);
      }
    }
  }

  /* ── 2. GÖLGE BIÇAKLARI ── */
  updateOrbit(dt) {
    const g = this.game, p = g.player;
    const L = this.lvl('bicak') - 1;
    const W = this.W.bicak;

    this.orbitA += W.spin[L] * dt;
    const n = W.count[L];
    const R = W.radius[L];

    for (let i = 0; i < n; i++) {
      const a = this.orbitA + (i / n) * TAU;
      const bx = p.x + Math.cos(a) * R;
      const by = p.y + Math.sin(a) * R;

      const out = g.enemies.queryCircle(bx, by, 30, this.scratch);
      for (let k = 0; k < out.length; k++) {
        const e = out[k];
        if (e.obCd > 0) continue;                       // düşman başı vuruş bekleme
        const dx = e.x - bx, dy = e.y - by;
        const rr = 13 + e.radius;
        if (dx * dx + dy * dy > rr * rr) continue;

        e.obCd = W.hitCd;
        /* geri tepme oyuncudan dışarı doğru — sürüyü uzak tutar */
        const ka = Math.atan2(e.y - p.y, e.x - p.x);
        applyHit(g, e, W.dmg[L], ka, 170, 0, false);
      }
    }
  }

  /* ── 3. KOR ÇEMBERİ ── */
  updateKor(dt) {
    const g = this.game;
    const L = this.lvl('kor') - 1;
    const W = this.W.kor;

    this.zoneT -= dt;
    if (this.zoneT <= 0 && g.pools.zones.count < W.maxZones[L]) {
      this.zoneT = W.spawnCd[L] * this.game.player.atkMult;

      /* hedef nokta: görüşteki rastgele bir düşman (rezervuar örnekleme),
         yoksa oyuncunun çevresinde rastgele bir nokta */
      let tx = 0, ty = 0, found = 0;
      const act = g.enemies.pool.active;
      for (let i = 0; i < act.length; i++) {
        const e = act[i];
        if (!g.inView(e.x, e.y, 0)) continue;
        found++;
        if (Math.random() < 1 / found) { tx = e.x; ty = e.y; }
      }
      if (found === 0) {
        const a = Math.random() * TAU;
        const r = 70 + Math.random() * 120;
        tx = g.player.x + Math.cos(a) * r;
        ty = g.player.y + Math.sin(a) * r;
      }

      g.pools.zones.obtain(tx, ty, W.radius[L], W.dps[L], W.duration);
      g.audio.play('zone');
      g.spawnBurst(tx, ty, COLORS.ember, 10, 130, 2.5, 0.4, true);
    }
  }

  /** MAVİ KOR BİRİKİNTİSİ — zemide 2,5 sn yanan mavi ateş (DoT).
      Kor Çemberi'nin (`kor`) havuzunu ve tik mantığını aynen kullanır; fark
      yalnız `z.blue` bayrağı (mavi zerre + 3B'de yalımlarla çizim). Havuz
      8 slot ve PAYLAŞIMLI — doluysa yeni birikinti açılmaz (Kor Çemberi'ni
      açlığa mahkûm etmemek için). */
  spawnFireZone(x, y, b, r, life, dpsMul) {
    const g = this.game;
    if (g.pools.zones.count >= 8) return;
    const tier = b.flame | 0;
    const rr = r || (30 + tier * 7);
    const lf = life || 2.5;
    const dm = dpsMul || (0.42 + tier * 0.16);
    const z = g.pools.zones.obtain(x, y, rr, b.dmg * dm, lf);
    z.blue = true;
    g.spawnBurst(x, y, '#9fd8ff', 5, 90, 2.2, 0.3, true);
    return z;
  }

  /** KOR KASIRGASI — GÖKALEV'in çevresinde dönen mavi alev küreleri.
      Neden bu tasarım: Gökalev menzilli ve kırılgan; yakına giren düşmana
      karşı hiçbir cevabı yoktu. Kasırga o boşluğu doldurur — sÜREKLİ
      çalışır (periyodik bir büyü değil), yani kart alındığı anda ve her
      saniye görünür. Nova ile bölüşmesi kasıtlıdır: nova MENZİL, kasırga
      YAKIN mesafe. */
  updateCyclone(dt) {
    const W = this.W.alev;
    const tier = W ? (W.cyclone | 0) : 0;
    if (!tier) { this.cycloneN = 0; return; }
    const g = this.game, p = g.player;
    const n = Math.min(6, 2 + tier);           // 3 küre (kademe başına +1)
    this.cycloneN = n;
    const R = 66 + tier * 8;
    this.cycloneAng += dt * 2.15;
    if (this.cycloneAng > TAU) this.cycloneAng -= TAU;
    for (let i = 0; i < n; i++) {
      const o = this.cycloneOrbs[i];
      const a = this.cycloneAng + (i / n) * TAU;
      o.a = a;
      o.x = p.x + Math.cos(a) * R;
      o.y = p.y + Math.sin(a) * R;
    }
    /* hasar TIKLIDIR: her karede vurmak küçük bir dt'de devasa dps demektir
       ve hasar yazıları ekranı doldurur. 0,4 sn tik = küre başına saniyede
       2,5 vuruş. */
    this.cycloneT -= dt;
    if (this.cycloneT > 0) return;
    this.cycloneT = 0.4;
    const L = Math.max(0, this.lvl('alev') - 1);
    const dmg = W.dmg[L] * (0.30 + tier * 0.06);
    const crit = W.critAdd || 0;
    for (let i = 0; i < n; i++) {
      const o = this.cycloneOrbs[i];
      const out = g.enemies.queryCircle(o.x, o.y, 30, this.scratch);
      for (let k = 0; k < out.length; k++) {
        const e = out[k];
        const dx = e.x - o.x, dy = e.y - o.y;
        const rr = 30 + e.radius;
        if (dx * dx + dy * dy > rr * rr) continue;
        applyHit(g, e, dmg, Math.atan2(e.y - p.y, e.x - p.x), 90, crit, false);
      }
    }
  }

  /** MAVİ NOVA (sig_a7) — kor topu İLK isabette büyük bir mavi patlamaya
      dönüşür: alan hasarı + kısa süreli yanan zemin.
      `g.explode` KULLANILMAZ: o turuncu köz renkleri saçar, sarı halka
      çizer ve 0,16 sarsıntı ekler — saniyede bir olan bir olay için
      sarsıntı politikasını ihlal eder (bkz. CLAUDE.md). Kendi mavi
      sürümünü yazmak hem kimliği hem kuralı korur. */
  fireNova(x, y, b) {
    const g = this.game;
    const tier = b.nova | 0;
    const r = 82 + tier * 12;
    const dmg = b.dmg * (0.80 + tier * 0.15);
    const out = g.enemies.queryCircle(x, y, r + 30, this.scratch);
    for (let i = 0; i < out.length; i++) {
      const e = out[i];
      const dx = e.x - x, dy = e.y - y;
      const reach = r + e.radius;
      if (dx * dx + dy * dy > reach * reach) continue;
      applyHit(g, e, dmg, Math.atan2(dy, dx), 240, b.critAdd || 0, false);
    }
    if (g.renderer3d && g.renderer3d.spawnFlameImpact) {
      g.renderer3d.spawnFlameImpact(x, y, b.angle, 2.3 + tier * 0.22);
    }
    const nP = Math.min(26, Math.max(8, Quality.budget('particles') >> 4));
    for (let i = 0; i < nP; i++) {
      const a = (i / nP) * TAU + Math.random() * 0.4;
      const sp = 200 + Math.random() * 220;
      g.pools.particles.obtain(x, y, Math.cos(a) * sp, Math.sin(a) * sp * 0.75,
        0.42, i % 4 === 0 ? 3.0 : 2.2, i % 4 === 0 ? '#eaf6ff' : '#4fb0ff', 0.94, -20, true);
    }
    /* patlamanın ardında kalan yanan zemin: novayı tek karelik bir flaştan
       çıkarıp ALAN KONTROLÜ yeteneğine çevirir. */
    this.spawnFireZone(x, y, b, r * 0.52, 1.8 + tier * 0.25, 0.30 + tier * 0.05);
    g.audio.play('firebomb');
  }

  updateZone(z, dt) {
    z.life -= dt;
    if (z.life <= 0) return true;

    const g = this.game;

    /* saniyede 2 tık: her tık dps'in yarısı */
    z.tick += dt;
    if (z.tick >= 0.5) {
      z.tick -= 0.5;
      const out = g.enemies.queryCircle(z.x, z.y, z.r + 24, this.scratch);
      for (let i = 0; i < out.length; i++) {
        const e = out[i];
        const dx = e.x - z.x, dy = e.y - z.y;
        const rr = z.r + e.radius * 0.5;
        if (dx * dx + dy * dy > rr * rr) continue;
        applyHit(g, e, z.dps * 0.5, Math.random() * TAU, 0, 0, true);   // sessiz DoT
      }
    }

    /* yükselen közler — mavi kor birikintisinde mavi, kor çemberinde turuncu */
    if (Math.random() < dt * 9) {
      const a = Math.random() * TAU;
      const r = Math.random() * z.r * 0.85;
      g.pools.particles.obtain(
        z.x + Math.cos(a) * r, z.y + Math.sin(a) * r,
        (Math.random() - 0.5) * 24, -35 - Math.random() * 40,
        0.55, 2.2, z.blue ? (Math.random() < 0.32 ? '#e6f4ff' : '#57b4ff') : COLORS.ember, 0.97, -30, true);
    }
    return false;
  }

  /* ── 4. GÖK GAZABI ── */
  updateBolt(dt) {
    this.boltT -= dt;
    if (this.boltT > 0) return;

    const g = this.game;
    const L = this.lvl('yildirim') - 1;
    const W = this.W.yildirim;

    /* adaylar: yalnız GÖRÜŞTEKİ düşmanlar */
    const cand = this.scratch;
    cand.length = 0;
    const act = g.enemies.pool.active;
    for (let i = 0; i < act.length; i++) {
      const e = act[i];
      if (g.inView(e.x, e.y, -10)) cand.push(e);
    }
    if (cand.length === 0) { this.boltT = 0.5; return; }   // hedef yok, kısa süre sonra dene

    this.boltT = W.cooldown[L] * g.player.atkMult;
    const n = Math.min(W.targets[L], cand.length);

    for (let k = 0; k < n; k++) {
      /* rastgele seç ve swap-remove ile adaydan düş (tekrar vurma yok) */
      const idx = (Math.random() * cand.length) | 0;
      const e = cand[idx];
      cand[idx] = cand[cand.length - 1];
      cand.length--;

      applyHit(g, e, W.dmg[L], Math.random() * TAU, 90, W.critBonus, false);

      /* görsel: bolt slotu + çarpma efektleri */
      for (let s = 0; s < this.bolts.length; s++) {
        if (this.bolts[s].life <= 0) {
          this.bolts[s].x = e.x;
          this.bolts[s].y = e.y;
          this.bolts[s].life = 0.28;
          break;
        }
      }
      g.spawnBurst(e.x, e.y, '#eaf6ff', 8, 240, 2, 0.28, true);
      g.spawnBurst(e.x, e.y, '#f5c044', 4, 140, 2, 0.35, true);
    }

    g.audio.play('thunder');
    g.addShake(0.12);
  }

  /* ── 5. GUN SINIFI (Ruh Oku / Kemik Tabanca / Saçma Namlu) ──
     Hepsi en yakına nişan alıp pBullets fırlatır; fark config'te. */
  updateGun(id, dt) {
    const t = (this.gunT[id] || 0) - dt;
    if (t > 0) { this.gunT[id] = t; return; }

    const g = this.game, p = g.player;
    const L = this.lvl(id) - 1;
    const W = this.W[id];

    /* MENZİL KAPISI (2026-08-10): eskiden yalnız "düşman VAR MI" diye
       bakılıyordu, NEREDE olduğuna bakılmıyordu — sahanın öbür ucundaki
       tek düşman için kahraman havaya ateş ediyordu. Menzil alanı olmayan
       silahlarda (mermi uçup gider) 640 px'lik makul bir angajman
       mesafesi kullanılır. */
    const gunReach = (W.range ? W.range[L] : 640) + 40;
    if (!this.nearest || this.nearestD2 > gunReach * gunReach) { this.gunT[id] = 0.14; return; }

    this.gunT[id] = W.cooldown[L] * p.atkMult;

    const aimAng = Math.atan2(this.nearest.y - p.y, this.nearest.x - p.x);
    if (p.triggerRangedAttack) p.triggerRangedAttack(aimAng);

    /* yaylı silah: animasyon gerilirken bekle, release anında fırlat */
    if (W.fireDelay) { this.pending.push({ id, t: W.fireDelay }); return; }
    this.fireGun(id);
  }

  /** Mermiyi gerçekten fırlat (anında ya da gecikmeli atışlardan). */
  fireGun(id) {
    if (!this.nearest || !this.slots[id]) return;
    const g = this.game, p = g.player;
    const L = this.lvl(id) - 1;
    const W = this.W[id];

    /* çıkış noktası: süzülen yay → yayın kendi konumu; büyü küresi asa
       ucundan; normal ok gövde üstünden; diğerleri gövdeden. */
    let ox = p.x, oy = p.y;
    if (W.bowVisual) { ox = this.bowPos.x; oy = this.bowPos.y; }
    else if (W.slingVisual) { ox = this.slingPos.x; oy = this.slingPos.y; }
    else if (W.flameVisual) { ox = this.flamePos.x; oy = this.flamePos.y; }
    else if (W.cannonVisual) { ox = this.cannonPos.x; oy = this.cannonPos.y; }

    const ang = Math.atan2(this.nearest.y - oy, this.nearest.x - ox);
    if (typeof p.faceLeft === 'boolean') p.faceLeft = Math.cos(ang) < 0;
    const volley = W.volley[L];
    const spread = W.spread || 0.14;
    const br = W.r || 6;
    /* flameVisual/cannonVisual: çıkış noktası ZATEN süzülen silahın dünya
       konumu (topta namlunun ucu) — orb dalının gövde-ofsetiyle ezilmemeli
       (yoksa kor topu/gülle silahtan değil karakterin göbeğinden çıkar). */
    if (W.orb && !W.flameVisual && !W.cannonVisual) { ox = p.x + Math.cos(ang) * 16; oy = p.y + Math.sin(ang) * 16 - 6; }
    else if (W.arrow && !W.bowVisual) { ox = p.x + Math.cos(ang) * 30; oy = p.y - 16 + Math.sin(ang) * 14; }

    const flame = W.flame | 0;
    const homing = W.homing | 0, explode = W.explode | 0, split = W.split | 0;
    for (let v = 0; v < volley; v++) {
      const off = volley > 1 ? (v - (volley - 1) / 2) * spread : 0;
      const jitter = (Math.random() - 0.5) * spread * 0.3;
      const sh = ang + off + jitter;
      const b = g.pools.pBullets.obtain(
        ox, oy,
        Math.cos(sh) * W.speed,
        Math.sin(sh) * W.speed,
        W.dmg[L], W.pierce[L], W.bulletLife || 1.4, br, W.color);
      /* havuz nesnesi geri dönüşümlü — her atışta kimlik alanlarını SİFıRLA */
      b.isArrow = !!W.arrow;
      /* TABAN sekme kademe tablosundan, kartla gelen sekme skalerden — ikisi
         TOPLANIR. applySpecial kademe tablosuna dokunamadığı için iki alan
         (bkz. WEAPONS.sapan bounceLv / bounce). */
      b.bounce = (W.bounce | 0) + (W.bounceLv ? (W.bounceLv[L] | 0) : 0);
      b.stone = !!W.stone;
      b.shatter = W.shatter | 0;
      b.flame = flame;
      b.homing = homing;
      b.explode = explode;
      b.split = split;
      b.frag = false;
      b.smoke = W.smokeTrail ? 1 : 0;
      b.metal = !!W.metallic;
      /* KOR TOPU: 3B'de küre değil YALIM olarak çizilir (render3d addFire).
         ph = mermi başına türbülans fazı — yoksa yan yana iki alev aynı
         kareyi gösterir ve "kopyala-yapıştır" okunur. */
      b.fireball = !!W.fireball;
      b.ph = Math.random() * 6.2831;
      b.nova = W.nova | 0;
      b.critAdd = W.critAdd || 0;
      b.angle = sh;
    }
    /* OK SAĞANAĞI: her 4. gerişte hedefin üstüne gökten ok iner.
       Sağanak okları normal atışın hasarının %70'ini taşır — tek başına
       oyunu bitirmez, kalabalağı çözer. */
    if ((W.rain | 0) > 0 && this.nearest) {
      this.rainShots = (this.rainShots || 0) + 1;
      if (this.rainShots % 4 === 0) this.fireArrowRain(id, W, L);
    }
    if (W.bowVisual) this.bowFireCount++;
    if (W.slingVisual) { this.slingFireCount++; this._slWindT = 0; }
    if (W.flameVisual) this.flameFireCount++;
    if (W.cannonVisual) {
      this.cannonFireCount++;
      /* NAMLU DUMANI: güllün ağırlığını satan şey barut bulutudur. Adet
         bütçeden gelir (CLAUDE.md kural 4) — sabit yazılmaz. */
      const nS = Math.min(9, Math.max(3, Quality.budget('particles') >> 6));
      for (let i = 0; i < nS; i++) {
        const a = ang + (Math.random() - 0.5) * 0.9;
        const sp = 90 + Math.random() * 110;
        g.pools.particles.obtain(ox, oy, Math.cos(a) * sp, Math.sin(a) * sp * 0.6,
          0.34, 3.2, i % 3 === 0 ? '#ffd9a0' : '#6b6558', 0.93, -26, true);
      }
      /* atış rutin bir olay: sarsıntı yok — geri tepme namluda görünüyor */
      Haptics.fire('ui');
    }
    /* NAMLU ALEVİ — ATIŞIN ÇIKTIĞI YER DE BİR OLAYDIR (v25, "daha
       gösterişli"). Dokuz karakterin dokuz atış koduna ayrı ayrı alev
       yazmak yerine burada tek çağrı: bütün menzilli silahlar (sapan, yay,
       alev, top, tabanca) aynı dili konuşur. Konum ve açı ATIŞIN KENDİ
       değerleridir (`ox/oy/ang`) — oyuncunun göbeği değil namlunun ucu;
       yoksa alev silahın yanında bir yerde patlar. Sarsıntı ve halka YOK:
       atış saniyede birkaç kez olan bir olay (fxImpact kural ②). */
    g.fxMuzzle(ox, oy, ang, W.rainColor || '#ffd08a');
    g.audio.play(W.sfx || (W.orb ? 'thunder' : 'shoot'));
  }

  /** OK SAĞANAĞI — hedefin üzerinden aşağı inen ok perdesi. */
  fireArrowRain(id, W, L) {
    const g = this.game, tgt = this.nearest;
    const tier = W.rain | 0;
    const n = 4 + tier * 2;
    const dmg = W.dmg[L] * 0.7;
    const SPD = 640;
    for (let i = 0; i < n; i++) {
      const sx = tgt.x + (Math.random() - 0.5) * 130;
      const sy = tgt.y - 300 - Math.random() * 90;
      const ax = tgt.x + (Math.random() - 0.5) * 110;
      const a = Math.atan2(tgt.y - sy, ax - sx);
      /* sağanak mermisi silahın kimliğini taşır: ok silahında ok, alev
         silahında kor topu (yoksa Gökalev'in yağmuru ok yağmuru olurdu). */
      const b = g.pools.pBullets.obtain(sx, sy, Math.cos(a) * SPD, Math.sin(a) * SPD,
        dmg, W.pierce[L], 1.1, W.r || 6, W.rainColor || '#cfe9ff');
      b.isArrow = !!W.arrow;
      b.bounce = 0;
      b.stone = false; b.shatter = 0;
      b.flame = W.flame | 0;
      b.homing = 0;
      b.explode = W.explode | 0;
      b.split = W.split | 0;
      b.frag = false;
      b.fireball = !!W.fireball;
      b.ph = Math.random() * 6.2831;
      b.nova = W.nova | 0;
      b.critAdd = W.critAdd || 0;
      b.angle = a;
    }
    g.audio.play('shoot');
  }

  /** SAÇILAN GÜLLE — gülle isabette parçalara bölünür (Kara Kaptan imzası).
      Parçalar KENDİ İÇİNDE bölünmez (b.frag) — yoksa tek gülle zincirleme
      patlayarak ekranı doldurur ve hem dengeyi hem kare hızını yıkar.
      Parça hasarı %34: bölme artık İLK isabette güvenilir biçimde tetikleniyor
      (eskiden pierce tükenince, yani çoğu atışta hiç), bu yüzden %40'tan
      indirildi — üç parça ana güllenin ~%100'ünü ekler, altı parça ~%200. */
  spawnSplit(b) {
    const g = this.game;
    const n = Math.min(6, 2 + (b.split | 0));
    const dmg = b.dmg * 0.34;
    const sp = 330;
    for (let i = 0; i < n; i++) {
      const a = b.angle + (i - (n - 1) / 2) * (1.5 / Math.max(1, n - 1));
      const f = g.pools.pBullets.obtain(b.x, b.y, Math.cos(a) * sp, Math.sin(a) * sp,
        dmg, 0, 0.42, 4, '#7e8288');
      f.isArrow = false; f.bounce = 0; f.flame = 0; f.homing = 0;
      f.stone = false; f.shatter = 0;
      f.explode = 0; f.split = 0; f.frag = true;
      f.smoke = 1;
      f.metal = true;
      f.critAdd = b.critAdd || 0; f.angle = a;
    }
    g.spawnBurst(b.x, b.y, '#ffd9a0', 6, 210, 2.2, 0.26, true);
  }

  /** BORDO ATEŞİ — aralıklı, saldırı temposundan bağımsız yedi gülleli yan
      ateş (Kara Kaptan imzası). Tek tetikte büyük bir duvar çıkarır; bu
      yüzden gülle başına hasar yarıya iner. */
  updateBroadside(dt) {
    const W = this.W.topatar;
    if (!W || !(W.broadside | 0)) { this.broadsideT = null; return; }
    if (this.broadsideT == null) this.broadsideT = 4.2;
    this.broadsideT -= dt;
    if (this.broadsideT > 0) return;
    if (!this.nearest) { this.broadsideT = 0.4; return; }
    this.broadsideT = Math.max(4.0, 8.6 - (W.broadside | 0) * 0.9);
    this.fireBroadside(W);
  }

  fireBroadside(W) {
    const g = this.game;
    /* İMZA ANI — Kara Kaptanın barutu */
    if (g.renderer3d && g.renderer3d.spawnCast && g.player) {
      g.renderer3d.spawnCast(g.player.x, g.player.y, 1, 0.66, 0.30);
    }
    const tgt = this.nearest;
    const L = Math.max(0, this.lvl('topatar') - 1);
    const ox = this.cannonPos.x, oy = this.cannonPos.y;
    const base = Math.atan2(tgt.y - oy, tgt.x - ox);
    const n = 7;
    const dmg = W.dmg[L] * 0.5;
    const sp = W.speed * 0.94;
    for (let i = 0; i < n; i++) {
      const a = base + (i - (n - 1) / 2) * 0.22;
      const b = g.pools.pBullets.obtain(ox, oy, Math.cos(a) * sp, Math.sin(a) * sp,
        dmg, W.pierce[L], 1.3, 6, '#8d9096');
      b.isArrow = false; b.bounce = 0; b.flame = 0; b.homing = 0;
      b.stone = false; b.shatter = 0;
      b.explode = W.explode | 0; b.split = W.split | 0; b.frag = false;
      b.smoke = 1;
      b.metal = true;
      b.critAdd = W.critAdd || 0; b.angle = a;
    }
    this.cannonFireCount++;
    this.cannonBroadside = (this.cannonBroadside || 0) + 1;   // renderer: büyük geri tepme
    const nS = Math.min(16, Math.max(6, Quality.budget('particles') >> 5));
    for (let i = 0; i < nS; i++) {
      const a = base + (Math.random() - 0.5) * 1.5;
      const s2 = 150 + Math.random() * 190;
      g.pools.particles.obtain(ox, oy, Math.cos(a) * s2, Math.sin(a) * s2 * 0.6,
        0.42, 3.6, i % 3 === 0 ? '#ffe0b0' : '#6b6558', 0.94, -22, true);
    }
    g.addShake(0.16);
    /* YAN ATEŞ de top sesidir ('cannon'), gök gürültüsü değil: aynı silahın
       iki atışı iki farklı malzeme gibi duyulamaz. Sarsıntı yükü taşır. */
    g.audio.play('cannon');
    Haptics.fire('crit');
  }

  /** GÖK KILICI — görüntüdeki bir hedefe gökten inen mavi hüküm
      (Gece Kraliçesi imzası). Saldırı temposundan bağımsızdır. */
  fireJudgement(id, W) {
    const g = this.game;
    /* İMZA ANI — Gece Kraliçesinin menekşesi */
    if (g.renderer3d && g.renderer3d.spawnCast && g.player) {
      g.renderer3d.spawnCast(g.player.x, g.player.y, 0.72, 0.46, 1);
    }
    const act = g.enemies.pool.active;
    const cand = this.scratch;
    cand.length = 0;
    for (let i = 0; i < act.length; i++) if (g.inView(act[i].x, act[i].y, -10)) cand.push(act[i]);
    if (!cand.length) { this.judgeT = 0.5; return; }
    const t = cand[(Math.random() * cand.length) | 0];
    const L = Math.max(0, this.lvl(id) - 1);
    const tier = W.judge | 0;
    /* çarpan 2.0+0.3/kademe → 1.5+0.25/kademe (Kraliçe nerf'i): saldırı
       temposundan bağımsız bedava alan hasarı fazla yüklüydü */
    g.explode(t.x, t.y, W.dmg[L] * (1.5 + tier * 0.25), 84 + tier * 10, true);
    if (g.renderer3d && g.renderer3d.spawnJudgement) g.renderer3d.spawnJudgement(t.x, t.y);
    g.spawnBurst(t.x, t.y, '#cfe9ff', 10, 240, 2.2, 0.34, true);
    g.addShake(0.16);
    g.audio.play('judge');
    Haptics.fire('crit');
  }

  updateArrow(b, dt) {
    b.life -= dt;
    if (b.life <= 0) return true;

    /* TAKİPÇİ OK: hızı koruyup yönü en yakın hedefe doğru sınırlı hızla büker.
       Sıcak döngüde tahsis yok — nearest kare başına bir kez bulunmuş. */
    if (b.homing > 0) {
      const tgt = this.nearest;
      if (tgt) {
        const want = Math.atan2(tgt.y - b.y, tgt.x - b.x);
        let d = want - b.angle;
        while (d > Math.PI) d -= Math.PI * 2;
        while (d < -Math.PI) d += Math.PI * 2;
        const turn = (2.6 + b.homing * 1.5) * dt;
        if (d > turn) d = turn; else if (d < -turn) d = -turn;
        b.angle += d;
        const sp = Math.hypot(b.vx, b.vy);
        b.vx = Math.cos(b.angle) * sp;
        b.vy = Math.sin(b.angle) * sp;
      }
    }

    b.x += b.vx * dt;
    b.y += b.vy * dt;

    const g = this.game;
    /* v71 A4 · ATIŞ İZİ: 45 ms'de bir havuzlu zerre, mermi yönünün tersine süzülür.
       Parçacık tavanının %55'inde kesilir (Quality: kalabalıkta iz ilk feda edilen şeydir). */
    if ((b.trT = (b.trT || 0) - dt) <= 0) {
      b.trT = 0.045;
      const P = g.pools.particles;
      if (P.count < (g.isMobile ? 250 : 640) && g.inView(b.x, b.y, 20)) {
        P.obtain(b.x - b.vx * 0.012, b.y - b.vy * 0.012, -b.vx * 0.08, -b.vy * 0.08, 0.22, b.fireball ? 3.2 : 2.2,
          b.fireball ? '#ffb45a' : '#dfe6f0', 0.7, 0, true);
      }
    }
    /* ENGELLER: mermi mezar taşını kırar ve DURUR (delme hakkı varsa geçer
       ama hasarını verir). Durmasa engel yalnız oyuncuyu yavaşlatan bir
       çıkıntı olurdu; durduğu için taşın arkası gerçek siper. */
    if (g.props && g.props.n) {
      const pi = g.props.hitScan(b.x, b.y, b.r || 5);
      if (pi >= 0) {
        g.props.damage(pi, b.dmg * 0.9);
        if (!(b.pierce > 0)) return true;
      }
    }
    const out = g.enemies.queryCircle(b.x, b.y, 34, this.scratch);
    for (let i = 0; i < out.length; i++) {
      const e = out[i];
      if (e === b.lastHit) continue;               // aynı düşmanı iki kez delme
      const dx = e.x - b.x, dy = e.y - b.y;
      const rr = b.r + e.radius;
      if (dx * dx + dy * dy > rr * rr) continue;

      b.lastHit = e;
      applyHit(g, e, b.dmg, b.angle, 130, b.critAdd || 0, false);
      /* KOR TOPU İSABETİ: anı beyaz flaş + saçılan yalım + şok halkası
         (render3d.spawnFlameImpact). SARSINTI YOK — vuruş saniyede birden
         sık bir olay, kamera onu taşıyamaz (bkz. CLAUDE.md sarsıntı politikası). */
      /* nova varken KÜÇÜK isabet flaşı atlanır: aynı karede aynı noktada iki
         flaş, büyük olanın çekirdeğini yıkıyor (ve 8 yuvalı havuzu boşuna
         yiyor). Nova zaten kendi flaşını açar. */
      if (b.fireball && !(b.nova > 0 && !b.burned)) {
        if (g.renderer3d && g.renderer3d.spawnFlameImpact) g.renderer3d.spawnFlameImpact(e.x, e.y, b.angle);
        g.spawnBurst(e.x, e.y, '#8fd0ff', 5, 180, 2.2, 0.26, true);
        g.spawnBurst(e.x, e.y, '#eaf6ff', 3, 110, 1.7, 0.20, true);
      }
      if (b.flame > 0) g.spawnBurst(e.x, e.y, b.fireball ? '#7fc4ff' : (b.flame >= 2 ? '#ff6a2c' : '#ffb24d'), 4 + b.flame * 2, 150, 2, 0.3, true);
      /* MAVİ NOVA (sig_a7): kor topu İLK isabette patlar. `b.burned` bir kez
         çalışmasını garanti eder — delme hakkı 3 olan bir alev yoksa üç üst
         üste nova açardı. Delme SONRASI değil İLK isabette: kartın metni
         "çarptığında" diyor ve tek düşmana atışta da çalışmalı (Saçılan
         Gülle'de aynı hatayı düzeltmiştik). */
      if (b.fireball && b.nova > 0 && !b.burned) { b.burned = true; this.fireNova(b.x, b.y, b); }
      /* SAÇILAN GÜLLE — İLK İSABETTE bölünür, delme hakkı bitince DEĞİL.
         Eskiden bölme pierce tükendiğinde tetikleniyordu; L1'de pierce 1
         olduğu için güllenin bölünmesi İKİ düşmana isabet etmesini
         gerektiriyordu — tek düşmana atışta kart hiç çalışmıyor gibi
         görünüyordu (kartın metni de "isabette" diyor). Bir gülle bir kez
         bölünür: böldükten sonra bayrak düşüyor, yoksa her delme zincirleme
         parça üretip hem dengeyi hem kare hızını yıkardı. */
      if (b.split > 0 && !b.frag) { this.spawnSplit(b); b.split = 0; }
      b.pierce--;
      if (b.pierce < 0) {
        /* SEKEN OK / SEKEN TAŞ: yakındaki başka bir düşmana yön değiştirir */
        if ((b.isArrow || b.stone) && b.bounce > 0) {
          const cand = g.enemies.queryCircle(b.x, b.y, 300, this.scratch);
          let best = null, bd = Infinity;
          for (let k = 0; k < cand.length; k++) {
            const c = cand[k];
            if (c === e) continue;
            const cx = c.x - b.x, cy = c.y - b.y;
            const d2 = cx * cx + cy * cy;
            if (d2 < bd) { bd = d2; best = c; }
          }
          if (best) {
            b.bounce--;
            /* KIRIK TAŞ (sig_s8): sekme anında taş üçe ayrılır. Parçalar
               SEKMEZ ve KIRILMAZ (stone/shatter sıfır) — aksi halde tek atış
               zincirleme parça çığı üretirdi (bkz. Saçılan Gülle dersi). */
            if (b.stone && b.shatter > 0) {
              const g2 = this.game, sc = 3, sp2 = 300;
              const base = Math.atan2(b.vy, b.vx);
              const sd = (b.dmg || 0) * (0.26 + 0.06 * b.shatter);
              for (let s = 0; s < sc; s++) {
                const a2 = base + (s - 1) * 0.62;
                const f2 = g2.pools.pBullets.obtain(b.x, b.y,
                  Math.cos(a2) * sp2, Math.sin(a2) * sp2, sd, 0, 0.34, 4, '#b3ab9c');
                f2.isArrow = false; f2.bounce = 0; f2.stone = false; f2.shatter = 0;
                f2.flame = 0; f2.homing = 0; f2.explode = 0; f2.split = 0;
                f2.frag = true; f2.smoke = 0;
              }
            }
            b.pierce = 0;
            b.lastHit = e;
            const sp = Math.hypot(b.vx, b.vy);
            const na = Math.atan2(best.y - b.y, best.x - b.x);
            b.vx = Math.cos(na) * sp;
            b.vy = Math.sin(na) * sp;
            b.angle = na;
            b.life = Math.max(b.life, 0.6);
            g.spawnBurst(b.x, b.y, b.color, 4, 120, 1.6, 0.22, true);
            continue;
          }
        }
        /* PATLAYICI UÇ: delme hakkı bitince alan hasarı bırakır */
        if (b.explode > 0) {
          g.explode(b.x, b.y, b.dmg * (0.55 + b.explode * 0.12), 40 + b.explode * 10, true);
        }
        return true;               // delme hakkı bitti
      }
    }

    /* iz — gülleler barut dumanı bırakır, alevli oklar ateş, ruh okları
       soluk parıltı. Duman gülleye AĞIRLIK hissi verir: hızlı ve temiz bir
       iz onu ok gibi gösteriyordu. */
    const ft = b.flame | 0;
    if (b.smoke) {
      if (Math.random() < dt * 32) {
        g.pools.particles.obtain(b.x, b.y, (Math.random() - 0.5) * 24, -12 - Math.random() * 18,
          0.44, 3.0, Math.random() < 0.32 ? '#ffd9a0' : '#5c5852', 0.95, -10, true);
      }
    } else if (b.fireball) {
      /* mavi kor izi: yükselen soluk zerreler. Alev kartları (b.flame)
         turuncu iz veriyordu — Gökalev'in kimliği mavi, o dal atlanır. */
      if (Math.random() < dt * 34) {
        g.pools.particles.obtain(b.x, b.y, (Math.random() - 0.5) * 30, -14 - Math.random() * 22,
          0.30, 2.2, Math.random() < 0.30 ? '#dff1ff' : '#5cb2ff', 0.95, -14, true);
      }
    } else if (ft > 0) {
      if (Math.random() < dt * (26 + ft * 24)) {
        const c = ft >= 3 ? '#ffe6a0' : ft === 2 ? '#ff6a2c' : '#ffb24d';
        g.pools.particles.obtain(b.x, b.y, (Math.random() - 0.5) * 26, -18 - Math.random() * 26, 0.36, 2.4, c, 0.96, -18, true);
      }
    } else if (Math.random() < dt * 28) {
      g.pools.particles.obtain(b.x, b.y, 0, 0, 0.22, 2, b.color, 1, 0, true);
    }
    return false;
  }

  /* ═══════════ RENDER ═══════════ */

  /** Düşmanların ALTINA çizilen katman: kor alanları. */
  renderZones(ctx) {
    const g = this.game;
    const t = g.time;
    g.pools.zones.each(function (z) {
      if (!g.inView(z.x, z.y, z.r + 20)) return;

      /* açılış/kapanış yumuşatması */
      const born = z.max - z.life;
      const a = Math.min(1, born * 4, z.life * 1.6);
      const pulse = 1 + Math.sin(t * 6 + z.seed) * 0.05;
      const R = z.r * pulse;

      const grad = ctx.createRadialGradient(z.x, z.y, R * 0.1, z.x, z.y, R);
      grad.addColorStop(0, `rgba(255, 140, 70, ${0.30 * a})`);
      grad.addColorStop(0.6, `rgba(255, 90, 60, ${0.16 * a})`);
      grad.addColorStop(1, 'rgba(255, 59, 60, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(z.x, z.y, R, 0, TAU);
      ctx.fill();

      /* kenar halkası */
      ctx.globalAlpha = 0.5 * a;
      ctx.strokeStyle = COLORS.ember;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(z.x, z.y, R, 0, TAU);
      ctx.stroke();

      /* halkada yavaşça dönen 5 rün çentiği */
      const rot = t * 0.7 + z.seed;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      for (let i = 0; i < 5; i++) {
        const ra = rot + (i / 5) * TAU;
        ctx.moveTo(z.x + Math.cos(ra) * (R - 7), z.y + Math.sin(ra) * (R - 7));
        ctx.lineTo(z.x + Math.cos(ra) * (R - 1), z.y + Math.sin(ra) * (R - 1));
      }
      ctx.stroke();
      ctx.globalAlpha = 1;
    });
  }

  /** Oyuncunun ÜSTÜNE çizilen katman: kılıç yayı, bıçaklar, oklar, yıldırım. */
  render(ctx) {
    const g = this.game, p = g.player;

    /* ── kılıç savurma yayı ── */
    if (this.swing > 0) {
      const prog = 1 - this.swing / this.swingDur;      // 0 → 1
      const alpha = 1 - prog;
      const half = this.swingArc / 2;
      const start = this.swingDir - half;
      const end = start + this.swingArc * Math.min(1, prog * 1.6);
      const R = this.swingRange - 10;

      ctx.globalCompositeOperation = 'lighter';
      /* geniş parıltı */
      ctx.globalAlpha = alpha * 0.4;
      ctx.strokeStyle = '#ffe9a8';
      ctx.lineWidth = 16;
      ctx.beginPath();
      ctx.arc(p.x, p.y, R, start, end);
      ctx.stroke();
      /* keskin kenar */
      ctx.globalAlpha = alpha * 0.9;
      ctx.strokeStyle = '#fffdf5';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(p.x, p.y, R + 7, Math.max(start, end - 0.4), end);
      ctx.stroke();
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1;
    }

    /* ── yörünge bıçakları ── */
    const bl = this.lvl('bicak');
    if (bl > 0) {
      const W = this.W.bicak;
      const L = bl - 1;
      const n = W.count[L];
      const R = W.radius[L];

      /* soluk yörünge halkası */
      ctx.globalAlpha = 0.10;
      ctx.strokeStyle = COLORS.spirit;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(p.x, p.y, R, 0, TAU);
      ctx.stroke();
      ctx.globalAlpha = 1;

      for (let i = 0; i < n; i++) {
        const a = this.orbitA + (i / n) * TAU;
        const bx = p.x + Math.cos(a) * R;
        const by = p.y + Math.sin(a) * R;

        ctx.save();
        ctx.translate(bx, by);
        ctx.rotate(a + Math.PI / 2 + Math.PI);           // uç, dönüş yönüne bakar
        ctx.fillStyle = '#aeb8d8';
        ctx.beginPath();
        ctx.moveTo(0, -10);
        ctx.lineTo(3.5, 3);
        ctx.lineTo(0, 7);
        ctx.lineTo(-3.5, 3);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = COLORS.spirit;
        ctx.lineWidth = 1;
        ctx.globalAlpha = 0.8;
        ctx.stroke();
        ctx.restore();
        ctx.globalAlpha = 1;
      }
    }

    /* ── ruh okları / kurşunlar / saçmalar / büyü küreleri ── */
    const orbT = g.time;
    g.pools.pBullets.each(function (b) {
      if (!g.inView(b.x, b.y, 24)) return;

      /* büyü küresi (r>=9): dönen, nabızlı, ışıyan ay küresi */
      if (b.r >= 9) {
        ctx.save();
        ctx.translate(b.x, b.y);
        ctx.globalCompositeOperation = 'lighter';
        const pr = 1 + Math.sin(orbT * 12) * 0.12;
        /* dış hale — v75: mermi başına her karede radyal gradyan tahsisi yerine BİR KEZ pişmiş sprite */
        const hs = orbHalo(), hr = 15 * pr;
        ctx.drawImage(hs, -hr, -hr, hr * 2, hr * 2);
        /* çekirdek */
        ctx.fillStyle = '#f2e9ff';
        ctx.beginPath(); ctx.arc(0, 0, 4.2, 0, TAU); ctx.fill();
        ctx.fillStyle = b.color;
        ctx.globalAlpha = 0.9;
        ctx.beginPath(); ctx.arc(0, 0, 6.4, 0, TAU); ctx.fill();
        ctx.globalAlpha = 1;
        ctx.fillStyle = '#fffef8';
        ctx.beginPath(); ctx.arc(-1.4, -1.4, 2, 0, TAU); ctx.fill();
        /* yörüngede kıvılcımlar */
        for (let s = 0; s < 3; s++) {
          const a = orbT * 6 + s * 2.094;
          ctx.fillStyle = 'rgba(216,184,255,0.85)';
          ctx.beginPath();
          ctx.arc(Math.cos(a) * 9, Math.sin(a) * 9, 1.3, 0, TAU);
          ctx.fill();
        }
        ctx.restore();
        ctx.globalCompositeOperation = 'source-over';
        return;
      }

      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.rotate(b.angle);

      /* ── GERÇEK OK (kolçunun imzası): gövde + uç + tüy ── */
      if (b.isArrow) {
        /* ruh izi (hafif parıltı) */
        ctx.globalCompositeOperation = 'lighter';
        ctx.strokeStyle = b.color;
        ctx.globalAlpha = 0.35;
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(-22, 0); ctx.lineTo(-8, 0); ctx.stroke();
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = 'source-over';
        /* ahşap gövde */
        ctx.strokeStyle = '#a97b46';
        ctx.lineWidth = 2.2;
        ctx.beginPath(); ctx.moveTo(-11, 0); ctx.lineTo(7, 0); ctx.stroke();
        /* çelik uç */
        ctx.fillStyle = '#dfe6f2';
        ctx.beginPath();
        ctx.moveTo(13, 0); ctx.lineTo(6, -3); ctx.lineTo(6, 3);
        ctx.closePath(); ctx.fill();
        /* tüyler (kızıl — okçunun rengi) */
        ctx.fillStyle = '#c93b48';
        ctx.beginPath();
        ctx.moveTo(-11, 0); ctx.lineTo(-15, -3.6); ctx.lineTo(-11.5, -0.8);
        ctx.closePath(); ctx.fill();
        ctx.beginPath();
        ctx.moveTo(-11, 0); ctx.lineTo(-15, 3.6); ctx.lineTo(-11.5, 0.8);
        ctx.closePath(); ctx.fill();
        ctx.restore();
        return;
      }

      ctx.globalCompositeOperation = 'lighter';
      /* iz gövdesi — mermi rengine göre */
      ctx.strokeStyle = b.color;
      ctx.globalAlpha = 0.55;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(-16, 0);
      ctx.lineTo(4, 0);
      ctx.stroke();
      ctx.globalAlpha = 1;
      /* parlak uç */
      ctx.fillStyle = '#fffdf5';
      ctx.beginPath();
      ctx.moveTo(9, 0);
      ctx.lineTo(1, -3.4);
      ctx.lineTo(1, 3.4);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      ctx.globalCompositeOperation = 'source-over';
    });

    /* ── yıldırım sütunları ── */
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < this.bolts.length; i++) {
      const b = this.bolts[i];
      if (b.life <= 0) continue;
      const a = b.life / 0.28;

      /* kırık çizgili sütun: gökten hedefe */
      ctx.globalAlpha = a * 0.45;
      ctx.strokeStyle = '#9fd8ff';
      ctx.lineWidth = 9;
      this.strokeBoltPath(ctx, b.x, b.y);
      ctx.globalAlpha = a;
      ctx.strokeStyle = '#f2fbff';
      ctx.lineWidth = 2.5;
      this.strokeBoltPath(ctx, b.x, b.y);

      /* çarpma halkası */
      ctx.globalAlpha = a * 0.7;
      ctx.strokeStyle = '#eaf6ff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(b.x, b.y, (1 - a) * 26 + 4, 0, TAU);
      ctx.stroke();
    }
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;

    /* ── kor havanı fıçıları ── */
    g.pools.bombs.each(function (b) {
      if (!g.inView(b.x, b.y, 60)) return;
      /* yer gölgesi (hedef nokta) */
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.beginPath();
      ctx.ellipse(b.x, b.y, 9, 3.5, 0, 0, TAU);
      ctx.fill();
      /* hedef halkası — nereye düşeceğini göster */
      ctx.strokeStyle = 'rgba(255,90,60,0.5)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(b.tx, b.ty, b.radius * 0.5, 0, TAU);
      ctx.stroke();
      /* uçan fıçı */
      ctx.save();
      ctx.translate(b.x, b.y - b.h);
      ctx.rotate(b.spin);
      ctx.fillStyle = '#3a2a1c';
      ctx.fillRect(-6, -8, 12, 16);
      ctx.fillStyle = '#5a4028';
      ctx.fillRect(-6, -3, 12, 2.4);
      ctx.fillRect(-6, 3, 12, 2.4);
      /* fitil kıvılcımı */
      ctx.fillStyle = '#ffd08a';
      ctx.beginPath();
      ctx.arc(0, -10, 2 + Math.random() * 1.4, 0, TAU);
      ctx.fill();
      ctx.restore();
    });
  }

  strokeBoltPath(ctx, x, y) {
    ctx.beginPath();
    ctx.moveTo(x + (Math.random() - 0.5) * 10, y - 300);
    let py = y - 300;
    for (let s = 1; s <= 5; s++) {
      py = y - 300 + (300 / 5) * s;
      const jx = s === 5 ? 0 : (Math.random() - 0.5) * 30;
      ctx.lineTo(x + jx, py);
    }
    ctx.stroke();
  }

  /* ── 6. KOR HAVANI (bomba) ── */
  updateBomb(dt) {
    this.bombT -= dt;
    if (this.bombT > 0) return;

    const g = this.game, p = g.player;
    const L = this.lvl('bomba') - 1;
    const W = this.W.bomba;

    /* hedef: görüşteki en kalabalık bölge yaklaşımı — en yakın düşman
       ya da yok ise oyuncunun önü. Basit ama etkili: nearest. */
    let tx, ty;
    if (this.nearest && this.nearestD2 < 380 * 380) {
      tx = this.nearest.x; ty = this.nearest.y;
    } else {
      const a = p.facing + (Math.random() - 0.5) * 0.6;
      const r = 150 + Math.random() * 90;
      tx = p.x + Math.cos(a) * r; ty = p.y + Math.sin(a) * r;
    }

    this.bombT = W.cooldown[L] * p.atkMult;
    g.pools.bombs.obtain(p.x, p.y - 6, tx, ty, W.fuse, W.dmg[L], W.radius[L]);
    g.audio.play('throw');
  }

  /** Fıçı uçuşu: yay çizip iner, sonra patlar. */
  updateBombProj(b, dt) {
    b.t += dt;
    const k = Math.min(1, b.t / b.dur);
    b.x = b.sx + (b.tx - b.sx) * k;
    b.y = b.sy + (b.ty - b.sy) * k;
    b.spin += dt * 9;
    /* düşüş dümanı (görsel yükseklik) */
    b.h = Math.sin(k * Math.PI) * (46 + b.dist * 0.18);

    /* uçarken kor izi */
    if (Math.random() < dt * 26) {
      this.game.pools.particles.obtain(b.x, b.y - b.h, 0, 10, 0.3, 2, COLORS.ember, 0.95, 0, true);
    }

    if (k >= 1) {
      this.game.explode(b.tx, b.ty, b.dmg, b.radius, true);
      return true;
    }
    return false;
  }

  /* ── 7. ŞİMŞEK KIRIĞI — zincirleme yıldırım (efsanevi kahraman imzası) ──
     Kaynak (süzülen kırık) en yakın düşmana çarpar, sonra ZİNCİRLEME
     olarak yakındaki başka düşmanlara sıçrar (chains kademesi + chain
     imza kartı). Her sıçramada hasar chainFalloff ile azalır. Görseli
     render3d._updateLightningArcs okur (spawnLightningArc/spawnStormStrike). */
  updateSimsek(dt) {
    const g = this.game, p = g.player;
    const W = this.W.simsek;

    /* FIRTINA ÇAĞRISI — bağımsız periyodik büyük vuruş (imza ile açılır) */
    if (W.storm | 0) {
      if (this.simsekStormT == null) this.simsekStormT = 4.5;
      this.simsekStormT -= dt;
      if (this.simsekStormT <= 0) {
        this.simsekStormT = Math.max(3.0, 7.2 - (W.storm | 0) * 1.1);
        this.fireStorm();
      }
    }

    this.simsekT -= dt;
    if (this.simsekT > 0) return;
    const L = this.lvl('simsek') - 1;
    if (!this.nearest || this.nearestD2 > W.range[L] * W.range[L]) { this.simsekT = 0.22; return; }
    this.simsekT = W.cooldown[L] * p.atkMult;
    this.fireChain(L, W);
  }

  /** Zincirleme vuruş: kaynaktan en yakın hedefe, sonra sırayla yakındaki
      vurulmamış hedeflere sıçrar. Her sıçrama görsel bir kavis bırakır. */
  fireChain(L, W) {
    const g = this.game;
    const chainN = Math.max(1, W.chains[L] + (W.chain | 0));
    const hit = this._simsekHit || (this._simsekHit = []);
    hit.length = 0;
    let target = this.nearest;
    let ox = this.simsekPos.x, oy = this.simsekPos.y;
    let dmg = W.dmg[L];
    const knock = 130 * (1 + (W.knock | 0) * 0.4);
    let count = 0;
    while (target && count < chainN) {
      const ang = Math.atan2(target.y - oy, target.x - ox);
      applyHit(g, target, dmg, ang, knock, W.critAdd || 0, false);
      if (g.renderer3d && g.renderer3d.spawnLightningArc) g.renderer3d.spawnLightningArc(ox, oy, target.x, target.y);
      if (W.shock | 0) g.explode(target.x, target.y, dmg * (0.2 + (W.shock | 0) * 0.09), 32 + (W.shock | 0) * 8, true);
      g.spawnBurst(target.x, target.y, '#bfe6ff', 6, 200, 2, 0.26, true);
      hit.push(target);
      ox = target.x; oy = target.y;
      dmg *= (W.chainFalloff || 0.8);
      count++;
      if (count >= chainN) break;
      const cand = g.enemies.queryCircle(ox, oy, W.chainRange[L], this.scratch);
      let best = null, bd = Infinity;
      for (let i = 0; i < cand.length; i++) {
        const c = cand[i];
        if (hit.indexOf(c) >= 0) continue;
        const dx = c.x - ox, dy = c.y - oy;
        const d2 = dx * dx + dy * dy;
        if (d2 < bd) { bd = d2; best = c; }
      }
      target = best;
    }
    this.simsekFireCount = (this.simsekFireCount || 0) + 1;
    g.audio.play('simsekvur');
    Haptics.fire('crit');
  }

  /** Fırtına Çağrısı imza yeteneği: görüntüdeki rastgele bir hedefe
      bağımsız, devasa tekil vuruş. */
  fireStorm() {
    const g = this.game;
    const act = g.enemies.pool.active;
    const cand = [];
    for (let i = 0; i < act.length; i++) if (g.inView(act[i].x, act[i].y, -10)) cand.push(act[i]);
    if (!cand.length) return;
    const t = cand[(Math.random() * cand.length) | 0];
    const L = Math.max(0, this.lvl('simsek') - 1);
    const W = this.W.simsek;
    const dmg = W.dmg[L] * (2.2 + (W.storm | 0) * 0.35);
    g.explode(t.x, t.y, dmg, 90 + (W.storm | 0) * 12, true);
    if (g.renderer3d && g.renderer3d.spawnStormStrike) g.renderer3d.spawnStormStrike(t.x, t.y);
    g.addShake(0.14);
    g.audio.play('storm');
    Haptics.fire('crit');
  }

  /* ═══════════ LEVEL-UP SEÇİM HAVUZU ═══════════ */

  /** Silah gelişim değerlerini kart için önce→sonra satırlarına çevirir. */
  weaponStatLines(id, curLevel) {
    const defs = WEAPON_STATS[id];
    const W = this.W[id];
    if (!defs) return [];
    const lines = [];
    const toIdx = Math.min(curLevel, 4);            // hedeflenen seviye - 1
    for (let i = 0; i < defs.length; i++) {
      const key = defs[i][0], label = defs[i][1], unit = defs[i][2] || '';
      const arr = W[key];
      if (!arr) continue;
      const to = arr[toIdx];
      const from = curLevel > 0 ? arr[toIdx - 1] : null;
      /* bekleme süresi için azalan = iyi; diğerlerinde artan = iyi */
      const lowerBetter = key === 'cooldown';
      let dir = 0;
      if (from != null) dir = (to > from ? 1 : (to < from ? -1 : 0)) * (lowerBetter ? -1 : 1);
      lines.push({ label, from, to, unit, dir });
    }
    return lines;
  }

  rollChoices(n) {
    if (!this.cursed) this.cursed = {};
    const g = this.game;

    /* SİLAH KARTI YOK: silahlar Cephane'den gelir. Havuz iki kategori:
       • PASİF rünler (paylaşımlı: can, hız, kritik…) — kart başına EN FAZLA 2
       • AKTİF: kahramana özel imza kademeleri + silah özel perkleri (+ nimet)
       Kural: 4 kartın en çok 2'si pasif; şansa bağlı 3-4 pasif ASLA gelmez. */
    const passives = [];
    for (const id in PASSIVES) {
      const P = PASSIVES[id];
      const L = this.passives[id] || 0;
      if (L < P.maxLevel) {
        passives.push({
          kind: 'passive', id,
          tag: L === 0 ? 'RÜN' : 'GELİŞTİR',
          name: P.name, desc: P.desc, level: L, max: P.maxLevel, stats: [],
        });
      }
    }

    const actives = [];
    /* silah özel perkleri (build evrimi) */
    for (const sp of SPECIAL_PERKS) {
      if (this.specialTaken[sp.id]) continue;
      if (this.lvl(sp.need.weapon) >= 1) {
        actives.push({
          kind: 'special', id: sp.id, icon: sp.icon, tag: 'ÖZEL PERK',
          name: sp.name, desc: sp.desc, level: 0, max: 1, stats: [], boost: sp.boost,
        });
      }
    }
    /* kahramanın imza kademeleri — silahına ÖZEL geliştirmeler (5 kademe) */
    const cdef = g.charDef ? g.charDef() : null;
    const sigs = cdef ? SIGNATURES[cdef.id] : null;
    if (sigs && this.lvl(cdef.startWeapon) >= 1) {
      /* SEVİYE KİLİDİ: minLvl taşıyan imza yetenekleri kahraman o seviyeye
         gelmeden kart havuzuna GİRMEZ — seviye atlamak yeni oynanış açar. */
      const clvl = g.charLevel ? g.charLevel(cdef.id) : 1;
      for (const sp of sigs) {
        if (sp.minLvl && clvl < sp.minLvl) continue;
        const tier = this.sigLvl[sp.id] || 0;
        if (tier >= 5) continue;
        actives.push({
          kind: 'special', sig: true, myth: !!sp.myth,
          /* KARAKTERE ÖZEL PREMIUM KART BAYRAKLARI — burada elden düşerse
             style.css'teki o karakterin kart sanatı ÖLÜ KOD olur (kart
             jenerik turuncu myth çerçevesine düşer). Yeni kahraman eklerken
             config.js'teki bayrağı BU SATIRA da ekle. */
          seher: !!sp.seher, simsek: !!sp.simsek,
          korsan: !!sp.korsan, kralice: !!sp.kralice, sovalye: !!sp.sovalye,
          sapanci: !!sp.sapanci,
          id: sp.id,
          icon: sp.glyph || cdef.startWeapon,
          tag: 'KADEME ' + 'I II III IV V'.split(' ')[tier], tier: tier + 1,
          name: sp.name, desc: sp.desc, level: tier, max: 5, stats: [], boost: sp.boost,
        });
      }
    }
    /* v53 D1: EVRİM kartı — koşul sağlanınca kartlardan biri OLARAK kesin gelir */
    let evoCard = null;
    if (cdef && !this.evolved) {
      const E = EVOLUTIONS[cdef.id];
      let sum = 0; for (const k in this.sigLvl) sum += this.sigLvl[k] | 0;
      if (E && sum >= 5 && (this.passives[E.pas] | 0) >= 2 && this.lvl(E.weapon) >= 1) {
        evoCard = { kind: 'special', evo: true, myth: true, id: 'evo_' + cdef.id, icon: cdef.startWeapon,
          tag: 'EVRİM', name: E.name, desc: E.desc, level: 0, max: 1, stats: [],
          boost: Object.assign({ weapon: E.weapon }, E.boost) };
      }
    }
    /* nimetler: AKTİF kategori dolgusu (pasif SAYILMAZ) */
    const nimets = [
      { kind: 'heal', id: 'heal', tag: 'NİMET', name: 'Kızıl Şifa', desc: 'Anında 40 can yeniler.', level: 0, max: 1, stats: [] },
      { kind: 'guc', id: 'guc', tag: 'NİMET', name: 'Kadim Güç', desc: 'Tüm hasar kalıcı olarak +%8.', level: 0, max: 1, stats: [] },
      { kind: 'heal', id: 'heal2', tag: 'NİMET', name: 'Kan Ziyafeti', desc: 'Anında 40 can yeniler.', level: 0, max: 1, stats: [] },
    ];

    const shuffle = (a) => {
      for (let i = a.length - 1; i > 0; i--) {
        const j = (Math.random() * (i + 1)) | 0;
        const t = a[i]; a[i] = a[j]; a[j] = t;
      }
      return a;
    };
    shuffle(passives); shuffle(actives);

    /* PASİF ÜST SINIRI: en fazla 2 — rastgele 0-2 (çoğu zaman 1-2). */
    const MAX_PASSIVE = 2;
    let pWant = 0;
    for (let i = 0; i < MAX_PASSIVE; i++) if (Math.random() < 0.72) pWant++;
    pWant = Math.min(pWant, passives.length, n);

    const out = [];
    for (let i = 0; i < pWant; i++) out.push(passives[i]);

    /* kalanı AKTİF + NİMET ile doldur (aktifler önce — Brotato hissi) */
    const rest = actives.concat(nimets);
    let ri = 0;
    while (out.length < n && ri < rest.length) out.push(rest[ri++]);

    /* hâlâ eksikse kalan pasiflerle tamamla ama üst sınırı ASLA aşma */
    let pi = pWant;
    const passiveCount = () => out.reduce((k, c) => k + (c.kind === 'passive' ? 1 : 0), 0);
    while (out.length < n && pi < passives.length && passiveCount() < MAX_PASSIVE) out.push(passives[pi++]);

    /* son çare (çok nadir): nimet tekrarı */
    let ni = 0;
    while (out.length < n) out.push(nimets[ni++ % nimets.length]);

    shuffle(out);
    const res = out.slice(0, n);
    /* v71 B2: kahraman evrimi yoksa (ya da alındıysa) ikincil silah evrimi — en yüksek seviyeli uygun silah */
    if (!evoCard && !this.wEvolved && g.player && g.player.level >= 9) {
      let best = null, bl = 0;
      for (const wid in WEAPON_EVO) {
        const E = WEAPON_EVO[wid], l = this.lvl(wid);
        if (l >= 1 && (this.passives[E.pas] | 0) >= 2 && l > bl) { best = wid; bl = l; }
      }
      if (best) {
        const E = WEAPON_EVO[best];
        evoCard = { kind: 'special', evo: true, wEvo: true, myth: true, id: 'evo_w_' + best, icon: best,
          tag: 'EVRİM', name: E.name, desc: E.desc, level: 0, max: 1, stats: [],
          boost: Object.assign({ weapon: best }, E.boost) };
      }
    }
    if (evoCard) res[(Math.random() * res.length) | 0] = evoCard;
    /* v62 D2 LANETLİ KART: 8. seviyeden sonra %16 şansla bir kart LANETLİ olur — büyük güç + gerçek bedel.
       Koşu başına en çok 2 lanet; evrim/imza kartının yerini ALMAZ; KAN KURUSU mühründe can bedeli olan lanet çıkmaz. */
    if (g.player && g.player.level >= 8 && (this.curses | 0) < 2 && Math.random() < 0.16) {
      const pool = CURSES.filter((k) => !this.cursed[k.id] && !(g.player.noHeal && k.noHealBan));
      if (pool.length) {
        const K = pool[(Math.random() * pool.length) | 0];
        const slot = res.findIndex((c) => !c.evo && !c.sig && !c.pow);
        if (slot >= 0) res[slot] = { kind: 'curse', curse: true, id: K.id, icon: K.icon, tag: 'LANETLİ', name: K.name, desc: K.desc, level: 0, max: 1, stats: [], mods: K.mods };
      }
    }
    /* v56 A3 · 90. SANİYENİN GÜÇ ANI: ilk görevde (meta.ftue yok) 3. seviyeden itibaren ilk ekranda
       bir İMZA kartı garanti — oyuncu gücü sayılardan önce ekranda görür. Havuz aynı, oran değişmez. */
    if (!g.meta.ftue && !((g.progress && g.progress[1]) | 0) && !g._ftuePow && g.player && g.player.level >= 3) {
      const sig = actives.find((c) => c.sig);
      if (sig) { g._ftuePow = true; if (!res.some((c) => c.sig)) res[1] = sig; res.forEach((c) => { if (c.sig) c.pow = true; }); }
    }
    for (const c of res) { const t = this.cardTag(c); if (t) { c.stag = t; c.stagN = this.tagN[t] | 0; } }
    return res;
  }

  /** v63 D1: kartın etiketi (yoksa null) */
  cardTag(c) {
    if (!c || c.curse || c.evo) return null;
    if (c.kind === 'passive') return PAS_TAG[c.id] || null;
    if (c.kind === 'guc') return 'KOR';
    if (c.kind === 'special') { const cd = this.game.charDef ? this.game.charDef() : null; return cd ? HERO_TAG[cd.id] || null : null; }
    return null;
  }
  /** v63 D1: etiket sayacı + eşik (seçimde bir kez; sıcak yol değil) */
  _addTag(c) {
    const t = this.cardTag(c); if (!t) return;
    const n = this.tagN[t] = (this.tagN[t] | 0) + 1;
    const T = TAGS[t];
    for (const tr of T.tiers) {
      const key = t + tr.n;
      if (n >= tr.n && !this.tagDone[key]) {
        this.tagDone[key] = true;
        const g = this.game, p = g.player;
        p.applyMods(tr.mods);
        g.audio.play('synergy');
        g.spawnText(p.x, p.y - 52, tagName(t) + ' ' + tr.n + ' · ' + tr.name.toUpperCase(), T.col, 18, true);
        g.spawnBurst(p.x, p.y, T.col, 18, 240, 3, 0.6, true);
      }
    }
  }

  /** v53 D1: evrim ipucu (kart ekranı alt satırı) — neyin eksik olduğunu söyler. */
  evoHint() {
    const g = this.game, cdef = g.charDef ? g.charDef() : null;
    if (!cdef || this.evolved) return null;
    const E = EVOLUTIONS[cdef.id];
    if (!E) return null;
    let sum = 0; for (const k in this.sigLvl) sum += this.sigLvl[k] | 0;
    const pl = this.passives[E.pas] | 0;
    return { name: E.name, sig: Math.min(5, sum), pas: Math.min(2, pl), pasName: PASSIVES[E.pas] ? PASSIVES[E.pas].name : '' };
  }

  applyChoice(c) {
    const p = this.game.player;
    this._addTag(c);
    if (c.kind === 'weapon') {
      const was = this.slots[c.id] || 0;
      this.slots[c.id] = was + 1;
      if (was === 0) this.onWeaponGained();     // yeni silah → sınıf sinerjisi kontrolü
    } else if (c.kind === 'passive') {
      this.passives[c.id] = (this.passives[c.id] || 0) + 1;
      p.applyMods(PASSIVES[c.id].mods);
    } else if (c.kind === 'special') {
      this.applySpecial(c);
    } else if (c.kind === 'heal') {
      p.heal(40);
    } else if (c.kind === 'guc') {
      p.dmgMult += 0.08;
    } else if (c.kind === 'curse') {
      this.cursed[c.id] = true; this.curses = (this.curses | 0) + 1;
      p.applyMods(c.mods);
      const g = this.game;
      g.spawnBurst(p.x, p.y, '#ff4d5e', 22, 260, 3.2, 0.7, true);
      g.spawnBurst(p.x, p.y, '#2a0a10', 14, 180, 3, 0.8, false);
      g.spawnText(p.x, p.y - 70, 'LANET', '#ff8a94', 16, true);
      if (g.audio) g.audio.play('curse');
    }
  }

  /** Özel perk / imza kademesi: koşuya özel silah tablosunu KALICI büker. */
  applySpecial(c) {
    if (c.evo) {
      if (c.wEvo) this.wEvolved = true; else this.evolved = true;
      const g = this.game, p = g.player;
      /* v71 D2: EVRİM SİNEMASI (ui.evoCinema) — kart ekranı kapanınca oynar */
      const W0 = WEAPONS[c.boost.weapon];
      g._evoCine = { from: W0 ? W0.name : '', to: c.name, icon: c.icon };
      /* EVRİM ANI: halka + kor yağmuru + zoom vurgusu, keşif koleksiyona yazılır */
      if (g.meta) { if (!g.meta.evo) g.meta.evo = []; if (!g.meta.evo.includes(c.id)) { g.meta.evo.push(c.id); g.saveMeta(); } }
      g.spawnBurst(p.x, p.y, '#f0c77a', 26, 320, 3.4, 0.8, true);
      if (g.music && g.music.duck) g.music.duck(600);   // v56 B4
      g.spawnBurst(p.x, p.y, '#ffffff', 10, 180, 2.4, 0.5, true);
      if (g.fxImpact) g.fxImpact(p.x, p.y, 0, 3, '#f0c77a');
      if (g.punch) g.punch(0.045);
      g.spawnText(p.x, p.y - 70, 'EVRİM', '#ffe9bd', 16, true);
    }
    if (c.sig) this.sigLvl[c.id] = (this.sigLvl[c.id] || 0) + 1;
    else this.specialTaken[c.id] = true;
    /* Kritik HASARI oyuncu istatistiğidir (applyHit p.critMult okur) —
       silah tablosuna yazılsa hiçbir yerde okunmazdı. */
    if (c.boost.critMultAdd) this.game.player.critMult += c.boost.critMultAdd;
    /* ZIRH da aynı sebeple oyuncu istatistiğidir (SAVAŞÇI — Kalkan Duruşu). */
    if (c.boost.armorAdd) this.game.player.armor += c.boost.armorAdd;
    const W = this.W[c.boost.weapon];
    if (!W) return;
    for (const key in c.boost) {
      if (key === 'weapon') continue;
      const v = c.boost[key];
      /* çarpanlar: dmg/cd/arc/radius/spin/knock/range/speed/duration/critBonus/
         life(bulletLife)/spreadMul(spread) — eklemeler: volley/pierce/count/
         targets + skaler ekleme: bounceAdd(bounce). */
      const mulMap = { dmg: W.dps ? 'dps' : 'dmg', cd: 'cooldown', arc: 'arc', radius: 'radius',
                       spin: 'spin', knock: 'knock', range: 'range', speed: 'speed',
                       duration: 'duration', critBonus: 'critBonus',
                       life: 'bulletLife', spreadMul: 'spread', chainRange: 'chainRange',
                       /* GECE KRALİÇESİ — kesik yarıçapı / uçuş süresi */
                       waveR: 'waveR', waveLife: 'waveLife' };
      const addMap = { volley: 'volley', pierce: 'pierce', count: 'count', targets: 'targets' };
      const scalarAdd = { bounceAdd: 'bounce', flame: 'flame',
                          /* SAPANCI — Kırık Taş */
                          shatterAdd: 'shatter',
                          /* seviye ile açılan okçu yetenekleri */
                          explodeAdd: 'explode', homingAdd: 'homing', rainAdd: 'rain',
                          critAdd: 'critAdd', critMultAdd: 'critMultAdd',
                          /* seviye ile açılan SEHER kılıç yetenekleri */
                          spinAdd: 'spin', twinAdd: 'twin', waveAdd: 'wave', echoAdd: 'echo',
                          /* seviye ile açılan ŞİMŞEK yıldırım yetenekleri */
                          chainAdd: 'chain', shockAdd: 'shock', knockAdd: 'knock', stormAdd: 'storm',
                          /* KARA KAPTAN top + GECE KRALİÇESİ kesik yetenekleri */
                          splitAdd: 'split', broadsideAdd: 'broadside',
                          fanAdd: 'fan', judgeAdd: 'judge',
                          /* GÖKALEV yeniden tasarlanan iki imzası */
                          novaAdd: 'nova', cycloneAdd: 'cyclone',
                          /* AYAZ tepkisel zırhı */
                          carapaceAdd: 'carapace' };
      if (scalarAdd[key] && typeof W[scalarAdd[key]] === 'number') {
        W[scalarAdd[key]] += v;
      } else if (mulMap[key] && W[mulMap[key]] != null) {
        const tgt = W[mulMap[key]];
        if (Array.isArray(tgt)) {
          for (let i = 0; i < tgt.length; i++) tgt[i] = Math.round(tgt[i] * v * 100) / 100;
        } else {
          W[mulMap[key]] = Math.round(tgt * v * 100) / 100;
        }
      } else if (addMap[key] && W[addMap[key]]) {
        const arr = W[addMap[key]];
        for (let i = 0; i < arr.length; i++) arr[i] += v;
      }
    }
    const g = this.game, p = g.player;
    /* kart alınırken sarsıntı yok: seçim ekranı kapanırken kamera zıplamasın */
    g.spawnText(p.x, p.y - 44, c.name.toUpperCase(), '#f5c044', 20, true);
  }

  /** Sınıf sinerjileri: aynı sınıftan N farklı silah → kalıcı koşu bonusu. */
  onWeaponGained() {
    const counts = {};
    for (const id in this.slots) {
      if (this.slots[id] > 0 && WEAPON_META[id]) {
        const cls = WEAPON_META[id].class;
        counts[cls] = (counts[cls] || 0) + 1;
      }
    }
    const g = this.game, p = g.player;
    for (const cls in CLASS_SYNERGIES) {
      const have = counts[cls] || 0;
      for (const syn of CLASS_SYNERGIES[cls]) {
        const key = cls + ':' + syn.need;
        if (have >= syn.need && !this.synApplied[key]) {
          this.synApplied[key] = true;
          p.applyMods(syn.mods);
          g.audio.play('synergy');   /* sinerji: temiz çan üçlüsü, fanfar değil */
          g.spawnText(p.x, p.y - 44, 'SİNERJİ: ' + syn.name.toUpperCase(), '#59e3c8', 18, true);
        }
      }
    }
  }
}

/* v75: büyü küresi halesi — tek sefer pişen 64 px sprite (sıcak döngüde gradyan yok) */
let _orbHalo = null;
function orbHalo() {
  if (_orbHalo) return _orbHalo;
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 2, 32, 32, 32);
  gr.addColorStop(0, 'rgba(216,184,255,0.95)'); gr.addColorStop(0.4, 'rgba(155,108,255,0.55)'); gr.addColorStop(1, 'rgba(120,70,220,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  return (_orbHalo = c);
}
