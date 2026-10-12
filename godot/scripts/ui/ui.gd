extends Control
## ui.js — (GEÇİCİ İSKELET) Arayüz katmanı henüz taşınmadı; oyun akışının
## kırılmaması için tüm çağrılar burada karşılanır. Geliştirme bayrakları:
##   -- autorun [char=<id>] [world=<n>] [mission=<n>] [shot=<png>] [shot_t=<sn>]
var g
var _ldHold := false
var _shot := ""
var _shotT := 6.0
var _t0 := 0.0

func _init(a = null) -> void:
	g = a
	name = "UI"
	mouse_filter = Control.MOUSE_FILTER_IGNORE

func _arg(k: String, d: String = "") -> String:
	for a in OS.get_cmdline_user_args():
		if a == k: return "1"
		if a.begins_with(k + "="): return a.substr(k.length() + 1)
	return d

func boot() -> void:
	if _arg("autorun") != "":
		var ch := _arg("char", "")
		if ch != "":
			g.meta.selectedChar = ch
			if not g.meta.chars.has(ch): g.meta.chars[ch] = {"lvl": 1}
		g.meta.ftue = 1
		_shot = _arg("shot", "")
		_shotT = float(_arg("shot_t", "6"))
		_t0 = Time.get_ticks_msec() / 1000.0
		g.start_run(int(_arg("world", "1")), int(_arg("mission", "1")))

func _process(_dt: float) -> void:
	if _shot != "" and Time.get_ticks_msec() / 1000.0 - _t0 > _shotT:
		var img := get_viewport().get_texture().get_image()
		img.save_png(_shot)
		print("SHOT ", _shot, " fps=", Engine.get_frames_per_second(), " state=", g.state, " enemies=", g.enemies.pool.active.size())
		_shot = ""
		if _arg("quit") != "": get_tree().quit()

func play_battle_intro(_info, mid: Callable, end: Callable) -> void:
	mid.call()
	end.call()

func show_bless_pick(list, cb: Callable) -> void:
	if list is Array and list.size(): cb.call(list[0])
func show_level_up(choices) -> void:
	if choices is Array and choices.size(): g.call_deferred("pick_upgrade", choices[0])
func hide_level_up() -> void: pass
func show_game() -> void: pass
func show_menu() -> void: pass
func show_pause() -> void: pass
func hide_pause() -> void: pass
func show_armory() -> void: pass
func show_mission_end(_won, _info) -> void: pass
func show_ad_watch(_n, _cb) -> void: pass
func show_boss_bar(_b) -> void: pass
func hide_boss_bar() -> void: pass
func boss_moment(_k, _b) -> void: pass
func banner(_a, _b = "", _c = null) -> void: pass
func event_banner(_a, _b = "", _c = null) -> void: pass
func evo_cinema(_e, cb: Callable) -> void: cb.call()
func ftue_show(_k, _t) -> void: pass
func hurt_dir(_a) -> void: pass
func hurt_flash() -> void: pass
func powerup_flash(_k) -> void: pass
func refresh_wallet() -> void: pass
func render_events() -> void: pass
func set_danger(_on) -> void: pass
func set_dying(_on) -> void: pass
func set_nm_frame(_on) -> void: pass
func set_nm_run(_on) -> void: pass
func set_pick(_a, _b) -> void: pass
func toast(_s) -> void: pass
func ult_flash(_c, _r) -> void: pass
func update_hud() -> void: pass
