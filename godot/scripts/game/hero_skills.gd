class_name HeroSkills
extends RefCounted
## Nadir kahramanların ek yetenekleri (süper güçten ayrı, kendiliğinden çalışır):
##   Epik  → 1 orta yetenek · Efsanevi → 1 zayıf + 1 orta yetenek.
## Tanımlar config.json → HERO_SKILLS[kahraman] (tier, kind, cd, dmg, r, n, slow, freeze, heal …).
## Türler: nova (çevre patlaması), bolts (güdümlü kıvılcımlar), chain (sıçrayan şimşek),
## strike (gökten düşen darbe), flame (düşman üstünde alev), frost (dondurma), pull (çekim),
## haste (saldırı hızı), heal (iyileşme).

var game
var list: Array = []          # [{def, cd, max, flash}]
var shots: Array = []         # uçan kıvılcımlar: {x,y,tgt,tok,dmg,c,sp,heal}
var strikes: Array = []       # gecikmeli darbeler: {x,y,t,dmg,r,c,fx}
var pulls: Array = []         # çekim alanları: {x,y,t,r,dmg,c,hit}
var hastes: Array = []        # [kalan, miktar]
var scratch: Array = []

func _init(g) -> void:
	game = g

func reset(char_id: String) -> void:
	list.clear(); shots.clear(); strikes.clear(); pulls.clear()
	hastes.clear()   # oyuncu yeni koşuda zaten sıfırlanır
	var defs: Array = D.HERO_SKILLS.get(char_id, [])
	if OS.get_cmdline_user_args().has("noskills"): defs = []   # geliştirici: denge ölçümü (yeteneksiz)
	var i := 0
	for d in defs:
		# ilk kullanım biraz gecikmeli ve yetenekler birbirinden kaymış başlar
		list.append({"def": d, "cd": float(d.get("cd", 8.0)) * (0.55 + 0.25 * i), "max": float(d.get("cd", 8.0)), "flash": 0.0})
		i += 1

## oyuncu seviyesiyle büyüyen hasar (silahlarla aynı eğim)
## alan yetenekleri kalabalıkta çok düşmana değdiği için daha düşük katsayı alır (denge ölçümü)
const KIND_MUL := {"nova": 0.55, "frost": 0.55, "strike": 0.42, "flame": 0.42, "pull": 0.55, "bolts": 0.42, "chain": 0.42}
func _dmg(d: Dictionary) -> float:
	var km: float = KIND_MUL.get(str(d.get("kind", "")), 1.0)
	return float(d.get("dmg", 0.0)) * km * (1.0 + 0.09 * float(game.player.level - 1))

func update(dt: float) -> void:
	var g = game
	var p = g.player
	for s in list:
		if s.flash > 0.0: s.flash -= dt
		s.cd -= dt
		if s.cd > 0.0: continue
		if _cast(s.def):
			s.cd = s.max
			s.flash = 0.6
		else:
			s.cd = 0.4    # hedef yok: kısa süre sonra tekrar dene
	_tick_shots(dt)
	_tick_strikes(dt)
	_tick_pulls(dt)
	for i in range(hastes.size() - 1, -1, -1):
		hastes[i][0] -= dt
		if hastes[i][0] <= 0.0:
			p.atkPct -= float(hastes[i][1])
			hastes.remove_at(i)
		elif randf() < dt * 10.0:
			g.spawn_burst(p.x + randf_range(-14, 14), p.y - 10 - randf() * 30, "#ffd27a", 1, 40, 2.2, 0.35, true)

const AOE_CAP := 6   # alan yeteneği en fazla bu kadar düşmana (en yakınlar) vurur — denge

func _near(x: float, y: float, R: float, cap := 0) -> Array:
	var out: Array = []
	for e in game.enemies.query_circle(x, y, R, scratch):
		if e.hp <= 0 or e.entryT > 0: continue
		var dx: float = e.x - x
		var dy: float = e.y - y
		var rr: float = R + e.radius
		if dx * dx + dy * dy <= rr * rr: out.append(e)
	if cap > 0 and out.size() > cap:
		out.sort_custom(func(a, b): return (a.x - x) * (a.x - x) + (a.y - y) * (a.y - y) < (b.x - x) * (b.x - x) + (b.y - y) * (b.y - y))
		out.resize(cap)
	return out

func _label(d: Dictionary) -> void:
	var p = game.player
	game.spawn_text(p.x, p.y - 70, Txt.upper_tr(I18n.t(str(d.get("name", "")))), str(d.get("c", "#ffffff")), 15, true)

func _cast(d: Dictionary) -> bool:
	var g = game
	var p = g.player
	var col := Color(str(d.get("c", "#ffffff")))
	var hx: String = str(d.get("c", "#ffffff"))
	var dmg := _dmg(d)
	var R: float = float(d.get("r", 100.0))
	match str(d.get("kind", "")):
		"nova", "frost":
			var es := _near(p.x, p.y, R, AOE_CAP)
			var isHeal := float(d.get("heal", 0.0)) > 0.0
			if es.is_empty() and not isHeal: return false
			for e in es:
				var a := atan2(e.y - p.y, e.x - p.x)
				Combat.apply_hit(g, e, dmg, a, 0.0)
				if float(d.get("slow", 0.0)) > 0.0: e.slowT = maxf(e.slowT, float(d.slow))
				if str(d.kind) == "frost" and not e.isBoss:
					e.frozenT = maxf(e.frozenT, float(d.get("freeze", 1.2)) * (0.5 if e.elite else 1.0))
			if isHeal: p.heal(p.maxHp * float(d.heal))
			g.vfx.ring(p.x, p.y, R, col, 0.5)
			g.vfx.ring(p.x, p.y, R * 0.6, col.lightened(0.3), 0.35)
			if g.renderer3d: g.renderer3d.spawn_cast(p.x, p.y, col.r, col.g, col.b)
			for k in 18:
				var a := TAU * k / 18.0
				g.spawn_burst(p.x + cos(a) * R * 0.85, p.y + sin(a) * R * 0.85 - 6, hx, 2, 90, 2.6, 0.45, true)
			# halka üstünde temaya uygun patlamalar (alev / vuruş kıvılcımı)
			if g.renderer3d:
				var fire: bool = str(d.get("fx", "")) == "flame"
				for k in 8:
					var a2 := TAU * k / 8.0 + randf() * 0.3
					var qx: float = p.x + cos(a2) * R * 0.72
					var qy: float = p.y + sin(a2) * R * 0.72
					if fire: g.renderer3d.spawn_flame_impact(qx, qy, a2, 0.7)
					else: g.renderer3d.spawn_hit(qx, qy, a2, 1, col.r, col.g, col.b)
			if str(d.kind) == "frost" and g.renderer3d:
				for e in es: g.renderer3d.spawn_hit(e.x, e.y, 0.0, 1, 0.7, 0.9, 1.0)
		"bolts":
			var n := int(d.get("n", 1))
			var ts: Array = g.weapons.aim_targets(p.x, p.y, n, 420.0)
			if ts.is_empty(): return false
			for k in n:
				var e = ts[k % ts.size()]
				var a := TAU * k / maxf(1.0, n) + randf() * 0.4
				shots.append({"x": p.x + cos(a) * 18.0, "y": p.y - 30.0 + sin(a) * 10.0, "tgt": e, "tok": e.aliveTok, "dmg": dmg, "c": hx,
					"sp": 620.0, "heal": float(d.get("heal", 0.0)), "vx": cos(a) * 260.0, "vy": sin(a) * 260.0 - 160.0, "t": 0.0})
		"chain":
			var n := int(d.get("n", 4))
			var es0 := _near(p.x, p.y, 380.0)
			if es0.is_empty(): return false
			var hit := {}
			var cx: float = p.x
			var cy: float = p.y - 30.0
			var cur = g.weapons.aim_targets(p.x, p.y, 1, 380.0)
			if cur.is_empty(): return false
			var e = cur[0]
			for k in n:
				if e == null: break
				hit[e.get_instance_id()] = true
				if g.renderer3d: g.renderer3d.spawn_lightning_arc(cx, cy, e.x, e.y)
				g.vfx.bolt(cx, cy, e.x, e.y - 10, col)
				Combat.apply_hit(g, e, dmg * (1.0 - 0.08 * k), atan2(e.y - cy, e.x - cx), 0.0)
				g.spawn_burst(e.x, e.y - 10, hx, 5, 140, 2.4, 0.35, true)
				cx = e.x; cy = e.y
				var nx = null
				var bd := 200.0 * 200.0
				for o in _near(cx, cy, 200.0):
					if hit.has(o.get_instance_id()): continue
					var dd: float = (o.x - cx) * (o.x - cx) + (o.y - cy) * (o.y - cy)
					if dd < bd: bd = dd; nx = o
				e = nx
		"strike", "flame":
			var n := int(d.get("n", 1))
			var pts := _pick_points(str(d.get("pick", "near")), n)
			if pts.is_empty(): return false
			var isFlame := str(d.kind) == "flame"
			for k in pts.size():
				var q: Vector2 = pts[k]
				strikes.append({"x": q.x, "y": q.y, "t": (0.12 if isFlame else 0.45) + 0.18 * k, "dmg": dmg, "r": float(d.get("r", 60.0)),
					"c": hx, "fx": "flame" if isFlame else str(d.get("fx", "storm")), "warn": 0.0})
		"pull":
			var pts := _pick_points("crowd", 1)
			if pts.is_empty(): return false
			var q: Vector2 = pts[0]
			pulls.append({"x": q.x, "y": q.y, "t": 1.1, "max": 1.1, "r": R, "dmg": dmg, "c": hx})
			g.vfx.ring(q.x, q.y, R, col, 1.1)
		"haste":
			var amt := float(d.get("amt", 0.25))
			p.atkPct += amt
			hastes.append([float(d.get("t", 3.0)), amt])
			g.vfx.cast(p.x, p.y, col, 60.0)
		"heal":
			if p.hp >= p.maxHp * 0.97: return false
			p.heal(p.maxHp * float(d.get("heal", 0.06)))
			g.vfx.cast(p.x, p.y, col, 64.0)
			for k in 12: g.spawn_burst(p.x + randf_range(-20, 20), p.y - randf() * 40, hx, 1, 60, 2.6, 0.6, true)
		_:
			return false
	_label(d)
	g.audio.play("bless")
	return true

## hedef noktalar: near = en yakın düşman, strong = yakındaki en dayanıklı, crowd = en kalabalık küme(ler)
func _pick_points(mode: String, n: int) -> Array:
	var p = game.player
	var es := _near(p.x, p.y, 420.0)
	if es.is_empty(): return []
	var out: Array = []
	if mode == "strong":
		var best = es[0]
		for e in es:
			if e.hp > best.hp: best = e
		return [Vector2(best.x, best.y)]
	if mode == "near":
		var ts: Array = game.weapons.aim_targets(p.x, p.y, n, 420.0)
		for e in ts: out.append(Vector2(e.x, e.y))
		return out
	# crowd: en çok komşusu olan düşmanlar (birbirinden uzak noktalar)
	var scored: Array = []
	for e in es:
		var c := 0
		for o in es:
			if (o.x - e.x) * (o.x - e.x) + (o.y - e.y) * (o.y - e.y) < 90.0 * 90.0: c += 1
		scored.append([c, e])
	scored.sort_custom(func(a, b): return a[0] > b[0])
	for s in scored:
		var e = s[1]
		var ok := true
		for q in out:
			if (q.x - e.x) * (q.x - e.x) + (q.y - e.y) * (q.y - e.y) < 110.0 * 110.0: ok = false; break
		if ok: out.append(Vector2(e.x, e.y))
		if out.size() >= n: break
	while out.size() < n and not out.is_empty():
		var b: Vector2 = out[randi() % out.size()]
		out.append(b + Vector2(randf_range(-80, 80), randf_range(-60, 60)))
	return out

func _tick_shots(dt: float) -> void:
	var g = game
	for i in range(shots.size() - 1, -1, -1):
		var s: Dictionary = shots[i]
		s.t += dt
		var e = s.tgt
		var alive: bool = e != null and is_instance_valid(e) and e.hp > 0 and e.aliveTok == s.tok
		if not alive:
			var ts: Array = g.weapons.aim_targets(s.x, s.y, 1, 300.0)
			if ts.is_empty() or s.t > 2.0: shots.remove_at(i); continue
			e = ts[0]; s.tgt = e; s.tok = e.aliveTok
		var dx: float = e.x - s.x
		var dy: float = (e.y - 10.0) - s.y
		var d := sqrt(dx * dx + dy * dy)
		# kıvrımlı güdüm: önce dışa savrulur, sonra hızla hedefe kilitlenir
		var k := minf(1.0, dt * (4.0 + s.t * 14.0))
		s.vx += (dx / maxf(d, 1.0) * s.sp - s.vx) * k
		s.vy += (dy / maxf(d, 1.0) * s.sp - s.vy) * k
		s.x += s.vx * dt
		s.y += s.vy * dt
		if g.in_view(s.x, s.y, 30): g.spawn_burst(s.x, s.y, s.c, 1, 18, 3.4, 0.2, true)
		if d < 14.0 + e.radius:
			Combat.apply_hit(g, e, s.dmg, atan2(s.vy, s.vx), 0.0)
			if s.heal > 0.0: g.player.heal(g.player.maxHp * s.heal)
			g.spawn_burst(e.x, e.y - 10, s.c, 6, 150, 2.6, 0.35, true)
			if g.renderer3d:
				var c := Color(s.c)
				g.renderer3d.spawn_hit(e.x, e.y, atan2(s.vy, s.vx), 1, c.r, c.g, c.b)
			shots.remove_at(i)

func _tick_strikes(dt: float) -> void:
	var g = game
	for i in range(strikes.size() - 1, -1, -1):
		var s: Dictionary = strikes[i]
		s.t -= dt
		s.warn -= dt
		if s.warn <= 0.0 and s.t > 0.08:
			s.warn = 0.12
			g.vfx.ring(s.x, s.y, s.r, Color(s.c), 0.14)
		if s.t > 0.0: continue
		for e in _near(s.x, s.y, s.r, AOE_CAP):
			Combat.apply_hit(g, e, s.dmg, atan2(e.y - s.y, e.x - s.x), 0.0)
		if g.renderer3d:
			match str(s.fx):
				"judge": g.renderer3d.spawn_judgement(s.x, s.y)
				"flame": g.renderer3d.spawn_flame_impact(s.x, s.y, 0.0, s.r / 55.0)
				_: g.renderer3d.spawn_storm_strike(s.x, s.y)
		g.vfx.ring(s.x, s.y, s.r, Color(s.c), 0.4)
		g.spawn_burst(s.x, s.y - 8, s.c, 14, 220, 3.0, 0.5, true)
		g.add_shake(0.12)
		strikes.remove_at(i)

func _tick_pulls(dt: float) -> void:
	var g = game
	for i in range(pulls.size() - 1, -1, -1):
		var w: Dictionary = pulls[i]
		w.t -= dt
		for e in _near(w.x, w.y, w.r):
			if e.isBoss: continue
			var dx: float = w.x - e.x
			var dy: float = w.y - e.y
			var d := maxf(1.0, sqrt(dx * dx + dy * dy))
			var f: float = 320.0 * (0.4 if e.elite else 1.0) * float(e.knockRes if e.knockRes > 0.3 else 0.3)
			e.x += dx / d * minf(d, f * dt)
			e.y += dy / d * minf(d, f * dt)
			e.pushT = maxf(e.pushT, 0.1)
		if randf() < 0.7:
			var a := randf() * TAU
			g.spawn_burst(w.x + cos(a) * w.r * 0.8, w.y + sin(a) * w.r * 0.8, w.c, 1, 30, 2.6, 0.4, true)
		if w.t <= 0.0:
			for e in _near(w.x, w.y, w.r * 0.7, AOE_CAP):
				Combat.apply_hit(g, e, w.dmg, atan2(e.y - w.y, e.x - w.x), 0.0)
			if g.renderer3d:
				var c := Color(w.c)
				g.renderer3d.spawn_cast(w.x, w.y, c.r, c.g, c.b)
			g.vfx.ring(w.x, w.y, w.r * 0.7, Color(w.c), 0.45)
			g.spawn_burst(w.x, w.y - 8, w.c, 16, 220, 3.0, 0.5, true)
			pulls.remove_at(i)
