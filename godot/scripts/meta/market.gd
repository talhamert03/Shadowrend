class_name Market
## market.js — Günlük kart pazarı (birebir).

const HERO_FLOOR := [0, 120, 240, 600, 1200]
const RAR_K := [0, 1, 1.4, 2.4, 3.6]

## new Date() yerel: yıl*1000 + (ay+1)*40 + gün
static func _day() -> int:
	var d := Time.get_datetime_dict_from_system()
	return int(d.year) * 1000 + int(d.month) * 40 + int(d.day)

static func _to_gem(gold: float) -> float:
	return maxf(2.0, ceil(gold / 12.0 * 1.15))

static func _offer(req: float, cost: float, hero: bool, cdef = null, L: int = 0) -> Dictionary:
	var n := maxf(1.0, JS.round_js(req * (0.2 if hero else 0.25)))
	var r := JS.i(cdef.get("rarity")) if cdef else 0
	if not r: r = 1
	var each: float
	if hero:
		each = maxf(HERO_FLOOR[r], JS.round_js(JS.num(cdef, "price", 200.0) * 0.2 * RAR_K[r] * (1 + 0.25 * L)))
	else:
		each = maxf(6.0, JS.round_js(cost / maxf(1.0, req) * 0.55))
	return {"n": n, "price": n * each, "gem": _to_gem(n * each)}

static func book(g) -> Dictionary:
	var m: Dictionary = g.meta
	if not m.get("mkt") or m.mkt.get("d") != _day(): m["mkt"] = {"d": _day(), "got": []}
	return m.mkt

static func offers(g) -> Array:
	var B := book(g)
	var out := []
	var cid: String = g.meta.selectedChar
	var heroOffer := func(id: String, slot: String):
		var L: int = g.char_level(id)
		if L >= D.CHAR_MAX_LEVEL: return null
		var o := _offer(D.CHAR_CARD_REQ[L + 1], D.CHAR_GOLD_COST[L + 1], true, D.CHARACTERS[id], L)
		return {"slot": slot, "kind": "char", "id": id, "rar": JS.num(D.CHARACTERS[id], "rarity", 1.0), "name": D.CHARACTERS[id].name,
			"n": o.n, "price": o.price, "gem": o.gem, "got": B.got.has(slot)}
	var h1 = heroOffer.call(cid, "h1")
	if h1: out.append(h1)
	var others := []
	for x in g.meta.get("charsOwned", []):
		if x != cid and D.CHARACTERS.has(x) and g.char_level(x) < D.CHAR_MAX_LEVEL: others.append(x)
	if others.size():
		var id: String = others[int(B.d) % others.size()]
		var h2 = heroOffer.call(id, "h2")
		if h2: out.append(h2)
	var locked := []
	for x in D.CHARACTERS:
		if not g.owns_char(x): locked.append(x)
	if locked.size():
		var id: String = locked[int(B.d) % locked.size()]
		var C: Dictionary = D.CHARACTERS[id]
		var r := JS.num(C, "rarity", 1.0)
		var k := 2 * (1 + 0.25 * r)
		var price := JS.round_js(JS.num(C, "price", 300.0) * k)
		var gem := JS.round_js((float(C.stonePrice) if JS.truthy(C.get("stonePrice")) else _to_gem(price)) * k)
		out.append({"slot": "h3", "kind": "char", "unlock": true, "id": id, "rar": r, "name": C.name, "n": 1, "price": price, "gem": gem, "got": B.got.has("h3")})
	var worn := []
	for v in g.char_gear_map().values():
		if v: worn.append(v)
	var pool := worn
	if pool.is_empty():
		pool = []
		for id in g.meta.get("owned", []):
			if g.gear_by_id(id): pool.append(id)
	var gs := []
	for id in pool:
		if g.gear_level(id) < D.GEAR_MAX_LEVEL: gs.append(id)
	gs.sort_custom(func(a, b): return g.gear_level(a) < g.gear_level(b))
	for i in mini(2, gs.size()):
		var id: String = gs[(i + int(B.d)) % gs.size()]
		var L: int = g.gear_level(id)
		var it = g.gear_by_id(id)
		var dup := false
		for o in out:
			if o.id == id: dup = true
		if dup: continue
		var o := _offer(D.GEAR_CARD_REQ[L + 1], D.GEAR_GOLD_COST[L + 1], false)
		out.append({"slot": "g" + str(i + 1), "kind": "gear", "id": id, "rar": JS.num(it, "rarity", 1.0), "name": it.name, "icon": it.get("icon"),
			"n": o.n, "price": o.price, "gem": o.gem, "got": B.got.has("g" + str(i + 1))})
	return out

static func buy(g, slot: String, cur: String):
	var B := book(g)
	var o = null
	for x in offers(g):
		if x.slot == slot: o = x
	if o == null or o.got: return null
	var ok: bool = g.spend_stones(o.gem) if cur == "gem" else g.spend_rubies(o.price)
	if not ok: return null
	o["cur"] = "gem" if cur == "gem" else "gold"
	if o.kind == "char": o["first"] = g.add_char_cards(o.id, o.n)
	else: g.add_gear_cards(o.id, o.n)
	B.got.append(slot)
	g.save_meta()
	return o

static func ms_left() -> float:
	var d := Time.get_datetime_dict_from_system()
	var secs: float = int(d.hour) * 3600 + int(d.minute) * 60 + int(d.second)
	return (86400.0 - secs) * 1000.0
