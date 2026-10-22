class_name GearCard
extends RefCounted
## KUŞANIM çantası ekipman kartı (Borderlands çizgi roman dili; sandık kartlarıyla aynı aile):
## nadirlik renginde gövde + aksiyon ışınları + yarım ton, beyaz madalyonda eşya çizimi,
## eğik "SV n" bandı, siyah ad şeridi, elmas nadirlik noktaları, mürekkep konturlu ilerleme
## çubuğu; kuşanılı ✓ rozeti, yükseltmeye hazır / daha güçlü okları. Seçili kart sarı
## halkayla parlar ve KUŞAN / ÇIKAR / İNCELE düğmelerini (yakalanan tepsi alanlarında) çizer.
## Bulunamayan kart: koyu, siluet çizim, "?".

const INK := Color(0.05, 0.03, 0.07)
const YEL := Color("#ffd23a")
const GREEN := Color("#4cbf5e")

static func build(parent: Node2D, sz: Vector2, info: Dictionary, tex: Texture2D) -> void:
	var w := sz.x
	var h := sz.y
	var x: Dictionary = info.x
	var locked: bool = info.locked
	var col := ScrCeremony.rank_col(ChestSystem.rk(int(x.rarity)))
	if locked: col = Color("#3a3444")
	elif not info.wear: col = col.lerp(Color("#6a6472"), 0.55)
	var ic := Vector2(w * 0.5, 50)
	var bg := Node2D.new()
	bg.draw.connect(func(): _draw_body(bg, w, h, col, ic, info))
	parent.add_child(bg)
	# eşya çizimi
	if tex:
		var sp := Sprite2D.new()
		sp.texture = tex
		sp.scale = Vector2.ONE * (60.0 / maxf(tex.get_width(), tex.get_height()))
		sp.position = ic
		if locked: sp.modulate = Color(0.08, 0.06, 0.1, 0.55)
		elif not info.wear: sp.modulate = Color(0.8, 0.8, 0.8)
		parent.add_child(sp)
	if locked:
		var q := _txt(parent, "?", 30, Color("#d8d0e0"), 1.5, Vector2(0, ic.y - 20), w)
		q.modulate.a = 0.8
	# SV bandı
	if not locked:
		var tag := Node2D.new()
		tag.position = Vector2(5, 5)
		tag.rotation = -0.08
		var tl := UIText.new()
		tl.style(false, 1000, 13, 1.0, YEL, "")
		tl.nowrap = true
		tl.text = "SV " + str(info.lv)
		tl.position = Vector2(5, 0)
		tl.size = Vector2(50, 18)
		var tw := tl.text_width() + 10.0
		tag.draw.connect(func(): tag.draw_rect(Rect2(0, 0, tw, 17), INK))
		tag.add_child(tl)
		parent.add_child(tag)
	# ad
	var nm := str(x.name).to_upper() if not locked else "? ? ?"
	var fs := 14.0
	var nt := _txt(parent, nm, fs, Color.WHITE, 0.6, Vector2(0, 99), w, UIK.ink_stroke(1.4, 1.6))
	var guard := 0
	while nt.text_width() > w - 8 and fs > 9.0 and guard < 8:
		fs -= 1.0
		guard += 1
		nt.style(false, 1000, fs, 0.6, Color.WHITE, UIK.ink_stroke(1.4, 1.6))
		nt.position.y = 99 + (14.0 - fs) * 0.5
	# ilerleme çubuğu yazısı
	if not locked:
		var need = info.need
		var maxed: bool = need == null
		var s := "MAKS" if maxed else str(info.cards) + "/" + str(int(need))
		_txt(parent, s, 12, Color.WHITE, 0.6, Vector2(0, h - 22), w, UIK.ink_stroke(1.2, 1.2))
	# rozet: kuşanılı ✓ / hazır ↑ / daha güçlü ▲
	if not locked:
		var bd := Node2D.new()
		bd.position = Vector2(w - 13, 13)
		var kind := ""
		var need2 = info.need
		if info.on: kind = "on"
		elif need2 != null and int(info.cards) >= int(need2): kind = "ready"
		elif info.better: kind = "up"
		if kind != "":
			bd.draw.connect(func(): _draw_badge(bd, kind))
			parent.add_child(bd)
	# seçili: tepsi düğmeleri
	for a in info.acts:
		var r: Rect2 = a[0]
		var lbl: String = a[1]
		var bc: Color = a[2]
		var bn := Node2D.new()
		bn.draw.connect(func(): _draw_pill(bn, r, bc))
		parent.add_child(bn)
		var fz := 16.0 if r.size.y >= 32 else 13.0
		_txt(parent, lbl, fz, INK if bc == YEL else Color.WHITE, 1.0, Vector2(r.position.x, r.position.y + (r.size.y - fz * 1.25) * 0.5), r.size.x, "" if bc == YEL else UIK.ink_stroke(1.2, 1.4))

static func _txt(parent: Node2D, s: String, sz: float, col: Color, ls: float, pos: Vector2, w: float, sh := "") -> UIText:
	var t := UIText.new()
	t.style(false, 1000, sz, ls, col, sh)
	t.align = 0.5
	t.nowrap = true
	t.wrap_w = w
	t.size = Vector2(w, sz * 1.5)
	t.text = s
	t.position = pos
	parent.add_child(t)
	return t

static func _draw_body(n: Node2D, w: float, h: float, col: Color, ic: Vector2, info: Dictionary) -> void:
	var rr := Rect2(0, 0, w, h)
	var locked: bool = info.locked
	var sel: bool = info.sel
	var dark := col.darkened(0.5)
	var lite := col.lightened(0.35)
	if sel:
		# seçili: sarı ışıma halkası
		var gl := StyleBoxFlat.new()
		gl.bg_color = Color(YEL, 0.35)
		gl.set_corner_radius_all(16)
		n.draw_style_box(gl, rr.grow(5))
	var sh := StyleBoxFlat.new()
	sh.bg_color = INK
	sh.set_corner_radius_all(11)
	n.draw_style_box(sh, Rect2(Vector2(3, 5), rr.size))
	var b := StyleBoxFlat.new()
	b.bg_color = col
	b.set_corner_radius_all(11)
	n.draw_style_box(b, rr)
	var box := PackedVector2Array([Vector2(3, 3), Vector2(w - 3, 3), Vector2(w - 3, h - 3), Vector2(3, h - 3)])
	for i in 14:
		var a := i * TAU / 14.0
		var tri := PackedVector2Array([ic, ic + Vector2(cos(a - 0.12), sin(a - 0.12)) * w * 1.4, ic + Vector2(cos(a + 0.12), sin(a + 0.12)) * w * 1.4])
		for q in Geometry2D.intersect_polygons(tri, box):
			if q.size() >= 3: n.draw_colored_polygon(q, Color(lite, 0.22 if locked else 0.5))
	# yarım ton (alt)
	for yy in 7:
		for xx in 12:
			var p := Vector2(6 + xx * 9.0 + (4.5 if yy % 2 else 0.0), 96 + yy * 9.0)
			if p.x < w - 5 and p.y < h - 5: n.draw_circle(p, 0.6 + yy * 0.32, Color(dark, 0.4))
	# madalyon
	var mr := 36.0
	n.draw_circle(ic + Vector2(3, 4), mr, INK)
	n.draw_circle(ic, mr, INK)
	n.draw_circle(ic, mr - 4, Color("#3c3646") if locked else Color("#fffaf0"))
	if not locked:
		n.draw_arc(ic, mr - 4, PI * 0.1, PI * 0.9, 18, Color(col, 0.4), 6.0, true)
		n.draw_circle(ic + Vector2(-13, -15), 5.5, Color(1, 1, 1, 0.9))
	# ad şeridi
	n.draw_colored_polygon(PackedVector2Array([Vector2(2, 99), Vector2(w - 2, 96), Vector2(w - 2, 118), Vector2(2, 120)]), Color(INK, 0.85))
	# nadirlik elmasları
	var rk: int = info.rk
	for j in 5:
		var q := Vector2(w * 0.5 + (j - 2) * 11.0, 128)
		n.draw_colored_polygon(PackedVector2Array([q + Vector2(0, -5.5), q + Vector2(5.5, 0), q + Vector2(0, 5.5), q + Vector2(-5.5, 0)]), INK)
		var on := j < rk
		n.draw_colored_polygon(PackedVector2Array([q + Vector2(0, -3), q + Vector2(3, 0), q + Vector2(0, 3), q + Vector2(-3, 0)]), (Color.WHITE if on else Color("#3a3444")) if not locked else Color("#5a5060"))
	# ilerleme çubuğu
	if not locked:
		var br := Rect2(7, h - 21, w - 14, 15)
		var bs := StyleBoxFlat.new()
		bs.bg_color = Color("#241d2c")
		bs.set_corner_radius_all(7)
		bs.set_border_width_all(2)
		bs.border_color = INK
		n.draw_style_box(bs, br)
		var need = info.need
		var k := 1.0 if need == null else clampf(float(info.cards) / maxf(1.0, float(need)), 0.0, 1.0)
		if k > 0.02:
			var fc := YEL if need == null or k >= 1.0 else GREEN
			var fs := StyleBoxFlat.new()
			fs.bg_color = fc
			fs.set_corner_radius_all(5)
			n.draw_style_box(fs, Rect2(br.position + Vector2(2, 2), Vector2(maxf(10.0, (br.size.x - 4) * k), br.size.y - 4)))
			n.draw_line(br.position + Vector2(6, 4.5), br.position + Vector2(maxf(8.0, (br.size.x - 4) * k - 2), 4.5), Color(1, 1, 1, 0.45), 2.0)
	# dış kontur
	var o := StyleBoxFlat.new()
	o.bg_color = Color(0, 0, 0, 0)
	o.set_corner_radius_all(11)
	o.set_border_width_all(4)
	o.border_color = YEL if sel else INK
	n.draw_style_box(o, rr)
	if sel:
		var o2 := StyleBoxFlat.new()
		o2.bg_color = Color(0, 0, 0, 0)
		o2.set_corner_radius_all(14)
		o2.set_border_width_all(2)
		o2.border_color = INK
		n.draw_style_box(o2, rr.grow(2))
	if info.on and not sel:
		# kuşanılı: yeşil iç kontur
		var o3 := StyleBoxFlat.new()
		o3.bg_color = Color(0, 0, 0, 0)
		o3.set_corner_radius_all(9)
		o3.set_border_width_all(2)
		o3.border_color = GREEN.lightened(0.2)
		n.draw_style_box(o3, rr.grow(-4))

static func _draw_badge(n: Node2D, kind: String) -> void:
	match kind:
		"on":
			n.draw_circle(Vector2(1.5, 2), 11, INK)
			n.draw_circle(Vector2.ZERO, 11, INK)
			n.draw_circle(Vector2.ZERO, 8.5, GREEN)
			n.draw_polyline(PackedVector2Array([Vector2(-4.5, 0), Vector2(-1, 3.5), Vector2(5, -3.5)]), Color.WHITE, 3.0, true)
		"ready":
			ScrCeremony._star(n, Vector2.ZERO, 13, 9, 9, YEL, 2.0)
			n.draw_colored_polygon(PackedVector2Array([Vector2(0, -7), Vector2(6, 0), Vector2(2, 0), Vector2(2, 6), Vector2(-2, 6), Vector2(-2, 0), Vector2(-6, 0)]), INK)
		"up":
			n.draw_circle(Vector2(1.5, 2), 10, INK)
			n.draw_circle(Vector2.ZERO, 10, INK)
			n.draw_circle(Vector2.ZERO, 7.5, GREEN)
			n.draw_colored_polygon(PackedVector2Array([Vector2(0, -5.5), Vector2(5, 1), Vector2(-5, 1)]), Color.WHITE)
			n.draw_rect(Rect2(-2, 0, 4, 5), Color.WHITE)

static func _draw_pill(n: Node2D, r: Rect2, c: Color) -> void:
	var rad := int(r.size.y * 0.5)
	var sh := StyleBoxFlat.new()
	sh.bg_color = INK
	sh.set_corner_radius_all(rad)
	n.draw_style_box(sh, Rect2(r.position + Vector2(2, 3), r.size))
	var b := StyleBoxFlat.new()
	b.bg_color = c
	b.set_corner_radius_all(rad)
	b.set_border_width_all(3)
	b.border_color = INK
	n.draw_style_box(b, r)
	n.draw_line(r.position + Vector2(rad, 6), Vector2(r.end.x - rad, r.position.y + 6), Color(1, 1, 1, 0.45), 2.5)
