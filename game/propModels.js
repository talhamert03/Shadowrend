/* ═══════════════════════════════════════════════════════════
   propModels.js — HARİTA NESNELERİNİN GEOMETRİSİ

   NEDEN VAR: 2026-08-23'te bütün engeller tek bir `BoxGeometry`
   örneğiydi. Ölçümler yeşildi (tek çizim çağrısı, 208 örnek, bütçe
   içinde) ve sonuç YİNE amatör görünüyordu: mezar taşı, çit, lahit,
   mahzen — hepsi aynı dikdörtgen prizmaydı, oyuncu "şekilleri
   birleştirmişler" diye okuyordu. Ölçüm doğruydu, ÖLÇÜT yanlıştı.
   Bir engelin işi çarpışmak değil TANINMAKTIR.

   ── SÖZLEŞME ──────────────────────────────────────────────
   1. SİLUET İŞİ YAPAR. Her arketip kendi profiliyle tanınmak zorunda:
      mezar taşının kemerli tepesi, dikilitaşın piramidyonu, sandığın
      tonozlu kapağı, evin beşik çatısı. 44° tepeden bakıldığında
      okunan şey üst kenar çizgisidir — orası düz olamaz.

   2. IŞIK GEOMETRİYE PİŞER, SAHNEYE EKLENMEZ. Yeni ışık yasak
      (CLAUDE.md: mevcut 6 ışık üst sınır) ve Lambert bu sahnede
      yatay/düşey yüzleri aynı parlaklıkta veriyor (engeller PEMBE DÜZ
      okundu). Burada her köşeye yönlü bir difüz terim + zemine yakın
      temas karartması (AO) YAZILIR, materyal `MeshBasicMaterial`
      kalır. Silindirde bu terim yüzey boyunca sürekli değişir — asıl
      "kutu değil" hissi buradan gelir, poligon sayısından değil.

   3. ALBEDO DA VERTEX'TE. Fenerin demir gövdesi koyu, camı sıcak ve
      parlak; sandığın ahşabı kahve, kuşağı demir, kilidi altın —
      HEPSİ tek geometride, tek materyalde, tek çizim çağrısında.
      Bu yüzden `instanceColor` artık renk DEĞİL, yalnız vuruş
      parlamasının tonudur (normalde beyaz).

   4. DOKU NÖTR ÇARPANDIR. `map` ortalaması ≈ 1,0 olan gren dokusudur
      (bkz. render3d._propTexture); UV BASKIN NORMALE göre düzlemsel
      izdüşümle üretilir (üç düzlem, yüz başına biri), yani gren ölçeği
      bütün modellerde aynı, hiçbir modelde UV işi yok ve hiçbir yüzde
      doku UZAMAZ.

   5. ARKETİP BAŞINA B İ R InstancedMesh. Çizim çağrısı sayısı arketip
      sayısıdır (~17), örnek sayısı değil (208). Üçgen: ~31k — düşman
      kadrosu 118k, yani bütçe içinde. Kalabalık arketipler (çit, ağaç)
      bilerek en yalın modellerdir.

   6. GEOMETRİ GERÇEK DÜNYA ÖLÇÜSÜNDE YAZILIR, pivot tabanda (y=0
      zemindir). Örnek matrisi yalnız konum + dönüş taşır; ÖLÇEK YOK.
      Sebep: `PROP_TYPES.hx/hz` çarpışma yarı-genişliğidir ve modelin
      ayak izi ona EŞİT olmak zorunda (görsel = çarpışma kuralı). Ölçek
      çarpanı araya girerse ikisi sessizce ayrışır.
   ═══════════════════════════════════════════════════════════ */

import * as THREE from 'three';

/* Işık yönü: sol-üst-arka. Kızıl ayın geldiği yönle aynı, yani pişmiş
   gölge sahnenin atmosferiyle çelişmiyor. */
const LX = -0.42, LY = 0.80, LZ = -0.43;
const AMB = 0.36, DIF = 0.78;
/* Temas karartması: zeminden AO_H yükseğe kadar koyulaşma. Bir nesnenin
   yere BASTIĞI hissi neredeyse tamamen buradan gelir; olmadığında her
   şey zeminin üstünde yüzer gibi durur (sticker etkisi). */
const AO_H = 26, AO_MIN = 0.52;
/* Gren ölçeği: dünya birimi başına bir doku tekrarı = 1/UVK. BÜTÜN
   modellerde aynı, yani UV işi sıfır ve gren büyüklüğü nesne boyundan
   bağımsız (aynı taş ocağı hissi). */
const UVK = 58;
/* ── v43 PREMİUM PASO (2026-09-24) ─────────────────────────────
   Kullanıcı: "objelerin kalitesi çok kötü, premium yap". 1:1 teşhis: her
   kutu KESKİN kenarlı ve kenarın ışık aldığı hiçbir yer yok — 44°'den
   bakınca iki düz değer yan yana (üst açık, ön koyu) ve arada GEÇİŞ yok.
   El boyaması stilize oyunların "premium" okunan tek ortak ipucu PAH'tır:
   kenar ışığı yakalar, kütleyi ayırır, siluete yumuşaklık verir.
   ① Builder her U.box / U.boxC çağrısını GERÇEK ÖLÇÜDE pahlı kutuya çevirir
     (pah dünya biriminde: min boyutun %19'u, tavan 3,8) — kırk iki
     arketipin tek satırına dokunmadan.
   ② Pah yüzleri EDGE_K ile aydınlanır: gölgede kalan kenar bile en az
     EDGE_LO değerini alır, yani siluet çizgisi her yönde okunur.
   ③ Değer rampası nesnenin KENDİ boyuna göre: dip 0,94 → tepe 1,07
     (kural ③'ün geometri geneli hâli; ışıklı parça rampaya girmez).  */
const EDGE_K = 1.22, EDGE_LO = AMB + DIF * 0.52;
const RAMP_LO = 0.94, RAMP_HI = 1.07;
const TAU = Math.PI * 2;
const _DP = new THREE.Vector3(), _DQ = new THREE.Quaternion(), _DS = new THREE.Vector3();
const _DM = new THREE.Matrix4(), _ONE = new THREE.Vector3(1, 1, 1);

class Builder {
  constructor() {
    this.pos = [];
    this.nrm = [];
    this.col = [];
    this.uv = [];
    this.em = [];
  }

  /* KUTU → PAHLI KUTU. Ölçek matristen okunur ve pah GERÇEK ölçüde kurulur:
     birim kutuyu pahlayıp ölçeklemek 200×15×160'lık bir podyumda 32 birimlik
     yatay, 2,4 birimlik dikey pah verirdi (eğik rampa, pah değil). */
  add(geo, mtx, r, g, b, emissive) {
    if (geo === U.box || geo === U.boxC) {
      mtx.decompose(_DP, _DQ, _DS);
      const cb = chamferBox(_DS.x, _DS.y, _DS.z, geo === U.boxC);
      this.put(cb, _DM.compose(_DP, _DQ, _ONE), r, g, b, emissive);
      cb.dispose();
      return this;
    }
    return this.put(geo, mtx, r, g, b, emissive);
  }

  addc(geo, mtx, c, em) { return this.add(geo, mtx, c[0], c[1], c[2], em); }

  /* Alt-geometriyi dönüştürüp yığına ekler (pah dönüşümü YAPMAZ).
     UV: BASKIN NORMALE göre düzlemsel izdüşüm — yüz başına tek düzlem;
     eski (x+z, y) izdüşümü üst yüzlerde greni tek eksende sonsuza
     uzatıyordu ("taranmış çizgiler"), bkz. v25. */
  put(geo, mtx, r, g, b, emissive) {
    const gg = geo.index ? geo.toNonIndexed() : geo;
    const p = gg.attributes.position.array;
    const n = gg.attributes.normal.array;
    const ed = gg.attributes.edge ? gg.attributes.edge.array : null;
    const nm = new THREE.Matrix3().getNormalMatrix(mtx);
    const v = new THREE.Vector3(), nv = new THREE.Vector3();
    for (let i = 0; i < p.length; i += 3) {
      v.set(p[i], p[i + 1], p[i + 2]).applyMatrix4(mtx);
      nv.set(n[i], n[i + 1], n[i + 2]).applyMatrix3(nm).normalize();
      const d = nv.x * LX + nv.y * LY + nv.z * LZ;
      let sh = AMB + DIF * (d > 0 ? d : 0);
      /* alt yüzler ölmesin ama net koyu olsun */
      if (nv.y < -0.6) sh = 0.22;
      else if (ed && ed[i / 3] > 0.5 && nv.y > -0.3) sh = (sh > EDGE_LO ? sh : EDGE_LO) * EDGE_K;
      const ao = emissive ? 1 : AO_MIN + (1 - AO_MIN) * Math.min(1, v.y / AO_H);
      const k = emissive ? 1.0 : sh * ao;
      this.pos.push(v.x, v.y, v.z);
      this.nrm.push(nv.x, nv.y, nv.z);
      this.col.push(r * k, g * k, b * k);
      this.em.push(emissive ? 1 : 0);
      const anx = nv.x < 0 ? -nv.x : nv.x;
      const any = nv.y < 0 ? -nv.y : nv.y;
      const anz = nv.z < 0 ? -nv.z : nv.z;
      if (any >= anx && any >= anz) this.uv.push(v.x / UVK, v.z / UVK);
      else if (anx >= anz) this.uv.push(v.z / UVK, v.y / UVK);
      else this.uv.push(v.x / UVK, v.y / UVK);
    }
    if (gg !== geo) gg.dispose();
    return this;
  }

  geo() {
    const P = this.pos, Cc = this.col, Em = this.em;
    let top = 0;
    for (let i = 1; i < P.length; i += 3) if (P[i] > top) top = P[i];
    if (top > 6) {
      for (let q = 0, n = Em.length; q < n; q++) {
        if (Em[q]) continue;
        let h = P[q * 3 + 1] / top;
        h = h < 0 ? 0 : (h > 1 ? 1 : h);
        const k = RAMP_LO + (RAMP_HI - RAMP_LO) * h;
        Cc[q * 3] *= k; Cc[q * 3 + 1] *= k; Cc[q * 3 + 2] *= k;
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.nrm, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(Cc, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(this.uv, 2));
    g.computeBoundingSphere();
    return g;
  }
}

/* PAHLI KUTU — 6 yüz + 12 pah şeridi + 8 köşe üçgeni = 44 üçgen.
   Dışbükey ve merkezli olduğu için sarım yönü üçgenin kendi ağırlık
   merkezinden çözülür (elle sıra yazmak 26 yüzde bir hata demekti).
   Pah üçgenleri 'edge' özniteliği taşır: Builder onları kenar ışığıyla
   boyar. İnce parça (< 1,8 birim) pahlanmaz — 1 px'lik pah görünmez,
   yalnız üçgen harcar. */
function chamferBox(w, h, d, centered) {
  const m = Math.min(w, h, d);
  if (m < 1.8 || LITE) {
    const g = new THREE.BoxGeometry(w, h, d);
    if (!centered) g.translate(0, h / 2, 0);
    return g;
  }
  let c = m * 0.19;
  if (c > 3.8) c = 3.8;
  const a = w / 2, b = h / 2, e = d / 2;
  const P = [], E = [];
  const pt = (ax, sx, sy, sz) => (ax === 0 ? [sx * a, sy * (b - c), sz * (e - c)]
    : ax === 1 ? [sx * (a - c), sy * b, sz * (e - c)] : [sx * (a - c), sy * (b - c), sz * e]);
  const tri = (p0, q0, r0, edge) => {
    let q = q0, r = r0;
    const ux = q[0] - p0[0], uy = q[1] - p0[1], uz = q[2] - p0[2];
    const vx = r[0] - p0[0], vy = r[1] - p0[1], vz = r[2] - p0[2];
    const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    if (nx * (p0[0] + q[0] + r[0]) + ny * (p0[1] + q[1] + r[1]) + nz * (p0[2] + q[2] + r[2]) < 0) { const t = q; q = r; r = t; }
    P.push(p0[0], p0[1], p0[2], q[0], q[1], q[2], r[0], r[1], r[2]);
    E.push(edge, edge, edge);
  };
  const quad = (p0, p1, p2, p3, edge) => { tri(p0, p1, p2, edge); tri(p0, p2, p3, edge); };
  const S = [-1, 1];
  for (const q of S) {
    quad(pt(0, q, -1, -1), pt(0, q, 1, -1), pt(0, q, 1, 1), pt(0, q, -1, 1), 0);
    quad(pt(1, -1, q, -1), pt(1, 1, q, -1), pt(1, 1, q, 1), pt(1, -1, q, 1), 0);
    quad(pt(2, -1, -1, q), pt(2, 1, -1, q), pt(2, 1, 1, q), pt(2, -1, 1, q), 0);
  }
  for (const u of S) for (const v of S) {
    quad(pt(1, -1, u, v), pt(1, 1, u, v), pt(2, 1, u, v), pt(2, -1, u, v), 1);
    quad(pt(0, u, -1, v), pt(0, u, 1, v), pt(2, u, 1, v), pt(2, u, -1, v), 1);
    quad(pt(0, u, v, -1), pt(0, u, v, 1), pt(1, u, v, 1), pt(1, u, v, -1), 1);
    for (const q of S) tri(pt(0, u, v, q), pt(1, u, v, q), pt(2, u, v, q), 1);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
  g.setAttribute('edge', new THREE.Float32BufferAttribute(E, 1));
  if (!centered) g.translate(0, b, 0);
  g.computeVertexNormals();
  return g;
}

/* ── kısa yollar ───────────────────────────────────────────
   Hepsi tek bir paylaşılan birim geometriyi dönüştürerek ekler:
   pişirme anında (görev başına bir kez) çalışır, sıcak döngüde asla. */
const U = {
  box: new THREE.BoxGeometry(1, 1, 1),
  cyl6: new THREE.CylinderGeometry(1, 1, 1, 6, 1),
  cyl8: new THREE.CylinderGeometry(1, 1, 1, 8, 1),
  cyl12: new THREE.CylinderGeometry(1, 1, 1, 12, 1),
  sph: new THREE.SphereGeometry(1, 10, 7),
  cone6: new THREE.ConeGeometry(1, 1, 6, 1),
  cone4: new THREE.ConeGeometry(1, 1, 4, 1),
  cone8: new THREE.ConeGeometry(1, 1, 8, 1),
  /* MERKEZLİ varyantlar: pivot ORTADA. Eğik düzlemler (çatı eğimi) ve
     yatay silindirler (kemer, tonoz) için şart — taban-pivotlu bir kutuyu
     döndürmek onu kendi ekseni etrafında değil KENARI etrafında çevirir ve
     çatı yana kaçar (ilk sürümde ev ve şapelin çatısı tam bu yüzden eğrik
     bir paralelkenar gibi duruyordu). */
  boxC: new THREE.BoxGeometry(1, 1, 1),
  cylC12: new THREE.CylinderGeometry(1, 1, 1, 12, 1),
  sphLo: new THREE.SphereGeometry(1, 7, 5),
  /* v43: tonoz kapak (12 kenar kapakta fasetli okunuyordu) ve küçük
     yuvarlak ayrıntı (perçin, kemik topuzu, kor) için 36 üçgenlik küre */
  cylC16: new THREE.CylinderGeometry(1, 1, 1, 16, 1),
  sphT: new THREE.SphereGeometry(1, 6, 4),
};
U.box.translate(0, 0.5, 0);
U.cyl6.translate(0, 0.5, 0);
U.cyl8.translate(0, 0.5, 0);
U.cyl12.translate(0, 0.5, 0);
U.cone6.translate(0, 0.5, 0);
U.cone4.translate(0, 0.5, 0);
U.cone8.translate(0, 0.5, 0);

const M = new THREE.Matrix4();
const Q = new THREE.Quaternion();
const E = new THREE.Euler();
const V = new THREE.Vector3();
const S = new THREE.Vector3();

function xf(x, y, z, sx, sy, sz, rx, ry, rz) {
  /* Bu kapı bir kez ödendi: ev ve şapelin çatısı ON argümanla çağrılmış,
     eğim değeri listenin sonundan düşmüş ve rz sessizce 0 kalmıştı — çatı
     yatay bir levhaya dönüştü, konsolda hiçbir iz yok. JS fazla argümanı
     yutar; yutmasın. */
  if (arguments.length > 9) {
    throw new Error('xf(): 9 argüman bekleniyor, ' + arguments.length + ' geldi');
  }
  E.set(rx || 0, ry || 0, rz || 0);
  Q.setFromEuler(E);
  V.set(x, y, z);
  S.set(sx, sy, sz);
  return M.compose(V, Q, S);
}

/* ── ORGANİK BOZUNUM — "ŞEKİLLER YAPIŞTIRILMIŞ" HİSSİNİN İLACI ──
   TEŞHİS (2026-09-05, kullanıcı ekran görüntüsü — dikilitaş): bir koni bir
   kutunun üstünde durduğunda göz üç şeyi birden yakalar:
   (a) her iki parçanın da MAKİNE KUSURSUZ profili — düz kenar, tam simetri;
   (b) çap değişiminde kalan SERT ÇEMBER (uç uca gelen birleşim);
   (c) parça başına TEK düz değer, yani iki kütle arasında hiç geçiş yok.
   Doku çözünürlüğü, renk veya poligon SAYISI bunu düzeltmez — üçü de
   siluet ve birleşim sorunudur. ÜÇ KURAL:
   ① HİÇBİR PARÇANIN SİLUETİ BOZULMAMIŞ PRİMİTİF OLAMAZ (`organic`).
   ② BİRLEŞİM BİNDİRİLİR ve bir bilezik/kütle ile kapatılır; iki parça
     hiçbir yerde uç uca gelmez.
   ③ DEĞER YUKARIDAN AŞAĞI RAMPALANIR (tepe ışık alır, dip AO'ya girer).

   Bozunum açıya ve yüksekliğe bağlı İKİ SİNÜSTEN gelir: açısal frekans
   TAM SAYI olmak zorunda (0 ile 2π aynı değeri vermeli), yoksa dikişte
   yarık açılır. Yer değiştirme köşenin KENDİ konumundan hesaplandığı için
   `toNonIndexed` sonrası aynı yerdeki iki kopya AYNI ofseti alır — bu
   yüzden hiçbir üçgen kenarı ayrılmaz.

   MALİYET: pişirme anında (görev başına bir kez, palet başına) köşe başına
   ~10 çarpma. Üçgen sayısı, çizim çağrısı ve KARE maliyeti DEĞİŞMEZ.
   `computeVertexNormals` non-indexed ağda YÜZ normali verir, yani gölgeleme
   fasetli çıkar: yontulmuş taş / kalın çim dili tam olarak budur.        */
function organic(geo, o) {
  const g = geo.index ? geo.toNonIndexed() : geo.clone();
  const p = g.attributes.position.array;
  const amp = o.amp == null ? 0.10 : o.amp;
  const fa = o.fa == null ? 3 : o.fa;      // TAM SAYI
  const fh = o.fh == null ? 4.2 : o.fh;
  const s = o.seed || 0;
  const top = o.top == null ? 1 : o.top;
  const bx = o.bend || 0, bz = o.bendZ || 0;
  const flare = o.flare || 0;
  const ay = o.ampY || 0;
  for (let i = 0; i < p.length; i += 3) {
    const x = p[i], y = p[i + 1], z = p[i + 2];
    const hh = y / top;
    const h = hh < 0 ? 0 : (hh > 1 ? 1 : hh);
    const a = Math.atan2(z, x);
    const n = 0.62 * Math.sin(fa * a + fh * h + s) +
              0.38 * Math.sin((fa + 2) * a - fh * 0.7 * h + s * 1.7 + 1.1);
    let k = 1 + amp * n;
    if (flare) { const d = 1 - h; k += flare * d * d * d; }
    const t2 = h * h;
    p[i] = x * k + bx * t2 * top;
    p[i + 2] = z * k + bz * t2 * top;
    /* dip HALKASI hiç oynatılmaz: zemin teması bozulursa nesne yüzer */
    if (ay && h > 0.03) p[i + 1] = y + ay * n * top;
  }
  g.computeVertexNormals();
  return g;
}

/** organic + add + dispose. Geçici geometri GPU'ya hiç çıkmaz. */
function addO(B, geo, o, mtx, r, gg, b, em) {
  let src = geo, own = false, oo = o;
  /* kutu ise önce gerçek ölçüde pahla, SONRA yont: bozunum parametreleri
     birim uzaydan dünya ölçüsüne çevrilir (top = boy, bükülme oranı). */
  if (geo === U.box || geo === U.boxC) {
    mtx.decompose(_DP, _DQ, _DS);
    src = chamferBox(_DS.x, _DS.y, _DS.z, geo === U.boxC);
    own = true;
    const sy = _DS.y > 1e-6 ? _DS.y : 1;
    oo = Object.assign({}, o, {
      top: (o.top == null ? 1 : o.top) * sy,
      bend: (o.bend || 0) * _DS.x / sy, bendZ: (o.bendZ || 0) * _DS.z / sy,
    });
    mtx = _DM.compose(_DP, _DQ, _ONE);
  }
  const d = organic(src, oo);
  B.put(d, mtx, r, gg, b, em);
  d.dispose();
  if (own) src.dispose();
  return B;
}
function addOc(B, geo, o, mtx, c, em) { return addO(B, geo, o, mtx, c[0], c[1], c[2], em); }
const mul = (c, k) => [c[0] * k, c[1] * k, c[2] * k];
/** taban-pivotlu (kesik) koni; o verilirse yontulur */
function tcyl(B, rt, rb, h, seg, mtx, c, em, o) {
  const g = new THREE.CylinderGeometry(rt, rb, h, seg, 1).translate(0, h / 2, 0);
  if (o) addO(B, g, Object.assign({ top: h }, o), mtx, c[0], c[1], c[2], em);
  else B.addc(g, mtx, c, em);
  g.dispose();
  return B;
}
/** dönel profil [[yarıçap, y], …] dipten tepeye */
function lath(B, pts, seg, mtx, c, o, em) {
  const g = new THREE.LatheGeometry(pts.map((p) => new THREE.Vector2(p[0], p[1])), seg);
  let top = 0;
  for (const p of pts) if (p[1] > top) top = p[1];
  if (o) addO(B, g, Object.assign({ top: top || 1 }, o), mtx, c[0], c[1], c[2], em);
  else B.addc(g, mtx, c, em);
  g.dispose();
  return B;
}
/** profilin y yüksekliğindeki yarıçapı (kuşak/bant oturtmak için) */
function rAt(pts, y) {
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i];
    if (y <= b[1]) return a[0] + (b[0] - a[0]) * ((y - a[1]) / ((b[1] - a[1]) || 1));
  }
  return pts[pts.length - 1][0];
}

/** Bir parçanın UCU nerede biter (yerel öteleme). Dal uçlarına dalcık
    takılırken şarttır: ilk sürüm ucu `cos(ang)*len*0.6` ile TAHMİN ediyordu
    ve eğik dallarda dalcıklar havada asılı kalıyordu (ölçüldü, tezgahta
     görüldü). Dönüşün kendisi sorulur, yeniden türetilmez.
    xf() ile AYNI geçicileri kullanmaz — çağırı sırası güvenli. */
const _E2 = new THREE.Euler(), _Q2 = new THREE.Quaternion(), _V2 = new THREE.Vector3();
function tipOf(len, rx, ry, rz) {
  _Q2.setFromEuler(_E2.set(rx, ry, rz));
  return _V2.set(0, len, 0).applyQuaternion(_Q2);
}

/* ── HEX → LİNEER ÜÇLÜ ────────────────────────────────
   "HEPSİ AYNI SOLUK GRİ" ŞİKAYETİNİN ASIL KAYNAĞI BURADAYDI (2026-08-26).
   Önceki sürüm hex'i 255'e bölüp doğrudan vertex rengine yazıyordu. Ama
   renderer `outputColorSpace = SRGBColorSpace` ile çalışıyor ve three
   vertex renklerini LİNEER kabul eder: yazılan 0x6a7568 ekranda
   sRGB olarak KODLANIP çıkıyordu, yani parlaklık 112 → 177.

   İki sonucu vardı ve ikisi de tam olarak kullanıcının gördüğü şeydi:
   ① her şey PİŞMİŞİNDEN ÇOK DAHA PARLAK çıktı (zeminin 4,4 katı — hedef
     bant 2,0-2,8), yani nesneler zeminden kopup "soluk" okundu;
   ② sRGB kodlaması DÜŞÜK değerleri YÜKSEKLERDEN DAHA ÇOK kaldırdığı için
     kanallar arası fark ezildi: %39'luk bir değer farkı ekranda %16'ya,
     doygunluk üçte bire düştü. Yani PALET NE YAZILIRSA YAZILSIN ekranda
     grileşiyordu — on farklı palet yazmak tek başına bunu çözmezdi.

   Artık hex sRGB olarak ÇÖZÜLÜR (lineer iş uzayına girer), ışık çarpımı
   lineer uzayda olur (fiziksel olarak da doğrusu) ve çıkışta yeniden
   kodlanır: YAZILAN RENK EKRANDA GÖRÜLEN RENKTİR. Ölçüt de şu hale gelir —
   bir üst yüzün ekran parlaklığı ≈ yazılan hex'in parlaklığı (×0,99).  */
function rgb(hex) {
  return [srgbLin((hex >> 16) & 255), srgbLin((hex >> 8) & 255), srgbLin(hex & 255)];
}
function srgbLin(v) {
  const c = v / 255;
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

/* ── PALET: MALZEME HARİTANIN KENDİSİNDEN GELİR ────────────
   NEDEN DEĞİŞTİ (2026-08-26): palet TEK ve SABİTtı, yani on harita aynı
   granit-yeşili taşı, aynı sıcak kahve ahflabı, aynı mavi-gri demiri
   paylaşıyordu. Bir sütun buz gölünde ve tuz tabanında BİREBİR aynı
   renkti; 44°'den 30-90 px'e düşen bir nesnede gözün okuduğu ilk kanal
   RENKTİR, silueti değil. Kullanıcının teşhisi ("objeler birbirine
   benziyor ve hepsi aynı soluk gri") bu yüzden doğruydu: on ayrı yer
   değil, tek nesne setinin on kopyası vardı.

   Palet artık VERİ: her harita 19 malzeme yuvasını kendi hikayesiyle
   doldurur ve geometri o palete GÖRE pışer (bkz. propGeometries(palId)).
   Yuva ADI ANLAMDIR, rengi değil: `demir` yuvası kemik bahçesinde BOYNUZ,
   tuzlada PAS, gök çarkında PİRİNÇ'tir — aynı çit üç yerde üç farklı şey
   olur ve üçü de o yere ait okunur.

   ÜÇ KURAL:
   1. PARLAKLIK ÖLÇÜLÜR, SEÇİLMEZ — VE ÖLÇÜT ORAN DEĞİL FARKTIR. Bir üst
      yüz ekranda enc(lin(albedo) × 0,984) olarak çıkar, yani pratikte
      yazılan hex'in parlaklığı. Zemin ortalaması haritaya göre 21-49
      arası değiştiği için sabit bir ORAN dayatılamaz: kül çukurlarında
      (zemin 21,6) 2,4 katı taş 52 parlaklığına, yani okunmaz koyuya
      düşerdi. Gözün silueti ayırması FARKA bakar: `taş üst − zemin`
      45-95 bandında kalır (altında nesne zemine karışır, üstünde düşman
      siluetiyle ve kritik vuruşla yarışır) ve mutlak değer 80-126'da.
      Mermer/kemik yuvası 165'i GEÇEMEZ: 180-200 arası "beyaz kutu"dur
      (bir kez düşüldü, mahzen düşman siluetini eziyordu). Ölçüm:
      `_proptest.html`.
   2. "CANLI RENK" DEĞERİ DEĞİL KROMAYI BÜYÜTÜR. Nötr gri hiçbir
      haritada yok (doygunluk tabanı 0,10) ama üst sınır da var (0,45):
      üstünde malzeme "şeker" okunur — gökçe ada bir kez aştı (0,48).
   3. ÜÇ RENK HİÇ DEĞİŞMEZ (SHARED): altın (sandık ödülü), mor + koyu mor
      (görev yuvası). Bunlar malzeme değil İŞARETTİR; haritaya göre rengi
      kayan bir işaret öğrenilemez.
   4. İKİ HARİTA AYNI GÖRÜNMEZ: paylaşılan dört yuvanın (taş, ahşap,
      demir, kemik) ekran-renk uzaklığı on harita arasında en az 22
      olmalı — aynı fıçı iki yerde aynı fıçı olmasin.               */
const PAL_HEX = {
  /* MEZARLIK — granit + liken, kuru meşe, dövme demir, sıcak kandil */
  mezarlik: {
    tas: 0x63705f, tasKoyu: 0x414c40, tasSicak: 0x746c50, mermer: 0x959c8c,
    ahsap: 0x7c5433, ahsapKoyu: 0x503a26, demir: 0x424954, demirKoyu: 0x282e36,
    siva: 0x857d66, kiremit: 0x7e4030, yaprak: 0x445e34, yaprakKoyu: 0x2c3f23,
    kemik: 0x9d9f86, toprak: 0x584a38, cam: 0xffd9a0, camMavi: 0xa8e0ff,
  },
  /* KÜL ÇUKURLARI — ateşin kavurduğu yer: is, kömür, pas, fırın tuğlası.
     Soğuk ışık YOK: `camMavi` bile kor turuncusudur. */
  kul: {
    tas: 0x6a5d52, tasKoyu: 0x41382f, tasSicak: 0x7a6444, mermer: 0x998a76,
    ahsap: 0x54382a, ahsapKoyu: 0x2d1d10, demir: 0x5e4838, demirKoyu: 0x241a12,
    siva: 0x84725a, kiremit: 0x8f3f20, yaprak: 0x4a4426, yaprakKoyu: 0x2e2a17,
    kemik: 0xa1957e, toprak: 0x4a3a2a, cam: 0xffcf8a, camMavi: 0xff9a4a,
  },
  /* ZEHİR BATAKLIĞI — her şey ıslak: yosunlu taş, su çekmiş kereste,
     alg-siyahı demir. Saz YAŞIYOR (tek parlak yeşil), gaz alevi zehir. */
  bataklik: {
    /* KEMİK BURADA ISLAKTIR. İlk sürüm mezarlık kemiğiyle pratikte AYNI
       renkti (ekran uzaklığı 6,7) ve iki haritanın ayrımını 21,7'ye —
       eşiğin ALTINA — çekiyordu. Bu çift ayrıca dünya 1'i içeriyor, yani
       oyuncunun en çok gördüğü harita. Sazlıkta açıkta kalan kemik yosun
       tutar: daha yeşil ve daha koyu. Taş da bir tık yeşile çekildi. */
    tas: 0x4c6a56, tasKoyu: 0x2f3c36, tasSicak: 0x687050, mermer: 0x8b9a84,
    ahsap: 0x5c4a2c, ahsapKoyu: 0x2f2718, demir: 0x33443c, demirKoyu: 0x1b2620,
    siva: 0x7d7f62, kiremit: 0x6b4a30, yaprak: 0x527238, yaprakKoyu: 0x2f4a2a,
    kemik: 0x87996e, toprak: 0x43402c, cam: 0xffd9a0, camMavi: 0x9df0c0,
  },
  /* KAN KATEDRALİ — menekşe dönen bazalt, kararış bronz, fildişi mermer;
     tek sıcak aksan ÖKÜZ KANI (kumaş + tuğla), vitray gülü pembe-kızıl. */
  katedral: {
    tas: 0x655e78, tasKoyu: 0x3f3a4e, tasSicak: 0x74687a, mermer: 0x9d94a0,
    ahsap: 0x5c3a3c, ahsapKoyu: 0x382026, demir: 0x4a4152, demirKoyu: 0x231e2b,
    siva: 0x847a86, kiremit: 0x8e2438, yaprak: 0x3f4a3a, yaprakKoyu: 0x28301f,
    kemik: 0xa5988f, toprak: 0x483f46, cam: 0xffd0b0, camMavi: 0xc05a86,
  },
  /* HİÇLİK TAHTI — malzeme yok, oyulmuş BOŞLUK taşı: soğuk mavi-gri,
     gümüş, kemik-beyazı taht. Zemin en parlak harita (≈51) olduğu için
     ayrım DEĞERDEN değil İÇ KONTRASTTAN gelir: gölge neredeyse siyah. */
  hiclik: {
    tas: 0x656d85, tasKoyu: 0x343a48, tasSicak: 0x757c92, mermer: 0x949aa8,
    ahsap: 0x585260, ahsapKoyu: 0x34303a, demir: 0x8b93a4, demirKoyu: 0x474d5c,
    siva: 0x8d92a0, kiremit: 0x6e5a72, yaprak: 0x4a5158, yaprakKoyu: 0x2e343a,
    kemik: 0x999ba4, toprak: 0x434854, cam: 0xeae4ff, camMavi: 0xcfd4ff,
  },
  /* GÖKÇE ADA — on harita içinde TEK yaşayan yer: bal rengi kireç taşı,
     gerçek yeşil, bakır pası (verdigris), kiremit çatı. */
  gokada: {
    tas: 0x7d7550, tasKoyu: 0x4b4834, tasSicak: 0x847a52, mermer: 0x9c9a80,
    ahsap: 0x866540, ahsapKoyu: 0x503820, demir: 0x40706c, demirKoyu: 0x1f3d38,
    siva: 0x94886a, kiremit: 0xa05436, yaprak: 0x527e3c, yaprakKoyu: 0x33512a,
    kemik: 0xac9c74, toprak: 0x5c4c34, cam: 0xffdca4, camMavi: 0xa8e0ff,
  },
  /* TUZ TABANI — güneşte ağarmış: gümüş sürüklenmiş odun (açık ama
     kromasız), tuz demiri YER → `demir` yuvası PAS. Taş toz kaplı ve
     kabuktan KOYU: soluk zeminde silueti değer ayırır. */
  tuzla: {
    tas: 0x6b6752, tasKoyu: 0x453f2e, tasSicak: 0x7a7154, mermer: 0xa39d82,
    ahsap: 0x8a8272, ahsapKoyu: 0x585144, demir: 0x8a4a2c, demirKoyu: 0x492716,
    siva: 0xa09880, kiremit: 0x94502e, yaprak: 0x6a6a44, yaprakKoyu: 0x474828,
    kemik: 0xa9a488, toprak: 0x6a6250, cam: 0xffd9a0, camMavi: 0xd8f0d8,
  },
  /* DONMUŞ GÖL — koyu ıslak kereste + arduvaz; TEK parlak şey buzdur.
     Köy kandili sıcak kalır: mavinin içinde kıymetli olan o. */
  buzul: {
    tas: 0x546872, tasKoyu: 0x31404a, tasSicak: 0x627078, mermer: 0x8c9ea6,
    ahsap: 0x584534, ahsapKoyu: 0x32261c, demir: 0x6d7d8c, demirKoyu: 0x2d3842,
    siva: 0x7e8890, kiremit: 0x6d4535, yaprak: 0x35513f, yaprakKoyu: 0x22362a,
    kemik: 0x979fa2, toprak: 0x454749, cam: 0xffd2a0, camMavi: 0xb8ecff,
  },
  /* KEMİK BAHÇESİ — her şey kemik ya da kurumuş kan. `demir` yuvası
     BOYNUZ. Taş bilerek en koyu (82): kemik üzerinde parlayan tek
     malzeme olmalı, yoksa kemik zemine karışır. */
  kemikbahce: {
    tas: 0x5b5142, tasKoyu: 0x393127, tasSicak: 0x6a5c44, mermer: 0xa39d85,
    ahsap: 0x685036, ahsapKoyu: 0x3d2e1c, demir: 0x7a6a4e, demirKoyu: 0x423624,
    siva: 0x9a8f72, kiremit: 0x7e3b2c, yaprak: 0x5a5a34, yaprakKoyu: 0x3a3a20,
    kemik: 0xa7a084, toprak: 0x4c4030, cam: 0xffe2a0, camMavi: 0xffd08a,
  },
  /* GÖK ÇARKI — mekanizma: PİRİNÇ baskın, verdigris "bitki", soluk
     mermer kadran. Zemin en karanlık harita (≈31) → palet açılabilir. */
  gokcark: {
    tas: 0x6c6e80, tasKoyu: 0x454856, tasSicak: 0x7a7884, mermer: 0x979aa9,
    ahsap: 0x685340, ahsapKoyu: 0x3c2f24, demir: 0x8a7440, demirKoyu: 0x483b1f,
    siva: 0x8a8894, kiremit: 0x7a5a3a, yaprak: 0x3f6a5a, yaprakKoyu: 0x27443a,
    kemik: 0x9d9c92, toprak: 0x484654, cam: 0xffdca0, camMavi: 0xcbb6ff,
  },
};

/* İŞARET RENKLERİ — haritadan BAĞIMSIZ (kural 3) */
const SHARED_HEX = { altin: 0xe8b04a, mor: 0xb98cff, morKoyu: 0x5c3590 };

export const PROP_PAL_IDS = Object.keys(PAL_HEX);
export const PROP_PAL_HEX = PAL_HEX;

const PALETTES = {};
for (const id in PAL_HEX) {
  const src = PAL_HEX[id], p = {};
  for (const k in src) p[k] = rgb(src[k]);
  for (const k in SHARED_HEX) p[k] = rgb(SHARED_HEX[k]);
  PALETTES[id] = p;
}

/* Arketipler bunu OKUR. `let` şart: pişirme anında değişir, sonrasında
   hiç okunmaz (geometri artık pişmiştir) — yani sıcak döngüde yok. */
let C = PALETTES.mezarlik;
/* v43: pişirilen haritanın kimliği. Ortak arketiplerin (fener, küp) BİÇİMİ
   de haritaya göre değişir: kül çukurunda fener bir MANGAL, katedralde bir
   ŞAMDAN, kemik bahçesinde BOYNUZ fener. Yerleşim kodu tek satır
   değişmedi — "uygun obje" kararı bir yerde, pişirmede verilir. */
let PID = 'mezarlik';
/* KAR: 0xd8f0fb (buz dikeninin parlak ucu) fıçı kapağında düz BEYAZ DİSK
   okundu — üst yüz 165 tavanını aşıyordu (kural ①). Kar de bir malzemedir. */
const SNOW = rgb(0x96aab6);

/* ═══════════════ ARKETİPLER ═══════════════════════════════
   Her fonksiyon Builder'a çizer. Ayak izi PROP_TYPES.hx/hz ile birebir.
   ═════════════════════════════════════════════════════════ */





/* KÜP / F IÇI — lathe profili. Dönel bir gövde kutudan en net ayrılan
   biçimdir; kırılınca ödül veren nesnenin fark edilmesi gerekiyor.
   PROFİL DÜZ OMUZLU: ilk sürüm sin() eğrisi kullandı ve kahverengi bir
   KÜREYE dönüştü — fıçı hissi karnın şişkinliğinden değil DİK yan
   duvarları + belirgin AGIZ KUŞAĞINDAN gelir. */
function kupa(B) { return (KUPA_STYLE[PID] || kupaFici)(B); }
/* HARİTAYA GÖRE KIRILABİLİR KAP — hepsi 18 yarıçaplı ayak izinde, hepsi
   kırılınca yakut döker. Her haritada aynı fıçı durması "tek nesne setinin
   on kopyası" kusurunun (2026-08-26) son kalıntısıydı. */
const KUPA_STYLE = {
  kul: kupaKomur, katedral: kupaUrne, hiclik: kupaVazo, gokada: kupaAmfora,
  tuzla: kupaCuval, kemikbahce: kupaKavanoz, gokcark: kupaKapsul,
};
/* FIÇI gövdesi: 14 tahtalı (fa 14) şişkin profil, çember oturtulmuş kenar,
   çukur kapak + kapak tahtası derzleri; çemberler profilden ÖLÇÜLEREK oturur. */
function fici(B, H) {
  const a = C.ahsap, k = C.ahsapKoyu, d = C.demirKoyu;
  const side = [[14, 0], [15.6, 1.4], [17.2, H * 0.25], [17.8, H * 0.5], [17.2, H * 0.75], [15.6, H - 1.4], [14.8, H]];
  lath(B, [[0, 0]].concat(side, [[13.2, H], [13, H - 1.8], [0, H - 1.8]]), 14,
    xf(0, 0, 0, 1, 1, 1, 0, 0.1, 0), a, { amp: 0.035, fa: 14, fh: 0.8, seed: 1.7 });
  const hy = H > 30 ? [0.12, 0.34, 0.66, 0.88] : [0.2, 0.8];
  for (const f of hy) {
    const y = H * f, r = rAt(side, y) + 0.9;
    B.addc(U.cylC16, xf(0, y, 0, r, 2.6, r, 0, 0, 0), d);
  }
  for (const x of [-4.4, 4.4]) B.addc(U.box, xf(x, H - 1.9, 0, 0.9, 0.5, 25, 0, 0, 0), mul(k, 0.55));
  return side;
}
function kupaFici(B) {
  const H = 40;
  fici(B, H);
  B.addc(U.cylC12, xf(0, H * 0.5, 17.9, 2.2, 1.6, 2.2, Math.PI / 2, 0, 0), C.ahsapKoyu);
  if (PID === 'bataklik') addOc(B, U.cylC16, { amp: 0.2, fa: 5, seed: 3.3 }, xf(0, 2.4, 0, 16.4, 5, 16.4, 0, 0, 0), C.yaprakKoyu);
  if (PID === 'buzul') {
    const sn = SNOW;
    addOc(B, U.cylC16, { amp: 0.05, fa: 3, seed: 5.1 }, xf(0, H - 0.6, 0, 14.2, 2.4, 14.2, 0, 0, 0), sn);
    for (let i = 0; i < 4; i++) {
      const a = i * 1.6 + 0.5;
      B.addc(U.cone4, xf(Math.cos(a) * 15, H - 1, Math.sin(a) * 15, 1, 4 + (i % 2) * 2, 1, Math.PI, 0, 0), sn);
    }
  }
  return B;
}
/* KÖMÜR KÜFESİ (kül): alçak fıçı + kömür yığını + sönmemiş korlar */
function kupaKomur(B) {
  const H = 22;
  fici(B, H);
  const co = rgb(0x1f1a16), kor = C.camMavi, al = C.cam;
  addOc(B, U.sphLo, { amp: 0.22, fa: 3, seed: 2.2 }, xf(0, H - 1, 0, 13.4, 8, 13.4, 0, 0, 0), co);
  for (let i = 0; i < 5; i++) {
    const a = i * 1.37 + 0.3, r = 3 + (i % 3) * 3.4;
    addOc(B, U.sphT, { amp: 0.3, fa: 2, seed: i }, xf(Math.cos(a) * r, H + 4.2 - r * 0.25, Math.sin(a) * r, 3.6, 2.6, 3.2, 0, a, 0), mul(co, 1.5));
  }
  for (let i = 0; i < 4; i++) {
    const a = i * 1.9 + 1.1, r = 2 + i * 2.2;
    B.addc(U.sphT, xf(Math.cos(a) * r, H + 4.8 - r * 0.2, Math.sin(a) * r, 1.8, 1.2, 1.8, 0, 0, 0), i % 2 ? kor : al, true);
  }
  return B;
}
/* KUTSAL EMANET KÜPÜ (katedral): fildişi mermer, öküz kanı bant, kulplar */
function kupaUrne(B) {
  const m = C.mermer, k = C.tasKoyu, r = C.kiremit, b = C.demir;
  addOc(B, U.cyl8, { amp: 0.04, fa: 3, seed: 0.5 }, xf(0, 0, 0, 11.5, 3, 11.5, 0, 0.2, 0), k);
  const P = [[0, 0], [9, 0], [9.6, 2.2], [6.8, 4.8], [7.2, 8], [12.2, 13], [14.8, 19.5], [14, 25.5], [10, 29.5], [8.2, 31], [9.6, 32.6], [8.6, 33.6], [0, 34]];
  lath(B, P, 14, xf(0, 3, 0, 1, 1, 1, 0, 0, 0), mul(m, 0.9), { amp: 0.018, fa: 3, seed: 1.9 });
  B.addc(U.cylC16, xf(0, 22.5, 0, 15.3, 2.2, 15.3, 0, 0, 0), r);
  for (const q of [-1, 1]) {
    const tg = new THREE.TorusGeometry(4.4, 1.25, 5, 10);
    B.addc(tg, xf(q * 13.6, 29.5, 0, 1, 1, 1, 0, 0, 0), mul(m, 0.78));
    tg.dispose();
  }
  B.addc(U.sphT, xf(0, 38.4, 0, 3, 3.2, 3, 0, 0, 0), b);
  return B;
}
/* HİÇLİK VAZOSU: obsidyen, gümüş bantlar, ağzında soluk ışık */
function kupaVazo(B) {
  const k = C.tasKoyu, sv = C.demir, cam = C.cam;
  addOc(B, U.box, { amp: 0.04, fa: 2, seed: 0.5 }, xf(0, 0, 0, 22, 4, 22, 0, 0.3, 0), k);
  const P = [[0, 0], [7.4, 0], [7.8, 2], [5.6, 4], [8.6, 10], [12.4, 18], [11.2, 26], [6.6, 31.4], [5.8, 34.4], [7.6, 36], [6.8, 37], [0, 37.2]];
  lath(B, P, 12, xf(0, 4, 0, 1, 1, 1, 0, 0, 0), mul(k, 1.3), { amp: 0.02, fa: 4, seed: 2.6 });
  B.addc(U.cylC16, xf(0, 22, 0, 12.9, 1.8, 12.9, 0, 0, 0), sv);
  B.addc(U.cylC16, xf(0, 13.5, 0, 8.9, 1.2, 8.9, 0, 0, 0), sv);
  B.addc(U.cylC12, xf(0, 40.6, 0, 5.4, 1, 5.4, 0, 0, 0), cam, true);
  return B;
}
/* AMFORA (gökçe ada): toprağa gömülü pişmiş kil küp + küçük çömlek */
function kupaAmfora(B) {
  const r = C.kiremit, t = C.toprak;
  addOc(B, U.cone8, { amp: 0.2, fa: 3, seed: 0.4, flare: 0.2 }, xf(0, 0, 0, 12, 5, 12, 0, 0, 0), t);
  const P = [[0, 0], [2.6, 0], [4.4, 3], [9.4, 9], [13, 16.5], [12.6, 23.5], [8.4, 29.6], [4.6, 32.6], [4.2, 37.4], [5.6, 38.8], [4.8, 39.8], [0, 40]];
  lath(B, P, 14, xf(0, 1, 0, 1, 1, 1, 0, 0, 0), r, { amp: 0.02, fa: 3, seed: 3.3 });
  for (const q of [-1, 1]) {
    const tg = new THREE.TorusGeometry(4.2, 1.2, 5, 10, Math.PI);
    B.addc(tg, xf(q * 5.8, 33, 0, 1, 1, 1, 0, 0, -q * Math.PI / 2), mul(r, 0.9));
    tg.dispose();
  }
  B.addc(U.cylC16, xf(0, 17.5, 0, 13.4, 1.6, 13.4, 0, 0, 0), mul(r, 0.62));
  lath(B, [[0, 0], [4.6, 0], [7.2, 3.6], [7, 7.6], [5, 10], [5.6, 11], [0, 11]], 12, xf(11.5, 0, 9.5, 1, 1, 1, 0, 0, 0), mul(r, 0.82));
  return B;
}
/* TUZ ÇUVALI (tuzla): bağlı çuval + yatık ikinci çuval + dökülmüş tuz */
function kupaCuval(B) {
  const sv = C.siva, k = C.ahsapKoyu, salt = C.kemik;
  addOc(B, U.sph, { amp: 0.1, fa: 3, fh: 2, seed: 1.2 }, xf(1, 12, 1, 14.5, 12.5, 13, 0, 0.4, 0), sv);
  tcyl(B, 4.6, 7.4, 8, 7, xf(1, 21.5, 1, 1, 1, 1, 0, 0, 0.05), mul(sv, 0.95), false, { amp: 0.12, fa: 3, seed: 2 });
  B.addc(U.cylC12, xf(1.3, 26.5, 1, 5, 2.2, 5, 0, 0, 0.05), k);
  addOc(B, U.cone6, { amp: 0.3, fa: 3, seed: 3 }, xf(1.5, 27, 1, 5.6, 6, 5.6, 0, 0, 0.1), mul(sv, 1.05));
  addOc(B, U.sph, { amp: 0.12, fa: 3, fh: 2, seed: 4.4 }, xf(-8, 8.5, -9, 11.5, 8.5, 9.5, 0.1, 0.9, 0.25), mul(sv, 0.9));
  addOc(B, U.sphLo, { amp: 0.25, fa: 3, seed: 5.5 }, xf(10, 0.6, 10, 9, 2.4, 7, 0, 0.3, 0), salt);
  return B;
}
/* KEMİK KAVANOZ (kemik bahçesi): bantlı kemik küp, kubbe kapak, boynuz tepelik */
function kupaKavanoz(B) {
  const k = C.kemik, d = C.tasKoyu, h = C.demir;
  const P = [[0, 0], [9, 0], [10.2, 2], [11.8, 8], [12.4, 16], [11.2, 22.4], [9.2, 25], [9.8, 26.6], [0, 27]];
  lath(B, P, 14, xf(0, 0, 0, 1, 1, 1, 0, 0, 0), k, { amp: 0.03, fa: 5, seed: 1.1 });
  const side = P.slice(1);
  for (const y of [5.5, 19.5]) {
    const r = rAt(side, y) + 0.6;
    B.addc(U.cylC16, xf(0, y, 0, r, 2, r, 0, 0, 0), mul(d, 0.9));
  }
  lath(B, [[10, 0], [9.2, 2.4], [6.4, 5.4], [2.6, 7], [0, 7.4]], 14, xf(0, 26.6, 0, 1, 1, 1, 0, 0, 0), mul(k, 0.92));
  tcyl(B, 0.5, 2.4, 8, 6, xf(0, 33, 0, 1, 1, 1, 0, 0, 0.3), h, false, { amp: 0.05, fa: 2, seed: 2, bend: -0.2 });
  return B;
}
/* PİRİNÇ KAPSÜL (gök çarkı): perçin kuşaklı silindir, kubbe kapak, vana
   çarkı ve ışıklı gösterge */
function kupaKapsul(B) {
  const b = C.demir, bk = C.demirKoyu, gl = C.camMavi;
  tcyl(B, 13, 13.4, 26, 14, xf(0, 0, 0, 1, 1, 1, 0, 0, 0), b);
  for (const y of [2.4, 13, 23.6]) B.addc(U.cylC16, xf(0, y, 0, 14, 2.6, 14, 0, 0, 0), bk);
  lath(B, [[13, 0], [12.2, 3], [9.4, 6], [4.6, 8], [0, 8.4]], 14, xf(0, 25.8, 0, 1, 1, 1, 0, 0, 0), mul(b, 1.06));
  B.addc(U.cyl6, xf(0, 33.6, 0, 2.2, 4.6, 2.2, 0, 0, 0), bk);
  const wh = new THREE.TorusGeometry(4.2, 0.8, 4, 14);
  wh.rotateX(Math.PI / 2);
  B.addc(wh, xf(0, 38, 0, 1, 1, 1, 0, 0, 0), bk);
  wh.dispose();
  B.addc(U.cylC12, xf(0, 18.3, 13.4, 3.8, 1.6, 3.8, Math.PI / 2, 0, 0), bk);
  B.addc(U.cylC12, xf(0, 18.3, 14.2, 2.8, 0.8, 2.8, Math.PI / 2, 0, 0), gl, true);
  return B;
}




/* FENER — demir gövde, PARLAYAN cam. Materyal unlit olduğu için parlak
   cam rengi gerçekten ışıldar: yeni ışık eklemeden gece okunurluğu. */
function fener(B) { return (FENER_STYLE[PID] || fenerDemir)(B); }
/* HARİTAYA GÖRE FENER — ayak izi (22×22) ve boy (~129) hepsinde aynı;
   değişen şey NESNENİN NE OLDUĞU. Işık rengi hep C.cam (zemine pişen
   kandil havuzu sıcak — bkz. arenaPaint.paintPropBases). */
const FENER_STYLE = {
  kul: fenerMangal, bataklik: fenerDaragac, katedral: fenerSamdan,
  hiclik: fenerHiclik, kemikbahce: fenerBoynuz, gokcark: fenerPirinc,
};
/* DEMİR SOKAK FENERİ (mezarlık · gökçe ada · tuzla · buzul): sekizgen taş
   kaide, konik direk + bilezikler, altıgen CAM kafes (ışık küre değil
   pencere okunsun), saçaklı çatı + tepelik. Eski sürümün "mantar"
   silueti (kürenin üstünde koni) buradan kalktı. */
function fenerDemir(B) {
  const d = C.demir, dk = C.demirKoyu, t = C.tasKoyu, cam = C.cam;
  const post = PID === 'tuzla' ? C.ahsapKoyu : d;
  addOc(B, U.cyl8, { amp: 0.06, fa: 3, seed: 0.4 }, xf(0, 0, 0, 12.5, 7, 12.5, 0, 0.2, 0), t);
  B.addc(U.cyl8, xf(0, 6.5, 0, 9, 5, 9, 0, 0.2, 0), mul(t, 1.22));
  tcyl(B, 3.1, 4.9, 80, 8, xf(0, 11, 0, 1, 1, 1, 0, 0, 0), post);
  B.addc(U.cyl8, xf(0, 11, 0, 6.6, 4, 6.6, 0, 0, 0), dk);
  B.addc(U.cylC12, xf(0, 52, 0, 4.9, 2.6, 4.9, 0, 0, 0), dk);
  if (PID === 'tuzla') for (const y of [28, 31, 66, 69]) B.addc(U.cylC12, xf(0, y, 0, 5.1, 1.8, 5.1, 0, 0, 0), C.siva);
  lath(B, [[3.6, 0], [5.4, 2.6], [9, 5.4], [10, 7]], 12, xf(0, 88, 0, 1, 1, 1, 0, 0, 0), dk);
  B.addc(U.cyl6, xf(0, 93.5, 0, 9.6, 2.6, 9.6, 0, 0, 0), dk);
  B.addc(U.cyl6, xf(0, 95.5, 0, 7.2, 16.5, 7.2, 0, 0, 0), cam, true);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * TAU;
    B.addc(U.box, xf(Math.sin(a) * 7.3, 95, Math.cos(a) * 7.3, 1.7, 17.5, 1.7, 0, a, 0), dk);
  }
  B.addc(U.cyl6, xf(0, 111.5, 0, 9.9, 2.6, 9.9, 0, 0, 0), dk);
  B.addc(U.cone6, xf(0, 114, 0, 11.6, 10, 11.6, 0, 0, 0), d);
  B.addc(U.cyl6, xf(0, 123.2, 0, 1.8, 4.4, 1.8, 0, 0, 0), dk);
  B.addc(U.sph, xf(0, 128.4, 0, 2.6, 2.6, 2.6, 0, 0, 0), d);
  if (PID === 'buzul') {
    const sn = SNOW;
    B.addc(U.cone6, xf(0, 114.4, 0, 11.3, 10.9, 11.3, 0, 0, 0), sn);
    for (let i = 0; i < 5; i++) {
      const a = i * 1.26 + 0.3;
      B.addc(U.cone4, xf(Math.sin(a) * 9.6, 114, Math.cos(a) * 9.6, 1.1, 3.5 + (i % 3) * 1.6, 1.1, Math.PI, 0, 0), sn);
    }
  }
  return B;
}
/* MANGAL (kül çukurları): üç ayaklı demir sehpa, dövme kâse, kor yatağı,
   kömür topakları ve beş alev dili. Kül haritasında cam fener yabancıydı. */
function fenerMangal(B) {
  const d = C.demir, dk = C.demirKoyu, t = C.tasKoyu, kor = C.camMavi, al = C.cam;
  addOc(B, U.cyl8, { amp: 0.1, fa: 3, seed: 0.9, flare: 0.12 }, xf(0, 0, 0, 13, 4.5, 13, 0, 0, 0), t);
  for (let i = 0; i < 3; i++) {
    const a = i * TAU / 3 + 0.3, c = Math.cos(a), sn = Math.sin(a);
    tcyl(B, 1.9, 2.9, 85, 6, xf(c * 11, 3, sn * 11, 1, 1, 1, -sn * 0.128, 0, c * 0.128), d);
    B.addc(U.sphT, xf(c * 11, 3.5, sn * 11, 3.4, 2.4, 3.4, 0, 0, 0), dk);
  }
  B.addc(U.cylC12, xf(0, 42, 0, 7.4, 2.4, 7.4, 0, 0, 0), d);
  lath(B, [[0, 0], [5, 0.4], [11, 4], [15, 10], [16.6, 14], [15.6, 15.2]], 14,
    xf(0, 84, 0, 1, 1, 1, 0, 0, 0), d, { amp: 0.035, fa: 5, seed: 2.2 });
  const rim = new THREE.TorusGeometry(15.9, 1.5, 5, 18);
  rim.rotateX(Math.PI / 2);
  B.addc(rim, xf(0, 99, 0, 1, 1, 1, 0, 0, 0), dk);
  rim.dispose();
  B.addc(U.cylC12, xf(0, 97.6, 0, 14.2, 2.4, 14.2, 0, 0, 0), kor, true);
  for (let i = 0; i < 4; i++) {
    const a = i * 1.9 + 0.4, r = 6 + (i % 2) * 3;
    addOc(B, U.sphT, { amp: 0.25, fa: 2, seed: i }, xf(Math.cos(a) * r, 99, Math.sin(a) * r, 3.8, 2.4, 3.2, 0, a, 0), mul(dk, 0.5));
  }
  const FL = [[0, 0, 21, 5.2], [5.5, -3, 14, 3.8], [-5, 3, 12, 3.4], [2, 6, 9, 2.8], [-3, -6, 10, 3]];
  for (let i = 0; i < FL.length; i++) {
    const f = FL[i];
    B.addc(U.cone6, xf(f[0], 98, f[1], f[3], f[2], f[3], 0, i * 0.7, (i % 2 ? 0.08 : -0.06)), i ? kor : al, true);
  }
  return B;
}
/* DARAĞACI FENERİ (bataklık): eğri, yosun kuşaklı kazık + payandalı kol +
   iple asılı fener. Sazlıkta demir sokak lambası "şehir" okunuyordu. */
function fenerDaragac(B) {
  const w = C.ahsapKoyu, d = C.demirKoyu, cam = C.cam, t = C.toprak, m = C.yaprakKoyu;
  addOc(B, U.cone8, { amp: 0.22, fa: 3, seed: 1.3, flare: 0.2 }, xf(0, 0, 0, 14, 8, 14, 0, 0, 0), t);
  tcyl(B, 3.2, 5.4, 122, 7, xf(-3, 0, 0, 1, 1, 1, 0, 0, -0.03), w, false, { amp: 0.09, fa: 3, fh: 3, seed: 2.2, bend: 0.025 });
  addOc(B, U.cylC12, { amp: 0.22, fa: 5, seed: 3.1 }, xf(-2.6, 14, 0, 6.2, 9, 6.2, 0, 0, -0.03), m);
  addOc(B, U.box, { amp: 0.04, fa: 2, seed: 4.4 }, xf(13.5, 110, 0, 31, 3.8, 3.8, 0, 0, 0.02), w);
  B.addc(U.boxC, xf(6.5, 101, 0, 17, 2.8, 2.8, 0, 0, 0.9), w);
  B.addc(U.cyl6, xf(25, 101.5, 0, 0.8, 8.6, 0.8, 0, 0, 0), d);
  B.addc(U.cone6, xf(25, 97, 0, 6.2, 5, 6.2, 0, 0, 0), d);
  B.addc(U.cyl6, xf(25, 95.6, 0, 5.8, 1.8, 5.8, 0, 0, 0), d);
  B.addc(U.cyl6, xf(25, 85.4, 0, 4.6, 10.4, 4.6, 0, 0, 0), cam, true);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * TAU;
    B.addc(U.box, xf(25 + Math.sin(a) * 4.7, 85, Math.cos(a) * 4.7, 1.3, 11, 1.3, 0, a, 0), d);
  }
  B.addc(U.cyl6, xf(25, 83.8, 0, 5.8, 1.8, 5.8, 0, 0, 0), d);
  B.addc(U.cone6, xf(25, 83.9, 0, 2.6, 4, 2.6, Math.PI, 0, 0), d);
  return B;
}
/* ŞAMDAN (kan katedrali): tripod ayaklı bronz kaide, topuzlu gövde, U kol,
   üç fildişi mum + alev. Katedralin "fener"i bir kilise eşyası olmalı. */
function fenerSamdan(B) {
  const b = C.demir, bk = C.demirKoyu, w = C.mermer, cam = C.cam;
  lath(B, [[0, 0], [12, 0], [12.4, 2.2], [9.4, 4.4], [5.4, 8.6], [3.2, 13]], 12, xf(0, 0, 0, 1, 1, 1, 0, 0, 0), bk);
  for (let i = 0; i < 3; i++) {
    const a = i * TAU / 3 + 0.5;
    B.addc(U.sphT, xf(Math.cos(a) * 11, 1.6, Math.sin(a) * 11, 3.4, 2.4, 3.4, 0, 0, 0), bk);
  }
  tcyl(B, 2.1, 3, 78, 8, xf(0, 12, 0, 1, 1, 1, 0, 0, 0), b);
  B.addc(U.sph, xf(0, 38, 0, 4.4, 3.6, 4.4, 0, 0, 0), mul(b, 1.1));
  B.addc(U.sph, xf(0, 66, 0, 3.6, 3, 3.6, 0, 0, 0), mul(b, 1.1));
  const arm = new THREE.TorusGeometry(13, 1.7, 5, 12, Math.PI);
  B.addc(arm, xf(0, 103, 0, 1, 1, 1, 0, 0, Math.PI), b);
  arm.dispose();
  B.addc(U.cylC12, xf(0, 90.6, 0, 6.8, 2.2, 6.8, 0, 0, 0), bk);
  for (const c of [[-13, 103, 12], [13, 103, 12], [0, 91.6, 30]]) {
    B.addc(U.cyl8, xf(c[0], c[1] - 1, 0, 3.8, 4, 3.8, 0, 0, 0), bk);
    tcyl(B, 2.7, 2.9, c[2], 8, xf(c[0], c[1] + 2.6, 0, 1, 1, 1, 0, 0, 0), w);
    const top = c[1] + 2.6 + c[2];
    B.addc(U.sphT, xf(c[0], top + 1.8, 0, 2.6, 2.6, 2.6, 0, 0, 0), cam, true);
    B.addc(U.cone6, xf(c[0], top + 2.2, 0, 2.2, 7.5, 2.2, 0, 0, 0), cam, true);
  }
  return B;
}
/* HİÇLİK KANDİLİ: obsidyen kare dikme + gümüş bantlar + iki çatal arasında
   süzülen soluk kristal ve eğik yörünge halkası. */
function fenerHiclik(B) {
  const k = C.tasKoyu, sv = C.demir, cam = C.cam;
  addOc(B, U.box, { amp: 0.05, fa: 2, seed: 0.3 }, xf(0, 0, 0, 21, 7, 21, 0, 0.1, 0), k);
  tcyl(B, 4.4, 6.6, 84, 4, xf(0, 6.5, 0, 1, 1, 1, 0, Math.PI / 4 + 0.1, 0), mul(k, 1.25), false, { amp: 0.03, fa: 2, seed: 1.1 });
  for (const y of [28, 68]) B.addc(U.box, xf(0, y, 0, 11.4, 2.6, 11.4, 0, 0.1, 0), sv);
  B.addc(U.cyl8, xf(0, 89.5, 0, 8, 4, 8, 0, 0, 0), sv);
  for (const q of [-1, 1]) tcyl(B, 0.8, 2.2, 32, 4, xf(q * 4.5, 92, 0, 1, 1, 1, 0, 0, -q * 0.34), sv);
  B.addc(U.cone4, xf(0, 106, 0, 6.2, 14, 6.2, 0, 0.3, 0), cam, true);
  B.addc(U.cone4, xf(0, 106, 0, 6.2, 11, 6.2, Math.PI, -0.3, 0), cam, true);
  const h = new THREE.TorusGeometry(10.5, 0.8, 4, 20);
  h.rotateX(Math.PI / 2);
  B.addc(h, xf(0, 106, 0, 1, 1, 1, 0.32, 0, 0.18), sv);
  h.dispose();
  return B;
}
/* BOYNUZ FENER (kemik bahçesi): iki eklemli kemik direk, boynuz çanak ve
   ışık küresini saran dört içe kıvrık boynuz. Göz/yüz YOK (v38 dersi). */
function fenerBoynuz(B) {
  const k = C.kemik, h = C.demir, t = C.toprak, cam = C.cam;
  addOc(B, U.cone8, { amp: 0.24, fa: 3, seed: 0.8, flare: 0.2 }, xf(0, 0, 0, 13, 7, 13, 0, 0, 0), t);
  tcyl(B, 2.8, 3.8, 42, 6, xf(0, 3, 0, 1, 1, 1, 0, 0.3, 0.02), k, false, { amp: 0.08, fa: 2, seed: 1.2 });
  addOc(B, U.sphT, { amp: 0.14, fa: 2, seed: 2 }, xf(0.8, 46, 0, 6.4, 5, 6, 0, 0, 0), mul(k, 1.06));
  tcyl(B, 2.6, 3.4, 38, 6, xf(0.8, 48, 0, 1, 1, 1, 0, 0.8, -0.02), k, false, { amp: 0.08, fa: 2, seed: 3.3 });
  addOc(B, U.sphT, { amp: 0.14, fa: 2, seed: 4 }, xf(0.2, 88, 0, 6, 4.6, 5.6, 0, 0, 0), mul(k, 1.06));
  lath(B, [[2.6, 0], [6.6, 2.6], [9.6, 7], [10.2, 9]], 10, xf(0.2, 88, 0, 1, 1, 1, 0, 0, 0), h);
  B.addc(U.sph, xf(0.2, 104, 0, 7, 7, 7, 0, 0, 0), cam, true);
  for (let i = 0; i < 4; i++) {
    const a = i * TAU / 4 + 0.4;
    tcyl(B, 0.9, 2.6, 27, 6, xf(0.2 + Math.cos(a) * 8, 94, Math.sin(a) * 8, 1, 1, 1, 0, -a, -0.36),
      mul(k, 0.95), false, { amp: 0.05, fa: 2, seed: i, bend: -0.34 });
  }
  return B;
}
/* PİRİNÇ KÜRE LAMBA (gök çarkı): dişli bilezikli pirinç direk, ışık
   küresi ve çapraz iki yörünge halkası — mekanizmanın dili. */
function fenerPirinc(B) {
  const b = C.demir, bk = C.demirKoyu, t = C.tasKoyu, cam = C.cam;
  addOc(B, U.cyl8, { amp: 0.05, fa: 3, seed: 0.6 }, xf(0, 0, 0, 12, 7, 12, 0, 0.2, 0), t);
  B.addc(U.cyl8, xf(0, 6.5, 0, 8.6, 5, 8.6, 0, 0.2, 0), bk);
  tcyl(B, 2.9, 4.3, 82, 8, xf(0, 11, 0, 1, 1, 1, 0, 0, 0), b);
  B.addc(U.cylC12, xf(0, 42, 0, 7, 4, 7, 0, 0, 0), bk);
  for (let i = 0; i < 8; i++) {
    const a = i * TAU / 8;
    B.addc(U.box, xf(Math.cos(a) * 7.8, 40, Math.sin(a) * 7.8, 3, 4, 3, 0, -a, 0), b);
  }
  lath(B, [[2.9, 0], [5.6, 2], [8, 5], [8.4, 6]], 12, xf(0, 92, 0, 1, 1, 1, 0, 0, 0), bk);
  B.addc(U.sph, xf(0, 105, 0, 8.6, 8.6, 8.6, 0, 0, 0), cam, true);
  const r1 = new THREE.TorusGeometry(11.6, 1.05, 4, 22), r2 = new THREE.TorusGeometry(10.4, 0.9, 4, 22);
  B.addc(r1, xf(0, 105, 0, 1, 1, 1, 1.25, 0, 0.25), b);
  B.addc(r2, xf(0, 105, 0, 1, 1, 1, 0.2, 1.1, 1.35), mul(b, 0.8));
  r1.dispose(); r2.dispose();
  B.addc(U.cone8, xf(0, 113, 0, 3.2, 7, 3.2, 0, 0, 0), bk);
  B.addc(U.sphT, xf(0, 121, 0, 1.9, 1.9, 1.9, 0, 0, 0), b);
  return B;
}


/* KEMİK YIĞINI — kafatası + uzun kemikler. hx26 hz20 h18
   MALİYET ÖLÇÜLDÜ: ilk sürüm 684 üçgendi ve haritada 21 örnekle 14,4k
   tutuyordu — tüm engel bütçesinin en pahalı satırı, oysa ekranda 30 px'lik
   bir leke. Alt çözünürlüklü küre (7×5) + iki kemik: ~190 üçgen. */
function kemik(B) {
  /* v43: kemik = gövde + İKİ TOPUZLU uç (çizgi-film kemiği). Düz silindir
     30 px'te "çubuk" okunuyordu; çift topuz tek bakışta KEMİK der.
     Kafatası artık küre + çene bloğu + göz çukurları + diş çizgisi. */
  const k = C.kemik, t = C.toprak, dk = mul(t, 0.3);
  addOc(B, U.sphLo, { amp: 0.2, fa: 3, seed: 0.6 }, xf(0, 0, 0, 25, 6, 19, 0, 0, 0), mul(t, 0.85));
  bone(B, 4, 5.6, -5, 30, 2.7, 0.45, 0.06, k);
  bone(B, 6, 4.4, 8, 24, 2.3, 2.5, -0.05, mul(k, 0.92));
  bone(B, -2, 8.2, -1, 20, 2.1, 1.3, 0.1, mul(k, 1.04));
  B.addc(U.sph, xf(-11, 9.5, 3, 10, 9.4, 10.4, 0, 0, 0), k);
  B.addc(U.boxC, xf(-11, 5, 10.2, 10, 6, 6, 0.1, 0, 0), mul(k, 0.95));
  for (const q of [-1, 1]) B.addc(U.box, xf(-11 + q * 3.8, 7, 12.6, 4.2, 4.4, 2.4, 0, 0, 0), dk);
  B.addc(U.cone4, xf(-11, 7.4, 13.2, 1.6, 2.6, 1.2, Math.PI, 0.79, 0), dk);
  B.addc(U.box, xf(-11, 3.8, 13.3, 8, 0.8, 0.8, 0, 0, 0), dk);
  return B;
}
function bone(B, x, y, z, len, r, ry, tilt, c) {
  const rz = Math.PI / 2 + tilt;
  const sh = new THREE.CylinderGeometry(r * 0.72, r * 0.72, len, 6, 1);
  B.addc(sh, xf(x, y, z, 1, 1, 1, 0, ry, rz), c);
  sh.dispose();
  const tip = tipOf(len / 2, 0, ry, rz);
  const tx = tip.x, ty = tip.y, tz = tip.z;
  const L = Math.hypot(tx, tz) || 1, px = -tz / L * r * 0.62, pz = tx / L * r * 0.62;
  for (const e of [-1, 1]) for (const q of [-1, 1]) {
    B.addc(U.sphT, xf(x + tx * e + px * q, y + ty * e, z + tz * e + pz * q, r, r * 0.92, r, 0, 0, 0), mul(c, 1.04));
  }
}







/* MEZAR YUVASI (görev) — organik höyük + dikenler + parlayan çekirdek.
   Palet kuralının bilinçli istisnası: hedef ayrışmak ZORUNDA. */
function yuva(B) {
  const d = C.morKoyu, m = C.mor;
  B.add(U.sph, xf(0, 0, 0, 46, 40, 46, 0, 0, 0), d[0], d[1], d[2]);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + 0.4;
    B.add(U.cone6, xf(Math.cos(a) * 24, 22, Math.sin(a) * 24, 8, 44 + (i % 3) * 16, 8,
      Math.sin(a) * 0.5, a, Math.cos(a) * -0.5), d[0] * 1.2, d[1] * 1.2, d[2] * 1.2);
  }
  B.add(U.sph, xf(0, 42, 0, 20, 18, 20, 0, 0, 0), m[0], m[1], m[2], true);
  return B;
}

/* KURTARILACAK İNSAN — escort NPC. Kutu değil: pelerinli figür, kapüşon,
   elinde fener. Fener PARLAK: 4000 px'lik karanlık sahada gözün
   yakaladığı şey hareket eden ışıktır. */
function insan(B) {
  /* PALETTEN BAĞIMSIZ: escort NPC bir malzeme değil KARAKTERDİR ve on
     haritada AYNI okunmak zorunda (sandık altını kuralının aynısı).
     v43: yontulmuş, eteği açılan cüppe · kemer + tokası · heybe · sivri
     kapüşon · çizmeler · asa ve asanın ucunda sallanan fener. Fener hâlâ
     en parlak nokta: karanlık sahada gözün yakaladığı şey hareket eden ışık. */
  const kum = rgb(0xd8b98a), pel = rgb(0x9a5f3a), pk = rgb(0x5e3522), cam = rgb(0xffd9a0),
    d = rgb(0x282e36), w = rgb(0x6e5034), au = rgb(0xe8b04a);
  for (const x of [-4.2, 4.2]) tcyl(B, 3, 3.4, 10, 6, xf(x, 0, 1, 1, 1, 1, 0, 0, 0), d);
  const robe = new THREE.CylinderGeometry(9.2, 15.5, 30, 10, 1).translate(0, 15, 0);
  addOc(B, robe, { amp: 0.07, fa: 5, fh: 1.6, seed: 2.4, top: 30, ampY: 0.03 }, xf(0, 5, 0, 1, 1, 1, 0, 0, 0), pel);
  robe.dispose();
  B.addc(U.cylC12, xf(0, 24, 0, 10.4, 3, 10.4, 0, 0, 0), pk);
  B.addc(U.box, xf(0, 22.4, 10.2, 3.6, 3.2, 1.2, 0, 0, 0), au);
  B.addc(U.boxC, xf(-10, 21, 3, 5, 8, 7, 0, 0.2, 0.12), pk);
  addOc(B, U.sph, { amp: 0.06, fa: 3, seed: 5 }, xf(0, 35.5, 0, 11, 7.4, 8.4, 0, 0, 0), mul(pel, 1.08));
  B.addc(U.sph, xf(0, 43.6, 1.8, 6.4, 6.8, 6.4, 0, 0, 0), kum);
  addOc(B, U.sph, { amp: 0.05, fa: 3, seed: 6 }, xf(0, 45, -1.4, 8.2, 8.6, 8.2, 0, 0, 0), mul(pel, 0.85));
  B.addc(U.cone6, xf(0, 49.5, -5.5, 3.8, 8, 3.8, -0.9, 0, 0), mul(pel, 0.85));
  tcyl(B, 2.6, 3.2, 20, 6, xf(-10.5, 19, 2, 1, 1, 1, 0.22, 0, 0.12), mul(pel, 0.92));
  tcyl(B, 2.6, 3, 13, 6, xf(12, 29, 7, 1, 1, 1, -0.5, 0, 0.27), mul(pel, 0.92));
  B.addc(U.sphT, xf(12, 29.5, 7, 2.6, 2.6, 2.6, 0, 0, 0), kum);
  tcyl(B, 1.2, 1.5, 60, 5, xf(12.5, 0, 7.5, 1, 1, 1, 0, 0, -0.02), w);
  B.addc(U.box, xf(15, 57.6, 7.5, 6.4, 1.4, 1.4, 0, 0, 0), d);
  B.addc(U.cyl6, xf(17.5, 52, 7.5, 0.5, 5, 0.5, 0, 0, 0), d);
  B.addc(U.cone6, xf(17.5, 49.6, 7.5, 4.6, 3.4, 4.6, 0, 0, 0), d);
  B.addc(U.cyl6, xf(17.5, 42.4, 7.5, 3.6, 7.4, 3.6, 0, 0, 0), cam, true);
  B.addc(U.cyl6, xf(17.5, 41.2, 7.5, 4.4, 1.4, 4.4, 0, 0, 0), d);
  return B;
}

/* ═══════════════ HARİTAYA ÖZGÜ ARKETİPLER ═══════════════════
   NEDEN (2026-08-25): on harita on yedi modeli PAYLAŞIYORDU, yani buz
   gölünde mezar taşı, katedralde parsel çiti, tuzlada şapel vardı.
   Kullanıcının teşhisi doğruydu: bir yerin kimliği zemininde değil
   NESNELERİNDE. Aşağıdaki arketipler haritaya bağlıdır ve bilerek
   paylaşılmaz. İklim ağacı da üçe ayrıldı: kuru meşe (mezarlık) ·
   servi (bataklık) · çam (buzul, gökçe ada).

   ÜÇGEN BÜTÇESİ: her arketip < 520 üçgen. Kalabalık olanlar (plaka,
   iskele, buz dikeni) en yalın; tek örnekli anıtlar (gemi, kafatası)
   daha zengin olabilir — çizim çağrısı arketip başınadır, örnek
   başına değil.                                                    */






/* ── KAZAN — üç ayaklı demir tencere + kor içerik. hx24 hz24 h46 */
function kazan(B) {
  /* v43: dövme (fasetli) gövde, kalın ağız halkası, yatık sap, kaynayan
     kor kabarcıkları */
  const d = C.demir, dk = C.demirKoyu, kor = rgb(0xff9a4a);
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * TAU;
    B.add(U.cyl6, xf(Math.cos(a) * 15, 0, Math.sin(a) * 15, 3.6, 18, 3.6,
      Math.sin(a) * -0.2, a, Math.cos(a) * 0.2), dk[0], dk[1], dk[2]);
  }
  lath(B, [[0, 0], [14, 2], [22, 10], [23, 20], [20, 26]], 14, xf(0, 17, 0, 1, 1, 1, 0, 0, 0), d, { amp: 0.03, fa: 4, seed: 1.1 });
  /* v47: içerik artık DÜZ IŞIKLI DİSK değil (1:1'de "turuncu daire" okunuyordu):
     koyu, gölgeli sıvı yüzeyi + ışıyan kabarcıklar; sıcaklığı FX halesi verir.
     Renk haritadan: bataklıkta zehir yeşili, külde kor, başka yerde sıcak çorba. */
  const brew = PID === 'bataklik' ? C.camMavi : (PID === 'kul' ? kor : rgb(0xd89a5a));
  B.addc(U.cylC12, xf(0, 41, 0, 19, 3, 19, 0, 0, 0), mul(brew, 0.34));
  const rim = new THREE.TorusGeometry(20.6, 2.1, 5, 18);
  rim.rotateX(Math.PI / 2);
  B.addc(rim, xf(0, 43, 0, 1, 1, 1, 0, 0, 0), dk);
  rim.dispose();
  const hd = new THREE.TorusGeometry(20, 1.2, 4, 12, Math.PI);
  B.addc(hd, xf(0, 43, 0, 1, 1, 1, -1.0, 0.5, 0), dk);
  hd.dispose();
  for (let i = 0; i < 4; i++) {
    const a = i * 2.1 + 0.4, r = 4 + i * 3.4, q = 2.8 - i * 0.45;
    B.addc(U.sphT, xf(Math.cos(a) * r, 42.8, Math.sin(a) * r, q, 1.5, q, 0, 0, 0), mul(brew, 1.1), true);
  }
  return B;
}








/* ── KIRIK PLAKA — eğik duran taş levha + yonga. Kalabalık arketip,
   en yalın model. hx34 hz26 h26 */
function plaka(B) {
  /* v43: yıkılmış bir YAZIT levhası — pahlı levha + oyma çerçeve + kabartma
     pano + rün. Hiçlik ve gök çarkında rün soluk IŞIK taşır (büyülü yer),
     diğerlerinde koyu oyma. Eğim üç parçada da AYNI matris (hiza bozulmaz). */
  const t = C.tas, k = C.tasKoyu;
  const glow = PID === 'hiclik' || PID === 'gokcark';
  const RX = 0.14, RY = 0.2, RZ = -0.10;
  addOc(B, U.boxC, { amp: 0.04, fa: 2, fh: 1.4, seed: 1.4 }, xf(0, 11, 0, 64, 9, 48, RX, RY, RZ), t);
  B.addc(U.boxC, xf(0, 11.05, 0, 54, 9.6, 38, RX, RY, RZ), mul(k, 0.62));
  B.addc(U.boxC, xf(0, 11.1, 0, 46, 9.9, 30, RX, RY, RZ), mul(t, 1.1));
  /* RÜN: haç biçimi (iki dik çubuk) 1:1 bakışta HAÇ okundu — gök çarkında
     ışıklı bir haç yanlış hikâye. Elmas mühür + yatay çizgi: yazı değil
     işaret. Çubuklar levhanın KENDİ düzleminde döner (yerel geometri,
     sonra levhanın matrisi). */
  const rc = glow ? C.cam : mul(k, 0.45);
  const RB = [[4.25, 4.25, 1], [-4.25, 4.25, -1], [4.25, -4.25, -1], [-4.25, -4.25, 1]];
  for (const q of RB) {
    const g = new THREE.BoxGeometry(12.4, 10.3, 2.2);
    g.rotateY(q[2] * Math.PI / 4);
    g.translate(q[0], 0, q[1]);
    B.addc(g, xf(0, 11.15, 0, 1, 1, 1, RX, RY, RZ), rc, glow);
    g.dispose();
  }
  B.addc(U.boxC, xf(0, 11.15, 0, 34, 10.2, 1.8, RX, RY, RZ), rc, glow);
  addOc(B, U.boxC, { amp: 0.07, fa: 3, seed: 4.2 }, xf(-18, 5, 12, 26, 6, 22, -0.1, 0.5, 0.16), k);
  addOc(B, U.cone4, { amp: 0.34, fa: 3, seed: 7.1 }, xf(14, 0, -10, 12, 7, 10, 0.12, 0.3, 0.2), mul(k, 0.94));
  addOc(B, U.cone4, { amp: 0.34, fa: 3, seed: 9.3 }, xf(30, 0, 14, 7, 5, 6, 0.1, 1.1, 0.14), mul(k, 0.9));
  return B;
}



/* ── TUZ SÜTUNU — üst üste kristal prizmalar. Tuzlanın imzası:
   köşeli, açık, ışık tutan. hx24 hz24 h128 */
function tuzsutun(B) {
  /* v43: üst üste konmuş prizmalar "beyaz trafik konisi yığını" okunuyordu
     (1:1). Gerçek tuz kristali KÜME halinde büyür: bir ana altıgen prizma +
     dışa yaslanan dört yavru, her biri sivri uçlu; kabuk tabanı. */
  const sm = rgb(0xc9c2a4), sk = rgb(0x8e8974), l = rgb(0xf2ecd2);
  addOc(B, U.cone8, { amp: 0.22, fa: 3, seed: 0.5, flare: 0.16 }, xf(0, 0, 0, 27, 14, 27, 0, 0.3, 0), sk);
  crystal(B, 0, 4, 0, 11.5, 92, 28, 0.05, 0.02, l);
  const SUB = [[0.5, 0.36, 8.2, 56, 18], [2.2, 0.46, 6.8, 42, 15], [3.8, 0.33, 7.6, 48, 16], [5.3, 0.52, 5.4, 30, 11]];
  for (let i = 0; i < SUB.length; i++) {
    const q = SUB[i], c = Math.cos(q[0]), sn = Math.sin(q[0]);
    crystal(B, c * 7, 3, sn * 7, q[2], q[3], q[4], sn * q[1], -c * q[1], i % 2 ? sm : l);
  }
  for (let i = 0; i < 3; i++) {
    const a = i * 2.2 + 1;
    addOc(B, U.cone4, { amp: 0.3, fa: 2, seed: i + 7 }, xf(Math.cos(a) * 22, 0, Math.sin(a) * 22, 5, 7, 5, 0.3, a, 0.4), sm);
  }
  return B;
}
function crystal(B, x, y, z, r, h, th, rx, rz, c) {
  const pr = new THREE.CylinderGeometry(r * 0.9, r, h, 6, 1).translate(0, h / 2, 0);
  addOc(B, pr, { amp: 0.03, fa: 2, seed: r, top: h }, xf(x, y, z, 1, 1, 1, rx, 0, rz), c);
  pr.dispose();
  const tip = tipOf(h, rx, 0, rz);
  const tx = tip.x, ty = tip.y, tz = tip.z;
  B.addc(U.cone6, xf(x + tx, y + ty - 0.5, z + tz, r * 0.9, th, r * 0.9, rx, 0, rz), mul(c, 1.08));
}




/* ── KAFATASI HÖYÜĞÜ — kubbe + burun + göz çukurları + diş sırası.
   Haritanın anıtı; siluet 44°'den okunmak zorunda. hx92 hz78 h130 */
function kafatasi(B) {
  const k = C.kemik, kk = rgb(0x736c56), d = rgb(0x1a1712), t = C.toprak;
  B.add(U.sphLo, xf(0, 0, 0, 92, 24, 78, 0, 0, 0), t[0], t[1], t[2]);       // gömülü taban
  B.add(U.sph, xf(0, 10, -10, 74, 88, 66, -0.14, 0, 0), k[0], k[1], k[2]);  // kafa kubbesi
  /* burun/çene bloğu: kubbeyi "küre" olmaktan çıkaran şey */
  B.add(U.boxC, xf(0, 44, 46, 62, 54, 56, 0.30, 0, 0), k[0], k[1], k[2]);
  B.add(U.box, xf(0, 26, 62, 56, 16, 26, 0.2, 0, 0), kk[0], kk[1], kk[2]);
  /* GÖZ ÇUKURLARI: koyu, derin, büyük — kimlik bunlar */
  /* v47: "PANDA YÜZÜ" düzeltmesi (1:1 oyun kamerası): açık kubbe + iki yuvarlak
     SİYAH göz + siyah burun sevimli bir hayvan yüzü okunuyordu. Göz çukurları
     artık köşeli ve kaş kemerinin GÖLGESİNDE (siyah değil koyu toprak), şakaktan
     geriye kıvrılan iki boynuz silueti "kadim canavar kafatası"na çevirir,
     sol yanağı toprak ve kemik yığını örter (asimetri yüz okumasını kırar). */
  const dk2 = mul(t, 0.42);
  for (const x of [-28, 28]) {
    const s = x > 0 ? 1 : -1;
    B.add(U.boxC, xf(x, 60, 50, 30, 18, 16, 0.25, s * 0.35, -s * 0.28), dk2[0], dk2[1], dk2[2]);
    addO(B, U.boxC, { amp: 0.08, fa: 2, seed: 1.2 + s }, xf(x, 75, 47, 40, 11, 24, 0.2, 0, -s * 0.2), k[0], k[1], k[2]);
    addO(B, U.cone8, { amp: 0.1, fa: 3, seed: 2 + s, bend: 0.35 }, xf(s * 56, 66, -16, 13, 78, 13, -0.75, 0, -s * 0.85), k[0] * 0.86, k[1] * 0.86, k[2] * 0.86);
  }
  addO(B, U.sphLo, { amp: 0.24, fa: 3, seed: 3.3 }, xf(-58, 0, 34, 42, 34, 40, 0, 0, 0), t[0], t[1], t[2]);
  B.add(U.cone4, xf(0, 44, 58, 10, 16, 10, 0.4, 0.79, 0), dk2[0], dk2[1], dk2[2]);  // burun boşluğu
  /* diş sırası */
  for (let i = 0; i < 7; i++) {
    B.add(U.box, xf(-30 + i * 10, 20, 66, 7, 12, 8, 0.15, 0, 0), k[0], k[1], k[2]);
  }
  B.add(U.cylC12, xf(0, 96, -30, 26, 8, 26, 0.4, 0, 0), kk[0], kk[1], kk[2]);
  return B;
}

/* ── DİŞLİ — göbek + sekiz diş + mil. Çarkın parçası. hx54 hz54 h58 */
function disli(B) {
  /* v43: düz disk + kutu dişler "oyuncak" okunuyordu. Şimdi GERÇEK çember
     (içi boş jant — dönel profil), karanlık göbek boşluğu, beş kol, 12 diş,
     mil, üstüne düşmüş küçük dişli ve moloz. */
  const br = rgb(0x7d6a3c), brk = rgb(0x4a3f24), d = C.demir, k = C.tasKoyu;
  addOc(B, U.sphLo, { amp: 0.18, fa: 3, seed: 0.4 }, xf(0, 0, 0, 54, 5, 54, 0, 0, 0), mul(k, 0.9));
  ring(B, 35, 44, 12, 16, xf(0, 1.5, 0, 1, 1, 1, 0, 0, 0), br);
  B.addc(U.cylC16, xf(0, 4, 0, 35.5, 1, 35.5, 0, 0, 0), mul(brk, 0.35));
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * TAU;
    B.addc(U.box, xf(Math.cos(a) * 47.6, 1.5, Math.sin(a) * 47.6, 8.8, 12, 12.5, 0, -a, 0), br);
  }
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * TAU + 0.3;
    B.addc(U.box, xf(Math.cos(a) * 23, 4.5, Math.sin(a) * 23, 26, 6.5, 7, 0, -a, 0), brk);
  }
  B.addc(U.cyl12, xf(0, 1.5, 0, 11.5, 14, 11.5, 0, 0, 0), mul(br, 1.1));
  B.addc(U.cyl8, xf(0, 15, 0, 5, 12, 5, 0, 0, 0), d);
  const sm = mul(brk, 1.35);
  ring(B, 7, 16, 6, 12, xf(20, 13.5, -16, 1, 1, 1, 0, 0, 0), sm);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * TAU + 0.2;
    B.addc(U.box, xf(20 + Math.cos(a) * 17.6, 13.5, -16 + Math.sin(a) * 17.6, 4.4, 6, 5, 0, -a, 0), sm);
  }
  B.addc(U.cyl8, xf(20, 13.5, -16, 5.4, 9, 5.4, 0, 0, 0), d);
  for (let i = 0; i < 2; i++) {
    addOc(B, U.cone4, { amp: 0.34, fa: 3, seed: i * 3 + 2 }, xf(i ? 50 : -46, 0, i ? 26 : -30, 10, 7, 9, 0.12, i * 2.1, 0.18), mul(k, 0.95));
  }
  return B;
}
/** içi boş halka (jant): iç duvar dahil kapalı profil; yontma bayrağı yüz
    normali verir (dönel profilin köşe yumuşatması jantı "simit" yapıyordu) */
function ring(B, r0, r1, h, seg, mtx, c) {
  lath(B, [[r0, 0.3], [r1, 0], [r1, h], [r0, h], [r0, 0.3]], seg, mtx, c, { amp: 0.012, fa: 3, seed: r0 });
}


/* ── ARKETİP TABLOSU ─────────────────────────────────────── */
/* ── TOTEM — oyulmuş kazık: boyalı kuşaklar, tepede yüz bloğu, iki
   boynuz, sarkan muska + paçavra. NEDEN (2026-08-26): bataklık ve kemik
   bahçesi landmark olarak `heykel`i (ağıt tutan MERMER figür) kullanıyordu
   — o figür mezarlığın dilidir, sazlıkta ve kemik tarlasında "başka
   oyundan gelmiş" okunuyordu. Totem aynı işi yapar (işaret + yön bulma)
   ama yerin kendi diliyle. Silueti sütundan ve dikilitaştan ayrı tutan şey
   GENİŞ BAŞ: gövde ince, tepe geniş — 44°'den okunan şey üst kenardır.
   hx14 hz14 h164 */
function totem(B) {
  /* v47: kemik bahçesinde kiremit kuşak + beyaz baş "kırmızı yangın musluğu" okunuyordu (1:1) → kurumuş kan-kahve */
  const w = C.ahsap, wk = C.ahsapKoyu, k = C.kemik, t = C.toprak, r = PID === 'kemikbahce' ? mul(C.ahsapKoyu, 1.15) : C.kiremit, d = C.demirKoyu;
  addO(B, U.cyl8, { amp: 0.16, fa: 3, seed: 0.6, flare: 0.1 },
    xf(0, 0, 0, 19, 7, 19, 0, 0, 0), t[0], t[1], t[2]);
  /* v25: iki eş silindir üst üste "boru ekleme" okunuyordu. İki gövde de
     yontulur, ekleme yerine 4 birim BİNİŞME ve orada bir halka var. */
  addO(B, U.cyl6, { amp: 0.09, fa: 3, fh: 2.6, seed: 2.2, bend: 0.03 },
    xf(0, 5, 0, 12, 62, 12, 0, 0.2, 0), wk[0], wk[1], wk[2]);
  addO(B, U.cyl6, { amp: 0.085, fa: 3, fh: 2.9, seed: 4.7, bend: -0.035 },
    xf(0, 60, 0, 10.5, 60, 10.5, 0, 0.5, 0), w[0], w[1], w[2]);
  for (const y of [40, 66, 94]) {
    addO(B, U.box, { amp: 0.07, fa: 2, seed: y * 0.11 },
      xf(0, y, 0, 27, 5, 27, 0, 0.3 + y * 0.004, 0), r[0] * 0.8, r[1] * 0.8, r[2] * 0.8);
  }
  addO(B, U.box, { amp: 0.08, fa: 2, fh: 1.7, seed: 7.3 },
    xf(0, 116, 1, 25, 26, 21, 0, 0, 0), k[0], k[1], k[2]);
  for (const x of [-7, 7]) {
    B.add(U.box, xf(x, 130, 10, 6, 7, 3, 0, 0, 0), d[0], d[1], d[2]);
  }
  for (const s of [-1, 1]) {
    B.add(U.cone4, xf(s * 13, 138, 0, 6, 26, 6, 0, 0, s * 0.6), k[0] * 0.92, k[1] * 0.92, k[2] * 0.92);
  }
  B.add(U.cyl6, xf(13, 86, 4, 1.4, 14, 1.4, 0, 0, 0), wk[0], wk[1], wk[2]);
  B.add(U.sphLo, xf(13, 78, 4, 6, 7, 6, 0, 0, 0), k[0], k[1], k[2]);
  B.add(U.boxC, xf(-14, 92, 3, 15, 30, 2, 0.1, 0.2, 0.16), r[0], r[1], r[2]);
  return B;
}



/* ═══════════════ v49 — BİYOM AĞAÇLARI ═══════════════════════════
   Kullanıcı: "haritalardaki ağaçların görüntüsü çok kötü; biyoma uygun yeni
   tasarımlar." 1:1 teşhis: eski ağaçlar 44° tepeden bakan kamerada ÇUBUK
   okunuyordu — kuru meşe yapraksız dal demeti, çam 10-27 birimlik ince
   koniler, selvi ölü gövde. Tepeden bakışta ağacı TAÇ taşır.

   DİL (CR diyoraması): tıknaz, iri TAÇ öbekleri (yontulmuş küre puf),
   üç ton (koyu çekirdek · ana · ışık alan tepe), belirgin gövde dibi,
   zemine pişen taç gölgesi (arenaPaint · T.crown). Her harita İKİ tür
   taşır: \`agac\` iri (≈190) + \`fidan\` küçük eşi (≈115) — sıralı yol ağacı,
   koru ve çit gibi düzenlemelerin ritmi iki boydan doğar.
   Renk PALETTEN (C.*) ve v47 süs aksanlarından okunur (kural 3); ışık
   yayan parça (kor, kristal, yıldız meyvesi) \`em\` ile kendi ışığıdır.
   Üçgen bütçesi: iri ≤ ~1300, fidan ≤ ~700; düşük kademede puflar
   alt çözünürlüklü küreye düşer (LITE). ═══════════════════════════ */
const mixc = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const _UP = new THREE.Vector3(0, 1, 0), _TD = new THREE.Vector3(), _TQ = new THREE.Quaternion(),
  _TM = new THREE.Matrix4(), _TP = new THREE.Vector3(), _TS = new THREE.Vector3();
/** yön vektörü: yatay açı a, dikeyden sapma t (radyan) */
const dirOf = (a, t) => [Math.cos(a) * Math.sin(t), Math.cos(t), Math.sin(a) * Math.sin(t)];
/** +Y'yi d yönüne çeviren dönüşüm (en kısa dönüş: yerel +x dışa-aşağı düşer) */
function xq(x, y, z, sx, sy, sz, d) {
  _TD.set(d[0], d[1], d[2]).normalize();
  _TQ.setFromUnitVectors(_UP, _TD);
  return _TM.compose(_TP.set(x, y, z), _TQ, _TS.set(sx, sy, sz));
}
/** taç pufu — lo: alt çözünürlüklü küre (yan puflar) */
function puff(B, x, y, z, r, c, seed, sq, amp, lo, em) {
  const g = (lo || LITE) ? U.sphLo : U.sph;
  addOc(B, g, { amp: amp == null ? 0.15 : amp, fa: 3, fh: 2.4, seed: seed || 0, top: 1 },
    xf(x, y, z, r, r * (sq || 0.86), r, 0, (seed || 0) * 1.3, 0), c, em);
}
/** gövde: dipten y0'dan h boyunca daralan, eğilen */
function bark(B, h, r0, r1, c, seed, bend, bendZ, y0, seg) {
  const g = new THREE.CylinderGeometry(r1, r0, h, seg || 8, 1).translate(0, h / 2, 0);
  addO(B, g, { amp: 0.09, fa: 3, fh: 3.2, seed: seed || 1, top: h, bend: bend || 0, bendZ: bendZ || 0 },
    xf(0, y0 || 0, 0, 1, 1, 1, 0, (seed || 0) * 0.7, 0), c[0], c[1], c[2]);
  g.dispose();
}
/** kök payandaları: ağacı yere BASTIRAN düzensiz genişleme */
function roots(B, n, rad, len, c, seed) {
  for (let i = 0; i < n; i++) {
    const an = (i / n) * TAU + (seed || 0.7), ln = len * (0.8 + (i % 3) * 0.18);
    addO(B, U.cone6, { amp: 0.28, fa: 3, seed: i * 2.1 + (seed || 0), flare: 0.18, top: 1 },
      xf(Math.cos(an) * rad, 0, Math.sin(an) * rad, 7.5 + (i % 2) * 3, ln, 7, Math.sin(an) * 0.55, an, Math.cos(an) * -0.55),
      c[0], c[1], c[2]);
  }
}
/** dal: p'den d yönünde; bend > 0 dışa sarkar, < 0 yukarı kıvrılır. Uç döner. */
function limb(B, p, len, r0, r1, d, c, seed, bend, em) {
  const g = new THREE.CylinderGeometry(r1, r0, len, 6, 1).translate(0, len / 2, 0);
  addO(B, g, { amp: 0.12, fa: 3, fh: 2.6, seed: seed || 0, top: len, bend: bend || 0 },
    xq(p[0], p[1], p[2], 1, 1, 1, d), c[0], c[1], c[2], em);
  g.dispose();
  const L = Math.hypot(d[0], d[1], d[2]) || 1;
  return [p[0] + d[0] / L * len, p[1] + d[1] / L * len, p[2] + d[2] / L * len];
}
function shard(B, p, w, h, d, c, em, seed) {
  addOc(B, U.cone4, { amp: 0.03, fa: 2, seed: seed || 0, top: 1 }, xq(p[0], p[1], p[2], w, h, w, d), c, em);
}

/* ── 1 MEZARLIK: YAS SÖĞÜDÜ (iri) · MEZAR SERVİSİ (fidan) ──
   Göletin söğüdü: kubbe taç + çevresinden sarkan saç perdesi (rüzgârda
   uçları en az, tepesi en çok oynar). Servi: yol kenarının kara alevi —
   tepeden uzun koyu bir elips, sıra hâlinde "yol" der. */
function tWillow(B) {
  const bk = mixc(C.ahsapKoyu, C.tasKoyu, 0.35), g0 = C.yaprakKoyu, g1 = C.yaprak, g2 = mul(C.yaprak, 1.24);
  roots(B, 5, 9, 22, mul(C.toprak, 0.9), 0.4);
  bark(B, 76, 15, 9, bk, 1.3, 0.05, 0.02);
  limb(B, [0, 62, 0], 42, 9, 4.5, dirOf(2.6, 0.62), bk, 2.1, 0.06);
  limb(B, [2, 58, 0], 40, 9, 4.5, dirOf(-0.4, 0.66), bk, 3.4, 0.06);
  puff(B, 0, 124, -4, 46, g1, 0.3, 0.72);
  for (let i = 0; i < 6; i++) {
    const a = i / 6 * TAU + 0.4;
    puff(B, Math.cos(a) * 36, 110 + (i % 2) * 8, Math.sin(a) * 30, 28 + (i % 3) * 3, i % 2 ? g0 : g1, i * 1.7, 0.74, 0.16, true);
  }
  puff(B, -10, 150, -8, 26, g2, 5.1, 0.7, 0.14, true);
  puff(B, 14, 146, 6, 19, g2, 6.3, 0.72, 0.14, true);
  for (let i = 0; i < 16; i++) {
    const a = i / 16 * TAU + (i % 2) * 0.2, r = 49 + (i % 3) * 4, len = 46 + (i % 4) * 9, y = 118 - (i % 2) * 6;
    addOc(B, U.cone6, { amp: 0.2, fa: 2, seed: i * 0.9, top: 1 },
      xf(Math.cos(a) * r, y, Math.sin(a) * r * 0.86, 8, len, 8, Math.PI + Math.sin(a) * 0.12, a, Math.cos(a) * 0.12), i % 3 ? g1 : g0);
  }
  return B;
}
function tCypress(B) {
  const bk = mul(C.ahsapKoyu, 1.05), d = mul(C.yaprakKoyu, 0.95), m = C.yaprak, l = mul(C.yaprak, 1.22);
  roots(B, 3, 5, 12, mul(C.toprak, 0.9), 1.1);
  bark(B, 24, 7, 5, bk, 0.8);
  const col = [[20, 19, 30], [46, 18, 30], [72, 15, 27], [94, 11, 22], [110, 7, 15]];
  for (let i = 0; i < col.length; i++) {
    const y = col[i][0], r = col[i][1], h = col[i][2];
    addOc(B, U.sph, { amp: 0.13, fa: 3, fh: 2, seed: i * 1.3, top: 1 }, xf(0, y + h * 0.5, 0, r, h * 0.64, r, 0, i, 0), i % 2 ? d : m);
  }
  puff(B, -8, 60, -6, 10, l, 2.2, 0.9, 0.12, true);
  puff(B, -5, 90, -5, 8, l, 3.4, 0.9, 0.12, true);
  addOc(B, U.cone6, { amp: 0.1, fa: 3, seed: 4, top: 1 }, xf(0, 118, 0, 5, 16, 5, 0, 0.3, 0), m);
  return B;
}

/* ── 2 KÜL: KÖMÜRLEŞMİŞ AĞAÇ · İÇİ YANAN KÜTÜK ──
   Yaprak YOK (burası yanıyor); okumayı siluet + KOR ÇATLAĞI taşır: gövdede
   ışıyan yarıklar, dal uçlarında için için yanan kor, dipte kor yatağı. */
function tCharred(B) {
  const ch = mul(C.ahsapKoyu, 0.95), chL = mul(C.ahsap, 0.82), kor = C.camMavi, hot = C.cam;
  roots(B, 5, 10, 24, mul(C.tasKoyu, 0.9), 0.2);
  bark(B, 98, 17, 8, ch, 2.2, 0.06, -0.03);
  for (let i = 0; i < 4; i++) {
    const y = 18 + i * 19, a = 1.3 + i * 0.85, r = 15.4 - i * 1.7;
    B.addc(U.box, xf(Math.cos(a) * r, y, Math.sin(a) * r, 2.2, 13 + (i % 2) * 7, 2.2, 0.1, -a, 0.16 * (i % 2 ? 1 : -1)), i ? kor : hot, true);
  }
  const LB = [[3.9, 0.95, 52, 74], [0.6, 0.85, 48, 82], [2.2, 0.55, 42, 92], [5.2, 0.78, 38, 68]];
  for (let i = 0; i < LB.length; i++) {
    const a = LB[i][0], tl = LB[i][1], len = LB[i][2], y = LB[i][3];
    const p0 = [Math.cos(a) * 5, y, Math.sin(a) * 5];
    addOc(B, U.sphLo, { amp: 0.24, fa: 3, seed: i + 4, top: 1 }, xf(p0[0] * 0.6, y, p0[2] * 0.6, 10, 9, 10, 0, a, 0), ch);
    const tip = limb(B, p0, len, 7, 3, dirOf(a, tl), ch, i * 1.9, 0.08);
    for (let j = 0; j < 2; j++) {
      const t2 = limb(B, tip, len * (j ? 0.42 : 0.56), 3, 1.1, dirOf(a + (j ? 0.8 : -0.7), tl * 0.7 + 0.2), chL, i * 3 + j, 0.12);
      if ((i + j) % 2 === 0) addOc(B, U.sphT, { amp: 0.2, fa: 2, seed: i, top: 1 }, xf(t2[0], t2[1], t2[2], 3.4, 3.4, 3.4, 0, 0, 0), kor, true);
    }
  }
  for (let i = 0; i < 6; i++) {
    const a = i * 1.05 + 0.3, r = 21 + (i % 2) * 6;
    addOc(B, U.sphLo, { amp: 0.3, fa: 2, seed: i, top: 1 }, xf(Math.cos(a) * r, 1.4, Math.sin(a) * r, 6, 3, 5, 0, a, 0), i % 2 ? kor : mul(C.tasKoyu, 0.8), i % 2 === 1);
  }
  return B;
}
function tCharredS(B) {
  const ch = mul(C.ahsapKoyu, 0.95), kor = C.camMavi;
  roots(B, 4, 7, 15, mul(C.tasKoyu, 0.9), 1.4);
  bark(B, 48, 14, 10, ch, 3.1, 0.04);
  for (let i = 0; i < 4; i++) {
    const a = i * 1.6 + 0.2;
    addOc(B, U.cone4, { amp: 0.12, fa: 2, seed: i, top: 1 }, xf(Math.cos(a) * 5.5, 44, Math.sin(a) * 5.5, 5, 10 + i * 4, 5, 0.12, a, -0.1), ch);
  }
  limb(B, [3, 36, 2], 30, 4, 1.4, dirOf(0.3, 0.9), ch, 2, 0.1);
  B.addc(U.box, xf(0, 14, 11, 2.4, 18, 2.4, 0.05, 0, 0.1), kor, true);
  B.addc(U.box, xf(8, 26, 7, 2, 12, 2, 0.05, -0.8, -0.1), C.cam, true);
  addOc(B, U.cyl8, { amp: 0.05, fa: 2, seed: 3, top: 1 }, xf(0, 47, 0, 9, 1.5, 9, 0, 0, 0), kor, true);
  for (let i = 0; i < 4; i++) {
    const a = i * 1.6 + 1, r = 16 + (i % 2) * 5;
    addOc(B, U.sphLo, { amp: 0.3, fa: 2, seed: i + 3, top: 1 }, xf(Math.cos(a) * r, 1.2, Math.sin(a) * r, 5, 2.6, 4.2, 0, a, 0), i % 2 ? kor : mul(C.tasKoyu, 0.8), i % 2 === 1);
  }
  return B;
}

/* ── 3 BATAKLIK: BATAK SELVİSİ · MANGROV ──
   Selvi: şişkin payandalı dip + sudan çıkan "diz"ler + katlı DÜZ taç +
   sarkan yosun. Mangrov: kavisli ayak kökleri üstünde yuvarlak taç. */
function tBaldCypress(B) {
  const bk = C.ahsap, bkD = C.ahsapKoyu, g0 = C.yaprakKoyu, g1 = C.yaprak, g2 = mul(C.yaprak, 1.2);
  const moss = mixc(C.yaprakKoyu, C.kemik, 0.35);
  lath(B, [[0, 0], [30, 0], [23, 6], [15, 18], [11, 34], [10, 50]], 10, xf(0, 0, 0, 1, 1, 1, 0, 0.3, 0), bkD, { amp: 0.14, fa: 5, fh: 1.4, seed: 1.1 });
  bark(B, 72, 10, 7, bk, 2.4, 0.03, 0, 46);
  for (let i = 0; i < 5; i++) {
    const a = i * 1.3 + 0.5, r = 38 + (i % 2) * 8;
    addOc(B, U.cone6, { amp: 0.25, fa: 2, seed: i, flare: 0.3, top: 1 }, xf(Math.cos(a) * r, 0, Math.sin(a) * r, 5, 12 + (i % 3) * 4, 5, 0, a, 0), bkD);
  }
  limb(B, [0, 96, 0], 40, 5, 2.5, dirOf(0.8, 1.2), bk, 1, 0.05);
  limb(B, [0, 104, 0], 36, 5, 2.5, dirOf(3.6, 1.15), bk, 2, 0.05);
  const LAY = [[118, 52, 5, 0.46, g0], [140, 42, 4, 0.5, g1], [160, 28, 3, 0.56, g2]];
  for (let k = 0; k < LAY.length; k++) {
    const y = LAY[k][0], R = LAY[k][1], n = LAY[k][2], sq = LAY[k][3], c = LAY[k][4];
    puff(B, 0, y, 0, R * 0.64, c, y * 0.1, sq);
    for (let i = 0; i < n; i++) {
      const a = i / n * TAU + y * 0.05;
      puff(B, Math.cos(a) * R * 0.62, y - 2, Math.sin(a) * R * 0.55, R * 0.44, c, i + y, sq * 1.05, 0.16, true);
    }
  }
  for (let i = 0; i < 10; i++) {
    const a = i / 10 * TAU + 0.3, r = 36 + (i % 3) * 6;
    addOc(B, U.cone4, { amp: 0.2, fa: 2, seed: i, top: 1 }, xf(Math.cos(a) * r, 114, Math.sin(a) * r, 4, 28 + (i % 3) * 8, 3, Math.PI, a, 0), moss);
  }
  return B;
}
function tMangrove(B) {
  const bk = C.ahsap, g0 = C.yaprakKoyu, g1 = C.yaprak, g2 = mul(C.yaprak, 1.2);
  for (let i = 0; i < 6; i++) {
    const a = i / 6 * TAU + 0.3;
    const g = new THREE.CylinderGeometry(1.6, 2.8, 40, 5, 1).translate(0, 20, 0);
    addO(B, g, { amp: 0.1, fa: 2, seed: i, top: 40, bend: -0.28 },
      xq(Math.cos(a) * 26, 0, Math.sin(a) * 26, 1, 1, 1, [-Math.cos(a) * 0.62, 1, -Math.sin(a) * 0.62]), bk[0], bk[1], bk[2]);
    g.dispose();
  }
  bark(B, 52, 7, 5, bk, 1.7, 0.04, 0, 30);
  puff(B, 0, 88, 0, 30, g1, 0.4, 0.78);
  puff(B, -18, 80, 8, 20, g0, 1.2, 0.8, 0.15, true);
  puff(B, 18, 82, -6, 21, g0, 2.2, 0.8, 0.15, true);
  puff(B, -6, 104, -6, 18, g2, 3.1, 0.8, 0.15, true);
  return B;
}

/* ── 4 KATEDRAL: SAKSI DEFNE (iri) · SAKSI MERSİN (fidan) ──
   Nefin içi: ağaç ancak MERMER SAKSIDA durur. Kırpılmış (düşük genlik)
   ponpon küreler + öküz kanı kuşak + altın tepelik: nef boyunca sıralı
   saksılar "düzenli" demenin en kısa yolu. Ayak izi saksının kendisi. */
function planter(B, w, h) {
  B.addc(U.box, xf(0, 0, 0, w, 5, w, 0, 0, 0), C.tasKoyu);
  B.addc(U.box, xf(0, 4, 0, w * 0.9, h - 6, w * 0.9, 0, 0, 0), C.mermer);
  B.addc(U.box, xf(0, h * 0.42, 0, w * 0.93, 3.2, w * 0.93, 0, 0, 0), C.kiremit);
  B.addc(U.box, xf(0, h - 3, 0, w * 1.05, 4, w * 1.05, 0, 0, 0), C.mermer);
  B.addc(U.box, xf(0, h + 0.6, 0, w * 0.86, 1.4, w * 0.86, 0, 0, 0), mul(C.toprak, 0.8));
}
function tTopiary(B) {
  const g1 = mul(C.yaprak, 1.12), g2 = mul(C.yaprak, 1.34);
  planter(B, 40, 26);
  tcyl(B, 3, 4.2, 40, 6, xf(0, 26, 0, 1, 1, 1, 0, 0, 0), mul(C.ahsapKoyu, 1.1));
  puff(B, 0, 74, 0, 32, g1, 0.4, 0.92, 0.07);
  puff(B, 0, 122, 0, 25, g1, 1.3, 0.92, 0.07);
  puff(B, 0, 158, 0, 16, g2, 2.1, 0.95, 0.07);
  B.addc(U.sphT, xf(0, 176, 0, 4, 4, 4, 0, 0, 0), C.altin);
  return B;
}
function tTopiaryS(B) {
  planter(B, 26, 20);
  tcyl(B, 2.2, 3, 26, 6, xf(0, 20, 0, 1, 1, 1, 0, 0, 0), mul(C.ahsapKoyu, 1.1));
  puff(B, 0, 60, 0, 21, mul(C.yaprak, 1.12), 0.7, 0.92, 0.07);
  puff(B, 0, 88, 0, 13, mul(C.yaprak, 1.34), 1.6, 0.95, 0.07);
  B.addc(U.sphT, xf(0, 102, 0, 3, 3, 3, 0, 0, 0), C.altin);
  return B;
}

/* ── 5 HİÇLİK: KRİSTAL AĞAÇ · KRİSTAL FİDAN ──
   Hiçlikte canlı yok: taşlaşmış soluk gövde, dal uçlarında soğuk ışık
   veren kristal kümeleri. Tek ışık kaynağı kristalin çekirdeği. */
function tCrystal(B) {
  const st = C.mermer, stD = C.tasSicak, cr = C.cam, cr2 = C.camMavi;
  roots(B, 4, 8, 18, C.tasKoyu, 0.9);
  bark(B, 82, 13, 7, st, 3.3, 0.07, 0.04);
  for (let i = 0; i < 4; i++) {
    const a = i * 1.57 + 0.4;
    const tip = limb(B, [Math.cos(a) * 4, 64 + i * 7, Math.sin(a) * 4], 44, 5.5, 2.2, dirOf(a, 0.75), stD, i * 2.3, 0.06);
    shard(B, tip, 5, 20, dirOf(a, 0.35), cr2, false, i);
    shard(B, [tip[0] - Math.cos(a) * 4, tip[1] - 2, tip[2] - Math.sin(a) * 4], 3.6, 13, dirOf(a + 1.2, 0.5), cr2, false, i + 3);
    if (i % 2 === 0) shard(B, [tip[0], tip[1] - 1, tip[2]], 2.6, 11, dirOf(a - 1, 0.2), cr, true, i + 6);
  }
  const top = [2, 92, 0];
  shard(B, top, 8, 34, [0.12, 1, 0.05], cr, true, 1);
  for (let i = 0; i < 5; i++) {
    const a = i / 5 * TAU + 0.2;
    shard(B, [top[0] + Math.cos(a) * 5, top[1] - 2, top[2] + Math.sin(a) * 5], 5, 22 - (i % 2) * 5, dirOf(a, 0.55), i % 2 ? cr2 : mul(cr2, 0.86), false, i + 9);
  }
  return B;
}
function tCrystalS(B) {
  const st = C.mermer, cr = C.cam, cr2 = C.camMavi;
  addOc(B, U.cone4, { amp: 0.06, fa: 2, seed: 0.5, top: 1 }, xf(0, 0, 0, 14, 62, 14, 0, 0.4, 0), st);
  addOc(B, U.cone4, { amp: 0.06, fa: 2, seed: 1.5, top: 1 }, xf(9, 0, 5, 7, 30, 7, 0.1, 1.2, -0.2), C.tasSicak);
  const p = [0, 58, 0];
  shard(B, p, 6, 30, [0.1, 1, 0], cr, true, 2);
  for (let i = 0; i < 3; i++) { const a = i * 2.1 + 0.6; shard(B, [Math.cos(a) * 4, 54, Math.sin(a) * 4], 4, 18, dirOf(a, 0.6), cr2, false, i + 3); }
  return B;
}

/* ── 6 GÖKÇE ADA: RÜZGÂR ÇAMI · ALTIN ÇİÇEKLİ FİDAN ──
   Tek yaşayan harita: rüzgâra yatık gövde, bulut budamalı (bonsai) yastık
   taçlar; fidan altın çiçek (v47 çiçek aksanı) açar. */
function tWindPine(B) {
  const bk = C.ahsap, g0 = C.yaprakKoyu, g1 = C.yaprak, g2 = mul(C.yaprak, 1.22);
  roots(B, 5, 9, 20, mul(C.toprak, 0.9), 0.3);
  bark(B, 112, 14, 7, bk, 1.9, 0.24, 0.04);
  const pad = (p, R, seed) => {
    puff(B, p[0], p[1], p[2], R, g1, seed, 0.44);
    puff(B, p[0] - R * 0.56, p[1] - 3, p[2] + R * 0.24, R * 0.66, g0, seed + 1, 0.46, 0.15, true);
    puff(B, p[0] + R * 0.6, p[1] + 3, p[2] - R * 0.26, R * 0.6, g2, seed + 2, 0.46, 0.15, true);
  };
  pad(limb(B, [8, 70, 0], 58, 6, 3, dirOf(0.1, 1.25), bk, 1, 0.06), 30, 1);
  pad(limb(B, [14, 90, 0], 42, 5, 2.5, dirOf(3.0, 1.1), bk, 2, 0.06), 24, 4);
  pad(limb(B, [20, 102, 0], 38, 5, 2.4, dirOf(1.7, 1.0), bk, 3, 0.06), 22, 7);
  pad([28, 128, -2], 30, 10);
  pad([24, 150, 0], 17, 13);
  return B;
}
function tBlossom(B) {
  const bk = C.ahsap, g0 = C.yaprakKoyu, g1 = C.yaprak, bl = rgb(0xe6c65a), bl2 = rgb(0xdcd8cc);
  roots(B, 3, 6, 12, mul(C.toprak, 0.9), 0.6);
  bark(B, 44, 7, 4.5, bk, 2.1, 0.06);
  limb(B, [0, 38, 0], 24, 4, 2, dirOf(2.4, 0.8), bk, 1, 0.05);
  limb(B, [0, 34, 0], 22, 4, 2, dirOf(-0.3, 0.9), bk, 2, 0.05);
  puff(B, 0, 76, 0, 28, g1, 0.5, 0.8);
  puff(B, -18, 66, 6, 18, g0, 1.2, 0.8, 0.15, true);
  puff(B, 17, 68, -4, 18, g0, 2.2, 0.8, 0.15, true);
  for (let i = 0; i < 12; i++) {
    const a = i * 2.4, e = 0.25 + (i % 4) * 0.18, r = 27;
    addOc(B, U.sphT, { amp: 0.1, fa: 2, seed: i, top: 1 },
      xf(Math.cos(a) * Math.cos(e) * r, 76 + Math.sin(e) * r * 0.8, Math.sin(a) * Math.cos(e) * r, 5 + (i % 3), 4 + (i % 3), 5 + (i % 3), 0, a, 0), i % 3 ? bl : bl2);
  }
  return B;
}

/* ── 7 TUZLA: TUZLU AKASYA · TUZ ÇALISI ──
   Kurumuş gölün şemsiye akasyası: üç dala ayrılan gövde, geniş DÜZ taç,
   dibinde tuz kabuğu ve kristaller. Çalı: burulmuş ince dallar + kül yeşili
   puflar. */
function tAcacia(B) {
  const bk = mul(C.ahsapKoyu, 1.1), g0 = C.yaprakKoyu, g1 = C.yaprak, g2 = mul(C.yaprak, 1.18), salt = C.mermer;
  addOc(B, U.sphLo, { amp: 0.18, fa: 3, seed: 0.4, top: 1 }, xf(0, 0, 0, 30, 7, 26, 0, 0.3, 0), salt);
  bark(B, 62, 12, 7, bk, 2.6, 0.08, -0.03);
  const L = [[0.4, 0.7, 62], [2.5, 0.75, 58], [4.4, 0.62, 52]];
  for (let i = 0; i < L.length; i++) limb(B, [Math.cos(L[i][0]) * 3, 56, Math.sin(L[i][0]) * 3], L[i][2], 6, 3, dirOf(L[i][0], L[i][1]), bk, i * 1.3, 0.05);
  const cy = 142;
  puff(B, 0, cy, 0, 40, g1, 0.3, 0.32);
  for (let i = 0; i < 6; i++) {
    const a = i / 6 * TAU + 0.3;
    puff(B, Math.cos(a) * 44, cy - 3, Math.sin(a) * 38, 26, i % 2 ? g0 : g1, i + 1, 0.36, 0.16, true);
  }
  puff(B, -14, cy + 8, -8, 24, g2, 9, 0.38, 0.16, true);
  for (let i = 0; i < 4; i++) { const a = i * 1.6 + 0.8; shard(B, [Math.cos(a) * 22, 2, Math.sin(a) * 22], 3, 9 + i * 2, dirOf(a, 0.35), salt, false, i); }
  return B;
}
function tSaltShrub(B) {
  const bk = mul(C.ahsapKoyu, 1.15), g1 = mixc(C.yaprak, C.mermer, 0.25), g0 = C.yaprakKoyu, salt = C.mermer;
  addOc(B, U.sphLo, { amp: 0.2, fa: 3, seed: 1.1, top: 1 }, xf(0, 0, 0, 22, 5, 20, 0, 0.6, 0), salt);
  for (let i = 0; i < 5; i++) {
    const a = i / 5 * TAU + 0.4;
    const tip = limb(B, [Math.cos(a) * 3, 2, Math.sin(a) * 3], 34 + (i % 3) * 8, 3.4, 1.4, dirOf(a, 0.5 + (i % 2) * 0.25), bk, i * 1.7, 0.14);
    puff(B, tip[0], tip[1] + 2, tip[2], 12 + (i % 2) * 3, i % 2 ? g0 : g1, i, 0.7, 0.18, true);
  }
  puff(B, 0, 52, 0, 15, g1, 7, 0.75, 0.18, true);
  for (let i = 0; i < 3; i++) { const a = i * 2.2 + 0.3; shard(B, [Math.cos(a) * 17, 1, Math.sin(a) * 17], 2.6, 8 + i * 2, dirOf(a, 0.3), salt, false, i + 2); }
  return B;
}

/* ── 8 BUZUL: KARLI KÖKNAR · KIRAĞILI FİDAN ──
   Eski çamın 10-27'lik ince katları GENİŞLEDİ (50'ye) ve her kat kar
   şapkası taşır (kar 0x96aab6 — v43 "beyaz disk" tavanı). */
function tSnowFir(B) {
  const bk = C.ahsapKoyu, g0 = C.yaprakKoyu, g1 = C.yaprak, sn = SNOW, snD = mul(SNOW, 0.86);
  bark(B, 36, 10, 7, bk, 1.2);
  const T = [[26, 50, 58], [64, 42, 50], [98, 32, 44], [128, 22, 36], [152, 13, 28]];
  for (let i = 0; i < T.length; i++) {
    const y = T[i][0], r = T[i][1], h = T[i][2];
    addOc(B, U.cone8, { amp: 0.2, fa: 4, fh: 2.4, seed: i * 1.7, ampY: 0.04, top: 1 }, xf(0, y, 0, r, h, r, 0, i * 0.6, 0), i % 2 ? g0 : g1);
    addOc(B, U.cone8, { amp: 0.16, fa: 4, fh: 2.4, seed: i * 1.7 + 0.5, ampY: 0.03, top: 1 },
      xf(0, y + h * 0.44, 0, r * 0.64, h * 0.6, r * 0.64, 0, i * 0.6 + 0.2, 0), i % 2 ? snD : sn);
  }
  addOc(B, U.cone6, { amp: 0.1, fa: 3, seed: 9, top: 1 }, xf(0, 172, 0, 6, 18, 6, 0, 0.4, 0.02), sn);
  addOc(B, U.sphLo, { amp: 0.2, fa: 3, seed: 2, top: 1 }, xf(0, 0, 0, 34, 5, 30, 0, 0, 0), snD);
  return B;
}
function tFrostFir(B) {
  const bk = C.ahsapKoyu, g0 = C.yaprakKoyu, g1 = C.yaprak, sn = SNOW, ice = mul(C.camMavi, 0.74);
  bark(B, 22, 6, 4.5, bk, 1.6);
  const T = [[16, 30, 36], [42, 24, 32], [66, 16, 26], [86, 9, 18]];
  for (let i = 0; i < T.length; i++) {
    const y = T[i][0], r = T[i][1], h = T[i][2];
    addOc(B, U.cone8, { amp: 0.2, fa: 4, fh: 2.4, seed: i * 2.1, ampY: 0.04, top: 1 }, xf(0, y, 0, r, h, r, 0, i * 0.7, 0), i % 2 ? g0 : g1);
    addOc(B, U.cone8, { amp: 0.16, fa: 4, seed: i * 2.1 + 0.5, ampY: 0.03, top: 1 }, xf(0, y + h * 0.46, 0, r * 0.62, h * 0.58, r * 0.62, 0, i * 0.7 + 0.2, 0), sn);
    if (i < 3) for (let k = 0; k < 3; k++) {
      const a = k * 2.1 + i;
      addOc(B, U.cone4, { amp: 0.05, fa: 2, seed: k, top: 1 }, xf(Math.cos(a) * r * 0.86, y + 3, Math.sin(a) * r * 0.86, 1.8, 8 + k * 2, 1.8, Math.PI, a, 0), ice);
    }
  }
  addOc(B, U.sphLo, { amp: 0.2, fa: 3, seed: 3, top: 1 }, xf(0, 0, 0, 22, 4, 19, 0, 0.4, 0), mul(SNOW, 0.86));
  return B;
}

/* ── 9 KEMİK BAHÇESİ: KEMİK AĞACI · KABURGA FİLİZİ ──
   Omur omur yükselen gövde, KABURGA gibi yukarı kıvrılan dallar, dal
   uçlarında kuru zeytin yaprağı öbeği. Göz/yüz YOK (v38 dersi). */
function tBoneTree(B) {
  const bn = C.kemik, bnD = mul(C.kemik, 0.74), jt = C.tasKoyu, lf = C.yaprak, lfD = C.yaprakKoyu;
  addOc(B, U.sphLo, { amp: 0.2, fa: 3, seed: 1, top: 1 }, xf(0, 0, 0, 28, 8, 25, 0, 0, 0), mul(C.toprak, 0.9));
  for (let i = 0; i < 7; i++) {
    const y = 4 + i * 13, r = 13 - i * 0.9, ox = Math.sin(i * 0.6) * 2;
    addOc(B, U.cyl8, { amp: 0.08, fa: 3, seed: i, top: 1 }, xf(ox, y, 0, r, 10, r * 0.9, 0, i * 0.5, 0.03), bn);
    addOc(B, U.cyl8, { amp: 0.04, fa: 3, seed: i + 10, top: 1 }, xf(ox, y + 10, 0, r * 0.7, 3, r * 0.64, 0, 0, 0), jt);
    if (i % 2 && i < 6) addOc(B, U.cone4, { amp: 0.05, fa: 2, seed: i, top: 1 }, xq(ox - r * 0.8, y + 5, 0, 2.6, 9, 2.6, [-1, 0.5, 0]), bnD);
  }
  for (let i = 0; i < 5; i++) {
    const a = i / 5 * TAU + 0.5, y = 70 + (i % 3) * 10;
    const tip = limb(B, [Math.cos(a) * 6, y, Math.sin(a) * 6], 56, 3.8, 1.8, dirOf(a, 1.05), bn, i, -0.32);
    puff(B, tip[0], tip[1] + 4, tip[2], 15 + (i % 2) * 4, i % 2 ? lfD : lf, i * 1.7, 0.66, 0.2, true);
    addOc(B, U.sphT, { amp: 0.05, fa: 2, seed: i, top: 1 }, xf(tip[0] * 0.55, y + 22, tip[2] * 0.55, 3, 3, 3, 0, 0, 0), bnD);
  }
  puff(B, 2, 108, 0, 20, lf, 9, 0.7, 0.2, true);
  return B;
}
function tBoneSprout(B) {
  const bn = C.kemik, jt = C.tasKoyu, lf = C.yaprak;
  addOc(B, U.sphLo, { amp: 0.2, fa: 3, seed: 2, top: 1 }, xf(0, 0, 0, 20, 6, 18, 0, 0.4, 0), mul(C.toprak, 0.9));
  for (let i = 0; i < 3; i++) {
    const y = 3 + i * 10, r = 8 - i;
    addOc(B, U.cyl8, { amp: 0.06, fa: 3, seed: i, top: 1 }, xf(0, y, 0, r, 8, r * 0.9, 0, i, 0), bn);
    addOc(B, U.cyl8, { amp: 0.04, fa: 3, seed: i + 5, top: 1 }, xf(0, y + 8, 0, r * 0.7, 2.4, r * 0.66, 0, 0, 0), jt);
  }
  for (let i = 0; i < 3; i++) {
    const a = i / 3 * TAU + 0.8;
    const tip = limb(B, [Math.cos(a) * 3, 30, Math.sin(a) * 3], 44, 3, 1.4, dirOf(a, 0.9), bn, i + 2, -0.36);
    if (i === 0) puff(B, tip[0], tip[1] + 3, tip[2], 12, lf, 3, 0.66, 0.2, true);
  }
  return B;
}

/* ── 10 GÖK ÇARKI: PİRİNÇ SAAT AĞACI · YILDIZ FİLİZİ ──
   Mekanizmanın ağacı: dişli kaide, kuşaklı pirinç gövde, verdigris yaprak
   PULLARI, uçlarda ışıyan yıldız meyvesi, tacı kuşatan yörünge halkası. */
function tBrass(B) {
  const br = C.demir, brD = C.demirKoyu, vg = C.yaprak, vgD = C.yaprakKoyu, st = C.camMavi;
  addOc(B, U.cyl12, { amp: 0.02, fa: 3, seed: 0.4, top: 1 }, xf(0, 0, 0, 22, 6, 22, 0, 0, 0), C.tasKoyu);
  for (let i = 0; i < 10; i++) { const a = i / 10 * TAU; B.addc(U.box, xf(Math.cos(a) * 22, 0, Math.sin(a) * 22, 6, 5, 6, 0, -a, 0), brD); }
  tcyl(B, 6, 9, 92, 8, xf(0, 6, 0, 1, 1, 1, 0, 0, 0), br, false, { amp: 0.05, fa: 3, seed: 1.2, bend: 0.03 });
  for (const y of [22, 48, 74]) addOc(B, U.cyl8, { amp: 0.02, fa: 2, seed: y, top: 1 }, xf(0, y, 0, 9 - y * 0.03, 3, 9 - y * 0.03, 0, 0, 0), brD);
  const disc = (p, r, a, c) => addOc(B, U.cyl12, { amp: 0.03, fa: 2, seed: a, top: 1 }, xq(p[0], p[1], p[2], r, 1.8, r, [Math.cos(a) * 0.35, 1, Math.sin(a) * 0.35]), c);
  for (let i = 0; i < 5; i++) {
    const a = i / 5 * TAU + 0.3, y = 68 + i * 8;
    const tip = limb(B, [Math.cos(a) * 4, y, Math.sin(a) * 4], 42, 3.2, 1.8, dirOf(a, 0.95), br, i, 0.04);
    disc(tip, 16, a, i % 2 ? vg : vgD);
    disc([tip[0] * 0.7, tip[1] + 10, tip[2] * 0.7], 11, a + 1, mul(vg, 1.12));
    if (i % 2 === 0) B.addc(U.sphT, xf(tip[0], tip[1] - 9, tip[2], 3.6, 3.6, 3.6, 0, 0, 0), st, true);
  }
  disc([0, 112, 0], 20, 0, vg); disc([0, 124, 0], 13, 1, mul(vg, 1.16));
  addOc(B, U.cone4, { amp: 0, fa: 2, seed: 0, top: 1 }, xf(0, 131, 0, 5, 13, 5, 0, 0.785, 0), st, true);
  addOc(B, U.cone4, { amp: 0, fa: 2, seed: 0, top: 1 }, xf(0, 131, 0, 5, 9, 5, Math.PI, 0.785, 0), st, true);
  const tor = new THREE.TorusGeometry(46, 1.6, 5, 32);
  addO(B, tor, { amp: 0, fa: 2, seed: 0, top: 1 }, xf(0, 104, 0, 1, 1, 1, 1.25, 0.3, 0.15), brD[0] * 1.2, brD[1] * 1.2, brD[2] * 1.2);
  tor.dispose();
  return B;
}
function tStarSprout(B) {
  const br = C.demir, brD = C.demirKoyu, vg = C.yaprak, st = C.camMavi;
  addOc(B, U.cyl12, { amp: 0.02, fa: 3, seed: 0.9, top: 1 }, xf(0, 0, 0, 14, 5, 14, 0, 0, 0), C.tasKoyu);
  tcyl(B, 3, 5, 62, 6, xf(0, 5, 0, 1, 1, 1, 0, 0, 0), br, false, { amp: 0.05, fa: 3, seed: 2.2, bend: 0.04 });
  addOc(B, U.cyl8, { amp: 0.02, fa: 2, seed: 3, top: 1 }, xf(0, 30, 0, 5.4, 2.6, 5.4, 0, 0, 0), brD);
  const disc = (x, y, z, r, a, c) => addOc(B, U.cyl12, { amp: 0.03, fa: 2, seed: a, top: 1 }, xq(x, y, z, r, 1.6, r, [Math.cos(a) * 0.4, 1, Math.sin(a) * 0.4]), c);
  disc(10, 46, 2, 11, 0.3, vg); disc(-9, 54, -3, 10, 2.6, mul(vg, 0.86)); disc(2, 64, 8, 9, 4.4, mul(vg, 1.14));
  addOc(B, U.cone4, { amp: 0, fa: 2, seed: 0, top: 1 }, xf(0, 70, 0, 4.5, 12, 4.5, 0, 0.785, 0), st, true);
  addOc(B, U.cone4, { amp: 0, fa: 2, seed: 0, top: 1 }, xf(0, 70, 0, 4.5, 8, 4.5, Math.PI, 0.785, 0), st, true);
  return B;
}

const TREE_STYLE = {
  mezarlik: [tWillow, tCypress], kul: [tCharred, tCharredS], bataklik: [tBaldCypress, tMangrove],
  katedral: [tTopiary, tTopiaryS], hiclik: [tCrystal, tCrystalS], gokada: [tWindPine, tBlossom],
  tuzla: [tAcacia, tSaltShrub], buzul: [tSnowFir, tFrostFir], kemikbahce: [tBoneTree, tBoneSprout],
  gokcark: [tBrass, tStarSprout],
};
function treeBig(B) { return (TREE_STYLE[PID] || TREE_STYLE.mezarlik)[0](B); }
function treeSmall(B) { return (TREE_STYLE[PID] || TREE_STYLE.mezarlik)[1](B); }

const BUILDERS = {
  kupa, fener, kemik, kazan, plaka, tuzsutun, disli, kafatasi, totem, yuva,
  agac: (B) => treeBig(B), fidan: (B) => treeSmall(B),
};

/* ── GEOMETRİ ÖNBELLEĞİ: PALET BAŞINA BİR SET ───────────────────
   Albedo vertex'e PİŞER (materyal unlit kalmak ZORUNDA — CLAUDE.md), yani
   palet değişince geometri yeniden pişer. Maliyet GÖREV BAŞINA BİR KEZ
   ödenir (perde arkasında) ve sıcak döngüde SIFIRDIR: kare başına hiçbir
   şey değişmez, çizim çağrısı ve üçgen sayısı aynen kalır.

   NEDEN SHADER UNIFORM TABLOSU DEĞİL: `uPal[matId]` ile tek geometri seti
   de yazılabilirdi (daha az bellek) ama bu YENİ BİR SHADER PROGRAMI demek —
   ısıtma kaydı (kural 5), dinamik indeksli uniform dizisi ve mobil sürücü
   riski. Bu yol hiçbir shader'a dokunmuyor.

   LRU = 2: geçerli harita + öncesi. Ölüp aynı göreve yeniden giren oyuncu
   pişirmeyi İKİNCİ KEZ ödemez. On paletin hepsini açık tutmak ~40 MB
   tampon demekti — 2 GB'lık telefonda WebView'i öldüren şey tam olarak bu
   tür sessiz birikimdir (bkz. doku bütçesi dersi).                      */
const CACHE = new Map();
const CACHE_MAX = 2;

/* ── DÜŞÜK KADEME: PAHSIZ (v44) ──
   Pah her kutuyu 12 → 44 üçgene çıkarıyor; v43 harita başına 27-55k
   üçgen ölçtü. 'low' kademede kutular pahsız kurulur (~%60-70 daha az
   üçgen, siluet ve ayak izi AYNI — çarpışma değişmez). Kenar ışığı
   kaybolur, değer rampası ve AO kalır. Önbellek anahtarı kademeyi taşır. */
let LITE = false;
export function setPropDetail(lite) { LITE = !!lite; }

/** Bir paletin arketip geometrileri. palId geçersizse mezarlık. */
export function propGeometries(palId) {
  const id = PALETTES[palId] ? palId : 'mezarlik';
  const key = id + (LITE ? '~lite' : '');
  const hit = CACHE.get(key);
  if (hit) { CACHE.delete(key); CACHE.set(key, hit); return hit; }   // LRU: tazele
  C = PALETTES[id];
  PID = id;
  const set = {};
  for (const k in BUILDERS) set[k] = BUILDERS[k](new Builder()).geo();
  CACHE.set(key, set);
  while (CACHE.size > CACHE_MAX) {
    const old = CACHE.keys().next().value;
    const dead = CACHE.get(old);
    CACHE.delete(old);
    for (const k in dead) dead[k].dispose();
  }
  return set;
}

/** Escort NPC geometrisi (ayrı: örneklenmiyor, tek mesh). */
let HUMAN = null;
export function humanGeometry() {
  if (!HUMAN) HUMAN = insan(new Builder()).geo();
  return HUMAN;
}

/* ── KALKAN İSTASYONU (kurtarma görevi) — v43 ─────────────────────
   Kubbe tek başına "havada duran beyaz yarım küre" okunuyordu: onu
   ÜRETEN bir şey yoktu. Dört yayıcı kaide kubbenin çeperinde durur
   (sekizgen taş · altın bant · iki gümüş dikme · altın başlık · aralarında
   süzülen IŞIKLI buz kristali). Paletten bağımsız: görev işareti on
   haritada aynı okunur. Yarıçap render tarafındaki kubbe ile AYNI sayıdan
   (SHIELD_R) türer — iki yerde iki sayı yaşamaz. */
export const SHIELD_R = 132;
let SHIELD = null, GEM = null;
export function shieldBaseGeometry() {
  if (SHIELD) return SHIELD;
  const B = new Builder();
  const st = rgb(0x4a4f5c), stL = rgb(0x6a7080), sil = rgb(0xa9b4c4), au = rgb(0xe8b04a), cr = rgb(0xbfeaff);
  for (let i = 0; i < 4; i++) {
    const a = i * TAU / 4 + TAU / 8, R = SHIELD_R + 6;
    const x = Math.cos(a) * R, z = Math.sin(a) * R, tx = -Math.sin(a), tz = Math.cos(a);
    addOc(B, U.cyl8, { amp: 0.06, fa: 3, seed: i }, xf(x, 0, z, 13, 6, 13, 0, a, 0), st);
    B.addc(U.cyl8, xf(x, 5.5, z, 9.5, 5, 9.5, 0, a, 0), stL);
    B.addc(U.cylC12, xf(x, 10.2, z, 9.9, 1.6, 9.9, 0, 0, 0), au);
    for (const q of [-1, 1]) {
      tcyl(B, 1.5, 2.4, 28, 6, xf(x + tx * q * 5.6, 10, z + tz * q * 5.6, 1, 1, 1, 0, 0, 0), sil);
      B.addc(U.sphT, xf(x + tx * q * 5.6, 38.8, z + tz * q * 5.6, 2.6, 2.6, 2.6, 0, 0, 0), au);
    }
    B.addc(U.cone4, xf(x, 25, z, 4.6, 11, 4.6, 0, a, 0), cr, true);
    B.addc(U.cone4, xf(x, 25, z, 4.6, 8, 4.6, Math.PI, -a, 0), cr, true);
  }
  SHIELD = B.geo();
  return SHIELD;
}
/** Kubbe tepesindeki süzülen mücevher: y = GEM_Y merkezli pişer (temas
    karartması ona dokunmasın), mesh y − GEM_Y ile konumlanır. */
export const GEM_Y = 40;
export function shieldGemGeometry() {
  if (GEM) return GEM;
  const B = new Builder();
  const au = rgb(0xe8b04a), cr = rgb(0xbfeaff);
  B.addc(U.cone4, xf(0, GEM_Y, 0, 7, 11, 7, 0, 0, 0), cr, true);
  B.addc(U.cone4, xf(0, GEM_Y, 0, 7, 13, 7, Math.PI, 0, 0), cr, true);
  const r = new THREE.TorusGeometry(10.5, 1.3, 4, 20);
  r.rotateX(Math.PI / 2);
  B.addc(r, xf(0, GEM_Y, 0, 1, 1, 1, 0, 0, 0), au);
  r.dispose();
  for (let i = 0; i < 4; i++) {
    const a = i * TAU / 4;
    B.addc(U.cone4, xf(Math.cos(a) * 10.5, GEM_Y, Math.sin(a) * 10.5, 1.6, 4.5, 1.6, 0, a, 0), au);
  }
  GEM = B.geo();
  return GEM;
}

/** Üçgen sayımı — `_hdtest` ölçüm tezgahı için. */
/* v47 — SÜS KİTİ: decorModels aynı Builder/ışık/palet sözleşmesini kullanır
   (yazılan renk ekranda görülen renktir; kopya yardımcı YAZILMAZ). */
export const PROP_KIT = {
  Builder, U, xf, rgb, addO, addOc, tcyl, lath, mul,
  pal: (id) => PALETTES[id] || PALETTES.mezarlik,
  lite: () => LITE,
};

export function propTriCounts(palId) {
  const G = propGeometries(palId);
  const out = {};
  for (const k in G) out[k] = G[k].attributes.position.count / 3;
  return out;
}
