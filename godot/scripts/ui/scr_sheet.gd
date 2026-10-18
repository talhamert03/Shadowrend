class_name ScrSheet
extends Scr
## ui.js openSheet / closeSheet — genel alt sayfa (#screen-sheet): üst başlık + kaydırılan
## gövde + eylem düğmeleri. Örnekler: OLASILIKLAR (showOdds), yasal belgeler (showLegal),
## TÜM VERİLERİ SİL (confirmWipe). Yakalama: sh_odds_<tür>, sh_doc_<k>, sh_wipe.

var L: Lyr
var _on_close := Callable()
var _t := 0.0
var _card: Lyr.N

func _init(game) -> void:
	super(game)
	name = "Sheet"

## yakalanmış bir sayfayı aç; acts[i] = #sh-actions içindeki i. düğmenin geri çağrısı
## (boş Callable → kapat)
func show_key(key: String, acts: Array = [], on_close := Callable()) -> Lyr:
	if not FileAccess.file_exists(Lyr.BASE + key + ".json"): return null
	if L:
		unbtn(L)
		L.queue_free()
	L = Lyr.make(key)
	add_child(L)
	L.stretch_h(Scr.dh_of(self))
	_card = L.find(".sh-card")
	var body := L.find_id("#sh-body")
	if body: scroll_area(L, body)
	btn(L, L.nodes[0], func(): close(), 1.0, 0.0)
	if _card: btn(L, _card, func(): pass, 1.0, 0.0)
	btn(L, L.find_id("#sh-close"), func(): g.audio.play("click"); close())
	var act := L.find_id("#sh-actions")
	if act:
		var i := 0
		for b in act.kids:
			if String(b.d.get("kind", "el")) != "el": continue
			var cb: Callable = acts[i] if i < acts.size() and acts[i] is Callable else Callable()
			btn(L, b, func():
				g.audio.play("click")
				if cb.is_valid(): cb.call()
				else: close())
			i += 1
	_on_close = on_close
	_t = 0.0
	visible = true
	g.audio.play("panel")
	return L

func close() -> void:
	if not visible: return
	visible = false
	if L:
		unbtn(L)
		L.queue_free()
		L = null
		_card = null
	var cb := _on_close
	_on_close = Callable()
	if cb.is_valid(): cb.call()

func _process(dt: float) -> void:
	if not visible or L == null or _t > 0.3: return
	_t += dt
	var k := clampf(_t / 0.22, 0.0, 1.0)
	L.modulate.a = k
	if _card:
		_card.extra = Transform2D(0, Vector2.ONE, 0, Vector2(0, (1.0 - UIK.bez(0.2, 0.8, 0.2, 1.0, k)) * 18.0))
		L.set_dyn(_card)

# ═════════════ örnekler ═════════════

static func pc(p: float) -> String:
	if p <= 0.0: return "—"
	if p < 0.001: return "<%0,1"
	var s := ("%.1f" % (p * 100.0)) if p < 0.1 else str(int(round(p * 100.0)))
	return "%" + s.replace(".", ",")

## OLASILIKLAR — değerler oyunun kendi ödül zarından (g.chests.odds)
func odds(t: String) -> void:
	var S := show_key("sh_odds_" + t)
	if S == null: return
	var o: Dictionary = g.chests.odds(t)
	var top: Dictionary = o.top
	var V := {
		"Altın": ["%100", (JS.s(o.gold[0]) + "–" + JS.s(o.gold[1])) if o.get("gold") else ""],
		"Efsane": [pc(top.legend), ""], "Epik": [pc(top.epic), ""], "Nadir": [pc(top.rare), ""], "Yaygın": [pc(top.common), ""],
		"Yalnız altın": [pc(top.none), "eşya çıkmaz"],
		"Gem": [pc(o.gem), (JS.s(o.gemRange[0]) + "–" + JS.s(o.gemRange[1])) if o.get("gemRange") else ""],
		"Kahraman kartı": [pc(o.hero), ("efsane kahraman " + pc(o.heroLeg)) if float(o.heroLeg) > 0 else ""],
		"Silah kilidi": [pc(o.weapon), ""],
	}
	for row in S.find_all(".od-row"):
		var k: Lyr.N = null
		var v: Lyr.N = null
		for c in row.kids:
			if String(c.d.key).begins_with(".od-k"): k = c
			elif String(c.d.key).begins_with(".od-v"): v = c
		if k == null or k.txt == null: continue
		var lab := str(k.d.text.get("str", "")).strip_edges()
		if not V.has(lab): continue
		EventsPage.txt(S, v, V[lab][0], 1.0)
		for e in k.kids:
			if e.d.get("tag") == "em" and V[lab][1] != "": EventsPage.txt(S, e, V[lab][1], 0.0)
	var pity := S.find(".od-pity")
	if pity:
		var bs := pity.kids.filter(func(c): return c.d.get("tag") == "b")
		if bs.size() >= 2: EventsPage.txt(S, bs[1], str(g.chests.pity_count()) + "/" + str(ChestSystem.PITY_N), 0.0)

## yasal belge: kabuk yakalaması + gövde (assets/ui/legal.json) zengin metinle dizilir —
## .lg-doc { 12,5 px · satır 1,6 · #cfc8cf } · p { alt 10 } · h4 { Cinzel 11 · üst 16 alt 6 } · b { --bone }
static var _legal := {}
func doc(k: String, on_close := Callable()) -> void:
	var S := show_key("sh_doc_" + k, [], on_close)
	if S == null: return
	if _legal.is_empty():
		var f := FileAccess.open("res://assets/ui/legal.json", FileAccess.READ)
		if f: _legal = JSON.parse_string(f.get_as_text())
	var D0: Dictionary = _legal.get(k, {})
	var host := S.find(".lg-doc")
	var body := S.find_id("#sh-body")
	if host == null or D0.is_empty(): return
	var mat := S.clip_mat(body) if body else null
	var y := 0.0
	var prev_mb := 0.0
	var re := RegEx.new()
	re.compile("<(p|h4)([^>]*)>([\\s\\S]*?)</\\1>")
	for m in re.search_all(str(D0.get("body", ""))):
		var tag := m.get_string(1)
		var cls := m.get_string(2)
		var inner := m.get_string(3).strip_edges()
		var h4 := tag == "h4"
		var date := cls.contains("lg-date")
		var mt := 16.0 if h4 else (14.0 if date else 0.0)
		var mb := 6.0 if h4 else 10.0
		y += maxf(prev_mb, mt)
		var rt := RichTextLabel.new()
		rt.bbcode_enabled = true
		rt.fit_content = true
		rt.scroll_active = false
		rt.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
		rt.mouse_filter = Control.MOUSE_FILTER_IGNORE
		var fs := 11 if h4 or date else 13
		rt.add_theme_font_override("normal_font", load("res://assets/fonts/Cinzel.ttf") if h4 else load("res://assets/fonts/ChakraPetch-Regular.ttf"))
		rt.add_theme_font_override("bold_font", load("res://assets/fonts/ChakraPetch-SemiBold.ttf"))
		rt.add_theme_font_size_override("normal_font_size", fs)
		rt.add_theme_font_size_override("bold_font_size", fs)
		rt.add_theme_color_override("default_color", Color("#d8a284") if h4 else (Color("#8b8494") if date else Color("#cfc8cf")))
		rt.add_theme_constant_override("line_separation", 2 if h4 else int(round(12.5 * 1.6 - 15.0)))
		var txt := inner.replace("<b>", "[color=#f0eae4][b]").replace("</b>", "[/b][/color]")
		txt = txt.replace("<br>", "\n").replace("&amp;", "&")
		if h4: txt = Lyr.tr_upper(txt)
		rt.position = Vector2(0, y)
		rt.size = Vector2(host.size.x, 0)
		rt.text = txt
		if mat: rt.material = mat
		host.node.add_child(rt)
		y += rt.get_content_height()
		prev_mb = mb
	y += prev_mb
	# kaydırma boyu metne göre
	if body:
		var Sd = body.d.get("scroll")
		if Sd is Dictionary: Sd.h = float(Sd.h) + (y - host.size.y)
		host.size.y = y

## TÜM VERİLERİ SİL — kh_ anahtarları + kayıt silinir, oyun baştan yüklenir
func wipe() -> void:
	show_key("sh_wipe", [Callable(), func():
		for k in Store.keys():
			if String(k).begins_with("kh_"): Store.remove_item(k)
		Store.flush()
		get_tree().reload_current_scene()])
