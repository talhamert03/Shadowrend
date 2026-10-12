class_name ScrAdWatch
extends Scr
## ui.js showAdWatch — ödüllü reklam. Gerçek reklam ağı bağlanana kadar web'deki
## simülasyon ekranı: n saniye geri sayım + yeşil yay (stroke-dashoffset 1 sn doğrusal).

var L: Lyr
var arc: Node2D
var secs := 3
var left := 3
var cb: Callable
var _t := 0.0
var _k0 := 0.0
var _k1 := 0.0

class Arc extends Node2D:
	var k := 0.0
	var R := 19.0
	var s := 68.0 / 44.0
	func _draw() -> void:
		if k <= 0.0: return
		var c := Vector2(22, 22) * s
		draw_arc(c, R * s, -PI / 2, -PI / 2 + TAU * k, maxi(8, int(64 * k)), Color("#8ce85a"), 4 * s, true)

func _init(game) -> void:
	super(game)
	name = "AdWatch"

func show_ad(seconds: int, on_done: Callable) -> void:
	if L == null:
		L = Lyr.make("adwatch")
		add_child(L)
		var ring := L.find("svg")
		arc = Arc.new()
		ring.node.add_child(arc)
	L.restart()
	L.stretch_h(Scr.dh_of(self))
	secs = maxi(1, seconds)
	left = secs
	cb = on_done
	_t = 0.0
	_k0 = 0.0
	_k1 = 1.0 / secs
	L.set_text(L.find("#ad-watch-num"), str(left))
	visible = true

func _process(dt: float) -> void:
	if not visible: return
	_t += dt
	(arc as Arc).k = lerpf(_k0, _k1, minf(1.0, _t))
	arc.queue_redraw()
	if _t >= 1.0:
		_t -= 1.0
		left -= 1
		if left <= 0:
			visible = false
			if cb.is_valid(): cb.call()
			return
		L.set_text(L.find("#ad-watch-num"), str(left))
		_k0 = _k1
		_k1 = float(secs - left + 1) / secs
