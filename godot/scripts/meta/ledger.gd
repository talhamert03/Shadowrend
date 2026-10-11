class_name Ledger
## ledger.js — Defter: yıldız · rekor · ustalık (birebir). meta.ledger {st, rec, mas}.

const STAR_GEM := 2
const STAR_RULES := [{"id": "win", "label": "ZAFER"}, {"id": "hp", "label": "CAN %50 ÜSTÜ"}, {"id": "fc", "label": "2 SAHA SANDIĞI"}]
const MASTERY_REQ := [0, 0, 250, 700, 1400, 2400, 3800, 5600, 7900, 10800, 14400]
const MASTERY_MAX := 10

static func _lv_reward(lv: int) -> Dictionary:
	return {"gold": 50 + lv * 40, "gem": 15 if lv == 5 else (40 if lv == 10 else 0)}

static func _book(meta: Dictionary) -> Dictionary:
	if not (meta.get("ledger") is Dictionary): meta["ledger"] = {}
	var L: Dictionary = meta.ledger
	if not L.get("st"): L["st"] = {}
	if not L.get("rec"): L["rec"] = {}
	if not L.get("mas"): L["mas"] = {}
	return L

static func mastery_level(xp: float) -> int:
	var lv := 1
	while lv < MASTERY_MAX and xp >= MASTERY_REQ[lv + 1]: lv += 1
	return lv

static func stars(meta: Dictionary, w: int, m: int) -> int:
	return JS.i(_book(meta).st.get(str(w) + "-" + str(m)))

static func total_stars(meta: Dictionary) -> int:
	var n := 0
	var s: Dictionary = _book(meta).st
	for k in s:
		if not String(k).ends_with("m"): n += JS.i(s[k])
	return n

static func world_stars(meta: Dictionary, w: int, per: int) -> int:
	var n := 0
	for m in range(1, per + 1): n += stars(meta, w, m)
	return n

static func mastery(meta: Dictionary, id: String) -> Dictionary:
	var xp := JS.i(_book(meta).mas.get(id))
	var lv := mastery_level(xp)
	var a: int = MASTERY_REQ[lv]
	var b: int = a if lv >= MASTERY_MAX else MASTERY_REQ[lv + 1]
	return {"xp": xp, "lv": lv, "max": lv >= MASTERY_MAX,
		"frac": 1.0 if lv >= MASTERY_MAX else float(xp - a) / maxf(1.0, b - a), "toNext": maxi(0, b - xp)}

static func on_run(g, won: bool) -> Dictionary:
	var L := _book(g.meta)
	var key := str(g.worldId) + "-" + str(g.missionId)
	var fc := maxi(0, (JS.i(g.fieldChests.opened) if g.fieldChests else 0) - JS.i(g._fc0))
	var side: bool = g.towerRun != null or g.sealRun != null or g.nmRun != null
	var got := [false, false, false] if side else [won, won and g._hpFloor >= 0.5, won and fc >= 2]
	var prevMask := JS.i(L.st.get(key + "m"))
	var mask := prevMask
	for i in 3:
		if got[i]: mask |= 1 << i
	var newMask := mask & ~prevMask
	var newCount := JS.bits(newMask)
	L.st[key + "m"] = mask
	L.st[key] = JS.bits(mask)
	var starGem := newCount * STAR_GEM
	var r: Dictionary
	if side: r = {"k": 0, "lv": 0}
	else:
		if not L.rec.get(key): L.rec[key] = {"k": 0, "lv": 0}
		r = L.rec[key]
	var kills := JS.i(g.kills)
	var lvl: int = g.player.level if g.player else 0
	var recKills: bool = not side and kills > r.k and r.k > 0
	var firstRec: bool = not side and r.k == 0 and kills > 0
	if kills > r.k: r.k = kills
	if lvl > r.lv: r.lv = lvl
	var cid: String = g.meta.selectedChar
	var before := mastery(g.meta, cid)
	var gain := JS.round_js(maxf(0.0, kills - JS.i(g._masK)) * 0.6 + (60 if won else 15) + (90 if (won and g.msn and g.msn.isBoss) else 0))
	L.mas[cid] = JS.i(L.mas.get(cid)) + gain
	g._masK = kills
	var after := mastery(g.meta, cid)
	var ups := []
	var gold := 0.0
	var gem := float(starGem)
	for lv in range(before.lv + 1, after.lv + 1):
		var rw := _lv_reward(lv)
		ups.append({"lv": lv, "gold": rw.gold, "gem": rw.gem})
		gold += rw.gold
		gem += rw.gem
	if gold: g.add_rubies(gold)
	if gem: g.add_stones(gem)
	g.save_meta()
	return {
		"side": side, "mask": mask, "newMask": newMask, "starGem": starGem, "total": total_stars(g.meta), "fc": fc,
		"rec": {"kills": kills, "best": r.k, "isNew": recKills, "first": firstRec},
		"mas": {"id": cid, "gain": gain, "before": before, "after": after, "ups": ups, "gold": gold, "gem": gem - starGem},
	}
