class_name ScrGate
extends Scr
## SAVAŞA GİRİŞ — sade yükleme ekranı: seçili kahramanın konsept tablosu tam ekran, altta
## "YÜKLENİYOR" ve ince çubuk (LoadArt). Akış (ui.js playBattleIntro ile aynı): kararma (COVER sn)
## → on_cover (arena perde arkasında kurulur) → çubuk BAR sn'de dolar → açılış: ekran hafif
## büyüyerek söner, savaş belirir → on_done. HUD bu ekranın altında kalır (z_index).

const COVER := 0.72
const BAR := 2.0
const OPEN := 0.7

var on_cover: Callable
var on_done: Callable
var wc := Color("#b06a49")
var _t := 0.0
var _covered := false
var _finished := false
var _doneAt := -1.0
var _p := 0.0

var _root: Node2D            # tüm içerik (açılışta büyür)
var _view: LoadArt
var _W := Vector2(390, 844)

func _init(game) -> void:
	super(game)
	name = "Gate"
	z_index = 60                 # HUD (katman kökünde) ve dalga bandı bu ekranın altında

func play(info: Dictionary, cover: Callable, done: Callable) -> void:
	for c in get_children():
		if not (c is Scr._Ticker): c.queue_free()
	on_cover = cover
	on_done = done
	wc = JS.col(info.get("wc", "#b06a49"))
	_W = UIK.ui_size(get_viewport())
	_build(info)
	_t = 0.0
	_covered = false
	_finished = false
	_doneAt = -1.0
	_p = 0.0
	modulate.a = 0.0
	visible = true
	g.audio.play("gateclose")

func _build(info: Dictionary) -> void:
	_root = Node2D.new()
	add_child(_root)
	var hero := str(info.get("hero", ""))
	if hero == "" and g and g.meta: hero = str(g.meta.get("selectedChar", ""))
	_view = LoadArt.new()
	_root.add_child(_view)
	_view.setup(_W, hero, wc.lerp(Color("#ffb070"), 0.55))

func _progress(pc: float) -> void:
	_p = pc / 100.0
	if _view: _view.set_progress(_p)

func _process(dt: float) -> void:
	if not visible or _root == null: return
	_t += dt
	if _doneAt >= 0:
		# açılış: içerik büyüyerek söner, savaş belirir
		var ko := clampf((_t - _doneAt) / OPEN, 0.0, 1.0)
		var e := UIK.bez(0.4, 0.0, 0.2, 1.0, ko)
		modulate.a = 1.0 - e
		_root.scale = Vector2.ONE * (1.0 + 0.07 * e)
		_root.position = -_W * 0.5 * 0.07 * e
		if ko >= 1.0:
			visible = false
			for c in get_children():
				if not (c is Scr._Ticker): c.queue_free()
			_root = null
			if on_done.is_valid(): on_done.call()
		return
	modulate.a = clampf(_t / 0.3, 0.0, 1.0)
	if not _covered and _t >= COVER:
		_covered = true
		Input.vibrate_handheld(15)
		if on_cover.is_valid(): on_cover.call()
	var k := clampf((_t - COVER + 0.12) / BAR, 0.0, 1.0)
	var eb := k * 1.18 if k < 0.7 else 0.826 + (k - 0.7) * 0.58
	_progress(minf(1.0, eb) * 100.0)
	if k >= 1.0 and not _finished:
		_finished = true
		_progress(100.0)
		g.audio.play("start")
		_doneAt = _t
