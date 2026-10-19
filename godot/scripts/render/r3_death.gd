class_name R3Death
extends RefCounted
## DÜŞMAN ÖLÜM EFEKTİ (çizgi roman): ① çizgi roman patlama yıldızı "pop" (büyür, taşar, söner)
## + altında sıcak parıltı ② vuruş yönüne saçılan mürekkep konturlu kırık parçalar (yerçekimi,
## sekme) ③ kabarık duman pufları: büyür, yükselir, sonra SÖNMEK yerine küçülerek kaybolur
## ④ (render3d/r3_enemies) model beyaz flaş + kenarı parlayan çözülme.
## Sprite'lar: assets/fx/death (tools/bake/fx/paint_death.py), shaders/fx_toon.gdshader.

const B_MAX := 28
const P_MAX := 90
const S_MAX := 140
const G_MAX := 28
const GRAV := 820.0

var r3
var bursts: IMesh
var puffs: IMesh
var shards: IMesh
var glows: IMesh
var _B: Array = []
var _P: Array = []
var _S: Array = []
var _G: Array = []
var _bi := 0
var _pi := 0
var _si := 0
var _gi := 0
var _live := false

func _init(r) -> void:
	r3 = r
	bursts = _mesh("burst", B_MAX, 9)
	puffs = _mesh("puff", P_MAX, 7)
	shards = _mesh("shard", S_MAX, 8)
	var gm := Shd.basic({"map": "raw", "tex": r3.tex("res://assets/fx/soft_glow.png"), "add": true, "zwrite": false, "ztest": false, "cull": "none", "order": 6})
	glows = IMesh.new(Geo.plane(1, 1), gm, G_MAX)
	r3.scene.add_child(glows)
	for i in B_MAX: _B.append({"t": -1.0})
	for i in P_MAX: _P.append({"t": -1.0})
	for i in S_MAX: _S.append({"t": -1.0})
	for i in G_MAX: _G.append({"t": -1.0})

func _mesh(n: String, cap: int, order: int) -> IMesh:
	var m := ShaderMaterial.new()
	m.shader = load("res://shaders/fx_toon.gdshader")
	m.set_shader_parameter("map", r3.tex("res://assets/fx/death/" + n + ".png"))
	m.render_priority = order
	var im := IMesh.new(Geo.plane(1, 1), m, cap)
	r3.scene.add_child(im)
	return im

## col: düşman rengi (sRGB) · big: elit / kritik öldürme
func spawn(x: float, z: float, ang: float, col: Color, big: bool) -> void:
	_live = true
	var lite := Quality.stress > 0.5
	var lc := col.srgb_to_linear()
	# çizgi roman patlaması: sıcak sarı-turuncu, düşman rengi hafif karışır
	var hot := Color("#ffb03a").lerp(col, 0.22).srgb_to_linear()
	_burst(x, z, 0.0, (108.0 if big else 76.0), hot)
	if big: _burst(x, z, 0.07, 70.0, Color("#fff1a8").srgb_to_linear())
	var g: Dictionary = _G[_gi % G_MAX]
	_gi += 1
	g.t = 0.0; g.x = x; g.z = z; g.s = (190.0 if big else 130.0); g.c = col.lerp(Color(1, 0.9, 0.7), 0.3).srgb_to_linear()
	var ns := (5 if lite else 8) + (5 if big else 0)
	for i in ns:
		var s: Dictionary = _S[_si % S_MAX]
		_si += 1
		var a := ang + randf_range(-1.1, 1.1) if randf() < 0.7 else randf() * TAU
		var v := randf_range(150.0, 290.0) * (1.25 if big else 1.0)
		s.t = 0.0; s.life = randf_range(0.42, 0.62)
		s.x = x; s.y = randf_range(16.0, 34.0); s.z = z
		s.vx = cos(a) * v; s.vz = sin(a) * v; s.vy = randf_range(140.0, 260.0)
		s.rot = randf() * TAU; s.w = randf_range(-14.0, 14.0)
		s.sz = randf_range(9.0, 16.0) * (1.2 if big else 1.0)
		s.c = (lc if i % 3 else hot)
	var np_ := (3 if lite else 4) + (3 if big else 0)
	var smoke := col.lerp(Color("#5d5866"), 0.7).srgb_to_linear()
	for i in np_:
		var p: Dictionary = _P[_pi % P_MAX]
		_pi += 1
		var a := randf() * TAU
		var r := randf_range(4.0, 18.0)
		p.t = -randf_range(0.02, 0.09)
		p.life = randf_range(0.5, 0.72)
		p.x = x + cos(a) * r; p.y = randf_range(14.0, 30.0); p.z = z + sin(a) * r * 0.7
		p.vx = cos(a) * 30.0; p.vy = randf_range(36.0, 70.0); p.vz = sin(a) * 18.0
		p.s = randf_range(26.0, 40.0) * (1.4 if big else 1.0)
		p.rot = randf() * TAU
		p.c = smoke * randf_range(0.85, 1.1)

## kritik vuruş "POW": küçük beyaz-sarı yıldız (kısa)
func pow_spark(x: float, z: float) -> void:
	_live = true
	_burst(x, z, 0.0, 46.0, Color("#fff4b8").srgb_to_linear())

func _burst(x: float, z: float, delay: float, sz: float, c: Color) -> void:
	var b: Dictionary = _B[_bi % B_MAX]
	_bi += 1
	b.t = -delay; b.x = x; b.z = z; b.s = sz; b.rot = randf() * TAU; b.c = c

static func _back(k: float) -> float:
	var c1 := 2.2
	return 1.0 + (c1 + 1.0) * pow(k - 1.0, 3.0) + c1 * pow(k - 1.0, 2.0)

func update(dt: float, cam: Basis) -> void:
	if not _live: return
	var any := false
	var n := 0
	for b in _B:
		if b.t < -0.5: continue
		b.t += dt
		if b.t < 0.0:
			any = true
			continue
		var life := 0.26
		if b.t >= life:
			b.t = -1.0
			continue
		any = true
		var k: float = b.t / life
		var sc: float = _back(minf(1.0, k / 0.32)) if k < 0.32 else 1.0 - pow((k - 0.32) / 0.68, 2.0)
		var s: float = b.s * maxf(0.0, sc)
		bursts.set_bb(n, b.x, 26.0, b.z, s, s, b.rot + k * 0.4, cam)
		bursts.set_col(n, b.c.r, b.c.g, b.c.b, 1.0)
		n += 1
	bursts.commit(n)
	n = 0
	for g in _G:
		if g.t < 0.0: continue
		g.t += dt
		var life := 0.32
		if g.t >= life:
			g.t = -1.0
			continue
		any = true
		var k: float = g.t / life
		var a := (1.0 - k) * (1.0 - k)
		var s: float = g.s * (0.6 + 0.6 * k)
		glows.set_bb(n, g.x, 18.0, g.z, s, s, 0.0, cam)
		glows.set_col(n, g.c.r * a, g.c.g * a, g.c.b * a)
		n += 1
	glows.commit(n)
	n = 0
	for s in _S:
		if s.t < 0.0: continue
		s.t += dt
		if s.t >= s.life:
			s.t = -1.0
			continue
		any = true
		s.vy -= GRAV * dt
		s.x += s.vx * dt; s.y += s.vy * dt; s.z += s.vz * dt
		if s.y < 3.0:
			s.y = 3.0
			s.vy = absf(s.vy) * 0.32
			s.vx *= 0.55; s.vz *= 0.55; s.w *= 0.5
		s.rot += s.w * dt
		var k: float = s.t / s.life
		var sz: float = s.sz * (1.0 if k < 0.65 else 1.0 - (k - 0.65) / 0.35)
		shards.set_bb(n, s.x, s.y, s.z, sz, sz, s.rot, cam)
		shards.set_col(n, s.c.r, s.c.g, s.c.b, 1.0)
		n += 1
	shards.commit(n)
	n = 0
	for p in _P:
		if p.t < -0.5: continue
		p.t += dt
		if p.t < 0.0:
			any = true
			continue
		if p.t >= p.life:
			p.t = -1.0
			continue
		any = true
		var k: float = p.t / p.life
		p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt
		p.vx *= 0.94; p.vz *= 0.94
		var sc: float = _back(minf(1.0, k / 0.3)) if k < 0.3 else (1.0 if k < 0.55 else 1.0 - pow((k - 0.55) / 0.45, 1.6))
		var sz: float = p.s * maxf(0.0, sc)
		puffs.set_bb(n, p.x, p.y, p.z, sz, sz, p.rot + k * 0.6, cam)
		puffs.set_col(n, p.c.r, p.c.g, p.c.b, 1.0)
		n += 1
	puffs.commit(n)
	_live = any

func clear() -> void:
	for a in [_B, _P, _S, _G]:
		for it in a: it.t = -1.0
	_live = true
