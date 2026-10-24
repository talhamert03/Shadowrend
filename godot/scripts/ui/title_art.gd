class_name TitleArt
extends Node2D
## İLK AÇILIŞ EKRANI (firma introsundan sonra): sade, premium başlık sahnesi. Savaş yükleme ekranından
## (LoadArt) ayrı: gece göğünde büyük KIZIL AY (mürekkep kontur + yarım ton), önünden geçen taraklı
## bulut şeritleri, uzakta süzülen ada siluetleri (dünya önizleme çizimleri, karartılmış), dipte
## mürekkep kayalık; ortada SHADOWREND logosu, yükselen korlar; altta ince yükleme çubuğu.
## Kurulum adımları ana iş parçacığını bölebilir — hareketler yavaş ve sakin (takılma göze batmaz).

const INK := Color(0.05, 0.03, 0.07)
const YEL := Color("#ffd23a")
const RED := Color("#e8322c")
const MOON := Color("#d8303f")

var size_l := Vector2(390, 844)
var bottom_pad := 0.0
var top_pad := 0.0
var progress := 0.0
var _t := 0.0
var _sky: Node2D
var _moon: Node2D
var _clouds: Array = []        # [Node2D, hız, genişlik]
var _isles: Array = []         # [Sprite2D, y0, faz]
var _cliff: Node2D
var _embers: Node2D
var _logo: Node2D
var _bar: Node2D
var _lbl: UIText
var _pct: UIText
var _mc := Vector2.ZERO
var _mr := 120.0
var _ember: Array = []         # [x, y0, hız, faz, boy]

func setup(sz: Vector2) -> void:
	size_l = sz
	var w := sz.x
	var h := sz.y
	_mc = Vector2(w * 0.5, top_pad + h * 0.25)
	_mr = minf(w * 0.36, h * 0.17)
	# ── gök: üstte derin mor, dipte siyaha; ayın ardında kızıl hale ──
	_sky = Node2D.new()
	_sky.draw.connect(func():
		var top := Color("#241032")
		var mid := Color("#12081c")
		var bot := Color("#07050b")
		_sky.draw_polygon(PackedVector2Array([Vector2(-20, -200), Vector2(w + 20, -200), Vector2(w + 20, h * 0.6), Vector2(-20, h * 0.6)]), PackedColorArray([top, top, mid, mid]))
		_sky.draw_polygon(PackedVector2Array([Vector2(-20, h * 0.6), Vector2(w + 20, h * 0.6), Vector2(w + 20, h + 200), Vector2(-20, h + 200)]), PackedColorArray([mid, mid, bot, bot]))
		var B := TriBatch.new()
		B.radial(_mc, _mr * 2.6, Color(MOON, 0.30), Color(MOON, 0.0), 1.0, 48)
		var rng := RandomNumberGenerator.new()
		rng.seed = 77
		for i in 40:
			var p := Vector2(rng.randf() * w, rng.randf() * h * 0.62)
			if p.distance_to(_mc) < _mr * 1.15: continue
			B.circle(p, rng.randf_range(0.7, 1.7), Color(1, 1, 1, rng.randf_range(0.2, 0.6)), 6)
		B.flush(_sky))
	add_child(_sky)
	# ── Kızıl Ay ──
	_moon = Node2D.new()
	_moon.position = _mc
	_moon.draw.connect(_draw_moon)
	add_child(_moon)
	# ── bulut kıyıları: ayın altını örter; adalar iki kıyı arasında süzülür ──
	_add_cloud(_mc.y + _mr * 0.62, 1.0, 9.0, Color("#3a2450"))
	# ── ortada süzülen ada (Kan Katedrali çizimi, aysız sürüm — tools/islands/gen.py NOMOON=1) ──
	var tx: Texture2D = load("res://assets/ui/art/title_isle.png")
	if tx:
		var sp := Sprite2D.new()
		sp.texture = tx
		sp.scale = Vector2.ONE * (minf(w * 0.74, h * 0.34) / tx.get_width())
		var y0 := h * 0.63
		sp.position = Vector2(w * 0.5, y0)
		sp.modulate = Color(0.86, 0.8, 0.92)
		add_child(sp)
		_isles.append([sp, y0, 0.0])
	_add_cloud(h * 0.7, 1.3, -6.0, Color("#24162f"))
	# ── dipte mürekkep kayalık ──
	_cliff = Node2D.new()
	_cliff.draw.connect(_draw_cliff)
	add_child(_cliff)
	# ── korlar ──
	var rng2 := RandomNumberGenerator.new()
	rng2.seed = 9
	for i in 22:
		_ember.append([rng2.randf() * w, h * rng2.randf_range(0.55, 1.0), rng2.randf_range(14.0, 34.0), rng2.randf() * TAU, rng2.randf_range(1.6, 3.4)])
	_embers = Node2D.new()
	_embers.draw.connect(_draw_embers)
	add_child(_embers)
	# ── logo ──
	_logo = Node2D.new()
	_logo.position = Vector2(w * 0.5, _mc.y + _mr * 0.98)
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
	# ── çubuk + yazılar ──
	var by := h - bottom_pad - 64.0
	_bar = Node2D.new()
	_bar.position = Vector2(w * 0.14, by)
	_bar.draw.connect(_draw_bar)
	add_child(_bar)
	_lbl = UIText.new()
	_lbl.style(false, 900, 13, 3.0, Color("#e9dcef"), UIK.ink_stroke(1.5, 2.0))
	_lbl.nowrap = true
	_lbl.size = Vector2(w * 0.5, 20)
	_lbl.position = Vector2(w * 0.14, by - 24)
	_lbl.text = "YÜKLENİYOR"
	add_child(_lbl)
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

func _add_cloud(cy: float, k: float, spd: float, col: Color) -> void:
	var w := size_l.x
	var cl := Node2D.new()
	var cw := w * 1.6
	cl.draw.connect(func(): _draw_cloud_band(cl, cw, k, col))
	cl.position = Vector2(-w * 0.3, cy)
	add_child(cl)
	_clouds.append([cl, spd, cw])

func _draw_moon() -> void:
	var r := _mr
	var B := TriBatch.new()
	B.circle(Vector2.ZERO, r + 5.0, INK, 64)
	B.circle(Vector2.ZERO, r, MOON, 64)
	# sağ alt hilal gölgesi: iki çemberin farkı
	var sh := PackedVector2Array()
	for i in 33:
		var a := -PI * 0.5 + PI * i / 32.0
		sh.append(Vector2(cos(a), sin(a)) * r)
	for i in 33:
		var a := PI * 0.5 - PI * i / 32.0
		sh.append(Vector2(cos(a) * r * 0.62, sin(a) * r))
	var idx := Geometry2D.triangulate_polygon(sh)
	for i in range(0, idx.size(), 3): B._tri(sh[idx[i]], sh[idx[i + 1]], sh[idx[i + 2]], Color("#8f1828"))
	# yarım ton noktalar (gölge tarafında yoğun)
	var step := r / 9.0
	var y := -r
	var row := 0
	while y < r:
		var x := -r + (step * 0.5 if row % 2 else 0.0)
		while x < r:
			var p := Vector2(x, y)
			if p.length() < r - 3.0:
				var k := clampf((p.x / r + 0.2) * 0.9 + p.y / r * 0.3, 0.0, 1.0)
				if k > 0.05: B.circle(p, step * 0.32 * k, Color(INK, 0.32), 6)
			x += step
		y += step * 0.87
		row += 1
	# kraterler
	for c in [[Vector2(-0.38, -0.34), 0.16], [Vector2(0.22, 0.36), 0.11], [Vector2(-0.1, 0.12), 0.07]]:
		var cp: Vector2 = c[0] * r
		var cr: float = c[1] * r
		B.circle(cp, cr + 2.5, INK, 20)
		B.circle(cp, cr, Color("#a7212f"), 20)
	B.flush(_moon)
	_moon.draw_arc(Vector2.ZERO, r * 0.86, PI * 1.05, PI * 1.45, 18, Color(1, 0.75, 0.75, 0.55), 4.0, true)

func _draw_cloud_band(n: Node2D, cw: float, k: float, col: Color) -> void:
	# taraklı üst kenar, düz alt kenar; mürekkep kontur
	var P := PackedVector2Array()
	var x := 0.0
	var i := 0
	var bumps: Array = []
	while x < cw:
		var bw := (34.0 + 18.0 * sin(i * 1.7)) * k
		bumps.append([x, bw])
		x += bw
		i += 1
	P.append(Vector2(0, 600.0))
	for b in bumps:
		var x0: float = b[0]
		var bw: float = b[1]
		for s in 9:
			var a := PI + PI * s / 8.0
			P.append(Vector2(x0 + bw * 0.5 + cos(a) * bw * 0.5, sin(a) * bw * 0.55))
	P.append(Vector2(cw, 600.0))
	var B := TriBatch.new()
	var idx := Geometry2D.triangulate_polygon(P)
	for j in range(0, idx.size(), 3): B._tri(P[idx[j]], P[idx[j + 1]], P[idx[j + 2]], col)
	B.flush(n)
	var top := P.slice(1, P.size() - 1)
	n.draw_polyline(top, INK, 4.0, true)
	n.draw_polyline(top, Color(col.lightened(0.35), 0.8), 1.6, true)

func _draw_cliff() -> void:
	var w := size_l.x
	var h := size_l.y
	var base := h - bottom_pad - 110.0
	var P := PackedVector2Array([Vector2(-10, h + 10), Vector2(-10, base - 30), Vector2(w * 0.08, base - 58), Vector2(w * 0.16, base - 40),
		Vector2(w * 0.24, base - 72), Vector2(w * 0.3, base - 50), Vector2(w * 0.4, base - 34), Vector2(w * 0.52, base - 46),
		Vector2(w * 0.62, base - 30), Vector2(w * 0.72, base - 64), Vector2(w * 0.8, base - 44), Vector2(w * 0.9, base - 80),
		Vector2(w + 10, base - 52), Vector2(w + 10, h + 10)])
	var B := TriBatch.new()
	var idx := Geometry2D.triangulate_polygon(P)
	for j in range(0, idx.size(), 3): B._tri(P[idx[j]], P[idx[j + 1]], P[idx[j + 2]], Color("#0a0610"))
	B.flush(_cliff)
	var rim := P.slice(1, P.size() - 1)
	_cliff.draw_polyline(rim, Color(MOON, 0.55), 3.0, true)

func _draw_embers() -> void:
	var B := TriBatch.new()
	for e in _ember:
		var y: float = fposmod(float(e[1]) - _t * float(e[2]), size_l.y * 0.55) + size_l.y * 0.42
		var x: float = float(e[0]) + sin(_t * 0.8 + float(e[3])) * 10.0
		var a := clampf((y - size_l.y * 0.42) / (size_l.y * 0.2), 0.0, 1.0)
		B.circle(Vector2(x, y), float(e[4]), Color(1.0, 0.45, 0.25, 0.75 * a), 6)
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
	_t += dt
	var kl := clampf((_t - 0.15) / 0.5, 0, 1)
	_logo.scale = Vector2.ONE * (ScrLevelUp._back_ease(kl) if kl < 1.0 else 1.0 + sin(_t * 2.0) * 0.012)
	_moon.scale = Vector2.ONE * (1.0 + sin(_t * 0.9) * 0.01)
	for c in _clouds:
		var n: Node2D = c[0]
		var span := float(c[2]) - size_l.x
		n.position.x = -span * 0.5 + sin(_t * float(c[1]) * 0.012) * span * 0.5
	for it in _isles:
		(it[0] as Sprite2D).position.y = float(it[1]) + sin(_t * 1.1 + float(it[2])) * 6.0
	_embers.queue_redraw()
