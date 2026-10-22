class_name ScrLevelUp
extends Node2D
## SEVİYE ATLAMA kart seçimi (v2, Borderlands çizgi roman dili): sade — başlık, üç büyük kart,
## tek "YENİLE" düğmesi. Kart: mürekkep konturlu, nadirlik renginde başlık şeridi + tür etiketi,
## yarım ton (halftone) noktalı madalyon zemini, glif, ad, kademe noktaları, kısa açıklama.
## Animasyon: arka plan kararır + dönen ışınlar, başlık patlar, kartlar sırayla aşağıdan
## dönerek uçar ve arka yüzden ön yüze ÇEVRİLİR (en nadir kart en son, ışıltıyla); boşta
## hafif süzülme + parıltı süpürmesi; seçilen kart büyüyüp ortaya gelir, ışık patlaması,
## diğerleri düşerek söner → seçim uygulanır.

const LEVEL_TIERS := ["#7fb8d8", "#3aa0ff", "#a85cff", "#ffb020", "#ff6a2a"]
const ROMAN := ["I", "II", "III", "IV", "V"]
const HEROES := ["seher", "simsek", "korsan", "kralice", "sovalye"]
const GLYPH_DIR := "res://assets/ui/lyr/glyph/"
const INK := Color(0.05, 0.03, 0.07)
const CW := 116.0
const CH := 244.0
const PAPER := Color("#fff3d6")
const YEL := Color("#ffd23a")

var g
var cards: Array = []        # [{node, back, face, choice, col, t0, base}]
var _W := Vector2(390, 844)
var _bg: ColorRect
var _rays: Node2D
var _title: UIText
var _sub: UIText
var _reroll: Node2D
var _rr_txt: UIText
var _t := 0.0
var _pick := -1
var _pick_t := 0.0
var _press := -1
var _press_i := -1
var _spark: Node2D
var _sparks: Array = []
var _mode := "level"          # "level" · "bless" (savaş öncesi kutsama / sunak)
var _cb := Callable()
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


static func _type_label(c: Dictionary, K: Dictionary) -> String:
	if c.get("bless", false): return str(c.get("label", "KUTSAMA"))
	if c.get("curse", false): return "LANET"
	if c.get("evo", false): return "EVRİM"
	if c.get("myth", false): return "YETENEK"
	if c.get("sig", false): return "İMZA " + ROMAN[int(K.ti)]
	if c.get("kind", "") == "special": return "ÖZEL"
	if c.get("kind", "") == "passive": return "PASİF"
	return "NİMET"

static func _card_col(c: Dictionary, K: Dictionary) -> Color:
	if c.get("bless", false):
		var bc := Color(str(c.get("bcol", "#d8a284")))
		return Color.from_hsv(bc.h, clampf(bc.s * 1.6, 0.45, 0.85), clampf(bc.v * 1.05, 0.7, 0.95))
	if c.get("curse", false): return Color("#ff4a5e")
	if c.get("evo", false): return Color("#ffcf5a")
	if c.get("myth", false): return Color("#ff7a3c")
	return Color(LEVEL_TIERS[clampi(int(K.ti), 0, 4)])

func _clear() -> void:
	for C in cards: (C.node as Node).queue_free()
	cards.clear()

func _ensure_shell() -> void:
	if _bg: return
	_W = UIK.ui_size(get_viewport())
	_bg = ColorRect.new()
	_bg.color = Color(0.06, 0.02, 0.08, 0.8)
	var SR := UIK.screen_rect(self)          # tüm ekran (yan kenarlar dahil)
	_bg.size = SR.size
	_bg.position = SR.position
	_bg.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(_bg)
	_rays = Node2D.new()
	_rays.position = Vector2(_W.x * 0.5, _W.y * 0.52 - CH * 0.5 - 64.0)
	_rays.draw.connect(_draw_rays)
	add_child(_rays)
	# başlık: çizgi roman yazısı (Bangers), sarı + kalın mürekkep, hafif eğik, patlama zemini üstünde
	_title = _mk_text(false, 1000, 44, 1.5, YEL, UIK.ink_stroke(3.0, 4.0))
	_title.text = "SEVİYE ATLADIN!"
	_sub = _mk_text(false, 1000, 19, 2.0, Color.WHITE, UIK.ink_stroke(2.0, 2.0))
	_sub.text = "BİR GÜÇ SEÇ!"
	_reroll = Node2D.new()
	_reroll.draw.connect(_draw_reroll)
	add_child(_reroll)
	_rr_txt = _mk_text(false, 1000, 20, 1.5, INK, "")
	_rr_txt.reparent(_reroll)
	_spark = Node2D.new()
	_spark.draw.connect(_draw_sparks)
	add_child(_spark)

func _mk_text(disp: bool, w: int, sz: float, ls: float, col: Color, sh: String) -> UIText:
	var t := UIText.new()
	t.style(disp, w, sz, ls, col, sh)
	t.align = 0.5
	t.nowrap = true
	t.wrap_w = _W.x
	t.size = Vector2(_W.x, sz * 1.6)     # sıfır boyutlu Control ekran dışı sayılıp kırpılmasın
	add_child(t)
	return t

## savaş öncesi KUTSAMA / sunak seçimi: aynı çizgi roman kartları, artı/eksi satırları
func show_bless(blist: Array, cb: Callable, opt = null) -> void:
	var o: Dictionary = opt if opt is Dictionary else {}
	_mode = "bless"
	_cb = cb
	var conv := []
	for b in blist:
		conv.append({"id": b.get("id", ""), "name": b.get("name", ""), "plus": b.get("plus", ""), "minus": b.get("minus", ""),
			"bless": true, "bcol": b.get("col", "#d8a284"), "kind": "guc", "_b": b, "label": "SUNAK" if o.get("k", "") == "SUNAK" else "KUTSAMA"})
	_ensure_shell()
	_title.text = str(o.get("t", "BİR KUTSAMA SEÇ")) + "!"
	_sub.text = str(o.get("k", "SAVAŞTAN ÖNCE"))
	_show(conv)

func show_choices(choices: Array) -> void:
	_mode = "level"
	_cb = Callable()
	_ensure_shell()
	_title.text = "SEVİYE ATLADIN!"
	_sub.text = "BİR GÜÇ SEÇ!"
	_show(choices)

func _show(choices: Array) -> void:
	var seen := {}
	var list := []
	for c in choices:
		if c is Dictionary and not seen.has(c.get("id")):
			seen[c.get("id")] = true
			list.append(c)
	list = list.slice(0, 3)
	_ensure_shell()
	_clear()
	visible = true
	_t = 0.0
	_pick = -1
	_press = -1
	_sparks.clear()
	g.audio.play("levelup")
	var n := list.size()
	var gap := 10.0
	var total := n * CW + (n - 1) * gap
	var x0 := (_W.x - total) * 0.5
	var cy := _W.y * 0.52
	# tören sırası: nadirlik artan, en nadir en son
	var order := []
	for i in n: order.append([rank(list[i]), i])
	order.sort_custom(func(a, b): return a[0] < b[0] or (a[0] == b[0] and a[1] < b[1]))
	var delay := {}
	for k in order.size(): delay[order[k][1]] = 0.25 + k * 0.16 + (0.12 if order[k][0] >= 3 and k == order.size() - 1 else 0.0)
	for i in n:
		var c: Dictionary = list[i]
		var K := card_kind(c)
		var col := _card_col(c, K)
		var node := Node2D.new()
		node.position = Vector2(x0 + i * (CW + gap) + CW * 0.5, cy)
		add_child(node)
		var back := Node2D.new()
		back.draw.connect(_draw_back.bind(back, col))
		node.add_child(back)
		var face := Node2D.new()
		face.visible = false
		node.add_child(face)
		_build_face(face, c, K, col)
		node.scale = Vector2.ZERO
		cards.append({"node": node, "back": back, "face": face, "choice": c, "col": col, "t0": float(delay[i]),
			"base": node.position, "rare": rank(c) >= 3, "sh": randf() * 3.0, "flipped": false})
	move_child(_spark, get_child_count() - 1)
	_sync_reroll()
	_layout_static()

func _layout_static() -> void:
	var top := _W.y * 0.52 - CH * 0.5
	_title.position = Vector2(0, top - 104.0)
	_sub.position = Vector2(0, top - 50.0)
	_reroll.position = Vector2(_W.x * 0.5, top + CH + 46.0)
	_rr_txt.position = Vector2(-_W.x * 0.5, -14.0)

# ── kart yüzü (çizgi roman) ──
func _build_face(face: Node2D, c: Dictionary, K: Dictionary, col: Color) -> void:
	var w := CW
	var h := CH
	var dark := col.darkened(0.45)
	var lite := col.lightened(0.35)
	var mc := Vector2(0, -h * 0.5 + 70)
	var bg := Node2D.new()
	bg.draw.connect(func():
		var r := Rect2(-w * 0.5, -h * 0.5, w, h)
		# mürekkep ofset gölge + gövde (nadirlik rengi)
		var sh := StyleBoxFlat.new()
		sh.bg_color = INK
		sh.set_corner_radius_all(12)
		bg.draw_style_box(sh, Rect2(r.position + Vector2(5, 6), r.size))
		var b := StyleBoxFlat.new()
		b.bg_color = col
		b.set_corner_radius_all(12)
		bg.draw_style_box(b, r)
		# madalyon arkasında aksiyon ışınları (kart içine kırpılı)
		var box := PackedVector2Array([r.position + Vector2(4, 4), Vector2(r.end.x - 4, r.position.y + 4), r.end - Vector2(4, 4), Vector2(r.position.x + 4, r.end.y - 4)])
		for i in 14:
			var a := i * TAU / 14.0
			var R := w * 1.2
			var tri := PackedVector2Array([mc, mc + Vector2(cos(a - 0.12), sin(a - 0.12)) * R, mc + Vector2(cos(a + 0.12), sin(a + 0.12)) * R])
			for q in Geometry2D.intersect_polygons(tri, box):
				if q.size() >= 3: bg.draw_colored_polygon(q, Color(lite, 0.55))
		# yarım ton: üstten aşağı büyüyen koyu noktalar
		for yy in range(0, 16):
			for xx in range(-7, 8):
				var p := Vector2(xx * 8.0 + (4.0 if yy % 2 else 0.0), -h * 0.5 + 6 + yy * 7.0)
				var rr := 0.4 + yy * 0.14
				if absf(p.x) < w * 0.5 - 6: bg.draw_circle(p, rr, Color(dark, 0.45))
		# açıklama kâğıdı (krem, mürekkep konturlu)
		var pr := Rect2(-w * 0.5 + 8, -h * 0.5 + 158, w - 16, h - 166)
		var pb := StyleBoxFlat.new()
		pb.bg_color = PAPER
		pb.set_corner_radius_all(8)
		pb.set_border_width_all(3)
		pb.border_color = INK
		bg.draw_style_box(pb, pr)
		# dış mürekkep kontur
		var o := StyleBoxFlat.new()
		o.bg_color = Color(0, 0, 0, 0)
		o.set_corner_radius_all(12)
		o.set_border_width_all(5)
		o.border_color = INK
		bg.draw_style_box(o, r)
		# madalyon: beyaz daire, kalın kontur, gölge
		bg.draw_circle(mc + Vector2(3, 4), 34, INK)
		bg.draw_circle(mc, 34, INK)
		bg.draw_circle(mc, 29, Color("#fffaf0"))
		bg.draw_circle(mc + Vector2(-8, -10), 9, Color(1, 1, 1, 0.9))
		bg.draw_arc(mc, 29, PI * 0.15, PI * 0.85, 16, Color(col, 0.55), 5.0, true))
	face.add_child(bg)
	# glif (mürekkep rengi)
	var gf := glyph_file(c)
	var tex: Texture2D = load(GLYPH_DIR + gf + ".png") if ResourceLoader.exists(GLYPH_DIR + gf + ".png") else null
	if tex:
		var sp := Sprite2D.new()
		sp.texture = tex
		sp.scale = Vector2.ONE * (38.0 / (tex.get_width() * 38.0 / 66.0))
		sp.position = mc
		sp.modulate = Color(0.1, 0.06, 0.12)
		face.add_child(sp)
	# tür etiketi: eğik siyah bant, beyaz çizgi roman yazısı
	var tag := Node2D.new()
	tag.position = Vector2(-w * 0.5 + 6, -h * 0.5 + 6)
	tag.rotation = -0.08
	var lbl := _type_label(c, K)
	tag.draw.connect(func():
		var tw := 14.0 + lbl.length() * 8.0
		tag.draw_rect(Rect2(0, 0, tw, 20), INK))
	var tl := UIText.new()
	tl.style(false, 1000, 15, 1.2, YEL, "")
	tl.nowrap = true
	tl.text = lbl
	tl.position = Vector2(7, 1)
	tag.add_child(tl)
	face.add_child(tag)
	# ad: beyaz çizgi roman yazısı, kalın mürekkep (1-2 satır)
	var nm := UIText.new()
	nm.style(false, 1000, 19, 0.8, Color.WHITE, UIK.ink_stroke(2.0, 2.0))
	nm.align = 0.5
	nm.nowrap = false
	nm.max_lines = 2
	nm.line_h = 19
	nm.wrap_w = w - 10
	nm.text = str(c.get("name", ""))
	nm.position = Vector2(-w * 0.5 + 5, -h * 0.5 + 110)
	face.add_child(nm)
	# kademe noktaları (kâğıdın üst kenarında)
	var mx := int(c.get("max", 1))
	if mx > 1:
		var pips := Node2D.new()
		var tgt := int(K.target)
		pips.draw.connect(func():
			var cnt := mini(mx, 5)
			var span := cnt * 12 + (cnt - 1) * 3
			var x := -span * 0.5 + 6
			for j in cnt:
				var on := j + 1 <= tgt
				var q := Vector2(x + j * 15, 0)
				var pts := PackedVector2Array([q + Vector2(0, -7), q + Vector2(7, 0), q + Vector2(0, 7), q + Vector2(-7, 0)])
				pips.draw_colored_polygon(pts, INK)
				var pi := PackedVector2Array([q + Vector2(0, -4), q + Vector2(4, 0), q + Vector2(0, 4), q + Vector2(-4, 0)])
				pips.draw_colored_polygon(pi, YEL if on else Color("#5a5060")))
		pips.position = Vector2(0, -h * 0.5 + 158)
		face.add_child(pips)
	# açıklama: kâğıt üstünde koyu yazı
	var ds := UIText.new()
	ds.style(false, 800, 11, 0.1, Color("#2a1c24"), "")
	ds.align = 0.5
	ds.nowrap = false
	ds.max_lines = 5
	ds.wrap_w = w - 26
	ds.text = str(c.get("desc", ""))
	ds.position = Vector2(-w * 0.5 + 13, -h * 0.5 + 170)
	face.add_child(ds)
	if c.get("bless", false):
		ds.text = "+ " + str(c.get("plus", ""))
		ds.color = Color("#1d7a34")
		ds.max_lines = 3
		var mi := UIText.new()
		mi.style(false, 800, 11, 0.1, Color("#b8202c"), "")
		mi.align = 0.5
		mi.nowrap = false
		mi.max_lines = 2
		mi.wrap_w = w - 26
		mi.text = "− " + str(c.get("minus", ""))
		mi.position = Vector2(-w * 0.5 + 13, -h * 0.5 + 170 + 15.0 * maxf(1.0, float(ds.line_count())) + 6.0)
		face.add_child(mi)
	# parıltı süpürmesi (kartın içine kırpılı)
	var shine := Node2D.new()
	shine.name = "shine"
	shine.draw.connect(_draw_shine.bind(shine))
	face.add_child(shine)

func _draw_back(n: Node2D, col: Color) -> void:
	var r := Rect2(-CW * 0.5, -CH * 0.5, CW, CH)
	var sh := StyleBoxFlat.new()
	sh.bg_color = INK
	sh.set_corner_radius_all(12)
	n.draw_style_box(sh, Rect2(r.position + Vector2(5, 6), r.size))
	var b := StyleBoxFlat.new()
	b.bg_color = col.darkened(0.25)
	b.set_corner_radius_all(12)
	b.set_border_width_all(5)
	b.border_color = INK
	n.draw_style_box(b, r)
	for i in 12:
		var a := i * TAU / 12.0
		n.draw_colored_polygon(PackedVector2Array([Vector2.ZERO, Vector2(cos(a - 0.13), sin(a - 0.13)) * 150, Vector2(cos(a + 0.13), sin(a + 0.13)) * 150]), Color(col.lightened(0.3), 0.5))
	n.draw_rect(Rect2(r.position + Vector2(5, 5), Vector2(0, 0)), INK)
	n.draw_circle(Vector2(2, 3), 32, INK)
	n.draw_circle(Vector2.ZERO, 32, INK)
	n.draw_circle(Vector2.ZERO, 27, YEL)
	if n.get_child_count() == 0:
		var q := UIText.new()
		q.style(false, 1000, 40, 0.0, INK, "")
		q.align = 0.5
		q.nowrap = true
		q.wrap_w = 60
		q.text = "?"
		q.position = Vector2(-30, -24)
		n.add_child(q)

func _draw_shine(n: Node2D) -> void:
	var k := fmod(_t * 0.45 + float(n.get_meta("ph", 0.0)), 1.0)
	if k > 0.35: return
	var x := lerpf(-CW, CW, k / 0.35)
	var a := Vector2(x - 14, -CH * 0.5)
	var poly := PackedVector2Array([a, a + Vector2(22, 0), a + Vector2(22 - 60, CH), a + Vector2(-60, CH)])
	var rect := PackedVector2Array([Vector2(-CW * 0.5 + 6, -CH * 0.5 + 6), Vector2(CW * 0.5 - 6, -CH * 0.5 + 6), Vector2(CW * 0.5 - 6, CH * 0.5 - 6), Vector2(-CW * 0.5 + 6, CH * 0.5 - 6)])
	for q in Geometry2D.intersect_polygons(poly, rect):
		if q.size() >= 3: n.draw_colored_polygon(q, Color(1, 1, 1, 0.13))

func _draw_rays() -> void:
	# başlık arkası: dönen sarı-turuncu ışınlar + sivri patlama (çizgi roman "POW" zemini)
	var a0 := _t * 0.3
	var R := _W.x * 1.1
	var al := clampf(_t / 0.4, 0.0, 1.0)
	for i in 16:
		var a := a0 + i * TAU / 16.0
		_rays.draw_colored_polygon(PackedVector2Array([Vector2.ZERO, Vector2(cos(a - 0.1), sin(a - 0.1)) * R, Vector2(cos(a + 0.1), sin(a + 0.1)) * R]), Color(1.0, 0.72, 0.2, 0.13 * al))
	var kb := clampf(_t / 0.35, 0.0, 1.0)
	var s := _back_ease(kb) if kb < 1.0 else 1.0 + sin(_t * 3.0) * 0.02
	var pts := PackedVector2Array()
	for i in 22:
		var a := -PI * 0.5 + i * TAU / 22.0 + 0.05
		var rr := (150.0 if i % 2 == 0 else 112.0) * s
		pts.append(Vector2(cos(a) * rr, sin(a) * rr * 0.42 - 6))
	var ink := PackedVector2Array()
	for p in pts: ink.append(p * 1.06 + Vector2(4, 5))
	_rays.draw_colored_polygon(ink, Color(INK, al))
	_rays.draw_colored_polygon(pts, Color(Color("#e8322c"), al))

func _draw_reroll() -> void:
	var n := int(g.rerolls)
	var w := 156.0
	var h := 42.0
	var r := Rect2(-w * 0.5, -h * 0.5, w, h)
	var sh := StyleBoxFlat.new()
	sh.bg_color = INK
	sh.set_corner_radius_all(21)
	_reroll.draw_style_box(sh, Rect2(r.position + Vector2(3, 5), r.size))
	var b := StyleBoxFlat.new()
	b.bg_color = YEL if n > 0 else Color("#6a6070")
	b.set_corner_radius_all(21)
	b.set_border_width_all(4)
	b.border_color = INK
	_reroll.draw_style_box(b, r)
	_reroll.draw_line(Vector2(-w * 0.5 + 16, -h * 0.5 + 9), Vector2(w * 0.5 - 16, -h * 0.5 + 9), Color(1, 1, 1, 0.55 if n > 0 else 0.15), 3.0)

func _draw_sparks() -> void:
	for s in _sparks:
		var k: float = (_t - float(s[2])) / float(s[3])
		if k < 0.0 or k >= 1.0: continue
		var p: Vector2 = s[0] + s[1] * (_t - float(s[2]))
		var r: float = float(s[4]) * (1.0 - k)
		var c: Color = s[5]
		c.a = 1.0 - k
		_spark.draw_colored_polygon(PackedVector2Array([p + Vector2(0, -r * 2.2), p + Vector2(r * 0.45, 0), p + Vector2(0, r * 2.2), p + Vector2(-r * 0.45, 0)]), c)
		_spark.draw_colored_polygon(PackedVector2Array([p + Vector2(-r * 2.2, 0), p + Vector2(0, r * 0.45), p + Vector2(r * 2.2, 0), p + Vector2(0, -r * 0.45)]), c)

func _burst(at: Vector2, col: Color, n: int, spd: float) -> void:
	for i in n:
		var a := randf() * TAU
		_sparks.append([at, Vector2(cos(a), sin(a)) * spd * randf_range(0.4, 1.0), _t, randf_range(0.35, 0.7), randf_range(2.5, 5.0), col.lerp(Color.WHITE, 0.4)])

func _sync_reroll() -> void:
	if _rr_txt == null: return
	var n := int(g.rerolls)
	_rr_txt.text = I18n.t("YENİLE  x" + str(n))
	_rr_txt.modulate.a = 1.0 if n > 0 else 0.45
	_reroll.queue_redraw()

static func _back_ease(k: float) -> float:
	var q := k - 1.0
	return 1.0 + 2.7 * q * q * q + 1.7 * q * q

func _process(dt: float) -> void:
	if not visible: return
	_t += dt
	_bg.modulate.a = clampf(_t / 0.25, 0.0, 1.0)
	_rays.queue_redraw()
	# başlık patlaması
	var kt := clampf(_t / 0.4, 0.0, 1.0)
	var ts := _back_ease(kt) if kt < 1.0 else 1.0 + sin(_t * 2.2) * 0.015
	_title.pivot_offset = Vector2(_W.x * 0.5, 26)
	_title.scale = Vector2.ONE * maxf(0.01, ts)
	_title.rotation = -0.05
	_title.modulate.a = kt
	_sub.modulate.a = clampf((_t - 0.2) / 0.3, 0.0, 1.0)
	_reroll.visible = _mode == "level"
	_reroll.modulate.a = clampf((_t - 0.9) / 0.3, 0.0, 1.0) * (0.0 if _pick >= 0 else 1.0)
	for i in cards.size():
		var C: Dictionary = cards[i]
		var node: Node2D = C.node
		var lt: float = _t - float(C.t0)
		var base: Vector2 = C.base
		if _pick >= 0:
			var kp := clampf((_t - _pick_t) / 0.45, 0.0, 1.0)
			if i == _pick:
				var e := 1.0 - pow(1.0 - kp, 3.0)
				node.position = base.lerp(Vector2(_W.x * 0.5, _W.y * 0.5), e)
				node.scale = Vector2.ONE * (1.0 + 0.22 * e + 0.06 * sin(kp * PI))
				node.rotation = 0.0
			else:
				node.position = base + Vector2(0, 260.0 * kp * kp)
				node.rotation = (0.4 if i < _pick else -0.4) * kp
				node.modulate.a = 1.0 - kp
			continue
		if lt < 0.0:
			node.scale = Vector2.ZERO
			continue
		# uçarak gel (aşağıdan, dönerek) → çevir (arka → ön)
		var kf := clampf(lt / 0.32, 0.0, 1.0)
		var ef := 1.0 - pow(1.0 - kf, 3.0)
		var start := base + Vector2((float(i) - 1.0) * 40.0, 420.0)
		var pos := start.lerp(base, ef)
		var rot := lerpf((float(i) - 1.0) * -0.5, 0.0, ef)
		var kflip := clampf((lt - 0.30) / 0.24, 0.0, 1.0)
		var sx := absf(cos(kflip * PI))
		var front := kflip >= 0.5
		if front and not C.flipped:
			C.flipped = true
			_burst(node.position, C.col, 14 if C.rare else 8, 220.0 if C.rare else 150.0)
			g.audio.play("tab")
		(C.back as Node2D).visible = not front
		(C.face as Node2D).visible = front
		var land := clampf((lt - 0.54) / 0.25, 0.0, 1.0)
		var pop := 1.0 + 0.08 * sin(land * PI)
		var bob := sin(_t * 2.0 + i * 1.3) * 3.0 if lt > 0.8 else 0.0
		node.position = pos + Vector2(0, bob)
		node.rotation = rot + (float(i) - 1.0) * 0.035 * clampf(land * 2.0, 0.0, 1.0)
		node.scale = Vector2(maxf(0.02, sx) * pop, pop) * minf(1.0, 0.6 + 0.4 * ef)
		var shine: Node2D = (C.face as Node2D).get_node_or_null("shine")
		if shine:
			shine.set_meta("ph", float(C.sh))
			shine.queue_redraw()
	if _pick >= 0 and _t - _pick_t >= 0.5:
		var choice: Dictionary = cards[_pick].choice
		_pick = -2
		if _mode == "bless":
			hide_screen()
			g.audio.play("bless")
			if _cb.is_valid(): _cb.call(choice.get("_b"))
		else:
			g.call_deferred("pick_upgrade", choice)
	_spark.queue_redraw()
	for s in _sparks.duplicate():
		if _t - float(s[2]) > float(s[3]): _sparks.erase(s)

func hide_screen() -> void:
	visible = false
	_clear()

# ═══════════ GİRİŞ ═══════════

func _card_at(p: Vector2) -> int:
	for i in cards.size():
		var node: Node2D = cards[i].node
		if not (cards[i].face as Node2D).visible: continue
		var lp := node.get_global_transform_with_canvas().affine_inverse() * p
		if Rect2(-CW * 0.5 - 6, -CH * 0.5 - 6, CW + 12, CH + 12).has_point(lp): return i
	return -1

func _input(ev: InputEvent) -> void:
	if not visible or not (ev is InputEventScreenTouch) or _pick != -1: return
	var st := ev as InputEventScreenTouch
	var lp := get_global_transform_with_canvas().affine_inverse() * st.position
	if st.pressed:
		var i := _card_at(st.position)
		if i >= 0:
			_press = st.index
			_press_i = i
			(cards[i].node as Node2D).modulate = Color(0.9, 0.9, 0.9)
			get_viewport().set_input_as_handled()
			return
		if _mode == "level" and int(g.rerolls) > 0 and _t > 0.9 and Rect2(_reroll.position - Vector2(80, 24), Vector2(160, 48)).has_point(lp):
			_press = st.index
			_press_i = -2
			get_viewport().set_input_as_handled()
	elif st.index == _press:
		_press = -1
		get_viewport().set_input_as_handled()
		if _press_i == -2:
			if Rect2(_reroll.position - Vector2(90, 30), Vector2(180, 60)).has_point(lp): g.reroll_cards()
			return
		if _press_i >= 0 and _press_i < cards.size():
			(cards[_press_i].node as Node2D).modulate = Color.WHITE
			if _card_at(st.position) == _press_i:
				_pick = _press_i
				_pick_t = _t
				var C: Dictionary = cards[_pick]
				_burst((C.node as Node2D).position, C.col, 26, 300.0)
				g.audio.play("click")
				Input.vibrate_handheld(20)

static func glyph_into(L: Lyr, nn: Lyr.N, gf: String) -> void:
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

