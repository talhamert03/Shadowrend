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
	# savurma her görüntü karesinde ilerler (90/120 Hz ekranda fizik adımına bağlı takılmasın);
	# alt sınıfların _process'inden bağımsız küçük bir saat düğümü
	var tk := _Ticker.new()
	tk.cb = _tick_fling
	add_child(tk)

class _Ticker extends Node:
	var cb: Callable
	func _init() -> void: process_mode = Node.PROCESS_MODE_ALWAYS
	func _process(dt: float) -> void: cb.call(dt)

func btn(L: Lyr, n: Lyr.N, cb: Callable, press_scale := 0.97, grow := 4.0, hit := Rect2()) -> void:
	if n == null: return
	_btns.append({"lyr": L, "n": n, "cb": cb, "scale": press_scale, "grow": grow, "hit": hit})

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
	# hit: katman yerelinde elle verilen dokunma kutusu (çizim dönüşümüyle kayan düğümler için)
	var r: Rect2 = B.hit if B.get("hit", Rect2()).has_area() else L.visible_rect_of(B.n)
	if r.size.x <= 0 or r.size.y <= 0: return Rect2()
	return _clip(L, (L.get_global_transform() * r).grow(B.grow))

## kırpan ata (sayfa görünüm alanı vb.): görünmeyen kısım dokunuş almaz — kaydırma alanının
## dışına taşan kartlar / sayfa kökü alt menünün dokunuşunu yutmasın
static func _clip(L: Node, R: Rect2) -> Rect2:
	var p := L.get_parent()
	while p:
		if p is Control and (p as Control).clip_contents:
			R = R.intersection((p as Control).get_global_rect())
		p = p.get_parent()
	return R

## kaydırma alanının ekrandaki (kırpılmış) dikdörtgeni; gizli katmanınki boş
func _srect(S: Dictionary) -> Rect2:
	var L: Lyr = S.lyr
	if not is_instance_valid(L) or not L.is_visible_in_tree(): return Rect2()
	return _clip(L, L.get_global_transform() * L.rect_of(S.n))

## Supercell düğme hissi: basınca yayla derin ezilir (~0,92), bırakınca taşarak (≈1,04)
## yerine oturur — anlık ölçek değişimi değil, sönümlü yay (k 760, c 15; ζ≈0,27).
var _springs := {}           # Lyr.N → {lyr, s, v, tgt}
var no_spring := {}          # kendi animasyonu olan düğümler (alt menü sekmesi zıplaması)

func _set_pressed(B, on: bool) -> void:
	if B == null: return
	var n: Lyr.N = B.n
	if float(B.scale) >= 0.999: return            # ölçeksiz düğme (tam ekran dokunuş alanı vb.)
	if no_spring.has(n) or Settings.data.get("rm", false):
		n.extra = Transform2D(0, Vector2.ONE * B.scale, 0, Vector2.ZERO) if on else Transform2D.IDENTITY
		(B.lyr as Lyr).set_dyn(n)
		return
	var sp = _springs.get(n)
	if sp == null:
		sp = {"lyr": B.lyr, "s": 1.0, "v": 0.0, "tgt": 1.0}
		_springs[n] = sp
	sp.tgt = (1.0 - (1.0 - float(B.scale)) * 2.6) if on else 1.0
	if on: sp.v -= 1.6                    # basış anında hızlı çöküş

func _tick_springs(dt: float) -> void:
	if _springs.is_empty(): return
	var h := minf(dt, 1.0 / 30.0)
	for n in _springs.keys():
		var sp: Dictionary = _springs[n]
		if not is_instance_valid(sp.lyr):
			_springs.erase(n)
			continue
		var steps := 2
		for i in steps:
			var a: float = 760.0 * (float(sp.tgt) - float(sp.s)) - 15.0 * float(sp.v)
			sp.v = float(sp.v) + a * h / steps
			sp.s = float(sp.s) + float(sp.v) * h / steps
		var N: Lyr.N = n
		if float(sp.tgt) == 1.0 and absf(float(sp.s) - 1.0) < 0.0015 and absf(float(sp.v)) < 0.02:
			N.extra = Transform2D.IDENTITY
			_springs.erase(n)
		else:
			N.extra = Transform2D(0, Vector2.ONE * float(sp.s), 0, Vector2.ZERO)
		(sp.lyr as Lyr).set_dyn(N)

## alt sınıf: kaydırma sırasında (dx canlı), bitişte (dx, hız px/sn)
func _swipe_move(_dx: float) -> void: pass
func _swipe_end(_dx: float, _vel: float) -> void: pass

# ── dokunma hareketi ──
# Tek etkin parmak (_gid). Basışta adaylar belirlenir: düğme (_pb), dikey kaydırma (_drag),
# yatay sayfa kaydırma (_sw). Parmak SLOP kadar gidince yön kilitlenir: yatay baskınsa
# sayfa kaydırma, değilse dikey kaydırma; ikisi de düğme basışını iptal eder. Hız, son
# ~100 ms'lik örneklerden (Android dokunuşları kare başına toplu gelir; tek aralıktan
# ölçülen hız oynak olur).
const SLOP := 9.0
var _gid := -1
var _g0 := Vector2.ZERO
var _mode := ""              # "" · "swipe" · "scroll"
var _samples: Array = []     # [[usec, Vector2]]

func _reset_gesture() -> void:
	if _pb: _set_pressed(_pb, false)
	_pb = null
	_press = -1
	_drag = null
	_sw = null
	_gid = -1
	_mode = ""
	_samples.clear()

func _notification(what: int) -> void:
	# gizlenirken yarım kalan hareket bırakılır (bırakış olayı bu ekrana hiç gelmeyebilir)
	if what == NOTIFICATION_VISIBILITY_CHANGED and not is_visible_in_tree() and _gid >= 0:
		var was_sw := _mode == "swipe"
		_reset_gesture()
		if was_sw: _swipe_end(0.0, 0.0)

func _sample(p: Vector2) -> void:
	var now := Time.get_ticks_usec()
	# bırakış, son hareketle aynı noktadaysa örnek değildir (hızı sıfıra çekmesin)
	if _samples.size() and (_samples[-1][1] as Vector2).is_equal_approx(p): return
	_samples.append([now, p])
	while _samples.size() > 3 and now - int(_samples[0][0]) > 150000: _samples.pop_front()

## son ~120 ms'lik hareketten hız (px/sn); parmak bırakmadan önce durduysa 0. Dokunuşlar kare
## başına toplanarak gelir (Android) — zaman damgası kare zamanıdır, kare süresi hesaba katılır.
func _velocity() -> Vector2:
	if _samples.size() < 2: return Vector2.ZERO
	var now := Time.get_ticks_usec()
	var b: Array = _samples[-1]
	var frame_us := get_process_delta_time() * 1000000.0
	if float(now - int(b[0])) > maxf(70000.0, frame_us * 1.6): return Vector2.ZERO
	var a: Array = b
	for smp in _samples:
		if int(b[0]) - int(smp[0]) <= 120000:
			a = smp
			break
	var dt := float(int(b[0]) - int(a[0])) / 1000000.0
	if dt < 0.008: return Vector2.ZERO
	return ((b[1] as Vector2) - (a[1] as Vector2)) / dt

## B düğmesi, S kaydırma alanının içeriğinde mi (içerikteki kart sürüklenince kaydırma kazanır;
## alanın üstündeki sabit düğme — alt menü vb. — kaydırma başlatmaz)
static func _owns(S_lyr: Node, B) -> bool:
	if B == null: return true
	var bl: Node = B.lyr
	return bl == S_lyr or S_lyr.is_ancestor_of(bl)

## açılış (intro + yükleme ekranı) sürerken ve kapandıktan kısa süre sonra menü dokunuş almaz:
## introyu geçmek için yapılan dokunuş alttaki SAVAŞ düğmesine düşüp savaşı başlatmasın
static var locked_until_ms := 0
static var boot_lock := false

func _input(ev: InputEvent) -> void:
	if not visible or not is_visible_in_tree(): return
	if boot_lock or Time.get_ticks_msec() < locked_until_ms:
		if ev is InputEventScreenTouch and not (ev as InputEventScreenTouch).pressed and _gid >= 0: _reset_gesture()
		return
	if ev is InputEventScreenTouch:
		var st := ev as InputEventScreenTouch
		if st.pressed:
			# başka parmak etkinken ikinci dokunuş yok sayılır; aynı kimlikle yeni basış →
			# önceki bırakış kaybolmuş, hareket sıfırlanır
			if _gid >= 0 and st.index != _gid:
				if modal: get_viewport().set_input_as_handled()
				return
			if _gid >= 0:
				var was_sw := _mode == "swipe"
				_reset_gesture()
				if was_sw: _swipe_end(0.0, 0.0)
			_press_at(st.index, st.position)
		elif st.index == _gid:
			_release(st.position, st.canceled)
	elif ev is InputEventScreenDrag:
		var sd := ev as InputEventScreenDrag
		if sd.index != _gid:
			if modal: get_viewport().set_input_as_handled()
			return
		_move(sd.position)

func _press_at(id: int, pos: Vector2) -> void:
	_gid = id
	_g0 = pos
	_mode = ""
	_samples.clear()
	_sample(pos)
	# dokunuş savurmayı durdurur; kenar dışındaysa geri yaylanma sürer (_tick_fling).
	# Kayan listeye dokunmak yalnız durdurur — altındaki kart açılmaz (mobil alışkanlık)
	var stopped := false
	for F in _fling:
		if absf(float(F.vel)) > 80.0: stopped = true
		F.vel = 0.0
	# düğme: en üstteki (son eklenen) görünür düğme
	for i in range(_btns.size() - 1, -1, -1):
		if stopped: break
		var B: Dictionary = _btns[i]
		if not is_instance_valid(B.lyr): continue
		if not (B.n as Lyr.N).hidden and (B.lyr as Lyr).is_visible_in_tree() and _rect(B).has_point(pos):
			_press = id
			_pb = B
			_set_pressed(B, true)
			break
	# kaydırma alanı: en üstteki görünür alan; basılan düğme içeriğindeyse
	for i in range(_scrolls.size() - 1, -1, -1):
		var S: Dictionary = _scrolls[i]
		if _srect(S).has_point(pos) and _owns(S.lyr, _pb):
			_drag = {"S": S, "id": id, "y0": pos.y, "s0": (S.n as Lyr.N).scroll_y, "moved": false}
			break
	if swipe_rect.has_area() and swipe_rect.has_point(pos):
		_sw = {"id": id, "x0": pos.x, "y0": pos.y, "on": false}
	if _pb or modal: get_viewport().set_input_as_handled()

func _move(pos: Vector2) -> void:
	_sample(pos)
	if _mode == "":
		var d := pos - _g0
		if d.length() < SLOP:
			if _pb or modal: get_viewport().set_input_as_handled()
			return
		if _sw and absf(d.x) > absf(d.y) * 1.15:
			_mode = "swipe"
			_sw.on = true
			_sw.x0 = pos.x - signf(d.x) * 2.0      # kilit anındaki sıçramayı yut
		elif _drag and absf(d.y) >= absf(d.x) * 0.6:
			_mode = "scroll"
			_drag.moved = true
			_drag.y0 = pos.y
			_drag.s0 = (_drag.S.n as Lyr.N).scroll_y
			for F in _fling.duplicate():
				if F.S == _drag.S: _fling.erase(F)
		else:
			_mode = "none"
			# düğmeden belirgin şekilde çıkıldıysa basış iptal (web click)
		if _mode == "swipe" or _mode == "scroll":
			if _pb: _set_pressed(_pb, false)
			_pb = null
			_press = -1
	if _mode == "swipe":
		_swipe_move(pos.x - float(_sw.x0))
		get_viewport().set_input_as_handled()
		return
	if _mode == "scroll" and _drag:
		var S: Dictionary = _drag.S
		var L2: Lyr = S.lyr
		if not is_instance_valid(L2):
			_drag = null
			return
		var sc := maxf(0.01, L2.get_global_transform().get_scale().y)
		var mx := L2.scroll_max(S.n)
		var y: float = _drag.s0 - (pos.y - _drag.y0) / sc
		# kenarda lastik direnç
		if y < 0: y *= 0.35
		elif y > mx: y = mx + (y - mx) * 0.35
		L2.set_scroll(S.n, y)
		get_viewport().set_input_as_handled()
		return
	if _pb and not _rect(_pb).grow(14).has_point(pos):
		_set_pressed(_pb, false)
		_pb = null
		_press = -1
	if _pb or modal: get_viewport().set_input_as_handled()

func _release(pos: Vector2, canceled: bool) -> void:
	_sample(pos)
	var v := _velocity()
	var mode := _mode
	var B = _pb
	var D = _drag
	var SW = _sw
	_pb = null
	_press = -1
	_drag = null
	_sw = null
	_gid = -1
	_mode = ""
	_samples.clear()
	if B: _set_pressed(B, false)
	if mode == "swipe" and SW:
		get_viewport().set_input_as_handled()
		_swipe_end(0.0 if canceled else pos.x - float(SW.x0), 0.0 if canceled else v.x)
		return
	if mode == "scroll" and D and is_instance_valid(D.S.lyr):
		var L2: Lyr = D.S.lyr
		var vy := 0.0 if canceled else -v.y / maxf(0.01, L2.get_global_transform().get_scale().y)
		_fling.append({"S": D.S, "vel": clampf(vy, -6000.0, 6000.0)})
		get_viewport().set_input_as_handled()
		return
	if B:
		get_viewport().set_input_as_handled()
		if not canceled and is_instance_valid(B.lyr) and _rect(B).grow(10).has_point(pos):
			if float(B.scale) < 0.999: TapFx.pop(pos)       # tam ekran dokunuş alanlarında değil
			(B.cb as Callable).call()
		return
	if modal: get_viewport().set_input_as_handled()

func _tick_fling(dt: float) -> void:
	_tick_springs(dt)
	# savurma + kenara geri yaylanma
	if _fling.is_empty(): return
	for F in _fling.duplicate():
		var S: Dictionary = F.S
		if not is_instance_valid(S.lyr):
			_fling.erase(F)
			continue
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
