class_name ScrLevelUp
extends Node2D
## ui.js showLevelUp — SEVİYE ATLAMA kart seçimi. Kabuk (lv_screen), kart türleri
## (lvc_*), etiket rozetleri (lvs_*), evrim şeridi (lv_evo) ve glifler web'den
## katman olarak yakalandı (tools/bake/ui/scn/levelup.mjs); burada içerik doldurulur:
## tür seçimi (kademe/özel perk/myth/kahraman × kademe/lanet/evrim), kademe noktaları,
## etiket rozeti, glif, ad (1-2 satır ortalı), açıklama, kart töreni gecikmeleri.

const LEVEL_TIERS := ["#9aa0b8", "#41a8ff", "#b565ff", "#d8a284", "#b87351"]
const ROMAN := ["I", "II", "III", "IV", "V"]
const HEROES := ["seher", "simsek", "korsan", "kralice", "sovalye"]
const GLYPH_DIR := "res://assets/ui/lyr/glyph/"

var g
var shell: Lyr
var evo: Lyr
var cards: Array = []        # [{lyr, choice, rect, chip}]
var _press := -1
var _pressIdx := -1
var _pressBtn := ""
var _reroll: Lyr.N
static var _glyphs := {}

func _init(game) -> void:
	g = game
	name = "LevelUp"
	visible = false
	process_mode = Node.PROCESS_MODE_ALWAYS

## glif dosyası: cardArt.cardGlyph ile aynı arama sırası
static func glyph_file(c: Dictionary) -> String:
	if _glyphs.is_empty():
		var f := FileAccess.open(GLYPH_DIR + "glyphs.json", FileAccess.READ)
		_glyphs = JSON.parse_string(f.get_as_text()) if f else {"tables": {}}
	var T: Dictionary = _glyphs.get("tables", {})
	var kind: String = c.get("kind", "")
	if kind == "passive": return T.get("PASSIVE_GLYPHS", {}).get(c.get("id", ""), "fallback")
	if kind == "heal" or kind == "guc": return T.get("BOON_GLYPHS", {}).get(c.get("id", ""), "fallback")
	var ic: String = str(c.get("icon", c.get("id", "")) if c.get("icon") != null else c.get("id", ""))
	for tb in ["SEHER_GLYPHS", "SIMSEK_GLYPHS", "SAVASCI_GLYPHS", "GOKALEV_GLYPHS", "KORSAN_GLYPHS", "KRALICE_GLYPHS", "SOVALYE_GLYPHS", "SAPANCI_GLYPHS", "WEAPON_GLYPHS"]:
		var t: Dictionary = T.get(tb, {})
		if t.has(ic): return t[ic]
	return "fallback"

## kart türü (yakalanan lvc_<tür>) + vurgu/etiket — ui.js showLevelUp kararlarıyla aynı
static func card_kind(c: Dictionary) -> Dictionary:
	var sig := bool(c.get("sig", false))
	var target: int = int(c.get("tier", 1)) if sig else int(c.get("level", 0)) + 1
	var ti := clampi(target - 1, 0, 4)
	var isPerk: bool = c.get("kind", "") == "special" and not sig
	var myth := bool(c.get("myth", false))
	var hero := ""
	for h in HEROES:
		if c.get(h, false): hero = h; break
	var v := ""
	if c.get("curse", false): v = "curse"
	elif c.get("evo", false): v = "evo"
	elif hero != "": v = hero + str(mini(3, ti + 1))
	elif myth: v = "myth"
	elif isPerk: v = "perk"
	else: v = "base" + str(ti)
	var kd := ""   # dar şerit: "KADEME " yazılmaz
	var tag: String
	if c.get("curse", false): tag = "LANETLİ · GÜÇ + BEDEL"
	elif c.get("evo", false): tag = "EVRİM · ÜST FORM"
	elif hero == "seher": tag = "SEHER · " + kd + ROMAN[ti]
	elif hero == "simsek": tag = "ŞİMŞEK · " + kd + ROMAN[ti]
	elif hero == "korsan": tag = "KAPTAN · " + kd + ROMAN[ti]
	elif hero == "kralice": tag = "KRALİÇE · " + kd + ROMAN[ti]
	elif myth: tag = "YETENEK · " + kd + ROMAN[ti]
	elif sig: tag = "İMZA · " + kd + ROMAN[ti]
	elif isPerk: tag = "ÖZEL PERK"
	elif c.get("kind", "") == "passive": tag = ("PASİF · SV " + str(target)) if int(c.get("level", 0)) > 0 else "PASİF RÜN"
	else: tag = "NİMET"
	return {"v": v, "tag": tag, "target": target, "ti": ti}

static func rank(c: Dictionary) -> int:
	if c.get("evo", false): return 4
	if c.get("myth", false): return 3
	if c.get("kind", "") == "special" and (not c.get("sig", false) or int(c.get("tier", 0)) >= 3): return 2
	if c.get("kind", "") == "passive": return 0
	return 1

func _clear() -> void:
	for C in cards: (C.lyr as Node).queue_free()
	cards.clear()
	if evo: evo.queue_free(); evo = null

func show_choices(choices: Array) -> void:
	# ekranda daima TAM 3 kart, aynı kimlik iki kez yok
	var seen := {}
	var list := []
	for c in choices:
		if c is Dictionary and not seen.has(c.get("id")):
			seen[c.get("id")] = true
			list.append(c)
	list = list.slice(0, 3)
	_clear()
	if shell == null:
		shell = Lyr.make("lv_screen")
		add_child(shell)
		_reroll = shell.find("#btn-reroll")
	else:
		shell.restart()
	visible = true
	g.audio.play("levelup")
	var cc := shell.find("#card-container")
	var crect := shell.rect_of(cc)
	var gap := 9.0
	var n := list.size()
	var cw := (crect.size.x - gap * (n - 1)) / maxf(1, n)
	# tören: nadirlik sırasıyla iner; en üst destan karttan önce 120 ms nefes
	var order := []
	for i in n: order.append([rank(list[i]), i])
	order.sort_custom(func(a, b): return a[0] < b[0] or (a[0] == b[0] and a[1] < b[1]))
	var delay := {}
	var top := -1
	for k in order.size():
		var r: int = order[k][0]
		var i: int = order[k][1]
		var is_top := r >= 3 and k == order.size() - 1
		if is_top: top = i
		delay[i] = k * 110 + (120 if is_top else 0)
	for i in n:
		var c: Dictionary = list[i]
		var K := card_kind(c)
		var L := Lyr.make("lvc_" + K.v, [".lv-stag"])
		add_child(L)
		var x := crect.position.x + i * (cw + gap)
		L.position = Vector2(x, crect.position.y)
		var C := {"lyr": L, "choice": c, "rect": Rect2(x, crect.position.y, cw, L.rect_of(L.nodes[0]).size.y)}
		_fill(L, c, K, i == top or c.get("pow", false))
		L.set_anim_delay(L.nodes[0], "lvIn", delay[i])
		for nn in L.nodes:
			if String(nn.d.get("kind", "")) == "after" and nn.d.get("parent") == L.nodes[0].d.id:
				L.set_anim_delay(nn, "lvTopGlow", delay[i])
		L.restart()
		cards.append(C)
	# satır: kartlar en uzun doğal yüksekliğe esner
	var row_h := 0.0
	for C in cards:
		var L2: Lyr = C.lyr
		row_h = maxf(row_h, L2.nodes[0].size.y + float(L2.get_meta("delta", 0.0)))
	for C in cards:
		_settle(C.lyr, row_h)
		(C.rect as Rect2).size.y = row_h
		C.rect = Rect2((C.rect as Rect2).position, Vector2((C.rect as Rect2).size.x, row_h))
	_evo_hint(list)
	_sync_reroll()

func _fill(L: Lyr, c: Dictionary, K: Dictionary, top: bool) -> void:
	var root: Lyr.N = L.nodes[0]
	var W := root.size.x
	# en üst kart ışıması yalnız lv-top / lv-pow kartında
	if not top:
		for nn in L.nodes:
			if String(nn.d.get("kind", "")) == "after" and nn.d.get("parent") == root.d.id:
				for A in nn.anims:
					if String(A.get("name", "")) == "lvTopGlow": L.set_hidden(nn, true)
	# etiket
	var tag := L.find(".lv-tag")
	if tag:
		L.set_text(tag, K.tag)
		var tx: UIText = tag.txt
		var pad: float = tag.size.x - (tx.wrap_w if tx.wrap_w > 0 else tag.size.x)
		var nw := tx.text_width() + pad
		L.fit_width(tag, nw)
	# kademe noktaları
	var pips := L.find(".lv-pips")
	var mx := int(c.get("max", 1))
	if pips:
		var kids: Array = pips.kids
		if mx <= 1: L.set_hidden(pips, true)
		else:
			var on_tex: Texture2D = null
			var off_tex: Texture2D = null
			for p in kids:
				if p.img == null: continue
				if String(p.d.key).contains(".on"): on_tex = (p.img as Sprite2D).texture
				else: off_tex = (p.img as Sprite2D).texture
			var cnt := mini(mx, kids.size())
			var span := cnt * 7 + (cnt - 1) * 4
			var x0 := (pips.size.x - span) * 0.5
			for j in kids.size():
				var p: Lyr.N = kids[j]
				L.set_hidden(p, j >= cnt)
				if j < cnt:
					p.pos.x = x0 + j * 11
					var on := j + 1 <= int(K.target)
					var t2 := on_tex if on else off_tex
					if t2 and p.img is Sprite2D: (p.img as Sprite2D).texture = t2
	# ad (1-2 satır, kutu içinde dikey ortalı)
	var nm := L.find(".lv-name")
	if nm:
		L.set_text(nm, str(c.get("name", "")))
		L.v_center_text(nm)
	var ds := L.find(".lv-desc")
	if ds: L.set_text(ds, str(c.get("desc", "")))
	# glif: bütün svg düğümleri (madalyon + kahraman filigranı)
	var gf := glyph_file(c)
	for nn in L.find_all("svg"):
		_glyph(L, nn, gf)
	# etiket rozeti → içerik yükseklik farkı (rozet yok / eşik rozeti daha uzun)
	var st = c.get("stag")
	var sr := _stag_rect(L)
	var delta := 0.0
	var chip: Lyr = null
	if st != null and str(st) != "":
		chip = _chip(L, str(st), int(c.get("stagN", 0)))
		if chip: delta = chip.nodes[0].size.y - sr.size.y
	elif sr.size.y > 0:
		delta = -(sr.size.y + 6)
	L.set_meta("delta", delta)
	L.set_meta("chip", chip)

## satır yüksekliği eşitlemesi (kartlar en uzuna esner) + rozet sonrası içerik kayması
func _settle(L: Lyr, row_h: float) -> void:
	var root: Lyr.N = L.nodes[0]
	var h0: float = root.d.get("_h0", root.size.y)
	var delta: float = L.get_meta("delta", 0.0)
	L.stretch_h(row_h - h0)
	for key in [".lv-orn", ".lv-desc"]:
		var m := L.find(key)
		if m == null: continue
		var par = m.d.get("parent")
		var vrel := float(m.d.get("vy", 0.0)) - (float(L.by_id[str(par)].d.get("vy", 0.0)) if par != null else 0.0)
		L.move(m, m.pos + Vector2(0, delta * (1.0 - vrel)))
	var chip: Lyr = L.get_meta("chip", null)
	if chip:
		var sr := _stag_rect(L)
		var info := L.find(".lv-info")
		var dy := 0.0
		if info: dy = info.pos.y - float(info.d.get("_y0", info.pos.y))
		chip.position.y = sr.position.y + dy

## kartın veri ağacındaki (kurulmamış) .lv-stag kutusu → kök koordinatı
func _stag_rect(L: Lyr) -> Rect2:
	var byid := {}
	for d in L.data.nodes: byid[str(d.id)] = d
	for d in L.data.nodes:
		if String(d.get("key", "")).begins_with(".lv-stag"):
			var p := Vector2.ZERO
			var e = d
			while e != null:
				p += Vector2(e.box[0], e.box[1])
				e = byid.get(str(e.get("parent"))) if e.get("parent") != null else null
			return Rect2(p, Vector2(d.box[2], d.box[3]))
	return Rect2()

func _chip(L: Lyr, tag: String, n: int) -> Lyr:
	var T: Dictionary = g.weapons.TAGS.get(tag, {})
	if T.is_empty(): return null
	var nx = null
	for tr in T.get("tiers", []):
		if int(tr.n) > n: nx = tr; break
	var hit: bool = nx != null and int(nx.n) == n + 1
	var C := Lyr.make("lvs_" + tag + "_" + ("1" if hit else "0"))
	var r := _stag_rect(L)
	L.add_child(C)
	var cw: float = C.nodes[0].size.x
	var root_w: float = L.nodes[0].size.x
	C.position = Vector2((root_w - cw) * 0.5, r.position.y)
	var b := C.find_exact("b")
	if b: C.set_text(b, g.weapons.tag_name(tag))
	var em := C.find_exact("em")
	if em: C.set_text(em, str(n) + "→" + str(n + 1) + ((" / " + str(int(nx.n))) if nx != null else ""))
	var it := C.find_exact("i")
	if it and nx != null: C.set_text(it, str(nx.name))
	return C

func _glyph(L: Lyr, nn: Lyr.N, gf: String) -> void:
	if not (nn.img is Sprite2D): return
	var spr := nn.img as Sprite2D
	var tex: Texture2D = load(GLYPH_DIR + gf + ".png") if ResourceLoader.exists(GLYPH_DIR + gf + ".png") else null
	if tex == null: return
	var glow: Texture2D = load(GLYPH_DIR + gf + "_glow.png") if ResourceLoader.exists(GLYPH_DIR + gf + "_glow.png") else null
	var st: Dictionary = nn.d.get("static", {})
	var col := JS.col(st.get("color", "#ffffff"))
	# svg kutusu (en-boy korunur, ortalı) — glif 66 px karede 38 px (14 px pay), 3×
	var s: float = minf(nn.size.x, nn.size.y) / 38.0
	var off := (nn.size - Vector2(38, 38) * s) * 0.5 - Vector2(14, 14) * s
	spr.texture = tex
	spr.position = off
	spr.scale = Vector2.ONE * (s / 3.0)
	spr.modulate = col
	# drop-shadow hale(ler)i: filtre dizesinden renk
	var fl: String = st.get("filter", "none")
	if glow and fl.begins_with("drop-shadow"):
		for sh in UIK.shadows(fl.replace("drop-shadow(", "").replace(") drop-shadow(", ", ").trim_suffix(")")):
			var gs := Sprite2D.new()
			gs.centered = false
			gs.texture = glow
			gs.position = off
			gs.scale = spr.scale
			gs.modulate = sh[0]
			gs.material = spr.material
			spr.add_sibling(gs)
			spr.get_parent().move_child(gs, spr.get_index())

func _evo_hint(list: Array) -> void:
	var H = g.weapons.evo_hint()
	var has_evo := false
	for c in list:
		if c.get("evo", false): has_evo = true
	if H == null or has_evo: return
	evo = Lyr.make("lv_evo")
	add_child(evo)
	var R: Array = evo.data.get("rect", [0, 0, 0, 0])
	evo.position = Vector2(R[0], R[1])
	var b := evo.find("b")
	if b: evo.set_text(b, str(H.name))
	var reqs := evo.find_all(".leh-req")
	if reqs.size() >= 2:
		evo.set_text(reqs[0], "İMZA " + str(H.sig) + "/5")
		evo.set_text(reqs[1], Txt.upper_tr(str(H.pasName)) + " " + str(H.pas) + "/2")
		# hap genişlikleri metne göre, satır soldan akar (gap 8)
		var x: float = reqs[0].pos.x
		for i in 2:
			var q: Lyr.N = reqs[i]
			var w0: float = q.size.x
			var tw0 := q.txt.wrap_w if q.txt.wrap_w > 0 else w0
			var nw := q.txt.text_width() + (w0 - tw0)
			evo.fit_width(q, nw)
			evo.move(q, Vector2(x, q.pos.y))
			x += nw + 8
			var ok: bool = (H.sig >= 5) if i == 0 else (H.pas >= 2)
			if ok: q.txt.color = Color("#8fd6a4")

func _sync_reroll() -> void:
	if _reroll == null: return
	var n := int(g.rerolls)
	var cnt := shell.find("#rr-count")
	if cnt: shell.set_text(cnt, str(n))
	_reroll.op_mul = 0.34 if n <= 0 else 1.0
	shell.set_dyn(_reroll)

func hide_screen() -> void:
	visible = false
	_clear()

# ═══════════ GİRİŞ ═══════════

func _input(ev: InputEvent) -> void:
	if not visible or not (ev is InputEventScreenTouch): return
	var st := ev as InputEventScreenTouch
	if st.pressed:
		for i in cards.size():
			if (cards[i].rect as Rect2).has_point(st.position):
				_press = st.index; _pressIdx = i; _pressBtn = ""
				(cards[i].lyr as Lyr).nodes[0].extra = Transform2D(0, Vector2(0.98, 0.98), 0, Vector2.ZERO)
				(cards[i].lyr as Lyr).set_dyn((cards[i].lyr as Lyr).nodes[0])
				get_viewport().set_input_as_handled()
				return
		if _reroll and int(g.rerolls) > 0 and shell.rect_of(_reroll).grow(4).has_point(st.position):
			_press = st.index; _pressBtn = "reroll"
			get_viewport().set_input_as_handled()
	elif st.index == _press:
		_press = -1
		get_viewport().set_input_as_handled()
		if _pressBtn == "reroll":
			_pressBtn = ""
			if shell.rect_of(_reroll).grow(12).has_point(st.position): g.reroll_cards()
			return
		if _pressIdx >= 0 and _pressIdx < cards.size():
			var C: Dictionary = cards[_pressIdx]
			(C.lyr as Lyr).nodes[0].extra = Transform2D.IDENTITY
			_pressIdx = -1
			if (C.rect as Rect2).grow(10).has_point(st.position):
				g.call_deferred("pick_upgrade", C.choice)
