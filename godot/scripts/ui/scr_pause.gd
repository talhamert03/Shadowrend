class_name ScrPause
extends Scr
## ui.js showPause — MÜHLET: başlık, yükleme çipleri (silah + rün, ikon · ad · Sv n),
## DEVAM ET / AYARLAR / MENÜYE DÖN. Ekran sütunu dikey ortalı: çip satırı sayısı
## değişince başlık yukarı, düğmeler aşağı kayar (yarım fark).

const ART := "res://assets/ui/art/"
static var _art := {}

var shell: Lyr
var chips: Array = []

func _init(game) -> void:
	super(game)
	name = "Pause"

static func art() -> Dictionary:
	if _art.is_empty():
		var f := FileAccess.open(ART + "art.json", FileAccess.READ)
		_art = JSON.parse_string(f.get_as_text()) if f else {"icon": {}}
	return _art

static func icon_tex(id: String) -> Texture2D:
	var p := ART + "icon/" + id + ".png"
	if not ResourceLoader.exists(p): p = ART + "icon/guc.png"
	return load(p)

static func icon_col(id: String) -> Color:
	var I: Dictionary = art().get("icon", {}).get(id, {})
	return JS.col(I.get("col", "#e8e4d8"))

static func display_name(id: String) -> String:
	var I: Dictionary = art().get("icon", {}).get(id, {})
	return str(I.get("name", id))

func show_pause() -> void:
	if shell == null:
		shell = Lyr.make("pause", [".ld-item"])
		add_child(shell)
		btn(shell, shell.find("#btn-resume"), func(): g.audio.play("click"); g.resume_game())
		btn(shell, shell.find("#btn-pause-settings"), func(): g.audio.play("click"); g.ui.show_settings())
		btn(shell, shell.find("#btn-quit"), func(): g.audio.play("click"); g.quit_to_menu())
	shell.restart()
	shell.stretch_h(Scr.dh_of(self))
	for c in chips: c.queue_free()
	chips.clear()
	var w = g.weapons
	var items := []
	for id in w.slots: items.append([str(id), "Sv " + str(w.slots[id])])
	for id in w.passives: items.append([str(id), "Sv " + str(w.passives[id])])
	_layout_chips(items)
	visible = true

func _layout_chips(items: Array) -> void:
	var box := shell.find("#pause-loadout")
	var br := shell.rect_of(box)
	var maxw := minf(420.0, UIK.ui_size(get_viewport()).x - 48.0)
	var made := []
	for it in items:
		var C := Lyr.make("pause_chip")
		var nm := C.find_exact("span")
		var lv := C.find(".ld-lv")
		var sv := C.find("svg")
		C.set_text(nm, display_name(it[0]))
		C.set_text(lv, it[1])
		if sv and sv.img is Sprite2D:
			var spr := sv.img as Sprite2D
			spr.texture = icon_tex(it[0])
			spr.position = Vector2.ZERO
			spr.scale = Vector2.ONE * (15.0 / 120.0)
			var I: Dictionary = art().get("icon", {}).get(it[0], {})
			spr.modulate = icon_col(it[0]) if I.get("mono", true) else Color.WHITE
		# çip genişliği: 1 + 12 + 15 + 7 + ad + 7 + düzey + 12 + 1
		var w: float = 1 + 12 + 15 + 7 + nm.txt.text_width() + 7 + lv.txt.text_width() + 12 + 1
		var dw: float = w - C.nodes[0].size.x
		C.fit_width(C.nodes[0], w, false)
		C.move(lv, lv.pos + Vector2(dw, 0))
		made.append(C)
	if items.is_empty():
		var C2 := Lyr.make("pause_chip")
		C2.set_text(C2.find_exact("span"), "Henüz rün yok")
		C2.set_hidden(C2.find("svg"), true)
		C2.set_hidden(C2.find(".ld-lv"), true)
		made.append(C2)
	# satırlara sar (gap 8), her satır ortalı
	var rows := []
	var cur := []
	var cw := 0.0
	for C in made:
		var w2: float = C.nodes[0].size.x
		if cur.size() and cw + 8 + w2 > maxw:
			rows.append([cur, cw]); cur = []; cw = 0.0
		cw = w2 if cur.is_empty() else cw + 8 + w2
		cur.append(C)
	if cur.size(): rows.append([cur, cw])
	var cx := br.position.x + br.size.x * 0.5
	var total_h := rows.size() * 31 + maxi(0, rows.size() - 1) * 8
	var dh := total_h - 31.0
	var y := br.position.y - dh * 0.5
	for R in rows:
		var x: float = cx - float(R[1]) * 0.5
		for C in R[0]:
			add_child(C)
			C.position = Vector2(x, y)
			x += C.nodes[0].size.x + 8
			chips.append(C)
		y += 31 + 8
	# ortalı sütun: başlık yukarı, düğmeler aşağı
	var title := shell.find(".screen-title")
	if title: shell.move(title, Vector2(title.pos.x, float(title.d.get("_y0", title.pos.y)) - dh * 0.5))
	var col := shell.find(".btn-col")
	if col: shell.move(col, Vector2(col.pos.x, float(col.d.get("_y0", col.pos.y)) + dh * 0.5))

func hide_pause() -> void:
	visible = false
