class_name ComicOverlay
extends Scr
## Karanlık çizgi roman tam ekran katman tabanı (SAVAŞ BİLETİ · etkinlik ekranları):
## kızıl→siyah zemin, yarım ton, yavaş dönen ışınlar, süzülen közler; sabit başlık (kırmızı
## yıldız başlık + X + cüzdan çipleri), altında elle kaydırılan içerik (savurma + kenar yayı).
## Yerel düğmeler yaylı basılır; ödülde kıvılcım, halka, "ALINDI!" damgası, cüzdana para uçuşu.
## Alt sınıf: _title(), _build_content(y0) -> içerik altı, isteğe bağlı _tick(dt), _foot_h().

const INK := Color(0.05, 0.03, 0.07)
const YEL := Color("#ffd23a")
const PAPER := Color("#fff3d6")
const GREEN := Color("#4cbf5e")
const RED := Color("#e8322c")
const CRIM := Color("#8e1420")
const GOLD := Color("#ffb020")
const CARD := Color("#2a1418")
const CARD2 := Color("#3a1a20")
const HEAD := 112.0

var _W := Vector2(390, 844)
var _SR := Rect2()
var _t := 0.0
var _bg: Node2D
var _head: Node2D
var _qclip: Control
var _content: Node2D
var _fx: Node2D
var _scroll := 0.0
var _scroll_max := 0.0
var _vel := 0.0
var _qbtns: Array = []        # [{node, rect, cb}]
var _qpress = null
var _pid := -1
var _p0 := Vector2.ZERO
var _last := Vector2.ZERO
var _dragging := false
var _qsprings := {}           # düğüm → [ölçek, hız, hedef]
var _parts: Array = []
var _rings: Array = []
var _stamps: Array = []       # [düğüm, t0, yazı]
var _anim_in := {}            # düğüm → t0
var _live: Array = []         # her kare yeniden çizilen / canlanan düğümler
var _embers: Array = []
var _gold_v := 0.0
var _gem_v := 0.0
var _gold_l: UIText
var _gem_l: UIText
var _gold_ic := Vector2.ZERO
var _gem_ic := Vector2.ZERO
var _bump := {}

# ═════════════ alt sınıf kancaları ═════════════

func _title() -> String: return ""
func _build_content(y: float) -> float: return y
func _tick(_dt: float) -> void: pass
func _foot_h() -> float: return 0.0
func _build_foot() -> void: pass
func _on_closed() -> void: pass

# ═════════════ aç / kur ═════════════

func open_overlay() -> void:
	visible = true
	cancel_fade()
	position = Vector2.ZERO
	scale = Vector2.ONE
	g.ui.menu.visible = false
	g.audio.play("panel")
	_gold_v = g.read_rubies()
	_gem_v = g.read_stones()
	_scroll = 0.0
	_vel = 0.0
	_t = 0.0
	_build()
	fade_show()

func _build() -> void:
	for c in get_children():
		if not (c is Scr._Ticker): c.queue_free()
	_qbtns.clear()
	_qsprings.clear()
	_anim_in.clear()
	_live.clear()
	_stamps.clear()
	_W = UIK.ui_size(get_viewport())
	_SR = UIK.screen_rect(self)
	_bg = Node2D.new()
	_bg.draw.connect(_draw_bg)
	add_child(_bg)
	var rays := Node2D.new()
	rays.position = Vector2(_W.x * 0.5, _W.y * 0.36)
	rays.draw.connect(func():
		var V := PackedVector2Array()
		for i in 18:
			var a := i * TAU / 18.0
			V.append(Vector2.ZERO)
			V.append(Vector2(cos(a - 0.08), sin(a - 0.08)) * 1400)
			V.append(Vector2(cos(a + 0.08), sin(a + 0.08)) * 1400)
		ComicSkin.draw_tris(rays, V, Color(1, 0.3, 0.25, 0.045)))
	add_child(rays)
	var tw := rays.create_tween().set_loops()
	tw.tween_property(rays, "rotation", TAU, 90.0).from(0.0)
	_embers.clear()
	for i in 26:
		_embers.append([Vector2(randf() * _W.x, randf() * _W.y), randf_range(14, 40), randf_range(1.2, 3.2), randf() * TAU])
	var em := Node2D.new()
	em.draw.connect(func():
		for e in _embers:
			var p: Vector2 = e[0]
			var a := 0.35 + 0.35 * sin(_t * 2.0 + float(e[3]))
			em.draw_circle(p, float(e[2]) * 2.2, Color(1, 0.25, 0.1, a * 0.18))
			em.draw_circle(p, float(e[2]), Color(1, 0.55, 0.25, a)))
	add_child(em)
	_live.append(em)
	_qclip = Control.new()
	_qclip.clip_contents = true
	_qclip.position = Vector2(0, HEAD)
	_qclip.size = Vector2(_W.x, _W.y - HEAD - _foot_h())
	_qclip.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(_qclip)
	_content = Node2D.new()
	_qclip.add_child(_content)
	_layout_content()
	_build_foot()
	_head = Node2D.new()
	add_child(_head)
	_build_head()
	_fx = Node2D.new()
	_fx.draw.connect(_draw_fx)
	add_child(_fx)

func _layout_content() -> void:
	var y := _build_content(14.0)
	_scroll_max = maxf(0.0, y + 30 - _qclip.size.y)
	_scroll = clampf(_scroll, 0.0, _scroll_max)

func _draw_bg() -> void:
	var r := _SR
	var top := Color("#3c0c14")
	var mid := Color("#1a070b")
	var bot := Color("#070305")
	var m := Vector2(r.position.x, r.position.y + r.size.y * 0.45)
	_bg.draw_polygon(PackedVector2Array([r.position, Vector2(r.end.x, r.position.y), Vector2(r.end.x, m.y), m]), PackedColorArray([top, top, mid, mid]))
	_bg.draw_polygon(PackedVector2Array([m, Vector2(r.end.x, m.y), r.end, Vector2(r.position.x, r.end.y)]), PackedColorArray([mid, mid, bot, bot]))
	ComicSkin.halftone(_bg, Rect2(r.position.x, r.end.y - 320, r.size.x, 320), Color(0.7, 0.05, 0.08, 0.16), 12.0, 16, 3.4)

# ═════════════ sabit başlık ═════════════

func _build_head() -> void:
	var bar := Node2D.new()
	bar.draw.connect(func():
		bar.draw_rect(Rect2(_SR.position.x, _SR.position.y, _SR.size.x, HEAD - _SR.position.y), Color("#14060a"))
		ComicSkin.halftone(bar, Rect2(_SR.position.x, 0, _SR.size.x, HEAD), Color(0.6, 0.04, 0.08, 0.28), 7.0, 8, 2.0)
		bar.draw_rect(Rect2(_SR.position.x, HEAD - 7, _SR.size.x, 3), Color(RED, 0.9))
		bar.draw_rect(Rect2(_SR.position.x, HEAD - 4, _SR.size.x, 5), INK))
	_head.add_child(bar)
	var title := _title()
	var star := Node2D.new()
	star.position = Vector2(132, 36)
	star.rotation = -0.05
	var sw := 116.0
	star.draw.connect(func(): ScrCeremony._star(star, Vector2.ZERO, sw, 82, 12, RED, 4.0, 0.0, 0.34))
	_head.add_child(star)
	var fs := 38.0 if title.length() <= 9 else (32.0 if title.length() <= 12 else 27.0)
	var t := _txt(star, title, fs, YEL, UIK.ink_stroke(3.0, 4.0), Vector2(-130, -fs * 0.68), 260)
	t.align = 0.5
	_anim_in[star] = 0.0
	var x := Node2D.new()
	x.position = Vector2(_W.x - 34, 38)
	x.draw.connect(func():
		x.draw_circle(Vector2(2, 3), 19, INK)
		x.draw_circle(Vector2.ZERO, 19, INK)
		x.draw_circle(Vector2.ZERO, 15.5, RED)
		x.draw_line(Vector2(-6, -6), Vector2(6, 6), Color.WHITE, 4.0, true)
		x.draw_line(Vector2(6, -6), Vector2(-6, 6), Color.WHITE, 4.0, true))
	_head.add_child(x)
	_btn(x, Rect2(-26, -26, 52, 52), func(): g.audio.play("click"); close())
	_gold_l = _chip(Vector2(24, 76), "res://assets/fx/currency/coin.png", GOLD)
	_gem_l = _chip(Vector2(_W.x * 0.5 + 8, 76), "res://assets/fx/currency/gem.png", Color("#a85cff"))
	_gold_ic = Vector2(24 + 14, 76 + 13)
	_gem_ic = Vector2(_W.x * 0.5 + 8 + 14, 76 + 13)
	_gold_l.text = ShopPage.fmt_tr(int(_gold_v))
	_gem_l.text = ShopPage.fmt_tr(int(_gem_v))

func _chip(pos: Vector2, icon: String, acc: Color) -> UIText:
	var n := Node2D.new()
	n.position = pos
	var w := _W.x * 0.5 - 32
	n.draw.connect(func():
		ComicSkin.panel(n, Rect2(0, 0, w, 26), Color("#2a0d14"), 13, 3.0, Vector2(2, 3), false)
		n.draw_rect(Rect2(14, 3, w - 28, 2), Color(acc, 0.6)))
	_head.add_child(n)
	var sp := Sprite2D.new()
	sp.texture = load(icon)
	sp.scale = Vector2.ONE * (30.0 / sp.texture.get_width())
	sp.position = Vector2(14, 13)
	n.add_child(sp)
	var l := _txt(n, "0", 19, Color.WHITE, UIK.ink_stroke(1.6, 2.0), Vector2(30, 0), w - 40)
	l.align = 1.0
	return l

# ═════════════ çizim yardımcıları ═════════════

func _txt(parent: Node, s: String, sz: float, col: Color, sh: String, pos: Vector2, w: float) -> UIText:
	var t := UIText.new()
	t.style(false, 1000, sz, 0.8, col, sh)
	t.nowrap = true
	t.wrap_w = w
	t.size = Vector2(w, sz * 1.5)
	t.position = pos
	t.text = s
	parent.add_child(t)
	return t

## ince bilgi yazısı (Bangers değil, okunur gövde yazısı)
func _small(parent: Node, s: String, sz: float, col: Color, pos: Vector2, w: float, align := 0.0) -> UIText:
	var t := UIText.new()
	t.style(false, 700, sz, 0.3, col, "0 1px 2px rgba(0,0,0,0.9)")
	t.nowrap = true
	t.wrap_w = w
	t.position = pos
	t.text = s
	t.align = align
	parent.add_child(t)
	return t

## bölüm başlığı: eğik siyah bant (sarı yazı) + sağda bilgi
func _ribbon(y: float, title: String, info: String, delay: float, col := YEL) -> void:
	var b := Node2D.new()
	b.position = Vector2(16, y)
	b.rotation = -0.03
	var l := _txt(b, title, 22, col, "", Vector2(12, 1), 300)
	var w := l.text_width() + 26
	b.draw.connect(func():
		b.draw_rect(Rect2(4, 5, w, 32), Color(CRIM, 0.7))
		b.draw_rect(Rect2(0, 0, w, 32), INK)
		b.draw_rect(Rect2(0, 0, 5, 32), RED))
	_content.add_child(b)
	_anim_in[b] = delay
	if info != "":
		var r := _txt(_content, info, 16, Color.WHITE, UIK.ink_stroke(1.4, 1.6), Vector2(16, y + 6), _W.x - 32)
		r.align = 1.0

func _check(parent: Node2D, p: Vector2, s := 1.0) -> Node2D:
	var c := Node2D.new()
	c.position = p
	c.scale = Vector2.ONE * s
	c.draw.connect(func():
		c.draw_circle(Vector2(1.5, 2), 12, INK)
		c.draw_circle(Vector2.ZERO, 12, INK)
		c.draw_circle(Vector2.ZERO, 9.5, GREEN)
		c.draw_polyline(PackedVector2Array([Vector2(-5, 0), Vector2(-1.5, 4), Vector2(5.5, -4)]), Color.WHITE, 3.0, true))
	parent.add_child(c)
	return c

func _lock(parent: Node2D, p: Vector2, s := 1.0) -> Node2D:
	var c := Node2D.new()
	c.position = p
	c.scale = Vector2.ONE * s
	c.draw.connect(func():
		c.draw_circle(Vector2(1.5, 2), 13, INK)
		c.draw_circle(Vector2.ZERO, 13, INK)
		c.draw_circle(Vector2.ZERO, 10.5, Color("#3a2a30"))
		c.draw_arc(Vector2(0, -2), 4.5, PI, TAU, 10, GOLD, 2.4, true)
		c.draw_rect(Rect2(-6, -2, 12, 9), GOLD))
	parent.add_child(c)
	return c

func _icon(parent: Node2D, tex: Texture2D, box: float, pos := Vector2.ZERO, mod := Color.WHITE) -> Sprite2D:
	if tex == null: return null
	var sp := Sprite2D.new()
	sp.texture = tex
	sp.scale = Vector2.ONE * (box / maxf(tex.get_width(), tex.get_height()))
	sp.position = pos
	sp.modulate = mod
	parent.add_child(sp)
	return sp

## büyük çizgi roman düğmesi (merkez konumlu): mürekkep gölge, iki tonlu dolgu, parıltı süpürmesi
func _cta(parent: Node2D, pos: Vector2, w: float, h: float, label: String, fill: Color, top: Color, cb, on := true, fs := 26.0) -> Node2D:
	var bn := Node2D.new()
	bn.position = pos
	bn.draw.connect(func():
		var r := Rect2(-w * 0.5, -h * 0.5, w, h)
		var rad := h * 0.5
		if on:
			var k := fmod(_t, 1.4) / 1.4
			bn.draw_style_box(ComicSkin.sb(Color(0, 0, 0, 0), rad + k * 8, 3.0, Color(YEL, 0.6 * (1.0 - k))), r.grow(3 + k * 9))
		bn.draw_style_box(ComicSkin.sb(INK, rad), Rect2(r.position + Vector2(0, 6), r.size))
		bn.draw_style_box(ComicSkin.sb(fill if on else Color("#4a3a40"), rad), r)
		if on: bn.draw_style_box(ComicSkin.sb(top, rad), Rect2(r.position, Vector2(r.size.x, r.size.y * 0.55)))
		bn.draw_line(r.position + Vector2(rad, 8), Vector2(r.end.x - rad, r.position.y + 8), Color(1, 1, 1, 0.5 if on else 0.15), 3.0)
		if on:
			# parıltı süpürmesi
			var sx := fmod(_t * 0.7, 1.6) / 1.6 * (w + 120) - w * 0.5 - 60
			var pts := PackedVector2Array()
			for q in [Vector2(sx, r.position.y + 3), Vector2(sx + 22, r.position.y + 3), Vector2(sx + 2, r.end.y - 3), Vector2(sx - 20, r.end.y - 3)]:
				pts.append(Vector2(clampf(q.x, r.position.x + rad * 0.6, r.end.x - rad * 0.6), q.y))
			if pts[1].x - pts[0].x > 2: bn.draw_colored_polygon(pts, Color(1, 1, 1, 0.28))
		bn.draw_style_box(ComicSkin.sb(Color(0, 0, 0, 0), rad, 4.0), r))
	parent.add_child(bn)
	_txt(bn, label, fs, Color.WHITE if on else Color(1, 1, 1, 0.55), UIK.ink_stroke(2.2, 3.0) if on else "", Vector2(-w * 0.5, -fs * 0.66), w).align = 0.5
	if cb is Callable:
		_btn(bn, Rect2(-w * 0.5, -h * 0.5 - 4, w, h + 10), cb)
	_live.append(bn)
	return bn

static func _reward_tex(rw: Dictionary) -> Texture2D:
	match String(rw.get("kind", "")):
		"rubies": return load("res://assets/fx/currency/coin.png")
		"stone": return load("res://assets/fx/currency/gem.png")
		"chest":
			var C: Dictionary = ChestSystem.chests().get(rw.get("chest", ""), {})
			var t := clampi(int(C.get("tier", 1)), 1, 7)
			return load("res://assets/ui/art/chest/t" + str(t) + ".png")
		"gear": return load("res://assets/ui/art/icon/kilic.png")
		"char", "cards": return load("res://assets/ui/art/icon/maske.png")
	return null

## ödül adı (kart altı)
static func _reward_label(rw: Dictionary) -> String:
	match String(rw.get("kind", "")):
		"rubies", "stone": return "+" + ShopPage.fmt_tr(int(rw.get("amount", 0)))
		"chest": return str(ChestSystem.chests().get(rw.get("chest", ""), {}).get("name", "SANDIK"))
		"gear": return ["", "SIRADAN", "YAYGIN", "NADİR", "EPİK", "EFSANE"][clampi(int(rw.get("rarityMax", 1)), 1, 5)] + " EŞYA"
		"char": return "GİZLİ KAHRAMAN"
		"cards":
			var nm: String = D.CHARACTERS[rw.char].name if D.CHARACTERS.has(rw.get("char", "")) else "KAHRAMAN"
			return "+" + str(int(rw.get("amount", 1))) + " " + nm
	return ""

# ═════════════ ödül kutlaması ═════════════

func _local_of(n: Node2D) -> Vector2:
	return get_global_transform().affine_inverse() * n.get_global_transform().origin

func _burst(at: Vector2, col: Color, cnt: int) -> void:
	for i in cnt:
		var a := randf() * TAU
		var v := randf_range(120, 380)
		var life := randf_range(0.4, 0.8)
		_parts.append({"p": at, "v": Vector2(cos(a), sin(a)) * v + Vector2(0, -80), "life": life, "max": life, "col": [col, Color.WHITE, Color("#ff8a2a")][i % 3], "s": randf_range(2.5, 5.0)})

## kıvılcım + halka + damga; altın/gem ise cüzdana uçar
func _celebrate(n: Node2D, kind: String, stamp := "ALINDI!") -> void:
	var at := _local_of(n) if n else _W * 0.5
	_burst(at, YEL, 26)
	_rings.append([at, _t])
	if n and stamp != "": _stamps.append([n, _t, stamp])
	if kind == "rubies" or kind == "stone":
		var F := FxFly.new()
		F.z_index = 50
		F.col = Color(1.0, 0.82, 0.48) if kind == "rubies" else Color(0.78, 0.61, 1.0)
		F.src = at
		F.dst = _gold_ic if kind == "rubies" else _gem_ic
		F.tex = load("res://assets/fx/currency/" + ("coin" if kind == "rubies" else "gem") + ".png")
		var from: float = _gold_v if kind == "rubies" else _gem_v
		var to: float = g.read_rubies() if kind == "rubies" else g.read_stones()
		var lab: UIText = _gold_l if kind == "rubies" else _gem_l
		var key := "gold" if kind == "rubies" else "gem"
		F.on_arrive = func(i: int, tot: int):
			lab.text = ShopPage.fmt_tr(int(round(from + (to - from) * float(i) / tot)))
			_bump[key] = _t
			if i == 1: g.audio.play("walletin")
		F.on_done = func():
			if kind == "rubies": _gold_v = to
			else: _gem_v = to
		add_child(F)
		F.start()
		g.audio.play("coin")
	else:
		g.audio.play("chestrare")
	g.ui.refresh_wallet()
	g.ui.menu._top()

## cüzdan çiplerini gerçek değere çek (uçuşsuz harcama/kazanç sonrası)
func _sync_wallet() -> void:
	_gold_v = g.read_rubies()
	_gem_v = g.read_stones()
	if _gold_l: _gold_l.text = ShopPage.fmt_tr(int(_gold_v))
	if _gem_l: _gem_l.text = ShopPage.fmt_tr(int(_gem_v))

## içerik yeniden kurulur (kaydırma korunur, giriş animasyonu yok)
func _rebuild_later(delay := 0.85) -> void:
	get_tree().create_timer(delay).timeout.connect(func():
		if not visible or _content == null: return
		var keep := _scroll
		_rebuild_content()
		_scroll = clampf(keep, 0.0, _scroll_max))

func _rebuild_content() -> void:
	for c in _content.get_children(): c.queue_free()
	_qbtns = _qbtns.filter(func(B): return is_instance_valid(B.node) and not _content.is_ancestor_of(B.node))
	_live = _live.filter(func(n): return is_instance_valid(n) and not _content.is_ancestor_of(n))
	_stamps.clear()
	var keep := {}
	for k in _anim_in:
		if is_instance_valid(k) and not _content.is_ancestor_of(k): keep[k] = _anim_in[k]
	_anim_in = keep
	_layout_content()
	for k in _anim_in.keys():
		if _content.is_ancestor_of(k): _anim_in[k] = -10.0

func _draw_fx() -> void:
	for p in _parts:
		var r: float = float(p.s) * (float(p.life) / float(p.max))
		var c: Color = p.col
		c.a = minf(1.0, float(p.life) / 0.25)
		var q: Vector2 = p.p
		_fx.draw_colored_polygon(PackedVector2Array([q + Vector2(0, -r * 2.2), q + Vector2(r * 0.45, 0), q + Vector2(0, r * 2.2), q + Vector2(-r * 0.45, 0)]), c)
		_fx.draw_colored_polygon(PackedVector2Array([q + Vector2(-r * 2.2, 0), q + Vector2(0, r * 0.45), q + Vector2(r * 2.2, 0), q + Vector2(0, -r * 0.45)]), c)
	for R in _rings:
		var k: float = (_t - float(R[1])) / 0.6
		if k >= 1.0: continue
		var e := 1.0 - pow(1.0 - k, 3.0)
		_fx.draw_arc(R[0], 20 + 90 * e, 0, TAU, 40, Color(INK, 0.8 * (1.0 - k)), 7.0 * (1.0 - k) + 1, true)
		_fx.draw_arc(R[0], 20 + 90 * e, 0, TAU, 40, Color(YEL, 1.0 - k), 3.5 * (1.0 - k) + 0.5, true)
	for S in _stamps:
		var n: Node2D = S[0]
		if not is_instance_valid(n): continue
		var k := clampf((_t - float(S[1])) / 0.32, 0, 1)
		var s := lerpf(2.6, 1.0, k * k)
		_fx.draw_set_transform(_local_of(n), -0.25, Vector2.ONE * s)
		var a := minf(1.0, k * 3.0) * clampf((1.4 - (_t - float(S[1]))) / 0.3, 0, 1)
		_fx.draw_style_box(ComicSkin.sb(Color(PAPER, 0.9 * a), 6), Rect2(-54, -18, 108, 36))
		_fx.draw_style_box(ComicSkin.sb(Color(0, 0, 0, 0), 6, 4.0, Color(RED, a)), Rect2(-54, -18, 108, 36))
		_fx.draw_string(UIK.font(false, 1000, 1.0), Vector2(-54, 10), I18n.t(str(S[2])), HORIZONTAL_ALIGNMENT_CENTER, 108, 26, Color(RED, a))
		_fx.draw_set_transform(Vector2.ZERO)

# ═════════════ dokunma ═════════════

func _btn(node: Node2D, rect: Rect2, cb: Callable) -> void:
	_qbtns.append({"node": node, "rect": rect, "cb": cb})

func _hit(pos: Vector2):
	for i in range(_qbtns.size() - 1, -1, -1):
		var B: Dictionary = _qbtns[i]
		var nd: Node2D = B.node
		if not is_instance_valid(nd) or not nd.is_visible_in_tree(): continue
		if _content and _content.is_ancestor_of(nd) and not _qclip.get_global_rect().has_point(pos): continue
		var lp: Vector2 = nd.get_global_transform_with_canvas().affine_inverse() * pos
		if (B.rect as Rect2).has_point(lp): return B
	return null

func _input(ev: InputEvent) -> void:
	if not visible or _content == null: return
	if ev is InputEventScreenTouch:
		var st := ev as InputEventScreenTouch
		get_viewport().set_input_as_handled()
		if st.pressed:
			if _pid >= 0: return
			_pid = st.index
			_p0 = st.position
			_last = st.position
			_dragging = false
			_vel = 0.0
			_qpress = _hit(st.position)
			if _qpress: _spring(_qpress.node, 0.9)
		elif st.index == _pid:
			_pid = -1
			var B = _qpress
			_qpress = null
			if B:
				_spring(B.node, 1.0)
				if not _dragging and not st.canceled and _hit(st.position) == B:
					TapFx.pop(st.position)
					(B.cb as Callable).call()
	elif ev is InputEventScreenDrag:
		var sd := ev as InputEventScreenDrag
		get_viewport().set_input_as_handled()
		if sd.index != _pid: return
		if not _dragging and (sd.position - _p0).length() > 10.0:
			_dragging = true
			if _qpress:
				_spring(_qpress.node, 1.0)
				_qpress = null
		if _dragging:
			var k := _content.get_global_transform_with_canvas().get_scale().y
			var dy := (sd.position.y - _last.y) / maxf(0.01, k)
			_scroll -= dy
			_vel = -dy / maxf(0.001, get_process_delta_time())
		_last = sd.position

func _spring(n: Node2D, tgt: float) -> void:
	var s = _qsprings.get(n)
	if s == null:
		s = [n.scale.x, 0.0, 1.0]
		_qsprings[n] = s
	s[2] = tgt
	if tgt < 1.0: s[1] -= 1.5

# ═════════════ kare ═════════════

func _process(dt: float) -> void:
	if not visible or _content == null: return
	_t += dt
	if _pid < 0 or not _dragging:
		_scroll += _vel * dt
		_vel *= pow(0.004, dt)
		if _scroll < 0.0:
			_scroll = lerpf(_scroll, 0.0, 1.0 - pow(0.0005, dt))
			_vel = 0.0
		elif _scroll > _scroll_max:
			_scroll = lerpf(_scroll, _scroll_max, 1.0 - pow(0.0005, dt))
			_vel = 0.0
	else:
		if _scroll < 0.0: _scroll *= 0.92
		elif _scroll > _scroll_max: _scroll = _scroll_max + (_scroll - _scroll_max) * 0.92
	_content.position.y = -_scroll
	for n in _qsprings.keys():
		if not is_instance_valid(n):
			_qsprings.erase(n)
			continue
		var s: Array = _qsprings[n]
		var a: float = -760.0 * (float(s[0]) - float(s[2])) - 15.0 * float(s[1])
		s[1] = float(s[1]) + a * minf(dt, 1.0 / 30.0)
		s[0] = float(s[0]) + float(s[1]) * minf(dt, 1.0 / 30.0)
		(n as Node2D).scale = Vector2.ONE * float(s[0])
		if absf(float(s[0]) - float(s[2])) < 0.001 and absf(float(s[1])) < 0.01 and float(s[2]) >= 1.0:
			(n as Node2D).scale = Vector2.ONE
			_qsprings.erase(n)
	for n in _anim_in.keys():
		if not is_instance_valid(n):
			_anim_in.erase(n)
			continue
		var k := clampf((_t - float(_anim_in[n])) / 0.34, 0, 1)
		if float(_anim_in[n]) < -5.0: k = 1.0
		if not _qsprings.has(n):
			(n as Node2D).scale = Vector2.ONE * (ScrLevelUp._back_ease(k) if k < 1.0 else 1.0) if k > 0.0 else Vector2.ZERO
		if k >= 1.0: _anim_in.erase(n)
	# canlı süsler
	for i in range(_live.size() - 1, -1, -1):
		var nd = _live[i]
		if not is_instance_valid(nd):
			_live.remove_at(i)
			continue
		if nd.has_meta("bob") and not _qsprings.has(nd) and not _anim_in.has(nd):
			nd.scale = Vector2.ONE * (1.0 + sin(_t * 5.0 + float(nd.get_meta("bob"))) * 0.04)
		if nd.has_meta("wiggle") and not _qsprings.has(nd):
			nd.rotation = sin(_t * 9.0) * 0.12 * maxf(0.0, sin(_t * 1.8))
		if nd.has_meta("float"):
			nd.position.y = float(nd.get_meta("float")) + sin(_t * 2.2) * 5.0
		if nd.has_meta("spin"):
			nd.rotation += dt * float(nd.get_meta("spin"))
		nd.queue_redraw()
	for e in _embers:
		var p: Vector2 = e[0]
		p.y -= float(e[1]) * dt
		p.x += sin(_t * 0.8 + float(e[3])) * 10.0 * dt
		if p.y < -10:
			p = Vector2(randf() * _W.x, _W.y + 10)
		e[0] = p
	_tick(dt)
	for key in _bump.keys():
		var kb := (_t - float(_bump[key])) / 0.3
		var lab: UIText = _gold_l if key == "gold" else _gem_l
		var chip := lab.get_parent() as Node2D
		if kb >= 1.0:
			_bump.erase(key)
			chip.scale = Vector2.ONE
		else:
			chip.scale = Vector2.ONE * (1.0 + 0.12 * sin(kb * PI))
	for i in range(_parts.size() - 1, -1, -1):
		var p: Dictionary = _parts[i]
		p.life = float(p.life) - dt
		if p.life <= 0.0:
			_parts.remove_at(i)
			continue
		var v: Vector2 = p.v
		v.y += 600.0 * dt
		p.v = v
		p.p = (p.p as Vector2) + v * dt
	_rings = _rings.filter(func(R): return _t - float(R[1]) < 0.6)
	_stamps = _stamps.filter(func(S): return _t - float(S[1]) < 1.4)
	_fx.queue_redraw()

func close() -> void:
	if not visible: return
	g.ui.menu.visible = true
	fade_hide(_close_now)

func _close_now() -> void:
	visible = false
	g.ui.menu.visible = true
	for c in get_children():
		if not (c is Scr._Ticker): c.queue_free()
	_content = null
	_qbtns.clear()
	_live.clear()
	g.ui.menu.refresh_wallet(true)
	g.ui.menu._top()
	_on_closed()
