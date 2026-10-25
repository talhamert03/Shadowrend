class_name Ctx2D
extends RefCounted
## Canvas 2D bağlamının (CanvasRenderingContext2D) Godot karşılığı.
##
## NEDEN VAR: web oyununun üst katmanı (hasar yazıları, joystick, görev
## işaretleri, süper yetenek sahneleri, güç pulları...) Canvas2D ile
## çiziliyordu — yüzlerce satır ctx.* çağrısı. Bunları Godot'un çizim
## API'sine tek tek çevirmek hem uzun hem hataya açık; bunun yerine aynı
## API burada yeniden kurulur ve çizim kodu satır satır taşınır.
##
## Çizim RenderingServer tuval öğelerine kaydedilir. 'lighter' bileşimi
## (toplamalı parlama) ayrı bir malzemeli öğeye düşer; sıra korunur.
## Yollar kurulurken o anki dönüşümle cihaz koordinatına çevrilir
## (Canvas2D sözleşmesiyle aynı).

const FONT_HUD := {400: "res://assets/fonts/ChakraPetch-Regular.ttf", 600: "res://assets/fonts/ChakraPetch-SemiBold.ttf", 700: "res://assets/fonts/ChakraPetch-Bold.ttf", 800: "res://assets/fonts/ChakraPetch-Bold.ttf"}
const FONT_DISPLAY := "res://assets/fonts/Cinzel.ttf"

static var _fonts := {}
static var _mat_mix: CanvasItemMaterial
static var _mat_add: CanvasItemMaterial

var parent: RID
var items: Array[RID] = []
var _cur := -1
var _cur_add := false

# ── durum ──
var xf := Transform2D.IDENTITY
var global_alpha := 1.0
var comp := "source-over"
var fill_style: Color = Color.BLACK
var stroke_style: Color = Color.BLACK
var line_width := 1.0
var line_cap := "butt"
var line_join := "miter"
var line_dash: Array = []
var line_dash_offset := 0.0
var font_size := 10.0
var font_weight := 400
var font_display := false
var text_align := "start"
var text_baseline := "alphabetic"
var _stack: Array = []

# ── yol ──
var _subs: Array = []          # Array[PackedVector2Array] (cihaz uzayı)
var _closed: Array = []        # Array[bool]
var _cur_sub := PackedVector2Array()
var _cur_closed := false
var _has_cur := false

static func font(weight: int = 700, display: bool = false) -> Font:
	var key := ("d" if display else "h") + str(weight)
	if _fonts.has(key): return _fonts[key]
	var f: Font
	if weight >= 1000: f = UIK.font(false, 1000)        # çizgi roman yazısı (Bangers)
	elif display:
		var base: FontFile = load(FONT_DISPLAY)
		var fv := FontVariation.new()
		fv.base_font = base
		fv.variation_opentype = {TextServerManager.get_primary_interface().name_to_tag("wght"): clampi(weight, 400, 900)}
		f = fv
	else:
		var w := 400
		for k in [400, 600, 700, 800]:
			if weight >= k: w = k
		f = load(FONT_HUD[w])
	_fonts[key] = f
	return f

func _init(parent_canvas_item: RID) -> void:
	parent = parent_canvas_item
	if _mat_mix == null:
		_mat_mix = CanvasItemMaterial.new()
		_mat_mix.blend_mode = CanvasItemMaterial.BLEND_MODE_MIX
		_mat_add = CanvasItemMaterial.new()
		_mat_add.blend_mode = CanvasItemMaterial.BLEND_MODE_ADD

func free_items() -> void:
	for r in items: RenderingServer.free_rid(r)
	items.clear()

## Kare başı: tüm kayıtları sil, durumu sıfırla (clearRect eşdeğeri).
func begin_frame() -> void:
	for r in items: RenderingServer.canvas_item_clear(r)
	_cur = -1
	xf = Transform2D.IDENTITY
	global_alpha = 1.0
	comp = "source-over"
	_stack.clear()
	begin_path()

func _item() -> RID:
	var want_add := comp == "lighter"
	if _cur < 0 or want_add != _cur_add:
		_cur += 1
		if _cur >= items.size():
			var r := RenderingServer.canvas_item_create()
			RenderingServer.canvas_item_set_parent(r, parent)
			RenderingServer.canvas_item_set_draw_index(r, _cur)
			items.append(r)
		var rid: RID = items[_cur]
		RenderingServer.canvas_item_set_material(rid, (_mat_add if want_add else _mat_mix).get_rid())
		_cur_add = want_add
	return items[_cur]

# ── durum yığını ──
func save() -> void:
	_stack.append([xf, global_alpha, comp, fill_style, stroke_style, line_width, line_cap, line_join,
		line_dash.duplicate(), line_dash_offset, font_size, font_weight, font_display, text_align, text_baseline])

func restore() -> void:
	if _stack.is_empty(): return
	var s: Array = _stack.pop_back()
	xf = s[0]; global_alpha = s[1]; comp = s[2]; fill_style = s[3]; stroke_style = s[4]
	line_width = s[5]; line_cap = s[6]; line_join = s[7]; line_dash = s[8]; line_dash_offset = s[9]
	font_size = s[10]; font_weight = s[11]; font_display = s[12]; text_align = s[13]; text_baseline = s[14]

# ── dönüşüm ──
func translate(x: float, y: float) -> void:
	xf = xf * Transform2D(0.0, Vector2(x, y))

func rotate(a: float) -> void:
	xf = xf * Transform2D(a, Vector2.ZERO)

func scale(sx: float, sy: float) -> void:
	xf = xf * Transform2D(Vector2(sx, 0), Vector2(0, sy), Vector2.ZERO)

func set_transform(a: float, b: float, c: float, d: float, e: float, f: float) -> void:
	xf = Transform2D(Vector2(a, b), Vector2(c, d), Vector2(e, f))

func get_transform() -> Transform2D:
	return xf

func set_fill(c) -> void: fill_style = JS.col(c)
func set_stroke(c) -> void: stroke_style = JS.col(c)

## Canvas font kısayolu: "700 15px 'Chakra Petch'" / "800 22px Cinzel"
func set_font(spec: String) -> void:
	var parts := spec.split(" ", false)
	var w := 400
	for p in parts:
		if p.is_valid_int(): w = p.to_int()
		elif p == "bold": w = 700
		elif p.ends_with("px"): font_size = p.substr(0, p.length() - 2).to_float()
	font_weight = w
	font_display = spec.contains("Cinzel")

# ── yol kurma ──
func begin_path() -> void:
	_subs.clear()
	_closed.clear()
	_cur_sub = PackedVector2Array()
	_cur_closed = false
	_has_cur = false

func _flush_sub() -> void:
	if _cur_sub.size() > 0:
		_subs.append(_cur_sub)
		_closed.append(_cur_closed)
	_cur_sub = PackedVector2Array()
	_cur_closed = false

func move_to(x: float, y: float) -> void:
	_flush_sub()
	_cur_sub.append(xf * Vector2(x, y))
	_has_cur = true

func line_to(x: float, y: float) -> void:
	if not _has_cur:
		move_to(x, y)
		return
	_cur_sub.append(xf * Vector2(x, y))

func close_path() -> void:
	if _cur_sub.size() > 0:
		_cur_closed = true
		var first := _cur_sub[0]
		_flush_sub()
		_cur_sub.append(first)
		_has_cur = true

func _seg_count(r: float, sweep: float) -> int:
	var s := xf.get_scale()
	var rs := r * maxf(absf(s.x), absf(s.y))
	return clampi(int(ceil(absf(sweep) * maxf(rs, 1.0) / 3.0)), 6, 160)

func arc(x: float, y: float, r: float, a0: float, a1: float, ccw: bool = false) -> void:
	ellipse(x, y, r, r, 0.0, a0, a1, ccw)

func ellipse(x: float, y: float, rx: float, ry: float, rot: float, a0: float, a1: float, ccw: bool = false) -> void:
	var sweep := a1 - a0
	var full := false
	if not ccw:
		if sweep >= TAU: sweep = TAU; full = true
		elif sweep < 0: sweep = fposmod(sweep, TAU)
	else:
		if sweep <= -TAU: sweep = -TAU; full = true
		elif sweep > 0: sweep = fposmod(sweep, TAU) - TAU
	# tam daire YENİ alt yol başlatır (evenodd hilal gibi kullanımlarda bağlayıcı çizgi yok sayılır)
	if full and _cur_sub.size() > 0: _flush_sub()
	var n := _seg_count(maxf(rx, ry), sweep)
	var cr := cos(rot)
	var sr := sin(rot)
	for i in n + 1:
		var a := a0 + sweep * float(i) / n
		var px := cos(a) * rx
		var py := sin(a) * ry
		var p := xf * Vector2(x + px * cr - py * sr, y + px * sr + py * cr)
		if not _has_cur:
			_cur_sub.append(p)
			_has_cur = true
		else:
			_cur_sub.append(p)

func quadratic_curve_to(cx: float, cy: float, x: float, y: float) -> void:
	if not _has_cur:
		move_to(cx, cy)
	var inv := xf.affine_inverse()
	var p0: Vector2 = inv * _cur_sub[_cur_sub.size() - 1]
	var n := 12
	for i in range(1, n + 1):
		var t := float(i) / n
		var u := 1.0 - t
		var q := p0 * (u * u) + Vector2(cx, cy) * (2 * u * t) + Vector2(x, y) * (t * t)
		_cur_sub.append(xf * q)

func bezier_curve_to(c1x: float, c1y: float, c2x: float, c2y: float, x: float, y: float) -> void:
	if not _has_cur:
		move_to(c1x, c1y)
	var inv := xf.affine_inverse()
	var p0: Vector2 = inv * _cur_sub[_cur_sub.size() - 1]
	var n := 16
	for i in range(1, n + 1):
		var t := float(i) / n
		var u := 1.0 - t
		var q := p0 * (u * u * u) + Vector2(c1x, c1y) * (3 * u * u * t) + Vector2(c2x, c2y) * (3 * u * t * t) + Vector2(x, y) * (t * t * t)
		_cur_sub.append(xf * q)

func rect(x: float, y: float, w: float, h: float) -> void:
	move_to(x, y); line_to(x + w, y); line_to(x + w, y + h); line_to(x, y + h); close_path()

func round_rect(x: float, y: float, w: float, h: float, r: float) -> void:
	r = minf(r, minf(w, h) / 2.0)
	move_to(x + r, y)
	line_to(x + w - r, y)
	ellipse(x + w - r, y + r, r, r, 0, -PI / 2, 0)
	line_to(x + w, y + h - r)
	ellipse(x + w - r, y + h - r, r, r, 0, 0, PI / 2)
	line_to(x + r, y + h)
	ellipse(x + r, y + h - r, r, r, 0, PI / 2, PI)
	line_to(x, y + r)
	ellipse(x + r, y + r, r, r, 0, PI, PI * 1.5)
	close_path()

# ── boyama ──
func _col(c: Color) -> Color:
	return Color(c.r, c.g, c.b, c.a * global_alpha)

func _all_subs() -> Array:
	var out := _subs.duplicate()
	if _cur_sub.size() > 0: out.append(_cur_sub)
	return out

func fill(rule: String = "nonzero") -> void:
	var subs := _all_subs()
	if subs.is_empty(): return
	var c := _col(fill_style)
	if c.a <= 0.002: return
	var rid := _item()
	RenderingServer.canvas_item_add_set_transform(rid, Transform2D.IDENTITY)
	if rule == "evenodd" and subs.size() == 2:
		# evenodd = XOR (hilal: dış daire − iç daire, taşan kısım dahil)
		for poly in Geometry2D.exclude_polygons(subs[0], subs[1]):
			_fill_poly(rid, poly, c)
		return
	for s in subs:
		_fill_poly(rid, s, c)

func _fill_poly(rid: RID, pts: PackedVector2Array, c: Color) -> void:
	if pts.size() < 3: return
	var p := pts
	if p.size() > 3 and p[0].is_equal_approx(p[p.size() - 1]):
		p = p.slice(0, p.size() - 1)
	var idx := Geometry2D.triangulate_polygon(p)
	if idx.is_empty():
		# kendini kesen yol: dışbükey zarfla doldur (ellips/daire için doğru sonuç)
		p = Geometry2D.convex_hull(p)
		idx = Geometry2D.triangulate_polygon(p)
		if idx.is_empty(): return
	var cols := PackedColorArray()
	cols.resize(p.size())
	cols.fill(c)
	RenderingServer.canvas_item_add_triangle_array(rid, idx, p, cols)

func stroke() -> void:
	var subs := _all_subs()
	if subs.is_empty(): return
	var c := _col(stroke_style)
	if c.a <= 0.002: return
	var s := xf.get_scale()
	var w := line_width * sqrt(absf(s.x * s.y))
	var rid := _item()
	RenderingServer.canvas_item_add_set_transform(rid, Transform2D.IDENTITY)
	for i in subs.size():
		var pts: PackedVector2Array = subs[i]
		if pts.size() < 2: continue
		if line_dash.size() >= 2:
			_dashed(rid, pts, c, w)
		else:
			RenderingServer.canvas_item_add_polyline(rid, pts, PackedColorArray([c]), w, true)
			if line_cap == "round" and w > 1.5:
				RenderingServer.canvas_item_add_circle(rid, pts[0], w * 0.5, c)
				RenderingServer.canvas_item_add_circle(rid, pts[pts.size() - 1], w * 0.5, c)
		if line_join == "round" and w > 3.0 and pts.size() > 2:
			for k in range(1, pts.size() - 1):
				RenderingServer.canvas_item_add_circle(rid, pts[k], w * 0.5, c)

func _dashed(rid: RID, pts: PackedVector2Array, c: Color, w: float) -> void:
	var sc := sqrt(absf(xf.get_scale().x * xf.get_scale().y))
	var pattern := []
	for d in line_dash: pattern.append(float(d) * sc)
	var total := 0.0
	for d in pattern: total += d
	if total <= 0: return
	var pos := fposmod(line_dash_offset * sc, total)
	var pi_ := 0
	var acc := pos
	while acc >= pattern[pi_]:
		acc -= pattern[pi_]
		pi_ = (pi_ + 1) % pattern.size()
	var remain: float = pattern[pi_] - acc
	var on := pi_ % 2 == 0
	var seg := PackedVector2Array()
	for k in range(1, pts.size()):
		var a := pts[k - 1]
		var b := pts[k]
		var L := a.distance_to(b)
		var t := 0.0
		while t < L:
			var step := minf(remain, L - t)
			var p0 := a.lerp(b, t / L)
			var p1 := a.lerp(b, (t + step) / L)
			if on:
				if seg.is_empty(): seg.append(p0)
				seg.append(p1)
			t += step
			remain -= step
			if remain <= 0.0001:
				if on and seg.size() >= 2:
					RenderingServer.canvas_item_add_polyline(rid, seg, PackedColorArray([c]), w, true)
				seg = PackedVector2Array()
				pi_ = (pi_ + 1) % pattern.size()
				remain = pattern[pi_]
				on = pi_ % 2 == 0
	if on and seg.size() >= 2:
		RenderingServer.canvas_item_add_polyline(rid, seg, PackedColorArray([c]), w, true)

func fill_rect(x: float, y: float, w: float, h: float) -> void:
	var c := _col(fill_style)
	if c.a <= 0.002: return
	var rid := _item()
	RenderingServer.canvas_item_add_set_transform(rid, xf)
	RenderingServer.canvas_item_add_rect(rid, Rect2(x, y, w, h), c)

func stroke_rect(x: float, y: float, w: float, h: float) -> void:
	begin_path()
	rect(x, y, w, h)
	stroke()
	begin_path()

func fill_circle(x: float, y: float, r: float) -> void:
	begin_path(); arc(x, y, r, 0, TAU); fill(); begin_path()

# ── yazı ──
func _text_pos(f: Font, s: String, x: float, y: float) -> Vector2:
	var sz := int(round(font_size))
	var w := f.get_string_size(s, HORIZONTAL_ALIGNMENT_LEFT, -1, sz).x
	var px := x
	if text_align == "center": px = x - w / 2.0
	elif text_align == "right" or text_align == "end": px = x - w
	var asc := f.get_ascent(sz)
	var desc := f.get_descent(sz)
	var py := y
	match text_baseline:
		"middle": py = y + (asc - desc) / 2.0
		"top", "hanging": py = y + asc
		"bottom", "ideographic": py = y - desc
	return Vector2(px, py)

func measure_text(s: String) -> float:
	var f := font(font_weight, font_display)
	return f.get_string_size(s, HORIZONTAL_ALIGNMENT_LEFT, -1, int(round(font_size))).x

func fill_text(s: String, x: float, y: float) -> void:
	var c := _col(fill_style)
	if c.a <= 0.002: return
	var f := font(font_weight, font_display)
	var rid := _item()
	RenderingServer.canvas_item_add_set_transform(rid, xf)
	f.draw_string(rid, _text_pos(f, s, x, y), s, HORIZONTAL_ALIGNMENT_LEFT, -1, int(round(font_size)), c)

func stroke_text(s: String, x: float, y: float) -> void:
	var c := _col(stroke_style)
	if c.a <= 0.002: return
	var f := font(font_weight, font_display)
	var rid := _item()
	RenderingServer.canvas_item_add_set_transform(rid, xf)
	f.draw_string_outline(rid, _text_pos(f, s, x, y), s, HORIZONTAL_ALIGNMENT_LEFT, -1, int(round(font_size)), maxi(1, int(round(line_width))), c)

# ── görüntü ──
func draw_image(tex: Texture2D, x: float, y: float, w: float = -1.0, h: float = -1.0) -> void:
	if tex == null: return
	if w < 0: w = tex.get_width()
	if h < 0: h = tex.get_height()
	var rid := _item()
	RenderingServer.canvas_item_add_set_transform(rid, xf)
	RenderingServer.canvas_item_add_texture_rect(rid, Rect2(x, y, w, h), tex.get_rid(), false, Color(1, 1, 1, global_alpha))

## Hazır üçgen listesi (V: ardışık üçlüler, o anki dönüşümle) — yüzlerce şekil TEK çizim çağrısında.
## additive: toplamalı parıltı öğesine düşer (sıra korunur).
func tris(V: PackedVector2Array, C: PackedColorArray, additive := false) -> void:
	if V.size() < 3: return
	var prev := comp
	comp = "lighter" if additive else "source-over"
	var rid := _item()
	comp = prev
	RenderingServer.canvas_item_add_set_transform(rid, xf)
	RenderingServer.canvas_item_add_triangle_array(rid, PackedInt32Array(), V, C)
