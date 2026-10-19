class_name ClimbArt
extends Node2D
## skyMap.js paintClimb (önizleme kipi) — gök tırmanışı sahnesi.
## Pahalı boyama (biyom gök/ön katman, ada gövdeleri ve yapıları) web'den
## pişirildi (tools/bake/ui/scn/climb.mjs → assets/ui/climb). İlerlemeye bağlı
## her şey burada çizilir: yol taşları, bayraklar, sıradaki adanın ışık
## sütunu, yumuşak ışımalar, vinyet. Sahne durağandır; yalnız dünya/ilerleme/
## ölçü değişince yeniden kurulur (web önbelleğinin karşılığı).

const BASE := "res://assets/ui/climb/"
const TAU := PI * 2.0

static var _meta: Dictionary
static var _glow_tex: GradientTexture2D

var W := 358.0
var H := 320.0
var _key := ""
var _clip: Material
var _clip_add: Material
var _segs: Array = []        # [Node2D] — karışım kipi değiştikçe yeni katman

class Seg extends Node2D:
	var ops: Array = []      # [Callable(ci)]
	func _draw() -> void:
		for f in ops: (f as Callable).call(self)

static func meta() -> Dictionary:
	if _meta.is_empty():
		var f := FileAccess.open(BASE + "climb.json", FileAccess.READ)
		if f: _meta = JSON.parse_string(f.get_as_text())
	return _meta

## softGlow dokusu: iç yarıçap 0,06 → a, 0,5 → a·0,34, 1 → 0 (beyaz; renk modülasyonla)
static func glow_tex() -> GradientTexture2D:
	if _glow_tex == null:
		var gr := Gradient.new()
		gr.offsets = PackedFloat32Array([0.0, 0.06, 0.53, 1.0])
		gr.colors = PackedColorArray([Color(1, 1, 1, 1), Color(1, 1, 1, 1), Color(1, 1, 1, 0.34), Color(1, 1, 1, 0)])
		_glow_tex = GradientTexture2D.new()
		_glow_tex.gradient = gr
		_glow_tex.fill = GradientTexture2D.FILL_RADIAL
		_glow_tex.fill_from = Vector2(0.5, 0.5)
		_glow_tex.fill_to = Vector2(1.0, 0.5)
		_glow_tex.width = 128
		_glow_tex.height = 128
	return _glow_tex

## kırpma malzemeleri (Lyr.clip_mat) — normal ve toplamsal
func set_clip(normal: Material, add: Material) -> void:
	_clip = normal
	_clip_add = add
	for s in _segs:
		var sg := s as Seg
		sg.material = _clip_add if sg.has_meta("add") else _clip

## climbLayout(4, 'preview', ar)
static func layout(ar: float) -> Array:
	var t := clampf((ar - 0.28) / 0.34, 0.0, 1.0)
	var S := [[0.160, 0.800, 0.040], [0.320, 0.700, 0.052], [0.500, 0.600, 0.064], [0.750, 0.480, 0.115]]
	var T := [[0.105, 0.885, 0.060], [0.225, 0.775, 0.072], [0.365, 0.655, 0.085], [0.690, 0.440, 0.235]]
	var out := []
	for i in 4:
		out.append({"x": lerpf(S[i][0], T[i][0], t), "y": lerpf(S[i][1], T[i][1], t), "r": lerpf(S[i][2], T[i][2], t), "boss": i == 3})
	return out

## climbLayout(total, 'tall', _, pad) — görev 1 altta, boss tepede (düz zikzak)
static func layout_tall(total: int, pt: float, pb: float) -> Array:
	var out := []
	var yBot := 0.945 - pb
	var yTop := 0.110 + pt
	for i in total:
		var t := 1.0 if total < 2 else float(i) / (total - 1)
		var boss := i == total - 1
		var amp: float = [0.20, 0.15, 0.22, 0.17][i % 4]
		out.append({"x": 0.5 if boss else 0.5 + (amp if i % 2 else -amp), "y": yBot - t * (yBot - yTop),
			"r": 0.30 if boss else 0.185 + (0.018 if i % 3 == 1 else 0.0), "boss": boss})
	return out

var tall := false
var pad_t := 0.0

func _done_at(i: int, count: int, cleared: int) -> bool:
	if i < 0: return true
	if tall: return i < cleared
	return cleared >= int(floor((i + 1) * (10.0 / count) + 0.5))

## mode_tall: bölüm seçimi (10 ada); pad = {t, b} örtülü paylar (kesir)
func paint(wd: Dictionary, cleared: int, w: float, h: float, mode_tall := false, pad := {}) -> void:
	var key := str(wd.id) + ":" + str(cleared) + ":" + str(w) + "x" + str(h) + (":T" if mode_tall else "")
	tall = mode_tall
	pad_t = float(pad.get("t", 0.0))
	if key == _key: return
	_key = key
	W = w
	H = h
	for s in _segs: s.queue_free()
	_segs.clear()
	var M := meta()
	var wid := int(wd.id)
	var wm: Dictionary = M.get("worlds", {}).get(str(wid), {})
	var dpr: float = M.get("dpr", 2)
	var R0: float = M.get("R0", 90)
	var dir := BASE + "w" + str(wid) + "/"
	var glow := JS.col(wd.glow)
	var gl := Color(glow.r, glow.g, glow.b, 1.0)
	var nodes := layout_tall(10, pad_t, float(pad.get("b", 0.0))) if tall else layout(H / W)
	var cur := _seg(false)
	# ── arka: biyom gök + ufuk (dikeyde: gece göğü, ay, uzak siluetler, bulutlar) ──
	var back := _tex(dir + "tall_back.png") if tall else _sized(dir, "back")
	if back: cur.ops.append(func(ci: CanvasItem): ci.draw_texture_rect(back, Rect2(0, 0, W, H), false))
	# ── yol: adalar arası ışık taşları ──
	for i in nodes.size() - 1:
		var a: Dictionary = nodes[i]
		var b: Dictionary = nodes[i + 1]
		var done := _done_at(i + 1, nodes.size(), cleared)
		var x0: float = a.x * W
		var y0: float = a.y * H - a.r * W * 0.1
		var x1: float = b.x * W
		var y1: float = b.y * H + b.r * W * 0.28
		var side := 1.0 if i % 2 else -1.0
		for k in range(1, 5):
			var t := k / 5.0
			var c := Vector2(x0 + (x1 - x0) * t + sin(t * PI) * side * W * 0.03, y0 + (y1 - y0) * t)
			var rr := maxf(2.0, W * 0.011)
			cur.ops.append(func(ci: CanvasItem):
				_ellipse(ci, c + Vector2(0, rr * 0.5), rr * 1.05, rr * 0.62, Color(8 / 255.0, 6 / 255.0, 14 / 255.0, 0.45))
				if done: _soft(ci, c, rr * 4.2, Color(240 / 255.0, 206 / 255.0, 120 / 255.0), 0.38)
				_ellipse(ci, c, rr, rr * 0.6, Color("#f0cd7e") if done else Color("#8e93ad"))
				_ellipse(ci, c + Vector2(-rr * 0.2, -rr * 0.16), rr * 0.5, rr * 0.22, Color(1, 1, 1, 0.3)))
	# ── adalar: tepeden (uzak) aşağı (yakın) ──
	for i in range(nodes.size() - 1, -1, -1):
		var n: Dictionary = nodes[i]
		var x: float = n.x * W
		var y: float = n.y * H
		var rx: float = n.r * W
		var ry := rx * 0.40
		var done := _done_at(i, nodes.size(), cleared)
		var nxt := not done and _done_at(i - 1, nodes.size(), cleared)
		var p := Vector2(x, y)
		cur.ops.append(func(ci: CanvasItem): _soft(ci, p + Vector2(0, rx * 0.7), rx * 1.3, gl, 0.11 if done else 0.07))
		# drawIsle: oda payı (room = y − 1) dar ise ada küçülür, yapı ayrıca kısılır
		var nm := (("b9" if tall else "b3") if n.boss else "i" + str(i))
		var sm: Dictionary = wm.get("slots", {}).get(nm, {})
		var Hf: float = sm.get("H", 2.0)
		var room := y - (pad_t * H if tall else 0.0) - 1.0
		var rxe := rx * maxf(0.6, minf(1.0, room / (Hf * rx)))
		var cap := rxe * (3.0 if n.boss else 2.1)
		var kk := minf(1.0, minf(cap, room) / (Hf * rxe))
		var sc := rxe / R0 / dpr
		var tb := _tex(dir + nm + "_b.png")
		var ts := _tex(dir + nm + "_s.png")
		var bm = sm.get("body")
		var tm = sm.get("top")
		cur.ops.append(func(ci: CanvasItem):
			if tb and bm is Dictionary:
				ci.draw_texture_rect(tb, Rect2(p - Vector2(bm.ax, bm.ay) * sc, Vector2(bm.w, bm.h) * sc), false)
			if ts and tm is Dictionary and rxe > 9.0:
				var s2 := sc * kk
				ci.draw_texture_rect(ts, Rect2(p - Vector2(tm.ax, tm.ay) * s2, Vector2(tm.w, tm.h) * s2), false))
		if done:
			var fp := Vector2(x - (rx * 0.82 if n.boss else rx * 0.5), y + ry * 0.2)
			var fs := maxf(5.0, rx * 0.17)
			cur.ops.append(func(ci: CanvasItem): _flag(ci, fp, fs, Color("#efc978")))
		if nxt:
			# sıradaki ada: dünya renginde ışık sütunu (toplamsal) + ışıma
			var add := _seg(true)
			var top := y - ry - rx * 2.2
			var bot := y + ry
			var yb := y + ry * 0.3
			var ab := 0.24 * (yb - top) / (bot - top)
			add.ops.append(func(ci: CanvasItem):
				var pts := PackedVector2Array([Vector2(x - rx * 0.24, top), Vector2(x + rx * 0.24, top), Vector2(x + rx * 0.62, yb), Vector2(x - rx * 0.62, yb)])
				var c0 := Color(gl, 0.0)
				var c1 := Color(gl, ab)
				ci.draw_polygon(pts, PackedColorArray([c0, c0, c1, c1])))
			cur = _seg(false)
			cur.ops.append(func(ci: CanvasItem): _soft(ci, p, rx * 1.5, gl, 0.22))
	# ── ön: biyom sisi/havası ──
	var front := _tex(dir + "tall_front.png") if tall else _sized(dir, "front")
	if front: cur.ops.append(func(ci: CanvasItem): ci.draw_texture_rect(front, Rect2(0, 0, W, H), false))
	# ── vinyet: merkez radyal + dip karartması (dikeyde yan vinyet ön katmanda pişmiş) ──
	if not tall: cur.ops.append(func(ci: CanvasItem): _vignette(ci))
	for s in _segs: (s as Seg).queue_redraw()

func _seg(add: bool) -> Seg:
	var s := Seg.new()
	if add: s.set_meta("add", true)
	s.material = (_clip_add if add else _clip)
	if add and s.material == null:
		var m := CanvasItemMaterial.new()
		m.blend_mode = CanvasItemMaterial.BLEND_MODE_ADD
		s.material = m
	add_child(s)
	_segs.append(s)
	return s

static func _tex(path: String) -> Texture2D:
	return UITex.get_tex(path)

## en yakın oranlı pişmiş biyom katmanı
func _sized(dir: String, side: String) -> Texture2D:
	var best := sized_name(side, W, H)
	return _tex(dir + best + ".png") if best != "" else null

static func sized_name(side: String, w: float, h: float) -> String:
	var best := ""
	var bd := 1e9
	for sz in meta().get("sizes", []):
		var d := absf(float(sz[1]) / float(sz[0]) - h / w) * 10.0 + absf(float(sz[0]) - w) / w
		if d < bd:
			bd = d
			best = side + "_" + str(int(sz[0])) + "x" + str(int(sz[1]))
	return best

## önizleme kartının (tall değil) kullanacağı dokular — arka planda önceden yüklemek için
static func card_paths(wid: int, w: float, h: float) -> Array:
	var dir := BASE + "w" + str(wid) + "/"
	var out: Array = []
	for side in ["back", "front"]:
		var nm := sized_name(side, w, h)
		if nm != "": out.append(dir + nm + ".png")
	var nodes := layout(h / w)
	for i in nodes.size():
		var nm2: String = "b3" if nodes[i].boss else "i" + str(i)
		out.append(dir + nm2 + "_b.png")
		out.append(dir + nm2 + "_s.png")
	return out.filter(func(p): return ResourceLoader.exists(p))

## çizimi bırak (kart görünümden çıktı): parçalar silinir, doku referansları düşer
func clear() -> void:
	for s in _segs: s.queue_free()
	_segs.clear()
	_key = ""

static func _ellipse(ci: CanvasItem, c: Vector2, rx: float, ry: float, col: Color) -> void:
	var pts := PackedVector2Array()
	var n := 20
	for i in n:
		var a := TAU * i / n
		pts.append(c + Vector2(cos(a) * rx, sin(a) * ry))
	ci.draw_colored_polygon(pts, col)

static func _soft(ci: CanvasItem, c: Vector2, r: float, col: Color, a: float) -> void:
	ci.draw_texture_rect(glow_tex(), Rect2(c - Vector2(r, r), Vector2(r, r) * 2.0), false, Color(col.r, col.g, col.b, a))

static func _quad(p0: Vector2, p1: Vector2, p2: Vector2, out: PackedVector2Array, n := 6) -> void:
	for i in range(1, n + 1):
		var t := float(i) / n
		out.append(p0.lerp(p1, t).lerp(p1.lerp(p2, t), t))

static func _flag(ci: CanvasItem, p: Vector2, s: float, col: Color) -> void:
	var ink := Color(12 / 255.0, 9 / 255.0, 16 / 255.0, 0.7)
	ci.draw_line(p, p + Vector2(0, -s * 1.5), ink, maxf(1.2, s * 0.12), true)
	var pts := PackedVector2Array([p + Vector2(0, -s * 1.5)])
	_quad(pts[0], p + Vector2(s * 0.9, -s * 1.4), p + Vector2(s * 1.1, -s * 1.05), pts)
	_quad(pts[pts.size() - 1], p + Vector2(s * 0.7, -s * 0.95), p + Vector2(0, -s * 0.85), pts)
	ci.draw_colored_polygon(pts, col)
	var ring := pts.duplicate()
	ring.append(pts[0])
	ci.draw_polyline(ring, ink, maxf(1.0, s * 0.09), true)

## radyal vinyet (iç min(W,H)·0,42 → dış max(W,H)·0,78, rgba(4,3,9,.55)) + dip.
## Halka ağı tek üçgen dizisi; kutu dışı kısımlar kırpma gölgelendiricisinde düşer.
func _vignette(ci: CanvasItem) -> void:
	var c := Vector2(W, H) * 0.5
	var r0 := minf(W, H) * 0.42
	var r1 := maxf(W, H) * 0.78
	var rc := c.length() + 1.0
	var dark := Color(4 / 255.0, 3 / 255.0, 9 / 255.0)
	var steps := 16
	var seg := 64
	var pts := PackedVector2Array()
	var cols := PackedColorArray()
	var idx := PackedInt32Array()
	for j in steps + 1:
		var r := lerpf(r0, rc, float(j) / steps)
		var a := 0.55 * clampf((r - r0) / (r1 - r0), 0.0, 1.0)
		for k in seg:
			var ang := TAU * k / seg
			pts.append(c + Vector2(cos(ang), sin(ang)) * r)
			cols.append(Color(dark, a))
	for j in steps:
		for k in seg:
			var a0 := j * seg + k
			var a1 := j * seg + (k + 1) % seg
			var b0 := a0 + seg
			var b1 := a1 + seg
			idx.append_array([a0, a1, b1, a0, b1, b0])
	RenderingServer.canvas_item_add_triangle_array(ci.get_canvas_item(), idx, pts, cols)
	var y0 := H * 0.84
	ci.draw_polygon(PackedVector2Array([Vector2(0, y0), Vector2(W, y0), Vector2(W, H), Vector2(0, H)]),
		PackedColorArray([Color(5 / 255.0, 4 / 255.0, 10 / 255.0, 0), Color(5 / 255.0, 4 / 255.0, 10 / 255.0, 0), Color(5 / 255.0, 4 / 255.0, 10 / 255.0, 0.72), Color(5 / 255.0, 4 / 255.0, 10 / 255.0, 0.72)]))
