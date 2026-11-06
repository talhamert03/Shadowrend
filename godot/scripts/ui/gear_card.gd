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

const _GLOW_SHD := preload("res://shaders/ui/gear_glow.gdshader")

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
		sp.scale = Vector2.ONE * (66.0 / maxf(tex.get_width(), tex.get_height()))
		sp.position = ic
		if not locked:
			var gm := ShaderMaterial.new()
			gm.shader = _GLOW_SHD
			gm.set_shader_parameter("glow", Color(col.lightened(0.55), 0.95))
			sp.material = gm
		if locked: sp.modulate = Color(0.08, 0.06, 0.1, 0.55)
		elif not info.wear: sp.modulate = Color(0.94, 0.94, 0.94)
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
	# nadirlik parıltısı (Nadir ve üstü; bulunamayan kartta yok)
	if not locked:
		var rk2: int = info.rk
		var tier := 0 if rk2 <= 2 else (1 if rk2 == 3 else (2 if rk2 == 4 else 3))
		rarity_glow(parent, sz, 11.0, ScrCeremony.rank_col(ChestSystem.rk(int(x.rarity))), tier, not info.wear)
	# seçili: tepsi düğmeleri
	for a in info.acts:
		var r: Rect2 = a[0]
		var lbl: String = a[1]
		var bc: Color = a[2]
		var bn := Node2D.new()
		bn.draw.connect(func(): _draw_pill(bn, r, bc))
		parent.add_child(bn)
		var fz := 16.0 if r.size.y >= 32 else 13.0
		var tc := INK if bc == YEL else Color.WHITE
		var tsh := "" if bc == YEL else UIK.ink_stroke(1.2, 1.4)
		var tt := _txt(parent, lbl, fz, tc, 1.0, Vector2(r.position.x, r.position.y + (r.size.y - fz * 1.25) * 0.5), r.size.x, tsh)
		# dar düğmede (yan yana iki düğme) yazı sığana kadar küçülür
		var gd := 0
		while tt.text_width() > r.size.x - 8.0 and fz > 8.0 and gd < 8:
			fz -= 1.0
			gd += 1
			tt.style(false, 1000, fz, 0.4, tc, tsh)
			tt.position.y = r.position.y + (r.size.y - fz * 1.25) * 0.5

## nadirlik parıltısı (kart çerçevesinde dolaşan ışık + hale + yıldızcıklar; görseli kapatmaz)
## tier: 1 nadir (hale + kontur), 2 epik (+1 dolaşan ışık, 3 yıldız), 3 efsanevi (+2 ışık, 6 yıldız)
static var _glowSh: Shader
static func rarity_glow(parent: Node, sz: Vector2, radius: float, col: Color, tier: int, dim := false) -> ColorRect:
	if tier <= 0: return null
	if _glowSh == null: _glowSh = load("res://shaders/ui/rarity_glow.gdshader")
	var pad := 16.0
	var r := ColorRect.new()
	r.mouse_filter = Control.MOUSE_FILTER_IGNORE
	r.position = -Vector2(pad, pad)
	r.size = sz + Vector2(pad, pad) * 2.0
	var m := ShaderMaterial.new()
	m.shader = _glowSh
	m.set_shader_parameter("box", sz)
	m.set_shader_parameter("pad", pad)
	m.set_shader_parameter("radius", radius)
	m.set_shader_parameter("col", col.lightened(0.15))
	m.set_shader_parameter("level", ([0.0, 0.55, 0.8, 1.0][tier]) * (0.45 if dim else 1.0))
	m.set_shader_parameter("comets", [0.0, 0.0, 1.0, 2.0][tier])
	m.set_shader_parameter("sparks", [0.0, 0.0, 3.0, 6.0][tier])
	m.set_shader_parameter("speed", [0.0, 0.0, 0.2, 0.26][tier])
	m.set_shader_parameter("seed", randf())
	r.material = m
	parent.add_child(r)
	return r

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

## kart gövdesi tek üçgen ağında (TriBatch): eskiden her daire/ışın/kutu ayrı çizim çağrısıydı
## (kart başına ~115 çağrı, çanta ~800) ve uyumluluk çizicisinde dokunuşlarda kare düşürüyordu.
## Dış kenarlara 1 px saydamlaşan kuşak eklenir (kenar yumuşatma — görüntü eskisiyle aynı).
static func _draw_body(n: Node2D, w: float, h: float, col: Color, ic: Vector2, info: Dictionary) -> void:
	var B := TriBatch.new()
	var rr := Rect2(0, 0, w, h)
	var locked: bool = info.locked
	var sel: bool = info.sel
	var dark := col.darkened(0.5)
	var lite := col.lightened(0.35)
	if sel: fill_rr(B, rr.grow(5), 16, Color(YEL, 0.35))
	fill_rr(B, Rect2(Vector2(3, 5), rr.size), 11, INK)
	fill_rr(B, rr, 11, col)
	var box := PackedVector2Array([Vector2(3, 3), Vector2(w - 3, 3), Vector2(w - 3, h - 3), Vector2(3, h - 3)])
	var rc := Color(lite, 0.22 if locked else 0.5)
	for i in 14:
		var a := i * TAU / 14.0
		var tri := PackedVector2Array([ic, ic + Vector2(cos(a - 0.12), sin(a - 0.12)) * w * 1.4, ic + Vector2(cos(a + 0.12), sin(a + 0.12)) * w * 1.4])
		for q in Geometry2D.intersect_polygons(tri, box):
			if q.size() >= 3: B.poly(q, rc)
	# yarım ton (alt)
	var hc := Color(dark, 0.4)
	for yy in 7:
		for xx in 12:
			var p := Vector2(6 + xx * 9.0 + (4.5 if yy % 2 else 0.0), 96 + yy * 9.0)
			if p.x < w - 5 and p.y < h - 5: B.circle(p, 0.6 + yy * 0.32, hc, 6 if yy < 3 else 8)
	# madalyon
	var mr := 36.0
	disc(B, ic + Vector2(3, 4), mr, INK)
	disc(B, ic, mr, INK)
	# koyu, nadirlik renginde madalyon: boyalı ekipman görseli beyaz zemin üstünde solmasın
	if locked:
		disc(B, ic, mr - 4, Color("#3c3646"))
	else:
		# kenardan merkeze aydınlanan koyu zemin: görsel öne çıkar, renkleri net okunur
		var mbase := Color("#120d18")
		disc(B, ic, mr - 4, mbase.lerp(col, 0.14))
		disc(B, ic + Vector2(0, -2), mr - 10, mbase.lerp(col, 0.22))
		disc(B, ic + Vector2(0, -3), mr - 17, mbase.lerp(col, 0.3))
		disc(B, ic + Vector2(0, -4), mr - 24, Color(mbase.lerp(col, 0.4), 0.7))
		arc(B, ic, mr - 4, PI * 1.12, PI * 1.88, 2.5, Color(col.lightened(0.3), 0.55))
	# ad şeridi
	B.poly(PackedVector2Array([Vector2(2, 99), Vector2(w - 2, 96), Vector2(w - 2, 118), Vector2(2, 120)]), Color(INK, 0.85))
	# nadirlik elmasları
	var rk: int = info.rk
	for j in 5:
		var q := Vector2(w * 0.5 + (j - 2) * 11.0, 128)
		B.poly(PackedVector2Array([q + Vector2(0, -5.5), q + Vector2(5.5, 0), q + Vector2(0, 5.5), q + Vector2(-5.5, 0)]), INK)
		var on := j < rk
		B.poly(PackedVector2Array([q + Vector2(0, -3), q + Vector2(3, 0), q + Vector2(0, 3), q + Vector2(-3, 0)]), (Color.WHITE if on else Color("#3a3444")) if not locked else Color("#5a5060"))
	# ilerleme çubuğu
	if not locked:
		var br := Rect2(7, h - 21, w - 14, 15)
		fill_rr(B, br, 7, INK)
		fill_rr(B, br.grow(-2), 5, Color("#241d2c"), false)
		var need = info.need
		var k := 1.0 if need == null else clampf(float(info.cards) / maxf(1.0, float(need)), 0.0, 1.0)
		if k > 0.02:
			var fc := YEL if need == null or k >= 1.0 else GREEN
			fill_rr(B, Rect2(br.position + Vector2(2, 2), Vector2(maxf(10.0, (br.size.x - 4) * k), br.size.y - 4)), 5, fc)
			B.rect(Rect2(br.position + Vector2(6, 3.5), Vector2(maxf(2.0, (br.size.x - 4) * k - 8), 2)), Color(1, 1, 1, 0.45))
	# dış kontur
	ring_rr(B, rr, 11, 4, YEL if sel else INK)
	if sel: ring_rr(B, rr.grow(2), 14, 2, INK)
	if info.on and not sel: ring_rr(B, rr.grow(-4), 9, 2, GREEN.lightened(0.2))
	B.flush(n)

# ── TriBatch şekil yardımcıları (kenar yumuşatma kuşaklı) ──

static func rr_pts(r: Rect2, rad: float, seg := 6) -> PackedVector2Array:
	var P := PackedVector2Array()
	rad = clampf(rad, 0.0, minf(r.size.x, r.size.y) * 0.5)
	var cs := [Vector2(r.end.x - rad, r.position.y + rad), Vector2(r.end.x - rad, r.end.y - rad), Vector2(r.position.x + rad, r.end.y - rad), Vector2(r.position.x + rad, r.position.y + rad)]
	for ci in 4:
		var a0 := -PI * 0.5 + ci * PI * 0.5
		for i in seg + 1:
			var a := a0 + PI * 0.5 * i / seg
			P.append(cs[ci] + Vector2(cos(a), sin(a)) * rad)
	return P

static func _strip(B: TriBatch, A: PackedVector2Array, Bv: PackedVector2Array, ca: Color, cb: Color) -> void:
	var n := A.size()
	for i in n:
		var j := (i + 1) % n
		B.V.append(A[i]); B.V.append(A[j]); B.V.append(Bv[j])
		B.C.append(ca); B.C.append(ca); B.C.append(cb)
		B.V.append(A[i]); B.V.append(Bv[j]); B.V.append(Bv[i])
		B.C.append(ca); B.C.append(cb); B.C.append(cb)

static func fill_rr(B: TriBatch, r: Rect2, rad: float, c: Color, aa := true) -> void:
	var P := rr_pts(r, rad)
	B.fan(r.get_center(), P, c)
	if aa: _strip(B, P, rr_pts(r.grow(1.0), rad + 1.0), c, Color(c, 0.0))

static func ring_rr(B: TriBatch, r: Rect2, rad: float, wd: float, c: Color) -> void:
	var O := rr_pts(r, rad)
	var I := rr_pts(r.grow(-wd), maxf(0.0, rad - wd))
	_strip(B, O, I, c, c)
	_strip(B, rr_pts(r.grow(1.0), rad + 1.0), O, Color(c, 0.0), c)
	_strip(B, I, rr_pts(r.grow(-wd - 1.0), maxf(0.0, rad - wd - 1.0)), c, Color(c, 0.0))

static func disc(B: TriBatch, c: Vector2, r: float, col: Color) -> void:
	var seg := clampi(int(r * 1.2), 12, 48)
	var P := PackedVector2Array()
	var Q := PackedVector2Array()
	for i in seg:
		var u := Vector2.from_angle(i * TAU / seg)
		P.append(c + u * r)
		Q.append(c + u * (r + 1.0))
	B.fan(c, P, col)
	_strip(B, P, Q, col, Color(col, 0.0))

static func arc(B: TriBatch, c: Vector2, r: float, a0: float, a1: float, wd: float, col: Color, seg := 18) -> void:
	for i in seg:
		var u0 := Vector2.from_angle(lerpf(a0, a1, float(i) / seg))
		var u1 := Vector2.from_angle(lerpf(a0, a1, float(i + 1) / seg))
		var p0 := c + u0 * (r - wd * 0.5)
		var p1 := c + u1 * (r - wd * 0.5)
		var q0 := c + u0 * (r + wd * 0.5)
		var q1 := c + u1 * (r + wd * 0.5)
		B.V.append_array(PackedVector2Array([p0, p1, q1, p0, q1, q0]))
		for k in 6: B.C.append(col)

static func _draw_badge(n: Node2D, kind: String) -> void:
	match kind:
		"on":
			var B := TriBatch.new()
			disc(B, Vector2(1.5, 2), 11, INK)
			disc(B, Vector2.ZERO, 11, INK)
			disc(B, Vector2.ZERO, 8.5, GREEN)
			B.flush(n)
			n.draw_polyline(PackedVector2Array([Vector2(-4.5, 0), Vector2(-1, 3.5), Vector2(5, -3.5)]), Color.WHITE, 3.0, true)
		"ready":
			ScrCeremony._star(n, Vector2.ZERO, 13, 9, 9, YEL, 2.0)
			n.draw_colored_polygon(PackedVector2Array([Vector2(0, -7), Vector2(6, 0), Vector2(2, 0), Vector2(2, 6), Vector2(-2, 6), Vector2(-2, 0), Vector2(-6, 0)]), INK)
		"up":
			var B := TriBatch.new()
			disc(B, Vector2(1.5, 2), 10, INK)
			disc(B, Vector2.ZERO, 10, INK)
			disc(B, Vector2.ZERO, 7.5, GREEN)
			B.poly(PackedVector2Array([Vector2(0, -5.5), Vector2(5, 1), Vector2(-5, 1)]), Color.WHITE)
			B.rect(Rect2(-2, 0, 4, 5), Color.WHITE)
			B.flush(n)

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
