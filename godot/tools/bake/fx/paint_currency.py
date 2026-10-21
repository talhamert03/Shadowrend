# Kullanım: python3 tools/bake/fx/paint_currency.py assets/fx/currency
# Uçan para sprite'ları (çizgi roman): yüzlü mor gem ve altın sikke — mürekkep konturlu,
# düz tonlu yüzeyler, beyaz parıltı. 4× boyanıp 256 px'e küçültülür (kenar yumuşar).
import sys, math
from PIL import Image, ImageDraw
OUT = sys.argv[1]
S = 1024
INK = (24, 12, 30, 255)
def gem():
    im = Image.new('RGBA', (S, S), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    cx, cy = S / 2, S / 2
    top, girdle, bot = cy - 300, cy - 90, cy + 340
    R, r = 330, 170
    # dış hat (taç + gövde)
    L = [(cx - r, top), (cx + r, top), (cx + R, girdle), (cx, bot), (cx - R, girdle)]
    d.polygon(L, fill=INK)
    k = 34   # kontur kalınlığı (içe)
    def inset(p):
        return (cx + (p[0] - cx) * (1 - k / 330), cy + (p[1] - cy) * (1 - k / 400))
    I = [inset(p) for p in L]
    t0, t1, g1, b, g0 = I
    tc = ((t0[0] + t1[0]) / 2, t0[1])
    mid = (cx, girdle + 10)
    # yüzeyler: taç (açık), gövde sol/sağ (orta / koyu)
    cols = {'crownL': (214, 160, 255), 'crownM': (236, 200, 255), 'crownR': (178, 118, 246),
            'bodyL': (150, 86, 236), 'bodyM': (120, 60, 214), 'bodyR': (88, 38, 170)}
    d.polygon([t0, tc, mid, g0], fill=cols['crownL'])
    d.polygon([tc, t1, g1, mid], fill=cols['crownR'])
    d.polygon([(tc[0] - 70, t0[1]), (tc[0] + 70, t0[1]), mid], fill=cols['crownM'])
    d.polygon([g0, mid, b], fill=cols['bodyL'])
    d.polygon([mid, (cx + 120, girdle + 6), b], fill=cols['bodyM'])
    d.polygon([(cx + 120, girdle + 6), g1, b], fill=cols['bodyR'])
    # iç yüz çizgileri (ince mürekkep)
    for a, c in [(t0, mid), (t1, mid), (tc, mid), (g0, b), (mid, b), ((cx + 120, girdle + 6), b), (g0, g1)]:
        d.line([a, c], fill=INK, width=12)
    # parıltı
    d.polygon([(cx - 210, top + 70), (cx - 150, top + 40), (cx - 110, girdle - 40), (cx - 190, girdle - 30)], fill=(255, 255, 255, 230))
    sx, sy = cx + 150, top + 70
    for ang in range(0, 360, 90):
        a = math.radians(ang)
        d.polygon([(sx + math.cos(a) * 70, sy + math.sin(a) * 70), (sx + math.cos(a + 0.6) * 14, sy + math.sin(a + 0.6) * 14),
                   (sx, sy), (sx + math.cos(a - 0.6) * 14, sy + math.sin(a - 0.6) * 14)], fill=(255, 255, 255, 255))
    im.resize((256, 256), Image.LANCZOS).save(OUT + '/gem.png')
def coin():
    im = Image.new('RGBA', (S, S), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    cx, cy, R = S / 2, S / 2, 380
    d.ellipse([cx - R, cy - R, cx + R, cy + R], fill=INK)
    R1 = R - 36
    d.ellipse([cx - R1, cy - R1 + 26, cx + R1, cy + R1 + 26], fill=(170, 104, 24))          # kalınlık (alt kenar)
    d.ellipse([cx - R1, cy - R1, cx + R1, cy + R1 - 20], fill=(255, 196, 60))
    R2 = R1 - 70
    d.ellipse([cx - R2, cy - R2 - 10, cx + R2, cy + R2 - 30], fill=INK)
    R3 = R2 - 16
    d.ellipse([cx - R3, cy - R3 - 10, cx + R3, cy + R3 - 30], fill=(244, 170, 40))
    # kabartma yıldız
    pts = []
    for i in range(10):
        a = -math.pi / 2 + i * math.pi / 5
        rr = 170 if i % 2 == 0 else 72
        pts.append((cx + math.cos(a) * rr, cy - 20 + math.sin(a) * rr))
    d.polygon([(x + 10, y + 12) for x, y in pts], fill=(176, 108, 22))
    d.polygon(pts, fill=(255, 226, 120))
    d.line(pts + [pts[0]], fill=INK, width=14)
    # parıltı
    d.chord([cx - R1 + 40, cy - R1 + 30, cx + R1 - 40, cy + R1 - 60], 200, 250, fill=(255, 246, 200))
    im.resize((256, 256), Image.LANCZOS).save(OUT + '/coin.png')
gem(); coin()
