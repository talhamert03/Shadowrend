class_name ScrIntro
extends CanvasLayer
## ALPHA WOLF GAMES firma introsu (5,6 sn) — oyun açılınca ilk bu oynar, ardından yükleme ekranı.
## Kaynak: tuval animasyonu (intro.html + shape.js); burada vektör olarak birebir çizilir (her
## çözünürlükte keskin): üçgenlerden birleşen kurt başı → uluma (çene, ses halkaları, ay ışığı,
## parlayan göz) → küçülüp logoya dönüşür: harf harf ALPHA WOLF + parıltı süpürmesi, GAMES
## ve çizgiler → siyaha söner. Ses: assets/intro/intro.ogg (kaynaktaki audio.py çıktısı).

signal finished

const DUR := 5.6
const PIV_NECK := Vector2(470, 820)
const CEN := Vector2(495, 515)
const BASE := "res://assets/intro/"

var D: Dictionary
var HT: Array = []
var JT: Array = []
var _t := -0.12
var W := 390.0
var H := 844.0
var U := 0.36
var _cv: Node2D
var _f900: FontFile
var _f600: FontFile
var _moon: GradientTexture2D
var _fade: GradientTexture2D
var _seed := 7
var _done := false

func _init() -> void:
	layer = 110
	process_mode = Node.PROCESS_MODE_ALWAYS

func _ready() -> void:
	var vs := get_viewport().get_visible_rect().size
	W = vs.x
	H = vs.y
	U = minf(W, H) / 1080.0
	var f := FileAccess.open(BASE + "shape.json", FileAccess.READ)
	D = JSON.parse_string(f.get_as_text()) if f else {}
	HT = _prep(D.get("head", []))
	JT = _prep(D.get("jaw", []))
	_f900 = load(BASE + "montserrat-latin-900-normal.woff2")
	_f600 = load(BASE + "montserrat-latin-600-normal.woff2")
	var gr := Gradient.new()
	gr.offsets = PackedFloat32Array([0.0, 0.6, 1.0])
	gr.colors = PackedColorArray([Color8(90, 150, 200, 56), Color8(40, 80, 120, 20), Color(0, 0, 0, 0)])
	_moon = GradientTexture2D.new()
	_moon.gradient = gr
	_moon.fill = GradientTexture2D.FILL_RADIAL
	_moon.fill_from = Vector2(0.5, 0.5)
	_moon.fill_to = Vector2(1.0, 0.5)
	_moon.width = 256
	_moon.height = 256
	var fg := Gradient.new()
	fg.offsets = PackedFloat32Array([0.0, 1.0])
	fg.colors = PackedColorArray([Color(0, 0, 0, 0), Color(0, 0, 0, 1)])
	_fade = GradientTexture2D.new()
	_fade.gradient = fg
	_fade.fill_from = Vector2(0, 0)
	_fade.fill_to = Vector2(0, 1)
	_fade.width = 4
	_fade.height = 256
	var bg := ColorRect.new()
	bg.color = Color.BLACK
	bg.size = vs + Vector2(0, 400)
	bg.position = Vector2(0, -200)
	bg.mouse_filter = Control.MOUSE_FILTER_STOP
	add_child(bg)
	_cv = Node2D.new()
	_cv.draw.connect(_render)
	add_child(_cv)
	var st: AudioStream = load(BASE + "intro.ogg")
	if st and not (Settings.data and float(Settings.data.get("sfx", 1.0)) <= 0.0):
		var p := AudioStreamPlayer.new()
		p.stream = st
		add_child(p)
		p.play()

func _process(dt: float) -> void:
	_t += minf(dt, 1.0 / 20.0)
	_cv.queue_redraw()
	if _t >= DUR and not _done:
		_done = true
		finished.emit()
		queue_free()

# ── yardımcılar (kaynaktakiyle aynı eğriler) ──
static func _seg(t: float, a: float, b: float) -> float: return clampf((t - a) / (b - a), 0.0, 1.0)
static func _eo(x: float) -> float: return 1.0 - pow(1.0 - x, 3.0)
static func _eio(x: float) -> float: return 4.0 * x * x * x if x < 0.5 else 1.0 - pow(-2.0 * x + 2.0, 3.0) / 2.0
static func _eback(x: float) -> float:
	var c := 1.6
	return 1.0 + (c + 1.0) * pow(x - 1.0, 3.0) + c * pow(x - 1.0, 2.0)
static func _col(b: float, a := 1.0) -> Color: return Color8(int(225 * b + 12), int(232 * b + 14), int(245 * b + 18), int(clampf(a, 0, 1) * 255))
func _rnd() -> float:
	_seed = (_seed * 16807) % 2147483647
	return float(_seed) / 2147483647.0
static func _v(p) -> Vector2: return Vector2(float(p[0]), float(p[1]))
static func _pts(arr) -> PackedVector2Array:
	var o := PackedVector2Array()
	for p in arr: o.append(_v(p))
	return o

## üçgen başına birleşme parametreleri (kaynaktaki prep; aynı tohum, aynı sıra)
func _prep(list: Array) -> Array:
	var out := []
	for item in list:
		var pts := _pts(item[0])
		var c := (pts[0] + pts[1] + pts[2]) / 3.0
		var d := c - CEN
		var l := maxf(1.0, d.length())
		var dist := 60.0 + _rnd() * 140.0
		var ox := d.x / l * dist + (_rnd() - 0.5) * 60.0
		var oy := d.y / l * dist + (_rnd() - 0.5) * 60.0
		var rot := (_rnd() - 0.5) * 2.2
		var delay := 0.28 + (1.0 - c.y / 1000.0) * 0.05 + _rnd() * 0.32
		out.append({"pts": pts, "b": float(item[1]), "c": c, "o": Vector2(ox, oy), "rot": rot, "delay": delay})
	return out

static func _rot_about(p: Vector2, piv: Vector2, a: float) -> Vector2: return piv + (p - piv).rotated(a)

func _tris(M: Transform2D, list: Array, t: float) -> void:
	for T in list:
		var e := _eo(_seg(t, T.delay, T.delay + 0.5))
		if e <= 0.0: continue
		var k := 1.0 - e
		var sc := 0.4 + 0.6 * e
		var L := Transform2D(T.rot * k, Vector2.ONE * sc, 0.0, T.c + T.o * k) * Transform2D(0.0, -T.c)
		var flash := clampf(1.0 - _seg(t, T.delay + 0.15, T.delay + 0.6), 0.0, 1.0) * 0.5
		var b := minf(1.0, T.b + flash * (1.0 - T.b))
		var c := _col(b, clampf(e * 1.6, 0.0, 1.0))
		var P: PackedVector2Array = T.pts
		var q := PackedVector2Array([M * (L * P[0]), M * (L * P[1]), M * (L * P[2])])
		_cv.draw_colored_polygon(q, c)
		q.append(q[0])
		_cv.draw_polyline(q, c, maxf(0.6, 1.1 * M.get_scale().x), true)      # ek yeri boşlukları

func _poly(M: Transform2D, arr: PackedVector2Array, c: Color) -> void:
	var q := PackedVector2Array()
	for p in arr: q.append(M * p)
	# kendini kesen çokgen (küçük çene açısında ağız içi) üçgenlenemez: atla
	if q.size() >= 3 and Geometry2D.triangulate_polygon(q).size() > 0: _cv.draw_colored_polygon(q, c)

func _render() -> void:
	var t := maxf(0.0, _t)
	var to_logo := _eio(_seg(t, 2.45, 3.05))
	var s_howl := 0.98 * U
	var s_logo := 0.54 * U
	var push := 1.0 + 0.04 * _seg(t, 0.0, 2.45)
	var s := (s_howl * (1.0 - to_logo) + s_logo * to_logo) * push
	var cy := (H / 2.0 + 20.0 * U) * (1.0 - to_logo) + (H / 2.0 - 150.0 * U) * to_logo
	# ay ışıması (başın arkasında)
	var mg := _eo(_seg(t, 0.9, 1.6)) * (1.0 - 0.55 * to_logo)
	if mg > 0.0:
		var mc := Vector2(W / 2.0 + 120.0 * s, cy - 330.0 * s)
		var mr := 330.0 * s
		var gs := mr * 1.6 * 2.0
		_cv.draw_texture_rect(_moon, Rect2(mc - Vector2.ONE * gs * 0.5, Vector2.ONE * gs), false, Color(1, 1, 1, mg))
		_cv.draw_arc(mc, mr, 0.0, TAU, 96, Color8(160, 205, 240, int(0.13 * mg * 255)), 2.0 * U, true)
	# kurt
	var M := Transform2D(0.0, Vector2.ONE * s, 0.0, Vector2(W / 2.0 - CEN.x * s, cy - CEN.y * s))
	var raise := _eio(_seg(t, 0.95, 1.45))
	var settle := _eio(_seg(t, 2.45, 2.85))
	var head_a := deg_to_rad(16.0 * (1.0 - raise)) - deg_to_rad(2.5) * _seg(t, 1.45, 2.4) * (1.0 - settle)
	var jaw_open := _eo(_seg(t, 1.15, 1.5)) * (1.0 - _eio(_seg(t, 2.3, 2.6)))
	var vib := sin(t * 38.0) * 0.6 * jaw_open
	var jaw_a := deg_to_rad(17.0 * jaw_open + vib)
	var HM := M * Transform2D(0.0, PIV_NECK) * Transform2D(head_a, Vector2.ZERO) * Transform2D(0.0, -PIV_NECK)
	var piv_jaw := _v(D.pivot)
	if jaw_a > 0.001:
		var mouth := _pts(D.lip)
		var jt := _pts(D.jawTop)
		for i in range(jt.size() - 1, -1, -1): mouth.append(_rot_about(jt[i], piv_jaw, jaw_a))
		_poly(HM, mouth, Color("#2a151b"))
	var JM := HM * Transform2D(0.0, piv_jaw) * Transform2D(jaw_a, Vector2.ZERO) * Transform2D(0.0, -piv_jaw)
	_tris(JM, JT, t)
	_tris(HM, HT, t)
	var det := _eo(_seg(t, 0.8, 1.15))
	if det > 0.0:
		_poly(HM, _pts(D.ear_in), _col(0.2, det))
		_poly(HM, _pts(D.brow), _col(0.28, det))
		_poly(HM, _pts(D.nose), Color(Color("#121318"), det))
		var glow := 0.55 + 0.45 * _eo(_seg(t, 1.2, 1.6)) - 0.25 * settle
		var eye := _pts(D.eye)
		var ec := Vector2.ZERO
		for p in eye: ec += p
		ec = HM * (ec / eye.size())
		var gsz := (28.0 * glow + 6.0) * U * 2.4
		_cv.draw_texture_rect(ClimbArt.glow_tex(), Rect2(ec - Vector2.ONE * gsz * 0.5, Vector2.ONE * gsz), false, Color(110 / 255.0, 210 / 255.0, 1.0, 0.75 * glow * det))
		_poly(HM, eye, Color8(int(150 + 80 * glow), int(225 + 25 * glow), 255, int(det * 255)))
	# ses halkaları (ağızdan)
	var m := M * _rot_about(_v(D.mouth), PIV_NECK, head_a)
	var dir := deg_to_rad(-52.0) + head_a
	for i in 4:
		var t0 := 1.4 + i * 0.22
		var k := _seg(t, t0, t0 + 0.95)
		if k <= 0.0 or k >= 1.0: continue
		var r := (40.0 + _eo(k) * 300.0) * s
		_cv.draw_arc(m, r, dir - 0.5, dir + 0.5, 40, Color8(175, 225, 255, int((1.0 - k) * 0.55 * 255)), maxf(1.0, (5.0 * (1.0 - k) + 1.2) * s), true)
	# alt kısım siyaha erir (kaynakta destination-in gradyan maskesi; zemin siyah olduğundan eşdeğer)
	var y0 := (M * Vector2(0, 640)).y
	var y1 := (M * Vector2(0, 940)).y
	_cv.draw_texture_rect(_fade, Rect2(0, y0, W, y1 - y0), false)
	_cv.draw_rect(Rect2(0, y1 - 0.5, W, H - y1 + 200.0), Color.BLACK)
	if t > 2.75: _text(t, cy + 330.0 * U)
	# siyaha sönüş
	var fo := _seg(t, 4.95, 5.55)
	if fo > 0.0: _cv.draw_rect(Rect2(0, -200, W, H + 400), Color(0, 0, 0, _eio(fo)))

## harf aralıklı yazı: harf x'leri ve toplam genişlik
func _spaced(font: Font, fs: int, s: String, cx: float, sp: float) -> Array:
	var ws := []
	var tot := 0.0
	for ch in s:
		var w := font.get_string_size(ch, HORIZONTAL_ALIGNMENT_LEFT, -1, fs).x
		ws.append(w)
		tot += w
	tot += sp * (s.length() - 1)
	var x := cx - tot / 2.0
	var xs := []
	for i in s.length():
		xs.append(x)
		x += float(ws[i]) + sp
	return [xs, tot, ws]

func _text(t: float, ty: float) -> void:
	var big := 98.0 * U
	var small := 30.0 * U
	var fb := int(round(big))
	var title := "ALPHA WOLF"
	var r := _spaced(_f900, fb, title, W / 2.0, big * 0.06)
	var xs: Array = r[0]
	var tot: float = r[1]
	var ws: Array = r[2]
	# parıltı süpürmesi (kaynakta source-atop gradyan): harf merkezine göre renk
	var sh := _seg(t, 3.55, 4.1)
	var x0 := W / 2.0 - tot / 2.0 - 200.0 * U + (tot + 400.0 * U) * _eio(sh)
	for i in title.length():
		var k := _seg(t, 2.8 + i * 0.035, 2.8 + i * 0.035 + 0.5)
		if k <= 0.0: continue
		var e := _eback(k)
		var c := Color("#f4f7fb")
		if sh > 0.0 and sh < 1.0:
			var lc: float = float(xs[i]) + float(ws[i]) * 0.5
			var wgt := clampf(1.0 - absf(lc - x0) / (90.0 * U), 0.0, 1.0)
			c = c.lerp(Color8(140, 215, 255), wgt * 0.95)
		c.a = clampf(k * 2.0, 0.0, 1.0)
		_cv.draw_string(_f900, Vector2(float(xs[i]), ty + (1.0 - e) * 38.0 * U), title[i], HORIZONTAL_ALIGNMENT_LEFT, -1, fb, c)
	var k2 := _eo(_seg(t, 3.15, 3.65))
	if k2 > 0.0:
		var fs := int(round(small))
		var sy := ty + 64.0 * U
		var sp := small * 0.62
		var g := _spaced(_f600, fs, "GAMES", W / 2.0 + sp / 2.0, sp)
		var gx: Array = g[0]
		for i in 5:
			_cv.draw_string(_f600, Vector2(float(gx[i]), sy), "GAMES"[i], HORIZONTAL_ALIGNMENT_LEFT, -1, fs, Color(Color("#9fb3c8"), k2))
		var half := tot / 2.0
		var gap: float = float(g[1]) / 2.0 + 34.0 * U
		var lw := (half - gap) * k2
		var rc := Color8(159, 179, 200, int(0.7 * k2 * 255))
		_cv.draw_rect(Rect2(W / 2.0 - gap - lw, sy - small * 0.36, lw, maxf(1.0, 2.0 * U)), rc)
		_cv.draw_rect(Rect2(W / 2.0 + gap, sy - small * 0.36, lw, maxf(1.0, 2.0 * U)), rc)
