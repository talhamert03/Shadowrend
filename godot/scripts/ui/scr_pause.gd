class_name ScrPause
extends Scr
## DURAKLATMA: oyunun üstünde hafif karartma + ortada derli toplu açılır pencere. Başlık,
## donanım ikonları (silah · rün; yazısız, seviye noktalı) ve üç düğme: DEVAM ET · AYARLAR ·
## ANA MENÜ. Hafif geri tepmeli belirme; dokunmada düğme içe basılır.

const ART := "res://assets/ui/art/"
static var _art := {}

const INK := ComicSkin.INK
const YEL := ComicSkin.YEL

var _dim: Node2D
var _panel: Node2D
var _btns2: Array = []       # [{node, rect(yerel), cb}]
var _pressB = null
var _t := 0.0
var _W := 390.0
var _H := 844.0

func _init(game) -> void:
	super(game)
	name = "Pause"

static func art() -> Dictionary:
	if _art.is_empty():
		var f := FileAccess.open(ART + "art.json", FileAccess.READ)
		_art = JSON.parse_string(f.get_as_text()) if f else {"icon": {}}
	return _art

static func icon_tex(id: String) -> Texture2D:
	var p := ART + "icon/" + id + ".png"
	if not ResourceLoader.exists(p): p = ART + "icon/guc.png"
	return load(p)

static func icon_col(id: String) -> Color:
	var I: Dictionary = art().get("icon", {}).get(id, {})
	return JS.col(I.get("col", "#e8e4d8"))

static func display_name(id: String) -> String:
	var I: Dictionary = art().get("icon", {}).get(id, {})
	return str(I.get("name", id))

func show_pause() -> void:
	_build()
	_t = 0.0
	visible = true
	set_process(true)

func hide_pause() -> void:
	visible = false
	set_process(false)

func _build() -> void:
	for c in get_children():
		if c is Node2D: c.queue_free()
	_btns2.clear()
	_pressB = null
	var vs := UIK.ui_size(get_viewport())
	_W = vs.x; _H = vs.y
	_dim = Node2D.new()
	_dim.draw.connect(func(): _dim.draw_rect(Rect2(-20, -20, _W + 40, _H + 40), Color(0.02, 0.01, 0.05, 0.6)))
	add_child(_dim)
	var pw := minf(320.0, _W - 56.0)
	var w = g.weapons
	var items := []
	for id in w.slots: items.append([str(id), int(w.slots[id])])
	for id in w.passives: items.append([str(id), int(w.passives[id])])
	var per := maxi(1, int((pw - 28.0) / 50.0))
	var rows := int(ceil(float(items.size()) / per)) if items.size() else 0
	var ph := 74.0 + rows * 56.0 + (10.0 if rows else 0.0) + 3 * 58.0 + 18.0
	_panel = Node2D.new()
	_panel.position = Vector2(_W * 0.5, _H * 0.5)
	add_child(_panel)
	var R := Rect2(-pw * 0.5, -ph * 0.5, pw, ph)
	_panel.draw.connect(func():
		_panel.draw_style_box(ComicSkin.sb(Color(0, 0, 0, 0.45), 22), Rect2(R.position + Vector2(0, 8), R.size))
		_panel.draw_style_box(ComicSkin.sb(Color("#1d1530"), 20, 3.5, INK), R)
		_panel.draw_style_box(ComicSkin.sb(Color("#2a1f42"), 16), Rect2(R.position + Vector2(8, 8), Vector2(R.size.x - 16, 50)))
		_panel.draw_rect(Rect2(R.position.x + 24, R.position.y + 60, R.size.x - 48, 2), Color(1, 0.82, 0.4, 0.35)))
	var tt := UIText.new()
	tt.style(false, 1000, 26, 2.0, YEL, UIK.ink_stroke(2.0, 3.0))
	tt.align = 0.5; tt.nowrap = true; tt.wrap_w = pw; tt.size = Vector2(pw, 34)
	tt.position = Vector2(-pw * 0.5, R.position.y + 17)
	tt.text = "DURAKLATILDI"
	_panel.add_child(tt)
	# donanım ikonları (yazısız; seviye = altın noktalar)
	var y := R.position.y + 76.0
	for r in rows:
		var rowIt := items.slice(r * per, mini(items.size(), (r + 1) * per))
		var rw := rowIt.size() * 50.0 - 6.0
		for i in rowIt.size():
			var it: Array = rowIt[i]
			var cx := -rw * 0.5 + i * 50.0 + 22.0
			var ic := Node2D.new()
			ic.position = Vector2(cx, y + 20)
			var col := ScrPause.icon_col(it[0])
			var lv: int = it[1]
			ic.draw.connect(func():
				ic.draw_circle(Vector2.ZERO, 21, INK)
				ic.draw_circle(Vector2.ZERO, 18.5, Color("#2f2448"))
				ic.draw_arc(Vector2.ZERO, 18.5, 0, TAU, 32, Color(col, 0.7), 2.0, true)
				var n := mini(lv, 5)
				for k in n:
					var px := (k - (n - 1) * 0.5) * 7.0
					ic.draw_circle(Vector2(px, 27), 2.6, INK)
					ic.draw_circle(Vector2(px, 27), 1.8, YEL))
			var sp := Sprite2D.new()
			sp.texture = ScrPause.icon_tex(it[0])
			sp.scale = Vector2.ONE * (22.0 / 120.0)
			var I: Dictionary = ScrPause.art().get("icon", {}).get(it[0], {})
			sp.modulate = col if I.get("mono", true) else Color.WHITE
			ic.add_child(sp)
			_panel.add_child(ic)
		y += 56.0
	if rows: y += 10.0
	_mk_btn("DEVAM ET", Color("#ffc53a"), Color("#3a2200"), y, pw, func(): g.audio.play("click"); g.resume_game())
	_mk_btn("AYARLAR", Color("#5b6c8e"), Color.WHITE, y + 58.0, pw, func(): g.audio.play("click"); g.ui.show_settings())
	_mk_btn("ANA MENÜ", Color("#8e3a3a"), Color.WHITE, y + 116.0, pw, func(): g.audio.play("click"); g.quit_to_menu())

func _mk_btn(label: String, bg: Color, fg: Color, y: float, pw: float, cb: Callable) -> void:
	var bw := pw - 48.0
	var b := Node2D.new()
	b.position = Vector2(0, y + 23)
	var R := Rect2(-bw * 0.5, -23, bw, 46)
	b.draw.connect(func():
		b.draw_style_box(ComicSkin.sb(INK, 14), Rect2(R.position + Vector2(0, 4), R.size))
		b.draw_style_box(ComicSkin.sb(bg, 14, 3.0, INK), R)
		b.draw_style_box(ComicSkin.sb(Color(1, 1, 1, 0.16), 10), Rect2(R.position + Vector2(6, 5), Vector2(R.size.x - 12, 14))))
	var tx := UIText.new()
	tx.style(false, 1000, 19, 1.5, fg, UIK.ink_stroke(1.4, 2.0) if fg == Color.WHITE else "")
	tx.align = 0.5; tx.nowrap = true; tx.wrap_w = bw; tx.size = Vector2(bw, 26)
	tx.position = Vector2(-bw * 0.5, -12)
	tx.text = label
	b.add_child(tx)
	_panel.add_child(b)
	_btns2.append({"node": b, "rect": R, "cb": cb})

func _process(dt: float) -> void:
	if not visible or _panel == null: return
	_t += dt
	var k := minf(1.0, _t / 0.22)
	var q := k - 1.0
	var e := 1.0 + 2.2 * q * q * q + 1.2 * q * q
	_panel.scale = Vector2.ONE * (0.82 + 0.18 * e)
	_panel.modulate.a = minf(1.0, _t / 0.12)
	_dim.modulate.a = minf(1.0, _t / 0.18)
	for B in _btns2:
		var nd: Node2D = B.node
		var target := 0.95 if B == _pressB else 1.0
		nd.scale = nd.scale.lerp(Vector2.ONE * target, minf(1.0, dt * 22.0))

func _btn_at(pos: Vector2):
	for B in _btns2:
		var nd: Node2D = B.node
		if not is_instance_valid(nd): continue
		var lp: Vector2 = nd.get_global_transform_with_canvas().affine_inverse() * pos
		if (B.rect as Rect2).grow(6.0).has_point(lp): return B
	return null

func _input(ev: InputEvent) -> void:
	if not visible: return
	if ev is InputEventScreenTouch:
		var st := ev as InputEventScreenTouch
		get_viewport().set_input_as_handled()
		if st.pressed:
			_pressB = _btn_at(st.position)
		else:
			var B = _btn_at(st.position)
			if B != null and B == _pressB:
				_pressB = null
				(B.cb as Callable).call()
			_pressB = null
	elif ev is InputEventScreenDrag:
		get_viewport().set_input_as_handled()
