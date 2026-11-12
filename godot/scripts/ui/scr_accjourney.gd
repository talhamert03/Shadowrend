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
	# yakalamada kaydırma alanı tanımlı değil (içerik o an sığıyordu): ray kaydırılabilir olsun
	var J: Dictionary = Lyr.load_json("aj").duplicate(true)
	for nd in J.get("nodes", []):
		if nd is Dictionary and nd.get("key") == ".aj-scroll":
			var bx: Array = nd.get("box", [0, 0, 358, 645])
			nd["clip"] = [0, 0, 0, 0]
			nd["clipBox"] = [0, 0, float(bx[2]), float(bx[3])]
			nd["scroll"] = {"h": float(bx[3]), "ch": float(bx[3]), "top": 0}
	L = Lyr.new()
	L.build(J)
	if ComicSkin.auto_on("aj"): ComicSkin.auto(L)
	add_child(L)
	L.stretch_h(Scr.dh_of(self))
	var sc := L.find(".aj-scroll")
	if sc:
		scroll_area(L, sc)
		# kaydırılan kartlar başlığın üstüne taşmasın: alanın kendi boyutunda maske
		var mk: Node2D = sc.node
		var msz: Vector2 = sc.size
		mk.clip_children = CanvasItem.CLIP_CHILDREN_ONLY
		mk.draw.connect(func(): mk.draw_rect(Rect2(Vector2(-60, 0), msz + Vector2(120, 0)), Color.WHITE))
		mk.queue_redraw()
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
		var card := _row(W, CH, lv_i, str(m.chest), st, pr)
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

## ray kartı: sol seviye düğmesi + sandık + ad/durum + sağda AL! / tik / kilit (premium)
func _row(W: float, CH: float, lv_i: int, chest: String, st: String, pr: Dictionary = {}) -> Node2D:
	var n := Node2D.new()
	var C: Dictionary = ChestSystem.chests().get(chest, {})
	var tex: Texture2D = UITex.get_tex("res://assets/ui/art/chest/t" + str(clampi(int(C.get("tier", 1)), 1, 7)) + ".png")
	var nm := str(C.get("name", "SANDIK"))
	var cc0 := Color(str(C.get("color", "#e9c98a")))
	var fb := UIK.font(true, 900)
	var fs := UIK.font(false, 700)
	var t0 := Time.get_ticks_msec()
	var gold := Color("#e9c98a")
	var xpk: float = clampf(float(pr.get("cur", 0)) / maxf(1.0, float(pr.get("need", 1))), 0.0, 1.0)
	var xpl := int(maxf(0.0, float(pr.get("need", 0)) - float(pr.get("cur", 0))))
	n.draw.connect(func():
		var tt := (Time.get_ticks_msec() - t0) / 1000.0
		var R := Rect2(44, 0, W - 46, CH)
		var pul := 0.5 + 0.5 * sin(tt * 4.0)
		var lock := st == "locked"
		if st == "ready":
			for k in 3: n.draw_style_box(ComicSkin.sb(Color(0, 0, 0, 0), 16 + k * 3, 2.5, Color(1, 0.8, 0.3, (0.38 - k * 0.11) * (0.5 + pul * 0.5))), R.grow(3 + k * 4))
		elif st == "next":
			n.draw_style_box(ComicSkin.sb(Color(0, 0, 0, 0), 17, 2.0, Color(gold, 0.18 + 0.16 * pul)), R.grow(4))
		n.draw_style_box(ComicSkin.sb(Color(0, 0, 0, 0.5), 14), Rect2(R.position + Vector2(0, 5), R.size))
		var fill := Color("#22141a") if st == "ready" else (Color("#1a1218") if not lock else Color("#120e12"))
		var edge := Color("#ffd27a") if st == "ready" else (gold if st == "next" else Color(1, 1, 1, 0.08))
		n.draw_style_box(ComicSkin.sb(fill, 14, 1.5, edge), R)
		# üstten yumuşak ışık + sandık renginde sol şerit
		n.draw_polygon(PackedVector2Array([R.position + Vector2(2, 2), Vector2(R.end.x - 2, R.position.y + 2), Vector2(R.end.x - 2, R.position.y + CH * 0.5), R.position + Vector2(2, CH * 0.5)]),
			PackedColorArray([Color(1, 1, 1, 0.06), Color(1, 1, 1, 0.02), Color(1, 1, 1, 0.0), Color(1, 1, 1, 0.0)]))
		n.draw_style_box(ComicSkin.sb(Color(cc0, 0.35 if lock else 0.95), 2), Rect2(R.position.x, 14, 3, CH - 28))
		# sandık: renkli ışıma + simge
		var cc := Vector2(R.position.x + 46, CH * 0.5 + (sin(tt * 3.0) * 2.0 if st == "ready" else 0.0))
		for k in 4: n.draw_circle(cc, 34.0 - k * 7.0, Color(cc0, (0.035 if lock else 0.07) + k * 0.012))
		if tex:
			var sz := 64.0
			var md := Color(1, 1, 1, 1) if not lock else Color(0.42, 0.40, 0.46, 1)
			if st == "claimed": md = Color(0.72, 0.70, 0.74, 0.9)
			n.draw_texture_rect(tex, Rect2(cc - Vector2(sz, sz) * 0.5, Vector2(sz, sz)), false, md)
		# yazılar
		var tx := R.position.x + 90
		var tw := R.size.x - 160
		var tc := Color("#fff1d6") if not lock else Color(0.72, 0.68, 0.72)
		n.draw_string(fb, Vector2(tx, 32), nm, HORIZONTAL_ALIGNMENT_LEFT, tw, 15, tc)
		var sub: String = {"ready": "ÖDÜLÜN HAZIR", "claimed": "ALINDI", "next": "SIRADAKİ ÖDÜL", "locked": "SV " + str(lv_i) + "'TE AÇILIR"}[st]
		var sc2 := Color("#ffcf6a") if st == "ready" or st == "next" else (Color("#7fd69a") if st == "claimed" else Color(1, 1, 1, 0.38))
		n.draw_string(fs, Vector2(tx, 50), sub, HORIZONTAL_ALIGNMENT_LEFT, tw, 10.5, sc2)
		if st == "next":
			var br := Rect2(tx, 58, minf(tw, 120.0), 6)
			n.draw_style_box(ComicSkin.sb(Color(1, 1, 1, 0.08), 3), br)
			if xpk > 0.0: n.draw_style_box(ComicSkin.sb(Color("#f0a030"), 3), Rect2(br.position, Vector2(br.size.x * xpk, br.size.y)))
			n.draw_string(fs, Vector2(br.end.x + 6, 65), str(xpl) + " XP", HORIZONTAL_ALIGNMENT_LEFT, 60, 9.5, Color(1, 0.9, 0.7, 0.75))
		# sağ: AL! düğmesi / tik / kilit
		var rx := R.end.x - 40
		if st == "ready":
			var s := 1.0 + 0.05 * pul
			var bb := Rect2(rx - 30 * s, CH * 0.5 - 17 * s, 60 * s, 34 * s)
			n.draw_style_box(ComicSkin.sb(Color(0, 0, 0, 0.5), 10), Rect2(bb.position + Vector2(0, 3), bb.size))
			n.draw_style_box(ComicSkin.sb(Color("#f0a030"), 10, 1.5, Color("#ffe0a0")), bb)
			n.draw_style_box(ComicSkin.sb(Color(1, 1, 1, 0.25), 8), Rect2(bb.position + Vector2(2, 2), Vector2(bb.size.x - 4, bb.size.y * 0.42)))
			n.draw_string(fb, Vector2(bb.position.x, bb.position.y + bb.size.y * 0.5 + 6), "AL", HORIZONTAL_ALIGNMENT_CENTER, bb.size.x, 16, Color("#2a1406"))
		elif st == "claimed":
			n.draw_circle(Vector2(rx, CH * 0.5), 13, Color("#1f6b3a"))
			n.draw_arc(Vector2(rx, CH * 0.5), 13, 0, TAU, 28, Color("#7fd69a"), 1.5, true)
			n.draw_polyline(PackedVector2Array([Vector2(rx - 5.5, CH * 0.5), Vector2(rx - 1.5, CH * 0.5 + 4.5), Vector2(rx + 6, CH * 0.5 - 4.5)]), Color.WHITE, 2.5, true)
		else:
			var lc := Vector2(rx, CH * 0.5 + 3)
			var la := 0.55 if st == "next" else 0.3
			n.draw_style_box(ComicSkin.sb(Color(1, 1, 1, la * 0.25), 4, 1.2, Color(gold, la)), Rect2(lc - Vector2(8, 3), Vector2(16, 12)))
			n.draw_arc(lc - Vector2(0, 3), 5, PI, TAU, 12, Color(gold, la), 2.0, true)
		# raydaki seviye düğmesi
		var pc := Vector2(22, CH * 0.5)
		var on := st == "claimed" or st == "ready"
		if st == "next": n.draw_arc(pc, 19.0 + 2.0 * pul, 0, TAU, 32, Color(gold, 0.35 * (1.0 - pul) + 0.15), 2.0, true)
		n.draw_circle(pc, 16, Color("#0a0608"))
		n.draw_circle(pc, 14.5, Color("#e9b456") if on else (Color("#5a3420") if st == "next" else Color("#1e171c")))
		if on: n.draw_circle(pc + Vector2(-4, -5), 4.0, Color(1, 1, 1, 0.25))
		n.draw_arc(pc, 14.5, 0, TAU, 28, Color(gold, 0.9 if (on or st == "next") else 0.25), 1.2, true)
		n.draw_string(fb, Vector2(pc.x - 17, pc.y + 5), str(lv_i), HORIZONTAL_ALIGNMENT_CENTER, 34, 13, Color("#2a1406") if on else Color("#fff1d6")))
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
