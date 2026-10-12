class_name ScrEvo
extends Scr
## ui.js evoCinema — v71 EVRİM SİNEMASI: eski ad çatlayıp kırılır, yeni ad dövme altın
## plakayla iner (≤ 1,6 sn); 0,65 sn sonra dokunuş atlatır; çıkışta söner (260 ms).

var L: Lyr
var cb: Callable
var _t := 0.0
var _out := -1.0

func _init(game) -> void:
	super(game)
	name = "Evo"

func play(E: Dictionary, on_done: Callable) -> void:
	if L: L.queue_free()
	L = Lyr.make("evc")
	add_child(L)
	L.stretch_h(Scr.dh_of(self))
	for k in L.find_all(".evc-l") + L.find_all(".evc-r"): L.set_text(k, str(E.get("from", "")))
	L.set_text(L.find(".evc-new"), str(E.get("to", "")))
	var gf := ScrLevelUp.glyph_file({"kind": "special", "icon": E.get("icon", ""), "id": "evo"})
	var sv := L.find("svg")
	if sv: ScrLevelUp.glyph_into(L, sv, gf)
	cb = on_done
	_t = 0.0
	_out = -1.0
	visible = true
	g.audio.play("evocine")
	if g.music and g.music.has_method("duck"): g.music.duck(1400)
	get_tree().create_timer(0.52).timeout.connect(func(): Input.vibrate_handheld(40))

func _fin() -> void:
	if _out >= 0: return
	_out = _t
	L.to_state("evc_out")
	if cb.is_valid(): cb.call()

func _process(dt: float) -> void:
	if not visible: return
	_t += dt
	var rm: bool = Settings.data.get("rm", false)
	if _out < 0 and _t >= (0.9 if rm else 1.6): _fin()
	if _out >= 0 and _t - _out >= 0.26:
		visible = false
		L.queue_free(); L = null

func _input(ev: InputEvent) -> void:
	if visible and ev is InputEventScreenTouch and (ev as InputEventScreenTouch).pressed and _t > 0.65:
		_fin()
	super(ev)
