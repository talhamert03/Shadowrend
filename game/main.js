/* ═══════════════════════════════════════════════════════════
   main.js — Oyun Çekirdeği

   • requestAnimationFrame + sabit zaman adımı (60 Hz akümülatör)
   • KAMPANYA: 5 dünya × 10 görev — worlds.js planı yürütülür
   • Hit-Stop yalnız kritik/boss'ta (normal vuruş asla donmaz)
   • Screen Shake: travma tabanlı (trauma², doğal sönümlü)
   • Frustum Culling + dinamik çözünürlük + sıfır GC havuzları
   • ALTIN cüzdanı: kendi anahtarında, HER ZAMAN toplamalı
     yazılır (okuma-ekleme-yazma) — asla sıfırlanmaz.
   ═══════════════════════════════════════════════════════════ */

import { COLORS, FX, BOSS, GEM_TIERS, WEAPONS, HAZARD_CAP,         EQUIPMENT, EQUIP_SLOTS, WEAPON_META, WEAPON_SLOTS,
         CHARACTERS, DEFAULT_CHAR, STONE_PACKS, RUBY_EXCHANGE, UNLOCK_ALL_CHARS, signaturePower,
         CHAR_CARD_REQ, CHAR_GOLD_COST, CHAR_MAX_LEVEL, charLevelMods, SURVIVAL_MILESTONES,
         CHAR_RARITIES, BATTLE_PASS, BATTLE_PASS_TIERS, GEAR_MAX_LEVEL, GEAR_CARD_REQ, GEAR_GOLD_COST,
         gearLevelMods, charCardDrop, accountXpToNext, accountLevelChest, waveTime, DYN } from './config.js?v=20260930m';
import { WORLDS, MISSIONS_PER_WORLD, missionDef, missionReward, replayReward,
         loadProgress, saveProgress, worldUnlocked, missionUnlocked, nextMission } from './worlds.js?v=20260930m';
import { ChestSystem, rollMissionChest, CHESTS, FREE_CHEST_CD } from './chests.js?v=20260930m';
import { Dailies, normalizeQuests, WEEKLY_QUESTS, WEEKLY_TIERS, dayKey } from './dailies.js?v=20260930m';
import { Pool } from './pool.js?v=20260930m';
import { Input } from './input.js?v=20260930m';
import { Player } from './player.js?v=20260930m';
import { EnemyManager } from './enemyManager.js?v=20260930m';
import { WeaponManager } from './weapons.js?v=20260930m';
import { UI } from './ui.js?v=20260930m';
import { AudioFX } from './audio.js?v=20260930m';
import { applyHit, damagePlayer, FEEL } from './combat.js?v=20260930m';
import { Daily, Gift, Ghost, rollBlessings } from './journey.js?v=20260930m';
import { Renderer3D } from './render3d.js?v=20260930m';
import { bakeArenaMap, worldMapId } from './arenaMaps.js?v=20260930m';
import { preloadAiDetail, aiDetailReady, warmAiDetailBytes } from './aiDetail.js?v=20260930m';
import { preloadIsles } from './isleArt.js?v=20260930m';
import { PropField } from './arenaProps.js?v=20260930m';
import { ObjectiveManager } from './objectives.js?v=20260930m';
import { PowerupManager, PU } from './powerups.js?v=20260930m';
import { FieldChests } from './fieldChest.js?v=20260930m';
import { Ultimate } from './ultimate.js?v=20260930m';
import { Ach } from './achievements.js?v=20260930m';
import { WorldEvents } from './worldEvents.js?v=20260930m';
import { MissionMode } from './missionTypes.js?v=20260930m';
import { Ledger } from './ledger.js?v=20260930m';
import { PerfLog } from './perfLog.js?v=20260930m';
import { ErrLog } from './errlog.js?v=20260930m';
import { Ftue } from './ftue.js?v=20260930m';
import { Nightmare, nmBook, NM } from './nightmare.js?v=20260930m';
import { applySets } from './gearSets.js?v=20260930m';
import { Calendar } from './calendar.js?v=20260930m';
import { Tower, towerBook, floorDef } from './tower.js?v=20260930m';
import { Quality, Perf, Warmup, Haptics, nativeShell } from './perf.js?v=20260930m';
import { Settings } from './settings.js?v=20260930m';
import { Music } from './music.js?v=20260930m';
import { bootVault, flushVault } from './vault.js?v=20260930m';
import { Clock } from './clock.js?v=20260930m';
import { bootI18n, T } from './i18n.js?v=20260930m';
const SPLASH_LINES = ['KORLAR YAKILIYOR…', 'KILIÇLAR BİLENİYOR…', 'ADALAR UYANIYOR…', 'RÜZGÂR DÖNÜYOR…', 'KIZIL AY YÜKSELİYOR…'];
import { Backend } from './backend.js?v=20260930m';
import { APP, checkUpdate, Notify, isNative, lockPortrait } from './release.js?v=20260930m';

const STEP = 1 / 60;
const MAX_STEPS = 5;
const CULL_MARGIN = 72;
const RUBY_KEY = 'kh_rubies';
const STONE_KEY = 'kh_bloodstone';

/* v54 G4: dünya başına boss sonu — renkler dünya paletinden, yön dağılma dili */
const BOSS_DEATH = [
  { word: 'RUHU DAĞILDI', cols: ['#cfe3ff', '#8aa4c8', '#ffffff'], n: 60, sp: 180, life: 1.6, size: 3.4, dir: 'up' },
  { word: 'KORA DÖNDÜ', cols: ['#ffb45a', '#ff6a2a', '#fff0c4'], n: 70, sp: 420, life: 1.1, size: 3.8, dir: 'out' },
  { word: 'BATAĞA GÖMÜLDÜ', cols: ['#9fd46a', '#4a7a3a', '#d8f0a0'], n: 56, sp: 140, life: 1.7, size: 4.2, dir: 'up' },
  { word: 'IŞIKTA ERİDİ', cols: ['#f0cf78', '#fff3c0', '#d9a642'], n: 64, sp: 260, life: 1.4, size: 3.2, dir: 'up' },
  { word: 'HİÇLİĞE ÇEKİLDİ', cols: ['#b48aff', '#5a3aa0', '#e8dcff'], n: 64, sp: 300, life: 0.9, size: 3.2, dir: 'in' },
  { word: 'KRİSTALE BÖLÜNDÜ', cols: ['#9fe8ff', '#5ab8e0', '#ffffff'], n: 58, sp: 460, life: 1.0, size: 4.4, dir: 'out' },
  { word: 'TUZA DÖNÜŞTÜ', cols: ['#f4ece6', '#d8c8b0', '#ffffff'], n: 70, sp: 220, life: 1.5, size: 3.0, dir: 'out' },
  { word: 'BUZA KESİLDİ', cols: ['#c8f0ff', '#7cc8f0', '#ffffff'], n: 60, sp: 380, life: 1.2, size: 4.0, dir: 'out' },
  { word: 'KEMİKLERİ SAÇILDI', cols: ['#e8e4d8', '#a89c84', '#fff8e8'], n: 50, sp: 400, life: 1.2, size: 4.6, dir: 'out' },
  { word: 'ÇARKLARI DURDU', cols: ['#e8b860', '#9a6a28', '#fff0c4'], n: 60, sp: 340, life: 1.0, size: 3.6, dir: 'in' },
];

class Game {
  constructor() {
    /* Kalıcı gelişim cüzdanı + kampanya ilerlemesi */
    this.meta = this.loadMeta();
    this.progress = loadProgress();
    this.chests = new ChestSystem(this);
    /* v55 · QA: eski kayıtta xp ≥ xpNext kalmıştı (menüde "60/36") → açılışta birikmiş seviyeler ödülüyle işlenir. */
    this._pendingGift = Gift.collect(this);   // v56 C5: ilk saveMeta'dan ÖNCE (awayT orada tazelenir)
    if (this.meta.account.xp >= this.meta.account.xpNext) this.addAccountXp(0);
    /* Günlük giriş + haftalık görevler. Takvim dönüşü kurucuda bir kez
       uygulanır; menüye her girişte `dailies.touch()` yeniden çağrılır
       (uygulama açık kalırken gece yarısı geçilebilir). */
    this.dailies = new Dailies(this);

    /* ── Canvas kurulumu ── */
    this.canvas = document.getElementById('game');
    this.ctx = this.canvas.getContext('2d', { alpha: true });
    this.renderScale = 1;
    const isTouch = (navigator.maxTouchPoints || 0) > 0 ||
                    matchMedia('(pointer: coarse)').matches;
    this.isMobile = isTouch;

    /* ── Kalite kademesi: "en eski/zayıf cihazlarda bile akıcı olsun" ──
       Donanım belleği + çekirdek sayısı + dokunmatik olup olmadığına göre
       kaba bir tahmin. Belirsizse GÜVENLİ (düşük) tarafta hata yapılır —
       zayıf bir cihazda 60fps'i kaçırmak, güçlü bir cihazda gereksiz yere
       netlik kaybetmekten daha kötü bir kullanıcı deneyimi. */
    const mem = navigator.deviceMemory || (isTouch ? 4 : 8);
    const cores = navigator.hardwareConcurrency || (isTouch ? 4 : 8);
    if (isTouch && (mem <= 3 || cores <= 4)) this.qualityTier = 'low';
    else if (isTouch && (mem <= 6 || cores <= 6)) this.qualityTier = 'mid';
    else if (!isTouch) this.qualityTier = 'high';
    else this.qualityTier = 'mid';
    /* v60 GPU SINIFI: bellek/çekirdek bazı cihazlarda yalan söyler (8 çekirdek + Mali-T720).
       Bilinen zayıf GPU ailesi kademeyi indirir; hiçbir durumda YÜKSELTMEZ (güvenli taraf). */
    try {
      const gl = document.createElement('canvas').getContext('webgl');
      const ext = gl && gl.getExtension('WEBGL_debug_renderer_info');
      const gpu = String(ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : (gl ? gl.getParameter(gl.RENDERER) : '')).toLowerCase();
      this.gpuName = gpu;
      const weak = /mali-(4\d\d|t[678]\d\d|g31|g51|g52)|adreno.{0,4}(3\d\d|4\d\d|50\d|51\d)|powervr (sgx|rogue ge8)|swiftshader|llvmpipe|videocore/.test(gpu);
      const midGpu = /mali-g(57|68|71|72|76)|adreno.{0,4}(52\d|53\d|54\d|6[01]\d)|powervr.*(9xm|gm9)/.test(gpu);
      if (isTouch && weak) this.qualityTier = 'low';
      else if (isTouch && midGpu && this.qualityTier === 'high') this.qualityTier = 'mid';
      const lose = gl && gl.getExtension('WEBGL_lose_context'); if (lose) lose.loseContext();
    } catch (e) { /* sessiz */ }
    /* v60 ÖĞRENİLEN KADEME: bir koşunun %40'ından fazlası tabanda (stres ≥ 0,66) geçtiyse
       otomatik kademe kalıcı olarak bir basamak iner (bkz. _learnTier). Oyuncunun elle seçimi etkilenmez. */
    try {
      const L = localStorage.getItem('kh_learntier_v1');
      const T = ['low', 'mid', 'high'];
      if (L && T.indexOf(L) >= 0 && T.indexOf(L) < T.indexOf(this.qualityTier)) this.qualityTier = L;
    } catch (e) { /* sessiz */ }

    /* Tüm performans bütçeleri tek yerden: perf.js / Quality.
       Buradan sonra hiçbir sistem kendi sabitini yazmaz. */
    /* Cihaz tahmini SADECE VARSAYILANDIR: oyuncunun kayıtlı seçimi varsa o
       kazanır (bkz. settings.js — tahmin bazı cihazlarda yanılıyor). */
    Settings.attach(this, this.qualityTier, isTouch);
    Quality.init(Settings.tier(), isTouch);
    Quality.onChange(() => { if (this.renderer3d) this.renderer3d.resize(); });
    this.maxEnemies = Quality.budget('enemies');       // tampon boyutu (sabit)

    /* 2D ÜST KATMAN HER ZAMAN TAM NETLİKTE (DPR ≤ 2).
       Üzerinde yalnızca hasar yazıları ve joystick var — maliyeti ihmal
       edilebilir, ama bulanıklaşmaları ANINDA fark edilir. Dinamik
       çözünürlük artık yalnızca ağır WebGL katmanına uygulanıyor; böylece
       telefon zorlanırken bile sayılar jilet gibi keskin kalır. */
    /* v73b: 2B üst katman (hasar yazısı · joystick · işaret) TAM EKRAN bir katmandır ve her karede silinip
       birleştirilir; orta kademede 3B tuval 1,35'te iken bu 2,0'daydı (3B'den fazla piksel!). Kademe
       tavanı: low 1,5 · mid 1,75 · high 2 — yazı 3× ekranda da keskin kalır. */
    this.dprCap = Math.min(window.devicePixelRatio || 1, Quality.tier === 'low' ? 1.5 : Quality.tier === 'mid' ? 1.75 : 2);
    this.w = 0; this.h = 0;

    /* ── Durum ── */
    this.state = 'menu';
    this.time = 0;
    this.kills = 0;
    this.freeze = 0;
    this.trauma = 0;
    this.shakeX = 0; this.shakeY = 0;
    /* v39 kamera dili: pürüzsüz sarsıntı saati · yönlü tekme · mikro
       yuvarlanma · zoom vurgusu (bkz. addKick / punch) */
    this._shT = 0; this.shakeR = 0;
    this._kax = 0; this._kay = 0; this._kickT = 9;
    this._punchA = 0; this._punchT = 9; this.zoomP = 0;
    this._dangerEl = null; this._dangerOn = false;
    /* ── Kampanya durumu ── */
    this.worldId = 1;
    this.missionId = 1;
    this.msn = missionDef(1, 1);      // aktif görev planı
    this.wave = 1;                    // görev içi dalga (1..msn.waves)

    /* ── Kamera ── */
    this.cam = { x: 0, y: 0 };
    this.viewL = 0; this.viewT = 0; this.viewR = 0; this.viewB = 0;

    this.fpsEma = 60;
    this.lowFpsTime = 0;

    /* ── Havuzlar ── */
    this.pools = {
      particles: new Pool('particles',
        () => ({ x:0, y:0, vx:0, vy:0, life:0, max:1, size:2, color:'#fff', drag:1, grav:0, add:false, __pi:undefined }),
        (o, x, y, vx, vy, life, size, color, drag, grav, add) => {
          o.x = x; o.y = y; o.vx = vx; o.vy = vy;
          o.life = life; o.max = life; o.size = size; o.color = color;
          o.drag = drag; o.grav = grav; o.add = add;
        }, 600),

      texts: new Pool('texts',
        () => ({ x:0, y:0, vx:0, vy:0, life:0, max:1, str:'', color:'#fff', size:14, crit:false,
                 pt:0, pk:1, owner:null, val:0, __pi:undefined }),
        (o, x, y, str, color, size, crit, ang) => {
          o.x = x; o.y = y;
          /* POP-İN + SAVRULMA (v39): sayı büyük doğar ve 0,13 sn'de oturur;
             darbe yönünde hafifçe savrulur (yön yoksa dik yükselir — afiş
             yazıları yerinde kalır). */
          o.vy = crit ? -64 : -48;
          o.vx = ang === undefined ? 0 : Math.cos(ang) * 34 + (Math.random() - 0.5) * 18;
          o.life = FX.floatTextLife * (crit ? 1.12 : 1); o.max = o.life;
          o.str = str; o.color = color; o.size = size; o.crit = crit;
          o.pt = 0; o.pk = crit ? 1.95 : 1.42;
          o.owner = null; o.val = 0;
        }, 80),

      gems: new Pool('gems',
        () => ({ x:0, y:0, vx:0, vy:0, value:1, tier:0, pull:false, pt:0, bob:0, __pi:undefined }),
        (o, x, y, value) => {
          o.x = x; o.y = y;
          o.vx = (Math.random() - 0.5) * 90;
          o.vy = (Math.random() - 0.5) * 90;
          o.value = value; o.pull = false; o.pt = 0;
          o.bob = Math.random() * Math.PI * 2;
          o.tier = 0;
          for (let i = GEM_TIERS.length - 1; i >= 0; i--) {
            if (value >= GEM_TIERS[i].min) { o.tier = i; break; }
          }
        }, 400),

      /* KAN KALBİ: düşmanlardan seyrek düşen can toplamağı — oyuncuyu rahatlatır */
      hearts: new Pool('hearts',
        () => ({ x:0, y:0, vx:0, vy:0, amount:0, pull:false, bob:0, life:0, __pi:undefined }),
        (o, x, y, amount) => {
          o.x = x; o.y = y;
          o.vx = (Math.random() - 0.5) * 70;
          o.vy = (Math.random() - 0.5) * 70;
          o.amount = amount; o.pull = false;
          o.bob = Math.random() * Math.PI * 2;
          o.life = 26;                       // yerde çok uzun beklemesin
        }, 40),

      /* DÜŞEN GÜÇLER: mıknatıs · can · kalkan · dondurma (bkz. powerups.js).
         `life` uzun: güç haritanın öbür ucunda düşerse oyuncu ona gitmeye
         KARAR verebilmeli — 4000 px'lik sahada 26 saniye yol demektir. */
      powerups: new Pool('powerups',
        () => ({ x:0, y:0, vx:0, vy:0, kind:'heal', bob:0, life:0, pull:false, __pi:undefined }),
        (o, x, y, kind) => {
          o.x = x; o.y = y;
          o.vx = (Math.random() - 0.5) * 60;
          o.vy = (Math.random() - 0.5) * 60;
          o.kind = kind; o.pull = false;
          o.bob = Math.random() * Math.PI * 2;
          o.life = 40;
        }, 10),

      pBullets: new Pool('pBullets',
        () => ({ x:0, y:0, vx:0, vy:0, dmg:0, pierce:0, life:0, r:5, angle:0, color:'#59e3c8', lastHit:null,
                 isArrow:false, bounce:0, flame:0, homing:0, explode:0, split:0, frag:false, smoke:0, metal:false,
                 fireball:false, ph:0, nova:0, burned:false, critAdd:0, __pi:undefined }),
        (o, x, y, vx, vy, dmg, pierce, life, r, color) => {
          o.x = x; o.y = y; o.vx = vx; o.vy = vy;
          o.dmg = dmg; o.pierce = pierce; o.life = life; o.r = r;
          o.angle = Math.atan2(vy, vx);
          o.color = color || '#59e3c8';
          o.lastHit = null;
          /* KİMLİK ALANLARI HAVUZDA SIFIRLANIR: geri dönüşen bir mermi eski
             sahibinin bayraklarını taşırsa (örn. saçılan gülle) yay okundan
             gülle parçaları saçılırdı. Çağıran taraf gerekeni sonra yazar. */
          o.split = 0; o.frag = false; o.smoke = 0; o.metal = false;
          o.fireball = false; o.ph = 0; o.burned = false; o.nova = 0;
        }, 60),

      eBullets: new Pool('eBullets',
        () => ({ x:0, y:0, vx:0, vy:0, dmg:0, life:0, r:5, hue:0, ph:0, __pi:undefined }),
        (o, x, y, vx, vy, dmg, life, r, hue) => {
          o.x = x; o.y = y; o.vx = vx; o.vy = vy;
          o.dmg = dmg; o.life = life; o.r = r;
          /* hue: 0 = nekro yeşili (İskelet Büyücü) · 1 = hasat kızılı (boss).
             OBTAIN'DE sıfırlanır — geri dönüşen mermi eski sahibinin rengini
             taşırsa büyücünün asasından boss güllesi çıkar (pBullets'ta aynı
             ders alınmıştı). ph: yalım türbülans fazı, yoksa yan yana iki
             mermi aynı kareyi gösterir ve "kopyala-yapıştır" okunur. */
          o.hue = hue | 0;
          o.ph = Math.random() * 6.283;
        }, 120),

      zones: new Pool('zones',
        () => ({ x:0, y:0, r:0, dps:0, life:0, max:1, tick:0, seed:0, blue:false, __pi:undefined }),
        (o, x, y, r, dps, life) => {
          o.x = x; o.y = y; o.r = r; o.dps = dps;
          o.life = life; o.max = life; o.tick = 0;
          o.seed = Math.random() * Math.PI * 2;
          /* blue: MAVİ KOR birikintisi (Gökalev). Kor Çemberi ile aynı havuzu
             paylaşır, o yüzden bayrak OBTAIN'de sıfırlanır. */
          o.blue = false;
        }, 8),

      bombs: new Pool('bombs',
        () => ({ x:0, y:0, sx:0, sy:0, tx:0, ty:0, t:0, dur:1, h:0, spin:0, dmg:0, radius:0, dist:0, __pi:undefined }),
        (o, sx, sy, tx, ty, dur, dmg, radius) => {
          o.sx = sx; o.sy = sy; o.tx = tx; o.ty = ty;
          o.x = sx; o.y = sy; o.t = 0; o.dur = dur; o.h = 0;
          o.spin = Math.random() * 6.283; o.dmg = dmg; o.radius = radius;
          o.dist = Math.hypot(tx - sx, ty - sy);
        }, 16),

      rings: new Pool('rings',
        () => ({ x:0, y:0, r:0, max:1, life:0, maxLife:1, color:'#fff', __pi:undefined }),
        (o, x, y, r, life, color) => {
          o.x = x; o.y = y; o.r = 0; o.max = r;
          o.life = life; o.maxLife = life; o.color = color;
        }, 24),

      /* ═══ TEHLİKE ALANLARI — DÜŞMANIN YER HASARI (2026-08-29) ═══
         `zones` oyuncunun kor birikintisidir (düşmana vurur); bunun tersi
         hiç yoktu. İki yeni davranışın ORTAK altyapısı:
           • İskelet Kral'ın ölüm nabzı (telegraf → patlama)
           • Batak Ejderi'nin zıplama hedefi + üçe ayrılan zehir bombaları
         İKİNCİ BİR YOL YAZILMADI: iki sistem ayrı yazılsaydı `waveDuration`
         tuzağının aynen tekrarı olurdu (iki yerde yaşayan tek kural).

         kind 0 = TELEGRAF+PATLAMA: `tell` süresi boyunca yerde kırmızı
           halka büyür, sonunda BİR KEZ hasar verir. Uyarısız alan hasarı
           ekranda "sebepsiz can gitti" diye okunur.
         kind 1 = KALICI ZEHİR: yarım saniyede bir tikler, `dur` boyunca
           durur — oyuncuyu YER DEĞİŞTİRMEYE zorlar, tek vuruşta öldürmez.

         Havuz tavanı HAZARD_CAP (config) — görsel mesh sayısıyla AYNI sayıdan
         türer. Tavan `main.spawnHazard` kapısıyla uygulanır: `Pool` kendi
         tavanını AŞAR (ölçüldü: 12 tavanlı havuz 16 aktife çıktı), yani
         "fazlası sessizce düşer" varsayımı yanlıştı ve tavanı aşan alan
         GÖRÜNMEDEN hasar veriyordu. */
      hazards: new Pool('hazards',
        () => ({ x:0, y:0, r:0, t:0, tell:0, dur:1, dmg:0, kind:0, hit:false,
                 tick:0, seed:0, hue:0, pdur:0, pdmg:0, __pi:undefined }),
        (o, x, y, r, dmg, tell, dur, kind, hue, pdur, pdmg) => {
          o.x = x; o.y = y; o.r = r; o.dmg = dmg;
          o.t = 0; o.tell = tell; o.dur = dur; o.kind = kind || 0;
          o.hit = false; o.tick = 0.28;
          o.seed = Math.random() * 6.283;
          o.hue = hue || 0;              // 0 kizil (kral) · 1 zehir yeşili (ejder)
          /* İKİ FAZLI ALAN: patlamadan SONRA aynı yuva zehir gölüne dönüşür
             (bkz. updateHazards). İkinci bir yuva açmak İKİ sebeple yanlıştı:
             iterasyon sırasında aynı havuza `obtain` etmek ve üç bombalık
             salvonun yuva ihtiyacını ikiye katlamak. */
          o.pdur = pdur || 0; o.pdmg = pdmg || 0;
        }, HAZARD_CAP),
    };

    this._exScratch = [];

    /* ── Alt sistemler ── */
    this.audio   = new AudioFX();
    this.music   = new Music(this.audio);
    this.settings = Settings;
    this.input   = new Input(this);
    this.player  = new Player(this);
    this.enemies = new EnemyManager(this);
    this.weapons = new WeaponManager(this);
    this.ui      = new UI(this);

    /* ── HAVUZLARI CİHAZ BÜTÇESİNE GÖRE ÖNCEDEN DOLDUR ──
       Havuz boyutları sabit yazılmıştı (düşman 300, partikül 600) ama
       yüksek kademe bütçesi 460 düşman / 700 partikül. Fark tam da boss
       dalgasında yaratılıyordu: 160 nesne tahsisi + GC, sahnenin en
       kalabalık saniyesinde. Şimdi hepsi açılışta hazır (~1 ms). */
    this.enemies.pool.prewarm(Quality.budget('enemies') + 24);
    this.pools.particles.prewarm(Quality.budget('particles') + 60);
    this.pools.texts.prewarm(140);
    this.pools.gems.prewarm(240);
    this.pools.eBullets.prewarm(220);
    this.pools.pBullets.prewarm(140);
    this.pools.rings.prewarm(60);

    /* ── 3D render motoru: Kurt (FBX) dahil tüm oyun sahnesi Three.js'te ── */
    this.renderer3d = new Renderer3D(this);

    /* ── Sabit çizimler ── */
    this.floorPattern = null;
    this.floorStyle = '';
    this.overlayCanvas = null;
    this.overlayWorld = -1;
    this.buildFloorPattern('mezarlik');

    /* ── ARENA: 4 tarafı kapalı KARE saha (Dünya 1) ──
       Prosedürel pişirilir: çit görseli = çarpışma sınırı birebir.
       DPR çözünürlüğünde tek offscreen canvas — net doku, tek drawImage. */
    this.arenaCanvas = null;
    this.arenaDetail = null;
    this.arenaDetailMid = 0.216;
    this.arenaTile = 512;
    /* Nesne paleti haritadan gelir (propModels.PROP_PAL_IDS ile aynı anahtar):
       render tarafı bunu okuyup o haritanın geometri setini pişirir. */
    this.arenaMapId = 'mezarlik';
    this.arena = null;
    /* harita içi çarpışmalı/kırılabilir engeller (bkz. arenaProps.js) */
    this.props = new PropField(this);
    /* saha içi kısa görevler + düşen güçler */
    this.objectives = new ObjectiveManager(this);
    this.powerups = new PowerupManager(this);
    /* v49: sahadaki gümüş sandıklar (yaklaşınca açılır, ödül verir) */
    this.fieldChests = new FieldChests(this);
    this.ult = new Ultimate(this);   // v61 H5 süper yetenek
    this.events = new WorldEvents(this);   // v62 İ3/D3 dünya olayları + sunak
    this.mode = new MissionMode(this);     // v63 İ4 görev türleri
    window.addEventListener('keydown', (ev) => { if ((ev.code === 'Space' || ev.key === 'e' || ev.key === 'E') && this.state === 'playing' && this.ult.fire()) ev.preventDefault(); });

    /* ── Olaylar ── */
    window.addEventListener('resize', () => this.resize());
    window.addEventListener('orientationchange', () => setTimeout(() => this.resize(), 120));
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        if (this.state === 'playing') this.pauseGame();
        this.saveMeta(true);             // arka plana geçerken cüzdanı garantiye al
        flushVault();
        this.scheduleNotifications();
        if (Backend.online()) Backend.pushSave(Backend.snapshot());
        /* SES YOLUNU ASKIYA AL. AudioContext arka planda çalışmaya devam
           eder: zamanlayıcılar döner, limiter/yankı düğümleri işlenir, pil
           yanar. Uygulamanın kapandığını sanan oyuncu telefonu cebine
           koyduğunda hâlâ ses üreten bir oyun "web sitesi" gibi davranır. */
        if (this.audio && this.audio.ctx && this.audio.ctx.state === 'running') {
          this.audio.ctx.suspend().catch(() => { /* tarayıcı reddederse önemsiz */ });
        }
      } else {
        /* Geri dönüşte ses yolu ELLE açılır: suspend'den sonra tarayıcı
           kendiliğinden devam ettirmez ve oyun sessiz kalır. */
        if (this.audio && this.audio.ctx && this.audio.ctx.state === 'suspended') {
          this.audio.ctx.resume().catch(() => { /* kullanıcı jesti gerekebilir */ });
        }
        /* Sekmeye geri dönüldüğünde WebGL context'i çoğu mobil tarayıcıda
           düşmüş olur — burada proaktif olarak kurtar, yoksa savaş alanı
           kalıcı kararır (2D katman çalışsa da). */
        if (this.renderer3d && this.renderer3d.contextIsLost()) {
          this.renderer3d.recover();
        } else if (this.renderer3d) {
          this.resize();               // her ihtimale karşı taze bir kare çiz
        }
      }
    });
    document.addEventListener('contextmenu', (e) => e.preventDefault());

    /* ── MÜZİĞİ İLK DOKUNUŞTA BAŞLAT ──
       Tarayıcı ses yolunu bir kullanıcı jesti olmadan açmaz. Müziği
       "görev başlat"a bağlamak menüyü sessiz bırakırdı — oysa menü
       müziğin en çok duyulduğu yer (oyuncu sandık açarken, kahraman
       geliştirirken orada duruyor). Bu yüzden İLK dokunuşta açılır.

       `once: true` KULLANILMAZ ve dönen değere de bakılmaz: ses yolu
       ASENKRON açılır — gerçek cihazda ilk dokunuşta `ctx.state` hâlâ
       'suspended' olabilir. Tek şansı harcayan bir dinleyici müziği
       ikinci dokunuşa (bazen hiç) bırakır. Bunun yerine müzik hemen
       kurulur, `statechange` gerçekten açıldığı anı yakalar ve
       zamanlayıcıyı ŞU ANA hizalar (`resync`) — hizalamadan biriken
       barların hepsi aynı ana yazılıp gürültü patlaması olurdu. */
    const kick = () => {
      this.audio.unlock();
      if (!this.music.attach()) return;          // ses yolu yoksa sonraki dokunuş dener
      this.music.setState(this.state === 'playing' ? 'battle' : 'menu');
      const ctx = this.audio.ctx;
      if (ctx && ctx.state !== 'running') {
        const onState = () => {
          if (ctx.state !== 'running') return;
          ctx.removeEventListener('statechange', onState);
          this.music.resync();
        };
        ctx.addEventListener('statechange', onState);
      }
      window.removeEventListener('pointerdown', kick);
      window.removeEventListener('keydown', kick);
    };
    window.addEventListener('pointerdown', kick);
    window.addEventListener('keydown', kick);
    /* UYGULAMA PAKETİNDE jest beklenmez: WebView medya jestini istemez
       (capacitor.config), ses açılış perdesi kalkarken kendiliğinden başlar.
       Tarayıcıda ilk dokunuş yolu yedek olarak kalır. */
    this._audioKick = kick;
    lockPortrait();

    /* ── GERİ TUŞU (Android donanım tuşu / tarayıcı geri) ──
       Nöbetçi geçmiş girişi: bir kez konur, her basışta tüketilir ve
       hemen yenilenir. Böylece geçmiş tükenmez ve oyun kazara kapanmaz.
       ui.handleBack() false döndürürse (kök menü) nöbetçi YENİLENMEZ —
       ikinci basış uygulamayı kapatır, Android'de beklenen davranış. */
    try { history.replaceState({ kh: 0 }, ''); history.pushState({ kh: 1 }, ''); } catch (e) { /* file:// */ }
    window.addEventListener('popstate', () => {
      const handled = this.ui ? this.ui.handleBack() : false;
      if (handled) {
        this.audio.play('click');
        try { history.pushState({ kh: 1 }, ''); } catch (e) { /* */ }
      }
    });

    this.resize();
    /* Kay\u0131tl\u0131 ayarlar\u0131 uygula \u2014 audio ve renderer kurulduktan SONRA:
       setVolume kilitlenmemi\u015f ses yolunda de\u011feri saklar, unlock() onu okur. */
    Settings.applyAll();
    this.last = performance.now();
    this._loopBound = (t) => this.loop(t);
    window.KH = this;              // hata ayıklama hooku
    nativeShell();                 // tam ekran / ekran uyanık / tarayıcı jestleri kapalı
    /* FONT ISITMASI: hasar sayıları 2D canvas'a 'Chakra Petch' ile çizilir.
       Font yüklenmeden ilk sayı çizilirse sistem fontuna düşer, sonra
       zıplar — "web sayfası" hissinin klasik belirtisi. Açılış çubuğu
       fontları da bekler (oyuncu zaten bekliyor). */
    Warmup.add('fontlar', () => (document.fonts ? document.fonts.ready : null));
    /* PİŞİRME ISITMASI (perf kuralı 5): arena dokusu görev başına BİR kez
       pişer, yani sahada çalışan yol her zaman SOĞUK yoldur — tezgahta
       ilk satır 788 ms, ısınmış satırlar 198-401 ms ölçüldü (masaüstü;
       orta seviye telefonda katları). Fark JIT + taze tuval: aynı
       boyacı kiti, aynı gradyan/desen yolları. Açılış ekranında küçük
       bir harita pişirilerek yol ısıtılır (oyuncu zaten bekliyor);
       görev açılışında kalan iş yalnız gerçek çözünürlükteki çizim.
       Tuval hemen bırakılır — ısıtmanın amacı bellekte doku tutmak
       değil, kod yollarını derletmek. */
    Warmup.add('harita pişirme yolu', () => {
      try {
        bakeArenaMap('mezarlik', { play: 512, border: 32, pot: 256, detailPot: 256, tile: 512, ai: false });
      } catch (e) { console.warn('[warmup] harita pişirme ısıtması atlandı', e); }
    });
    /* AI ZEMİN KAROSU AĞDAN GELİR — SAVAŞTA BEKLEMEZ. Karo yüklenmemişse
       bakeArenaMap sessizce prosedürel yüzeye düşer, yani "ilk görev eski
       dokuyla açılır" gibi sinsi bir tutarsızlık doğar.

       ON KARO AÇILIŞA KOYULMAZ: iki karo ölçülen 1246 ms tuttu, on karo
       açılışı ~6 sn uzatırdı — oysa oyuncu bir görevde TEK harita görür.
       Açılış çubuğu yalnız ŞU ANKİ dünyanın karosunu bekler; kalanı açılış
       perdesi kapanırken (runSplash → finish → prefetchTiles) boş zamanda
       gelir. */
    Warmup.add('zemin karosu', () => preloadAiDetail(worldMapId(this.worldId || 1)));
    /* Ada varlıkları menü AÇILIR AÇILMAZ görünür (ana ekran haritası),
       yani açılış çubuğu bunu da bekler — aksi hâlde menü prosedürel
       boyanıp bir saniye sonra AI'ya "zıplıyor". İndirilmiş karo ikinci
       açılışta önbellekten gelir (ölçüldü: 29-43 ms). */
    Warmup.add('ada varlıkları', () => preloadIsles((WORLDS[(this.worldId || 1) - 1] || WORLDS[0]).floor));
    this.runSplash();
    requestAnimationFrame(this._loopBound);
    this._startWatchdog();          // rAF zinciri koparsa 250 ms'de onar
  }

  /* ═══════════ AÇILIŞ EKRANI (min 5 sn) ═══════════ */
  runSplash() {
    const el = document.getElementById('splash');
    if (!el) return;
    /* KADRO GÖRSELİ (v36): pişmiş tek varlık — assets/splash/kadro.webp.
       Eskiden burada üç kahraman HER AÇILIŞTA vektörle çiziliyordu;
       açılışın ilk saniyesi ana iş parçacığının EN MEŞGUL anıdır (modül
       grafiği + ısıtma) ve o çizim ısıtmanın önüne geçiyordu.
       GÖRSELİN ERİMESİ BURADA DEĞİL index.html'DE: bu metot three.js
       yüklendikten sonra çalışır, yani ölçülen 1900 ms'de henüz yoktur —
       erime oraya bağlanınca açılışın ilk saniyeleri boş kalıyordu. */

    const tipEl = document.getElementById('splash-tip');
    /* ── TÜYOLAR GERÇEK OLMALI ──
       Eskiden burada atmosfer cümleleri vardı ("Kızıl ay yükseliyor…") —
       hoş, ama oyuncuya HİÇBİR ŞEY öğretmiyorlardı; üstelik beklerken
       okunacak tek yazı odur. Her satır oyunun GERÇEK kuralıdır ve
       kaynağı yorumda yazılıdır. Bir mekanik değişirse BURAYI da güncelle. */
    const tips = [
      'İmza silahı kahramanın nadirliğiyle güçlenir: nadir ×1,12 · destan ×1,25 · efsane ×1,45.', // signaturePower
      'AYAZ her savuruşta zemine ayaz halkası bırakır — bunun için kart gerekmez.',                // WEAPONS.yemin.shock = 1
      'GECE KRALİÇESİ’nin her savuruşu bir kesik fırlatır; yakındaki düşman iki kez vurulur.',      // tackilic.wave = 1
      'Yakın dövüş kahramanları düşman menzile girmeden savurmaz; boşa sallanan kılıç yoktur.',     // weapons.updateSword menzil kapısı
      'Aynı anda tek sandık çözülür; sırayı akıllı seç.',
      'Kritik vuruş kamerayı hafif sarsar; sıradan vuruş sarsmaz — sarsıntı bir bilgidir.',            // FX sarsıntı politikası
      'Düşmanın boyu tehdidini söyler: Mezar Muhafızı hortlaktan bir baş uzundur.',                   // WORLD_ENEMY_MODELS boy hiyerarşisi
      'Pasif rünler her kahramanda işler: can, hız, saldırı hızı.',
      'Saha dört tarafı kapalı bir karedir; köşeye sıkışmak kalabalıkta en hızlı ölüm sebebidir.',
    ];
    if (tipEl) tipEl.textContent = tips[(Math.random() * tips.length) | 0];

    const MIN = 2600;                       // v56 A4: 5 → 2,6 sn (logo girişi 2,4 sn); ısıtma kapısı aynen bekler
    const t0 = performance.now();
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      PerfLog.boot(performance.now());     // v54 F2: soğuk açılış süresi (sayfa → menü), son 10
      el.classList.add('gone');
      setTimeout(() => { el.remove(); }, 700);
      if (isNative() && this._audioKick) { try { this._audioKick(); } catch (err) { /* */ } }
      try { this.audio.play && this.audio.play('boot'); } catch (err) { /* */ }
      /* İLK AÇILIŞ: yaş seçimi (bir kez) → sonra sürüm denetimi. */
      setTimeout(() => {
        this.ui.ensureAgeGate(() => {
          checkUpdate().then((r) => { if (r.state === 'force' || r.state === 'soft') this.ui.showUpdate(r); });
        });
      }, 720);
      /* KALAN KAROLAR BURADA İSTENİR — MENÜYE İLK GİRİŞ BURASIDIR.
         Önceki sürüm bu bloğu `quitToMenu()` içine koymuştu; o metot
         yalnız oyuncu SAVAŞTAN dönerken çalışır, yani taze açılışta hiç
         çalışmıyordu ve 2-10. dünyalar prosedürel yüzeyde açılıyordu
         (ölçüldü: menüde önbellekte yalnız 'mezarlik'). "Yazdım" ≠
         "uygulandı": bir kancanın HANGİ yoldan geçildiği ölçülür. */
      this.prefetchTiles();
    };
    /* ── GERÇEK ISITMA ──
       Bir shader ilk çizildiğinde sürücü onu DERLER (20–150 ms); bir doku ilk
       görününce GPU'ya yüklenir. Bunlar savaşın ortasında olursa oyuncu "yeni
       düşman gelince takılıyor" der — ve haklıdır. Hepsini BURADA yapıyoruz:
       oyuncu zaten bekliyor, bekleme süresi de zaten en az 5 saniye.
       İLERLEME ÇUBUĞU YOK (2026-08-10): oyuncu ona bakarak beklemeyi
       ÖLÇER, yani bekleyiş uzar. Bekleme süresi (en az 5 sn) ve ısıtma
       kapısı aynen duruyor — kapanış hâlâ gerçek işin bitmesini bekler. */
    let warmed = false;
    const markWarm = () => { warmed = true; warmProg = 1; };
    /* ── İLERLEME ÇUBUĞU (v26, kullanıcı isteği + referans görüntü) ──
       2026-08-10'da bir çubuk BİLEREK kaldırılmıştı ("oyuncu ona bakarak
       beklemeyi ÖLÇER, yani bekleyiş uzar"). Kullanıcı 2026-09-05'te açıkça
       geri istedi ve referans verdi: karar kullanıcınındır, ölçüm ona
       gerekçe sunar — yerine geçmez.

       ÇUBUK YALAN SÖYLEMEZ. İki kapı var (en az 5 sn + gerçek ısıtma) ve
       dolgu ikisinin DAHA GERİ olanını gösterir, yani %100 tam olarak
       oyuna girilebildiği anda dolar. Sabit hızda dolup sonra %99'da
       bekleyen bir çubuk oyuncunun güvenini bir kez kırar ve o güven
       geri gelmez.

       Isıtma payı 0,97 ile çarpılır: son adım bitmeden çubuk %100
       göstermesin — kapanış animasyonu (640 ms) doluluğun ARDINDAN gelir. */
    const fillEl = document.getElementById('splash-fill');
    const pctEl  = document.getElementById('splash-pct');
    const barEl  = document.getElementById('splash-bar');
    const stepEl = document.getElementById('splash-step');
    let warmProg = 0, shown = 0, lastPc = -1;
    Warmup.run((p, label) => {
      warmProg = p;
      /* v55 · QA: iç derleme adları ("süs · rüzgâr · fx shaderları") oyuncuya gösterilmez → temalı satır. */
      if (stepEl) { const L = SPLASH_LINES, k = Math.min(L.length - 1, Math.floor(p * L.length)); if (stepEl._k !== k) { stepEl._k = k; stepEl.textContent = T(L[k]); } }
    }).then(markWarm, markWarm);

    const step = (now) => {
      if (done) return;
      const timeP = Math.min(1, (now - t0) / MIN);
      const target = Math.min(timeP, warmed ? 1 : warmProg * 0.97);
      /* GERİ GİTMEZ, SIÇRAMAZ: gösterilen değer hedefe doğru yumuşar.
         İki kapı da monoton olduğu için target da monotondur. */
      shown += (target - shown) * 0.16;
      if (target - shown < 0.004) shown = target;
      const pc = shown * 100 | 0;
      if (pc !== lastPc) {
        lastPc = pc;
        if (fillEl) fillEl.style.width = pc + '%';
        if (pctEl) pctEl.textContent = pc + '%';
        if (barEl) barEl.setAttribute('aria-valuenow', pc);
      }
      if (shown < 1 || !warmed) requestAnimationFrame(step);
      else finish();
    };
    requestAnimationFrame(step);
    /* güvenlik: sekme arka plandayken rAF dursa bile kapan. ÇUBUĞU DA
       DOLDURUR — yarım dolu bir çubuktan oyuna atlamak, çubuğun az önce
       verdiği sözü bozar (bkz. yukarıdaki "çubuk yalan söylemez"). */
    setTimeout(() => { warmed = true; warmProg = 1; }, MIN + 3200);
    setTimeout(finish, MIN + 4600);
  }

  /* ═══════════ BOYUTLANDIRMA ═══════════ */

  resize() {
    const cw = this.canvas.clientWidth || window.innerWidth;
    const ch = this.canvas.clientHeight || window.innerHeight;
    const sizeChanged = (cw !== this.w || ch !== this.h);
    this.w = cw;
    this.h = ch;
    const s = this.dprCap;
    this.canvas.width  = Math.round(this.w * s);
    this.canvas.height = Math.round(this.h * s);
    /* piksel-art netliği: sprite ölçeklemede yumuşatma kapalı
       (canvas boyutu değişince bayrak sıfırlanır — burada geri kur) */
    this.ctx.imageSmoothingEnabled = true;
    this.ctx.setTransform(s, 0, 0, s, 0, 0);
    /* vinyet yalnızca boyut/dünya değişince yeniden pişirilir — eskiden her
       dinamik-çözünürlük ayarında (saniyeler içinde birkaç kez) tam ekran
       iki gradyan yeniden çiziliyordu. */
    if (sizeChanged || !this.overlayCanvas) this.buildOverlay();
    if (this.renderer3d) this.renderer3d.resize();
  }

  worldDef(id) { return WORLDS[(id || this.worldId) - 1] || WORLDS[0]; }

  /** Deterministik mini-rastgele üreteci (dikişsiz karolar için). */
  _rng(seed) {
    let s = seed;
    return () => (s = (s * 16807) % 2147483647) / 2147483647;
  }

  /* ═══════════ ARENA PİŞİRME ═══════════════════════════════════
     Harita sanatı artık game/arenaMaps.js'te yaşar (5 harita, dünya başına
     biri — WORLD_MAPS tablosu). Buradaki iş yalnız SÖZLEŞMEDİR: arena
     ölçüleri + dünya paleti girer, tek offscreen canvas çıkar;
     render3d._updateGround onu dokuya çevirir (`_lastArenaCanvas` kimlik
     karşılaştırmasıyla, yani yeniden yükleme yalnız harita değişince olur).

     Eskiden ~300 satırlık gotik mezarlık boyacısı buradaydı: kırık taş
     döşeme + demir parmaklık + köşe kuleleri, altı dünya için tek palet
     tablosu. Beş yeni harita onun yerini aldı (2026-08-14).

     `pot: 2048` — ÇIKTI 2'NİN KUVVETİ OLMAK ZORUNDA. Zemin dokusu 44° eğik
     bakılır ve ekranda küçültülür; mipmap olmadan kamera kıpırdadıkça zemin
     titrer, POT olmadan da mipmap eğri artifakt üretir. İkisi birlikte
     çözülür (bkz. render3d._updateGround). Serbest `res` ile pişirmeyin.
     VRAM: 2048² RGBA + mip ≈ 22,4 MB — ~350 MB WebView tavanının altında.

     Çit görseli = çarpışma sınırı BİREBİR: haritanın açık eşik şeridi tam
     play/2'ye oturur (arenaMaps.threshold), yani oyuncu duvarı görmeden
     ona çarpmaz. Yeni harita eklerken o şeridi kaldırma. */
  bakeArena() {
    const A = this.arena;
    if (!A) return;
    const t0 = performance.now();
    /* ÇİFT KATMAN: makro (gerilen kompozisyon) + detail (döşenen mikro doku).
       props aynı pişirmeden çıkar — gölgesi dokuya PIŞEN engel ile
       çarpıştığımız engel TEK LİSTEDEN gelir (görsel = çarpışma kuralı). */
    const baked = bakeArenaMap(worldMapId(this.worldId), {
      play: A.play, border: A.border, world: this.worldDef(),
    });
    this.arenaCanvas = baked.macro;
    this.arenaDetail = baked.detail;
    this.arenaDetailMid = baked.detailMid;
    this.arenaTile = baked.tile;
    this.arenaMapId = baked.mapId;
    /* NESNE GEOMETRİLERİNİ PERDE ARKASINDA PİŞİR. Palet haritaya bağlı
       olduğu için set görev başına bir kez kurulur; buradan çağırmazsak
       maliyeti İLK KARE öder ve oyun tek karelik takılmayla başlar
       ("ilk kullanımda derlenen hiçbir şey savaşta olmaz" kuralı). */
    if (this.renderer3d && this.renderer3d.prewarmProps) this.renderer3d.prewarmProps(baked.mapId);
    if (this.renderer3d && this.renderer3d.prewarmFieldChests) this.renderer3d.prewarmFieldChests();
    this.props.load(baked.props, A);
    /* v47: çarpışmasız süs + FX çıpaları (render tarafı stamp ile bir kez kurar) */
    this.decor = baked.decor || [];
    this.fx = baked.fx || [];
    this.decorStamp = (this.decorStamp | 0) + 1;
    this.arenaBakeMs = performance.now() - t0;
  }

  /** GÖREV ÖDÜLÜ: kart seçimi. Dalga arasını BEKLEMEZ — görev anI ödülün
      anıdır; 40 saniye sonra gelen kart, görevin ödülü gibi okunmaz.
      Akış seviye atlama kartıyla AYNI yoldan geçer (_inWaveBonus): tek
      kaynak, tek geri dönüş yolu. */
  grantObjectiveCard() {
    if (this.state !== 'playing') { this._pendingObjCard = true; return; }
    /* Haftalık görev sayacı TÜM saha görevlerinin tek ortak başarı
       yolundan beslenir (escort + yuva): iki ayrı yerden saymak
       objectives.js'e yeni bir görev türü eklendiğinde sessizce yanlış
       olur. Kaydı hemen yazmaz — koşu sonunda saveRecord yazar. */
    if (this.dailies) this.dailies.add('objectives', 1);
    this.pendingWaveBonus = false;
    this.state = 'levelup';
    this._inWaveBonus = true;
    this._objCard = true;
    this.trauma = 0;
    /* v64: yeniden dağıtma hakkı KOŞU başına 3 (seviye başına sıfırlanmaz — kullanıcı kuralı) */
    this.ui.showLevelUp(this.weapons.rollChoices(3));
  }

  /** Dünyaya özgü zemin karosu — 1024px, A-kalite boyalı düz zemin sanatı.
      İlkeler: zemin DÜZ (hacimli engel yok); tüm zenginlik boyanmış makro
      yamalar + imza motifleri + ışıyan aksanlarla verilir. Kenar dikişsizliği
      için her öğe 3×3 sarmalı çizilir; rastgeleler sarmal DIŞINDA üretilir. */
  buildFloorPattern(style) {
    if (this.floorStyle === style && this.floorPattern) return;
    this.floorStyle = style;
    const T = 1024;
    const c = document.createElement('canvas');
    c.width = T; c.height = T;
    const g = c.getContext('2d');
    const rnd = this._rng(style.length * 131 + 7);
    const TAU = 6.28318;
    const wrap = (fn) => { for (let dx = -T; dx <= T; dx += T) for (let dy = -T; dy <= T; dy += T) { g.save(); g.translate(dx, dy); fn(); g.restore(); } };
    /* yumuşak renk göleti (makro zemin varyasyonu) */
    const soft = (x, y, r, col) => wrap(() => {
      const vg = g.createRadialGradient(x, y, r * 0.1, x, y, r);
      vg.addColorStop(0, col); vg.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = vg; g.fillRect(x - r, y - r, r * 2, r * 2);
    });
    /* organik leke (ellips) */
    const blob = (x, y, r, sy, rot, fill) => wrap(() => {
      g.save(); g.translate(x, y); g.rotate(rot); g.scale(1, sy);
      g.fillStyle = fill; g.beginPath(); g.arc(0, 0, r, 0, TAU); g.fill(); g.restore();
    });

    if (style === 'kul') {
      /* ═ KOR YATAĞI: bazalt plakalar arasında akan ışıl ışıl magma nehirleri ═ */
      g.fillStyle = '#1b1310';
      g.fillRect(0, 0, T, T);
      for (let i = 0; i < 12; i++)
        soft(rnd() * T, rnd() * T, 140 + rnd() * 160, i % 3 === 0 ? 'rgba(64,40,28,0.35)' : (i % 3 === 1 ? 'rgba(14,9,8,0.5)' : 'rgba(40,26,20,0.4)'));
      /* magma nehirleri: soldan sağa TAM karo boyu akan periyodik hatlar —
         başlangıç/bitiş y'si eşit → karo tekrarında nehir KESİNTİSİZ akar */
      const rivers = [];
      for (let rI = 0; rI < 2; rI++) {
        const y0 = (rI === 0 ? 0.22 : 0.68) * T + (rnd() - 0.5) * 90;
        const pts = [[0, y0]];
        for (let k = 1; k < 6; k++) pts.push([k * T / 6, y0 + (rnd() - 0.5) * 260]);
        pts.push([T, y0]);
        rivers.push(pts);
      }
      const strokeRiver = (pts, w, col, blur) => wrap(() => {
        g.save();
        if (blur) { g.shadowColor = 'rgba(255,110,40,0.45)'; g.shadowBlur = blur; }
        g.strokeStyle = col; g.lineWidth = w; g.lineCap = 'round'; g.lineJoin = 'round';
        g.beginPath(); g.moveTo(pts[0][0], pts[0][1]);
        for (let k = 1; k < pts.length; k++) {
          const mx2 = (pts[k - 1][0] + pts[k][0]) / 2, my2 = (pts[k - 1][1] + pts[k][1]) / 2;
          g.quadraticCurveTo(pts[k - 1][0], pts[k - 1][1], mx2, my2);
        }
        g.lineTo(pts[pts.length - 1][0], pts[pts.length - 1][1]);
        g.stroke(); g.restore();
      });
      /* parlaklık kısıldı: göz yormayan, közlenmiş magma (v14) */
      for (const pts of rivers) {
        strokeRiver(pts, 34, 'rgba(96,34,16,0.5)', 0);
        strokeRiver(pts, 22, 'rgba(214,84,30,0.5)', 9);
        strokeRiver(pts, 10, 'rgba(255,150,66,0.42)', 0);
        strokeRiver(pts, 3.5, 'rgba(255,205,140,0.5)', 0);
      }
      /* nehirden uzak bölgelere bazalt plakalar (nehri örtme) —
         mesafe SEGMENT bazlı (nokta değil): kıvrımlı hattın her yerine bakar */
      const segDist = (x, y, ax, ay, bx, by) => {
        const vx = bx - ax, vy = by - ay;
        const t = Math.max(0, Math.min(1, ((x - ax) * vx + (y - ay) * vy) / (vx * vx + vy * vy || 1)));
        return Math.hypot(x - (ax + vx * t), y - (ay + vy * t));
      };
      const distToRivers = (x, y) => {
        let best = 1e9;
        for (const pts of rivers) for (let s = 0; s < pts.length - 1; s++) {
          for (let dx = -T; dx <= T; dx += T) for (let dy = -T; dy <= T; dy += T) {
            const d = segDist(x, y, pts[s][0] + dx, pts[s][1] + dy, pts[s + 1][0] + dx, pts[s + 1][1] + dy);
            if (d < best) best = d;
          }
        }
        return best;
      };
      /* bazalt plakalar: sarsılmış ızgara yerleşimi — eşit dağılım, nehri örtmez */
      const cells = 6, cw = T / cells;
      for (let ci = 0; ci < cells * cells; ci++) {
        const x = (ci % cells + 0.5) * cw + (rnd() - 0.5) * 80, y = ((ci / cells | 0) + 0.5) * cw + (rnd() - 0.5) * 80, r = 40 + rnd() * 44, a0 = rnd() * 3;
        const sides = 5 + (rnd() * 2 | 0);
        const rr = []; for (let k = 0; k < sides; k++) rr.push(r * (0.72 + rnd() * 0.42));
        if (distToRivers(x, y) < r + 26) continue;
        wrap(() => {
          g.save(); g.translate(x, y); g.rotate(a0);
          g.fillStyle = 'rgba(0,0,0,0.4)';
          g.beginPath(); for (let k = 0; k < sides; k++) { const a = k / sides * TAU; const px2 = Math.cos(a) * rr[k] + 4, py2 = Math.sin(a) * rr[k] * 0.86 + 5; k ? g.lineTo(px2, py2) : g.moveTo(px2, py2); } g.closePath(); g.fill();
          g.fillStyle = '#2c211a';
          g.beginPath(); for (let k = 0; k < sides; k++) { const a = k / sides * TAU; const px2 = Math.cos(a) * rr[k], py2 = Math.sin(a) * rr[k] * 0.86; k ? g.lineTo(px2, py2) : g.moveTo(px2, py2); } g.closePath(); g.fill();
          g.strokeStyle = 'rgba(255,150,70,0.09)'; g.lineWidth = 2.5; g.stroke();
          g.fillStyle = 'rgba(255,255,255,0.045)';
          g.beginPath(); for (let k = 0; k < sides; k++) { const a = k / sides * TAU; const px2 = Math.cos(a) * rr[k] * 0.55, py2 = Math.sin(a) * rr[k] * 0.5 - r * 0.16; k ? g.lineTo(px2, py2) : g.moveTo(px2, py2); } g.closePath(); g.fill();
          g.restore();
        });
      }
      /* kor benekleri + kül */
      for (let i = 0; i < 20; i++) {
        const x = rnd() * T, y = rnd() * T, r = 4 + rnd() * 7;
        soft(x, y, r * 3, 'rgba(255,160,70,0.2)');
        wrap(() => { g.fillStyle = 'rgba(255,214,150,0.55)'; g.beginPath(); g.arc(x, y, 1.4 + rnd() * 0, 0, TAU); g.fill(); });
      }
      g.fillStyle = 'rgba(220,208,196,0.09)';
      for (let i = 0; i < 60; i++) g.fillRect(rnd() * T, rnd() * T, 1 + rnd() * 2.6, 1 + rnd() * 2.6);
    } else if (style === 'bataklik') {
      /* ═ ZÜMRÜT BATAKLIK: yosun halısı, ışıl kıyılı gölcükler, nilüfer + ateşböceği ═ */
      g.fillStyle = '#152418';
      g.fillRect(0, 0, T, T);
      for (let i = 0; i < 14; i++)
        soft(rnd() * T, rnd() * T, 130 + rnd() * 170, i % 3 === 0 ? 'rgba(46,84,52,0.4)' : (i % 3 === 1 ? 'rgba(10,18,12,0.5)' : 'rgba(30,58,40,0.42)'));
      /* gölcükler: organik kıyılı, ışıyan zümrüt su */
      for (let i = 0; i < 5; i++) {
        const x = rnd() * T, y = rnd() * T, r = 54 + rnd() * 66, rot = rnd() * 3;
        const rr = []; for (let k = 0; k < 10; k++) rr.push(r * (0.74 + rnd() * 0.5));
        const pads = []; const nP = 1 + (rnd() * 3 | 0);
        for (let k = 0; k < nP; k++) pads.push([(rnd() - 0.5) * r * 0.9, (rnd() - 0.5) * r * 0.5, 8 + rnd() * 9, rnd() * TAU, rnd() < 0.35]);
        wrap(() => {
          g.save(); g.translate(x, y); g.rotate(rot); g.scale(1, 0.62);
          const edge = (mul) => {
            g.beginPath();
            const P10 = []; for (let k = 0; k < 10; k++) { const a = k / 10 * TAU; P10.push([Math.cos(a) * rr[k] * mul, Math.sin(a) * rr[k] * mul]); }
            g.moveTo((P10[9][0] + P10[0][0]) / 2, (P10[9][1] + P10[0][1]) / 2);
            for (let k = 0; k < 10; k++) { const n2 = P10[(k + 1) % 10]; g.quadraticCurveTo(P10[k][0], P10[k][1], (P10[k][0] + n2[0]) / 2, (P10[k][1] + n2[1]) / 2); }
            g.closePath();
          };
          g.fillStyle = 'rgba(20,44,34,0.7)'; edge(1.14); g.fill();     // ıslak kıyı
          g.fillStyle = '#0b2f2c'; edge(1); g.fill();
          const vg = g.createRadialGradient(-r * 0.3, -r * 0.35, 4, 0, 0, r);
          vg.addColorStop(0, 'rgba(96,240,205,0.3)'); vg.addColorStop(0.7, 'rgba(50,160,140,0.08)'); vg.addColorStop(1, 'rgba(0,0,0,0)');
          g.fillStyle = vg; edge(1); g.fill();
          g.strokeStyle = 'rgba(120,250,212,0.34)'; g.lineWidth = 2.2; edge(1); g.stroke();
          g.strokeStyle = 'rgba(170,255,230,0.25)'; g.lineWidth = 1;
          g.beginPath(); g.moveTo(-r * 0.5, -r * 0.1); g.lineTo(-r * 0.05, -r * 0.1); g.moveTo(r * 0.08, r * 0.3); g.lineTo(r * 0.52, r * 0.3); g.stroke();
          for (const [ox, oy, pr, pa, hasFlower] of pads) {
            g.save(); g.translate(ox, oy);
            g.fillStyle = 'rgba(58,124,72,0.9)';
            g.beginPath(); g.moveTo(0, 0); g.arc(0, 0, pr, pa + 0.6, pa + 6.1); g.closePath(); g.fill();
            g.fillStyle = 'rgba(130,210,140,0.4)';
            g.beginPath(); g.moveTo(0, 0); g.arc(0, 0, pr * 0.66, pa + 0.6, pa + 6.1); g.closePath(); g.fill();
            if (hasFlower) { g.fillStyle = 'rgba(255,170,200,0.85)'; g.beginPath(); g.arc(pr * 0.2, -pr * 0.2, 3, 0, TAU); g.fill(); }
            g.restore();
          }
          g.restore();
        });
      }
      /* sazlar + eğrelti tutamları */
      for (let i = 0; i < 30; i++) {
        const x = rnd() * T, y = rnd() * T, s = 0.9 + rnd() * 1;
        const blades = [];
        for (let b = 0; b < 4; b++) blades.push([(b - 1.5) * 1.4, 14 + rnd() * 10, rnd() * 1.4 - 0.7]);
        wrap(() => {
          g.lineWidth = 1.8; g.lineCap = 'round';
          for (const bl of blades) {
            g.strokeStyle = bl[1] > 19 ? 'rgba(118,178,110,0.55)' : 'rgba(84,140,86,0.5)';
            g.beginPath(); g.moveTo(x, y);
            g.quadraticCurveTo(x + bl[0] * 3 * s + bl[2] * 4, y - bl[1] * 0.6 * s, x + bl[0] * 5 * s + bl[2] * 8, y - bl[1] * s);
            g.stroke();
          }
          g.lineCap = 'butt';
        });
      }
      /* ateşböcekleri + sporlar */
      for (let i = 0; i < 16; i++) {
        const x = rnd() * T, y = rnd() * T, warm = rnd() < 0.4;
        soft(x, y, 9, warm ? 'rgba(255,220,120,0.5)' : 'rgba(120,255,215,0.45)');
        wrap(() => { g.fillStyle = warm ? 'rgba(255,240,180,0.95)' : 'rgba(200,255,240,0.9)'; g.beginPath(); g.arc(x, y, 1.5, 0, TAU); g.fill(); });
      }
      /* kök kıvrımları */
      for (let i = 0; i < 7; i++) {
        const x = rnd() * T, y = rnd() * T, len = 40 + rnd() * 60, a = rnd() * TAU, bend = (rnd() - 0.5) * 60;
        wrap(() => {
          g.strokeStyle = 'rgba(52,40,30,0.55)'; g.lineWidth = 4.5; g.lineCap = 'round';
          g.beginPath(); g.moveTo(x, y);
          g.quadraticCurveTo(x + Math.cos(a) * len * 0.5 + bend * 0.3, y + Math.sin(a) * len * 0.5 - Math.abs(bend) * 0.2, x + Math.cos(a) * len, y + Math.sin(a) * len);
          g.stroke();
          g.strokeStyle = 'rgba(120,96,70,0.28)'; g.lineWidth = 1.6;
          g.beginPath(); g.moveTo(x, y - 1);
          g.quadraticCurveTo(x + Math.cos(a) * len * 0.5 + bend * 0.3, y - 1 + Math.sin(a) * len * 0.5 - Math.abs(bend) * 0.2, x + Math.cos(a) * len, y - 1 + Math.sin(a) * len);
          g.stroke(); g.lineCap = 'butt';
        });
      }
    } else if (style === 'katedral') {
      /* ═ KIZIL NEF: koyu mermer + altın derz + madalyonlar + vitray ışığı ═ */
      g.fillStyle = '#181022';
      g.fillRect(0, 0, T, T);
      const Q = T / 4;
      for (let ix = 0; ix < 4; ix++) for (let iy = 0; iy < 4; iy++) {
        g.fillStyle = (ix + iy) % 2 === 0 ? '#211737' : '#150e20';
        g.fillRect(ix * Q, iy * Q, Q, Q);
        /* mermer damarları */
        g.strokeStyle = 'rgba(205,195,225,0.06)'; g.lineWidth = 1.2;
        for (let v = 0; v < 3; v++) {
          const mx = ix * Q + rnd() * Q, my = iy * Q + rnd() * Q;
          g.beginPath(); g.moveTo(mx, my);
          g.quadraticCurveTo(mx + (rnd() - 0.5) * 60, my + (rnd() - 0.5) * 60, mx + (rnd() - 0.5) * 110, my + (rnd() - 0.5) * 110);
          g.stroke();
        }
        /* karo iç gölgesi (hafif kabartma) */
        g.strokeStyle = 'rgba(0,0,0,0.3)'; g.lineWidth = 3;
        g.strokeRect(ix * Q + 1.5, iy * Q + 1.5, Q - 3, Q - 3);
      }
      /* altın derzler: parıltı + çizgi */
      g.beginPath();
      for (let k = 0; k <= 4; k++) { g.moveTo(0, k * Q + 0.5); g.lineTo(T, k * Q + 0.5); g.moveTo(k * Q + 0.5, 0); g.lineTo(k * Q + 0.5, T); }
      g.strokeStyle = 'rgba(255,214,130,0.1)'; g.lineWidth = 7; g.stroke();
      g.strokeStyle = 'rgba(224,178,92,0.5)'; g.lineWidth = 2; g.stroke();
      g.strokeStyle = 'rgba(255,240,190,0.25)'; g.lineWidth = 0.8; g.stroke();
      /* madalyon: merkez (büyük) + köşeler (sarmalla dört köşeye tam oturur) */
      const medallion = (x, y, r) => wrap(() => {
        g.save(); g.translate(x, y);
        const bg = g.createRadialGradient(0, 0, 2, 0, 0, r);
        bg.addColorStop(0, 'rgba(140,30,50,0.22)'); bg.addColorStop(0.7, 'rgba(90,20,40,0.08)'); bg.addColorStop(1, 'rgba(0,0,0,0)');
        g.fillStyle = bg; g.beginPath(); g.arc(0, 0, r, 0, TAU); g.fill();
        g.strokeStyle = 'rgba(224,178,92,0.55)'; g.lineWidth = 3;
        g.beginPath(); g.arc(0, 0, r, 0, TAU); g.stroke();
        g.strokeStyle = 'rgba(224,178,92,0.3)'; g.lineWidth = 1.4;
        g.beginPath(); g.arc(0, 0, r * 0.84, 0, TAU); g.stroke();
        g.beginPath(); g.arc(0, 0, r * 0.5, 0, TAU); g.stroke();
        for (let k = 0; k < 16; k++) {
          const a = k / 16 * TAU;
          g.beginPath(); g.moveTo(Math.cos(a) * r * 0.84, Math.sin(a) * r * 0.84); g.lineTo(Math.cos(a) * r, Math.sin(a) * r); g.stroke();
        }
        /* gül motifi */
        g.strokeStyle = 'rgba(212,90,120,0.4)'; g.lineWidth = 1.6;
        for (let k = 0; k < 8; k++) {
          const a = k / 8 * TAU;
          g.beginPath();
          g.ellipse(Math.cos(a) * r * 0.28, Math.sin(a) * r * 0.28, r * 0.16, r * 0.07, a, 0, TAU);
          g.stroke();
        }
        g.fillStyle = 'rgba(255,80,100,0.6)'; g.beginPath(); g.arc(0, 0, 5, 0, TAU); g.fill();
        g.strokeStyle = 'rgba(255,170,180,0.6)'; g.lineWidth = 1.2; g.beginPath(); g.arc(0, 0, 5, 0, TAU); g.stroke();
        g.restore();
      });
      medallion(T / 2, T / 2, 150);
      medallion(0, 0, 105);
      /* karo elmas kakmaları (madalyonsuz karolara) */
      for (let ix = 0; ix < 4; ix++) for (let iy = 0; iy < 4; iy++) {
        if ((ix + iy) % 2) continue;
        const cx2 = ix * Q + Q / 2, cy2 = iy * Q + Q / 2;
        if (Math.hypot(cx2 - T / 2, cy2 - T / 2) < 170) continue;
        const d = Q * 0.2;
        g.strokeStyle = 'rgba(155,108,255,0.28)'; g.lineWidth = 1.6;
        g.beginPath(); g.moveTo(cx2, cy2 - d); g.lineTo(cx2 + d, cy2); g.lineTo(cx2, cy2 + d); g.lineTo(cx2 - d, cy2); g.closePath(); g.stroke();
        g.strokeStyle = 'rgba(155,108,255,0.14)';
        g.beginPath(); g.moveTo(cx2, cy2 - d * 0.55); g.lineTo(cx2 + d * 0.55, cy2); g.lineTo(cx2, cy2 + d * 0.55); g.lineTo(cx2 - d * 0.55, cy2); g.closePath(); g.stroke();
        g.fillStyle = 'rgba(224,80,110,0.4)'; g.beginPath(); g.arc(cx2, cy2, 3, 0, TAU); g.fill();
      }
      /* vitray ışık gölleri */
      for (let i = 0; i < 3; i++) {
        const x = rnd() * T, y = rnd() * T;
        soft(x, y, 90, 'rgba(212,72,124,0.14)');
        soft(x + 30, y + 20, 70, 'rgba(120,60,220,0.1)');
      }
      /* mum ışığı gölcükleri + damlalar */
      for (let i = 0; i < 5; i++) {
        const x = rnd() * T, y = rnd() * T, r = 3 + rnd() * 3.4;
        soft(x, y, 26, 'rgba(255,190,90,0.13)');
        wrap(() => { g.fillStyle = 'rgba(244,228,192,0.4)'; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); });
      }
    } else if (style === 'hiclik') {
      /* ═ YILDIZ DENİZİ: bulutsu, yıldız kümeleri, dev rün çemberi, obsidyen kırıklar ═ */
      g.fillStyle = '#0b081c';
      g.fillRect(0, 0, T, T);
      const hues = ['rgba(112,64,224,0.2)', 'rgba(210,64,160,0.13)', 'rgba(64,96,255,0.16)', 'rgba(90,40,180,0.18)'];
      for (let i = 0; i < 8; i++)
        soft(rnd() * T, rnd() * T, 120 + rnd() * 180, hues[i % 4]);
      for (let i = 0; i < 4; i++)
        soft(rnd() * T, rnd() * T, 60 + rnd() * 60, 'rgba(8,5,18,0.6)');
      /* yıldız tozu (küme eğilimli) */
      for (let cl = 0; cl < 8; cl++) {
        const cx2 = rnd() * T, cy2 = rnd() * T, spread = 40 + rnd() * 80, n = 8 + (rnd() * 10 | 0);
        for (let i = 0; i < n; i++) {
          const x = cx2 + (rnd() - 0.5) * spread * 2, y = cy2 + (rnd() - 0.5) * spread * 2;
          const s2 = 0.7 + rnd() * 1.8, al = 0.15 + rnd() * 0.45;
          wrap(() => { g.fillStyle = 'rgba(226,220,255,' + al.toFixed(2) + ')'; g.fillRect(x, y, s2, s2); });
        }
      }
      /* parlak çapraz yıldızlar */
      for (let i = 0; i < 9; i++) {
        const x = rnd() * T, y = rnd() * T, r = 3.5 + rnd() * 4;
        soft(x, y, r * 2.4, 'rgba(180,160,255,0.35)');
        wrap(() => {
          g.strokeStyle = 'rgba(240,235,255,0.7)'; g.lineWidth = 1;
          g.beginPath(); g.moveTo(x - r, y); g.lineTo(x + r, y); g.moveTo(x, y - r); g.lineTo(x, y + r); g.stroke();
          g.fillStyle = 'rgba(255,255,255,0.9)'; g.fillRect(x - 0.9, y - 0.9, 1.8, 1.8);
        });
      }
      /* dev rün çemberi (merkez) — düşük parlaklık, zarif */
      const RC = T / 2, rcR = 190;
      const glyphs = [];
      for (let k = 0; k < 10; k++) { const a = k / 10 * TAU; glyphs.push([a, rnd() * TAU, 5 + rnd() * 4]); }
      wrap(() => {
        g.save(); g.translate(RC, RC);
        g.strokeStyle = 'rgba(186,160,255,0.3)'; g.lineWidth = 2.2;
        g.beginPath(); g.arc(0, 0, rcR, 0, TAU); g.stroke();
        g.strokeStyle = 'rgba(186,160,255,0.2)'; g.lineWidth = 1.2;
        g.beginPath(); g.arc(0, 0, rcR * 0.88, 0, TAU); g.stroke();
        g.beginPath(); g.arc(0, 0, rcR * 0.45, 0, TAU); g.stroke();
        /* iç yıldız çokgeni */
        g.strokeStyle = 'rgba(150,120,240,0.16)'; g.lineWidth = 1;
        g.beginPath();
        for (let k = 0; k <= 5; k++) { const a = (k * 2 % 5) / 5 * TAU - 1.5708; const px2 = Math.cos(a) * rcR * 0.45, py2 = Math.sin(a) * rcR * 0.45; k ? g.lineTo(px2, py2) : g.moveTo(px2, py2); }
        g.stroke();
        for (const [a, ga, gs] of glyphs) {
          const gx = Math.cos(a) * rcR * 0.94, gy = Math.sin(a) * rcR * 0.94;
          g.save(); g.translate(gx, gy); g.rotate(ga);
          g.strokeStyle = 'rgba(212,190,255,0.5)'; g.lineWidth = 1.4;
          g.beginPath(); g.moveTo(-gs, 0); g.lineTo(gs, 0); g.moveTo(0, -gs); g.lineTo(gs * 0.4, gs); g.stroke();
          g.restore();
        }
        g.restore();
      });
      soft(RC, RC, rcR * 0.5, 'rgba(130,90,255,0.12)');
      /* obsidyen kırık adaları */
      for (let i = 0; i < 6; i++) {
        const x = rnd() * T, y = rnd() * T, r = 30 + rnd() * 40, a0 = rnd() * 3, sides = 5;
        const rr = []; for (let k = 0; k < sides; k++) rr.push(r * (0.6 + rnd() * 0.6));
        if (Math.hypot(x - RC, y - RC) < rcR + r) continue;
        wrap(() => {
          g.save(); g.translate(x, y); g.rotate(a0);
          g.fillStyle = 'rgba(0,0,0,0.45)';
          g.beginPath(); for (let k = 0; k < sides; k++) { const a = k / sides * TAU; k ? g.lineTo(Math.cos(a) * rr[k] + 4, Math.sin(a) * rr[k] * 0.8 + 5) : g.moveTo(Math.cos(a) * rr[k] + 4, Math.sin(a) * rr[k] * 0.8 + 5); } g.closePath(); g.fill();
          g.fillStyle = '#251c40';
          g.beginPath(); for (let k = 0; k < sides; k++) { const a = k / sides * TAU; k ? g.lineTo(Math.cos(a) * rr[k], Math.sin(a) * rr[k] * 0.8) : g.moveTo(Math.cos(a) * rr[k], Math.sin(a) * rr[k] * 0.8); } g.closePath(); g.fill();
          g.strokeStyle = 'rgba(154,127,255,0.5)'; g.lineWidth = 1.8; g.stroke();
          g.strokeStyle = 'rgba(200,180,255,0.2)'; g.lineWidth = 1;
          g.beginPath(); g.moveTo(-rr[0] * 0.4, -rr[1] * 0.3); g.lineTo(rr[2] * 0.4, rr[3] * 0.35); g.stroke();
          g.restore();
        });
      }
    } else if (style === 'gokada') {
      /* ═ GÖKÇE ADA: yıldırım çarpmış kırık taş — mor/camgöbeği ışıyan
         çatlaklar, közlenmiş kıvılcım benekleri (referans konsepti) ═ */
      g.fillStyle = '#2b2028';
      g.fillRect(0, 0, T, T);
      for (let i = 0; i < 14; i++)
        soft(rnd() * T, rnd() * T, 150 + rnd() * 190,
          i % 3 === 0 ? 'rgba(78,56,44,0.42)' : (i % 3 === 1 ? 'rgba(18,12,24,0.5)' : 'rgba(56,40,60,0.4)'));
      /* kırık taş panelleri — sarsılmış ızgara, eşit dağılım */
      const cellsG = 5, cwG = T / cellsG;
      for (let ci = 0; ci < cellsG * cellsG; ci++) {
        const x = (ci % cellsG + 0.5) * cwG + (rnd() - 0.5) * 90;
        const y = ((ci / cellsG | 0) + 0.5) * cwG + (rnd() - 0.5) * 90;
        const r = 52 + rnd() * 48, a0 = rnd() * 3, sides = 5 + (rnd() * 2 | 0);
        const rr = []; for (let k = 0; k < sides; k++) rr.push(r * (0.7 + rnd() * 0.45));
        wrap(() => {
          g.save(); g.translate(x, y); g.rotate(a0);
          const poly = (mul, oy) => {
            g.beginPath();
            for (let k = 0; k < sides; k++) {
              const a = k / sides * TAU;
              const px2 = Math.cos(a) * rr[k] * mul, py2 = Math.sin(a) * rr[k] * 0.84 * mul + oy;
              k ? g.lineTo(px2, py2) : g.moveTo(px2, py2);
            }
            g.closePath();
          };
          g.fillStyle = 'rgba(0,0,0,0.4)'; poly(1, 6); g.fill();
          g.fillStyle = '#332632'; poly(1, 0); g.fill();
          g.strokeStyle = 'rgba(186,140,255,0.07)'; g.lineWidth = 2.4; g.stroke();
          g.fillStyle = 'rgba(255,255,255,0.035)'; poly(0.56, -r * 0.14); g.fill();
          g.restore();
        });
      }
      /* ışıyan yıldırım çatlakları: karo kenarında aynı noktada başlayıp biten
         kırıklı hatlar → tekrar ederken kesintisiz akar; üzerine dallar */
      const jagPath = (x0, y0, x1, y1, seg, amp) => {
        const pts = [[x0, y0]];
        for (let k = 1; k < seg; k++) {
          const tt = k / seg;
          pts.push([x0 + (x1 - x0) * tt + (rnd() - 0.5) * amp * 0.35,
                    y0 + (y1 - y0) * tt + (rnd() - 0.5) * amp]);
        }
        pts.push([x1, y1]);
        return pts;
      };
      const strokeVein = (pts, w, col, blur, glowCol) => wrap(() => {
        g.save();
        if (blur) { g.shadowColor = glowCol; g.shadowBlur = blur; }
        g.strokeStyle = col; g.lineWidth = w; g.lineCap = 'round'; g.lineJoin = 'round';
        g.beginPath(); g.moveTo(pts[0][0], pts[0][1]);
        for (let k = 1; k < pts.length; k++) g.lineTo(pts[k][0], pts[k][1]);
        g.stroke(); g.restore();
      });
      const veins = [];
      for (let vi = 0; vi < 2; vi++) {
        const y0 = (vi === 0 ? 0.26 : 0.72) * T + (rnd() - 0.5) * 60;
        veins.push(jagPath(0, y0, T, y0, 9, 150));
      }
      const x0v = 0.52 * T + (rnd() - 0.5) * 80;
      veins.push(jagPath(x0v, 0, x0v, T, 9, 150));
      const branches = [];
      for (const pts of veins) {
        const nb = 3 + (rnd() * 3 | 0);
        for (let b = 0; b < nb; b++) {
          const k = 1 + (rnd() * (pts.length - 2) | 0);
          const bx = pts[k][0], by = pts[k][1];
          const ang = rnd() * TAU, len = 60 + rnd() * 120;
          branches.push(jagPath(bx, by, bx + Math.cos(ang) * len, by + Math.sin(ang) * len, 5, 46));
        }
      }
      for (const pts of veins.concat(branches)) {
        const w = veins.indexOf(pts) >= 0 ? 1 : 0.6;
        strokeVein(pts, 13 * w, 'rgba(22,10,32,0.95)', 0, '');
        strokeVein(pts, 7 * w, 'rgba(150,64,255,0.55)', 16, 'rgba(170,90,255,0.85)');
        strokeVein(pts, 3.4 * w, 'rgba(206,150,255,0.75)', 0, '');
        strokeVein(pts, 1.4 * w, 'rgba(178,244,255,0.85)', 0, '');
      }
      /* közlenmiş kıvılcım benekleri — referanstaki sıcak aksan */
      for (let i = 0; i < 26; i++) {
        const x = rnd() * T, y = rnd() * T;
        soft(x, y, 8 + rnd() * 8, 'rgba(255,132,54,0.22)');
        wrap(() => {
          g.save(); g.translate(x, y); g.rotate(rnd() * TAU); g.scale(1, 2.1);
          g.fillStyle = 'rgba(255,168,92,0.8)';
          g.beginPath(); g.arc(0, 0, 1.5 + rnd() * 1.1, 0, TAU); g.fill();
          g.restore();
        });
      }
      g.fillStyle = 'rgba(214,198,236,0.05)';
      for (let i = 0; i < 70; i++) g.fillRect(rnd() * T, rnd() * T, 1 + rnd() * 2.2, 1 + rnd() * 2.2);
    } else if (style === 'mezarlik') {
      /* ═ SOLGUN MEZARLIK: soğuk, nemli mezar toprağı ═
         Eskiden bu dünya, genel "ay ışığı toprağı" karosunu kullanıyordu:
         sıcak kahve zemin + papatya + ateşböceği + çimen. Bir mezarlıktan
         çok bir çayır gibi okunuyordu. Yeni karo aynı üretim mantığını
         (3×3 sarmal ile dikişsiz, tek seferde pişirilir) korur ama dili
         değişir: çökmüş mezar çukurları, yosunlu kırık kapak taşları,
         kemik döküntüsü, ölü ot, kurumuş kan ve yerden sızan soluk
         hayalet ışığı.
         TON KARARI: taban orta-koyu ve SOĞUK. Daha da karartmak korkutucu
         değil, sadece okunmaz olurdu — düşmanlar da koyu figürler.
         Karanlık hissi zaten vinyet + kızıl ay perdesi + alçak sis
         bankları ile (bkz. arena pişirme) veriliyor. */
      g.fillStyle = '#22262c';
      g.fillRect(0, 0, T, T);
      /* makro lekeler: çamur, kül grisi, yosun, kurumuş kan */
      for (let i = 0; i < 20; i++) {
        const k = i & 3;
        soft(rnd() * T, rnd() * T, 120 + rnd() * 190,
          k === 0 ? 'rgba(10,12,16,0.55)' :
          k === 1 ? 'rgba(48,54,62,0.38)' :
          k === 2 ? 'rgba(56,70,58,0.20)' : 'rgba(74,28,30,0.14)');
      }

      /* ── çökmüş mezar çukurları: karonun ana motifi ──
         BİÇİM KARARI: yuvarlatılmış dikdörtgen (iki deneme) zeminde
         "telefon ekranı" gibi okunuyordu — kusursuz geometri kazılmış
         toprakla bağdaşmıyor. Höyük artık üç bindirmiş elipsin birleşimi
         (uzun, şişkin, kenarları düzensiz) + çevresine serpilmiş toprak
         kümeleri. Kontrast düşük: taban tonundan bir tık ayrışır. */
      for (let i = 0; i < 4; i++) {
        const x = rnd() * T, y = rnd() * T;
        const w = 96 + rnd() * 40, h = 166 + rnd() * 56, a = (rnd() - 0.5) * 0.8;
        const lob = [];
        for (let k = 0; k < 4; k++)
          lob.push([(rnd() - 0.5) * w * 0.1, (k / 3 - 0.5) * h * 0.5, 0.94 + rnd() * 0.14]);
        const marks = [];
        for (let k = 1; k < 6; k++) marks.push([k, (rnd() - 0.5) * 8, 0.72 + rnd() * 0.2]);
        const clumps = [];
        for (let k = 0; k < 22; k++) clumps.push([rnd() * TAU, 0.44 + rnd() * 0.2, 2.5 + rnd() * 7, rnd()]);
        soft(x, y, Math.max(w, h) * 0.85, 'rgba(8,10,12,0.36)');
        wrap(() => {
          g.save(); g.translate(x, y); g.rotate(a);
          /* kabarmış toprak: bindirmiş elipsler */
          g.fillStyle = '#2a2d2e';
          for (const [ox, oy, sc] of lob) {
            g.beginPath(); g.ellipse(ox, oy, w * 0.5 * sc, h * 0.3 * sc, 0, 0, TAU); g.fill();
          }
          /* çökmüş, nemli orta */
          g.fillStyle = '#1b1d1d';
          for (const [ox, oy, sc] of lob) {
            g.beginPath(); g.ellipse(ox * 0.7, oy * 0.92, w * 0.38 * sc, h * 0.2 * sc, 0, 0, TAU); g.fill();
          }
          g.fillStyle = 'rgba(46,41,32,0.26)';
          g.beginPath(); g.ellipse(0, -h * 0.12, w * 0.3, h * 0.2, 0, 0, TAU); g.fill();
          /* kürek izleri: höyüğü enine tarar */
          g.strokeStyle = 'rgba(9,10,11,0.4)'; g.lineWidth = 2.1; g.lineCap = 'round';
          for (const [k, jt, sp] of marks) {
            const yy = -h * 0.34 + (h * 0.68 / 6) * k;
            g.beginPath();
            g.moveTo(-w * 0.38 * sp, yy + jt * 0.3);
            g.quadraticCurveTo(0, yy + jt, w * 0.38 * sp, yy + jt * 0.5);
            g.stroke();
          }
          g.lineCap = 'butt';
          /* çevre toprak kümeleri: silueti kırar */
          for (const [ca, cr, cs, ct] of clumps) {
            const cx3 = Math.cos(ca) * w * cr * 1.2, cy3 = Math.sin(ca) * h * cr * 0.92;
            g.fillStyle = ct > 0.5 ? 'rgba(42,46,47,0.9)' : 'rgba(19,21,22,0.85)';
            g.beginPath(); g.ellipse(cx3, cy3, cs, cs * 0.7, ca, 0, TAU); g.fill();
          }
          g.restore();
        });
      }

      /* ── yatık kapak taşları: yarı gömülü, yosunlu, mat ──
         Parlaklık düşürüldü: ilk denemede zeminde duran beyaz etiketler
         gibi sıçrıyordu. Artık üst kenarı toprakla örtülü, mat gri taş. */
      for (let i = 0; i < 8; i++) {
        const x = rnd() * T, y = rnd() * T;
        const w = 46 + rnd() * 44, h = 34 + rnd() * 30, a = (rnd() - 0.5) * 1.3;
        const crack = [rnd(), rnd(), rnd()];
        const mossy = rnd() < 0.7;
        const soilLip = 4 + rnd() * 5;
        wrap(() => {
          g.save(); g.translate(x, y); g.rotate(a);
          g.fillStyle = 'rgba(0,0,0,0.42)';
          g.beginPath(); g.roundRect(-w / 2 + 3, -h / 2 + 4, w, h, 7); g.fill();
          g.fillStyle = '#43484f';
          g.beginPath(); g.roundRect(-w / 2, -h / 2, w, h, 7); g.fill();
          g.fillStyle = 'rgba(104,112,124,0.35)';
          g.beginPath(); g.roundRect(-w / 2 + 3, -h / 2 + 3, w - 6, h * 0.3, 6); g.fill();
          /* kazınmış hatlar + çatlak */
          g.strokeStyle = 'rgba(16,18,21,0.55)'; g.lineWidth = 1.5;
          g.beginPath(); g.moveTo(-w * 0.26, -h * 0.08); g.lineTo(w * 0.26, -h * 0.06); g.stroke();
          g.beginPath(); g.moveTo(-w * 0.18, h * 0.14); g.lineTo(w * 0.14, h * 0.16); g.stroke();
          g.lineWidth = 1.1;
          g.beginPath();
          g.moveTo(-w / 2 + crack[0] * w * 0.3, -h / 2);
          g.lineTo(-w * 0.05 + crack[1] * 8, h * 0.05);
          g.lineTo(w / 2 - crack[2] * w * 0.28, h / 2);
          g.stroke();
          if (mossy) {
            g.fillStyle = 'rgba(64,92,70,0.30)';
            g.beginPath(); g.ellipse(-w * 0.28, h * 0.24, w * 0.22, h * 0.17, 0, 0, TAU); g.fill();
            g.beginPath(); g.ellipse(w * 0.3, -h * 0.28, w * 0.13, h * 0.12, 0, 0, TAU); g.fill();
          }
          /* toprak dudağı: taşın bir kenarını yutar (yarı gömülü hissi) */
          g.fillStyle = 'rgba(30,33,35,0.95)';
          g.beginPath(); g.ellipse(-w * 0.1, h / 2 - 1, w * 0.62, soilLip, 0, 0, TAU); g.fill();
          g.fillStyle = 'rgba(24,26,28,0.7)';
          g.beginPath(); g.ellipse(w / 2 - 2, h * 0.1, soilLip * 0.8, h * 0.4, 0, 0, TAU); g.fill();
          g.restore();
        });
      }

      /* ── kemik döküntüsü: uzun kemik + kaburga çifti + kafatası ── */
      for (let i = 0; i < 10; i++) {
        const x = rnd() * T, y = rnd() * T, a = rnd() * TAU;
        const kind = rnd();
        wrap(() => {
          g.save(); g.translate(x, y); g.rotate(a);
          g.fillStyle = 'rgba(0,0,0,0.4)';
          if (kind < 0.45) {
            /* uyluk kemiği: iki topuzlu mil */
            g.beginPath(); g.roundRect(-9, 0.5, 18, 3.4, 2); g.fill();
            g.fillStyle = 'rgba(196,198,186,0.62)';
            g.beginPath(); g.roundRect(-9, -1, 18, 3.4, 2); g.fill();
            g.beginPath(); g.arc(-9, 0.7, 2.6, 0, TAU); g.arc(9, 0.7, 2.6, 0, TAU); g.fill();
            g.fillStyle = 'rgba(255,255,255,0.16)';
            g.beginPath(); g.roundRect(-8, -0.9, 16, 1.2, 1); g.fill();
          } else if (kind < 0.8) {
            /* kaburga yayları */
            g.strokeStyle = 'rgba(188,190,178,0.5)'; g.lineWidth = 1.7; g.lineCap = 'round';
            for (let k = 0; k < 3; k++) {
              g.beginPath();
              g.moveTo(-7 + k * 2.2, -5);
              g.quadraticCurveTo(2 + k * 1.6, 0, -6 + k * 2.2, 6);
              g.stroke();
            }
            g.lineCap = 'butt';
          } else {
            /* yarı gömülü kafatası */
            g.beginPath(); g.ellipse(0.8, 1.4, 5.4, 4.6, 0, 0, TAU); g.fill();
            g.fillStyle = 'rgba(204,204,192,0.62)';
            g.beginPath(); g.ellipse(0, 0, 5.2, 4.4, 0, 0, TAU); g.fill();
            g.fillStyle = 'rgba(14,14,16,0.75)';
            g.beginPath(); g.ellipse(-1.9, -0.4, 1.5, 1.2, 0, 0, TAU); g.fill();
            g.beginPath(); g.ellipse(1.9, -0.4, 1.5, 1.2, 0, 0, TAU); g.fill();
            g.fillStyle = 'rgba(14,14,16,0.55)';
            g.fillRect(-1.4, 2.2, 2.8, 1.5);
          }
          g.restore();
        });
      }

      /* ── ölü ot öbekleri: soluk, kırılmış, aşağı bakan ── */
      for (let i = 0; i < 54; i++) {
        const x = rnd() * T, y = rnd() * T, s = 0.75 + rnd() * 0.8;
        const blades = [];
        for (let b = 0; b < 3; b++) blades.push([(b - 1) * 2.2, 7 + rnd() * 5, (rnd() - 0.5) * 1.2]);
        wrap(() => {
          g.lineWidth = 1.5; g.lineCap = 'round';
          for (const bl of blades) {
            g.strokeStyle = 'rgba(122,124,98,0.42)';
            g.beginPath(); g.moveTo(x, y);
            g.quadraticCurveTo(x + bl[0] * 1.6 * s, y - bl[1] * 0.5 * s,
                               x + (bl[0] + bl[2] * 3) * 2.4 * s, y - bl[1] * 0.72 * s);
            g.stroke();
          }
          g.lineCap = 'butt';
        });
      }

      /* ── çakıl + toprak kırıntısı (soğuk tonlar) ── */
      for (let i = 0; i < 64; i++) {
        const x = rnd() * T, y = rnd() * T, r = 1.5 + rnd() * 3.2, a0 = rnd() * TAU;
        const tone = rnd() > 0.5 ? '#5d636d' : '#464b54';
        wrap(() => {
          g.save(); g.translate(x, y); g.rotate(a0);
          g.fillStyle = 'rgba(0,0,0,0.38)'; g.beginPath(); g.ellipse(0.8, 1, r, r * 0.8, 0, 0, TAU); g.fill();
          g.fillStyle = tone; g.beginPath(); g.ellipse(0, 0, r, r * 0.8, 0, 0, TAU); g.fill();
          g.fillStyle = 'rgba(206,222,240,0.14)'; g.beginPath(); g.ellipse(-r * 0.25, -r * 0.3, r * 0.5, r * 0.36, 0, 0, TAU); g.fill();
          g.restore();
        });
      }

      /* ── toprak çatlakları: kurumuş, soğuk gri kenarlı ── */
      for (let i = 0; i < 10; i++) {
        const x = rnd() * T, y = rnd() * T, a0 = rnd() * TAU, len = 60 + rnd() * 90;
        const segs = []; let cx2 = x, cy2 = y, ca = a0;
        for (let k2 = 0; k2 < 4; k2++) { const l2 = len / 4; cx2 += Math.cos(ca) * l2; cy2 += Math.sin(ca) * l2; ca += (rnd() - 0.5) * 1; segs.push([cx2, cy2]); }
        wrap(() => {
          g.strokeStyle = 'rgba(8,9,11,0.55)'; g.lineWidth = 2.4; g.lineCap = 'round';
          g.beginPath(); g.moveTo(x, y); for (const [sx, sy] of segs) g.lineTo(sx, sy); g.stroke();
          g.strokeStyle = 'rgba(126,138,150,0.18)'; g.lineWidth = 0.9;
          g.beginPath(); g.moveTo(x + 1.4, y + 1.4); for (const [sx, sy] of segs) g.lineTo(sx + 1.4, sy + 1.4); g.stroke();
          g.lineCap = 'butt';
        });
      }

      /* ── kurumuş kan lekeleri: koyu, mat, dağınık ──
         Doygun kırmızı benekler zeminde neon gibi duruyordu; kurumuş kan
         neredeyse kahverengi-siyahtır ve kenardan zemine karışır. */
      for (let i = 0; i < 6; i++) {
        const x = rnd() * T, y = rnd() * T, r = 16 + rnd() * 26;
        const lobes = [];
        for (let k = 0; k < 6; k++) lobes.push([(rnd() - 0.5) * r * 1.7, (rnd() - 0.5) * r * 1.4, r * (0.28 + rnd() * 0.4)]);
        soft(x, y, r * 2.1, 'rgba(58,14,16,0.16)');
        wrap(() => {
          g.fillStyle = 'rgba(44,12,14,0.30)';
          for (const [dx2, dy2, dr] of lobes) { g.beginPath(); g.ellipse(x + dx2, y + dy2, dr, dr * 0.76, dx2, 0, TAU); g.fill(); }
          g.fillStyle = 'rgba(30,8,10,0.34)';
          g.beginPath(); g.ellipse(x, y, r * 0.55, r * 0.42, 0, 0, TAU); g.fill();
        });
      }

      /* ── hayalet ışığı: yerden sızan soluk mavi-yeşil zerreler ──
         (Eski karonun papatya/ateşböceği aksanlarının yerini alır: aynı
         "gözü gezdiren küçük parlak nokta" işlevi, korkutucu tonda.) */
      for (let i = 0; i < 11; i++) {
        const x = rnd() * T, y = rnd() * T;
        soft(x, y, 16 + rnd() * 14, 'rgba(126,214,198,0.16)');
        wrap(() => {
          g.fillStyle = 'rgba(186,240,226,0.5)';
          g.beginPath(); g.arc(x, y, 1.5, 0, TAU); g.fill();
          g.fillStyle = 'rgba(186,240,226,0.22)';
          g.beginPath(); g.arc(x, y, 3.2, 0, TAU); g.fill();
        });
      }

      /* ── ince benek dokusu: pürüzsüz zemin "boş" görünüyordu ── */
      for (let i = 0; i < 900; i++) {
        const x = rnd() * T, y = rnd() * T, sp = rnd();
        g.fillStyle = sp < 0.45 ? 'rgba(8,9,11,0.30)' : (sp < 0.8 ? 'rgba(126,138,148,0.10)' : 'rgba(150,132,96,0.09)');
        g.fillRect(x, y, 1 + rnd() * 2.2, 1 + rnd() * 2);
      }

      /* ── soğuk sis gölcükleri (makro yumuşatma) ── */
      for (let i = 0; i < 6; i++)
        soft(rnd() * T, rnd() * T, 100 + rnd() * 110, 'rgba(158,178,198,0.07)');
    } else {
      /* ═ AY IŞIĞI TOPRAĞI: sıcak basılmış toprak — çatlaklar, çakıl, çimen öbekleri ═ */
      g.fillStyle = '#40301f';
      g.fillRect(0, 0, T, T);
      for (let i = 0; i < 16; i++)
        soft(rnd() * T, rnd() * T, 130 + rnd() * 170, i % 3 === 0 ? 'rgba(98,72,44,0.42)' : (i % 3 === 1 ? 'rgba(22,15,9,0.5)' : 'rgba(74,56,36,0.42)'));
      /* taş döşeme adaları: 3 küme, her biri 4-6 yassı taş */
      for (let cl = 0; cl < 3; cl++) {
        const cx2 = rnd() * T, cy2 = rnd() * T, n = 4 + (rnd() * 3 | 0);
        for (let i = 0; i < n; i++) {
          const x = cx2 + (rnd() - 0.5) * 130, y = cy2 + (rnd() - 0.5) * 110;
          const w = 34 + rnd() * 30, h = 24 + rnd() * 20, a = (rnd() - 0.5) * 1;
          wrap(() => {
            g.save(); g.translate(x, y); g.rotate(a);
            g.fillStyle = 'rgba(0,0,0,0.4)'; g.beginPath(); g.roundRect(-w / 2 + 3, -h / 2 + 4, w, h, 9); g.fill();
            g.fillStyle = '#7d6c53'; g.beginPath(); g.roundRect(-w / 2, -h / 2, w, h, 9); g.fill();
            g.fillStyle = '#93805f'; g.beginPath(); g.roundRect(-w / 2 + 2, -h / 2 + 2, w - 4, h * 0.44, 7); g.fill();
            g.strokeStyle = 'rgba(30,20,12,0.55)'; g.lineWidth = 1.6;
            g.beginPath(); g.roundRect(-w / 2, -h / 2, w, h, 9); g.stroke();
            /* yosun kenarı */
            g.fillStyle = 'rgba(80,130,90,0.35)';
            g.beginPath(); g.arc(-w * 0.3, h * 0.3, 6, 0, TAU); g.fill();
            g.restore();
          });
        }
      }
      /* toprak çatlakları — kurumuş zemin hatları */
      for (let i = 0; i < 9; i++) {
        const x = rnd() * T, y = rnd() * T, a0 = rnd() * TAU, len = 50 + rnd() * 80;
        const segs = []; let cx2 = x, cy2 = y, ca = a0;
        for (let k2 = 0; k2 < 4; k2++) { const l2 = len / 4; cx2 += Math.cos(ca) * l2; cy2 += Math.sin(ca) * l2; ca += (rnd() - 0.5) * 0.9; segs.push([cx2, cy2]); }
        wrap(() => {
          g.strokeStyle = 'rgba(20,12,6,0.5)'; g.lineWidth = 2.2; g.lineCap = 'round';
          g.beginPath(); g.moveTo(x, y); for (const [sx, sy] of segs) g.lineTo(sx, sy); g.stroke();
          g.strokeStyle = 'rgba(130,100,66,0.25)'; g.lineWidth = 0.9;
          g.beginPath(); g.moveTo(x + 1.4, y + 1.4); for (const [sx, sy] of segs) g.lineTo(sx + 1.4, sy + 1.4); g.stroke();
          g.lineCap = 'butt';
        });
      }
      /* çakıl taşları — ışık/gölge yüzlü minik taşlar */
      for (let i = 0; i < 60; i++) {
        const x = rnd() * T, y = rnd() * T, r = 1.6 + rnd() * 3.4, a0 = rnd() * TAU, tone = rnd() > 0.5 ? '#6f5d45' : '#5d4c38';
        wrap(() => {
          g.save(); g.translate(x, y); g.rotate(a0);
          g.fillStyle = 'rgba(0,0,0,0.35)'; g.beginPath(); g.ellipse(0.8, 1, r, r * 0.8, 0, 0, TAU); g.fill();
          g.fillStyle = tone; g.beginPath(); g.ellipse(0, 0, r, r * 0.8, 0, 0, TAU); g.fill();
          g.fillStyle = 'rgba(255,230,190,0.16)'; g.beginPath(); g.ellipse(-r * 0.25, -r * 0.3, r * 0.55, r * 0.4, 0, 0, TAU); g.fill();
          g.restore();
        });
      }
      /* ışık çiçekleri (ateşböceği) + papatyalar */
      for (let i = 0; i < 12; i++) {
        const x = rnd() * T, y = rnd() * T;
        soft(x, y, 12, 'rgba(255,214,120,0.4)');
        wrap(() => {
          g.fillStyle = 'rgba(255,236,170,0.85)';
          for (let p2 = 0; p2 < 5; p2++) { const a = p2 / 5 * TAU; g.beginPath(); g.arc(x + Math.cos(a) * 2.6, y + Math.sin(a) * 2.6, 1.7, 0, TAU); g.fill(); }
          g.fillStyle = 'rgba(255,244,200,0.9)'; g.beginPath(); g.arc(x, y, 1.4, 0, TAU); g.fill();
        });
      }
      for (let i = 0; i < 14; i++) {
        const x = rnd() * T, y = rnd() * T;
        wrap(() => {
          g.fillStyle = 'rgba(235,240,250,0.5)';
          for (let p2 = 0; p2 < 4; p2++) { const a = p2 * 1.5708 + 0.785; g.beginPath(); g.arc(x + Math.cos(a) * 2, y + Math.sin(a) * 2, 1.3, 0, TAU); g.fill(); }
          g.fillStyle = 'rgba(255,220,130,0.6)'; g.beginPath(); g.arc(x, y, 1, 0, TAU); g.fill();
        });
      }
      /* çim öbekleri (parlak uçlu) */
      for (let i = 0; i < 62; i++) {
        const x = rnd() * T, y = rnd() * T, s = 0.8 + rnd() * 0.9;
        const blades = [];
        for (let b = 0; b < 3; b++) blades.push([(b - 1) * 2, 9 + rnd() * 6]);
        wrap(() => {
          g.lineWidth = 1.7; g.lineCap = 'round';
          for (const bl of blades) {
            g.strokeStyle = 'rgba(118,150,88,0.55)';
            g.beginPath(); g.moveTo(x, y);
            g.quadraticCurveTo(x + bl[0] * 1.4 * s, y - bl[1] * 0.6 * s, x + bl[0] * 2.6 * s, y - bl[1] * s);
            g.stroke();
          }
          g.lineCap = 'butt';
        });
      }
      /* düşmüş yapraklar + kemik + ay gölleri */
      for (let i = 0; i < 12; i++) {
        const x = rnd() * T, y = rnd() * T, a = rnd() * TAU;
        wrap(() => {
          g.save(); g.translate(x, y); g.rotate(a);
          g.fillStyle = 'rgba(190,150,90,0.35)';
          g.beginPath(); g.ellipse(0, 0, 3.6, 1.8, 0, 0, TAU); g.fill();
          g.restore();
        });
      }
      for (let i = 0; i < 3; i++) {
        const x = rnd() * T, y = rnd() * T, a = rnd() * 3;
        wrap(() => {
          g.strokeStyle = 'rgba(214,208,188,0.35)'; g.lineWidth = 3; g.lineCap = 'round';
          g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * 15, y + Math.sin(a) * 15); g.stroke();
          g.beginPath(); g.arc(x, y, 2.6, 0, TAU); g.stroke(); g.lineCap = 'butt';
        });
      }
      for (let i = 0; i < 4; i++)
        soft(rnd() * T, rnd() * T, 90 + rnd() * 80, 'rgba(170,200,240,0.07)');
    }

    this.floorCanvas = c;
    this.floorPattern = this.ctx.createPattern(c, 'repeat');
  }

  /** Vinyet + dünyanın ay ışığı. Yarı çözünürlükte bir kez çizilir. */
  buildOverlay() {
    const c = this.overlayCanvas || document.createElement('canvas');
    c.width = Math.max(2, this.w);
    c.height = Math.max(2, this.h);
    const g = c.getContext('2d');
    const W = c.width, H = c.height;
    g.clearRect(0, 0, W, H);

    /* kızıl ay ışığı: sol üst köşeden süzülen KÜÇÜK, soluk bir aksan —
       tüm ekranı kaplayan büyük bir disk değil (eskiden öyleydi ve
       oynanışı boğuyordu). */
    const wcol = this.worldDef().glow;
    const moon = g.createRadialGradient(W * 0.18, H * 0.02, 4, W * 0.18, H * 0.02, H * 0.42);
    moon.addColorStop(0, wcol.replace(/[\d.]+\)$/, '0.04)'));
    moon.addColorStop(1, wcol.replace(/[\d.]+\)$/, '0)'));
    g.fillStyle = moon;
    g.fillRect(0, 0, W, H);

    /* 3D sahne artık gerçek derinlik/ışıkla kendi atmosferini kuruyor —
       bu vinyet yalnız en uç köşelere ÇOK hafif bir kapanma katar; savaş
       alanının okunurluğunu asla bozmaz (eskiden 0.52 opaklıkla ve dar
       0.42 yarıçapla ekranın büyük bölümünü karartıyordu). */
    const vig = g.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.62, W / 2, H / 2, Math.max(W, H) * 0.95);
    vig.addColorStop(0, 'rgba(0,0,0,0)');
    vig.addColorStop(1, 'rgba(3,4,7,0.28)');
    g.fillStyle = vig;
    g.fillRect(0, 0, W, H);

    this.overlayCanvas = c;
    this.overlayWorld = this.worldId;

    /* ── KARE BAŞINA TAM EKRAN BLIT KALDIRILDI ──
       Bu vinyet dünya başına BİR KEZ değişen statik bir görüntü. Eskiden
       her karede 2D kanvasa drawImage ediliyordu: 1080×2400 DPR2 ekranda
       kare başına ~5 milyon piksel harmanlama, yalnızca hiç değişmeyen
       bir görüntüyü tekrar basmak için. Artık #game3d ile #game arasında
       duran normal bir DOM katmanı — bileşikleştiriciye (compositor)
       devredildi, JS ve fillrate maliyeti sıfır. */
    if (!c.parentNode) {
      c.id = 'vignette-layer';
      c.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;' +
        'display:block;pointer-events:none';
      const under = document.getElementById('game3d');
      if (under && under.parentNode) under.parentNode.insertBefore(c, under.nextSibling);
    }
  }

  /* ═══════════ AKIŞ KONTROLÜ ═══════════ */

  /** Bir görevi başlat — bulut perdesi kapanır, yükleme çubuğu dolar,
      perde açılırken savaş başlar (gerçek kurulum perde kapalıyken yapılır). */
  startRun(w, m, seal) {
    if (this._introBusy) return;
    this._introBusy = true;
    /* v53 D3: mühür koşusu yalnız startSeal'den gelir; her başka başlangıç temizler */
    this.sealRun = seal && seal.rule ? seal : null;
    this.towerRun = seal && seal.tower ? seal : null;       // v53 D2: aynı kapıdan kule katı
    this.nmRun = seal && seal.nm ? seal : null;             // v54 H2: Kabus döngüsü
    document.documentElement.classList.toggle('nm-run', !!this.nmRun);
    const wId = w || this.worldId, mId = m || this.missionId;
    const wd0 = WORLDS[wId - 1];
    const md0 = missionDef(wId, mId);
    /* PERDE BİR KAPIDIR — KARO ORADA BEKLETİLİR. `bakeArena` SENKRON
       olduğu için karo hazır değilse harita sessizce prosedürel yüzeye
       düşer (ölçüldü: 'katedral' → proc, karo 640). Bulut perdesi zaten
       kapalı; oradaki bekleme oyuncuya bir şey kaybettirmez. Yine de bir
       TAVAN var: ağ ölüyse oyun başlamamazık etmez, prosedürele düşer. */
    const tileGate = aiDetailReady(worldMapId(wId))
      ? null
      : Promise.race([
        preloadAiDetail(worldMapId(wId)),
        new Promise((res) => setTimeout(res, 1800)),
      ]);
    this.audio.unlock();
    /* Dünyaya özgü düşman modelini PERDE KAPALIYKEN yükle — eskiden koşu
       başladıktan sonra yükleniyordu ve düşmanlar bir süre yer tutucu kapsül
       ("patates") olarak görünüp sonra modele dönüşüyordu. */
    if (this.renderer3d && wd0) this.renderer3d.prepareWorldEnemies(wd0.floor);
    /* v60: kutsama YÜKLEMEDE değil — kapı açılıp arena göründükten sonra, sim DONUKKEN seçilir.
       Seçilene dek oyun başlamaz (süre sınırı yok); kapı açılış saati _ldHold ile tutulur. */
    const bless = ((this.meta.ftue || (this.progress[1] | 0) >= 1) && !this.sealRun && !this.towerRun) ? rollBlessings(3) : null;
    this.ui._ldHold = !!bless;
    this.ui.playBattleIntro(
      {
        world: wd0 ? wd0.name : '',
        mission: 'GÖREV ' + mId,
        worldNo: wId, wc: wd0 ? wd0.color : '#b06a49',
        obj: md0 ? md0.objective : '',
        stars: (this.sealRun || this.towerRun || this.nmRun) ? -1 : Ledger.stars(this.meta, wId, mId),
        side: this.towerRun ? 'SONSUZ KULE' : this.sealRun ? 'HAFTALIK MÜHÜR' : this.nmRun ? 'KABUS DÖNGÜSÜ' : '',
        /* v56 C3: kutsama yalnız ilk görev bittikten sonra, kampanya + kabus koşularında */
      },
      () => {
        /* SIRA ÖNEMLİ: kurulum → sonra perde tutması. Kapı (karo bekleme)
           varsa İKİSİ birlikte gecikir; yoksa 2400 ms'lik perde saati
           kurulumdan ÖNCE başlayıp oyunu hazır olmadan serbest bırakır. */
        const begin = () => {
          this._startRunNow(w, m);
          /* ══ PERDE TUTMASI DUVAR SAATİYLE BİTER ══
             Bulutlar açılana dek sim donuk kalsın — oyuncu perde arkasında
             hasar yemesin. Ama tutmanın BİTİŞİ kare deltasına bağlanamaz:
             `freeze` her karede rdt kadar eritiliyordu ve rdt bir kez
             pozitif olmazsa tutma SONSUZA kadar sürüyor. Ölçüm tam bunu
             gösterdi: durum 'playing', engel 217, ama game.time 0,00'da
             sabit ve freeze 2,30'da sabit — oyun "açık ama donmuş", konsolda
             tek hata yok. Kilit döngünün kendisindeydi: freeze dalı
             çalışmadan freeze erimiyor, freeze erimeden dal terk edilmiyor.

             Perde bir SİMÜLASYON olayı değil, bir SUNUM olayıdır: süresi
             duvar saatiyle ölçülür ve zamanlayıcı kare döngüsünden bağımsız
             biter. Böylece kare hızı, zaman kaynağı ya da sekme durumu ne
             olursa olsun tutma kendini serbest bırakır. */
          this.freeze = Math.max(this.freeze, 2.3);
          clearTimeout(this._curtainT);
          const release = () => {
            if (this.ui._ldHold) { this._curtainT = setTimeout(release, 120); return; }   // v56: kutsama seçilene dek sim donuk
            this.freeze = 0;
            this.last = performance.now();
          };
          this._curtainT = setTimeout(release, 2400);
        };
        if (tileGate) tileGate.then(begin); else begin();
      },
      () => {
        this._introBusy = false;
        if (bless) this.ui.showBlessPick(bless, (b) => { this.applyBlessing(b); this.ui._ldHold = false; });
      }
    );
  }

  _startRunNow(w, m) {
    this.worldId = w || this.worldId;
    this.missionId = m || this.missionId;
    this.msn = missionDef(this.worldId, this.missionId);
    /* son oynanan dünya — ana ekran önizlemesi bu dünyayı gösterir */
    try { localStorage.setItem('kh_lastWorld', String(this.worldId)); } catch (e) { /* sessiz */ }

    this.time = 0;
    this.kills = 0;
    this._cbN = 0; this._cbT = -9; this._cbTier = 0; this._cbBest = 0;   // v59 KATLİAM
    this._stressT = 0; this._achK = 0; this._achU = 0;
    this.freeze = 0;
    this.trauma = 0;
    this._kickT = 9; this._punchT = 9; this.zoomP = 0;
    this._bossOutro = 0;
    this._dying = 0;
    document.documentElement.classList.remove('dying');
    this.wave = 1;
    this.pendingWaveBonus = false;
    this.reviveUsed = false;
    this._hpFloor = 1;                // koşu boyunca görülen en düşük can oranı (dinamik pay ölçütü)
    this.rerolls = 3;                 // koşu başına 3 ücretsiz yeniden dağıtma
    this._eliteK = 0; this._ftuePow = false; this._bless = null; this._lookX = 0; this._lookY = 0;   // v56
    this._objCard = false;
    this._lvDelay = 0;
    if (this.objectives) this.objectives.reset();
    if (this.powerups) this.powerups.reset();
    if (this.fieldChests) this.fieldChests.reset();
    this._fc0 = this.fieldChests ? this.fieldChests.opened | 0 : 0;   // v53 yıldız ölçütü: bu koşuda açılan
    PerfLog.begin();
    Ftue.begin(this);                      // v54 E1: yalnız ilk görevde koç
    Ghost.begin(this);                     // v56 D2
    this._masK = 0;                        // v53j: ustalığa sayılmış kıyım (yeniden doğuşta çift sayım yok)
    this.player.reset();
    this.enemies.reset();
    this.enemies.setWorld(this.worldDef());     // palet + boss adı + elite
    this.weapons.reset();
    const cdef = this.charDef();
    this.player.charId = this.meta.selectedChar;
    this.ult.reset(cdef.rarity, this.meta.selectedChar);
    this.events.reset();
    this.mode.begin((this.towerRun || this.sealRun) ? 'survive' : (this.msn && this.msn.type) || 'survive');
    if (WEAPONS[cdef.startWeapon]) this.weapons.slots[cdef.startWeapon] = 1;
    this.weapons.seedDefault();
    /* İMZA GÜCÜ: kahramanın nadirliği imza silahını güçlendirir —
       efsane kahramanın imzası en sert vurur (koşuya özel W kopyasında). */
    const sigW = this.weapons.W[cdef.startWeapon];
    const sigMul = signaturePower(cdef.rarity);
    if (sigW && sigMul > 1) {
      for (const key of ['dmg', 'dps']) {
        const arr = sigW[key];
        if (Array.isArray(arr)) for (let i = 0; i < arr.length; i++) arr[i] = Math.round(arr[i] * sigMul * 100) / 100;
        else if (typeof arr === 'number') sigW[key] = Math.round(arr * sigMul * 100) / 100;
      }
    }
    this.input.reset();
    this.player.applyMods(cdef.mods);
    this.applyMetaToPlayer();
    /* KARAKTER SEVİYESİ (CR): seviye başına can + hasar + atış hızı */
    const clv = this.charLevel(this.meta.selectedChar);
    if (clv > 1) {
      const lm = charLevelMods(clv);
      this.player.maxHp = Math.max(10, Math.round(this.player.maxHp * lm.hpMul));
      this.player.hp = this.player.maxHp;
      this.player.dmgMult += lm.dmgAdd;
      this.player.atkPct += lm.atkAdd;
    }
    /* HESAP SEVİYESİ: hafif hesap-geneli güç bonusu (can + hasar), seviye başına +%0.6, tavan +%50 */
    const alv = this.accountLevel();
    if (alv > 1) {
      const abon = Math.min(0.5, (alv - 1) * 0.006);
      this.player.maxHp = Math.max(10, Math.round(this.player.maxHp * (1 + abon)));
      this.player.hp = this.player.maxHp;
      this.player.dmgMult += abon;
    }
    this.cam.x = this.player.x;
    this.cam.y = this.player.y;
    /* dünya görselleri */
    this.buildFloorPattern(this.worldDef().floor);
    if (this.overlayWorld !== this.worldId) this.buildOverlay();

    /* ARENA kurulumu — TÜM dünyalar: Dünya 1 ile aynı boyutta, 4 tarafı
       kapalı KARE saha (sonsuz harita yok). Çit görseli = çarpışma birebir;
       doku dünya temasıyla pişer ve dünya başına önbelleğe alınır. */
    {
      /* PLAY 1900 → 4000 (2026-08-23): saha artık İÇİNDE İŞ OLAN bir yer.
         1900'de harita ekranın ~2,3 katıydı, yani "harita" diye bir şey
         yoktu — tek bir dövüş göbeği vardı. 4000'de oyuncu haritanın
         ~%8'ini görür: avlular, kemiklik, şapel ayrı yerler haline gelir,
         escort/yuva görevleri mesafe kazanır, kaçış gerçek bir karar olur.
         Alan ×4,4 (3,61M → 16,0M px²).
         VRAM: artık tek gerilen doku YOK — makro 2048² (22,4 MB) + döşenen
         detay 1024² (5,6 MB) = 28 MB. Önemli olan örnek yoğunluğu: tek
         dokuyla 0,48 örnek/px'e düşecekti, çift katmanla 2,0 örnek/px
         (bkz. arenaMaps · bakeArenaMap). */
      const PLAY = 4000;                  // oynanabilir kare kenarı (dünya px)
      const BORDER = 140;                 // çit + dış bordur kalınlığı
      const full = PLAY + BORDER * 2;
      this.arena = {
        x0: -full / 2, y0: -full / 2, w: full, h: full,
        l: -PLAY / 2, r: PLAY / 2, t: -PLAY / 2, b: PLAY / 2,
        play: PLAY, border: BORDER,
      };
      if (this._arenaWorld !== this.worldId || !this.arenaCanvas) {
        this.bakeArena();
        this._arenaWorld = this.worldId;
      }
    }

    this.audio.unlock();
    this.audio.play('gatelock');
    this.beginWave(1);
    this.ui.showGame();

    /* ══ GÖREV KURULUMU EN SONDA ══
       İki tuzağa üst üste düşüldü, ikisi de ÖLÇÜMLE yakalandı:

       1) begin() bakeArena'nın İÇİNDEYDİ. Pişirme yalnız DÜNYA DEĞİŞİNCE
          çalışır (`_arenaWorld` kapısı), yani aynı haritayı ikinci kez
          oynayan oyuncuda görev hiç kurulmuyordu. Ölçüm: "gorev: none,
          yuva: 0" — ilk koşuda doğru, ikincisinde sessizce yok.

       2) Sonra bake bloğunun hemen ardına alındı ve YİNE olmadı: çağrı
          izi `reset → begin → reset` gösterdi. Kurulumun bir bölümü
          perde kapalıyken ayrı bir akışta çalışıyor, yani DOSYA SIRASI
          YÜRÜTME SIRASI DEĞİL. Elle çağrıldığında begin() kusursuz
          çalışıyordu (faz 'waiting', 3 yuva) — hata kurulumda değil
          SIRADAYDI.

       Ders: bir kurulumun nereye konacağı dosyaya bakılarak değil çağrı
       izi ÖLÇÜLEREK belirlenir. Buradan sonra reset eden bir şey yok. */
    if (this.objectives) this.objectives.begin();
  }

  /* ═══════════ DALGA AKIŞI ═══════════ */

  isBossWave(w) {
    return this.msn.isBoss && w === this.msn.waves;
  }

  /* DALGA SÜRESİ TİTİZLİKLE TEK YERDE (2026-08-18): burada `min(60, 16+4w)`
     yazılıydı ve config.waveTime ÖLÜ KODDU — görev süresi ayarlamak için
     config'i değiştiren biri hiçbir şey değiştirmemiş oluyordu (ölçüm
     tezgahı da yanlış fonksiyonu okuyordu). Tek kaynak: config.waveTime. */
  waveDuration(w) {
    /* DALGA SAYISI DA GEÇİLİR: config.waveTime toplam görev süresini hedefler
       ve onu dalgalara böler (bkz. oradaki not). Bunu geçmemek "5-7 dk"
       sözleşmesini sessizce eski sabit eğriye düşürürdü. */
    return waveTime(w, this.msn ? this.msn.waves : 0);
  }

  beginWave(w) {
    this.wave = w;
    this.waveTimer = this.waveDuration(w);
    this._harvested = false;               // v70 C4
    this.state = 'playing';
    this.enemies.startWave(w);             // içinde applyWaveMods (boss doğmadan önce)
    if (this.mode) this.mode.onWave(w);    // v63 İ4
    this.ui.showGame();
    /* v54 F3: 20 dk+ koşuda cihaz zorlanıyorsa PİL MODU bir kez önerilir (oturum başı). */
    if (!this._battHint && this.time > 1200 && (Quality.stress || 0) > 0.6 && !Settings.data.batt) {
      this._battHint = true;
      if (this.ui.toast) this.ui.toast('CİHAZ ISINIYOR · AYARLAR → PİL MODU');
    }
    const wd = this.worldDef();
    /* Müzik durumu dalgadan TÜRETİLİR, ayrı bir yerde tutulmaz — ikinci
       bir durum kaynağı `waveDuration` tuzağının aynen tekrarı olurdu.
       Yoğunluk dalga numarasının görevdeki oranı: son dalgada tam açık.
       Boss durumu ANINDA girer (bar sınırını beklemez): boss uyanırken
       menü müziğiyle iki saniye daha çalmak anı öldürür. */
    this.music.setIntensity(this.msn.waves > 1 ? (w - 1) / (this.msn.waves - 1) : 0.5);
    this.music.setState(this.isBossWave(w) ? 'boss' : 'battle', this.isBossWave(w));
    if (this.isBossWave(w)) this.music.accent('boss');
    this.ui.banner(
      'DALGA ' + w + ' / ' + this.msn.waves,
      this.isBossWave(w) ? wd.boss + ' UYANIYOR' : (w === 1 ? wd.name : null)
    );
  }

  endWave() {
    /* görevin son dalgası bitti mi? */
    if (this.wave >= this.msn.waves) {
      /* v63 İ4: AV/KAÇIŞ hedefi tamamlanmadıysa UZATMA — dalga sürer, mod bitirince zafer */
      if (this.mode && !this.mode.canFinish()) { this.waveTimer = 30; this.enemies.spawning = true; return; }
      this.missionComplete();
      return;
    }
    this.enemies.clearAll();
    /* Dalga sonunda fanfar YOK: hemen ardından kart ekranı gelir ve
       kendi 'carddeal' sesini çalar — iki ses üst üste binmesin. */
    this.pendingWaveBonus = true;
    if (this.player.pendingLevels > 0) {
      this.enterLevelUp();
    } else {
      this.openWaveBonus();
    }
  }

  nextWave() {
    this.beginWave(this.wave + 1);
  }

  enterLevelUp() {
    this.state = 'levelup';
    this.trauma = 0;   /* ses: ui.showLevelUp içinde 'carddeal' */
    const choices = this.weapons.rollChoices(3);
    this.ui.showLevelUp(choices);
  }

  /** YENİDEN DAĞIT (3 ücretsiz hak). Hak kart EKRANI başına değil KOŞU
      başına verilir: ekran başına olsaydı her seviyede üç kez çevirip
      istediği kartı garanti alan oyuncu için kart seçimi bir karar olmaktan
      çıkardı — nadirlik dengesi (bkz. CLAUDE.md pasif kart bandı) çökerdi. */
  rerollCards() {
    if (this.state !== 'levelup' || (this.rerolls | 0) <= 0) return;
    this.rerolls--;
    this.audio.play('reroll');
    this.ui.showLevelUp(this.weapons.rollChoices(3));
  }

  pickUpgrade(choice) {
    this.weapons.applyChoice(choice);
    if (this._inWaveBonus) {
      this._inWaveBonus = false;
      this.ui.hideLevelUp();
      /* GÖREV kartı dalga ARASINDA değil dalga İÇİNDE verilir: sonraki dalgaya
         geçilmez, koya kaldığı yerden devam eder. Ayrımı yapmayan ilk sürüm
         görev ödülünü alan oyuncunun dalgasını atlıyordu. */
      if (this._objCard) {
        this._objCard = false;
        this.state = 'playing';
        this._playEvoCine();
        return;
      }
      this.nextWave();
      this._playEvoCine();
      return;
    }
    this.player.pendingLevels--;
    /* kart seçiminde ek ses yok — sadece kartlar ekrana gelirken çalar */
    if (this.player.pendingLevels > 0) {
      const choices = this.weapons.rollChoices(3);
      this.ui.showLevelUp(choices);
    } else if (this.pendingWaveBonus) {
      this.ui.hideLevelUp();
      this.openWaveBonus();
    } else {
      this.ui.hideLevelUp();
      this.state = 'playing';
      this._returnPulse(choice);
      Ftue.onLevelPicked(this);
      this._playEvoCine();
    }
  }

  /** v71 D2 · EVRİM SİNEMASI: kart ekranı kapandıktan sonra, sim donuk (_ldHold). */
  _playEvoCine() {
    const E = this._evoCine;
    if (!E || !this.ui.evoCinema) return;
    this._evoCine = null;
    this.ui._ldHold = true;
    this.ui.evoCinema(E, () => {
      this.ui._ldHold = false;
      this.last = performance.now();
      this._returnPulse({ evo: true });
    });
  }

  /** v70 A7 · SEVİYE ANI: ayaktan ışık sütunu + hasarsız şok halkası. Kart ekranı
      2 sn sonra açılır; oyuncu kalabalığa sıkışmış değil nefes alarak girer. */
  _levelRise() {
    const p = this.player;
    this._returnPulse(null);
    if (this.pools.rings) this.pools.rings.obtain(p.x, p.y, 200, 0.42, '#f0c7a6');
    for (let i = 0; i < 12; i++) {
      const a = Math.random() * 6.283, r = 10 + Math.random() * 16;
      this.pools.particles.obtain(p.x + Math.cos(a) * r, p.y + Math.sin(a) * r * 0.5, 0,
        -160 - Math.random() * 140, 0.55 + Math.random() * 0.25, 2.6 + Math.random(), i & 1 ? '#ffe2c4' : '#f0c7a6', 0.93, 0, true);
    }
    this.audio.play('levelrise');
  }

  /** v70 C4 · HASAT ANI: görünen/görünmeyen tüm ruhlar çekime girer (mevcut emilme
      eğrisi: geri sekme + hızlanma). Yeni alan yok, kare maliyeti yok. */
  _harvestSouls() {
    this._harvested = true;
    let n = 0;
    this.pools.gems.updateEach(function (g) { if (!g.pull) { g.pull = true; g.pt = 0; } n++; return false; }, 0);
    if (n < 4) return;
    const p = this.player;
    if (this.pools.rings) this.pools.rings.obtain(p.x, p.y, 150, 0.5, '#ff5a6e');
    this.spawnText(p.x, p.y - 80, 'HASAT', '#ff8a94', 18, true);
    this.audio.play('harvest');
  }

  /* ═══ v70 D4 · DİZİLİMLER ═══
     Kahraman başına 3 kayıtlı kuşanım (Clash Royale deste mantığı). Canlı harita
     `meta.charGear[cid]` AKTİF dizilimin kendisidir → kuşanma/çıkarma otomatik
     kaydolur, diğer 12 dosyadaki okuma yolları değişmez. Geçişte canlı harita
     bırakılan yuvaya yazılır, hedef yuva sahiplik + sınıf süzgecinden yüklenir. */
  decks(cid) {
    cid = cid || this.meta.selectedChar;
    const M = this.meta;
    if (!M.decks) M.decks = {};
    let d = M.decks[cid];
    if (!d || !Array.isArray(d.l) || d.l.length !== 3) {
      d = M.decks[cid] = { a: 0, l: [0, 1, 2].map((i) => ({ n: '', g: i === 0 ? Object.assign({}, this.charGearMap(cid)) : {} })) };
    }
    if (!(d.a >= 0 && d.a < 3)) d.a = 0;
    return d;
  }
  deckGear(i, cid) {
    const d = this.decks(cid);
    return i === d.a ? this.charGearMap(cid) : (d.l[i].g || {});
  }
  switchDeck(i) {
    const cid = this.meta.selectedChar, d = this.decks(cid);
    if (!(i >= 0 && i < 3) || i === d.a) return;
    d.l[d.a].g = Object.assign({}, this.charGearMap(cid));
    const src = d.l[i].g || {}, map = {};
    for (const slot in src) {
      const id = src[slot], it = this.gearById(id);
      if (it && it.slot === slot && this.ownsGear(id) && this.canWear(id, cid)) map[slot] = id;
    }
    this.meta.charGear[cid] = map;
    d.a = i;
    this.saveMeta();
    this.audio.play('equip');
    this.ui.showArmory();
  }
  renameDeck(i, name) {
    const d = this.decks();
    if (!(i >= 0 && i < 3)) return;
    d.l[i].n = String(name || '').replace(/[<>&"']/g, '').trim().slice(0, 14);
    this.saveMeta();
  }

  /** v53 C4: KARTTAN DÖNÜŞ ANI — oyuncu etrafında halka dalgası, yakın düşmanlar
      itilir, 0,6 sn dokunulmazlık. Seçimden hemen sonra sürünün içine düşmek
      "haksız" hissettiriyordu; itme hasar vermez, yalnız nefes aldırır. */
  _returnPulse(choice) {
    const p = this.player, E = this.enemies;
    const col = choice && choice.evo ? '#f0c77a' : (choice && choice.kind === 'special' ? '#d8a284' : '#cfd6e2');
    p.invuln = Math.max(p.invuln, 0.6);
    const out = this._pulseScratch || (this._pulseScratch = []);
    out.length = 0;
    E.queryCircle(p.x, p.y, 190, out);
    for (let i = 0; i < out.length; i++) {
      const e = out[i];
      if (e.isBoss || e.hp <= 0) continue;
      const dx = e.x - p.x, dy = e.y - p.y, d = Math.hypot(dx, dy) || 1;
      const push = (190 - d) * 0.55 * (e.knockRes != null ? e.knockRes : 1);
      e.x += (dx / d) * push; e.y += (dy / d) * push;
    }
    this.spawnBurst(p.x, p.y, col, 18, 360, 2.6, 0.45, true);
    if (this.fxImpact) this.fxImpact(p.x, p.y, 0, 2, col);
  }

  /* ═══════════ DALGA ARASI RÜN ÖDÜLÜ (Kara Pazar'ın yerine) ═══════════
     Kara Pazar kaldırıldı: dükkândan eşya satın almak yerine, her dalga
     sonunda oyuncuya 4 rün kartı arasından seçim hakkı verilir. */
  openWaveBonus() {
    this.pendingWaveBonus = false;
    this.state = 'levelup';
    this._inWaveBonus = true;
    this.trauma = 0;
    this.player.hp = Math.min(this.player.maxHp, this.player.hp + this.player.maxHp * 0.12);
    const choices = this.weapons.rollChoices(3);
    this.ui.showLevelUp(choices);
  }

  /** v53: hafta etkinliği + mühür kuralı + kule kat çarpanı — enemies.startWave çağırır. */
  applyWaveMods() {
    Calendar.applyWave(this);
    Tower.applyWave(this);
    Nightmare.applyWave(this);
  }

  /** v53 D3: Haftalık Mühür koşusu — görev + kural haftanın tohumundan. */
  startSeal() {
    const S = Calendar.seal(this.progress, WORLDS.length);
    this.startRun(S.w, S.m, S);
  }

  /** v54 H2: Kabus döngüsü — kayıtlı sıradaki görevden. */
  startNightmare() {
    const N = nmBook(this.meta);
    this.startRun(N.w, N.m, { nm: true });
  }

  /** v53 D2: Sonsuz Kule — kayıtlı kattan başlar. */
  startTower(k) {
    const T = towerBook(this.meta);
    const F = floorDef(k || T.cur, WORLDS.length, MISSIONS_PER_WORLD);
    this.startRun(F.w, F.m, { tower: true, k: F.k, boss: F.boss });
  }

  pauseGame() {
    if (this.state !== 'playing') return;
    this.state = 'paused';
    this.ui.showPause();
  }

  resumeGame() {
    if (this.state !== 'paused') return;
    this.state = 'playing';
    this.ui.hidePause();
    this.last = performance.now();
    Quality.reset();          // duraklatma süresi ölçüme karışmasın
  }

  quitToMenu() {
    Ftue._show(''); if (Ftue.step) Ftue.step = '';   // v54 E1: koç plakası menüde kalmasın
    document.documentElement.classList.remove('nm-run');
    this.state = 'menu';
    this.music.setState('menu');
    this.ui.showMenu();
    this.prefetchTiles();   // zararsz tekrar: inflight + cache ikinci indirmeyi engeller
  }

  /** Kalan zemin karolarının BAYTLARINI boş zamanda indir (bir kez).
      Eskiden burada onunu birden PİŞİRİYORDU: ölçülen 8837 ms ve —
      daha kötüsü — 168 MB tuval destek deposu (10 × 2048² × 4).
      Oyuncu bir görevde tek harita görür; hazır karo sayısı 2'de
      tutulur (aiDetail.KEEP) ve boş zaman yalnız ağ payını kapatır. */
  prefetchTiles() {
    if (this._tilesPrefetched) return;
    this._tilesPrefetched = true;
    const kick = () => warmAiDetailBytes();
    if (window.requestIdleCallback) requestIdleCallback(kick, { timeout: 4000 });
    else setTimeout(kick, 1500);
  }

  /* ═══════════ GÖREV SONU ═══════════ */

  /* v54 G1: DÜŞÜŞ ANI — can bitince pencere hemen açılmaz: 0,9 sn gerçek zamanlı
     ağır çekim (×0,25), ekran griye çekilir, kızıl vinyet + "DÜŞTÜN" plakası.
     Sim durmaz, oyuncu dokunulmaz; sonra asıl görev sonu. */
  gameOver() {
    if (this.state !== 'playing') return;
    if (!this._dying) {
      this._dying = 0.9;
      this.player.invuln = Math.max(this.player.invuln, 5);
      this.addShake(0.35);
      this.punch(0.05);
      document.documentElement.classList.add('dying');
      if (this.ui.bossMoment) this.ui.bossMoment('fall', 'DÜŞTÜN');
      return;
    }
    if (this._dying > 0) return;
    this._dying = 0;
    document.documentElement.classList.remove('dying');
    Ftue._show('');
    this.state = 'gameover';
    this.freeze = 0;
    this.addShake(FX.shakeBoss);
    this.audio.play('death');
    /* Ölümde müzik SUSAR, kısılmaz. Yenilgi perdesinin altında neşeli bir
       marimba çalması anın duygusunu yok eder — sessizlik burada bir efekt. */
    this.music.fadeOut(0.7);
    /* Dinamik pay: ölüm baskıyı düşürür. Görev BAŞINA bir kez — aynı
       koşuda reklamla yeniden doğan oyuncu ikinci kez indirim almaz. */
    if (!this.reviveUsed) this.dynNudge(-DYN.onDeath);
    this.saveRecord();
    /* teselli ödülü: göreve göre, ilerleme oranıyla */
    const frac = Math.min(1, (this.wave - 1 + (1 - this.waveTimer / this.waveDuration(this.wave))) / this.msn.waves);
    const rubies = Math.max(2, Math.round(replayReward(this.worldId, this.missionId) * frac * 0.6 * Calendar.goldMul(this)));
    this.addRubies(rubies);
    const seal = this.sealRun ? Calendar.finish(this, false) : null;
    const tower = this.towerRun ? Tower.finish(this, false) : null;
    const nm = this.nmRun ? Nightmare.finish(this, false, MISSIONS_PER_WORLD, WORLDS.length) : null;
    this._learnTier();
    this._achNew = Ach.onRun(this, false);
    const ledger = Ledger.onRun(this, false);
    this._journey = this._runJourney(false);
    PerfLog.end(this, 'loss');
    this.ui.showMissionEnd(false, {
      time: this.time, kills: this.kills, level: this.player.level,
      wave: this.wave, rubies, chest: null, firstClear: false,
      canRevive: !this.reviveUsed, ledger, seal, tower, nm,
    });
  }

  /** Reklam izleyerek yeniden doğ: koşuya, kaldığın dalgadan devam et. */
  reviveWithAd() {
    if (this.reviveUsed || this.state !== 'gameover') return;
    this.reviveUsed = true;
    this.audio.play('click');
    this.ui.showAdWatch(3, () => {
      this.player.hp = Math.round(this.player.maxHp * 0.6);
      this.player.invuln = Math.max(this.player.invuln, 2.5);
      this.state = 'playing';
      this._dying = 0;
      /* v54 G1: DİRİLİŞ — ruh sütunu + itme halkası (hasarsız) */
      this._returnPulse({ evo: true });
      for (let i = 0; i < 26; i++) this.pools.particles.obtain(this.player.x + (Math.random() - 0.5) * 40, this.player.y, (Math.random() - 0.5) * 30, -160 - Math.random() * 220, 0.9 + Math.random() * 0.5, 2.4 + Math.random() * 2, i % 2 ? '#f0c7a6' : '#eef4ff', 0.95, 0, true);
      if (this.ui.bossMoment) this.ui.bossMoment('rise', 'YENİDEN DOĞDUN');
      PerfLog.begin();                     // v53j: yenilgide kapanan ölçüm yeniden doğuşta yeni satır açar (_masK SIFIRLANMAZ)
      this.ui.showGame();
      this.last = performance.now();
      /* Perde arkasındaki kurulum (GLB parse, doku küçültme, arena pişirme)
         yüzlerce ms'lik kareler üretir. Bunlar oyunun gerçek kare bütçesini
         temsil etmez — silinmezse oyuncu savaşa girdiği anda çözünürlük
         düşerdi, tam netliğe en çok ihtiyaç duyduğu momentte. */
      Quality.reset();
      /* MÜZİĞİ GERİ AÇ. `gameOver` müziği kısmıyor, `fadeOut` ile TAMAMEN
         durduruyor (playing = false) — yeniden doğuş `beginWave`'den
         geçmediği için müziği başlatan başka hiçbir yol çalışmaz. Eksikse:
         dalga ortasında 60 saniyeye kadar sessizlik, BOSS dalgasında ise
         koşunun doruk noktası baştan sona sessiz (boss dalgası görevin son
         dalgası, yani `beginWave` bir daha hiç çağrılmıyor) — ve yeniden
         doğuş en çok tam orada kullanılır.
         `immediate` şart: perde kalkarken bar sınırını beklemek yeniden
         doğuşun ilk saniyelerini sessiz açar. */
      this.music.setState(this.isBossWave(this.wave) ? 'boss' : 'battle', true);
      this.audio.play('revive');
    });
  }

  missionComplete() {
    this.state = 'victory';
    Ftue.finish(this);
    this.enemies.clearAll();
    /* Zafer fanfarı Sol minörde; müzik Bb majörde — AYNI yedi nota, yani
       fanfar müziğin üstüne düşer, çarpmaz. `duck` fanfar boyunca müziği
       geri çeker; sonrasında menü temasına yumuşak geçer. */
    this.music.duck(0.35, 2.2);
    this.music.setState('victory', true);
    this.audio.play('victory');
    /* Dinamik pay: zafer baskıyı geri tırmandırır — hiç ciddi hasar
       almadan geçilen görev daha çok. "Ciddi" eşiği canın %55'i:
       sıyrılmadan geçmek şart olsaydı ölçüt hiç tetiklenmezdi. */
    this.dynNudge(this._hpFloor != null && this._hpFloor > 0.55 ? DYN.winFlawless : DYN.onWin);
    this.saveRecord(true);

    const w = this.worldId, m = this.missionId;
    const firstClear = !this.towerRun && (this.progress[w] | 0) < m;
    let rubies, chest = null, chestFull = false, bossDrop = false;
    if (firstClear) {
      this.progress[w] = m;
      saveProgress(this.progress);
      /* seçili görevi bir sonrakine taşı — menüye dönünce SAVAŞ butonu
         tamamlanan görevi değil sıradakini gösterir */
      if (this.ui.setPick) {
        if (m < MISSIONS_PER_WORLD) this.ui.setPick(w, m + 1);
        else if (w < WORLDS.length) this.ui.setPick(w + 1, 1);
      }
      rubies = missionReward(w, m);
      this.chests.addVictory();
    } else {
      rubies = this.towerRun ? 0 : replayReward(w, m);
    }
    /* GARANTİ SANDIK: her bölüm tamamlanışında (ilk geçiş de olsa, tekrar da
       olsa) tam olarak 1 sandık düşer — nadirlik zarı sıradan→efsane zorlaşır.
       Boss görevinde zar üst kademeye kaydırılır; ayrıca eski "boss ganimeti"
       zarı kullanılmaz — tek bir garanti düşüş, çift sandık yok. */
    bossDrop = this.msn.isBoss;
    chest = (this.towerRun && !bossDrop) ? null : rollMissionChest(this.player.luck, bossDrop);
    if (chest && !this.chests.grant(chest)) { chest = null; chestFull = true; }
    rubies = Math.round(rubies * Calendar.goldMul(this) * (this.nmRun ? NM.gold : 1));
    this.addRubies(rubies);
    const seal = this.sealRun ? Calendar.finish(this, true) : null;
    const tower = this.towerRun ? Tower.finish(this, true) : null;
    const nm = this.nmRun ? Nightmare.finish(this, true, MISSIONS_PER_WORLD, WORLDS.length) : null;
    if (tower) rubies += tower.gold;
    this.addBattlePassXp(bossDrop ? 60 : 25);
    this.addAccountXp(bossDrop ? 45 : 20);
    this._learnTier();
    this._achNew = Ach.onRun(this, true);
    const ledger = Ledger.onRun(this, true);
    this._journey = this._runJourney(true);
    PerfLog.end(this, 'win');
    this.ui.showMissionEnd(true, {
      time: this.time, kills: this.kills, level: this.player.level,
      wave: this.wave, rubies, chest, chestFull, firstClear, bossDrop, ledger, seal, tower, nm,
    });
  }

  /* KALDIRILDI (2026-08-18) — rollEggDrop + yoldaş sistemi: görev sonu ödül
     tablosu tek paraya (yakut) + garanti sandığa indi. Kuluçka ekonomisi,
     yumurta zarı, yoldaş aurası ve savaş rigi komple söküldü. */

  /* ═══════════ DİNAMİK ZORLUK (görünmez pay) ═══════════
     Bant DAR ve yalnız doğum baskısını sürer (bkz. config.DYN). Ölçüm
     notu: `_baltest` bu payı GÖRMEZ — kadro puanı hep 1.0 çarpanıyla
     ölçülür, yani denge tezgahının hedef bandı bu mekanizmadan bağımsız
     kalır. Payın kendisi tek satırla denetlenebilir: `KH.game.dynMul()`. */
  dynMul() {
    const d = this.meta.dyn;
    const v = d && Number.isFinite(d.mul) ? d.mul : 1;
    return Math.max(DYN.min, Math.min(DYN.max, v));
  }

  /** delta < 0 kolaylaştırır. Kaydı hemen yazar: oyuncu ölünce uygulamayı
      kapatırsa telafi kaybolmasın. */
  dynNudge(delta) {
    if (!this.meta.dyn) this.meta.dyn = { mul: 1 };
    const d = this.meta.dyn;
    d.mul = Math.max(DYN.min, Math.min(DYN.max, (Number.isFinite(d.mul) ? d.mul : 1) + delta));
    this.saveMeta();
  }

  onBossDown() {
    if (this.state !== 'playing') return;
    /* v53 C1: ÖLÜM ANI — 1,1 sn gerçek zamanlı ağır çekim (×0,3), oyuncu
       dokunulmaz, sonra görev biter. Sim durmaz; yalnız adım hızı düşer. */
    if (!this._bossOutro) {
      this._bossOutro = 1.1;
      this.player.invuln = Math.max(this.player.invuln, 3);
      if (this.ui.bossMoment) this.ui.bossMoment('down', this.enemies.worldBoss);
      if (this.music && this.music.duck) this.music.duck(700);   // v56 B4
      this._bossDeathFx();
      return;
    }
    if (this._bossOutro > 0) return;
    this._bossOutro = 0;
    this.hitStop(FX.bossHitStopMs * 2);
    this.addShake(0.45);
    this.punch(0.06);
    this.missionComplete();
  }

  /* v54 G4: BOSS'A ÖZEL SON — dünya kimliğine göre dağılma dili. Ağır çekimin
     (×0,3) ilk karesinde ateşlenir; parçacıklar havuzdan (tahsis yok). */
  _bossDeathFx() {
    const E = this.enemies, x = E.bossDeathX || this.player.x, y = E.bossDeathY || this.player.y, R = E.bossDeathR || 60;
    const K = BOSS_DEATH[((this.worldId || 1) - 1) % BOSS_DEATH.length];
    const P = this.pools.particles;
    for (let i = 0; i < K.n; i++) {
      const a = Math.random() * Math.PI * 2, r = Math.random() * R;
      const px = x + Math.cos(a) * r, py = y + Math.sin(a) * r * 0.6;
      const sp = K.sp * (0.4 + Math.random() * 0.6);
      /* yön: 'up' ruh/ışık yükselir · 'in' içe çöker · 'out' saçılır */
      const dir = K.dir === 'up' ? -Math.PI / 2 + (Math.random() - 0.5) * 0.7 : (K.dir === 'in' ? a + Math.PI : a);
      const sx = K.dir === 'in' ? x + Math.cos(a) * R * 2.2 : px, sy = K.dir === 'in' ? y + Math.sin(a) * R * 1.4 : py;
      P.obtain(sx, sy, Math.cos(dir) * sp, Math.sin(dir) * sp, K.life * (0.7 + Math.random() * 0.6), K.size * (0.6 + Math.random() * 0.8), K.cols[i % K.cols.length], 0.93, 0, true);
    }
    const rings = this.pools.rings;
    if (rings) {
      rings.obtain(x, y, R * (K.dir === 'in' ? 0.6 : 3.4), 0.9, K.cols[0]);
      rings.obtain(x, y, R * 2, 0.6, K.cols[1] || K.cols[0]);
    }
    this.spawnText(x, y - R - 30, K.word, K.cols[0], 26, true);
    this.addShake(0.3);
  }

  /* ═══════════ ALTIN CÜZDANI (kalıcı, HER ZAMAN toplamalı) ═══════════ */

  /** Cüzdanı depodan oku — bellek değil, depo tek doğruluk kaynağı. */
  readRubies() {
    try {
      const v = Number(localStorage.getItem(RUBY_KEY));
      if (Number.isFinite(v) && v >= 0) return Math.floor(v);
    } catch (e) { /* */ }
    return this.meta ? (this.meta.rubies | 0) : 0;
  }

  /** Yakut ekle: oku → topla → yaz. Üzerine yazma imkânsız. */
  addRubies(n) {
    if (!(n > 0)) return;
    const total = this.readRubies() + Math.round(n);
    this.meta.rubies = total;
    try { localStorage.setItem(RUBY_KEY, String(total)); } catch (e) { /* */ }
    this.saveMeta();
  }

  /** Yakut harca: yetmiyorsa false. */
  spendRubies(n) {
    const cur = this.readRubies();
    if (cur < n) return false;
    const total = cur - Math.round(n);
    this.meta.rubies = total;
    try { localStorage.setItem(RUBY_KEY, String(total)); } catch (e) { /* */ }
    this.saveMeta();
    return true;
  }

  /* ═══════════ GEM (premium cüzdan, kalıcı toplamalı) ═══════════ */

  readStones() {
    try {
      const v = Number(localStorage.getItem(STONE_KEY));
      if (Number.isFinite(v) && v >= 0) return Math.floor(v);
    } catch (e) { /* */ }
    return this.meta ? (this.meta.stones | 0) : 0;
  }

  addStones(n) {
    if (!(n > 0)) return;
    const total = this.readStones() + Math.round(n);
    this.meta.stones = total;
    try { localStorage.setItem(STONE_KEY, String(total)); } catch (e) { /* */ }
    this.saveMeta();
  }

  spendStones(n) {
    const cur = this.readStones();
    if (cur < n) return false;
    const total = cur - Math.round(n);
    this.meta.stones = total;
    try { localStorage.setItem(STONE_KEY, String(total)); } catch (e) { /* */ }
    this.saveMeta();
    return true;
  }

  /** Gem paketi satın al. Pakette GERÇEK mağaza akışı (Backend.buy →
      sunucu makbuz doğrulaması → gem sunucunun cevabından); web/geliştirici
      kabuğunda eski simülasyon. Gerçek akış asenkron: UI'ya false döner,
      teslim Backend.init'in onGrant'ı ile olur (cüzdan orada tazelenir). */
  buyStonePack(id) {
    const pack = STONE_PACKS.find((p) => p.id === id);
    if (!pack) return false;
    if (Backend.billing()) { Backend.buy(id); return false; }
    this.addStones(pack.amount + pack.bonus);
    this.audio.play('stonebuy');
    this.ui.refreshWallet();
    return true;
  }

  /** Gem'i Altın'a bozdur. Yetmezse false. */
  exchangeStones(id) {
    const ex = RUBY_EXCHANGE.find((e) => e.id === id);
    if (!ex) return false;
    if (!this.spendStones(ex.stone)) { this.audio.play('error'); return false; }
    this.addRubies(ex.rubies);
    this.audio.play('buy');
    this.ui.refreshWallet();
    return true;
  }

  /* ═══════════ META (ekipman, silah, karakter) ═══════════ */

  loadMeta() {
    let m = {};
    try { m = JSON.parse(localStorage.getItem('kh_meta') || '{}'); } catch (e) { m = {}; }
    const owned = (Array.isArray(m.owned) ? m.owned : []).filter((id) => EQUIPMENT.some((e) => e.id === id));
    /* karakter başına kuşanım: { charId: { slotId: eşyaId } } — doğrulanarak yüklenir */
    const charGear = {};
    if (m.charGear && typeof m.charGear === 'object') {
      for (const cid in m.charGear) {
        if (!CHARACTERS[cid]) continue;
        const src = m.charGear[cid] || {};
        const dst = {};
        for (const s of EQUIP_SLOTS) {
          const id = src[s.id];
          const it = id ? EQUIPMENT.find((x) => x.id === id) : null;
          if (it && it.slot === s.id && owned.includes(id) && (!it.only || it.only.includes(cid))) dst[s.id] = id;
        }
        charGear[cid] = dst;
      }
    }

    const wOwned = Array.isArray(m.weaponsOwned) && m.weaponsOwned.length ? m.weaponsOwned.slice() : ['kilic'];
    if (!wOwned.includes('kilic')) wOwned.unshift('kilic');
    const wSlots = m.weaponSlots || WEAPON_SLOTS.start;
    let wEquipped = Array.isArray(m.weaponsEquipped) && m.weaponsEquipped.length ? m.weaponsEquipped : ['kilic'];
    wEquipped = wEquipped.filter((id) => wOwned.includes(id) && WEAPONS[id]).slice(0, wSlots);
    if (wEquipped.length === 0) wEquipped = ['kilic'];

    let charsOwned = Array.isArray(m.charsOwned) && m.charsOwned.length ? m.charsOwned.slice() : [DEFAULT_CHAR];
    /* Kadro küçüldüğünde eski kayıtta kalan kahraman kimlikleri temizlenir —
       yoksa artık tanımı olmayan bir id seçili kalıp menüyü boş bırakabilir. */
    charsOwned = charsOwned.filter((id) => CHARACTERS[id]);
    if (!charsOwned.includes(DEFAULT_CHAR)) charsOwned.unshift(DEFAULT_CHAR);
    /* GEÇİCİ TEST: tüm karakterleri açık başlat */
    if (UNLOCK_ALL_CHARS) { for (const id in CHARACTERS) if (!charsOwned.includes(id)) charsOwned.push(id); }
    const selectedChar = (m.selectedChar && charsOwned.includes(m.selectedChar) && CHARACTERS[m.selectedChar])
      ? m.selectedChar : DEFAULT_CHAR;

    /* KARAKTER SEVİYE + KART bankaları (CR): sahip olunan her karakter en az sv1 */
    const charLevels = (m.charLevels && typeof m.charLevels === 'object') ? { ...m.charLevels } : {};
    const charCards = (m.charCards && typeof m.charCards === 'object') ? { ...m.charCards } : {};
    /* kadrodan çıkarılmış kahramanların seviye/kart bankaları da silinir —
       yoksa kayıt dosyası ölü id'lerle şişer ve sandık istatistiği bozulur */
    for (const id in charLevels) if (!CHARACTERS[id]) delete charLevels[id];
    for (const id in charCards) if (!CHARACTERS[id]) delete charCards[id];
    for (const id of charsOwned) if (!(charLevels[id] >= 1)) charLevels[id] = 1;

    /* EŞYA SEVİYE + KART bankaları (CR): sahip olunan her eşya en az sv1 */
    const gearLevels = (m.gearLevels && typeof m.gearLevels === 'object') ? { ...m.gearLevels } : {};
    const gearCards = (m.gearCards && typeof m.gearCards === 'object') ? { ...m.gearCards } : {};
    for (const id of owned) if (!(gearLevels[id] >= 1)) gearLevels[id] = 1;

    /* ETKİNLİKLER: toplam hayatta kalma süresi + alınan ödüller */
    const ev = (m.events && typeof m.events === 'object') ? m.events : {};
    const events = {
      survTotal: Math.max(0, ev.survTotal | 0),
      claimed: Array.isArray(ev.claimed) ? ev.claimed.slice() : [],
    };

    /* SAVAŞ GEÇİŞİ: XP + premium bayrağı + alınan kademeler */
    const bp = (m.battlePass && typeof m.battlePass === 'object') ? m.battlePass : {};
    const battlePass = {
      xp: Math.max(0, bp.xp | 0),
      premium: !!bp.premium,
      claimedFree: Array.isArray(bp.claimedFree) ? bp.claimedFree.slice() : [],
      claimedPremium: Array.isArray(bp.claimedPremium) ? bp.claimedPremium.slice() : [],
    };

    /* HESAP SEVİYESİ: kalıcı, hiç sıfırlanmayan ilerleme */
    const acc = (m.account && typeof m.account === 'object') ? m.account : {};
    const level = Math.max(1, acc.level | 0 || 1);
    const account = {
      level,
      xp: Math.max(0, acc.xp | 0),
      xpNext: accountXpToNext(level),   // eğri tek kaynak: kayıttaki eski eşik okunmaz
    };

    /* GÜNLÜK/HAFTALIK: takvim dilimi. Doğrulaması dailies.js'te — tek yer. */
    const quests = normalizeQuests(m.quests);

    /* DİNAMİK ZORLUK payı — dar bantın dışındaki eski/bozuk değer 1'e düşer. */
    const dv = (m.dyn && typeof m.dyn === 'object') ? Number(m.dyn.mul) : 1;
    const dyn = { mul: Number.isFinite(dv) ? Math.max(DYN.min, Math.min(DYN.max, dv)) : 1 };

    /* CÜZDAN: TEK DOĞRULUK KAYNAĞI kendi anahtarıdır (v44).
       Eski kod iki kopyadan BÜYÜK OLANI alıyordu — yani iki anahtardan
       birini elle şişirmek yetiyordu. Artık anahtar varsa o, yoksa (v44
       öncesi çok eski kayıt) meta içindeki değer bir kez göç eder. İkisi
       de kasa imzasından geçer (vault.js). */
    const wallet = (key, legacy) => {
      try {
        const raw = localStorage.getItem(key);
        if (raw !== null) { const v = Number(raw); if (Number.isFinite(v) && v >= 0) return Math.floor(v); }
        const v = Math.max(0, legacy | 0);
        localStorage.setItem(key, String(v));
        return v;
      } catch (e) { return Math.max(0, legacy | 0); }
    };
    const rubies = wallet(RUBY_KEY, m.rubies);
    const stones = wallet(STONE_KEY, m.stones);
    /* EFSANE GARANTİSİ sayacı (chests.PITY_N) */
    const pity = Math.max(0, m.pity | 0);

    const base = { rubies, stones, owned, charGear,
             weaponsOwned: wOwned, weaponsEquipped: wEquipped, weaponSlots: wSlots,
             charsOwned, selectedChar, charLevels, charCards, gearLevels, gearCards, events, battlePass, account, dyn, quests, pity };
    /* v56 A5 · KAYIT KAYBI (KRİTİK): liste dışındaki her alan (ledger · ftue · nm · tower · seal · evo · ghost · dg · awayT)
       açılışta SİLİNİYORDU → yıldız/ustalık/kule her yeniden açılışta sıfır, mühür ödülü tekrar alınabiliyordu.
       Bilinmeyen anahtarlar olduğu gibi taşınır; doğrulama her sistemin kendi book() işlevinde. */
    for (const k in m) if (!(k in base) && m[k] != null && typeof m[k] !== 'function') base[k] = m[k];
    return base;
  }

  /** v56: koşu sonu — günlük hedefler (C2) + hayalet rekoru (D2). Sonuç ekranı _journey'yi okur. */
  _runJourney(won) {
    const r = { won, kills: this.kills | 0, lvl: this.player ? this.player.level | 0 : 0, hpFloor: this._hpFloor,
      fc: Math.max(0, (this.fieldChests ? this.fieldChests.opened | 0 : 0) - (this._fc0 | 0)), elites: this._eliteK | 0,
      evo: !!(this.weapons && this.weapons.evolved), boss: won && !!(this.msn && this.msn.isBoss) };
    const d = Daily.onRun(this, r);
    const ghostRec = Ghost.end(this);
    this.saveMeta();
    return { daily: d, ghostRec };
  }

  /** v56 C3: kutsamayı uygula (perde kapalıyken, oyuncu kurulduktan sonra). */
  applyBlessing(b) {
    if (!b || this._bless) return;
    this._bless = b;
    this.player.applyMods(b.mods);
  }

  /* v75 KASMA: savaş sürerken (saha sandığı altını, evrim keşfi, bilet XP'si…) her çağrı TÜM meta'yı
     JSON'a çevirip eşzamanlı diske yazıyordu (Android WebView'de 5-30 ms). Oynarken yalnız "kirli"
     işaretlenir; durum 'playing'den çıkınca (duraklat/kart/sonuç/menü) loop BİR kez yazar.
     Arka plana geçiş force=true ile hemen yazar. */
  saveMeta(force) {
    this.meta.awayT = Clock.now();   // v56 C5: son etkinlik (dönüş hediyesi buradan ölçer)
    if (!force && this.state === 'playing') { this._metaDirty = true; return; }
    this._metaDirty = false;
    try { localStorage.setItem('kh_meta', JSON.stringify(this.meta)); } catch (e) { /* sessiz */ }
  }

  /* ═══════════ BİLDİRİM PLANI (arka plana geçerken) ═══════════ */
  scheduleNotifications() {
    if (!Notify.available()) return;
    const c = this.chests;
    const unl = c.slots.find((x) => x && x.st === 'unlocking');
    const freeAt = Clock.now() + c.freeReadyIn();
    let dailyAt = 0;
    try {
      const q = this.meta.quests || {};
      /* Bugünün ödülü alındıysa yarın 19:00; alınmadıysa bugün 19:00 (geçmediyse). */
      const d = Clock.date(); d.setHours(19, 0, 0, 0);
      if (q.claimDay === dayKey(Clock.date()) || d.getTime() < Clock.now()) d.setDate(d.getDate() + 1);
      dailyAt = d.getTime();
    } catch (e) { /* */ }
    Notify.schedule({
      chestAt: unl ? unl.at : 0,
      freeAt: c.freeReadyIn() > 0 ? freeAt : 0,
      dailyAt,
      t: {
        chestT: 'Sandığın hazır', chestB: 'Kilidi çözüldü — ganimetin seni bekliyor.',
        freeT: 'Ücretsiz sandık', freeB: 'Yeni ücretsiz sandığın hazır.',
        dailyT: 'Günlük ödül', dailyB: 'Serini koru: bugünün ödülünü al.',
      },
    });
  }

  gearById(id) { return EQUIPMENT.find((g) => g.id === id) || null; }
  ownsGear(id) { return this.meta.owned.includes(id); }
  isEquipped(id) {
    const it = this.gearById(id);
    return !!(it && this.charGearMap()[it.slot] === id);
  }

  charDef(id) { return CHARACTERS[id || this.meta.selectedChar] || CHARACTERS[DEFAULT_CHAR]; }
  ownsChar(id) { return this.meta.charsOwned.includes(id); }

  /* ── KARAKTER SEVİYE / KART (Clash Royale) ── */
  charLevel(id) { return Math.max(1, this.meta.charLevels[id || this.meta.selectedChar] | 0) || 1; }
  charCardCount(id) { return this.meta.charCards[id] | 0; }
  cardsForNext(id) {
    const lvl = this.charLevel(id);
    return lvl >= CHAR_MAX_LEVEL ? null : CHAR_CARD_REQ[lvl + 1];
  }
  goldForNext(id) {
    const lvl = this.charLevel(id);
    return lvl >= CHAR_MAX_LEVEL ? null : CHAR_GOLD_COST[lvl + 1];
  }
  canUpgradeChar(id) {
    if (!this.ownsChar(id)) return false;
    const need = this.cardsForNext(id);
    if (need == null) return false;
    return this.charCardCount(id) >= need && this.readRubies() >= this.goldForNext(id);
  }
  upgradeChar(id) {
    if (!this.canUpgradeChar(id)) { this.audio.play('error'); return false; }
    const need = this.cardsForNext(id);
    const gold = this.goldForNext(id);
    if (!this.spendRubies(gold)) { this.audio.play('error'); return false; }
    this.meta.charCards[id] = this.charCardCount(id) - need;
    this.meta.charLevels[id] = this.charLevel(id) + 1;
    this.saveMeta();
    this.audio.play('heroup');
    this.ui.showArmory();
    return true;
  }
  /** Sandık kart düşüşü buradan geçer. İlk kart karakteri açar. */
  addCharCards(id, n) {
    if (!CHARACTERS[id] || !(n > 0)) return false;
    const firstUnlock = !this.ownsChar(id);
    this.meta.charCards[id] = (this.meta.charCards[id] | 0) + n;
    if (firstUnlock) {
      this.meta.charsOwned.push(id);
      this.meta.charLevels[id] = 1;
    }
    this.saveMeta();
    return firstUnlock;
  }

  /** Karakter satın al. cur: 'stone' → Gem, aksi halde Altın.
      Başarılıysa true. */
  buyChar(id, cur) {
    const c = CHARACTERS[id];
    if (!c || this.ownsChar(id)) return false;
    const useStone = cur === 'stone';
    const cost = useStone ? (c.stonePrice || 0) : (c.price || 0);
    if (cost <= 0) { this.audio.play('error'); return false; }
    const ok = useStone ? this.spendStones(cost) : this.spendRubies(cost);
    if (!ok) { this.audio.play('error'); return false; }
    this.grantChar(id, true);
    this.audio.play('buy');
    this.ui.showArmory();
    return true;
  }

  /** Karakteri envantere ekle (sandık düşüşü / satın alma ortak yolu). */
  grantChar(id, select) {
    if (!CHARACTERS[id] || this.ownsChar(id)) return false;
    this.meta.charsOwned.push(id);
    if (!(this.meta.charLevels[id] >= 1)) this.meta.charLevels[id] = 1;
    if (select) this.meta.selectedChar = id;
    this.saveMeta();
    return true;
  }

  selectChar(id) {
    if (!this.ownsChar(id) || !CHARACTERS[id]) return;
    this.meta.selectedChar = id;
    this.saveMeta();
    this.audio.play('select');
    /* Yeni se\u00e7ilen karakterin 3D modelini hemen \u00f6nden y\u00fckle. */
    if (this.renderer3d && this.renderer3d.preloadCharacter) this.renderer3d.preloadCharacter(id);
    this.ui.showArmory();
  }

  /* ── EŞYA SEVİYE / KART (Clash Royale) ── */
  gearLevel(id) { return Math.max(1, this.meta.gearLevels[id] | 0) || 1; }
  gearCardCount(id) { return this.meta.gearCards[id] | 0; }
  cardsForNextGear(id) {
    const lvl = this.gearLevel(id);
    return lvl >= GEAR_MAX_LEVEL ? null : GEAR_CARD_REQ[lvl + 1];
  }
  goldForNextGear(id) {
    const lvl = this.gearLevel(id);
    return lvl >= GEAR_MAX_LEVEL ? null : GEAR_GOLD_COST[lvl + 1];
  }
  canUpgradeGear(id) {
    if (!this.ownsGear(id)) return false;
    const need = this.cardsForNextGear(id);
    if (need == null) return false;
    return this.gearCardCount(id) >= need && this.readRubies() >= this.goldForNextGear(id);
  }
  upgradeGear(id) {
    if (!this.canUpgradeGear(id)) { this.audio.play('error'); return false; }
    const need = this.cardsForNextGear(id);
    const gold = this.goldForNextGear(id);
    if (!this.spendRubies(gold)) { this.audio.play('error'); return false; }
    this.meta.gearCards[id] = this.gearCardCount(id) - need;
    this.meta.gearLevels[id] = this.gearLevel(id) + 1;
    this.saveMeta();
    this.audio.play('levelup');
    return true;
  }
  /** Sandık eşya düşüşü buradan geçer: ilk kopya eşyayı açar, sonrakiler kart olarak birikir. */
  addGearCards(id, n) {
    if (!this.gearById(id) || !(n > 0)) return false;
    const firstUnlock = !this.ownsGear(id);
    if (firstUnlock) {
      this.meta.owned.push(id);
      this.meta.gearLevels[id] = 1;
      n -= 1;   // ilk kopya sahiplik açar, kart olarak sayılmaz
      const g = this.gearById(id);
      if (this.canWear(id) && !this.charGearMap()[g.slot]) this.equipGear(id, true);
    }
    if (n > 0) this.meta.gearCards[id] = this.gearCardCount(id) + n;
    this.saveMeta();
    return firstUnlock;
  }

  /** Seçili karakterin kuşanım haritası { slotId: eşyaId }. */
  charGearMap(charId) {
    const cid = charId || this.meta.selectedChar;
    if (!this.meta.charGear[cid]) this.meta.charGear[cid] = {};
    return this.meta.charGear[cid];
  }

  /** Bu eşyayı bu karakter giyebilir mi (sınıf kısıtlaması)? */
  canWear(id, charId) {
    const it = this.gearById(id);
    if (!it) return false;
    const cid = charId || this.meta.selectedChar;
    return !it.only || it.only.includes(cid);
  }

  equipGear(id, silent) {
    const it = this.gearById(id);
    if (!it || !this.ownsGear(id) || !this.canWear(id)) { this.audio.play('error'); return; }
    this.charGearMap()[it.slot] = id;
    this.saveMeta();
    if (!silent) { this.audio.play('equip'); this.ui.showArmory(); }
  }

  unequipSlot(slot) {
    const map = this.charGearMap();
    if (!map[slot]) return;
    delete map[slot];
    this.saveMeta();
    this.audio.play('click');
    this.ui.showArmory();
  }

  toggleEquip(id) {
    const it = this.gearById(id);
    if (!it || !this.ownsGear(id)) return;
    const map = this.charGearMap();
    if (map[it.slot] === id) this.unequipSlot(it.slot);
    else this.equipGear(id);
  }

  applyMetaToPlayer() {
    /* seçili karakterin üzerindeki eşyalar (sahiplik + sınıf doğrulamalı) */
    const map = this.charGearMap();
    const worn = [];
    for (const slot in map) {
      const id = map[slot];
      const it = this.gearById(id);
      if (it && it.slot === slot && this.ownsGear(id) && this.canWear(id)) {
        const mul = gearLevelMods(this.gearLevel(id));
        const scaled = {};
        for (const k in it.mods) scaled[k] = it.mods[k] * mul;
        this.player.applyMods(scaled);
        worn.push(it);
      }
    }
    applySets(this.player, worn);          // v54 H4: 2/4 parça set gücü
  }

  ownsWeapon(id) { return this.meta.weaponsOwned.includes(id); }
  isWeaponEquipped(id) { return this.meta.weaponsEquipped.includes(id); }

  buyWeapon(id) {
    if (!WEAPON_META[id] || this.ownsWeapon(id)) return;
    if (!this.spendRubies(WEAPON_META[id].unlock)) { this.audio.play('error'); return; }
    this.meta.weaponsOwned.push(id);
    if (this.meta.weaponsEquipped.length < this.meta.weaponSlots) this.meta.weaponsEquipped.push(id);
    this.saveMeta();
    this.audio.play('buy');
    this.ui.showArmory();
  }

  toggleWeapon(id) {
    if (!this.ownsWeapon(id)) return;
    const eq = this.meta.weaponsEquipped;
    const i = eq.indexOf(id);
    if (i >= 0) {
      if (eq.length <= 1) { this.audio.play('error'); return; }
      eq.splice(i, 1);
      this.audio.play('click');
    } else {
      if (eq.length >= this.meta.weaponSlots) { this.audio.play('error'); return; }
      eq.push(id);
      this.audio.play('equip');
    }
    this.saveMeta();
    this.ui.showArmory();
  }

  weaponSlotUnlockPrice() {
    const idx = this.meta.weaponSlots - WEAPON_SLOTS.start;
    if (this.meta.weaponSlots >= WEAPON_SLOTS.max) return null;
    return WEAPON_SLOTS.unlockPrice[idx] ?? null;
  }

  unlockWeaponSlot() {
    const price = this.weaponSlotUnlockPrice();
    if (price == null || !this.spendRubies(price)) { this.audio.play('error'); return; }
    this.meta.weaponSlots++;
    this.saveMeta();
    this.audio.play('buy');
    this.ui.showArmory();
  }

  saveRecord(won = false) {
    try {
      const bestT = Number(localStorage.getItem('kh_best_time') || 0);
      if (this.time > bestT) localStorage.setItem('kh_best_time', String(Math.floor(this.time)));
      const bestK = Number(localStorage.getItem('kh_best_kills') || 0);
      if (this.kills > bestK) localStorage.setItem('kh_best_kills', String(this.kills));
      if (won) localStorage.setItem('kh_boss_down', '1');
    } catch (e) { /* gizli modda localStorage kapalı olabilir */ }
    /* ETKİNLİK: toplam hayatta kalma süresini biriktir */
    if (!this.meta.events) this.meta.events = { survTotal: 0, claimed: [] };
    this.meta.events.survTotal += Math.floor(this.time);
    /* HAFTALIK GÖREVLER: ilerleme KOŞU SONUNDA yazılır (ölümde de
       zaferde de — kaybedilen koşu "boşa gitti" olmamalı). Her karede
       localStorage'a yazmak yasak; burası zaten kayıt noktası. */
    if (this.dailies) {
      this.dailies.add('kills', this.kills);
      this.dailies.add('waves', won ? this.msn.waves : Math.max(0, this.wave - 1));
      if (won) {
        this.dailies.add('missions', 1);
        if (this.msn.isBoss) this.dailies.add('boss', 1);
      }
    }
    this.saveMeta();
  }

  /* ═══════════ GÖREV/GÜNLÜK ÖDÜLÜ ═══════════
     Ödülü VEREN taraf burada: cüzdanlar ve sandık yuvaları oyunun
     malzemesi, dailies.js yalnız takvimi bilir. Geri dönüş değeri
     kullanıcıya gösterilecek metindir (null = verilemedi). */
  grantQuestReward(r) {
    if (!r) return null;
    if (r.kind === 'rubies') { this.addRubies(r.amount); return '+' + r.amount + ' ALTIN'; }
    if (r.kind === 'stone')  { this.addStones(r.amount); return '+' + r.amount + ' GEM'; }
    if (r.kind === 'chest') {
      /* Sandık yuvası doluysa ÖDÜL YANMAZ: altına çevrilir. "Yuva açılınca
         gel" demek oyuncuya aldığı ödülü geri almak gibi okunur. */
      if (this.chests.grant(r.chest)) return (CHESTS[r.chest]?.name || 'SANDIK') + ' KAZANILDI';
      const gold = 120 + (CHESTS[r.chest]?.tier | 0) * 60;
      this.addRubies(gold);
      return 'YUVA DOLU — +' + gold + ' ALTIN';
    }
    return null;
  }

  /* ── ETKİNLİK: Hayatta Kalma Kupası ── */
  survivalMinutes() { return Math.floor((this.meta.events?.survTotal | 0) / 60); }
  milestoneClaimed(id) { return !!this.meta.events?.claimed.includes(id); }
  canClaimMilestone(ms) {
    return this.survivalMinutes() >= ms.need && !this.milestoneClaimed(ms.id);
  }
  claimMilestone(id) {
    const ms = SURVIVAL_MILESTONES.find((m) => m.id === id);
    if (!ms || !this.canClaimMilestone(ms)) { this.audio.play('error'); return false; }
    const r = ms.reward;
    let toast = '';
    if (r.kind === 'rubies') {
      this.addRubies(r.amount);
      toast = '+' + r.amount + ' ALTIN';
    } else if (r.kind === 'cards') {
      this.addCharCards(r.char, r.amount);
      const nm = (CHARACTERS[r.char] && CHARACTERS[r.char].name) || 'KAHRAMAN';
      toast = '+' + r.amount + ' ' + nm + ' KARTI';
    } else if (r.kind === 'chest') {
      if (this.chests.grant(r.chest)) {
        toast = (CHESTS[r.chest]?.name || 'SANDIK') + ' KAZANILDI';
      } else {
        const comp = 200;
        this.addRubies(comp);
        toast = 'YUVA DOLU — +' + comp + ' YAKUT';
      }
    }
    this.meta.events.claimed.push(id);
    this.saveMeta();
    this.audio.play('claim');
    this.ui.toast(toast);
    this.ui.renderEvents();
    this.ui.refreshWallet();
    return true;
  }

  /* ═══════════ SAVAŞ GEÇİŞİ (Battle Pass) ═══════════ */

  bpTier() { return Math.min(BATTLE_PASS.maxTier, Math.floor(this.meta.battlePass.xp / BATTLE_PASS.xpPerTier)); }
  bpProgress() {
    const t = this.bpTier();
    if (t >= BATTLE_PASS.maxTier) return { cur: BATTLE_PASS.xpPerTier, need: BATTLE_PASS.xpPerTier };
    return { cur: this.meta.battlePass.xp - t * BATTLE_PASS.xpPerTier, need: BATTLE_PASS.xpPerTier };
  }
  addBattlePassXp(n) {
    if (!(n > 0)) return;
    const cap = BATTLE_PASS.maxTier * BATTLE_PASS.xpPerTier;
    this.meta.battlePass.xp = Math.min(cap, this.meta.battlePass.xp + Math.round(n));
    this.saveMeta();
  }
  bpHasPremium() { return !!this.meta.battlePass.premium; }

  /* ═══════════ HESAP SEVİYESİ (kalıcı) ═══════════ */
  accountLevel() { return this.meta.account.level; }
  accountProgress() { return { cur: this.meta.account.xp, need: this.meta.account.xpNext }; }
  /** Hesap XP'si ekle; bir ya da daha fazla seviye atlanırsa menüye dönüldüğünde
      gösterilmek üzere kutlama verisini kuyruğa alır (bkz. ui.showMenu). */
  addAccountXp(n) {
    if (!(n >= 0)) return;
    const a = this.meta.account;
    const fromLevel = a.level;
    a.xp += Math.round(n);
    const rewards = [];
    while (a.xp >= a.xpNext) {
      a.xp -= a.xpNext;
      a.level++;
      a.xpNext = accountXpToNext(a.level);
      const ch = accountLevelChest(a.level);
      if (ch) {
        if (!this.chests.grant(ch)) this.addRubies(150);
        rewards.push({ level: a.level, chest: ch });
      }
    }
    this.saveMeta();
    if (a.level > fromLevel) {
      if (!this._pendingLevelUp) this._pendingLevelUp = { fromLevel, toLevel: a.level, rewards: [] };
      this._pendingLevelUp.toLevel = a.level;
      this._pendingLevelUp.rewards.push(...rewards);
    }
  }
  bpBuyPremium() {
    if (this.bpHasPremium()) return false;
    if (!this.spendStones(BATTLE_PASS.premiumPrice)) { this.audio.play('error'); return false; }
    this.meta.battlePass.premium = true;
    this.saveMeta();
    this.audio.play('buy');
    return true;
  }
  bpClaimed(tier, track) {
    return this.meta.battlePass[track === 'premium' ? 'claimedPremium' : 'claimedFree'].includes(tier);
  }
  bpCanClaim(tier, track) {
    if (tier > this.bpTier()) return false;
    if (this.bpClaimed(tier, track)) return false;
    if (track === 'premium' && !this.bpHasPremium()) return false;
    return true;
  }
  /** Gizli kahraman kademesi açıldığında: o nadirlikten sahip olunmayan
      bir kahraman rastgele verilir (hangi kahraman olacağı sonradan
      netleşince buradaki BATTLE_PASS_TIERS.rarity yerine sabit id konur). */
  bpPickHiddenChar(rarity) {
    const pool = Object.values(CHARACTERS).filter((c) => (c.rarity || 1) === rarity && !this.ownsChar(c.id));
    if (pool.length) return pool[(Math.random() * pool.length) | 0].id;
    const anyPool = Object.values(CHARACTERS).filter((c) => !this.ownsChar(c.id));
    return anyPool.length ? anyPool[(Math.random() * anyPool.length) | 0].id : null;
  }
  bpClaim(tier, track) {
    if (!this.bpCanClaim(tier, track)) { this.audio.play('error'); return null; }
    const def = BATTLE_PASS_TIERS[tier - 1];
    const r = def[track];
    let toast = '';
    if (r.kind === 'rubies') { this.addRubies(r.amount); toast = '+' + r.amount + ' ALTIN'; }
    else if (r.kind === 'stone') { this.addStones(r.amount); toast = '+' + r.amount + ' GEM'; }
    else if (r.kind === 'chest') {
      if (this.chests.grant(r.chest)) toast = (CHESTS[r.chest]?.name || 'SANDIK') + ' KAZANILDI';
      else { this.addRubies(200); toast = 'YUVA DOLU — +200 YAKUT'; }
    } else if (r.kind === 'gear') {
      const pool = EQUIPMENT.filter((it) => !this.meta.owned.includes(it.id) && it.rarity <= (r.rarityMax || 4));
      if (pool.length) {
        const it = pool[(Math.random() * pool.length) | 0];
        this.meta.owned.push(it.id);
        toast = it.name + ' KAZANILDI';
      } else { this.addRubies(80); toast = '+80 ALTIN'; }
    } else if (r.kind === 'char') {
      const id = this.bpPickHiddenChar(r.rarity);
      if (id) { this.grantChar(id, false); toast = (CHARACTERS[id]?.name || 'KAHRAMAN') + ' AÇILDI'; }
      else { this.addRubies(150); toast = '+150 ALTIN'; }
    }
    this.meta.battlePass[track === 'premium' ? 'claimedPremium' : 'claimedFree'].push(tier);
    this.saveMeta();
    this.audio.play('claim');
    return toast;
  }

  /* ═══════════ GAME FEEL API ═══════════ */

  /** NO-OP (2026-08-10). Bkz. config.js → FX hit-stop notu: dondurma mobilde
      "vuruş hissi" değil KARE KAYBI olarak okunuyordu ve donan karede girdi
      birikip kontrol da gecikiyordu. İmza korunuyor ki 12 dosyadaki çağrı
      yerleri (boss uyanışı, patlama, kritik) olduğu gibi kalsın. */
  hitStop(_ms) {}

  /* v53 A6: EKRAN SARSINTISI ayarı kapalıyken sarsıntı/tekme/zoom %30'a iner
     (tamamen sıfır değil — darbe yönü hissi kalır). */
  get motionK() { return this._motionK == null ? 1 : this._motionK; }
  set motionK(v) { this._motionK = v; }

  addShake(amount) {
    this.trauma = Math.min(1, this.trauma + amount * this.motionK);
  }

  /** YÖNLÜ TEKME (v39): kamera darbe yönünde px kadar itilir ve sönümlü bir
      yayla geri gelir. Rastgele titreme "bir şey oldu" der, tekme "NEREDEN
      geldi" der. Tekmeler üst üste biner ama genlik 6 px'te kesilir; 90 ms
      hız sınırı kritik yağmurunda kameranın titremesini engeller. */
  addKick(angle, px) {
    if (this._kickT < 0.09) return;
    px *= this.motionK;
    const f = this._kickT < 0.6 ? Math.exp(-9 * this._kickT) * Math.cos(17 * this._kickT) : 0;
    let ax = this._kax * f + Math.cos(angle) * px;
    let ay = this._kay * f + Math.sin(angle) * px;
    const m = Math.hypot(ax, ay);
    if (m > 6) { ax *= 6 / m; ay *= 6 / m; }
    this._kax = ax; this._kay = ay; this._kickT = 0;
  }

  /** ZOOM VURGUSU (v39): yalnız NADİR olaylar (boss uyanışı/ölümü, elit
      düşüşü). Kamera 30 ms'de yaklaşır, ~0,5 sn'de geri çekilir. 2B katman
      aynı ölçekle büyütülür, yani hasar yazıları 3B sahneden kaymaz. */
  punch(amount) {
    amount *= this.motionK;
    this._punchA = Math.min(0.09, Math.max(this.zoomP, amount));
    this._punchT = 0;
  }

  spawnText(x, y, str, color, size, crit, ang) {
    if (typeof str === 'string' && /[A-ZÇĞİÖŞÜ]{2}/.test(str)) str = T(str);   // EN: savaş içi yazılar (önbellekli)
    if (this._bigTxt) size *= 1.22;                  // v54 E4: BÜYÜK YAZI
    return this.pools.texts.obtain(x, y, str, color, size, crit === true, ang);
  }

  spawnBurst(x, y, color, count, speed, size, life, add) {
    const P = this.pools.particles;
    if (this.isMobile) {
      count = Math.ceil(count * 0.6);
      if (P.count > 460) return;
      if (P.count > 300) count = Math.ceil(count * 0.5);
    } else {
      if (P.count > 1200) return;
      if (P.count > 780) count = Math.ceil(count * 0.45);
    }
    if (count <= 0) return;
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const v = speed * (0.35 + Math.random() * 0.65);
      P.obtain(x, y, Math.cos(a) * v, Math.sin(a) * v,
        life * (0.6 + Math.random() * 0.4),
        size * (0.6 + Math.random() * 0.8),
        color, 0.9, 0, add === true);
    }
  }

  spawnSpray(x, y, dirAngle, color, count, speed) {
    const P = this.pools.particles;
    if (this.isMobile && P.count > 400) count = Math.ceil(count * 0.5);
    for (let i = 0; i < count; i++) {
      const a = dirAngle + (Math.random() - 0.5) * 1.1;
      const v = speed * (0.4 + Math.random() * 0.6);
      P.obtain(x, y, Math.cos(a) * v, Math.sin(a) * v,
        0.32 + Math.random() * 0.25,
        1.5 + Math.random() * 2.5,
        color, 0.88, 260, false);
    }
  }

  /* ═══ GÖSTERİ KATMANI (v25) ═══════════════════════════════════
     Kullanıcı seçimi: "daha GÖSTERİŞLİ — bol parlama, iz, sarsıntı".
     Sözleşme perf.js ile ÇELİŞMEZ: parlama emissive/additive parçacıkla,
     adet `Quality.budget('particles')` ile, post-processing ve yeni ışık
     YOK. Üç kural:
     ① GÖSTERİ TEK YERDEN ÇIKAR. Dokuz karakterin dokuz vuruş efektini
       ayrı ayrı süslemek, aynı oyunda dokuz farklı geri bildirim dili
       demekti. `fxImpact` tek çağrı noktasıdır (combat.applyHit) — bir
       karakter yeni bir silah kazandığında gösteri KENDİLİĞİNDEN gelir.
     ② SIKLIK ARTTIKÇA GÖSTERİ AZALIR. Vuruş saniyede onlarca olur, ölüm
       daha seyrek, kritik en seyrek: halka ve sarsıntı yalnız seyrek
       olaylarda. Aksi hâlde "bol parlama" değil BEYAZ EKRAN olur ve
       oyuncu neyin isabet ettiğini göremez.
     ③ HALKA TAMPONU KISITLIDIR. Kalabalık dalgada her isabet bir yuva
       alırsa oyuncunun GÖRDÜĞÜ olayın halkası, görmediği olay tarafından
       tampondan atılır (applyHit'teki görüş-alanı dersinin aynısı) —
       bu yüzden küresel bir hız sınırı var (`_fxRingT`). */
  fxImpact(x, y, angle, kind, color) {
    if (!this.inView(x, y, 80)) return;
    const P = this.pools.particles;
    const cap = Quality.budget('particles');
    if (P.count > cap * 0.86) return;
    const t = this.time;
    const ring = kind >= 1 && (t - (this._fxRingT || -1)) > 0.055;
    if (ring) {
      this._fxRingT = t;
      if (kind === 1) this.pools.rings.obtain(x, y, 40, 0.22, '#ffe9a8');
      else if (kind === 2) this.pools.rings.obtain(x, y, 34, 0.20, color || '#ffd8b0');
      else this.pools.rings.obtain(x, y, 96, 0.34, '#fff0c8');
    }
    if (kind === 1) {
      /* KRİTİK YILDIZI: dört kısa çizik, İKİ ekseni de kesiyor. Dairesel
         patlama "toz" okunur; çizik "kesti" der — yön bilgisi taşır. */
      for (let i = 0; i < 4; i++) {
        const a = angle + i * 1.5708 + 0.4;
        P.obtain(x, y + 2, Math.cos(a) * 330, Math.sin(a) * 330 - 30,
          0.13, 2.6, '#fff6d8', 0.8, 30, true);
      }
    } else if (kind === 2) {
      /* ÖLÜM: yukarı süzülen kor + yere düşen koyu zerre. Ölüm 500
         düşmanlı sahnede sık bir olay: adet küçük, ömür kısa, sarsıntı YOK. */
      for (let i = 0; i < 5; i++) {
        const a = -1.5708 + (Math.random() - 0.5) * 1.5;
        P.obtain(x, y, Math.cos(a) * 90, Math.sin(a) * 150,
          0.34 + Math.random() * 0.2, 2.2, i % 2 ? '#ffd08a' : (color || '#fff2c8'),
          0.9, -70, true);
      }
    } else if (kind === 3) {
      for (let i = 0; i < 10; i++) {
        const a = Math.random() * 6.283;
        P.obtain(x, y, Math.cos(a) * 300, Math.sin(a) * 300 - 40,
          0.3, 3.4, i % 3 ? '#fff2c8' : '#ffb24d', 0.92, 20, true);
      }
      this.addShake(0.14);
      this.punch(0.022);
    }
  }

  /** NAMLU ALEVİ: atışın ÇIKTIĞI yer de bir olaydır. İki additive zerre +
      bir kısa duman; ateş etme saniyede birkaç kez olduğu için halka ve
      sarsıntı YOK (kural ②). */
  fxMuzzle(x, y, angle, color) {
    if (!this.inView(x, y, 60)) return;
    const P = this.pools.particles;
    if (P.count > Quality.budget('particles') * 0.9) return;
    for (let i = 0; i < 2; i++) {
      const a = angle + (Math.random() - 0.5) * 0.4;
      P.obtain(x + Math.cos(angle) * 16, y + Math.sin(angle) * 16 - 2,
        Math.cos(a) * 210, Math.sin(a) * 210, 0.09, 2.8 - i,
        i ? '#fff4dc' : (color || '#ffd08a'), 0.8, 0, true);
    }
  }

  spawnGem(x, y, value) {
    const g = this.pools.gems;
    if (g.count > 380) {
      /* HAVUZ TAŞMA YOLU DA NORMALİZASYONDAN GEÇER (2026-09-05, doğrulama).
         Bu satır `collectGem(value)` idi ve XP'yi ÇARPANSIZ veriyordu, yani
         bu turda kapatılan hatayı sessizce geri açıyordu: 380 cevherlik tavan
         aşıldığı anda her öldürme 1/xpMul kat (10. dünyada ×1,82) fazla XP
         veriyor ve "seviye bandı = 1" sözleşmesi kayıyordu. Tavan tam da
         acıttığı yerde aşılıyor — tezgah D10·G10'da 1840 düşman ölçtü.
         Bir ana yol düzeltildiğinde AYNI FONKSİYONU çağıran yedek yollar
         taranır (CLAUDE.md'deki "aynı yardımcıyı çağıran bütün yüzeyler"
         dersinin mantık karşılığı).
         PARA da bilerek çarpanlı verilir: taşma oyuncunun hatası değil bizim
         tampon sınırımızdır, ödülü kısmak onu cezalandırmak olurdu. */
      const xm = (this.msn && this.msn.xpMul) || 1;
      const gm = (this.msn && this.msn.gemMul) || 1;
      this.player.collectGem(value * gm, value * xm);
      return;
    }
    g.obtain(x, y, value);
  }

  /** Kan kalbi düşürür. amount: yenilenecek can. */
  spawnHeart(x, y, amount) {
    const h = this.pools.hearts;
    if (h.count > 24) return;
    h.obtain(x, y, amount);
  }

  /** Ölümde kalp düşürme zarı: temel şans düşüktür, oyuncunun canı azaldıkça
      belirgin artar (merhamet düşüşü) — boğulmak üzereyken nefes aldırır. */
  rollHeartDrop(e) {
    const p = this.player;
    if (p.hp >= p.maxHp) return;                       // can doluysa hiç düşmesin
    const lack = 1 - p.hp / p.maxHp;                   // 0 (tam) → 1 (ölümün kıyısı)
    let chance = e.isBoss ? 1 : (e.elite ? 0.10 : 0.018) + lack * lack * 0.09;
    if (Math.random() >= chance) return;
    const amount = Math.max(8, Math.round(p.maxHp * (e.isBoss ? 0.3 : 0.12)));
    this.spawnHeart(e.x, e.y, amount);
  }

  explode(x, y, dmg, radius, big) {
    const p = this.player;
    const rr = radius * (1 + p.explodeRPct);
    const d = Math.round(dmg * (1 + p.explodeDmgPct));
    const out = this.enemies.queryCircle(x, y, rr + 30, this._exScratch);
    for (let i = 0; i < out.length; i++) {
      const e = out[i];
      const dx = e.x - x, dy = e.y - y;
      const reach = rr + e.radius;
      if (dx * dx + dy * dy > reach * reach) continue;
      applyHit(this, e, d, Math.atan2(dy, dx), 300, 0, false);
    }
    /* Alan hasarı ENGELLERİ de kırar: patlamanın mezar taşına dokunmaması
       oyuncuya "bu taş dekor" der ve bütün engel sistemini yalanlar. */
    if (this.props) this.props.damageArea(x, y, rr, d * 0.55);
    this.spawnBurst(x, y, '#fff2c8', big ? 26 : 16, big ? 380 : 300, 3.5, 0.5, true);
    this.spawnBurst(x, y, COLORS.ember, big ? 22 : 14, big ? 300 : 230, 4.5, 0.55, true);
    this.spawnBurst(x, y, '#ff8a3c', big ? 16 : 10, big ? 220 : 170, 4, 0.5, true);
    this.spawnBurst(x, y, '#7d0e1c', big ? 12 : 7, 150, 3, 0.55, false);
    this.pools.rings.obtain(x, y, rr * 1.15, big ? 0.5 : 0.36, '#ffd08a');
    /* ALAN HASARI 3B MÜHRÜ: nova, şok, ayaz kabuğu, kasırga, havan ve gök
       kılıcı hepsi bu yoldan geçer — tek satır, bütün alan yeteneklerine
       ağır isabet flaşı + basık şok halkası kazandırır. */
    if (this.renderer3d && this.renderer3d.spawnHit) {
      this.renderer3d.spawnHit(x, y, 0, 2, 1, 0.82, 0.52);
    }
    this.addShake(big ? 0.16 : 0);
    if (big) this.hitStop(70);
    this.audio.play('boom');
  }

  inView(x, y, m = CULL_MARGIN) {
    return x > this.viewL - m && x < this.viewR + m &&
           y > this.viewT - m && y < this.viewB + m;
  }

  /** F12 olmadan da hata görünsün diye ekrana yapışkan bir banner basar —
      kullanıcı konsol açmadan fotoğraflayıp gönderebilsin. */
  showErrBanner(err) {
    let el = document.getElementById('__r3err');
    if (!el) {
      el = document.createElement('div');
      el.id = '__r3err';
      el.style.cssText = 'position:fixed;left:8px;right:8px;bottom:8px;z-index:99999;' +
        'background:rgba(120,10,10,0.95);color:#fff;font:11px/1.4 monospace;' +
        'padding:8px 10px;border-radius:8px;max-height:30vh;overflow:auto;' +
        'white-space:pre-wrap;pointer-events:none;';
      document.body.appendChild(el);
    }
    el.textContent = '3D HATA: ' + (err && err.message || err) + '\n' + (err && err.stack || '');
  }

  /* ═══════════ KARE DÖNGÜSÜ WATCHDOG'U ═════════════════════════
     GÖREV BAŞLANGICINDA rAF TESLİMATİ DÜŞEBİLİR ve bu, kırdığı şeye göre
     bu projede bulunmuş en sinsi hatadır: oyun "açık ama donmuş" görünür.
     durum 'playing', HUD çizili, 217 engel yüklü, konsolda tek hata YOK —
     ama `game.time` 0,00'da sabit.

     ÖLÇÜLEN KANIT: görev başladıktan sonra `this.last` 21547 iken
     `performance.now()` 37833 — kare saati 16,3 SANİYE bayat. `this.acc` ve
     `this._capTick` tanımsız, yani `loop()`un gövdesi bir kez bile
     yürümemiş. `loop(performance.now())` ELLE çağırılınca her şey kusursuz
     çalışıyor. Yani kusur delta matematiğinde DEĞİL (o üç kez onarıldı:
     perde tutması, saat kaynağı uyuşmazlığı, NaN kapısı) — zincirin
     kendisi kopuyor.

     SEBEP: görev kurulumu yüzlerce ms'lik senkron iş yapar (arena pişirme
     ~80 ms + Warmup + GLB çözümleme). Bu sürede tarayıcı/WebView bekleyen
     rAF geri çağrısını DÜŞÜREBİLİR, `loop()` hiç girmediği için bir
     sonraki kare de istenmez ve zincir sessizce biter.

     ÇÖZÜM: rAF'a GÜVENMEYEN bir bekleçi. Projenin başka yerlerinde
     kanıtlanmış kalıp (perde zamanlayıcısının `setTimeout` emniyeti,
     `objectives._arm()`in kendini onarması, input.js'in `_release()`
     yolunun idempotent olması): tek doğru yol + kendini onaran kapı.
     `setInterval` sekme arka plandayken de çalışır ama zincir zaten
     duruyorsa yeniden silahlamak zararsızdır (rAF kısılmış sekmede
     yine beklet); önplanda ise donmayı 250 ms içinde onarır.

     `_alive` bayrağı `loop()`un ilk satırında kurulur: watchdog "son
     kontrolden bu yana HERHANGİ bir kare geldi mi" diye sorar. Sadece
     `this.last`e bakmak yetmez — kare tavanı (`capEvery`) atlanan
     karelerde `last`i bilerek güncellemez, yani 30 fps tavanlı bir cihazda
     sağlıklı bir döngü bayat görünür ve watchdog boşuna tetiklenirdi. */
  _startWatchdog() {
    if (this._wd) return;
    this._alive = 1;
    this._wd = setInterval(() => {
      if (document.hidden) { this._alive = 0; return; }
      if (this._alive) { this._alive = 0; return; }
      /* iki tur boyunca hiç kare gelmedi → zincir kopmuş, yeniden silahla.
         `last` ŞU ANA çekilir: aksi halde ilk kare 16 saniyelik bir delta
         görür, akkümülatör MAX_STEPS'e çarpıp sıfırlanır ve oyuncu
         düzelme anında bir sarılıp bırakma (hitch) hisseder. */
      this.last = performance.now();
      this.acc = 0;
      requestAnimationFrame(this._loopBound);
    }, 250);
  }

  /* ═══════════ ANA DÖNGÜ ═══════════ */

  loop(now) {
    /* Kare başına kapanış (closure) tahsis etmemek için TEK kez bağlanır. */
    requestAnimationFrame(this._loopBound);
    this._alive = 1;                 // watchdog bunu okur (bkz. _startWatchdog)

    /* EKRAN TAZELEME ÖLÇÜMÜ: tavan kontrolünden ÖNCE, her rAF çağrısında.
       Atlanan kareler de sayılır — yoksa ölçüm kendi sonucunu okur ve
       tavan bölenini iptal eder (bkz. perf.js → tickRaf). */
    Quality.tickRaf(now);

    /* ══ DELTA TEK SAATTEN GELİR ══
       Eskiden delta rAF'ın verdiği `now` damgasından türetiliyordu ama
       `this.last` bazı yerlerde `performance.now()` ile yazılıyor (perde
       açılışı, duraklatma çıkışı). İkisi AYNI zaman kaynağını paylaşmak
       ZORUNDA değil: gömülü çerçevede ve bazı WebView sürümlerinde rAF
       damgası farklı bir orijinden başlar. O durumda `now - this.last`
       sürekli negatif çıkar, `rdt <= 0` her karede geri döner ve oyun
       "açık ama donmuş" görünür — durum 'playing', engeller yüklü,
       konsolda TEK hata yok. Teşhis edilmesi en zor sınıf.

       Ölçüm bunu yakaladı: game.time 0,00'da sabit kaldı. Çözüm iki
       saati barıştırmak değil, BİR saat kullanmak: delta artık her zaman
       performance.now()'dan gelir; rAF damgası yalnız tazeleme ölçümüne
       (Quality.tickRaf) girer, ki orada mutlak değer değil ARALIK
       kullanılıyor ve orijin farkı sonucu etkilemiyor. */
    const clk = performance.now();
    let rdtMs = clk - this.last;

    /* ── KARE TAVANI (rAF ÇAĞRISI SAYARAK) ──
       Simülasyon 60 Hz sabit adımla çalışıyor. 120/144 Hz ekranda çizilen
       fazla kareler görünürde hiçbir şey kazandırmaz ama GPU'yu iki kat
       çalıştırır, telefonu ısıtır ve 3–4 dakika sonra termal kısılmayla
       HERKESİ yavaşlatır. Atlanan karede this.last GÜNCELLENMEZ, böylece
       zaman birikir ve simülasyon asla kaymaz.
       KRİTİK: zaman eşiği DEĞİL sayaç kullanılıyor — rAF yalnızca tazeleme
       katlarında ateşlenir ve 60, 90 Hz'in katı değildir. Eşikle 90 Hz'de
       11.1 ms'lik kareler atlanıp efektif 45 fps + kararsız tempo çıkıyordu.
       Şimdi: 120/144 Hz → her 2. kare, 90 Hz → hiç atlama (90 fps),
       60 Hz → hiç atlama. */
    const every = Quality.capEvery();
    if (every > 1) {
      this._capTick = (this._capTick || 0) + 1;
      /* ZAMAN EMNİYET SUPABI: atlama, çizilen kareler arasındaki aralığı
         tavan periyodunun ötesine ASLA uzatmasın. Panel adaptifse (120↔60)
         bölen bir sonraki ölçüm penceresine kadar bayat kalabilir; o
         pencerede bu kontrol 30 fps'e düşmeyi engeller:
         60 Hz'de rdtMs≈16.6 ≥ 15.6 → "geç" → kare çizilir. */
      const late = rdtMs >= 1000 / Quality.capFps - 1;
      if (this._capTick % every !== 0 && !late) return;
    }

    this.last = clk;
    let rdt = rdtMs / 1000;
    if (rdt > 0.1) rdt = 0.1;
    /* NEGATİF/SIFIR DELTA DÖNGÜYÜ KİLİTLEMEZ.
       Eski kod `if (rdt <= 0) return;` diyordu ve bu KALICI bir kilit
       üretebiliyor: rAF zaman damgası ile performance.now() aynı zaman
       kaynağını paylaşmazsa (gömülü çerçeve, bazı WebView sürümleri,
       arka plandan dönüş) `now - this.last` sürekli negatif kalır ve her
       kare bu satırdan geri döner — oyun "açık ama donmuş" görünür,
       konsolda hiçbir hata olmaz. Teşhis edilmesi en zor sınıf: sessiz,
       hatasız, kalıcı. Ölçüm bunu yakaladı (game.time 0,00'da sabit).
       Çözüm: sıfır/negatif deltayı ATLA ama saati ŞU ANA hizala, böylece
       bir sonraki kare pozitif delta görür — müzikteki resync() ile aynı
       mantık, aynı sebep. */
    /* NaN KONTROLÜ POZİTİF TESTLE YAPILIR.
       `rdt <= 0` bir NaN'ı YAKALAMAZ: NaN ile yapılan her karşılaştırma
       false döner, yani NaN bu kapıdan geçer, akümülatöre girer
       (`acc = acc + NaN` → NaN) ve `while (acc >= STEP)` bir daha ASLA
       çalışmaz. Sonuç: rAF 60 fps'te döner, Quality 60 fps ölçer, HUD
       çizilir, konsolda tek hata yok — ama simülasyon hiç adım atmaz.
       Oyun "açık ve akıcı" görünürken tamamen donmuştur. Ölçüm bunu
       ancak game.time'ı iki kez okuyarak yakaladı (0,00 → 0,00, fps 60).

       `!(rdt > 0)` üç durumu birden kapatır: NaN, sıfır, negatif. Sayısal
       bir kapı yazarken pozitif testi tercih et — olumsuz test NaN'ı
       sessizce içeri alır. */
    if (!(rdt > 0)) { this.last = clk; return; }

    /* Uyarlanır kalite: kare süresi + sivri uç tabanlı (bkz. perf.js).
       Ölçek değişirse yalnızca WebGL katmanı yeniden boyutlanır — 2D
       katman ve vinyet dokunulmaz. */
    /* Quality'ye KIRPILMIŞ delta gider (rdt zaten 0.1 sn'ye kırpıldı).
       Ham rdtMs geçildiğinde yükleme duraklamaları ölçüm sayılıyordu. */
    if (Quality.sample(rdt * 1000, this.state === 'playing')) {
      this.renderScale = Quality.scale;      // geriye dönük uyumluluk aynası
      if (this.renderer3d) this.renderer3d.resize();
    }
    if (this.state === 'playing') PerfLog.push(rdt * 1000);
    this.fpsEma = Quality.fps;

    this.trauma = Math.max(0, this.trauma - FX.shakeDecay * rdt);
    /* PÜRÜZSÜZ SARSINTI (v39). Eskisi her karede Math.random() idi: kare
       başına bağımsız zıplama "ucuz titreme" okunur ve 120 Hz panelde
       60 Hz'den iki kat sert görünür (frekansı KARE HIZI belirler). Yerine
       iki oransal sinüs toplamı (≈6 + ≈14 Hz): frekansı ZAMAN belirler,
       her panelde aynı hareket. Travma² eğrisi ve tavan (FX) aynen. */
    this._shT += rdt;
    if (this._shT > 1e4) this._shT = 0;
    const t2 = this.trauma * this.trauma;
    let shx = 0, shy = 0, shr = 0;
    if (t2 > 1e-4) {
      const T = this._shT * 38;
      const amp = t2 * FX.maxShakePx;
      shx = (Math.sin(T + 0.3) * 0.62 + Math.sin(T * 2.37 + 1.7) * 0.38) * amp;
      shy = (Math.sin(T * 1.13 + 2.1) * 0.62 + Math.sin(T * 2.71 + 0.4) * 0.38) * amp;
      shr = Math.sin(T * 0.83 + 4.2) * t2 * 0.012;          // ≤ 0,7° yuvarlanma
    }
    if (this._kickT < 0.6) {
      /* önce oku, sonra ilerlet: tekmenin TEPESİ darbenin çizildiği ilk
         karede görünsün (ters sırada 60 Hz'de genliğin %17'si kayboluyordu) */
      const f = Math.exp(-9 * this._kickT) * Math.cos(17 * this._kickT);
      this._kickT += rdt;
      shx += this._kax * f; shy += this._kay * f;
    }
    this.shakeX = shx; this.shakeY = shy; this.shakeR = shr;
    if (this._punchT < 0.9) {
      this._punchT += rdt;
      const u = this._punchT;
      /* (1−e^−34u)·e^−6u eğrisinin tepesi 0,61 — 1,64 ile normalize: punch(x)
         ekranda TAM x kadar yaklaşır (ölçüldü, _feeltest D) */
      this.zoomP = this._punchA * 1.64 * (1 - Math.exp(-34 * u)) * Math.exp(-6 * u);
      if (this._punchT >= 0.9) this.zoomP = 0;
    }

    /* v62: kutsama seçimi açıkken sim TAMAMEN donuk. Eskiden freeze 2,3 sn'de kare
       döngüsünde eriyordu, release yalnız sıfırlıyordu → seçim sürerken düşmanlar yürüyordu.
       Tutmayı yalnız kullanıcı dokunuşu (showBlessPick → onPick) bırakır; döngüden bağımsız. */
    if (this._metaDirty && this.state !== 'playing') this.saveMeta();   // v75: ertelenmiş kayıt
    if (this.ui._ldHold) { this.last = now; this.render(); return; }
    if (this.freeze > 0) {
      this.freeze -= rdt;
      this.render();
      return;
    }
    /* freeze negatife düşerse temizle: kalıntı bir eksi değer sonraki
       hit-stop'un max() hesabını bozuyordu. */
    if (this.freeze < 0) this.freeze = 0;

    if (this.state === 'playing') {
      /* acc bir kez NaN olduysa toplama onu asla temizlemez — sıfırla.
         Yukarıdaki kapı NaN'ı artık geçirmiyor ama bu satır kalıcı
         hasarı da onarır (kendini onaran durum, joystick dersi). */
      if (!(this.acc >= 0)) this.acc = 0;
      if (this._bossOutro > 0) {
        this._bossOutro -= rdt;
        if (this._bossOutro <= 0) { this._bossOutro = -1; this.onBossDown(); }
      }
      if (this._dying > 0) {
        this._dying -= rdt;
        if (this._dying <= 0) { this._dying = -1; this.gameOver(); }
      }
      this.acc += this._bossOutro > 0 ? rdt * 0.3 : (this._dying > 0 ? rdt * 0.25 : rdt);
      let steps = 0;
      while (this.acc >= STEP && steps < MAX_STEPS) {
        this.update(STEP);
        this.acc -= STEP;
        steps++;
      }
      if (steps === MAX_STEPS) this.acc = 0;
    }

    this.render();
  }

  /* ═══════════ SİMÜLASYON ═══════════ */

  update(dt) {
    this.time += dt;
    if (Quality.stress >= 0.66) this._stressT = (this._stressT || 0) + dt;   // v60 öğrenilen kademe ölçüsü
    /* Can tabanı: bölünme + karşılaştırma, tahsis yok. Dinamik zorluk payı
       "sıkıştı mı" sorusunu buradan okur — ölüm sayısı tek başına yeterli
       değil: son canıyla geçen oyuncu da zorlanmıştır. */
    if (this.player.maxHp > 0) {
      const f = this.player.hp / this.player.maxHp;
      if (f < this._hpFloor) this._hpFloor = f;
    }

    this.player.update(dt);
    if (this.props) this.props.update(dt);
    if (this.objectives) this.objectives.update(dt);
    if (this.powerups) this.powerups.update(dt);
    if (this.fieldChests) this.fieldChests.update(dt);
    this.ult.update(dt);
    this.events.update(dt);
    this.mode.update(dt);
    if (Ftue.step) Ftue.update(this, dt);
    Ghost.tick(this, dt);
    this.weapons.update(dt);
    this.enemies.update(dt);
    this.updateGems(dt);
    this.updateHearts(dt);
    this.updatePowerups(dt);
    this.updateParticles(dt);
    this.updateTexts(dt);
    this.updateRings(dt);
    this.updateHazards(dt);

    /* v56 B3 · ÖNE BAKAN KAMERA: hareket yönüne ekranın ~%8'i kadar önden bakar, yayla döner.
       Hareketi azalt / sarsıntı kapalıyken yarıya iner. Tahsis yok. */
    const la = (this.motionK < 1 || document.documentElement.classList.contains('rm')) ? 0.04 : 0.08;
    const lk = Math.min(1, 2.4 * dt), mx = this.input.mx || 0, my = this.input.my || 0;
    this._lookX = (this._lookX || 0) + (mx * this.w * la - (this._lookX || 0)) * lk;
    this._lookY = (this._lookY || 0) + (my * this.h * la * 0.8 - (this._lookY || 0)) * lk;
    const k = Math.min(1, 6.5 * dt);
    this.cam.x += (this.player.x + this._lookX - this.cam.x) * k;
    this.cam.y += (this.player.y + this._lookY - this.cam.y) * k;

    /* kamera arena görseli dışına taşmasın */
    if (this.arena) {
      const A = this.arena;
      const hw = this.w / 2, hh = this.h / 2;
      if (A.w > this.w) this.cam.x = Math.max(A.x0 + hw, Math.min(A.x0 + A.w - hw, this.cam.x));
      else this.cam.x = 0;
      if (A.h > this.h) this.cam.y = Math.max(A.y0 + hh, Math.min(A.y0 + A.h - hh, this.cam.y));
      else this.cam.y = 0;
    }

    /* NOT: bu s\u0131n\u0131rlar eskiden d\u00fczd\u00fc (1 d\u00fcnya birimi = 1 ekran pikseli
       varsay\u0131m\u0131) — ama 3D kameras\u0131 art\u0131k farkl\u0131 bir zoom (1.05x geri \u00e7ekilmi\u015f)
       VE e\u011fik a\u00e7\u0131 (dikey eksende cos(tilt) ile geni\u015fleyen g\u00f6r\u00fc\u015f) kullan\u0131yor.
       Bu y\u00fczden asl\u0131nda ekranda G\u00d6R\u00dcNEN alan, buradaki eski hesab\u0131n
       varsayd\u0131\u011f\u0131ndan hem yatayda biraz daha dar hem dikeyde (\u00f6zellikle
       "yukar\u0131" y\u00f6n\u00fcnde) belirgin \u015fekilde daha geni\u015f — d\u00fc\u015fmanlar/mermiler/
       cevherler ekranda hâlâ g\u00f6r\u00fcn\u00fcrken erken silinip "kayboluyor" gibi
       duruyordu (\u00f6zellikle \u00fcst kenara yak\u0131n bölgelerde). Ger\u00e7ek 3D kamera
       frustumundan (render3d.js) birebir okuyoruz ki oynan\u0131\u015f s\u0131n\u0131r\u0131 g\u00f6rsel
       s\u0131n\u0131rla TAM e\u015fle\u015fsin. */
    const r3 = this.renderer3d;
    if (r3 && r3.camera) {
      /* +140 birimlik cömert güvenlik payı: kamera/zoom hesaplarında ufak bir
         sapma olsa bile hiçbir şey ekranda görünürken erken kaybolmasın. */
      const PAD = 140;
      this.viewL = this.cam.x + r3.camera.left - PAD;
      this.viewR = this.cam.x + r3.camera.right + PAD;
      this.viewT = this.cam.y - r3.camera.top - PAD;
      this.viewB = this.cam.y + r3.camera.top + PAD;
    } else {
      this.viewL = this.cam.x - this.w / 2;
      this.viewR = this.cam.x + this.w / 2;
      this.viewT = this.cam.y - this.h / 2;
      this.viewB = this.cam.y + this.h / 2;
    }

    /* HUD ARTIK BURADA DEĞİL: DOM yazımı simülasyon adımına bağlıydı,
       yoğun karede sim 2-3 kez adımlanınca stil geçersizleştirmesi de o
       kadar kez tekrarlanıyordu. Kare tarafına, ~20 Hz'e taşındı
       (bkz. render()). */

    /* SEVİYE ATLAMA KART EKRANI 2 SANİYE GECİKMELİ (kullanıcı isteği).
       Sebep: seviye kalabalığın tam ortasında atlanır ve oyun O ANDA
       duruyordu — savurduğu kılıcın ortasında kesilen oyuncu kartı ödül
       değil KESİNTİ olarak okuyor. İki saniye vuruşun bitmesine, yakutların
       toplanmasına ve "seviye atladım" hissinin oturmasına yetiyor.
       Sayacin kendisi kapı görevi de yapar: `_lvDelay > 0` iken ikinci bir
       kart yolu (dalga sonu, görev ödülü) devreye girse ekran iki kez
       açılıp bir seçim yenirdi. */
    if (this.player.pendingLevels > 0 && this._lvDelay <= 0) {
      this._lvDelay = 2.0;
      this.ui.banner('SEVİYE ' + this.player.level, '');
      this._levelRise();                   // v70 A7
    }
    if (this._lvDelay > 0) {
      this._lvDelay -= dt;
      if (this._lvDelay <= 0) {
        this._lvDelay = 0;
        if (this.player.pendingLevels > 0) { this.enterLevelUp(); return; }
      }
    }

    if (this.isBossWave(this.wave)) {
      if (this.enemies.bossDefeated) this.onBossDown();
    } else {
      this.waveTimer -= dt;
      if (this.waveTimer <= 1.5) this.enemies.spawning = false;
      /* v70 C4 HASAT: son dalga değilse 0,9 sn kala yerdeki bütün ruhlar oyuncuya akar */
      if (this.waveTimer <= 0.9 && !this._harvested && this.wave < this.msn.waves) this._harvestSouls();
      if (this.waveTimer <= 0) this.endWave();
    }
  }

  updateGems(dt) {
    const p = this.player;
    /* Mıknatıs gücü etkinken çekim yarıçapı ×4,5 (10 sn) */
    const mag = p.magnet * (this.powerups ? this.powerups.magnetMul() : 1);
    const magnet2 = mag * mag;
    const pickup2 = (p.radius + PLAYER_PICKUP) * (p.radius + PLAYER_PICKUP);
    const game = this;

    this.pools.gems.updateEach(function (g) {
      const dx = p.x - g.x;
      const dy = p.y - g.y;
      const d2 = dx * dx + dy * dy;

      if (d2 < pickup2) {
        /* İKİ AYRI SAYI: para gemMul ile çarpılır (ödül), koşu XP'si görevin
           `xpMul`ı ile normalize edilir (ilerleme). Bkz. player.collectGem. */
        p.collectGem(g.value * game.msn.gemMul, g.value * (game.msn.xpMul || 1));
        game.audio.play('gem');
        game.spawnBurst(g.x, g.y, GEM_TIERS[g.tier].color, 3, 60, 2, 0.25, true);
        return true;
      }

      if (g.pull || d2 < magnet2) {
        g.pull = true;
        /* EMİLME EĞRİSİ (v39): sabit hızla sürüklenen cevher "kayar"; premium
           dil BEKLENTİ + HIZLANMA'dır. İlk 70 ms küçük bir geri sekme, sonra
           karesel hızlanma (tavan 1150 px/sn — adım başına 19 px, toplama
           yarıçapı 32 px: üzerinden atlayamaz). */
        g.pt += dt;
        const d = Math.sqrt(d2) || 1;
        const u = g.pt - 0.07;
        const pullSpeed = u < 0 ? -130 * (-u / 0.07)
          : Math.min(1150, 320 + 900 * u + 5200 * u * u);
        g.vx = (dx / d) * pullSpeed;
        g.vy = (dy / d) * pullSpeed;
      } else {
        g.vx *= 0.86;
        g.vy *= 0.86;
        g.bob += dt * 3;
      }
      g.x += g.vx * dt;
      g.y += g.vy * dt;
      return false;
    });
  }

  updateHearts(dt) {
    const p = this.player;
    /* kalpler cevherlerden daha erken çekilir (mıknatısın %70'i kadar) ki
       çatışmanın ortasında paniğe kapılmış oyuncu kolay yakalayabilsin */
    const mag = p.magnet * 1.0 * (this.powerups ? this.powerups.magnetMul() : 1);
    const magnet2 = mag * mag;
    const pickup2 = (p.radius + PLAYER_PICKUP + 6) * (p.radius + PLAYER_PICKUP + 6);
    const game = this;

    this.pools.hearts.updateEach(function (h) {
      h.life -= dt;
      if (h.life <= 0) return true;
      const dx = p.x - h.x;
      const dy = p.y - h.y;
      const d2 = dx * dx + dy * dy;

      if (d2 < pickup2) {
        p.heal(h.amount);
        game.audio.play('heal');
        game.spawnBurst(h.x, h.y, '#ff4a5e', 6, 90, 2.5, 0.3, true);
        game.spawnBurst(h.x, h.y, '#ffd0d6', 4, 60, 2, 0.25, true);
        game.pools.rings.obtain(h.x, h.y, 46, 0.3, '#ff5a6e');
        return true;
      }

      if (h.pull || d2 < magnet2) {
        h.pull = true;
        const d = Math.sqrt(d2) || 1;
        h.vx = (dx / d) * 340;
        h.vy = (dy / d) * 340;
      } else {
        h.vx *= 0.84;
        h.vy *= 0.84;
        h.bob += dt * 3;
      }
      h.x += h.vx * dt;
      h.y += h.vy * dt;
      return false;
    });
  }

  /* DÜŞEN GÜÇLER: kalpten iki farkı var — mıknatıs YARIÇAPI daha geniş
     (önemli ödül kaçırmak sinir bozar) ve son 5 saniyede yanıp söner. */
  updatePowerups(dt) {
    const p = this.player;
    const mag = p.magnet * 1.35;
    const magnet2 = mag * mag;
    const pickup2 = (p.radius + PLAYER_PICKUP + 12) * (p.radius + PLAYER_PICKUP + 12);
    const game = this;
    this.pools.powerups.updateEach(function (o) {
      o.life -= dt;
      if (o.life <= 0) return true;
      const dx = p.x - o.x, dy = p.y - o.y;
      const d2 = dx * dx + dy * dy;
      if (d2 < pickup2) {
        game.powerups.collect(o.kind);
        game.pools.rings.obtain(o.x, o.y, 62, 0.35, PU[o.kind].col);
        return true;
      }
      if (o.pull || d2 < magnet2) {
        o.pull = true;
        const d = Math.sqrt(d2) || 1;
        o.vx = (dx / d) * 300;
        o.vy = (dy / d) * 300;
      } else {
        o.vx *= 0.86; o.vy *= 0.86;
        o.bob += dt * 2.6;
      }
      o.x += o.vx * dt;
      o.y += o.vy * dt;
      return false;
    });
  }

  /** TEHLİKE ALANLARI. Hasarın TAMAMI burada verilir — kralın nabzı da
      ejderin bombası da kendi hasarını yazmaz, alan yazar. Tek yer, tek
      kural: dokunulmazlık, zırh ve vinyet damagePlayer'dan geçer. */
  updateHazards(dt) {
    const game = this;
    const p = this.player;
    this.pools.hazards.updateEach(function (o) {
      o.t += dt;
      const dx = p.x - o.x, dy = p.y - o.y;
      if (o.kind === 0) {
        if (!o.hit && o.t >= o.tell) {
          o.hit = true;
          const rr = o.r + p.radius;
          if (dx * dx + dy * dy < rr * rr) damagePlayer(game, o.dmg, o.x, o.y);
          /* PATLAMA ANİ GÖRÜNÜR OLMAK ZORUNDA: telegraf halkası sönüp
             hiçbir şey olmazsa oyuncu "kaçtım mı, yedim mi" bilemez. */
          const col = o.hue ? '#7bd66a' : '#ff4a5e';
          game.pools.rings.obtain(o.x, o.y, o.r * 1.06, 0.34, col);
          game.spawnBurst(o.x, o.y, col, 9, 210, 3, 0.5, true);
          if (game.renderer3d && game.renderer3d.spawnHit && game.inView(o.x, o.y, 60)) {
            if (o.hue) game.renderer3d.spawnHit(o.x, o.y, 0, 2, 0.42, 1.0, 0.34);
            else game.renderer3d.spawnHit(o.x, o.y, 0, 2, 1.0, 0.24, 0.28);
          }
          game.addShake(0.10);
          if (game.audio) game.audio.play('bombhit');
          /* ── FAZ 2: ZEHİR GÖLÜ ──
             Ejderin bombası patladığı yerde kalıcı bir göl bırakır ve AYNI
             yuva onu sürer: kind 1'e geçer, saat sıfırlanır. Patlama tek
             seferlik hasarı, göl yarım saniyelik tik verir — oyuncuyu YER
             DEĞİŞTİRMEYE zorlayan kısım budur. */
          if (o.pdur > 0) {
            o.kind = 1; o.t = 0; o.dur = o.pdur;
            o.dmg = o.pdmg; o.tick = 0.5; o.hue = 1;
            return false;
          }
        }
        return o.t >= o.dur;
      }      /* KALICI ZEHİR — yarım saniyeden kısa tik "ani ölüm" gibi okunur */
      o.tick -= dt;
      if (o.tick <= 0) {
        o.tick = 0.5;
        const rr = o.r + p.radius;
        if (dx * dx + dy * dy < rr * rr) damagePlayer(game, o.dmg, o.x, o.y);
      }
      return o.t >= o.dur;
    }, dt);
  }

  /** TEHLİKE ALANI DOĞUR — tek kapı.
   *
   * `Pool` tavanı YUMUŞAK: dolduğunda yeni nesne üretip büyüyor (ÖLÇÜLDÜ —
   * 12 tavanlı havuz 16 aktif nesneye çıktı). Bu, "fazlası sessizce düşer"
   * varsayımını çürütür ve tehlike alanında ciddi bir hataya yol açıyordu:
   * görsel mesh sayısı HAZARD_CAP kadar sabit, yani tavanı aşan alan
   * GÖRÜNMEDEN hasar veriyordu — kendi "uyarısız alan hasarı yasak"
   * kuralının ihlali.
   *
   * Doluysa YENİ istek REDDEDİLİR (eski alan iptal edilmez): telegrafı
   * çizilmiş, oyuncunun ondan kaçmaya başladığı bir alanı yenisi için
   * söndürmek, oyuncunun okuduğu sözü bozmak olur.
   */
  spawnHazard(x, y, r, dmg, tell, dur, kind, hue, pdur, pdmg) {
    if (this.pools.hazards.active.length >= HAZARD_CAP) return null;
    return this.pools.hazards.obtain(x, y, r, dmg, tell, dur, kind, hue, pdur, pdmg);
  }

  updateRings(dt) {
    this.pools.rings.updateEach(function (o) {
      o.life -= dt;
      if (o.life <= 0) return true;
      o.r = o.max * (1 - o.life / o.maxLife);
      return false;
    });
  }

  updateParticles(dt) {
    this.pools.particles.updateEach(function (o) {
      o.life -= dt;
      if (o.life <= 0) return true;
      o.vy += o.grav * dt;
      o.vx *= o.drag;
      o.vy *= o.drag;
      o.x += o.vx * dt;
      o.y += o.vy * dt;
      return false;
    });
  }

  updateTexts(dt) {
    this.pools.texts.updateEach(function (o) {
      o.life -= dt;
      if (o.life <= 0) return true;
      o.pt += dt;
      o.x += o.vx * dt;
      o.vx *= 0.9;
      o.y += o.vy * dt;
      o.vy *= 0.94;
      return false;
    });
  }

  /* ═══════════ RENDER ═══════════ */

  render() {
    /* v73 PERF · SAHNE KAPISI
       ① MENÜ: ana ekran OPAK, savaş sahnesi arkasında hiç görünmez ('menu' durumunda sahnenin
          görünmesi gereken an yok — kapı açılmadan beginWave 'playing' yazar). Eskiden her karede
          tam 3B + 2B çiziliyordu: menü/mağaza GPU'yu görünmeyen sahneyle paylaşıyordu.
       ② KAPLAMA (duraklat · kart · zafer/yenilgi): sim donuk; 30 kare sonra sahne DONAR, tuval son
          kareyi gösterir. Sarsıntı/yakınlaşma sürerken beklenir; boyut değişirse (resize, geri
          dönüş, kalite) render3d._needsFrame bir tur daha çizdirir. */
    if (this.audio) this.audio._calm = this.state !== 'playing';   // v73b: ses bankası yalnız sakin anda pişirir
    if (this.state === 'menu') {
      if (!this._menuSkip) {
        this._menuSkip = true;
        document.documentElement.classList.add('sr-menu');
        this.ctx.clearRect(-8, -8, this.w + 16, this.h + 16);
        if (this._dangerOn) { this._dangerOn = false; if (this._dangerEl) this._dangerEl.classList.remove('on'); }
        if (this.music.playing) { this.music.setDanger(false); this.music.setThin(false); }
      }
      return;
    }
    if (this._menuSkip) { this._menuSkip = false; document.documentElement.classList.remove('sr-menu'); }
    const r3s = this.renderer3d, st = this.state;
    if (st === 'paused' || st === 'levelup' || st === 'gameover' || st === 'victory') {
      if (r3s && r3s._needsFrame) { r3s._needsFrame = false; this._stillN = 0; }
      this._stillN = (this._stillN | 0) + 1;
      if (this._stillN > 30 && this.trauma < 0.02 && this.zoomP < 5e-4) return;
    } else {
      this._stillN = 0;
      if (r3s) r3s._needsFrame = false;
    }
    const ctx = this.ctx;
    const w = this.w, h = this.h;

    /* NOT: bu clearRect, translate()'ten ÖNCE — yani kanvas-yerel (0..w, 0..h)
       uzayda çalışır. Eskiden buraya YANLIŞLIKLA world-uzayı viewL/viewT
       (kameraya göre kayan de\u011ferler) veriliyordu; oyuncu dünya merkezinden
       uzaklaştıkça temizlenen dikdörtgen gerçek kanvas alanından kayıyor,
       hiçbir zaman tam temizlenmiyordu — bu da uçan hasar yazılarının (ve
       joystick'in) her karede temizlenmeden üst üste birikip "kement/şerit"
       gibi bir bulanıklık izi bırakmasına yol açıyordu. */
    ctx.clearRect(-8, -8, w + 16, h + 16);

    /* ── 3D SAHNE: zemin, Kurt (FBX), düşmanlar, mermiler, efektler ──
       try/catch: 3D sahnede beklenmedik bir hata olursa tüm sahnenin
       süresiz kararmasını/kaybolmasını önler — hatayı konsola yazar,
       bir sonraki karede normal render'a devam edilmeye çalışılır. */
    if (this.renderer3d) {
      /* Her karede context'in canlı olduğunu doğrula — 'webglcontextlost'
         olayı bazı tarayıcılarda gecikir/atlanır; proaktif kontrol savaş
         alanının süresiz kararmasını kesin olarak önler. */
      if (this.renderer3d.contextIsLost()) {
        this.renderer3d.recover();
      } else {
        try {
          this.renderer3d.render(this);
        } catch (err) {
          if (!this._r3ErrLogged || performance.now() - this._r3ErrLogged > 3000) {
            this._r3ErrLogged = performance.now();
            console.error('3D render hatası (bu kare atlandı):', err);
            this.showErrBanner(err);
          }
        }
      }
    }

    /* ── 2D üst katman: yalnız uçan hasar yazıları + joystick (can barı artık 3D billboard) ── */
    ctx.save();
    if (this.zoomP > 5e-4) {
      /* zoom vurgusu 3B kamerayı yaklaştırır; 2B katman merkez etrafında aynı
         oranda büyür (dünya birimi ≈ px sözleşmesi, bkz. render3d.resize) */
      const z = 1 / (1 - this.zoomP);
      ctx.translate(w / 2 + this.shakeX, h / 2 + this.shakeY);
      ctx.scale(z, z);
      ctx.translate(-this.cam.x, -this.cam.y);
    } else {
      ctx.translate(
        Math.round(w / 2 - this.cam.x + this.shakeX),
        Math.round(h / 2 - this.cam.y + this.shakeY)
      );
    }
    this.renderTexts(ctx);
    /* GÖREV ÇIPALARI + DÜŞEN GÜÇLER de bu dünya-uzayı bloğunda çizilir.
       Neden 2D: #game katmanı ASLA ölçeklenmez (CLAUDE.md katman mimarisi),
       yani hedef halkası ve güç pulu dinamik çözünürlük düştüğünde de tam
       netlikte kalır — oyuncunun GİTMESİ gereken yeri gösteren işaretin
       bulanıklaşması anlaşılırlık kaybıdır. */
    this.renderObjective(ctx);
    this.renderPowerups(ctx);
    if (this.fieldChests) this.fieldChests.render(ctx);
    /* v49: GÖREV OKU oyuncunun YANINDA (ekran kenarı pusulası + mini harita
       kalktı, kullanıcı). Dünya uzayında: kahramanla birlikte akar. */
    if (this.state === 'playing') { this.mode.render(ctx); this.events.render(ctx); this.ult.render(ctx); this.mode.arrow(ctx); this.events.arrow(ctx); this.renderObjectiveArrow(ctx); }
    ctx.restore();

    this.input.render(ctx);

    /* HUD: kare tarafında ve ~20 Hz. Bir XP çubuğu / dalga sayacı için
       fazlasıyla yeterli; kalan bütçe oynanışa gider. Değer değişmediğinde
       updateHUD zaten DOM'a dokunmaz. */
    this._hudTick = (this._hudTick || 0) + 1;
    if (this.state === 'playing' && this._hudTick % 3 === 0) {
      this.ui.updateHUD();
      /* TEHLİKE VİNYETİ (v39): can %30'un altında kenarlar nabız atar. Eşik
         müziğin setDanger eşiğiyle AYNI — göz ve kulak aynı anda uyarır.
         Yalnız sınıf değişince DOM'a dokunulur; animasyon opaklık (bileşik). */
      const dz = this.player.hp > 0 && this.player.hp <= this.player.maxHp * 0.3;
      if (dz !== this._dangerOn) {
        this._dangerOn = dz;
        const el = this._dangerEl || (this._dangerEl = document.getElementById('danger-vignette'));
        if (el) el.classList.toggle('on', dz);
      }
      /* v70 A6: kalp atışı sesi vinyet nabzıyla aynı ritimde (1,05 sn) */
      if (dz && this.time - (this._hbAt || -9) > 1.05) { this._hbAt = this.time; this.audio.play('heartbeat'); }
    } else if (this._dangerOn && this.state !== 'playing' && this.state !== 'paused') {
      this._dangerOn = false;
      if (this._dangerEl) this._dangerEl.classList.remove('on');
    }

    /* MÜZİK, HUD İLE AYNI 20 Hz'TE SÜRÜLÜR — her karede değil.
       setDanger/setThin yalnızca bayrak yazar (ses düğümüne dokunmaz), ama
       her karede çağırmanın hiçbir kazancı yok: müzik bar sınırında karar
       veriyor. Perf sözleşmesi kural 1: sıcak döngüde iş yapma. */
    if (this._hudTick % 3 === 0 && this.music.playing) {
      this.music.setDanger(this.state === 'playing' && this.player.hp <= this.player.maxHp * 0.3);
      this.music.setThin(Quality.stress > 0.5);
    }

    Perf.frame(this);
  }

  renderGems(ctx) {
    const t = this.time;
    const game = this;
    this.pools.gems.each(function (g) {
      if (!game.inView(g.x, g.y, 24)) return;
      const tier = GEM_TIERS[g.tier];
      const bob = Math.sin(g.bob + t * 3) * 1.5;
      ctx.fillStyle = tier.glow;
      ctx.beginPath();
      ctx.arc(g.x, g.y + bob, tier.r * 1.9, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = tier.color;
      ctx.beginPath();
      ctx.moveTo(g.x, g.y + bob - tier.r);
      ctx.lineTo(g.x + tier.r * 0.72, g.y + bob);
      ctx.lineTo(g.x, g.y + bob + tier.r);
      ctx.lineTo(g.x - tier.r * 0.72, g.y + bob);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.75)';
      ctx.fillRect(g.x - 1, g.y + bob - tier.r * 0.55, 2, 2);
    });
  }

  /* DÜŞEN GÜÇLER: 2D katman (cevher/kalp ile aynı yer) — yeni 3B mesh yok.
     Altıgen pul + tek glif: 30 px'lik bir nesnede ikon okunmaz, SİLÜET
     okunur; renk kimliği taşır, glif teyit eder. */
  renderPowerups(ctx) {
    const t = this.time, game = this;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    this.pools.powerups.each(function (o) {
      if (!game.inView(o.x, o.y, 40)) return;
      const d = PU[o.kind];
      const bob = Math.sin(o.bob + t * 3.2) * 2.4;
      const y = o.y + bob;
      /* son 5 saniye: yanıp söner (kaybolacağı haber verilir) */
      if (o.life < 5 && ((t * 7) | 0) % 2 === 0) return;
      const pulse = 1 + Math.sin(t * 5 + o.bob) * 0.07;
      const R = 15 * pulse;
      ctx.fillStyle = d.dim;
      ctx.beginPath(); ctx.arc(o.x, y, R * 1.9, 0, 6.283); ctx.fill();
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * 6.283 - 1.5708;
        const px = o.x + Math.cos(a) * R, py = y + Math.sin(a) * R;
        i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
      }
      ctx.closePath();
      ctx.fillStyle = 'rgba(10,12,14,0.88)';
      ctx.fill();
      ctx.strokeStyle = d.col;
      ctx.lineWidth = 2.6;
      ctx.stroke();
      ctx.fillStyle = d.col;
      ctx.font = '700 15px "Chakra Petch", monospace';
      ctx.fillText(d.glyph, o.x, y + 1);
    });
  }

  /* GÖREV ÇIPALARI: hedef halkası + NPC can şeridi + ekran dışı pusula oku.
     2D katmanda çünkü her zaman TAM NETLİKTE olmalı (CLAUDE.md katman
     mimarisi: #game ölçeklenmez) ve çizgi grafiği 3B'de anti-aliası zayıf. */
  renderObjective(ctx) {
    const O = this.objectives;
    if (!O) return;
    const t = this.time;
    const ph = O.phase;

    /* ── KURTARMA NOKTASI: kubbenin dibinde yön veren işaretler ──
       HUD sekmesi kaldırıldığı için bütün anlatım burada: yükselen üç
       kevron "bir şey bekliyor" der, yakına gelince metin ne yapılacağını
       söyler. */
    if (ph === 'waiting') {
      const n = O.npc;
      if (this.inView(n.x, n.y, 260)) {
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        for (let i = 0; i < 3; i++) {
          const k = ((t * 0.9 + i * 0.333) % 1);
          ctx.globalAlpha = (1 - k) * 0.7;
          const yy = n.y - 96 - k * 46;
          ctx.strokeStyle = '#bfeaff';
          ctx.lineWidth = 3.4;
          ctx.beginPath();
          ctx.moveTo(n.x - 13, yy + 9); ctx.lineTo(n.x, yy);
          ctx.lineTo(n.x + 13, yy + 9);
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
        if (O.near) {
          ctx.font = '800 15px "Chakra Petch", monospace';
          ctx.fillStyle = 'rgba(8,12,16,0.7)';
          ctx.fillRect(n.x - 64, n.y - 168, 128, 24);
          ctx.fillStyle = '#dff2ff';
          ctx.fillText('KALKANA GİR', n.x, n.y - 155);
        }
      }
      return;
    }

    if (ph !== 'escort') return;

    /* ── VARIŞ HALKASI (nefes alan çift daire) ── */
    const d = O.dest;
    if (this.inView(d.x, d.y, 260)) {
      const pulse = 0.5 + Math.sin(t * 2.6) * 0.5;
      ctx.strokeStyle = 'rgba(127,227,176,0.6)';
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(d.x, d.y, 130 + pulse * 26, 0, 6.283); ctx.stroke();
      ctx.globalAlpha = 0.4;
      ctx.beginPath(); ctx.arc(d.x, d.y, 162 + pulse * 40, 0, 6.283); ctx.stroke();
      ctx.globalAlpha = 1;
    }

    /* ── TAŞINAN KİŞİ: can şeridi (kaybedilebilir olduğu okunmalı) ── */
    const n = O.npc;
    if (this.inView(n.x, n.y, 60)) {
      const w = 56, hh = 6;
      ctx.fillStyle = 'rgba(8,10,12,0.8)';
      ctx.fillRect(n.x - w / 2, n.y - 78, w, hh);
      const f = Math.max(0, n.hp / n.maxHp);
      ctx.fillStyle = f < 0.35 ? '#ff3b4e' : '#ffd45a';
      ctx.fillRect(n.x - w / 2 + 1, n.y - 77, (w - 2) * f, hh - 2);
      if (n.wait > 0.8) {
        ctx.textAlign = 'center';
        ctx.fillStyle = 'rgba(255,212,90,' + (0.45 + Math.sin(t * 8) * 0.35) + ')';
        ctx.font = '700 13px "Chakra Petch", monospace';
        ctx.fillText('BEKLİYOR', n.x, n.y - 92);
      }
    }
  }

  /** v60: koşunun büyük kısmı tabanda geçtiyse otomatik kademe bir basamak iner (kalıcı). */
  _learnTier() {
    const t = this.time || 0, s = this._stressT || 0;
    this._stressT = 0;
    if (t < 90 || s / t < 0.4 || Settings.data.gfx !== 'auto') return;
    const T = ['low', 'mid', 'high'], i = T.indexOf(Settings.autoTier);
    if (i <= 0) return;
    const next = T[i - 1];
    try { localStorage.setItem('kh_learntier_v1', next); } catch (e) { /* */ }
    Settings.autoTier = next;
    Quality.init(next, this.isMobile);
    if (Settings.data.batt) Quality.capFps = 30;
    if (this.renderer3d) this.renderer3d.resize();
  }

  /** v59 KATLİAM SAYACI — 1,4 sn içinde zincirlenen kıyımlar. OYUNA ETKİSİ YOK (hasar/ödül
      vermez), yalnız HUD rozeti + kademe sesi. Kademe: 12 KIYIM · 30 KATLİAM · 60 KIZIL HASAT.
      Sıcak yolda tahsis yok: üç sayı, DOM yazımı updateHUD'da (3 karede bir). */
  combo() {
    const t = this.time;
    if (t - this._cbT > 1.4) { this._cbN = 0; this._cbTier = 0; }
    this._cbT = t;
    const n = ++this._cbN;
    if (n > this._cbBest) this._cbBest = n;
    const tier = n >= 60 ? 3 : n >= 30 ? 2 : n >= 12 ? 1 : 0;
    if (tier > this._cbTier) {
      this._cbTier = tier;
      this.audio.comboTier = tier;
      this.audio.play('combo');
      if (tier >= 2) Haptics.fire('crit');
    }
  }

  /** v49 GÖREV OKU — OYUNCUNUN YANINDA (dünya uzayı).
      Kullanıcı: "mini haritayı kaldıralım; etkinliğe (kurtarma) yaklaşıldığında
      karakterin yanında ok çıksın ve götürsün." Ekran kenarındaki pusula göz
      ucuyla aranan bir şeydi; ok artık kahramanın ayağının dibinde, hedefe
      doğru İTEN bir çift şerit (">>") olarak durur.
      · hedefe yaklaştıkça belirginleşir (2400 → 1400 birim: %50 → %100);
      · hedefin kendi işaretleri konuşunca (≤ 240) söner;
      · faz rengi: bekleyen kurtarma buz mavisi, taşıma nane yeşili.
      Sıcak döngüde tahsis yok; kare başına iki yol + bir yazı. */
  renderObjectiveArrow(ctx) {
    const O = this.objectives, p = this.player;
    const t = this.time;
    const dt = Math.min(0.1, Math.max(0, t - (this._arwLast || t)));
    this._arwLast = t;
    const tx = O ? O.targetX() : null;
    let want = 0, dx = 0, dy = 0, d = 0;
    /* v59 (kullanıcı): kurtarılacak kişiyi oyuncu KENDİ bulur — ok yalnız taşıma (escort)
       fazında, kişiyi götüreceği yeri gösterir. */
    if (tx != null && p && O.phase === 'escort') {
      dx = tx - p.x; dy = O.targetY() - p.y; d = Math.hypot(dx, dy);
      want = d > 240 ? 1 : 0;
      this._arwA = Math.atan2(dy, dx);
      this._arwD = d;
    }
    this._arwK = (this._arwK || 0) + (want - (this._arwK || 0)) * Math.min(1, dt * 7);
    if (this._arwK < 0.02 || this._arwA == null || !p) return;
    d = this._arwD;
    const a = this._arwA, k = this._arwK;
    const prox = d < 1400 ? 1 : (d > 2400 ? 0.5 : 1 - 0.5 * (d - 1400) / 1000);
    const col = O && O.phase === 'escort' ? '#9ff2c4' : '#bfeaff';
    const push = (Math.sin(t * 5.4) * 0.5 + 0.5);
    /* v59: ok kahramanın ÜSTÜNE biniyordu (R 64, merkezden). Artık ayak hizasından
       (p.y + 14) 112 birim dışarıda; yukarı bakarken model boyu kadar (+38) ek pay. */
    const ca = Math.cos(a), sa = Math.sin(a);
    const R = 112 + Math.max(0, -sa) * 38 + push * 8;
    const oy = p.y + 14;
    ctx.save();
    ctx.translate(p.x + ca * R, oy + sa * R);
    ctx.rotate(a);
    const sc = 0.72 + 0.28 * k;
    ctx.scale(sc, sc);
    ctx.globalAlpha = k * prox;
    /* gövde: koyu kontur + faz rengi; ikinci şerit arkada, soluk */
    for (let i = 1; i >= 0; i--) {
      const ox = -i * 15;
      ctx.globalAlpha = k * prox * (i ? 0.5 : 1);
      ctx.fillStyle = 'rgba(6,10,14,0.78)';
      ctx.beginPath();
      ctx.moveTo(ox + 19, 0); ctx.lineTo(ox - 5, 15); ctx.lineTo(ox - 11, 10);
      ctx.lineTo(ox + 5, 0); ctx.lineTo(ox - 11, -10); ctx.lineTo(ox - 5, -15);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.moveTo(ox + 15, 0); ctx.lineTo(ox - 4.5, 11.5); ctx.lineTo(ox - 7.5, 8.2);
      ctx.lineTo(ox + 5.6, 0); ctx.lineTo(ox - 7.5, -8.2); ctx.lineTo(ox - 4.5, -11.5);
      ctx.closePath(); ctx.fill();
    }
    /* parıltı: yalnız ön şeritte, nabızla */
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = k * prox * (0.18 + push * 0.22);
    ctx.fillStyle = col;
    ctx.beginPath(); ctx.arc(4, 0, 17, 0, 6.283); ctx.fill();
    ctx.restore();
    /* mesafe: okun ucunun ötesinde, konturlu */
    const lx = p.x + ca * (R + 34), ly = oy + sa * (R + 34) + 4;
    ctx.globalAlpha = k * prox;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '800 12px "Chakra Petch", monospace';
    ctx.lineWidth = 3.4;
    ctx.strokeStyle = 'rgba(6,10,14,0.85)';
    const txt = Math.round(d / 10) + 'm';
    ctx.strokeText(txt, lx, ly);
    ctx.fillStyle = col;
    ctx.fillText(txt, lx, ly);
    ctx.globalAlpha = 1;
  }

  renderRings(ctx) {
    const game = this;
    ctx.globalCompositeOperation = 'lighter';
    this.pools.rings.each(function (o) {
      if (!game.inView(o.x, o.y, o.max + 20)) return;
      const a = o.life / o.maxLife;
      ctx.globalAlpha = a * 0.85;
      ctx.strokeStyle = o.color;
      ctx.lineWidth = 3 + a * 5;
      ctx.beginPath();
      ctx.arc(o.x, o.y, o.r, 0, Math.PI * 2);
      ctx.stroke();
    });
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
  }

  renderParticles(ctx) {
    const game = this;
    const P = this.pools.particles;

    P.each(function (o) {
      if (o.add || !game.inView(o.x, o.y, 16)) return;
      ctx.globalAlpha = o.life / o.max;
      ctx.fillStyle = o.color;
      ctx.fillRect(o.x - o.size * 0.5, o.y - o.size * 0.5, o.size, o.size);
    });

    ctx.globalCompositeOperation = 'lighter';
    P.each(function (o) {
      if (!o.add || !game.inView(o.x, o.y, 16)) return;
      ctx.globalAlpha = o.life / o.max;
      ctx.fillStyle = o.color;
      ctx.fillRect(o.x - o.size * 0.5, o.y - o.size * 0.5, o.size, o.size);
    });
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
  }

  /** Canvas2D'de ctx.font ATAMASI kısayol dizgisini YENİDEN AYRIŞTIRIR
      (ucuz değil) ve şablon dizgisi her yazı için yeni bir string tahsis
      eder. Boyut başına tek string önbelleklenir, atama yalnızca gerçekten
      değiştiğinde yapılır: 20 hasar sayısı = 20 ayrıştırma yerine 2-3. */
  _fontFor(px) {
    const F = this._fontCache || (this._fontCache = []);
    let s = F[px];
    if (s === undefined) s = F[px] = "700 " + px + "px 'Chakra Petch', sans-serif";
    return s;
  }

  renderTexts(ctx) {
    const game = this;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';          // rakam köşelerinde miter dikeni olmasın
    /* ÖLÇEK FONTLA DEĞİL DÖNÜŞÜMLE (v39): pop-in her yazıya geldi; boyutu
       font dizgisiyle sürmek her karede onlarca ctx.font ayrıştırması demekti.
       Font TABAN boyda kalır, büyüme setTransform ile verilir. getTransform
       kare başına BİR kez (tek DOMMatrix). */
    const M = ctx.getTransform();
    const ma = M.a, md = M.d, me = M.e, mf = M.f;
    ctx.strokeStyle = 'rgba(0,0,0,0.85)';
    let lastFont = '', lastLW = 0;
    this.pools.texts.each(function (o) {
      if (!game.inView(o.x, o.y, 40)) return;
      const a = Math.min(1, o.life / (o.max * 0.4));
      const pp = 1 - o.pt / 0.13;
      const k = (pp > 0 ? 1 + (o.pk - 1) * pp * pp : 1) * (0.74 + 0.26 * a);
      ctx.globalAlpha = a;
      ctx.setTransform(ma * k, 0, 0, md * k, me + ma * o.x, mf + md * o.y);
      const f = game._fontFor(Math.round(o.size));
      if (f !== lastFont) { ctx.font = f; lastFont = f; }
      const lw = o.crit ? 4 : 3;
      if (lw !== lastLW) { ctx.lineWidth = lw; lastLW = lw; }
      ctx.strokeText(o.str, 0, 0);
      ctx.fillStyle = o.color;
      ctx.fillText(o.str, 0, 0);
    });
    ctx.setTransform(ma, 0, 0, md, me, mf);
    ctx.globalAlpha = 1;
  }
}

import { PLAYER as _P } from './config.js?v=20260930m';
const PLAYER_PICKUP = _P.pickupR;

/* AÇILIŞ SIRASI (v44): kasa (imza + ayna geri yükleme) → saat → oyun.
   Kasa 900 ms'den uzun beklerse oyun yine kurulur (ayna olmadan). */
bootVault().catch(() => {})
  .then(() => Backend.restoreIfEmpty().catch(() => false))
  .then(() => {
  Clock.boot();
  bootI18n();
  ErrLog.install(null);                    // v54 F5: kurulum hataları da yakalansın
  window.__game = new Game();
  ErrLog._ctx = window.__game;
  document.documentElement.classList.toggle('nm-frame', Nightmare.hasFrame(window.__game.meta));   // v54 H2 kozmetik
  Backend.init(window.__game);
});
