class_name ScrGearDetail
extends Scr
## ui.js openGearDetail — eşya inceleme kartı: sahne (nadirlik halesi + çizim, seviye
## rozeti), ad/nadirlik/yuva, stat satırları (aynı yuvada başka eşya kuşanılıysa her
## satır farkını ▲/▼/= taşır), anlatı, geliştirme (kart çubuğu + altın) ve KUŞAN.
## Yakalama: gd<rk>_<durum>, satırlar gst_<good|bad>[_<up|down|eq>], gst_vs.

const KZ_RANK := {1: 1, 2: 2, 5: 3, 3: 4, 4: 5}
const ROW_H := 45.0
const ROW_GAP := 7.0

var L: Lyr
var id := ""
var _rows: Array = []

func _init(game) -> void:
	super(game)
	name = "GearDetail"

func open(gid: String) -> void:
	id = gid
	_build()
	visible = true
	fade_show()
	g.audio.play("panel")

func _state(x: Dictionary) -> String:
	if not g.owns_gear(id): return "lock"
	var need = g.cards_for_next_gear(id)
	var on: bool = g.is_equipped(id)
	if need == null: return "max_on" if on else "max"
	if g.can_upgrade_gear(id): return "up_on" if on else "up"
	if on: return "own_on"
	return "own" if g.can_wear(id) else "own_cant"

func _build() -> void:
	var x: Dictionary = g.gear_by_id(id)
	if L:
		unbtn(L)
		L.queue_free()
	_rows.clear()
	var rk: int = KZ_RANK.get(int(x.rarity), 1)
	var key := "gd" + str(rk) + "_" + _state(x)
	if not FileAccess.file_exists(Lyr.BASE + key + ".json"): return
	L = Lyr.make(key)
	add_child(L)
	L.stretch_h(Scr.dh_of(self))
	# boşluğa dokunmak kapatır; kart dokunuşu yutar
	btn(L, L.nodes[0], func(): close(), 1.0, 0.0)
	var gc := L.find(".gd-card")
	if gc: btn(L, gc, func(): pass, 1.0, 0.0)
	var owned: bool = g.owns_gear(id)
	# çizim
	var gl := L.find_id("#gd-glyph")
	if gl and owned:
		var p := "res://assets/ui/art/gear/" + str(x.icon) + ".png"
		if ResourceLoader.exists(p):
			var t: Texture2D = UITex.get_tex(p)
			var s := Sprite2D.new()
			s.texture = t
			s.scale = Vector2.ONE * (92.0 / maxf(t.get_width(), t.get_height()))
			s.position = gl.size * 0.5
			gl.node.add_child(s)
	if owned:
		L.set_text(L.find_id("#gd-name"), str(x.name))
	var slot_def: Dictionary = {}
	for s in D.EQUIP_SLOTS:
		if s.id == x.slot: slot_def = s
	L.set_text(L.find_id("#gd-slot"), str(slot_def.get("name", x.slot)))
	var lvl: int = g.gear_level(id) if owned else 1
	if owned: L.set_text(L.find_id("#gd-lvl"), "Sv " + str(lvl) + "/" + str(D.GEAR_MAX_LEVEL))
	# anlatı (satır sayısı değişebilir)
	var lore := L.find_id("#gd-lore")
	var dl := 0.0
	if lore and lore.txt and owned:
		var n0 := lore.txt.line_count()
		L.set_text(lore, "“" + str(x.get("desc", "")) + "”")
		dl = float(lore.txt.line_count() - n0) * lore.txt.line_h
		lore.size.y += dl
	# statlar
	var st := L.find_id("#gd-stats")
	var ds := 0.0
	if st: ds = _stats(x, owned, lvl, st)
	# sütunu yeniden diz: statlar → anlatı → eylem
	if lore: L.move(lore, lore.pos + Vector2(0, ds))
	var act := L.find_id("#gd-action")
	if act: L.move(act, act.pos + Vector2(0, ds + dl))
	var dd := ds + dl
	if absf(dd) > 0.1:
		var sheet := L.find(".gd-sheet")
		if sheet: L.resize_h(sheet, sheet.size.y + dd)
		var card := L.find(".gd-card")
		if card:
			L.resize_h(card, card.size.y + dd)
			L.move(card, card.pos - Vector2(0, dd * 0.5))
	# eylem metinleri
	var need = g.cards_for_next_gear(id) if owned else null
	if owned and need != null:
		var cards: int = g.gear_card_count(id)
		L.set_text(L.find(".cu-lvl"), "Sv " + str(lvl))
		L.set_text(L.find(".cu-next"), "Sv " + str(lvl + 1))
		var bar := L.find(".cu-bar")
		if bar:
			for k in bar.kids:
				if k.d.get("tag") == "b": L.set_text(k, str(cards) + " / " + str(int(need)) + " kart")
				elif k.d.get("tag") == "i": UIK.set_fill(L, k, bar.size.x - 2.0, float(cards) / maxf(1.0, float(need)))
		var cost := L.find(".cu-cost")
		if cost: L.set_text(cost, str(int(g.gold_for_next_gear(id))))
	elif owned:
		var mx := L.find(".cd-upgrade")
		if mx and mx.txt: L.set_text(mx, " · Sv " + str(lvl))
	# düğmeler
	btn(L, L.find_id("#gd-close"), func(): g.audio.play("click"); close())
	var up := L.find(".cu-btn")
	if up and not String(up.d.key).contains("cant"): btn(L, up, func(): _upgrade())
	var sel := L.find(".cd-select")
	if sel and not String(sel.d.key).contains("cant"): btn(L, sel, func(): _toggle())
	var sd := L.find(".cd-selected")
	if sd: btn(L, sd, func(): _toggle())
	if owned:
		var pl: int = g.gear_plus(id)
		if pl > 0:
			var nm := L.find_id("#gd-name")
			if nm: L.set_text(nm, str(x.name) + "  +" + str(pl))
		_build_plus(L.find(".gd-card"))

## ═══ + BASMA paneli (kartın altında) ═══
var _plb: Node2D
var _pbFx := ""
var _pbT := 0.0
func _build_plus(card: Lyr.N) -> void:
	if card == null: return
	var W := UIK.ui_size(get_viewport())
	var h := 92.0
	var r := Rect2(card.pos.x, card.pos.y + card.size.y + 10.0, card.size.x, h)
	if (L.get_global_transform() * r).end.y > W.y - 8.0:
		r.position.y = card.pos.y - h - 10.0
	var bR := Rect2(r.position.x + r.size.x - 128.0, r.position.y + 14.0, 116.0, h - 28.0)
	_plb = Node2D.new()
	L.add_child(_plb)
	var gid := id
	_plb.draw.connect(func():
		var pl: int = g.gear_plus(gid)
		var fb := UIK.font(true, 900)
		var fs := UIK.font(false, 700)
		var shake := Vector2.ZERO
		var ft := (Time.get_ticks_msec() / 1000.0) - _pbT
		if _pbFx != "" and ft < 0.45: shake = Vector2(sin(ft * 70.0) * 6.0 * (1.0 - ft / 0.45), 0)
		_plb.draw_set_transform(shake, 0.0, Vector2.ONE)
		_plb.draw_style_box(ComicSkin.sb(Color(0, 0, 0, 0.5), 16), Rect2(r.position + Vector2(0, 5), r.size))
		_plb.draw_style_box(ComicSkin.sb(Color("#1b1218"), 16, 2.0, Color("#e9c98a")), r)
		var gold := Color("#ffd27a")
		_plb.draw_string(fb, r.position + Vector2(16, 44), "+" + str(pl), HORIZONTAL_ALIGNMENT_LEFT, 80, 34, gold if pl > 0 else Color("#9a8f86"))
		_plb.draw_string(fs, r.position + Vector2(16, 68), "Statlar +%" + str(int(round(g.PLUS_BONUS[pl] * 100))), HORIZONTAL_ALIGNMENT_LEFT, 110, 12, Color("#d9cfc2"))
		var mx := r.position.x + 104.0
		if pl >= g.PLUS_MAX:
			_plb.draw_string(fb, Vector2(mx, r.position.y + 40), "AZAMİ +7", HORIZONTAL_ALIGNMENT_LEFT, 160, 18, gold)
			_plb.draw_string(fs, Vector2(mx, r.position.y + 62), "Eşya tam güçte", HORIZONTAL_ALIGNMENT_LEFT, 160, 12, Color("#d9cfc2"))
		else:
			var ch := int(round(g.plus_chance(gid) * 100))
			var cc := Color("#7ee08a") if ch >= 80 else (Color("#ffd27a") if ch >= 50 else Color("#ff7d6a"))
			_plb.draw_string(fs, Vector2(mx, r.position.y + 28), "+" + str(pl + 1) + " ŞANSI", HORIZONTAL_ALIGNMENT_LEFT, 120, 11, Color("#b8ad9f"))
			_plb.draw_string(fb, Vector2(mx, r.position.y + 52), "%" + str(ch), HORIZONTAL_ALIGNMENT_LEFT, 120, 24, cc)
			if g.plus_burns(gid):
				_plb.draw_string(fs, Vector2(mx, r.position.y + 74), "Başarısız: YANAR, +0", HORIZONTAL_ALIGNMENT_LEFT, bR.position.x - mx - 4.0, 10, Color("#ff7d6a"))
			else:
				_plb.draw_string(fs, Vector2(mx, r.position.y + 74), "Başarısız: kayıp yok", HORIZONTAL_ALIGNMENT_LEFT, bR.position.x - mx - 4.0, 10, Color("#9fd6a6"))
			var ok: bool = g.can_plus(gid)
			_plb.draw_style_box(ComicSkin.sb(ComicSkin.INK, 12), Rect2(bR.position + Vector2(0, 4), bR.size))
			_plb.draw_style_box(ComicSkin.sb(Color("#e0a53a") if ok else Color("#5a4c40"), 12, 2.0, ComicSkin.INK), bR)
			_plb.draw_string(fb, bR.position + Vector2(0, 28), "+ BAS", HORIZONTAL_ALIGNMENT_CENTER, bR.size.x, 20, Color.WHITE if ok else Color("#b0a497"))
			_plb.draw_string(fs, bR.position + Vector2(0, 50), JS.s(g.plus_cost(gid)) + " altın", HORIZONTAL_ALIGNMENT_CENTER, bR.size.x, 13, Color("#fff1c9") if ok else Color("#ff8f7a"))
		if _pbFx != "" and ft < 1.4:
			var a := clampf(1.4 - ft, 0.0, 1.0)
			var txt: String = {"ok": "BAŞARILI!", "fail": "BAŞARISIZ", "burn": "YANDI! +0"}[_pbFx]
			var col: Color = {"ok": Color("#7ee08a"), "fail": Color("#ffd27a"), "burn": Color("#ff5a4a")}[_pbFx]
			col.a = a
			var sc := 1.0 + 0.25 * maxf(0.0, 1.0 - ft * 4.0)
			_plb.draw_set_transform(r.get_center() + Vector2(0, -h * 0.5 - 18.0 - ft * 14.0), 0.0, Vector2.ONE * sc)
			_plb.draw_string(fb, Vector2(-120, 10), txt, HORIZONTAL_ALIGNMENT_CENTER, 240, 26, col))
	if g.gear_plus(gid) < g.PLUS_MAX:
		btn(L, card, func(): _plus(), 1.0, 2.0, bR)

func _plus() -> void:
	if not g.can_plus(id):
		g.audio.play("error")
		g.ui.toast("YETERSİZ ALTIN")
		return
	var res: String = g.plus_gear(id)
	if res == "": return
	g.audio.play({"ok": "levelup", "fail": "blunder", "burn": "boom"}[res])
	g.ui.menu.refresh_wallet()
	_pbFx = res
	_pbT = Time.get_ticks_msec() / 1000.0
	# kart/statlar yeni +seviyeyle yeniden kurulur, sonuç efekti yeni panelde sürer
	_build()
	if g.ui.menu.pages.has("cephane"): g.ui.menu.pages["cephane"].on_gear_upgraded(id)
	var tw := create_tween().set_loops(45)
	tw.tween_callback(func(): if is_instance_valid(_plb): _plb.queue_redraw()).set_delay(0.033)

## stat satırları (2 sütun); döner: yükseklik farkı
func _stats(x: Dictionary, owned: bool, lvl: int, st: Lyr.N) -> float:
	var mul: float = g.gear_mul(id) if owned else D.gearLevelMods(lvl)
	var cur_id = g.char_gear_map().get(x.slot) if owned else null
	var cur = g.gear_by_id(cur_id) if cur_id and cur_id != id else null
	var cur_mul: float = g.gear_mul(cur.id) if cur else 1.0
	var keys: Array = (x.get("mods", {}) as Dictionary).keys()
	if cur:
		for k in cur.get("mods", {}):
			if not keys.has(k): keys.append(k)
	var y := 0.0
	var colw := (st.size.x - ROW_GAP) * 0.5
	if cur:
		var V := _row("gst_vs", st, Vector2(0, 0))
		if V:
			var b := V.find_exact("b")
			if b:
				V.set_text(b, str(cur.name))
				if b.txt: b.txt.color = JS.col(D.RARITIES[int(cur.rarity)].color)
			y += V.nodes[0].size.y + ROW_GAP
	var i := 0
	for k in keys:
		var has: bool = x.mods.has(k)
		var raw: float = float(x.mods[k]) * mul if has else 0.0
		var def: Dictionary = D.MODS.get(k, {})
		var flat: bool = str(def.get("fmt", "")) == "flat"
		var m := ArmoryPage.fmt_mod(k, (roundf(raw) if flat else raw) if owned else (roundf(float(x.mods[k])) if flat else float(x.mods[k])))
		var good: bool = (raw if owned else float(x.mods.get(k, 0))) >= 0
		var dkey := ""
		var dtxt := ""
		if cur:
			var dv: float = raw - float(cur.mods.get(k, 0.0)) * cur_mul
			var eps := 0.5 if flat else 0.005
			if absf(dv) >= eps:
				dkey = "_up" if dv > 0 else "_down"
				dtxt = ("▲ " if dv > 0 else "▼ ") + ArmoryPage.fmt_mod(k, roundf(dv) if flat else dv).val
			else:
				dkey = "_eq"
				dtxt = "="
		var R := _row("gst_" + ("good" if good else "bad") + dkey, st, Vector2((i % 2) * (colw + ROW_GAP), y + (i / 2) * (ROW_H + ROW_GAP)))
		if R:
			R.set_text(R.find(".cs-k"), str(m.label))
			var v := R.find(".cs-v")
			if v: R.set_text(v, ("???" if not owned else (m.val if has else "—")))
			var dn := R.find(".cs-d")
			if dn: R.set_text(dn, dtxt)
			var ic := R.find(".cs-ico")
			if ic:
				# ui.icon(): ICONS[id] || ICONS.guc
				var ip := "res://assets/ui/art/icon/" + str(x.icon) + ".png"
				if not ResourceLoader.exists(ip): ip = "res://assets/ui/art/icon/guc.png"
				if ResourceLoader.exists(ip):
					var s := Sprite2D.new()
					s.texture = UITex.get_tex(ip)
					s.scale = Vector2.ONE * (14.0 / maxf(s.texture.get_width(), s.texture.get_height()))
					s.position = ic.size * 0.5
					s.modulate = Color("#7ee08a") if good else Color("#ff7d8c")
					ic.node.add_child(s)
		i += 1
	var rows := int(ceil(keys.size() / 2.0))
	var h := y + rows * ROW_H + maxi(0, rows - 1) * ROW_GAP
	var dh := h - st.size.y
	st.size.y = h
	return dh

func _row(key: String, st: Lyr.N, pos: Vector2) -> Lyr:
	if not FileAccess.file_exists(Lyr.BASE + key + ".json"): return null
	var R := Lyr.make(key)
	st.host.add_child(R)
	R.position = pos
	_rows.append(R)
	return R

func _upgrade() -> void:
	if not g.can_upgrade_gear(id):
		g.audio.play("error")
		return
	var lv0: int = g.gear_level(id)
	if not g.upgrade_gear(id, true): return
	g.ui.menu.refresh_wallet()
	var gid := id
	var x: Dictionary = g.gear_by_id(id)
	# tören kapanınca inceleme kartı + çanta kartı yeni seviyeyle kurulur (tören sırasında
	# kurulum yok: patlama karesi takılmasın)
	ScrUpFx.play_gear(g, x, lv0, func():
		if visible and id == gid: _build()
		if g.ui.menu.pages.has("cephane"): g.ui.menu.pages["cephane"].on_gear_upgraded(gid))

func _toggle() -> void:
	g.audio.play("equip")
	g.toggle_equip(id)      # toggle_equip sayfayı zaten kurar (ui.show_armory) — ikinci kez kurulmaz
	_build()

func _refresh_page() -> void:
	if g.ui.menu.pages.has("cephane"): g.ui.menu.pages["cephane"].render()

func close() -> void:
	if not visible: return
	fade_hide(_close_now)

func _close_now() -> void:
	visible = false
	if L:
		unbtn(L)
		L.queue_free()
		L = null
	# kapanışta sayfa yeniden kurulmaz: kuşanma/çıkarma (show_armory) ve geliştirme (tören
	# sonu) sayfayı zaten tazeler — eskiden her kapanış tüm çantayı baştan kurup takılıyordu
