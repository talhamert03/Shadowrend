class_name ComicSkin
extends RefCounted
## Borderlands çizgi roman KAPLAMASI: yakalanan (web) katmanların düzeni, metinleri ve dokunma
## alanları aynen kalır; seçilen kutuların görüntüsü (arka plan, gölge, ::before/::after)
## gizlenir ve yerine yerel çizim gelir — kalın mürekkep kontur, ofset mürekkep gölge, düz
## doygun renk, üst parıltı çizgisi, yarım ton, aksiyon ışınları. Metinler Bangers + mürekkep.
## Ana menü kabuğu (üst çubuk, alt menü, zemin) ve SAVAŞ sayfası burada boyanır.

const INK := Color(0.05, 0.03, 0.07)
const YEL := Color("#ffd23a")
const ORANGE := Color("#ff8a2a")
const PAPER := Color("#fff3d6")
const NIGHT := Color("#1c0f2a")

## kutu çizici: düğüm boyu değişince (esneme, yuva büyümesi) kendini yeniden çizer;
## anim = her kare (nabız, parıltı)
class Drawer extends Node2D:
	var n: Lyr.N
	var fn: Callable
	var anim := false
	var t := 0.0
	var _sz := Vector2(-1, -1)
	func _process(dt: float) -> void:
		t += dt
		if anim or n.size != _sz:
			_sz = n.size
			queue_redraw()
		# durağan kutu: ilk 1,5 sn (yerleşim/esneme) izlenir, sonra kare başı çağrı yok
		if not anim and t > 1.5: set_process(false)
	func _draw() -> void:
		fn.call(self, n.size)

## katmandaki tüm kaplama çizicilerini yeniden çiz (yerleşim sonradan değişince)
static func refresh(root: Node) -> void:
	for d in root.find_children("*", "Node2D", true, false):
		if d is Drawer:
			(d as Drawer).queue_redraw()
			(d as Drawer).set_process(true)
			if not (d as Drawer).anim: (d as Drawer).t = minf((d as Drawer).t, 1.0)

# ═════════════ yardımcılar ═════════════

static func _is_deco(k: Lyr.N) -> bool:
	var key := String(k.d.get("key", ""))
	return String(k.d.get("kind", "el")) != "el" or key.contains("v59-sh") or key.ends_with("-sh")

## kutunun kendi görüntüsünü ve süslerini (::before/::after, gölge kopyası) gizle
static func strip(L: Lyr, n: Lyr.N, deco := true) -> void:
	if n == null: return
	n.d["_skin"] = true
	if n.img: n.img.visible = false
	if deco:
		for k in n.kids:
			if _is_deco(k): hide(L, k)

## kalıcı gizle (durum geçişleri — to_state — geri açmasın)
static func hide(L: Lyr, k: Lyr.N) -> void:
	k.d["_skinhide"] = true
	L.set_hidden(k, true)

## kutunun ALTINA (çocuklarının arkasına) çizici ekle
static func under(n: Lyr.N, fn: Callable, anim := false) -> Drawer:
	var d := Drawer.new()
	d.n = n
	d.fn = fn
	d.anim = anim
	n.node.add_child(d)
	var idx := 0
	if n.img and n.img.get_parent() == n.node: idx = n.img.get_index() + 1
	n.node.move_child(d, idx)
	return d

## kutunun ÜSTÜNE (çocuklarının önüne) çizici ekle
static func over(n: Lyr.N, fn: Callable, anim := false) -> Drawer:
	var d := Drawer.new()
	d.n = n
	d.fn = fn
	d.anim = anim
	n.node.add_child(d)
	return d

static func sb(c: Color, r: float, bw := 0.0, bc := INK) -> StyleBoxFlat:
	var s := StyleBoxFlat.new()
	s.bg_color = c
	s.set_corner_radius_all(int(r))
	if bw > 0.0:
		s.set_border_width_all(int(bw))
		s.border_color = bc
	s.anti_aliasing = true
	return s

## çizgi roman paneli: ofset mürekkep gölge + dolgu + üst parıltı + mürekkep kontur
static func panel(d: CanvasItem, r: Rect2, fill: Color, rad := 12.0, bw := 4.0, drop := Vector2(3, 5), hi := true) -> void:
	if drop != Vector2.ZERO: d.draw_style_box(sb(INK, rad), Rect2(r.position + drop, r.size))
	d.draw_style_box(sb(fill, rad), r)
	if hi and r.size.x > rad * 2.0 + 8.0:
		d.draw_line(r.position + Vector2(rad, bw + 3), Vector2(r.end.x - rad, r.position.y + bw + 3), Color(1, 1, 1, 0.35), 2.5)
	d.draw_style_box(sb(Color(0, 0, 0, 0), rad, bw), r)

## dikdörtgene kırpılı aksiyon ışınları
static func rays(d: CanvasItem, r: Rect2, c: Vector2, col: Color, n := 16, wdt := 0.11, inset := 3.0) -> void:
	var box := PackedVector2Array([r.position + Vector2(inset, inset), Vector2(r.end.x - inset, r.position.y + inset), r.end - Vector2(inset, inset), Vector2(r.position.x + inset, r.end.y - inset)])
	var R := r.size.length() * 1.2
	for i in n:
		var a := i * TAU / n
		var tri := PackedVector2Array([c, c + Vector2(cos(a - wdt), sin(a - wdt)) * R, c + Vector2(cos(a + wdt), sin(a + wdt)) * R])
		for q in Geometry2D.intersect_polygons(tri, box):
			if q.size() >= 3: d.draw_colored_polygon(q, col)

## yarım ton: alttan yukarı küçülen noktalar (dikdörtgen içinde)
static func halftone(d: CanvasItem, r: Rect2, col: Color, step := 8.0, rows := 6, r0 := 2.4) -> void:
	for yy in rows:
		var rr := r0 * (1.0 - float(yy) / rows)
		if rr < 0.4: break
		var y := r.end.y - step * 0.6 - yy * step
		var x := r.position.x + step * 0.6 + (step * 0.5 if yy % 2 else 0.0)
		while x < r.end.x - step * 0.4:
			d.draw_circle(Vector2(x, y), rr, col)
			x += step

## yakalanan metni çizgi roman yazısına çevir (Bangers + mürekkep kontur)
static func font(n: Lyr.N, mul := 1.1, col = null, stroke := 1.6, drop := 2.0) -> void:
	if n == null or n.txt == null: return
	var t := n.txt
	var c: Color = t.color if col == null else col
	t.style(false, 1000, t.size_px * mul, maxf(0.4, t.ls * 0.5), c, UIK.ink_stroke(stroke, drop) if stroke > 0.0 else "")
	if n.txt_shadow: n.txt_shadow.visible = false
	t.material = null

## alt ağaçtaki tüm metinler
static func fonts(n: Lyr.N, mul := 1.1, col = null, stroke := 1.6) -> void:
	if n == null: return
	font(n, mul, col, stroke)
	for k in n.kids: fonts(k, mul, col, stroke)

# ═════════════ GENEL KAPLAMA (tüm yakalanan sayfa / pencereler) ═════════════
# Lyr.make her katmanı buradan geçirir: başlık yazıları (Cinzel) → Bangers + mürekkep;
# büyük bölüm kutuları (section / üst düzey geniş kutular) → mürekkep konturlu çizgi roman paneli.
# HUD ve ana menü kabuğu (kendi özel kaplaması var) hariç.

const AUTO_SKIP := ["hd_", "logo_title", "ftue_", "pause_chip", "cer_", "menu_"]
const ART_TAGS := ["img", "svg", "canvas", "i", "picture", "video"]

static func auto_on(name: String) -> bool:
	for p in AUTO_SKIP:
		if name.begins_with(p): return false
	return true

static func auto(L: Lyr) -> void:
	for n in L.nodes:
		if n.txt and n.txt.font_display and not n.d.get("_skin_f", false):
			n.d["_skin_f"] = true
			# koyu yazı (açık düğme üstünde) konturlanmaz — okunurluk
			var dark: bool = n.txt.color.get_luminance() < 0.4
			font(n, 1.12, null, 0.0 if dark else 1.4, 1.6)
		if n.img and _is_section(L, n): _section(L, n)

static func _depth(L: Lyr, n: Lyr.N) -> int:
	var k := 0
	var p = n.d.get("parent")
	while p != null:
		var pn: Lyr.N = L.by_id.get(str(p))
		if pn == null: break
		k += 1
		p = pn.d.get("parent")
	return k

static func _is_section(L: Lyr, n: Lyr.N) -> bool:
	if String(n.d.get("kind", "el")) != "el": return false
	var tag := String(n.d.get("tag", ""))
	if ART_TAGS.has(tag): return false
	if n.size.x >= 380.0 and n.size.y >= 700.0: return false        # tam ekran zemin / perde
	if tag == "section": return true
	return n.size.x >= 280.0 and n.size.y >= 64.0 and _depth(L, n) <= 3 and tag in ["div", "article", "aside", "header", "li", "form"]

static func _section(L: Lyr, n: Lyr.N) -> void:
	strip(L, n)
	under(n, func(d: Node2D, sz: Vector2):
		var r := Rect2(Vector2.ZERO, sz)
		panel(d, r, Color("#2a1838"), 14, 4.0, Vector2(3, 6))
		halftone(d, Rect2(r.position + Vector2(5, maxf(5.0, sz.y - 60.0)), Vector2(sz.x - 10, minf(55.0, sz.y - 10))), Color(0, 0, 0, 0.22), 8.0, 5, 2.2)
		d.draw_rect(Rect2(14, 4, minf(80.0, sz.x * 0.3), 4), Color(YEL, 0.85)))

# ═════════════ ANA MENÜ KABUĞU ═════════════

static func skin_shell(L: Lyr) -> void:
	# zemin: gece moru, ortadan aşağı koyulaşan; dönen hafif ışınlar; dipte yarım ton
	var sky := L.find(".menu-sky")
	if sky:
		strip(L, sky)
		under(sky, func(d: Node2D, sz: Vector2):
			var top := Color("#3a1a52")
			var bot := Color("#120820")
			d.draw_polygon(PackedVector2Array([Vector2(-400, 0), Vector2(sz.x + 400, 0), Vector2(sz.x + 400, sz.y), Vector2(-400, sz.y)]),
				PackedColorArray([top, top, bot, bot]))
			halftone(d, Rect2(-400, sz.y * 0.55, sz.x + 800, sz.y * 0.45), Color(0, 0, 0, 0.28), 12.0, 16, 3.4))
		var rs := Node2D.new()
		rs.position = Vector2(sky.size.x * 0.5, sky.size.y * 0.42)
		rs.draw.connect(func():
			for i in 22:
				var a := i * TAU / 22.0
				rs.draw_colored_polygon(PackedVector2Array([Vector2.ZERO, Vector2(cos(a - 0.07), sin(a - 0.07)) * 1400, Vector2(cos(a + 0.07), sin(a + 0.07)) * 1400]), Color(1, 0.85, 1, 0.035)))
		sky.node.add_child(rs)
		sky.node.move_child(rs, 1)
		var tw := rs.create_tween().set_loops()
		tw.tween_property(rs, "rotation", TAU, 90.0).from(0.0)
	# üst çubuk
	var tb := L.find(".topbar")
	if tb:
		strip(L, tb)
		under(tb, func(d: Node2D, sz: Vector2):
			d.draw_rect(Rect2(-400, -200, sz.x + 800, sz.y + 200), NIGHT)
			halftone(d, Rect2(-400, 0, sz.x + 800, sz.y), Color(0, 0, 0, 0.25), 7.0, 6, 2.0)
			d.draw_rect(Rect2(-400, sz.y - 6, sz.x + 800, 3), Color(YEL, 0.85))
			d.draw_rect(Rect2(-400, sz.y - 3, sz.x + 800, 4), INK))
	_skin_level(L)
	for c in L.find_all(".tb-cur"): _skin_cur(L, c)
	var dl := L.find_id("#tb-daily")
	if dl:
		strip(L, dl)
		under(dl, func(d: Node2D, sz: Vector2): panel(d, Rect2(Vector2(2, 2), sz - Vector2(4, 4)), ORANGE, 12, 3.5, Vector2(2, 4)))
	var dn := L.find_id("#tb-daily-n")
	if dn:
		strip(L, dn)
		under(dn, func(d: Node2D, sz: Vector2):
			var c := sz * 0.5
			d.draw_circle(c + Vector2(1, 2), sz.x * 0.62, INK)
			d.draw_circle(c, sz.x * 0.62, INK)
			d.draw_circle(c, sz.x * 0.62 - 2.5, Color("#e8322c")))
		font(dn, 1.25, Color.WHITE, 1.0, 1.0)
	var st := L.find_id("#btn-settings")
	if st:
		strip(L, st)
		under(st, func(d: Node2D, sz: Vector2): panel(d, Rect2(Vector2(2, 2), sz - Vector2(4, 4)), Color("#5b6f96"), 12, 3.5, Vector2(2, 4)))
	_skin_dock(L)

static func _skin_level(L: Lyr) -> void:
	var lv := L.find_id("#tb-level")
	if lv == null: return
	for k in lv.kids:
		var key := String(k.d.key)
		if key.ends_with("::after") and k.img:
			k.d["_skin"] = true
			k.img.visible = false
	under(lv, func(d: Node2D, sz: Vector2):
		var c := sz * 0.5
		d.draw_circle(c + Vector2(2, 3), sz.x * 0.5 + 1, INK)
		d.draw_circle(c, sz.x * 0.5 + 1, INK)
		d.draw_circle(c, sz.x * 0.5 - 2, Color("#2a1838")))
	var star := L.find(".tbl-star")
	if star:
		strip(L, star)
		under(star, func(d: Node2D, sz: Vector2): ScrCeremony._star(d, sz * 0.5, sz.x * 0.62, sz.x * 0.44, 10, YEL, 2.0))
	var num := L.find_id("#tbl-num")
	if num: font(num, 1.25, INK, 0.0)

static func _skin_cur(L: Lyr, c: Lyr.N) -> void:
	strip(L, c)
	var acc := Color("#a85cff") if L.find_in(c, ".stone") else Color("#ffb020")
	under(c, func(d: Node2D, sz: Vector2):
		var r := Rect2(Vector2(-6, 3), sz - Vector2(2, 6))
		var sk := 6.0
		var P := PackedVector2Array([r.position + Vector2(sk, 0), Vector2(r.end.x, r.position.y), Vector2(r.end.x - sk, r.end.y), Vector2(r.position.x, r.end.y)])
		var S := PackedVector2Array()
		for p in P: S.append(p + Vector2(2, 4))
		d.draw_colored_polygon(S, INK)
		d.draw_colored_polygon(P, Color("#2a1838"))
		d.draw_colored_polygon(PackedVector2Array([P[0], P[1], P[1] + Vector2(-1.2, 5), P[0] + Vector2(-1.2, 5)]), Color(acc, 0.55))
		P.append(P[0])
		d.draw_polyline(P, INK, 3.0, true)
		pass)
	var pl := L.find_in(c, ".tbc-plus")
	if pl:
		strip(L, pl)
		under(pl, func(d: Node2D, sz: Vector2):
			var cc := sz * 0.5
			d.draw_circle(cc + Vector2(1, 2), sz.x * 0.62, INK)
			d.draw_circle(cc, sz.x * 0.62, INK)
			d.draw_circle(cc, sz.x * 0.62 - 2.5, Color("#4cbf5e"))
			d.draw_rect(Rect2(cc.x - 4.5, cc.y - 1.4, 9, 2.8), Color.WHITE)
			d.draw_rect(Rect2(cc.x - 1.4, cc.y - 4.5, 2.8, 9), Color.WHITE))
		for k in pl.kids: hide(L, k)
	for k in c.kids:
		if k.txt: font(k, 1.2, Color.WHITE, 1.6, 2.0)

static func _skin_dock(L: Lyr) -> void:
	var dock := L.find(".dock")
	if dock == null: return
	strip(L, dock)
	under(dock, func(d: Node2D, sz: Vector2):
		d.draw_rect(Rect2(-400, 0, sz.x + 800, sz.y + 300), NIGHT)
		halftone(d, Rect2(-400, 4, sz.x + 800, sz.y), Color(0, 0, 0, 0.25), 7.0, 7, 2.0)
		d.draw_rect(Rect2(-400, -2, sz.x + 800, 5), INK)
		d.draw_rect(Rect2(-400, 3, sz.x + 800, 2), Color(YEL, 0.75)))
	var ind := L.find(".dk-ind")
	if ind:
		strip(L, ind)
		under(ind, func(d: Node2D, sz: Vector2): panel(d, Rect2(Vector2(4, 9), sz - Vector2(8, 8)), Color("#ffb020"), 12, 3.5, Vector2(2, 4)))
	for t in L.find_all(".dk-tab"):
		for k in t.kids:
			var key := String(k.d.key)
			if key.begins_with(".dk-lab"): font(k, 1.35, Color.WHITE, 1.4, 1.6)
			elif key.contains("::before") and k.img:
				k.d["_skin"] = true
				k.img.visible = false
	var md := L.find(".dk-medal")
	if md:
		strip(L, md)
		under(md, func(d: Node2D, sz: Vector2):
			var c := sz * 0.5
			var R := sz.x * 0.5
			d.draw_circle(c + Vector2(2, 4), R, INK)
			d.draw_circle(c, R, INK)
			d.draw_circle(c, R - 4, Color("#ff5a2c"))
			d.draw_circle(c + Vector2(0, -R * 0.15), R - 9, Color("#ff7a3a"))
			d.draw_arc(c, R - 7, PI * 1.1, PI * 1.6, 12, Color(1, 1, 1, 0.55), 3.0, true))

# ═════════════ SAVAŞ SAYFASI ═════════════

static func skin_home(L: Lyr) -> void:
	_duo(L, L.find_id("#free-chest"), Color("#2fb36a"))
	_duo(L, L.find_id("#victory-chest"), Color("#8b4ae8"))
	var hm := L.find_id("#home-map")
	if hm:
		strip(L, hm)
		for k in hm.kids:
			if String(k.d.key).begins_with(".map-sheen"): hide(L, k)
		under(hm, func(d: Node2D, sz: Vector2): panel(d, Rect2(Vector2.ZERO, sz), Color("#1a0f24"), 14, 0.0, Vector2(4, 6), false))
		over(hm, func(d: Node2D, sz: Vector2):
			d.draw_style_box(sb(Color(0, 0, 0, 0), 14, 5.0), Rect2(Vector2.ZERO, sz))
			d.draw_style_box(sb(Color(0, 0, 0, 0), 11, 2.0, Color(YEL, 0.6)), Rect2(Vector2(5, 5), sz - Vector2(10, 10))))
	var pd := L.find_id("#map-pedestal")
	if pd:
		strip(L, pd)
		under(pd, func(d: Node2D, sz: Vector2):
			var r := Rect2(Vector2.ZERO, sz)
			panel(d, r, Color("#2a1838"), 12, 4.0)
			halftone(d, r.grow(-4), Color(0, 0, 0, 0.3), 7.0, 4, 2.0))
		var md := L.find(".chp-medal")
		if md:
			strip(L, md)
			under(md, func(d: Node2D, sz: Vector2):
				var c := sz * 0.5
				ScrCeremony._star(d, c, sz.x * 0.6, sz.x * 0.46, 9, Color("#e8322c"), 2.5))
			fonts(md, 1.2, Color.WHITE, 1.4)
		var go := L.find(".chp-go")
		if go:
			strip(L, go)
			under(go, func(d: Node2D, sz: Vector2): panel(d, Rect2(Vector2(1, 1), sz - Vector2(2, 2)), YEL, 10, 3.0, Vector2(2, 3)))
			fonts(go, 1.15, INK, 0.0)
		var body := L.find(".chp-body")
		if body: fonts(body, 1.15, null, 1.4)
	var ng := L.find_id("#next-goal")
	if ng:
		strip(L, ng)
		under(ng, func(d: Node2D, sz: Vector2):
			panel(d, Rect2(Vector2.ZERO, sz), Color.WHITE, sz.y * 0.5, 3.0, Vector2(2, 4))
			d.draw_colored_polygon(PackedVector2Array([Vector2(sz.x * 0.5 - 8, sz.y - 1.5), Vector2(sz.x * 0.5 + 8, sz.y - 1.5), Vector2(sz.x * 0.5, sz.y + 8)]), INK)
			d.draw_colored_polygon(PackedVector2Array([Vector2(sz.x * 0.5 - 5, sz.y - 3), Vector2(sz.x * 0.5 + 5, sz.y - 3), Vector2(sz.x * 0.5, sz.y + 3)]), Color.WHITE))
		var ngt := L.find_id("#next-goal-t")
		if ngt: font(ngt, 1.15, INK, 0.0)
	_battle_btn(L)
	for e in L.find_all(".chest-slot.empty"):
		strip(L, e)
		under(e, func(d: Node2D, sz: Vector2):
			var r := Rect2(Vector2(2, 2), sz - Vector2(4, 4))
			d.draw_style_box(sb(Color(0, 0, 0, 0.35), 12), r)
			_dash_rect(d, r.grow(-2), Color(1, 1, 1, 0.28), 2.5))
		var st := L.find_in(e, ".cs-state")
		if st: font(st, 1.15, Color(1, 1, 1, 0.6), 0.0)

static func _dash_rect(d: CanvasItem, r: Rect2, c: Color, w: float) -> void:
	var pts := [r.position, Vector2(r.end.x, r.position.y), r.end, Vector2(r.position.x, r.end.y), r.position]
	for i in 4:
		var a: Vector2 = pts[i]
		var b: Vector2 = pts[i + 1]
		var L := a.distance_to(b)
		var dir := (b - a) / L
		var s := 6.0
		while s < L - 6.0:
			d.draw_line(a + dir * s, a + dir * minf(s + 7.0, L - 6.0), c, w)
			s += 12.0

static func _duo(L: Lyr, n: Lyr.N, col: Color) -> void:
	if n == null: return
	strip(L, n)
	under(n, func(d: Node2D, sz: Vector2):
		var r := Rect2(Vector2(1, 1), sz - Vector2(2, 6))
		panel(d, r, col, 12, 4.0)
		rays(d, r, Vector2(37, sz.y * 0.48), Color(1, 1, 1, 0.13), 14, 0.12, 4.0)
		halftone(d, r.grow(-4), Color(0, 0, 0, 0.18), 7.0, 4, 2.0)
		d.draw_circle(Vector2(37, sz.y * 0.47), 26, Color(0, 0, 0, 0.22)))
	for k in n.kids:
		if String(k.d.key).begins_with(".duo-t"): fonts(k, 1.12, Color.WHITE, 1.6)

## SAVAŞ düğmesi: iki tonlu sarı-turuncu, kalın mürekkep, nabız atan dış halka + parıltı süpürmesi
static func _battle_btn(L: Lyr) -> void:
	var b := L.find_id("#btn-start")
	if b == null: return
	strip(L, b)
	for k in b.kids:
		if String(k.d.key).begins_with(".bb-shine"): hide(L, k)
	under(b, func(d: Drawer, sz: Vector2):
		var r := Rect2(Vector2(2, 2), sz - Vector2(4, 8))
		# nabız halkası
		var k := fmod(d.t, 1.6) / 1.6
		var gr := r.grow(3.0 + k * 10.0)
		d.draw_style_box(sb(Color(0, 0, 0, 0), 20 + k * 8, 3.0, Color(YEL, 0.55 * (1.0 - k))), gr)
		d.draw_style_box(sb(INK, 18), Rect2(r.position + Vector2(0, 7), r.size))
		d.draw_style_box(sb(ORANGE, 18), r)
		d.draw_style_box(sb(Color("#ffc21a"), 18), Rect2(r.position, Vector2(r.size.x, r.size.y * 0.56)))
		rays(d, r, Vector2(r.size.x * 0.22, r.size.y * 0.5), Color(1, 1, 1, 0.12), 18, 0.08, 5.0)
		# parıltı süpürmesi (2,6 sn'de bir)
		var ks := fmod(d.t, 2.6) / 0.7
		if ks < 1.0:
			var x := lerpf(r.position.x - 60, r.end.x + 20, ks)
			var box := PackedVector2Array([r.position + Vector2(5, 5), Vector2(r.end.x - 5, r.position.y + 5), r.end - Vector2(5, 5), Vector2(r.position.x + 5, r.end.y - 5)])
			var q := PackedVector2Array([Vector2(x, r.end.y), Vector2(x + 26, r.end.y), Vector2(x + 56, r.position.y), Vector2(x + 30, r.position.y)])
			for c in Geometry2D.intersect_polygons(q, box):
				if c.size() >= 3: d.draw_colored_polygon(c, Color(1, 1, 1, 0.3))
		d.draw_line(r.position + Vector2(20, 8), Vector2(r.end.x - 20, r.position.y + 8), Color(1, 1, 1, 0.6), 3.0)
		d.draw_style_box(sb(Color(0, 0, 0, 0), 18, 5.0), r), true)
	var tx := L.find(".bb-text")
	if tx:
		var kids: Array = []
		_collect_text(tx, kids)
		for i in kids.size():
			var t: Lyr.N = kids[i]
			if i == 0: font(t, 1.18, Color.WHITE, 3.0, 4.0)
			else: font(t, 1.12, INK, 0.0)
	var bl := L.find(".bb-blades")
	if bl:
		under(bl, func(d: Node2D, sz: Vector2):
			var c := sz * 0.5
			d.draw_circle(c + Vector2(2, 3), sz.x * 0.62, INK)
			d.draw_circle(c, sz.x * 0.62, INK)
			d.draw_circle(c, sz.x * 0.62 - 3.5, Color("#e8322c")))

static func _collect_text(n: Lyr.N, out: Array) -> void:
	if n.txt: out.append(n)
	for k in n.kids: _collect_text(k, out)

## dolu sandık yuvası (cs_* katmanı): sandık renginde panel, hazırsa sarı nabız
static func skin_slot(S: Lyr, t: String, st: String) -> void:
	var root: Lyr.N = S.nodes[0]
	strip(S, root)
	var C: Dictionary = ChestSystem.chests().get(t, {})
	var col := JS.col(C.get("color", "#8a6a4a"))
	var ready := st == "ready"
	under(root, func(d: Drawer, sz: Vector2):
		var r := Rect2(Vector2(2, 2), sz - Vector2(4, 6))
		if ready:
			var k := fmod(d.t, 1.2) / 1.2
			d.draw_style_box(sb(Color(0, 0, 0, 0), 14 + k * 6, 3.0, Color(YEL, 0.7 * (1.0 - k))), r.grow(2.0 + k * 7.0))
		panel(d, r, col.darkened(0.15) if not ready else col, 12, 3.5)
		rays(d, r, Vector2(sz.x * 0.5, 38), Color(1, 1, 1, 0.12 if ready else 0.06), 14, 0.12, 4.0)
		halftone(d, r.grow(-4), Color(0, 0, 0, 0.25), 7.0, 4, 1.8)
		d.draw_rect(Rect2(r.position.x + 3, r.end.y - 26, r.size.x - 6, 23), Color(INK, 0.55)), ready)
	for k in root.kids:
		var key := String(k.d.key)
		if key.begins_with(".cs-glow") or key.begins_with(".cs-rays"): hide(S, k)
		elif key.begins_with(".cs-state"):
			if k.img:
				k.d["_skin"] = true
				k.img.visible = false
				under(k, func(d: Node2D, sz: Vector2): panel(d, Rect2(Vector2(-4, -1), sz + Vector2(8, 2)), YEL, 7, 2.5, Vector2(1, 2), false))
				font(k, 1.15, INK, 0.0)
			else:
				font(k, 1.2, Color.WHITE, 1.4, 1.5)
		elif key.begins_with(".cs-skip"):
			strip(S, k)
			under(k, func(d: Node2D, sz: Vector2): panel(d, Rect2(Vector2.ZERO, sz), Color("#4cbf5e"), sz.y * 0.5, 2.5, Vector2(1, 2), false))
			font(k, 1.1, Color.WHITE, 1.2, 1.2)
