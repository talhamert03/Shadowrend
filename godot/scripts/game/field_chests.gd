class_name FieldChests
extends RefCounted
## fieldChest.js — SAHA SANDIĞI (davranış + 2B ödül madalyonu), birebir.
## Görünüş: render3d (mağazanın 3B gümüş sandığı). Madalyon ve patlangaç
## gövdesi web'in kendi çizim kodundan PNG'ye pişirilir (assets/art/fieldchest).

const FIELD_CHEST := {
	"maxLive": 3, "first": [2.0, 18.0], "respawn": [35.0, 52.0], "openR": 84.0, "wakeR": 250.0,
	"gap": 1000.0, "fromPlayer": 640.0, "bombR": 420.0, "fuse": 0.8,
}
const REWARDS := [["magnet", 22], ["heal", 21], ["shield", 20], ["bomb", 18], ["gold", 19]]
const CHEST_REWARD := {
	"magnet": {"col": "#7cc8f0", "hi": "#d8f1ff", "mid": "#4f9fd6", "lo": "#1d4f7e", "label": "MIKNATIS"},
	"heal":   {"col": "#ff5a66", "hi": "#ffc2c6", "mid": "#ff3b4e", "lo": "#7a1020", "label": "CAN"},
	"shield": {"col": "#f0cf78", "hi": "#fff0c4", "mid": "#d9a642", "lo": "#6e4a14", "label": "KALKAN"},
	"bomb":   {"col": "#ff8a3c", "hi": "#ffd2a0", "mid": "#e0662a", "lo": "#5a1c10", "label": "PATLANGAÇ"},
	"gold":   {"col": "#f5c044", "hi": "#fff3c0", "mid": "#e8a930", "lo": "#7a4a0c", "label": "ALTIN"},
}
const POPS := 6
const MED_R := 27.0

static var _tex := {}

var game
var list: Array = []
var pops: Array = []
var timers := [0.0, 0.0, 0.0]
var _scratch: Array = []
var opened := 0
var gold := 0.0
var _armed := false

func _init(g) -> void:
	game = g
	for i in FIELD_CHEST.maxLive:
		list.append({"st": -1, "x": 0.0, "y": 0.0, "t": 0.0, "wake": 0.0, "seed": i * 1.7})
	for i in POPS:
		pops.append({"on": false, "kind": "", "x": 0.0, "y": 0.0, "x0": 0.0, "y0": 0.0, "t": 0.0, "amt": 0.0})

func reset() -> void:
	for c in list: c.st = -1
	for p in pops: p.on = false
	opened = 0
	gold = 0
	var f: Array = FIELD_CHEST.first
	timers[0] = f[0]; timers[1] = f[0] + 0.4; timers[2] = f[1]
	_armed = true

func _spot():
	var g = game
	var A = g.arena
	var p = g.player
	if not A: return null
	var lim: float = A.play / 2.0 - 230
	var O = g.objectives
	var npcOn: bool = O and (O.phase == "waiting" or O.phase == "escort")
	for k in 70:
		var x := (randf() * 2 - 1) * lim
		var y := (randf() * 2 - 1) * lim
		if p and JS.hypot(x - p.x, y - p.y) < FIELD_CHEST.fromPlayer: continue
		if g.props and g.props.blocked(x, y, 82): continue
		if npcOn and JS.hypot(x - O.npc.x, y - O.npc.y) < 340: continue
		if npcOn and O.phase == "escort" and JS.hypot(x - O.dest.x, y - O.dest.y) < 260: continue
		var ok := true
		for c in list:
			if c.st < 0: continue
			if JS.hypot(x - c.x, y - c.y) < FIELD_CHEST.gap:
				ok = false
				break
		if ok: return Vector2(x, y)
	return null

func update(dt: float) -> void:
	var g = game
	var p = g.player
	if not p or not g.arena: return
	for i in list.size():
		var c: Dictionary = list[i]
		if c.st < 0:
			timers[i] -= dt
			if timers[i] > 0: continue
			var s = _spot()
			if s == null:
				timers[i] = 2.0
				continue
			c.x = s.x; c.y = s.y; c.st = 0; c.t = 0.0; c.wake = 0.0
			continue
		c.t += dt
		var d := JS.hypot(p.x - c.x, p.y - c.y)
		if c.st == 0:
			var w := 1.0 if d < FIELD_CHEST.wakeR else 0.0
			c.wake += (w - c.wake) * minf(1.0, dt * 6)
			if d < FIELD_CHEST.openR + p.radius: _open(c)
		elif c.st == 1:
			if c.t >= 0.34:
				c.st = 2; c.t = 0.0
				_reward(c)
		elif c.st == 2:
			if c.t >= 1.7:
				c.st = 3; c.t = 0.0
		elif c.st == 3:
			if c.t >= 0.5:
				c.st = -1
				var r: Array = FIELD_CHEST.respawn
				timers[i] = r[0] + randf() * (r[1] - r[0])
	_upd_pops(dt)

func _open(c: Dictionary) -> void:
	c.st = 1; c.t = 0.0
	opened += 1
	Quality.haptic("crit")

func _pick(c: Dictionary) -> String:
	var g = game
	var p = g.player
	var tot := 0.0
	for r in REWARDS: tot += r[1]
	var x := randf() * tot
	var kind := "gold"
	for r in REWARDS:
		x -= r[1]
		if x <= 0:
			kind = r[0]
			break
	if kind == "heal" and p.hp > p.maxHp * 0.92: kind = "shield"
	if kind == "bomb":
		var near = g.enemies.query_circle(c.x, c.y, FIELD_CHEST.bombR, _scratch) if g.enemies else null
		if near == null or near.size() <= 2: kind = "gold"
	return kind

func _gold_amt() -> float:
	var g = game
	var w: int = g.worldId if g.worldId else 1
	var m: int = g.missionId if g.missionId else 1
	return JS.round_js((10 + w * 5) * (1 + (m - 1) * 0.06) * (0.85 + randf() * 0.3))

func _reward(c: Dictionary) -> void:
	var g = game
	var kind := _pick(c)
	var pop = null
	for q in pops:
		if not q.on:
			pop = q
			break
	g.audio.play("fieldchest")
	g.spawn_burst(c.x, c.y - 10, "#eef4ff", 22, 260, 3.6, 0.7, true)
	g.spawn_burst(c.x, c.y - 10, CHEST_REWARD[kind].col, 16, 200, 3.2, 0.65, true)
	g.pools.rings.take().setup(c.x, c.y, 130, 0.45, "#dfe8ff")
	if g.renderer3d: g.renderer3d.spawn_hit(c.x, c.y, 0, 1, 0.9, 0.94, 1.0)
	g.add_shake(0.06)
	if pop == null:
		_apply(kind, c.x, c.y, _gold_amt() if kind == "gold" else 0.0)
		return
	pop.on = true; pop.kind = kind; pop.t = 0.0
	pop.x0 = c.x; pop.x = c.x
	pop.y0 = c.y - 34; pop.y = c.y - 34
	pop.amt = _gold_amt() if kind == "gold" else 0.0

func _upd_pops(dt: float) -> void:
	var g = game
	var p = g.player
	for q in pops:
		if not q.on: continue
		q.t += dt
		if q.kind == "bomb":
			var u := minf(1.0, q.t / 0.42)
			q.x = q.x0 + u * 26
			q.y = q.y0 + 34 + 40 * u - sin(u * PI) * 58
			if q.t >= 0.42 + FIELD_CHEST.fuse:
				_boom(q.x, q.y)
				q.on = false
			continue
		if q.t < 0.55:
			var u: float = q.t / 0.55
			q.x = q.x0
			q.y = q.y0 - 58 * (1 - (1 - u) * (1 - u))
		else:
			var u := minf(1.0, (q.t - 0.55) / 0.3)
			var sx: float = q.x0
			var sy: float = q.y0 - 58
			var k := u * u
			q.x = sx + (p.x - sx) * k
			q.y = sy + (p.y - 20 - sy) * k
			if u >= 1:
				_apply(q.kind, p.x, p.y, q.amt)
				q.on = false

func _apply(kind: String, x: float, y: float, amt: float) -> void:
	var g = game
	var lab: Dictionary = CHEST_REWARD[kind]
	if kind == "gold":
		g.add_rubies(amt)
		gold += amt
		g.audio.play("coin")
		g.spawn_burst(x, y - 20, lab.col, 18, 220, 3.2, 0.6, true)
		g.spawn_text(x, y - 64, "+" + JS.s(amt) + " ALTIN", lab.col, 20, true)
		g.ui.refresh_wallet()
		return
	g.powerups.collect(kind)
	g.spawn_text(x, y - 64, lab.label, lab.col, 20, true)

func _boom(x: float, y: float) -> void:
	var g = game
	var R: float = FIELD_CHEST.bombR
	var out = g.enemies.query_circle(x, y, R + 30, _scratch) if g.enemies else []
	for e in out:
		if e.hp <= 0: continue
		var dx: float = e.x - x
		var dy: float = e.y - y
		var reach: float = R + e.radius
		if dx * dx + dy * dy > reach * reach: continue
		var dmg: float = e.maxHp * 0.07 if e.isBoss else (e.maxHp * 0.65 if e.elite else e.hp + 1)
		Combat.apply_hit(g, e, ceil(dmg), atan2(dy, dx), 420, 0, false)
	if g.props: g.props.damage_area(x, y, R * 0.7, 400)
	g.spawn_burst(x, y, "#fff2c8", 34, 460, 4, 0.6, true)
	g.spawn_burst(x, y, "#ff8a3c", 28, 380, 4.6, 0.65, true)
	g.spawn_burst(x, y, "#ffd45a", 20, 300, 3.6, 0.6, true)
	g.spawn_burst(x, y, "#5a1a10", 14, 200, 3.4, 0.7, false)
	g.pools.rings.take().setup(x, y, R * 1.08, 0.55, "#ffd08a")
	g.pools.rings.take().setup(x, y, R * 0.62, 0.4, "#fff2c8")
	if g.renderer3d: g.renderer3d.spawn_hit(x, y, 0, 2, 1, 0.7, 0.4)
	g.add_shake(0.24)
	g.add_kick(-PI / 2, 4)
	g.audio.play("blast")
	g.spawn_text(x, y - 80, "PATLANGAÇ!", "#ffb45a", 24, true)
	Quality.haptic("death")

static func _sprite(name: String) -> Texture2D:
	if _tex.has(name): return _tex[name]
	var p := "res://assets/art/fieldchest/" + name + ".png"
	var t: Texture2D = load(p) if ResourceLoader.exists(p) else null
	_tex[name] = t
	return t

## 2B: ödül madalyonu (dünya uzayı).
func render(ctx: Ctx2D) -> void:
	var g = game
	var t: float = g.time
	for q in pops:
		if not q.on: continue
		var lab: Dictionary = CHEST_REWARD[q.kind]
		var inU := minf(1.0, q.t / 0.24)
		var bo := 1 + 2.4 * pow(inU - 1, 3) + 1.4 * pow(inU - 1, 2) if inU < 1 else 1.0
		var fly := minf(1.0, (q.t - 0.55) / 0.3) if q.t > 0.55 else 0.0
		var s := 1.0 if q.kind == "bomb" else (0.35 + 0.83 * bo) * (1 - fly * 0.35)
		ctx.save()
		ctx.translate(q.x, q.y)
		if q.kind == "bomb":
			_draw_bomb(ctx, t, q.t)
			ctx.restore()
			continue
		var bob := 0.0 if fly else sin(q.t * 7) * 2.2
		ctx.translate(0, bob)
		ctx.scale(s, s)
		ctx.comp = "lighter"
		ctx.set_fill(lab.col)
		ctx.global_alpha = 0.16 * (1 - fly)
		ctx.save()
		ctx.rotate(t * 1.1)
		for k in 4:
			ctx.rotate(TAU / 4)
			ctx.begin_path(); ctx.move_to(0, 0); ctx.line_to(-7, -46); ctx.line_to(7, -46); ctx.close_path(); ctx.fill()
		ctx.restore()
		ctx.global_alpha = 0.3
		ctx.begin_path(); ctx.arc(0, 0, 31, 0, TAU); ctx.fill()
		ctx.comp = "source-over"
		ctx.global_alpha = 1
		ctx.draw_image(_sprite("medal_" + q.kind), -MED_R, -MED_R, MED_R * 2, MED_R * 2)
		ctx.comp = "lighter"
		var a := t * 2.6
		ctx.global_alpha = 0.85
		ctx.set_fill("#ffffff")
		ctx.begin_path(); ctx.arc(cos(a) * 22.5, sin(a) * 22.5, 1.8, 0, TAU); ctx.fill()
		var tw := 0.5 + 0.5 * sin(t * 5.3 + q.x)
		if tw > 0.15:
			var r := 2 + tw * 5
			ctx.global_alpha = tw
			ctx.begin_path()
			ctx.move_to(15, -21 - r); ctx.line_to(16, -21); ctx.line_to(15 + r, -20); ctx.line_to(16, -19)
			ctx.line_to(15, -19 + r - 1); ctx.line_to(14, -19); ctx.line_to(15 - r, -20); ctx.line_to(14, -21)
			ctx.close_path(); ctx.fill()
		ctx.comp = "source-over"
		ctx.global_alpha = 1
		ctx.restore()

func _draw_bomb(c: Ctx2D, t: float, age: float) -> void:
	var f := maxf(0.0, age - 0.42) / FIELD_CHEST.fuse
	var beat := 1 + sin(t * (14 + f * 30)) * 0.05 * (0.4 + f)
	c.scale(beat, beat)
	c.draw_image(_sprite("bomb_1" if f > 0.55 else "bomb_0"), -20, -22, 40, 40)
	c.line_width = 2; c.set_stroke("#6a5a40"); c.line_cap = "round"
	var fx := 8.5 - f * 5
	var fy := -21 + f * 3
	c.begin_path(); c.move_to(0, -18); c.quadratic_curve_to(3, -23, fx, fy); c.stroke()
	c.comp = "lighter"
	var sp := 0.6 + sin(t * 38) * 0.4
	c.set_fill("#ffc85a")
	c.global_alpha = 0.55 + sp * 0.4
	c.begin_path(); c.arc(fx, fy, 3.2 + sp * 2.2, 0, TAU); c.fill()
	c.global_alpha = 1
	c.set_fill("#fffadc")
	c.begin_path(); c.arc(fx, fy, 1.6, 0, TAU); c.fill()
	c.comp = "source-over"
