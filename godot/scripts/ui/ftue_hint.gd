class_name FtueHint
extends Node2D
## ftue.js _show — İLK OYUN ipucu plakası (dokunuşu engellemez). move: sürükleyen el;
## level: üstte (sat + 72). Diğerleri ekranın alt %31'inde.

var L: Lyr
var kind := ""

func _init() -> void:
	name = "Ftue"
	process_mode = Node.PROCESS_MODE_ALWAYS

func show_kind(k: String) -> void:
	if k == kind: return
	kind = k
	if L: L.queue_free(); L = null
	if k == "" or not FileAccess.file_exists(Lyr.BASE + "ftue_" + k + ".json"): return
	L = Lyr.make("ftue_" + k)
	add_child(L)
	var H := get_viewport().get_visible_rect().size.y
	var sat := UIK.safe(get_viewport())[0]
	var h: float = L.nodes[0].size.y
	L.position = Vector2(0, sat + 72 if k == "level" else H * 0.69 - h)
