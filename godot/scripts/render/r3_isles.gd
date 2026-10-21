class_name R3Isles
extends Node3D
## Arena dışındaki uçurumda süzülen kaya adacıkları (çizgi roman, düz yüzlü + mürekkep kontur).
## Altlarında üç derinlikte boyanmış çizgi film bulutları (cloud.gdshader) yavaşça akar →
## gerçek paralaks. Üst yüzün rengi arenanın zemin dokusundan, kaya ve bulutlar dünya paletinden.

const COUNT := 22
var _isles: Array = []        # [{n, y0, ph, sp, rs}]
var _clouds: Array = []       # [{n, vx}]
var _cmats: Array = []
var _cbox := Rect2()
var _mat: ShaderMaterial
var _ink: ShaderMaterial
var _arena := Vector4.ZERO

func _init() -> void:
	name = "Isles"
	_mat = ShaderMaterial.new()
	_mat.shader = load("res://shaders/isle.gdshader")
	_ink = ShaderMaterial.new()
	_ink.shader = load("res://shaders/ink_hull.gdshader")
	_ink.set_shader_parameter("width", 3.2)
	_mat.next_pass = _ink

## bulut paleti (dünya değişince)
func set_cloud_colors(sh: Color, body: Color, hi: Color, ink: Color, deep: Color) -> void:
	if _cmats.is_empty():
		for i in 4:
			var m := ShaderMaterial.new()
			m.shader = load("res://shaders/cloud.gdshader")
			m.set_shader_parameter("map", load("res://assets/fx/clouds/cloud%d.png" % i))
			_cmats.append(m)
	for m in _cmats:
		m.set_shader_parameter("c_shadow", sh)
		m.set_shader_parameter("c_body", body)
		m.set_shader_parameter("c_hi", hi)
		m.set_shader_parameter("c_ink", ink)
		m.set_shader_parameter("c_deep", deep)

## arena ve dünya renkleri değişince yeniden kurulur
func build(A: Vector4, top: Color, rock: Color, deep: Color, seed_: int) -> void:
	for it in _isles: (it.n as Node).queue_free()
	_isles.clear()
	for it in _clouds: (it.n as Node).queue_free()
	_clouds.clear()
	_arena = A
	_mat.set_shader_parameter("c_deep", deep)
	_ink.set_shader_parameter("ink", deep.darkened(0.6))
	var rng := RandomNumberGenerator.new()
	rng.seed = seed_
	var cx := A.x + A.z * 0.5
	var cz := A.y + A.w * 0.5
	var hw := A.z * 0.5
	var hh := A.w * 0.5
	for i in COUNT:
		# kenar boyunca dağıt: önce bir kenar, sonra kenara uzaklık (yakın olanlar daha sık)
		var side := i % 4
		var along := rng.randf_range(-1.05, 1.05)
		var off := 90.0 + pow(rng.randf(), 1.6) * 1300.0
		var x := 0.0
		var z := 0.0
		match side:
			0: x = cx + along * hw; z = cz - hh - off
			1: x = cx + along * hw; z = cz + hh + off
			2: x = cx - hw - off; z = cz + along * hh
			3: x = cx + hw + off; z = cz + along * hh
		var r := rng.randf_range(45.0, 150.0) * (1.0 + off / 1400.0 * 0.6)
		var y := -rng.randf_range(90.0, 260.0) - off * rng.randf_range(0.15, 0.45)
		var mi := MeshInstance3D.new()
		mi.mesh = _isle_mesh(rng, r, top, rock)
		mi.material_override = _mat
		mi.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
		mi.extra_cull_margin = 400.0
		mi.position = Vector3(x, y, z)
		mi.rotation.y = rng.randf() * TAU
		add_child(mi)
		_isles.append({"n": mi, "y0": y, "ph": rng.randf() * TAU, "sp": rng.randf_range(0.25, 0.5), "rs": rng.randf_range(-0.03, 0.03)})
	_build_clouds(rng, cx, cz, hw, hh)

## arena çevresinde geniş bir halka (kenardan 2600'e); üç derinlik: yakın küçük ve hızlı,
## uzak büyük, yavaş ve sise gömük. Doğuya akar, halkanın sonunda batıya sarılır.
func _build_clouds(rng: RandomNumberGenerator, cx: float, cz: float, hw: float, hh: float) -> void:
	if _cmats.is_empty(): return
	var R := 2600.0
	_cbox = Rect2(cx - hw - R, cz - hh - R, (hw + R) * 2.0, (hh + R) * 2.0)
	var pm := PlaneMesh.new()
	pm.size = Vector2(1, 1)
	# katmanlı yerleşim: kenar boyunca eşit aralıklı (boşluk kalmasın) + titreşim
	# [derinlik, boyut aralığı, kenardan uzaklık aralığı, aralık, hız]
	var tiers := [[-170.0, Vector2(380, 640), Vector2(-150, 380), 470.0 * (1.5 if Quality.tier == "low" else 1.0), 16.0],
		[-520.0, Vector2(640, 1000), Vector2(250, 1200), 760.0, 10.0],
		[-1100.0, Vector2(1000, 1500), Vector2(900, 2600), 1150.0, 6.0]]
	if Quality.tier == "low": tiers.resize(2)          # düşük kademe: en uzak kat yok (dolum maliyeti)
	for T in tiers:
		var step_: float = T[3]
		for side in 4:
			var len_: float = (hw if side < 2 else hh) * 2.0 + 2.0 * float((T[2] as Vector2).y)
			var n := int(len_ / step_)
			for k in n:
				var along := -len_ * 0.5 + (float(k) + rng.randf_range(0.15, 0.85)) * step_
				var off := rng.randf_range((T[2] as Vector2).x, (T[2] as Vector2).y)
				var x := 0.0
				var z := 0.0
				match side:
					0: x = cx + along; z = cz - hh - off
					1: x = cx + along; z = cz + hh + off
					2: x = cx - hw - off; z = cz + along
					_: x = cx + hw + off; z = cz + along
				_add_cloud(rng, pm, x, float(T[0]) + rng.randf_range(-60.0, 60.0), z, rng.randf_range((T[1] as Vector2).x, (T[1] as Vector2).y), float(T[4]))

func _add_cloud(rng: RandomNumberGenerator, pm: PlaneMesh, x: float, y: float, z: float, sz: float, spd: float) -> void:
	var mi := MeshInstance3D.new()
	mi.mesh = pm
	mi.material_override = _cmats[rng.randi() % 4]
	mi.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	mi.position = Vector3(x, y, z)
	mi.scale = Vector3(sz, 1, sz * rng.randf_range(0.8, 1.0))
	if rng.randf() < 0.5: mi.scale.x = -mi.scale.x          # ayna: daha az tekrar
	mi.sorting_offset = y                                    # yakın kat üstte çizilir
	add_child(mi)
	_clouds.append({"n": mi, "vx": spd * rng.randf_range(0.7, 1.3)})

func update(t: float, dt: float) -> void:
	for it in _clouds:
		var c: Node3D = it.n
		c.position.x += float(it.vx) * dt
		if c.position.x > _cbox.end.x: c.position.x = _cbox.position.x
	for it in _isles:
		var n: Node3D = it.n
		n.position.y = float(it.y0) + sin(t * float(it.sp) + float(it.ph)) * 9.0
		n.rotation.y += float(it.rs) * dt

## düz yüzlü adacık: düzensiz üst çokgen, kısa yan şerit, iki halkalı sivri kaya gövde
static func _isle_mesh(rng: RandomNumberGenerator, r: float, top: Color, rock: Color) -> ArrayMesh:
	var seg := 9 + rng.randi() % 4
	var rings := []     # her halka: [nokta dizisi, renk]
	var lip := []
	var mid := []
	var low := []
	var cy := -0.45 * r                    # gövde merkezi (kontur merkezden şişer)
	for i in seg:
		var a := TAU * float(i) / seg + rng.randf_range(-0.18, 0.18)
		var rr := r * rng.randf_range(0.78, 1.08)
		var p := Vector3(cos(a) * rr, 0.0, sin(a) * rr)
		rings.append(p + Vector3(0, rng.randf_range(-0.03, 0.05) * r - cy, 0))
		lip.append(p * 0.97 + Vector3(0, -0.16 * r - cy, 0))
		mid.append(p * rng.randf_range(0.55, 0.68) + Vector3(0, -0.62 * r * rng.randf_range(0.85, 1.15) - cy, 0))
		low.append(p * rng.randf_range(0.18, 0.3) + Vector3(0, -1.05 * r * rng.randf_range(0.85, 1.2) - cy, 0))
	var tip := Vector3(rng.randf_range(-0.1, 0.1) * r, -1.45 * r - cy, rng.randf_range(-0.1, 0.1) * r)
	var st := SurfaceTool.new()
	st.begin(Mesh.PRIMITIVE_TRIANGLES)
	var ctop := Vector3(0, 0.04 * r - cy, 0)
	var tc := top
	var top2 := top.lightened(0.08)
	for i in seg:
		var j := (i + 1) % seg
		# üst yüz (yelpaze)
		_tri(st, ctop, rings[j], rings[i], top2 if i % 2 else tc)
		# üst dudak (zemin rengi, koyu)
		_quad(st, rings[i], rings[j], lip[j], lip[i], top.darkened(0.25))
		_quad(st, lip[i], lip[j], mid[j], mid[i], rock)
		_quad(st, mid[i], mid[j], low[j], low[i], rock.darkened(0.22))
		_tri(st, low[i], low[j], tip, rock.darkened(0.42))
	st.generate_normals()
	return st.commit()

static func _tri(st: SurfaceTool, a: Vector3, b: Vector3, c: Vector3, col: Color) -> void:
	st.set_smooth_group(-1)
	for v in [a, c, b]:          # Godot: ön yüz saat yönünde
		st.set_color(col)
		st.add_vertex(v)

static func _quad(st: SurfaceTool, a: Vector3, b: Vector3, c: Vector3, d: Vector3, col: Color) -> void:
	_tri(st, a, b, c, col)
	_tri(st, a, c, d, col)
