/* ═══════════════════════════════════════════════════════════
   fieldChest3d.js — SAHA SANDIĞININ GÖRÜNÜŞÜ (v49)

   Mağazanın 3B GÜMÜŞ sandığı (chestModel3d tier 2) sahaya iner. Model BİR
   KEZ kurulur; sahadaki her sandık onun klonudur (geometri + materyal
   PAYLAŞILIR — ek GPU belleği yok, klon başına yalnız dönüşüm). Ekran
   dışındaki klon three.js'in kendi kesmesiyle çizilmez: haritada 3 sandık
   var ama görüş alanında çoğunlukla ≤ 1.

   Işık: sahnenin ışıkları + mağazanın stüdyo çevre haritası (makeEnv) —
   metalin glifteki dikey gradyanı çevre haritasından doğar (v46 dersi).
   Oyun ton eşlemesiz çizdiği için çevre yoğunluğu ×0,72 kısılır (mağaza
   NeutralToneMapping ile parlaklığı zaten sıkıştırıyordu).

   Durumlar fieldChest.js'ten okunur (st · t · wake); burada yalnız çizim:
   bekleyen sandığın üstünde gümüş IŞIK SÜTUNU (uzaktan bulunur), yaklaşınca
   kapak kıpırdar, açılışta kapak yaylı açılır + sütun parlar, sonra toprağa
   gömülür.
   ═══════════════════════════════════════════════════════════ */

import * as THREE from 'three';
import { buildChestModel, makeEnv, makeInkMat } from './chestModel3d.js?v=20260930m';

const S = 1.24;            // glif birimi → dünya (kapak ~57 birim, kahraman 91)
const MAXV = 3;
const LID_OPEN = -1.85;    // v46: ön kenar yukarı (−)

function canvasTex(w, h, paint) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  paint(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
const easeBack = (u) => { const c1 = 1.9, c3 = c1 + 1; return 1 + c3 * Math.pow(u - 1, 3) + c1 * Math.pow(u - 1, 2); };

export class FieldChestView {
  constructor(r3) {
    this.r3 = r3;
    this.ready = false;
    this.slots = [];
    this.root = new THREE.Group();
    this.root.visible = false;
    r3.scene.add(this.root);
  }

  _build() {
    const R = this.r3.renderer;
    this.env = makeEnv(R);
    this.ink = makeInkMat();
    this.glowTex = canvasTex(64, 64, (g, w) => {
      const gr = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
      gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.45, 'rgba(255,255,255,0.42)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gr; g.fillRect(0, 0, w, w);
    });
    this.beamTex = canvasTex(32, 128, (g, w, h) => {
      for (let x = 0; x < w; x++) {
        const k = 1 - Math.abs((x + 0.5) / w * 2 - 1);
        const gr = g.createLinearGradient(0, h, 0, 0);
        gr.addColorStop(0, 'rgba(255,255,255,' + (k * k).toFixed(3) + ')');
        gr.addColorStop(0.35, 'rgba(255,255,255,' + (k * k * 0.5).toFixed(3) + ')');
        gr.addColorStop(1, 'rgba(255,255,255,0)');
        g.fillStyle = gr; g.fillRect(x, 0, 1, h);
      }
    });
    this.quad = new THREE.PlaneGeometry(1, 1);
    const m = this.model = buildChestModel(R, { tier: 2 }, this.ink, { glowTex: this.glowTex, quad: this.quad });
    m.lidPivot.name = 'khLid';
    m.group.traverse((o) => {
      const mt = o.material;
      if (mt && mt.isMeshStandardMaterial) { mt.envMap = this.env.texture; mt.envMapIntensity *= 0.72; mt.needsUpdate = true; }
    });
    const beamGeo = new THREE.PlaneGeometry(1, 1).translate(0, 0.5, 0);
    const flat = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
    this._geos = [beamGeo, flat];
    for (let i = 0; i < MAXV; i++) {
      const g = i ? m.group.clone(true) : m.group;
      g.scale.setScalar(S);
      const beamM = new THREE.MeshBasicMaterial({ map: this.beamTex, color: 0xe6eeff, transparent: true, opacity: 0.4, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
      const beam = new THREE.Mesh(beamGeo, beamM);
      beam.scale.set(46, 250, 1);
      beam.renderOrder = 4;
      const haloM = new THREE.MeshBasicMaterial({ map: this.glowTex, color: 0xcfdcff, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
      const halo = new THREE.Mesh(flat, haloM);
      halo.scale.set(150, 1, 110);
      halo.position.y = 1.2;
      halo.renderOrder = 2;
      const shM = new THREE.MeshBasicMaterial({ map: this.glowTex, color: 0x000000, transparent: true, opacity: 0.55, depthWrite: false });
      const sh = new THREE.Mesh(flat, shM);
      sh.scale.set(78, 1, 52);
      sh.position.set(3, 0.8, 4);
      sh.renderOrder = 1;
      const holder = new THREE.Group();
      holder.add(sh, halo, g, beam);
      holder.visible = false;
      this.root.add(holder);
      this.slots.push({ holder, g, lid: g.getObjectByName('khLid'), beam, halo, sh });
    }
    this.ready = true;
  }

  /** Görev yüklemesinde (perde arkası) kur + derle: ilk sandık karesi takılmasın. */
  prewarm() {
    try {
      if (!this.ready) this._build();
      this.root.visible = true;
      for (const s of this.slots) { s.holder.visible = true; s.holder.position.set(0, -4000, 0); }
      this.r3.renderer.compile(this.root, this.r3.camera);
      for (const s of this.slots) s.holder.visible = false;
      this.root.visible = false;
    } catch (e) { console.error('[fieldChest3d] ısıtma atlandı:', e); }
  }

  update(game) {
    const F = game.fieldChests;
    const L = F ? F.list : null;
    let any = false;
    if (L) for (const c of L) if (c.st >= 0) { any = true; break; }
    if (!any) { this.root.visible = false; return; }
    if (!this.ready) this._build();
    this.root.visible = true;
    const t = (this.r3._clock || 0) / 1000;
    let leak = 0;
    for (let i = 0; i < this.slots.length; i++) {
      const s = this.slots[i], c = L[i];
      if (!c || c.st < 0) { s.holder.visible = false; continue; }
      s.holder.visible = true;
      s.holder.position.set(c.x, 0, c.y);
      let lid = 0, sy = 1, sxz = 1, dy = 0, beam = 0.34 + Math.sin(t * 2.4 + c.seed) * 0.12, halo = 0.46 + Math.sin(t * 3.1 + c.seed) * 0.1;
      if (c.st === 0) {
        const w = c.wake;
        const j = Math.sin(t * 17 + c.seed);
        lid = -w * 0.12 * (0.5 + 0.5 * j);
        sy = 1 + w * 0.035 * j;
        beam += w * 0.25; halo += w * 0.3;
      } else if (c.st === 1) {
        const u = Math.min(1, c.t / 0.34);
        lid = LID_OPEN * easeBack(u);
        const p = Math.sin(u * Math.PI);
        sy = 1 + p * 0.12; sxz = 1 + p * 0.06;
        beam = 0.4 + u * 1.1; halo = 0.6 + u * 0.9; leak = Math.max(leak, u);
      } else if (c.st === 2) {
        const u = Math.min(1, c.t / 1.7);
        lid = LID_OPEN + Math.sin(c.t * 9) * 0.04 * (1 - u);
        beam = 1.5 * (1 - u) * (1 - u); halo = 1.5 * (1 - u); leak = Math.max(leak, 1 - u);
      } else {
        const u = Math.min(1, c.t / 0.5);
        lid = LID_OPEN;
        dy = -u * u * 26; sxz = sy = 1 - u * 0.35;
        beam = 0; halo = 0.3 * (1 - u);
      }
      s.lid.rotation.x = lid;
      s.g.scale.set(S * sxz, S * sy, S * sxz);
      s.g.position.y = dy;
      s.g.rotation.y = Math.sin(t * 0.5 + c.seed) * 0.05;
      s.beam.material.opacity = Math.max(0, beam);
      s.beam.visible = beam > 0.01;
      s.beam.scale.set(46 + (c.st === 1 ? 30 : 0), 250 + (c.st === 1 ? 90 : 0), 1);
      s.halo.material.opacity = Math.max(0, halo);
      s.sh.material.opacity = 0.55 * (c.st === 3 ? 1 - Math.min(1, c.t / 0.5) : 1);
    }
    /* paylaşılan materyal nabzı (kilit ışığı · gümüş parıltı taraması) */
    this.model.anim(t, leak);
  }
}
