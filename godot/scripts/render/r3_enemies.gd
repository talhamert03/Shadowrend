class_name R3Enemies
extends RefCounted
## render3d.js düşman bölümü (birebir): örnekli kapsül sürüsü + dünyaya özgü
## iskeletli modeller (kalıcı slot ataması, animasyon LOD'u, ceset çöküşü,
## menzilli düşmanın asa pozu) + boss (Hasat Lordu süzülür / Batak Ejderi zıplar).
## Model ölçüleri bake'te ölçüldü (models_meta.json: baseScale, rigPos, restT).

const CORPSE_T := 0.5
const BOSS_HOVER := 12.0
const BOSS_ATK := 0.62
const BOSS_WINDUP := 0.62
const BOSS_CHARGE := 0.7
const DRAGON_ATK := 0.60
const LEAP_H := 44.0
const CAST_AXIS := {"x": Vector3(1, 0, 0), "y": Vector3(0, 1, 0), "z": Vector3(0, 0, 1)}

var r3
var _enemyMax := 480
var enemyMesh: IMesh
var eyeMesh: IMesh
var shadowMesh: IMesh
# boss
var bossMesh: Node3D
var bossFallback: Node3D
var bossRig: Node3D
var bossMats: Array = []
var _bossLift := 0.0
var _bossRigs := {}
var _bossKey := ""
var _bossDef = null
var _bossKind := "lord"
var _bossYaw = null
var _bossEmI := -1.0
var _bossTopY := 108.0
var P := {"y": 0.0, "pitch": 0.0, "roll": 0.0, "push": 0.0, "shadow": 1.0, "glow": 0.0}
# modelli gruplar
var _emFloor = null
var _groups = null
var _scenes := {}
var _tok := 0
var _animFrame := 0
var _flyN := 0
var _cand: Array = []

func _init(r) -> void:
	r3 = r
	_enemyMax = (r3.game.maxEnemies if r3.game and r3.game.maxEnemies else 460) + 20
	var bodyMat := Shd.lit({"roughness": 0.7, "metalness": 0.05, "rim": false})
	enemyMesh = IMesh.new(Geo.capsule(6, 10, 4, 8), bodyMat, _enemyMax)
	r3.scene.add_child(enemyMesh)
	var eyeMat := Shd.lit({"color": Color(0, 0, 0), "emissive": Color(1, 1, 1), "emissive_k": 2.0, "rim": false})
	eyeMesh = IMesh.new(Geo.sphere(1, 6, 6), eyeMat, _enemyMax)
	r3.scene.add_child(eyeMesh)
	var shMat := Shd.basic({"color": Color(0, 0, 0), "alpha": true, "opacity": 0.35, "zwrite": false})
	shadowMesh = IMesh.new(Geo.circle(1, 12, 0, TAU, -PI / 2), shMat, _enemyMax)
	r3.scene.add_child(shadowMesh)
	# boss yer tutucusu (gerçek model yüklenene kadar)
	bossMesh = Render3D.node(r3.scene)
	bossFallback = Render3D.node(bossMesh)
	var body := Render3D.mesh_node(Geo.capsule(30, 40, 4, 10), Shd.lit({"color": Color("#2a1420"), "roughness": 0.6, "rim": false}), bossFallback)
	body.position.y = 55
	var hornMat := Shd.lit({"color": Color("#d8d4c4"), "roughness": 0.4, "rim": false})
	var hl := Render3D.mesh_node(Geo.cone(6, 30, 6), hornMat, bossFallback)
	hl.position = Vector3(-14, 100, 0); hl.rotation.z = 0.3
	var hr := Render3D.mesh_node(Geo.cone(6, 30, 6), hornMat, bossFallback)
	hr.position = Vector3(14, 100, 0); hr.rotation.z = -0.3
	var core := Render3D.mesh_node(Geo.sphere(10, 10, 10), Shd.lit({"color": Color(0, 0, 0), "emissive": Color("#ff3b4e"), "emissive_k": 2.4, "rim": false}), bossFallback)
	core.position.y = 60
	bossMesh.visible = false

# ═══════════ HAZIRLIK ═══════════

## Koşu başlamadan (perde kapalıyken) dünyanın modellerini yükler.
func prepare(floor_id) -> void:
	_ensure_enemy_models(floor_id)
	_ensure_boss_model(floor_id)

func _scene(path: String) -> PackedScene:
	if not _scenes.has(path): _scenes[path] = load(path)
	return _scenes[path]

func _boss_key_for(floor_id) -> String:
	return "bataklik" if floor_id == "bataklik" and r3.MODELS.bosses.has("bataklik") else "lord"

func _ensure_boss_model(floor_id = null) -> void:
	var key := _boss_key_for(floor_id if floor_id != null else _emFloor)
	if key == _bossKey and bossRig: return
	_bossKey = key
	_bossDef = r3.MODELS.bosses[key]
	_bossKind = str(_bossDef.get("kind", "lord"))
	if bossRig: bossRig.visible = false
	if _bossRigs.has(key):
		var c: Array = _bossRigs[key]
		bossRig = c[0]; bossMats = c[1]
		bossRig.visible = true
		bossFallback.visible = false
		_bossEmI = -1
		return
	var ps := _scene("res://assets/models/" + str(_bossDef.file))
	if ps == null: return
	var inst: Node3D = ps.instantiate()
	bossMesh.add_child(inst)
	var rig := inst.find_child("boss_" + key, true, false) as Node3D
	if rig == null: rig = inst
	rig.rotation_order = EULER_ORDER_XYZ
	_bossLift = float(_bossDef.get("lift", 0.0))
	var mats := Shd.convert_tree(inst, {"lift": _bossLift, "rough_max": 0.48, "metal_min": 0.08, "metal_max": 0.22, "rim": true})
	_bossRigs[key] = [rig, mats]
	bossRig = rig; bossMats = mats
	_bossEmI = -1
	bossFallback.visible = false

func _ensure_enemy_models(floor_id) -> void:
	if _emFloor == floor_id: return
	_emFloor = floor_id
	_release_enemy_models()
	var defs: Array = []
	for id in r3.MODELS.enemies:
		var d: Dictionary = r3.MODELS.enemies[id]
		if d.floor == floor_id:
			var dd := d.duplicate()
			dd.id = id
			defs.append(dd)
	if defs.is_empty(): return
	_groups = []
	var b := Quality.budget("modelEnemies")
	var total: int = b if b else 10
	for d in defs: _load_model_group(d, total)

func _load_model_group(def: Dictionary, total: int) -> void:
	var ps := _scene("res://assets/models/" + str(def.file))
	if ps == null: return
	var share: float = def.get("share", 1.0) if def.get("share") != null else 1.0
	var n := maxi(2, JS.round_js(total * share))
	var pool := []
	var lift := float(def.get("lift", 0.0))
	var emI := float(def.get("emissiveIntensity", 1.0)) if def.get("emissiveIntensity") != null else 1.0
	var clip = def.get("clip")
	var dur := float(def.get("clipDur", 0.0))
	var rigPos: Array = def.get("rigPos", [0, 0, 0])
	for i in n:
		var holder := Render3D.node(r3.scene)
		var inst: Node3D = ps.instantiate()
		holder.add_child(inst)
		var gh := inst.find_child("enemy_" + str(def.id), true, false) as Node3D
		var rig: Node3D = (gh.get_child(0) as Node3D) if gh and gh.get_child_count() else inst
		rig.rotation_order = EULER_ORDER_XYZ
		rig.position = Vector3(rigPos[0], rigPos[1], rigPos[2])
		var mats := Shd.convert_tree(inst, {"lift": lift, "rough_max": 0.48, "metal_min": 0.08, "metal_max": 0.22, "rim": true, "emissive_k": 1.0})
		var ek: Array = []
		for m in mats: ek.append(float(m.get_shader_parameter("emissive_k")))
		var ap := inst.find_child("AnimationPlayer", true, false) as AnimationPlayer
		var anim := ""
		if ap:
			ap.callback_mode_process = AnimationMixer.ANIMATION_CALLBACK_MODE_PROCESS_MANUAL
			var lst := ap.get_animation_list()
			anim = str(clip) if clip != null and lst.has(str(clip)) else (lst[0] if lst.size() else "")
			if anim != "":
				ap.get_animation(anim).loop_mode = Animation.LOOP_LINEAR
				ap.play(anim)
		var bones = null
		var sks := inst.find_children("*", "Skeleton3D", true, false)
		var sk: Skeleton3D = sks[0] if sks.size() else null
		if int(def.get("cast", 0)) and sk:
			var b := {"arm": sk.find_bone("R_Upperarm"), "fore": sk.find_bone("R_Forearm"), "spine": sk.find_bone("Spine01"), "head": sk.find_bone("Head")}
			if b.arm >= 0 or b.spine >= 0:
				bones = b
				for k in ["arm", "fore", "spine", "head"]:
					if b[k] >= 0: b[k + "S"] = sk.get_bone_pose_rotation(b[k])
				b.saved = true
		var t0 := randf() * dur if dur > 0 else 0.0
		if ap and anim != "":
			ap.seek(t0, true)
		holder.visible = false
		pool.append({
			"holder": holder, "rig": rig, "rigY0": rig.position.y, "ap": ap, "anim": anim, "t": t0, "dur": dur,
			"sk": sk, "bones": bones, "mats": mats, "ek": ek, "emI": -1.0,
			"e": null, "seed": -1.0, "yaw": 0.0, "sx": 0.0, "sz": 0.0, "aAcc": 0.0,
			"dead": 0.0, "deadAng": 0.0, "fl": 0.0, "hs": 0,
		})
	_groups.append({"pool": pool, "def": def, "baseScale": float(def.baseScale), "emI": emI,
		"types": def.types, "shadowR": float(def.get("shadowR", 11))})

func _release_enemy_models() -> void:
	_flyN = 0
	if _groups == null: return
	for G in _groups:
		for p in G.pool: p.holder.queue_free()
	_groups = null

# ═══════════ KARE ═══════════

func update(g, dt: float) -> void:
	var act: Array = g.enemies.pool.active
	var idx := 0
	var bossFound = null
	var sh := 0
	var wd = g.world_def()
	_ensure_enemy_models(wd.floor if wd else null)
	_tok += 1
	var tok := _tok
	if _groups:
		_animFrame = (_animFrame + 1) & 1023
		for G in _groups: sh = _drive_group(g, dt, G, act, tok, sh, _animFrame)
	var px: float = g.player.x
	var py: float = g.player.y
	for i in act.size():
		var e = act[i]
		if e.isBoss:
			bossFound = e
			continue
		if e.mdlTok == tok: continue
		if idx >= _enemyMax: break
		var scale: float = e.radius * (1.28 if e.elite else 1.0) / 15
		var bob := sin(e.bob * 4 + e.seed) * 1.6
		var x: float = e.x
		var y := 11 * scale + bob
		var z: float = e.y
		var yaw := atan2(px - e.x, py - e.y)
		if e.hitT > 0:
			var hu: float = 1 - e.hitT / (e.hitD if e.hitD else 0.15)
			var iu := 1 - hu
			var sq := cos(hu * 4.7) * iu * iu
			x += cos(e.hurtAng) * 6 * iu * iu
			z += sin(e.hurtAng) * 6 * iu * iu
			enemyMesh.set_ys(idx, x, y, z, yaw, scale * (1 + 0.09 * sq), scale * (1 - 0.15 * sq), scale * (1 + 0.09 * sq))
		else:
			enemyMesh.set_ys(idx, x, y, z, yaw, scale, scale, scale)
		var c := Color(1, 1, 1) if e.flash > 0 else JS.col(e.color).srgb_to_linear()
		enemyMesh.set_col(idx, c.r, c.g, c.b)
		var es := 2.2 * scale
		eyeMesh.set_ys(idx, x + sin(yaw) * 5 * scale, y + 8 * scale, z + cos(yaw) * 5 * scale, yaw, es, es, es)
		if sh < _enemyMax:
			shadowMesh.set_ys(sh, e.x, 0.3, e.y, 0, scale * 9, scale * 9, scale * 9)
			sh += 1
		idx += 1
	if bossFound: sh = _drive_boss(g, bossFound, sh, dt)
	else: bossMesh.visible = false
	enemyMesh.commit(idx)
	eyeMesh.commit(idx)
	shadowMesh.commit(sh)

func _in_v(g, e) -> bool: return g.in_view(e.x, e.y, 110)

func _drive_group(g, dt: float, EM: Dictionary, act: Array, tok: int, sh: int, af: int) -> int:
	var pool: Array = EM.pool
	var cap := pool.size()
	var px: float = g.player.x
	var py: float = g.player.y
	var types: Array = EM.types
	var bs: float = EM.baseScale
	var sp: Dictionary = EM.def
	# 0) cesetler — ölüm patlamasının yerine gelen çöküş
	for i in cap:
		var p: Dictionary = pool[i]
		if not (p.dead > 0): continue
		p.dead -= dt
		var H: Node3D = p.holder
		if p.dead <= 0:
			p.dead = 0.0
			if p.fl:
				p.fl = 0.0
				_flyN = maxi(0, _flyN - 1)
			H.visible = false
			H.rotation = Vector3(0, p.yaw, 0)
			H.position.y = 0
			H.scale = Vector3(bs, bs, bs)
			continue
		var k: float = 1 - p.dead / CORPSE_T
		var fall := (k / 0.22) * (k / 0.22) if k < 0.22 else 1.0
		var sink := 0.0 if k < 0.30 else (k - 0.30) / 0.70
		var rel: float = p.deadAng - p.yaw
		var amt := 1.24 * fall
		H.rotation = Vector3(cos(rel) * amt, p.yaw, -sin(rel) * amt)
		var fx: float = p.sx
		var fz: float = p.sz
		var fy := 0.0
		if p.fl:
			var kk := minf(1.0, k / 0.5)
			var ez := 1 - (1 - kk) * (1 - kk)
			fx += cos(p.deadAng) * p.fl * ez
			fz += sin(p.deadAng) * p.fl * ez
			fy = sin(PI * kk) * p.fl * 0.45
		H.position = Vector3(fx, fy - float(sp.height) * 0.62 * sink * sink, fz)
		var sq := 1 - 0.22 * fall
		H.scale = Vector3(bs * (1 + 0.10 * fall), bs * sq, bs * (1 + 0.10 * fall))
		if sh < _enemyMax:
			var r: float = EM.shadowR * (1 - 0.75 * k)
			shadowMesh.set_ys(sh, p.sx, 0.3, p.sz, 0, r, r, r)
			sh += 1
	# 1) aday havuzu
	_cand.clear()
	for e in act:
		if e.isBoss or not types.has(e.type): continue
		e.aliveTok = tok
		e.bound = false
		_cand.append(e)
	# 2) mevcut bağları doğrula
	var free := 0
	for i in cap:
		var p: Dictionary = pool[i]
		if p.dead > 0: continue
		var e = p.e
		if e and e.aliveTok == tok and e.seed == p.seed and e.hp > 0:
			e.bound = true
		else:
			p.e = null
			free += 1
			if p.holder.visible: p.holder.visible = false
	# 3) boş slotları doldur: önce ekrandakiler, sonra oyuncuya yakınlar
	if free > 0 and _cand.size():
		for e in _cand:
			e.score = (e.x - px) * (e.x - px) + (e.y - py) * (e.y - py) + (0.0 if _in_v(g, e) else 4e8)
		_cand.sort_custom(func(a, b): return a.score < b.score)
		for e in _cand:
			if free <= 0: break
			if e.bound: continue
			for i in cap:
				var p: Dictionary = pool[i]
				if p.e or p.dead > 0: continue
				p.e = e; p.seed = e.seed; e.bound = true; free -= 1
				p.sx = e.x; p.sz = e.y
				p.aAcc = 0.0
				p.yaw = atan2(px - e.x, py - e.y)
				p.holder.scale = Vector3(bs, bs, bs)
				break
	# 4) ekran dışı bağları ekrandaki bağlanmamış düşmanlara devret
	var steal := -1
	for e in _cand:
		if e.bound or not _in_v(g, e): continue
		if steal < 0: steal = 0
		var done := false
		while steal < cap and not done:
			var p: Dictionary = pool[steal]
			steal += 1
			if p.dead > 0 or not p.e or _in_v(g, p.e): continue
			p.e.bound = false
			p.e = e; p.seed = e.seed; e.bound = true
			p.sx = e.x; p.sz = e.y
			p.aAcc = 0.0
			p.yaw = atan2(px - e.x, py - e.y)
			p.holder.scale = Vector3(bs, bs, bs)
			done = true
		if not done: break
	# 5) bağlı slotları sür
	var kPos := 1 - exp(-dt * 26)
	var kRot := 1 - exp(-dt * 14)
	var camX: float = g.cam.x
	var camY: float = g.cam.y
	var lowT := Quality.tier == "low"
	var hot := 1 if Quality.stress > 0.5 else 0
	var stepRate := float(sp.get("stepRate", 0.62)) if sp.get("stepRate") != null else 0.62
	var stepMin := float(sp.get("stepMin", 0.5)) if sp.get("stepMin") != null else 0.5
	var stepMax := float(sp.get("stepMax", 0.85)) if sp.get("stepMax") != null else 0.85
	var idleRate = sp.get("idleRate")
	var restT = sp.get("restT")
	for i in cap:
		var p: Dictionary = pool[i]
		var e = p.e
		if not e: continue
		e.mdlTok = tok
		e.mdlTop = float(sp.height)
		p.sx += (e.x - p.sx) * kPos
		p.sz += (e.y - p.sz) * kPos
		var dYaw: float = atan2(px - e.x, py - e.y) - p.yaw
		while dYaw > PI: dYaw -= TAU
		while dYaw < -PI: dYaw += TAU
		p.yaw += dYaw * kRot
		var H: Node3D = p.holder
		var vis := _in_v(g, e)
		H.visible = vis
		if not vis:
			p.aAcc = minf(1.0, p.aAcc + dt * stepRate)
			continue
		H.position = Vector3(p.sx, 0, p.sz)
		H.rotation = Vector3(0, p.yaw, 0)
		if e.hitT > 0:
			var hu: float = 1 - e.hitT / (e.hitD if e.hitD else 0.15)
			var iu := 1 - hu
			var sq := cos(hu * 4.7) * iu * iu
			var wdt := bs * (1 + 0.09 * sq)
			H.scale = Vector3(wdt, bs * (1 - 0.15 * sq), wdt)
			H.position.x += cos(e.hurtAng) * 6 * iu * iu
			H.position.z += sin(e.hurtAng) * 6 * iu * iu
			p.hs = 1
		elif p.hs:
			p.hs = 0
			H.scale = Vector3(bs, bs, bs)
		var idle: bool = idleRate != null and e.mvAmt < 6
		var adt: float = dt * maxf(stepMin, minf(stepMax, ((e.speed if e.speed else 46.0) / 46.0) * stepRate)) * (float(idleRate) if idle else 1.0)
		p.aAcc += 0.0 if e.stopT > 0 else adt
		var ddx: float = p.sx - camX
		var ddy: float = p.sz - camY
		var d2 := ddx * ddx + ddy * ddy
		var off: bool = not g.in_view(e.x, e.y, 60)
		var every: int
		if off: every = 8
		elif lowT: every = 1 if d2 < 200 * 200 else (2 + hot if d2 < 440 * 440 else 4 + hot)
		else: every = 1 if d2 < 260 * 260 else (2 + hot if d2 < 560 * 560 else 3 + hot)
		if every == 1 or ((af + i) % every) == 0:
			if p.bones and p.bones.saved: _unpose_caster(p)
			if p.ap and p.anim != "":
				var dur: float = p.dur
				if idle and restT != null and dur > 0:
					var dT: float = float(restT) - p.t
					dT -= round(dT / dur) * dur
					var step: float = p.aAcc * 3.2 + dt * 0.55
					p.t = p.t + step if dT > step else (p.t - step if dT < -step else float(restT))
					if p.t < 0: p.t += dur
					elif p.t > dur: p.t -= dur
				elif dur > 0:
					var t: float = p.t + p.aAcc
					t -= floor(t / dur) * dur
					p.t = t
				p.ap.seek(p.t, true)
			p.aAcc = 0.0
			if p.bones: _pose_caster(p, e, g.time, sp)
		var wantI: float = 3.2 if e.flash > 0 else (EM.emI * 1.5 if e.elite else EM.emI)
		if p.emI != wantI:
			p.emI = wantI
			var mats: Array = p.mats
			for mi in mats.size(): mats[mi].set_shader_parameter("emissive_k", p.ek[mi] * wantI)
		if sh < _enemyMax:
			var r: float = EM.shadowR
			shadowMesh.set_ys(sh, p.sx, 0.3, p.sz, 0, r, r, r)
			sh += 1
	return sh

## MENZİLLİ DÜŞMANIN ASA POZU + YERİNDE DURMA (kemik düzeyinde delta)
func _pose_caster(p: Dictionary, e, t: float, sp: Dictionary) -> void:
	var B: Dictionary = p.bones
	var sk: Skeleton3D = p.sk
	var AX: Vector3 = CAST_AXIS.get(str(sp.get("castAxis", "z")), Vector3(0, 0, 1))
	var moving: bool = e.mvAmt > 6
	var a: float = minf(1.0, e.atkAnim / 0.55) if e.atkAnim > 0 else 0.0
	var f := a * a
	var br := 0.0 if moving else sin(t * 1.5 + e.seed) * (1 - f)
	var sw := 0.0 if moving else sin(t * 0.9 + e.seed * 1.7) * (1 - f)
	if B.arm >= 0:
		B.armS = sk.get_bone_pose_rotation(B.arm)
		sk.set_bone_pose_rotation(B.arm, B.armS * Quaternion(AX, -1.35 * f - 0.07 * br))
	if B.fore >= 0:
		B.foreS = sk.get_bone_pose_rotation(B.fore)
		sk.set_bone_pose_rotation(B.fore, B.foreS * Quaternion(AX, -0.55 * f))
	if B.spine >= 0:
		B.spineS = sk.get_bone_pose_rotation(B.spine)
		sk.set_bone_pose_rotation(B.spine, B.spineS * Quaternion(Vector3(1, 0, 0), 0.11 * f + 0.03 * br))
	if B.head >= 0:
		B.headS = sk.get_bone_pose_rotation(B.head)
		sk.set_bone_pose_rotation(B.head, B.headS * Quaternion(Vector3(1, 0, 0), -0.06 * f - 0.02 * br))
	var rig: Node3D = p.rig
	rig.rotation.z = 0.05 * f + 0.014 * sw
	rig.position.y = p.rigY0

func _unpose_caster(p: Dictionary) -> void:
	var B: Dictionary = p.bones
	var sk: Skeleton3D = p.sk
	for k in ["arm", "fore", "spine", "head"]:
		if B[k] >= 0: sk.set_bone_pose_rotation(B[k], B[k + "S"])

## DÜŞMAN ÖLDÜ — modelli slot varsa cesede çevirir (enemyManager.onDeath).
func enemy_death(e, ang: float, quiet: bool) -> void:
	if _groups == null: return
	for G in _groups:
		for p in G.pool:
			if p.e != e: continue
			p.e = null
			if quiet or not p.holder.visible:
				p.holder.visible = false
				return
			p.dead = CORPSE_T
			p.deadAng = ang
			p.sx = e.x; p.sz = e.y
			p.fl = 0.0
			if _flyN < 12 and not e.elite:
				p.fl = 64.0 if e.stopMv else 28.0
				_flyN += 1
			return

# ═══════════ BOSS ═══════════

func _drive_boss(g, e, sh: int, dt: float) -> int:
	_ensure_boss_model()
	var B := bossMesh
	B.visible = true
	B.position = Vector3(e.x, 0, e.y)
	var want := atan2(g.player.x - e.x, g.player.y - e.y)
	if _bossKind == "ejder":
		var cur: float = _bossYaw if _bossYaw != null else want
		var d := want - cur
		while d > PI: d -= TAU
		while d < -PI: d += TAU
		var step: float = float(D.DRAGON.turnRate) * (dt if dt else 0.016)
		_bossYaw = cur + clampf(d, -step, step)
		B.rotation.y = _bossYaw
	else:
		B.rotation.y = want
		_bossYaw = want
	var sc: float = e.radius / 47.0
	B.scale = Vector3(sc, sc, sc)
	var rig := bossRig
	if rig == null:
		_bossTopY = 108 * sc
		return sh
	if _bossKind == "ejder": _dragon_pose(g.time, e.atkAnim, e.state, e.stateT)
	else: _boss_pose(g.time, e.atkAnim, e.state, e.stateT)
	rig.position = Vector3(0, P.y, P.push)
	rig.rotation = Vector3(P.pitch, 0, P.roll)
	_bossTopY = (P.y + float(_bossDef.height)) * sc
	var wantI: float = 3.8 if e.flash > 0 else 1 + P.glow * 1.9
	if absf((_bossEmI if _bossEmI >= 0 else 1.0) - wantI) > 0.02:
		_bossEmI = wantI
		for m in bossMats: m.set_shader_parameter("emissive_k", _bossLift * wantI)
	if sh < _enemyMax:
		var r: float = float(_bossDef.shadowR) * sc * P.shadow
		shadowMesh.set_ys(sh, e.x, 0.35, e.y, 0, r, r, r)
		sh += 1
	return sh

func boss_top_y() -> float: return _bossTopY

static func _ease(k: float) -> float: return k * k * (3 - 2 * k)

## bossMotion.bossPose — HASAT LORDU'NUN SÜZÜLME + SALDIRI POZU
func _boss_pose(t: float, atkT: float, state: String, stateT: float) -> void:
	P.y = BOSS_HOVER + sin(t * 1.05) * 2.4 + sin(t * 2.31) * 0.55
	P.pitch = 0.02 + sin(t * 0.83) * 0.03
	P.roll = sin(t * 0.61) * 0.04
	P.push = 0.0
	P.glow = 0.0
	if state == "windup":
		var k := _ease(1 - maxf(0, stateT) / BOSS_WINDUP)
		P.y += 9 * k
		P.pitch -= 0.30 * k
		P.roll += sin(t * 26) * 0.014 * k
		P.glow = k
	elif state == "charge":
		var k := minf(1.0, (1 - maxf(0, stateT) / BOSS_CHARGE) * 3.4)
		P.y -= 7 * k
		P.pitch += 0.34 * k
		P.roll += sin(t * 19) * 0.03
		P.glow = 0.85 - 0.5 * k
	elif atkT > 0:
		var p := 1 - atkT / BOSS_ATK
		if p < 0.44:
			var k := _ease(p / 0.44)
			P.y += 6 * k; P.pitch -= 0.20 * k; P.glow = 0.55 * k
		elif p < 0.64:
			var k := (p - 0.44) / 0.20
			P.y += 6 - 13 * k
			P.pitch += -0.20 + 0.50 * k
			P.push = 7 * k
			P.glow = 0.55 - 0.55 * k
		else:
			var k := 1 - (p - 0.64) / 0.36
			P.y -= 7 * k * k; P.pitch += 0.30 * k * k; P.push = 7 * k
	P.shadow = maxf(0.55, 1 - (P.y - BOSS_HOVER) * 0.019)

## bossMotion.dragonPose — BATAK EJDERİ (yürümez: nefes, zıplama, salvo)
func _dragon_pose(t: float, atkT: float, state: String, stateT: float) -> void:
	var TELL: float = D.DRAGON.leapTell
	var LEAP: float = D.DRAGON.leapTime
	P.y = sin(t * 1.35) * 1.5 + sin(t * 2.7) * 0.4
	P.pitch = 0.015 + sin(t * 0.9) * 0.025
	P.roll = sin(t * 0.72) * 0.05
	P.push = 0.0
	P.glow = 0.0
	if state == "leap":
		var k := 1 - clampf(stateT / LEAP, 0, 1)
		var arc := sin(k * PI)
		P.y += LEAP_H * arc
		P.pitch += -0.26 * arc + 0.30 * ((k - 0.72) / 0.28 if k > 0.72 else 0.0)
		P.roll += sin(k * 11) * 0.05
		P.glow = 0.5 * arc
	elif state == "tell":
		var k := _ease(1 - maxf(0, stateT) / TELL)
		P.y -= 5 * k
		P.pitch += 0.14 * k
		P.roll += sin(t * 30) * 0.02 * k
		P.glow = 0.9 * k
	elif atkT > 0:
		var p := 1 - atkT / DRAGON_ATK
		if p < 0.40:
			var k := _ease(p / 0.40)
			P.pitch -= 0.22 * k; P.y += 3 * k; P.glow = 0.6 * k
		else:
			var k := minf(1.0, (p - 0.40) / 0.26)
			P.pitch += -0.22 + 0.40 * k
			P.push = 9 * k * (1 - k) * 4
			P.y += 3 - 3 * k
			P.glow = 0.6 - 0.6 * k
	P.shadow = maxf(0.42, 1 - maxf(0, P.y) * 0.011)
