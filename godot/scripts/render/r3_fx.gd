class_name R3Fx
extends RefCounted
## render3d.js efekt bölümü (birebir): isabet katmanı (çekirdek · kesik · halka ·
## imza anı) · kor topu/düşman yalımı + isabet + mavi kor + kasırga · mermiler ·
## oklar · ruh alevi (XP) · kan kalbi · parçacıklar · kor çemberi · tehlike
## alanları · patlama halkaları · yıldırım sütunları · havan fıçıları · yörünge
## bıçakları · can barları. Kameraya bakan kareler render3d._bb ile aynı matris.

const GEM_SOULS := [
	{"c": "#c4162a", "k": "#ff7d84", "g": "#7e0c18", "r": 4.4},
	{"c": "#e01e34", "k": "#ff96a0", "g": "#9c0f1e", "r": 5.6},
	{"c": "#ff2f3e", "k": "#ffb3b8", "g": "#c01526", "r": 7.0},
]
const FLAME_HEX := ["#8fe6ff", "#ffc24d", "#ff6a2c", "#ffe6a0"]
const FIRE_PAL := {
	"blue": {"cr": 0.94, "cg": 0.98, "cb": 1.00, "gx": 0.13, "gy": 0.46, "gz": 0.96, "tx": 0.34, "ty": 0.78, "tz": 1.00, "fx": 0.10, "fy": 0.40, "fz": 0.92},
	"necro": {"cr": 0.84, "cg": 1.00, "cb": 0.88, "gx": 0.14, "gy": 0.82, "gz": 0.42, "tx": 0.30, "ty": 0.96, "tz": 0.50, "fx": 0.08, "fy": 0.62, "fz": 0.32},
	"harvest": {"cr": 1.00, "cg": 0.93, "cb": 0.72, "gx": 0.86, "gy": 0.16, "gz": 0.20, "tx": 1.00, "ty": 0.42, "tz": 0.24, "fx": 0.72, "fy": 0.14, "fz": 0.16},
	# düşman atıcı büyüleri (models_meta "shot.pal") — modelin elindeki asa/kürenin rengi
	"blood": {"cr": 1.00, "cg": 0.84, "cb": 0.84, "gx": 0.90, "gy": 0.08, "gz": 0.14, "tx": 1.00, "ty": 0.24, "tz": 0.28, "fx": 0.70, "fy": 0.04, "fz": 0.10},
	"ember": {"cr": 1.00, "cg": 0.96, "cb": 0.76, "gx": 1.00, "gy": 0.50, "gz": 0.08, "tx": 1.00, "ty": 0.66, "tz": 0.20, "fx": 0.92, "fy": 0.34, "fz": 0.04},
	"toxic": {"cr": 0.90, "cg": 1.00, "cb": 0.70, "gx": 0.42, "gy": 0.95, "gz": 0.18, "tx": 0.62, "ty": 1.00, "tz": 0.30, "fx": 0.28, "fy": 0.72, "fz": 0.10},
	"violet": {"cr": 1.00, "cg": 0.86, "cb": 1.00, "gx": 0.62, "gy": 0.22, "gz": 0.96, "tx": 0.86, "ty": 0.36, "tz": 1.00, "fx": 0.70, "fy": 0.08, "fz": 0.40},
	"void": {"cr": 0.98, "cg": 0.95, "cb": 0.88, "gx": 0.40, "gy": 0.18, "gz": 0.72, "tx": 0.92, "ty": 0.86, "tz": 0.70, "fx": 0.22, "fy": 0.08, "fz": 0.42},
	"seed": {"cr": 0.96, "cg": 1.00, "cb": 0.86, "gx": 0.50, "gy": 0.95, "gz": 0.34, "tx": 1.00, "ty": 0.62, "tz": 0.82, "fx": 0.40, "fy": 0.85, "fz": 0.30},
	"crystal": {"cr": 1.00, "cg": 0.99, "cb": 0.92, "gx": 0.96, "gy": 0.76, "gz": 0.30, "tx": 1.00, "ty": 0.88, "tz": 0.50, "fx": 0.86, "fy": 0.60, "fz": 0.20},
	"bone": {"cr": 1.00, "cg": 0.97, "cb": 0.88, "gx": 0.94, "gy": 0.84, "gz": 0.48, "tx": 1.00, "ty": 0.90, "tz": 0.62, "fx": 0.78, "fy": 0.66, "fz": 0.36},
	"ice": {"cr": 0.92, "cg": 0.98, "cb": 1.00, "gx": 0.40, "gy": 0.80, "gz": 1.00, "tx": 0.60, "ty": 0.90, "tz": 1.00, "fx": 0.30, "fy": 0.62, "fz": 0.96},
}
const MAX_PARTICLES := 700
const HAZARD_CAP := 8

var r3
var cam: Basis
# isabet katmanı
var impCore: IMesh
var impSlash: IMesh
var impRing: IMesh
var _imps: Array = []
var _impNext := 0
var _castNext := 0
var _impPrev := 0
const IMP_MAX := 26
# ateş
var fireFlame: IMesh
var fireGlow: IMesh
var fireRing: IMesh
const FIRE_FLAME_MAX := 200
const FIRE_GLOW_MAX := 120
const FIRE_RING_MAX := 18
var _fireHits: Array = []
var _fireHitNext := 0
const FIRE_Y := 44.0
var _fb := 0
var _fg := 0
# mermiler
var bulletMesh: IMesh
var bulletMetal: IMesh
var arrowMesh: IMesh
# cevher / kalp
var gemMesh: IMesh
var gemCore: IMesh
var gemRing: IMesh
var gemGlow: IMesh
var heartMesh: IMesh
var heartGlow: IMesh
# parçacık
var particles: IMesh
var _pMat: ShaderMaterial
# alanlar
var zoneMeshes: Array = []
var ringMeshes: Array = []
var hazardMeshes: Array = []
var hazardFills: Array = []
var _hzGeo := {}
var boltMeshes: Array = []
var bombMeshes: Array = []
var bladeMeshes: Array = []
var hpBg: IMesh
var hpFill: IMesh
var _hpMax := 0

func _quad_mesh(texp: String, max_n: int, order: int) -> IMesh:
	var m: ShaderMaterial = Shd.comic(texp, null, 1.0, order)
	if m == null: m = Shd.basic({"map": "raw", "tex": r3.tex(texp), "add": true, "zwrite": false, "cull": "none", "order": order})
	var im := IMesh.new(Geo.plane(1, 1), m, max_n)
	r3.scene.add_child(im)
	return im

func _init(r) -> void:
	r3 = r
	var S: Node3D = r3.scene
	# ── isabet katmanı ──
	impCore = _quad_mesh("res://assets/fx/glow.png", IMP_MAX, 6)
	impSlash = _quad_mesh("res://assets/fx/slash.png", IMP_MAX, 6)
	impRing = _quad_mesh("res://assets/fx/shock.png", IMP_MAX, 5)
	for i in IMP_MAX: _imps.append({"t": -1.0, "max": 0.22, "x": 0.0, "z": 0.0, "spin": 0.0, "sc": 1.0, "tier": 0, "cr": 1.0, "cg": 1.0, "cb": 1.0})
	# ── ateş ──
	fireFlame = _quad_mesh("res://assets/fx/flame_sprite.png", FIRE_FLAME_MAX, 4)
	fireGlow = _quad_mesh("res://assets/fx/glow.png", FIRE_GLOW_MAX, 5)
	fireRing = _quad_mesh("res://assets/fx/shock.png", FIRE_RING_MAX, 5)
	for i in 8: _fireHits.append({"t": -1.0, "x": 0.0, "y": 0.0, "ph": 0.0, "dir": 0.0, "sc": 1.0})
	# ── mermiler ──
	var sph := Geo.sphere(1, 8, 8)
	bulletMesh = IMesh.new(sph, Shd.lit({"color": Color(1, 1, 1), "emissive": Color("#333333"), "emissive_k": 1.0, "roughness": 0.3, "rim": false}), 220)
	S.add_child(bulletMesh)
	bulletMetal = IMesh.new(sph, Shd.lit({"color": Color(1, 1, 1), "metalness": 0.95, "roughness": 0.34, "emissive": Color("#0b0c0e"), "emissive_k": 1.0, "rim": false}), 96)
	S.add_child(bulletMetal)
	var shaft := Geo.cylinder(0.55, 0.55, 15, 6)
	var tip := Geo.cone(2.0, 6, 8)
	var fletch := Geo.box(0.4, 3.4, 3.6)
	var rx := Basis(Vector3(1, 0, 0), PI / 2)
	var arrowGeo := Geo.merge([shaft, tip, fletch], [Transform3D(rx, Vector3(0, 0, -1.5)), Transform3D(rx, Vector3(0, 0, 8.5)), Transform3D(Basis(), Vector3(0, 0, -8))])
	arrowMesh = IMesh.new(arrowGeo, Shd.basic({}), 140)
	S.add_child(arrowMesh)
	# ── ruh alevi (XP) ──
	var prof := PackedVector2Array([Vector2(0, 0), Vector2(0.24, 0.02), Vector2(0.44, 0.13), Vector2(0.52, 0.33), Vector2(0.45, 0.55),
		Vector2(0.31, 0.75), Vector2(0.21, 0.97), Vector2(0.13, 1.22), Vector2(0.06, 1.48), Vector2(0, 1.78)])
	var soul := Geo.merge([Geo.lathe(prof, 14)], [Transform3D(Basis(), Vector3(0, -0.42, 0))])
	gemMesh = IMesh.new(soul, Shd.basic({"alpha": true, "opacity": 0.9}), 380)
	S.add_child(gemMesh)
	var coreGeo := Geo.merge([Geo.lathe(prof, 10)], [Transform3D(Basis().scaled(Vector3(0.46, 0.72, 0.46)), Vector3(0, -0.42 * 0.72, 0))])
	gemCore = IMesh.new(coreGeo, Shd.basic({"add": true, "opacity": 0.75, "zwrite": false}), 380)
	S.add_child(gemCore)
	var ringGeo := Geo.merge([Geo.torus(0.92, 0.055, 5, 18)], [Transform3D(Basis(Vector3(1, 0, 0), -PI / 2), Vector3.ZERO)])
	gemRing = IMesh.new(ringGeo, Shd.basic({"add": true, "opacity": 0.45, "zwrite": false}), 380)
	S.add_child(gemRing)
	gemGlow = IMesh.new(Geo.plane(1, 1), Shd.basic({"map": "raw", "tex": r3.tex("res://assets/fx/soft_glow.png"), "add": true, "opacity": 0.6, "zwrite": false, "cull": "none"}), 380)
	S.add_child(gemGlow)
	# ── kan kalbi ──
	var hg: Dictionary = r3._glb_meshes("res://assets/fx/fx_geo.glb")
	heartMesh = IMesh.new(hg.get("heart"), Shd.lit({"color": Color("#ff3346"), "emissive": Color("#9c0d1c"), "emissive_k": 0.9, "roughness": 0.3, "metalness": 0.1, "rim": false}), 40)
	S.add_child(heartMesh)
	heartGlow = IMesh.new(Geo.plane(1, 1), Shd.basic({"map": "raw", "tex": r3.tex("res://assets/fx/soft_glow.png"), "color": Color("#ff5f72"), "add": true, "opacity": 0.55, "zwrite": false, "cull": "none"}), 40)
	S.add_child(heartGlow)
	# ── parçacıklar (THREE.Points, size 4, mesafe zayıflamalı) ──
	var pa := []
	pa.resize(Mesh.ARRAY_MAX)
	pa[Mesh.ARRAY_VERTEX] = PackedVector3Array([Vector3.ZERO])
	var pm := ArrayMesh.new()
	pm.add_surface_from_arrays(Mesh.PRIMITIVE_POINTS, pa)
	var ps := Shader.new()
	ps.code = "shader_type spatial;\nrender_mode unshaded, blend_add, depth_draw_never, cull_disabled;\n#include \"res://shaders/three_lit.gdshaderinc\"\nuniform float psize = 1688.0;\nvoid vertex() { POINT_SIZE = psize / max(1.0, -(MODELVIEW_MATRIX * vec4(VERTEX, 1.0)).z); }\nvoid fragment() { ALBEDO = r3_srgb(COLOR.rgb); ALPHA = 0.9; }\n"
	_pMat = ShaderMaterial.new()
	_pMat.shader = ps
	particles = IMesh.new(pm, _pMat, MAX_PARTICLES)
	S.add_child(particles)
	# ── kor çemberi alanları ──
	for i in 4:
		var mm := Render3D.mesh_node(Geo.circle(1, 24, 0, TAU, -PI / 2), Shd.basic({"color": Color("#ff5a3c"), "add": true, "opacity": 0.3, "zwrite": false}), S)
		mm.visible = false
		mm.set_meta("hex", "#ff5a3c")
		zoneMeshes.append(mm)
	for i in 24:
		var mm := Render3D.mesh_node(Geo.ring(0.9, 1, 28, 1, 0, TAU, PackedColorArray(), -1, -PI / 2), Shd.basic({"color": Color(1, 1, 1), "add": true, "opacity": 0.7, "zwrite": false, "cull": "none"}), S)
		mm.visible = false
		ringMeshes.append(mm)
	# ── tehlike alanları (yuvarlak: zehir · sekizgen: patlama telegrafı) ──
	_hzGeo = {"ringR": Geo.ring(0.84, 1, 34, 1, 0, TAU, PackedColorArray(), -1, -PI / 2), "fillR": Geo.circle(1, 30, 0, TAU, -PI / 2),
		"ringO": Geo.ring(0.8, 1, 8, 1, PI / 8, TAU, PackedColorArray(), -1, -PI / 2), "fillO": Geo.circle(1, 8, PI / 8, TAU, -PI / 2)}
	for i in HAZARD_CAP:
		var mm := Render3D.mesh_node(_hzGeo.ringR, Shd.basic({"color": Color("#ff4a5e"), "add": true, "opacity": 0.5, "zwrite": false, "cull": "none", "order": 4}), S)
		mm.position.y = 1.4
		mm.visible = false
		mm.set_meta("oct", false)
		hazardMeshes.append(mm)
		var f := Render3D.mesh_node(_hzGeo.fillR, Shd.basic({"color": Color("#ff4a5e"), "add": true, "opacity": 0.18, "zwrite": false, "order": 3}), S)
		f.position.y = 1.2
		f.visible = false
		hazardFills.append(f)
	# ── yıldırım sütunları (çapraz iki düzlem) ──
	var boltGeo := Geo.plane(7, 210)
	for i in 8:
		var g := Render3D.node(S)
		var m1 := Shd.basic({"color": Color("#9fd8ff"), "add": true, "opacity": 0.6, "zwrite": false, "cull": "none"})
		var p1 := Render3D.mesh_node(boltGeo, m1, g)
		var p2 := Render3D.mesh_node(boltGeo, m1.duplicate(), g)
		p2.rotation.y = PI / 2
		p1.position.y = 105; p2.position.y = 105
		g.visible = false
		boltMeshes.append(g)
	# ── kor havanı fıçıları ──
	for i in 16:
		var mm := Render3D.mesh_node(Geo.cylinder(6, 6, 16, 8), Shd.lit({"color": Color("#3a2a1c"), "roughness": 0.7, "rim": false}), S)
		mm.visible = false
		bombMeshes.append(mm)
	# ── yörünge bıçakları ──
	for i in 6:
		var mm := Render3D.mesh_node(Geo.cone(5, 16, 4), Shd.lit({"color": Color("#aeb8d8"), "emissive": Color("#59e3c8"), "emissive_k": 0.4, "roughness": 0.3, "rim": false}), S)
		mm.visible = false
		bladeMeshes.append(mm)
	# ── can barları (pivot sol kenarda) ──
	var hpGeo := Geo.merge([Geo.plane(1, 1)], [Transform3D(Basis(), Vector3(0.5, 0, 0))])
	_hpMax = r3.en._enemyMax + 2 if r3.en else 482
	hpBg = IMesh.new(hpGeo, Shd.basic({"color": Color("#0a0c12"), "alpha": true, "opacity": 0.72, "zwrite": false, "ztest": false, "order": 120}), _hpMax)
	S.add_child(hpBg)
	hpFill = IMesh.new(hpGeo, Shd.basic({"color": Color(1, 1, 1), "alpha": true, "opacity": 0.95, "zwrite": false, "ztest": false, "order": 121}), _hpMax)
	S.add_child(hpFill)

## render3d._bb: kameraya bakan kare + kendi ekseninde dönüş + doğrusal renk
func _bb(im: IMesh, i: int, x: float, y: float, z: float, sx: float, sy: float, spin: float, cr: float, cg: float, cb: float) -> void:
	im.set_bb(i, x, y, z, sx, sy, spin, cam)
	im.set_col(i, maxf(cr, 0), maxf(cg, 0), maxf(cb, 0))

func set_point_scale(pr: float, h: float) -> void:
	_pMat.set_shader_parameter("psize", 4.0 * pr * h * 0.5)

# ═══════════ KARE ═══════════

func update(g, dt: float) -> void:
	cam = r3.camera.global_transform.basis
	_update_projectiles(g)
	_update_fire_hits(g, dt)
	_update_impacts(dt)
	_update_gems(g)
	_update_hearts(g)
	_update_particles(g)
	_update_zones(g)
	_update_hazards(g)
	_update_rings(g)
	_update_bolts(g)
	_update_bombs(g)
	_update_orbit_blades(g)
	_update_hp_bars(g)

# ═══════════ İSABET KATMANI ═══════════

## @param t 0 sıradan · 1 kritik · 2 ağır (patlama/ölüm)
func spawn_hit(x: float, y: float, ang: float, t: int, cr := 1.0, cg := 0.92, cb := 0.76) -> void:
	if t == 0 and Quality.stress > 0.7: return
	var b := Quality.budget("impacts")
	var cap := mini(_imps.size() - 3, b if b else _imps.size())
	var s: Dictionary = _imps[_impNext % cap]
	_impNext += 1
	s.t = 0.0
	s.max = 0.42 if t >= 2 else (0.32 if t == 1 else 0.20)
	s.x = x; s.z = y
	s.spin = -atan2(sin(ang) * Render3D.COS_TILT, cos(ang))
	s.tier = t
	s.sc = 1.7 if t >= 2 else (1.2 if t == 1 else 0.85)
	s.cr = cr; s.cg = cg; s.cb = cb

## İMZA ANI — yerden yükselen sütun + geniş zemin mührü (son üç yuva ayrılmış)
func spawn_cast(x: float, y: float, cr: float, cg: float, cb: float) -> void:
	var s: Dictionary = _imps[_imps.size() - 3 + (_castNext % 3)]
	_castNext += 1
	s.t = 0.0; s.max = 0.62
	s.x = x; s.z = y
	s.tier = 3; s.spin = 0.0; s.sc = 1.0
	s.cr = cr; s.cg = cg; s.cb = cb

func _update_impacts(dt: float) -> void:
	var live := 0
	for s in _imps:
		if s.t >= 0: live += 1
	if live == 0 and not _impPrev: return
	var c := 0
	var sl := 0
	var rg := 0
	var lite := Quality.stress > 0.5
	for s in _imps:
		if s.t < 0: continue
		s.t += dt
		if s.t >= s.max:
			s.t = -1.0
			continue
		var e: float = s.t / s.max
		var inv := 1 - e
		if s.tier == 3:
			var up := e / 0.18 if e < 0.18 else 1.0
			var fade := 1.0 if e < 0.18 else pow(1 - (e - 0.18) / 0.82, 2.2)
			var h := 42 + 176 * up
			var w := (46 + 26 * up) * (0.5 + 0.5 * fade)
			_bb(impCore, c, s.x, 8 + h * 0.5, s.z, w, h, 0, fade * s.cr, fade * s.cg, fade * s.cb); c += 1
			var u := minf(1.0, e / 0.62)
			var k := (1 - u) * (1 - u) * 0.62
			var rr := 34 + 168 * sqrt(u)
			_bb(impRing, rg, s.x, 6, s.z, rr * 2, rr, 0, k * s.cr, k * s.cg, k * s.cb); rg += 1
			continue
		var Y: float = 24 + s.tier * 7
		var grow := e / 0.15 if e < 0.15 else 1.0
		var a := inv * inv * inv
		var core: float = (8 + 16 * grow) * s.sc
		_bb(impCore, c, s.x, Y, s.z, core, core, 0, a * s.cr * 0.8, a * s.cg * 0.8, a * s.cb * 0.8); c += 1
		if s.tier > 0 or not lite:
			var ln: float = (26 + 74 * e) * s.sc
			var wd: float = (15 * inv * inv + 2) * s.sc
			var b := inv * inv * 0.8
			_bb(impSlash, sl, s.x, Y, s.z, ln, wd, s.spin, b * s.cr, b * s.cg, b * s.cb); sl += 1
		if s.tier > 0 and e < 0.72:
			var u := e / 0.72
			var k := (1 - u) * (1 - u) * 0.46
			var rr: float = (18 + 66 * u) * s.sc
			_bb(impRing, rg, s.x, 7, s.z, rr * 2, rr, 0, k * s.cr, k * s.cg, k * s.cb); rg += 1
	impCore.commit(c)
	impSlash.commit(sl)
	impRing.commit(rg)
	_impPrev = c + sl + rg

# ═══════════ ATEŞ ═══════════

func spawn_flame_impact(x: float, y: float, ang, sc := 1.0) -> void:
	var s: Dictionary = _fireHits[_fireHitNext % _fireHits.size()]
	_fireHitNext += 1
	s.t = 0.0; s.x = x; s.y = y; s.ph = randf() * 6.2831
	s.dir = s.ph if ang == null else float(ang)
	s.sc = sc if sc else 1.0

## Kuyruklu alev (kor topu / düşman mermisi): beyaz-sıcak baş + savrulan kuyruk + saçak
func _add_fire(b, P: Dictionary, rs: float, T: float, lite: bool) -> void:
	var ph: float = b.ph
	var r: float = (b.r if b.r else 10.0) * rs
	var sp := sqrt(b.vx * b.vx + b.vy * b.vy)
	if sp == 0: sp = 1
	var ux: float = b.vx / sp
	var uy: float = b.vy / sp
	var pxx := -uy
	var pzz := ux
	var spin := atan2(b.vx, b.vy * Render3D.COS_TILT)
	var w1 := sin(T * 17.0 + ph * 3.1)
	var w2 := sin(T * 11.3 + ph * 5.7)
	if _fg + 2 <= FIRE_GLOW_MAX:
		# çizgi roman: konturlu alev dilleri öne çıkar, yumuşak hale küçük ve sönük
		var c := (0.90 + w1 * 0.08) * 0.7
		_bb(fireGlow, _fg, b.x, FIRE_Y, b.y, r * 1.7, r * 1.7, 0, c * P.cr, c * P.cg, c * P.cb); _fg += 1
		_bb(fireGlow, _fg, b.x, FIRE_Y, b.y, r * 3.6, r * 3.2, 0, P.gx * 0.3, P.gy * 0.3, P.gz * 0.3); _fg += 1
	var segs := 2 if lite else 3
	for k in segs:
		if _fb >= FIRE_FLAME_MAX: break
		var d := r * (1.5 + k * 2.0)
		var wob := sin(T * 15 + ph * 2.3 + k * 2.1) * r * (0.22 + k * 0.16)
		var ln := r * (5.0 - k * 1.1)
		var wid := r * (3.0 - k * 0.55)
		var a := 1 - k * 0.30
		_bb(fireFlame, _fb, b.x - ux * d + pxx * wob, FIRE_Y + sin(T * 9 + k) * r * 0.10, b.y - uy * d + pzz * wob,
			wid, ln, spin + sin(T * 8.5 + ph + k * 1.7) * 0.16, a * P.tx * (1 - k * 0.22), a * P.ty * (1 - k * 0.22), a * P.tz)
		_fb += 1
	if not lite and _fb + 2 <= FIRE_FLAME_MAX:
		for k in 2:
			var s2 := 1.0 if k == 0 else -1.0
			var d := r * (1.9 + (w1 if k == 0 else w2) * 0.5)
			var off := s2 * r * (1.05 + 0.25 * (w2 if k == 0 else w1))
			_bb(fireFlame, _fb, b.x - ux * d + pxx * off, FIRE_Y + s2 * r * 0.18, b.y - uy * d + pzz * off,
				r * 1.15, r * 3.4, spin + s2 * (0.34 + (w1 if k == 0 else w2) * 0.18), P.fx, P.fy, P.fz)
			_fb += 1

func _update_projectiles(g) -> void:
	var idx := 0
	var mi := 0
	var ai := 0
	_fb = 0; _fg = 0
	var lite := Quality.stress > 0.55
	var T: float = g.time
	for b in g.pools.pBullets.active:
		if b.fireball:
			_add_fire(b, FIRE_PAL.blue, 1.0, T, lite)
		elif b.isArrow:
			if ai >= 140: continue
			var yaw := atan2(b.vx, b.vy)
			var ft := mini(3, int(b.flame))
			var sc := 1 + ft * 0.16
			arrowMesh.set_ys(ai, b.x, 20, b.y, yaw, sc, sc, sc)
			var c := Color(FLAME_HEX[ft]).srgb_to_linear()
			arrowMesh.set_col(ai, c.r, c.g, c.b)
			ai += 1
		elif b.metal:
			if mi >= 96: continue
			var rr := maxf(1.0, b.r)
			bulletMetal.set_ys(mi, b.x, maxf(6.0, b.r), b.y, 0, rr, rr, rr)
			var c := JS.col(b.color).srgb_to_linear()
			bulletMetal.set_col(mi, c.r, c.g, c.b)
			mi += 1
		else:
			if idx >= 220: continue
			var rr := maxf(1.0, b.r)
			bulletMesh.set_ys(idx, b.x, maxf(6.0, b.r), b.y, 0, rr, rr, rr)
			var c := JS.col(b.color).srgb_to_linear()
			bulletMesh.set_col(idx, c.r, c.g, c.b)
			idx += 1
	for b in g.pools.eBullets.active:
		if b.kind == 1:
			# düşman oku: renkli şaft + ucunda sönük hale (uzaktan seçilsin)
			if ai >= 140: continue
			var P: Dictionary = FIRE_PAL.get(b.pal, FIRE_PAL.ice)
			arrowMesh.set_ys(ai, b.x, 20, b.y, atan2(b.vx, b.vy), 1.3, 1.3, 1.3)
			arrowMesh.set_col(ai, P.tx, P.ty, P.tz)
			ai += 1
			if _fg < FIRE_GLOW_MAX:
				_bb(fireGlow, _fg, b.x, FIRE_Y, b.y, 22, 22, 0, P.gx * 0.35, P.gy * 0.35, P.gz * 0.35); _fg += 1
		elif b.pal != "":
			_add_fire(b, FIRE_PAL.get(b.pal, FIRE_PAL.necro), 1.45, T, lite)
		else:
			_add_fire(b, FIRE_PAL.harvest if b.hue else FIRE_PAL.necro, 1.45, T, lite)
	bulletMesh.commit(idx)
	bulletMetal.commit(mi)
	arrowMesh.commit(ai)

func _update_fire_hits(g, dt: float) -> void:
	var fr := 0
	var LIFE := 0.30
	var lite := Quality.stress > 0.55
	var T: float = g.time
	var zs: Array = g.pools.zones.active
	var blueZones := 0
	for z in zs:
		if z.blue: blueZones += 1
	var cyc: int = int(g.weapons.cycloneN) if g.weapons else 0
	var any := false
	for s in _fireHits:
		if s.t >= 0:
			any = true
			break
	if not any and not blueZones and not cyc and _fb == 0 and _fg == 0:
		fireFlame.commit(0); fireGlow.commit(0); fireRing.commit(0)
		return
	for s in _fireHits:
		if s.t < 0: continue
		s.t += dt
		var sc: float = s.sc
		var nova := sc > 1.4
		var life := LIFE * 1.55 if nova else LIFE
		if s.t >= life:
			s.t = -1.0
			continue
		var e: float = s.t / life
		var inv := 1 - e
		var petals := (7 if lite else 11) if nova else (3 if lite else 5)
		if _fg < FIRE_GLOW_MAX:
			var k := e / 0.16 if e < 0.16 else (inv / 0.84) * (inv / 0.84)
			var sz := (32 + e * 44) * sc
			_bb(fireGlow, _fg, s.x, FIRE_Y, s.y, sz, sz, 0, k, k * 0.98, k * 0.93); _fg += 1
		if _fg < FIRE_GLOW_MAX:
			var k := inv * inv * 0.9
			var sz := (48 + e * 104) * sc
			_bb(fireGlow, _fg, s.x, FIRE_Y, s.y, sz, sz, 0, k * 0.18, k * 0.56, k); _fg += 1
		var fan := 6.2831 if nova else 3.9
		for k2 in petals:
			if _fb >= FIRE_FLAME_MAX: break
			var a: float = s.dir + ((k2 + 0.5) / petals - 0.5) * fan + sin(s.ph + k2) * 0.25
			var d := (7 + e * 44) * sc
			var w := 23 * inv * (sc * 0.62 if nova else 1.0)
			_bb(fireFlame, _fb, s.x + cos(a) * d, FIRE_Y + sin(s.ph + k2 * 2.1) * 9 + e * 14 * sc, s.y + sin(a) * d,
				w, w * 1.5, a + e * 1.1, inv * 0.30, inv * 0.72, inv)
			_fb += 1
		if fr < FIRE_RING_MAX and e < 0.55:
			var re := e / 0.55
			var rinv := 1 - re
			var sz := (20 + (1 - rinv * rinv) * 66) * sc
			var k := rinv * rinv * 0.75
			_bb(fireRing, fr, s.x, FIRE_Y - 4, s.y, sz, sz * 0.58, 0, k * 0.30, k * 0.58, k * 0.80); fr += 1
			if nova and fr < FIRE_RING_MAX:
				var sz2 := (14 + re * 118) * sc
				_bb(fireRing, fr, s.x, FIRE_Y - 8, s.y, sz2, sz2 * 0.5, 0, rinv * 0.16, rinv * 0.38, rinv * 0.62); fr += 1
	if cyc: _push_cyclone(g.weapons, cyc, T)
	if blueZones: _push_fire_zones(zs, T)
	fireFlame.commit(_fb)
	fireGlow.commit(_fg)
	fireRing.commit(fr)

## MAVİ KOR BİRİKİNTİSİ (sig_a7) — birikintinin tohumundan türeyen yalımlar
func _push_fire_zones(zs: Array, T: float) -> void:
	var n := 3 if Quality.stress > 0.55 else 5
	for z in zs:
		if not z.blue: continue
		var fade: float = minf(1.0, minf((z.max - z.life) * 5, z.life * 1.5))
		for k in n:
			if _fb >= FIRE_FLAME_MAX: break
			var u: float = fmod(T * 1.2 + z.seed * 0.37 + k * 0.41, 1.0)
			var ang: float = z.seed + k * 2.399
			var rr: float = z.r * (0.16 + 0.60 * fmod(k * 0.37 + z.seed * 0.21, 1.0))
			var w: float = z.r * (0.46 - u * 0.22)
			var h: float = z.r * (1.00 - u * 0.38)
			var a: float = fade * (1 - u) * (u / 0.16 if u < 0.16 else 1.0)
			_bb(fireFlame, _fb, z.x + cos(ang) * rr, 5 + u * z.r * 1.05, z.y + sin(ang) * rr, w, h, sin(T * 3.2 + k * 1.7) * 0.15, a * 0.28, a * 0.68, a * 0.96)
			_fb += 1
		if _fg < FIRE_GLOW_MAX:
			var fl: float = 0.62 + 0.22 * sin(T * 9 + z.seed) + 0.12 * sin(T * 21 + z.seed * 2)
			_bb(fireGlow, _fg, z.x, 9, z.y, z.r * 2.5, z.r * 1.5, 0, fade * fl * 0.13, fade * fl * 0.38, fade * fl * 0.78)
			_fg += 1

## KOR KASIRGASI (sig_a8) — dönen mavi alev küreleri + geriye düşen iz
func _push_cyclone(W, n: int, T: float) -> void:
	var orbs: Array = W.cycloneOrbs
	var lite := Quality.stress > 0.55
	var R := 13.0
	for i in n:
		if i >= orbs.size() or orbs[i] == null: break
		var o = orbs[i]
		var ph := i * 1.77
		var w1 := sin(T * 17.0 + ph * 3.1)
		var w2 := sin(T * 10.3 + ph * 5.7)
		var bx := sin(o.a)
		var bz := -cos(o.a)
		var Y := 34 + sin(T * 3.4 + ph) * 5
		if _fb + 3 <= FIRE_FLAME_MAX:
			_bb(fireFlame, _fb, o.x, Y, o.y, R * 3.2 * (1 + w1 * 0.10), R * 4.2 * (1 + w2 * 0.16), w1 * 0.16, 0.06, 0.34, 0.98); _fb += 1
			_bb(fireFlame, _fb, o.x, Y + R * 0.25, o.y, R * 2.0 * (1 - w2 * 0.10), R * 2.8 * (1 + w1 * 0.12), -w2 * 0.20, 0.26, 0.68, 1.0); _fb += 1
			_bb(fireFlame, _fb, o.x, Y + R * 0.8, o.y, R * 1.05, R * 1.7 * (1 + w1 * 0.22), w2 * 0.30, 0.85, 0.95, 1.0); _fb += 1
		if not lite and _fb + 2 <= FIRE_FLAME_MAX:
			_bb(fireFlame, _fb, o.x + bx * R * 1.8, Y - R * 0.15, o.y + bz * R * 1.8, R * 1.7 * (1 + w2 * 0.18), R * 2.2, w2 * 0.5, 0.14, 0.42, 0.84); _fb += 1
			_bb(fireFlame, _fb, o.x + bx * R * 3.2, Y - R * 0.30, o.y + bz * R * 3.2, R * 1.15 * (1 + w1 * 0.20), R * 1.4, -w1 * 0.6, 0.06, 0.20, 0.48); _fb += 1
		if _fg < FIRE_GLOW_MAX:
			var c := 0.80 + w1 * 0.12
			_bb(fireGlow, _fg, o.x, Y + R * 0.2, o.y, R * 2.4, R * 2.4, 0, c * 0.62, c * 0.86, c); _fg += 1

# ═══════════ RUH ALEVİ (XP) · KAN KALBİ ═══════════

func _update_gems(g) -> void:
	var idx := 0
	var t: float = g.time
	for gm in g.pools.gems.active:
		if idx >= 380: break
		var tier: Dictionary = GEM_SOULS[gm.tier] if gm.tier >= 0 and gm.tier < 3 else GEM_SOULS[0]
		var ph: float = gm.bob
		var y := 16 + sin(ph + t * 1.7) * 1.8
		var spin := t * 0.75 + ph
		var tilt := sin(t * 2.0 + ph * 1.7) * 0.075
		var flick := sin(t * 3.6 + ph) * 0.10 + sin(t * 7.9 + ph * 2.3) * 0.035
		var hS: float = tier.r * (1 + flick)
		var wS: float = tier.r * (1 - flick * 0.55)
		gemMesh.set_trs(idx, gm.x, y, gm.y, tilt, spin, tilt * 0.5, wS, hS, wS)
		var c := Color(tier.c).srgb_to_linear()
		gemMesh.set_col(idx, c.r, c.g, c.b)
		gemCore.set_trs(idx, gm.x, y, gm.y, tilt, spin, tilt * 0.5, wS * 0.98, hS * (1 - flick * 0.8), wS * 0.98)
		var ck := Color(tier.k).srgb_to_linear()
		gemCore.set_col(idx, ck.r, ck.g, ck.b)
		var ringS: float = tier.r * (1.45 + sin(t * 1.9 + ph) * 0.09)
		gemRing.set_ys(idx, gm.x, 0.7, gm.y, -spin * 0.5, ringS, ringS, ringS)
		gemRing.set_col(idx, c.r, c.g, c.b)
		var halo: float = (2.9 + sin(t * 2.4 + ph * 1.3) * 0.3) * tier.r
		gemGlow.set_bb(idx, gm.x, y, gm.y, halo, halo, 0, cam)
		var cg := Color(tier.g).srgb_to_linear()
		gemGlow.set_col(idx, cg.r, cg.g, cg.b)
		idx += 1
	gemMesh.commit(idx)
	gemCore.commit(idx)
	gemRing.commit(idx)
	gemGlow.commit(idx)

func _update_hearts(g) -> void:
	var t: float = g.time
	var idx := 0
	for h in g.pools.hearts.active:
		if idx >= 40: break
		var ph: float = h.bob
		var y := 17 + sin(ph + t * 2.4) * 2.2
		var beat := sin(t * 3.1 + ph)
		var thump := pow(absf(beat), 8) * (1.0 if beat > 0 else 0.55)
		var sc := 7.0 * (1 + thump * 0.22)
		# kameraya dönük + hafif sallanan eğim (camQuat × Rz)
		var b := cam * Basis(Vector3(0, 0, 1), sin(t * 1.6 + ph) * 0.16)
		heartMesh.set_mat(idx, (b * Basis.from_scale(Vector3(sc, sc, sc * 0.8))), Vector3(h.x, y, h.y))
		var fade: float = 0.55 + sin(t * 14) * 0.35 if h.life < 4 else 1.0
		var halo := sc * (2.5 + thump * 0.5) * fade
		heartGlow.set_mat(idx, (cam * Basis.from_scale(Vector3(halo, halo, halo))), Vector3(h.x, y, h.y))
		idx += 1
	heartMesh.commit(idx)
	heartGlow.commit(idx)

func _update_particles(g) -> void:
	var b := Quality.budget("particles")
	var cap := mini(MAX_PARTICLES, b)
	var idx := 0
	for o in g.pools.particles.active:
		if idx >= cap: break
		particles.set_ys(idx, o.x, 6, o.y, 0, 1, 1, 1)
		var c: Color = o.color.srgb_to_linear()
		var a := clampf(o.life / o.max, 0, 1)
		particles.set_col(idx, c.r * a, c.g * a, c.b * a)
		idx += 1
	particles.commit(idx)

# ═══════════ ALANLAR ═══════════

func _update_zones(g) -> void:
	var zones: Array = g.pools.zones.active
	for i in zoneMeshes.size():
		var mesh: MeshInstance3D = zoneMeshes[i]
		if i >= zones.size():
			mesh.visible = false
			continue
		var z = zones[i]
		mesh.visible = true
		var pulse: float = 1 + sin(g.time * 6 + z.seed) * 0.05
		var a: float = minf(1.0, minf((z.max - z.life) * 4, z.life * 1.6))
		mesh.position = Vector3(z.x, 1, z.y)
		var s: float = z.r * pulse
		mesh.scale = Vector3(s, s, s)
		var zh := "#2f86ff" if z.blue else "#ff5a3c"
		var mat: ShaderMaterial = mesh.material_override
		if mesh.get_meta("hex") != zh:
			mesh.set_meta("hex", zh)
			mat.set_shader_parameter("color", Color(zh))
		mat.set_shader_parameter("opacity", (0.20 if z.blue else 0.3) * a)

func _update_hazards(g) -> void:
	var hz: Array = g.pools.hazards.active if g.pools.has("hazards") else []
	for i in hazardMeshes.size():
		var mesh: MeshInstance3D = hazardMeshes[i]
		var fill: MeshInstance3D = hazardFills[i]
		if i >= hz.size():
			if mesh.visible:
				mesh.visible = false
				fill.visible = false
			continue
		var h = hz[i]
		mesh.visible = true; fill.visible = true
		mesh.position = Vector3(h.x, 1.4, h.y)
		fill.position = Vector3(h.x, 1.2, h.y)
		var oct: bool = h.kind == 0
		if mesh.get_meta("oct") != oct:
			mesh.set_meta("oct", oct)
			mesh.mesh = _hzGeo.ringO if oct else _hzGeo.ringR
			fill.mesh = _hzGeo.fillO if oct else _hzGeo.fillR
		# ring/fill zaten yatay (−π/2 pişmiş) → rotation.z yerel Y dönüşüne denk gelir
		var rot: float = h.t * 0.9 if oct else 0.0
		mesh.rotation.y = rot; fill.rotation.y = rot
		var mm: ShaderMaterial = mesh.material_override
		var fm: ShaderMaterial = fill.material_override
		if h.kind == 0:
			var k: float = minf(1.0, h.t / maxf(0.001, h.tell))
			var after: float = maxf(0.0, 1 - (h.t - h.tell) / 0.28) if h.t > h.tell else 1.0
			mesh.scale = Vector3(h.r, h.r, h.r)
			mm.set_shader_parameter("opacity", (0.34 + 0.34 * k) * after)
			var fs: float = h.r * k
			fill.scale = Vector3(fs, fs, fs)
			fm.set_shader_parameter("opacity", 0.20 * after)
		else:
			var fade: float = minf(1.0, minf((h.dur - h.t) * 2.2, h.t * 4))
			var br: float = 1 + sin(g.time * 2.4 + h.seed) * 0.03
			var s1: float = h.r * br
			mesh.scale = Vector3(s1, s1, s1)
			mm.set_shader_parameter("opacity", 0.42 * maxf(0, fade))
			var s2: float = h.r * 0.96 * br
			fill.scale = Vector3(s2, s2, s2)
			fm.set_shader_parameter("opacity", 0.17 * maxf(0, fade))
		var hex := "#6ad65a" if h.hue else "#ff4a5e"
		if mesh.get_meta("hz", "") != hex:
			mesh.set_meta("hz", hex)
			mm.set_shader_parameter("color", Color(hex))
			fm.set_shader_parameter("color", Color(hex))

func _update_rings(g) -> void:
	var rings: Array = g.pools.rings.active
	for i in ringMeshes.size():
		var mesh: MeshInstance3D = ringMeshes[i]
		if i >= rings.size():
			mesh.visible = false
			continue
		var o = rings[i]
		mesh.visible = true
		var a: float = o.life / o.maxLife
		mesh.position = Vector3(o.x, 4, o.y)
		var s := maxf(0.1, o.r)
		mesh.scale = Vector3(s, s, s)
		var mat: ShaderMaterial = mesh.material_override
		mat.set_shader_parameter("opacity", a * 0.85)
		mat.set_shader_parameter("color", o.color)

func _update_bolts(g) -> void:
	var bolts = g.weapons.bolts if g.weapons else null
	if bolts == null: return
	for i in boltMeshes.size():
		var mesh: Node3D = boltMeshes[i]
		var b = bolts[i] if i < bolts.size() else null
		if b == null or b.life <= 0:
			mesh.visible = false
			continue
		mesh.visible = true
		var a: float = b.life / 0.28
		mesh.position = Vector3(b.x, 0, b.y)
		mesh.get_child(0).material_override.set_shader_parameter("opacity", 0.6 * a)
		mesh.get_child(1).material_override.set_shader_parameter("opacity", 0.6 * a)

func _update_bombs(g) -> void:
	var bombs: Array = g.pools.bombs.active
	for i in bombMeshes.size():
		var mesh: MeshInstance3D = bombMeshes[i]
		if i >= bombs.size():
			mesh.visible = false
			continue
		var b = bombs[i]
		mesh.visible = true
		mesh.position = Vector3(b.x, 8 + b.h, b.y)
		mesh.rotation.y = b.spin

func _update_orbit_blades(g) -> void:
	var W = g.weapons
	var lvl: int = W.lvl("bicak") if W else 0
	if not lvl:
		for m in bladeMeshes: m.visible = false
		return
	var conf = W.W.bicak
	var L := lvl - 1
	var n: int = conf.count[L]
	var R: float = conf.radius[L]
	var p = g.player
	for i in bladeMeshes.size():
		var mesh: MeshInstance3D = bladeMeshes[i]
		if i >= n:
			mesh.visible = false
			continue
		mesh.visible = true
		var a: float = W.orbitA + (float(i) / n) * TAU
		mesh.position = Vector3(p.x + cos(a) * R, 20, p.y + sin(a) * R)
		mesh.rotation.y = -a

func _add_bar(idx: int, x: float, y: float, z: float, width: float, height: float, frac: float, hex) -> int:
	if idx >= _hpMax: return idx
	var p := Vector3(x - width / 2, y, z)
	hpBg.set_mat(idx, (cam * Basis.from_scale(Vector3(width, height, 1))), p)
	hpFill.set_mat(idx, (cam * Basis.from_scale(Vector3(maxf(0.001, width * frac), height, 1))), p)
	var c: Color = (JS.col(hex) if hex is String else hex).srgb_to_linear()
	hpFill.set_col(idx, c.r, c.g, c.b)
	return idx + 1

func _update_hp_bars(g) -> void:
	var idx := 0
	var p = g.player
	if p.hp < p.maxHp - 0.5:
		var frac := maxf(0.0, p.hp / p.maxHp)
		var py: float = r3._heroTopY + 12
		idx = _add_bar(idx, p.x, py, p.y, 34, 5, frac, D.COLORS.gold if frac > 0.35 else D.COLORS.blood)
	for e in g.enemies.pool.active:
		if e.hp >= e.maxHp - 0.5 and not e.affix: continue
		var frac := maxf(0.0, e.hp / e.maxHp)
		if e.isBoss:
			idx = _add_bar(idx, e.x, r3.en.boss_top_y() + 16, e.y, 120, 7, frac, D.COLORS.blood)
		else:
			var scale: float = e.radius * (1.28 if e.elite else 1.0) / 15
			var top: float = e.mdlTop if (e.mdlTok == r3.en._tok and e.mdlTop) else 22 * scale
			var w := maxf(18.0, minf(48.0, top * 0.42))
			if e.affix:
				var ww := w * 1.25
				idx = _add_bar(idx, e.x, top + 8 + top * 0.07, e.y, ww, 5.5, frac, e.affixCol if e.affixCol else D.COLORS.blood)
				if e.shieldHp > 0: idx = _add_bar(idx, e.x, top + 15 + top * 0.07, e.y, ww, 2.5, e.shieldHp / e.shieldMax, "#cfd6e2")
			else:
				idx = _add_bar(idx, e.x, top + 8 + top * 0.07, e.y, w, 4.5, frac, D.COLORS.blood)
	hpBg.commit(idx)
	hpFill.commit(idx)
