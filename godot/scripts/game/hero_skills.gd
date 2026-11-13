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

## Efsanevi eşya yetenekleri: kuşanılan her efsanevi eşya kendine özel, kısa ve göz alıcı bir yetenek
## verir. Kahraman yeteneklerinden ZAYIF (zayıf yetenek düzeyinin altında hasar, 9–14 sn bekleme,
## en çok 4 hedef); hasar eşyanın seviyesi + basma bonusuyla ölçeklenir.
const GEAR_SKILLS := {
	"e_ef_kilic": {"name": "Güneş Yarığı", "en": "Sun Rift", "kind": "strike", "cd": 11, "dmg": 22, "r": 55, "pick": "strong", "fx": "judge", "c": "#ffd060", "desc": "En güçlü düşmana gökten altın bir darbe iner."},
	"e_ef_balta": {"name": "Kıyamet Darbesi", "en": "Doom Strike", "kind": "strike", "cd": 12, "dmg": 20, "r": 70, "pick": "near", "fx": "judge", "c": "#ff6a3a", "desc": "Yakındaki düşmana kıyamet baltası iner."},
	"e_ef_yay": {"name": "Yıldırım Oku", "en": "Thunder Arrow", "kind": "chain", "cd": 10, "dmg": 13, "n": 3, "c": "#9fdcff", "desc": "Şimşek üç düşman arasında sıçrar."},
	"e_ef_asa": {"name": "Güneş Patlaması", "en": "Solar Burst", "kind": "nova", "cd": 12, "dmg": 14, "r": 90, "fx": "flame", "c": "#ffb040", "desc": "Çevrende kısa bir alev halkası patlar."},
	"e_ef_hancer": {"name": "Ejder Dişleri", "en": "Dragon Fangs", "kind": "bolts", "cd": 9, "dmg": 11, "n": 3, "c": "#ff5a3a", "desc": "Üç ateş dişi en yakın düşmanlara uçar."},
	"e_kadimzirh": {"name": "Muhafız Halkası", "en": "Warden Ring", "kind": "nova", "cd": 13, "dmg": 10, "r": 85, "slow": 1.5, "c": "#e8d8a0", "desc": "Çevreye yavaşlatan bir koruma dalgası yayar."},
	"e_kizilay": {"name": "Kızıl Ay Hasadı", "en": "Crimson Harvest", "kind": "bolts", "cd": 12, "dmg": 10, "n": 3, "heal": 0.006, "c": "#ff3a5a", "desc": "Üç kan oku; her isabet seni biraz iyileştirir."},
	"e_savaseldiven": {"name": "Savaş Narası", "en": "War Cry", "kind": "haste", "cd": 14, "t": 2.5, "amt": 0.12, "c": "#ffc04a", "desc": "Kısa süre saldırı hızın artar."},
	"e_cellatel": {"name": "Cellat İmi", "en": "Executioner's Mark", "kind": "strike", "cd": 13, "dmg": 26, "r": 45, "pick": "strong", "fx": "judge", "c": "#ff4040", "desc": "En güçlü düşmana infaz darbesi iner."},
	"e_avcicizme": {"name": "Avcı Okları", "en": "Hunter's Volley", "kind": "bolts", "cd": 10, "dmg": 9, "n": 4, "c": "#b8ff6a", "desc": "Dört güdümlü ok en yakın düşmanları bulur."},
	"e_golgecizme": {"name": "Gölge Patlaması", "en": "Shadow Burst", "kind": "nova", "cd": 11, "dmg": 10, "r": 80, "slow": 1.2, "c": "#9a7aff", "desc": "Gölgeler patlar, çevredeki düşmanlar yavaşlar."},
	"e_ruzgar": {"name": "Fırtına Adımı", "en": "Storm Step", "kind": "strike", "cd": 12, "dmg": 14, "r": 75, "pick": "crowd", "fx": "storm", "c": "#9ff0ff", "desc": "Düşman kalabalığına yıldırım düşer."},
	"e_kanayin": {"name": "Kan Ayini", "en": "Blood Rite", "kind": "nova", "cd": 14, "dmg": 9, "r": 80, "heal": 0.02, "c": "#ff2a48", "desc": "Çevreye kan dalgası yayar ve seni iyileştirir."},
	"e_hiclik": {"name": "Hiçlik Çekimi", "en": "Void Pull", "kind": "pull", "cd": 14, "dmg": 14, "r": 120, "c": "#a06bff", "desc": "Düşmanları bir noktaya çekip ezer."},
}
const GEAR_AOE := 4

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
	# kuşanılan efsanevi eşyalar
	if not OS.get_cmdline_user_args().has("noskills") and game.has_method("char_gear_map"):
		var mp: Dictionary = game.char_gear_map()
		for sl in mp:
			var gid = mp[sl]
			if gid == null or not GEAR_SKILLS.has(str(gid)): continue
			var it = game.gear_by_id(gid)
			if it == null or int(it.rarity) != 4: continue
			var gd: Dictionary = GEAR_SKILLS[str(gid)].duplicate()
			gd["gear"] = true
			gd["gicon"] = str(it.get("icon", ""))
			gd["gmul"] = float(game.gear_mul(gid)) if game.has_method("gear_mul") else 1.0
			list.append({"def": gd, "cd": float(gd.cd) * (0.7 + 0.2 * i), "max": float(gd.cd), "flash": 0.0})
			i += 1

## oyuncu seviyesiyle büyüyen hasar (silahlarla aynı eğim)
## alan yetenekleri kalabalıkta çok düşmana değdiği için daha düşük katsayı alır (denge ölçümü)
const KIND_MUL := {"nova": 0.55, "frost": 0.55, "strike": 0.42, "flame": 0.42, "pull": 0.55, "bolts": 0.42, "chain": 0.42}
func _dmg(d: Dictionary) -> float:
	var km: float = KIND_MUL.get(str(d.get("kind", "")), 1.0)
	if d.get("gear", false):
		return float(d.get("dmg", 0.0)) * km * (1.0 + 0.08 * float(game.player.level - 1)) * float(d.get("gmul", 1.0))
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
	if d.get("gear", false):
		var nm := str(d.get("en", d.name)) if I18n.lang == "en" else str(d.name)
		game.spawn_text(p.x, p.y - 58, "◆ " + Txt.upper_tr(nm), str(d.get("c", "#ffffff")), 13, true)
		return
	game.spawn_text(p.x, p.y - 70, Txt.upper_tr(I18n.t(str(d.get("name", "")))), str(d.get("c", "#ffffff")), 15, true)

func _cast(d: Dictionary) -> bool:
	var g = game
	var p = g.player
	var col := Color(str(d.get("c", "#ffffff")))
	var hx: String = str(d.get("c", "#ffffff"))
	var dmg := _dmg(d)
	var R: float = float(d.get("r", 100.0))
	var cap: int = GEAR_AOE if d.get("gear", false) else AOE_CAP
	match str(d.get("kind", "")):
		"nova", "frost":
			var es := _near(p.x, p.y, R, cap)
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
				var gr: bool = d.get("gear", false)
				var sx0: float = p.x + cos(a) * 18.0
				var sy0: float = p.y - 30.0 + sin(a) * 10.0
				shots.append({"x": sx0, "y": sy0, "px": sx0, "py": sy0, "tgt": e, "tok": e.lifeTok, "dmg": dmg, "c": hx, "gear": gr,
					"sp": 520.0 if gr else 620.0, "heal": float(d.get("heal", 0.0)),
					"vx": cos(a) * (340.0 if gr else 260.0), "vy": sin(a) * (340.0 if gr else 260.0) - 180.0, "t": 0.0})
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
					"c": hx, "fx": "flame" if isFlame else str(d.get("fx", "storm")), "warn": 0.0, "cap": cap})
		"pull":
			var pts := _pick_points("crowd", 1)
			if pts.is_empty(): return false
			var q: Vector2 = pts[0]
			pulls.append({"x": q.x, "y": q.y, "t": 1.1, "max": 1.1, "r": R, "dmg": dmg, "c": hx, "cap": cap})
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
	if d.get("gear", false):
		_gear_flourish(col, hx)
		_gear_extra(d, col, hx)
	else: _flourish(d, col, hx)
	_label(d)
	g.audio.play("tab" if d.get("gear", false) else "bless")
	return true

## efsanevi eşya yeteneği: türüne göre ek, göz alıcı katman (hasar değişmez)
func _gear_extra(d: Dictionary, col: Color, hx: String) -> void:
	var g = game
	var p = g.player
	match str(d.get("kind", "")):
		"nova":
			var R: float = float(d.get("r", 90.0))
			if g.renderer3d: g.renderer3d.spawn_cast(p.x, p.y, col.r, col.g, col.b)
			g.vfx.ring(p.x, p.y, R * 1.18, col.lightened(0.4), 0.6)
			g.vfx.cast(p.x, p.y, col, R * 0.6)
			for k in 12:
				var a := TAU * k / 12.0
				g.pools.particles.take().setup(p.x + cos(a) * R * 0.3, p.y + sin(a) * R * 0.3, cos(a) * 260.0, sin(a) * 160.0 - 30.0, 0.5, 3.4, hx, 0.9, 0, true)
		"strike":
			for st in strikes:
				if float(st.t) > 0.3: g.vfx.cast(st.x, st.y, col, float(st.r) * 0.9)
		"pull":
			for w in pulls:
				if float(w.t) > 1.0:
					g.vfx.cast(w.x, w.y, col, float(w.r) * 0.7)
					if g.renderer3d: g.renderer3d.spawn_cast(w.x, w.y, col.r, col.g, col.b)
		"haste":
			if g.renderer3d: g.renderer3d.spawn_cast(p.x, p.y, col.r, col.g, col.b)
			g.vfx.ring(p.x, p.y, 70.0, col.lightened(0.3), 0.5)
			for k in 16:
				var a := TAU * k / 16.0
				g.pools.particles.take().setup(p.x, p.y - 10, cos(a) * 200.0, sin(a) * 120.0 - 60.0, 0.55, 3.0, hx, 0.88, 0, true)
		"bolts":
			g.vfx.ring(p.x, p.y, 54.0, col.lightened(0.3), 0.35)
		"chain":
			g.vfx.ring(p.x, p.y, 50.0, col.lightened(0.3), 0.35)

## efsanevi eşya döküm anı: hızlı, hafif — eşya renginde genişleyen halka ve fırlayan kıvılcımlar
func _gear_flourish(col: Color, hx: String) -> void:
	var g = game
	var p = g.player
	if not g.in_view(p.x, p.y, 40): return
	g.vfx.ring(p.x, p.y, 36.0, col.lightened(0.35), 0.28)
	for i in 10:
		var a := TAU * i / 10.0
		g.pools.particles.take().setup(p.x, p.y - 10, cos(a) * 150.0, sin(a) * 90.0 - 40.0, 0.35, 2.4, hx, 0.9, 0, true)

## ortak döküm anı: yetenek renginde ışık sütunu, ayakta çift halka, yükselen sarmal kıvılcım, hafif itki
func _flourish(d: Dictionary, col: Color, hx: String) -> void:
	var g = game
	var p = g.player
	if not g.in_view(p.x, p.y, 40): return
	var k := str(d.get("kind", ""))
	if g.renderer3d and k != "nova" and k != "frost": g.renderer3d.spawn_cast(p.x, p.y, col.r, col.g, col.b)
	g.vfx.ring(p.x, p.y, 44.0, col.lightened(0.25), 0.4)
	g.vfx.ring(p.x, p.y, 28.0, col, 0.3)
	for i in 14:
		var a := TAU * i / 7.0
		var r := 16.0 + i * 1.6
		g.pools.particles.take().setup(p.x + cos(a) * r, p.y + sin(a) * r * 0.55, cos(a) * 24.0, -70.0 - i * 6.0, 0.7 + i * 0.02, 2.6, hx, 0.95, 0, true)
	g.punch(0.015)

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
		var alive: bool = e != null and is_instance_valid(e) and e.hp > 0 and e.lifeTok == s.tok
		if not alive:
			var ts: Array = g.weapons.aim_targets(s.x, s.y, 1, 300.0)
			if ts.is_empty() or s.t > 2.0: shots.remove_at(i); continue
			e = ts[0]; s.tgt = e; s.tok = e.lifeTok
		var dx: float = e.x - s.x
		var dy: float = (e.y - 10.0) - s.y
		var d := sqrt(dx * dx + dy * dy)
		# kıvrımlı güdüm: önce dışa savrulur, sonra hızla hedefe kilitlenir
		var k := minf(1.0, dt * (4.0 + s.t * 14.0))
		s.vx += (dx / maxf(d, 1.0) * s.sp - s.vx) * k
		s.vy += (dy / maxf(d, 1.0) * s.sp - s.vy) * k
		s.px = s.x; s.py = s.y
		s.x += s.vx * dt
		s.y += s.vy * dt
		if s.get("gear", false):
			# efsanevi mermi: katmanlı ışık kuyruğu (kalın, parlak, sönerek incelen) + kıvılcım
			if g.in_view(s.x, s.y, 40):
				var cc := Color(s.c)
				g.vfx.beam(s.px, s.py, s.x, s.y, 16.0, 16.0, cc, 24.0)
				g.spawn_burst(s.x, s.y - 14, s.c, 3, 70, 5.6, 0.36, true)
				g.spawn_burst(s.x, s.y - 14, "#ffffff", 1, 24, 4.2, 0.18, true)
		elif g.in_view(s.x, s.y, 30): g.spawn_burst(s.x, s.y, s.c, 2, 22, 3.6, 0.26, true)
		if d < 14.0 + e.radius:
			Combat.apply_hit(g, e, s.dmg, atan2(s.vy, s.vx), 0.0)
			if s.heal > 0.0: g.player.heal(g.player.maxHp * s.heal)
			g.spawn_burst(e.x, e.y - 10, s.c, 8, 160, 2.6, 0.38, true)
			g.vfx.ring(e.x, e.y, 26.0, Color(s.c), 0.25)
			if s.get("gear", false):
				var hc := Color(s.c)
				g.vfx.hit(e.x, e.y - 10, atan2(s.vy, s.vx), true, hc)
				g.vfx.ring(e.x, e.y, 46.0, hc.lightened(0.3), 0.32)
				g.spawn_burst(e.x, e.y - 10, s.c, 12, 240, 3.4, 0.45, true)
				if g.renderer3d and hc.r > 0.8 and hc.g < 0.6: g.renderer3d.spawn_flame_impact(e.x, e.y, atan2(s.vy, s.vx), 0.7)
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
		for e in _near(s.x, s.y, s.r, int(s.get("cap", AOE_CAP))):
			Combat.apply_hit(g, e, s.dmg, atan2(e.y - s.y, e.x - s.x), 0.0)
		if g.renderer3d:
			match str(s.fx):
				"judge": g.renderer3d.spawn_judgement(s.x, s.y)
				"flame": g.renderer3d.spawn_flame_impact(s.x, s.y, 0.0, s.r / 55.0)
				_: g.renderer3d.spawn_storm_strike(s.x, s.y)
		g.vfx.ring(s.x, s.y, s.r, Color(s.c), 0.4)
		g.vfx.ring(s.x, s.y, s.r * 1.4, Color(s.c).lightened(0.3), 0.55)     # ikinci şok dalgası
		g.spawn_burst(s.x, s.y - 8, s.c, 18, 240, 3.0, 0.55, true)
		if g.renderer3d:
			var cc := Color(s.c)
			g.renderer3d.spawn_hit(s.x, s.y, 0.0, 2, cc.r, cc.g, cc.b)
		g.add_shake(0.14)
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
			for e in _near(w.x, w.y, w.r * 0.7, int(w.get("cap", AOE_CAP))):
				Combat.apply_hit(g, e, w.dmg, atan2(e.y - w.y, e.x - w.x), 0.0)
			if g.renderer3d:
				var c := Color(w.c)
				g.renderer3d.spawn_cast(w.x, w.y, c.r, c.g, c.b)
			g.vfx.ring(w.x, w.y, w.r * 0.7, Color(w.c), 0.45)
			g.spawn_burst(w.x, w.y - 8, w.c, 16, 220, 3.0, 0.5, true)
			pulls.remove_at(i)
