class_name ScrQuests
extends Scr
## GÖREVLER (v2 · Borderlands çizgi roman). Tamamen yerel çizim, kaydırılabilir:
##   ① GÜNLÜK GİRİŞ — 7 gün kartı (bugünün kartı sarı, nabız atar, zıplar); "ÖDÜLÜ AL!" →
##      kartın üstüne kırmızı "ALINDI!" damgası çarpar, kıvılcım + halka, ödül (altın/gem)
##      kartın içinden üst cüzdana UÇAR, sayaç tıklar; sandık ödülü zıplayıp yuvaya gider.
##   ② HAFTALIK SANDIK YOLU — puan sayacı, kalın şeritli çubuk, 3 kademe ödülü (hazır olan
##      parlayıp sallanır; dokun → al).
##   ③ HAFTALIK GÖREVLER — satır kartları: ad, ilerleme çubuğu, ödül; hazırsa yeşil "AL!".
## Her dokunuşta yaylı basış + çizgi roman "pop" (TapFx).

const INK := Color(0.05, 0.03, 0.07)
const YEL := Color("#ffd23a")
const PAPER := Color("#fff3d6")
const GREEN := Color("#4cbf5e")
const RED := Color("#e8322c")
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
var _qbtns: Array = []        # [{node, rect, cb, on}]
var _qpress = null
var _pid := -1
var _p0 := Vector2.ZERO
var _last := Vector2.ZERO
var _dragging := false
var _qsprings := {}           # node → [s, v, tgt]
var _parts: Array = []       # kıvılcımlar (ekran yerel)
var _rings: Array = []
var _stamps := {}            # gün → t0 (ALINDI damgası)
var _day_nodes := {}         # gün → Node2D
var _anim_in := {}           # node → t0 (giriş)
var _gold_v := 0.0
var _gem_v := 0.0
var _gold_l: UIText
var _gem_l: UIText
var _gold_ic := Vector2.ZERO
var _gem_ic := Vector2.ZERO
var _pts_l: UIText
var _pts_shown := 0.0
var _bump := {}              # "gold"/"gem" → t0

func _init(game) -> void:
	super(game)
	name = "Quests"

func open() -> void:
	if g.dailies: g.dailies.touch()
	visible = true
	cancel_fade()
	position = Vector2.ZERO
	scale = Vector2.ONE
	g.ui.menu.visible = false
	g.audio.play("panel")
	_gold_v = g.read_rubies()
	_gem_v = g.read_stones()
	_pts_shown = 0.0
	_scroll = 0.0
	_vel = 0.0
	_build()
	_t = 0.0
	fade_show()

func _build() -> void:
	for c in get_children():
		if not (c is Scr._Ticker): c.queue_free()
	_qbtns.clear()
	_qsprings.clear()
	_day_nodes.clear()
	_anim_in.clear()
	_W = UIK.ui_size(get_viewport())
	_SR = UIK.screen_rect(self)
	_bg = Node2D.new()
	_bg.draw.connect(_draw_bg)
	add_child(_bg)
	var rays := Node2D.new()
	rays.position = Vector2(_W.x * 0.5, _W.y * 0.4)
	rays.draw.connect(func():
		for i in 22:
			var a := i * TAU / 22.0
			rays.draw_colored_polygon(PackedVector2Array([Vector2.ZERO, Vector2(cos(a - 0.07), sin(a - 0.07)) * 1400, Vector2(cos(a + 0.07), sin(a + 0.07)) * 1400]), Color(1, 0.85, 1, 0.035)))
	add_child(rays)
	var tw := rays.create_tween().set_loops()
	tw.tween_property(rays, "rotation", TAU, 80.0).from(0.0)
	_qclip = Control.new()
	_qclip.clip_contents = true
	_qclip.position = Vector2(0, HEAD)
	_qclip.size = Vector2(_W.x, _W.y - HEAD)
	_qclip.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(_qclip)
	_content = Node2D.new()
	_qclip.add_child(_content)
	_build_content()
	_head = Node2D.new()
	add_child(_head)
	_build_head()
	_fx = Node2D.new()
	_fx.draw.connect(_draw_fx)
	add_child(_fx)

func _draw_bg() -> void:
	var r := _SR
	var top := Color("#3a1a52")
	var bot := Color("#120820")
	_bg.draw_polygon(PackedVector2Array([r.position, Vector2(r.end.x, r.position.y), r.end, Vector2(r.position.x, r.end.y)]), PackedColorArray([top, top, bot, bot]))
	ComicSkin.halftone(_bg, Rect2(r.position.x, r.end.y - 300, r.size.x, 300), Color(0, 0, 0, 0.28), 12.0, 16, 3.4)

# ═════════════ başlık (sabit) ═════════════

func _build_head() -> void:
	var bar := Node2D.new()
	bar.draw.connect(func():
		bar.draw_rect(Rect2(_SR.position.x, _SR.position.y, _SR.size.x, HEAD - _SR.position.y), ComicSkin.NIGHT)
		ComicSkin.halftone(bar, Rect2(_SR.position.x, 0, _SR.size.x, HEAD), Color(0, 0, 0, 0.25), 7.0, 8, 2.0)
		bar.draw_rect(Rect2(_SR.position.x, HEAD - 6, _SR.size.x, 3), Color(YEL, 0.85))
		bar.draw_rect(Rect2(_SR.position.x, HEAD - 3, _SR.size.x, 4), INK))
	_head.add_child(bar)
	var star := Node2D.new()
	star.position = Vector2(118, 40)
	star.rotation = -0.05
	star.draw.connect(func(): ScrCeremony._star(star, Vector2.ZERO, 104, 76, 12, RED, 4.0, 0.0, 0.42))
	_head.add_child(star)
	var t := _txt(star, "GÖREVLER", 40, YEL, UIK.ink_stroke(3.0, 4.0), Vector2(-120, -26), 240)
	t.align = 0.5
	_anim_in[star] = 0.0
	# kapat
	var x := Node2D.new()
	x.position = Vector2(_W.x - 34, 38)
	x.draw.connect(func():
		x.draw_circle(Vector2(2, 3), 19, INK)
		x.draw_circle(Vector2.ZERO, 19, INK)
		x.draw_circle(Vector2.ZERO, 15.5, RED)
		x.draw_line(Vector2(-6, -6), Vector2(6, 6), Color.WHITE, 4.0, true)
		x.draw_line(Vector2(6, -6), Vector2(-6, 6), Color.WHITE, 4.0, true))
	_head.add_child(x)
	_btn(x, Rect2(-24, -24, 48, 48), func(): g.audio.play("click"); close())
	# cüzdan
	_gold_l = _chip(Vector2(24, 76), "res://assets/fx/currency/coin.png", Color("#ffb020"))
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
		ComicSkin.panel(n, Rect2(0, 0, w, 26), Color("#2a1838"), 13, 3.0, Vector2(2, 3), false)
		n.draw_rect(Rect2(14, 3, w - 28, 2), Color(acc, 0.6)))
	_head.add_child(n)
	var sp := Sprite2D.new()
	sp.texture = load(icon)
	sp.scale = Vector2.ONE * (30.0 / sp.texture.get_width())
	sp.position = Vector2(14, 13)
	n.add_child(sp)
	var l := _txt(n, "0", 19, Color.WHITE, UIK.ink_stroke(1.6, 2.0), Vector2(30, 0), w - 40)
	l.align = 1.0
	n.set_meta("acc", acc)
	return l

# ═════════════ içerik ═════════════

func _build_content() -> void:
	var d: Dailies = g.dailies
	if d == null: return
	var y := 14.0
	y = _sec_daily(d, y)
	y = _sec_track(d, y + 26)
	y = _sec_quests(d, y + 26)
	_scroll_max = maxf(0.0, y + 40 - _qclip.size.y)
	_scroll = clampf(_scroll, 0.0, _scroll_max)

## bölüm başlığı: eğik siyah bant + sağda bilgi
func _ribbon(y: float, title: String, info: String, delay: float) -> void:
	var b := Node2D.new()
	b.position = Vector2(16, y)
	b.rotation = -0.03
	var l := _txt(b, title, 22, YEL, "", Vector2(12, 1), 300)
	var w := l.text_width() + 26
	b.draw.connect(func():
		b.draw_rect(Rect2(4, 5, w, 32), Color(0, 0, 0, 0.45))
		b.draw_rect(Rect2(0, 0, w, 32), INK))
	_content.add_child(b)
	_anim_in[b] = delay
	if info != "":
		var r := _txt(_content, info, 16, Color.WHITE, UIK.ink_stroke(1.4, 1.6), Vector2(16, y + 6), _W.x - 32)
		r.align = 1.0

func _sec_daily(d: Dailies, y: float) -> float:
	var slot := int(d.q.slot)
	var took := d.claimed_today()
	_ribbon(y, "GÜNLÜK GİRİŞ", str(slot) + ". GÜN / 7" + ((" · " + str(int(d.q.cycle)) + ". TUR") if int(d.q.cycle) > 1 else ""), 0.05)
	y += 46
	var gap := 8.0
	var cw := (_W.x - 32 - gap * 3) / 4.0
	var ch := 112.0
	for s in Dailies.DAILY_STREAK:
		var day := int(s.day)
		var i := day - 1
		var row := 0 if i < 4 else 1
		var col := i if i < 4 else i - 4
		var w := cw if day < 7 else cw * 2 + gap
		var pos := Vector2(16 + col * (cw + gap), y + row * (ch + gap))
		var st := "future"
		if day == slot: st = "taken" if took else "open"
		elif day < slot: st = "taken"
		var n := _day_card(day, s.reward, st, Vector2(w, ch))
		n.position = pos + Vector2(w, ch) * 0.5
		_content.add_child(n)
		_day_nodes[day] = n
		_anim_in[n] = 0.1 + i * 0.05
		if st == "open": _btn(n, Rect2(-w * 0.5, -ch * 0.5, w, ch), _claim_daily)
	y += ch * 2 + gap + 12
	# telafi bilgisi
	var used := d.used_makeup_today()
	var mk := int(d.q.makeup)
	var info := "SERİ KORUNDU" if used else ("TELAFİ HAKKI ×1 · bir gün kaçırsan seri bozulmaz" if mk > 0 else "TELAFİ HAKKI YOK · pazartesi yenilenir")
	var it := _txt(_content, info, 12, Color(1, 1, 1, 0.7), "", Vector2(16, y), _W.x - 32)
	it.style(false, 700, 12, 0.4, Color(1, 1, 1, 0.72), "")
	it.align = 0.5
	y += 26
	# büyük düğme
	var bw := _W.x - 64
	var bn := Node2D.new()
	bn.position = Vector2(_W.x * 0.5, y + 28)
	var on := not took
	bn.draw.connect(func():
		var r := Rect2(-bw * 0.5, -26, bw, 52)
		if on:
			var k := fmod(_t, 1.4) / 1.4
			bn.draw_style_box(ComicSkin.sb(Color(0, 0, 0, 0), 26 + k * 8, 3.0, Color(YEL, 0.6 * (1.0 - k))), r.grow(3 + k * 9))
		bn.draw_style_box(ComicSkin.sb(INK, 26), Rect2(r.position + Vector2(0, 6), r.size))
		bn.draw_style_box(ComicSkin.sb(Color("#ff8a2a") if on else Color("#4a4258"), 26), r)
		if on: bn.draw_style_box(ComicSkin.sb(Color("#ffc21a"), 26), Rect2(r.position, Vector2(r.size.x, r.size.y * 0.55)))
		bn.draw_line(r.position + Vector2(26, 8), Vector2(r.end.x - 26, r.position.y + 8), Color(1, 1, 1, 0.5 if on else 0.15), 3.0)
		bn.draw_style_box(ComicSkin.sb(Color(0, 0, 0, 0), 26, 4.0), r))
	_content.add_child(bn)
	_txt(bn, "ÖDÜLÜ AL!" if on else "YARIN GÖRÜŞÜRÜZ", 26, Color.WHITE if on else Color(1, 1, 1, 0.6), UIK.ink_stroke(2.2, 3.0) if on else "", Vector2(-bw * 0.5, -17), bw).align = 0.5
	_anim_in[bn] = 0.45
	if on:
		_btn(bn, Rect2(-bw * 0.5, -28, bw, 58), _claim_daily)
		bn.set_meta("pulse", true)
	return y + 60

## tek gün kartı (merkez 0,0)
func _day_card(day: int, rw: Dictionary, st: String, sz: Vector2) -> Node2D:
	var n := Node2D.new()
	var fill := Color("#3a2c4a")
	if st == "open": fill = YEL
	elif st == "taken": fill = Color("#2f7a4a")
	var r := Rect2(-sz * 0.5, sz)
	n.draw.connect(func():
		if st == "open":
			var k := fmod(_t, 1.1) / 1.1
			n.draw_style_box(ComicSkin.sb(Color(0, 0, 0, 0), 14 + k * 6, 3.0, Color(Color.WHITE, 0.7 * (1.0 - k))), r.grow(2 + k * 8))
		ComicSkin.panel(n, r, fill, 12, 4.0, Vector2(3, 5))
		ComicSkin.rays(n, r, Vector2(0, -4), Color(1, 1, 1, 0.22 if st == "open" else 0.07), 14, 0.12, 4.0)
		n.draw_rect(Rect2(r.position.x + 4, r.position.y + 4, r.size.x - 8, 22), Color(INK, 0.85))
		if st == "taken":
			n.draw_rect(Rect2(r.position + Vector2(4, 26), r.size - Vector2(8, 30)), Color(0, 0, 0, 0.35)))
	_txt(n, "GÜN " + str(day), 17, YEL if st != "future" else Color(1, 1, 1, 0.7), "", Vector2(-sz.x * 0.5, -sz.y * 0.5 + 4), sz.x).align = 0.5
	# ödül ikonu
	var tex: Texture2D = _reward_tex(rw)
	if tex:
		var sp := Sprite2D.new()
		sp.texture = tex
		var big := 50.0 if rw.kind != "chest" else (58.0 if day < 7 else 70.0)
		sp.scale = Vector2.ONE * (big / tex.get_width())
		sp.position = Vector2(0, 4)
		if st == "taken": sp.modulate = Color(0.75, 0.75, 0.75, 0.7)
		elif st == "future": sp.modulate = Color(0.85, 0.85, 0.9)
		n.add_child(sp)
		n.set_meta("icon", sp)
	var amt := ("×1" if rw.kind == "chest" else "+" + str(int(rw.get("amount", 0))))
	_txt(n, amt, 20, Color.WHITE, UIK.ink_stroke(1.8, 2.2), Vector2(-sz.x * 0.5, sz.y * 0.5 - 30), sz.x).align = 0.5
	if st == "taken": _check(n, Vector2(sz.x * 0.5 - 14, -sz.y * 0.5 + 34))
	if st == "open": n.set_meta("bob", true)
	return n

func _check(parent: Node2D, p: Vector2) -> void:
	var c := Node2D.new()
	c.position = p
	c.draw.connect(func():
		c.draw_circle(Vector2(1.5, 2), 12, INK)
		c.draw_circle(Vector2.ZERO, 12, INK)
		c.draw_circle(Vector2.ZERO, 9.5, GREEN)
		c.draw_polyline(PackedVector2Array([Vector2(-5, 0), Vector2(-1.5, 4), Vector2(5.5, -4)]), Color.WHITE, 3.0, true))
	parent.add_child(c)

static func _reward_tex(rw: Dictionary) -> Texture2D:
	match String(rw.get("kind", "")):
		"rubies": return load("res://assets/fx/currency/coin.png")
		"stone": return load("res://assets/fx/currency/gem.png")
		"chest":
			var C: Dictionary = ChestSystem.chests().get(rw.get("chest", ""), {})
			var t := clampi(int(C.get("tier", 1)), 1, 5)
			return load("res://assets/ui/art/chest/t" + str(t) + ".png")
	return null

func _sec_track(d: Dailies, y: float) -> float:
	var ms := Dailies.week_left_ms()
	var hrs := int(floor(ms / 3600000.0))
	var left := (str(hrs / 24) + " gün " + str(hrs % 24) + " sa") if hrs >= 24 else (str(hrs) + " sa " + str(int(fmod(ms, 3600000.0) / 60000.0)) + " dk")
	_ribbon(y, "HAFTALIK SANDIK YOLU", left, 0.5)
	y += 46
	var pts := d.points()
	var h := 150.0
	var pn := Node2D.new()
	pn.position = Vector2(16, y)
	var w := _W.x - 32
	pn.draw.connect(func():
		var r := Rect2(0, 0, w, h)
		ComicSkin.panel(pn, r, Color("#2a1838"), 14, 4.0, Vector2(3, 6))
		ComicSkin.halftone(pn, r.grow(-5), Color(0, 0, 0, 0.22), 8.0, 5, 2.2)
		# çubuk
		var br := Rect2(18, 92, w - 36, 22)
		pn.draw_style_box(ComicSkin.sb(INK, 11), Rect2(br.position + Vector2(2, 4), br.size))
		pn.draw_style_box(ComicSkin.sb(Color("#1a1024"), 11, 3.5), br)
		var fr := clampf(_pts_shown / Dailies.WEEKLY_MAX_PTS, 0, 1)
		if fr > 0.01:
			var f := Rect2(br.position + Vector2(4, 4), Vector2((br.size.x - 8) * fr, br.size.y - 8))
			pn.draw_style_box(ComicSkin.sb(YEL, 7), f)
			pn.draw_line(f.position + Vector2(6, 3.5), Vector2(f.end.x - 4, f.position.y + 3.5), Color(1, 1, 1, 0.5), 2.0))
	_content.add_child(pn)
	_anim_in[pn] = 0.55
	pn.set_meta("redraw", true)
	_txt(pn, "HAFTA PUANI", 16, Color(1, 1, 1, 0.75), "", Vector2(18, 14), 200)
	_pts_l = _txt(pn, "0", 44, YEL, UIK.ink_stroke(2.6, 3.4), Vector2(18, 30), 200)
	_txt(pn, "/ " + str(Dailies.WEEKLY_MAX_PTS), 18, Color(1, 1, 1, 0.6), "", Vector2(18 + 80, 50), 100)
	# kademe ödülleri (çubuğun üstünde)
	for i in Dailies.WEEKLY_TIERS.size():
		var T: Dictionary = Dailies.WEEKLY_TIERS[i]
		var taken: bool = (d.q.tiers as Array).has(i)
		var ready := not taken and d.tier_ready(i)
		var x := 18.0 + 4 + (w - 36 - 8) * float(T.pts) / Dailies.WEEKLY_MAX_PTS
		var m := Node2D.new()
		m.position = Vector2(minf(x, w - 34), 58)
		var col := YEL if ready else (GREEN if taken else Color("#4a4258"))
		m.draw.connect(func():
			if ready:
				var k := fmod(_t, 1.0)
				m.draw_circle(Vector2.ZERO, 26 + k * 10, Color(YEL, 0.35 * (1.0 - k)))
			m.draw_circle(Vector2(2, 3), 25, INK)
			m.draw_circle(Vector2.ZERO, 25, INK)
			m.draw_circle(Vector2.ZERO, 21, col))
		var tx := _reward_tex(T.reward)
		if tx:
			var sp := Sprite2D.new()
			sp.texture = tx
			sp.scale = Vector2.ONE * (36.0 / tx.get_width())
			if taken: sp.modulate = Color(0.8, 0.8, 0.8, 0.75)
			m.add_child(sp)
		_txt(m, str(int(T.pts)), 14, Color.WHITE, UIK.ink_stroke(1.4, 1.6), Vector2(-20, 24), 40).align = 0.5
		if taken: _check(m, Vector2(16, -16))
		pn.add_child(m)
		if ready:
			m.set_meta("wiggle", true)
			var ii := i
			_btn(m, Rect2(-30, -30, 60, 60), func(): _claim_tier(ii, m))
	return y + h

func _sec_quests(d: Dailies, y: float) -> float:
	var rows := []
	var done_n := 0
	for def in Dailies.WEEKLY_QUESTS:
		var cur := mini(d.prog(def), int(def.need))
		var ok := d.done(def)
		var tk := d.claimed_quest(def.id)
		if ok: done_n += 1
		rows.append({"def": def, "cur": cur, "ok": ok, "taken": tk, "p": minf(1.0, float(cur) / float(def.need)), "rank": 2 if tk else (0 if ok else 1)})
	rows.sort_custom(func(a, b):
		if a.rank != b.rank: return a.rank < b.rank
		return a.p > b.p)
	_ribbon(y, "HAFTALIK GÖREVLER", str(done_n) + " / " + str(rows.size()) + " TAMAM", 0.65)
	y += 46
	var w := _W.x - 32
	var h := 78.0
	var j := 0
	for r in rows:
		var def: Dictionary = r.def
		var st := "taken" if r.taken else ("ready" if r.ok else "prog")
		var n := Node2D.new()
		n.position = Vector2(16 + w * 0.5, y + h * 0.5)
		var fill := Color("#2f7a4a") if st == "ready" else Color("#2a1838")
		var p: float = r.p
		n.draw.connect(func():
			var rr := Rect2(-w * 0.5, -h * 0.5, w, h)
			if st == "ready":
				var k := fmod(_t, 1.2) / 1.2
				n.draw_style_box(ComicSkin.sb(Color(0, 0, 0, 0), 14 + k * 6, 3.0, Color(YEL, 0.6 * (1.0 - k))), rr.grow(2 + k * 7))
			ComicSkin.panel(n, rr, fill, 12, 4.0, Vector2(3, 5))
			if st == "taken": n.draw_style_box(ComicSkin.sb(Color(0, 0, 0, 0.35), 12), rr)
			# ilerleme
			var br := Rect2(rr.position.x + 14, 10, w - 130, 16)
			n.draw_style_box(ComicSkin.sb(Color("#160c20"), 8, 3.0), br)
			if p > 0.01:
				var f := Rect2(br.position + Vector2(3, 3), Vector2((br.size.x - 6) * p, br.size.y - 6))
				n.draw_style_box(ComicSkin.sb(YEL if p >= 1.0 else GREEN, 5), f))
		_content.add_child(n)
		_anim_in[n] = 0.7 + j * 0.06
		_txt(n, str(def.label), 20, Color.WHITE, UIK.ink_stroke(1.8, 2.2), Vector2(-w * 0.5 + 14, -h * 0.5 + 9), w - 130)
		_txt(n, ShopPage.fmt_tr(int(r.cur)) + " / " + ShopPage.fmt_tr(int(def.need)), 13, Color.WHITE, UIK.ink_stroke(1.2, 1.2), Vector2(-w * 0.5 + 14, 9), w - 130).align = 0.5
		# ödül + düğme (sağ)
		var tx := _reward_tex(def.reward)
		if tx:
			var sp := Sprite2D.new()
			sp.texture = tx
			sp.scale = Vector2.ONE * (30.0 / tx.get_width())
			sp.position = Vector2(w * 0.5 - 92, -12)
			n.add_child(sp)
		_txt(n, "+" + str(int(def.reward.get("amount", 1))), 14, YEL, UIK.ink_stroke(1.2, 1.4), Vector2(w * 0.5 - 122, 6), 60).align = 0.5
		var b := Node2D.new()
		b.position = Vector2(w * 0.5 - 38, 0)
		b.draw.connect(func():
			if st == "ready":
				ComicSkin.panel(b, Rect2(-28, -20, 56, 40), YEL, 12, 3.5, Vector2(2, 4))
			elif st == "prog":
				ComicSkin.panel(b, Rect2(-28, -15, 56, 30), Color("#3a2c4a"), 10, 3.0, Vector2(2, 3), false))
		n.add_child(b)
		if st == "ready":
			_txt(b, "AL!", 22, INK, "", Vector2(-28, -14), 56).align = 0.5
			var qid: String = def.id
			_btn(b, Rect2(-34, -26, 68, 52), func(): _claim_quest(qid, n))
			b.set_meta("bob", true)
		elif st == "prog":
			_txt(b, "+" + str(int(def.pts)) + " P", 14, Color(1, 1, 1, 0.8), "", Vector2(-28, -10), 56).align = 0.5
		else:
			_check(b, Vector2.ZERO)
		y += h + 10
		j += 1
	return y

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

# ═════════════ ödül alma ═════════════

func _claim_daily() -> void:
	var d: Dailies = g.dailies
	if d == null or d.claimed_today():
		g.audio.play("error")
		return
	var day := int(d.q.slot)
	var r = d.claim_daily()
	var n: Node2D = _day_nodes.get(day)
	_reward(r, n)
	_stamps[day] = _t
	Input.vibrate_handheld(35)

func _claim_quest(id: String, n: Node2D) -> void:
	var r = g.dailies.claim_quest(id)
	if r == null:
		g.audio.play("error")
		return
	g.audio.play("claim")
	_reward(r, n)

func _claim_tier(i: int, n: Node2D) -> void:
	var r = g.dailies.claim_tier(i)
	if r == null:
		g.audio.play("error")
		return
	g.audio.play("tierclaim")
	_reward(r, n)

## ödülü ver + kutlama: kıvılcım, halka, para uçuşu; ardından içerik yeniden kurulur
func _reward(r, n: Node2D) -> void:
	var toast = g.grant_quest_reward(r)
	if toast == null:
		g.audio.play("error")
		return
	var at := _local_of(n) if n else _W * 0.5
	_burst(at, YEL, 26)
	_rings.append([at, _t])
	g.ui.toast(str(toast))
	var kind := String(r.kind)
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
	# damga / durum görünsün diye kısa gecikmeyle yeniden kur (kaydırma korunur)
	get_tree().create_timer(0.9).timeout.connect(func():
		if not visible: return
		var keep := _scroll
		_rebuild_content()
		_scroll = clampf(keep, 0.0, _scroll_max))
	g.ui.menu._top()

func _rebuild_content() -> void:
	for c in _content.get_children(): c.queue_free()
	_qbtns = _qbtns.filter(func(B): return not _content.is_ancestor_of(B.node))
	_day_nodes.clear()
	var keep_anim := {}
	for k in _anim_in:
		if is_instance_valid(k) and not _content.is_ancestor_of(k): keep_anim[k] = _anim_in[k]
	_anim_in = keep_anim
	_build_content()
	for k in _anim_in.keys():
		if _content.is_ancestor_of(k): _anim_in[k] = -10.0      # yeniden kurulumda giriş animasyonu yok

func _local_of(n: Node2D) -> Vector2:
	return get_global_transform().affine_inverse() * n.get_global_transform().origin

func _burst(at: Vector2, col: Color, cnt: int) -> void:
	for i in cnt:
		var a := randf() * TAU
		var v := randf_range(120, 380)
		var life := randf_range(0.4, 0.8)
		_parts.append({"p": at, "v": Vector2(cos(a), sin(a)) * v + Vector2(0, -80), "life": life, "max": life, "col": [col, Color.WHITE, Color("#ff8a2a")][i % 3], "s": randf_range(2.5, 5.0)})

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
	# ALINDI! damgaları (gün kartının üstünde)
	for day in _stamps:
		var n: Node2D = _day_nodes.get(day)
		if n == null or not is_instance_valid(n): continue
		var k := clampf((_t - float(_stamps[day])) / 0.32, 0, 1)
		var s := lerpf(2.6, 1.0, k * k)
		var c := _local_of(n)
		_fx.draw_set_transform(c, -0.25, Vector2.ONE * s)
		var a := minf(1.0, k * 3.0)
		_fx.draw_style_box(ComicSkin.sb(Color(PAPER, 0.85 * a), 6), Rect2(-50, -18, 100, 36))
		_fx.draw_style_box(ComicSkin.sb(Color(0, 0, 0, 0), 6, 4.0, Color(RED, a)), Rect2(-50, -18, 100, 36))
		_fx.draw_string(UIK.font(false, 1000, 1.0), Vector2(-50, 10), I18n.t("ALINDI!"), HORIZONTAL_ALIGNMENT_CENTER, 100, 26, Color(RED, a))
		_fx.draw_set_transform(Vector2.ZERO)

# ═════════════ dokunma (yerel düğmeler + kaydırma) ═════════════

func _btn(node: Node2D, rect: Rect2, cb: Callable) -> void:
	_qbtns.append({"node": node, "rect": rect, "cb": cb})

func _hit(pos: Vector2):
	for i in range(_qbtns.size() - 1, -1, -1):
		var B: Dictionary = _qbtns[i]
		var nd: Node2D = B.node
		if not is_instance_valid(nd) or not nd.is_visible_in_tree(): continue
		# kaydırılan içerikteki düğme: görünür alanın dışındaysa dokunulmaz
		if _content.is_ancestor_of(nd) and not _qclip.get_global_rect().has_point(pos): continue
		var lp: Vector2 = nd.get_global_transform_with_canvas().affine_inverse() * pos
		if (B.rect as Rect2).has_point(lp): return B
	return null

func _input(ev: InputEvent) -> void:
	if not visible: return
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
		s = [1.0, 0.0, 1.0]
		_qsprings[n] = s
	s[2] = tgt
	if tgt < 1.0: s[1] -= 1.5

func _process(dt: float) -> void:
	if not visible or _content == null: return
	_t += dt
	# kaydırma: savurma + kenar yayı
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
	# yaylar
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
	# giriş: sırayla fırlayarak yerine oturur
	for n in _anim_in.keys():
		if not is_instance_valid(n):
			_anim_in.erase(n)
			continue
		var k := clampf((_t - float(_anim_in[n])) / 0.34, 0, 1)
		if float(_anim_in[n]) < -5.0: k = 1.0
		if not _qsprings.has(n):
			(n as Node2D).scale = Vector2.ONE * (ScrLevelUp._back_ease(k) if k < 1.0 else 1.0) if k > 0.0 else Vector2.ZERO
		if k >= 1.0: _anim_in.erase(n)
	# canlı süsler: zıplayan bugünün kartı, sallanan hazır ödül, nabızlar
	for c in _content.find_children("*", "Node2D", true, false):
		var nd := c as Node2D
		if nd.has_meta("bob") and not _qsprings.has(nd) and not _anim_in.has(nd):
			nd.scale = Vector2.ONE * (1.0 + sin(_t * 5.0) * 0.035)
		if nd.has_meta("wiggle") and not _qsprings.has(nd):
			nd.rotation = sin(_t * 9.0) * 0.12 * maxf(0.0, sin(_t * 1.8))
		if nd.has_meta("pulse") or nd.has_meta("redraw") or nd.has_meta("bob") or nd.has_meta("wiggle"): nd.queue_redraw()
	for day in _day_nodes:
		var dn: Node2D = _day_nodes[day]
		if is_instance_valid(dn): dn.queue_redraw()
	# puan sayacı
	if g.dailies and _pts_l:
		var to := float(g.dailies.points())
		if absf(_pts_shown - to) > 0.01:
			_pts_shown = move_toward(_pts_shown, to, maxf(1.0, to) * dt / 0.7)
			_pts_l.text = str(int(round(_pts_shown)))
	# cüzdan zıplaması
	for key in _bump.keys():
		var kb := (_t - float(_bump[key])) / 0.3
		var lab: UIText = _gold_l if key == "gold" else _gem_l
		var chip := lab.get_parent() as Node2D
		if kb >= 1.0:
			_bump.erase(key)
			chip.scale = Vector2.ONE
		else:
			chip.scale = Vector2.ONE * (1.0 + 0.12 * sin(kb * PI))
	# kıvılcımlar
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
	for day in _stamps.keys():
		if _t - float(_stamps[day]) > 1.0: _stamps.erase(day)
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
	g.ui.menu.refresh_wallet(true)
	g.ui.menu._top()
