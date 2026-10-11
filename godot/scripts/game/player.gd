class_name Player
extends RefCounted
## player.js — Player sınıfı (hareket, XP, seviye, statlar). Çizim 3B
## tarafındadır (render3d); web'deki 2B drawHunter yolu oyunda çağrılmıyordu.

var game
var charId := ""
var x := 0.0; var y := 0.0
var radius := 14.0; var speed := 172.0
var maxHp := 100.0; var hp := 100.0; var regen := 0.35
var critChance := 0.08; var critMult := 2.2; var armor := 0.0
var magnet := 95.0; var invulnTime := 0.42; var dmgMult := 1.0
var atkPct := 0.0; var dodge := 0.0; var lifeSteal := 0.0; var noHeal := false
var luck := 0.0; var harvest := 0.0; var xpMult := 1.0
var explodeChance := 0.0; var explodeDmgPct := 0.0; var explodeRPct := 0.0
var money := 0.0; var totalMoney := 0.0; var itemCounts := {}
var level := 1; var xp := 0.0; var xpNext := 0.0; var pendingLevels := 0
var invuln := 0.0; var facing := 0.0; var walk := 0.0; var moving := false
var attackT := 0.0; var hurtT := 0.0; var faceHold := 0.0; var faceLeft := false
var lsBucket := 0.0
var _stepT := 0.0
var _wasMoving := false

func _init(g) -> void:
	game = g
	reset()

func reset() -> void:
	if charId == "": charId = D.DEFAULT_CHAR
	x = 0; y = 0
	var P := D.PLAYER
	radius = P.radius; speed = P.speed
	maxHp = P.maxHp; hp = P.maxHp; regen = P.regen
	critChance = P.critChance; critMult = P.critMult; armor = P.armor
	magnet = P.magnet; invulnTime = P.invulnTime
	dmgMult = 1.0
	atkPct = 0; dodge = 0; lifeSteal = 0; noHeal = false; luck = 0; harvest = 0
	xpMult = 1.0; explodeChance = 0; explodeDmgPct = 0; explodeRPct = 0
	money = 0; totalMoney = 0; itemCounts = {}
	level = 1; xp = 0; xpNext = D.xpToNext(1); pendingLevels = 0
	invuln = 0; facing = 0; walk = 0; moving = false
	attackT = 0; hurtT = 0; faceHold = 0; faceLeft = false
	lsBucket = 0

var atkMult: float:
	get: return 1.0 / (1.0 + atkPct)

func apply_mods(m) -> void:
	if not (m is Dictionary): return
	for k in m:
		var v: float = m[k]
		match k:
			"maxHp":
				maxHp = maxf(10.0, maxHp + v)
				if v > 0: hp = minf(maxHp, hp + v)
				elif hp > maxHp: hp = maxHp
			"regen": regen += v
			"speedPct": speed *= (1.0 + v)
			"dmgPct": dmgMult += v
			"atkPct": atkPct += v
			"critChance": critChance += v
			"critMult": critMult += v
			"armor": armor = maxf(0.0, armor + v)
			"dodge": dodge = minf(0.6, dodge + v)
			"magnetPct": magnet *= (1.0 + v)
			"lifeSteal": lifeSteal += v
			"luck": luck += v
			"harvest": harvest += v
			"xpPct": xpMult += v
			"explodeChance": explodeChance += v
			"explodeDmgPct": explodeDmgPct += v
			"explodeRPct": explodeRPct += v

func add_item(item: Dictionary) -> void:
	itemCounts[item.id] = itemCounts.get(item.id, 0) + 1
	apply_mods(item.mods)

func gain_xp(v: float) -> void:
	xp += v
	while xp >= xpNext:
		xp -= xpNext
		level += 1
		pendingLevels += 1
		xpNext = D.xpToNext(level)

func collect_gem(v: float, xpV = null) -> void:
	var mats := maxf(1.0, JS.round_js(v * (1.0 + harvest)))
	money += mats
	totalMoney += mats
	gain_xp((v if xpV == null else float(xpV)) * xpMult)

func trigger_ranged_attack(dir = null) -> void:
	attackT = 0.36
	if dir is float: faceLeft = cos(dir) < 0

func trigger_melee_attack(dir) -> void:
	trigger_ranged_attack(dir)

var lsCapPerSec: float:
	get: return 3.0 + maxHp * 0.02

func drain(dmg: float) -> void:
	if noHeal: return
	if lifeSteal <= 0 or hp >= maxHp or lsBucket <= 0: return
	var want := dmg * lifeSteal
	var h := minf(want, lsBucket)
	if h <= 0: return
	lsBucket -= h
	hp = minf(maxHp, hp + h)

func heal(v: float) -> void:
	v = JS.round_js(v)
	if v <= 0: return
	hp = minf(maxHp, hp + v)
	game.spawn_text(x, y - 26, "+" + JS.s(v), "#7ef2a0", 15, false)

func update(dt: float) -> void:
	var inp = game.input
	inp.sample()
	var mx: float = inp.mx
	var my: float = inp.my
	var mag2 := mx * mx + my * my
	moving = mag2 > 0.001
	if moving:
		x += mx * speed * dt
		y += my * speed * dt
		var A = game.arena
		if A:
			if x < A.l: x = A.l
			elif x > A.r: x = A.r
			if y < A.t: y = A.t
			elif y > A.b: y = A.b
		if game.props: game.props.resolve(self, 19)
		facing = atan2(my, mx)
		walk += dt * (0.6 + sqrt(mag2) * 0.6)
		if absf(mx) > 0.05 and attackT <= 0 and faceHold <= 0: faceLeft = mx < 0
	if attackT > 0: attackT -= dt
	if hurtT > 0: hurtT -= dt
	if faceHold > 0: faceHold -= dt
	if invuln > 0: invuln -= dt
	if hp < maxHp and not noHeal:
		hp = minf(maxHp, hp + regen * dt)
	if lsBucket < lsCapPerSec:
		lsBucket = minf(lsCapPerSec, lsBucket + lsCapPerSec * dt)
	var g = game
	if moving:
		_stepT -= dt
		if not _wasMoving: _stepT = 0
		if _stepT <= 0:
			_stepT = 0.17
			var n := 1 if _wasMoving else 3
			var col: String = g.enemies.worldColor if g.enemies and g.enemies.worldColor else "#6a5a50"
			for i in n:
				g.pools.particles.take().setup(x + (randf() - 0.5) * 10, y + 12,
					(randf() - 0.5) * 30, -12 - randf() * 14, 0.42, 2.2, "#4a403a" if i else col, 0.9, 0, false)
	_wasMoving = moving
