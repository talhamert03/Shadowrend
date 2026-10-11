/* ═══════════════════════════════════════════════════════════
   propAlign.js — SÜZÜLEN SİLAH HİZALAYICI

   NEDEN VAR: Tripo/Meshy prop ihraçları eksene hizalı GELMEZ.
   Gece Kraliçesi'nin taç kılıcı model uzayında ÇAPRAZ duruyor
   (uzun ekseni X ile Y arasında), Kaptan'ın topu hafif eğik.
   Eski hizalama yöntemi (sınır kutusunun en uzun KENARINI seç)
   böyle bir modelde yanlış eksen seçer: kılıç savuruşta yana
   yatar, namlu hedefi göstermez.

   Bu dosya köşe bulutunun BİRİNCİL EKSENİNİ (PCA — kovaryans
   matrisinde power iteration) bulup +X'e döndürür, modeli hedef
   uzunluğa ölçekler ve orijine ortalar. Kaynak geometri sadece
   OKUNUR; dönüşüm modelin kendi transformuna yazılır.

   Hangi ucun "iş ucu" olduğu geometriden güvenilir çıkarılamaz
   (kılıcın ucu ince, ama tabancanın namlusu da kabzası da kalın)
   — o yüzden çağıran taraf `flip` ile açıkça söyler.
   ═══════════════════════════════════════════════════════════ */

/**
 * @param {*} THREE
 * @param {THREE.Object3D} model  hizalanacak model (yerinde değiştirilir)
 * @param {number} targetLen      +X ekseninde hedef uzunluk (dünya birimi)
 * @param {Object} opts           { flip:boolean } — iş ucunu −X'ten +X'e çevir
 * @returns {{axis:number[], len:number, thickPlus:number, thickMinus:number}}
 */
export function alignLongAxisToX(THREE, model, targetLen, opts = {}) {
  model.updateMatrixWorld(true);

  /* 1) SEYRELTİLMİŞ KÖŞE BULUTU — 700k üçgenlik modelde tüm köşeleri
     dolaşmak gereksiz; eksen yönü için ~4000 örnek fazlasıyla yeter. */
  const pts = [];
  const v = new THREE.Vector3();
  model.traverse((o) => {
    if (!o.isMesh || !o.geometry || !o.geometry.attributes || !o.geometry.attributes.position) return;
    const pos = o.geometry.attributes.position;
    const step = Math.max(1, Math.floor(pos.count / 4000));
    for (let i = 0; i < pos.count; i += step) {
      v.fromBufferAttribute(pos, i).applyMatrix4(o.matrixWorld);
      pts.push(v.x, v.y, v.z);
    }
  });
  const n = pts.length / 3;
  if (n < 8) return { axis: [1, 0, 0], len: 1, thickPlus: 0, thickMinus: 0 };

  let mx = 0, my = 0, mz = 0;
  for (let i = 0; i < n; i++) { mx += pts[i * 3]; my += pts[i * 3 + 1]; mz += pts[i * 3 + 2]; }
  mx /= n; my /= n; mz /= n;

  /* 2) KOVARYANS + POWER ITERATION → baskın eksen */
  let cxx = 0, cyy = 0, czz = 0, cxy = 0, cxz = 0, cyz = 0;
  for (let i = 0; i < n; i++) {
    const x = pts[i * 3] - mx, y = pts[i * 3 + 1] - my, z = pts[i * 3 + 2] - mz;
    cxx += x * x; cyy += y * y; czz += z * z;
    cxy += x * y; cxz += x * z; cyz += y * z;
  }
  let ax = 1, ay = 0.3, az = 0.1;
  for (let it = 0; it < 28; it++) {
    const nx = cxx * ax + cxy * ay + cxz * az;
    const ny = cxy * ax + cyy * ay + cyz * az;
    const nz = cxz * ax + cyz * ay + czz * az;
    const L = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;
    ax = nx / L; ay = ny / L; az = nz / L;
  }
  const axis = new THREE.Vector3(ax, ay, az).normalize();

  /* 3) EKSENİ +X'E DÖNDÜR (model kendi ebeveyn uzayında döner) */
  const q = new THREE.Quaternion().setFromUnitVectors(axis, new THREE.Vector3(1, 0, 0));
  model.quaternion.premultiply(q);
  if (opts.flip) {
    /* Y ekseninde 180°: +X ↔ −X. Bıçağın/namlunun yassı yüzü ±Z'de kalır. */
    model.quaternion.premultiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI));
  }
  model.updateMatrixWorld(true);

  /* 4) HEDEF UZUNLUĞA ÖLÇEKLE + ORİJİNE ORTALA */
  const b1 = new THREE.Box3().setFromObject(model);
  const s1 = new THREE.Vector3(); b1.getSize(s1);
  const len = s1.x;
  if (targetLen) {
    model.scale.multiplyScalar(targetLen / Math.max(0.0001, len));
    model.updateMatrixWorld(true);
  }
  const b2 = new THREE.Box3().setFromObject(model);
  model.position.set(
    model.position.x - (b2.min.x + b2.max.x) / 2,
    model.position.y - (b2.min.y + b2.max.y) / 2,
    model.position.z - (b2.min.z + b2.max.z) / 2);
  model.updateMatrixWorld(true);

  /* 5) İKİ YARININ ORTALAMA KALINLIĞI — çağıran tarafın `flip` kararını
     doğrulaması için (ince uç = bıçak ucu, kalın uç = kabza). */
  let cP = 0, cM = 0, tP = 0, tM = 0;
  const mid = (b2.min.x + b2.max.x) / 2;
  for (let i = 0; i < n; i++) {
    /* örnekler hizalamadan ÖNCE toplandı: aynı dönüşü uygula */
    v.set(pts[i * 3], pts[i * 3 + 1], pts[i * 3 + 2]).applyQuaternion(q);
    const r = Math.hypot(v.y, v.z);
    if (v.x > (mid !== 0 ? 0 : 0)) { cP++; tP += r; } else { cM++; tM += r; }
  }
  return {
    axis: [axis.x, axis.y, axis.z],
    len,
    thickPlus: tP / Math.max(1, cP),
    thickMinus: tM / Math.max(1, cM),
  };
}
