class_name ScrGearDetail
extends Scr
## Eşya inceleme (v2 — tamamen elle çizilen premium ekran).
## Vitrin (nadirlik ışığı + dönen rün halkası + süzülen çizim + Sv / +N rozetleri),
## başlık, stat satırları (kuşanılana göre ▲/▼), anlatı, iki sekme:
##   SEVİYE  — kart çubuğu + GELİŞTİR (altın)
##   + BASMA — +0..+7 basamakları, başarı şansı, yanma uyarısı, + BAS (altın)
## ve en altta KUŞAN / ÇIKAR. Dokunuşlar kendi isabet kutularıyla (_hits) işlenir.

const RCOL := {1: Color("#a3abbd"), 2: Color("#d8915a"), 5: Color("#4ea6ff"), 3: Color("#b07cff"), 4: Color("#ffb23e")}
const RNAME := {1: "SIRADAN", 2: "YAYGIN", 5: "NADİR", 3: "EPİK", 4: "EFSANEVİ"}
const GOLD := Color("#ffd27a")
const INK := Color(0.04, 0.025, 0.06)
const PANEL := Color("#171019")
const PANEL2 := Color("#221725")
const DIM := Color("#a89b8f")
const GOOD := Color("#7ee08a")
const BAD := Color("#ff6f62")
const MOD_ICON := {"dmgPct": "guc", "atkPct": "hancer", "maxHp": "kalp", "armor": "kalkan", "speedPct": "cizme",
	"regen": "heal", "lifeSteal": "kadeh", "critChance": "eye", "critMult": "bicak", "dodge": "el", "luck": "coin"}

var id := ""
var tab := "lvl"
var cv: Node2D
var _hits: Array = []
var _t0 := 0.0
var _fx := ""
var _fxT := -10.0
var _sparks: Array = []
var _downPos := Vector2.ZERO
var _tick: Tween
var _cardR := Rect2()

func _init(game) -> void:
	super(game)
	name = "GearDetail"
	cv = Node2D.new()
	add_child(cv)
	cv.draw.connect(_paint)

func open(gid: String) -> void:
	if gid != id: tab = "lvl"
	id = gid
	_fx = ""
	_sparks.clear()
	_t0 = Time.get_ticks_msec() / 1000.0
	visible = true
	fade_show()
	g.audio.play("panel")
	if _tick and _tick.is_valid(): _tick.kill()
	_tick = create_tween().set_loops()
	_tick.tween_callback(func(): if visible: cv.queue_redraw()).set_delay(0.033)
	cv.queue_redraw()

func _now() -> float: return Time.get_ticks_msec() / 1000.0

# ───────────────────────── çizim yardımcıları ─────────────────────────
## başlık yazısı: temiz, keskin (Chakra Petch kalın, hafif harf aralığı); serif yalnız eşya adında
func _hf() -> Font: return UIK.font(false, 700, 0.8)
func _serif() -> Font: return UIK.font(true, 700, 0.6)

func _txt(p: Vector2, s: String, sz: int, col: Color, w := 0.0, al := HORIZONTAL_ALIGNMENT_LEFT, disp := false, ol := 0, serif := false) -> void:
	var f := _serif() if serif else (_hf() if disp else UIK.font(false, 600))
	if disp and not serif: sz = int(round(sz * 0.8))
	var ww := w if w > 0 else -1.0
	if ol > 0:
		# ince kontur yerine yumuşak gölge + 2px kontur (kalın mürekkep kalitesiz duruyordu)
		var sh := Color(0, 0, 0, 0.55 * col.a)
		cv.draw_string(f, p + Vector2(0, 2), s, al, ww, sz, sh)
		cv.draw_string_outline(f, p, s, al, ww, sz, 2, Color(INK, 0.85 * col.a))
	cv.draw_string(f, p, s, al, ww, sz, col)

func _box(r: Rect2, c: Color, rad := 14.0, bw := 0.0, bc := INK) -> void:
	cv.draw_style_box(ComicSkin.sb(c, rad, bw, bc), r)

func _grad_box(r: Rect2, top: Color, bot: Color, rad := 14.0) -> void:
	var s := StyleBoxFlat.new()
	s.bg_color = top
	s.set_corner_radius_all(int(rad))
	s.anti_aliasing = true
	cv.draw_style_box(s, r)
	# alt yarıya koyulaşan örtü (dikey degrade hissi)
	var n := 10
	for i in n:
		var a := float(i) / n
		var c := bot
		c.a = a * 0.9 / n * 2.0
		cv.draw_rect(Rect2(r.position.x + rad * 0.3, r.position.y + r.size.y * (0.35 + 0.65 * a), r.size.x - rad * 0.6, r.size.y * 0.65 / n + 1.0), c)

func _button(r: Rect2, label: String, sub: String, col: Color, enabled: bool, cb: Callable, coin := false) -> void:
	var c := col if enabled else Color("#4a4048")
	_box(Rect2(r.position + Vector2(0, 5), r.size), INK, 16)
	_box(r, c.darkened(0.25), 16, 3.0, INK)
	_box(Rect2(r.position + Vector2(3, 3), Vector2(r.size.x - 6, r.size.y * 0.55)), c.lightened(0.08), 13)
	if enabled:
		# kayan parıltı
		var ph := fmod(_now() * 0.6, 1.6)
		if ph < 1.0:
			var x := r.position.x + r.size.x * ph
			var hi := Color(1, 1, 1, 0.16)
			cv.draw_colored_polygon(PackedVector2Array([Vector2(x - 18, r.position.y + 4), Vector2(x, r.position.y + 4),
				Vector2(x - 14, r.end.y - 4), Vector2(x - 32, r.end.y - 4)]), hi)
	var tc := Color.WHITE if enabled else Color("#a8a0a6")
	if coin and r.size.y < 50.0:
		# tek satır: etiket + altın simgesi + bedel
		var f := _hf()
		var lw := f.get_string_size(label, HORIZONTAL_ALIGNMENT_LEFT, -1, int(round(22 * 0.8))).x
		var cw2 := f.get_string_size(sub, HORIZONTAL_ALIGNMENT_LEFT, -1, int(round(18 * 0.8))).x
		var tot := lw + 18.0 + 22.0 + cw2
		var x0 := r.get_center().x - tot * 0.5
		var by := r.get_center().y + 8
		_txt(Vector2(x0, by), label, 22, tc, 0, HORIZONTAL_ALIGNMENT_LEFT, true, 6)
		_coin(Vector2(x0 + lw + 18.0 + 8.0, by - 7))
		_txt(Vector2(x0 + lw + 18.0 + 20.0, by), sub, 18, Color("#fff1c9") if enabled else BAD, 0, HORIZONTAL_ALIGNMENT_LEFT, true, 5)
		_hits.append({"r": r, "cb": cb})
		return
	if sub == "":
		_txt(Vector2(r.position.x, r.get_center().y + 9), label, 24, tc, r.size.x, HORIZONTAL_ALIGNMENT_CENTER, true, 6)
	else:
		_txt(Vector2(r.position.x, r.position.y + r.size.y * 0.45), label, 21, tc, r.size.x, HORIZONTAL_ALIGNMENT_CENTER, true, 6)
		var subc := Color("#fff1c9") if enabled else BAD
		if coin:
			var tw := UIK.font(false, 600).get_string_size(sub, HORIZONTAL_ALIGNMENT_LEFT, -1, 15).x
			var cx := r.get_center().x - (tw + 20) * 0.5
			_coin(Vector2(cx + 7, r.position.y + r.size.y * 0.76 - 5))
			_txt(Vector2(cx + 18, r.position.y + r.size.y * 0.76), sub, 15, subc, 0, HORIZONTAL_ALIGNMENT_LEFT, false, 4)
		else:
			_txt(Vector2(r.position.x, r.position.y + r.size.y * 0.78), sub, 14, subc, r.size.x, HORIZONTAL_ALIGNMENT_CENTER, false, 4)
	_hits.append({"r": r, "cb": cb})

func _coin(c: Vector2) -> void:
	cv.draw_circle(c, 7.5, INK)
	cv.draw_circle(c, 6.2, Color("#e7a62c"))
	cv.draw_circle(c + Vector2(-1, -1), 4.0, Color("#ffd86a"))

func _icon(name_: String, c: Vector2, sz: float, mod := Color.WHITE) -> void:
	var p := "res://assets/ui/art/icon/" + name_ + ".png"
	if not ResourceLoader.exists(p): p = "res://assets/ui/art/icon/guc.png"
	if not ResourceLoader.exists(p): return
	var t: Texture2D = UITex.get_tex(p)
	var k := sz / maxf(t.get_width(), t.get_height())
	var s := Vector2(t.get_width(), t.get_height()) * k
	cv.draw_texture_rect(t, Rect2(c - s * 0.5, s), false, mod)

# ───────────────────────── ana çizim ─────────────────────────
func _paint() -> void:
	_hits.clear()
	if id == "": return
	var x = g.gear_by_id(id)
	if x == null: return
	var W := UIK.ui_size(get_viewport())
	var t := _now() - _t0
	var owned: bool = g.owns_gear(id)
	var rar := int(x.rarity)
	var rc: Color = RCOL.get(rar, GOLD)
	var lvl: int = g.gear_level(id) if owned else 1
	var plus: int = g.gear_plus(id) if owned else 0

	# arka perde
	cv.draw_rect(Rect2(Vector2.ZERO, W), Color(0.01, 0.0, 0.02, 0.78))
	var cw := minf(W.x - 22.0, 380.0)
	var cx := (W.x - cw) * 0.5

	# yükseklik planı
	var stats := _stat_rows(x, owned)
	var showH := 236.0
	var titleH := 70.0
	var statH := 12.0 + ceilf(stats.size() / 2.0) * 52.0 + (22.0 if _cur_other(x) else 0.0)
	var loreH := 34.0
	var tabsH := 228.0 if owned else 66.0
	var actH := 78.0 if owned else 0.0
	var H := showH + titleH + statH + loreH + tabsH + actH + 14.0
	var top := maxf(10.0, (W.y - H) * 0.5)
	if top + H > W.y - 8.0: top = maxf(6.0, W.y - 8.0 - H)
	var R := Rect2(cx, top, cw, H)
	_cardR = R

	# kart gövdesi
	_box(Rect2(R.position + Vector2(0, 8), R.size), Color(0, 0, 0, 0.55), 26)
	_box(R, PANEL, 24, 3.0, INK)
	_box(R.grow(-4), PANEL, 21, 2.0, rc.darkened(0.35))

	# ── VİTRİN ──
	var S := Rect2(R.position + Vector2(10, 10), Vector2(cw - 20, showH - 14))
	_grad_box(S, rc.darkened(0.62), Color(0.02, 0.0, 0.04), 18)
	var sc := S.get_center() + Vector2(0, -6)
	# dönen ışık huzmeleri
	var rays := 14
	for i in rays:
		var a := t * 0.25 + TAU * i / rays
		var a2 := a + TAU / rays * 0.45
		var L1 := 190.0
		var col := rc
		col.a = 0.07 if owned else 0.03
		cv.draw_colored_polygon(PackedVector2Array([sc, sc + Vector2(cos(a), sin(a)) * L1, sc + Vector2(cos(a2), sin(a2)) * L1]), col)
	# hale
	for i in 6:
		var c := rc
		c.a = 0.05 + 0.02 * i
		cv.draw_circle(sc, 92.0 - i * 11.0, c)
	# rün halkası
	var ringC := rc.lightened(0.2)
	ringC.a = 0.55
	cv.draw_arc(sc, 82, 0, TAU, 64, ringC, 2.0, true)
	for i in 12:
		var a := -t * 0.4 + TAU * i / 12.0
		var p := sc + Vector2(cos(a), sin(a)) * 82.0
		cv.draw_colored_polygon(PackedVector2Array([p + Vector2(0, -5), p + Vector2(4, 0), p + Vector2(0, 5), p + Vector2(-4, 0)]), ringC)
	cv.draw_arc(sc, 70, t * 0.6, t * 0.6 + PI * 1.2, 40, Color(1, 1, 1, 0.18), 1.5, true)
	# + basma aurası
	if plus > 0:
		for i in plus:
			var a := t * (1.2 + i * 0.13) + TAU * i / plus
			var p := sc + Vector2(cos(a), sin(a) * 0.55) * (60.0 + 4.0 * sin(t * 2.0 + i))
			cv.draw_circle(p, 3.0 + plus * 0.25, Color(1.0, 0.82, 0.4, 0.75))
	# çizim (süzülen)
	var bob := sin(t * 1.8) * 5.0
	var art := "res://assets/ui/art/gear/" + str(x.icon) + ".png"
	if ResourceLoader.exists(art):
		var tex: Texture2D = UITex.get_tex(art)
		var k := 150.0 / maxf(tex.get_width(), tex.get_height())
		var sz := Vector2(tex.get_width(), tex.get_height()) * k
		cv.draw_texture_rect(tex, Rect2(sc + Vector2(0, bob) - sz * 0.5 + Vector2(4, 8), sz), false, Color(0, 0, 0, 0.45))
		cv.draw_texture_rect(tex, Rect2(sc + Vector2(0, bob) - sz * 0.5, sz), false, Color.WHITE if owned else Color(0.06, 0.05, 0.08, 1))
	if not owned:
		_txt(Vector2(sc.x - 40, sc.y + 14), "?", 54, Color(1, 1, 1, 0.5), 80, HORIZONTAL_ALIGNMENT_CENTER, true, 0)
	# yuva çipi
	var slotName := str(x.slot)
	for sd in D.EQUIP_SLOTS:
		if sd.id == x.slot: slotName = str(sd.name)
	var chipW := UIK.font(false, 700).get_string_size(slotName, HORIZONTAL_ALIGNMENT_LEFT, -1, 12).x + 22
	_box(Rect2(S.position + Vector2(10, 10), Vector2(chipW, 26)), Color(0, 0, 0, 0.5), 13, 1.5, rc.darkened(0.2))
	_txt(S.position + Vector2(10, 28), slotName, 12, Color("#efe4d4"), chipW, HORIZONTAL_ALIGNMENT_CENTER)
	# kapat
	var xc := Vector2(S.end.x - 20, S.position.y + 22)
	cv.draw_circle(xc + Vector2(0, 3), 17, INK)
	cv.draw_circle(xc, 16, Color("#e5394a"))
	cv.draw_circle(xc, 16, INK, false, 2.5, true)
	cv.draw_line(xc + Vector2(-6, -6), xc + Vector2(6, 6), Color.WHITE, 3.5, true)
	cv.draw_line(xc + Vector2(6, -6), xc + Vector2(-6, 6), Color.WHITE, 3.5, true)
	_hits.append({"r": Rect2(xc - Vector2(24, 24), Vector2(48, 48)), "cb": func(): g.audio.play("click"); close()})
	# seviye hapı
	if owned:
		var lt := "SV " + str(lvl) + "/" + str(D.GEAR_MAX_LEVEL)
		var pw := 78.0
		var pr := Rect2(Vector2(S.position.x + 12, S.end.y - 36), Vector2(pw, 26))
		_box(pr, Color(0, 0, 0, 0.6), 13, 2.0, GOLD.darkened(0.3))
		_txt(Vector2(pr.position.x, pr.position.y + 19), lt, 14, GOLD, pw, HORIZONTAL_ALIGNMENT_CENTER, true, 3)
	# +N rozeti
	if plus > 0:
		var bc := Vector2(S.end.x - 34, S.end.y - 30)
		var hx := PackedVector2Array()
		for i in 6: hx.append(bc + Vector2(cos(PI / 6 + i * PI / 3), sin(PI / 6 + i * PI / 3)) * 24.0)
		var hx2 := PackedVector2Array()
		for i in 6: hx2.append(bc + Vector2(cos(PI / 6 + i * PI / 3), sin(PI / 6 + i * PI / 3)) * 20.0)
		cv.draw_colored_polygon(hx, INK)
		cv.draw_colored_polygon(hx2, Color("#ffb83a").lerp(Color("#ff6a2a"), plus / 7.0))
		_txt(Vector2(bc.x - 24, bc.y + 8), "+" + str(plus), 22, Color.WHITE, 48, HORIZONTAL_ALIGNMENT_CENTER, true, 5)

	# ── BAŞLIK ──
	var y := R.position.y + showH + 6
	var nm := str(x.name) if owned else "???"
	_txt(Vector2(cx, y + 26), nm, 23, Color.WHITE, cw, HORIZONTAL_ALIGNMENT_CENTER, true, 3, true)
	var rn: String = RNAME.get(rar, "")
	var rfont := UIK.font(false, 700, 3.0)
	var rw := rfont.get_string_size(rn, HORIZONTAL_ALIGNMENT_LEFT, -1, 12).x
	var ry := y + 52
	var mid := cx + cw * 0.5
	cv.draw_line(Vector2(mid - rw * 0.5 - 50, ry - 5), Vector2(mid - rw * 0.5 - 12, ry - 5), rc, 2.0, true)
	cv.draw_line(Vector2(mid + rw * 0.5 + 12, ry - 5), Vector2(mid + rw * 0.5 + 50, ry - 5), rc, 2.0, true)
	for sx in [-1.0, 1.0]:
		var dp := Vector2(mid + sx * (rw * 0.5 + 8), ry - 5)
		cv.draw_colored_polygon(PackedVector2Array([dp + Vector2(0, -4), dp + Vector2(4, 0), dp + Vector2(0, 4), dp + Vector2(-4, 0)]), rc)
	cv.draw_string(rfont, Vector2(cx, ry), rn, HORIZONTAL_ALIGNMENT_CENTER, cw, 12, rc)
	if owned and g.is_equipped(id):
		var er := Rect2(Vector2(R.end.x - 104, y - 4), Vector2(90, 22))
		_box(er, Color("#1e4a2a"), 11, 1.5, GOOD.darkened(0.2))
		_txt(Vector2(er.position.x, er.position.y + 16), "KUŞANILDI", 12, GOOD, er.size.x, HORIZONTAL_ALIGNMENT_CENTER, true, 0)

	# ── STATLAR ──
	y = R.position.y + showH + titleH
	var cur = _cur_other(x)
	if cur:
		_txt(Vector2(cx, y + 12), "Kuşanılana göre: " + str(cur.name), 12, DIM, cw, HORIZONTAL_ALIGNMENT_CENTER)
		y += 22
	var colW := (cw - 32 - 8) * 0.5
	for i in stats.size():
		var st: Dictionary = stats[i]
		var rr := Rect2(Vector2(cx + 16 + (i % 2) * (colW + 8), y + 6 + (i / 2) * 52), Vector2(colW, 46))
		_box(rr, PANEL2, 12, 1.5, Color(1, 1, 1, 0.07))
		var ic := rr.position + Vector2(22, 23)
		cv.draw_circle(ic, 15, Color(0, 0, 0, 0.45))
		cv.draw_circle(ic, 15, rc.darkened(0.2), false, 1.5, true)
		_icon(MOD_ICON.get(st.k, "guc"), ic, 18, GOOD if st.good else BAD)
		_txt(Vector2(rr.position.x + 42, rr.position.y + 18), st.label, 11, DIM, colW - 46)
		_txt(Vector2(rr.position.x + 42, rr.position.y + 38), st.val, 18, Color.WHITE if owned else DIM, 0, HORIZONTAL_ALIGNMENT_LEFT, true, 3)
		if st.d != "":
			var dc: Color = GOOD if st.dk == "up" else (BAD if st.dk == "down" else DIM)
			_txt(Vector2(rr.position.x, rr.position.y + 37), st.d, 12, dc, colW - 8, HORIZONTAL_ALIGNMENT_RIGHT, false, 2)

	# ── ANLATI ──
	y = R.position.y + showH + titleH + statH
	if owned:
		_txt(Vector2(cx + 20, y + 20), "“" + str(x.get("desc", "")) + "”", 13, Color("#c9bcae"), cw - 40, HORIZONTAL_ALIGNMENT_CENTER)
	else:
		_txt(Vector2(cx + 20, y + 20), "Sandıklardan ve mağazadan elde edilir", 13, DIM, cw - 40, HORIZONTAL_ALIGNMENT_CENTER)
	y += loreH

	if not owned: return

	# ── SEKMELER ──
	var TR := Rect2(Vector2(cx + 16, y), Vector2(cw - 32, 40))
	_box(TR, Color(0, 0, 0, 0.45), 20, 1.5, Color(1, 1, 1, 0.08))
	var half := TR.size.x * 0.5
	var tabs := [["lvl", "SEVİYE"], ["plus", "+ BASMA"]]
	for i in 2:
		var tr2 := Rect2(TR.position + Vector2(half * i + 3, 3), Vector2(half - 6, 34))
		var on: bool = tab == tabs[i][0]
		if on:
			_box(tr2, rc.darkened(0.15) if i == 0 else Color("#c9772a"), 17, 2.0, INK)
			_box(Rect2(tr2.position + Vector2(3, 2), Vector2(tr2.size.x - 6, 14)), Color(1, 1, 1, 0.12), 12)
		_txt(Vector2(tr2.position.x, tr2.position.y + 24), tabs[i][1], 16, Color.WHITE if on else DIM, tr2.size.x, HORIZONTAL_ALIGNMENT_CENTER, true, 4 if on else 0)
		var key: String = tabs[i][0]
		_hits.append({"r": tr2, "cb": func():
			if tab != key:
				tab = key
				g.audio.play("click")})
	y += 50
	var body := Rect2(Vector2(cx + 16, y), Vector2(cw - 32, 170))
	_box(body, Color(0, 0, 0, 0.32), 16, 1.5, Color(1, 1, 1, 0.06))
	if tab == "lvl": _paint_lvl(body, lvl)
	else: _paint_plus(body, plus, t)

	# ── KUŞAN ──
	var ay := body.end.y + 14
	var ar := Rect2(Vector2(cx + 16, ay), Vector2(cw - 32, 54))
	if g.is_equipped(id):
		_button(ar, "ÇIKAR", "", Color("#5b4a5e"), true, func(): _toggle())
	elif g.can_wear(id):
		_button(ar, "KUŞAN", "", Color("#3fa95a"), true, func(): _toggle())
	else:
		_button(ar, "BU KAHRAMAN KUŞANAMAZ", "", Color("#4a4048"), false, func(): g.audio.play("error"))

	# + basma sonuç efekti
	_paint_fx(t)

func _paint_lvl(b: Rect2, lvl: int) -> void:
	var need = g.cards_for_next_gear(id)
	var gl := D.gearLevelMods(lvl)
	if need == null:
		_txt(Vector2(b.position.x, b.position.y + 74), "AZAMİ SEVİYE", 28, GOLD, b.size.x, HORIZONTAL_ALIGNMENT_CENTER, true, 6)
		_txt(Vector2(b.position.x, b.position.y + 104), "Statlar x" + str(snappedf(gl, 0.01)) + " · + BASMA ile güçlendirmeye devam et", 12, DIM, b.size.x, HORIZONTAL_ALIGNMENT_CENTER)
		return
	var nx := D.gearLevelMods(lvl + 1)
	# Sv a → Sv b
	_txt(Vector2(b.position.x, b.position.y + 34), "SV " + str(lvl) + "   ►   SV " + str(lvl + 1), 22, Color.WHITE, b.size.x, HORIZONTAL_ALIGNMENT_CENTER, true, 5)
	_txt(Vector2(b.position.x, b.position.y + 54), "Tüm statlar +%" + str(int(round((nx / gl - 1.0) * 100))), 12, GOOD, b.size.x, HORIZONTAL_ALIGNMENT_CENTER)
	# kart çubuğu
	var cards: int = g.gear_card_count(id)
	var f := clampf(float(cards) / maxf(1.0, float(need)), 0.0, 1.0)
	var br := Rect2(b.position + Vector2(18, 66), Vector2(b.size.x - 36, 24))
	_box(br, Color(0, 0, 0, 0.6), 12, 2.0, INK)
	if f > 0.0:
		var fc := GOOD if f >= 1.0 else Color("#4ea6ff")
		_box(Rect2(br.position + Vector2(2, 2), Vector2(maxf(20.0, (br.size.x - 4) * f), br.size.y - 4)), fc, 10)
		_box(Rect2(br.position + Vector2(4, 3), Vector2(maxf(16.0, (br.size.x - 8) * f), 7)), Color(1, 1, 1, 0.25), 6)
	_txt(Vector2(br.position.x, br.position.y + 17), str(cards) + " / " + str(int(need)) + " KART", 16, Color.WHITE, br.size.x, HORIZONTAL_ALIGNMENT_CENTER, true, 2)
	var ok: bool = g.can_upgrade_gear(id)
	var cost := int(g.gold_for_next_gear(id))
	_button(Rect2(b.position + Vector2(18, 102), Vector2(b.size.x - 36, 56)), "GELİŞTİR", JS.s(cost), Color("#e0a53a"), ok, func(): _upgrade(), true)

func _paint_plus(b: Rect2, plus: int, t: float) -> void:
	var PM: int = g.PLUS_MAX
	# basamaklar (+1..+7)
	var n := PM
	var gap := (b.size.x - 36) / n
	for i in n:
		var c := Vector2(b.position.x + 18 + gap * (i + 0.5), b.position.y + 26)
		var done := i < plus
		var nxt := i == plus
		var r := 13.0
		cv.draw_circle(c + Vector2(0, 2), r + 2, INK)
		if done:
			cv.draw_circle(c, r, Color("#ffb83a").lerp(Color("#ff6a2a"), float(i) / n))
			cv.draw_circle(c + Vector2(-3, -3), r * 0.4, Color(1, 1, 1, 0.35))
		else:
			cv.draw_circle(c, r, Color("#2a2030"))
			if nxt:
				var pa := 0.5 + 0.5 * sin(t * 5.0)
				cv.draw_arc(c, r + 3, 0, TAU, 32, Color(1.0, 0.8, 0.35, 0.4 + 0.5 * pa), 2.5, true)
			if i + 1 >= g.PLUS_BURN_FROM:
				cv.draw_arc(c, r - 1, 0, TAU, 24, Color(1, 0.35, 0.3, 0.55), 1.5, true)
		_txt(Vector2(c.x - 14, c.y + 6), "+" + str(i + 1), 14, Color("#3a1d06") if done else DIM, 28, HORIZONTAL_ALIGNMENT_CENTER, true, 0)
	if plus >= PM:
		_txt(Vector2(b.position.x, b.position.y + 94), "AZAMİ +7", 30, GOLD, b.size.x, HORIZONTAL_ALIGNMENT_CENTER, true, 6)
		_txt(Vector2(b.position.x, b.position.y + 122), "Tüm statlar +%" + str(int(round(g.PLUS_BONUS[PM] * 100))) + " · eşya tam güçte", 13, DIM, b.size.x, HORIZONTAL_ALIGNMENT_CENTER)
		return
	var ch: float = g.plus_chance(id)
	var chc := GOOD if ch >= 0.8 else (GOLD if ch >= 0.5 else BAD)
	var b0 := int(round(g.PLUS_BONUS[plus] * 100))
	var b1 := int(round(g.PLUS_BONUS[plus + 1] * 100))
	# sol: şans göstergesi (yay)
	var gc := Vector2(b.position.x + 58, b.position.y + 96)
	cv.draw_arc(gc, 30, PI * 0.75, PI * 2.25, 40, Color(1, 1, 1, 0.1), 7.0, true)
	cv.draw_arc(gc, 30, PI * 0.75, PI * 0.75 + PI * 1.5 * ch, 40, chc, 7.0, true)
	_txt(Vector2(gc.x - 34, gc.y + 6), "%" + str(int(round(ch * 100))), 19, chc, 68, HORIZONTAL_ALIGNMENT_CENTER, true, 4)
	_txt(Vector2(gc.x - 34, gc.y + 36), "ŞANS", 10, DIM, 68, HORIZONTAL_ALIGNMENT_CENTER)
	# sağ: bonus ve risk
	var rx := b.position.x + 106
	var rw := b.size.x - 118
	_txt(Vector2(rx, b.position.y + 72), "+" + str(plus) + "  ►  +" + str(plus + 1), 18, Color.WHITE, rw, HORIZONTAL_ALIGNMENT_LEFT, true, 4)
	_txt(Vector2(rx, b.position.y + 92), "Statlar +%" + str(b0) + " → +%" + str(b1), 12, GOOD, rw)
	if g.plus_burns(id):
		var tp := Vector2(rx + 6, b.position.y + 105)
		cv.draw_colored_polygon(PackedVector2Array([tp + Vector2(0, -6), tp + Vector2(6, 5), tp + Vector2(-6, 5)]), BAD)
		_txt(Vector2(rx + 15, b.position.y + 110), "Başarısızsa eşya YANAR (+0)", 11, BAD, rw - 15)
	else:
		_txt(Vector2(rx, b.position.y + 110), "Başarısızlıkta kayıp yok", 11, Color("#9fd6a6"), rw)
	var cost = g.plus_cost(id)
	_button(Rect2(b.position + Vector2(18, 122), Vector2(b.size.x - 36, 42)), "+ BAS", JS.s(cost), Color("#d9862e"), g.can_plus(id), func(): _plus(), true)

func _paint_fx(t: float) -> void:
	if _fx == "": return
	var ft := _now() - _fxT
	if ft > 1.6:
		_fx = ""
		return
	var c := _cardR.get_center()
	var col: Color = {"ok": GOOD, "fail": GOLD, "burn": BAD}[_fx]
	if _fx == "burn" and ft < 0.5:
		cv.draw_rect(_cardR, Color(1, 0.2, 0.1, 0.35 * (1.0 - ft / 0.5)))
	if _fx == "ok" and ft < 0.4:
		cv.draw_rect(_cardR, Color(1, 0.9, 0.5, 0.25 * (1.0 - ft / 0.4)))
	# kıvılcımlar
	for s in _sparks:
		var p: Vector2 = s.p + s.v * ft + Vector2(0, 260.0 * ft * ft)
		var a := clampf(1.0 - ft / 1.2, 0.0, 1.0)
		var cc: Color = s.c
		cc.a = a
		cv.draw_circle(p, s.r * a + 0.5, cc)
	var txt: String = {"ok": "BAŞARILI!", "fail": "BAŞARISIZ", "burn": "YANDI!  +0"}[_fx]
	var sc := 1.0 + 0.35 * maxf(0.0, 1.0 - ft * 5.0)
	var al := clampf(1.6 - ft, 0.0, 1.0)
	var cc2 := col
	cc2.a = al
	cv.draw_set_transform(c + Vector2(0, -60 - ft * 18), 0.0, Vector2.ONE * sc)
	var f := _serif()
	cv.draw_string(f, Vector2(-170, 17), txt, HORIZONTAL_ALIGNMENT_CENTER, 340, 32, Color(0, 0, 0, 0.6 * al))
	cv.draw_string_outline(f, Vector2(-170, 14), txt, HORIZONTAL_ALIGNMENT_CENTER, 340, 32, 3, Color(INK, al))
	cv.draw_string(f, Vector2(-170, 14), txt, HORIZONTAL_ALIGNMENT_CENTER, 340, 32, cc2)
	cv.draw_set_transform(Vector2.ZERO, 0.0, Vector2.ONE)

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

func _plus() -> void:
	if g.plus_cost(id) == null: return
	if not g.can_plus(id):
		g.audio.play("error")
		g.ui.toast("YETERSİZ ALTIN")
		return
	var res: String = g.plus_gear(id)
	if res == "": return
	g.audio.play({"ok": "levelup", "fail": "blunder", "burn": "boom"}[res])
	g.ui.menu.refresh_wallet()
	_fx = res
	_fxT = _now()
	_sparks.clear()
	var c := _cardR.get_center() + Vector2(0, -150)
	var pal: Array = [Color("#ffd27a"), Color("#ffb03a"), Color.WHITE] if res == "ok" else ([Color("#ff5a3a"), Color("#ff9a2a"), Color("#3a2a2a")] if res == "burn" else [Color("#a89b8f")])
	var nsp := 34 if res != "fail" else 10
	for i in nsp:
		var a := randf() * TAU
		var sp := randf_range(90, 330)
		_sparks.append({"p": c, "v": Vector2(cos(a), sin(a) - 0.6) * sp, "r": randf_range(2.0, 5.0), "c": pal[i % pal.size()]})
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
