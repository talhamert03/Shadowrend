#!/usr/bin/env python3
"""island3d.gd geçişlerinden son görseli üretir: mürekkep çizgisi (derinlik+normal+siluet), ışıma, renk.
Kullanım: ink.py <geçiş klasörü> <çıktı.png> [çıktı genişliği=760]"""
import sys
import numpy as np
from PIL import Image, ImageFilter

d, out = sys.argv[1], sys.argv[2]
OW = int(sys.argv[3]) if len(sys.argv) > 3 else 760
L = lambda n: np.asarray(Image.open(f"{d}/{n}.png").convert("RGBA")).astype(np.float32) / 255.0
B, N, D, Em = L("beauty"), L("normal"), L("id"), L("emis")
H, W = B.shape[:2]
k = W / 1520.0
lin = lambda c: np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)
a = B[..., 3]
idc = D[..., :3]
nrm = N[..., :3] * 2 - 1
nrm = nrm / np.maximum(np.linalg.norm(nrm, axis=-1, keepdims=True), 1e-3)

def sh(x, dy, dx): return np.roll(np.roll(x, dy, 0), dx, 1)
# derinlik: 2. türev (eğimli yüzeyde sıfır, kopuşta büyük)
ed = np.zeros((H, W), np.float32); en = np.zeros((H, W), np.float32)
for dy, dx in ((0, 1), (1, 0), (1, 1), (1, -1)):
    ed = np.maximum(ed, np.abs(idc - sh(idc, dy, dx)).max(-1))
    en = np.maximum(en, 1 - (nrm * sh(nrm, dy, dx)).sum(-1))
sil = (np.abs(sh(a, 0, 1) - sh(a, 0, -1)) + np.abs(sh(a, 1, 0) - sh(a, -1, 0))) > 0.5
inner = ((ed > 0.03) | (en > 0.45)) & (a > 0.5) & (sh(a, 1, 1) > 0.5)

def grow(m, r, soft):
    im = Image.fromarray((m * 255).astype(np.uint8))
    if r >= 1: im = im.filter(ImageFilter.MaxFilter(int(r) * 2 + 1))
    return np.asarray(im.filter(ImageFilter.GaussianBlur(soft))).astype(np.float32) / 255.0
ink = np.clip(np.maximum(grow(sil, 3 * k, 0.8 * k) * 1.4, grow(inner, 1 * k, 0.7 * k) * 0.9), 0, 1)

rgb = B[..., :3]
rgb = 1 - (1 - rgb) ** 1.22                      # pozlama
g = rgb.mean(-1, keepdims=True); rgb = np.clip(g + (rgb - g) * 1.18, 0, 1)   # doygunluk
INK = np.array([0.075, 0.045, 0.10], np.float32)
# ışıyan yüzeylerin üstüne çizgi binmesin
emm = np.clip(Em[..., :3].max(-1) * 2, 0, 1)
ink_in = ink * (1 - emm * 0.6)
rgb = rgb * (1 - ink_in[..., None]) + INK * ink_in[..., None]
alpha = np.maximum(a, ink)
# ışıma (bloom)
ei = Image.fromarray((Em[..., :3] * 255).astype(np.uint8))
gl = (np.asarray(ei.filter(ImageFilter.GaussianBlur(14 * k))).astype(np.float32) * 0.55 +
      np.asarray(ei.filter(ImageFilter.GaussianBlur(44 * k))).astype(np.float32) * 0.5) / 255.0
rgb = 1 - (1 - rgb) * (1 - gl * 0.85)
ga = gl.max(-1) * 0.8
alpha2 = np.clip(alpha + ga * (1 - alpha), 0, 1)
# alfa dışına taşan parlamada renk = parlama
rgb = np.where((alpha < 0.02)[..., None], gl / np.maximum(gl.max(-1, keepdims=True), 1e-4), rgb)
o = Image.fromarray((np.dstack([np.clip(rgb, 0, 1), alpha2]) * 255).astype(np.uint8), "RGBA")
o.resize((OW, int(OW * H / W)), Image.LANCZOS).save(out)
print("yazıldı", out, o.size)
