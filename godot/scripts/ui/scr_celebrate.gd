class_name ScrCelebrate
extends Scr
## Kutlama katmanları (web canlandırmaları t=0'dan Lyr ile oynar):
##   hero_unlock(id) — ui.js showHeroUnlock: YENİ KAHRAMAN AÇILDI (kart karanlıktan döner,
##                     ışın + kıvılcım; 0,7 sn sonra dokunuş, 5 sn'de kendiliğinden kapanır)
##   level_up(p)     — ui.js showAccountLevelUp: HESAP SEVİYESİ YÜKSELDİ (+ seviye sandığı)
##   gift(G)         — ui.js _showGift: DÖNÜŞ HEDİYESİ (genel sayfa)

const RAR := ["", "ADİ", "NADİR", "DESTANSI", "EFSANE"]
var L: Lyr
var _t := 0.0
var _kind := ""
var _out := -1.0
var _queue: Array = []

func _init(game) -> void:
	super(game)
	name = "Celebrate"

func _show(key: String, kind: String) -> bool:
	if not FileAccess.file_exists(Lyr.BASE + key + ".json"): return false
	if L:
		unbtn(L)
		L.queue_free()
	L = Lyr.make(key)
	add_child(L)
	L.stretch_h(Scr.dh_of(self))
	_kind = kind
	_t = 0.0
	_out = -1.0
	L.modulate.a = 1.0
	visible = true
	return true

func hero_unlock(cid: String) -> void:
	if visible:
		_queue.append(["hero", cid])
		return
	var C: Dictionary = D.CHARACTERS.get(cid, {})
	var r := clampi(int(C.get("rarity", 1)), 1, 4)
	if not _show("hu_" + str(r), "hero"): return
	var card := L.find(".hu-card")
	if card:
		var img: Lyr.N = null
		for k in card.kids:
			if k.d.get("tag") == "img": img = k
		var pp := "res://assets/ui/art/portrait/" + cid + ".webp"
		if img and ResourceLoader.exists(pp):
			var pr := UIK.round_image(load(pp), img.size.x, img.size.y, 10.0, Vector2(0.5, 0.15))
			img.node.add_child(pr)
	EventsPage.txt(L, L.find(".hu-rar"), RAR[r])
	EventsPage.txt(L, L.find(".hu-name"), str(C.get("name", "")))
	var tt := L.find(".hu-title")
	if tt:
		if str(C.get("title", "")) != "": EventsPage.txt(L, tt, str(C.title))
		else: L.set_hidden(tt, true)
	btn(L, L.nodes[0], func():
		if _t > 0.7: _close(), 1.0, 0.0)
	g.audio.play("heroup")
	Input.vibrate_handheld(40)

func level_up(p: Dictionary) -> void:
	if visible:
		_queue.append(["lvl", p])
		return
	var rw: Array = p.get("rewards", [])
	var key := "alu_" + (str(rw[0].chest) if rw.size() else "0")
	if not _show(key, "lvl"): return
	var to := int(p.get("toLevel", 1))
	EventsPage.txt(L, L.find_id("#alu-level"), str(to))
	var bonus := minf(50.0, (to - 1) * 0.6)
	for v in L.find_all(".alu-stat-v"): EventsPage.txt(L, v, "+%" + ("%.1f" % bonus))
	if rw.size():
		var t := L.find(".alu-reward-t")
		if t:
			for k in t.kids:
				if k.d.get("tag") == "span": EventsPage.txt(L, k, "Seviye " + str(int(rw[0].level)) + " ödülü — ana ekranda seni bekliyor", 0.0)
	btn(L, L.find_id("#alu-close"), func(): g.audio.play("click"); _close(true))
	g.audio.play("levelup")
	g.ui.menu.render_slots()
	g.ui.refresh_wallet()

func gift(G: Dictionary) -> void:
	var c := "1" if G.get("chest") else "0"
	var f := "1" if G.get("full") else "0"
	var S: Lyr = g.ui.sheet.show_key("sh_gift_" + c + "_" + f, [func():
		g.ui.sheet.close()
		g.audio.play("claim")
		g.ui.refresh_wallet()])
	if S == null: return
	var hrs := float(G.get("h", 0))
	var h := int(floor(hrs))
	var mm := int(round((hrs - h) * 60.0))
	var gt := S.find(".gift-t")
	if gt and gt.txt:
		# "3 SA 30 DK uzaktaydın" (+ <b> SANDIK DOLDU): b metnin sağında kalır
		var dw := EventsPage.txt(S, gt, str(h) + " SA " + str(mm) + " DK uzaktaydın" + (" · " if f == "1" else ""), 0.5)
		for k in gt.kids:
			if k.d.get("tag") == "b": S.move(k, k.pos + Vector2(dw * 0.5, 0))
	var chips := S.find_all(".gift-chip")
	if chips.size(): EventsPage.txt(S, chips[0], "+" + JS.s(G.get("gold", 0)), 0.5)

func _close(quick := false) -> void:
	if _out >= 0.0: return
	_out = 0.0 if not quick else 0.2

func _process(dt: float) -> void:
	if not visible or L == null: return
	_t += dt
	if _kind == "hero" and _t > 5.0: _close()
	if _out >= 0.0:
		_out += dt
		L.modulate.a = maxf(0.0, 1.0 - _out / 0.38)
		if _out >= 0.38:
			visible = false
			unbtn(L)
			L.queue_free()
			L = null
			if _kind == "hero" and g.ui.menu.pages.has("magaza"): g.ui.menu.pages["magaza"].render()
			if _queue.size():
				var q = _queue.pop_front()
				if q[0] == "hero": hero_unlock(q[1])
				else: level_up(q[1])
