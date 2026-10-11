/* ═══════════════════════════════════════════════════════════
   arenaProps.js — HARİTA İÇİ ENGELLER (çarpışmalı + kırılabilir)

   2026-08-23'e kadar geçerli olan kural şuydu: "oyun alanının içi
   tamamen DÜZDÜR, çarpılacak hiçbir şey yok" (bkz. CLAUDE.md ·
   SAVAŞ ALANI HARİTALARI kural 1). O kural 1900 px'lik bir sahada
   doğruydu: ekranın yarısı kadar bir alanda tek bir mezar taşı bile
   kaçış yolunu kapatır.

   Saha 4000 px'e çıktı (×4,4 alan) ve oyuncu artık haritanın ~%8'ini
   görüyor. Bu ölçekte engel bir tuzak değil, TOPOGRAFYADIR: arkasına
   saklanılır, düşman sürüsü bölünür, kırılınca ödül verir.

   ── TASARIM SÖZLEŞMESİ ────────────────────────────────────
   1. ÇARPIŞMA KUTUSU EKSENE HİZALIDIR. Görsel dönüş ±0,05 rad ile
      sınırlı (yalnız "elle dizilmemiş" hissi için). Sebep: daire-AABB
      itmesi karekök ve köşe titremesi olmadan çalışır, döndürülmüş
      kutu ikisini de geri getirir.
   2. HİÇBİR ENGEL GRUBU KAPALI ÇEVRE KURMAZ. Çitli avlular en az iki
      kapı bırakır; `_hdtest` taşma-doldurma ile ölçer. Kapalı bir
      avluda doğan oyuncu joystick'i "takılmış" sanır (bkz. input.js
      dersi: takılma teşhisi her zaman kaçan bir olaydır — bunu
      eklemek o teşhisi imkânsız hale getirirdi).
   3. ADET LAYOUT ANINDA `Quality.budget('props')` ile belirlenir ve
      FLEX = 0'dır. Diğer bütçeler stres altında kısılır; bu KISILMAZ:
      koşu ortasında yok olan bir engel, oyuncunun arkasına saklandığı
      duvarın buharlaşması demektir. Kademe tabanı belirler, stres
      dokunmaz.
   4. GÖRSEL = ÇARPIŞMA. Gölge ve moloz lekesi haritanın makro dokusuna
      PİŞİRİLİR (statik, sıfır maliyet) ve aynı listeden üretilir; yani
      taşın göründüğü yer çarpıştığı yerdir. Kırılan taşın lekesi yerinde
      kalır — o leke zaten molozdur.
   5. TEK ÇİZİM ÇAĞRISI. Hepsi bir InstancedMesh (kutu) örneğidir;
      renk örnek başına yazılır. Tampon YALNIZ bir şey değiştiğinde
      yüklenir (kırılma/parlama), her karede değil.
   ═══════════════════════════════════════════════════════════ */

/* ═══════════════════════════════════════════════════════════
   arenaProps.js — HARİTA İÇİ NESNELER (çarpışmalı + kırılabilir)

   Bu dosya nesnenin DAVRANIŞIdir; nesnenin GÖRÜNÜŞÜ `propModels.js`te.
   Ayrım önemli: iki taraf da aynı ayak izini kullanmak zorunda (görsel =
   çarpışma), yani `hx/hz` değişirse modelin taban ölçüsü de değişir.

   ── TASARIM SÖZLEŞMESİ ────────────────────────────────
   1. ÇARPIŞMA KUTUSU EKSENE HİZALIDIR. Görsel dönüş ±0,05 rad ile
      sınırlı. Sebep: daire-AABB itmesi karekök ve köşe titremesi olmadan
      çalışır, döndürülmüş kutu ikisini de geri getirir.
   2. HİÇBİR GRUP KAPALI ÇEVRE KURMAZ. Çitli avlular en az iki kapı
      bırakır; `_hdtest` taşma-doldurma ile ölçer.
   3. ADET `Quality.budget('props')` ile belirlenir, FLEX = 0. Koşu
      ortasında yok olan duvar, arkasına saklanılan şeyin buharlaşmasıdır.
   4. GÖRSEL = ÇARPIŞMA. Gölge ve moloz lekesi makro dokuya PİŞER (statik,
      sıfır maliyet) ve aynı listeden üretilir.
   5. ÇİZİM: arketip başına bir InstancedMesh (~17 çağrı). Önceki sürüm
      tek kutu meshiyle "tek çizim çağrısı" tutuyordu ve her nesne aynı
      dikdörtgen prizma görünüyordu — ölçüm değil ÖLÇÜT yanlıştı.
   ═══════════════════════════════════════════════════════════ */

/* hp: 0 = KIRILMAZ (yapılar, mihrap). h yalnız bilgi; çarpışma hx/hz.
   pri: bütçe daraldığında ÖNCE atılan yüksek sayılar (0 asla atılmaz).
   RENK BURADA YOK: albedo geometriye pişmiştir (propModels).
   base: dokuya PİŞEN kaide lekesinin türü (slab · dirt · pale · wet ·
     scorch). Önceki sürümde bu bilgi `paintPropBases` içinde arketip
     ADIYLA yazılıydı; yeni arketip eklendiğinde kaide sessizce
     kayboluyordu (leke yok → nesne zeminin üstünde yüzüyor).
   span: uzun ve UÇ UCA dizilen tür (çit, duvar). `A.line` bunların
     yarı uzunluğunu aralıktan TÜRETİR, elle yazılmaz.
   built: yapılmış nesne — dizilimde rastgele ±3° sallantı almaz.
   pass: ÇARPIŞMASIZ ÜST YAPI (yalnız kemer kapı).
     NEDEN BİR İSTİSNA VAR: bir kemerin çarpışması İKİ AYAKTIR, eksene
     hizalı TEK kutu bunu ifade edemez. hx 62 ile konan kemer 124 birim
     genişliğinde bir DUVAR olur ve tam da geçit olması gereken yeri
     kapatır — yani "kapalı çevre yasak" kuralını kapının KENDİSİ ihlal
     ediyordu (mezarlık liç kapısı, katedral narteksi, çarkın yıldız
     kapıları: dördü de tıkalıydı). "Görsel = çarpışma" kuralından
     BİLEREK sapılıyor: ayakların arasından yürümek doğru davranış,
     kapının önünde durmak değil. Kapı zaten kırılmaz (hp 0), yani
     mermi/hasar yolu da bir şey kaybetmiyor. */
export const PROP_TYPES = {
  /* ── v49 — SAHADA YALNIZ SON TASARIMLAR (kullanıcı: "en son eklediğimiz
     yeni obje tasarımları hariç eskileri kaldır"). Kalanlar v43 premium
     pasosunda YENİDEN ÇİZİLENLER (haritaya göre fener · kap · kazan · kemik ·
     plaka · tuz sütunu · dişli) + v47'de düzeltilen iki işaret (kafatası
     höyüğü · totem) + v49'un biyom ağaçları. Mezar, lahit, şapel, ev,
     kulübe, fırın, baca, gemi, taht, kemer, çit, duvar, sütun, sıra, kızak,
     kaburga, halka, yığın ve eski SANDIK engeli kalktı (model kodu
     `_propModels_v48.js` arşivinde; oyun onu import etmez). ── */
  /* ── haritaya göre biçim alan ortak aydınlatma/kap (propModels PID) ── */
  kupa:     { hx: 18, hz: 18, h: 32,  hp: 14,  pri: 2, drop: 0.55 },
  fener:    { hx: 11, hz: 11, h: 129, hp: 0,   pri: 1, lamp: true },
  kazan:    { hx: 24, hz: 24, h: 46,  hp: 26,  pri: 2, drop: 0.50, base: 'scorch' },
  plaka:    { hx: 34, hz: 26, h: 26,  hp: 70,  pri: 2, drop: 0.20, base: 'slab' },
  kemik:    { hx: 26, hz: 20, h: 18,  hp: 10,  pri: 2, drop: 0.34, base: 'pale' },
  tuzsutun: { hx: 24, hz: 24, h: 128, hp: 60,  pri: 1, drop: 0.28, base: 'pale' },
  disli:    { hx: 54, hz: 54, h: 58,  hp: 120, pri: 1, drop: 0.35, base: 'slab' },
  /* ── işaret yapıları (kırılmaz, bütçe daralınca da kalır) ── */
  kafatasi: { hx: 92, hz: 78, h: 130, hp: 0,   pri: 0, base: 'pale' },
  totem:    { hx: 14, hz: 14, h: 164, hp: 0,   pri: 0, wood: true, base: 'dirt' },
  /* ── v49 BİYOM AĞAÇLARI: `agac` iri ağaç, `fidan` küçük eşi. Biçim
     haritadan gelir (propModels TREE_STYLE): mezarlıkta yas söğüdü +
     servi, külde kömürleşmiş ağaç, batakta selvi + mangrov, katedralde
     saksı defne, hiçlikte kristal ağaç, gökçe adada rüzgâr çamı + çiçekli
     fidan, tuzlada akasya, buzulda karlı köknar, kemik bahçesinde kemik
     ağacı, gök çarkında pirinç saat ağacı. KIRILMAZ: çevre düzenlemesi
     koşu ortasında delinmez (bütçe kuralı 3'ün ağaç hâli). `crown`:
     tacın yarıçapı — zemine pişen gölge onu okur (görsel = gölge). ── */
  agac:     { hx: 20, hz: 20, h: 196, hp: 0,   pri: 1, wood: true, base: 'dirt', tree: true, crown: 58 },
  fidan:    { hx: 13, hz: 13, h: 118, hp: 0,   pri: 2, wood: true, base: 'dirt', tree: true, crown: 36 },
  /* ── GÖREV VARLIĞI ── */
  yuva:     { hx: 46, hz: 46, h: 86, hp: 340, pri: 0, drop: 1, quest: true },
};

const MAX = 420;
const BREAK_T = 0.30;      // devrilme süresi (sn)

export class PropField {
  constructor(game) {
    this.game = game;
    this.n = 0;
    this.x = new Float32Array(MAX);
    this.y = new Float32Array(MAX);
    this.hx = new Float32Array(MAX);
    this.hz = new Float32Array(MAX);
    this.hh = new Float32Array(MAX);
    /* MODEL UZAYINDA ÖLÇEK (görsel = çarpışma). Span türlerinin kutusu
       aralıktan türetilir; renderer örneği bu ölçekle çizer, yoksa
       görünmez duvar oluşur (bkz. arenaMaps.place). */
    this.sx = new Float32Array(MAX);
    this.sz = new Float32Array(MAX);
    this.hp = new Float32Array(MAX);
    this.mhp = new Float32Array(MAX);
    this.rot = new Float32Array(MAX);
    this.flash = new Float32Array(MAX);
    this.brk = new Float32Array(MAX);
    this.dead = new Uint8Array(MAX);
    this.solid = new Uint8Array(MAX);
    this.drop = new Float32Array(MAX);
    this.kinds = new Array(MAX);          // yalnız kırılma anında okunur
    /* arketip → indeks listesi. Render tarafı arketip başına bir
       InstancedMesh tuttuğu için bu gruplandırma şart; yükleme anında
       kurulur, sıcak döngüde YALNIZ okunur. */
    this.byKind = {};
    this.stamp = 0;                       // değişirse render mesh'leri yeniler
    this.dirty = false;
    this._anim = 0;
    this._hot = 0;
    /* ızgara: yükleme anında kurulur, sıcak döngüde YALNIZ okunur */
    this.cs = 280;
    this.gw = 1; this.gh = 1; this.gx0 = 0; this.gy0 = 0;
    this.buckets = [[]];
  }

  clear() {
    this.n = 0; this.dirty = true; this._anim = 0; this._hot = 0;
    this.buckets = [[]]; this.gw = 1; this.gh = 1;
    this._baseN = 0;
    this.byKind = {};
    this.stamp++;
  }

  /** İZGARAYI YENİDEN KUR — yalnız yükleme/görev başlangıcında. */
  _rebuild(arena) {
    const A = arena || this._arena || { x0: -2140, y0: -2140, w: 4280, h: 4280 };
    this._arena = A;
    this.gx0 = A.x0; this.gy0 = A.y0;
    this.gw = Math.max(1, Math.ceil(A.w / this.cs));
    this.gh = Math.max(1, Math.ceil(A.h / this.cs));
    const nb = this.gw * this.gh;
    this.buckets = new Array(nb);
    for (let i = 0; i < nb; i++) this.buckets[i] = [];
    this.byKind = {};
    for (let i = 0; i < this.n; i++) {
      const ix0 = this._cx(this.x[i] - this.hx[i] - 40), ix1 = this._cx(this.x[i] + this.hx[i] + 40);
      const iy0 = this._cy(this.y[i] - this.hz[i] - 40), iy1 = this._cy(this.y[i] + this.hz[i] + 40);
      for (let iy = iy0; iy <= iy1; iy++) {
        for (let ix = ix0; ix <= ix1; ix++) this.buckets[iy * this.gw + ix].push(i);
      }
      const k = this.kinds[i];
      (this.byKind[k] || (this.byKind[k] = [])).push(i);
    }
    this.stamp++;
    this.dirty = true;
  }

  /** GÖREV VARLIĞI EKLE (yuva/mihrap). Pişirmeden gelmez, oyun içinde
      doğar — ama AYNI çarpışma/hasar/çizim yolundan geçer (tek kaynak).
      Dönen indeks ObjectiveManager'ın tuttuğu kimliktir. */
  addDynamic(kind, x, y, o) {
    const T = PROP_TYPES[kind];
    if (!T || this.n >= MAX) return -1;
    const k = this.n++;
    this.kinds[k] = kind;
    this.x[k] = x; this.y[k] = y;
    this.hx[k] = (o && o.hx) || T.hx; this.hz[k] = (o && o.hz) || T.hz;
    this.hh[k] = (o && o.h) || T.h;
    this.sx[k] = 1; this.sz[k] = 1;
    this.mhp[k] = this.hp[k] = (o && o.hp) || T.hp;
    this.rot[k] = 0;
    this.drop[k] = T.drop || 0;
    this.flash[k] = 0; this.brk[k] = 0; this.dead[k] = 0; this.solid[k] = 1;
    this._rebuild();
    return k;
  }

  /** list: bakeArenaMap çıktısı — {kind, x, y, rot} (dünya koordinatı). */
  load(list, arena) {
    this.clear();
    const n = Math.min(MAX, list ? list.length : 0);
    for (let i = 0; i < n; i++) {
      const p = list[i];
      const T = PROP_TYPES[p.kind];
      if (!T) continue;
      const k = this.n++;
      this.kinds[k] = p.kind;
      this.x[k] = p.x; this.y[k] = p.y;
      this.hx[k] = p.hx || T.hx; this.hz[k] = p.hz || T.hz;
      this.hh[k] = p.h || T.h;
      this.sx[k] = p.sx || 1;
      this.sz[k] = p.sz || 1;
      this.mhp[k] = this.hp[k] = T.hp;
      this.rot[k] = p.rot || 0;
      this.drop[k] = T.drop || 0;
      this.flash[k] = 0; this.brk[k] = 0; this.dead[k] = 0; this.solid[k] = T.pass ? 0 : 1;
    }
    this._baseN = this.n;
    this._rebuild(arena || { x0: -2140, y0: -2140, w: 4280, h: 4280 });
    return this.n;
  }

  _cx(v) { const i = ((v - this.gx0) / this.cs) | 0; return i < 0 ? 0 : (i >= this.gw ? this.gw - 1 : i); }
  _cy(v) { const i = ((v - this.gy0) / this.cs) | 0; return i < 0 ? 0 : (i >= this.gh ? this.gh - 1 : i); }

  /* ── ÇARPIŞMA: daire (yarıçap r) vs eksene hizalı kutu ──
     En küçük nüfuz eksenine it. Tek geçiş; yeterli çünkü kutular
     birbirine değecek kadar yakın dizilmiyor (dizilim ölçülür). */
  resolve(ent, r) {
    if (!this.n) return false;
    const bx0 = this._cx(ent.x - r), bx1 = this._cx(ent.x + r);
    const by0 = this._cy(ent.y - r), by1 = this._cy(ent.y + r);
    let hit = false;
    for (let iy = by0; iy <= by1; iy++) {
      for (let ix = bx0; ix <= bx1; ix++) {
        const b = this.buckets[iy * this.gw + ix];
        for (let j = 0; j < b.length; j++) {
          const i = b[j];
          if (!this.solid[i]) continue;
          const nx = ent.x - this.x[i], ny = ent.y - this.y[i];
          const ox = this.hx[i] + r - (nx < 0 ? -nx : nx);
          if (ox <= 0) continue;
          const oz = this.hz[i] + r - (ny < 0 ? -ny : ny);
          if (oz <= 0) continue;
          if (ox < oz) ent.x = this.x[i] + (nx < 0 ? -1 : 1) * (this.hx[i] + r);
          else         ent.y = this.y[i] + (ny < 0 ? -1 : 1) * (this.hz[i] + r);
          hit = true;
        }
      }
    }
    return hit;
  }

  /** Mermi için: noktayı kaplayan katı engel indeksi, yoksa -1. */
  hitScan(x, y, r) {
    if (!this.n) return -1;
    const ix = this._cx(x), iy = this._cy(y);
    const b = this.buckets[iy * this.gw + ix];
    for (let j = 0; j < b.length; j++) {
      const i = b[j];
      if (!this.solid[i]) continue;
      const nx = x - this.x[i], ny = y - this.y[i];
      if ((nx < 0 ? -nx : nx) > this.hx[i] + r) continue;
      if ((ny < 0 ? -ny : ny) > this.hz[i] + r) continue;
      return i;
    }
    return -1;
  }

  damage(i, dmg) {
    if (i < 0 || i >= this.n || !this.solid[i]) return false;
    if (this.mhp[i] <= 0) {            // kırılmaz: yalnız kıvılcım
      this.flash[i] = 0.10; this._hot++; this.dirty = true;
      return false;
    }
    this.hp[i] -= dmg;
    this.flash[i] = 0.12; this._hot++; this.dirty = true;
    if (this.hp[i] > 0) return false;
    this._break(i);
    return true;
  }

  damageArea(x, y, r, dmg) {
    if (!this.n) return 0;
    const bx0 = this._cx(x - r), bx1 = this._cx(x + r);
    const by0 = this._cy(y - r), by1 = this._cy(y + r);
    let broke = 0;
    for (let iy = by0; iy <= by1; iy++) {
      for (let ix = bx0; ix <= bx1; ix++) {
        const b = this.buckets[iy * this.gw + ix];
        for (let j = 0; j < b.length; j++) {
          const i = b[j];
          if (!this.solid[i]) continue;
          const nx = x - this.x[i], ny = y - this.y[i];
          if ((nx < 0 ? -nx : nx) > this.hx[i] + r) continue;
          if ((ny < 0 ? -ny : ny) > this.hz[i] + r) continue;
          if (this.damage(i, dmg)) broke++;
        }
      }
    }
    return broke;
  }

  _break(i) {
    this.solid[i] = 0;
    this.brk[i] = BREAK_T;
    this._anim++;
    this.dirty = true;
    const g = this.game;
    if (!g) return;
    /* GÖREV VARLIĞI: hasar/çarpışma yolu ortak, ama kırılma HABERİ göreve
       gider. Objektif kendi hasar sistemini yazsaydı iki kaynak olurdu. */
    if (g.objectives && g.objectives.onPropBreak) g.objectives.onPropBreak(i);
    const x = this.x[i], y = this.y[i];
    /* Ses/efekt YALNIZ görüş alanında (isabet katmanı dersi: ekran dışı
       olay oyuncunun gördüğü olaydan yuva çalar). */
    if (g.inView && g.inView(x, y, 90)) {
      const T = PROP_TYPES[this.kinds[i]];
      const dust = (T && T.lamp) ? '#ffc98a' : ((T && T.wood) ? '#8a6240' : '#b8b2a0');
      g.spawnBurst(x, y, dust, 10, 160, 3, 0.45, false);
      g.spawnBurst(x, y, '#4a463c', 7, 120, 4, 0.5, false);
      if (g.renderer3d && g.renderer3d.spawnHit) g.renderer3d.spawnHit(x, y, 0, 2, 0.7, 0.24, 0.2);
      if (g.audio && g.audio.play) g.audio.play('propbreak');
    }
    if (this.drop[i] > 0 && Math.random() < this.drop[i]) {
      if (Math.random() < 0.14 && g.spawnHeart && g.player) {
        g.spawnHeart(x, y, Math.max(6, Math.round(g.player.maxHp * 0.08)));
      } else {
        g.spawnGem(x, y, 2 + (Math.random() * 3 | 0));
      }
    }
  }

  update(dt) {
    if (this._anim > 0) {
      for (let i = 0; i < this.n; i++) {
        if (this.brk[i] <= 0) continue;
        this.brk[i] -= dt;
        if (this.brk[i] <= 0) { this.brk[i] = 0; this.dead[i] = 1; this._anim--; }
      }
      this.dirty = true;
    }
    if (this._hot > 0) {
      let live = 0;
      for (let i = 0; i < this.n; i++) {
        if (this.flash[i] <= 0) continue;
        this.flash[i] -= dt;
        if (this.flash[i] < 0) this.flash[i] = 0; else live++;
      }
      this._hot = live;
      this.dirty = true;
    }
  }

  /** Doğuş/ışınlanma güvenliği: nokta bir engelin içinde mi? */
  blocked(x, y, r) {
    return this.hitScan(x, y, r || 0) >= 0;
  }
}
