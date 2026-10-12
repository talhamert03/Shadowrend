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
	shell = Lyr.make("bp_altar" if altar else "bp_screen", [".bp2-card"])
	add_child(shell)
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
	if shell: shell.queue_free(); shell = null

func _process(dt: float) -> void:
	if not visible: return
	_t += dt
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
	Input.vibrate_handheld(30)
	var st := shell.find(".bp2-stamp")
	if st: shell.play(st, Lyr.anims_of("bp_chosen", st.d.key))

func _input(ev: InputEvent) -> void:
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
