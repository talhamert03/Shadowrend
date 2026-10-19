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
var _rendered := {}          # sayfa → son kurulduğu Store.rev
var prewarm: UIPrewarm
var _lru: Array = []          # en son açılan sayfa sonda (bellek sınırı için)

## kademeye göre bellekte tutulan sayfa sayısı (ana sayfa hariç): düşük 2 · orta 4 · yüksek hepsi
func page_cap() -> int:
	match Quality.tier:
		"low": return 2
		"mid": return 4
	return 9

## sınır aşıldıysa en uzun süredir açılmayan sayfayı (mevcut ve ana sayfa dışında) bırak
func _trim_pages() -> void:
	var built := pages.keys().filter(func(k): return k != "savas" and k != page)
	while built.size() > page_cap():
		var victim := ""
		for k in built:
			if not _lru.has(k):
				victim = k
				break
		if victim == "":
			for k in _lru:
				if built.has(k):
					victim = k
					break
		if victim == "": return
		_free_page(victim)
		built.erase(victim)

func _free_page(p: String) -> void:
	var n: Node = pages.get(p)
	if n == null: return
	for B in _btns.duplicate():
		if is_instance_valid(B.lyr) and n.is_ancestor_of(B.lyr): _btns.erase(B)
	for S in _scrolls.duplicate():
		if is_instance_valid(S.lyr) and n.is_ancestor_of(S.lyr): _scrolls.erase(S)
	_drag = null
	_fling.clear()
	pages.erase(p)
	_rendered.erase(p)
	_lru.erase(p)
	n.queue_free()
var _t := 0.0
var _slides: Array = []      # [{L, from, to, t0, out}]
var _xpMat: ShaderMaterial
var _ruby := 0.0
var _stone := 0.0
var _tw := {}                # düğüm anahtarı → [from, to, t0]
var home: Lyr
var _map: ClimbArt
var _mapN: Lyr.N
var _slotL: Array = [null, null, null, null]     # dolu yuva katmanı (cs_<tür>_<durum>)
var _slotKey: Array = ["", "", "", ""]
var _slotTick := 0.0

func _init(game) -> void:
	super(game)
	name = "Menu"
	modal = false

func open(p := "savas") -> void:
	if shell == null: _build()
	visible = true
	_rendered.clear()          # savaştan/aradan dönüş: her sayfa ilk açılışta tazelenir
	set_page(p, true)
	if prewarm == null:
		prewarm = UIPrewarm.new(self)
		add_child(prewarm)
	prewarm.start()
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
	btn(shell, shell.find_id("#tb-daily"), func(): g.audio.play("click"); g.ui.show_daily_drawer())
	btn(shell, lv, func(): g.audio.play("click"); g.ui.show_account_journey())
	for c in shell.find_all(".tb-cur"):
		btn(shell, c, func(): g.audio.play("click"); set_page("magaza"))
	var tabs := shell.find_all(".dk-tab")
	# yakalama sırası z'ye göre (SAVAŞ öne alınmış olabilir) — soldan sağa diz
	tabs.sort_custom(func(a, b): return a.pos.x < b.pos.x)
	for i in mini(tabs.size(), DOCK.size()):
		var pg: String = DOCK[i]
		_tab_n[pg] = tabs[i]
		no_spring[tabs[i]] = true           # sekmenin kendi ezil-zıpla animasyonu var
		btn(shell, tabs[i], func(): _tap(pg), 0.94)

## sayfa gizli kurulur (UIPrewarm) — sekme ilk açılışta takılmasın
func prebuild(p: String) -> void:
	Prof.s("prebuild:" + p)
	var rk := UITex.rec_begin(p)
	var L := _page(p)
	if L == null:
		UITex.rec_end(rk)
		return
	_render(p)
	UITex.rec_end(rk)
	Prof.t("prebuild:" + p)
	_rendered[p] = Store.rev
	if p != page: L.visible = false

## kullanıcı etkileşimde mi (dokunuş, kaydırma, savurma, sayfa geçişi)
func busy() -> bool:
	return _press >= 0 or _drag != null or not _fling.is_empty() or not _slides.is_empty()

## v59 _navTap: dokunulan sekmeden halka yayılır, simge ezilip zıplar
var _tab_n := {}             # sayfa → alt menü sekme düğümü
var _hops := {}              # sekme düğümü → başlangıç
func _dock_fx(p: String) -> void:
	var n: Lyr.N = _tab_n.get(p)
	if n == null or Settings.data.get("rm", false): return
	_hops[n] = _t
	var rip := Node2D.new()
	rip.z_index = 5
	rip.position = g.ui.uiroot.get_global_transform().affine_inverse() * (shell.get_global_transform() * shell.rect_of(n).get_center())
	g.ui.uiroot.add_child(rip)
	var t0 := Time.get_ticks_msec()
	rip.draw.connect(func():
		var k := clampf((Time.get_ticks_msec() - t0) / 620.0, 0.0, 1.0)
		var e := 1.0 - pow(1.0 - k, 3.0)
		var r := 30.0 * (0.3 + 1.2 * e)
		rip.draw_circle(Vector2.ZERO, r, Color(1.0, 0.84, 0.75, 0.22 * (1.0 - k)))
		rip.draw_arc(Vector2.ZERO, r, 0, TAU, 32, Color(1.0, 0.84, 0.75, 0.45 * (1.0 - k)), 1.5, true))
	var tw := rip.create_tween()
	tw.tween_method(func(_v): rip.queue_redraw(), 0.0, 1.0, 0.62)
	tw.tween_callback(rip.queue_free)

func _tap(p: String) -> void:
	g.audio.play("click")
	_dock_fx(p)
	if p != "savas" and not FileAccess.file_exists(Lyr.BASE + "pg_" + p + ".json"):
		g.ui.toast("YAKINDA")
		return
	set_page(p)

func set_page(p: String, instant := false) -> void:
	if not DOCK.has(p) and p != "dunyalar": p = "savas"
	var prev := page
	var L := _activate(p)
	if L == null: return
	if instant or prev == "" or prev == p or not pages.has(prev):
		_slides.clear()
		for k in pages: (pages[k] as Node2D).visible = k == p
		_reset_page(L)
		return
	var fw := ORDER.find(p) > ORDER.find(prev)
	_slide_pair(pages[prev], L, fw, 0.0)
	_stagger(L)

## Supercell sayfa girişi: içerik blokları yukarıdan aşağı sırayla, hafif aşağıdan ve küçükten
## taşarak yerine oturur (45 ms ara, 340 ms ease-out-back). Yalnız sayfanın kaydırma alanı.
var _stg: Array = []          # [{L, n, t0}]
func _stagger(page_n: Node2D) -> void:
	if Settings.data.get("rm", false): return
	var lyrs: Array = []
	if page_n is Lyr: lyrs.append(page_n)
	lyrs.append_array(page_n.find_children("*", "Lyr", true, false))
	for L in lyrs:
		var sc: Lyr.N = null
		for n in (L as Lyr).nodes:
			if n.scroller:
				sc = n
				break
		if sc == null: continue
		var kids: Array = sc.kids.filter(func(k): return not k.hidden)
		kids.sort_custom(func(a, b): return a.pos.y < b.pos.y)
		var i := 0
		for k in kids.slice(0, 10):
			_stg.append({"L": L, "n": k, "t0": _t + 0.06 + i * 0.045})
			k.op_mul = 0.0
			k.extra = Transform2D(0, Vector2.ONE * 0.95, 0, Vector2(0, 18))
			(L as Lyr).set_dyn(k)
			i += 1
		return

## sayfa durumunu etkinleştir: alt menü vurgusu, sayfa adı, (gerekirse) kurulum
func _activate(p: String) -> Node2D:
	_lru.erase(p)
	_lru.append(p)
	page = p
	var dock := shell.find(".dock")
	if dock and FileAccess.file_exists(Lyr.BASE + "menu_" + p + ".json"): shell.to_state("menu_" + p, dock)
	Prof.s("page:" + p)
	var rk := UITex.rec_begin(p)
	var L := _page(p)
	Prof.t("page:" + p)
	if L == null:
		UITex.rec_end(rk)
		return null
	_trim_pages()
	# veri değişmediyse sayfa yeniden kurulmaz (geçiş anında); savaş sayfası her zaman tazelenir
	if p == "savas" or int(_rendered.get(p, -1)) != Store.rev:
		Prof.s("render:" + p)
		_render(p)
		Prof.t("render:" + p)
		_rendered[p] = Store.rev
	UITex.rec_end(rk)
	return L

func _reset_page(L: Node2D) -> void:
	L.modulate.a = 1.0
	L.position.x = 0
	L.scale = Vector2.ONE

## iki sayfa birlikte kayar: yeni sayfa yandan gelir, eski öbür yana gider (tam genişlik,
## 0,34 sn, ease-out). off: parmakla kaydırılmış mevcut kayma (px) — geçiş oradan sürer.
func _slide_pair(old: Node2D, L: Node2D, fw: bool, off: float) -> void:
	var W := UIK.ui_size(get_viewport()).x
	var sgn := 1.0 if fw else -1.0
	_slides.clear()
	for k in pages:
		var n: Node2D = pages[k]
		if n != old and n != L: n.visible = false
	L.visible = true
	old.visible = true
	var lf: float = L.position.x if absf(off) > 0.0 else W * sgn
	_slides.append({"L": L, "from": lf, "to": 0.0, "a0": L.modulate.a if absf(off) > 0.0 else 0.4, "a1": 1.0, "t0": _t, "dur": 0.34, "out": false})
	_slides.append({"L": old, "from": old.position.x, "to": -W * sgn, "a0": old.modulate.a, "a1": 0.4, "t0": _t, "dur": 0.34, "out": true})

## ── parmakla sayfa kaydırma (alt menü sırasında komşu sekme) ──
var _sw_n: Node2D = null       # önizlenen komşu sayfa
var _sw_p := ""

func _dock_index() -> int:
	return DOCK.find("savas" if page == "dunyalar" else page)

func _swipe_move(dx: float) -> void:
	if _slides.size(): return
	var cur: Node2D = pages.get(page)
	if cur == null: return
	var W := UIK.ui_size(get_viewport()).x
	var idx := _dock_index() + (1 if dx < 0 else -1)
	var np: String = DOCK[idx] if idx >= 0 and idx < DOCK.size() else ""
	if np != _sw_p:
		if _sw_n and _sw_n != cur: _sw_n.visible = false
		_sw_p = np
		_sw_n = pages.get(np) if np != "" and FileAccess.file_exists(Lyr.BASE + "pg_" + np + ".json") else null
	var k := 1.0 if _sw_n else 0.35          # komşu yoksa lastik direnç
	cur.position.x = dx * k
	cur.modulate.a = 1.0 - minf(0.5, absf(dx) / W * 0.6)
	if _sw_n:
		_sw_n.visible = true
		_sw_n.position.x = cur.position.x + (W if dx < 0 else -W)
		_sw_n.modulate.a = 0.5 + minf(0.5, absf(dx) / W)

func _swipe_end(dx: float, vel: float) -> void:
	var cur: Node2D = pages.get(page)
	if cur == null: return
	var W := UIK.ui_size(get_viewport()).x
	var go := _sw_p != "" and (absf(dx) > W * 0.22 or (absf(vel) > 650.0 and absf(dx) > 30.0 and signf(vel) == signf(dx)))
	var target := _sw_p
	_sw_p = ""
	var nb := _sw_n
	_sw_n = null
	if go and target != "":
		g.audio.play("tab")
		var L := _activate(target)
		if L == null: return
		if nb == null: L.position.x = W * (1.0 if dx < 0 else -1.0)
		_slide_pair(cur, L, dx < 0, 1.0)
	else:
		# geri yaylan
		_slides.clear()
		_slides.append({"L": cur, "from": cur.position.x, "to": 0.0, "a0": cur.modulate.a, "a1": 1.0, "t0": _t, "dur": 0.26, "out": false})
		if nb:
			_slides.append({"L": nb, "from": nb.position.x, "to": W * signf(nb.position.x), "a0": nb.modulate.a, "a1": 0.4, "t0": _t, "dur": 0.26, "out": true})

func _page(p: String) -> Node2D:
	if pages.has(p): return pages[p]
	if not FileAccess.file_exists(Lyr.BASE + "pg_" + p + ".json"): return null
	if p == "cephane":
		var Ap := ArmoryPage.new(self)
		_page_host().add_child(Ap)
		pages[p] = Ap
		return Ap
	if p == "kahraman":
		var Hp := HeroesPage.new(self)
		_page_host().add_child(Hp)
		pages[p] = Hp
		return Hp
	if p == "etkinlik":
		var Ep := EventsPage.new(self)
		_page_host().add_child(Ep)
		pages[p] = Ep
		return Ep
	if p == "magaza":
		var Sp := ShopPage.new(self)
		_page_host().add_child(Sp)
		pages[p] = Sp
		return Sp
	if p == "dunyalar":
		var J := JourneyPage.new(self)
		_page_host().add_child(J)
		pages[p] = J
		return J
	var L := Lyr.make("pg_" + p, ["#map-canvas-3d"] if p == "savas" else [])
	# sayfa, kabuğun .page-viewport düğümüne asılır: gök/zerrelerin üstünde, alt gezinmenin altında
	_page_host().add_child(L)
	L.position = Vector2.ZERO
	L.stretch_h(Scr.dh_of(self))
	pages[p] = L
	if p == "savas": _bind_home(L)
	return L

## sayfa görünüm alanı: kaydırılan içerik üst çubuğa/alt gezinmeye taşmasın (scissor kırpma)
var _pclip: Control
func _page_host() -> Node:
	if _pclip: return _pclip
	var vp := shell.find(".page-viewport")
	_pclip = Control.new()
	_pclip.name = "pageclip"
	_pclip.clip_contents = true
	_pclip.mouse_filter = Control.MOUSE_FILTER_IGNORE
	if vp:
		_pclip.size = vp.size
		vp.host.add_child(_pclip)
	else:
		_pclip.size = UIK.ui_size(get_viewport())
		add_child(_pclip)
	return _pclip

func _process(dt: float) -> void:
	if not visible: return
	_t += dt
	for S in _slides.duplicate():
		var L: Node2D = S.L
		var k := minf(1.0, (_t - float(S.t0)) / float(S.dur))
		var e := 1.0 - pow(1.0 - k, 3.0)
		L.position.x = lerpf(float(S.from), float(S.to), e)
		L.modulate.a = lerpf(float(S.a0), float(S.a1), e)
		if k >= 1.0:
			_slides.erase(S)
			if S.out:
				L.visible = false
				_reset_page(L)
	for S2 in _stg.duplicate():
		var L2: Lyr = S2.L
		var N3: Lyr.N = S2.n
		if not is_instance_valid(L2):
			_stg.erase(S2)
			continue
		var ks := (_t - float(S2.t0)) / 0.34
		if ks < 0.0: continue
		if ks >= 1.0:
			N3.op_mul = 1.0
			N3.extra = Transform2D.IDENTITY
			_stg.erase(S2)
		else:
			var q := ks - 1.0
			var eb := 1.0 + 2.4 * q * q * q + 1.4 * q * q
			N3.op_mul = minf(1.0, ks * 2.2)
			N3.extra = Transform2D(0, Vector2.ONE * lerpf(0.95, 1.0, eb), 0, Vector2(0, 18.0 * (1.0 - eb)))
		L2.set_dyn(N3)
	# kaydırma alanı: sayfa görünüm alanı (üst çubuk ile alt menü arası)
	if _pclip: swipe_rect = _pclip.get_global_rect()
	# yuva sayaçları (web updateChestCountdowns: 1 sn)
	_slotTick += dt
	if _slotTick >= 1.0 and page == "savas" and home:
		_slotTick = 0.0
		if g.chests.tick(): render_slots()
		else: _slot_texts()
	# sekme zıplaması (dk-hop 420 ms): ezil → uzan → otur
	for hn in _hops.keys():
		var kh := (_t - float(_hops[hn])) / 0.42
		var H: Lyr.N = hn
		if kh >= 1.0:
			_hops.erase(hn)
			H.extra = Transform2D.IDENTITY
		else:
			var sx := 1.0
			var sy := 1.0
			if kh < 0.25:
				var u := kh / 0.25
				sx = lerpf(1.0, 1.12, u); sy = lerpf(1.0, 0.86, u)
			elif kh < 0.6:
				var u2 := (kh - 0.25) / 0.35
				sx = lerpf(1.12, 0.95, u2); sy = lerpf(0.86, 1.08, u2)
			else:
				var u3 := (kh - 0.6) / 0.4
				sx = lerpf(0.95, 1.0, u3); sy = lerpf(1.08, 1.0, u3)
			H.extra = Transform2D(0, Vector2(sx, sy), 0, Vector2(0, -4.0 * sin(clampf(kh / 0.6, 0, 1) * PI)))
		shell.set_dyn(H)
	# cüzdan zıplaması (v74Bump 360 ms: 1 → 1,1 → 1)
	for bn in _bumps.keys():
		var kb := (_t - float(_bumps[bn])) / 0.36
		var N2: Lyr.N = bn
		if kb >= 1.0:
			_bumps.erase(bn)
			N2.extra = Transform2D.IDENTITY
		else:
			var sc := 1.0 + 0.1 * (kb / 0.35 if kb < 0.35 else 1.0 - (kb - 0.35) / 0.65)
			N2.extra = Transform2D(0, Vector2.ONE * sc, 0, Vector2.ZERO)
		shell.set_dyn(N2)
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
		if _flying.get(pair[0], false): continue      # uçuş sayacı parça parça artırıyor
		if instant or Settings.data.get("rm", false): shell.set_text(shell.find_id(pair[0]), str(int(pair[1])))
		elif pair[1] != pair[2]: _tw[pair[0]] = [pair[2], pair[1], _t]
	_ruby = r
	_stone = s

# ── para uçuşu (ui.js rewardFrom / flyCurrency) ──
var _flying := {}            # sayaç kimliği → uçuş sürüyor
var _bumps := {}             # .tb-cur düğümü → başlangıç (zıplama 360 ms)

## ödül veren düğme: artış olan cüzdana kaynaktan uçuş, yoksa sayarak tazeleme.
## Ödül VERİLDİKTEN sonra, kaynak düğüm yeniden kurulmadan ÖNCE çağrılır.
func reward_from(L: Lyr, n: Lyr.N) -> void:
	var up_r: bool = g.read_rubies() > _ruby
	var up_s: bool = g.read_stones() > _stone
	var ok := L != null and n != null and is_instance_valid(L) and L.is_visible_in_tree() and visible
	if ok and up_r: fly_currency(L, n, "ruby")
	if ok and up_s: fly_currency(L, n, "stone")
	refresh_wallet()      # uçmayan sayaç (ör. bozdurmada azalan gem) sayarak tazelenir

func _uiroot_pos(L: Lyr, n: Lyr.N) -> Vector2:
	var root: Node2D = g.ui.uiroot
	var gp: Vector2 = L.get_global_transform() * L.rect_of(n).get_center()
	return root.get_global_transform().affine_inverse() * gp

func fly_currency(L: Lyr, n: Lyr.N, kind: String, on_done := Callable()) -> void:
	var key := "#menu-ruby-val" if kind == "ruby" else "#menu-stone-val"
	var val := shell.find_id(key)
	var ic := shell.find("." + kind)
	if val == null or ic == null or Settings.data.get("rm", false) or _flying.get(key, false):
		refresh_wallet()
		if on_done.is_valid(): on_done.call()
		return
	var cur: Lyr.N = shell.by_id.get(str(val.d.parent))
	var target: float = g.read_rubies() if kind == "ruby" else g.read_stones()
	var base: float = _ruby if kind == "ruby" else _stone
	_tw.erase(key)
	shell.set_text(val, str(int(base)))
	_flying[key] = true
	if kind == "ruby": _ruby = target
	else: _stone = target
	var F := FxFly.new()
	F.z_index = 50
	F.col = Color(1.0, 0.82, 0.48) if kind == "ruby" else Color(0.78, 0.61, 1.0)
	F.src = _uiroot_pos(L, n)
	F.dst = _uiroot_pos(shell, ic)
	var holder := Node2D.new()
	var dup := ic.node.duplicate() as Node2D
	dup.position = -ic.size * 0.5
	dup.rotation = 0.0
	dup.scale = Vector2.ONE
	holder.add_child(dup)
	holder.scale = Vector2.ONE * (22.0 / maxf(1.0, ic.size.x))
	F.icon = holder
	F.on_arrive = func(i: int, total: int):
		shell.set_text(val, str(int(round(base + (target - base) * float(i) / total))))
		if cur: _bumps[cur] = _t
		if i == 1: g.audio.play("walletin")
	F.on_done = func():
		_flying.erase(key)
		refresh_wallet(true)
		if on_done.is_valid(): on_done.call()
	g.ui.uiroot.add_child(F)
	F.start()

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
	# yuvalar: boş yuva düğümü düğme değildir (web: div); dolu yuva kendi katmanıyla
	# gök tırmanışı önizlemesi (#map-canvas-3d'nin yerine, .map-float içinde)
	_mapN = L.find(".map-float")
	if _mapN:
		_map = ClimbArt.new()
		_map.set_clip(L.clip_mat(_mapN), L.clip_mat(_mapN, true))
		_mapN.node.add_child(_map)

func _render(p: String) -> void:
	if p == "savas": _render_home()
	elif p == "dunyalar": (pages[p] as JourneyPage).open_worlds()
	elif p == "kahraman": (pages[p] as HeroesPage).render()
	elif p == "cephane": (pages[p] as ArmoryPage).render()
	elif p == "magaza": (pages[p] as ShopPage).render()
	elif p == "etkinlik": (pages[p] as EventsPage).render()

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
	if fs: L.set_text(fs, "HAZIR — AÇ!" if fin <= 0 else ChestSystem.fmt_dur(fin))
	var vc: int = g.chests.vic_count()
	var vn: int = g.chests.vicNeed
	L.set_text(L.find_id("#victory-chest-state"), str(mini(vc, vn)) + "/" + str(vn))
	_fill(L, "#vc-fill", minf(1.0, float(vc) / maxf(1, vn)))
	render_slots()
	_top()

func _free_chest() -> void:
	if g.chests.free_ready_in() > 0:
		g.audio.play("error")
		g.ui.toast("HENÜZ HAZIR DEĞİL")
		return
	if g.chests.claim_free():
		g.audio.play("claim")
		g.ui.chest_ceremony("ahsap", -1, func(): refresh_wallet(); render_slots(); _render_home())

func _victory_chest() -> void:
	if g.chests.vic_count() < g.chests.vicNeed:
		g.audio.play("error")
		g.ui.toast("HER " + str(g.chests.vicNeed) + " ZAFERDE BİR AÇILIR")
		return
	g.audio.play("claim")
	g.chests.claim_victory()
	g.ui.chest_ceremony("kan", -1, func(): refresh_wallet(); render_slots(); _render_home())

# ═══════════ SANDIK YUVALARI (renderChestRow) ═══════════

## Dolu yuva katmanları; satır en uzun yuvaya göre büyür ve yukarı doğru açılır
## (web: harita çerçevesi aynı miktar kısalır, SAVAŞ/kaide yukarı kayar).
func render_slots() -> void:
	var L := home
	if L == null: return
	var row := L.find_id("#chest-row")
	var empties := L.find_all(".chest-slot.empty")
	if row == null or empties.size() < 4: return
	g.chests.tick()
	var row_h0: float = row.d.get("_h0", row.size.y)
	var rowH := row_h0
	for i in 4:
		var c = g.chests.slots[i]
		var key := "" if c == null else "cs_" + str(c.t) + "_" + str(c.st)
		if key != _slotKey[i]:
			if _slotL[i]:
				unbtn(_slotL[i])
				(_slotL[i] as Lyr).queue_free()
				_slotL[i] = null
			_slotKey[i] = key
			if key != "" and FileAccess.file_exists(Lyr.BASE + key + ".json"):
				var S := Lyr.make(key)
				row.host.add_child(S)
				_slotL[i] = S
				var idx := i
				btn(S, S.nodes[0], func(): _slot_tap(idx), 0.95)
				# ilerleme dolumu: yakalamadaki satır içi scaleX betikten
				var pc := S.find(".cs-prog")
				if pc:
					for k in pc.kids:
						if String(k.d.get("kind", "el")) == "el": k.base_tf = []
		L.set_hidden(empties[i], _slotL[i] != null)
		if _slotL[i]: rowH = maxf(rowH, (_slotL[i] as Lyr).nodes[0].d.get("_h0", (_slotL[i] as Lyr).nodes[0].size.y))
	L.stretch_h(Scr.dh_of(self))
	# satır yukarı doğru büyür: harita çerçevesi aynı miktar kısalır, aradakiler yukarı kayar (web ölçümü)
	var dhr := rowH - row_h0
	if dhr > 0.01:
		var ms := L.find(".map-stage")
		if ms: L.resize_h(ms, ms.size.y - dhr)
		var hm := L.find_id("#home-map")
		if hm: L.resize_h(hm, hm.size.y - dhr)
		var pd := L.find_id("#map-pedestal")
		if pd: L.move(pd, pd.pos - Vector2(0, dhr))
		for q in [L.find_id("#next-goal"), L.find(".battle-dock"), row]:
			if q: L.move(q, q.pos - Vector2(0, dhr))
	for i in 4:
		var E: Lyr.N = empties[i]
		if _slotL[i]:
			var S: Lyr = _slotL[i]
			S.position = E.pos
			S.resize_h(S.nodes[0], rowH)
		else:
			L.resize_h(E, rowH)
	if _map: _map.paint(D.WORLDS[int(home_target().w) - 1], int(g.progress.get(int(home_target().w), 0)), _mapN.size.x, _mapN.size.y)
	_slot_texts()

func _slot_texts() -> void:
	var now := Clock.now()
	for i in 4:
		var S: Lyr = _slotL[i]
		var c = g.chests.slots[i]
		if S == null or c == null: continue
		if c.st == "locked":
			var st := S.find(".cs-state")
			if st: S.set_text(st, ChestSystem.fmt_dur(g.chests.lock_ms(i)))
		elif c.st == "unlocking":
			var tm := S.find(".cs-state.timer")
			if tm: S.set_text(tm, ChestSystem.fmt_dur(float(c.at) - now))
			var tot: float = float(ChestSystem.chests()[c.t].time) * 1000.0
			var pr := 1.0 if tot <= 0 else clampf(1.0 - (float(c.at) - now) / tot, 0.0, 1.0)
			var pc := S.find(".cs-prog")
			if pc:
				for k in pc.kids:
					if String(k.d.get("kind", "el")) == "el":
						k.extra = Transform2D(0, Vector2(maxf(0.0001, pr), 1.0), 0, Vector2.ZERO)
						S.set_dyn(k)
			var sk := S.find(".cs-skip")
			if sk and sk.txt:
				var nv := str(int(g.chests.skip_cost_for(i)))
				if sk.txt.text != nv:
					var ow := sk.txt.text_width()
					S.set_text(sk, nv)
					S.fit_width(sk, sk.size.x + sk.txt.text_width() - ow)

func _slot_tap(i: int) -> void:
	var c = g.chests.slots[i]
	if c == null: return
	g.audio.play("click")
	if c.st == "ready":
		g.audio.play("panel")
		g.ui.chest_ceremony(str(c.t), i, func(): refresh_wallet(); render_slots())
		return
	g.ui.chest_inspect(i)
