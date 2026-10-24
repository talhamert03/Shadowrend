class_name ArenaArt
extends Node2D
## Dünya önizlemesi (Clash Royale arena kartı gibi): dünya renginde sade gece zemini, arkada
## yumuşak hale + soluk ışınlar, ortada o dünyanın 3B dioraması (tools/diorama.gd ile oyunun kendi
## zemini/objeleri/düşmanlarından çizilmiş, assets/ui/arena/w<n>.png). Kilitliyse diorama karanlık.

var wd: Dictionary = {}
var box := Vector2(358, 279)
var art_h := 0.0          # dioramanın kapladığı üst alan (0 → tüm kutu)
var locked := false
var _tex: Texture2D

static func path_of(w: int) -> String:
	return "res://assets/ui/arena/w" + str(w) + ".png"

func setup(world: Dictionary, sz: Vector2, top_h := 0.0, is_locked := false) -> void:
	wd = world
	box = sz
	art_h = top_h
	locked = is_locked
	_tex = UITex.get_tex(path_of(int(wd.get("id", 1))))
	queue_redraw()

func set_clip(m: Material) -> void:
	material = m

func _draw() -> void:
	if wd.is_empty(): return
	var col := Color(str(wd.get("color", "#8a6cff")))
	var top := col.darkened(0.62)
	var bot := Color("#0d0814")
	draw_polygon(PackedVector2Array([Vector2.ZERO, Vector2(box.x, 0), box, Vector2(0, box.y)]),
		PackedColorArray([top, top, bot, bot]))
	var ah := art_h if art_h > 0.0 else box.y
	var c := Vector2(box.x * 0.5, ah * 0.52)
	var B := TriBatch.new()
	# soluk ışınlar + hale
	for i in 16:
		var a := i * TAU / 16.0
		B._tri(c, c + Vector2(cos(a - 0.09), sin(a - 0.09)) * box.x, c + Vector2(cos(a + 0.09), sin(a + 0.09)) * box.x, Color(col.lightened(0.3), 0.06))
	B.radial(c, box.x * 0.46, Color(col, 0.42 if not locked else 0.14), Color(col, 0.0))
	B.flush(self)
	if _tex == null: return
	# diorama: üst alana sığdır, altına yumuşak gölge
	var ts := Vector2(_tex.get_size())
	var s := minf(box.x * 0.86 / ts.x, ah * 0.94 / ts.y)
	var dsz := ts * s
	var p := Vector2((box.x - dsz.x) * 0.5, ah * 0.5 - dsz.y * 0.47)
	var B2 := TriBatch.new()
	B2.radial(Vector2(box.x * 0.5, p.y + dsz.y * 0.97), dsz.x * 0.5, Color(0, 0, 0, 0.55), Color(0, 0, 0, 0), 0.22)
	B2.flush(self)
	draw_texture_rect(_tex, Rect2(p, dsz), false, Color(0.32, 0.30, 0.38) if locked else Color.WHITE)
