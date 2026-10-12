class_name Scr
extends Node2D
## Arayüz ekranı tabanı: katman sahnesi + dokunmatik düğmeler.
## Düğme = bir Lyr düğümü (dikdörtgeni) + geri çağrı; basılıyken :active ölçeği,
## parmak düğmeden çıkınca iptal (web 'click' davranışı). Modal ekran kendi
## dışındaki dokunuşları da yutar (oyun alanına geçmez).

var g
var modal := true
var _btns: Array = []        # [{lyr, n, cb, scale, grow}]
var _press := -1
var _pb = null

func _init(game = null) -> void:
	g = game
	visible = false
	process_mode = Node.PROCESS_MODE_ALWAYS

func btn(L: Lyr, n: Lyr.N, cb: Callable, press_scale := 0.97, grow := 4.0) -> void:
	if n == null: return
	_btns.append({"lyr": L, "n": n, "cb": cb, "scale": press_scale, "grow": grow})

func clear_btns() -> void:
	_btns.clear()
	_press = -1
	_pb = null

func _rect(B: Dictionary) -> Rect2:
	var L: Lyr = B.lyr
	var r := L.rect_of(B.n)
	return Rect2(L.global_position + r.position, r.size).grow(B.grow)

func _set_pressed(B, on: bool) -> void:
	if B == null: return
	var n: Lyr.N = B.n
	n.extra = Transform2D(0, Vector2.ONE * B.scale, 0, Vector2.ZERO) if on else Transform2D.IDENTITY
	(B.lyr as Lyr).set_dyn(n)

func _input(ev: InputEvent) -> void:
	if not visible or not is_visible_in_tree(): return
	if ev is InputEventScreenTouch:
		var st := ev as InputEventScreenTouch
		if st.pressed:
			for i in range(_btns.size() - 1, -1, -1):
				var B: Dictionary = _btns[i]
				if not (B.n as Lyr.N).hidden and (B.lyr as Lyr).is_visible_in_tree() and _rect(B).has_point(st.position):
					_press = st.index
					_pb = B
					_set_pressed(B, true)
					get_viewport().set_input_as_handled()
					return
			if modal: get_viewport().set_input_as_handled()
		elif st.index == _press:
			_press = -1
			var B = _pb
			_pb = null
			_set_pressed(B, false)
			get_viewport().set_input_as_handled()
			if B and _rect(B).grow(8).has_point(st.position): (B.cb as Callable).call()
	elif ev is InputEventScreenDrag and modal:
		get_viewport().set_input_as_handled()

## ekran yüksekliği farkı (yakalama 844 px'te) — esneme çıkarımıyla dikey yerleşim
static func dh_of(node: Node) -> float:
	return node.get_viewport().get_visible_rect().size.y - 844.0
