class_name Market
## market.js — Günlük kart pazarı (birebir).

## ── EKONOMİ (v3) ──
## Gelir ölçeği: görev ilk geçiş ~35–390 altın (dünya 1–2), tekrar ~%32'si, sandık 16–420.
## Kart fiyatları bu ölçeğe göre: sıradan kart ~2–3 zafer, efsanevi kart ~15–25 zafer. Kahramanlar
## asıl sandıktan çıkar; doğrudan açma (config CHARACTERS.price) bilerek çok pahalı.
## Eşya kartı birim fiyatı nadirlik SIRASINA göre (balance GEAR_RANK: 1,2,4,5,3 → sıra 1..5)
const GEAR_EACH := [0, 160, 300, 600, 1150, 2200]     # sıra → altın / kart
const HERO_EACH := [0, 220, 450, 950, 1900]          # kahraman nadirliği → altın / kart
const GEAR_OFFERS := 4                            # günlük eşya teklifi
const HERO_OFFERS := 2                            # günlük kahraman kartı teklifi

## new Date() yerel: yıl*1000 + (ay+1)*40 + gün
static func _day() -> int:
	var d := Time.get_datetime_dict_from_system()
	return int(d.year) * 1000 + int(d.month) * 40 + int(d.day)

static func _to_gem(gold: float) -> float:
	return maxf(2.0, ceil(gold / 10.0))

static func _gear_rank(it) -> int:
	var GR: Dictionary = D.RAW.get("balance", {}).get("GEAR_RANK", {}) if D.RAW else {}
	var r := JS.i(it.get("rarity")) if it else 1
	return clampi(int(GR.get(str(r), r)), 1, 5)

## günün tohumlu karıştırması (her gün farklı, gün içinde sabit)
static func _pick(arr: Array, n: int, seed: int) -> Array:
	var a := arr.duplicate()
	var rng := RandomNumberGenerator.new()
	rng.seed = seed
	for i in range(a.size() - 1, 0, -1):
		var j := rng.randi_range(0, i)
		var t = a[i]; a[i] = a[j]; a[j] = t
	return a.slice(0, mini(n, a.size()))

static func book(g) -> Dictionary:
	var m: Dictionary = g.meta
	if not m.get("mkt") or m.mkt.get("d") != _day(): m["mkt"] = {"d": _day(), "got": []}
	return m.mkt

## Günlük pazar: her gün yeni kahraman kartları (biri seçili kahramandan, diğerleri rastgele) +
## açılmamış bir kahramanın kilidi + rastgele eşya kartları (sahip olunmayanlar dahil)
static func offers(g) -> Array:
	var B := book(g)
	var day := int(B.d)
	var out := []
	var cid: String = g.meta.selectedChar
	var heroOffer := func(id: String, slot: String):
		var L: int = g.char_level(id) if g.owns_char(id) else 0
		if L >= D.CHAR_MAX_LEVEL: return null
		var C: Dictionary = D.CHARACTERS[id]
		var r := clampi(int(JS.num(C, "rarity", 1.0)), 1, 4)
		var req: float = D.CHAR_CARD_REQ[mini(L + 1, D.CHAR_CARD_REQ.size() - 1)]
		var n := maxf(1.0, JS.round_js(req * 0.25))
		var each := JS.round_js(HERO_EACH[r] * (1.0 + 0.2 * L))
		var price := n * each
		return {"slot": slot, "kind": "char", "id": id, "rar": r, "name": C.name, "n": n, "price": price, "gem": _to_gem(price), "got": B.got.has(slot)}
	var ids: Array = D.CHARACTERS.keys().filter(func(x): return g.char_level(x) < D.CHAR_MAX_LEVEL or not g.owns_char(x))
	var picks := [cid] if ids.has(cid) else []
	for x in _pick(ids.filter(func(x): return x != cid), HERO_OFFERS, day * 7 + 1): picks.append(x)
	for i in mini(HERO_OFFERS, picks.size()):
		var o = heroOffer.call(str(picks[i]), "h" + str(i + 1))
		if o: out.append(o)
	var locked := []
	for x in D.CHARACTERS:
		if not g.owns_char(x): locked.append(x)
	if locked.size():
		var id: String = _pick(locked, 1, day * 13 + 5)[0]
		var C: Dictionary = D.CHARACTERS[id]
		var r := JS.num(C, "rarity", 1.0)
		var k := 1.0                 # taban fiyat zaten yüksek; pazar kilidi aynı fiyattan
		var price := JS.round_js(JS.num(C, "price", 300.0) * k)
		var gem := JS.round_js((float(C.stonePrice) if JS.truthy(C.get("stonePrice")) else _to_gem(price)) * k)
		out.append({"slot": "h3", "kind": "char", "unlock": true, "id": id, "rar": r, "name": C.name, "n": 1, "price": price, "gem": gem, "got": B.got.has("h3")})
	# eşya: tüm eşyalardan günün seçkisi (azami seviyedekiler hariç); nadir olan daha seyrek gelir
	var pool := []
	for it in D.EQUIPMENT:
		if g.owns_gear(it.id) and g.gear_level(it.id) >= D.GEAR_MAX_LEVEL: continue
		var rk := _gear_rank(it)
		for w in maxi(1, 6 - rk): pool.append(it.id)
	var seen := {}
	var gi := 0
	for id in _pick(pool, pool.size(), day * 31 + 11):
		if seen.has(id): continue
		seen[id] = true
		var it = g.gear_by_id(id)
		var L: int = g.gear_level(id) if g.owns_gear(id) else 0
		var rk := _gear_rank(it)
		var req: float = D.GEAR_CARD_REQ[mini(L + 1, D.GEAR_CARD_REQ.size() - 1)] if L > 0 else 1.0
		var n := maxf(1.0, JS.round_js(req * 0.25))
		var each := JS.round_js(GEAR_EACH[rk] * (1.0 + 0.25 * L))
		var price := n * each
		gi += 1
		out.append({"slot": "g" + str(gi), "kind": "gear", "id": id, "rar": JS.num(it, "rarity", 1.0), "name": it.name, "icon": it.get("icon"),
			"n": n, "price": price, "gem": _to_gem(price), "got": B.got.has("g" + str(gi))})
		if gi >= GEAR_OFFERS: break
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
