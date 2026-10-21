class_name Ultimate
extends RefCounted
## ultimate.js — SÜPER YETENEK 2.0: her kahramanın kendi sahnesi (birebir).
## Hasar vuruşların İNDİĞİ anda, yalnız vuruş alanında. Çizim Ctx2D ile
## (web'deki 2B üst tuval kodu satır satır).

const ULT_NEED := 80
const ULT_TIER := [null,
	{"r": 250.0, "norm": 0.60, "elite": 0.22, "boss": 0.03, "inv": 1.0, "heal": 0.0,  "n": 1.0, "label": "SIRADAN"},
	{"r": 290.0, "norm": 0.80, "elite": 0.32, "boss": 0.04, "inv": 1.2, "heal": 0.05, "n": 1.2, "label": "NADİR"},
	{"r": 330.0, "norm": 1.00, "elite": 0.45, "boss": 0.05, "inv": 1.5, "heal": 0.10, "n": 1.4, "label": "EPİK"},
	{"r": 380.0, "norm": 1.00, "elite": 0.60, "boss": 0.06, "inv": 1.8, "heal": 0.15, "n": 1.6, "label": "EFSANEVİ"},
]
const ULT_ID := {
	"okcu":    {"name": "AY YAĞMURU",    "col": "#cfe8ff", "c2": "#7fb2ff", "k": "moon",   "base": 16, "hr": 70.0,  "desc": "Gökte hilal doğar; hilal uçlu ay okları yağar."},
	"simsek":  {"name": "GÖK ÖFKESİ",    "col": "#e6f6ff", "c2": "#6cc8ff", "k": "bolt",   "base": 10, "hr": 90.0,  "desc": "Gök yarılır; düşmanların üstüne zikzak yıldırımlar iner."},
	"gokalev": {"name": "MAVİ KIYAMET",  "col": "#bfe9ff", "c2": "#2f8dff", "k": "meteor", "base": 8,  "hr": 115.0, "desc": "Mavi alevli göktaşları çapraz düşer, geniş patlar."},
	"korsan":  {"name": "HAYALET BORDA", "col": "#c8ffe6", "c2": "#2fcf98", "k": "cannon", "base": 10, "hr": 90.0,  "desc": "Arkada hayalet gemi belirir, borda ateşi yağar."},
	"sapanci": {"name": "TAŞ FIRTINASI", "col": "#f0dcb4", "c2": "#a8804a", "k": "stone",  "base": 13, "hr": 70.0,  "desc": "Sapan fırtınası: seken taşlar kalabalığı döver."},
	"kralice": {"name": "GECE HÜKMÜ",    "col": "#e8d4ff", "c2": "#9a6aff", "k": "slash",  "base": 14, "hr": 80.0,  "desc": "Karanlıkta çapraz hilal kesikleri açılır."},
	"sovalye": {"name": "AYAZ SURU",     "col": "#e6f8ff", "c2": "#8fd6ff", "k": "spike",  "base": 0,  "hr": 70.0,  "desc": "Buz surları dışa doğru üç halka hâlinde fışkırır."},
	"seher":   {"name": "SEHER GİRDABI", "col": "#fff0c4", "c2": "#ff9a4a", "k": "vortex", "base": 0,  "hr": 0.0,   "desc": "Üç güneş kılıcı dönerek genişler, her şeyi süpürür."},
	"savasci": {"name": "KALE ÇIĞLIĞI",  "col": "#ffd8bf", "c2": "#d8623a", "k": "slam",   "base": 0,  "hr": 0.0,   "desc": "Kalkan yere iner; çatlaklı şok dalgası yayılır."},
}
const KIND := {
	"moon":   {"fall": 0.26, "spread": 1.0,  "linger": 0.55},
	"bolt":   {"fall": 0.16, "spread": 1.15, "linger": 0.26},
	"meteor": {"fall": 0.42, "spread": 1.0,  "linger": 0.35},
	"cannon": {"fall": 0.5,  "spread": 1.0,  "linger": 0.3},
	"stone":  {"fall": 0.34, "spread": 0.9,  "linger": 0.25},
	"slash":  {"fall": 0.1,  "spread": 0.9,  "linger": 0.34},
	"spike":  {"fall": 0.08, "spread": 0.7,  "linger": 0.6},
}
const MAXS := 48

static func _uhash(s: float, i: float) -> float:
	var v := sin(s * 12.9898 + i * 78.233) * 43758.5453
	return v - floor(v)

var game
var _sc: Array = []
var S: Array = []
var wave := {"on": false, "t": 0.0, "dur": 0.0, "r": 0.0}
var rar := 1
var id: Dictionary = ULT_ID.okcu
var charge := 0.0
var ready := false
var fx := 0.0
var uses := 0
var _told := false
var _sndT := 0.0
var t := 0.0
var ox := 0.0
var oy := 0.0

func _init(g) -> void:
	game = g
	for i in MAXS:
		S.append({"on": false, "x": 0.0, "y": 0.0, "sx": 0.0, "sy": 0.0, "t": 0.0, "hit": false, "seed": 0.0, "a": 0.0})
	reset(1, "")

func reset(rarity, cid) -> void:
	var r := JS.i(rarity)
	rar = maxi(1, mini(4, r if r else 1))
	id = ULT_ID.get(cid, ULT_ID.okcu) if cid else ULT_ID.okcu
	charge = 0; ready = false; fx = 0; uses = 0; _told = false; _sndT = 0
	for s in S: s.on = false
	wave.on = false

var tier: Dictionary:
	get: return ULT_TIER[rar]

func on_kill(e) -> void:
	if ready or fx > 0: return
	charge += 4 if (e and e.elite) else 1
	if charge >= ULT_NEED:
		charge = ULT_NEED
		ready = true
		var g = game
		g.audio.play("ultready")
		Quality.haptic("ui")
		if not _told:
			_told = true
			g.ui.toast(id.name + " HAZIR — sağ alttaki mühre dokun")

func _hit(e, ang: float) -> void:
	if e.hp <= 0 or e._ultN == uses: return
	e._ultN = uses
	var T := tier
	var dmg: float
	if e.isBoss: dmg = e.maxHp * T.boss
	elif e.elite: dmg = minf(e.hp - 1, e.maxHp * T.elite)
	else: dmg = e.hp + 1 if T.norm >= 1 else e.maxHp * T.norm
	if dmg > 0: Combat.apply_hit(game, e, ceil(dmg), ang, 380, 0, false)

func _area(x: float, y: float, r: float) -> void:
	var g = game
	var out = g.enemies.query_circle(x, y, r + 30, _sc) if g.enemies else []
	for e in out:
		var dx: float = e.x - x
		var dy: float = e.y - y
		var rr: float = r + e.radius
		if dx * dx + dy * dy <= rr * rr: _hit(e, atan2(dy, dx))

func _slot():
	for s in S:
		if not s.on: return s
	return null

func fire() -> bool:
	var g = game
	var p = g.player
	if not ready or g.state != "playing" or not p: return false
	var T := tier
	var C := id
	var R: float = T.r
	ready = false; charge = 0; uses += 1
	t = 0; ox = p.x; oy = p.y
	p.invuln = maxf(p.invuln, T.inv)
	if T.heal > 0 and not p.noHeal: p.hp = minf(p.maxHp, p.hp + JS.round_js(p.maxHp * T.heal))
	for s in S: s.on = false
	var k: String = C.k
	if k == "vortex" or k == "slam":
		wave.merge({"on": true, "t": 0.0, "dur": 0.55 if k == "slam" else 1.05, "r": 0.0}, true)
		fx = wave.dur + 0.5
	elif k == "spike":
		var rings := [[0.36, 8], [0.68, 12], [1.0, 16]]
		for ri in 3:
			var f: float = rings[ri][0]
			var n: int = rings[ri][1]
			var off := ri * 0.37
			var brk := false
			for j in n:
				var s = _slot()
				if s == null:
					brk = true
					break
				var a := off + (float(j) / n) * TAU
				s.merge({"on": true, "x": p.x + cos(a) * R * f, "y": p.y + sin(a) * R * f * 0.9, "t": -f * 0.55, "hit": false, "seed": randf() * 100, "a": a}, true)
			if brk: break
		fx = 1.4
	else:
		var n := mini(MAXS, int(JS.round_js(C.base * T.n)))
		var out = g.enemies.query_circle(p.x, p.y, R, _sc) if g.enemies else []
		var K: Dictionary = KIND[k]
		for j in n:
			var s = _slot()
			if s == null: break
			var x: float
			var y: float
			var e = out[j] if j < out.size() else null
			if e and e.hp > 0:
				x = e.x + (randf() - 0.5) * 16
				y = e.y + (randf() - 0.5) * 16
			else:
				var a := randf() * TAU
				var d := sqrt(randf()) * R
				x = p.x + cos(a) * d
				y = p.y + sin(a) * d * 0.85
			var sx := x
			var sy := y
			if k == "moon":
				sx = x - 170; sy = y - 560
			elif k == "meteor":
				sx = x + 360; sy = y - 620
			elif k == "cannon":
				sx = p.x - 260 + (randf() - 0.5) * 60; sy = p.y - 240
			elif k == "stone":
				sx = p.x; sy = p.y - 20
			s.merge({"on": true, "x": x, "y": y, "sx": sx, "sy": sy, "t": -(float(j) / n) * K.spread - randf() * 0.06, "hit": false, "seed": randf() * 100, "a": randf() * TAU}, true)
		fx = K.spread + K.fall + K.linger + 0.35
	g.add_shake(0.12 + rar * 0.03)
	g.punch(0.03)
	g.audio.ultTier = rar
	g.audio.ultKind = k
	g.audio.play("ultfire")
	g.spawn_text(p.x, p.y - 118, C.name, C.col, 26, true)
	g.ui.ult_flash(C.c2, rar)
	Quality.haptic("death")
	return true

func _impact(s: Dictionary) -> void:
	var g = game
	var C := id
	var k: String = C.k
	s.hit = true
	_area(s.x, s.y, C.hr)
	if g.props and (k == "meteor" or k == "cannon"): g.props.damage_area(s.x, s.y, C.hr * 0.6, 200)
	var big := k == "meteor" or k == "cannon" or k == "bolt"
	if g.in_view(s.x, s.y, 60):
		g.spawn_burst(s.x, s.y, C.col, 14 if big else 8, 300 if big else 200, 3.6 if big else 2.6, 0.5, true)
		g.spawn_burst(s.x, s.y, C.c2, 10 if big else 5, 220 if big else 140, 3, 0.55, true)
		g.pools.rings.take().setup(s.x, s.y, C.hr * (1.2 if big else 0.9), 0.42 if big else 0.3, C.col)
		if big and g.renderer3d: g.renderer3d.spawn_hit(s.x, s.y, 0, 1, 1, 0.6, 0.3)
	if big: g.add_shake(0.05)
	if _sndT <= 0:
		_sndT = 0.075
		g.audio.ultKind = k
		g.audio.play("ulthit")

func update(dt: float) -> void:
	if fx <= 0: return
	fx = maxf(0.0, fx - dt)
	t += dt
	if _sndT > 0: _sndT -= dt
	var C := id
	var K = KIND.get(C.k)
	if K:
		for s in S:
			if not s.on: continue
			s.t += dt
			if not s.hit and s.t >= K.fall: _impact(s)
			if s.t > K.fall + K.linger: s.on = false
	var W := wave
	if W.on:
		W.t += dt
		var u := minf(1.0, W.t / W.dur)
		var R: float = tier.r
		W.r = R * (1 - pow(1 - u, 2.2)) if C.k == "slam" else 40 + (R - 40) * u
		var p = game.player
		var cx: float = ox if C.k == "slam" else p.x
		var cy: float = oy if C.k == "slam" else p.y
		_area(cx, cy, W.r)
		if C.k == "vortex" and randf() < dt * 30:
			game.spawn_burst(cx + cos(W.t * 9) * W.r, cy + sin(W.t * 9) * W.r * 0.62, C.col, 2, 90, 2.4, 0.4, true)
		if W.t >= W.dur: W.on = false

# ═══ ÇİZİM (dünya uzayı, Ctx2D) ═══
func render(ctx: Ctx2D) -> void:
	if fx <= 0: return
	var g = game
	var p = g.player
	var C := id
	var k: String = C.k
	var K = KIND.get(k)
	ctx.save()
	ctx.comp = "lighter"
	ctx.line_cap = "round"; ctx.line_join = "round"
	if k == "moon": _draw_sky_moon(ctx, p.x, p.y - 300, t)
	if k == "cannon": _draw_ghost_ship(ctx, ox - 260, oy - 250, t)
	if K:
		for s in S:
			if not s.on or s.t < -0.001: continue
			var u := minf(1.0, s.t / K.fall)
			var post: float = s.t - K.fall
			match k:
				"moon": _draw_moon_arrow(ctx, s, u, post, K)
				"bolt": _draw_bolt(ctx, s, u, post, K)
				"meteor": _draw_meteor(ctx, s, u, post, K)
				"cannon": _draw_ball(ctx, s, u, post, K, 150, 12, "#c8ffe6", "#2fcf98")
				"stone": _draw_ball(ctx, s, u, post, K, 110, 7, "#f0dcb4", "#a8804a")
				"slash": _draw_slash(ctx, s, u, post, K)
				"spike": _draw_spike(ctx, s, u, post, K)
	var W := wave
	if k == "vortex" and (W.on or fx > 0.2): _draw_vortex(ctx, p.x, p.y, W.r if W.r else tier.r, t)
	if k == "slam" and (W.on or fx > 0.2): _draw_slam(ctx, ox, oy, W.r if W.r else tier.r, t, W.dur)
	ctx.restore()

func _fade_out() -> float:
	return minf(1.0, fx / 0.35)

func _draw_sky_moon(ctx: Ctx2D, x: float, y: float, tt: float) -> void:
	var a := minf(1.0, tt / 0.25) * _fade_out()
	if a <= 0: return
	var r := 46.0 + rar * 4
	ctx.global_alpha = a * 0.35; ctx.set_fill("#7fb2ff")
	ctx.begin_path(); ctx.arc(x, y, r * 1.9, 0, TAU); ctx.fill()
	ctx.global_alpha = a
	ctx.set_fill("#e8f4ff")
	ctx.begin_path(); ctx.arc(x, y, r, 0, TAU); ctx.arc(x + r * 0.42, y - r * 0.18, r * 0.86, 0, TAU, true); ctx.fill("evenodd")
	ctx.global_alpha = a * 0.6; ctx.set_stroke("#bfe3ff"); ctx.line_width = 2
	ctx.begin_path(); ctx.arc(x, y, r + 8 + sin(tt * 6) * 2, 0, TAU); ctx.stroke()

func _draw_moon_arrow(ctx: Ctx2D, s, u: float, post: float, K) -> void:
	if post < 0:
		var e := u * u
		var x: float = s.sx + (s.x - s.sx) * e
		var y: float = s.sy + (s.y - s.sy) * e
		var dx: float = s.x - s.sx
		var dy: float = s.y - s.sy
		var L := JS.hypot(dx, dy)
		var ux := dx / L
		var uy := dy / L
		ctx.global_alpha = 0.35; ctx.set_stroke("#7fb2ff"); ctx.line_width = 7
		ctx.begin_path(); ctx.move_to(x - ux * 90, y - uy * 90); ctx.line_to(x, y); ctx.stroke()
		ctx.global_alpha = 1; ctx.set_stroke("#eaf6ff"); ctx.line_width = 2.4
		ctx.begin_path(); ctx.move_to(x - ux * 46, y - uy * 46); ctx.line_to(x, y); ctx.stroke()
		_crescent(ctx, x, y, atan2(uy, ux), 9, "#ffffff")
		ctx.global_alpha = 0.25 + u * 0.35; ctx.set_stroke("#bfe3ff"); ctx.line_width = 1.6
		ctx.begin_path(); ctx.ellipse(s.x, s.y, 20 - u * 8, (20 - u * 8) * 0.55, 0, 0, TAU); ctx.stroke()
	else:
		var f: float = 1 - post / K.linger
		var ang := atan2(s.y - s.sy, s.x - s.sx)
		ctx.global_alpha = f; ctx.set_stroke("#dbeeff"); ctx.line_width = 2.2
		ctx.begin_path(); ctx.move_to(s.x - cos(ang) * 26, s.y - sin(ang) * 26); ctx.line_to(s.x, s.y); ctx.stroke()
		ctx.global_alpha = f * 0.8; ctx.set_fill("#bfe3ff")
		ctx.begin_path(); ctx.ellipse(s.x, s.y, 30 * (1 - f * 0.5), 16 * (1 - f * 0.5), 0, 0, TAU); ctx.fill()
		_crescent(ctx, s.x, s.y - 4, -PI / 2, 14 * (1.4 - f * 0.4), "#ffffff", f)

func _crescent(ctx: Ctx2D, x: float, y: float, a: float, r: float, col: String, alpha = null) -> void:
	ctx.save(); ctx.translate(x, y); ctx.rotate(a)
	if alpha != null: ctx.global_alpha = alpha
	ctx.set_fill(col)
	ctx.begin_path(); ctx.arc(0, 0, r, -PI / 2, PI / 2); ctx.arc(-r * 0.45, 0, r * 0.9, PI / 2, -PI / 2, true); ctx.fill()
	ctx.restore()

func _draw_bolt(ctx: Ctx2D, s, u: float, post: float, K) -> void:
	if post < 0:
		ctx.global_alpha = 0.5 + u * 0.5; ctx.set_stroke("#6cc8ff"); ctx.line_width = 2
		var rr := 30 - u * 18
		ctx.begin_path(); ctx.ellipse(s.x, s.y, rr, rr * 0.55, 0, 0, TAU); ctx.stroke()
		return
	var f: float = 1 - post / K.linger
	if f <= 0: return
	var flick := 1.0 if _uhash(s.seed, floor(post * 40)) > 0.3 else 0.4
	var top: float = s.y - 640
	var N := 8
	for pass_ in 2:
		ctx.global_alpha = f * flick * (1.0 if pass_ else 0.4)
		ctx.set_stroke("#ffffff" if pass_ else "#6cc8ff")
		ctx.line_width = 3 if pass_ else 11
		ctx.begin_path(); ctx.move_to(s.x + (_uhash(s.seed, 0) - 0.5) * 60, top)
		for i in range(1, N + 1):
			var v := float(i) / N
			var jx := 0.0 if i == N else (_uhash(s.seed, i) - 0.5) * 70 * (1 - v * 0.5)
			ctx.line_to(s.x + jx, top + (s.y - top) * v)
		ctx.stroke()
		var bi := 3 + int(_uhash(s.seed, 9) * 3)
		var bv := float(bi) / N
		var bx: float = s.x + (_uhash(s.seed, bi) - 0.5) * 70 * (1 - bv * 0.5)
		var by: float = top + (s.y - top) * bv
		ctx.line_width = 1.6 if pass_ else 6
		ctx.begin_path(); ctx.move_to(bx, by); ctx.line_to(bx + (_uhash(s.seed, 11) - 0.5) * 120, by + 60); ctx.line_to(bx + (_uhash(s.seed, 12) - 0.5) * 160, by + 130); ctx.stroke()
	ctx.global_alpha = f * 0.7; ctx.set_fill("#e6f6ff")
	ctx.begin_path(); ctx.ellipse(s.x, s.y, 46 * (1.2 - f * 0.4), 24 * (1.2 - f * 0.4), 0, 0, TAU); ctx.fill()

func _draw_meteor(ctx: Ctx2D, s, u: float, post: float, K) -> void:
	if post < 0:
		var e := u * u
		var x: float = s.sx + (s.x - s.sx) * e
		var y: float = s.sy + (s.y - s.sy) * e
		var dx: float = s.x - s.sx
		var dy: float = s.y - s.sy
		var L := JS.hypot(dx, dy)
		var ux := dx / L
		var uy := dy / L
		var i := 5
		while i >= 0:
			ctx.global_alpha = 0.18 + (5 - i) * 0.1
			ctx.set_fill("#2f8dff" if i > 2 else "#9fd8ff")
			ctx.begin_path(); ctx.arc(x - ux * i * 18, y - uy * i * 18, 16 - i * 2, 0, TAU); ctx.fill()
			i -= 1
		ctx.global_alpha = 1; ctx.set_fill("#ffffff")
		ctx.begin_path(); ctx.arc(x, y, 8, 0, TAU); ctx.fill()
		ctx.global_alpha = 0.3 + u * 0.4; ctx.set_stroke("#2f8dff"); ctx.line_width = 2.4
		ctx.begin_path(); ctx.ellipse(s.x, s.y, 70 * (1 - u * 0.3), 38 * (1 - u * 0.3), 0, 0, TAU); ctx.stroke()
	else:
		var f: float = 1 - post / K.linger
		ctx.global_alpha = f * 0.8; ctx.set_fill("#6fbfff")
		ctx.begin_path(); ctx.ellipse(s.x, s.y, 120 * (1.3 - f * 0.5), 64 * (1.3 - f * 0.5), 0, 0, TAU); ctx.fill()
		ctx.global_alpha = f; ctx.set_fill("#ffffff")
		ctx.begin_path(); ctx.ellipse(s.x, s.y, 44 * f, 24 * f, 0, 0, TAU); ctx.fill()

func _draw_ball(ctx: Ctx2D, s, u: float, post: float, K, arc_h: float, r: float, c1: String, c2: String) -> void:
	if post < 0:
		var x: float = s.sx + (s.x - s.sx) * u
		var y: float = s.sy + (s.y - s.sy) * u - sin(u * PI) * arc_h
		ctx.global_alpha = 0.35; ctx.set_fill(c2)
		ctx.begin_path(); ctx.arc(x, y, r * 1.9, 0, TAU); ctx.fill()
		ctx.global_alpha = 1; ctx.set_fill(c1)
		ctx.begin_path(); ctx.arc(x, y, r, 0, TAU); ctx.fill()
		ctx.global_alpha = 0.25 + u * 0.3; ctx.set_stroke(c2); ctx.line_width = 1.8
		ctx.begin_path(); ctx.ellipse(s.x, s.y, r * 3, r * 1.6, 0, 0, TAU); ctx.stroke()
	else:
		var f: float = 1 - post / K.linger
		ctx.global_alpha = f * 0.7; ctx.set_fill(c2)
		ctx.begin_path(); ctx.ellipse(s.x, s.y, r * 8 * (1.2 - f * 0.4), r * 4.4 * (1.2 - f * 0.4), 0, 0, TAU); ctx.fill()
		ctx.global_alpha = f; ctx.set_fill(c1)
		ctx.begin_path(); ctx.ellipse(s.x, s.y, r * 3 * f, r * 1.8 * f, 0, 0, TAU); ctx.fill()

func _draw_slash(ctx: Ctx2D, s, u: float, post: float, K) -> void:
	var f: float = 1.0 if post < 0 else 1 - post / K.linger
	var sweep := u if post < 0 else 1.0
	for j in 2:
		var a0: float = s.a + j * 1.7
		ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(a0); ctx.scale(1, 0.62)
		for pass_ in 2:
			ctx.global_alpha = f * (1.0 if pass_ else 0.4)
			ctx.set_stroke("#ffffff" if pass_ else "#9a6aff")
			ctx.line_width = 3 if pass_ else 12
			ctx.begin_path(); ctx.arc(0, 0, 52, -1.1, -1.1 + 2.2 * sweep); ctx.stroke()
		ctx.restore()
	if post >= 0:
		ctx.global_alpha = f; ctx.set_fill("#e8d4ff")
		for i in 4:
			var a: float = s.a + i * 1.57
			var d := 20 + post * 120
			var x: float = s.x + cos(a) * d
			var y: float = s.y + sin(a) * d * 0.62
			var r := 5 * f
			ctx.begin_path(); ctx.move_to(x, y - r * 2); ctx.line_to(x + r * 0.5, y); ctx.line_to(x, y + r * 2); ctx.line_to(x - r * 0.5, y); ctx.close_path(); ctx.fill()
			ctx.begin_path(); ctx.move_to(x - r * 2, y); ctx.line_to(x, y + r * 0.5); ctx.line_to(x + r * 2, y); ctx.line_to(x, y - r * 0.5); ctx.close_path(); ctx.fill()

func _draw_spike(ctx: Ctx2D, s, u: float, post: float, K) -> void:
	var rise: float = u if post < 0 else (maxf(0.0, (K.linger - post) / 0.18) if post > K.linger - 0.18 else 1.0)
	if rise <= 0: return
	var h := (38 + _uhash(s.seed, 1) * 20) * rise
	var w := 11.0
	ctx.comp = "source-over"
	ctx.set_fill("#bfe9ff"); ctx.set_stroke("rgba(11,9,16,0.7)"); ctx.line_width = 2
	ctx.begin_path(); ctx.move_to(s.x - w, s.y); ctx.line_to(s.x - w * 0.2, s.y - h); ctx.line_to(s.x + w, s.y); ctx.close_path(); ctx.fill(); ctx.stroke()
	ctx.set_fill("#ffffff")
	ctx.begin_path(); ctx.move_to(s.x - w * 0.2, s.y - h); ctx.line_to(s.x + w, s.y); ctx.line_to(s.x + w * 0.2, s.y); ctx.close_path(); ctx.fill()
	ctx.comp = "lighter"
	if post >= 0 and post < 0.25:
		ctx.global_alpha = 1 - post / 0.25; ctx.set_fill("#8fd6ff")
		ctx.begin_path(); ctx.ellipse(s.x, s.y, 40, 20, 0, 0, TAU); ctx.fill()
		ctx.global_alpha = 1

func _draw_vortex(ctx: Ctx2D, x: float, y: float, r: float, tt: float) -> void:
	var a := _fade_out()
	ctx.global_alpha = a * 0.5; ctx.set_fill("#ffd98a")
	ctx.begin_path(); ctx.arc(x, y - 20, 26 + sin(tt * 10) * 3, 0, TAU); ctx.fill()
	for j in 3:
		var a0 := tt * 9 + j * (TAU / 3)
		ctx.save(); ctx.translate(x, y); ctx.scale(1, 0.62)
		for pass_ in 2:
			ctx.global_alpha = a * (1.0 if pass_ else 0.35)
			ctx.set_stroke("#fff4d8" if pass_ else "#ff9a4a")
			ctx.line_width = 4 if pass_ else 16
			ctx.begin_path(); ctx.arc(0, 0, r, a0, a0 + 1.2); ctx.stroke()
		ctx.global_alpha = a * 0.25; ctx.set_stroke("#ffd98a"); ctx.line_width = 3
		ctx.begin_path(); ctx.arc(0, 0, r * 0.6, a0 + 0.6, a0 + 1.6); ctx.stroke()
		ctx.restore()

func _draw_slam(ctx: Ctx2D, x: float, y: float, r: float, tt: float, dur: float) -> void:
	var u := minf(1.0, tt / dur)
	var a := (1 - u * 0.6) * _fade_out()
	ctx.save(); ctx.translate(x, y); ctx.scale(1, 0.62)
	for pass_ in 2:
		ctx.global_alpha = a * (1.0 if pass_ else 0.4)
		ctx.set_stroke("#ffe8d8" if pass_ else "#d8623a")
		ctx.line_width = 4 if pass_ else 18 * (1 - u * 0.5)
		ctx.begin_path(); ctx.arc(0, 0, r, 0, TAU); ctx.stroke()
	ctx.comp = "source-over"
	ctx.global_alpha = minf(1.0, a * 1.4); ctx.set_stroke("#2a120c"); ctx.line_width = 4
	for i in 9:
		var aa := i * (TAU / 9) + 0.2
		var L := r * (0.55 + 0.4 * ((i * 37) % 10) / 10.0)
		ctx.begin_path(); ctx.move_to(cos(aa) * 20, sin(aa) * 20)
		ctx.line_to(cos(aa + 0.12) * L * 0.5, sin(aa + 0.12) * L * 0.5)
		ctx.line_to(cos(aa - 0.06) * L, sin(aa - 0.06) * L); ctx.stroke()
	ctx.set_stroke("#ff9a6a"); ctx.line_width = 1.5; ctx.comp = "lighter"
	for i in 9:
		var aa := i * (TAU / 9) + 0.2
		var L := r * (0.55 + 0.4 * ((i * 37) % 10) / 10.0)
		ctx.begin_path(); ctx.move_to(cos(aa) * 20, sin(aa) * 20)
		ctx.line_to(cos(aa + 0.12) * L * 0.5, sin(aa + 0.12) * L * 0.5)
		ctx.line_to(cos(aa - 0.06) * L, sin(aa - 0.06) * L); ctx.stroke()
	ctx.restore()

func _draw_ghost_ship(ctx: Ctx2D, x: float, y: float, tt: float) -> void:
	var a := minf(1.0, tt / 0.3) * _fade_out() * 0.75
	if a <= 0: return
	var bob := sin(tt * 3) * 5
	ctx.global_alpha = a; ctx.set_fill("#2fcf98"); ctx.set_stroke("#c8ffe6"); ctx.line_width = 2
	ctx.begin_path()
	ctx.move_to(x - 90, y + bob); ctx.line_to(x + 90, y + bob); ctx.line_to(x + 64, y + 30 + bob); ctx.line_to(x - 70, y + 30 + bob); ctx.close_path()
	ctx.global_alpha = a * 0.45; ctx.fill(); ctx.global_alpha = a; ctx.stroke()
	ctx.begin_path(); ctx.move_to(x - 10, y + bob); ctx.line_to(x - 10, y - 90 + bob); ctx.stroke()
	ctx.begin_path(); ctx.move_to(x - 8, y - 84 + bob); ctx.quadratic_curve_to(x + 40, y - 56 + bob, x - 6, y - 20 + bob); ctx.close_path()
	ctx.global_alpha = a * 0.35; ctx.fill(); ctx.global_alpha = a; ctx.stroke()
	for i in 4:
		ctx.begin_path(); ctx.arc(x - 50 + i * 30, y + 14 + bob, 4, 0, TAU); ctx.stroke()
