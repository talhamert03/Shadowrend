"""Pürüzsüz katman görüntülerini algısal olarak kayıpsız küçült (doku belleği + yükleme süresi).

Her görüntü için küçültme oranları denenir (1/8 … 3/4); küçültülüp eski boyuta geri büyütülen
sürümün aslına farkı eşiğin altındaysa (ortalama ≤ 0,6/255, %99,5'lik ≤ 3/255, en çok ≤ 10/255 —
ön-çarpımlı RGBA'da) en küçük geçerli oran seçilir. Düz renk perdeler, degrade zeminler, yumuşak
haleler birkaç kat küçülür; keskin kenarlı çizimler olduğu gibi kalır. Godot görüntüyü JSON'daki
dpr ile ölçeklediği için dpr güncellenir (içerik adresli yeni ad).
Kullanım: python3 smooth_shrink.py [lyr dizini] [ad1 ad2 …]  (ad verilmezse hepsi)"""
import json, os, sys, hashlib
import numpy as np
from PIL import Image

base = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(__file__), '../../../godot/assets/ui/lyr')
only = set(sys.argv[2:])
d = os.path.join(base, 'img')
J = {}
for f in os.listdir(base):
    if not f.endswith('.json'): continue
    try:
        v = json.load(open(os.path.join(base, f)))
    except Exception:
        continue
    if isinstance(v, dict) and 'nodes' in v: J[f] = v

def pm(a):
    a = a.astype(np.float32)
    al = a[..., 3:4] / 255.0
    return np.concatenate([a[..., :3] * al, a[..., 3:4]], axis=-1)

def ok(orig, k):
    w, h = orig.size
    sw, sh = max(1, round(w * k)), max(1, round(h * k))
    if sw >= w and sh >= h: return None
    small = orig.resize((sw, sh), Image.LANCZOS if k > 0.2 else Image.BOX)
    back = small.resize((w, h), Image.BILINEAR)
    e = np.abs(pm(np.asarray(orig)) - pm(np.asarray(back)))
    if e.mean() > 0.6 or np.percentile(e, 99.5) > 3.0 or e.max() > 10.0: return None
    return small

info = {}
for name, J1 in J.items():
    if only and name[:-5] not in only: continue
    for n in J1['nodes']:
        im = n.get('img')
        if im and im.get('file') and not im.get('tiles'): info.setdefault(im['file'], im['dpr'])
done = {}
saved = 0
for f, dpr in info.items():
    p = os.path.join(d, f)
    if not os.path.exists(p): continue
    I = Image.open(p).convert('RGBA')
    if I.width * I.height < 4096: continue
    best = None
    for k in (0.125, 0.25, 0.375, 0.5, 0.75):
        r = ok(I, k)
        if r is not None:
            best = (k, r)
            break
    if best is None: continue
    k, S = best
    kk = S.width / I.width
    h = hashlib.sha1(S.tobytes() + bytes(str(S.size), 'ascii')).hexdigest()[:12] + '.png'
    S.save(os.path.join(d, h), optimize=True)
    saved += I.width * I.height - S.width * S.height
    done[f] = (round(dpr * kk, 5), h)
for name, J1 in J.items():
    ch = False
    for n in J1['nodes']:
        im = n.get('img')
        if im and im.get('file') in done:
            im['dpr'], im['file'] = done[im['file']]
            ch = True
    if ch: json.dump(J1, open(os.path.join(base, name), 'w'), ensure_ascii=False, separators=(',', ':'))
# kullanılmayan eski dosyalar
used = set()
for J1 in J.values():
    for n in J1['nodes']:
        im = n.get('img')
        if im:
            if im.get('file'): used.add(im['file'])
            for t in im.get('tiles', []): used.add(t['file'])
rm = 0
for f in done:
    if f not in used and os.path.exists(os.path.join(d, f)):
        os.remove(os.path.join(d, f)); rm += 1
        imp = os.path.join(d, f + '.import')
        if os.path.exists(imp): os.remove(imp)
print('küçültülen', len(done), 'silinen', rm, 'kazanılan piksel', saved)
