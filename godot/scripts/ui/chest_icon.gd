class_name ChestIcon
extends Node2D
## Canlı sandık simgesi (mağaza, görevler, ana menü önizlemeleri): net doku + zeminde gölge +
## yerinde dururken hafif animasyon (nefes, ara sıra sallanıp zıplama, kilitte parıltı).
## Ucuz: tek Sprite2D + iki küçük toplamsal yıldız; görünmezken hiç işlemez.

var size := 100.0          # mantıksal piksel (sandık kutusunun kenarı)
var tier := 1
var live := true
var _sp: Sprite2D
var _stars: Array = []
var _t := 0.0
var _ph := 0.0
var _next := 0.0           # sonraki sallanma anı
var _wig := -1.0           # sallanma süresi sayacı
var _base := Vector2.ZERO
var _k := 1.0
var _shadow := true

static func tex_of(t: int, sz: float) -> Texture2D:
	t = clampi(t, 1, 7)
	# küçük kullanım: önceden kaliteli küçültülmüş + keskinleştirilmiş doku (bulanık mip yerine)
	var p := "res://assets/ui/art/chest/t" + str(t) + ("_s" if sz <= 132.0 else "") + ".png"
	return UITex.get_tex(p)

static func make(t: int, sz: float, shadow := true, alive := true) -> ChestIcon:
	var c := ChestIcon.new()
	c.tier = clampi(t, 1, 7)
	c.size = sz
	c._shadow = shadow
	c.live = alive
	c._build()
	return c

func _build() -> void:
	_ph = randf() * TAU
	_next = 1.2 + randf() * 3.0
	_sp = Sprite2D.new()
	_sp.texture = tex_of(tier, size)
	_sp.texture_filter = CanvasItem.TEXTURE_FILTER_LINEAR_WITH_MIPMAPS
	_k = size / maxf(1.0, _sp.texture.get_width())
	_sp.scale = Vector2.ONE * _k
	# taban merkezinden döner/ezilir: zemine oturmuş hissi
	_sp.offset = Vector2(0, -_sp.texture.get_height() * 0.36)
	_base = Vector2(0, size * 0.36)
	_sp.position = _base
	add_child(_sp)
	if live:
		var st: Texture2D = load("res://assets/chest/fx_star.png")
		var am := CanvasItemMaterial.new()
		am.blend_mode = CanvasItemMaterial.BLEND_MODE_ADD
		for i in 2:
			var s := Sprite2D.new()
			s.texture = st
			s.material = am
			s.modulate.a = 0.0
			add_child(s)
			_stars.append({"n": s, "t": randf() * 2.0, "d": 1.6 + i * 0.9, "p": Vector2.ZERO})
	set_process(live)

func _draw() -> void:
	if not _shadow: return
	draw_set_transform(Vector2(0, size * 0.36), 0.0, Vector2(1.0, 0.22))
	draw_circle(Vector2.ZERO, size * 0.40, Color(0, 0, 0, 0.36))
	draw_circle(Vector2.ZERO, size * 0.30, Color(0, 0, 0, 0.22))
	draw_set_transform(Vector2.ZERO, 0.0, Vector2.ONE)

func _process(dt: float) -> void:
	if not is_visible_in_tree(): return
	dt = minf(dt, 0.05)
	_t += dt
	# nefes: tabandan hafif ezilip uzama
	var br := sin(_t * 2.1 + _ph)
	var sx := 1.0 + br * 0.012
	var sy := 1.0 - br * 0.018
	var rot := 0.0
	var lift := 0.0
	# ara sıra: iki yana sallanıp küçük bir zıplama
	if _wig < 0.0:
		_next -= dt
		if _next <= 0.0:
			_wig = 0.0
			_next = 3.4 + randf() * 3.2
	else:
		_wig += dt
		var u := _wig / 0.62
		if u >= 1.0: _wig = -1.0
		else:
			var env := sin(u * PI)
			rot = sin(u * TAU * 2.5) * 0.085 * env
			lift = env * size * 0.045
			sy += env * 0.035
			sx -= env * 0.02
	_sp.rotation = rot
	_sp.scale = Vector2(_k * sx, _k * sy)
	_sp.position = _base - Vector2(0, lift)
	for s in _stars:
		s.t += dt
		var n: Sprite2D = s.n
		if s.t >= s.d:
			s.t = 0.0
			s.d = 1.8 + randf() * 2.4
			s.p = Vector2(randf_range(-0.30, 0.30), randf_range(-0.30, 0.16)) * size
		var u2: float = s.t / 0.7
		if u2 < 1.0:
			var e := sin(u2 * PI)
			n.position = s.p
			n.modulate.a = e * 0.9
			n.scale = Vector2.ONE * (size * 0.34 / maxf(1.0, n.texture.get_width())) * (0.4 + e * 0.6)
			n.rotation = u2 * 0.9
		else:
			n.modulate.a = 0.0
