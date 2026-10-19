class_name Render3D
extends Node
## render3d.js — 3B Render Motoru (birebir).
## Oyunun tüm oynanış sahnesi (zemin, kahraman, düşmanlar, mermiler, cevherler,
## parçacıklar, alanlar) burada çizilir. Koordinat eşlemesi: oyun (x, y) → 3B (x, 0, z=y).
## Kamera: 44° eğik, 28° FOV perspektif; merkezde 1 dünya birimi ≈ 1 ekran pikseli.
## Godot düzeni: sahne kendi World3D'si olan bir SubViewport'ta çizilir (web'deki
## #game3d WebGL tuvali); boyutu Quality.dpr() ile ölçeklenir (dinamik çözünürlük)
## ve en alttaki CanvasLayer'da tam ekrana gerilir.
## Alt modüller: R3Weapons (süzülen imza silahları) · R3Fx (isabet/ateş/şimşek/
## cevher/parçacık/alan havuzları) · R3Enemies (düşman/boss modelleri, mermiler).

static var TILT := 0.6981317007977318     # 40° (dikeyden) — yukarıdan, okunaklı 3/4 bakış
static var CAM_FOV := 28.0
const ZOOM := 1.05
static var COS_TILT := 0.766044443118978
const TREE_SWAY := {"agac": 1, "fidan": 1}
const DECOR_SWAY := {"ot": 1, "cicek": 1, "saz": 1, "mantar": 1}
const DECOR_SCALE := {"ot": 2.4, "cicek": 2.3, "tas": 2.1, "mum": 1.9, "mantar": 1.9, "saz": 1.8, "kazik": 1.35, "kristal": 2.1, "kor": 2.0, "kemikP": 2.0, "disliP": 1.9, "yaprakP": 2.3, "kar": 2.1, "nilufer": 2.3}

var game
var tier := "mid"
var layer: CanvasLayer
var vp: SubViewport
var view: TextureRect
var scene: Node3D
var camera: Camera3D
var env: Environment
var camDist := 1150.0
## kamera biraz daha uzak (daha geniş görüş); görünür alan sınırları (doğma/ayıklama) da aynı
## oranda genişler — resize()
const CAM_NEAR := 1.12
## geliştirici: kamera uzaklık çarpanı (camzoom=0.4 → yakın çekim, stil incelemesi)
var _dev_zoom := 1.0
var _fixdt := 0.0
var cam_left := -185.0
var cam_right := 185.0
var cam_top := 560.0
var cam_bottom := -560.0
var _needsFrame := true
var _active := true
var _frozen := false
var _clock := 0.0
var _yaw := 0.0
var _rsPr := -1.0
var _rsW := -1.0
var _rsH := -1.0

# ── ışık durumu (global shader uniform'ları) ──
var _moonHex := Color("#d8e4ff")
var _rimHex := Color("#ff3b4e")
const MOON_POS := Vector3(-260, 420, -180)

# ── zemin ──
var ground: MeshInstance3D
var groundMat: ShaderMaterial
var voidGround: MeshInstance3D
var voidMat: ShaderMaterial
var isles: R3Isles
var death: R3Death
var _islesKey := ""
var _isleRock := Color("#4a4450")
var _isleDeep := Color("#07080d")
var cliff: MeshInstance3D
var cliffMat: ShaderMaterial
var _cliffArena := Vector4.ZERO
var _groundWorld := -1

# ── engeller / süsler / fx ──
var propTex: Texture2D
var propMat: ShaderMaterial
var treeMat: ShaderMaterial
var decorMat: ShaderMaterial
var propGroup: Node3D
var decorGroup: Node3D
var propMeshes := {}
var _propPal := ""
var _propLite := false
var _propStamp := -1
var _propGeos := {}
var decorMeshes := {}
var _decorStamp := -1
var fxMesh: IMesh
var _fxN := 0
const FX_CAP := 160

# ── görev çıpaları ──
var objGroup: Node3D
var npcMesh: MeshInstance3D
var shield              # R3Shield
var beacon: MeshInstance3D
var beaconMat: ShaderMaterial
var beaconRing: MeshInstance3D
var beaconRingMat: ShaderMaterial
var fieldChestView      # R3FieldChest

# ── kahraman ──
var playerRoot: Node3D
var playerShadow: MeshInstance3D
var heroMesh: Node3D
var heroAnim: AnimationPlayer
var walkClip := ""
var walkRate := 1.0
var _walkPaused := false
var heroSkel: Skeleton3D
var idleBones = null
var _poseBase: Array = []
var _heroBaseY := 0.0
var _heroBaseValid := false
var _heroTopY := 91.0
var _strideT := 0.0
var heroReady := false
var _currentCharId := ""
var _heroCache := {}
var MODELS: Dictionary = {}

# ── alt modüller ──
var wpn      # R3Weapons
var fx       # R3Fx
var en       # R3Enemies

# ── atmosfer ──
var _atmoWorldId := -1

func _init(g = null) -> void:
	game = g
	name = "Render3D"

func _ready() -> void:
	tier = Quality.tier
	var f := FileAccess.open("res://assets/models/models_meta.json", FileAccess.READ)
	MODELS = JSON.parse_string(f.get_as_text()) if f else {}
	layer = CanvasLayer.new()
	layer.layer = -10
	add_child(layer)
	vp = SubViewport.new()
	vp.own_world_3d = true
	vp.transparent_bg = false
	vp.handle_input_locally = false
	vp.gui_disable_input = true
	vp.render_target_update_mode = SubViewport.UPDATE_ALWAYS
	vp.msaa_3d = Viewport.MSAA_4X if tier == "high" else (Viewport.MSAA_2X if tier == "mid" else Viewport.MSAA_DISABLED)
	vp.positional_shadow_atlas_size = 0
	add_child(vp)
	view = TextureRect.new()
	view.texture = vp.get_texture()
	view.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	view.stretch_mode = TextureRect.STRETCH_SCALE
	view.set_anchors_preset(Control.PRESET_FULL_RECT)
	view.mouse_filter = Control.MOUSE_FILTER_IGNORE
	view.texture_filter = CanvasItem.TEXTURE_FILTER_LINEAR
	# keskinleştirme (CAS benzeri, 5 örnek): ölçeklenen 3B görüntü yumuşak/çamurlu durmasın
	var sh := ShaderMaterial.new()
	sh.shader = load("res://shaders/ui/sharpen.gdshader")
	view.material = sh
	layer.add_child(view)

	scene = Node3D.new()
	vp.add_child(scene)
	var we := WorldEnvironment.new()
	env = Environment.new()
	env.background_mode = Environment.BG_COLOR
	env.background_color = Color("#07080d")
	env.ambient_light_source = Environment.AMBIENT_SOURCE_DISABLED
	env.reflected_light_source = Environment.REFLECTION_SOURCE_DISABLED
	env.tonemap_mode = Environment.TONE_MAPPER_LINEAR
	we.environment = env
	scene.add_child(we)
	camera = Camera3D.new()
	camera.fov = CAM_FOV
	for a in OS.get_cmdline_user_args():
		if a.begins_with("camzoom="): _dev_zoom = float(a.substr(8))
		if a.begins_with("fixdt="): _fixdt = 1.0 / float(a.substr(6))
		if a.begins_with("tilt="):
			TILT = deg_to_rad(float(a.substr(5)))
			COS_TILT = cos(TILT)
		if a.begins_with("fov="):
			CAM_FOV = float(a.substr(4))
			camera.fov = CAM_FOV
		# geliştirici: global stil değeri — sg=r3_toon:0,r3_sat:1
		if a.begins_with("sg="):
			for kv in a.substr(3).split(","):
				var p := kv.split(":")
				if p.size() == 2: RenderingServer.global_shader_parameter_set(p[0], float(p[1]))
	camera.near = 80
	camera.far = 7000
	camera.keep_aspect = Camera3D.KEEP_HEIGHT
	scene.add_child(camera)
	camera.current = true

	_build_lights()
	_build_ground()
	_build_player_root()
	en = R3Enemies.new(self)
	fx = R3Fx.new(self)
	death = R3Death.new(self)
	wpn = R3Weapons.new(self)
	_currentCharId = ""
	load_character(game.player.charId if game and game.player and game.player.charId else D.DEFAULT_CHAR)
	resize()

## three Object3D karşılığı: Euler sırası XYZ olan boş düğüm
static func node(parent: Node = null) -> Node3D:
	var n := Node3D.new()
	n.rotation_order = EULER_ORDER_XYZ
	if parent: parent.add_child(n)
	return n

static func mesh_node(m: Mesh, mat: Material, parent: Node = null) -> MeshInstance3D:
	var n := MeshInstance3D.new()
	n.rotation_order = EULER_ORDER_XYZ
	n.mesh = m
	if mat: n.material_override = mat
	n.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	n.extra_cull_margin = 16384.0
	if parent: parent.add_child(n)
	return n

static func tex(path: String) -> Texture2D:
	return load(path) as Texture2D

## THREE.Color(a).lerp(THREE.Color(b), t) — doğrusal uzayda karışım, sRGB döner
static func lerp_lin(a: Color, b: Color, t: float) -> Color:
	return a.srgb_to_linear().lerp(b.srgb_to_linear(), t).linear_to_srgb()

# ═══════════ KURULUM ═══════════

func _build_lights() -> void:
	# gök yarıküresi daha nötr (mavi gök + kızıl kontur ten rengini leylağa çeviriyordu)
	RenderingServer.global_shader_parameter_set("r3_hemi_sky", Shd.lin3(Color("#6f7590"), 1.55))
	RenderingServer.global_shader_parameter_set("r3_hemi_ground", Shd.lin3(Color("#221d22"), 1.55))
	RenderingServer.global_shader_parameter_set("r3_ambient", Shd.lin3(Color("#8f94ae"), 0.65))
	RenderingServer.global_shader_parameter_set("r3_rim_dir", Vector3(320, 160, 260).normalized())
	_apply_light_colors()

func _apply_light_colors() -> void:
	# ana ışık sıcak-beyaz, ay rengi yalnız hafif bir ton (tam kızıl ay teni pembeye boyuyordu);
	# dünya rengi kontur ışığında kalır
	RenderingServer.global_shader_parameter_set("r3_moon_col", Shd.lin3(lerp_lin(Color("#fbf6f0"), _moonHex, 0.12), 1.75))
	RenderingServer.global_shader_parameter_set("r3_rim_col", Shd.lin3(_rimHex, 0.3))

func _build_ground() -> void:
	groundMat = ShaderMaterial.new()
	groundMat.shader = load("res://shaders/ground.gdshader")
	groundMat.set_shader_parameter("macro_k", 0.0 if Quality.tier == "low" else 1.0)
	ground = mesh_node(Geo.plane(1, 1, 1, 1, -PI / 2), groundMat, scene)
	ground.visible = false
	# dış boşluk: ada uçurumun üstünde süzülür — paralakslı sis katları + dipte kıvılcımlar
	# (shaders/void.gdshader), kenarlardan inen kaya yarları (cliff.gdshader); renkler dünyadan
	voidMat = ShaderMaterial.new()
	voidMat.shader = load("res://shaders/void.gdshader")
	voidMat.set_shader_parameter("layers", 1.0 if Quality.tier == "low" else 2.0)
	voidMat.set_shader_parameter("noise", tex("res://assets/fx/void_noise.png"))
	voidGround = mesh_node(Geo.plane(14000, 14000, 1, 1, -PI / 2), voidMat, scene)
	voidGround.position.y = -2200          # adacıkların altında (sis katları shader'da sanal)
	isles = R3Isles.new()
	scene.add_child(isles)
	cliffMat = ShaderMaterial.new()
	cliffMat.shader = load("res://shaders/cliff.gdshader")
	cliff = mesh_node(null, cliffMat, scene)
	# engel/süs materyalleri — gren dokusu (ortalama ≈ 1,0 nötr çarpan)
	propTex = tex("res://assets/fx/prop_grain.png")
	propMat = Shd.basic({"map": "srgb", "repeat": true, "tex": propTex})
	treeMat = _wind_mat(1.1e-4, 0, 1)
	decorMat = _wind_mat(0.012, 1.1, 0)
	propGroup = node(scene)
	decorGroup = node(scene)
	var q := Geo.plane(1, 1)
	var fm := ShaderMaterial.new()
	fm.shader = load("res://shaders/atmo_fx.gdshader")
	fm.render_priority = 3
	fxMesh = IMesh.new(q, fm, FX_CAP)
	scene.add_child(fxMesh)
	_build_objective()

func _wind_mat(sway: float, push: float, fade: float) -> ShaderMaterial:
	var m := ShaderMaterial.new()
	m.shader = load("res://shaders/wind.gdshader")
	m.set_shader_parameter("map", propTex)
	m.set_shader_parameter("sway", sway)
	m.set_shader_parameter("push", push)
	m.set_shader_parameter("fade", fade)
	return m

## objective.glb: insan · kalkan kaidesi · kalkan mücevheri (propModels/shieldDome pişirmesi)
var _objMeshes := {}
func _glb_meshes(path: String) -> Dictionary:
	var out := {}
	var ps = load(path)
	if ps == null: return out
	var inst: Node = ps.instantiate()
	for c in inst.find_children("*", "MeshInstance3D", true, false):
		var mi := c as MeshInstance3D
		var nm := String(mi.name)
		if nm == "" or out.has(nm): nm = String(mi.get_parent().name)
		out[nm] = mi.mesh
	inst.free()
	return out

func _build_objective() -> void:
	objGroup = node(scene)
	_objMeshes = _glb_meshes("res://assets/arena/objective.glb")
	npcMesh = mesh_node(_objMeshes.get("human"), propMat, objGroup)
	npcMesh.visible = false
	shield = R3Shield.new(self, propMat)
	objGroup.add_child(shield.group)
	beaconMat = Shd.basic({"color": Color("#7fe3b0"), "add": true, "opacity": 0.30, "zwrite": false, "cull": "none", "order": 6})
	var cg := Geo.cylinder(1, 1.25, 1, 12, 1, true)
	beacon = mesh_node(cg, beaconMat, objGroup)
	beacon.visible = false
	# silindir tabanı y=0'a (three: cg.translate(0, 0.5, 0))
	beacon.mesh = Geo.merge([cg], [Transform3D(Basis(), Vector3(0, 0.5, 0))])
	beaconRingMat = Shd.basic({"color": Color("#9ff2c4"), "add": true, "opacity": 0.8, "zwrite": false, "order": 6})
	var rg := Geo.merge([Geo.torus(1, 0.045, 6, 30)], [Transform3D(Basis(Vector3(1, 0, 0), PI / 2), Vector3.ZERO)])
	beaconRing = mesh_node(rg, beaconRingMat, objGroup)
	beaconRing.visible = false
	fieldChestView = R3FieldChest.new(self)

func _build_player_root() -> void:
	playerRoot = node(scene)
	var shm := Shd.basic({"color": Color(0, 0, 0), "alpha": true, "opacity": 0.4, "zwrite": false})
	playerShadow = mesh_node(Geo.circle(1, 24, 0, TAU, -PI / 2), shm, scene)
	playerShadow.position.y = 0.4

# ═══════════ KAHRAMAN ═══════════

## Menüde çağrılır: model arka planda yüklenir (ağ + ayrıştırma bir kez).
func preload_character(char_id: String) -> void:
	var m = MODELS.heroes.get(char_id)
	if m == null: return
	var path: String = "res://assets/models/" + str(m.file)
	if not _heroCache.has(path) and ResourceLoader.load_threaded_get_status(path) == ResourceLoader.THREAD_LOAD_INVALID_RESOURCE:
		ResourceLoader.load_threaded_request(path)

func _hero_scene(path: String) -> PackedScene:
	if _heroCache.has(path): return _heroCache[path]
	var ps: PackedScene
	if ResourceLoader.load_threaded_get_status(path) != ResourceLoader.THREAD_LOAD_INVALID_RESOURCE:
		ps = ResourceLoader.load_threaded_get(path)
	else:
		ps = load(path)
	_heroCache[path] = ps
	return ps

func load_character(char_id: String) -> void:
	if _currentCharId == char_id: return
	_currentCharId = char_id
	if heroMesh:
		heroMesh.get_parent().queue_free()
		heroMesh = null
	heroAnim = null; heroSkel = null; idleBones = null; _poseBase = []
	heroReady = false; _heroBaseValid = false
	var md = MODELS.heroes.get(char_id)
	if wpn: wpn.on_character(char_id, md)
	if md == null: return
	var ps := _hero_scene("res://assets/models/" + str(md.file))
	if ps == null: return
	var inst: Node3D = ps.instantiate()
	playerRoot.add_child(inst)
	# GLB kökü → hero_<id> grubu → ölçekli/konumlu model düğümü (bake'te uygulandı)
	var grp := inst.find_child("hero_" + char_id, true, false) as Node3D
	heroMesh = (grp.get_child(0) as Node3D) if grp and grp.get_child_count() > 0 else inst
	heroMesh.rotation_order = EULER_ORDER_XYZ
	_heroBaseY = heroMesh.position.y
	_heroBaseValid = true
	_heroTopY = float(md.get("topY", 91.0))
	walkRate = float(md.get("walkRate", 1.0))
	# malzeme: MeshStandard + charLook (pürüz ≤ 0,48 · metal 0,08–0,22 · kenar ışığı) + lift
	_apply_char_look(inst, float(md.get("lift", 0.0)), 0.48)
	heroAnim = inst.find_child("AnimationPlayer", true, false) as AnimationPlayer
	if heroAnim:
		heroAnim.callback_mode_process = AnimationMixer.ANIMATION_CALLBACK_MODE_PROCESS_MANUAL
		var clip = md.get("walkClip")
		var lst := heroAnim.get_animation_list()
		walkClip = str(clip) if clip != null and lst.has(str(clip)) else (lst[0] if lst.size() else "")
		if walkClip != "":
			heroAnim.get_animation(walkClip).loop_mode = Animation.LOOP_LINEAR
			heroAnim.play(walkClip)
			heroAnim.advance(0)
			_walkPaused = false
	var sk := inst.find_children("*", "Skeleton3D", true, false)
	heroSkel = sk[0] if sk.size() else null
	if heroSkel:
		var bi := func(names: Array) -> int:
			for n in names:
				var i := heroSkel.find_bone(n)
				if i >= 0: return i
			return -1
		var idle := {
			"chest": bi.call(["Spine2", "Chest", "Spine02", "Spine1", "Spine01"]),
			"spine": bi.call(["Spine"]),
			"neck": bi.call(["Neck", "neck", "NeckTwist01"]),
			"head": bi.call(["Head"]),
		}
		if idle.chest >= 0 or idle.spine >= 0 or idle.neck >= 0 or idle.head >= 0:
			idleBones = idle
			var seen := {}
			for k in ["chest", "spine", "neck", "head"]:
				var b: int = idle[k]
				if b >= 0 and not seen.has(b):
					seen[b] = 1
					_poseBase.append([b, heroSkel.get_bone_pose_rotation(b)])
	heroReady = true

## charLook.applyCharLook + lift: her yüzey malzemesini three Standard karşılığına çevirir.
func _apply_char_look(root: Node, lift: float, rough_max: float) -> void:
	Shd.convert_tree(root, {"lift": lift, "rough_max": rough_max, "metal_min": 0.08, "metal_max": 0.22, "rim": true, "outline": 1.7})

# ═══════════ BOYUT ═══════════

func resize() -> void:
	var w := maxf(1.0, game.w if game else 390.0)
	var h := maxf(1.0, game.h if game else 844.0)
	var pr := Quality.dpr()
	_needsFrame = true
	if pr == _rsPr and w == _rsW and h == _rsH: return
	_rsPr = pr; _rsW = w; _rsH = h
	vp.size = Vector2i(maxi(1, int(round(w * pr))), maxi(1, int(round(h * pr))))
	# çözünürlük ekranın altındaysa (uyarlamalı ölçek) daha güçlü keskinleştir
	if view.material:
		var under := clampf(1.0 - pr / maxf(1.0, Quality._device_ratio()), 0.0, 0.6)
		(view.material as ShaderMaterial).set_shader_parameter("amount", 0.32 + under * 0.5)
	var halfHPerp := h / 2 / ZOOM
	var halfH := halfHPerp / cos(TILT)
	var halfW := (w / 2) / ZOOM
	camDist = halfHPerp / tan(deg_to_rad(CAM_FOV) / 2)
	cam_left = -halfW * CAM_NEAR; cam_right = halfW * CAM_NEAR
	cam_top = halfH * CAM_NEAR; cam_bottom = -halfH * CAM_NEAR
	if fx: fx.set_point_scale(pr, h)

func set_active(on: bool) -> void:
	_active = on
	view.visible = on
	vp.render_target_update_mode = SubViewport.UPDATE_ALWAYS if on and not _frozen else SubViewport.UPDATE_DISABLED

## Donuk kaplamada (duraklat/seviye) son kare tutulur, GPU boşta kalır.
func set_frozen(on: bool) -> void:
	if on == _frozen: return
	_frozen = on
	vp.render_target_update_mode = SubViewport.UPDATE_DISABLED if on or not _active else SubViewport.UPDATE_ALWAYS

# ═══════════ ANA RENDER ═══════════

func render(g) -> void:
	var now := Time.get_ticks_msec() * 1.0
	var dt := minf(0.1, (now - _clock) / 1000.0) if _clock > 0 else 0.016
	if _fixdt > 0.0: dt = _fixdt          # geliştirici: --write-movie kaydında kare başına sabit adım
	_clock = now
	RenderingServer.global_shader_parameter_set("r3_time", now / 1000.0)
	if g.player.charId and g.player.charId != _currentCharId:
		load_character(g.player.charId)
	_update_camera(g)
	_update_ground(g)
	_update_props(g)
	_update_decor(g)
	_update_objective(g)
	if fieldChestView: fieldChestView.update(g)
	_update_atmosphere(g, dt)
	if isles: isles.update(now / 1000.0, dt)
	_update_player(g, dt)
	wpn.update(g, dt)
	en.update(g, dt)
	fx.update(g, dt)
	death.update(dt, fx.cam)

func _update_camera(g) -> void:
	var cx: float = g.cam.x + g.shakeX
	var cy: float = g.cam.y + g.shakeY
	var dist: float = camDist * CAM_NEAR * (1 - g.zoomP) * _dev_zoom
	var height: float = dist * cos(TILT)
	var back: float = dist * sin(TILT)
	var pos := Vector3(cx, height, cy + back)
	var rl: float = g.shakeR
	camera.look_at_from_position(pos, Vector3(cx, 0, cy), Vector3(rl, 1, 0))
	RenderingServer.global_shader_parameter_set("r3_moon_dir", (MOON_POS - Vector3(cx, 0, cy)).normalized())
	voidGround.position.x = cx
	voidGround.position.z = cy

func _update_ground(g) -> void:
	var A = g.arena
	if A == null or g.arenaLayout.is_empty():
		ground.visible = false
		return
	ground.visible = true
	var av := Vector4(A.x0, A.y0, A.w, A.h)
	if av != _cliffArena:
		_cliffArena = av
		cliff.mesh = _cliff_mesh(A.x0, A.y0, A.w, A.h, 440.0)
		voidMat.set_shader_parameter("arena", av)
	ground.scale = Vector3(A.w, 1, A.h)
	ground.position = Vector3(A.x0 + A.w / 2, 0, A.y0 + A.h / 2)
	var wid: int = g.worldId
	if wid != _groundWorld:
		_groundWorld = wid
		var L: Dictionary = g.arenaLayout
		var k := clampi(wid, 1, 10)
		var mtex := tex("res://assets/arena/w%d/macro.png" % k)
		groundMat.set_shader_parameter("macro", mtex)
		_build_isles(A, mtex, wid)
		groundMat.set_shader_parameter("detail", tex("res://assets/arena/w%d/detail.png" % k))
		groundMat.set_shader_parameter("arena", Vector4(A.x0, A.y0, A.w, A.h))
		var tile := float(L.get("tile", 512))
		groundMat.set_shader_parameter("detail_rep", A.w / tile if tile > 0 else 1.0)
		groundMat.set_shader_parameter("detail_k", 0.9)
		groundMat.set_shader_parameter("detail_mid", float(L.get("detailMid", 0.216)))
		groundMat.set_shader_parameter("detail_break", 0.34)

func _build_isles(A, mtex: Texture2D, wid: int) -> void:
	var wd = game.world_def() if game else null
	if wd and _atmoWorldId != int(wd.id): _set_world_atmosphere(wd)      # kaya/sis renkleri önce
	var top := Color("#4c5a3c")
	var img := mtex.get_image() if mtex else null
	if img:
		if img.is_compressed(): img.decompress()
		img.resize(1, 1, Image.INTERPOLATE_BILINEAR)
		top = img.get_pixel(0, 0)
		# zemin ortalaması koyu-soluk: adacık tepesi biraz daha canlı ve aydınlık
		top = Color.from_hsv(top.h, minf(1.0, top.s * 1.25), minf(1.0, top.v * 1.3 + 0.04))
	isles.build(Vector4(A.x0, A.y0, A.w, A.h), top, _isleRock, _isleDeep, 1000 + wid * 17)

## arenanın dört kenarında aşağı inen duvar halkası (dış yüz normalleri dışa)
static func _cliff_mesh(x0: float, z0: float, w: float, h: float, dep: float) -> ArrayMesh:
	var st := SurfaceTool.new()
	st.begin(Mesh.PRIMITIVE_TRIANGLES)
	var x1 := x0 + w
	var z1 := z0 + h
	var y0 := -1.0
	var y1 := -dep
	# [a, b, normal]: a→b kenar boyunca
	var walls := [
		[Vector3(x0, 0, z1), Vector3(x1, 0, z1), Vector3(0, 0, 1)],    # güney (kameraya bakan)
		[Vector3(x1, 0, z0), Vector3(x0, 0, z0), Vector3(0, 0, -1)],   # kuzey
		[Vector3(x0, 0, z0), Vector3(x0, 0, z1), Vector3(-1, 0, 0)],   # batı
		[Vector3(x1, 0, z1), Vector3(x1, 0, z0), Vector3(1, 0, 0)],    # doğu
	]
	for wl in walls:
		var a: Vector3 = wl[0]
		var b: Vector3 = wl[1]
		var n: Vector3 = wl[2]
		var q := [a + Vector3(0, y0, 0), b + Vector3(0, y0, 0), b + Vector3(0, y1, 0), a + Vector3(0, y1, 0)]
		for i in [0, 1, 2, 0, 2, 3]:
			st.set_normal(n)
			st.add_vertex(q[i])
	return st.commit()

## Görev yüklemesinde (perde arkası): engel/süs geometrilerini önceden kur.
func prepare_arena(_world_id: int, _layout: Dictionary) -> void:
	_prop_geos(_layout.get("mapId", "mezarlik"))
	_needsFrame = true

func _prop_geos(pal: String) -> Dictionary:
	var lite := Quality.tier == "low"
	var key := pal + ("_lite" if lite else "")
	if not _propGeos.has(key):
		_propGeos[key] = _glb_meshes("res://assets/arena/props_" + key + ".glb")
	return _propGeos[key]

func _sync_prop_meshes(F, pal: String) -> void:
	_propStamp = F.stamp
	var lite := Quality.tier == "low"
	if pal != _propPal or lite != _propLite:
		_propPal = pal
		_propLite = lite
		for k in propMeshes: propMeshes[k].queue_free()
		propMeshes = {}
	var geos := _prop_geos(pal)
	for k in F.byKind:
		var need: int = F.byKind[k].size()
		var m: IMesh = propMeshes.get(k)
		if m and m.cap >= need: continue
		if m: m.queue_free()
		var geo = geos.get(k)
		if geo == null: continue
		m = IMesh.new(geo, treeMat if TREE_SWAY.has(k) else propMat, maxi(4, need))
		propGroup.add_child(m)
		m.commit(0)
		propMeshes[k] = m
	for k in propMeshes:
		if not F.byKind.has(k): propMeshes[k].commit(0)

func _update_props(g) -> void:
	var F = g.props
	if F == null or F.n == 0:
		for k in propMeshes: propMeshes[k].commit(0)
		return
	var pal: String = g.arenaMapId if g.arenaMapId else "mezarlik"
	if F.stamp != _propStamp or pal != _propPal: _sync_prop_meshes(F, pal)
	if not F.dirty: return
	for k in F.byKind:
		var mesh: IMesh = propMeshes.get(k)
		if mesh == null: continue
		var list: Array = F.byKind[k]
		var n := 0
		for j in list.size():
			var i: int = list[j]
			if F.dead[i]: continue
			var brk: float = F.brk[i]
			var sy := 1.0
			var lean := 0.0
			if brk > 0:
				var t := 1 - brk / 0.30
				sy = 1 - t * 0.86
				lean = t * 1.05
			mesh.set_trs(n, F.x[i], 0, F.y[i], lean * 0.66, F.rot[i], lean * 0.5, F.sx[i], sy, F.sz[i])
			var f: float = F.flash[i]
			var h1: float = F.x[i] * 0.0173 + F.y[i] * 0.0091
			var h2: float = F.x[i] * 0.0067 - F.y[i] * 0.0151
			var v1: float = h1 - floor(h1)
			var v2: float = h2 - floor(h2)
			var tr: float = 0.92 + v1 * 0.16
			var tg: float = 0.93 + (v1 + v2) * 0.07
			var tb: float = 0.92 + v2 * 0.16
			if f > 0:
				var u := minf(1.0, f * 7)
				tr += (2.4 - tr) * u; tg += (2.1 - tg) * u; tb += (1.6 - tb) * u
			mesh.set_col(n, tr, tg, tb)
			n += 1
		mesh.commit(n)
	F.dirty = false

func _update_decor(g) -> void:
	if g.player: RenderingServer.global_shader_parameter_set("r3_player", Vector2(g.player.x, g.player.y))
	var st: int = g.decorStamp
	if st != _decorStamp: _sync_decor(g, st)
	if _fxN:
		var b := Quality.budget("atmo")
		fxMesh.count = mini(_fxN, b if b else 70)
		fxMesh.multimesh.visible_instance_count = fxMesh.count

func _sync_decor(g, st: int) -> void:
	_decorStamp = st
	for k in decorMeshes: decorMeshes[k].queue_free()
	decorMeshes = {}
	var list: Array = g.decor if g.decor else []
	var pal: String = g.arenaMapId if g.arenaMapId else "mezarlik"
	var geos := _glb_meshes("res://assets/arena/decor_" + pal + ".glb")
	var by := {}
	for d in list:
		if not by.has(d.kind): by[d.kind] = []
		by[d.kind].append(d)
	for k in by:
		var geo = geos.get(k)
		if geo == null: continue
		var L: Array = by[k]
		var m := IMesh.new(geo, decorMat if DECOR_SWAY.has(k) else propMat, L.size())
		for i in L.size():
			var d: Dictionary = L[i]
			var s: float = JS.num(d, "s", 1.0) * float(DECOR_SCALE.get(k, 2))
			m.set_ys(i, d.x, 0, d.y, JS.num(d, "rot"), s, s, s)
			var h: float = d.x * 0.0173 + d.y * 0.0091
			var v1: float = h - floor(h)
			m.set_col(i, 0.9 + v1 * 0.2, 0.92 + v1 * 0.12, 0.9 + (1 - v1) * 0.16)
		decorGroup.add_child(m)
		m.commit(L.size())
		decorMeshes[k] = m
	var fxl: Array = g.fx if g.fx else []
	var n := mini(fxl.size(), FX_CAP)
	for i in n:
		var f: Array = fxl[i]
		# paket: origin = aA.xyz · sütun0 = (aA.w, aB.x, aB.y) · sütun1 = (aB.z, aB.w, 0)
		var o := i * fxMesh.stride
		var B := fxMesh.buf
		B[o] = f[3]; B[o + 1] = f[6]; B[o + 2] = 0; B[o + 3] = f[0]
		B[o + 4] = f[4]; B[o + 5] = f[7]; B[o + 6] = 0; B[o + 7] = f[1]
		B[o + 8] = f[5]; B[o + 9] = 0; B[o + 10] = 1; B[o + 11] = f[2]
		fxMesh.set_col(i, f[8], f[9], f[10])
	_fxN = n
	fxMesh.commit(n)

# ═══════════ GÖREV ÇIPALARI ═══════════

func _update_objective(g) -> void:
	var O = g.objectives
	if O == null: return
	var t: float = g.time
	var ph: String = O.phase
	if ph == "waiting" or ph == "escort":
		var p = O.npc
		var moving: bool = (p.vx * p.vx + p.vy * p.vy) > 900
		var sway: float = sin(p.anim) * 0.10 if moving else sin(t * 1.6) * 0.035
		var bob: float = absf(sin(p.anim)) * 3.4 if moving else sin(t * 1.6) * 0.7
		var face: float = atan2(p.vx, p.vy) if moving else JS.num(p, "face")
		p.face = face
		npcMesh.rotation = Vector3(sway * 0.35, face, sway)
		npcMesh.position = Vector3(p.x, bob, p.y)
		npcMesh.visible = true
	elif npcMesh.visible:
		npcMesh.visible = false
	var shat: float = O.domeT
	shield.update(t, O.npc.x, O.npc.y, shat, ph == "waiting" or shat > 0)
	if ph == "escort":
		var d = O.dest
		var pulse := 0.5 + sin(t * 2.3) * 0.5
		beacon.position = Vector3(d.x, 0, d.y)
		beacon.scale = Vector3(58, 300 + pulse * 210, 58)
		beaconMat.set_shader_parameter("opacity", 0.16 + pulse * 0.16)
		beacon.visible = true
		beaconRing.position = Vector3(d.x, 2, d.y)
		var rr := 150 + pulse * 26
		beaconRing.scale = Vector3(rr, rr, rr)
		beaconRing.visible = true
	elif beacon.visible:
		beacon.visible = false
		beaconRing.visible = false

# ═══════════ DÜNYA ATMOSFERİ ═══════════

func _set_world_atmosphere(wd) -> void:
	_atmoWorldId = wd.id
	var colorHex := JS.col(wd.color)
	var moonHex := JS.col(wd.moon[0])
	var mo: Array = wd.moon
	var m0 := JS.col(mo[0])
	var m1 := JS.col(mo[1])
	var m2 := JS.col(mo[2])
	var m3 := JS.col(mo[3])
	var deep := lerp_lin(lerp_lin(Color("#05060b"), m3, 0.45), Color("#0b0d16"), 0.35)
	var mist := lerp_lin(lerp_lin(m2, m3, 0.35), Color("#3a3f55"), 0.25)
	# bulut denizi: dünyanın ay paleti — gölge (koyu) · gövde · ışıklı tepe; tepeler hafif beyaza
	voidMat.set_shader_parameter("c_deep", deep)
	# bulutlar oyun alanından daha koyu ve az doygun kalır (göz zemindeki savaşta)
	var mute := func(c: Color, k: float) -> Color: return lerp_lin(c, Color("#3c3d4c"), k)
	voidMat.set_shader_parameter("c_shadow", mute.call(lerp_lin(m3, m2, 0.35), 0.3))
	voidMat.set_shader_parameter("c_body", mute.call(lerp_lin(m3, m2, 0.85), 0.32))
	voidMat.set_shader_parameter("c_hi", mute.call(lerp_lin(m2, m1, 0.7), 0.22))
	voidMat.set_shader_parameter("c_ink", lerp_lin(Color("#020206"), m3, 0.35))
	voidMat.set_shader_parameter("c_spark", m0)
	if isles:
		isles.set_cloud_colors(mute.call(lerp_lin(m3, m2, 0.4), 0.38), mute.call(lerp_lin(m2, m1, 0.25), 0.36),
			mute.call(lerp_lin(m1, m0, 0.35), 0.24), lerp_lin(Color("#030207"), m3, 0.4), deep)
	cliffMat.set_shader_parameter("c_rock", lerp_lin(Color("#34303a"), colorHex, 0.12))
	cliffMat.set_shader_parameter("c_lip", lerp_lin(Color("#9a9088"), m0, 0.25))
	cliffMat.set_shader_parameter("c_mist", mist)
	cliffMat.set_shader_parameter("c_deep", deep)
	_isleRock = lerp_lin(Color("#4a4450"), colorHex, 0.14)
	_isleDeep = deep
	env.background_color = lerp_lin(Color("#07080d"), colorHex, 0.05)
	_moonHex = moonHex
	_rimHex = colorHex
	_apply_light_colors()

func _update_atmosphere(g, _dt: float) -> void:
	var wd = g.world_def()
	if wd == null: return
	if _atmoWorldId != int(wd.id): _set_world_atmosphere(wd)

# ═══════════ KAHRAMAN GÜNCELLEME ═══════════

func _update_player(g, dt: float) -> void:
	var p = g.player
	playerRoot.position = Vector3(p.x, 0, p.y)
	playerShadow.position = Vector3(p.x, 0.4, p.y)
	playerShadow.scale = Vector3(15, 15, 15)
	var dx := cos(p.facing)
	var dz := sin(p.facing)
	var targetYaw := atan2(dx, dz)
	var diff := targetYaw - _yaw
	while diff > PI: diff -= TAU
	while diff < -PI: diff += TAU
	if p.moving: _yaw += diff * minf(1, dt * 10)
	playerRoot.rotation.y = _yaw
	var flick: bool = p.invuln > 0 and int(g.time * 24) % 2 == 0
	playerRoot.visible = not flick
	if heroSkel:
		for e in _poseBase: heroSkel.set_bone_pose_rotation(e[0], e[1])
	if heroAnim and walkClip != "":
		if p.moving:
			if _walkPaused:
				_walkPaused = false
			heroAnim.advance(dt * walkRate)
		else:
			if not _walkPaused:
				heroAnim.seek(0, true)
				_walkPaused = true
			heroAnim.advance(0)
	if not p.moving and idleBones and heroSkel:
		var t: float = g.time
		var breathe := sin(t * 1.7)
		_rot_bone(idleBones.chest, Vector3.RIGHT, breathe * 0.028)
		_rot_bone(idleBones.spine, Vector3.RIGHT, breathe * 0.018)
		_rot_bone(idleBones.neck, Vector3.UP, sin(t * 0.45) * 0.06)
		_rot_bone(idleBones.head, Vector3.UP, sin(t * 0.33 + 1.2) * 0.05)
		_rot_bone(idleBones.head, Vector3.RIGHT, sin(t * 0.8) * 0.02)
		if heroMesh and _heroBaseValid: heroMesh.position.y = _heroBaseY + breathe * 0.4
	elif heroMesh and _heroBaseValid:
		var hm := heroMesh
		if p.moving and heroAnim == null:
			_strideT += dt
			var ph := _strideT * 8.4
			hm.position.y = _heroBaseY + absf(sin(ph)) * 2.2
			hm.rotation.z = sin(ph * 0.5) * 0.055
			hm.rotation.x = -0.07 + cos(ph * 2) * 0.012
		else:
			var k := minf(1, dt * 8)
			var breathe2 := sin(g.time * 1.7) * 0.5
			hm.position.y += ((_heroBaseY + breathe2) - hm.position.y) * k
			hm.rotation.z += (0 - hm.rotation.z) * k
			hm.rotation.x += (0 - hm.rotation.x) * k

## three bone.rotateX/Y(a): yerel eksende sonradan çarpım
func _rot_bone(b: int, axis: Vector3, a: float) -> void:
	if b < 0: return
	heroSkel.set_bone_pose_rotation(b, heroSkel.get_bone_pose_rotation(b) * Quaternion(axis, a))

# ═══════════ DIŞ API (main.js çağrıları) ═══════════

func prepare_world_enemies(floor_id: String) -> void: en.prepare(floor_id)
func spawn_hit(x: float, y: float, ang: float, t: int, cr := 1.0, cg := 0.92, cb := 0.76) -> void: fx.spawn_hit(x, y, ang, t, cr, cg, cb)
func spawn_death(x: float, y: float, ang: float, col: Color, big: bool) -> void: if death: death.spawn(x, y, ang, col, big)
func spawn_pow(x: float, y: float) -> void: if death: death.pow_spark(x, y)
func spawn_cast(x: float, y: float, cr: float, cg: float, cb: float) -> void: fx.spawn_cast(x, y, cr, cg, cb)
func spawn_flame_impact(x: float, y: float, ang: float, sc := 1.0) -> void: fx.spawn_flame_impact(x, y, ang, sc)
func spawn_judgement(x: float, y: float) -> void: wpn.spawn_judgement(x, y)
func spawn_lightning_arc(x1: float, y1: float, x2: float, y2: float) -> void: wpn.spawn_lightning_arc(x1, y1, x2, y2)
func spawn_storm_strike(x: float, y: float) -> void: wpn.spawn_storm_strike(x, y)
func enemy_death(e, ang: float, quiet := false) -> void: en.enemy_death(e, ang, quiet)
func prewarm_field_chests() -> void: if fieldChestView: fieldChestView.prewarm()
