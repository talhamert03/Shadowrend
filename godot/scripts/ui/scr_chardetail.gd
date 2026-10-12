class_name ScrCharDetail
extends Scr
## ui.js openCharDetail — kahraman inceleme kartı: sahne (portre/ışınlar/folyo),
## seviye madalyonu, ad/unvan, stat şeridi, imza silahı/gücü, USTALIK, EVRİM,
## seviyeyle açılan yetenek yuvaları, SÜPER, geliştir/savaşa al.
## Yakalama: hd_<id>_<lock|own|up|sel|upsel|max|maxsel> (seviye 1); seviyeyle açılan
## yuvalar cda_<id>_<i>_on, keşfedilmiş evrim hde_<id>_found olarak bindirilir.

var L: Lyr
var id := ""
var _over: Array = []

func _init(game) -> void:
	super(game)
	name = "CharDetail"

func open(cid: String) -> void:
	id = cid
	_build()
	visible = true
	g.audio.play("panel")

func _state() -> String:
	if not g.owns_char(id): return "lock"
	var sel: bool = g.meta.selectedChar == id
	if g.cards_for_next(id) == null: return "maxsel" if sel else "max"
	if g.can_upgrade_char(id): return "upsel" if sel else "up"
	return "sel" if sel else "own"

func _build() -> void:
	if L:
		unbtn(L)
		L.queue_free()
	for o in _over: (o as Node).queue_free()
	_over.clear()
	L = Lyr.make("hd_" + id + "_" + _state())
	add_child(L)
	L.stretch_h(Scr.dh_of(self))
	var sheet := L.find(".hd-sheet")
	scroll_area(L, sheet)
	btn(L, L.find_id("#cd-close"), func(): g.audio.play("click"); close())
	var up := L.find(".hd-btn.kor")
	if up: btn(L, up, func(): _upgrade())
	var sb := L.find(".hd-select")
	if sb: btn(L, sb, func():
		g.audio.play("click")
		g.select_char(id)
		close())
	var sd := L.find(".hd-selected")
	if sd: btn(L, sd, func(): g.audio.play("click"); close())
	if g.owns_char(id): _texts()

func _texts() -> void:
	var c: Dictionary = D.CHARACTERS[id]
	var lvl: int = g.char_level(id)
	var lb := L.find_id("#hd-lvl")
	if lb:
		var b := L.find_exact("b")
		if b: L.set_text(b, str(lvl))
	var sub := L.find_id("#cd-subtitle")
	if sub: L.set_text(sub, str(c.get("title", "")) + " · SEVİYE " + str(lvl))
	# ustalık
	var M: Dictionary = Ledger.mastery(g.meta, id)
	var hm := L.find(".hd-mastery")
	if hm:
		var md := L.find(".hm-medal")
		if md and md.kids.size(): L.set_text(md.kids[0], str(M.lv))
		var mk := L.find(".hm-k")
		if mk: L.set_text(mk, "USTALIK" + (" · AZAMİ" if M.max else " · SV " + str(M.lv) + " / " + str(Ledger.MASTERY_MAX)))
		var bar := L.find(".hm-bar")
		if bar and bar.kids.size(): UIK.set_fill(L, bar.kids[0], bar.size.x, float(M.frac))
		var nt := L.find(".hm-note")
		if nt: L.set_text(nt, "TÜM KADEMELER AÇIK" if M.max else "SONRAKİ KADEMEYE " + str(int(M.toNext)) + " PUAN · KİYIM + ZAFER + BOSS")
	# evrim keşfedildiyse bindir
	var evo := L.find(".hd-evo")
	var found: bool = (g.meta.get("evo", []) as Array).has("evo_" + id)
	if evo and found: _overlay(evo, "hde_" + id + "_found")
	# seviyeyle açılan yuvalar
	var row := L.find(".cda-row")
	if row:
		var un: Array = D.signatureUnlocks(id, lvl)
		var i := 0
		for k in row.kids:
			if i < un.size() and not un[i].get("locked", true): _overlay(k, "cda_" + id + "_" + str(i) + "_on")
			i += 1
	# eylem bölümü
	var cards: int = g.char_card_count(id)
	var need = g.cards_for_next(id)
	var lvs := L.find_all(".hu-lv")
	if lvs.size() >= 1: L.set_text(lvs[0], "SV " + str(lvl))
	if lvs.size() >= 2: L.set_text(lvs[1], "SV " + str(lvl + 1))
	var hb := L.find(".hu-bar")
	if hb and need != null:
		for k in hb.kids:
			if k.d.get("tag") == "b": L.set_text(k, str(cards) + " / " + str(int(need)) + " KART")
			elif k.d.get("tag") == "i": UIK.set_fill(L, k, hb.size.x, float(cards) / maxf(1.0, float(need)))
	var cost := L.find(".hb-cost")
	if cost and cost.txt: L.set_text(cost, str(int(g.gold_for_next(id))))
	var mx := L.find(".hu-max")
	if mx: L.set_text(mx, "AZAMİ SEVİYE · SV " + str(lvl))

## yakalanan düğümün yerine başka bir yakalamayı bindir (aynı kutu)
func _overlay(n: Lyr.N, key: String) -> void:
	if not FileAccess.file_exists(Lyr.BASE + key + ".json"): return
	var O := Lyr.make(key)
	n.node.get_parent().add_child(O)
	O.position = n.node.position
	L.set_hidden(n, true)
	_over.append(O)

func _upgrade() -> void:
	if not g.can_upgrade_char(id):
		g.audio.play("error")
		return
	var old: int = g.char_level(id)
	if not g.upgrade_char(id): return
	g.audio.play("levelup")
	Input.vibrate_handheld(20)
	g.ui.toast("SEVİYE ATLADIN · SV " + str(old) + " → " + str(g.char_level(id)))
	g.ui.menu.refresh_wallet()
	_build()
	if g.ui.menu.pages.has("kahraman"): g.ui.menu.pages["kahraman"].render()

func close() -> void:
	visible = false
	if L:
		unbtn(L)
		L.queue_free()
		L = null
	for o in _over: (o as Node).queue_free()
	_over.clear()
	if g.ui.menu.pages.has("kahraman"): g.ui.menu.pages["kahraman"].render()
