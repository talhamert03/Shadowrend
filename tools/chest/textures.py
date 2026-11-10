"""Sandık dokuları (elle boyanmış tarz, döşenebilir): assets/chest/tex_wood.png, tex_metal.png"""
import numpy as np
from PIL import Image
N = 512
rng = np.random.default_rng(7)
def noise(fx, fy, seed):
    """döşenebilir yumuşak gürültü: düşük geçiren FFT"""
    r = np.random.default_rng(seed).standard_normal((N, N))
    F = np.fft.fft2(r)
    ky = np.fft.fftfreq(N)[:, None] * N; kx = np.fft.fftfreq(N)[None, :] * N
    F *= np.exp(-((kx / fx) ** 2 + (ky / fy) ** 2))
    o = np.real(np.fft.ifft2(F)); o -= o.min(); o /= o.max()
    return o
y = np.arange(N)[:, None] / N; x = np.arange(N)[None, :] / N
# ── ahşap: 4 yatay kalas, belirgin damar çizgileri, budak, kalas derzi ──
warp = noise(3, 2, 1) * 0.9 + noise(8, 3, 2) * 0.25
rings = np.sin((y * 4.0 + warp * 0.55) * np.pi * 2 * 6.0)          # damar
grain = np.clip(rings * 1.6, -1, 1) * 0.5 + 0.5
fine = noise(60, 4, 3)                                            # ince lif
plank_tone = np.repeat(rng.uniform(0.86, 1.0, 4), N // 4)[:, None]
v = (0.70 + 0.20 * grain + 0.10 * fine) * plank_tone
jy = (np.arange(N) % (N // 4))[:, None]
# kalas kenarlarına doğru kararma (boyalı hacim) + uzun ince çatlaklar
edge = np.minimum(jy, N // 4 - jy) / (N / 8)
v = v * (0.80 + 0.20 * np.clip(edge * 2.2, 0, 1))
for _ in range(9):
    cy0 = rng.integers(0, N); cx0 = rng.integers(0, N); L = rng.integers(60, 200)
    for t in range(L):
        yy = int(cy0 + 3.0 * np.sin(t * 0.05)) % N
        v[yy, (cx0 + t) % N] *= 0.55
        v[(yy + 1) % N, (cx0 + t) % N] *= 1.10
v = np.where(jy < 5, v * 0.28, v)                                  # derz
v = np.where((jy >= 5) & (jy < 9), v * 1.12, v)                    # derz kenarı ışığı
for _ in range(7):                                                # çivi başları
    cx, cy = rng.integers(20, N - 20), (rng.integers(0, 4) * (N // 4) + N // 8)
    d = np.hypot(np.arange(N)[None, :] - cx, np.arange(N)[:, None] - cy)
    v = np.where(d < 7, v * 0.45, np.where(d < 9, v * 1.15, v))
Image.fromarray((np.clip(v, 0, 1) * 255).astype(np.uint8)).convert("RGB").save("assets/chest/tex_wood.png")
# ── metal: dövme yüzeyler + fırça izi + kenar çizikleri ──
ham = noise(7, 7, 11); ham = np.floor(ham * 6) / 6 * 0.5 + ham * 0.5   # dövme fasetleri
brush = noise(90, 3, 12)
v = 0.80 + 0.14 * ham + 0.07 * brush
pat = noise(5, 5, 21)                                              # koyu pas/is lekeleri
v = v * (0.84 + 0.16 * np.clip((pat - 0.25) * 2.2, 0, 1))
for _ in range(26):                                               # ince çizikler
    x0, y0 = rng.integers(0, N), rng.integers(0, N); L = rng.integers(30, 110); a = rng.uniform(-0.5, 0.5)
    for t in range(L):
        v[(y0 + int(t * np.sin(a))) % N, (x0 + int(t * np.cos(a))) % N] *= 1.22
Image.fromarray((np.clip(v, 0, 1) * 255).astype(np.uint8)).convert("RGB").save("assets/chest/tex_metal.png")
print("ok")
