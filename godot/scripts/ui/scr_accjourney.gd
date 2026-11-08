class_name ScrAccJourney
extends Scr
## ui.js showAccountJourney / renderAccountJourney — HESAP YOLCULUĞU: seviye rozeti +
## dikey ray (her kilometre taşında sandık; geçilen · sıradaki · kilitli).
## Yakalama: aj (ray boş) + aj_<tür>_<done|next|locked> düğümleri (ray üzerindeki yerinde).

var L: Lyr
var _items: Array = []

func _init(game) -> void:
	super(game)
	name = "AccJourney"

## bekleyen ödülün sağ üstünde zıplayan "AL!" etiketi
func _al_tag(N: Lyr) -> void:
	var R: Vector2 = N.nodes[0].size
	var tg := Node2D.new()
	tg.position = Vector2(R.x - 30, 14)
	tg.rotation = 0.16
	var t0 := Time.get_ticks_msec()
	tg.draw.connect(func():
		var tt := (Time.get_ticks_msec() - t0) / 1000.0
		tg.draw_set_transform(Vector2(0, -3.0 * absf(sin(tt * 4.0))), 0.0, Vector2.ONE)
		tg.draw_style_box(ComicSkin.sb(ComicSkin.INK, 6), Rect2(-24, -12, 50, 26))
		tg.draw_style_box(ComicSkin.sb(Color("#e8323c"), 6), Rect2(-26, -14, 50, 24))
		tg.draw_string(UIK.font(true, 900), Vector2(-26, 5), "AL!", HORIZONTAL_ALIGNMENT_CENTER, 50, 16, Color.WHITE))
	N.add_child(tg)
	var tw := tg.create_tween().set_loops()
	tw.tween_callback(func(): if is_instance_valid(tg) and tg.is_visible_in_tree(): tg.queue_redraw()).set_delay(0.033)

func _claim(level: int) -> void:
	var ch = g.aj_claim(level)
	if ch == null: return
	g.audio.play("claim")
	close()
	if g.ui.menu: g.ui.menu.refresh_lv_dot()
	g.ui.chest_ceremony(str(ch), -1, func():
		g.ui.refresh_wallet()
		g.ui.show_menu()
		if g.ui.menu: g.ui.menu.refresh_lv_dot())

func open() -> void:
	if L:
		unbtn(L)
		L.queue_free()
	_items.clear()
	L = Lyr.make("aj")
	add_child(L)
	L.stretch_h(Scr.dh_of(self))
	var sc := L.find(".aj-scroll")
	if sc: scroll_area(L, sc)
	btn(L, L.find_id("#aj-close"), func(): g.audio.play("click"); close())
	# boşluğa (başlık dışı) dokunmak kapatmaz: tam ekran sahne
	var lvl: int = g.account_level()
	var pr: Dictionary = g.account_progress()
	var ms: Array = D.accountJourneyMilestones(maxi(lvl + 14, 33))
	var next_lv := -1
	var next_ch := ""
	for m in ms:
		if int(m.level) > lvl:
			next_lv = int(m.level)
			next_ch = str(m.chest)
			break
	# ── üst kart: seviye madalyonu + XP çubuğu + sıradaki ödül ──
	var intro := L.find(".aj-intro")
	if intro:
		for k in intro.kids: L.set_hidden(k, true)
		var IR: Vector2 = intro.size
		var hd := Node2D.new()
		var t0 := Time.get_ticks_msec()
		var xpk: float = clampf(float(pr.cur) / maxf(1.0, float(pr.need)), 0.0, 1.0)
		var fb := UIK.font(true, 900)
		var fs := UIK.font(false, 700)
		var nxt_name := str(ChestSystem.chests().get(next_ch, {}).get("name", ""))
		hd.draw.connect(func():
			var tt := (Time.get_ticks_msec() - t0) / 1000.0
			var R := Rect2(Vector2.ZERO, IR)
			hd.draw_style_box(ComicSkin.sb(Color(0, 0, 0, 0.5), 16), Rect2(R.position + Vector2(0, 5), R.size))
			hd.draw_style_box(ComicSkin.sb(Color("#1d1016"), 16, 2.0, Color("#e9c98a")), R)
			hd.draw_style_box(ComicSkin.sb(Color(1, 0.8, 0.4, 0.06), 14), Rect2(R.position + Vector2(3, 3), Vector2(R.size.x - 6, R.size.y * 0.45)))
			# madalyon
			var c := Vector2(42, R.size.y * 0.5)
			for k in 3: hd.draw_circle(c, 34 - k * 0.5 + 3.0 * sin(tt * 2.2) * (1 - k) * 0.3, Color(1, 0.75, 0.3, 0.05 + k * 0.03))
			hd.draw_circle(c, 29, ComicSkin.INK)
			hd.draw_circle(c, 27, Color("#e9c98a"))
			hd.draw_circle(c, 23, Color("#5a2c10"))
			for k in 12:
				var a := tt * 0.6 + k * TAU / 12.0
				hd.draw_circle(c + Vector2(cos(a), sin(a)) * 25.0, 1.2, Color("#fff0c0"))
			hd.draw_string(fb, Vector2(c.x - 30, c.y + 9), str(lvl), HORIZONTAL_ALIGNMENT_CENTER, 60, 26, Color("#fff1c8"))
			# başlık + XP
			var x0 := 84.0
			var w := R.size.x - x0 - 14.0
			hd.draw_string(fb, Vector2(x0, 24), "HESAP SEVİYESİ " + str(lvl), HORIZONTAL_ALIGNMENT_LEFT, w, 15, Color("#fff1d6"))
			var br := Rect2(x0, 34, w, 12)
			hd.draw_style_box(ComicSkin.sb(Color("#0a0508"), 6, 1.5, Color(0, 0, 0, 0.8)), br)
			if xpk > 0.0:
				var fr := Rect2(br.position + Vector2(2, 2), Vector2((br.size.x - 4) * xpk, br.size.y - 4))
				hd.draw_style_box(ComicSkin.sb(Color("#f0a030"), 4), fr)
				hd.draw_style_box(ComicSkin.sb(Color(1, 1, 1, 0.25), 4), Rect2(fr.position, Vector2(fr.size.x, fr.size.y * 0.45)))
			hd.draw_string(fs, Vector2(x0, 62), str(int(pr.cur)) + " / " + str(int(pr.need)) + " XP", HORIZONTAL_ALIGNMENT_LEFT, w, 10, Color(1, 0.9, 0.75, 0.85))
			if next_lv > 0:
				hd.draw_string(fs, Vector2(x0, 62), "SIRADAKİ: SV " + str(next_lv) + " · " + nxt_name, HORIZONTAL_ALIGNMENT_RIGHT, w, 10, Color("#ffcf6a")))
		intro.node.add_child(hd)
		_tick_redraw(hd)
	# ── ödül rayı: özel kartlar ──
	var rail := L.find_id("#aj-rail")
	if rail == null:
		visible = true
		return
	for k in rail.kids: L.set_hidden(k, true)
	var W: float = rail.size.x
	var step := 96.0
	var CH := 84.0
	var pend: Array = g.aj_pending()
	var h := 0.0
	var line := Node2D.new()
	var nms := ms.size()
	line.draw.connect(func():
		var y1 := (nms - 1) * step + CH * 0.5
		line.draw_line(Vector2(22, CH * 0.5), Vector2(22, y1), Color(0, 0, 0, 0.6), 6.0)
		line.draw_line(Vector2(22, CH * 0.5), Vector2(22, y1), Color("#3a2a20"), 3.0)
		var done_n := 0
		for m in ms:
			if int(m.level) <= lvl: done_n += 1
		if done_n > 0:
			line.draw_line(Vector2(22, CH * 0.5), Vector2(22, CH * 0.5 + maxf(0, done_n - 1) * step + (step * 0.5 if done_n < nms else 0.0)), Color("#e9b456"), 3.0))
	rail.host.add_child(line)
	for i in nms:
		var m: Dictionary = ms[i]
		var lv_i := int(m.level)
		var st := "claimed"
		if pend.has(lv_i): st = "ready"
		elif lv_i > lvl: st = "next" if lv_i == next_lv else "locked"
		var card := _row(W, CH, lv_i, str(m.chest), st)
		card.position = Vector2(0, i * step)
		rail.host.add_child(card)
		_items.append(card)
		if st == "ready":
			var nd: Node2D = card
			var LV := lv_i
			card.set_meta("tap", func(): _claim(LV))
		h = card.position.y + CH
	# kaydırma boyu kart sayısına göre
	var new_h := h + 24.0
	var d_rail := new_h - rail.size.y
	rail.size.y = new_h
	if sc:
		var S = sc.d.get("scroll")
		if S is Dictionary: S.h = float(S.h) + d_rail
		# kart dokunuşları (kaydırma alanı içinde)
		_rail_n = rail
		# sıradaki/hazır ödül görünür olsun
		var fi := 0
		for i in nms:
			if pend.has(int(ms[i].level)) or int(ms[i].level) == next_lv:
				fi = i
				break
		L.set_scroll(sc, clampf(fi * step - sc.size.y * 0.3, 0.0, L.scroll_max(sc)))
	visible = true
	fade_show()
	g.ui.menu.visible = false     # hideAllScreens: menü arkada çizilmez
	g.audio.play("panel")

var _rail_n = null

## ray kartı: sol seviye düğmesi + sandık + ad/durum + sağda AL! / tik / kilit
func _row(W: float, CH: float, lv_i: int, chest: String, st: String) -> Node2D:
	var n := Node2D.new()
	var C: Dictionary = ChestSystem.chests().get(chest, {})
	var tex: Texture2D = UITex.get_tex("res://assets/ui/art/chest/t" + str(clampi(int(C.get("tier", 1)), 1, 7)) + ".png")
	var nm := str(C.get("name", "SANDIK"))
	var fb := UIK.font(true, 900)
	var fs := UIK.font(false, 700)
	var t0 := Time.get_ticks_msec()
	var gold := Color("#e9c98a")
	n.draw.connect(func():
		var tt := (Time.get_ticks_msec() - t0) / 1000.0
		var R := Rect2(44, 0, W - 46, CH)
		var pul := 0.5 + 0.5 * sin(tt * 4.0)
		if st == "ready":
			for k in 3: n.draw_style_box(ComicSkin.sb(Color(0, 0, 0, 0), 16 + k * 3, 3.0, Color(1, 0.8, 0.3, (0.35 - k * 0.1) * (0.5 + pul * 0.5))), R.grow(3 + k * 4))
		n.draw_style_box(ComicSkin.sb(Color(0, 0, 0, 0.5), 14), Rect2(R.position + Vector2(0, 4), R.size))
		var fill := Color("#2a1a12") if st == "ready" else (Color("#1c1216") if st != "locked" else Color("#141014"))
		var edge := Color("#ffd27a") if st == "ready" else (gold.darkened(0.2) if st == "next" else Color(gold, 0.25))
		n.draw_style_box(ComicSkin.sb(fill, 14, 2.0, edge), R)
		n.draw_style_box(ComicSkin.sb(Color(1, 1, 1, 0.05), 12), Rect2(R.position + Vector2(2, 2), Vector2(R.size.x - 4, R.size.y * 0.42)))
		# sandık
		var cc := Vector2(R.position.x + 46, CH * 0.5 + (sin(tt * 3.0) * 2.0 if st == "ready" else 0.0))
		n.draw_circle(cc, 30, Color(1, 0.7, 0.3, 0.10 if st != "locked" else 0.03))
		if tex:
			var sz := 58.0
			var md := Color(1, 1, 1, 1) if st != "locked" else Color(0.45, 0.42, 0.48, 1)
			if st == "claimed": md = Color(0.7, 0.68, 0.7, 0.85)
			n.draw_texture_rect(tex, Rect2(cc - Vector2(sz, sz) * 0.5, Vector2(sz, sz)), false, md)
		# yazılar
		var tx := R.position.x + 86
		var tc := Color("#fff1d6") if st != "locked" else Color(0.75, 0.7, 0.72)
		n.draw_string(fb, Vector2(tx, 34), nm, HORIZONTAL_ALIGNMENT_LEFT, R.size.x - 150, 15, tc)
		var sub: String = {"ready": "ÖDÜLÜN HAZIR!", "claimed": "ALINDI", "next": "SIRADAKİ ÖDÜL", "locked": "SEVİYE " + str(lv_i) + " ÖDÜLÜ"}[st]
		var sc2 := Color("#ffcf6a") if st == "ready" or st == "next" else Color(1, 0.85, 0.75, 0.55)
		n.draw_string(fs, Vector2(tx, 54), str(sub), HORIZONTAL_ALIGNMENT_LEFT, R.size.x - 150, 11, sc2)
		# sağ: AL! düğmesi / tik / kilit
		var rx := R.end.x - 44
		if st == "ready":
			var s := 1.0 + 0.06 * pul
			var br := Rect2(rx - 30 * s, CH * 0.5 - 18 * s, 60 * s, 36 * s)
			n.draw_style_box(ComicSkin.sb(ComicSkin.INK, 10), Rect2(br.position + Vector2(0, 4), br.size))
			n.draw_style_box(ComicSkin.sb(Color("#ff4a3a"), 10, 2.0, Color("#ffd0b0")), br)
			n.draw_style_box(ComicSkin.sb(Color(1, 1, 1, 0.22), 8), Rect2(br.position + Vector2(2, 2), Vector2(br.size.x - 4, br.size.y * 0.45)))
			n.draw_string(fb, Vector2(br.position.x, br.position.y + br.size.y * 0.5 + 6), "AL!", HORIZONTAL_ALIGNMENT_CENTER, br.size.x, 17, Color.WHITE)
		elif st == "claimed":
			n.draw_circle(Vector2(rx, CH * 0.5), 14, Color("#2fae55"))
			n.draw_polyline(PackedVector2Array([Vector2(rx - 6, CH * 0.5), Vector2(rx - 1.5, CH * 0.5 + 5), Vector2(rx + 7, CH * 0.5 - 5)]), Color.WHITE, 3.0, true)
		else:
			var lc := Vector2(rx, CH * 0.5)
			n.draw_style_box(ComicSkin.sb(Color(0, 0, 0, 0.35), 6, 1.5, Color(gold, 0.4)), Rect2(lc - Vector2(10, 4), Vector2(20, 16)))
			n.draw_arc(lc - Vector2(0, 4), 6, PI, TAU, 12, Color(gold, 0.5), 2.5)
		# raydaki seviye düğmesi
		var pc := Vector2(22, CH * 0.5)
		var on := st == "claimed" or st == "ready"
		n.draw_circle(pc, 17, ComicSkin.INK)
		n.draw_circle(pc, 15, Color("#e9b456") if on else (Color("#7a3a20") if st == "next" else Color("#2a2028")))
		n.draw_string(fb, Vector2(pc.x - 17, pc.y + 6), str(lv_i), HORIZONTAL_ALIGNMENT_CENTER, 34, 14, ComicSkin.INK if on else Color("#fff1d6")))
	_tick_redraw(n)
	return n

func _tick_redraw(n: Node2D) -> void:
	var tw := n.create_tween().set_loops()
	tw.tween_callback(func(): if is_instance_valid(n) and n.is_visible_in_tree(): n.queue_redraw()).set_delay(0.033)

## hazır kart dokunuşu (kaydırma ile karışmasın diye bırakışta)
var _downPos := Vector2.ZERO
func _unhandled_input(ev: InputEvent) -> void:
	if not visible or not (ev is InputEventScreenTouch): return
	var st := ev as InputEventScreenTouch
	if st.pressed:
		_downPos = st.position
		return
	if st.position.distance_to(_downPos) > 12.0: return
	for c in _items:
		if not (c is Node2D) or not c.has_meta("tap"): continue
		var lp: Vector2 = (c as Node2D).get_global_transform_with_canvas().affine_inverse() * st.position
		if Rect2(44, 0, 400, 84).has_point(lp):
			(c.get_meta("tap") as Callable).call()
			return

func _crect(key: String) -> Rect2:
	var R: Array = Lyr.load_json(key).get("rect", [0, 0, 0, 0])
	return Rect2(float(R[0]), float(R[1]), float(R[2]), float(R[3]))

func close() -> void:
	if not visible: return
	g.ui.menu.visible = true
	fade_hide(_close_now)

func _close_now() -> void:
	visible = false
	g.ui.menu.visible = true
	if L:
		unbtn(L)
		L.queue_free()
		L = null
	_items.clear()
