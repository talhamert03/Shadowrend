class_name LoadArt
extends Node2D
## AÇILIŞ YÜKLEME EKRANI (v3 · çizgi roman KAPAK SAYFASI). Yapay zekâ resmi yok — oyunun kendi
## çizimleriyle kurulan bir kapak: dönen ışın patlaması + yarım ton zemin, üstte kırmızı
## patlama üstünde sarı SHADOWREND yazısı, ortada mürekkep çerçeveli eğik PANEL içinde rastgele
## bir dünyanın göğü ve süzülen adaları (menü haritasıyla aynı çizim), panelin kenarlarından
## taşan silah / sandık / gem çizimleri (kapak kolajı), dipte şeritli kalın yükleme çubuğu.
## Giriş: logo patlar, panel çarpar, eşyalar sırayla fırlar; sonra her şey hafifçe canlı kalır.

const INK := Color(0.05, 0.03, 0.07)
const YEL := Color("#ffd23a")
const RED := Color("#e8322c")
const ITEMS := [
	["res://assets/ui/art/gear/w_ef_kilic.png", Vector2(0.88, 0.04), 0.55, 128.0],
	["res://assets/ui/art/gear/w_ep_asa.png", Vector2(0.04, 0.36), -0.3, 118.0],
	["res://assets/ui/art/chest/t5.png", Vector2(0.10, 0.97), -0.12, 120.0],
	["res://assets/fx/currency/gem.png", Vector2(0.93, 0.90), 0.2, 72.0],
	["res://assets/ui/art/gear/w_ef_balta.png", Vector2(0.96, 0.48), 0.4, 96.0],
]

var size_l := Vector2(390, 844)
var bottom_pad := 0.0          # güvenli alan (gezinme çubuğu)
var top_pad := 0.0             # güvenli alan (çentik)
var progress := 0.0
var _t := 0.0
var _rays: Node2D
var _logo: Node2D
var _panel: Node2D
var _isles: Array = []         # [node, y0, ph]
var _items: Array = []         # [node, delay, rot0, ph]
var _bar: Node2D
var _pct: UIText
var _lbl: UIText
var _wc := Color("#8a4ae8")
var _pr := Rect2()

## hero / accent: eski arayüzle uyum (kullanılmıyor)
func setup(sz: Vector2, _hero := "", _accent := Color("#ffb070")) -> void:
	size_l = sz
	var w := sz.x
	var h := sz.y
	var wn := 1 + randi() % 10
	var wd: Dictionary = D.WORLDS[wn - 1] if D.WORLDS.size() >= wn else {}
	_wc = JS.col(wd.get("color", "#8a4ae8")) if wd.has("color") else Color("#8a4ae8")
	# zemin
	var bg := Node2D.new()
	bg.draw.connect(func():
		var top := Color("#2c1244")
		var bot := Color("#0d0617")
		bg.draw_polygon(PackedVector2Array([Vector2(-20, -400), Vector2(w + 20, -400), Vector2(w + 20, h + 400), Vector2(-20, h + 400)]), PackedColorArray([top, top, bot, bot]))
		ComicSkin.halftone(bg, Rect2(-20, h - 260, w + 40, 260), Color(0, 0, 0, 0.35), 12.0, 15, 3.6))
	add_child(bg)
	_rays = Node2D.new()
	_rays.position = Vector2(w * 0.5, h * 0.44)
	_rays.draw.connect(func():
		for i in 24:
			var a := i * TAU / 24.0
			_rays.draw_colored_polygon(PackedVector2Array([Vector2.ZERO, Vector2(cos(a - 0.065), sin(a - 0.065)) * 1600, Vector2(cos(a + 0.065), sin(a + 0.065)) * 1600]), Color(1, 0.8, 0.95, 0.05)))
	add_child(_rays)
	# ── dünya paneli ──
	var py := top_pad + 168.0
	_pr = Rect2(28, py, w - 56, maxf(260.0, h * 0.68 - py))
	_panel = Node2D.new()
	_panel.position = _pr.get_center()
	add_child(_panel)
	var pr := Rect2(-_pr.size * 0.5, _pr.size)
	var under := Node2D.new()
	under.draw.connect(func():
		under.draw_style_box(ComicSkin.sb(INK, 8), Rect2(pr.position + Vector2(8, 10), pr.size))
		under.draw_style_box(ComicSkin.sb(_wc.darkened(0.55), 8), pr))
	_panel.add_child(under)
	var clip := Control.new()
	clip.clip_contents = true
	clip.position = pr.position + Vector2(5, 5)
	clip.size = pr.size - Vector2(10, 10)
	clip.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_panel.add_child(clip)
	var base := ClimbArt.BASE + "w" + str(wn) + "/"
	var sky := UITex.get_tex(base + "tall_back.png")
	if sky:
		var sk := Sprite2D.new()
		sk.texture = sky
		sk.centered = false
		var sc := maxf(clip.size.x / sky.get_width(), clip.size.y / (sky.get_height() * 0.62))
		sk.scale = Vector2.ONE * sc
		sk.position = Vector2((clip.size.x - sky.get_width() * sc) * 0.5, 0)
		clip.add_child(sk)
	var pfx := Node2D.new()
	pfx.draw.connect(func():
		var c := Vector2(clip.size.x * 0.5, clip.size.y * 0.5)
		for i in 20:
			var a := i * TAU / 20.0
			pfx.draw_colored_polygon(PackedVector2Array([c, c + Vector2(cos(a - 0.05), sin(a - 0.05)) * 900, c + Vector2(cos(a + 0.05), sin(a + 0.05)) * 900]), Color(1, 1, 1, 0.045)))
	clip.add_child(pfx)
	var M: Dictionary = ClimbArt.meta()
	var R0: float = float(M.get("R0", 90))
	var dpr: float = float(M.get("dpr", 2))
	var slots: Dictionary = M.get("worlds", {}).get(str(wn), {}).get("slots", {})
	for spec in [["i3", 0.11, Vector2(0.22, 0.80)], ["i6", 0.10, Vector2(0.80, 0.26)], ["b3", 0.14, Vector2(0.78, 0.84)], ["b9", 0.26, Vector2(0.48, 0.50)]]:
		var isl := _island(base, slots.get(spec[0], {}), String(spec[0]), clip.size.x * float(spec[1]) / R0 / dpr)
		if isl == null: continue
		isl.position = clip.size * (spec[2] as Vector2)
		clip.add_child(isl)
		_isles.append([isl, isl.position.y, randf() * TAU])
	var hp := Node2D.new()
	hp.draw.connect(func():
		var r := Rect2(Vector2.ZERO, clip.size)
		ComicSkin.halftone(hp, Rect2(0, r.size.y - 70, r.size.x, 70), Color(INK, 0.4), 9.0, 7, 2.8))
	clip.add_child(hp)
	var frame := Node2D.new()
	frame.draw.connect(func():
		frame.draw_style_box(ComicSkin.sb(Color(0, 0, 0, 0), 8, 6.0), pr)
		frame.draw_style_box(ComicSkin.sb(Color(0, 0, 0, 0), 5, 2.0, Color(YEL, 0.55)), pr.grow(-9)))
	_panel.add_child(frame)
	# taşan kolaj eşyaları
	for i in ITEMS.size():
		var it: Array = ITEMS[i]
		var tx: Texture2D = UITex.get_tex(String(it[0]))
		if tx == null: continue
		var holder := Node2D.new()
		var sp := Sprite2D.new()
		sp.texture = tx
		sp.scale = Vector2.ONE * (float(it[3]) / maxf(tx.get_width(), tx.get_height()))
		var shd := Sprite2D.new()
		shd.texture = tx
		shd.scale = sp.scale
		shd.position = Vector2(5, 7)
		shd.modulate = Color(0, 0, 0, 0.45)
		holder.add_child(shd)
		holder.add_child(sp)
		var a: Vector2 = it[1]
		holder.position = _pr.position + _pr.size * a
		holder.rotation = float(it[2])
		holder.scale = Vector2.ZERO
		add_child(holder)
		_items.append([holder, 0.45 + i * 0.09, float(it[2]), randf() * TAU, holder.position])
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
	var tipy := (_pr.end.y + by - 36.0) * 0.5 - 10.0
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

func _island(base: String, slot: Dictionary, key: String, isc: float) -> Node2D:
	if slot.is_empty(): return null
	var n := Node2D.new()
	for part in [["body", "_b"], ["top", "_s"]]:
		var mm = slot.get(part[0])
		var tx := UITex.get_tex(base + key + part[1] + ".png")
		if mm is Dictionary and tx:
			var sp := Sprite2D.new()
			sp.texture = tx
			sp.centered = false
			sp.scale = Vector2(float(mm.w) / tx.get_width(), float(mm.h) / tx.get_height()) * isc
			sp.position = -Vector2(float(mm.ax), float(mm.ay)) * isc
			n.add_child(sp)
	return n

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
		while x < fr.end.x:
			var q := PackedVector2Array([Vector2(x, fr.end.y), Vector2(x + 10, fr.end.y), Vector2(x + 20, fr.position.y), Vector2(x + 10, fr.position.y)])
			for c in Geometry2D.intersect_polygons(q, box):
				if c.size() >= 3: _bar.draw_colored_polygon(c, Color("#ffb020"))
			x += 22.0
		_bar.draw_line(fr.position + Vector2(8, 4), Vector2(fr.end.x - 6, fr.position.y + 4), Color(1, 1, 1, 0.5), 2.5)

func _process(dt: float) -> void:
	_t += dt
	_rays.rotation += dt * 0.12
	# logo patlar, sonra hafif nefes
	var kl := clampf(_t / 0.42, 0, 1)
	_logo.scale = Vector2.ONE * (ScrLevelUp._back_ease(kl) if kl < 1.0 else 1.0 + sin(_t * 2.4) * 0.015)
	# panel çarpar
	var kp := clampf((_t - 0.15) / 0.4, 0, 1)
	_panel.scale = Vector2.ONE * (lerpf(1.3, 1.0, ScrLevelUp._back_ease(kp)) if kp < 1.0 else 1.0)
	_panel.rotation = lerpf(-0.14, -0.025, kp)
	_panel.modulate.a = minf(1.0, kp * 2.5)
	for I in _isles:
		(I[0] as Node2D).position.y = float(I[1]) + sin(_t * 1.3 + float(I[2])) * 4.0
	for it in _items:
		var k := clampf((_t - float(it[1])) / 0.35, 0, 1)
		var nd: Node2D = it[0]
		nd.scale = Vector2.ONE * (ScrLevelUp._back_ease(k) if k < 1.0 else 1.0) if k > 0.0 else Vector2.ZERO
		nd.rotation = float(it[2]) + sin(_t * 1.6 + float(it[3])) * 0.06
		nd.position = (it[4] as Vector2) + Vector2(0, sin(_t * 1.9 + float(it[3])) * 5.0)
	_bar.queue_redraw()
