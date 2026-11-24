class_name ScrIntroV2
extends ScrIntro
## ALPHA WOLF GAMES introsu — "premium" sürüm. Kurt/logo animasyonu ve zamanlaması ScrIntro ile
## aynı; üstüne: ay ışığı atmosferi + yükselen toz, birleşmede kurda süzülen kıvılcımlar, yavaş
## kamera yaklaşması, logo vuruşunda ışık patlaması + yatay sinematik ışık çizgisi, "tınn" anında
## yıldız parıltısı. Ses: intro_v2.ogg (yumuşak, uzaktan uluma; logo vuruşu + tınn orijinal).

const SND_V2 := "res://assets/intro/intro_v2.ogg"
const DUST := 70
const SPARKS := 36

var _dust: Array = []      # [x0 (0..1), y0 (0..1), hız, boyut, faz, parlaklık]
var _sparks: Array = []    # [başlangıç (yerel), gecikme, boyut]
var _soft: GradientTexture2D
var _streak: GradientTexture2D

func _ready() -> void:
	super()
	if _snd:
		var st: AudioStream = load(SND_V2)
		if st: _snd.stream = st
	var rng := RandomNumberGenerator.new()
	rng.seed = 2026
	for i in DUST:
		_dust.append([rng.randf(), rng.randf(), 0.012 + rng.randf() * 0.03, 0.6 + rng.randf() * 1.8, rng.randf() * TAU, 0.25 + rng.randf() * 0.75])
	for i in SPARKS:
		var a := rng.randf() * TAU
		var r := 380.0 + rng.randf() * 420.0
		_sparks.append([CEN + Vector2(cos(a), sin(a)) * r, 0.25 + rng.randf() * 0.55, 1.2 + rng.randf() * 2.2])
	# yumuşak yuvarlak ışık
	var g1 := Gradient.new()
	g1.offsets = PackedFloat32Array([0.0, 0.35, 1.0])
	g1.colors = PackedColorArray([Color(1, 1, 1, 1), Color(1, 1, 1, 0.35), Color(1, 1, 1, 0)])
	_soft = GradientTexture2D.new()
	_soft.gradient = g1
	_soft.fill = GradientTexture2D.FILL_RADIAL
	_soft.fill_from = Vector2(0.5, 0.5)
	_soft.fill_to = Vector2(1.0, 0.5)
	_soft.width = 128
	_soft.height = 128
	# yatay ışık çizgisi (anamorfik parlama): ortası parlak, uçlara söner
	var g2 := Gradient.new()
	g2.offsets = PackedFloat32Array([0.0, 0.5, 1.0])
	g2.colors = PackedColorArray([Color(1, 1, 1, 0), Color(1, 1, 1, 1), Color(1, 1, 1, 0)])
	_streak = GradientTexture2D.new()
	_streak.gradient = g2
	_streak.width = 256
	_streak.height = 1

func _process(dt: float) -> void:
	super(dt)
	if not is_instance_valid(_cv): return
	# yavaş kamera yaklaşması (ekran merkezli, sona doğru yavaşlar)
	var k := 1.0 + 0.05 * _eo(clampf(maxf(0.0, _t) / DUR, 0.0, 1.0))
	_cv.scale = Vector2.ONE * k
	_cv.position = Vector2(W, H) * 0.5 * (1.0 - k)

func _render() -> void:
	var t := maxf(0.0, _t)
	_atmos(t)
	super()
	_front(t)

## arka: ay ışığından yayılan koyu lacivert ışıma + yükselen toz
func _atmos(t: float) -> void:
	var a := _eo(_seg(t, 0.0, 1.2)) * (1.0 - _seg(t, 4.9, 5.5))
	if a <= 0.0: return
	var c := Vector2(W * 0.5, H * 0.38)
	var R := maxf(W, H) * 1.05
	_cv.draw_texture_rect(_soft, Rect2(c - Vector2.ONE * R, Vector2.ONE * R * 2.0), false, Color(0.10, 0.17, 0.28, 0.55 * a))
	_cv.draw_texture_rect(_soft, Rect2(c - Vector2.ONE * R * 0.45, Vector2.ONE * R * 0.9), false, Color(0.16, 0.26, 0.40, 0.30 * a))
	for D0 in _dust:
		var y := fposmod(float(D0[1]) - t * float(D0[2]), 1.0)
		var x := float(D0[0]) + sin(t * 0.6 + float(D0[4])) * 0.012
		var tw := 0.55 + 0.45 * sin(t * 2.2 + float(D0[4]))
		var p := Vector2(x * W, y * H)
		var sz := float(D0[3]) * U * 3.0
		_cv.draw_texture_rect(_soft, Rect2(p - Vector2.ONE * sz * 2.0, Vector2.ONE * sz * 4.0), false, Color(0.75, 0.86, 1.0, 0.22 * a * tw * float(D0[5])))
	# kurdun altını kesen siyaha yumuşak geçiş: zemin o çizgiye varmadan kararır (sert bant olmasın)
	var to_logo := _eio(_seg(t, 2.45, 3.05))
	var s := (0.98 * U * (1.0 - to_logo) + 0.54 * U * to_logo) * (1.0 + 0.04 * _seg(t, 0.0, 2.45))
	var cy := (H / 2.0 + 20.0 * U) * (1.0 - to_logo) + (H / 2.0 - 150.0 * U) * to_logo
	var y0 := cy + (640.0 - CEN.y) * s
	var fh := 260.0 * U
	_cv.draw_texture_rect(_fade, Rect2(-W, y0 - fh, W * 3.0, fh), false)
	_cv.draw_rect(Rect2(-W, y0 - 0.5, W * 3.0, H * 2.0), Color.BLACK)
	_full_moon(t, s, cy, to_logo)

## dolunay: ScrIntro'nun ay halkasıyla aynı yer/boyut; soluk mavimsi beyaz (göz almaz) — merkezde
## hafif ışık, kenarda kararma, birkaç yumuşak leke. Kurt başı önünde silüet olarak okunur.
const _MARIA := [[-0.28, -0.22, 0.30], [0.22, -0.30, 0.22], [0.10, 0.18, 0.34], [-0.30, 0.30, 0.20], [0.38, 0.10, 0.16], [-0.05, -0.45, 0.10], [0.45, -0.12, 0.08], [-0.48, 0.02, 0.09], [0.24, 0.46, 0.08]]
func _full_moon(t: float, s: float, cy: float, to_logo: float) -> void:
	var mg := _eo(_seg(t, 0.9, 1.7)) * (1.0 - 0.45 * to_logo)
	if mg <= 0.0: return
	var mc := Vector2(W / 2.0 + 120.0 * s, cy - 330.0 * s)
	var mr := 330.0 * s
	# dış hale
	_cv.draw_texture_rect(_soft, Rect2(mc - Vector2.ONE * mr * 2.3, Vector2.ONE * mr * 4.6), false, Color(0.55, 0.70, 0.92, 0.16 * mg))
	# disk
	_cv.draw_circle(mc, mr, Color(0.80, 0.85, 0.91, 0.66 * mg), true, -1.0, true)
	# merkez ışığı (sol üste kaçık) + lekeler
	_cv.draw_texture_rect(_soft, Rect2(mc + Vector2(-0.18, -0.2) * mr - Vector2.ONE * mr * 0.95, Vector2.ONE * mr * 1.9), false, Color(1, 1, 1, 0.16 * mg))
	for m in _MARIA:
		var p := mc + Vector2(float(m[0]), float(m[1])) * mr
		var rr := float(m[2]) * mr
		_cv.draw_texture_rect(_soft, Rect2(p - Vector2.ONE * rr, Vector2.ONE * rr * 2.0), false, Color(0.40, 0.47, 0.58, 0.30 * mg))
	# kenar kararması
	_cv.draw_arc(mc, mr * 0.955, 0.0, TAU, 96, Color(0.30, 0.38, 0.50, 0.16 * mg), mr * 0.09, true)

## ön: birleşme kıvılcımları, logo ışık patlaması, yatay ışık çizgisi, tınn yıldızı
func _front(t: float) -> void:
	var to_logo := _eio(_seg(t, 2.45, 3.05))
	var s := (0.98 * U * (1.0 - to_logo) + 0.54 * U * to_logo) * (1.0 + 0.04 * _seg(t, 0.0, 2.45))
	var cy := (H / 2.0 + 20.0 * U) * (1.0 - to_logo) + (H / 2.0 - 150.0 * U) * to_logo
	var M := Transform2D(0.0, Vector2.ONE * s, 0.0, Vector2(W / 2.0 - CEN.x * s, cy - CEN.y * s))
	# kıvılcımlar dışarıdan kurt başına süzülür ve içinde söner
	for S0 in _sparks:
		var k := _seg(t, float(S0[1]), float(S0[1]) + 0.7)
		if k <= 0.0 or k >= 1.0: continue
		var e := _eio(k)
		var p: Vector2 = M * (S0[0] as Vector2).lerp(CEN + Vector2(0, -40), e)
		var al := sin(k * PI)
		var sz := float(S0[2]) * U * 6.0 * (1.0 - 0.5 * e)
		_cv.draw_texture_rect(_soft, Rect2(p - Vector2.ONE * sz, Vector2.ONE * sz * 2.0), false, Color(0.70, 0.88, 1.0, 0.85 * al))
	# logo vuruşu: yazının arkasında yumuşak ışık patlaması
	var ty := cy + 330.0 * U
	var hit := _seg(t, 2.78, 3.6)
	if hit > 0.0 and hit < 1.0:
		var b := sin(minf(1.0, hit * 3.0) * PI * 0.5) * (1.0 - hit)
		var bw := W * 1.1
		var bh := 260.0 * U
		_cv.draw_texture_rect(_soft, Rect2(Vector2(W / 2.0 - bw / 2.0, ty - 30.0 * U - bh / 2.0), Vector2(bw, bh)), false, Color(0.55, 0.78, 1.0, 0.32 * b))
	# yatay sinematik ışık çizgisi (vuruş anında açılır, ince ve uzun)
	var sk := _seg(t, 2.8, 3.9)
	if sk > 0.0 and sk < 1.0:
		var o := (1.0 - sk) * minf(1.0, sk * 8.0)
		var len := W * (0.6 + 0.8 * _eo(sk))
		var yy := ty - 34.0 * U
		_cv.draw_texture_rect(_streak, Rect2(W / 2.0 - len / 2.0, yy - 1.5 * U * 3.0, len, 3.0 * U * 3.0), false, Color(0.70, 0.88, 1.0, 0.55 * o))
		_cv.draw_texture_rect(_streak, Rect2(W / 2.0 - len * 0.3, yy - 0.6, len * 0.6, 1.2), false, Color(1, 1, 1, 0.9 * o))
	# "tınn": parıltı süpürmesinin sonunda yazının sağ üstünde dört köşeli yıldız
	var gk := _seg(t, 3.62, 4.35)
	if gk > 0.0 and gk < 1.0:
		var gp := Vector2(W / 2.0 + 205.0 * U, ty - 78.0 * U)
		var gi := sin(gk * PI)
		var gl := (34.0 + 40.0 * gi) * U * 3.0 * gi
		var rot := gk * 0.6
		_cv.draw_texture_rect(_soft, Rect2(gp - Vector2.ONE * gl * 0.35, Vector2.ONE * gl * 0.7), false, Color(0.75, 0.9, 1.0, 0.7 * gi))
		for a in [0.0, PI * 0.5]:
			var dv := Vector2(cos(a + rot), sin(a + rot))
			var nv := Vector2(-dv.y, dv.x)
			var q := PackedVector2Array([gp + dv * gl * 0.5, gp + nv * gl * 0.035, gp - dv * gl * 0.5, gp - nv * gl * 0.035])
			_cv.draw_colored_polygon(q, Color(1, 1, 1, 0.95 * gi))
