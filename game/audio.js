/* ═══════════════════════════════════════════════════════════
   audio.js — v3 · PREMIUM SENTEZ SES MOTORU (sıfır asset)

   Tek bir ses dosyası yok; her şey Web Audio ile anında üretilir.
   APK'ya 0 KB ekler, yüklenmeyi beklemez, gecikmesizdir.

   v2 → v3'te "yapay zekâ/sentez kokusu" veren ne varsa söküldü:

   1. GERÇEK YANKI (konvolüsyon). Eski sürüm tek bir delay hattı
      kullanıyordu — bu, kulağa "bilgisayarda yapılmış" gelen en
      büyük tek sebeptir. Artık açılışta bir mahzen dürtü yanıtı
      (erken yansımalar + üstel kuyruk, stereo dekorelasyon) SENTEZ
      edilip ConvolverNode'a verilir. Aynı vuruş bir anda "mekân"
      kazanır.
   2. LİMİTER. Master'da compressor: 30 düşman aynı anda ölünce
      ses kırpılmaz, hep aynı tokluğu korur.
   3. HER ÇALIŞ FARKLI. Perde/tını/zamanlama her tetiklemede
      rastgele sapar (jitter) + round-robin varyantlar. Aynı örneğin
      arka arkaya çalınması, sentetikliğin ikinci en büyük ipucuydu.
   4. KATMANLI TASARIM. Gerçek oyun sesleri tek osilatör değildir:
      TRANSIENT (2–8 ms tık) + GÖVDE (perdeli) + KUYRUK (gürültü/
      rezonans). Her vuruş efekti bu üç katmandan kurulur.
   5. MÜZİKAL ANLAR. Efsanevi/zafer sesleri artık akor değil, gerçek
      NOTA DİZİSİ: Sol minör tonda yükselen bir fanfar, altında
      timpani, üstünde çan takibi. 2.5–3 sn, kuyruğuyla birlikte.

   Kanal mimarisi:
      voice ──▶ (pan) ──┬─▶ dry ─────────────┐
                        └─▶ send ─▶ convolver┴─▶ limiter ─▶ out
   ═══════════════════════════════════════════════════════════ */

/* Nota yardımcıları — 0 = A4 (440 Hz). Fanfarlar semiton cinsinden yazılır,
   böylece melodi okunur kalır ve transpoze etmek tek satırdır. */
const HZ = (semi) => 440 * Math.pow(2, semi / 12);
/* Sol minör / Sol majör çevresi (fanfarlar bu tonda) */
const G2 = HZ(-22), D3 = HZ(-19), G3 = HZ(-14), Bb3 = HZ(-11), D4 = HZ(-7),
      G4 = HZ(-2), A4 = HZ(0), Bb4 = HZ(1), B4 = HZ(2), C5 = HZ(3), D5 = HZ(5),
      Eb5 = HZ(6), F5 = HZ(8), G5 = HZ(10), A5 = HZ(12), Bb5 = HZ(13), D6 = HZ(17),
      G6 = HZ(22);

/* rastgele sapma: 1 ± a  (perde/süre/ses seviyesi mikro varyasyonu) */
const j = (a) => 1 + (Math.random() * 2 - 1) * a;
const rnd = (a, b) => a + Math.random() * (b - a);

const UI_SND = { click: 1, buy: 1, error: 1, pick: 1, reroll: 1, start: 1, victory: 1, levelup: 1, heroup: 1, panel: 1, unlockstart: 1,
  equip: 1, select: 1, copy: 1, star: 1, bless: 1, claim: 1, tierclaim: 1, gemspend: 1, walletin: 1, collect: 1, tally: 1, boot: 1,
  gateclose: 1, gatelock: 1, revive: 1, stonebuy: 1, adreward: 1, cta: 1, tab: 1, reveal: 1, evocine: 1 };
export class AudioFX {
  constructor() {
    this.ctx = null;
    this.master = null;      // limiter girişi
    this.dry = null;
    this.send = null;        // yankı gönderimi
    this.noiseBuf = null;
    this.distCurve = null;
    this.lastPlayed = Object.create(null);
    this.rr = Object.create(null);      // round-robin sayaçları
    this.gemStep = 0;                   // exp toplama perde merdiveni
    this.gemLastT = -10;
    this.volume = 0.62;
    this.muted = false;

    /* efekt başına asgari tekrar aralığı (saniye) */
    this.minGap = {
      hit: 0.045, crit: 0.085, kill: 0.055, gem: 0.03,
      sword: 0.075, shoot: 0.05, thunder: 0.18, simsekvur: 0.07, zone: 0.25, boom: 0.09,
      hurt: 0.14, click: 0.025, pick: 0.05, coin: 0.035, buy: 0.08, reroll: 0.1,
      levelup: 0.25, start: 0.5, death: 0.5, victory: 0.4, bossroar: 0.5, waveclear: 0.4,
      epicpull: 0.4, legendary: 0.8, stonebuy: 0.3, chestrare: 0.4, carddeal: 0.34,
      cta: 0.12, chestthud: 0.1, chestlatch: 0.2, chestburst: 0.7,
      adreward: 0.3, error: 0.15,
      /* v59: her olayın kendi sesi */
      heartbeat: 0.9, evocine: 1.2, chainboom: 0.12, harvest: 0.8, elitdown: 0.12, shieldbreak: 0.15, levelrise: 0.8,
      heroup: 0.8, panel: 0.08, unlockstart: 0.2, equip: 0.1, select: 0.2, copy: 0.3, star: 0.25, bless: 0.2,
      claim: 0.12, tierclaim: 0.4, gemspend: 0.2, walletin: 0.09, collect: 0.3, tally: 0.05, boot: 1, gateclose: 0.6,
      gatelock: 0.6, revive: 0.8, reveal: 0.2, tab: 0.06, dodge: 0.2, block: 0.15, heal: 0.12, throw: 0.08,
      judge: 0.12, storm: 0.14, frostnova: 0.2, firebomb: 0.12, blast: 0.3, propbreak: 0.08, synergy: 0.5,
      fieldchest: 0.5, rescue: 0.6, delivered: 0.8, objfail: 0.6, bossarrive: 0.6, bosscast: 0.5, bossphase: 0.8,
      bossvolley: 0.3, bosswindup: 0.4, bosscharge: 0.3, bossland: 0.4, bossleap: 0.4, telegraph: 0.2,
      poison: 0.3, bombhit: 0.2, thaw: 0.3, combo: 0.3, ultready: 1, ultfire: 0.8, curse: 0.6, altar: 0.8, event: 1, ulthit: 0.06,
    };
  }

  /* ═══════════ KURULUM ═══════════ */

  /** Kullanıcı dokunuşunda çağrılır — mobil autoplay kilidini açar. */
  unlock() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;                       // ses desteklemeyen ortamda sessizce çalış

    const c = this.ctx = new AC();

    /* ── LİMİTER: son katman. Kalabalık savaşta kırpılmayı önler ve
       her şeye tek parça, "basılmış" bir tokluk verir. ── */
    const lim = c.createDynamicsCompressor();
    lim.threshold.value = -9;
    lim.knee.value = 8;
    lim.ratio.value = 11;
    lim.attack.value = 0.003;
    lim.release.value = 0.16;

    const out = c.createGain();
    out.gain.value = this.volume;
    lim.connect(out);
    out.connect(c.destination);
    this.outGain = out;

    /* ── DC ENGELİ: waveshaper (sat) yolundan gelen sabit ofset birikmesin.
       Doyum eğrisi tam ortadan geçse bile filtre/örnekleme yuvarlamaları
       küçük bir DC bırakabilir; 20 Hz highpass bunu kalıcı olarak keser.
       DC birikmesi duyulmaz ama limiter'i yavaş yavaş kapatıp bütün mixi
       bozar — sessiz ve teşhisi zor bir arıza sınıfıdır. ── */
    const dc = c.createBiquadFilter();
    dc.type = 'highpass';
    dc.frequency.value = 20;
    dc.Q.value = 0.5;
    dc.connect(lim);

    this.dry = c.createGain(); this.dry.gain.value = 1;
    this.dry.connect(dc);

    /* ── KONVOLÜSYON YANKISI: sentezlenmiş "taş mahzen" dürtü yanıtı.
       Erken yansımalar (ilk 90 ms'de birkaç ayrık sıçrama) + üstel
       sönümlü gürültü kuyruğu. Sol/sağ kanal ayrı üretilir → doğal
       genişlik. Kuyruk mobilde ucuz kalsın diye 1.15 sn. ── */
    const sr = c.sampleRate;
    const irLen = Math.floor(sr * 1.15);
    const ir = c.createBuffer(2, irLen, sr);
    for (let ch = 0; ch < 2; ch++) {
      const d = ir.getChannelData(ch);
      for (let i = 0; i < irLen; i++) {
        const t = i / irLen;
        /* üstel sönüm + yüksek frekansların daha hızlı ölmesi (havada
           soğurulma taklidi: gürültüyü kendi geçmişiyle yumuşat) */
        d[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, 3.1);
      }
      /* basit tek kutuplu alçak geçiren: kuyruk ilerledikçe koyulaşır */
      let prev = 0;
      for (let i = 0; i < irLen; i++) {
        const t = i / irLen;
        const a = 0.62 - 0.5 * t;          // t büyüdükçe daha çok yumuşatma
        prev = prev + a * (d[i] - prev);
        d[i] = prev;
      }
      /* erken yansımalar — mekânı "oda" yapan şey bunlar */
      const taps = [0.011, 0.019, 0.029, 0.041, 0.058, 0.077];
      for (let k = 0; k < taps.length; k++) {
        const idx = Math.floor((taps[k] + (ch ? 0.0031 : 0)) * sr);
        if (idx < irLen) d[idx] += (0.55 - k * 0.07) * (ch ? -1 : 1);
      }
    }
    const conv = c.createConvolver();
    conv.buffer = ir;
    conv.normalize = true;
    this._ir = ir;                 // v73b: ses bankası aynı yankıyı pişirir

    /* yankıya giden yolda hafif bant sınırlama: çamurlu bas ve tiz cızırtı
       yankıya girmez → temiz, pahalı duran kuyruk */
    const revHp = c.createBiquadFilter(); revHp.type = 'highpass'; revHp.frequency.value = 260;
    const revLp = c.createBiquadFilter(); revLp.type = 'lowpass'; revLp.frequency.value = 7200;
    const revOut = c.createGain(); revOut.gain.value = 0.9;

    this.send = c.createGain(); this.send.gain.value = 1;
    this.send.connect(revHp); revHp.connect(revLp); revLp.connect(conv);
    conv.connect(revOut); revOut.connect(dc);

    /* 2 saniyelik beyaz gürültü tamponu (tüm noise katmanları buradan okur) */
    const nLen = sr * 2;
    this.noiseBuf = c.createBuffer(1, nLen, sr);
    const nd = this.noiseBuf.getChannelData(0);
    for (let i = 0; i < nLen; i++) nd[i] = Math.random() * 2 - 1;

    /* Yumuşak doyum eğrisi — gövde katmanlarına sıcaklık/kalınlık verir.
       UZUNLUK TEK OLMAK ZORUNDA: WaveShaper girişi −1'i curve[0]'a, +1'i
       curve[n−1]'e eşler. Çift uzunlukta 0 girişi iki komşu örnek arasına
       düşer ve sıfırdan farklı bir değere interpole edilir → her sat sesi
       sonsuza dek küçük bir DC yayar, bu da art arda binlerce vuruşta
       toplanıp mixi çökertir. Tek uzunlukta orta indeks TAM x=0'dır. */
    const n = 1025, half = (n - 1) / 2;
    this.distCurve = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const x = i / half - 1;
      this.distCurve[i] = Math.tanh(x * 2.4) * 0.92;
    }
    this.distCurve[half] = 0;      // ortayı açıkça sıfırla (kayan nokta güvencesi)
    this._prebake();               // v73b: savaş sesleri menüde (sakin anda) önceden pişer
  }

  setVolume(v) {
    this.volume = Math.max(0, Math.min(1, v));
    if (this.outGain) this.outGain.gain.value = this.muted ? 0 : this.volume;
  }
  setMuted(m) {
    this.muted = !!m;
    if (this.outGain) this.outGain.gain.value = this.muted ? 0 : this.volume;
  }

  /* ═══════════ ALTYAPI ═══════════ */

  _t(d) { return this.ctx.currentTime + (d || 0); }
  _g(v) { const g = this.ctx.createGain(); g.gain.value = v; return g; }

  /** Bir kaynağı kuru + yankı yollarına bağlar; istenirse stereo konumlandırır.
      chain verilirse oluşturulan ara düğümler oraya yazılır — ses bitince
      _kill() ile grafikten sökülürler. */
  _out(node, wet, pan, chain) {
    let head = node;
    if (pan && this.ctx.createStereoPanner) {
      const p = this.ctx.createStereoPanner();
      p.pan.value = Math.max(-1, Math.min(1, pan));
      node.connect(p);
      head = p;
      if (chain) chain.push(p);
    }
    head.connect(this.dry);
    if (wet > 0) {
      const w = this._g(wet);
      head.connect(w);
      w.connect(this.send);
      if (chain) chain.push(w);
    }
  }

  /** Sesi bitmiş bir zincirin TÜM düğümlerini grafikten söker.
      Bunu yapmazsak her çalınan ses ses iş parçacığında kalıcı düğüm
      bırakır: bir seferde binlerce vuruş = binlerce ölü düğüm (bkz.
      CLAUDE.md performans sözleşmesi, kural 1). */
  _kill(chain) {
    for (let i = 0; i < chain.length; i++) {
      try { chain[i].disconnect(); } catch (e) { /* zaten sökülmüş */ }
    }
    chain.length = 0;
  }

  /** Üstel ADSR — dijital "tık"tan kaçınmak için asla 0'a lineer inmez. */
  _env(g, t, atk, hold, dec, peak) {
    const p = Math.max(0.0005, peak);
    g.gain.setValueAtTime(0.00008, t);
    g.gain.exponentialRampToValueAtTime(p, t + Math.max(0.0008, atk));
    if (hold > 0) g.gain.setValueAtTime(p, t + atk + hold);
    g.gain.exponentialRampToValueAtTime(0.00008, t + atk + (hold || 0) + dec);
  }

  /**
   * Perdeli tek ses. o = {f0,f1,type,t,dur,vol,atk,hold,wet,pan,detune,
   *                       lp,lp1,q,glide,sat}
   */
  v(o) {
    const c = this.ctx;
    if (!c) return;
    const t = this._t(o.t);
    const osc = c.createOscillator();
    osc.type = o.type || 'sine';
    if (o.detune) osc.detune.value = o.detune;
    const f0 = Math.max(1, o.f0);
    osc.frequency.setValueAtTime(f0, t);
    if (o.f1 && o.f1 !== o.f0) {
      const gl = o.glide != null ? o.glide : o.dur;
      osc.frequency.exponentialRampToValueAtTime(Math.max(1, o.f1), t + gl);
    }
    const atk = o.atk == null ? 0.004 : o.atk;
    const g = c.createGain();
    this._env(g, t, atk, o.hold || 0, o.dur, o.vol);

    const chain = [osc, g];
    let tail = g;
    osc.connect(g);
    if (o.sat) {
      const ws = c.createWaveShaper();
      ws.curve = this.distCurve;
      ws.oversample = '2x';
      tail.connect(ws); tail = ws; chain.push(ws);
    }
    if (o.lp) {
      const f = c.createBiquadFilter();
      f.type = 'lowpass';
      f.Q.value = o.q || 0.8;
      f.frequency.setValueAtTime(o.lp, t);
      if (o.lp1) f.frequency.exponentialRampToValueAtTime(Math.max(60, o.lp1), t + o.dur);
      tail.connect(f); tail = f; chain.push(f);
    }
    this._out(tail, o.wet == null ? 0.07 : o.wet, o.pan, chain);
    osc.onended = () => this._kill(chain);
    osc.start(t);
    osc.stop(t + atk + (o.hold || 0) + o.dur + 0.09);
  }

  /**
   * Gürültü katmanı. o = {t,dur,vol,f0,f1,type,q,atk,hold,wet,pan}
   * type: 'lowpass' | 'bandpass' | 'highpass'
   */
  n(o) {
    const c = this.ctx;
    if (!c) return;
    const t = this._t(o.t);
    const src = c.createBufferSource();
    src.buffer = this.noiseBuf;
    if (o.rate) src.playbackRate.value = o.rate;
    const f = c.createBiquadFilter();
    f.type = o.type || 'bandpass';
    f.Q.value = o.q || 1;
    f.frequency.setValueAtTime(Math.max(30, o.f0), t);
    if (o.f1 && o.f1 !== o.f0) f.frequency.exponentialRampToValueAtTime(Math.max(30, o.f1), t + o.dur);
    const g = c.createGain();
    const atk = o.atk == null ? 0.002 : o.atk;
    this._env(g, t, atk, o.hold || 0, o.dur, o.vol);
    const chain = [src, f, g];
    src.connect(f); f.connect(g);
    this._out(g, o.wet == null ? 0.06 : o.wet, o.pan, chain);
    src.onended = () => this._kill(chain);
    src.start(t, Math.random() * 1.2);      // tamponda rastgele yer → her seferinde farklı
    src.stop(t + atk + (o.hold || 0) + o.dur + 0.06);
  }

  /** 2–8 ms'lik keskin transient — "vurdu" hissini veren şey budur. */
  tick(t, vol, hi, pan) {
    this.n({ t, dur: 0.008, vol, f0: hi || 6200, f1: (hi || 6200) * 0.45, type: 'highpass', q: 0.7, atk: 0.0006, wet: 0.02, pan });
  }

  /**
   * FM metal: inharmonik oranlı modülasyon → çan/kilit/zırh tınısı.
   * Gerçek metalin tını sırrı budur; saf sinüs asla metal gibi duymaz.
   */
  metal(o) {
    const c = this.ctx;
    if (!c) return;
    const t = this._t(o.t);
    const car = c.createOscillator(); car.type = 'sine';
    const mod = c.createOscillator(); mod.type = 'sine';
    const mg = c.createGain();
    car.frequency.value = o.f;
    mod.frequency.value = o.f * (o.ratio || 2.41);
    mg.gain.setValueAtTime(o.f * (o.index || 3.2), t);
    mg.gain.exponentialRampToValueAtTime(o.f * 0.06, t + o.dur * 0.55);
    mod.connect(mg); mg.connect(car.frequency);
    const g = c.createGain();
    this._env(g, t, o.atk == null ? 0.002 : o.atk, 0, o.dur, o.vol);
    car.connect(g);
    const chain = [car, mod, mg, g];
    this._out(g, o.wet == null ? 0.24 : o.wet, o.pan, chain);
    car.onended = () => this._kill(chain);
    car.start(t); mod.start(t);
    car.stop(t + o.dur + 0.15); mod.stop(t + o.dur + 0.15);
  }

  /**
   * Çan/kristal: temel + inharmonik üst kısımlar, her kısım ayrı sönümlü.
   * (Yüksek kısımlar daha hızlı ölür — gerçek çanlarda böyledir.)
   */
  bell(f, dur, vol, t, wet) {
    const P = [[1, 1, 1], [2.01, 0.42, 0.72], [2.98, 0.2, 0.5], [4.32, 0.1, 0.34], [5.9, 0.05, 0.24]];
    const pan = rnd(-0.16, 0.16);
    for (let i = 0; i < P.length; i++) {
      this.v({
        f0: f * P[i][0] * j(0.002), type: 'sine',
        t: (t || 0) + i * 0.0035, dur: dur * P[i][2], vol: vol * P[i][1],
        atk: 0.004, wet: wet == null ? 0.3 : wet, pan,
      });
    }
  }

  /**
   * Koro/org şişmesi: her nota iki detune'lu sesle, farklı gecikmeyle
   * girer (insan korosu asla tam senkron başlamaz — bu detay sesin
   * "canlı" duyulmasını sağlar).
   */
  choir(freqs, dur, vol, t0, wet) {
    const per = vol / Math.sqrt(freqs.length);
    for (let i = 0; i < freqs.length; i++) {
      const stagger = i * 0.018 + rnd(0, 0.02);
      for (let k = 0; k < 2; k++) {
        this.v({
          f0: freqs[i] * j(0.0025), type: k ? 'sine' : 'triangle',
          detune: k ? 7 + rnd(-3, 3) : -7 + rnd(-3, 3),
          t: (t0 || 0) + stagger, atk: dur * 0.26, hold: dur * 0.12, dur: dur * 0.7,
          vol: per * 0.5, wet: wet == null ? 0.42 : wet,
          lp: 3200, lp1: 1500, pan: (i % 2 ? 1 : -1) * 0.22,
        });
      }
    }
  }

  /**
   * Pirinç/korno notası — fanfarların omurgası. Testere yığını + alçak
   * geçiren zarf (filtre attack'i = "üfleme" hissi).
   */
  brass(f, t, dur, vol, pan) {
    for (let k = -1; k <= 1; k++) {
      this.v({
        f0: f * j(0.003), type: 'sawtooth', detune: k * 9,
        t, atk: 0.035, hold: dur * 0.42, dur: dur * 0.62,
        vol: vol * 0.36, lp: f * 2.2, lp1: f * 5.5, q: 1.3,
        wet: 0.3, sat: true, pan: (pan || 0) + k * 0.13,
      });
    }
    /* üfleme gürültüsü — nefesli çalgıyı "gerçek" yapan mikro detay */
    this.n({ t, dur: 0.07, vol: vol * 0.07, f0: f * 4, f1: f * 2, type: 'bandpass', q: 1.1, wet: 0.15 });
  }

  /** Timpani/davul: perdesi hızla düşen sinüs + deri gürültüsü. */
  drum(f, t, dur, vol, pan) {
    this.v({ f0: f * j(0.03), f1: f * 0.42, type: 'sine', t, atk: 0.002, dur, vol, glide: dur * 0.55, wet: 0.16, pan, sat: true });
    this.n({ t, dur: dur * 0.35, vol: vol * 0.32, f0: 900, f1: 180, type: 'lowpass', q: 0.9, wet: 0.1, pan });
  }

  /** Havada süzülen kesik/geçiş — bandı süpürülen gürültü + doppler. */
  whoosh(t, dur, vol, up, pan) {
    const a = up ? 380 : 2600, b = up ? 3200 : 320;
    this.n({ t, dur, vol, f0: a, f1: b, type: 'bandpass', q: 1.15, atk: dur * 0.3, wet: 0.16, pan });
    this.n({ t, dur: dur * 0.8, vol: vol * 0.4, f0: a * 1.9, f1: b * 1.9, type: 'bandpass', q: 2.2, atk: dur * 0.34, wet: 0.2, pan: -(pan || 0) });
  }

  /** Gerilim yükseltici: perdesi ve parlaklığı birlikte tırmanan katman. */
  riser(t, dur, vol, wet) {
    this.n({ t, dur, vol: vol * 0.7, f0: 300, f1: 5200, type: 'bandpass', q: 1.4, atk: dur * 0.75, wet: wet == null ? 0.3 : wet });
    this.v({ f0: 180, f1: 1400, type: 'sawtooth', t, atk: dur * 0.7, dur: dur * 0.3, vol: vol * 0.22, lp: 900, lp1: 5000, q: 3.5, wet: 0.24 });
  }

  /**
   * Tahta gıcırtısı: perdesi rastgele adımlarla yürüyen dar bantlı ses.
   * Rastgele yürüyüş olmadan "gıcırtı" değil "sinyal" gibi duyulur.
   */
  creak(t, dur, vol) {
    const c = this.ctx;
    if (!c) return;
    const t0 = this._t(t);
    const osc = c.createOscillator();
    osc.type = 'sawtooth';
    let f = rnd(140, 190);
    osc.frequency.setValueAtTime(f, t0);
    const steps = Math.max(6, Math.round(dur / 0.035));
    for (let i = 1; i <= steps; i++) {
      f = Math.max(90, Math.min(430, f * (1 + rnd(-0.1, 0.16))));
      osc.frequency.setValueAtTime(f, t0 + (dur * i) / steps);
    }
    const bp = c.createBiquadFilter();
    bp.type = 'bandpass'; bp.Q.value = 7.5;
    bp.frequency.setValueAtTime(rnd(600, 900), t0);
    bp.frequency.linearRampToValueAtTime(rnd(1100, 1600), t0 + dur);
    const g = c.createGain();
    this._env(g, t0, 0.03, dur * 0.4, dur * 0.5, vol);
    osc.connect(bp); bp.connect(g);
    const chain = [osc, bp, g];
    this._out(g, 0.22, rnd(-0.2, 0.2), chain);
    osc.onended = () => this._kill(chain);
    osc.start(t0); osc.stop(t0 + dur + 0.1);
    /* lif çatırtısı */
    this.n({ t, dur: dur * 0.9, vol: vol * 0.3, f0: 2400, f1: 1200, type: 'bandpass', q: 3, atk: 0.02, wet: 0.18 });
  }

  /** v59 seviye arpı — levelup ve heroup ortak çekirdeği (yalnız seviye aileleri paylaşır). */
  _lvArp(t0, k) {
    const N = [G4, B4, D5, G5];
    for (let i = 0; i < N.length; i++) this.bell(N[i] * j(0.002), 0.55 + i * 0.1, 0.07 * k, t0 + i * 0.07, 0.32);
    this.v({ f0: G3, type: 'sine', t: t0, dur: 0.8, vol: 0.055 * k, atk: 0.03, hold: 0.12, wet: 0.26 });
    this.v({ f0: D4, type: 'triangle', t: t0 + 0.02, dur: 0.7, vol: 0.03 * k, atk: 0.06, lp: 1800, wet: 0.3 });
    this.n({ t: t0 + 0.2, dur: 0.55, vol: 0.026 * k, f0: 3000, f1: 8500, type: 'bandpass', q: 1.3, atk: 0.3, wet: 0.42 });
    this.bell(D6, 0.7, 0.035 * k, t0 + 0.32, 0.42);
  }

  /** Nota dizisini step aralıklarla çalar (geriye dönük uyumluluk). */
  arp(freqs, step, dur, type, vol) {
    for (let i = 0; i < freqs.length; i++) {
      this.v({ f0: freqs[i], type: type || 'triangle', t: i * step, dur, vol, wet: 0.14 });
    }
  }

  /** n varyantlı havuzdan rastgele seçer, SON ÇALANI tekrarlamaz.
      Tahsissiz ve dallanması sabit — sivri seslerin sıcak yolunda. */
  pick(name, n) {
    const last = this.rr[name];
    let i = (Math.random() * n) | 0;
    if (i === last) i = (i + 1 + ((Math.random() * (n - 1)) | 0)) % n;
    this.rr[name] = i;
    return i;
  }

  /* eski API adları — dışarıdan çağıran kod kırılmasın */
  tone(f0, f1, dur, type, vol, delay, wet) { this.v({ f0, f1, dur, type, vol, t: delay || 0, wet: wet == null ? 0.06 : wet }); }
  noise(dur, vol, f0, f1, delay, type, q, wet) { this.n({ dur, vol, f0, f1, t: delay || 0, type: type || 'lowpass', q: q || 1, wet: wet == null ? 0.05 : wet }); }

  /* ═══════════ v73b SES BANKASI (oyun motoru yöntemi) ═══════════
     Eskiden HER tetik 10-30 düğümlük grafik kuruyordu (osilatör + filtre + doyum + panner + yankı
     gönderimi): kalabalık savaşta saniyede yüzlerce düğüm = ana iş parçacığında graf kilidi + çöp
     toplama + ses iş parçacığında konvolüsyon. Artık her ses (ve varyantı) BIR KEZ OfflineAudioContext'te
     — AYNI sentez kodu, AYNI yankı — tampona pişer; sonraki tetikler TEK AudioBufferSourceNode.
     Canlı zincirin DC filtresi + limiter + ses düzeyi aynen uygulanır (tampon this.dry'a bağlanır).
     · Pişirme yalnız sakin anda (menü/duraklat/kart/sonuç — main `_calm` yazar), tek tek.
     · Arayüz sesleri + durum okuyan 'gem' pişmez; ulthit/ultfire/combo durum anahtarıyla pişer.
     · Mono (telefon hoparlörü zaten mono), sonda −72 dB'de kırpılır. Tavan 4 M örnek (~16 MB;
       deviceMemory ≤ 3 → 1,5 M), aşılırsa kalan sesler canlı çalar.
     · 2,4 sn'ye sığmayan (kuyruğu kesilen) ses kara listeye alınır, hep canlı çalar. */
  _bkey(name, k) {
    if (UI_SND[name] || name === 'gem' || (this._noBake && this._noBake[name])) return null;
    let key = name + ((this._usesK && this._usesK[name] === false) ? 0 : k);
    if (name === 'ulthit') key += '|' + this.ultKind;
    else if (name === 'ultfire') key += '|' + this.ultKind + '|' + this.ultTier;
    else if (name === 'combo') key += '|' + this.comboTier;
    return key;
  }

  _bankPlay(name, k) {
    const B = this._bank;
    if (!B || !B.size) return false;
    const key = this._bkey(name, k);
    const b = key && B.get(key);
    if (!b) return false;
    const s = this.ctx.createBufferSource();
    s.buffer = b;
    /* sık sesler ±%1,2 perde: aynı örnek art arda aynı duyulmaz (seyrek/tonal sesler müzikle akortlu kalır) */
    if ((this.minGap[name] || 0.035) < 0.15) s.playbackRate.value = j(0.012);
    s.connect(this.dry);
    s.onended = () => { try { s.disconnect(); } catch (e) { /* */ } };
    s.start();
    return true;
  }

  _bankCap() { return (navigator.deviceMemory || 4) <= 3 ? 1.5e6 : 4e6; }

  _bakeLater(name, k) {
    if (typeof OfflineAudioContext === 'undefined' || !this.ctx || !this._ir) return;
    const key = this._bkey(name, k);
    if (!key) return;
    const B = this._bank || (this._bank = new Map());
    const Q = this._bq || (this._bq = new Map());
    if (B.has(key) || Q.has(key) || (this._bankN || 0) >= this._bankCap()) return;
    Q.set(key, { name, k, uk: this.ultKind, ut: this.ultTier, ct: this.comboTier });
    this._bakeKick(400);
  }

  _bakeKick(ms) {
    if (this._bqT) return;
    this._bqT = setTimeout(() => { this._bqT = 0; this._bakeRun(); }, ms);
  }

  _bakeRun() {
    const Q = this._bq;
    if (!Q || !Q.size || this._baking || !this.ctx) return;
    if (!this._calm || document.hidden) { this._bakeKick(900); return; }
    const first = Q.entries().next().value, key = first[0], job = first[1];
    Q.delete(key);
    const sr = this.ctx.sampleRate;
    let off;
    try { off = new OfflineAudioContext(1, Math.round(sr * 2.4), sr); } catch (e) { return; }
    const L = [this.ctx, this.dry, this.send, this.ultKind, this.ultTier, this.comboTier];
    const dry = off.createGain(), send = off.createGain();
    dry.connect(off.destination);
    const hp = off.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 260;
    const lp = off.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 7200;
    const cv = off.createConvolver(); cv.normalize = true; cv.buffer = this._ir;
    const ro = off.createGain(); ro.gain.value = 0.9;
    send.connect(hp); hp.connect(lp); lp.connect(cv); cv.connect(ro); ro.connect(off.destination);
    this.ctx = off; this.dry = dry; this.send = send;
    this.ultKind = job.uk; this.ultTier = job.ut; this.comboTier = job.ct;
    let ok = true;
    try { this._synth(job.name, job.k, 0, 0); } catch (e) { ok = false; }
    this.ctx = L[0]; this.dry = L[1]; this.send = L[2]; this.ultKind = L[3]; this.ultTier = L[4]; this.comboTier = L[5];
    if (!ok) { (this._noBake || (this._noBake = {}))[job.name] = 1; this._bakeKick(60); return; }
    this._baking = true;
    off.startRendering().then((buf) => this._bankPut(key, job.name, buf), () => { /* */ }).then(() => {
      this._baking = false;
      if (Q.size) this._bakeKick(30);
    });
  }

  _bankPut(key, name, buf) {
    const d = buf.getChannelData(0), n = d.length, sr = buf.sampleRate;
    let tail = 0;
    for (let x = n - Math.round(sr * 0.02); x < n; x++) { const a = d[x] < 0 ? -d[x] : d[x]; if (a > tail) tail = a; }
    if (tail > 1e-3) { (this._noBake || (this._noBake = {}))[name] = 1; return; }   // 2,4 sn'ye sığmadı
    let e = n - 1;
    while (e > 0 && d[e] < 2.5e-4 && d[e] > -2.5e-4) e--;
    if (e < 64) return;
    const m = Math.min(n, e + Math.round(sr * 0.01));
    const out = this.ctx.createBuffer(1, m, sr);
    out.copyToChannel(d.subarray(0, m), 0);
    this._bank.set(key, out);
    this._bankN = (this._bankN || 0) + m;
  }

  _prebake() {
    if (this._pb || typeof OfflineAudioContext === 'undefined') return;
    this._pb = true;
    const parts = String(this._synth).split(/\n\s*case '/), K = this._usesK = {};
    for (let i = 1; i < parts.length; i++) {
      const m = parts[i].match(/^([a-z0-9_]+)'/);
      if (m) K[m[1]] = /\bk\b/.test(parts[i]) || !/\bbreak\b/.test(parts[i]);   // düşme (fallthrough) → güvenli taraf: 3 varyant
    }
    for (const nm in K) if (nm !== 'ulthit' && nm !== 'ultfire' && nm !== 'combo') this._bakeLater(nm, 0);
  }

  /* ═══════════ EFEKT TABLOSU ═══════════ */

  play(name) {
    if (!this.ctx || this.ctx.state !== 'running' || this.muted) return;

    const now = this.ctx.currentTime;
    /* v56 B4 · SES TAVANI: aynı karede (16 ms) en çok 6 ses — kalabalıkta karışım çamurlaşmıyor. Arayüz sesleri muaf. */
    if (!UI_SND[name]) { if (now - (this._vt || 0) > 0.016) { this._vt = now; this._vn = 0; } if (++this._vn > 6) return; }
    const gap = this.minGap[name] || 0.035;
    if (now - (this.lastPlayed[name] || -10) < gap) return;
    this.lastPlayed[name] = now;

    /* VARYANT SEÇİMİ (2026-08-29): rastgele, ama ARDIL TEKRAR YOK.
       Sıralı round-robin üç tetikte bir öngörülebilir desen kuruyordu
       (A-B-C-A-B-C); kulak deseni öğrenince varyant olmanın anlamı kalmıyor.
       Saf rastgele ise aynı varyantı üst üste çalıp "tek ses" duyulur —
       3 varyantta bunun olasılığı her tetikte 1/3. İkisinin arası: rastgele
       + son çalan yasak. Bu k, SİVİ SESLERİN HEPSİ tarafından okunur
       (hit · crit · sword · shoot …), yalnız zaferle sınırlı değil. */
    const k = this.pick(name, 3);
    const p = rnd(-0.28, 0.28);      // her ses hafifçe farklı yerden gelir
    /* v73b SES BANKASI: pişmiş örnek varsa TEK düğümle çal; yoksa canlı sentezle, pişirmeyi sıraya koy */
    if (this._bankPlay(name, k)) return;
    this._synth(name, k, p, now);
    this._bakeLater(name, k);
  }

  _synth(name, k, p, now) {
    switch (name) {

      /* ─────────── SAVAŞ: VURUŞ ─────────── */

      case 'hit': {
        /* transient (deri/zırh tıkırtısı) + kısa gövde + boğuk kuyruk.
           Perde her vuruşta ±%9 sapar → 200 vuruş üst üste yorucu olmaz. */
        const f = 196 * j(0.09);
        this.tick(0, 0.09, 5200 + k * 700, p);
        this.v({ f0: f, f1: f * 0.42, type: 'triangle', t: 0.001, dur: 0.052, vol: 0.13, atk: 0.001, lp: 2100, wet: 0.05, pan: p, sat: true });
        this.n({ t: 0.002, dur: 0.045, vol: 0.075, f0: 1500 * j(0.15), f1: 420, type: 'bandpass', q: 1.5, wet: 0.06, pan: p });
        break;
      }
      case 'crit': {
        /* daha derin gövde + metalik çınlama + kısa parlama.
           "Kritik" hissi ses seviyesinden değil, TINI zenginliğinden gelir. */
        const f = 150 * j(0.06);
        this.tick(0, 0.14, 7400, p);
        this.v({ f0: f * 3.1, f1: f * 0.9, type: 'sawtooth', t: 0, dur: 0.075, vol: 0.11, atk: 0.001, lp: 3400, lp1: 900, q: 2.2, wet: 0.08, pan: p, sat: true });
        this.v({ f0: f, f1: f * 0.4, type: 'sine', t: 0, dur: 0.13, vol: 0.17, atk: 0.001, wet: 0.06, pan: p, sat: true });
        this.metal({ f: 1240 * j(0.05), ratio: 2.76, index: 4.2, dur: 0.24, vol: 0.075, t: 0.006, wet: 0.3, pan: p });
        this.n({ t: 0.004, dur: 0.1, vol: 0.09, f0: 5200, f1: 1100, type: 'bandpass', q: 1.2, wet: 0.12, pan: -p });
        break;
      }
      case 'kill': {
        /* kemik çatırtısı: iki hızlı gürültü darbesi + çöken alt gövde */
        this.n({ t: 0, dur: 0.035, vol: 0.13, f0: 2600, f1: 700, type: 'bandpass', q: 1.1, wet: 0.08, pan: p });
        this.n({ t: 0.028 * j(0.3), dur: 0.06, vol: 0.1, f0: 1500, f1: 320, type: 'bandpass', q: 0.9, wet: 0.1, pan: p });
        this.v({ f0: 128 * j(0.1), f1: 46, type: 'triangle', t: 0, dur: 0.16, vol: 0.15, atk: 0.002, lp: 1400, lp1: 320, wet: 0.1, pan: p, sat: true });
        break;
      }
      case 'sword': {
        /* havada kesim: iki katmanlı süpürme + ucunda ince metal ıslığı.
           Round-robin ile üç farklı savurma karakteri. */
        const dur = [0.13, 0.11, 0.155][k];
        this.whoosh(0, dur, 0.11 * j(0.12), false, p);
        this.n({ t: 0.01, dur: dur * 0.45, vol: 0.05, f0: 7800 * j(0.1), f1: 2600, type: 'highpass', q: 0.8, wet: 0.14, pan: p });
        this.v({ f0: 2450 * j(0.07), f1: 780, type: 'triangle', t: 0.012, dur: 0.045, vol: 0.035, atk: 0.003, wet: 0.16, pan: -p });
        break;
      }
      case 'shoot': {
        const f = 720 * j(0.08);
        this.tick(0, 0.05, 6800, p);
        this.v({ f0: f, f1: f * 0.36, type: 'triangle', t: 0, dur: 0.075, vol: 0.1, atk: 0.001, lp: 3800, lp1: 900, wet: 0.1, pan: p });
        this.n({ t: 0, dur: 0.05, vol: 0.05, f0: 3400, f1: 900, type: 'bandpass', q: 1.4, wet: 0.1, pan: p });
        break;
      }
      case 'cannon': {
        /* KAPTAN TOPU — 2026-09-05. ESKİ HALİ 'thunder'DI (topatar `orb: true`
           taşıyor ve o dal Şimşek'in gök gürültüsüne düşüyordu): 0,7 sn'lik
           testere-dişli bas gürleme + geniş bantlı gürültü, saniyede birkaç
           kez. Kullanıcı haklı olarak "rahatsız edici" dedi — bir SİLAH sesi
           kısa ve KAPALI olmak zorunda; uzun kuyruk üst üste binince mix
           çamurlaşır ve kulak yorulur.
           YENİ DİL: barut ATEŞLENDİĞİ belli ama sivri hiçbir bileşen yok —
           (a) yumuşak ataklı yuvarlak alt darbe (tık YOK: atk 6 ms),
           (b) alçak geçiren barut püfü (parlaklık 700 Hz'de kesilir),
           (c) namlunun ahşap/demir gövde tokluğu.
           Kuyruk 0,26 sn: art arda üç atış birbirine binmez. */
        this.v({ f0: 96 * j(0.05), f1: 40, type: 'sine', t: 0, dur: 0.26, vol: 0.20,
          atk: 0.006, glide: 0.10, lp: 520, lp1: 160, wet: 0.16, pan: p });
        this.n({ t: 0, dur: 0.15, vol: 0.085, f0: 700, f1: 150, type: 'lowpass',
          q: 0.7, atk: 0.008, wet: 0.14, pan: p });
        this.v({ f0: 212 * j(0.04), f1: 118, type: 'triangle', t: 0.006, dur: 0.10,
          vol: 0.05, atk: 0.005, lp: 1200, lp1: 420, wet: 0.10, pan: p });
        break;
      }
      case 'hurt': {
        /* oyuncu hasarı: göğüste hissedilen boğuk darbe + kısa acı tonu.
           Parlaklık BİLEREK düşük — tiz bir "hasar aldın" sesi yorar. */
        this.v({ f0: 118 * j(0.06), f1: 44, type: 'sine', t: 0, dur: 0.24, vol: 0.2, atk: 0.002, wet: 0.1, sat: true });
        this.n({ t: 0, dur: 0.09, vol: 0.12, f0: 1100, f1: 200, type: 'lowpass', q: 1.1, wet: 0.1 });
        this.v({ f0: 330 * j(0.05), f1: 150, type: 'sawtooth', t: 0.004, dur: 0.1, vol: 0.055, atk: 0.004, lp: 1300, lp1: 500, q: 2, wet: 0.14, sat: true });
        break;
      }
      case 'thunder': {
        this.v({ f0: 72, f1: 30, type: 'sine', t: 0, dur: 0.45, vol: 0.2, atk: 0.006, wet: 0.24, sat: true });   // v59: testere + 0,7 sn gürleme yorucuydu
        this.n({ t: 0, dur: 0.4, vol: 0.15, f0: 1400, f1: 90, type: 'lowpass', q: 0.8, wet: 0.3 });
        this.n({ t: 0.005, dur: 0.12, vol: 0.14, f0: 9000, f1: 2200, type: 'highpass', q: 0.7, wet: 0.22, pan: p });
        break;
      }
      case 'simsekvur': {
        /* ŞİMŞEK ÇARPMASI: 'thunder' gibi gürleyen bir bas patlaması DEĞİL —
           tekrar tekrar çaldığında yormaması gereken kısa, tiz bir elektrik
           çatırtısı. Önce hafifçe şişen bir yükseliş (şarj), sonra keskin bir
           zap inişi + kıvılcım talı. Hiç alt bas yok — tüm enerji orta-tiz
           bölgede, bu yüzden boğuk/rahatsız değil çıtırtılı hissediyor. */
        this.n({ t: 0, dur: 0.14, vol: 0.16, f0: 900, f1: 6200, type: 'bandpass', q: 1.6, atk: 0.045, wet: 0.3, pan: p });
        this.v({ f0: 2200 * j(0.08), f1: 300, type: 'triangle', t: 0.03, dur: 0.08, vol: 0.08, atk: 0.002, wet: 0.22, pan: p, sat: true });
        this.n({ t: 0.03, dur: 0.05, vol: 0.09, f0: 9000, f1: 3000, type: 'highpass', q: 0.8, wet: 0.2, pan: -p });
        break;
      }
      case 'zone': {
        this.n({ t: 0, dur: 0.42, vol: 0.13, f0: 620, f1: 130, type: 'bandpass', q: 1.2, atk: 0.05, wet: 0.26 });
        this.v({ f0: 148, f1: 78, type: 'triangle', t: 0, dur: 0.34, vol: 0.09, atk: 0.04, lp: 700, wet: 0.22, sat: true });
        this.v({ f0: 296, f1: 156, type: 'sine', t: 0.02, dur: 0.3, vol: 0.04, atk: 0.06, wet: 0.28 });
        break;
      }
      case 'boom': {
        this.v({ f0: 150 * j(0.08), f1: 30, type: 'sine', t: 0, dur: 0.42, vol: 0.26, atk: 0.002, glide: 0.2, wet: 0.2, sat: true });
        this.n({ t: 0, dur: 0.36, vol: 0.18, f0: 1900, f1: 80, type: 'lowpass', q: 0.9, wet: 0.24 });
        this.n({ t: 0, dur: 0.05, vol: 0.16, f0: 7000, f1: 2000, type: 'highpass', q: 0.7, wet: 0.1, pan: p });
        break;
      }
      case 'bossroar': {
        /* kükreme: iki uyumsuz formant + gırtlak titreşimi */
        this.v({ f0: 96, f1: 52, type: 'sawtooth', t: 0, dur: 0.9, vol: 0.2, atk: 0.07, hold: 0.2, lp: 620, lp1: 210, q: 3.4, wet: 0.32, sat: true });
        this.v({ f0: 143, f1: 74, type: 'sawtooth', t: 0.02, dur: 0.85, vol: 0.1, atk: 0.1, hold: 0.15, lp: 1500, lp1: 400, q: 5.5, wet: 0.34, sat: true, pan: 0.2 });
        this.n({ t: 0, dur: 0.9, vol: 0.16, f0: 480, f1: 90, type: 'bandpass', q: 0.7, atk: 0.08, wet: 0.34 });
        this.drum(58, 0.0, 0.7, 0.22);
        break;
      }

      /* ─────────── TOPLAMA / İLERLEME ─────────── */

      case 'gem': {
        /* EXP TOPLAMA — kasıtlı olarak ÇOK KISIK ve KISA. Saniyede
           onlarca kez çalıyor: yorucu olmaması için (a) seviyesi düşük,
           (b) perde merdiveni yukarı tırmanıp 0.7 sn sessizlikte sıfırlanır
           → art arda toplama bir arpej gibi duyulur, gürültü değil. */
        if (now - this.gemLastT > 0.7) this.gemStep = 0;
        this.gemLastT = now;
        const LAD = [0, 2, 4, 7, 9, 12, 14, 16];
        const semi = LAD[this.gemStep % LAD.length] + 12 * Math.floor(this.gemStep / LAD.length);
        this.gemStep = Math.min(this.gemStep + 1, LAD.length * 2 - 1);
        const f = 880 * Math.pow(2, Math.min(semi, 26) / 12);
        this.v({ f0: f, type: 'sine', t: 0, dur: 0.075, vol: 0.032, atk: 0.002, wet: 0.14, pan: rnd(-0.25, 0.25) });
        this.v({ f0: f * 2, type: 'sine', t: 0, dur: 0.04, vol: 0.011, atk: 0.001, wet: 0.1 });
        break;
      }
      case 'coin': {
        this.metal({ f: 2100 * j(0.05), ratio: 3.4, index: 2.6, dur: 0.13, vol: 0.06, t: 0, wet: 0.26, pan: p });
        this.metal({ f: 3050 * j(0.05), ratio: 2.9, index: 2.2, dur: 0.1, vol: 0.035, t: 0.035, wet: 0.28, pan: -p });
        break;
      }
      case 'pick': {
        /* onay: iki notalı kısa yükseliş (D5 → G5), kristal tınısı */
        this.bell(D5, 0.16, 0.1, 0, 0.24);
        this.bell(G5, 0.22, 0.085, 0.055, 0.28);
        this.tick(0, 0.03, 8000, p);
        break;
      }
      case 'buy': {
        /* satın alma: kese/madeni para + onay çanı */
        this.metal({ f: 1750, ratio: 3.1, index: 2.4, dur: 0.12, vol: 0.05, t: 0, wet: 0.22 });
        this.metal({ f: 2400, ratio: 2.6, index: 2, dur: 0.1, vol: 0.038, t: 0.045, wet: 0.24, pan: 0.15 });
        this.bell(G5, 0.3, 0.075, 0.08, 0.3);
        this.n({ t: 0, dur: 0.09, vol: 0.045, f0: 3800, f1: 1200, type: 'bandpass', q: 1.2, wet: 0.14 });
        break;
      }
      case 'stonebuy': {
        /* premium: yükselen kristal üçlü + alt ağırlık */
        this.bell(Bb4, 0.3, 0.1, 0, 0.3);
        this.bell(D5, 0.32, 0.09, 0.07, 0.32);
        this.bell(G5, 0.5, 0.095, 0.14, 0.36);
        this.v({ f0: G3, type: 'sine', t: 0, dur: 0.5, vol: 0.07, atk: 0.02, wet: 0.2, sat: true });
        this.n({ t: 0.12, dur: 0.4, vol: 0.04, f0: 6500, f1: 2200, type: 'bandpass', q: 1.3, atk: 0.1, wet: 0.3 });
        break;
      }
      case 'levelup': {
        /* v59 SEVİYE — oyundaki TÜM seviye anları (koşu içi seviye, hesap seviyesi, eşya geliştirme).
           Eski sürüm testere borazan + koro yastığıydı: "ucuz synth fanfarı". Yeni: kristal arp
           (G majör, dört nota) + sıcak alt ton + yükselen parıltı. Borazan, kare/testere YOK. */
        this._lvArp(0, 1);
        break;
      }
      case 'heroup': {
        /* v59 KAHRAMAN TÖRENİ ile eş zamanlı: 0-0,6 birikim (yumuşak yükseliş) → 0,6 darbe → seviye arpı. */
        this.n({ t: 0, dur: 0.6, vol: 0.05, f0: 400, f1: 4200, type: 'bandpass', q: 1.3, atk: 0.5, wet: 0.34 });
        this.v({ f0: G3, f1: G4, type: 'triangle', t: 0, dur: 0.6, vol: 0.05, atk: 0.5, lp: 900, lp1: 2600, wet: 0.3 });
        this.drum(66, 0.6, 0.5, 0.18);
        this.metal({ f: 1568, ratio: 2.01, index: 2.6, dur: 0.9, vol: 0.05, t: 0.6, wet: 0.45 });
        this.n({ t: 0.6, dur: 0.08, vol: 0.05, f0: 7000, f1: 2400, type: 'highpass', q: 0.7, wet: 0.2 });
        this._lvArp(0.64, 1.1);
        break;
      }
      case 'reroll': {
        this.whoosh(0, 0.16, 0.075, true, p);
        this.metal({ f: 1400, ratio: 1.73, index: 3, dur: 0.14, vol: 0.045, t: 0.06, wet: 0.24, pan: -p });
        break;
      }

      /* ─────────── ARAYÜZ ─────────── */

      case 'click': {
        /* yumuşak, tok "tak" — cırtlak bip değil */
        this.v({ f0: 620 * j(0.04), f1: 300, type: 'triangle', t: 0, dur: 0.028, vol: 0.055, atk: 0.0008, lp: 3200, wet: 0.04 });
        this.tick(0, 0.035, 5600, p);
        break;
      }
      case 'error': {
        /* v59: kare dalga vızıltısı kalktı → yumuşak iki notalı "hayır" (üçgen, alçak geçiren) */
        this.v({ f0: 330, f1: 300, type: 'triangle', t: 0, dur: 0.09, vol: 0.05, atk: 0.004, lp: 1400, wet: 0.08 });
        this.v({ f0: 262, f1: 240, type: 'triangle', t: 0.09, dur: 0.12, vol: 0.045, atk: 0.004, lp: 1200, wet: 0.1 });
        break;
      }
      case 'cta': {
        /* SAVAŞ butonu: kından çekilen kılıç — metal sürtünmesi, ardından
           parlak bir çınlama. Kornodan (start) hemen önce çalar. */
        this.n({ t: 0, dur: 0.17, vol: 0.1, f0: 1400, f1: 6200, type: 'bandpass', q: 1.5, atk: 0.1, wet: 0.2, pan: -0.2 });
        this.metal({ f: 2650, ratio: 2.41, index: 3.6, dur: 0.5, vol: 0.075, t: 0.14, wet: 0.4, pan: 0.15 });
        this.metal({ f: 3900, ratio: 3.11, index: 2.4, dur: 0.35, vol: 0.035, t: 0.155, wet: 0.42, pan: -0.15 });
        break;
      }

      /* ─────────── SAVAŞ AÇILIŞI / SONU ─────────── */

      case 'start': {
        /* SAVAŞ BAŞLIYOR: savaş kornosu. Alttan yükselen gürleme,
           iki katlı korno akoru (G–D), üzerine davul ve rüzgâr. */
        this.n({ t: 0, dur: 0.55, vol: 0.11, f0: 260, f1: 1500, type: 'bandpass', q: 0.9, atk: 0.4, wet: 0.26 });
        this.v({ f0: G2, type: 'sine', t: 0.02, dur: 0.9, vol: 0.2, atk: 0.06, hold: 0.2, wet: 0.16, sat: true });
        this.brass(G3, 0.06, 0.62, 0.2, -0.18);
        this.brass(D4, 0.06, 0.62, 0.15, 0.18);
        this.brass(G4, 0.34, 0.75, 0.17, 0);
        this.drum(84, 0.05, 0.42, 0.24);
        this.drum(70, 0.5, 0.5, 0.2);
        this.n({ t: 0.32, dur: 0.5, vol: 0.05, f0: 5200, f1: 1400, type: 'bandpass', q: 1.1, atk: 0.14, wet: 0.32 });
        break;
      }
      case 'victory': {
        /* ZAFER — ÜÇ VARYANTLI HAVUZ (2026-08-29).
           Tek "borazan" her görev sonunda birebir aynı çalıyordu: zafer
           günde onlarca kez duyulan bir ses ve tekrar onu tören olmaktan
           çıkarıyor. Üçü de AYNI tonda (Bb/Sol ailesi), aynı uzunlukta
           (~1,8 sn) ve aynı yükseklikte — varyasyon KARAKTERDE, seviyede
           değil: farklı yükseklikte iki zafer sesi "ses hatası" duyulur.
           Çekirdek de üçünde aynı: alt davul + koro yastığı + çan takibi. */
        this.choir([G3, D4, G4, Bb4], 1.4, 0.16, 0.4, 0.44);
        if (k === 1) {
          /* ÇAN ÖNCÜLÜ: iki kristal çan sorar, korno plagal (Eb→F→Bb)
             cevap verir. Yükselen değil AÇILAN bir zafer. */
          this.bell(D5, 0.3, 0.085, 0, 0.34);
          this.bell(G5, 0.34, 0.075, 0.1, 0.36);
          this.drum(72, 0.16, 0.42, 0.2);
          this.brass(Eb5, 0.2, 0.2, 0.13, -0.2);
          this.brass(F5, 0.34, 0.18, 0.13, 0.2);
          this.brass(Bb5, 0.5, 0.85, 0.15, 0);
          this.brass(D5, 0.5, 0.85, 0.13, -0.14);
          this.bell(Bb5, 0.66, 0.075, 0.6, 0.38);
          this.drum(60, 0.5, 0.6, 0.18);
        } else if (k === 2) {
          /* DAVUL ÇAĞRISI: iki timpani vuruşu, ardından tek büyük akor.
             En sade varyant — fanfar dizisi yok, ağırlık var. */
          this.drum(84, 0, 0.3, 0.2);
          this.drum(76, 0.18, 0.34, 0.22);
          this.brass(G4, 0.34, 0.95, 0.16, -0.22);
          this.brass(Bb4, 0.34, 0.95, 0.13, 0.22);
          this.brass(D5, 0.36, 0.95, 0.15, 0);
          this.bell(G5, 0.8, 0.085, 0.52, 0.36);
          this.bell(D6, 0.62, 0.055, 0.74, 0.4);
          this.n({ t: 0.36, dur: 0.7, vol: 0.045, f0: 2400, f1: 6800, type: 'bandpass', q: 1.2, atk: 0.45, wet: 0.38 });
          this.drum(58, 0.36, 0.7, 0.16);
        } else {
          /* YÜKSELEN FANFAR: ilk sürümün kendisi (D4→G4→Bb4→D5). */
          this.drum(76, 0, 0.4, 0.22);
          this.brass(D4, 0.0, 0.17, 0.14, -0.2);
          this.brass(G4, 0.14, 0.17, 0.14, 0.2);
          this.brass(Bb4, 0.28, 0.17, 0.14, -0.12);
          this.brass(D5, 0.42, 0.9, 0.19, 0);
          this.brass(G5, 0.42, 0.9, 0.12, 0.22);
          this.bell(G5, 0.7, 0.09, 0.5, 0.36);
          this.bell(D6, 0.6, 0.06, 0.66, 0.38);
          this.drum(64, 0.42, 0.6, 0.2);
        }
        break;
      }
      case 'death': {
        /* ÖLÜM: çöken org akoru — perde ve parlaklık birlikte düşer */
        this.v({ f0: 300, f1: 42, type: 'sawtooth', t: 0, dur: 1.3, vol: 0.17, atk: 0.01, lp: 1400, lp1: 160, q: 2.4, wet: 0.34, sat: true });
        this.v({ f0: 224, f1: 33, type: 'sawtooth', t: 0.05, dur: 1.25, vol: 0.15, atk: 0.02, lp: 900, lp1: 120, q: 2.8, wet: 0.36, sat: true, pan: 0.2 });
        this.n({ t: 0, dur: 1.1, vol: 0.16, f0: 900, f1: 70, type: 'lowpass', q: 0.9, wet: 0.34 });
        this.bell(HZ(-9), 1.4, 0.07, 0.18, 0.44);      // uzak matem çanı
        this.drum(52, 0, 0.9, 0.2);
        break;
      }
      case 'adreward': {
        this.bell(D5, 0.26, 0.085, 0, 0.3);
        this.bell(G5, 0.3, 0.08, 0.08, 0.32);
        this.bell(D6, 0.45, 0.065, 0.16, 0.36);
        this.n({ t: 0.02, dur: 0.4, vol: 0.035, f0: 5000, f1: 1800, type: 'bandpass', q: 1.4, atk: 0.14, wet: 0.34 });
        break;
      }

      /* ─────────── SANDIK TÖRENİ ─────────── */

      case 'chestthud': {
        /* sandık yere düşer: ağır tahta + toz + zincir şıngırtısı */
        this.v({ f0: 96 * j(0.08), f1: 34, type: 'sine', t: 0, dur: 0.36, vol: 0.28, atk: 0.002, glide: 0.14, wet: 0.2, sat: true });
        this.n({ t: 0, dur: 0.16, vol: 0.14, f0: 1600, f1: 220, type: 'lowpass', q: 1.1, wet: 0.2 });
        this.n({ t: 0.005, dur: 0.05, vol: 0.07, f0: 4200, f1: 1500, type: 'bandpass', q: 1.6, wet: 0.14, pan: p });
        this.metal({ f: 1600 * j(0.1), ratio: 2.9, index: 2.4, dur: 0.2, vol: 0.045, t: 0.03, wet: 0.3, pan: -p });
        this.metal({ f: 2350 * j(0.1), ratio: 3.3, index: 2, dur: 0.16, vol: 0.03, t: 0.07, wet: 0.32, pan: p });
        break;
      }
      case 'chestlatch': {
        /* kilit dili açılır: iki kademeli mekanik klik + gerilim yükselişi */
        this.metal({ f: 1180, ratio: 1.73, index: 4.4, dur: 0.1, vol: 0.09, t: 0, wet: 0.24 });
        this.tick(0, 0.11, 6800, -0.15);
        this.metal({ f: 780, ratio: 2.41, index: 3.6, dur: 0.28, vol: 0.075, t: 0.075, wet: 0.32, pan: 0.15 });
        this.creak(0.1, 0.3, 0.05);
        this.riser(0.12, 0.62, 0.1, 0.3);
        break;
      }
      case 'chestburst': {
        /* SANDIK AÇILIYOR — töreni taşıyan ~2.4 sn'lik tek büyük an:
           patlama · kapak savrulur · ışık huzmesi · koro · çan yağmuru.
           (Eski sürümde bu an 'boom' + 'victory' üst üste çalınıyordu;
            iki hazır efektin çakışması "montaj" gibi duyuluyordu.) */
        /* 1) darbe */
        this.v({ f0: 180, f1: 26, type: 'sine', t: 0, dur: 0.75, vol: 0.34, atk: 0.002, glide: 0.24, wet: 0.22, sat: true });
        this.n({ t: 0, dur: 0.55, vol: 0.24, f0: 3200, f1: 90, type: 'lowpass', q: 0.9, wet: 0.28 });
        this.n({ t: 0, dur: 0.06, vol: 0.16, f0: 9000, f1: 2400, type: 'highpass', q: 0.7, wet: 0.14 });
        /* 2) kapak savrulur (tahta + menteşe) */
        this.whoosh(0.02, 0.3, 0.09, true, 0.25);
        this.creak(0.04, 0.24, 0.05);
        this.metal({ f: 1900, ratio: 2.76, index: 3.2, dur: 0.4, vol: 0.05, t: 0.06, wet: 0.36, pan: -0.25 });
        /* 3) içeriden taşan ışık: koro + yükselen parıltı */
        this.choir([G3, D4, G4, Bb4, D5], 1.7, 0.19, 0.1, 0.46);
        this.n({ t: 0.1, dur: 1.2, vol: 0.055, f0: 1800, f1: 7000, type: 'bandpass', q: 1.2, atk: 0.8, wet: 0.42 });
        /* 4) çan yağmuru — hazine parıltısı. ÜÇ DİZİLİŞ: sandık açma
           günde onlarca kez duyulan bir tören; aynı beş çanın aynı sırada
           dökmesi üçüncü sandıktan sonra "kayıttan çalıyor" duyuluyordu.
           Perdeler aynı akorun içinden seçilir (törenin kimliği bozulmaz),
           değişen şey yön: çıkan · zikzak · geniş atlamalı. */
        const CH = k === 1 ? [G5, D5, Bb5, G6, D6]
                 : k === 2 ? [Bb5, D6, G5, D5, G6]
                 : [D5, G5, Bb5, D6, G6];
        for (let i = 0; i < CH.length; i++) {
          this.bell(CH[i] * j(0.004), 0.55 - i * 0.05, 0.062 - i * 0.006, 0.34 + i * 0.085, 0.4);
        }
        this.drum(70, 0, 0.6, 0.2);
        this.drum(58, 0.5, 0.7, 0.14);
        break;
      }

      /* ─────────── ÖDÜL NADİRLİĞİ ─────────── */

      case 'chestrare': {
        /* MAVİ (nadir): kısa, temiz, tatmin edici — abartısız */
        this.bell(D5, 0.34, 0.1, 0, 0.32);
        this.bell(A5, 0.4, 0.075, 0.07, 0.34);
        this.n({ t: 0.02, dur: 0.34, vol: 0.035, f0: 4200, f1: 1600, type: 'bandpass', q: 1.4, atk: 0.1, wet: 0.34 });
        this.v({ f0: D4, type: 'sine', t: 0, dur: 0.4, vol: 0.05, atk: 0.02, wet: 0.2, sat: true });
        break;
      }
      case 'epicpull': {
        /* MOR (destansı): koro açılır, korno cevap verir, çanlar takip eder */
        this.drum(74, 0, 0.4, 0.16);
        this.choir([D4, F5, A5], 1.1, 0.17, 0, 0.44);
        this.brass(D5, 0.05, 0.5, 0.13, -0.16);
        this.brass(A5, 0.2, 0.55, 0.1, 0.16);
        this.bell(D6, 0.6, 0.07, 0.34, 0.38);
        this.n({ t: 0.06, dur: 0.8, vol: 0.045, f0: 2200, f1: 7000, type: 'bandpass', q: 1.2, atk: 0.55, wet: 0.4 });
        break;
      }
      case 'legendary': {
        /* ═══ EFSANEVİ ═══ — 2.6 sn'lik gerçek zafer melodisi.
           Yapı: gong + gerilim → yükselen 4 notalı fanfar → tepe akoru
           (korno + koro + org) → çan takibi → uzun yankı kuyruğu.
           Melodi Sol minör'de başlar, tepede Sol MAJÖR'e döner —
           "karanlıktan zafere" hissini veren klasik hile. */

        /* 0.00 — gong + alt gürleme: dikkat çeker */
        this.metal({ f: 116, ratio: 1.41, index: 5.5, dur: 2.4, vol: 0.16, t: 0, wet: 0.5 });
        this.v({ f0: G2, type: 'sine', t: 0, dur: 2.2, vol: 0.17, atk: 0.03, hold: 0.5, wet: 0.2, sat: true });
        this.drum(80, 0, 0.5, 0.24);
        this.n({ t: 0.02, dur: 0.42, vol: 0.07, f0: 400, f1: 2600, type: 'bandpass', q: 1.1, atk: 0.32, wet: 0.3 });

        /* 0.30 — yükselen fanfar: G4 · Bb4 · D5 · F5 */
        this.brass(G4, 0.30, 0.17, 0.15, -0.22);
        this.brass(Bb4, 0.43, 0.17, 0.15, 0.22);
        this.brass(D5, 0.56, 0.17, 0.16, -0.14);
        this.brass(F5, 0.69, 0.2, 0.17, 0.14);

        /* 0.90 — TEPE: Sol majör akoru, korno + koro + org birlikte */
        this.brass(G5, 0.90, 1.4, 0.21, 0);
        this.brass(D5, 0.90, 1.4, 0.13, -0.26);
        this.brass(B4, 0.92, 1.35, 0.11, 0.26);
        this.choir([G3, D4, G4, B4, D5, G5], 2.0, 0.22, 0.86, 0.5);
        this.drum(66, 0.88, 0.8, 0.24);
        this.drum(96, 1.32, 0.35, 0.1);

        /* 1.20 — çan takibi: hazine parıltısı yukarı doğru dağılır */
        const L = [G5, B4 * 2, D6, G6];
        for (let i = 0; i < L.length; i++) {
          this.bell(L[i] * j(0.003), 1.1 - i * 0.12, 0.075 - i * 0.012, 1.2 + i * 0.13, 0.46);
        }
        /* 1.10 — parıltı bulutu: uzun, yavaş açılan tiz doku */
        this.n({ t: 1.0, dur: 1.5, vol: 0.05, f0: 2600, f1: 9000, type: 'bandpass', q: 1.1, atk: 0.9, wet: 0.5 });
        /* 2.10 — kapanış vurgusu, kuyruğu yankıya bırakır */
        this.v({ f0: G3, type: 'sine', t: 2.05, dur: 0.9, vol: 0.09, atk: 0.02, wet: 0.4, sat: true });
        this.metal({ f: 1568, ratio: 2.01, index: 3, dur: 1.6, vol: 0.05, t: 2.05, wet: 0.55 });
        break;
      }
      /* ─────────── v59 · HER OLAYIN KENDİ SESİ ─────────── */

      case 'tab': {           // alt menü sekmesi: tahta düğme + ince çınlama
        this.v({ f0: 440 * j(0.03), f1: 360, type: 'triangle', t: 0, dur: 0.04, vol: 0.045, atk: 0.001, lp: 2600, wet: 0.06 });
        this.bell(HZ(5 + k * 2), 0.14, 0.022, 0.012, 0.2);
        break;
      }
      case 'panel': {         // pencere açılır: yumuşak kumaş hışırtısı
        this.n({ t: 0, dur: 0.12, vol: 0.04, f0: 800, f1: 2600, type: 'bandpass', q: 0.9, atk: 0.04, wet: 0.14 });
        this.v({ f0: 520, f1: 600, type: 'sine', t: 0.02, dur: 0.08, vol: 0.025, atk: 0.01, wet: 0.16 });
        break;
      }
      case 'unlockstart': {   // sandık çözülmeye başlar: anahtar döner
        this.metal({ f: 1320, ratio: 1.73, index: 3, dur: 0.08, vol: 0.05, t: 0, wet: 0.2 });
        this.metal({ f: 980, ratio: 2.41, index: 2.6, dur: 0.14, vol: 0.045, t: 0.09, wet: 0.26 });
        this.v({ f0: D5, type: 'sine', t: 0.16, dur: 0.3, vol: 0.03, atk: 0.02, wet: 0.3 });
        break;
      }
      case 'equip': {         // kuşanma: deri kayış + toka
        this.n({ t: 0, dur: 0.06, vol: 0.05, f0: 1800, f1: 700, type: 'bandpass', q: 1.2, wet: 0.08, pan: p });
        this.metal({ f: 2100 * j(0.03), ratio: 2.9, index: 2, dur: 0.12, vol: 0.04, t: 0.05, wet: 0.2, pan: -p });
        break;
      }
      case 'select': {        // kahraman seçildi: iki notalı mühür (Bb4 → D5)
        this.bell(Bb4, 0.26, 0.07, 0, 0.26);
        this.bell(D5, 0.34, 0.065, 0.08, 0.3);
        this.v({ f0: G3, type: 'sine', t: 0, dur: 0.3, vol: 0.04, atk: 0.02, wet: 0.2 });
        break;
      }
      case 'copy': { this.bell(A5, 0.12, 0.04, 0, 0.2); this.bell(HZ(17), 0.14, 0.03, 0.05, 0.22); break; }
      case 'star': {          // yıldız damgası: tok damga + tek parıltı
        this.drum(110, 0, 0.14, 0.09);
        this.bell(HZ(17 + k * 2), 0.4, 0.05, 0.03, 0.34);
        break;
      }
      case 'bless': {         // kutsama: sıcak koro nefesi
        this.choir([D4, A4, D5], 0.6, 0.07, 0, 0.42);
        this.bell(A5, 0.4, 0.035, 0.1, 0.4);
        break;
      }
      case 'claim': {         // ödül alındı: iki madeni para + kese
        this.metal({ f: 1900 * j(0.04), ratio: 3.1, index: 2.2, dur: 0.1, vol: 0.045, t: 0, wet: 0.2, pan: p });
        this.metal({ f: 2500 * j(0.04), ratio: 2.7, index: 2, dur: 0.1, vol: 0.035, t: 0.05, wet: 0.22, pan: -p });
        this.n({ t: 0.02, dur: 0.08, vol: 0.035, f0: 1200, f1: 500, type: 'lowpass', q: 0.8, wet: 0.1 });
        this.bell(G5, 0.24, 0.04, 0.09, 0.28);
        break;
      }
      case 'tierclaim': {     // haftalık kademe: kısa üçlü çan (claim'den büyük)
        this.bell(G4, 0.4, 0.06, 0, 0.32); this.bell(D5, 0.45, 0.055, 0.08, 0.34); this.bell(G5, 0.6, 0.06, 0.16, 0.38);
        this.drum(80, 0, 0.3, 0.1);
        break;
      }
      case 'gemspend': {      // elmas harcandı: kristal kırılır, yukarı akar
        this.bell(HZ(19), 0.18, 0.04, 0, 0.3); this.bell(HZ(24), 0.2, 0.03, 0.04, 0.34);
        this.n({ t: 0, dur: 0.25, vol: 0.03, f0: 3000, f1: 9000, type: 'bandpass', q: 1.4, atk: 0.1, wet: 0.36 });
        break;
      }
      case 'walletin': {      // uçan para cüzdana indi
        this.metal({ f: 2700 * j(0.05), ratio: 3.3, index: 1.8, dur: 0.07, vol: 0.03, t: 0, wet: 0.18, pan: 0.2 });
        break;
      }
      case 'collect': {       // sandık töreni sonu, ödüller cepte
        this.n({ t: 0, dur: 0.14, vol: 0.04, f0: 2600, f1: 600, type: 'bandpass', q: 1, wet: 0.14 });
        this.bell(D5, 0.3, 0.05, 0.04, 0.3); this.bell(A5, 0.36, 0.04, 0.1, 0.34);
        break;
      }
      case 'tally': {         // sonuç ekranı altın sayacı: çok kısık tık
        this.metal({ f: 3200 * j(0.04), ratio: 2.4, index: 1.4, dur: 0.035, vol: 0.02, t: 0, wet: 0.08 });
        break;
      }
      case 'boot': {          // açılış dokunuşu: uzak çan + alt nefes (korno YOK)
        this.bell(G4, 1.2, 0.07, 0, 0.5);
        this.v({ f0: G2, type: 'sine', t: 0, dur: 1.2, vol: 0.07, atk: 0.1, hold: 0.2, wet: 0.3 });
        this.n({ t: 0.05, dur: 0.9, vol: 0.03, f0: 500, f1: 2400, type: 'bandpass', q: 1, atk: 0.5, wet: 0.4 });
        break;
      }
      case 'gateclose': {     // savaş kapısı kanatları: taş sürtünme
        this.n({ t: 0, dur: 0.7, vol: 0.06, f0: 260, f1: 700, type: 'bandpass', q: 0.8, atk: 0.3, wet: 0.2 });
        this.v({ f0: 70, type: 'sine', t: 0.1, dur: 0.6, vol: 0.06, atk: 0.3, wet: 0.2 });
        break;
      }
      case 'gatelock': {      // kanatlar kilitlenir: ağır demir çarpma
        this.drum(58, 0, 0.5, 0.2);
        this.metal({ f: 620, ratio: 1.41, index: 4, dur: 0.5, vol: 0.05, t: 0.005, wet: 0.36 });
        this.n({ t: 0, dur: 0.12, vol: 0.06, f0: 1600, f1: 300, type: 'lowpass', q: 0.9, wet: 0.2 });
        break;
      }
      case 'revive': {        // diriliş: tersine akan nefes + yükselen koro
        this.n({ t: 0, dur: 0.7, vol: 0.05, f0: 300, f1: 5200, type: 'bandpass', q: 1.2, atk: 0.6, wet: 0.4 });
        this.choir([G3, D4, G4, B4], 1.1, 0.12, 0.3, 0.46);
        this.bell(G5, 0.8, 0.05, 0.7, 0.44);
        break;
      }
      case 'reveal': {        // sıradan ödül açığa çıkar
        this.bell(D5, 0.22, 0.05, 0, 0.26);
        this.n({ t: 0, dur: 0.12, vol: 0.03, f0: 2400, f1: 5000, type: 'bandpass', q: 1.2, atk: 0.04, wet: 0.24 });
        break;
      }
      case 'dodge': {         // SIYRILDI: hızlı rüzgâr kesiği
        this.whoosh(0, 0.12, 0.06, true, p);
        this.v({ f0: 1800, f1: 2600, type: 'sine', t: 0.03, dur: 0.06, vol: 0.02, atk: 0.005, wet: 0.2 });
        break;
      }
      case 'block': {         // KALKAN: tok kalkan çanı
        this.metal({ f: 880 * j(0.03), ratio: 1.41, index: 3.4, dur: 0.3, vol: 0.06, t: 0, wet: 0.26, pan: p });
        this.drum(140, 0, 0.1, 0.07, p);
        break;
      }
      case 'heal': {          // kalp: sıcak iki nota, aşağıdan yukarı
        this.v({ f0: D5, type: 'sine', t: 0, dur: 0.14, vol: 0.035, atk: 0.006, wet: 0.2 });
        this.v({ f0: G5, type: 'sine', t: 0.06, dur: 0.2, vol: 0.03, atk: 0.006, wet: 0.26 });
        break;
      }
      case 'throw': {         // bomba atışı: fitil + savurma
        this.whoosh(0, 0.14, 0.05, false, p);
        this.n({ t: 0, dur: 0.1, vol: 0.03, f0: 5000, f1: 3000, type: 'highpass', q: 0.8, wet: 0.08, pan: p });
        break;
      }
      case 'judge': {         // yargı kılıcı gökten iner
        this.n({ t: 0, dur: 0.1, vol: 0.06, f0: 5000, f1: 900, type: 'bandpass', q: 1.2, wet: 0.2, pan: p });
        this.metal({ f: 1240 * j(0.03), ratio: 2.76, index: 3.2, dur: 0.3, vol: 0.05, t: 0.03, wet: 0.36, pan: p });
        this.drum(90, 0.03, 0.2, 0.1, p);
        break;
      }
      case 'storm': {         // fırtına çarpması: şimşeğin ağır kardeşi, bas yok
        this.n({ t: 0, dur: 0.18, vol: 0.09, f0: 6000, f1: 800, type: 'bandpass', q: 1, wet: 0.3, pan: p });
        this.n({ t: 0.02, dur: 0.3, vol: 0.06, f0: 900, f1: 200, type: 'lowpass', q: 0.8, wet: 0.3 });
        break;
      }
      case 'frostnova': {     // buz novası: kristal çatırtı + soğuk süpürme
        this.n({ t: 0, dur: 0.3, vol: 0.06, f0: 7000, f1: 2400, type: 'highpass', q: 0.9, wet: 0.3 });
        this.bell(HZ(19), 0.3, 0.03, 0.01, 0.4); this.bell(HZ(22), 0.26, 0.022, 0.04, 0.42);
        this.v({ f0: 220, f1: 110, type: 'sine', t: 0, dur: 0.24, vol: 0.07, atk: 0.004, wet: 0.2 });
        break;
      }
      case 'firebomb': {      // ateş bombası: püf + alev tutuşması
        this.v({ f0: 110 * j(0.06), f1: 45, type: 'sine', t: 0, dur: 0.3, vol: 0.15, atk: 0.003, wet: 0.18, sat: true });
        this.n({ t: 0.02, dur: 0.45, vol: 0.07, f0: 600, f1: 2800, type: 'bandpass', q: 0.8, atk: 0.12, wet: 0.24 });
        break;
      }
      case 'blast': {         // saha sandığı patlangacı: geniş, tok, kuyruklu
        this.v({ f0: 120, f1: 32, type: 'sine', t: 0, dur: 0.6, vol: 0.22, atk: 0.003, glide: 0.2, wet: 0.26, sat: true });
        this.n({ t: 0, dur: 0.5, vol: 0.14, f0: 2600, f1: 90, type: 'lowpass', q: 0.9, wet: 0.3 });
        this.bell(G5, 0.5, 0.03, 0.08, 0.44);
        break;
      }
      case 'propbreak': {     // saha nesnesi kırılır: tahta/taş çatırtı
        this.n({ t: 0, dur: 0.05, vol: 0.07, f0: 2200, f1: 600, type: 'bandpass', q: 1.2, wet: 0.08, pan: p });
        this.n({ t: 0.03, dur: 0.12, vol: 0.05, f0: 900, f1: 200, type: 'lowpass', q: 0.9, wet: 0.12, pan: p });
        break;
      }
      case 'synergy': {       // sinerji açıldı: iki perdeli rezonans çan
        this.bell(D5, 0.5, 0.06, 0, 0.36); this.bell(A5, 0.55, 0.05, 0.06, 0.38);
        this.v({ f0: D4, type: 'triangle', t: 0, dur: 0.5, vol: 0.03, atk: 0.05, lp: 1600, wet: 0.3 });
        break;
      }
      /* ─────────── v70: OYNANIŞ HİSSİ (her olayın kendi sesi) ─────────── */
      case 'evocine': {       // v71 D2 evrim sineması: çatlama → dövme çanı → yükselen altın akor
        this.n({ t: 0, dur: 0.22, vol: 0.07, f0: 4200, f1: 1800, type: 'highpass', q: 1, wet: 0.2 });
        this.v({ f0: 196, f1: 98, type: 'sawtooth', t: 0.46, dur: 0.5, vol: 0.08, atk: 0.003, lp: 1800, lp1: 400, wet: 0.3, sat: true });
        const C = [0, 7, 12, 16, 19];
        for (let i = 0; i < 5; i++) this.v({ f0: 392 * Math.pow(2, C[i] / 12), type: 'triangle', t: 0.5 + i * 0.07, dur: 0.7, vol: 0.036, atk: 0.006, lp: 3600, wet: 0.42, pan: (i - 2) * 0.18 });
        break;
      }
      case 'heartbeat': {     // can %30 altı: lub-dub, vinyet nabzıyla aynı 1,05 sn
        this.v({ f0: 64, f1: 40, type: 'sine', t: 0, dur: 0.13, vol: 0.15, atk: 0.004, lp: 420, wet: 0.02 });
        this.v({ f0: 56, f1: 36, type: 'sine', t: 0.19, dur: 0.15, vol: 0.11, atk: 0.004, lp: 380, wet: 0.02 });
        break;
      }
      case 'chainboom': {     // patlayıcı zinciri: kalabalığa vuran boğuk patlama
        this.n({ t: 0, dur: 0.3, vol: 0.11, f0: 1100, f1: 140, type: 'lowpass', q: 0.8, wet: 0.14, pan: p });
        this.v({ f0: 118 * j(0.08), f1: 42, type: 'triangle', t: 0, dur: 0.24, vol: 0.13, atk: 0.002, lp: 900, wet: 0.1, pan: p, sat: true });
        break;
      }
      case 'harvest': {       // dalga sonu hasat: yükselen kristal arpej
        const H = [0, 4, 7, 12, 16];
        for (let i = 0; i < 5; i++) this.v({ f0: 660 * Math.pow(2, H[i] / 12), type: 'sine', t: i * 0.055, dur: 0.18, vol: 0.034, atk: 0.003, wet: 0.32, pan: rnd(-0.3, 0.3) });
        this.n({ t: 0, dur: 0.4, vol: 0.03, f0: 2400, f1: 7000, type: 'bandpass', q: 3, wet: 0.35 });
        break;
      }
      case 'elitdown': {      // elit düştü: ağır gövde + gümüş çın
        this.v({ f0: 220, f1: 66, type: 'sawtooth', t: 0, dur: 0.26, vol: 0.075, atk: 0.002, lp: 1600, lp1: 300, wet: 0.14, pan: p, sat: true });
        this.v({ f0: 1320, f1: 1250, type: 'sine', t: 0.03, dur: 0.34, vol: 0.03, atk: 0.002, wet: 0.36, pan: p });
        break;
      }
      case 'shieldbreak': {   // KALKANLI elitin kalkanı kırıldı: cam
        this.n({ t: 0, dur: 0.18, vol: 0.075, f0: 5200, f1: 2600, type: 'highpass', q: 1, wet: 0.22, pan: p });
        this.v({ f0: 2400, f1: 1800, type: 'triangle', t: 0, dur: 0.12, vol: 0.035, atk: 0.001, wet: 0.25, pan: p });
        this.v({ f0: 3150, f1: 2950, type: 'sine', t: 0.045, dur: 0.22, vol: 0.022, atk: 0.001, wet: 0.3, pan: p });
        break;
      }
      case 'levelrise': {     // seviye anı: ayaktan yükselen ışık sütunu
        this.n({ t: 0, dur: 0.45, vol: 0.05, f0: 380, f1: 3400, type: 'bandpass', q: 2.2, wet: 0.3 });
        this.v({ f0: 330, f1: 660, type: 'triangle', t: 0, dur: 0.4, vol: 0.04, atk: 0.02, lp: 2400, wet: 0.3, glide: 1 });
        break;
      }
      case 'fieldchest': {    // saha sandığı: kilit + kapak + kısa parıltı (tören sandığından KÜÇÜK)
        this.metal({ f: 1180, ratio: 1.73, index: 3.6, dur: 0.08, vol: 0.06, t: 0, wet: 0.2 });
        this.creak(0.05, 0.18, 0.035);
        this.v({ f0: 90, f1: 40, type: 'sine', t: 0.12, dur: 0.24, vol: 0.12, atk: 0.003, wet: 0.2 });
        this.bell(D5, 0.3, 0.05, 0.16, 0.32); this.bell(G5, 0.36, 0.045, 0.22, 0.36);
        break;
      }
      case 'rescue': {        // kurtarılan kişi: kubbe çözülür, cam çanı
        this.n({ t: 0, dur: 0.4, vol: 0.05, f0: 5000, f1: 1500, type: 'bandpass', q: 1, wet: 0.36 });
        this.bell(B4, 0.5, 0.055, 0.04, 0.38); this.bell(HZ(9), 0.6, 0.05, 0.14, 0.4);
        break;
      }
      case 'delivered': {     // eve vardı: sıcak çözülme, üç nota inip kalkar
        this.bell(G5, 0.4, 0.05, 0, 0.36); this.bell(D5, 0.45, 0.05, 0.1, 0.36); this.bell(G5, 0.7, 0.06, 0.22, 0.4);
        this.choir([G3, D4, G4], 0.9, 0.08, 0.1, 0.44);
        break;
      }
      case 'objfail': {       // kurtarılan kaybedildi: inen iki boğuk nota
        this.v({ f0: D4, f1: HZ(-9), type: 'triangle', t: 0, dur: 0.4, vol: 0.06, atk: 0.01, lp: 900, wet: 0.3 });
        this.v({ f0: Bb3, f1: G3 * 0.9, type: 'triangle', t: 0.18, dur: 0.5, vol: 0.05, atk: 0.01, lp: 800, wet: 0.34 });
        break;
      }
      case 'bossarrive': {    // boss yere iner (giriş sonu)
        this.drum(48, 0, 0.8, 0.22);
        this.n({ t: 0, dur: 0.5, vol: 0.1, f0: 1200, f1: 80, type: 'lowpass', q: 0.8, wet: 0.3 });
        break;
      }
      case 'bosscast': {      // aura/mühür büyüsü: alçak uğultu yükselir
        this.v({ f0: 110, f1: 165, type: 'triangle', t: 0, dur: 0.6, vol: 0.07, atk: 0.2, lp: 700, wet: 0.36 });
        this.n({ t: 0, dur: 0.6, vol: 0.05, f0: 300, f1: 1400, type: 'bandpass', q: 1.4, atk: 0.4, wet: 0.36 });
        break;
      }
      case 'bossphase': {     // faz geçişi: kükreme + gong
        this.v({ f0: 110, f1: 60, type: 'sawtooth', t: 0, dur: 0.7, vol: 0.13, atk: 0.05, lp: 700, lp1: 240, q: 3, wet: 0.34, sat: true });
        this.metal({ f: 120, ratio: 1.41, index: 5, dur: 1.4, vol: 0.1, t: 0.02, wet: 0.5 });
        break;
      }
      case 'bossvolley': {    // mermi salvosu: çoklu ıslık
        for (let i = 0; i < 3; i++) this.n({ t: i * 0.05, dur: 0.1, vol: 0.035, f0: 3000 - i * 400, f1: 1200, type: 'bandpass', q: 2, wet: 0.2, pan: (i - 1) * 0.3 });
        break;
      }
      case 'bosswindup': {    // hücum hazırlığı: hırıltı + ayak sürtme
        this.v({ f0: 80, f1: 120, type: 'sawtooth', t: 0, dur: 0.5, vol: 0.08, atk: 0.2, lp: 500, lp1: 900, q: 2, wet: 0.3, sat: true });
        this.n({ t: 0, dur: 0.4, vol: 0.04, f0: 600, f1: 300, type: 'lowpass', q: 0.8, wet: 0.2 });
        break;
      }
      case 'bosscharge': {    // hücum başlar: ağır rüzgâr
        this.whoosh(0, 0.4, 0.09, false, p);
        this.drum(62, 0, 0.3, 0.12);
        break;
      }
      case 'bossland': {      // ejder konar: kanat + toz
        this.whoosh(0, 0.2, 0.06, false, p);
        this.drum(54, 0.12, 0.5, 0.18);
        break;
      }
      case 'bossleap': {      // ejder sıçrar: yükselen kanat çırpışı
        this.whoosh(0, 0.3, 0.08, true, p);
        this.v({ f0: 90, f1: 140, type: 'triangle', t: 0, dur: 0.3, vol: 0.06, atk: 0.1, lp: 600, wet: 0.3 });
        break;
      }
      case 'telegraph': {     // "!" uyarısı: kısa, alçak, dikkat çekici ama tiz değil
        this.v({ f0: 330, type: 'triangle', t: 0, dur: 0.08, vol: 0.045, atk: 0.003, lp: 1400, wet: 0.14 });
        this.v({ f0: 330, type: 'triangle', t: 0.1, dur: 0.1, vol: 0.04, atk: 0.003, lp: 1400, wet: 0.16 });
        break;
      }
      case 'poison': {        // zehir gölü: kabarcık
        for (let i = 0; i < 3; i++) this.v({ f0: 260 + i * 70, f1: 420 + i * 90, type: 'sine', t: i * 0.07, dur: 0.06, vol: 0.03, atk: 0.005, wet: 0.24 });
        this.n({ t: 0, dur: 0.3, vol: 0.03, f0: 500, f1: 300, type: 'lowpass', q: 1, wet: 0.2 });
        break;
      }
      case 'bombhit': {       // ejder bombası yere çakılır: ıslak, boğuk
        this.v({ f0: 100, f1: 45, type: 'sine', t: 0, dur: 0.3, vol: 0.14, atk: 0.003, wet: 0.2 });
        this.n({ t: 0, dur: 0.22, vol: 0.06, f0: 900, f1: 200, type: 'lowpass', q: 1.4, wet: 0.2 });
        break;
      }
      case 'thaw': {          // donma biter: buz çözülür
        this.bell(HZ(22), 0.16, 0.025, 0, 0.3); this.bell(HZ(17), 0.2, 0.02, 0.06, 0.3);
        break;
      }
      case 'curse': {        // v62 lanet: inen boğuk akor + fısıltı
        this.v({ f0: D4, f1: HZ(-8), type: 'triangle', t: 0, dur: 0.6, vol: 0.06, atk: 0.02, lp: 900, wet: 0.4 });
        this.v({ f0: HZ(-4), f1: HZ(-13), type: 'triangle', t: 0.04, dur: 0.6, vol: 0.05, atk: 0.02, lp: 800, wet: 0.42 });
        this.n({ t: 0, dur: 0.5, vol: 0.03, f0: 2400, f1: 600, type: 'bandpass', q: 2, atk: 0.2, wet: 0.4 });
        break;
      }
      case 'altar': {        // v62 sunak kutsandı: taş gong + yükselen çan
        this.metal({ f: 180, ratio: 1.41, index: 4, dur: 1.2, vol: 0.07, t: 0, wet: 0.5 });
        this.bell(G4, 0.6, 0.05, 0.1, 0.4); this.bell(D5, 0.7, 0.05, 0.2, 0.44);
        break;
      }
      case 'event': {        // v62 dünya olayı başladı: uzak boru yerine iki alçak davul + çan
        this.drum(60, 0, 0.4, 0.14); this.drum(60, 0.22, 0.4, 0.12);
        this.bell(D5, 0.8, 0.045, 0.3, 0.46);
        break;
      }
      case 'ultready': {      // v61 süper doldu: iki yükselen cam notası + nefes
        this.bell(D5, 0.4, 0.05, 0, 0.34); this.bell(A5, 0.5, 0.05, 0.09, 0.38);
        this.n({ t: 0, dur: 0.4, vol: 0.03, f0: 1200, f1: 6000, type: 'bandpass', q: 1.2, atk: 0.3, wet: 0.36 });
        break;
      }
      case 'ulthit': {        // v64 süper vuruşu — sahne türüne göre
        const k = this.ultKind;
        if (k === 'moon') { this.bell(HZ(19 + (Math.random() * 5 | 0)), 0.22, 0.03, 0, 0.3); }
        else if (k === 'bolt') { this.n({ t: 0, dur: 0.14, vol: 0.08, f0: 7000, f1: 900, type: 'bandpass', q: 0.9, wet: 0.24, pan: p }); this.v({ f0: 90, f1: 40, type: 'sine', t: 0, dur: 0.2, vol: 0.08, atk: 0.003, wet: 0.2 }); }
        else if (k === 'meteor' || k === 'cannon') { this.v({ f0: 100, f1: 36, type: 'sine', t: 0, dur: 0.3, vol: 0.13, atk: 0.003, wet: 0.24, sat: true }); this.n({ t: 0, dur: 0.24, vol: 0.06, f0: 1800, f1: 200, type: 'lowpass', q: 0.8, wet: 0.24, pan: p }); }
        else if (k === 'stone') { this.drum(140, 0, 0.08, 0.05, p); }
        else if (k === 'slash') { this.whoosh(0, 0.1, 0.05, true, p); }
        else if (k === 'spike') { this.bell(HZ(22 + (Math.random() * 4 | 0)), 0.16, 0.025, 0, 0.3); }
        break;
      }
      case 'ultfire': {       // v61 süper: emme → tok darbe + nadirliğe göre çan katmanı
        const r = this.ultTier | 0, uk = this.ultKind;
        if (uk === 'moon') this.choir([D5, A5], 0.6, 0.05, 0, 0.5);
        else if (uk === 'vortex' || uk === 'slash') this.whoosh(0, 0.5, 0.09, true, p);
        this.n({ t: 0, dur: 0.18, vol: 0.05, f0: 5000, f1: 600, type: 'bandpass', q: 1.1, atk: 0.14, wet: 0.2 });
        this.v({ f0: 110, f1: 34, type: 'sine', t: 0.16, dur: 0.6, vol: 0.2, atk: 0.003, wet: 0.28, sat: true });
        this.n({ t: 0.16, dur: 0.45, vol: 0.1, f0: 2400, f1: 120, type: 'lowpass', q: 0.9, wet: 0.32 });
        this.bell(G4, 0.7, 0.05, 0.18, 0.44);
        if (r >= 2) this.bell(D5, 0.7, 0.045, 0.24, 0.46);
        if (r >= 3) this.bell(G5, 0.8, 0.04, 0.3, 0.48);
        if (r >= 4) this.choir([G3, D4, G4], 0.9, 0.08, 0.2, 0.5);
        break;
      }
      case 'combo': {         // KATLİAM kademesi: kademe başına bir ton yukarı, kısa
        const t = this.comboTier | 0, b = HZ(-2 + t * 3);
        this.drum(90 + t * 10, 0, 0.18, 0.08);
        this.bell(b * 2, 0.3, 0.05, 0.01, 0.3); this.bell(b * 3, 0.34, 0.035, 0.06, 0.34);
        break;
      }
    }
  }
}
