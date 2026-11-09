"""Yeni 3B sandık görüntülerinden (chestshots) arayüz simgelerini üretir:
assets/ui/art/chest/t<k>.png ve pişmiş katmanlardaki .chest-svg görselleri (aynı boyut/yerleşim)."""
import json, glob, sys, os, shutil
import numpy as np
from PIL import Image, ImageEnhance
src, bak = sys.argv[1], sys.argv[2]
TIER = {"ahsap": 1, "yaygin": 2, "kemik": 3, "kan": 4, "kadim": 5, "mistik": 6, "ejderha": 7}
new = {k: Image.open(f"{src}/c{k}.png").convert("RGBA").crop((114, 150, 754, 790)) for k in range(1, 8)}
def bbox(im, th=150):
    a = np.array(im)[..., 3]; ys, xs = np.where(a > th)
    return (xs.min(), ys.min(), xs.max() + 1, ys.max() + 1) if len(xs) else None
nb = {k: bbox(v, 200) for k, v in new.items()}
for k, v in new.items():
    v.resize((450, 450), Image.LANCZOS).save(f"assets/ui/art/chest/t{k}.png")
files = {}
for f in glob.glob("assets/ui/lyr/*.json"):
    try: d = json.load(open(f))
    except Exception: continue
    nodes = d.get("nodes") if isinstance(d, dict) else d
    if not isinstance(nodes, list): continue
    nm = os.path.basename(f)[:-5]
    for n in nodes:
        if isinstance(n, dict) and n.get("key") == ".chest-svg" and n.get("img"):
            files.setdefault(n["img"]["file"], set()).add(nm)
def stats(p):
    a = np.array(Image.open(p).convert("RGBA")).astype(float); m = a[..., 3] > 150
    return a[m][:, :3].mean(0) if m.any() else np.zeros(3)
known, amb = {}, []
for fn, layers in files.items():
    p = "assets/ui/lyr/img/" + fn
    if not os.path.exists(bak + "/" + fn): shutil.copy(p, bak + "/" + fn)
    t = None
    for l in layers:
        for k, v in TIER.items():
            if k in l.split("_"): t = v
    if any(l.startswith("fb_ad") for l in layers): t = 3
    elif any(l.startswith("fb_free") for l in layers): t = 1
    if t: known[fn] = t
    else: amb.append(fn)
ref = {}
for fn, t in known.items(): ref.setdefault(t, []).append(stats(bak + "/" + fn))
for fn in amb:
    s = stats(bak + "/" + fn); s2 = s / max(1.0, s.sum())
    best = min(ref, key=lambda t: min(np.abs(s2 - r / max(1.0, r.sum())).sum() for r in ref[t]))
    known[fn] = best; print("tahmin:", fn, sorted(files[fn])[:2], "→ t%d" % best)
for fn, t in known.items():
    old = Image.open(bak + "/" + fn).convert("RGBA"); ob = bbox(old)
    if ob is None: continue
    lum_o = stats(bak + "/" + fn).mean(); lum_ref = max(r.mean() for r in ref.get(t, [np.array([lum_o] * 3)]))
    src_im = new[t].crop(nb[t]); sw, sh = src_im.size; bw, bh = ob[2] - ob[0], ob[3] - ob[1]
    k = min(bw / sw, bh / sh) * 1.12
    r = src_im.resize((max(1, round(sw * k)), max(1, round(sh * k))), Image.LANCZOS)
    if lum_o < lum_ref * 0.6:      # soluk / kilitli hâl
        r = ImageEnhance.Color(r).enhance(0.25); r = ImageEnhance.Brightness(r).enhance(0.6)
    out = Image.new("RGBA", old.size, (0, 0, 0, 0))
    out.alpha_composite(r, (max(0, min(old.size[0] - r.size[0], round((ob[0] + ob[2]) / 2 - r.size[0] / 2))), max(0, min(old.size[1] - r.size[1], ob[3] - r.size[1]))))
    out.save("assets/ui/lyr/img/" + fn)
print("değişen:", len(known))
