extends Control
## ui.js — (GEÇİCİ İSKELET) Arayüz katmanı henüz taşınmadı; oyun akışının
## kırılmaması için tüm çağrılar burada karşılanır. Geliştirme bayrakları:
##   -- autorun [char=<id>] [world=<n>] [mission=<n>] [shot=<png>] [shot_t=<sn>]
var g
var _ldHold := false
var _shot := ""
var _shotT := 6.0
var _gsI := 0
var _t0 := 0.0
var _god := false
var _logT := 0.0
var _hudDone := false
var layer: CanvasLayer
var _vig: TextureRect
var uiroot: Node2D            # güvenli alan içi (çentik altı / gezinme çubuğu üstü)
var _bands: Array = []
var hud: HUD
var menu: ScrMenu
var levelup: ScrLevelUp
var bless: ScrBless
var pause: ScrPause
var missionend: ScrMissionEnd
var gate: ScrGate
var adwatch: ScrAdWatch
var evo: ScrEvo
var ach: AchToast
var ftue: FtueHint
var ceremony: ScrCeremony      # sandık açılış töreni
var chestinspect: ScrChestInspect
var chardetail: ScrCharDetail
var geardetail: ScrGearDetail
var chestbuy: ScrChestBuy
var drawer: ScrDrawer
var accjourney: ScrAccJourney
var quests: ScrQuests
var sheet: ScrSheet
var battlepass: ScrBattlePass
var celebrate: ScrCelebrate
var settings: ScrSettings

func _init(a = null) -> void:
	g = a
	name = "UI"
	mouse_filter = Control.MOUSE_FILTER_IGNORE

func _ready() -> void:
	if _arg("lang") != "": Settings.data["lang"] = _arg("lang")   # geliştirici
	I18n.boot()
	# arayüz katmanı: 3B (−10) ve dünya yazıları (1) üstünde
	layer = CanvasLayer.new()
	layer.layer = 5
	add_child(layer)
	# savaş vinyeti: kenarlar yumuşakça kararır, göz ortadaki aksiyona gider (yalnız savaşta)
	var vg := Gradient.new()
	vg.offsets = PackedFloat32Array([0.0, 0.55, 1.0])
	vg.colors = PackedColorArray([Color(0, 0, 0, 0), Color(0.02, 0.01, 0.03, 0.10), Color(0.02, 0.01, 0.03, 0.42)])
	var vt := GradientTexture2D.new()
	vt.gradient = vg
	vt.fill = GradientTexture2D.FILL_RADIAL
	vt.fill_from = Vector2(0.5, 0.5)
	vt.fill_to = Vector2(1.08, 0.5)
	vt.width = 128
	vt.height = 256
	_vig = TextureRect.new()
	_vig.texture = vt
	_vig.stretch_mode = TextureRect.STRETCH_SCALE
	_vig.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_vig.visible = false
	layer.add_child(_vig)
	# çentik/gezinme çubuğu bantları (menüde güvenli alan dışı koyu zemin) + güvenli alan kökü
	for i in 4:
		var b := ColorRect.new()
		b.color = Color("#06050a")
		b.mouse_filter = Control.MOUSE_FILTER_IGNORE
		layer.add_child(b)
		_bands.append(b)
	uiroot = Node2D.new()
	uiroot.name = "safe"
	layer.add_child(uiroot)
	_apply_safe()
	get_viewport().size_changed.connect(_apply_safe)
	menu = ScrMenu.new(g)
	uiroot.add_child(menu)
	hud = HUD.new(g)
	layer.add_child(hud)
	levelup = ScrLevelUp.new(g)
	uiroot.add_child(levelup)
	bless = ScrBless.new(g)
	uiroot.add_child(bless)
	pause = ScrPause.new(g)
	uiroot.add_child(pause)
	missionend = ScrMissionEnd.new(g)
	uiroot.add_child(missionend)
	gate = ScrGate.new(g)
	uiroot.add_child(gate)
	adwatch = ScrAdWatch.new(g)
	uiroot.add_child(adwatch)
	evo = ScrEvo.new(g)
	uiroot.add_child(evo)
	ach = AchToast.new(g)
	uiroot.add_child(ach)
	ftue = FtueHint.new()
	layer.add_child(ftue)
	chestinspect = ScrChestInspect.new(g)
	uiroot.add_child(chestinspect)
	ceremony = ScrCeremony.new(g)
	uiroot.add_child(ceremony)
	chardetail = ScrCharDetail.new(g)
	uiroot.add_child(chardetail)
	geardetail = ScrGearDetail.new(g)
	uiroot.add_child(geardetail)
	chestbuy = ScrChestBuy.new(g)
	uiroot.add_child(chestbuy)
	settings = ScrSettings.new(g)
	uiroot.add_child(settings)
	drawer = ScrDrawer.new(g)
	uiroot.add_child(drawer)
	accjourney = ScrAccJourney.new(g)
	uiroot.add_child(accjourney)
	quests = ScrQuests.new(g)
	uiroot.add_child(quests)
	battlepass = ScrBattlePass.new(g)
	uiroot.add_child(battlepass)
	celebrate = ScrCelebrate.new(g)
	uiroot.add_child(celebrate)
	# genel sayfa en üstte (ayarlar / yaş kapısı üstünden de açılır)
	sheet = ScrSheet.new(g)
	uiroot.add_child(sheet)

func _arg(k: String, d: String = "") -> String:
	for a in OS.get_cmdline_user_args():
		if a == k: return "1"
		if a.begins_with(k + "="): return a.substr(k.length() + 1)
	return d

## geliştirici: 3B sandık sahnesi (chesttest=<kademe> open=<0..1> seam=<0..1>)
func _chest_test() -> void:
	var st := ChestStage.new()
	layer.add_child(st)
	st.position = Vector2(20, 200)
	st.setup(350, 300)
	st.set_tier(int(_arg("chesttest", "1")))
	st.p = {"open": float(_arg("open", "0")), "seam": float(_arg("seam", "0"))}

func boot() -> void:
	# cihazda (geliştirici bayrağı yoksa) ana menüyle açılır
	if _arg("menu") != "":
		_shot = _arg("shot", "")
		_shotT = float(_arg("shot_t", "6"))
		_t0 = Time.get_ticks_msec() / 1000.0
	if _arg("autorun") == "":
		g.state = "menu"
		if g.music: g.music.set_state("menu")
		show_menu()
		if _arg("chesttest") != "": _chest_test()
		# geliştirici: kaydırma — swipes=t@x0x y0>x1x y1;… (0,15 sn'de 6 sürükleme adımı)
		for sw in _arg("swipes").split(";", false):
			var a := sw.split("@")
			var pq := a[1].split(">")
			var p0 := pq[0].split("x")
			var p1 := pq[1].split("x")
			var A := Vector2(float(p0[0]), float(p0[1]))
			var B := Vector2(float(p1[0]), float(p1[1]))
			var t0 := float(a[0])
			_gest.append([t0, "down", A])
			for k in range(1, 7): _gest.append([t0 + 0.025 * k, "drag", A.lerp(B, k / 6.0)])
			_gest.append([t0 + 0.18, "up", B])
		for tk in _arg("taps").split(",", false):
			var pp := tk.split("@")
			var at := Vector2(195, 422)
			if pp.size() > 1:
				var xy := pp[1].split("x")
				at = Vector2(float(xy[0]), float(xy[1]))
			_taps.append([float(pp[0]), at])
		if _arg("stones") != "":
			g.add_stones(float(_arg("stones")))
			menu.refresh_wallet(true)
		# geliştirici: gearall=N — her eşyadan N kart (çanta testi)
		if _arg("gearall") != "":
			for e in D.EQUIPMENT: g.add_gear_cards(e.id, int(_arg("gearall")) + randi() % 3)
		if _arg("page") != "":
			menu.set_page(_arg("page"), true)
			var pg = menu.pages.get(_arg("page"))
			if pg and _arg("evtab") != "" and "tab" in pg:
				pg.tab = _arg("evtab")
				pg.render()
			if pg and _arg("chw") != "" and pg.has_method("render_chapters"):
				pg.render_chapters(int(_arg("chw")))   # geliştirici: bölüm seçimini aç
			if pg and _arg("pscroll") != "" and "shell" in pg and pg.shell:
				pg.shell.set_scroll(pg.root, minf(float(_arg("pscroll")), pg.shell.scroll_max(pg.root)))
		# geliştirici: katman aç — ov=drawer|aj|quests|odds:<tür>|doc:<k>|wipe
		var ov := _arg("ov")
		if _arg("cd") != "": open_char_detail(_arg("cd"))      # geliştirici: kahraman detayı
		if ov == "drawer": show_daily_drawer()
		elif ov == "aj": show_account_journey()
		elif ov == "quests": show_quests()
		elif ov == "wipe": confirm_wipe()
		elif ov == "bp": show_battle_pass()
		elif ov.begins_with("fly:"):
			# geliştirici: para uçuşu (fly:gem / fly:coin) — ekran ortasından cüzdana
			var kind := "stone" if ov.substr(4) == "gem" else "ruby"
			get_tree().create_timer(5.0).timeout.connect(func():
				menu.fly_currency(menu.shell, menu.shell.find(".dk-tab", 2), kind))
		elif ov.begins_with("hu:"): celebrate.hero_unlock(ov.substr(3))
		elif ov.begins_with("alu:"): celebrate.level_up({"fromLevel": 4, "toLevel": 5, "rewards": [{"level": 5, "chest": ov.substr(4)}] if ov.substr(4) != "0" else []})
		elif ov.begins_with("upx:"):
			var cid := ov.substr(4)
			g.add_char_cards(cid, 300)
			g.add_rubies(90000)
			chardetail.open(cid)
			chardetail._upgrade()
		elif ov == "gift": celebrate.gift({"h": 6.5, "gold": 240, "chest": "ahsap", "full": false})
		elif ov.begins_with("odds:"): show_odds(ov.substr(5))
		elif ov.begins_with("doc:"): open_doc(ov.substr(4))
		if _arg("ceremony") != "":
			# cerwait=sn: menü ısınması bittikten sonra (gerçek dokunuş gibi) aç
			var cw := float(_arg("cerwait")) if _arg("cerwait") != "" else 0.0
			if cw > 0.0: get_tree().create_timer(cw).timeout.connect(func(): chest_ceremony(_arg("ceremony"), -1, func(): pass))
			else: chest_ceremony(_arg("ceremony"), -1, func(): pass)
		# geliştirici: yuvaları doldur — slots=ahsap:locked,kan:unlocking,kadim:ready
		if _arg("slots") != "":
			var sl := _arg("slots").split(",")
			for i in mini(4, sl.size()):
				var pr := sl[i].split(":")
				if pr.size() < 2: continue
				var tt: float = float(ChestSystem.chests()[pr[0]].time) * 1000.0
				g.chests.slots[i] = {"t": pr[0], "st": pr[1], "at": Clock.now() + tt * 0.6 if pr[1] == "unlocking" else 0.0, "ad": false, "cut": 0.0}
			menu.render_slots()
		return
	if _arg("autorun") != "":
		var ch := _arg("char", "")
		_shot = _arg("shot", "")
		_shotT = float(_arg("shot_t", "6"))
		_t0 = Time.get_ticks_msec() / 1000.0
		if ch != "":
			if not g.meta.charsOwned.has(ch): g.meta.charsOwned.append(ch)
			g.meta.selectedChar = ch
		g.meta.ftue = 1
		g.devSpeed = int(_arg("speed", "1"))
		_god = _arg("god") != ""
		if _arg("dense") != "": g.enemies.devDense = float(_arg("dense"))
		g.start_run(int(_arg("world", "1")), int(_arg("mission", "1")))
		if _arg("spawnn") != "":
			# geliştirici: spawnn=N — savaş başında N düşman (kalabalık performans testi)
			get_tree().create_timer(1.0).timeout.connect(func():
				var E = g.enemies
				E.aliveCap = 9999.0; E.osCap = 9999.0
				for i in int(_arg("spawnn")): E.spawn_one(E.weights, E.hpMul * 20.0, E.dmgMul * 0.05))
		if _arg("pudrop") != "":
			# geliştirici: pudrop — kahramanın çevresine dört güç + XP kristalleri
			get_tree().create_timer(1.2).timeout.connect(func():
				var P = g.pools.powerups
				var ks := ["magnet", "heal", "shield", "freeze"]
				for i in 4: P.take().setup(g.player.x - 105 + i * 70, g.player.y + 150, ks[i])
				for i in 9: g.pools.gems.take().setup(g.player.x - 120 + (i % 3) * 120, g.player.y - 160 - (i / 3) * 40, [1, 6, 30][i % 3]))
		if _arg("altarpick") != "":
			get_tree().create_timer(2.0).timeout.connect(func(): g.events._bless_altar())
		if _arg("altar") != "":
			# geliştirici: altar — savaş başında kahramanın yanında sunak
			get_tree().create_timer(1.5).timeout.connect(func():
				var ev = g.events
				ev._start(ev.EV[0])
				ev.altar.x = g.player.x + float(_arg("altar")); ev.altar.y = g.player.y - 40.0)
		if _arg("wpn") != "":
			# geliştirici: wpn=id:sv,id:sv — savaşa yalnız bu silahlarla başla (efekt testi)
			get_tree().create_timer(0.5).timeout.connect(func():
				g.weapons.slots = {}
				for kv in _arg("wpn").split(",", false):
					var pr := kv.split(":")
					g.weapons.slots[pr[0]] = int(pr[1]) if pr.size() > 1 else 1
				g.weapons.on_weapon_gained())
		if _arg("lvnow") != "":
			# geliştirici: savaş başlayınca seviye kartı ekranı
			get_tree().create_timer(float(_arg("lvnow"))).timeout.connect(func():
				g.player.pendingLevels += 1
				g.enter_level_up())
		if _arg("px") != "" or _arg("py") != "":
			g.player.x = float(_arg("px", "0"))
			g.player.y = float(_arg("py", "0"))
			g.cam = Vector2(g.player.x, g.player.y)
		var hide := _arg("hide", "")
		if hide != "":
			var r3 = g.renderer3d
			for k in hide.split(","):
				match k:
					"ground": r3.ground.queue_free(); r3.ground = MeshInstance3D.new()
					"void": r3.voidGround.visible = false; r3.voidGround.position.y = -9999
					"cliff": r3.cliff.visible = false
					"props": r3.propGroup.visible = false
					"decor": r3.decorGroup.visible = false
					"fx": r3.fxMesh.visible = false; r3.fxMesh.scale = Vector3.ZERO

var _taps: Array = []
var _gest: Array = []

## geliştirici: her alt ağacı tek tek gizleyip çizim çağrısı düşüşünü ölçer — drawprobe=<kare>
func _draw_probe() -> void:
	var cands: Array = []
	var st: Array = [[get_tree().root, 0]]
	while st.size():
		var it: Array = st.pop_back()
		var x: Node = it[0]
		if x is CanvasItem and not (x as CanvasItem).visible: continue
		if x is CanvasItem and int(it[1]) >= 2: cands.append(x)
		if int(it[1]) < 9:
			for c in x.get_children(): st.append([c, int(it[1]) + (1 if x is CanvasItem else 0)])
	var base := 0.0
	for k in 3: await get_tree().process_frame
	base = Performance.get_monitor(Performance.RENDER_TOTAL_DRAW_CALLS_IN_FRAME)
	var res: Array = []
	for x in cands:
		if not is_instance_valid(x) or not (x as CanvasItem).visible: continue
		(x as CanvasItem).visible = false
		await get_tree().process_frame
		await get_tree().process_frame
		var d := Performance.get_monitor(Performance.RENDER_TOTAL_DRAW_CALLS_IN_FRAME)
		(x as CanvasItem).visible = true
		if base - d >= 40: res.append([base - d, str(x.get_path()).replace("/root/Main/UI/", ""), x.get_class()])
	res.sort_custom(func(a, b): return a[0] > b[0])
	print("PROBE base=", base, " cands=", cands.size())
	for r in res.slice(0, 40): print("PROBE ", r[0], " ", r[2], " ", r[1])

## geliştirici: betik sınıfı başına _process kapatılıp TIME_PROCESS düşüşü ölçülür — procprobe=<kare>
## geliştirici: her işleyen düğümün _process'ini 40 kez doğrudan çağırıp süre ölçer (betiğe göre toplam,
## µs/kare) — proctime=<kare>. Yan etkili; ölçümden sonra oyun kapatılmalı.
func _proc_time() -> void:
	var by := {}
	var cnt := {}
	var st: Array = [get_tree().root]
	while st.size():
		var x: Node = st.pop_back()
		for c in x.get_children(): st.append(c)
		if x == self or not x.is_processing() or not x.has_method("_process"): continue
		var sc = x.get_script()
		var nm: String = sc.resource_path.get_file() if sc and sc.resource_path != "" else ("inner:" + str(x.get_parent().get_script().resource_path.get_file() if x.get_parent() and x.get_parent().get_script() else "?"))
		var t0 := Time.get_ticks_usec()
		for i in 40: x.call("_process", 0.016)
		by[nm] = float(by.get(nm, 0.0)) + (Time.get_ticks_usec() - t0) / 40.0
		cnt[nm] = int(cnt.get(nm, 0)) + 1
	var ks := by.keys()
	ks.sort_custom(func(a, b): return by[a] > by[b])
	var tot := 0.0
	for k in ks: tot += by[k]
	print("PTIME total_us=", snappedf(tot, 1))
	# canlı (oturmamış) animasyonlu düğümler: katman → [düğüm anahtarı, animasyon adları]
	for L in get_tree().root.find_children("*", "Lyr", true, false):
		if not (L as Lyr).is_visible_in_tree(): continue
		var live := []
		for n in (L as Lyr)._dyn:
			if not n.settled: live.append(str(n.d.get("key", "?")) + ":" + ",".join((n.anims as Array).map(func(A): return str(A.get("name", "")) + "/" + str(A.get("iter", 1)))))
		if live.size(): print("PLIVE ", L.data.get("name", "?"), " n=", live.size(), " ", live.slice(0, 8))
	for k in ks.slice(0, 25): print("PTIME ", snappedf(by[k], 0.1), " us ", k, " x", cnt[k])

func _proc_probe() -> void:
	var groups := {}
	var st: Array = [get_tree().root]
	while st.size():
		var x: Node = st.pop_back()
		for c in x.get_children(): st.append(c)
		if x == self: continue
		if x.is_processing():
			var sc = x.get_script()
			var nm: String = sc.resource_path.get_file() if sc and sc.resource_path != "" else ("inner:" + x.get_class() + ":" + str(x.get_parent().get_script().resource_path.get_file() if x.get_parent() and x.get_parent().get_script() else ""))
			if not groups.has(nm): groups[nm] = []
			groups[nm].append(x)
	var meas := func(n: int) -> float:
		var t := 0.0
		for k in n:
			await get_tree().process_frame
			t += Performance.get_monitor(Performance.TIME_PROCESS) * 1000.0
		return t / n
	var base: float = await meas.call(30)
	print("PPROBE base=", snappedf(base, 0.1))
	for nm in groups:
		for x in groups[nm]: if is_instance_valid(x): x.set_process(false)
		var v: float = await meas.call(20)
		for x in groups[nm]: if is_instance_valid(x): x.set_process(true)
		await meas.call(4)
		print("PPROBE ", snappedf(base - v, 0.1), " ", nm, " x", groups[nm].size())

## geliştirici: görünür tuval öğelerinin dökümü (çizim çağrısı kaynağı) — dumpci=<kare>
func _dump_ci() -> void:
	var by := {}
	var mats := {}
	var n := 0
	var st: Array = [get_tree().root]
	while st.size():
		var x: Node = st.pop_back()
		if x is CanvasItem and not (x as CanvasItem).visible: continue
		if x is CanvasLayer and not (x as CanvasLayer).visible: continue
		for c in x.get_children(): st.append(c)
		if x is Node3D and not (x as Node3D).visible: continue
		if x is VisualInstance3D:
			var p3 := str(x.get_path()).split("/")
			var t3 := "3D " + "/".join(p3.slice(0, mini(5, p3.size())))
			by[t3] = int(by.get(t3, 0)) + 1
		if x is Viewport and x != get_tree().root: by["VP " + str(x.get_path())] = 1
		if not (x is CanvasItem): continue
		n += 1
		var path := str(x.get_path())
		var parts := path.split("/")
		var top := "/".join(parts.slice(0, mini(6, parts.size())))
		by[top] = int(by.get(top, 0)) + 1
		var ci := x as CanvasItem
		if ci.material: mats[x.get_class() + (":" + ci.material.shader.resource_path.get_file() if ci.material is ShaderMaterial and ci.material.shader else "")] = int(mats.get(x.get_class(), 0)) + 1
	var ks := by.keys()
	ks.sort_custom(func(a, b): return by[a] > by[b])
	print("CI total=", n)
	for k in ks.slice(0, 25): print("CI ", by[k], " ", k)
	# her karede çalışan düğümler (betik sınıfına göre)
	var pr := {}
	var st2: Array = [get_tree().root]
	while st2.size():
		var x: Node = st2.pop_back()
		for c in x.get_children(): st2.append(c)
		if x.is_processing() or x.is_physics_processing():
			var sc = x.get_script()
			var nm: String = (sc.resource_path.get_file() if sc and sc.resource_path != "" else (sc.get_global_name() if sc else x.get_class())) if sc else x.get_class()
			if sc and nm == "": nm = "inner:" + x.get_class()
			pr[nm] = int(pr.get(nm, 0)) + 1
	var pk := pr.keys()
	pk.sort_custom(func(a, b): return pr[a] > pr[b])
	for k in pk.slice(0, 25): print("PROC ", pr[k], " ", k)
	var mk := mats.keys()
	mk.sort_custom(func(a, b): return mats[a] > mats[b])
	for k in mk.slice(0, 15): print("MAT ", mats[k], " ", k)

func _process(_dt: float) -> void:
	Prof.hitch(_dt)
	if _arg("dumpci") != "" and Engine.get_process_frames() == int(_arg("dumpci")): _dump_ci()
	if _arg("drawprobe") != "" and Engine.get_process_frames() == int(_arg("drawprobe")): _draw_probe()
	if _arg("procprobe") != "" and Engine.get_process_frames() == int(_arg("procprobe")): _proc_probe()
	if _arg("proctime") != "" and Engine.get_process_frames() == int(_arg("proctime")): _proc_time()
	# geliştirici: perfmon — profilleyicisiz kare işlem süresi (PROF'un kendi yükü olmadan)
	if _arg("perfmon") != "" and Engine.get_process_frames() % 60 == 0:
		print("PERFMON proc_ms=", snappedf(Performance.get_monitor(Performance.TIME_PROCESS) * 1000.0, 0.1), " nodes=", Performance.get_monitor(Performance.OBJECT_NODE_COUNT), " st=", g.state, " en=", g.enemies.list.size() if g.enemies and "list" in g.enemies else -1)
	if Prof.on and Engine.get_process_frames() % 30 == 0:
		Prof.frame()
		print("MENUPERF draws=", Performance.get_monitor(Performance.RENDER_TOTAL_DRAW_CALLS_IN_FRAME), " items=", Performance.get_monitor(Performance.RENDER_TOTAL_OBJECTS_IN_FRAME), " proc_ms=", snappedf(Performance.get_monitor(Performance.TIME_PROCESS) * 1000.0, 0.1), " nodes=", Performance.get_monitor(Performance.OBJECT_NODE_COUNT), " vmem=", int(Performance.get_monitor(Performance.RENDER_TEXTURE_MEM_USED) / 1048576.0), "MB fps=", Engine.get_frames_per_second())
	if _bands.size():
		var bv: bool = g.state != "playing" and g.state != "paused"
		if _bands[0].visible != bv:
			for b in _bands: b.visible = bv
		if _vig.visible == bv:
			_vig.visible = not bv
			_vig.size = get_viewport().get_visible_rect().size
	# geliştirici: zamanlı dokunuşlar — taps=1.5,3.0@200x400 (sn[@x,y])
	if _t0 > 0 and not _gest.is_empty():
		var nowg := Time.get_ticks_msec() / 1000.0 - _t0
		while not _gest.is_empty() and nowg >= float(_gest[0][0]):
			var G0: Array = _gest.pop_front()
			if G0[1] == "drag":
				var dv := InputEventScreenDrag.new()
				dv.position = G0[2]
				Input.parse_input_event(dv)
			else:
				var tv := InputEventScreenTouch.new()
				tv.pressed = G0[1] == "down"
				tv.position = G0[2]
				Input.parse_input_event(tv)
	if _t0 > 0 and not _taps.is_empty():
		var now0 := Time.get_ticks_msec() / 1000.0 - _t0
		while not _taps.is_empty() and now0 >= float(_taps[0][0]):
			var tp: Array = _taps.pop_front()
			for pr in [true, false]:
				var ev := InputEventScreenTouch.new()
				ev.pressed = pr
				ev.position = tp[1]
				Input.parse_input_event(ev)
	if _t0 > 0 and g.state == "playing":
		if _god and g.player.hp < g.player.maxHp * 0.5: g.player.hp = g.player.maxHp
		var now := Time.get_ticks_msec() / 1000.0
		if now - _logT > 3.0:
			_logT = now
			print("T=", snappedf(g.time, 0.1), " wave=", g.wave, " lvl=", g.player.level, " kills=", g.kills, " hp=", snappedf(g.player.hp, 1), " en=", g.enemies.pool.active.size(), " fps=", Engine.get_frames_per_second(), " proc_ms=", snappedf(Performance.get_monitor(Performance.TIME_PROCESS) * 1000.0, 0.1), " draws=", Performance.get_monitor(Performance.RENDER_TOTAL_DRAW_CALLS_IN_FRAME), " objs=", Performance.get_monitor(Performance.OBJECT_NODE_COUNT), " w=", g.weapons.slots.keys())
	if _arg("quit") != "" and _t0 > 0 and Time.get_ticks_msec() / 1000.0 - _t0 > _shotT + 40: get_tree().quit()
	var hv := _arg("hudv", "")
	if hv != "" and not _hudDone and _shot != "" and Time.get_ticks_msec() / 1000.0 - _t0 > _shotT - float(_arg("hudw", "1")):
		_hudDone = true
		_hud_test(hv)
	# geliştirici: gshots=4.3,4.6,… — savaş saatine (g.time) göre çoklu kare (shot yolu + _i)
	var gs := _arg("gshots", "")
	if gs != "" and _shot != "" and g.state == "playing":
		var L := gs.split(",")
		if _gsI < L.size() and g.time >= float(L[_gsI]):
			get_viewport().get_texture().get_image().save_png(_shot.replace(".png", "_" + str(_gsI) + ".png"))
			_gsI += 1
			if _gsI >= L.size() and _arg("quit") != "": get_tree().quit()
		return
	if _shot != "" and Time.get_ticks_msec() / 1000.0 - _t0 > _shotT:
		var img := get_viewport().get_texture().get_image()
		img.save_png(_shot)
		print("SHOT ", _shot, " fps=", Engine.get_frames_per_second(), " state=", g.state, " enemies=", g.enemies.pool.active.size())
		_shot = ""
		if _arg("quit") != "": get_tree().quit()

func play_battle_intro(info, mid: Callable, end: Callable) -> void:
	missionend.hide_end()
	if _arg("autorun") != "" and _arg("gate") == "":
		mid.call()
		end.call()
		return
	gate.play(info if info is Dictionary else {}, mid, end)

func show_bless_pick(list, cb: Callable, opt = null) -> void:
	if _arg("autopick") != "" or _arg("autorun") != "" and _arg("bless") == "":
		if list is Array and list.size(): cb.call(list[0])
		return
	hud.banner.visible = false
	if opt is Dictionary and String(opt.get("cls", "")).contains("altar"):
		bless.show_pick(list, cb, opt)      # sunak: karanlık ritüel sahnesi (+ / − bedel kartları)
		return
	levelup.show_bless(list, cb, opt)      # çizgi roman kart ekranı (eski kutsama ekranı yerine)
func show_level_up(choices) -> void:
	if _arg("autopick") != "" and choices is Array and choices.size():
		g.call_deferred("pick_upgrade", choices[0])
		return
	hud.banner.visible = false
	levelup.show_choices(choices)
func hide_level_up() -> void: levelup.hide_screen()
func show_game() -> void:
	menu.close()
	missionend.hide_end()
	hud.show_game()
func show_menu() -> void:
	hud.hide_hud()
	missionend.hide_end()
	pause.hide_pause()
	levelup.hide_screen()
	menu.open("savas")
	# bekleyen dönüş hediyesi / hesap seviyesi (ui.js showMenu)
	if g._pendingGift:
		var G = g._pendingGift
		g._pendingGift = null
		get_tree().create_timer(0.9).timeout.connect(func(): _gift_when_free(G))
	if g._pendingLevelUp:
		var P = g._pendingLevelUp
		g._pendingLevelUp = null
		get_tree().create_timer(0.6).timeout.connect(func(): celebrate.level_up(P))
## dönüş hediyesi: tören/katman/savaş sürerken bekler (üstlerine açılıp onları kilitlemesin)
func _gift_when_free(G) -> void:
	var busy: bool = g.state != "menu" or is_instance_valid(g.boot_screen) or (ceremony and ceremony.visible) or sheet.visible or chestinspect.visible \
		or chestbuy.visible or celebrate.visible or quests.visible or battlepass.visible or settings.visible
	if busy:
		get_tree().create_timer(0.5).timeout.connect(func(): _gift_when_free(G))
		return
	celebrate.gift(G)
func show_pause() -> void: pause.show_pause()
func hide_pause() -> void: pause.hide_pause()
func show_settings() -> void: _ov("set", func(): settings.show_settings(pause.visible))
func hide_settings() -> void: settings.hide_settings()
func settings_open() -> bool: return settings.visible
## yasal belge / destek sayfası (sheet) — GEÇİCİ: menü sayfaları taşınınca tam sayfa
func open_doc(kind: String, on_close := Callable()) -> void:
	if kind == "support":
		toast("DESTEK: destek@shadowrend.app")
		return
	sheet.doc(kind, on_close)
func confirm_wipe() -> void: sheet.wipe()
func show_odds(t: String) -> void: sheet.odds(t)
func show_quests() -> void: _ov("qx", func(): quests.open())
func show_daily_drawer() -> void: _ov("dd", func(): drawer.open())
func show_account_journey() -> void: _ov("aj", func(): accjourney.open())
func show_battle_pass() -> void: _ov("bp", func(): battlepass.open())
## ui.js showArmory: menü açıkken cüzdan + açık sayfa tazelenir (kuşanım · kahraman · ana sayfa)
func show_armory() -> void:
	if menu == null or not menu.visible: return
	menu.refresh_wallet()
	if menu.page == "cephane" or menu.page == "kahraman" or menu.page == "savas":
		menu._render(menu.page)
func show_mission_end(won, info) -> void:
	hud.hide_hud()
	levelup.hide_screen()
	pause.hide_pause()
	missionend.show_end(bool(won), info if info is Dictionary else {})
	var na = g._achNew
	g._achNew = []
	if na is Array and na.size(): ach.push(na, 2.3)
func show_ad_watch(n, cb) -> void:
	missionend.hide_end()
	adwatch.show_ad(int(n), cb)
func show_boss_bar(b) -> void: hud.show_boss_bar(b)
func hide_boss_bar() -> void: hud.hide_boss_bar()
func boss_moment(k, b) -> void: hud.boss_moment(str(k), b)
func banner(a, b = "", _c = null) -> void: hud.banner_show(str(a), b)
func event_banner(a, b = "", c = null) -> void: hud.event_banner(str(a), str(b), c if c != null else "#f0c77a")
func evo_cinema(e, cb: Callable) -> void: evo.play(e if e is Dictionary else {}, cb)
func ftue_show(k, _t = null) -> void: ftue.show_kind(str(k) if k != null else "")
func hurt_dir(a) -> void: hud.hurt_dir(float(a))
func hurt_flash() -> void: hud.hurt_flash()
func powerup_flash(_k) -> void: hud._puKey = ""
func refresh_wallet() -> void: menu.refresh_wallet()
func render_events() -> void:
	if menu and menu.pages.has("etkinlik") and menu.pages["etkinlik"].is_visible_in_tree(): menu.pages["etkinlik"].render()
func set_danger(on) -> void: hud.set_danger(bool(on))
func set_dying(on) -> void: hud.set_dying(bool(on))
func set_nm_frame(_on) -> void: pass
func set_nm_run(on) -> void: hud.set_nm_run(bool(on))
var _pick = null
func set_pick(w, m) -> void:
	_pick = {"w": int(w), "m": int(m)}
func stored_pick(): return _pick
func toast(s) -> void: hud.toast(str(s))

## katman açılışı: süre ölçümü + kullandığı dokuların kaydı (UIPrewarm bir sonraki sefer ön yükler)
const OVERLAYS := ["_cb", "_ci", "_cd", "_gd", "_dd", "_qx", "_bp", "_aj", "_set"]
var _ovWait := false
func _ov(k: String, f: Callable) -> void:
	# dokuları önbellekte değilse önce arka planda yüklenir (en çok ~0,45 sn); bu sürede ana iş
	# parçacığı çözme yapmaz, düğme basış animasyonu akmaya devam eder (dondurma yerine kısa gecikme)
	if _ovWait: return
	if g.state == "menu":
		_ovWait = true
		await UITex.await_ready(self, UITex.manifest("_" + k), 0.45)
		_ovWait = false
	Prof.s("ov:" + k)
	var rk := UITex.rec_begin("_" + k)
	f.call()
	UITex.rec_end(rk)
	Prof.t("ov:" + k)

## eşya inceleme ekranı
func open_gear_detail(id: String) -> void:
	if geardetail: _ov("gd", func(): geardetail.open(id))
	else: toast("YAKINDA")

## kahraman detay ekranı
func open_char_detail(id: String) -> void:
	if chardetail: _ov("cd", func(): chardetail.open(id))
	else: toast("YAKINDA")

## sandık satın alma pop-up'ı (mağaza vitrini / günün fırsatı)
func chest_buy(t: String, o: Dictionary) -> void:
	_ov("cb", func(): chestbuy.open(t, o))

## sandık inceleme pop-up'ı (yuva i)
func chest_inspect(i: int) -> void:
	_ov("ci", func(): chestinspect.open(i))

## açılış töreni; slot < 0 → yuva harcamaz (ücretsiz/zafer/mağaza)
func chest_ceremony(type: String, slot: int, done: Callable) -> void:
	if ceremony:
		Prof.s("ceremony")
		# tören boyunca kullanılan dokular kaydedilir (ScrCeremony._finish kapatır)
		UITex.rec_begin("_cer")
		ceremony.play(type, slot, done)
		if not ceremony.visible and UITex.rec == "_cer": UITex.rec = ""
		Prof.t("ceremony")
	else:
		var rw: Array = g.chests.apply_pity(g.chests.roll_rewards(type))
		g.chests.apply_rewards(rw)
		if slot >= 0:
			g.chests.slots[slot] = null
			g.chests.save()
		if done.is_valid(): done.call()
func ult_flash(c, r) -> void: hud.ult_flash(c, int(r))
func update_hud() -> void: hud.update_hud()

## Geliştirici: HUD durum testi (web tools webhud.mjs ile aynı durumlar)
func _hud_test(hv: String) -> void:
	match hv:
		"1":
			g.powerups.shieldT = 5; g.powerups.freezeT = 1.5; g.powerups.magnetT = 4
			g._cbN = 12; g._cbT = g.time; g._cbTier = 2
			g.ult.charge = 80; g.ult.ready = true
			show_boss_bar("KADİM HASATÇI")
			event_banner("KUŞATMA", "Halka kapanıyor — kaçış yok", "#ff6a3d")
			toast("HENÜZ HAZIR DEĞİL")
		"2":
			g.ult.charge = 40
			banner("DALGA 2 / 5", "SOLGUN MEZARLIK")
		"3":
			boss_moment("intro", "KADİM HASATÇI")
		"4":
			g.enter_level_up()
		"6":
			g.pause_game()
		"11", "12", "13":
			g.pause_game()
			show_settings()
			settings._set_tab({"11": "oyun", "12": "erisim", "13": "hesap"}[hv])
		"9":
			evo_cinema({"icon": "kilic", "from": "SEHER KILICI", "to": "ŞAFAK KILICI"}, func(): pass)
		"10":
			show_ad_watch(3, func(): pass)
			ach.push([{"name": "DOKUNULMAZ", "gold": 100}])
		"7":
			g.kills = 187
			g.mission_complete()
		"8":
			g.kills = 42
			g.player.hp = 0
			g.game_over()
		"5":
			g.state = "levelup"
			var mk := func(o: Dictionary) -> Dictionary:
				var c := {"tag": "X", "name": "Kadim Yürek", "desc": "Azami can +22 — aldığın an dolar.", "stats": [], "stag": "CELIK", "stagN": 0}
				c.merge(o, true)
				return c
			show_level_up([mk.call({"kind": "passive", "id": "kalp", "level": 1, "max": 4, "name": "Kadim Yürek"}),
				mk.call({"kind": "special", "sig": true, "myth": true, "seher": true, "id": "ikiz", "icon": "kilic", "tier": 2, "level": 1, "max": 5, "name": "İkiz Savuruş", "desc": "Aynı hedefe ters yönden ikinci kesik.", "stag": "KOR", "stagN": 1}),
				mk.call({"kind": "special", "id": "perkx", "icon": "yay", "level": 0, "max": 1, "name": "Uzun Kavis", "desc": "Menzil +%8, hasar +%10.", "stag": "RUH", "stagN": 3})])

# ═══════════ GERİ TUŞU (ui.js handleBack) ═══════════
## Android geri tuşu / masaüstünde ESC: en üstteki katman kapanır; oyunda duraklatır /
## sürdürür; menüde alt sayfadan kök sekmeye döner; yalnız kök sekmede uygulama kapanır.
func _notification(what: int) -> void:
	if what == NOTIFICATION_WM_GO_BACK_REQUEST:
		if not handle_back(): get_tree().quit()

func _unhandled_input(ev: InputEvent) -> void:
	if ev is InputEventKey and ev.pressed and not ev.echo and ev.keycode == KEY_ESCAPE:
		handle_back()
		get_viewport().set_input_as_handled()

func handle_back() -> bool:
	if gate and gate.visible: return true
	if ceremony and ceremony.visible: return true
	if celebrate and celebrate.visible:
		celebrate._close()
		return true
	if sheet and sheet.visible:
		sheet.close()
		return true
	if settings_open():
		hide_settings()
		return true
	for S in [chestbuy, chestinspect, geardetail, chardetail, drawer, battlepass, quests, accjourney]:
		if S and S.visible:
			S.close()
			return true
	if g.state == "playing":
		g.pause_game()
		return true
	if g.state == "paused":
		g.resume_game()
		return true
	if menu and menu.visible:
		var jp = menu.pages.get("dunyalar")
		if menu.page == "dunyalar" and jp and jp.mode == "chapters":
			jp.open_worlds()
			return true
		if menu.page != "savas":
			menu.set_page("savas")
			return true
	return false

## güvenli alan: arayüz kökü üst boşluk kadar aşağı; bantlar boşlukları örter
func _apply_safe() -> void:
	if uiroot == null: return
	var vp := get_viewport()
	var vs := vp.get_visible_rect().size
	var sa := UIK.safe(vp)
	var k := UIK.ui_scale(vp)
	var w := vs.x * k
	var x0 := (vs.x - w) * 0.5
	uiroot.position = Vector2(x0, sa[0])
	uiroot.scale = Vector2.ONE * k
	var bot := vs.y - sa[2]
	_bands[0].position = Vector2.ZERO
	_bands[0].size = Vector2(vs.x, sa[0])
	_bands[1].position = Vector2(0, bot)
	_bands[1].size = Vector2(vs.x, sa[2])
	_bands[2].position = Vector2(0, sa[0])
	_bands[2].size = Vector2(x0, bot - sa[0])
	_bands[3].position = Vector2(x0 + w, sa[0])
	_bands[3].size = Vector2(vs.x - x0 - w, bot - sa[0])
