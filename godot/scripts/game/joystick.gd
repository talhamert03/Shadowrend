class_name Joystick
extends Node
## input.js — "Sabit doğan joystick" (birebir).
## Parmak NEREDE basarsa joystick TAM ORADA doğar ve SABİT kalır; yalnız
## topuz merkez etrafında döner. İlk parmak takip edilir, ikinciler yok
## sayılır. Masaüstü testi için WASD / ok tuşları.
## _unhandled_input kullanılır: arayüz düğmeleri (duraklat vb.) dokunuşu
## önce alır — web'de üstteki HTML katmanının kanvası örtmesiyle aynı.

var game
var active := false
var id := -1
var ox := 0.0; var oy := 0.0
var kx := 0.0; var ky := 0.0
var ax := 0.0; var ay := 0.0
var mx := 0.0; var my := 0.0
const RADIUS := 56.0
const DEAD := 0.08
var keys := {}

func _init(g) -> void:
	game = g

func _ready() -> void:
	process_mode = Node.PROCESS_MODE_ALWAYS

func _unhandled_input(ev: InputEvent) -> void:
	if ev is InputEventScreenTouch:
		if ev.pressed: _on_down(ev.index, ev.position)
		elif ev.index == id: _release()
	elif ev is InputEventScreenDrag:
		_on_move(ev.index, ev.position)
	elif ev is InputEventKey:
		var code := (ev as InputEventKey).physical_keycode
		keys[code] = ev.pressed
		if ev.pressed and not ev.echo:
			if code == KEY_ESCAPE and game.state == "playing": game.pause_game()
			if (code == KEY_SPACE or code == KEY_E) and game.state == "playing":
				if game.ult.fire(): get_viewport().set_input_as_handled()

func _notification(what: int) -> void:
	if what == NOTIFICATION_APPLICATION_FOCUS_OUT or what == NOTIFICATION_APPLICATION_PAUSED:
		_release()

func _on_down(idx: int, pos: Vector2) -> void:
	if game.state != "playing": return
	if active: return
	active = true
	id = idx
	ox = pos.x; oy = pos.y
	kx = pos.x; ky = pos.y
	ax = 0; ay = 0

func _on_move(idx: int, pos: Vector2) -> void:
	if not active or idx != id: return
	var dx := pos.x - ox
	var dy := pos.y - oy
	var d2 := dx * dx + dy * dy
	if d2 > RADIUS * RADIUS:
		var d := sqrt(d2)
		dx = dx / d * RADIUS
		dy = dy / d * RADIUS
	kx = ox + dx
	ky = oy + dy
	var nx := dx / RADIUS
	var ny := dy / RADIUS
	if nx * nx + ny * ny < DEAD * DEAD:
		nx = 0; ny = 0
	ax = nx; ay = ny

func _release() -> void:
	active = false
	id = -1
	ax = 0; ay = 0

func reset() -> void:
	_release()
	keys.clear()

func _k(c: int) -> bool:
	return keys.get(c, false)

## Klavye + dokunmatiği birleştirip mx / my üretir.
func sample() -> void:
	if active and game.state != "playing": _release()
	var kxx := (1 if (_k(KEY_D) or _k(KEY_RIGHT)) else 0) - (1 if (_k(KEY_A) or _k(KEY_LEFT)) else 0)
	var kyy := (1 if (_k(KEY_S) or _k(KEY_DOWN)) else 0) - (1 if (_k(KEY_W) or _k(KEY_UP)) else 0)
	if kxx != 0 or kyy != 0:
		var fx := float(kxx); var fy := float(kyy)
		if kxx != 0 and kyy != 0:
			fx *= 0.7071; fy *= 0.7071
		mx = fx; my = fy
	else:
		mx = ax; my = ay
	# geliştirici: walk=x,y — sabit yönde yürü (yürüyüş animasyonu testi)
	if _walk == null:
		_walk = Vector2.ZERO
		for a in OS.get_cmdline_user_args():
			if a.begins_with("walk="):
				var p := a.substr(5).split(",")
				_walk = Vector2(float(p[0]), float(p[1]))
	if _bot == null: _bot = OS.get_cmdline_user_args().has("bot=1")
	if _bot and game.state == "playing":
		_bot_move()
		return
	if _walk != Vector2.ZERO and game.state == "playing":
		mx = _walk.x; my = _walk.y
		# walk=9,9 → sağa-sola, ileri-geri dolaşma (gerçek oyun hareketi gibi; akıcılık testi)
		if _walk.x > 8.0:
			var t: float = game.time
			mx = cos(t * 0.9) * (0.6 + 0.4 * sin(t * 2.3)); my = sin(t * 0.7)
		# walk=7,7 → video modu: sürüden kaçarak etrafında daire çiz (canlı oynanış görüntüsü)
		elif _walk.x > 6.0:
			var t: float = game.time
			var P = game.player
			var rx := 0.0; var ry := 0.0
			for e in game.enemies.pool.active:
				var dx: float = P.x - e.x; var dy: float = P.y - e.y
				var d2: float = dx * dx + dy * dy
				if d2 < 260.0 * 260.0 and d2 > 1.0:
					var d := sqrt(d2); var w := (260.0 - d) / 260.0
					rx += dx / d * w; ry += dy / d * w
			var rl := sqrt(rx * rx + ry * ry)
			var wx := cos(t * 0.55) * 0.8 + cos(t * 1.7) * 0.25
			var wy := sin(t * 0.55) * 0.8 + sin(t * 1.3) * 0.25
			if rl > 0.05:
				rx /= rl; ry /= rl
				var k := clampf(rl * 0.6, 0.0, 0.85)
				# kaçarken yana kay (kite) — sürünün çevresinde tur
				wx = lerp(wx, rx * 0.6 - ry * 0.8, k); wy = lerp(wy, ry * 0.6 + rx * 0.8, k)
			# başlangıç noktasından fazla uzaklaşma
			wx -= P.x * 0.0004; wy -= P.y * 0.0004
			var wl := sqrt(wx * wx + wy * wy)
			if wl > 0.001: mx = wx / wl; my = wy / wl
var _walk = null
var _bot = null
var _botT := 0.0
var _botSkill := -1.0
var _botDir := Vector2.ZERO
var botMinHp := 1.0
var botHurt := 0.0
var _botLastHp := -1.0

## DENGE BOTU (bot=1): makul bir oyuncu gibi oynar — tehlikeden uzaklaşır, sürünün çevresinde
## tur atar (kite), güvendeyken XP/güç toplar, arena duvarından kaçar. Sonuçlar dengeleme
## ölçümü için (tools/balance/botrun.py). Uzman değil "ortalama iyi oyuncu" vekili.
func _bot_move() -> void:
	var g = game
	var P = g.player
	if _botSkill < 0.0:
		_botSkill = 0.5
		for a in OS.get_cmdline_user_args():
			if a.begins_with("botskill="): _botSkill = float(a.substr(9))
	botMinHp = minf(botMinHp, P.hp / maxf(1.0, P.maxHp))
	if _botLastHp >= 0.0 and P.hp < _botLastHp: botHurt += _botLastHp - P.hp
	_botLastHp = P.hp
	# insan benzeri tepki: yön yalnız belli aralıklarla güncellenir (beceri düştükçe daha geç)
	_botT -= 1.0 / 60.0
	if _botT > 0.0:
		mx = _botDir.x; my = _botDir.y
		return
	_botT = lerpf(0.42, 0.12, _botSkill) * randf_range(0.7, 1.3)
	var dx := 0.0; var dy := 0.0
	var danger := 0.0
	var R := lerpf(150.0, 300.0, _botSkill)
	for e in g.enemies.pool.active:
		var ex: float = P.x - e.x; var ey: float = P.y - e.y
		var d2 := ex * ex + ey * ey
		if d2 < R * R and d2 > 1.0:
			var d := sqrt(d2)
			var w := (R - d) / R
			w = w * w * (1.0 + float(e.radius) / 20.0)
			dx += ex / d * w; dy += ey / d * w
			danger += w
	for pn in ["eBullets", "hazards", "bombs"]:
		if not g.pools.has(pn): continue
		for b in g.pools[pn].active:
			var bx: float = P.x - float(b.x); var by: float = P.y - float(b.y)
			var d2b := bx * bx + by * by
			if d2b < 140.0 * 140.0 and d2b > 1.0:
				var db := sqrt(d2b); var wb := (140.0 - db) / 140.0 * 1.6
				dx += bx / db * wb; dy += by / db * wb
				danger += wb
	var dl := sqrt(dx * dx + dy * dy)
	var mx2 := 0.0; var my2 := 0.0
	if dl > 0.01:
		var ux := dx / dl; var uy := dy / dl
		# kaçış + yana kayma (sürünün çevresinde dön)
		var side := 1.0 if fmod(g.time, 14.0) < 7.0 else -1.0
		mx2 = ux * 0.75 - uy * 0.65 * side; my2 = uy * 0.75 + ux * 0.65 * side
	# güvendeyken en yakın XP / güç
	var safe := clampf(1.0 - danger / 2.5, 0.0, 1.0)
	if safe > 0.15:
		var best = null; var bd := 420.0 * 420.0
		for gm in g.pools.gems.active:
			var gx: float = float(gm.x) - P.x; var gy: float = float(gm.y) - P.y
			var gd := gx * gx + gy * gy
			if gd < bd: bd = gd; best = gm
		if g.powerups and "pool" in g.powerups:
			for pu in g.powerups.pool.active:
				var px: float = float(pu.x) - P.x; var py: float = float(pu.y) - P.y
				var pd := (px * px + py * py) * 0.5
				if pd < bd: bd = pd; best = pu
		if best != null:
			var tx: float = float(best.x) - P.x; var ty: float = float(best.y) - P.y
			var tl := sqrt(tx * tx + ty * ty)
			if tl > 1.0: mx2 += tx / tl * safe * 0.9; my2 += ty / tl * safe * 0.9
	# duvar itmesi
	var A = g.arena
	if A:
		var m := 160.0
		if P.x - A.l < m: mx2 += (m - (P.x - A.l)) / m * 1.5
		if A.r - P.x < m: mx2 -= (m - (A.r - P.x)) / m * 1.5
		if P.y - A.t < m: my2 += (m - (P.y - A.t)) / m * 1.5
		if A.b - P.y < m: my2 -= (m - (A.b - P.y)) / m * 1.5
	# dikkat dağınıklığı: düşük beceride rastgele sapma
	var jit := (1.0 - _botSkill) * 0.9
	mx2 += randf_range(-jit, jit); my2 += randf_range(-jit, jit)
	if Combat.devHpMul > 1.0:
		# bench: en yakın düşmana sokul, yakınında dön (yakın dövüşçüler de ölçülebilsin)
		var ne = null; var nd := 1e12
		for e in g.enemies.pool.active:
			var q: float = (e.x - P.x) * (e.x - P.x) + (e.y - P.y) * (e.y - P.y)
			if q < nd: nd = q; ne = e
		if ne != null:
			var nl := sqrt(nd)
			var vx: float = (ne.x - P.x) / maxf(nl, 1.0); var vy: float = (ne.y - P.y) / maxf(nl, 1.0)
			if nl > 70.0: mx2 = vx; my2 = vy
			else: mx2 = -vy * 0.6; my2 = vx * 0.6
	var l := sqrt(mx2 * mx2 + my2 * my2)
	if l > 0.05: mx = mx2 / l; my = my2 / l
	else: mx = 0.0; my = 0.0
	_botDir = Vector2(mx, my)

## Ekran-uzayı joystick çizimi (yalnız aktifken) — input.js render(ctx).
func render(ctx: Ctx2D) -> void:
	if not active or game.state != "playing": return
	var R := RADIUS
	ctx.global_alpha = 0.28
	ctx.set_stroke("#e8e4d8")
	ctx.line_width = 2
	ctx.begin_path()
	ctx.arc(ox, oy, R, 0, TAU)
	ctx.stroke()
	ctx.global_alpha = 0.2
	ctx.begin_path()
	for i in 4:
		var a := i * PI / 2 + PI / 4
		ctx.move_to(ox + cos(a) * (R - 7), oy + sin(a) * (R - 7))
		ctx.line_to(ox + cos(a) * (R + 1), oy + sin(a) * (R + 1))
	ctx.stroke()
	ctx.global_alpha = 0.5
	ctx.set_fill("#f5c044")
	ctx.begin_path()
	ctx.arc(kx, ky, 17, 0, TAU)
	ctx.fill()
	ctx.global_alpha = 0.85
	ctx.set_stroke("#ffe9a8")
	ctx.line_width = 1.5
	ctx.stroke()
	ctx.global_alpha = 1
