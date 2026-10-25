class_name TitleArt
extends Node2D
## İLK AÇILIŞ EKRANI (firma introsundan sonra): kahraman kartı yelpazesi. Gece moru zeminde yavaşça
## dönen çizgi roman ışınları ve Kızıl Ay halesi; ortada üç boyalı kahraman kartı (kenarları nadirlik
## renginde, mürekkep konturlu) yelpaze gibi açılır ve hafifçe nefes alır; üstte SHADOWREND patlaması,
## korlar yükselir; altta ince yükleme çubuğu. Savaş yükleme ekranından (LoadArt) ayrıdır.
## Hareketler yalnız dönüşümle yapılır (kare başı yeniden çizim yok) — kurulum adımları sırasında da
## akıcı kalır.

const INK := Color(0.05, 0.03, 0.07)
const YEL := Color("#ffd23a")
const RED := Color("#e8322c")
const MOON := Color("#d8303f")
## yelpazedeki kahramanlar: [kimlik, kenar rengi]
const CARDS := [["okcu", "#4f9dff"], ["kralice", "#ffb020"], ["mezarci", "#9aa3b0"]]

var size_l := Vector2(390, 844)
var bottom_pad := 0.0
var top_pad := 0.0
var progress := 0.0
var _t := 0.0
var _rays: Node2D
var _cards: Array = []          # [düğüm, taban konum, taban açı, faz]
var _logo: Node2D
var _embers: Node2D
var _ember: Array = []          # [x, y0, hız, faz, boy]
var _bar: Node2D
var _pct: UIText
var _fan := Vector2.ZERO
var _cw := 150.0

func setup(sz: Vector2) -> void:
	size_l = sz
	var w := sz.x
	var h := sz.y
	_cw = clampf(w * 0.4, 120.0, 190.0)
	_fan = Vector2(w * 0.5, top_pad + h * 0.53)
	# ── zemin: üstte derin mor, dipte siyah; ortada Kızıl Ay halesi + yarım ton ──
	var bg := Node2D.new()
	bg.draw.connect(func():
		var top := Color("#2a1038")
		var mid := Color("#150a20")
		var bot := Color("#07050b")
		bg.draw_polygon(PackedVector2Array([Vector2(-20, -200), Vector2(w + 20, -200), Vector2(w + 20, h * 0.55), Vector2(-20, h * 0.55)]), PackedColorArray([top, top, mid, mid]))
		bg.draw_polygon(PackedVector2Array([Vector2(-20, h * 0.55), Vector2(w + 20, h * 0.55), Vector2(w + 20, h + 200), Vector2(-20, h + 200)]), PackedColorArray([mid, mid, bot, bot]))
		var B := TriBatch.new()
		B.radial(_fan, w * 0.95, Color(MOON, 0.42), Color(MOON, 0.0), 1.0, 56)
		B.radial(_fan + Vector2(0, -_cw * 0.2), w * 0.45, Color(1.0, 0.55, 0.35, 0.22), Color(1.0, 0.5, 0.3, 0.0), 1.0, 40)
		var rng := RandomNumberGenerator.new()
		rng.seed = 41
		for i in 46:
			B.circle(Vector2(rng.randf() * w, rng.randf() * h * 0.7), rng.randf_range(0.7, 1.8), Color(1, 1, 1, rng.randf_range(0.15, 0.55)), 6)
		B.flush(bg)
		ComicSkin.halftone(bg, Rect2(-20, h - 300, w + 40, 300), Color(0, 0, 0, 0.4), 12.0, 15, 3.6))
	add_child(bg)
	# ── ışınlar (tek düğüm, döndürülür) ──
	_rays = Node2D.new()
	_rays.position = _fan
	_rays.draw.connect(func():
		var B := TriBatch.new()
		var R := maxf(w, h) * 1.3
		for i in 20:
			var a := i * TAU / 20.0
			B._tri(Vector2.ZERO, Vector2(cos(a - 0.07), sin(a - 0.07)) * R, Vector2(cos(a + 0.07), sin(a + 0.07)) * R, Color(1.0, 0.75, 0.5, 0.07))
		B.flush(_rays))
	add_child(_rays)
	# ── kahraman kartları (yan kartlar arkada, ortadaki önde) ──
	var specs := [[0, -1.0], [2, 1.0], [1, 0.0]]
	for sp in specs:
		var idx: int = sp[0]
		var side: float = sp[1]
		var C: Array = CARDS[idx]
		var front := side == 0.0
		var cw := _cw * (1.0 if front else 0.86)
		var n := _card(str(C[0]), Color(str(C[1])), cw)
		var pos := _fan + Vector2(side * _cw * 0.7, (0.0 if front else _cw * 0.12) - _cw * 0.15)
		var rot := side * 0.24
		n.position = pos
		n.rotation = rot
		n.scale = Vector2.ZERO
		add_child(n)
		_cards.append([n, pos, rot, idx * 1.7, 0.18 + absf(side) * 0.12])
	# ── korlar ──
	var rng2 := RandomNumberGenerator.new()
	rng2.seed = 9
	for i in 26:
		_ember.append([rng2.randf() * w, h * rng2.randf_range(0.4, 1.0), rng2.randf_range(16.0, 40.0), rng2.randf() * TAU, rng2.randf_range(1.6, 3.4)])
	_embers = Node2D.new()
	_embers.draw.connect(_draw_embers)
	add_child(_embers)
	# ── logo ──
	_logo = Node2D.new()
	_logo.position = Vector2(w * 0.5, _fan.y - _cw * 1.36)
	_logo.draw.connect(func(): ScrCeremony._star(_logo, Vector2.ZERO, w * 0.5, w * 0.38, 15, RED, 5.0, 0.0, 0.36))
	add_child(_logo)
	var lt := UIText.new()
	var fs := clampf(w * 0.15, 44.0, 66.0)
	lt.style(false, 1000, fs, 3.0, YEL, UIK.ink_stroke(4.0, 6.0))
	lt.align = 0.5
	lt.nowrap = true
	lt.wrap_w = w
	lt.size = Vector2(w, fs * 1.4)
	lt.position = Vector2(-w * 0.5, -fs * 0.66)
	lt.text = "SHADOWREND"
	_logo.add_child(lt)
	_logo.rotation = -0.04
	_logo.scale = Vector2.ZERO
	# ── slogan şeridi (kartların altında) ──
	var rib := Node2D.new()
	rib.position = Vector2(w * 0.5, _fan.y + _cw * 0.98)
	rib.rotation = -0.02
	var rw := minf(w - 70.0, 280.0)
	rib.draw.connect(func():
		var P := PackedVector2Array([Vector2(-rw * 0.5 - 12, -15), Vector2(rw * 0.5 + 6, -17), Vector2(rw * 0.5 + 12, 15), Vector2(-rw * 0.5 - 6, 17)])
		var B := TriBatch.new()
		var Sh := PackedVector2Array()
		for q in P: Sh.append(q + Vector2(4, 5))
		B.poly(Sh, INK)
		B.poly(P, INK.lerp(MOON, 0.25))
		B.flush(rib))
	var rt := UIText.new()
	rt.style(false, 1000, 17, 2.0, YEL, UIK.ink_stroke(1.8, 2.2))
	rt.align = 0.5
	rt.nowrap = true
	rt.wrap_w = rw
	rt.size = Vector2(rw, 26)
	rt.position = Vector2(-rw * 0.5, -12)
	rt.text = "KIZIL AY DOĞUYOR"
	rib.add_child(rt)
	add_child(rib)
	# ── çubuk + yüzde ──
	var by := h - bottom_pad - 64.0
	_bar = Node2D.new()
	_bar.position = Vector2(w * 0.14, by)
	_bar.draw.connect(_draw_bar)
	add_child(_bar)
	var lb := UIText.new()
	lb.style(false, 900, 13, 3.0, Color("#e9dcef"), UIK.ink_stroke(1.5, 2.0))
	lb.nowrap = true
	lb.size = Vector2(w * 0.5, 20)
	lb.position = Vector2(w * 0.14, by - 24)
	lb.text = "YÜKLENİYOR"
	add_child(lb)
	_pct = UIText.new()
	_pct.style(false, 1000, 13, 1.0, YEL, UIK.ink_stroke(1.5, 2.0))
	_pct.align = 1.0
	_pct.nowrap = true
	_pct.wrap_w = w * 0.72
	_pct.size = Vector2(w * 0.72, 20)
	_pct.position = Vector2(w * 0.14, by - 24)
	_pct.text = "%0"
	add_child(_pct)
	var co := UIText.new()
	co.style(false, 800, 10, 3.0, Color(1, 1, 1, 0.42), "")
	co.align = 0.5
	co.nowrap = true
	co.wrap_w = w
	co.size = Vector2(w, 16)
	co.position = Vector2(0, by + 22)
	co.text = "ALPHA WOLF GAMES · v" + str(ProjectSettings.get_setting("application/config/version", ""))
	add_child(co)

## boyalı kahraman kartı: mürekkep gölge + nadirlik kenarı + görsel (köşeleri yuvarlatılmış)
func _card(id: String, col: Color, cw: float) -> Node2D:
	var ch := cw * 4.0 / 3.0
	var root := Node2D.new()
	var tx: Texture2D = load("res://assets/ui/art/herocard/" + id + ".png")
	var fr := Node2D.new()
	fr.position = -Vector2(cw, ch) * 0.5
	root.add_child(fr)
	fr.draw.connect(func():
		fr.draw_style_box(ComicSkin.sb(INK, 16), Rect2(Vector2(5, 8), Vector2(cw, ch)))
		fr.draw_style_box(ComicSkin.sb(col, 16, 4.0, INK), Rect2(Vector2(-4, -4), Vector2(cw + 8, ch + 8))))
	if tx:
		var img := UIK.round_image(tx, cw - 6, ch - 6, 12, Vector2(0.5, 0.2))
		img.position = -Vector2(cw, ch) * 0.5 + Vector2(3, 3)
		root.add_child(img)
	var gl := Node2D.new()
	gl.position = -Vector2(cw, ch) * 0.5
	root.add_child(gl)
	gl.draw.connect(func():
		# üst parlama + iç ince çizgi
		gl.draw_style_box(ComicSkin.sb(Color(1, 1, 1, 0.0), 12, 2.0, Color(1, 1, 1, 0.35)), Rect2(Vector2(3, 3), Vector2(cw - 6, ch - 6))))
	return root

func _draw_embers() -> void:
	var B := TriBatch.new()
	for e in _ember:
		var y: float = fposmod(float(e[1]) - _t * float(e[2]), size_l.y * 0.65) + size_l.y * 0.32
		var x: float = float(e[0]) + sin(_t * 0.8 + float(e[3])) * 10.0
		var a := clampf((y - size_l.y * 0.32) / (size_l.y * 0.2), 0.0, 1.0)
		B.circle(Vector2(x, y), float(e[4]), Color(1.0, 0.5, 0.25, 0.8 * a), 6)
	B.flush(_embers)

func set_progress(p: float) -> void:
	progress = clampf(p, 0.0, 1.0)
	if _pct: _pct.text = "%" + str(int(round(progress * 100.0)))
	if _bar: _bar.queue_redraw()

func _draw_bar() -> void:
	var bw := size_l.x * 0.72
	var br := Rect2(0, 0, bw, 12)
	_bar.draw_style_box(ComicSkin.sb(INK, 6), Rect2(br.position + Vector2(0, 3), br.size))
	_bar.draw_style_box(ComicSkin.sb(Color("#1d1026"), 6, 2.5), br)
	var fw := (bw - 6) * progress
	if fw > 4.0:
		var fr := Rect2(Vector2(3, 3), Vector2(fw, 6))
		_bar.draw_style_box(ComicSkin.sb(RED.lerp(YEL, progress * 0.8), 3), fr)
		var B := TriBatch.new()
		B.radial(Vector2(fr.end.x, 6), 16.0, Color(1, 0.8, 0.4, 0.6), Color(1, 0.6, 0.3, 0.0), 0.7, 16)
		B.flush(_bar)

func _process(dt: float) -> void:
	# kurulum adımı uzun sürdüyse zaman sıçramasın (animasyon atlamaz, akar)
	_t += minf(dt, 1.0 / 30.0)
	_rays.rotation = _t * 0.08
	for i in _cards.size():
		var c: Array = _cards[i]
		var n: Node2D = c[0]
		var k := clampf((_t - float(c[4])) / 0.45, 0.0, 1.0)
		var s := ScrLevelUp._back_ease(k) if k < 1.0 else 1.0 + sin(_t * 1.6 + float(c[3])) * 0.012
		n.scale = Vector2.ONE * s
		n.position = (c[1] as Vector2) + Vector2(0, sin(_t * 1.2 + float(c[3])) * 4.0)
		n.rotation = float(c[2]) + sin(_t * 0.9 + float(c[3])) * 0.015
	var kl := clampf((_t - 0.5) / 0.45, 0, 1)
	_logo.scale = Vector2.ONE * (ScrLevelUp._back_ease(kl) if kl < 1.0 else 1.0 + sin(_t * 2.0) * 0.012)
	_embers.queue_redraw()
