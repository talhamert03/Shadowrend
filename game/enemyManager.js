/* ═══════════════════════════════════════════════════════════
   enemyManager.js — Sürüler, Zekâ ve Dünya Boss'ları (v2)

   • SpatialGrid: 72px hücreli uzamsal ızgara. 500+ düşmanda
     çarpışma/komşuluk sorguları O(n²) yerine O(n) civarında.
   • Sprite Baking v2: her düşman tipi + beyaz "flaş" varyantı
     açılışta 2× ÇÖZÜNÜRLÜKTE bir kez offscreen canvas'a çizilir
     (retina'da keskin), oyun sırasında yalnızca drawImage —
     vektör path maliyeti kare başına SIFIR.
   • Bestiyari v2 — tamamen yeni tasarımlar:
       HORTLAK  · süzülen paçavra hayalet, ışıyan ruh çekirdeği
       KIRPAN   · orak kollu böceksi koşucu
       LAHİT    · derzlerinden ışık sızan lahit golemi
       NAZARGÖZ · taş kaşlı, dev tek göz küresi
       BOSS     · boynuz taçlı, rünlü tırpanlı azrail
   • Sürü ayrışması + Boss FSM değişmedi.
   ═══════════════════════════════════════════════════════════ */

import { ENEMY_TYPES, waveWeights, waveHpMul, waveDmgMul, waveInterval, waveBatch,
         WAVES, BOSS, DRAGON, RUN, COLORS, FX, RAMP, onScreenCap, pressureAt,
         spawnGap, spawnBatch } from './config.js?v=20260930m';
import { BOSS_ATK, DRAGON_ATK } from './bossMotion.js?v=20260930m';
import { Pool } from './pool.js?v=20260930m';
import { Quality } from './perf.js?v=20260930m';
import { damagePlayer } from './combat.js?v=20260930m';

/* v53 D5: elit değiştirici tablosu (bit · ad · renk). Renk config paletinden: kalkan=spirit gümüş-mavi,
   kor=ember, yeşil yalnız bölünen (zehir dili), kızıl=öfke. */
export const AFX = { SHIELD: 1, SPLIT: 2, SWIFT: 4, BLAST: 8, REGEN: 16, RAGE: 32 };
export const ELITE_AFFIX = [
  { bit: 1,  name: 'KALKANLI', col: '#9fb4c9' },
  { bit: 2,  name: 'BÖLÜNEN',  col: '#8fd46a' },
  { bit: 4,  name: 'ÇEVİK',    col: '#e8e0a0' },
  { bit: 8,  name: 'PATLAYAN', col: '#d8a284' },
  { bit: 16, name: 'YENİLENEN', col: '#6fe0c8' },
  { bit: 32, name: 'ÖFKELİ',   col: '#ff5a4e' },
];

/* ── Uzamsal Izgara ─────────────────────────────────────── */
class SpatialGrid {
  constructor(cellSize) {
    this.cs = cellSize;
    this.cells = new Map();
    this.used = [];
  }
  key(cx, cy) { return ((cx + 32768) << 16) ^ (cy + 32768); }
  clear() {
    for (let i = 0; i < this.used.length; i++) this.used[i].length = 0;
    this.used.length = 0;
  }
  insert(e) {
    const cx = Math.floor(e.x / this.cs);
    const cy = Math.floor(e.y / this.cs);
    const k = this.key(cx, cy);
    let arr = this.cells.get(k);
    if (!arr) { arr = []; this.cells.set(k, arr); }
    if (arr.length === 0) this.used.push(arr);
    arr.push(e);
  }
  query(x, y, r, out) {
    out.length = 0;
    const cs = this.cs;
    const x0 = Math.floor((x - r) / cs), x1 = Math.floor((x + r) / cs);
    const y0 = Math.floor((y - r) / cs), y1 = Math.floor((y + r) / cs);
    for (let cx = x0; cx <= x1; cx++) {
      for (let cy = y0; cy <= y1; cy++) {
        const arr = this.cells.get(this.key(cx, cy));
        if (!arr) continue;
        for (let i = 0; i < arr.length; i++) out.push(arr[i]);
      }
    }
    return out;
  }
}

/* ── Düşman Yöneticisi ──────────────────────────────────── */
export class EnemyManager {
  constructor(game) {
    this.game = game;

    this.pool = new Pool('enemies',
      () => ({
        x: 0, y: 0, hp: 0, maxHp: 0, speed: 0, radius: 0, dmg: 0, xp: 0,
        type: '', color: '', knockRes: 1, flash: 0, kx: 0, ky: 0, atkAnim: 0, mvAmt: 0,
        seed: 0, bob: 0, obCd: 0, swordId: 0, isBoss: false,
        hitT: 0, hitD: 0.15, stopT: 0, stopCd: 0, stopMv: false, thief: false, duelTok: 0, txt: null, txtT: -9,
        fireCd: 0, range: 0, bulletDmg: 0, bulletSpeed: 0, elite: false,
        affix: 0, shieldHp: 0, shieldMax: 0, regenT: 0, enraged: false, affixCol: '',
        state: 'chase', stateT: 0, cdx: 0, cdy: 0, dirx: 0, diry: 0,
        chargeCd: 0, spitCd: 0, standD: 0,
        tx: 0, ty: 0,
        /* patlayıcı fitili · kral nabzı · son vuruş açısı (ölüm çöküşü bunu
           okur: ceset darbenin geldiği yöne devrilir) */
        fuse: 0, auraT: 0, auraDmg: 0, hurtAng: 0, leapCd: 0, bossKind: 'lord',
        __pi: undefined,
      }),
      (e, type, x, y, hpMul, dmgMul) => {
        e.x = x; e.y = y;
        e.type = type;
        e.flash = 0; e.kx = 0; e.ky = 0; e.hurtT = 0; e.atkAnim = 0; e.mvAmt = 0;
        e.hitT = 0; e.hitD = 0.15; e.stopT = 0; e.stopCd = 0; e.stopMv = false; e.thief = false; e.duelTok = 0;
        /* birleşen hasar sayısının sahibi: geri dönüşen yuva önceki düşmanın
           yazısına eklemesin (combat FEEL ②) */
        e.txt = null; e.txtT = -9;
        e.seed = Math.random() * 6.283;
        e.bob = Math.random() * 6.283;
        e.obCd = 0; e.swordId = 0;
        /* standD: menzilli düşmanın yumuşatılmış durma mesafesi. OBTAIN'DE
           SIFIRLANIR — geri dönüşen bir düşman önceki sahibinin mesafesini
           taşırsa doğduğu anda o değere koşmaya çalışır (pBullets'taki
           bayrak dersi — havuz nesnesinin her alanı sıfırlanır). */
        e.standD = 0;
        e.state = 'chase'; e.stateT = 0; e.cdx = 0; e.cdy = 0; e.dirx = 0; e.diry = 0;
        e.elite = false; e.entryT = 0; e.prey = false; e._ultN = 0;   // v63 İ4 AV hedefi · v64 süper damgası
        e.affix = 0; e.shieldHp = 0; e.shieldMax = 0; e.regenT = 0; e.enraged = false; e.affixCol = '';
        /* HAVUZ NESNESİNİN HER ALANI SIFIRLANIR (pBullets'taki `isPet` dersi):
           fitili yanmış bir patlayıcının yuvasına doğan yeni düşman doğduğu
           karede patlardı. */
        e.fuse = 0; e.auraT = 0; e.auraDmg = 0; e.hurtAng = 0; e.leapCd = 0;
        e.tx = 0; e.ty = 0;

        if (type === 'boss') {
          e.isBoss = true;
          /* BOSS TÜRÜ DÜNYADAN GELİR: bataklıkta BATAK EJDERİ (zıplayan,
             zehir bombalayan), diğer her yerde HASAT LORDU (süzen, hücum
             eden). İkisi ayrı durum makinesi ve ayrı poz kullanır. */
          e.bossKind = this.bossKind || 'lord';
          e.maxHp = Math.round(BOSS.hp * hpMul);
          e.hp = e.maxHp;
          e.speed = BOSS.speed;
          e.radius = BOSS.radius;
          e.dmg = BOSS.dmg * dmgMul;
          e.xp = BOSS.xp;
          e.color = COLORS.boss;
          e.knockRes = BOSS.knockRes;
          e.chargeCd = BOSS.chargeCd * 0.6;
          e.spitCd = BOSS.spitCd * (e.phase >= 1 ? 0.75 : 1);
          e.bulletDmg = BOSS.bulletDmg * dmgMul;
          e.bulletSpeed = BOSS.bulletSpeed;
          e.spitCd = e.bossKind === 'ejder' ? DRAGON.spitCd * 0.6 : BOSS.spitCd;
          e.leapCd = DRAGON.leapCd * (e.phase >= 2 ? 0.6 : 1) * 0.8;
          e.state = e.bossKind === 'ejder' ? 'perch' : 'chase';
        } else {
          const s = ENEMY_TYPES[type];
          e.isBoss = false;
          e.maxHp = Math.round(s.hp * hpMul);
          e.hp = e.maxHp;
          e.speed = s.speed * (0.88 + Math.random() * 0.24);
          e.radius = s.radius;
          e.dmg = s.dmg * dmgMul;
          e.xp = s.xp;
          e.color = s.color;
          e.knockRes = s.knockRes;
          e.range = s.range || 0;
          e.fireCd = s.fireCd ? Math.random() * s.fireCd : 0;
          e.bulletDmg = (s.bulletDmg || 0) * dmgMul;
          e.bulletSpeed = s.bulletSpeed || 0;
          /* KRAL NABZI: ilk nabız tam doğduğu anda atmaz — oyuncu kralın
             geldiğini GÖRMEDEN hasar yemesin. */
          if (type === 'kral') { e.auraT = s.auraCd * 0.75; e.auraDmg = s.auraDmg * dmgMul; }
        }
      }, 300);

    this.grid = new SpatialGrid(72);
    this.scratch = [];
    this.sprites = {};
    this.worldHue = 0;
    this.worldColor = COLORS.blood;
    this.worldBoss = BOSS.name;
    this.speedMul = 1;
    this.eliteChance = 0;
    this.bakeSprites();
    /* Not: raster iskelet/nekro kare setleri v51'de SİLİNDİ (hiç çağrılmıyordu).
       Tüm düşmanlar azrail/kasap/cellat ile aynı "tatlı" vektör çizim
       diliyle (drawEnemyShape) render ediliyor — tutarlı, insansı, oyunumsu. */

    this._upd = (e, dt) => this.updateEnemy(e, dt);
    this._updB = (b, dt) => this.updateBullet(b, dt);

    this.reset();
  }

  reset() {
    this.pool.releaseAll();
    this.wave = 1;
    this.spawning = false;
    this.spawnTimer = 1.2;
    this.interval = 1.0;
    this.batch = 1;
    this.weights = { zombi: 10 };
    this.hpMul = 1;
    this.dmgMul = 1;
    this.bossSpawned = false;
    this.bossDefeated = false;
    this.boss = null;
    this.bossCount = 0;
    this.killSndT = 0;
    this.waveT = 0;
    this.queue = 0;
    this.qTimer = 0;
    this.inView = 0;
  }

  /* ═══════════ DÜNYA KİMLİĞİ ═══════════ */

  setWorld(wd) {
    this.worldColor = wd.color;
    this.worldBoss = wd.boss;
    this.speedMul = wd.speedMul || 1;
    /* Bataklığın boss'u ejderdir; kalan dokuz dünyada Hasat Lordu.
       Tek yerde kararlaşır, obtain onu okur. */
    this.bossKind = wd.floor === 'bataklik' ? 'ejder' : 'lord';
    if (this.worldHue !== wd.hue) {
      this.worldHue = wd.hue;
      this.bakeSprites();
    }
  }

  /* ═══════════ DALGA KONTROLÜ ═══════════ */

  startWave(wave) {
    const msn = this.game.msn;
    const eff = wave + msn.mixOffset;
    this.wave = wave;
    this.hpMul = waveHpMul(wave) * msn.hpMul;
    this.dmgMul = waveDmgMul(wave) * msn.dmgMul;
    /* KARIŞIM KAYDIRMASI (mixOffset) YALNIZ KARIŞIMI SÜRER (2026-08-29).
       Önceden aynı sayı doğum aralığını ve grup boyunu da sürüyordu ve
       etkisi ÇARPIMSALDI: 10. dünyanın 5. görevinde mixOffset 20, yani
       BİRİNCİ dalga 21. dalga gibi doğuyor — eğrinin tabanı (0,34 sn · 10'lu
       grup) × dünya yoğunluğu 1,82 → ilk 60 saniyede 609 düşman (ölçüldü,
       _baltest ⑥). Nefes penceresi orada matematiksel olarak yoktu.
       Baskı artık DÜNYA YOĞUNLUĞU (density) + CANLI TAVANI ile büyür;
       karışım (hangi türler, ne oranda) ise mixOffset ile baştan serttir.
       "Daha çok düşman" ile "daha zor düşman" iki ayrı kaldıraçtır. */
    this.weights = waveWeights(eff, msn.roster);
    /* Kalabalık: yoğunluk "baskı", canlı üst sınırı "tavan". Boss
       dalgasında yoğunluk kısılır — lordun silueti kalabalıkta kaybolmasın. */
    this.densityMul = (msn.density || 1) * (this.game.isBossWave(wave) ? 0.4 : 1);
    /* Kullanılan iki değer her karede config'in TEK kaynağından türetilir
       (spawnGap / spawnBatch); burada yalnız başlangıç değerleri yazılır. */
    this.interval = spawnGap(wave, 1);
    this.batch = spawnBatch(wave, this.densityMul, 1);
    this.waveT = 0;
    this.queue = 0;
    this.qTimer = 0;
    this.osCap = onScreenCap(wave);
    this.aliveCap = msn.aliveCap || 120;
    this.bossHpMul = waveHpMul(wave) * (msn.bossHpMul || msn.hpMul);
    this.eliteChance = msn.eliteChance || 0;
    this.spawnTimer = 0.55;
    this.spawning = true;
    this.bossSpawned = false;
    this.bossDefeated = false;
    this.boss = null;
    /* v53j KUSUR: kule/mühür çarpanları startWave'den SONRA yazılıyordu, boss ise
       burada doğuyordu → kule boss katında boss ölçeklenmemiş canla geliyordu.
       Çarpanlar artık boss doğmadan uygulanır. */
    if (this.game.applyWaveMods) this.game.applyWaveMods();
    if (this.game.isBossWave(wave)) this.spawnBoss();
  }

  clearAll() {
    const g = this.game;
    const act = this.pool.active;
    for (let i = act.length - 1; i >= 0; i--) {
      const e = act[i];
      if (g.inView(e.x, e.y, 40)) {
        g.spawnBurst(e.x, e.y, e.color, 5, 130, 2.5, 0.4, false);
        g.spawnGem(e.x, e.y, Math.max(1, Math.round(e.xp * 0.5)));
      }
    }
    this.pool.releaseAll();
    g.pools.eBullets.releaseAll();
    this.boss = null;
    this.spawning = false;
  }

  /* ═══════════ GÜNCELLEME ═══════════ */

  /** Yeni düşman doğabilir mi? Yuva doğuşları (objectives) buradan sorar —
      yoksa üç yuva + dalga akışı üst üste binip canlı bütçesini aşardı. */
  canSpawn() {
    return this.pool.count < Math.min(this.aliveCap || 120, Quality.budget('enemies'));
  }

  /** Baskı çarpanı. 1 = eğrinin yazdığı baskı. Üç kaynağı ÇARPAR ve
      üçü de ayrı ayrı ölçülebilir kalır (bkz. config.RAMP · config.DYN):
        • nefes penceresi — koşunun ilk ~50 sn'si
        • dalga yumuşaması — her dalganın ilk 6 sn'si
        • dinamik pay — oyuncunun ölüm/zafer geçmişi (kalıcı, görünmez)
      Tahsis YOK: sadece çarpma. Sıcak döngüde her karede çağrılır. */
  pressure() {
    const g = this.game;
    return pressureAt(g.time || 0, this.waveT, g.dynMul ? g.dynMul() : 1);
  }

  /** Belirli bir NOKTADAN doğur (yuva). Kenar doğuşundan tek farkı konum:
      düşman tipi, çarpanlar ve elit yuvarlaması aynı yoldan geçer. */
  spawnAtPoint(x, y) {
    const g = this.game;
    const before = this.pool.count;
    this.spawnOne(this.weights, this.hpMul, this.dmgMul);
    if (this.pool.count === before) return null;
    const e = this.pool.active[this.pool.count - 1];
    if (!e) return null;
    e.x = x; e.y = y;
    const A = g.arena;
    if (A) {
      e.x = Math.max(A.l + 26, Math.min(A.r - 26, e.x));
      e.y = Math.max(A.t + 26, Math.min(A.b - 26, e.y));
    }
    /* engelin İÇİNDE doğarsa itilir: yuva mahzenin dibinde olabilir */
    if (g.props) g.props.resolve(e, e.radius * 0.62);
    return e;
  }

  update(dt) {
    const g = this.game;
    /* DONDURMA (düşen güç): düşman durur, oyuncu durmaz. Oyunun `freeze`
       alanı kare döngüsünü dondurur ve girdiyi de öldürür — oyuncu "oyun
       kilitlendi" sanar. Zaman durması oyuncunun HAREKET ETTİĞİ andır.
       Doğuş da durur: donuk sahneye yeni düşman sızması ödülü yalanlar. */
    const froze = g.powerups && g.powerups.frozen();
    /* Doğum sınırı CANLI bütçeden okunur: cihaz termal kısılmaya girip
       Quality.stress yükselirse yeni doğumlar kısılır (yaşayan düşmanlar
       silinmez — sahne aniden boşalmaz, sadece daha az yenisi gelir). */
    /* Doğum tavanı = min(görev tavanı, cihazın canlı bütçesi). */
    const cap = Math.min(this.aliveCap || 120, Quality.budget('enemies'));
    if (!froze) this.waveT += dt;
    if (!froze && this.spawning) {
      const pr = this.pressure();
      this.interval = spawnGap(this.wave, pr);
      this.batch = spawnBatch(this.wave, this.densityMul || 1, pr);
      this.spawnTimer -= dt;
      if (this.spawnTimer <= 0) {
        this.spawnTimer = this.interval;
        this.queue += this.batch;
      }
      /* DOĞUŞ YAYMASI: grup aynı KAREDE doğmaz, RAMP.spread aralıkla
         sızar. Altı düşmanın tek karede belirmesi "yığılma" olarak
         okunuyordu; aynı altı düşman yarım saniyeye yayılınca "akın" olur.
         Tavan doluysa kuyruk SİLİNİR, birikmez: biriken borç yer açıldığı
         anda yirmi düşmanı tek karede boşaltır — çözmeye çalıştığımız
         yığılmanın aynen kendisi. */
      if (this.queue > 0) {
        this.qTimer -= dt;
        let guard = 12;
        while (this.queue > 0 && this.qTimer <= 0 && guard-- > 0) {
          if (this.pool.count >= cap || this.inView >= (this.osCap || 64)) { this.queue = 0; break; }
          this.spawnOne(this.weights, this.hpMul, this.dmgMul);
          this.queue--;
          this.qTimer += RAMP.spread;
        }
        if (this.qTimer < 0) this.qTimer = 0;
      }
    }

    this.pool.updateEach(this._upd, froze ? 0 : dt);

    this.grid.clear();
    const act = this.pool.active;
    /* Görüş alanı sayımı ızgara döngüsüyle AYNI geçişte yapılır: ikinci
       bir döngü 250 düşmanda bedava değildir. */
    let vis = 0;
    for (let i = 0; i < act.length; i++) {
      const e = act[i];
      this.grid.insert(e);
      if (g.inView(e.x, e.y, 20)) vis++;
    }
    this.inView = vis;

    this.separate();

    g.pools.eBullets.updateEach(this._updB, dt);

    if (this.killSndT > 0) this.killSndT -= dt;
  }

  spawnOne(weights, hpMul, dmgMul) {
    let total = 0;
    for (const k in weights) total += weights[k];
    let roll = Math.random() * total;
    let type = 'zombi';
    for (const k in weights) {
      roll -= weights[k];
      if (roll <= 0) { type = k; break; }
    }

    const g = this.game;
    const m = WAVES.spawnDist;
    const w = (g.viewR - g.viewL) + m * 2;
    const h = (g.viewB - g.viewT) + m * 2;
    const per = 2 * (w + h);
    let d = Math.random() * per;
    let x, y;
    if (d < w)              { x = g.viewL - m + d;               y = g.viewT - m; }
    else if (d < w + h)     { x = g.viewR + m;                    y = g.viewT - m + (d - w); }
    else if (d < w * 2 + h) { x = g.viewR + m - (d - w - h);      y = g.viewB + m; }
    else                    { x = g.viewL - m;                    y = g.viewB + m - (d - w * 2 - h); }

    const e = this.pool.obtain(type, x, y, hpMul, dmgMul);
    /* sonlu arena: spawn çitlerin İÇİNE sıkıştır (duvardan doğma yok) */
    const A = g.arena;
    if (A) {
      e.x = Math.max(A.l + 26, Math.min(A.r - 26, e.x));
      e.y = Math.max(A.t + 26, Math.min(A.b - 26, e.y));
    }
    e.speed *= this.speedMul;
    /* v53 C3: görüş içinde doğan düşman biyom renginde yerden kalkar (toz + kıvılcım).
       Görüş dışı doğumda maliyet sıfır. */
    if (g.inView(e.x, e.y, 10)) {
      g.spawnBurst(e.x, e.y + e.radius * 0.5, '#3a302c', 5, 80, 3.2, 0.55, false);
      g.spawnBurst(e.x, e.y, this.worldColor || '#b06a49', 4, 120, 2.2, 0.4, true);
    }

    if (!e.isBoss && this.eliteChance > 0 && Math.random() < this.eliteChance) {
      e.elite = true;
      e.maxHp = Math.round(e.maxHp * 3.2);
      e.hp = e.maxHp;
      e.dmg *= 1.5;
      e.xp = Math.max(3, Math.round(e.xp * 3.5));
      e.radius *= 1.28;
      e.speed *= 0.92;
      e.knockRes *= 0.6;
      this.rollAffix(e);
    }
  }

  /* ═══ v53 D5 — ELİT DEĞİŞTİRİCİLER ═══
     Yeni model yok: her değiştirici bir renk (can çubuğu + doğum yazısı) ve
     tek bir kural. D1-6'da bir, D7+'da iki değiştirici. Ödül: değiştirici
     başına +%20 XP. Maliyet kare başına yalnız bit testi. */
  rollAffix(e) {
    const g = this.game;
    const n = ((g.worldId | 0) >= 7 || g.nmRun) ? 2 : 1;       // v54 H2: Kabus'ta her elit iki değiştirici
    let mask = 0, guard = 0, first = null;
    while (guard++ < 8) {
      const A = ELITE_AFFIX[(Math.random() * ELITE_AFFIX.length) | 0];
      if (mask & A.bit) continue;
      if (A.bit === AFX.SPLIT && e.type === 'patlayici') continue;
      mask |= A.bit; if (!first) first = A;
      let c = 0; for (let b = mask; b; b &= b - 1) c++;
      if (c >= n) break;
    }
    e.affix = mask;
    e.affixCol = first ? first.col : '';
    if (mask & AFX.SHIELD) { e.shieldMax = e.maxHp * 0.45; e.shieldHp = e.shieldMax; }
    if (mask & AFX.SWIFT) { e.speed *= 1.38; e.knockRes *= 0.8; }
    let c = 0; for (let b = mask; b; b &= b - 1) c++;
    e.xp = Math.round(e.xp * (1 + 0.2 * c));
    if (g.inView(e.x, e.y, 120)) {
      let label = '';
      for (const A of ELITE_AFFIX) if (mask & A.bit) label += (label ? ' · ' : '') + A.name;
      g.spawnText(e.x, e.y - e.radius - 26, label, first.col, 12, false);
    }
  }

  /** Kare başı değiştirici kuralları (yalnız elitte çağrılır). */
  tickAffix(e, dt) {
    if (e.affix & AFX.REGEN) {
      e.regenT += dt;
      if (e.regenT > 1.6 && e.hp < e.maxHp) e.hp = Math.min(e.maxHp, e.hp + e.maxHp * 0.05 * dt);
    }
    if ((e.affix & AFX.RAGE) && !e.enraged && e.hp < e.maxHp * 0.5) {
      e.enraged = true; e.speed *= 1.35; e.dmg *= 1.3;
      const g = this.game;
      if (g.inView(e.x, e.y, 60)) {
        g.spawnText(e.x, e.y - e.radius - 22, 'ÖFKE!', '#ff5a4e', 14, true);
        g.spawnBurst(e.x, e.y, '#ff5a4e', 8, 160, 2.6, 0.45, true);
      }
    }
  }

  /** Ölüm anı değiştiricileri — onDeath çağırır. */
  affixDeath(e) {
    const g = this.game;
    if (e.affix & AFX.BLAST) {
      /* telegraflı: 0,6 sn halka, sonra patlar — refleks penceresi (patlayıcı dersi) */
      g.spawnHazard(e.x, e.y, 96, Math.max(8, e.dmg * 1.1), 0.6, 0.3, 0, 0);
    }
    if (e.affix & AFX.SPLIT) {
      for (let i = 0; i < 2; i++) {
        const a = Math.random() * 6.283;
        const c = this.pool.obtain(e.type, e.x + Math.cos(a) * 22, e.y + Math.sin(a) * 22, this.hpMul, this.dmgMul);
        c.maxHp = Math.max(4, Math.round(e.maxHp / 3.2 * 0.4)); c.hp = c.maxHp;
        c.radius *= 0.82; c.speed *= this.speedMul * 1.12; c.xp = Math.max(1, Math.round(e.xp * 0.12));
      }
      if (g.inView(e.x, e.y, 60)) g.spawnBurst(e.x, e.y, '#8fd46a', 10, 190, 2.8, 0.5, false);
    }
  }

  spawnBoss() {
    const g = this.game;
    this.bossSpawned = true;
    const hpMul = (this.bossHpMul || this.hpMul) * (1 + this.bossCount * 0.55);
    const e = this.pool.obtain('boss', g.player.x, g.viewT - 140, hpMul, this.dmgMul);
    if (g.arena) {
      e.x = Math.max(g.arena.l + 40, Math.min(g.arena.r - 40, e.x));
      e.y = Math.max(g.arena.t + 40, Math.min(g.arena.b - 40, e.y));
    }
    this.boss = e;
    e.phase = 0; e.weakT = 0;
    e.entryT = 1.8;                         // v53 C1: giriş — durur, hasar almaz
    e.speed *= this.speedMul;
    g.ui.showBossBar(this.worldBoss);
    if (g.ui.bossMoment) g.ui.bossMoment('intro', this.worldBoss);
    if (g.fxImpact) g.fxImpact(e.x, e.y, 0, 3, COLORS.blood);             // yere iniş halkası
    g.audio.play('bossroar');
    g.addShake(FX.shakeBoss);
    g.hitStop(120);
    if (g.punch) g.punch(0.04);
    g.spawnText(g.player.x, g.player.y - 90, this.worldBoss + ' UYANDI', COLORS.blood, 20, true);
  }

  queryCircle(x, y, r, out) {
    return this.grid.query(x, y, r, out);
  }

  /* ── Tek düşman güncellemesi ── */
  updateEnemy(e, dt) {
    if (e.hp <= 0) { this.onDeath(e); return true; }

    const g = this.game;
    const p = g.player;

    e.bob += dt;
    if (e.flash > 0) e.flash -= dt;
    if (e.affix) this.tickAffix(e, dt);
    /* isabet ezilmesi (render3d okur). Yerel donma sürerken ezilme TEPEDE
       tutulur, donma bitince yayla bırakılır — yalnız görsel saat. */
    if (e.stopCd > 0) e.stopCd -= dt;
    if (e.stopT > 0) e.stopT -= dt;
    else if (e.hitT > 0) e.hitT -= dt;
    if (e.hurtT > 0) e.hurtT -= dt;
    if (e.atkAnim > 0) e.atkAnim -= dt;
    if (e.obCd > 0) e.obCd -= dt;

    const dx = p.x - e.x;
    const dy = p.y - e.y;
    const d2 = dx * dx + dy * dy;

    let mvx = 0, mvy = 0;

    if (e.isBoss && e.entryT > 0) {
      e.entryT -= dt;
      if (((e.entryT * 10) | 0) % 3 === 0 && g.inView(e.x, e.y, 80))
        g.spawnBurst(e.x + (Math.random() - 0.5) * e.radius * 2, e.y + e.radius * 0.6, '#5a4a40', 2, 90, 3, 0.5, false);
      if (e.entryT <= 0) { g.addShake(0.35); if (g.punch) g.punch(0.05); g.audio.play('bossarrive'); }
      mvx = 0; mvy = 0;
    } else if (e.isBoss && this.bossPhase(e, dt)) {
      mvx = 0; mvy = 0;
    } else if (e.isBoss) {
      this.updateBoss(e, dt, dx, dy, d2);
      mvx = e.cdx; mvy = e.cdy;
    } else if (e.type === 'patlayici') {
      /* ══ PATLAYICI KOŞUCU — "üstüne koşar, yaklaşınca patlar" ══
         FİTİL YANDIĞINDA DURUR. Koşarak patlayan bir düşmandan kaçmak
         imkansızdır (hızı oyuncudan yüksek); durması telegrafın kendisi.
         Öldürülürse PATLAMAZ — bu bir refleks ödülüdür, yoksa "vurdum ama
         yine de yedim" hissi kalır ve tip cezaya dönüşer. */
      const A = ENEMY_TYPES.patlayici;
      const d = Math.sqrt(d2) || 1;
      if (e.fuse > 0) {
        e.fuse -= dt;
        e.atkAnim = Math.max(e.atkAnim, 0.05);   // model şişme pozunu sürüyor
        if (e.fuse <= 0) { this.detonate(e); return true; }
      } else {
        mvx = (dx / d) * e.speed;
        mvy = (dy / d) * e.speed;
        if (d < A.fuseR) {
          e.fuse = A.fuse;
          if (g.inView(e.x, e.y, 60)) {
            g.spawnText(e.x, e.y - e.radius - 14, '!', COLORS.ember, 22, true);
            g.spawnBurst(e.x, e.y, COLORS.ember, 6, 90, 2.4, 0.3, true);
            if (g.audio) g.audio.play('telegraph');
          }
        }
      }
    } else if (e.type === 'kral') {
      /* ══ İSKELET KRAL — yavaş yürür, çevresine ölüm saçar ══
         Nabız TELEGRAFLIDIR (hazard kind 0): halka önce yerde büyür, sonra
         vurur. Sadece GÖRÜŞ ALANINDA nabız atılır — ekran dışındaki kral
         oyuncuyu görünmeyen bir alanla cezalanadırmaz (isabet katmanının
         görüş kapısıyla aynı gerekçe). */
      const A = ENEMY_TYPES.kral;
      const d = Math.sqrt(d2) || 1;
      mvx = (dx / d) * e.speed;
      mvy = (dy / d) * e.speed;
      e.auraT -= dt;
      const seen = g.inView(e.x, e.y, 120);
      if (e.auraT <= 0 && seen) {
        e.auraT = A.auraCd;
        e.atkAnim = A.auraTell;
        g.spawnHazard(e.x, e.y, A.auraR, e.auraDmg || A.auraDmg,
                               A.auraTell, A.auraTell + 0.42, 0, 0);
        if (g.renderer3d && g.renderer3d.spawnCast) {
          /* İMZA ANI (kademe 3): 3,1 sn'de bir olan NADİR olay — tanımı
             karşılıyor. Renk kralın dili: koyu kızıl hasat. */
          g.renderer3d.spawnCast(e.x, e.y, 0.92, 0.16, 0.22);
        }
        if (g.audio) g.audio.play('bosscast');
      }
      /* ÖLÜM ZERRELERİ: sürekli ama SEYREK (saniyede ~5). Kralın "etrafından
         ölüm saçıyor" görüntüsü nabız arasında da durmaz; kalabalık
         partikül bütçesini yemesin diye oran düşük ve yalnız görüş içinde. */
      if (seen && Math.random() < dt * 5) {
        const a = Math.random() * 6.283, rr = e.radius * (0.7 + Math.random() * 0.9);
        g.pools.particles.obtain(e.x + Math.cos(a) * rr, e.y + Math.sin(a) * rr * 0.6,
          Math.cos(a) * 12, -26 - Math.random() * 22, 0.6, 2.4, COLORS.boss, 0.94, 0, true);
      }
    } else if (e.type === 'atici' && d2 < e.range * e.range) {
      e.fireCd -= dt;
      const d = Math.sqrt(d2) || 1;
      const A = ENEMY_TYPES.atici;
      /* DURMA MESAFESİ EKRANDAN TÜRETİLİR, SABİT DEĞİLDİR.
         Sabit 195 iki yönde birden yanılıyordu: dar kabukta büyücü ekran
         DIŞINDA duruyor (ateş kapısı kapalı, hiç atmıyor, oyuncu onu ancak
         kalabalık itince görüyor), geniş kabukta ise gereğinden çok
         yaklaşıyordu — "aşırı yaklaşıyor" şikayeti buradan geliyor.
         Doğru ölçü oyuncudan GÖRÜŞ KENARINA, büyücünün geldiği yöndeki
         mesafedir: dikdörtgen kenarına uzaklık = min(yarD/|ux|, yarY/|uy|).
         Bunun %86'sında durur — ekranın kenarında, GÖRÜNÜR ve ateş kapısı
         açık. viewL/R/T/B'de 140 birimlik PAD var, o çıkarılır. */
      const hw = Math.max(60, (g.viewR - g.viewL) * 0.5 - 140);
      const hh = Math.max(60, (g.viewB - g.viewT) * 0.5 - 140);
      const ax = Math.abs(dx) / d, ay = Math.abs(dy) / d;
      const edge = Math.min(ax > 0.001 ? hw / ax : 9999, ay > 0.001 ? hh / ay : 9999);
      const want = Math.max(170, Math.min(A.range - 25, edge * 0.92));
      /* HEDEF MESAFE YUMUŞATILIR — "bir anda geriye ışınlanıyor"un sebebi.
         Kenar mesafesi yöNE bağlıdır (köşeye doğru ~240, kenara dik ~170) ve
         oyuncu hareket ettikçe yön sürekli değişir: ham hedefe uyan büyücü
         her karede farklı bir mesafe isteyip ileri geri sallanıyordu. Hedef
         düşmanın kendi alanında saklanır ve saniyede ~1,6 katıyla yaklaşır. */
      if (!e.standD) e.standD = want;
      else e.standD += (want - e.standD) * Math.min(1, dt * 1.6);
      const stand = e.standD;
      /* ÖLÜ BANT: yaklaşma eşiği ile çekilme eşiği ARASINDA hiç hareket yok.
         Tek eşikle düşman eşiğin iki yanında titrer (bir kare ileri, bir kare
         geri) — ekranda ışınlanma gibi okunur. */
      const back = Math.min(A.backRange || 120, stand * 0.72);
      /* ÜÇ BANT: uzakta yaklaş → durma bandında dur ve at → çok yakında çekil.
         Ortadaki bant kritik: büyücü DURURKEN atar, yani oyuncu "bu bana
         koşan bir iskelet değil" ayrımını hareketten okur (model + asa pozu
         onu sadece doğrular). */
      if (d > stand * 1.06) {
        mvx = (dx / d) * e.speed;
        mvy = (dy / d) * e.speed;
      } else if (d < back) {
        mvx = -(dx / d) * e.speed;
        mvy = -(dy / d) * e.speed;
      }
      if (e.fireCd <= 0 && g.inView(e.x, e.y, 50)) {
        e.fireCd = ENEMY_TYPES.atici.fireCd;
        e.atkAnim = 0.55;                       // asa savurma animasyonu
        const ux = dx / d, uy = dy / d;
        /* ASA UCU FLAŞI — mermi gövdeden değil, kaldırılmış asadan çıkıyor
           gibi okunmalı. Kaynak noktası gövdenin 20 birim önünde ve poz
           kolu kaldırdığı anla çakışıyor. Ortak isabet katmanından (yeni
           mesh/doku yok) kademe 0 flaş + yön kesiği — kademe 1 DEĞİL: atış
           2,5 sn'de bir tekrarlanan sıradan bir olaydır, kritik değil. */
        g.pools.eBullets.obtain(e.x + ux * 20, e.y + uy * 20,
          ux * e.bulletSpeed, uy * e.bulletSpeed,
          e.bulletDmg, 6, 5, 0);          // hue 0 = nekro yeşili
        if (g.renderer3d && g.renderer3d.spawnHit) {
          g.renderer3d.spawnHit(e.x + ux * 20, e.y + uy * 20,
                                Math.atan2(uy, ux), 0, 0.34, 1.0, 0.52);
        }
        g.spawnBurst(e.x + ux * 18, e.y + uy * 18 - 4, COLORS.atici, 5, 95, 2.4, 0.28, true);
      }
    } else {
      const d = Math.sqrt(d2) || 1;
      mvx = (dx / d) * e.speed;
      mvy = (dy / d) * e.speed;
    }
    /* v70 A1: ağır vuruş/kritik gövdeyi adımda da durdurur (geri tepme akar) */
    if (e.stopMv) { if (e.stopT > 0) { mvx *= 0.2; mvy *= 0.2; } else e.stopMv = false; }
    e.mvAmt = Math.abs(mvx) + Math.abs(mvy);

    e.kx *= 0.86; e.ky *= 0.86;
    e.x += (mvx + e.kx) * dt;
    e.y += (mvy + e.ky) * dt;
    /* sonlu arena: düşmanlar da çitlerin içinde kalır */
    const AR = g.arena;
    if (AR) {
      if (e.x < AR.l) e.x = AR.l; else if (e.x > AR.r) e.x = AR.r;
      if (e.y < AR.t) e.y = AR.t; else if (e.y > AR.b) e.y = AR.b;
    }
    /* HARİTA İÇİ ENGELLER. Düşman itilir — yol bulma YOK: sürü engelin
       kenarından kayar ve bu bilerek böyle. Gerçek yol bulma 250 düşman ×
       60 Hz'te bu oyunun bütün kare bütçesini yer; oyuncunun gördüğü fark
       ise "taşın arkasına saklanabiliyorum" cümlesinden ibarettir.
       BOSS itilmez: EZER. 150 birimlik lordun bir mezar taşına çarpıp
       durması silueti anlamsız kılar. */
    if (g.props && g.props.n) {
      if (e.isBoss) g.props.damageArea(e.x, e.y, e.radius + 18, 9999);
      else g.props.resolve(e, e.radius * 0.62);
    }

    const rr = e.radius + p.radius;
    if (d2 < rr * rr) damagePlayer(g, e.dmg, e.x, e.y);

    return false;
  }

  /* ── BOSS FAZLARI (v44) ──
     Tek düze düello yerine üç perde: %60'ta ÖFKE (daha sık, daha yoğun
     salvo), %30'da SON ÇIRPINIŞ (hücum/zıplama sıklığı ×1,65 + iki yardakçı
     çağırır). Her geçişte boss 1,6 sn SENDELER: yerinde durur, saldırmaz,
     aldığı hasar ×1,5 (combat.js) — oyuncuya ritim ve ödül penceresi.
     Döndürdüğü true = bu kare AI çalışmaz. */
  bossPhase(e, dt) {
    if (e.weakT > 0) {
      e.weakT -= dt; e.cdx = 0; e.cdy = 0;
      /* v53 C1: ZAYIF AN görünür — gövdeden altın çatlak kıvılcımı */
      e._wkFx = (e._wkFx || 0) - dt;
      if (e._wkFx <= 0) { e._wkFx = 0.14; this.game.spawnBurst(e.x, e.y - e.radius * 0.4, '#ffd29a', 3, 150, 2.4, 0.4, true); }
      return e.weakT > 0;
    }
    const f = e.hp / e.maxHp;
    const next = f <= 0.30 ? 2 : f <= 0.60 ? 1 : 0;
    if (next <= (e.phase | 0)) return false;
    const g = this.game;
    e.phase = next;
    e.weakT = 1.6;
    e.state = e.bossKind === 'ejder' ? 'perch' : 'chase';
    e.cdx = 0; e.cdy = 0;
    e.spitCd = Math.max(e.spitCd || 0, 2.0);
    g.addShake(0.3);
    g.hitStop(90);
    if (g.punch) g.punch(0.035);
    g.audio.play('bossphase');
    g.spawnBurst(e.x, e.y, next === 2 ? '#ff3b4e' : '#ffb347', 22, 300, 3.6, 0.7, true);
    g.spawnText(e.x, e.y - e.radius - 26, next === 2 ? 'SON ÇIRPINIŞ' : 'ÖFKELENDİ', COLORS.blood, 22, true);
    g.spawnText(e.x, e.y - e.radius - 2, 'ZAYIF AN', '#ffd29a', 15, true);
    if (g.ui.bossMoment) g.ui.bossMoment(next === 2 ? 'phase2' : 'phase1', this.worldBoss);
    if (next === 2) for (let i = 0; i < 2; i++) {
      const a = Math.random() * 6.283;
      this.spawnAtPoint(e.x + Math.cos(a) * 90, e.y + Math.sin(a) * 90);
    }
    return true;
  }

  /* ── Boss durum makinesi ── */
  updateBoss(e, dt, dx, dy, d2) {
    if (e.bossKind === 'ejder') { this.updateDragon(e, dt, dx, dy, d2); return; }
    const g = this.game;
    const d = Math.sqrt(d2) || 1;

    if (e.state === 'chase') {
      e.cdx = (dx / d) * e.speed;
      e.cdy = (dy / d) * e.speed;
      e.chargeCd -= dt;
      e.spitCd -= dt;

      if (e.spitCd <= 0) {
        e.spitCd = BOSS.spitCd;
        /* Süzülen lordun tek klibi olmadığı için atış pozu PROSEDÜRELDIR
           (render3d._driveBoss → bossMotion): topla, savur, toparla. Süre
           BOSS_ATK ile ORTAK sabit — iki yere yazılsa poz yarıda kesilirdi. */
        e.atkAnim = BOSS_ATK;
        const n = BOSS.spitCount + (e.phase >= 1 ? 6 : 0);
        const off = Math.random() * 6.283;
        for (let i = 0; i < n; i++) {
          const a = off + (i / n) * 6.283;
          g.pools.eBullets.obtain(e.x, e.y,
            Math.cos(a) * e.bulletSpeed, Math.sin(a) * e.bulletSpeed,
            e.bulletDmg, 7, 6, 1);        // hue 1 = hasat kızılı (lordun dili)
        }
        g.audio.play('bossvolley');
      }

      if (e.chargeCd <= 0) {
        e.state = 'windup';
        e.stateT = 0.62;
        e.dirx = dx / d; e.diry = dy / d;
        g.spawnText(e.x, e.y - e.radius - 16, '!', COLORS.blood, 30, true);
        g.audio.play('bosswindup');
        /* İMZA ANI (kademe 3: yükselen sütun + geniş zemin mührü) — lordun
           hücumu 6 saniyede bir olur, yani NADIR: imza tanımını karşılar
           (tükürme 3 sn'de bir olduğu için BASILMAZ). Renk lordun kendi dili:
           koyu kızıl hasat. */
        if (g.renderer3d && g.renderer3d.spawnCast) {
          g.renderer3d.spawnCast(e.x, e.y, 0.95, 0.22, 0.26);
        }
      }
    } else if (e.state === 'windup') {
      e.stateT -= dt;
      e.cdx = e.dirx * -16;
      e.cdy = e.diry * -16;
      if (e.stateT <= 0) {
        e.state = 'charge';
        e.stateT = BOSS.chargeTime;
        e.cdx = e.dirx * BOSS.chargeSpeed;
        e.cdy = e.diry * BOSS.chargeSpeed;
        g.addShake(0.16);
        g.audio.play('bosscharge');
      }
    } else {
      e.stateT -= dt;
      if (Math.random() < dt * 40) {
        g.pools.particles.obtain(e.x, e.y + e.radius * 0.5,
          (Math.random() - 0.5) * 40, -20, 0.35, 3, COLORS.boss, 0.92, 0, true);
      }
      if (e.stateT <= 0) {
        e.state = 'chase';
        e.chargeCd = BOSS.chargeCd * (e.phase >= 2 ? 0.6 : 1);
        e.cdx = 0; e.cdy = 0;
        /* v63 İ2 BOSS 2.0 · 3. perde BİRLEŞTİRİR: SON ÇIRPINIŞ'ta hücum bitince varış noktasında
           SEKİZGEN patlama (telegraf sözlüğü: sekizgen = patlama) — hücumdan kaçan oyuncu dönüp
           de hemen dibine giremez. 0,7 sn uyarı, kaçınılabilir. */
        if (e.phase >= 2 && g.spawnHazard) g.spawnHazard(e.x, e.y, 130, e.bulletDmg * 2.2, 0.7, 1.0, 0, 1, 0, 0);
      }
    }
  }

  /* ═══ BATAK EJDERİ — YÜRÜMEYEN BOSS (2026-08-29) ═══
     Modelin yürüme klibi yok, o yüzden ejder AS LA yürümez: yerinde durur,
     döner, üçe ayrılan zehir salvosu atar ve aralarda oyuncunun ÜSTÜNE
     zıplar. Yer değiştirmesinin TEK yolu zıplamadır, yani her konum
     değişikliği önceden bildirilen bir olaydır — "ayakları yerde kayıyor"
     hatası tasarımla ortadan kaldırılır, klip uydurmakla değil.

     DÖRT DURUM: perch (yerinde) → tell (kırmızı alan çıktı, çömeliyor) →
     leap (havada) → perch. `spit` ayrı bir durum DEĞİL: salvo yerinde
     atılır ve dalgayı kesmez (kralın nabzıyla aynı mantık). */
  updateDragon(e, dt, dx, dy, d2) {
    const g = this.game;
    const d = Math.sqrt(d2) || 1;

    if (e.state === 'leap') {
      e.stateT -= dt;
      /* hız tell bitişinde hesaplandı (cdx/cdy) — havada yol alır */
      if (e.stateT <= 0) {
        e.state = 'perch';
        e.cdx = 0; e.cdy = 0;
        e.spitCd = Math.max(e.spitCd, 0.7);      // iniş anında salvo üstüste binmesin
        g.addShake(0.24);
        g.hitStop(70);
        if (g.audio) g.audio.play('bossland');
        g.spawnBurst(e.x, e.y, '#7bd66a', 14, 240, 3.4, 0.6, true);
        /* v63 İ2 · 3. perde: ejder inişte lordun dilini ödünç alır — 10'lu halka salvo (aralıklı, geçilebilir) */
        if (e.phase >= 2) {
          const off = Math.random() * 6.283, n = 10, sp = 210;
          for (let i = 0; i < n; i++) { const a = off + (i / n) * 6.283; g.pools.eBullets.obtain(e.x, e.y, Math.cos(a) * sp, Math.sin(a) * sp, DRAGON.spitDmg * this.dmgMul * 0.55, 7, 6, 1); }
        }
      }
      return;
    }

    e.cdx = 0; e.cdy = 0;                        // yerinde: yürüme YOK

    if (e.state === 'tell') {
      e.stateT -= dt;
      if (e.stateT <= 0) {
        e.state = 'leap';
        e.stateT = DRAGON.leapTime;
        e.cdx = (e.tx - e.x) / DRAGON.leapTime;
        e.cdy = (e.ty - e.y) / DRAGON.leapTime;
      }
      return;
    }

    e.spitCd -= dt;
    e.leapCd -= dt;

    /* ── ÜÇE AYRILAN ZEHİR SALVOSU ──
       Üç alanın yan açıklığı (spitSpread) oyuncuya ARADAN GEÇİLEBİLİR bir
       yol bırakır: kapanan bir duvar "kaçınılamaz" olur ve boss dövüşü
       beceri değil zar atışına döner. */
    if (e.spitCd <= 0 && g.inView(e.x, e.y, 200)) {
      e.spitCd = DRAGON.spitCd * (e.phase >= 1 ? 0.78 : 1);
      e.atkAnim = DRAGON_ATK;      // poz süresiyle ORTAK sabit (bossMotion)
      const ux = dx / d, uy = dy / d;
      const px = -uy, py = ux;                   // yan eksen
      const p = g.player;
      for (let i = -1; i <= 1; i++) {
        const tx = p.x + px * i * DRAGON.spitSpread;
        const ty = p.y + py * i * DRAGON.spitSpread;
        g.spawnHazard(tx, ty, DRAGON.spitR, DRAGON.spitDmg * this.dmgMul,
          DRAGON.spitTell, DRAGON.spitTell + 0.3, 0, 1,
          DRAGON.poisonDur, DRAGON.poisonDmg * this.dmgMul);
      }
      if (g.audio) g.audio.play('poison');
    }

    /* ── ZIPLAMA ── alan ÖNCE çıkar (leapTell), ejder SONRA düşer.
       Alanın patlama anı inişle ÇAKIŞIR (tell + leapTime), yani "altında
       kırmızı alan çıktı, kaçmazsan yersin" cümlesi birebir doğru olur. */
    if (e.leapCd <= 0 && d > 70) {
      e.leapCd = DRAGON.leapCd * (e.phase >= 2 ? 0.6 : 1);
      e.state = 'tell';
      e.stateT = DRAGON.leapTell;
      const p = g.player;
      e.tx = p.x; e.ty = p.y;
      const A = g.arena;
      if (A) {
        e.tx = Math.max(A.l + 60, Math.min(A.r - 60, e.tx));
        e.ty = Math.max(A.t + 60, Math.min(A.b - 60, e.ty));
      }
      g.spawnHazard(e.tx, e.ty, DRAGON.leapR, DRAGON.leapDmg * this.dmgMul,
        DRAGON.leapTell + DRAGON.leapTime, DRAGON.leapTell + DRAGON.leapTime + 0.4, 0, 0);
      g.spawnText(e.x, e.y - e.radius - 18, '!', COLORS.blood, 28, true);
      if (g.audio) g.audio.play('bossleap');
      if (g.renderer3d && g.renderer3d.spawnCast) {
        g.renderer3d.spawnCast(e.x, e.y, 0.52, 0.92, 0.34);
      }
    }
  }

  /** PATLAYICI KOŞUCUNUN FİTİLİ BİTTİ — kendini öldürür.
      ÖDÜL VERMEZ (yakut/xp yok): oyuncunun ÖLDÜRMEDİĞİ bir düşmandan ganimet
      alması, tipin bir tehdit olarak okunmasını bozar. Hasarı tehlike alanı
      verir (tek yer, tek kural). */
  detonate(e) {
    const g = this.game;
    const A = ENEMY_TYPES.patlayici;
    g.spawnHazard(e.x, e.y, A.blastR, A.blastDmg * this.dmgMul,
                           0.001, 0.34, 0, 0);
    if (g.inView(e.x, e.y, 80)) {
      g.spawnBurst(e.x, e.y, COLORS.ember, 12, 230, 3.2, 0.5, true);
      g.spawnBurst(e.x, e.y, '#7d0e1c', 7, 150, 2.6, 0.55, false);
      g.addShake(0.12);
    }
    if (g.renderer3d && g.renderer3d.enemyDeath) g.renderer3d.enemyDeath(e, e.hurtAng || 0, true);
    this.chainBlast(e);
  }

  /** v70 C5 · DÜŞMANI SİLAH OLARAK KULLANMAK. Patlayıcı (öldürülse de fitili
      bitse de) çevresindeki DÜŞMANLARA vurur: sıradan %40, elit %15 can,
      boss muaf. Oyuncuya ek hasar YOK (fitil patlaması zaten tehlike alanıyla
      vurur). Zincir kısa devre yapmaz: ölen patlayıcı bir sonraki güncellemede
      onDeath'e düşer → kare başına bir halka. Tahsis yok (scratch). */
  chainBlast(e) {
    const g = this.game;
    const R = (ENEMY_TYPES.patlayici.blastR || 90) * 1.15;
    const out = this._chainOut || (this._chainOut = []);
    out.length = 0;
    this.queryCircle(e.x, e.y, R + 40, out);
    let n = 0;
    for (let i = 0; i < out.length; i++) {
      const o = out[i];
      if (o === e || o.hp <= 0 || o.isBoss || o.entryT > 0) continue;
      const dx = o.x - e.x, dy = o.y - e.y, reach = R + o.radius;
      if (dx * dx + dy * dy > reach * reach) continue;
      const a = Math.atan2(dy, dx);
      o.hp -= o.maxHp * (o.elite ? 0.15 : 0.4) + 1;
      o.flash = FX.hitFlashTime; o.hurtAng = a; o.hitT = o.hitD = 0.2; o.regenT = 0;
      const k = 280 * (o.knockRes != null ? o.knockRes : 1);
      o.kx += Math.cos(a) * k; o.ky += Math.sin(a) * k;
      n++;
    }
    if (!g.inView(e.x, e.y, 80)) return;
    g.pools.rings.obtain(e.x, e.y, R, 0.34, '#ffb45a');
    g.spawnBurst(e.x, e.y, '#ffd08a', 10, 260, 3.2, 0.42, true);
    if (g.renderer3d && g.renderer3d.spawnHit) g.renderer3d.spawnHit(e.x, e.y, 0, 2, 1.0, 0.62, 0.3);
    if (n > 0) g.audio.play('chainboom');
    if (n >= 3) g.spawnText(e.x, e.y - 46, 'ZİNCİR ×' + n, '#ffb45a', 16, true);
  }

  /* ── Ölüm ── */
  onDeath(e) {
    const g = this.game;
    const p = g.player;
    g.kills++;
    if (g.combo) g.combo();   // v59 KATLİAM sayacı (yalnız görsel + ses)
    if (g.ult) g.ult.onKill(e);   // v61 süper dolumu
    if (e.prey && g.mode) g.mode.onKill(e);   // v63 İ4
    if ((e.thief || e.duelTok) && g.events && g.events.onKill) g.events.onKill(e);   // v71 C3/B4
    if (e.elite) g._eliteK = (g._eliteK | 0) + 1;   // v56 C2: günlük hedef
    if (e.affix) this.affixDeath(e);
    if (e.type === 'patlayici') this.chainBlast(e);   // v70 C5
    if (e.elite && !e.isBoss && g.inView(e.x, e.y, 40)) g.audio.play('elitdown');

    /* ═══ ÖLÜM ARTIK PATLAMA DEĞİL, ÇÖKÜŞ (2026-08-29) ═══
       Kullanıcı teşhisi: "hangi karakter olursa olsun düşmanda bir patlama
       efekti oluyor ölünce, iyi durmuyor." Doğruydu ve sebebi ölçülebilir:
       ölüm mührü ortak isabet katmanının KADEME 2'siydi (spawnHit tier 2) —
       yani ekranda kritik vuruşla ve alan hasarıyla AYNI dili konuşan,
       katkısal (additive) parlayan, geniş bir halka + flaş. Her ölümde
       çakması onu "olay" olmaktan çıkarıp gürültüye çeviriyordu; üstelik
       patlama, ölen ŞEYİN nereye gittiğini hiç anlatmıyordu.

       Yerine geçen üç parça — hiçbiri yeni mesh/doku/çizim çağrısı istemez:
         ① CESET ÇÖKÜŞÜ (render3d.enemyDeath): modelli düşman yere yığılır,
           darbenin geldiği yöne devrilir ve zemine gömülerek kaybolur.
           Zemin düzlemi onu keser — "içine çöktü" hissini veren şey bu.
         ② RUH ZERRELERİ: yukarı süzülen 5 küçük katkısal zerre. Patlama
           dışa savurur, ölüm YUKARI süzülür; fark tam olarak bu.
         ③ KOYU KAN: 4 küçük, katkısal OLMAYAN sıçrama — ağırlık verir.
       Toplam partikül 9 (eskiden 15) ve additive olan yalnız 5'i: kalabalık
       dalgada ekran artık beyazlamıyor. */
    if (g.renderer3d && g.renderer3d.enemyDeath) g.renderer3d.enemyDeath(e, e.hurtAng || 0, false);
    if (g.inView(e.x, e.y, 40)) {
      for (let i = 0; i < 5; i++) {
        const a = Math.random() * 6.283, rr = e.radius * 0.55 * Math.random();
        g.pools.particles.obtain(e.x + Math.cos(a) * rr, e.y + Math.sin(a) * rr * 0.6,
          Math.cos(a) * 10, -34 - Math.random() * 26, 0.42 + Math.random() * 0.2,
          2.2, e.color, 0.93, 0, true);
      }
      g.spawnBurst(e.x, e.y, '#7d0e1c', 4, 96, 2.4, 0.5, false);
      /* v53 C3: ikinci ölüm varyantı — her üç ölümden biri biyom renginde ruh sütunu */
      if ((e.seed * 997 | 0) % 3 === 0) {
        for (let i = 0; i < 3; i++) g.pools.particles.obtain(e.x + (Math.random() - 0.5) * 6, e.y,
          0, -90 - i * 26, 0.5, 2.8 - i * 0.5, this.worldColor || e.color, 0.9, 0, true);
      }
      /* GÖSTERİ, SEYREKLİĞE GÖRE VERİLİR (v25). Kullanıcı "daha gösterişli"
         istedi ama yukarıdaki ÖLÇÜLMÜŞ karar hâlâ geçerli: HER ölümde halka
         + flaş çakınca ekran beyazlıyor ve ölüm bir olay olmaktan çıkıyor.
         İkisi çelişmez — gösteri SIRADAN ölümde değil, ELİT/BOSS ölümünde
         verilir: patlama halkası + savrulan kor + sarsıntı. Sıklık düştüğü
         için aynı efekt artık gürültü değil ÖDÜL okunur. */
      if (e.elite || e.isBoss) {
        g.fxImpact(e.x, e.y, e.hurtAng || 0, 3, e.color);
        /* v56 B1 · ELİT: cevher fıskiyesi — yukarı savrulan gümüş-kor taneler */
        for (let i = 0; i < 8; i++) g.pools.particles.obtain(e.x, e.y, (Math.random() - 0.5) * 140, -180 - Math.random() * 120, 0.7, 2.6, i & 1 ? '#d8a284' : '#cfd6e2', 0.95, 420, true);
      } else if (e.lastCrit) {
        /* v56 B1 · KRİTİK ÖLÜM: gövde parçalanır (vuruş yönünde kıymık) + ruh sütunu */
        const ha = e.hurtAng || 0;
        for (let i = 0; i < 6; i++) { const a = ha + (Math.random() - 0.5) * 1.3, v = 150 + Math.random() * 120;
          g.pools.particles.obtain(e.x, e.y, Math.cos(a) * v, Math.sin(a) * v * 0.6 - 40, 0.36, 2.4, e.color, 0.9, 260, false); }
        for (let i = 0; i < 2; i++) g.pools.particles.obtain(e.x, e.y, 0, -120 - i * 30, 0.5, 2.6 - i * 0.6, '#f0eae4', 0.9, 0, true);
      }
    }
    g.spawnGem(e.x, e.y, e.xp);
    g.rollHeartDrop(e);
    /* DÜŞEN GÜÇ: kalp yuvarlamasından AYRI bir olay. Elit/boss çok daha
       sık düşürür — zor düşman "kaldırdığının ödülünü verdi" hissi. */
    if (g.powerups) g.powerups.roll(e.x, e.y, !!e.elite || !!e.isBoss);

    if (this.killSndT <= 0) {
      g.audio.play('kill');
      this.killSndT = 0.06;
    }

    if (!e.isBoss && p.explodeChance > 0 && Math.random() < p.explodeChance) {
      g.explode(e.x, e.y, 34 + e.maxHp * 0.15, 70, false);
    }

    if (e.isBoss) {
      this.boss = null;
      this.bossSpawned = false;
      this.bossDefeated = true;
      this.bossDeathX = e.x; this.bossDeathY = e.y; this.bossDeathR = e.radius || 60;   // v54 G4
      this.bossCount++;
      g.ui.hideBossBar();
      g.hitStop(FX.bossHitStopMs * 1.8);
      g.addShake(0.45);
      g.explode(e.x, e.y, 120, 150, true);
      g.spawnBurst(e.x, e.y, COLORS.gold, 30, 340, 4, 0.9, true);
      g.spawnBurst(e.x, e.y, COLORS.boss, 22, 280, 4, 0.7, false);
      g.spawnText(e.x, e.y - 40, this.worldBoss + ' DEVRİLDİ', COLORS.gold, 22, true);
      g.spawnText(e.x, e.y - 70, 'GANİMET SANDIĞI DÜŞTÜ!', '#ffe9a8', 15, true);
      for (let i = 0; i < 16; i++) {
        const a = (i / 16) * 6.283;
        g.spawnGem(e.x + Math.cos(a) * 50, e.y + Math.sin(a) * 50, 5);
      }
    }
  }

  /* ── Düşman mermisi ── */
  updateBullet(b, dt) {
    b.life -= dt;
    if (b.life <= 0) return true;

    b.x += b.vx * dt;
    b.y += b.vy * dt;

    const p = this.game.player;
    const dx = p.x - b.x, dy = p.y - b.y;
    const rr = b.r + p.radius;
    if (dx * dx + dy * dy < rr * rr) {
      damagePlayer(this.game, b.dmg, b.x - b.vx, b.y - b.vy);
      /* İSABET FLAŞI — mermi "kayboluyordu": hasar yazısı dışında çarpmanın
         3B izi yoktu. Ortak katmandan kademe 1 (halkalı), merminin KENDİ
         renginde — nekro yeşili ya da hasat kızılı — yani hangi düşmanın
         vurduğu ekrandan okunur. Açı merminin geliş yönünden gelir. */
      const g = this.game;
      if (g.renderer3d && g.renderer3d.spawnHit) {
        const ang = Math.atan2(b.vy, b.vx);
        if (b.hue) g.renderer3d.spawnHit(b.x, b.y, ang, 1, 1.0, 0.42, 0.24);
        else g.renderer3d.spawnHit(b.x, b.y, ang, 1, 0.42, 1.0, 0.56);
      }      return true;
    }
    return false;
  }

  /* ── Sürü ayrışması ── */
  separate() {
    const used = this.grid.used;
    for (let c = 0; c < used.length; c++) {
      const arr = used[c];
      const len = arr.length;
      if (len < 2) continue;
      for (let i = 0; i < len - 1; i++) {
        const a = arr[i];
        const jMax = Math.min(len, i + 7);
        for (let j = i + 1; j < jMax; j++) {
          const b = arr[j];
          const dx = b.x - a.x, dy = b.y - a.y;
          const minD = (a.radius + b.radius) * 0.86;
          const d2 = dx * dx + dy * dy;
          if (d2 >= minD * minD || d2 < 0.0001) continue;
          const d = Math.sqrt(d2);
          const push = (minD - d) * 0.5;
          const nx = dx / d, ny = dy / d;
          const ma = a.radius * a.radius, mb = b.radius * b.radius;
          const wa = mb / (ma + mb), wb = ma / (ma + mb);
          a.x -= nx * push * wa; a.y -= ny * push * wa;
          b.x += nx * push * wb; b.y += ny * push * wb;
        }
      }
    }
  }

  /* ═══════════ SPRITE BAKING (2× süper örnekleme) ═══════════ */

  bakeSprites() {
    const defs = {
      zombi: ENEMY_TYPES.zombi.radius,
      atici: ENEMY_TYPES.atici.radius,
      boss: BOSS.radius,
    };
    const SS = 2;                      // retina keskinliği için 2× pişir
    const hue = this.worldHue || 0;
    for (const type in defs) {
      const r = defs[type];
      const pad = type === 'boss' ? 30 : 14;
      const S = (r + pad) * 2;         // mantıksal boyut
      let c = document.createElement('canvas');
      c.width = S * SS; c.height = S * SS;
      const g = c.getContext('2d');
      g.scale(SS, SS);
      g.translate(S / 2, S / 2);
      this.drawEnemyShape(g, type, r);

      if (hue !== 0) {
        const tc = document.createElement('canvas');
        tc.width = c.width; tc.height = c.height;
        const tg = tc.getContext('2d');
        tg.filter = 'hue-rotate(' + hue + 'deg) saturate(1.12)';
        tg.drawImage(c, 0, 0);
        tg.filter = 'none';
        c = tc;
      }

      const w = document.createElement('canvas');
      w.width = c.width; w.height = c.height;
      const wg = w.getContext('2d');
      wg.drawImage(c, 0, 0);
      wg.globalCompositeOperation = 'source-in';
      wg.fillStyle = '#ffffff';
      wg.fillRect(0, 0, w.width, w.height);

      this.sprites[type] = { n: c, w: w, size: S, half: S / 2 };
    }
  }

  /* ── BESTİYARİ v2 — tamamen yeni tasarımlar ── */
  drawEnemyShape(g, type, r) {
    /* ortak zemin gölgesi */
    g.fillStyle = 'rgba(0,0,0,0.4)';
    g.beginPath();
    g.ellipse(0, r * 0.9, r * 0.85, r * 0.3, 0, 0, 6.283);
    g.fill();

    g.lineWidth = 1.5;
    g.strokeStyle = '#07080d';
    g.lineJoin = 'round';

    if (type === 'zombi') {
      /* ═ İSKELET SAVAŞÇI: yırtık pelerinli, kılıçlı insansı iskelet ═ */
      const bone = '#e4ddc8', armor = '#3d4a3a', armorSh = '#242e20',
            cloak = '#463640', cloakSh = '#291f2b', glow = '#baf29a', blade = '#c7cbd6';

      /* arkada savrulan yırtık pelerin */
      g.fillStyle = cloakSh;
      g.beginPath();
      g.moveTo(-r * 0.28, -r * 0.5);
      g.quadraticCurveTo(-r * 0.95, -r * 0.2, -r * 0.98, r * 0.55);
      g.lineTo(-r * 0.62, r * 0.32);
      g.lineTo(-r * 0.68, r * 0.92);
      g.lineTo(-r * 0.32, r * 0.5);
      g.lineTo(-r * 0.16, r * 0.85);
      g.lineTo(-r * 0.06, r * 0.42);
      g.closePath(); g.fill();
      g.fillStyle = cloak;
      g.beginPath();
      g.moveTo(-r * 0.2, -r * 0.55);
      g.quadraticCurveTo(-r * 0.72, -r * 0.3, -r * 0.7, r * 0.35);
      g.lineTo(-r * 0.42, r * 0.14);
      g.lineTo(-r * 0.4, r * 0.7);
      g.lineTo(-r * 0.14, r * 0.32);
      g.closePath(); g.fill(); g.stroke();

      /* bacaklar */
      g.strokeStyle = bone; g.lineWidth = r * 0.16; g.lineCap = 'round';
      g.beginPath(); g.moveTo(-r * 0.16, r * 0.18); g.lineTo(-r * 0.26, r * 0.82); g.stroke();
      g.beginPath(); g.moveTo(r * 0.16, r * 0.18); g.lineTo(r * 0.22, r * 0.84); g.stroke();
      g.lineCap = 'butt';
      g.strokeStyle = '#07080d';
      g.fillStyle = armorSh;
      g.beginPath(); g.ellipse(-r * 0.28, r * 0.88, r * 0.16, r * 0.09, 0.1, 0, 6.283); g.fill(); g.stroke();
      g.beginPath(); g.ellipse(r * 0.24, r * 0.9, r * 0.16, r * 0.09, -0.1, 0, 6.283); g.fill(); g.stroke();

      /* gövde — yırtık zırh plakası */
      g.fillStyle = armor;
      g.beginPath();
      g.moveTo(-r * 0.34, -r * 0.28);
      g.quadraticCurveTo(0, -r * 0.42, r * 0.34, -r * 0.28);
      g.lineTo(r * 0.3, r * 0.22);
      g.quadraticCurveTo(0, r * 0.34, -r * 0.3, r * 0.22);
      g.closePath(); g.fill(); g.stroke();
      /* zırhtan görünen kaburga yarığı */
      g.fillStyle = '#0a0f0a';
      g.beginPath();
      g.moveTo(-r * 0.13, -r * 0.16); g.lineTo(r * 0.13, -r * 0.16); g.lineTo(r * 0.1, r * 0.1); g.lineTo(-r * 0.1, r * 0.1);
      g.closePath(); g.fill();
      g.strokeStyle = bone; g.lineWidth = 1.4;
      for (let i = 0; i < 3; i++) {
        const yy = -r * 0.1 + i * r * 0.09;
        g.beginPath(); g.moveTo(-r * 0.1, yy); g.lineTo(r * 0.1, yy); g.stroke();
      }
      g.strokeStyle = armorSh; g.lineWidth = 1.6;
      g.beginPath(); g.moveTo(-r * 0.3, -r * 0.05); g.lineTo(r * 0.05, r * 0.2); g.stroke();

      /* sarkan sağ kol + küçük kalkan */
      g.strokeStyle = bone; g.lineWidth = r * 0.13; g.lineCap = 'round';
      g.beginPath(); g.moveTo(r * 0.3, -r * 0.2); g.lineTo(r * 0.5, r * 0.14); g.stroke();
      g.lineCap = 'butt';
      g.strokeStyle = '#07080d';
      g.fillStyle = armorSh;
      g.beginPath(); g.arc(r * 0.52, r * 0.2, r * 0.14, 0, 6.283); g.fill(); g.stroke();

      /* kaldırılmış sol kol + pas kılıç */
      g.strokeStyle = bone; g.lineWidth = r * 0.13; g.lineCap = 'round';
      g.beginPath(); g.moveTo(-r * 0.3, -r * 0.22); g.lineTo(-r * 0.5, -r * 0.62); g.stroke();
      g.lineCap = 'butt';
      g.save();
      g.translate(-r * 0.54, -r * 0.72);
      g.rotate(-0.5);
      g.strokeStyle = '#07080d';
      g.fillStyle = blade;
      g.beginPath();
      g.moveTo(0, r * 0.1); g.lineTo(-r * 0.1, -r * 0.85); g.lineTo(r * 0.06, -r * 0.95); g.lineTo(r * 0.16, r * 0.1);
      g.closePath(); g.fill(); g.stroke();
      g.fillStyle = armorSh;
      g.beginPath(); g.roundRect(-r * 0.16, r * 0.06, r * 0.32, r * 0.14, r * 0.04); g.fill(); g.stroke();
      g.restore();

      /* kafa — kısmen zırhlı kafatası */
      g.strokeStyle = '#07080d';
      g.fillStyle = bone;
      g.beginPath(); g.arc(0, -r * 0.58, r * 0.28, 0, 6.283); g.fill(); g.stroke();
      g.beginPath();
      g.moveTo(-r * 0.14, -r * 0.42); g.lineTo(r * 0.14, -r * 0.42); g.lineTo(r * 0.08, -r * 0.3); g.lineTo(-r * 0.08, -r * 0.3);
      g.closePath(); g.fill(); g.stroke();
      g.fillStyle = armorSh;
      g.beginPath();
      g.arc(0, -r * 0.6, r * 0.3, Math.PI * 1.1, Math.PI * 1.9);
      g.closePath(); g.fill(); g.stroke();
      /* ışıyan boş göz çukurları */
      g.save(); g.shadowColor = glow; g.shadowBlur = r * 0.3;
      g.fillStyle = glow;
      g.beginPath(); g.ellipse(-r * 0.1, -r * 0.58, r * 0.06, r * 0.08, 0, 0, 6.283); g.fill();
      g.beginPath(); g.ellipse(r * 0.1, -r * 0.58, r * 0.06, r * 0.08, 0, 0, 6.283); g.fill();
      g.restore();

    } else if (type === 'kosucu') {
      /* ═ KIRPAN: orak kollu böcek koşucu ═ */
      const chitin = '#c8742e', dark = '#8a4a1c', blade = '#efe6cc', glow = '#ffd98a';

      /* bıçak bacaklar — koşu pozunda dört eklemli bacak */
      g.strokeStyle = dark; g.lineWidth = 2.6; g.lineCap = 'round';
      const legs = [
        [-0.55, 0.15, -0.85, -0.1, -1.0, 0.72],
        [-0.2, 0.28, -0.35, 0.5, -0.42, 0.9],
        [0.22, 0.3, 0.42, 0.5, 0.5, 0.9],
        [0.5, 0.15, 0.8, 0.02, 0.95, 0.68],
      ];
      for (const [ax, ay, bx, by, cx2, cy2] of legs) {
        g.beginPath();
        g.moveTo(ax * r, ay * r);
        g.lineTo(bx * r, by * r);
        g.lineTo(cx2 * r, cy2 * r);
        g.stroke();
      }
      g.lineCap = 'butt';

      /* gövde — öne eğik böcek karnı */
      g.fillStyle = chitin;
      g.beginPath();
      g.moveTo(-r * 0.98, -r * 0.02);
      g.bezierCurveTo(-r * 0.55, -r * 0.72, r * 0.25, -r * 0.78, r * 0.72, -r * 0.3);
      g.quadraticCurveTo(r * 0.9, -r * 0.12, r * 0.8, r * 0.1);
      g.quadraticCurveTo(r * 0.4, r * 0.4, -r * 0.2, r * 0.38);
      g.quadraticCurveTo(-r * 0.75, r * 0.32, -r * 0.98, -r * 0.02);
      g.closePath();
      g.fill(); g.stroke();

      /* karın segment çizgileri */
      g.strokeStyle = dark; g.lineWidth = 1.4;
      for (let i = 0; i < 3; i++) {
        g.beginPath();
        g.arc(-r * 0.15 - i * r * 0.26, -r * 0.05, r * 0.42 - i * 0.06 * r, Math.PI * 0.25, Math.PI * 0.8);
        g.stroke();
      }

      /* sırt diken plakaları */
      g.fillStyle = dark;
      for (let i = 0; i < 3; i++) {
        const sx = -r * 0.55 + i * r * 0.4;
        const sy = -r * (0.6 - i * 0.06);
        g.beginPath();
        g.moveTo(sx - r * 0.1, sy);
        g.lineTo(sx + r * 0.06, sy - r * 0.32);
        g.lineTo(sx + r * 0.2, sy + r * 0.02);
        g.closePath(); g.fill();
      }

      /* baş — öne fırlamış kama + çeneler */
      g.fillStyle = dark;
      g.beginPath();
      g.moveTo(r * 0.55, -r * 0.42);
      g.lineTo(r * 1.18, -r * 0.12);
      g.lineTo(r * 0.72, r * 0.12);
      g.closePath();
      g.fill(); g.stroke();
      /* çene kancaları */
      g.strokeStyle = blade; g.lineWidth = 1.8; g.lineCap = 'round';
      g.beginPath(); g.moveTo(r * 1.12, -r * 0.14); g.quadraticCurveTo(r * 1.34, -r * 0.06, r * 1.28, r * 0.12); g.stroke();
      g.beginPath(); g.moveTo(r * 1.05, 0); g.quadraticCurveTo(r * 1.2, r * 0.1, r * 1.12, r * 0.24); g.stroke();
      g.lineCap = 'butt';
      /* üç ışıyan göz noktası */
      g.fillStyle = glow;
      g.beginPath(); g.arc(r * 0.72, -r * 0.28, r * 0.09, 0, 6.283); g.fill();
      g.beginPath(); g.arc(r * 0.88, -r * 0.18, r * 0.07, 0, 6.283); g.fill();
      g.beginPath(); g.arc(r * 0.78, -r * 0.1, r * 0.055, 0, 6.283); g.fill();

      /* kalkık orak ön kollar */
      g.strokeStyle = chitin; g.lineWidth = 2.8; g.lineCap = 'round';
      g.beginPath(); g.moveTo(r * 0.3, -r * 0.3); g.lineTo(r * 0.48, -r * 0.85); g.stroke();
      g.beginPath(); g.moveTo(r * 0.05, -r * 0.35); g.lineTo(r * 0.12, -r * 0.95); g.stroke();
      g.lineCap = 'butt';
      /* orak bıçakları */
      g.fillStyle = blade;
      g.strokeStyle = '#07080d'; g.lineWidth = 1.1;
      g.beginPath();
      g.moveTo(r * 0.48, -r * 0.85);
      g.quadraticCurveTo(r * 0.95, -r * 1.06, r * 1.12, -r * 0.75);
      g.quadraticCurveTo(r * 0.85, -r * 0.85, r * 0.55, -r * 0.72);
      g.closePath(); g.fill(); g.stroke();
      g.beginPath();
      g.moveTo(r * 0.12, -r * 0.95);
      g.quadraticCurveTo(r * 0.5, -r * 1.22, r * 0.72, -r * 0.98);
      g.quadraticCurveTo(r * 0.45, -r * 1.02, r * 0.2, -r * 0.85);
      g.closePath(); g.fill(); g.stroke();

    } else if (type === 'tank') {
      /* ═ LAHİT GOLEMİ: derzlerinden ışık sızan yürüyen lahit ═ */
      const stone = '#7a6fa0', dark = '#544a75', darker = '#3a3258', glow = '#ffb27a', moss = '#4a7a58';

      /* taş yumruklar + kollar */
      g.strokeStyle = darker; g.lineWidth = 5;
      g.beginPath(); g.moveTo(-r * 0.6, -r * 0.25); g.lineTo(-r * 0.95, r * 0.15); g.stroke();
      g.beginPath(); g.moveTo(r * 0.6, -r * 0.25); g.lineTo(r * 0.95, r * 0.15); g.stroke();
      g.fillStyle = dark;
      g.strokeStyle = '#07080d'; g.lineWidth = 1.8;
      g.beginPath(); g.roundRect(-r * 1.22, r * 0.08, r * 0.52, r * 0.5, r * 0.1); g.fill(); g.stroke();
      g.beginPath(); g.roundRect(r * 0.7, r * 0.08, r * 0.52, r * 0.5, r * 0.1); g.fill(); g.stroke();
      /* eklem çizgileri */
      g.strokeStyle = darker; g.lineWidth = 1.4;
      g.beginPath();
      g.moveTo(-r * 1.05, r * 0.12); g.lineTo(-r * 1.05, r * 0.54);
      g.moveTo(r * 0.87, r * 0.12); g.lineTo(r * 0.87, r * 0.54);
      g.stroke();

      /* lahit gövde — omuz basamaklı anıt */
      g.fillStyle = stone;
      g.strokeStyle = '#07080d'; g.lineWidth = 2;
      g.beginPath();
      g.moveTo(-r * 0.68, r * 0.88);
      g.lineTo(-r * 0.76, -r * 0.32);
      g.lineTo(-r * 0.5, -r * 0.52);
      g.lineTo(-r * 0.5, -r * 0.78);
      g.lineTo(-r * 0.2, -r * 1.0);
      g.lineTo(r * 0.2, -r * 1.0);
      g.lineTo(r * 0.5, -r * 0.78);
      g.lineTo(r * 0.5, -r * 0.52);
      g.lineTo(r * 0.76, -r * 0.32);
      g.lineTo(r * 0.68, r * 0.88);
      g.closePath();
      g.fill(); g.stroke();

      /* oyma yüz maskesi (üst) */
      g.fillStyle = dark;
      g.beginPath(); g.roundRect(-r * 0.34, -r * 0.94, r * 0.68, r * 0.5, r * 0.1); g.fill();
      g.strokeStyle = darker; g.lineWidth = 1.6;
      g.beginPath(); g.roundRect(-r * 0.34, -r * 0.94, r * 0.68, r * 0.5, r * 0.1); g.stroke();
      /* sert kaş + ışıyan göz yarıkları */
      g.strokeStyle = darker; g.lineWidth = 2;
      g.beginPath(); g.moveTo(-r * 0.26, -r * 0.82); g.lineTo(-r * 0.05, -r * 0.76); g.stroke();
      g.beginPath(); g.moveTo(r * 0.26, -r * 0.82); g.lineTo(r * 0.05, -r * 0.76); g.stroke();
      g.fillStyle = glow;
      g.fillRect(-r * 0.24, -r * 0.73, r * 0.16, r * 0.06);
      g.fillRect(r * 0.08, -r * 0.73, r * 0.16, r * 0.06);
      /* ağız derzi */
      g.strokeStyle = darker; g.lineWidth = 1.4;
      g.beginPath(); g.moveTo(-r * 0.14, -r * 0.55); g.lineTo(r * 0.14, -r * 0.55); g.stroke();

      /* İÇİ IŞIYAN DERZ — kapak aralığı */
      g.save();
      g.shadowColor = glow; g.shadowBlur = 6;
      g.strokeStyle = glow; g.lineWidth = 2.4;
      g.beginPath();
      g.moveTo(0, -r * 0.4); g.lineTo(0, r * 0.68);
      g.moveTo(-r * 0.5, r * 0.12); g.lineTo(r * 0.5, r * 0.12);
      g.stroke();
      g.restore();
      /* derz perçin ışıkları */
      g.fillStyle = glow;
      g.beginPath(); g.arc(0, r * 0.12, r * 0.08, 0, 6.283); g.fill();

      /* çatlaklar + yosun */
      g.strokeStyle = darker; g.lineWidth = 1.6;
      g.beginPath();
      g.moveTo(-r * 0.55, -r * 0.2); g.lineTo(-r * 0.35, r * 0.05) ; g.lineTo(-r * 0.5, r * 0.35);
      g.moveTo(r * 0.4, r * 0.3); g.lineTo(r * 0.28, r * 0.55);
      g.stroke();
      g.fillStyle = moss;
      g.beginPath(); g.arc(-r * 0.45, r * 0.62, r * 0.16, 0, 6.283); g.fill();
      g.beginPath(); g.arc(r * 0.58, -r * 0.38, r * 0.11, 0, 6.283); g.fill();

      /* sürünen kaide */
      g.fillStyle = darker;
      g.beginPath(); g.roundRect(-r * 0.74, r * 0.72, r * 1.48, r * 0.22, r * 0.06); g.fill();

    } else if (type === 'atici') {
      /* ═ NEKRO EFENDİSİ: kukuletalı, asalı ölüm büyücüsü ═ */
      const robe = '#1c2e28', robeSh = '#101c18', trim = '#5fd190', bone = '#d8d4c4', glow = '#8ff5c8';

      /* cüppe eteği — savrulan yırtık uçlar */
      g.fillStyle = robeSh;
      g.beginPath();
      g.moveTo(-r * 0.42, r * 0.05);
      g.quadraticCurveTo(-r * 0.6, r * 0.5, -r * 0.5, r * 0.95);
      g.lineTo(-r * 0.2, r * 0.55);
      g.lineTo(0, r * 0.98);
      g.lineTo(r * 0.22, r * 0.5);
      g.lineTo(r * 0.5, r * 0.9);
      g.quadraticCurveTo(r * 0.6, r * 0.5, r * 0.42, r * 0.05);
      g.closePath(); g.fill(); g.stroke();

      /* ana cüppe gövdesi */
      g.fillStyle = robe;
      g.beginPath();
      g.moveTo(0, -r * 0.5);
      g.quadraticCurveTo(r * 0.5, -r * 0.3, r * 0.42, r * 0.15);
      g.lineTo(-r * 0.42, r * 0.15);
      g.quadraticCurveTo(-r * 0.5, -r * 0.3, 0, -r * 0.5);
      g.closePath(); g.fill(); g.stroke();

      /* rün nakışlı kuşak parıltısı */
      g.strokeStyle = trim; g.lineWidth = 1.4; g.globalAlpha = 0.85;
      g.beginPath(); g.moveTo(-r * 0.38, -r * 0.02); g.quadraticCurveTo(0, r * 0.08, r * 0.38, -r * 0.02); g.stroke();
      g.globalAlpha = 1;

      /* sarkık kolluk + iskelet el (asa tutan) */
      g.strokeStyle = robe; g.lineWidth = r * 0.14; g.lineCap = 'round';
      g.beginPath(); g.moveTo(r * 0.32, -r * 0.24); g.lineTo(r * 0.5, r * 0.02); g.stroke();
      g.lineCap = 'butt';
      g.fillStyle = bone;
      g.beginPath(); g.arc(r * 0.52, r * 0.06, r * 0.09, 0, 6.283); g.fill(); g.stroke();

      /* asa — üstünde ışıyan kürecik */
      g.strokeStyle = '#3a2f28'; g.lineWidth = r * 0.07; g.lineCap = 'round';
      g.beginPath(); g.moveTo(r * 0.52, r * 0.1); g.lineTo(r * 0.62, -r * 0.68); g.stroke();
      g.lineCap = 'butt';
      g.save();
      g.shadowColor = glow; g.shadowBlur = r * 0.4;
      g.fillStyle = glow;
      g.beginPath(); g.arc(r * 0.63, -r * 0.76, r * 0.14, 0, 6.283); g.fill();
      g.restore();
      g.strokeStyle = trim; g.lineWidth = 1;
      g.beginPath(); g.arc(r * 0.63, -r * 0.76, r * 0.2, 0, 6.283); g.stroke();

      /* diğer kol — cüppe içinde gizli */
      g.strokeStyle = robeSh; g.lineWidth = r * 0.13; g.lineCap = 'round';
      g.beginPath(); g.moveTo(-r * 0.32, -r * 0.22); g.lineTo(-r * 0.4, r * 0.06); g.stroke();
      g.lineCap = 'butt';

      /* kukuleta — derin gölgeli yüz boşluğu */
      g.strokeStyle = '#07080d';
      g.fillStyle = robe;
      g.beginPath();
      g.moveTo(-r * 0.34, -r * 0.42);
      g.quadraticCurveTo(-r * 0.3, -r * 0.86, 0, -r * 0.92);
      g.quadraticCurveTo(r * 0.3, -r * 0.86, r * 0.34, -r * 0.42);
      g.quadraticCurveTo(r * 0.24, -r * 0.5, 0, -r * 0.48);
      g.quadraticCurveTo(-r * 0.24, -r * 0.5, -r * 0.34, -r * 0.42);
      g.closePath(); g.fill(); g.stroke();
      g.fillStyle = '#060a08';
      g.beginPath(); g.ellipse(0, -r * 0.58, r * 0.2, r * 0.24, 0, 0, 6.283); g.fill();
      /* ışıyan gözler */
      g.save(); g.shadowColor = glow; g.shadowBlur = r * 0.3;
      g.fillStyle = glow;
      g.beginPath(); g.ellipse(-r * 0.08, -r * 0.58, r * 0.045, r * 0.07, 0, 0, 6.283); g.fill();
      g.beginPath(); g.ellipse(r * 0.08, -r * 0.58, r * 0.045, r * 0.07, 0, 0, 6.283); g.fill();
      g.restore();

    } else {
      /* ═ BOSS: KADİM HASATÇI v2 — boynuz taçlı azrail ═ */
      const cape = '#2a1420', capeIn = '#180a12', bone = '#d8d4c4', blood = '#ff3b4e', ember = '#ff5a3c', gold = '#f5c044';

      /* tırpan — sap */
      g.strokeStyle = '#3a2f28'; g.lineWidth = 5.5; g.lineCap = 'round';
      g.beginPath();
      g.moveTo(-r * 0.95, r * 0.95);
      g.lineTo(r * 0.72, -r * 1.2);
      g.stroke();
      g.lineCap = 'butt';
      /* sap sargısı */
      g.strokeStyle = '#5c4432'; g.lineWidth = 1.6;
      for (let i = 0; i < 4; i++) {
        const k = 0.25 + i * 0.1;
        const sx = -r * 0.95 + (r * 0.72 + r * 0.95) * k;
        const sy = r * 0.95 - (r * 1.2 + r * 0.95) * k;
        g.beginPath(); g.moveTo(sx - 3, sy - 3); g.lineTo(sx + 3, sy + 3); g.stroke();
      }
      /* tırpan ağzı — büyük kavis + rün ışığı */
      g.fillStyle = '#c8ccd8';
      g.strokeStyle = '#07080d'; g.lineWidth = 2;
      g.beginPath();
      g.moveTo(r * 0.72, -r * 1.2);
      g.quadraticCurveTo(r * 1.62, -r * 1.05, r * 1.45, -r * 0.28);
      g.quadraticCurveTo(r * 1.22, -r * 0.85, r * 0.6, -r * 1.02);
      g.closePath();
      g.fill(); g.stroke();
      g.save();
      g.shadowColor = blood; g.shadowBlur = 6;
      g.strokeStyle = blood; g.lineWidth = 1.8;
      g.beginPath();
      g.moveTo(r * 0.74, -r * 1.16);
      g.quadraticCurveTo(r * 1.54, -r * 1.0, r * 1.42, -r * 0.34);
      g.stroke();
      g.restore();
      /* rün çentikleri */
      g.strokeStyle = blood; g.lineWidth = 1.4;
      for (let i = 0; i < 3; i++) {
        const kx = r * (0.9 + i * 0.18), ky = -r * (1.02 - i * 0.14);
        g.beginPath(); g.moveTo(kx, ky); g.lineTo(kx + r * 0.08, ky + r * 0.1); g.stroke();
      }

      /* pelerin — dikenli omuzlu dış katman */
      g.fillStyle = cape;
      g.strokeStyle = '#07080d'; g.lineWidth = 2.5;
      g.beginPath();
      g.moveTo(0, -r * 1.02);
      g.lineTo(r * 0.55, -r * 0.88);           /* sağ omuz dikeni tabanı */
      g.lineTo(r * 0.78, -r * 1.08);
      g.lineTo(r * 0.72, -r * 0.72);
      g.bezierCurveTo(r * 1.0, -r * 0.4, r * 1.0, r * 0.2, r * 0.82, r * 0.92);
      g.lineTo(r * 0.5, r * 0.62);
      g.lineTo(r * 0.26, r * 0.98);
      g.lineTo(0, r * 0.6);
      g.lineTo(-r * 0.26, r * 0.98);
      g.lineTo(-r * 0.5, r * 0.62);
      g.lineTo(-r * 0.82, r * 0.92);
      g.bezierCurveTo(-r * 1.0, r * 0.2, -r * 1.0, -r * 0.4, -r * 0.72, -r * 0.72);
      g.lineTo(-r * 0.78, -r * 1.08);
      g.lineTo(-r * 0.55, -r * 0.88);
      g.closePath();
      g.fill(); g.stroke();
      /* iç pelerin gölgesi */
      g.fillStyle = capeIn;
      g.beginPath();
      g.moveTo(-r * 0.4, r * 0.1);
      g.quadraticCurveTo(0, r * 0.02, r * 0.4, r * 0.1);
      g.lineTo(r * 0.3, r * 0.72);
      g.quadraticCurveTo(0, r * 0.9, -r * 0.3, r * 0.72);
      g.closePath(); g.fill();

      /* göğüs: kor ağız — kaburga dişli yarık */
      g.save();
      g.shadowColor = ember; g.shadowBlur = 9;
      g.fillStyle = ember;
      g.beginPath();
      g.ellipse(0, r * 0.16, r * 0.3, r * 0.4, 0, 0, 6.283);
      g.fill();
      g.restore();
      g.fillStyle = '#ffd08a';
      g.beginPath(); g.ellipse(0, r * 0.16, r * 0.13, r * 0.24, 0, 0, 6.283); g.fill();
      /* kaburga dişleri üstten */
      g.strokeStyle = bone; g.lineWidth = 2.2;
      for (let i = -2; i <= 2; i++) {
        g.beginPath();
        g.moveTo(i * r * 0.13, -r * 0.12);
        g.lineTo(i * r * 0.15, r * 0.14 + Math.abs(i) * r * 0.04);
        g.stroke();
      }

      /* pelerinde kızıl kenar ışığı */
      g.strokeStyle = 'rgba(255,59,78,0.5)'; g.lineWidth = 2;
      g.beginPath();
      g.moveTo(r * 0.2, -r * 0.98);
      g.bezierCurveTo(r * 0.95, -r * 0.5, r * 0.95, r * 0.1, r * 0.8, r * 0.85);
      g.stroke();

      /* bel zinciri + sarkan fener */
      g.strokeStyle = gold; g.lineWidth = 1.5;
      g.beginPath();
      g.moveTo(-r * 0.55, r * 0.3);
      g.quadraticCurveTo(-r * 0.62, r * 0.55, -r * 0.58, r * 0.72);
      g.stroke();
      g.fillStyle = '#241c10';
      g.strokeStyle = gold; g.lineWidth = 1.3;
      g.beginPath(); g.roundRect(-r * 0.68, r * 0.72, r * 0.2, r * 0.24, r * 0.04); g.fill(); g.stroke();
      g.fillStyle = '#ffe9a8';
      g.fillRect(-r * 0.63, r * 0.78, r * 0.1, r * 0.12);

      /* kafatası kapüşonu */
      g.fillStyle = cape;
      g.strokeStyle = '#07080d'; g.lineWidth = 2;
      g.beginPath();
      g.arc(0, -r * 0.62, r * 0.42, Math.PI * 0.9, Math.PI * 2.1);
      g.quadraticCurveTo(r * 0.2, -r * 0.3, 0, -r * 0.28);
      g.quadraticCurveTo(-r * 0.2, -r * 0.3, -r * 0.4, -r * 0.5);
      g.closePath();
      g.fill(); g.stroke();
      /* BOYNUZ TAÇ — iki büyük kıvrık boynuz */
      g.fillStyle = bone;
      g.strokeStyle = '#07080d'; g.lineWidth = 1.6;
      g.beginPath();
      g.moveTo(-r * 0.3, -r * 0.88);
      g.quadraticCurveTo(-r * 0.72, -r * 1.1, -r * 0.62, -r * 1.5);
      g.quadraticCurveTo(-r * 0.5, -r * 1.18, -r * 0.16, -r * 0.99);
      g.closePath(); g.fill(); g.stroke();
      g.beginPath();
      g.moveTo(r * 0.3, -r * 0.88);
      g.quadraticCurveTo(r * 0.72, -r * 1.1, r * 0.62, -r * 1.5);
      g.quadraticCurveTo(r * 0.5, -r * 1.18, r * 0.16, -r * 0.99);
      g.closePath(); g.fill(); g.stroke();
      /* boynuz boğumları */
      g.strokeStyle = 'rgba(0,0,0,0.3)'; g.lineWidth = 1.2;
      g.beginPath();
      g.moveTo(-r * 0.44, -r * 1.06); g.lineTo(-r * 0.34, -r * 0.98);
      g.moveTo(r * 0.44, -r * 1.06); g.lineTo(r * 0.34, -r * 0.98);
      g.stroke();
      /* alın kemik plakası + yüz boşluğu */
      g.fillStyle = bone;
      g.beginPath();
      g.moveTo(-r * 0.22, -r * 0.88);
      g.quadraticCurveTo(0, -r * 0.98, r * 0.22, -r * 0.88);
      g.lineTo(r * 0.18, -r * 0.72);
      g.quadraticCurveTo(0, -r * 0.8, -r * 0.18, -r * 0.72);
      g.closePath(); g.fill();
      g.fillStyle = '#020204';
      g.beginPath();
      g.ellipse(0, -r * 0.55, r * 0.3, r * 0.26, 0, 0, 6.283);
      g.fill();
      /* çift kor göz + göz alt izleri */
      g.save();
      g.shadowColor = blood; g.shadowBlur = 7;
      g.fillStyle = blood;
      g.beginPath();
      g.moveTo(-r * 0.2, -r * 0.62); g.lineTo(-r * 0.05, -r * 0.66); g.lineTo(-r * 0.05, -r * 0.55) ; g.lineTo(-r * 0.19, -r * 0.52);
      g.closePath(); g.fill();
      g.beginPath();
      g.moveTo(r * 0.2, -r * 0.62); g.lineTo(r * 0.05, -r * 0.66); g.lineTo(r * 0.05, -r * 0.55); g.lineTo(r * 0.19, -r * 0.52);
      g.closePath(); g.fill();
      g.restore();
      g.strokeStyle = blood; g.lineWidth = 1.2;
      g.beginPath();
      g.moveTo(-r * 0.12, -r * 0.5); g.lineTo(-r * 0.12, -r * 0.4);
      g.moveTo(r * 0.12, -r * 0.5); g.lineTo(r * 0.12, -r * 0.4);
      g.stroke();
    }
  }

  /* ═══════════ RENDER ═══════════ */

  render(ctx) {
    const g = this.game;
    const act = this.pool.active;
    const t = g.time;

    for (let i = 0; i < act.length; i++) {
      const e = act[i];
      if (!g.inView(e.x, e.y, e.radius + 48)) continue;

      const spr = this.sprites[e.type];
      const img = spr.n;
      const bob = Math.sin(e.bob * 4 + e.seed) * (e.isBoss ? 3 : 1.6);
      /* düşman ana karaktere baksın: varsayılan silüet sola bakar,
         oyuncu sağdaysa aynala (arkası dönük yürüme sorununu giderir) */
      const faceRight = (g.player.x - e.x) > 0;

      if (e.elite) {
        ctx.globalAlpha = 0.5 + Math.sin(t * 6 + e.seed) * 0.2;
        ctx.strokeStyle = this.worldColor;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(e.x, e.y + bob, e.radius + 6, 0, 6.283);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }

      if (e.isBoss) {
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = 0.14 + Math.sin(t * 5) * 0.05;
        ctx.fillStyle = COLORS.blood;
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.radius * 1.5, 0, 6.283);
        ctx.fill();
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 1;

        if (e.state === 'windup') {
          ctx.globalAlpha = 0.25 + (((t * 14) | 0) % 2) * 0.3;
          ctx.strokeStyle = COLORS.blood;
          ctx.lineWidth = 26;
          ctx.beginPath();
          ctx.moveTo(e.x, e.y);
          ctx.lineTo(e.x + e.dirx * 320, e.y + e.diry * 320);
          ctx.stroke();
          ctx.globalAlpha = 1;
          ctx.lineWidth = 1;
        }
      }

      /* 2× pişmiş sprite → mantıksal boyutta çiz (retina keskin) */
      const S = e.elite ? spr.size * 1.28 : spr.size;
      if (faceRight) {
        ctx.save();
        ctx.translate(e.x, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(img, -S / 2, e.y - S / 2 + bob, S, S);
        ctx.restore();
      } else {
        ctx.drawImage(img, e.x - S / 2, e.y - S / 2 + bob, S, S);
      }

      if (!e.isBoss && e.hp < e.maxHp) {
        const bw = e.radius * 1.8;
        const by = e.y - e.radius - 9 + bob;
        ctx.fillStyle = 'rgba(7,8,13,0.8)';
        ctx.fillRect(e.x - bw / 2, by, bw, 3);
        ctx.fillStyle = COLORS.blood;
        ctx.fillRect(e.x - bw / 2, by, bw * Math.max(0, e.hp / e.maxHp), 3);
      }
    }
  }

  renderBullets(ctx) {
    const g = this.game;
    const t = g.time;
    g.pools.eBullets.each(function (b) {
      if (!g.inView(b.x, b.y, 20)) return;
      if (b.r <= 6) {
        /* nekro alevi — yeşil ruh ateşi */
        ctx.fillStyle = 'rgba(95, 209, 144, 0.28)';
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r * 2.3, 0, 6.283);
        ctx.fill();
        ctx.fillStyle = '#57c98a';
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r * (1 + Math.sin(t * 18) * 0.12), 0, 6.283);
        ctx.fill();
        ctx.fillStyle = '#d8ffe8';
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r * 0.45, 0, 6.283);
        ctx.fill();
      } else {
        ctx.fillStyle = 'rgba(79, 163, 184, 0.3)';
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r * 2, 0, 6.283);
        ctx.fill();
        ctx.fillStyle = '#bfeff8';
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r, 0, 6.283);
        ctx.fill();
      }
    });
  }
}
