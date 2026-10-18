extends Control
## ui.js — (GEÇİCİ İSKELET) Arayüz katmanı henüz taşınmadı; oyun akışının
## kırılmaması için tüm çağrılar burada karşılanır. Geliştirme bayrakları:
##   -- autorun [char=<id>] [world=<n>] [mission=<n>] [shot=<png>] [shot_t=<sn>]
var g
var _ldHold := false
var _shot := ""
var _shotT := 6.0
var _t0 := 0.0
var _god := false
var _logT := 0.0
var _hudDone := false
var layer: CanvasLayer
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
	# arayüz katmanı: 3B (−10) ve dünya yazıları (1) üstünde
	layer = CanvasLayer.new()
	layer.layer = 5
	add_child(layer)
	menu = ScrMenu.new(g)
	layer.add_child(menu)
	hud = HUD.new(g)
	layer.add_child(hud)
	levelup = ScrLevelUp.new(g)
	layer.add_child(levelup)
	bless = ScrBless.new(g)
	layer.add_child(bless)
	pause = ScrPause.new(g)
	layer.add_child(pause)
	missionend = ScrMissionEnd.new(g)
	layer.add_child(missionend)
	gate = ScrGate.new(g)
	layer.add_child(gate)
	adwatch = ScrAdWatch.new(g)
	layer.add_child(adwatch)
	evo = ScrEvo.new(g)
	layer.add_child(evo)
	ach = AchToast.new(g)
	layer.add_child(ach)
	ftue = FtueHint.new()
	layer.add_child(ftue)
	chestinspect = ScrChestInspect.new(g)
	layer.add_child(chestinspect)
	ceremony = ScrCeremony.new(g)
	layer.add_child(ceremony)
	chardetail = ScrCharDetail.new(g)
	layer.add_child(chardetail)
	geardetail = ScrGearDetail.new(g)
	layer.add_child(geardetail)
	chestbuy = ScrChestBuy.new(g)
	layer.add_child(chestbuy)
	settings = ScrSettings.new(g)
	layer.add_child(settings)
	drawer = ScrDrawer.new(g)
	layer.add_child(drawer)
	accjourney = ScrAccJourney.new(g)
	layer.add_child(accjourney)
	quests = ScrQuests.new(g)
	layer.add_child(quests)
	battlepass = ScrBattlePass.new(g)
	layer.add_child(battlepass)
	celebrate = ScrCelebrate.new(g)
	layer.add_child(celebrate)
	# genel sayfa en üstte (ayarlar / yaş kapısı üstünden de açılır)
	sheet = ScrSheet.new(g)
	layer.add_child(sheet)

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
		if _arg("page") != "":
			menu.set_page(_arg("page"), true)
			var pg = menu.pages.get(_arg("page"))
			if pg and _arg("evtab") != "" and "tab" in pg:
				pg.tab = _arg("evtab")
				pg.render()
			if pg and _arg("pscroll") != "" and "shell" in pg and pg.shell:
				pg.shell.set_scroll(pg.root, minf(float(_arg("pscroll")), pg.shell.scroll_max(pg.root)))
		# geliştirici: katman aç — ov=drawer|aj|quests|odds:<tür>|doc:<k>|wipe
		var ov := _arg("ov")
		if ov == "drawer": show_daily_drawer()
		elif ov == "aj": show_account_journey()
		elif ov == "quests": show_quests()
		elif ov == "wipe": confirm_wipe()
		elif ov == "bp": show_battle_pass()
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
		if _arg("ceremony") != "": chest_ceremony(_arg("ceremony"), -1, func(): pass)
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
		g.start_run(int(_arg("world", "1")), int(_arg("mission", "1")))
		var hide := _arg("hide", "")
		if hide != "":
			var r3 = g.renderer3d
			for k in hide.split(","):
				match k:
					"ground": r3.ground.queue_free(); r3.ground = MeshInstance3D.new()
					"void": r3.voidGround.visible = false; r3.voidGround.position.y = -9999
					"props": r3.propGroup.visible = false
					"decor": r3.decorGroup.visible = false
					"fx": r3.fxMesh.visible = false; r3.fxMesh.scale = Vector3.ZERO

var _taps: Array = []

func _process(_dt: float) -> void:
	# geliştirici: zamanlı dokunuşlar — taps=1.5,3.0@200x400 (sn[@x,y])
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
			print("T=", snappedf(g.time, 0.1), " wave=", g.wave, " lvl=", g.player.level, " kills=", g.kills, " hp=", snappedf(g.player.hp, 1), " en=", g.enemies.pool.active.size(), " fps=", Engine.get_frames_per_second(), " w=", g.weapons.slots.keys())
	if _arg("quit") != "" and _t0 > 0 and Time.get_ticks_msec() / 1000.0 - _t0 > _shotT + 40: get_tree().quit()
	var hv := _arg("hudv", "")
	if hv != "" and not _hudDone and _shot != "" and Time.get_ticks_msec() / 1000.0 - _t0 > _shotT - float(_arg("hudw", "1")):
		_hudDone = true
		_hud_test(hv)
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
	bless.show_pick(list, cb, opt)
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
		get_tree().create_timer(0.9).timeout.connect(func(): celebrate.gift(G))
	if g._pendingLevelUp:
		var P = g._pendingLevelUp
		g._pendingLevelUp = null
		get_tree().create_timer(0.6).timeout.connect(func(): celebrate.level_up(P))
func show_pause() -> void: pause.show_pause()
func hide_pause() -> void: pause.hide_pause()
func show_settings() -> void: settings.show_settings(pause.visible)
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
func show_quests() -> void: quests.open()
func show_daily_drawer() -> void: drawer.open()
func show_account_journey() -> void: accjourney.open()
func show_battle_pass() -> void: battlepass.open()
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

## eşya inceleme ekranı
func open_gear_detail(id: String) -> void:
	if geardetail: geardetail.open(id)
	else: toast("YAKINDA")

## kahraman detay ekranı
func open_char_detail(id: String) -> void:
	if chardetail: chardetail.open(id)
	else: toast("YAKINDA")

## sandık satın alma pop-up'ı (mağaza vitrini / günün fırsatı)
func chest_buy(t: String, o: Dictionary) -> void:
	chestbuy.open(t, o)

## sandık inceleme pop-up'ı (yuva i)
func chest_inspect(i: int) -> void:
	chestinspect.open(i)

## açılış töreni; slot < 0 → yuva harcamaz (ücretsiz/zafer/mağaza)
func chest_ceremony(type: String, slot: int, done: Callable) -> void:
	if ceremony: ceremony.play(type, slot, done)
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

