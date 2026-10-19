# Kahraman kartı görselleri (Clash Royale kartı gibi omuz-baş portresi): boyanmış konsept
# portrelerinden (game/assets/portraits/<id>_full.*) yüz merkezli kart oranında kırpım.
# Kullanım: python3 godot/tools/bake/ui/hero_cards.py   (depo kökünden)
# Çıkış: godot/assets/ui/art/herocard/<id>.png (420×560)
import glob, os
from PIL import Image, ImageFilter
SRC = 'game/assets/portraits'
OUT = 'godot/assets/ui/art/herocard'
# yüz merkezi (x, y; görsele oranla), yüz yüksekliği (alın–çene, görsel yüksekliğine oranla)
# ve isteğe bağlı yüzün kırpımdaki dikey yeri (varsayılan FACE_Y)
FACE = {
    'gokalev': (0.50, 0.62, 0.27),
    'korsan':  (0.50, 0.33, 0.15),
    'kralice': (0.50, 0.40, 0.21, 0.46),   # taç sığsın
    'okcu':    (0.53, 0.20, 0.17),
    'sapanci': (0.50, 0.21, 0.17),
    'savasci': (0.48, 0.15, 0.13),
    'seher':   (0.50, 0.29, 0.13, 0.40),
    'simsek':  (0.50, 0.33, 0.20),
    'sovalye': (0.50, 0.17, 0.13, 0.38),
}
W, H = 420, 560
FACE_K = 0.27      # yüz, kırpım yüksekliğinin bu oranı
FACE_Y = 0.36      # yüz merkezi kırpımın üstünden bu oranda
os.makedirs(OUT, exist_ok=True)
for f in sorted(glob.glob(SRC + '/*_full.*')):
    hid = os.path.basename(f).split('_full')[0]
    if hid not in FACE: continue
    im = Image.open(f).convert('RGB')
    fx, fy, fh = FACE[hid][:3]
    fpos = FACE[hid][3] if len(FACE[hid]) > 3 else FACE_Y
    ch = fh * im.height / FACE_K
    cw = ch * W / H
    if cw > im.width: cw = im.width; ch = cw * H / W
    if ch > im.height: ch = im.height; cw = ch * W / H
    cx = fx * im.width; cy = fy * im.height
    x0 = min(max(cx - cw / 2, 0), im.width - cw)
    y0 = min(max(cy - fpos * ch, 0), im.height - ch)
    crop = im.crop((round(x0), round(y0), round(x0 + cw), round(y0 + ch))).resize((W, H), Image.LANCZOS)
    if cw < W: crop = crop.filter(ImageFilter.UnsharpMask(radius=1.2, percent=60, threshold=2))
    crop.save(OUT + '/' + hid + '.png')
    print(hid, im.size, 'kırpım', round(cw), 'x', round(ch))
