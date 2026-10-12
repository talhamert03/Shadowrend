class_name AchToast
extends Node2D
## ui.js _achToast — BAŞARIM bildirimi: üstten iner (achIn), 2,4 sn kalır, çıkış
## durumuna geçer, 2,8 sn'de sıradakine geçer. Sayfa kaydırmaz, dokunuşu engellemez.

var g
var queue: Array = []
var L: Lyr
var _t := 0.0

func _init(game) -> void:
	g = game
	name = "AchToast"
	process_mode = Node.PROCESS_MODE_ALWAYS

func push(list: Array, delay := 0.0) -> void:
	for a in list: queue.append(a)
	if L == null: _t = -delay

func _next() -> void:
	if queue.is_empty(): return
	var a: Dictionary = queue.pop_front()
	L = Lyr.make("ach")
	add_child(L)
	var R: Array = L.data.get("rect", [195, 14, 340, 69])
	L.position = Vector2(R[0], R[1])
	L.set_text(L.find_exact("b"), str(a.get("name", "")))
	var parts := []
	if a.get("gold", 0): parts.append("+" + str(a.gold) + " ALTIN")
	if a.get("gem", 0): parts.append("+" + str(a.gem) + " GEM")
	if a.get("title", ""): parts.append("UNVAN: " + str(a.title))
	L.set_text(L.find_exact("em"), " · ".join(parts))
	g.audio.play("star")
	_t = 0.0

func _process(dt: float) -> void:
	_t += dt
	if L == null:
		if _t >= 0.0 and queue.size(): _next()
		return
	if _t >= 2.4 and not L.has_meta("out"):
		L.set_meta("out", true)
		L.to_state("ach_out")
	if _t >= 2.8:
		L.queue_free()
		L = null
		_t = 0.0
		if g.ui and g.ui.has_method("refresh_wallet"): g.ui.refresh_wallet()
