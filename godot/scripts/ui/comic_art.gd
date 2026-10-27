class_name ComicArt
extends RefCounted
## Elle çizim çizgi roman illüstrasyonları (vektör, her boyutta keskin): kalın mürekkep kontur +
## ofset mürekkep gölge, iki tonlu dolgu (ışık solda), ince beyaz parıltı. Etkinlik afişleri ve
## ekranlarında hazır ikonlar yerine kullanılır.

const INK := Color(0.05, 0.03, 0.07)

## kapalı çokgen: gölge + kontur + dolgu
static func shape(n: CanvasItem, P: PackedVector2Array, fill: Color, ink := 5.0, drop := Vector2(4, 5)) -> void:
	if drop != Vector2.ZERO:
		var D := PackedVector2Array()
		for p in P: D.append(p + drop)
		n.draw_colored_polygon(D, INK)
	n.draw_colored_polygon(P, fill)
	var Q := P.duplicate()
	Q.append(P[0])
	n.draw_polyline(Q, INK, ink, true)

## yarı gölge: çokgenin x > cx kısmı koyu tonla
static func shade_right(n: CanvasItem, P: PackedVector2Array, cx: float, col: Color) -> void:
	var box := PackedVector2Array([Vector2(cx, -9999), Vector2(9999, -9999), Vector2(9999, 9999), Vector2(cx, 9999)])
	for q in Geometry2D.intersect_polygons(P, box):
		if q.size() >= 3: n.draw_colored_polygon(q, col)

static func _ellipse(c: Vector2, rx: float, ry: float, a0: float, a1: float, seg := 18) -> PackedVector2Array:
	var P := PackedVector2Array()
	for i in seg + 1:
		var a := lerpf(a0, a1, float(i) / seg)
		P.append(c + Vector2(cos(a) * rx, sin(a) * ry))
	return P

## KUPA (merkez c, s = ölçek; ~100*s yüksek)
static func trophy(n: CanvasItem, c: Vector2, s: float, _t := 0.0) -> void:
	var ink := 5.0 * s
	var gold := Color("#ffc83a")
	var dark := Color("#d9861a")
	var X := func(v: Vector2) -> Vector2: return c + v * s
	# kulplar (kasenin arkasında)
	for sx in [-1.0, 1.0]:
		var hc: Vector2 = X.call(Vector2(sx * 40, -26))
		n.draw_arc(hc + Vector2(3, 4) * s, 17 * s, PI * 0.5 if sx < 0 else -PI * 0.5, PI * 1.5 if sx < 0 else PI * 0.5, 16, INK, 13 * s, true)
		n.draw_arc(hc, 17 * s, PI * 0.5 if sx < 0 else -PI * 0.5, PI * 1.5 if sx < 0 else PI * 0.5, 16, INK, 13 * s, true)
		n.draw_arc(hc, 17 * s, PI * 0.5 if sx < 0 else -PI * 0.5, PI * 1.5 if sx < 0 else PI * 0.5, 16, gold if sx < 0 else dark, 6 * s, true)
	# ayak + kaide
	var base := PackedVector2Array([X.call(Vector2(-26, 32)), X.call(Vector2(26, 32)), X.call(Vector2(32, 46)), X.call(Vector2(-32, 46))])
	shape(n, base, gold, ink, Vector2(4, 5) * s)
	shade_right(n, base, c.x + 6 * s, dark)
	var plinth := PackedVector2Array([X.call(Vector2(-38, 46)), X.call(Vector2(38, 46)), X.call(Vector2(38, 58)), X.call(Vector2(-38, 58))])
	shape(n, plinth, Color("#5a2a1a"), ink, Vector2(4, 5) * s)
	var stem := PackedVector2Array([X.call(Vector2(-8, 10)), X.call(Vector2(8, 10)), X.call(Vector2(11, 32)), X.call(Vector2(-11, 32))])
	shape(n, stem, gold, ink, Vector2.ZERO)
	shade_right(n, stem, c.x + 2 * s, dark)
	# kase
	var bowl := _ellipse(c + Vector2(0, -46) * s, 42 * s, 58 * s, 0.0, PI, 24)
	shape(n, bowl, gold, ink, Vector2(4, 5) * s)
	shade_right(n, bowl, c.x + 14 * s, dark)
	# ağız (üst elips)
	var rim := _ellipse(c + Vector2(0, -46) * s, 42 * s, 9 * s, 0.0, TAU, 28)
	n.draw_colored_polygon(rim, Color("#a8580e"))
	rim.append(rim[0])
	n.draw_polyline(rim, INK, ink * 0.8, true)
	# parıltı
	n.draw_line(X.call(Vector2(-30, -32)), X.call(Vector2(-22, -6)), Color(1, 1, 1, 0.75), 5 * s, true)
	n.draw_circle(X.call(Vector2(-33, -38)), 2.6 * s, Color(1, 1, 1, 0.8))
	# kızıl yıldız amblem
	ScrCeremony._star(n, X.call(Vector2(4, -20)), 14 * s, 6.5 * s, 5, Color("#e8322c"), 2.5 * s)

## KULE ikonu (merkez c, s = ölçek; ~170*s yüksek). t: bayrak dalgası
static func tower(n: CanvasItem, c: Vector2, s: float, t := 0.0) -> void:
	var ink := 5.0 * s
	var X := func(v: Vector2) -> Vector2: return c + v * s
	var stone := Color("#6a5878")
	var stone_d := Color("#4a3c58")
	# kaya zemin
	var rock := PackedVector2Array([X.call(Vector2(-52, 70)), X.call(Vector2(-30, 58)), X.call(Vector2(30, 56)), X.call(Vector2(56, 72)), X.call(Vector2(40, 84)), X.call(Vector2(-44, 84))])
	shape(n, rock, Color("#3a2a3a"), ink, Vector2(3, 4) * s)
	# gövde
	var body := PackedVector2Array([X.call(Vector2(-26, -40)), X.call(Vector2(26, -40)), X.call(Vector2(34, 64)), X.call(Vector2(-34, 64))])
	shape(n, body, stone, ink, Vector2(4, 5) * s)
	shade_right(n, body, c.x + 8 * s, stone_d)
	# tuğla çizgileri
	for i in 8:
		var y := -28.0 + i * 12.0
		var w := 26.0 + (y + 40.0) / 104.0 * 8.0
		n.draw_line(X.call(Vector2(-w + 3, y)), X.call(Vector2(w - 3, y)), Color(0, 0, 0, 0.35), 2.0 * s)
		var off := 0.0 if i % 2 == 0 else 9.0
		var bx := -w + 8.0 + off
		while bx < w - 4.0:
			n.draw_line(X.call(Vector2(bx, y)), X.call(Vector2(bx, y + 12)), Color(0, 0, 0, 0.25), 2.0 * s)
			bx += 18.0
	# mazgal (dişli üst)
	var bt := PackedVector2Array([X.call(Vector2(-34, -40)), X.call(Vector2(34, -40)), X.call(Vector2(34, -52)), X.call(Vector2(22, -52)), X.call(Vector2(22, -46)), X.call(Vector2(8, -46)), X.call(Vector2(8, -52)), X.call(Vector2(-8, -52)), X.call(Vector2(-8, -46)), X.call(Vector2(-22, -46)), X.call(Vector2(-22, -52)), X.call(Vector2(-34, -52))])
	shape(n, bt, stone, ink, Vector2(3, 4) * s)
	shade_right(n, bt, c.x + 10 * s, stone_d)
	# sivri çatı
	var roof := PackedVector2Array([X.call(Vector2(-30, -52)), X.call(Vector2(0, -104)), X.call(Vector2(30, -52))])
	shape(n, roof, Color("#d02a34"), ink, Vector2(3, 4) * s)
	shade_right(n, roof, c.x + 1 * s, Color("#8e1420"))
	# bayrak
	var top: Vector2 = X.call(Vector2(0, -104))
	n.draw_line(top, X.call(Vector2(0, -130)), INK, 4 * s, true)
	var fl := PackedVector2Array()
	for i in 7:
		var u := i / 6.0
		fl.append(X.call(Vector2(2 + u * 30, -130 + sin(t * 5.0 + u * 3.0) * 3.0 * u)))
	for i in range(6, -1, -1):
		var u := i / 6.0
		fl.append(X.call(Vector2(2 + u * 30, -118 + sin(t * 5.0 + u * 3.0) * 3.0 * u - u * 4.0)))
	shape(n, fl, Color("#ffd23a"), 3.5 * s, Vector2(2, 3) * s)
	# pencereler (kemerli, sıcak ışık)
	for wy in [-24.0, 18.0]:
		var win := PackedVector2Array([X.call(Vector2(-8, wy + 14)), X.call(Vector2(-8, wy))])
		win.append_array(_ellipse(c + Vector2(0, wy) * s, 8 * s, 9 * s, PI, TAU, 10))
		win.append(X.call(Vector2(8, wy + 14)))
		var fk := 0.85 + 0.15 * sin(t * 7.0 + wy)
		shape(n, win, Color(1.0, 0.78 * fk, 0.25 * fk), 3.5 * s, Vector2.ZERO)
	n.draw_line(X.call(Vector2(-22, -36)), X.call(Vector2(-28, 56)), Color(1, 1, 1, 0.22), 3 * s, true)
