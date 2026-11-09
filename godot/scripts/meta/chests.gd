class_name ChestSystem
extends RefCounted
## chests.js — Sandık sistemi (yuvalar · kilit · ücretsiz/zafer sandığı ·
## ödül zarı · efsane garantisi · olasılık beyanı), birebir. Açılış töreni
## UI tarafında (ui/chest_ceremony.gd).

const PITY_N := 40
## sandık türüne göre efsane garantisi (kolay bulunan sandıklarda çok daha uzun)
const PITY_BY := {"ahsap": 150, "yaygin": 125, "kemik": 100, "kan": 75, "kadim": 50, "ejderha": 30, "mistik": 10}
## sandık iniş sesi: her türün kendine özgü tınısı (gümle + karakter sesi)
## sandık geliş sesi: her türe özel sentez stinger (assets/audio/sfx/chestland_<tür>_0.wav)
## sandık geliş eğrisi: yukarıdan düşüş + azalan 3 sekme → [yükseklik 0..1, ezilme -1..1, temas indeksi]
## t sn; düşüş 0.34 sn, sekmeler 0.30 / 0.22 / 0.15 sn (toplam ≈1.0 sn)
static func bounce(t: float) -> Array:
	var DROP := 0.34
	if t < DROP:
		var u := t / DROP
		return [1.0 - u * u, -0.08 * u, -1]
	var hs := [0.30, 0.13, 0.045]
	var ds := [0.30, 0.22, 0.15]
	var x := t - DROP
	for i in 3:
		if x < ds[i]:
			var u: float = x / ds[i]
			var h: float = hs[i] * 4.0 * u * (1.0 - u)
			# temasın hemen ardından ezilme (kısa)
			var sq: float = maxf(0.0, 1.0 - u * 5.0) * (0.9 - i * 0.28)
			return [h, sq, i]
		x -= ds[i]
	return [0.0, 0.0, 3]

static func pity_n(t: String) -> int:
	return int(PITY_BY.get(t, PITY_N))

static func land_sfx(g, t: String) -> void:
	g.audio.play("chestland_" + (t if t in ["ahsap", "yaygin", "kemik", "kan", "kadim", "mistik", "ejderha"] else "ahsap"))
## kahraman garantisi: bu kadar sandıkta epik+ / efsanevi kahraman çıkmazsa bir sonraki sandık verir
const HERO_EPIC_PITY := 24
const HERO_LEG_PITY := 75
const SKIP_FULL_RATIO := 0.8
const SKIP_CURVE := 0.8
const CHEST_SLOTS := 4
const KEY := "kh_chests"
const FREE_KEY := "kh_freechest"
const FREE_CHEST_CD := 6 * 60 * 60 * 1000.0
const BOSS_DROP := [["ahsap", 32, 0.0], ["yaygin", 27, 0.3], ["kemik", 24, 0.6], ["kan", 13, 1.2], ["kadim", 4, 2.0]]
const MISSION_DROP := [["ahsap", 42, 0.0], ["yaygin", 29, 0.3], ["kemik", 17, 0.6], ["kan", 9, 1.0], ["kadim", 3.5, 1.6]]
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
	if o and o.get("pack"): return false   # sahip olunan kahraman kart paketi garanti sayaçlarını sıfırlamaz
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
		var ch = pick_drop_char(type, has_leg, C.get("charOdds"))
		if ch:
			var rr := JS.num(ch, "rarity", 1.0)
			out.append({"kind": "char", "id": ch.id, "name": ch.name, "rarity": rr, "char": ch,
				"cards": D.charCardDrop(int(rr)), "isNew": not g.owns_char(ch.id)})
		else:
			rubies += 60
	for pk in hero_pack(type): out.append(pk)
	_stable_sort(out, func(a, b): return rk_of(a) - rk_of(b))
	if JS.truthy(C.get("stoneChance")) and randf() < C.stoneChance:
		var lo: float = C.stoneDrop[0]
		var hi: float = C.stoneDrop[1]
		var amt := minf(5.0, lo + JS.round_js(randf() * (hi - lo)))
		if amt > 0: out.push_front({"kind": "stone", "amount": amt, "name": "GEM", "icon": "stone", "rarity": 0, "desc": ""})
	out.push_front({"kind": "rubies", "amount": rubies, "name": "ALTIN", "icon": "ruby", "rarity": 0, "desc": ""})
	return out

## Kahraman kart paketi (denge v4): her sandık sahip olunan kahramanlara kart verir —
## ~%55 seçili kahramana, kalanı rastgele başka bir sahip olunan kahramana. Eskiden kahraman
## kartı yalnız düşük olasılıklı "kahraman düşmesi"nden geliyordu (ayda ~10 kart, 40 kahramana
## dağılarak) — ana kahraman bir ayda ancak Sv2-3 oluyordu. Hedef: 1. gün Sv2-3, 1. hafta Sv5, 1. ay Sv7.
func hero_pack(type: String) -> Array:
	var g = game
	var C: Dictionary = chests()[type]
	var hc = C.get("heroCards")
	if not (hc is Array) or hc.size() < 2: return []
	var n: int = int(hc[0]) + int(round(randf() * (float(hc[1]) - float(hc[0]))))
	if n <= 0: return []
	var open := func(id) -> bool: return D.CHARACTERS.has(id) and g.owns_char(id) and g.char_level(id) < D.CHAR_MAX_LEVEL
	var owned: Array = []
	for id in g.meta.charsOwned:
		if open.call(id): owned.append(id)
	if owned.is_empty(): return []
	var sel: String = str(g.meta.selectedChar)
	var parts := {}
	if open.call(sel):
		var main := int(round(n * 0.55)) if owned.size() > 1 else n
		parts[sel] = main
		n -= main
		owned.erase(sel)
	if n > 0:
		var other: String = owned[int(randf() * owned.size())] if owned.size() else sel
		if other != "" and open.call(other): parts[other] = int(parts.get(other, 0)) + n
	var out := []
	for id in parts:
		if int(parts[id]) <= 0: continue
		var ch: Dictionary = D.CHARACTERS[id]
		out.append({"kind": "char", "id": id, "name": ch.name, "rarity": JS.num(ch, "rarity", 1.0), "char": ch,
			"cards": int(parts[id]), "isNew": false, "pack": true})
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

func _pt() -> Dictionary:
	var g = game
	if not (g.meta.get("pityT") is Dictionary): g.meta["pityT"] = {}
	return g.meta["pityT"]

func pity_count(t: String = "") -> int:
	if t == "": return maxi(0, JS.i(game.meta.get("pity")))
	return maxi(0, JS.i(_pt().get(t, 0)))

func pity_left(t: String = "") -> int:
	return maxi(1, pity_n(t) - pity_count(t))

func apply_pity(rewards: Array, t: String = "") -> Array:
	var g = game
	hero_pity(rewards)
	var P := _pt()
	for r in rewards:
		if is_legend(r):
			P[t] = 0
			g.save_meta()
			return rewards
	var n := pity_count(t) + 1
	if n < pity_n(t):
		P[t] = n
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
	P[t] = 0
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
			if r.get("pack"): continue
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

func pick_drop_char(type: String, damp_legend: bool, odds_arr = null):
	var g = game
	# sandığa özgü nadirlik dağılımı: önce nadirlik zarı, sonra o nadirlikten kahraman
	if odds_arr is Array and odds_arr.size() >= 5:
		var w: Array = odds_arr.duplicate()
		if damp_legend: w[4] = float(w[4]) * 0.35
		var tot := 0.0
		for x in w: tot += float(x)
		var r := randf() * tot
		var want := 1
		for i in w.size():
			r -= float(w[i])
			if r <= 0.0:
				want = i
				break
		var c = _char_of_rarity(maxi(1, want))
		if c: return c
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

## o nadirlikten kahraman (maks seviyedekiler seyrek)
func _char_of_rarity(r: int):
	var g = game
	var pool := []
	var tot := 0.0
	for id in D.CHARACTERS:
		var c: Dictionary = D.CHARACTERS[id]
		if int(JS.num(c, "rarity", 1.0)) != r: continue
		var w := 0.12 if (g.owns_char(id) and g.char_level(id) >= D.CHAR_MAX_LEVEL) else 1.0
		pool.append([c, w]); tot += w
	if pool.is_empty(): return null
	var x := randf() * tot
	for e in pool:
		x -= e[1]
		if x <= 0.0: return e[0]
	return pool[0][0]

## kahraman garantisi sayaçları (meta.hpE / meta.hpL)
func hero_pity(rewards: Array) -> Array:
	var g = game
	var bestHero := 0
	for r in rewards:
		if r.get("kind") == "char" and not r.get("pack"): bestHero = maxi(bestHero, int(r.rarity))
	var e := JS.i(g.meta.get("hpE")) + 1
	var l := JS.i(g.meta.get("hpL")) + 1
	if bestHero >= 3: e = 0
	if bestHero >= 4: l = 0
	var force := 0
	if l >= HERO_LEG_PITY: force = 4
	elif e >= HERO_EPIC_PITY: force = 3
	if force > 0:
		var ch = _char_of_rarity(force)
		if ch:
			rewards.append({"kind": "char", "id": ch.id, "name": ch.name, "rarity": float(force), "char": ch,
				"cards": D.charCardDrop(force), "isNew": not g.owns_char(ch.id), "pity": true})
			e = 0
			if force == 4: l = 0
	g.meta["hpE"] = e
	g.meta["hpL"] = l
	return rewards

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
