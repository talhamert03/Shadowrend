class_name EventsPage
extends Node2D
## ETKİNLİK (v3): üstte BU HAFTA afişi, altında üç büyük etkinlik afişi (KUPA YOLU · SONSUZ KULE ·
## GÜNLÜK HEDEF). Afişler sırayla kayarak girer; resim süzülür, parıltı süzülür, hazır ödül
## rozeti nabız atar. Dokununca etkinliğin tam ekran çizgi roman katmanı açılır (ScrEvent).
## Kabuk pg_etkinlik (#week-box atlanır).

const HERO_Y := 60.0
const HERO_H := 176.0

var menu
var g
var shell: Lyr
var root: Lyr.N
var wb: Lyr.N                   # #week-box
var _wb0 := Vector2.ZERO        # yakalamada #week-box mutlak konumu
var _wb_h0 := 0.0
var _scroll_h0 := 0.0
var _items: Array = []
var _anims: Array = []
var _t := 0.0

func _init(m) -> void:
	menu = m
	g = m.g
	name = "Events"

func render() -> void:
	if shell == null:
		shell = Lyr.make("pg_etkinlik")
		add_child(shell)
		shell.stretch_h(Scr.dh_of(self))
		root = shell.nodes[0]
		menu.scroll_area(shell, root)
		wb = shell.find_id("#week-box")
		var R: Array = Lyr.load_json("pg_etkinlik").get("rect", [0, 0, 0, 0])
		if wb:
			_wb0 = Vector2(float(R[0]), float(R[1])) + shell.rect_of(wb).position
			_wb_h0 = wb.size.y
		var S = root.d.get("scroll")
		if S is Dictionary: _scroll_h0 = float(S.h)
	for it in _items:
		if it is Lyr: menu.unbtn(it)
		(it as Node).queue_free()
	_items.clear()
	if wb == null: return
	var dLeft: int = Journey.daily_left(g.meta)
	var kReady := _kupa_ready()
	_anims.clear()
	var bottom := _hero()
	bottom = maxf(bottom, _home(dLeft, kReady))
	_t = 0.0
	# kaydırma içeriği: #week-box yüksekliği içeriğe göre
	var dh := bottom - _wb_h0
	var S = root.d.get("scroll")
	if S is Dictionary: S.h = _scroll_h0 + dh
	shell.set_scroll(root, clampf(root.scroll_y, 0.0, shell.scroll_max(root)))

# ═════════════ yardımcılar ═════════════

## tek satır yazı: kutunun sol (0) / orta (0,5) / sağ (1) noktası sabit kalır
static func txt(L: Lyr, n: Lyr.N, s: String, anchor := 0.5) -> float:
	if n == null or n.txt == null: return 0.0
	var x0 := n.txt.position.x
	var w0 := n.txt.wrap_w
	L.set_text(n, s)
	var w1 := n.txt.wrap_w
	n.txt.position.x = x0 + (w0 - w1) * anchor
	if n.txt_shadow: n.txt_shadow.position.x = n.txt.position.x
	return w1 - w0

## "ÖN EK <b>sayı</b>" satırı: grup bütün olarak sol/orta/sağa yaslı kalır
static func inline_num(L: Lyr, par: Lyr.N, b: Lyr.N, s: String, anchor := 0.5) -> void:
	if b == null or b.txt == null: return
	var w0 := b.txt.text_width()
	L.set_text(b, s)
	var dw := b.txt.text_width() - w0
	if absf(dw) < 0.01: return
	L.fit_width(b, b.size.x + dw, false)
	var sh := -dw * anchor
	L.move(b, b.pos + Vector2(sh, 0))
	if par and par.txt:
		par.txt.position.x += sh
		if par.txt_shadow: par.txt_shadow.position.x = par.txt.position.x

func _kupa_ready() -> int:
	var n := 0
	for m in D.SURVIVAL_MILESTONES:
		if not g.milestone_claimed(m.id) and g.can_claim_milestone(m): n += 1
	return n

# ═════════════ BU HAFTA afişi + sekmeler ═════════════

## başlık düğümü (#week-box içinde, yakalama koordinatından)
func _hdr(y: float) -> Node2D:
	var n := Node2D.new()
	n.position = Vector2(14.0, y) - _wb0
	wb.host.add_child(n)
	_items.append(n)
	return n

static func _ut(disp: bool, w: int, sz: float, ls: float, col, s: String, sh := "0 1px 3px rgba(0,0,0,0.85)") -> UIText:
	var t := UIText.new()
	t.style(disp, w, sz, ls, col, sh)
	t.nowrap = true
	t.text = s
	return t

## BU HAFTA — resimli afiş: öne çıkan dünyanın göğü (ay) + boss adası, solda okunur perde,
## etkinlik adı, satırı, kalan süre, sezon bölümü ve şeritleri
func _hero() -> float:
	var C: Dictionary = Calendar.current(D.WORLDS.size())
	var wn := int(C.featured) if int(C.featured) >= 1 and int(C.featured) <= D.WORLDS.size() else 1
	var wd: Dictionary = D.WORLDS[wn - 1]
	var wc := JS.col(wd.color)
	var W := 362.0
	var H := HERO_H
	var R := _hdr(HERO_Y)
	var sky := UITex.get_tex(ClimbArt.BASE + "w" + str(wn) + "/tall_back.png")
	if sky: R.add_child(UIK.round_image(sky, W, H, 16, Vector2(0.5, 0.05)))
	# boss adası sağda, afişin üst kenarından taşar (Clash Royale afişi gibi)
	var isle := Node2D.new()
	var slot: Dictionary = ClimbArt.meta().get("worlds", {}).get(str(wn), {}).get("slots", {}).get("b9", {})
	var isc := 58.0 / float(ClimbArt.meta().get("R0", 90)) / float(ClimbArt.meta().get("dpr", 2))
	for part in [["body", "_b"], ["top", "_s"]]:
		var mm = slot.get(part[0])
		var tx := UITex.get_tex(ClimbArt.BASE + "w" + str(wn) + "/b9" + part[1] + ".png")
		if mm is Dictionary and tx:
			var sp := Sprite2D.new()
			sp.texture = tx
			sp.centered = false
			sp.scale = Vector2(float(mm.w) / tx.get_width(), float(mm.h) / tx.get_height()) * isc
			sp.position = -Vector2(float(mm.ax), float(mm.ay)) * isc
			isle.add_child(sp)
	isle.position = Vector2(W - 70.0, H - 58.0)
	# okunur perde: soldan sağa koyudan saydama
	var gr := Gradient.new()
	gr.offsets = PackedFloat32Array([0.0, 0.5, 0.78])
	gr.colors = PackedColorArray([Color(0.03, 0.02, 0.05, 0.92), Color(0.03, 0.02, 0.05, 0.62), Color(0.03, 0.02, 0.05, 0.0)])
	var gt := GradientTexture2D.new()
	gt.gradient = gr
	gt.width = 256
	gt.height = 120
	R.add_child(UIK.round_image(gt, W, H, 16, Vector2(0.5, 0.5)))
	R.add_child(isle)
	var deco := Node2D.new()
	R.add_child(deco)
	var w: int = Journey.season_week()
	var SN: Dictionary = Journey.SEASON[w]
	var ns: int = Journey.SEASON.size()
	deco.draw.connect(func():
		var bd := StyleBoxFlat.new()
		bd.bg_color = Color(0, 0, 0, 0)
		bd.set_corner_radius_all(16)
		bd.set_border_width_all(2)
		bd.border_color = Color(wc.lerp(Color("#e9b86a"), 0.5), 0.75)
		deco.draw_style_box(bd, Rect2(0, 0, W, H))
		# sezon şeritleri
		for i in ns:
			var c := Color("#e9b86a") if i < w else (wc.lerp(Color.WHITE, 0.3) if i == w else Color(1, 1, 1, 0.16))
			deco.draw_rect(Rect2(18 + i * 26, H - 18, 22, 4), c)
		# kalan süre hapı
		var pill := StyleBoxFlat.new()
		pill.bg_color = Color(0.04, 0.03, 0.06, 0.78)
		pill.set_corner_radius_all(11)
		pill.set_border_width_all(1)
		pill.border_color = Color(1, 1, 1, 0.14)
		deco.draw_style_box(pill, Rect2(W - 104, 12, 92, 22)))
	var left := maxf(0.0, float(C.leftMs))
	var dd := int(floor(left / 864e5))
	var hh := int(floor(fmod(left, 864e5) / 36e5))
	var fw = D.WORLDS[int(C.featured) - 1] if int(C.featured) >= 1 and int(C.featured) <= D.WORLDS.size() else null
	var line: String = (str(fw.name) + " haritasında altın ×2") if C.ev.id == "biyom" and fw else str(C.ev.line)
	var eye := _ut(false, 700, 10.5, 3.0, wc.lerp(Color.WHITE, 0.5), "BU HAFTA" + (" · HAFTA SONU" if C.weekend else ""))
	eye.position = Vector2(18, 16)
	R.add_child(eye)
	var tm := _ut(false, 700, 11, 0.6, "#f4e9dd", (str(dd) + " GÜN " + str(hh) + " SA") if dd > 0 else (str(hh) + " SA"))
	tm.align = 0.5
	tm.wrap_w = 92
	tm.position = Vector2(W - 104, 15)
	R.add_child(tm)
	var ti := _ut(true, 800, 28, 1.2, "#fff4e6", str(C.ev.name), "0 0 16px #" + wc.to_html(false) + ", 0 2px 6px rgba(0,0,0,0.9)")
	ti.position = Vector2(16, 34)
	R.add_child(ti)
	var ln := _ut(false, 600, 12.5, 0.2, "#e2d9dc", line)
	ln.nowrap = false
	ln.max_lines = 2
	ln.wrap_w = 200
	ln.position = Vector2(18, 78)
	R.add_child(ln)
	var ss := _ut(false, 700, 9.5, 1.6, "#d8b98a", "SEZON · BÖLÜM " + str(w + 1) + "/" + str(ns) + " · " + str(SN.n))
	ss.position = Vector2(18, H - 38)
	R.add_child(ss)
	return HERO_Y + H - _wb0.y

func _tab_tap(t: String) -> void:
	g.audio.play("tab")
	g.ui.show_event(t)

# ═════════════ ana görünüm: büyük etkinlik afişleri ═════════════

const BANNERS := [
	{"t": "kupa", "n": "KUPA YOLU", "w": 2, "col": "#ffb43c", "art": "res://assets/ui/art/icon/kadeh.png"},
	{"t": "zirve", "n": "SONSUZ KULE", "w": 10, "col": "#b98cff", "art": "res://assets/ui/art/icon/tac.png"},
	{"t": "gunluk", "n": "GÜNLÜK HEDEFLER", "w": 6, "col": "#ff7a5c", "art": "res://assets/ui/art/chest/t1.png"},
]
const BAN_H := 126.0
const BAN_GAP := 14.0

func _sub_of(t: String, dLeft: int, kReady: int) -> String:
	match t:
		"kupa": return (str(kReady) + " ÖDÜL HAZIR!") if kReady > 0 else (str(g.survival_minutes()) + " dk hayatta kaldın · ödül yolu")
		"zirve": return "KAT " + str(int(SideModes.tower_book(g.meta).cur)) + " · kuleye tırman, rekorunu geç"
		"gunluk": return (str(3 - dLeft) + " / 3 hedef · sandık seni bekliyor") if dLeft > 0 else "Bugünlük tamam · yarın yenilenir"
	return ""

func _home(dLeft: int, kReady: int) -> float:
	var y := HERO_Y + HERO_H + 18.0
	var W := 362.0
	var H := BAN_H
	var idx := 0
	for B in BANNERS:
		var t: String = B.t
		var col := Color(String(B.col))
		var hot := (t == "kupa" and kReady > 0) or (t == "gunluk" and dLeft > 0)
		var L := Lyr.new()
		L.build({"nodes": [{"id": "0", "key": ".ev-ban", "box": [0, 0, W, H], "origin": [W * 0.5, H * 0.5]}]})
		L.position = Vector2(14.0, y) - _wb0
		wb.host.add_child(L)
		_items.append(L)
		var host: Node2D = L.nodes[0].node
		# zemin: dünyanın göğü + soldan koyu perde
		var sky := UITex.get_tex(ClimbArt.BASE + "w" + str(int(B.w)) + "/tall_back.png")
		if sky: host.add_child(UIK.round_image(sky, W, H, 16, Vector2(0.5, 0.35)))
		var gr := Gradient.new()
		gr.offsets = PackedFloat32Array([0.0, 0.55, 1.0])
		gr.colors = PackedColorArray([Color(0.06, 0.01, 0.02, 0.9), Color(0.06, 0.01, 0.02, 0.45), Color(0.06, 0.01, 0.02, 0.05)])
		var gt := GradientTexture2D.new()
		gt.gradient = gr
		gt.width = 256
		gt.height = 64
		host.add_child(UIK.round_image(gt, W, H, 16, Vector2(0.5, 0.5)))
		# dönen ışınlar (resmin arkasında)
		var rays := Node2D.new()
		rays.position = Vector2(W - 70, H * 0.5)
		host.add_child(rays)
		rays.draw.connect(func():
			var V := PackedVector2Array()
			var box := PackedVector2Array([Vector2(-W + 76, -H * 0.5 + 3), Vector2(67, -H * 0.5 + 3), Vector2(67, H * 0.5 - 3), Vector2(-W + 76, H * 0.5 - 3)])
			for i in 12:
				var a := i * TAU / 12.0 + _t * 0.4
				var tri := PackedVector2Array([Vector2.ZERO, Vector2(cos(a - 0.12), sin(a - 0.12)) * 160, Vector2(cos(a + 0.12), sin(a + 0.12)) * 160])
				for q in Geometry2D.intersect_polygons(tri, box):
					if q.size() >= 3: ComicSkin._fan(V, q)
			ComicSkin.draw_tris(rays, V, Color(col, 0.16)))
		var gl := Sprite2D.new()
		gl.texture = ClimbArt.glow_tex()
		var gm := CanvasItemMaterial.new()
		gm.blend_mode = CanvasItemMaterial.BLEND_MODE_ADD
		gl.material = gm
		gl.modulate = Color(col, 0.6)
		gl.scale = Vector2.ONE * (170.0 / 128.0)
		gl.position = Vector2(W - 70, H * 0.5)
		host.add_child(gl)
		var art := Node2D.new()
		art.position = Vector2(W - 70, H * 0.5)
		host.add_child(art)
		var tex := UITex.get_tex(String(B.art))
		if tex:
			var sp := Sprite2D.new()
			sp.texture = tex
			sp.scale = Vector2.ONE * ((84.0 if t == "gunluk" else 74.0) / maxf(tex.get_width(), tex.get_height()))
			if t != "gunluk": sp.modulate = col.lerp(Color.WHITE, 0.45) * Color(1.25, 1.25, 1.25)
			art.add_child(sp)
		var fr := Node2D.new()
		host.add_child(fr)
		fr.draw.connect(func():
			# parıltı süpürmesi
			var sx := fmod(_t * 0.55 + idx * 0.37, 2.2) / 2.2 * (W + 260) - 130
			var pts := PackedVector2Array()
			for q in [Vector2(sx, 4), Vector2(sx + 34, 4), Vector2(sx + 4, H - 4), Vector2(sx - 30, H - 4)]:
				pts.append(Vector2(clampf(q.x, 12, W - 12), q.y))
			if pts[1].x - pts[0].x > 2: fr.draw_colored_polygon(pts, Color(1, 1, 1, 0.10))
			var bd := StyleBoxFlat.new()
			bd.bg_color = Color(0, 0, 0, 0)
			bd.set_corner_radius_all(16)
			bd.set_border_width_all(3)
			var k := 0.5 + 0.5 * sin(_t * 3.2)
			bd.border_color = Color(col, 0.6 + 0.4 * k) if hot else Color(col.lerp(Color("#e9b86a"), 0.4), 0.5)
			bd.shadow_color = Color(col, 0.2 + 0.25 * k) if hot else Color(0, 0, 0, 0.5)
			bd.shadow_size = 12 if hot else 6
			bd.anti_aliasing = true
			fr.draw_style_box(bd, Rect2(0, 0, W, H))
			# sol renk şeridi
			var st := StyleBoxFlat.new()
			st.bg_color = col
			st.corner_radius_top_left = 16
			st.corner_radius_bottom_left = 16
			fr.draw_style_box(st, Rect2(0, 0, 7, H))
			# OYNA hapı
			var pr := Rect2(20, H - 40, 92, 26)
			fr.draw_style_box(ComicSkin.sb(Color(0.05, 0.03, 0.07), 13), Rect2(pr.position + Vector2(2, 3), pr.size))
			fr.draw_style_box(ComicSkin.sb(col.darkened(0.15), 13, 2.5, Color(0.05, 0.03, 0.07)), pr)
			var a := Vector2(pr.end.x - 14, pr.position.y + 13)
			fr.draw_polyline(PackedVector2Array([a + Vector2(-4, -6), a, a + Vector2(-4, 6)]), Color.WHITE, 3.0, true))
		var ti := _ut(true, 800, 23, 1.0, "#fff4e6", String(B.n), "0 0 14px #" + col.to_html(false) + ", 0 2px 5px rgba(0,0,0,0.9)")
		ti.position = Vector2(22, 18)
		host.add_child(ti)
		var sb := _ut(false, 700, 12.5, 0.4, col.lerp(Color.WHITE, 0.55) if not hot else Color("#ffe27a"), _sub_of(t, dLeft, kReady))
		sb.position = Vector2(23, 54)
		host.add_child(sb)
		var go := _ut(false, 800, 12, 1.2, "#ffffff", "ÖDÜL AL" if (t == "kupa" and kReady > 0) else "OYNA", "0 1px 2px rgba(0,0,0,0.9)")
		go.align = 0.5
		go.wrap_w = 72
		go.position = Vector2(24, H - 35)
		host.add_child(go)
		var bd2: Node2D = null
		if hot:
			bd2 = Node2D.new()
			bd2.position = Vector2(W - 20, 18)
			host.add_child(bd2)
			bd2.draw.connect(func():
				bd2.draw_circle(Vector2(1, 2), 11.0, Color(0.05, 0.03, 0.07))
				bd2.draw_circle(Vector2.ZERO, 11.0, Color("#ff3b4e"))
				bd2.draw_arc(Vector2.ZERO, 11.0, 0, TAU, 24, Color(1, 1, 1, 0.7), 1.6, true))
			var bt := _ut(false, 800, 13, 0, "#ffffff", "!")
			bt.align = 0.5
			bt.wrap_w = 20
			bt.position = Vector2(-10, -9.5)
			bd2.add_child(bt)
		var tt := t
		menu.btn(L, L.nodes[0], func(): _tab_tap(tt), 0.96)
		_anims.append({"n": L, "x": L.position.x, "d": 0.06 + idx * 0.09, "art": art, "ay": art.position.y, "gl": gl, "ga": gl.modulate.a, "fx": fr, "rays": rays, "badge": bd2})
		L.position.x += 420.0
		y += H + BAN_GAP
		idx += 1
	return y - _wb0.y

func _process(dt: float) -> void:
	if _anims.is_empty() or not is_visible_in_tree(): return
	_t += dt
	for A in _anims:
		var L: Node2D = A.n
		if not is_instance_valid(L): continue
		# giriş: sağdan kayarak + hafif aşma
		var k := clampf((_t - float(A.d)) / 0.42, 0.0, 1.0)
		var e := ScrLevelUp._back_ease(k) if k < 1.0 else 1.0
		L.position.x = float(A.x) + (1.0 - e) * 420.0
		L.modulate.a = clampf(k * 2.5, 0.0, 1.0)
		var art: Node2D = A.art
		if art: art.position.y = float(A.ay) + sin(_t * 2.2 + float(A.d) * 7.0) * 4.0
		var gl: Sprite2D = A.gl
		if gl: gl.modulate.a = float(A.ga) * (0.75 + 0.25 * sin(_t * 3.0 + float(A.d) * 5.0))
		var fx: Node2D = A.fx
		if fx: fx.queue_redraw()
		var rays: Node2D = A.rays
		if rays: rays.queue_redraw()
		var bd = A.badge
		if bd: (bd as Node2D).scale = Vector2.ONE * (1.0 + 0.14 * maxf(0.0, sin(_t * 6.0)))
