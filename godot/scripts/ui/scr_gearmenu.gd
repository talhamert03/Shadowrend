class_name ScrGearMenu
extends Scr
## Çantada eşya kartına dokununca kartın yanında açılan eylem menüsü (kart içine düğme
## sıkıştırmak yerine): YÜKSELT (koşul varsa, bedelli) · KULLAN/ÇIKAR · GELİŞTİR (+N) · İNCELE.
## Boşluğa dokununca kapanır. Yazı: Bangers + mürekkep (ana menüyle aynı).

const INK := Color(0.05, 0.03, 0.07)
const BTN_H := 44.0
const GAP := 8.0
const W := 196.0
const HEAD := 34.0
const GOLD := Color("#d9a441")
const RAR := {1: "#aeb6c4", 2: "#58c878", 5: "#5aa9ff", 3: "#b96cff", 4: "#ffb23a"}

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
	# seviye yükseltme her zaman görünür: hazırsa yeşil + bedel; değilse soluk + kart sayacı (dokununca ayrıntı açılır)
	var need = g.cards_for_next_gear(id)
	if g.can_upgrade_gear(id):
		out.append({"l": "YÜKSELT", "c": Color("#3fb05a"), "cost": int(g.gold_for_next_gear(id)), "cb": func(): _do("up")})
	elif need != null:
		out.append({"l": "YÜKSELT", "c": Color("#5a5560"), "note": str(int(g.gear_card_count(id))) + "/" + str(int(need)), "cb": func(): _do("info")})
	else:
		out.append({"l": "AZAMİ SV", "c": Color("#5a5560"), "cb": func(): _do("info")})
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
	var h := HEAD + acts.size() * BTN_H + (acts.size() - 1) * GAP + 26.0
	# kartın sağına, sığmazsa soluna; dikeyde kart ortasına hizalı, ekrana sığdırılır
	var x := _anchor.end.x + 12.0
	var side := 1
	if x + W > vs.x - 8.0:
		x = _anchor.position.x - 12.0 - W
		side = -1
	x = clampf(x, 10.0, vs.x - W - 10.0)      # dar ekranda taşmasın (gerekirse kartın üstüne biner)
	var y := clampf(_anchor.get_center().y - h * 0.5, 70.0, vs.y - 96.0 - h)
	var k := minf(1.0, (Time.get_ticks_msec() / 1000.0 - _t0) / 0.16)
	var e := 1.0 - pow(1.0 - k, 3.0)
	var R := Rect2(Vector2(x, y), Vector2(W, h))
	cv.draw_set_transform(R.get_center(), 0.0, Vector2.ONE * (0.86 + 0.14 * e))
	R.position -= R.get_center()
	var it = g.gear_by_id(id)
	var rc := Color(String(RAR.get(int(it.rarity) if it else 1, "#aeb6c4")))
	# gölge + ok
	var tipY := clampf(_anchor.get_center().y - (y + h * 0.5), -h * 0.5 + 22.0, h * 0.5 - 22.0)
	var bx := R.position.x if side == 1 else R.end.x
	var tri := PackedVector2Array([Vector2(bx, tipY - 11), Vector2(bx - 11.0 * side, tipY), Vector2(bx, tipY + 11)])
	cv.draw_style_box(ComicSkin.sb(Color(0, 0, 0, 0.6), 16), Rect2(R.position + Vector2(0, 7), R.size))
	cv.draw_colored_polygon(PackedVector2Array([tri[0] + Vector2(-4.0 * side, -4), tri[1] + Vector2(-6.0 * side, 0), tri[2] + Vector2(-4.0 * side, 4)]), GOLD.darkened(0.25))
	# gövde: mürekkep → altın çerçeve → koyu mor zemin (üstten alta kararır)
	cv.draw_style_box(ComicSkin.sb(INK, 16), R.grow(3.0))
	cv.draw_style_box(ComicSkin.sb(GOLD.darkened(0.25), 15), R.grow(1.0))
	cv.draw_style_box(ComicSkin.sb(GOLD.lightened(0.15), 14), Rect2(R.position, Vector2(R.size.x, R.size.y * 0.5)))
	var inner := R.grow(-2.5)
	cv.draw_style_box(ComicSkin.sb(Color("#120b17"), 12), inner)
	cv.draw_style_box(ComicSkin.sb(Color("#22152c"), 12), Rect2(inner.position, Vector2(inner.size.x, inner.size.y * 0.45)))
	cv.draw_colored_polygon(tri, Color("#22152c"))
	# köşe elmasları
	for cpt in [inner.position + Vector2(9, 9), Vector2(inner.end.x - 9, inner.position.y + 9), inner.end - Vector2(9, 9), Vector2(inner.position.x + 9, inner.end.y - 9)]:
		cv.draw_colored_polygon(PackedVector2Array([cpt + Vector2(0, -4), cpt + Vector2(4, 0), cpt + Vector2(0, 4), cpt + Vector2(-4, 0)]), GOLD)
	# başlık: eşya adı + nadirlik çizgisi
	var f := UIK.font(false, 1000)
	var nm := str(it.name).to_upper() if it else ""
	var hs := 17
	while hs > 11 and f.get_string_size(nm, HORIZONTAL_ALIGNMENT_LEFT, -1, hs).x > W - 44.0: hs -= 1
	_bang(f, Vector2(R.position.x, R.position.y + 26), nm, hs, rc.lightened(0.25), R.size.x, 3)
	var ly := R.position.y + HEAD + 2.0
	cv.draw_line(Vector2(R.position.x + 22, ly), Vector2(R.end.x - 22, ly), rc.darkened(0.2), 2.0)
	cv.draw_colored_polygon(PackedVector2Array([Vector2(0, ly - 4), Vector2(5, ly), Vector2(0, ly + 4), Vector2(-5, ly)]), rc)
	for i in acts.size():
		var a: Dictionary = acts[i]
		var br := Rect2(R.position + Vector2(13, HEAD + 12 + i * (BTN_H + GAP)), Vector2(W - 26, BTN_H))
		# sırayla beliren düğmeler
		var bk := clampf((k - 0.12 * i) / 0.6, 0.0, 1.0)
		_btn(br, a, 1.0 - pow(1.0 - bk, 3.0))
		var cb: Callable = a.cb
		_hits.append({"r": Rect2(br.position + Vector2(x, y) + Vector2(W, h) * 0.5, br.size), "cb": cb})
	cv.draw_set_transform(Vector2.ZERO, 0.0, Vector2.ONE)

## eğik (çizgi roman) düğme: mürekkep gölge, iki tonlu dolgu, üst parlama, solda simge madalyonu
func _btn(r: Rect2, a: Dictionary, vis := 1.0) -> void:
	if vis <= 0.01: return
	var c: Color = a.c
	var sk := 7.0
	var off := Vector2((1.0 - vis) * 26.0, 0)
	var q := func(rr: Rect2, s2: float) -> PackedVector2Array:
		return PackedVector2Array([rr.position + Vector2(s2, 0) + off, Vector2(rr.end.x, rr.position.y) + off, rr.end - Vector2(s2, 0) + off, Vector2(rr.position.x, rr.end.y) + off])
	var al := vis
	cv.draw_colored_polygon(q.call(Rect2(r.position + Vector2(-2, 3), r.size + Vector2(4, 4)), sk), Color(INK, al))
	cv.draw_polygon(q.call(r, sk), PackedColorArray([Color(c.lightened(0.12), al), Color(c.lightened(0.12), al), Color(c.darkened(0.38), al), Color(c.darkened(0.38), al)]))
	cv.draw_colored_polygon(q.call(Rect2(r.position + Vector2(4, 3), Vector2(r.size.x - 8, r.size.y * 0.36)), sk * 0.4), Color(1, 1, 1, 0.20 * al))
	# alt kenar çizgisi (derinlik)
	cv.draw_line(Vector2(r.position.x + 3, r.end.y - 2.5) + off, Vector2(r.end.x - sk - 2, r.end.y - 2.5) + off, Color(0, 0, 0, 0.32 * al), 2.0)
	# simge madalyonu
	var mc := Vector2(r.position.x + sk + 20.0, r.get_center().y) + off
	cv.draw_circle(mc, 16.0, Color(INK, al))
	cv.draw_circle(mc, 13.6, Color(Color("#1b1219"), al))
	cv.draw_arc(mc, 13.6, 0, TAU, 28, Color(GOLD, al), 1.6)
	_glyph(mc, String(a.l), Color(c.lightened(0.45), al))
	var f := UIK.font(false, 1000)
	var tc := Color(INK, al) if a.get("dark", false) else Color(1, 1, 1, al)
	var lbl: String = a.l
	var tx := r.position.x + sk + 44.0 + off.x
	var by := r.get_center().y + 8
	_bang(f, Vector2(tx, by), lbl, 21, tc)
	if a.has("cost"):
		var cs := JS.s(a.cost)
		var cw := f.get_string_size(cs, HORIZONTAL_ALIGNMENT_LEFT, -1, 15).x
		var cx := r.end.x - 12.0 - cw + off.x
		var cc := Vector2(cx - 10.0, by - 6)
		cv.draw_circle(cc, 7.0, Color(INK, al))
		cv.draw_circle(cc, 5.8, Color(Color("#e7a62c"), al))
		cv.draw_circle(cc + Vector2(-1, -1), 3.4, Color(Color("#ffd86a"), al))
		_bang(f, Vector2(cx, by - 1), cs, 15, Color(Color("#fff1c9"), al))
	if a.has("note"):
		var ns := str(a.note)
		var nw := f.get_string_size(ns, HORIZONTAL_ALIGNMENT_LEFT, -1, 15).x
		_bang(f, Vector2(r.end.x - 14.0 - nw + off.x, by - 1), ns, 15, Color(Color("#ffd98a"), al))
	if int(a.get("plus", 0)) > 0:
		var hc := Vector2(r.end.x - 20.0, r.get_center().y) + off
		var pts := PackedVector2Array()
		var po := PackedVector2Array()
		for i in 6:
			pts.append(hc + Vector2.from_angle(PI / 6 + i * PI / 3) * 12.0)
			po.append(hc + Vector2.from_angle(PI / 6 + i * PI / 3) * 15.0)
		cv.draw_colored_polygon(po, Color(INK, al))
		cv.draw_colored_polygon(pts, Color(Color("#ffb23a").lerp(Color("#ff5a1e"), int(a.plus) / 7.0), al))
		_bang(f, Vector2(hc.x - 15, hc.y + 6), "+" + str(a.plus), 15, Color(1, 1, 1, al), 30, 2)

## düğme simgeleri (ilkel çizim): yükselt ↑ · kullan ✓ · çıkar ✕ · geliştir çekiç · incele büyüteç
func _glyph(c: Vector2, lbl: String, col: Color) -> void:
	match lbl:
		"YÜKSELT", "AZAMİ SV":
			cv.draw_colored_polygon(PackedVector2Array([c + Vector2(0, -8), c + Vector2(8, 1), c + Vector2(3.4, 1), c + Vector2(3.4, 8), c + Vector2(-3.4, 8), c + Vector2(-3.4, 1), c + Vector2(-8, 1)]), col)
		"KULLAN":
			cv.draw_polyline(PackedVector2Array([c + Vector2(-7, 0), c + Vector2(-2, 6), c + Vector2(8, -6)]), col, 3.6)
		"ÇIKAR":
			cv.draw_line(c + Vector2(-6, -6), c + Vector2(6, 6), col, 3.6)
			cv.draw_line(c + Vector2(6, -6), c + Vector2(-6, 6), col, 3.6)
		"GELİŞTİR":
			cv.draw_line(c + Vector2(-6, 7), c + Vector2(3, -2), col, 3.2)
			cv.draw_colored_polygon(PackedVector2Array([c + Vector2(-1, -8), c + Vector2(8, 1), c + Vector2(5, 4), c + Vector2(-4, -5)]), col)
		_:
			cv.draw_arc(c + Vector2(-1.5, -1.5), 5.6, 0, TAU, 20, col, 2.8)
			cv.draw_line(c + Vector2(2.6, 2.6), c + Vector2(8, 8), col, 3.4)

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
