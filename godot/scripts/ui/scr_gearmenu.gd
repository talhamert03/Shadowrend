class_name ScrGearMenu
extends Scr
## Çantada eşya kartına dokununca kartın yanında açılan eylem menüsü (kart içine düğme
## sıkıştırmak yerine): YÜKSELT (koşul varsa, bedelli) · KULLAN/ÇIKAR · GELİŞTİR (+N) · İNCELE.
## Boşluğa dokununca kapanır. Yazı: Bangers + mürekkep (ana menüyle aynı).

const INK := Color(0.05, 0.03, 0.07)
const BTN_H := 46.0
const GAP := 7.0
const W := 172.0

var page          # ArmoryPage
var id := ""
var cv: Node2D
var _anchor := Rect2()     # kart dikdörtgeni (bu düğümün yerelinde)
var _hits: Array = []
var _downPos := Vector2.ZERO
var _t0 := 0.0
var _tick: Tween

func _init(game) -> void:
	super(game)
	name = "GearMenu"
	visible = false
	cv = Node2D.new()
	add_child(cv)
	cv.draw.connect(_paint)

## canvas_rect: kartın tuval (canvas) koordinatlarındaki dikdörtgeni
func open_for(p, gid: String, canvas_rect: Rect2) -> void:
	page = p
	id = gid
	var inv := cv.get_global_transform_with_canvas().affine_inverse()
	_anchor = Rect2(inv * canvas_rect.position, (inv.basis_xform(canvas_rect.size)).abs())
	_t0 = Time.get_ticks_msec() / 1000.0
	visible = true
	modulate.a = 1.0
	if _tick and _tick.is_valid(): _tick.kill()
	_tick = create_tween().set_loops()
	_tick.tween_callback(func(): if visible: cv.queue_redraw()).set_delay(0.033)
	cv.queue_redraw()

func _acts() -> Array:
	var out := []
	if g.can_upgrade_gear(id):
		out.append({"l": "YÜKSELT", "c": Color("#3fb05a"), "cost": int(g.gold_for_next_gear(id)), "cb": func(): _do("up")})
	if g.is_equipped(id):
		out.append({"l": "ÇIKAR", "c": Color("#d8453c"), "cb": func(): _do("out")})
	elif g.can_wear(id):
		out.append({"l": "KULLAN", "c": Color("#e8b73a"), "dark": true, "cb": func(): _do("use")})
	var pl: int = g.gear_plus(id)
	out.append({"l": "GELİŞTİR", "c": Color("#e0832a"), "plus": pl, "cb": func(): _do("forge")})
	out.append({"l": "İNCELE", "c": Color("#3a8fe0"), "cb": func(): _do("info")})
	return out

func _paint() -> void:
	_hits.clear()
	if id == "": return
	var vs := UIK.ui_size(get_viewport())
	var acts := _acts()
	var h := acts.size() * BTN_H + (acts.size() - 1) * GAP + 20.0
	# kartın sağına, sığmazsa soluna; dikeyde kart ortasına hizalı, ekrana sığdırılır
	var x := _anchor.end.x + 10.0
	var side := 1
	if x + W > vs.x - 8.0:
		x = _anchor.position.x - 10.0 - W
		side = -1
	var y := clampf(_anchor.get_center().y - h * 0.5, 70.0, vs.y - 96.0 - h)
	var k := minf(1.0, (Time.get_ticks_msec() / 1000.0 - _t0) / 0.14)
	var e := 1.0 - pow(1.0 - k, 3.0)
	var R := Rect2(Vector2(x, y), Vector2(W, h))
	cv.draw_set_transform(R.get_center(), 0.0, Vector2.ONE * (0.85 + 0.15 * e))
	R.position -= R.get_center()
	# panel + ok
	var tipY := clampf(_anchor.get_center().y - (y + h * 0.5), -h * 0.5 + 18.0, h * 0.5 - 18.0)
	var bx := R.position.x if side == 1 else R.end.x
	var tri := PackedVector2Array([Vector2(bx, tipY - 10), Vector2(bx - 10.0 * side, tipY), Vector2(bx, tipY + 10)])
	cv.draw_style_box(ComicSkin.sb(Color(0, 0, 0, 0.55), 18), Rect2(R.position + Vector2(0, 6), R.size))
	cv.draw_colored_polygon(PackedVector2Array([tri[0] + Vector2(-3.0 * side, -3), tri[1] + Vector2(-4.0 * side, 0), tri[2] + Vector2(-3.0 * side, 3)]), INK)
	cv.draw_style_box(ComicSkin.sb(Color("#1b1219"), 16, 3.0, INK), R)
	cv.draw_colored_polygon(tri, Color("#1b1219"))
	for i in acts.size():
		var a: Dictionary = acts[i]
		var br := Rect2(R.position + Vector2(10, 10 + i * (BTN_H + GAP)), Vector2(W - 20, BTN_H))
		_btn(br, a)
		var cb: Callable = a.cb
		# isabet kutusu ekran yerelinde (ölçek animasyonu bitmiş hâline göre)
		_hits.append({"r": Rect2(br.position + Vector2(x, y) + Vector2(W, h) * 0.5, br.size), "cb": cb})
	cv.draw_set_transform(Vector2.ZERO, 0.0, Vector2.ONE)

func _btn(r: Rect2, a: Dictionary) -> void:
	var c: Color = a.c
	cv.draw_style_box(ComicSkin.sb(INK, 13), Rect2(r.position + Vector2(0, 4), r.size))
	cv.draw_style_box(ComicSkin.sb(c.darkened(0.28), 13, 2.5, INK), r)
	cv.draw_style_box(ComicSkin.sb(c.lightened(0.06), 11), Rect2(r.position + Vector2(3, 3), Vector2(r.size.x - 6, r.size.y * 0.5)))
	var f := UIK.font(false, 1000)
	var tc := INK if a.get("dark", false) else Color.WHITE
	var lbl: String = a.l
	var sz := 22
	if a.has("cost"):
		var cs := JS.s(a.cost)
		var lw := f.get_string_size(lbl, HORIZONTAL_ALIGNMENT_LEFT, -1, sz).x
		var cw := f.get_string_size(cs, HORIZONTAL_ALIGNMENT_LEFT, -1, 17).x
		var tot := lw + 10 + 16 + cw
		var x0 := r.get_center().x - tot * 0.5
		var by := r.get_center().y + 8
		_bang(f, Vector2(x0, by), lbl, sz, tc)
		var cc := Vector2(x0 + lw + 10 + 7, by - 7)
		cv.draw_circle(cc, 7.5, INK)
		cv.draw_circle(cc, 6.2, Color("#e7a62c"))
		cv.draw_circle(cc + Vector2(-1, -1), 3.8, Color("#ffd86a"))
		_bang(f, Vector2(x0 + lw + 10 + 16, by), cs, 17, Color("#fff1c9"))
	else:
		_bang(f, Vector2(r.position.x, r.get_center().y + 8), lbl, sz, tc, r.size.x)
	if int(a.get("plus", 0)) > 0:
		var hc := Vector2(r.end.x - 4, r.position.y + 4)
		var pts := PackedVector2Array()
		var po := PackedVector2Array()
		for i in 6:
			pts.append(hc + Vector2.from_angle(PI / 6 + i * PI / 3) * 12.0)
			po.append(hc + Vector2.from_angle(PI / 6 + i * PI / 3) * 15.0)
		cv.draw_colored_polygon(po, INK)
		cv.draw_colored_polygon(pts, Color("#ffb23a").lerp(Color("#ff5a1e"), int(a.plus) / 7.0))
		_bang(f, Vector2(hc.x - 15, hc.y + 6), "+" + str(a.plus), 15, Color.WHITE, 30, 2)

func _bang(f: Font, p: Vector2, s: String, sz: int, col: Color, w := 0.0, stroke := 3) -> void:
	var al := HORIZONTAL_ALIGNMENT_CENTER if w > 0 else HORIZONTAL_ALIGNMENT_LEFT
	var ww := w if w > 0 else -1.0
	if col != INK:
		cv.draw_string_outline(f, p + Vector2(0, 2), s, al, ww, sz, stroke, INK)
		cv.draw_string_outline(f, p, s, al, ww, sz, stroke, INK)
	cv.draw_string(f, p, s, al, ww, sz, col)

func _do(k: String) -> void:
	var gid := id
	var pg = page
	close()
	match k:
		"up": pg._upgrade(gid)
		"use": pg._equip(gid)
		"out":
			g.audio.play("click")
			pg.sel_id = ""
			g.toggle_equip(gid)
		"forge":
			g.audio.play("click")
			g.ui.open_gear_detail(gid, "forge")
		"info":
			g.audio.play("click")
			g.ui.open_gear_detail(gid)

func _input(ev: InputEvent) -> void:
	if not visible: return
	if ev is InputEventScreenDrag or ev is InputEventMouse:
		get_viewport().set_input_as_handled()
		return
	if not (ev is InputEventScreenTouch): return
	get_viewport().set_input_as_handled()
	var st := ev as InputEventScreenTouch
	var lp: Vector2 = cv.get_global_transform_with_canvas().affine_inverse() * st.position
	if st.pressed:
		_downPos = lp
		return
	if lp.distance_to(_downPos) > 14.0: return
	for h in _hits:
		if (h.r as Rect2).grow(3).has_point(lp):
			(h.cb as Callable).call()
			return
	# boşluk: kapat (seçimi de kaldır)
	g.audio.play("click")
	if page and page.sel_id == id:
		var old: String = page.sel_id
		page.sel_id = ""
		page._rebuild_card(old)
	close()

func close() -> void:
	visible = false
	id = ""
	if _tick and _tick.is_valid(): _tick.kill()
	_tick = null
