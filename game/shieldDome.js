/* ═══════════════════════════════════════════════════════════
   shieldDome.js — KURTARMA GÖREVİNİN KALKAN KUBBESİ (v43, 2026-09-24)

   Kullanıcı: "kurtarma görevlerindeki yuvarlak beyaz kalkanın detayları,
   kalitesi çok daha iyi olmalı; şu an çok basit duruyor."

   TEŞHİS: tek renk, tek opaklık, 18×10 yarım küre + ince bir halka.
   Additive + düz 0,20 opaklık ortasını açık zemin üstünde BEYAZ bir
   lekeye çeviriyordu; kenarı ortasından parlak değildi (cam kubbeyi cam
   yapan tek ipucu budur) ve kubbeyi ÜRETEN hiçbir şey sahnede yoktu.

   YENİ KATMANLAR (hepsi tek grupta, hepsi pişirmede kurulur):
   ① PANEL KAFES — ikosfer (ayrıntı 4) üst yarısı; her üçgen ağırlık
     merkezine %13 çekilir, aradaki boşluk kafes çizgisi OKUNUR. Renk
     köşe başına: fresnel (sabit kamera yönüne göre) → orta saydam, kenar
     parlak; tabana yakın bant parlak; arka yüz panelleri %40.
     Her karede: tabandan tepeye kayan TARAMA bandı + panel başına seyrek
     parıltı. (240 panel · 720 köşe, tahsis yok.)
   ② PERDE — pürüzsüz iç kabuk, yalnız kenar ışığı: siluete yumuşak hale.
   ③ ZEMİN — ışık havuzu diski + dönen RÜN HALKASI (tek kez çizilen tuval)
     + taban çemberi.
   ④ YAYICI KAİDELER — dört taş/gümüş/altın kaide, aralarında ışıklı
     kristal (propModels.shieldBaseGeometry, engel materyali).
   ⑤ TEPE MÜCEVHERİ — süzülür, döner: uzaktan "hedef burada".
   KIRILMA: paneller kendi normalleri boyunca SAÇILIR (ağırlıkla düşer,
   küçülür, söner), halka genişler, kaideler toprağa GÖMÜLÜR.

   PERF SÖZLEŞMESİ: sıcak döngüde tahsis yok; köşe güncellemesi yalnız
   kubbe görünürken; malzemeler render3d'nin ısıtma kapsamında (grup
   domeMesh olarak ısıtılır, bütün çocuklar görünür).
   ═══════════════════════════════════════════════════════════ */
import * as THREE from 'three';
import { shieldBaseGeometry, shieldGemGeometry, SHIELD_R, GEM_Y } from './propModels.js?v=20260930m';

const R = SHIELD_R;
const SQ = 0.84;                     // kubbe basıklığı (yükseklik / yarıçap)
const INSET = 0.87;                  // panel boyu (1 − kafes boşluğu)
/* Kameraya bakış yönü: render3d TILT 44° (kamera +y +z tarafında) */
const VY = 0.719, VZ = 0.695;
/* #8fdcff — EKRAN uzayında. ÖLÇÜLEN KUSUR: additive harmanlama, çıkış
   sRGB'ye KODLANDIKTAN SONRA toplar; lineer yazılan 0,015'lik bir panel
   ekrana 0,10 olarak düşüyor ve dört katman (ön panel · arka panel ·
   perde · zemin) üst üste binince kubbenin içi yine DOLU camgöbeği
   okunuyordu — tam da kullanıcının "beyaz yuvarlak kalkan"ı. Yoğunluk
   artık ekranda istenen değer olarak yazılır ve köşeye lin() ile girer:
   her katmanın ekrana eklediği miktar = yazılan sayı. */
const CR = 0.56, CG = 0.86, CB = 1.0;
const lin = (v) => (v >= 1 ? 1 : v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));

function runeTexture() {
  const S = 512, c = document.createElement('canvas');
  c.width = c.height = S;
  const g = c.getContext('2d');
  const O = 1.13, K = (S / 2) / O, cx = S / 2;
  const circ = (r, w, a) => {
    g.strokeStyle = 'rgba(255,255,255,' + a + ')'; g.lineWidth = w;
    g.beginPath(); g.arc(cx, cx, r * K, 0, Math.PI * 2); g.stroke();
  };
  circ(0.945, 5, 0.18); circ(0.945, 1.6, 0.9);
  circ(1.115, 4, 0.14); circ(1.115, 1.2, 0.7);
  /* rün: bant içinde 40 glif, her biri 2-3 çizgi (tekrarsız sözde yazı) */
  const N = 40;
  let seed = 7;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI * 2;
    g.save();
    g.translate(cx + Math.cos(a) * 1.03 * K, cx + Math.sin(a) * 1.03 * K);
    g.rotate(a + Math.PI / 2);
    const h = 0.062 * K, w = 0.036 * K;
    const strokes = [[0, -h, 0, h]];
    const kind = (rnd() * 5) | 0;
    if (kind === 0) strokes.push([0, -h * 0.2, w, -h]);
    else if (kind === 1) strokes.push([-w, -h, w, -h * 0.1]);
    else if (kind === 2) { strokes.push([0, 0, w, h]); strokes.push([0, 0, -w, h]); }
    else if (kind === 3) strokes.push([-w, -h * 0.4, w, -h * 0.4]);
    else { strokes.push([0, -h, w, -h * 0.4]); strokes.push([w, -h * 0.4, 0, h * 0.2]); }
    for (const pass of [[4.2, 0.16], [1.5, 0.95]]) {
      g.strokeStyle = 'rgba(255,255,255,' + pass[1] + ')';
      g.lineWidth = pass[0]; g.lineCap = 'round';
      for (const st of strokes) { g.beginPath(); g.moveTo(st[0], st[1]); g.lineTo(st[2], st[3]); g.stroke(); }
    }
    g.restore();
    if (i % 5 === 0) {                 // dört yönde elmas işaret
      g.fillStyle = 'rgba(255,255,255,0.9)';
      g.save(); g.translate(cx + Math.cos(a) * 1.115 * K, cx + Math.sin(a) * 1.115 * K); g.rotate(a);
      g.beginPath(); g.moveTo(-5, 0); g.lineTo(0, -4); g.lineTo(5, 0); g.lineTo(0, 4); g.closePath(); g.fill();
      g.restore();
    }
  }
  const t = new THREE.CanvasTexture(c);
  if ('colorSpace' in t) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

export class ShieldDome {
  constructor(propMat) {
    const G = this.group = new THREE.Group();
    G.visible = false;
    const addMat = (o) => new THREE.MeshBasicMaterial(Object.assign({
      transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
    }, o));
    this.shellMat = addMat({ vertexColors: true, side: THREE.DoubleSide });
    this.veilMat = addMat({ vertexColors: true, side: THREE.FrontSide });
    this.runeMat = addMat({ map: runeTexture(), color: 0xbfeaff, opacity: 0.85 });
    this.ringMat = addMat({ color: 0xbfeaff, opacity: 0.9 });

    this._buildShell();
    this.shell = this._mesh(this.shellGeo, this.shellMat, 7);

    /* ② perde: yalnız kenar ışığı */
    const vg = new THREE.SphereGeometry(1, 30, 10, 0, Math.PI * 2, 0, Math.PI / 2);
    this.veil = this._mesh(this._tint(vg, (x, y, z) => {
      const f = 1 - Math.abs(y * VY + z * VZ);
      return 0.3 * f * f * f;
    }), this.veilMat, 6);

    /* ③ zemin: ışık havuzu + rün halkası + çember */
    const dg = new THREE.CircleGeometry(1, 48);
    dg.rotateX(-Math.PI / 2);
    this.disk = this._mesh(this._tint(dg, (x, y, z) => {
      const r = Math.hypot(x, z);
      return 0.035 + 0.14 * r * r * r * r;
    }), this.veilMat, 5);
    this.disk.position.y = 1.2;
    const rg = new THREE.RingGeometry(0.93, 1.13, 80, 1);
    rg.rotateX(-Math.PI / 2);
    this.runes = this._mesh(rg, this.runeMat, 5);
    this.runes.position.y = 1.6;
    const tg = new THREE.TorusGeometry(1, 0.03, 6, 64);
    tg.rotateX(Math.PI / 2);
    this.ring = this._mesh(tg, this.ringMat, 6);
    this.ring.position.y = 2;

    /* ④ ⑤ opak parçalar engel materyalini paylaşır (yeni program yok) */
    this.base = this._mesh(shieldBaseGeometry(), propMat, 2);
    this.gem = this._mesh(shieldGemGeometry(), propMat, 2);
    this._gemY = R * SQ + 26 - GEM_Y;
  }

  _mesh(geo, mat, order) {
    const m = new THREE.Mesh(geo, mat);
    m.frustumCulled = false;
    m.renderOrder = order;
    this.group.add(m);
    return m;
  }

  /** köşe başına yoğunluk → camgöbeği renk özniteliği */
  _tint(geo, fn) {
    const p = geo.attributes.position.array, n = p.length / 3;
    const c = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const I = fn(p[i * 3], p[i * 3 + 1], p[i * 3 + 2]);
      c[i * 3] = lin(CR * I); c[i * 3 + 1] = lin(CG * I); c[i * 3 + 2] = lin(CB * I);
    }
    geo.setAttribute('color', new THREE.BufferAttribute(c, 3));
    return geo;
  }

  _buildShell() {
    const ico = new THREE.IcosahedronGeometry(1, 4);
    const src = ico.attributes.position.array;
    const keep = [];
    for (let i = 0; i < src.length; i += 9) {
      if ((src[i + 1] + src[i + 4] + src[i + 7]) / 3 > 0.02) keep.push(i);
    }
    const NP = keep.length, NV = NP * 3;
    this.nV = NV;
    this.base0 = new Float32Array(NV * 3);   // kırılmamış panel köşeleri (birim uzay)
    this.cent = new Float32Array(NP * 3);    // panel merkezi (= dışa yön)
    this.bl = new Float32Array(NV * 3);      // taban renk (lineer, pişmiş)
    this.bw = new Float32Array(NV);          // tarama/parıltı ağırlığı (ön 1 · arka 0,4)
    this.hy = new Float32Array(NV);          // normalize yükseklik
    this.ph = new Float32Array(NP);
    this.sp = new Float32Array(NP);
    let sd = 11;
    const rnd = () => { sd = (sd * 16807) % 2147483647; return sd / 2147483647; };
    for (let j = 0; j < NP; j++) {
      const i0 = keep[j];
      const cx = (src[i0] + src[i0 + 3] + src[i0 + 6]) / 3;
      const cy = (src[i0 + 1] + src[i0 + 4] + src[i0 + 7]) / 3;
      const cz = (src[i0 + 2] + src[i0 + 5] + src[i0 + 8]) / 3;
      const cl = Math.hypot(cx, cy, cz) || 1;
      this.cent[j * 3] = cx / cl; this.cent[j * 3 + 1] = cy / cl; this.cent[j * 3 + 2] = cz / cl;
      const front = (cy * VY + cz * VZ) >= 0;
      this.ph[j] = rnd() * 6.283;
      this.sp[j] = 0.55 + rnd() * 0.6;
      for (let k = 0; k < 3; k++) {
        const x = src[i0 + k * 3], y = src[i0 + k * 3 + 1], z = src[i0 + k * 3 + 2];
        let qx = cx + (x - cx) * INSET, qy = cy + (y - cy) * INSET, qz = cz + (z - cz) * INSET;
        if (qy < 0) qy = 0;
        const v = j * 3 + k;
        this.base0[v * 3] = qx; this.base0[v * 3 + 1] = qy; this.base0[v * 3 + 2] = qz;
        const f = 1 - Math.abs(y * VY + z * VZ);
        let I = 0.05 + 0.9 * Math.pow(f, 2.3) + 0.34 * Math.exp(-qy / 0.07);
        if (!front) I *= 0.4;
        this.bl[v * 3] = lin(CR * I); this.bl[v * 3 + 1] = lin(CG * I); this.bl[v * 3 + 2] = lin(CB * I);
        this.bw[v] = front ? 1 : 0.4;
        this.hy[v] = qy;
      }
    }
    ico.dispose();
    const g = new THREE.BufferGeometry();
    this.posAttr = new THREE.BufferAttribute(this.base0.slice(), 3);
    this.posAttr.setUsage(THREE.DynamicDrawUsage);
    this.colAttr = new THREE.BufferAttribute(new Float32Array(NV * 3), 3);
    this.colAttr.setUsage(THREE.DynamicDrawUsage);
    g.setAttribute('position', this.posAttr);
    g.setAttribute('color', this.colAttr);
    this.shellGeo = g;
    this._moved = false;
  }

  /** Her kare. shat: 0 sağlam → 1 tamamen kırıldı. */
  update(t, x, z, shat, show) {
    const G = this.group;
    if (!show || shat >= 0.999) {
      if (G.visible) G.visible = false;
      return;
    }
    G.visible = true;
    if (shat <= 0) G.position.set(x, 0, z);   // kırılırken parçalar yerinde kalır
    const fade = 1 - shat;
    const br = 1 + Math.sin(t * 1.7) * 0.012;
    this.shell.scale.set(R * br, R * SQ * br, R * br);
    const vr = R * 0.985 * br;
    this.veil.scale.set(vr, vr * SQ, vr);
    this.shellMat.opacity = fade;
    this.veilMat.opacity = fade;
    this.disk.scale.set(R, 1, R);
    this.runes.scale.set(R, 1, R);
    this.runes.rotation.y = t * 0.14;
    this.runeMat.opacity = 0.85 * fade;
    const rr = R * (1 + shat * 0.35);
    this.ring.scale.set(rr, rr, rr);
    this.ringMat.opacity = 0.9 * fade;
    this.base.position.y = -shat * 48;
    const gs = 1 - shat;
    this.gem.visible = gs > 0.05;
    this.gem.position.y = this._gemY + Math.sin(t * 2.1) * 3.5 + shat * 30;
    this.gem.rotation.y = t * 1.3;
    this.gem.scale.set(gs, gs, gs);
    this._panels(t, shat);
  }

  /* PANEL BAŞINA döngü: sin/parıltı panel başına bir kez, taban renk
     pişmiş (lineer) — ilk sürüm köşe başına 3 pow + 1 exp yapıyordu ve
     masaüstünde bile 0,6-2,9 ms ölçüldü (bütçe dışı). Eklenen ışık a²
     ile lineere çevrilir (γ≈2 yaklaşımı; ekranda fark yok, pow yok). */
  _panels(t, shat) {
    const NP = this.nV / 3, col = this.colAttr.array, bl = this.bl, bw = this.bw, hy = this.hy, ph = this.ph;
    const scan = ((t * 0.34) % 1.25) - 0.12;
    const fl = shat * 0.9;
    for (let p = 0; p < NP; p++) {
      const tw = 0.84 + 0.16 * Math.sin(t * 2.3 + ph[p]);
      let sp = Math.sin(t * 0.8 + ph[p] * 5.1);
      sp = sp > 0 ? sp * sp : 0; sp *= sp; sp *= sp; sp *= sp;   // ^16: seyrek parıltı
      for (let k = 0; k < 3; k++) {
        const v = p * 3 + k, i3 = v * 3;
        const dy = hy[v] - scan;
        let g = 1 - dy * dy * 40;
        g = g > 0 ? g * g : 0;
        const a = (g * 0.34 + sp * 0.42) * bw[v] + fl;
        const A = a * a;
        col[i3] = bl[i3] * tw + A * 0.62;
        col[i3 + 1] = bl[i3 + 1] * tw + A * 0.8;
        col[i3 + 2] = bl[i3 + 2] * tw + A;
      }
    }
    this.colAttr.needsUpdate = true;
    if (shat > 0) {
      const pos = this.posAttr.array, b0 = this.base0, ce = this.cent, sp2 = this.sp;
      const e = shat * (2 - shat), shrink = 1 - shat * 0.6, drop = shat * shat * 0.55;
      for (let p = 0; p < NP; p++) {
        const pb = p * 9;
        const cx = (b0[pb] + b0[pb + 3] + b0[pb + 6]) / 3;
        const cy = (b0[pb + 1] + b0[pb + 4] + b0[pb + 7]) / 3;
        const cz = (b0[pb + 2] + b0[pb + 5] + b0[pb + 8]) / 3;
        const kk = e * sp2[p] * 0.8;
        const ox = cx + ce[p * 3] * kk, oy = cy + ce[p * 3 + 1] * kk - drop, oz = cz + ce[p * 3 + 2] * kk;
        for (let j = pb; j < pb + 9; j += 3) {
          pos[j] = ox + (b0[j] - cx) * shrink;
          pos[j + 1] = oy + (b0[j + 1] - cy) * shrink;
          pos[j + 2] = oz + (b0[j + 2] - cz) * shrink;
        }
      }
      this.posAttr.needsUpdate = true;
      this._moved = true;
    } else if (this._moved) {
      this.posAttr.array.set(this.base0);
      this.posAttr.needsUpdate = true;
      this._moved = false;
    }
  }
}
