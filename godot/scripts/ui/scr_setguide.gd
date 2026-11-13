class_name ScrSetGuide
extends ComicOverlay
## SET REHBERİ (kuşanım → dizilim sekmesi): kitap sayfaları gibi beş ekipman seti. Aynı nadirlikteki
## eşyalar bir seti oluşturur; 2 ve 4 parçada bonus açılır. Seçili kahramanın giydikleri sayılır,
## etkin bonuslar yanar.

const RAR_NAMES := ["", "SIRADAN", "YAYGIN", "NADİR", "EPİK", "EFSANEVİ"]
var _pages: Array = []

func _init(game) -> void:
	super(game)
	name = "SetGuide"

func open() -> void:
	open_overlay()

func _title() -> String: return "SET REHBERİ"

func _worn_counts() -> Dictionary:
	var c := {}
	var map: Dictionary = g.char_gear_map()
	for s in D.EQUIP_SLOTS:
		var gx = g.gear_by_id(map.get(s.id)) if map.get(s.id) else null
		if gx:
			var r: int = SideModes.RANK.get(int(gx.rarity), 1)
			c[r] = c.get(r, 0) + 1
	return c

func _build_content(y: float) -> float:
	_pages.clear()
	_ribbon(y, "SETLERİ TAMAMLA", "", 0.04)
	y += 46
	_small(_content, "Aynı nadirlikteki eşyalar bir set oluşturur.", 13, Color(1, 0.92, 0.8, 0.92), Vector2(22, y), _W.x - 44)
	_small(_content, "2 parça: ilk bonus · 4 parça: güçlü bonus", 13, Color(1, 0.85, 0.5, 0.95), Vector2(22, y + 20), _W.x - 44)
	y += 50
	var cnt := _worn_counts()
	# nadirlik sırasıyla (sıradan → efsanevi)
	var order := []
	# kademe sırasıyla (set kimliği = kademe; ham nadirlik kodu 5 = NADİR olduğundan doğrudan kademe kullanılır)
	for rk in [1, 2, 3, 4, 5]: order.append([rk, rk])
	var i := 0
	for o in order:
		y = _page(y, int(o[0]), int(o[1]), int(cnt.get(o[1], 0)), i) + 14
		i += 1
	return y + 20

const SLOT_GLYPH := {"silah": "S", "zirh": "Z", "eldiven": "E", "cizme": "Ç"}

## set kartı: koyu gövde, set renginde sol şerit + ışıma, 4 yuva simgesi, 2/4 işaretli ilerleme, bonuslar
func _page(y: float, rar: int, sid: int, have: int, idx: int) -> float:
	var S: Dictionary = SideModes.GEAR_SETS[sid]
	var col := Color(str(S.col))
	var w := _W.x - 32
	var h := 212.0
	var pg := Node2D.new()
	pg.position = Vector2(16, y)
	var on2 := have >= 2
	var on4 := have >= 4
	# giyilen eşyalar (bu nadirlikte olanlar yuvasında görünür)
	var map: Dictionary = g.char_gear_map()
	var slots: Array = []
	for sl in D.EQUIP_SLOTS:
		var gx = g.gear_by_id(map.get(sl.id)) if map.get(sl.id) else null
		var mine: bool = gx != null and int(SideModes.RANK.get(int(gx.rarity), 1)) == sid
		var tex: Texture2D = null
		if mine:
			var ip := "res://assets/ui/art/gear/" + str(gx.icon) + ".png"
			if ResourceLoader.exists(ip): tex = UITex.get_tex(ip)
		slots.append({"id": str(sl.id), "on": mine, "tex": tex})
	var SQ := 44.0
	var sx0 := 16.0
	var sy := 62.0
	pg.draw.connect(func():
		var r := Rect2(0, 0, w, h)
		var act := on2 or on4
		pg.draw_style_box(ComicSkin.sb(Color(0, 0, 0, 0.5), 16), Rect2(r.position + Vector2(0, 6), r.size))
		if act:
			var kk := 0.5 + 0.5 * sin(_t * 2.6 + idx)
			for k in 3: pg.draw_style_box(ComicSkin.sb(Color(0, 0, 0, 0), 16 + k * 3, 2.0, Color(col, (0.30 - k * 0.09) * (0.6 + 0.4 * kk))), r.grow(2.0 + k * 3.0))
		pg.draw_style_box(ComicSkin.sb(Color("#15101a"), 14, 1.5, Color(col, 0.75 if act else 0.35)), r)
		# üstten set renginde yumuşak ışık
		pg.draw_polygon(PackedVector2Array([Vector2(2, 2), Vector2(w - 2, 2), Vector2(w - 2, 70), Vector2(2, 70)]),
			PackedColorArray([Color(col, 0.16), Color(col, 0.05), Color(col, 0.0), Color(col, 0.0)]))
		# sol şerit
		pg.draw_style_box(ComicSkin.sb(col, 3), Rect2(0, 18, 4, h - 36))
		# yuvalar
		for k in 4:
			var sr := Rect2(sx0 + k * (SQ + 8.0), sy, SQ, SQ)
			var on: bool = slots[k].on
			pg.draw_style_box(ComicSkin.sb(Color(col, 0.22) if on else Color(1, 1, 1, 0.04), 9, 1.5, Color(col, 0.95) if on else Color(1, 1, 1, 0.14)), sr)
			if slots[k].tex: pg.draw_texture_rect(slots[k].tex, sr.grow(-5.0), false)
		# ilerleme çubuğu (2 ve 4'te çentik)
		var bx := sx0 + 4.0 * (SQ + 8.0) + 8.0
		var by := sy + SQ * 0.5 + 6.0
		var bw := w - bx - 18.0
		pg.draw_style_box(ComicSkin.sb(Color(1, 1, 1, 0.07), 5), Rect2(bx, by, bw, 8))
		if have > 0: pg.draw_style_box(ComicSkin.sb(col, 5), Rect2(bx, by, bw * minf(1.0, have / 4.0), 8))
		for m in [2, 4]:
			var mx: float = bx + bw * (m / 4.0) - (4.0 if m == 4 else 0.0)
			var hit: bool = have >= m
			pg.draw_circle(Vector2(mx, by + 4), 7.0, Color("#15101a"))
			pg.draw_circle(Vector2(mx, by + 4), 5.5, col if hit else Color(1, 1, 1, 0.18))
			if hit: pg.draw_circle(Vector2(mx - 1.5, by + 2.5), 1.8, Color(1, 1, 1, 0.8)))
	_content.add_child(pg)
	_live.append(pg)
	_anim_in[pg] = 0.08 + idx * 0.07
	var nm := UIText.new()
	nm.style(true, 900, 20, 1.6, col.lightened(0.15), "0 2px 6px rgba(0,0,0,0.9)")
	nm.nowrap = true
	nm.wrap_w = w - 120
	nm.position = Vector2(18, 14)
	nm.text = str(S.name) + " SETİ"
	pg.add_child(nm)
	_small(pg, RAR_NAMES[rar] + " EŞYALAR", 10.5, Color(1, 1, 1, 0.5), Vector2(19, 40), w - 140)
	var bx2 := sx0 + 4.0 * (SQ + 8.0) + 8.0
	_small(pg, str(have) + " / 4 GİYİLİ", 11, (col.lightened(0.2) if have > 0 else Color(1, 1, 1, 0.45)), Vector2(bx2, sy + 2.0), w - bx2 - 18.0)
	for k in 4:
		if not slots[k].on:
			var nmk := str(D.EQUIP_SLOTS[k].name).replace(" KATI", "")
			_small(pg, nmk, 7.5, Color(1, 1, 1, 0.32), Vector2(sx0 + k * (SQ + 8.0), sy + SQ * 0.5 - 6.0), SQ, 0.5)
	_bonus(pg, Vector2(16, 128), "2 PARÇA", str(S.l2), on2, col, w - 32)
	_bonus(pg, Vector2(16, 168), "4 PARÇA", str(S.l4), on4, col, w - 32)
	return y + h

func _bonus(pg: Node2D, p: Vector2, tag: String, txt: String, on: bool, col: Color, w: float) -> void:
	var bd := Node2D.new()
	bd.position = p
	bd.draw.connect(func():
		var r := Rect2(0, 0, w, 30)
		bd.draw_style_box(ComicSkin.sb(Color(col, 0.14) if on else Color(1, 1, 1, 0.035), 8, 1.0, Color(col, 0.5) if on else Color(1, 1, 1, 0.07)), r)
		var tr := Rect2(4, 4, 64, 22)
		bd.draw_style_box(ComicSkin.sb(col if on else Color(1, 1, 1, 0.10), 6), tr))
	pg.add_child(bd)
	var tg := _small(bd, tag, 10.5, Color("#120c14") if on else Color(1, 1, 1, 0.55), Vector2(4, 7.5), 64, 0.5)
	tg.style(false, 900, 10.5, 0.8, Color("#120c14") if on else Color(1, 1, 1, 0.55), "")
	var fs := 12.5 if txt.length() <= 30 else (11.0 if txt.length() <= 40 else 10.0)
	_small(bd, ("✓  " if on else "") + txt, fs, Color.WHITE if on else Color(1, 1, 1, 0.62), Vector2(78, 15.0 - fs * 0.62), w - 84)
