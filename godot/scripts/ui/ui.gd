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
var levelup: ScrLevelUp
var bless: ScrBless
var pause: ScrPause
var missionend: ScrMissionEnd

func _init(a = null) -> void:
	g = a
	name = "UI"
	mouse_filter = Control.MOUSE_FILTER_IGNORE

func _ready() -> void:
	# arayüz katmanı: 3B (−10) ve dünya yazıları (1) üstünde
	layer = CanvasLayer.new()
	layer.layer = 5
	add_child(layer)
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

func _arg(k: String, d: String = "") -> String:
	for a in OS.get_cmdline_user_args():
		if a == k: return "1"
		if a.begins_with(k + "="): return a.substr(k.length() + 1)
	return d

func boot() -> void:
	# GEÇİCİ TEST AKIŞI: arayüz taşınana kadar cihazda doğrudan savaşa girilir.
	if _arg("autorun") == "" and not OS.has_feature("editor"):
		g.meta.ftue = 1
		if not g.meta.charsOwned.has("seher"): g.meta.charsOwned.append("seher")
		g.meta.selectedChar = "seher"
		g.start_run(1, 1)
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

func _process(_dt: float) -> void:
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

func play_battle_intro(_info, mid: Callable, end: Callable) -> void:
	mid.call()
	end.call()

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
	missionend.hide_end()
	hud.show_game()
func show_menu() -> void:
	hud.hide_hud()
	missionend.hide_end()
	pause.hide_pause()
	levelup.hide_screen()
	# GEÇİCİ: menüler taşınana kadar menüye dönüş yeni bir test koşusu başlatır
	if _arg("autorun") == "": get_tree().create_timer(0.6).timeout.connect(func(): g.start_run(1, 1))
func show_pause() -> void: pause.show_pause()
func hide_pause() -> void: pause.hide_pause()
func show_settings() -> void: toast("AYARLAR YAKINDA")
func show_armory() -> void: pass
func show_mission_end(won, info) -> void:
	hud.hide_hud()
	levelup.hide_screen()
	pause.hide_pause()
	missionend.show_end(bool(won), info if info is Dictionary else {})
func show_ad_watch(_n, _cb) -> void: pass
func show_boss_bar(b) -> void: hud.show_boss_bar(b)
func hide_boss_bar() -> void: hud.hide_boss_bar()
func boss_moment(k, b) -> void: hud.boss_moment(str(k), b)
func banner(a, b = "", _c = null) -> void: hud.banner_show(str(a), b)
func event_banner(a, b = "", c = null) -> void: hud.event_banner(str(a), str(b), c if c != null else "#f0c77a")
func evo_cinema(_e, cb: Callable) -> void: cb.call()
func ftue_show(_k, _t) -> void: pass
func hurt_dir(a) -> void: hud.hurt_dir(float(a))
func hurt_flash() -> void: hud.hurt_flash()
func powerup_flash(_k) -> void: hud._puKey = ""
func refresh_wallet() -> void: pass
func render_events() -> void: pass
func set_danger(on) -> void: hud.set_danger(bool(on))
func set_dying(on) -> void: hud.set_dying(bool(on))
func set_nm_frame(_on) -> void: pass
func set_nm_run(on) -> void: hud.set_nm_run(bool(on))
func set_pick(_a, _b) -> void: pass
func toast(s) -> void: hud.toast(str(s))
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
