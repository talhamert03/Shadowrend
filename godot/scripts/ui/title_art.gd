class_name TitleArt
extends Node2D
## İLK AÇILIŞ EKRANI (firma introsundan sonra): tam ekran boyalı manzara (assets/ui/art/title_bg.jpg —
## Kızıl Ay altında, sisli vadiye bakan pelerinli kahraman). Üstüne hafif, sinematik canlılık:
## çok yavaş yakınlaşma, ayın nabız gibi atan halesi, yatay kayan sis katmanları, yükselen korlar;
## gökte çizgi roman SHADOWREND logosu, dipte koyu perde üstünde çizgi roman yükleme çubuğu.
## Tüm hareket dönüşüm/modülasyonla (yeniden çizim yalnız korlar) ve zaman adımı sınırlı: kurulum
## adımı ana iş parçacığını bir an kilitlerse animasyon sıçramaz, kaldığı yerden akar.

const INK := Color(0.05, 0.03, 0.07)
const YEL := Color("#ffd23a")
const RED := Color("#e8322c")
const BG := "res://assets/ui/art/title_bg.jpg"
const LOGO := "res://assets/ui/art/title_logo.png"
## görselde ayın merkezi (oran) — hale bunun üstüne oturur
const MOON_UV := Vector2(0.495, 0.155)

var size_l := Vector2(390, 844)
var bottom_pad := 0.0
var top_pad := 0.0
var progress := 0.0
var _t := 0.0
var _art: Node2D
var _bgs: Sprite2D
var _scale0 := 1.0
var _moon: Node2D
var _fog: Array = []          # [Sprite2D, hız, genişlik, y]
var _embers: Node2D
var _ember: Array = []
var _logo: Node2D
var _logoSpr: Sprite2D
var _bar: Node2D
var _pct: UIText

func setup(sz: Vector2) -> void:
	size_l = sz
	var w := sz.x
	var h := sz.y
	# ── manzara: ekranı kaplar (cover), alt kenara yaslı; yavaş yakınlaşma merkezi ay ──
	_art = Node2D.new()
	add_child(_art)
	var tx: Texture2D = load(BG)
	if tx:
		var ts := Vector2(tx.get_size())
		_scale0 = maxf(w / ts.x, h / ts.y) * 1.02
		_bgs = Sprite2D.new()
		_bgs.texture = tx
		_bgs.centered = false
		_bgs.scale = Vector2.ONE * _scale0
		# yatay ortalı; dikeyde fazlalık üstten kırpılır (kahraman ve kayalık görünür kalsın)
		_bgs.position = Vector2((w - ts.x * _scale0) * 0.5, h - ts.y * _scale0)
		_art.add_child(_bgs)
		var mp := _bgs.position + ts * MOON_UV * _scale0
		_art.position = mp
		_bgs.position -= mp
		# ── ay halesi (toplamsal, nabız) ──
		_moon = Node2D.new()
		var add := CanvasItemMaterial.new()
		add.blend_mode = CanvasItemMaterial.BLEND_MODE_ADD
		_moon.material = add
		var mr := ts.x * _scale0 * 0.12
		_moon.draw.connect(func():
			var B := TriBatch.new()
			B.radial(Vector2.ZERO, mr * 3.2, Color(1.0, 0.25, 0.2, 0.18), Color(1.0, 0.2, 0.2, 0.0), 1.0, 48)
			B.radial(Vector2.ZERO, mr * 1.5, Color(1.0, 0.45, 0.4, 0.08), Color(1.0, 0.3, 0.3, 0.0), 1.0, 40)
			B.flush(_moon))
		_art.add_child(_moon)
	# ── sis katmanları (yumuşak yatay bantlar, yavaşça kayar) ──
	var fg := Gradient.new()
	fg.offsets = PackedFloat32Array([0.0, 0.5, 1.0])
	fg.colors = PackedColorArray([Color(1, 1, 1, 0), Color(1, 1, 1, 1), Color(1, 1, 1, 0)])
	var ft := GradientTexture2D.new()
	ft.gradient = fg
	ft.fill_from = Vector2(0.5, 0.0)
	ft.fill_to = Vector2(0.5, 1.0)
	ft.width = 8
	ft.height = 64
	for spec in [[0.62, 0.20, 10.0, Color(0.72, 0.62, 0.95, 0.20)], [0.74, 0.16, -7.0, Color(0.6, 0.5, 0.85, 0.24)], [0.86, 0.14, 13.0, Color(0.35, 0.25, 0.5, 0.35)]]:
		var s := Sprite2D.new()
		s.texture = ft
		s.centered = true
		var bw := w * 2.4
		s.scale = Vector2(bw / 8.0, h * float(spec[1]) / 64.0)
		s.modulate = spec[3]
		s.position = Vector2(w * 0.5, h * float(spec[0]))
		add_child(s)
		_fog.append([s, float(spec[2]), bw, h * float(spec[0])])
	# ── korlar ──
	var rng := RandomNumberGenerator.new()
	rng.seed = 23
	for i in 22:
		_ember.append([rng.randf() * w, rng.randf() * h, rng.randf_range(10.0, 26.0), rng.randf() * TAU, rng.randf_range(1.2, 2.8)])
	_embers = Node2D.new()
	var add2 := CanvasItemMaterial.new()
	add2.blend_mode = CanvasItemMaterial.BLEND_MODE_ADD
	_embers.material = add2
	_embers.draw.connect(_draw_embers)
	add_child(_embers)
	# ── dip perdesi (yükleme çubuğu okunur) + üst hafif kararma ──
	var shade := Node2D.new()
	shade.draw.connect(func():
		var c0 := Color(0.02, 0.01, 0.04, 0.0)
		var c1 := Color(0.02, 0.01, 0.04, 0.92)
		shade.draw_polygon(PackedVector2Array([Vector2(-10, h * 0.78), Vector2(w + 10, h * 0.78), Vector2(w + 10, h + 10), Vector2(-10, h + 10)]), PackedColorArray([c0, c0, c1, c1]))
		var t0 := Color(0.03, 0.01, 0.06, 0.55)
		shade.draw_polygon(PackedVector2Array([Vector2(-10, -10), Vector2(w + 10, -10), Vector2(w + 10, top_pad + 70), Vector2(-10, top_pad + 70)]), PackedColorArray([t0, t0, c0, c0])))
	add_child(shade)
	# ── logo: çizgi roman (Bangers) — sarı/turuncu dolgu, kalın mürekkep kontur, kızıl fırça şeridi
	# (önceden pişmiş doku). Gökte, ayın altında; açılışta "çarparak" oturur ──
	var ly := top_pad + h * 0.30
	_logo = Node2D.new()
	_logo.position = Vector2(w * 0.5, ly)
	add_child(_logo)
	var glow := Node2D.new()
	var add3 := CanvasItemMaterial.new()
	add3.blend_mode = CanvasItemMaterial.BLEND_MODE_ADD
	glow.material = add3
	glow.draw.connect(func():
		var B := TriBatch.new()
		B.radial(Vector2.ZERO, w * 0.6, Color(1.0, 0.35, 0.15, 0.20), Color(1.0, 0.25, 0.15, 0.0), 0.3, 40)
		B.flush(glow))
	_logo.add_child(glow)
	var lg := Sprite2D.new()
	lg.texture = load(LOGO)
	var lw := minf(w * 0.94, 520.0)
	lg.scale = Vector2.ONE * (lw / float(lg.texture.get_width()))
	_logo.add_child(lg)
	_logoSpr = lg
	_logo.modulate.a = 0.0
	# ── yükleme çubuğu (çizgi roman: mürekkep kontur, sarı dolgu, kayan eğik şeritler) ──
	var by := h - bottom_pad - 64.0
	_bar = Node2D.new()
	_bar.position = Vector2(w * 0.12, by)
	_bar.draw.connect(_draw_bar)
	add_child(_bar)
	var lb := UIText.new()
	lb.style(false, 1000, 20, 1.6, Color("#fff3d6"), UIK.ink_stroke(2.0, 2.6))
	lb.nowrap = true
	lb.size = Vector2(w * 0.5, 28)
	lb.position = Vector2(w * 0.12 + 2, by - 32)
	lb.text = "YÜKLENİYOR"
	add_child(lb)
	_pct = UIText.new()
	_pct.style(false, 1000, 22, 0.8, YEL, UIK.ink_stroke(2.0, 2.6))
	_pct.align = 1.0
	_pct.nowrap = true
	_pct.wrap_w = w * 0.76
	_pct.size = Vector2(w * 0.76, 30)
	_pct.position = Vector2(w * 0.12, by - 34)
	_pct.text = "%0"
	add_child(_pct)
	var co := UIText.new()
	co.style(false, 1000, 13, 2.4, Color(1, 1, 1, 0.42), "")
	co.align = 0.5
	co.nowrap = true
	co.wrap_w = w
	co.size = Vector2(w, 18)
	co.position = Vector2(0, by + 34)
	co.text = "ALPHA WOLF GAMES · v" + str(ProjectSettings.get_setting("application/config/version", ""))
	add_child(co)

func _draw_embers() -> void:
	var B := TriBatch.new()
	var h := size_l.y
	for e in _ember:
		var y: float = fposmod(float(e[1]) - _t * float(e[2]), h * 1.05)
		var x: float = float(e[0]) + sin(_t * 0.7 + float(e[3])) * 12.0
		var f := 0.55 + 0.45 * sin(_t * 3.0 + float(e[3]) * 2.0)
		var a := clampf(y / (h * 0.35), 0.0, 1.0) * f
		B.circle(Vector2(x, y), float(e[4]) * 2.2, Color(1.0, 0.35, 0.12, 0.18 * a), 8)
		B.circle(Vector2(x, y), float(e[4]), Color(1.0, 0.65, 0.3, 0.85 * a), 6)
	B.flush(_embers)

func set_progress(p: float) -> void:
	progress = clampf(p, 0.0, 1.0)
	if _pct: _pct.text = "%" + str(int(round(progress * 100.0)))
	if _bar: _bar.queue_redraw()

func _draw_bar() -> void:
	var bw := size_l.x * 0.76
	var bh := 20.0
	var r := Rect2(0, 0, bw, bh)
	_bar.draw_style_box(ComicSkin.sb(INK, 10), Rect2(r.position + Vector2(2, 4), r.size))
	_bar.draw_style_box(ComicSkin.sb(Color(0.08, 0.03, 0.06, 0.92), 10, 3.5, INK), r)
	var fw := (bw - 8) * progress
	if fw > 4.0:
		var fr := Rect2(4, 4, fw, bh - 8)
		_bar.draw_style_box(ComicSkin.sb(Color("#ff8a1a"), 6), fr)
		_bar.draw_style_box(ComicSkin.sb(YEL, 6), Rect2(fr.position, Vector2(fr.size.x, fr.size.y * 0.55)))
		# kayan eğik şeritler (yavaş: takılmada sıçrama göze batmaz)
		var off := fmod(_t * 14.0, 14.0)
		var x := fr.position.x - 14.0 + off
		while x < fr.end.x:
			var x0 := maxf(x, fr.position.x)
			var x1 := minf(x + 6.0, fr.end.x)
			if x1 > x0 + 0.5:
				_bar.draw_line(Vector2(x0, fr.end.y), Vector2(minf(x1 + 4.0, fr.end.x), fr.position.y), Color(1, 0.45, 0.05, 0.45), 3.0)
			x += 14.0
		_bar.draw_line(fr.position + Vector2(5, 2), Vector2(fr.end.x - 3, fr.position.y + 2), Color(1, 1, 1, 0.6), 1.6)
		var B := TriBatch.new()
		B.radial(Vector2(fr.end.x, bh * 0.5), 18.0, Color(1, 0.85, 0.45, 0.65), Color(1, 0.6, 0.3, 0.0), 0.6, 16)
		B.flush(_bar)

func _process(dt: float) -> void:
	# zaman adımı sınırlı (kurulum adımı kareyi uzatırsa hareket ileri fırlamaz)
	_t += minf(dt, 0.1)
	if _bgs:
		# çok yavaş yakınlaşma (ay merkezli) + hafif yükselme
		var k := 1.0 + 0.045 * (1.0 - exp(-_t * 0.12))
		_art.scale = Vector2.ONE * k
	if _moon:
		var pulse := 0.85 + 0.15 * sin(_t * 1.4)
		_moon.modulate.a = pulse
		_moon.scale = Vector2.ONE * (0.97 + 0.05 * sin(_t * 0.9))
	for f in _fog:
		var s: Sprite2D = f[0]
		var span := float(f[2]) - size_l.x
		s.position.x = size_l.x * 0.5 + sin(_t * float(f[1]) * 0.012) * span * 0.35
		s.position.y = float(f[3]) + sin(_t * 0.4 + float(f[1])) * 6.0
	# logo: 0,2 sn'de büyükten "çarparak" oturur, sonra hafifçe nefes alır
	var kl := clampf((_t - 0.2) / 0.38, 0.0, 1.0)
	_logo.modulate.a = clampf(kl * 3.0, 0.0, 1.0)
	_logo.scale = Vector2.ONE * ((1.7 - 0.7 * ScrLevelUp._back_ease(kl)) if kl < 1.0 else (1.0 + sin(_t * 1.3) * 0.008))
	_logo.rotation = (1.0 - kl) * -0.08
	if _bar: _bar.queue_redraw()
	_embers.queue_redraw()
