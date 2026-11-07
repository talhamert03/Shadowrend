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
	for rar in [1, 2, 3, 4, 5]: order.append([rar, SideModes.RANK[rar]])
	var i := 0
	for o in order:
		y = _page(y, int(o[0]), int(o[1]), int(cnt.get(o[1], 0)), i) + 14
		i += 1
	return y + 20

func _page(y: float, rar: int, sid: int, have: int, idx: int) -> float:
	var S: Dictionary = SideModes.GEAR_SETS[sid]
	var col := Color(str(S.col))
	var w := _W.x - 32
	var h := 150.0
	var pg := Node2D.new()
	pg.position = Vector2(16, y)
	var on2 := have >= 2
	var on4 := have >= 4
	pg.draw.connect(func():
		var r := Rect2(0, 0, w, h)
		# kitap sayfası: parşömen zemin, renkli cilt sırtı, köşe süsleri
		pg.draw_style_box(ComicSkin.sb(INK, 14), Rect2(r.position + Vector2(3, 6), r.size))
		pg.draw_style_box(ComicSkin.sb(Color("#2a1a14"), 14), r)
		pg.draw_style_box(ComicSkin.sb(Color("#f3e2bd"), 10), r.grow(-6))
		pg.draw_style_box(ComicSkin.sb(col.darkened(0.25), 8), Rect2(6, 6, 22, h - 12))
		for k in 4: pg.draw_line(Vector2(9, 22 + k * 30), Vector2(25, 22 + k * 30), Color(1, 1, 1, 0.35), 2.0)
		# satır çizgileri (defter)
		for k in 5: pg.draw_line(Vector2(40, 60 + k * 18), Vector2(w - 16, 60 + k * 18), Color(0.55, 0.42, 0.3, 0.18), 1.0)
		# parça pipleri
		for k in 4:
			var c := Vector2(w - 26 - (3 - k) * 22, 26)
			pg.draw_circle(c, 8, INK)
			pg.draw_circle(c, 6.5, col if k < have else Color(0.75, 0.68, 0.55))
			if k < have: pg.draw_circle(c + Vector2(-2, -2), 2.0, Color(1, 1, 1, 0.7))
		# etkin bonus parıltısı
		if on2 or on4:
			var kk := 0.5 + 0.5 * sin(_t * 3.0 + idx)
			pg.draw_style_box(ComicSkin.sb(Color(0, 0, 0, 0), 14, 3.0, Color(col, 0.35 + 0.35 * kk)), r.grow(3)))
	_content.add_child(pg)
	_live.append(pg)
	_anim_in[pg] = 0.08 + idx * 0.07
	var ink := Color("#2a1810")
	_txt(pg, str(S.name) + " SETİ", 24, col.darkened(0.35), "", Vector2(40, 12), w - 150)
	_small(pg, RAR_NAMES[rar] + " eşyalar · " + str(have) + "/4 giyili", 12, ink, Vector2(42, 40), w - 60)
	_bonus(pg, Vector2(40, 66), "2 PARÇA", str(S.l2), on2, col, w - 56)
	_bonus(pg, Vector2(40, 104), "4 PARÇA", str(S.l4), on4, col, w - 56)
	return y + h

func _bonus(pg: Node2D, p: Vector2, tag: String, txt: String, on: bool, col: Color, w: float) -> void:
	var bd := Node2D.new()
	bd.position = p
	bd.draw.connect(func():
		var r := Rect2(0, 0, 70, 24)
		bd.draw_style_box(ComicSkin.sb(INK, 7), Rect2(r.position + Vector2(1, 3), r.size))
		bd.draw_style_box(ComicSkin.sb(col if on else Color("#8a7a66"), 7), r))
	pg.add_child(bd)
	_txt(bd, tag, 13, Color.WHITE, "", Vector2(0, 3), 70).align = 0.5
	var fs := 13.0 if txt.length() <= 26 else (11.5 if txt.length() <= 34 else 10.0)
	_small(pg, ("✓ " if on else "") + txt, fs, Color("#1e6a2a") if on else Color("#3a2a20"), p + Vector2(80, 4 + (13.0 - fs) * 0.5), w - 84)
