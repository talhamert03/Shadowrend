class_name SideModes
## tower.js (SONSUZ KULE) + nightmare.js (KABUS DÖNGÜSÜ) + gearSets.js
## (EKİPMAN SETLERİ) — birebir.

# ═══════════ SONSUZ KULE ═══════════
const TOWER := {"bossEvery": 5, "checkpoint": 5, "hpK": 0.07, "dmgK": 0.04}

static func tower_book(meta: Dictionary) -> Dictionary:
	if not (meta.get("tower") is Dictionary): meta["tower"] = {"cur": 1, "best": 0, "paid": []}
	var T: Dictionary = meta.tower
	if not (JS.num(T, "cur") >= 1): T.cur = 1
	if not (T.get("paid") is Array): T.paid = []
	return T

static func floor_def(k: int, world_count: int, mpw: int) -> Dictionary:
	var w := 1 + ((k - 1) % world_count)
	var boss := k % int(TOWER.bossEvery) == 0
	var m := mpw if boss else 1 + ((k - 1) % maxi(1, mpw - 1))
	return {"k": k, "w": w, "m": m, "boss": boss}

static func tower_apply_wave(g) -> void:
	if not g.towerRun: return
	var E = g.enemies
	var k: int = g.towerRun.k
	if k <= 10: return
	var w: int = g.worldId
	var top := D.worldCurve(10)
	var cur := D.worldCurve(w)
	var hm: float = (top.hpMul / cur.hpMul) * (1 + TOWER.hpK * (k - 10))
	var bm: float = (top.bossHpMul / cur.bossHpMul) * (1 + TOWER.hpK * (k - 10))
	var dm: float = (top.dmgMul / cur.dmgMul) * (1 + TOWER.dmgK * (k - 10))
	if E.hpMul: E.hpMul *= hm
	if E.bossHpMul: E.bossHpMul *= bm
	if E.dmgMul: E.dmgMul *= dm

static func tower_floor_gold(k: int) -> float:
	return 40.0 + k * 8

static func tower_finish(g, won: bool) -> Dictionary:
	var T := tower_book(g.meta)
	var k: int = g.towerRun.k
	var gold := 0.0
	var gem := 0.0
	var milestone := false
	var prevBest: int = JS.i(T.best)
	if won:
		gold = tower_floor_gold(k)
		if k > T.best: T.best = k
		if k % 10 == 0 and not T.paid.has(k):
			T.paid.append(k)
			gem = 10.0 + k
			milestone = true
		T.cur = k + 1
	else:
		T.cur = maxi(1, int(floor((k - 1) / float(TOWER.checkpoint))) * int(TOWER.checkpoint) + 1)
	if gold: g.add_rubies(gold)
	if gem: g.add_stones(gem)
	g.save_meta()
	return {"k": k, "won": won, "gold": gold, "gem": gem, "milestone": milestone, "best": T.best, "isBest": won and k > prevBest, "next": T.cur}

# ═══════════ KABUS DÖNGÜSÜ ═══════════
const NM := {"hp": 1.30, "dmg": 1.20, "perWorld": 0.06, "elite": 1.6, "eliteMin": 0.06, "gold": 2.0, "gem": 8, "bossGem": 20, "frameAt": 10}

static func nm_book(meta: Dictionary) -> Dictionary:
	if not (meta.get("nm") is Dictionary): meta["nm"] = {"w": 1, "m": 1, "done": [], "clears": 0}
	var N: Dictionary = meta.nm
	if not (JS.num(N, "w") >= 1): N.w = 1
	if not (JS.num(N, "m") >= 1): N.m = 1
	if not (N.get("done") is Array): N.done = []
	N.clears = JS.i(N.get("clears"))
	return N

static func nm_open(progress: Dictionary, world_count: int, mpw: int) -> bool:
	return JS.i(progress.get(world_count, 0)) >= mpw

static func nm_has_frame(meta: Dictionary) -> bool:
	return nm_book(meta).clears >= NM.frameAt

static func nm_apply_wave(g) -> void:
	if not g.nmRun: return
	var E = g.enemies
	var w: int = g.worldId
	var top := D.worldCurve(10)
	var cur := D.worldCurve(w)
	var k: float = 1 + NM.perWorld * (w - 1)
	if E.hpMul: E.hpMul *= maxf(1.0, top.hpMul / cur.hpMul) * NM.hp * k
	if E.bossHpMul: E.bossHpMul *= maxf(1.0, top.bossHpMul / cur.bossHpMul) * NM.hp * k
	if E.dmgMul: E.dmgMul *= maxf(1.0, top.dmgMul / cur.dmgMul) * NM.dmg * k
	E.eliteChance = maxf(NM.eliteMin, E.eliteChance * NM.elite)

static func nm_finish(g, won: bool, mpw: int, world_count: int) -> Dictionary:
	var N := nm_book(g.meta)
	var w: int = g.worldId
	var m: int = g.missionId
	var key := str(w) + "-" + str(m)
	var gem := 0
	var first := false
	if won:
		if not N.done.has(key):
			N.done.append(key)
			first = true
			gem = NM.bossGem if m == mpw else NM.gem
			N.clears += 1
		if w == N.w and m == N.m:
			if m < mpw: N.m += 1
			elif w < world_count:
				N.w += 1
				N.m = 1
		if gem: g.add_stones(gem)
	g.save_meta()
	g.ui.set_nm_frame(nm_has_frame(g.meta))
	return {"w": w, "m": m, "won": won, "gem": gem, "first": first, "clears": N.clears, "frame": N.clears == NM.frameAt and first}

# ═══════════ EKİPMAN SETLERİ ═══════════
const RANK := {1: 1, 2: 2, 5: 3, 3: 4, 4: 5}
const GEAR_SETS := {
	1: {"name": "GEZGİN",  "col": "#b8a07a", "p2": {"magnetPct": 0.15}, "p4": {"speedPct": 0.04}, "l2": "Toplama menzili +%15", "l4": "Hareket hızı +%4"},
	2: {"name": "TUNÇ",    "col": "#d8a262", "p2": {"maxHp": 12}, "p4": {"regen": 0.8, "armor": 1}, "l2": "Can +12", "l4": "Can yenileme +0,8/sn · Zırh +1"},
	3: {"name": "AYAZ",    "col": "#7cc8f0", "p2": {"armor": 1}, "p4": {"dodge": 0.04, "maxHp": 10}, "l2": "Zırh +1", "l4": "Kaçınma +%4 · Can +10"},
	4: {"name": "YILDIRIM", "col": "#b48aff", "p2": {"atkPct": 0.06}, "p4": {"critChance": 0.05, "critMult": 0.2}, "l2": "Saldırı hızı +%6", "l4": "Kritik şansı +%5 · Kritik hasar +%20"},
	5: {"name": "KOR",     "col": "#ff8a3c", "p2": {"dmgPct": 0.06}, "p4": {"explodeChance": 0.06, "explodeDmgPct": 0.25}, "l2": "Hasar +%6", "l4": "Vuruşta patlama şansı +%6 · Patlama hasarı +%25"},
}

static func active_sets(items: Array) -> Array:
	var c := {}
	for it in items:
		if it:
			var r: int = RANK.get(int(it.rarity), 1)
			c[r] = c.get(r, 0) + 1
	var out := []
	for r in c:
		if c[r] >= 2: out.append({"r": r, "n": c[r], "S": GEAR_SETS[r], "on2": true, "on4": c[r] >= 4})
	out.sort_custom(func(a, b): return a.r > b.r)
	return out

static func apply_sets(player, items: Array) -> void:
	for A in active_sets(items):
		player.apply_mods(A.S.p2)
		if A.on4: player.apply_mods(A.S.p4)
