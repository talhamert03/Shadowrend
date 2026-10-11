class_name ObjectiveManager
extends RefCounted
## objectives.js — Saha içi görevler (keşfedilir, isteğe bağlı), birebir.
## KURTARMA NOKTASI: kalkan kubbesinde bekleyen insan → escort → güvenli
## yapıya varış → kart ödülü. Yuva kodu çalışır ama haritada yuva yok.

const ESC := {
	"leash": 320.0, "follow": 92.0, "speed": 176.0, "hp": 300.0, "hurtR": 46.0,
	"dps": 15.0, "goalR": 165.0, "wakeR": 128.0, "hintR": 340.0,
}
const DOME_T := 0.55
const RESPAWN := 26.0

var game
var phase := "none"
var npc := {"x": 0.0, "y": 0.0, "vx": 0.0, "vy": 0.0, "hp": 0.0, "maxHp": 1.0, "anim": 0.0, "wait": 0.0, "face": 0.0}
var dest := {"x": 0.0, "y": 0.0}
var domeT := 0.0
var frac := 0.0
var danger := false
var cool := 0.0
var saved := 0
var nests: Array = []
var nestDone := false
var near := false
var _d0 := 1.0
var _scratch: Array = []
var _armed := false
var _freeY := 0.0

func _init(g) -> void:
	game = g

func reset() -> void:
	_armed = true
	phase = "none"
	domeT = 0; frac = 0; cool = 0; saved = 0
	nests.clear()
	nestDone = false

func begin() -> void:
	reset()

func _arm() -> void:
	if not _armed: return
	var g = game
	if not g.arena or not g.props or not g.props.n: return
	_armed = false
	nests.clear()
	nestDone = false
	saved = 0
	cool = 0
	var F = g.props
	if F and F.byKind.has("yuva"):
		for i in F.byKind.yuva: nests.append(i)
	_place()

func _safe_spots() -> Array:
	var F = game.props
	var out := []
	if not F: return out
	for kind in ["kazan", "totem", "kafatasi"]:
		var l = F.byKind.get(kind)
		if l == null: continue
		for i in l:
			var px: float = F.x[i]
			var py: float = F.y[i] + F.hz[i] + 90
			if JS.hypot(px, py) < 600: continue
			out.append({"x": px, "y": py})
	return out

func _place() -> void:
	var g = game
	var A = g.arena
	if not A: return
	var P: float = A.play
	var safe := _safe_spots()
	if not safe.is_empty():
		var d = safe[int(randf() * safe.size())]
		dest.x = d.x; dest.y = d.y
	else:
		dest.x = 0.0; dest.y = P * 0.32
	var ang := atan2(-dest.y, -dest.x) + (randf() - 0.5) * 1.1
	var rad := P * 0.34
	var sx := free_pos(cos(ang) * rad, sin(ang) * rad)
	npc.x = sx; npc.y = _freeY
	npc.hp = ESC.hp; npc.maxHp = ESC.hp
	npc.vx = 0.0; npc.vy = 0.0
	npc.wait = 0.0; npc.face = 0.0
	domeT = 0; frac = 0
	phase = "waiting"
	_d0 = maxf(1.0, JS.hypot(dest.x - sx, dest.y - _freeY))

## Engelden boş bir nokta bulur; x döner, y `_freeY`'ye yazılır (web ile aynı).
func free_pos(px: float, py: float) -> float:
	var g = game
	var A = g.arena
	var lim: float = A.play / 2.0 - 190
	var cx := maxf(-lim, minf(lim, px))
	var cy := maxf(-lim, minf(lim, py))
	var F = g.props
	for clr in [150.0, 60.0]:
		if not F or not F.blocked(cx, cy, clr): break
		var r := 60.0
		while r <= 520:
			for a in 10:
				var t := (a / 10.0) * 6.283
				var nx := cx + cos(t) * r
				var ny := cy + sin(t) * r
				if absf(nx) < lim and absf(ny) < lim and not F.blocked(nx, ny, clr):
					_freeY = ny
					return nx
			r += 55
	_freeY = cy
	return cx

func get_free_y() -> float:
	return _freeY

func on_prop_break(idx: int) -> void:
	if nestDone: return
	var i := nests.find(idx)
	if i < 0: return
	nests.remove_at(i)
	var g = game
	g.spawn_burst(g.props.x[idx], g.props.y[idx], "#b98cff", 26, 240, 4, 0.7, true)
	g.add_shake(0.14)
	if not nests.is_empty():
		g.spawn_text(g.props.x[idx], g.props.y[idx] - 60, "YUVA " + str(3 - nests.size()) + "/3", "#b98cff", 17, false)
		return
	nestDone = true
	g.ui.banner("YUVALAR SUSTU", "KART ÖDÜLÜ")
	g.grant_objective_card()

func update(dt: float) -> void:
	if _armed: _arm()
	if domeT > 0 and domeT < 1:
		domeT = minf(1.0, domeT + dt / DOME_T)
	if phase == "cooldown":
		cool -= dt
		if cool <= 0: _place()
		return
	if phase == "waiting": _upd_waiting(dt)
	elif phase == "escort": _upd_escort(dt)

func _upd_waiting(_dt: float) -> void:
	var g = game
	var p = g.player
	var n := npc
	n.anim = 0.0; n.vx = 0.0; n.vy = 0.0
	var d := JS.hypot(p.x - n.x, p.y - n.y)
	near = d < ESC.hintR
	if d > ESC.wakeR: return
	phase = "escort"
	domeT = 0.0001
	g.spawn_burst(n.x, n.y, "#bfeaff", 34, 300, 4.2, 0.75, true)
	var nR := 5 if g.isMobile else 10
	for i in nR:
		var a := (float(i) / nR) * 6.283
		g.pools.rings.take().setup(n.x + cos(a) * 90, n.y + sin(a) * 90, 40, 0.4, "#bfeaff")
	g.pools.rings.take().setup(n.x, n.y, 240, 0.55, "#8fdcff")
	g.add_shake(0.16)
	g.audio.play("rescue")
	g.ui.banner("KURTARILDI", "IŞIĞA GÖTÜR")

class _NpcRef:
	var x := 0.0
	var y := 0.0

func _upd_escort(dt: float) -> void:
	var g = game
	var p = g.player
	var n := npc
	var dx: float = p.x - n.x
	var dy: float = p.y - n.y
	var d := JS.hypot(dx, dy)
	if d == 0: d = 1.0
	if d < ESC.leash and d > ESC.follow:
		n.vx = dx / d * ESC.speed
		n.vy = dy / d * ESC.speed
		n.wait = 0.0
		n.anim += dt * 9
	else:
		n.vx *= 0.82; n.vy *= 0.82
		n.wait += dt
	n.x += n.vx * dt
	n.y += n.vy * dt
	var A = g.arena
	if A:
		n.x = maxf(A.l, minf(A.r, n.x))
		n.y = maxf(A.t, minf(A.b, n.y))
	if g.props:
		var ref := _NpcRef.new()
		ref.x = n.x; ref.y = n.y
		g.props.resolve(ref, 16)
		n.x = ref.x; n.y = ref.y
	var hurt = g.enemies.query_circle(n.x, n.y, ESC.hurtR, _scratch)
	if hurt and hurt.size():
		n.hp -= ESC.dps * hurt.size() * dt
		if randf() < dt * 9 and g.in_view(n.x, n.y, 60):
			g.spawn_burst(n.x, n.y, "#ff6a72", 3, 90, 2.4, 0.3, false)
		if n.hp <= 0:
			_lose()
			return
	elif n.hp < n.maxHp:
		n.hp = minf(n.maxHp, n.hp + dt * 6)
	var gd := JS.hypot(dest.x - n.x, dest.y - n.y)
	frac = maxf(0.0, minf(1.0, 1.0 - gd / _d0))
	danger = n.hp < n.maxHp * 0.35
	if gd < ESC.goalR: _win()

func _win() -> void:
	var g = game
	var cx: float = npc.x
	var cy: float = npc.y
	phase = "cooldown"
	cool = RESPAWN * 1.6
	saved += 1
	domeT = 1
	var n := 18 + JS.i(g.msn.world) * 2
	for i in n:
		var a := (float(i) / n) * 6.283
		var r := 34.0 + randf() * 96.0
		g.spawn_gem(cx + cos(a) * r, cy + sin(a) * r, 3 + int(randf() * 4))
	g.spawn_burst(cx, cy, "#7fe3b0", 32, 290, 4.5, 0.8, true)
	g.pools.rings.take().setup(cx, cy, 260, 0.6, "#9ff2c4")
	g.add_shake(0.18)
	g.audio.play("delivered")
	g.ui.banner("EVE VARDI", "KART ÖDÜLÜ")
	g.grant_objective_card()

func _lose() -> void:
	var g = game
	g.spawn_burst(npc.x, npc.y, "#ff3b4e", 24, 210, 4, 0.7, false)
	phase = "cooldown"
	cool = RESPAWN
	domeT = 1
	g.audio.play("objfail")
	g.ui.banner("KAYBEDİLDİ", "")

func target_x():
	if phase == "waiting": return npc.x
	if phase == "escort": return dest.x
	if not nestDone and not nests.is_empty(): return game.props.x[nests[0]]
	return null

func target_y():
	if phase == "waiting": return npc.y
	if phase == "escort": return dest.y
	if not nestDone and not nests.is_empty(): return game.props.y[nests[0]]
	return null
