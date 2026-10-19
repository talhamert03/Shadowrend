# Kullanım: python3 tools/bake/fx/paint_death.py assets/fx/death
# Ölüm efekti sprite'ları (çizgi roman): patlama yıldızı, duman pufu, kırık parça.
# RGBA: R = ton (beyaz gövde 1, gölge 0.55), G = mürekkep, A = örtü. Renk oyunda örnek renginden.
import numpy as np, sys
from PIL import Image
OUT = sys.argv[1]
def ss(e0, e1, v):
    t = np.clip((v - e0) / (e1 - e0), 0, 1); return t * t * (3 - 2 * t)
def poly_sd(x, y, pts):
    # işaretli uzaklık (içeride negatif), kapalı çokgen
    n = len(pts); d = np.full(x.shape, 1e9); s = np.ones(x.shape)
    for i in range(n):
        ax, ay = pts[i]; bx, by = pts[(i + 1) % n]
        ex, ey = bx - ax, by - ay; wx, wy = x - ax, y - ay
        t = np.clip((wx * ex + wy * ey) / (ex * ex + ey * ey), 0, 1)
        d = np.minimum(d, np.hypot(wx - ex * t, wy - ey * t))
        c1 = y >= ay; c2 = y < by; c3 = ex * wy > ey * wx
        flip = (c1 & c2 & c3) | (~c1 & ~c2 & ~c3)
        s = np.where(flip, -s, s)
    return s * d
def save(img, name, S):
    im = Image.fromarray((np.clip(img, 0, 1) * 255).round().astype(np.uint8), 'RGBA')
    im.resize((S // 2, S // 2), Image.LANCZOS).save(OUT + '/' + name)
def burst():
    S = 512; y, x = np.mgrid[0:S, 0:S].astype(np.float64); c = S / 2
    rng = np.random.default_rng(5)
    def star(n, r0, r1, jit, rot):
        pts = []
        for i in range(n * 2):
            a = rot + np.pi * i / n + rng.uniform(-jit, jit)
            r = (r1 if i % 2 == 0 else r0) * rng.uniform(0.85, 1.12)
            pts.append((c + np.cos(a) * r, c + np.sin(a) * r))
        return pts
    outer = poly_sd(x, y, star(11, S * 0.24, S * 0.46, 0.08, 0.1))
    inner = poly_sd(x, y, star(9, S * 0.15, S * 0.30, 0.1, 0.35))
    lw = S * 0.022
    tone = np.where(inner < 0, 1.0, 0.62)
    ink = np.maximum(1 - ss(lw * 0.6, lw * 1.5, np.abs(outer + lw)), (1 - ss(lw * 0.3, lw * 0.9, np.abs(inner))) * 0.7)
    a = ss(lw * 0.9, lw * 0.3, outer)
    save(np.stack([tone, ink, np.ones_like(tone), a], -1), 'burst.png', S)
def puff():
    S = 512; y, x = np.mgrid[0:S, 0:S].astype(np.float64)
    rng = np.random.default_rng(9)
    C = [(S / 2, S / 2 + 10, S * 0.2)]
    for i in range(6):
        a = 2 * np.pi * i / 6 + rng.uniform(-0.3, 0.3)
        C.append((S / 2 + np.cos(a) * S * 0.17, S / 2 + np.sin(a) * S * 0.15, S * rng.uniform(0.12, 0.16)))
    C.sort(key=lambda p: p[1])
    L = np.array([-0.6, -0.8]); lw = S * 0.02
    tone = np.zeros((S, S)); ink = np.zeros((S, S)); al = np.zeros((S, S))
    for (cx, cy, r) in C:
        d = np.hypot(x - cx, y - cy); inside = ss(r + 1.5, r - 1.5, d)
        dsh = np.hypot(x - (cx + L[0] * r * 0.28), y - (cy + L[1] * r * 0.28))
        t = np.where(dsh > r, 0.55, 1.0)
        tone = tone * (1 - inside) + t * inside
        face = ((x - cx) * (-L[0]) + (y - cy) * (-L[1])) / np.maximum(d, 1e-3)
        w = ss(-0.3, 0.5, face)
        e = 1 - ss(lw * 0.4 * (0.3 + w), lw * 1.1 * (0.3 + w), np.abs(d - r + lw * 0.6))
        ink = ink * (1 - inside); ink = np.maximum(ink, e * w * ss(r + lw * 2, r - lw, d))
        al = np.maximum(al, inside)
    sd = np.full((S, S), 1e9)
    for (cx, cy, r) in C: sd = np.minimum(sd, np.hypot(x - cx, y - cy) - r)
    ink = np.maximum(ink, 1 - ss(lw * 1.0, lw * 2.2, np.abs(sd + lw * 0.8)))
    al = np.maximum(al, (1 - ss(lw * 1.0, lw * 2.2, np.abs(sd + lw * 0.8))) * ss(lw * 2.5, lw, sd))
    save(np.stack([tone, ink, np.ones_like(tone), al], -1), 'puff.png', S)
def shard():
    S = 256; y, x = np.mgrid[0:S, 0:S].astype(np.float64)
    pts = [(S * 0.5, S * 0.06), (S * 0.86, S * 0.5), (S * 0.56, S * 0.94), (S * 0.18, S * 0.62)]
    sd = poly_sd(x, y, pts); lw = S * 0.04
    lit = poly_sd(x, y, [(S * 0.5, S * 0.06), (S * 0.86, S * 0.5), (S * 0.5, S * 0.52)])
    tone = np.where(lit < 0, 1.0, 0.6)
    ink = 1 - ss(lw * 0.5, lw * 1.2, np.abs(sd + lw * 0.5))
    a = ss(lw * 0.4, -lw * 0.4, sd - lw * 0.4)
    save(np.stack([tone, ink, np.ones_like(tone), a], -1), 'shard.png', S)
burst(); puff(); shard()
