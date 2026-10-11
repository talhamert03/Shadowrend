/* ══════════════════════════════════════════════════════════════════════
   settings.js — OYUNCU AYARLARI (tek doğruluk kaynağı + kalıcılık)

   Dört ayar, dört farklı yere uygulanır ve HİÇBİRİ kendi kopyasını tutmaz:
     gfx      → Quality (çözünürlük tavanı, bütçeler, kare tavanı)
     sfx      → AudioFX.setVolume
     music    → Music.setVolume
     haptics  → Haptics.enabled

   ── GRAFİK: OTOMATİK VARSAYILAN, ELLE GEÇERSİZ KILMA ──
   Cihaz sınıfı açılışta `deviceMemory` + `hardwareConcurrency` ile tahmin
   edilir (main.js). Bu tahmin BAZEN YANILIR: bazı üreticiler
   `deviceMemory`i hiç vermez (varsayılan 4 → 'low' damgası yer, oysa cihaz
   güçlüdür), bazı emülatörler 8 çekirdek bildirir ama GPU'su zayıftır.
   Bu yüzden oyuncu tahmini geçersiz kılabilir — ama VARSAYILAN 'auto'
   kalır: ayar menüsüne hiç girmeyen oyuncu (çoğunluk) doğru kademeyi alır.

   'auto' ile açık bir kademe seçmek AYNI ŞEY DEĞİLDİR: 'auto' cihazın
   tahminini takip eder, 'yüksek' ise oyuncunun ısrarıdır. `Quality.stress`
   uyarlanabilir kısmayı her iki durumda da sürdürür — yani "yüksek" seçen
   oyuncunun telefonu ısındığında oyun yine kendini korur. Kademe seçimi
   TABAN bütçeyi belirler, tavanı değil.

   ── SES ──
   audio.js'in kendi `volume` alanı var ama kalıcı DEĞİLDİ: her açılışta
   0,62'ye dönüyordu. Kalıcılık burada.

   Müzik ayarı v2'de EKLENDİ (music.js oyuna bağlandı). Efekt ve müzik
   AYRI ayarlanır: oyuncuların çoğu müziği kapatıp efekti açık bırakmak
   ister ve tek kaydırak bu seçimi imkânsız kılar.
   ══════════════════════════════════════════════════════════════════════ */

import { Quality, Haptics } from './perf.js?v=20260930m';
import { ELITE_AFFIX } from './enemyManager.js?v=20260930m';

/* v54 E4 · RENK KÖRLÜĞÜ: elit değiştirici renkleri Okabe-Ito dizisine geçer
   (kırmızı/yeşil ayrımına dayanmaz); ad yazısı her iki modda da görünür. */
const AFX_BASE = ELITE_AFFIX.map((a) => a.col);
const AFX_CB = ['#56b4e9', '#f0e442', '#ffffff', '#e69f00', '#009e73', '#d55e00'];

const KEY = 'kh_settings_v1';
const DEF = { gfx: 'auto', sfx: 0.62, music: 0.5, haptics: true, shake: true, rm: false, batt: false, cb: false, big: false, hsoft: false };
const TIERS = ['low', 'mid', 'high'];

export const Settings = {
  data: Object.assign({}, DEF),
  autoTier: 'mid',
  isMobile: false,
  _game: null,

  /** main.js açılışta çağırır: cihaz tahmini + kayıtlı seçim birleşir. */
  attach(game, autoTier, isMobile) {
    this._game = game;
    this.autoTier = TIERS.indexOf(autoTier) === -1 ? 'mid' : autoTier;
    this.isMobile = !!isMobile;
    this.load();
    return this;
  },

  load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const o = JSON.parse(raw);
        if (o && typeof o === 'object') {
          if (o.gfx === 'auto' || TIERS.indexOf(o.gfx) !== -1) this.data.gfx = o.gfx;
          if (typeof o.sfx === 'number' && o.sfx >= 0 && o.sfx <= 1) this.data.sfx = o.sfx;
          if (typeof o.music === 'number' && o.music >= 0 && o.music <= 1) this.data.music = o.music;
          if (typeof o.haptics === 'boolean') this.data.haptics = o.haptics;
          if (typeof o.shake === 'boolean') this.data.shake = o.shake;
          if (typeof o.rm === 'boolean') this.data.rm = o.rm;
          for (const k of ['batt', 'cb', 'big', 'hsoft']) if (typeof o[k] === 'boolean') this.data[k] = o[k];
        }
      }
    } catch (e) { /* bozuk kayıt → varsayılan; oyun açılmalı */ }
  },

  save() {
    try { localStorage.setItem(KEY, JSON.stringify(this.data)); } catch (e) { /* kota/gizli mod */ }
  },

  /** Seçilen kademe — 'auto' ise cihaz tahmini. */
  tier() { return this.data.gfx === 'auto' ? this.autoTier : this.data.gfx; },

  /** Panelde gösterilecek etiket: 'auto' seçiliyken hangi kademeye
      düştüğü GÖSTERİLİR, yoksa oyuncu neyin çalıştığını bilemez. */
  tierLabel() {
    const names = { low: 'DÜŞÜK', mid: 'ORTA', high: 'YÜKSEK' };
    return this.data.gfx === 'auto' ? 'OTOMATİK · ' + names[this.autoTier] : names[this.tier()];
  },

  set(key, value) {
    if (!(key in this.data)) return;
    this.data[key] = value;
    this.save();
    this.applyOne(key);
  },

  /** Açılışta hepsini uygula (Quality.init'ten SONRA çağrılır). */
  applyAll() {
    this.applyOne('gfx');
    this.applyOne('sfx');
    this.applyOne('music');
    this.applyOne('haptics');
    this.applyOne('shake');
    this.applyOne('rm');
    this.applyOne('cb');
    this.applyOne('big');
    this.applyOne('hsoft');
    this.applyOne('batt');
  },

  applyOne(key) {
    const g = this._game;
    if (key === 'shake') {
      if (g) g.motionK = this.data.shake ? 1 : 0.3;
      return;
    }
    /* v53 C6: HAREKETİ AZALT — sistem tercihiyle AYNI sınıfı açar
       (style.css v53: sonsuz döngüler durur, girişler anında oturur). */
    if (key === 'rm') {
      document.documentElement.classList.toggle('rm', !!this.data.rm);
      return;
    }
    /* v54 F3 · PİL MODU: kare tavanı 30 (60 Hz'de her 2. kare). Sim 60 Hz sabit
       adımda kalır — denge ve his değişmez, yalnız çizim yarıya iner. */
    if (key === 'batt') {
      Quality.capFps = this.data.batt ? 30 : (this.isMobile ? 60 : 0);
      if (!this.data.batt && !this.isMobile) Quality._capEvery = 1;
      document.documentElement.classList.toggle('batt', !!this.data.batt);
      return;
    }
    if (key === 'cb') {
      ELITE_AFFIX.forEach((a, i) => { a.col = this.data.cb ? AFX_CB[i] : AFX_BASE[i]; });
      document.documentElement.classList.toggle('cb', !!this.data.cb);
      return;
    }
    if (key === 'big') { document.documentElement.classList.toggle('bigtxt', !!this.data.big); if (g) g._bigTxt = !!this.data.big; return; }
    if (key === 'hsoft') { Haptics.k = this.data.hsoft ? 0.45 : 1; return; }
    if (key === 'haptics') {
      Haptics.enabled = !!this.data.haptics;
      return;
    }
    if (key === 'sfx') {
      if (g && g.audio) g.audio.setVolume(this.data.sfx);
      return;
    }
    if (key === 'music') {
      /* music.js kendi ses seviyesini de localStorage'a yazıyor (tezgahta
         tek başına çalışabilmesi için). İki kayıt çakışmaz: burada YAZAN
         taraf ayar panelidir, motor yalnız okur ve kendi anahtarını günceller. */
      if (g && g.music) g.music.setVolume(this.data.music);
      return;
    }
    if (key === 'gfx') {
      /* Kademe değişince Quality YENİDEN kurulur: bütçe tablosu, çözünürlük
         tabanı ve kare tavanı hep oradan okunuyor. init `stress`i de
         sıfırlar — yeni kademede eski kısıntıyı taşımak yanlış olurdu.
         Anında görünen etki çözünürlük (dpr); efekt/düşman ADETLERİ savaş
         içinde havuzdan geldiği için bir sonraki görevde tam oturur. */
      Quality.init(this.tier(), this.isMobile);
      if (this.data.batt) Quality.capFps = 30;          // init tavanı sıfırlar; pil modu korunur
      if (g && g.renderer3d) g.renderer3d.resize();
    }
  },
};
