class_name FxFly
extends Node2D
## ui.js flyCurrency (v74) — satın alım/ödül uçuşu: para parçaları kaynaktan üst çubuktaki
## cüzdana uçar. ① kaynakta parlama + parçalar çevreye SAÇILIR (ease-out) ② kısa asılı kalış
## ③ her biri kendi yayında dönerek ease-in-out ile cüzdana SÜZÜLÜR (~0,9-1,1 sn)
## ④ her varışta cüzdanda halka + sayaç tık (ScrMenu.fly_arrive). Tek _process döngüsü.
## Koordinatlar: bu düğümün (güvenli alan kökü) yerel uzayı.

const N := 12

var icon: Node2D               # yakalanmış ikon (kopya; kökü 0,0'da ortalı)
var col := Color(0.78, 0.61, 1.0)
var src := Vector2.ZERO
var dst := Vector2.ZERO
var on_arrive := Callable()    # (i: int, n: int)
var on_done := Callable()

var _t := 0.0
var _P: Array = []             # {n, bx, by, cx, cy, t0, burst, hold, fly, spin, done}
var _hits: Array = []          # [t0, pos]
var _arrived := 0

func start() -> void:
	for i in N:
		var n := Node2D.new()
		var glow := Sprite2D.new()
		glow.texture = ClimbArt.glow_tex()
		glow.modulate = Color(col, 0.55)
		glow.scale = Vector2.ONE * (42.0 / 128.0)
		var gm := CanvasItemMaterial.new()
		gm.blend_mode = CanvasItemMaterial.BLEND_MODE_ADD
		glow.material = gm
		n.add_child(glow)
		n.add_child(icon.duplicate())
		n.modulate.a = 0.0
		add_child(n)
		var ang := float(i) / N * TAU + (randf() - 0.5) * 0.5
		var r := 40.0 + randf() * 44.0
		var bx := src.x + cos(ang) * r
		var by := src.y + sin(ang) * r * 0.8 - 12.0
		var d := dst - Vector2(bx, by)
		var L := maxf(1.0, d.length())
		var side := (1.0 if i % 2 else -1.0) * (36.0 + randf() * 84.0)
		_P.append({"n": n, "bx": bx, "by": by,
			"cx": (bx + dst.x) / 2.0 - d.y / L * side, "cy": (by + dst.y) / 2.0 + d.x / L * side - 40.0,
			"t0": i * 0.072, "burst": 0.44 + randf() * 0.12, "hold": 0.11 + randf() * 0.09,
			"fly": 0.86 + randf() * 0.24, "spin": deg_to_rad((randf() - 0.5) * 520.0), "done": false})

static func _eout(k: float) -> float: return 1.0 - pow(1.0 - k, 3.0)
static func _eio(k: float) -> float: return 4.0 * k * k * k if k < 0.5 else 1.0 - pow(-2.0 * k + 2.0, 3.0) / 2.0

func _process(dt: float) -> void:
	_t += dt
	var alive := 0
	for p in _P:
		if p.done: continue
		alive += 1
		var lt: float = _t - float(p.t0)
		if lt < 0.0: continue
		var n: Node2D = p.n
		var x: float
		var y: float
		var sc: float
		var rot: float
		var op := 1.0
		if lt < p.burst:
			var k := _eout(lt / p.burst)
			x = src.x + (p.bx - src.x) * k
			y = src.y + (p.by - src.y) * k
			sc = 0.3 + 0.9 * k
			rot = p.spin * 0.3 * k
			op = minf(1.0, lt / 0.14)
		elif lt < p.burst + p.hold:
			var k2: float = (lt - p.burst) / p.hold
			x = p.bx
			y = p.by - sin(k2 * PI) * 4.0
			sc = 1.2
			rot = p.spin * 0.3
		else:
			var k0 := minf(1.0, (lt - p.burst - p.hold) / p.fly)
			if k0 >= 1.0:
				p.done = true
				n.queue_free()
				_arrive()
				continue
			var k3 := _eio(k0)
			var q := 1.0 - k3
			x = q * q * p.bx + 2.0 * q * k3 * p.cx + k3 * k3 * dst.x
			y = q * q * p.by + 2.0 * q * k3 * p.cy + k3 * k3 * dst.y
			sc = 1.2 - 0.6 * k3
			rot = p.spin * (0.3 + 0.7 * k3)
			op = (1.0 - k0) / 0.1 if k0 > 0.9 else 1.0
		n.position = Vector2(x, y)
		n.rotation = rot
		n.scale = Vector2.ONE * sc
		n.modulate.a = op
	queue_redraw()
	if alive == 0 and _t > 0.2 and _hits_done():
		queue_free()

func _arrive() -> void:
	_arrived += 1
	_hits.append([_t, dst])
	if on_arrive.is_valid(): on_arrive.call(_arrived, N)
	if _arrived >= N and on_done.is_valid(): on_done.call()

func _hits_done() -> bool:
	for h in _hits:
		if _t - float(h[0]) < 0.62: return false
	return _t > 0.7

func _draw() -> void:
	# kaynak parlaması (620 ms) + halka (700 ms)
	if _t < 0.7:
		var kb := _t / 0.62
		if kb < 1.0:
			var e := _eout(kb)
			var a := minf(1.0, kb / 0.25) * (1.0 - kb)
			draw_set_transform(src, 0.0, Vector2.ONE * (0.2 + 0.9 * e) * (140.0 / 128.0))
			draw_texture(ClimbArt.glow_tex(), Vector2(-64, -64), Color(col.lerp(Color.WHITE, 0.4), a))
			draw_set_transform(Vector2.ZERO)
		var kr := _t / 0.7
		var er := _eout(kr)
		draw_arc(src, 45.0 * (0.35 + 1.0 * er), 0, TAU, 48, Color(col, 0.8 * (1.0 - kr)), 2.0, true)
	# cüzdanda halkalar (600 ms)
	for h in _hits:
		var k := (_t - float(h[0])) / 0.6
		if k < 0.0 or k >= 1.0: continue
		var e2 := _eout(k)
		draw_arc(h[1], 22.0 * (0.35 + 1.0 * e2), 0, TAU, 40, Color(col, 0.9 * (1.0 - k)), 2.0, true)
