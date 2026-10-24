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
	"mezarci": {"name": "MEZAR ÇUKURU",  "col": "#f0e2c4", "c2": "#8a5a32", "k": "slam",   "base": 0,  "hr": 0.0,   "desc": "Kürek yere iner; toprak dalga dalga kabarır, sürüyü savurur."},
	"fenerci": {"name": "RUH AYI",       "col": "#d8ffe8", "c2": "#3fdc8a", "k": "moon",   "base": 14, "hr": 70.0,  "desc": "Gökte yeşil bir ay doğar; ruh okları yağar."},
	"zehra":   {"name": "ZEHİR YAĞMURU", "col": "#e4ffc8", "c2": "#6fd83a", "k": "meteor", "base": 8,  "hr": 110.0, "desc": "Gökten zehirli damlalar çapraz düşer, geniş patlar."},
	"demirhan": {"name": "YILDIZ SURU",  "col": "#fff4c8", "c2": "#ffb43a", "k": "spike",  "base": 0,  "hr": 70.0,  "desc": "Çekiç iner; yıldız kristalleri dışa doğru üç halka hâlinde fışkırır."},
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

# ═══ ÇİZİM (dünya uzayı, Ctx2D) — Borderlands çizgi roman dili ═══
# Toplamalı parıltı yok: her şekil önce kalın MÜREKKEP konturla, sonra düz doygun renkle çizilir;
# isabetler sivri "POW" patlama yıldızlarıdır (taban basık: yere yatar). Renkler kahramanın
# süper renginden (col: açık · c2: koyu).
const INK := "#0d0812"
const SQ := 0.62                 # yere yatık şekillerin dikey basıklığı

func render(ctx: Ctx2D) -> void:
	if fx <= 0: return
	var g = game
	var p = g.player
	var C := id
	var k: String = C.k
	var K = KIND.get(k)
	ctx.save()
	ctx.comp = "source-over"
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
				"stone": _draw_ball(ctx, s, u, post, K, 110, 8, "#f0dcb4", "#a8804a")
				"slash": _draw_slash(ctx, s, u, post, K)
				"spike": _draw_spike(ctx, s, u, post, K)
	_draw_title(ctx, p.x, p.y - 150, t)
	var W := wave
	if k == "vortex" and (W.on or fx > 0.2): _draw_vortex(ctx, p.x, p.y, W.r if W.r else tier.r, t)
	if k == "slam" and (W.on or fx > 0.2): _draw_slam(ctx, ox, oy, W.r if W.r else tier.r, t, W.dur)
	ctx.restore()

func _fade_out() -> float:
	return minf(1.0, fx / 0.35)

static func _back(k: float) -> float:
	var q := k - 1.0
	return 1.0 + 2.6 * q * q * q + 1.6 * q * q

## mürekkep konturlu kapalı çokgen
func _poly(ctx: Ctx2D, pts: PackedVector2Array, col, ink := 4.0, a := 1.0) -> void:
	if pts.size() < 3 or a <= 0.0: return
	ctx.global_alpha = a
	ctx.begin_path(); ctx.move_to(pts[0].x, pts[0].y)
	for i in range(1, pts.size()): ctx.line_to(pts[i].x, pts[i].y)
	ctx.close_path()
	if ink > 0.0:
		ctx.set_stroke(INK); ctx.line_width = ink * 2.0; ctx.stroke()
	ctx.set_fill(col); ctx.fill()

## mürekkep konturlu çizgi (önce kalın siyah, sonra renk)
func _line(ctx: Ctx2D, pts: PackedVector2Array, col, w: float, a := 1.0, ink := 3.0) -> void:
	if pts.size() < 2 or a <= 0.0: return
	ctx.global_alpha = a
	for pass_ in 2:
		ctx.begin_path(); ctx.move_to(pts[0].x, pts[0].y)
		for i in range(1, pts.size()): ctx.line_to(pts[i].x, pts[i].y)
		ctx.set_stroke(INK if pass_ == 0 else col)
		ctx.line_width = w + ink * 2.0 if pass_ == 0 else w
		ctx.stroke()

## sivri patlama yıldızı (yere yatık)
func _pow(ctx: Ctx2D, x: float, y: float, r: float, col, a := 1.0, n := 10, seed := 0.0, sq := SQ) -> void:
	var P := PackedVector2Array()
	for i in n * 2:
		var an := seed + i * PI / n
		var rr := r if i % 2 == 0 else r * 0.55
		P.append(Vector2(x + cos(an) * rr, y + sin(an) * rr * sq))
	_poly(ctx, P, col, 3.5, a)

## mürekkep halkası (yere yatık elips)
func _ring(ctx: Ctx2D, x: float, y: float, r: float, col, w: float, a := 1.0) -> void:
	if a <= 0.0: return
	ctx.global_alpha = a
	for pass_ in 2:
		ctx.begin_path(); ctx.ellipse(x, y, r, r * SQ, 0, 0, TAU)
		ctx.set_stroke(INK if pass_ == 0 else col)
		ctx.line_width = w + 6.0 if pass_ == 0 else w
		ctx.stroke()

## mürekkep konturlu daire
func _disc(ctx: Ctx2D, x: float, y: float, r: float, col, a := 1.0, ink := 3.5) -> void:
	ctx.global_alpha = a
	ctx.set_fill(INK); ctx.begin_path(); ctx.arc(x, y, r + ink, 0, TAU); ctx.fill()
	ctx.set_fill(col); ctx.begin_path(); ctx.arc(x, y, r, 0, TAU); ctx.fill()

## hilal çokgeni (dış yay − iç yay; evenodd yok)
static func _crescent_pts(x: float, y: float, r: float, rot: float) -> PackedVector2Array:
	var P := PackedVector2Array()
	var n := 18
	for i in n + 1:
		var a := -PI * 0.5 + PI * float(i) / n
		P.append(Vector2(cos(a) * r, sin(a) * r))
	for i in n + 1:
		var a := PI * 0.5 - PI * float(i) / n
		P.append(Vector2(cos(a) * r * 0.42 - r * 0.05, sin(a) * r * 0.86))
	var out := PackedVector2Array()
	var cs := cos(rot)
	var sn := sin(rot)
	for q in P: out.append(Vector2(x + q.x * cs - q.y * sn, y + q.x * sn + q.y * cs))
	return out

## süper adı: siyah eğik bant üstünde sarı çizgi roman yazısı (patlayarak gelir, 1,3 sn)
func _draw_title(ctx: Ctx2D, x: float, y: float, tt: float) -> void:
	if tt > 1.3: return
	var k := minf(1.0, tt / 0.22)
	var s := _back(k) if k < 1.0 else 1.0
	var a := 1.0 - maxf(0.0, (tt - 1.0) / 0.3)
	var nm := String(id.name) + "!"
	if I18n.lang != "tr": nm = I18n.t(String(id.name)) + "!"
	ctx.save(); ctx.translate(x, y); ctx.rotate(-0.06); ctx.scale(s, s)
	ctx.font_size = 50
	ctx.font_weight = 1000
	ctx.font_display = false
	ctx.text_align = "start"
	var w := ctx.measure_text(nm) + 28
	ctx.global_alpha = a * 0.5; ctx.set_fill("#000000"); ctx.fill_rect(-w * 0.5 + 7, -32 + 8, w, 64)
	ctx.global_alpha = a; ctx.set_fill(INK); ctx.fill_rect(-w * 0.5, -32, w, 64)
	ctx.set_fill(String(id.col)); ctx.fill_rect(-w * 0.5, 24, w, 8)
	ctx.set_fill("#ffd23a"); ctx.fill_text(nm, -w * 0.5 + 14, 18)
	ctx.restore()

# ── AY YAĞMURU (okçu): gökte çizgi roman hilali, hilal uçlu oklar, mavi-beyaz POW ──
func _draw_sky_moon(ctx: Ctx2D, x: float, y: float, tt: float) -> void:
	var fo := _fade_out()
	var k := minf(1.0, tt / 0.32)
	var s := (_back(k) if k < 1.0 else 1.0 + sin(tt * 4.0) * 0.03) * fo
	if s <= 0.01: return
	var r := (44.0 + rar * 4.0) * s
	# ardında patlama yıldızı (ışık)
	_pow(ctx, x, y, r * 1.75, "#7fb2ff", 0.9 * fo, 12, tt * 0.6, 1.0)
	_poly(ctx, _crescent_pts(x, y, r, -0.5), "#fff4c8", 4.5, fo)
	# hilal içi gölge şeridi + parıltı
	_poly(ctx, _crescent_pts(x + r * 0.06, y + r * 0.06, r * 0.82, -0.5), "#ffd98a", 0.0, fo * 0.55)
	for i in 3:
		var a := tt * 2.0 + i * 2.1
		var px := x + cos(a) * r * 1.5
		var py := y + sin(a) * r * 1.1
		_pow(ctx, px, py, 7.0, "#ffffff", fo * (0.6 + 0.4 * sin(tt * 8.0 + i)), 4, 0.0, 1.0)

func _draw_moon_arrow(ctx: Ctx2D, s, u: float, post: float, K) -> void:
	var dx: float = s.x - s.sx
	var dy: float = s.y - s.sy
	var L := JS.hypot(dx, dy)
	var ux := dx / L
	var uy := dy / L
	if post < 0:
		var e := u * u
		var x: float = s.sx + dx * e
		var y: float = s.sy + dy * e
		# hız çizgileri + ok gövdesi
		_line(ctx, PackedVector2Array([Vector2(x - ux * 70, y - uy * 70), Vector2(x, y)]), "#cfe8ff", 4.0, 1.0, 2.5)
		_poly(ctx, _crescent_pts(x, y, 11, atan2(uy, ux)), "#ffffff", 3.0)
		# hedef işareti
		_ring(ctx, s.x, s.y, 22 - u * 8, "#7fb2ff", 3.0, 0.4 + u * 0.5)
	else:
		var f: float = 1 - post / K.linger
		var kp := minf(1.0, post / 0.12)
		var r := 34.0 * (_back(kp) if kp < 1.0 else 1.0)
		_pow(ctx, s.x, s.y, r, "#9fd0ff", f, 9, s.seed)
		_pow(ctx, s.x, s.y, r * 0.6, "#ffffff", f, 9, s.seed + 0.2)
		_line(ctx, PackedVector2Array([Vector2(s.x - ux * 30, s.y - uy * 30), Vector2(s.x, s.y)]), "#ffffff", 3.0, f, 2.0)

# ── GÖK ÖFKESİ (şimşek): sarı-beyaz zikzak, mürekkep, sarı POW ──
func _draw_bolt(ctx: Ctx2D, s, u: float, post: float, K) -> void:
	if post < 0:
		_ring(ctx, s.x, s.y, 30 - u * 18, "#6cc8ff", 3.0, 0.5 + u * 0.5)
		return
	var f: float = 1 - post / K.linger
	var flick := 0.75 + 0.25 * sin(post * 60.0)
	var top: float = s.y - 640
	var N := 8
	var P := PackedVector2Array([Vector2(s.x + (_uhash(s.seed, 0) - 0.5) * 60, top)])
	for i in range(1, N + 1):
		var v := float(i) / N
		var jx := 0.0 if i == N else (_uhash(s.seed, i) - 0.5) * 70 * (1 - v * 0.5)
		P.append(Vector2(s.x + jx, top + (s.y - top) * v))
	_line(ctx, P, "#6cc8ff", 12.0, f * flick, 3.0)
	_line(ctx, P, "#fff36b", 5.0, f * flick, 0.0)
	var kp := minf(1.0, post / 0.1)
	_pow(ctx, s.x, s.y, 44.0 * (_back(kp) if kp < 1.0 else 1.0), "#fff36b", f, 10, s.seed)
	_pow(ctx, s.x, s.y, 24.0, "#ffffff", f, 10, s.seed + 0.3)

# ── MAVİ KIYAMET (göktaşı): konturlu alev topu + iz, büyük mavi POW ──
func _draw_meteor(ctx: Ctx2D, s, u: float, post: float, K) -> void:
	if post < 0:
		var e := u * u
		var dx: float = s.x - s.sx
		var dy: float = s.y - s.sy
		var L := JS.hypot(dx, dy)
		var ux := dx / L
		var uy := dy / L
		var x: float = s.sx + dx * e
		var y: float = s.sy + dy * e
		var i := 4
		while i >= 1:
			_disc(ctx, x - ux * i * 20, y - uy * i * 20, 16 - i * 2.6, "#2f8dff" if i > 2 else "#8fd0ff", 0.9, 3.0)
			i -= 1
		_disc(ctx, x, y, 17, "#bfe9ff", 1.0, 4.0)
		_disc(ctx, x - 5, y - 5, 6, "#ffffff", 1.0, 0.0)
		_ring(ctx, s.x, s.y, 70 * (1 - u * 0.3), "#2f8dff", 3.0, 0.3 + u * 0.5)
	else:
		var f: float = 1 - post / K.linger
		var kp := minf(1.0, post / 0.14)
		var r := 92.0 * (_back(kp) if kp < 1.0 else 1.0)
		_pow(ctx, s.x, s.y, r, "#2f8dff", f, 12, s.seed)
		_pow(ctx, s.x, s.y, r * 0.66, "#bfe9ff", f, 12, s.seed + 0.15)
		_pow(ctx, s.x, s.y, r * 0.34, "#ffffff", f, 8, s.seed + 0.4)

# ── gülle / taş: konturlu top + yay, POW ──
func _draw_ball(ctx: Ctx2D, s, u: float, post: float, K, arc_h: float, r: float, c1: String, c2: String) -> void:
	if post < 0:
		var x: float = s.sx + (s.x - s.sx) * u
		var y: float = s.sy + (s.y - s.sy) * u - sin(u * PI) * arc_h
		_disc(ctx, x, y, r, c2, 1.0, 3.5)
		_disc(ctx, x - r * 0.3, y - r * 0.3, r * 0.4, c1, 1.0, 0.0)
		_ring(ctx, s.x, s.y, r * 2.6, c2, 2.5, 0.3 + u * 0.4)
	else:
		var f: float = 1 - post / K.linger
		var kp := minf(1.0, post / 0.1)
		var R := r * 4.2 * (_back(kp) if kp < 1.0 else 1.0)
		_pow(ctx, s.x, s.y, R, c2, f, 9, s.seed)
		_pow(ctx, s.x, s.y, R * 0.55, c1, f, 9, s.seed + 0.3)

# ── GECE HÜKMÜ (kraliçe): mürekkep konturlu çapraz hilal kesikleri ──
func _draw_slash(ctx: Ctx2D, s, u: float, post: float, K) -> void:
	var f: float = 1.0 if post < 0 else 1 - post / K.linger
	var sweep := u if post < 0 else 1.0
	for j in 2:
		var a0: float = s.a + j * 1.7
		ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(a0); ctx.scale(1, SQ)
		ctx.global_alpha = f
		for pass_ in 3:
			ctx.set_stroke([INK, "#9a6aff", "#ffffff"][pass_])
			ctx.line_width = [18.0, 11.0, 4.0][pass_]
			ctx.begin_path(); ctx.arc(0, 0, 52, -1.1, -1.1 + 2.2 * sweep); ctx.stroke()
		ctx.restore()
	if post >= 0:
		_pow(ctx, s.x, s.y, 30.0 * f + 8.0, "#e8d4ff", f, 8, s.seed)

# ── AYAZ SURU (şövalye): mürekkep konturlu buz dikenleri ──
func _draw_spike(ctx: Ctx2D, s, u: float, post: float, K) -> void:
	var rise: float = u if post < 0 else (maxf(0.0, (K.linger - post) / 0.18) if post > K.linger - 0.18 else 1.0)
	if rise <= 0: return
	var h := (42 + _uhash(s.seed, 1) * 22) * rise
	var w := 12.0
	_poly(ctx, PackedVector2Array([Vector2(s.x - w, s.y), Vector2(s.x - w * 0.2, s.y - h), Vector2(s.x + w, s.y)]), "#8fd6ff", 3.0)
	_poly(ctx, PackedVector2Array([Vector2(s.x - w * 0.2, s.y - h), Vector2(s.x + w, s.y), Vector2(s.x + w * 0.2, s.y)]), "#ffffff", 0.0)
	if post >= 0 and post < 0.25:
		_pow(ctx, s.x, s.y, 34, "#bfe9ff", 1 - post / 0.25, 8, s.seed)

# ── SEHER GİRDABI: dönen konturlu güneş kılıçları ──
func _draw_vortex(ctx: Ctx2D, x: float, y: float, r: float, tt: float) -> void:
	var a := _fade_out()
	_pow(ctx, x, y - 10, 30 + sin(tt * 10) * 3, "#ffd98a", a, 10, tt * 3.0, 1.0)
	for j in 3:
		var a0 := tt * 9 + j * (TAU / 3)
		ctx.save(); ctx.translate(x, y); ctx.scale(1, SQ)
		ctx.global_alpha = a
		for pass_ in 3:
			ctx.set_stroke([INK, "#ff9a4a", "#fff4d8"][pass_])
			ctx.line_width = [22.0, 14.0, 5.0][pass_]
			ctx.begin_path(); ctx.arc(0, 0, r, a0, a0 + 1.2); ctx.stroke()
		ctx.restore()

# ── KALE ÇIĞLIĞI (savaşçı): mürekkep şok halkası + çatlaklar ──
func _draw_slam(ctx: Ctx2D, x: float, y: float, r: float, tt: float, dur: float) -> void:
	var u := minf(1.0, tt / dur)
	var a := (1 - u * 0.6) * _fade_out()
	_ring(ctx, x, y, r, "#ff9a6a", 12.0 * (1 - u * 0.5) + 3.0, a)
	ctx.save(); ctx.translate(x, y); ctx.scale(1, SQ)
	ctx.global_alpha = minf(1.0, a * 1.4)
	for pass_ in 2:
		ctx.set_stroke(INK if pass_ == 0 else "#ffcf9a")
		ctx.line_width = 6.0 if pass_ == 0 else 2.0
		for i in 9:
			var aa := i * (TAU / 9) + 0.2
			var L := r * (0.55 + 0.4 * ((i * 37) % 10) / 10.0)
			ctx.begin_path(); ctx.move_to(cos(aa) * 20, sin(aa) * 20)
			ctx.line_to(cos(aa + 0.12) * L * 0.5, sin(aa + 0.12) * L * 0.5)
			ctx.line_to(cos(aa - 0.06) * L, sin(aa - 0.06) * L); ctx.stroke()
	ctx.restore()
	if u < 0.4: _pow(ctx, x, y, 60.0 * (1.0 + u), "#ffd8bf", 1.0 - u / 0.4, 10, 0.3)

# ── HAYALET BORDA (korsan): konturlu yeşil hayalet gemi ──
func _draw_ghost_ship(ctx: Ctx2D, x: float, y: float, tt: float) -> void:
	var a := minf(1.0, tt / 0.3) * _fade_out() * 0.9
	if a <= 0: return
	var bob := sin(tt * 3) * 5
	_poly(ctx, PackedVector2Array([Vector2(x - 90, y + bob), Vector2(x + 90, y + bob), Vector2(x + 64, y + 30 + bob), Vector2(x - 70, y + 30 + bob)]), "#2fcf98", 4.0, a)
	_line(ctx, PackedVector2Array([Vector2(x - 10, y + bob), Vector2(x - 10, y - 90 + bob)]), "#c8ffe6", 4.0, a, 3.0)
	_poly(ctx, PackedVector2Array([Vector2(x - 8, y - 84 + bob), Vector2(x + 34, y - 52 + bob), Vector2(x - 6, y - 22 + bob)]), "#c8ffe6", 3.5, a)
	for i in 4: _disc(ctx, x - 50 + i * 30, y + 14 + bob, 4.5, "#0d3a2a", a, 2.0)
