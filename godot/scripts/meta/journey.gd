class_name Journey
## journey.js — Oyuncu yolculuğu: Daily (günde 3 hedef) · BLESSINGS · Gift
## (dönüş hediyesi) · nextGoal · Ghost (kendi rekorunla yarış) · SEASON.

const DAILY_POOL := [
	{"id": "k150", "t": "Bir koşuda 150 kıyım"},
	{"id": "win", "t": "Bir görev kazan"},
	{"id": "lv12", "t": "Koşuda seviye 12'ye ulaş"},
	{"id": "fc2", "t": "Bir koşuda 2 saha sandığı aç"},
	{"id": "hp", "t": "Canın yarıya inmeden kazan"},
	{"id": "el3", "t": "Bir koşuda 3 elit öldür"},
	{"id": "evo", "t": "Bir koşuda evrim aç"},
	{"id": "boss", "t": "Bir boss devir"},
]
const DAILY_CHEST := "ahsap"

static func _daily_ok(id: String, r: Dictionary) -> bool:
	match id:
		"k150": return r.kills >= 150
		"win": return r.won
		"lv12": return r.lvl >= 12
		"fc2": return r.fc >= 2
		"hp": return r.won and r.hpFloor >= 0.5
		"el3": return r.elites >= 3
		"evo": return r.evo
		"boss": return r.boss
	return false

static func _hash(s: String) -> int:
	var h := 2166136261
	var u := s.to_utf16_buffer()
	for i in u.size() / 2:
		h ^= u[i * 2] | (u[i * 2 + 1] << 8)
		h = Store._imul(h, 16777619)
	return h & 0xffffffff

static func daily_book(meta: Dictionary) -> Dictionary:
	var d := Dailies.day_key()
	if not meta.get("dg") or meta.dg.get("d") != d:
		var h := _hash("dg" + d)
		var pool := []
		for q in DAILY_POOL: pool.append(q.id)
		var ids := []
		while ids.size() < 3:
			h = Store._imul(h ^ (h >> 15), 2246822519) & 0xffffffff
			var i := h % pool.size()
			ids.append(pool[i])
			pool.remove_at(i)
		meta["dg"] = {"d": d, "ids": ids, "done": [0, 0, 0], "paid": 0}
	return meta.dg

static func daily_list(meta: Dictionary) -> Array:
	var B := daily_book(meta)
	var out := []
	for i in B.ids.size():
		var id: String = B.ids[i]
		var t := id
		for q in DAILY_POOL:
			if q.id == id: t = q.t
		out.append({"id": id, "t": t, "done": JS.truthy(B.done[i])})
	return out

static func daily_left(meta: Dictionary) -> int:
	var B := daily_book(meta)
	var n := 0
	for x in B.done:
		if JS.truthy(x): n += 1
	return 3 - n

static func daily_on_run(g, r: Dictionary) -> Dictionary:
	var B := daily_book(g.meta)
	var fresh := []
	for i in B.ids.size():
		var id: String = B.ids[i]
		if not JS.truthy(B.done[i]) and _daily_ok(id, r):
			B.done[i] = 1
			for q in DAILY_POOL:
				if q.id == id: fresh.append(q.t)
	var chest = null
	var all_done := true
	for x in B.done:
		if not JS.truthy(x): all_done = false
	if not JS.truthy(B.paid) and all_done:
		B.paid = 1
		chest = DAILY_CHEST
		if not g.chests.grant(DAILY_CHEST): g.add_rubies(120)
	return {"fresh": fresh, "chest": chest, "left": daily_left(g.meta)}

const BLESSINGS := [
	{"id": "cam", "name": "CAM KILIÇ", "plus": "Hasar +%12", "minus": "Can −24", "mods": {"dmgPct": 0.12, "maxHp": -24}, "col": "#d8a284"},
	{"id": "demir", "name": "DEMİR DERİ", "plus": "Can +24", "minus": "Hasar −%12", "mods": {"maxHp": 24, "dmgPct": -0.12}, "col": "#cfd6e2"},
	{"id": "ruzgar", "name": "RÜZGÂR ADIMI", "plus": "Hız +%10 · Mıknatıs +%30", "minus": "Can −20", "mods": {"speedPct": 0.10, "magnetPct": 0.30, "maxHp": -20}, "col": "#9fb4c9"},
	{"id": "kan", "name": "KAN ANDI", "plus": "Can çalma +%3", "minus": "Hasar −%6", "mods": {"lifeSteal": 0.03, "dmgPct": -0.06}, "col": "#c85a5a"},
	{"id": "goz", "name": "ŞAHİN GÖZÜ", "plus": "Kritik +%6", "minus": "Hasar −%6", "mods": {"critChance": 0.06, "dmgPct": -0.06}, "col": "#f0c77a"},
	{"id": "hasat", "name": "HASAT AYI", "plus": "Tecrübe +%15", "minus": "Hasar −%5", "mods": {"xpPct": 0.15, "dmgPct": -0.05}, "col": "#b5d68a"},
]

static func roll_blessings(n: int) -> Array:
	var a := BLESSINGS.duplicate(true)
	JS.shuffle(a)
	return a.slice(0, n)

const GIFT_CAP_H := 8.0

static func gift_collect(g):
	var now := Clock.now()
	var t := float(g.meta.get("awayT", 0)) if g.meta.get("awayT") != null else 0.0
	if not t or now <= t: return null
	var h := minf(GIFT_CAP_H, (now - t) / 36e5)
	if h < 1: return null
	var gold := JS.round_js(h * 28 + minf(40.0, g.account_level() * 2) * h / 2.0)
	g.add_rubies(gold)
	var chest = null
	if h >= 6:
		chest = "ahsap"
		if not g.chests.grant("ahsap"): chest = null
	return {"h": h, "gold": gold, "chest": chest, "full": h >= GIFT_CAP_H}

static func next_goal(g):
	var out := []
	var vc: int = g.chests.vic_count()
	var vn: int = g.chests.vicNeed
	if vc < vn: out.append({"k": float(vn - vc) / vn, "txt": str(vn - vc) + " ZAFER → ZAFER SANDIĞI", "page": "savas"})
	var id: String = g.meta.selectedChar
	var need = g.cards_for_next(id)
	var def = g.char_def(id)
	if need != null and def:
		var have: int = g.char_card_count(id)
		var nm: String = def.name
		var sv: int = g.char_level(id) + 1
		if have >= need:
			var gold: float = g.gold_for_next(id)
			var rub: float = g.read_rubies()
			if rub >= gold: out.append({"k": 0.0, "txt": nm + " SV " + str(sv) + " HAZIR · GELİŞTİR", "page": "kahraman", "hot": true})
			else: out.append({"k": 0.5 * (gold - rub) / gold, "txt": JS.s(gold - rub) + " ALTIN → " + nm + " SV " + str(sv), "page": "kahraman"})
		else:
			out.append({"k": float(need - have) / need, "txt": JS.s(need - have) + " KART → " + nm + " SV " + str(sv), "page": "kahraman"})
	var M := Ledger.mastery(g.meta, id)
	if not M.max: out.append({"k": 1 - M.frac, "txt": str(M.toNext) + " USTALIK → KADEME " + str(M.lv + 1), "page": "kahraman"})
	var A: Dictionary = g.account_progress()
	if A.need > 0: out.append({"k": 1 - float(A.cur) / A.need, "txt": JS.s(A.need - A.cur) + " XP → HESAP SV " + str(g.account_level() + 1), "page": "savas"})
	var dl := daily_left(g.meta)
	if dl > 0: out.append({"k": dl / 3.0 * 0.9, "txt": "GÜNLÜK HEDEF " + str(3 - dl) + "/3 → TAHTA SANDIK", "page": "savas", "daily": true})
	out.sort_custom(func(a, b): return a.k < b.k)
	return out[0] if out.size() else null

# ── D2 · KENDİ HAYALETİN ──
const GHOST_STEP := 4.0
const GHOST_N := 150
static var ghost_best = null
static var ghost_t := 0.0
static var ghost_n := 0
static var ghost_key := ""
static var _cur := PackedInt32Array()

static func ghost_begin(g) -> void:
	if g.towerRun: ghost_key = "tw"
	elif g.sealRun: ghost_key = "sl"
	elif g.nmRun: ghost_key = "nm" + str(g.worldId) + "-" + str(g.missionId)
	else: ghost_key = str(g.worldId) + "-" + str(g.missionId)
	var all: Dictionary = g.meta.get("ghost", {}) if g.meta.get("ghost") is Dictionary else {}
	ghost_best = all.get(ghost_key) if all.get(ghost_key) is Array else null
	ghost_t = 0
	ghost_n = 0
	_cur.resize(GHOST_N)
	_cur.fill(0)

static func ghost_tick(g, dt: float) -> void:
	ghost_t += dt
	while ghost_n < GHOST_N and ghost_t >= (ghost_n + 1) * GHOST_STEP:
		_cur[ghost_n] = mini(32767, JS.i(g.kills))
		ghost_n += 1

static func ghost_delta(g):
	if ghost_best == null or ghost_best.is_empty(): return null
	var i := mini(ghost_best.size() - 1, int(floor(ghost_t / GHOST_STEP)))
	if i < 1: return null
	return JS.i(g.kills) - JS.i(ghost_best[i])

static func ghost_end(g) -> bool:
	if not ghost_n: return false
	var fin := JS.i(g.kills)
	var prev := JS.i(ghost_best[ghost_best.size() - 1]) if ghost_best else -1
	if fin <= prev: return false
	if not (g.meta.get("ghost") is Dictionary): g.meta["ghost"] = {}
	var a := []
	for i in ghost_n: a.append(_cur[i])
	a.append(fin)
	g.meta.ghost[ghost_key] = a
	return prev >= 0

const SEASON := [
	{"n": "KIZIL AY DOĞAR", "l": "Mezarlıkta ilk kor yandı. Hasat başlıyor."},
	{"n": "KÜL YEMİNİ", "l": "Küllerden kalkan tarikat seni arıyor."},
	{"n": "BATAKTAKİ ÇAN", "l": "Sisin içinde bir çan çalıyor, kimse çalmıyor."},
	{"n": "CAM KATEDRAL", "l": "Kırık vitraylarda başka bir göğün ışığı."},
	{"n": "HİÇLİK KAPISI", "l": "Kapı aralandı. Ötesi seni tanıyor."},
	{"n": "KIZIL AY BATAR", "l": "Son hasat. Ay batmadan tırpanı kaldır."},
]

static func season_week() -> int:
	return int(floor(Clock.now() / 6048e5)) % SEASON.size()
