# Yükleme ekranı görselleri: kahraman konsept tabloları (game/assets/portraits) telefon oranında
# tam ekran kompozisyon — net görsel ekran genişliğine oturur, üst/alt kenarları aynı görselin
# bulanık, koyulaştırılmış uzantısına yumuşakça karışır; alt kısım yazı için koyulaşır.
# Kullanım (depo kökünden): python3 godot/tools/bake/ui/loading_art.py
# Çıkış: godot/assets/ui/art/loading/<id>.jpg (1080×2340)
import glob, os
from PIL import Image, ImageFilter, ImageEnhance
import numpy as np
SRC = 'game/assets/portraits'
OUT = 'godot/assets/ui/art/loading'
W, H = 1080, 2340
# net görselin üst kenarının ekran yüksekliğine oranı (yüz üst üçte birde kalsın)
TOP = {'okcu': 0.06, 'savasci': 0.08, 'sovalye': 0.07, 'seher': 0.10, 'sapanci': 0.10,
       'kralice': 0.04, 'gokalev': 0.04, 'simsek': 0.05, 'korsan': 0.05}
os.makedirs(OUT, exist_ok=True)
for f in sorted(glob.glob(SRC + '/*_full.*')):
    hid = os.path.basename(f).split('_full')[0]
    im = Image.open(f).convert('RGB')
    # arka plan: kaplayacak kadar büyütülmüş, bulanık, koyu
    k = max(W / im.width, H / im.height)
    bg = im.resize((int(im.width * k) + 2, int(im.height * k) + 2), Image.BILINEAR)
    bx = (bg.width - W) // 2; by = (bg.height - H) // 2
    bg = bg.crop((bx, by, bx + W, by + H)).filter(ImageFilter.GaussianBlur(38))
    bg = ImageEnhance.Brightness(bg).enhance(0.45)
    # net görsel: genişliğe otur; yatay görsel ekranın en az %62'sini kaplayacak kadar büyür
    # (yanlardan ortalı kırpılır)
    s = max(W / im.width, 0.66 * H / im.height)
    art = im.resize((int(im.width * s), int(im.height * s)), Image.LANCZOS)
    if art.width > W:
        cx = (art.width - W) // 2
        art = art.crop((cx, 0, cx + W, art.height))
    if s > 1.2: art = art.filter(ImageFilter.UnsharpMask(radius=1.6, percent=55, threshold=2))
    y0 = 0                                  # üst kenara yaslı: kenarda açıklık kalmaz
    a = np.ones((art.height, W), np.float32)
    fe = int(art.height * 0.22)             # alt kenar yumuşak geçiş
    ft = int(art.height * 0.08) if y0 > 0 else 0
    for i in range(fe): a[art.height - 1 - i, :] = (i / fe) ** 1.4
    for i in range(ft): a[i, :] = min(a[i, 0], (i / ft) ** 1.2)
    mask = Image.fromarray((a * 255).astype(np.uint8))
    out = bg.copy(); out.paste(art, (0, y0), mask)
    # alt: yazı için koyu geçiş
    arr = np.asarray(out).astype(np.float32)
    g = np.linspace(0, 1, H)[:, None, None]
    shade = np.clip((g - 0.62) / 0.38, 0, 1) ** 1.3 * 0.82
    arr = arr * (1 - shade) + np.array([8, 5, 12]) * shade
    Image.fromarray(arr.astype(np.uint8)).save(OUT + '/' + hid + '.jpg', quality=88, optimize=True)
    print(hid, 'ölçek', round(s, 2))
