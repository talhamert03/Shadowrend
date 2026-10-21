class_name ScrLevelUp
extends Node2D
## SEVİYE ATLAMA kart seçimi (v2, Borderlands çizgi roman dili): sade — başlık, üç büyük kart,
## tek "YENİLE" düğmesi. Kart: mürekkep konturlu, nadirlik renginde başlık şeridi + tür etiketi,
## yarım ton (halftone) noktalı madalyon zemini, glif, ad, kademe noktaları, kısa açıklama.
## Animasyon: arka plan kararır + dönen ışınlar, başlık patlar, kartlar sırayla aşağıdan
## dönerek uçar ve arka yüzden ön yüze ÇEVRİLİR (en nadir kart en son, ışıltıyla); boşta
## hafif süzülme + parıltı süpürmesi; seçilen kart büyüyüp ortaya gelir, ışık patlaması,
## diğerleri düşerek söner → seçim uygulanır.

const LEVEL_TIERS := ["#9aa0b8", "#41a8ff", "#b565ff", "#ffb03a", "#ff7a3c"]
const ROMAN := ["I", "II", "III", "IV", "V"]
const HEROES := ["seher", "simsek", "korsan", "kralice", "sovalye"]
const GLYPH_DIR := "res://assets/ui/lyr/glyph/"
const INK := Color(0.05, 0.03, 0.07)
const CW := 116.0
const CH := 236.0

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
	if c.get("curse", false): return "LANET"
	if c.get("evo", false): return "EVRİM"
	if c.get("myth", false): return "YETENEK"
	if c.get("sig", false): return "İMZA " + ROMAN[int(K.ti)]
	if c.get("kind", "") == "special": return "ÖZEL"
	if c.get("kind", "") == "passive": return "PASİF"
	return "NİMET"

static func _card_col(c: Dictionary, K: Dictionary) -> Color:
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
	_bg.color = Color(0.03, 0.015, 0.05, 0.78)
	_bg.size = _W + Vector2(0, 400)
	_bg.position = Vector2(0, -200)
	_bg.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(_bg)
	_rays = Node2D.new()
	_rays.position = Vector2(_W.x * 0.5, _W.y * 0.30)
	_rays.draw.connect(_draw_rays)
	add_child(_rays)
	_title = _mk_text(true, 800, 34, 2.0, Color("#fff1d6"), "0 3px 0 #1a0d10, 0 0 18px rgba(255,150,60,0.6)")
	_title.text = "SEVİYE ATLADIN!"
	_sub = _mk_text(false, 700, 12, 3.0, Color("#ffcf8a"), "0 1px 3px rgba(0,0,0,0.9)")
	_sub.text = "BİR GÜÇ SEÇ"
	_reroll = Node2D.new()
	_reroll.draw.connect(_draw_reroll)
	add_child(_reroll)
	_rr_txt = _mk_text(false, 800, 13, 2.0, Color("#fff4e6"), "0 1px 2px rgba(0,0,0,0.9)")
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

func show_choices(choices: Array) -> void:
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
	_title.position = Vector2(0, _W.y * 0.52 - CH * 0.5 - 92.0)
	_sub.position = Vector2(0, _W.y * 0.52 - CH * 0.5 - 44.0)
	_reroll.position = Vector2(_W.x * 0.5, _W.y * 0.52 + CH * 0.5 + 44.0)
	_rr_txt.position = Vector2(-_W.x * 0.5, -9.0)

# ── kart yüzü (çizgi roman) ──
func _build_face(face: Node2D, c: Dictionary, K: Dictionary, col: Color) -> void:
	var w := CW
	var h := CH
	var bg := Node2D.new()
	bg.draw.connect(func():
		var r := Rect2(-w * 0.5, -h * 0.5, w, h)
		# alt gölge (mürekkep ofset)
		var sh := StyleBoxFlat.new()
		sh.bg_color = INK
		sh.set_corner_radius_all(14)
		bg.draw_style_box(sh, Rect2(r.position + Vector2(4, 6), r.size))
		var b := StyleBoxFlat.new()
		b.bg_color = Color("#241a2e")
		b.set_corner_radius_all(14)
		b.set_border_width_all(4)
		b.border_color = INK
		bg.draw_style_box(b, r)
		# başlık şeridi (nadirlik rengi)
		var hb := StyleBoxFlat.new()
		hb.bg_color = col
		hb.corner_radius_top_left = 11
		hb.corner_radius_top_right = 11
		bg.draw_style_box(hb, Rect2(r.position + Vector2(4, 4), Vector2(w - 8, 24)))
		bg.draw_line(r.position + Vector2(4, 28), r.position + Vector2(w - 4, 28), INK, 3.0)
		# yarım ton madalyon zemini
		var mc := Vector2(0, -h * 0.5 + 72)
		for yy in range(-6, 7):
			for xx in range(-7, 8):
				var p := mc + Vector2(xx * 8 + (4 if yy % 2 else 0), yy * 7)
				var d := p.distance_to(mc)
				var rr := clampf(3.2 - d / 18.0, 0.0, 3.2)
				if rr > 0.4 and absf(p.x) < w * 0.5 - 8: bg.draw_circle(p, rr, Color(col, 0.22))
		# madalyon
		bg.draw_circle(mc, 33, INK)
		bg.draw_circle(mc, 29.5, col.darkened(0.55))
		bg.draw_circle(mc, 29.5 - 4, col.darkened(0.25))
		bg.draw_arc(mc, 26, PI * 1.1, PI * 1.75, 16, Color(1, 1, 1, 0.35), 3.0, true)
		# ad altı ayraç
		bg.draw_line(Vector2(-w * 0.32, 26), Vector2(w * 0.32, 26), Color(col, 0.6), 2.0))
	face.add_child(bg)
	# glif
	var gf := glyph_file(c)
	var tex: Texture2D = load(GLYPH_DIR + gf + ".png") if ResourceLoader.exists(GLYPH_DIR + gf + ".png") else null
	if tex:
		var sp := Sprite2D.new()
		sp.texture = tex
		sp.scale = Vector2.ONE * (36.0 / (tex.get_width() * 38.0 / 66.0))
		sp.position = Vector2(0, -h * 0.5 + 72)
		sp.modulate = Color(1, 0.98, 0.94)
		face.add_child(sp)
	# tür etiketi
	var tl := UIText.new()
	tl.style(false, 800, 10, 1.8, INK, "")
	tl.align = 0.5
	tl.nowrap = true
	tl.wrap_w = w
	tl.text = _type_label(c, K)
	tl.position = Vector2(-w * 0.5, -h * 0.5 + 9)
	face.add_child(tl)
	# ad (1-2 satır)
	var nm := UIText.new()
	nm.style(true, 800, 14, 0.4, Color("#fff4e6"), "0 2px 0 #0a0510")
	nm.align = 0.5
	nm.nowrap = false
	nm.max_lines = 2
	nm.wrap_w = w - 14
	nm.text = str(c.get("name", ""))
	nm.position = Vector2(-w * 0.5 + 7, -h * 0.5 + 112)
	face.add_child(nm)
	# kademe noktaları
	var mx := int(c.get("max", 1))
	if mx > 1:
		var pips := Node2D.new()
		var tgt := int(K.target)
		pips.draw.connect(func():
			var cnt := mini(mx, 5)
			var span := cnt * 9 + (cnt - 1) * 4
			var x := -span * 0.5 + 4.5
			for j in cnt:
				var on := j + 1 <= tgt
				var q := Vector2(x + j * 13, 0)
				var pts := PackedVector2Array([q + Vector2(0, -5), q + Vector2(5, 0), q + Vector2(0, 5), q + Vector2(-5, 0)])
				pips.draw_colored_polygon(pts, INK)
				var pi := PackedVector2Array([q + Vector2(0, -3), q + Vector2(3, 0), q + Vector2(0, 3), q + Vector2(-3, 0)])
				pips.draw_colored_polygon(pi, col if on else Color(1, 1, 1, 0.15)))
		pips.position = Vector2(0, -h * 0.5 + 158)
		face.add_child(pips)
	# açıklama
	var ds := UIText.new()
	ds.style(false, 600, 11, 0.2, Color("#d8cfe0"), "0 1px 2px rgba(0,0,0,0.8)")
	ds.align = 0.5
	ds.nowrap = false
	ds.max_lines = 4
	ds.wrap_w = w - 16
	ds.text = str(c.get("desc", ""))
	ds.position = Vector2(-w * 0.5 + 8, -h * 0.5 + 172)
	face.add_child(ds)
	# parıltı süpürmesi (kartın içine kırpılı)
	var shine := Node2D.new()
	shine.name = "shine"
	shine.draw.connect(_draw_shine.bind(shine))
	face.add_child(shine)

func _draw_back(n: Node2D, col: Color) -> void:
	var r := Rect2(-CW * 0.5, -CH * 0.5, CW, CH)
	var sh := StyleBoxFlat.new()
	sh.bg_color = INK
	sh.set_corner_radius_all(14)
	n.draw_style_box(sh, Rect2(r.position + Vector2(4, 6), r.size))
	var b := StyleBoxFlat.new()
	b.bg_color = col.darkened(0.6)
	b.set_corner_radius_all(14)
	b.set_border_width_all(4)
	b.border_color = INK
	n.draw_style_box(b, r)
	for yy in range(-12, 13):
		for xx in range(-6, 7):
			var p := Vector2(xx * 9 + (4.5 if yy % 2 else 0.0), yy * 9)
			if absf(p.x) < CW * 0.5 - 9 and absf(p.y) < CH * 0.5 - 9:
				n.draw_circle(p, 2.2, Color(col, 0.28))
	n.draw_circle(Vector2.ZERO, 30, INK)
	n.draw_circle(Vector2.ZERO, 26, col)
	if n.get_child_count() == 0:
		var q := UIText.new()
		q.style(true, 800, 32, 0.0, INK, "")
		q.align = 0.5
		q.nowrap = true
		q.wrap_w = 60
		q.text = "?"
		q.position = Vector2(-30, -22)
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
	var a0 := _t * 0.25
	var R := _W.x * 0.9
	var alpha := clampf(_t / 0.4, 0.0, 1.0) * 0.10
	for i in 12:
		var a := a0 + i * TAU / 12.0
		_rays.draw_colored_polygon(PackedVector2Array([Vector2.ZERO, Vector2(cos(a - 0.11), sin(a - 0.11)) * R, Vector2(cos(a + 0.11), sin(a + 0.11)) * R]), Color(1.0, 0.75, 0.4, alpha))

func _draw_reroll() -> void:
	var n := int(g.rerolls)
	var w := 150.0
	var h := 40.0
	var r := Rect2(-w * 0.5, -h * 0.5, w, h)
	var sh := StyleBoxFlat.new()
	sh.bg_color = INK
	sh.set_corner_radius_all(20)
	_reroll.draw_style_box(sh, Rect2(r.position + Vector2(0, 4), r.size))
	var b := StyleBoxFlat.new()
	b.bg_color = Color("#3a8f5a") if n > 0 else Color("#3a3440")
	b.set_corner_radius_all(20)
	b.set_border_width_all(3)
	b.border_color = INK
	_reroll.draw_style_box(b, r)
	_reroll.draw_line(Vector2(-w * 0.5 + 14, -h * 0.5 + 8), Vector2(w * 0.5 - 14, -h * 0.5 + 8), Color(1, 1, 1, 0.25 if n > 0 else 0.08), 3.0)

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
	_rr_txt.text = I18n.t("↻ YENİLE · " + str(n))
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
	_title.scale = Vector2.ONE * maxf(0.01, ts)
	_title.position.x = _W.x * 0.5 * (1.0 - _title.scale.x)
	_title.modulate.a = kt
	_sub.modulate.a = clampf((_t - 0.2) / 0.3, 0.0, 1.0)
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
		node.rotation = rot
		node.scale = Vector2(maxf(0.02, sx) * pop, pop) * minf(1.0, 0.6 + 0.4 * ef)
		var shine: Node2D = (C.face as Node2D).get_node_or_null("shine")
		if shine:
			shine.set_meta("ph", float(C.sh))
			shine.queue_redraw()
	if _pick >= 0 and _t - _pick_t >= 0.5:
		var choice: Dictionary = cards[_pick].choice
		_pick = -2
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
		if int(g.rerolls) > 0 and _t > 0.9 and Rect2(_reroll.position - Vector2(80, 24), Vector2(160, 48)).has_point(lp):
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

