class_name ArenaArt
extends Node2D
## Dünya önizlemesi: çizgi roman tarzı UÇAN ADA çizimi (tools/islands/gen.py → assets/ui/arena/w<n>.png).
## Arkada dünya renginde sade gece zemini ve adanın ardında yumuşak bir ışık; ada yavaşça süzülür,
## altındaki gölge nefes alır. Kilitliyse ada karanlık ve durgun.

var wd: Dictionary = {}
var box := Vector2(358, 279)
var art_h := 0.0          # arenanın kapladığı üst alan (0 → tüm kutu)
var locked := false
var _tex: Texture2D
var _sprite: Sprite2D
var _shadow: Node2D
var _y0 := 0.0
var _dsz := Vector2.ZERO
var _t := 0.0
var _ph := 0.0

static func path_of(w: int) -> String:
	return "res://assets/ui/arena/w" + str(w) + ".png"

func setup(world: Dictionary, sz: Vector2, top_h := 0.0, is_locked := false) -> void:
	wd = world
	box = sz
	art_h = top_h
	locked = is_locked
	_ph = float(int(wd.get("id", 1))) * 1.7
	_tex = UITex.get_tex(path_of(int(wd.get("id", 1))))
	_build()
	queue_redraw()

func set_clip(m: Material) -> void:
	material = m
	for c in [_shadow, _sprite]:
		if c: (c as CanvasItem).use_parent_material = true

func _build() -> void:
	for c in get_children(): c.queue_free()
	_sprite = null
	if _tex == null: return
	var ah := art_h if art_h > 0.0 else box.y
	var ts := Vector2(_tex.get_size())
	var s := minf(box.x * 0.9 / ts.x, ah * 0.9 / ts.y)
	_dsz = ts * s
	_y0 = ah * 0.5
	_shadow = Node2D.new()
	_shadow.use_parent_material = true
	_shadow.position = Vector2(box.x * 0.5, _y0 + _dsz.y * 0.47)
	_shadow.draw.connect(func():
		var B := TriBatch.new()
		B.radial(Vector2.ZERO, _dsz.x * 0.34, Color(0, 0, 0, 0.42 if not locked else 0.25), Color(0, 0, 0, 0.0), 0.22)
		B.flush(_shadow))
	add_child(_shadow)
	_sprite = Sprite2D.new()
	_sprite.use_parent_material = true
	_sprite.texture = _tex
	_sprite.scale = Vector2.ONE * s
	_sprite.position = Vector2(box.x * 0.5, _y0)
	if locked: _sprite.modulate = Color(0.32, 0.3, 0.38)
	add_child(_sprite)

func _wc() -> Color:
	return Color(str(wd.get("color", "#8a6cff")))

func _draw() -> void:
	if wd.is_empty(): return
	var col := _wc()
	var top := col.darkened(0.72)
	var bot := Color("#0d0814")
	draw_polygon(PackedVector2Array([Vector2.ZERO, Vector2(box.x, 0), box, Vector2(0, box.y)]),
		PackedColorArray([top, top, bot, bot]))
	# arenanın ardında yumuşak dünya ışığı
	var ah := art_h if art_h > 0.0 else box.y
	var B := TriBatch.new()
	B.radial(Vector2(box.x * 0.5, ah * 0.42), box.x * 0.62, Color(col, 0.34 if not locked else 0.1), Color(col, 0.0), 0.7)
	B.flush(self)

func _process(dt: float) -> void:
	if _sprite == null or locked or not is_visible_in_tree(): return
	_t += dt
	var b := sin(_t * 1.3 + _ph)
	_sprite.position.y = _y0 + b * 5.0
	_shadow.scale = Vector2.ONE * (1.0 - b * 0.06)
