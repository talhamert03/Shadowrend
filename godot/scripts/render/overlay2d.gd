class_name Overlay2D
extends Node
## main.js render() 2B üst katmanı (birebir): uçan hasar yazıları · görev
## çıpaları · düşen güçler · saha sandığı madalyonları · görev türü/dünya
## olayı/süper yetenek çizimleri · yön okları · joystick. Katman hiçbir zaman
## ölçeklenmez (dinamik çözünürlük yalnız 3B'yi etkiler) — işaretler hep net.

var game
var layer: CanvasLayer
var holder: Node2D
var ctx: Ctx2D
var _arwLast = null
var _arwK := 0.0
var _arwA = null
var _arwD := 0.0

func _init(g = null) -> void:
	game = g
	name = "Overlay2D"

func _ready() -> void:
	layer = CanvasLayer.new()
	layer.layer = 1
	add_child(layer)
	holder = Node2D.new()
	layer.add_child(holder)
	ctx = Ctx2D.new(holder.get_canvas_item())

func clear() -> void:
	ctx.begin_frame()

func draw_frame() -> void:
	var g = game
	ctx.begin_frame()
	var w: float = g.w
	var h: float = g.h
	ctx.save()
	var xf3 = _cam_affine()
	if xf3 != null:
		# 3B kameranın zemindeki izdüşümü (eğim kısalması + uzaklık): işaretler modellerle çakışır
		var X: Transform2D = xf3
		ctx.set_transform(X.x.x, X.x.y, X.y.x, X.y.y, X.origin.x, X.origin.y)
	elif g.zoomP > 5e-4:
		var z: float = 1 / (1 - g.zoomP)
		ctx.translate(w / 2 + g.shakeX, h / 2 + g.shakeY)
		ctx.scale(z, z)
		ctx.translate(-g.cam.x, -g.cam.y)
	else:
		ctx.translate(round(w / 2 - g.cam.x + g.shakeX), round(h / 2 - g.cam.y + g.shakeY))
	_render_texts()
	_render_objective()
	_render_powerups()
	if g.fieldChests: g.fieldChests.render(ctx)
	if g.state == "playing":
		g.mode.render(ctx)
		g.events.render(ctx)
		g.ult.render(ctx)
		g.vfx.render(g.ult)
		g.mode.arrow(ctx)
		g.events.arrow(ctx)
		_render_objective_arrow()
	# tamponlar her karede boşaltılır (duraklatılmışken de birikmesin)
	g.ult.flush_all(ctx)
	ctx.restore()
	g.input.render(ctx)

## dünya (x, z) → ekran: kamera hedefinde 3B izdüşümün doğrusal karşılığı (FOV dar, kenarda
## sapma birkaç piksel). 3B yoksa null (eski düz eşleme).
func _cam_affine():
	var g = game
	var r3 = g.renderer3d
	if r3 == null or r3.camera == null or not r3.camera.is_inside_tree() or r3.vp == null: return null
	var cam: Camera3D = r3.camera
	var k: float = float(g.w) / maxf(1.0, float(r3.vp.size.x))
	var cx: float = g.cam.x
	var cz: float = g.cam.y
	var p0 := cam.unproject_position(Vector3(cx, 0, cz)) * k
	var px := cam.unproject_position(Vector3(cx + 100.0, 0, cz)) * k
	var pz := cam.unproject_position(Vector3(cx, 0, cz + 100.0)) * k
	var ax := (px - p0) / 100.0
	var az := (pz - p0) / 100.0
	return Transform2D(ax, az, p0 - ax * cx - az * cz)

static var _fontCache := {}
func _font_for(px: int) -> String:
	if not _fontCache.has(px): _fontCache[px] = "700 " + str(px) + "px 'Chakra Petch', sans-serif"
	return _fontCache[px]

func _render_texts() -> void:
	var g = game
	ctx.text_align = "center"
	ctx.text_baseline = "middle"
	ctx.line_join = "round"
	var M := ctx.get_transform()
	var ma := M.x.x
	var mb := M.x.y
	var mc := M.y.x
	var md := M.y.y
	var me := M.origin.x
	var mf := M.origin.y
	ctx.set_stroke("rgba(0,0,0,0.85)")
	var lastFont := ""
	var lastLW := 0.0
	for o in g.pools.texts.active:
		if not g.in_view(o.x, o.y, 40): continue
		var a: float = minf(1.0, o.life / (o.max * 0.35))
		# pop: hızla büyür, taşar, yerine oturur (ease-out-back)
		var pt: float = o.pt / 0.16
		var k: float
		if pt < 1.0:
			k = 1.0 + (o.pk - 1.0) * (1.0 - pt) * (1.0 - pt) + 0.18 * sin(pt * PI) * (1.0 if o.crit else 0.5)
		else:
			k = 1.0
		k *= (0.7 + 0.3 * a)
		ctx.global_alpha = a
		var cr := cos(o.rot)
		var sr := sin(o.rot)
		# metin ekran ölçeğinde (sayılar eğim kısalmasıyla basılmaz); modelin başının üstünde
		var sk: float = absf(ma) * k
		ctx.set_transform(sk * cr, sk * sr, -sk * sr, sk * cr, me + ma * o.x + mc * o.y, mf + mb * o.x + md * o.y - 16.0)
		var f := _font_for(JS.round_js(o.size * (1.12 if o.arc else 1.0)))
		if f != lastFont:
			ctx.set_font(f)
			lastFont = f
		var lw := 5.0 if o.crit else 3.6
		if lw != lastLW:
			ctx.line_width = lw
			lastLW = lw
		ctx.stroke_text(o.str, 0, 0)
		ctx.fill_style = o.color
		ctx.fill_text(o.str, 0, 0)
	ctx.set_transform(ma, mb, mc, md, me, mf)
	ctx.global_alpha = 1

## düşen güçler: yerde parlayan halka + ışık sütunu (3B zemin katmanı) ve üstünde süzülen
## madalyon (koyu taş, renkli ışıklı kenar, vektör ikon: mıknatıs · can · kalkan · kar tanesi)
func _render_powerups() -> void:
	var g = game
	var U: Ultimate = g.ult
	var t: float = g.time
	for o in g.pools.powerups.active:
		if not g.in_view(o.x, o.y, 60): continue
		var d: Dictionary = PowerupManager.PU[o.kind]
		var col := Color(str(d.col))
		var fade := 1.0
		if o.life < 5: fade = 0.45 + 0.55 * absf(sin(t * 6.0))
		var c := Vector2(o.x, o.y)
		# zemin
		U._glow(c, 46.0, col, 0.35 * fade)
		U._gring(c, 26.0 + sin(t * 3.0 + o.bob) * 2.0, 6.0, col, 0.8 * fade, Ultimate.SQ, 28, 1.2)
		U._sparkle(U._GA, c + Vector2(cos(t * 2.0 + o.bob) * 26.0, sin(t * 2.0 + o.bob) * 26.0), 4.0, Color(1, 1, 1, 0.8 * fade), t)
		# süzülen madalyon (yukarıda: ekran yukarısı = dünya -z)
		var bob: float = sin(o.bob + t * 3.2) * 3.0
		var m := c + Vector2(0, -30.0 + bob)
		U._glow(m, 34.0, col, 0.6 * fade, 1.0, U._T)
		U._streak(c + Vector2(0, -6), Vector2(0, -1), 34.0, 10.0, col, 0.35 * fade)
		U._disc(U._M, m, 14.0, Color("#16121c"), fade, 3.0)
		U._ring(U._M, m, 12.5, 3.0, Color(col, fade), 1.0, 28)
		var ic := Color(1, 1, 1, fade)
		match str(o.kind):
			"magnet":
				var P := PackedVector2Array()
				for i in 9:
					var an := PI * i / 8.0
					P.append(m + Vector2(cos(an) * 5.5, sin(an) * 5.5 + 1.0))
				P.insert(0, m + Vector2(5.5, -6.0))
				P.append(m + Vector2(-5.5, -6.0))
				U._thick(U._M, P, 3.2, Color(col.lerp(Color.WHITE, 0.4), fade), false)
				U._thick(U._M, PackedVector2Array([m + Vector2(5.5, -6.5), m + Vector2(5.5, -3.5)]), 3.4, ic, false)
				U._thick(U._M, PackedVector2Array([m + Vector2(-5.5, -6.5), m + Vector2(-5.5, -3.5)]), 3.4, ic, false)
			"heal":
				U._M.rect(Rect2(m.x - 2.2, m.y - 7.0, 4.4, 14.0), Color(col.lerp(Color.WHITE, 0.3), fade))
				U._M.rect(Rect2(m.x - 7.0, m.y - 2.2, 14.0, 4.4), Color(col.lerp(Color.WHITE, 0.3), fade))
			"shield":
				U._M.poly(PackedVector2Array([m + Vector2(-6.5, -6.5), m + Vector2(6.5, -6.5), m + Vector2(6.0, 1.0), m + Vector2(0, 7.5), m + Vector2(-6.0, 1.0)]), Color(col, fade))
				U._M.poly(PackedVector2Array([m + Vector2(-3.5, -4.2), m + Vector2(0, -4.2), m + Vector2(0, 4.5), m + Vector2(-3.4, 0.8)]), Color(1, 1, 1, 0.55 * fade))
			_:
				for k in 3:
					var an := k * PI / 3.0 + 0.3
					var dv := Vector2(cos(an), sin(an)) * 7.0
					U._thick(U._M, PackedVector2Array([m - dv, m + dv]), 2.4, Color(col.lerp(Color.WHITE, 0.5), fade), false)
		U._glow(m + Vector2(-4, -5), 4.0, Color.WHITE, 0.6 * fade, 1.0, U._T)

func _render_objective() -> void:
	var g = game
	var O = g.objectives
	if O == null: return
	var t: float = g.time
	var ph: String = O.phase
	if ph == "waiting":
		var n = O.npc
		if g.in_view(n.x, n.y, 260):
			ctx.text_align = "center"
			ctx.text_baseline = "middle"
			for i in 3:
				var k := fmod(t * 0.9 + i * 0.333, 1.0)
				ctx.global_alpha = (1 - k) * 0.7
				var yy: float = n.y - 96 - k * 46
				ctx.set_stroke("#bfeaff")
				ctx.line_width = 3.4
				ctx.begin_path()
				ctx.move_to(n.x - 13, yy + 9); ctx.line_to(n.x, yy)
				ctx.line_to(n.x + 13, yy + 9)
				ctx.stroke()
			ctx.global_alpha = 1
			if O.near:
				ctx.set_font("800 15px \"Chakra Petch\", monospace")
				ctx.set_fill("rgba(8,12,16,0.7)")
				ctx.fill_rect(n.x - 64, n.y - 168, 128, 24)
				ctx.set_fill("#dff2ff")
				ctx.fill_text("KALKANA GİR", n.x, n.y - 155)
		return
	if ph != "escort": return
	var d = O.dest
	if g.in_view(d.x, d.y, 260):
		var pulse := 0.5 + sin(t * 2.6) * 0.5
		ctx.set_stroke("rgba(127,227,176,0.6)")
		ctx.line_width = 3
		ctx.begin_path(); ctx.arc(d.x, d.y, 130 + pulse * 26, 0, 6.283); ctx.stroke()
		ctx.global_alpha = 0.4
		ctx.begin_path(); ctx.arc(d.x, d.y, 162 + pulse * 40, 0, 6.283); ctx.stroke()
		ctx.global_alpha = 1
	var n = O.npc
	if g.in_view(n.x, n.y, 60):
		var w := 56.0
		var hh := 6.0
		ctx.set_fill("rgba(8,10,12,0.8)")
		ctx.fill_rect(n.x - w / 2, n.y - 78, w, hh)
		var f: float = maxf(0.0, n.hp / n.maxHp)
		ctx.set_fill("#ff3b4e" if f < 0.35 else "#ffd45a")
		ctx.fill_rect(n.x - w / 2 + 1, n.y - 77, (w - 2) * f, hh - 2)
		if n.wait > 0.8:
			ctx.text_align = "center"
			ctx.set_fill(Color(1, 212 / 255.0, 90 / 255.0, 0.45 + sin(t * 8) * 0.35))
			ctx.set_font("700 13px \"Chakra Petch\", monospace")
			ctx.fill_text("BEKLİYOR", n.x, n.y - 92)

func _render_objective_arrow() -> void:
	var g = game
	var O = g.objectives
	var p = g.player
	var t: float = g.time
	var dt := minf(0.1, maxf(0.0, t - (_arwLast if _arwLast != null else t)))
	_arwLast = t
	var tx = O.target_x() if O else null
	var want := 0.0
	var d := 0.0
	if tx != null and p and O.phase == "escort":
		var dx: float = tx - p.x
		var dy: float = O.target_y() - p.y
		d = sqrt(dx * dx + dy * dy)
		want = 1.0 if d > 240 else 0.0
		_arwA = atan2(dy, dx)
		_arwD = d
	_arwK += (want - _arwK) * minf(1, dt * 7)
	if _arwK < 0.02 or _arwA == null or not p: return
	d = _arwD
	var a: float = _arwA
	var k := _arwK
	var prox := 1.0 if d < 1400 else (0.5 if d > 2400 else 1 - 0.5 * (d - 1400) / 1000)
	var col := "#9ff2c4" if O and O.phase == "escort" else "#bfeaff"
	var push := sin(t * 5.4) * 0.5 + 0.5
	var ca := cos(a)
	var sa := sin(a)
	var R := 112 + maxf(0, -sa) * 38 + push * 8
	var oy: float = p.y + 14
	ctx.save()
	ctx.translate(p.x + ca * R, oy + sa * R)
	ctx.rotate(a)
	var sc := 0.72 + 0.28 * k
	ctx.scale(sc, sc)
	ctx.global_alpha = k * prox
	for i in [1, 0]:
		var ox: float = -i * 15.0
		ctx.global_alpha = k * prox * (0.5 if i else 1.0)
		ctx.set_fill("rgba(6,10,14,0.78)")
		ctx.begin_path()
		ctx.move_to(ox + 19, 0); ctx.line_to(ox - 5, 15); ctx.line_to(ox - 11, 10)
		ctx.line_to(ox + 5, 0); ctx.line_to(ox - 11, -10); ctx.line_to(ox - 5, -15)
		ctx.close_path(); ctx.fill()
		ctx.set_fill(col)
		ctx.begin_path()
		ctx.move_to(ox + 15, 0); ctx.line_to(ox - 4.5, 11.5); ctx.line_to(ox - 7.5, 8.2)
		ctx.line_to(ox + 5.6, 0); ctx.line_to(ox - 7.5, -8.2); ctx.line_to(ox - 4.5, -11.5)
		ctx.close_path(); ctx.fill()
	ctx.comp = "lighter"
	ctx.global_alpha = k * prox * (0.18 + push * 0.22)
	ctx.set_fill(col)
	ctx.begin_path(); ctx.arc(4, 0, 17, 0, 6.283); ctx.fill()
	ctx.restore()
	var lx: float = p.x + ca * (R + 34)
	var ly := oy + sa * (R + 34) + 4
	ctx.global_alpha = k * prox
	ctx.text_align = "center"
	ctx.text_baseline = "middle"
	ctx.set_font("800 12px \"Chakra Petch\", monospace")
	ctx.line_width = 3.4
	ctx.set_stroke("rgba(6,10,14,0.85)")
	var txt := str(JS.round_js(d / 10)) + "m"
	ctx.stroke_text(txt, lx, ly)
	ctx.set_fill(col)
	ctx.fill_text(txt, lx, ly)
	ctx.global_alpha = 1
