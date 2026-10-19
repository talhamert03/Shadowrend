class_name ScrBoot
extends CanvasLayer
## main.js runSplash — AÇILIŞ EKRANI (v42 GÖK KALESİ): logo, kızıl ay, ada sanatları, bulut/sis/kor
## (yakalama: assets/ui/lyr/splash.json, CSS animasyonları canlı) + ipucu, yükleme çubuğu, yüzde,
## temalı durum satırı. Oyun kurulumu adım adım ilerler (game._ready → set_progress); çubuk iki
## kapının GERİDE olanını gösterir: en az MIN sn + gerçek ilerleme — %100'de oyun gerçekten hazırdır.

const MIN := 2.6
## İPUÇLARI GERÇEK OLMALI (main.js): her satır oyunun gerçek kuralı
const TIPS := [
	"İmza silahı kahramanın nadirliğiyle güçlenir: nadir ×1,12 · destan ×1,25 · efsane ×1,45.",
	"AYAZ her savuruşta zemine ayaz halkası bırakır — bunun için kart gerekmez.",
	"GECE KRALİÇESİ’nin her savuruşu bir kesik fırlatır; yakındaki düşman iki kez vurulur.",
	"Yakın dövüş kahramanları düşman menzile girmeden savurmaz; boşa sallanan kılıç yoktur.",
	"Aynı anda tek sandık çözülür; sırayı akıllı seç.",
	"Kritik vuruş kamerayı hafif sarsar; sıradan vuruş sarsmaz — sarsıntı bir bilgidir.",
	"Düşmanın boyu tehdidini söyler: Mezar Muhafızı hortlaktan bir baş uzundur.",
	"Pasif rünler her kahramanda işler: can, hız, saldırı hızı.",
	"Saha dört tarafı kapalı bir karedir; köşeye sıkışmak kalabalıkta en hızlı ölüm sebebidir.",
]
const LINES := ["KORLAR YAKILIYOR…", "KILIÇLAR BİLENİYOR…", "ADALAR UYANIYOR…", "RÜZGÂR DÖNÜYOR…", "KIZIL AY YÜKSELİYOR…"]

var L: Lyr
var _bg: ColorRect
var _fill: ColorRect
var _fill_m: ShaderMaterial
var _glow: Sprite2D
var _full := Vector2(339, 29)
var _target := 0.0
var _shown := 0.0
var _t := 0.0
var _line := -1
var _pc := -1
var _done := Callable()
var _out := -1.0

func _init() -> void:
	layer = 100
	process_mode = Node.PROCESS_MODE_ALWAYS

func _ready() -> void:
	Settings.load_data()
	I18n.boot()        # dil, ilk metin yazılmadan (yoksa açılışın ortasında dil değişir)
	var vp := get_viewport()
	var vs := vp.get_visible_rect().size
	var sa := UIK.safe(vp)
	_bg = ColorRect.new()
	_bg.color = Color("#07050b")
	_bg.size = vs
	_bg.mouse_filter = Control.MOUSE_FILTER_STOP     # açılışta dokunuş alttaki menüye geçmez
	add_child(_bg)
	L = Lyr.make("splash")
	L.position.x = (vs.x - 390.0) * 0.5
	add_child(L)
	L.stretch_h(vs.y - 844.0)
	# tam ekran zemin; logo çentiğin altına, yükleme bloğu gezinme çubuğunun üstüne
	var logo := L.find(".sp-logo")
	if logo: L.move(logo, logo.pos + Vector2(0, sa[0]))
	var ld := L.find(".splash-load")
	if ld: L.move(ld, ld.pos - Vector2(0, sa[2]))
	var tip := L.find_id("#splash-tip")
	if tip and tip.txt:
		# ipucu tek satıra sığmaz: iki satıra sarılır, blok (etiket + ipucu) yukarı kayar
		var x0 := tip.txt.position.x
		var w0 := tip.txt.wrap_w
		L.set_text(tip, TIPS[randi() % TIPS.size()])
		var tw := tip.txt.text_width()
		if tw > w0 + 1.0:
			var nl := mini(3, int(ceil(tw / (w0 * 0.92))))
			tip.txt.nowrap = false
			tip.txt.max_lines = nl
			tip.txt.position.x = x0
			tip.txt.wrap_w = w0
			var up := tip.txt.line_h * (nl - 1)
			L.move(tip, tip.pos - Vector2(0, up))
			var tag := L.find(".sp-tiptag")
			if tag: L.move(tag, tag.pos - Vector2(0, up))
	# dolum (yakalamada genişliği 0): kor gradyanı, sağ ucu yuvarlak; uçta parıltı
	var fn := L.find_id("#splash-fill")
	var tr := L.find_id("#splash-bar")
	if fn and tr:
		_full = Vector2(tr.size.x - 4.0, tr.size.y - 4.0)
		var gr := Gradient.new()
		gr.offsets = PackedFloat32Array([0.0, 0.34, 0.72, 1.0])
		gr.colors = PackedColorArray([Color("#ff8a5c"), Color("#ff4d3d"), Color("#d81f2c"), Color("#8d0f1a")])
		var gt := GradientTexture2D.new()
		gt.gradient = gr
		gt.fill_from = Vector2(0, 0)
		gt.fill_to = Vector2(0, 1)
		gt.width = 256
		gt.height = 22
		_fill = UIK.round_image(gt, 1, _full.y, _full.y * 0.5, Vector2(0.5, 0.5))
		_fill_m = _fill.material as ShaderMaterial
		_fill.visible = false
		fn.node.add_child(_fill)
		_glow = Sprite2D.new()
		_glow.texture = ClimbArt.glow_tex()
		_glow.modulate = Color(1.0, 0.3, 0.24, 0.55)
		_glow.scale = Vector2(0.9, 0.42)
		var gm := CanvasItemMaterial.new()
		gm.blend_mode = CanvasItemMaterial.BLEND_MODE_ADD
		_glow.material = gm
		_glow.visible = false
		fn.node.add_child(_glow)
	_render()

## gerçek kurulum ilerlemesi (0..1); geri gitmez
func set_progress(p: float) -> void:
	_target = maxf(_target, clampf(p, 0.0, 1.0))

## çubuk dolup en az süre geçince kapanır; cb kapanış başında çağrılır
func finish(cb := Callable()) -> void:
	_target = 1.0
	_done = cb

func _process(dt: float) -> void:
	_t += dt
	if _out >= 0.0:
		_out += dt
		var a := clampf(1.0 - _out / 0.6, 0.0, 1.0)
		L.modulate.a = a
		_bg.modulate.a = a
		if _out >= 0.6: queue_free()
		return
	var tgt := minf(minf(1.0, _t / MIN), _target if _done.is_valid() else _target * 0.97)
	_shown += (tgt - _shown) * minf(1.0, dt * 9.6)
	if absf(tgt - _shown) < 0.004: _shown = tgt
	_render()
	if _shown >= 1.0 and _done.is_valid():
		_out = 0.0
		_bg.mouse_filter = Control.MOUSE_FILTER_IGNORE
		var cb := _done
		_done = Callable()
		cb.call()

func _render() -> void:
	var pc := int(_shown * 100.0)
	if pc != _pc:
		_pc = pc
		var pe := L.find_id("#splash-pct")
		if pe: L.set_text(pe, str(pc) + "%")
		if _fill:
			var w := maxf(_full.y, _full.x * _shown)
			_fill.visible = _shown > 0.005
			_fill.size = Vector2(w, _full.y)
			_fill_m.set_shader_parameter("box", Vector2(w, _full.y))
			_glow.visible = _fill.visible
			_glow.position = Vector2(w - 8.0, _full.y * 0.5)
	var k := mini(LINES.size() - 1, int(_shown * LINES.size()))
	if k != _line:
		_line = k
		var st := L.find_id("#splash-step")
		if st: L.set_text(st, LINES[k])
