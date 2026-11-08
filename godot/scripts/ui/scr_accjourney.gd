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
	var lvl: int = g.account_level()
	EventsPage.txt(L, L.find_id("#aj-cur-level"), str(lvl), 0.5)
	var rail := L.find_id("#aj-rail")
	if rail == null:
		visible = true
		return
	var R: Array = Lyr.load_json("aj").get("rect", [0, 0, 0, 0])
	var rail0: Vector2 = Vector2(float(R[0]), float(R[1])) + L.rect_of(rail).position
	var a0 := _crect("aj_ahsap_done")
	var a1 := _crect("aj_yaygin_done")
	var step := a1.position.y - a0.position.y
	var x := a0.position.x - rail0.x
	var y0 := a0.position.y - rail0.y
	var ms: Array = D.accountJourneyMilestones(maxi(lvl + 12, 33))
	var next_lv := -1
	for m in ms:
		if int(m.level) > lvl:
			next_lv = int(m.level)
			break
	var h := 0.0
	for i in ms.size():
		var m: Dictionary = ms[i]
		var st := "done" if int(m.level) <= lvl else ("next" if int(m.level) == next_lv else "locked")
		var key := "aj_" + str(m.chest) + "_" + st
		if not FileAccess.file_exists(Lyr.BASE + key + ".json"): continue
		var N := Lyr.make(key)
		rail.host.add_child(N)
		N.position = Vector2(x, y0 + i * step)
		_items.append(N)
		var info := N.find(".aj-info")
		if info:
			for k in info.kids:
				if k.d.get("tag") == "span": EventsPage.txt(N, k, "Seviye " + str(int(m.level)) + " ödülü", 0.0)
		EventsPage.txt(N, N.find(".aj-pip"), str(int(m.level)), 0.5)
		if st == "done" and g.aj_pending().has(int(m.level)):
			var lv_i := int(m.level)
			_al_tag(N)
			btn(N, N.nodes[0], func(): _claim(lv_i), 0.96)
			for k in N.find_all(".aj-info"):
				for kk in k.kids:
					if kk.d.get("tag") == "span": EventsPage.txt(N, kk, "Seviye " + str(lv_i) + " ödülü · ALMAK İÇİN DOKUN", 0.0)
		h = N.position.y + N.nodes[0].size.y
	# ray çizgisi (::before) ve kaydırma boyu düğüm sayısına göre
	var new_h := maxf(rail.size.y, h + (rail.size.y - (y0 + 6 * step + _crect("aj_ahsap_done").size.y)))
	var d_rail := new_h - rail.size.y
	if absf(d_rail) > 0.1:
		for k in rail.kids:
			if String(k.d.key).ends_with("::before"): L.resize_h(k, k.size.y + d_rail)
		rail.size.y = new_h
		if sc:
			var S = sc.d.get("scroll")
			if S is Dictionary: S.h = float(S.h) + d_rail
	# sıradaki düğüm görünür olsun
	if sc and next_lv > 0:
		var ni := 0
		for i in ms.size():
			if int(ms[i].level) == next_lv: ni = i
		L.set_scroll(sc, clampf(y0 + ni * step - sc.size.y * 0.4, 0.0, L.scroll_max(sc)))
	visible = true
	fade_show()
	g.ui.menu.visible = false     # hideAllScreens: menü arkada çizilmez
	g.audio.play("panel")

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
