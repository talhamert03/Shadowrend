class_name ScrBless
extends Node2D
## ui.js showBlessPick — v60 KUTSAMA SEÇİMİ (ve sunak): kabuk bp_screen / bp_altar,
## kartlar bpc_<renk>. Kart dağıtımı (bp2Deal) sıraya göre dönüş + gecikme alır;
## seçimde kart yükselir, diğerleri söner (260 ms geçiş), "SAVAŞ!" mührü basılır,
## 0,75 sn sonra perde kalkar (380 ms) ve seçim bildirilir.

var g
var shell: Lyr
var cards: Array = []          # [{lyr, b, rect, i}]
var list: Array = []
var cb: Callable
var opt := {}
var done := false
var _t := 0.0
var _pickAt := -1.0
var _outAt := -1.0
var _picked := -1
var _press := -1
var _pressIdx := -1
# ── SUNAK sahnesi (özel çizim) ──
var _alt := false
var _bg: Node2D
var _fx: Node2D
var _acards: Array = []        # [{node, b, i, rect(global), col}]
var _W := 390.0
var _H := 844.0
const INK := ComicSkin.INK
const GOLD := Color("#f0c77a")

func _init(game) -> void:
	g = game
	name = "Bless"
	visible = false
	process_mode = Node.PROCESS_MODE_ALWAYS

func show_pick(l: Array, on_pick: Callable, o = null) -> void:
	_clear()
	if l == null or l.is_empty():
		if on_pick.is_valid(): on_pick.call(null)
		return
	list = l
	cb = on_pick
	opt = o if o is Dictionary else {}
	done = false
	_pickAt = -1.0
	_outAt = -1.0
	_picked = -1
	_t = 0.0
	modulate.a = 1.0
	var altar := String(opt.get("cls", "")).contains("altar")
	_alt = altar
	if altar:
		_show_altar(l)
		visible = true
		g.audio.play("reveal")
		return
	shell = Lyr.make("bp_altar" if altar else "bp_screen", [".bp2-card"])
	add_child(shell)
	shell.stretch_h(Scr.dh_of(self))
	_txt(".bp2-k", opt.get("k", "SAVAŞTAN ÖNCE"))
	_txt(".bp2-t", opt.get("t", "BİR KUTSAMA SEÇ"))
	_txt(".bp2-s", opt.get("s", "Bu koşu boyunca geçerli · bir güç, bir bedel"))
	_txt(".bp2-stamp", opt.get("stamp", "SAVAŞ!"))
	var row := shell.find(".bp2-row")
	var rr := shell.rect_of(row)
	var gap := 8.0
	var n := mini(3, l.size())
	var cw := (rr.size.x - gap * 2) / 3.0
	for i in n:
		var b: Dictionary = l[i]
		var key := "bpc_" + String(b.get("col", "#d8a284")).trim_prefix("#").to_lower()
		if not FileAccess.file_exists(Lyr.BASE + key + ".json"): key = "bpc_d8a284"
		var L := Lyr.make(key)
		add_child(L)
		var x := rr.position.x + i * (cw + gap)
		L.position = Vector2(x, rr.position.y)
		var root: Lyr.N = L.nodes[0]
		# bp2Deal: from { translateY(60) rotate((n-1)·8°) scale(.8); opacity 0 } · gecikme 260 + n·110 ms
		for A in root.anims:
			if String(A.get("name", "")).contains("Deal"):
				A["delay"] = 260.0 + i * 110.0
				for k in A.kfs:
					if k.has("tf"):
						for f in k.tf:
							if String(f[0]) == "rotate": f[1] = deg_to_rad((i - 1) * 8.0)
		var gem := L.find(".bp2-gem")
		if gem: L.set_anim_delay(gem, "Bob", i * 400.0)
		var nm := L.find(".bp2-name")
		if nm: L.set_text(nm, str(b.get("name", "")))
		var pl := L.find(".bp2-plus")
		if pl: L.set_text(pl, str(b.get("plus", "")))
		var mi := L.find(".bp2-minus")
		if mi: L.set_text(mi, str(b.get("minus", "")))
		L.restart()
		cards.append({"lyr": L, "b": b, "i": i, "rect": Rect2(x, rr.position.y, cw, root.size.y)})
	visible = true
	g.audio.play("reveal")

func _txt(key: String, s) -> void:
	var nn := shell.find(key)
	if nn: shell.set_text(nn, str(s))

func _clear() -> void:
	for C in cards: (C.lyr as Node).queue_free()
	cards.clear()
	for C in _acards: (C.node as Node).queue_free()
	_acards.clear()
	if _bg: _bg.queue_free(); _bg = null
	if _fx: _fx.queue_free(); _fx = null
	if shell: shell.queue_free(); shell = null

func _process(dt: float) -> void:
	if not visible: return
	_t += dt
	if _alt:
		_tick_altar(dt)
		return
	if _pickAt >= 0:
		var k := clampf((_t - _pickAt) / 0.26, 0, 1)
		var kp := UIK.ez(UIK.POP, k)
		var ke := UIK.ez(UIK.EASE, k)
		for C in cards:
			var root: Lyr.N = (C.lyr as Lyr).nodes[0]
			if C.i == _picked:
				root.extra = Transform2D(0, Vector2.ONE * lerpf(1.0, 1.06, kp), 0, Vector2(0, lerpf(0, -10, kp)))
			else:
				root.extra = Transform2D(0, Vector2.ONE * lerpf(1.0, 0.9, kp), 0, Vector2.ZERO)
				root.op_mul = lerpf(1.0, 0.22, ke)
				(C.lyr as Lyr).modulate = Color(1, 1, 1).lerp(Color(0.62, 0.62, 0.62), ke)
		if _outAt < 0 and _t - _pickAt >= 0.75:
			_outAt = _t
			g.audio.play(str(opt.get("endSnd", "start")))
			var b = list[_picked]
			if cb.is_valid(): cb.call(b)
	if _outAt >= 0:
		var k2 := clampf((_t - _outAt) / 0.38, 0, 1)
		modulate.a = 1.0 - UIK.ez(UIK.EASE, k2)
		if _t - _outAt >= 0.4:
			visible = false
			_clear()

func _pick(i: int) -> void:
	if done: return
	done = true
	_picked = i
	_pickAt = _t
	g.audio.play("bless")
	pass  # titreşim kapalı
	var st := shell.find(".bp2-stamp")
	if st: shell.play(st, Lyr.anims_of("bp_chosen", st.d.key))

func _input(ev: InputEvent) -> void:
	if _alt:
		_altar_input(ev)
		return
	if not visible or done or not (ev is InputEventScreenTouch): return
	var s := ev as InputEventScreenTouch
	if s.pressed:
		for C in cards:
			if (C.rect as Rect2).has_point(s.position):
				_press = s.index; _pressIdx = C.i
				(C.lyr as Lyr).nodes[0].extra = Transform2D(0, Vector2(0.98, 0.98), 0, Vector2.ZERO)
				(C.lyr as Lyr).set_dyn((C.lyr as Lyr).nodes[0])
				get_viewport().set_input_as_handled()
				return
		get_viewport().set_input_as_handled()   # kart dışı dokunuş oyuna geçmez (perde)
	elif s.index == _press:
		_press = -1
		get_viewport().set_input_as_handled()
		var C: Dictionary = cards[_pressIdx]
		(C.lyr as Lyr).nodes[0].extra = Transform2D.IDENTITY
		if (C.rect as Rect2).grow(10).has_point(s.position): _pick(_pressIdx)

# ═════════════ SUNAK: karanlık ritüel sahnesi ═════════════

func _show_altar(l: Array) -> void:
	var vs := UIK.ui_size(get_viewport())
	_W = vs.x; _H = vs.y
	_bg = Node2D.new()
	_bg.draw.connect(_draw_bg)
	add_child(_bg)
	var cw := minf(_W - 36.0, 380.0)
	var ch := 128.0
	var gap := 14.0
	var n := mini(3, l.size())
	var top := _H * 0.5 - (n * ch + (n - 1) * gap) * 0.5 + 40.0
	# başlık
	var k := UIText.new()
	k.style(false, 900, 13, 6.0, GOLD, UIK.ink_stroke(1.2, 1.6))
	k.align = 0.5; k.nowrap = true; k.wrap_w = _W; k.size = Vector2(_W, 18)
	k.position = Vector2(0, top - 118)
	k.text = str(opt.get("k", "SUNAK"))
	_bg.add_child(k)
	var t := UIText.new()
	t.style(true, 900, 30, 2.0, Color("#fff1d6"), UIK.ink_stroke(2.0, 3.0))
	t.align = 0.5; t.nowrap = true; t.wrap_w = _W; t.size = Vector2(_W, 40)
	t.position = Vector2(0, top - 96)
	t.text = "BİR BEDEL SEÇ"
	_bg.add_child(t)
	var sub := UIText.new()
	sub.style(false, 700, 12, 1.0, Color(0.85, 0.78, 0.72, 0.85), "")
	sub.align = 0.5; sub.nowrap = true; sub.wrap_w = _W; sub.size = Vector2(_W, 16)
	sub.position = Vector2(0, top - 52)
	sub.text = "Her armağanın bir bedeli var"
	_bg.add_child(sub)
	for i in n:
		var b: Dictionary = l[i]
		var col := Color(str(b.get("col", "#f0c77a")))
		var nd := Node2D.new()
		nd.position = Vector2(_W * 0.5, top + i * (ch + gap) + ch * 0.5)
		var R := Rect2(-cw * 0.5, -ch * 0.5, cw, ch)
		var bid := str(b.get("id", ""))
		nd.draw.connect(func(): _draw_card(nd, R, col, bid))
		add_child(nd)
		var nm := UIText.new()
		nm.style(true, 900, 20, 1.5, col.lerp(Color.WHITE, 0.35), UIK.ink_stroke(1.6, 2.2))
		nm.nowrap = true; nm.wrap_w = cw - 120; nm.size = Vector2(cw - 120, 26)
		nm.position = Vector2(R.position.x + 104, R.position.y + 16)
		nm.text = str(b.get("name", ""))
		nd.add_child(nm)
		var pl := UIText.new()
		pl.style(false, 800, 14, 0.5, Color("#9dffb4"), UIK.ink_stroke(1.2, 1.6))
		pl.nowrap = true; pl.wrap_w = cw - 136; pl.size = Vector2(cw - 136, 36)
		pl.position = Vector2(R.position.x + 124, R.position.y + 52)
		pl.text = str(b.get("plus", ""))
		nd.add_child(pl)
		var mi := UIText.new()
		mi.style(false, 800, 14, 0.5, Color("#ff8a8a"), UIK.ink_stroke(1.2, 1.6))
		mi.nowrap = true; mi.wrap_w = cw - 136; mi.size = Vector2(cw - 136, 36)
		mi.position = Vector2(R.position.x + 124, R.position.y + 88)
		mi.text = str(b.get("minus", ""))
		nd.add_child(mi)
		for tx in [pl, mi]:
			while tx.text_width() > cw - 136 and tx.size_px > 10.0: tx.size_px -= 1.0
		nd.modulate.a = 0.0
		_acards.append({"node": nd, "b": b, "i": i, "R": R, "col": col, "y0": nd.position.y})
	_fx = Node2D.new()
	var add := CanvasItemMaterial.new()
	add.blend_mode = CanvasItemMaterial.BLEND_MODE_ADD
	_fx.material = add
	_fx.draw.connect(_draw_fx)
	add_child(_fx)

func _draw_bg() -> void:
	var B := TriBatch.new()
	B.rect(Rect2(-10, -10, _W + 20, _H + 20), Color(0.03, 0.01, 0.03, 0.86))
	var c := Vector2(_W * 0.5, _H * 0.5)
	B.radial(c, _W * 0.95, Color(0.42, 0.06, 0.08, 0.55), Color(0.1, 0.0, 0.02, 0.0), 1.15, 40)
	B.radial(c + Vector2(0, -_H * 0.28), _W * 0.5, Color(0.9, 0.55, 0.2, 0.18), Color(0.6, 0.2, 0.1, 0.0), 0.6, 30)
	B.flush(_bg)

func _draw_fx() -> void:
	var B := TriBatch.new()
	var c := Vector2(_W * 0.5, _H * 0.5)
	# dönen soluk rün çemberi (arka plan)
	var R := minf(_W, _H) * 0.46
	var rot := _t * 0.15
	for ring in [[R, 3.0, 0.22], [R * 0.86, 2.0, 0.16]]:
		var rr: float = ring[0]
		var w: float = ring[1]
		var n := 72
		for i in n:
			var a0 := rot + TAU * i / n
			var a1 := rot + TAU * (i + 1) / n
			var p0 := c + Vector2(cos(a0), sin(a0)) * rr
			var p1 := c + Vector2(cos(a1), sin(a1)) * rr
			var nn := (p1 - p0).orthogonal().normalized() * w
			B._tri(p0 - nn, p1 - nn, p1 + nn, Color(1, 0.6, 0.3, ring[2]))
			B._tri(p0 - nn, p1 + nn, p0 + nn, Color(1, 0.6, 0.3, ring[2]))
	for i in 16:
		var a := -rot * 1.4 + TAU * i / 16
		var p := c + Vector2(cos(a), sin(a)) * R * 0.93
		B.poly(PackedVector2Array([p + Vector2(0, -6), p + Vector2(4, 0), p + Vector2(0, 6), p + Vector2(-4, 0)]), Color(1, 0.7, 0.35, 0.3))
	# yükselen korlar
	for i in 26:
		var ph := fmod(_t * (0.06 + 0.04 * fmod(i * 0.37, 1.0)) + i * 0.137, 1.0)
		var x := fmod(i * 97.3, _W)
		var y := _H * (1.05 - ph * 1.1)
		var s := 1.5 + 2.0 * fmod(i * 0.61, 1.0)
		B.radial(Vector2(x + sin(_t + i) * 8.0, y), s * 3.0, Color(1, 0.55, 0.2, 0.5 * sin(ph * PI)), Color(1, 0.3, 0.1, 0.0), 1.0, 8)
	# seçim flaşı
	if _pickAt >= 0 and _picked >= 0 and _picked < _acards.size():
		var C: Dictionary = _acards[_picked]
		var k := clampf((_t - _pickAt) / 0.5, 0.0, 1.0)
		var cp: Vector2 = (C.node as Node2D).position
		B.radial(cp, 160.0 + 120.0 * k, Color(C.col, 0.55 * (1.0 - k)), Color(C.col, 0.0), 0.55, 30)
	B.flush(_fx)

func _draw_card(nd: Node2D, R: Rect2, col: Color, bid: String) -> void:
	nd.draw_style_box(ComicSkin.sb(Color(0, 0, 0, 0.5), 18), Rect2(R.position + Vector2(0, 7), R.size))
	nd.draw_style_box(ComicSkin.sb(Color("#1a1220"), 16, 3.0, INK), R)
	nd.draw_style_box(ComicSkin.sb(Color(0, 0, 0, 0), 13, 2.0, Color(col, 0.75)), R.grow(-5))
	# sol amblem
	var ec := Vector2(R.position.x + 56, 0)
	var B := TriBatch.new()
	B.radial(ec, 46, Color(col, 0.35), Color(col, 0.0), 1.0, 24)
	B.flush(nd)
	nd.draw_circle(ec, 34, INK)
	nd.draw_circle(ec, 31, Color("#2a1c30"))
	nd.draw_arc(ec, 31, 0, TAU, 40, col, 2.5, true)
	_emblem(nd, ec, bid, col)
	# artı / eksi rozetleri
	var py := R.position.y + 62
	var my := R.position.y + 98
	nd.draw_circle(Vector2(R.position.x + 112, py), 9, INK)
	nd.draw_circle(Vector2(R.position.x + 112, py), 7.5, Color("#2fae55"))
	nd.draw_rect(Rect2(R.position.x + 108, py - 1.3, 8, 2.6), Color.WHITE)
	nd.draw_rect(Rect2(R.position.x + 110.7, py - 4, 2.6, 8), Color.WHITE)
	nd.draw_circle(Vector2(R.position.x + 112, my), 9, INK)
	nd.draw_circle(Vector2(R.position.x + 112, my), 7.5, Color("#c43a3a"))
	nd.draw_rect(Rect2(R.position.x + 108, my - 1.3, 8, 2.6), Color.WHITE)
	# köşe süsleri
	for sx in [-1.0, 1.0]:
		for sy in [-1.0, 1.0]:
			var p := Vector2(R.get_center().x + sx * (R.size.x * 0.5 - 12), sy * (R.size.y * 0.5 - 12))
			nd.draw_colored_polygon(PackedVector2Array([p + Vector2(0, -5), p + Vector2(5, 0), p + Vector2(0, 5), p + Vector2(-5, 0)]), Color(GOLD, 0.8))

## seçenek amblemi: kan damlası · şifa yaprağı · çapraz kılıç (yoksa yıldız)
func _emblem(nd: Node2D, c: Vector2, bid: String, col: Color) -> void:
	match bid:
		"blood":
			var P := PackedVector2Array()
			for i in 17:
				var a := -0.25 + (PI + 0.5) * i / 16.0
				P.append(c + Vector2(cos(a) * 12, sin(a) * 12 + 5))
			P.append(c + Vector2(0, -19))
			nd.draw_colored_polygon(P, Color("#e8323c"))
			nd.draw_circle(c + Vector2(-4, 4), 3.0, Color(1, 0.7, 0.7, 0.8))
		"spring":
			nd.draw_colored_polygon(PackedVector2Array([c + Vector2(0, -20), c + Vector2(12, -2), c + Vector2(6, 14), c + Vector2(-6, 14), c + Vector2(-12, -2)]), Color("#5fd38a"))
			nd.draw_line(c + Vector2(0, -14), c + Vector2(0, 12), Color("#e8fff0"), 2.0, true)
			nd.draw_circle(c + Vector2(0, 16), 3.5, Color("#9ff2c4"))
		"duel":
			for s2 in [-1.0, 1.0]:
				var a := c + Vector2(-14 * s2, 14)
				var b := c + Vector2(14 * s2, -14)
				nd.draw_line(a, b, Color("#e8e4d8"), 4.0, true)
				var gp := a + (b - a) * 0.24
				var gn := (b - a).orthogonal().normalized() * 6.0
				nd.draw_line(gp - gn, gp + gn, GOLD, 3.0, true)
		_:
			var P2 := PackedVector2Array()
			for i in 10:
				var r := 16.0 if i % 2 == 0 else 7.0
				var a := -PI / 2 + i * PI / 5
				P2.append(c + Vector2(cos(a), sin(a)) * r)
			nd.draw_colored_polygon(P2, col)

func _tick_altar(dt: float) -> void:
	_fx.queue_redraw()
	for C in _acards:
		var nd: Node2D = C.node
		var d: float = 0.25 + C.i * 0.12
		var k := clampf((_t - d) / 0.35, 0.0, 1.0)
		var e := 1.0 - pow(1.0 - k, 3.0)
		if _pickAt < 0:
			nd.modulate.a = e
			nd.position.y = float(C.y0) + (1.0 - e) * 60.0
			var target := 0.97 if _pressIdx == C.i and _press >= 0 else 1.0
			nd.scale = nd.scale.lerp(Vector2.ONE * target, minf(1.0, dt * 20.0))
		else:
			var kp := clampf((_t - _pickAt) / 0.3, 0.0, 1.0)
			if C.i == _picked:
				nd.scale = Vector2.ONE * (1.0 + 0.05 * sin(kp * PI * 0.5))
			else:
				nd.modulate.a = 1.0 - kp * 0.8
				nd.scale = Vector2.ONE * (1.0 - 0.06 * kp)
	if _pickAt >= 0 and _outAt < 0 and _t - _pickAt >= 0.75:
		_outAt = _t
		g.audio.play(str(opt.get("endSnd", "start")))
		var b = list[_picked]
		if cb.is_valid(): cb.call(b)
	if _outAt >= 0:
		var k2 := clampf((_t - _outAt) / 0.38, 0, 1)
		modulate.a = 1.0 - UIK.ez(UIK.EASE, k2)
		if _t - _outAt >= 0.4:
			visible = false
			_alt = false
			_clear()

func _altar_card_at(pos: Vector2) -> int:
	for C in _acards:
		var nd: Node2D = C.node
		var lp: Vector2 = nd.get_global_transform_with_canvas().affine_inverse() * pos
		if (C.R as Rect2).grow(6.0).has_point(lp): return int(C.i)
	return -1

func _altar_input(ev: InputEvent) -> void:
	if not visible or not (ev is InputEventScreenTouch or ev is InputEventScreenDrag): return
	get_viewport().set_input_as_handled()
	if done or _t < 0.5 or not (ev is InputEventScreenTouch): return
	var s := ev as InputEventScreenTouch
	if s.pressed:
		_press = s.index
		_pressIdx = _altar_card_at(s.position)
	elif s.index == _press:
		_press = -1
		var i := _altar_card_at(s.position)
		if i >= 0 and i == _pressIdx:
			done = true
			_picked = i
			_pickAt = _t
			g.audio.play("bless")
		_pressIdx = -1
