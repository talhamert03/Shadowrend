class_name HeroMech
extends RefCounted
## 10 yeni kahramanın imza mekanikleri (WeaponManager'dan ayrı tutulur; çizici bu listeleri okur):
##   zincir (Zincirci)    — kancalı zincir fırlatır; hattaki düşmanları takar, dönüşte kahramana çeker
##   iksir  (Simyacı)     — yay çizen iksir şişesi; çarpınca patlar, yerde yanan alev göleti bırakır
##   tarot  (Kader Falcısı)— dönen tarot kartları; her kart rastgele ATEŞ (patlama) / BUZ (yavaşlatma) /
##                          YILDIRIM (zincirleme) etkisi taşır
##   kamci  (Kamçı Ustası)— uzun dikenli kamçı şaklatır; ucundaki düşmanlar kritik yer
##   golge  (Gölge Suikastçı)— gölge klonu düşmandan düşmana sıçrayarak keser
##   kemik  (Kemik Efendisi)— kemik mızrakları; öldürdüğü düşmandan iskelet hizmetkâr kalkar
##   ayaz   (Ayaz Gelini)  — buz kırıkları; 3 ayaz yükü düşmanı dondurur, donmuş düşman parçalanır
##   totem  (Totem Şamanı) — yere ruh totemi diker; totemler en yakın düşmana ruh ateşi atar
##   yildiz (Yıldız Çağıran)— yere işaretlenen noktalara gökten yıldız düşer
##   siren  (Deniz Sireni) — şarkı dalgası; değdiği düşmanları büyüler, büyülenenler birbirine saldırır

const KINDS := ["hook", "flask", "tarot", "lash", "shade", "bone", "frost", "totem", "star", "song"]

var game
var wm               # WeaponManager
var cd := {}         # silah id → kalan bekleme
var scratch: Array = []

# varlık listeleri (çizici okur)
var hooks: Array = []      # {x,y,ox,oy,dir,d,maxD,ret,dmg,hit:{},pulled:[]}
var flasks: Array = []     # {x0,y0,tx,ty,t,fly,dmg,r,life}
var cards: Array = []      # {x,y,vx,vy,life,dmg,suit,spin,pierce,hit:{}}
var lashes: Array = []     # {ang,len,t,side,col}
var shades: Array = []     # {x,y,tgt,tok,jumps,dmg,hit:{},trail:[],t,fade}
var bones: Array = []      # {x,y,vx,vy,life,dmg,pierce,hit:{}}
var minions: Array = []    # {x,y,life,max,cd,tgt,tok,yaw,hop,dmg}
var shards: Array = []     # {x,y,vx,vy,life,dmg,hit:{}}
var frozen: Array = []     # donmuş düşmanlar (çizici buz kristali koyar)
var totems: Array = []     # {x,y,life,max,fireT,rise,dmg}
var sbolts: Array = []     # totem ruh ateşi {x,y,vx,vy,tgt,tok,life,dmg}
var stars: Array = []      # {x,y,t,fall,r,dmg}
var songs: Array = []      # {x,y,ang,r,maxR,arc,dmg,hit:{},charm}

func _init(g, w) -> void:
	game = g
	wm = w

func reset() -> void:
	cd.clear()
	for L in [hooks, flasks, cards, lashes, shades, bones, minions, shards, frozen, totems, sbolts, stars, songs]: L.clear()

# ── yardımcılar ──
func _L(id: String) -> int: return wm.lvl(id) - 1
func _W(id: String) -> Dictionary: return wm.W[id]
func _v(Wd: Dictionary, key: String, L: int, def := 0.0) -> float:
	var a = Wd.get(key)
	if a is Array: return float(a[mini(L, a.size() - 1)])
	if a is float or a is int: return float(a)
	return def
func _src() -> Vector2:
	var p = game.player
	return wm.floatPos if wm.floatPos != Vector2.ZERO else Vector2(p.x, p.y)
func _ready(id: String, dt: float) -> bool:
	var t: float = cd.get(id, 0.0) - dt
	if t > 0.0:
		cd[id] = t
		return false
	return true
func _arm(id: String, Wd: Dictionary, L: int) -> void:
	cd[id] = _v(Wd, "cooldown", L, 1.0) * game.player.atkMult
func _hit(e, dmg: float, ang: float, knock := 0.0, crit := 0.0):
	return Combat.apply_hit(game, e, dmg, ang, knock, crit, false)
func _alive(e, tok: int) -> bool:
	return e != null and e.hp > 0 and e.aliveTok == tok
func _nearest_to(x: float, y: float, R: float, skip: Dictionary = {}):
	var best = null
	var bd := R * R
	for e in game.enemies.query_circle(x, y, R, scratch):
		if e.hp <= 0 or e.entryT > 0 or skip.has(e.get_instance_id()): continue
		var d2: float = (e.x - x) * (e.x - x) + (e.y - y) * (e.y - y)
		if d2 < bd:
			bd = d2
			best = e
	return best
func _sfx(Wd: Dictionary) -> void:
	var s = Wd.get("sfx")
	if s: game.audio.play(s)

# ═══════════ GÜNCELLEME ═══════════

func update(id: String, kind: String, dt: float) -> void:
	match kind:
		"hook": _fire_hook(id, dt)
		"flask": _fire_flask(id, dt)
		"tarot": _fire_tarot(id, dt)
		"lash": _fire_lash(id, dt)
		"shade": _fire_shade(id, dt)
		"bone": _fire_bone(id, dt)
		"frost": _fire_frost(id, dt)
		"totem": _fire_totem(id, dt)
		"star": _fire_star(id, dt)
		"song": _fire_song(id, dt)

## her kare bir kez: tüm varlıklar
func tick(dt: float) -> void:
	if not hooks.is_empty(): _tick_hooks(dt)
	if not flasks.is_empty(): _tick_flasks(dt)
	if not cards.is_empty(): _tick_cards(dt)
	if not lashes.is_empty(): _tick_lashes(dt)
	if not shades.is_empty(): _tick_shades(dt)
	if not bones.is_empty(): _tick_bones(dt)
	if not minions.is_empty(): _tick_minions(dt)
	if not shards.is_empty() or not frozen.is_empty(): _tick_frost(dt)
	if not totems.is_empty() or not sbolts.is_empty(): _tick_totems(dt)
	if not stars.is_empty(): _tick_stars(dt)
	if not songs.is_empty(): _tick_songs(dt)

# ═══════════ ZİNCİR (Zincirci) ═══════════

func _fire_hook(id: String, dt: float) -> void:
	if not _ready(id, dt): return
	var Wd := _W(id)
	var L := _L(id)
	var n = wm.nearest
	var rng := _v(Wd, "range", L, 300.0)
	if n == null or wm.nearestD2 > (rng + 40.0) * (rng + 40.0):
		cd[id] = 0.12
		return
	_arm(id, Wd, L)
	var s := _src()
	var base := atan2(n.y - s.y, n.x - s.x)
	var cnt := int(_v(Wd, "volley", L, 1.0))
	var tl: Array = wm.aim_targets(s.x, s.y, cnt, rng + 40.0)
	for k in cnt:
		var a := atan2(tl[k].y - s.y, tl[k].x - s.x) if k < tl.size() else base + (k - (cnt - 1) * 0.5) * 0.12
		hooks.append({"x": s.x, "y": s.y, "dir": a, "d": 0.0, "maxD": rng, "ret": false, "dmg": _v(Wd, "dmg", L, 20.0),
			"hit": {}, "pulled": [], "spd": _v(Wd, "speed", L, 900.0), "pull": _v(Wd, "knock", L, 1.0), "slam": _v(Wd, "pin", L, 0.0), "t": 0.0,
			"fl": wm.wi(Wd, "flame") + int(_v(Wd, "burn", L, 0.0)), "flT": 0.0, "flHit": {}})
	game.player.trigger_ranged_attack(base)
	_sfx(Wd)

func _tick_hooks(dt: float) -> void:
	var g = game
	var p = g.player
	for i in range(hooks.size() - 1, -1, -1):
		var h: Dictionary = hooks[i]
		h.t += dt
		var s := _src()
		if int(h.fl) > 0: _burn_chain(h, s, dt)
		if not h.ret:
			h.d = minf(h.maxD, h.d + h.spd * dt)
			h.x = s.x + cos(h.dir) * h.d
			h.y = s.y + sin(h.dir) * h.d
			for e in g.enemies.query_circle(h.x, h.y, 40.0, scratch):
				if e.hp <= 0 or e.entryT > 0: continue
				var iid: int = e.get_instance_id()
				if h.hit.has(iid): continue
				var dx: float = e.x - h.x
				var dy: float = e.y - h.y
				var rr: float = 16.0 + e.radius
				if dx * dx + dy * dy > rr * rr: continue
				h.hit[iid] = true
				_hit(e, h.dmg, h.dir)
				if e.hp > 0 and not e.isBoss and h.pulled.size() < 6: h.pulled.append([e, e.aliveTok])
				g.spawn_burst(e.x, e.y - 8, "#c8c0b0", 4, 150, 2.2, 0.25, true)
				if g.renderer3d: g.renderer3d.spawn_hit(e.x, e.y, h.dir, 1, 0.85, 0.8, 0.7)
			if h.d >= h.maxD:
				h.ret = true
				if not h.pulled.is_empty(): g.audio.play("chainpull")
		else:
			# dönüş: kanca kahramana döner, takılanları sürükler
			var dx2: float = s.x - h.x
			var dy2: float = s.y - h.y
			var dd := sqrt(dx2 * dx2 + dy2 * dy2)
			var sp: float = h.spd * 0.85 * h.pull
			if dd <= sp * dt + 30.0:
				# geldi: takılanlara son çarpma
				for q in h.pulled:
					var e = q[0]
					if _alive(e, q[1]):
						_hit(e, h.dmg * (0.4 + 0.25 * h.slam), atan2(e.y - p.y, e.x - p.x), 120.0)
						g.spawn_burst(e.x, e.y - 6, "#ffcf8a", 5, 170, 2.4, 0.3, true)
				if not h.pulled.is_empty() and g.renderer3d: g.renderer3d.spawn_hit(s.x, s.y, h.dir, 2, 1.0, 0.8, 0.5)
				hooks.remove_at(i)
				continue
			h.x += dx2 / dd * sp * dt
			h.y += dy2 / dd * sp * dt
			for q in h.pulled:
				var e = q[0]
				if not _alive(e, q[1]): continue
				# düşman kancanın arkasında sürüklenir (kahramana çok yaklaşmaz)
				var tx: float = h.x - dx2 / dd * 18.0
				var ty: float = h.y - dy2 / dd * 18.0
				var pdx: float = tx - p.x
				var pdy: float = ty - p.y
				if pdx * pdx + pdy * pdy < 48.0 * 48.0: continue
				e.x += (tx - e.x) * minf(1.0, dt * 14.0)
				e.y += (ty - e.y) * minf(1.0, dt * 14.0)
				e.stopT = maxf(e.stopT, 0.05)

# Alevli Zincir: kanca ve zincir hattı yanar; hat boyunca (kancanın etrafı daha geniş)
# düşmanları belirli aralıklarla toplu yakar. Her düşman tik başına bir kez yanar.
func _burn_chain(h: Dictionary, s: Vector2, dt: float) -> void:
	h.flT -= dt
	if h.flT > 0.0: return
	h.flT = 0.18
	var g = game
	var fl: int = int(h.fl)
	var dmg: float = h.dmg * (0.16 + 0.07 * fl)
	var rHook: float = 46.0 + 12.0 * fl
	var rLine: float = 24.0 + 6.0 * fl
	var ax: float = s.x
	var ay: float = s.y
	var bx: float = h.x
	var by: float = h.y
	var lx: float = bx - ax
	var ly: float = by - ay
	var len2: float = maxf(1.0, lx * lx + ly * ly)
	var cx: float = (ax + bx) * 0.5
	var cy: float = (ay + by) * 0.5
	var qr: float = sqrt(len2) * 0.5 + rHook + 30.0
	var n := 0
	for e in g.enemies.query_circle(cx, cy, qr, scratch):
		if e.hp <= 0 or e.entryT > 0: continue
		var t: float = clampf(((e.x - ax) * lx + (e.y - ay) * ly) / len2, 0.0, 1.0)
		var px: float = ax + lx * t - e.x
		var py: float = ay + ly * t - e.y
		var dh: float = (e.x - bx) * (e.x - bx) + (e.y - by) * (e.y - by)
		var rh: float = rHook + e.radius
		var rl: float = rLine + e.radius
		if dh > rh * rh and px * px + py * py > rl * rl: continue
		_hit(e, dmg, atan2(e.y - by, e.x - bx))
		n += 1
		if n <= 4: g.spawn_burst(e.x, e.y - 8, "#ff8a2a", 3, 120, 2.0, 0.3, true)
	if g.renderer3d and randf() < 0.6: g.renderer3d.spawn_flame_impact(bx, by, h.dir, 0.55 + 0.12 * fl)

# ═══════════ İKSİR (Simyacı) ═══════════

func _fire_flask(id: String, dt: float) -> void:
	if not _ready(id, dt): return
	var Wd := _W(id)
	var L := _L(id)
	var n = wm.nearest
	var rng := _v(Wd, "range", L, 320.0)
	if n == null or wm.nearestD2 > (rng + 40.0) * (rng + 40.0):
		cd[id] = 0.12
		return
	_arm(id, Wd, L)
	var s := _src()
	var cnt := int(_v(Wd, "volley", L, 1.0))
	var tl: Array = wm.aim_targets(s.x, s.y, cnt, rng + 40.0)
	for k in cnt:
		var tx: float = n.x
		var ty: float = n.y
		if k > 0 and k < tl.size():
			tx = tl[k].x; ty = tl[k].y
		elif k > 0:
			var oa := randf() * TAU
			tx += cos(oa) * (50.0 + randf() * 40.0); ty += sin(oa) * (50.0 + randf() * 40.0)
		var dd := Vector2(tx - s.x, ty - s.y).length()
		flasks.append({"x0": s.x, "y0": s.y, "tx": tx, "ty": ty, "x": s.x, "y": s.y, "t": 0.0, "fly": clampf(dd / 520.0, 0.32, 0.7),
			"dmg": _v(Wd, "dmg", L, 20.0), "r": _v(Wd, "areaR", L, 52.0) * (1.0 + 0.12 * wm.wi(Wd, "areaAdd")),
			"life": _v(Wd, "bulletLife", L, 2.6) * (1.0 + 0.2 * wm.wi(Wd, "lifeAdd")), "ex": wm.wi(Wd, "explode"), "spin": randf() * TAU})
	game.player.trigger_ranged_attack(atan2(n.y - s.y, n.x - s.x))
	_sfx(Wd)

func _tick_flasks(dt: float) -> void:
	var g = game
	for i in range(flasks.size() - 1, -1, -1):
		var f: Dictionary = flasks[i]
		f.t += dt
		var u: float = minf(1.0, f.t / f.fly)
		f.x = lerpf(f.x0, f.tx, u)
		f.y = lerpf(f.y0, f.ty, u)
		f.h = 8.0 + sin(u * PI) * 110.0
		if u >= 1.0:
			# şişe kırılır: anlık patlama + yanan göl
			g.explode(f.tx, f.ty, f.dmg * (0.7 + 0.15 * f.ex), 34.0 + 6.0 * f.ex, false)
			var z = g.pools.zones.take().setup(f.tx, f.ty, f.r, f.dmg * 0.3, f.life)
			z.blue = false
			g.spawn_burst(f.tx, f.ty, "#ff9a2a", 10, 220, 2.8, 0.45, true)
			g.spawn_burst(f.tx, f.ty, "#8aff6a", 6, 160, 2.2, 0.4, true)
			g.spawn_burst(f.tx, f.ty, "#e8fff0", 5, 260, 1.6, 0.25, true)
			if g.renderer3d: g.renderer3d.spawn_flame_impact(f.tx, f.ty, 0.0, 1.1)
			g.audio.play("firebomb")
			flasks.remove_at(i)

# ═══════════ TAROT (Kader Falcısı) ═══════════

const SUIT_COL := [Color("#ff7a2a"), Color("#7fd8ff"), Color("#d8a0ff")]

func _fire_tarot(id: String, dt: float) -> void:
	if not _ready(id, dt): return
	var Wd := _W(id)
	var L := _L(id)
	var n = wm.nearest
	var rng := _v(Wd, "range", L, 520.0)
	if n == null or wm.nearestD2 > rng * rng:
		cd[id] = 0.12
		return
	_arm(id, Wd, L)
	var s := _src()
	var ang := atan2(n.y - s.y, n.x - s.x)
	var cnt := int(_v(Wd, "volley", L, 1.0))
	var spd := _v(Wd, "speed", L, 560.0)
	var tl: Array = wm.aim_targets(s.x, s.y, cnt, rng)
	for k in cnt:
		var a := atan2(tl[k].y - s.y, tl[k].x - s.x) if k < tl.size() else ang + (k - (cnt - 1) * 0.5) * 0.06
		cards.append({"x": s.x, "y": s.y, "vx": cos(a) * spd, "vy": sin(a) * spd, "life": _v(Wd, "bulletLife", L, 1.3), "dmg": _v(Wd, "dmg", L, 18.0),
			"suit": randi() % 3, "spin": randf() * TAU, "pierce": int(_v(Wd, "pierce", L, 0.0)), "hit": {},
			"chain": 2 + wm.wi(Wd, "chain"), "slow": 1.6 + 0.6 * wm.wi(Wd, "slowAdd"), "ex": wm.wi(Wd, "explode"), "ph": randf() * 6.0})
	game.player.trigger_ranged_attack(ang)
	_sfx(Wd)

func _tick_cards(dt: float) -> void:
	var g = game
	for i in range(cards.size() - 1, -1, -1):
		var c: Dictionary = cards[i]
		c.life -= dt
		c.spin += dt * 14.0
		c.x += c.vx * dt
		c.y += c.vy * dt
		var done: bool = c.life <= 0.0
		if not done:
			for e in g.enemies.query_circle(c.x, c.y, 40.0, scratch):
				if e.hp <= 0 or e.entryT > 0: continue
				var iid: int = e.get_instance_id()
				if c.hit.has(iid): continue
				var dx: float = e.x - c.x
				var dy: float = e.y - c.y
				var rr: float = 12.0 + e.radius
				if dx * dx + dy * dy > rr * rr: continue
				c.hit[iid] = true
				var ang := atan2(c.vy, c.vx)
				_hit(e, c.dmg, ang)
				_card_effect(c, e, ang)
				c.pierce -= 1
				if c.pierce < 0:
					done = true
					break
		if done: cards.remove_at(i)

func _card_effect(c: Dictionary, e, ang: float) -> void:
	var g = game
	var col: Color = SUIT_COL[c.suit]
	match int(c.suit):
		0:   # ATEŞ: küçük patlama
			g.explode(e.x, e.y, c.dmg * 0.6, 42.0 + 8.0 * c.ex, false)
			if g.renderer3d: g.renderer3d.spawn_flame_impact(e.x, e.y, ang, 0.8)
		1:   # BUZ: yavaşlatma + ayaz
			e.slowT = maxf(e.slowT, c.slow)
			_add_frost(e, 1)
			g.spawn_burst(e.x, e.y - 8, "#cfefff", 7, 170, 2.4, 0.4, true)
			if g.renderer3d: g.renderer3d.spawn_hit(e.x, e.y, ang, 1, 0.6, 0.9, 1.0)
		2:   # YILDIRIM: yakındakilere zincir
			var last = e
			var seen := {e.get_instance_id(): true}
			for k in int(c.chain):
				var nx = _nearest_to(last.x, last.y, 170.0, seen)
				if nx == null: break
				seen[nx.get_instance_id()] = true
				_hit(nx, c.dmg * 0.6, atan2(nx.y - last.y, nx.x - last.x))
				_zap(last.x, last.y, nx.x, nx.y)
				last = nx
			g.audio.play("simsekvur")
	g.spawn_burst(e.x, e.y - 6, "#" + col.to_html(false), 6, 160, 2.2, 0.3, true)

## kısa zikzak yıldırım (parçacıklarla)
func _zap(x0: float, y0: float, x1: float, y1: float) -> void:
	var g = game
	var n := 6
	for k in n + 1:
		var u := float(k) / n
		var jx := (randf() - 0.5) * 18.0 if k > 0 and k < n else 0.0
		var jy := (randf() - 0.5) * 18.0 if k > 0 and k < n else 0.0
		g.pools.particles.take().setup(lerpf(x0, x1, u) + jx, lerpf(y0, y1, u) + jy - 10.0, 0, 0, 0.18, 3.0, "#e8d0ff" if k % 2 else "#ffffff", 1, 0, true)
	if g.renderer3d: g.renderer3d.spawn_hit(x1, y1, atan2(y1 - y0, x1 - x0), 1, 0.85, 0.65, 1.0)

# ═══════════ KAMÇI (Kamçı Ustası) ═══════════

func _fire_lash(id: String, dt: float) -> void:
	if not _ready(id, dt): return
	var Wd := _W(id)
	var L := _L(id)
	var n = wm.nearest
	var rng := _v(Wd, "range", L, 230.0)
	if n == null or wm.nearestD2 > (rng + 30.0) * (rng + 30.0):
		cd[id] = 0.1
		return
	_arm(id, Wd, L)
	var p = game.player
	var ang := atan2(n.y - p.y, n.x - p.x)
	var cnt := int(_v(Wd, "volley", L, 1.0))
	for k in cnt:
		var a := ang + (k - (cnt - 1) * 0.5) * 0.5
		var side := 1.0 if (lashes.size() + k) % 2 == 0 else -1.0
		lashes.append({"ang": a, "len": rng, "t": -0.06 * k, "side": side, "done": false, "dmg": _v(Wd, "dmg", L, 24.0),
			"crit": JS.num(Wd, "critAdd"), "tip": 0.3, "ex": wm.wi(Wd, "explode")})
	p.trigger_ranged_attack(ang)
	p.faceLeft = cos(ang) < 0

const LASH_OUT := 0.16
const LASH_LIFE := 0.34

func _tick_lashes(dt: float) -> void:
	var g = game
	var p = g.player
	for i in range(lashes.size() - 1, -1, -1):
		var l: Dictionary = lashes[i]
		l.t += dt
		if l.t >= LASH_OUT and not l.done:
			l.done = true
			# şaklama anı: çizgi boyunca hasar; uçtaki %30 kritik
			var a: float = l.ang
			var ux := cos(a)
			var uy := sin(a)
			var Lr: float = l.len
			var tipX: float = p.x + ux * Lr
			var tipY: float = p.y + uy * Lr
			for e in g.enemies.query_circle(p.x + ux * Lr * 0.5, p.y + uy * Lr * 0.5, Lr * 0.5 + 40.0, scratch):
				if e.hp <= 0 or e.entryT > 0: continue
				var rx: float = e.x - p.x
				var ry: float = e.y - p.y
				var along := rx * ux + ry * uy
				if along < 0.0 or along > Lr + e.radius: continue
				var perp := absf(-rx * uy + ry * ux)
				if perp > 20.0 + e.radius: continue
				var atTip: bool = along > Lr * (1.0 - l.tip)
				_hit(e, l.dmg * (1.25 if atTip else 1.0), a, 40.0, (1.0 if atTip else 0.0) + l.crit)
				g.spawn_burst(e.x, e.y - 8, "#ff3a5a" if atTip else "#c8203a", 5 if atTip else 3, 180, 2.4, 0.3, true)
			if l.ex > 0:
				# DİKEN PATLAMASI: uçta dikenler saçılır, çevredekiler hasar alır
				var tr: float = 46.0 + 10.0 * l.ex
				for e2 in g.enemies.query_circle(tipX, tipY, tr + 30.0, scratch):
					if e2.hp <= 0 or e2.entryT > 0: continue
					var qx: float = e2.x - tipX
					var qy: float = e2.y - tipY
					if qx * qx + qy * qy > (tr + e2.radius) * (tr + e2.radius): continue
					_hit(e2, l.dmg * (0.35 + 0.15 * l.ex), atan2(qy, qx), 60.0)
				g.spawn_burst(tipX, tipY - 8, "#ff2a4a", 14, 260, 2.8, 0.45, true)
				g.spawn_burst(tipX, tipY - 8, "#3a8a3a", 8, 200, 2.4, 0.4, false)
				g.pools.rings.take().setup(tipX, tipY, tr, 0.3, "#ff6a8a")
			g.spawn_burst(tipX, tipY - 10, "#ffffff", 6, 260, 2.0, 0.18, true)
			g.spawn_burst(tipX, tipY - 10, "#ff4a6a", 8, 200, 2.6, 0.3, true)
			if g.renderer3d: g.renderer3d.spawn_hit(tipX, tipY, a, 2, 1.0, 0.35, 0.45)
			g.audio.play("whipcrack")
		if l.t >= LASH_LIFE: lashes.remove_at(i)

# ═══════════ GÖLGE (Gölge Suikastçı) ═══════════

func _fire_shade(id: String, dt: float) -> void:
	if not _ready(id, dt): return
	var Wd := _W(id)
	var L := _L(id)
	var n = wm.nearest
	var rng := _v(Wd, "range", L, 340.0)
	if n == null or wm.nearestD2 > rng * rng:
		cd[id] = 0.12
		return
	_arm(id, Wd, L)
	var p = game.player
	var cnt := int(_v(Wd, "volley", L, 1.0))
	for k in cnt:
		var tgt = n
		if k > 0:
			tgt = _nearest_to(p.x + randf_range(-80, 80), p.y + randf_range(-80, 80), rng)
			if tgt == null: tgt = n
		shades.append({"x": p.x, "y": p.y, "tgt": tgt, "tok": tgt.aliveTok, "jumps": int(_v(Wd, "targets", L, 3.0)) + wm.wi(Wd, "targetsAdd"),
			"dmg": _v(Wd, "dmg", L, 20.0), "hit": {}, "trail": [], "fade": -1.0, "crit": JS.num(Wd, "critAdd"), "ang": 0.0, "pause": 0.0})
	game.audio.play("dodge")

func _tick_shades(dt: float) -> void:
	var g = game
	for i in range(shades.size() - 1, -1, -1):
		var s: Dictionary = shades[i]
		var tr: Array = s.trail
		tr.push_front(Vector2(s.x, s.y))
		if tr.size() > 7: tr.pop_back()
		if s.fade >= 0.0:
			s.fade += dt
			if s.fade > 0.3: shades.remove_at(i)
			continue
		if s.pause > 0.0:
			s.pause -= dt
			continue
		var t = s.tgt
		if not _alive(t, s.tok):
			t = _nearest_to(s.x, s.y, 260.0, s.hit)
			if t == null:
				s.fade = 0.0
				continue
			s.tgt = t; s.tok = t.aliveTok
		var dx: float = t.x - s.x
		var dy: float = t.y - s.y
		var d := sqrt(dx * dx + dy * dy)
		var sp := 1100.0
		s.ang = atan2(dy, dx)
		if d <= sp * dt + t.radius:
			s.x = t.x - dx / maxf(d, 1.0) * 8.0
			s.y = t.y - dy / maxf(d, 1.0) * 8.0
			s.hit[t.get_instance_id()] = true
			_hit(t, s.dmg, s.ang, 30.0, s.crit)
			g.spawn_burst(t.x, t.y - 10, "#5ae8ff", 6, 220, 2.2, 0.3, true)
			g.spawn_burst(t.x, t.y - 10, "#0a0a14", 5, 160, 2.8, 0.4, false)
			if g.renderer3d: g.renderer3d.spawn_hit(t.x, t.y, s.ang, 1, 0.35, 0.9, 1.0)
			g.audio.play("slashhit")
			s.jumps -= 1
			s.pause = 0.06
			if s.jumps <= 0:
				s.fade = 0.0
				continue
			var nx = _nearest_to(s.x, s.y, 260.0, s.hit)
			if nx == null:
				s.fade = 0.0
				continue
			s.tgt = nx; s.tok = nx.aliveTok
		else:
			s.x += dx / d * sp * dt
			s.y += dy / d * sp * dt

# ═══════════ KEMİK (Kemik Efendisi) ═══════════

func _fire_bone(id: String, dt: float) -> void:
	if not _ready(id, dt): return
	var Wd := _W(id)
	var L := _L(id)
	var n = wm.nearest
	var rng := _v(Wd, "range", L, 520.0)
	if n == null or wm.nearestD2 > rng * rng:
		cd[id] = 0.12
		return
	_arm(id, Wd, L)
	var s := _src()
	var ang := atan2(n.y - s.y, n.x - s.x)
	var cnt := int(_v(Wd, "volley", L, 1.0))
	var spd := _v(Wd, "speed", L, 620.0)
	var tl: Array = wm.aim_targets(s.x, s.y, cnt, rng)
	for k in cnt:
		var a := atan2(tl[k].y - s.y, tl[k].x - s.x) if k < tl.size() else ang + (k - (cnt - 1) * 0.5) * 0.06
		bones.append({"x": s.x, "y": s.y, "vx": cos(a) * spd, "vy": sin(a) * spd, "life": 1.2, "dmg": _v(Wd, "dmg", L, 16.0),
			"pierce": int(_v(Wd, "pierce", L, 1.0)), "hit": {}, "maxM": int(_v(Wd, "count", L, 2.0)),
			"mLife": 7.0 * (1.0 + 0.25 * wm.wi(Wd, "lifeAdd")), "mDmg": _v(Wd, "dmg", L, 16.0) * 0.7})
	game.player.trigger_ranged_attack(ang)
	_sfx(Wd)

func _tick_bones(dt: float) -> void:
	var g = game
	for i in range(bones.size() - 1, -1, -1):
		var b: Dictionary = bones[i]
		b.life -= dt
		b.x += b.vx * dt
		b.y += b.vy * dt
		var done: bool = b.life <= 0.0
		if not done:
			for e in g.enemies.query_circle(b.x, b.y, 40.0, scratch):
				if e.hp <= 0 or e.entryT > 0: continue
				var iid: int = e.get_instance_id()
				if b.hit.has(iid): continue
				var dx: float = e.x - b.x
				var dy: float = e.y - b.y
				var rr: float = 10.0 + e.radius
				if dx * dx + dy * dy > rr * rr: continue
				b.hit[iid] = true
				_hit(e, b.dmg, atan2(b.vy, b.vx), 60.0)
				g.spawn_burst(e.x, e.y - 8, "#efe6d0", 5, 170, 2.2, 0.3, true)
				if e.hp <= 0: _raise(e.x, e.y, b)
				b.pierce -= 1
				if b.pierce < 0:
					done = true
					break
		if done: bones.remove_at(i)

## ölen düşmanın yerinden iskelet hizmetkâr kalkar (en fazla maxM)
func _raise(x: float, y: float, b: Dictionary) -> void:
	if minions.size() >= int(b.maxM): return
	minions.append({"x": x, "y": y, "life": b.mLife, "max": b.mLife, "cd": 0.4, "tgt": null, "tok": -1, "yaw": 0.0, "hop": 0.0, "dmg": b.mDmg, "rise": 0.0})
	var g = game
	g.spawn_burst(x, y, "#7dff8a", 10, 140, 2.6, 0.6, true)
	g.spawn_burst(x, y, "#3a2e22", 6, 120, 3.0, 0.5, false)
	g.audio.play("revive")

func _tick_minions(dt: float) -> void:
	var g = game
	for i in range(minions.size() - 1, -1, -1):
		var m: Dictionary = minions[i]
		m.life -= dt
		m.rise = minf(1.0, m.rise + dt * 2.5)
		if m.life <= 0.0:
			g.spawn_burst(m.x, m.y, "#efe6d0", 8, 160, 2.4, 0.4, false)
			minions.remove_at(i)
			continue
		if m.rise < 1.0: continue
		var t = m.tgt
		if not _alive(t, m.tok):
			t = _nearest_to(m.x, m.y, 420.0)
			m.tgt = t
			m.tok = t.aliveTok if t else -1
		if t == null:
			# hedef yoksa kahramanın yanına
			var p = g.player
			var px: float = p.x - m.x
			var py: float = p.y - m.y
			var pd := sqrt(px * px + py * py)
			if pd > 60.0:
				m.x += px / pd * 150.0 * dt; m.y += py / pd * 150.0 * dt
				m.yaw = atan2(px, py); m.hop += dt * 9.0
			continue
		var dx: float = t.x - m.x
		var dy: float = t.y - m.y
		var d := sqrt(dx * dx + dy * dy)
		m.yaw = atan2(dx, dy)
		m.cd -= dt
		if d > t.radius + 14.0:
			m.x += dx / d * 175.0 * dt
			m.y += dy / d * 175.0 * dt
			m.hop += dt * 11.0
		elif m.cd <= 0.0:
			m.cd = 0.55
			m.hop = 0.0
			_hit(t, m.dmg, atan2(dy, dx), 30.0)
			g.spawn_burst(t.x, t.y - 8, "#7dff8a", 4, 140, 2.0, 0.25, true)

# ═══════════ AYAZ (Ayaz Gelini) ═══════════

func _add_frost(e, n: int) -> void:
	if e.isBoss or e.frozenT > 0.0: return
	e.frost += n
	if e.frost >= 3:
		e.frost = 0
		e.frozenT = 1.3 * float(_frost_hold)
		if not frozen.has(e): frozen.append(e)
		game.spawn_burst(e.x, e.y - 10, "#dff6ff", 10, 120, 2.6, 0.5, true)
		game.audio.play("frostnova")

var _frost_hold := 1.0
var _frost_shatter := 1.6

func _fire_frost(id: String, dt: float) -> void:
	if not _ready(id, dt): return
	var Wd := _W(id)
	var L := _L(id)
	var n = wm.nearest
	var rng := _v(Wd, "range", L, 480.0)
	if n == null or wm.nearestD2 > rng * rng:
		cd[id] = 0.12
		return
	_arm(id, Wd, L)
	_frost_hold = JS.num(Wd, "hold", 1.0)
	_frost_shatter = 1.6 + 0.3 * wm.wi(Wd, "shatter")
	var s := _src()
	var ang := atan2(n.y - s.y, n.x - s.x)
	var cnt := int(_v(Wd, "volley", L, 3.0))
	var spd := _v(Wd, "speed", L, 640.0)
	var sp := _v(Wd, "spread", L, 0.2)
	for k in cnt:
		var a := ang + (k - (cnt - 1) * 0.5) * sp
		shards.append({"x": s.x, "y": s.y, "vx": cos(a) * spd, "vy": sin(a) * spd, "life": _v(Wd, "bulletLife", L, 0.9), "dmg": _v(Wd, "dmg", L, 12.0), "hit": {}, "pierce": int(_v(Wd, "pierce", L, 0.0))})
	game.player.trigger_ranged_attack(ang)
	_sfx(Wd)

func _tick_frost(dt: float) -> void:
	var g = game
	for i in range(shards.size() - 1, -1, -1):
		var b: Dictionary = shards[i]
		b.life -= dt
		b.x += b.vx * dt
		b.y += b.vy * dt
		var done: bool = b.life <= 0.0
		if not done:
			for e in g.enemies.query_circle(b.x, b.y, 40.0, scratch):
				if e.hp <= 0 or e.entryT > 0: continue
				var iid: int = e.get_instance_id()
				if b.hit.has(iid): continue
				var dx: float = e.x - b.x
				var dy: float = e.y - b.y
				var rr: float = 9.0 + e.radius
				if dx * dx + dy * dy > rr * rr: continue
				b.hit[iid] = true
				var ang := atan2(b.vy, b.vx)
				if e.frozenT > 0.0:
					# PARÇALAN: donmuş düşman büyük hasar alır, buz dağılır
					e.frozenT = 0.0
					_hit(e, b.dmg * _frost_shatter * 2.2, ang, 120.0, 0.25)
					g.spawn_burst(e.x, e.y - 10, "#ffffff", 8, 280, 2.4, 0.3, true)
					g.spawn_burst(e.x, e.y - 10, "#8fd6ff", 12, 240, 3.0, 0.5, true)
					if g.renderer3d: g.renderer3d.spawn_hit(e.x, e.y, ang, 2, 0.7, 0.95, 1.0)
					g.audio.play("shieldbreak")
				else:
					_hit(e, b.dmg, ang)
					_add_frost(e, 1)
					g.spawn_burst(e.x, e.y - 8, "#cfefff", 4, 150, 2.0, 0.3, true)
				b.pierce -= 1
				if b.pierce < 0:
					done = true
					break
		if done: shards.remove_at(i)
	for i in range(frozen.size() - 1, -1, -1):
		var e = frozen[i]
		if e.hp <= 0 or e.frozenT <= 0.0:
			if e.hp > 0: e.frozenT = 0.0
			frozen.remove_at(i)
			continue
		e.frozenT -= dt

# ═══════════ TOTEM (Totem Şamanı) ═══════════

func _fire_totem(id: String, dt: float) -> void:
	# normal saldırı: süzülen küçük totemden güdümlü ruh ateşi (dev totem SÜPER GÜÇ'tür)
	if not _ready(id, dt): return
	var Wd := _W(id)
	var L := _L(id)
	var n = wm.nearest
	var rng := _v(Wd, "range", L, 360.0)
	if n == null or wm.nearestD2 > rng * rng:
		cd[id] = 0.12
		return
	_arm(id, Wd, L)
	var s := _src()
	var cnt := int(_v(Wd, "volley", L, 1.0))
	var tl: Array = wm.aim_targets(s.x, s.y, cnt, rng)
	for k in cnt:
		var e = tl[k] if k < tl.size() else n
		var a: float = atan2(e.y - s.y, e.x - s.x)
		sbolts.append({"x": s.x, "y": s.y, "z": 60.0, "vx": cos(a) * 460.0, "vy": sin(a) * 460.0, "tgt": e, "tok": e.aliveTok, "life": 1.4, "dmg": _v(Wd, "dmg", L, 12.0)})
	game.player.trigger_ranged_attack(atan2(n.y - s.y, n.x - s.x))
	game.audio.play("bless")

## SÜPER GÜÇ (Totem Şamanı): yere dev ruh totemi diker — 30 sn kalır, yakındakilere ruh ateşi yağdırır
func place_totem_ult(x: float, y: float, rar: int) -> void:
	var Wd: Dictionary = wm.W.get("totem", {})
	var L: int = maxi(0, wm.lvl("totem") - 1)
	var dmg: float = _v(Wd, "dmg", L, 12.0) * (1.8 + 0.25 * rar)
	totems.clear()
	totems.append({"x": x, "y": y, "life": 30.0, "max": 30.0, "fireT": 0.6, "rise": 0.0, "dmg": dmg,
		"rate": 0.55 * (1.0 - 0.12 * wm.wi(Wd, "lifeAdd")), "vol": 2 + int(_v(Wd, "count", L, 0.0)), "rng": 380.0, "glow": 0.0})
	var g = game
	g.spawn_burst(x, y, "#4affd8", 24, 260, 3.0, 0.7, true)
	g.spawn_burst(x, y, "#e0fff8", 10, 200, 2.4, 0.5, true)
	g.pools.rings.take().setup(x, y, 120.0, 0.5, "#4affd8")
	g.add_shake(0.25)
	g.audio.play("totemplant")

func _tick_totems(dt: float) -> void:
	var g = game
	for i in range(totems.size() - 1, -1, -1):
		var t: Dictionary = totems[i]
		t.life -= dt
		t.rise = minf(1.0, t.rise + dt * 3.0)
		t.glow = maxf(0.0, t.glow - dt * 4.0)
		if t.life <= 0.0:
			g.spawn_burst(t.x, t.y, "#4affd8", 12, 180, 2.4, 0.5, true)
			totems.remove_at(i)
			continue
		t.fireT -= dt
		if t.fireT <= 0.0 and t.rise >= 1.0:
			var e = _nearest_to(t.x, t.y, t.rng)
			if e == null:
				t.fireT = 0.2
				continue
			t.fireT = t.rate * g.player.atkMult
			t.glow = 1.0
			for k in int(t.vol):
				var a: float = atan2(e.y - t.y, e.x - t.x) + (k - (t.vol - 1) * 0.5) * 0.35
				sbolts.append({"x": t.x, "y": t.y, "z": 54.0, "vx": cos(a) * 460.0, "vy": sin(a) * 460.0, "tgt": e, "tok": e.aliveTok, "life": 1.4, "dmg": t.dmg})
			g.audio.play("bless")
	for i in range(sbolts.size() - 1, -1, -1):
		var b: Dictionary = sbolts[i]
		b.life -= dt
		if b.life <= 0.0:
			sbolts.remove_at(i)
			continue
		var t2 = b.tgt
		if not _alive(t2, b.tok):
			t2 = _nearest_to(b.x, b.y, 300.0)
			b.tgt = t2; b.tok = t2.aliveTok if t2 else -1
		if t2:
			var dx: float = t2.x - b.x
			var dy: float = t2.y - b.y
			var d := sqrt(dx * dx + dy * dy)
			if d <= 460.0 * dt + t2.radius:
				_hit(t2, b.dmg, atan2(dy, dx))
				g.spawn_burst(t2.x, t2.y - 10, "#4affd8", 6, 170, 2.4, 0.3, true)
				g.spawn_burst(t2.x, t2.y - 10, "#e0fff8", 3, 120, 1.8, 0.2, true)
				if g.renderer3d: g.renderer3d.spawn_hit(t2.x, t2.y, atan2(dy, dx), 1, 0.3, 1.0, 0.85)
				sbolts.remove_at(i)
				continue
			var want := atan2(dy, dx)
			var cur := atan2(b.vy, b.vx)
			cur += clampf(JS.wrap_pi(want - cur), -9.0 * dt, 9.0 * dt)
			b.vx = cos(cur) * 460.0; b.vy = sin(cur) * 460.0
		b.x += b.vx * dt
		b.y += b.vy * dt
		b.z = maxf(22.0, b.z - dt * 60.0)

# ═══════════ YILDIZ (Yıldız Çağıran) ═══════════

func _fire_star(id: String, dt: float) -> void:
	if not _ready(id, dt): return
	var Wd := _W(id)
	var L := _L(id)
	var n = wm.nearest
	var rng := _v(Wd, "range", L, 420.0)
	if n == null or wm.nearestD2 > rng * rng:
		cd[id] = 0.15
		return
	_arm(id, Wd, L)
	var p = game.player
	var cnt := int(_v(Wd, "volley", L, 1.0))
	var R: float = _v(Wd, "areaR", L, 70.0) * (1.0 + 0.12 * wm.wi(Wd, "areaAdd"))
	var picks: Array = [n]
	if cnt > 1:
		var pool: Array = game.enemies.query_circle(p.x, p.y, rng, scratch).duplicate()
		pool.shuffle()
		for e in pool:
			if picks.size() >= cnt: break
			if e.hp <= 0 or picks.has(e): continue
			picks.append(e)
	for e in picks:
		# hareketli hedefin biraz önüne nişan (düşüş süresinde kahramana doğru yürür)
		var la := atan2(p.y - e.y, p.x - e.x)
		stars.append({"x": e.x + cos(la) * 22.0, "y": e.y + sin(la) * 22.0, "t": 0.0, "fall": _v(Wd, "delay", L, 0.75), "r": R, "dmg": _v(Wd, "dmg", L, 40.0)})
	game.audio.play("star")

func _tick_stars(dt: float) -> void:
	var g = game
	for i in range(stars.size() - 1, -1, -1):
		var s: Dictionary = stars[i]
		s.t += dt
		if s.t >= s.fall:
			var R: float = s.r
			for e in g.enemies.query_circle(s.x, s.y, R + 30.0, scratch):
				if e.hp <= 0 or e.entryT > 0: continue
				var dx: float = e.x - s.x
				var dy: float = e.y - s.y
				if dx * dx + dy * dy > (R + e.radius) * (R + e.radius): continue
				# yıldızın tam altındaki (merkez) düşman tam darbe yer
				var core: bool = dx * dx + dy * dy < (R * 0.4 + e.radius) * (R * 0.4 + e.radius)
				_hit(e, s.dmg * (2.5 if core else 1.0), atan2(dy, dx), 160.0)
			g.spawn_burst(s.x, s.y, "#ffffff", 12, 320, 2.4, 0.3, true)
			g.spawn_burst(s.x, s.y, "#ffd86a", 18, 280, 3.2, 0.6, true)
			g.spawn_burst(s.x, s.y, "#7aa8ff", 10, 200, 2.6, 0.5, true)
			g.pools.rings.take().setup(s.x, s.y, R * 1.2, 0.4, "#ffe9a0")
			if g.renderer3d: g.renderer3d.spawn_flame_impact(s.x, s.y, 0.0, 1.4)
			g.add_shake(0.12)
			g.audio.play("starfall")
			stars.remove_at(i)

# ═══════════ ŞARKI (Deniz Sireni) ═══════════

func _fire_song(id: String, dt: float) -> void:
	if not _ready(id, dt): return
	var Wd := _W(id)
	var L := _L(id)
	var n = wm.nearest
	var rng := _v(Wd, "range", L, 300.0)
	if n == null or wm.nearestD2 > rng * rng:
		cd[id] = 0.12
		return
	_arm(id, Wd, L)
	var p = game.player
	var ang := atan2(n.y - p.y, n.x - p.x)
	var cnt := int(_v(Wd, "volley", L, 1.0))
	for k in cnt:
		songs.append({"x": p.x, "y": p.y, "ang": ang + (k - (cnt - 1) * 0.5) * 1.1, "r": 18.0 - k * 26.0, "maxR": rng, "arc": _v(Wd, "arc", L, 1.2),
			"dmg": _v(Wd, "dmg", L, 16.0), "hit": {}, "charm": _v(Wd, "duration", L, 2.4), "spd": _v(Wd, "speed", L, 330.0), "cmax": 3 + L})
	p.trigger_ranged_attack(ang)
	_sfx(Wd)

func _tick_songs(dt: float) -> void:
	var g = game
	for i in range(songs.size() - 1, -1, -1):
		var s: Dictionary = songs[i]
		s.r += s.spd * dt
		if s.r >= s.maxR:
			songs.remove_at(i)
			continue
		if s.r < 10.0: continue
		var half: float = s.arc * 0.5
		for e in g.enemies.query_circle(s.x, s.y, s.r + 40.0, scratch):
			if e.hp <= 0 or e.entryT > 0: continue
			var iid: int = e.get_instance_id()
			if s.hit.has(iid): continue
			var dx: float = e.x - s.x
			var dy: float = e.y - s.y
			var d := sqrt(dx * dx + dy * dy)
			if absf(d - s.r) > 16.0 + e.radius: continue
			if absf(JS.wrap_pi(atan2(dy, dx) - s.ang)) > half: continue
			s.hit[iid] = true
			_hit(e, s.dmg, atan2(dy, dx), 50.0)
			# iri düşmanlar (dev/muhafız/kral) ve elitler büyülenmez: kahramana yürümeye devam eder
			if not e.isBoss and not e.elite and e.knockRes > 0.5 and s.cmax > 0:
				s.cmax -= 1
				e.charmT = maxf(e.charmT, s.charm)
				e.charmCd = 0.2
			g.spawn_burst(e.x, e.y - 14, "#ff8ad8", 4, 110, 2.2, 0.5, true)
			g.spawn_burst(e.x, e.y - 14, "#5affe0", 3, 90, 1.8, 0.4, true)
