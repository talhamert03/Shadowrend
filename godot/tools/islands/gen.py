#!/usr/bin/env python3
"""Dünya önizlemeleri: Borderlands çizgi roman tarzında UÇAN ADA çizimleri (SVG).

Ortak parçalar (kertikli kaya gövde + tarama/yarım ton, kenardan sarkan örtü, üst yüz, taraklı
bulutlar, Kızıl Ay, süzülen kayalar, parçacıklar) dünya paletiyle; her dünyanın imza objeleri
aşağıdaki world_<n>() fonksiyonlarında elle çizilir.

Kullanım: python3 gen.py <çıktı_klasörü>   → w1.svg … w10.svg
PNG: node render.js <klasör> (Playwright Chromium, saydam) → sonra kırpılıp assets/ui/arena/w<n>.png (760 px)
"""
import colorsys, os, random, sys

INK = "#0b0a14"


def hx(c):
    c = c.lstrip("#")
    return tuple(int(c[i:i + 2], 16) / 255 for i in (0, 2, 4))


def tohex(rgb):
    return "#%02x%02x%02x" % tuple(max(0, min(255, round(v * 255))) for v in rgb)


def shade(c, dl, ds=0.0):
    """HLS açıklık/doygunluk kaydırma"""
    h, l, s = colorsys.rgb_to_hls(*hx(c))
    return tohex(colorsys.hls_to_rgb(h, max(0, min(1, l + dl)), max(0, min(1, s + ds))))


DEFS = f"""
<defs>
  <pattern id="hatch" width="9" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(38)">
    <line x1="0" y1="0" x2="0" y2="9" stroke="{INK}" stroke-width="2.4"/></pattern>
  <pattern id="hatchF" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(-50)">
    <line x1="0" y1="0" x2="0" y2="7" stroke="{INK}" stroke-width="1.4"/></pattern>
  <pattern id="dots" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(20)">
    <circle cx="5" cy="5" r="2.3" fill="{INK}"/></pattern>
  <pattern id="dotsS" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(20)">
    <circle cx="3.5" cy="3.5" r="1.4" fill="{INK}"/></pattern>
  <clipPath id="cliff"><path d="CLIFF"/></clipPath>
  <clipPath id="topc"><path d="TOP"/></clipPath>
</defs>"""

CLIFF = ("M150 470 L840 470 L812 540 L770 560 L744 640 L700 660 L676 760 L640 790 L612 880 L580 900 "
         "L548 990 L520 930 L486 960 L462 880 L420 860 L396 760 L350 730 L326 640 L270 610 L240 540 L180 520 Z")
TOP = "M150 452 C 160 380, 840 380, 850 452 C 846 468, 700 478, 500 478 C 300 478, 154 468, 150 452 Z"
DRAPE = ("M140 452 C 150 396, 850 396, 860 452 L856 470 C 830 492, 800 486, 790 506 C 772 520, 752 500, 730 512 "
         "C 712 534, 690 512, 668 516 C 648 538, 620 516, 596 520 C 570 540, 548 516, 520 520 C 494 544, 470 520, "
         "444 522 C 420 542, 396 518, 372 518 C 350 536, 326 514, 304 510 C 280 528, 256 504, 232 500 C 206 512, "
         "176 494, 150 482 Z")
DRAPE_SH = ("M560 470 C 640 470, 760 466, 856 470 C 830 492, 800 486, 790 506 C 772 520, 752 500, 730 512 "
            "C 712 534, 690 512, 668 516 C 648 538, 620 516, 596 520 C 580 532, 566 520, 556 514 Z")


def moon(cx, cy, r=76):
    return f"""
<circle cx="{cx}" cy="{cy}" r="{r}" fill="#d8303f" stroke-width="6"/>
<path d="M{cx} {cy - r} A{r} {r} 0 0 1 {cx + r} {cy} A{r} {r} 0 0 1 {cx} {cy + r} A{r * 0.76:.0f} {r} 0 0 0 {cx} {cy - r} Z" fill="#8f1828" stroke="none"/>
<circle cx="{cx}" cy="{cy}" r="{r}" fill="url(#dots)" stroke="none" opacity="0.35"/>
<circle cx="{cx - r * 0.35:.0f}" cy="{cy - r * 0.35:.0f}" r="{r * 0.15:.0f}" fill="#a7212f" stroke-width="3"/>
<circle cx="{cx + r * 0.24:.0f}" cy="{cy + r * 0.35:.0f}" r="{r * 0.1:.0f}" fill="#a7212f" stroke-width="3"/>
<circle cx="{cx}" cy="{cy}" r="{r}" fill="none" stroke-width="6"/>"""


def cloud(x, y, s, fill, hi, back=False):
    """taraklı çizgi roman bulutu (sol alt köşe x,y; s ölçek)"""
    d = (f"M{x} {y} q{-14 * s:.1f} {-38 * s:.1f} {26 * s:.1f} {-46 * s:.1f} q{8 * s:.1f} {-36 * s:.1f} {50 * s:.1f} {-26 * s:.1f} "
         f"q{20 * s:.1f} {-28 * s:.1f} {58 * s:.1f} {-10 * s:.1f} q{34 * s:.1f} {-8 * s:.1f} {40 * s:.1f} {26 * s:.1f} "
         f"q{36 * s:.1f} {6 * s:.1f} {22 * s:.1f} {46 * s:.1f} Z")
    out = f'<path d="{d}" fill="{fill}" stroke-width="{5 if back else 6}"/>'
    if not back:
        out += (f'<path d="M{x + 18 * s:.1f} {y} q{-4 * s:.1f} {-24 * s:.1f} {20 * s:.1f} {-30 * s:.1f} '
                f'q{8 * s:.1f} {-22 * s:.1f} {34 * s:.1f} {-16 * s:.1f}" fill="none" stroke="{hi}" stroke-width="5"/>')
        out += f'<rect x="{x - 8 * s:.1f}" y="{y - 8 * s:.1f}" width="{196 * s:.1f}" height="{10 * s:.1f}" fill="url(#dots)" stroke="none" opacity="0.28"/>'
    return out


def body(P):
    """kertikli kaya gövde: ışık (sol) / orta / gölge (sağ) yüzleri, tarama, yarım ton, çatlak, damar"""
    L1, L2, L3 = shade(P["rock"], 0.17), shade(P["rock"], 0.08), shade(P["rock"], 0.12)
    M1, M2, M3 = shade(P["rock"], 0.02), shade(P["rock"], -0.03), shade(P["rock"], -0.08)
    S1, S2, S3 = shade(P["rock"], -0.12), shade(P["rock"], -0.17), shade(P["rock"], -0.21)
    v, vd = P["vein"], shade(P["vein"], -0.15)
    return f"""
<path d="{CLIFF}" fill="{P['rock']}" stroke-width="7"/>
<g clip-path="url(#cliff)" stroke-width="4">
  <path d="M150 470 L320 470 L300 560 L240 540 L180 520 Z" fill="{L1}"/>
  <path d="M320 470 L430 470 L410 600 L326 640 L300 560 Z" fill="{L2}"/>
  <path d="M270 610 L326 640 L350 730 L310 690 Z" fill="{L3}"/>
  <path d="M396 760 L420 860 L380 820 Z" fill="{L2}"/>
  <path d="M430 470 L600 470 L560 620 L410 600 Z" fill="{M1}"/>
  <path d="M410 600 L560 620 L520 760 L396 760 L350 730 L326 640 Z" fill="{M2}"/>
  <path d="M396 760 L520 760 L486 960 L462 880 L420 860 Z" fill="{M3}"/>
  <path d="M600 470 L840 470 L812 540 L770 560 L744 640 L700 660 L560 620 Z" fill="{S1}"/>
  <path d="M560 620 L700 660 L676 760 L640 790 L520 760 Z" fill="{S2}"/>
  <path d="M520 760 L640 790 L612 880 L580 900 L548 990 L520 930 L486 960 Z" fill="{S3}"/>
  <path d="M600 470 L840 470 L812 540 L770 560 L744 640 L700 660 L676 760 L640 790 L612 880 L580 900 L548 990 L520 930 L540 760 L560 620 Z" fill="url(#hatch)" stroke="none" opacity="0.55"/>
  <path d="M410 600 L560 620 L520 760 L396 760 L350 730 L326 640 Z" fill="url(#dots)" stroke="none" opacity="0.28"/>
  <path d="M396 760 L520 760 L486 960 L462 880 L420 860 Z" fill="url(#hatchF)" stroke="none" opacity="0.5"/>
  <g fill="none" stroke-width="3">
    <path d="M300 560 l20 30 l-8 26 l18 24"/><path d="M470 640 l-14 40 l10 30"/><path d="M640 520 l-20 44 l12 40 l-16 30"/>
    <path d="M560 800 l12 40 l-10 34"/></g>
  {P.get('body_extra', '')}
  <path d="M352 612 L368 650 L356 690 L378 720 L364 662 Z" fill="{v}" stroke-width="3"/>
  <path d="M486 640 L500 676 L492 720 L512 680 Z" fill="{v}" stroke-width="3"/>
  <path d="M612 700 L626 744 L614 780 L634 740 Z" fill="{vd}" stroke-width="3"/>
</g>
<path d="{CLIFF}" fill="none" stroke-width="7"/>"""


def drips(P):
    """gövdeden sarkanlar: buz sarkıtı / lav / zehir damlası (sivri) ya da kök (çizgi)"""
    kind, c = P["drip"], P["dripc"]
    cd = shade(c, -0.2)
    if kind == "root":
        r = ""
        for (x, y, l, b) in [(260, 520, 90, 18), (330, 530, 120, -14), (420, 534, 80, 10), (560, 532, 110, -20), (650, 524, 70, 14), (760, 506, 90, -10)]:
            r += f'<path d="M{x} {y} q{b} {l * 0.5} {-b * 0.4} {l}" fill="none" stroke-width="7"/>'
            r += f'<path d="M{x} {y} q{b} {l * 0.5} {-b * 0.4} {l}" fill="none" stroke="{c}" stroke-width="3"/>'
        return r
    out = ""
    for (x, y, w, h) in [(298, 560, 16, 70), (470, 600, 18, 84), (690, 660, 16, 64), (540, 980, 16, 18)]:
        out += f'<path d="M{x} {y} l{w} 0 l{-w / 2} {h} z" fill="{c}" stroke-width="4"/>'
        out += f'<path d="M{x + w / 2} {y} l{w / 2} 0 l{-w / 2} {h} z" fill="{cd}" stroke="none"/>'
    return out


def top(P):
    """kenardan sarkan örtü (kar/çimen/kül…) + üst yüz"""
    return f"""
<path d="{DRAPE}" fill="{P['drape']}" stroke-width="7"/>
<path d="{DRAPE_SH}" fill="{shade(P['drape'], -0.16)}" stroke="none"/>
<path d="M150 482 C 176 494, 206 512, 232 500 C 256 504, 280 528, 304 510" fill="none" stroke-width="3"/>
<path d="{TOP}" fill="{P['top']}" stroke-width="6"/>
<g clip-path="url(#topc)">
  <path d="M520 476 C 640 474, 800 470, 850 452 C 846 430, 800 410, 740 400 C 760 430, 700 460, 520 476 Z" fill="{shade(P['top'], -0.12)}" stroke="none"/>
  {P.get('top_extra', '')}
</g>
<path d="{TOP}" fill="none" stroke-width="6"/>"""


def float_rocks(P):
    r, t = P["rock"], P["drape"]
    return f"""
<g stroke-width="5">
  <path d="M60 420 L112 404 L138 430 L124 476 L90 500 L66 462 Z" fill="{r}"/>
  <path d="M112 404 L138 430 L124 476 L102 446 Z" fill="{shade(r, -0.17)}"/>
  <path d="M60 420 L112 404 L138 430 L102 440 Z" fill="{t}"/>
  <path d="M884 520 L934 508 L956 534 L944 570 L910 592 L888 560 Z" fill="{r}"/>
  <path d="M934 508 L956 534 L944 570 L926 540 Z" fill="{shade(r, -0.17)}"/>
  <path d="M884 520 L934 508 L956 534 L918 540 Z" fill="{t}"/>
</g>"""


def particles(P, seed):
    rnd = random.Random(seed)
    c = P["part"]
    out = f'<g fill="{c}" stroke-width="2.5">'
    for _ in range(9):
        x, y = rnd.uniform(90, 910), rnd.uniform(140, 360)
        if P.get("part_kind") == "petal":
            a = rnd.uniform(0, 180)
            out += f'<ellipse cx="{x:.0f}" cy="{y:.0f}" rx="9" ry="4.5" transform="rotate({a:.0f} {x:.0f} {y:.0f})"/>'
        else:
            out += f'<circle cx="{x:.0f}" cy="{y:.0f}" r="{rnd.uniform(3.2, 5.4):.1f}"/>'
    out += '<path d="M200 200 l4 14 l14 4 l-14 4 l-4 14 l-4 -14 l-14 -4 l14 -4 z"/>'
    out += '<path d="M520 220 l3 10 l10 3 l-10 3 l-3 10 l-3 -10 l-10 -3 l10 -3 z"/></g>'
    return out


def compose(P, props, seed):
    s = f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000" width="1000" height="1000">'
    s += DEFS.replace("CLIFF", CLIFF).replace("TOP", TOP)
    s += f'<g stroke="{INK}" stroke-linejoin="round" stroke-linecap="round">'
    s += moon(*P.get("moon", (760, 200)))
    s += P.get("back", "")
    s += cloud(90, 650, 1.0, P["cloud"], P["cloudhi"], back=True)
    s += cloud(752, 640, 1.0, P["cloud"], P["cloudhi"], back=True)
    s += body(P) + drips(P) + top(P) + props
    s += cloud(250, 760, 1.0, P["cloudf"], P["cloudhi"]) + cloud(600, 800, 1.05, P["cloudf"], P["cloudhi"])
    s += float_rocks(P) + particles(P, seed)
    s += "</g></svg>"
    return s


# ═════════════════════════ dünyaların imza objeleri ═════════════════════════

def two_tone(d_full, d_shadow, light, dark, sw=5):
    return (f'<path d="{d_full}" fill="{light}" stroke-width="{sw}"/>'
            f'<path d="{d_shadow}" fill="{dark}" stroke="none"/>'
            f'<path d="{d_full}" fill="none" stroke-width="{sw}"/>')


def dead_tree(x, y, s, fill="#1a1626", cap=None):
    d = (f"M{x} {y} L{x + 8 * s} {y - 92 * s} L{x - 18 * s} {y - 134 * s} L{x - 10 * s} {y - 138 * s} L{x + 12 * s} {y - 104 * s} "
         f"L{x + 18 * s} {y - 152 * s} L{x} {y - 190 * s} L{x + 10 * s} {y - 194 * s} L{x + 24 * s} {y - 160 * s} L{x + 36 * s} {y - 202 * s} "
         f"L{x + 46 * s} {y - 198 * s} L{x + 30 * s} {y - 148 * s} L{x + 30 * s} {y - 112 * s} L{x + 58 * s} {y - 146 * s} L{x + 66 * s} {y - 140 * s} "
         f"L{x + 34 * s} {y - 90 * s} L{x + 26 * s} {y} Z")
    o = f'<path d="{d}" fill="{fill}" stroke-width="5"/>'
    if cap:
        for (dx, dy) in [(-18, -134), (0, -190), (36, -202), (58, -146)]:
            o += f'<path d="M{x + dx * s} {y + dy * s} q{8 * s} {-8 * s} {16 * s} {-2 * s} l{-6 * s} {4 * s} z" fill="{cap}" stroke-width="3"/>'
    return o


def gravestone(x, y, s, c, cd, cross=False):
    w, h = 32 * s, 52 * s
    if cross:
        d = f"M{x - 6 * s} {y} L{x - 6 * s} {y - h + 14 * s} L{x - 20 * s} {y - h + 14 * s} L{x - 20 * s} {y - h} L{x - 6 * s} {y - h} L{x - 6 * s} {y - h - 16 * s} L{x + 6 * s} {y - h - 16 * s} L{x + 6 * s} {y - h} L{x + 20 * s} {y - h} L{x + 20 * s} {y - h + 14 * s} L{x + 6 * s} {y - h + 14 * s} L{x + 6 * s} {y} Z"
        sh = f"M{x} {y - h - 16 * s} L{x + 6 * s} {y - h - 16 * s} L{x + 6 * s} {y - h} L{x + 20 * s} {y - h} L{x + 20 * s} {y - h + 14 * s} L{x + 6 * s} {y - h + 14 * s} L{x + 6 * s} {y} L{x} {y} Z"
    else:
        d = f"M{x - w / 2} {y} L{x - w / 2} {y - h + w / 2} Q{x} {y - h - w / 2} {x + w / 2} {y - h + w / 2} L{x + w / 2} {y} Z"
        sh = f"M{x} {y - h} Q{x + w / 2} {y - h} {x + w / 2} {y - h + w / 2} L{x + w / 2} {y} L{x} {y} Z"
    o = two_tone(d, sh, c, cd)
    if not cross:
        o += f'<path d="M{x - 8 * s} {y - h * 0.55} h{16 * s} M{x} {y - h * 0.7} v{20 * s}" fill="none" stroke-width="3"/>'
    return o


def lantern(x, y, s, glow):
    return (f'<path d="M{x} {y} L{x} {y - 80 * s}" fill="none" stroke-width="{6 * s}"/>'
            f'<path d="M{x} {y - 80 * s} q{18 * s} 0 {22 * s} {14 * s}" fill="none" stroke-width="{5 * s}"/>'
            f'<path d="M{x + 14 * s} {y - 66 * s} l{16 * s} 0 l{-2 * s} {22 * s} l{-12 * s} 0 z" fill="{glow}" stroke-width="4"/>'
            f'<circle cx="{x + 22 * s}" cy="{y - 55 * s}" r="{4 * s}" fill="#ffffff" stroke="none"/>')


def mushroom(x, y, s, cap, dots="#ffffff"):
    return (f'<path d="M{x - 5 * s} {y} L{x - 4 * s} {y - 22 * s} L{x + 4 * s} {y - 22 * s} L{x + 5 * s} {y} Z" fill="#e8dcc0" stroke-width="3"/>'
            f'<path d="M{x - 20 * s} {y - 20 * s} Q{x} {y - 50 * s} {x + 20 * s} {y - 20 * s} Z" fill="{cap}" stroke-width="4"/>'
            f'<path d="M{x} {y - 35 * s} Q{x + 14 * s} {y - 32 * s} {x + 20 * s} {y - 20 * s} L{x} {y - 20 * s} Z" fill="{shade(cap, -0.15)}" stroke="none"/>'
            f'<path d="M{x - 20 * s} {y - 20 * s} Q{x} {y - 50 * s} {x + 20 * s} {y - 20 * s} Z" fill="none" stroke-width="4"/>'
            f'<circle cx="{x - 8 * s}" cy="{y - 29 * s}" r="{3 * s}" fill="{dots}" stroke-width="2"/>'
            f'<circle cx="{x + 6 * s}" cy="{y - 33 * s}" r="{2.5 * s}" fill="{dots}" stroke-width="2"/>')


def crystal(x, y, s, c, cd, h=96):
    d = f"M{x - 12 * s} {y} L{x - 24 * s} {y - h * 0.62 * s} L{x} {y - h * s} L{x + 24 * s} {y - h * 0.55 * s} L{x + 16 * s} {y} Z"
    sh = f"M{x} {y - h * s} L{x + 24 * s} {y - h * 0.55 * s} L{x + 16 * s} {y} L{x} {y} Z"
    return two_tone(d, sh, c, cd) + f'<path d="M{x - 14 * s} {y - h * 0.6 * s} l{12 * s} {-h * 0.32 * s}" fill="none" stroke="#ffffff" stroke-width="3"/>'


def world_1():
    """SOLGUN MEZARLIK — sisli mezarlık, türbe, eğri ağaçlar, fenerler"""
    P = dict(rock="#625c6e", vein="#ff5a6e", drape="#3f5a3a", top="#5b7a4c", cloud="#4b4766", cloudf="#6d6890",
             cloudhi="#aaa6c8", drip="root", dripc="#5a3f2a", part="#d9ffe0", moon=(250, 190))
    P["top_extra"] = ('<path d="M420 478 C 450 450, 520 430, 560 410" stroke="#8f8672" stroke-width="26" fill="none" opacity="0.9"/>'
                      '<path d="M420 478 C 450 450, 520 430, 560 410" stroke="#0b0a14" stroke-width="3" fill="none" stroke-dasharray="14 10"/>'
                      '<ellipse cx="300" cy="440" rx="110" ry="16" fill="#e8ffef" opacity="0.25" stroke="none"/>')
    stone, stoneD = "#a7a3b2", "#5b5768"
    pr = ""
    # türbe (odak): sütunlu, üçgen alınlıklı, kapıda kızıl ışık
    pr += two_tone("M520 440 L520 330 L700 330 L700 440 Z", "M610 330 L700 330 L700 440 L610 440 Z", stone, stoneD, 6)
    pr += two_tone("M506 336 L610 268 L714 336 Z", "M610 268 L714 336 L610 336 Z", "#8c8798", "#4a4656", 6)
    pr += '<path d="M496 336 h228 v12 h-228 z" fill="#c4c0cc" stroke-width="5"/>'
    pr += '<path d="M498 440 h224 v12 h-224 z" fill="#8c8798" stroke-width="5"/>'
    for x in (536, 572, 648, 684):
        pr += f'<path d="M{x - 7} 348 h14 v92 h-14 z" fill="#d2ced8" stroke-width="4"/><path d="M{x} 348 h7 v92 h-7 z" fill="#8c8798" stroke="none"/>'
    pr += '<path d="M590 440 L590 384 Q610 360 630 384 L630 440 Z" fill="#ff4b5c" stroke-width="5"/>'
    pr += '<path d="M598 440 L598 388 Q610 374 622 388 L622 440 Z" fill="#ffb3ba" stroke="none"/>'
    pr += '<circle cx="610" cy="300" r="12" fill="#ff4b5c" stroke-width="4"/>'
    pr += '<path d="M520 330 L700 330" fill="none" stroke-width="3"/><rect x="610" y="352" width="90" height="88" fill="url(#hatch)" stroke="none" opacity="0.5"/>'
    # mezar taşları
    pr += gravestone(250, 456, 1.0, stone, stoneD) + gravestone(330, 466, 0.85, stone, stoneD, cross=True)
    pr += gravestone(430, 450, 0.8, stone, stoneD) + gravestone(760, 456, 0.9, stone, stoneD, cross=True)
    pr += gravestone(800, 444, 0.7, stone, stoneD)
    # eğri ağaçlar + fenerler
    pr += dead_tree(190, 448, 1.15) + dead_tree(730, 420, 0.75)
    pr += lantern(380, 470, 1.0, "#ffd36b") + lantern(480, 470, 0.85, "#ffd36b")
    # demir çit
    pr += '<g stroke-width="3" fill="none">' + "".join(f'<path d="M{x} 474 v-30 l4 -8 l4 8 v30"/>' for x in range(160, 250, 18)) + '<path d="M156 452 h96 M156 466 h96"/></g>'
    return P, pr


def world_2():
    """KÜL ÇUKURLARI — kül zemin, lav yarıkları, yanık ağaçlar, kor kazanı"""
    P = dict(rock="#544850", vein="#ff8a3c", drape="#5a4f4c", top="#77696a", cloud="#4a3a40", cloudf="#6e5156",
             cloudhi="#c49a8a", drip="spike", dripc="#ff8a3c", part="#ffb04a", moon=(780, 190))
    P["top_extra"] = ('<g fill="#ff7a2a" stroke-width="4">'
                      '<path d="M220 452 l40 -8 l30 10 l40 -4 l-38 12 l-34 -6 z"/>'
                      '<path d="M480 466 l50 -14 l40 6 l60 -10 l-56 18 l-44 -4 z"/>'
                      '<path d="M380 420 l30 6 l24 -8 l-20 14 z"/></g>'
                      '<g fill="#ffd36b" stroke="none"><path d="M236 452 l24 -4 l18 6 z"/><path d="M500 462 l30 -8 l28 4 z"/></g>')
    P["body_extra"] = ('<path d="M430 470 L452 540 L438 600 L470 640" fill="none" stroke="#ff8a3c" stroke-width="6"/>'
                       '<path d="M680 470 L660 520 L690 580" fill="none" stroke="#ff8a3c" stroke-width="5"/>')
    pr = ""
    # kor kazanı / volkan bacası (odak): koni kaya, ağzından lav, duman
    pr += two_tone("M520 452 L580 300 L660 300 L720 452 Z", "M620 300 L660 300 L720 452 L620 452 Z", "#5a4a4c", "#2a2024", 6)
    pr += '<rect x="620" y="300" width="100" height="152" fill="url(#hatch)" stroke="none" opacity="0.5"/>'
    pr += '<path d="M572 304 Q620 280 668 304 Q620 322 572 304 Z" fill="#ff5a1a" stroke-width="5"/>'
    pr += '<path d="M590 304 Q620 292 650 304 Q620 312 590 304 Z" fill="#ffd36b" stroke="none"/>'
    pr += '<path d="M600 312 L594 360 L612 400 L604 452" fill="none" stroke="#ff7a2a" stroke-width="9"/>'
    pr += '<path d="M600 312 L594 360 L612 400 L604 452" fill="none" stroke="#ffd36b" stroke-width="3"/>'
    pr += '<path d="M610 280 q-30 -40 6 -70 q-20 -40 30 -60 q40 10 20 50 q40 30 0 70 z" fill="#3c3238" stroke-width="5"/>'
    pr += '<path d="M620 270 q-14 -26 8 -44" fill="none" stroke="#7a6a70" stroke-width="5"/>'
    # yanık ağaçlar, kor parçaları
    pr += dead_tree(220, 452, 1.1, "#140f12") + dead_tree(760, 440, 0.8, "#140f12")
    pr += '<g fill="#ff7a2a" stroke-width="2.5">' + "".join(f'<circle cx="{x}" cy="{y}" r="4"/>' for x, y in [(240, 300), (250, 340), (780, 340), (210, 380)]) + '</g>'
    # kaya kümeleri
    for (x, y, s) in [(350, 456, 1.0), (430, 470, 0.7), (790, 458, 0.9)]:
        pr += two_tone(f"M{x - 26 * s} {y} L{x - 18 * s} {y - 26 * s} L{x + 6 * s} {y - 34 * s} L{x + 26 * s} {y - 14 * s} L{x + 22 * s} {y} Z",
                       f"M{x + 6 * s} {y - 34 * s} L{x + 26 * s} {y - 14 * s} L{x + 22 * s} {y} L{x + 4 * s} {y} Z", "#6a5c5e", "#2e2528")
    return P, pr


def world_3():
    """ZEHİR BATAKLIĞI — zehirli gölet, kazan, kulübe, mantarlar, saz"""
    P = dict(rock="#46594e", vein="#7dffb0", drape="#3c5a2e", top="#4b6b37", cloud="#334a46", cloudf="#4f6e66",
             cloudhi="#9fd8c4", drip="spike", dripc="#8dff6a", part="#b8ff7a", moon=(240, 190))
    P["top_extra"] = ('<path d="M250 450 C 250 426, 470 418, 500 436 C 506 458, 290 474, 250 450 Z" fill="#59e36a" stroke-width="5"/>'
                      '<path d="M270 446 C 300 432, 430 428, 480 438" fill="none" stroke="#c6ff9a" stroke-width="4"/>'
                      '<g fill="#3fbf54" stroke-width="3"><circle cx="330" cy="448" r="7"/><circle cx="420" cy="440" r="5"/><circle cx="380" cy="456" r="4"/></g>')
    pr = ""
    # kazıklar üstünde cadı kulübesi (odak)
    for x in (580, 620, 680, 712):
        pr += f'<path d="M{x} 450 L{x + 4} 380" fill="none" stroke-width="7"/><path d="M{x} 450 L{x + 4} 380" fill="none" stroke="#5a3f2a" stroke-width="3"/>'
    pr += two_tone("M566 386 L566 300 L726 300 L726 386 Z", "M650 300 L726 300 L726 386 L650 386 Z", "#7a5a3c", "#3e2a1c", 6)
    pr += '<g fill="none" stroke-width="3"><path d="M566 322 h160 M566 344 h160 M566 366 h160"/></g>'
    pr += two_tone("M548 306 L640 220 L700 236 L744 306 Z", "M640 220 L700 236 L744 306 L660 306 Z", "#3f5a2e", "#22341a", 6)
    pr += '<path d="M600 362 L600 330 Q612 314 624 330 L624 362 Z" fill="#b8ff7a" stroke-width="4"/>'
    pr += '<path d="M670 380 L670 322 L700 322 L700 380 Z" fill="#241a12" stroke-width="4"/>'
    pr += '<path d="M690 236 L690 200 L706 200 L706 240" fill="#4a3a30" stroke-width="5"/>'
    pr += '<path d="M698 196 q-20 -30 10 -50 q30 -10 20 30 z" fill="#8dff6a" stroke-width="4" opacity="0.9"/>'
    # kazan
    pr += '<path d="M200 462 Q196 418 240 414 L300 414 Q344 418 340 462 Z" fill="#2a2a34" stroke-width="6"/>'
    pr += '<path d="M196 416 h148 v10 h-148 z" fill="#4a4a58" stroke-width="5"/>'
    pr += '<path d="M206 414 Q270 392 334 414 Z" fill="#8dff6a" stroke-width="4"/>'
    pr += '<g fill="#b8ff7a" stroke-width="3"><circle cx="250" cy="396" r="10"/><circle cx="286" cy="380" r="7"/><circle cx="266" cy="360" r="5"/></g>'
    pr += '<path d="M226 462 q-6 -24 6 -40" fill="none" stroke="#5a5a68" stroke-width="5"/>'
    # mantarlar, sazlar
    pr += mushroom(470, 470, 1.1, "#b04ad8") + mushroom(500, 466, 0.75, "#b04ad8") + mushroom(780, 460, 1.0, "#59e36a", "#2a2a34")
    pr += '<g stroke-width="5" fill="none">' + "".join(f'<path d="M{x} 470 q{d} -30 {d * 2} -60"/>' for x, d in [(160, 4), (176, -3), (812, 3), (826, -4), (540, 3)]) + '</g>'
    pr += '<g stroke="#3c5a2e" stroke-width="2.5" fill="none">' + "".join(f'<path d="M{x} 470 q{d} -30 {d * 2} -60"/>' for x, d in [(160, 4), (176, -3), (812, 3), (826, -4), (540, 3)]) + '</g>'
    pr += '<g fill="#6a4a2a" stroke-width="3">' + "".join(f'<ellipse cx="{x + d * 2}" cy="414" rx="5" ry="12"/>' for x, d in [(160, 4), (812, 3), (540, 3)]) + '</g>'
    return P, pr


def world_4():
    """KAN KATEDRALİ — gotik katedral cephesi, gül pencere, mumlar, kırık sütunlar"""
    P = dict(rock="#544870", vein="#c58cff", drape="#4a3a62", top="#6c5c88", cloud="#3e3458", cloudf="#5d4f82",
             cloudhi="#bba6e6", drip="spike", dripc="#c58cff", part="#ffd36b", moon=(760, 180))
    P["top_extra"] = ('<g fill="none" stroke-width="3" opacity="0.7"><path d="M200 440 L800 440 M260 420 L740 420 M220 460 L780 460"/>'
                      '<path d="M300 420 v40 M380 420 v40 M460 420 v40 M540 420 v40 M620 420 v40 M700 420 v40"/></g>'
                      '<path d="M440 478 L470 410 L530 410 L560 478 Z" fill="#8c2a3c" stroke-width="4"/>')
    st, sd = "#9e93b8", "#4e4466"
    pr = ""
    # katedral cephesi (odak)
    pr += two_tone("M390 420 L390 250 L610 250 L610 420 Z", "M500 250 L610 250 L610 420 L500 420 Z", st, sd, 6)
    pr += '<rect x="500" y="250" width="110" height="170" fill="url(#hatch)" stroke="none" opacity="0.45"/>'
    pr += two_tone("M380 256 L500 150 L620 256 Z", "M500 150 L620 256 L500 256 Z", "#7a6e96", "#3a3052", 6)
    # yan kuleler
    for (x, w) in ((350, 46), (604, 46)):
        pr += two_tone(f"M{x} 420 L{x} 210 L{x + w} 210 L{x + w} 420 Z", f"M{x + w / 2} 210 L{x + w} 210 L{x + w} 420 L{x + w / 2} 420 Z", st, sd, 6)
        pr += two_tone(f"M{x - 6} 214 L{x + w / 2} 110 L{x + w + 6} 214 Z", f"M{x + w / 2} 110 L{x + w + 6} 214 L{x + w / 2} 214 Z", "#7a6e96", "#3a3052", 6)
        pr += f'<path d="M{x + 14} 300 L{x + 14} 270 Q{x + w / 2} 252 {x + w - 14} 270 L{x + w - 14} 300 Z" fill="#ff4b6c" stroke-width="4"/>'
    # gül pencere
    pr += '<circle cx="500" cy="300" r="40" fill="#c0304c" stroke-width="6"/>'
    pr += '<circle cx="500" cy="300" r="16" fill="#ffd36b" stroke-width="4"/>'
    pr += '<g fill="none" stroke-width="3">' + "".join(f'<path d="M500 300 L{500 + 40 * c:.1f} {300 + 40 * s:.1f}"/>' for c, s in [(1, 0), (0.71, 0.71), (0, 1), (-0.71, 0.71), (-1, 0), (-0.71, -0.71), (0, -1), (0.71, -0.71)]) + '</g>'
    pr += '<path d="M466 420 L466 368 Q500 334 534 368 L534 420 Z" fill="#1c1428" stroke-width="5"/>'
    pr += '<path d="M478 420 L478 372 Q500 352 522 372 L522 420 Z" fill="#8c2a3c" stroke="none"/>'
    # kırık sütunlar + mumlar
    for (x, h) in ((230, 90), (770, 70), (280, 50)):
        pr += two_tone(f"M{x - 16} 460 L{x - 16} {460 - h} L{x - 4} {452 - h} L{x + 6} {464 - h} L{x + 16} {456 - h} L{x + 16} 460 Z",
                       f"M{x} {458 - h} L{x + 6} {464 - h} L{x + 16} {456 - h} L{x + 16} 460 L{x} 460 Z", st, sd)
    for (x, y) in ((330, 470), (346, 462), (680, 470), (700, 462), (720, 472)):
        pr += f'<path d="M{x - 5} {y} v-22 h10 v22 z" fill="#f2e6c8" stroke-width="3"/><path d="M{x} {y - 22} q-6 -10 0 -18 q6 8 0 18 z" fill="#ffb03a" stroke-width="2.5"/>'
    return P, pr


def world_5():
    """HİÇLİK TAHTI — basamaklı taht, arkasında hiçlik yarığı, süzülen kırıklar"""
    P = dict(rock="#6a6676", vein="#2a1240", drape="#a8a29a", top="#d8d2c4", cloud="#3c3650", cloudf="#5c5676",
             cloudhi="#c8c2e0", drip="spike", dripc="#d8d2c4", part="#e8e4d8", moon=(240, 180))
    P["top_extra"] = ('<path d="M300 470 L700 470 L670 440 L330 440 Z" fill="#bfb8a8" stroke-width="4"/>'
                      '<path d="M340 440 L660 440 L640 418 L360 418 Z" fill="#cfc8b8" stroke-width="4"/>')
    pr = ""
    # hiçlik yarığı (arka): siyah, mor kenarlı, beyaz konturlu kıvrık yırtık
    pr += '<path d="M500 110 C 560 160, 590 230, 560 300 C 540 350, 560 390, 520 420 L480 420 C 440 390, 460 350, 440 300 C 410 230, 440 160, 500 110 Z" fill="#7a3cff" stroke-width="7"/>'
    pr += '<path d="M500 140 C 548 180, 566 240, 540 300 C 524 344, 540 380, 512 410 L488 410 C 460 380, 476 344, 460 300 C 434 240, 452 180, 500 140 Z" fill="#05030c" stroke="none"/>'
    pr += '<g fill="#e8e4d8" stroke="none"><circle cx="490" cy="220" r="3"/><circle cx="512" cy="280" r="2"/><circle cx="480" cy="330" r="2.5"/><circle cx="520" cy="180" r="2"/></g>'
    # taht
    pr += two_tone("M440 420 L440 300 L456 250 L476 290 L500 230 L524 290 L544 250 L560 300 L560 420 Z",
                   "M500 230 L524 290 L544 250 L560 300 L560 420 L500 420 Z", "#e8e2d2", "#8a8474", 6)
    pr += two_tone("M424 420 L424 360 L576 360 L576 420 Z", "M500 360 L576 360 L576 420 L500 420 Z", "#d2ccbc", "#7a7464", 6)
    pr += '<path d="M470 360 L470 320 L530 320 L530 360" fill="#3a1866" stroke-width="5"/>'
    pr += '<circle cx="500" cy="276" r="10" fill="#b48cff" stroke-width="4"/>'
    pr += '<rect x="500" y="360" width="76" height="60" fill="url(#hatch)" stroke="none" opacity="0.4"/>'
    # süzülen kırıklar
    for (x, y, s) in ((300, 300, 1.0), (700, 290, 0.9), (360, 220, 0.6), (650, 210, 0.7), (250, 380, 0.7), (760, 380, 0.8)):
        pr += two_tone(f"M{x} {y - 30 * s} L{x + 18 * s} {y} L{x} {y + 30 * s} L{x - 18 * s} {y} Z", f"M{x} {y - 30 * s} L{x + 18 * s} {y} L{x} {y + 30 * s} Z", "#e8e4d8", "#8a8474", 4)
    # obelisk taşları
    for (x, h) in ((220, 110), (790, 90)):
        pr += two_tone(f"M{x - 18} 462 L{x - 14} {462 - h} L{x} {446 - h} L{x + 14} {462 - h} L{x + 18} 462 Z", f"M{x} {446 - h} L{x + 14} {462 - h} L{x + 18} 462 L{x} 462 Z", "#bdb6a6", "#6a6456")
        pr += f'<path d="M{x - 5} {440 - h * 0.5} h10 v14 h-10 z" fill="#7a3cff" stroke-width="3"/>'
    return P, pr


def world_6():
    """RÜZGÂR BAHÇESİ — çiçekli ağaçlar, rüzgâr gülü köşk, uçan yapraklar"""
    P = dict(rock="#7a6070", vein="#ffb0d0", drape="#4f8a4a", top="#7ab85a", cloud="#8a6a9a", cloudf="#c79ac8",
             cloudhi="#ffe6f6", drip="root", dripc="#6a4a3a", part="#ffb0d0", part_kind="petal", moon=(780, 180))
    P["top_extra"] = ('<path d="M380 478 C 420 450, 480 440, 520 420" stroke="#e8d8b0" stroke-width="22" fill="none"/>'
                      '<path d="M380 478 C 420 450, 480 440, 520 420" stroke="#0b0a14" stroke-width="2.5" fill="none" stroke-dasharray="10 12"/>')
    pr = ""
    # rüzgâr köşkü (odak): ahşap kule + yel değirmeni kanatları
    pr += two_tone("M560 440 L574 290 L656 290 L670 440 Z", "M615 290 L656 290 L670 440 L615 440 Z", "#e8d8b8", "#9a8268", 6)
    pr += two_tone("M552 296 L615 220 L678 296 Z", "M615 220 L678 296 L615 296 Z", "#d8506a", "#8a2a40", 6)
    pr += '<path d="M600 440 L600 404 Q615 388 630 404 L630 440 Z" fill="#5a3a2a" stroke-width="4"/>'
    pr += '<circle cx="615" cy="340" r="12" fill="#ffd36b" stroke-width="4"/>'
    for (dx, dy) in ((-1, -1), (1, -1), (1, 1), (-1, 1)):
        pr += (f'<path d="M615 262 L{615 + dx * 20} {262 + dy * 76} L{615 + dx * 48} {262 + dy * 58} Z" fill="#f4ecd8" stroke-width="4" transform="rotate(20 615 262)"/>')
    pr += '<circle cx="615" cy="262" r="8" fill="#8a2a40" stroke-width="4"/>'
    # çiçekli ağaçlar
    for (x, y, s) in ((240, 456, 1.1), (760, 448, 0.95), (420, 430, 0.7)):
        pr += f'<path d="M{x - 6 * s} {y} L{x - 2 * s} {y - 70 * s} L{x + 6 * s} {y - 70 * s} L{x + 8 * s} {y} Z" fill="#6a4a3a" stroke-width="4"/>'
        pr += (f'<path d="M{x - 60 * s} {y - 80 * s} q-6 {-40 * s} {34 * s} {-50 * s} q{10 * s} {-36 * s} {50 * s} {-26 * s} '
               f'q{40 * s} {-6 * s} {44 * s} {30 * s} q{30 * s} {16 * s} {6 * s} {46 * s} q{-30 * s} {20 * s} {-70 * s} {6 * s} q{-40 * s} {10 * s} {-64 * s} {-6 * s} Z" '
               f'fill="#ff9ec4" stroke-width="5"/>')
        pr += f'<path d="M{x} {y - 150 * s} q{40 * s} {-6 * s} {44 * s} {30 * s} q{30 * s} {16 * s} {6 * s} {46 * s} q{-20 * s} {12 * s} {-50 * s} {6 * s} z" fill="#d86a98" stroke="none"/>'
        pr += f'<g fill="#ffffff" stroke="none"><circle cx="{x - 30 * s}" cy="{y - 120 * s}" r="{4 * s}"/><circle cx="{x + 10 * s}" cy="{y - 140 * s}" r="{3 * s}"/><circle cx="{x - 10 * s}" cy="{y - 100 * s}" r="{3 * s}"/></g>'
    # çalılar ve çiçekler
    for (x, y) in ((330, 470), (500, 474), (700, 468), (800, 460)):
        pr += f'<path d="M{x - 22} {y} q-4 -26 22 -26 q26 0 22 26 z" fill="#4f8a4a" stroke-width="4"/>'
        pr += f'<circle cx="{x - 6}" cy="{y - 16}" r="5" fill="#ffd36b" stroke-width="2.5"/><circle cx="{x + 8}" cy="{y - 12}" r="4" fill="#ffffff" stroke-width="2.5"/>'
    return P, pr


def world_7():
    """TUZ TABANI — çatlak tuz yüzeyi, tuz sütunları, ağarmış kafatası, dikilitaş"""
    P = dict(rock="#8a7258", vein="#fff2c8", drape="#e8dcc0", top="#f6eedc", cloud="#8a6e58", cloudf="#c4a07e",
             cloudhi="#fff0d8", drip="spike", dripc="#f6eedc", part="#fff2c8", moon=(240, 180))
    P["top_extra"] = ('<g fill="none" stroke-width="3" opacity="0.8">'
                      '<path d="M200 440 l40 -12 l40 10 l30 -16 l50 8 l40 -12 l60 10 l40 -14 l50 12 l40 -8 l60 10 l40 -6"/>'
                      '<path d="M240 428 l-10 -20 M310 422 l6 -16 M400 418 l-8 -14 M500 424 l10 -18 M600 418 l-6 -16 M690 426 l8 -18"/>'
                      '<path d="M260 466 l30 -12 l40 8 M560 470 l40 -14 l30 6"/></g>')
    pr = ""
    # tuz sütunları (odak) — altıgen kristal kule kümesi
    for (x, h, s) in ((600, 210, 1.3), (660, 150, 1.0), (548, 130, 0.9), (700, 100, 0.8)):
        pr += two_tone(f"M{x - 20 * s} 452 L{x - 20 * s} {452 - h} L{x} {440 - h - 16 * s} L{x + 20 * s} {452 - h} L{x + 20 * s} 452 Z",
                       f"M{x} {440 - h - 16 * s} L{x + 20 * s} {452 - h} L{x + 20 * s} 452 L{x} 452 Z", "#fffaf0", "#c8b896", 6)
        pr += f'<path d="M{x - 12 * s} {440 - h * 0.6} l0 {h * 0.4}" fill="none" stroke="#ffffff" stroke-width="3"/>'
    pr += '<rect x="600" y="230" width="34" height="222" fill="url(#hatchF)" stroke="none" opacity="0.4"/>'
    # dikilitaş
    pr += two_tone("M300 456 L306 300 L322 280 L338 300 L344 456 Z", "M322 280 L338 300 L344 456 L322 456 Z", "#d8c4a0", "#8a7458", 6)
    pr += '<path d="M314 360 h16 M314 380 h16 M314 400 h16" fill="none" stroke-width="3"/>'
    pr += '<path d="M316 330 l6 -8 l6 8 l-6 8 z" fill="#ffd68c" stroke-width="3"/>'
    # ağarmış dev kafatası
    pr += '<path d="M380 470 Q376 420 430 414 Q486 418 484 462 L474 470 L464 462 L454 470 L444 462 L434 470 L424 462 L414 470 L404 462 L394 470 Z" fill="#fff4dc" stroke-width="6"/>'
    pr += '<path d="M432 414 Q486 418 484 462 L474 470 L464 462 L454 470 L444 462 L436 470 L436 430 Z" fill="#cdbb98" stroke="none"/>'
    pr += '<path d="M380 470 Q376 420 430 414 Q486 418 484 462 L474 470 L464 462 L454 470 L444 462 L434 470 L424 462 L414 470 L404 462 L394 470 Z" fill="none" stroke-width="6"/>'
    pr += '<ellipse cx="414" cy="440" rx="12" ry="10" fill="#0b0a14" stroke="none"/><ellipse cx="452" cy="440" rx="12" ry="10" fill="#0b0a14" stroke="none"/>'
    pr += '<path d="M372 446 q-30 -20 -24 -50 M488 446 q30 -20 24 -50" fill="none" stroke-width="7"/>'
    pr += '<path d="M372 446 q-30 -20 -24 -50 M488 446 q30 -20 24 -50" fill="none" stroke="#fff4dc" stroke-width="3"/>'
    # küçük tuz kristalleri, kuru otlar
    for (x, s) in ((220, 0.6), (780, 0.7), (520, 0.5)):
        pr += crystal(x, 466, s, "#fffaf0", "#c8b896", 80)
    pr += '<g fill="none" stroke-width="4">' + "".join(f'<path d="M{x} 470 l-8 -24 M{x} 470 l0 -28 M{x} 470 l8 -22"/>' for x in (260, 740, 820)) + '</g>'
    return P, pr


def world_8():
    """DONMUŞ GÖL — yıkık donmuş kule, buz dikenleri, kuru ağaçlar, kırık buz gölet"""
    P = dict(rock="#41578a", vein="#8ff0ff", drape="#e4f2ff", top="#f4faff", cloud="#5b6aa6", cloudf="#8090c8",
             cloudhi="#c9d3f2", drip="spike", dripc="#c6f2ff", part="#ffffff", moon=(760, 200))
    P["top_extra"] = ('<path d="M300 448 C 300 426, 460 420, 480 436 C 486 456, 330 470, 300 448 Z" fill="#5fb8e4" stroke-width="5"/>'
                      '<g fill="#a9e8ff" stroke-width="2.5"><path d="M316 446 l40 -14 l26 16 l-30 12 z"/><path d="M386 450 l36 -16 l40 6 l-28 18 z"/><path d="M352 432 l40 -6 l-6 10 z"/></g>'
                      '<path d="M330 438 l40 -8" fill="none" stroke="#ffffff" stroke-width="3"/>')
    pr = ""
    pr += two_tone("M540 470 L540 380 L556 372 L560 392 L578 386 L576 470 Z", "M560 470 L560 392 L578 386 L576 470 Z", "#8aa2c8", "#4e6595", 6)
    tower = "M600 470 L600 250 L590 240 L612 150 L628 92 L640 60 L652 98 L668 150 L690 240 L680 250 L680 300 L706 286 L700 330 L712 470 Z"
    tsh = "M640 60 L652 98 L668 150 L690 240 L680 250 L680 300 L706 286 L700 330 L712 470 L644 470 L644 60 Z"
    pr += f'<path d="{tower}" fill="#a9bfe0" stroke-width="6"/><path d="{tsh}" fill="#566f9f" stroke="none"/><path d="{tsh}" fill="url(#hatch)" stroke="none" opacity="0.6"/>'
    pr += '<g fill="none" stroke-width="2.5"><path d="M600 300 h44 M600 350 h100 M600 400 h108 M600 440 h110 M622 300 v50 M660 350 v50 M630 400 v40 M684 400 v40"/></g>'
    pr += f'<path d="{tower}" fill="none" stroke-width="6"/>'
    pr += '<path d="M612 150 L628 92 L640 60 L652 98 L668 150 Q 640 138 612 150 Z" fill="#eef8ff" stroke-width="5"/>'
    pr += '<path d="M590 240 L690 240 L686 254 L594 254 Z" fill="#eef8ff" stroke-width="4"/>'
    pr += '<path d="M622 232 L622 200 Q630 182 638 200 L638 232 Z" fill="#9ff6ff" stroke-width="4"/><path d="M626 230 L626 204 Q630 194 634 204 L634 230 Z" fill="#ffffff" stroke="none"/>'
    pr += '<path d="M616 340 L616 306 Q626 288 636 306 L636 340 Z" fill="#9ff6ff" stroke-width="4"/>'
    pr += '<path d="M664 420 L664 392 Q674 376 684 392 L684 420 Z" fill="#5fd8f5" stroke-width="4"/>'
    pr += '<path d="M618 470 L618 428 Q636 404 654 428 L654 470 Z" fill="#141a33" stroke-width="5"/>'
    pr += '<g fill="#c6f2ff" stroke-width="3"><path d="M594 254 l8 0 l-4 26 z"/><path d="M676 254 l8 0 l-4 30 z"/><path d="M700 330 l8 0 l-4 22 z"/></g>'
    for (x, s, h) in ((754, 1.0, 150), (798, 0.75, 110), (724, 0.6, 80)):
        pr += crystal(x, 460, s, "#c6f2ff", "#4fb3e3", h)
    pr += dead_tree(232, 452, 1.0, "#1a1626", "#eef8ff") + dead_tree(170, 458, 0.6, "#1a1626", "#eef8ff")
    pr += two_tone("M480 470 L480 418 Q496 396 512 418 L512 470 Z", "M496 402 Q512 408 512 418 L512 470 L496 470 Z", "#7a8fb8", "#3e527f")
    pr += '<path d="M478 420 Q496 400 514 420 L510 410 Q496 398 482 410 Z" fill="#eef8ff" stroke-width="3"/><path d="M490 440 l6 -8 l6 8 l-6 8 z" fill="#8ff0ff" stroke-width="2.5"/>'
    return P, pr


def world_9():
    """KEMİK BAHÇESİ — kaburga kemerleri, kafatası totemi, kemik ağaçları, kemik çiçekleri"""
    P = dict(rock="#66564a", vein="#ffe296", drape="#3a3a2a", top="#5a5a3c", cloud="#4a4036", cloudf="#706252",
             cloudhi="#e6d6b0", drip="root", dripc="#e8dcc0", part="#ffe296", moon=(780, 190))
    P["body_extra"] = ('<g fill="#efe4c8" stroke-width="4"><path d="M360 540 l40 10 l-4 10 l-40 -10 z"/><circle cx="356" cy="542" r="7"/><circle cx="400" cy="556" r="7"/>'
                       '<path d="M560 680 q20 -10 40 0 q-20 30 -40 0 z"/></g>')
    bone, boneD = "#f2e8cc", "#a8986e"
    pr = ""
    # dev kaburga kemerleri (odak)
    for i, x in enumerate((520, 560, 600, 640)):
        h = 150 - i * 10
        pr += f'<path d="M{x} 452 C {x - 60} {452 - h}, {x + 70} {452 - h - 40}, {x + 90} {452 - h * 0.3}" fill="none" stroke-width="16"/>'
        pr += f'<path d="M{x} 452 C {x - 60} {452 - h}, {x + 70} {452 - h - 40}, {x + 90} {452 - h * 0.3}" fill="none" stroke="{bone}" stroke-width="9"/>'
    pr += '<path d="M500 456 C 560 420, 660 400, 740 380" fill="none" stroke-width="18"/><path d="M500 456 C 560 420, 660 400, 740 380" fill="none" stroke="#e0d4b0" stroke-width="10"/>'
    # kafatası totemi
    pr += f'<path d="M300 462 L300 330" fill="none" stroke-width="12"/><path d="M300 462 L300 330" fill="none" stroke="#6a4a2a" stroke-width="6"/>'
    pr += two_tone("M270 330 Q268 286 300 282 Q332 286 330 330 L320 340 L310 334 L300 342 L290 334 L280 340 Z",
                   "M300 282 Q332 286 330 330 L320 340 L310 334 L300 342 Z", bone, boneD, 6)
    pr += '<ellipse cx="288" cy="310" rx="8" ry="7" fill="#ffb03a" stroke-width="3"/><ellipse cx="312" cy="310" rx="8" ry="7" fill="#ffb03a" stroke-width="3"/>'
    pr += '<path d="M276 350 l-24 30 M324 350 l24 30" fill="none" stroke-width="6"/><path d="M276 350 l-24 30 M324 350 l24 30" fill="none" stroke="#c0304c" stroke-width="2.5"/>'
    # kemik ağaçları
    for (x, y, s) in ((200, 456, 1.0), (800, 446, 0.8)):
        pr += dead_tree(x, y, s, bone)
    # kemik çiçekleri / mantarlar
    for (x, y) in ((380, 470), (420, 462), (720, 470), (460, 474)):
        pr += f'<path d="M{x} {y} v-24" fill="none" stroke-width="5"/><path d="M{x} {y} v-24" fill="none" stroke="#4f6a3a" stroke-width="2"/>'
        pr += f'<circle cx="{x}" cy="{y - 28}" r="8" fill="#ffe296" stroke-width="3"/><circle cx="{x}" cy="{y - 28}" r="3" fill="#c0304c" stroke="none"/>'
    pr += mushroom(250, 470, 0.8, "#c86a3a") + mushroom(760, 468, 0.7, "#c86a3a")
    pr += '<g fill="#f2e8cc" stroke-width="3"><path d="M560 470 l30 -6 l2 6 l-30 6 z"/><circle cx="558" cy="470" r="5"/><circle cx="592" cy="464" r="5"/></g>'
    return P, pr


def world_10():
    """YILDIZ DÖKÜMHANESİ — ocak + örs, parlayan yıldız, baca, dev dişli"""
    P = dict(rock="#46506c", vein="#7ab0ff", drape="#4a5068", top="#6a7088", cloud="#343a56", cloudf="#4e5678",
             cloudhi="#b8c8ff", drip="spike", dripc="#ffd36b", part="#ffd36b", moon=(240, 180))
    P["top_extra"] = ('<g fill="none" stroke-width="3" opacity="0.8"><path d="M200 446 L800 446 M240 426 L760 426"/>'
                      '<path d="M320 426 v20 M440 426 v20 M560 426 v20 M680 426 v20 M260 446 v24 M380 446 v24 M500 446 v24 M620 446 v24 M740 446 v24"/></g>'
                      '<g fill="#3a4058" stroke-width="2.5">' + "".join(f'<circle cx="{x}" cy="{y}" r="3"/>' for x, y in [(330, 436), (450, 436), (570, 436), (690, 436)]) + '</g>')
    P["body_extra"] = '<path d="M430 470 L452 540 L438 600 L470 640" fill="none" stroke="#ffd36b" stroke-width="5"/>'
    pr = ""
    # dev dişli (arka)
    import math
    g = ""
    for i in range(12):
        a = i * math.pi / 6
        c, s = math.cos(a), math.sin(a)
        g += f"L{230 + 92 * c - 12 * s:.1f} {300 + 92 * s + 12 * c:.1f} L{230 + 112 * c - 10 * s:.1f} {300 + 112 * s + 10 * c:.1f} L{230 + 112 * c + 10 * s:.1f} {300 + 112 * s - 10 * c:.1f} L{230 + 92 * c + 12 * s:.1f} {300 + 92 * s - 12 * c:.1f} "
    pr += f'<path d="M{230 + 92:.1f} {300 + 12:.1f} {g} Z" fill="#8a7458" stroke-width="6"/>'
    pr += '<circle cx="230" cy="300" r="60" fill="#5a4a3a" stroke-width="5"/><circle cx="230" cy="300" r="20" fill="#2a2018" stroke-width="5"/>'
    pr += '<path d="M230 300 m-60 0 a60 60 0 0 1 120 0" fill="url(#hatch)" stroke="none" opacity="0.4"/>'
    # ocak (odak): tuğla gövde, kemerli ağız, baca
    pr += two_tone("M520 452 L530 300 L700 300 L710 452 Z", "M615 300 L700 300 L710 452 L615 452 Z", "#7a5a4a", "#3a2820", 6)
    pr += '<g fill="none" stroke-width="2.5"><path d="M528 330 h176 M526 360 h180 M524 390 h184 M522 420 h186"/><path d="M570 300 v30 M650 300 v30 M600 330 v30 M680 330 v30 M560 360 v30 M640 360 v30 M590 390 v30 M670 390 v30"/></g>'
    pr += '<path d="M570 452 L570 400 Q615 352 660 400 L660 452 Z" fill="#ff8a3c" stroke-width="6"/>'
    pr += '<path d="M586 452 L586 406 Q615 376 644 406 L644 452 Z" fill="#ffd36b" stroke="none"/>'
    pr += two_tone("M640 300 L640 180 L686 180 L686 300 Z", "M663 180 L686 180 L686 300 L663 300 Z", "#5a4a44", "#2a2024", 6)
    pr += '<path d="M630 180 h66 v14 h-66 z" fill="#3a3034" stroke-width="5"/>'
    pr += '<path d="M650 170 q-20 -30 10 -50 q-10 -30 30 -40 q30 10 14 40 q30 20 0 50 z" fill="#4a5068" stroke-width="5"/>'
    pr += '<g fill="#ffd36b" stroke-width="2.5"><circle cx="672" cy="120" r="5"/><circle cx="700" cy="96" r="4"/><circle cx="650" cy="90" r="3.5"/></g>'
    # örs + üstünde parlayan yıldız
    pr += two_tone("M720 470 L734 440 L712 432 L712 420 L800 420 Q806 432 792 438 L776 440 L790 470 Z",
                   "M756 420 L800 420 Q806 432 792 438 L776 440 L790 470 L756 470 Z", "#8a90a8", "#3a4058", 6)
    pr += ('<path d="M756 330 l10 30 l32 2 l-26 18 l10 30 l-26 -18 l-26 18 l10 -30 l-26 -18 l32 -2 z" fill="#ffd36b" stroke-width="5"/>'
           '<path d="M756 346 l6 18 l20 1 l-16 11 l6 18 l-16 -11 l-16 11 l6 -18 l-16 -11 l20 -1 z" fill="#ffffff" stroke="none"/>')
    pr += '<g fill="none" stroke="#ffd36b" stroke-width="4"><path d="M712 360 l-20 -10 M800 360 l20 -10 M756 316 v-20"/></g>'
    # küçük dişliler, metal kristaller
    for (x, s) in ((360, 0.6), (430, 0.45)):
        pr += f'<circle cx="{x}" cy="{462 - 30 * s}" r="{30 * s}" fill="#8a7458" stroke-width="5"/><circle cx="{x}" cy="{462 - 30 * s}" r="{10 * s}" fill="#2a2018" stroke-width="4"/>'
    pr += crystal(800, 470, 0.5, "#b8d4ff", "#4a6ab8", 80)
    return P, pr


WORLDS = [world_1, world_2, world_3, world_4, world_5, world_6, world_7, world_8, world_9, world_10]


def main():
    out = sys.argv[1] if len(sys.argv) > 1 else "."
    os.makedirs(out, exist_ok=True)
    for i, fn in enumerate(WORLDS, 1):
        P, props = fn()
        with open(os.path.join(out, f"w{i}.svg"), "w") as f:
            f.write(compose(P, props, i * 31))
        print("yazıldı", f"w{i}.svg")


if __name__ == "__main__":
    main()
