class_name UIK
## Arayüz kiti — web'deki CSS'in Godot karşılıkları.
## • font(): Cinzel (değişken, wght) / Chakra Petch (400·600·700) + letter-spacing
## • shadows(): CSS text-shadow dizesini [renk, dx, dy, bulanıklık] listesine çevirir
## • img(): uicap ile yakalanmış bileşen görseli (3× çözünürlük) — konum meta'dan
## • M: ui_meta.json (yakalanan dikdörtgenler + hesaplanmış yazı stilleri)

static var _fonts := {}
static var _meta := {}
static var _tex := {}

static func meta(k: String) -> Dictionary:
	if _meta.is_empty():
		var f := FileAccess.open("res://assets/ui/ui_meta.json", FileAccess.READ)
		_meta = JSON.parse_string(f.get_as_text()) if f else {}
	return _meta.get(k, {})

## CSS font-family + ağırlık + letter-spacing(px) → Font
static func font(display: bool, weight: int, ls: float = 0.0) -> Font:
	var key := ("d" if display else "h") + str(weight) + "_" + str(snappedf(ls, 0.01))
	if _fonts.has(key): return _fonts[key]
	# FontVariation iç içe kurulamaz (dıştaki boş wght içtekini ezer) → doğrudan dosyadan
	var fv := FontVariation.new()
	if display:
		fv.base_font = load(Ctx2D.FONT_DISPLAY)
		fv.variation_opentype = {TextServerManager.get_primary_interface().name_to_tag("wght"): clampi(weight, 400, 900)}
	else:
		var w := 400
		for k in [400, 600, 700, 800]:
			if weight >= k: w = k
		fv.base_font = load(Ctx2D.FONT_HUD[w])
	fv.spacing_glyph = int(round(ls))
	_fonts[key] = fv
	return fv

## "rgba(0, 0, 0, 0.9) 0px 0px 8px, rgba(...) 0px 2px 4px" → [[Color, dx, dy, blur], ...]
static func shadows(s: String) -> Array:
	var out := []
	if s == "" or s == "none": return out
	var depth := 0
	var cur := ""
	var parts := []
	for ch in s:
		if ch == "(": depth += 1
		elif ch == ")": depth -= 1
		if ch == "," and depth == 0:
			parts.append(cur.strip_edges()); cur = ""
		else: cur += ch
	if cur.strip_edges() != "": parts.append(cur.strip_edges())
	for p: String in parts:
		var ci := p.rfind(")")
		var col := JS.col(p.substr(0, ci + 1)) if ci >= 0 else Color.BLACK
		var nums := p.substr(ci + 1).strip_edges().replace("px", "").split(" ", false)
		var dx := float(nums[0]) if nums.size() > 0 else 0.0
		var dy := float(nums[1]) if nums.size() > 1 else 0.0
		var bl := float(nums[2]) if nums.size() > 2 else 0.0
		out.append([col, dx, dy, bl])
	return out

static func tex(name: String) -> Texture2D:
	if not _tex.has(name):
		_tex[name] = load("res://assets/ui/" + name + ".png") if ResourceLoader.exists("res://assets/ui/" + name + ".png") else null
	return _tex[name]

## Yakalanmış bileşen görseli: kutu (x, y) noktasına göre yerleştirilir;
## görsel kutudan `pad` kadar taşar (gölge/ışıma) — ox/oy ile hizalanır.
static func img(parent: Node, name: String, x = null, y = null) -> TextureRect:
	var m := meta(name)
	var t := TextureRect.new()
	t.texture = tex(name)
	t.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	t.stretch_mode = TextureRect.STRETCH_SCALE
	t.mouse_filter = Control.MOUSE_FILTER_IGNORE
	var dpr: float = m.get("dpr", 3)
	var sz := t.texture.get_size() / dpr if t.texture else Vector2.ONE
	t.size = sz
	var bx: float = (x if x != null else m.get("x", 0.0))
	var by: float = (y if y != null else m.get("y", 0.0))
	t.position = Vector2(bx + m.get("ox", 0.0), by + m.get("oy", 0.0))
	if parent: parent.add_child(t)
	return t

## Yakalanan yazı stilinden UIText kur
static func text_from(parent: Node, st: Dictionary, txt := "") -> UIText:
	var l := UIText.new()
	l.font_display = String(st.get("font", "")).begins_with("Cinzel")
	l.weight = int(st.get("weight", 400))
	l.size_px = float(st.get("size", 12))
	l.ls = float(String(st.get("ls", "0")).replace("px", "")) if st.get("ls", "normal") != "normal" else 0.0
	l.color = JS.col(st.get("color", "#fff"))
	l.shadow_list = shadows(st.get("shadow", "none"))
	l.text = txt if txt != "" else String(st.get("text", ""))
	if parent: parent.add_child(l)
	return l

## Dokuz parçalı yakalanmış görsel (genişliği değişen çubuklar): görsel 3× olduğundan
## düğüm 1/3 ölçekle çizilir; `m` köşe payı mantıksal px (pad + köşe yarıçapı).
static func nine(parent: Node, name: String, m: float) -> NinePatchRect:
	var meta_ := meta(name)
	var dpr: float = meta_.get("dpr", 3)
	var n := NinePatchRect.new()
	n.texture = tex(name)
	n.mouse_filter = Control.MOUSE_FILTER_IGNORE
	var mm := int(round(m * dpr))
	n.patch_margin_left = mm
	n.patch_margin_right = mm
	n.scale = Vector2.ONE / dpr
	if parent: parent.add_child(n)
	return n

## Kutuyu (x, y, w, h — mantıksal px) yakalamanın taşma payıyla birlikte yerleştir.
static func place_nine(n: NinePatchRect, name: String, x: float, y: float, w: float) -> void:
	var m := meta(name)
	var dpr: float = m.get("dpr", 3)
	var ox: float = m.get("ox", 0.0)
	var oy: float = m.get("oy", 0.0)
	n.position = Vector2(x + ox, y + oy)
	n.size = Vector2((w - ox * 2) * dpr, n.texture.get_size().y if n.texture else 1.0)

## Güvenli alan (çentik/gezinme çubuğu) — mantıksal px [üst, sağ, alt, sol] (CSS --sat/--sar/--sab/--sal)
static func safe(vp: Viewport) -> PackedFloat32Array:
	var out := PackedFloat32Array([0, 0, 0, 0])
	if not OS.has_feature("mobile"): return out
	var ws := DisplayServer.window_get_size()
	if ws.x <= 0 or ws.y <= 0: return out
	var sa := DisplayServer.get_display_safe_area()
	var vs := vp.get_visible_rect().size
	var k := vs.x / float(ws.x)
	out[0] = maxf(0, sa.position.y) * k
	out[3] = maxf(0, sa.position.x) * k
	out[1] = maxf(0, ws.x - sa.end.x) * k
	out[2] = maxf(0, ws.y - sa.end.y) * k
	return out

## CSS cubic-bezier(x1, y1, x2, y2) zamanlama işlevi (ikiye bölme ile x→t)
static func bez(x1: float, y1: float, x2: float, y2: float, x: float) -> float:
	if x <= 0.0: return 0.0
	if x >= 1.0: return 1.0
	var lo := 0.0
	var hi := 1.0
	var t := x
	for i in 22:
		t = (lo + hi) * 0.5
		var u := 1.0 - t
		var cx := 3.0 * x1 * t * u * u + 3.0 * x2 * u * t * t + t * t * t
		if cx < x: lo = t
		else: hi = t
	var v := 1.0 - t
	return 3.0 * y1 * t * v * v + 3.0 * y2 * v * t * t + t * t * t

const EASE := [0.25, 0.1, 0.25, 1.0]
const EASE_OUT := [0.0, 0.0, 0.58, 1.0]
const EASE_IN := [0.42, 0.0, 1.0, 1.0]
const EASE_IN_OUT := [0.42, 0.0, 0.58, 1.0]
const LINEAR := [0.0, 0.0, 1.0, 1.0]
const POP := [0.2, 1.6, 0.4, 1.0]

static func ez(e: Array, x: float) -> float:
	return bez(e[0], e[1], e[2], e[3], x)

## CSS @keyframes örnekleyici: keys = [[ilerleme 0..1, değer], ...]; her aralık `e` ile yumuşar.
static func kf(keys: Array, p: float, e: Array = EASE):
	if p <= keys[0][0]: return keys[0][1]
	for i in range(1, keys.size()):
		var b: Array = keys[i]
		if p <= b[0]:
			var a: Array = keys[i - 1]
			var u := ez(e, (p - a[0]) / maxf(1e-6, b[0] - a[0]))
			return lerp(a[1], b[1], u)
	return keys[keys.size() - 1][1]

static func shader_mat(path: String) -> ShaderMaterial:
	var m := ShaderMaterial.new()
	m.shader = load(path)
	return m


## <img> object-fit:cover + border-radius + kenarlık — portreler (tören, tepsi, kahraman kartları)
static func round_image(tex: Texture2D, w: float, h: float, radius: float, opos := Vector2(0.5, 0.1), bw := 0.0, bcol := Color(0, 0, 0, 0), bg0 := Color(0, 0, 0, 0), bg1 := Color(0, 0, 0, 0)) -> ColorRect:
	var r := ColorRect.new()
	r.size = Vector2(w, h)
	r.mouse_filter = Control.MOUSE_FILTER_IGNORE
	var m := shader_mat("res://shaders/ui/img_round.gdshader")
	m.set_shader_parameter("img", tex)
	m.set_shader_parameter("box", Vector2(w, h))
	m.set_shader_parameter("isz", Vector2(tex.get_width(), tex.get_height()))
	m.set_shader_parameter("opos", opos)
	m.set_shader_parameter("radius", radius)
	m.set_shader_parameter("bw", bw)
	m.set_shader_parameter("bcol", bcol)
	m.set_shader_parameter("bg0", bg0)
	m.set_shader_parameter("bg1", bg1)
	r.material = m
	return r
