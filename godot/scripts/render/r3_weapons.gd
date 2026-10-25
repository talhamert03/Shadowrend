class_name R3Weapons
extends RefCounted
## render3d.js süzülen imza silahları (birebir): Ay Yayı · Kavlak Sapan · imza
## kılıcı (Seher/Kraliçe/Ayaz — yay-sönüm süzülme + savuruş koreografisi + iz +
## yankı + şok dalgası + hilal kesikler) · Kale Palası · Mavi Alev (+ sahte
## bloom/yalım/ışık lekesi) · Kaptan Topu · Şimşek Kırığı · Gök Kılıcı ·
## zincir yıldırım kavisleri · fırtına çağrısı. Modeller bake'te hizalandı.

const SWORD_SPECS := {
	"kilic": {"weapon": "kilic", "flameHex": ["#ff4a1e", "#ff6524", "#ff8a3c"], "coreHex": "#ffd28a",
		"trailInner": [1.00, 0.26, 0.30], "trailOuter": [1.00, 0.90, 0.74], "echoHex": "#c9a6ff", "shockHex": ["#dfeeff", "#ffc98a"], "waveHex": "#d8ecff", "trailFade": 9},
	"tackilic": {"weapon": "tackilic", "flameHex": ["#3f8cff", "#5fa8ff", "#9fd0ff"], "coreHex": "#dfefff",
		"trailInner": [0.44, 0.36, 1.00], "trailOuter": [0.66, 0.92, 1.00], "echoHex": "#a88cff", "shockHex": ["#cfe4ff", "#9a8cff"], "waveHex": "#8fd4ff", "trailFade": 12},
	"yemin": {"weapon": "yemin", "flameHex": ["#2fd0ff", "#7ae4ff", "#c6f4ff"], "coreHex": "#ffffff",
		"trailInner": [0.32, 0.86, 1.00], "trailOuter": [0.92, 1.00, 1.00], "echoHex": "#9fe4ff", "shockHex": ["#eafcff", "#6fc8ff"], "waveHex": "#a8eeff", "trailFade": 10},
	"kurek": {"weapon": "kurek", "flameHex": ["#8a6a4a", "#a8845a", "#c9a77a"], "coreHex": "#f0e2c4",
		"trailInner": [0.62, 0.46, 0.30], "trailOuter": [0.96, 0.88, 0.70], "echoHex": "#c9a77a", "shockHex": ["#f0e2c4", "#a8845a"], "waveHex": "#e8d4b0", "trailFade": 9},
	"cekic": {"weapon": "cekic", "flameHex": ["#ffb43a", "#ffd36a", "#fff0b0"], "coreHex": "#fff8e0",
		"trailInner": [1.00, 0.70, 0.22], "trailOuter": [0.70, 0.86, 1.00], "echoHex": "#9fd4ff", "shockHex": ["#fff4c8", "#7fb8ff"], "waveHex": "#ffe08a", "trailFade": 11},
}
const TRAIL_SEGS := 48

var r3
var S: Node3D
var cam: Basis
var _charWeapon := ""

func _init(r) -> void:
	r3 = r
	S = r3.scene
	_build_bow()
	_build_sling()
	_build_blade()
	_build_flame()
	_build_cannon()
	_build_judgement()
	_build_shard()
	_build_arcs()

func _wscene(k: String) -> Node3D:
	var m = r3.MODELS.weapons.get(k)
	if m == null: return null
	var ps: PackedScene = load("res://assets/models/" + str(m.file))
	if ps == null: return null
	var inst: Node3D = ps.instantiate()
	var xf = m.get("xf")
	if xf is Dictionary:
		# pişirilmemiş model (Meshy): ölçek/dönüş/öteleme sarmalayıcıda (kılıç düzeni: sap orijinde, +X)
		var holder := Node3D.new()
		holder.add_child(inst)
		inst.scale = Vector3.ONE * float(xf.get("s", 1.0))
		inst.rotation_degrees = Vector3(float(xf.get("rotX", 0)), float(xf.get("rotY", 0)), float(xf.get("rotZ", 0)))
		var p: Array = xf.get("pos", [0, 0, 0])
		inst.position = Vector3(float(p[0]), float(p[1]), float(p[2]))
		return holder
	return inst

func _add_mat(texp: String, col, opacity: float, cull_none := true, order := 0) -> ShaderMaterial:
	# Borderlands tarzı: dokunun çizgi roman karşılığı varsa konturlu malzeme
	if texp != "":
		var cm: ShaderMaterial = Shd.comic(texp, col if col != null else Color.WHITE, opacity, order)
		if cm: return cm
	var o := {"add": true, "zwrite": false, "opacity": opacity, "order": order}
	if cull_none: o.cull = "none"
	if texp != "":
		o.map = "raw"
		o.tex = r3.tex(texp)
	if col != null: o.color = col
	return Shd.basic(o)

func _quad_inst(texp: String, max_n: int, order: int) -> IMesh:
	var im := IMesh.new(Geo.plane(1, 1), _add_mat(texp, null, 1.0, true, order), max_n)
	S.add_child(im)
	im.commit(0)
	return im

func _bb(im: IMesh, i: int, x: float, y: float, z: float, sx: float, sy: float, spin: float, cr: float, cg: float, cb: float) -> void:
	im.set_bb(i, x, y, z, sx, sy, spin, cam)
	im.set_col(i, maxf(cr, 0), maxf(cg, 0), maxf(cb, 0))

static func _op(mi: MeshInstance3D, v: float) -> void:
	(mi.material_override as ShaderMaterial).set_shader_parameter("opacity", v)

static func _near_angle(a: float, ref: float) -> float:
	var d := a - ref
	while d > PI: d -= TAU
	while d < -PI: d += TAU
	return ref + d

## Karakter değişti: imza kılıcı rigini kur/sök (Seher ↔ Kraliçe ↔ Ayaz)
func on_character(_id: String, md) -> void:
	var fw: String = str(md.floatingWeapon) if md and md.get("floatingWeapon") != null else ""
	_charWeapon = fw
	var newW: String = fw if SWORD_SPECS.has(fw) else ""
	var curW: String = _sw.weapon if _sw else ""
	if curW != newW:
		_dispose_sword()
		if newW != "": _build_sword(SWORD_SPECS[newW])
	var Wd = D.WEAPONS.get(fw) if fw != "" else null
	_float_rebuild(fw if Wd is Dictionary and Wd.get("floatVisual", false) else "")

# ═══════════ KARE ═══════════

func update(g, dt: float) -> void:
	cam = r3.camera.global_transform.basis
	_update_bow(g, dt)
	_update_sling(g, dt)
	_update_sword(g, dt)
	_update_shard(g, dt)
	_update_blade(g, dt)
	_update_flame(g, dt)
	_update_cannon(g, dt)
	_update_float(g, dt)
	_update_judgement(dt)
	_update_arcs(dt)

# ═══════════ SÜZÜLEN ODAK (veriyle: WEAPONS.<id>.floatVisual — Ruh Feneri, Batak Asası) ═══════════
# Kahramanın omzu üstünde yay-sönümle süzülür, hafifçe sallanır; atışta geri teper, şişer ve
# kendi renginde parlar. Mermi çıkış noktası (weapons.floatPos) buradan yazılır.
var floatPivot: Node3D
var floatInner: Node3D
var floatGlow: IMesh
var _foId := ""
var _foCol := Color.WHITE
var _foX := 0.0; var _foY := 62.0; var _foZ := 0.0
var _foVX := 0.0; var _foVY := 0.0; var _foVZ := 0.0
var _foInit := false
var _foT := 0.0
var _foRecoil := 0.0
var _foYaw := 0.0
var _foLastFire := 0

func _float_rebuild(id: String) -> void:
	if id == _foId: return
	_foId = id
	if floatPivot:
		floatPivot.queue_free()
		floatPivot = null
	if floatGlow == null:
		floatGlow = _quad_inst("res://assets/fx/glow.png", 3, 3)
	floatGlow.commit(0)
	if id == "": return
	var m := _build_staff() if id == "kazan" else _wscene(id)
	if m == null: return
	_foCol = Color(str(D.WEAPONS[id].get("color", "#ffffff")))
	if id != "kazan":
		Shd.convert_tree(m, {"rim": true, "metal": 0.18, "rough": 0.5, "emissive": _foCol.darkened(0.6), "emissive_k": 1.0, "keep_emap": false, "outline": 1.4})
	floatInner = Render3D.node()
	floatInner.add_child(m)
	floatPivot = Render3D.node(S)
	floatPivot.add_child(floatInner)
	_foInit = false
	_foLastFire = 0

func _update_float(g, dt: float) -> void:
	if floatPivot == null:
		return
	var W = g.weapons
	var show: bool = W != null and W.lvl(_foId) > 0
	floatPivot.visible = show
	if not show:
		floatGlow.commit(0)
		return
	var p = g.player
	_foT += dt
	var side := -1.0 if p.faceLeft else 1.0
	var ax: float = p.x - side * 40.0
	var az: float = p.y + 18.0
	if _foId == "kazan":
		# cadı asası: kahramanın sol omzu arkasında sabit süzülür (yön değişince etrafında dönmez)
		ax = p.x - 34.0
		az = p.y - 14.0
	var ay := 66.0 + sin(_foT * 1.6) * 7.0
	if not _foInit:
		_foInit = true
		_foX = ax; _foZ = az; _foY = ay
	var sdt := minf(dt, 0.05)
	_foVX += ((ax - _foX) * 42.0 - _foVX * 9.0) * sdt
	_foVZ += ((az - _foZ) * 42.0 - _foVZ * 9.0) * sdt
	_foVY += ((ay - _foY) * 42.0 - _foVY * 9.0) * sdt
	_foX += _foVX * sdt; _foZ += _foVZ * sdt; _foY += _foVY * sdt
	floatPivot.position = Vector3(_foX, _foY, _foZ)
	W.floatPos = Vector2(_foX, _foZ)
	var fc: int = W.floatFireCount
	if fc != _foLastFire:
		_foLastFire = fc
		_foRecoil = 1.0
	_foRecoil = maxf(0.0, _foRecoil - dt * 4.0)
	# hedefe dönük; salınım + atışta geri tepme ve şişme
	var tgt = W.nearest
	if tgt: _foYaw = lerp_angle(_foYaw, atan2(tgt.x - _foX, tgt.y - _foZ), minf(1.0, dt * 6.0))
	floatInner.rotation = Vector3(-_foRecoil * 0.35, _foYaw, sin(_foT * 2.2) * 0.12)
	floatInner.scale = Vector3.ONE * (1.0 + _foRecoil * 0.16)
	var k := 0.55 + 0.25 * sin(_foT * 3.1) + _foRecoil * 0.9
	var gy := _foY + (40.0 if _foId == "kazan" else 0.0)      # asada ışık kristalde
	_bb(floatGlow, 0, _foX, gy, _foZ, 46 + _foRecoil * 40, 46 + _foRecoil * 40, 0, _foCol.r * k, _foCol.g * k, _foCol.b * k)
	_bb(floatGlow, 1, _foX, gy, _foZ, 110, 110, 0, _foCol.r * 0.18, _foCol.g * 0.18, _foCol.b * 0.18)
	floatGlow.commit(2)

## CADI ASASI (Batak Cadısı): bükülmüş koyu ağaç gövde, uçta pençe kökler arasında parlayan zehir
## kristali, asılı küçük kemik kurukafa — prosedürel (kazanın yerine)
func _build_staff() -> Node3D:
	var root := Node3D.new()
	var wood := Shd.lit({"color": Color("#5a3d27"), "roughness": 0.9, "rim": true})
	wood.set_shader_parameter("rim_c", Vector3(0.55, 1.0, 0.45))
	if Quality.tier != "low": wood.next_pass = Shd.outline(null, Color(0.12, 0.08, 0.05), 1.3)
	var bone := Shd.lit({"color": Color("#e9dcc0"), "roughness": 0.7, "rim": true})
	var crys := Shd.lit({"color": Color("#d9ff9a"), "emissive": Color("#5fe022"), "emissive_k": 2.2, "roughness": 0.2, "rim": false})
	var parts: Array = []
	var xfs: Array = []
	# gövde: hafif kıvrımlı 7 parça, aşağıdan yukarı incelir
	var pts: Array = []
	for i in 8:
		pts.append(Vector3(sin(i * 0.9) * 1.8, -28.0 + i * 8.0, cos(i * 0.7) * 1.4))
	for i in 7:
		var a: Vector3 = pts[i]
		var b: Vector3 = pts[i + 1]
		var d := b - a
		var r0 := 2.7 - i * 0.12
		parts.append(Geo.cylinder(r0 - 0.12, r0, d.length() + 0.6, 7))
		xfs.append(Transform3D(Basis(Quaternion(Vector3.UP, d.normalized())), (a + b) * 0.5))
	# tepe: dört pençe kök kristali sarar
	var top: Vector3 = pts[7]
	for k in 4:
		var an := k * TAU / 4.0 + 0.4
		var o := Vector3(cos(an), 0, sin(an))
		var c0 := top + o * 2.0
		var c1 := top + o * 7.5 + Vector3(0, 6, 0)
		var c2 := top + o * 4.0 + Vector3(0, 15, 0)
		for seg in [[c0, c1, 1.5], [c1, c2, 1.0]]:
			var a: Vector3 = seg[0]
			var b: Vector3 = seg[1]
			var d := b - a
			parts.append(Geo.cylinder(float(seg[2]) * 0.55, float(seg[2]), d.length() + 0.4, 6))
			xfs.append(Transform3D(Basis(Quaternion(Vector3.UP, d.normalized())), (a + b) * 0.5))
	var shaft := Render3D.mesh_node(Geo.merge(parts, xfs), wood, root)
	shaft.name = "shaft"
	var cr := Render3D.mesh_node(Geo.icosahedron(6.2), crys, root)
	cr.position = top + Vector3(0, 8.5, 0)
	cr.scale = Vector3(1, 1.25, 1)
	cr.name = "crystal"
	# asılı kurukafa (küçük) + ip
	var sk := Render3D.mesh_node(Geo.sphere(2.6, 10, 8), bone, root)
	sk.position = top + Vector3(3.6, -9.0, 1.0)
	sk.scale = Vector3(1, 0.9, 1.05)
	var cord := Render3D.mesh_node(Geo.cylinder(0.25, 0.25, 6.5, 4), Shd.lit({"color": Color("#2a1e14")}), root)
	cord.position = top + Vector3(3.2, -4.8, 0.8)
	var holder := Node3D.new()
	holder.add_child(root)
	root.position = Vector3(0, 6, 0)
	return holder

# ═══════════ AY YAYI ═══════════
var bowRig: Node3D
var bowInner: Node3D
var bowNock: MeshInstance3D
var _bowOrbit := randf() * TAU
var _bowRecoil := 0.0
var _lastBowFire := 0
var _bowYaw := 0.0

func _build_bow() -> void:
	var bow := _wscene("yay")
	if bow == null: return
	Shd.convert_tree(bow, {"rim": false})
	bowInner = Render3D.node()
	bowInner.add_child(bow)
	bowInner.rotation.y = PI / 2
	bowNock = Render3D.mesh_node(Geo.sphere(3.0, 10, 10), _add_mat("", Color("#9fe8ff"), 0.92, false), bowInner)
	bowNock.visible = false
	bowRig = Render3D.node(S)
	bowRig.add_child(bowInner)
	bowRig.visible = false

func _update_bow(g, dt: float) -> void:
	if bowRig == null: return
	var W = g.weapons
	var show: bool = W != null and W.lvl("yay") > 0
	bowRig.visible = show
	if not show:
		bowNock.visible = false
		return
	var p = g.player
	_bowOrbit += dt
	var bx: float = p.x + 46 + sin(_bowOrbit * 0.9) * 4
	var bz: float = p.y + 12
	var by := 40 + sin(_bowOrbit * 1.6) * 5
	bowRig.position = Vector3(bx, by, bz)
	var n = W.nearest
	var aim: float = atan2(n.x - bx, n.y - bz) if n else atan2(cos(p.facing), sin(p.facing))
	var d := aim - _bowYaw
	while d > PI: d -= TAU
	while d < -PI: d += TAU
	_bowYaw += d * minf(1, dt * 12)
	bowRig.rotation.y = _bowYaw
	var fc: int = W.bowFireCount
	if fc != _lastBowFire:
		_lastBowFire = fc
		_bowRecoil = 1.0
	if _bowRecoil > 0: _bowRecoil = maxf(0, _bowRecoil - dt * 7)
	var draw: float = clampf(W.bowDraw, 0, 1)
	var kick := _bowRecoil * _bowRecoil
	bowInner.position.z = draw * 3 - kick * 7
	bowInner.rotation.z = sin(g.time * 3) * 0.05 - kick * 0.22
	bowInner.scale.x = 1 - draw * 0.12
	var ns := 0.35 + draw * 1.15 if draw > 0.03 else 0.0
	bowNock.visible = ns > 0
	if ns > 0:
		bowNock.scale = Vector3(ns, ns, ns)
		var ft: int = int(W.W.yay.get("flame", 0)) if W.W.has("yay") else 0
		(bowNock.material_override as ShaderMaterial).set_shader_parameter("color", Color("#ff7a3c") if ft >= 2 else (Color("#ffb24d") if ft == 1 else Color("#9fe8ff")))
	W.bowPos.x = bx; W.bowPos.y = bz
	W.bowAim = _bowYaw

# ═══════════ KAVLAK SAPAN ═══════════
var slingRig: Node3D
var slingInner: Node3D
var slingSpin: Node3D
var slingStone: MeshInstance3D
var _slingBob := randf() * TAU
var _slingRecoil := 0.0
var _lastSlingFire := 0
var _slingYaw := 0.0
var _slStoneHide := 0.0
var _slingInit := false

func _build_sling() -> void:
	var sl := _wscene("sapan")
	if sl == null: return
	Shd.convert_tree(sl, {"rim": false})
	slingSpin = Render3D.node()
	slingSpin.add_child(sl)
	slingStone = Render3D.mesh_node(Geo.icosahedron(3.4), Shd.lit({"color": Color("#9a9284"), "roughness": 0.86, "metalness": 0.04, "rim": false}), slingSpin)
	slingStone.position.x = 19
	slingInner = Render3D.node()
	slingInner.add_child(slingSpin)
	slingInner.rotation.y = PI / 2
	slingRig = Render3D.node(S)
	slingRig.add_child(slingInner)
	slingRig.visible = false

func _update_sling(g, dt: float) -> void:
	if slingRig == null: return
	var W = g.weapons
	var show: bool = _charWeapon == "sapan" and W != null and W.lvl("sapan") > 0
	slingRig.visible = show
	if not show:
		_slingInit = false
		return
	var p = g.player
	_slingBob += dt
	var bx: float = p.x + 44 + sin(_slingBob * 0.9) * 4
	var bz: float = p.y + 12
	var by := 40 + sin(_slingBob * 1.5) * 5
	slingRig.position = Vector3(bx, by, bz)
	var n = W.nearest
	var aim: float = atan2(n.x - bx, n.y - bz) if n else atan2(cos(p.facing), sin(p.facing))
	if not _slingInit:
		_slingYaw = aim
		_slingInit = true
	var d := aim - _slingYaw
	while d > PI: d -= TAU
	while d < -PI: d += TAU
	_slingYaw += d * minf(1, dt * 12)
	slingRig.rotation.y = _slingYaw
	var fc: int = W.slingFireCount
	if fc != _lastSlingFire:
		_lastSlingFire = fc
		_slingRecoil = 1.0
		_slStoneHide = 0.16
	if _slingRecoil > 0: _slingRecoil = maxf(0, _slingRecoil - dt * 5.2)
	if _slStoneHide > 0: _slStoneHide -= dt
	var wind: float = clampf(W.slingWind, 0, 1)
	var kick := _slingRecoil * _slingRecoil
	slingSpin.rotation.z = -0.30 - 0.55 * wind * wind + _slingRecoil * 2.30
	slingInner.position.z = wind * 2 - kick * 9
	slingInner.rotation.x = -kick * 0.30
	var ss := 1 + wind * 0.06 - kick * 0.10
	slingSpin.scale = Vector3(ss, ss, ss)
	slingStone.visible = _slStoneHide <= 0
	W.slingPos.x = bx + sin(_slingYaw) * 26
	W.slingPos.y = bz + cos(_slingYaw) * 26
	W.slingAim = _slingYaw

# ═══════════ İMZA KILICI ═══════════
var _sw = null                 # aktif SWORD_SPECS kaydı
var swordPivot: Node3D
var swordInner: Node3D
var swordSpinner: Node3D
var swordFlame: Node3D
var swordFlameCore: MeshInstance3D
var swordTrail: MeshInstance3D
var _trailMeshes := {}
var _trailCols := PackedColorArray()
var _trailBaseR := 0.0
var swordEcho: MeshInstance3D
var swordEchoGroup: Node3D
var _echoMeshes := {}
var shockRings: Array = []
var waveGroups: Array = []
var waveMeshes: Array = []
var _swordOrbit := 0.0
var _lastSwordSwingId := 0
var _swordSwingT := 1.0
var _swordYaw := 0.0
var _swSwept := 0.0
var _swordReach := 6.0
var _swordRoll := 0.0
var _swordKind := "normal"
var _swordDur := 0.34
var _echoT := 1.0
var _echoDir := 0.0
var _swX := 0.0; var _swY := 58.0; var _swZ := 0.0
var _swVX := 0.0; var _swVY := 0.0; var _swVZ := 0.0
var _swInit := false
var _shockT := 1.0
var _swStartYaw := 0.0
var _swWindup := 0.0
var _swTo := 0.0
var _swRollFrom := 0.0
var _swRollTo := 0.0
var _bladeLen := 74.0

func _trail_mesh(segs: int) -> ArrayMesh:
	if not _trailMeshes.has(segs):
		_trailMeshes[segs] = Geo.ring(_trailBaseR * 0.74, _trailBaseR, TRAIL_SEGS, 1, 0, TAU, _trailCols, segs)
	return _trailMeshes[segs]

func _echo_mesh(segs: int) -> ArrayMesh:
	if not _echoMeshes.has(segs):
		_echoMeshes[segs] = Geo.ring(26, 110, TRAIL_SEGS, 1, 0, TAU, PackedColorArray(), segs)
	return _echoMeshes[segs]

func _build_sword(spec: Dictionary) -> void:
	_sw = spec
	_swordOrbit = randf() * TAU
	_lastSwordSwingId = 0; _swordSwingT = 1.0; _swordYaw = 0.0; _swSwept = 0.0
	_swordRoll = 0.0; _swordKind = "normal"; _swordDur = 0.34; _echoT = 1.0
	_swInit = false; _shockT = 1.0
	var sword := _wscene(spec.weapon)
	if sword == null: return
	# metal 0,22 · pürüz 0,44 · öz-ışık 0x120e0a (renkleri soldurmasın)
	Shd.convert_tree(sword, {"rim": false, "metal": 0.22, "rough": 0.44, "emissive": Color("#120e0a"), "emissive_k": 1.0, "keep_emap": false})
	_bladeLen = float(r3.MODELS.weapons[spec.weapon].get("bladeLen", 74))
	var L := _bladeLen
	swordSpinner = Render3D.node()
	swordSpinner.add_child(sword)
	# KIZIL ALEV: iki çapraz düzlem, tüylenmiş alfa
	swordFlame = Render3D.node(swordSpinner)
	for i in 2:
		var f := Render3D.mesh_node(Geo.plane(L * 1.22, L * 0.5), _add_mat("res://assets/fx/soft_blob.png", Color(spec.flameHex[0]), 0.0), swordFlame)
		f.position = Vector3(L * 0.5, 0, 0)
		f.rotation.x = i * PI / 2
	swordFlameCore = Render3D.mesh_node(Geo.plane(L * 1.0, L * 0.2), _add_mat("res://assets/fx/soft_blob.png", Color(spec.coreHex), 0.0), swordSpinner)
	swordFlameCore.position = Vector3(L * 0.5, 0, 0)
	swordInner = Render3D.node()
	swordInner.add_child(swordSpinner)
	swordInner.position = Vector3(_swordReach, 0, 0)
	swordPivot = Render3D.node(S)
	swordPivot.add_child(swordInner)
	# SAVURMA İZİ: ince hilal, köşe renkli gradyan (kuyrukta söner)
	_trailBaseR = _swordReach + L * 0.98
	_trailMeshes = {}
	var RS := TRAIL_SEGS + 1
	_trailCols = PackedColorArray()
	_trailCols.resize(RS * 2)
	var FADE: float = spec.trailFade
	var tIn: Array = spec.trailInner
	var tOut: Array = spec.trailOuter
	for i in TRAIL_SEGS + 1:
		var f := pow(maxf(0.0, 1 - i / FADE), 2.1)
		_trailCols[i] = Color(tIn[0] * f, tIn[1] * f, tIn[2] * f)
		_trailCols[RS + i] = Color(tOut[0] * f, tOut[1] * f, tOut[2] * f)
	var trm := Shd.basic({"map": "raw", "tex": r3.tex("res://assets/fx/slash.png"), "add": true, "zwrite": false, "cull": "none", "opacity": 1.0})
	swordTrail = Render3D.mesh_node(_trail_mesh(TRAIL_SEGS), trm, swordPivot)
	swordTrail.rotation.x = -PI / 2
	swordTrail.visible = false
	swordPivot.visible = false
	# HAYALET İZ (Ruh Yankısı)
	_echoMeshes = {}
	swordEchoGroup = Render3D.node(S)
	swordEcho = Render3D.mesh_node(_echo_mesh(TRAIL_SEGS), _add_mat("", Color(spec.echoHex), 0.0), swordEchoGroup)
	swordEcho.rotation.x = -PI / 2
	swordEchoGroup.visible = false
	# GİRDAP ŞOK DALGASI: iki katman, farklı hız
	shockRings = []
	for i in 2:
		var m := Render3D.mesh_node(Geo.plane(1, 1), _add_mat("res://assets/fx/shock.png", Color(spec.shockHex[i]), 0.0), S)
		m.rotation.x = -PI / 2
		m.visible = false
		shockRings.append(m)
	# AY KESİĞİ: 16 yuva, paylaşılan konik hilal geometrisi
	var WTS := 22
	var cnt := (WTS + 1) * 2
	var wc := PackedColorArray()
	wc.resize(cnt)
	for j in 2:
		var lum := 0.42 if j == 0 else 1.0
		for i in WTS + 1:
			var taper := pow(sin((float(i) / WTS) * PI), 0.55)
			var v := lum * taper
			wc[j * (WTS + 1) + i] = Color(v, v, v)
	var waveGeo := Geo.ring(28, 46, WTS, 1, -0.72, 1.44, wc)
	waveGroups = []; waveMeshes = []
	for i in 16:
		var grp := Render3D.node(S)
		var wm := Render3D.mesh_node(waveGeo, _add_mat("res://assets/fx/slash.png", Color(spec.waveHex), 0.0), grp)
		wm.rotation.x = -PI / 2
		grp.visible = false
		waveGroups.append(grp)
		waveMeshes.append(wm)

func _dispose_sword() -> void:
	for n in [swordPivot, swordEchoGroup]:
		if n: n.queue_free()
	for m in shockRings: m.queue_free()
	for gq in waveGroups: gq.queue_free()
	swordPivot = null; swordInner = null; swordSpinner = null
	swordTrail = null; swordFlame = null; swordFlameCore = null
	swordEcho = null; swordEchoGroup = null
	shockRings = []; waveGroups = []; waveMeshes = []
	_sw = null

static func _sm(x: float) -> float: return x * x * (3 - 2 * x)

func _update_sword(g, dt: float) -> void:
	if swordPivot == null: return
	var W = g.weapons
	var wid: String = _sw.weapon
	var show: bool = _charWeapon == wid and W != null and W.lvl(wid) > 0
	swordPivot.visible = show
	if not show:
		swordTrail.visible = false
		swordEchoGroup.visible = false
		swordFlame.visible = false
		swordFlameCore.visible = false
		for m in shockRings: m.visible = false
		for gq in waveGroups: gq.visible = false
		_swInit = false
		return
	var p = g.player
	_swordOrbit += dt
	var o := _swordOrbit
	# SÜZÜLME: yay-sönüm takip
	var ax: float = p.x + 50
	var az: float = p.y + 22
	var ay := 58 + sin(o * 1.15) * 7
	if not _swInit:
		_swInit = true
		_swX = ax; _swZ = az; _swY = ay
		_swVX = 0; _swVZ = 0; _swVY = 0
	var sdt := 0.05 if dt > 0.05 else dt
	var K := 46.0
	var Dd := 9.5
	_swVX += ((ax - _swX) * K - _swVX * Dd) * sdt
	_swVZ += ((az - _swZ) * K - _swVZ * Dd) * sdt
	_swVY += ((ay - _swY) * K - _swVY * Dd) * sdt
	_swX += _swVX * sdt; _swZ += _swVZ * sdt; _swY += _swVY * sdt
	var ddx: float = _swX - p.x
	var ddz: float = _swZ - p.y
	var dd := sqrt(ddx * ddx + ddz * ddz)
	if dd < 34:
		if dd > 0.001:
			var k := 34 / dd
			_swX = p.x + ddx * k; _swZ = p.y + ddz * k
		else:
			_swX = p.x + 34
	var fx := _swX
	var fz := _swZ
	var fy := _swY
	var lag := clampf((_swVX * cos(-_swordYaw) + _swVZ * sin(-_swordYaw)) * -0.0016, -0.34, 0.34)
	var n = W.nearest
	var aimDir: float = atan2(n.y - p.y, n.x - p.x) if n else p.facing
	var restYaw := -aimDir
	var orbitK := 0.0
	# yeni savuruş? koreografi seç
	var swingId: int = W.swingId
	if swingId != _lastSwordSwingId:
		_lastSwordSwingId = swingId
		var kind: String = W.swingKind if W.swingKind else "normal"
		var dir: float = W.swingDir
		if kind == "echo":
			_echoT = 0.0
			_echoDir = dir
		else:
			_swordKind = kind
			_swordSwingT = 0.0
			_swSwept = 0.0
			_swordDur = 0.46 if kind == "spin" else (0.28 if kind == "twin" else 0.34)
			if kind == "spin": _shockT = 0.0
			var tgtYaw := -dir
			_swStartYaw = _swordYaw
			if kind == "spin":
				_swWindup = _near_angle(tgtYaw + 0.5, _swordYaw)
				_swTo = _swWindup - TAU
			else:
				var half := 1.0 if kind == "twin" else 1.15
				_swWindup = _near_angle(tgtYaw + half + 0.30, _swordYaw)
				_swTo = _swWindup - (2 * half + 0.30)
			_swRollFrom = _swordRoll
			_swRollTo = _swRollFrom + (PI * 4 if kind == "spin" else TAU)
	var pitch := 0.12
	var roll := 0.0
	var spinning := _swordKind == "spin"
	if _swordSwingT < 1:
		_swordSwingT = minf(1.0, _swordSwingT + dt / _swordDur)
		var t := _swordSwingT
		var W1 := 0.24
		var W2 := 0.58
		if t < W1:
			var u := _sm(t / W1)
			_swordYaw = _swStartYaw + (_swWindup - _swStartYaw) * u
			pitch = 0.12 + 0.30 * u
			orbitK = u
			_swordRoll = _swRollFrom + (_swRollTo - _swRollFrom) * u * 0.15
		elif t < W2:
			var u := _sm((t - W1) / (W2 - W1))
			_swordYaw = _swWindup + (_swTo - _swWindup) * u
			pitch = 0.42 - 0.56 * u
			roll = -0.20
			orbitK = 1.0
			_swordRoll = _swRollFrom + (_swRollTo - _swRollFrom) * (0.15 + 0.8 * u)
		else:
			var u := _sm((t - W2) / (1 - W2))
			var back := _near_angle(restYaw, _swTo)
			_swordYaw = _swTo + (back - _swTo) * u
			pitch = -0.14 + 0.26 * u
			roll = -0.20 * (1 - u)
			orbitK = 1 - u
			_swordRoll = _swRollFrom + (_swRollTo - _swRollFrom) * (0.95 + 0.05 * u)
		if t < W2: _swSwept = absf(_swWindup - _swordYaw)
		var a := minf(TAU, _swSwept)
		var sN := (t - 0.20) / 0.55
		if a > 0.05 and sN > 0 and sN < 1:
			var segs := maxi(1, mini(TRAIL_SEGS, int(ceil(a / (TAU / TRAIL_SEGS)))))
			swordTrail.mesh = _trail_mesh(segs)
			var sr: float = W.swingRange if W.swingRange else _trailBaseR
			var rk := maxf(0.7, sr / _trailBaseR)
			swordTrail.scale = Vector3(rk, rk, 1)
			_op(swordTrail, sin(sN * PI) * (0.62 if spinning else 0.5))
			swordTrail.visible = true
		else:
			swordTrail.visible = false
	else:
		var tgt := _near_angle(restYaw, _swordYaw)
		var err := tgt - _swordYaw
		if absf(err) > 1.0: _swordYaw = tgt
		else: _swordYaw += err * minf(1, dt * 16)
		pitch = 0.10 + sin(o * 1.4) * 0.07 + lag
		roll = 0.0
		_swordRoll += (0 - fmod(_swordRoll, TAU)) * minf(1, dt * 9)
		if absf(_swordRoll) < 0.004: _swordRoll = 0
		swordTrail.visible = false
	var ppx: float = fx + (p.x - fx) * orbitK
	var ppz: float = fz + (p.y - fz) * orbitK
	var ppy := fy - orbitK * 5
	swordPivot.position = Vector3(ppx, ppy, ppz)
	swordPivot.rotation.y = _swordYaw
	swordInner.rotation = Vector3(roll, 0, pitch)
	swordSpinner.rotation.x = _swordRoll
	var heat := sin(_swordSwingT * PI) if _swordSwingT < 1 else 0.0
	# BIÇAK HALESİ: imza kartı sayısıyla güçlenir
	var wk = W.W.get(wid)
	if wk:
		var tier: int = JS.i(wk.get("spin", 0)) + JS.i(wk.get("twin", 0)) + JS.i(wk.get("wave", 0)) + JS.i(wk.get("echo", 0)) + JS.i(wk.get("fan", 0))
		if tier > 0:
			var flick := 0.62 + 0.24 * sin(o * 11.3) + 0.14 * sin(o * 27.7)
			var base := minf(0.85, 0.22 + tier * 0.14) * flick + heat * 0.5
			var fh: Array = _sw.flameHex
			var hex: String = fh[2] if tier >= 4 else (fh[1] if tier >= 2 else fh[0])
			for i in swordFlame.get_child_count():
				var ch: MeshInstance3D = swordFlame.get_child(i)
				_op(ch, base * (1.0 if i == 0 else 0.72))
				(ch.material_override as ShaderMaterial).set_shader_parameter("color", Color(hex))
				ch.scale = Vector3(1, 0.85 + 0.3 * sin(o * (8 + i * 5) + i), 1)
			swordFlame.visible = true
			swordFlame.rotation.x = sin(o * 2.6) * 0.22
			swordFlameCore.visible = true
			_op(swordFlameCore, minf(0.95, base * 1.25))
		else:
			swordFlame.visible = false
			swordFlameCore.visible = false
	# RUH YANKISI
	if _echoT < 1:
		_echoT = minf(1.0, _echoT + dt / 0.36)
		var t := _echoT
		var a := maxf(0.06, 2.3 * _sm(minf(1.0, t / 0.7)))
		var segs := maxi(1, mini(TRAIL_SEGS, int(ceil(a / (TAU / TRAIL_SEGS)))))
		swordEcho.mesh = _echo_mesh(segs)
		swordEcho.rotation = Vector3(-PI / 2, 0, -a / 2)
		var k: float = ((W.swingRange if W.swingRange else 110.0) * 0.98) / 110.0
		swordEcho.scale = Vector3(k, k, 1)
		swordEchoGroup.position = Vector3(p.x, 46, p.y)
		swordEchoGroup.rotation.y = -_echoDir
		_op(swordEcho, sin(t * PI) * 0.55)
		swordEchoGroup.visible = true
	else:
		swordEchoGroup.visible = false
	# GİRDAP ŞOK DALGASI
	if _shockT < 1:
		_shockT = minf(1.0, _shockT + dt / 0.5)
		var t := _shockT
		var R: float = (W.swingRange if W.swingRange else 150.0) * 1.3
		for i in shockRings.size():
			var m: MeshInstance3D = shockRings[i]
			var sp := 1.0 if i == 0 else 1.55
			var e := minf(1.0, t * sp)
			var r := R * (0.22 + 1.05 * (1 - (1 - e) * (1 - e)))
			m.position = Vector3(p.x, 22 + i * 3, p.y)
			m.scale = Vector3(r, r, 1)
			_op(m, sin(minf(1.0, e) * PI) * (0.8 if i == 0 else 0.5))
			m.visible = e < 1
	elif shockRings.size() and shockRings[0].visible:
		for m in shockRings: m.visible = false
	# AY KESİĞİ: hilal dalgalar
	var waves: Array = W.waves
	for i in waveGroups.size():
		var grp: Node3D = waveGroups[i]
		var m: MeshInstance3D = waveMeshes[i]
		var w = waves[i] if i < waves.size() else null
		if w == null or w.life <= 0:
			grp.visible = false
			continue
		var k: float = w.life / w.max
		grp.position = Vector3(w.x, 30, w.y)
		grp.rotation.y = -w.dir
		var grow: float = (w.r / 44.0) * (1 + (1 - k) * 0.30)
		m.scale = Vector3(grow, grow, 1)
		_op(m, 0.92 * minf(1.0, k * 1.7))
		grp.visible = true

# ═══════════ KALE PALASI ═══════════
var bladePivot: Node3D
var _bladeLastSwingId := 0
var _bladeSwingT := 1.0
var _bladeInit := false
var _blX := 0.0; var _blY := 58.0; var _blZ := 0.0
var _blVX := 0.0; var _blVY := 0.0; var _blVZ := 0.0
var _blYaw = null

func _build_blade() -> void:
	var blade := _wscene("pala")
	if blade == null: return
	Shd.convert_tree(blade, {"rim": false})
	var inner := Render3D.node()
	inner.add_child(blade)
	inner.position = Vector3(6, 0, 0)
	bladePivot = Render3D.node(S)
	bladePivot.add_child(inner)
	bladePivot.visible = false

func _update_blade(g, dt: float) -> void:
	if bladePivot == null: return
	var W = g.weapons
	var show: bool = _charWeapon == "pala" and W != null and W.lvl("pala") > 0
	bladePivot.visible = show
	if not show:
		_bladeInit = false
		return
	var p = g.player
	var ax: float = p.x + 50
	var az: float = p.y + 22
	var ay := 58 + sin(g.time * 1.15) * 7
	if not _bladeInit:
		_bladeInit = true
		_blX = ax; _blZ = az; _blY = ay
		_blVX = 0; _blVZ = 0; _blVY = 0
	var sdt := minf(dt, 0.05)
	var K := 46.0
	var Dd := 9.5
	_blVX += ((ax - _blX) * K - _blVX * Dd) * sdt
	_blVZ += ((az - _blZ) * K - _blVZ * Dd) * sdt
	_blVY += ((ay - _blY) * K - _blVY * Dd) * sdt
	_blX += _blVX * sdt; _blZ += _blVZ * sdt; _blY += _blVY * sdt
	var ddx: float = _blX - p.x
	var ddz: float = _blZ - p.y
	var dd := sqrt(ddx * ddx + ddz * ddz)
	if dd < 34:
		var k := 34 / dd if dd > 0.001 else 1.0
		_blX = p.x + ddx * k; _blZ = p.y + ddz * k
	bladePivot.position = Vector3(_blX, _blY, _blZ)
	var n = W.nearest
	var aimDir: float = atan2(n.y - p.y, n.x - p.x) if n else p.facing
	if W.swingId != _bladeLastSwingId:
		_bladeLastSwingId = W.swingId
		_bladeSwingT = 0.0
	var dur := maxf(0.05, W.swingDur if W.swingDur else 0.18)
	_bladeSwingT = minf(1.0, _bladeSwingT + dt / dur)
	var t := _bladeSwingT
	var sm := t * t * (3 - 2 * t)
	var kick := TAU if W.swingKind == "spin" else PI * 0.62
	var sweep := (1 - sm) * kick
	var want := -aimDir
	if _blYaw == null: _blYaw = want
	var d: float = want - _blYaw
	while d > PI: d -= TAU
	while d < -PI: d += TAU
	_blYaw += d * minf(1, dt * 9)
	bladePivot.rotation = Vector3(-0.30 + sin(g.time * 1.4) * 0.04, _blYaw - sweep, 0.1)

# ═══════════ MAVİ ALEV ═══════════
const FLAME_H := 42.0
var flamePivot: Node3D
var flameFlicker: Node3D
var _flameMats: Array = []
var flameGlow: IMesh
var flameTongues: IMesh
var flameSpill: MeshInstance3D
var _flInit := false
var _flX := 0.0; var _flY := 58.0; var _flZ := 0.0
var _flVX := 0.0; var _flVY := 0.0; var _flVZ := 0.0
var _flYaw := 0.0
var _flCharge := 0.0
var _lastFlameFire := 0
const TONGUE_PH := [0.00, 0.37, 0.62, 0.14, 0.83, 0.49, 0.26]

func _build_flame() -> void:
	flameGlow = _quad_inst("res://assets/fx/glow.png", 4, 3)
	flameTongues = _quad_inst("res://assets/fx/flame_sprite.png", 7, 4)
	flameSpill = Render3D.mesh_node(Geo.plane(FLAME_H * 4.2, FLAME_H * 4.2), _add_mat("res://assets/fx/glow.png", Color("#2f7fe0"), 0.0, false), S)
	flameSpill.rotation.x = -PI / 2
	flameSpill.position.y = 1.6
	flameSpill.visible = false
	var flame := _wscene("alev")
	if flame == null: return
	# ALEV KENDİ IŞIĞINI YAYAR: doku = emissiveMap, şiddet 2,4 (kare başına sürülür)
	_flameMats = Shd.convert_tree(flame, {"rim": false, "metal": 0.0, "rough": 0.45, "lift": 1.0, "emissive_k": 2.4})
	flameFlicker = Render3D.node()
	flameFlicker.add_child(flame)
	var inner := Render3D.node()
	flameFlicker.position.y = -FLAME_H * 0.45
	inner.add_child(flameFlicker)
	inner.position = Vector3(6, 0, 0)
	flamePivot = Render3D.node(S)
	flamePivot.add_child(inner)
	flamePivot.visible = false

func _update_flame(g, dt: float) -> void:
	if flamePivot == null: return
	var W = g.weapons
	var show: bool = _charWeapon == "alev" and W != null and W.lvl("alev") > 0
	flamePivot.visible = show
	if not show:
		_flInit = false
		flameGlow.commit(0); flameTongues.commit(0)
		flameSpill.visible = false
		return
	var p = g.player
	var ax: float = p.x + 50
	var az: float = p.y + 22
	var ay := 54 + sin(g.time * 1.25) * 7
	if not _flInit:
		_flInit = true
		_flX = ax; _flZ = az; _flY = ay
		_flVX = 0; _flVZ = 0; _flVY = 0
	var sdt := 0.05 if dt > 0.05 else dt
	var K := 44.0
	var Dd := 9.0
	_flVX += ((ax - _flX) * K - _flVX * Dd) * sdt
	_flVZ += ((az - _flZ) * K - _flVZ * Dd) * sdt
	_flVY += ((ay - _flY) * K - _flVY * Dd) * sdt
	_flX += _flVX * sdt; _flZ += _flVZ * sdt; _flY += _flVY * sdt
	var ddx: float = _flX - p.x
	var ddz: float = _flZ - p.y
	var dd := sqrt(ddx * ddx + ddz * ddz)
	if dd < 34:
		var k := 34 / dd if dd > 0.001 else 1.0
		_flX = p.x + ddx * k; _flZ = p.y + ddz * k
	flamePivot.position = Vector3(_flX, _flY, _flZ)
	var fwx := cos(_flYaw)
	var fwz := -sin(_flYaw)
	var mx := _flX + fwx * 18
	var mz := _flZ + fwz * 18
	var my := _flY - 10
	W.flamePos.x = mx; W.flamePos.y = mz
	var n = W.nearest
	var aimDir: float = atan2(n.y - p.y, n.x - p.x) if n else p.facing
	var d := -aimDir - _flYaw
	while d > PI: d -= TAU
	while d < -PI: d += TAU
	_flYaw += d * minf(1, dt * 8)
	flamePivot.rotation.y = _flYaw
	var fc: int = W.flameFireCount
	if fc != _lastFlameFire:
		_lastFlameFire = fc
		_flCharge = 1.0
	if _flCharge > 0: _flCharge = maxf(0, _flCharge - dt * 3.4)
	var ch := _flCharge
	var t: float = g.time
	var wob := sin(t * 13.0) * 0.06 + sin(t * 7.3 + 1.7) * 0.04
	var sy := 1 + wob * 1.6 + ch * 0.30
	var sxz := 1 - wob * 0.9 + ch * 0.12
	flameFlicker.scale = Vector3(sxz, sy, sxz)
	flameFlicker.rotation.z = -0.10 - ch * 0.42 + sin(t * 5.1) * 0.05
	var inten := 2.20 + ch * 1.30 + wob * 2.6
	for m in _flameMats: m.set_shader_parameter("emissive_k", inten)
	var H := FLAME_H
	var f1 := 0.70 + 0.20 * sin(t * 12.4) + 0.10 * sin(t * 29.1)
	var f2 := 0.64 + 0.24 * sin(t * 7.9 + 1.1)
	var f3 := 0.56 + 0.18 * sin(t * 4.6 + 2.3)
	var cy := _flY + 2
	_bb(flameGlow, 0, _flX, cy, _flZ, H * 0.80, H * 1.05, 0, (0.38 + ch * 0.42) * f1, (0.62 + ch * 0.24) * f1, 0.86 * f1)
	_bb(flameGlow, 1, _flX, cy, _flZ, H * 1.70, H * 2.00, 0, (0.10 + ch * 0.18) * f2, (0.34 + ch * 0.15) * f2, 0.78 * f2)
	_bb(flameGlow, 2, _flX, cy, _flZ, H * 3.10, H * 3.35, 0, 0.045 * f3, 0.145 * f3, 0.38 * f3)
	var mf := ch * ch
	var ms := 22 + ch * 34
	_bb(flameGlow, 3, mx, my + 4, mz, ms, ms, 0, mf, mf * 0.94, mf * 0.82)
	flameGlow.commit(4)
	var cap := 4 if Quality.stress > 0.6 else 7
	for i in cap:
		var u := fmod(t * 1.45 + TONGUE_PH[i], 1.0)
		var sway := sin(t * 5.3 + i * 2.1) * (4 + u * 10)
		var w := H * (0.40 - u * 0.20) * (1 + sin(t * 17 + i * 3.7) * 0.12)
		var hh := H * (0.74 - u * 0.30)
		var a := (1 - u) * (0.50 + ch * 0.45) * (u / 0.14 if u < 0.14 else 1.0)
		_bb(flameTongues, i, _flX + sway * 0.45 + fwx * 5, _flY - H * 0.26 + u * H * 1.10, _flZ + sway * 0.45 + fwz * 5,
			w, hh, sin(t * 3.1 + i) * 0.14, a * 0.52, a * 0.84, a)
	flameTongues.commit(cap)
	flameSpill.visible = true
	flameSpill.position = Vector3(_flX, 1.6, _flZ)
	_op(flameSpill, (0.11 + wob * 0.45 + ch * 0.10) * 0.45)      # çizgi roman: zemin parıltısı hafif

# ═══════════ KAPTAN TOPU ═══════════
var cannonPivot: Node3D
var cannonInner: Node3D
var cannonSpinner: Node3D
var cannonMuzzle: Node3D
var cannonFlash: Node3D
var _caInit := false
var _caX := 0.0; var _caY := 54.0; var _caZ := 0.0
var _caVX := 0.0; var _caVY := 0.0; var _caVZ := 0.0
var _caYaw := 0.0
var _caKick := 0.0
var _lastCannonFire := 0
var _lastBroadside := 0

func _build_cannon() -> void:
	var gun := _wscene("topatar")
	if gun == null: return
	Shd.convert_tree(gun, {"rim": false})
	var LEN := 46.0
	var barrelLen := float(r3.MODELS.weapons.topatar.get("barrelLen", 46))
	cannonSpinner = Render3D.node()
	cannonSpinner.add_child(gun)
	cannonMuzzle = Render3D.node(cannonSpinner)
	cannonMuzzle.position = Vector3(barrelLen * 1.02, 0, 0)
	cannonFlash = Render3D.node(cannonMuzzle)
	for i in 2:
		var m := Render3D.mesh_node(Geo.plane(LEN * 0.85, LEN * 0.6), _add_mat("res://assets/fx/soft_blob.png", Color("#fff0c0") if i == 0 else Color("#ff8a3c"), 0.0), cannonFlash)
		m.position = Vector3(LEN * 0.26, 0, 0)
		m.rotation.x = i * PI / 2
	cannonFlash.visible = false
	cannonInner = Render3D.node()
	cannonInner.add_child(cannonSpinner)
	cannonInner.position = Vector3(6, 0, 0)
	cannonPivot = Render3D.node(S)
	cannonPivot.add_child(cannonInner)
	cannonPivot.visible = false

func _update_cannon(g, dt: float) -> void:
	if cannonPivot == null: return
	var W = g.weapons
	var show: bool = _charWeapon == "topatar" and W != null and W.lvl("topatar") > 0
	cannonPivot.visible = show
	if not show:
		_caInit = false
		cannonFlash.visible = false
		return
	var p = g.player
	var ax: float = p.x + 50
	var az: float = p.y + 22
	var ay := 54 + sin(g.time * 1.05) * 6
	if not _caInit:
		_caInit = true
		_caX = ax; _caZ = az; _caY = ay
		_caVX = 0; _caVZ = 0; _caVY = 0
	var sdt := 0.05 if dt > 0.05 else dt
	var K := 40.0
	var Dd := 8.6
	_caVX += ((ax - _caX) * K - _caVX * Dd) * sdt
	_caVZ += ((az - _caZ) * K - _caVZ * Dd) * sdt
	_caVY += ((ay - _caY) * K - _caVY * Dd) * sdt
	_caX += _caVX * sdt; _caZ += _caVZ * sdt; _caY += _caVY * sdt
	var ddx: float = _caX - p.x
	var ddz: float = _caZ - p.y
	var dd := sqrt(ddx * ddx + ddz * ddz)
	if dd < 34:
		var k := 34 / dd if dd > 0.001 else 1.0
		_caX = p.x + ddx * k; _caZ = p.y + ddz * k
	cannonPivot.position = Vector3(_caX, _caY, _caZ)
	var n = W.nearest
	var aimDir: float = atan2(n.y - _caZ, n.x - _caX) if n else p.facing
	var d := -aimDir - _caYaw
	while d > PI: d -= TAU
	while d < -PI: d += TAU
	_caYaw += d * minf(1, dt * 9)
	cannonPivot.rotation.y = _caYaw
	var fc: int = W.cannonFireCount
	if fc != _lastCannonFire:
		_lastCannonFire = fc
		var bs: int = W.cannonBroadside
		var big := bs != _lastBroadside
		if big: _lastBroadside = bs
		_caKick = 1.8 if big else 1.0
	if _caKick > 0: _caKick = maxf(0, _caKick - dt * 6.5)
	var kick := _caKick
	cannonSpinner.position.x = -kick * 7
	cannonInner.rotation = Vector3(sin(g.time * 1.2) * 0.05, 0, 0.06 + kick * 0.40 + sin(g.time * 1.6) * 0.04)
	var on := kick > 0.42
	cannonFlash.visible = on
	if on:
		var a := minf(1.0, (kick - 0.42) * 2.2 + 0.3)
		var s := 0.7 + kick * 0.55
		for i in cannonFlash.get_child_count():
			var ch: MeshInstance3D = cannonFlash.get_child(i)
			_op(ch, (0.95 if i == 0 else 0.6) * a)
			ch.scale = Vector3(s, s, 1)
		cannonFlash.rotation.x = g.time * 9
	# NAMLU UCUNUN GERÇEK DÜNYA KONUMU → weapons.fireGun buradan ateşler
	var mp := cannonMuzzle.global_position
	W.cannonPos.x = mp.x; W.cannonPos.y = mp.z
	W.cannonAim = _caYaw

# ═══════════ GÖK KILICI (Gece Kraliçesi) ═══════════
var judgeGroup: Node3D
var _judgeCore: Array = []
var _judgeGlow: Array = []
var judgeRings: Array = []
var _judgeT := 1.0
var _judgeX := 0.0
var _judgeZ := 0.0

func _build_judgement() -> void:
	judgeGroup = Render3D.node(S)
	var mk := func(w: float, h: float, hex: String) -> MeshInstance3D:
		var m := Render3D.mesh_node(Geo.plane(w, h), _add_mat("res://assets/fx/beam.png", Color(hex), 0.0), null)
		m.position.y = h / 2
		return m
	_judgeCore = [mk.call(22, 400, "#eaf6ff"), mk.call(22, 400, "#eaf6ff")]
	_judgeGlow = [mk.call(78, 400, "#7f9cff"), mk.call(78, 400, "#7f9cff")]
	_judgeCore[1].rotation.y = PI / 2
	_judgeGlow[1].rotation.y = PI / 2
	for i in 2: judgeGroup.add_child(_judgeGlow[i])
	for i in 2: judgeGroup.add_child(_judgeCore[i])
	judgeGroup.visible = false
	for i in 2:
		var m := Render3D.mesh_node(Geo.plane(1, 1), _add_mat("res://assets/fx/shock.png", Color("#dfeeff") if i == 0 else Color("#9a8cff"), 0.0), S)
		m.rotation.x = -PI / 2
		m.visible = false
		judgeRings.append(m)

func spawn_judgement(x: float, y: float) -> void:
	_judgeX = x; _judgeZ = y
	_judgeT = 0.0

func _update_judgement(dt: float) -> void:
	if _judgeT >= 1:
		if judgeGroup.visible:
			judgeGroup.visible = false
			judgeRings[0].visible = false
			judgeRings[1].visible = false
		return
	_judgeT = minf(1.0, _judgeT + dt / 0.62)
	var t := _judgeT
	judgeGroup.position = Vector3(_judgeX, 0, _judgeZ)
	judgeGroup.visible = true
	var drop := minf(1.0, t / 0.22)
	var fade := 1.0 if t < 0.22 else maxf(0, 1 - (t - 0.22) / 0.78)
	var stretch := 0.25 + 0.75 * (drop * drop * (3 - 2 * drop))
	for i in 2:
		var c: MeshInstance3D = _judgeCore[i]
		var gl: MeshInstance3D = _judgeGlow[i]
		c.scale = Vector3(0.8 + 0.4 * fade, stretch, 1)
		gl.scale = Vector3(1 + 0.5 * (1 - fade), stretch, 1)
		_op(c, 0.95 * fade)
		_op(gl, 0.45 * fade * fade)
	for i in 2:
		var m: MeshInstance3D = judgeRings[i]
		var sp := 1.5 if i == 0 else 2.4
		var e := minf(1.0, t * sp)
		var r := 240 * (0.16 + 0.9 * (1 - (1 - e) * (1 - e)))
		m.position = Vector3(_judgeX, 20 + i * 3, _judgeZ)
		m.scale = Vector3(r, r, 1)
		_op(m, sin(minf(1.0, e) * PI) * (0.85 if i == 0 else 0.5))
		m.visible = e < 1

# ═══════════ ŞİMŞEK KIRIĞI ═══════════
var shardPivot: Node3D
var shardInner: Node3D
var shardSpinner: Node3D
var shardGlow: IMesh
var shardArcs: IMesh
var shardSpill: MeshInstance3D
var _shArcs: Array = []
var _shBlink := 1.0
var _shBlinkT := 0.0
var _shOrbit := randf() * TAU
var _shX := 0.0; var _shY := 58.0; var _shZ := 0.0
var _shVX := 0.0; var _shVY := 0.0; var _shVZ := 0.0
var _shInit := false
var _shYaw := 0.0
var _lastSimsekFire := 0
var _shCharge := 0.0

func _build_shard() -> void:
	shardGlow = _quad_inst("res://assets/fx/glow.png", 4, 3)
	shardArcs = _quad_inst("res://assets/fx/bolt_2.png", 6, 4)
	for i in 6: _shArcs.append({"t": -1.0, "max": 0.08, "ang": 0.0, "rad": 14.0, "len": 34.0, "tilt": 0.0})
	shardSpill = Render3D.mesh_node(Geo.plane(150, 150), _add_mat("res://assets/fx/glow.png", Color("#4aa6ff"), 0.0, false), S)
	shardSpill.rotation.x = -PI / 2
	shardSpill.position.y = 1.6
	shardSpill.visible = false
	var shard := _wscene("simsek")
	if shard == null: return
	Shd.convert_tree(shard, {"rim": false, "metal": 0.2, "rough": 0.35, "emissive": Color("#2a4a6e"), "emissive_k": 1.2, "keep_emap": false})
	shardSpinner = Render3D.node()
	shardSpinner.add_child(shard)
	shardInner = Render3D.node()
	shardInner.add_child(shardSpinner)
	shardPivot = Render3D.node(S)
	shardPivot.add_child(shardInner)
	shardPivot.visible = false

func _update_shard(g, dt: float) -> void:
	if shardPivot == null: return
	var W = g.weapons
	var show: bool = _charWeapon == "simsek" and W != null and W.lvl("simsek") > 0
	shardPivot.visible = show
	if not show:
		shardGlow.commit(0); shardArcs.commit(0)
		shardSpill.visible = false
		return
	var p = g.player
	_shOrbit += dt
	var o := _shOrbit
	var ax: float = p.x + 48
	var az: float = p.y + 20
	var ay := 60 + sin(o * 1.3) * 8
	if not _shInit:
		_shInit = true
		_shX = ax; _shZ = az; _shY = ay
	var sdt := 0.05 if dt > 0.05 else dt
	var K := 50.0
	var Dd := 10.0
	_shVX += ((ax - _shX) * K - _shVX * Dd) * sdt
	_shVZ += ((az - _shZ) * K - _shVZ * Dd) * sdt
	_shVY += ((ay - _shY) * K - _shVY * Dd) * sdt
	_shX += _shVX * sdt; _shZ += _shVZ * sdt; _shY += _shVY * sdt
	shardPivot.position = Vector3(_shX, _shY, _shZ)
	_shYaw += dt * 1.4
	shardInner.rotation.y = _shYaw
	shardSpinner.rotation.z = sin(o * 2.1) * 0.18
	W.simsekPos.x = _shX; W.simsekPos.y = _shZ
	var fc: int = W.simsekFireCount
	var burst := false
	if fc != _lastSimsekFire:
		_lastSimsekFire = fc
		_shCharge = 1.0
		burst = true
	if _shCharge > 0: _shCharge = maxf(0, _shCharge - dt * 3.2)
	var ch := _shCharge
	_shBlinkT -= dt
	if _shBlinkT <= 0:
		_shBlinkT = 0.04 + randf() * 0.05
		_shBlink = 0.66 + randf() * 0.52
	var bl := _shBlink
	var cy := _shY
	_bb(shardGlow, 0, _shX, cy, _shZ, 27, 27, 0, (0.40 + ch * 0.38) * bl, (0.62 + ch * 0.22) * bl, 0.86 * bl)
	_bb(shardGlow, 1, _shX, cy, _shZ, 62, 62, 0, (0.10 + ch * 0.18) * bl, (0.30 + ch * 0.18) * bl, 0.70 * bl)
	_bb(shardGlow, 2, _shX, cy, _shZ, 124, 124, 0, 0.04 * bl, 0.13 * bl, 0.34 * bl)
	var mf := ch * ch
	_bb(shardGlow, 3, _shX, cy, _shZ, 48 + ch * 66, 48 + ch * 66, 0, mf * 0.55, mf * 0.72, mf * 0.90)
	shardGlow.commit(4)
	var cap := 3 if Quality.stress > 0.6 else _shArcs.size()
	var ac := 0
	for i in cap:
		var s: Dictionary = _shArcs[i]
		s.t -= dt
		if burst:
			s.ang = randf() * 6.2831
			s.len = 30 + randf() * 26
			s.rad = 12 + randf() * 20
			s.tilt = s.ang + (1.5708 if randf() < 0.5 else 0.0) + (randf() - 0.5) * 1.0
			s.max = 0.09 + randf() * 0.06
			s.t = s.max
		elif s.t <= -0.02:
			s.ang = randf() * 6.2831
			s.len = 15 + randf() * 22
			s.rad = 9 + randf() * 17
			s.tilt = s.ang + (1.5708 if randf() < 0.5 else 0.0) + (randf() - 0.5) * 1.0
			s.max = 0.05 + randf() * 0.08
			s.t = s.max + randf() * 0.14
		if s.t <= 0 or s.t > s.max: continue
		var k: float = s.t / s.max
		_bb(shardArcs, ac, _shX + cos(s.ang) * s.rad, _shY + sin(s.ang) * s.rad * 0.9, _shZ, s.len, s.len * 0.34, s.tilt, k * 0.48, k * 0.68, k * 0.86)
		ac += 1
	shardArcs.commit(ac)
	if burst:
		var n := mini(7, maxi(2, Quality.budget("particles") >> 6))
		for i in n:
			var a := randf() * 6.2831
			var sp := 70 + randf() * 120
			g.pools.particles.take().setup(_shX, _shZ, cos(a) * sp, sin(a) * sp * 0.7, 0.26, 2.2, "#ffffff" if i % 3 == 0 else "#9fdcff", 0.94, -30, true)
	shardSpill.visible = true
	shardSpill.position = Vector3(_shX, 1.6, _shZ)
	_op(shardSpill, (0.07 + bl * 0.05 + ch * 0.14) * 0.45)

# ═══════════ ZİNCİR YILDIRIM KAVİSİ + FIRTINA ═══════════
var boltArcs: Array = []
var _boltArcTexs: Array = []
var _boltArcNext := 0
var stormBolt: Node3D
var _stormMeshes: Array = []
var stormRings: Array = []
var _stormT := 1.0
var _stormX := 0.0
var _stormY := 0.0

func _build_arcs() -> void:
	_boltArcTexs = [r3.tex("res://assets/fx/comic/bolt_1.png"), r3.tex("res://assets/fx/comic/bolt_2.png"), r3.tex("res://assets/fx/comic/bolt_3.png")]
	for i in 10:
		var mat: ShaderMaterial = Shd.comic("res://assets/fx/bolt_%d.png" % (i % 3 + 1), Color("#9fdcff"), 0.0, 5)
		var mesh := Render3D.mesh_node(Geo.plane(1, 1), mat, S)
		mesh.visible = false
		boltArcs.append({"mesh": mesh, "life": 0.0, "max": 0.22, "x1": 0.0, "y1": 0.0, "x2": 0.0, "y2": 0.0})
	stormBolt = Render3D.node(S)
	var sp1 := Render3D.mesh_node(Geo.plane(20, 340), _add_mat("", Color("#dff3ff"), 0.0), stormBolt)
	var sp2 := Render3D.mesh_node(Geo.plane(20, 340), _add_mat("", Color("#dff3ff"), 0.0), stormBolt)
	sp2.rotation.y = PI / 2
	sp1.position.y = 150; sp2.position.y = 150
	_stormMeshes = [sp1, sp2]
	stormBolt.visible = false
	for i in 2:
		var m := Render3D.mesh_node(Geo.plane(1, 1), _add_mat("res://assets/fx/shock.png", Color("#dfeeff") if i == 0 else Color("#9fd0ff"), 0.0), S)
		m.rotation.x = -PI / 2
		m.visible = false
		stormRings.append(m)

func spawn_lightning_arc(x1: float, y1: float, x2: float, y2: float) -> void:
	var slot: Dictionary = boltArcs[_boltArcNext]
	_boltArcNext = (_boltArcNext + 1) % boltArcs.size()
	slot.x1 = x1; slot.y1 = y1; slot.x2 = x2; slot.y2 = y2; slot.life = slot.max
	(slot.mesh.material_override as ShaderMaterial).set_shader_parameter("map", _boltArcTexs[randi() % _boltArcTexs.size()])

func spawn_storm_strike(x: float, y: float) -> void:
	_stormX = x; _stormY = y; _stormT = 0.0

func _update_arcs(dt: float) -> void:
	for a in boltArcs:
		var mesh: MeshInstance3D = a.mesh
		if a.life <= 0:
			if mesh.visible: mesh.visible = false
			continue
		a.life -= dt
		var k: float = maxf(0.0, a.life / a.max)
		var dx: float = a.x2 - a.x1
		var dy: float = a.y2 - a.y1
		var dist := maxf(1.0, sqrt(dx * dx + dy * dy))
		mesh.position = Vector3((a.x1 + a.x2) / 2, 40 + sin(k * 30) * 3, (a.y1 + a.y2) / 2)
		mesh.rotation = Vector3(0, atan2(-dy, dx), 0)
		mesh.scale = Vector3(dist, 26, 1)
		_op(mesh, minf(1.0, k * 4) * 0.95)
		mesh.visible = true
	if _stormT < 1:
		_stormT = minf(1.0, _stormT + dt / 0.4)
		var t := _stormT
		var flick := 1.0 if t < 0.5 else (0.4 + sin(t * 60) * 0.3)
		stormBolt.position = Vector3(_stormX, 0, _stormY)
		for m in _stormMeshes: _op(m, (1 - t) * 0.9 * maxf(0, flick))
		stormBolt.visible = true
		for i in stormRings.size():
			var m: MeshInstance3D = stormRings[i]
			var sp := 1.0 if i == 0 else 1.5
			var e := minf(1.0, t * sp)
			var rr := 140 * (0.2 + 1.1 * (1 - (1 - e) * (1 - e)))
			m.position = Vector3(_stormX, 22 + i * 3, _stormY)
			m.scale = Vector3(rr, rr, 1)
			_op(m, sin(minf(1.0, e) * PI) * (0.85 if i == 0 else 0.5))
			m.visible = e < 1
	elif stormBolt.visible:
		stormBolt.visible = false
		for m in stormRings: m.visible = false
