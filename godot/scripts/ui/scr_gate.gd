class_name ScrGate
extends Scr
## SAVAŞA GİRİŞ (v3 · Borderlands çizgi roman sayfası). Tam ekran (güvenli alan / ölçek
## kenarları dahil — alttaki arena yanlardan görünmez). Dünya renginde dönen ışınlar + yarım ton;
## üstte mürekkep çerçeveli PANEL içinde dünyanın göğü ve boss adası; panelin köşesinde eğik
## DÜNYA bandı; ortada kırmızı patlama yıldızı üstünde sarı "GÖREV n"; hedef bir konuşma
## balonunda; görev yıldızları; dipte krem İPUCU kutusu + şeritli kalın yükleme çubuğu.
## Akış: panel çarparak iner, başlık patlar, balon fırlar → kararma (COVER) → on_cover (arena
## perde arkasında kurulur) → çubuk BAR sn'de dolar → "SAVAŞ!" patlaması → içerik söner → on_done.

const TIPS := [
	"İmza silahın kahramanınla büyür — kademeler mavi, mor, altın…",
	"Pasif rünler her kahramanda işler: can, hız, saldırı hızı.",
	"Boss dalgalarında sandık zarı üst kademelere kayar.",
	"Canını yarının üstünde tutarsan görev yıldızı kazanırsın.",
	"İki saha sandığı açmak görevin üçüncü yıldızını verir.",
	"Elit düşmanın adı değiştiricisini söyler: kalkanlı, bölünen, patlayan…",
]
const STEPS := ["ARENA KURULUYOR", "DÜŞMANLAR UYANIYOR", "RÜNLER HAZIRLANIYOR", "KAPI AÇILIYOR"]
const COVER := 0.72
const BAR := 2.0
const OPEN := 0.75
const INK := Color(0.05, 0.03, 0.07)
const YEL := Color("#ffd23a")
const PAPER := Color("#fff3d6")

var on_cover: Callable
var on_done: Callable
var wc := Color("#b06a49")
var _t := 0.0
var _covered := false
var _finished := false
var _doneAt := -1.0
var _p := 0.0
var _lastPct := -1
var _lastStep := -1
var _stars := -1

var _W := Vector2(390, 844)
var _SR := Rect2()           # tüm ekran (yerel)
var _root: Node2D            # içerik (açılışta söner)
var _rays: Node2D
var _panel: Node2D           # mürekkep çerçeveli dünya paneli
var _panel_r := Rect2()
var _isle: Node2D
var _title: Node2D           # yıldız + GÖREV yazısı
var _bubble: Node2D
var _bar: Node2D
var _fx: Node2D
var _txt := {}
var _obj := ""

func _init(game) -> void:
	super(game)
	name = "Gate"
	z_index = 60                 # HUD ve dalga bandı bu ekranın altında

func play(info: Dictionary, cover: Callable, done: Callable) -> void:
	for c in get_children():
		if not (c is Scr._Ticker): c.queue_free()
	_txt.clear()
	on_cover = cover
	on_done = done
	wc = JS.col(info.get("wc", "#b06a49"))
	_W = UIK.ui_size(get_viewport())
	_stars = int(info.get("stars", -1))
	_t = 0.0
	_covered = false
	_finished = false
	_doneAt = -1.0
	_lastPct = -1
	_lastStep = -1
	_p = 0.0
	position = Vector2.ZERO
	scale = Vector2.ONE
	visible = true
	_build(info)
	modulate.a = 0.0
	g.audio.play("gateclose")
	_step_anim()

func _build(info: Dictionary) -> void:
	var W := _W
	_SR = UIK.screen_rect(self)
	# zemin: TÜM ekran — dünya renginin koyusu
	var base := ColorRect.new()
	base.color = wc.darkened(0.78)
	base.position = _SR.position
	base.size = _SR.size
	base.mouse_filter = Control.MOUSE_FILTER_STOP
	add_child(base)
	_root = Node2D.new()
	add_child(_root)
	_rays = Node2D.new()
	_rays.position = Vector2(W.x * 0.5, W.y * 0.55)
	_rays.draw.connect(_draw_rays)
	_root.add_child(_rays)
	var dots := Node2D.new()
	dots.draw.connect(func(): _draw_dots(dots))
	_root.add_child(dots)
	# ── dünya paneli ──
	var wn := clampi(int(info.get("worldNo", 1)), 1, 10)
	_panel_r = Rect2(22, 60, W.x - 44, W.y * 0.36)
	_panel = Node2D.new()
	_panel.position = _panel_r.position + _panel_r.size * 0.5
	_root.add_child(_panel)
	var pr := Rect2(-_panel_r.size * 0.5, _panel_r.size)
	var under := Node2D.new()
	under.draw.connect(func():
		var sb := StyleBoxFlat.new()
		sb.bg_color = INK
		sb.set_corner_radius_all(6)
		under.draw_style_box(sb, Rect2(pr.position + Vector2(6, 8), pr.size))
		var bb := StyleBoxFlat.new()
		bb.bg_color = wc.darkened(0.5)
		bb.set_corner_radius_all(6)
		under.draw_style_box(bb, pr))
	_panel.add_child(under)
	var clip := Control.new()
	clip.clip_contents = true
	clip.position = pr.position + Vector2(5, 5)
	clip.size = pr.size - Vector2(10, 10)
	clip.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_panel.add_child(clip)
	# panel içi: dünya renginde gece zemini, hale + yarım ton, ortada arena
	var pfx := Node2D.new()
	var csz := clip.size
	pfx.draw.connect(func():
		var top := wc.darkened(0.55)
		var bot := Color("#0d0816")
		pfx.draw_polygon(PackedVector2Array([Vector2.ZERO, Vector2(csz.x, 0), csz, Vector2(0, csz.y)]), PackedColorArray([top, top, bot, bot]))
		var c := Vector2(csz.x * 0.5, csz.y * 0.48)
		var B := TriBatch.new()
		B.radial(c, csz.x * 0.55, Color(wc, 0.4), Color(wc, 0.0))
		for yy in 9:
			for xx in int(csz.x / 9) + 1:
				B.circle(Vector2(xx * 9.0 + (4.5 if yy % 2 else 0.0), csz.y - 6 - yy * 8.0), 2.6 - yy * 0.28, Color(INK, 0.35), 6)
		B.flush(pfx))
	clip.add_child(pfx)
	_isle = Node2D.new()
	var at: Texture2D = UITex.get_tex(ArenaArt.path_of(wn))
	if at:
		var ts := Vector2(at.get_size())
		var isc := minf(csz.x * 0.94 / ts.x, csz.y * 0.86 / ts.y)
		var shd := Node2D.new()
		shd.draw.connect(func():
			var B2 := TriBatch.new()
			B2.radial(Vector2(0, ts.y * isc * 0.5), ts.x * isc * 0.34, Color(0, 0, 0, 0.42), Color(0, 0, 0, 0), 0.2)
			B2.flush(shd))
		_isle.add_child(shd)
		var sp := Sprite2D.new()
		sp.texture = at
		sp.scale = Vector2.ONE * isc
		_isle.add_child(sp)
	_isle.position = Vector2(csz.x * 0.5, csz.y * 0.47)
	clip.add_child(_isle)
	var frame := Node2D.new()
	frame.draw.connect(func():
		var o := StyleBoxFlat.new()
		o.bg_color = Color(0, 0, 0, 0)
		o.set_corner_radius_all(6)
		o.set_border_width_all(6)
		o.border_color = INK
		frame.draw_style_box(o, pr))
	_panel.add_child(frame)
	# köşe bandı: DÜNYA n · AD
	var side := str(info.get("side", ""))
	var eyebrow := side if side != "" else ("DÜNYA " + str(wn) + " · " + str(info.get("world", "")))
	var band := Node2D.new()
	band.position = pr.position + Vector2(-8, -14)
	band.rotation = -0.05
	var bt := UIText.new()
	bt.style(false, 1000, 19, 1.4, YEL, "")
	bt.nowrap = true
	bt.text = eyebrow
	bt.position = Vector2(12, 3)
	bt.size = Vector2(W.x, 28)
	var bw := bt.text_width() + 24.0
	band.draw.connect(func():
		band.draw_rect(Rect2(4, 5, bw, 30), Color(0, 0, 0, 0.5))
		band.draw_rect(Rect2(0, 0, bw, 30), INK))
	band.add_child(bt)
	_panel.add_child(band)
	# ── başlık: kırmızı patlama + sarı GÖREV ──
	_title = Node2D.new()
	_title.position = Vector2(W.x * 0.5, _panel_r.end.y + 66)
	_title.draw.connect(func(): ScrCeremony._star(_title, Vector2.ZERO, 150, 112, 13, Color("#e8322c"), 5.0, 0.0, 0.42))
	_root.add_child(_title)
	var tt := UIText.new()
	tt.style(false, 1000, 62, 2.0, YEL, UIK.ink_stroke(4.0, 5.0))
	tt.align = 0.5
	tt.nowrap = true
	tt.wrap_w = W.x
	tt.size = Vector2(W.x, 80)
	tt.position = Vector2(-W.x * 0.5, -40)
	tt.text = str(info.get("mission", "SAVAŞ"))
	_title.add_child(tt)
	# ── hedef balonu ──
	_obj = str(info.get("obj", "")) if info.get("obj") != null else ""
	_bubble = Node2D.new()
	_bubble.position = Vector2(W.x * 0.5, _title.position.y + 92)
	_root.add_child(_bubble)
	if _obj != "":
		var ot := UIText.new()
		ot.style(false, 1000, 21, 1.0, INK, "")
		ot.align = 0.5
		ot.nowrap = true
		ot.wrap_w = W.x - 60
		ot.size = Vector2(W.x - 60, 30)
		ot.position = Vector2(-(W.x - 60) * 0.5, -15)
		ot.text = _obj.to_upper() + "!"
		var ow := minf(W.x - 50, ot.text_width() + 44)
		_bubble.draw.connect(func(): _draw_bubble(_bubble, ow))
		_bubble.add_child(ot)
	var st := Node2D.new()
	st.position = Vector2(W.x * 0.5, _bubble.position.y + 58)
	st.draw.connect(func():
		if _stars < 0: return
		for i in 3:
			var on := i < _stars
			ScrCeremony._star(st, Vector2((i - 1) * 40.0, -4.0 if i == 1 else 0.0), 16, 7.5, 5, YEL if on else Color("#4a4252"), 2.5))
	_bubble.add_child(st)
	st.position -= _bubble.position
	# ── ipucu kutusu + çubuk ──
	_bar = Node2D.new()
	_bar.draw.connect(_draw_bar)
	_root.add_child(_bar)
	var tip := UIText.new()
	tip.style(false, 800, 12.5, 0.2, Color("#2a1c24"), "")
	tip.nowrap = false
	tip.max_lines = 2
	tip.wrap_w = W.x - 64 - 70
	tip.size = Vector2(W.x - 134, 36)
	tip.text = TIPS[randi() % TIPS.size()]
	tip.position = Vector2(32 + 70, W.y - 150)
	_root.add_child(tip)
	_txt.tip = tip
	var tl := UIText.new()
	tl.style(false, 1000, 15, 1.0, YEL, "")
	tl.nowrap = true
	tl.text = "İPUCU"
	tl.position = Vector2(38, W.y - 151)
	tl.size = Vector2(60, 22)
	_root.add_child(tl)
	var step := UIText.new()
	step.style(false, 1000, 16, 1.2, Color.WHITE, UIK.ink_stroke(1.8, 2.0))
	step.nowrap = true
	step.text = STEPS[0]
	step.position = Vector2(28, W.y - 92)
	step.size = Vector2(W.x, 24)
	_root.add_child(step)
	_txt.step = step
	var pct := UIText.new()
	pct.style(false, 1000, 18, 1.0, YEL, UIK.ink_stroke(1.8, 2.0))
	pct.align = 1.0
	pct.nowrap = true
	pct.wrap_w = W.x - 56
	pct.size = Vector2(W.x - 56, 26)
	pct.position = Vector2(28, W.y - 94)
	pct.text = "%0"
	_root.add_child(pct)
	_txt.pct = pct
	_fx = Node2D.new()
	_fx.draw.connect(_draw_fx)
	add_child(_fx)

func _draw_rays() -> void:
	var R := maxf(_SR.size.x, _SR.size.y) * 1.2
	var B := TriBatch.new()
	for i in 22:
		var a := i * TAU / 22.0
		B._tri(Vector2.ZERO, Vector2(cos(a - 0.07), sin(a - 0.07)) * R, Vector2(cos(a + 0.07), sin(a + 0.07)) * R, Color(wc.lightened(0.2), 0.10))
	B.flush(_rays)

func _draw_dots(n: Node2D) -> void:
	# alt yarıda büyüyen yarım ton (tam ekran genişliğinde)
	var x0 := _SR.position.x
	var x1 := _SR.end.x
	var y1 := _SR.end.y
	var B := TriBatch.new()
	for yy in 18:
		var y := y1 - 8 - yy * 13.0
		var r := 3.6 - yy * 0.19
		if r <= 0.4: break
		var x := x0 + (6.5 if yy % 2 else 0.0)
		while x < x1:
			B.circle(Vector2(x, y), r, Color(0, 0, 0, 0.32), 8)
			x += 13.0
	B.flush(n)

func _draw_bubble(n: Node2D, w: float) -> void:
	var r := Rect2(-w * 0.5, -24, w, 48)
	var tail := PackedVector2Array([Vector2(-26, -20), Vector2(-4, -20), Vector2(-30, -46)])
	var sh := StyleBoxFlat.new()
	sh.bg_color = INK
	sh.set_corner_radius_all(24)
	n.draw_style_box(sh, Rect2(r.position + Vector2(4, 6), r.size))
	n.draw_colored_polygon(PackedVector2Array([tail[0] + Vector2(-5, 2), tail[1] + Vector2(5, 2), tail[2] + Vector2(-3, -6)]), INK)
	var b := StyleBoxFlat.new()
	b.bg_color = Color.WHITE
	b.set_corner_radius_all(24)
	b.set_border_width_all(4)
	b.border_color = INK
	n.draw_style_box(b, r)
	n.draw_colored_polygon(tail, Color.WHITE)
	n.draw_line(Vector2(-w * 0.5 + 22, -14), Vector2(w * 0.1, -14), Color(0.85, 0.85, 0.9), 3.0)

func _draw_bar() -> void:
	var W := _W
	# İPUCU kutusu (krem kâğıt, mürekkep konturlu, siyah etiket)
	var tr := Rect2(24, W.y - 160, W.x - 48, 46)
	var sh := StyleBoxFlat.new()
	sh.bg_color = INK
	sh.set_corner_radius_all(6)
	_bar.draw_style_box(sh, Rect2(tr.position + Vector2(4, 5), tr.size))
	var pb := StyleBoxFlat.new()
	pb.bg_color = PAPER
	pb.set_corner_radius_all(6)
	pb.set_border_width_all(3)
	pb.border_color = INK
	_bar.draw_style_box(pb, tr)
	_bar.draw_rect(Rect2(tr.position.x + 6, tr.position.y + 6, 62, 22), INK)
	# yükleme çubuğu: kalın, şeritli
	var br := Rect2(24, W.y - 64, W.x - 48, 26)
	_bar.draw_style_box(_sb(INK, 13), Rect2(br.position + Vector2(3, 5), br.size))
	_bar.draw_style_box(_sb(Color("#1d1624"), 13, 4, INK), br)
	var fw := (br.size.x - 8) * _p
	if fw > 6.0:
		var fr := Rect2(br.position + Vector2(4, 4), Vector2(fw, br.size.y - 8))
		_bar.draw_style_box(_sb(YEL, 9), fr)
		# hareketli eğik şeritler (dolumun içine kırpılı)
		var box := PackedVector2Array([fr.position, Vector2(fr.end.x, fr.position.y), fr.end, Vector2(fr.position.x, fr.end.y)])
		var off := fmod(_t * 40.0, 22.0)
		var x := fr.position.x - 22 + off
		var B := TriBatch.new()
		while x < fr.end.x:
			var q := PackedVector2Array([Vector2(x, fr.end.y), Vector2(x + 10, fr.end.y), Vector2(x + 20, fr.position.y), Vector2(x + 10, fr.position.y)])
			for c in Geometry2D.intersect_polygons(q, box):
				if c.size() >= 3: B.poly(c, Color("#ffb020"))
			x += 22.0
		B.flush(_bar)
		_bar.draw_line(fr.position + Vector2(8, 4), Vector2(fr.end.x - 6, fr.position.y + 4), Color(1, 1, 1, 0.5), 2.5)

static func _sb(c: Color, r: int, bw := 0, bc := Color.BLACK) -> StyleBoxFlat:
	var s := StyleBoxFlat.new()
	s.bg_color = c
	s.set_corner_radius_all(r)
	if bw > 0:
		s.set_border_width_all(bw)
		s.border_color = bc
	return s

func _draw_fx() -> void:
	if _doneAt < 0: return
	# "SAVAŞ!" patlaması
	var k := clampf((_t - _doneAt) / 0.4, 0, 1)
	var s := ScrLevelUp._back_ease(k) if k < 1.0 else 1.0
	var c := Vector2(_W.x * 0.5, _W.y * 0.5)
	ScrCeremony._star(_fx, c, 230 * s, 150 * s, 16, YEL, 6.0, 0.1)
	ScrCeremony._star(_fx, c, 150 * s, 100 * s, 16, Color.WHITE, 0.0, 0.25)

func _progress(pc: float) -> void:
	_p = pc / 100.0
	var pi := int(round(pc))
	if pi != _lastPct:
		_lastPct = pi
		(_txt.pct as UIText).text = "%" + str(pi)
	var si := 0 if pc < 34 else (1 if pc < 68 else (2 if pc < 99 else 3))
	if si != _lastStep:
		_lastStep = si
		(_txt.step as UIText).text = STEPS[si]

## giriş animasyonları: panel çarparak iner, başlık patlar, balon fırlar
func _step_anim() -> void:
	var kp := clampf(_t / 0.38, 0, 1)
	_panel.scale = Vector2.ONE * lerpf(1.35, 1.0, ScrLevelUp._back_ease(kp) if kp < 1.0 else 1.0) if kp < 1.0 else Vector2.ONE
	_panel.rotation = lerpf(-0.12, -0.015, minf(1.0, kp))
	_panel.modulate.a = minf(1.0, kp * 2.5)
	var kt := clampf((_t - 0.22) / 0.32, 0, 1)
	_title.scale = Vector2.ONE * (ScrLevelUp._back_ease(kt) if kt < 1.0 else 1.0 + sin(_t * 3.0) * 0.02) if kt > 0.0 else Vector2.ZERO
	_title.rotation = -0.05
	var kb := clampf((_t - 0.4) / 0.3, 0, 1)
	_bubble.scale = Vector2.ONE * (ScrLevelUp._back_ease(kb) if kb < 1.0 else 1.0) if kb > 0.0 else Vector2.ZERO
	_bubble.rotation = 0.02
	if _isle: _isle.position.y = (_panel_r.size.y - 10) * 0.47 + sin(_t * 1.6) * 4.0

func _process(dt: float) -> void:
	if not visible or _root == null: return
	_t += dt
	_rays.rotation += dt * 0.15
	_step_anim()
	_bar.queue_redraw()
	if _doneAt >= 0:
		var ko := clampf((_t - _doneAt) / OPEN, 0.0, 1.0)
		_fx.queue_redraw()
		# patlama 0,3 sn sonra her şey söner, savaş belirir
		var e := clampf((_t - _doneAt - 0.3) / (OPEN - 0.3), 0.0, 1.0)
		modulate.a = 1.0 - e * e
		_root.scale = Vector2.ONE * (1.0 + 0.1 * e)
		_root.position = -_W * 0.5 * 0.1 * e
		if ko >= 1.0:
			visible = false
			for c in get_children():
				if not (c is Scr._Ticker): c.queue_free()
			_root = null
			if on_done.is_valid(): on_done.call()
		return
	modulate.a = clampf(_t / 0.2, 0.0, 1.0)
	if not _covered and _t >= COVER:
		_covered = true
		pass  # titreşim kapalı
		if on_cover.is_valid(): on_cover.call()
	var k := clampf((_t - COVER + 0.12) / BAR, 0.0, 1.0)
	var eb := k * 1.18 if k < 0.7 else 0.826 + (k - 0.7) * 0.58
	_progress(minf(1.0, eb) * 100.0)
	if k >= 1.0 and not _finished:
		_finished = true
		_progress(100.0)
		g.audio.play("start")
		pass  # titreşim kapalı
		_doneAt = _t
