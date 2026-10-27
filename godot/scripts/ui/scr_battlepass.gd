class_name ScrBattlePass
extends ComicOverlay
## SAVAŞ BİLETİ (v3 · Borderlands + karanlık çizgi roman). Tamamen yerel çizim:
##   ① sezon bandı + KADEME rozeti (dönen kırmızı yıldız, büyük sayı) ve XP çubuğu
##   ② PREMİUM GEÇİŞ afişi (taç, altın parıltı süpürmesi, gem fiyat düğmesi) / PREMİUM AKTİF
##   ③ ödül yolu: solda ÜCRETSİZ, sağda PREMİUM kart, ortada kalın mürekkep ray + kademe
##      düğümleri (10'da bir yıldız). Alınabilir kart sarı nabız atar, zıplar; dokun → damga,
##      kıvılcım, cüzdana uçuş. Alınan kart kararır + yeşil tik; premium kilitli kartta kilit.
##   Altta birden çok ödül hazırsa "TÜMÜNÜ AL" düğmesi. Açılışta yol şimdiki kademeye kayar.

const ROW_H := 104.0
const ROW_GAP := 10.0
const RAIL_W := 64.0
const FOOT := 84.0

var _row0 := 0.0               # ilk satırın içerik y'si
var _rail: Node2D
var _rail_fill := 0.0          # ray dolgusu (canlı, 0→hedef)
var _rail_to := 0.0
var _first := true
var _xp_shown := 0.0
var _xp_bar: Node2D
var _foot_n: Node2D

func _init(game) -> void:
	super(game)
	name = "BattlePass"

func open() -> void:
	_first = true
	_rail_fill = 0.0
	_xp_shown = 0.0
	open_overlay()
	# şimdiki kademeye kaydır
	var tier: int = g.bp_tier()
	if tier > 1:
		_scroll = clampf(_row_y(tier) - _qclip.size.y * 0.35, 0.0, _scroll_max)
	_first = false

func _title() -> String: return "SAVAŞ BİLETİ"

func _claimables() -> Array:
	var out := []
	var prem: bool = g.bp_has_premium()
	for t in range(1, g.bp_tier() + 1):
		if g.bp_can_claim(t, "free"): out.append([t, "free"])
		if prem and g.bp_can_claim(t, "premium"): out.append([t, "premium"])
	return out

func _foot_h() -> float: return FOOT if _claimables().size() >= 2 else 0.0

func _build_foot() -> void:
	_foot_n = null
	var n := _claimables().size()
	if n < 2: return
	var f := Node2D.new()
	f.position = Vector2(0, _W.y - FOOT)
	f.draw.connect(func():
		f.draw_rect(Rect2(_SR.position.x, 0, _SR.size.x, FOOT + 60), Color("#14060a"))
		f.draw_rect(Rect2(_SR.position.x, 0, _SR.size.x, 5), INK)
		f.draw_rect(Rect2(_SR.position.x, 5, _SR.size.x, 3), Color(RED, 0.9)))
	add_child(f)
	_foot_n = f
	var b := _cta(f, Vector2(_W.x * 0.5, FOOT * 0.5 + 2), _W.x - 64, 54, "TÜMÜNÜ AL (" + str(n) + ")", Color("#ff8a2a"), Color("#ffc21a"), _claim_all)
	b.set_meta("bob", 0.0)

# ═════════════ içerik ═════════════

func _build_content(y: float) -> float:
	var prem: bool = g.bp_has_premium()
	var tier: int = g.bp_tier()
	var mx := int(D.BATTLE_PASS.maxTier)
	_ribbon(y, str(D.BATTLE_PASS.season), "", 0.04)
	y += 46
	y = _tier_panel(y, tier, mx)
	y += 14
	if not prem: y = _premium_cta(y) + 14
	else: y = _premium_on(y) + 12
	# sütun başlıkları
	var cw := (_W.x - 32 - RAIL_W) * 0.5
	var hl := Node2D.new()
	hl.position = Vector2(0, y)
	hl.draw.connect(func():
		hl.draw_style_box(ComicSkin.sb(INK, 8), Rect2(16, 0, cw, 30))
		hl.draw_style_box(ComicSkin.sb(Color(0.6, 0.6, 0.65, 0.25), 8, 2.0, Color(1, 1, 1, 0.25)), Rect2(16, 0, cw, 30))
		hl.draw_style_box(ComicSkin.sb(INK, 8), Rect2(16 + cw + RAIL_W, 0, cw, 30))
		hl.draw_style_box(ComicSkin.sb(Color(GOLD, 0.25), 8, 2.0, Color(GOLD, 0.8)), Rect2(16 + cw + RAIL_W, 0, cw, 30)))
	_content.add_child(hl)
	_txt(hl, "ÜCRETSİZ", 18, Color(1, 1, 1, 0.85), "", Vector2(16, 3), cw).align = 0.5
	_txt(hl, "PREMİUM", 18, YEL, "", Vector2(16 + cw + RAIL_W + 14, 3), cw - 14).align = 0.5
	_icon(hl, load("res://assets/ui/art/icon/tac.png"), 18, Vector2(16 + cw + RAIL_W + 24, 15), YEL)
	_anim_in[hl] = 0.3
	y += 42
	_row0 = y
	# ray (tüm satırların arkasında)
	var defs: Array = D.BATTLE_PASS_TIERS
	var n := defs.size()
	var rx := 16 + cw + RAIL_W * 0.5
	var r_top := y + ROW_H * 0.5
	var r_bot := y + (n - 1) * (ROW_H + ROW_GAP) + ROW_H * 0.5
	_rail_to = clampf((_row_y(tier) + ROW_H * 0.5 - r_top) if tier >= 1 else 0.0, 0.0, r_bot - r_top)
	if not _first and _rail_fill <= 0.0: _rail_fill = _rail_to
	_rail = Node2D.new()
	_rail.draw.connect(func():
		_rail.draw_rect(Rect2(rx - 9, r_top, 18, r_bot - r_top), INK)
		_rail.draw_rect(Rect2(rx - 5, r_top, 10, r_bot - r_top), Color("#3a1a22"))
		if _rail_fill > 1.0:
			_rail.draw_rect(Rect2(rx - 5, r_top, 10, _rail_fill), YEL)
			_rail.draw_rect(Rect2(rx - 5, r_top, 3, _rail_fill), Color(1, 1, 1, 0.55))
			# ilerleyen uçta kıvılcım
			var tip := Vector2(rx, r_top + _rail_fill)
			var k := 0.5 + 0.5 * sin(_t * 8.0)
			_rail.draw_circle(tip, 10 + k * 4, Color(1, 0.6, 0.2, 0.25))
			_rail.draw_circle(tip, 5, Color.WHITE))
	_content.add_child(_rail)
	_live.append(_rail)
	for i in n:
		_row(defs[i], i, tier, prem, cw, rx)
	return _row_y(n) + ROW_H + 10

func _row_y(t: int) -> float:
	return _row0 + (t - 1) * (ROW_H + ROW_GAP)

## KADEME rozeti + XP
func _tier_panel(y: float, tier: int, mx: int) -> float:
	var pr: Dictionary = g.bp_progress()
	var w := _W.x - 32
	var h := 124.0
	var pn := Node2D.new()
	pn.position = Vector2(16, y)
	pn.draw.connect(func():
		var r := Rect2(0, 0, w, h)
		ComicSkin.panel(pn, r, CARD, 14, 4.0, Vector2(3, 6))
		ComicSkin.rays(pn, Rect2(0, 0, 130, h), Vector2(66, h * 0.5), Color(1, 0.3, 0.2, 0.14), 14, 0.12, 4.0)
		ComicSkin.halftone(pn, Rect2(130, 0, w - 130, h).grow(-5), Color(0, 0, 0, 0.25), 8.0, 5, 2.2))
	_content.add_child(pn)
	_anim_in[pn] = 0.1
	# dönen yıldız rozet
	var st := Node2D.new()
	st.position = Vector2(66, h * 0.5)
	st.draw.connect(func():
		ScrCeremony._star(st, Vector2.ZERO, 54, 40, 10, RED, 4.0, 0.0, 1.0))
	st.set_meta("spin", 0.25)
	pn.add_child(st)
	_live.append(st)
	var num := _txt(pn, str(tier), 46 if tier < 10 else 40, YEL, UIK.ink_stroke(3.0, 4.0), Vector2(16, h * 0.5 - 32), 100)
	num.align = 0.5
	_txt(pn, "KADEME", 15, Color(1, 1, 1, 0.75), "", Vector2(146, 14), 200)
	_txt(pn, str(tier) + " / " + str(mx), 30, Color.WHITE, UIK.ink_stroke(2.2, 3.0), Vector2(146, 30), 200)
	# XP çubuğu
	_xp_bar = Node2D.new()
	_xp_bar.position = Vector2(146, 76)
	var bw := w - 146 - 16
	var full := tier >= mx
	var to := 1.0 if full else clampf(float(pr.cur) / maxf(1.0, float(pr.need)), 0.0, 1.0)
	if not _first: _xp_shown = to
	_xp_bar.set_meta("to", to)
	_xp_bar.draw.connect(func():
		var br := Rect2(0, 0, bw, 22)
		_xp_bar.draw_style_box(ComicSkin.sb(INK, 11), Rect2(br.position + Vector2(2, 4), br.size))
		_xp_bar.draw_style_box(ComicSkin.sb(Color("#1a080c"), 11, 3.5), br)
		if _xp_shown > 0.01:
			var f := Rect2(4, 4, (bw - 8) * _xp_shown, 14)
			_xp_bar.draw_style_box(ComicSkin.sb(YEL, 7), f)
			_xp_bar.draw_line(f.position + Vector2(6, 3.5), Vector2(f.end.x - 4, 7.5), Color(1, 1, 1, 0.55), 2.0)
			# eğik çizgiler (Borderlands çubuğu)
			var x := 10.0
			while x < f.end.x - 4:
				_xp_bar.draw_line(Vector2(x, f.end.y), Vector2(x + 6, f.position.y), Color(1, 0.6, 0.1, 0.35), 2.0)
				x += 12.0)
	pn.add_child(_xp_bar)
	_live.append(_xp_bar)
	var xt := "SEZON TAMAMLANDI" if full else (str(int(pr.cur)) + " / " + str(int(pr.need)) + " XP")
	_small(pn, xt, 12, Color(1, 1, 1, 0.85), Vector2(146, 100), bw, 0.0)
	_small(pn, "savaşlarda XP kazan", 11, Color(1, 0.7, 0.6, 0.65), Vector2(146, 100), bw, 1.0)
	return y + h

## PREMİUM GEÇİŞ afişi
func _premium_cta(y: float) -> float:
	var w := _W.x - 32
	var h := 112.0
	var pn := Node2D.new()
	pn.position = Vector2(16, y)
	pn.draw.connect(func():
		var r := Rect2(0, 0, w, h)
		var k := 0.5 + 0.5 * sin(_t * 3.0)
		pn.draw_style_box(ComicSkin.sb(Color(0, 0, 0, 0), 16, 3.0, Color(GOLD, 0.35 + 0.35 * k)), r.grow(4))
		ComicSkin.panel(pn, r, Color("#5a0e18"), 14, 4.0, Vector2(3, 6))
		ComicSkin.rays(pn, r, Vector2(56, h * 0.5), Color(1, 0.75, 0.2, 0.16), 16, 0.1, 4.0)
		pn.draw_style_box(ComicSkin.sb(Color(0, 0, 0, 0), 10, 2.0, Color(GOLD, 0.7)), r.grow(-7))
		# altın süpürme
		var sx := fmod(_t * 0.5, 1.8) / 1.8 * (w + 200) - 100
		var pts := PackedVector2Array()
		for q in [Vector2(sx, 8), Vector2(sx + 30, 8), Vector2(sx + 6, h - 8), Vector2(sx - 24, h - 8)]:
			pts.append(Vector2(clampf(q.x, 8, w - 8), q.y))
		if pts[1].x - pts[0].x > 2: pn.draw_colored_polygon(pts, Color(1, 0.9, 0.5, 0.16)))
	_content.add_child(pn)
	_live.append(pn)
	_anim_in[pn] = 0.18
	var cr := Node2D.new()
	cr.position = Vector2(56, h * 0.5 - 4)
	cr.set_meta("float", h * 0.5 - 4)
	pn.add_child(cr)
	_live.append(cr)
	var gl := Sprite2D.new()
	gl.texture = ClimbArt.glow_tex()
	var gm := CanvasItemMaterial.new()
	gm.blend_mode = CanvasItemMaterial.BLEND_MODE_ADD
	gl.material = gm
	gl.modulate = Color(1, 0.7, 0.2, 0.7)
	gl.scale = Vector2.ONE * (110.0 / 128.0)
	cr.add_child(gl)
	_icon(cr, load("res://assets/ui/art/icon/tac.png"), 60, Vector2.ZERO, YEL)
	_txt(pn, "PREMİUM GEÇİŞ", 26, YEL, UIK.ink_stroke(2.2, 3.0), Vector2(104, 12), 240)
	_small(pn, "Tüm altın ödülleri aç · gizli kahramanlar", 12, Color(1, 0.9, 0.8, 0.9), Vector2(106, 46), 240)
	var price := int(D.BATTLE_PASS.premiumPrice)
	var can: bool = g.read_stones() >= price
	var b := _cta(pn, Vector2(w - 92, h - 28), 152, 40, "     " + str(price), Color("#7a2cff") if can else Color("#4a3a50"), Color("#a85cff") if can else Color("#5a4a60"), _buy, true, 22)
	_icon(b, load("res://assets/fx/currency/gem.png"), 28, Vector2(-34, 0))
	b.set_meta("bob", 1.0)
	return y + h

func _premium_on(y: float) -> float:
	var w := _W.x - 32
	var pn := Node2D.new()
	pn.position = Vector2(16, y)
	pn.draw.connect(func():
		ComicSkin.panel(pn, Rect2(0, 0, w, 44), Color("#5a0e18"), 12, 3.5, Vector2(2, 4))
		pn.draw_style_box(ComicSkin.sb(Color(0, 0, 0, 0), 9, 2.0, Color(GOLD, 0.7)), Rect2(5, 5, w - 10, 34)))
	_content.add_child(pn)
	_anim_in[pn] = 0.18
	_icon(pn, load("res://assets/ui/art/icon/tac.png"), 26, Vector2(30, 22), YEL)
	_txt(pn, "PREMİUM AKTİF", 22, YEL, UIK.ink_stroke(1.8, 2.4), Vector2(52, 6), 200)
	_small(pn, "tüm ödüller açık", 12, Color(1, 0.9, 0.8, 0.85), Vector2(0, 15), w - 16, 1.0)
	return y + 44

## tek kademe satırı
func _row(def: Dictionary, i: int, tier: int, prem: bool, cw: float, rx: float) -> void:
	var t := int(def.tier)
	var y := _row_y(t)
	var delay := 0.35 + clampf(float(t - maxi(1, tier - 2)), 0.0, 8.0) * 0.05
	# şimdiki kademe vurgusu
	if t == tier:
		var hl := Node2D.new()
		hl.position = Vector2(0, y)
		hl.draw.connect(func():
			var k := 0.5 + 0.5 * sin(_t * 3.0)
			hl.draw_style_box(ComicSkin.sb(Color(RED, 0.10 + 0.08 * k), 14), Rect2(8, -5, _W.x - 16, ROW_H + 10)))
		_content.add_child(hl)
		_content.move_child(hl, 0)
		_live.append(hl)
	for track in ["free", "premium"]:
		var r: Dictionary = def[track]
		var x := 16.0 if track == "free" else 16.0 + cw + RAIL_W
		var claimed: bool = g.bp_claimed(t, track)
		var can: bool = g.bp_can_claim(t, track)
		var locked: bool = track == "premium" and not prem
		var st := "claimed" if claimed else ("ready" if can else ("lock" if locked else ("open" if t <= tier else "future")))
		var c := _card(r, track, st, Vector2(cw, ROW_H))
		c.position = Vector2(x + cw * 0.5, y + ROW_H * 0.5)
		_content.add_child(c)
		_anim_in[c] = delay + (0.03 if track == "premium" else 0.0)
		if st == "ready":
			var tr: String = track
			_btn(c, Rect2(-cw * 0.5, -ROW_H * 0.5, cw, ROW_H), func(): _claim(t, tr, c))
	# düğüm
	var nd := Node2D.new()
	nd.position = Vector2(rx, y + ROW_H * 0.5)
	var mile := t % 10 == 0
	var nst := "done" if t < tier else ("now" if t == tier else "future")
	nd.draw.connect(func():
		var col := YEL if nst == "done" else (RED if nst == "now" else Color("#3a1a22"))
		if nst == "now":
			var k := fmod(_t, 1.2) / 1.2
			nd.draw_arc(Vector2.ZERO, 24 + k * 14, 0, TAU, 32, Color(RED, 0.7 * (1.0 - k)), 4.0, true)
		if mile:
			ScrCeremony._star(nd, Vector2.ZERO, 30, 21, 10, col, 3.5, 0.0, 1.0)
		else:
			nd.draw_circle(Vector2(2, 3), 19, INK)
			nd.draw_circle(Vector2.ZERO, 19, INK)
			nd.draw_circle(Vector2.ZERO, 15.5, col)
			nd.draw_arc(Vector2(0, -2), 11, PI * 1.15, PI * 1.85, 10, Color(1, 1, 1, 0.35), 2.5, true))
	_content.add_child(nd)
	if nst == "now": _live.append(nd)
	var tc := INK if nst == "done" else (Color.WHITE if nst == "now" else Color(1, 1, 1, 0.6))
	_txt(nd, str(t), 20 if t < 10 else 17, tc, UIK.ink_stroke(1.6, 2.0) if nst == "now" else "", Vector2(-24, -15), 48).align = 0.5
	_anim_in[nd] = delay

## ödül kartı (merkez 0,0)
func _card(rw: Dictionary, track: String, st: String, sz: Vector2) -> Node2D:
	var n := Node2D.new()
	var prem: bool = track == "premium"
	var fill := CARD2 if prem else CARD
	if st == "ready": fill = Color("#ffcf2a") if not prem else Color("#ffb020")
	var r := Rect2(-sz * 0.5, sz)
	var big: bool = String(rw.kind) == "char" or String(rw.kind) == "chest"
	n.draw.connect(func():
		if st == "ready":
			var k := fmod(_t, 1.1) / 1.1
			n.draw_style_box(ComicSkin.sb(Color(0, 0, 0, 0), 14 + k * 6, 3.0, Color(Color.WHITE, 0.75 * (1.0 - k))), r.grow(2 + k * 8))
		ComicSkin.panel(n, r, fill, 12, 4.0, Vector2(3, 5))
		var rc := Color(1, 1, 1, 0.3) if st == "ready" else (Color(1, 0.7, 0.2, 0.10) if prem else Color(1, 1, 1, 0.05))
		if big and st != "claimed": rc = Color(1, 0.6, 0.2, 0.22)
		ComicSkin.rays(n, r, Vector2(0, -8), rc, 14, 0.12, 4.0)
		if prem and st != "ready":
			n.draw_style_box(ComicSkin.sb(Color(0, 0, 0, 0), 8, 2.0, Color(GOLD, 0.55)), r.grow(-6))
		if st == "claimed" or st == "lock" or st == "future":
			n.draw_style_box(ComicSkin.sb(Color(0, 0, 0, 0.42 if st != "future" else 0.25), 12), r))
	var tex := _reward_tex(rw)
	var box := 54.0
	match String(rw.kind):
		"chest": box = 66.0
		"char", "gear": box = 44.0
	var mod := Color.WHITE
	if String(rw.kind) == "char": mod = Color("#c79bff")
	elif String(rw.kind) == "gear": mod = Color("#9fd0ff")
	if st == "claimed": mod = mod * Color(0.7, 0.7, 0.7, 0.75)
	elif st == "lock" or st == "future": mod = mod * Color(0.8, 0.78, 0.8, 0.9)
	var ic := _icon(n, tex, box, Vector2(0, -10), mod)
	if String(rw.kind) == "char" and ic:
		_txt(n, "?", 30, YEL, UIK.ink_stroke(2.0, 2.6), Vector2(-20, -32), 40).align = 0.5
	var lc := INK if st == "ready" else Color.WHITE
	var lab := _reward_label(rw)
	_txt(n, lab, 18 if lab.length() <= 10 else 14, lc, "" if st == "ready" else UIK.ink_stroke(1.6, 2.0), Vector2(-sz.x * 0.5 + 4, sz.y * 0.5 - 32), sz.x - 8).align = 0.5
	if st == "claimed": _check(n, Vector2(sz.x * 0.5 - 16, -sz.y * 0.5 + 16))
	elif st == "lock": _lock(n, Vector2(sz.x * 0.5 - 16, -sz.y * 0.5 + 16), 0.9)
	elif st == "ready":
		# "AL!" etiketi
		var tg := Node2D.new()
		tg.position = Vector2(sz.x * 0.5 - 22, -sz.y * 0.5 + 12)
		tg.rotation = 0.18
		tg.draw.connect(func():
			tg.draw_style_box(ComicSkin.sb(INK, 6), Rect2(-22, -11, 46, 26))
			tg.draw_style_box(ComicSkin.sb(RED, 6), Rect2(-24, -13, 46, 24)))
		n.add_child(tg)
		_txt(tg, "AL!", 18, Color.WHITE, "", Vector2(-24, -13), 46).align = 0.5
		n.set_meta("bob", randf() * TAU)
		_live.append(n)
	return n

# ═════════════ eylemler ═════════════

func _claim(t: int, track: String, n: Node2D) -> void:
	var kind := String(D.BATTLE_PASS_TIERS[t - 1][track].kind)
	var toast = g.bp_claim(t, track)
	if toast == null: return
	g.audio.play("claim")
	g.ui.toast(str(toast))
	_celebrate(n, kind)
	_rebuild_later()

func _claim_all() -> void:
	var L := _claimables()
	if L.is_empty(): return
	var gold := 0
	var gem := 0
	var other := 0
	for p in L:
		var r: Dictionary = D.BATTLE_PASS_TIERS[int(p[0]) - 1][p[1]]
		if g.bp_claim(int(p[0]), String(p[1])) == null: continue
		match String(r.kind):
			"rubies": gold += int(r.amount)
			"stone": gem += int(r.amount)
			_: other += 1
	var parts := []
	if gold > 0: parts.append("+" + ShopPage.fmt_tr(gold) + " ALTIN")
	if gem > 0: parts.append("+" + str(gem) + " GEM")
	if other > 0: parts.append(str(other) + " ÖDÜL")
	g.ui.toast(" · ".join(parts))
	g.audio.play("tierclaim")
	if _foot_n:
		var at := _foot_n.position + Vector2(_W.x * 0.5, FOOT * 0.5)
		_burst(at, YEL, 40)
		_rings.append([at, _t])
		if gold > 0: _celebrate(_foot_n, "rubies", "")
		if gem > 0: _celebrate(_foot_n, "stone", "")
	g.ui.refresh_wallet()
	g.ui.menu._top()
	get_tree().create_timer(1.0).timeout.connect(func():
		if visible: _rebuild_all())

func _buy() -> void:
	if g.bp_has_premium(): return
	if g.bp_buy_premium():
		g.ui.refresh_wallet()
		g.ui.toast("PREMİUM GEÇİŞ AÇILDI")
		_burst(_W * 0.5, GOLD, 50)
		_rings.append([_W * 0.5, _t])
		g.audio.play("chestrare")
		_rebuild_all()
	else:
		g.audio.play("error")
		g.ui.toast("YETERSİZ GEM")

## tüm ekran yeniden (alt çubuk değişebilir) — giriş animasyonu olmadan, kaydırma korunur
func _rebuild_all() -> void:
	var keep := _scroll
	_build()
	_sync_wallet()
	for k in _anim_in.keys(): _anim_in[k] = -10.0
	_scroll = clampf(keep, 0.0, _scroll_max)

func _tick(dt: float) -> void:
	# ray dolgusu ve XP çubuğu açılışta dolar
	if _rail_fill < _rail_to:
		_rail_fill = minf(_rail_to, _rail_fill + maxf(120.0, _rail_to * 1.2) * dt) if _t > 0.35 else 0.0
	if _xp_bar:
		var to := float(_xp_bar.get_meta("to", 0.0))
		if _xp_shown < to and _t > 0.4: _xp_shown = minf(to, _xp_shown + dt * 1.2)
