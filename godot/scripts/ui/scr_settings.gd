class_name ScrSettings
extends Scr
## AYARLAR — tek pencere, sade (koyu çizgi roman): SES (efekt · müzik kaydırıcıları) · GRAFİK
## (otomatik/düşük/orta/yüksek) · DİL · ekran sarsıntısı · HESAP (oyuncu kimliği, yasal belgeler,
## veri silme). Eski üç sekmeli yakalama (pil, renk körlüğü, büyük yazı, bildirim, titreşim…) kalktı.

const INK := Color(0.05, 0.03, 0.07)
const YEL := Color("#ffd23a")
const PANEL := Color("#1a1218")
const TILE := Color("#251a22")
const CRIM := Color("#c8343c")
const GFX := ["auto", "low", "mid", "high"]
const GFX_N := ["OTO", "DÜŞÜK", "ORTA", "YÜKSEK"]

var from := "menu"
var _W := 390.0
var _H := 844.0
var _dim: Node2D
var _panel: Node2D
var _t := 0.0
var _taps: Array = []        # [{node, rect, cb, k}]
var _pressT = null
var _sliders: Array = []     # [{node, w, key, draw}]
var _slide = null
var _closing := false

func _init(game) -> void:
	super(game)
	name = "Settings"

func show_settings(from_pause: bool) -> void:
	from = "pause" if from_pause else "menu"
	_closing = false
	_build()
	_t = 0.0
	visible = true
	set_process(true)

func hide_settings() -> void:
	if not visible or _closing: return
	_closing = true
	_t = 0.0

func _build() -> void:
	for c in get_children():
		if c is Node2D: c.queue_free()
	_taps.clear()
	_sliders.clear()
	var vs := UIK.ui_size(get_viewport())
	_W = vs.x; _H = vs.y
	_dim = Node2D.new()
	_dim.draw.connect(func(): _dim.draw_rect(Rect2(-40, -40, _W + 80, _H + 80), Color(0.02, 0.0, 0.02, 0.7)))
	add_child(_dim)
	var pw := minf(340.0, _W - 36.0)
	var ph := 478.0
	_panel = Node2D.new()
	_panel.position = Vector2(_W * 0.5, _H * 0.5)
	add_child(_panel)
	var R := Rect2(-pw * 0.5, -ph * 0.5, pw, ph)
	_panel.draw.connect(func():
		_panel.draw_style_box(ComicSkin.sb(Color(0, 0, 0, 0.5), 22), Rect2(R.position + Vector2(0, 9), R.size))
		_panel.draw_style_box(ComicSkin.sb(PANEL, 20, 3.5, INK), R)
		# başlık bandı: kızıl, eğik çizgi dokulu
		var hb := Rect2(R.position + Vector2(8, 8), Vector2(R.size.x - 16, 52))
		_panel.draw_style_box(ComicSkin.sb(Color("#3a1218"), 15), hb)
		for i in 9:
			var x := hb.position.x + 16 + i * 36.0
			_panel.draw_line(Vector2(x, hb.position.y + 4), Vector2(x - 14, hb.end.y - 4), Color(1, 0.3, 0.3, 0.07), 6.0)
		_panel.draw_rect(Rect2(hb.position.x + 12, hb.end.y - 3, hb.size.x - 24, 2), Color(CRIM, 0.8)))
	var tt := _lbl("AYARLAR", 26, YEL, true, 2.0)
	tt.align = 0.5; tt.wrap_w = pw
	tt.position = Vector2(-pw * 0.5, R.position.y + 21)
	_panel.add_child(tt)
	# kapat (sağ üst)
	var cx := Node2D.new()
	cx.position = Vector2(R.end.x - 30, R.position.y + 34)
	cx.draw.connect(func():
		cx.draw_circle(Vector2(0, 2), 17, INK)
		cx.draw_circle(Vector2.ZERO, 16, INK)
		cx.draw_circle(Vector2.ZERO, 13.5, CRIM)
		cx.draw_line(Vector2(-5, -5), Vector2(5, 5), Color.WHITE, 3.5)
		cx.draw_line(Vector2(5, -5), Vector2(-5, 5), Color.WHITE, 3.5))
	_panel.add_child(cx)
	_tap(cx, Rect2(-20, -20, 40, 40), func(): g.audio.play("click"); hide_settings())
	var x0 := R.position.x + 20.0
	var cw := pw - 40.0
	var y := R.position.y + 78.0
	# ── SES ──
	y = _section("SES", x0, y)
	y = _slider("Efektler", "sfx", x0, y, cw)
	y = _slider("Müzik", "music", x0, y, cw)
	# ── GRAFİK ──
	y = _section("GRAFİK", x0, y + 4)
	y = _segment(GFX_N, GFX.find(str(Settings.data.get("gfx", "auto"))), x0, y, cw, func(i: int):
		g.audio.play("click")
		Settings.set_value("gfx", GFX[i])
		_build_keep())
	# ── DİL + SARSINTI (yan yana) ──
	y = _section("DİL · EKRAN SARSINTISI", x0, y + 4)
	var hw := (cw - 10.0) * 0.5
	_segment(["TR", "EN"], ["tr", "en"].find(I18n.lang), x0, y, hw, func(i: int):
		g.audio.play("click")
		I18n.set_lang(["tr", "en"][i], get_tree())
		_build_keep())
	var sh := bool(Settings.data.get("shake", true))
	y = _segment(["AÇIK", "KAPALI"], 0 if sh else 1, x0 + hw + 10.0, y, hw, func(i: int):
		g.audio.play("click")
		Settings.set_value("shake", i == 0)
		_build_keep())
	# ── HESAP ──
	y = _section("HESAP", x0, y + 4)
	var pid := _lbl("Oyuncu: " + Store.player_id(), 11, Color("#b8a9ae"), false, 0.4)
	pid.position = Vector2(x0, y)
	_panel.add_child(pid)
	y += 22.0
	var bw := (cw - 10.0) * 0.5
	_small_btn("GİZLİLİK", x0, y, bw, Color("#3a2a33"), func(): g.audio.play("click"); g.ui.open_doc("privacy"))
	_small_btn("KOŞULLAR", x0 + bw + 10.0, y, bw, Color("#3a2a33"), func(): g.audio.play("click"); g.ui.open_doc("terms"))
	y += 44.0
	_small_btn("VERİLERİ SİL", x0, y, cw, Color("#5a1a20"), func(): g.audio.play("click"); g.ui.confirm_wipe())
	y += 46.0
	var ver := _lbl("v" + str(ProjectSettings.get_setting("application/config/version", "1.0.0")), 10, Color(1, 1, 1, 0.3), false, 1.0)
	ver.align = 0.5; ver.wrap_w = pw
	ver.position = Vector2(-pw * 0.5, R.end.y - 22)
	_panel.add_child(ver)

## yeniden kur, giriş animasyonu olmadan
func _build_keep() -> void:
	var t := _t
	_build()
	_t = maxf(t, 0.3)

func _lbl(s: String, sz: float, col: Color, disp := false, ls := 0.6) -> UIText:
	var t := UIText.new()
	t.style(disp, 1000 if disp else 800, sz, ls, col, UIK.ink_stroke(2.0, 3.0) if disp else "0 1px 2px rgba(0,0,0,0.8)")
	t.nowrap = true
	t.text = s
	return t

func _section(s: String, x: float, y: float) -> float:
	var l := _lbl(s, 12, Color("#e6a07a"), false, 2.0)
	l.position = Vector2(x, y)
	_panel.add_child(l)
	var ln := Node2D.new()
	_panel.add_child(ln)
	var lw := l.text_width() + 10.0
	ln.draw.connect(func(): ln.draw_rect(Rect2(x + lw, y + 9, 300 - lw, 1), Color(1, 1, 1, 0.08)))
	return y + 24.0

func _slider(name: String, key: String, x: float, y: float, w: float) -> float:
	var l := _lbl(name, 13, Color("#efe4dc"))
	l.position = Vector2(x, y + 4)
	_panel.add_child(l)
	var val := _lbl(str(int(round(float(Settings.data.get(key, 0.5)) * 100))), 13, YEL)
	val.align = 1.0
	val.wrap_w = 40
	val.position = Vector2(x + w - 40, y + 4)
	_panel.add_child(val)
	var sx := x + 84.0
	var sw := w - 84.0 - 46.0
	var d := Node2D.new()
	d.position = Vector2(sx, y + 13)
	_panel.add_child(d)
	d.draw.connect(func():
		var v := float(Settings.data.get(key, 0.5))
		d.draw_style_box(ComicSkin.sb(INK, 6), Rect2(-2, -6, sw + 4, 12))
		d.draw_style_box(ComicSkin.sb(Color("#2f2229"), 4), Rect2(0, -4, sw, 8))
		if v > 0.01: d.draw_style_box(ComicSkin.sb(CRIM.lerp(Color("#ff8a4a"), v), 4), Rect2(0, -4, sw * v, 8))
		var c := Vector2(sw * v, 0)
		d.draw_circle(c + Vector2(0, 2), 12, Color(0, 0, 0, 0.5))
		d.draw_circle(c, 11, INK)
		d.draw_circle(c, 8.5, Color("#f3e6d4"))
		d.draw_circle(c + Vector2(-2, -2.5), 3.5, Color.WHITE))
	_sliders.append({"node": d, "w": sw, "key": key, "val": val})
	return y + 36.0

func _segment(labels: Array, sel: int, x: float, y: float, w: float, cb: Callable) -> float:
	var n := labels.size()
	var gap := 4.0
	var bw := (w - gap * (n - 1)) / n
	for i in n:
		var on := i == sel
		var b := Node2D.new()
		b.position = Vector2(x + i * (bw + gap) + bw * 0.5, y + 18)
		var R := Rect2(-bw * 0.5, -17, bw, 34)
		b.draw.connect(func():
			b.draw_style_box(ComicSkin.sb(INK, 10), Rect2(R.position + Vector2(0, 3), R.size))
			b.draw_style_box(ComicSkin.sb(Color("#b8312f") if on else TILE, 10, 2.5, INK), R)
			if on: b.draw_style_box(ComicSkin.sb(Color(1, 1, 1, 0.14), 7), Rect2(R.position + Vector2(4, 4), Vector2(R.size.x - 8, 10))))
		var t := _lbl(str(labels[i]), 13, Color.WHITE if on else Color("#9c8e95"), true, 0.8)
		t.align = 0.5; t.wrap_w = bw
		t.position = Vector2(-bw * 0.5, -9)
		b.add_child(t)
		_panel.add_child(b)
		var idx := i
		_tap(b, R, func(): cb.call(idx))
	return y + 44.0

func _small_btn(label: String, x: float, y: float, w: float, bg: Color, cb: Callable) -> void:
	var b := Node2D.new()
	b.position = Vector2(x + w * 0.5, y + 17)
	var R := Rect2(-w * 0.5, -17, w, 34)
	b.draw.connect(func():
		b.draw_style_box(ComicSkin.sb(INK, 10), Rect2(R.position + Vector2(0, 3), R.size))
		b.draw_style_box(ComicSkin.sb(bg, 10, 2.5, INK), R))
	var t := _lbl(label, 13, Color("#f2e6dc"), true, 1.0)
	t.align = 0.5; t.wrap_w = w
	t.position = Vector2(-w * 0.5, -9)
	b.add_child(t)
	_panel.add_child(b)
	_tap(b, R, cb)

func _tap(n: Node2D, r: Rect2, cb: Callable) -> void:
	_taps.append({"node": n, "rect": r, "cb": cb})

func _process(dt: float) -> void:
	if not visible or _panel == null: return
	_t += dt
	if _closing:
		var k2 := minf(1.0, _t / 0.14)
		_panel.modulate.a = 1.0 - k2
		_dim.modulate.a = 1.0 - k2
		_panel.scale = Vector2.ONE * (1.0 - 0.06 * k2)
		if k2 >= 1.0:
			visible = false
			set_process(false)
		return
	var k := minf(1.0, _t / 0.24)
	var q := k - 1.0
	var e := 1.0 + 2.2 * q * q * q + 1.2 * q * q
	_panel.scale = Vector2.ONE * (0.85 + 0.15 * e)
	_panel.modulate.a = minf(1.0, _t / 0.12)
	_dim.modulate.a = minf(1.0, _t / 0.18)
	for B in _taps:
		var nd: Node2D = B.node
		if not is_instance_valid(nd): continue
		nd.scale = nd.scale.lerp(Vector2.ONE * (0.94 if B == _pressT else 1.0), minf(1.0, dt * 22.0))

func _hit(pos: Vector2, B: Dictionary, grow := 6.0) -> bool:
	var nd: Node2D = B.node
	if not is_instance_valid(nd): return false
	var lp: Vector2 = nd.get_global_transform_with_canvas().affine_inverse() * pos
	return (B.rect as Rect2).grow(grow).has_point(lp)

func _slider_at(pos: Vector2):
	for S in _sliders:
		var nd: Node2D = S.node
		var lp: Vector2 = nd.get_global_transform_with_canvas().affine_inverse() * pos
		if Rect2(-14, -18, float(S.w) + 28, 36).has_point(lp): return S
	return null

func _slide_to(S: Dictionary, pos: Vector2) -> void:
	var nd: Node2D = S.node
	var lp: Vector2 = nd.get_global_transform_with_canvas().affine_inverse() * pos
	var v := roundf(clampf(lp.x / float(S.w), 0.0, 1.0) * 100.0) / 100.0
	Settings.data[S.key] = v
	Settings.apply_one(S.key)
	(S.val as UIText).text = str(int(round(v * 100)))
	nd.queue_redraw()

func _input(ev: InputEvent) -> void:
	if not visible or _closing: return
	if ev is InputEventScreenTouch:
		var st := ev as InputEventScreenTouch
		get_viewport().set_input_as_handled()
		if st.pressed:
			var S = _slider_at(st.position)
			if S != null:
				_slide = S
				_slide_to(S, st.position)
				return
			_pressT = null
			for B in _taps:
				if _hit(st.position, B):
					_pressT = B
					break
		else:
			if _slide != null:
				Settings.save()
				if _slide.key == "sfx": g.audio.play("click")
				_slide = null
				return
			var P = _pressT
			_pressT = null
			if P != null and _hit(st.position, P, 12.0): (P.cb as Callable).call()
	elif ev is InputEventScreenDrag:
		get_viewport().set_input_as_handled()
		if _slide != null: _slide_to(_slide, (ev as InputEventScreenDrag).position)
