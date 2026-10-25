class_name WorldEvents
extends RefCounted
## worldEvents.js — Dünya olayları (SUNAK · RUH SELİ · RÜZGÂR · ALTIN KAÇAK)
## + sunak 2.0 (KAN AHDİ · ŞİFA PINARI · MEYDAN), birebir.

const EV := [
	{"id": "altar", "name": "SUNAK BELİRDİ", "sub": "Halkaya gir ve bekle", "col": "#f0c77a", "w": 5},
	{"id": "xp",    "name": "RUH SELİ",      "sub": "18 sn tecrübe +%50",  "col": "#9fd8ff", "w": 3},
	{"id": "wind",  "name": "RÜZGÂR",        "sub": "14 sn hız +%18",       "col": "#bff2d0", "w": 2},
	{"id": "thief", "name": "ALTIN KAÇAK",   "sub": "Keseyle kaçıyor — 20 sn", "col": "#f5c044", "w": 3},
]
const THIEF_T := 20.0
const DUEL_N := 5
const DUEL_T := 25.0
const ALTAR_R := 88.0
const ALTAR_HOLD := 2.4
const ALTAR_LIFE := 30.0

var game
var next := 0.0
var altar := {}
var buff = null
var buffT := 0.0
var count := 0
var thief: Ent.Enemy = null
var thiefT := 0.0
var duel := {}

func _init(g) -> void:
	game = g
	reset()

func reset() -> void:
	next = 70 + randf() * 25
	altar = {"on": false, "x": 0.0, "y": 0.0, "t": 0.0, "hold": 0.0}
	buff = null; buffT = 0; count = 0
	thief = null; thiefT = 0
	duel = {"on": false, "x": 0.0, "y": 0.0, "t": 0.0, "left": 0, "tok": 0}

func on_kill(e: Ent.Enemy) -> void:
	var g = game
	if e.thief and e == thief:
		thief = null
		e.thief = false
		var amt := _gold() * 3
		g.add_rubies(amt)
		if g.fieldChests: g.fieldChests.gold += amt
		for i in 3: g.spawn_burst(e.x, e.y - 10, "#f5c044" if i else "#fff3c0", 16, 300, 3.4, 0.8, true)
		g.pools.rings.take().setup(e.x, e.y, 160, 0.5, "#f5c044")
		g.spawn_text(e.x, e.y - 70, "ALTIN YAĞMURU +" + JS.s(amt), "#f5c044", 20, true)
		g.audio.play("coin")
		g.ui.refresh_wallet()
	var Dl := duel
	if Dl.on and e.duelTok == Dl.tok:
		e.duelTok = 0
		Dl.left -= 1
		if Dl.left <= 0:
			Dl.on = false
			if g.fieldChests: g.fieldChests._reward({"x": e.x, "y": e.y})
			g.spawn_text(g.player.x, g.player.y - 90, "MEYDAN KAZANILDI", "#f0c77a", 20, true)
			g.audio.play("altar")

func _gold() -> float:
	var w: int = game.worldId if game.worldId else 1
	return JS.round_js((10 + w * 5) * (0.85 + randf() * 0.3))

func _spawn_marked(x = null, y = null):
	var g = game
	var E = g.enemies
	var before: int = E.pool.count
	E.spawn_one(E.weights, E.hpMul, E.dmgMul)
	if E.pool.count == before: return null
	var e: Ent.Enemy = E.pool.active[E.pool.count - 1]
	if e == null: return null
	if x != null:
		e.x = x; e.y = y
	return e

func _upd_thief(dt: float) -> void:
	var e := thief
	var g = game
	var p = g.player
	if e == null: return
	if e.hp <= 0 or not e.thief:
		thief = null
		return
	thiefT -= dt
	if thiefT <= 0:
		e.thief = false
		thief = null
		g.spawn_text(e.x, e.y - 50, "KAÇTI", "#b8b0c0", 15, true)
		g.spawn_burst(e.x, e.y, "#6e6478", 14, 200, 3, 0.6, false)
		return
	var st := 4 - int(ceil(4 * e.hp / e.maxHp))
	if st > e.thiefStep:
		e.thiefStep = st
		var amt := maxf(2.0, JS.round_js(_gold() / 3.0))
		g.add_rubies(amt)
		if g.fieldChests: g.fieldChests.gold += amt
		g.spawn_burst(e.x, e.y - 14, "#f5c044", 10, 220, 3, 0.5, true)
		g.spawn_text(e.x, e.y - 44, "+" + JS.s(amt), "#f5c044", 14, false)
		g.audio.play("coin")
	var dx: float = e.x - p.x
	var dy: float = e.y - p.y
	var d := JS.hypot(dx, dy)
	if d == 0: d = 1.0
	if d < 700:
		var k := e.speed * 1.6 * dt / d
		var F = g.props
		var ux := dx * k
		var uy := dy * k
		if F and F.blocked(e.x + ux * 6, e.y + uy * 6, e.radius):
			for t in [0.96, -0.96, 1.92, -1.92]:
				var c := cos(t)
				var s := sin(t)
				var vx := ux * c - uy * s
				var vy := ux * s + uy * c
				if not F.blocked(e.x + vx * 6, e.y + vy * 6, e.radius):
					ux = vx; uy = vy
					break
		e.x += ux; e.y += uy
	var A = g.arena
	if A:
		e.x = maxf(A.l + 40, minf(A.r - 40, e.x))
		e.y = maxf(A.t + 40, minf(A.b - 40, e.y))

func _eligible() -> bool:
	var g = game
	if g.towerRun or g.sealRun: return false
	if not g.meta.get("ftue") and not JS.i(g.progress.get(1, 0)): return false
	if g.is_boss_wave(g.wave): return false
	return true

func update(dt: float) -> void:
	var g = game
	var p = g.player
	if not p: return
	if buffT > 0:
		buffT -= dt
		if buffT <= 0: _end_buff()
	_upd_thief(dt)
	var Dl := duel
	if Dl.on:
		Dl.t += dt
		if Dl.t > DUEL_T:
			Dl.on = false
			Dl.tok = 0
			g.spawn_text(p.x, p.y - 90, "MEYDAN KAYBEDİLDİ", "#b8b0c0", 18, true)
	var A := altar
	if A.on:
		A.t += dt
		var dx: float = p.x - A.x
		var dy: float = p.y - A.y
		if dx * dx + dy * dy < ALTAR_R * ALTAR_R:
			A.hold += dt
			if A.hold >= ALTAR_HOLD: _bless_altar()
		else:
			A.hold = maxf(0.0, A.hold - dt * 1.5)
		if A.t > ALTAR_LIFE and A.on: A.on = false
	if not _eligible(): return
	next -= dt
	if next > 0 or A.on or buffT > 0 or thief or Dl.on: return
	next = 95 + randf() * 25
	var tot := 0.0
	for e in EV: tot += e.w
	var r := randf() * tot
	var E: Dictionary = EV[0]
	for e in EV:
		r -= e.w
		if r <= 0:
			E = e
			break
	_start(E)

func _start(E: Dictionary) -> void:
	var g = game
	var p = g.player
	count += 1
	if E.id == "altar":
		var O = g.objectives
		var a := randf() * PI * 2
		var d := 420.0 + randf() * 140.0
		var x: float = p.x + cos(a) * d
		var y: float = p.y + sin(a) * d
		if O:
			x = O.free_pos(x, y)
			y = O.get_free_y()
		altar.merge({"on": true, "x": x, "y": y, "t": 0.0, "hold": 0.0}, true)
	elif E.id == "xp":
		buff = "xp"; buffT = 18; p.xpMult += 0.5
	elif E.id == "wind":
		buff = "wind"; buffT = 14; p.speed *= 1.18
	elif E.id == "thief":
		var a := randf() * PI * 2
		var e = _spawn_marked(p.x + cos(a) * 520, p.y + sin(a) * 520)
		if e == null: return
		e.maxHp = JS.round_js(e.maxHp * 5); e.hp = e.maxHp; e.dmg = 0; e.xp = maxf(8.0, e.xp * 2)
		e.thief = true; e.thiefStep = 0; e.affixCol = "#f5c044"
		thief = e
		thiefT = THIEF_T
	g.audio.play("event")
	g.ui.event_banner(E.name, E.sub, E.col)

func _end_buff() -> void:
	var p = game.player
	if buff == "xp": p.xpMult -= 0.5
	elif buff == "wind": p.speed /= 1.18
	buff = null
	buffT = 0

func _bless_altar() -> void:
	var g = game
	var p = g.player
	var A := altar
	A.on = false
	g.spawn_burst(A.x, A.y, "#f0c77a", 26, 300, 3.4, 0.8, true)
	g.pools.rings.take().setup(A.x, A.y, ALTAR_R * 2.2, 0.6, "#f0c77a")
	g.audio.play("altar")
	var list := []
	if not p.noHeal and p.hp > p.maxHp * 0.35:
		list.append({"id": "blood", "name": "KAN AHDİ", "plus": "Hasar +%12 · kalıcı", "minus": "Canın %25'i gider", "col": "#ff5a6e"})
	list.append({"id": "spring", "name": "ŞİFA PINARI", "plus": "Ruh mıknatısı · hasar +%4" if p.noHeal else "Can +%35 · ruh mıknatısı", "minus": "Bedel yok", "col": "#8fd6a4"})
	list.append({"id": "duel", "name": "MEYDAN", "plus": "Saha sandığı ödülü", "minus": str(DUEL_N) + " elit · " + JS.s(DUEL_T) + " sn", "col": "#f0c77a"})
	g.ui._ldHold = true
	g.ui.show_bless_pick(list, _on_altar_pick,
		{"k": "SUNAK", "t": "BİR YOL SEÇ", "s": "Sunak üç bedel sunar · biri seçilir", "stamp": "KABUL", "cls": "bp2-altar", "label": "Sunak seçimi", "endSnd": "altar"})

func _on_altar_pick(b) -> void:
	game.ui._ldHold = false
	game.reset_clock()
	_altar_apply(b)

func _altar_apply(b) -> void:
	var g = game
	var p = g.player
	var A := altar
	if b == null: return
	if b.id == "blood":
		p.hp = maxf(1.0, JS.round_js(p.hp - p.maxHp * 0.25))
		p.dmgMult += 0.12
		g.spawn_burst(p.x, p.y, "#ff4d5e", 22, 260, 3.2, 0.7, true)
		g.spawn_text(p.x, p.y - 90, "KAN AHDİ · HASAR +%12", "#ff8a94", 18, true)
		g.ui.hurt_flash()
	elif b.id == "spring":
		if p.noHeal: p.dmgMult += 0.04
		else: p.hp = minf(p.maxHp, p.hp + JS.round_js(p.maxHp * 0.35))
		g.powerups.collect("magnet")
		g.spawn_burst(p.x, p.y, "#8fd6a4", 22, 240, 3.2, 0.7, true)
		g.spawn_text(p.x, p.y - 90, "ŞİFA PINARI", "#bff2d0", 18, true)
	else:
		var Dl := duel
		Dl.tok = JS.i(Dl.tok) + 1
		Dl.on = true; Dl.t = 0.0; Dl.left = 0; Dl.x = A.x; Dl.y = A.y
		for i in DUEL_N:
			var a := (float(i) / DUEL_N) * PI * 2
			var e = _spawn_marked(A.x + cos(a) * 330, A.y + sin(a) * 330)
			if e == null: continue
			if not e.elite:
				e.elite = true
				e.maxHp = JS.round_js(e.maxHp * 3.2); e.hp = e.maxHp; e.dmg *= 1.5; e.radius *= 1.28
			e.duelTok = Dl.tok
			e.affixCol = "#f0c77a"
			Dl.left += 1
		if not Dl.left:
			Dl.on = false
			return
		g.ui.event_banner("MEYDAN", str(Dl.left) + " elit · " + JS.s(DUEL_T) + " sn", "#f0c77a")
		g.audio.play("event")

## dünya uzayı — renderObjectiveArrow'dan önce
func render(ctx: Ctx2D) -> void:
	var e := thief
	if e and e.hp > 0:
		var t0: float = game.time
		game.ult._gring(Vector2(e.x, e.y), e.radius + 16.0, 10.0, Color(1, 0.78, 0.25), 0.55 + 0.45 * sin(t0 * 7), Ultimate.SQ, 28, 1.2)
	var A := altar
	if not A.on: return
	# sunağın kendisi 3B (render3d._update_altar); burada yalnız ZEMİN: altın rün çemberi + bekleme yayı
	var U: Ultimate = game.ult
	var t: float = game.time
	var fade := maxf(0.0, (ALTAR_LIFE - A.t) / 3.0) if A.t > ALTAR_LIFE - 3 else minf(1.0, A.t / 0.5)
	var c := Vector2(A.x, A.y)
	var gold := Color(1.0, 0.78, 0.4)
	var hk := clampf(A.hold / ALTAR_HOLD, 0.0, 1.0)
	U._ell(U._U, c, ALTAR_R + 6.0, ALTAR_R + 6.0, Color(0.08, 0.05, 0.02, 0.4 * fade), 40)
	U._rune_circle(c, ALTAR_R, gold, t * 0.5, fade * (0.75 + 0.25 * sin(t * 3.0)))
	U._glow(c, ALTAR_R * 0.9, gold, (0.18 + 0.35 * hk) * fade)
	if hk > 0.0:
		var P := PackedVector2Array()
		var n := maxi(2, int(48 * hk) + 1)
		for i in n:
			var an := -PI / 2.0 + TAU * hk * float(i) / (n - 1)
			P.append(c + Vector2(cos(an), sin(an)) * (ALTAR_R - 16.0))
		U._thick(U._GA, P, 9.0, Color(1, 0.92, 0.7, fade), false)
		U._thick(U._GA, P, 20.0, Color(1, 0.7, 0.3, 0.35 * fade), false)

func arrow(ctx: Ctx2D) -> void:
	var p = game.player
	var A = altar if altar.on else (thief if (thief and thief.hp > 0) else null)
	if A == null or not p: return
	var dx: float = A.x - p.x
	var dy: float = A.y - p.y
	var d := JS.hypot(dx, dy)
	if d < 260: return
	var a := atan2(dy, dx)
	var R := 96.0
	ctx.save()
	ctx.translate(p.x + cos(a) * R, p.y + 14 + sin(a) * R)
	ctx.rotate(a)
	ctx.set_fill("#f0c77a"); ctx.set_stroke("rgba(11,9,16,0.85)"); ctx.line_width = 3
	ctx.begin_path(); ctx.move_to(14, 0); ctx.line_to(-8, -9); ctx.line_to(-3, 0); ctx.line_to(-8, 9); ctx.close_path(); ctx.stroke(); ctx.fill()
	ctx.restore()
