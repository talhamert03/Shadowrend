/* ═══════════════════════════════════════════════════════════
   input.js — Dokunmatik Kontroller

   "Sabit doğan joystick": parmak ekrana NEREDE basarsa joystick TAM
   ORADA doğar ve ORADA SABİT kalır — parmak hareket ettikçe merkez
   yerinden kımıldamaz, yalnızca topuz merkez etrafında döner. Böylece
   oyuncu ekrana bakmadan, kas hafızasıyla, sabit bir eksende oynar.

   • Pointer Events kullanılır (dokunma + fare tek API).
   • İlk parmak takip edilir; ikinci parmaklar yok sayılır.
   • Masaüstü testi için WASD / ok tuşları da desteklenir.
   • Görsel, DOM değil canvas üzerine çizilir (ekstra katman yok).
   ═══════════════════════════════════════════════════════════ */

const GAME_KEYS = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'Escape']);

export class Input {
  constructor(game) {
    this.game = game;

    /* joystick durumu */
    this.active = false;
    this.id = -1;             // takip edilen pointerId
    this._cap = false;        // işaretçi yakalaması bizde mi (canlılık testi)
    this.ox = 0; this.oy = 0; // joystick merkezi (kanvas-yerel koordinat)
    this.offX = 0; this.offY = 0;
    this.kx = 0; this.ky = 0; // topuz (knob) konumu
    this.ax = 0; this.ay = 0; // normalize edilmiş eksen (-1..1)

    this.RADIUS = 56;         // joystick yarıçapı (px)
    this.DEAD = 0.08;         // ölü bölge (oran)

    /* klavye (masaüstü geliştirme) */
    this.keys = Object.create(null);

    const c = game.canvas;
    c.style.touchAction = 'none';

    c.addEventListener('pointerdown', (e) => this.onDown(e), { passive: false });
    window.addEventListener('pointermove', (e) => this.onMove(e), { passive: false });
    /* ── GECİKME (önemli) ──
       'pointermove' tarayıcı tarafından kareye hizalanır: rAF'ten hemen
       önce, kare başına TEK birleştirilmiş olay gelir. 'pointerrawupdate'
       dokunmatik sürücüden gelen HER örneği verir — 120 Hz dokunmatik
       panelli telefonlarda joystick parmağı bir kare önce yakalar
       (~8-16 ms daha tepkisel). Desteklenmiyorsa pointermove yolu
       zaten çalışıyor; iki yolun çalışması zararsız (onMove idempotent). */
    if ('onpointerrawupdate' in window) {
      window.addEventListener('pointerrawupdate', (e) => this.onMove(e), { passive: true });
    }
    window.addEventListener('pointerup', (e) => this.onUp(e));
    window.addEventListener('pointercancel', (e) => this.onUp(e));
    /* ÜÇ KAÇAK YOL — takılmanın gerçek sebepleri. pointerup her zaman
       gelmez: tarayıcı jesti devralır, uygulama arka plana düşer, ya da
       parmak ekran kenarından çıkar. Üçünü de aynı bırakma yoluna bağla,
       yoksa oyuncu parmağını kaldırdığı hâlde karakter yürümeye devam eder. */
    c.addEventListener('lostpointercapture', () => this._release());
    window.addEventListener('blur', () => this._release());
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) this._release();
    });

    /* iOS Safari'nin çift-dokunma zoom'unu ve kaydırmayı sustur */
    c.addEventListener('touchstart', (e) => e.preventDefault(), { passive: false });
    c.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });

    window.addEventListener('keydown', (e) => {
      this.keys[e.code] = true;
      if (e.code.startsWith('Arrow') || e.code === 'Space') e.preventDefault();
      /* Oyun tuşları önizleme aracının kısayollarına sızmasın —
         WASD ile oynarken 'Comment' modu vb. açılıyordu. */
      if (this.game.state === 'playing' && GAME_KEYS.has(e.code)) e.stopPropagation();
      if (e.code === 'Escape' && this.game.state === 'playing') this.game.pauseGame();
    }, { capture: true });
    window.addEventListener('keyup', (e) => {
      this.keys[e.code] = false;
      if (this.game.state === 'playing' && GAME_KEYS.has(e.code)) e.stopPropagation();
    }, { capture: true });
  }

  /* Görünüm ofseti: telefon çerçevesi masaüstünde ortalanır; kanvas
     sol/üst kenarını çıkararak joystick'i kanvas-yerel uzayda çiz. */
  _offsets() {
    const r = this.game.canvas.getBoundingClientRect();
    this.offX = r.left; this.offY = r.top;
  }

  onDown(e) {
    if (this.game.state !== 'playing') return;
    /* İkİNCİ PARMAK YOK SAYILIR — ama yalnız takip edilen parmak GERÇEKTEN
       hâlâ basılıyken. Eskiden koşulsuz `if (this.active) return` vardı ve
       kalan bir kilit joystick'i KALICI olarak öldürüyordu: kaçan tek bir
       pointerup'tan sonra `active` true kalıyor, sonraki her dokunuş bu
       satırdan geri dönüyor, yani oyuncu bir daha hiç hareket edemiyordu
       ("çubuk takılıyor"). İşaretçi yakalaması canlılık testidir: yakalama
       bizde değilse o parmak artık yok, devral. */
    if (this.active) {
      const live = this._cap && this.game.canvas.hasPointerCapture(this.id);
      if (live) return;
      this._release();
    }
    e.preventDefault();
    this._offsets();
    this.active = true;
    this.id = e.pointerId;
    /* Yakalama: parmak kanvasın dışına taşsa bile move/up bize gelir ve
       tarayıcı hareketi çaldığında (kaydırma, geri jesti, sistem paneli)
       `lostpointercapture` ile HABER VERİLİR — takılmanın asıl kaynağı
       sessizce düşen bu olaylardı. */
    try { this.game.canvas.setPointerCapture(e.pointerId); this._cap = true; }
    catch (err) { this._cap = false; }
    const cx = e.clientX - this.offX, cy = e.clientY - this.offY;
    this.ox = cx; this.oy = cy;
    this.kx = cx; this.ky = cy;
    this.ax = 0; this.ay = 0;
  }

  onMove(e) {
    if (!this.active || e.pointerId !== this.id) return;
    /* pointerrawupdate iptal edilebilir DEĞİLDİR: koşulsuz preventDefault
       tarayıcı konsoluna uyarı basar. */
    if (e.cancelable) e.preventDefault();

    const cx = e.clientX - this.offX, cy = e.clientY - this.offY;
    let dx = cx - this.ox;
    let dy = cy - this.oy;
    const d2 = dx * dx + dy * dy;
    const R = this.RADIUS;

    if (d2 > R * R) {                      // topuzu halkaya kelepçele
      const d = Math.sqrt(d2);
      dx = (dx / d) * R;
      dy = (dy / d) * R;
      /* MERKEZ SABİT: joystick doğduğu noktada kalır, parmakla
         sürüklenmez — yalnızca topuz halka üzerinde döner. */
    }
    this.kx = this.ox + dx;
    this.ky = this.oy + dy;

    let nx = dx / R, ny = dy / R;
    const mag2 = nx * nx + ny * ny;
    if (mag2 < this.DEAD * this.DEAD) { nx = 0; ny = 0; }
    this.ax = nx; this.ay = ny;
  }

  onUp(e) {
    if (e.pointerId !== this.id) return;
    this._release();
  }

  /* Tek bırakma yolu: her çıkış/iptal/kayıp buradan geçer, yani "yarı
     bırakılmış" durum kalmaz. */
  _release() {
    if (this._cap && this.id !== -1) {
      try { this.game.canvas.releasePointerCapture(this.id); } catch (err) { /* zaten gitti */ }
    }
    this._cap = false;
    this.active = false;
    this.id = -1;
    this.ax = 0; this.ay = 0;
  }

  reset() {
    this._release();
    for (const k in this.keys) this.keys[k] = false;
  }

  /** Klavye + dokunmatiği birleştirip this.mx / this.my üretir. */
  sample() {
    /* MERKEZİ KORUMA — oyun oynanışta değilse joystick BİTER.
       Duraklatma, seviye kartı, boss perdesi, ölüm ekranı: bunların hepsi
       parmak hâlâ basılıyken açılabilir ve üstlerindeki HTML katmanı
       pointerup'ı yutar (stopPropagation) — sonra oyun devam ederken
       karakter kendi kendine yürür. Tek karşılaştırmayla beş geçiş yerini
       birden kapatır; her geçiş noktasına reset() serpiştirmekten sağlam,
       çünkü yeni bir durum eklendiğinde unutulacak yer yok. */
    if (this.active && this.game.state !== 'playing') this._release();

    const K = this.keys;
    let kx = (K['KeyD'] || K['ArrowRight'] ? 1 : 0) - (K['KeyA'] || K['ArrowLeft'] ? 1 : 0);
    let ky = (K['KeyS'] || K['ArrowDown'] ? 1 : 0) - (K['KeyW'] || K['ArrowUp'] ? 1 : 0);

    if (kx !== 0 || ky !== 0) {
      if (kx !== 0 && ky !== 0) { kx *= 0.7071; ky *= 0.7071; }   // çapraz normalizasyon
      this.mx = kx; this.my = ky;
    } else {
      this.mx = this.ax; this.my = this.ay;
    }
  }

  /** Ekran-uzayı joystick çizimi (yalnız aktifken). */
  render(ctx) {
    if (!this.active || this.game.state !== 'playing') return;

    const R = this.RADIUS;
    /* dış halka */
    ctx.globalAlpha = 0.28;
    ctx.strokeStyle = '#e8e4d8';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(this.ox, this.oy, R, 0, Math.PI * 2);
    ctx.stroke();

    /* dört yön çentiği (rün hissi) */
    ctx.globalAlpha = 0.2;
    ctx.beginPath();
    for (let i = 0; i < 4; i++) {
      const a = i * Math.PI / 2 + Math.PI / 4;
      ctx.moveTo(this.ox + Math.cos(a) * (R - 7), this.oy + Math.sin(a) * (R - 7));
      ctx.lineTo(this.ox + Math.cos(a) * (R + 1), this.oy + Math.sin(a) * (R + 1));
    }
    ctx.stroke();

    /* topuz */
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = '#f5c044';
    ctx.beginPath();
    ctx.arc(this.kx, this.ky, 17, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 0.85;
    ctx.strokeStyle = '#ffe9a8';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.globalAlpha = 1;
  }
}
