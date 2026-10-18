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
var _scrolls: Array = []     # [{lyr, n}]
var _drag = null             # {S, id, y0, s0, moved, vel, last}
var _fling: Array = []       # [{S, vel}]
## yatay kaydırma (sayfa geçişi): swipe_rect içinde başlayan, yatay baskın sürükleme
var swipe_rect := Rect2()     # boşsa kapalı (ekran koordinatı)
var _sw = null               # {id, x0, y0, t, on, last, lt, vel}

func _init(game = null) -> void:
	g = game
	visible = false
	process_mode = Node.PROCESS_MODE_ALWAYS

func btn(L: Lyr, n: Lyr.N, cb: Callable, press_scale := 0.97, grow := 4.0) -> void:
	if n == null: return
	_btns.append({"lyr": L, "n": n, "cb": cb, "scale": press_scale, "grow": grow})

## kaydırılabilir alan (yakalamadaki overflow-y:auto düğümü)
func scroll_area(L: Lyr, n: Lyr.N) -> void:
	if n and n.scroller: _scrolls.append({"lyr": L, "n": n})

## bir katmanın düğmelerini kaldır (katman yeniden kurulurken)
func unbtn(L: Lyr) -> void:
	for B in _btns.duplicate():
		if B.lyr == L: _btns.erase(B)
	for S in _scrolls.duplicate():
		if S.lyr == L: _scrolls.erase(S)
	if _drag and _drag.S.lyr == L: _drag = null
	for F in _fling.duplicate():
		if F.S.lyr == L: _fling.erase(F)
	if _pb and _pb.lyr == L:
		_pb = null
		_press = -1

## kapanış geçişi: kısa solma, sonra asıl kapatma (cb); açılışta reset_fade()
var _fade_tw: Tween
func fade_hide(cb: Callable, dur := 0.16) -> void:
	if _fade_tw and _fade_tw.is_valid(): return
	_fade_tw = create_tween()
	_fade_tw.tween_property(self, "modulate:a", 0.0, dur).set_ease(Tween.EASE_IN).set_trans(Tween.TRANS_QUAD)
	_fade_tw.tween_callback(func():
		_fade_tw = null
		cb.call()
		modulate.a = 1.0)

## bekleyen kapanış geçişini iptal et (ekran kapanırken yeniden açıldı)
func cancel_fade() -> void:
	if _fade_tw and _fade_tw.is_valid(): _fade_tw.kill()
	_fade_tw = null
	modulate.a = 1.0

## açılış geçişi: solarak + hafif büyüyerek belirir (ekran merkezli)
func fade_show(dur := 0.2) -> void:
	if _fade_tw and _fade_tw.is_valid(): _fade_tw.kill()
	var W := UIK.ui_size(get_viewport())
	modulate.a = 0.0
	scale = Vector2.ONE * 0.97
	position = W * 0.5 * (1.0 - 0.97)
	_fade_tw = create_tween().set_parallel(true)
	_fade_tw.tween_property(self, "modulate:a", 1.0, dur).set_ease(Tween.EASE_OUT).set_trans(Tween.TRANS_QUAD)
	_fade_tw.tween_property(self, "scale", Vector2.ONE, dur * 1.3).set_ease(Tween.EASE_OUT).set_trans(Tween.TRANS_BACK)
	_fade_tw.tween_property(self, "position", Vector2.ZERO, dur * 1.3).set_ease(Tween.EASE_OUT).set_trans(Tween.TRANS_BACK)
	_fade_tw.chain().tween_callback(func(): _fade_tw = null)

func clear_btns() -> void:
	_btns.clear()
	_scrolls.clear()
	_drag = null
	_press = -1
	_pb = null

func _rect(B: Dictionary) -> Rect2:
	var L: Lyr = B.lyr
	var r := L.visible_rect_of(B.n)
	if r.size.x <= 0 or r.size.y <= 0: return Rect2()
	var R := (L.get_global_transform() * r).grow(B.grow)
	# kırpan ata (sayfa görünüm alanı vb.): görünmeyen kısım dokunuş almaz — kaydırma alanının
	# dışına taşan kartlar alt menünün dokunuşunu yutmasın
	var p := L.get_parent()
	while p:
		if p is Control and (p as Control).clip_contents:
			R = R.intersection((p as Control).get_global_rect())
		p = p.get_parent()
	return R

func _set_pressed(B, on: bool) -> void:
	if B == null: return
	var n: Lyr.N = B.n
	n.extra = Transform2D(0, Vector2.ONE * B.scale, 0, Vector2.ZERO) if on else Transform2D.IDENTITY
	(B.lyr as Lyr).set_dyn(n)

## alt sınıf: kaydırma sırasında (dx canlı), bitişte (dx, hız px/sn)
func _swipe_move(_dx: float) -> void: pass
func _swipe_end(_dx: float, _vel: float) -> void: pass

func _input(ev: InputEvent) -> void:
	if not visible or not is_visible_in_tree(): return
	if ev is InputEventScreenTouch:
		var st := ev as InputEventScreenTouch
		if st.pressed and swipe_rect.has_area() and swipe_rect.has_point(st.position) and (_sw == null or st.index == _sw.id or not _sw.on):
			_sw = {"id": st.index, "x0": st.position.x, "y0": st.position.y, "on": false, "last": st.position.x, "lt": Time.get_ticks_msec(), "vel": 0.0}
		if not st.pressed and _sw and st.index == _sw.id:
			var was_on: bool = _sw.on
			var dx: float = st.position.x - float(_sw.x0)
			var v: float = _sw.vel
			_sw = null
			if was_on:
				_press = -1
				_pb = null
				_drag = null
				get_viewport().set_input_as_handled()
				_swipe_end(dx, v)
				return
		if st.pressed:
			# kaydırma alanı: dokunuş başlangıcı (düğme basışıyla birlikte; 8 px sonra kaydırma kazanır)
			for S in _scrolls:
				var L: Lyr = S.lyr
				var r := L.rect_of(S.n)
				if (L.get_global_transform() * r).has_point(st.position):
					_drag = {"S": S, "id": st.index, "y0": st.position.y, "s0": (S.n as Lyr.N).scroll_y, "moved": false, "vel": 0.0, "last": st.position.y, "t": Time.get_ticks_msec()}
					_fling.clear()
					break
			for i in range(_btns.size() - 1, -1, -1):
				var B: Dictionary = _btns[i]
				if not (B.n as Lyr.N).hidden and (B.lyr as Lyr).is_visible_in_tree() and _rect(B).has_point(st.position):
					_press = st.index
					_pb = B
					_set_pressed(B, true)
					get_viewport().set_input_as_handled()
					return
			if modal: get_viewport().set_input_as_handled()
		else:
			if _drag and st.index == _drag.id:
				if _drag.moved: _fling.append({"S": _drag.S, "vel": _drag.vel})
				_drag = null
			if st.index == _press:
				_press = -1
				var B = _pb
				_pb = null
				_set_pressed(B, false)
				get_viewport().set_input_as_handled()
				if B and _rect(B).grow(8).has_point(st.position): (B.cb as Callable).call()
	elif ev is InputEventScreenDrag:
		var sd := ev as InputEventScreenDrag
		if _sw and sd.index == _sw.id:
			var dx2: float = sd.position.x - float(_sw.x0)
			var dy2: float = sd.position.y - float(_sw.y0)
			var now2 := Time.get_ticks_msec()
			var dt2 := maxf(1.0, float(now2 - int(_sw.lt))) / 1000.0
			_sw.vel = lerpf(float(_sw.vel), (sd.position.x - float(_sw.last)) / dt2, 0.5)
			_sw.last = sd.position.x
			_sw.lt = now2
			if not _sw.on:
				# dikey kaydırma başladıysa yatay geçiş yok
				if _drag and _drag.moved: _sw = null
				elif absf(dx2) > 14.0 and absf(dx2) > absf(dy2) * 1.4:
					_sw.on = true
					if _pb: _set_pressed(_pb, false)
					_pb = null
					_press = -1
					_drag = null
			if _sw and _sw.on:
				_swipe_move(dx2)
				get_viewport().set_input_as_handled()
				return
		if _drag and sd.index == _drag.id:
			var dy: float = sd.position.y - _drag.y0
			if not _drag.moved and absf(dy) > 8.0:
				_drag.moved = true
				# kaydırma başladı → basılı düğmeyi bırak (tıklama sayılmaz)
				if _pb: _set_pressed(_pb, false)
				_pb = null
				_press = -1
			if _drag.moved:
				var S: Dictionary = _drag.S
				var L2: Lyr = S.lyr
				var mx := L2.scroll_max(S.n)
				var y: float = _drag.s0 - dy / maxf(0.01, L2.get_global_transform().get_scale().y)
				# kenarda lastik direnç
				if y < 0: y *= 0.35
				elif y > mx: y = mx + (y - mx) * 0.35
				L2.set_scroll(S.n, y)
				var now := Time.get_ticks_msec()
				var dt := maxf(1.0, float(now - int(_drag.t))) / 1000.0
				_drag.vel = lerpf(float(_drag.vel), -(sd.position.y - float(_drag.last)) / dt / maxf(0.01, L2.get_global_transform().get_scale().y), 0.5)
				_drag.last = sd.position.y
				_drag.t = now
		if modal: get_viewport().set_input_as_handled()

func _physics_process(dt: float) -> void:
	# savurma + kenara geri yaylanma
	for F in _fling.duplicate():
		var S: Dictionary = F.S
		var L: Lyr = S.lyr
		var n: Lyr.N = S.n
		var mx := L.scroll_max(n)
		var y := n.scroll_y + float(F.vel) * dt
		F.vel = float(F.vel) * pow(0.0025, dt)
		if y < 0: y = lerpf(y, 0.0, 1.0 - pow(0.0001, dt)); F.vel = 0.0
		elif y > mx: y = lerpf(y, mx, 1.0 - pow(0.0001, dt)); F.vel = 0.0
		L.set_scroll(n, y)
		if absf(float(F.vel)) < 5.0 and y >= -0.5 and y <= mx + 0.5:
			L.set_scroll(n, clampf(y, 0, mx))
			_fling.erase(F)

## ekran yüksekliği farkı (yakalama 844 px'te) — esneme çıkarımıyla dikey yerleşim
static func dh_of(node: Node) -> float:
	return UIK.ui_size(node.get_viewport()).y - 844.0
