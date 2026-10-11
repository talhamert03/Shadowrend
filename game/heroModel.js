/* ═══════════════════════════════════════════════════════════
   heroModel.js — İSKELETLİ KAHRAMAN MODELİ SADELEŞTİRİCİ

   NEDEN BU DOSYA VAR
   Tripo/Meshy'den gelen kahraman ihraçları ham hâlde oyuna
   sokulamaz. SEHER modeli örneği:
     • 390.376 üçgen (kahraman bütçesi ~10k), 224.773 köşe
     • 41 kemikli iskelet + 1.83 sn'lik tek klip
     • 2048² gömülü doku, Draco sıkıştırmalı
   Bu hâliyle her karede ~400k köşe deri-dönüşümünden geçer;
   orta seviye telefonda tek başına 60 fps'i öldürür ve ~35 MB
   köşe tamponu ayırır.

   petBird.js aynı işi DURAĞAN bir dekor için yapıyordu ve
   iskeleti atıyordu. Kahramanda iskelet ATILAMAZ — yürüme
   animasyonu ondan gelir. Bu dosyanın farkı:

     1. KÜMELEME DERİYİ KORUR. Köşe kümeleme anahtarına hücre
        kimliğinin yanına BASKIN KEMİK indeksi de girer. Böylece
        kola ait bir köşe gövdeye ait komşusuyla ASLA kaynamaz —
        yoksa animasyonda kol gövdeye yapışık gerilirdi.
     2. TAM SAHNE ÖNBELLEĞE YAZILIR. Sadeleşmiş geometri + kemik
        ağacı + bind matrisleri + animasyon kliplerinin tamamı
        IndexedDB'ye yazılır. İkinci açılışta ağ YOK, Draco
        çözme YOK: ~700 KB tipik veri okunur, iskelet yeniden
        kurulur, ~15 ms.
     3. Ham veri GPU'ya HİÇ yüklenmez (ilk açılışta bile).

   Google Play öncesi: bu adımı çevrimdışı boru hattına taşı
   (assets/seher/seher.hmesh) — o zaman ilk açılıştaki 2.6 MB
   indirme + Draco çözme de kalmaz.
   ═══════════════════════════════════════════════════════════ */

import { punchAlbedo } from './charLook.js?v=20260930m';

const DB_NAME = 'kh-assets';
const STORE = 'mesh';
const FORMAT = 13;  // önbellek sürümü: sadeleştirme parametreleri değişirse artır
/* 11 → 12: albedo pişirme pasosu eklendi (charLook.punchAlbedo).
   12 → 13: paso parlaklığı koruyacak şekilde yeniden ölçüldü (ort. 63 → 63,
   yerel kontrast 37 → 49). Bir pasonun PARAMETRESİ değişince de sürüm artar,
   yoksa cihazda ara sürümle pişmiş doku sessizce kalır. */
const PROP_FORMAT = 1;   // iskeletsiz aksesuar (silah) önbellek sürümü — hero FORMAT'tan bağımsız

/* ── IndexedDB (petBird.js ile aynı depo) ─────────────────── */

function openDB() {
  return new Promise((resolve, reject) => {
    if (!self.indexedDB) return reject(new Error('IndexedDB yok'));
    const rq = indexedDB.open(DB_NAME, 1);
    rq.onupgradeneeded = () => {
      const db = rq.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    rq.onsuccess = () => resolve(rq.result);
    rq.onerror = () => reject(rq.error);
  });
}

async function idbGet(key) {
  try {
    const db = await openDB();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly');
      const rq = tx.objectStore(STORE).get(key);
      rq.onsuccess = () => resolve(rq.result || null);
      rq.onerror = () => reject(rq.error);
    });
  } catch (e) { return null; }
}

async function idbPut(key, val) {
  try {
    const db = await openDB();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put(val, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (e) { /* yazılamadıysa sorun değil: sonraki açılışta yine sadeleştirir */ }
}

/** Aynı kahramanın ESKİ FORMAT kayıtlarını sil. FORMAT her parametre
    değişikliğinde arttığı için temizlenmezse cihazda her sürümden bir
    kopya (∼700 KB) birikir. */
async function idbPurgeOld(prefix, keep) {
  try {
    const db = await openDB();
    const keys = await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly');
      const rq = tx.objectStore(STORE).getAllKeys();
      rq.onsuccess = () => resolve(rq.result || []);
      rq.onerror = () => reject(rq.error);
    });
    const dead = keys.filter((k) => typeof k === 'string' && k.startsWith(prefix) && k !== keep);
    if (!dead.length) return;
    await new Promise((resolve) => {
      const tx = db.transaction(STORE, 'readwrite');
      for (const k of dead) tx.objectStore(STORE).delete(k);
      tx.oncomplete = resolve;
      tx.onerror = resolve;
    });
  } catch (e) { /* temizlik başarısız olsa oyun etkilenmez */ }
}

/* ── DERİ KORUYAN KÖŞE KÜMELEME ───────────────────────────── */

/**
 * @param {Object} A  { pos, nor, uv, si, sw, idx } kaynak öznitelikler
 * @param {number} N  en uzun eksende hücre sayısı (büyük = daha ince)
 * @param {number} headFrom  0-1: bu yükseklik oranının ÜSTÜ ince ızgara alır
 */
function clusterSkinned(A, N, headFrom) {
  const pos = A.pos, nor = A.nor, uv = A.uv, si = A.si, sw = A.sw, idx = A.idx;
  const nv = pos.length / 3;

  let minx = Infinity, miny = Infinity, minz = Infinity;
  let maxx = -Infinity, maxy = -Infinity, maxz = -Infinity;
  for (let i = 0; i < nv; i++) {
    const x = pos[i * 3], y = pos[i * 3 + 1], z = pos[i * 3 + 2];
    if (x < minx) minx = x; if (x > maxx) maxx = x;
    if (y < miny) miny = y; if (y > maxy) maxy = y;
    if (z < minz) minz = z; if (z > maxz) maxz = z;
  }
  const span = Math.max(maxx - minx, maxy - miny, maxz - minz);
  const cell = span / N;
  const fineCell = cell * 0.44;            // yüz bütçenin öncelikli harcandığı yer
  const headY = miny + (maxy - miny) * headFrom;

  const gx = Math.min(1023, Math.ceil((maxx - minx) / fineCell) + 2);
  const gy = Math.min(1023, Math.ceil((maxy - miny) / fineCell) + 2);

  /* İKİ KADEMELİ KÜMELEME — çatlaksız + doku sadık:
       kademe 1 (KONUM)  : anahtar = hücre + baskın kemik. Konum ortalaması
                           BURADA yapılır, yani bir yüzey noktası tek bir
                           konuma sahiptir.
       kademe 2 (ÖZNİTELİK): anahtar = kademe-1 kümesi + UV kovası. Doku
                           dikişleri ayrı köşelere bölünür AMA konumları
                           aynı kalır.
     Tek kademeli (UV'yi konum anahtarına katan) sürüm, dikiş boyunca iki
     ayrı ortalama konum üretiyordu; modelin üstünde siyah çatlaklar
     görünüyordu. */
  const posMap = new Map();
  const remapPos = new Int32Array(nv);
  let pcap = 8192;
  let pacc = new Float32Array(pcap * 4);   // [sx,sy,sz,n]
  let pcount = 0;

  const domArr = new Uint8Array(nv);
  const bwArr = new Float32Array(nv);
  for (let i = 0; i < nv; i++) {
    let dom = si[i * 4], bw = sw[i * 4];
    for (let k = 1; k < 4; k++) {
      const w = sw[i * 4 + k];
      if (w > bw) { bw = w; dom = si[i * 4 + k]; }
    }
    domArr[i] = dom & 63; bwArr[i] = bw;

    const x = pos[i * 3], y = pos[i * 3 + 1], z = pos[i * 3 + 2];
    const fine = y > headY;
    const c = fine ? fineCell : cell;
    const ix = ((x - minx) / c) | 0, iy = ((y - miny) / c) | 0, iz = ((z - minz) / c) | 0;
    const cellKey = (fine ? 1 : 0) + 2 * (ix + gx * (iy + gy * iz));
    const key = cellKey * 64 + domArr[i];
    let ci = posMap.get(key);
    if (ci === undefined) {
      if (pcount === pcap) { pcap *= 2; const b = new Float32Array(pcap * 4); b.set(pacc); pacc = b; }
      ci = pcount++; posMap.set(key, ci);
    }
    const o = ci * 4;
    pacc[o] += x; pacc[o + 1] += y; pacc[o + 2] += z; pacc[o + 3] += 1;
    remapPos[i] = ci;
  }
  const cPos = new Float32Array(pcount * 3);
  for (let i = 0; i < pcount; i++) {
    const o = i * 4, k = 1 / pacc[o + 3];
    cPos[i * 3] = pacc[o] * k; cPos[i * 3 + 1] = pacc[o + 1] * k; cPos[i * 3 + 2] = pacc[o + 2] * k;
  }

  const vMap = new Map();
  const remapVert = new Int32Array(nv);
  let vcap = 8192;
  let vacc = new Float32Array(vcap * 8);   // [nx,ny,nz,u,v,n,bestW,bestVert]
  const vCid = new Int32Array(vcap);
  let vcount = 0;
  let vCidArr = vCid;
  for (let i = 0; i < nv; i++) {
    const cid = remapPos[i];
    const uq = ((uv[i * 2] * 10) | 0) & 63, vq = ((uv[i * 2 + 1] * 10) | 0) & 63;
    const key = (cid * 64 + uq) * 64 + vq;
    let vi = vMap.get(key);
    if (vi === undefined) {
      if (vcount === vcap) {
        vcap *= 2;
        const b = new Float32Array(vcap * 8); b.set(vacc); vacc = b;
        const bc = new Int32Array(vcap); bc.set(vCidArr); vCidArr = bc;
      }
      vi = vcount++; vMap.set(key, vi);
      vCidArr[vi] = cid;
      vacc[vi * 8 + 7] = i;
    }
    const o = vi * 8;
    vacc[o] += nor[i * 3]; vacc[o + 1] += nor[i * 3 + 1]; vacc[o + 2] += nor[i * 3 + 2];
    vacc[o + 3] += uv[i * 2]; vacc[o + 4] += uv[i * 2 + 1];
    vacc[o + 5] += 1;
    if (bwArr[i] > vacc[o + 6]) { vacc[o + 6] = bwArr[i]; vacc[o + 7] = i; }
    remapVert[i] = vi;
  }

  const outPos = new Float32Array(vcount * 3);
  const outNor = new Float32Array(vcount * 3);
  const outUv = new Float32Array(vcount * 2);
  const outSi = new Uint16Array(vcount * 4);
  const outSw = new Float32Array(vcount * 4);
  for (let i = 0; i < vcount; i++) {
    const o = i * 8, k = 1 / vacc[o + 5], cid = vCidArr[i];
    outPos[i * 3] = cPos[cid * 3]; outPos[i * 3 + 1] = cPos[cid * 3 + 1]; outPos[i * 3 + 2] = cPos[cid * 3 + 2];
    const nx = vacc[o], ny = vacc[o + 1], nz = vacc[o + 2];
    const L = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;
    outNor[i * 3] = nx / L; outNor[i * 3 + 1] = ny / L; outNor[i * 3 + 2] = nz / L;
    outUv[i * 2] = vacc[o + 3] * k; outUv[i * 2 + 1] = vacc[o + 4] * k;
    /* deri ağırlıkları ortalanmaz (bozuk karışım verir): kümedeki EN
       BASKIN köşenin dörtlüsü aynen alınır. */
    const src = vacc[o + 7] | 0;
    let wsum = 0;
    for (let c2 = 0; c2 < 4; c2++) { outSi[i * 4 + c2] = si[src * 4 + c2]; wsum += sw[src * 4 + c2]; }
    const inv = wsum > 0 ? 1 / wsum : 0;
    for (let c2 = 0; c2 < 4; c2++) outSw[i * 4 + c2] = sw[src * 4 + c2] * inv;
  }

  const tri = new Uint32Array(idx.length);
  let t = 0;
  for (let i = 0; i < idx.length; i += 3) {
    const i0 = idx[i], i1 = idx[i + 1], i2 = idx[i + 2];
    /* dejenerelik testi KONUM kümesinde yapılır: aynı noktaya düşen
       üçgen atılır, UV'den bölünmüş köşeler üçgeni öldürmez. */
    const p0 = remapPos[i0], p1 = remapPos[i1], p2 = remapPos[i2];
    if (p0 === p1 || p1 === p2 || p0 === p2) continue;
    tri[t++] = remapVert[i0]; tri[t++] = remapVert[i1]; tri[t++] = remapVert[i2];
  }
  const IdxArr = vcount > 65535 ? Uint32Array : Uint16Array;
  const outIdx = new IdxArr(t);
  for (let i = 0; i < t; i++) outIdx[i] = tri[i];
  return { pos: outPos, nor: outNor, uv: outUv, si: outSi, sw: outSw, idx: outIdx, verts: vcount, tris: t / 3 };
}

/** Hedef üçgen sayısına EN YAKIN ızgarayı arar (parça başına ≤5 kümeleme).

    NEDEN GEREKLİ: eski sürüm sabit bir ızgara listesini (34→118) baştan
    tarayıp hedefi İLK AŞAN sonuçta duruyordu. Tek ağlı bir kahramanda bu
    çalışır; ÇOK PARÇALI modelde (KRALİÇE: 13 parça) her parçanın bütçe payı
    küçüktür ve en kaba ızgara olan 34 bile payı kat kat aşıyordu — 30k
    hedeflenen model 88k üçgen çıkıyordu.

    Yeni yöntem: hücre başına düşen üçgen sayısı ≈ sabit varsayımıyla
    N₀ ≈ √(hedef/20) tahmini yapılır, sonra sonuç bandın (0.8×–1.6×)
    dışındaysa N büyütülüp küçültülerek en fazla 5 denemede yakınsanır. */
function fitCluster(A, target, headFrom) {
  let N = Math.max(8, Math.min(150, Math.round(Math.sqrt(Math.max(1, target) / 20))));
  let best = null, bestErr = Infinity;
  for (let step = 0; step < 5; step++) {
    const out = clusterSkinned(A, N, headFrom);
    const err = Math.abs(out.tris - target) / Math.max(1, target);
    if (err < bestErr) { bestErr = err; best = out; }
    if (out.tris >= target * 0.8 && out.tris <= target * 1.6) return out;
    /* kümeleme monotondur: N büyürse üçgen artar */
    N = out.tris < target ? Math.min(220, Math.round(N * 1.45)) : Math.max(6, Math.round(N * 0.7));
  }
  return best;
}

/* ── DOKU KÜÇÜLTME ────────────────────────────────────────── */

async function shrinkTexture(image, size, punch) {
  const w = image.width || image.naturalWidth, h = image.height || image.naturalHeight;
  const s = Math.min(1, size / Math.max(w, h));
  const cv = document.createElement('canvas');
  cv.width = Math.max(1, Math.round(w * s));
  cv.height = Math.max(1, Math.round(h * s));
  const ctx = cv.getContext('2d');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(image, 0, 0, cv.width, cv.height);
  /* ALBEDO PASOSU — yalnız baseColor'da (normal haritasında kroma/kontrast
     düzeltmesi yüzey normallerini bozar). Pişirme anında bir kez çalışır ve
     sonuç WebP olarak IndexedDB'ye girer: sahada kare başına maliyet SIFIR. */
  if (punch) { try { punchAlbedo(cv); } catch (e) { console.warn('[heroModel] albedo pasosu atlandı', e); } }
  /* kalite 0.86 → 0.95: deri ve kumaş geçişlerinde WebP blok bozulması
     kahramanın yüzünde açıkça görünüyordu (dosya 101 → ~190 KB, kabul). */
  const blob = await new Promise((res) => {
    if (cv.toBlob) cv.toBlob((b) => res(b), 'image/webp', 0.95); else res(null);
  });
  return { blob, canvas: cv };
}

/* ── SAHNE AĞACI SERİLEŞTİRME ─────────────────────────────── */

/** @param {Map<string,number>} meshIdx  ağ uuid'i → parça indeksi
    (ÇOK PARÇALI kahramanlar için: Tripo bazı ihraçları 13 ayrı iskeletli
    ağ + 13 materyal olarak verir — bkz. KRALİÇE). */
function serializeNode(o, meshIdx) {
  const mi = meshIdx.get(o.uuid);
  const n = {
    n: o.name,
    k: mi !== undefined ? 'mesh' : (o.isBone ? 'bone' : 'obj'),
    t: [o.position.x, o.position.y, o.position.z],
    q: [o.quaternion.x, o.quaternion.y, o.quaternion.z, o.quaternion.w],
    s: [o.scale.x, o.scale.y, o.scale.z],
    c: [],
  };
  if (mi !== undefined) n.mi = mi;
  for (const ch of o.children) {
    if (ch.isBone || ch.isMesh || ch.isObject3D) n.c.push(serializeNode(ch, meshIdx));
  }
  return n;
}

/* Kök hareketini (root motion) söker: klip karakteri İLERİ TAŞIYORSA
   oyunda model oyuncunun altından kayıp gider — konum oyun mantığından
   gelir, klipten değil. Kök kemiğin konum izinde X/Z ilk karede
   dondurulur; Y (zıplama/nefes) korunur. */
/* Kök hareketini (root motion) söker: klip karakteri İLERİ TAŞIYORSA
   oyunda model oyuncunun altından kayıp gider — konum oyun mantığından
   gelir, klipten değil.

   X/Z ve Y'nin TAMAMI ilk kareye dondurulur. Y'yi korumak (zıplama/nefes
   kalsın diye) mantıklı görünüyordu ama Tripo'nun yürüme klibi kalçayı
   döngü boyunca yukarı taşıyor: karakter yürüdükçe havaya çıkıyor,
   durunca yere iniyordu. Yürüyüş zaten yerinde oynanacağı için dikey
   kök hareketi de sökülür; nefes/salınım kalça ALTI kemiklerde durur. */
export function stripRootMotion(clip, rootNames) {
  for (const tr of clip.tracks) {
    if (!/\.position$/.test(tr.name)) continue;
    const node = tr.name.slice(0, tr.name.lastIndexOf('.'));
    if (!rootNames.has(node)) continue;
    const v = tr.values;
    const x0 = v[0], y0 = v[1], z0 = v[2];
    for (let i = 0; i < v.length; i += 3) { v[i] = x0; v[i + 1] = y0; v[i + 2] = z0; }
  }
}

function serializeClips(THREE, clips) {
  const out = [];
  for (const clip of clips) {
    const tracks = [];
    for (const tr of clip.tracks) {
      tracks.push({
        n: tr.name,
        y: tr.ValueTypeName === 'quaternion' ? 'q' : 'v',
        ti: Float32Array.from(tr.times).buffer,
        va: Float32Array.from(tr.values).buffer,
      });
    }
    out.push({ name: clip.name, duration: clip.duration, tracks });
  }
  return out;
}

function rebuildClips(THREE, data) {
  const clips = [];
  for (const c of data) {
    const tracks = [];
    for (const t of c.tracks) {
      const times = new Float32Array(t.ti), values = new Float32Array(t.va);
      tracks.push(t.y === 'q'
        ? new THREE.QuaternionKeyframeTrack(t.n, times, values)
        : new THREE.VectorKeyframeTrack(t.n, times, values));
    }
    clips.push(new THREE.AnimationClip(c.name, c.duration, tracks));
  }
  return clips;
}

/* ── DIŞ ARAYÜZ ───────────────────────────────────────────── */

/**
 * Sadeleştirilmiş, iskeleti ve klipleri korunmuş kahraman modeli.
 * @param {*} THREE
 * @param {*} loaders  { GLTFLoader, DRACOLoader } — çağıran zaten import etmiş
 * @param {string} url GLB yolu
 * @param {Object} opts { key, targetTris, texSize, headFrom }
 * NOT: Seher 34k üçgende çalışıyor (varsayılan 22k). Bu, CLAUDE.md'deki
 * ~10k kahraman bütçesinin üstünde BİLİNÇLİ bir takastır: 20k'da yüz ve
 * zırh detayı tepeden kamerada okunmuyordu. Sahne toplamı ~136k üçgen /
 * 47 çizim çağrısı. Yeni ağır kahraman eklenirse bu pay yeniden ölçülmeli.
 * @returns {Promise<{ model, animations, tris, cached }>}
 */
export async function loadDecimatedHero(THREE, loaders, url, opts = {}) {
  const key = 'hero:' + (opts.key || url) + ':f' + FORMAT;
  const prefix = 'hero:' + (opts.key || url) + ':f';
  idbPurgeOld(prefix, key);          // eski sürüm kayıtlarını arka planda temizle
  const targetTris = opts.targetTris || 22000;
  const texSize = opts.texSize || 1024;
  const headFrom = opts.headFrom != null ? opts.headFrom : 0.74;

  /* 1) ÖNBELLEK — ağ yok, Draco yok */
  const hit = await idbGet(key);
  if (hit && hit.f === FORMAT) {
    try { return buildFromCache(THREE, hit); }
    catch (e) { console.warn('kahraman önbelleği bozuk, yeniden sadeleştiriliyor', e); }
  }

  /* 2) HAM MODEL — yalnız ilk açılışta */
  const loader = new loaders.GLTFLoader();
  const draco = new loaders.DRACOLoader();
  draco.setDecoderPath(window.__SR_DRACO || 'https://www.gstatic.com/draco/versioned/decoders/1.5.7/');
  loader.setDRACOLoader(draco);
  const gltf = await loader.loadAsync(url);
  draco.dispose();

  /* ÇOK PARÇALI KAHRAMAN: bazı Tripo ihraçları tek ağ değil, her biri kendi
     materyal/dokusunu taşıyan ONLARCA iskeletli ağ verir (KRALİÇE: 13 parça,
     785k üçgen, 13 doku). Eskiden yalnız İLK ağ alınıyordu — o modelde
     karakterin sadece bir parçası görünürdü. Artık hepsi toplanır, üçgen
     bütçesi paylarına göre bölünür ve ortak iskelete bağlanır. */
  const meshes = [];
  gltf.scene.traverse((o) => { if (o.isSkinnedMesh) meshes.push(o); });
  if (!meshes.length) throw new Error('modelde iskeletli ağ yok');
  for (const m of meshes) if (!m.geometry.index) throw new Error('dizinsiz ağ desteklenmiyor');

  /* ORTAK KEMİK LİSTESİ: her parçanın kendi Skeleton nesnesi olabilir ve
     kemik SIRASI farklı olabilir. Ana liste ilk parçadan kurulur; diğer
     parçaların skinIndex değerleri bu sıraya çevrilir (yoksa kollar/başlar
     birbirinin kemiğine bağlanır). */
  const masterNames = [];
  const masterInv = [];
  const nameToIdx = new Map();
  for (const m of meshes) {
    const sk = m.skeleton;
    for (let i = 0; i < sk.bones.length; i++) {
      const nm = sk.bones[i].name;
      if (!nameToIdx.has(nm)) {
        nameToIdx.set(nm, masterNames.length);
        masterNames.push(nm);
        masterInv.push(sk.boneInverses[i]);
      }
    }
  }

  let totalSrcTris = 0;
  for (const m of meshes) totalSrcTris += m.geometry.index.count / 3;

  /* 3) SADELEŞTİR — parça başına bütçe payı, hedefe en yakın ızgara */
  const parts = [];
  let totalTris = 0;
  for (const m of meshes) {
    const g = m.geometry;
    const nv = g.attributes.position.count;
    const srcTris = g.index.count / 3;
    /* kemik indekslerini ana sıraya çevir (kopya üzerinde — kaynak bozulmaz) */
    const srcSi = g.attributes.skinIndex.array;
    const si = new Uint16Array(srcSi.length);
    const sk = m.skeleton;
    for (let i = 0; i < srcSi.length; i++) {
      const b = sk.bones[srcSi[i]];
      si[i] = b ? (nameToIdx.get(b.name) | 0) : 0;
    }
    const A = {
      pos: g.attributes.position.array,
      nor: g.attributes.normal ? g.attributes.normal.array : new Float32Array(nv * 3),
      uv: g.attributes.uv ? g.attributes.uv.array : new Float32Array(nv * 2),
      si,
      sw: g.attributes.skinWeight.array,
      idx: g.index.array,
    };
    /* pay: parçanın kaynak üçgen oranı (küçük parça ezilmesin diye taban 400) */
    const share = Math.max(400, Math.round(targetTris * (srcTris / totalSrcTris)));
    let out;
    if (srcTris <= share * 1.25) {
      /* zaten bütçenin altında: kümelemeye hiç girmez (boşa CPU harcamaz) */
      const IdxArr = nv > 65535 ? Uint32Array : Uint16Array;
      out = {
        pos: Float32Array.from(A.pos), nor: Float32Array.from(A.nor), uv: Float32Array.from(A.uv),
        si, sw: Float32Array.from(A.sw), idx: IdxArr.from(A.idx), verts: nv, tris: srcTris,
      };
    } else {
      out = fitCluster(A, share, headFrom);
    }
    totalTris += out.tris;

    /* 4) DOKU — parça başına, kaynak boyutundan büyütmez */
    const srcMat = Array.isArray(m.material) ? m.material[0] : m.material;
    let texBlob = null, texCanvas = null;
    if (srcMat && srcMat.map && srcMat.map.image) {
      const sh = await shrinkTexture(srcMat.map.image, texSize, true);
      texBlob = sh.blob; texCanvas = sh.canvas;
    }
    parts.push({
      uuid: m.uuid,
      bindMatrix: m.bindMatrix.toArray(),
      geo: {
        pos: out.pos.buffer, nor: out.nor.buffer, uv: out.uv.buffer,
        si: out.si.buffer, sw: out.sw.buffer,
        idx: out.idx.buffer, idx32: out.idx.BYTES_PER_ELEMENT === 4,
      },
      tex: texBlob,
      mat: {
        metalness: srcMat && srcMat.metalness != null ? srcMat.metalness : 0.1,
        roughness: srcMat && srcMat.roughness != null ? srcMat.roughness : 0.75,
      },
      _canvas: texCanvas,
    });
  }

  /* 3b) KÖK HAREKETİNİ SÖK */
  const rootNames = new Set(opts.rootBones || ['Root', 'Hip', 'Pelvis', 'Hips', 'Armature']);
  for (const clip of gltf.animations || []) stripRootMotion(clip, rootNames);

  /* 5) SERİLEŞTİR (kemik ağacı + bind matrisleri + klipler) */
  const meshIdx = new Map();
  for (let i = 0; i < parts.length; i++) meshIdx.set(parts[i].uuid, i);
  const bi = new Float32Array(masterNames.length * 16);
  for (let i = 0; i < masterNames.length; i++) masterInv[i].toArray(bi, i * 16);
  const canvases = parts.map((p) => p._canvas);
  for (const p of parts) delete p._canvas;
  const cacheRec = {
    f: FORMAT,
    tree: serializeNode(gltf.scene, meshIdx),
    boneNames: masterNames,
    boneInverses: bi.buffer,
    parts,
    clips: serializeClips(THREE, gltf.animations || []),
    tris: totalTris,
  };

  /* 6) YENİ MODELİ KUR — sonra ham veriyi serbest bırak */
  const built = buildFromCache(THREE, cacheRec, canvases);

  gltf.scene.traverse((o) => {
    if (o.geometry) o.geometry.dispose();
    if (o.material) {
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      for (const mt of mats) {
        for (const k of ['map', 'normalMap', 'emissiveMap', 'roughnessMap', 'metalnessMap', 'aoMap']) {
          if (mt[k]) mt[k].dispose();
        }
        mt.dispose();
      }
    }
  });

  idbPut(key, cacheRec);   // arka planda; beklenmez
  return built;
}

function buildFromCache(THREE, rec, texCanvases) {
  const parts = rec.parts;
  const geos = [], mats = [];
  for (let pi = 0; pi < parts.length; pi++) {
    const P = parts[pi];
    /* ── geometri ── */
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(P.geo.pos), 3));
    geo.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(P.geo.nor), 3));
    geo.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(P.geo.uv), 2));
    geo.setAttribute('skinIndex', new THREE.BufferAttribute(new Uint16Array(P.geo.si), 4));
    geo.setAttribute('skinWeight', new THREE.BufferAttribute(new Float32Array(P.geo.sw), 4));
    geo.setIndex(new THREE.BufferAttribute(
      P.geo.idx32 ? new Uint32Array(P.geo.idx) : new Uint16Array(P.geo.idx), 1));
    geo.computeBoundingBox();
    geo.computeBoundingSphere();
    geos.push(geo);

    /* ── doku + materyal ── */
    let tex = null;
    const canvas = texCanvases && texCanvases[pi];
    if (canvas) {
      tex = new THREE.CanvasTexture(canvas);
    } else if (P.tex) {
      const img = new Image();
      tex = new THREE.Texture(img);
      img.onload = () => { tex.needsUpdate = true; };
      img.src = URL.createObjectURL(P.tex);
    }
    if (tex) {
      if ('colorSpace' in tex) tex.colorSpace = THREE.SRGBColorSpace;
      tex.flipY = false;                 // glTF UV yönü
      /* anizotropi 4 → 12 + mipmap zinciri: tepeden bakan kamerada kahraman
         dokusu EĞİK bir yüzeye düşer; düşük anizotropide omuz ve pelerin
         dokusu lapaya dönüşüyordu. */
      tex.anisotropy = 12;
      tex.generateMipmaps = true;
      tex.minFilter = THREE.LinearMipmapLinearFilter;
      tex.magFilter = THREE.LinearFilter;
      tex.needsUpdate = true;
    }
    mats.push(new THREE.MeshStandardMaterial({
      map: tex,
      /* Tripo materyali roughness 0.9 / metalness 0 gelir. ÖNCEKİ düzeltmede
         eklenen `emissive: 0x14100c` dokunun üstüne gri bir perde çekip TÜM
         renkleri soldurdu (kullanıcı "renkleri mi soldurdun" dedi — evet).
         Öz-ışık kaldırıldı; okunurluk pürüz/metal dengesinden gelir. */
      metalness: 0.05,
      roughness: Math.min(0.62, P.mat.roughness),
    }));
  }

  /* ── ağaç ── */
  const bones = {};
  const meshList = [];
  const build = (n) => {
    let o;
    if (n.k === 'mesh') {
      const mi = n.mi | 0;
      o = new THREE.SkinnedMesh(geos[mi], mats[mi]);
      o.__partIndex = mi;
      meshList.push(o);
    } else if (n.k === 'bone') { o = new THREE.Bone(); }
    else { o = new THREE.Object3D(); }
    o.name = n.n;
    o.position.fromArray(n.t);
    o.quaternion.fromArray(n.q);
    o.scale.fromArray(n.s);
    if (n.k === 'bone') bones[n.n] = o;
    for (const ch of n.c) o.add(build(ch));
    return o;
  };
  const root = build(rec.tree);
  root.updateMatrixWorld(true);
  if (!meshList.length) throw new Error('önbellekte ağ düğümü yok');

  /* ── iskelet: TÜM parçalar tek iskeleti paylaşır (kemik dokusu bir kez
     yüklenir, çizim çağrısı başına ek maliyet yok) ── */
  const bi = new Float32Array(rec.boneInverses);
  const boneList = [], inverses = [];
  for (let i = 0; i < rec.boneNames.length; i++) {
    const b = bones[rec.boneNames[i]];
    if (!b) throw new Error('kemik bulunamadı: ' + rec.boneNames[i]);
    boneList.push(b);
    inverses.push(new THREE.Matrix4().fromArray(bi, i * 16));
  }
  const skeleton = new THREE.Skeleton(boneList, inverses);
  for (const mesh of meshList) {
    mesh.bind(skeleton, new THREE.Matrix4().fromArray(parts[mesh.__partIndex].bindMatrix));
    mesh.frustumCulled = false;          // skinned bounding-sphere culling hatalı
    mesh.castShadow = true;
    mesh.receiveShadow = true;
  }

  /* KRİTİK: SkinnedMesh'in KENDİ boundingBox'ı deri POZUNDAN hesaplanır ve
     Box3.setFromObject onu tercih eder. Hesaplanmamışsa (kemik matrisleri
     henüz güncel değilse) kutu ham geometri uzayında çıkar; çağıran taraf
     modeli ~yarım boy yukarı yerleştirir ve karakter havada yüzer.
     İskeleti bir kez güncelleyip kutuyu POZDAN hesaplıyoruz. */
  root.updateMatrixWorld(true);
  skeleton.update();
  for (const mesh of meshList) { mesh.computeBoundingBox(); mesh.computeBoundingSphere(); }

  return {
    model: root,
    animations: rebuildClips(THREE, rec.clips),
    tris: rec.tris,
    cached: !texCanvases,
  };
}

/* ── İSKELETSİZ AKSESUAR (silah/prop) SADELEŞTİRİCİ ───────────
   SAVAŞÇI'nın palası Tripo'dan İSKELETSİZ statik ağ olarak geldi (174k
   üçgen — hero bütçesinin ~5 katı, sahnede TEK obje için orantısız).
   clusterSkinned deri-korumalı kümelemeyi kemik AYRIMI için kullanır;
   statik bir prop'ta kemik yok, o yüzden SAHTE tek-kemik deri verisi
   (her köşe kemik 0'a ağırlık 1 ile bağlı) geçirilip AYNI kod yeniden
   kullanılır — ayrı bir kümeleme algoritması yazmaya gerek kalmaz. */

/**
 * @param {*} THREE
 * @param {*} loaders  { GLTFLoader, DRACOLoader }
 * @param {string} url
 * @param {Object} opts { key, targetTris, texSize, grid, metalness, roughness }
 * @returns {Promise<{ model, tris, cached }>}
 */
export async function loadDecimatedProp(THREE, loaders, url, opts = {}) {
  const key = 'prop:' + (opts.key || url) + ':f' + PROP_FORMAT;
  const prefix = 'prop:' + (opts.key || url) + ':f';
  idbPurgeOld(prefix, key);
  const targetTris = opts.targetTris || 9000;
  const texSize = opts.texSize || 1024;

  const hit = await idbGet(key);
  if (hit && hit.f === PROP_FORMAT) {
    try { return buildPropFromCache(THREE, hit); }
    catch (e) { console.warn('prop önbelleği bozuk, yeniden sadeleştiriliyor', e); }
  }

  const loader = new loaders.GLTFLoader();
  const draco = new loaders.DRACOLoader();
  draco.setDecoderPath(window.__SR_DRACO || 'https://www.gstatic.com/draco/versioned/decoders/1.5.7/');
  loader.setDRACOLoader(draco);
  const gltf = await loader.loadAsync(url);
  draco.dispose();

  let mesh = null;
  gltf.scene.traverse((o) => { if (o.isMesh && !mesh) mesh = o; });
  if (!mesh) throw new Error('prop ağı bulunamadı');
  const g = mesh.geometry;
  if (!g.index) throw new Error('dizinsiz ağ desteklenmiyor');

  const nv = g.attributes.position.count;
  const sw = new Float32Array(nv * 4);
  for (let i = 0; i < nv; i++) sw[i * 4] = 1;   // tek sahte kemik, tam ağırlık
  const A = {
    pos: g.attributes.position.array,
    nor: g.attributes.normal ? g.attributes.normal.array : new Float32Array(nv * 3),
    uv: g.attributes.uv ? g.attributes.uv.array : new Float32Array(nv * 2),
    si: new Uint16Array(nv * 4),   // hepsi kemik 0 — kümeleme yalnız konum+UV'ye göre ayrışır
    sw,
    idx: g.index.array,
  };

  let out = null;
  for (const N of opts.grid || [26, 34, 44, 56, 72, 92]) {
    out = clusterSkinned(A, N, 1.0);   // headFrom=1.0 → hep kaba ızgara (statik prop'ta "baş" yok)
    if (out.tris >= targetTris * 0.8) break;
  }

  const srcMat = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
  let texBlob = null, texCanvas = null;
  if (srcMat && srcMat.map && srcMat.map.image) {
    const sh = await shrinkTexture(srcMat.map.image, texSize);
    texBlob = sh.blob; texCanvas = sh.canvas;
  }
  let nrmBlob = null, nrmCanvas = null;
  if (srcMat && srcMat.normalMap && srcMat.normalMap.image) {
    const sh = await shrinkTexture(srcMat.normalMap.image, Math.min(texSize, 768));
    nrmBlob = sh.blob; nrmCanvas = sh.canvas;
  }

  const cacheRec = {
    f: PROP_FORMAT,
    geo: {
      pos: out.pos.buffer, nor: out.nor.buffer, uv: out.uv.buffer,
      idx: out.idx.buffer, idx32: out.idx.BYTES_PER_ELEMENT === 4,
    },
    tex: texBlob, nrm: nrmBlob,
    mat: {
      metalness: opts.metalness != null ? opts.metalness : 0.22,
      roughness: opts.roughness != null ? opts.roughness : 0.44,
    },
    tris: out.tris,
  };

  const built = buildPropFromCache(THREE, cacheRec, texCanvas, nrmCanvas);

  gltf.scene.traverse((o) => {
    if (o.geometry) o.geometry.dispose();
    if (o.material) {
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      for (const mt of mats) {
        for (const k of ['map', 'normalMap', 'emissiveMap', 'roughnessMap', 'metalnessMap', 'aoMap']) {
          if (mt[k]) mt[k].dispose();
        }
        mt.dispose();
      }
    }
  });

  idbPut(key, cacheRec);
  return built;
}

function buildPropFromCache(THREE, rec, texCanvas, nrmCanvas) {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(rec.geo.pos), 3));
  geo.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(rec.geo.nor), 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(rec.geo.uv), 2));
  geo.setIndex(new THREE.BufferAttribute(
    rec.geo.idx32 ? new Uint32Array(rec.geo.idx) : new Uint16Array(rec.geo.idx), 1));
  geo.computeBoundingBox();
  geo.computeBoundingSphere();

  const mkTex = (canvas, blob) => {
    if (canvas) return new THREE.CanvasTexture(canvas);
    if (!blob) return null;
    const img = new Image();
    const t = new THREE.Texture(img);
    img.onload = () => { t.needsUpdate = true; };
    img.src = URL.createObjectURL(blob);
    return t;
  };
  const map = mkTex(texCanvas, rec.tex);
  if (map) {
    if ('colorSpace' in map) map.colorSpace = THREE.SRGBColorSpace;
    map.flipY = false; map.anisotropy = 8; map.needsUpdate = true;
  }
  const normalMap = mkTex(nrmCanvas, rec.nrm);
  if (normalMap) { normalMap.flipY = false; normalMap.needsUpdate = true; }

  const mat = new THREE.MeshStandardMaterial({
    map, normalMap, metalness: rec.mat.metalness, roughness: rec.mat.roughness,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.frustumCulled = false;
  return { model: mesh, tris: rec.tris, cached: !texCanvas };
}
