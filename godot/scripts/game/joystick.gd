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

## Ekran-uzayı joystick çizimi (yalnız aktifken). ci: CanvasItem.
func draw(ci: CanvasItem) -> void:
	if not active or game.state != "playing": return
	var o := Vector2(ox, oy)
	ci.draw_arc(o, RADIUS, 0, TAU, 64, Color(0.91, 0.894, 0.847, 0.28), 2.0, true)
	var c2 := Color(0.91, 0.894, 0.847, 0.2)
	for i in 4:
		var a := i * PI / 2 + PI / 4
		ci.draw_line(o + Vector2(cos(a), sin(a)) * (RADIUS - 7), o + Vector2(cos(a), sin(a)) * (RADIUS + 1), c2, 2.0, true)
	var k := Vector2(kx, ky)
	ci.draw_circle(k, 17, Color(0.961, 0.753, 0.267, 0.5), true, -1.0, true)
	ci.draw_arc(k, 17, 0, TAU, 40, Color(1.0, 0.914, 0.659, 0.85), 1.5, true)
