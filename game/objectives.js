/* ═══════════════════════════════════════════════════════════
   objectives.js — SAHA İÇİ GÖREVLER (keşfedilir, isteğe bağlı)

   ── NEDEN YENİDEN YAZILDI ─────────────────────────────────
   İlk sürüm görevi oyuncuya ATIYORDU: iki dalgada bir kendiliğinden
   başlıyor, HUD'un tepesinde bir sekme açıyor, banner basıyordu. Yanlıştı
   iki sebepten:
     1. Oyuncu görevi SEÇMEMİŞ oluyordu. Kendiliğinden başlayan ve
        başarısız olunca ödülü iptal eden bir şey görev değil CEZADIR.
     2. HUD sekmesi "oyuna girdiğin an tepede duran bir şey"di; oysa
        4000 px'lik sahanın bütün anlamı KEŞİFTİR — görev haritada
        bulunmalı, ekranın tepesinde duyurulmamalı.

   Yeni model: görev haritada DURAN bir yerdir.
     · KURTARMA NOKTASI — kalkan kubbesi içinde bekleyen bir insan.
       Kubbe uzaktan görünür, oyuncu merak edip gider. Kubbeye girmek
       kubbeyi kırar ve escort başlar. Girmemek tamamen serbesttir.
     · YUVALAR — KALDIRILDI (2026-08-30). Haritaya serpilen üç mor höyük
       kullanıcı isteğiyle çıkarıldı; yerleştirme `arenaMaps.nest()` içinde
       tek yerden kapalı (koordinatlar ve prop türü duruyor). Aşağıdaki
       yuva kodu ÇALIŞIR haldedir ama `byKind.yuva` boş geldiği için hiç
       tetiklenmez — geri getirmek yeni bir görsel dil + o tek satırdır.
   İkisi de zamanlayıcısız, ikisi de isteğe bağlı, ikisinin de ödülü
   ANINDA kart seçimidir (kullanıcı isteği: "görevleri yapınca ödül versin
   savaş alanında, örneğin anında birdaha kart seçimi gibi").

   ── SÖZLEŞME ──────────────────────────────────────────────
   1. HUD YOK. Yönlendirme dünya uzayındadır: kubbe, varış feneri, mini
      harita noktası, ekran dışıysa kenarda pusula oku.
   2. GÖREV DALGAYI KESMEZ. Sayaç işler, düşman akar.
   3. BAŞARISIZLIK KOŞUYU BİTİRMEZ. İnsan ölürse kurtarma noktası bir
      süre sonra haritanın başka bir yerinde yeniden açılır.
   4. NPC OYUNCUYU TAKİP EDER, YOL BULMAZ. Engelli sahada takılan bir NPC
      bütün görevi bozar; takip modeli oyuncuyu ÖNDER yapar — escort'un
      asıl duygusu bu. Leash dışında durur, oyuncu geri dönmek zorunda.
   5. VARIŞ NOKTASI BİR YAPIDIR. Haritanın `ev`/`sapel` örnekleri güvenli
      noktalardır (PropField.byKind'dan okunur) — "güvenli yere taşımak"
      soyut bir daire değil, çatısı ve ışığı olan bir yer olmalı.
   6. SICAK DÖNGÜDE TAHSİS YOK.
   ═══════════════════════════════════════════════════════════ */

const ESC = {
  leash: 320,        // bu mesafenin ötesinde NPC durur ve bekler
  follow: 92,        // bu mesafenin altında da durur (dibine girmesin)
  speed: 176,        // oyuncudan yavaş: koşarak kaçmak işe yaramaz
  hp: 300,
  hurtR: 46,
  dps: 15,
  goalR: 165,        // varış yarıçapı (yapının önü)
  wakeR: 128,        // kubbeye bu mesafede girmek escort'u başlatır
  hintR: 340,        // bu mesafede "KURTAR" ipucu görünür
};

const DOME_T = 0.55;     // kubbenin kırılma animasyonu (sn)
const RESPAWN = 26;      // insan ölürse yeni nokta bu kadar sonra açılır

export class ObjectiveManager {
  constructor(game) {
    this.game = game;
    /* none | waiting | escort | cooldown */
    this.phase = 'none';
    this.npc = { x: 0, y: 0, vx: 0, vy: 0, hp: 0, maxHp: 1, anim: 0, wait: 0, face: 0 };
    this.dest = { x: 0, y: 0 };
    this.domeT = 0;          // 0 sağlam · 1 tamamen kırıldı
    this.frac = 0;
    this.danger = false;
    this.cool = 0;
    this.saved = 0;
    this.nests = [];
    this.nestDone = false;
    this._d0 = 1;
    this._scratch = [];
  }

  reset() {
    /* SIRADAN BAĞIMSIZ KURULUM (joystick dersindeki kalıp).
       Üç kez denendi, üçünde de aynı duvara çarpıldı: begin() nereye
       konursa konsun perde akışının bir yeri ondan SONRA reset() çağırıyor
       ve görev sessizce 'none' kalıyor (çağrı izi: reset → begin → reset).
       Kurulumu doğru yere koymaya çalışmak yerine kurulumu ARANIR hale
       getiriyoruz: reset() yalnız "yeniden kurulmalı" diye işaretler,
       gerçek yerleştirme bir sonraki update() karesinde olur.

       Neden bu doğru: hangi akışın en son çalıştığını bilmek zorunda
       kalmıyoruz. Yeni bir perde, yeni bir menü, yeni bir sıfırlama yolu
       eklendiğinde bozulacak bir yer kalmaz — input.js'te merkezi korumayı
       sample()'a koymakla aynı gerekçe. */
    this._armed = true;
    this.phase = 'none';
    this.domeT = 0;
    this.frac = 0;
    this.cool = 0;
    this.saved = 0;
    this.nests.length = 0;
    this.nestDone = false;
  }

  /** Görev başında çağrılır. Yalnız İŞARETLER — gerçek yerleştirme bir
      sonraki update() karesinde, props kesin hazırken olur. */
  begin() {
    this.reset();
  }

  /** İşaretliyse kur. update() her karede sorar; maliyeti tek bayrak testi. */
  _arm() {
    if (!this._armed) return;
    const g = this.game;
    if (!g.arena || !g.props || !g.props.n) return;   // props henüz hazır değil
    this._armed = false;
    this.nests.length = 0;
    this.nestDone = false;
    this.saved = 0;
    this.cool = 0;
    try {
      const F = this.game.props;
      if (F && F.byKind.yuva) {
        const l = F.byKind.yuva;
        for (let i = 0; i < l.length; i++) this.nests.push(l[i]);
      }
      this._place();
    } catch (e) {
      /* Görev kurulamadıysa koşu devam eder (görev İSTEĞE BAĞLI) ama hata
         yutulmaz: sessiz 'none' fazı teşhis edilemezdi. */
      console.error('[objectives] kurulum başarısız:', e);
      this.phase = 'none';
    }
  }

  /** Güvenli nokta adayları: haritanın YAPILARI. */
  _safeSpots() {
    const F = this.game.props;
    const out = [];
    if (!F) return out;
    /* v49: ev/şapel/mahzen sahadan kalktı. Sığınak = haritanın OCAKLARI
       (kazan · totem · kafatası höyüğü): her planda sahne merkezi olarak
       duruyorlar. Göbeğe (<600) yakın olan elenir — yolculuk kısa kalırdı. */
    const kinds = ['kazan', 'totem', 'kafatasi'];
    for (let k = 0; k < kinds.length; k++) {
      const l = F.byKind[kinds[k]];
      if (!l) continue;
      for (let i = 0; i < l.length; i++) {
        const x = F.x[l[i]], y = F.y[l[i]] + F.hz[l[i]] + 90;
        if (Math.hypot(x, y) < 600) continue;
        out.push({ x, y });
      }
    }
    return out;
  }

  /** Kurtarma noktasını ve varış yapısını yerleştir. */
  _place() {
    const g = this.game, A = g.arena;
    if (!A) return;
    const P = A.play;
    const safe = this._safeSpots();
    /* Varış: rastgele bir yapı. Kurtarma noktası: o yapıdan UZAK bir çeyrek
       — yolculuk haritanın göbeğinden geçsin, yani escort oyuncuyu
       kalabalığın içinden yürütsün. */
    if (safe.length) {
      const d = safe[(Math.random() * safe.length) | 0];
      this.dest.x = d.x; this.dest.y = d.y;
    } else {
      this.dest.x = 0; this.dest.y = P * 0.32;
    }
    const ang = Math.atan2(-this.dest.y, -this.dest.x) + (Math.random() - 0.5) * 1.1;
    const rad = P * 0.34;
    const sx = this._free(Math.cos(ang) * rad, Math.sin(ang) * rad);
    this.npc.x = sx; this.npc.y = this._freeY;
    this.npc.hp = this.npc.maxHp = ESC.hp;
    this.npc.vx = this.npc.vy = 0;
    this.npc.wait = 0;
    this.npc.face = 0;
    this.domeT = 0;
    this.frac = 0;
    this.phase = 'waiting';
    this._d0 = Math.max(1, Math.hypot(this.dest.x - sx, this.dest.y - this._freeY));
  }

  /** Engel içine düşmeyen en yakın noktayı bul (spiral tarama). */
  _free(x, y) {
    const g = this.game, A = g.arena;
    const lim = A.play / 2 - 190;
    let cx = Math.max(-lim, Math.min(lim, x));
    let cy = Math.max(-lim, Math.min(lim, y));
    const F = g.props;
    /* v43: KUBBE PAYI ÖNCE. 60 birimlik pay yalnız insanı engelden
       çıkarıyordu; 132 yarıçaplı kalkan kubbesi (+ çeperdeki yayıcı
       kaideler) dikilitaşın, lahdin İÇİNDEN geçiyordu (oyunda 1:1 görüldü).
       Önce kubbenin sığdığı açıklık aranır, bulunamazsa eski pay. */
    for (const clr of [150, 60]) {
      if (!F || !F.blocked(cx, cy, clr)) break;
      for (let r = 60; r <= 520; r += 55) {
        for (let a = 0; a < 10; a++) {
          const t = (a / 10) * 6.283;
          const nx = cx + Math.cos(t) * r, ny = cy + Math.sin(t) * r;
          if (Math.abs(nx) < lim && Math.abs(ny) < lim && !F.blocked(nx, ny, clr)) {
            this._freeY = ny;
            return nx;
          }
        }
      }
    }
    this._freeY = cy;
    return cx;
  }

  /** PropField bir yuvayı kırdığında. */
  onPropBreak(idx) {
    if (this.nestDone) return;
    const i = this.nests.indexOf(idx);
    if (i < 0) return;
    this.nests.splice(i, 1);
    const g = this.game;
    g.spawnBurst(g.props.x[idx], g.props.y[idx], '#b98cff', 26, 240, 4, 0.7, true);
    g.addShake(0.14);
    if (this.nests.length) {
      g.spawnText(g.props.x[idx], g.props.y[idx] - 60,
        'YUVA ' + (3 - this.nests.length) + '/3', '#b98cff', 17, false);
      return;
    }
    this.nestDone = true;
    g.ui.banner('YUVALAR SUSTU', 'KART ÖDÜLÜ');
    g.grantObjectiveCard();
  }

  update(dt) {
    if (this._armed) this._arm();
    /* kubbe kırılma animasyonu escort başladıktan sonra da sürer */
    if (this.domeT > 0 && this.domeT < 1) {
      this.domeT = Math.min(1, this.domeT + dt / DOME_T);
    }
    if (this.phase === 'cooldown') {
      this.cool -= dt;
      if (this.cool <= 0) this._place();
      return;
    }
    if (this.phase === 'waiting') this._updWaiting(dt);
    else if (this.phase === 'escort') this._updEscort(dt);
  }

  _updWaiting(dt) {
    const g = this.game, p = g.player, n = this.npc;
    n.anim = 0; n.vx = 0; n.vy = 0;
    const d = Math.hypot(p.x - n.x, p.y - n.y);
    this.near = d < ESC.hintR;
    if (d > ESC.wakeR) return;
    /* KUBBEYE GİRİLDİ → escort başlar. Oyuncunun kararı; hiçbir şey
       kendiliğinden tetiklenmez. */
    this.phase = 'escort';
    this.domeT = 0.0001;
    g.spawnBurst(n.x, n.y, '#bfeaff', 34, 300, 4.2, 0.75, true);
    /* v73: mobilde halka 10 → 5 (aynı karede 11 katkılı halka + kubbe kırılması + fener = tırmanan dolgu) */
    const nR = g.isMobile ? 5 : 10;
    for (let i = 0; i < nR; i++) {
      const a = (i / nR) * 6.283;
      g.pools.rings.obtain(n.x + Math.cos(a) * 90, n.y + Math.sin(a) * 90, 40, 0.4, '#bfeaff');
    }
    g.pools.rings.obtain(n.x, n.y, 240, 0.55, '#8fdcff');
    g.addShake(0.16);
    if (g.audio) g.audio.play('rescue');
    g.ui.banner('KURTARILDI', 'IŞIĞA GÖTÜR');
  }

  _updEscort(dt) {
    const g = this.game, p = g.player, n = this.npc;
    const dx = p.x - n.x, dy = p.y - n.y;
    const d = Math.hypot(dx, dy) || 1;
    if (d < ESC.leash && d > ESC.follow) {
      n.vx = (dx / d) * ESC.speed;
      n.vy = (dy / d) * ESC.speed;
      n.wait = 0;
      n.anim += dt * 9;
    } else {
      n.vx *= 0.82; n.vy *= 0.82;
      n.wait += dt;
    }
    n.x += n.vx * dt; n.y += n.vy * dt;
    const A = g.arena;
    if (A) {
      n.x = Math.max(A.l, Math.min(A.r, n.x));
      n.y = Math.max(A.t, Math.min(A.b, n.y));
    }
    if (g.props) g.props.resolve(n, 16);

    const hurt = g.enemies.queryCircle(n.x, n.y, ESC.hurtR, this._scratch);
    if (hurt && hurt.length) {
      n.hp -= ESC.dps * hurt.length * dt;
      if (Math.random() < dt * 9 && g.inView(n.x, n.y, 60)) {
        g.spawnBurst(n.x, n.y, '#ff6a72', 3, 90, 2.4, 0.3, false);
      }
      if (n.hp <= 0) { this._lose(); return; }
    } else if (n.hp < n.maxHp) {
      n.hp = Math.min(n.maxHp, n.hp + dt * 6);
    }

    const gd = Math.hypot(this.dest.x - n.x, this.dest.y - n.y);
    this.frac = Math.max(0, Math.min(1, 1 - gd / this._d0));
    this.danger = n.hp < n.maxHp * 0.35;
    if (gd < ESC.goalR) this._win();
  }

  _win() {
    const g = this.game;
    const cx = this.npc.x, cy = this.npc.y;
    this.phase = 'cooldown';
    this.cool = RESPAWN * 1.6;
    this.saved++;
    this.domeT = 1;
    /* Ödülün YERİ hedefin yanıdır: oyuncu gittiği yerde ödüllenir,
       ekranın üstünde bir sayı artmaz. */
    const n = 18 + (g.msn.world | 0) * 2;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * 6.283, r = 34 + Math.random() * 96;
      g.spawnGem(cx + Math.cos(a) * r, cy + Math.sin(a) * r, 3 + (Math.random() * 4 | 0));
    }
    g.spawnBurst(cx, cy, '#7fe3b0', 32, 290, 4.5, 0.8, true);
    g.pools.rings.obtain(cx, cy, 260, 0.6, '#9ff2c4');
    g.addShake(0.18);
    if (g.audio) g.audio.play('delivered');
    g.ui.banner('EVE VARDI', 'KART ÖDÜLÜ');
    g.grantObjectiveCard();
  }

  _lose() {
    const g = this.game;
    g.spawnBurst(this.npc.x, this.npc.y, '#ff3b4e', 24, 210, 4, 0.7, false);
    this.phase = 'cooldown';
    this.cool = RESPAWN;
    this.domeT = 1;
    if (g.audio) g.audio.play('objfail');
    g.ui.banner('KAYBEDİLDİ', '');
  }

  /* ── yönlendirme sorguları (dünya uzayı çizimi ve mini harita) ── */
  targetX() {
    if (this.phase === 'waiting') return this.npc.x;
    if (this.phase === 'escort') return this.dest.x;
    if (!this.nestDone && this.nests.length) return this.game.props.x[this.nests[0]];
    return null;
  }

  targetY() {
    if (this.phase === 'waiting') return this.npc.y;
    if (this.phase === 'escort') return this.dest.y;
    if (!this.nestDone && this.nests.length) return this.game.props.y[this.nests[0]];
    return null;
  }

  /** Mini haritada insanın kendisi (kurtarma noktası veya taşınan kişi). */
  npcVisible() { return this.phase === 'waiting' || this.phase === 'escort'; }
}
