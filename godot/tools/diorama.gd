extends SceneTree
## Geliştirici aracı: dünya önizlemesi — gökte süzülen sade, premium UÇAN ADA.
## Üst yüz: oyunun kendi zemin dokusu (yuvarlak, yumuşak kenarlı); kenarda üstten taşan çimen/toprak
## dudağı; altında katman katman yumuşak kaya gövde (yuvarlak dip), sarkan kökler; belinde dünya
## renginde hafif tonlu bulut halkası; üstte dünyanın birkaç imza objesi, fener ışığı. Düşman yok.
## Çıktı: assets/ui/arena/w<n>.png (saydam).
## Çalıştırma (ekranlı): godot --path . -s res://tools/diorama.gd -- <çıktı_klasörü> [dünya...]

const W := 520.0       # ada üst yüz çapı (x)
const DP := 430.0      # ada üst yüz çapı (z)
const DEPTH := 330.0   # gövde boyu
const OUT := Vector2i(1100, 1100)
const DECOR_SCALE := {"ot": 2.4, "cicek": 2.3, "tas": 2.1, "mum": 1.9, "mantar": 1.9, "saz": 1.8, "kazik": 1.35, "kristal": 2.1, "kor": 2.0, "kemikP": 2.0, "disliP": 1.9, "yaprakP": 2.3, "kar": 2.1, "nilufer": 2.3}

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

## yumuşak organik kenar: elips × hafif gürültü
func _outline_pts(rng: RandomNumberGenerator) -> PackedVector2Array:
	var P := PackedVector2Array()
	var n := 96
	var ph := [rng.randf() * TAU, rng.randf() * TAU]
	for i in n:
		var a := i * TAU / n
		var k := 1.0 + 0.025 * sin(a * 3.0 + ph[0]) + 0.015 * sin(a * 5.0 + ph[1])
		P.append(Vector2(cos(a) * W * 0.5 * k, sin(a) * DP * 0.5 * k))
	return P

## üst yüz: zemin dokusu (ışıklı malzeme — güneş/fener ışığını alır)
func _island_top(rim: PackedVector2Array, img: Image) -> MeshInstance3D:
	var st := SurfaceTool.new()
	st.begin(Mesh.PRIMITIVE_TRIANGLES)
	var n := rim.size()
	for i in n:
		var a: Vector2 = rim[i]
		var b: Vector2 = rim[(i + 1) % n]
		for v in [Vector2.ZERO, b, a]:
			st.set_uv(Vector2(v.x / W + 0.5, v.y / DP + 0.5))
			st.set_normal(Vector3.UP)
			st.add_vertex(Vector3(v.x, 0.4, v.y))
	var mi := MeshInstance3D.new()
	mi.mesh = st.commit()
	var m := StandardMaterial3D.new()
	m.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	m.albedo_texture = ImageTexture.create_from_image(img)
	m.texture_filter = BaseMaterial3D.TEXTURE_FILTER_LINEAR_WITH_MIPMAPS_ANISOTROPIC
	m.cull_mode = BaseMaterial3D.CULL_DISABLED
	mi.material_override = m
	return mi

## kenar dudağı: üst yüzden dışa taşan, aşağı kıvrılan yumuşak şerit (çimen / toprak)
func _lip(rim: PackedVector2Array, col: Color) -> MeshInstance3D:
	var st := SurfaceTool.new()
	st.begin(Mesh.PRIMITIVE_TRIANGLES)
	var n := rim.size()
	var prof := [[0.97, 1.2], [1.0, 2.6], [1.025, 0.0], [1.035, -8.0], [1.03, -16.0], [1.015, -22.0]]
	for i in n:
		var a: Vector2 = rim[i]
		var b: Vector2 = rim[(i + 1) % n]
		for k in prof.size() - 1:
			var p0: Array = prof[k]
			var p1: Array = prof[k + 1]
			var A := Vector3(a.x * p0[0], p0[1], a.y * p0[0])
			var B := Vector3(b.x * p0[0], p0[1], b.y * p0[0])
			var C := Vector3(b.x * p1[0], p1[1], b.y * p1[0])
			var D := Vector3(a.x * p1[0], p1[1], a.y * p1[0])
			var c0 := col.lightened(0.08) if k < 2 else col.darkened(0.12 * (k - 1))
			st.set_color(c0)
			st.add_vertex(A); st.add_vertex(C); st.add_vertex(B)
			st.add_vertex(A); st.add_vertex(D); st.add_vertex(C)
	st.generate_normals()
	var mi := MeshInstance3D.new()
	mi.mesh = st.commit()
	var m := StandardMaterial3D.new()
	m.vertex_color_use_as_albedo = true
	m.roughness = 1.0
	m.cull_mode = BaseMaterial3D.CULL_DISABLED
	mi.material_override = m
	return mi

## gövde yarıçap çarpanı (t: 0 üst → 1 dip): dolgun omuz, yuvarlak dip
static func _body_sc(t: float) -> float:
	return 1.02 * pow(maxf(0.0, 1.0 - t), 1.15) * (1.0 + 0.32 * sin(minf(t, 1.0) * PI)) + 0.015

## alt gövde: toprak kuşağı + katmanlı kaya (yumuşak, düzenli), yuvarlak dip
func _island_body(rim: PackedVector2Array, soil: Color, rock: Color, rng: RandomNumberGenerator) -> MeshInstance3D:
	var n := rim.size()
	var K := 12
	var rings: Array = []
	for k in K + 1:
		var t := float(k) / K
		var y := -20.0 - DEPTH * t
		var sc := _body_sc(t)
		var R := []
		for i in n:
			var a := i * TAU / n
			var jit := 1.0 + (0.035 * sin(a * 7.0 + k * 1.7) + 0.02 * sin(a * 13.0 + k) if k > 1 else 0.0)
			var v: Vector2 = rim[i] * sc * jit
			R.append(Vector3(v.x, y, v.y))
		rings.append(R)
	var st := SurfaceTool.new()
	st.begin(Mesh.PRIMITIVE_TRIANGLES)
	var rock_hi := rock
	var rock_lo := rock.darkened(0.55)
	for k in K:
		var t := float(k) / K
		var col: Color
		if k < 3: col = soil.darkened(0.12 * k)
		else: col = rock_hi.lerp(rock_lo, t).lightened(0.07 if k % 3 == 0 else (-0.03 if k % 3 == 1 else 0.02))
		for i in n:
			var a: Vector3 = rings[k][i]
			var b: Vector3 = rings[k][(i + 1) % n]
			var c: Vector3 = rings[k + 1][(i + 1) % n]
			var d: Vector3 = rings[k + 1][i]
			st.set_color(col)
			st.add_vertex(a); st.add_vertex(c); st.add_vertex(b)
			st.add_vertex(a); st.add_vertex(d); st.add_vertex(c)
	var tip := Vector3(0, -20.0 - DEPTH * 1.02, 0)
	for i in n:
		st.set_color(rock_lo)
		st.add_vertex(rings[K][i]); st.add_vertex(tip); st.add_vertex(rings[K][(i + 1) % n])
	st.generate_normals()
	var mi := MeshInstance3D.new()
	mi.mesh = st.commit()
	var m := StandardMaterial3D.new()
	m.vertex_color_use_as_albedo = true
	m.roughness = 1.0
	m.cull_mode = BaseMaterial3D.CULL_DISABLED
	mi.material_override = m
	return mi

## gövdeden sarkan kök: aşağı inceltilmiş, hafif kıvrık iki parça
func _root(rim: PackedVector2Array, col: Color, rng: RandomNumberGenerator, i: int, n: int) -> Node3D:
	var root := Node3D.new()
	var a := PI * (0.08 + 0.84 * (i + rng.randf_range(0.2, 0.8)) / n)
	var ri := int(posmod(int(a / TAU * rim.size()), rim.size()))
	var e: Vector2 = rim[ri] * 0.99
	root.position = Vector3(e.x, -26.0, e.y)
	var m := StandardMaterial3D.new()
	m.albedo_color = col
	m.roughness = 1.0
	var L := rng.randf_range(50, 110)
	var prev := Vector3.ZERO
	var out := Vector3(e.x, 0, e.y).normalized()
	for s in 2:
		var seg := MeshInstance3D.new()
		var cm := CylinderMesh.new()
		cm.top_radius = 3.4 - s * 1.4
		cm.bottom_radius = 2.0 - s * 1.2
		cm.height = L * 0.5
		cm.radial_segments = 5
		cm.rings = 1
		seg.mesh = cm
		seg.material_override = m
		var dir := (Vector3(0, -1, 0) + out * (0.25 - s * 0.35) + Vector3(rng.randf_range(-0.15, 0.15), 0, 0)).normalized()
		seg.transform = Transform3D(Basis(Quaternion(Vector3.DOWN, dir)) * Basis(Vector3.RIGHT, PI), prev + dir * L * 0.25)
		root.add_child(seg)
		prev += dir * L * 0.5
	return root

## bulut topağı: birkaç yumuşak küre (açık, dünya renginde hafif tonlu)
func _cloud(pos: Vector3, sz: float, col: Color, rng: RandomNumberGenerator) -> Node3D:
	var root := Node3D.new()
	root.position = pos
	var m := StandardMaterial3D.new()
	m.albedo_color = col
	m.roughness = 1.0
	m.rim_enabled = true
	m.rim = 0.35
	m.rim_tint = 0.5
	for j in 5:
		var s := MeshInstance3D.new()
		var sm := SphereMesh.new()
		var r := sz * rng.randf_range(0.55, 1.0) * (1.0 if j == 0 else 0.75)
		sm.radius = r
		sm.height = r * 1.6
		sm.radial_segments = 16
		sm.rings = 8
		s.mesh = sm
		s.material_override = m
		s.position = Vector3(rng.randf_range(-1.3, 1.3) * sz, rng.randf_range(-0.15, 0.3) * sz, rng.randf_range(-0.6, 0.6) * sz)
		root.add_child(s)
	return root

## oyun zemini gibi: makro renk × (ayrıntı / orta değer) — haritanın ortasından, kenara doğru ortam gölgesi
func _top_img(w: int, lay: Dictionary) -> Image:
	var full: float = float(lay.play) + 2.0 * float(lay.border)
	var mimg: Image = (load("res://assets/arena/w" + str(w) + "/macro.png") as Texture2D).get_image()
	var dimg: Image = (load("res://assets/arena/w" + str(w) + "/detail.png") as Texture2D).get_image()
	for im in [mimg, dimg]:
		if im.is_compressed(): im.decompress()
	var PX := 900
	var PY := int(PX * DP / W)
	var top := Image.create(PX, PY, false, Image.FORMAT_RGB8)
	var mid := float(lay.get("detailMid", 0.216))
	var tile := float(lay.get("tile", 900.0)) * 0.6
	var mw := mimg.get_width()
	var dw := dimg.get_width()
	for y in PY:
		for x in PX:
			var ux := (float(x) / PX - 0.5) * W
			var uz := (float(y) / PY - 0.5) * DP
			var mc := mimg.get_pixel(clampi(int((ux / full + 0.5) * mw), 0, mw - 1), clampi(int((uz / full + 0.5) * mw), 0, mw - 1)).srgb_to_linear()
			var dc := dimg.get_pixel(posmod(int(ux / tile * dw), dw), posmod(int(uz / tile * dw), dw)).srgb_to_linear()
			var k := Color(0.1 + 0.9 * dc.r / mid, 0.1 + 0.9 * dc.g / mid, 0.1 + 0.9 * dc.b / mid)
			var e := Vector2(ux / (W * 0.5), uz / (DP * 0.5)).length()
			var lit := 1.8 * (1.0 - 0.3 * clampf((e - 0.7) / 0.3, 0.0, 1.0))
			top.set_pixel(x, y, Color(mc.r * k.r * lit, mc.g * k.g * lit, mc.b * k.b * lit).linear_to_srgb())
	top.generate_mipmaps()
	return top

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
	env.environment.ambient_light_color = Color(0.82, 0.82, 0.95)
	env.environment.ambient_light_energy = 0.62
	env.environment.tonemap_mode = Environment.TONE_MAPPER_LINEAR
	vp.add_child(env)
	var sun := DirectionalLight3D.new()
	sun.rotation_degrees = Vector3(-48, -36, 0)
	sun.light_energy = 1.2
	sun.light_color = Color(1.0, 0.95, 0.86)
	sun.shadow_enabled = true
	sun.directional_shadow_max_distance = 3000
	vp.add_child(sun)
	var back := DirectionalLight3D.new()       # dünya renginde arka kontur
	back.rotation_degrees = Vector3(-15, 160, 0)
	back.light_energy = 0.5
	back.light_color = wc.lightened(0.3)
	vp.add_child(back)
	var S := Node3D.new()
	vp.add_child(S)
	var rng := RandomNumberGenerator.new()
	rng.seed = w * 7919

	# ── ada ──
	var rim := _outline_pts(rng)
	var top := _top_img(w, lay)
	S.add_child(_island_top(rim, top))
	# kenar dudağı: zeminin kenar rengi (çimen/kum/kar…) biraz açık
	var edge := Color(0, 0, 0)
	var ns := 0
	for i in 24:
		var aa := i * TAU / 24.0
		var px := int((0.5 + cos(aa) * 0.42) * (top.get_width() - 1))
		var py := int((0.5 + sin(aa) * 0.42) * (top.get_height() - 1))
		edge += top.get_pixel(px, py)
		ns += 1
	edge = Color(edge.r / ns, edge.g / ns, edge.b / ns).lightened(0.06)
	var soil := Color("#5b3c27").lerp(edge, 0.12)
	var rock := Color("#565058").lerp(wc, 0.07)
	S.add_child(_island_body(rim, soil, rock, rng))
	for i in 9: S.add_child(_root(rim, soil.darkened(0.25), rng, i, 9))
	# altta dünya renginde ışık: gövdeyi alttan yalar (büyülü süzülme)
	var under := OmniLight3D.new()
	under.position = Vector3(0, -DEPTH * 0.9, 120)
	under.light_color = wc.lightened(0.15)
	under.light_energy = 0.9
	under.omni_range = 420.0
	S.add_child(under)
	# ── objeler: arkada iki büyük imza objesi, yanlarda orta boy, önde fener; süsler kenarda ──
	var grain: Texture2D = load("res://assets/fx/prop_grain.png")
	var prop_mat := Shd.basic({"map": "srgb", "repeat": true, "tex": grain})
	prop_mat.next_pass = Shd.outline(null, Color(0.5, 0.45, 0.42), 1.6)
	var deco_mat := Shd.basic({"map": "srgb", "repeat": true, "tex": grain})
	var props_scn: PackedScene = load("res://assets/arena/props_" + floor_id + ".glb")
	var props_root: Node = props_scn.instantiate() if props_scn else null
	var pk := _kinds(lay, "props")
	# ağaç / fidan / sütun öne alınır (siluet), fener ayrı
	var big: Array = pk.filter(func(k): return k in ["agac", "tuzsutun", "fidan", "disli", "totem"])
	if big.is_empty(): big = pk
	var place := [
		[big[0], Vector3(-W * 0.24, 0, -DP * 0.2), 0.3, 1.05],
		[big[mini(1, big.size() - 1)], Vector3(W * 0.27, 0, -DP * 0.12), -0.5, 0.95],
		[big[0], Vector3(W * 0.05, 0, -DP * 0.33), 1.1, 0.85],
		["fener", Vector3(W * 0.22, 0, DP * 0.2), 0.0, 1.0],
		["fener", Vector3(-W * 0.3, 0, DP * 0.12), 0.0, 1.0],
	]
	for P in place:
		var src: Node3D = props_root.find_child(str(P[0]), true, false) if props_root else null
		if src == null: continue
		var m := src.duplicate() as Node3D
		m.transform = Transform3D(Basis(Vector3.UP, float(P[2])).scaled(Vector3.ONE * float(P[3])), P[1])
		S.add_child(m)
		for mi in [m] + m.find_children("*", "MeshInstance3D", true, false):
			if mi is MeshInstance3D: (mi as MeshInstance3D).material_override = prop_mat
		if str(P[0]) == "fener":
			var L := OmniLight3D.new()
			L.position = P[1] + Vector3(0, 95, 0)
			L.light_color = Color(1.0, 0.78, 0.45).lerp(wc, 0.2)
			L.light_energy = 1.6
			L.omni_range = 170.0
			S.add_child(L)
	var decor_scn: PackedScene = load("res://assets/arena/decor_" + floor_id + ".glb")
	var decor_root: Node = decor_scn.instantiate() if decor_scn else null
	var dk := _kinds(lay, "decor")
	for i in 30:
		if dk.is_empty(): break
		var k: String = dk[i % mini(3, dk.size())]
		var src2: Node3D = decor_root.find_child(k, true, false) if decor_root else null
		if src2 == null: continue
		var aa := rng.randf() * TAU
		var rr := sqrt(rng.randf_range(0.5, 0.88))
		var p := Vector3(cos(aa) * rr * W * 0.5, 0, sin(aa) * rr * DP * 0.5)
		if absf(p.x) < W * 0.2 and absf(p.z) < DP * 0.2: continue
		var m2 := src2.duplicate() as Node3D
		var sc2: float = float(DECOR_SCALE.get(k, 2.0)) * rng.randf_range(0.8, 1.1)
		m2.transform = Transform3D(Basis(Vector3.UP, rng.randf() * TAU).scaled(Vector3.ONE * sc2), p)
		S.add_child(m2)
		for mi in [m2] + m2.find_children("*", "MeshInstance3D", true, false):
			if mi is MeshInstance3D: (mi as MeshInstance3D).material_override = deco_mat

	# ── kamera: ortografik, önden ~30° yukarıdan ──
	var cam := Camera3D.new()
	cam.projection = Camera3D.PROJECTION_ORTHOGONAL
	cam.size = W * 1.5
	cam.keep_aspect = Camera3D.KEEP_WIDTH
	cam.far = 6000
	var pitch := deg_to_rad(38.0)
	var tgt := Vector3(0, -DEPTH * 0.36, 0)
	vp.add_child(cam)
	cam.look_at_from_position(tgt + Vector3(0, sin(pitch), cos(pitch)) * 2000.0, tgt)
	cam.current = true
	for i in 12: await process_frame
	var img := vp.get_texture().get_image()
	img.convert(Image.FORMAT_RGBA8)
	vp.queue_free()
	if props_root: props_root.free()
	if decor_root: decor_root.free()
	var used := img.get_used_rect()
	return img.get_region(used.grow(6).intersection(Rect2i(Vector2i.ZERO, img.get_size())))
