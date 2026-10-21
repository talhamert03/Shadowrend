# Kullanım: python3 tools/bake/fx/paint_comic_fx.py assets/fx/comic
# Borderlands tarzı yetenek efekti dokuları — eski yumuşak parıltı dokularıyla AYNI biçim ve yön
# (UV'ler değişmez). Kanal düzeni: R = ton (1 beyaz-sıcak çekirdek · 0.6 renkli gövde),
# G = mürekkep, A = örtü. Renk oyunda malzeme/örnek renginden (shaders/fx_comic.gdshader).
import sys, math, random
import numpy as np
from PIL import Image
OUT = sys.argv[1]
def ss(e0, e1, v):
    t = np.clip((v - e0) / (e1 - e0), 0, 1); return t * t * (3 - 2 * t)
def save(name, tone, ink, a, size):
    img = np.stack([np.clip(tone, 0, 1), np.clip(ink, 0, 1), np.ones_like(tone), np.clip(a, 0, 1)], -1)
    Image.fromarray((img * 255).round().astype(np.uint8), 'RGBA').resize(size, Image.LANCZOS).save(OUT + '/' + name)
def grid(w, h):
    y, x = np.mgrid[0:h, 0:w].astype(np.float64); return x, y
def band(d, half, lw, aa=1.5):
    """d: işaretli uzaklık merkezden; half: yarı kalınlık. Döner: (örtü, mürekkep, iç oran)"""
    inside = ss(half + aa, half - aa, np.abs(d))
    ink = inside * ss(half - lw - aa, half - lw + aa, np.abs(d))
    core = 1 - np.abs(d) / np.maximum(half, 1e-3)
    return inside, ink, core
# ── halka (slash): ince, keskin; iç kenarda beyaz çizgi
def ring(name, R, half, lw, S=512, out=256):
    x, y = grid(S, S); c = S / 2
    r = np.hypot(x - c, y - c); d = r - R
    a, ink, core = band(d, half, lw)
    tone = np.where(d < -half * 0.15, 1.0, 0.62)
    save(name, tone, ink, a, (out, out))
ring('slash.png', 205, 22, 8)
# ── şok halkası: kalın, dış kenarı açık; dışında çizgi roman hız çentikleri
def shock(S=512, out=256):
    x, y = grid(S, S); c = S / 2
    r = np.hypot(x - c, y - c); d = r - 170
    a, ink, core = band(d, 50, 9)
    tone = np.where(d > 8, 1.0, 0.62)
    ang = np.arctan2(y - c, x - c)
    rng = random.Random(4)
    for k in range(14):
        a0 = k / 14 * 2 * math.pi + rng.uniform(-0.1, 0.1)
        w = 0.05
        da = np.abs((ang - a0 + math.pi) % (2 * math.pi) - math.pi)
        tick = (da < w * (1 - (r - 228) / 34)) & (r > 228) & (r < 252)
        a = np.maximum(a, tick.astype(float)); tone = np.where(tick, 1.0, tone)
        ink = np.maximum(ink, ((da < w * (1 - (r - 228) / 34) + 0.03) & (da > w * (1 - (r - 228) / 34) - 0.0) & (r > 226) & (r < 254)).astype(float) * 0)
    save('shock.png', tone, ink, a, (out, out))
shock()
# ── ışın (dikey): beyaz çekirdek, renkli kenarlar, mürekkep kenar; uçlar sivri
def beam(W=128, H=512, out=(64, 256)):
    x, y = grid(W, H); c = W / 2
    taper = np.clip(np.minimum(y / 60, (H - y) / 60), 0, 1)
    half = 44 * (0.35 + 0.65 * taper)
    d = x - c
    a, ink, core = band(d, half, 7)
    tone = np.where(np.abs(d) < half * 0.42, 1.0, 0.62)
    save('beam.png', tone, ink, a, out)
beam()
# ── şimşek (yatay zikzak): kalın, beyaz çekirdek, mürekkep
def bolt(name, seed, W=1024, H=256, out=(256, 64)):
    rng = random.Random(seed)
    pts = [(10, H / 2)]
    n = 9
    for i in range(1, n):
        pts.append((10 + (W - 20) * i / n, H / 2 + rng.uniform(-70, 70)))
    pts.append((W - 10, H / 2))
    x, y = grid(W, H)
    dmin = np.full(x.shape, 1e9)
    for (ax, ay), (bx, by) in zip(pts[:-1], pts[1:]):
        ex, ey = bx - ax, by - ay; wx, wy = x - ax, y - ay
        t = np.clip((wx * ex + wy * ey) / (ex * ex + ey * ey), 0, 1)
        dmin = np.minimum(dmin, np.hypot(wx - ex * t, wy - ey * t))
    taper = np.clip(np.minimum(x / 120, (W - x) / 120), 0.25, 1)
    half = 26 * taper
    a = ss(half + 1.5, half - 1.5, dmin)
    ink = a * ss(half - 9 - 1.5, half - 9 + 1.5, dmin)
    tone = np.where(dmin < half * 0.45, 1.0, 0.62)
    save(name, tone, ink, a, out)
for i in range(1, 4): bolt('bolt_%d.png' % i, i * 7)
# ── alev (dikey damla, taban altta): üç ton + mürekkep
def flame(W=256, H=384, out=(128, 192)):
    x, y = grid(W, H); cx = W / 2
    def tear(scale, yoff):
        # taban dairesi + yukarı sivrilen uç
        by = H * 0.74 + yoff; R = 92 * scale
        dx = (x - cx) / R; dy = (y - by) / R
        top = dy < 0
        w = np.where(top, np.clip(1 + dy / 2.4, 0, 1) ** 1.6, np.sqrt(np.clip(1 - dy * dy, 0, 1)))
        # dalgalı uç
        wob = 0.08 * np.sin(dy * 7.0) * top
        return np.abs(dx + wob) - w
    d0 = tear(1.0, 0); d1 = tear(0.66, 22); d2 = tear(0.36, 44)
    a = ss(0.03, -0.03, d0)
    ink = a * ss(-0.13, -0.08, d0)
    tone = np.where(d2 < 0, 1.0, np.where(d1 < 0, 0.82, 0.6))
    save('flame.png', tone, ink, a, out)
flame()
# ── yumuşak blob yerine (yatay elips alev şeridi)
def blob(W=512, H=256, out=(128, 64)):
    x, y = grid(W, H)
    dx = (x - W / 2) / (W * 0.45); dy = (y - H / 2) / (H * 0.36)
    r = np.hypot(dx, dy) - 1
    a = ss(0.03, -0.03, r)
    ink = a * ss(-0.12, -0.07, r)
    r2 = np.hypot(dx / 0.7, dy / 0.5) - 1
    tone = np.where(r2 < 0, 1.0, 0.62)
    save('blob.png', tone, ink, a, out)
blob()
