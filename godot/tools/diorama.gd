extends SceneTree
## Geliştirici aracı: dünya seçim kartları için Clash Royale arenası tarzı diorama çizer.
## Dünyanın zemin dokusuyla kaplı bir blok + toprak yan yüzler + o dünyanın objeleri ve üç
## düşmanı; ortografik, önden-yukarıdan. Saydam PNG yazar (kontur/plaka UI'da eklenir).
## Çalıştırma (ekranlı): godot --path . -s res://tools/diorama.gd -- <çıktı_klasörü> [dünya...]

const W := 470.0      # blok genişliği (oyun birimi)
const DP := 360.0     # derinlik
const H := 70.0       # toprak yüksekliği
const LIP := 10.0     # zemin dilimi kalınlığı
const OUT := Vector2i(1024, 840)

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
	env.environment.ambient_light_color = Color(0.78, 0.76, 0.84)
	env.environment.ambient_light_energy = 0.75
	env.environment.tonemap_mode = Environment.TONE_MAPPER_LINEAR
	vp.add_child(env)
	var sun := DirectionalLight3D.new()
	sun.rotation_degrees = Vector3(-52, -38, 0)
	sun.light_energy = 1.25
	sun.shadow_enabled = true
	sun.directional_shadow_max_distance = 3000
	vp.add_child(sun)
	var S := Node3D.new()
	vp.add_child(S)
	var rng := RandomNumberGenerator.new()
	rng.seed = w * 7919

	# ── blok: zemin dilimi (dünya dokusu) + toprak gövde + alt taş kuşak ──
	var moon: Array = wd.get("moon", ["#888", "#666", "#444", "#222"])
	var dirt := Color("#4a3426").lerp(Color(moon[2]), 0.22)
	var top_m := StandardMaterial3D.new()
	var tex: Texture2D = load("res://assets/arena/w" + str(w) + "/detail.png")
	top_m.albedo_texture = tex
	top_m.uv1_scale = Vector3(W / 900.0 * 3.0, DP / 900.0 * 2.0, 1)   # kutu UV: 3x2 yüz atlası
	top_m.roughness = 1.0
	S.add_child(_box(Vector3(W, H, DP), Vector3(0, -LIP - H * 0.5, 0), _mat_col(dirt)))
	var lip_m := _mat_col(dirt.lightened(0.18))
	lip_m.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	S.add_child(_box(Vector3(W + 6, LIP, DP + 6), Vector3(0, -LIP * 0.5, 0), lip_m))
	# üst yüz: oyun zemini gibi makro renk × ayrıntı/orta (shaders/ground.gdshader), arena ortasından
	var lay0: Dictionary = JSON.parse_string(FileAccess.get_file_as_string("res://assets/arena/w" + str(w) + "/layout.json"))
	var full: float = float(lay0.play) + 2.0 * float(lay0.border)
	var mimg: Image = (load("res://assets/arena/w" + str(w) + "/macro.png") as Texture2D).get_image()
	var dimg: Image = tex.get_image()
	for im in [mimg, dimg]:
		if im.is_compressed(): im.decompress()
	var PX := 640
	var PY := int(PX * (DP + 6) / (W + 6))
	var top := Image.create(PX, PY, false, Image.FORMAT_RGB8)
	var mid := float(lay0.get("detailMid", 0.216))
	var mw := mimg.get_width()
	var dw := dimg.get_width()
	for y in PY:
		for x in PX:
			var ux := (float(x) / PX - 0.5) * (W + 6)     # oyun birimi (arena merkezine göre)
			var uz := (float(y) / PY - 0.5) * (DP + 6)
			var mc := mimg.get_pixel(clampi(int((ux / full + 0.5) * mw), 0, mw - 1), clampi(int((uz / full + 0.5) * mw), 0, mw - 1)).srgb_to_linear()
			var dc := dimg.get_pixel(posmod(int(ux / 900.0 * dw), dw), posmod(int(uz / 900.0 * dw), dw)).srgb_to_linear()
			var k := Color(0.1 + 0.9 * dc.r / mid, 0.1 + 0.9 * dc.g / mid, 0.1 + 0.9 * dc.b / mid)
			top.set_pixel(x, y, Color(mc.r * k.r * 1.25, mc.g * k.g * 1.25, mc.b * k.b * 1.25).linear_to_srgb())
	var plane := MeshInstance3D.new()
	var pm := PlaneMesh.new()
	pm.size = Vector2(W + 6, DP + 6)
	plane.mesh = pm
	var tm := StandardMaterial3D.new()
	tm.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	tm.albedo_texture = ImageTexture.create_from_image(top)
	plane.material_override = tm
	plane.position = Vector3(0, 0.3, 0)
	S.add_child(plane)
	S.add_child(_box(Vector3(W + 8, 3, DP + 8), Vector3(0, -LIP - 1.5, 0), _mat_col(Color(0.06, 0.04, 0.05))))
	S.add_child(_box(Vector3(W + 14, 14, DP + 14), Vector3(0, -LIP - H - 7, 0), _unl(Color("#2a2230").lerp(Color(moon[3]), 0.3))))
	# toprak yüzünde taş/kök lekeleri (düz yüz ölü durmasın)
	for i in 4:
		var bm := _mat_col(dirt.lightened(0.06 - i * 0.1) if i > 0 else dirt)
		bm.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
		S.add_child(_box(Vector3(W + 1, H / 4.0, 2), Vector3(0, -LIP - H / 8.0 - i * H / 4.0, DP * 0.5 + 0.5), bm))


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
	var slots := [Vector3(-W * 0.38, 0, -DP * 0.30), Vector3(W * 0.36, 0, -DP * 0.28), Vector3(-W * 0.12, 0, -DP * 0.40),
		Vector3(W * 0.40, 0, DP * 0.18), Vector3(-W * 0.42, 0, DP * 0.16), Vector3(W * 0.14, 0, -DP * 0.38)]
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
	for i in 26:
		var k: String = dk[i % mini(3, dk.size())] if dk.size() else ""
		var src2: Node3D = decor_root.find_child(k, true, false) if decor_root else null
		if src2 == null: continue
		var m2 := src2.duplicate() as Node3D
		var p := Vector3(rng.randf_range(-W * 0.47, W * 0.47), 0, rng.randf_range(-DP * 0.46, DP * 0.46))
		if absf(p.x) < W * 0.28 and p.z > -DP * 0.15: p.z = DP * 0.42   # orta sahne (düşmanlar) boş kalsın
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
	var place := {"muhafiz": Vector3(0, 0, -DP * 0.08), "agir": Vector3(0, 0, -DP * 0.08), "zombi": Vector3(-W * 0.2, 0, DP * 0.14),
		"atici": Vector3(W * 0.2, 0, DP * 0.12), "patlayici": Vector3(W * 0.2, 0, DP * 0.12), "kral": Vector3(0, 0, -DP * 0.08)}
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
		var bs := float(e.get("baseScale", 50.0)) * 1.3
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
	cam.size = W * 1.12
	cam.keep_aspect = Camera3D.KEEP_WIDTH
	var pitch := deg_to_rad(40.0)
	var tgt := Vector3(0, 10, 0)
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
