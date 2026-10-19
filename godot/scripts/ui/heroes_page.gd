class_name HeroesPage
extends Node2D
## ui.js renderChars — KAHRAMAN sayfası: 3 sütunlu kart ızgarası (CHARACTERS sırası).
## Kart durumu: gizemli (kart yok / kart var), sahip (ilerleme), geliştirilebilir, azami;
## seçili kahraman "SEÇİLİ" rozeti ve gümüş hale taşır. Kart sanatı yakalamada; çubuk
## yazısı/dolumu ve seviye burada yazılır. Dokununca kahraman detayı açılır.
## Yakalama: pg_kahraman (kabuk) · hc_<id>_<m0|mp|own|up|max>[_sel].

const COLS := 3
const GAP_X := 10.0
const GAP_Y := 14.0

var menu
var g
var shell: Lyr
var grid: Lyr.N
var _cards: Array = []

func _init(m) -> void:
	menu = m
	g = m.g
	name = "Heroes"

func render() -> void:
	if shell == null:
		shell = Lyr.make("pg_kahraman", [".hc"])
		add_child(shell)
		shell.stretch_h(Scr.dh_of(self))
		grid = shell.find("#char-grid")
		if shell.nodes[0].scroller: menu.scroll_area(shell, shell.nodes[0])
	for C in _cards:
		menu.unbtn(C)
		(C as Node).queue_free()
	_cards.clear()
	var host: Node2D = grid.host if grid else shell.nodes[0].host
	var colw := (grid.size.x - 8.0 - GAP_X * (COLS - 1)) / COLS if grid else 111.3
	var x0 := 4.0
	var y := 10.0
	var row_h := 0.0
	var i := 0
	# kartlar yerel çizim: Tripo modelinin toon pişirimi (assets/ui/art/hero3d/<id>.png) — kilitli
	# kahramanlar da kendi modeliyle (karartılmış + kilit) görünür; eski web silüetleri kullanılmaz
	var ch := 196.0
	for id in D.CHARACTERS:
		var C := _card(String(id), colw, ch)
		host.add_child(C)
		_cards.append(C)
		var col := i % COLS
		if col == 0 and i > 0:
			y += row_h + GAP_Y
			row_h = 0.0
		C.position = Vector2(x0 + col * (colw + GAP_X), y)
		row_h = maxf(row_h, ch)
		var cid := String(id)
		menu.btn(C, C.nodes[0], func(): g.audio.play("click"); g.ui.open_char_detail(cid), 0.96)
		i += 1
	# kaydırma boyu ızgaraya göre
	var S = shell.nodes[0].d.get("scroll")
	if S is Dictionary and grid:
		S.h = maxf(float(S.h), grid.pos.y + y + row_h + 120.0)

static func _rar(id: String) -> Dictionary:
	var r := int(D.CHARACTERS.get(id, {}).get("rarity", 1))
	var arr: Array = D.CHAR_RARITIES
	return arr[r] if r >= 0 and r < arr.size() and arr[r] != null else {"name": "", "color": "#b8c0cc"}

func _card(id: String, w: float, h: float) -> Lyr:
	var def: Dictionary = D.CHARACTERS.get(id, {})
	var owned: bool = g.owns_char(id)
	var cards: int = g.char_card_count(id)
	var need = g.cards_for_next(id)
	var sel: bool = owned and g.meta.selectedChar == id
	var up: bool = owned and g.can_upgrade_char(id)
	var rar := _rar(id)
	var rc := Color(String(rar.get("color", "#b8c0cc")))
	var L := Lyr.new()
	L.build({"nodes": [{"id": "0", "key": ".hc", "box": [0, 0, w, h], "origin": [w * 0.5, h * 0.5]}]})
	var hn: Node2D = L.nodes[0].node
	var bg := Node2D.new()
	hn.add_child(bg)
	bg.draw.connect(func():
		var sb := StyleBoxFlat.new()
		sb.bg_color = Color("#1a1420")
		sb.set_corner_radius_all(14)
		sb.shadow_color = Color(rc, 0.35) if sel else Color(0, 0, 0, 0.45)
		sb.shadow_size = 12 if sel else 5
		bg.draw_style_box(sb, Rect2(0, 0, w, h))
		bg.draw_set_transform(Vector2.ZERO))
	# portre alanı: kartın yuvarlak köşeli şekline kırpılır (görsel taşmaz)
	var clip := Node2D.new()
	clip.clip_children = CanvasItem.CLIP_CHILDREN_ONLY
	hn.add_child(clip)
	clip.draw.connect(func():
		var m := StyleBoxFlat.new()
		m.bg_color = Color.WHITE
		m.set_corner_radius_all(14)
		clip.draw_style_box(m, Rect2(1, 1, w - 2, h - 2)))
	# nadirlik ışıması (başın arkası; maske düğümü kendisi çizilmez)
	var gl := Sprite2D.new()
	gl.texture = ClimbArt.glow_tex()
	gl.position = Vector2(w * 0.5, h * 0.30)
	gl.scale = Vector2(w * 1.4 / 128.0, h * 0.85 / 128.0)
	gl.modulate = Color(rc, 0.5 if owned else 0.3)
	clip.add_child(gl)
	# model portresi (baştan bele, tools: scripts/dev/hero_bake.gd): kart genişliğini doldurur
	var tx := UITex.get_tex("res://assets/ui/art/hero3d/" + id + ".png")
	if tx:
		var sp := Sprite2D.new()
		sp.texture = tx
		sp.centered = false
		var k := (w + 8.0) / tx.get_width()
		sp.scale = Vector2.ONE * k
		sp.position = Vector2(-4.0, 12.0)
		if not owned: sp.modulate = Color(0.58, 0.56, 0.64) if cards == 0 else Color(0.78, 0.76, 0.84)
		clip.add_child(sp)
	var fr := Node2D.new()
	hn.add_child(fr)
	fr.draw.connect(func():
		# alt plaka (okunurluk): koyu gradyan
		var pl := StyleBoxFlat.new()
		pl.bg_color = Color(0.05, 0.035, 0.07, 0.86)
		pl.corner_radius_bottom_left = 13
		pl.corner_radius_bottom_right = 13
		fr.draw_style_box(pl, Rect2(1, h - 44, w - 2, 43))
		# çerçeve: nadirlik rengi; seçili altın
		var bd := StyleBoxFlat.new()
		bd.bg_color = Color(0, 0, 0, 0)
		bd.set_corner_radius_all(14)
		bd.set_border_width_all(3 if sel else 2)
		bd.border_color = Color("#f2c46d") if sel else Color(rc, 0.85 if owned else 0.5)
		fr.draw_style_box(bd, Rect2(0, 0, w, h))
		# ilerleme çubuğu
		if need != null and (not owned and cards > 0 or owned):
			var bw := w - 20.0
			var tr := StyleBoxFlat.new()
			tr.bg_color = Color(1, 1, 1, 0.10)
			tr.set_corner_radius_all(3)
			fr.draw_style_box(tr, Rect2(10, h - 13, bw, 6))
			var frac := clampf(float(cards) / maxf(1.0, float(need)), 0.0, 1.0)
			if frac > 0.0:
				var fl := StyleBoxFlat.new()
				fl.bg_color = Color("#5be38a") if up else rc.lerp(Color.WHITE, 0.15)
				fl.set_corner_radius_all(3)
				fr.draw_style_box(fl, Rect2(10, h - 13, maxf(6.0, bw * frac), 6)))
	var nm := HeroesPage._lbl(true, 800, 11.5, 0.6, "#fff4e6" if owned else "#c9c0cf", str(def.get("name", id)), w)
	nm.position = Vector2(0, h - 40)
	hn.add_child(nm)
	var sub := ""
	if not owned: sub = (str(cards) + "/" + str(int(need) if need != null else 2) + " KART") if cards > 0 else "SANDIKTAN ÇIKAR"
	elif need == null: sub = "AZAMİ"
	else: sub = "SV " + str(g.char_level(id)) + (" · GELİŞTİR" if up else "")
	var sb2 := HeroesPage._lbl(false, 700, 8.5, 1.2, ("#7dffa8" if up else rc.lerp(Color.WHITE, 0.45).to_html()) if owned else "#9c94a3", sub, w)
	sb2.position = Vector2(0, h - 26)
	hn.add_child(sb2)
	# nadirlik etiketi (sol üst)
	var rt := HeroesPage._lbl(false, 800, 7.5, 1.4, rc.lerp(Color.WHITE, 0.3).to_html(), str(rar.get("name", "")), w - 12)
	rt.align = 0.0
	rt.position = Vector2(9, 7)
	hn.add_child(rt)
	# kilit / seçili rozeti
	if not owned:
		var lk := UITex.get_tex("res://assets/ui/art/icon/lock.png")
		if lk:
			var ls := Sprite2D.new()
			ls.texture = lk
			ls.scale = Vector2.ONE * (15.0 / lk.get_width())
			ls.position = Vector2(w - 15, 15)
			ls.modulate = Color(1, 1, 1, 0.85)
			hn.add_child(ls)
	elif sel:
		var rb := Node2D.new()
		hn.add_child(rb)
		rb.draw.connect(func():
			var pill := StyleBoxFlat.new()
			pill.bg_color = Color("#f2c46d")
			pill.set_corner_radius_all(8)
			rb.draw_style_box(pill, Rect2(w - 52, 6, 46, 15)))
		var st := HeroesPage._lbl(false, 800, 8, 1.0, "#2a1a0a", "SEÇİLİ", 46)
		st.position = Vector2(w - 52, 7)
		hn.add_child(st)
	return L

static func _lbl(disp: bool, wt: int, sz: float, ls: float, col, s: String, w: float) -> UIText:
	var t := UIText.new()
	t.style(disp, wt, sz, ls, col, "0 1px 3px rgba(0,0,0,0.9)")
	t.align = 0.5
	t.nowrap = true
	t.wrap_w = w
	t.text = s
	return t

func _key(id: String) -> String:
	var owned: bool = g.owns_char(id)
	var cards: int = g.char_card_count(id)
	var need = g.cards_for_next(id)
	var st := ""
	if not owned: st = "mp" if cards > 0 else "m0"
	elif need == null: st = "max"
	elif g.can_upgrade_char(id): st = "up"
	else: st = "own"
	var sel: bool = owned and g.meta.selectedChar == id
	return "hc_" + id + "_" + st + ("_sel" if sel else "")

func _texts(C: Lyr, id: String) -> void:
	var owned: bool = g.owns_char(id)
	var cards: int = g.char_card_count(id)
	var need = g.cards_for_next(id)
	var bar := C.find(".hc-bar")
	if bar:
		var b := C.find_exact("b")
		var fill: Lyr.N = null
		for k in bar.kids:
			if k.d.get("tag") == "i": fill = k
		if not owned and cards > 0:
			if b: C.set_text(b, str(cards) + "/" + str(int(need) if need != null else 2))
			UIK.set_fill(C, fill, bar.size.x, float(cards) / maxf(1.0, float(need if need != null else 2)))
		elif owned and need != null and not g.can_upgrade_char(id):
			if b: C.set_text(b, str(cards) + "/" + str(int(need)))
			UIK.set_fill(C, fill, bar.size.x, float(cards) / maxf(1.0, float(need)))
	var lv := C.find(".hc-lvl")
	if lv and owned: C.set_text(lv, str(g.char_level(id)))
