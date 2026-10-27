class_name ScrEvent
extends ComicOverlay
## ETKİNLİK ekranı (v3 · karanlık çizgi roman) — ana sayfadaki büyük afişten açılır, üç etkinlik:
##   gunluk  GÜNLÜK HEDEF: süzülen sandık afişi + 3 hedef pulu + bugünün 3 hedef kartı + SAVAŞA GİR
##   kupa    KUPA YOLU: altın kupa afişi (toplam dakika, sonraki ödül çubuğu, HAYATTA KAL) +
##           dikey ödül yolu (ray dolgusu, hazır ödül nabız atar → AL!)
##   zirve   SONSUZ KULE: çizgi roman kule (5 kat, şimdiki kat kırmızı nabız, boss katı kafatası) +
##           kat bilgisi + TIRMAN; altında KÂBUS DÖNGÜSÜ kartı.

const MODES := {
	"gunluk": {"title": "GÜNLÜK HEDEF"},
	"kupa": {"title": "KUPA YOLU"},
	"zirve": {"title": "SONSUZ KULE"},
}

var mode := "kupa"
var _road_fill := 0.0
var _road_to := 0.0
var _road: Node2D

func _init(game) -> void:
	super(game)
	name = "Event"

func open(m: String) -> void:
	mode = m if MODES.has(m) else "kupa"
	_road_fill = 0.0
	open_overlay()

func _title() -> String: return str(MODES[mode].title)

func _build_content(y: float) -> float:
	match mode:
		"gunluk": return _gunluk(y)
		"zirve": return _zirve(y)
	return _kupa(y)

## sarılan gövde yazısı (en çok 2 satır)
func _wrap(parent: Node, s: String, sz: float, col: Color, pos: Vector2, w: float, sh := "") -> UIText:
	var t := UIText.new()
	t.style(false, 1000, sz, 0.6, col, sh)
	t.nowrap = false
	t.max_lines = 2
	t.wrap_w = w
	t.position = pos
	t.text = s
	parent.add_child(t)
	return t

## afiş paneli: dönen ışınlar + yarım ton (merkez ışık noktası c)
func _poster(y: float, h: float, fill: Color, c: Vector2, ray: Color, delay: float) -> Node2D:
	var w := _W.x - 32
	var pn := Node2D.new()
	pn.position = Vector2(16, y)
	pn.draw.connect(func():
		var r := Rect2(0, 0, w, h)
		ComicSkin.panel(pn, r, fill, 16, 4.0, Vector2(3, 6))
		var V := PackedVector2Array()
		var box := PackedVector2Array([Vector2(4, 4), Vector2(w - 4, 4), Vector2(w - 4, h - 4), Vector2(4, h - 4)])
		for i in 14:
			var a := i * TAU / 14.0 + _t * 0.15
			var tri := PackedVector2Array([c, c + Vector2(cos(a - 0.1), sin(a - 0.1)) * 600, c + Vector2(cos(a + 0.1), sin(a + 0.1)) * 600])
			for q in Geometry2D.intersect_polygons(tri, box):
				if q.size() >= 3: ComicSkin._fan(V, q)
		ComicSkin.draw_tris(pn, V, ray)
		ComicSkin.halftone(pn, r.grow(-5), Color(0, 0, 0, 0.28), 9.0, 6, 2.6)
		pn.draw_style_box(ComicSkin.sb(Color(0, 0, 0, 0), 16, 4.0), r))
	_content.add_child(pn)
	_live.append(pn)
	_anim_in[pn] = delay
	return pn

## süzülen, parlayan büyük resim
func _hero_art(parent: Node2D, tex: Texture2D, box: float, at: Vector2, glow: Color, mod := Color.WHITE) -> Node2D:
	var a := Node2D.new()
	a.position = at
	a.set_meta("float", at.y)
	parent.add_child(a)
	_live.append(a)
	var gl := Sprite2D.new()
	gl.texture = ClimbArt.glow_tex()
	var gm := CanvasItemMaterial.new()
	gm.blend_mode = CanvasItemMaterial.BLEND_MODE_ADD
	gl.material = gm
	gl.modulate = glow
	gl.scale = Vector2.ONE * (box * 1.9 / 128.0)
	gl.show_behind_parent = true
	a.add_child(gl)
	_icon(a, tex, box, Vector2.ZERO, mod)
	return a

func _bar(parent: Node2D, pos: Vector2, w: float, fr: float, col := YEL) -> Node2D:
	var b := Node2D.new()
	b.position = pos
	b.draw.connect(func():
		var br := Rect2(0, 0, w, 22)
		b.draw_style_box(ComicSkin.sb(INK, 11), Rect2(br.position + Vector2(2, 4), br.size))
		b.draw_style_box(ComicSkin.sb(Color("#1a080c"), 11, 3.5), br)
		var k := clampf((_t - 0.35) / 0.8, 0.0, 1.0)
		var f := fr * (1.0 - pow(1.0 - k, 3.0))
		if f > 0.01:
			var rr := Rect2(4, 4, (w - 8) * f, 14)
			b.draw_style_box(ComicSkin.sb(col, 7), rr)
			b.draw_line(rr.position + Vector2(6, 3.5), Vector2(rr.end.x - 4, 7.5), Color(1, 1, 1, 0.55), 2.0)
			var x := 10.0
			while x < rr.end.x - 4:
				b.draw_line(Vector2(x, rr.end.y), Vector2(x + 6, rr.position.y), Color(1, 0.6, 0.1, 0.35), 2.0)
				x += 12.0)
	parent.add_child(b)
	_live.append(b)
	return b

func _go_battle() -> void:
	g.audio.play("cta")
	var nm: Dictionary = g.ui.menu.home_target()
	_close_now()
	g.start_run(int(nm.w), int(nm.m))

# ═════════════ GÜNLÜK ═════════════

func _gunluk(y: float) -> float:
	var L: Array = Journey.daily_list(g.meta)
	var left: int = Journey.daily_left(g.meta)
	var B: Dictionary = Journey.daily_book(g.meta)
	var paid := JS.truthy(B.get("paid", 0))
	var h := 196.0
	var pn := _poster(y, h, Color("#3a0e16"), Vector2(84, 96), Color(1, 0.55, 0.2, 0.13), 0.05)
	var C: Dictionary = ChestSystem.chests().get(Journey.DAILY_CHEST, {})
	var ctex: Texture2D = load("res://assets/ui/art/chest/t" + str(clampi(int(C.get("tier", 1)), 1, 7)) + ".png")
	var art := _hero_art(pn, ctex, 118, Vector2(84, 92), Color(1, 0.6, 0.2, 0.55))
	if paid: art.modulate = Color(0.75, 0.75, 0.75)
	_txt(pn, "GÜNLÜK SANDIK", 26, YEL, UIK.ink_stroke(2.2, 3.0), Vector2(160, 16), 200)
	_wrap(pn, str(C.get("name", "SANDIK")) + " · 3 hedefi bitir, sandık senin", 14, Color(1, 0.9, 0.85, 0.9), Vector2(162, 50), 186)
	# hedef pulları
	var done := 3 - left
	for i in 3:
		var p := Node2D.new()
		p.position = Vector2(184 + i * 50, 118)
		var on := i < done
		p.draw.connect(func():
			p.draw_circle(Vector2(2, 3), 19, INK)
			p.draw_circle(Vector2.ZERO, 19, INK)
			p.draw_circle(Vector2.ZERO, 15.5, GREEN if on else Color("#3a1a22"))
			if on: p.draw_polyline(PackedVector2Array([Vector2(-7, 0), Vector2(-2, 5), Vector2(8, -6)]), Color.WHITE, 4.0, true))
		pn.add_child(p)
		if not on: _txt(p, str(i + 1), 18, Color(1, 1, 1, 0.5), "", Vector2(-20, -14), 40).align = 0.5
		_anim_in[p] = 0.3 + i * 0.08
	var now := Time.get_time_dict_from_system()
	var sec := 86400 - (int(now.hour) * 3600 + int(now.minute) * 60 + int(now.second))
	var rs := "YENİLENMEYE " + str(sec / 3600) + " SA " + str((sec % 3600) / 60) + " DK"
	_small(pn, rs, 12, Color(1, 0.75, 0.6, 0.85), Vector2(160, 150), 190)
	if paid:
		var st := Node2D.new()
		st.position = Vector2(84, 150)
		st.rotation = -0.2
		st.draw.connect(func():
			st.draw_style_box(ComicSkin.sb(Color(PAPER, 0.92), 6), Rect2(-62, -17, 124, 34))
			st.draw_style_box(ComicSkin.sb(Color(0, 0, 0, 0), 6, 4.0, GREEN), Rect2(-62, -17, 124, 34)))
		pn.add_child(st)
		_txt(st, "KAZANILDI!", 22, GREEN.darkened(0.3), "", Vector2(-62, -15), 124).align = 0.5
		_anim_in[st] = 0.5
	y += h + 24
	_ribbon(y, "BUGÜNÜN HEDEFLERİ", str(done) + " / 3", 0.25)
	y += 48
	var w := _W.x - 32
	for i in L.size():
		var q: Dictionary = L[i]
		var ok: bool = q.done
		var ch := 84.0
		var n := Node2D.new()
		n.position = Vector2(16 + w * 0.5, y + ch * 0.5)
		n.draw.connect(func():
			var rr := Rect2(-w * 0.5, -ch * 0.5, w, ch)
			ComicSkin.panel(n, rr, Color("#1f6a3c") if ok else CARD, 12, 4.0, Vector2(3, 5))
			ComicSkin.halftone(n, rr.grow(-5), Color(0, 0, 0, 0.22), 8.0, 4, 2.0))
		_content.add_child(n)
		_anim_in[n] = 0.35 + i * 0.08
		var bd := Node2D.new()
		bd.position = Vector2(-w * 0.5 + 38, 0)
		bd.draw.connect(func(): ScrCeremony._star(bd, Vector2.ZERO, 27, 20, 9, YEL if ok else RED, 3.5, 0.0, 1.0))
		n.add_child(bd)
		_txt(bd, str(i + 1), 24, INK if ok else Color.WHITE, "" if ok else UIK.ink_stroke(1.6, 2.0), Vector2(-20, -18), 40).align = 0.5
		_wrap(n, str(q.t), 19, Color.WHITE, Vector2(-w * 0.5 + 76, -ch * 0.5 + 12), w - 140, UIK.ink_stroke(1.6, 2.0))
		if ok:
			var c := _check(n, Vector2(w * 0.5 - 36, 0), 1.5)
			c.set_meta("bob", float(i))
			_live.append(c)
		else:
			_icon(n, load("res://assets/ui/art/icon/kilic.png"), 30, Vector2(w * 0.5 - 36, 0), Color(1, 1, 1, 0.35))
		y += ch + 10
	y += 14
	_cta(_content, Vector2(_W.x * 0.5, y + 30), _W.x - 64, 58, "SAVAŞA GİR!", Color("#ff8a2a"), Color("#ffc21a"), _go_battle, true, 28).set_meta("bob", 0.0)
	return y + 70

# ═════════════ KUPA ═════════════

func _kupa(y: float) -> float:
	var mils: Array = D.SURVIVAL_MILESTONES
	var mins: int = g.survival_minutes()
	var next = null
	var prev_need := 0
	for m in mils:
		if mins < int(m.need):
			next = m
			break
		prev_need = int(m.need)
	var h := 232.0
	var pn := _poster(y, h, Color("#4a1a0a"), Vector2(80, 92), Color(1, 0.75, 0.2, 0.15), 0.05)
	var cup := _hero_art(pn, null, 100, Vector2(80, 92), Color(1, 0.7, 0.2, 0.7))
	cup.draw.connect(func(): ComicArt.trophy(cup, Vector2.ZERO, 1.05, _t))
	_small(pn, "HAYATTA KALDIĞIN SÜRE", 12, Color(1, 0.85, 0.7, 0.85), Vector2(156, 18), 200)
	var big := _txt(pn, str(mins), 54, YEL, UIK.ink_stroke(3.0, 4.0), Vector2(156, 30), 200)
	_txt(pn, "DK", 24, Color.WHITE, UIK.ink_stroke(2.0, 2.4), Vector2(162 + big.text_width(), 58), 60)
	var fr := 1.0
	if next != null: fr = clampf(float(mins - prev_need) / maxf(1.0, float(int(next.need) - prev_need)), 0.0, 1.0)
	_bar(pn, Vector2(156, 104), _W.x - 32 - 156 - 16, fr)
	_small(pn, ("SONRAKİ ÖDÜLE " + str(int(next.need) - mins) + " DK") if next != null else "YOL TAMAMLANDI", 12, Color(1, 1, 1, 0.85), Vector2(156, 132), 200)
	_cta(pn, Vector2((_W.x - 32) * 0.5, h - 40), _W.x - 80, 54, "HAYATTA KAL!", Color("#ff8a2a"), Color("#ffc21a"), _go_battle, true, 28).set_meta("bob", 0.0)
	y += h + 24
	var ready := 0
	for m in mils:
		if g.can_claim_milestone(m): ready += 1
	_ribbon(y, "ÖDÜL YOLU", (str(ready) + " ÖDÜL HAZIR") if ready else (str(mils.size()) + " DURAK"), 0.25)
	y += 50
	# yol: solda ray + dakika düğümleri, sağda ödül kartları
	var ch := 86.0
	var gap := 12.0
	var rx := 46.0
	var top := y + ch * 0.5
	var bot := y + (mils.size() - 1) * (ch + gap) + ch * 0.5
	var reached := 0
	for m in mils:
		if mins >= int(m.need): reached += 1
	# dolgu: ulaşılan son durağa + sonrakine doğru oransal
	var to := 0.0
	if reached > 0: to = (reached - 1) * (ch + gap)
	if next != null and reached > 0: to += (ch + gap) * fr
	_road_to = clampf(to, 0.0, bot - top)
	_road = Node2D.new()
	_road.draw.connect(func():
		_road.draw_rect(Rect2(rx - 9, top, 18, bot - top), INK)
		_road.draw_rect(Rect2(rx - 5, top, 10, bot - top), Color("#3a1a22"))
		if _road_fill > 1.0:
			_road.draw_rect(Rect2(rx - 5, top, 10, _road_fill), YEL)
			_road.draw_rect(Rect2(rx - 5, top, 3, _road_fill), Color(1, 1, 1, 0.55))
			var k := 0.5 + 0.5 * sin(_t * 8.0)
			_road.draw_circle(Vector2(rx, top + _road_fill), 10 + k * 4, Color(1, 0.6, 0.2, 0.25)))
	_content.add_child(_road)
	_live.append(_road)
	var w := _W.x - 16 - (rx + 34)
	for i in mils.size():
		var ms: Dictionary = mils[i]
		var claimed: bool = g.milestone_claimed(ms.id)
		var can: bool = g.can_claim_milestone(ms)
		var hit := mins >= int(ms.need)
		var st := "claimed" if claimed else ("ready" if can else ("next" if next != null and int(next.need) == int(ms.need) else "locked"))
		var cy := y + ch * 0.5
		# düğüm
		var nd := Node2D.new()
		nd.position = Vector2(rx, cy)
		nd.draw.connect(func():
			var col := YEL if hit else (RED if st == "next" else Color("#3a1a22"))
			if st == "next":
				var k := fmod(_t, 1.2) / 1.2
				nd.draw_arc(Vector2.ZERO, 26 + k * 12, 0, TAU, 32, Color(RED, 0.7 * (1.0 - k)), 4.0, true)
			nd.draw_circle(Vector2(2, 3), 25, INK)
			nd.draw_circle(Vector2.ZERO, 25, INK)
			nd.draw_circle(Vector2.ZERO, 21, col))
		_content.add_child(nd)
		if st == "next": _live.append(nd)
		var tc := INK if hit else Color.WHITE
		_txt(nd, str(int(ms.need)), 20, tc, "" if hit else UIK.ink_stroke(1.4, 1.8), Vector2(-24, -20), 48).align = 0.5
		_small(nd, "DK", 9, Color(INK, 0.8) if hit else Color(1, 1, 1, 0.6), Vector2(-24, 6), 48, 0.5)
		_anim_in[nd] = 0.3 + i * 0.05
		# kart
		var cx := rx + 34 + w * 0.5
		var n := Node2D.new()
		n.position = Vector2(cx, cy)
		var fill := Color("#ffcf2a") if st == "ready" else CARD
		n.draw.connect(func():
			var rr := Rect2(-w * 0.5, -ch * 0.5, w, ch)
			if st == "ready":
				var k := fmod(_t, 1.1) / 1.1
				n.draw_style_box(ComicSkin.sb(Color(0, 0, 0, 0), 14 + k * 6, 3.0, Color(Color.WHITE, 0.75 * (1.0 - k))), rr.grow(2 + k * 8))
			ComicSkin.panel(n, rr, fill, 12, 4.0, Vector2(3, 5))
			ComicSkin.rays(n, Rect2(rr.position, Vector2(92, ch)), Vector2(rr.position.x + 46, 0), Color(1, 1, 1, 0.3) if st == "ready" else Color(1, 0.6, 0.2, 0.12), 12, 0.12, 4.0)
			if st == "claimed" or st == "locked": n.draw_style_box(ComicSkin.sb(Color(0, 0, 0, 0.4), 12), rr))
		_content.add_child(n)
		_anim_in[n] = 0.33 + i * 0.05
		var rw: Dictionary = ms.reward
		var mod := Color(0.7, 0.7, 0.7, 0.75) if st == "claimed" else Color.WHITE
		if String(rw.kind) == "cards":
			var hc := _hero_card(str(rw.char), int(rw.get("amount", 1)))
			hc.position = Vector2(-w * 0.5 + 46, 0)
			hc.rotation = -0.06
			hc.modulate = mod
			n.add_child(hc)
		else:
			_icon(n, _reward_tex(rw), 62.0 if String(rw.kind) == "chest" else 50.0, Vector2(-w * 0.5 + 46, 0), mod)
		var lc := INK if st == "ready" else Color.WHITE
		_txt(n, _reward_label(rw), 20, lc, "" if st == "ready" else UIK.ink_stroke(1.6, 2.0), Vector2(-w * 0.5 + 92, -ch * 0.5 + 12), w - 170)
		var sub := "ALINDI" if claimed else ("HAZIR!" if can else (str(int(ms.need) - mins) + " DK KALDI"))
		_small(n, sub, 12, Color(INK, 0.8) if st == "ready" else Color(1, 0.8, 0.65, 0.8), Vector2(-w * 0.5 + 93, 12), w - 170)
		if st == "claimed": _check(n, Vector2(w * 0.5 - 34, 0), 1.4)
		elif st == "ready":
			var b := Node2D.new()
			b.position = Vector2(w * 0.5 - 40, 0)
			b.draw.connect(func():
				ComicSkin.panel(b, Rect2(-30, -20, 60, 40), RED, 12, 3.5, Vector2(2, 4)))
			n.add_child(b)
			_txt(b, "AL!", 24, Color.WHITE, UIK.ink_stroke(1.6, 2.0), Vector2(-30, -16), 60).align = 0.5
			b.set_meta("bob", float(i))
			_live.append(b)
			var mid: String = ms.id
			var kind := String(rw.kind)
			_btn(n, Rect2(-w * 0.5, -ch * 0.5, w, ch), func(): _claim_mil(mid, kind, n))
		else:
			_lock(n, Vector2(w * 0.5 - 34, 0), 1.2)
		y += ch + gap
	return y + 10

## mini kahraman kartı: nadirlik renginde çerçeve, yuvarlatılmış portre, alt ad şeridi, ×adet madalyonu
func _hero_card(id: String, amount: int) -> Node2D:
	var C: Dictionary = D.CHARACTERS.get(id, {})
	var rar := clampi(int(C.get("rarity", 1)), 1, 4)
	var rc := Color(HUD.RAR_RM[rar])
	var cw := 54.0
	var chh := 72.0
	var c := Node2D.new()
	var fr := Node2D.new()
	fr.draw.connect(func():
		var r := Rect2(-cw * 0.5, -chh * 0.5, cw, chh)
		fr.draw_style_box(ComicSkin.sb(INK, 8), Rect2(r.position + Vector2(3, 4), r.size))
		fr.draw_style_box(ComicSkin.sb(rc, 8, 3.0, INK), r)
		fr.draw_style_box(ComicSkin.sb(rc.lightened(0.35), 6), Rect2(r.position + Vector2(3, 3), Vector2(cw - 6, 3))))
	c.add_child(fr)
	var ht: Texture2D = UITex.get_tex("res://assets/ui/art/herocard/" + id + ".png")
	if ht:
		var img := UIK.round_image(ht, cw - 8, chh - 20, 5, Vector2(0.5, 0.12))
		img.position = Vector2(-cw * 0.5 + 4, -chh * 0.5 + 4)
		c.add_child(img)
	var strip := Node2D.new()
	strip.draw.connect(func():
		var r := Rect2(-cw * 0.5 + 4, chh * 0.5 - 16, cw - 8, 12)
		strip.draw_style_box(ComicSkin.sb(INK, 3), r))
	c.add_child(strip)
	var nm := _txt(c, str(C.get("name", "")), 10, Color.WHITE, "", Vector2(-cw * 0.5 + 4, chh * 0.5 - 18), cw - 8)
	nm.align = 0.5
	var bd := Node2D.new()
	bd.position = Vector2(cw * 0.5 - 2, -chh * 0.5 + 4)
	bd.draw.connect(func(): ScrCeremony._medal(bd, Vector2.ZERO, 12, Color("#e8322c"), 2.5))
	c.add_child(bd)
	_txt(bd, "×" + str(amount), 14, Color.WHITE, UIK.ink_stroke(1.2, 1.4), Vector2(-14, -11), 28).align = 0.5
	return c

func _claim_mil(id: String, kind: String, n: Node2D) -> void:
	if not g.claim_milestone(id): return
	_celebrate(n, "rubies" if kind == "rubies" else kind)
	_rebuild_later()

# ═════════════ ZİRVE ═════════════

func _zirve(y: float) -> float:
	var mpw: int = D.MISSIONS_PER_WORLD
	var nw: int = D.WORLDS.size()
	var T: Dictionary = SideModes.tower_book(g.meta)
	var k: int = int(T.cur)
	var t_open: bool = int(g.progress.get(1, 0)) >= mpw
	var h := 412.0
	var pn := _poster(y, h, Color("#1c0d26"), Vector2(84, 170), Color(0.7, 0.4, 1.0, 0.12), 0.05)
	_tower(pn, k, nw, mpw)
	var info_x := 204.0
	var Fk: Dictionary = SideModes.floor_def(k, nw, mpw)
	var wk: Dictionary = D.WORLDS[clampi(int(Fk.w), 1, nw) - 1]
	_small(pn, "ŞU ANKİ KAT", 12, Color(0.85, 0.75, 1, 0.85), Vector2(info_x, 40), 140)
	_txt(pn, str(k), 56, YEL, UIK.ink_stroke(3.0, 4.0), Vector2(info_x, 52), 140)
	_wrap(pn, str(wk.name) + (" · BOSS KATI" if Fk.boss else ""), 15, Color.WHITE, Vector2(info_x, 122), 140, UIK.ink_stroke(1.2, 1.6))
	_small(pn, "EN YÜKSEK  " + str(int(T.get("best", 0))), 12, Color(1, 1, 1, 0.8), Vector2(info_x, 172), 160)
	_small(pn, "KAT BAŞI  " + JS.s(SideModes.tower_floor_gold(k)) + " ALTIN", 12, Color(1, 0.85, 0.5, 0.9), Vector2(info_x, 192), 160)
	var nm := int(ceil(k / 10.0)) * 10
	var ms := Node2D.new()
	ms.position = Vector2(info_x, 218)
	ms.draw.connect(func():
		ms.draw_style_box(ComicSkin.sb(INK, 8), Rect2(2, 3, 140, 30))
		ms.draw_style_box(ComicSkin.sb(Color("#4a1a6a"), 8, 2.5, Color("#a85cff")), Rect2(0, 0, 140, 30)))
	pn.add_child(ms)
	_icon(ms, load("res://assets/fx/currency/gem.png"), 22, Vector2(18, 15))
	_txt(ms, "KAT " + str(nm) + " · +" + str(10 + nm), 16, Color.WHITE, "", Vector2(32, 4), 120)
	_anim_in[ms] = 0.4
	if t_open:
		_cta(pn, Vector2((_W.x - 32) * 0.5, h - 38), _W.x - 80, 54, "TIRMAN!", Color("#ff8a2a"), Color("#ffc21a"), func():
			g.audio.play("cta")
			_close_now()
			g.start_tower(), true, 28).set_meta("bob", 0.0)
	else:
		_cta(pn, Vector2((_W.x - 32) * 0.5, h - 38), _W.x - 80, 54, "DÜNYA 1'İ BİTİR", Color("#4a3a40"), Color("#4a3a40"), null, false, 22)
	y += h + 24
	# kâbus döngüsü
	var N: Dictionary = SideModes.nm_book(g.meta)
	var n_open: bool = SideModes.nm_open(g.progress, nw, mpw)
	_ribbon(y, "KÂBUS DÖNGÜSÜ", "ALTIN ×2", 0.3, Color("#ff7a8a"))
	y += 50
	var ch := 150.0
	var kp := _poster(y, ch, Color("#2a0610"), Vector2(60, 60), Color(1, 0.2, 0.3, 0.12), 0.35)
	_hero_art(kp, load("res://assets/ui/art/icon/skull.png"), 62, Vector2(60, 58), Color(1, 0.15, 0.3, 0.6), Color("#ffb0b8"))
	var w: int = int(N.get("w", 1))
	var m: int = int(N.get("m", 1))
	var wd: Dictionary = D.WORLDS[clampi(w, 1, nw) - 1]
	_txt(kp, ("DÜNYA " + str(w) + " · GÖREV " + str(m)) if n_open else "KİLİTLİ", 22, Color.WHITE, UIK.ink_stroke(1.8, 2.4), Vector2(112, 14), 230)
	_wrap(kp, (str(wd.name) + " gece yüzüyle · her elit iki özellik") if n_open else "On dünyayı bitir, aynı haritalar gece yüzüyle çok daha sert döner.", 13, Color(1, 0.85, 0.85, 0.85), Vector2(113, 44), 230)
	if n_open:
		_cta(kp, Vector2((_W.x - 32) * 0.5, ch - 30), _W.x - 96, 44, "GİR", Color("#c0182c"), Color("#ff3b4e"), func():
			g.audio.play("cta")
			_close_now()
			g.start_nightmare(), true, 24)
	else:
		_cta(kp, Vector2((_W.x - 32) * 0.5, ch - 30), _W.x - 96, 44, "DÜNYA 10'U BİTİR", Color("#4a3a40"), Color("#4a3a40"), null, false, 20)
	return y + ch + 16

## çizgi roman kule: kayalık zemin, beş kat bandı (aşağı doğru genişler), kemerli pencereler,
## kat başına kornişler, mazgallı tepe, sivri kızıl çatı ve dalgalanan bayrak. Şimdiki katın
## penceresi yanar ve kat kızıl nabız atar; boss katının penceresi kızıl, içinde kafatası.
func _tower(pn: Node2D, k: int, nw: int, mpw: int) -> void:
	var tx := 84.0
	var y0 := 108.0
	var fh := 40.0
	var base := int(floor((k - 1) / 5.0)) * 5
	var floors: Array = []
	for j in 5:
		var f := base + 5 - j
		var F: Dictionary = SideModes.floor_def(f, nw, mpw)
		var wd: Dictionary = D.WORLDS[clampi(int(F.w), 1, nw) - 1]
		floors.append({"f": f, "boss": bool(F.boss), "st": "done" if f < k else ("cur" if f == k else "up"), "wc": JS.col(wd.color)})
	var hw := func(y: float) -> float: return 50.0 + (y - y0) / (fh * 5.0) * 16.0
	var tw := Node2D.new()
	tw.draw.connect(func():
		var X := func(x: float, y: float) -> Vector2: return Vector2(tx + x, y)
		var yb := y0 + fh * 5.0
		# kayalık zemin
		var rock := PackedVector2Array([X.call(-84, yb + 22), X.call(-62, yb + 4), X.call(-20, yb - 2), X.call(40, yb), X.call(78, yb + 10), X.call(88, yb + 26), X.call(-88, yb + 30)])
		ComicArt.shape(tw, rock, Color("#33233a"), 4.0, Vector2(3, 4))
		ComicArt.shade_right(tw, rock, tx + 20, Color("#251a2c"))
		# katlar
		for j in 5:
			var F: Dictionary = floors[j]
			var ya := y0 + j * fh
			var yb2 := ya + fh
			var a0: float = hw.call(ya)
			var a1: float = hw.call(yb2)
			var band := PackedVector2Array([X.call(-a0, ya), X.call(a0, ya), X.call(a1, yb2), X.call(-a1, yb2)])
			var st: String = F.st
			var stone := Color("#6a5878")
			if st == "done": stone = Color("#3e3448")
			elif st == "cur": stone = Color("#8a5a6a")
			elif F.boss: stone = Color("#6a2430")
			else: stone = stone.lerp((F.wc as Color).darkened(0.3), 0.25)
			if st == "cur":
				var q := fmod(_t, 1.2) / 1.2
				var glow := PackedVector2Array()
				for p in band: glow.append(Vector2(tx, ya + fh * 0.5) + (p - Vector2(tx, ya + fh * 0.5)) * (1.0 + 0.12 + q * 0.18))
				tw.draw_colored_polygon(glow, Color(RED, 0.35 * (1.0 - q)))
			ComicArt.shape(tw, band, stone, 4.0, Vector2(3, 4))
			ComicArt.shade_right(tw, band, tx + 14, stone.darkened(0.28))
			# tuğlalar
			for r in 2:
				var yy := ya + 14.0 + r * 14.0
				var ww: float = hw.call(yy)
				tw.draw_line(X.call(-ww + 3, yy), X.call(ww - 3, yy), Color(0, 0, 0, 0.3), 2.0)
				var bx := -ww + 10.0 + (0.0 if (j + r) % 2 == 0 else 9.0)
				while bx < ww - 6.0:
					tw.draw_line(X.call(bx, yy - 14 if r == 0 else yy - 14), X.call(bx, yy), Color(0, 0, 0, 0.22), 2.0)
					bx += 18.0
			# kemerli pencere
			var wx := 22.0
			var wy := ya + 11.0
			var win := PackedVector2Array([X.call(wx - 8, wy + 22), X.call(wx - 8, wy + 8)])
			for i in 11:
				var an := PI + i * PI / 10.0
				win.append(X.call(wx + cos(an) * 8.0, wy + 8 + sin(an) * 8.0))
			win.append(X.call(wx + 8, wy + 22))
			var wcol := Color("#1a1022")
			if st == "cur": wcol = Color(1.0, 0.8 * (0.85 + 0.15 * sin(_t * 9.0)), 0.3)
			elif F.boss: wcol = Color("#ff3b4e") if st != "done" else Color("#5a1a22")
			elif st == "up": wcol = Color("#2a1e3a")
			ComicArt.shape(tw, win, wcol, 3.0, Vector2.ZERO)
			# korniş (kat ayırıcı çıkıntı)
			var cw: float = a1 + 6.0
			var cor := PackedVector2Array([X.call(-cw, yb2 - 3), X.call(cw, yb2 - 3), X.call(cw, yb2 + 4), X.call(-cw, yb2 + 4)])
			ComicArt.shape(tw, cor, Color("#4e405c") if st != "cur" else Color("#a0707e"), 3.0, Vector2(2, 3))
		# mazgallı tepe
		var tw0: float = hw.call(y0) + 4.0
		var bt := PackedVector2Array([X.call(-tw0, y0 + 2), X.call(tw0, y0 + 2), X.call(tw0, y0 - 16), X.call(tw0 - 14, y0 - 16), X.call(tw0 - 14, y0 - 9), X.call(10, y0 - 9), X.call(10, y0 - 16), X.call(-10, y0 - 16), X.call(-10, y0 - 9), X.call(-tw0 + 14, y0 - 9), X.call(-tw0 + 14, y0 - 16), X.call(-tw0, y0 - 16)])
		ComicArt.shape(tw, bt, Color("#5c4a6c"), 4.0, Vector2(3, 4))
		ComicArt.shade_right(tw, bt, tx + 14, Color("#43354f"))
		# sivri çatı
		var roof := PackedVector2Array([X.call(-tw0 + 6, y0 - 16), X.call(0, y0 - 84), X.call(tw0 - 6, y0 - 16)])
		ComicArt.shape(tw, roof, Color("#d02a34"), 4.0, Vector2(3, 4))
		ComicArt.shade_right(tw, roof, tx + 1, Color("#8e1420"))
		for i in 3:
			var yy := y0 - 30.0 - i * 16.0
			var ww := (yy - (y0 - 84.0)) / 68.0 * (tw0 - 6.0)
			tw.draw_line(X.call(-ww + 4, yy), X.call(ww - 4, yy), Color(0, 0, 0, 0.25), 2.0)
		# bayrak
		var top: Vector2 = X.call(0, y0 - 84)
		tw.draw_line(top, top + Vector2(0, -24), INK, 3.5, true)
		var fl := PackedVector2Array()
		for i in 7:
			var u := i / 6.0
			fl.append(top + Vector2(2 + u * 28, -24 + sin(_t * 5.0 + u * 3.0) * 3.0 * u))
		for i in range(6, -1, -1):
			var u := i / 6.0
			fl.append(top + Vector2(2 + u * 28, -12 + sin(_t * 5.0 + u * 3.0) * 3.0 * u - u * 4.0))
		ComicArt.shape(tw, fl, YEL, 3.0, Vector2(2, 3))
		# sol kenar ışığı
		tw.draw_line(X.call(-46, y0 + 4), X.call(-62, yb - 4), Color(1, 1, 1, 0.16), 3.0, true))
	pn.add_child(tw)
	_live.append(tw)
	_anim_in[tw] = 0.12
	tw.position = Vector2.ZERO
	# kat numaraları, boss kafatası, tik ve SEN etiketi
	for j in 5:
		var F: Dictionary = floors[j]
		var ya := y0 + j * fh
		var a0: float = hw.call(ya + fh * 0.5)
		var st: String = F.st
		_txt(pn, str(int(F.f)), 22, Color.WHITE if st != "done" else Color(1, 1, 1, 0.45), UIK.ink_stroke(1.6, 2.0), Vector2(tx - a0 + 8, ya + 6), 44)
		if F.boss: _icon(pn, load("res://assets/ui/art/icon/skull.png"), 13, Vector2(tx + 22, ya + 26), Color(0.1, 0.02, 0.04, 0.9))
		elif st == "done": _check(pn, Vector2(tx - 2, ya + 22), 0.75)
		if st == "cur":
			var tag := Node2D.new()
			tag.position = Vector2(tx + hw.call(ya + fh * 0.5) + 10, ya + fh * 0.5 + 2)
			tag.draw.connect(func():
				tag.draw_colored_polygon(PackedVector2Array([Vector2(-2, 0), Vector2(10, -11), Vector2(10, 11)]), INK)
				tag.draw_style_box(ComicSkin.sb(INK, 6), Rect2(10, -10, 44, 26))
				tag.draw_style_box(ComicSkin.sb(YEL, 6, 3.0), Rect2(8, -13, 44, 26)))
			pn.add_child(tag)
			_txt(tag, "SEN", 16, INK, "", Vector2(8, -11), 44).align = 0.5
			tag.set_meta("bob", 0.0)
			_live.append(tag)

func _tick(dt: float) -> void:
	if _road and _road_fill < _road_to:
		_road_fill = minf(_road_to, _road_fill + maxf(160.0, _road_to * 1.4) * dt) if _t > 0.4 else 0.0
