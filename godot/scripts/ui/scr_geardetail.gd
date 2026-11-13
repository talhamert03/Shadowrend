class_name ScrGearDetail
extends Scr
## Eşya ekranı (v3 — elle çizilen premium). İki mod:
##   "info"  — İNCELE: nadirlik vitrini, ad, statlar (kuşanılana göre ▲/▼), anlatı, YÜKSELT
##             (kart + altın), alt sıra KULLAN/ÇIKAR · GELİŞTİR
##   "forge" — GELİŞTİR (+ basma ocağı): örs + ocak ateşi, yay üzerinde +1..+7 basamakları,
##             şu an / sonraki bonus, başarı şansı çubuğu, yanma riski, çekiç vuruşlu animasyon
## Yazı: ana menüyle aynı — başlık/düğme Bangers + mürekkep kontur, gövde Chakra Petch.

const RCOL := {1: Color("#a3abbd"), 2: Color("#d8915a"), 5: Color("#4ea6ff"), 3: Color("#b07cff"), 4: Color("#ffb23e")}
const RNAME := {1: "SIRADAN", 2: "YAYGIN", 5: "NADİR", 3: "EPİK", 4: "EFSANEVİ"}
const GOLD := Color("#ffd27a")
const INK := Color(0.05, 0.03, 0.07)
const PANEL := Color("#171019")
const PANEL2 := Color("#221725")
const DIM := Color("#a89b8f")
const GOOD := Color("#7ee08a")
const BAD := Color("#ff6f62")
const FORGE := Color("#ff8a2a")
const MOD_ICON := {"dmgPct": "guc", "atkPct": "hancer", "maxHp": "kalp", "armor": "kalkan", "speedPct": "cizme",
	"regen": "heal", "lifeSteal": "kadeh", "critChance": "eye", "critMult": "bicak", "dodge": "el", "luck": "coin"}
const STRIKES := [0.28, 0.6, 0.92]
const RESOLVE := 1.08
const ANIM_END := 2.3

var id := ""
var mode := "info"
var cv: Node2D
var _hits: Array = []
var _t0 := 0.0
var _downPos := Vector2.ZERO
var _tick: Tween
var _cardR := Rect2()
# dövme animasyonu
var _anim := {}            # {res, from, to, t0, strikes:int, resolved:bool}
var _parts: Array = []     # {p, v, life, max, r, c, g(rav), k}
var _lastT := 0.0
var _itemC := Vector2.ZERO

func _init(game) -> void:
	super(game)
	name = "GearDetail"
	cv = Node2D.new()
	add_child(cv)
	cv.draw.connect(_paint)

func open(gid: String, m := "") -> void:
	id = gid
	mode = m if m != "" else "info"
	_anim = {}
	_parts.clear()
	_t0 = _now()
	_lastT = _t0
	visible = true
	fade_show()
	g.audio.play("panel")
	if _tick and _tick.is_valid(): _tick.kill()
	_tick = create_tween().set_loops()
	_tick.tween_callback(func(): if visible: cv.queue_redraw()).set_delay(0.016)
	cv.queue_redraw()

func _now() -> float: return Time.get_ticks_msec() / 1000.0

# ───────────────────────── yazı & kutu ─────────────────────────
## ana menü yazısı: Bangers (çizgi roman başlık) + mürekkep kontur + alt gölge
func _bang(p: Vector2, s: String, sz: int, col: Color, w := 0.0, al := HORIZONTAL_ALIGNMENT_LEFT, stroke := 3, drop := 3.0) -> void:
	var f := UIK.font(false, 1000)
	var ww := w if w > 0 else -1.0
	var ink := Color(INK, col.a)
	if drop > 0: cv.draw_string_outline(f, p + Vector2(0, drop), s, al, ww, sz, stroke, ink)
	if drop > 0: cv.draw_string(f, p + Vector2(0, drop), s, al, ww, sz, ink)
	if stroke > 0: cv.draw_string_outline(f, p, s, al, ww, sz, stroke, ink)
	cv.draw_string(f, p, s, al, ww, sz, col)

func _bw(s: String, sz: int) -> float:
	return UIK.font(false, 1000).get_string_size(s, HORIZONTAL_ALIGNMENT_LEFT, -1, sz).x

## gövde yazısı (Chakra Petch)
func _txt(p: Vector2, s: String, sz: int, col: Color, w := 0.0, al := HORIZONTAL_ALIGNMENT_LEFT, wt := 600) -> void:
	cv.draw_string(UIK.font(false, wt), p, s, al, w if w > 0 else -1.0, sz, col)

func _box(r: Rect2, c: Color, rad := 14.0, bw := 0.0, bc := INK) -> void:
	cv.draw_style_box(ComicSkin.sb(c, rad, bw, bc), r)

func _shade(r: Rect2, top: Color, bot: Color, rad := 14.0) -> void:
	_box(r, top, rad)
	var n := 12
	for i in n:
		var a := float(i) / n
		var c := bot
		c.a = a * 0.16
		cv.draw_rect(Rect2(r.position.x + rad * 0.35, r.position.y + r.size.y * (0.3 + 0.7 * a), r.size.x - rad * 0.7, r.size.y * 0.7 / n + 1.0), c)

func _gemi(c: Vector2, k := 1.0) -> void:
	var o := PackedVector2Array([c + Vector2(0, -9) * k, c + Vector2(8, -2) * k, c + Vector2(0, 9) * k, c + Vector2(-8, -2) * k])
	cv.draw_colored_polygon(o, INK)
	cv.draw_colored_polygon(PackedVector2Array([c + Vector2(0, -7) * k, c + Vector2(6, -2) * k, c + Vector2(0, 7) * k, c + Vector2(-6, -2) * k]), Color("#a46bff"))
	cv.draw_colored_polygon(PackedVector2Array([c + Vector2(0, -7) * k, c + Vector2(6, -2) * k, c + Vector2(0, -1) * k, c + Vector2(-6, -2) * k]), Color("#d8c2ff"))

func _coin(c: Vector2, k := 1.0) -> void:
	cv.draw_circle(c, 8.0 * k, INK)
	cv.draw_circle(c, 6.6 * k, Color("#e7a62c"))
	cv.draw_circle(c + Vector2(-1, -1) * k, 4.2 * k, Color("#ffd86a"))

func _icon(name_: String, c: Vector2, sz: float, mod := Color.WHITE) -> void:
	var p := "res://assets/ui/art/icon/" + name_ + ".png"
	if not ResourceLoader.exists(p): p = "res://assets/ui/art/icon/guc.png"
	if not ResourceLoader.exists(p): return
	var t: Texture2D = UITex.get_tex(p)
	var k := sz / maxf(t.get_width(), t.get_height())
	var s := Vector2(t.get_width(), t.get_height()) * k
	cv.draw_texture_rect(t, Rect2(c - s * 0.5, s), false, mod)

## çizgi roman düğmesi: mürekkep gölge + gövde + üst parıltı + kayan ışık; cost>0 → altın simgeli bedel
func _button(r: Rect2, label: String, col: Color, enabled: bool, cb: Callable, cost := -1, lsz := 26, gem := false) -> void:
	var c := col if enabled else Color("#4a4048")
	_box(Rect2(r.position + Vector2(0, 5), r.size), INK, 16)
	_box(r, c.darkened(0.28), 16, 3.0, INK)
	_box(Rect2(r.position + Vector2(3, 3), Vector2(r.size.x - 6, r.size.y * 0.52)), c.lightened(0.06), 13)
	if enabled:
		var ph := fmod(_now() * 0.55, 1.7)
		if ph < 1.0:
			var x := r.position.x + 20 + (r.size.x - 40) * ph
			cv.draw_colored_polygon(PackedVector2Array([Vector2(x - 10, r.position.y + 5), Vector2(x + 8, r.position.y + 5),
				Vector2(x - 4, r.end.y - 5), Vector2(x - 22, r.end.y - 5)]), Color(1, 1, 1, 0.15))
	var tc := Color.WHITE if enabled else Color("#b0a7ad")
	if cost < 0:
		_bang(Vector2(r.position.x, r.get_center().y + lsz * 0.36), label, lsz, tc, r.size.x, HORIZONTAL_ALIGNMENT_CENTER)
	else:
		var cs := JS.s(cost)
		var lw := _bw(label, lsz)
		var cw := _bw(cs, lsz - 6)
		var tot := lw + 16 + 20 + cw
		var x0 := r.get_center().x - tot * 0.5
		var by := r.get_center().y + lsz * 0.36
		_bang(Vector2(x0, by), label, lsz, tc)
		if gem: _gemi(Vector2(x0 + lw + 16 + 8, by - lsz * 0.3))
		else: _coin(Vector2(x0 + lw + 16 + 8, by - lsz * 0.3))
		_bang(Vector2(x0 + lw + 16 + 20, by), cs, lsz - 6, Color("#fff1c9") if enabled else BAD)
	_hits.append({"r": r, "cb": cb})

func _close_btn(c: Vector2) -> void:
	cv.draw_circle(c + Vector2(0, 3), 17, INK)
	cv.draw_circle(c, 16, Color("#e5394a"))
	cv.draw_circle(c, 16, INK, false, 2.5, true)
	cv.draw_line(c + Vector2(-6, -6), c + Vector2(6, 6), Color.WHITE, 3.5, true)
	cv.draw_line(c + Vector2(6, -6), c + Vector2(-6, 6), Color.WHITE, 3.5, true)
	_hits.append({"r": Rect2(c - Vector2(24, 24), Vector2(48, 48)), "cb": func(): g.audio.play("click"); close()})

func _hex(c: Vector2, r: float, col: Color, ink := true) -> void:
	var pts := PackedVector2Array()
	for i in 6: pts.append(c + Vector2(cos(PI / 6 + i * PI / 3), sin(PI / 6 + i * PI / 3)) * r)
	if ink:
		var o := PackedVector2Array()
		for i in 6: o.append(c + Vector2(cos(PI / 6 + i * PI / 3), sin(PI / 6 + i * PI / 3)) * (r + 4))
		cv.draw_colored_polygon(o, INK)
	cv.draw_colored_polygon(pts, col)

func _plus_col(i: int) -> Color:
	return Color("#ffc23e").lerp(Color("#ff5a1e"), clampf(float(i) / 7.0, 0.0, 1.0))

# ───────────────────────── ana çizim ─────────────────────────
func _paint() -> void:
	_hits.clear()
	if id == "": return
	var x = g.gear_by_id(id)
	if x == null: return
	var W := UIK.ui_size(get_viewport())
	var now := _now()
	var dt := clampf(now - _lastT, 0.0, 0.05)
	_lastT = now
	cv.draw_rect(Rect2(Vector2.ZERO, W), Color(0.01, 0.0, 0.02, 0.8))
	if mode == "forge" and g.owns_gear(id): _paint_forge(x, W, now - _t0, dt)
	else: _paint_info(x, W, now - _t0)

# ═════════ İNCELE ═════════
func _paint_info(x: Dictionary, W: Vector2, t: float) -> void:
	var owned: bool = g.owns_gear(id)
	var rar := int(x.rarity)
	var rc: Color = RCOL.get(rar, GOLD)
	var lvl: int = g.gear_level(id) if owned else 1
	var plus: int = g.gear_plus(id) if owned else 0
	var cw := minf(W.x - 22.0, 380.0)
	var cx := (W.x - cw) * 0.5
	var stats := _stat_rows(x, owned)
	var cur = _cur_other(x)
	var showH := 226.0
	var titleH := 66.0
	var statH := 10.0 + ceilf(stats.size() / 2.0) * 52.0 + (22.0 if cur else 0.0)
	var loreH := 34.0
	var gsk: Dictionary = HeroSkills.GEAR_SKILLS.get(str(id), {}) if int(x.rarity) == 4 else {}
	if not gsk.is_empty(): loreH += 58.0
	var upH := 156.0 if owned else 0.0
	var actH := 72.0 if owned else 0.0
	var H := showH + titleH + statH + loreH + upH + actH + 12.0
	var top := clampf((W.y - H) * 0.5, 6.0, maxf(6.0, W.y - 8.0 - H))
	var R := Rect2(cx, top, cw, H)
	_cardR = R
	_box(Rect2(R.position + Vector2(0, 8), R.size), Color(0, 0, 0, 0.55), 26)
	_box(R, PANEL, 24, 3.0, INK)
	_box(R.grow(-4), PANEL, 21, 2.0, rc.darkened(0.35))

	# vitrin
	var S := Rect2(R.position + Vector2(10, 10), Vector2(cw - 20, showH - 14))
	_shade(S, rc.darkened(0.64), Color(0.0, 0.0, 0.02), 18)
	var sc := S.get_center() + Vector2(0, -4)
	_itemC = sc
	_halo(sc, rc, t, owned, 1.0)
	_draw_item(x, sc + Vector2(0, sin(t * 1.8) * 5.0), 146.0, owned, Color.WHITE)
	if plus > 0: _plus_aura(sc, plus, t)
	var slotName := str(x.slot)
	for sd in D.EQUIP_SLOTS:
		if sd.id == x.slot: slotName = str(sd.name)
	var chipW := UIK.font(false, 700).get_string_size(slotName, HORIZONTAL_ALIGNMENT_LEFT, -1, 12).x + 22
	_box(Rect2(S.position + Vector2(10, 10), Vector2(chipW, 26)), Color(0, 0, 0, 0.5), 13, 1.5, rc.darkened(0.2))
	_txt(S.position + Vector2(10, 28), slotName, 12, Color("#efe4d4"), chipW, HORIZONTAL_ALIGNMENT_CENTER, 700)
	_close_btn(Vector2(S.end.x - 20, S.position.y + 22))
	if owned:
		var pr := Rect2(Vector2(S.position.x + 12, S.end.y - 38), Vector2(74, 28))
		_box(pr, Color(0, 0, 0, 0.6), 14, 2.0, GOLD.darkened(0.3))
		_bang(Vector2(pr.position.x, pr.position.y + 21), "SV " + str(lvl) + "/" + str(D.GEAR_MAX_LEVEL), 18, GOLD, pr.size.x, HORIZONTAL_ALIGNMENT_CENTER, 2, 1.5)
	if plus > 0:
		var bc := Vector2(S.end.x - 32, S.end.y - 30)
		_hex(bc, 20, _plus_col(plus))
		_bang(Vector2(bc.x - 24, bc.y + 9), "+" + str(plus), 24, Color.WHITE, 48, HORIZONTAL_ALIGNMENT_CENTER, 3, 2)

	# başlık
	var y := R.position.y + showH + 4
	_bang(Vector2(cx, y + 30), str(x.name) if owned else "???", 32, Color.WHITE, cw, HORIZONTAL_ALIGNMENT_CENTER, 4, 3)
	_rarity_line(x, rc, cx, cw, y + 54)
	if owned and g.is_equipped(id):
		var er := Rect2(Vector2(R.end.x - 100, y - 2), Vector2(86, 22))
		_box(er, Color("#1e4a2a"), 11, 1.5, GOOD.darkened(0.2))
		_bang(Vector2(er.position.x, er.position.y + 17), "KUŞANILDI", 15, GOOD, er.size.x, HORIZONTAL_ALIGNMENT_CENTER, 2, 0)

	# statlar
	y = R.position.y + showH + titleH
	if cur:
		_txt(Vector2(cx, y + 12), "Kuşanılana göre: " + str(cur.name), 12, DIM, cw, HORIZONTAL_ALIGNMENT_CENTER)
		y += 22
	_paint_stats(stats, rc, owned, cx, cw, y)
	y = R.position.y + showH + titleH + statH
	_txt(Vector2(cx + 20, y + 20), ("“" + str(x.get("desc", "")) + "”") if owned else "Sandıklardan ve mağazadan elde edilir", 13, Color("#c9bcae") if owned else DIM, cw - 40, HORIZONTAL_ALIGNMENT_CENTER, 500)
	if not gsk.is_empty():
		# efsanevi eşya yeteneği kutusu
		var kc := Color(str(gsk.get("c", "#ffc94a")))
		var kb := Rect2(Vector2(cx + 16, y + 34), Vector2(cw - 32, 50))
		_box(kb, Color(kc.r * 0.18, kc.g * 0.12, kc.b * 0.18, 0.9), 12, 1.5, Color(kc, 0.7))
		var dp := kb.position + Vector2(20, 25)
		cv.draw_colored_polygon(PackedVector2Array([dp + Vector2(0, -9), dp + Vector2(8, 0), dp + Vector2(0, 9), dp + Vector2(-8, 0)]), kc)
		var nm := str(gsk.get("en", gsk.name)) if I18n.lang == "en" else str(gsk.name)
		_bang(Vector2(kb.position.x + 38, kb.position.y + 20), nm.to_upper() + "   ·   " + str(int(gsk.cd)) + " SN", 15, kc.lightened(0.3))
		_txt(Vector2(kb.position.x + 38, kb.position.y + 40), str(gsk.get("desc", "")), 12, Color(1, 1, 1, 0.75), kb.size.x - 46)
	if not owned: return
	y += loreH

	# YÜKSELT bölümü
	var b := Rect2(Vector2(cx + 16, y), Vector2(cw - 32, upH - 10))
	_box(b, Color(0, 0, 0, 0.32), 16, 1.5, Color(1, 1, 1, 0.06))
	var need = g.cards_for_next_gear(id)
	var gl := D.gearLevelMods(lvl)
	if need == null:
		_bang(Vector2(b.position.x, b.position.y + 62), "AZAMİ SEVİYE", 34, GOLD, b.size.x, HORIZONTAL_ALIGNMENT_CENTER)
		_txt(Vector2(b.position.x, b.position.y + 92), "Gücünü artırmaya GELİŞTİR ile devam et", 13, DIM, b.size.x, HORIZONTAL_ALIGNMENT_CENTER)
	else:
		var nx := D.gearLevelMods(lvl + 1)
		_bang(Vector2(b.position.x + 16, b.position.y + 32), "YÜKSELT", 24, Color.WHITE)
		_txt(Vector2(b.position.x, b.position.y + 28), "SV " + str(lvl) + " → SV " + str(lvl + 1) + "   ·   statlar +%" + str(int(round((nx / gl - 1.0) * 100))), 12, GOOD, b.size.x - 16, HORIZONTAL_ALIGNMENT_RIGHT, 700)
		var cards: int = g.gear_card_count(id)
		var f := clampf(float(cards) / maxf(1.0, float(need)), 0.0, 1.0)
		var br := Rect2(b.position + Vector2(16, 44), Vector2(b.size.x - 32, 24))
		_box(br, Color(0, 0, 0, 0.6), 12, 2.0, INK)
		if f > 0.0:
			var fc := GOOD if f >= 1.0 else Color("#4ea6ff")
			_box(Rect2(br.position + Vector2(2, 2), Vector2(maxf(20.0, (br.size.x - 4) * f), br.size.y - 4)), fc, 10)
			_box(Rect2(br.position + Vector2(5, 3), Vector2(maxf(14.0, (br.size.x - 10) * f), 6)), Color(1, 1, 1, 0.28), 5)
		_bang(Vector2(br.position.x, br.position.y + 19), str(cards) + " / " + str(int(need)) + " KART", 17, Color.WHITE, br.size.x, HORIZONTAL_ALIGNMENT_CENTER, 3, 0)
		_button(Rect2(b.position + Vector2(16, 80), Vector2(b.size.x - 32, 54)), "YÜKSELT", GOOD.darkened(0.15), g.can_upgrade_gear(id), func(): _upgrade(), int(g.gold_for_next_gear(id)))

	# alt sıra: KULLAN/ÇIKAR · GELİŞTİR
	var ay := b.end.y + 12
	var hw := (cw - 32 - 10) * 0.5
	var lr := Rect2(Vector2(cx + 16, ay), Vector2(hw, 52))
	var rr := Rect2(Vector2(cx + 16 + hw + 10, ay), Vector2(hw, 52))
	if g.is_equipped(id): _button(lr, "ÇIKAR", Color("#6a5468"), true, func(): _toggle())
	elif g.can_wear(id): _button(lr, "KULLAN", Color("#e8b73a"), true, func(): _toggle())
	else: _button(lr, "KUŞANAMAZ", Color("#4a4048"), false, func(): g.audio.play("error"), -1, 20)
	_button(rr, "GELİŞTİR", FORGE, true, func(): _go_forge())
	if plus > 0:
		var hc := Vector2(rr.end.x - 10, rr.position.y + 4)
		_hex(hc, 13, _plus_col(plus))
		_bang(Vector2(hc.x - 16, hc.y + 6), "+" + str(plus), 16, Color.WHITE, 32, HORIZONTAL_ALIGNMENT_CENTER, 2, 0)

func _rarity_line(x: Dictionary, rc: Color, cx: float, cw: float, ry: float) -> void:
	var rn: String = RNAME.get(int(x.rarity), "")
	var rfont := UIK.font(false, 700, 3.0)
	var rw := rfont.get_string_size(rn, HORIZONTAL_ALIGNMENT_LEFT, -1, 12).x
	var mid := cx + cw * 0.5
	cv.draw_line(Vector2(mid - rw * 0.5 - 50, ry - 5), Vector2(mid - rw * 0.5 - 12, ry - 5), rc, 2.0, true)
	cv.draw_line(Vector2(mid + rw * 0.5 + 12, ry - 5), Vector2(mid + rw * 0.5 + 50, ry - 5), rc, 2.0, true)
	for sx in [-1.0, 1.0]:
		var dp := Vector2(mid + sx * (rw * 0.5 + 8), ry - 5)
		cv.draw_colored_polygon(PackedVector2Array([dp + Vector2(0, -4), dp + Vector2(4, 0), dp + Vector2(0, 4), dp + Vector2(-4, 0)]), rc)
	cv.draw_string(rfont, Vector2(cx, ry), rn, HORIZONTAL_ALIGNMENT_CENTER, cw, 12, rc)

func _paint_stats(stats: Array, rc: Color, owned: bool, cx: float, cw: float, y: float) -> void:
	var colW := (cw - 32 - 8) * 0.5
	for i in stats.size():
		var st: Dictionary = stats[i]
		var rr := Rect2(Vector2(cx + 16 + (i % 2) * (colW + 8), y + 6 + (i / 2) * 52), Vector2(colW, 46))
		_box(rr, PANEL2, 12, 1.5, Color(1, 1, 1, 0.07))
		var ic := rr.position + Vector2(22, 23)
		cv.draw_circle(ic, 15, Color(0, 0, 0, 0.45))
		cv.draw_circle(ic, 15, rc.darkened(0.2), false, 1.5, true)
		_icon(MOD_ICON.get(st.k, "guc"), ic, 18, GOOD if st.good else BAD)
		_txt(Vector2(rr.position.x + 42, rr.position.y + 18), st.label, 11, DIM, colW - 46, HORIZONTAL_ALIGNMENT_LEFT, 600)
		_bang(Vector2(rr.position.x + 42, rr.position.y + 40), st.val, 22, Color.WHITE if owned else DIM, 0, HORIZONTAL_ALIGNMENT_LEFT, 3, 0)
		if st.d != "":
			var dc: Color = GOOD if st.dk == "up" else (BAD if st.dk == "down" else DIM)
			_txt(Vector2(rr.position.x, rr.position.y + 38), st.d, 12, dc, colW - 8, HORIZONTAL_ALIGNMENT_RIGHT, 700)

func _halo(sc: Vector2, rc: Color, t: float, owned: bool, k: float) -> void:
	var rays := 14
	for i in rays:
		var a := t * 0.25 + TAU * i / rays
		var a2 := a + TAU / rays * 0.45
		var col := rc
		col.a = (0.07 if owned else 0.03) * k
		cv.draw_colored_polygon(PackedVector2Array([sc, sc + Vector2(cos(a), sin(a)) * 190.0, sc + Vector2(cos(a2), sin(a2)) * 190.0]), col)
	for i in 6:
		var c := rc
		c.a = (0.05 + 0.02 * i) * k
		cv.draw_circle(sc, 92.0 - i * 11.0, c)
	var ringC := rc.lightened(0.2)
	ringC.a = 0.55 * k
	cv.draw_arc(sc, 82, 0, TAU, 64, ringC, 2.0, true)
	for i in 12:
		var a := -t * 0.4 + TAU * i / 12.0
		var p := sc + Vector2(cos(a), sin(a)) * 82.0
		cv.draw_colored_polygon(PackedVector2Array([p + Vector2(0, -5), p + Vector2(4, 0), p + Vector2(0, 5), p + Vector2(-4, 0)]), ringC)

func _plus_aura(sc: Vector2, plus: int, t: float) -> void:
	for i in plus:
		var a := t * (1.2 + i * 0.13) + TAU * i / plus
		var p := sc + Vector2(cos(a), sin(a) * 0.55) * (60.0 + 4.0 * sin(t * 2.0 + i))
		cv.draw_circle(p, 3.0 + plus * 0.25, Color(1.0, 0.75, 0.35, 0.8))

func _draw_item(x: Dictionary, c: Vector2, size: float, owned: bool, mod: Color, rot := 0.0) -> void:
	var art := "res://assets/ui/art/gear/" + str(x.icon) + ".png"
	if not ResourceLoader.exists(art): return
	var tex: Texture2D = UITex.get_tex(art)
	var k := size / maxf(tex.get_width(), tex.get_height())
	var sz := Vector2(tex.get_width(), tex.get_height()) * k
	cv.draw_set_transform(c, rot, Vector2.ONE)
	cv.draw_texture_rect(tex, Rect2(-sz * 0.5 + Vector2(4, 8), sz), false, Color(0, 0, 0, 0.45))
	cv.draw_texture_rect(tex, Rect2(-sz * 0.5, sz), false, mod if owned else Color(0.06, 0.05, 0.08, 1))
	cv.draw_set_transform(Vector2.ZERO, 0.0, Vector2.ONE)
	if not owned: _bang(Vector2(c.x - 40, c.y + 18), "?", 60, Color(1, 1, 1, 0.5), 80, HORIZONTAL_ALIGNMENT_CENTER)

# ═════════ GELİŞTİR (dövme ocağı) ═════════
func _paint_forge(x: Dictionary, W: Vector2, t: float, dt: float) -> void:
	var rc: Color = RCOL.get(int(x.rarity), GOLD)
	var PM: int = g.PLUS_MAX
	var real: int = g.gear_plus(id)
	var at := (_now() - float(_anim.t0)) if _anim.size() else 99.0
	var busy := at < ANIM_END
	# animasyon sürerken gösterilen değer: sonuç anına dek eski seviye
	var shown: int = real
	if busy and at < RESOLVE: shown = int(_anim.from)
	if busy and _anim.res == "burn" and at >= RESOLVE:
		shown = maxi(0, int(_anim.from) - int((at - RESOLVE) / 0.07))
	var cw := minf(W.x - 22.0, 380.0)
	var cx := (W.x - cw) * 0.5
	var H := 660.0
	var top := clampf((W.y - H) * 0.5, 6.0, maxf(6.0, W.y - 8.0 - H))
	var R := Rect2(cx, top, cw, H)
	_cardR = R
	# sarsıntı
	var shake := Vector2.ZERO
	if busy:
		if at < RESOLVE: shake = Vector2(sin(at * 90.0), cos(at * 77.0)) * (at / RESOLVE) * 2.5
		elif at < RESOLVE + 0.35 and _anim.res != "ok": shake = Vector2(sin(at * 110.0), 0) * 7.0 * (1.0 - (at - RESOLVE) / 0.35)
		elif at < RESOLVE + 0.25: shake = Vector2(0, sin(at * 120.0)) * 4.0 * (1.0 - (at - RESOLVE) / 0.25)
	cv.draw_set_transform(shake, 0.0, Vector2.ONE)
	_box(Rect2(R.position + Vector2(0, 8), R.size), Color(0, 0, 0, 0.55), 26)
	_box(R, Color("#140c10"), 24, 3.0, INK)
	_box(R.grow(-4), Color("#140c10"), 21, 2.0, FORGE.darkened(0.45))
	# başlık şeridi
	var hb := Rect2(R.position + Vector2(10, 10), Vector2(cw - 20, 48))
	_box(hb, Color("#2a1410"), 16, 2.0, INK)
	_box(Rect2(hb.position + Vector2(3, 3), Vector2(hb.size.x - 6, 18)), Color(1, 0.6, 0.3, 0.08), 12)
	_bang(Vector2(hb.position.x, hb.position.y + 35), "GELİŞTİR", 32, Color("#ffcf7a"), hb.size.x, HORIZONTAL_ALIGNMENT_CENTER, 4, 3)
	# geri
	var bk := Vector2(hb.position.x + 24, hb.get_center().y)
	cv.draw_circle(bk + Vector2(0, 3), 16, INK)
	cv.draw_circle(bk, 15, Color("#3a2a33"))
	cv.draw_circle(bk, 15, INK, false, 2.5, true)
	cv.draw_polyline(PackedVector2Array([bk + Vector2(4, -7), bk + Vector2(-4, 0), bk + Vector2(4, 7)]), Color.WHITE, 3.5, true)
	if not busy: _hits.append({"r": Rect2(bk - Vector2(24, 24), Vector2(48, 48)), "cb": func(): g.audio.play("click"); mode = "info"})
	if not busy: _close_btn(Vector2(hb.end.x - 24, hb.get_center().y))

	# ── ocak sahnesi ──
	var S := Rect2(Vector2(cx + 10, hb.end.y + 8), Vector2(cw - 20, 300))
	_shade(S, Color("#1d0f0c"), Color("#000000"), 18)
	var fire := 0.75 + 0.25 * sin(t * 3.1) * sin(t * 1.7 + 1.0)
	if busy and at < RESOLVE: fire += at / RESOLVE * 0.8
	# ocak ateşi (alttan yükselen kızıllık)
	for i in 8:
		var c := Color(1.0, 0.42, 0.12, 0.05 * fire)
		cv.draw_circle(Vector2(S.get_center().x, S.end.y + 40), 80.0 + i * 22.0, c)
	var ic := Vector2(S.get_center().x, S.position.y + 150)
	_itemC = ic
	_halo(ic, rc, t, true, 0.7)
	# örs
	var an := Vector2(ic.x, S.end.y - 46)
	var anvil := PackedVector2Array([an + Vector2(-78, -22), an + Vector2(70, -22), an + Vector2(92, -10), an + Vector2(46, -2),
		an + Vector2(30, 10), an + Vector2(42, 34), an + Vector2(-42, 34), an + Vector2(-30, 10), an + Vector2(-56, -2)])
	var ao := PackedVector2Array()
	for p in anvil: ao.append(an + (p - an) * 1.06 + Vector2(0, 2))
	cv.draw_colored_polygon(ao, INK)
	cv.draw_colored_polygon(anvil, Color("#3b3440"))
	cv.draw_colored_polygon(PackedVector2Array([an + Vector2(-78, -22), an + Vector2(70, -22), an + Vector2(92, -10), an + Vector2(-60, -12)]), Color("#5d5464"))
	cv.draw_line(an + Vector2(-70, -21), an + Vector2(66, -21), Color(1, 0.6, 0.3, 0.35 * fire), 2.0, true)
	# +1..+7 yayı
	var arcR := 118.0
	for i in PM:
		var a := PI + PI * (i + 0.5) / PM
		var pc := ic + Vector2(cos(a), sin(a) * 0.92) * arcR + Vector2(0, 8)
		var done := i < shown
		var nxt := i == shown and not busy
		var r := 15.0
		if done:
			var pop := 1.0
			if busy and _anim.res == "ok" and i == int(_anim.to) - 1 and at >= RESOLVE:
				pop = 1.0 + 0.6 * maxf(0.0, 1.0 - (at - RESOLVE) * 4.0)
			_hex(pc, r * pop, _plus_col(i + 1))
			cv.draw_circle(pc + Vector2(-4, -5), 4.0 * pop, Color(1, 1, 1, 0.35))
			_bang(Vector2(pc.x - 18, pc.y + 7), "+" + str(i + 1), 17, Color.WHITE, 36, HORIZONTAL_ALIGNMENT_CENTER, 2, 0)
		else:
			_hex(pc, r, Color("#2a2030"))
			if i + 1 >= g.PLUS_BURN_FROM: cv.draw_arc(pc, r - 2, 0, TAU, 6, Color(1, 0.35, 0.3, 0.5), 1.5, true)
			if nxt:
				var pa := 0.5 + 0.5 * sin(t * 5.0)
				cv.draw_arc(pc, r + 6, 0, TAU, 32, Color(1.0, 0.75, 0.3, 0.35 + 0.55 * pa), 3.0, true)
			_bang(Vector2(pc.x - 18, pc.y + 7), "+" + str(i + 1), 17, DIM, 36, HORIZONTAL_ALIGNMENT_CENTER, 2, 0)
	# eşya: dövülürken yükselir, titrer; çekiçte parlar
	var lift := 0.0
	var flash := 0.0
	if busy and at < RESOLVE:
		lift = -10.0 * (at / RESOLVE)
		for s in STRIKES:
			var d: float = at - float(s)
			if d >= 0.0 and d < 0.18: flash = maxf(flash, 1.0 - d / 0.18)
	var tint := Color.WHITE
	if busy and _anim.res == "burn" and at >= RESOLVE: tint = Color(1, 0.45, 0.35).lerp(Color.WHITE, clampf((at - RESOLVE - 0.6) / 0.8, 0.0, 1.0))
	_draw_item(x, ic + Vector2(0, lift + sin(t * 1.8) * 4.0), 132.0, true, tint)
	if flash > 0.0:
		cv.draw_circle(ic + Vector2(0, lift), 60.0 * flash + 10.0, Color(1, 0.95, 0.8, 0.35 * flash))
	if shown > 0 and not (busy and at < RESOLVE): _plus_aura(ic, shown, t)
	# büyük +N rozeti
	var bc := Vector2(S.end.x - 40, S.position.y + 38)
	_hex(bc, 25, _plus_col(shown) if shown > 0 else Color("#3a2d3a"))
	_bang(Vector2(bc.x - 30, bc.y + 11), "+" + str(shown), 30, Color.WHITE, 60, HORIZONTAL_ALIGNMENT_CENTER, 3, 2)
	_draw_parts(dt)
	_paint_result(at, S)

	# ── bilgi paneli ──
	var y := S.end.y + 12
	var P := Rect2(Vector2(cx + 16, y), Vector2(cw - 32, 128))
	_box(P, Color(0, 0, 0, 0.35), 16, 1.5, Color(1, 1, 1, 0.07))
	_bang(Vector2(P.position.x, P.position.y + 28), str(x.name), 22, Color.WHITE, P.size.x, HORIZONTAL_ALIGNMENT_CENTER, 3, 2)
	if real >= PM and not busy:
		_bang(Vector2(P.position.x, P.position.y + 78), "AZAMİ +7", 40, GOLD, P.size.x, HORIZONTAL_ALIGNMENT_CENTER, 4, 3)
		_txt(Vector2(P.position.x, P.position.y + 104), "Tüm statlar +%" + str(int(round(g.PLUS_BONUS[PM] * 100))) + " · eşya tam güçte", 13, DIM, P.size.x, HORIZONTAL_ALIGNMENT_CENTER)
	else:
		var cur := mini(shown, PM - 1)
		var b0 := int(round(g.PLUS_BONUS[cur] * 100))
		var b1 := int(round(g.PLUS_BONUS[cur + 1] * 100))
		var half := (P.size.x - 24) * 0.5
		_txt(Vector2(P.position.x + 12, P.position.y + 50), "ŞU AN", 11, DIM, half, HORIZONTAL_ALIGNMENT_CENTER, 700)
		_bang(Vector2(P.position.x + 12, P.position.y + 74), "+" + str(cur) + "  ·  %" + str(b0), 22, Color.WHITE, half, HORIZONTAL_ALIGNMENT_CENTER, 3, 0)
		_txt(Vector2(P.position.x + 12 + half, P.position.y + 50), "BAŞARIDA", 11, DIM, half, HORIZONTAL_ALIGNMENT_CENTER, 700)
		_bang(Vector2(P.position.x + 12 + half, P.position.y + 74), "+" + str(cur + 1) + "  ·  %" + str(b1), 22, GOOD, half, HORIZONTAL_ALIGNMENT_CENTER, 3, 0)
		cv.draw_line(Vector2(P.get_center().x, P.position.y + 42), Vector2(P.get_center().x, P.position.y + 80), Color(1, 1, 1, 0.1), 1.0)
		# şans çubuğu
		var ch: float = g.PLUS_CHANCE[cur]
		var chc := GOOD if ch >= 0.8 else (GOLD if ch >= 0.5 else BAD)
		var cb := Rect2(P.position + Vector2(14, 92), Vector2(P.size.x - 28 - 96, 22))
		_box(cb, Color(0, 0, 0, 0.6), 11, 2.0, INK)
		_box(Rect2(cb.position + Vector2(2, 2), Vector2(maxf(18.0, (cb.size.x - 4) * ch), cb.size.y - 4)), chc.darkened(0.1), 9)
		_bang(Vector2(cb.position.x, cb.position.y + 18), "ŞANS %" + str(int(round(ch * 100))), 17, Color.WHITE, cb.size.x, HORIZONTAL_ALIGNMENT_CENTER, 3, 0)
		var burns: bool = cur + 1 >= int(g.PLUS_BURN_FROM)
		var rk := Rect2(Vector2(cb.end.x + 8, cb.position.y), Vector2(88, 22))
		_box(rk, Color("#4a1414") if burns else Color("#163a20"), 11, 1.5, BAD.darkened(0.2) if burns else GOOD.darkened(0.3))
		_bang(Vector2(rk.position.x, rk.position.y + 17), "YANMA RİSKİ" if burns else "GÜVENLİ", 15, BAD if burns else GOOD, rk.size.x, HORIZONTAL_ALIGNMENT_CENTER, 2, 0)
	# düğme
	var br := Rect2(Vector2(cx + 16, P.end.y + 12), Vector2(cw - 32, 62))
	if real >= PM and not busy:
		_button(br, "GERİ", Color("#6a5468"), true, func(): g.audio.play("click"); mode = "info")
	elif busy:
		_button(br, "DÖVÜLÜYOR…", FORGE, false, func(): pass)
	else:
		# iki yol: altınla ya da sabit 10 gem ile (aynı şans ve yanma kuralı)
		var bw := (br.size.x - 10.0) * 0.5
		_button(Rect2(br.position, Vector2(bw, br.size.y)), "GELİŞTİR", FORGE, g.can_plus(id), func(): _plus(false), int(g.plus_cost(id)), 22)
		_button(Rect2(br.position + Vector2(bw + 10.0, 0), Vector2(bw, br.size.y)), "GELİŞTİR", Color("#6a3fd0"), g.can_plus(id, true), func(): _plus(true), int(g.PLUS_GEM), 22, true)
	_txt(Vector2(cx, br.end.y + 22), "+" + str(g.PLUS_BURN_FROM) + " ve üstünde başarısız deneme eşyayı +0'a düşürür", 11, Color(1, 1, 1, 0.45), cw, HORIZONTAL_ALIGNMENT_CENTER, 500)
	cv.draw_set_transform(Vector2.ZERO, 0.0, Vector2.ONE)

func _paint_result(at: float, S: Rect2) -> void:
	if _anim.is_empty(): return
	var res: String = _anim.res
	# çekiç vuruşları: ses + küçük kıvılcım (bir kez)
	for i in STRIKES.size():
		if at >= STRIKES[i] and int(_anim.strikes) <= i:
			_anim.strikes = i + 1
			g.audio.play("block")
			_burst(_itemC + Vector2(randf_range(-20, 20), 10), 10, [Color("#ffd27a"), Color("#ffffff"), Color("#ff9a3a")], 140.0, 260.0, 0.5)
	if at >= RESOLVE and not bool(_anim.resolved):
		_anim.resolved = true
		match res:
			"ok":
				g.audio.play("legendary" if int(_anim.to) >= g.PLUS_MAX else "levelrise")
				_burst(_itemC, 46, [Color("#ffe08a"), Color("#ffb33a"), Color.WHITE], 160.0, 460.0, 1.1)
			"fail":
				g.audio.play("objfail")
				_burst(_itemC, 16, [Color("#8a8088"), Color("#5a5258")], 40.0, 140.0, 1.2, true)
			"burn":
				g.audio.play("firebomb")
				g.audio.play("shieldbreak")
				_burst(_itemC, 40, [Color("#ff5a2a"), Color("#ffa23a"), Color("#3a1a14")], 120.0, 380.0, 1.2)
	if at < RESOLVE:
		# şarj halkası
		var k := at / RESOLVE
		cv.draw_arc(_itemC, 74, -PI * 0.5, -PI * 0.5 + TAU * k, 48, Color(1, 0.8, 0.4, 0.8), 4.0, true)
		if randf() < 0.6: _parts.append({"p": _itemC + Vector2.from_angle(randf() * TAU) * randf_range(110, 150), "v": Vector2.ZERO, "life": 0.0, "max": 0.45, "r": 2.5, "c": Color("#ffcf7a"), "in": true})
		return
	var rt := at - RESOLVE
	if rt > ANIM_END - RESOLVE: return
	var col: Color = {"ok": GOLD, "fail": Color("#c8bdb6"), "burn": Color("#ff5a3a")}[res]
	# patlama halkası + flaş
	if rt < 0.5:
		var rr := 30.0 + rt * 520.0
		var c := col
		c.a = 1.0 - rt / 0.5
		cv.draw_arc(_itemC, rr, 0, TAU, 64, c, 6.0 * (1.0 - rt / 0.5) + 1.0, true)
	if rt < 0.25 and res != "fail":
		var fc := Color(1, 0.95, 0.75) if res == "ok" else Color(1, 0.3, 0.15)
		fc.a = 0.45 * (1.0 - rt / 0.25)
		cv.draw_rect(S, fc)
	if res == "ok":
		for i in 12:
			var a := rt * 0.8 + TAU * i / 12.0
			var c2 := Color(1, 0.85, 0.4, 0.18 * maxf(0.0, 1.0 - rt / 1.1))
			cv.draw_colored_polygon(PackedVector2Array([_itemC, _itemC + Vector2.from_angle(a) * 220.0, _itemC + Vector2.from_angle(a + 0.12) * 220.0]), c2)
	if res == "burn" and rt < 1.1 and randf() < 0.9:
		for j in 2:
			_parts.append({"p": _itemC + Vector2(randf_range(-40, 40), randf_range(0, 40)), "v": Vector2(randf_range(-20, 20), randf_range(-160, -90)),
				"life": 0.0, "max": randf_range(0.5, 0.9), "r": randf_range(4, 8), "c": [Color("#ff6a2a"), Color("#ffb03a"), Color("#ff3a1a")][j % 3], "fire": true})
	# büyük sonuç yazısı
	var txt: String = {"ok": "+" + str(_anim.to) + "!", "fail": "BAŞARISIZ", "burn": "YANDI!"}[res]
	var sc := 1.0 + 0.8 * maxf(0.0, 1.0 - rt * 5.0)
	var al := clampf((ANIM_END - RESOLVE - rt) / 0.4, 0.0, 1.0)
	cv.draw_set_transform(_itemC + Vector2(0, -6 - rt * 10.0), randf_range(-0.02, 0.02) if res != "ok" and rt < 0.3 else 0.0, Vector2.ONE * sc)
	var c3 := col
	c3.a = al
	_bang(Vector2(-160, 22), txt, 60 if res == "ok" else 46, c3, 320, HORIZONTAL_ALIGNMENT_CENTER, 6, 4)
	if res != "ok":
		_bang(Vector2(-160, 54), "+" + str(_anim.from) + " → +" + str(_anim.to), 22, Color(1, 1, 1, al * 0.85), 320, HORIZONTAL_ALIGNMENT_CENTER, 3, 0)
	cv.draw_set_transform(Vector2.ZERO, 0.0, Vector2.ONE)

func _burst(c: Vector2, n: int, pal: Array, v0: float, v1: float, life: float, smoke := false) -> void:
	for i in n:
		var a := randf() * TAU
		var sp := randf_range(v0, v1)
		_parts.append({"p": c, "v": Vector2(cos(a), sin(a) - 0.35) * sp, "life": 0.0, "max": life * randf_range(0.6, 1.0),
			"r": randf_range(6, 12) if smoke else randf_range(2.0, 5.0), "c": pal[i % pal.size()], "smoke": smoke})

func _draw_parts(dt: float) -> void:
	for i in range(_parts.size() - 1, -1, -1):
		var p: Dictionary = _parts[i]
		p.life += dt
		if p.life >= p.max:
			_parts.remove_at(i)
			continue
		var k: float = p.life / p.max
		if p.get("in", false):
			p.p = (p.p as Vector2).lerp(_itemC, minf(1.0, dt * 7.0))
		else:
			p.v = (p.v as Vector2) * (1.0 - dt * (2.5 if p.get("smoke", false) else 0.8))
			if not p.get("fire", false) and not p.get("smoke", false): p.v += Vector2(0, 420.0 * dt)
			p.p += (p.v as Vector2) * dt
		var c: Color = p.c
		c.a = (1.0 - k) * (0.5 if p.get("smoke", false) else 1.0)
		var r: float = p.r * ((1.0 + k * 1.5) if p.get("smoke", false) else (1.0 - k * 0.6))
		if p.get("fire", false) or p.get("smoke", false): cv.draw_circle(p.p, r, c)
		else:
			var vv: Vector2 = p.v
			var tail := vv.normalized() * minf(14.0, vv.length() * 0.03)
			cv.draw_line(p.p - tail, p.p, c, r, true)

# ───────────────────────── veri ─────────────────────────
func _cur_other(x: Dictionary):
	if not g.owns_gear(id): return null
	var cid = g.char_gear_map().get(x.slot)
	if cid and cid != id: return g.gear_by_id(cid)
	return null

func _stat_rows(x: Dictionary, owned: bool) -> Array:
	var mul: float = g.gear_mul(id) if owned else 1.0
	var cur = _cur_other(x)
	var cur_mul: float = g.gear_mul(cur.id) if cur else 1.0
	var keys: Array = (x.get("mods", {}) as Dictionary).keys()
	if cur:
		for k in cur.get("mods", {}):
			if not keys.has(k): keys.append(k)
	var out := []
	for k in keys:
		var has: bool = x.mods.has(k)
		var raw: float = float(x.mods.get(k, 0.0)) * mul
		var flat: bool = str(D.MODS.get(k, {}).get("fmt", "")) == "flat"
		var m := ArmoryPage.fmt_mod(k, roundf(raw) if flat else raw)
		var row := {"k": k, "label": str(m.label), "val": (str(m.val) if has else "—") if owned else "???", "good": raw >= 0, "d": "", "dk": ""}
		if cur and owned:
			var dv: float = raw - float(cur.mods.get(k, 0.0)) * cur_mul
			if absf(dv) >= (0.5 if flat else 0.005):
				row.dk = "up" if dv > 0 else "down"
				row.d = ("▲" if dv > 0 else "▼") + ArmoryPage.fmt_mod(k, roundf(absf(dv)) if flat else absf(dv)).val.replace("+", "")
			else:
				row.dk = "eq"
				row.d = "="
		out.append(row)
	return out

# ───────────────────────── eylemler ─────────────────────────
func _go_forge() -> void:
	g.audio.play("click")
	mode = "forge"
	_anim = {}
	_parts.clear()

func _upgrade() -> void:
	if not g.can_upgrade_gear(id):
		g.audio.play("error")
		if g.cards_for_next_gear(id) != null and g.gear_card_count(id) < int(g.cards_for_next_gear(id)): g.ui.toast("YETERSİZ KART")
		else: g.ui.toast("YETERSİZ ALTIN")
		return
	var lv0: int = g.gear_level(id)
	if not g.upgrade_gear(id, true): return
	g.ui.menu.refresh_wallet()
	var gid := id
	var x: Dictionary = g.gear_by_id(id)
	ScrUpFx.play_gear(g, x, lv0, func():
		if g.ui.menu.pages.has("cephane"): g.ui.menu.pages["cephane"].on_gear_upgraded(gid))

func _plus(gem := false) -> void:
	if g.plus_cost(id) == null: return
	if not g.can_plus(id, gem):
		g.audio.play("error")
		g.ui.toast("YETERSİZ GEM" if gem else "YETERSİZ ALTIN")
		return
	var from: int = g.gear_plus(id)
	var res: String = g.plus_gear(id, gem)
	if res == "": return
	g.audio.play("heartbeat")
	g.ui.menu.refresh_wallet()
	_anim = {"res": res, "from": from, "to": g.gear_plus(id), "t0": _now(), "strikes": 0, "resolved": false}
	_parts.clear()
	if g.ui.menu.pages.has("cephane"): g.ui.menu.pages["cephane"].on_gear_upgraded(id)

func _toggle() -> void:
	g.audio.play("equip")
	g.toggle_equip(id)

# ───────────────────────── dokunma ─────────────────────────
func _input(ev: InputEvent) -> void:
	if not visible: return
	var pos := Vector2.ZERO
	var pressed := false
	if ev is InputEventScreenTouch:
		pos = (ev as InputEventScreenTouch).position
		pressed = (ev as InputEventScreenTouch).pressed
	elif ev is InputEventScreenDrag or ev is InputEventMouse:
		# fare, dokunmaya öykünmeyle zaten ScreenTouch üretir (çift işlem olmasın)
		get_viewport().set_input_as_handled()
		return
	else:
		return
	get_viewport().set_input_as_handled()
	var lp: Vector2 = cv.get_global_transform_with_canvas().affine_inverse() * pos
	if pressed:
		_downPos = lp
		return
	if lp.distance_to(_downPos) > 14.0: return
	# dövme sürerken dokunuş yok
	if not _anim.is_empty() and _now() - float(_anim.t0) < ANIM_END: return
	for i in range(_hits.size() - 1, -1, -1):
		var h: Dictionary = _hits[i]
		if (h.r as Rect2).grow(4).has_point(lp):
			(h.cb as Callable).call()
			cv.queue_redraw()
			return
	if not _cardR.has_point(lp): close()

func close() -> void:
	if not visible: return
	fade_hide(_close_now)

func _close_now() -> void:
	visible = false
	if _tick and _tick.is_valid(): _tick.kill()
	_tick = null
