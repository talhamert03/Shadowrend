#!/usr/bin/env python3
"""Uçan ada önizlemesi v2 (boyalı + mürekkep): katmanlı SVG üretir, render.js ile PNG'ye basılır.
Kullanım: gen_v2.py 1 > w1.svg ; node render.js w1.svg w1.png"""
import math, random, sys

INK = "#0e0a13"
W, H = 760, 744
CX, CY, RX, RY = 380, 338, 300, 60
random.seed(7)
o = []
A = o.append

def el(t):  # ada üst yüzeyi elipsi
    return (CX + RX * math.cos(t), CY + RY * math.sin(t))

def P(pts, close=True):
    return "M" + " L".join(f"{x:.1f},{y:.1f}" for x, y in pts) + ("Z" if close else "")

def poly(pts, fill, sw=4.0, stroke=INK, extra=""):
    A(f'<path d="{P(pts)}" fill="{fill}" stroke="{stroke}" stroke-width="{sw}" stroke-linejoin="round" {extra}/>')

# ───────────── tanımlar ─────────────
A(f'''<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}">
<defs>
<filter id="b4" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="4"/></filter>
<filter id="b9" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="9"/></filter>
<filter id="b18" x="-80%" y="-80%" width="260%" height="260%"><feGaussianBlur stdDeviation="18"/></filter>
<filter id="b30" x="-80%" y="-80%" width="260%" height="260%"><feGaussianBlur stdDeviation="30"/></filter>
<filter id="grain" x="0" y="0" width="100%" height="100%">
 <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="3" result="n"/>
 <feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.9 -0.32"/>
 <feComposite in2="SourceGraphic" operator="in"/></filter>
<filter id="rough"><feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="3" seed="11" result="n"/>
 <feColorMatrix in="n" type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 1.6 -0.75"/>
 <feComposite in2="SourceGraphic" operator="in"/></filter>
<pattern id="ht" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(32)"><circle cx="3.5" cy="3.5" r="1.5" fill="#000" opacity=".30"/></pattern>
<pattern id="hl" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(-38)"><rect width="6" height="1.6" fill="#000" opacity=".24"/></pattern>
<radialGradient id="moon" cx=".38" cy=".34" r=".75"><stop offset="0" stop-color="#ffb199"/><stop offset=".38" stop-color="#f2454f"/><stop offset=".8" stop-color="#b3142f"/><stop offset="1" stop-color="#6d0b22"/></radialGradient>
<linearGradient id="rock" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8a82a6"/><stop offset=".5" stop-color="#5a5274"/><stop offset="1" stop-color="#2b2439"/></linearGradient>
<linearGradient id="rockL" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#a59dc0"/><stop offset="1" stop-color="#5d5676"/></linearGradient>
<linearGradient id="grass" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#5d8a56"/><stop offset=".45" stop-color="#3c6a48"/><stop offset="1" stop-color="#1c3a30"/></linearGradient>
<linearGradient id="lip" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2f5a3d"/><stop offset=".5" stop-color="#3b2a33"/><stop offset="1" stop-color="#241a24"/></linearGradient>
<linearGradient id="stone" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#b9b3cc"/><stop offset=".55" stop-color="#7f7898"/><stop offset="1" stop-color="#4b4561"/></linearGradient>
<linearGradient id="wall" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#a8a1bf"/><stop offset="1" stop-color="#6c6585"/></linearGradient>
<linearGradient id="wallS" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#4c4563"/><stop offset="1" stop-color="#2c2639"/></linearGradient>
<linearGradient id="roof" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#5a3550"/><stop offset="1" stop-color="#2a1a2c"/></linearGradient>
<linearGradient id="door" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff1d6"/><stop offset=".35" stop-color="#ff8a6b"/><stop offset="1" stop-color="#e6213e"/></linearGradient>
<linearGradient id="crys" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffe3d6"/><stop offset=".4" stop-color="#ff5a63"/><stop offset="1" stop-color="#a80f2c"/></linearGradient>
<linearGradient id="cloud" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8b84ad"/><stop offset="1" stop-color="#3d3757"/></linearGradient>
<linearGradient id="cloudB" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4d4768"/><stop offset="1" stop-color="#262038"/></linearGradient>
<radialGradient id="lamp"><stop offset="0" stop-color="#fff3c4"/><stop offset=".5" stop-color="#ffb648"/><stop offset="1" stop-color="#ff7a1e"/></radialGradient>
<clipPath id="topclip"><ellipse cx="{CX}" cy="{CY}" rx="{RX}" ry="{RY}"/></clipPath>
</defs>''')

# ───────────── kanlı ay + hale ─────────────
MX, MY, MR = 236, 150, 112
A(f'<circle cx="{MX}" cy="{MY}" r="{MR+70}" fill="#ff3b4e" opacity=".30" filter="url(#b30)"/>')
A(f'<circle cx="{MX}" cy="{MY}" r="{MR+22}" fill="#ff6a6a" opacity=".35" filter="url(#b9)"/>')
A(f'<circle cx="{MX}" cy="{MY}" r="{MR}" fill="url(#moon)" stroke="{INK}" stroke-width="5"/>')
A(f'<g clip-path="circle({MR-3}px at {MX}px {MY}px)">')
for cx, cy, r in [(-38, -30, 20), (30, -52, 11), (46, 8, 26), (-18, 38, 14), (-62, 22, 9), (8, -8, 7), (60, 58, 12)]:
    A(f'<circle cx="{MX+cx}" cy="{MY+cy}" r="{r}" fill="#8f0f2b" opacity=".55"/><circle cx="{MX+cx+r*.18}" cy="{MY+cy+r*.2}" r="{r*.82}" fill="#c9263d" opacity=".55"/>')
A(f'<circle cx="{MX+52}" cy="{MY+46}" r="{MR}" fill="url(#ht)" opacity=".8"/>')
A(f'<path d="M{MX-88},{MY-40} A{MR-10},{MR-10} 0 0 1 {MX-20},{MY-100}" stroke="#ffd9c7" stroke-width="5" fill="none" stroke-linecap="round" opacity=".7"/></g>')

# ───────────── arka bulutlar ─────────────
def cloud(x, y, s, fill, op=1.0, sw=4.0, hi=True):
    d = (f"M{x-70*s},{y} q{-26*s},0 {-26*s},{-20*s} q0,{-22*s} {26*s},{-22*s} q{8*s},{-30*s} {44*s},{-26*s} "
         f"q{18*s},{-26*s} {52*s},{-8*s} q{30*s},{-8*s} {38*s},{20*s} q{30*s},{2*s} {30*s},{28*s} q0,{28*s} {-34*s},{28*s} Z")
    A(f'<path d="{d}" fill="{fill}" stroke="{INK}" stroke-width="{sw}" stroke-linejoin="round" opacity="{op}"/>')
    if hi:
        A(f'<path d="M{x-58*s},{y-34*s} q{10*s},{-24*s} {38*s},{-22*s} q{16*s},{-20*s} {42*s},{-10*s}" fill="none" stroke="#cfc8ee" stroke-width="{3*s+1}" stroke-linecap="round" opacity="{.55*op}"/>')
cloud(600, 300, 1.25, "url(#cloudB)", .95, hi=False)
cloud(150, 560, 1.0, "url(#cloudB)", .95, hi=False)
cloud(640, 560, 0.9, "url(#cloudB)", .95, hi=False)

# ───────────── arka küçük kayalar ─────────────
def minirock(x, y, s, tomb=False):
    top = [(x - 34*s, y), (x - 10*s, y - 12*s), (x + 30*s, y - 8*s), (x + 38*s, y + 4*s), (x + 6*s, y + 12*s)]
    body = [(x - 34*s, y), (x + 6*s, y + 12*s), (x + 38*s, y + 4*s), (x + 22*s, y + 44*s), (x + 2*s, y + 66*s), (x - 20*s, y + 36*s)]
    poly(body, "url(#rock)")
    poly([(x + 6*s, y + 12*s), (x + 38*s, y + 4*s), (x + 22*s, y + 44*s), (x + 2*s, y + 66*s)], "url(#hl)", 0, "none")
    poly([(x - 34*s, y), (x + 6*s, y + 12*s), (x - 4*s, y + 40*s), (x - 20*s, y + 36*s)], "#fff", 0, "none", 'opacity=".10"')
    poly(top, "url(#grass)")
    if tomb:
        tombstone(x + 2*s, y - 2*s, 15*s, 26*s, 0, -6)
ROCKS_LATER = []

# ───────────── kaya gövdesi ─────────────
body = [el(math.pi * 0.985), (112, 418), (176, 448), (206, 520), (262, 566), (300, 640), (338, 676), (372, 738),
        (402, 690), (428, 634), (486, 598), (520, 524), (592, 468), (652, 414), el(math.pi * 0.015)]
A(f'<ellipse cx="380" cy="560" rx="150" ry="150" fill="#ff3b4e" opacity=".16" filter="url(#b30)"/>')
poly(body, "url(#rock)", 5)
A(f'<clipPath id="bodyclip"><path d="{P(body)}"/></clipPath><g clip-path="url(#bodyclip)">')
# kaya dokusu
A(f'<rect x="60" y="320" width="640" height="430" fill="#120c1c" opacity=".28" filter="url(#rough)"/>')
ridge = [(372, 396), (330, 476), (384, 556), (366, 640), (372, 738)]
# ışıklı sol yüzler
for pts, op in [([(80, 340), (112, 418), (214, 404), (236, 392)], .22), ([(112, 418), (176, 448), (206, 520), (330, 476), (214, 404)], .13),
                ([(214, 404), (330, 476), (372, 396)], .26), ([(206, 520), (262, 566), (300, 640), (366, 640), (384, 556), (330, 476)], .07)]:
    A(f'<path d="{P(pts)}" fill="url(#rockL)" opacity="{min(1,op*3.4):.2f}" stroke="{INK}" stroke-width="2.5" stroke-linejoin="round"/>')
# gölgeli sağ yüzler
for pts, pat in [([(372, 396), (330, 476), (384, 556), (486, 598), (520, 524), (470, 420)], "ht"), ([(470, 420), (520, 524), (592, 468), (652, 414), (680, 340)], "hl"),
                 ([(384, 556), (366, 640), (372, 738), (402, 690), (428, 634), (486, 598)], "hl")]:
    A(f'<path d="{P(pts)}" fill="#0b0712" opacity=".30"/><path d="{P(pts)}" fill="url(#{pat})" stroke="{INK}" stroke-width="2.5" stroke-linejoin="round"/>')
# ay ışığı kenarı (sol)
A(f'<path d="{P([(80,340),(112,418),(176,448),(206,520),(262,566),(300,640),(338,676),(372,738)], False)}" fill="none" stroke="#ff8f8f" stroke-width="7" opacity=".55" filter="url(#b4)"/>')
# çatlaklar
for d in ["M250,420 l14,34 l-10,22 l16,30", "M560,400 l-12,30 l14,22", "M300,560 l20,26 l-6,30", "M440,470 l-16,36 l12,28 l-10,26"]:
    A(f'<path d="{d}" fill="none" stroke="{INK}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" opacity=".85"/>')
A('</g>')

# kırmızı kristaller
def crystal(x, y, h, rot, s=1.0):
    w = h * 0.34
    pts = [(0, -h * .55), (w * .5, -h * .12), (w * .32, h * .45), (-w * .3, h * .45), (-w * .5, -h * .1)]
    tr = f'transform="translate({x},{y}) rotate({rot}) scale({s})"'
    A(f'<g {tr}><ellipse rx="{h*.5}" ry="{h*.6}" fill="#ff3b4e" opacity=".55" filter="url(#b9)"/>'
      f'<path d="{P(pts)}" fill="url(#crys)" stroke="{INK}" stroke-width="3.2" stroke-linejoin="round"/>'
      f'<path d="{P([(0,-h*.55),(w*.08,h*.45),(-w*.3,h*.45),(-w*.5,-h*.1)])}" fill="#fff" opacity=".28"/>'
      f'<path d="M{-w*.12},{-h*.3} l{w*.06},{h*.36}" stroke="#fff" stroke-width="2.2" stroke-linecap="round" opacity=".85"/></g>')
for x, y, h, r in [(300, 500, 64, -18), (322, 512, 40, 14), (455, 548, 54, 22), (236, 440, 34, -30), (384, 640, 46, 6), (548, 452, 36, 30), (402, 468, 30, -8)]:
    crystal(x, y, h, r)

# sarkan kökler + zincirli fener
for x, y, l, k in [(150, 372, 70, 10), (196, 384, 110, -12), (286, 394, 60, 8), (430, 394, 96, -10), (520, 386, 66, 12), (600, 372, 84, -8), (350, 396, 44, 6)]:
    A(f'<path d="M{x},{y} q{k},{l*.5} {-k*.4},{l} " fill="none" stroke="{INK}" stroke-width="7" stroke-linecap="round"/>'
      f'<path d="M{x},{y} q{k},{l*.5} {-k*.4},{l}" fill="none" stroke="#6b4a3f" stroke-width="3.2" stroke-linecap="round"/>')
lx, ly = 566, 392
for i in range(7):
    A(f'<ellipse cx="{lx}" cy="{ly+i*11}" rx="4" ry="6.5" fill="none" stroke="{INK}" stroke-width="3.4"/><ellipse cx="{lx}" cy="{ly+i*11}" rx="4" ry="6.5" fill="none" stroke="#8d86a3" stroke-width="1.4"/>')
ly2 = ly + 80
A(f'<circle cx="{lx}" cy="{ly2+12}" r="34" fill="#ffb648" opacity=".5" filter="url(#b9)"/>'
  f'<path d="M{lx-11},{ly2} h22 l4,26 h-30 Z" fill="url(#lamp)" stroke="{INK}" stroke-width="3.2" stroke-linejoin="round"/>'
  f'<path d="M{lx-14},{ly2} h28 l-6,-9 h-16 Z M{lx-16},{ly2+26} h32 v6 h-32 Z" fill="#2a2333" stroke="{INK}" stroke-width="3" stroke-linejoin="round"/>'
  f'<path d="M{lx},{ly2+2} v24" stroke="{INK}" stroke-width="2.4"/>')

# ───────────── toprak dudağı (çimen saçağı) ─────────────
N = 64
front = [el(math.pi * i / N) for i in range(N + 1)]
low = []
for i, (x, y) in enumerate(reversed(front)):
    u = i / N
    d = 24 + 13 * math.sin(u * 37) + 9 * math.sin(u * 91 + 1) + 16 * math.sin(u * math.pi)
    low.append((x, y + max(8, d)))
poly(front + low, "url(#lip)", 4.5)
A(f'<path d="{P(front + low)}" fill="url(#ht)" opacity=".6"/>')

# ───────────── üst yüzey ─────────────
A(f'<ellipse cx="{CX}" cy="{CY}" rx="{RX}" ry="{RY}" fill="url(#grass)" stroke="{INK}" stroke-width="5"/>')
A('<g clip-path="url(#topclip)">')
A(f'<rect x="60" y="270" width="640" height="140" fill="#0c1f18" opacity=".30" filter="url(#rough)"/>')
A(f'<ellipse cx="250" cy="322" rx="170" ry="26" fill="#9fd08a" opacity=".28" filter="url(#b9)"/>')
A(f'<ellipse cx="610" cy="350" rx="120" ry="40" fill="#07140f" opacity=".5" filter="url(#b18)"/>')
# taş patika: şapel kapısından öne
path_pts = [(452, 318), (488, 318), (470, 348), (420, 372), (360, 398), (290, 400), (350, 372), (412, 346)]
A(f'<path d="{P(path_pts)}" fill="#6f6a63" stroke="{INK}" stroke-width="3" stroke-linejoin="round"/>')
for x, y, rx in [(466, 326, 13), (446, 342, 15), (414, 356, 16), (382, 370, 17), (346, 384, 18), (316, 394, 16)]:
    A(f'<ellipse cx="{x}" cy="{y}" rx="{rx}" ry="{rx*.38:.1f}" fill="#9a958d" stroke="{INK}" stroke-width="2.4"/><ellipse cx="{x-3}" cy="{y-1.5}" rx="{rx*.55:.1f}" ry="{rx*.16:.1f}" fill="#c9c4bb" opacity=".7"/>')
# kapıdan dökülen kızıl ışık
A(f'<ellipse cx="450" cy="340" rx="74" ry="24" fill="#ff4a55" opacity=".6" filter="url(#b9)"/>')
# açık mezar
A(f'<path d="M196,356 l66,-6 l12,20 l-74,8 Z" fill="#0d0911" stroke="{INK}" stroke-width="3.5" stroke-linejoin="round"/><path d="M186,360 q10,-12 22,-6 q-4,10 -22,6 Z M262,372 q16,-8 28,0 q-10,10 -28,0Z" fill="#4a3530" stroke="{INK}" stroke-width="3"/>')
A('</g>')

# ───────────── nesneler ─────────────
def shadow(x, y, rx, ry=None, op=.45):
    A(f'<ellipse cx="{x}" cy="{y}" rx="{rx}" ry="{ry or rx*.28}" fill="#04060a" opacity="{op}" filter="url(#b4)"/>')

def tombstone(x, y, w, h, kind=0, rot=0):
    """x,y: taban ortası"""
    g = f'<g transform="translate({x},{y}) rotate({rot})">'
    if kind == 0:   # yuvarlak başlı
        d = f"M{-w/2},0 v{-h+w/2} a{w/2},{w/2} 0 0 1 {w},0 v{h-w/2} Z"
    elif kind == 1:  # haç
        t = w * .3
        d = f"M{-t/2},0 v{-h*.55} h{-w/2+t/2} v{-t} h{w/2-t/2} v{-h*.45+t} h{t} v{h*.45-t} h{w/2-t/2} v{t} h{-w/2+t/2} v{h*.55} Z"
    else:            # sivri/gotik
        d = f"M{-w/2},0 v{-h*.7} l{w/2},{-h*.3} l{w/2},{h*.3} v{h*.7} Z"
    g += f'<path d="{d}" fill="url(#stone)" stroke="{INK}" stroke-width="3.6" stroke-linejoin="round"/>'
    g += f'<path d="{d}" fill="url(#hl)" opacity=".7" clip-path="inset(0 0 0 55%)"/>'
    if kind != 1:
        g += f'<path d="M0,{-h*.72} v{h*.3} M{-w*.2},{-h*.6} h{w*.4}" stroke="#3a3450" stroke-width="{max(2,w*.09):.1f}" stroke-linecap="round"/>'
        g += f'<path d="M{-w*.24},{-h*.3} h{w*.48} M{-w*.2},{-h*.2} h{w*.36}" stroke="#3a3450" stroke-width="1.8" stroke-linecap="round" opacity=".8"/>'
    g += f'<path d="M{-w/2-3},0 q{w*.2},{-h*.16} {w*.4},{-2} q{w*.2},{-h*.1} {w*.5},0 Z" fill="#3c6a48" stroke="{INK}" stroke-width="2.6" stroke-linejoin="round"/>'
    g += '</g>'
    A(g)

def fence(t0, t1, n, hgt=30, inset=0.93):
    pts = []
    for i in range(n):
        t = t0 + (t1 - t0) * i / (n - 1)
        x = CX + RX * inset * math.cos(t); y = CY + RY * inset * math.sin(t)
        pts.append((x, y))
    for k in (0.35, 0.8):
        d = P([(x, y - hgt * k) for x, y in pts], False)
        A(f'<path d="{d}" fill="none" stroke="{INK}" stroke-width="4.6" stroke-linecap="round"/><path d="{d}" fill="none" stroke="#5a5470" stroke-width="1.6"/>')
    for i, (x, y) in enumerate(pts):
        lean = 3 * math.sin(i * 2.3)
        A(f'<path d="M{x:.1f},{y:.1f} L{x+lean:.1f},{y-hgt:.1f}" stroke="{INK}" stroke-width="4.6" stroke-linecap="round"/>'
          f'<path d="M{x+lean-3.5:.1f},{y-hgt+1:.1f} l3.5,-9 l3.5,9 Z" fill="#8d86a3" stroke="{INK}" stroke-width="2.2" stroke-linejoin="round"/>')

def tree(x, y, s, flip=1):
    tr = f'transform="translate({x},{y}) scale({s*flip},{s})"'
    br = ["M0,0 C-6,-50 10,-90 -4,-150", "M-2,-96 C-30,-120 -50,-126 -66,-168", "M-40,-128 C-58,-126 -70,-134 -86,-124",
          "M0,-118 C22,-140 38,-150 44,-196", "M30,-150 C50,-152 62,-162 78,-158", "M-4,-150 C-10,-176 -2,-196 -14,-222",
          "M-58,-152 C-56,-172 -66,-182 -62,-200", "M40,-180 C30,-196 34,-208 26,-220"]
    wd = [20, 11, 6, 12, 6, 8, 5, 5]
    A(f'<g {tr}>')
    A(f'<path d="M-22,2 C-12,-8 -12,-22 -9,-34 L9,-34 C12,-20 14,-8 26,2 Z" fill="#1b1522" stroke="{INK}" stroke-width="4" stroke-linejoin="round"/>')
    for d, w in zip(br, wd):
        A(f'<path d="{d}" fill="none" stroke="{INK}" stroke-width="{w+5}" stroke-linecap="round"/>')
    for d, w in zip(br, wd):
        A(f'<path d="{d}" fill="none" stroke="#231b2c" stroke-width="{w}" stroke-linecap="round"/>')
    for d, w in zip(br, wd):   # ay ışığı kenarı
        A(f'<path d="{d}" fill="none" stroke="#ff6f7a" stroke-width="{max(1.6,w*.16):.1f}" stroke-linecap="round" opacity=".75" transform="translate({-w*.36:.1f},0)"/>')
    A('<path d="M-4,-30 q6,-10 2,-24 M4,-60 q-6,-12 -2,-26" fill="none" stroke="#0e0a13" stroke-width="2" opacity=".8"/></g>')

def lantern(x, y, h=58):
    shadow(x, y, 10)
    A(f'<path d="M{x},{y} v{-h} q0,-12 14,-12" fill="none" stroke="{INK}" stroke-width="6" stroke-linecap="round"/><path d="M{x},{y} v{-h} q0,-12 14,-12" fill="none" stroke="#5a5470" stroke-width="2.2" stroke-linecap="round"/>')
    bx, by = x + 14, y - h - 10
    A(f'<circle cx="{bx}" cy="{by+12}" r="30" fill="#ffb648" opacity=".55" filter="url(#b9)"/>'
      f'<path d="M{bx-7},{by+3} h14 l2,17 h-18 Z" fill="url(#lamp)" stroke="{INK}" stroke-width="2.8" stroke-linejoin="round"/>'
      f'<path d="M{bx-9},{by+3} h18 l-5,-7 h-8 Z" fill="#2a2333" stroke="{INK}" stroke-width="2.6" stroke-linejoin="round"/>')

def candle(x, y, h=10):
    A(f'<circle cx="{x}" cy="{y-h-5}" r="11" fill="#ffb648" opacity=".6" filter="url(#b4)"/>'
      f'<rect x="{x-3}" y="{y-h}" width="6" height="{h}" rx="1.5" fill="#efe6d2" stroke="{INK}" stroke-width="2"/>'
      f'<path d="M{x},{y-h-11} q4,6 0,10 q-4,-4 0,-10Z" fill="#fff3c4" stroke="#ff8a2a" stroke-width="1.4"/>')

def skull(x, y, s=1.0):
    A(f'<g transform="translate({x},{y}) scale({s})"><path d="M-9,-2 a9,9 0 1 1 18,0 v5 h-4 v4 h-10 v-4 h-4 Z" fill="#e9e2d0" stroke="{INK}" stroke-width="2.6" stroke-linejoin="round"/>'
      f'<circle cx="-3.6" cy="-2" r="2.6" fill="{INK}"/><circle cx="3.6" cy="-2" r="2.6" fill="{INK}"/><path d="M0,2 l-1.5,3 h3Z" fill="{INK}"/></g>')

# arka çit + arka sıra
fence(math.pi * 1.06, math.pi * 1.5, 13, 30)
tree(152, 318, 1.0)
tombstone(250, 306, 26, 38, 2, -4)
tombstone(300, 300, 24, 42, 1, 3)
tombstone(352, 304, 26, 36, 0, -2)
tree(628, 322, 0.86, -1)

# ───────────── gotik şapel ─────────────
bx0, bx1, gy, wy = 404, 536, 322, 222        # ön duvar
sx = 578                                       # yan duvar sağ ucu
shadow(486, 326, 110, 16, .6)
# yan duvar + yan çatı
poly([(bx1, gy), (sx, gy - 14), (sx, wy - 12), (bx1, wy)], "url(#wallS)")
A(f'<path d="{P([(bx1, gy), (sx, gy - 14), (sx, wy - 12), (bx1, wy)])}" fill="url(#hl)"/>')
apex = ((bx0 + bx1) / 2, 104)
poly([apex, (apex[0] + 42, 94), (sx + 10, wy - 18), (bx1 + 12, wy + 4)], "#1d1422")
A(f'<path d="M{bx1+8},{gy-66} v-34 q8,-14 16,0 v30 Z" fill="#ff5a63" stroke="{INK}" stroke-width="3" stroke-linejoin="round"/>')
# ön duvar
poly([(bx0, gy), (bx1, gy), (bx1, wy), (bx0, wy)], "url(#wall)", 4.5)
A(f'<rect x="{bx0}" y="{wy}" width="{bx1-bx0}" height="{gy-wy}" fill="#000" opacity=".3" filter="url(#rough)"/>')
for yy in range(wy + 16, gy, 18):   # taş sıraları
    A(f'<path d="M{bx0+3},{yy} H{bx1-3}" stroke="#4b4561" stroke-width="1.6" opacity=".55"/>')
    off = 0 if (yy // 18) % 2 else 14
    for xx in range(bx0 + 14 + off, bx1 - 6, 28):
        A(f'<path d="M{xx},{yy} v18" stroke="#4b4561" stroke-width="1.4" opacity=".45"/>')
# payandalar
for x in (bx0 - 8, bx1 - 10):
    poly([(x, gy + 2), (x + 18, gy + 2), (x + 18, wy + 10), (x + 9, wy - 10), (x, wy + 10)], "url(#stone)", 3.6)
# çatı (alınlık)
poly([(bx0 - 16, wy + 6), apex, (bx1 + 16, wy + 6)], "url(#roof)", 4.8)
A(f'<path d="{P([(bx0 - 16, wy + 6), apex, (bx1 + 16, wy + 6)])}" fill="url(#ht)" clip-path="inset(0 0 0 52%)"/>')
for k in (.28, .5, .72):  # kiremit sıraları
    y = apex[1] + (wy + 6 - apex[1]) * k; hw = (bx1 - bx0 + 32) / 2 * k
    A(f'<path d="M{apex[0]-hw+6:.1f},{y:.1f} q{hw*.5:.1f},7 {hw-6:.1f},0 q{hw*.5:.1f},7 {hw-6:.1f},0" fill="none" stroke="{INK}" stroke-width="2.2" opacity=".6"/>')
A(f'<path d="M{bx0-10},{wy+4} L{apex[0]},{apex[1]+8}" stroke="#ff8f96" stroke-width="3.5" stroke-linecap="round" opacity=".8"/>')
# tepe haçı
A(f'<path d="M{apex[0]-3.5},{apex[1]+4} v-22 h-9 v-7 h9 v-11 h7 v11 h9 v7 h-9 v22 Z" fill="#cfc8e0" stroke="{INK}" stroke-width="3" stroke-linejoin="round"/>')
# gül pencere
rcx, rcy = apex[0], wy - 30
A(f'<circle cx="{rcx}" cy="{rcy}" r="34" fill="#ff3b4e" opacity=".6" filter="url(#b9)"/><circle cx="{rcx}" cy="{rcy}" r="19" fill="url(#door)" stroke="{INK}" stroke-width="4"/>')
for i in range(6):
    a = i * math.pi / 3
    A(f'<path d="M{rcx},{rcy} l{19*math.cos(a):.1f},{19*math.sin(a):.1f}" stroke="{INK}" stroke-width="2.4"/>')
A(f'<circle cx="{rcx}" cy="{rcy}" r="5.5" fill="{INK}"/>')
# sivri pencereler
for x in (bx0 + 22, bx1 - 22):
    A(f'<ellipse cx="{x}" cy="{wy+44}" rx="16" ry="30" fill="#ff3b4e" opacity=".5" filter="url(#b9)"/>'
      f'<path d="M{x-8},{wy+70} v-36 q8,-18 16,0 v36 Z" fill="url(#door)" stroke="{INK}" stroke-width="3.2" stroke-linejoin="round"/><path d="M{x},{wy+22} v48 M{x-8},{wy+48} h16" stroke="{INK}" stroke-width="2.2"/>')
# kapı
dx = apex[0]
A(f'<ellipse cx="{dx}" cy="{gy-30}" rx="40" ry="48" fill="#ff3b4e" opacity=".7" filter="url(#b9)"/>'
  f'<path d="M{dx-24},{gy} v-44 q24,-34 48,0 v44 Z" fill="#2a2333" stroke="{INK}" stroke-width="4" stroke-linejoin="round"/>'
  f'<path d="M{dx-17},{gy} v-41 q17,-25 34,0 v41 Z" fill="url(#door)" stroke="{INK}" stroke-width="3" stroke-linejoin="round"/>'
  f'<path d="M{dx-8},{gy} v-30 q8,-10 16,0 v30 Z" fill="#fff" opacity=".5" filter="url(#b4)"/>')
# basamaklar
poly([(dx - 34, gy), (dx + 34, gy), (dx + 40, gy + 7), (dx - 40, gy + 7)], "#bdb7cf", 3)
poly([(dx - 40, gy + 7), (dx + 40, gy + 7), (dx + 47, gy + 15), (dx - 47, gy + 15)], "#9b95b0", 3)
# gargoyle/kuzgun çatıda
def crow(x, y, s=1.0, flip=1):
    A(f'<g transform="translate({x},{y}) scale({s*flip},{s})"><path d="M-14,0 q2,-12 14,-13 q5,-7 12,-3 l8,2 l-8,3 q-2,10 -14,12 l-16,6 Z" fill="#120d18" stroke="{INK}" stroke-width="2.4" stroke-linejoin="round"/>'
      f'<circle cx="11" cy="-12" r="1.8" fill="#ff5a63"/><path d="M-4,1 v7 M2,0 v7" stroke="{INK}" stroke-width="2"/></g>')
crow(bx0 + 4, wy - 4, 1.0)

# ───────────── ön sıra ─────────────
lantern(232, 352, 62)
tombstone(118, 344, 30, 46, 0, -7)
tombstone(168, 366, 26, 40, 2, 5)
tombstone(306, 352, 22, 32, 0, 4)
tombstone(566, 356, 30, 50, 1, 6)
tombstone(624, 350, 26, 38, 0, -5)
tombstone(520, 380, 28, 40, 2, -3)
lantern(600, 384, 50)
skull(214, 384, 1.0); skull(232, 388, .8); skull(498, 388, .9)
candle(446, 338); candle(504, 338, 8); candle(140, 372, 9); candle(548, 384, 8)
crow(566, 300, .9, -1)
fence(math.pi * 0.06, math.pi * 0.3, 7, 24, 0.95)

# ön çimen tutamları
for i in range(46):
    t = math.pi * (0.03 + 0.94 * random.random())
    x, y = el(t); y += random.uniform(-10, 2)
    hgt = random.uniform(9, 17); c = random.choice(["#6fa35f", "#4f8a55", "#2f5a3d"])
    A(f'<path d="M{x-6:.1f},{y:.1f} q1,{-hgt*.7:.1f} -3,{-hgt:.1f} q7,{hgt*.3:.1f} 5,{hgt*.8:.1f} q2,{-hgt*.8:.1f} 6,{-hgt*1.1:.1f} q2,{hgt*.6:.1f} -1,{hgt*1.1:.1f} Z" fill="{c}" stroke="{INK}" stroke-width="2" stroke-linejoin="round"/>')

# ───────────── uçan kaya parçaları ─────────────
minirock(44, 282, 1.0, True)
minirock(704, 356, 0.9)
minirock(610, 580, 0.55)
minirock(158, 590, 0.5)
# zincir: sol kaya → ada
for i in range(5):
    x = 78 + i * 7.5; y = 300 + i * 9 + 3 * math.sin(i)
    A(f'<ellipse cx="{x}" cy="{y}" rx="3.6" ry="6" transform="rotate(-38 {x} {y})" fill="none" stroke="{INK}" stroke-width="3.2"/>')

# ───────────── sis + ön bulutlar ─────────────
A(f'<ellipse cx="380" cy="356" rx="270" ry="20" fill="#d9d2ff" opacity=".16" filter="url(#b9)"/>')
A(f'<ellipse cx="250" cy="660" rx="170" ry="30" fill="#b9b0e6" opacity=".26" filter="url(#b18)"/>')
A(f'<ellipse cx="540" cy="690" rx="150" ry="26" fill="#b9b0e6" opacity=".24" filter="url(#b18)"/>')
cloud(196, 640, 0.95, "url(#cloud)")
cloud(590, 668, 1.05, "url(#cloud)")
cloud(70, 520, 0.6, "url(#cloud)", .96)
A(f'<ellipse cx="390" cy="700" rx="210" ry="20" fill="#e6dfff" opacity=".16" filter="url(#b18)"/>')

# ───────────── kor/ateşböcekleri + yıldızlar ─────────────
for _ in range(26):
    x = random.uniform(90, 680); y = random.uniform(120, 620); r = random.uniform(1.6, 3.4)
    c = random.choice(["#ff6a6a", "#ffb648", "#ff3b4e"])
    A(f'<circle cx="{x:.0f}" cy="{y:.0f}" r="{r*2.6:.1f}" fill="{c}" opacity=".5" filter="url(#b4)"/><circle cx="{x:.0f}" cy="{y:.0f}" r="{r:.1f}" fill="#fff0d6"/>')
for x, y, s in [(420, 70, 9), (560, 110, 6), (660, 190, 8), (70, 150, 6), (500, 40, 5), (694, 70, 5)]:
    A(f'<path d="M{x},{y-s} q{s*.18},{s*.82} {s},{s} q{-s*.82},{s*.18} {-s},{s} q{-s*.18},{-s*.82} {-s},{-s} q{s*.82},{-s*.18} {s},{-s}Z" fill="#fff5e6" stroke="{INK}" stroke-width="2"/>')
A('</svg>')
print("\n".join(o))
