class_name ScrUpFx
extends Scr
## YÜKSELTME töreni (eşya ve kahraman kartı, tam ekran, ~2,4 sn + dokunuş):
##  0,00 GİRİŞ   karartma + nadirlik halesi; kart dönerek ortaya fırlar
##  0,25 ŞARJ    ekran kenarlarından enerji çizgileri karta akar (gittikçe sıklaşır), rün
##               halkası daralıp hızlanır, kart titreyip beyazlaşır, "GELİŞTİRİLİYOR" nabzı
##  1,05 PATLAMA beyaz flaş + ekran sarsıntısı, 3 şok dalgası, çizgi roman yıldızı, dönen
##               ışınlar, kıvılcım + kırık parça yağmuru; kart YENİ seviyeyle kurulup zıplar,
##               seviye rozeti eski → yeni döner, "SEVİYE N!" şeridi kayarak çarpar
##  1,40 STATLAR satır satır eski → yeni (yeşil) akar; közler yükselir
##  2,10 "DEVAM ETMEK İÇİN DOKUN"; dokunuşla (0,9 sn sonrası) kapanır, 7 sn'de kendiliğinden
## Tüm şekiller kare başına iki TriBatch ağında (bg/fg) — mobilde tek çizim çağrısı başına.

const INK := Color(0.05, 0.03, 0.07)
const YEL := Color("#ffd23a")
const GREEN := Color("#5ee07a")
const T_CHARGE := 0.25
const T_BURST := 1.05

var _t := 0.0
var _out := -1.0
var _col := Color.WHITE
var _make: Callable
var _lv0 := 1
var _lv1 := 2
var _stats: Array = []
var _extra := ""
var _done: Callable
var _W := 390.0
var _H := 844.0
var _C := Vector2.ZERO
var _cardH := 260.0
var _SR := Rect2()
var _bg: Node2D
var _fg: Node2D
var _card: Node2D
var _cardIn: Node2D
var _badge: Node2D
var _lvOld: Node2D
var _lvNew: Node2D
var _ban: Node2D
var _eyebrow: UIText
var _rows: Array = []
var _hint: UIText
var _streaks: Array = []
var _sparks: Array = []
var _burst := false
var _shake := 0.0
var _spawnAcc := 0.0
var _emberAcc := 0.0
var _flash: ColorRect
var _rowSnd := 0

func _init(game) -> void:
	super(game)
	name = "UpFx"
	z_index = 20

## make: Callable(lv:int) -> Node2D (merkezi 0,0'da kart); stats: [[ad, eski, yeni], …]
func play(make: Callable, col: Color, lv0: int, lv1: int, card_h: float, stats: Array, extra := "", done := Callable()) -> void:
	_clear()
	_make = make
	_col = col
	_lv0 = lv0
	_lv1 = lv1
	_cardH = card_h
	_stats = stats
	_extra = extra
	_done = done
	_t = 0.0
	_out = -1.0
	_burst = false
	_shake = 0.0
	_spawnAcc = 0.0
	_emberAcc = 0.0
	_rowSnd = 0
	_W = 390.0
	_H = 844.0 + Scr.dh_of(self)
	_SR = UIK.screen_rect(self)
	_C = Vector2(_W * 0.5, _H * 0.37)
	_bg = Node2D.new()
	_bg.draw.connect(_draw_bg)
	add_child(_bg)
	_card = Node2D.new()
	_card.position = _C
	add_child(_card)
	_cardIn = _make.call(_lv0)
	_card.add_child(_cardIn)
	_fg = Node2D.new()
	_fg.draw.connect(_draw_fg)
	add_child(_fg)
	# seviye rozeti (kartın altında)
	_badge = Node2D.new()
	_badge.position = _C + Vector2(0, _cardH * 0.5 + 12)
	_badge.draw.connect(func(): _draw_badge(_badge))
	add_child(_badge)
	_lvOld = _lv_label(str(_lv0), Color.WHITE)
	_lvNew = _lv_label(str(_lv1), YEL)
	_lvNew.visible = false
	# üst yazı: GELİŞTİRİLİYOR… (şarjda nabız) → şerit (patlamada)
	_eyebrow = _txt(self, "GELİŞTİRİLİYOR", 15, Color(_col.lightened(0.55), 1.0), 3.0, Vector2(0, _C.y - _cardH * 0.5 - 52), _W, UIK.ink_stroke(1.4, 1.6), true)
	_ban = Node2D.new()
	_ban.position = Vector2(_W * 0.5, _C.y - _cardH * 0.5 - 40)
	_ban.visible = false
	_ban.draw.connect(func(): _draw_ribbon(_ban))
	add_child(_ban)
	var bt := _txt(_ban, "SEVİYE " + str(_lv1) + "!", 30, INK, 2.0, Vector2(-150, -21), 300, "", true)
	bt.rotation = -0.04
	# stat satırları
	var y := _C.y + _cardH * 0.5 + 58.0
	var all := _stats.duplicate()
	if _extra != "": all.append(["★", _extra, ""])
	for s in all:
		var R := Node2D.new()
		R.position = Vector2(_W * 0.5, y)
		R.visible = false
		var hi: bool = str(s[0]) == "★"
		R.draw.connect(func(): _draw_row(R, hi))
		add_child(R)
		if hi:
			_txt(R, "YENİ YETENEK: " + str(s[1]), 14, YEL, 0.8, Vector2(-150, -10), 300, UIK.ink_stroke(1.3, 1.5))
		else:
			var k := _txt(R, str(s[0]), 12, Color(0.82, 0.78, 0.9), 0.6, Vector2(-140, -9), 130, "")
			k.align = 0.0
			var o := _txt(R, str(s[1]), 13, Color(1, 1, 1, 0.55), 0.3, Vector2(-14, -10), 60, "")
			o.align = 1.0
			var nv := _txt(R, str(s[2]), 17, GREEN, 0.4, Vector2(72, -13), 70, UIK.ink_stroke(1.3, 1.5))
			nv.align = 0.0
		_rows.append(R)
		y += 40.0
	_hint = _txt(self, "DEVAM ETMEK İÇİN DOKUN", 12, Color(1, 1, 1, 0.75), 2.0, Vector2(0, minf(_H - 70.0, y + 18.0)), _W, UIK.ink_stroke(1.0, 1.2))
	_hint.modulate.a = 0.0
	_flash = ColorRect.new()
	_flash.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_flash.position = _SR.position
	_flash.size = _SR.size
	_flash.color = Color(1, 0.98, 0.9)
	_flash.modulate.a = 0.0
	add_child(_flash)
	# kenarlardan ilk enerji dalgası
	for i in 10: _spawn_streak(randf_range(0.0, 0.5))
	_card.scale = Vector2.ONE * 0.2
	_card.rotation = -0.35
	_tick(0.0)
	visible = true
	modulate.a = 1.0
	g.audio.play("panel")

func _lv_label(s: String, c: Color) -> Node2D:
	var n := Node2D.new()
	_badge.add_child(n)
	var t := _txt(n, s, 24, c, 0.0, Vector2(-30, -16), 60, UIK.ink_stroke(1.6, 2.0), true)
	t.align = 0.5
	return n

func _txt(parent: Node, s: String, sz: float, col: Color, ls: float, pos: Vector2, w: float, sh := "", display := false) -> UIText:
	var t := UIText.new()
	t.style(display, 1000 if not display else 800, sz, ls, col, sh)
	t.align = 0.5
	t.nowrap = true
	t.wrap_w = w
	t.size = Vector2(w, sz * 1.5)
	t.text = s
	t.position = pos
	parent.add_child(t)
	return t

func _clear() -> void:
	for c in get_children():
		if c is Node2D or c is Control: c.queue_free()
	_rows.clear()
	_streaks.clear()
	_sparks.clear()

func _spawn_streak(delay := 0.0) -> void:
	var a := randf() * TAU
	var r0 := randf_range(300.0, 460.0)
	_streaks.append({"a": a, "r": r0 + delay * 300.0, "v": randf_range(260.0, 420.0), "w": randf_range(2.0, 4.5), "len": randf_range(40.0, 110.0), "c": randi() % 3})

# ═════════════ zamanlama ═════════════

func _process(dt: float) -> void:
	if not visible: return
	dt = minf(dt, 0.05)
	_t += dt
	_tick(dt)
	if _out < 0.0 and _t > 7.0: _close()
	if _out >= 0.0:
		_out += dt
		var k := clampf(_out / 0.28, 0.0, 1.0)
		modulate.a = 1.0 - k
		_card.scale = Vector2.ONE * (1.0 + 0.12 * k)
		if k >= 1.0:
			visible = false
			_clear()
			if _done.is_valid(): _done.call()

func _tick(dt: float) -> void:
	var t := _t
	# kart: giriş → şarj titremesi → patlama zıplaması
	if t < T_CHARGE + 0.1:
		var k := clampf(t / 0.32, 0.0, 1.0)
		_card.scale = Vector2.ONE * lerpf(0.2, 1.0, ScrLevelUp._back_ease(k))
		_card.rotation = lerpf(-0.35, 0.0, 1.0 - pow(1.0 - k, 3.0))
	if t >= T_CHARGE and t < T_BURST:
		var k2 := (t - T_CHARGE) / (T_BURST - T_CHARGE)
		var amp := 5.0 * k2 * k2
		_card.position = _C + Vector2(randf_range(-amp, amp), randf_range(-amp, amp))
		_card.scale = Vector2.ONE * (1.0 + 0.06 * k2 + 0.02 * sin(t * 40.0) * k2)
		var wh := 1.0 + 0.9 * k2 * k2
		_cardIn.modulate = Color(wh, wh, wh)
		_eyebrow.modulate.a = 0.55 + 0.45 * sin(t * 14.0)
		# enerji çizgileri gittikçe sıklaşır
		_spawnAcc += dt * lerpf(18.0, 70.0, k2)
		while _spawnAcc >= 1.0:
			_spawnAcc -= 1.0
			_spawn_streak()
		_badge.scale = Vector2.ONE * (1.0 + 0.05 * sin(t * 30.0) * k2)
	if t >= T_BURST and not _burst: _do_burst()
	if _burst:
		var tb := t - T_BURST
		_card.position = _C
		var sp := 1.0 + 0.32 * exp(-tb * 6.5) * cos(tb * 20.0)
		_card.scale = Vector2.ONE * sp
		var wh2 := 1.0 + 1.4 * exp(-tb * 7.0)
		_cardIn.modulate = Color(wh2, wh2, wh2)
		# hafif süzülme
		_card.position.y += sin(tb * 2.2) * 3.0 * minf(1.0, tb)
		# seviye rozeti: eski yukarı uçar, yeni büyükten oturur
		_lvOld.position.y = -60.0 * minf(1.0, tb / 0.3)
		_lvOld.modulate.a = maxf(0.0, 1.0 - tb / 0.25)
		_lvNew.visible = true
		var kn := clampf(tb / 0.35, 0.0, 1.0)
		_lvNew.scale = Vector2.ONE * lerpf(2.6, 1.0, ScrLevelUp._back_ease(kn))
		_lvNew.modulate.a = minf(1.0, tb / 0.12)
		_badge.scale = Vector2.ONE * (1.0 + 0.25 * exp(-tb * 8.0))
		# şerit: soldan kayarak çarpar
		_ban.visible = true
		var kb := clampf((tb - 0.08) / 0.32, 0.0, 1.0)
		_ban.position.x = _W * 0.5 + lerpf(-_W, 0.0, ScrLevelUp._back_ease(kb))
		_ban.skew = lerpf(-0.5, 0.0, kb)
		_ban.scale = Vector2.ONE * (1.0 + 0.18 * exp(-maxf(0.0, tb - 0.4) * 9.0) * (1.0 if tb > 0.4 else 0.0))
		_eyebrow.modulate.a = maxf(0.0, _eyebrow.modulate.a - dt * 6.0)
		# statlar
		for i in _rows.size():
			var R: Node2D = _rows[i]
			var tr := tb - 0.38 - i * 0.14
			if tr > 0.0:
				if not R.visible:
					R.visible = true
					if _rowSnd < 6:
						_rowSnd += 1
						g.audio.play("tally")
				var kr := clampf(tr / 0.3, 0.0, 1.0)
				R.modulate.a = kr
				R.position.x = _W * 0.5 + (1.0 - ScrLevelUp._back_ease(kr)) * 40.0
				R.scale = Vector2.ONE * lerpf(0.85, 1.0, ScrLevelUp._back_ease(kr))
		if tb > 1.05: _hint.modulate.a = 0.45 + 0.4 * sin((tb - 1.05) * 4.0)
		# közler
		_emberAcc += dt * 14.0
		while _emberAcc >= 1.0:
			_emberAcc -= 1.0
			var px := _C.x + randf_range(-170.0, 170.0)
			_sparks.append({"p": Vector2(px, _C.y + randf_range(40.0, 200.0)), "v": Vector2(randf_range(-20, 20), randf_range(-90, -40)), "life": randf_range(1.0, 1.8), "max": 1.8, "c": _col.lightened(0.4) if randf() < 0.5 else YEL, "s": randf_range(1.2, 2.4), "g": -20.0, "ember": true})
	# sarsıntı
	if _shake > 0.0:
		_shake = maxf(0.0, _shake - dt * 30.0)
		position = Vector2(randf_range(-_shake, _shake), randf_range(-_shake, _shake))
	else:
		position = Vector2.ZERO
	_flash.modulate.a = maxf(0.0, _flash.modulate.a - dt * 3.2) if _burst else 0.0
	# parçacıklar
	for i in range(_streaks.size() - 1, -1, -1):
		var S: Dictionary = _streaks[i]
		S.v = float(S.v) + dt * 900.0
		S.r = float(S.r) - float(S.v) * dt
		if float(S.r) < 70.0 or _burst: _streaks.remove_at(i)
	for i in range(_sparks.size() - 1, -1, -1):
		var p: Dictionary = _sparks[i]
		p.life = float(p.life) - dt
		if float(p.life) <= 0.0:
			_sparks.remove_at(i)
			continue
		var v: Vector2 = p.v
		v *= pow(0.12, dt) if not p.get("ember", false) else 1.0
		v.y += float(p.get("g", 520.0)) * dt
		p.v = v
		p.p = (p.p as Vector2) + v * dt
		if p.has("rot"): p.rot = float(p.rot) + float(p.vr) * dt
	_bg.queue_redraw()
	_fg.queue_redraw()

func _do_burst() -> void:
	_burst = true
	_shake = 11.0
	_flash.modulate.a = 1.0
	# kart yeni seviyeyle
	_cardIn.queue_free()
	_cardIn = _make.call(_lv1)
	_card.add_child(_cardIn)
	g.audio.play("chestburst")
	g.audio.play("levelup")
	var cols := [Color.WHITE, YEL, _col, _col.lightened(0.45)]
	for i in 70:
		var a := randf() * TAU
		var sp := randf_range(260.0, 980.0)
		_sparks.append({"p": _C + Vector2(cos(a), sin(a)) * randf_range(10, 60), "v": Vector2(cos(a), sin(a)) * sp, "life": randf_range(0.5, 1.15), "max": 1.15, "c": cols[i % cols.size()], "s": randf_range(2.0, 4.5)})
	for i in 22:
		var a2 := randf() * TAU
		var sp2 := randf_range(200.0, 620.0)
		_sparks.append({"p": _C, "v": Vector2(cos(a2), sin(a2)) * sp2 + Vector2(0, -160), "life": randf_range(0.8, 1.5), "max": 1.5, "c": _col if i % 2 else YEL, "s": randf_range(5.0, 9.0), "rot": randf() * TAU, "vr": randf_range(-12.0, 12.0), "shard": true})

# ═════════════ çizim ═════════════

func _draw_bg() -> void:
	var B := TriBatch.new()
	var t := _t
	var a_in := clampf(t / 0.25, 0.0, 1.0)
	B.rect(_SR, Color(INK, 0.94 * a_in))
	# nadirlik halesi (şarjda büyür, patlamada parlar)
	var kc := clampf((t - T_CHARGE) / (T_BURST - T_CHARGE), 0.0, 1.0)
	var hr := 230.0 + 60.0 * kc + (40.0 * exp(-(t - T_BURST) * 3.0) if _burst else 0.0)
	B.radial(_C, hr, Color(_col, (0.35 + 0.35 * kc) * a_in), Color(_col, 0.0), 1.0, 48)
	# ışınlar: şarjda soluk, patlamadan sonra parlak ve dönen
	var rk := (0.1 + 0.16 * kc) if not _burst else 0.3
	var rot := t * (0.3 if _burst else 0.9)
	for i in 16:
		var a := rot + i * TAU / 16.0
		var hw := 0.075 if i % 2 == 0 else 0.045
		var L := 720.0 if i % 2 == 0 else 520.0
		var p1 := _C + Vector2.from_angle(a - hw) * L
		var p2 := _C + Vector2.from_angle(a + hw) * L
		var cc := Color(_col.lightened(0.5), rk * a_in)
		B.V.append_array(PackedVector2Array([_C, p1, p2]))
		B.C.append_array(PackedColorArray([cc, Color(cc, 0.0), Color(cc, 0.0)]))
	# çizgi roman yıldızı (patlamada açılır, yavaş döner)
	if _burst:
		var tb := t - T_BURST
		var sk := ScrLevelUp._back_ease(clampf(tb / 0.28, 0.0, 1.0))
		var R0 := 175.0 * sk
		var srot := tb * 0.25
		_star(B, _C + Vector2(6, 9), R0 + 8, R0 * 0.74 + 8, 18, INK, srot)
		_star(B, _C, R0 + 8, R0 * 0.74 + 8, 18, INK, srot)
		_star(B, _C, R0, R0 * 0.74, 18, _col.darkened(0.12), srot)
		_star(B, _C, R0 * 0.8, R0 * 0.6, 18, _col.lightened(0.42), srot + 0.09)
		# yarım ton halkası
		for j in 36:
			var ua := Vector2.from_angle(j * TAU / 36.0 + srot)
			for q in 3:
				var rr := R0 * (0.45 + q * 0.11)
				B.circle(_C + ua * rr, 2.2 - q * 0.5, Color(INK, 0.28), 6)
	else:
		# rün halkası: daralır, hızlanır
		var rr2 := lerpf(185.0, 128.0, kc * kc)
		var rs := t * lerpf(0.8, 7.0, kc * kc)
		var ca := Color(_col.lightened(0.5), (0.35 + 0.55 * kc) * a_in)
		for j in 12:
			var a0 := rs + j * TAU / 12.0
			GearCard.arc(B, _C, rr2, a0, a0 + TAU / 12.0 * 0.6, 3.0, ca, 5)
			var tp := _C + Vector2.from_angle(a0) * (rr2 + 9.0)
			B.poly(PackedVector2Array([tp + Vector2.from_angle(a0) * 6.0, tp + Vector2.from_angle(a0 + PI * 0.5) * 3.0, tp - Vector2.from_angle(a0) * 6.0, tp - Vector2.from_angle(a0 + PI * 0.5) * 3.0]), ca)
		GearCard.arc(B, _C, rr2 * 1.18, -rs * 0.6, -rs * 0.6 + TAU, 1.5, Color(ca, ca.a * 0.5), 48)
	B.flush(_bg)

func _star(B: TriBatch, c: Vector2, r0: float, r1: float, n: int, col: Color, rot: float) -> void:
	var P := PackedVector2Array()
	for i in n * 2:
		var a := rot + i * PI / n
		var r := r0 if i % 2 == 0 else r1
		# düzensiz uçlar (el çizimi)
		if i % 2 == 0: r *= 0.86 + 0.14 * absf(sin(i * 2.7))
		P.append(c + Vector2.from_angle(a) * r)
	B.fan(c, P, col)

func _draw_fg() -> void:
	var B := TriBatch.new()
	# enerji çizgileri (karta akar)
	for S in _streaks:
		var u := Vector2.from_angle(float(S.a))
		var r := float(S.r)
		var L := float(S.len)
		var w := float(S.w)
		var a := clampf((460.0 - r) / 120.0, 0.0, 1.0)
		var p0 := _C + u * r
		var p1 := _C + u * (r + L)
		var nrm := Vector2(-u.y, u.x)
		var cc: Color = [_col.lightened(0.3), YEL, Color.WHITE][int(S.c)]
		B.V.append_array(PackedVector2Array([p0 + nrm * w * 1.6, p0 - nrm * w * 1.6, p1]))
		B.C.append_array(PackedColorArray([Color(cc, 0.5 * a), Color(cc, 0.5 * a), Color(cc, 0.0)]))
		B.V.append_array(PackedVector2Array([p0 + nrm * w * 0.5, p0 - nrm * w * 0.5, p1]))
		B.C.append_array(PackedColorArray([Color(1, 1, 1, a), Color(1, 1, 1, a), Color(1, 1, 1, 0.0)]))
		B.circle(p0, w * 0.9, Color(1, 1, 1, a), 6)
	# şok dalgaları
	if _burst:
		var tb := _t - T_BURST
		var rc := [Color.WHITE, _col.lightened(0.3), YEL]
		for i in 3:
			var tt := tb - i * 0.08
			if tt <= 0.0 or tt > 0.65: continue
			var k := tt / 0.65
			var r := 70.0 + (1.0 - pow(1.0 - k, 3.0)) * (330.0 + i * 70.0)
			var wd := 16.0 * (1.0 - k) + 1.5
			GearCard.arc(B, _C, r, 0.0, TAU, wd, Color(rc[i], 0.9 * (1.0 - k)), 56)
	# kıvılcımlar / parçalar / közler
	for p in _sparks:
		var k2: float = float(p.life) / float(p.max)
		var c: Color = p.c
		c.a = minf(1.0, k2 * 1.6)
		var pp: Vector2 = p.p
		var s: float = p.s
		if p.get("shard", false):
			var ro: float = p.rot
			var q := PackedVector2Array([pp + Vector2.from_angle(ro) * s, pp + Vector2.from_angle(ro + 2.3) * s * 0.7, pp + Vector2.from_angle(ro + 4.0) * s * 0.5])
			var qi := PackedVector2Array()
			for v in q: qi.append(pp + (v - pp) * 1.35)
			B.poly(qi, Color(INK, c.a))
			B.poly(q, c)
		elif p.get("ember", false):
			B.circle(pp, s * 2.2, Color(c, c.a * 0.25), 8)
			B.circle(pp, s, c, 6)
		else:
			var v: Vector2 = p.v
			var d := v.normalized() if v.length() > 1.0 else Vector2.RIGHT
			var ln := clampf(v.length() * 0.035, s, 26.0)
			var n2 := Vector2(-d.y, d.x) * s * 0.55
			B.poly(PackedVector2Array([pp + d * ln, pp + n2, pp - d * ln * 0.6, pp - n2]), c)
	B.flush(_fg)

func _draw_badge(n: Node2D) -> void:
	var B := TriBatch.new()
	var glow := 0.0
	if _burst: glow = exp(-(_t - T_BURST) * 2.5)
	if glow > 0.01: B.radial(Vector2.ZERO, 70.0, Color(YEL, 0.6 * glow), Color(YEL, 0.0), 1.0, 32)
	# altıgen madalyon
	var H := func(r: float, off: Vector2) -> PackedVector2Array:
		var P := PackedVector2Array()
		for i in 6: P.append(off + Vector2.from_angle(-PI * 0.5 + i * TAU / 6.0) * r)
		return P
	B.poly(H.call(31.0, Vector2(3, 4)), INK)
	B.poly(H.call(31.0, Vector2.ZERO), INK)
	B.poly(H.call(26.0, Vector2.ZERO), _col.darkened(0.25))
	B.poly(H.call(20.0, Vector2.ZERO), _col.darkened(0.55))
	B.flush(n)

func _draw_ribbon(n: Node2D) -> void:
	var B := TriBatch.new()
	var w := 290.0
	var h := 52.0
	var body := PackedVector2Array([Vector2(-w * 0.5 + 14, -h * 0.5), Vector2(w * 0.5 + 6, -h * 0.5 - 4), Vector2(w * 0.5 - 14, h * 0.5), Vector2(-w * 0.5 - 6, h * 0.5 + 4)])
	var sh := PackedVector2Array()
	var rim := PackedVector2Array()
	for q in body:
		sh.append(q * 1.04 + Vector2(5, 7))
		rim.append(q * Vector2(1.035, 1.16))
	# kuyruklar
	for sx in [-1.0, 1.0]:
		var bx: float = sx * (w * 0.5 + 2)
		B.poly(PackedVector2Array([Vector2(bx, -h * 0.3), Vector2(bx + sx * 38, -h * 0.3), Vector2(bx + sx * 26, 0), Vector2(bx + sx * 38, h * 0.3 + 6), Vector2(bx, h * 0.3 + 6)]), INK)
		B.poly(PackedVector2Array([Vector2(bx, -h * 0.3 + 4), Vector2(bx + sx * 31, -h * 0.3 + 4), Vector2(bx + sx * 21, 0), Vector2(bx + sx * 31, h * 0.3 + 2), Vector2(bx, h * 0.3 + 2)]), _col.darkened(0.2))
	B.poly(sh, INK)
	B.poly(rim, INK)
	B.poly(body, YEL)
	B.poly(PackedVector2Array([body[0], body[1], body[1].lerp(body[2], 0.32), body[0].lerp(body[3], 0.32)]), Color(1, 1, 1, 0.35))
	B.flush(n)

func _draw_row(n: Node2D, hi: bool) -> void:
	var B := TriBatch.new()
	var r := Rect2(-150, -16, 300, 32)
	GearCard.fill_rr(B, Rect2(r.position + Vector2(3, 4), r.size), 16, Color(INK, 0.8))
	GearCard.fill_rr(B, r, 16, INK)
	GearCard.fill_rr(B, r.grow(-2), 14, Color(_col.darkened(0.72), 0.95) if not hi else Color(0.32, 0.22, 0.04))
	B.rect(Rect2(r.position + Vector2(14, 4), Vector2(r.size.x - 28, 1.5)), Color(1, 1, 1, 0.1))
	GearCard.ring_rr(B, r, 16, 2, Color(_col.lightened(0.2), 0.8) if not hi else YEL)
	if not hi:
		# eski → yeni oku
		var ac := Color(_col.lightened(0.45), 0.95)
		B.rect(Rect2(52, -2, 9, 4), ac)
		B.poly(PackedVector2Array([Vector2(60, -7), Vector2(68, 0), Vector2(60, 7)]), ac)
	B.flush(n)

# ═════════════ dokunma ═════════════

func _input(ev: InputEvent) -> void:
	if not visible: return
	var tap := false
	if ev is InputEventScreenTouch:
		tap = not (ev as InputEventScreenTouch).pressed
	elif ev is InputEventMouseButton:
		tap = not (ev as InputEventMouseButton).pressed
	if ev is InputEventScreenTouch or ev is InputEventScreenDrag or ev is InputEventMouseButton or ev is InputEventMouseMotion:
		get_viewport().set_input_as_handled()
	if tap and _t > 0.9: _close()

func _close() -> void:
	if _out >= 0.0: return
	_out = 0.0
	g.audio.play("click")

# ═════════════ kart kurucuları ═════════════

## kolaylık: eşya yükseltme töreni
static func play_gear(g2, x: Dictionary, lv0: int, done := Callable()) -> void:
	var col := ScrCeremony.rank_col(ChestSystem.rk(int(x.rarity)))
	g2.ui.upfx.play(func(lv: int) -> Node2D: return gear_card(g2, x, lv), col, lv0, lv0 + 1, 161.8 * 1.65,
		gear_stats(x, lv0, lv0 + 1), "", done)

## kolaylık: kahraman yükseltme töreni
static func play_hero(g2, cid: String, lv0: int, extra := "", done := Callable()) -> void:
	var C: Dictionary = D.CHARACTERS.get(cid, {})
	var col := ScrCeremony.rank_col(clampi(int(C.get("rarity", 1)), 1, 4), true)
	g2.ui.upfx.play(func(lv: int) -> Node2D: return hero_card(cid, lv), col, lv0, lv0 + 1, 236.0,
		hero_stats(cid, lv0, lv0 + 1), extra, done)

## eşya kartı (çantadaki kartın büyütülmüşü) — merkezde
static func gear_card(g2, x: Dictionary, lv: int, scale := 1.65) -> Node2D:
	var sz := Vector2(104, 161.8)
	var root := Node2D.new()
	var inner := Node2D.new()
	inner.scale = Vector2.ONE * scale
	inner.position = -sz * scale * 0.5
	root.add_child(inner)
	var rk: int = ArmoryPage.KZ_RANK.get(int(x.rarity), 1)
	var info := {"x": x, "locked": false, "on": false, "wear": true, "rk": rk, "sel": false,
		"lv": lv, "need": g2.cards_for_next_gear(x.id), "cards": g2.gear_card_count(x.id), "better": false, "acts": []}
	GearCard.build(inner, sz, info, UITex.get_tex("res://assets/ui/art/gear/" + str(x.icon) + ".png"))
	return root

## kahraman kartı: nadirlik çerçevesinde portre + ad şeridi + SV etiketi — merkezde
static func hero_card(cid: String, lv: int) -> Node2D:
	var C: Dictionary = D.CHARACTERS.get(cid, {})
	var col := ScrCeremony.rank_col(clampi(int(C.get("rarity", 1)), 1, 4), true)
	var w := 176.0
	var h := 236.0
	var root := Node2D.new()
	var body := Node2D.new()
	body.position = Vector2(-w * 0.5, -h * 0.5)
	root.add_child(body)
	body.draw.connect(func():
		var B := TriBatch.new()
		var rr := Rect2(0, 0, w, h)
		GearCard.fill_rr(B, Rect2(Vector2(4, 6), rr.size), 14, INK)
		GearCard.fill_rr(B, rr, 14, col)
		for i in 14:
			var a := i * TAU / 14.0
			var c0 := Vector2(w * 0.5, h * 0.42)
			var tri := PackedVector2Array([c0, c0 + Vector2.from_angle(a - 0.12) * w * 1.6, c0 + Vector2.from_angle(a + 0.12) * w * 1.6])
			for q in Geometry2D.intersect_polygons(tri, PackedVector2Array([Vector2(4, 4), Vector2(w - 4, 4), Vector2(w - 4, h - 4), Vector2(4, h - 4)])):
				if q.size() >= 3: B.poly(q, Color(col.lightened(0.35), 0.45))
		GearCard.fill_rr(B, Rect2(9, 9, w - 18, h - 52), 9, INK)
		B.poly(PackedVector2Array([Vector2(3, h - 44), Vector2(w - 3, h - 48), Vector2(w - 3, h - 12), Vector2(3, h - 9)]), Color(INK, 0.9))
		GearCard.ring_rr(B, rr, 14, 4, INK)
		B.flush(body))
	var pp := "res://assets/ui/art/portrait/" + cid + ".webp"
	if ResourceLoader.exists(pp):
		var img := UIK.round_image(UITex.get_tex(pp), w - 24, h - 66, 7.0, Vector2(0.5, 0.12))
		img.position = Vector2(12, 12)
		body.add_child(img)
	var nm := UIText.new()
	nm.style(false, 1000, 15, 0.6, Color.WHITE, UIK.ink_stroke(1.4, 1.6))
	nm.align = 0.5
	nm.nowrap = true
	nm.wrap_w = w
	nm.size = Vector2(w, 22)
	nm.text = str(C.get("name", cid)).to_upper()
	nm.position = Vector2(0, h - 40)
	body.add_child(nm)
	var guard := 0
	var fs := 15.0
	while nm.text_width() > w - 12 and fs > 10.0 and guard < 8:
		fs -= 1.0
		guard += 1
		nm.style(false, 1000, fs, 0.6, Color.WHITE, UIK.ink_stroke(1.4, 1.6))
	var tag := Node2D.new()
	tag.position = Vector2(6, 6)
	tag.rotation = -0.08
	var tl := UIText.new()
	tl.style(false, 1000, 15, 1.0, YEL, "")
	tl.nowrap = true
	tl.text = "SV " + str(lv)
	tl.position = Vector2(6, 0)
	tl.size = Vector2(60, 20)
	var tw := tl.text_width() + 12.0
	tag.draw.connect(func(): tag.draw_rect(Rect2(0, 0, tw, 20), INK))
	tag.add_child(tl)
	body.add_child(tag)
	return root

## eşya stat satırları: seviye çarpanı eski → yeni
static func gear_stats(x: Dictionary, lv0: int, lv1: int) -> Array:
	var out: Array = []
	var m0: float = D.gearLevelMods(lv0)
	var m1: float = D.gearLevelMods(lv1)
	for k in x.get("mods", {}):
		var def: Dictionary = D.MODS.get(k, {})
		var flat: bool = str(def.get("fmt", "")) == "flat"
		var v0: float = float(x.mods[k]) * m0
		var v1: float = float(x.mods[k]) * m1
		var a := ArmoryPage.fmt_mod(k, roundf(v0) if flat else v0)
		var b := ArmoryPage.fmt_mod(k, roundf(v1) if flat else v1)
		var sa: String = a.val
		var sb: String = b.val
		if sa == sb and str(def.get("fmt", "")) == "pct":
			# tam sayıya yuvarlanınca fark kayboluyorsa bir ondalık
			sa = ("+" if v0 > 0 else "") + str(snappedf(v0 * 100.0, 0.1)) + "%"
			sb = ("+" if v1 > 0 else "") + str(snappedf(v1 * 100.0, 0.1)) + "%"
		elif sa == sb:
			sa = ("+" if v0 > 0 else "") + str(snappedf(v0, 0.1))
			sb = ("+" if v1 > 0 else "") + str(snappedf(v1, 0.1))
		out.append([a.label, sa, sb])
		if out.size() >= 4: break
	return out

## kahraman stat satırları (CAN, HASAR, SALDIRI HIZI)
static func hero_stats(cid: String, lv0: int, lv1: int) -> Array:
	var C: Dictionary = D.CHARACTERS.get(cid, {})
	var M: Dictionary = C.get("mods", {})
	var P: Dictionary = D.PLAYER
	var A: Dictionary = D.charLevelMods(lv0)
	var Bm: Dictionary = D.charLevelMods(lv1)
	var hp0 := (float(P.get("maxHp", 100)) + float(M.get("maxHp", 0))) * float(A.hpMul)
	var hp1 := (float(P.get("maxHp", 100)) + float(M.get("maxHp", 0))) * float(Bm.hpMul)
	var pc := func(v: float) -> String: return ("+" if v >= 0.0 else "") + str(int(round(v * 100.0))) + "%"
	return [
		["CAN", str(int(round(hp0))), str(int(round(hp1)))],
		["HASAR", pc.call(float(M.get("dmgPct", 0)) + float(A.dmgAdd)), pc.call(float(M.get("dmgPct", 0)) + float(Bm.dmgAdd))],
		["SALDIRI HIZI", pc.call(float(M.get("atkPct", 0)) + float(A.atkAdd)), pc.call(float(M.get("atkPct", 0)) + float(Bm.atkAdd))],
	]
