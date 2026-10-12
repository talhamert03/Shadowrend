"""Arayüz görüntülerini (assets/ui/lyr/img, assets/ui/art) Godot'da kayıplı WebP (0,9)
olarak içe aktar: APK boyutu. Editör içe aktarımından SONRA çalıştırılır; değişen
.import dosyaları bir sonraki içe aktarımda yeniden işlenir."""
import os, re, sys
ROOT = os.path.join(os.path.dirname(__file__), '../../../godot/assets/ui')
n = 0
for sub in ['lyr/img', 'lyr/glyph', 'art/icon', 'art/gear', 'art/chest']:
    d = os.path.join(ROOT, sub)
    if not os.path.isdir(d): continue
    for f in os.listdir(d):
        if not f.endswith('.import'): continue
        p = os.path.join(d, f)
        s = open(p).read()
        t = re.sub(r'compress/mode=\d', 'compress/mode=1', s)
        t = re.sub(r'compress/lossy_quality=[\d.]+', 'compress/lossy_quality=0.9', t)
        t = re.sub(r'mipmaps/generate=\w+', 'mipmaps/generate=true', t)
        if t != s:
            open(p, 'w').write(t); n += 1
print('güncellenen', n)
