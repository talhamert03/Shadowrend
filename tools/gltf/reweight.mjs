// Pelerin/etek düzeltmesi: bacak kemiklerine bağlı ama bacaktan uzak (pelerin, etek, cüppe) köşelerin
// ağırlığını kalçaya (Hips) taşır — yürürken bacaklar arasında gerilip yırtılmış görünmesin.
import { NodeIO } from '@gltf-transform/core';
const [,, inp, out, k0s, k1s] = process.argv;
const K0 = parseFloat(k0s || '0.15'), K1 = parseFloat(k1s || '0.3');
const io = new NodeIO();
const doc = await io.read(inp);
const root = doc.getRoot();
const skin = root.listSkins()[0];
const joints = skin.listJoints().map(j => j.getName());
const ibm = skin.getInverseBindMatrices().getArray();
function inv(m) { // 4x4 sütun-öncelikli tersini al
  const a = m, o = new Float64Array(16);
  const b00=a[0]*a[5]-a[1]*a[4], b01=a[0]*a[6]-a[2]*a[4], b02=a[0]*a[7]-a[3]*a[4], b03=a[1]*a[6]-a[2]*a[5],
    b04=a[1]*a[7]-a[3]*a[5], b05=a[2]*a[7]-a[3]*a[6], b06=a[8]*a[13]-a[9]*a[12], b07=a[8]*a[14]-a[10]*a[12],
    b08=a[8]*a[15]-a[11]*a[12], b09=a[9]*a[14]-a[10]*a[13], b10=a[9]*a[15]-a[11]*a[13], b11=a[10]*a[15]-a[11]*a[14];
  let det=b00*b11-b01*b10+b02*b09+b03*b08-b04*b07+b05*b06; det=1/det;
  o[12]=(-a[4]*b09+a[5]*b07-a[6]*b06)*det; o[13]=(a[0]*b09-a[1]*b07+a[2]*b06)*det; o[14]=(-a[12]*b03+a[13]*b01-a[14]*b00)*det;
  return o;
}
const P = {};
joints.forEach((n, i) => { const m = inv(Array.from(ibm.slice(i * 16, i * 16 + 16))); P[n] = [m[12], m[13], m[14]]; });
const J = n => joints.indexOf(n);
const hips = J('Hips');
const legSet = new Set(['LeftUpLeg','LeftLeg','LeftFoot','LeftToeBase','RightUpLeg','RightLeg','RightFoot','RightToeBase'].map(J).filter(i => i >= 0));
const segs = [['LeftUpLeg','LeftLeg'],['LeftLeg','LeftFoot'],['LeftFoot','LeftToeBase'],['RightUpLeg','RightLeg'],['RightLeg','RightFoot'],['RightFoot','RightToeBase']].filter(s => P[s[0]] && P[s[1]]);
const sub = (a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]], dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
function dseg(p, a, b) { const ab=sub(b,a), ap=sub(p,a); let t=dot(ap,ab)/dot(ab,ab); t=Math.max(0,Math.min(1,t)); const q=[a[0]+ab[0]*t,a[1]+ab[1]*t,a[2]+ab[2]*t]; const d=sub(p,q); return Math.sqrt(dot(d,d)); }
const L = Math.sqrt(dot(sub(P.LeftUpLeg, P.LeftFoot), sub(P.LeftUpLeg, P.LeftFoot)));
const r0 = K0 * L, r1 = K1 * L;
let moved = 0, total = 0;
for (const m of root.listMeshes()) for (const pr of m.listPrimitives()) {
  const pos = pr.getAttribute('POSITION'), jo = pr.getAttribute('JOINTS_0'), we = pr.getAttribute('WEIGHTS_0');
  if (!jo || !we) continue;
  const n = pos.getCount(); const p = [0,0,0], j = [0,0,0,0], w = [0,0,0,0];
  for (let i = 0; i < n; i++) {
    pos.getElement(i, p); jo.getElement(i, j); we.getElement(i, w);
    let wl = 0; for (let k = 0; k < 4; k++) if (legSet.has(j[k])) wl += w[k];
    total++;
    if (wl < 0.02) continue;
    let d = 1e9; for (const s of segs) d = Math.min(d, dseg(p, P[s[0]], P[s[1]]));
    let f = (d - r0) / (r1 - r0); f = Math.max(0, Math.min(1, f)); f = f * f * (3 - 2 * f);
    if (f <= 0) continue;
    const add = wl * f;
    for (let k = 0; k < 4; k++) if (legSet.has(j[k])) w[k] *= (1 - f);
    let hk = j.indexOf(hips);
    if (hk < 0 || w[hk] === 0 && j[hk] !== hips) { let mn = 0; for (let k = 1; k < 4; k++) if (w[k] < w[mn]) mn = k; hk = mn; if (j[hk] !== hips) { j[hk] = hips; w[hk] = 0; } }
    w[hk] += add;
    const s = w[0]+w[1]+w[2]+w[3]; for (let k = 0; k < 4; k++) w[k] /= s;
    jo.setElement(i, j); we.setElement(i, w); moved++;
  }
}
await io.write(out, doc);
console.log(`legLen=${L.toFixed(3)} moved ${moved}/${total}`);
