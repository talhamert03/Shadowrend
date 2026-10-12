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

func text_width() -> float:
	return _f().get_string_size(text, HORIZONTAL_ALIGNMENT_LEFT, -1, int(round(size_px))).x

func _draw() -> void:
	if text == "": return
	var f := _f()
	var fs := int(round(size_px))
	var w := text_width()
	var asc := f.get_ascent(fs)
	var desc := f.get_descent(fs)
	var hh := line_h if line_h > 0 else size_px
	var x := -w * anchor_x
	var y := (hh - (asc + desc)) * 0.5 + asc
	# gölgeler: CSS'te ilk gölge en üstte — sondan başa çiz
	for i in range(shadow_list.size() - 1, -1, -1):
		var s: Array = shadow_list[i]
		var c: Color = s[0]
		var dx: float = s[1]
		var dy: float = s[2]
		var bl: float = s[3]
		if c.a <= 0: continue
		if bl <= 0.5:
			draw_string(f, Vector2(x + dx, y + dy), text, HORIZONTAL_ALIGNMENT_LEFT, -1, fs, c)
			continue
		# bulanıklık (Gauss ışıma): genişleyen kontur katmanları — her katman düşük
		# alfalı; üst üste binince kenardan uzaklaştıkça yumuşakça söner.
		var a := c.a * 0.065
		for k in range(4, 0, -1):
			var sz := int(round(bl * k * 0.5))
			draw_string_outline(f, Vector2(x + dx, y + dy), text, HORIZONTAL_ALIGNMENT_LEFT, -1, fs, sz, Color(c.r, c.g, c.b, a))
		draw_string(f, Vector2(x + dx, y + dy), text, HORIZONTAL_ALIGNMENT_LEFT, -1, fs, Color(c.r, c.g, c.b, a))
	draw_string(f, Vector2(x, y), text, HORIZONTAL_ALIGNMENT_LEFT, -1, fs, color)
