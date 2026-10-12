"""Katman görüntülerinin saydam kenarlarını kırp, ofsetleri güncelle, yinelenenleri birleştir.
Kullanım: python3 trim.py <lyr klasörü> <ad> [<ad> ...]"""
import json, sys, os, hashlib
from PIL import Image

def run(base, name):
    jp = os.path.join(base, name + '.json')
    J = json.load(open(jp))
    d = os.path.join(base, 'img')
    orig = set()
    done = {}
    used = set()
    for n in J['nodes']:
        im = n.get('img')
        if not im: continue
        tiles = im.get('tiles') or [{'file': im['file'], 'x': 0, 'y': 0}]
        key = '|'.join(t['file'] + '@' + str(t['x']) + ',' + str(t['y']) for t in tiles)
        for t in tiles: orig.add(t['file'])
        dpr = im['dpr']
        if key not in done:
            I = Image.new('RGBA', (int(round(im['w'] * dpr)), int(round(im['h'] * dpr))), (0, 0, 0, 0))
            for t in tiles:
                T = Image.open(os.path.join(d, t['file'])).convert('RGBA')
                I.paste(T, (int(round(t['x'] * dpr)), int(round(t['y'] * dpr))))
            bb = I.getchannel('A').point(lambda a: 255 if a > 1 else 0).getbbox()
            if not bb:
                done[key] = None
            else:
                C = I.crop(bb)
                # dev katmanlar (ışın/hale perdeleri): doku belleği için en çok 1600 px
                big = max(C.size)
                f = 1.0
                if big > 1600:
                    f = 1600.0 / big
                    C = C.resize((max(1, int(C.width * f)), max(1, int(C.height * f))), Image.LANCZOS)
                h = hashlib.sha1(C.tobytes() + bytes(str(C.size), 'ascii')).hexdigest()[:12] + '.png'
                out = os.path.join(d, h)
                if not os.path.exists(out): C.save(out, optimize=True)
                done[key] = (h, bb, f)
        r = done[key]
        if r is None:
            del n['img']; n['paint'] = False; continue
        h, bb, f = r
        n['img'] = {'file': h, 'ox': im['ox'] + bb[0] / dpr, 'oy': im['oy'] + bb[1] / dpr, 'w': (bb[2] - bb[0]) / dpr, 'h': (bb[3] - bb[1]) / dpr, 'dpr': dpr * f}
        used.add(h)
    json.dump(J, open(jp, 'w'), ensure_ascii=False, separators=(',', ':'))
    print(name, len(used), 'görüntü')

for nm in sys.argv[2:]: run(sys.argv[1], nm)
# ham döşemeler (t_*) birden çok yakalamada paylaşılabilir → hepsi işlendikten sonra sil
imgd = os.path.join(sys.argv[1], 'img')
for f in os.listdir(imgd):
    if f.startswith('t_'): os.remove(os.path.join(imgd, f))
# çöp toplama: klasördeki hiçbir JSON'un başvurmadığı görüntüleri sil
refs = set()
for f in os.listdir(sys.argv[1]):
    if f.endswith('.json'):
        try:
            for n in json.load(open(os.path.join(sys.argv[1], f))).get('nodes', []):
                if n.get('img') and n['img'].get('file'): refs.add(n['img']['file'])
        except Exception:
            pass
for f in os.listdir(imgd):
    if f.endswith('.png') and f not in refs: os.remove(os.path.join(imgd, f))
