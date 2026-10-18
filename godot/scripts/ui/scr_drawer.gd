class_name ScrDrawer
extends Scr
## ui.js _dd / refreshQuestChip — GÜNLÜK çekmecesi: SAVAŞ BİLETİ + GÖREVLER kartları,
## etkinlik sayfasına kısa yol. Yakalama: dd (rozet yok) · dd_hot (alınacak ödül var).

var L: Lyr
var _t := 0.0
var _sheet: Lyr.N

func _init(game) -> void:
	super(game)
	name = "Drawer"

func open() -> void:
	var d = g.dailies
	if d: d.touch()
	var hot: bool = d != null and d.pending()
	if L:
		unbtn(L)
		L.queue_free()
	L = Lyr.make("dd_hot" if hot else "dd")
	add_child(L)
	L.stretch_h(Scr.dh_of(self))
	_sheet = L.find(".dd-sheet")
	_texts()
	btn(L, L.nodes[0], func(): close(), 1.0, 0.0)
	if _sheet: btn(L, _sheet, func(): pass, 1.0, 0.0)
	btn(L, L.find_id("#dd-close"), func(): g.audio.play("click"); close())
	btn(L, L.find_id("#bp-banner"), func():
		g.audio.play("click")
		close()
		g.ui.show_battle_pass())
	btn(L, L.find_id("#quest-open"), func():
		g.audio.play("click")
		close()
		g.ui.show_quests())
	btn(L, L.find_id("#dd-events"), func():
		g.audio.play("tab")
		close()
		g.ui.menu.set_page("etkinlik"))
	_t = 0.0
	visible = true

func _texts() -> void:
	var tier: int = g.bp_tier()
	var pr: Dictionary = g.bp_progress()
	EventsPage.txt(L, L.find_id("#bpb-tier"), str(tier), 0.5)
	EventsPage.txt(L, L.find_id("#bpb-txt"), str(int(pr.cur)) + "/" + str(int(pr.need)), 0.0)
	_fill("#bpb-fill", float(pr.cur) / maxf(1.0, float(pr.need)))
	var d = g.dailies
	if d:
		var pts: int = d.points()
		_fill("#quest-pts-fill", float(pts) / Dailies.WEEKLY_MAX_PTS)
		EventsPage.txt(L, L.find_id("#quest-teaser-sub"), "GÜNLÜK HAZIR" if not d.claimed_today() else (str(pts) + "/" + str(Dailies.WEEKLY_MAX_PTS) + " PUAN"), 0.0)
	var left: int = Journey.daily_left(g.meta)
	EventsPage.txt(L, L.find_id("#dd-ev-sub"), ("Bugün " + str(left) + " hedef kaldı") if left > 0 else "Bugünün hedefleri tamam", 0.0)

func _fill(id: String, fr: float) -> void:
	var f := L.find_id(id)
	if f == null: return
	var par: Lyr.N = L.by_id.get(str(f.d.parent))
	var full: float = (par.size.x - 2.0) if par else f.size.x
	fr = clampf(fr, 0.0, 1.0)
	L.set_hidden(f, fr <= 0.0)
	if fr > 0.0: L.fit_width(f, full * fr, false)

func close() -> void:
	if not visible: return
	visible = false
	if L:
		unbtn(L)
		L.queue_free()
		L = null
		_sheet = null

func _process(dt: float) -> void:
	if not visible or L == null or _t > 0.4: return
	_t += dt
	# .dd-sheet yukarıdan iner (260 ms), perde açılır
	var k := clampf(_t / 0.26, 0.0, 1.0)
	L.modulate.a = minf(1.0, k * 1.6)
	if _sheet:
		_sheet.extra = Transform2D(0, Vector2.ONE, 0, Vector2(0, -(1.0 - UIK.bez(0.2, 0.9, 0.3, 1.0, k)) * 24.0))
		L.set_dyn(_sheet)
