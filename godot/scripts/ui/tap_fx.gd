class_name TapFx
extends CanvasLayer
## Dokunuş geri bildirimi (çizgi roman "POP"): bir düğme etkinleşince parmağın altında kısa,
## mürekkep konturlu küçük bir patlama yıldızı + genişleyen halka + 6 kıvılcım (0,38 sn).
## Tüm arayüzün üstünde tek katman; sahne ağacına ilk kullanımda kendini ekler.

const INK := Color(0.05, 0.03, 0.07)
const YEL := Color("#ffd23a")
const LIFE := 0.38

static var _inst: TapFx

var _pops: Array = []        # [pos, t, col, seed]
var _t := 0.0
var _n: Node2D

static func pop(pos: Vector2, col := YEL) -> void:
	if Settings.data.get("rm", false): return
	if _inst == null or not is_instance_valid(_inst):
		var tree := Engine.get_main_loop() as SceneTree
		if tree == null: return
		_inst = TapFx.new()
		tree.root.add_child(_inst)
	_inst._pops.append([pos, _inst._t, col, randf() * TAU])
	_inst.set_process(true)

func _init() -> void:
	layer = 120
	process_mode = Node.PROCESS_MODE_ALWAYS
	_n = Node2D.new()
	_n.draw.connect(_draw)
	add_child(_n)

func _process(dt: float) -> void:
	_t += dt
	for i in range(_pops.size() - 1, -1, -1):
		if _t - float(_pops[i][1]) > LIFE: _pops.remove_at(i)
	_n.queue_redraw()
	if _pops.is_empty(): set_process(false)

func _draw() -> void:
	for p in _pops:
		var k := (_t - float(p[1])) / LIFE
		var c: Vector2 = p[0]
		var col: Color = p[2]
		var e := 1.0 - pow(1.0 - k, 3.0)
		var a := 1.0 - k
		# halka
		_n.draw_arc(c, 10.0 + 30.0 * e, 0, TAU, 32, Color(INK, a * 0.85), 4.0 * (1.0 - k) + 1.0, true)
		_n.draw_arc(c, 10.0 + 30.0 * e, 0, TAU, 32, Color(col, a), 2.0 * (1.0 - k) + 0.5, true)
		# küçük patlama yıldızı (ilk yarı)
		if k < 0.5:
			var s := sin(k / 0.5 * PI) * 15.0
			var P := PackedVector2Array()
			for i in 16:
				var an := float(p[3]) + i * PI / 8.0
				var rr := s if i % 2 == 0 else s * 0.5
				P.append(c + Vector2(cos(an), sin(an)) * rr)
			_n.draw_colored_polygon(P, Color(Color.WHITE, 0.9))
		# kıvılcımlar
		for i in 6:
			var an := float(p[3]) + i * TAU / 6.0
			var d := Vector2(cos(an), sin(an))
			var q := c + d * (14.0 + 34.0 * e)
			var L := 7.0 * (1.0 - k)
			_n.draw_line(q, q + d * L, Color(col, a), 3.0, true)
