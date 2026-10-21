class_name FxFly
extends Node2D
## Satın alım/ödül uçuşu (Clash Royale hissi): kaynakta parlama, para parçaları HAVAYA SAÇILIR
## (ölçek taşması + yerçekimli yay), kısa süzülme (sallanarak), sonra HIZLANARAK kendi yayında
## cüzdana dalar — arkasında pırıltı izi; her varışta cüzdanda halka + sayaç tık
## (on_arrive). Sprite'lar: assets/fx/currency (gem, sikke; tools/bake/fx/paint_currency.py)
## — net, konturlu, gölgeli. Koordinatlar: bu düğümün (güvenli alan kökü) yerel uzayı.

const N := 14
const SIZE := 40.0

var tex: Texture2D             # para sprite'ı (gem / sikke)
var icon: Node2D               # (eski) yakalanmış ikon — tex yoksa
var col := Color(0.78, 0.61, 1.0)
var src := Vector2.ZERO
var dst := Vector2.ZERO
var on_arrive := Callable()    # (i: int, n: int)
var on_done := Callable()

var _t := 0.0
var _P: Array = []
var _hits: Array = []          # [t0, pos]
var _sparks: Array = []        # [pos, vel, t0, life, size]
var _arrived := 0

func start() -> void:
	for i in N:
		var n := Node2D.new()
		if tex:
			var sh := Sprite2D.new()                 # yumuşak gölge
			sh.texture = tex
			sh.modulate = Color(0, 0, 0, 0.35)
			sh.position = Vector2(2.0, 4.0)
			sh.scale = Vector2.ONE * (SIZE / tex.get_width())
			n.add_child(sh)
			var sp := Sprite2D.new()
			sp.texture = tex
			sp.scale = Vector2.ONE * (SIZE / tex.get_width())
			n.add_child(sp)
		elif icon:
			n.add_child(icon.duplicate())
		n.scale = Vector2.ZERO
		add_child(n)
		var ang := -PI * 0.5 + (float(i) / (N - 1) - 0.5) * PI * 1.5 + randf_range(-0.2, 0.2)
		var spd := randf_range(170.0, 300.0)
		var side := (1.0 if i % 2 else -1.0) * randf_range(40.0, 110.0)
		_P.append({"n": n, "vx": cos(ang) * spd, "vy": sin(ang) * spd - 60.0,
			"t0": i * 0.035, "burst": randf_range(0.42, 0.52), "hold": randf_range(0.08, 0.18),
			"fly": randf_range(0.5, 0.66), "side": side, "tilt": randf_range(-0.35, 0.35),
			"ph": randf() * TAU, "x": src.x, "y": src.y, "bx": 0.0, "by": 0.0, "done": false, "sp": 0.0})

static func _back(k: float) -> float:
	var q := k - 1.0
	return 1.0 + 2.6 * q * q * q + 1.6 * q * q

func _process(dt: float) -> void:
	_t += dt
	var alive := 0
	for p in _P:
		if p.done: continue
		alive += 1
		var lt: float = _t - float(p.t0)
		if lt < 0.0: continue
		var n: Node2D = p.n
		var b: float = p.burst
		var h: float = p.hold
		if lt < b:
			# fırla: yerçekimli yay, ölçek taşarak büyür
			var k := lt / b
			p.vy = float(p.vy) + 620.0 * dt
			p.vx = float(p.vx) * exp(-2.4 * dt)
			p.x = float(p.x) + float(p.vx) * dt
			p.y = float(p.y) + float(p.vy) * dt
			n.scale = Vector2.ONE * _back(minf(1.0, k / 0.55)) * 1.15
			n.rotation = float(p.tilt) * sin(k * PI)
			p.bx = p.x; p.by = p.y
		elif lt < b + h:
			var k2 := (lt - b) / h
			p.x = float(p.bx)
			p.y = float(p.by) - sin(k2 * PI) * 5.0
			n.scale = Vector2.ONE * 1.15
			n.rotation = sin(_t * 9.0 + float(p.ph)) * 0.12
		else:
			var k0 := minf(1.0, (lt - b - h) / float(p.fly))
			if k0 >= 1.0:
				p.done = true
				n.queue_free()
				_arrive()
				continue
			# hızlanarak dal (ease-in), yan yay; sona doğru küçül
			var e := pow(k0, 2.1)
			var a := Vector2(p.bx, p.by)
			var d := dst - a
			var L := maxf(1.0, d.length())
			var c := (a + dst) * 0.5 + Vector2(-d.y, d.x) / L * float(p.side) + Vector2(0, -50)
			var q := 1.0 - e
			var pos := a * q * q + c * 2.0 * q * e + dst * e * e
			var vel := pos - Vector2(p.x, p.y)
			p.x = pos.x; p.y = pos.y
			n.scale = Vector2.ONE * lerpf(1.15, 0.62, e)
			n.rotation = lerpf(n.rotation, clampf(vel.x * 0.02, -0.4, 0.4), 0.3)
			# iz pırıltıları
			p.sp = float(p.sp) + dt
			if p.sp > 0.035 and vel.length() > 2.0:
				p.sp = 0.0
				_sparks.append([pos, -vel.normalized() * randf_range(10.0, 30.0) + Vector2(randf_range(-12, 12), randf_range(-12, 12)), _t, randf_range(0.25, 0.4), randf_range(2.0, 3.6)])
		n.position = Vector2(p.x, p.y)
	queue_redraw()
	if alive == 0 and _t > 0.2 and _fx_done():
		queue_free()

func _arrive() -> void:
	_arrived += 1
	_hits.append([_t, dst])
	for i in 4:
		var a := randf() * TAU
		_sparks.append([dst, Vector2(cos(a), sin(a)) * randf_range(50.0, 110.0), _t, 0.35, randf_range(2.5, 4.0)])
	if on_arrive.is_valid(): on_arrive.call(_arrived, N)
	if _arrived >= N and on_done.is_valid(): on_done.call()

func _fx_done() -> bool:
	for h in _hits:
		if _t - float(h[0]) < 0.6: return false
	for s in _sparks:
		if _t - float(s[2]) < float(s[3]): return false
	return _t > 0.7

static func _eout(k: float) -> float: return 1.0 - pow(1.0 - k, 3.0)

func _draw() -> void:
	# kaynak: parlama + genişleyen halka
	if _t < 0.7:
		var kb := _t / 0.5
		if kb < 1.0:
			var e := _eout(kb)
			var a := minf(1.0, kb / 0.2) * (1.0 - kb)
			draw_set_transform(src, 0.0, Vector2.ONE * (0.3 + 0.9 * e) * (150.0 / 128.0))
			draw_texture(ClimbArt.glow_tex(), Vector2(-64, -64), Color(col.lerp(Color.WHITE, 0.5), a * 0.8))
			draw_set_transform(Vector2.ZERO)
		var kr := _t / 0.7
		draw_arc(src, 50.0 * (0.3 + 1.0 * _eout(kr)), 0, TAU, 48, Color(col.lerp(Color.WHITE, 0.3), 0.9 * (1.0 - kr)), 3.0, true)
	# iz / varış pırıltıları (dört köşeli yıldız)
	for s in _sparks:
		var k: float = (_t - float(s[2])) / float(s[3])
		if k < 0.0 or k >= 1.0: continue
		var p: Vector2 = s[0] + s[1] * (_t - float(s[2]))
		var r: float = float(s[4]) * (1.0 - k)
		var c := Color(col.lerp(Color.WHITE, 0.55), 1.0 - k)
		draw_colored_polygon(PackedVector2Array([p + Vector2(0, -r * 2.2), p + Vector2(r * 0.45, 0), p + Vector2(0, r * 2.2), p + Vector2(-r * 0.45, 0)]), c)
		draw_colored_polygon(PackedVector2Array([p + Vector2(-r * 2.2, 0), p + Vector2(0, r * 0.45), p + Vector2(r * 2.2, 0), p + Vector2(0, -r * 0.45)]), c)
	# cüzdanda halkalar
	for h in _hits:
		var k3 := (_t - float(h[0])) / 0.55
		if k3 < 0.0 or k3 >= 1.0: continue
		draw_arc(h[1], 24.0 * (0.35 + 1.0 * _eout(k3)), 0, TAU, 40, Color(col.lerp(Color.WHITE, 0.3), 0.95 * (1.0 - k3)), 2.5, true)
