class_name ScrBoot
extends CanvasLayer
## AÇILIŞ EKRANI: firma introsundan sonra başlık sahnesi (TitleArt — Kızıl Ay, logo, ada siluetleri,
## ince yükleme çubuğu); savaş yükleme ekranından (LoadArt) ayrıdır. Oyun kurulumu adım adım ilerler (game._ready → set_progress); çubuk iki kapının
## GERİDE olanını gösterir: en az MIN sn + gerçek ilerleme — %100'de oyun gerçekten hazırdır.

const MIN := 2.6
var _view: TitleArt
var _bg: ColorRect
var _target := 0.0
var _shown := 0.0
var _t := 0.0
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
	_view = TitleArt.new()
	_view.bottom_pad = sa[2]
	_view.top_pad = sa[0]
	add_child(_view)
	_view.setup(vs)

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
		_view.modulate.a = a
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
	if _view: _view.set_progress(_shown)
