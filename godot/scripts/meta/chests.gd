class_name ChestSystem
extends RefCounted
## chests.js — Sandık sistemi (yuvalar · kilit · ücretsiz/zafer sandığı ·
## ödül zarı · efsane garantisi · olasılık beyanı), birebir. Açılış töreni
## UI tarafında (ui/chest_ceremony.gd).

const PITY_N := 40
const SKIP_FULL_RATIO := 0.8
const SKIP_CURVE := 0.8
const CHEST_SLOTS := 4
const KEY := "kh_chests"
const FREE_KEY := "kh_freechest"
const FREE_CHEST_CD := 6 * 60 * 60 * 1000.0
const BOSS_DROP := [["ahsap", 32, 0.0], ["yaygin", 27, 0.3], ["kemik", 24, 0.6], ["kan", 13, 1.2], ["kadim", 4, 2.0]]
const MISSION_DROP := [["ahsap", 44, 0.0], ["yaygin", 29, 0.3], ["kemik", 16, 0.6], ["kan", 8, 1.0], ["kadim", 3, 1.6]]
const GEAR_W := [0, 100, 46, 15, 2.2, 28]

static var CHESTS: Dictionary = {}

static func chests() -> Dictionary:
	if CHESTS.is_empty(): CHESTS = D.RAW.get("chests", {}).get("CHESTS", {})
	return CHESTS

static func rk(r) -> float:
	if r == null: return 0.0
	return 2.5 if int(r) == 5 else float(r)

static func rk_of(o) -> float:
	if o == null: return 0.0
	if o.get("kind") == "gear": return rk(o.get("rarity"))
	return JS.num(o, "rarity", 0.0)

static func is_legend(o) -> bool:
	return rk_of(o) >= 4

static func skip_cost(chest_type: String, remaining_ms: float) -> float:
	var C: Dictionary = chests()[chest_type]
	var total := maxf(1.0, C.time * 1000.0)
	var r := minf(1.0, maxf(0.0, remaining_ms) / total)
	var full := maxf(2.0, JS.round_js(JS.num(C, "stonePrice", 10.0) * SKIP_FULL_RATIO))
	return maxf(1.0, ceil(full * pow(r, SKIP_CURVE)))

static func _roll(table: Array, luck: float, boss: bool) -> String:
	var total := 0.0
	var w := []
	for row in table:
		var v: float = row[1] * (1 + maxf(0.0, luck) * row[2])
		if boss: v *= 0.35 if row[0] == "ahsap" else (0.8 if row[0] == "yaygin" else 1.7)
		total += v
		w.append([row[0], v])
	var r := randf() * total
	for x in w:
		r -= x[1]
		if r <= 0: return x[0]
	return "ahsap"

static func roll_boss_chest(luck: float = 0.0) -> String:
	return _roll(BOSS_DROP, luck, false)

static func roll_mission_chest(luck: float = 0.0, boss: bool = false) -> String:
	return _roll(MISSION_DROP, luck, boss)

static func fmt_dur(ms: float) -> String:
	var s := maxi(0, int(ceil(ms / 1000.0)))
	if s >= 3600: return str(s / 3600) + "sa " + str((s % 3600) / 60) + "dk"
	if s >= 60: return str(s / 60) + "dk " + ((str(s % 60) + "sn") if s % 60 else "")
	return str(s) + "sn"

var game
var slots: Array = []
var ceremonyActive := false
var _odds := {}
var _oddsRev := 0

func _init(g) -> void:
	game = g
	slots = load_slots()

func load_slots() -> Array:
	var raw = JSON.parse_string(Store.get_item(KEY, "null"))
	if not (raw is Array): return [null, null, null, null]
	var out := []
	for i in CHEST_SLOTS:
		var c = raw[i] if i < raw.size() else null
		if c is Dictionary and chests().has(c.get("t")):
			out.append({"t": c.t, "st": c.get("st", "locked") if c.get("st") else "locked", "at": JS.num(c, "at"), "ad": JS.truthy(c.get("ad")), "cut": JS.num(c, "cut")})
		else:
			out.append(null)
	return out

func save() -> void:
	Store.set_item(KEY, JSON.stringify(slots))

func tick() -> bool:
	var changed := false
	var now := Clock.now()
	for c in slots:
		if c and c.st == "unlocking" and now >= c.at:
			c.st = "ready"
			changed = true
		if c and c.st == "locked" and chests()[c.t].time == 0:
			c.st = "ready"
			changed = true
	if changed: save()
	return changed

func grant(type: String) -> bool:
	for i in CHEST_SLOTS:
		if slots[i] == null:
			var ready: bool = chests()[type].time == 0
			slots[i] = {"t": type, "st": "ready" if ready else "locked", "at": 0.0, "ad": false, "cut": 0.0}
			save()
			return true
	return false

func has_free_slot() -> bool:
	return slots.has(null)

func any_unlocking() -> bool:
	for c in slots:
		if c and c.st == "unlocking": return true
	return false

func lock_ms(i: int) -> float:
	var c = slots[i]
	if c == null: return 0.0
	return maxf(0.0, chests()[c.t].time * 1000.0 - JS.num(c, "cut"))

func start_unlock(i: int) -> bool:
	var c = slots[i]
	if c == null or c.st != "locked" or any_unlocking(): return false
	var ms := lock_ms(i)
	if ms <= 0:
		c.st = "ready"; c.at = 0.0
		save()
		return true
	c.st = "unlocking"
	c.at = Clock.now() + ms
	save()
	return true

var adBoostMs: float:
	get: return 30 * 60 * 1000.0

func can_ad_boost(i: int) -> bool:
	var c = slots[i]
	return c != null and not c.ad and c.st == "unlocking"

func apply_ad_boost(i: int) -> bool:
	var c = slots[i]
	if not can_ad_boost(i): return false
	c.ad = true
	if c.st == "unlocking":
		c.at -= adBoostMs
		if Clock.now() >= c.at:
			c.st = "ready"; c.at = 0.0
	else:
		c.cut = JS.num(c, "cut") + adBoostMs
		if lock_ms(i) <= 0:
			c.st = "ready"; c.at = 0.0
	save()
	return true

func skip_cost_for(i: int) -> float:
	var c = slots[i]
	if c == null: return 0.0
	if c.st == "ready": return 0.0
	if c.st == "unlocking": return skip_cost(c.t, c.at - Clock.now())
	return skip_cost(c.t, lock_ms(i))

func finish_with_stone(i: int, g) -> bool:
	var c = slots[i]
	if c == null or c.st != "unlocking": return false
	var cost := skip_cost_for(i)
	if not g.spend_stones(cost): return false
	c.st = "ready"; c.at = 0.0
	save()
	return true

func free_ready_in() -> float:
	var last := str(Store.get_item(FREE_KEY, "0")).to_float()
	return maxf(0.0, last + FREE_CHEST_CD - Clock.now())

func claim_free() -> bool:
	if free_ready_in() > 0: return false
	Store.set_item(FREE_KEY, JS.s(Clock.now()))
	return true

var vicNeed: int:
	get: return 5

func vic_count() -> int:
	return JS.i(str(Store.get_item("kh_vicchest", "0")).to_float())

func add_victory() -> void:
	Store.set_item("kh_vicchest", str(vic_count() + 1))

func claim_victory() -> void:
	Store.set_item("kh_vicchest", str(maxi(0, vic_count() - vicNeed)))

# ═══════════ ÖDÜL ZARI ═══════════

func roll_rewards(type: String) -> Array:
	var g = game
	var C: Dictionary = chests()[type]
	if JS.truthy(C.get("pureLegendary")):
		var heroPool := []
		for c in D.CHARACTERS.values():
			if JS.num(c, "rarity", 1.0) >= 4: heroPool.append(c)
		if heroPool.size() and randf() < 0.45:
			var fresh := []
			for c in heroPool:
				if not (g.owns_char(c.id) and g.char_level(c.id) >= D.CHAR_MAX_LEVEL): fresh.append(c)
			var src := fresh if fresh.size() else heroPool
			var ch = src[int(randf() * src.size())]
			if ch:
				var rr := JS.num(ch, "rarity", 4.0)
				return [{"kind": "char", "id": ch.id, "name": ch.name, "rarity": rr, "char": ch,
					"cards": D.charCardDrop(int(rr)), "isNew": not g.owns_char(ch.id)}]
		var pool := []
		for it in D.EQUIPMENT:
			if rk(it.rarity) >= 4: pool.append(it)
		var it = pool[int(randf() * pool.size())]
		return [{"kind": "gear", "id": it.id, "name": it.name, "icon": it.get("icon"), "rarity": it.rarity,
			"desc": it.get("desc"), "mods": it.mods, "cards": D.charCardDrop(int(it.rarity)), "isNew": not g.owns_gear(it.id)}]

	var out := []
	var rubies: float = C.rubies[0] + JS.round_js(randf() * (C.rubies[1] - C.rubies[0]))
	var gearN: int = int(C.gear[0] + JS.round_js(randf() * (C.gear[1] - C.gear[0])))
	if gearN > 0 and randf() > C.gearChance: gearN = 0
	for k in gearN:
		var wantHigh: bool = (type == "kadim" or JS.truthy(C.get("minTop"))) and k == 0
		var minR := JS.num(C, "minTop", 3.0)
		var pool := []
		for it in D.EQUIPMENT:
			if rk(it.rarity) > C.rarityMax: continue
			if wantHigh and rk(it.rarity) < minR: continue
			var dup := false
			for o in out:
				if o.get("id") == it.id: dup = true
			if dup: continue
			pool.append(it)
		if pool.is_empty():
			rubies += 25 + k * 20
			continue
		var it = _pick_weighted(pool, out)
		out.append({"kind": "gear", "id": it.id, "name": it.name, "icon": it.get("icon"),
			"rarity": it.rarity, "desc": it.get("desc"), "mods": it.mods, "cards": D.charCardDrop(int(it.rarity)),
			"isNew": not g.owns_gear(it.id)})
	if randf() < C.weaponChance:
		var locked := []
		for id in D.WEAPON_META:
			if D.WEAPON_META[id].unlock > 0 and not g.meta.weaponsOwned.has(id): locked.append(id)
		if locked.size() > 0:
			locked.sort_custom(func(a, b): return D.WEAPON_META[a].unlock < D.WEAPON_META[b].unlock)
			var id: String = locked[0]
			out.append({"kind": "weapon", "id": id, "name": D.WEAPONS[id].name, "icon": id, "rarity": 3, "desc": D.WEAPONS[id].get("descNew")})
		else:
			rubies += 40
	if JS.truthy(C.get("charChance")) and randf() < C.charChance:
		var has_leg := false
		for o in out:
			if is_legend(o): has_leg = true
		var ch = pick_drop_char(type, has_leg)
		if ch:
			var rr := JS.num(ch, "rarity", 1.0)
			out.append({"kind": "char", "id": ch.id, "name": ch.name, "rarity": rr, "char": ch,
				"cards": D.charCardDrop(int(rr)), "isNew": not g.owns_char(ch.id)})
		else:
			rubies += 60
	_stable_sort(out, func(a, b): return rk_of(a) - rk_of(b))
	if JS.truthy(C.get("stoneChance")) and randf() < C.stoneChance:
		var lo: float = C.stoneDrop[0]
		var hi: float = C.stoneDrop[1]
		var amt := minf(5.0, lo + JS.round_js(randf() * (hi - lo)))
		if amt > 0: out.push_front({"kind": "stone", "amount": amt, "name": "GEM", "icon": "stone", "rarity": 0, "desc": ""})
	out.push_front({"kind": "rubies", "amount": rubies, "name": "ALTIN", "icon": "ruby", "rarity": 0, "desc": ""})
	return out

func _pick_weighted(pool: Array, out: Array):
	var has_leg := false
	for o in out:
		if is_legend(o): has_leg = true
	var damp := 0.05 if has_leg else 1.0
	var tot := 0.0
	var ws := []
	for it in pool:
		var w: float = (GEAR_W[int(it.rarity)] if int(it.rarity) < GEAR_W.size() else 10.0) * (damp if rk(it.rarity) >= 4 else 1.0)
		if w == 0: w = 10.0
		tot += w
		ws.append(w)
	var r := randf() * tot
	for i in pool.size():
		r -= ws[i]
		if r <= 0: return pool[i]
	return pool[pool.size() - 1]

## JS Array.sort kararlıdır; Godot sort_custom değildir — sıra korunarak ekleme sıralaması.
static func _stable_sort(a: Array, cmp: Callable) -> void:
	for i in range(1, a.size()):
		var x = a[i]
		var j := i - 1
		while j >= 0 and cmp.call(a[j], x) > 0:
			a[j + 1] = a[j]
			j -= 1
		a[j + 1] = x

func pity_count() -> int:
	return maxi(0, JS.i(game.meta.get("pity")))

func pity_left() -> int:
	return maxi(1, PITY_N - pity_count())

func apply_pity(rewards: Array) -> Array:
	var g = game
	for r in rewards:
		if is_legend(r):
			g.meta["pity"] = 0
			g.save_meta()
			return rewards
	var n := pity_count() + 1
	if n < PITY_N:
		g.meta["pity"] = n
		g.save_meta()
		return rewards
	var leg = null
	var i := 0
	while i < 8 and leg == null:
		for r in roll_rewards("mistik"):
			if is_legend(r):
				leg = r
				break
		i += 1
	if leg:
		leg["pity"] = true
		rewards.append(leg)
		_stable_sort(rewards, func(a, b):
			var ma := -1 if (a.kind == "rubies" or a.kind == "stone") else 0
			var mb := -1 if (b.kind == "rubies" or b.kind == "stone") else 0
			var d := ma - mb
			return d if d != 0 else rk_of(a) - rk_of(b))
	g.meta["pity"] = 0
	g.save_meta()
	return rewards

func odds(type: String, N: int = 4000) -> Dictionary:
	var hit = _odds.get(type)
	if hit and hit.rev == _oddsRev: return hit
	var tiers := [0, 0, 0, 0, 0]
	var gem := 0
	var gemLo := 99.0
	var gemHi := 0.0
	var goldLo := 1e9
	var goldHi := 0.0
	var hero := 0
	var heroLeg := 0
	var weapon := 0
	for i in N:
		var rw := roll_rewards(type)
		var top := 0
		for r in rw:
			if r.kind == "rubies":
				goldLo = minf(goldLo, r.amount); goldHi = maxf(goldHi, r.amount)
				continue
			if r.kind == "stone":
				gem += 1
				gemLo = minf(gemLo, r.amount); gemHi = maxf(gemHi, r.amount)
				continue
			if r.kind == "char":
				hero += 1
				if is_legend(r): heroLeg += 1
			if r.kind == "weapon": weapon += 1
			var t := rk_of(r)
			var b := 4 if t >= 4 else (3 if t >= 3 else (2 if t >= 2 else (1 if t >= 1 else 0)))
			if b > top: top = b
		tiers[top] += 1
	var p := func(x): return float(x) / N
	var out := {
		"rev": _oddsRev, "n": N,
		"gold": [goldLo, goldHi] if goldHi else null,
		"gem": p.call(gem), "gemRange": [gemLo, gemHi] if gem else null,
		"hero": p.call(hero), "heroLeg": p.call(heroLeg), "weapon": p.call(weapon),
		"top": {"legend": p.call(tiers[4]), "epic": p.call(tiers[3]), "rare": p.call(tiers[2]), "common": p.call(tiers[1]), "none": p.call(tiers[0])},
	}
	_odds[type] = out
	return out

func invalidate_odds() -> void:
	_oddsRev += 1

func pick_drop_char(type: String, damp_legend: bool):
	var g = game
	var maxR := JS.num(chests()[type], "charRarityMax", 1.0)
	var pool := []
	var total := 0.0
	for id in D.CHARACTERS:
		var c: Dictionary = D.CHARACTERS[id]
		var r := int(JS.num(c, "rarity", 1.0))
		if r > maxR: continue
		var w := 10.0
		if r < D.CHAR_RARITIES.size() and D.CHAR_RARITIES[r] is Dictionary: w = JS.num(D.CHAR_RARITIES[r], "dropW", 10.0)
		if r >= 3: w *= 0.06 if damp_legend else 0.55
		if g.owns_char(id) and g.char_level(id) >= D.CHAR_MAX_LEVEL: w *= 0.12
		pool.append([c, w])
		total += w
	if pool.is_empty(): return null
	var rr := randf() * total
	for x in pool:
		rr -= x[1]
		if rr <= 0: return x[0]
	return pool[0][0]

func apply_rewards(rewards: Array) -> void:
	var g = game
	for r in rewards:
		match r.kind:
			"rubies": g.add_rubies(r.amount)
			"stone": g.add_stones(r.amount)
			"gear": g.add_gear_cards(r.id, r.cards if r.get("cards") else 1)
			"weapon":
				if not g.meta.weaponsOwned.has(r.id):
					g.meta.weaponsOwned.append(r.id)
					if g.meta.weaponsEquipped.size() < g.meta.weaponSlots: g.meta.weaponsEquipped.append(r.id)
			"char": g.add_char_cards(r.id, r.cards if r.get("cards") else 1)
	g.save_meta()
	invalidate_odds()
