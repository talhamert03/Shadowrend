class_name EnemyManager
extends RefCounted
## enemyManager.js — Sürüler, zekâ ve dünya boss'ları (birebir).
## 72 px hücreli uzamsal ızgara, sürü ayrışması, elit değiştiriciler,
## Hasat Lordu ve Batak Ejderi durum makineleri. (Web'deki 2B sprite
## pişirme/çizim yolu 3B'ye geçilince ölü koddu — taşınmadı.)

const AFX := {"SHIELD": 1, "SPLIT": 2, "SWIFT": 4, "BLAST": 8, "REGEN": 16, "RAGE": 32}
static var ELITE_AFFIX := [
	{"bit": 1,  "name": "KALKANLI", "col": "#9fb4c9"},
	{"bit": 2,  "name": "BÖLÜNEN",  "col": "#8fd46a"},
	{"bit": 4,  "name": "ÇEVİK",    "col": "#e8e0a0"},
	{"bit": 8,  "name": "PATLAYAN", "col": "#d8a284"},
	{"bit": 16, "name": "YENİLENEN", "col": "#6fe0c8"},
	{"bit": 32, "name": "ÖFKELİ",   "col": "#ff5a4e"},
]
const BOSS_ATK := 0.62
const DRAGON_ATK := 0.60

# ── Uzamsal ızgara ──
class SpatialGrid:
	var cs: float
	var cells := {}
	var used: Array = []
	func _init(cell_size: float) -> void:
		cs = cell_size
	func key(cx: int, cy: int) -> int:
		return ((cx + 32768) << 16) ^ (cy + 32768)
	func clear() -> void:
		for a in used: a.clear()
		used.clear()
	func insert(e) -> void:
		var k := key(int(floor(e.x / cs)), int(floor(e.y / cs)))
		var arr = cells.get(k)
		if arr == null:
			arr = []
			cells[k] = arr
		if arr.is_empty(): used.append(arr)
		arr.append(e)
	func query(x: float, y: float, r: float, out: Array) -> Array:
		out.clear()
		var x0 := int(floor((x - r) / cs)); var x1 := int(floor((x + r) / cs))
		var y0 := int(floor((y - r) / cs)); var y1 := int(floor((y + r) / cs))
		for cx in range(x0, x1 + 1):
			for cy in range(y0, y1 + 1):
				var arr = cells.get(key(cx, cy))
				if arr == null: continue
				out.append_array(arr)
		return out

var game
var pool: Pool
var grid := SpatialGrid.new(72)
var scratch: Array = []
var worldHue := 0.0
var worldColor := "#ff3b4e"
var worldBoss := ""
var speedMul := 1.0
var eliteChance := 0.0
var bossKind := "lord"

var wave := 1
var spawning := false
var spawnTimer := 1.2
var interval := 1.0
var batch := 1.0
var weights := {"zombi": 10.0}
var hpMul := 1.0
var dmgMul := 1.0
var bossSpawned := false
var bossDefeated := false
var boss: Ent.Enemy = null
var bossCount := 0
var killSndT := 0.0
var waveT := 0.0
var queue := 0.0
var qTimer := 0.0
var inView := 0
var densityMul := 1.0
var osCap := 64.0
var aliveCap := 120.0
var bossHpMul := 1.0
var bossDeathX := 0.0; var bossDeathY := 0.0; var bossDeathR := 60.0
var _chainOut: Array = []

func _init(g) -> void:
	game = g
	worldColor = D.COLORS.blood
	worldBoss = D.BOSS.name
	pool = Pool.new("enemies", func(): return Ent.Enemy.new(), 300)
	reset()

## Havuzdan düşman al ve kur (web'deki pool reset fonksiyonu).
func obtain(type: String, x: float, y: float, p_hpMul: float, p_dmgMul: float) -> Ent.Enemy:
	var e: Ent.Enemy = pool.take()
	e.x = x; e.y = y
	e.type = type
	e.flash = 0; e.kx = 0; e.ky = 0; e.hurtT = 0; e.atkAnim = 0; e.mvAmt = 0
	e.hitT = 0; e.hitD = 0.15; e.stopT = 0; e.stopCd = 0; e.stopMv = false; e.thief = false; e.duelTok = 0
	e.thiefStep = 0
	e.txt = null; e.txtT = -9
	e.seed = randf() * 6.283
	e.bob = randf() * 6.283
	e.obCd = 0; e.swordId = 0; e.waveHit = 0
	e.standD = 0
	e.state = "chase"; e.stateT = 0; e.cdx = 0; e.cdy = 0; e.dirx = 0; e.diry = 0
	e.elite = false; e.entryT = 0; e.prey = false; e._ultN = 0
	e.affix = 0; e.shieldHp = 0; e.shieldMax = 0; e.regenT = 0; e.enraged = false; e.affixCol = ""
	e.fuse = 0; e.auraT = 0; e.auraDmg = 0; e.hurtAng = 0; e.leapCd = 0
	e.tx = 0; e.ty = 0
	e.lastCrit = false
	if type == "boss":
		var B := D.BOSS
		e.isBoss = true
		e.bossKind = bossKind if bossKind else "lord"
		e.maxHp = JS.round_js(B.hp * p_hpMul)
		e.hp = e.maxHp
		e.speed = B.speed
		e.radius = B.radius
		e.dmg = B.dmg * p_dmgMul
		e.xp = B.xp
		e.color = D.COLORS.boss
		e.knockRes = B.knockRes
		e.chargeCd = B.chargeCd * 0.6
		e.bulletDmg = B.bulletDmg * p_dmgMul
		e.bulletSpeed = B.bulletSpeed
		e.spitCd = D.DRAGON.spitCd * 0.6 if e.bossKind == "ejder" else B.spitCd
		e.leapCd = D.DRAGON.leapCd * (0.6 if e.phase >= 2 else 1.0) * 0.8
		e.state = "perch" if e.bossKind == "ejder" else "chase"
	else:
		var s: Dictionary = D.ENEMY_TYPES[type]
		e.isBoss = false
		e.maxHp = JS.round_js(s.hp * p_hpMul)
		e.hp = e.maxHp
		e.speed = s.speed * (0.88 + randf() * 0.24)
		e.radius = s.radius
		e.dmg = s.dmg * p_dmgMul
		e.xp = s.xp
		e.color = s.color
		e.knockRes = s.knockRes
		e.range = JS.num(s, "range")
		e.fireCd = randf() * float(s.fireCd) if JS.truthy(s.get("fireCd")) else 0.0
		e.bulletDmg = JS.num(s, "bulletDmg") * p_dmgMul
		e.bulletSpeed = JS.num(s, "bulletSpeed")
		if type == "kral":
			e.auraT = s.auraCd * 0.75
			e.auraDmg = s.auraDmg * p_dmgMul
	return e

func reset() -> void:
	pool.release_all()
	wave = 1
	spawning = false
	spawnTimer = 1.2
	interval = 1.0
	batch = 1
	weights = {"zombi": 10.0}
	hpMul = 1; dmgMul = 1
	bossSpawned = false; bossDefeated = false
	boss = null
	bossCount = 0
	killSndT = 0
	waveT = 0; queue = 0; qTimer = 0
	inView = 0

func set_world(wd: Dictionary) -> void:
	worldColor = wd.color
	worldBoss = wd.boss
	speedMul = JS.num(wd, "speedMul", 1.0)
	bossKind = "ejder" if wd.floor == "bataklik" else "lord"
	worldHue = wd.hue

func start_wave(w: int) -> void:
	var msn: Dictionary = game.msn
	var eff: float = w + msn.mixOffset
	wave = w
	hpMul = D.waveHpMul(w) * msn.hpMul
	dmgMul = D.waveDmgMul(w) * msn.dmgMul
	weights = D.waveWeights(eff, msn.roster)
	densityMul = JS.num(msn, "density", 1.0) * (0.4 if game.is_boss_wave(w) else 1.0)
	interval = D.spawnGap(w, 1)
	batch = D.spawnBatch(w, densityMul, 1)
	waveT = 0; queue = 0; qTimer = 0
	osCap = D.onScreenCap(w)
	aliveCap = JS.num(msn, "aliveCap", 120.0)
	var bhm = msn.get("bossHpMul")
	bossHpMul = D.waveHpMul(w) * (float(bhm) if JS.truthy(bhm) else float(msn.hpMul))
	eliteChance = JS.num(msn, "eliteChance")
	spawnTimer = 0.55
	spawning = true
	bossSpawned = false
	bossDefeated = false
	boss = null
	game.apply_wave_mods()
	if game.is_boss_wave(w): spawn_boss()

func clear_all() -> void:
	var g = game
	var act := pool.active
	var i := act.size() - 1
	while i >= 0:
		var e: Ent.Enemy = act[i]
		if g.in_view(e.x, e.y, 40):
			g.spawn_burst(e.x, e.y, e.color, 5, 130, 2.5, 0.4, false)
			g.spawn_gem(e.x, e.y, maxf(1.0, JS.round_js(e.xp * 0.5)))
		i -= 1
	pool.release_all()
	g.pools.eBullets.release_all()
	boss = null
	spawning = false

func can_spawn() -> bool:
	return pool.count < mini(int(aliveCap if aliveCap else 120.0), Quality.budget("enemies"))

func pressure() -> float:
	var g = game
	return D.pressureAt(g.time, waveT, g.dyn_mul())

func spawn_at_point(x: float, y: float):
	var g = game
	var before := pool.count
	spawn_one(weights, hpMul, dmgMul)
	if pool.count == before: return null
	var e: Ent.Enemy = pool.active[pool.count - 1]
	if e == null: return null
	e.x = x; e.y = y
	var A = g.arena
	if A:
		e.x = maxf(A.l + 26, minf(A.r - 26, e.x))
		e.y = maxf(A.t + 26, minf(A.b - 26, e.y))
	if g.props: g.props.resolve(e, e.radius * 0.62)
	return e

func update(dt: float) -> void:
	var g = game
	var froze: bool = g.powerups and g.powerups.frozen()
	var cap := mini(int(aliveCap if aliveCap else 120.0), Quality.budget("enemies"))
	if not froze: waveT += dt
	if not froze and spawning:
		var pr := pressure()
		interval = D.spawnGap(wave, pr)
		batch = D.spawnBatch(wave, densityMul if densityMul else 1.0, pr)
		spawnTimer -= dt
		if spawnTimer <= 0:
			spawnTimer = interval
			queue += batch
		if queue > 0:
			qTimer -= dt
			var guard := 12
			while queue > 0 and qTimer <= 0 and guard > 0:
				guard -= 1
				if pool.count >= cap or inView >= (osCap if osCap else 64.0):
					queue = 0
					break
				spawn_one(weights, hpMul, dmgMul)
				queue -= 1
				qTimer += D.RAMP.spread
			if qTimer < 0: qTimer = 0

	var udt := 0.0 if froze else dt
	var act := pool.active
	var i := act.size() - 1
	while i >= 0:
		if i >= act.size():
			i = act.size() - 1
			continue
		var e: Ent.Enemy = act[i]
		if update_enemy(e, udt): pool.release(e)
		i -= 1

	grid.clear()
	var vis := 0
	for e in pool.active:
		grid.insert(e)
		if g.in_view(e.x, e.y, 20): vis += 1
	inView = vis

	separate()

	var B: Array = g.pools.eBullets.active
	i = B.size() - 1
	while i >= 0:
		var b = B[i]
		if update_bullet(b, dt): g.pools.eBullets.release(b)
		i -= 1

	if killSndT > 0: killSndT -= dt

func spawn_one(w: Dictionary, p_hpMul: float, p_dmgMul: float) -> void:
	var total := 0.0
	for k in w: total += w[k]
	var roll := randf() * total
	var type := "zombi"
	for k in w:
		roll -= w[k]
		if roll <= 0:
			type = k
			break
	var g = game
	var m: float = D.WAVES.spawnDist
	var ww: float = (g.viewR - g.viewL) + m * 2
	var hh: float = (g.viewB - g.viewT) + m * 2
	var per := 2.0 * (ww + hh)
	var d := randf() * per
	var x: float; var y: float
	if d < ww:
		x = g.viewL - m + d; y = g.viewT - m
	elif d < ww + hh:
		x = g.viewR + m; y = g.viewT - m + (d - ww)
	elif d < ww * 2 + hh:
		x = g.viewR + m - (d - ww - hh); y = g.viewB + m
	else:
		x = g.viewL - m; y = g.viewB + m - (d - ww * 2 - hh)
	var e := obtain(type, x, y, p_hpMul, p_dmgMul)
	var A = g.arena
	if A:
		e.x = maxf(A.l + 26, minf(A.r - 26, e.x))
		e.y = maxf(A.t + 26, minf(A.b - 26, e.y))
	e.speed *= speedMul
	if g.in_view(e.x, e.y, 10):
		g.spawn_burst(e.x, e.y + e.radius * 0.5, "#3a302c", 5, 80, 3.2, 0.55, false)
		g.spawn_burst(e.x, e.y, worldColor if worldColor else "#b06a49", 4, 120, 2.2, 0.4, true)
	if not e.isBoss and eliteChance > 0 and randf() < eliteChance:
		e.elite = true
		e.maxHp = JS.round_js(e.maxHp * 3.2)
		e.hp = e.maxHp
		e.dmg *= 1.5
		e.xp = maxf(3.0, JS.round_js(e.xp * 3.5))
		e.radius *= 1.28
		e.speed *= 0.92
		e.knockRes *= 0.6
		roll_affix(e)

func roll_affix(e: Ent.Enemy) -> void:
	var g = game
	var n := 2 if (JS.i(g.worldId) >= 7 or g.nmRun) else 1
	var mask := 0
	var guard := 0
	var first = null
	while guard < 8:
		guard += 1
		var A: Dictionary = ELITE_AFFIX[int(randf() * ELITE_AFFIX.size())]
		if mask & A.bit: continue
		if A.bit == AFX.SPLIT and e.type == "patlayici": continue
		mask |= A.bit
		if first == null: first = A
		if JS.bits(mask) >= n: break
	e.affix = mask
	e.affixCol = first.col if first else ""
	if mask & AFX.SHIELD:
		e.shieldMax = e.maxHp * 0.45
		e.shieldHp = e.shieldMax
	if mask & AFX.SWIFT:
		e.speed *= 1.38
		e.knockRes *= 0.8
	e.xp = JS.round_js(e.xp * (1 + 0.2 * JS.bits(mask)))
	if g.in_view(e.x, e.y, 120):
		var label := ""
		for A in ELITE_AFFIX:
			if mask & A.bit: label += (" · " if label else "") + A.name
		g.spawn_text(e.x, e.y - e.radius - 26, label, first.col, 12, false)

func tick_affix(e: Ent.Enemy, dt: float) -> void:
	if e.affix & AFX.REGEN:
		e.regenT += dt
		if e.regenT > 1.6 and e.hp < e.maxHp: e.hp = minf(e.maxHp, e.hp + e.maxHp * 0.05 * dt)
	if (e.affix & AFX.RAGE) and not e.enraged and e.hp < e.maxHp * 0.5:
		e.enraged = true
		e.speed *= 1.35
		e.dmg *= 1.3
		var g = game
		if g.in_view(e.x, e.y, 60):
			g.spawn_text(e.x, e.y - e.radius - 22, "ÖFKE!", "#ff5a4e", 14, true)
			g.spawn_burst(e.x, e.y, "#ff5a4e", 8, 160, 2.6, 0.45, true)

func affix_death(e: Ent.Enemy) -> void:
	var g = game
	if e.affix & AFX.BLAST:
		g.spawn_hazard(e.x, e.y, 96, maxf(8.0, e.dmg * 1.1), 0.6, 0.3, 0, 0)
	if e.affix & AFX.SPLIT:
		for i in 2:
			var a := randf() * 6.283
			var c := obtain(e.type, e.x + cos(a) * 22, e.y + sin(a) * 22, hpMul, dmgMul)
			c.maxHp = maxf(4.0, JS.round_js(e.maxHp / 3.2 * 0.4))
			c.hp = c.maxHp
			c.radius *= 0.82
			c.speed *= speedMul * 1.12
			c.xp = maxf(1.0, JS.round_js(e.xp * 0.12))
		if g.in_view(e.x, e.y, 60): g.spawn_burst(e.x, e.y, "#8fd46a", 10, 190, 2.8, 0.5, false)

func spawn_boss() -> void:
	var g = game
	bossSpawned = true
	var hm := (bossHpMul if bossHpMul else hpMul) * (1 + bossCount * 0.55)
	var e := obtain("boss", g.player.x, g.viewT - 140, hm, dmgMul)
	if g.arena:
		e.x = maxf(g.arena.l + 40, minf(g.arena.r - 40, e.x))
		e.y = maxf(g.arena.t + 40, minf(g.arena.b - 40, e.y))
	boss = e
	e.phase = 0; e.weakT = 0
	e.entryT = 1.8
	e.speed *= speedMul
	g.ui.show_boss_bar(worldBoss)
	g.ui.boss_moment("intro", worldBoss)
	g.fx_impact(e.x, e.y, 0, 3, D.COLORS.blood)
	g.audio.play("bossroar")
	g.add_shake(D.FX.shakeBoss)
	g.hit_stop(120)
	g.punch(0.04)
	g.spawn_text(g.player.x, g.player.y - 90, worldBoss + " UYANDI", D.COLORS.blood, 20, true)

func query_circle(x: float, y: float, r: float, out: Array) -> Array:
	return grid.query(x, y, r, out)

func update_enemy(e: Ent.Enemy, dt: float) -> bool:
	if e.hp <= 0:
		on_death(e)
		return true
	var g = game
	var p = g.player
	e.bob += dt
	if e.flash > 0: e.flash -= dt
	if e.affix: tick_affix(e, dt)
	if e.stopCd > 0: e.stopCd -= dt
	if e.stopT > 0: e.stopT -= dt
	elif e.hitT > 0: e.hitT -= dt
	if e.hurtT > 0: e.hurtT -= dt
	if e.atkAnim > 0: e.atkAnim -= dt
	if e.obCd > 0: e.obCd -= dt

	var dx: float = p.x - e.x
	var dy: float = p.y - e.y
	var d2 := dx * dx + dy * dy
	var mvx := 0.0
	var mvy := 0.0

	if e.isBoss and e.entryT > 0:
		e.entryT -= dt
		if int(e.entryT * 10) % 3 == 0 and g.in_view(e.x, e.y, 80):
			g.spawn_burst(e.x + (randf() - 0.5) * e.radius * 2, e.y + e.radius * 0.6, "#5a4a40", 2, 90, 3, 0.5, false)
		if e.entryT <= 0:
			g.add_shake(0.35)
			g.punch(0.05)
			g.audio.play("bossarrive")
	elif e.isBoss and boss_phase(e, dt):
		pass
	elif e.isBoss:
		update_boss(e, dt, dx, dy, d2)
		mvx = e.cdx; mvy = e.cdy
	elif e.type == "patlayici":
		var A: Dictionary = D.ENEMY_TYPES.patlayici
		var d := sqrt(d2) if d2 > 0 else 1.0
		if e.fuse > 0:
			e.fuse -= dt
			e.atkAnim = maxf(e.atkAnim, 0.05)
			if e.fuse <= 0:
				detonate(e)
				return true
		else:
			mvx = dx / d * e.speed
			mvy = dy / d * e.speed
			if d < A.fuseR:
				e.fuse = A.fuse
				if g.in_view(e.x, e.y, 60):
					g.spawn_text(e.x, e.y - e.radius - 14, "!", D.COLORS.ember, 22, true)
					g.spawn_burst(e.x, e.y, D.COLORS.ember, 6, 90, 2.4, 0.3, true)
					g.audio.play("telegraph")
	elif e.type == "kral":
		var A: Dictionary = D.ENEMY_TYPES.kral
		var d := sqrt(d2) if d2 > 0 else 1.0
		mvx = dx / d * e.speed
		mvy = dy / d * e.speed
		e.auraT -= dt
		var seen: bool = g.in_view(e.x, e.y, 120)
		if e.auraT <= 0 and seen:
			e.auraT = A.auraCd
			e.atkAnim = A.auraTell
			g.spawn_hazard(e.x, e.y, A.auraR, e.auraDmg if e.auraDmg else A.auraDmg, A.auraTell, A.auraTell + 0.42, 0, 0)
			if g.renderer3d: g.renderer3d.spawn_cast(e.x, e.y, 0.92, 0.16, 0.22)
			g.audio.play("bosscast")
		if seen and randf() < dt * 5:
			var a := randf() * 6.283
			var rr := e.radius * (0.7 + randf() * 0.9)
			g.pools.particles.take().setup(e.x + cos(a) * rr, e.y + sin(a) * rr * 0.6,
				cos(a) * 12, -26 - randf() * 22, 0.6, 2.4, D.COLORS.boss, 0.94, 0, true)
	elif e.type == "atici" and d2 < e.range * e.range:
		e.fireCd -= dt
		var d := sqrt(d2) if d2 > 0 else 1.0
		var A: Dictionary = D.ENEMY_TYPES.atici
		var hw := maxf(60.0, (g.viewR - g.viewL) * 0.5 - 140)
		var hh := maxf(60.0, (g.viewB - g.viewT) * 0.5 - 140)
		var ax := absf(dx) / d
		var ay := absf(dy) / d
		var edge := minf(hw / ax if ax > 0.001 else 9999.0, hh / ay if ay > 0.001 else 9999.0)
		var want := maxf(170.0, minf(A.range - 25, edge * 0.92))
		if not e.standD: e.standD = want
		else: e.standD += (want - e.standD) * minf(1.0, dt * 1.6)
		var stand := e.standD
		var back := minf(JS.num(A, "backRange", 120.0), stand * 0.72)
		if d > stand * 1.06:
			mvx = dx / d * e.speed
			mvy = dy / d * e.speed
		elif d < back:
			mvx = -dx / d * e.speed
			mvy = -dy / d * e.speed
		if e.fireCd <= 0 and g.in_view(e.x, e.y, 50):
			e.fireCd = A.fireCd
			e.atkAnim = 0.55
			var ux := dx / d
			var uy := dy / d
			g.pools.eBullets.take().setup(e.x + ux * 20, e.y + uy * 20,
				ux * e.bulletSpeed, uy * e.bulletSpeed, e.bulletDmg, 6, 5, 0)
			if g.renderer3d:
				g.renderer3d.spawn_hit(e.x + ux * 20, e.y + uy * 20, atan2(uy, ux), 0, 0.34, 1.0, 0.52)
			g.spawn_burst(e.x + ux * 18, e.y + uy * 18 - 4, D.COLORS.atici, 5, 95, 2.4, 0.28, true)
	else:
		var d := sqrt(d2) if d2 > 0 else 1.0
		mvx = dx / d * e.speed
		mvy = dy / d * e.speed

	if e.stopMv:
		if e.stopT > 0:
			mvx *= 0.2; mvy *= 0.2
		else: e.stopMv = false
	e.mvAmt = absf(mvx) + absf(mvy)
	e.kx *= 0.86; e.ky *= 0.86
	e.x += (mvx + e.kx) * dt
	e.y += (mvy + e.ky) * dt
	var AR = g.arena
	if AR:
		if e.x < AR.l: e.x = AR.l
		elif e.x > AR.r: e.x = AR.r
		if e.y < AR.t: e.y = AR.t
		elif e.y > AR.b: e.y = AR.b
	if g.props and g.props.n:
		if e.isBoss: g.props.damage_area(e.x, e.y, e.radius + 18, 9999)
		else: g.props.resolve(e, e.radius * 0.62)
	var rr2: float = e.radius + p.radius
	if d2 < rr2 * rr2: Combat.damage_player(g, e.dmg, e.x, e.y)
	return false

func boss_phase(e: Ent.Enemy, dt: float) -> bool:
	if e.weakT > 0:
		e.weakT -= dt
		e.cdx = 0; e.cdy = 0
		e._wkFx -= dt
		if e._wkFx <= 0:
			e._wkFx = 0.14
			game.spawn_burst(e.x, e.y - e.radius * 0.4, "#ffd29a", 3, 150, 2.4, 0.4, true)
		return e.weakT > 0
	var f := e.hp / e.maxHp
	var nxt := 2 if f <= 0.30 else (1 if f <= 0.60 else 0)
	if nxt <= e.phase: return false
	var g = game
	e.phase = nxt
	e.weakT = 1.6
	e.state = "perch" if e.bossKind == "ejder" else "chase"
	e.cdx = 0; e.cdy = 0
	e.spitCd = maxf(e.spitCd, 2.0)
	g.add_shake(0.3)
	g.hit_stop(90)
	g.punch(0.035)
	g.audio.play("bossphase")
	g.spawn_burst(e.x, e.y, "#ff3b4e" if nxt == 2 else "#ffb347", 22, 300, 3.6, 0.7, true)
	g.spawn_text(e.x, e.y - e.radius - 26, "SON ÇIRPINIŞ" if nxt == 2 else "ÖFKELENDİ", D.COLORS.blood, 22, true)
	g.spawn_text(e.x, e.y - e.radius - 2, "ZAYIF AN", "#ffd29a", 15, true)
	g.ui.boss_moment("phase2" if nxt == 2 else "phase1", worldBoss)
	if nxt == 2:
		for i in 2:
			var a := randf() * 6.283
			spawn_at_point(e.x + cos(a) * 90, e.y + sin(a) * 90)
	return true

func update_boss(e: Ent.Enemy, dt: float, dx: float, dy: float, d2: float) -> void:
	if e.bossKind == "ejder":
		update_dragon(e, dt, dx, dy, d2)
		return
	var g = game
	var B := D.BOSS
	var d := sqrt(d2) if d2 > 0 else 1.0
	if e.state == "chase":
		e.cdx = dx / d * e.speed
		e.cdy = dy / d * e.speed
		e.chargeCd -= dt
		e.spitCd -= dt
		if e.spitCd <= 0:
			e.spitCd = B.spitCd
			e.atkAnim = BOSS_ATK
			var n: int = int(B.spitCount) + (6 if e.phase >= 1 else 0)
			var off := randf() * 6.283
			for i in n:
				var a := off + (float(i) / n) * 6.283
				g.pools.eBullets.take().setup(e.x, e.y, cos(a) * e.bulletSpeed, sin(a) * e.bulletSpeed, e.bulletDmg, 7, 6, 1)
			g.audio.play("bossvolley")
		if e.chargeCd <= 0:
			e.state = "windup"
			e.stateT = 0.62
			e.dirx = dx / d; e.diry = dy / d
			g.spawn_text(e.x, e.y - e.radius - 16, "!", D.COLORS.blood, 30, true)
			g.audio.play("bosswindup")
			if g.renderer3d: g.renderer3d.spawn_cast(e.x, e.y, 0.95, 0.22, 0.26)
	elif e.state == "windup":
		e.stateT -= dt
		e.cdx = e.dirx * -16
		e.cdy = e.diry * -16
		if e.stateT <= 0:
			e.state = "charge"
			e.stateT = B.chargeTime
			e.cdx = e.dirx * B.chargeSpeed
			e.cdy = e.diry * B.chargeSpeed
			g.add_shake(0.16)
			g.audio.play("bosscharge")
	else:
		e.stateT -= dt
		if randf() < dt * 40:
			g.pools.particles.take().setup(e.x, e.y + e.radius * 0.5, (randf() - 0.5) * 40, -20, 0.35, 3, D.COLORS.boss, 0.92, 0, true)
		if e.stateT <= 0:
			e.state = "chase"
			e.chargeCd = B.chargeCd * (0.6 if e.phase >= 2 else 1.0)
			e.cdx = 0; e.cdy = 0
			if e.phase >= 2: g.spawn_hazard(e.x, e.y, 130, e.bulletDmg * 2.2, 0.7, 1.0, 0, 1, 0, 0)

func update_dragon(e: Ent.Enemy, dt: float, dx: float, dy: float, d2: float) -> void:
	var g = game
	var DR := D.DRAGON
	var d := sqrt(d2) if d2 > 0 else 1.0
	if e.state == "leap":
		e.stateT -= dt
		if e.stateT <= 0:
			e.state = "perch"
			e.cdx = 0; e.cdy = 0
			e.spitCd = maxf(e.spitCd, 0.7)
			g.add_shake(0.24)
			g.hit_stop(70)
			g.audio.play("bossland")
			g.spawn_burst(e.x, e.y, "#7bd66a", 14, 240, 3.4, 0.6, true)
			if e.phase >= 2:
				var off := randf() * 6.283
				var n := 10
				var sp := 210.0
				for i in n:
					var a := off + (float(i) / n) * 6.283
					g.pools.eBullets.take().setup(e.x, e.y, cos(a) * sp, sin(a) * sp, DR.spitDmg * dmgMul * 0.55, 7, 6, 1)
		return
	e.cdx = 0; e.cdy = 0
	if e.state == "tell":
		e.stateT -= dt
		if e.stateT <= 0:
			e.state = "leap"
			e.stateT = DR.leapTime
			e.cdx = (e.tx - e.x) / DR.leapTime
			e.cdy = (e.ty - e.y) / DR.leapTime
		return
	e.spitCd -= dt
	e.leapCd -= dt
	if e.spitCd <= 0 and g.in_view(e.x, e.y, 200):
		e.spitCd = DR.spitCd * (0.78 if e.phase >= 1 else 1.0)
		e.atkAnim = DRAGON_ATK
		var ux := dx / d
		var uy := dy / d
		var px := -uy
		var py := ux
		var p = g.player
		for i in range(-1, 2):
			var tx: float = p.x + px * i * DR.spitSpread
			var ty: float = p.y + py * i * DR.spitSpread
			g.spawn_hazard(tx, ty, DR.spitR, DR.spitDmg * dmgMul, DR.spitTell, DR.spitTell + 0.3, 0, 1,
				DR.poisonDur, DR.poisonDmg * dmgMul)
		g.audio.play("poison")
	if e.leapCd <= 0 and d > 70:
		e.leapCd = DR.leapCd * (0.6 if e.phase >= 2 else 1.0)
		e.state = "tell"
		e.stateT = DR.leapTell
		var p = g.player
		e.tx = p.x; e.ty = p.y
		var A = g.arena
		if A:
			e.tx = maxf(A.l + 60, minf(A.r - 60, e.tx))
			e.ty = maxf(A.t + 60, minf(A.b - 60, e.ty))
		g.spawn_hazard(e.tx, e.ty, DR.leapR, DR.leapDmg * dmgMul,
			DR.leapTell + DR.leapTime, DR.leapTell + DR.leapTime + 0.4, 0, 0)
		g.spawn_text(e.x, e.y - e.radius - 18, "!", D.COLORS.blood, 28, true)
		g.audio.play("bossleap")
		if g.renderer3d: g.renderer3d.spawn_cast(e.x, e.y, 0.52, 0.92, 0.34)

func detonate(e: Ent.Enemy) -> void:
	var g = game
	var A: Dictionary = D.ENEMY_TYPES.patlayici
	g.spawn_hazard(e.x, e.y, A.blastR, A.blastDmg * dmgMul, 0.001, 0.34, 0, 0)
	if g.in_view(e.x, e.y, 80):
		g.spawn_burst(e.x, e.y, D.COLORS.ember, 12, 230, 3.2, 0.5, true)
		g.spawn_burst(e.x, e.y, "#7d0e1c", 7, 150, 2.6, 0.55, false)
		g.add_shake(0.12)
	if g.renderer3d: g.renderer3d.enemy_death(e, e.hurtAng, true)
	chain_blast(e)

func chain_blast(e: Ent.Enemy) -> void:
	var g = game
	var R := JS.num(D.ENEMY_TYPES.patlayici, "blastR", 90.0) * 1.15
	var out := _chainOut
	out.clear()
	query_circle(e.x, e.y, R + 40, out)
	var n := 0
	for o in out:
		if o == e or o.hp <= 0 or o.isBoss or o.entryT > 0: continue
		var dx: float = o.x - e.x
		var dy: float = o.y - e.y
		var reach: float = R + o.radius
		if dx * dx + dy * dy > reach * reach: continue
		var a := atan2(dy, dx)
		o.hp -= o.maxHp * (0.15 if o.elite else 0.4) + 1
		o.flash = D.FX.hitFlashTime; o.hurtAng = a; o.hitT = 0.2; o.hitD = 0.2; o.regenT = 0
		var k: float = 280.0 * o.knockRes
		o.kx += cos(a) * k; o.ky += sin(a) * k
		n += 1
	if not g.in_view(e.x, e.y, 80): return
	g.pools.rings.take().setup(e.x, e.y, R, 0.34, "#ffb45a")
	g.spawn_burst(e.x, e.y, "#ffd08a", 10, 260, 3.2, 0.42, true)
	if g.renderer3d: g.renderer3d.spawn_hit(e.x, e.y, 0, 2, 1.0, 0.62, 0.3)
	if n > 0: g.audio.play("chainboom")
	if n >= 3: g.spawn_text(e.x, e.y - 46, "ZİNCİR ×" + str(n), "#ffb45a", 16, true)

func on_death(e: Ent.Enemy) -> void:
	var g = game
	var p = g.player
	g.kills += 1
	g.combo()
	if g.ult: g.ult.on_kill(e)
	if e.prey and g.mode: g.mode.on_kill(e)
	if (e.thief or e.duelTok) and g.events: g.events.on_kill(e)
	if e.elite: g._eliteK += 1
	if e.affix: affix_death(e)
	if e.type == "patlayici": chain_blast(e)
	if e.elite and not e.isBoss and g.in_view(e.x, e.y, 40): g.audio.play("elitdown")
	if g.renderer3d: g.renderer3d.enemy_death(e, e.hurtAng, false)
	if g.in_view(e.x, e.y, 40):
		for i in 5:
			var a := randf() * 6.283
			var rr := e.radius * 0.55 * randf()
			g.pools.particles.take().setup(e.x + cos(a) * rr, e.y + sin(a) * rr * 0.6,
				cos(a) * 10, -34 - randf() * 26, 0.42 + randf() * 0.2, 2.2, e.color, 0.93, 0, true)
		g.spawn_burst(e.x, e.y, "#7d0e1c", 4, 96, 2.4, 0.5, false)
		if int(e.seed * 997) % 3 == 0:
			for i in 3:
				g.pools.particles.take().setup(e.x + (randf() - 0.5) * 6, e.y, 0, -90 - i * 26, 0.5, 2.8 - i * 0.5,
					worldColor if worldColor else e.color, 0.9, 0, true)
		if e.elite or e.isBoss:
			g.fx_impact(e.x, e.y, e.hurtAng, 3, e.color)
			for i in 8:
				g.pools.particles.take().setup(e.x, e.y, (randf() - 0.5) * 140, -180 - randf() * 120, 0.7, 2.6,
					"#d8a284" if (i & 1) else "#cfd6e2", 0.95, 420, true)
		elif e.lastCrit:
			var ha := e.hurtAng
			for i in 6:
				var a := ha + (randf() - 0.5) * 1.3
				var v := 150.0 + randf() * 120.0
				g.pools.particles.take().setup(e.x, e.y, cos(a) * v, sin(a) * v * 0.6 - 40, 0.36, 2.4, e.color, 0.9, 260, false)
			for i in 2:
				g.pools.particles.take().setup(e.x, e.y, 0, -120 - i * 30, 0.5, 2.6 - i * 0.6, "#f0eae4", 0.9, 0, true)
	g.spawn_gem(e.x, e.y, e.xp)
	g.roll_heart_drop(e)
	if g.powerups: g.powerups.roll(e.x, e.y, e.elite or e.isBoss)
	if killSndT <= 0:
		g.audio.play("kill")
		killSndT = 0.06
	if not e.isBoss and p.explodeChance > 0 and randf() < p.explodeChance:
		g.explode(e.x, e.y, 34 + e.maxHp * 0.15, 70, false)
	if e.isBoss:
		boss = null
		bossSpawned = false
		bossDefeated = true
		bossDeathX = e.x; bossDeathY = e.y
		bossDeathR = e.radius if e.radius else 60.0
		bossCount += 1
		g.ui.hide_boss_bar()
		g.hit_stop(D.FX.bossHitStopMs * 1.8)
		g.add_shake(0.45)
		g.explode(e.x, e.y, 120, 150, true)
		g.spawn_burst(e.x, e.y, D.COLORS.gold, 30, 340, 4, 0.9, true)
		g.spawn_burst(e.x, e.y, D.COLORS.boss, 22, 280, 4, 0.7, false)
		g.spawn_text(e.x, e.y - 40, worldBoss + " DEVRİLDİ", D.COLORS.gold, 22, true)
		g.spawn_text(e.x, e.y - 70, "GANİMET SANDIĞI DÜŞTÜ!", "#ffe9a8", 15, true)
		for i in 16:
			var a := (i / 16.0) * 6.283
			g.spawn_gem(e.x + cos(a) * 50, e.y + sin(a) * 50, 5)

func update_bullet(b, dt: float) -> bool:
	b.life -= dt
	if b.life <= 0: return true
	b.x += b.vx * dt
	b.y += b.vy * dt
	var p = game.player
	var dx: float = p.x - b.x
	var dy: float = p.y - b.y
	var rr: float = b.r + p.radius
	if dx * dx + dy * dy < rr * rr:
		Combat.damage_player(game, b.dmg, b.x - b.vx, b.y - b.vy)
		var g = game
		if g.renderer3d:
			var ang := atan2(b.vy, b.vx)
			if b.hue: g.renderer3d.spawn_hit(b.x, b.y, ang, 1, 1.0, 0.42, 0.24)
			else: g.renderer3d.spawn_hit(b.x, b.y, ang, 1, 0.42, 1.0, 0.56)
		return true
	return false

func separate() -> void:
	for arr in grid.used:
		var n: int = arr.size()
		if n < 2: continue
		for i in n - 1:
			var a: Ent.Enemy = arr[i]
			var jmax := mini(n, i + 7)
			for j in range(i + 1, jmax):
				var b: Ent.Enemy = arr[j]
				var dx := b.x - a.x
				var dy := b.y - a.y
				var minD := (a.radius + b.radius) * 0.86
				var d2 := dx * dx + dy * dy
				if d2 >= minD * minD or d2 < 0.0001: continue
				var d := sqrt(d2)
				var push := (minD - d) * 0.5
				var nx := dx / d
				var ny := dy / d
				var ma := a.radius * a.radius
				var mb := b.radius * b.radius
				var wa := mb / (ma + mb)
				var wb := ma / (ma + mb)
				a.x -= nx * push * wa; a.y -= ny * push * wa
				b.x += nx * push * wb; b.y += ny * push * wb
