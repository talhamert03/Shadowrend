class_name ChestStage
extends Node2D
## chestScene3d.js — 3B sandık sahnesi (inceleme pop-up'ı + açılış töreni).
## Model web'den pişirildi (assets/chest/t<k>.glb, tools/bake/pages/chest.html);
## GLTF'in taşıyamadığı karışım kipleri, mürekkep kabuğu, nabızlar, parıltı
## taraması burada adla yeniden kurulur. Sahne efektleri (huzme, ağız, kıvılcım,
## rün halkası, zerreler, ışıltılar, derz) renderFrame'in birebir karşılığı.
## Kullanım: stage.setup(w, h); stage.set_chest(tür); her kare stage.p = {...}.

const BASE := "res://assets/chest/"
const BW := 42.0
const BH := 24.2
const CAM_DIR := Vector2(0.242, 0.970)

static var _meta: Dictionary
static var _tex := {}
static var _env: Environment      # tüm sahnelerde ortak: gökyüzü ışıması bir kez hesaplanır
static var _scenes := {}          # kademe → PackedScene (bir kez yüklenir, açılışta disk/ayrıştırma yok)
static var _want := {}            # kademe → arka planda yükleniyor

## modeli arka planda yüklemeye başla (menü boştayken; açılış anında hazır olsun)
static func want(k: int) -> void:
	k = clampi(k, 1, 7)
	if _scenes.has(k) or _want.has(k): return
	var path := BASE + "t" + str(k) + ".glb"
	if ResourceLoader.load_threaded_request(path) == OK: _want[k] = path

static func scene(k: int) -> PackedScene:
	k = clampi(k, 1, 7)
	if not _scenes.has(k):
		if _want.has(k):
			_scenes[k] = ResourceLoader.load_threaded_get(_want[k])
			_want.erase(k)
		else:
			_scenes[k] = load(BASE + "t" + str(k) + ".glb")
	return _scenes[k]

var vp: SubViewport
var spr: Sprite2D
var cam: Camera3D
var world: Node3D
var p := {}                  # renderFrame girdisi: posY, scaleX/Y/Z, shakeX, rotZ, open, seam, shadowK
var size_l := Vector2(300, 300)
var tier := 1
var glow_col := Color.WHITE

var _t := 0.0
var _open_prev := 0.0
var _chest: Node3D
var _lid: Node3D
var _T: Dictionary
var _mats := {}              # ad → BaseMaterial3D
var _pulses: Array = []
var _bobs: Array = []        # [node, y0, amp, dur, beg]
var _pupil: Node3D
var _sheen: ShaderMaterial
var _sheen_c := Color.BLACK
var _sheen_prm: Array = []
var _rim: OmniLight3D
var _inner: OmniLight3D
var _shadow: MeshInstance3D
var _ground: MeshInstance3D
var _beam: Node3D
var _beam_mat: StandardMaterial3D
var _beam_root: MeshInstance3D
var _sparks: Array = []      # {m, life, max, v}
var _rune: MeshInstance3D
var _rune_base := 0.3
var _rune_scale := 1.0
var _motes: Array = []       # {m, a, r, y, sp, seed}
var _mote_n := 8
var _mouth_dark: MeshInstance3D
var _mouth_glow: MeshInstance3D
var _collar: MeshInstance3D
var _treasure: Array = []
var _seam: MeshInstance3D
var _sparkles: Array = []
var _halo: MeshInstance3D
var _halo_r := 16.0

static func meta() -> Dictionary:
	if _meta.is_empty():
		var f := FileAccess.open(BASE + "chest.json", FileAccess.READ)
		if f: _meta = JSON.parse_string(f.get_as_text())
	return _meta

static func tex(n: String) -> Texture2D:
	if not _tex.has(n): _tex[n] = UITex.get_tex(BASE + "fx_" + n + ".png")
	return _tex[n]

static func tier_of(type: String) -> int:
	return int(meta().get("types", {}).get(type, {}).get("tier", 1))

func _init() -> void:
	process_mode = Node.PROCESS_MODE_ALWAYS
	vp = SubViewport.new()
	vp.own_world_3d = true
	vp.transparent_bg = true
	vp.msaa_3d = Viewport.MSAA_2X if Quality.tier == "low" else Viewport.MSAA_4X
	vp.render_target_update_mode = SubViewport.UPDATE_ALWAYS
	add_child(vp)
	spr = Sprite2D.new()
	spr.centered = false
	spr.texture = vp.get_texture()
	# şeffaf görüntü ön-çarpımlı: toplamsal ışımalar (alfa 0) zemine eklenir — web tuvaliyle aynı
	var pm := CanvasItemMaterial.new()
	pm.blend_mode = CanvasItemMaterial.BLEND_MODE_PREMULT_ALPHA
	spr.material = pm
	add_child(spr)
	world = Node3D.new()
	vp.add_child(world)
	cam = Camera3D.new()
	cam.fov = 30
	cam.near = 1
	cam.far = 800
	world.add_child(cam)
	# ortam: stüdyo gökyüzü (makeEnv) yalnız ışık/yansıma için; arka plan şeffaf
	if _env == null:
		_env = Environment.new()
		_env.background_mode = Environment.BG_CLEAR_COLOR
		var sky := Sky.new()
		var sm := ShaderMaterial.new()
		sm.shader = load("res://shaders/chest_env.gdshader")
		sky.sky_material = sm
		_env.sky = sky
		_env.ambient_light_source = Environment.AMBIENT_SOURCE_SKY
		_env.reflected_light_source = Environment.REFLECTION_SOURCE_SKY
		_env.ambient_light_energy = 1.0
		_env.tonemap_mode = Environment.TONE_MAPPER_LINEAR
	var env := _env
	var we := WorldEnvironment.new()
	we.environment = env
	world.add_child(we)
	# ışıklar (three fiziksel yoğunluk / π = Godot enerjisi)
	var key := DirectionalLight3D.new()
	key.light_color = Color("#ffeeda")
	key.light_energy = 2.1 / PI
	world.add_child(key)
	key.look_at_from_position(Vector3(-70, 130, 90), Vector3.ZERO)
	var fill := DirectionalLight3D.new()
	fill.light_color = Color("#a8bcff")
	fill.light_energy = 0.45 / PI
	world.add_child(fill)
	fill.look_at_from_position(Vector3(90, 40, 50), Vector3.ZERO)
	_rim = OmniLight3D.new()
	_rim.light_energy = 1.7 / PI
	_rim.omni_range = 600
	_rim.omni_attenuation = 1.5
	_rim.position = Vector3(0, 50, -75)
	world.add_child(_rim)
	_inner = OmniLight3D.new()
	_inner.light_color = Color("#ffe6ac")
	_inner.light_energy = 0
	_inner.omni_range = 200
	_inner.omni_attenuation = 2
	_inner.position = Vector3(0, 18, 4)
	world.add_child(_inner)
	_build_fx()

func setup(w: float, h: float) -> void:
	size_l = Vector2(w, h)
	var k := _dpr()
	vp.size = Vector2i(maxi(2, int(w * k)), maxi(2, int(h * k)))
	spr.scale = Vector2.ONE / k
	var aspect := w / maxf(1.0, h)
	var tn := tan(deg_to_rad(cam.fov / 2.0))
	var dist := maxf(100.0 / (2.0 * tn), 90.0 / (2.0 * tn * aspect))
	cam.position = Vector3(0, dist * CAM_DIR.x, dist * CAM_DIR.y)
	cam.look_at(Vector3(0, 25, 0))

## mantıksal px → ekran pikseli (en çok 2, web setPixelRatio sınırı)
func _dpr() -> float:
	var win := DisplayServer.window_get_size()
	var vis := UIK.ui_size(get_viewport()) if is_inside_tree() else Vector2(390, 844)
	return clampf(float(win.x) / maxf(1.0, vis.x), 1.0, 2.0)

# ═════════════ efekt nesneleri ═════════════

static func _fx_mat(t: Texture2D, col: Color, add: bool, billboard := false, two_sided := false) -> StandardMaterial3D:
	var m := StandardMaterial3D.new()
	m.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	m.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	m.depth_draw_mode = BaseMaterial3D.DEPTH_DRAW_DISABLED
	if add: m.blend_mode = BaseMaterial3D.BLEND_MODE_ADD
	m.albedo_texture = t
	m.albedo_color = col
	if billboard: m.billboard_mode = BaseMaterial3D.BILLBOARD_ENABLED
	if two_sided or billboard: m.cull_mode = BaseMaterial3D.CULL_DISABLED
	return m

static func _quad(w: float, h: float, mat: Material, flat := false) -> MeshInstance3D:
	var q := QuadMesh.new()
	q.size = Vector2(w, h)
	if flat: q.orientation = PlaneMesh.FACE_Y
	var mi := MeshInstance3D.new()
	mi.mesh = q
	mi.material_override = mat
	mi.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	return mi

static func _disc_tex() -> Texture2D:
	if not _tex.has("_disc"):
		var im := Image.create(64, 64, false, Image.FORMAT_RGBA8)
		for y in 64:
			for x in 64:
				var d := Vector2(x + 0.5 - 32, y + 0.5 - 32).length()
				im.set_pixel(x, y, Color(1, 1, 1, clampf(31.5 - d, 0, 1)))
		_tex["_disc"] = ImageTexture.create_from_image(im)
	return _tex["_disc"]

func _build_fx() -> void:
	_shadow = _quad(60, 60, _fx_mat(_disc_tex(), Color(0, 0, 0, 0.42), false), true)
	_shadow.position.y = 0.2
	world.add_child(_shadow)
	_ground = _quad(100, 100, _fx_mat(tex("glow"), Color(1, 1, 1, 0), true), true)
	_ground.position.y = 0.5
	world.add_child(_ground)
	# huzme: iki çapraz dörtgen, taban pivotta
	_beam_mat = _fx_mat(tex("beam"), Color(1, 0.902, 0.675, 0), true, false, true)
	_beam = Node3D.new()
	for i in 2:
		var q := _quad(1, 1, _beam_mat)
		q.position.y = 0.5
		var piv := Node3D.new()
		piv.rotation.y = i * PI / 2.0
		piv.add_child(q)
		_beam.add_child(piv)
	world.add_child(_beam)
	_beam_root = _quad(1, 1, _fx_mat(tex("glow"), Color(1, 0.902, 0.675, 0), true, true))
	world.add_child(_beam_root)
	for i in 34:
		var m := _quad(5, 5, _fx_mat(tex("glow"), Color(1, 0.878, 0.541, 0), true, true))
		m.visible = false
		world.add_child(m)
		_sparks.append({"m": m, "life": 0.0, "max": 1.0, "v": Vector3.ZERO})
	_rune = _quad(100, 100, _fx_mat(tex("rune"), Color(1, 0.902, 0.675, 0), true, false, true), true)
	_rune.position.y = 0.8
	world.add_child(_rune)
	for i in 18:
		var m := _quad(2.6, 2.6, _fx_mat(tex("glow"), Color(1, 0.902, 0.675, 0), true, true))
		world.add_child(m)
		_motes.append({"m": m, "a": randf() * TAU, "r": 26 + randf() * 34, "y": randf() * 66, "sp": 3.5 + randf() * 5, "seed": randf() * TAU})

# ═════════════ sandık ═════════════

func set_chest(type: String) -> void:
	set_tier(tier_of(type))

func set_tier(k: int) -> void:
	tier = clampi(k, 1, 7)
	if _chest: _chest.queue_free()
	_mats.clear(); _pulses.clear(); _bobs.clear(); _treasure.clear(); _sparkles.clear()
	_pupil = null
	_sheen = null
	_T = meta().get("tiers", {}).get(str(tier), {})
	glow_col = Color(String(_T.get("glow", "#ffbe5a")))
	var ps: PackedScene = scene(tier)
	var inst := ps.instantiate() as Node3D
	_chest = Node3D.new()
	_chest.add_child(inst)
	world.add_child(_chest)
	_lid = inst.find_child("LID", true, false) as Node3D
	# malzemeler: ada göre yeniden kur
	if _T.get("sheen") is Array:
		var sh: Array = _T.sheen
		_sheen_prm = sh
		var c := Color.hex((int(sh[0]) << 8) | 0xff)
		_sheen_c = Color(c.r, c.g, c.b) * float(sh[1]) * 2.4
		_sheen = ShaderMaterial.new()
		_sheen.shader = load("res://shaders/chest_sheen.gdshader")
		_sheen.set_shader_parameter("col", Vector3(_sheen_c.r, _sheen_c.g, _sheen_c.b))
		_sheen.set_shader_parameter("pos", -99.0)
	_fix(inst)
	for pu in _T.get("pulses", []): _pulses.append(pu)
	for b in _T.get("bobbers", []):
		var n := inst.find_child(String(b[0]), true, false) as Node3D
		if n: _bobs.append([n, float(b[1]), float(b[2]), float(b[3]), float(b[4])])
	_pupil = inst.find_child("PUPIL", true, false) as Node3D
	_build_chest_fx()
	_t = 0.0
	_open_prev = 0.0
	for s in _sparks:
		s.life = 0.0
		(s.m as Node3D).visible = false

func _fix(n: Node) -> void:
	if n is MeshInstance3D:
		var mi := n as MeshInstance3D
		mi.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
		for si in mi.mesh.get_surface_count():
			var m0 := mi.mesh.surface_get_material(si)
			if m0 == null: continue
			var nm := m0.resource_name
			var m := _mat_for(nm, m0)
			mi.set_surface_override_material(si, m)
	for c in n.get_children(): _fix(c)

func _mat_for(nm: String, m0: Material) -> Material:
	if _mats.has(nm): return _mats[nm]
	var m := m0.duplicate() as BaseMaterial3D
	var d: Dictionary = _T.get("mats", {}).get(nm, {})
	if nm == "INK":
		m = StandardMaterial3D.new()
		m.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
		m.cull_mode = BaseMaterial3D.CULL_FRONT
		m.albedo_color = (m0 as BaseMaterial3D).albedo_color
		m.render_priority = -1
	elif nm.begins_with("ADD_") or nm.begins_with("ALP_") or nm.begins_with("UNL_"):
		m.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
		if not nm.begins_with("UNL_"):
			m.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
			m.depth_draw_mode = BaseMaterial3D.DEPTH_DRAW_DISABLED if not d.get("depthWrite", false) else BaseMaterial3D.DEPTH_DRAW_OPAQUE_ONLY
		if nm.begins_with("ADD_"): m.blend_mode = BaseMaterial3D.BLEND_MODE_ADD
		if int(d.get("side", 0)) == 2: m.cull_mode = BaseMaterial3D.CULL_DISABLED
		if d.get("po", false): m.render_priority = 2
		if d.get("vc", false): m.vertex_color_use_as_albedo = true
	else:
		if d.get("vc", false): m.vertex_color_use_as_albedo = true
		var e = d.get("emissive")
		if e != null and String(e) != "#000000":
			m.emission_enabled = true
			m.emission = Color(String(e))
			m.emission_energy_multiplier = float(d.get("ei", 0))
			# three: emissive × emissiveMap (Godot varsayılanı toplama)
			if m.emission_texture: m.emission_operator = BaseMaterial3D.EMISSION_OP_MULTIPLY
		if _sheen: m.next_pass = _sheen
	_mats[nm] = m
	return m

func _build_chest_fx() -> void:
	var MY: float = meta().get("dim", {}).get("mouthY", 27.2)
	var gc := glow_col
	_mouth_dark = _quad(39, 28, _fx_mat(tex("mouth"), Color(1, 1, 1, 0), false), true)
	_mouth_dark.position = Vector3(0, MY - 5.8, 0)
	_chest.add_child(_mouth_dark)
	var box := BoxMesh.new()
	box.size = Vector3(40.4, 6, 29.6)
	var cm := StandardMaterial3D.new()
	cm.albedo_color = Color("#0b0810")
	cm.roughness = 0.92
	cm.cull_mode = BaseMaterial3D.CULL_FRONT
	cm.emission_enabled = true
	cm.emission = gc
	cm.emission_energy_multiplier = 0.14
	_collar = MeshInstance3D.new()
	_collar.mesh = box
	_collar.material_override = cm
	_collar.position = Vector3(0, MY - 3, 0)
	_collar.visible = false
	_chest.add_child(_collar)
	_mouth_glow = _quad(66, 48, _fx_mat(tex("glow"), Color(gc, 0), true), true)
	_mouth_glow.position = Vector3(0, MY + 0.5, 0)
	_chest.add_child(_mouth_glow)
	for i in 22:
		var star := i % 3 == 0
		var s := 4.6 if star else 3.2
		var m := _quad(s, s, _fx_mat(tex("star" if star else "glow"), Color(gc, 0), true, true))
		_chest.add_child(m)
		_treasure.append({"m": m, "seed": randf() * TAU, "sp": 7 + randf() * 7, "r": 1.5 + randf() * (BW * 0.3), "y": randf() * 38, "drift": (randf() - 0.5) * 1.1})
	var sb := BoxMesh.new()
	sb.size = Vector3(45, 0.9, 34.4)
	_seam = MeshInstance3D.new()
	_seam.mesh = sb
	_seam.material_override = _fx_mat(null, Color(gc, 0), true)
	_seam.position.y = MY + 0.35
	_chest.add_child(_seam)
	var nsp: int = [4, 4, 6, 8, 10, 12, 14, 16][tier]
	for i in nsp:
		var c := Color.WHITE if tier <= 2 else (Color.WHITE if i % 2 else gc)
		var m := _quad(8, 8, _fx_mat(tex("star"), Color(c, 0.9), true, true))
		m.position = Vector3((randf() - 0.5) * 76, 6 + randf() * 48, 22 + randf() * 7)
		_chest.add_child(m)
		_sparkles.append({"m": m, "seed": randf() * TAU})
	var hp: Array = _T.get("haloPos", [0, 22, 20])
	_halo_r = float(_T.get("haloR", 16))
	_halo = _quad(1, 1, _fx_mat(tex("glow"), Color(gc, 0.55), true))
	_halo.position = Vector3(hp[0], hp[1], hp[2])
	_halo.scale = Vector3.ONE * _halo_r
	_chest.add_child(_halo)
	_inner.position = Vector3(0, MY - 4, 4)
	_rim.light_color = gc.lerp(Color.WHITE, 0.55)
	(_ground.material_override as StandardMaterial3D).albedo_color = Color(gc, 0)
	var bc := gc if tier >= 4 else Color("#ffe6ac")
	_beam_mat.albedo_color = Color(bc, 0)
	(_beam_root.material_override as StandardMaterial3D).albedo_color = Color(bc, 0)
	(_rune.material_override as StandardMaterial3D).albedo_color = Color(gc, 0)
	_rune_base = [0.0, 0.15, 0.22, 0.3, 0.42, 0.52, 0.62, 0.66][tier]
	_rune_scale = 1.24 if tier >= 6 else (1.12 if tier >= 4 else 1.0)
	_mote_n = [0, 5, 7, 9, 11, 14, 18, 18][tier]
	for mo in _motes:
		var mm := (mo.m as MeshInstance3D).material_override as StandardMaterial3D
		mm.albedo_color = Color(Color("#fff0c8") if tier <= 2 else gc, 0)

func spawn_spark() -> void:
	for s in _sparks:
		if s.life > 0: continue
		var a := randf() * TAU
		s.max = 0.7 + randf() * 0.7
		s.life = s.max
		var m := s.m as MeshInstance3D
		m.position = Vector3((randf() - 0.5) * BW * 0.6, BH + 4, (randf() - 0.5) * 8)
		s.v = Vector3(cos(a) * (14 + randf() * 30), 70 + randf() * 90, sin(a) * (8 + randf() * 14))
		var sm := m.material_override as StandardMaterial3D
		sm.albedo_color = Color(Color("#ffe08a") if randf() < 0.55 else glow_col, 0)
		m.scale = Vector3.ONE * (0.5 + randf() * 0.9)
		m.visible = true
		return

static func _ease_back(x: float) -> float:
	var c1 := 1.70158
	var c3 := c1 + 1
	return 1 + c3 * pow(x - 1, 3) + c1 * pow(x - 1, 2)

static func _a(m: MeshInstance3D, a: float) -> void:
	var sm := m.material_override as StandardMaterial3D
	sm.albedo_color.a = clampf(a, 0, 1)

func _process(dt: float) -> void:
	if not is_visible_in_tree() or _chest == null:
		vp.render_target_update_mode = SubViewport.UPDATE_DISABLED
		return
	vp.render_target_update_mode = SubViewport.UPDATE_ALWAYS
	dt = minf(dt, 0.05)
	_t += dt
	var posY: float = p.get("posY", 0.0)
	var sx: float = p.get("scaleX", 1.0)
	var sy: float = p.get("scaleY", 1.0)
	var sz: float = p.get("scaleZ", 1.0)
	var shx: float = p.get("shakeX", 0.0)
	var open: float = p.get("open", 0.0)
	var seam: float = p.get("seam", 0.0)
	var hov: float = p.get("hover", 0.0)
	_chest.position = Vector3(shx, posY + ((5 + sin(_t * 1.4) * hov) if hov != 0.0 else 0.0), 0)
	_chest.rotation = Vector3(0, sin(_t * 0.6) * 0.045, p.get("rotZ", 0.0))
	_chest.scale = Vector3(sx, sy, sz)
	if _lid: _lid.rotation.x = (0.0 if open <= 0 else _ease_back(minf(1.0, open))) * -1.85
	var leak := maxf(open, seam * 0.5)
	_anim_model(leak)
	_inner.light_energy = leak * 7.5 / PI
	_a(_ground, 0.1 + leak * 0.5)
	_ground.scale = Vector3.ONE * (0.75 + leak * 0.55)
	var bo := clampf((open - 0.05) / 0.75, 0, 1)
	var flick := 1 + sin(_t * 7.3) * 0.05 + sin(_t * 3.1) * 0.04
	_beam_mat.albedo_color.a = bo * 0.21 * flick
	var bw := BW * (0.78 + bo * 0.6) * sx
	var my := posY + (BH + 2.4) * sy
	_beam.scale = Vector3(bw, (34 + bo * 132) * sy, bw)
	_beam.position = Vector3(shx, my, 0)
	_a(_beam_root, bo * 0.5 * flick)
	_beam_root.scale = Vector3(bw * 1.05, bw * 0.62, 1)
	_beam_root.position = Vector3(shx, my + bw * 0.14, 1.5)
	var mk := clampf((open - 0.03) * 4, 0, 1)
	_mouth_dark.visible = mk > 0.01
	_a(_mouth_dark, mk)
	_mouth_glow.visible = mk > 0.01
	_a(_mouth_glow, mk * (0.5 + sin(_t * 4.6) * 0.09))
	_mouth_glow.scale = Vector3.ONE * (0.85 + mk * 0.3 + sin(_t * 2.7) * 0.05)
	_collar.visible = mk > 0.05
	(_collar.material_override as StandardMaterial3D).emission_energy_multiplier = 0.1 + mk * 0.3
	_a(_seam, maxf(0, leak - open * 0.8) * 0.9 + seam * 0.25)
	_seam.visible = open < 0.5
	# kıvılcım fıskiyesi
	if open > 0.1 and open < 0.92 and open > _open_prev:
		spawn_spark(); spawn_spark()
	_open_prev = open
	for s in _sparks:
		if s.life <= 0: continue
		s.life -= dt
		var m := s.m as MeshInstance3D
		if s.life <= 0:
			m.visible = false
			continue
		var v: Vector3 = s.v
		v.y -= 200 * dt
		s.v = v
		m.position += v * dt
		_a(m, minf(1, s.life / (s.max * 0.55)))
	# hale
	var hk := 0.85 + sin(_t * 3.4) * 0.15
	_halo.scale = Vector3.ONE * _halo_r * hk * (1 + leak * 0.5)
	_a(_halo, (0.4 + sin(_t * 3.4) * 0.15) * (1 - open))
	# hazine zerreleri
	var active := open > 0.06
	for u in _treasure:
		var m := u.m as MeshInstance3D
		if active:
			u.y += dt * u.sp
			if u.y > 38: u.y -= 38
			var f: float = u.y / 38.0
			var k := minf(1, f * 7) * pow(1 - f, 1.5)
			var spread := 0.22 + f * 1.15
			var a: float = u.seed + f * u.drift
			m.position = Vector3(cos(a) * u.r * spread, BH + 2.6 + u.y, sin(a) * u.r * spread * 0.55)
			_a(m, minf(1, open * 1.6) * k * 0.9)
			m.scale = Vector3.ONE * (0.45 + k * 0.85)
		else:
			_a(m, 0)
	for sp in _sparkles:
		var k := maxf(0, sin(_t * 1.6 + sp.seed * 4))
		var m := sp.m as MeshInstance3D
		m.scale = Vector3.ONE * (0.25 + pow(k, 3) * 1.5)
		_a(m, 0.25 + pow(k, 3) * 0.75)
	# rün halkası + zerreler
	var landK := maxf(0, 1 - posY / 34.0)
	_rune.rotation.y -= dt * (0.22 + open * 0.5)
	var sk: float = p.get("shadowK", 1.0)
	var ra := landK * _rune_base * (0.75 + sin(_t * 1.8) * 0.25 + leak * 0.9)
	if sk < 1: ra *= sk
	_a(_rune, ra)
	_rune.scale = Vector3.ONE * _rune_scale * (1 + open * 0.14)
	for i in _motes.size():
		var u: Dictionary = _motes[i]
		var m := u.m as MeshInstance3D
		if i >= _mote_n:
			m.visible = false
			continue
		m.visible = true
		u.y += u.sp * dt * (1 + open * 2)
		if u.y > 72: u.y = 0.0
		u.a += dt * 0.12
		m.position = Vector3(cos(u.a) * u.r, 2 + u.y, sin(u.a) * u.r * 0.7)
		var tw := 0.5 + sin(_t * 2.6 + u.seed) * 0.5
		_a(m, landK * (0.14 + tw * 0.4))
		m.scale = Vector3.ONE * (0.7 + tw * 0.7)
	_shadow.scale = Vector3.ONE * sx * (1 - maxf(0, posY) / 400.0) * (0.6 + 0.4 * sk)
	_a(_shadow, 0.42 * maxf(0.2, 1 - maxf(0, posY) / 160.0) * sk)

## chestModel3d anim(t, leak): nabızlar, süzülen kıymıklar, göz bebeği, parıltı
func _anim_model(leak: float) -> void:
	for pu in _pulses:
		var m: BaseMaterial3D = _mats.get(String(pu[0]))
		if m == null: continue
		var a: float = pu[2]
		var b: float = pu[3]
		var v := a + (b - a) * (0.5 - 0.5 * cos(((_t - float(pu[5])) / float(pu[4])) * TAU))
		if String(pu[1]) == "opacity": m.albedo_color.a = clampf(v, 0, 1)
		else: m.emission_energy_multiplier = v + leak * 0.6
	for b in _bobs:
		var n: Node3D = b[0]
		n.position.y = float(b[1]) + (0.5 - 0.5 * cos(((_t - float(b[4])) / float(b[3])) * TAU)) * float(b[2])
		n.rotation.y = _t * 0.6
	if _pupil: _pupil.scale.x = 1.15 + 0.35 * cos((_t / 5.0) * TAU)
	if _sheen:
		var dur: float = _sheen_prm[2]
		var hold: float = _sheen_prm[3]
		var ph := fmod(_t, dur) / dur
		_sheen.set_shader_parameter("pos", -99.0 if ph < hold else -40.0 + ((ph - hold) / (1 - hold)) * 92.0)
