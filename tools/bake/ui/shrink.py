"""Büyük katman görüntülerinin çözünürlüğünü düşür (APK/doku belleği):
mantıksal alan > 60 000 px² → en çok 2×, > 180 000 px² → en çok 1,5×.
Görüntü yerinde küçültülür, ona başvuran tüm JSON'larda dpr güncellenir."""
import json, os, sys, hashlib
from PIL import Image
base = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(__file__), '../../../godot/assets/ui/lyr')
d = os.path.join(base, 'img')
J = {f: json.load(open(os.path.join(base, f))) for f in os.listdir(base) if f.endswith('.json')}
J = {f: v for f, v in J.items() if isinstance(v, dict) and 'nodes' in v}   # yan dosyalar (lv_made…) değil
# tutarlılık: dosyanın gerçek piksel genişliği / mantıksal genişlik = dpr
real = {}
for name, J1 in J.items():
    ch = False
    for n in J1['nodes']:
        im = n.get('img')
        if not (im and im.get('file')): continue
        f = im['file']
        if f not in real:
            p = os.path.join(d, f)
            real[f] = Image.open(p).size[0] if os.path.exists(p) else None
        if real[f] and im['w'] > 0:
            dp = real[f] / im['w']
            if abs(dp - im['dpr']) > 0.02: im['dpr'] = round(dp, 4); ch = True
    if ch: json.dump(J1, open(os.path.join(base, name), 'w'), ensure_ascii=False, separators=(',', ':'))
info = {}
for J1 in J.values():
    for n in J1['nodes']:
        im = n.get('img')
        if im and im.get('file'): info.setdefault(im['file'], (im['w'], im['h'], im['dpr']))
done = {}
for f, (w, h, dpr) in info.items():
    a = w * h
    tgt = 1.5 if a > 180000 else (2.0 if a > 60000 else dpr)
    if tgt >= dpr - 0.01: continue
    p = os.path.join(d, f)
    if not os.path.exists(p): continue
    I = Image.open(p)
    k = tgt / dpr
    I = I.resize((max(1, round(I.width * k)), max(1, round(I.height * k))), Image.LANCZOS)
    # içerik adresli ad: küçültülen görüntü YENİ ada yazılır (asıl ad yeniden yakalamada çakışmasın)
    h = hashlib.sha1(I.tobytes() + bytes(str(I.size), 'ascii')).hexdigest()[:12] + '.png'
    I.save(os.path.join(d, h), optimize=True)
    if h != f: os.remove(p)
    done[f] = (tgt, h)
for name, J1 in J.items():
    ch = False
    for n in J1['nodes']:
        im = n.get('img')
        if im and im.get('file') in done:
            tg, h = done[im['file']]
            im['dpr'] = tg; im['file'] = h; ch = True
    if ch: json.dump(J1, open(os.path.join(base, name), 'w'), ensure_ascii=False, separators=(',', ':'))
print('küçültülen', len(done))
