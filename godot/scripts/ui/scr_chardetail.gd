class_name ScrCharDetail
extends Scr
## KAHRAMAN İNCELEME (v2 · Clash Royale düzeni, çizgi roman dili) — tamamen yerel çizim,
## yakalamaya bağlı değil (yeni kahramanlar da aynı ekranı kullanır). 3B model yok:
##   ① nadirlik bandı (nadirlik · tarz · kapat)
##   ② kahraman kartı (kart görseli + nadirlik çerçevesi + seviye madalyonu) · ad · unvan · hikâye
##   ③ stat kutuları (can · hasar · saldırı hızı · hız · kritik · zırh — seviye dahil)
##   ④ İMZA SİLAHI · ⑤ SÜPER · ⑥ seviyeyle açılan yetenekler (kilitli olanlar "SV n")
##   ⑦ eylem: kart ilerlemesi + GELİŞTİR (altın) + SEÇ / SEÇİLİ · kilitliyse nasıl açılır
## Geliştirmede madalyon zıplar, kıvılcım + "SEVİYE n!" yıldızı, açılan yetenek parlar.

const INK := Color(0.05, 0.03, 0.07)
const YEL := Color("#ffd23a")
const PAPER := Color("#fff3d6")
const GREEN := Color("#4cbf5e")
const PANEL := Color("#1e1529")
const TILE := Color("#2a1f38")
const PW := 366.0

var id := ""
var _W := Vector2(390, 844)
var _SR := Rect2()
var _t := 0.0
var _rc := Color.WHITE
var _cdclip: Control
var _content: Node2D
var _fx: Node2D
var _medal: Node2D
var _medal_lv: UIText
var _scroll := 0.0
var _scroll_max := 0.0
var _vel := 0.0
var _cbtns: Array = []        # [{node, rect, cb}]
var _cpress = null
var _pid := -1
var _p0 := Vector2.ZERO
var _last := Vector2.ZERO
var _dragging := false
var _csprings := {}
var _anim_in := {}
var _parts: Array = []
var _pop_t := -1.0
var _pop_lv := 0
var _new_skill := ""

func _init(game) -> void:
	super(game)
	name = "CharDetail"

func open(cid: String) -> void:
	id = cid
	visible = true
	cancel_fade()
	position = Vector2.ZERO
	scale = Vector2.ONE
	_scroll = 0.0
	_vel = 0.0
	_pop_t = -1.0
	_build()
	_t = 0.0
	fade_show()
	g.audio.play("panel")

# ═════════════ kurulum ═════════════

func _build() -> void:
	for c in get_children():
		if not (c is Scr._Ticker): c.queue_free()
	_cbtns.clear()
	_csprings.clear()
	_anim_in.clear()
	_W = UIK.ui_size(get_viewport())
	_SR = UIK.screen_rect(self)
	var c: Dictionary = D.CHARACTERS.get(id, {})
	var rar := HeroesPage._rar(id)
	_rc = Color(str(rar.get("color", "#b8c0cc")))
	# karartma + nadirlik renginde dönen ışınlar
	var bg := Node2D.new()
	bg.draw.connect(func():
		var r := _SR
		bg.draw_rect(r, Color(0.03, 0.02, 0.05, 0.86)))
	add_child(bg)
	var rays := Node2D.new()
	rays.position = Vector2(_W.x * 0.5, _W.y * 0.3)
	rays.draw.connect(func():
		var B := TriBatch.new()
		for i in 20:
			var a := i * TAU / 20.0
			B._tri(Vector2.ZERO, Vector2(cos(a - 0.07), sin(a - 0.07)) * 1400, Vector2(cos(a + 0.07), sin(a + 0.07)) * 1400, Color(_rc, 0.05))
		B.radial(Vector2.ZERO, 260, Color(_rc, 0.22), Color(_rc, 0.0))
		B.flush(rays))
	add_child(rays)
	var tw := rays.create_tween().set_loops()
	tw.tween_property(rays, "rotation", TAU, 90.0).from(0.0)
	var top := 14.0
	_cdclip = Control.new()
	_cdclip.clip_contents = true
	_cdclip.position = Vector2(0, top)
	_cdclip.size = Vector2(_W.x, _W.y - top - 8.0)
	_cdclip.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(_cdclip)
	_content = Node2D.new()
	_cdclip.add_child(_content)
	var h := _build_panel(c, rar)
	_scroll_max = maxf(0.0, h + 16.0 - _cdclip.size.y)
	_fx = Node2D.new()
	_fx.draw.connect(_draw_fx)
	add_child(_fx)

func _build_panel(c: Dictionary, rar: Dictionary) -> float:
	var x0 := (_W.x - PW) * 0.5
	var owned: bool = g.owns_char(id)
	var lvl: int = g.char_level(id)
	var panel := Node2D.new()
	panel.position = Vector2(x0, 4)
	_content.add_child(panel)
	_anim_in[panel] = 0.0
	var y := 0.0
	# ── ① nadirlik bandı ──
	var band_h := 46.0
	var body := Node2D.new()
	panel.add_child(body)
	var lay := {"h": 0.0}
	body.draw.connect(func():
		var r := Rect2(0, 0, PW, float(lay.h))
		ComicSkin.panel(body, r, PANEL, 16, 4.0, Vector2(4, 7), false)
		body.draw_style_box(ComicSkin.sb(_rc.darkened(0.15), 14), Rect2(4, 4, PW - 8, band_h - 4))
		body.draw_rect(Rect2(4, band_h - 6, PW - 8, 6), _rc.darkened(0.45))
		ComicSkin.halftone(body, Rect2(8, 6, PW - 16, band_h - 12), Color(1, 1, 1, 0.08), 7.0, 4, 1.6))
	_txt(panel, str(rar.get("name", "")), 20, Color.WHITE, UIK.ink_stroke(2.0, 2.4), Vector2(16, 9), 160)
	var style := "YAKIN DÖVÜŞ" if str(c.get("style", "")) == "melee" else "UZAK MENZİL"
	var chip := Node2D.new()
	chip.position = Vector2(150, 12)
	chip.draw.connect(func():
		chip.draw_style_box(ComicSkin.sb(Color(0, 0, 0, 0.35), 10, 2.0, INK), Rect2(0, 0, 112, 24)))
	panel.add_child(chip)
	_txt(chip, style, 13, PAPER, "", Vector2(0, 4), 112, 0.5)
	var xb := Node2D.new()
	xb.position = Vector2(PW - 26, 23)
	xb.draw.connect(func():
		xb.draw_circle(Vector2(2, 3), 17, INK)
		xb.draw_circle(Vector2.ZERO, 17, Color("#e8322c"))
		xb.draw_arc(Vector2.ZERO, 17, 0, TAU, 28, INK, 3.0, true)
		xb.draw_line(Vector2(-6, -6), Vector2(6, 6), Color.WHITE, 4.0, true)
		xb.draw_line(Vector2(6, -6), Vector2(-6, 6), Color.WHITE, 4.0, true))
	panel.add_child(xb)
	_btn(xb, Rect2(-24, -24, 48, 48), func(): g.audio.play("click"); close())
	y = band_h + 12.0
	# ── ② kart + ad / unvan / hikâye ──
	var card := Node2D.new()
	card.position = Vector2(14, y)
	panel.add_child(card)
	var cw := 136.0
	var chh := 182.0
	var tex: Texture2D = UITex.get_tex("res://assets/ui/art/herocard/" + id + ".png")
	card.draw.connect(func():
		card.draw_style_box(ComicSkin.sb(INK, 14), Rect2(4, 6, cw, chh))
		card.draw_style_box(ComicSkin.sb(_rc, 14), Rect2(0, 0, cw, chh)))
	var clipn := Node2D.new()
	clipn.clip_children = CanvasItem.CLIP_CHILDREN_ONLY
	clipn.draw.connect(func(): clipn.draw_style_box(ComicSkin.sb(Color.WHITE, 10), Rect2(5, 5, cw - 10, chh - 10)))
	card.add_child(clipn)
	if tex:
		var sp := Sprite2D.new()
		sp.texture = tex
		sp.centered = false
		var k := maxf((cw - 10) / tex.get_width(), (chh - 10) / tex.get_height())
		sp.scale = Vector2.ONE * k
		sp.position = Vector2(5 + (cw - 10 - tex.get_width() * k) * 0.5, 5)
		if not owned: sp.modulate = Color(0.55, 0.52, 0.6)
		clipn.add_child(sp)
	var frame := Node2D.new()
	frame.draw.connect(func():
		frame.draw_style_box(ComicSkin.sb(Color(0, 0, 0, 0), 14, 4.0, INK), Rect2(0, 0, cw, chh))
		frame.draw_style_box(ComicSkin.sb(Color(0, 0, 0, 0), 10, 2.0, Color(1, 1, 1, 0.35)), Rect2(5, 5, cw - 10, chh - 10)))
	card.add_child(frame)
	# seviye madalyonu (kartın alt ortasında, yıldız patlaması)
	_medal = Node2D.new()
	_medal.position = Vector2(cw * 0.5, chh - 4)
	_medal.draw.connect(func():
		ScrCeremony._star(_medal, Vector2.ZERO, 30, 23, 12, YEL if owned else Color("#8a8494"), 3.0, _t * 0.3))
	card.add_child(_medal)
	_medal_lv = _txt(_medal, str(lvl) if owned else "?", 24, INK, "", Vector2(-30, -17), 60, 0.5)
	if not owned:
		var lk := Node2D.new()
		lk.position = Vector2(cw - 22, 22)
		lk.draw.connect(func():
			lk.draw_circle(Vector2.ZERO, 15, INK)
			lk.draw_style_box(ComicSkin.sb(PAPER, 3), Rect2(-8, -3, 16, 12))
			lk.draw_arc(Vector2(0, -4), 5.5, PI, TAU, 12, PAPER, 3.0, true))
		card.add_child(lk)
	var tx := 164.0
	var tw2 := PW - tx - 12.0
	var nms := str(c.get("name", id))
	var nfs := 30.0 if nms.length() <= 9 else (24.0 if nms.length() <= 12 else 19.0)
	_txt(panel, nms, nfs, Color.WHITE, UIK.ink_stroke(2.4, 3.0), Vector2(tx, y - 2 + (30.0 - nfs) * 0.5), tw2)
	var ty := y + 40.0
	_txt(panel, str(c.get("title", "")).to_upper(), 15, _rc.lightened(0.35), "", Vector2(tx, ty), tw2)
	var lore := UIText.new()
	lore.style(false, 700, 12.5, 0.1, Color(0.86, 0.82, 0.9), "")
	lore.nowrap = false
	lore.max_lines = 7
	lore.wrap_w = tw2
	lore.size = Vector2(tw2, 120)
	lore.position = Vector2(tx, ty + 24)
	lore.text = str(c.get("lore", ""))
	panel.add_child(lore)
	y += chh + 26.0
	# ── ③ stat kutuları ──
	var M: Dictionary = c.get("mods", {})
	var LM: Dictionary = D.charLevelMods(lvl)
	var P: Dictionary = D.PLAYER
	var hp := (float(P.get("maxHp", 100)) + float(M.get("maxHp", 0))) * float(LM.hpMul)
	var stats := [
		["CAN", str(int(round(hp))), Color("#ff5a6a")],
		["HASAR", _pct(float(M.get("dmgPct", 0)) + float(LM.dmgAdd)), Color("#ffb03a")],
		["SALDIRI HIZI", _pct(float(M.get("atkPct", 0)) + float(LM.atkAdd)), Color("#5ad6ff")],
		["HIZ", _pct(float(M.get("speedPct", 0))), Color("#7dff8a")],
		["KRİTİK", "%" + str(snappedf((float(P.get("critChance", 0.08)) + float(M.get("critChance", 0))) * 100.0, 0.1)).trim_suffix(".0"), Color("#ff7ad8")],
		["ZIRH", str(int(float(P.get("armor", 0)) + float(M.get("armor", 0)))), Color("#c8d0dc")],
	]
	var sw := (PW - 28.0 - 16.0) / 3.0
	for i in stats.size():
		var s: Array = stats[i]
		var st := Node2D.new()
		st.position = Vector2(14 + (i % 3) * (sw + 8), y + (i / 3) * 52)
		var sc: Color = s[2]
		st.draw.connect(func():
			st.draw_style_box(ComicSkin.sb(TILE, 10, 2.5, INK), Rect2(0, 0, sw, 46))
			st.draw_rect(Rect2(3, 3, 5, 40), sc))
		panel.add_child(st)
		_txt(st, str(s[0]), 11, Color(0.75, 0.7, 0.82), "", Vector2(14, 5), sw - 16)
		_txt(st, str(s[1]), 19, Color.WHITE, UIK.ink_stroke(1.4, 1.8), Vector2(14, 18), sw - 16)
	y += 104.0 + 4.0
	# ── ④ imza silahı ──
	var wid := str(c.get("startWeapon", ""))
	var Wd: Dictionary = D.WEAPONS.get(wid, {})
	y = _info_box(panel, y, "İMZA SİLAHI", str(Wd.get("name", wid)), str(Wd.get("descNew", "")), _glyph_tex(wid), Color("#ffb03a"))
	# ── ⑤ süper ──
	var U: Dictionary = Ultimate.ULT_ID.get(id, {})
	var ut: Dictionary = Ultimate.ULT_TIER[clampi(int(c.get("rarity", 1)), 1, 4)]
	y = _info_box(panel, y, "SÜPER · " + str(ut.get("label", "")), str(U.get("name", "")), str(U.get("desc", "")), null, Color(str(U.get("c2", "#9a6aff"))))
	# ── ⑥ yetenekler ──
	var un: Array = D.signatureUnlocks(id, lvl if owned else 0)
	_txt(panel, "SEVİYEYLE AÇILAN YETENEKLER", 14, YEL, UIK.ink_stroke(1.2, 1.6), Vector2(14, y), PW - 28)
	y += 22.0
	var n := un.size()
	var kw := (PW - 28.0 - 6.0 * (n - 1)) / maxf(1, n)
	for i in n:
		var u: Dictionary = un[i]
		var on: bool = not u.get("locked", true)
		var kn := Node2D.new()
		kn.position = Vector2(14 + i * (kw + 6), y)
		kn.draw.connect(func():
			kn.draw_style_box(ComicSkin.sb(TILE if on else Color("#191220"), 10, 2.5, _rc if on else INK), Rect2(0, 0, kw, 84)))
		panel.add_child(kn)
		var gt := _glyph_tex(str(u.get("glyph", "")))
		if gt:
			var gs := Sprite2D.new()
			gs.texture = gt
			gs.scale = Vector2.ONE * (38.0 / maxf(gt.get_width(), gt.get_height()))
			gs.position = Vector2(kw * 0.5, 26)
			if not on: gs.modulate = Color(0.35, 0.33, 0.4)
			kn.add_child(gs)
		var lab := UIText.new()
		lab.style(false, 1000, 10.5, 0.4, Color.WHITE if on else Color(0.6, 0.56, 0.66), "")
		lab.nowrap = false
		lab.max_lines = 2
		lab.align = 0.5
		lab.wrap_w = kw - 6
		lab.size = Vector2(kw - 6, 28)
		lab.position = Vector2(3, 48)
		lab.text = str(u.get("name", "")) if on else "SV " + str(int(u.get("minLvl", 1)))
		kn.add_child(lab)
		if on and _new_skill != "" and str(u.get("name", "")) == _new_skill: kn.set_meta("glow", true)
	y += 84.0 + 14.0
	# ── ⑦ eylem ──
	y = _action(panel, y, owned, lvl)
	lay.h = y + 10.0
	body.queue_redraw()
	return y + 14.0

func _info_box(panel: Node2D, y: float, k: String, title: String, desc: String, ic: Texture2D, acc: Color) -> float:
	var bx := Node2D.new()
	bx.position = Vector2(14, y)
	var bw := PW - 28.0
	var bh := 70.0
	bx.draw.connect(func():
		bx.draw_style_box(ComicSkin.sb(TILE, 12, 2.5, INK), Rect2(0, 0, bw, bh))
		bx.draw_style_box(ComicSkin.sb(acc.darkened(0.55), 10, 2.0, INK), Rect2(6, 6, 58, 58))
		if ic == null:
			ScrCeremony._star(bx, Vector2(35, 35), 22, 14, 8, acc, 2.0))
	panel.add_child(bx)
	if ic:
		var s := Sprite2D.new()
		s.texture = ic
		s.scale = Vector2.ONE * (46.0 / maxf(ic.get_width(), ic.get_height()))
		s.position = Vector2(35, 35)
		bx.add_child(s)
	_txt(bx, k, 11, acc.lightened(0.3), "", Vector2(74, 6), bw - 82)
	_txt(bx, title, 17, Color.WHITE, UIK.ink_stroke(1.4, 1.8), Vector2(74, 19), bw - 82)
	var d := UIText.new()
	d.style(false, 700, 11.5, 0.1, Color(0.82, 0.78, 0.88), "")
	d.nowrap = false
	d.max_lines = 2
	d.wrap_w = bw - 82
	d.size = Vector2(bw - 82, 30)
	d.position = Vector2(74, 41)
	d.text = desc
	bx.add_child(d)
	return y + bh + 10.0

func _action(panel: Node2D, y: float, owned: bool, lvl: int) -> float:
	var bw := PW - 28.0
	var cards: int = g.char_card_count(id)
	if not owned:
		var nb := Node2D.new()
		nb.position = Vector2(14, y)
		nb.draw.connect(func():
			nb.draw_style_box(ComicSkin.sb(Color("#2a1f38"), 12, 3.0, INK), Rect2(0, 0, bw, 58)))
		panel.add_child(nb)
		_txt(nb, "KİLİTLİ", 20, Color("#ff9a7a"), UIK.ink_stroke(1.6, 2.0), Vector2(0, 6), bw, 0.5)
		_txt(nb, "Sandıklardan kart düşer · ilk kartla açılır", 12, PAPER, "", Vector2(0, 32), bw, 0.5)
		return y + 58.0
	var need = g.cards_for_next(id)
	if need == null:
		var mb := Node2D.new()
		mb.position = Vector2(14, y)
		mb.draw.connect(func(): mb.draw_style_box(ComicSkin.sb(Color("#3a2a14"), 12, 3.0, INK), Rect2(0, 0, bw, 44)))
		panel.add_child(mb)
		_txt(mb, "AZAMİ SEVİYE · SV " + str(lvl), 18, YEL, UIK.ink_stroke(1.4, 1.8), Vector2(0, 10), bw, 0.5)
		y += 54.0
	else:
		# kart ilerlemesi
		var frac := clampf(float(cards) / maxf(1.0, float(need)), 0.0, 1.0)
		var full := cards >= int(need)
		var pb := Node2D.new()
		pb.position = Vector2(14, y)
		pb.draw.connect(func():
			pb.draw_style_box(ComicSkin.sb(INK, 12), Rect2(2, 4, bw, 26))
			pb.draw_style_box(ComicSkin.sb(Color("#120c18"), 12, 3.0, INK), Rect2(0, 0, bw, 26))
			if frac > 0.02: pb.draw_style_box(ComicSkin.sb(GREEN if full else Color("#4f8cff"), 9), Rect2(4, 4, (bw - 8) * frac, 18)))
		panel.add_child(pb)
		_txt(pb, str(cards) + " / " + str(int(need)) + " KART", 15, Color.WHITE, UIK.ink_stroke(1.4, 1.8), Vector2(0, 3), bw, 0.5)
		_txt(panel, "SV " + str(lvl), 12, Color(0.75, 0.7, 0.82), "", Vector2(14, y + 30), 60)
		_txt(panel, "SV " + str(lvl + 1), 12, Color(0.75, 0.7, 0.82), "", Vector2(14 + bw - 60, y + 30), 60, 1.0)
		y += 50.0
	# düğmeler: GELİŞTİR (altın) · SEÇ / SEÇİLİ
	var sel: bool = g.meta.selectedChar == id
	var can: bool = g.can_upgrade_char(id)
	var half := (bw - 10.0) * 0.5
	if need != null:
		var gold = g.gold_for_next(id)
		var ub := _big_btn(panel, Vector2(14, y), Vector2(half, 56), Color("#3fbf55") if can else Color("#5a5466"), "GELİŞTİR", "◆ " + str(int(gold)) if gold != null else "")
		_btn(ub, Rect2(-half * 0.5, -28, half, 56), func(): _upgrade())     # düğüm merkezde (yay ölçeği)
	var sx := 14.0 + (half + 10.0 if need != null else 0.0)
	var swd := half if need != null else bw
	var sb := _big_btn(panel, Vector2(sx, y), Vector2(swd, 56), Color("#ffb020") if not sel else Color("#3a2f4a"), "SEÇİLİ" if sel else "SEÇ", "")
	_btn(sb, Rect2(-swd * 0.5, -28, swd, 56), func():
		g.audio.play("click")
		if not sel: g.select_char(id)
		close())
	return y + 56.0

func _big_btn(parent: Node2D, pos: Vector2, sz: Vector2, col: Color, label: String, sub: String) -> Node2D:
	var holder := Node2D.new()
	holder.position = pos + sz * 0.5
	var n := Node2D.new()
	n.position = -sz * 0.5
	holder.add_child(n)
	n.draw.connect(func():
		n.draw_style_box(ComicSkin.sb(INK, 14), Rect2(0, 6, sz.x, sz.y))
		n.draw_style_box(ComicSkin.sb(col, 14), Rect2(0, 0, sz.x, sz.y))
		n.draw_style_box(ComicSkin.sb(col.lightened(0.18), 12), Rect2(4, 3, sz.x - 8, sz.y * 0.45))
		n.draw_style_box(ComicSkin.sb(Color(0, 0, 0, 0), 14, 3.5, INK), Rect2(0, 0, sz.x, sz.y)))
	parent.add_child(holder)
	var dark: bool = col.get_luminance() > 0.55
	_txt(n, label, 22 if sub == "" else 19, INK if dark else Color.WHITE, "" if dark else UIK.ink_stroke(1.8, 2.2), Vector2(0, 6 if sub != "" else 13), sz.x, 0.5)
	if sub != "": _txt(n, sub, 14, YEL if not dark else INK, "" if dark else UIK.ink_stroke(1.2, 1.6), Vector2(0, 31), sz.x, 0.5)
	return holder

static func _pct(v: float) -> String:
	if absf(v) < 0.0005: return "Normal"
	var s := snappedf(v * 100.0, 0.1)
	return ("+" if s > 0 else "") + str(s).trim_suffix(".0") + "%"

static func _glyph_tex(icon: String) -> Texture2D:
	if icon == "": return null
	var gf := ScrLevelUp.glyph_file({"kind": "special", "icon": icon})
	var p := ScrLevelUp.GLYPH_DIR + gf + ".png"
	return load(p) if ResourceLoader.exists(p) else null

func _txt(parent: Node, s: String, sz: float, col: Color, sh: String, pos: Vector2, w: float, align := 0.0) -> UIText:
	var t := UIText.new()
	t.style(false, 1000, sz, 0.8, col, sh)
	t.nowrap = true
	t.align = align
	t.wrap_w = w
	t.size = Vector2(w, sz * 1.5)
	t.position = pos
	t.text = s
	parent.add_child(t)
	return t

# ═════════════ geliştirme ═════════════

func _upgrade() -> void:
	if not g.can_upgrade_char(id):
		g.audio.play("error")
		return
	if not g.upgrade_char(id): return
	var lv: int = g.char_level(id)
	g.audio.play("levelup")
	g.ui.menu.refresh_wallet()
	_new_skill = ""
	for u in D.signatureUnlocks(id, lv):
		if not u.get("locked", true) and int(u.get("minLvl", 0)) == lv: _new_skill = str(u.name)
	_build()
	_pop_t = _t
	_pop_lv = lv
	var mp := _medal.get_global_transform_with_canvas().origin
	var lp: Vector2 = get_global_transform_with_canvas().affine_inverse() * mp
	for i in 26:
		var a := randf() * TAU
		var sp := randf_range(160, 420)
		_parts.append({"p": lp, "v": Vector2(cos(a), sin(a)) * sp + Vector2(0, -140), "life": randf_range(0.5, 0.9), "max": 0.9, "c": YEL if i % 3 else _rc})
	if _new_skill != "": g.ui.toast("YENİ YETENEK: " + _new_skill)

# ═════════════ efektler ═════════════

func _draw_fx() -> void:
	var B := TriBatch.new()
	for p in _parts:
		var k: float = float(p.life) / float(p.max)
		var r := 4.0 * k + 1.0
		var c: Color = p.c
		c.a = minf(1.0, k * 1.5)
		var pp: Vector2 = p.p
		B.poly(PackedVector2Array([pp + Vector2(0, -r * 2.2), pp + Vector2(r * 0.45, 0), pp + Vector2(0, r * 2.2), pp + Vector2(-r * 0.45, 0)]), c)
		B.poly(PackedVector2Array([pp + Vector2(-r * 2.2, 0), pp + Vector2(0, r * 0.45), pp + Vector2(r * 2.2, 0), pp + Vector2(0, -r * 0.45)]), c)
	B.flush(_fx)
	if _pop_t >= 0.0 and _medal and is_instance_valid(_medal):
		var k := (_t - _pop_t) / 1.4
		if k < 1.0:
			var mp: Vector2 = get_global_transform_with_canvas().affine_inverse() * _medal.get_global_transform_with_canvas().origin
			var c := mp + Vector2(0, -70 - k * 30)
			var s := ScrLevelUp._back_ease(minf(1.0, k / 0.3))
			var a := 1.0 - maxf(0.0, (k - 0.7) / 0.3)
			_fx.draw_set_transform(c, -0.06, Vector2.ONE * s)
			ScrCeremony._star(_fx, Vector2.ZERO, 92, 64, 14, Color("#e8322c", a), 4.0)
			_fx.draw_set_transform(Vector2.ZERO)

# ═════════════ dokunma (yerel düğmeler + kaydırma) ═════════════

func _btn(node: Node2D, rect: Rect2, cb: Callable) -> void:
	_cbtns.append({"node": node, "rect": rect, "cb": cb})

func _hit(pos: Vector2):
	for i in range(_cbtns.size() - 1, -1, -1):
		var B: Dictionary = _cbtns[i]
		var nd: Node2D = B.node
		if not is_instance_valid(nd) or not nd.is_visible_in_tree(): continue
		if not _cdclip.get_global_rect().has_point(pos): continue
		var lp: Vector2 = nd.get_global_transform_with_canvas().affine_inverse() * pos
		if (B.rect as Rect2).grow(10.0).has_point(lp): return B
	return null

func _input(ev: InputEvent) -> void:
	if not visible: return
	if ev is InputEventScreenTouch:
		var st := ev as InputEventScreenTouch
		get_viewport().set_input_as_handled()
		if st.pressed:
			if _pid >= 0: return
			_pid = st.index
			_p0 = st.position
			_last = st.position
			_dragging = false
			_vel = 0.0
			_cpress = _hit(st.position)
			if _cpress: _spring(_cpress.node, 0.92)
		elif st.index == _pid:
			_pid = -1
			var B = _cpress
			_cpress = null
			if B:
				_spring(B.node, 1.0)
				if not _dragging and not st.canceled and (_hit(st.position) == B or _hit(_p0) == B):
					TapFx.pop(st.position)
					(B.cb as Callable).call()
	elif ev is InputEventScreenDrag:
		var sd := ev as InputEventScreenDrag
		get_viewport().set_input_as_handled()
		if sd.index != _pid: return
		if not _dragging and (sd.position - _p0).length() > (18.0 if _cpress else 10.0):
			_dragging = true
			if _cpress:
				_spring(_cpress.node, 1.0)
				_cpress = null
		if _dragging and _scroll_max > 0.0:
			var k := _content.get_global_transform_with_canvas().get_scale().y
			var dy := (sd.position.y - _last.y) / maxf(0.01, k)
			_scroll -= dy
			_vel = -dy / maxf(0.001, get_process_delta_time())
		_last = sd.position

func _spring(n: Node2D, tgt: float) -> void:
	var s = _csprings.get(n)
	if s == null:
		s = [1.0, 0.0, 1.0]
		_csprings[n] = s
	s[2] = tgt
	if tgt < 1.0: s[1] -= 1.5

func _process(dt: float) -> void:
	if not visible or _content == null: return
	_t += dt
	if _pid < 0 or not _dragging:
		_scroll += _vel * dt
		_vel *= pow(0.004, dt)
		if _scroll < 0.0:
			_scroll = lerpf(_scroll, 0.0, 1.0 - pow(0.0005, dt))
			_vel = 0.0
		elif _scroll > _scroll_max:
			_scroll = lerpf(_scroll, _scroll_max, 1.0 - pow(0.0005, dt))
			_vel = 0.0
	_content.position.y = -_scroll
	for n in _csprings.keys():
		if not is_instance_valid(n):
			_csprings.erase(n)
			continue
		var s: Array = _csprings[n]
		var a: float = -760.0 * (float(s[0]) - float(s[2])) - 15.0 * float(s[1])
		s[1] = float(s[1]) + a * minf(dt, 1.0 / 30.0)
		s[0] = float(s[0]) + float(s[1]) * minf(dt, 1.0 / 30.0)
		(n as Node2D).scale = Vector2.ONE * float(s[0])
		if absf(float(s[0]) - float(s[2])) < 0.001 and absf(float(s[1])) < 0.01 and float(s[2]) >= 1.0:
			(n as Node2D).scale = Vector2.ONE
			_csprings.erase(n)
	for n in _anim_in.keys():
		if not is_instance_valid(n):
			_anim_in.erase(n)
			continue
		var k := clampf((_t - float(_anim_in[n])) / 0.32, 0, 1)
		(n as Node2D).scale = Vector2.ONE * lerpf(0.9, 1.0, ScrLevelUp._back_ease(k))
		(n as Node2D).modulate.a = minf(1.0, k * 2.0)
		if k >= 1.0: _anim_in.erase(n)
	if _medal and is_instance_valid(_medal):
		_medal.queue_redraw()
		if _pop_t >= 0.0:
			var kp := (_t - _pop_t) / 0.5
			_medal.scale = Vector2.ONE * (1.0 + 0.45 * sin(clampf(kp, 0, 1) * PI))
	for i in range(_parts.size() - 1, -1, -1):
		var p: Dictionary = _parts[i]
		p.life = float(p.life) - dt
		if p.life <= 0.0:
			_parts.remove_at(i)
			continue
		var v: Vector2 = p.v
		v.y += 700.0 * dt
		p.v = v
		p.p = (p.p as Vector2) + v * dt
	if _parts.size() or (_pop_t >= 0.0 and _t - _pop_t < 1.5): _fx.queue_redraw()

func close() -> void:
	if not visible: return
	fade_hide(_close_now)

func _close_now() -> void:
	visible = false
	for c in get_children():
		if not (c is Scr._Ticker): c.queue_free()
	_content = null
	_cbtns.clear()
	_parts.clear()
	_new_skill = ""
	if g.ui.menu.pages.has("kahraman"): g.ui.menu.pages["kahraman"].render()
