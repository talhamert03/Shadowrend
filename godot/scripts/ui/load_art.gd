class_name LoadArt
extends Node2D
## AÇILIŞ YÜKLEME EKRANI (v4 · Clash Royale giriş düzeni). Yapay zekâ resmi yok: ortada oyuncunun
## bulunduğu dünyanın 3B ARENA DİORAMASI (oyunun kendi zemini/objeleri/düşmanları — tools/diorama.gd)
## dünya renginde gece zemini, dönen soluk ışınlar ve yumuşak hale üstünde süzülür; üstte kırmızı
## patlama üstünde sarı SHADOWREND, altında dünya adı şeridi, dipte ipucu + şeritli yükleme çubuğu.
## Giriş: logo patlar, arena yukarıdan iner ve oturur; sonra hafifçe süzülür.

const INK := Color(0.05, 0.03, 0.07)
const YEL := Color("#ffd23a")
const RED := Color("#e8322c")

var size_l := Vector2(390, 844)
var bottom_pad := 0.0          # güvenli alan (gezinme çubuğu)
var top_pad := 0.0             # güvenli alan (çentik)
var progress := 0.0
var _t := 0.0
var _rays: Node2D
var _logo: Node2D
var _arena: Node2D
var _arena_y := 0.0
var _ribbon: Node2D
var _bar: Node2D
var _pct: UIText
var _lbl: UIText
var _wc := Color("#8a4ae8")
var _pr := Rect2()

## gösterilecek dünya: kayıttaki en ileri açık dünya (ilk açılışta 1)
static func _world_no() -> int:
	var w := 1
	var pr: Dictionary = D.loadProgress()
	for k in range(1, D.WORLDS.size() + 1):
		if D.worldCleared(pr, k): w = k
	return w

## hero / accent: eski arayüzle uyum (kullanılmıyor)
func setup(sz: Vector2, _hero := "", _accent := Color("#ffb070")) -> void:
	size_l = sz
	var w := sz.x
	var h := sz.y
	var wn := _world_no()
	var wd: Dictionary = D.WORLDS[wn - 1] if D.WORLDS.size() >= wn else {}
	_wc = JS.col(wd.get("color", "#8a4ae8")) if wd.has("color") else Color("#8a4ae8")
	# zemin: dünya renginde gece, dipte yarım ton
	var bg := Node2D.new()
	bg.draw.connect(func():
		var top := _wc.darkened(0.6)
		var mid := Color("#1a0c28")
		var bot := Color("#0b0612")
		bg.draw_polygon(PackedVector2Array([Vector2(-20, -400), Vector2(w + 20, -400), Vector2(w + 20, h * 0.55), Vector2(-20, h * 0.55)]), PackedColorArray([top, top, mid, mid]))
		bg.draw_polygon(PackedVector2Array([Vector2(-20, h * 0.55), Vector2(w + 20, h * 0.55), Vector2(w + 20, h + 400), Vector2(-20, h + 400)]), PackedColorArray([mid, mid, bot, bot]))
		ComicSkin.halftone(bg, Rect2(-20, h - 260, w + 40, 260), Color(0, 0, 0, 0.35), 12.0, 15, 3.6))
	add_child(bg)
	var ac := h * 0.47
	_rays = Node2D.new()
	_rays.position = Vector2(w * 0.5, ac)
	_rays.draw.connect(func():
		var B := TriBatch.new()
		for i in 24:
			var a := i * TAU / 24.0
			B._tri(Vector2.ZERO, Vector2(cos(a - 0.065), sin(a - 0.065)) * 1600, Vector2(cos(a + 0.065), sin(a + 0.065)) * 1600, Color(_wc.lightened(0.4), 0.06))
		B.radial(Vector2.ZERO, w * 0.62, Color(_wc, 0.42), Color(_wc, 0.0))
		B.flush(_rays))
	add_child(_rays)
	# ── arena dioraması ──
	_pr = Rect2(14, top_pad + 170.0, w - 28, maxf(240.0, h * 0.62 - top_pad - 170.0))
	_arena = Node2D.new()
	add_child(_arena)
	var tx: Texture2D = load(ArenaArt.path_of(wn))
	if tx:
		var ts := Vector2(tx.get_size())
		var sc := minf(_pr.size.x * 0.98 / ts.x, _pr.size.y * 0.98 / ts.y)
		var dsz := ts * sc
		var shadow := Node2D.new()
		shadow.draw.connect(func():
			var B := TriBatch.new()
			B.radial(Vector2(0, dsz.y * 0.47), dsz.x * 0.52, Color(0, 0, 0, 0.6), Color(0, 0, 0, 0), 0.2)
			B.flush(shadow))
		_arena.add_child(shadow)
		var sp := Sprite2D.new()
		sp.texture = tx
		sp.scale = Vector2.ONE * sc
		_arena.add_child(sp)
		_pr = Rect2(Vector2(w * 0.5, _pr.get_center().y) - dsz * 0.5, dsz)
	_arena_y = _pr.get_center().y
	_arena.position = Vector2(w * 0.5, _arena_y - 260.0)
	# dünya adı şeridi (arenanın altında, eğik siyah bant + sarı yazı)
	_ribbon = Node2D.new()
	_ribbon.position = Vector2(w * 0.5, _pr.end.y + 22.0)
	_ribbon.rotation = -0.02
	var rw := minf(w - 70.0, 300.0)
	_ribbon.draw.connect(func():
		var P := PackedVector2Array([Vector2(-rw * 0.5 - 14, -17), Vector2(rw * 0.5 + 6, -19), Vector2(rw * 0.5 + 14, 17), Vector2(-rw * 0.5 - 6, 19)])
		var B := TriBatch.new()
		var Sh := PackedVector2Array()
		for q in P: Sh.append(q + Vector2(4, 5))
		B.poly(Sh, INK)
		B.poly(P, INK.lerp(_wc, 0.18))
		B.flush(_ribbon))
	var rt := UIText.new()
	rt.style(false, 1000, 22, 1.5, YEL, UIK.ink_stroke(2.0, 2.4))
	rt.align = 0.5
	rt.nowrap = true
	rt.wrap_w = rw
	rt.size = Vector2(rw, 30)
	rt.position = Vector2(-rw * 0.5, -14)
	rt.text = "DÜNYA " + str(wn) + " · " + str(wd.get("name", ""))
	_ribbon.add_child(rt)
	_ribbon.scale = Vector2.ZERO
	add_child(_ribbon)
	# ── logo ──
	_logo = Node2D.new()
	_logo.position = Vector2(w * 0.5, top_pad + 86.0)
	_logo.draw.connect(func(): ScrCeremony._star(_logo, Vector2.ZERO, w * 0.52, w * 0.40, 15, RED, 5.0, 0.0, 0.36))
	add_child(_logo)
	var lt := UIText.new()
	var fs := clampf(w * 0.15, 44.0, 66.0)
	lt.style(false, 1000, fs, 3.0, YEL, UIK.ink_stroke(4.0, 6.0))
	lt.align = 0.5
	lt.nowrap = true
	lt.wrap_w = w
	lt.size = Vector2(w, fs * 1.4)
	lt.position = Vector2(-w * 0.5, -fs * 0.66)
	lt.text = "SHADOWREND"
	_logo.add_child(lt)
	_logo.rotation = -0.04
	_logo.scale = Vector2.ZERO
	# ── çubuk ──
	_bar = Node2D.new()
	_bar.draw.connect(_draw_bar)
	add_child(_bar)
	_lbl = UIText.new()
	_lbl.style(false, 1000, 22, 2.0, Color.WHITE, UIK.ink_stroke(2.0, 2.6))
	_lbl.nowrap = true
	_lbl.size = Vector2(w, 32)
	_lbl.text = "YÜKLENİYOR"
	add_child(_lbl)
	_pct = UIText.new()
	_pct.style(false, 1000, 22, 1.0, YEL, UIK.ink_stroke(2.0, 2.6))
	_pct.align = 1.0
	_pct.nowrap = true
	_pct.wrap_w = w - 60
	_pct.size = Vector2(w - 60, 32)
	_pct.text = "%0"
	add_child(_pct)
	var by := h - bottom_pad - 74.0
	# ipucu kutusu (krem kâğıt, siyah etiket) — panel ile çubuk arasında
	var tipy := (_pr.end.y + 44.0 + by - 36.0) * 0.5 - 28.0
	var tb := Node2D.new()
	tb.position = Vector2(30, tipy)
	tb.rotation = 0.012
	tb.draw.connect(func():
		var r := Rect2(0, 0, w - 60, 56)
		tb.draw_style_box(ComicSkin.sb(INK, 6), Rect2(r.position + Vector2(4, 5), r.size))
		tb.draw_style_box(ComicSkin.sb(Color("#fff3d6"), 6, 3.0), r)
		tb.draw_rect(Rect2(8, 8, 64, 22), INK))
	add_child(tb)
	var tl := UIText.new()
	tl.style(false, 1000, 15, 1.0, YEL, "")
	tl.nowrap = true
	tl.size = Vector2(60, 20)
	tl.position = Vector2(14, 8)
	tl.text = "İPUCU"
	tb.add_child(tl)
	var tt := UIText.new()
	tt.style(false, 800, 12.5, 0.2, Color("#2a1c24"), "")
	tt.nowrap = false
	tt.max_lines = 2
	tt.wrap_w = w - 60 - 96
	tt.size = Vector2(w - 156, 40)
	tt.position = Vector2(84, 9)
	tt.text = ScrGate.TIPS[randi() % ScrGate.TIPS.size()]
	tb.add_child(tt)
	_lbl.position = Vector2(30, by - 36)
	_pct.position = Vector2(30, by - 36)
	_bar.position = Vector2(30, by)

func set_progress(p: float) -> void:
	progress = clampf(p, 0.0, 1.0)
	if _pct: _pct.text = "%" + str(int(round(progress * 100.0)))
	if _bar: _bar.queue_redraw()

func _draw_bar() -> void:
	var bw := size_l.x - 60.0
	var br := Rect2(0, 0, bw, 26)
	_bar.draw_style_box(ComicSkin.sb(INK, 13), Rect2(br.position + Vector2(3, 5), br.size))
	_bar.draw_style_box(ComicSkin.sb(Color("#1d1026"), 13, 4.0), br)
	var fw := (bw - 8) * progress
	if fw > 6.0:
		var fr := Rect2(Vector2(4, 4), Vector2(fw, br.size.y - 8))
		_bar.draw_style_box(ComicSkin.sb(YEL, 9), fr)
		var box := PackedVector2Array([fr.position, Vector2(fr.end.x, fr.position.y), fr.end, Vector2(fr.position.x, fr.end.y)])
		var x := fr.position.x - 22 + fmod(_t * 40.0, 22.0)
		var B := TriBatch.new()
		while x < fr.end.x:
			var q := PackedVector2Array([Vector2(x, fr.end.y), Vector2(x + 10, fr.end.y), Vector2(x + 20, fr.position.y), Vector2(x + 10, fr.position.y)])
			for c in Geometry2D.intersect_polygons(q, box):
				if c.size() >= 3: B.poly(c, Color("#ffb020"))
			x += 22.0
		B.flush(_bar)
		_bar.draw_line(fr.position + Vector2(8, 4), Vector2(fr.end.x - 6, fr.position.y + 4), Color(1, 1, 1, 0.5), 2.5)

func _process(dt: float) -> void:
	_t += dt
	_rays.rotation += dt * 0.12
	# logo patlar, sonra hafif nefes
	var kl := clampf(_t / 0.42, 0, 1)
	_logo.scale = Vector2.ONE * (ScrLevelUp._back_ease(kl) if kl < 1.0 else 1.0 + sin(_t * 2.4) * 0.015)
	# arena yukarıdan iner, oturur, sonra süzülür
	var ka := clampf((_t - 0.12) / 0.55, 0, 1)
	_arena.position.y = lerpf(_arena_y - 260.0, _arena_y, ScrLevelUp._back_ease(ka))
	_arena.modulate.a = minf(1.0, ka * 3.0)
	var kr := clampf((_t - 0.55) / 0.3, 0, 1)
	_ribbon.scale = Vector2.ONE * (ScrLevelUp._back_ease(kr) if kr < 1.0 else 1.0) if kr > 0.0 else Vector2.ZERO
	_bar.queue_redraw()
