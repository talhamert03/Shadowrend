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
	if _walk != Vector2.ZERO and game.state == "playing":
		mx = _walk.x; my = _walk.y
var _walk = null

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
