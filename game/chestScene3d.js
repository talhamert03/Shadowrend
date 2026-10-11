/* ═══════════════════════════════════════════════════════════
   chestScene3d.js — 3D Sandık Sahnesi v7 (sahne + tören FX; MODEL chestModel3d.js)

   6 kademe, 6 bambaşka kimlik — hepsi koyu zemin üstünde ışıldar:
   • t1 SIRADAN — kara meşe: is tutmuş kalaslar, dövme demir, kor ışıklı anahtar deliği
   • t2 YAYGIN  — buz çeliği: koyu çelik, buz oymaları (ışır), kilit taşı
   • t3 NADİR   — kral altını: koyu altın, filigran kabartma, güneş oyması, yakut köşeler
   • t4 EPİK    — ametist kalp: obsidyen kafes, nabız gibi atan kristal, rün eteği
   • t5 EFSANE  — gece taşı: altın boynuz, akik teal derz, glif kuşağı, taçlı prizma
   • t6 MİSTİK  — kâhin gözü: boşluk taşı, altın yörünge halkaları, süzülen taç,
                  dev pembe göz prizması — TEK efsanevi kartın mührü

   renderFrame API değişmedi: { posY, scaleX/Y/Z, shakeX, rotZ, open, seam, dt }
   ═══════════════════════════════════════════════════════════ */

import * as THREE from 'three';
import { buildChestModel, makeEnv, makeInkMat, CHEST_GLOW, CHEST_DIM } from './chestModel3d.js?v=20260930m';

const BW = 42, BH = 24.2, BD = 30;   // BH + 3 = ağız (CHEST_DIM.mouthY 27,2) — tören FX bu sabitten okur
/* KAPAK TAŞMASI 2D VİTRİNDEN ÖLÇÜLDÜ (2026-09-01).
   `chestArt.chestBase`: gövde üst genişliği 41, kapak yarıçapı 22 → kapak
   gövdeyi kenar başına 1,5 birim (%7,3) aşar. 3B'de taşma +10 birim
   (%23,8) idi: yandan bakıldığında kapak bir MANTAR ŞAPKASI gibi
   duruyordu ve "aynı sandık" hissini bozan asıl şey buydu — doku değil
   SİLÜET. Derinlikte de aynı oran kullanılır (görünmeyen eksende farklı
   oran kapağı eğri gösterir). Kapak yüksekliği DEĞİŞMEZ: 2D'de kubbe /
   gövde = 17,5/22 = 0,795 ve kademe başına 5,4+domeH toplamı (14,9-16,4)
   bu bandın içinde zaten oturuyor. */
const LW = BW + 3, LD = BD + 3;
const CAM_DIR = { y: 0.242, z: 0.970 };

const easeOutBack = (x) => {
  const c1 = 1.70158, c3 = c1 + 1;
  return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
};

export class ChestScene3D {
  constructor(canvas) {
    this.canvas = canvas;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'low-power' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    if ('outputColorSpace' in this.renderer) this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(30, 1, 1, 800);

    /* karanlık premium sahne: loş ambiyans, sıcak anahtar ışık, soğuk dolgu */
    this.scene.add(new THREE.AmbientLight(0x8890b8, 0.22));
    const key = new THREE.DirectionalLight(0xffeeda, 2.1);
    key.position.set(-70, 130, 90);
    this.scene.add(key);
    const fill = new THREE.DirectionalLight(0xa8bcff, 0.45);
    fill.position.set(90, 40, 50);
    this.scene.add(fill);
    this.rim = new THREE.PointLight(0xffffff, 1.7, 600, 1.5);
    this.rim.position.set(0, 50, -75);
    this.scene.add(this.rim);
    this.inner = new THREE.PointLight(0xffe6ac, 0, 200, 2);
    this.inner.position.set(0, 18, 4);
    this.scene.add(this.inner);

    const shadowMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.42, depthWrite: false });
    this.shadow = new THREE.Mesh(new THREE.CircleGeometry(30, 28), shadowMat);
    this.shadow.rotation.x = -Math.PI / 2;
    this.shadow.position.y = 0.2;
    this.scene.add(this.shadow);

    this.glowTex = this._radialTex();
    this.starTexM = this._starTex();
    this.glowMat = new THREE.MeshBasicMaterial({ map: this.glowTex, color: 0xffffff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
    this.groundGlow = new THREE.Mesh(new THREE.CircleGeometry(50, 32), this.glowMat);
    this.groundGlow.rotation.x = -Math.PI / 2;
    this.groundGlow.position.y = 0.5;
    this.scene.add(this.groundGlow);

    /* ── IŞIK HUZMESİ (god ray): sandığın AĞZINDAN yukarı fışkıran hacimli
       ışık. Eskiden gökte asılı tek bir daireydi — kenarı elips şeklinde
       bitiyor, "burası efektin sonu" diye okunuyordu. Artık tabandan
       (kapak aralığından) başlayan, YANLARI VE UCU TAMAMEN ŞEFFAFA ÖLEN
       bir doku; üç farklı açıda döndürülmüş dörtgen → her bakış açısından
       hacimli, hiçbir yerde kesik kenar yok. ── */
    this.beamTex = this._beamTex();
    /* Additive katman başına DÜŞÜK opasite: yüksek alfa RGB'yi 1'in
       üzerine taşırıp rengi beyaza kırpıyor — sandığın tier rengi kayboluyordu.
       İki dörtgen (üç değil) + düşük opasite = renk korunur, hacim kalır. */
    this.beamMat = new THREE.MeshBasicMaterial({ map: this.beamTex, color: 0xffe6ac, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
    const beamGeo = new THREE.PlaneGeometry(1, 1);
    beamGeo.translate(0, 0.5, 0);          // taban = pivot → ağızdan büyür
    this.beam = new THREE.Group();
    for (let i = 0; i < 2; i++) {
      const q = new THREE.Mesh(beamGeo, this.beamMat);
      q.rotation.y = (i / 2) * Math.PI;
      this.beam.add(q);
    }
    this.beam.position.set(0, BH + 3, 0);
    this.scene.add(this.beam);

    /* ağız kökü: kameraya dönük küçük dikey parlaklık. Yatay ağız
       düzlemi 14° kameradan ince bir elips olarak göründüğü için huzmenin
       dibiyle kapak aralığı arasındaki boşluğu bu kapatır. */
    this.beamRootMat = new THREE.MeshBasicMaterial({ map: this.glowTex, color: 0xffe6ac, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
    this.beamRoot = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), this.beamRootMat);
    this.scene.add(this.beamRoot);

    /* açılış kıvılcım fıskiyesi (havuz) */
    this.sparkGroup = new THREE.Group();
    this.scene.add(this.sparkGroup);
    this.sparks = [];
    for (let i = 0; i < 34; i++) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(5, 5),
        new THREE.MeshBasicMaterial({ map: this.glowTex, color: 0xffe08a, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
      m.visible = false;
      this.sparkGroup.add(m);
      this.sparks.push({ m, life: 0, max: 1, vx: 0, vy: 0, vz: 0 });
    }

    /* zemin rün halkası — sandığın altında dönen büyü çemberi */
    this.runeMat = new THREE.MeshBasicMaterial({ map: this._runeTex(), color: 0xffe6ac, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
    this.runeRing = new THREE.Mesh(new THREE.PlaneGeometry(100, 100), this.runeMat);
    this.runeRing.rotation.x = -Math.PI / 2;
    this.runeRing.position.y = 0.8;
    this.scene.add(this.runeRing);

    /* süzülen büyü tozu (ember motes) */
    this.motes = [];
    const moteG = new THREE.Group();
    for (let i = 0; i < 18; i++) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 2.6),
        new THREE.MeshBasicMaterial({ map: this.glowTex, color: 0xffe6ac, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
      m.userData = { a: Math.random() * 6.283, r: 26 + Math.random() * 34, y: Math.random() * 66, sp: 3.5 + Math.random() * 5, seed: Math.random() * 6.283 };
      moteG.add(m);
      this.motes.push(m);
    }
    this.scene.add(moteG);

    /* v7: stüdyo çevre haritası (metal yansıması) + nötr ton eşleme + mürekkep kabuğu */
    this.renderer.toneMapping = THREE.NeutralToneMapping;
    this._envRT = makeEnv(this.renderer);
    this.scene.environment = this._envRT.texture;
    this.inkMat = makeInkMat();
    this.fxQuad = new THREE.PlaneGeometry(1, 1);
    this.model = null;
    this._own = null;
    this.scene.traverse((o) => { if (o.material && o.material.isMeshBasicMaterial) o.material.toneMapped = false; });
    this.chestGroup = null;
    this.lidPivot = null;
    this.runes = null;
    this.seal = null;
    this.treasure = null;
    this.sparkles = null;
    this.seamStrip = null;
    this.orbits = null;
    this.crownFloat = null;
    this.glowPulse = [];      // {mat, base, amp, sp, seed} → opacity nabzı
    this.emiPulse = [];       // {mat, base, amp, sp, seed} → emissive nabzı
    this._iris = null;        // mistik göz — hafif renk oynaması
    this._tex = [];
    this._C = null;
    this._t = 0;
    this._openPrev = 0;
    this.setSize(300, 300);
  }

  /** HD tuval: mantıksal ölçü aynı kalır, piksel yoğunluğu s katına çıkar. */
  _hd(w, h, s) {
    const cv = document.createElement('canvas');
    cv.width = w * s; cv.height = h * s;
    const g = cv.getContext('2d');
    g.scale(s, s);
    g.imageSmoothingEnabled = true;
    if ('imageSmoothingQuality' in g) g.imageSmoothingQuality = 'high';
    return { cv, g };
  }
  /** ortak doku bitişi: sRGB + mipmap + anizotropi (44° eğik bakış). */
  _fin(cv, repX, repY) {
    const tex = new THREE.CanvasTexture(cv);
    if ('colorSpace' in tex) tex.colorSpace = THREE.SRGBColorSpace;
    tex.generateMipmaps = true;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.anisotropy = Math.min(8, this.renderer.capabilities.getMaxAnisotropy());
    if (repX) { tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(repX, repY || 1); }
    return tex;
  }

  /** zemin büyü çemberi: çift halka + çentikler + rün glifleri */
  _runeTex() {
    const { cv, g } = this._hd(256, 256, 2);
    g.translate(128, 128);
    g.strokeStyle = '#ffffff';
    g.lineWidth = 4;
    g.beginPath(); g.arc(0, 0, 112, 0, 6.283); g.stroke();
    g.lineWidth = 1.8;
    g.beginPath(); g.arc(0, 0, 86, 0, 6.283); g.stroke();
    for (let i = 0; i < 48; i++) {
      g.save(); g.rotate((i / 48) * 6.283);
      g.lineWidth = 2;
      g.beginPath(); g.moveTo(0, -86); g.lineTo(0, i % 4 === 0 ? -77 : -82); g.stroke();
      g.restore();
    }
    for (let i = 0; i < 16; i++) {
      g.save(); g.rotate((i / 16) * 6.283); g.translate(0, -99);
      g.lineWidth = 2.6;
      const s = (k) => ((i * 37 + k * 17) % 11) - 5;
      g.beginPath();
      g.moveTo(s(0), -6); g.lineTo(s(1), 0); g.lineTo(s(2), 6);
      if (i % 3 === 0) { g.moveTo(-4, s(3) * 0.6); g.lineTo(4, s(4) * 0.6); }
      g.stroke();
      g.restore();
    }
    return this._fin(cv);
  }

  /**
   * Huzme dokusu: dikey parlaklık çarpı yatay yumuşama. Önemli olan şu —
   * dokunun DÖRT KENARI da alfa 0'a iner, böylece huzmenin nerede bittiği
   * asla bir çizgi olarak görünmez.
   */
  _beamTex() {
    const cv = document.createElement('canvas');
    cv.width = 128; cv.height = 256;
    const g = cv.getContext('2d');
    const v = g.createLinearGradient(0, 256, 0, 0);
    /* TABAN DOLU başlar: huzmenin dibi kapak aralığına YAPIŞIK olmalı.
       Önceki sürüm tabanda 0 alfa ile başlıyordu → en parlak yer ağızın
       ~20px üstünde kalıyor, arada karanlık bir kopukluk oluşuyordu. */
    v.addColorStop(0, 'rgba(255,255,255,0.8)');
    v.addColorStop(0.03, 'rgba(255,255,255,0.62)');
    v.addColorStop(0.26, 'rgba(255,255,255,0.4)');
    v.addColorStop(0.58, 'rgba(255,255,255,0.16)');
    v.addColorStop(0.84, 'rgba(255,255,255,0.04)');
    v.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = v; g.fillRect(0, 0, 128, 256);
    /* yatay kesit: GENİŞ PLATO + kenarlarda yumuşak iniş. Tek tepe noktalı
       profil, genişliğin yalnız üçte birini görünür bırakıp huzmeyi ince bir
       lazere çeviriyordu; plato sandık genişliğinde yumuşak bir dökülme verir. */
    g.globalCompositeOperation = 'destination-in';
    const h = g.createLinearGradient(0, 0, 128, 0);
    const prof = [[0, 0], [0.1, 0.16], [0.2, 0.52], [0.3, 0.86], [0.5, 1], [0.7, 0.86], [0.8, 0.52], [0.9, 0.16], [1, 0]];
    for (const [s, a] of prof) h.addColorStop(s, 'rgba(0,0,0,' + a + ')');
    g.fillStyle = h; g.fillRect(0, 0, 128, 256);
    return new THREE.CanvasTexture(cv);
  }

  /**
   * AĞIZ dokusu — sandığın İÇİ. Kamera 14° yükseklikte durduğu için
   * gerçek oyuk geometrisinden görünecek olan şey ince bir dilimdir;
   * bu dilimi boyalı tek dörtgenle vermek hem aynı görünür hem de tek
   * çizim çağrısı (mobil fillrate bütçesi — bkz. CLAUDE.md).
   * İçerik: koyu iç duvarlar, arka duvarda ışık sıçraması, dipte sıcak havuz.
   */
  _mouthTex() {
    const { cv, g } = this._hd(128, 128, 2);
    /* iç duvar: kenarlarda neredeyse siyah, merkeze doğru sıcak kahve */
    const wall = g.createRadialGradient(64, 74, 6, 64, 64, 66);
    wall.addColorStop(0, '#4a2c10');
    wall.addColorStop(0.45, '#20120a');
    wall.addColorStop(1, '#07050a');
    g.fillStyle = wall; g.fillRect(0, 0, 128, 128);
    /* arka duvara (dokunun üst kenarı) vuran ışık sıçraması */
    const bounce = g.createLinearGradient(0, 0, 0, 58);
    bounce.addColorStop(0, 'rgba(255,196,110,0.34)');
    bounce.addColorStop(1, 'rgba(255,196,110,0)');
    g.fillStyle = bounce; g.fillRect(0, 0, 128, 58);
    /* dipte sıcak hazine havuzu */
    const pool = g.createRadialGradient(64, 70, 2, 64, 70, 44);
    pool.addColorStop(0, 'rgba(255,238,190,0.85)');
    pool.addColorStop(0.35, 'rgba(255,190,96,0.35)');
    pool.addColorStop(1, 'rgba(255,170,70,0)');
    g.fillStyle = pool; g.fillRect(0, 0, 128, 128);
    /* kenarları yumuşat: dörtgenin sınırı asla düz bir çizgi olarak okunmasın */
    g.globalCompositeOperation = 'destination-in';
    const soft = g.createRadialGradient(64, 64, 30, 64, 64, 64);
    soft.addColorStop(0, 'rgba(0,0,0,1)');
    soft.addColorStop(0.78, 'rgba(0,0,0,0.92)');
    soft.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = soft; g.fillRect(0, 0, 128, 128);
    const tex = new THREE.CanvasTexture(cv);
    if ('colorSpace' in tex) tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  _radialTex() {
    const cv = document.createElement('canvas');
    cv.width = cv.height = 128;
    const g = cv.getContext('2d');
    const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    grad.addColorStop(0, 'rgba(255,255,255,0.9)');
    grad.addColorStop(0.4, 'rgba(255,255,255,0.3)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grad; g.fillRect(0, 0, 128, 128);
    return new THREE.CanvasTexture(cv);
  }

  /** 4 uçlu yıldız parıltısı — "ışıltı" hissinin kalbi */
  _starTex() {
    const { cv, g } = this._hd(128, 128, 2);
    const grad = g.createRadialGradient(64, 64, 0, 64, 64, 30);
    grad.addColorStop(0, 'rgba(255,255,255,0.95)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grad; g.fillRect(0, 0, 128, 128);
    g.fillStyle = 'rgba(255,255,255,0.95)';
    const arm = (rot, len, wid) => {
      g.save(); g.translate(64, 64); g.rotate(rot);
      g.beginPath();
      g.moveTo(0, -len); g.quadraticCurveTo(wid, 0, 0, len); g.quadraticCurveTo(-wid, 0, 0, -len);
      g.fill(); g.restore();
    };
    arm(0, 58, 7); arm(Math.PI / 2, 58, 7);
    arm(Math.PI / 4, 26, 4); arm(-Math.PI / 4, 26, 4);
    return new THREE.CanvasTexture(cv);
  }

  setSize(w, h) {
    this.renderer.setSize(w, h, false);
    const aspect = w / Math.max(1, h);
    this.camera.aspect = aspect;
    const FIT_H = 100, FIT_W = 90;
    const t = Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2));
    const dist = Math.max(FIT_H / (2 * t), FIT_W / (2 * t * aspect));
    this.camera.position.set(0, dist * CAM_DIR.y, dist * CAM_DIR.z);
    this.camera.lookAt(0, 25, 0);
    this.camera.updateProjectionMatrix();
  }

  setChest(C) {
    this._C = C;
    if (this.chestGroup) this.scene.remove(this.chestGroup);
    if (this.model) { this.model.dispose(); this.model = null; }
    if (this._own) { for (const o of this._own) { o.geometry.dispose(); o.material.dispose(); } }
    this._own = [];
    for (const t of this._tex) t.dispose();
    this._tex = [];
    this.glowPulse = []; this.emiPulse = [];
    this.orbits = null; this.crownFloat = null; this._iris = null; this.runes = null; this.seal = null;
    this._hoverAmp = 0;

    const tier = C.tier || 1;
    const glowCol = new THREE.Color(CHEST_GLOW(tier)).getHex();
    const model = this.model = buildChestModel(this.renderer, C, this.inkMat, { glowTex: this.glowTex, quad: this.fxQuad });
    const g = model.group;
    const MY = CHEST_DIM.mouthY;
    const own = (m) => { this._own.push(m); return m; };

    /* ═ SANDIĞIN İÇİ ═ derin ağız: içe dönük bilezik + tabanda boyalı ışık havuzu */
    const mouthT = this._mouthTex(); this._tex.push(mouthT);
    const mouthDark = own(new THREE.Mesh(new THREE.PlaneGeometry(39, 28),
      new THREE.MeshBasicMaterial({ map: mouthT, transparent: true, opacity: 0, depthWrite: false, toneMapped: false })));
    mouthDark.rotation.x = -Math.PI / 2;
    mouthDark.position.set(0, MY - 5.8, 0);
    g.add(mouthDark);
    this._mouthDark = mouthDark;
    const collar = own(new THREE.Mesh(new THREE.BoxGeometry(40.4, 6, 29.6),
      new THREE.MeshStandardMaterial({ color: 0x0b0810, roughness: 0.92, metalness: 0, side: THREE.BackSide, emissive: glowCol, emissiveIntensity: 0.14 })));
    collar.position.set(0, MY - 3, 0);
    collar.visible = false;
    g.add(collar);
    this._mouthCollar = collar;
    const mouthGlow = own(new THREE.Mesh(new THREE.PlaneGeometry(66, 48),
      new THREE.MeshBasicMaterial({ map: this.glowTex, color: glowCol, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false })));
    mouthGlow.rotation.x = -Math.PI / 2;
    mouthGlow.position.set(0, MY + 0.5, 0);
    g.add(mouthGlow);
    this._mouthGlow = mouthGlow;

    /* hazine parıltısı: kapak açılınca ağızdan süzülen zerreler */
    const treasureGlow = new THREE.Group();
    const treasureMotes = [];
    for (let i = 0; i < 22; i++) {
      const star = i % 3 === 0;
      const m = own(new THREE.Mesh(new THREE.PlaneGeometry(star ? 4.6 : 3.2, star ? 4.6 : 3.2),
        new THREE.MeshBasicMaterial({ map: star ? this.starTexM : this.glowTex, color: glowCol, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false })));
      m.userData = { seed: Math.random() * 6.283, sp: 7 + Math.random() * 7, r: 1.5 + Math.random() * (BW * 0.3), y: Math.random() * 38, drift: (Math.random() - 0.5) * 1.1, spin: Math.random() * 6.283 };
      treasureGlow.add(m);
      treasureMotes.push(m);
    }
    g.add(treasureGlow);
    this.treasure = treasureGlow;
    this._treasureMotes = treasureMotes;

    /* derz ışığı: kapak aralığı */
    const seam = own(new THREE.Mesh(new THREE.BoxGeometry(45, 0.9, 34.4),
      new THREE.MeshBasicMaterial({ color: glowCol, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false })));
    seam.position.y = MY + 0.35;
    g.add(seam);
    this.seamStrip = seam;

    /* ışıldama: göz kırpan yıldız çakımları (kademeyle artar) */
    const sparkleN = [4, 4, 6, 8, 10, 12, 14, 16][tier] || 8;
    const sparkles = new THREE.Group();
    for (let i = 0; i < sparkleN; i++) {
      const c = tier <= 2 ? 0xffffff : (i % 2 ? 0xffffff : glowCol);
      const sp = own(new THREE.Mesh(new THREE.PlaneGeometry(8, 8),
        new THREE.MeshBasicMaterial({ map: this.starTexM, color: c, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false })));
      sp.userData.seed = Math.random() * 6.283;
      sp.userData.px = (Math.random() - 0.5) * 76;
      sp.userData.py = 6 + Math.random() * 48;
      sp.userData.pz = 22 + Math.random() * 7;
      sparkles.add(sp);
    }
    g.add(sparkles);
    this.sparkles = sparkles;

    /* kilit arkası hale (glifte ışıma kilidin ARKASINDA çizilir) */
    const halo = own(new THREE.Mesh(new THREE.PlaneGeometry(1, 1),
      new THREE.MeshBasicMaterial({ map: this.glowTex, color: glowCol, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false })));
    halo.position.copy(model.haloPos);
    halo.scale.setScalar(model.haloR);
    g.add(halo);
    this.sealHalo = halo;
    this._haloR = model.haloR;

    this.lidPivot = model.lidPivot;
    this.chestGroup = g;
    this.scene.add(g);
    this.inner.position.set(0, MY - 4, 4);

    this.rim.color.set(glowCol).lerp(new THREE.Color(0xffffff), 0.55);
    this.glowMat.color.set(glowCol);
    this.beamMat.color.set(tier >= 4 ? glowCol : 0xffe6ac);
    this.beamRootMat.color.set(tier >= 4 ? glowCol : 0xffe6ac);
    this._glowCol = glowCol;
    this.runeMat.color.set(glowCol);
    this._runeBase = [0, 0.15, 0.22, 0.3, 0.42, 0.52, 0.62, 0.66][tier] || 0.3;
    this._runeScale = tier >= 6 ? 1.24 : (tier >= 4 ? 1.12 : 1);
    this._moteN = [0, 5, 7, 9, 11, 14, 18, 18][tier] || 8;
    for (const m of this.motes) m.material.color.set(tier <= 2 ? 0xfff0c8 : glowCol);
    this._bodyH = MY;
    this._openPrev = 0;
    for (const s of this.sparks) { s.life = 0; s.m.visible = false; }
    try { this.renderer.compile(this.scene, this.camera); } catch (e) { /* ilk karede derlenir */ }
  }

  _spawnSpark() {
    for (const s of this.sparks) {
      if (s.life > 0) continue;
      const a = Math.random() * 6.283;
      s.life = s.max = 0.7 + Math.random() * 0.7;
      s.m.position.set((Math.random() - 0.5) * BW * 0.6, BH + 4, (Math.random() - 0.5) * 8);
      s.vx = Math.cos(a) * (14 + Math.random() * 30);
      s.vz = Math.sin(a) * (8 + Math.random() * 14);
      s.vy = 70 + Math.random() * 90;
      s.m.material.color.set(Math.random() < 0.55 ? 0xffe08a : this._glowCol);
      const sc = 0.5 + Math.random() * 0.9;
      s.m.scale.setScalar(sc);
      s.m.visible = true;
      return;
    }
  }

  renderFrame(p) {
    if (!this.chestGroup) return;
    const dt = p.dt || 0.016;
    this._t += dt;
    const g = this.chestGroup;
    g.position.set(p.shakeX || 0, p.posY || 0, 0);
    g.rotation.z = p.rotZ || 0;
    g.rotation.y = Math.sin(this._t * 0.6) * 0.045;
    g.scale.set(p.scaleX || 1, p.scaleY || 1, p.scaleZ || 1);
    if (this._hoverAmp) g.position.y += 5 + Math.sin(this._t * 1.4) * this._hoverAmp;

    const open = p.open || 0;
    if (this.lidPivot) this.lidPivot.rotation.x = (open <= 0 ? 0 : easeOutBack(Math.min(1, open))) * -1.85;   // v7: ön kenar YUKARI-geri (eski +1,85 kapağı gövdeye gömüyordu)

    const leak = Math.max(open, (p.seam || 0) * 0.5);
    if (this.model) this.model.anim(this._t, leak);
    this.inner.intensity = leak * 7.5;
    this.glowMat.opacity = 0.1 + leak * 0.5;
    this.groundGlow.scale.setScalar(0.75 + leak * 0.55);
    /* huzme: ağızdan çıkar, açılışla birlikte hızla yükselip genişler.
       Kapak döndükçe sandığın kendi ölçeğini de miras alır. */
    const bo = Math.max(0, Math.min(1, (open - 0.05) / 0.75));
    const flick = 1 + Math.sin(this._t * 7.3) * 0.05 + Math.sin(this._t * 3.1) * 0.04;
    this.beamMat.opacity = bo * 0.21 * flick;
    const bw = BW * (0.78 + bo * 0.6) * (p.scaleX || 1);
    const my = (p.posY || 0) + (BH + 2.4) * (p.scaleY || 1);
    this.beam.scale.set(bw, (34 + bo * 132) * (p.scaleY || 1), bw);
    this.beam.position.set((p.shakeX || 0), my, 0);
    /* huzme kökü: ağızdan biraz yükseklikte, kameraya dönük */
    this.beamRootMat.opacity = bo * 0.5 * flick;
    this.beamRoot.scale.set(bw * 1.05, bw * 0.62, 1);
    this.beamRoot.position.set((p.shakeX || 0), my + bw * 0.14, 1.5);
    this.beamRoot.quaternion.copy(this.camera.quaternion);
    if (this._mouthDark) {
      const mk = Math.min(1, Math.max(0, (open - 0.03) * 4));
      this._mouthDark.visible = mk > 0.01;
      this._mouthDark.material.opacity = mk;
      this._mouthGlow.visible = mk > 0.01;
      this._mouthGlow.material.opacity = mk * (0.5 + Math.sin(this._t * 4.6) * 0.09);
      this._mouthGlow.scale.setScalar(0.85 + mk * 0.3 + Math.sin(this._t * 2.7) * 0.05);
      if (this._mouthCollar) {
        this._mouthCollar.visible = mk > 0.05;
        this._mouthCollar.material.emissiveIntensity = 0.1 + mk * 0.3;
      }
    }
    if (this.seamStrip) {
      this.seamStrip.material.opacity = Math.max(0, leak - open * 0.8) * 0.9 + (p.seam || 0) * 0.25;
      this.seamStrip.visible = open < 0.5;
    }

    /* işleme/oyma ışıma nabızları */
    for (const pu of this.glowPulse) {
      pu.mat.opacity = Math.max(0, pu.base + Math.sin(this._t * pu.sp + pu.seed) * pu.amp + leak * 0.25);
    }
    for (const pu of this.emiPulse) {
      pu.mat.emissiveIntensity = pu.base + Math.sin(this._t * pu.sp + pu.seed) * pu.amp + leak * 0.5;
    }

    /* mistik: yörünge halkaları + süzülen taç + iris renk oynaması */
    if (this.orbits) {
      for (const og of this.orbits) {
        og.rotation.y += dt * 0.45 * og.userData.dir;
        for (const ch of og.children) {
          if (ch.userData.billboard) ch.quaternion.copy(this.camera.quaternion);
        }
      }
    }
    if (this.crownFloat) {
      this.crownFloat.position.y = (this._crownBaseY || 20.9) + Math.sin(this._t * 1.4) * 1.7 + open * 8;
      this.crownFloat.rotation.y = this._t * 0.7;
    }
    if (this._iris) {
      const hue = 0.75 + Math.sin(this._t * 0.8) * 0.04;   // mor ↔ eflatun şerbeti
      this._iris.emissive.setHSL(hue, 0.9, 0.62);
    }

    /* açılış kıvılcım fıskiyesi */
    if (open > 0.1 && open < 0.92 && open > this._openPrev) {
      this._spawnSpark(); this._spawnSpark();
    }
    this._openPrev = open;
    for (const s of this.sparks) {
      if (s.life <= 0) continue;
      s.life -= dt;
      if (s.life <= 0) { s.m.visible = false; continue; }
      s.vy -= 200 * dt;
      s.m.position.x += s.vx * dt;
      s.m.position.y += s.vy * dt;
      s.m.position.z += s.vz * dt;
      s.m.material.opacity = Math.min(1, s.life / (s.max * 0.55));
      s.m.quaternion.copy(this.camera.quaternion);
    }

    if (this.seal) {
      this.seal.rotation.y = this._t * 1.0;
      this.seal.material.emissiveIntensity = 1.5 + Math.sin(this._t * 3.4) * 0.55;
    }
    if (this.sealHalo) {
      const hk = 0.85 + Math.sin(this._t * 3.4) * 0.15;
      this.sealHalo.scale.setScalar((this._haloR || 16) * hk * (1 + leak * 0.5));
      this.sealHalo.material.opacity = (0.4 + Math.sin(this._t * 3.4) * 0.15) * (1 - open);
      if (this.orbits) this.sealHalo.rotation.z = this._t * 0.4;   // mistik güneş halosu döner
    }
    if (this._treasureMotes) {
      const active = open > 0.06;
      const baseY = BH + 2.6;      // tam ağız düzlemi
      const SPAN = 38;
      for (const m of this._treasureMotes) {
        const u = m.userData;
        if (active) {
          u.y += dt * u.sp;
          if (u.y > SPAN) u.y -= SPAN;
          const f = u.y / SPAN;
          /* alt uçta hızla parla, tepeye doğru yavaşça sön → üst sınır yok */
          const k = Math.min(1, f * 7) * Math.pow(1 - f, 1.5);
          const spread = 0.22 + f * 1.15;
          const a = u.seed + f * u.drift;
          m.position.set(Math.cos(a) * u.r * spread, baseY + u.y, Math.sin(a) * u.r * spread * 0.55);
          m.material.opacity = Math.min(1, open * 1.6) * k * 0.9;
          m.scale.setScalar(0.45 + k * 0.85);
          m.quaternion.copy(this.camera.quaternion);
          m.rotation.z = u.spin + this._t * 0.5;
        } else {
          m.material.opacity = 0;
        }
      }
    }
    if (this.runes) {
      const R = 38 + open * 14;
      for (const st of this.runes.children) {
        const a = st.userData.a0 + this._t * 0.7;
        st.position.set(Math.cos(a) * R, 18 + Math.sin(this._t * 1.6 + st.userData.a0 * 3) * 5 + open * 16, Math.sin(a) * R * 0.6);
        st.rotation.y = this._t * 2 + st.userData.a0;
      }
    }
    if (this.sparkles) {
      for (const sp of this.sparkles.children) {
        const k = Math.max(0, Math.sin(this._t * 1.6 + sp.userData.seed * 4));
        const s = 0.25 + Math.pow(k, 3) * 1.5;
        sp.scale.setScalar(s);
        sp.material.opacity = 0.25 + Math.pow(k, 3) * 0.75;
        sp.position.set(sp.userData.px, sp.userData.py, sp.userData.pz);
        sp.rotation.z = sp.userData.seed + this._t * 0.3;
        sp.quaternion.copy(this.camera.quaternion);
      }
    }

    /* rün halkası: iniş sonrası belirir, ağır ağır döner, açılışta güçlenir */
    const landK = Math.max(0, 1 - (p.posY || 0) / 34);
    this.runeRing.rotation.z += dt * (0.22 + open * 0.5);
    this.runeMat.opacity = landK * (this._runeBase || 0.25) * (0.75 + Math.sin(this._t * 1.8) * 0.25 + leak * 0.9);
    this.runeRing.scale.setScalar((this._runeScale || 1) * (1 + open * 0.14));
    for (let i = 0; i < this.motes.length; i++) {
      const m = this.motes[i];
      if (i >= (this._moteN || 8)) { m.visible = false; continue; }
      m.visible = true;
      const u = m.userData;
      u.y += u.sp * dt * (1 + open * 2);
      if (u.y > 72) u.y = 0;
      u.a += dt * 0.12;
      m.position.set(Math.cos(u.a) * u.r, 2 + u.y, Math.sin(u.a) * u.r * 0.7);
      const tw = 0.5 + Math.sin(this._t * 2.6 + u.seed) * 0.5;
      m.material.opacity = landK * (0.14 + tw * 0.4);
      m.scale.setScalar(0.7 + tw * 0.7);
      m.quaternion.copy(this.camera.quaternion);
    }

    /* shadowK (v52, isteğe bağlı): alttan yükselişte gölge/halka sandıkla birlikte belirir */
    const sk = p.shadowK == null ? 1 : p.shadowK;
    if (sk < 1) this.runeMat.opacity *= sk;
    this.shadow.scale.setScalar((p.scaleX || 1) * (1 - Math.max(0, p.posY || 0) / 400) * (0.6 + 0.4 * sk));
    this.shadow.material.opacity = 0.42 * Math.max(0.2, 1 - Math.max(0, p.posY || 0) / 160) * sk;

    this.renderer.render(this.scene, this.camera);
  }

  clear() { this.renderer.clear(); }

  _dispose(root) {
    root.traverse((o) => {
      if (o.isMesh) {
        o.geometry.dispose();
        if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => m.dispose());
      }
    });
  }

  dispose() {
    if (this.model) this.model.dispose();
    if (this._own) for (const o of this._own) { o.geometry.dispose(); o.material.dispose(); }
    if (this._envRT) this._envRT.dispose();
    this.inkMat.dispose(); this.fxQuad.dispose();
    this.renderer.dispose();
  }
}
