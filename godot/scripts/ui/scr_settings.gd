class_name ScrSettings
extends Scr
## ui.js showSettings / renderSettings / bindSettings — AYARLAR (OYUN · ERİŞİM · HESAP).
## Sekme başına yakalama (set_<sekme>), anahtarlar ters yakalamadan (set_<sekme>_alt)
## alt ağaç geçişiyle; seçenek düğmeleri açık/kapalı görüntü takasıyla; kaydırıcılar
## çizimle (iz + dolum gradyanı + tutamak); sayfa dikeyde kaydırılır.

const EMBER_LO := Color("#7f4130")
const EMBER_HI := Color("#d8a284")
const EMBER := Color("#b06a49")
const TOGGLES := {"set-batt": "batt", "set-shake": "shake", "set-rm": "rm", "set-cb": "cb", "set-big": "big", "set-notif": "notif"}

var tabs := {}               # sekme → Lyr
var cur := "oyun"
var from := "menu"
var _sliders := []           # [{L, n, key, draw}]
var _slide = null            # {S, id}
var _adv := false

class SlideBar extends Node2D:
	var v := 0.5
	var w := 200.0
	var h := 30.0
	func _draw() -> void:
		var y := h * 0.5
		var sb := StyleBoxFlat.new()
		sb.set_corner_radius_all(3)
		sb.bg_color = Color(207 / 255.0, 214 / 255.0, 226 / 255.0, 0.12)
		draw_style_box(sb, Rect2(0, y - 3, w, 6))
		# dolum: ember-lo → ember-hi (p'ye kadar)
		var fw := w * v
		if fw > 0.5:
			var pts := PackedVector2Array([Vector2(0, y - 3), Vector2(fw, y - 3), Vector2(fw, y + 3), Vector2(0, y + 3)])
			var hi := EMBER_LO.lerp(EMBER_HI, 1.0)
			draw_polygon(pts, PackedColorArray([EMBER_LO, hi, hi, EMBER_LO]))
		# tutamak (24 px, kenar 2 px, gölge)
		var cx := clampf(w * v, 12, w - 12)
		var c := Vector2(cx, y)
		draw_circle(c + Vector2(0, 2), 13, Color(0, 0, 0, 0.35))
		draw_circle(c, 12, EMBER)
		draw_circle(c, 10, Color("#e6e1e3"))
		draw_circle(c + Vector2(-2.5, -3), 6, Color("#f6f3f0"))
		draw_circle(c + Vector2(-3, -3.5), 3, Color.WHITE)

func _init(game) -> void:
	super(game)
	name = "Settings"

func show_settings(from_pause: bool) -> void:
	from = "pause" if from_pause else "menu"
	if tabs.is_empty():
		for t in ["oyun", "erisim", "hesap"]:
			var L := Lyr.make("set_" + t)
			add_child(L)
			L.stretch_h(Scr.dh_of(self))
			tabs[t] = L
			_bind(L, t)
	_render()
	_set_tab(cur)
	visible = true
	fade_show()

func _set_tab(t: String) -> void:
	cur = t
	for k in tabs:
		(tabs[k] as Lyr).visible = k == t
		var sh := (tabs[k] as Lyr).find(".set-sheet")
		if sh: (tabs[k] as Lyr).set_scroll(sh, 0.0)

func _bind(L: Lyr, t: String) -> void:
	var sh := L.find(".set-sheet")
	scroll_area(L, sh)
	btn(L, L.find_id("#set-close"), func(): g.audio.play("click"); hide_settings())
	for k in ["oyun", "erisim", "hesap"]:
		var tb := _find_attr(L, ".set-tab", k)
		if tb: btn(L, tb, func(): g.audio.play("click"); _set_tab(k))
	for id in TOGGLES:
		var b := L.find_id("#" + id)
		if b: btn(L, b, func(): _toggle(id), 1.0)
	# kaydırıcılar (çizim)
	for pair in [["#set-sfx", "sfx"], ["#set-music", "music"]]:
		var n := L.find_id(pair[0])
		if n == null: continue
		if n.img: n.img.visible = false
		var sl := SlideBar.new()
		sl.w = n.size.x
		sl.h = n.size.y
		n.node.add_child(sl)
		_sliders.append({"L": L, "n": n, "key": pair[1], "draw": sl})
	# seçenek grupları
	_seg_bind(L, "#set-gfx", ["auto", "low", "mid", "high"], func(i: int): _gfx(["auto", "low", "mid", "high"][i]))
	_seg_bind(L, "#set-hap3", ["off", "soft", "full"], func(i: int): _hap(["off", "soft", "full"][i]))
	_seg_bind(L, "#set-lang", ["tr", "en"], func(i: int): g.audio.play("click"); I18n.set_lang(["tr", "en"][i], get_tree()))
	# hesap: yasal bağlantılar, gelişmiş, sil
	for pair2 in [["#set-support", "support"], ["#set-privacy", "privacy"], ["#set-kvkk", "kvkk"], ["#set-terms", "terms"]]:
		var b2 := L.find_id(pair2[0])
		if b2: btn(L, b2, func(): g.audio.play("click"); g.ui.open_doc(pair2[1]))
	var adv := L.find(".set-adv")
	if adv:
		var sm := L.find("summary")
		if sm: btn(L, sm, func(): g.audio.play("click"); _toggle_adv())
	var wipe := L.find_id("#set-wipe")
	if wipe: btn(L, wipe, func(): g.audio.play("click"); g.ui.confirm_wipe())
	var pid := L.find_id("#set-pid")
	if pid: L.set_text(pid, Store.player_id())
	var ver := L.find_id("#set-ver")
	if ver: L.set_text(ver, "v" + str(ProjectSettings.get_setting("application/config/version", "1.0.0")) + " · " + str(ProjectSettings.get_setting("application/config/build", "44")))

func _find_attr(L: Lyr, key: String, txt: String) -> Lyr.N:
	var map := {"oyun": "OYUN", "erisim": "ERİŞİM", "hesap": "HESAP"}
	# yakalamadaki kaynak metin (çeviri açıkken görünen metin farklıdır)
	for n in L.find_all(key):
		if n.txt and str((n.d.get("text", {}) as Dictionary).get("str", "")).strip_edges() == map.get(txt, txt): return n
	return null

## seçenek grubu: düğmeler; açık görünüm = yakalamada .on olanın görüntüsü/yazı rengi
func _seg_bind(L: Lyr, key: String, vals: Array, cb: Callable) -> void:
	var grp := L.find_id(key)
	if grp == null: return
	var on_e = null
	var off_e = null
	for k in grp.kids:
		var e := [(k.img as Sprite2D).texture if k.img is Sprite2D else null, k.txt.color if k.txt else Color.WHITE, (k.img as Sprite2D).position if k.img is Sprite2D else Vector2.ZERO]
		if String(k.d.key).contains(".on"): on_e = e
		else: off_e = e
	grp.d["_seg"] = [on_e, off_e]
	for i in grp.kids.size():
		var k2: Lyr.N = grp.kids[i]
		var idx := i
		btn(L, k2, func(): cb.call(idx), 0.96)

func _seg_set(L: Lyr, key: String, idx: int) -> void:
	var grp := L.find_id(key)
	if grp == null or not grp.d.has("_seg"): return
	var S: Array = grp.d["_seg"]
	for i in grp.kids.size():
		var k: Lyr.N = grp.kids[i]
		var e = S[0] if i == idx else S[1]
		if e == null: continue
		if k.img is Sprite2D and e[0]:
			(k.img as Sprite2D).texture = e[0]
			(k.img as Sprite2D).position = e[2]
		if k.txt: k.txt.color = e[1]

func _render() -> void:
	var S: Dictionary = Settings.data
	for t in tabs:
		var L: Lyr = tabs[t]
		var gn := L.find_id("#set-gfx-now")
		if gn: L.set_text(gn, Settings.tier_label())
		_seg_set(L, "#set-gfx", ["auto", "low", "mid", "high"].find(str(S.get("gfx", "auto"))))
		var hv := "off" if not S.get("haptics", true) else ("soft" if S.get("hsoft", false) else "full")
		_seg_set(L, "#set-hap3", ["off", "soft", "full"].find(hv))
		_seg_set(L, "#set-lang", ["tr", "en"].find(I18n.lang))
		var sn := L.find_id("#set-sfx-now")
		if sn: L.set_text(sn, str(int(round(float(S.get("sfx", 0.62)) * 100))))
		var mn := L.find_id("#set-music-now")
		if mn: L.set_text(mn, str(int(round(float(S.get("music", 0.5)) * 100))))
		for id in TOGGLES:
			var b := L.find_id("#" + id)
			if b == null: continue
			var on := bool(S.get(TOGGLES[id], false))
			# yakalamada varsayılan: shake açık, diğerleri kapalı; ters yakalama _alt
			var def_on: bool = id == "set-shake"
			L.to_state("set_" + t + ("" if on == def_on else "_alt"), b)
	for sl in _sliders:
		(sl.draw as SlideBar).v = float(S.get(sl.key, 0.5))
		(sl.draw as SlideBar).queue_redraw()

func _toggle(id: String) -> void:
	var key: String = TOGGLES[id]
	var next := not bool(Settings.data.get(key, false))
	Settings.set_value(key, next)
	g.audio.play("click")
	_render()

func _gfx(v: String) -> void:
	g.audio.play("click")
	Settings.set_value("gfx", v)
	_render()

func _hap(v: String) -> void:
	Settings.set_value("haptics", v != "off")
	Settings.set_value("hsoft", v == "soft")
	g.audio.play("click")
	if v != "off": pass  # titreşim kapalı
	_render()

func _toggle_adv() -> void:
	_adv = not _adv
	var L: Lyr = tabs.hesap
	var at := L.t
	remove_child(L)
	L.queue_free()
	L = Lyr.make("set_hesap_adv" if _adv else "set_hesap")
	add_child(L)
	L.stretch_h(Scr.dh_of(self))
	tabs.hesap = L
	# düğme listesini yeniden kur
	clear_btns()
	_sliders.clear()
	for t in tabs: _bind(tabs[t], t)
	_render()
	_set_tab("hesap")
	L.t = at

# ── kaydırıcı sürükleme ──
func _input(ev: InputEvent) -> void:
	if not visible: return
	if ev is InputEventScreenTouch:
		var st := ev as InputEventScreenTouch
		if st.pressed:
			for S in _sliders:
				var L: Lyr = S.L
				if not L.visible: continue
				var r := L.visible_rect_of(S.n)
				if (L.get_global_transform() * r).grow(8).has_point(st.position):
					_slide = {"S": S, "id": st.index}
					_slide_to(st.position.x)
					get_viewport().set_input_as_handled()
					return
		elif _slide and st.index == _slide.id:
			Settings.save()
			if _slide.S.key == "sfx": g.audio.play("click")
			_slide = null
			get_viewport().set_input_as_handled()
			return
	elif ev is InputEventScreenDrag and _slide and (ev as InputEventScreenDrag).index == _slide.id:
		_slide_to((ev as InputEventScreenDrag).position.x)
		get_viewport().set_input_as_handled()
		return
	super(ev)

func _slide_to(x: float) -> void:
	var S: Dictionary = _slide.S
	var L: Lyr = S.L
	var r := L.rect_of(S.n)
	var lx: float = (L.get_global_transform().affine_inverse() * Vector2(x, 0)).x
	var v := clampf((lx - r.position.x - 12) / maxf(1, r.size.x - 24), 0, 1)
	v = roundf(v * 100) / 100.0
	Settings.data[S.key] = v
	Settings.apply_one(S.key)
	_render()

func hide_settings() -> void:
	if not visible: return
	fade_hide(_close_now)

func _close_now() -> void:
	visible = false
