class_name ArenaArt
extends Node2D
## Dünya önizlemesi: gökte süzülen fantastik ADA (tools/diorama.gd ile oyunun kendi zemini,
## objeleri ve düşmanlarından çizilmiş, assets/ui/arena/w<n>.png). Arkada dünya renginde gece
## zemini, soluk ışınlar ve hale; ada yavaşça süzülür, gölgesi nefes alır, çevresinde kıvılcımlar
## parlar. Kilitliyse ada karanlık ve durgun.

var wd: Dictionary = {}
var box := Vector2(358, 279)
var art_h := 0.0          # adanın kapladığı üst alan (0 → tüm kutu)
var locked := false
var _tex: Texture2D
var _isle: Node2D
var _sprite: Sprite2D
var _shadow: Node2D
var _sparks: Node2D
var _t := 0.0
var _y0 := 0.0
var _dsz := Vector2.ZERO
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
	for c in [_isle, _shadow, _sparks, _sprite]:
		if c: (c as CanvasItem).use_parent_material = true

func _build() -> void:
	for c in get_children(): c.queue_free()
	_isle = null
	if _tex == null: return
	var ah := art_h if art_h > 0.0 else box.y
	var ts := Vector2(_tex.get_size())
	var s := minf(box.x * 0.84 / ts.x, ah * 0.9 / ts.y)
	_dsz = ts * s
	_y0 = ah * 0.5
	_shadow = Node2D.new()
	_shadow.use_parent_material = true
	_shadow.position = Vector2(box.x * 0.5, _y0 + _dsz.y * 0.5 + 4.0)
	var col := _wc()
	_shadow.draw.connect(func():
		var B := TriBatch.new()
		B.radial(Vector2.ZERO, _dsz.x * 0.34, Color(col, 0.38 if not locked else 0.1), Color(col, 0.0), 0.22)
		B.flush(_shadow))
	add_child(_shadow)
	_isle = Node2D.new()
	_isle.use_parent_material = true
	_isle.position = Vector2(box.x * 0.5, _y0)
	add_child(_isle)
	_sprite = Sprite2D.new()
	_sprite.use_parent_material = true
	_sprite.texture = _tex
	_sprite.scale = Vector2.ONE * s
	if locked: _sprite.modulate = Color(0.3, 0.28, 0.36)
	_isle.add_child(_sprite)
	if not locked:
		_sparks = Node2D.new()
		_sparks.use_parent_material = true
		_sparks.draw.connect(_draw_sparks)
		add_child(_sparks)

func _wc() -> Color:
	return Color(str(wd.get("color", "#8a6cff")))

func _draw() -> void:
	if wd.is_empty(): return
	var col := _wc()
	var top := col.darkened(0.6)
	var bot := Color("#0d0814")
	draw_polygon(PackedVector2Array([Vector2.ZERO, Vector2(box.x, 0), box, Vector2(0, box.y)]),
		PackedColorArray([top, top, bot, bot]))
	var ah := art_h if art_h > 0.0 else box.y
	var c := Vector2(box.x * 0.5, ah * 0.46)
	var B := TriBatch.new()
	for i in 16:
		var a := i * TAU / 16.0
		B._tri(c, c + Vector2(cos(a - 0.09), sin(a - 0.09)) * box.x, c + Vector2(cos(a + 0.09), sin(a + 0.09)) * box.x, Color(col.lightened(0.35), 0.06))
	B.radial(c, box.x * 0.5, Color(col.lightened(0.15), 0.5 if not locked else 0.14), Color(col, 0.0))
	# uzak yıldız tozu (durağan)
	var rng := RandomNumberGenerator.new()
	rng.seed = int(_ph * 1000.0)
	for i in 22:
		var p := Vector2(rng.randf() * box.x, rng.randf() * ah)
		B.circle(p, rng.randf_range(0.6, 1.5), Color(1, 1, 1, rng.randf_range(0.15, 0.45)), 6)
	B.flush(self)

## ada çevresinde parlayan dört köşeli kıvılcımlar (tek ağ)
func _draw_sparks() -> void:
	var col := _wc().lightened(0.45)
	var B := TriBatch.new()
	for i in 7:
		var k := fmod(_t * 0.35 + i * 0.143 + _ph, 1.0)
		var a := i * 2.399 + _ph
		var p := Vector2(box.x * 0.5 + cos(a) * _dsz.x * (0.42 + 0.08 * sin(i * 1.3)), _y0 + sin(a) * _dsz.y * 0.36 - k * 26.0)
		var r := 5.0 * sin(k * PI)
		if r < 0.4: continue
		var c2 := Color(col, sin(k * PI) * 0.9)
		B.poly(PackedVector2Array([p + Vector2(0, -r * 2.0), p + Vector2(r * 0.4, 0), p + Vector2(0, r * 2.0), p + Vector2(-r * 0.4, 0)]), c2)
		B.poly(PackedVector2Array([p + Vector2(-r * 2.0, 0), p + Vector2(0, r * 0.4), p + Vector2(r * 2.0, 0), p + Vector2(0, -r * 0.4)]), c2)
	B.flush(_sparks)

func _process(dt: float) -> void:
	if _isle == null or locked or not is_visible_in_tree(): return
	_t += dt
	var b := sin(_t * 1.3 + _ph)
	_isle.position.y = _y0 + b * 5.0
	_shadow.scale = Vector2.ONE * (1.0 - b * 0.06)
	if _sparks: _sparks.queue_redraw()
