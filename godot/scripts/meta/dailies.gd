class_name Dailies
extends RefCounted
## dailies.js — Günlük giriş (7 gün) + haftalık görevler + vitrin (birebir).
## Takvim YEREL gündür; gün anahtarı YYYY-MM-DD, hafta pazartesi başlar.

const DAILY_STREAK := [
	{"day": 1, "reward": {"kind": "rubies", "amount": 90}},
	{"day": 2, "reward": {"kind": "stone", "amount": 6}},
	{"day": 3, "reward": {"kind": "rubies", "amount": 180}},
	{"day": 4, "reward": {"kind": "chest", "chest": "yaygin"}},
	{"day": 5, "reward": {"kind": "rubies", "amount": 320}},
	{"day": 6, "reward": {"kind": "stone", "amount": 14}},
	{"day": 7, "reward": {"kind": "chest", "chest": "kan"}},
]
const WEEKLY_QUESTS := [
	{"id": "kills",      "label": "DÜŞMAN DEVİR",      "need": 400, "pts": 12, "reward": {"kind": "rubies", "amount": 260}},
	{"id": "missions",   "label": "GÖREV TAMAMLA",     "need": 6,   "pts": 12, "reward": {"kind": "rubies", "amount": 300}},
	{"id": "boss",       "label": "BOSS DEVİR",        "need": 2,   "pts": 14, "reward": {"kind": "stone",  "amount": 16}},
	{"id": "objectives", "label": "SAHA GÖREVİ BİTİR", "need": 4,   "pts": 12, "reward": {"kind": "rubies", "amount": 240}},
	{"id": "waves",      "label": "DALGA ATLAT",       "need": 40,  "pts": 10, "reward": {"kind": "rubies", "amount": 200}},
]
const WEEKLY_TIERS := [
	{"pts": 20, "reward": {"kind": "chest", "chest": "kemik"}},
	{"pts": 40, "reward": {"kind": "stone", "amount": 30}},
	{"pts": 60, "reward": {"kind": "chest", "chest": "mistik"}},
]
const WEEKLY_MAX_PTS := 60

static func _two(n: int) -> String:
	return ("0" if n < 10 else "") + str(n)

## Yerel tarih sözlüğünden gün anahtarı. ms verilmezse Clock.now().
static func day_key(ms: float = -1.0) -> String:
	var t := Clock.date(ms)
	return str(t.year) + "-" + _two(t.month) + "-" + _two(t.day)

static func _day_num(key: String) -> float:
	var p := key.split("-")
	if p.size() != 3: return NAN
	var d := {"year": p[0].to_int(), "month": p[1].to_int(), "day": p[2].to_int(), "hour": 0, "minute": 0, "second": 0}
	return floor(Time.get_unix_time_from_datetime_dict(d) / 86400.0)

static func day_gap(a: String, b: String) -> int:
	var x := _day_num(a)
	var y := _day_num(b)
	if is_nan(x) or is_nan(y): return 1
	return int(y - x)

## Yerel gece yarısının Clock ms'i (gün başı).
static func _local_midnight_ms(ms: float) -> float:
	var t := Clock.date(ms)
	var bias: float = Time.get_time_zone_from_system().get("bias", 0) * 60.0 * 1000.0
	var d := {"year": t.year, "month": t.month, "day": t.day, "hour": 0, "minute": 0, "second": 0}
	return Time.get_unix_time_from_datetime_dict(d) * 1000.0 - bias

static func week_key(ms: float = -1.0) -> String:
	if ms < 0: ms = Clock.now()
	var t := Clock.date(ms)
	var wd: int = (int(t.weekday) + 6) % 7
	return "H" + day_key(ms - wd * 86400000.0)

static func week_left_ms(ms: float = -1.0) -> float:
	if ms < 0: ms = Clock.now()
	var t := Clock.date(ms)
	var wd: int = (int(t.weekday) + 6) % 7
	var mid := _local_midnight_ms(ms)
	var end := mid + (7 - wd) * 86400000.0
	return maxf(0.0, end - ms)

static func normalize_quests(q) -> Dictionary:
	var s: Dictionary = q if q is Dictionary else {}
	var prog := {}
	for def in WEEKLY_QUESTS:
		var v = s.get("prog", {}).get(def.id, 0) if s.get("prog") is Dictionary else 0
		prog[def.id] = maxi(0, mini(int(def.need) * 9, JS.i(v)))
	var slot := maxi(1, mini(7, JS.i(s.get("slot")) if JS.i(s.get("slot")) else 1))
	var claimed := []
	if s.get("claimed") is Array:
		for x in s.claimed:
			if x is String: claimed.append(x)
	var tiers := []
	if s.get("tiers") is Array:
		for x in s.tiers:
			if (x is float or x is int) and not is_nan(float(x)): tiers.append(int(x))
	var mk = s.get("makeup")
	return {
		"day": s.day if s.get("day") is String else "",
		"claimDay": s.claimDay if s.get("claimDay") is String else "",
		"slot": slot,
		"cycle": maxi(1, JS.i(s.get("cycle")) if JS.i(s.get("cycle")) else 1),
		"makeup": maxi(0, mini(1, 1 if mk == null else JS.i(mk))),
		"makeupUsed": s.makeupUsed if s.get("makeupUsed") is String else "",
		"week": s.week if s.get("week") is String else "",
		"prog": prog,
		"claimed": claimed,
		"tiers": tiers,
	}

var game

func _init(g) -> void:
	game = g
	if not game.meta.get("quests"): game.meta["quests"] = normalize_quests(null)
	touch()

var q: Dictionary:
	get: return game.meta.quests

func touch() -> void:
	var Q := q
	var dirty := false
	var today := day_key()
	if Q.week != week_key():
		for def in WEEKLY_QUESTS: Q.prog[def.id] = 0
		Q.claimed = []
		Q.tiers = []
		Q.makeup = 1
		Q.week = week_key()
		dirty = true
	if Q.day != today:
		var gap := day_gap(Q.day, today) if Q.day != "" else 1
		var claimedPrev: bool = Q.claimDay != "" and Q.claimDay == Q.day
		if claimedPrev:
			if gap == 1: _advance()
			elif Q.makeup > 0:
				Q.makeup = 0
				Q.makeupUsed = today
				_advance()
			else:
				Q.slot = 1
				Q.cycle += 1
		elif gap > 1 and Q.makeup <= 0:
			Q.slot = 1
		Q.day = today
		dirty = true
	if dirty: game.save_meta()

func _advance() -> void:
	var Q := q
	if Q.slot >= 7:
		Q.slot = 1
		Q.cycle += 1
	else:
		Q.slot += 1

func today_slot() -> Dictionary:
	return DAILY_STREAK[maxi(0, mini(6, int(q.slot) - 1))]

func claimed_today() -> bool:
	return q.claimDay != "" and q.claimDay == day_key()

func used_makeup_today() -> bool:
	return q.makeupUsed == day_key()

func claim_daily():
	if claimed_today(): return null
	var slot := today_slot()
	q.claimDay = day_key()
	game.save_meta()
	return slot.reward

func points() -> int:
	var p := 0
	for def in WEEKLY_QUESTS:
		if done(def): p += def.pts
	return p

func prog(def: Dictionary) -> int:
	return mini(def.need, JS.i(q.prog.get(def.id)))

func done(def: Dictionary) -> bool:
	return JS.i(q.prog.get(def.id)) >= def.need

func claimed_quest(id: String) -> bool:
	return q.claimed.has(id)

func add(id: String, n: float) -> void:
	if not (n > 0): return
	var def = null
	for d in WEEKLY_QUESTS:
		if d.id == id: def = d
	if def == null: return
	var cur := JS.i(q.prog.get(id))
	if cur >= def.need: return
	q.prog[id] = mini(def.need, cur + int(floor(n)))

func claim_quest(id: String):
	var def = null
	for d in WEEKLY_QUESTS:
		if d.id == id: def = d
	if def == null or not done(def) or claimed_quest(id): return null
	q.claimed.append(id)
	game.save_meta()
	return def.reward

func tier_ready(i: int) -> bool:
	if i < 0 or i >= WEEKLY_TIERS.size(): return false
	return points() >= WEEKLY_TIERS[i].pts and not q.tiers.has(i)

func claim_tier(i: int):
	if not tier_ready(i): return null
	q.tiers.append(i)
	game.save_meta()
	return WEEKLY_TIERS[i].reward

func pending() -> bool:
	if not claimed_today(): return true
	for def in WEEKLY_QUESTS:
		if done(def) and not claimed_quest(def.id): return true
	for i in WEEKLY_TIERS.size():
		if tier_ready(i): return true
	return false
