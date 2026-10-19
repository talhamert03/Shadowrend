class_name ScrCharDetail
extends Scr
## ui.js openCharDetail — kahraman inceleme kartı: sahne (portre/ışınlar/folyo),
## seviye madalyonu, ad/unvan, stat şeridi, imza silahı/gücü, USTALIK, EVRİM,
## seviyeyle açılan yetenek yuvaları, SÜPER, geliştir/savaşa al.
## Yakalama: hd_<id>_<lock|own|up|sel|upsel|max|maxsel> (seviye 1); seviyeyle açılan
## yuvalar cda_<id>_<i>_on, keşfedilmiş evrim hde_<id>_found olarak bindirilir.

var L: Lyr
var id := ""
var _over: Array = []
## sahnede canlı 3B model (Tripo): parmakla döndürülür, bırakınca süzülür
var hv: HeroView
var _stage_n: Lyr.N
var _hv_t := 0.0
var _sw_last := 0.0
var _idle := 0.0

func _init(game) -> void:
	super(game)
	name = "CharDetail"

func open(cid: String) -> void:
	id = cid
	_build()
	visible = true
	fade_show()
	g.audio.play("panel")

func _state() -> String:
	if not g.owns_char(id): return "lock"
	var sel: bool = g.meta.selectedChar == id
	if g.cards_for_next(id) == null: return "maxsel" if sel else "max"
	if g.can_upgrade_char(id): return "upsel" if sel else "up"
	return "sel" if sel else "own"

func _build() -> void:
	if L:
		unbtn(L)
		L.queue_free()
	for o in _over: (o as Node).queue_free()
	_over.clear()
	L = Lyr.make("hd_" + id + "_" + _state())
	add_child(L)
	L.stretch_h(Scr.dh_of(self))
	var sheet := L.find(".hd-sheet")
	scroll_area(L, sheet)
	btn(L, L.find_id("#cd-close"), func(): g.audio.play("click"); close())
	var up := L.find(".hd-btn.kor")
	if up: btn(L, up, func(): _upgrade())
	var sb := L.find(".hd-select")
	if sb: btn(L, sb, func():
		g.audio.play("click")
		g.select_char(id)
		close())
	var sd := L.find(".hd-selected")
	if sd: btn(L, sd, func(): g.audio.play("click"); close())
	_stage()
	if g.owns_char(id): _texts()
	else: _texts_locked()

## kilitli kahraman da tanıtılır: adı, unvanı, statları ve imza silahı/gücü (seviye 1 değerleri,
## sahip olunan yakalamadan); yetenekler ve SÜPER yakalamada zaten açık
func _texts_locked() -> void:
	var c: Dictionary = D.CHARACTERS.get(id, {})
	var nm := L.find_id("#cd-name")
	if nm: L.set_text(nm, str(c.get("name", id)))
	var sub := L.find_id("#cd-subtitle")
	if sub: L.set_text(sub, str(c.get("title", "")) + " · KİLİTLİ")
	if not FileAccess.file_exists(Lyr.BASE + "hd_" + id + "_own.json"): return
	var vals: Array = []
	for d in Lyr.load_json("hd_" + id + "_own").get("nodes", []):
		if String(d.get("key", "")).begins_with(".hs-v") and d.get("text") is Dictionary:
			vals.append(str(d.text.get("str", "")))
	var hv_n := L.find_all(".hs-v")
	for i in mini(vals.size(), hv_n.size()): L.set_text(hv_n[i], vals[i])

## portre yerine kahramanın kendi 3B modeli (savaştaki malzeme, mürekkep kontur); kilitliyse
## de gösterilir (ne kazanacağını görsün) — biraz karartılmış, kilit işareti üstte kalır
func _stage() -> void:
	hv = null
	_stage_n = null
	swipe_rect = Rect2()
	var st := L.find(".hd-stage")
	var au := L.find_id("#cd-aura")
	if st == null or au == null or not HeroView.models().get("heroes", {}).has(id): return
	var v := HeroView.new()
	var w := st.size.x
	var h := st.size.y + 26.0               # ayaklar başlık geçişinin altına süzülür
	if not v.setup(id, w, h, 2.0, 2.4, 0.0):
		v.queue_free()
		return
	for k in ["#cd-hero-img", "#cd-hero"]:
		var n := L.find_id(k)
		if n: L.set_hidden(n, true)
	var fo := L.find(".hd-foil")
	if fo: L.set_hidden(fo, true)
	var par := au.node.get_parent()
	# zemin parıltısı (ayak altı) + model
	var fl := Sprite2D.new()
	fl.texture = ClimbArt.glow_tex()
	var rc := Color(str(HeroesPage._rar(id).get("color", "#c8b6ff")))
	fl.modulate = Color(rc, 0.5)
	fl.scale = Vector2(1.9, 0.34)
	fl.position = Vector2(w * 0.5, h - 30.0)
	var am := CanvasItemMaterial.new()
	am.blend_mode = CanvasItemMaterial.BLEND_MODE_ADD
	fl.material = am
	par.add_child(fl)
	par.move_child(fl, au.node.get_index() + 1)
	v.position = Vector2.ZERO
	v.yaw = 0.42
	v.auto_spin = 0.0
	if not g.owns_char(id):
		v.modulate = Color(0.7, 0.68, 0.76)
		var lm := L.find(".hd-lockmark")
		if lm: L.set_hidden(lm, true)          # kilit, alttaki adın yanında zaten yazıyor
	par.add_child(v)
	par.move_child(v, fl.get_index() + 1)
	hv = v
	_stage_n = st
	_hv_t = 0.0
	v.scale = Vector2.ONE * 0.9
	v.modulate.a = 0.0

func _swipe_move(dx: float) -> void:
	if hv == null: return
	hv.dragging = true
	hv.drag(dx - _sw_last)
	_sw_last = dx

func _swipe_end(_dx: float, vel: float) -> void:
	_sw_last = 0.0
	if hv == null: return
	hv.dragging = false
	hv._vel = clampf(vel * 0.012, -14.0, 14.0)

func _texts() -> void:
	var c: Dictionary = D.CHARACTERS[id]
	var lvl: int = g.char_level(id)
	var lb := L.find_id("#hd-lvl")
	if lb:
		for b in lb.kids:
			if b.d.get("tag") == "b": L.set_text(b, str(lvl))
	var sub := L.find_id("#cd-subtitle")
	if sub: L.set_text(sub, str(c.get("title", "")) + " · SEVİYE " + str(lvl))
	# ustalık
	var M: Dictionary = Ledger.mastery(g.meta, id)
	var hm := L.find(".hd-mastery")
	if hm:
		var md := L.find(".hm-medal")
		if md and md.kids.size(): L.set_text(md.kids[0], str(M.lv))
		var mk := L.find(".hm-k")
		if mk: L.set_text(mk, "USTALIK" + (" · AZAMİ" if M.max else " · SV " + str(M.lv) + " / " + str(Ledger.MASTERY_MAX)))
		var bar := L.find(".hm-bar")
		if bar and bar.kids.size(): UIK.set_fill(L, bar.kids[0], bar.size.x, float(M.frac))
		var nt := L.find(".hm-note")
		if nt: L.set_text(nt, "TÜM KADEMELER AÇIK" if M.max else "SONRAKİ KADEMEYE " + str(int(M.toNext)) + " PUAN · KİYIM + ZAFER + BOSS")
	# evrim keşfedildiyse bindir
	var evo := L.find(".hd-evo")
	var found: bool = (g.meta.get("evo", []) as Array).has("evo_" + id)
	if evo and found: _overlay(evo, "hde_" + id + "_found")
	# seviyeyle açılan yuvalar
	var row := L.find(".cda-row")
	if row:
		var un: Array = D.signatureUnlocks(id, lvl)
		var i := 0
		for k in row.kids:
			if i < un.size() and not un[i].get("locked", true): _overlay(k, "cda_" + id + "_" + str(i) + "_on")
			i += 1
	# eylem bölümü
	var cards: int = g.char_card_count(id)
	var need = g.cards_for_next(id)
	var lvs := L.find_all(".hu-lv")
	if lvs.size() >= 1: L.set_text(lvs[0], "SV " + str(lvl))
	if lvs.size() >= 2: L.set_text(lvs[1], "SV " + str(lvl + 1))
	var hb := L.find(".hu-bar")
	if hb and need != null:
		for k in hb.kids:
			if k.d.get("tag") == "b": L.set_text(k, str(cards) + " / " + str(int(need)) + " KART")
			elif k.d.get("tag") == "i": UIK.set_fill(L, k, hb.size.x, float(cards) / maxf(1.0, float(need)))
	var cost := L.find(".hb-cost")
	if cost and cost.txt: L.set_text(cost, str(int(g.gold_for_next(id))))
	var mx := L.find(".hu-max")
	if mx: L.set_text(mx, "AZAMİ SEVİYE · SV " + str(lvl))

## yakalanan düğümün yerine başka bir yakalamayı bindir (aynı kutu)
func _overlay(n: Lyr.N, key: String) -> void:
	if not FileAccess.file_exists(Lyr.BASE + key + ".json"): return
	var O := Lyr.make(key)
	n.node.get_parent().add_child(O)
	O.position = n.node.position
	L.set_hidden(n, true)
	_over.append(O)

## ui.js playUpgradeFx — SEVİYE ATLADIN: kuyu + ışınlar + mühür halkaları, kartlar çubuktan
## sahneye akar, flaş + dalga, madalyon eski→yeni seviyeyi yuvarlar, kazanım çipleri,
## (varsa) YENİ YETENEK. 2,9 sn (yetenekle 3,4) sonra ya da dokununca (0,65 sn sonra) kapanır.
var _upx: Lyr
var _upx_t := -1.0
var _upx_end := 2.9

func _upgrade() -> void:
	if not g.can_upgrade_char(id):
		g.audio.play("error")
		return
	if _upx: return
	var old: int = g.char_level(id)
	if not g.upgrade_char(id): return
	var lv: int = g.char_level(id)
	g.audio.play("levelup")
	g.ui.menu.refresh_wallet()
	var nu = null
	for u in D.signatureUnlocks(id, lv):
		if not u.get("locked", true) and int(u.get("minLvl", 0)) == lv: nu = u
	var key := "upx_1" if nu else "upx_0"
	var inner := L.find(".hd-inner")
	if inner == null or not FileAccess.file_exists(Lyr.BASE + key + ".json"):
		g.ui.toast("SEVİYE ATLADIN · SV " + str(old) + " → " + str(lv))
		_build()
		return
	_upx = Lyr.make(key)
	inner.host.add_child(_upx)
	var bs := _upx.find(".upx-roll")
	if bs:
		var bb := bs.kids.filter(func(k): return k.d.get("tag") == "b")
		if bb.size() >= 2:
			_upx.set_text(bb[0], str(old))
			_upx.set_text(bb[1], str(lv))
	var a: Dictionary = D.charLevelMods(old)
	var b: Dictionary = D.charLevelMods(lv)
	var gains := [b.hpMul - a.hpMul, b.dmgAdd - a.dmgAdd, b.atkAdd - a.atkAdd]
	var chips := _upx.find_all(".upx-g")
	for k in mini(3, chips.size()):
		for c in chips[k].kids:
			if c.d.get("tag") == "b": _upx.set_text(c, "+" + str(int(round(float(gains[k]) * 100.0))) + "%")
	if nu:
		var nw := _upx.find(".upx-new")
		if nw:
			for c in nw.kids:
				if c.d.get("tag") == "b": _upx.set_text(c, str(nu.name))
	_upx_t = 0.0
	_upx_end = 3.4 if nu else 2.9
	btn(_upx, _upx.nodes[0], func():
		if _upx_t > 0.65: _upx_finish(), 1.0, 0.0)

func _process(dt: float) -> void:
	if hv and is_instance_valid(hv):
		# giriş: yukarı süzülüp oturur (ease-out back); sahne dikdörtgeni = döndürme alanı
		_hv_t += dt
		var k := clampf(_hv_t / 0.55, 0.0, 1.0)
		var e := 1.0 + 2.2 * pow(k - 1.0, 3.0) + 1.2 * pow(k - 1.0, 2.0)
		hv.scale = Vector2.ONE * lerpf(0.9, 1.0, e)
		hv.modulate.a = minf(1.0, _hv_t / 0.3)
		if _stage_n:
			var xf := _stage_n.node.get_global_transform_with_canvas()
			swipe_rect = Rect2(xf.origin, _stage_n.size * xf.get_scale())
		_idle = 0.0 if hv.dragging or absf(hv._vel) > 0.05 else _idle + dt
		if _idle > 2.5:
			# bırakıldıktan bir süre sonra yavaşça 3/4 önden duruşa döner
			var tgt := 0.42 + roundf((hv.yaw - 0.42) / TAU) * TAU
			hv.yaw = lerpf(hv.yaw, tgt, minf(1.0, dt * 2.0))
	if _upx == null or _upx_t < 0.0: return
	_upx_t += dt
	if absf(_upx_t - 0.6) < dt: Input.vibrate_handheld(25)
	if _upx_t >= _upx_end: _upx_finish()

func _upx_finish() -> void:
	if _upx == null or _upx_t < 0.0: return
	_upx_t = -1.0
	var U := _upx
	var tw := create_tween()
	tw.tween_property(U, "modulate:a", 0.0, 0.26)
	tw.tween_callback(func():
		unbtn(U)
		U.queue_free()
		_upx = null
		if visible:
			_build()
			if g.ui.menu.pages.has("kahraman"): g.ui.menu.pages["kahraman"].render())

func close() -> void:
	if not visible: return
	fade_hide(_close_now)

func _close_now() -> void:
	visible = false
	if _upx:
		unbtn(_upx)
		_upx.queue_free()
		_upx = null
		_upx_t = -1.0
	if L:
		unbtn(L)
		L.queue_free()
		L = null
	hv = null
	_stage_n = null
	swipe_rect = Rect2()
	for o in _over: (o as Node).queue_free()
	_over.clear()
	if g.ui.menu.pages.has("kahraman"): g.ui.menu.pages["kahraman"].render()
