extends Node
## D — oyunun TÜM veri tabloları + config.js / worlds.js / balance.js
## fonksiyonları. Tablolar web oyununun KENDİ modüllerinden dökülür
## (tools/bake/pages/data.html → data/raw/*.json), yani elle kopya yok:
## denge değişirse döküm yeniden alınır, kod değişmez.

var RAW := {}   # modül adı → dışa aktarılanlar

# ── config.js ──
var COLORS: Dictionary
var FX: Dictionary
var PLAYER: Dictionary
var ENEMY_TYPES: Dictionary
var RUN: Dictionary
var RAMP: Dictionary
var DYN: Dictionary
var BASE_ROSTER: Dictionary
var WAVES: Dictionary
var BOSS: Dictionary
var HAZARD_CAP: int = 12
var DRAGON: Dictionary
var WEAPONS: Dictionary
var WEAPON_STATS: Dictionary
var WEAPON_CLASSES: Dictionary
var CLASS_SYNERGIES: Dictionary
var SPECIAL_PERKS: Array
var WEAPON_META: Dictionary
var WEAPON_SLOTS: Dictionary
var CHARACTERS: Dictionary
var BATTLE_PASS: Dictionary
var BATTLE_PASS_TIERS: Array
var DEFAULT_CHAR: String = "okcu"
var SIGNATURES: Dictionary
var UNLOCK_ALL_CHARS := false
var STONE_PACKS: Array
var RUBY_EXCHANGE: Array
var CHAR_RARITIES: Array
var CHAR_MAX_LEVEL: int = 9
var CHAR_CARD_REQ: Array
var CHAR_GOLD_COST: Array
var SURVIVAL_MILESTONES: Array
var PASSIVES: Dictionary
var STARTING_WEAPON: String = "kilic"
var GEM_TIERS: Array
var RARITIES: Array
var MODS: Dictionary
var ITEMS: Array
var SHOP: Dictionary
var EQUIP_SLOTS: Array
var EQUIPMENT: Array
var GEAR_MAX_LEVEL: int = 6
var GEAR_CARD_REQ: Array
var GEAR_GOLD_COST: Array

# ── worlds.js ──
var WORLDS: Array
var MISSIONS_PER_WORLD: int = 10

# ── balance.js ──
var BAL_W: Dictionary
var CAPS: Dictionary

const PROG_KEY := "kh_progress"

func _init() -> void:
	var dir := DirAccess.open("res://data/raw")
	if dir:
		for f in dir.get_files():
			if f.ends_with(".json") and not f.begins_with("_"):
				var txt := FileAccess.get_file_as_string("res://data/raw/" + f)
				var v = JSON.parse_string(txt)
				if v is Dictionary:
					RAW[f.get_basename()] = v
	var c: Dictionary = RAW.get("config", {})
	COLORS = c.get("COLORS", {})
	FX = c.get("FX", {})
	PLAYER = c.get("PLAYER", {})
	ENEMY_TYPES = c.get("ENEMY_TYPES", {})
	RUN = c.get("RUN", {})
	RAMP = c.get("RAMP", {})
	DYN = c.get("DYN", {})
	BASE_ROSTER = c.get("BASE_ROSTER", {})
	WAVES = c.get("WAVES", {})
	BOSS = c.get("BOSS", {})
	HAZARD_CAP = int(c.get("HAZARD_CAP", 12))
	DRAGON = c.get("DRAGON", {})
	WEAPONS = c.get("WEAPONS", {})
	WEAPON_STATS = c.get("WEAPON_STATS", {})
	WEAPON_CLASSES = c.get("WEAPON_CLASSES", {})
	CLASS_SYNERGIES = c.get("CLASS_SYNERGIES", {})
	SPECIAL_PERKS = c.get("SPECIAL_PERKS", [])
	WEAPON_META = c.get("WEAPON_META", {})
	WEAPON_SLOTS = c.get("WEAPON_SLOTS", {})
	CHARACTERS = c.get("CHARACTERS", {})
	BATTLE_PASS = c.get("BATTLE_PASS", {})
	BATTLE_PASS_TIERS = c.get("BATTLE_PASS_TIERS", [])
	DEFAULT_CHAR = c.get("DEFAULT_CHAR", "okcu")
	SIGNATURES = c.get("SIGNATURES", {})
	STONE_PACKS = c.get("STONE_PACKS", [])
	RUBY_EXCHANGE = c.get("RUBY_EXCHANGE", [])
	CHAR_RARITIES = c.get("CHAR_RARITIES", [])
	CHAR_MAX_LEVEL = int(c.get("CHAR_MAX_LEVEL", 9))
	CHAR_CARD_REQ = c.get("CHAR_CARD_REQ", [])
	CHAR_GOLD_COST = c.get("CHAR_GOLD_COST", [])
	SURVIVAL_MILESTONES = c.get("SURVIVAL_MILESTONES", [])
	PASSIVES = c.get("PASSIVES", {})
	STARTING_WEAPON = c.get("STARTING_WEAPON", "kilic")
	GEM_TIERS = c.get("GEM_TIERS", [])
	RARITIES = c.get("RARITIES", [])
	MODS = c.get("MODS", {})
	ITEMS = c.get("ITEMS", [])
	SHOP = c.get("SHOP", {})
	EQUIP_SLOTS = c.get("EQUIP_SLOTS", [])
	EQUIPMENT = c.get("EQUIPMENT", [])
	GEAR_MAX_LEVEL = int(c.get("GEAR_MAX_LEVEL", 6))
	GEAR_CARD_REQ = c.get("GEAR_CARD_REQ", [])
	GEAR_GOLD_COST = c.get("GEAR_GOLD_COST", [])
	# geliştirici bayrağı (web: ?dev=1) — mobilde komut satırı argümanı
	UNLOCK_ALL_CHARS = OS.get_cmdline_user_args().has("--dev")

	var w: Dictionary = RAW.get("worlds", {})
	WORLDS = w.get("WORLDS", [])
	MISSIONS_PER_WORLD = int(w.get("MISSIONS_PER_WORLD", 10))

	var b: Dictionary = RAW.get("balance", {})
	BAL_W = b.get("W", {})
	CAPS = b.get("CAPS", {})

# ═══════════ config.js fonksiyonları ═══════════

func xpToNext(level: float) -> float:
	return floor(11.0 * pow(1.235, level - 1) + 5.0 * level)

func waveTime(w: float, waves: float) -> float:
	if not (waves >= 1):
		return minf(70.0, 30.0 + w * 4.2)
	var total := 300.0 + 11.0 * (waves - 5)
	var sum := waves * 0.8 + 0.06 * waves * (waves - 1) / 2.0
	return total * (0.8 + 0.06 * (w - 1)) / sum

func waveInterval(w: float) -> float:
	if w <= 3:
		return [1.90, 1.65, 1.40][int(w) - 1]
	return maxf(0.34, 1.22 * pow(0.91, w - 3))

func waveBatch(w: float) -> float:
	if w <= 2: return 1.0
	return minf(10.0, 1.0 + ceil((w - 2) * 0.8))

func waveHpMul(w: float) -> float: return 1.0 + (w - 1) * 0.25
func waveDmgMul(w: float) -> float: return 1.0 + (w - 1) * 0.085

func onScreenCap(w: float) -> float: return minf(64.0, 18.0 + w * 4)

func pressureAt(runT: float, waveT: float, dyn) -> float:
	var f: float = 1.0 if (dyn == null or is_nan(float(dyn)) or is_inf(float(dyn))) else float(dyn)
	if runT < RAMP.breathSec:
		f *= RAMP.breathMul + (1.0 - RAMP.breathMul) * (runT / RAMP.breathSec)
	if waveT < RAMP.waveEaseSec:
		f *= RAMP.waveEaseMul + (1.0 - RAMP.waveEaseMul) * (waveT / RAMP.waveEaseSec)
	return f

func spawnGap(wave: float, pr: float) -> float:
	return minf(RAMP.gapMax, waveInterval(wave) / sqrt(maxf(0.05, pr)))

func spawnBatch(wave: float, density: float, pr: float) -> float:
	var b := maxf(1.0, JS.round_js(waveBatch(wave) * (density if density != 0 else 1.0)))
	return maxf(1.0, JS.round_js(b * sqrt(maxf(0.05, pr))))

func _type_curve(k: String, w: float) -> float:
	match k:
		"zombi": return 10.0
		"atici": return 1.0 + (w - 1) * 0.6 if w >= 2 else 0.0
		"muhafiz": return 0.5 + (w - 3) * 0.25 if w >= 3 else 0.0
		"agir": return 0.34 + (w - 4) * 0.16 if w >= 4 else 0.0
		"patlayici": return 0.9 + (w - 2) * 0.42 if w >= 2 else 0.0
		"kral": return 0.16 + (w - 6) * 0.06 if w >= 6 else 0.0
	return 0.0

const TYPE_ORDER := ["zombi", "atici", "muhafiz", "agir", "patlayici", "kral"]

func waveWeights(w: float, roster) -> Dictionary:
	var R: Dictionary = roster if roster is Dictionary else BASE_ROSTER
	var o := {}
	for k in TYPE_ORDER:
		var mul = R.get(k)
		if not JS.truthy(mul): continue
		var v := _type_curve(k, w) * float(mul)
		if v > 0: o[k] = v
	if not o.has("zombi"): o["zombi"] = 10.0
	return o

func accountXpToNext(level: float) -> float:
	return floor(60.0 * pow(1.14, level - 1) + 26.0 * level)

const ACCOUNT_LEVEL_CHESTS := {3: "ahsap", 6: "yaygin", 10: "kemik", 15: "kan", 20: "kadim", 26: "mistik", 33: "ejderha"}
func accountLevelChest(level: int):
	if ACCOUNT_LEVEL_CHESTS.has(level): return ACCOUNT_LEVEL_CHESTS[level]
	if level > 33 and (level - 33) % 8 == 0: return "ejderha"
	return null

func accountJourneyMilestones(uptoLevel: int) -> Array:
	var list := []
	for lv in range(1, uptoLevel + 1):
		var chest = accountLevelChest(lv)
		if chest: list.append({"level": lv, "chest": chest})
	return list

func signaturePower(rarity) -> float:
	var t := [1.0, 1.0, 1.12, 1.25, 1.45]
	var r := JS.i(rarity)
	return t[r] if r >= 0 and r < t.size() else 1.0

func signatureUnlocks(charId: String, charLevel) -> Array:
	var list: Array = SIGNATURES.get(charId, [])
	var out := []
	for s in list:
		if not JS.truthy(s.get("minLvl")): continue
		out.append({"id": s.id, "name": s.name, "desc": s.desc, "minLvl": s.minLvl, "glyph": s.get("glyph"),
			"locked": JS.i(charLevel) < s.minLvl, "myth": JS.truthy(s.get("myth"))})
	return out

func charLevelMods(level) -> Dictionary:
	var b := maxf(0.0, JS.i(level) - 1)
	return {"hpMul": 1.0 + 0.08 * b, "dmgAdd": 0.07 * b, "atkAdd": 0.02 * b}

func charCardDrop(rarity: int) -> int:
	if rarity >= 4: return 1
	if rarity == 3: return 1 + (1 if randf() < 0.4 else 0)
	if rarity == 2: return 2 + (1 if randf() < 0.5 else 0)
	return 2 + int(randf() * 3)

func gearLevelMods(level) -> float:
	var b := maxf(0.0, JS.i(level) - 1)
	return 1.0 + 0.12 * b

func rubyReward(wave: float, kills: float, won: bool) -> float:
	return JS.round_js(wave * 4 + kills * 0.12 + (60 if won else 0))

func shopPriceMul(w: float) -> float: return 1.0 + (w - 1) * 0.12
func shopRerollCost(w: float, n: float) -> float: return ceil((4 + w * 1.5) * (1 + 0.6 * n))

func rarityRoll(w: float, luck: float) -> int:
	var l := 1.0 + luck
	var c := [
		maxf(12.0, 90.0 - w * 7),
		(14 + w * 3.2) * l,
		(3 + w * 2.4) * l if w >= 3 else 0.0,
		(0.5 + w * 1.1) * l if w >= 5 else 0.0,
	]
	var tot: float = c[0] + c[1] + c[2] + c[3]
	var r := randf() * tot
	for i in 4:
		r -= c[i]
		if r <= 0: return i + 1
	return 1

# ═══════════ worlds.js ═══════════

func world(w: int) -> Dictionary:
	if w >= 1 and w <= WORLDS.size(): return WORLDS[w - 1]
	return WORLDS[0]

const M_ORDER := ["survive", "defend", "survive", "hunt", "survive", "escape", "defend", "hunt", "escape"]
func mType(w: int, m: int) -> String:
	if m >= 10 or (w == 1 and m <= 2): return "survive"
	return M_ORDER[m - 1] if m - 1 < M_ORDER.size() else "survive"

func missionDef(w: int, m: int) -> Dictionary:
	var wd: Dictionary = WORLDS[w - 1]
	var isBoss := m == MISSIONS_PER_WORLD
	var waves: float = 8.0 if isBoss else minf(9.0, 4.0 + ceil(m * 0.55))
	var grace := 0.72 if (w == 1 and m <= 2) else (0.86 if (w == 1 and m <= 4) else 1.0)
	var hpMul: float = wd.hpMul * (1 + (m - 1) * 0.12) * grace
	var dmgMul: float = wd.dmgMul * (1 + (m - 1) * 0.045) * grace
	var bossCurve := JS.num(wd, "bossCurve", 1.0)
	var bossHpMul := bossCurve * (1 + (m - 1) * 0.08) * grace
	var mixOffset := (w - 1) * 2 + floor((m - 1) / 2.0)
	var mt := mType(w, m)
	var objective: String
	if isBoss:
		objective = "BOSS: " + str(wd.boss)
	else:
		match mt:
			"survive": objective = JS.s(waves) + " DALGA HAYATTA KAL"
			"defend": objective = "SAVUN · totemi " + JS.s(waves) + " dalga koru"
			"hunt": objective = "AV · kaçan eliti devir"
			"escape": objective = "KAÇIŞ · " + JS.s(waves) + ". dalgada çıkışa koş"
	return {
		"world": w, "mission": m, "waves": waves, "isBoss": isBoss,
		"hpMul": hpMul, "dmgMul": dmgMul, "bossHpMul": bossHpMul,
		"density": JS.num(wd, "density", 1.0),
		"aliveCap": JS.num(wd, "aliveCap", 120.0),
		"speedMul": wd.get("speedMul", 1.0),
		"roster": wd.get("roster"),
		"gemMul": wd.gemMul * (1 + (m - 1) * 0.06),
		"xpMul": 1.0 / JS.num(wd, "density", 1.0),
		"eliteChance": wd.eliteChance + (m - 1) * 0.006,
		"mixOffset": mixOffset,
		"type": mt,
		"objective": objective,
		"estMin": maxf(2.0, JS.round_js(waves * 0.85)),
	}

func missionReward(w: int, m: int) -> float:
	return JS.round_js((22 + m * 11) * (1 + (w - 1) * 0.85) + (60 if m == 10 else 0))

func replayReward(w: int, m: int) -> float:
	return maxf(8.0, JS.round_js(missionReward(w, m) * 0.42))

func loadProgress() -> Dictionary:
	var out := {}
	var p = JSON.parse_string(Store.get_item(PROG_KEY, "{}"))
	if not (p is Dictionary): p = {}
	for w in range(1, WORLDS.size() + 1):
		out[w] = mini(MISSIONS_PER_WORLD, JS.i(p.get(str(w), 0)))
	return out

func saveProgress(prog: Dictionary) -> void:
	var o := {}
	for k in prog: o[str(k)] = prog[k]
	Store.set_item(PROG_KEY, JSON.stringify(o))

func worldCleared(prog: Dictionary, w: int) -> bool:
	if w <= 1: return true
	return JS.i(prog.get(w - 1, 0)) >= MISSIONS_PER_WORLD

func worldUnlocked(_prog: Dictionary, _w: int) -> bool:
	return true   # yayında: return worldCleared(prog, w)

func missionUnlocked(prog: Dictionary, w: int, m: int) -> bool:
	if not worldUnlocked(prog, w): return false
	return m <= JS.i(prog.get(w, 0)) + 1

func nextMission(prog: Dictionary) -> Dictionary:
	for w in range(1, WORLDS.size() + 1):
		if not worldUnlocked(prog, w): break
		var cleared := JS.i(prog.get(w, 0))
		if cleared < MISSIONS_PER_WORLD: return {"w": w, "m": cleared + 1}
	return {"w": WORLDS.size(), "m": MISSIONS_PER_WORLD}

# ═══════════ balance.js ═══════════

const GEAR_BUDGET := [0, 6, 11, 16, 23, 30]
const _SIG := [1.0, 1.0, 1.12, 1.25, 1.45]
const CHALLENGE := {"hp": 0.16, "dmg": 0.09, "bossHp": 0.10}

static func _lerpA(a: Array, x: float) -> float:
	var i := mini(a.size() - 2, maxi(1, int(floor(x))))
	return a[i] + (a[i + 1] - a[i]) * minf(1.0, maxf(0.0, x - i))

func expectedPower(w: float) -> Dictionary:
	var k := maxf(0.0, w - 1)
	var L := minf(9.0, 1 + 0.9 * k)
	var b := L - 1
	var heroDmg := (1 + 0.07 * b) * (1 + 0.02 * b)
	var heroHp := 1 + 0.08 * b
	var rank := minf(5.0, 1 + 0.45 * k)
	var gl := minf(6.0, 1 + 0.55 * k)
	var glm := 1 + 0.12 * (gl - 1)
	var wpn := _lerpA(GEAR_BUDGET, rank) * glm
	var oth := 3 * _lerpA(GEAR_BUDGET, rank) * 0.75 * glm
	var dmg := heroDmg * (1 + (wpn + oth * 0.5) / 100.0) * _lerpA(_SIG, minf(4.0, 1 + 0.4 * k))
	var hp := heroHp * (1 + (oth * 0.5 * 2) / 100.0)
	return {"level": L, "rank": rank, "gearLevel": gl, "dmg": dmg, "hp": hp}

var _P1 = null
func worldCurve(w: float) -> Dictionary:
	if _P1 == null: _P1 = expectedPower(1)
	var P := expectedPower(w)
	var k := maxf(0.0, w - 1)
	var pd: float = P.dmg / _P1.dmg
	var ph: float = P.hp / _P1.hp
	return {
		"hpMul": JS.round_js(pd * (1 + CHALLENGE.hp * k) * 100) / 100.0,
		"dmgMul": JS.round_js(ph * (1 + CHALLENGE.dmg * k) * 100) / 100.0,
		"bossHpMul": JS.round_js(pd * (1 + CHALLENGE.bossHp * k) * 100) / 100.0,
		"power": JS.round_js(pd * 100) / 100.0, "toughness": JS.round_js(ph * 100) / 100.0,
	}

func powerOf(mods) -> float:
	var s := 0.0
	if mods is Dictionary:
		for k in mods: s += JS.num(BAL_W, k, 0.0) * float(mods[k])
	return s

const _LBL := {"dmgPct": "hasar", "atkPct": "saldırı hızı", "critChance": "kritik", "critMult": "kritik hasarı",
	"lifeSteal": "can çalma", "speedPct": "hız", "dodge": "kaçınma", "maxHp": "azami can", "armor": "zırh", "regen": "yenilenme"}
const _ORD := ["dmgPct", "atkPct", "critChance", "critMult", "lifeSteal", "speedPct", "dodge", "maxHp", "armor", "regen"]
func modsLine(mods) -> String:
	var parts := []
	for k in _ORD:
		if not (mods is Dictionary) or mods.get(k) == null or mods[k] == 0: continue
		var v: float = mods[k]
		var sg := "+" if v > 0 else "−"
		var a := absf(v)
		var n: String
		if k == "maxHp" or k == "armor" or k == "regen":
			n = JS.s(JS.round_js(a * 10) / 10.0)
		else:
			n = "%" + JS.s(JS.round_js(a * 1000) / 10.0).replace(".", ",")
		parts.append(_LBL[k] + " " + sg + n)
	var s := ", ".join(parts)
	if s.is_empty(): return s
	return Txt.upper_tr(s.substr(0, 1)) + s.substr(1)

# ═══════════ yardımcılar ═══════════

func gem_tier_for(value: float) -> int:
	var t := 0
	var i := GEM_TIERS.size() - 1
	while i >= 0:
		if value >= GEM_TIERS[i].min:
			t = i
			break
		i -= 1
	return t

func equipment_by_id(id) -> Variant:
	for e in EQUIPMENT:
		if e.id == id: return e
	return null
