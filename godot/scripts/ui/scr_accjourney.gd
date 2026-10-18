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
