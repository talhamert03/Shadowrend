class_name WeaponManager
extends RefCounted
## weapons.js — Cephanelik ve Rün Seçimi (birebir).
## Tüm silahların savaş mantığı + level-up kart havuzu (rollChoices) +
## seçimlerin uygulanması (applyChoice/applySpecial). Görseller render
## tarafında (render3d okur: swing*, waves, bowPos, slingPos, cannon*...).
## Web'deki 2B render()/renderZones() yolu 3B'ye geçince ölüydü — taşınmadı.

const TAU := PI * 2.0

var TAGS: Dictionary
var CURSES: Array
var EVOLUTIONS: Dictionary
var WEAPON_EVO: Dictionary

const EXTRA_PASSIVES := {
	"kiragi":   {"name": "Kırağı Kabuğu", "desc": "Zırh +1, azami can +10.",              "maxLevel": 4, "mods": {"armor": 1, "maxHp": 10}},
	"buzkalp":  {"name": "Buz Kalbi",     "desc": "Kritik vuruşların %22 daha sert.",      "maxLevel": 4, "mods": {"critMult": 0.22}},
	"hayalet":  {"name": "Hayalet Adım",  "desc": "Kaçınma +%3, hız +%8.",                 "maxLevel": 4, "mods": {"dodge": 0.03, "speedPct": 0.08}},
	"hasatrun": {"name": "Ruh Hasadı",    "desc": "Tecrübe +%10, çekim alanı +%20.",       "maxLevel": 4, "mods": {"xpPct": 0.10, "magnetPct": 0.20}},
	"kanemici": {"name": "Kan Emici",     "desc": "Can çalma +%2, azami can +6.",          "maxLevel": 4, "mods": {"lifeSteal": 0.02, "maxHp": 6}},
	"statik":   {"name": "Statik Yük",    "desc": "Saldırı hızı +%6, hız +%4.",            "maxLevel": 4, "mods": {"atkPct": 0.06, "speedPct": 0.04}},
	"demir":    {"name": "Demir İrade",   "desc": "Azami can +10, zırh +1.",               "maxLevel": 4, "mods": {"maxHp": 10, "armor": 1}},
	"kulkani":  {"name": "Kül Kanı",      "desc": "Hasar +%4, patlama şansı +%5.",         "maxLevel": 4, "mods": {"dmgPct": 0.04, "explodeChance": 0.05, "explodeDmgPct": 0.15}},
}
const PAS_TAG := {"kalp": "CELIK", "zirh": "CELIK", "cizme": "YILDIRIM", "cabukluk": "YILDIRIM", "miknatis": "RUH", "keskinlik": "AYAZ", "gazap": "KOR",
	"kiragi": "AYAZ", "buzkalp": "AYAZ", "hayalet": "AYAZ", "hasatrun": "RUH", "kanemici": "RUH", "statik": "YILDIRIM", "demir": "CELIK", "kulkani": "KOR"}
const HERO_TAG := {"okcu": "RUH", "sapanci": "CELIK", "seher": "KOR", "simsek": "YILDIRIM", "savasci": "CELIK", "gokalev": "KOR", "korsan": "KOR", "kralice": "RUH", "sovalye": "AYAZ"}

const MUL_MAP_BASE := {"cd": "cooldown", "arc": "arc", "radius": "radius", "spin": "spin", "knock": "knock", "range": "range", "speed": "speed",
	"duration": "duration", "critBonus": "critBonus", "life": "bulletLife", "spreadMul": "spread", "chainRange": "chainRange",
	"waveR": "waveR", "waveLife": "waveLife"}
const ADD_MAP := {"volley": "volley", "pierce": "pierce", "count": "count", "targets": "targets"}
const SCALAR_ADD := {"bounceAdd": "bounce", "flame": "flame", "shatterAdd": "shatter",
	"explodeAdd": "explode", "homingAdd": "homing", "rainAdd": "rain", "critAdd": "critAdd", "critMultAdd": "critMultAdd",
	"spinAdd": "spin", "twinAdd": "twin", "waveAdd": "wave", "echoAdd": "echo",
	"chainAdd": "chain", "shockAdd": "shock", "knockAdd": "knock", "stormAdd": "storm",
	"splitAdd": "split", "broadsideAdd": "broadside", "fanAdd": "fan", "judgeAdd": "judge",
	"novaAdd": "nova", "cycloneAdd": "cyclone", "carapaceAdd": "carapace"}

static var _passives_merged := false

var game
var scratch: Array = []
var bolts: Array = []

var cursed := {}; var curses := 0
var tagN := {}; var tagDone := {}
var W: Dictionary
var slots := {}
var passives := {}
var synApplied := {}
var specialTaken := {}
var sigLvl := {}
var evolved := false
var wEvolved := false

var swordT := 0.5
var swing := 0.0
var swingDur := 0.18
var swingDir := 0.0
var swingRange := 0.0
var swingArc := 0.0
var swingId := 0
var swingKind := "normal"
var swingCount := 0
var swordQueue: Array = []
var waves: Array = []
var _waveTok := 0

var orbitA := 0.0
var zoneT := 2.0
var boltT := 3.0
var bombT := 1.6
var gunT := {}

var simsekT := 0.4
var simsekPos := Vector2.ZERO
var simsekFireCount := 0
var simsekStormT = null

var nearest: Ent.Enemy = null
var nearestD2 := INF
var pending: Array = []

var flamePos := Vector2.ZERO
var flameFireCount := 0
var cycloneOrbs: Array = []
var cycloneN := 0
var cycloneAng := 0.0
var cycloneT := 0.0

var cannonPos := Vector2.ZERO
var cannonAim := 0.0
var cannonFireCount := 0
var cannonBroadside := 0
var broadsideT = null
var judgeT = null

var bowPos := Vector2.ZERO
var bowAim := 0.0
var bowFireCount := 0
var rainShots := 0
var bowDraw := 0.0

var slingPos := Vector2.ZERO
var slingAim := 0.0
var slingFireCount := 0
var slingWind := 0.0
var _slWindT := 0.0

var _lastHp = null
var _carapaceCd := 0.0
var _simsekHit: Array = []

func _init(g) -> void:
	game = g
	var raw: Dictionary = D.RAW.get("weapons", {})
	TAGS = raw.get("TAGS", {})
	CURSES = raw.get("CURSES", [])
	EVOLUTIONS = raw.get("EVOLUTIONS", {})
	WEAPON_EVO = raw.get("WEAPON_EVO", {})
	if not _passives_merged:
		_passives_merged = true
		for k in EXTRA_PASSIVES:
			if not D.PASSIVES.has(k): D.PASSIVES[k] = EXTRA_PASSIVES[k]
	for i in 8: bolts.append({"x": 0.0, "y": 0.0, "life": 0.0})
	reset()

func tag_name(t: String) -> String:
	var T = TAGS.get(t)
	return T.name if T and T.has("name") else t

func reset() -> void:
	cursed = {}; curses = 0
	tagN = {}; tagDone = {}
	W = D.WEAPONS.duplicate(true)
	slots = {}; passives = {}; synApplied = {}; specialTaken = {}; sigLvl = {}
	evolved = false; wEvolved = false
	swordT = 0.5; swing = 0; swingDur = 0.18; swingDir = 0; swingRange = 0; swingArc = 0
	swingId = 0; swingKind = "normal"; swingCount = 0
	swordQueue = []
	for i in 6: swordQueue.append({"t": 0.0, "dir": 0.0, "mul": 1.0, "kind": "normal", "on": false, "id": ""})
	waves = []
	for i in 16: waves.append({"x": 0.0, "y": 0.0, "dir": 0.0, "life": 0.0, "max": 1.0, "dmg": 0.0, "r": 0.0, "wid": 0, "spd": 0.0, "crit": 0.0})
	_waveTok = 0
	orbitA = 0; zoneT = 2.0; boltT = 3.0; bombT = 1.6
	gunT = {}
	simsekT = 0.4; simsekPos = Vector2.ZERO; simsekFireCount = 0; simsekStormT = null
	nearest = null; nearestD2 = INF
	pending = []
	flamePos = Vector2.ZERO; flameFireCount = 0
	cycloneOrbs = []
	for i in 6: cycloneOrbs.append({"x": 0.0, "y": 0.0, "a": 0.0})
	cycloneN = 0; cycloneAng = 0; cycloneT = 0
	cannonPos = Vector2.ZERO; cannonAim = 0; cannonFireCount = 0; broadsideT = null
	judgeT = null
	bowPos = Vector2.ZERO; bowAim = 0; bowFireCount = 0; rainShots = 0; bowDraw = 0
	slingPos = Vector2.ZERO; slingAim = 0; slingFireCount = 0; slingWind = 0; _slWindT = 0
	_lastHp = null
	for b in bolts: b.life = 0.0
	Combat.reset_feel()

func seed_default() -> void:
	if slots.is_empty(): slots[D.STARTING_WEAPON] = 1

func lvl(id: String) -> int:
	return slots.get(id, 0)

static func wi(Wd: Dictionary, key: String) -> int:
	return JS.i(Wd.get(key))

# ═══════════ GÜNCELLEME ═══════════

func update(dt: float) -> void:
	find_nearest()
	var meleeId := ""
	if lvl("kilic") > 0: meleeId = "kilic"
	elif lvl("tackilic") > 0: meleeId = "tackilic"
	elif lvl("pala") > 0: meleeId = "pala"
	elif lvl("yemin") > 0: meleeId = "yemin"
	if meleeId != "": update_sword(dt, meleeId)
	if lvl("bicak"): update_orbit(dt)
	if lvl("kor"): update_kor(dt)
	if lvl("yildirim"): update_bolt(dt)
	if lvl("bomba"): update_bomb(dt)
	if lvl("simsek"): update_simsek(dt)
	if lvl("topatar"): update_broadside(dt)
	if lvl("alev"): update_cyclone(dt)
	for id in slots:
		if slots[id] > 0 and W.has(id) and W[id].get("kind") == "gun": update_gun(id, dt)
	var i := pending.size() - 1
	while i >= 0:
		var q = pending[i]
		q.t -= dt
		if q.t <= 0:
			fire_gun(q.id)
			pending[i] = pending[pending.size() - 1]
			pending.pop_back()
		i -= 1
	var P = game.pools
	_each_release(P.zones, func(z): return update_zone(z, dt))
	_each_release(P.pBullets, func(b): return update_arrow(b, dt))
	_each_release(P.bombs, func(b): return update_bomb_proj(b, dt))
	for b in bolts:
		if b.life > 0: b.life -= dt
	if swing > 0: swing -= dt
	if slots.has("yay"):
		var pt := -1.0
		for q in pending:
			if q.id == "yay":
				pt = q.t
				break
		var fd := JS.num(W.yay, "fireDelay", 0.3)
		bowDraw = maxf(0.0, minf(1.0, 1.0 - pt / fd)) if pt >= 0 else 0.0
	if slots.has("sapan"):
		var L := maxi(0, lvl("sapan") - 1)
		var cdv = W.sapan.cooldown[L] if L < W.sapan.cooldown.size() else 0.62
		var cd: float = cdv if cdv else 0.62
		_slWindT = minf(cd, _slWindT + dt)
		slingWind = _slWindT / cd if cd > 0 else 0.0

func _each_release(pool: Pool, fn: Callable) -> void:
	var act := pool.active
	var i := act.size() - 1
	while i >= 0:
		if i >= act.size():
			i = act.size() - 1
			continue
		var o = act[i]
		if fn.call(o) == true: pool.release(o)
		i -= 1

## düşman ekranda mı (3B kameranın zemin yamuğu; HUD/kenar payıyla)
func _vis(e) -> bool:
	var r3 = game.renderer3d
	return r3 == null or r3.on_screen(e.x, e.y)

func find_nearest() -> void:
	var p = game.player
	var best: Ent.Enemy = null
	var bd := INF
	var r3 = game.renderer3d
	for e in game.enemies.pool.active:
		var dx: float = e.x - p.x
		var dy: float = e.y - p.y
		var d2 := dx * dx + dy * dy
		# ekranda görünmeyen düşman hedeflenmez (uzaktan vuranlar ekran dışını temizlemesin)
		if d2 < bd and (r3 == null or r3.on_screen(e.x, e.y)):
			bd = d2
			best = e
	nearest = best
	nearestD2 = bd

# ── 1. SEHER KILICI (ve tüm yakın dövüş imza silahları) ──
func update_sword(dt: float, id: String) -> void:
	for q in swordQueue:
		if not q.on: continue
		q.t -= dt
		if q.t <= 0:
			q.on = false
			sword_strike(q.dir, q.mul, q.kind, q.id)
	update_waves(dt)
	var WC: Dictionary = W[id]
	if wi(WC, "carapace"):
		var hpNow: float = game.player.hp if game.player else 0.0
		if _lastHp == null:
			_lastHp = hpNow
			_carapaceCd = 0
		_carapaceCd -= dt
		if hpNow < _lastHp and _carapaceCd <= 0: fire_carapace(id, WC)
		_lastHp = hpNow
	if wi(WC, "judge"):
		if judgeT == null: judgeT = 3.6
		judgeT -= dt
		if judgeT <= 0:
			judgeT = maxf(3.2, 7.0 - wi(WC, "judge") * 0.9)
			fire_judgement(id, WC)
	swordT -= dt
	if swordT > 0: return
	var g = game
	var p = g.player
	var L := lvl(id) - 1
	var Wd: Dictionary = W[id]
	var reach: float = Wd.range[L] + 34
	if nearest == null or nearestD2 > reach * reach:
		swordT = 0.1
		return
	swordT = Wd.cooldown[L] * p.atkMult
	var dir := atan2(nearest.y - p.y, nearest.x - p.x)
	swingCount += 1
	var spinLvl := wi(Wd, "spin")
	var every := 1 if spinLvl >= 2 else (2 if spinLvl == 1 else 0)
	var kind := "spin" if (every > 0 and swingCount % every == 0) else "normal"
	sword_strike(dir, 1.0, kind, id)
	var twin := wi(Wd, "twin")
	var echo := wi(Wd, "echo")
	if twin > 0: queue_swing(0.15, dir + PI, 1 + 0.15 * (twin - 1), "twin", id)
	if echo > 0: queue_swing(0.28, dir, 0.80 + 0.12 * (echo - 1), "echo", id)

func queue_swing(t: float, dir: float, mul: float, kind: String, id: String) -> void:
	for q in swordQueue:
		if q.on: continue
		q.on = true; q.t = t; q.dir = dir; q.mul = mul; q.kind = kind; q.id = id
		return

func fire_carapace(id: String, Wd: Dictionary) -> void:
	var g = game
	var p = g.player
	var k := wi(Wd, "carapace")
	if g.renderer3d: g.renderer3d.spawn_cast(p.x, p.y, 0.62, 0.88, 1)
	var L := maxi(0, lvl(id) - 1)
	var r := 96.0 + 16 * k
	_carapaceCd = maxf(3.4, 6.4 - 0.9 * k)
	var dmg: float = Wd.dmg[L] * (0.55 + 0.15 * k)
	var knock: float = Wd.knock[L] * 1.5
	var out = g.enemies.query_circle(p.x, p.y, r, scratch)
	for e in out:
		var dx: float = e.x - p.x
		var dy: float = e.y - p.y
		var reach: float = r + e.radius
		if dx * dx + dy * dy > reach * reach: continue
		Combat.apply_hit(g, e, dmg, atan2(dy, dx), knock, JS.num(Wd, "critAdd"), false)
	g.pools.rings.take().setup(p.x, p.y, r * 1.05, 0.34, "#eafcff")
	g.pools.rings.take().setup(p.x, p.y, r * 0.62, 0.52, "#6fc8ff")
	var nP := mini(22, maxi(8, Quality.budget("particles") >> 5))
	g.spawn_burst(p.x, p.y, "#bff0ff", nP, 210, 3, 0.5, true)
	g.spawn_burst(p.x, p.y, "#2fd0ff", nP >> 1, 140, 2.5, 0.6, true)
	g.audio.play("frostnova")
	Quality.haptic("hurt")

func sword_strike(dir: float, mul: float, kind: String, id: String) -> void:
	var g = game
	var p = g.player
	var L := maxi(0, lvl(id) - 1)
	var Wd: Dictionary = W[id]
	var spin := kind == "spin"
	swingId += 1
	swingKind = kind
	if spin and g.renderer3d:
		if id == "tackilic": g.renderer3d.spawn_cast(p.x, p.y, 0.72, 0.46, 1)
		elif id == "yemin": g.renderer3d.spawn_cast(p.x, p.y, 0.62, 0.88, 1)
		else: g.renderer3d.spawn_cast(p.x, p.y, 1, 0.72, 0.34)
	swing = swingDur
	swingDir = dir
	var range_: float = Wd.range[L] * (1.35 if spin else 1.0)
	var arc: float = TAU if spin else float(Wd.arc[L])
	swingRange = range_
	swingArc = arc
	if kind == "normal" or spin:
		p.faceLeft = cos(dir) < 0
		p.faceHold = 0.25
		p.trigger_melee_attack(dir)
	var half := arc / 2.0
	var dmg: float = Wd.dmg[L] * mul * (1.6 if spin else 1.0)
	var knock: float = Wd.knock[L] * (0.4 if kind == "echo" else 1.0)
	var crit := JS.num(Wd, "critAdd")
	var out = g.enemies.query_circle(p.x, p.y, range_ + 26, scratch)
	for e in out:
		if e.swordId == swingId: continue
		var dx: float = e.x - p.x
		var dy: float = e.y - p.y
		var reach: float = range_ + e.radius
		if dx * dx + dy * dy > reach * reach: continue
		var a := atan2(dy, dx)
		if not spin:
			var da := JS.wrap_pi(a - dir)
			if absf(da) > half + e.radius / range_: continue
		e.swordId = swingId
		Combat.apply_hit(g, e, dmg, a, knock, crit, kind == "echo")
	if g.props and g.props.n:
		if spin: g.props.damage_area(p.x, p.y, range_ * 0.9, dmg * 0.7)
		else: g.props.damage_area(p.x + cos(dir) * range_ * 0.55, p.y + sin(dir) * range_ * 0.55, range_ * 0.5, dmg * 0.7)
	var wv := wi(Wd, "wave")
	if wv > 0 and kind != "echo":
		var wd := dmg * (0.60 + 0.2 * (wv - 1))
		var cr := JS.num(Wd, "critAdd")
		if spin:
			spawn_wave(dir, wd, wv, cr, Wd)
			spawn_wave(dir + TAU / 3, wd, wv, cr, Wd)
			spawn_wave(dir - TAU / 3, wd, wv, cr, Wd)
		else:
			spawn_wave(dir, wd, wv, cr, Wd)
			var fan := mini(2, wi(Wd, "fan"))
			for f in range(1, fan + 1):
				var off := 0.30 * f
				spawn_wave(dir + off, wd * 0.52, wv, cr, Wd)
				spawn_wave(dir - off, wd * 0.52, wv, cr, Wd)
	if wi(Wd, "shock") > 0 and kind != "echo":
		g.explode(p.x + cos(dir) * range_ * 0.55, p.y + sin(dir) * range_ * 0.55, dmg * 0.3, 26 + wi(Wd, "shock") * 7, true)
	if kind != "echo":
		if spin: g.add_shake(0.14)
		g.audio.play("sword")
		if spin:
			var nP := mini(18, maxi(6, Quality.budget("particles") >> 5))
			for i in nP:
				var a := (float(i) / nP) * TAU + dir
				var sp := 190.0 + randf() * 130.0
				g.pools.particles.take().setup(p.x + cos(a) * 26, p.y + sin(a) * 26,
					cos(a) * sp, sin(a) * sp * 0.6, 0.34, 2.6, "#ffe9bd" if i % 3 == 0 else "#cfe6ff", 0.94, 0, true)
			Quality.haptic("crit")

func spawn_wave(dir: float, dmg: float, tier: int, crit: float, Wd) -> void:
	var p = game.player
	var slot = null
	for w in waves:
		if w.life <= 0:
			slot = w
			break
	if slot == null: return
	slot.x = p.x + cos(dir) * 24
	slot.y = p.y + sin(dir) * 24
	slot.dir = dir
	slot.max = 0.62 * (JS.num(Wd, "waveLife", 1.0) if Wd else 1.0)
	slot.life = slot.max
	slot.dmg = dmg
	slot.crit = crit
	slot.r = (46 + tier * 8) * (JS.num(Wd, "waveR", 1.0) if Wd else 1.0)
	slot.spd = 520.0
	_waveTok += 1
	slot.wid = _waveTok

func update_waves(dt: float) -> void:
	var g = game
	for w in waves:
		if w.life <= 0: continue
		w.life -= dt
		var step: float = w.spd * dt
		w.x += cos(w.dir) * step
		w.y += sin(w.dir) * step
		var out = g.enemies.query_circle(w.x, w.y, w.r + 24, scratch)
		for e in out:
			if e.waveHit == w.wid: continue
			var dx: float = e.x - w.x
			var dy: float = e.y - w.y
			var rr: float = w.r + e.radius
			if dx * dx + dy * dy > rr * rr: continue
			e.waveHit = w.wid
			Combat.apply_hit(g, e, w.dmg, w.dir, 90, w.crit, false)

# ── 2. GÖLGE BIÇAKLARI ──
func update_orbit(dt: float) -> void:
	var g = game
	var p = g.player
	var L := lvl("bicak") - 1
	var Wd: Dictionary = W.bicak
	orbitA += Wd.spin[L] * dt
	var n: int = int(Wd.count[L])
	var R: float = Wd.radius[L]
	for i in n:
		var a := orbitA + (float(i) / n) * TAU
		var bx: float = p.x + cos(a) * R
		var by: float = p.y + sin(a) * R
		var out = g.enemies.query_circle(bx, by, 30, scratch)
		for e in out:
			if e.obCd > 0: continue
			var dx: float = e.x - bx
			var dy: float = e.y - by
			var rr: float = 13 + e.radius
			if dx * dx + dy * dy > rr * rr: continue
			e.obCd = Wd.hitCd
			var ka := atan2(e.y - p.y, e.x - p.x)
			Combat.apply_hit(g, e, Wd.dmg[L], ka, 170, 0, false)

# ── 3. KOR ÇEMBERİ ──
func update_kor(dt: float) -> void:
	var g = game
	var L := lvl("kor") - 1
	var Wd: Dictionary = W.kor
	zoneT -= dt
	if zoneT <= 0 and g.pools.zones.count < Wd.maxZones[L]:
		zoneT = Wd.spawnCd[L] * g.player.atkMult
		var tx := 0.0
		var ty := 0.0
		var found := 0
		for e in g.enemies.pool.active:
			if not _vis(e): continue
			found += 1
			if randf() < 1.0 / found:
				tx = e.x; ty = e.y
		if found == 0:
			var a := randf() * TAU
			var r := 70.0 + randf() * 120.0
			tx = g.player.x + cos(a) * r
			ty = g.player.y + sin(a) * r
		g.pools.zones.take().setup(tx, ty, Wd.radius[L], Wd.dps[L], Wd.duration)
		g.audio.play("zone")
		g.spawn_burst(tx, ty, D.COLORS.ember, 10, 130, 2.5, 0.4, true)

func spawn_fire_zone(x: float, y: float, b, r: float = 0.0, life: float = 0.0, dpsMul: float = 0.0):
	var g = game
	if g.pools.zones.count >= 8: return null
	var tier := JS.i(b.flame)
	var rr := r if r else (30.0 + tier * 7)
	var lf := life if life else 2.5
	var dm := dpsMul if dpsMul else (0.42 + tier * 0.16)
	var z = g.pools.zones.take().setup(x, y, rr, b.dmg * dm, lf)
	z.blue = true
	g.spawn_burst(x, y, "#9fd8ff", 5, 90, 2.2, 0.3, true)
	return z

func update_cyclone(dt: float) -> void:
	var Wd = W.get("alev")
	var tier := wi(Wd, "cyclone") if Wd else 0
	if not tier:
		cycloneN = 0
		return
	var g = game
	var p = g.player
	var n := mini(6, 2 + tier)
	cycloneN = n
	var R := 66.0 + tier * 8
	cycloneAng += dt * 2.15
	if cycloneAng > TAU: cycloneAng -= TAU
	for i in n:
		var o = cycloneOrbs[i]
		var a := cycloneAng + (float(i) / n) * TAU
		o.a = a
		o.x = p.x + cos(a) * R
		o.y = p.y + sin(a) * R
	cycloneT -= dt
	if cycloneT > 0: return
	cycloneT = 0.4
	var L := maxi(0, lvl("alev") - 1)
	var dmg: float = Wd.dmg[L] * (0.30 + tier * 0.06)
	var crit := JS.num(Wd, "critAdd")
	for i in n:
		var o = cycloneOrbs[i]
		var out = g.enemies.query_circle(o.x, o.y, 30, scratch)
		for e in out:
			var dx: float = e.x - o.x
			var dy: float = e.y - o.y
			var rr: float = 30 + e.radius
			if dx * dx + dy * dy > rr * rr: continue
			Combat.apply_hit(g, e, dmg, atan2(e.y - p.y, e.x - p.x), 90, crit, false)

func fire_nova(x: float, y: float, b) -> void:
	var g = game
	var tier := JS.i(b.nova)
	var r := 82.0 + tier * 12
	var dmg: float = b.dmg * (0.80 + tier * 0.15)
	var out = g.enemies.query_circle(x, y, r + 30, scratch)
	for e in out:
		var dx: float = e.x - x
		var dy: float = e.y - y
		var reach: float = r + e.radius
		if dx * dx + dy * dy > reach * reach: continue
		Combat.apply_hit(g, e, dmg, atan2(dy, dx), 240, b.critAdd, false)
	if g.renderer3d: g.renderer3d.spawn_flame_impact(x, y, b.angle, 2.3 + tier * 0.22)
	var nP := mini(26, maxi(8, Quality.budget("particles") >> 4))
	for i in nP:
		var a := (float(i) / nP) * TAU + randf() * 0.4
		var sp := 200.0 + randf() * 220.0
		g.pools.particles.take().setup(x, y, cos(a) * sp, sin(a) * sp * 0.75,
			0.42, 3.0 if i % 4 == 0 else 2.2, "#eaf6ff" if i % 4 == 0 else "#4fb0ff", 0.94, -20, true)
	spawn_fire_zone(x, y, b, r * 0.52, 1.8 + tier * 0.25, 0.30 + tier * 0.05)
	g.audio.play("firebomb")

func update_zone(z, dt: float) -> bool:
	z.life -= dt
	if z.life <= 0: return true
	var g = game
	z.tick += dt
	if z.tick >= 0.5:
		z.tick -= 0.5
		var out = g.enemies.query_circle(z.x, z.y, z.r + 24, scratch)
		for e in out:
			var dx: float = e.x - z.x
			var dy: float = e.y - z.y
			var rr: float = z.r + e.radius * 0.5
			if dx * dx + dy * dy > rr * rr: continue
			Combat.apply_hit(g, e, z.dps * 0.5, randf() * TAU, 0, 0, true)
	if randf() < dt * 9:
		var a := randf() * TAU
		var r: float = randf() * z.r * 0.85
		var col = (("#e6f4ff" if randf() < 0.32 else "#57b4ff") if z.blue else D.COLORS.ember)
		g.pools.particles.take().setup(z.x + cos(a) * r, z.y + sin(a) * r,
			(randf() - 0.5) * 24, -35 - randf() * 40, 0.55, 2.2, col, 0.97, -30, true)
	return false

# ── 4. GÖK GAZABI ──
func update_bolt(dt: float) -> void:
	boltT -= dt
	if boltT > 0: return
	var g = game
	var L := lvl("yildirim") - 1
	var Wd: Dictionary = W.yildirim
	var cand := scratch
	cand.clear()
	for e in g.enemies.pool.active:
		if _vis(e): cand.append(e)
	if cand.is_empty():
		boltT = 0.5
		return
	boltT = Wd.cooldown[L] * g.player.atkMult
	var n := mini(int(Wd.targets[L]), cand.size())
	for k in n:
		var idx := int(randf() * cand.size())
		var e = cand[idx]
		cand[idx] = cand[cand.size() - 1]
		cand.pop_back()
		Combat.apply_hit(g, e, Wd.dmg[L], randf() * TAU, 90, JS.num(Wd, "critBonus"), false)
		for s in bolts:
			if s.life <= 0:
				s.x = e.x; s.y = e.y; s.life = 0.28
				break
		g.spawn_burst(e.x, e.y, "#eaf6ff", 8, 240, 2, 0.28, true)
		g.spawn_burst(e.x, e.y, "#f5c044", 4, 140, 2, 0.35, true)
	g.audio.play("thunder")
	g.add_shake(0.12)

# ── 5. GUN SINIFI ──
func update_gun(id: String, dt: float) -> void:
	var t: float = gunT.get(id, 0.0) - dt
	if t > 0:
		gunT[id] = t
		return
	var g = game
	var p = g.player
	var L := lvl(id) - 1
	var Wd: Dictionary = W[id]
	var gunReach: float = (float(Wd.range[L]) if Wd.has("range") and Wd.range is Array else 640.0) + 40
	if nearest == null or nearestD2 > gunReach * gunReach:
		gunT[id] = 0.14
		return
	gunT[id] = Wd.cooldown[L] * p.atkMult
	var aimAng := atan2(nearest.y - p.y, nearest.x - p.x)
	p.trigger_ranged_attack(aimAng)
	if JS.truthy(Wd.get("fireDelay")):
		pending.append({"id": id, "t": float(Wd.fireDelay)})
		return
	fire_gun(id)

func _bullet(ox: float, oy: float, vx: float, vy: float, dmg: float, pierce: float, life: float, r: float, color):
	return game.pools.pBullets.take().setup(ox, oy, vx, vy, dmg, pierce, life, r, color)

func fire_gun(id: String) -> void:
	if nearest == null or not slots.get(id): return
	var g = game
	var p = g.player
	var L := lvl(id) - 1
	var Wd: Dictionary = W[id]
	var ox: float = p.x
	var oy: float = p.y
	if JS.truthy(Wd.get("bowVisual")): ox = bowPos.x; oy = bowPos.y
	elif JS.truthy(Wd.get("slingVisual")): ox = slingPos.x; oy = slingPos.y
	elif JS.truthy(Wd.get("flameVisual")): ox = flamePos.x; oy = flamePos.y
	elif JS.truthy(Wd.get("cannonVisual")): ox = cannonPos.x; oy = cannonPos.y
	var ang := atan2(nearest.y - oy, nearest.x - ox)
	p.faceLeft = cos(ang) < 0
	var volley: int = int(Wd.volley[L])
	var spread := JS.num(Wd, "spread", 0.14)
	var br := JS.num(Wd, "r", 6.0)
	if JS.truthy(Wd.get("orb")) and not JS.truthy(Wd.get("flameVisual")) and not JS.truthy(Wd.get("cannonVisual")):
		ox = p.x + cos(ang) * 16; oy = p.y + sin(ang) * 16 - 6
	elif JS.truthy(Wd.get("arrow")) and not JS.truthy(Wd.get("bowVisual")):
		ox = p.x + cos(ang) * 30; oy = p.y - 16 + sin(ang) * 14
	var flame := wi(Wd, "flame")
	var homing := wi(Wd, "homing")
	var explode := wi(Wd, "explode")
	var split := wi(Wd, "split")
	for v in volley:
		var off := (v - (volley - 1) / 2.0) * spread if volley > 1 else 0.0
		var jitter := (randf() - 0.5) * spread * 0.3
		var sh := ang + off + jitter
		var b = _bullet(ox, oy, cos(sh) * Wd.speed, sin(sh) * Wd.speed, Wd.dmg[L], Wd.pierce[L], JS.num(Wd, "bulletLife", 1.4), br, Wd.get("color"))
		b.isArrow = JS.truthy(Wd.get("arrow"))
		b.bounce = wi(Wd, "bounce") + (JS.i(Wd.bounceLv[L]) if Wd.get("bounceLv") is Array else 0)
		b.stone = JS.truthy(Wd.get("stone"))
		b.shatter = wi(Wd, "shatter")
		b.flame = flame
		b.homing = homing
		b.explode = explode
		b.split = split
		b.frag = false
		b.smoke = 1 if JS.truthy(Wd.get("smokeTrail")) else 0
		b.metal = JS.truthy(Wd.get("metallic"))
		b.fireball = JS.truthy(Wd.get("fireball"))
		b.ph = randf() * 6.2831
		b.nova = wi(Wd, "nova")
		b.critAdd = JS.num(Wd, "critAdd")
		b.angle = sh
	if wi(Wd, "rain") > 0 and nearest != null:
		rainShots += 1
		if rainShots % 4 == 0: fire_arrow_rain(id, Wd, L)
	if JS.truthy(Wd.get("bowVisual")): bowFireCount += 1
	if JS.truthy(Wd.get("slingVisual")):
		slingFireCount += 1
		_slWindT = 0
	if JS.truthy(Wd.get("flameVisual")): flameFireCount += 1
	if JS.truthy(Wd.get("cannonVisual")):
		cannonFireCount += 1
		var nS := mini(9, maxi(3, Quality.budget("particles") >> 6))
		for i in nS:
			var a := ang + (randf() - 0.5) * 0.9
			var sp := 90.0 + randf() * 110.0
			g.pools.particles.take().setup(ox, oy, cos(a) * sp, sin(a) * sp * 0.6,
				0.34, 3.2, "#ffd9a0" if i % 3 == 0 else "#6b6558", 0.93, -26, true)
		Quality.haptic("ui")
	g.fx_muzzle(ox, oy, ang, Wd.get("rainColor", "#ffd08a"))
	var sfx = Wd.get("sfx")
	g.audio.play(sfx if sfx else ("thunder" if JS.truthy(Wd.get("orb")) else "shoot"))

func fire_arrow_rain(_id: String, Wd: Dictionary, L: int) -> void:
	var g = game
	var tgt := nearest
	var tier := wi(Wd, "rain")
	var n := 4 + tier * 2
	var dmg: float = Wd.dmg[L] * 0.7
	var SPD := 640.0
	for i in n:
		var sx: float = tgt.x + (randf() - 0.5) * 130
		var sy: float = tgt.y - 300 - randf() * 90
		var ax: float = tgt.x + (randf() - 0.5) * 110
		var a := atan2(tgt.y - sy, ax - sx)
		var b = _bullet(sx, sy, cos(a) * SPD, sin(a) * SPD, dmg, Wd.pierce[L], 1.1, JS.num(Wd, "r", 6.0), Wd.get("rainColor", "#cfe9ff"))
		b.isArrow = JS.truthy(Wd.get("arrow"))
		b.bounce = 0
		b.stone = false; b.shatter = 0
		b.flame = wi(Wd, "flame")
		b.homing = 0
		b.explode = wi(Wd, "explode")
		b.split = wi(Wd, "split")
		b.frag = false
		b.fireball = JS.truthy(Wd.get("fireball"))
		b.ph = randf() * 6.2831
		b.nova = wi(Wd, "nova")
		b.critAdd = JS.num(Wd, "critAdd")
		b.angle = a
	g.audio.play("shoot")

func spawn_split(b) -> void:
	var g = game
	var n := mini(6, 2 + JS.i(b.split))
	var dmg: float = b.dmg * 0.34
	var sp := 330.0
	for i in n:
		var a: float = b.angle + (i - (n - 1) / 2.0) * (1.5 / maxf(1.0, n - 1))
		var f = _bullet(b.x, b.y, cos(a) * sp, sin(a) * sp, dmg, 0, 0.42, 4, "#7e8288")
		f.isArrow = false; f.bounce = 0; f.flame = 0; f.homing = 0
		f.stone = false; f.shatter = 0
		f.explode = 0; f.split = 0; f.frag = true
		f.smoke = 1
		f.metal = true
		f.critAdd = b.critAdd; f.angle = a
	g.spawn_burst(b.x, b.y, "#ffd9a0", 6, 210, 2.2, 0.26, true)

func update_broadside(dt: float) -> void:
	var Wd = W.get("topatar")
	if not Wd or not wi(Wd, "broadside"):
		broadsideT = null
		return
	if broadsideT == null: broadsideT = 4.2
	broadsideT -= dt
	if broadsideT > 0: return
	if nearest == null:
		broadsideT = 0.4
		return
	broadsideT = maxf(4.0, 8.6 - wi(Wd, "broadside") * 0.9)
	fire_broadside(Wd)

func fire_broadside(Wd: Dictionary) -> void:
	var g = game
	if g.renderer3d and g.player: g.renderer3d.spawn_cast(g.player.x, g.player.y, 1, 0.66, 0.30)
	var tgt := nearest
	var L := maxi(0, lvl("topatar") - 1)
	var ox := cannonPos.x
	var oy := cannonPos.y
	var base := atan2(tgt.y - oy, tgt.x - ox)
	var n := 7
	var dmg: float = Wd.dmg[L] * 0.5
	var sp: float = Wd.speed * 0.94
	for i in n:
		var a := base + (i - (n - 1) / 2.0) * 0.22
		var b = _bullet(ox, oy, cos(a) * sp, sin(a) * sp, dmg, Wd.pierce[L], 1.3, 6, "#8d9096")
		b.isArrow = false; b.bounce = 0; b.flame = 0; b.homing = 0
		b.stone = false; b.shatter = 0
		b.explode = wi(Wd, "explode"); b.split = wi(Wd, "split"); b.frag = false
		b.smoke = 1
		b.metal = true
		b.critAdd = JS.num(Wd, "critAdd"); b.angle = a
	cannonFireCount += 1
	cannonBroadside += 1
	var nS := mini(16, maxi(6, Quality.budget("particles") >> 5))
	for i in nS:
		var a := base + (randf() - 0.5) * 1.5
		var s2 := 150.0 + randf() * 190.0
		g.pools.particles.take().setup(ox, oy, cos(a) * s2, sin(a) * s2 * 0.6,
			0.42, 3.6, "#ffe0b0" if i % 3 == 0 else "#6b6558", 0.94, -22, true)
	g.add_shake(0.16)
	g.audio.play("cannon")
	Quality.haptic("crit")

func fire_judgement(id: String, Wd: Dictionary) -> void:
	var g = game
	if g.renderer3d and g.player: g.renderer3d.spawn_cast(g.player.x, g.player.y, 0.72, 0.46, 1)
	var cand := scratch
	cand.clear()
	for e in g.enemies.pool.active:
		if _vis(e): cand.append(e)
	if cand.is_empty():
		judgeT = 0.5
		return
	var t = cand[int(randf() * cand.size())]
	var L := maxi(0, lvl(id) - 1)
	var tier := wi(Wd, "judge")
	g.explode(t.x, t.y, Wd.dmg[L] * (1.5 + tier * 0.25), 84 + tier * 10, true)
	if g.renderer3d: g.renderer3d.spawn_judgement(t.x, t.y)
	g.spawn_burst(t.x, t.y, "#cfe9ff", 10, 240, 2.2, 0.34, true)
	g.add_shake(0.16)
	g.audio.play("judge")
	Quality.haptic("crit")

func update_arrow(b, dt: float) -> bool:
	b.life -= dt
	if b.life <= 0: return true
	if b.homing > 0:
		var tgt := nearest
		if tgt:
			var want := atan2(tgt.y - b.y, tgt.x - b.x)
			var d := JS.wrap_pi(want - b.angle)
			var turn: float = (2.6 + b.homing * 1.5) * dt
			if d > turn: d = turn
			elif d < -turn: d = -turn
			b.angle += d
			var sp := JS.hypot(b.vx, b.vy)
			b.vx = cos(b.angle) * sp
			b.vy = sin(b.angle) * sp
	b.x += b.vx * dt
	b.y += b.vy * dt
	var g = game
	b.trT -= dt
	if b.trT <= 0:
		b.trT = 0.045
		var P = g.pools.particles
		if P.count < (250 if g.isMobile else 640) and g.in_view(b.x, b.y, 20):
			P.take().setup(b.x - b.vx * 0.012, b.y - b.vy * 0.012, -b.vx * 0.08, -b.vy * 0.08, 0.22,
				3.2 if b.fireball else 2.2, "#ffb45a" if b.fireball else "#dfe6f0", 0.7, 0, true)
	if g.props and g.props.n:
		var pi_: int = g.props.hit_scan(b.x, b.y, b.r if b.r else 5.0)
		if pi_ >= 0:
			g.props.damage(pi_, b.dmg * 0.9)
			if not (b.pierce > 0): return true
	var out = g.enemies.query_circle(b.x, b.y, 34, scratch)
	var k := 0
	while k < out.size():
		var e = out[k]
		k += 1
		if e == b.lastHit: continue
		var dx: float = e.x - b.x
		var dy: float = e.y - b.y
		var rr: float = b.r + e.radius
		if dx * dx + dy * dy > rr * rr: continue
		b.lastHit = e
		Combat.apply_hit(g, e, b.dmg, b.angle, 130, b.critAdd, false)
		if b.fireball and not (b.nova > 0 and not b.burned):
			if g.renderer3d: g.renderer3d.spawn_flame_impact(e.x, e.y, b.angle)
			g.spawn_burst(e.x, e.y, "#8fd0ff", 5, 180, 2.2, 0.26, true)
			g.spawn_burst(e.x, e.y, "#eaf6ff", 3, 110, 1.7, 0.20, true)
		if b.flame > 0:
			var fc := "#7fc4ff" if b.fireball else ("#ff6a2c" if b.flame >= 2 else "#ffb24d")
			g.spawn_burst(e.x, e.y, fc, 4 + b.flame * 2, 150, 2, 0.3, true)
		if b.fireball and b.nova > 0 and not b.burned:
			b.burned = true
			fire_nova(b.x, b.y, b)
		if b.split > 0 and not b.frag:
			spawn_split(b)
			b.split = 0
		b.pierce -= 1
		if b.pierce < 0:
			if (b.isArrow or b.stone) and b.bounce > 0:
				var cand = g.enemies.query_circle(b.x, b.y, 300, [])
				var best = null
				var bd := INF
				for c in cand:
					if c == e or not _vis(c): continue
					var cx: float = c.x - b.x
					var cy: float = c.y - b.y
					var d2 := cx * cx + cy * cy
					if d2 < bd:
						bd = d2
						best = c
				if best:
					b.bounce -= 1
					if b.stone and b.shatter > 0:
						var sc := 3
						var sp2 := 300.0
						var base := atan2(b.vy, b.vx)
						var sd: float = b.dmg * (0.26 + 0.06 * b.shatter)
						for s in sc:
							var a2 := base + (s - 1) * 0.62
							var f2 = _bullet(b.x, b.y, cos(a2) * sp2, sin(a2) * sp2, sd, 0, 0.34, 4, "#b3ab9c")
							f2.isArrow = false; f2.bounce = 0; f2.stone = false; f2.shatter = 0
							f2.flame = 0; f2.homing = 0; f2.explode = 0; f2.split = 0
							f2.frag = true; f2.smoke = 0
					b.pierce = 0
					b.lastHit = e
					var sp := JS.hypot(b.vx, b.vy)
					var na := atan2(best.y - b.y, best.x - b.x)
					b.vx = cos(na) * sp
					b.vy = sin(na) * sp
					b.angle = na
					b.life = maxf(b.life, 0.6)
					g.spawn_burst(b.x, b.y, b.color, 4, 120, 1.6, 0.22, true)
					continue
			if b.explode > 0:
				g.explode(b.x, b.y, b.dmg * (0.55 + b.explode * 0.12), 40 + b.explode * 10, true)
			return true
	var ft := JS.i(b.flame)
	if b.smoke:
		if randf() < dt * 32:
			g.pools.particles.take().setup(b.x, b.y, (randf() - 0.5) * 24, -12 - randf() * 18,
				0.44, 3.0, "#ffd9a0" if randf() < 0.32 else "#5c5852", 0.95, -10, true)
	elif b.fireball:
		if randf() < dt * 34:
			g.pools.particles.take().setup(b.x, b.y, (randf() - 0.5) * 30, -14 - randf() * 22,
				0.30, 2.2, "#dff1ff" if randf() < 0.30 else "#5cb2ff", 0.95, -14, true)
	elif ft > 0:
		if randf() < dt * (26 + ft * 24):
			var c := "#ffe6a0" if ft >= 3 else ("#ff6a2c" if ft == 2 else "#ffb24d")
			g.pools.particles.take().setup(b.x, b.y, (randf() - 0.5) * 26, -18 - randf() * 26, 0.36, 2.4, c, 0.96, -18, true)
	elif randf() < dt * 28:
		g.pools.particles.take().setup(b.x, b.y, 0, 0, 0.22, 2, b.color, 1, 0, true)
	return false

# ── 6. KOR HAVANI ──
func update_bomb(dt: float) -> void:
	bombT -= dt
	if bombT > 0: return
	var g = game
	var p = g.player
	var L := lvl("bomba") - 1
	var Wd: Dictionary = W.bomba
	var tx: float
	var ty: float
	if nearest and nearestD2 < 380 * 380:
		tx = nearest.x; ty = nearest.y
	else:
		var a: float = p.facing + (randf() - 0.5) * 0.6
		var r := 150.0 + randf() * 90.0
		tx = p.x + cos(a) * r; ty = p.y + sin(a) * r
	bombT = Wd.cooldown[L] * p.atkMult
	g.pools.bombs.take().setup(p.x, p.y - 6, tx, ty, Wd.fuse, Wd.dmg[L], Wd.radius[L])
	g.audio.play("throw")

func update_bomb_proj(b, dt: float) -> bool:
	b.t += dt
	var k := minf(1.0, b.t / b.dur)
	b.x = b.sx + (b.tx - b.sx) * k
	b.y = b.sy + (b.ty - b.sy) * k
	b.spin += dt * 9
	b.h = sin(k * PI) * (46 + b.dist * 0.18)
	if randf() < dt * 26:
		game.pools.particles.take().setup(b.x, b.y - b.h, 0, 10, 0.3, 2, D.COLORS.ember, 0.95, 0, true)
	if k >= 1:
		game.explode(b.tx, b.ty, b.dmg, b.radius, true)
		return true
	return false

# ── 7. ŞİMŞEK KIRIĞI ──
func update_simsek(dt: float) -> void:
	var g = game
	var p = g.player
	var Wd: Dictionary = W.simsek
	if wi(Wd, "storm"):
		if simsekStormT == null: simsekStormT = 4.5
		simsekStormT -= dt
		if simsekStormT <= 0:
			simsekStormT = maxf(3.0, 7.2 - wi(Wd, "storm") * 1.1)
			fire_storm()
	simsekT -= dt
	if simsekT > 0: return
	var L := lvl("simsek") - 1
	if nearest == null or nearestD2 > Wd.range[L] * Wd.range[L]:
		simsekT = 0.22
		return
	simsekT = Wd.cooldown[L] * p.atkMult
	fire_chain(L, Wd)

func fire_chain(L: int, Wd: Dictionary) -> void:
	var g = game
	var chainN := maxi(1, int(Wd.chains[L]) + wi(Wd, "chain"))
	var hit := _simsekHit
	hit.clear()
	var target = nearest
	var ox := simsekPos.x
	var oy := simsekPos.y
	var dmg: float = Wd.dmg[L]
	var knock := 130.0 * (1 + wi(Wd, "knock") * 0.4)
	var count := 0
	while target and count < chainN:
		var ang := atan2(target.y - oy, target.x - ox)
		Combat.apply_hit(g, target, dmg, ang, knock, JS.num(Wd, "critAdd"), false)
		if g.renderer3d: g.renderer3d.spawn_lightning_arc(ox, oy, target.x, target.y)
		if wi(Wd, "shock"): g.explode(target.x, target.y, dmg * (0.2 + wi(Wd, "shock") * 0.09), 32 + wi(Wd, "shock") * 8, true)
		g.spawn_burst(target.x, target.y, "#bfe6ff", 6, 200, 2, 0.26, true)
		hit.append(target)
		ox = target.x; oy = target.y
		dmg *= JS.num(Wd, "chainFalloff", 0.8)
		count += 1
		if count >= chainN: break
		var cand = g.enemies.query_circle(ox, oy, Wd.chainRange[L], scratch)
		var best = null
		var bd := INF
		for c in cand:
			if hit.has(c) or not _vis(c): continue
			var dx: float = c.x - ox
			var dy: float = c.y - oy
			var d2 := dx * dx + dy * dy
			if d2 < bd:
				bd = d2
				best = c
		target = best
	simsekFireCount += 1
	g.audio.play("simsekvur")
	Quality.haptic("crit")

func fire_storm() -> void:
	var g = game
	var cand := []
	for e in g.enemies.pool.active:
		if _vis(e): cand.append(e)
	if cand.is_empty(): return
	var t = cand[int(randf() * cand.size())]
	var L := maxi(0, lvl("simsek") - 1)
	var Wd: Dictionary = W.simsek
	var dmg: float = Wd.dmg[L] * (2.2 + wi(Wd, "storm") * 0.35)
	g.explode(t.x, t.y, dmg, 90 + wi(Wd, "storm") * 12, true)
	if g.renderer3d: g.renderer3d.spawn_storm_strike(t.x, t.y)
	g.add_shake(0.14)
	g.audio.play("storm")
	Quality.haptic("crit")

# ═══════════ LEVEL-UP SEÇİM HAVUZU ═══════════

func weapon_stat_lines(id: String, curLevel: int) -> Array:
	var defs = D.WEAPON_STATS.get(id)
	var Wd: Dictionary = W[id]
	if defs == null: return []
	var lines := []
	var toIdx := mini(curLevel, 4)
	for dd in defs:
		var key: String = dd[0]
		var label: String = dd[1]
		var unit: String = dd[2] if dd.size() > 2 and dd[2] else ""
		var arr = Wd.get(key)
		if not (arr is Array): continue
		var to = arr[toIdx]
		var from = arr[toIdx - 1] if curLevel > 0 else null
		var lower_better := key == "cooldown"
		var dir := 0
		if from != null:
			dir = (1 if to > from else (-1 if to < from else 0)) * (-1 if lower_better else 1)
		lines.append({"label": label, "from": from, "to": to, "unit": unit, "dir": dir})
	return lines

func roll_choices(n: int) -> Array:
	var g = game
	var passives_l := []
	for id in D.PASSIVES:
		var P: Dictionary = D.PASSIVES[id]
		var L: int = passives.get(id, 0)
		if L < P.maxLevel:
			passives_l.append({"kind": "passive", "id": id, "tag": "RÜN" if L == 0 else "GELİŞTİR",
				"name": P.name, "desc": P.desc, "level": L, "max": P.maxLevel, "stats": []})
	var actives := []
	for sp in D.SPECIAL_PERKS:
		if specialTaken.get(sp.id): continue
		if lvl(sp.need.weapon) >= 1:
			actives.append({"kind": "special", "id": sp.id, "icon": sp.get("icon"), "tag": "ÖZEL PERK",
				"name": sp.name, "desc": sp.desc, "level": 0, "max": 1, "stats": [], "boost": sp.boost})
	var cdef = g.char_def()
	var sigs = D.SIGNATURES.get(cdef.id) if cdef else null
	if sigs and lvl(cdef.startWeapon) >= 1:
		var clvl: int = g.char_level(cdef.id)
		var roman := ["I", "II", "III", "IV", "V"]
		for sp in sigs:
			if JS.truthy(sp.get("minLvl")) and clvl < sp.minLvl: continue
			var tier: int = sigLvl.get(sp.id, 0)
			if tier >= 5: continue
			actives.append({"kind": "special", "sig": true, "myth": JS.truthy(sp.get("myth")),
				"seher": JS.truthy(sp.get("seher")), "simsek": JS.truthy(sp.get("simsek")),
				"korsan": JS.truthy(sp.get("korsan")), "kralice": JS.truthy(sp.get("kralice")), "sovalye": JS.truthy(sp.get("sovalye")),
				"sapanci": JS.truthy(sp.get("sapanci")),
				"id": sp.id, "icon": sp.get("glyph") if sp.get("glyph") else cdef.startWeapon,
				"tag": "KADEME " + roman[tier], "tier": tier + 1,
				"name": sp.name, "desc": sp.desc, "level": tier, "max": 5, "stats": [], "boost": sp.boost})
	var evoCard = null
	if cdef and not evolved:
		var E = EVOLUTIONS.get(cdef.id)
		var sum := 0
		for k in sigLvl: sum += JS.i(sigLvl[k])
		if E and sum >= 5 and JS.i(passives.get(E.pas)) >= 2 and lvl(E.weapon) >= 1:
			var boost := {"weapon": E.weapon}
			boost.merge(E.boost)
			evoCard = {"kind": "special", "evo": true, "myth": true, "id": "evo_" + cdef.id, "icon": cdef.startWeapon,
				"tag": "EVRİM", "name": E.name, "desc": E.desc, "level": 0, "max": 1, "stats": [], "boost": boost}
	var nimets := [
		{"kind": "heal", "id": "heal", "tag": "NİMET", "name": "Kızıl Şifa", "desc": "Anında 40 can yeniler.", "level": 0, "max": 1, "stats": []},
		{"kind": "guc", "id": "guc", "tag": "NİMET", "name": "Kadim Güç", "desc": "Tüm hasar kalıcı olarak +%8.", "level": 0, "max": 1, "stats": []},
		{"kind": "heal", "id": "heal2", "tag": "NİMET", "name": "Kan Ziyafeti", "desc": "Anında 40 can yeniler.", "level": 0, "max": 1, "stats": []},
	]
	JS.shuffle(passives_l)
	JS.shuffle(actives)
	var MAX_PASSIVE := 2
	var pWant := 0
	for i in MAX_PASSIVE:
		if randf() < 0.72: pWant += 1
	pWant = mini(pWant, mini(passives_l.size(), n))
	var out := []
	for i in pWant: out.append(passives_l[i])
	var rest := actives + nimets
	var ri := 0
	while out.size() < n and ri < rest.size():
		out.append(rest[ri])
		ri += 1
	var pi_ := pWant
	while out.size() < n and pi_ < passives_l.size() and _passive_count(out) < MAX_PASSIVE:
		out.append(passives_l[pi_])
		pi_ += 1
	var ni := 0
	while out.size() < n:
		out.append(nimets[ni % nimets.size()])
		ni += 1
	JS.shuffle(out)
	var res := out.slice(0, n)
	if evoCard == null and not wEvolved and g.player and g.player.level >= 9:
		var best = null
		var bl := 0
		for wid in WEAPON_EVO:
			var E: Dictionary = WEAPON_EVO[wid]
			var l := lvl(wid)
			if l >= 1 and JS.i(passives.get(E.pas)) >= 2 and l > bl:
				best = wid
				bl = l
		if best:
			var E: Dictionary = WEAPON_EVO[best]
			var boost := {"weapon": best}
			boost.merge(E.boost)
			evoCard = {"kind": "special", "evo": true, "wEvo": true, "myth": true, "id": "evo_w_" + best, "icon": best,
				"tag": "EVRİM", "name": E.name, "desc": E.desc, "level": 0, "max": 1, "stats": [], "boost": boost}
	if evoCard: res[int(randf() * res.size())] = evoCard
	if g.player and g.player.level >= 8 and curses < 2 and randf() < 0.16:
		var pool := []
		for K in CURSES:
			if cursed.get(K.id): continue
			if g.player.noHeal and JS.truthy(K.get("noHealBan")): continue
			pool.append(K)
		if not pool.is_empty():
			var K: Dictionary = pool[int(randf() * pool.size())]
			var slot := -1
			for i in res.size():
				var c: Dictionary = res[i]
				if not c.get("evo") and not c.get("sig") and not c.get("pow"):
					slot = i
					break
			if slot >= 0:
				res[slot] = {"kind": "curse", "curse": true, "id": K.id, "icon": K.icon, "tag": "LANETLİ", "name": K.name, "desc": K.desc, "level": 0, "max": 1, "stats": [], "mods": K.mods}
	if not g.meta.get("ftue") and not JS.i(g.progress.get(1, 0)) and not g._ftuePow and g.player and g.player.level >= 3:
		var sig = null
		for c in actives:
			if c.get("sig"):
				sig = c
				break
		if sig:
			g._ftuePow = true
			var has_sig := false
			for c in res:
				if c.get("sig"): has_sig = true
			if not has_sig: res[1] = sig
			for c in res:
				if c.get("sig"): c["pow"] = true
	for c in res:
		var t = card_tag(c)
		if t:
			c["stag"] = t
			c["stagN"] = JS.i(tagN.get(t))
	return res

func _passive_count(out: Array) -> int:
	var k := 0
	for c in out:
		if c.kind == "passive": k += 1
	return k

func card_tag(c):
	if c == null or c.get("curse") or c.get("evo"): return null
	if c.kind == "passive": return PAS_TAG.get(c.id)
	if c.kind == "guc": return "KOR"
	if c.kind == "special":
		var cd = game.char_def()
		return HERO_TAG.get(cd.id) if cd else null
	return null

func _add_tag(c) -> void:
	var t = card_tag(c)
	if t == null: return
	var n: int = JS.i(tagN.get(t)) + 1
	tagN[t] = n
	var T: Dictionary = TAGS[t]
	for tr in T.tiers:
		var key: String = t + JS.s(tr.n)
		if n >= tr.n and not tagDone.get(key):
			tagDone[key] = true
			var g = game
			var p = g.player
			p.apply_mods(tr.mods)
			g.audio.play("synergy")
			g.spawn_text(p.x, p.y - 52, tag_name(t) + " " + JS.s(tr.n) + " · " + Txt.upper_tr(tr.name), T.col, 18, true)
			g.spawn_burst(p.x, p.y, T.col, 18, 240, 3, 0.6, true)

func evo_hint():
	var g = game
	var cdef = g.char_def()
	if not cdef or evolved: return null
	var E = EVOLUTIONS.get(cdef.id)
	if not E: return null
	var sum := 0
	for k in sigLvl: sum += JS.i(sigLvl[k])
	var pl := JS.i(passives.get(E.pas))
	var P = D.PASSIVES.get(E.pas)
	return {"name": E.name, "sig": mini(5, sum), "pas": mini(2, pl), "pasName": P.name if P else ""}

func apply_choice(c: Dictionary) -> void:
	var p = game.player
	_add_tag(c)
	match c.kind:
		"weapon":
			var was: int = slots.get(c.id, 0)
			slots[c.id] = was + 1
			if was == 0: on_weapon_gained()
		"passive":
			passives[c.id] = passives.get(c.id, 0) + 1
			p.apply_mods(D.PASSIVES[c.id].mods)
		"special":
			apply_special(c)
		"heal":
			p.heal(40)
		"guc":
			p.dmgMult += 0.08
		"curse":
			cursed[c.id] = true
			curses += 1
			p.apply_mods(c.mods)
			var g = game
			g.spawn_burst(p.x, p.y, "#ff4d5e", 22, 260, 3.2, 0.7, true)
			g.spawn_burst(p.x, p.y, "#2a0a10", 14, 180, 3, 0.8, false)
			g.spawn_text(p.x, p.y - 70, "LANET", "#ff8a94", 16, true)
			g.audio.play("curse")

func apply_special(c: Dictionary) -> void:
	if c.get("evo"):
		if c.get("wEvo"): wEvolved = true
		else: evolved = true
		var g = game
		var p = g.player
		var W0 = D.WEAPONS.get(c.boost.weapon)
		g._evoCine = {"from": W0.name if W0 else "", "to": c.name, "icon": c.get("icon")}
		if g.meta:
			if not g.meta.has("evo"): g.meta["evo"] = []
			if not g.meta.evo.has(c.id):
				g.meta.evo.append(c.id)
				g.save_meta()
		g.spawn_burst(p.x, p.y, "#f0c77a", 26, 320, 3.4, 0.8, true)
		g.music.duck(600)
		g.spawn_burst(p.x, p.y, "#ffffff", 10, 180, 2.4, 0.5, true)
		g.fx_impact(p.x, p.y, 0, 3, "#f0c77a")
		g.punch(0.045)
		g.spawn_text(p.x, p.y - 70, "EVRİM", "#ffe9bd", 16, true)
	if c.get("sig"): sigLvl[c.id] = sigLvl.get(c.id, 0) + 1
	else: specialTaken[c.id] = true
	var boost: Dictionary = c.boost
	if JS.truthy(boost.get("critMultAdd")): game.player.critMult += boost.critMultAdd
	if JS.truthy(boost.get("armorAdd")): game.player.armor += boost.armorAdd
	var Wd = W.get(boost.get("weapon"))
	if Wd == null: return
	for key in boost:
		if key == "weapon": continue
		var v = boost[key]
		var mul_field = ("dps" if Wd.has("dps") else "dmg") if key == "dmg" else MUL_MAP_BASE.get(key)
		var sa = SCALAR_ADD.get(key)
		if sa and (Wd.get(sa) is float or Wd.get(sa) is int):
			Wd[sa] = Wd[sa] + v
		elif mul_field and Wd.get(mul_field) != null:
			var tgt = Wd[mul_field]
			if tgt is Array:
				for i in tgt.size(): tgt[i] = JS.round_js(tgt[i] * v * 100) / 100.0
			else:
				Wd[mul_field] = JS.round_js(float(tgt) * v * 100) / 100.0
		elif ADD_MAP.get(key) and JS.truthy(Wd.get(ADD_MAP[key])):
			var arr = Wd[ADD_MAP[key]]
			if arr is Array:
				for i in arr.size(): arr[i] += v
	var g = game
	var p = g.player
	g.spawn_text(p.x, p.y - 44, String(c.name).to_upper(), "#f5c044", 20, true)

func on_weapon_gained() -> void:
	var counts := {}
	for id in slots:
		if slots[id] > 0 and D.WEAPON_META.has(id):
			var cls: String = D.WEAPON_META[id]["class"]
			counts[cls] = counts.get(cls, 0) + 1
	var g = game
	var p = g.player
	for cls in D.CLASS_SYNERGIES:
		var have: int = counts.get(cls, 0)
		for syn in D.CLASS_SYNERGIES[cls]:
			var key: String = cls + ":" + JS.s(syn.need)
			if have >= syn.need and not synApplied.get(key):
				synApplied[key] = true
				p.apply_mods(syn.mods)
				g.audio.play("synergy")
				g.spawn_text(p.x, p.y - 44, "SİNERJİ: " + String(syn.name).to_upper(), "#59e3c8", 18, true)
