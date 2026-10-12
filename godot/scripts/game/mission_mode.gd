class_name MissionMode
extends RefCounted
## missionTypes.js — Görev türleri (HAYATTA KAL · SAVUN · AV · KAÇIŞ) +
## boss kuşatması (Dünya 5 ve 10). Çizim: overlay2d.gd (dünya uzayı).

const MTYPE := {
	"survive": {"name": "HAYATTA KAL", "col": "#cfd6e2"},
	"defend":  {"name": "SAVUN",       "col": "#9ff2c4"},
	"hunt":    {"name": "AV",          "col": "#ff8a4a"},
	"escape":  {"name": "KAÇIŞ",       "col": "#9fd8ff"},
}
const SIEGE_R0 := 1300.0
const SIEGE_R1 := 620.0
const SIEGE_T := 5.0
const SIEGE_COL := "#ff5a6e"
const TOTEM_HP := 100.0
const TOTEM_R := 70.0
const ESC_R0 := 1500.0
const ESC_R1 := 150.0
const ESC_T := 40.0

var game
var _sc: Array = []
var type := "survive"
var done := true
var over := false
var totem := {}
var prey: Ent.Enemy = null
var preyDone := false
var esc := {}
var siege := {}
var _placed := false

func _init(g) -> void:
	game = g
	begin("survive")

func begin(t: String) -> void:
	type = t if t else "survive"
	done = type == "survive" or type == "defend"
	over = false
	totem = {"on": false, "x": 0.0, "y": 0.0, "hp": TOTEM_HP, "hit": 0.0}
	prey = null
	preyDone = false
	esc = {"on": false, "x": 0.0, "y": 0.0, "r": ESC_R0, "t": 0.0, "burn": 0.0}
	siege = {"on": false, "x": 0.0, "y": 0.0, "r": SIEGE_R0, "t": 0.0, "burn": 0.0}
	_placed = false

func _spot(x: float, y: float) -> Vector2:
	var O = game.objectives
	if O:
		var nx: float = O.free_pos(x, y)
		return Vector2(nx, O.get_free_y())
	return Vector2(x, y)

func on_wave(w: int) -> void:
	var g = game
	var p = g.player
	var M: Dictionary = g.msn
	if M and M.isBoss and (M.world == 5 or M.world == 10) and not g.towerRun and not g.sealRun and g.is_boss_wave(w) and not siege.on:
		siege.merge({"on": true, "x": p.x, "y": p.y, "r": SIEGE_R0, "t": 0.0, "burn": 0.0}, true)
		g.ui.event_banner("KUŞATMA", "Halka kapanıyor — kaçış yok", SIEGE_COL)
	if type == "defend" and not totem.on:
		var s := _spot(p.x, p.y - 120)
		totem.merge({"on": true, "x": s.x, "y": s.y, "hp": TOTEM_HP, "hit": 0.0}, true)
		g.ui.event_banner("TOTEMİ SAVUN", "Düşmanlar totemi aşındırır — yanında kal", MTYPE.defend.col)
	if type == "hunt" and not preyDone and w >= 2 and not (prey and prey.hp > 0 and prey.prey):
		_spawn_prey(w == 2)
	if type == "escape" and w >= g.msn.waves and not esc.on:
		var a := randf() * PI * 2
		var s := _spot(p.x + cos(a) * 900, p.y + sin(a) * 900)
		esc.merge({"on": true, "x": s.x, "y": s.y, "r": ESC_R0, "t": 0.0, "burn": 0.0}, true)
		g.ui.event_banner("KAÇIŞ YOLU AÇILDI", "Halka daralıyor — çıkışa koş", MTYPE.escape.col)
		g.audio.play("event")

func _spawn_prey(first: bool) -> void:
	var g = game
	var E = g.enemies
	var before: int = E.pool.count
	E.spawn_one(E.weights, E.hpMul, E.dmgMul)
	if E.pool.count == before: return
	var e: Ent.Enemy = E.pool.active[E.pool.count - 1]
	if e == null: return
	if not e.elite:
		e.elite = true
		e.maxHp = JS.round_js(e.maxHp * 3.2)
		e.dmg *= 1.5
		e.radius *= 1.28
		e.knockRes *= 0.6
	e.maxHp = JS.round_js(e.maxHp * 2.2)
	e.hp = e.maxHp
	e.xp = maxf(20.0, e.xp * 4)
	e.prey = true
	e.affixCol = MTYPE.hunt.col
	prey = e
	if first: g.ui.event_banner("AV BAŞLADI", "Kaçan elit haritada — bul ve devir", MTYPE.hunt.col)

func on_kill(e: Ent.Enemy) -> void:
	if e and e.prey and e == prey:
		preyDone = true
		done = true
		prey = null
		e.prey = false
		var g = game
		g.spawn_text(e.x, e.y - 60, "AV DÜŞTÜ", MTYPE.hunt.col, 22, true)
		g.audio.play("altar")
		if over: g.mission_complete()

func can_finish() -> bool:
	if done: return true
	if not over:
		over = true
		var g = game
		g.ui.event_banner("AV KAÇIYOR" if type == "hunt" else "ÇIKIŞA KOŞ",
			"Av artık durdu — izini takip et" if type == "hunt" else "Halka kapanıyor", MTYPE[type].col)
	return false

func update(dt: float) -> void:
	var g = game
	var p = g.player
	if not p or g.state != "playing": return
	var T := totem
	if type == "defend" and not T.on and T.hp <= 0 and not g._dying:
		T.on = true
		T.hp = TOTEM_HP * 0.5
	if T.on:
		var out = g.enemies.query_circle(T.x, T.y, 460, _sc)
		var near := 0
		for i in out.size():
			var e: Ent.Enemy = out[i]
			if e.hp <= 0 or e.isBoss: continue
			var dx: float = T.x - e.x
			var dy: float = T.y - e.y
			var d := JS.hypot(dx, dy)
			if d == 0: d = 1.0
			if d < TOTEM_R + e.radius:
				near += 1
				continue
			if i % 3 == 0:
				var k := e.speed * 0.45 * dt / d
				e.x += dx * k
				e.y += dy * k
		if near:
			T.hp -= near * 1.6 * dt
			T.hit = 0.25
		if T.hit > 0: T.hit -= dt
		if T.hp <= 0:
			T.on = false
			g.spawn_burst(T.x, T.y, "#9ff2c4", 30, 300, 4, 0.8, true)
			g.audio.play("objfail")
			g.game_over()
			return
	var e := prey
	if e:
		if e.hp <= 0 or not e.prey:
			prey = null
		elif not over:
			var dx: float = e.x - p.x
			var dy: float = e.y - p.y
			var d := JS.hypot(dx, dy)
			if d == 0: d = 1.0
			if d < 700:
				var k := e.speed * 1.55 * dt / d
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
				e.x += ux
				e.y += uy
			var A = g.arena
			if A:
				e.x = maxf(A.l + 40, minf(A.r - 40, e.x))
				e.y = maxf(A.t + 40, minf(A.b - 40, e.y))
		else:
			e.speed = minf(e.speed, 20.0)
	var Q := siege
	if Q.on:
		Q.t += dt
		var u := minf(1.0, Q.t / SIEGE_T)
		Q.r = SIEGE_R0 + (SIEGE_R1 - SIEGE_R0) * (1 - (1 - u) * (1 - u))
		for b in g.enemies.pool.active:
			if not b.isBoss or b.hp <= 0: continue
			var bx: float = b.x - Q.x
			var by: float = b.y - Q.y
			var bd := JS.hypot(bx, by)
			var lim: float = Q.r - b.radius - 20
			if bd > lim and bd > 0:
				b.x = Q.x + bx / bd * lim
				b.y = Q.y + by / bd * lim
		var dx: float = p.x - Q.x
		var dy: float = p.y - Q.y
		if dx * dx + dy * dy > Q.r * Q.r and p.invuln <= 0:
			Q.burn += dt
			if Q.burn > 0.5:
				Q.burn = 0.0
				p.hp -= maxf(1.0, JS.round_js(p.maxHp * 0.04))
				g.spawn_text(p.x, p.y - 30, "KUŞATMA", SIEGE_COL, 13, false)
				g.ui.hurt_flash()
				if p.hp <= 0: g.game_over()
		else:
			Q.burn = 0.0
	var S := esc
	if S.on:
		S.t += dt
		S.r = ESC_R1 + (ESC_R0 - ESC_R1) * maxf(0.0, 1 - S.t / ESC_T)
		var dx: float = p.x - S.x
		var dy: float = p.y - S.y
		var d := JS.hypot(dx, dy)
		if d < 80:
			S.on = false
			done = true
			g.spawn_burst(S.x, S.y, "#9fd8ff", 30, 320, 4, 0.8, true)
			g.audio.play("delivered")
			g.mission_complete()
			return
		if d > S.r and p.invuln <= 0:
			S.burn += dt
			if S.burn > 0.5:
				S.burn = 0.0
				p.hp -= maxf(1.0, JS.round_js(p.maxHp * 0.05))
				g.spawn_text(p.x, p.y - 30, "HALKA", "#9fd8ff", 13, false)
				if p.hp <= 0: g.game_over()

func arrow_target():
	if esc.on: return esc
	if over and prey and prey.hp > 0: return prey
	return null

# ═══════════ ÇİZİM (2B üst katman, dünya uzayı) ═══════════

func render(ctx: Ctx2D) -> void:
	var g = game
	var t: float = g.time
	# v63 İ2 telegraf: lordun hücum hazırlığında yön şeridi
	for b in g.enemies.pool.active:
		if not b.isBoss or b.state != "windup" or b.bossKind == "ejder": continue
		var L := 520.0
		var k := clampf(1 - b.stateT / 0.62, 0, 1)
		ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(atan2(b.diry, b.dirx))
		ctx.set_fill(Color(1, 59 / 255.0, 78 / 255.0, snappedf(0.12 + 0.18 * k, 0.001))); ctx.fill_rect(0, -b.radius * 0.7, L, b.radius * 1.4)
		ctx.set_fill("rgba(255,59,78,0.55)"); ctx.fill_rect(0, -2, L * k, 4)
		ctx.restore()
	var T := totem
	if T.get("on"):
		ctx.save(); ctx.translate(T.x, T.y)
		ctx.save(); ctx.scale(1, 0.62)
		ctx.set_stroke("rgba(159,242,196,0.55)"); ctx.line_width = 3; ctx.line_dash = [10, 8]; ctx.line_dash_offset = -t * 20
		ctx.begin_path(); ctx.arc(0, 0, TOTEM_R, 0, TAU); ctx.stroke(); ctx.line_dash = []; ctx.restore()
		var sh: float = sin(t * 60) * 2 if T.hit > 0 else 0.0
		ctx.set_fill("#2a2230"); ctx.set_stroke("#0b0910"); ctx.line_width = 3
		ctx.begin_path(); ctx.move_to(-16 + sh, 4); ctx.line_to(16 + sh, 4); ctx.line_to(10 + sh, -58); ctx.line_to(-10 + sh, -58); ctx.close_path(); ctx.fill(); ctx.stroke()
		ctx.set_fill("#9ff2c4"); ctx.begin_path(); ctx.arc(sh, -40, 6 + sin(t * 3) * 1.5, 0, TAU); ctx.fill()
		var k := maxf(0.0, T.hp / TOTEM_HP)
		ctx.set_fill("rgba(11,9,16,0.85)"); ctx.fill_rect(-30, -78, 60, 7)
		ctx.set_fill("#9ff2c4" if k > 0.35 else "#ff4d5e"); ctx.fill_rect(-29, -77, 58 * k, 5)
		ctx.restore()
	var e = prey
	if e and e.hp > 0:
		ctx.save(); ctx.translate(e.x, e.y); ctx.scale(1, 0.62)
		ctx.set_stroke(MTYPE.hunt.col); ctx.line_width = 3; ctx.global_alpha = 0.6 + 0.4 * sin(t * 6)
		ctx.begin_path(); ctx.arc(0, 0, e.radius + 14, 0, TAU); ctx.stroke()
		ctx.restore()
	var Q := siege
	if Q.get("on"):
		ctx.save(); ctx.translate(Q.x, Q.y); ctx.scale(1, 0.62)
		ctx.set_stroke("rgba(20,6,10,0.75)"); ctx.line_width = 12
		ctx.begin_path(); ctx.arc(0, 0, Q.r, 0, TAU); ctx.stroke()
		ctx.set_stroke(SIEGE_COL); ctx.line_width = 4; ctx.global_alpha = 0.75 + 0.25 * sin(t * 5)
		ctx.line_dash = [22, 12]; ctx.line_dash_offset = t * 40
		ctx.begin_path(); ctx.arc(0, 0, Q.r, 0, TAU); ctx.stroke()
		ctx.line_dash = []; ctx.global_alpha = 0.16; ctx.line_width = 30
		ctx.begin_path(); ctx.arc(0, 0, Q.r + 18, 0, TAU); ctx.stroke()
		ctx.restore()
	var S := esc
	if S.get("on"):
		ctx.save(); ctx.translate(S.x, S.y)
		ctx.save(); ctx.scale(1, 0.62)
		ctx.set_stroke("rgba(159,216,255,0.8)"); ctx.line_width = 6
		ctx.begin_path(); ctx.arc(0, 0, S.r, 0, TAU); ctx.stroke()
		ctx.set_fill("rgba(159,216,255,0.18)"); ctx.begin_path(); ctx.arc(0, 0, 80, 0, TAU); ctx.fill()
		ctx.restore()
		ctx.set_fill("#9fd8ff"); ctx.global_alpha = 0.5 + 0.3 * sin(t * 4)
		ctx.fill_rect(-6, -110, 12, 110)
		ctx.restore()

## yön oku: kaçış çıkışı (her zaman) · av (yalnız uzatmada)
func arrow(ctx: Ctx2D) -> void:
	var q = arrow_target()
	var p = game.player
	if q == null or p == null: return
	var dx: float = q.x - p.x
	var dy: float = q.y - p.y
	var d := sqrt(dx * dx + dy * dy)
	if d < 220: return
	var a := atan2(dy, dx)
	var R := 104.0
	ctx.save()
	ctx.translate(p.x + cos(a) * R, p.y + 14 + sin(a) * R)
	ctx.rotate(a)
	ctx.set_fill(MTYPE.escape.col if esc.get("on") else MTYPE.hunt.col); ctx.set_stroke("rgba(11,9,16,0.85)"); ctx.line_width = 3
	ctx.begin_path(); ctx.move_to(16, 0); ctx.line_to(-9, -10); ctx.line_to(-3, 0); ctx.line_to(-9, 10); ctx.close_path(); ctx.stroke(); ctx.fill()
	ctx.restore()
