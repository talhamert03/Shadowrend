class_name ScrMenu
extends Scr
## ui.js ana menü kabuğu — gök + zerreler, üst çubuk (hesap seviyesi halkası, altın,
## gem, günlük rozeti, ayarlar), alt gezinme (kayan kor plaka), sayfa geçişleri
## (giren: %6 kaydırma + solma 460/360 ms; çıkan: −%4 · 0,985), SAVAŞ ana sayfası.

const ORDER := ["magaza", "cephane", "savas", "dunyalar", "kahraman", "etkinlik"]
const DOCK := ["magaza", "cephane", "savas", "kahraman", "etkinlik"]

var shell: Lyr
var pages := {}              # sayfa → Lyr
var page := ""
var _t := 0.0
var _slides: Array = []      # [{L, from, to, t0, out}]
var _xpMat: ShaderMaterial
var _ruby := 0.0
var _stone := 0.0
var _tw := {}                # düğüm anahtarı → [from, to, t0]
var home: Lyr
var _map: ClimbArt
var _mapN: Lyr.N

func _init(game) -> void:
	super(game)
	name = "Menu"
	modal = false

func open(p := "savas") -> void:
	if shell == null: _build()
	visible = true
	set_page(p, true)
	refresh_wallet(true)
	_top()

func close() -> void:
	visible = false

func _build() -> void:
	shell = Lyr.make("menu_savas", [".menu-page", "#daily-drawer"])
	add_child(shell)
	shell.stretch_h(Scr.dh_of(self))
	# hesap seviyesi XP halkası (conic) — yakalanan iz yerine gölgelendirici
	var lv := shell.find_id("#tb-level")
	if lv:
		for k in lv.kids:
			if String(k.d.key).ends_with("::before"):
				if k.img: k.img.visible = false
				_xpMat = UIK.shader_mat("res://shaders/ui/conic_ring.gdshader")
				var cr := ColorRect.new()
				cr.material = _xpMat
				cr.mouse_filter = Control.MOUSE_FILTER_IGNORE
				var R: float = k.size.x * 0.5
				_xpMat.set_shader_parameter("r_out", R)
				_xpMat.set_shader_parameter("r_in", R * 1.41421 * 0.61)
				_xpMat.set_shader_parameter("pad", 2.0)
				_xpMat.set_shader_parameter("c0", Color("#d8a284"))
				_xpMat.set_shader_parameter("c1", Color("#d8a284"))
				_xpMat.set_shader_parameter("glow", Color(0, 0, 0, 0))
				cr.size = Vector2.ONE * (R + 2.0) * 2.0
				cr.position = k.size * 0.5 - cr.size * 0.5
				k.node.add_child(cr)
	btn(shell, shell.find_id("#btn-settings"), func(): g.audio.play("click"); g.ui.show_settings())
	btn(shell, shell.find_id("#tb-daily"), func(): g.audio.play("click"); g.ui.toast("GÜNLÜK ÇEKMECE YAKINDA"))
	btn(shell, lv, func(): g.audio.play("click"); g.ui.toast("HESAP YOLCULUĞU YAKINDA"))
	for c in shell.find_all(".tb-cur"):
		btn(shell, c, func(): g.audio.play("click"); set_page("magaza"))
	var tabs := shell.find_all(".dk-tab")
	for i in mini(tabs.size(), DOCK.size()):
		var pg: String = DOCK[i]
		btn(shell, tabs[i], func(): _tap(pg), 0.94)

func _tap(p: String) -> void:
	g.audio.play("click")
	if p != "savas" and not FileAccess.file_exists(Lyr.BASE + "pg_" + p + ".json"):
		g.ui.toast("YAKINDA")
		return
	set_page(p)

func set_page(p: String, instant := false) -> void:
	if not DOCK.has(p) and p != "dunyalar": p = "savas"
	var prev := page
	page = p
	# alt gezinme durumu (etkin sekme + kayan plaka geçişi)
	var dock := shell.find(".dock")
	if dock and FileAccess.file_exists(Lyr.BASE + "menu_" + p + ".json"): shell.to_state("menu_" + p, dock)
	var L := _page(p)
	if L == null: return
	_render(p)
	if instant or prev == "" or prev == p or not pages.has(prev):
		for k in pages: (pages[k] as Lyr).visible = k == p
		L.modulate.a = 1.0
		L.position.x = 0
		L.scale = Vector2.ONE
		return
	var fw := ORDER.find(p) > ORDER.find(prev)
	var W := get_viewport().get_visible_rect().size.x
	var old: Lyr = pages[prev]
	L.visible = true
	_slides.append({"L": L, "from": W * (0.06 if fw else -0.06), "t0": _t, "out": false})
	_slides.append({"L": old, "from": W * (-0.04 if fw else 0.04), "t0": _t, "out": true})

func _page(p: String) -> Lyr:
	if pages.has(p): return pages[p]
	if not FileAccess.file_exists(Lyr.BASE + "pg_" + p + ".json"): return null
	var L := Lyr.make("pg_" + p, ["#map-canvas-3d"] if p == "savas" else [])
	# sayfa, kabuğun .page-viewport düğümüne asılır: gök/zerrelerin üstünde, alt gezinmenin altında
	var vp := shell.find(".page-viewport")
	if vp: vp.host.add_child(L)
	else: add_child(L)
	L.position = Vector2.ZERO
	L.stretch_h(Scr.dh_of(self))
	pages[p] = L
	if p == "savas": _bind_home(L)
	return L

func _process(dt: float) -> void:
	if not visible: return
	_t += dt
	for S in _slides.duplicate():
		var L: Lyr = S.L
		var k := minf(1.0, (_t - float(S.t0)) / 0.46)
		var ko := minf(1.0, (_t - float(S.t0)) / 0.36)
		var e := UIK.bez(0.22, 0.8, 0.24, 1.0, k)
		var eo := UIK.bez(0.4, 0.0, 0.2, 1.0, ko)
		if S.out:
			L.position.x = lerpf(0.0, float(S.from), e)
			L.scale = Vector2.ONE * lerpf(1.0, 0.985, e)
			L.modulate.a = 1.0 - eo
			if _t - float(S.t0) >= 0.48:
				L.visible = false
				L.position.x = 0; L.scale = Vector2.ONE; L.modulate.a = 1.0
				_slides.erase(S)
		else:
			L.position.x = lerpf(float(S.from), 0.0, e)
			L.modulate.a = eo
			if k >= 1.0 and ko >= 1.0: _slides.erase(S)
	# sayaç geçişleri (420 ms kübik)
	for key in _tw.keys():
		var T: Array = _tw[key]
		var k2 := minf(1.0, (_t - float(T[2])) / 0.42)
		var v := lerpf(float(T[0]), float(T[1]), 1.0 - pow(1.0 - k2, 3))
		var n := shell.find_id(key)
		if n: shell.set_text(n, str(int(round(v))))
		if k2 >= 1.0: _tw.erase(key)

# ═══════════ ÜST ÇUBUK ═══════════

func refresh_wallet(instant := false) -> void:
	if shell == null: return
	var r: float = g.read_rubies()
	var s: float = g.read_stones()
	for pair in [["#menu-ruby-val", r, _ruby], ["#menu-stone-val", s, _stone]]:
		if instant or Settings.data.get("rm", false): shell.set_text(shell.find_id(pair[0]), str(int(pair[1])))
		elif pair[1] != pair[2]: _tw[pair[0]] = [pair[2], pair[1], _t]
	_ruby = r
	_stone = s

func _top() -> void:
	var alv: int = g.account_level()
	var ap: Dictionary = g.account_progress()
	shell.set_text(shell.find_id("#tbl-num"), str(alv))
	if _xpMat: _xpMat.set_shader_parameter("p", minf(100.0, float(ap.cur) / maxf(1.0, float(ap.need)) * 100.0))
	# günlük rozeti: bekleyen iş sayısı
	var n := 0
	var d = g.dailies
	if d:
		d.touch()
		if d.pending(): n += 1
	for t in range(1, g.bp_tier() + 1):
		if g.bp_can_claim(t, "free") or g.bp_can_claim(t, "premium"):
			n += 1
			break
	var nb := shell.find_id("#tb-daily-n")
	if nb:
		shell.set_hidden(nb, n == 0)
		shell.set_text(nb, str(n))

# ═══════════ SAVAŞ SAYFASI ═══════════

func home_target() -> Dictionary:
	var pick = g.ui.stored_pick() if g.ui.has_method("stored_pick") else null
	if pick is Dictionary: return {"w": int(pick.w), "m": int(pick.m)}
	var w := 0
	var lw = Store.get_item("kh_lastWorld")
	if lw != null: w = int(lw)
	if w < 1 or w > D.WORLDS.size() or not D.worldUnlocked(g.progress, w): return D.nextMission(g.progress)
	return {"w": w, "m": mini(D.MISSIONS_PER_WORLD, int(g.progress.get(w, 0)) + 1)}

func _bind_home(L: Lyr) -> void:
	home = L
	btn(L, L.find_id("#btn-start"), func():
		g.audio.play("cta")
		var nm := home_target()
		g.start_run(int(nm.w), int(nm.m)), 0.97)
	btn(L, L.find_id("#home-map"), func(): g.audio.play("click"); _tap("dunyalar"), 0.985)
	btn(L, L.find_id("#map-pedestal"), func(): g.audio.play("click"); _tap("dunyalar"), 0.985)
	btn(L, L.find_id("#free-chest"), func(): _free_chest())
	btn(L, L.find_id("#victory-chest"), func(): _victory_chest())
	# gök tırmanışı önizlemesi (#map-canvas-3d'nin yerine, .map-float içinde)
	_mapN = L.find(".map-float")
	if _mapN:
		_map = ClimbArt.new()
		_map.set_clip(L.clip_mat(_mapN), L.clip_mat(_mapN, true))
		_mapN.node.add_child(_map)

func _render(p: String) -> void:
	if p == "savas": _render_home()

func _fill(L: Lyr, id: String, frac: float) -> void:
	var n := L.find_id(id)
	if n == null: return
	var par: Lyr.N = L.by_id.get(str(n.d.parent))
	var full: float = (par.size.x - n.pos.x * 2.0) if par else n.size.x
	L.fit_width(n, maxf(0.001, full * clampf(frac, 0, 1)), false)

func _render_home() -> void:
	var L := home
	if L == null: return
	var nm := home_target()
	var wd: Dictionary = D.WORLDS[int(nm.w) - 1]
	var cleared := int(g.progress.get(int(nm.w), 0))
	if _map: _map.paint(wd, cleared, _mapN.size.x, _mapN.size.y)
	L.set_text(L.find_id("#map-world-no"), str(nm.w))
	L.set_text(L.find_id("#map-world-name"), str(wd.name))
	_fill(L, "#map-world-fill", float(cleared) / D.MISSIONS_PER_WORLD)
	L.set_text(L.find_id("#map-world-count"), str(cleared) + "/" + str(D.MISSIONS_PER_WORLD))
	L.set_text(L.find_id("#map-mission-no"), str(nm.m))
	var def: Dictionary = D.missionDef(int(nm.w), int(nm.m))
	L.set_text(L.find_id("#battle-mission"), "GÖREV " + str(nm.m) + " · " + str(def.get("objective", "")))
	# sıradaki hedef satırı
	var G = Journey.next_goal(g)
	var ng := L.find_id("#next-goal")
	if ng:
		L.set_hidden(ng, G == null)
		if G != null: L.set_text(L.find_id("#next-goal-t"), str(G.txt))
	# ücretsiz / zafer sandığı
	var fin: float = g.chests.free_ready_in()
	var fs := L.find_id("#free-chest-state")
	if fs: L.set_text(fs, "HAZIR — AÇ!" if fin <= 0 else _dur(fin))
	var vc: int = g.chests.vic_count()
	var vn: int = g.chests.vicNeed
	L.set_text(L.find_id("#victory-chest-state"), ("HAZIR — AÇ!" if vc >= vn else str(mini(vc, vn)) + "/" + str(vn)))
	_fill(L, "#vc-fill", minf(1.0, float(vc) / maxf(1, vn)))
	_top()

static func _dur(ms: float) -> String:
	var s := int(ceil(ms / 1000.0))
	var h := s / 3600
	var m := (s % 3600) / 60
	if h > 0: return str(h) + "sa " + str(m) + "dk"
	if m > 0: return str(m) + "dk " + str(s % 60) + "sn"
	return str(s) + "sn"

func _free_chest() -> void:
	if g.chests.free_ready_in() > 0:
		g.audio.play("error")
		g.ui.toast("HENÜZ HAZIR DEĞİL")
		return
	g.audio.play("click")
	g.ui.toast("SANDIK AÇILIŞI YAKINDA")

func _victory_chest() -> void:
	if g.chests.vic_count() < g.chests.vicNeed:
		g.audio.play("error")
		g.ui.toast("HER " + str(g.chests.vicNeed) + " ZAFERDE BİR AÇILIR")
		return
	g.audio.play("click")
	g.ui.toast("SANDIK AÇILIŞI YAKINDA")
