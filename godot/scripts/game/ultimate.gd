class_name Ultimate
extends RefCounted
## SÜPER YETENEK 3.0 — her kahramanın KENDİNE ÖZGÜ sahnesi (on üç ayrı yetenek, iki kahraman aynı
## şeyi atmaz). Hasar vuruşların İNDİĞİ anda, yalnız vuruş alanında.
##
## ÇİZİM: Borderlands çizgi roman dili (kalın mürekkep kontur + düz doygun renk + POW yıldızları),
## ama her şekil dünya uzayında üçgenlere açılıp DÖRT tamponda toplanır (zemin · parıltı · mürekkep ·
## üst parıltı) ve kare başına dört çizim çağrısıyla gider. Eski yol (şekil başına Ctx2D yolu,
## köşe başına daire, kenar yumuşatmalı çizgi) süper sırasında kareyi 60–90 ms'ye çıkarıyordu.

const ULT_NEED := 80
const ULT_TIER := [null,
	{"r": 250.0, "norm": 0.60, "elite": 0.22, "boss": 0.03, "inv": 1.0, "heal": 0.0,  "n": 1.0, "label": "SIRADAN"},
	{"r": 290.0, "norm": 0.80, "elite": 0.32, "boss": 0.04, "inv": 1.2, "heal": 0.05, "n": 1.2, "label": "NADİR"},
	{"r": 330.0, "norm": 1.00, "elite": 0.45, "boss": 0.05, "inv": 1.5, "heal": 0.10, "n": 1.4, "label": "EPİK"},
	{"r": 380.0, "norm": 1.00, "elite": 0.60, "boss": 0.06, "inv": 1.8, "heal": 0.15, "n": 1.6, "label": "EFSANEVİ"},
]
## k: yetenek türü (her kahramanda farklı) · snd: ses ailesi · col/c2: açık/koyu süper rengi
const ULT_ID := {
	"okcu":     {"name": "AY YAĞMURU",    "col": "#cfe8ff", "c2": "#7fb2ff", "k": "moon",   "snd": "moon",   "base": 16, "hr": 70.0,  "desc": "Gökte hilal doğar; hilal uçlu ay okları sürünün üstüne yağar."},
	"simsek":   {"name": "GÖK ÖFKESİ",    "col": "#fff7b0", "c2": "#6cc8ff", "k": "bolt",   "snd": "bolt",   "base": 10, "hr": 90.0,  "desc": "Gök yarılır; düşmanların üstüne dallanan zikzak yıldırımlar iner."},
	"gokalev":  {"name": "MAVİ KIYAMET",  "col": "#bfe9ff", "c2": "#2f8dff", "k": "meteor", "snd": "meteor", "base": 8,  "hr": 115.0, "desc": "Mavi alevli göktaşları çapraz düşer, yeri kavurarak geniş patlar."},
	"korsan":   {"name": "HAYALET BORDA", "col": "#c8ffe6", "c2": "#2fcf98", "k": "cannon", "snd": "cannon", "base": 10, "hr": 90.0,  "desc": "Arkada hayalet gemi belirir; borda topları sürüyü döver."},
	"sapanci":  {"name": "TAŞ FIRTINASI", "col": "#f0dcb4", "c2": "#a8804a", "k": "stone",  "snd": "stone",  "base": 13, "hr": 70.0,  "desc": "Sapan fırtınası: kayalar kalabalığa yağar, parçalanıp saçılır."},
	"kralice":  {"name": "GECE HÜKMÜ",    "col": "#e8d4ff", "c2": "#9a6aff", "k": "slash",  "snd": "slash",  "base": 14, "hr": 80.0,  "desc": "Karanlıkta çapraz hilal kesikleri açılır, her şeyi biçer."},
	"sovalye":  {"name": "AYAZ SURU",     "col": "#e6f8ff", "c2": "#8fd6ff", "k": "spike",  "snd": "spike",  "base": 0,  "hr": 70.0,  "desc": "Buz surları üç halka hâlinde fışkırır; değdiği düşmanı dondurur."},
	"seher":    {"name": "SEHER GİRDABI", "col": "#fff0c4", "c2": "#ff9a4a", "k": "vortex", "snd": "vortex", "base": 0,  "hr": 0.0,   "desc": "Üç güneş kılıcı dönerek genişler, her şeyi süpürür."},
	"savasci":  {"name": "KALE ÇIĞLIĞI",  "col": "#ffd8bf", "c2": "#d8623a", "k": "slam",   "snd": "slam",   "base": 0,  "hr": 0.0,   "desc": "Kalkan yere iner; çatlaklı şok dalgası yayılır, sürüyü savurur."},
	"mezarci":  {"name": "MEZAR UYANIŞI", "col": "#efe3c6", "c2": "#7a5a3a", "k": "grave",  "snd": "slam",   "base": 14, "hr": 80.0,  "desc": "Toprak yarılır; mezar taşlarıyla kemik eller fışkırır, düşmanı yerine çiviler."},
	"fenerci":  {"name": "RUH KALKANI",   "col": "#d8ffe8", "c2": "#3fdc8a", "k": "ward",   "snd": "vortex", "base": 0,  "hr": 0.0,   "desc": "Fener ruh kubbesi açar: içinde hasar almazsın; kubbe düşmanı yakıp dışarı savurur."},
	"zehra":    {"name": "ZEHİR BATAĞI",  "col": "#e4ffc8", "c2": "#5fc832", "k": "poison", "snd": "meteor", "base": 7,  "hr": 96.0,  "desc": "Zehir şişeleri fırlar; yerde kaynayan batak düşmanı yavaşlatıp eritir."},
	"demirhan": {"name": "ÖRS DÜŞÜŞÜ",    "col": "#fff4c8", "c2": "#ffb43a", "k": "anvil",  "snd": "cannon", "base": 7,  "hr": 100.0, "desc": "Gökten dev örsler iner; çarpınca yer çatlar, yıldız kıvılcımları saçılır."},
}
## yuva türleri: fall = havada/hazırlık süresi · spread = yuvaların yayılma süresi · linger = iz süresi
const KIND := {
	"moon":   {"fall": 0.26, "spread": 1.0,  "linger": 0.55},
	"bolt":   {"fall": 0.16, "spread": 1.15, "linger": 0.26},
	"meteor": {"fall": 0.42, "spread": 1.0,  "linger": 0.5},
	"cannon": {"fall": 0.5,  "spread": 1.0,  "linger": 0.3},
	"stone":  {"fall": 0.34, "spread": 0.9,  "linger": 0.25},
	"slash":  {"fall": 0.1,  "spread": 0.9,  "linger": 0.34},
	"spike":  {"fall": 0.08, "spread": 0.7,  "linger": 0.75},
	"grave":  {"fall": 0.22, "spread": 0.95, "linger": 0.95},
	"poison": {"fall": 0.5,  "spread": 0.7,  "linger": 2.6},
	"anvil":  {"fall": 0.42, "spread": 0.95, "linger": 0.55},
}
const WAVE_KINDS := ["vortex", "slam", "ward"]
const MAXS := 48
const WARD_DUR := 3.6
const WARD_PULSE := 1.15

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
var _tok := 0           # isabet jetonu: her ateşte (ve kubbe nabzında) artar, düşman başına bir vuruş
var _pulse := -1
var _told := false
var _sndT := 0.0
var t := 0.0
var ox := 0.0
var oy := 0.0

func _init(g) -> void:
	game = g
	for i in MAXS:
		S.append({"on": false, "x": 0.0, "y": 0.0, "sx": 0.0, "sy": 0.0, "t": 0.0, "hit": false, "seed": 0.0, "a": 0.0, "sc": 1.0, "d": 0.0})
	reset(1, "")

func reset(rarity, cid) -> void:
	var r := JS.i(rarity)
	rar = maxi(1, mini(4, r if r else 1))
	id = ULT_ID.get(cid, ULT_ID.okcu) if cid else ULT_ID.okcu
	charge = 0; ready = false; fx = 0; uses = 0; _told = false; _sndT = 0
	for s in S: s.on = false
	wave.on = false
	clear_ground()

## zemin ağlarını boşalt (savaş başı / çıkış)
func clear_ground() -> void:
	if game and game.renderer3d: game.renderer3d.ground_fx(PackedVector2Array(), PackedColorArray(), PackedVector2Array(), PackedColorArray())

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

func _hit(e, ang: float, knock := 380.0) -> void:
	if e.hp <= 0 or e._ultN == _tok: return
	e._ultN = _tok
	var T := tier
	var dmg: float
	if e.isBoss: dmg = e.maxHp * T.boss
	elif e.elite: dmg = minf(e.hp - 1, e.maxHp * T.elite)
	else: dmg = e.hp + 1 if T.norm >= 1 else e.maxHp * T.norm
	if dmg > 0: Combat.apply_hit(game, e, ceil(dmg), ang, knock, 0, false)

## alan vuruşu; hold > 0 ise içerdekiler o kadar süre yavaşlar/kımıldayamaz (buz, mezar eli, batak)
func _area(x: float, y: float, r: float, hold := 0.0) -> void:
	var g = game
	var out = g.enemies.query_circle(x, y, r + 30, _sc) if g.enemies else []
	for e in out:
		var dx: float = e.x - x
		var dy: float = e.y - y
		var rr: float = r + e.radius
		if dx * dx + dy * dy <= rr * rr:
			if hold > 0.0 and not e.isBoss and e.hp > 0:
				e.stopT = maxf(e.stopT, hold)
				e.stopMv = true
			_hit(e, atan2(dy, dx))

## kubbe: içeri giren düşman kenara itilir, dışa savrulur ve (nabız başına bir kez) yanar
func _ward_push(x: float, y: float, r: float) -> void:
	var g = game
	var out = g.enemies.query_circle(x, y, r + 40, _sc) if g.enemies else []
	for e in out:
		if e.hp <= 0: continue
		var dx: float = e.x - x
		var dy: float = e.y - y
		var d := sqrt(dx * dx + dy * dy)
		var rr: float = r + e.radius * 0.6
		if d >= rr: continue
		var ux := dx / d if d > 0.01 else cos(e.seed * 7.0)
		var uy := dy / d if d > 0.01 else sin(e.seed * 7.0)
		if not e.isBoss:
			e.x = x + ux * rr
			e.y = y + uy * rr
		e.kx += ux * 240.0
		e.ky += uy * 240.0
		_hit(e, atan2(uy, ux), 520.0)

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
	ready = false; charge = 0; uses += 1; _tok += 1; _pulse = -1
	t = 0; ox = p.x; oy = p.y
	p.invuln = maxf(p.invuln, T.inv)
	if T.heal > 0 and not p.noHeal: p.hp = minf(p.maxHp, p.hp + JS.round_js(p.maxHp * T.heal))
	for s in S: s.on = false
	var k: String = C.k
	if k in WAVE_KINDS:
		var dur := 0.55 if k == "slam" else (WARD_DUR if k == "ward" else 1.05)
		wave.merge({"on": true, "t": 0.0, "dur": dur, "r": 0.0}, true)
		fx = dur + 0.5
		if k == "ward": p.invuln = maxf(p.invuln, WARD_DUR + 0.15)
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
				s.merge({"on": true, "x": p.x + cos(a) * R * f, "y": p.y + sin(a) * R * f * 0.9, "t": -f * 0.55, "hit": false, "seed": randf() * 100, "a": a, "sc": 1.0, "d": 0.0}, true)
			if brk: break
		fx = 1.55
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
			var st: float = -(float(j) / n) * K.spread - randf() * 0.06
			var sc := 1.0
			match k:
				"moon": sx = x - 170; sy = y - 560
				"meteor": sx = x + 360; sy = y - 620
				"cannon": sx = p.x - 260 + (randf() - 0.5) * 60; sy = p.y - 240
				"stone", "poison": sx = p.x; sy = p.y - 30
				"anvil":
					sy = y - 780
					if j == 0: sc = 1.55
				"grave":
					# kahramandan dışa doğru açılan dalga: yakın mezar önce uyanır
					st = -(JS.hypot(x - p.x, y - p.y) / R) * K.spread - randf() * 0.05
			s.merge({"on": true, "x": x, "y": y, "sx": sx, "sy": sy, "t": st, "hit": false, "seed": randf() * 100, "a": randf() * TAU, "sc": sc, "d": 0.0}, true)
		fx = K.spread + K.fall + K.linger + 0.35
	g.add_shake(0.12 + rar * 0.03)
	g.punch(0.03)
	g.audio.ultTier = rar
	g.audio.ultKind = C.snd
	g.audio.play("ultfire")
	g.ui.ult_flash(C.c2, rar)
	Quality.haptic("death")
	return true

func _impact(s: Dictionary) -> void:
	var g = game
	var C := id
	var k: String = C.k
	s.hit = true
	var sc: float = s.sc
	var hr: float = C.hr * sc
	match k:
		"spike": _area(s.x, s.y, hr, 1.6)
		"grave": _area(s.x, s.y, hr, 1.4)
		"poison": _area(s.x, s.y, hr, 0.7)
		_: _area(s.x, s.y, hr)
	if g.props and (k == "meteor" or k == "cannon" or k == "anvil"): g.props.damage_area(s.x, s.y, hr * 0.6, 200)
	var big := k == "meteor" or k == "cannon" or k == "bolt" or k == "anvil"
	if g.in_view(s.x, s.y, 60):
		var c1: String = C.col
		var c2: String = C.c2
		if k == "grave": c1 = "#cbb48c"; c2 = "#5a3e26"
		g.spawn_burst(s.x, s.y, c1, (14 if big else 8) * sc, 300 if big else 200, 3.6 if big else 2.6, 0.5, true)
		g.spawn_burst(s.x, s.y, c2, (10 if big else 5) * sc, 220 if big else 140, 3, 0.55, true)
		g.pools.rings.take().setup(s.x, s.y, hr * (1.2 if big else 0.9), 0.42 if big else 0.3, C.col)
		if big and g.renderer3d: g.renderer3d.spawn_hit(s.x, s.y, 0, 1, 1, 0.6, 0.3)
	if big: g.add_shake(0.05 * sc)
	if _sndT <= 0:
		_sndT = 0.075
		g.audio.ultKind = C.snd
		g.audio.play("ulthit")

func update(dt: float) -> void:
	if fx <= 0: return
	fx = maxf(0.0, fx - dt)
	t += dt
	if _sndT > 0: _sndT -= dt
	var C := id
	var k: String = C.k
	var K = KIND.get(k)
	if K:
		for s in S:
			if not s.on: continue
			s.t += dt
			if not s.hit and s.t >= K.fall: _impact(s)
			# batak: kaynarken içine giren yeni düşmanlar da yavaşlar ve erir
			if k == "poison" and s.hit:
				s.d -= dt
				if s.d <= 0.0:
					s.d = 0.3
					_area(s.x, s.y, C.hr * 0.9, 0.7)
			if s.t > K.fall + K.linger: s.on = false
	var W := wave
	if W.on:
		W.t += dt
		var u := minf(1.0, W.t / W.dur)
		var R: float = tier.r
		var p = game.player
		if k == "ward":
			W.r = R * 0.62 * minf(1.0, W.t / 0.22)
			var pi := int(W.t / WARD_PULSE)
			if pi != _pulse:
				_pulse = pi
				_tok += 1
				if pi > 0:
					game.add_shake(0.06)
					if _sndT <= 0:
						_sndT = 0.2
						game.audio.ultKind = C.snd
						game.audio.play("ulthit")
			_ward_push(p.x, p.y, W.r)
		else:
			W.r = R * (1 - pow(1 - u, 2.2)) if k == "slam" else 40 + (R - 40) * u
			var cx: float = ox if k == "slam" else p.x
			var cy: float = oy if k == "slam" else p.y
			_area(cx, cy, W.r)
			if k == "vortex" and randf() < dt * 30:
				game.spawn_burst(cx + cos(W.t * 9) * W.r, cy + sin(W.t * 9) * W.r * 0.62, C.col, 2, 90, 2.4, 0.4, true)
		if W.t >= W.dur: W.on = false

# ═══════════════════════════════ ÇİZİM ═══════════════════════════════
# Dört tampon (sıra: zemin → parıltı → mürekkep → üst parıltı). Hepsi dünya uzayında; flush'ta
# kameranın zemin izdüşümüyle (ctx.xf) tek seferde çizilir.
const INK := Color("#0d0812")
## ZEMİN İŞARETİ: sq == SQ verilen şekil yere yatıktır ve 3B zemin ağına iner (render3d.ground_fx;
## derinlik testli, karakterler önünde kalır). Perspektifi kamera verir — eskiden 0,62 basıklık
## kamera izdüşümünün ÜSTÜNE ekleniyor, şekiller "çift basık" ve havada duruyordu.
const SQ := 0.9999
const WHITE := Color(1, 1, 1)

var _U := TriBatch.new()   # zemin: gölge, iz, batak, hedef halkası
var _G := TriBatch.new()   # toplamalı yumuşak ışık
var _M := TriBatch.new()   # mürekkep konturlu şekiller
var _T := TriBatch.new()   # toplamalı kıvılcım / parıltı (en üst)
var _GM := TriBatch.new()  # 3B zemin: karışım (iz, batak, krater, çatlak)
var _GA := TriBatch.new()  # 3B zemin: toplamalı ışık (halka, büyü çemberi, yer parıltısı)

## zemin yönlendirmesi: yere yatık (sq == SQ) ya da zemin tamponuna (_U) giden şekil 3B zemine iner
func _gnd(B: TriBatch, sq: float) -> TriBatch:
	if B == _U or B == _GM: return _GM
	if B == _GA: return _GA
	if sq != SQ: return B
	return _GA if (B == _T or B == _G) else _GM
var _lc := WHITE
var _dc := WHITE

## sahneyi tamponlara ekler (çizmez); flush_all ile Vfx katmanıyla birlikte tek seferde çizilir
func render(_ctx: Ctx2D = null) -> void:
	if fx <= 0: return
	var g = game
	var p = g.player
	var C := id
	var k: String = C.k
	var K = KIND.get(k)
	_lc = Color(String(C.col))
	_dc = Color(String(C.c2))
	if k == "moon": _draw_sky_moon(p.x, p.y - 300, t)
	if k == "cannon": _draw_ghost_ship(ox - 260, oy - 250, t)
	if K:
		var tall := k == "moon" or k == "meteor" or k == "anvil" or k == "bolt"
		var mg := 340.0 if tall else 150.0
		for s in S:
			if not s.on or s.t < -0.001: continue
			if not g.in_view(s.x, s.y, mg): continue
			var u := minf(1.0, s.t / K.fall)
			var post: float = s.t - K.fall
			match k:
				"moon": _draw_moon_arrow(s, u, post, K)
				"bolt": _draw_bolt(s, u, post, K)
				"meteor": _draw_meteor(s, u, post, K)
				"cannon": _draw_ball(s, u, post, K, 150, 12, Color("#c8ffe6"), Color("#2fcf98"), true)
				"stone": _draw_ball(s, u, post, K, 110, 9, Color("#f0dcb4"), Color("#a8804a"), false)
				"slash": _draw_slash(s, u, post, K)
				"spike": _draw_spike(s, u, post, K)
				"grave": _draw_grave(s, u, post, K)
				"poison": _draw_poison(s, u, post, K)
				"anvil": _draw_anvil(s, u, post, K)
	var W := wave
	var wr: float = W.r if W.r else tier.r
	if k == "vortex" and (W.on or fx > 0.2): _draw_vortex(p.x, p.y, wr, t)
	if k == "slam" and (W.on or fx > 0.2): _draw_slam(ox, oy, wr, t, W.dur)
	if k == "ward" and (W.on or fx > 0.05): _draw_ward(p.x, p.y, W.r if W.r else tier.r * 0.62, t)

## dört tamponu (süper + Vfx) sırayla çizer, en üste süper adını basar
func flush_all(ctx: Ctx2D) -> void:
	var r3 = game.renderer3d
	if r3:
		r3.ground_fx(_GM.V, _GM.C, _GA.V, _GA.C)
		_GM.V = PackedVector2Array(); _GM.C = PackedColorArray()
		_GA.V = PackedVector2Array(); _GA.C = PackedColorArray()
	ctx.save()
	ctx.global_alpha = 1.0
	_flush(ctx, _GM, false)
	_flush(ctx, _GA, true)
	_flush(ctx, _U, false)
	_flush(ctx, _G, true)
	_flush(ctx, _M, false)
	_flush(ctx, _T, true)
	if fx > 0 and game.player: _draw_title(ctx, game.player.x, game.player.y - 150, t)
	ctx.restore()

func _flush(ctx: Ctx2D, B: TriBatch, add: bool) -> void:
	if B.V.size() >= 3: ctx.tris(B.V, B.C, add)
	B.V = PackedVector2Array()
	B.C = PackedColorArray()

func _fade_out() -> float:
	return minf(1.0, fx / 0.35)

static func _back(k: float) -> float:
	var q := k - 1.0
	return 1.0 + 2.6 * q * q * q + 1.6 * q * q

static func _ca(c: Color, a: float) -> Color:
	return Color(c.r, c.g, c.b, c.a * clampf(a, 0.0, 1.0))

# ── ilkel şekiller (hepsi üçgen; B'ye eklenir) ──

static func _star_pts(c: Vector2, r: float, ri: float, n: int, rot: float, sq: float) -> PackedVector2Array:
	var P := PackedVector2Array()
	P.resize(n * 2)
	for i in n * 2:
		var an := rot + i * PI / n
		var rr := r if i % 2 == 0 else ri
		P[i] = c + Vector2(cos(an) * rr, sin(an) * rr * sq)
	return P

## POW patlama yıldızı: mürekkep zarf + renk (yere yatık)
func _pow(c: Vector2, r: float, col: Color, a := 1.0, n := 10, seed := 0.0, sq := SQ, ink := 3.5) -> void:
	if a <= 0.01 or r <= 0.5: return
	var B := _gnd(_M, sq)
	if ink > 0.0: B.fan(c, _star_pts(c, r + ink * 1.5, r * 0.55 + ink, n, seed, sq), _ca(INK, a))
	B.fan(c, _star_pts(c, r, r * 0.55, n, seed, sq), _ca(col, a))

func _disc(B: TriBatch, c: Vector2, r: float, col: Color, a := 1.0, ink := 3.5, sq := 1.0) -> void:
	if a <= 0.01: return
	B = _gnd(B, sq)
	var seg := clampi(int(r * 0.7) + 8, 10, 26)
	if ink > 0.0: _ell(B, c, r + ink, (r + ink) * sq, _ca(INK, a), seg)
	_ell(B, c, r, r * sq, _ca(col, a), seg)

func _ell(B: TriBatch, c: Vector2, rx: float, ry: float, col: Color, seg := 24) -> void:
	B = _gnd(B, 1.0)
	var p0 := c + Vector2(rx, 0)
	for i in seg:
		var an := (i + 1) * TAU / seg
		var p1 := c + Vector2(cos(an) * rx, sin(an) * ry)
		B._tri(c, p0, p1, col)
		p0 = p1

## yere yatık halka (elips şerit)
func _ring(B: TriBatch, c: Vector2, r: float, w: float, col: Color, sq := SQ, seg := 36) -> void:
	if col.a <= 0.01 or r <= 1.0: return
	B = _gnd(B, sq)
	var r0 := maxf(0.0, r - w * 0.5)
	var r1 := r + w * 0.5
	var a0 := Vector2(r0, 0)
	var b0 := Vector2(r1, 0)
	for i in seg:
		var an := (i + 1) * TAU / seg
		var cs := cos(an)
		var sn := sin(an) * sq
		var a1 := Vector2(cs * r0, sn * r0)
		var b1 := Vector2(cs * r1, sn * r1)
		B._tri(c + a0, c + b0, c + b1, col)
		B._tri(c + a0, c + b1, c + a1, col)
		a0 = a1; b0 = b1

## mürekkep konturlu halka
func _ink_ring(c: Vector2, r: float, w: float, col: Color, a := 1.0, B: TriBatch = null) -> void:
	if a <= 0.01: return
	var BB := B if B else _M
	_ring(BB, c, r, w + 6.0, _ca(INK, a))
	_ring(BB, c, r, w, _ca(col, a))

## kalın çizgi (dörtgen parçalar + yuvarlak eklemler)
func _thick(B: TriBatch, P: PackedVector2Array, w: float, col: Color, caps := true) -> void:
	if P.size() < 2 or col.a <= 0.01: return
	B = _gnd(B, 1.0)
	var h := w * 0.5
	for i in P.size() - 1:
		var a := P[i]
		var b := P[i + 1]
		var d := b - a
		var L := d.length()
		if L < 0.01: continue
		var n := Vector2(-d.y, d.x) / L * h
		B._tri(a + n, b + n, b - n, col)
		B._tri(a + n, b - n, a - n, col)
	if caps and h > 1.5:
		var seg := clampi(int(h) + 4, 6, 12)
		for i in P.size():
			if i == 0 or i == P.size() - 1 or P.size() > 2: _ell(B, P[i], h, h, col, seg)

## mürekkep konturlu çizgi
func _ink_line(P: PackedVector2Array, col: Color, w: float, a := 1.0, ink := 3.0) -> void:
	if a <= 0.01: return
	if ink > 0.0: _thick(_M, P, w + ink * 2.0, _ca(INK, a))
	_thick(_M, P, w, _ca(col, a))

## sivri uçlu yay bıçağı (iki ucu incelen hilal şerit; sq: yere yatıklık)
func _blade(B: TriBatch, c: Vector2, r: float, a0: float, sweep: float, w: float, col: Color, sq := SQ, seg := 16) -> void:
	if col.a <= 0.01 or sweep <= 0.01: return
	B = _gnd(B, sq)
	var pi0 := Vector2.ZERO
	var po0 := Vector2.ZERO
	for i in seg + 1:
		var v := float(i) / seg
		var an := a0 + sweep * v
		var hw := w * 0.5 * pow(sin(PI * v), 0.7)
		var cs := cos(an)
		var sn := sin(an)
		var pin := c + Vector2(cs * (r - hw), sn * (r - hw) * sq)
		var pout := c + Vector2(cs * (r + hw), sn * (r + hw) * sq)
		if i > 0:
			B._tri(pi0, po0, pout, col)
			B._tri(pi0, pout, pin, col)
		pi0 = pin; po0 = pout

## yumuşak ışık (toplamalı tampon)
func _glow(c: Vector2, r: float, col: Color, a: float, sq := SQ, B: TriBatch = null) -> void:
	if a <= 0.01 or r <= 1.0: return
	_gnd(B if B else _G, sq).radial(c, r, _ca(col, a), Color(col.r, col.g, col.b, 0.0), sq, 20)

## hilal (dış yay + iç yay arası şerit)
func _crescent(B: TriBatch, c: Vector2, r: float, rot: float, col: Color, n := 14) -> void:
	var cs := cos(rot)
	var sn := sin(rot)
	var prev_o := Vector2.ZERO
	var prev_i := Vector2.ZERO
	for i in n + 1:
		var an := -PI * 0.5 + PI * float(i) / n
		var o := Vector2(cos(an) * r, sin(an) * r)
		var q := Vector2(cos(an) * r * 0.42 - r * 0.05, sin(an) * r * 0.86)
		var po := c + Vector2(o.x * cs - o.y * sn, o.x * sn + o.y * cs)
		var pq := c + Vector2(q.x * cs - q.y * sn, q.x * sn + q.y * cs)
		if i > 0:
			B._tri(prev_o, po, pq, col)
			B._tri(prev_o, pq, prev_i, col)
		prev_o = po; prev_i = pq

## yumuşak kenarlı leke: merkez rengi cin, kenar noktaları cout (B: zemin tamponu)
func _blob(B: TriBatch, c: Vector2, P: PackedVector2Array, cin: Color, cout: Color) -> void:
	var n := P.size()
	for i in n:
		B.V.append(c); B.V.append(P[i]); B.V.append(P[(i + 1) % n])
		B.C.append(cin); B.C.append(cout); B.C.append(cout)

## dört köşeli kıvılcım yıldızı
func _sparkle(B: TriBatch, c: Vector2, r: float, col: Color, rot := 0.0) -> void:
	if r <= 0.5 or col.a <= 0.01: return
	B.fan(c, _star_pts(c, r, r * 0.28, 4, rot, 1.0), col)

## dışbükey çokgen (mürekkep zarfı merkezden büyütülmüş kopya)
func _ink_poly(P: PackedVector2Array, col: Color, a := 1.0, ink := 3.5) -> void:
	if P.size() < 3 or a <= 0.01: return
	if ink > 0.0:
		var c := Vector2.ZERO
		for q in P: c += q
		c /= P.size()
		var E := PackedVector2Array()
		E.resize(P.size())
		for i in P.size():
			var d := P[i] - c
			var L := d.length()
			E[i] = P[i] + (d / L * ink * 1.4 if L > 0.01 else Vector2.ZERO)
		_M.poly(E, _ca(INK, a))
	_M.poly(P, _ca(col, a))

# ── parlayan enerji ilkelleri (referans: katmanlı ışık — beyaz sıcak çekirdek → renk → saydam) ──

## köşe başı renkli dörtgen şerit: iç (A) ve dış (Bo) kenar dizileri
static func _strip(B: TriBatch, A: PackedVector2Array, Bo: PackedVector2Array, CA: PackedColorArray, CB: PackedColorArray) -> void:
	for i in A.size() - 1:
		B.V.append(A[i]); B.V.append(Bo[i]); B.V.append(Bo[i + 1])
		B.C.append(CA[i]); B.C.append(CB[i]); B.C.append(CB[i + 1])
		B.V.append(A[i]); B.V.append(Bo[i + 1]); B.V.append(A[i + 1])
		B.C.append(CA[i]); B.C.append(CB[i + 1]); B.C.append(CA[i + 1])

## kılıç izi yayı: baş (sweep sonu) parlak ve kalın, kuyruk saydam ve ince; dış kenar parlak, içe söner
func _trail(c: Vector2, r: float, a0: float, sweep: float, w: float, col: Color, a := 1.0, sq := SQ, seg := 20, core := true) -> void:
	if a <= 0.01 or absf(sweep) <= 0.01: return
	var In := PackedVector2Array(); var Mid := PackedVector2Array(); var Out := PackedVector2Array()
	var Ci := PackedColorArray(); var Cm := PackedColorArray(); var Co := PackedColorArray()
	var Wo := PackedVector2Array(); var Cw := PackedColorArray()
	for i in seg + 1:
		var v := float(i) / seg
		var an := a0 + sweep * v
		var hw := w * (0.25 + 0.75 * v)
		var al := a * pow(v, 1.4)
		var d := Vector2(cos(an), sin(an) * sq)
		In.append(c + d * (r - hw)); Mid.append(c + d * (r - hw * 0.25)); Out.append(c + d * (r + hw * 0.12))
		Wo.append(c + d * (r - hw * 0.05))
		Ci.append(Color(col.r, col.g, col.b, 0.0)); Cm.append(_ca(col, al)); Co.append(_ca(col, al * 0.5))
		Cw.append(Color(1, 1, 1, al * 0.95))
	var T := _gnd(_T, sq)
	_strip(T, In, Mid, Ci, Cm)
	_strip(T, Mid, Out, Cm, Co)
	if core: _strip(T, Mid, Wo, Cm, Cw)

## simetrik parlayan hilal yay (iki ucu incelir; dış kenar parlak, içe söner) — kılıç dalgası
func _arc_glow(c: Vector2, r: float, a0: float, sweep: float, w: float, col: Color, a := 1.0, sq := SQ, seg := 16) -> void:
	if a <= 0.01: return
	var In := PackedVector2Array(); var Mid := PackedVector2Array(); var Out := PackedVector2Array()
	var Ci := PackedColorArray(); var Cm := PackedColorArray(); var Co := PackedColorArray(); var Cw := PackedColorArray()
	for i in seg + 1:
		var v := float(i) / seg
		var an := a0 + sweep * v
		var pr := sin(PI * v)
		var hw := w * pr
		var d := Vector2(cos(an), sin(an) * sq)
		In.append(c + d * (r - hw)); Mid.append(c + d * (r - hw * 0.2)); Out.append(c + d * (r + hw * 0.15))
		Ci.append(Color(col.r, col.g, col.b, 0.0)); Cm.append(_ca(col, a * pr)); Co.append(Color(1, 1, 1, a * pr * 0.9))
	var T := _gnd(_T, sq)
	_strip(T, In, Mid, Ci, Cm)
	_strip(T, Mid, Out, Cm, Co)

## yumuşak enerji halkası (iki kenarı saydam, ortası parlak) + ince beyaz çekirdek
func _gring(c: Vector2, r: float, w: float, col: Color, a := 1.0, sq := SQ, seg := 40, core := 0.0) -> void:
	if a <= 0.01 or r <= 1.0: return
	var I := PackedVector2Array(); var M := PackedVector2Array(); var O := PackedVector2Array()
	var Ct := PackedColorArray(); var Cc := PackedColorArray()
	var h := w * 0.5
	for i in seg + 1:
		var an := i * TAU / seg
		var d := Vector2(cos(an), sin(an) * sq)
		I.append(c + d * maxf(0.0, r - h)); M.append(c + d * r); O.append(c + d * (r + h))
		Ct.append(Color(col.r, col.g, col.b, 0.0)); Cc.append(_ca(col, a))
	var T := _gnd(_T, sq)
	_strip(T, I, M, Ct, Cc)
	_strip(T, M, O, Cc, Ct)
	if core > 0.0: _ring(T, c, r, core, Color(1, 1, 1, a * 0.9), sq, seg)

## kıvılcım çizgisi: baş parlak, kuyruk saydam
func _streak(p: Vector2, dir: Vector2, L: float, w: float, col: Color, a := 1.0) -> void:
	if a <= 0.01: return
	var n := Vector2(-dir.y, dir.x) * w * 0.5
	var tail := p - dir * L
	var cc := _ca(col, a)
	var ct := Color(col.r, col.g, col.b, 0.0)
	_T.V.append(p + n); _T.V.append(p - n); _T.V.append(tail)
	_T.C.append(cc); _T.C.append(cc); _T.C.append(ct)
	_T.V.append(p + n * 0.4); _T.V.append(p - n * 0.4); _T.V.append(p - dir * L * 0.5)
	var cw := Color(1, 1, 1, a * 0.9)
	_T.C.append(cw); _T.C.append(cw); _T.C.append(Color(1, 1, 1, 0))

## patlama: beyaz flaş + yayılan enerji halkası + dışa saçılan kıvılcımlar (post: vuruştan beri sn)
func _burst(c: Vector2, post: float, life: float, R: float, col: Color, seed: float, n := 8, a := 1.0) -> void:
	var u := clampf(post / life, 0.0, 1.0)
	var f := (1.0 - u) * a
	if f <= 0.01: return
	var e := 1.0 - pow(1.0 - u, 3.0)
	if post < 0.12: _glow(c, R * 0.9, WHITE, (1.0 - post / 0.12) * 0.9 * a, SQ, _T)
	_glow(c, R * 1.4, col, 0.7 * f)
	_gring(c, R * (0.25 + 0.85 * e), R * 0.28 * (1.0 - u) + 4.0, col, f, SQ, 36, 2.0 * (1.0 - u))
	for i in n:
		var an := seed * 5.0 + i * TAU / n + _uhash(seed, i) * 0.5
		var dir := Vector2(cos(an), sin(an) * SQ).normalized()
		var d := R * (0.2 + 1.1 * e) * (0.7 + 0.5 * _uhash(seed, i + 40))
		_streak(c + dir * d, dir, R * 0.35 * (1.0 - u) + 6.0, 4.0 * (1.0 - u) + 1.5, col, f)

## yerde dönen büyü çemberi (rün çentikli)
func _rune_circle(c: Vector2, r: float, col: Color, rot: float, a := 1.0) -> void:
	if a <= 0.01: return
	_glow(c, r * 1.1, col, 0.3 * a)
	_gring(c, r, 10.0, col, a * 0.9, SQ, 44, 1.6)
	_gring(c, r * 0.78, 6.0, col, a * 0.7, SQ, 40, 1.2)
	for i in 12:
		var an := rot + i * TAU / 12
		var d := Vector2(cos(an), sin(an) * SQ)
		_thick(_GA, PackedVector2Array([c + d * r * 0.8, c + d * r * 0.96]), 2.5, _ca(col, a * 0.85), false)
		var an2 := -rot * 1.3 + (i + 0.5) * TAU / 12
		_sparkle(_GA, c + Vector2(cos(an2), sin(an2) * SQ) * r * 0.89, 4.0, Color(1, 1, 1, a * 0.8), an2)

# ── süper adı: siyah eğik bant üstünde sarı çizgi roman yazısı (patlayarak gelir, 1,3 sn) ──
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
	ctx.text_baseline = "alphabetic"
	var w := ctx.measure_text(nm) + 28
	ctx.global_alpha = a * 0.5; ctx.set_fill("#000000"); ctx.fill_rect(-w * 0.5 + 7, -32 + 8, w, 64)
	ctx.global_alpha = a; ctx.set_fill(INK); ctx.fill_rect(-w * 0.5, -32, w, 64)
	ctx.set_fill(_lc); ctx.fill_rect(-w * 0.5, 24, w, 8)
	ctx.set_fill("#ffd23a"); ctx.fill_text(nm, -w * 0.5 + 14, 18)
	ctx.restore()

# ══ AY YAĞMURU (okçu): gökte parlayan hilal, ışık okları, mavi-beyaz ışık patlaması ══
func _draw_sky_moon(x: float, y: float, tt: float) -> void:
	var fo := _fade_out()
	var k := minf(1.0, tt / 0.32)
	var s := (_back(k) if k < 1.0 else 1.0 + sin(tt * 4.0) * 0.03) * fo
	if s <= 0.01: return
	var r := (44.0 + rar * 4.0) * s
	var c := Vector2(x, y)
	_glow(c, r * 4.0, _dc, 0.5 * fo, 1.0)
	_glow(c, r * 1.8, _lc, 0.45 * fo, 1.0)
	_gring(c, r * 1.55 + sin(tt * 3.0) * 4.0, 8.0, _dc, 0.8 * fo, 1.0, 40, 1.4)
	_crescent(_G, c, r * 1.08, -0.5, _ca(_dc, 0.8 * fo))
	_crescent(_M, c, r, -0.5, _ca(Color("#eaf4ff"), fo))
	_crescent(_T, c + Vector2(r * 0.05, r * 0.05), r * 0.82, -0.5, _ca(WHITE, 0.6 * fo))
	for i in 5:
		var a := tt * 1.6 + i * TAU / 5
		_sparkle(_T, c + Vector2(cos(a) * r * 1.55, sin(a) * r * 1.55), 8.0 + 3.0 * sin(tt * 7.0 + i), _ca(WHITE, fo * 0.9), tt)

func _draw_moon_arrow(s, u: float, post: float, K) -> void:
	var tg := Vector2(s.x, s.y)
	var st := Vector2(s.sx, s.sy)
	var dv := tg - st
	var ud := dv.normalized()
	if post < 0:
		var pos := st + dv * (u * u)
		_streak(pos, ud, 150.0, 9.0, _dc, 0.9)
		_streak(pos, ud, 90.0, 4.0, _lc, 1.0)
		_glow(pos, 26, _lc, 0.7, 1.0, _T)
		_crescent(_T, pos, 10, ud.angle(), WHITE)
		_gring(tg, 26 - u * 10, 6.0, _dc, 0.3 + u * 0.6, SQ, 24)
	else:
		_burst(tg, post, K.linger, 58.0, _dc, s.seed, 7)
		_glow(tg, 30, _lc, 0.8 * maxf(0.0, 1.0 - post / 0.2), SQ, _T)
		var f: float = 1 - post / K.linger
		_ink_line(PackedVector2Array([tg - ud * 26, tg]), _lc, 3.0, f, 1.5)

# ══ GÖK ÖFKESİ (şimşek): dallanan katmanlı yıldırım (geniş renk ışığı → beyaz çekirdek) ══
func _draw_bolt(s, u: float, post: float, K) -> void:
	var tg := Vector2(s.x, s.y)
	if post < 0:
		_gring(tg, 34 - u * 20, 8.0, _dc, 0.4 + u * 0.6, SQ, 28, 1.0)
		_glow(tg, 70, _dc, 0.4 * u)
		return
	var f: float = 1 - post / K.linger
	var flick := 0.7 + 0.3 * sin(post * 70.0)
	var top: float = s.y - 640
	var N := 9
	var P := PackedVector2Array([Vector2(s.x + (_uhash(s.seed, 0) - 0.5) * 60, top)])
	for i in range(1, N + 1):
		var v := float(i) / N
		var jx := 0.0 if i == N else (_uhash(s.seed, i) - 0.5) * 74 * (1 - v * 0.5)
		P.append(Vector2(s.x + jx, top + (s.y - top) * v))
	var bi := 3 + int(_uhash(s.seed, 9) * 3)
	var bs := 1.0 if _uhash(s.seed, 10) > 0.5 else -1.0
	var Bp := PackedVector2Array([P[bi], P[bi] + Vector2(bs * 46, 50), P[bi] + Vector2(bs * 64, 90), P[bi] + Vector2(bs * 86, 130)])
	var fa := f * flick
	_glow(Vector2(s.x, (top + s.y) * 0.5), 140, _dc, 0.3 * fa, 3.2)
	_thick(_T, P, 26.0, _ca(_dc, 0.28 * fa))
	_thick(_T, P, 11.0, _ca(_dc, 0.8 * fa))
	_thick(_T, P, 4.0, Color(1, 1, 1, fa))
	_thick(_T, Bp, 12.0, _ca(_dc, 0.3 * fa))
	_thick(_T, Bp, 3.0, _ca(_lc, fa))
	_burst(tg, post, K.linger + 0.1, 90.0, _dc, s.seed, 9)
	_glow(tg, 50, Color("#fff7b0"), 0.9 * f, SQ, _T)

# ══ MAVİ KIYAMET (göktaşı): alev kuyruklu ateş topu, alev halkası, kavrulmuş krater ══
func _draw_meteor(s, u: float, post: float, K) -> void:
	var tg := Vector2(s.x, s.y)
	if post < 0:
		var st := Vector2(s.sx, s.sy)
		var dv := tg - st
		var ud := dv.normalized()
		var pos := st + dv * (u * u)
		_ell(_U, tg, 40 * u + 10, (40 * u + 10) * SQ, _ca(INK, 0.35 * u))
		_gring(tg, 76 * (1 - u * 0.3), 10.0, _dc, 0.3 + u * 0.6, SQ, 36, 1.2)
		_glow(pos, 90, _dc, 0.65, 1.0)
		_streak(pos, ud, 200.0, 40.0, _dc, 0.8)
		_streak(pos, ud, 130.0, 20.0, _lc, 0.9)
		_disc(_M, pos, 16, _dc, 1.0, 3.5)
		_disc(_M, pos, 12, _lc, 1.0, 0.0)
		_glow(pos, 22, WHITE, 1.0, 1.0, _T)
	else:
		var f: float = 1 - post / K.linger
		_ell(_U, tg, 72, 72 * SQ, _ca(Color("#0a1426"), 0.6 * minf(1.0, f * 1.6)))
		_ring(_U, tg, 64, 6, _ca(_dc, 0.6 * f))
		_burst(tg, post, K.linger, 130.0, _dc, s.seed, 11)
		var pu := minf(1.0, post / 0.35)
		_gring(tg, 40 + 70 * pu, 26 * (1.0 - pu) + 4, _lc, (1.0 - pu), SQ, 36, 2.0)

# ══ gülle / taş: konturlu top + yay, ışık patlaması ══
func _draw_ball(s, u: float, post: float, K, arc_h: float, r: float, c1: Color, c2: Color, flash: bool) -> void:
	var tg := Vector2(s.x, s.y)
	if post < 0:
		var pos := Vector2(s.sx + (s.x - s.sx) * u, s.sy + (s.y - s.sy) * u - sin(u * PI) * arc_h)
		if flash and u < 0.2:
			_glow(Vector2(s.sx, s.sy), 80, c2, 1.0 - u / 0.2, 1.0, _T)
			_burst(Vector2(s.sx, s.sy), u * K.fall, 0.2 * K.fall + 0.05, 34.0, c1, s.seed, 5)
		_ell(_U, tg, r * 1.4 * u + 2, (r * 1.4 * u + 2) * SQ, _ca(INK, 0.3 * u))
		if flash: _glow(pos, r * 3.0, c2, 0.6, 1.0)
		_disc(_M, pos, r, c2, 1.0, 3.5)
		_disc(_M, pos - Vector2(r, r) * 0.3, r * 0.4, c1, 1.0, 0.0)
		_gring(tg, r * 2.8, 5.0, c2, 0.3 + u * 0.5, SQ, 24)
	else:
		var f: float = 1 - post / K.linger
		_burst(tg, post, K.linger, r * 5.2, c2 if flash else c1, s.seed, 7)
		if not flash and post < 0.14:
			_pow(tg, r * 3.6 * (1.0 - post / 0.14) + 6.0, c1, 1.0 - post / 0.14, 9, s.seed)
		for i in 5:
			var an: float = s.seed + i * 1.26
			var d := 18.0 + post * 260.0
			var q := tg + Vector2(cos(an) * d, sin(an) * d * SQ - sin(minf(1.0, post / K.linger) * PI) * 26.0)
			_disc(_M, q, 4.0 * f + 1.0, c2 if not flash else Color("#26302c"), f, 2.0)

# ══ GECE HÜKMÜ (kraliçe): çapraz kılıç izleri (mor ışık → beyaz kenar), kesik çizgisi ══
func _draw_slash(s, u: float, post: float, K) -> void:
	var f: float = 1.0 if post < 0 else 1 - post / K.linger
	var tg := Vector2(s.x, s.y)
	var sweep := (u if post < 0 else 1.0) * 2.6
	for j in 2:
		var a0: float = s.a + j * 1.7
		var fo := f if post < 0 else f * f
		_trail(tg, 84, a0, sweep, 44.0, _dc, fo, SQ, 20)
		_trail(tg, 70, a0 + 0.2, sweep * 0.85, 18.0, _lc, fo * 0.7, SQ, 14, false)
	_glow(tg, 90, _dc, 0.45 * f)
	if post >= 0:
		_burst(tg, post, K.linger, 60.0, _dc, s.seed, 6, 0.9)
		var cl := 1.0 - minf(1.0, post / 0.18)
		var an: float = s.a + 0.6
		var d := Vector2(cos(an), sin(an) * SQ)
		_thick(_T, PackedVector2Array([tg - d * 90, tg + d * 90]), 7.0 * cl, Color(1, 1, 1, cl))

# ══ AYAZ SURU (şövalye): kristal buz dikenleri + kırağı halkası (dondurur) ══
func _draw_spike(s, u: float, post: float, K) -> void:
	var rise: float = u if post < 0 else (maxf(0.0, (K.linger - post) / 0.2) if post > K.linger - 0.2 else 1.0)
	if rise <= 0: return
	var b := Vector2(s.x, s.y)
	var h := (48 + _uhash(s.seed, 1) * 26) * rise
	var w := 12.0
	var lean := (_uhash(s.seed, 2) - 0.5) * 10.0
	_ell(_U, b, 36, 36 * SQ, _ca(_lc, 0.3 * rise))
	_gring(b, 32, 8.0, _dc, 0.7 * rise, SQ, 24, 1.0)
	_glow(b - Vector2(0, h * 0.45), h * 0.9, _dc, 0.45 * rise, 1.2)
	var h2 := h * 0.55
	_ink_poly(PackedVector2Array([b + Vector2(w * 0.4, 2), b + Vector2(w * 1.9 + lean, -h2), b + Vector2(w * 2.2, 2)]), _dc, 1.0, 3.0)
	var tip := b + Vector2(lean - w * 0.2, -h)
	_ink_poly(PackedVector2Array([b + Vector2(-w, 0), tip, b + Vector2(w, 0)]), _dc, 1.0, 3.0)
	_M.poly(PackedVector2Array([tip, b + Vector2(w, 0), b + Vector2(w * 0.15, 0)]), _ca(_lc, 1.0))
	_M.poly(PackedVector2Array([tip, b + Vector2(w * 0.15, 0), b + Vector2(w * 0.05, -h * 0.25)]), WHITE)
	_sparkle(_T, tip, 9.0 + 3.0 * sin(t * 9.0 + s.seed), Color(1, 1, 1, 0.9 * rise), t * 2.0)
	if post >= 0: _burst(b, post, 0.35, 46.0, _lc, s.seed, 5)

# ══ SEHER GİRDABI: dönen güneş kılıcı izleri + yerde altın büyü çemberi ══
func _draw_vortex(x: float, y: float, r: float, tt: float) -> void:
	var a := _fade_out()
	var c := Vector2(x, y)
	_rune_circle(c, r * 0.55, _dc, tt * 1.5, 0.8 * a)
	_glow(c, r * 1.1, _dc, 0.3 * a)
	_glow(c - Vector2(0, 12), 48, Color("#fff4d8"), 0.8 * a, 1.0, _T)
	for j in 3:
		var a0 := tt * 9 + j * (TAU / 3)
		_trail(c, r, a0, 1.8, 40.0, _dc, a, SQ, 22)
		_trail(c, r * 0.7, a0 + 1.0, 1.1, 18.0, _lc, a * 0.7, SQ, 14, false)
	_gring(c, r, 8.0, _lc, 0.35 * a, SQ, 44)

# ══ KALE ÇIĞLIĞI (savaşçı): yerden yayılan şok dalgası + çatlaklar + toz ══
func _draw_slam(x: float, y: float, r: float, tt: float, dur: float) -> void:
	var u := minf(1.0, tt / dur)
	var a := (1 - u * 0.6) * _fade_out()
	var c := Vector2(x, y)
	_glow(c, r * 1.05, _dc, 0.4 * a)
	_gring(c, r, 46.0 * (1 - u * 0.5) + 8.0, _dc, a, SQ, 48, 3.0 * (1.0 - u))
	_gring(c, r * 0.82, 18.0, _lc, a * 0.5, SQ, 40)
	var ca := minf(1.0, a * 1.4)
	for i in 9:
		var aa := i * (TAU / 9) + 0.2
		var L := r * (0.55 + 0.4 * ((i * 37) % 10) / 10.0)
		var P := PackedVector2Array([c + Vector2(cos(aa) * 20, sin(aa) * 20 * SQ),
			c + Vector2(cos(aa + 0.12) * L * 0.5, sin(aa + 0.12) * L * 0.5 * SQ),
			c + Vector2(cos(aa - 0.06) * L, sin(aa - 0.06) * L * SQ)])
		_thick(_U, P, 6.0, _ca(INK, ca), false)
		_thick(_T, P, 2.5, _ca(_dc, ca), false)
	for i in 8:
		var an := i * TAU / 8 + 0.4
		_disc(_M, c + Vector2(cos(an) * r, sin(an) * r * SQ), 10.0 * (1 - u) + 3.0, Color("#d8c2a8"), a * 0.7, 0.0)
	if u < 0.35: _glow(c, 120, WHITE, (1.0 - u / 0.35) * 0.8, SQ, _T)

# ══ HAYALET BORDA (korsan): parlayan yeşil hayalet gemi ══
func _draw_ghost_ship(x: float, y: float, tt: float) -> void:
	var a := minf(1.0, tt / 0.3) * _fade_out() * 0.92
	if a <= 0: return
	var bob := sin(tt * 3) * 5
	var o := Vector2(x, y + bob)
	_glow(o + Vector2(0, -30), 200, _dc, 0.55 * a, 0.7)
	_ink_poly(PackedVector2Array([o + Vector2(-90, 0), o + Vector2(90, 0), o + Vector2(64, 30), o + Vector2(-70, 30)]), _dc, a, 4.0)
	_ink_line(PackedVector2Array([o + Vector2(-10, 0), o + Vector2(-10, -90)]), _lc, 4.0, a, 3.0)
	_ink_poly(PackedVector2Array([o + Vector2(-8, -84), o + Vector2(34, -52), o + Vector2(-6, -22)]), _lc, a, 3.5)
	for i in 4:
		_disc(_M, o + Vector2(-50 + i * 30, 14), 4.5, Color("#0d3a2a"), a, 2.0)
		_glow(o + Vector2(-50 + i * 30, 14), 12, _lc, a * (0.5 + 0.5 * sin(tt * 8.0 + i)), 1.0, _T)
	for i in 3:
		var ph := fmod(tt * 0.8 + i * 0.33, 1.0)
		_glow(o + Vector2(-70 + i * 60, 34 + ph * 20), 30, _dc, 0.4 * (1.0 - ph) * a, 0.6, _T)

# ══ MEZAR UYANIŞI (mezarcı): yeşil ruh ışığında yarılan toprak, mezar taşı + kemik eller ══
func _draw_grave(s, u: float, post: float, K) -> void:
	var b := Vector2(s.x, s.y)
	var dirt := Color("#5a3e26")
	var dirt2 := Color("#8a6440")
	var bone := Color("#efe3c6")
	var soul := Color("#7dffb0")
	if post < 0:
		_ell(_U, b, 30 * u + 6, (30 * u + 6) * SQ, _ca(INK, 0.45 * u))
		_gring(b, 26 * u + 6, 8.0, soul, 0.6 * u, SQ, 20)
		for i in 3:
			var an: float = s.a + i * 2.1
			var L := 34.0 * u
			var P := PackedVector2Array([b, b + Vector2(cos(an) * L * 0.6, sin(an) * L * 0.6 * SQ), b + Vector2(cos(an + 0.3) * L, sin(an + 0.3) * L * SQ)])
			_thick(_U, P, 3.5, _ca(INK, 0.8 * u), false)
			_thick(_T, P, 1.6, _ca(soul, 0.9 * u), false)
		return
	var L: float = K.linger
	var sink := 1.0 if post < L - 0.25 else maxf(0.0, (L - post) / 0.25)
	var kp := minf(1.0, post / 0.16)
	var rise := (_back(kp) if kp < 1.0 else 1.0) * sink
	if rise <= 0.01: return
	_ell(_U, b, 40, 40 * SQ, _ca(Color("#1a0f08"), 0.6 * sink))
	_gring(b, 38, 10.0, soul, 0.5 * sink, SQ, 24)
	_glow(b - Vector2(0, 26), 80, soul, 0.35 * sink, 1.0)
	_disc(_M, b + Vector2(0, 2), 30, dirt, sink, 3.0, 0.42)
	var tw := 15.0
	var th := 40.0 * rise
	var tb := b + Vector2(-6, -2)
	var lean: float = (_uhash(s.seed, 3) - 0.5) * 0.25
	var tq := tb + Vector2(lean * th, -th)
	var P2 := PackedVector2Array()
	P2.append(tb + Vector2(-tw, 0))
	for i in 9:
		var an := PI + PI * i / 8.0
		P2.append(tq + Vector2(cos(an) * tw, sin(an) * tw * 0.9))
	P2.append(tb + Vector2(tw, 0))
	_ink_poly(P2, Color("#8e8a96"), 1.0, 3.5)
	_thick(_T, PackedVector2Array([tq + Vector2(0, -2), tq + Vector2(0, 16)]), 3.0, _ca(soul, 0.9), false)
	_thick(_T, PackedVector2Array([tq + Vector2(-6, 4), tq + Vector2(6, 4)]), 3.0, _ca(soul, 0.9), false)
	for hnd in 2:
		var side := -1.0 if hnd == 0 else 1.0
		var hb := b + Vector2(side * 22 + 4, 4)
		var hh := (30.0 + _uhash(s.seed, 4 + hnd) * 10.0) * rise
		var wr := hb + Vector2(side * 4, -hh)
		var reach := sin(post * 9.0 + hnd) * 0.18
		_ink_line(PackedVector2Array([hb, wr]), bone, 5.0, 1.0, 2.5)
		_disc(_M, wr, 6.0, bone, 1.0, 2.5)
		for fi in 4:
			var fa := -PI * 0.5 + (fi - 1.5) * 0.42 + side * 0.15 + reach
			var f1 := wr + Vector2(cos(fa), sin(fa)) * 9.0
			var f2 := f1 + Vector2(cos(fa + side * 0.5), sin(fa + side * 0.5)) * 7.0
			_ink_line(PackedVector2Array([wr, f1, f2]), bone, 2.6, 1.0, 1.8)
	# yükselen ruh kıvılcımları
	for i in 3:
		var ph := fmod(post * 0.9 + _uhash(s.seed, i + 50), 1.0)
		var q := b + Vector2((_uhash(s.seed, i + 52) - 0.5) * 50.0, -ph * 80.0)
		_sparkle(_T, q, 6.0 * (1.0 - ph) + 1.0, _ca(soul, (1.0 - ph) * sink), ph * 4.0)
	if post < 0.3:
		var pf := 1.0 - post / 0.3
		_pow(b - Vector2(0, 6), 40 * (_back(minf(1.0, post / 0.12)) if post < 0.12 else 1.0), dirt2, pf, 9, s.seed)
		_burst(b, post, 0.4, 56.0, soul, s.seed, 6)
		for i in 5:
			var an: float = s.seed + i * 1.25
			var d := 14.0 + post * 200.0
			_disc(_M, b + Vector2(cos(an) * d, -sin(post / 0.3 * PI) * 40.0 + sin(an) * d * SQ), 4.0, dirt2, pf, 2.0)

# ══ RUH KALKANI (fenerci): yerde ruh çemberi, saydam enerji kubbesi, dönen ruh alevleri, nabız ══
func _draw_ward(x: float, y: float, r: float, tt: float) -> void:
	var c := Vector2(x, y)
	var fo := _fade_out()
	var k := minf(1.0, tt / 0.3)
	var s := (_back(k) if k < 1.0 else 1.0 + sin(tt * 5.0) * 0.015) * fo
	if s <= 0.01: return
	var R := r * s
	var H := R * 1.35
	var spirit := Color("#9dffc8")
	# zemin büyü çemberi
	_ell(_U, c, R, R * SQ, _ca(_dc, 0.14 * fo), 40)
	_rune_circle(c, R, _dc, tt * 0.9, fo)
	# kubbe: iç ışık + gradyan kabuk (kenarda parlak, merkeze doğru söner)
	_glow(c - Vector2(0, H * 0.4), R * 1.1, _dc, 0.22 * fo, 0.85)
	var I := PackedVector2Array(); var O := PackedVector2Array()
	var Ci := PackedColorArray(); var Co := PackedColorArray()
	for i in 25:
		var an := PI * i / 24.0
		var d := Vector2(-cos(an), -sin(an))
		O.append(c + Vector2(d.x * R, d.y * H))
		I.append(c + Vector2(d.x * R * 0.8, d.y * H * 0.8))
		var shim := 0.75 + 0.25 * sin(an * 6.0 - tt * 4.0)
		Co.append(_ca(_dc, 0.75 * fo * shim)); Ci.append(Color(_dc.r, _dc.g, _dc.b, 0.0))
	_strip(_T, I, O, Ci, Co)
	_thick(_T, O, 2.5, _ca(WHITE, 0.75 * fo), false)
	for m in [0.32, 0.66]:
		var mer := PackedVector2Array()
		for i in 13:
			var an := PI * i / 12.0
			mer.append(c + Vector2(cos(an) * R * m, -sin(an) * H))
		_thick(_T, mer, 1.8, _ca(spirit, 0.3 * fo), false)
	# nabız
	var pt := fmod(tt, WARD_PULSE)
	if tt < WARD_DUR and pt < 0.55:
		var pu := pt / 0.55
		_gring(c, R * (0.2 + 0.9 * pu), 30.0 * (1.0 - pu) + 6.0, spirit, (1.0 - pu) * fo, SQ, 40, 2.0 * (1.0 - pu))
		if pt < 0.1: _glow(c - Vector2(0, H * 0.4), R, WHITE, (1.0 - pt / 0.1) * 0.4 * fo, 0.8, _T)
	# dönen ruh alevleri
	for i in 6:
		var an := tt * 2.2 + i * TAU / 6
		var hy := -H * (0.25 + 0.2 * sin(tt * 3.0 + i))
		var q := c + Vector2(cos(an) * R * 0.98, sin(an) * R * 0.98 * SQ + hy)
		var fr := 7.0 + 2.0 * sin(tt * 9.0 + i)
		_glow(q, 30, _dc, 0.7 * fo, 1.0, _T)
		_streak(q, Vector2(-sin(an), cos(an) * SQ).normalized(), 40.0, fr * 1.4, spirit, 0.7 * fo)
		_glow(q, fr, WHITE, fo, 1.0, _T)
	# tepede ruh feneri
	var sw := sin(tt * 2.4) * 0.2
	var lp := c + Vector2(sin(sw) * 18.0, -H - 26.0)
	_glow(lp, 70, _dc, 0.9 * fo, 1.0, _T)
	_ink_line(PackedVector2Array([lp + Vector2(0, -18), lp + Vector2(0, -8)]), Color("#3a3644"), 2.5, fo, 2.0)
	_ink_poly(PackedVector2Array([lp + Vector2(-9, -8), lp + Vector2(9, -8), lp + Vector2(11, 10), lp + Vector2(-11, 10)]), Color("#2a2a34"), fo, 3.0)
	_M.poly(PackedVector2Array([lp + Vector2(-6, -5), lp + Vector2(6, -5), lp + Vector2(7, 7), lp + Vector2(-7, 7)]), _ca(spirit, fo))
	_glow(lp + Vector2(0, 1), 10, WHITE, fo, 1.0, _T)

# ══ ZEHİR BATAĞI (cadı): parlayan şişe, kaynayan zehir batağı, kabarcık ve buhar ══
func _draw_poison(s, u: float, post: float, K) -> void:
	var tg := Vector2(s.x, s.y)
	var tox := Color("#b6ff5a")
	var deep := Color("#1f4a12")
	if post < 0:
		var pos := Vector2(s.sx + (s.x - s.sx) * u, s.sy + (s.y - s.sy) * u - sin(u * PI) * 170.0)
		var rot: float = s.a + u * 9.0
		_ell(_U, tg, 26 * u + 4, (26 * u + 4) * SQ, _ca(INK, 0.3 * u))
		_glow(pos, 46, _dc, 0.8, 1.0, _T)
		_disc(_M, pos, 10, Color(0.2, 0.42, 0.1), 1.0, 0.0)
		_disc(_M, pos, 7.5, tox, 1.0, 0.0)
		var nk := pos + Vector2(cos(rot), sin(rot)) * 11.0
		_thick(_M, PackedVector2Array([pos, nk]), 4.0, Color("#c8b48a"))
		_glow(pos - Vector2(3, 3), 6, WHITE, 0.9, 1.0, _T)
		_streak(pos, Vector2(s.x - s.sx, s.y - s.sy).normalized(), 40.0, 10.0, tox, 0.6)
		_gring(tg, 44, 7.0, _dc, 0.25 + u * 0.5, SQ, 28)
		return
	var L: float = K.linger
	var grow := minf(1.0, post / 0.2)
	var a := 1.0 if post < L - 0.45 else maxf(0.0, (L - post) / 0.45)
	var R: float = id.hr * (0.55 + 0.45 * _back(grow) if grow < 1.0 else 1.0)
	# zehirlenmiş zemin: yumuşak kenarlı koyu leke (çürümüş toprak) → ıslak zehir gölü → ince ışıma
	var n := 22
	var P := PackedVector2Array(); var P2 := PackedVector2Array(); var Pk := PackedVector2Array()
	P.resize(n); P2.resize(n); Pk.resize(n)
	for i in n:
		var an := i * TAU / n
		var wob := 1.0 + 0.12 * sin(an * 3.0 + s.seed) + 0.07 * sin(an * 5.0 + s.seed * 2.0 + t * 1.5)
		var d := Vector2(cos(an), sin(an)) * R * wob
		P[i] = tg + d * 0.86; P2[i] = tg + d * 0.55; Pk[i] = tg + d * 1.25
	_blob(_GM, tg, Pk, Color(0.04, 0.07, 0.02, 0.62 * a), Color(0.04, 0.07, 0.02, 0.0))
	_blob(_GM, tg, P, Color(0.10, 0.22, 0.05, 0.85 * a), Color(0.13, 0.30, 0.06, 0.55 * a))
	_blob(_GM, tg + Vector2(-R * 0.1, -R * 0.08), P2, Color(0.40, 0.75, 0.14, 0.32 * a), Color(0.25, 0.5, 0.1, 0.0))
	_glow(tg, R * 0.9, _dc, 0.14 * a)
	for i in 4:
		var ph := fmod(t * 1.6 + _uhash(s.seed, i) * 3.0, 1.0)
		var an: float = _uhash(s.seed, i + 7) * TAU
		var d: float = _uhash(s.seed, i + 13) * R * 0.6
		var q := tg + Vector2(cos(an) * d, sin(an) * d * SQ)
		if ph < 0.8:
			# zeminde kabaran ıslak kabarcık (konturs uz, parlak tepe noktası)
			var br := 3.0 + 7.0 * (ph / 0.8)
			_disc(_GM, q, br, Color(0.16, 0.36, 0.07), a, 0.0, SQ)
			_disc(_GM, q - Vector2(br * 0.1, br * 0.1), br * 0.78, Color(0.45, 0.82, 0.18), a * 0.9, 0.0, SQ)
			_glow(q - Vector2(br * 0.3, br * 0.35), br * 0.5, WHITE, 0.7 * a)
		else:
			var pp := (ph - 0.8) / 0.2
			_gring(q, 6.0 + pp * 14.0, 4.0, tox, (1.0 - pp) * a, SQ, 16)
	for i in 3:
		var ph := fmod(t * 0.9 + _uhash(s.seed, i + 20), 1.0)
		var q := tg + Vector2((_uhash(s.seed, i + 22) - 0.5) * R, -ph * 80.0)
		_glow(q, 22.0 + ph * 18.0, tox, 0.4 * (1.0 - ph) * a, 1.0, _T)
	if post < 0.3:
		_burst(tg, post, 0.4, 70.0, tox, s.seed, 7)

# ══ ÖRS DÜŞÜŞÜ (demirhan): akkor kenarlı dev örsler, ateş halkası, yıldız kıvılcımları ══
func _anvil_shape(c: Vector2, k: float, a: float, hot: float) -> void:
	var steel := Color("#4a505e")
	var face := Color("#9aa3b8")
	var base := PackedVector2Array([c + Vector2(-26, 0) * k, c + Vector2(26, 0) * k, c + Vector2(20, -10) * k, c + Vector2(-20, -10) * k])
	var waist := PackedVector2Array([c + Vector2(-12, -10) * k, c + Vector2(12, -10) * k, c + Vector2(16, -24) * k, c + Vector2(-16, -24) * k])
	var top := PackedVector2Array([c + Vector2(-30, -24) * k, c + Vector2(34, -24) * k, c + Vector2(34, -38) * k, c + Vector2(-30, -38) * k])
	var horn := PackedVector2Array([c + Vector2(-30, -38) * k, c + Vector2(-30, -26) * k, c + Vector2(-58, -36) * k])
	_ink_poly(base, steel, a, 3.5)
	_ink_poly(waist, steel, a, 3.5)
	_ink_poly(horn, steel, a, 3.5)
	_ink_poly(top, steel, a, 3.5)
	_M.poly(PackedVector2Array([c + Vector2(-30, -38) * k, c + Vector2(34, -38) * k, c + Vector2(34, -34) * k, c + Vector2(-30, -34) * k]), _ca(face, a))
	if hot > 0.01:
		_thick(_T, PackedVector2Array([c + Vector2(-30, -24) * k, c + Vector2(34, -24) * k]), 3.0 * k, _ca(_dc, hot * a), false)
		_thick(_T, PackedVector2Array([c + Vector2(-26, -1) * k, c + Vector2(26, -1) * k]), 2.5 * k, _ca(_dc, hot * a), false)
		_glow(c + Vector2(0, -24) * k, 40 * k, _dc, 0.5 * hot * a, 0.6, _T)

func _draw_anvil(s, u: float, post: float, K) -> void:
	var tg := Vector2(s.x, s.y)
	var sc: float = s.sc
	if post < 0:
		var e := u * u * u
		var pos := Vector2(s.x, s.sy + (s.y - s.sy) * e)
		_ell(_U, tg, (14 + 30 * u) * sc, (14 + 30 * u) * sc * SQ, _ca(INK, 0.55 * u))
		_gring(tg, 58 * sc * (1.2 - u * 0.4), 10.0, _dc, 0.3 + u * 0.6, SQ, 32, 1.2)
		for i in 3:
			var lx := pos.x + (i - 1) * 22.0 * sc
			_streak(Vector2(lx, pos.y - 46 * sc), Vector2(0, 1), 120.0 * sc, 4.0, _lc, 0.8)
		_glow(pos - Vector2(0, 20 * sc), 70 * sc, _dc, 0.55, 1.0)
		_anvil_shape(pos, sc, 1.0, 0.8)
		return
	var L: float = K.linger
	var f: float = 1 - post / L
	_ell(_U, tg, 52 * sc, 52 * sc * SQ, _ca(Color("#120c06"), 0.55 * minf(1.0, f * 1.6)))
	for i in 6:
		var an: float = s.seed + i * TAU / 6
		var Lc := (60.0 + _uhash(s.seed, i) * 40.0) * sc
		var P := PackedVector2Array([tg, tg + Vector2(cos(an) * Lc * 0.55, sin(an) * Lc * 0.55 * SQ), tg + Vector2(cos(an + 0.2) * Lc, sin(an + 0.2) * Lc * SQ)])
		_thick(_U, P, 5.0, _ca(INK, f), false)
		_thick(_T, P, 2.2, _ca(_dc, f), false)
	_burst(tg, post, L, 120.0 * sc, _dc, s.seed, 10)
	var pu := minf(1.0, post / 0.3)
	_gring(tg, (30 + 90 * pu) * sc, 30.0 * (1.0 - pu) * sc + 4.0, Color("#ffd23a"), 1.0 - pu, SQ, 40, 2.5 * (1.0 - pu))
	_anvil_shape(tg + Vector2(0, 6 * sc), sc, minf(1.0, f * 1.8), f)
	for i in 7:
		var an: float = s.seed * 3.0 + i * TAU / 7
		var sp := (160.0 + _uhash(s.seed, i + 30) * 120.0) * sc
		var q := tg + Vector2(cos(an) * sp * post, sin(an) * sp * post * SQ - (sin(minf(1.0, post / L) * PI) * 70.0 * sc))
		var sr := 9.0 * sc * f + 2.0
		_glow(q, sr * 2.5, _dc, f * 0.7, 1.0, _T)
		_sparkle(_T, q, sr, Color(1, 0.97, 0.7, f), post * 6.0 + i)
