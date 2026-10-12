class_name HeroesPage
extends Node2D
## ui.js renderChars — KAHRAMAN sayfası: 3 sütunlu kart ızgarası (CHARACTERS sırası).
## Kart durumu: gizemli (kart yok / kart var), sahip (ilerleme), geliştirilebilir, azami;
## seçili kahraman "SEÇİLİ" rozeti ve gümüş hale taşır. Kart sanatı yakalamada; çubuk
## yazısı/dolumu ve seviye burada yazılır. Dokununca kahraman detayı açılır.
## Yakalama: pg_kahraman (kabuk) · hc_<id>_<m0|mp|own|up|max>[_sel].

const COLS := 3
const GAP_X := 10.0
const GAP_Y := 14.0

var menu
var g
var shell: Lyr
var grid: Lyr.N
var _cards: Array = []

func _init(m) -> void:
	menu = m
	g = m.g
	name = "Heroes"

func render() -> void:
	if shell == null:
		shell = Lyr.make("pg_kahraman", [".hc"])
		add_child(shell)
		shell.stretch_h(Scr.dh_of(self))
		grid = shell.find("#char-grid")
		if shell.nodes[0].scroller: menu.scroll_area(shell, shell.nodes[0])
	for C in _cards:
		menu.unbtn(C)
		(C as Node).queue_free()
	_cards.clear()
	var host: Node2D = grid.host if grid else shell.nodes[0].host
	var colw := (grid.size.x - 8.0 - GAP_X * (COLS - 1)) / COLS if grid else 111.3
	var x0 := 4.0
	var y := 10.0
	var row_h := 0.0
	var i := 0
	for id in D.CHARACTERS:
		var key := _key(String(id))
		if not FileAccess.file_exists(Lyr.BASE + key + ".json"): continue
		var C := Lyr.make(key)
		host.add_child(C)
		_cards.append(C)
		var col := i % COLS
		if col == 0 and i > 0:
			y += row_h + GAP_Y
			row_h = 0.0
		C.position = Vector2(x0 + col * (colw + GAP_X), y)
		row_h = maxf(row_h, C.nodes[0].size.y)
		_texts(C, String(id))
		var cid := String(id)
		menu.btn(C, C.nodes[0], func(): g.audio.play("click"); g.ui.open_char_detail(cid), 0.96)
		i += 1

func _key(id: String) -> String:
	var owned: bool = g.owns_char(id)
	var cards: int = g.char_card_count(id)
	var need = g.cards_for_next(id)
	var st := ""
	if not owned: st = "mp" if cards > 0 else "m0"
	elif need == null: st = "max"
	elif g.can_upgrade_char(id): st = "up"
	else: st = "own"
	var sel: bool = owned and g.meta.selectedChar == id
	return "hc_" + id + "_" + st + ("_sel" if sel else "")

func _texts(C: Lyr, id: String) -> void:
	var owned: bool = g.owns_char(id)
	var cards: int = g.char_card_count(id)
	var need = g.cards_for_next(id)
	var bar := C.find(".hc-bar")
	if bar:
		var b := C.find_exact("b")
		var fill: Lyr.N = null
		for k in bar.kids:
			if k.d.get("tag") == "i": fill = k
		if not owned and cards > 0:
			if b: C.set_text(b, str(cards) + "/" + str(int(need) if need != null else 2))
			UIK.set_fill(C, fill, bar.size.x, float(cards) / maxf(1.0, float(need if need != null else 2)))
		elif owned and need != null and not g.can_upgrade_char(id):
			if b: C.set_text(b, str(cards) + "/" + str(int(need)))
			UIK.set_fill(C, fill, bar.size.x, float(cards) / maxf(1.0, float(need)))
	var lv := C.find(".hc-lvl")
	if lv and owned: C.set_text(lv, str(g.char_level(id)))
