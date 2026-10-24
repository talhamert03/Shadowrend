extends SceneTree
## Geliştirici aracı: dünya önizlemesi — Clash Royale arenası gibi SİMETRİK, çerçeveli arena.
## Kalın taş kaide üstünde oyunun kendi zemin dokusu (makro × ayrıntı); çevresinde alçak blok
## duvar, dört köşede dünya renginde meşaleli kule, arkada kemerli kapı, köşelerde dünyanın kendi
## engelleri (ağaç, mezar taşı…) ayna simetrisiyle, ortada sönük parlayan dünya mührü. Düşman yok.
## Çıktı: assets/ui/arena/w<n>.png (saydam, 1200×1000).
## Çalıştırma (ekranlı): godot --path . -s res://tools/diorama.gd -- <çıktı_klasörü> [dünya...]

const OUT := Vector2i(1200, 1000)
const AW := 560.0        # arena iç genişliği (oyun birimi)
const AD := 640.0        # arena iç derinliği
const WALL := 34.0       # duvar kalınlığı
const WH := 38.0         # duvar yüksekliği
const BASE := 64.0       # kaide kalınlığı
const GPX := 1024
const DECOR_SCALE := {"ot": 2.4, "cicek": 2.3, "tas": 2.1, "mum": 1.9, "mantar": 1.9, "saz": 1.8, "kazik": 1.35, "kristal": 2.1, "kor": 2.0, "kemikP": 2.0, "disliP": 1.9, "yaprakP": 2.3, "kar": 2.1, "nilufer": 2.3}

var _stone: Material
var _stone_d: Material
var _trim: Material

func _init() -> void:
	var a := OS.get_cmdline_user_args()
	var out := a[0] if a.size() else "user://dio"
	DirAccess.make_dir_recursive_absolute(out)
	var worlds: Array = []
	for i in range(1, a.size()): worlds.append(int(a[i]))
	if worlds.is_empty(): worlds = range(1, 11)
	var wj: Dictionary = JSON.parse_string(FileAccess.get_file_as_string("res://data/raw/worlds.json"))
	for w in worlds:
		var wd: Dictionary = wj.WORLDS[w - 1]
		var img := await _render(w, wd)
		img.save_png(out + "/w" + str(w) + ".png")
		print("yazıldı w", w)
	quit()

## düz gölgeli taş malzemesi + çizgi roman konturu
var _noise: NoiseTexture2D

func _mat(c: Color, outline := true) -> Material:
	if _noise == null:
		var fn := FastNoiseLite.new()
		fn.frequency = 0.035
		fn.fractal_octaves = 4
		_noise = NoiseTexture2D.new()
		_noise.width = 256
		_noise.height = 256
		_noise.seamless = true
		_noise.noise = fn
		var gr := Gradient.new()
		gr.set_color(0, Color(0.72, 0.72, 0.72))
		gr.set_color(1, Color(1.0, 1.0, 1.0))
		_noise.color_ramp = gr
	var m := StandardMaterial3D.new()
	m.albedo_color = c
	m.albedo_texture = _noise
	m.uv1_triplanar = true
	m.uv1_scale = Vector3(0.02, 0.02, 0.02)
	m.roughness = 0.9
	if outline: m.next_pass = Shd.outline(null, c.darkened(0.6), 1.7)
	return m

func _box(sz: Vector3, pos: Vector3, mat: Material, rot := 0.0) -> MeshInstance3D:
	var bm := BoxMesh.new()
	bm.size = sz
	var mi := MeshInstance3D.new()
	mi.mesh = bm
	mi.material_override = mat
	mi.position = pos
	mi.rotation.y = rot
	return mi

func _cyl(r: float, h: float, pos: Vector3, mat: Material, seg := 8, r2 := -1.0) -> MeshInstance3D:
	var cm := CylinderMesh.new()
	cm.top_radius = r if r2 < 0 else r2
	cm.bottom_radius = r
	cm.height = h
	cm.radial_segments = seg
	cm.rings = 1
	var mi := MeshInstance3D.new()
	mi.mesh = cm
	mi.material_override = mat
	mi.position = pos
	return mi

## oyun zemini gibi: makro renk × (ayrıntı / orta değer), haritanın ortasından AW×AD
func _ground_img(w: int, lay: Dictionary) -> Image:
	var full: float = float(lay.play) + 2.0 * float(lay.border)
	var mimg: Image = (load("res://assets/arena/w" + str(w) + "/macro.png") as Texture2D).get_image()
	var dimg: Image = (load("res://assets/arena/w" + str(w) + "/detail.png") as Texture2D).get_image()
	for im in [mimg, dimg]:
		if im.is_compressed(): im.decompress()
	var mid := float(lay.get("detailMid", 0.216))
	var tile := float(lay.get("tile", 900.0)) * 0.7
	var mw := mimg.get_width()
	var dw := dimg.get_width()
	var GY := int(GPX * AD / AW)
	var img := Image.create(GPX, GY, false, Image.FORMAT_RGB8)
	for y in GY:
		var uz := (float(y) / GY - 0.5) * AD
		var my := clampi(int((uz / full + 0.5) * mw), 0, mw - 1)
		var dy := posmod(int(uz / tile * dw), dw)
		for x in GPX:
			var ux := (float(x) / GPX - 0.5) * AW
			var mc := mimg.get_pixel(clampi(int((ux / full + 0.5) * mw), 0, mw - 1), my).srgb_to_linear()
			var dc := dimg.get_pixel(posmod(int(ux / tile * dw), dw), dy).srgb_to_linear()
			var k := Color(0.1 + 0.9 * dc.r / mid, 0.1 + 0.9 * dc.g / mid, 0.1 + 0.9 * dc.b / mid)
			# duvar diplerinde ortam gölgesi (hacim)
			var ex := 1.0 - clampf((AW * 0.5 - absf(ux)) / 60.0, 0.0, 1.0)
			var ez := 1.0 - clampf((AD * 0.5 - absf(uz)) / 60.0, 0.0, 1.0)
			var ao := 1.0 - 0.42 * maxf(ex, ez)
			var lit := 1.25 * ao
			img.set_pixel(x, y, Color(mc.r * k.r * lit, mc.g * k.g * lit, mc.b * k.b * lit).linear_to_srgb())
	img.generate_mipmaps()
	return img

## dünyanın en sık engel türleri (büyükten küçüğe)
func _kinds(lay: Dictionary, key: String) -> Array:
	var cnt := {}
	for p in lay[key]: cnt[str(p.get("kind", ""))] = int(cnt.get(str(p.get("kind", "")), 0)) + 1
	var ks := cnt.keys()
	ks.sort_custom(func(a, b): return cnt[a] > cnt[b])
	return ks

func _render(w: int, wd: Dictionary) -> Image:
	var floor_id: String = wd.floor
	var wc := Color(wd.color)
	var moon: Array = wd.get("moon", ["#888", "#666", "#444", "#222"])
	RenderingServer.global_shader_parameter_set("r3_hemi_sky", Shd.lin3(Color("#6f7590"), 1.55))
	RenderingServer.global_shader_parameter_set("r3_hemi_ground", Shd.lin3(Color("#221d22"), 1.55))
	RenderingServer.global_shader_parameter_set("r3_ambient", Shd.lin3(Color("#8f94ae"), 0.65))
	RenderingServer.global_shader_parameter_set("r3_rim_dir", Vector3(320, 160, 260).normalized())
	RenderingServer.global_shader_parameter_set("r3_moon_col", Shd.lin3(Color("#fbf6f0").srgb_to_linear().lerp(Color(moon[0]).srgb_to_linear(), 0.12).linear_to_srgb(), 1.75))
	RenderingServer.global_shader_parameter_set("r3_rim_col", Shd.lin3(wc, 0.3))
	RenderingServer.global_shader_parameter_set("r3_moon_dir", Vector3(-260, 420, 380).normalized())
	var lay: Dictionary = JSON.parse_string(FileAccess.get_file_as_string("res://assets/arena/w" + str(w) + "/layout.json"))

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
	env.environment.ambient_light_color = Color(0.86, 0.84, 0.95)
	env.environment.ambient_light_energy = 0.5
	env.environment.tonemap_mode = Environment.TONE_MAPPER_LINEAR
	vp.add_child(env)
	var sun := DirectionalLight3D.new()
	sun.rotation_degrees = Vector3(-55, -30, 0)
	sun.light_energy = 1.05
	sun.light_color = Color(1.0, 0.95, 0.86)
	sun.shadow_enabled = true
	sun.directional_shadow_max_distance = 3000
	vp.add_child(sun)
	var back := DirectionalLight3D.new()       # dünya renginde arka kontur
	back.rotation_degrees = Vector3(-22, 170, 0)
	back.light_energy = 0.45
	back.light_color = wc.lightened(0.3)
	vp.add_child(back)
	var S := Node3D.new()
	vp.add_child(S)

	# ── malzemeler: dünyanın ay paletinden taş tonları ──
	var stone_c := Color("#57534f")
	_stone = _mat(stone_c)
	_stone_d = _mat(stone_c.darkened(0.35))
	_trim = _mat(Color("#7d766e"))
	var glow_m := StandardMaterial3D.new()
	glow_m.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	glow_m.albedo_color = wc.lightened(0.35)

	# ── kaide + zemin ──
	var OW := AW + WALL * 2.0
	var OD := AD + WALL * 2.0
	S.add_child(_box(Vector3(OW + 16, BASE, OD + 16), Vector3(0, -BASE * 0.5 - 1.0, 0), _stone_d))
	S.add_child(_box(Vector3(OW + 30, 14, OD + 30), Vector3(0, -BASE - 6.0, 0), _stone))
	# kaide ön yüzü: dünya renginde kuşak + ortada amblem plakası (CR arena tabelası gibi)
	var band := StandardMaterial3D.new()
	band.albedo_color = wc.darkened(0.35)
	band.roughness = 0.7
	band.next_pass = Shd.outline(null, wc.darkened(0.75), 1.6)
	S.add_child(_box(Vector3(OW + 18, 12, 4), Vector3(0, -BASE * 0.42, OD * 0.5 + 9.0), band))
	S.add_child(_box(Vector3(120, 44, 8), Vector3(0, -BASE * 0.45, OD * 0.5 + 11.0), _trim))
	var em := StandardMaterial3D.new()
	em.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	em.albedo_color = wc.lightened(0.2)
	var gem := _box(Vector3(22, 22, 6), Vector3(0, -BASE * 0.45, OD * 0.5 + 15.5), em)
	gem.rotation.z = PI * 0.25
	S.add_child(gem)
	var pm := PlaneMesh.new()
	pm.size = Vector2(AW, AD)
	var gmat := StandardMaterial3D.new()
	gmat.albedo_texture = ImageTexture.create_from_image(_ground_img(w, lay))
	gmat.roughness = 0.95
	gmat.texture_filter = BaseMaterial3D.TEXTURE_FILTER_LINEAR_WITH_MIPMAPS_ANISOTROPIC
	var gm := MeshInstance3D.new()
	gm.mesh = pm
	gm.material_override = gmat
	S.add_child(gm)

	# ── duvar: blok sıraları (hafif düzensiz), arkada kapı boşluğu ──
	var rng := RandomNumberGenerator.new()
	rng.seed = w * 7919
	var gate := 120.0
	var sides := [
		[Vector3(-OW * 0.5 + WALL * 0.5, 0, 0), AD + WALL * 2.0, true],
		[Vector3(OW * 0.5 - WALL * 0.5, 0, 0), AD + WALL * 2.0, true],
		[Vector3(0, 0, OD * 0.5 - WALL * 0.5), AW, false],
		[Vector3(0, 0, -OD * 0.5 + WALL * 0.5), AW, false],
	]
	for si in sides.size():
		var sd: Array = sides[si]
		var c0: Vector3 = sd[0]
		var L: float = sd[1]
		var vert: bool = sd[2]
		var n := int(L / 52.0)
		var bl := L / n
		for i in n:
			var t := -L * 0.5 + bl * (i + 0.5)
			if si == 3 and absf(t) < gate * 0.5 + 6.0: continue
			var hh := WH + rng.randf_range(-3.0, 4.0)
			var pos := c0 + (Vector3(0, hh * 0.5, t) if vert else Vector3(t, hh * 0.5, 0))
			var sz := Vector3(WALL, hh, bl - 3.0) if vert else Vector3(bl - 3.0, hh, WALL)
			S.add_child(_box(sz, pos, _stone if (i % 3) else _stone_d, rng.randf_range(-0.02, 0.02)))
		# taç kuşağı (açık renk) + mazgal dişleri
		if si < 3:
			var cap := Vector3(WALL + 6, 6, L + 4) if vert else Vector3(L + 4, 6, WALL + 6)
			S.add_child(_box(cap, c0 + Vector3(0, WH + 4.0, 0), _trim))
			var nm := int(L / 46.0)
			for j in nm:
				if j % 2: continue
				var tt := -L * 0.5 + (L / nm) * (j + 0.5)
				var mp := c0 + (Vector3(0, WH + 15.0, tt) if vert else Vector3(tt, WH + 15.0, 0))
				S.add_child(_box(Vector3(WALL - 4, 16, 22) if vert else Vector3(22, 16, WALL - 4), mp, _stone))
	# arka kapı: iki ayak + kemer lentosu + dünya renginde parlak kilit taşı
	for sx in [-1.0, 1.0]:
		S.add_child(_box(Vector3(34, 120, 40), Vector3(sx * (gate * 0.5 + 17.0), 60, -OD * 0.5 + WALL * 0.5), _stone))
		S.add_child(_box(Vector3(40, 10, 46), Vector3(sx * (gate * 0.5 + 17.0), 125, -OD * 0.5 + WALL * 0.5), _trim))
		# kapı yanı duvar parçaları
		var segL := (AW - gate) * 0.5 - 34.0
		S.add_child(_box(Vector3(segL, 5, WALL + 6), Vector3(sx * (gate * 0.5 + 34.0 + segL * 0.5), WH + 4.0, -OD * 0.5 + WALL * 0.5), _trim))
	S.add_child(_box(Vector3(gate + 80, 26, 44), Vector3(0, 142, -OD * 0.5 + WALL * 0.5), _stone_d))
	# kapı ayaklarında dünya renginde sancaklar
	var ban := StandardMaterial3D.new()
	ban.albedo_color = wc.darkened(0.15)
	ban.roughness = 0.8
	ban.cull_mode = BaseMaterial3D.CULL_DISABLED
	ban.next_pass = Shd.outline(null, wc.darkened(0.7), 1.5)
	for sx2: float in [-1.0, 1.0]:
		var bx: float = sx2 * (gate * 0.5 + 17.0)
		var bz := -OD * 0.5 + WALL * 0.5 + 22.0
		S.add_child(_box(Vector3(28, 64, 2), Vector3(bx, 84, bz), ban))
		var tip := _box(Vector3(20, 20, 2), Vector3(bx, 52, bz), ban)
		tip.rotation.z = PI * 0.25
		S.add_child(tip)
		S.add_child(_box(Vector3(8, 8, 3), Vector3(bx, 90, bz + 1.5), em))
	S.add_child(_box(Vector3(gate + 92, 7, 50), Vector3(0, 158, -OD * 0.5 + WALL * 0.5), _trim))
	var ks := _box(Vector3(26, 30, 10), Vector3(0, 142, -OD * 0.5 + WALL * 0.5 + 23.0), glow_m)
	ks.rotation.z = PI * 0.25
	S.add_child(ks)
	var gl0 := OmniLight3D.new()
	gl0.position = Vector3(0, 130, -OD * 0.5 + 60.0)
	gl0.light_color = wc.lightened(0.2)
	gl0.light_energy = 0.8
	gl0.omni_range = 140.0
	S.add_child(gl0)

	# ── köşe kuleleri: kalın gövde, taç, üstte dünya renginde meşale ──
	for cx in [-1.0, 1.0]:
		for cz in [-1.0, 1.0]:
			var p := Vector3(cx * (OW * 0.5 - 6.0), 0, cz * (OD * 0.5 - 6.0))
			S.add_child(_cyl(32.0, 74.0, p + Vector3(0, 37, 0), _stone, 8, 28.0))
			S.add_child(_cyl(38.0, 12.0, p + Vector3(0, 80, 0), _trim, 8))
			S.add_child(_cyl(20.0, 10.0, p + Vector3(0, 91, 0), _stone_d, 8, 14.0))
			var fl := MeshInstance3D.new()
			var sm := SphereMesh.new()
			sm.radius = 11.0
			sm.height = 30.0
			fl.mesh = sm
			fl.material_override = glow_m
			fl.position = p + Vector3(0, 108, 0)
			S.add_child(fl)
			var L2 := OmniLight3D.new()
			L2.position = p + Vector3(0, 115, 0)
			L2.light_color = wc.lightened(0.25)
			L2.light_energy = 0.6
			L2.omni_range = 120.0
			L2.omni_attenuation = 1.3
			S.add_child(L2)

	# ── ortada dünya mührü: ince parlak halka + yarı saydam iç disk ──
	var ring := MeshInstance3D.new()
	var tm := TorusMesh.new()
	tm.inner_radius = 92.0
	tm.outer_radius = 99.0
	tm.rings = 48
	ring.mesh = tm
	var rm := StandardMaterial3D.new()
	rm.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	rm.albedo_color = Color(wc.lightened(0.3), 0.85)
	rm.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	ring.material_override = rm
	ring.scale = Vector3(1, 0.05, 1)
	ring.position = Vector3(0, 1.2, 0)
	S.add_child(ring)
	var disc := MeshInstance3D.new()
	var dm := CylinderMesh.new()
	dm.top_radius = 90.0
	dm.bottom_radius = 90.0
	dm.height = 0.5
	dm.radial_segments = 48
	disc.mesh = dm
	var dmm := StandardMaterial3D.new()
	dmm.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	dmm.albedo_color = Color(wc, 0.16)
	dmm.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	disc.material_override = dmm
	disc.position = Vector3(0, 0.8, 0)
	S.add_child(disc)
	for i in 4:
		var a := i * PI * 0.5 + PI * 0.25
		var st := _box(Vector3(14, 3, 14), Vector3(cos(a) * 120.0, 1.5, sin(a) * 120.0), glow_m, a)
		S.add_child(st)

	# ── dünyanın engelleri: köşelerde ayna simetrisi; küçük süsler duvar diplerinde ──
	var grain: Texture2D = load("res://assets/fx/prop_grain.png")
	var prop_mat := Shd.basic({"map": "srgb", "repeat": true, "tex": grain})
	prop_mat.next_pass = Shd.outline(null, Color(0.5, 0.45, 0.42), 1.6)
	var deco_mat := Shd.basic({"map": "srgb", "repeat": true, "tex": grain})
	var props_scn: PackedScene = load("res://assets/arena/props_" + floor_id + ".glb")
	var props_root: Node = props_scn.instantiate() if props_scn else null
	var pk := _kinds(lay, "props")
	var place := [
		[0, Vector3(-AW * 0.34, 0, -AD * 0.30), 0.5], [0, Vector3(AW * 0.34, 0, -AD * 0.30), -0.5],
		[1, Vector3(-AW * 0.36, 0, AD * 0.08), 0.2], [1, Vector3(AW * 0.36, 0, AD * 0.08), -0.2],
		[2, Vector3(-AW * 0.30, 0, AD * 0.34), 0.9], [2, Vector3(AW * 0.30, 0, AD * 0.34), -0.9],
	]
	for P in place:
		var ki: int = P[0]
		if pk.is_empty(): break
		var src: Node3D = props_root.find_child(str(pk[mini(ki, pk.size() - 1)]), true, false) if props_root else null
		if src == null: continue
		var m := src.duplicate() as Node3D
		m.transform = Transform3D(Basis(Vector3.UP, float(P[2])).scaled(Vector3.ONE * 0.9), P[1])
		S.add_child(m)
		for mi in [m] + m.find_children("*", "MeshInstance3D", true, false):
			if mi is MeshInstance3D: (mi as MeshInstance3D).material_override = prop_mat
	var decor_scn: PackedScene = load("res://assets/arena/decor_" + floor_id + ".glb")
	var decor_root: Node = decor_scn.instantiate() if decor_scn else null
	var dk := _kinds(lay, "decor")
	for i in 36:
		if dk.is_empty(): break
		var k: String = dk[i % mini(3, dk.size())]
		var src2: Node3D = decor_root.find_child(k, true, false) if decor_root else null
		if src2 == null: continue
		# duvar dibinde dolanan şerit (orta sahne boş kalır)
		var side := i % 4
		var t := rng.randf_range(-0.46, 0.46)
		var inset := rng.randf_range(14.0, 46.0)
		var p := Vector3.ZERO
		match side:
			0: p = Vector3(-AW * 0.5 + inset, 0, t * AD)
			1: p = Vector3(AW * 0.5 - inset, 0, t * AD)
			2: p = Vector3(t * AW, 0, AD * 0.5 - inset)
			3: p = Vector3(t * AW, 0, -AD * 0.5 + inset)
		if side == 3 and absf(p.x) < gate * 0.5: continue
		var m2 := src2.duplicate() as Node3D
		var sc: float = float(DECOR_SCALE.get(k, 2.0)) * rng.randf_range(0.8, 1.1)
		m2.transform = Transform3D(Basis(Vector3.UP, rng.randf() * TAU).scaled(Vector3.ONE * sc), p)
		S.add_child(m2)
		for mi in [m2] + m2.find_children("*", "MeshInstance3D", true, false):
			if mi is MeshInstance3D: (mi as MeshInstance3D).material_override = deco_mat

	# ── kamera: perspektif, önden ~50° yukarıdan; arena kareye sığar ──
	var cam := Camera3D.new()
	cam.fov = 30.0
	cam.keep_aspect = Camera3D.KEEP_WIDTH
	cam.far = 9000
	var pitch := deg_to_rad(50.0)
	var dist := (OW + 70.0) * 0.5 / tan(deg_to_rad(cam.fov * 0.5)) * 1.32
	var tgt := Vector3(0, 10, 18)
	vp.add_child(cam)
	cam.look_at_from_position(tgt + Vector3(0, sin(pitch), cos(pitch)) * dist, tgt)
	cam.current = true
	for i in 12: await process_frame
	var img := vp.get_texture().get_image()
	img.convert(Image.FORMAT_RGBA8)
	vp.queue_free()
	if props_root: props_root.free()
	if decor_root: decor_root.free()
	var used := img.get_used_rect()
	return img.get_region(used.grow(8).intersection(Rect2i(Vector2i.ZERO, img.get_size())))
