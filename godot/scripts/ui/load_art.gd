class_name LoadArt
extends Node2D
## Sade yükleme ekranı: kahraman konsept tablosu tam ekran (assets/ui/art/loading, bkz.
## tools/bake/ui/loading_art.py) yavaşça yakınlaşır; altta yalnız "YÜKLENİYOR" ve ince ışıltılı
## çubuk. Açılış (ScrBoot) ve savaşa giriş (ScrGate) aynı düzeni kullanır.

const IDS := ["okcu", "seher", "simsek", "savasci", "gokalev", "korsan", "kralice", "sovalye", "sapanci"]

var size_l := Vector2(390, 844)
var bottom_pad := 0.0          # güvenli alan (gezinme çubuğu)
var top_pad := 0.0             # güvenli alan (çentik)
var progress := 0.0
var _art: Sprite2D
var _base := 1.0
var _t := 0.0
var _label: UIText
var _bar: Node2D
var _col := Color("#ffb070")

## hero: kahraman kimliği ("" → rastgele)
func setup(sz: Vector2, hero := "", accent := Color("#ffb070")) -> void:
	size_l = sz
	_col = accent
	var bg := ColorRect.new()
	bg.color = Color("#07050b")
	bg.size = sz + Vector2(0, 400)
	bg.position = Vector2(0, -200)
	bg.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(bg)
	var id: String = hero if hero in IDS else str(IDS[randi() % IDS.size()])
	var tx: Texture2D = load("res://assets/ui/art/loading/" + id + ".jpg")
	if tx:
		_art = Sprite2D.new()
		_art.texture = tx
		_art.centered = true
		# kapla: ekranın tamamı; yükseklik fazlası alttan (yazı bölgesi) kırpılır
		_base = maxf(sz.x / tx.get_width(), sz.y / tx.get_height())
		_art.scale = Vector2.ONE * _base
		_art.position = Vector2(sz.x * 0.5, tx.get_height() * _base * 0.5)
		add_child(_art)
	# üstte okunurluk için koyulaşma + SHADOWREND logosu (açılış yakalamasından: assets/ui/lyr/logo_title)
	var gr := Gradient.new()
	gr.offsets = PackedFloat32Array([0.0, 1.0])
	gr.colors = PackedColorArray([Color(0.02, 0.01, 0.03, 0.78), Color(0.02, 0.01, 0.03, 0.0)])
	var gt := GradientTexture2D.new()
	gt.gradient = gr
	gt.fill_from = Vector2(0, 0)
	gt.fill_to = Vector2(0, 1)
	gt.width = 4
	gt.height = 128
	var sh := TextureRect.new()
	sh.texture = gt
	sh.stretch_mode = TextureRect.STRETCH_SCALE
	sh.position = Vector2(0, -200)
	sh.size = Vector2(sz.x, 200.0 + top_pad + 190.0)
	sh.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(sh)
	if FileAccess.file_exists(Lyr.BASE + "logo_title.json"):
		var lg := Lyr.make("logo_title")
		var k := sz.x / 390.0
		lg.scale = Vector2.ONE * k
		lg.position = Vector2(0, top_pad + 34.0 - 54.86 * k)     # yakalamadaki dikey konumu sıfırla
		add_child(lg)
	_label = UIText.new()
	_label.style(true, 700, 15, 4.0, Color("#f3e6d6"), "0 2px 6px rgba(0,0,0,0.9)")
	_label.align = 0.5
	_label.nowrap = true
	_label.wrap_w = sz.x
	_label.text = I18n.t("YÜKLENİYOR")
	add_child(_label)
	_bar = Node2D.new()
	_bar.draw.connect(_draw_bar)
	add_child(_bar)
	_place()

func _place() -> void:
	var by := size_l.y - 54.0 - bottom_pad
	_label.position = Vector2(0, by - 30.0)
	_bar.position = Vector2(size_l.x * 0.5, by)

func set_progress(p: float) -> void:
	progress = clampf(p, 0.0, 1.0)
	_bar.queue_redraw()

func _process(dt: float) -> void:
	_t += dt
	if _art: _art.scale = Vector2.ONE * _base * (1.0 + minf(_t, 12.0) * 0.006)
	# yazı hafifçe nefes alır
	if _label: _label.modulate.a = 0.78 + 0.22 * sin(_t * 3.0)
	_bar.queue_redraw()

func _draw_bar() -> void:
	var w := 200.0
	var h := 4.0
	var x0 := -w * 0.5
	var tr := StyleBoxFlat.new()
	tr.bg_color = Color(1, 1, 1, 0.14)
	tr.set_corner_radius_all(2)
	_bar.draw_style_box(tr, Rect2(x0, 0, w, h))
	var fw := w * progress
	if fw > 1.0:
		var fl := StyleBoxFlat.new()
		fl.bg_color = _col
		fl.set_corner_radius_all(2)
		_bar.draw_style_box(fl, Rect2(x0, 0, fw, h))
		# uçta ışıltı (yürüyen parıltı)
		_bar.draw_set_transform(Vector2(x0 + fw, h * 0.5), 0.0, Vector2(0.3, 0.14))
		_bar.draw_texture(ClimbArt.glow_tex(), Vector2(-64, -64), Color(_col.lerp(Color.WHITE, 0.5), 0.95))
		_bar.draw_set_transform(Vector2.ZERO)
		var sx := x0 + fmod(_t * 160.0, maxf(1.0, fw))
		_bar.draw_rect(Rect2(sx, 0, minf(10.0, x0 + fw - sx), h), Color(1, 1, 1, 0.35))
