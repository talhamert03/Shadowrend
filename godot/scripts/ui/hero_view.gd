class_name HeroView
extends Node2D
## Kahraman modeli vitrini: kendi 3B dünyasında (SubViewport, saydam zemin) Tripo modeli —
## savaştaki malzemenin aynısı (toon ışık + mürekkep konturu). Kahraman detayında parmakla
## döndürülür ve yavaşça kendiliğinden döner; kahraman kartlarının görselleri de bununla pişirilir
## (scripts/dev/hero_bake.gd → assets/ui/art/hero3d/<id>.png).
## Kullanım: var v := HeroView.new(); add_child(v); v.setup("seher", 300, 360)

static var _meta := {}
static var _scenes := {}

var vp: SubViewport
var spr: Sprite2D
var cam: Camera3D
var pivot: Node3D
var size_l := Vector2(300, 360)
var yaw := 0.42              # radyan; 3/4 önden
var auto_spin := 0.0         # radyan/sn
var dragging := false
var _vel := 0.0
var _t := 0.0
var _model: Node3D
var _base_y := 0.0
var _anim: AnimationPlayer

static func models() -> Dictionary:
	if _meta.is_empty():
		var f := FileAccess.open("res://assets/models/models_meta.json", FileAccess.READ)
		if f: _meta = JSON.parse_string(f.get_as_text())
	return _meta

## crop: modelin alttan kırpılan payı (0 = tam boy; 0.25 = baştan dize — vitrin yakın çekimi)
func setup(char_id: String, w: float, h: float, dpr := 2.0, outline := 2.2, crop := 0.0) -> bool:
	size_l = Vector2(w, h)
	vp = SubViewport.new()
	vp.own_world_3d = true
	vp.transparent_bg = true
	vp.msaa_3d = Viewport.MSAA_4X
	vp.size = Vector2i(int(w * dpr), int(h * dpr))
	vp.render_target_update_mode = SubViewport.UPDATE_ALWAYS
	add_child(vp)
	spr = Sprite2D.new()
	spr.centered = false
	spr.texture = vp.get_texture()
	spr.scale = Vector2.ONE / dpr
	var pm := CanvasItemMaterial.new()
	pm.blend_mode = CanvasItemMaterial.BLEND_MODE_PREMULT_ALPHA
	spr.material = pm
	add_child(spr)
	var world := Node3D.new()
	vp.add_child(world)
	pivot = Node3D.new()
	world.add_child(pivot)
	cam = Camera3D.new()
	cam.fov = 26.0
	cam.near = 1.0
	cam.far = 4000.0
	world.add_child(cam)
	var md = models().get("heroes", {}).get(char_id)
	if md == null: return false
	var path := "res://assets/models/" + str(md.file)
	if not _scenes.has(path): _scenes[path] = load(path)
	var ps: PackedScene = _scenes[path]
	if ps == null: return false
	var inst: Node3D = ps.instantiate()
	pivot.add_child(inst)
	Shd.convert_tree(inst, {"lift": float(md.get("lift", 0.0)), "rough_max": 0.48, "metal_min": 0.08, "metal_max": 0.22, "rim": true, "outline": outline})
	_model = inst
	_anim = inst.find_child("AnimationPlayer", true, false) as AnimationPlayer
	if _anim:
		var clip = md.get("walkClip")
		var lst := _anim.get_animation_list()
		var c := str(clip) if clip != null and lst.has(str(clip)) else (lst[0] if lst.size() else "")
		if c != "":
			_anim.play(c)
			_anim.seek(0.0, true)
			_anim.pause()
	_crop = crop
	if is_inside_tree(): _frame()
	_apply()
	return true

var _crop := 0.0
var _framed := false

func _ready() -> void:
	if _model and not _framed:
		if _anim and _anim.current_animation != "":
			_anim.seek(0.0, true)
		_frame()

## çerçeve: modelin gerçek (pozlanmış, ağaçtaki) sınırlarına göre — meta ölçüleri tutarsız
func _frame() -> void:
	_framed = true
	var inst := _model
	var w := size_l.x
	var h := size_l.y
	var crop := _crop
	inst.position = Vector3.ZERO
	pivot.rotation.y = 0.0
	pivot.position = Vector3.ZERO
	var bb := _bounds(inst)
	var center := bb.get_center()
	inst.position -= Vector3(center.x, bb.position.y, center.z)
	var hgt := maxf(1.0, bb.size.y)
	var vis := hgt * (1.0 - crop)
	var aspect := w / maxf(1.0, h)
	var tn := tan(deg_to_rad(cam.fov * 0.5))
	var fit := maxf(vis * 0.56 / tn, maxf(bb.size.x, bb.size.z) * 0.62 / (tn * aspect))
	var pitch := deg_to_rad(9.0)
	var look := Vector3(0, hgt - vis * 0.5, 0)
	if crop > 0.0:
		# yakın çekim: kadraj baş kemiğine göre (her kahramanın yüzü kartta aynı yerde);
		# baş kemiği yoksa sınırlara göre
		var hp = _head_pos(inst)
		if hp != null:
			var body: float = maxf(1.0, (hp as Vector3).y)          # ayaklar y=0'da
			var top: float = (hp as Vector3).y + body * 0.19
			var bot: float = (hp as Vector3).y - body * 0.47
			vis = top - bot
			look = Vector3((hp as Vector3).x * 0.6, (top + bot) * 0.5, (hp as Vector3).z * 0.6)
			fit = vis * 0.5 / tn
			pitch = deg_to_rad(6.0)
		else:
			look.y += hgt * 0.035
	var cp := look + Vector3(0, sin(pitch), cos(pitch)) * fit
	cam.transform = Transform3D(Basis.looking_at(look - cp, Vector3.UP), cp)
	_base_y = 0.0
	_apply()

## baş kemiğinin (pivot uzayında) konumu; yoksa null
func _head_pos(root: Node3D):
	var sks := root.find_children("*", "Skeleton3D", true, false)
	if sks.is_empty(): return null
	var sk := sks[0] as Skeleton3D
	var best := -1
	for i in sk.get_bone_count():
		var n := sk.get_bone_name(i).to_lower()
		if n.contains("head") and not (n.contains("end") or n.contains("top") or n.contains("nub")):
			best = i
			break
	if best < 0: return null
	var xf := sk.global_transform if sk.is_inside_tree() else _xf_to(sk, root)
	var p: Vector3 = xf * sk.get_bone_global_pose(best).origin
	return pivot.global_transform.affine_inverse() * p if pivot.is_inside_tree() else p

static func _bounds(root: Node3D) -> AABB:
	# iskeletli modelde kemiklerin gerçek (pozlanmış) konumları: mesh sınırı bağlama pozunda ve
	# ölçeksiz olabilir (Tripo dışa aktarımları); baş kemiğinin üstüne pay eklenir
	var sks := root.find_children("*", "Skeleton3D", true, false)
	if sks.size():
		var sk := sks[0] as Skeleton3D
		var xf := sk.global_transform if sk.is_inside_tree() else _xf_to(sk, root)
		var bb := AABB()
		var f := true
		for i in sk.get_bone_count():
			var p := xf * sk.get_bone_global_pose(i).origin
			if f:
				bb = AABB(p, Vector3.ZERO)
				f = false
			else:
				bb = bb.expand(p)
		if not f and bb.size.y > 0.001:
			var hy := bb.size.y
			bb.size.y += hy * 0.10          # başın üstü
			bb = bb.grow(hy * 0.04)
			return bb
	var out := AABB()
	var first := true
	for mi in root.find_children("*", "MeshInstance3D", true, false):
		var m := mi as MeshInstance3D
		if m.mesh == null: continue
		var bb := m.global_transform * m.mesh.get_aabb() if m.is_inside_tree() else (_xf_to(m, root) * m.mesh.get_aabb())
		if first:
			out = bb
			first = false
		else:
			out = out.merge(bb)
	return out

static func _xf_to(n: Node3D, root: Node3D) -> Transform3D:
	var t := Transform3D.IDENTITY
	var p: Node = n
	while p and p != root:
		if p is Node3D: t = (p as Node3D).transform * t
		p = p.get_parent()
	return root.transform * t

func _apply() -> void:
	if pivot: pivot.rotation.y = yaw

## sürükleme: yatay hareket (piksel) → dönüş
func drag(dx: float) -> void:
	yaw += dx * 0.012
	_vel = dx * 0.012 / maxf(0.001, get_process_delta_time())
	_apply()

func _process(dt: float) -> void:
	_t += dt
	if pivot == null: return
	if not dragging:
		_vel = lerpf(_vel, 0.0, minf(1.0, dt * 3.0))
		yaw += (auto_spin + _vel) * dt
		_apply()
	# nefes: hafif yükselip alçalma
	if _model: pivot.position.y = sin(_t * 1.6) * 0.8
