class_name Calendar
## calendar.js — Hafta etkinliği + HAFTALIK MÜHÜR (birebir, çevrimdışı).

const DAY := 864e5
const WEEK := 7 * DAY
const WEEK_EVENTS := [
	{"id": "kor",   "name": "KOR YAĞMURU",   "line": "Tüm görevlerde altın ×1,5", "col": "#d8a284"},
	{"id": "avci",  "name": "BOSS AVI",      "line": "Boss görevlerinde altın ×2", "col": "#ff6a5a"},
	{"id": "elit",  "name": "ELİT GECESİ",   "line": "Elit düşman ×1,6 sık · elit ganimeti artar", "col": "#cfd6e2"},
	{"id": "biyom", "name": "BİYOM HAFTASI", "line": "Seçili haritada altın ×2", "col": "#9fb4c9"},
]
const SEAL_RULES := [
	{"id": "cam",  "name": "CAM TOP",     "line": "Canın %60 · düşmanlar aynı"},
	{"id": "elit", "name": "ELİT SELİ",   "line": "Elit düşman üç kat sık"},
	{"id": "hiz",  "name": "HIZLI GECE",  "line": "Düşmanlar %20 hızlı"},
	{"id": "kuru", "name": "KAN KURUSU",  "line": "Can yenilenmez · can çalma kapalı"},
]
const SEAL_TIERS := [
	{"id": "bronz",  "name": "BRONZ",  "need": 450,  "reward": {"kind": "rubies", "amount": 180}, "col": "#c98a52"},
	{"id": "gumus",  "name": "GÜMÜŞ",  "need": 950,  "reward": {"kind": "stones", "amount": 12},  "col": "#cfd6e2"},
	{"id": "altin",  "name": "ALTIN",  "need": 1500, "reward": {"kind": "stones", "amount": 30},  "col": "#f0c77a"},
]

## new Date(2026, 0, 5) — yerel saatle pazartesi gece yarısı.
static func _epoch() -> float:
	var bias: float = Time.get_time_zone_from_system().get("bias", 0) * 60.0 * 1000.0
	var d := {"year": 2026, "month": 1, "day": 5, "hour": 0, "minute": 0, "second": 0}
	return Time.get_unix_time_from_datetime_dict(d) * 1000.0 - bias

static func week_index(now: float = 0.0) -> int:
	var t := now if now else Clock.now()
	return int(floor((t - _epoch()) / WEEK))

static func week_left(now: float = 0.0) -> float:
	var t := now if now else Clock.now()
	return _epoch() + (week_index(t) + 1) * WEEK - t

static func _hash(n: int) -> int:
	var x := (n * 2654435761) & 0xffffffff
	x ^= x >> 15
	x = Store._imul(x, 2246822519) & 0xffffffff
	x ^= x >> 13
	return x & 0xffffffff

static func current(world_count: int, now: float = 0.0) -> Dictionary:
	var t := now if now else Clock.now()
	var wi := week_index(t)
	var n := WEEK_EVENTS.size()
	var ev: Dictionary = WEEK_EVENTS[((wi % n) + n) % n]
	var day: int = Clock.date(t).weekday
	var featured := 1 + (_hash(wi + 77) % maxi(1, world_count))
	return {"ev": ev, "weekend": day == 0 or day == 6, "leftMs": week_left(t), "featured": featured, "week": wi}

static func gold_mul(g) -> float:
	var c := current(10)
	var k := 1.0
	if c.ev.id == "kor": k *= 1.5
	if c.ev.id == "avci" and g.msn and g.msn.isBoss: k *= 2
	if c.ev.id == "biyom" and g.worldId == c.featured: k *= 2
	if c.weekend: k *= 1.25
	if g.sealRun: k = 1.0
	return k

static func elite_mul() -> float:
	return 1.6 if current(10).ev.id == "elit" else 1.0

static func seal(progress: Dictionary, world_count: int) -> Dictionary:
	var wi := week_index()
	var h := _hash(wi)
	var open := 1
	for w in range(1, world_count + 1):
		if JS.i(progress.get(w, 0)) > 0 or w == 1: open = w
		else: break
	var w := 1 + (h % open)
	var m := 1 + ((h >> 5) % mini(4, maxi(1, JS.i(progress.get(w, 0)) + 1)))
	var rule: Dictionary = SEAL_RULES[(h >> 11) % SEAL_RULES.size()]
	return {"week": wi, "w": w, "m": m, "rule": rule}

static func book(meta: Dictionary) -> Dictionary:
	var wi := week_index()
	if not meta.get("seal") or meta.seal.get("wk") != wi:
		meta["seal"] = {"wk": wi, "best": 0, "got": [], "runs": 0}
	return meta.seal

static func score(g, won: bool) -> float:
	return JS.round_js(JS.i(g.kills) + JS.i(g.wave) * 45 + (400 if won else 0) + minf(300.0, g.time * 0.5))

static func finish(g, won: bool) -> Dictionary:
	var S := book(g.meta)
	var sc := score(g, won)
	var prev: float = S.best
	S.runs += 1
	if sc > S.best: S.best = sc
	var fresh := []
	for T in SEAL_TIERS:
		if S.best >= T.need and not S.got.has(T.id):
			S.got.append(T.id)
			fresh.append(T)
			if T.reward.kind == "rubies": g.add_rubies(T.reward.amount)
			else: g.add_stones(T.reward.amount)
	g.save_meta()
	return {"score": sc, "best": S.best, "isBest": sc > prev, "fresh": fresh}

static func apply_wave(g) -> void:
	var E = g.enemies
	if not E: return
	E.eliteChance = E.eliteChance * elite_mul()
	if not g.sealRun: return
	var r: String = g.sealRun.rule.id
	if r == "elit": E.eliteChance = maxf(0.05, E.eliteChance * 3)
	if g.wave == 1:
		if r == "hiz": E.speedMul = (E.speedMul if E.speedMul else 1.0) * 1.2
		var p = g.player
		if r == "cam":
			p.maxHp = maxf(10.0, JS.round_js(p.maxHp * 0.6))
			p.hp = p.maxHp
		if r == "kuru": p.noHeal = true
