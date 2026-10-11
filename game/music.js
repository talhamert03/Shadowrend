/* ══════════════════════════════════════════════════════════════════════
   music.js — v1 · ADAPTİF PROSEDÜREL MÜZİK (sıfır asset)

   Oyunda efekt sesi vardı, MÜZİK yoktu. Müziği olmayan bir oyun ne kadar
   iyi görünürse görünsün "prototip" gibi hissedilir: oyuncu sessizliği
   eksiklik olarak okur. Bu dosya o boşluğu ses DOSYASI eklemeden kapatır.

   Neden döngüsel mp3 değil:
   1. Dosya boyutu. İki dakikalık üç kuşak = 4-6 MB. Play indirmesine
      girer, GPU'ya değil ama RAM'e decode edilir.
   2. Döngü duyulur. Oyuncu bir görevde aynı 90 saniyeyi 4 kez dinler ve
      döngü noktasını ezberler — "ucuz oyun" hissinin klasik kaynağı.
   3. Uyum sağlamaz. Boss uyandığında müziğin DEĞİŞMESİ gerekir; hazır
      parçada bunun tek yolu sert kesme ya da uzun crossfade'dir.

   Bu motor bunun yerine partisyonu ÇALARKEN yazar: akor ilerleyişi
   sabittir (kimliği o verir), ezgi ve ritim her barda yeniden kurulur —
   yani tema tanınır ama aynı bar iki kez duyulmaz.

   ─── MİMARİ ───
   Zamanlayıcı KARE DÖNGÜSÜNDE DEĞİLDİR. `setTimeout` ile ~140 ms'de bir
   uyanıp bir sonraki ~0,9 saniyeyi Web Audio saatine yazar (lookahead
   scheduling). Yani render döngüsüne maliyeti SIFIR; CLAUDE.md
   performans sözleşmesi kural 1 ihlal edilemez, çünkü sıcak döngüde hiç
   çalışmaz. GPU maliyeti de yoktur.

   Ses yolu SFX motoruyla ORTAK limiter ve yankıyı kullanır:
      nota ─▶ durumGain ─▶ müzikVol ─┬─▶ fx.dry ─▶ (DC) ─▶ limiter ─▶ çıkış
                                     └─▶ fx.send ─▶ konvolüsyon yankı
   Ortak limiter kasıtlıdır: patlama olduğunda müzik kendiliğinden bir an
   geri çekilir (sidechain etkisi) ve savaş sesleri müziğin üstünde kalır.
   Ayrı bir zincir kursaydık ikisi birbiriyle yarışırdı.

   ─── TONALİTE — Bb MAJÖR (v2) ───
   v1 Sol MİNÖRDE yazılmıştı ve reddedildi: menü ağıt gibiydi, savaş
   karanlıktı. Bu oyunun menüsü bir OYUN EVİ — oyuncu orada sandık açıyor,
   kahraman geliştiriyor; müziğin işi "keyifli bekleme"yi taşımak.

   Yeni ton Bb majör ve bu bir şans değil: **Bb majör, Sol aeolian ile
   AYNI YEDİ NOTAYI kullanır** (ilgili majör). audio.js'teki bütün
   fanfarlar Sol minörde yazılıydı; ton merkezini Bb'ye taşımak müziği
   baştan sona aydınlatırken zafer fanfarının müziğin ÜSTÜNE düşmesini
   korur — audio.js'te tek satır değişmedi. Akor şekilleri bile dosyada
   zaten vardı, yalnızca sıra değişti: ev artık Bb.
     · menü  : Bb majör   I–V–vi–IV   (Bb F Gm Eb)
     · savaş : Bb majör   I–IV–vi–V   (sürükleyici, ostinato baslı)
     · BOSS  : Sol minör + D MAJÖR dominant (Fis dışarıdan gelir)
   Boss'ta v1'in frigian bII'si BIRAKILDI: o aralık "epik" değil
   "rahatsız" duyuluyordu. Armonik minörün majör dominantı büyük ve
   sinematiktir; rahatsız etmez.

   ─── SABİT TEMA + PROSEDÜREL VARYASYON ───
   v1'in ezgisi tamamen prosedüreldi (kalıp + gam yürüyüşü) ve TAM BU
   yüzden akılda kalmıyordu: rastgele ezgi her zaman "kütüphane müziği"
   duyulur, asla bir nakarat olmaz. Tersi de tuzak: tamamen sabit bir
   döngü 20 dakikada ezberlenir.
   Çözüm gerçek film/oyun müziği pratiği: ELLE YAZILMIŞ tema (`THEMES`) +
   her tekrarda varyasyon (oktav taşıma, süsleme, seyreltme, çalgı
   değişimi). Tema TANINIR, hiçbir tekrar aynı çalınmaz.

   ─── "RAHATSIZ ETMESİN" BİR MİKS AYARI DEĞİL, KOMPOZİSYON KARARI ───
   Sesi kısmak yormayı çözmez; yoran şey ARALIKSIZ ezgidir. Nefes
   temanın İÇİNE yazılıdır: her iki barlık cümlenin sonunda ezgi susar.
   Altta yumuşak bir marimba yatağı sürer, yani sessizlik "müzik kesildi"
   diye okunmaz.
   Ölçülebilir tavanlar (bkz. `_musictest.html`): ezgi doluluk oranı,
   TİZ BANT TAVANI (v1'de yalnız taban vardı — cırtlak müzik de testi
   geçebiliyordu) ve nota yoğunluğu.

   ─── ÇALGILAR ───
   Menü marimba + arp mızrabı + hafif tef üstünde yürür: ahşap ve yuvarlak
   sesler tiz kısmı az taşır, uzun dinlemede kulağı yormaz. Savaşta korno
   vuruşları ve trampet nabzı girer, EZGİ SEYRELİR — üstünde savaş
   efektleri çalacak; kalabalık ezgi orada gürültüye dönüşür.

   ─── SES BÜTÇESİ ───
   Barda en fazla `MAX_BAR_NOTES` nota planlanır (öncelik sırası: davul >
   pad > ezgi > süs). Cihaz zorlanırsa `setThin(true)` süs katmanlarını
   düşürür — GPU bütçe tablosunun ses tarafındaki karşılığı.

   ─── ÖLÇÜM ───
   `game/_musictest.html` bu motoru OfflineAudioContext ile 24 saniye
   render eder ve ölçer: tepe/RMS seviyesi, kırpma, bant dengesi, sessiz
   boşluk, nota yoğunluğu, ezgi tekrarı. Gözle (kulakla) karar verilmez:
   "döngü gibi duyuluyor mu" sorusunun cevabı ezgi dizisinde tekrar
   aramaktır. Zamanlama saf fonksiyonlarda tutulduğu için tezgah oyunun
   çaldığı partisyonun AYNISINI çalar (bkz. waveDuration tuzağı).
   ══════════════════════════════════════════════════════════════════════ */

const G2 = 98.0;                                   // referans: Sol2
const hz = (semi, oct) => G2 * Math.pow(2, (semi + 12 * (oct || 0)) / 12);

/* Perde adları — G2'den yarım ses. Tema yazarken sayı okumak hataya
   davetiyedir; buradaki adlarla yazılan tema gözle denetlenebilir. */
const G = 0, A = 2, Bb = 3, C = 5, D = 7, Eb = 8, F = 10, Fs = 11;
const G_ = 12, A_ = 14, Bb_ = 15, C_ = 17, D_ = 19, Eb_ = 20, F_ = 22, Bb__ = 27;

/* Akorlar (G2'den yarım ses). Bb majör ailesi — şekiller v1'de de vardı,
   sıra değişti: ev artık Bb. */
const CH = {
  Bb: [Bb, D, F], F: [F, A_, C_], Gm: [G, Bb, D], Eb: [Eb, G_, Bb_],
  Cm: [C, Eb, G_], D7: [D, Fs, A_], Gm_: [G, Bb, D],
};

/* Gam — süsleme ve arpej için. Bb majör = Sol aeolian ile AYNI KÜME. */
const MAJ_BB = [Bb, C, D, Eb, F, G_, A_];
const MIN_G = [G, A, Bb, C, D, Eb, F];

const MAX_BAR_NOTES = 34;
const LOOKAHEAD = 0.9;                             // sn — saate ne kadar önden yazılır
const TICK_MS = 140;

/* ═══════════ TEMALAR ═══════════
   Elle yazılmış ezgi. `t` cümle başından vuruş, `p` perde, `l` süre (vuruş).
   Cümle uzunluğu `phrase` (bar) ile eşleşir; barın notaları her barda
   filtrelenir.

   NEFES TEMANIN İÇİNDEDİR ve ÖLÇÜLDÜ: ilk yazdığım menü teması 16 vuruşun
   %78'ini doluyordu — kulağa "neşeli" gelen ama beş dakikada yoran yoğunluk
   tam olarak bu. Temalar seyreltildi: menü %65, savaş %50, boss %69.
   Cümle sonlarındaki boşluklar (menüde 7-8 ve 15-16) kaldırılırsa müzik
   "durmadan konuşan" hale gelir — kullanıcının v1'de rahatsız olduğu şey.  */
const THEMES = {
  /* Menü: soru–cevap. Yükselen antesedan, inen konsekan; şarkı gibi.
     Bar 1'in ilk vuruşu BOŞ — akoru bas kurar, ezgi ona cevap verir. */
  menu: [
    { t: 1.5, p: F, l: 0.5 }, { t: 2.0, p: Bb_, l: 1.0 }, { t: 3.0, p: A_, l: 0.5 },
    { t: 4.0, p: G_, l: 1.5 }, { t: 6.0, p: F, l: 1.0 },
    /* 7-8: nefes */
    { t: 8.0, p: Bb_, l: 0.5 }, { t: 8.5, p: D_, l: 1.5 }, { t: 10.5, p: C_, l: 0.5 },
    { t: 11.0, p: Bb_, l: 1.0 },
    { t: 12.0, p: G_, l: 1.0 }, { t: 13.5, p: F, l: 1.5 },
    /* 15-16: nefes */
  ],
  /* Savaş: kısa, vurgulu riff. Doluluk %50 — üstünde savaş efektleri
     çalacak; kalabalık ezgi orada gürültüye dönüşür. */
  battle: [
    { t: 0.0, p: Bb_, l: 0.5 }, { t: 0.5, p: Bb_, l: 0.5 }, { t: 1.0, p: D_, l: 1.0 },
    /* 2-3: nefes */
    { t: 3.0, p: Bb_, l: 0.5 },
    { t: 4.0, p: C_, l: 1.5 },
    /* 5.5-8: nefes */
  ],
  /* Boss: geniş, ağır. Az nota, uzun değer — "büyük" hissi buradan gelir. */
  boss: [
    { t: 0.0, p: G_, l: 1.5 }, { t: 2.0, p: Bb_, l: 1.0 }, { t: 3.0, p: A_, l: 1.0 },
    { t: 4.0, p: G_, l: 1.5 },
    { t: 8.0, p: D_, l: 1.5 }, { t: 10.0, p: Eb_, l: 1.0 }, { t: 11.0, p: D_, l: 1.0 },
    { t: 12.0, p: Bb_, l: 2.5 },
  ],
  /* Zafer: TEK CÜMLE, yükselen ve kapanışlı. Bu tema döngüye girmek için
     yazılmadı — görev sonu perdesi ~10-20 sn açık kalır, iki tekrarı anca
     duyulur; "nefes" bütçesi bu yüzden diğerlerinden yüksek (doluluk %69).
     Son nota TONİKTE ve uzun: kapanmayan zafer "devam edecek" duyulur. */
  victory: [
    { t: 0.0, p: Bb_, l: 0.5 }, { t: 0.5, p: D_, l: 0.5 }, { t: 1.0, p: F_, l: 1.0 },
    /* 2-3: nefes */
    { t: 3.0, p: Eb_, l: 0.5 },
    { t: 4.0, p: D_, l: 0.5 }, { t: 4.5, p: F_, l: 0.5 }, { t: 5.0, p: Bb__, l: 2.0 },
    /* 7-8: nefes — tonikte uzun nota, sonra sessizlik: kapanış budur */
  ],
};

const STATES = {
  menu: {
    /* trim: durumun toplam ses seviyesi. Katman dengesi trim'in ALTINDA
       ayarlanır, seviye trim'le ayarlanır — ikisi karışırsa bir katmanı
       yükseltmek bütün mixi bozar. */
    bpm: 104, bpmInt: 0, xfade: 2.0, scale: MAJ_BB, trim: 5.4,
    phrase: 4, theme: 'menu',
    prog: [CH.Bb, CH.F, CH.Gm, CH.Eb],
    /* Menüde de NABIZ var. v1'de vurmalı sıfırdı ve müzik bu yüzden
       "ağıt" duyuluyordu: neşe tempodan değil, hafif ve düzenli bir
       vuruştan gelir (tef + parmak davulu, çok kısık). */
    lead: 'mar', leadOct: 0, leadVol: 0.075,
    bass: 0.055, bassOct: 0, bassPat: 'walk',
    pad: 0.034, padOct: 1, drone: 0,
    arp: 0.03, arpOct: 1,                 // marimba yatağı — nefesi doldurur
    timp: 0, frame: 0.03, tamb: 0.08, glock: 0.85, air: 0.03,
  },
  battle: {
    bpm: 128, bpmInt: 14, xfade: 0.9, scale: MAJ_BB, trim: 4.4,
    phrase: 2, theme: 'battle',
    /* Sekiz bar: dört barlık döngünün "tekrar" olarak duyulmasını engeller.
       Tema iki barlık, yani aynı riff dört farklı akor zemininde geçer —
       bu tek başına varyasyon üretir, hem de bedavaya. */
    prog: [CH.Bb, CH.Eb, CH.Gm, CH.F, CH.Bb, CH.Eb, CH.Cm, CH.F],
    lead: 'stab', leadOct: 0, leadVol: 0.062,
    bass: 0.058, bassOct: 0, bassPat: 'drive',
    pad: 0.03, padOct: 1, drone: 0.014,
    arp: 0.016, arpOct: 1,
    timp: 0.13, frame: 0.075, tamb: 0.1, glock: 0.3, air: 0.03,
  },
  boss: {
    /* Boss YAVAŞ. Hızlı müzik "acele" der, yavaş ve ağır müzik "büyük"
       der; tempo düşerken vuruş başına ağırlık artar. */
    bpm: 78, bpmInt: 6, xfade: 0.45, scale: MIN_G, trim: 4.6,
    phrase: 4, theme: 'boss',
    prog: [CH.Gm, CH.Eb, CH.Cm, CH.D7],
    lead: 'brass', leadOct: 0, leadVol: 0.07,
    bass: 0.055, bassOct: 0, bassPat: 'hit',
    pad: 0.046, padOct: 1, drone: 0.02,
    arp: 0,
    timp: 0.18, frame: 0.1, tamb: 0.045, glock: 0.4, air: 0.046,
  },
  /* ZAFER (2026-08-29) — görev sonu perdesinin altı.
     Önceki sürüm zaferde doğrudan MENÜ temasına geçiyordu: oyuncu boss'u
     devirdikten iki saniye sonra menüde bekleyen müziği duyuyordu, yani
     koşunun doruk noktası ile ana ekran AYNI sesi taşıyordu. Zafer
     müziği ayrı bir durum: aynı tonda (Bb) ama parlak, geçişi ANINDA
     (bar sınırını beklemek fanfarın üstüne biner).
     Fanfar SFX'iyle ÇAKIŞMAZ: main.missionComplete `duck` ile müziği
     fanfar boyunca geri çeker, alttan yalnız pad + davul duyulur.
     YENİLGİ İÇİN DURUM YOK ve bu kasıtlı: ölümde müzik SUSAR
     (`fadeOut`). Yenilgi perdesinin altında çalan her şey — ne kadar
     hüzünlü yazılsa da — anın sessizliğini bozar; sessizlik burada
     bir efekttir (bkz. main.gameOver). */
  victory: {
    bpm: 112, bpmInt: 0, xfade: 0.35, scale: MAJ_BB, trim: 5.0,
    phrase: 2, theme: 'victory',
    prog: [CH.Bb, CH.F, CH.Eb, CH.Bb],
    lead: 'brass', leadOct: 0, leadVol: 0.075,
    bass: 0.05, bassOct: 0, bassPat: 'walk',
    pad: 0.04, padOct: 1, drone: 0,
    arp: 0.026, arpOct: 1,
    timp: 0.1, frame: 0.05, tamb: 0.09, glock: 0.9, air: 0.03,
  },
};

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Zamanlama durumu: ezgi hafızası + rastgelelik. Tezgah bunu tohumlu
    kurar, oyun tohumsuz — aynı kod, farklı akış. */
function newSeq(seed) {
  return {
    rng: seed == null ? Math.random : mulberry32(seed),
    lastVar: -1,
    barNotes: 0,
    notes: 0,               // ölçüm sayacı
    leadSeq: [],            // ölçüm: çalınan ezgi perdeleri
    leadBeats: 0,           // ölçüm: ezginin doldurduğu vuruş (doluluk oranı)
    totalBeats: 0,
  };
}

/* ═══════════ VARYASYON ═══════════
   Cümle her tekrarında farklı çalınır. Dört kademe DÖNGÜSEL değil
   ARTIMLIDIR: tanıdık → süslü → seyrek → tam, yani oyuncu temayı ilk
   duyuşta öğrenir, sonra tanıdığı şeyin süslenmesini dinler. Rastgele
   varyasyon sırası "her tekrar başka şarkı" duyulur. */
function variant(rep) {
  const k = rep % 4;
  /* `tail`: cümlenin SON notası farklı kadansa gider (gam derecesi kaydırma).
     Bu yalnızca müzikal bir tercih değil ÖLÇÜM ŞARTI: tema sabit olduğu için
     oktav/süsleme varyasyonları perde dizisini değiştirmiyor ve tezgah "hiç
     varyasyon yok" diyemiyordu. Değişen kadans hem kulağa hem ölçüme görünür. */
  if (k === 0) return { oct: 0, orn: 0, thin: 0, harm: 0, tail: 0 };
  if (k === 1) return { oct: 0, orn: 0.45, thin: 0, harm: 0, tail: 2 };
  if (k === 2) return { oct: 1, orn: 0.2, thin: 0.35, harm: 0, tail: 0 };
  return { oct: 0, orn: 0.25, thin: 0, harm: 0.6, tail: 4 };
}

export class Music {
  constructor(fx) {
    this.fx = fx || null;
    this.bus = null;
    this.state = 'menu';
    this.pending = null;         // bar sınırında geçilecek durum
    this.intensity = 0;
    this._iSm = 0;
    this.danger = false;
    this.thin = false;
    this.volume = 0.5;
    this.muted = false;
    this.playing = false;
    this._timer = 0;
    this._bar = 0;
    this._nextT = 0;
    this._seq = newSeq(null);
    this._duckT = 0;
    this._onVis = null;

    try {
      const v = localStorage.getItem('kh_music_vol');
      if (v != null) this.volume = Math.max(0, Math.min(1, parseFloat(v) || 0));
      this.muted = localStorage.getItem('kh_music_mute') === '1';
    } catch (e) { /* kayıt yoksa varsayılan */ }
  }

  /* ═══════════ KURULUM ═══════════ */

  /** AudioFX.unlock() sonrasında çağrılır. Tekrar çağrılması zararsızdır. */
  attach() {
    if (this.bus) return true;
    const fx = this.fx;
    if (!fx || !fx.ctx || !fx.dry || !fx.send) return false;
    const ctx = fx.ctx;

    const vol = ctx.createGain();
    vol.gain.value = this._level();
    const send = ctx.createGain();
    send.gain.value = 0.3;                 // tek, iyi ayarlanmış müzik yankısı
    vol.connect(fx.dry);
    vol.connect(send);
    send.connect(fx.send);

    /* Gürültü tamponu SFX motoruyla ORTAK: 2 saniyelik beyaz gürültü zaten
       orada üretiliyor, ikinci bir kopya boşa 350 KB bellek demek. */
    this.bus = { ctx, vol, sg: Object.create(null), offline: false, noise: fx.noiseBuf };

    /* Sekme arkaya düşerse zamanlayıcıyı durdur: geri gelindiğinde
       birikmiş barların hepsi aynı ana yazılıp gürültü patlaması olurdu. */
    this._onVis = () => {
      if (document.hidden) this._stopTimer();
      else if (this.playing) this._startTimer(true);
    };
    document.addEventListener('visibilitychange', this._onVis);
    return true;
  }

  dispose() {
    this._stopTimer();
    if (this._onVis) document.removeEventListener('visibilitychange', this._onVis);
    this._onVis = null;
    if (this.bus && !this.bus.offline) {
      try { this.bus.vol.disconnect(); } catch (e) { /* */ }
    }
    this.bus = null;
    this.playing = false;
  }

  /* ═══════════ GENEL API ═══════════ */

  _level() { return this.muted ? 0 : 0.9 * this.volume; }

  setVolume(v) {
    this.volume = Math.max(0, Math.min(1, v));
    try { localStorage.setItem('kh_music_vol', String(this.volume)); } catch (e) { /* */ }
    this._applyLevel();
  }
  setMuted(m) {
    this.muted = !!m;
    try { localStorage.setItem('kh_music_mute', this.muted ? '1' : '0'); } catch (e) { /* */ }
    this._applyLevel();
  }
  _applyLevel() {
    if (!this.bus) return;
    const g = this.bus.vol.gain, t = this.bus.ctx.currentTime;
    g.cancelScheduledValues(t);
    g.setTargetAtTime(this._level(), t, 0.08);
  }

  /** v56 B4: boss/evrim anında müzik kısa süre kısılır (ms), sonra yayla döner. */
  duck(ms) {
    if (!this.bus) return;
    const g = this.bus.vol.gain, t = this.bus.ctx.currentTime, L = this._level();
    g.cancelScheduledValues(t);
    g.setTargetAtTime(L * 0.3, t, 0.03);
    g.setTargetAtTime(L, t + (ms || 300) / 1000, 0.25);
  }

  /** 0..1 — dalga numarası, düşman baskısı vb. buraya bağlanır. */
  setIntensity(v) { this.intensity = Math.max(0, Math.min(1, v || 0)); }

  /** Can kritikse tritonlu bir alt katman girer: oyuncu tehlikeyi DUYAR. */
  setDanger(d) { this.danger = !!d; }

  /** Cihaz zorlanıyorsa süs katmanlarını düşür (ses tarafının bütçe kısması). */
  setThin(t) { this.thin = !!t; }

  /**
   * Durum değişimi. Boss ANINDA girer (dram); menü/savaş bir sonraki bar
   * sınırında girer — müzikal olarak doğru giriş noktası orasıdır ve
   * ortadan kesilen bir bar her zaman "web sitesi" gibi duyulur.
   */
  setState(name, immediate) {
    if (name === 'silent') { this.fadeOut(0.5); return; }
    if (!STATES[name]) return;
    if (!this.bus && !this.attach()) { this.state = name; return; }

    if (!this.playing) { this.state = name; this._begin(); return; }
    if (name === this.state && !this.pending) return;

    if (immediate || name === 'boss' || this.state === 'boss') {
      this._switch(name, this.bus.ctx.currentTime);
      this.pending = null;
    } else {
      this.pending = name;                 // bir sonraki bar sınırında
    }
  }

  _switch(name, t) {
    const cfg = STATES[name];
    const keys = Object.keys(this.bus.sg);
    for (let i = 0; i < keys.length; i++) {
      const g = this.bus.sg[keys[i]].gain;
      g.cancelScheduledValues(t);
      g.setTargetAtTime(keys[i] === name ? 1 : 0, t, Math.max(0.12, cfg.xfade * 0.35));
    }
    const sg = this._stGain(this.bus, name);
    sg.gain.cancelScheduledValues(t);
    sg.gain.setTargetAtTime(1, t, Math.max(0.12, cfg.xfade * 0.35));
    this.state = name;
  }

  /** Fanfar/stinger çalarken müziği kısa süre geri çeker. */
  duck(amount, dur) {
    if (!this.bus) return;
    const t = this.bus.ctx.currentTime;
    const g = this.bus.vol.gain;
    const lvl = this._level();
    g.cancelScheduledValues(t);
    g.setTargetAtTime(lvl * (1 - (amount == null ? 0.6 : amount)), t, 0.06);
    g.setTargetAtTime(lvl, t + (dur || 1.4), 0.35);
  }

  /** Dalga geçişi / boss uyanışı gibi anlara müzikal vurgu. */
  accent(kind) {
    if (!this.bus || !this.playing) return;
    const bus = this.bus, sg = this._stGain(bus, this.state);
    const t = bus.ctx.currentTime + 0.02;
    if (kind === 'boss') {
      this._n(bus, sg, { t, dur: 1.5, vol: 0.1, f0: 260, f1: 3400, type: 'bandpass', q: 1.3, atk: 1.15 });
      this._timp(bus, sg, hz(0, -1), t + 1.1, 0.9, 0.24);
      this._chime(bus, sg, hz(1, 2), t + 1.2, 1.6, 0.05);
    } else {
      this._n(bus, sg, { t, dur: 0.55, vol: 0.06, f0: 420, f1: 2600, type: 'bandpass', q: 1.4, atk: 0.4 });
      this._timp(bus, sg, hz(0, 0), t + 0.42, 0.5, 0.16);
    }
  }

  pause() { this._stopTimer(); }
  resume() { if (this.playing) this._startTimer(true); }

  /** Ses yolu sonradan açıldığında zamanlayıcıyı ŞU ANA yeniden hizala.
      `_nextT` geçmişte kalmışsa `_tick` biriken barların hepsini aynı ana
      yazar ve açılışta bir gürültü patlaması olur — sekme geri gelirken
      yaşanan sorunun aynısı. */
  resync() { if (this.playing) this._startTimer(true); }

  fadeOut(sec) {
    if (!this.bus) { this.playing = false; return; }
    const t = this.bus.ctx.currentTime;
    const g = this.bus.vol.gain;
    g.cancelScheduledValues(t);
    g.setTargetAtTime(0, t, Math.max(0.08, (sec || 1) * 0.35));
    this._stopTimer();
    this.playing = false;
  }

  /* ═══════════ GERÇEK ZAMANLI SÜRÜCÜ ═══════════ */

  _begin() {
    if (!this.bus) return;
    this.playing = true;
    this._bar = 0;
    this._nextT = this.bus.ctx.currentTime + 0.08;
    this._seq = newSeq(null);
    const keys = Object.keys(this.bus.sg);
    for (let i = 0; i < keys.length; i++) this.bus.sg[keys[i]].gain.value = 0;
    this._stGain(this.bus, this.state).gain.value = 1;
    this.bus.vol.gain.value = 0;
    this.bus.vol.gain.setTargetAtTime(this._level(), this.bus.ctx.currentTime, 0.6);
    this._startTimer(false);
  }

  _startTimer(resync) {
    this._stopTimer();
    if (!this.bus) return;
    if (resync) {
      const now = this.bus.ctx.currentTime;
      if (this._nextT < now) this._nextT = now + 0.05;
    }
    const loop = () => {
      this._tick();
      this._timer = setTimeout(loop, TICK_MS);
    };
    this._tick();
    this._timer = setTimeout(loop, TICK_MS);
  }
  _stopTimer() { if (this._timer) { clearTimeout(this._timer); this._timer = 0; } }

  _tick() {
    const bus = this.bus;
    if (!bus || !this.playing) return;
    if (bus.ctx.state === 'suspended') return;
    const now = bus.ctx.currentTime;
    let guard = 0;
    while (this._nextT < now + LOOKAHEAD && guard++ < 8) {
      if (this.pending) { this._switch(this.pending, this._nextT); this.pending = null; }
      this._iSm += (this.intensity - this._iSm) * 0.34;
      const cfg = STATES[this.state];
      this._scheduleBar(bus, this._seq, this._bar, this._nextT, cfg, this._iSm, this.danger);
      this._nextT += this._barDur(cfg, this._iSm);
      this._bar++;
    }
  }

  _barDur(cfg, inten) { return (60 / (cfg.bpm + (cfg.bpmInt || 0) * inten)) * 4; }

  /* ═══════════ PARTİSYON — BİR BAR ═══════════ */

  _scheduleBar(bus, seq, bar, t, cfg, inten, danger) {
    const sg = this._stGain(bus, this._cfgName(cfg));
    const spb = (60 / (cfg.bpm + (cfg.bpmInt || 0) * inten));
    const barDur = spb * 4;
    const chord = cfg.prog[bar % cfg.prog.length];
    const rng = seq.rng;
    const tr = cfg.trim || 1;
    const ph = cfg.phrase || 4;
    const barInPh = bar % ph;
    const va = variant(Math.floor(bar / ph));
    seq.barNotes = 0;
    seq.totalBeats += 4;

    /* ── 1. BAS — kimliğin taşıyıcısı. v1'de bas YOKTU: akor pad'i ve
       drone zemini tutuyordu, o yüzden müzik "havada" duruyordu. Neşeli
       müziği neşeli yapan şey ezgi değil, YÜRÜYEN bastır. ── */
    if (cfg.bass > 0) this._bassLine(bus, sg, seq, cfg, chord, t, spb, tr, inten, bar);

    /* ── 2. PAD — akor. Majörde pad İNCE tutulur: kalın pad majör akoru
       "senteze" çevirir; parlaklık ezgide ve marimbada yaşasın. ── */
    if (cfg.pad > 0) {
      this._pad(bus, sg, seq, chord, cfg.padOct, t + 0.01, barDur * 1.85,
        cfg.pad * tr * (this.thin ? 0.8 : 1), 0.62 + 0.4 * inten);
    }
    if (cfg.drone > 0 && bar % 2 === 0) {
      this._pad(bus, sg, seq, [G, G_], 0, t, barDur * 3.2, cfg.drone * tr, 0.6);
    }

    /* ── 3. TEHLİKE — triton. Can kritikse duyulur, görülmez. ── */
    if (danger) this._pad(bus, sg, seq, [6], 0, t, barDur * 1.1, 0.028 * tr, 0.34);

    /* ── 4. VURMALI ── */
    if (cfg.timp > 0) {
      this._timp(bus, sg, hz(chord[0], 0), t, spb * 1.5, cfg.timp * tr * 0.58 * (0.8 + 0.3 * inten));
      if (inten > 0.42) this._timp(bus, sg, hz(G, 0), t + spb * 2, spb * 1.1, cfg.timp * tr * 0.45);
    }
    if (cfg.frame > 0 && !this.thin) {
      /* Menüde 2 ve 4'te tek vuruş (rahat marş); savaşta yoğunlukla
         sekizliklere açılır. Menüde sekizlik davul "acele" duyulur. */
      const beats = cfg.timp > 0 && inten > 0.35 ? [1, 1.5, 3, 3.5] : [1, 3];
      for (let i = 0; i < beats.length; i++) {
        const accent = beats[i] % 2 === 1 ? 1 : 0.5;
        this._frame(bus, sg, t + beats[i] * spb + (rng() - 0.5) * 0.005,
          cfg.frame * tr * accent * (0.75 + 0.35 * inten));
      }
    }
    if (cfg.tamb > 0 && !this.thin) {
      /* Tef TERS vuruşta: düz vuruşta çalan tef marş olur, ters vuruşta
         çalan tef "oyun" olur. CR'ın hafifliği buradan gelir. */
      for (let i = 0; i < 4; i++) {
        this._tamb(bus, sg, t + (i + 0.5) * spb, cfg.tamb * tr * (i % 2 ? 1 : 0.62));
      }
    }

    /* ── 5. TEMA — elle yazılmış ezgi + varyasyon. ── */
    const th = THEMES[cfg.theme];
    const b0 = barInPh * 4, b1 = b0 + 4;
    for (let i = 0; i < th.length; i++) {
      const n = th[i];
      if (n.t < b0 || n.t >= b1) continue;
      if (va.thin > 0 && n.t !== b0 && rng() < va.thin) continue;
      const nt = t + (n.t - b0) * spb;
      const dur = n.l * spb;
      let p = n.p + va.oct * 12;
      if (va.tail && i === th.length - 1) p = this._step(cfg, p, va.tail);
      const vol = cfg.leadVol * tr * (n.l >= 1.5 ? 1 : 0.86);
      this._voice(cfg.lead, bus, sg, seq, p, cfg.leadOct, nt, dur, vol);
      seq.leadSeq.push(p);
      seq.leadBeats += n.l;
      /* Üçüncü harmoni: cümlenin dördüncü tekrarında girer. Aynı ezgi,
         iki sesli — "koro girdi" hissi, yeni nota yazmadan. */
      if (va.harm > 0 && n.l >= 1 && rng() < va.harm) {
        this._voice(cfg.lead, bus, sg, seq, this._third(cfg, p), cfg.leadOct, nt, dur, vol * 0.5);
      }
      /* Süsleme: notadan hemen önce komşu gam sesi (appoggiatura). Kısa,
         kısık; ezgiyi değiştirmez, "çalgıcı" hissi verir. */
      if (va.orn > 0 && n.l >= 1 && nt - t > 0.05 && rng() < va.orn) {
        this._voice(cfg.lead, bus, sg, seq, this._step(cfg, p, 1), cfg.leadOct,
          nt - spb * 0.24, spb * 0.22, vol * 0.55);
      }
    }

    /* ── 6. ARPEJ YATAĞI — temanın SUSTUĞU yeri doldurur. Sessizlik
       kompozisyonda kalır (ezgi susar) ama müzik kesilmiş duyulmaz. ── */
    if (cfg.arp > 0 && !this.thin) {
      for (let i = 0; i < 8; i++) {
        const beat = b0 + i * 0.5;
        let busy = false;
        for (let k = 0; k < th.length; k++) {
          if (th[k].t <= beat && th[k].t + th[k].l > beat + 0.01) { busy = true; break; }
        }
        if (busy && rng() < 0.75) continue;
        const semi = chord[i % chord.length] + (i >= 4 ? 12 : 0);
        this._mar(bus, sg, seq, semi, cfg.arpOct, t + i * spb * 0.5, spb * 0.6,
          cfg.arp * tr * (busy ? 0.45 : 0.8));
      }
    }

    /* ── 7. ÇAN — cümle başında tek parıltı. Her barda çalan çan süs
       değil tik olur; seyrekliği kasıtlı. ── */
    if (cfg.glock > 0 && barInPh === 0 && rng() < cfg.glock * (this.thin ? 0.4 : 1)) {
      this._chime(bus, sg, hz(chord[0], 2), t + spb * 0.5, 1.4 + rng(), 0.058 * tr);
    }

    /* ── 8. HAVA — sürekli çok kısık gürültü dokusu. Tek başına duyulmaz;
       kaldırıldığında müzik "kuru" ve sentetik duyulur. ── */
    if (cfg.air > 0 && !this.thin) {
      this._n(bus, sg, {
        t, dur: barDur * 0.9, vol: cfg.air * tr, f0: 2600 + 1400 * inten, f1: 1500,
        type: 'bandpass', q: 0.8, atk: barDur * 0.4,
      });
    }
  }

  /** Ezgi çalgısını ada göre sürer — tema okuyucusu çalgı bilmez. */
  _voice(kind, bus, sg, seq, semi, oct, t, dur, vol) {
    if (kind === 'mar') this._mar(bus, sg, seq, semi, oct, t, dur, vol);
    else if (kind === 'stab') this._stab(bus, sg, seq, semi, oct, t, dur, vol);
    else if (kind === 'brass') this._brass(bus, sg, seq, semi, oct, t, dur, vol);
    else if (kind === 'pluck') this._pluck(bus, sg, seq, semi, oct, t, dur, vol);
    else this._bow(bus, sg, seq, semi, oct, t, dur, vol);
  }

  /** Gam içinde n derece komşu. Kromatik kaydırma yerine GAM adımı:
      kromatik süsleme tonaliteyi bulandırır, gam adımı süslemez de bozmaz. */
  _step(cfg, semi, n) {
    const sc = cfg.scale;
    const pc = ((semi % 12) + 12) % 12;
    let best = 0, bd = 99;
    for (let i = 0; i < sc.length; i++) {
      const d = Math.abs((sc[i] % 12) - pc);
      if (d < bd) { bd = d; best = i; }
    }
    const oct = Math.floor((semi - (sc[best] % 12)) / 12);
    const j = best + n;
    const wrap = Math.floor(j / sc.length);
    const idx = ((j % sc.length) + sc.length) % sc.length;
    return (sc[idx] % 12) + 12 * (oct + wrap);
  }

  /** Akor içi üçlü — harmoni sesi. */
  _third(cfg, semi) { return this._step(cfg, semi, 2); }

  /** Bas hattı. Üç kalıp: yürüyüş (menü), sürükleme (savaş), vuruş (boss). */
  _bassLine(bus, sg, seq, cfg, chord, t, spb, tr, inten, bar) {
    const v = cfg.bass * tr;
    const root = chord[0], fifth = chord[2];
    if (cfg.bassPat === 'walk') {
      /* 1 – 5 – 1 – 3 : klasik yürüyen bas. Vuruş 4'te akorun üçlüsü
         gelir, bir sonraki akora doğru çekiş yaratır. */
      this._bass(bus, sg, seq, root, cfg.bassOct, t, spb * 0.9, v);
      this._bass(bus, sg, seq, fifth, cfg.bassOct, t + spb, spb * 0.8, v * 0.7);
      this._bass(bus, sg, seq, root, cfg.bassOct, t + spb * 2, spb * 0.9, v * 0.9);
      this._bass(bus, sg, seq, chord[1], cfg.bassOct, t + spb * 3, spb * 0.8, v * 0.66);
    } else if (cfg.bassPat === 'drive') {
      /* Sekizlik ostinato — savaşın motoru. Yoğunlukla ters vuruşlar açılır. */
      for (let i = 0; i < 8; i++) {
        if (i % 2 === 1 && inten < 0.4) continue;
        const semi = (i === 6 ? fifth : root);
        this._bass(bus, sg, seq, semi, cfg.bassOct, t + i * spb * 0.5, spb * 0.42,
          v * (i % 2 === 0 ? 1 : 0.55));
      }
    } else {
      this._bass(bus, sg, seq, root, cfg.bassOct, t, spb * 1.8, v);
      this._bass(bus, sg, seq, root, cfg.bassOct, t + spb * 2.5, spb * 1.2, v * 0.7);
    }
  }

  /* ═══════════ SES ÜRETİMİ ═══════════ */

  _cfgName(cfg) {
    if (cfg === STATES.menu) return 'menu';
    if (cfg === STATES.battle) return 'battle';
    if (cfg === STATES.victory) return 'victory';
    return 'boss';
  }

  _stGain(bus, name) {
    let g = bus.sg[name];
    if (!g) {
      g = bus.ctx.createGain();
      g.gain.value = 0;
      g.connect(bus.vol);
      bus.sg[name] = g;
    }
    return g;
  }

  _kill(chain) {
    for (let i = 0; i < chain.length; i++) {
      try { chain[i].disconnect(); } catch (e) { /* zaten sökülmüş */ }
    }
    chain.length = 0;
  }

  /* Üstel zarf — asla 0'a lineer inmez (dijital tık) */
  _env(g, t, atk, hold, dec, peak) {
    const p = Math.max(0.0004, peak);
    g.gain.setValueAtTime(0.00008, t);
    g.gain.exponentialRampToValueAtTime(p, t + Math.max(0.001, atk));
    if (hold > 0) g.gain.setValueAtTime(p, t + atk + hold);
    g.gain.exponentialRampToValueAtTime(0.00008, t + atk + (hold || 0) + Math.max(0.02, dec));
  }

  _budget(seq) {
    if (seq.barNotes >= MAX_BAR_NOTES) return false;
    seq.barNotes++; seq.notes++;
    return true;
  }

  /** Gürültü katmanı (bütçeden muaf: tek kaynak, uzun) */
  _n(bus, sg, o) {
    const c = bus.ctx;
    const src = c.createBufferSource();
    src.buffer = bus.noise;
    const f = c.createBiquadFilter();
    f.type = o.type || 'bandpass';
    f.Q.value = o.q || 1;
    f.frequency.setValueAtTime(Math.max(30, o.f0), o.t);
    if (o.f1 && o.f1 !== o.f0) f.frequency.exponentialRampToValueAtTime(Math.max(30, o.f1), o.t + o.dur);
    const g = c.createGain();
    this._env(g, o.t, o.atk == null ? 0.02 : o.atk, 0, o.dur, o.vol);
    src.connect(f); f.connect(g); g.connect(sg);
    const chain = [src, f, g];
    src.onended = () => this._kill(chain);
    src.start(o.t, Math.random() * 1.1);
    src.stop(o.t + (o.atk || 0.02) + o.dur + 0.05);
  }

  /**
   * PAD / DRONE — detune'lu testere yığını + alçak geçiren zarf.
   * Üç sesin ayrı ayrı GECİKMEYLE girmesi kasıtlı: tam senkron giren
   * akor org gibi değil, sintisayzır gibi duyulur.
   */
  _pad(bus, sg, seq, semis, oct, t, dur, vol, open) {
    const c = bus.ctx;
    const per = vol / Math.sqrt(semis.length + 1);
    for (let i = 0; i < semis.length; i++) {
      if (!this._budget(seq)) return;
      const f = hz(semis[i], oct);
      for (let k = 0; k < 2; k++) {
        const osc = c.createOscillator();
        osc.type = k ? 'triangle' : 'sawtooth';
        osc.frequency.value = f * (1 + (Math.random() - 0.5) * 0.004);
        osc.detune.value = (k ? 6 : -6) + (Math.random() - 0.5) * 5;
        const lp = c.createBiquadFilter();
        lp.type = 'lowpass'; lp.Q.value = 0.9;
        lp.frequency.setValueAtTime(Math.max(120, f * (1.4 + open * 2.2)), t);
        lp.frequency.linearRampToValueAtTime(Math.max(120, f * (1.1 + open * 4.4)), t + dur * 0.6);
        const g = c.createGain();
        const st = t + i * 0.02 + Math.random() * 0.02;
        /* SÜREKLİ zarf: uzun tutuş, kısa sönüm. Eskiden sönüm barın
           %55'iydi ve iki bar arasında seviye duyulur biçimde çukura
           iniyordu (ölçüldü: menüde 3,1 sn "sessizlik"). */
        this._env(g, st, dur * 0.22, dur * 0.45, dur * 0.4, per * (k ? 0.42 : 0.58));
        const pan = c.createStereoPanner ? c.createStereoPanner() : null;
        osc.connect(lp); lp.connect(g);
        let tail = g;
        if (pan) { pan.pan.value = (i % 2 ? 1 : -1) * 0.24; g.connect(pan); tail = pan; }
        tail.connect(sg);
        const chain = pan ? [osc, lp, g, pan] : [osc, lp, g];
        osc.onended = () => this._kill(chain);
        osc.start(st); osc.stop(st + dur * 1.12 + 0.12);
      }
    }
  }

  /** YAY (çello) — yavaş atak + vibrato. Savaşın ezgi sesi. */
  _bow(bus, sg, seq, semi, oct, t, dur, vol) {
    if (!this._budget(seq)) return;
    const c = bus.ctx;
    const f = hz(semi, oct);
    const osc = c.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.value = f;
    /* vibrato: 5.4 Hz, notanın ortasında açılır — baştan açık vibrato
       "sintisayzır", sonradan açılan vibrato "çalgıcı" duyulur */
    const lfo = c.createOscillator();
    lfo.type = 'sine'; lfo.frequency.value = 5.4 + Math.random() * 0.8;
    const lg = c.createGain();
    lg.gain.setValueAtTime(0.5, t);
    lg.gain.linearRampToValueAtTime(7.5, t + dur * 0.7);
    lfo.connect(lg); lg.connect(osc.detune);
    const lp = c.createBiquadFilter();
    lp.type = 'lowpass'; lp.Q.value = 1.6;
    lp.frequency.setValueAtTime(f * 1.8, t);
    lp.frequency.linearRampToValueAtTime(f * 4.6, t + dur * 0.35);
    const g = c.createGain();
    this._env(g, t, dur * 0.16, dur * 0.32, dur * 0.6, vol);
    osc.connect(lp); lp.connect(g); g.connect(sg);
    const chain = [osc, lfo, lg, lp, g];
    osc.onended = () => this._kill(chain);
    osc.start(t); lfo.start(t);
    osc.stop(t + dur * 1.2 + 0.1); lfo.stop(t + dur * 1.2 + 0.1);
  }

  /** MIZRAP (lavta) — menünün ezgisi: hızlı sönen üçgen + çan kısmı. */
  _pluck(bus, sg, seq, semi, oct, t, dur, vol) {
    if (!this._budget(seq)) return;
    const c = bus.ctx;
    const f = hz(semi, oct);
    const osc = c.createOscillator();
    osc.type = 'triangle';
    osc.frequency.value = f;
    const lp = c.createBiquadFilter();
    lp.type = 'lowpass'; lp.Q.value = 1.1;
    lp.frequency.setValueAtTime(f * 5, t);
    lp.frequency.exponentialRampToValueAtTime(Math.max(200, f * 1.3), t + dur);
    const g = c.createGain();
    this._env(g, t, 0.004, 0, dur * 1.15, vol);
    osc.connect(lp); lp.connect(g); g.connect(sg);
    const chain = [osc, lp, g];
    osc.onended = () => this._kill(chain);
    osc.start(t); osc.stop(t + dur * 1.3 + 0.1);
    /* tel tıkırtısı — parmağın tele değme sesi */
    this._n(bus, sg, { t, dur: 0.035, vol: vol * 0.28, f0: 3200, f1: 1200, type: 'bandpass', q: 1.6, atk: 0.001 });
  }

  /** KORNO — boss ezgisi: testere yığını + üfleme gürültüsü. */
  _brass(bus, sg, seq, semi, oct, t, dur, vol) {
    if (!this._budget(seq)) return;
    const c = bus.ctx;
    const f = hz(semi, oct);
    for (let k = -1; k <= 1; k++) {
      const osc = c.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.value = f;
      osc.detune.value = k * 9;
      const lp = c.createBiquadFilter();
      lp.type = 'lowpass'; lp.Q.value = 1.4;
      lp.frequency.setValueAtTime(f * 1.6, t);
      lp.frequency.linearRampToValueAtTime(f * 5.2, t + dur * 0.3);
      const g = c.createGain();
      this._env(g, t, dur * 0.1, dur * 0.34, dur * 0.6, vol * 0.4);
      const pan = c.createStereoPanner ? c.createStereoPanner() : null;
      osc.connect(lp); lp.connect(g);
      let tail = g;
      if (pan) { pan.pan.value = k * 0.16; g.connect(pan); tail = pan; }
      tail.connect(sg);
      const chain = pan ? [osc, lp, g, pan] : [osc, lp, g];
      osc.onended = () => this._kill(chain);
      osc.start(t); osc.stop(t + dur * 1.2 + 0.1);
    }
    this._n(bus, sg, { t, dur: 0.09, vol: vol * 0.1, f0: f * 4, f1: f * 2, type: 'bandpass', q: 1.1, atk: 0.02 });
  }

  /** MARİMBA — menünün ana sesi. Sinüs gövde + zayıf 4. kısım + ahşap tık.
      Tiz kısım YOK: marimbayı uzun dinlemede yormayan şey budur; aynı
      ezgiyi testere dalgayla çalmak beş dakikada rahatsız eder. */
  _mar(bus, sg, seq, semi, oct, t, dur, vol) {
    if (!this._budget(seq)) return;
    const c = bus.ctx;
    const f = hz(semi, oct);
    const g = c.createGain();
    g.connect(sg);
    /* Marimba çubuğu tıpkı bir çubuk gibi INHARMONİK çalar: ikinci kısım
       4. harmonik civarındadır (tam 4× değil). Tam katı kullanmak sesi
       "org" yapar.
       ÜST KISIMLARIN AĞIRLIĞI ÖLÇÜMLE BULUNDU: ilk sürüm 0,17/0,045 idi ve
       marimba neredeyse saf sinüs olduğu için tiz bant %1,4'te kalıyordu —
       telefon hoparlöründe müzik "boğuk" duyulur. Kulağa "yumuşak" gelen
       ayar cihazda "yok" demek. */
    const P = [[1, 1], [3.94, 0.30], [9.2, 0.14]];
    const chain = [g];
    const dec = Math.min(Math.max(dur * 0.9, 0.18), 0.62);
    for (let i = 0; i < P.length; i++) {
      const osc = c.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = f * P[i][0];
      const og = c.createGain();
      this._env(og, t, 0.004, 0.008, dec * (i === 0 ? 1 : 0.42), vol * P[i][1]);
      osc.connect(og); og.connect(g);
      chain.push(osc, og);
      if (i === 0) osc.onended = () => this._kill(chain);
      osc.start(t); osc.stop(t + dec + 0.12);
    }
    /* ahşap tık — vuruşun kendisi; olmadan ses "flüt" duyulur */
    this._n(bus, sg, { t, dur: 0.018, vol: vol * 0.75, f0: f * 9, f1: f * 3, type: 'bandpass', q: 1.2, atk: 0.0008 });
  }

  /** BAS — yuvarlak üçgen + alçak geçiren. Yürüyen bas müziğin motoru;
      v1'de hiç yoktu ve müzik bu yüzden zeminsiz duyuluyordu. */
  _bass(bus, sg, seq, semi, oct, t, dur, vol) {
    if (!this._budget(seq)) return;
    const c = bus.ctx;
    const f = hz(semi, oct);
    const osc = c.createOscillator();
    osc.type = 'triangle';
    osc.frequency.value = f;
    /* İkinci ses BİR OKTAV ÜSTTE ve EŞİT AĞIRLIKTA: telefon hoparlörü 200 Hz
       altını çalmaz, yani basın temeli cihazda YOK'tur — duyulan kısmı oktav
       ikizidir. İlk sürümde temel bir oktav daha alttaydı (58 Hz) ve ikiz
       0,34'te kısıktı: enerjinin %68-77'si alt banda gidiyordu (ölçüldü),
       yani limiter'i kapatıp savaş efektlerini boğan ama DUYULMAYAN bir bas.
       CLAUDE.md'deki boss padOct dersinin aynen tekrarı. */
    const oct2 = c.createOscillator();
    oct2.type = 'triangle';
    oct2.frequency.value = f * 2;
    const lp = c.createBiquadFilter();
    lp.type = 'lowpass'; lp.Q.value = 1.1;
    lp.frequency.setValueAtTime(f * 6, t);
    lp.frequency.exponentialRampToValueAtTime(Math.max(180, f * 2.6), t + dur * 0.7);
    const g = c.createGain();
    const g2 = c.createGain();
    g2.gain.value = 0.85;
    this._env(g, t, 0.008, dur * 0.3, dur * 0.7, vol);
    osc.connect(lp); oct2.connect(g2); g2.connect(lp);
    lp.connect(g); g.connect(sg);
    const chain = [osc, oct2, g2, lp, g];
    osc.onended = () => this._kill(chain);
    osc.start(t); oct2.start(t);
    osc.stop(t + dur * 1.15 + 0.08); oct2.stop(t + dur * 1.15 + 0.08);
  }

  /** KORNO VURUŞU — savaşın ezgisi. `_brass`in kısa, sert zarflı hâli:
      uzun korno savaşta efektlerin üstüne yayılır ve çamur yapar. */
  _stab(bus, sg, seq, semi, oct, t, dur, vol) {
    if (!this._budget(seq)) return;
    const c = bus.ctx;
    const f = hz(semi, oct);
    const g = c.createGain();
    const lp = c.createBiquadFilter();
    lp.type = 'lowpass'; lp.Q.value = 2.2;
    lp.frequency.setValueAtTime(f * 1.5, t);
    lp.frequency.linearRampToValueAtTime(f * 6.5, t + 0.055);
    lp.frequency.exponentialRampToValueAtTime(Math.max(160, f * 2.4), t + dur * 0.8);
    const chain = [lp, g];
    for (let k = 0; k < 2; k++) {
      const osc = c.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.value = f;
      osc.detune.value = k ? 7 : -7;
      osc.connect(lp);
      chain.push(osc);
      osc.start(t); osc.stop(t + dur * 1.1 + 0.08);
      if (k === 0) osc.onended = () => this._kill(chain);
    }
    this._env(g, t, 0.012, dur * 0.22, dur * 0.62, vol * 0.5);
    lp.connect(g); g.connect(sg);
  }

  /** TEF — kısa deri + zil çıtırtısı. Ters vuruşta çalar: düz vuruşta
      çalan tef marş, ters vuruşta çalan tef oyun duyulur. */
  _tamb(bus, sg, t, vol) {
    this._n(bus, sg, { t, dur: 0.05, vol: vol * 0.85, f0: 7400, f1: 4200, type: 'highpass', q: 0.7, atk: 0.0012 });
    this._n(bus, sg, { t: t + 0.006, dur: 0.028, vol: vol * 0.45, f0: 2600, f1: 1800, type: 'bandpass', q: 1.4, atk: 0.001 });
  }

  /** TIMPANI — perdesi düşen sinüs + deri gürültüsü. */
  _timp(bus, sg, f, t, dur, vol) {
    const c = bus.ctx;
    const osc = c.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(f * 1.02, t);
    osc.frequency.exponentialRampToValueAtTime(Math.max(24, f * 0.44), t + dur * 0.6);
    const g = c.createGain();
    this._env(g, t, 0.003, 0, dur, vol);
    osc.connect(g); g.connect(sg);
    const chain = [osc, g];
    osc.onended = () => this._kill(chain);
    osc.start(t); osc.stop(t + dur + 0.12);
    /* Deri gürültüsü ORTA bantta: davulun "vurdu" bilgisi 1-2 kHz'de
       yaşar, 160 Hz'de yalnız enerji yaşar. */
    this._n(bus, sg, { t, dur: dur * 0.32, vol: vol * 0.5, f0: 1500, f1: 300, type: 'bandpass', q: 0.9, atk: 0.002 });
  }

  /** ÇERÇEVE DAVUL — kısa, orta bantlı deri vuruşu. */
  _frame(bus, sg, t, vol) {
    this._n(bus, sg, { t, dur: 0.075, vol, f0: 640, f1: 280, type: 'bandpass', q: 1.1, atk: 0.0015 });
    this._n(bus, sg, { t, dur: 0.02, vol: vol * 0.95, f0: 5200, f1: 2600, type: 'highpass', q: 0.8, atk: 0.0008 });
  }

  /** ÇITIRTI — tohum/boncuk. Ters vuruşta ritmi "canlı" yapar. */
  _shake(bus, sg, t, vol) {
    this._n(bus, sg, { t, dur: 0.045, vol, f0: 6800, f1: 3800, type: 'highpass', q: 0.7, atk: 0.004 });
  }

  /** ÇAN — inharmonik kısımlar, her biri ayrı sönümlü. */
  _chime(bus, sg, f, t, dur, vol) {
    const P = [[1, 1, 1], [2.01, 0.4, 0.7], [2.98, 0.18, 0.48], [4.32, 0.08, 0.3]];
    const c = bus.ctx;
    for (let i = 0; i < P.length; i++) {
      const osc = c.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = f * P[i][0] * (1 + (Math.random() - 0.5) * 0.003);
      const g = c.createGain();
      const st = t + i * 0.004;
      this._env(g, st, 0.006, 0, dur * P[i][2], vol * P[i][1]);
      osc.connect(g); g.connect(sg);
      const chain = [osc, g];
      osc.onended = () => this._kill(chain);
      osc.start(st); osc.stop(st + dur * P[i][2] + 0.15);
    }
  }

  /* ═══════════ ÖLÇÜM: ÇEVRİMDIŞI RENDER ═══════════ */

  /**
   * Partisyonu OfflineAudioContext'e render eder — tezgahın ölçtüğü şey
   * oyunun çaldığı partisyonun AYNISIDIR (aynı _scheduleBar).
   * @returns {Promise<{buffer:AudioBuffer, notes:number, leadSeq:number[], bars:number, duty:number}>}
   */
  async renderOffline(seconds, stateName, intensity, opts) {
    const o = opts || {};
    const sr = o.sampleRate || 32000;
    const OC = window.OfflineAudioContext || window.webkitOfflineAudioContext;
    if (!OC) throw new Error('OfflineAudioContext yok');
    const oc = new OC(2, Math.ceil(seconds * sr), sr);

    /* çıkış zinciri: müzik → limiter benzeri + yankı → destination */
    const lim = oc.createDynamicsCompressor();
    lim.threshold.value = -9; lim.knee.value = 8; lim.ratio.value = 11;
    lim.attack.value = 0.003; lim.release.value = 0.16;
    lim.connect(oc.destination);

    const vol = oc.createGain(); vol.gain.value = 0.9 * (o.volume == null ? 0.5 : o.volume);
    vol.connect(lim);

    const hp = oc.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 260;
    const lp = oc.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 7200;
    const conv = oc.createConvolver();
    conv.buffer = Music.makeIR(oc, 1.15);
    conv.normalize = true;
    const send = oc.createGain(); send.gain.value = 0.3;
    vol.connect(send); send.connect(hp); hp.connect(lp); lp.connect(conv); conv.connect(lim);

    const nLen = Math.floor(sr * 2);
    const nb = oc.createBuffer(1, nLen, sr);
    const nd = nb.getChannelData(0);
    for (let i = 0; i < nLen; i++) nd[i] = Math.random() * 2 - 1;

    const bus = { ctx: oc, vol, sg: Object.create(null), offline: true, noise: nb };
    const prevBus = this.bus, prevState = this.state, prevThin = this.thin;
    this.bus = bus;
    this.state = stateName;
    this.thin = !!o.thin;
    this._stGain(bus, stateName).gain.value = 1;

    const seq = newSeq(o.seed == null ? 12345 : o.seed);
    const cfg = STATES[stateName];
    const inten = intensity == null ? 0 : intensity;
    let t = 0.05, bar = 0;
    while (t < seconds) {
      this._scheduleBar(bus, seq, bar, t, cfg, inten, !!o.danger);
      t += this._barDur(cfg, inten);
      bar++;
      if (bar > 400) break;
    }

    const buffer = await oc.startRendering();
    this.bus = prevBus; this.state = prevState; this.thin = prevThin;
    return {
      buffer, notes: seq.notes, leadSeq: seq.leadSeq, bars: bar,
      /* Ezgi doluluk oranı: ezginin ses çıkardığı vuruşların toplam vuruşa
         oranı. "Rahatsız etmesin" şartının ölçülebilir hali — seviyeyle
         değil, ARALIKSIZLIKLA ilgilidir. */
      duty: seq.totalBeats > 0 ? seq.leadBeats / seq.totalBeats : 0,
    };
  }

  /** Taş mahzen dürtü yanıtı (audio.js'tekiyle aynı reçete). */
  static makeIR(ctx, sec) {
    const sr = ctx.sampleRate;
    const len = Math.floor(sr * sec);
    const ir = ctx.createBuffer(2, len, sr);
    for (let ch = 0; ch < 2; ch++) {
      const d = ir.getChannelData(ch);
      for (let i = 0; i < len; i++) {
        const x = i / len;
        d[i] = (Math.random() * 2 - 1) * Math.pow(1 - x, 3.1);
      }
      let prev = 0;
      for (let i = 0; i < len; i++) {
        const a = 0.62 - 0.5 * (i / len);
        prev = prev + a * (d[i] - prev);
        d[i] = prev;
      }
      const taps = [0.011, 0.019, 0.029, 0.041, 0.058, 0.077];
      for (let k = 0; k < taps.length; k++) {
        const idx = Math.floor((taps[k] + (ch ? 0.0031 : 0)) * sr);
        if (idx < len) d[idx] += (0.55 - k * 0.07) * (ch ? -1 : 1);
      }
    }
    return ir;
  }
}
