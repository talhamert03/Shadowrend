class_name UIText
extends Control
## CSS metin karşılığı: font (Cinzel/Chakra Petch), boyut, renk, letter-spacing
## ve ÇOKLU text-shadow (her gölge: renk · kaydırma · bulanıklık). Bulanıklık,
## genişleyen kontur katmanlarıyla (düşük alfa) yaklaşıklanır — gerçek
## bulanıklık filtresi mobilde pahalıdır.
## Konum: `anchor_x` 0 sol · 0,5 orta · 1 sağ; (pos_x, pos_y) metin kutusunun
## o noktası — CSS'teki text-align + kapsayıcı hizasıyla aynı iş.

@export var text := "":
	set(v):
		if v == text: return
		text = v
		queue_redraw()
var font_display := false:
	set(v): font_display = v; _font = null; queue_redraw()
var weight := 700:
	set(v): weight = v; _font = null; queue_redraw()
var size_px := 12.0:
	set(v): size_px = v; queue_redraw()
var ls := 0.0:
	set(v): ls = v; _font = null; queue_redraw()
var color := Color.WHITE:
	set(v):
		color = v
		queue_redraw()
var shadow_list: Array = []:
	set(v): shadow_list = v; queue_redraw()
var anchor_x := 0.0
var line_h := 0.0
## çok satırlı kip: wrap_w > 0 ise metin bu genişlikte sarılır ve `align` (0 sol ·
## 0,5 orta · 1 sağ) ile kutu içinde hizalanır; (0, 0) kutunun sol üstü.
var wrap_w := 0.0:
	set(v): wrap_w = v; queue_redraw()
var align := 0.0
var nowrap := false
var max_lines := 0
var box_h := 0.0
var lines_hint := 0
var shadow_only := false     # yalnız gölgeleri çiz (dolgulu metnin alt katmanı)
var no_shadow := false

## Tek çağrıda CSS stili: (Cinzel mi, ağırlık, boyut, letter-spacing px, renk, text-shadow dizesi)
func style(display: bool, w: int, sz: float, spacing: float, col, shadow := "", lh := 0.0) -> UIText:
	font_display = display; weight = w; size_px = sz; ls = spacing
	color = col if col is Color else JS.col(col)
	shadow_list = UIK.shadows(shadow)
	line_h = lh
	return self
var _font: Font

func _ready() -> void:
	mouse_filter = Control.MOUSE_FILTER_IGNORE

func _f() -> Font:
	if _font == null: _font = UIK.font(font_display, weight, ls)
	return _font

func _fs() -> int:
	return maxi(1, int(round(size_px)))

## kesirli CSS boyutu: tam sayı boyutta çizip ölçekle
func _k() -> float:
	return size_px / float(_fs())

func text_width(s = null) -> float:
	var st: String = text if s == null else s
	return _f().get_string_size(st, HORIZONTAL_ALIGNMENT_LEFT, -1, _fs()).x * _k()

func lines() -> PackedStringArray:
	var out := PackedStringArray()
	for para in text.split("\n"):
		if wrap_w <= 0 or nowrap or text_width(para) <= wrap_w * 1.03 + 0.5:
			out.append(para)
			continue
		var cur := ""
		for w in para.split(" ", false):
			var tryc := w if cur == "" else cur + " " + w
			if cur != "" and text_width(tryc) > wrap_w * 1.03 + 0.5:
				out.append(cur)
				cur = w
			else:
				cur = tryc
		if cur != "": out.append(cur)
	if max_lines > 0 and out.size() > max_lines:
		out.resize(max_lines)
		var last := out[max_lines - 1]
		while last.length() > 1 and text_width(last + "…") > wrap_w: last = last.left(last.length() - 1)
		out[max_lines - 1] = last.strip_edges() + "…"
	return out

func line_count() -> int:
	return lines().size()

func _draw() -> void:
	if text == "": return
	var f := _f()
	var fs := _fs()
	var k := _k()
	var asc := f.get_ascent(fs) * k
	var desc := f.get_descent(fs) * k
	var hh := line_h if line_h > 0 else size_px
	var L := lines()
	if k != 1.0: draw_set_transform(Vector2.ZERO, 0, Vector2(k, k))
	for li in L.size():
		var s: String = L[li]
		var w := text_width(s)
		var x := ((wrap_w - w) * align) if wrap_w > 0 else -w * anchor_x
		var y := li * hh + (hh - (asc + desc)) * 0.5 + asc
		_line(f, fs, s, x / k, y / k)
	if k != 1.0: draw_set_transform(Vector2.ZERO, 0, Vector2.ONE)

func _line(f: Font, fs: int, s: String, x: float, y: float) -> void:
	var k := _k()
	# gölgeler: CSS'te ilk gölge en üstte — sondan başa çiz
	for i in range(shadow_list.size() - 1, -1, -1):
		if no_shadow: break
		var sh: Array = shadow_list[i]
		var c: Color = sh[0]
		var dx: float = sh[1] / k
		var dy: float = sh[2] / k
		var bl: float = sh[3] / k
		if c.a <= 0: continue
		if bl <= 0.5:
			draw_string(f, Vector2(x + dx, y + dy), s, HORIZONTAL_ALIGNMENT_LEFT, -1, fs, c)
			continue
		# bulanıklık (Gauss ışıma): genişleyen kontur katmanları — her katman düşük
		# alfalı; üst üste binince kenardan uzaklaştıkça yumuşakça söner.
		var a := c.a * 0.065
		for j in range(4, 0, -1):
			var sz := int(round(bl * j * 0.5))
			draw_string_outline(f, Vector2(x + dx, y + dy), s, HORIZONTAL_ALIGNMENT_LEFT, -1, fs, sz, Color(c.r, c.g, c.b, a))
		draw_string(f, Vector2(x + dx, y + dy), s, HORIZONTAL_ALIGNMENT_LEFT, -1, fs, Color(c.r, c.g, c.b, a))
	if not shadow_only: draw_string(f, Vector2(x, y), s, HORIZONTAL_ALIGNMENT_LEFT, -1, fs, color)
