class_name ArmoryPage
extends Node2D
## ui.js renderArmory — KUŞANIM / CEPHANE sayfası: dizilim çipleri (kahraman başına 3),
## kahraman sahnesi (4 yuva portreyi çevreler, güç puanı), toplam statlar + set şeridi,
## sekmeli çanta (sahip olunanlar → BULUNAMAYAN). Karta ilk dokunuş SEÇER (KUŞAN/
## İNCELE tepsisi), ikinci dokunuş inceler; dolu yuvaya dokunmak ÇIKAR balonu açar,
## boş yuva çantayı o yuvaya süzer.
## Kabuk pg_cephane; bileşenler tools/bake/ui/scn/armory.mjs şablonları.

const KZ_RANK := {1: 1, 2: 2, 5: 3, 3: 4, 4: 5}
const KZ_SHORT := {"silah": "SİLAH", "zirh": "ZIRH", "eldiven": "ELDİVEN", "cizme": "ÇİZME"}
const KZ_W := {"dmgPct": 1000, "atkPct": 900, "critChance": 1200, "critMult": 400, "lifeSteal": 1400, "maxHp": 5, "armor": 40, "speedPct": 400, "dodge": 800, "regen": 30}
const SKIP := ["#loadout-portrait"]   # dinamik kapların içi yakalamada zaten boş
const GRID_STEP_X := 115.0
const GRID_GAP_Y := 11.0

var menu
var g
var shell: Lyr
var root: Lyr.N
var tab := "all"
var sel_id := ""
var _items: Array = []        # [Node] — yeniden kurulumda silinir
var _pop = null               # {slot, L}
var _base := {}               # bölümlerin yakalanan konum/boyları
var _lazy: Array = []         # kurulmayı bekleyen çanta kartları: {f: Callable, y: içerik y}

var _cardOf := {}          # eşya id → {C, args}: seçimde yalnız o kart yeniden kurulur

func _init(m) -> void:
	menu = m
	g = m.g
	name = "Armory"

var _lastR := -99999
func render() -> void:
	# kart zıplatma yalnız sayfaya girişte (kuşan/çıkar sonrası yeniden çizimde değil)
	var nowR := Time.get_ticks_msec()
	_popN = 0 if nowR - _lastR > 4000 else 99
	_lastR = nowR
	Prof.s("armory.render")
	_render_now()
	Prof.t("armory.render")

func _render_now() -> void:
	if shell == null:
		shell = Lyr.make("pg_cephane", SKIP)
		add_child(shell)
		shell.stretch_h(Scr.dh_of(self))
		root = shell.nodes[0]
		menu.scroll_area(shell, root)
		# dizilim başlığının sağındaki "dokun: geç · tekrar: adlandır" ipucu kaldırıldı
		var hint := shell.find(".kzd-hint")
		if hint: shell.set_hidden(hint, true)
		var sw := shell.find_id("#kz-swap")
		if sw: menu.btn(shell, sw, func(): g.audio.play("click"); menu.set_page("kahraman"))
		for k in ["#kz-hero", "#kz-sets", "#kz-stats", ".kz-note", "#kz-bag", "#armory-shop"]:
			var n := shell.find(k) if k.begins_with(".") else shell.find_id(k)
			if n: _base[k] = [n.pos, n.size]
	for it in _items:
		if it is Lyr: menu.unbtn(it)
		(it as Node).queue_free()
	_items.clear()
	_cardOf.clear()
	_lazy.clear()
	_pop = null
	Prof.s("ar.decks"); _decks(); Prof.t("ar.decks")
	Prof.s("ar.slots")
	var dy := _slots_and_stats()
	Prof.t("ar.slots")
	Prof.s("ar.bag")
	_bag(dy)
	Prof.t("ar.bag")

# ═════════════ yardımcılar ═════════════

## kart yakalamasının yalnız kökü + tepsi düğmeleri gerekir (görüntüyü GearCard çizer):
## görsel alt ağaçlar hiç kurulmaz (kart başına ~1,7 ms → dokunuşta tüm çanta takılmasın)
const CARD_SKIP := [".kc-art", ".kc-pips", ".kc-name", ".kc-bar", ".kc-lock", ".kc-badge", ".kc-on", ".kc-ready"]

func _add(key: String, parent: Lyr.N, pos: Vector2) -> Lyr:
	if not FileAccess.file_exists(Lyr.BASE + key + ".json"): return null
	var C := Lyr.make(key, CARD_SKIP if key.begins_with("kc") else [])
	parent.host.add_child(C)
	C.position = pos
	_items.append(C)
	return C

static func pow_of(g2, x: Dictionary) -> int:
	var mul: float = D.gearLevelMods(g2.gear_level(x.id))
	var p := 0.0
	for k in x.get("mods", {}): p += float(KZ_W.get(k, 300)) * float(x.mods[k])
	return int(round(p * mul))

static func fmt_mod(key: String, v: float) -> Dictionary:
	var def: Dictionary = D.MODS.get(key, {})
	var label: String = def.get("label", key)
	var fmt: String = def.get("fmt", "flat")
	var val := ""
	if fmt == "pct": val = ("+" if v > 0 else "") + str(int(round(v * 100))) + "%"
	elif fmt == "persec": val = ("+" if v > 0 else "") + JS.s(v) + "/sn"
	else: val = ("+" if v > 0 else "") + JS.s(v)
	return {"label": label, "val": val}

func _gear_tex(icon: String) -> Texture2D:
	var p := "res://assets/ui/art/gear/" + icon + ".png"
	return UITex.get_tex(p)

## gear çizimini bir düğümün kutusuna ortalı yerleştir (svg boyutu: kutunun 'frac'ı)
func _art_into(L: Lyr, n: Lyr.N, icon: String, frac := 0.8, silhouette := false) -> void:
	if n == null: return
	var t := _gear_tex(icon)
	if t == null: return
	var s := Sprite2D.new()
	s.texture = t
	var box := minf(n.size.x, n.size.y) * frac
	s.scale = Vector2.ONE * (box / maxf(t.get_width(), t.get_height()))
	s.position = n.size * 0.5
	if silhouette:
		# .kc.lock .kc-icon svg { filter: brightness(0) invert(1); opacity: .07 }
		var m := UIK.shader_mat("res://shaders/ui/silhouette.gdshader")
		m.set_shader_parameter("col", Color(1, 1, 1, 0.07))
		s.material = m
	n.node.add_child(s)

func _slot_hint(slot: String) -> bool:
	var map: Dictionary = g.char_gear_map()
	if map.get(slot) and g.gear_by_id(map[slot]): return false
	for x in D.EQUIPMENT:
		if x.slot == slot and g.owns_gear(x.id) and g.can_wear(x.id): return true
	return false

# ═════════════ dizilimler ═════════════

func _decks() -> void:
	var hero := shell.find_id("#kzd-hero")
	if hero: shell.set_text(hero, str(g.char_def().get("name", "")))
	var row := shell.find_id("#kzd-row")
	if row == null: return
	var d: Dictionary = g.decks()
	# sade segment kontrol: tek koyu çubukta 3 dizilim (seçili altın) + sağda SETLER düğmesi.
	# Yakalanan kartlar yalnız görünmez dokunma alanı olarak kalır.
	var RW: float = row.size.x
	var RH := 50.0
	var setW := 58.0
	var gap := 8.0
	var barW: float = RW - setW - gap
	var segW: float = (barW - 8.0) / 3.0
	var info := []
	for i in 3:
		var map: Dictionary = g.deck_gear(i)
		var n := 0
		var pw := 0
		for s in D.EQUIP_SLOTS:
			var gid = map.get(s.id)
			var gx = g.gear_by_id(gid) if gid else null
			if gx and g.owns_gear(gx.id):
				n += 1
				pw += pow_of(g, gx)
		var lst: Array = d.get("l", [])
		var dn := str(lst[i].get("n", "")) if i < lst.size() and lst[i] is Dictionary else ""
		info.append({"name": dn if dn != "" else "DİZİLİM " + str(i + 1), "meta": (str(n) + "/" + str(D.EQUIP_SLOTS.size()) + " · " + str(pw) + " GÜÇ") if n else "BOŞ", "on": int(d.a) == i})
		var C := _add("kzd_off", row, Vector2(4.0 + i * segW, 0))
		if C == null: continue
		var cs: Vector2 = C.nodes[0].size
		C.scale = Vector2(segW / cs.x, RH / cs.y)
		C.modulate.a = 0.0
		var ii := i
		menu.btn(C, C.nodes[0], func():
			g.audio.play("click")
			if ii != int(g.decks().a):
				g.switch_deck(ii)
				render(), 0.96)
	var SG := _add("kzd_off", row, Vector2(barW + gap, 0))
	if SG:
		var cs2: Vector2 = SG.nodes[0].size
		SG.scale = Vector2(setW / cs2.x, RH / cs2.y)
		SG.modulate.a = 0.0
		menu.btn(SG, SG.nodes[0], func():
			g.audio.play("click")
			g.ui.show_set_guide(), 0.96)
	var gold := Color("#f0c77a")
	var ink := Color("#1a0d10")
	var fb := UIK.font(true, 900)
	var fs := UIK.font(false, 700)
	var ov := Node2D.new()
	ov.z_index = 2
	ov.draw.connect(func():
		var bar := Rect2(0, 0, barW, RH)
		ov.draw_style_box(ComicSkin.sb(Color(0, 0, 0, 0.45), 14), Rect2(bar.position + Vector2(0, 3), bar.size))
		ov.draw_style_box(ComicSkin.sb(Color("#160c10"), 14, 1.5, Color(gold, 0.35)), bar)
		for i in 3:
			var I: Dictionary = info[i]
			var r := Rect2(4.0 + i * segW, 4.0, segW - 0.0, RH - 8.0).grow_individual(0, 0, -3.0, 0)
			if I.on:
				ov.draw_style_box(ComicSkin.sb(Color("#3a2410"), 11), Rect2(r.position + Vector2(0, 2), r.size))
				ov.draw_style_box(ComicSkin.sb(Color("#e8b456"), 11, 1.5, Color("#fff0c0")), r)
				ov.draw_style_box(ComicSkin.sb(Color(1, 1, 1, 0.18), 11), Rect2(r.position, Vector2(r.size.x, r.size.y * 0.45)))
			elif i > 0 and not info[i - 1].on:
				ov.draw_line(Vector2(r.position.x - 1.5, r.position.y + 8), Vector2(r.position.x - 1.5, r.end.y - 8), Color(gold, 0.18), 1.0)
			var tc: Color = ink if I.on else Color(1, 0.93, 0.85, 0.9)
			var mc: Color = Color(ink, 0.75) if I.on else Color(gold, 0.6)
			ov.draw_string(fb, Vector2(r.position.x, r.position.y + 17), str(I.name), HORIZONTAL_ALIGNMENT_CENTER, r.size.x, 12, tc)
			ov.draw_string(fs, Vector2(r.position.x, r.position.y + 33), str(I.meta), HORIZONTAL_ALIGNMENT_CENTER, r.size.x, 10, mc)
		# SETLER düğmesi: altın çerçeveli, kitap simgesi
		var sr := Rect2(barW + gap, 0, setW, RH)
		ov.draw_style_box(ComicSkin.sb(Color(0, 0, 0, 0.45), 14), Rect2(sr.position + Vector2(0, 3), sr.size))
		ov.draw_style_box(ComicSkin.sb(Color("#2a1810"), 14, 2.0, gold), sr)
		var bc := sr.get_center() + Vector2(0, -7)
		ov.draw_colored_polygon(PackedVector2Array([bc + Vector2(-11, -7), bc + Vector2(-1, -5), bc + Vector2(-1, 8), bc + Vector2(-11, 6)]), gold)
		ov.draw_colored_polygon(PackedVector2Array([bc + Vector2(11, -7), bc + Vector2(1, -5), bc + Vector2(1, 8), bc + Vector2(11, 6)]), gold.darkened(0.15))
		ov.draw_string(fb, Vector2(sr.position.x, sr.end.y - 7), "SETLER", HORIZONTAL_ALIGNMENT_CENTER, sr.size.x, 10, gold))
	row.node.add_child(ov)

# ═════════════ kahraman sahnesi + statlar ═════════════

## döner: kahraman bölümünün yükseklik farkı (çanta bu kadar kayar)
func _slots_and_stats() -> float:
	var map: Dictionary = g.char_gear_map()
	var worn := 0
	for s in D.EQUIP_SLOTS:
		if map.get(s.id) and g.gear_by_id(map[s.id]): worn += 1
	var sc := shell.find_id("#slot-count")
	if sc: shell.set_text(sc, str(worn) + "/" + str(D.EQUIP_SLOTS.size()) + " YUVA")
	# portre (seçili kahraman)
	var av := shell.find(".kz-avatar")
	if av:
		var pid: String = g.meta.selectedChar
		var pp := "res://assets/ui/art/portrait/" + pid + ".webp"
		if ResourceLoader.exists(pp):
			var pr := UIK.round_image(UITex.get_tex(pp), av.size.x, av.size.y, av.size.x * 0.5, Vector2(0.5, 0.12))
			av.node.add_child(pr)
			_items.append(pr)
			pr.pivot_offset = pr.size * 0.5
			_por = pr
	var ln := shell.find_id("#loadout-name")
	if ln: shell.set_text(ln, str(g.char_def().get("name", "")))
	# yuvalar: sol silah·eldiven, sağ zırh·çizme
	var cl := shell.find_id("#kz-col-l")
	var cr := shell.find_id("#kz-col-r")
	var pw := 0
	var yl := 0.0
	var yr := 0.0
	for s in D.EQUIP_SLOTS:
		var right: bool = s.id == "zirh" or s.id == "cizme"
		var col := cr if right else cl
		if col == null: continue
		var gid = map.get(s.id)
		var gx = g.gear_by_id(gid) if gid else null
		var selc := "_sel" if tab == s.id else ""
		var key := ("kzs_f" + str(KZ_RANK.get(int(gx.rarity), 1)) + selc) if gx else ("kzs_e_" + str(s.id) + selc)
		var y := yr if right else yl
		var C := _add(key, col, Vector2(0, y))
		if C == null: continue
		if right: yr += C.nodes[0].size.y + 10.0
		else: yl += C.nodes[0].size.y + 10.0
		if gx:
			_art_into(C, C.find(".kz-frame"), str(gx.icon), 0.62)
			var lv := C.find(".kz-lv")
			if lv: C.set_text(lv, str(g.gear_level(gx.id)))
			var nm := C.find(".kz-nm")
			if nm: C.set_text(nm, str(gx.name))
			if g.owns_gear(gx.id) and g.can_wear(gx.id): pw += pow_of(g, gx)
		var lb := C.find(".kz-lab")
		if lb: C.set_text(lb, KZ_SHORT.get(s.id, str(s.name)))
		if _slot_hint(s.id):
			var dot := _add("kz_dot", col, Vector2(0, y) + Vector2(C.nodes[0].size.x - 12, 0))
		var sid: String = s.id
		var filled: bool = gx != null
		menu.btn(C, C.nodes[0], func(): _slot_tap(sid, filled, C), 0.96)
	var kp := shell.find_id("#kz-power")
	var pill := shell.find(".kz-power")
	if kp and kp.txt and pill:
		# sayı genişledikçe hap büyür (ortalı), "GÜÇ" etiketi sayının ardında kalır
		if not pill.d.has("_bw0"):
			pill.d["_bw0"] = kp.txt.text_width()
			pill.d["_pw0"] = pill.size.x
			pill.d["_tx0"] = pill.txt.position.x if pill.txt else 0.0
		shell.set_text(kp, str(pw))
		var dw: float = kp.txt.text_width() - float(pill.d["_bw0"])
		shell.fit_width(pill, float(pill.d["_pw0"]) + dw, true)
		if pill.txt: pill.txt.position.x = float(pill.d["_tx0"]) + dw
	# toplam statlar + setler
	var tot := {}
	var worn_items: Array = []
	for sl in map:
		var x = g.gear_by_id(map[sl])
		if x == null or not g.owns_gear(x.id) or not g.can_wear(x.id): continue
		worn_items.append(x)
		var mul: float = D.gearLevelMods(g.gear_level(x.id))
		for k in x.get("mods", {}): tot[k] = float(tot.get(k, 0.0)) + float(x.mods[k]) * mul
	var sets: Array = SideModes.active_sets(worn_items)
	for A in sets:
		for k in A.S.p2: tot[k] = float(tot.get(k, 0.0)) + float(A.S.p2[k])
		if A.on4:
			for k in A.S.p4: tot[k] = float(tot.get(k, 0.0)) + float(A.S.p4[k])
	# set şeridi
	var setn := shell.find_id("#kz-sets")
	var set_h := 0.0
	if setn:
		if sets.is_empty():
			var H := _add("ks_hint", setn, Vector2.ZERO)
			set_h = H.nodes[0].size.y if H else 12.0
			if H: menu.btn(H, H.nodes[0], func(): g.audio.play("click"); g.ui.show_set_guide(), 0.98)
		else:
			var y := 0.0
			for A in sets:
				var S := _add("ks_set" + str(A.r) + "_" + ("4" if A.on4 else "2"), setn, Vector2(0, y))
				if S:
					var em := S.find_exact("em")
					if em: S.set_text(em, str(mini(4, int(A.n))) + " / 4")
					menu.btn(S, S.nodes[0], func(): g.audio.play("click"); g.ui.show_set_guide(), 0.98)
					y += S.nodes[0].size.y + 6.0
			set_h = maxf(0.0, y - 6.0)
	# stat karoları: 4 sütun
	var stn := shell.find_id("#kz-stats")
	var keys := ["dmgPct", "atkPct", "maxHp", "lifeSteal"]
	for k in tot:
		if not keys.has(k) and absf(float(tot[k])) > 1e-6: keys.append(k)
	var st_h := 0.0
	if stn:
		var cw := 80.0
		var gap := (stn.size.x - cw * 4.0) / 3.0
		var rows := 0
		for i in keys.size():
			var k: String = keys[i]
			var v: float = float(tot.get(k, 0.0))
			var def: Dictionary = D.MODS.get(k, {})
			var m := fmt_mod(k, roundf(v) if str(def.get("fmt", "")) == "flat" else v)
			var key := "kzst_zero" if absf(v) < 1e-9 else ("kzst_neg" if v < 0 else "kzst")
			var C := _add(key, stn, Vector2((i % 4) * (cw + gap), (i / 4) * (42.0 + 6.0)))
			if C:
				C.set_text(C.find_exact("b"), m.val if absf(v) > 1e-9 else "—")
				C.set_text(C.find_exact("span"), str(m.label))
			rows = i / 4 + 1
		st_h = rows * 42.0 + maxi(0, rows - 1) * 6.0
	# kahraman bölümü boyu: set + stat farkı
	var d_sets: float = set_h - float(_base.get("#kz-sets", [Vector2.ZERO, Vector2(0, 12)])[1].y)
	var d_stats: float = st_h - float(_base.get("#kz-stats", [Vector2.ZERO, Vector2(0, 42)])[1].y)
	var dy := d_sets + d_stats
	if stn: shell.move(stn, _base["#kz-stats"][0] + Vector2(0, d_sets))
	var note := shell.find(".kz-note")
	if note: shell.move(note, _base[".kz-note"][0] + Vector2(0, dy))
	var hero := shell.find_id("#kz-hero")
	if hero: shell.resize_h(hero, float(_base["#kz-hero"][1].y) + dy)
	return dy

func _slot_tap(slot: String, filled: bool, C: Lyr) -> void:
	g.audio.play("click")
	if filled:
		# ÇIKAR balonu (aç/kapat)
		var was: bool = _pop != null and _pop.slot == slot
		_close_pop()
		if was: return
		var col := shell.find_id("#kz-col-r") if slot == "zirh" or slot == "cizme" else shell.find_id("#kz-col-l")
		var P := _add("kz_pop", col, C.position + Vector2(C.nodes[0].size.x * 0.5, C.find(".kz-frame").size.y + 6.0))
		if P:
			_pop = {"slot": slot, "L": P}
			menu.btn(P, P.nodes[0], func():
				g.unequip_slot(slot))       # unequip_slot sayfayı zaten kurar (ui.show_armory)
		return
	_close_pop()
	tab = "all" if tab == slot else slot
	sel_id = ""
	render()

func _close_pop() -> void:
	if _pop:
		menu.unbtn(_pop.L)
		(_pop.L as Node).queue_free()
		_items.erase(_pop.L)
		_pop = null

# ═════════════ çanta ═════════════

func _bag(dy: float) -> void:
	var bag := shell.find_id("#kz-bag")
	if bag: shell.move(bag, _base["#kz-bag"][0] + Vector2(0, dy))
	# sekmeler
	var tabs_n := shell.find_id("#kz-tabs")
	var tabs := [{"id": "all", "name": "TÜMÜ"}]
	for s in D.EQUIP_SLOTS: tabs.append({"id": s.id, "name": KZ_SHORT.get(s.id, s.name)})
	if tabs_n:
		var x := 12.0
		var made := []
		for t in tabs:
			var C := _add("kztab_on" if t.id == tab else "kztab_off", tabs_n, Vector2(x, 2))
			if C == null: continue
			var items: Array = D.EQUIPMENT if t.id == "all" else D.EQUIPMENT.filter(func(e): return e.slot == t.id)
			var own := items.filter(func(e): return g.owns_gear(e.id) and not g.is_equipped(e.id)).size()
			var root_n: Lyr.N = C.nodes[0]
			var ow: float = root_n.txt.text_width() if root_n.txt else 0.0
			C.set_text(root_n, str(t.name))
			var em := C.find_exact("em")
			var ew: float = em.txt.text_width() if em and em.txt else 0.0
			if em: C.set_text(em, str(own))
			var dw: float = (root_n.txt.text_width() - ow if root_n.txt else 0.0) + (em.txt.text_width() - ew if em and em.txt else 0.0)
			if em: C.move(em, em.pos + Vector2(dw - (em.txt.text_width() - ew), 0))
			C.fit_width(root_n, root_n.size.x + dw, false)
			x += root_n.size.x + 6.0
			made.append(C)
			var tid: String = t.id
			menu.btn(C, root_n, func():
				g.audio.play("click")
				tab = tid
				sel_id = ""
				render(), 0.95)
		# sekmeler alana sığmıyorsa hepsini orantılı küçült (çizme sağa taşmasın)
		var avail: float = tabs_n.size.x - 12.0
		if x - 6.0 > avail and made.size():
			var k: float = (avail - 12.0) / (x - 6.0 - 12.0)
			var xx := 12.0
			for C in made:
				C.scale = Vector2(k, k)
				C.position = Vector2(xx, 2 + (1.0 - k) * C.nodes[0].size.y * 0.5)
				xx += C.nodes[0].size.x * k + 6.0 * k
	# kartlar
	var grid := shell.find_id("#armory-shop")
	if grid == null: return
	var list: Array = D.EQUIPMENT.filter(func(e): return tab == "all" or e.slot == tab)
	# kuşanılan eşya çantada durmaz (yuvada görünür); çıkarılınca çantaya döner
	var owned: Array = list.filter(func(e): return g.owns_gear(e.id) and not g.is_equipped(e.id))
	var missing: Array = list.filter(func(e): return not g.owns_gear(e.id))
	var slot_ix := func(e):
		for i in D.EQUIP_SLOTS.size():
			if D.EQUIP_SLOTS[i].id == e.slot: return i
		return 0
	owned.sort_custom(func(a, b):
		var sa: int = slot_ix.call(a) if tab == "all" else 0
		var sb: int = slot_ix.call(b) if tab == "all" else 0
		if sa != sb: return sa < sb
		var ea := int(g.is_equipped(a.id))
		var eb := int(g.is_equipped(b.id))
		if ea != eb: return ea > eb
		var wa := int(g.can_wear(a.id))
		var wb := int(g.can_wear(b.id))
		if wa != wb: return wa > wb
		return pow_of(g, a) > pow_of(g, b))
	missing.sort_custom(func(a, b):
		var sa: int = slot_ix.call(a) if tab == "all" else 0
		var sb: int = slot_ix.call(b) if tab == "all" else 0
		if sa != sb: return sa < sb
		return int(KZ_RANK.get(int(a.rarity), 1)) < int(KZ_RANK.get(int(b.rarity), 1)))
	var sub := shell.find_id("#kz-bag-sub")
	if sub: shell.set_text(sub, str(owned.size()) + " / " + str(list.size()) + " EŞYA")
	var y := 0.0
	var i := 0
	if owned.is_empty():
		var E := _add("kz_empty", grid, Vector2(0, 0))
		y += (E.nodes[0].size.y if E else 46.0) + GRID_GAP_Y
	# kartlar tembel kurulur: görünür alana yakın olanlar hemen, kalanı karelere yayılarak
	# (44 kartlık çanta tek karede kurulunca sekme geçişi takılıyordu)
	var gy := shell._abs_of(grid).y + root.scroll_y
	for x in owned:
		var pos := Vector2((i % 3) * GRID_STEP_X, y + (i / 3) * (161.8 + GRID_GAP_Y))
		_lazy.append({"f": _card.bind(grid, x, false, pos), "y": gy + pos.y})
		i += 1
	if owned.size(): y += ceilf(owned.size() / 3.0) * (161.8 + GRID_GAP_Y)
	if missing.size():
		var S := _add("kz_sep", grid, Vector2(0, y + 6.0))
		if S:
			var sp := S.find_exact("span")
			if sp: S.set_text(sp, "sandıklardan düşer · " + str(missing.size()))
		y += 10.0 + 6.0 + GRID_GAP_Y
		i = 0
		for x in missing:
			var pos2 := Vector2((i % 3) * GRID_STEP_X, y + (i / 3) * (161.8 + GRID_GAP_Y))
			_lazy.append({"f": _card.bind(grid, x, true, pos2), "y": gy + pos2.y})
			i += 1
		y += ceilf(missing.size() / 3.0) * (161.8 + GRID_GAP_Y)
	# kaydırma içeriği: çantanın dibi + sayfa alt dolgusu
	var grid_h := maxf(0.0, y - GRID_GAP_Y)
	var bag_h: float = (grid.pos.y + grid_h + 13.0) if bag else 0.0
	if bag: shell.resize_h(bag, bag_h)
	var S0 = root.d.get("scroll")
	if S0 is Dictionary:
		S0.h = 4.0 + (bag.pos.y if bag else 0.0) + bag_h + 18.0 + 96.0
	# gizli ön kurulumda (UIPrewarm) kartlar burada değil, _process'te karede bir kurulur —
	# tek karede ~30 kart kurulumu, kullanıcının o anki dokunuşunu dondurmasın
	_build_lazy(1000 if menu.page == "cephane" else 0)

## görünür alana (kaydırma ± ekran) yakın kartları kur; en çok n kart
func _build_lazy(n: int) -> void:
	if _lazy.is_empty() or root == null: return
	var top: float = root.scroll_y
	var vh: float = root.size.y
	var built := 0
	for c in _lazy.duplicate():
		if built >= n: break
		if float(c.y) + 170.0 > top - vh * 0.5 and float(c.y) < top + vh * 1.5:
			_lazy.erase(c)
			(c.f as Callable).call()
			built += 1

var _por: Control = null
var _animT := 0.0
var _popN := 0
func _process(_dt: float) -> void:
	# kahraman portresi nefes alır (hafif ölçek + ışık nabzı)
	if _por and is_instance_valid(_por) and is_visible_in_tree():
		_animT += _dt
		var k := 1.0 + 0.022 * sin(_animT * 2.2)
		_por.scale = Vector2(k, k)
		_por.modulate = Color(1, 1, 1).lerp(Color(1.12, 1.06, 0.95), 0.5 + 0.5 * sin(_animT * 2.2))
	if _lazy.is_empty(): return
	if is_visible_in_tree():
		_build_lazy(6)
		if not _lazy.is_empty() and not menu.busy():
			# görünmeyenler: karede bir
			var c: Dictionary = _lazy.pop_front()
			(c.f as Callable).call()
	elif not menu.busy():
		var c2: Dictionary = _lazy.pop_front()
		(c2.f as Callable).call()

func _card(grid: Lyr.N, x: Dictionary, locked: bool, pos: Vector2) -> Lyr:
	var rk: int = KZ_RANK.get(int(x.rarity), 1)
	var key := ""
	var on := false
	var wear := false
	if locked: key = "kc" + str(rk) + "_lock"
	else:
		on = g.is_equipped(x.id)
		wear = g.can_wear(x.id)
		key = "kc" + str(rk) + "_" + ("on" if on else ("own" if wear else "cant")) + ("_sel" if sel_id == x.id else "")
	# yakalanan kart yalnız düzen + dokunma alanları için; görüntü yerel çizgi roman kartı
	var C := _add(key, grid, pos)
	if C == null: return null
	# kart açılış: sırayla küçükten zıplayarak gelir
	if _popN < 18 and is_visible_in_tree():
		var sz: Vector2 = C.nodes[0].size
		var p0 := C.position
		C.scale = Vector2(0.6, 0.6)
		C.position = p0 + sz * 0.2
		C.modulate.a = 0.0
		var tw := C.create_tween().set_parallel(true).set_trans(Tween.TRANS_BACK).set_ease(Tween.EASE_OUT)
		var dl := 0.03 * _popN
		tw.tween_property(C, "scale", Vector2.ONE, 0.32).set_delay(dl)
		tw.tween_property(C, "position", p0, 0.32).set_delay(dl)
		tw.tween_property(C, "modulate:a", 1.0, 0.18).set_delay(dl)
		_popN += 1
	var root_n: Lyr.N = C.nodes[0]
	if root_n.img: root_n.img.visible = false
	for k in root_n.kids: C.set_hidden(k, true)
	var info := {"x": x, "locked": locked, "on": on, "wear": wear, "rk": rk, "sel": not locked and sel_id == x.id,
		"lv": g.gear_level(x.id) if not locked else 0, "need": null, "cards": 0, "better": false, "acts": []}
	if not locked:
		info.need = g.cards_for_next_gear(x.id)
		info.cards = g.gear_card_count(x.id)
		info.better = not on and wear and _better(x)
	var gid: String = x.id
	menu.btn(C, root_n, func(): _card_tap(gid, locked), 0.97)
	# tepsi düğmeleri (seçili kartta)
	if info.sel:
		var o := C.rect_of(root_n).position
		for b in C.find_all(".kc-act"):
			var k: String = b.d.key
			var r := C.rect_of(b)
			r.position -= o
			if k.contains("info"):
				menu.btn(C, b, func(): g.audio.play("click"); g.ui.open_gear_detail(gid))
				info.acts.append([r, "İNCELE", Color("#3aa0ff")])
			elif k.contains(".eq"):
				menu.btn(C, b, func(): _equip(gid))
				info.acts.append([r, "KUŞAN", ScrLevelUp.YEL])
			elif k.contains(".out"):
				menu.btn(C, b, func(): sel_id = ""; g.toggle_equip(gid))
				info.acts.append([r, "ÇIKAR", Color("#e8463c")])
		# geliştirilebilirse tepside GELİŞTİR: büyük düğme yerini alır, diğerleri alt sırada yan yana
		if g.can_upgrade_gear(gid) and info.acts.size():
			var big := -1
			for j in info.acts.size():
				if (info.acts[j][0] as Rect2).size.y >= 32.0: big = j
			var low: Rect2 = info.acts[-1][0]
			var up_r: Rect2
			var rest: Array = []
			if big >= 0:
				up_r = info.acts[big][0]
				for j in info.acts.size():
					if j != big: rest.append(info.acts[j])
				rest.push_front(info.acts[big])
			else:
				up_r = Rect2(low.position - Vector2(0, 36), Vector2(low.size.x, 32))
				rest = info.acts.duplicate()
			# alt sıra: kalan düğmeler low satırını eşit böler
			var n := rest.size()
			var gap := 4.0
			var cw := (low.size.x - gap * (n - 1)) / n
			var nacts: Array = [[up_r, "GELİŞTİR", GearCard.GREEN]]
			for j in n:
				var rr := Rect2(low.position + Vector2(j * (cw + gap), 0), Vector2(cw, low.size.y))
				nacts.append([rr, rest[j][1], rest[j][2]])
			info.acts = nacts
			# dokunma alanları: yakalanan düğmeler yerine yeni dikdörtgenler (kart köküne göre)
			for b in C.find_all(".kc-act"): menu.unbtn_node(C, b)
			for a2 in nacts:
				var lbl: String = a2[1]
				var cb: Callable
				if lbl == "GELİŞTİR": cb = func(): _upgrade(gid)
				elif lbl == "İNCELE": cb = func(): g.audio.play("click"); g.ui.open_gear_detail(gid)
				elif lbl == "KUŞAN": cb = func(): _equip(gid)
				else: cb = func(): sel_id = ""; g.toggle_equip(gid)
				menu.btn(C, root_n, cb, 1.0, 2.0, Rect2(o + (a2[0] as Rect2).position, (a2[0] as Rect2).size))
				menu.clip_last()
	GearCard.build(root_n.node, root_n.size, info, _gear_tex(str(x.icon)))
	_cardOf[gid] = {"C": C, "args": [grid, x, locked, pos]}
	return C

## tek kartı yerinde yeniden kur (seçim değişince bütün sayfa kurulmasın — dokunuş takılmasın)
func _rebuild_card(gid: String) -> void:
	if gid == "" or not _cardOf.has(gid): return
	var e: Dictionary = _cardOf[gid]
	var C: Lyr = e.C
	if is_instance_valid(C):
		menu.unbtn(C)
		_items.erase(C)
		C.queue_free()
	var a: Array = e.args
	_card(a[0], a[1], a[2], a[3])

## kart içine yakalanmış küçük bir bileşen bindir (kart köküne göre konum)
func _sub(C: Lyr, key: String, pos: Vector2) -> Lyr:
	if not FileAccess.file_exists(Lyr.BASE + key + ".json"): return null
	var S := Lyr.make(key)
	C.nodes[0].node.add_child(S)
	S.position = pos
	return S

## bileşenin karta göre konumu: iki yakalama aynı kapta, ilk çocuk olarak yapıldı
static var _rects := {}
static func _rect_of(key: String) -> Array:
	if not _rects.has(key):
		var J := Lyr.load_json(key)
		_rects[key] = J.get("rect", [0, 0, 0, 0])
	return _rects[key]

func _rel(card_key: String, comp_key: String) -> Vector2:
	var a := _rect_of(card_key)
	var b := _rect_of(comp_key)
	return Vector2(float(b[0]) - float(a[0]), float(b[1]) - float(a[1]))

func _better(x: Dictionary) -> bool:
	var cur = g.char_gear_map().get(x.slot)
	var c = g.gear_by_id(cur) if cur else null
	return pow_of(g, x) > (pow_of(g, c) if c else 0)

func _card_tap(id: String, locked: bool) -> void:
	g.audio.play("click")
	if locked or sel_id == id:
		g.ui.open_gear_detail(id)
		return
	var old := sel_id
	sel_id = id
	_rebuild_card(old)
	_rebuild_card(id)

## karttaki GELİŞTİR: yükseltme töreni; kapanınca yalnız bu kart yeniden kurulur
func _upgrade(id: String) -> void:
	if not g.can_upgrade_gear(id):
		g.audio.play("error")
		return
	var lv0: int = g.gear_level(id)
	if not g.upgrade_gear(id, true): return
	g.ui.menu.refresh_wallet()
	ScrUpFx.play_gear(g, g.gear_by_id(id), lv0, func(): on_gear_upgraded(id))

## eşya geliştirildi: kuşanılıysa statlar değişir → sayfa; değilse yalnız kartı
func on_gear_upgraded(id: String) -> void:
	if g.is_equipped(id): render()
	else: _rebuild_card(id)

func _equip(id: String) -> void:
	sel_id = ""
	g.equip_gear(id, true)      # sessiz: sayfayı game değil burada TEK kez kur (eskiden iki kez)
	g.audio.play("equip")
	g.ui.menu.refresh_wallet()
	render()
