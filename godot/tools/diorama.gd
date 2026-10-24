extends SceneTree
## Geliştirici aracı: dünya önizlemesi — gökte süzülen fantastik ADA dioraması.
## Üst yüz: oyunun kendi zemin dokusu (organik oval kenar); altında yontulu, sivrilen kaya gövde
## (düz gölgeli alçak poligon), dünya renginde parlayan kristaller ve yanda süzülen kaya
## parçaları; üstte o dünyanın objeleri ve üç düşmanı. Saydam PNG yazar.
## Çalıştırma (ekranlı): godot --path . -s res://tools/diorama.gd -- <çıktı_klasörü> [dünya...]

const W := 500.0      # ada üst yüz genişliği (oyun birimi, elips çapı)
const DP := 380.0     # derinlik (elips çapı)
const H := 70.0       # (eski blok) toprak yüksekliği
const LIP := 10.0
const DEPTH := 330.0  # alt kaya gövdenin boyu
const OUT := Vector2i(1024, 1024)

func _init() -> void:
	var a := OS.get_cmdline_user_args()
	var out := a[0] if a.size() else "user://dio"
	DirAccess.make_dir_recursive_absolute(out)
	var worlds: Array = []
	for i in range(1, a.size()): worlds.append(int(a[i]))
	if worlds.is_empty(): worlds = range(1, 11)
	var meta: Dictionary = JSON.parse_string(FileAccess.get_file_as_string("res://assets/models/models_meta.json"))
	var wj: Dictionary = JSON.parse_string(FileAccess.get_file_as_string("res://data/raw/worlds.json"))
	for w in worlds:
		var wd: Dictionary = wj.WORLDS[w - 1]
		var img := await _render(w, wd, meta)
		img.save_png(out + "/w" + str(w) + ".png")
		print("yazıldı w", w)
	quit()

func _mat_col(c: Color) -> StandardMaterial3D:
	var m := StandardMaterial3D.new()
	m.albedo_color = c
	m.roughness = 1.0
	return m

func _unl(c: Color) -> StandardMaterial3D:
	var m := _mat_col(c)
	m.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	return m

func _box(sz: Vector3, pos: Vector3, mat: Material) -> MeshInstance3D:
	var mi := MeshInstance3D.new()
	var b := BoxMesh.new()
	b.size = sz
	mi.mesh = b
	mi.material_override = mat
	mi.position = pos
	return mi

## organik oval kenar: elips × yumuşak gürültü
func _outline_pts(rng: RandomNumberGenerator) -> PackedVector2Array:
	var P := PackedVector2Array()
	var n := 72
	var ph := [rng.randf() * TAU, rng.randf() * TAU, rng.randf() * TAU]
	for i in n:
		var a := i * TAU / n
		var k := 1.0 + 0.035 * sin(a * 3.0 + ph[0]) + 0.025 * sin(a * 5.0 + ph[1]) + 0.015 * sin(a * 9.0 + ph[2])
		P.append(Vector2(cos(a) * W * 0.5 * k, sin(a) * DP * 0.5 * k))
	return P

func _island_top(rim: PackedVector2Array, img: Image) -> MeshInstance3D:
	var st := SurfaceTool.new()
	st.begin(Mesh.PRIMITIVE_TRIANGLES)
	var n := rim.size()
	for i in n:
		var a: Vector2 = rim[i]
		var b: Vector2 = rim[(i + 1) % n]
		for v in [Vector2.ZERO, a, b]:
			st.set_uv(Vector2(v.x / W + 0.5, v.y / DP + 0.5))
			st.set_normal(Vector3.UP)
			st.add_vertex(Vector3(v.x, 0.4, v.y))
	var mi := MeshInstance3D.new()
	mi.mesh = st.commit()
	var m := StandardMaterial3D.new()
	m.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	m.albedo_texture = ImageTexture.create_from_image(img)
	m.texture_repeat = false
	m.cull_mode = BaseMaterial3D.CULL_DISABLED
	mi.material_override = m
	return mi

## alt gövde: zemin rengi toprak kuşağı + aşağı sivrilen yontulu kaya halkaları (düz gölge)
func _island_body(rim: PackedVector2Array, ground: Color, tint: Color, rng: RandomNumberGenerator) -> MeshInstance3D:
	var n := rim.size()
	var K := 7
	var rings: Array = []
	var soil := ground.darkened(0.5).lerp(Color("#3a281c"), 0.4)
	var rock_hi := Color("#6e626c").lerp(tint, 0.14)
	var rock_lo := Color("#1e1822").lerp(tint, 0.1)
	for k in K + 1:
		var t := float(k) / K
		var y := -2.0 - (14.0 if k >= 1 else 0.0) - DEPTH * pow(maxf(0.0, t - 0.08) / 0.92, 1.1) * (1.0 if k >= 1 else 0.0)
		var sc := 1.0 if k == 0 else (1.03 if k == 1 else _body_sc(t))
		var R := []
		for i in n:
			var jit := 1.0 if k <= 1 else 1.0 + rng.randf_range(-0.10, 0.10)
			var v: Vector2 = rim[i] * sc * jit
			R.append(Vector3(v.x, y + (rng.randf_range(-10, 10) if k > 1 and k < K else 0.0), v.y))
		rings.append(R)
	var st := SurfaceTool.new()
	st.begin(Mesh.PRIMITIVE_TRIANGLES)
	st.set_smooth_group(-1)
	for k in K:
		for i in n:
			var a: Vector3 = rings[k][i]
			var b: Vector3 = rings[k][(i + 1) % n]
			var c: Vector3 = rings[k + 1][(i + 1) % n]
			var d: Vector3 = rings[k + 1][i]
			var col: Color = soil if k == 0 else rock_hi.lerp(rock_lo, float(k) / K)
			if k > 0: col = col.lightened(rng.randf_range(-0.05, 0.07) + (0.06 if k % 2 == 0 else -0.04))
			st.set_color(col)
			st.add_vertex(a); st.add_vertex(b); st.add_vertex(c)
			st.add_vertex(a); st.add_vertex(c); st.add_vertex(d)
	# dip ucu
	var tip := Vector3(0, -DEPTH * 1.08, 0)
	for i in n:
		st.set_color(rock_lo)
		st.add_vertex(rings[K][i]); st.add_vertex(rings[K][(i + 1) % n]); st.add_vertex(tip)
	st.generate_normals()
	var mi := MeshInstance3D.new()
	mi.mesh = st.commit()
	var m := StandardMaterial3D.new()
	m.vertex_color_use_as_albedo = true
	m.roughness = 1.0
	m.cull_mode = BaseMaterial3D.CULL_DISABLED
	mi.material_override = m
	return mi

## gövde yarıçap çarpanı (t: 0 üst → 1 dip): önce dolgun, sonra sivrilir
static func _body_sc(t: float) -> float:
	var u := clampf((t - 0.14) / 0.86, 0.0, 1.0)
	return (1.0 - pow(u, 1.0)) * 0.97 + 0.03 - 0.12 * sin(u * PI) * -1.0 * 0.0 + 0.10 * sin(u * PI) * (1.0 - u)

## gövdeden dışarı-aşağı uzanan parlayan kristal kümesi
func _crystal(rim: PackedVector2Array, col: Color, rng: RandomNumberGenerator, i: int) -> Node3D:
	var root := Node3D.new()
	# gövde yüzeyine otur: kameraya bakan yarı (z > 0), derinlik t'de gövde yarıçapı
	var a := PI * (0.12 + 0.76 * (i + rng.randf_range(0.1, 0.9)) / 6.0)
	var ri := int(posmod(int(a / TAU * rim.size()), rim.size()))
	var e: Vector2 = rim[ri]
	var t := rng.randf_range(0.3, 0.7)
	var sc := _body_sc(t)
	root.position = Vector3(e.x * sc * 0.93, -16.0 - DEPTH * pow((t - 0.08) / 0.92, 1.1), e.y * sc * 0.93)
	var m := StandardMaterial3D.new()
	m.albedo_color = col.darkened(0.2)
	m.emission_enabled = true
	m.emission = col
	m.emission_energy_multiplier = 0.9
	m.roughness = 0.3
	for j in 3:
		var c := MeshInstance3D.new()
		var cm := CylinderMesh.new()
		var h := rng.randf_range(34, 70) * (1.0 if j == 0 else 0.6)
		cm.top_radius = 0.0
		cm.bottom_radius = rng.randf_range(7, 12) * (1.0 if j == 0 else 0.7)
		cm.height = h
		cm.radial_segments = 5
		cm.rings = 1
		c.mesh = cm
		c.material_override = m
		var out := Vector3(e.x, 0, e.y).normalized()
		var tiltv := (out * 1.1 + Vector3(0, -0.55, 0) + Vector3(rng.randf_range(-0.35, 0.35), rng.randf_range(-0.2, 0.2), rng.randf_range(-0.25, 0.25))).normalized()
		var bas := Basis(Quaternion(Vector3.UP, tiltv))
		c.transform = Transform3D(bas, tiltv * h * 0.45)
		root.add_child(c)
	return root

## yanda süzülen küçük kaya parçası
func _float_rock(tint: Color, rng: RandomNumberGenerator, i: int) -> MeshInstance3D:
	var mi := MeshInstance3D.new()
	var sm := SphereMesh.new()
	var r := rng.randf_range(20, 34)
	sm.radius = r
	sm.height = r * 1.5
	sm.radial_segments = 6
	sm.rings = 3
	mi.mesh = sm
	var m := StandardMaterial3D.new()
	m.albedo_color = Color("#6a5a68").lerp(tint, 0.25)
	m.roughness = 1.0
	mi.material_override = m
	var side := -1.0 if i % 2 == 0 else 1.0
	mi.position = Vector3(side * W * rng.randf_range(0.5, 0.56), -DEPTH * rng.randf_range(0.2, 0.5), rng.randf_range(0, 90))
	mi.rotation = Vector3(rng.randf() * TAU, rng.randf() * TAU, 0)
	mi.scale = Vector3(1, 0.7, 1)
	return mi

func _render(w: int, wd: Dictionary, meta: Dictionary) -> Image:
	var floor_id: String = wd.floor
	# oyunun çizgi roman ışığı (Render3D._build_lights ile aynı globaller; dünya ay/kontur rengi)
	RenderingServer.global_shader_parameter_set("r3_hemi_sky", Shd.lin3(Color("#6f7590"), 1.55))
	RenderingServer.global_shader_parameter_set("r3_hemi_ground", Shd.lin3(Color("#221d22"), 1.55))
	RenderingServer.global_shader_parameter_set("r3_ambient", Shd.lin3(Color("#8f94ae"), 0.65))
	RenderingServer.global_shader_parameter_set("r3_rim_dir", Vector3(320, 160, 260).normalized())
	RenderingServer.global_shader_parameter_set("r3_moon_col", Shd.lin3(Color("#fbf6f0").srgb_to_linear().lerp(Color(wd.moon[0]).srgb_to_linear(), 0.12).linear_to_srgb(), 1.75))
	RenderingServer.global_shader_parameter_set("r3_rim_col", Shd.lin3(Color(wd.color), 0.3))
	RenderingServer.global_shader_parameter_set("r3_moon_dir", Vector3(-260, 420, 380).normalized())
	var vp := SubViewport.new()
	vp.size = OUT
	vp.transparent_bg = true
	vp.own_world_3d = true
	vp.msaa_3d = Viewport.MSAA_4X
	vp.render_target_update_mode = SubViewport.UPDATE_ALWAYS
	get_root().add_child(vp)
	var env := WorldEnvironment.new()
	env.environment = Environment.new()
	env.environment.background_mode = Environment.BG_CLEAR_COLOR
	env.environment.ambient_light_source = Environment.AMBIENT_SOURCE_COLOR
	env.environment.ambient_light_color = Color(0.86, 0.82, 0.92)
	env.environment.ambient_light_energy = 0.95
	env.environment.tonemap_mode = Environment.TONE_MAPPER_LINEAR
	vp.add_child(env)
	var sun := DirectionalLight3D.new()
	sun.rotation_degrees = Vector3(-52, -38, 0)
	sun.light_energy = 1.35
	sun.light_color = Color(1.0, 0.94, 0.84)
	sun.shadow_enabled = true
	sun.directional_shadow_max_distance = 3000
	vp.add_child(sun)
	var back := DirectionalLight3D.new()       # dünya renginde arka kontur
	back.rotation_degrees = Vector3(-18, 160, 0)
	back.light_energy = 0.9
	back.light_color = Color(wd.color).lightened(0.25)
	vp.add_child(back)
	var S := Node3D.new()
	vp.add_child(S)
	var rng := RandomNumberGenerator.new()
	rng.seed = w * 7919

	# ── blok: zemin dilimi (dünya dokusu) + toprak gövde + alt taş kuşak ──
	var moon: Array = wd.get("moon", ["#888", "#666", "#444", "#222"])
	var dirt := Color("#4a3426").lerp(Color(moon[2]), 0.22)
	var tex: Texture2D = load("res://assets/arena/w" + str(w) + "/detail.png")
	# üst yüz dokusu: oyun zemini gibi makro renk × ayrıntı/orta (shaders/ground.gdshader), arena ortasından
	var lay0: Dictionary = JSON.parse_string(FileAccess.get_file_as_string("res://assets/arena/w" + str(w) + "/layout.json"))
	var full: float = float(lay0.play) + 2.0 * float(lay0.border)
	var mimg: Image = (load("res://assets/arena/w" + str(w) + "/macro.png") as Texture2D).get_image()
	var dimg: Image = tex.get_image()
	for im in [mimg, dimg]:
		if im.is_compressed(): im.decompress()
	var PX := 700
	var PY := int(PX * DP / W)
	var top := Image.create(PX, PY, false, Image.FORMAT_RGB8)
	var mid := float(lay0.get("detailMid", 0.216))
	var mw := mimg.get_width()
	var dw := dimg.get_width()
	for y in PY:
		for x in PX:
			var ux := (float(x) / PX - 0.5) * W
			var uz := (float(y) / PY - 0.5) * DP
			var mc := mimg.get_pixel(clampi(int((ux / full + 0.5) * mw), 0, mw - 1), clampi(int((uz / full + 0.5) * mw), 0, mw - 1)).srgb_to_linear()
			var dc := dimg.get_pixel(posmod(int(ux / 900.0 * dw), dw), posmod(int(uz / 900.0 * dw), dw)).srgb_to_linear()
			var k := Color(0.1 + 0.9 * dc.r / mid, 0.1 + 0.9 * dc.g / mid, 0.1 + 0.9 * dc.b / mid)
			# kenara doğru hafif koyulaşma (hacim)
			var e := Vector2(ux / (W * 0.5), uz / (DP * 0.5)).length()
			var lit := 1.8 * (1.0 - 0.28 * clampf((e - 0.55) / 0.45, 0.0, 1.0))
			top.set_pixel(x, y, Color(mc.r * k.r * lit, mc.g * k.g * lit, mc.b * k.b * lit).linear_to_srgb())
	var rim := _outline_pts(rng)
	S.add_child(_island_top(rim, top))
	var gc := top.get_pixel(PX / 2, PY / 2)
	S.add_child(_island_body(rim, gc, Color(moon[2]), rng))
	var wc := Color(wd.color)
	for i in 6: S.add_child(_crystal(rim, wc, rng, i))
	for i in 3: S.add_child(_float_rock(Color(moon[2]), rng, i))

	# ── objeler: dünyanın en sık büyük objeleri arkaya/yanlara, küçük süsler üste ──
	var lay: Dictionary = JSON.parse_string(FileAccess.get_file_as_string("res://assets/arena/w" + str(w) + "/layout.json"))
	var cnt := {}
	for p in lay.props: cnt[p.kind] = int(cnt.get(p.kind, 0)) + 1
	var kinds := cnt.keys()
	kinds.sort_custom(func(a, b): return cnt[a] > cnt[b])
	var grain: Texture2D = load("res://assets/fx/prop_grain.png")
	var prop_mat := Shd.basic({"map": "srgb", "repeat": true, "tex": grain})
	prop_mat.next_pass = Shd.outline(null, Color(0.5, 0.45, 0.42), 1.6)
	var deco_mat := Shd.basic({"map": "srgb", "repeat": true, "tex": grain})
	var props_scn: PackedScene = load("res://assets/arena/props_" + floor_id + ".glb")
	var props_root: Node = props_scn.instantiate() if props_scn else null
	var slots := [Vector3(-W * 0.30, 0, -DP * 0.24), Vector3(W * 0.29, 0, -DP * 0.22), Vector3(-W * 0.06, 0, -DP * 0.36),
		Vector3(W * 0.36, 0, DP * 0.10), Vector3(-W * 0.37, 0, DP * 0.08), Vector3(W * 0.12, 0, -DP * 0.33)]
	var si := 0
	for k in kinds.slice(0, 4):
		var src: Node3D = props_root.find_child(k, true, false) if props_root else null
		if src == null: continue
		var reps := 2 if si < 2 else 1
		for r in reps:
			if si >= slots.size(): break
			var m := src.duplicate() as Node3D
			m.transform = Transform3D(Basis(Vector3.UP, rng.randf_range(-0.6, 0.6)), slots[si])
			S.add_child(m)
			for mi in [m] + m.find_children("*", "MeshInstance3D", true, false):
				if mi is MeshInstance3D: (mi as MeshInstance3D).material_override = prop_mat
			si += 1
	var dcnt := {}
	for p in lay.decor: dcnt[p.get("kind", "")] = int(dcnt.get(p.get("kind", ""), 0)) + 1
	var dk := dcnt.keys()
	dk.sort_custom(func(a, b): return dcnt[a] > dcnt[b])
	var decor_scn: PackedScene = load("res://assets/arena/decor_" + floor_id + ".glb")
	var decor_root: Node = decor_scn.instantiate() if decor_scn else null
	var meta_a: Dictionary = JSON.parse_string(FileAccess.get_file_as_string("res://assets/arena/arena_meta.json"))
	for i in 34:
		var k: String = dk[i % mini(3, dk.size())] if dk.size() else ""
		var src2: Node3D = decor_root.find_child(k, true, false) if decor_root else null
		if src2 == null: continue
		var m2 := src2.duplicate() as Node3D
		var aa := rng.randf() * TAU
		var rr := sqrt(rng.randf_range(0.35, 0.86))
		var p := Vector3(cos(aa) * rr * W * 0.5, 0, sin(aa) * rr * DP * 0.5)
		if absf(p.x) < W * 0.22 and absf(p.z) < DP * 0.2: continue   # orta sahne (düşmanlar) boş kalsın
		var sc: float = float(meta_a.decorScale.get(k, 2.0))
		m2.transform = Transform3D(Basis(Vector3.UP, rng.randf() * TAU).scaled(Vector3.ONE * sc), p)
		S.add_child(m2)
		for mi in [m2] + m2.find_children("*", "MeshInstance3D", true, false):
			if mi is MeshInstance3D: (mi as MeshInstance3D).material_override = deco_mat

	# ── düşmanlar: muhafız ortada geride, sürü solda, atıcı sağda; kameraya dönük ──
	var by_type := {}
	for id in meta.enemies:
		var e: Dictionary = meta.enemies[id]
		if e.floor == floor_id:
			for t in e.types: by_type[t] = e
	var place := {"muhafiz": Vector3(0, 0, -DP * 0.06), "agir": Vector3(0, 0, -DP * 0.06), "zombi": Vector3(-W * 0.18, 0, DP * 0.13),
		"atici": Vector3(W * 0.18, 0, DP * 0.11), "patlayici": Vector3(W * 0.18, 0, DP * 0.11), "kral": Vector3(0, 0, -DP * 0.06)}
	var used := {}
	for t in ["muhafiz", "agir", "kral", "zombi", "atici", "patlayici"]:
		if not by_type.has(t): continue
		var pos: Vector3 = place[t]
		if used.has(pos): continue
		used[pos] = true
		var e: Dictionary = by_type[t]
		var ps: PackedScene = load("res://assets/models/" + str(e.file))
		if ps == null: continue
		var inst := ps.instantiate() as Node3D
		var holder := Node3D.new()
		holder.position = pos
		var bs := float(e.get("baseScale", 50.0)) * 1.15
		inst.scale = Vector3.ONE * bs
		var rp: Array = e.get("rigPos", [0, 0, 0])
		inst.position = Vector3(float(rp[0]), float(rp[1]), float(rp[2])) * bs
		holder.rotation.y = rng.randf_range(-0.35, 0.35)
		holder.add_child(inst)
		S.add_child(holder)
		Shd.convert_tree(inst, {"lift": float(e.get("lift", 0.5)), "rough_max": 0.48, "metal_min": 0.08, "metal_max": 0.22, "rim": true, "emissive_k": 1.0, "outline": 2.0})
		var ap := inst.find_child("AnimationPlayer", true, false) as AnimationPlayer
		if ap and ap.get_animation_list().size():
			ap.play(ap.get_animation_list()[0])
			ap.seek(0.25 + rng.randf() * 0.3, true)
			ap.pause()

	# ── kamera: ortografik, önden ~34° yukarıdan (CR arena kartı) ──
	var cam := Camera3D.new()
	cam.projection = Camera3D.PROJECTION_ORTHOGONAL
	cam.size = W * 1.3
	cam.keep_aspect = Camera3D.KEEP_WIDTH
	var pitch := deg_to_rad(36.0)
	var tgt := Vector3(0, -DEPTH * 0.32, 0)
	cam.far = 6000
	vp.add_child(cam)
	cam.look_at_from_position(tgt + Vector3(0, sin(pitch), cos(pitch)) * 2000.0, tgt)
	cam.current = true
	for i in 10: await process_frame
	var img := vp.get_texture().get_image()
	img.convert(Image.FORMAT_RGBA8)
	vp.queue_free()
	if props_root: props_root.free()
	if decor_root: decor_root.free()
	return img
