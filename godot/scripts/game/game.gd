class_name Game
extends Node
## main.js — Oyun çekirdeği (birebir).
## • 60 Hz sabit adım akümülatörü (MAX_STEPS 5, rdt ≤ 0,1)
## • Kampanya: 10 dünya × 10 görev, dalga akışı, görev sonu ödülleri
## • Travma tabanlı pürüzsüz sarsıntı + yönlü tekme + zoom vurgusu
## • Sıfır tahsis havuzları · cüzdan (her zaman oku-topla-yaz)
## Sahne düzeni: 3B dünya bir SubViewport'ta (dinamik çözünürlük — web'deki
## WebGL tuvali), 2B üst katman (hasar yazıları, joystick, işaretler) tam
## çözünürlükte (web'deki #game tuvali), arayüz en üstte (web'deki DOM).

const STEP := 1.0 / 60.0
const MAX_STEPS := 5
## Geliştirme: hızlandırılmış simülasyon (yalnız -- speed=N ile)
var devSpeed := 1
const CULL_MARGIN := 72.0
const RUBY_KEY := "kh_rubies"
const STONE_KEY := "kh_bloodstone"
const BOSS_DEATH := [
	{"word": "RUHU DAĞILDI", "cols": ["#cfe3ff", "#8aa4c8", "#ffffff"], "n": 60, "sp": 180, "life": 1.6, "size": 3.4, "dir": "up"},
	{"word": "KORA DÖNDÜ", "cols": ["#ffb45a", "#ff6a2a", "#fff0c4"], "n": 70, "sp": 420, "life": 1.1, "size": 3.8, "dir": "out"},
	{"word": "BATAĞA GÖMÜLDÜ", "cols": ["#9fd46a", "#4a7a3a", "#d8f0a0"], "n": 56, "sp": 140, "life": 1.7, "size": 4.2, "dir": "up"},
	{"word": "IŞIKTA ERİDİ", "cols": ["#f0cf78", "#fff3c0", "#d9a642"], "n": 64, "sp": 260, "life": 1.4, "size": 3.2, "dir": "up"},
	{"word": "HİÇLİĞE ÇEKİLDİ", "cols": ["#b48aff", "#5a3aa0", "#e8dcff"], "n": 64, "sp": 300, "life": 0.9, "size": 3.2, "dir": "in"},
	{"word": "KRİSTALE BÖLÜNDÜ", "cols": ["#9fe8ff", "#5ab8e0", "#ffffff"], "n": 58, "sp": 460, "life": 1.0, "size": 4.4, "dir": "out"},
	{"word": "TUZA DÖNÜŞTÜ", "cols": ["#f4ece6", "#d8c8b0", "#ffffff"], "n": 70, "sp": 220, "life": 1.5, "size": 3.0, "dir": "out"},
	{"word": "BUZA KESİLDİ", "cols": ["#c8f0ff", "#7cc8f0", "#ffffff"], "n": 60, "sp": 380, "life": 1.2, "size": 4.0, "dir": "out"},
	{"word": "KEMİKLERİ SAÇILDI", "cols": ["#e8e4d8", "#a89c84", "#fff8e8"], "n": 50, "sp": 400, "life": 1.2, "size": 4.6, "dir": "out"},
	{"word": "ÇARKLARI DURDU", "cols": ["#e8b860", "#9a6a28", "#fff0c4"], "n": 60, "sp": 340, "life": 1.0, "size": 3.6, "dir": "in"},
]

# ── kalıcı ──
var meta: Dictionary
var progress: Dictionary
var chests: ChestSystem
var dailies: Dailies
var _pendingGift = null
var _pendingLevelUp = null

# ── cihaz ──
var isMobile := false
var qualityTier := "mid"
var w := 390.0
var h := 844.0
var maxEnemies := 0

# ── durum ──
var state := "menu"
var time := 0.0
var kills := 0
var freeze := 0.0
var trauma := 0.0
var shakeX := 0.0
var shakeY := 0.0
var shakeR := 0.0
var _shT := 0.0
var _kax := 0.0
var _kay := 0.0
var _kickT := 9.0
var _punchA := 0.0
var _punchT := 9.0
var zoomP := 0.0
var _dangerOn := false
var motionK := 1.0
var _bigTxt := false

var worldId := 1
var missionId := 1
var msn: Dictionary
var wave := 1
var waveTimer := 0.0
var cam := Vector2.ZERO
var viewL := 0.0
var viewT := 0.0
var viewR := 0.0
var viewB := 0.0
var fpsEma := 60.0

var pools := {}
var _exScratch: Array = []
var _pulseScratch: Array = []

# ── alt sistemler ──
var audio
var music
var input: Joystick
var player: Player
var enemies: EnemyManager
var weapons: WeaponManager
var ui
var renderer3d
var overlay
var props: PropField
var objectives: ObjectiveManager
var powerups: PowerupManager
var fieldChests: FieldChests
var ult: Ultimate
var events: WorldEvents
var mode: MissionMode

# ── arena ──
var arena = null
var arenaMapId := "mezarlik"
var arenaLayout: Dictionary = {}
var decor: Array = []
var fx: Array = []
var decorStamp := 0
var _arenaWorld := -1
var arenaBakeMs := 0.0
var _intro_wi := 0
var _intro_mi := 0
var _intro_bless = null

# ── koşu ──
var sealRun = null
var towerRun = null
var nmRun = null
var _introBusy := false
var pendingWaveBonus := false
var reviveUsed := false
var _hpFloor := 1.0
var rerolls := 3
var _eliteK := 0
var _ftuePow := false
var _bless = null
var _lookX := 0.0
var _lookY := 0.0
var _objCard := false
var _lvDelay := 0.0
var _pendingObjCard := false
var _inWaveBonus := false
var _evoCine = null
var _fc0 := 0
var _masK := 0
var _achK := 0
var _achU := 0
var _cbN := 0
var _cbT := -9.0
var _cbTier := 0
var _cbBest := 0
var _stressT := 0.0
var _bossOutro := 0.0
var _dying := 0.0
var _harvested := false
var _metaDirty := false
var _achNew: Array = []
var _journey = null
var _battHint := false
var _fxRingT := -1.0
var _hbAt := -9.0
var _hudTick := 0
var _stillN := 0
var _menuSkip := false
var _tilesPrefetched := false

# ── döngü ──
var last := 0.0
var acc := 0.0
var _curtain_at := -1.0

func _now_ms() -> float:
	return Time.get_ticks_usec() / 1000.0

var boot_screen: ScrBoot
var booted := false

## yükleme adımı: açılış ekranı ilerler, bir kare çizilir (ekran donmaz, çubuk akar)
func _boot_step(p: float) -> void:
	if boot_screen: boot_screen.set_progress(p)
	await get_tree().process_frame

func _ready() -> void:
	# açılış ekranı ilk karede: kurulum bitene dek oyun döngüsü kapalı
	set_process(false)
	set_physics_process(false)
	boot_screen = ScrBoot.new()
	add_child(boot_screen)
	await get_tree().process_frame
	await get_tree().process_frame
	PerfLog.err_ctx = self
	Clock.boot()
	meta = load_meta()
	progress = D.loadProgress()
	chests = ChestSystem.new(self)
	_pendingGift = Journey.gift_collect(self)
	if meta.account.xp >= meta.account.xpNext: add_account_xp(0)
	dailies = Dailies.new(self)

	isMobile = OS.has_feature("mobile") or DisplayServer.is_touchscreen_available()
	qualityTier = _guess_tier()
	for a in OS.get_cmdline_user_args():
		if a.begins_with("tier="): qualityTier = a.substr(5)     # geliştirici: kademe zorla
	var L = Store.get_item("kh_learntier_v1")
	var TT := ["low", "mid", "high"]
	if L != null and TT.has(L) and TT.find(L) < TT.find(qualityTier): qualityTier = L
	Settings.attach(self, qualityTier, isMobile)
	Quality.init(Settings.tier(), isMobile)
	Quality.changed.connect(_on_quality_changed)
	maxEnemies = Quality.budget("enemies")
	msn = D.missionDef(1, 1)

	await _boot_step(0.12)
	_build_pools()
	await _boot_step(0.2)

	audio = AudioFX.new(self)
	add_child(audio)
	music = Music.new(audio)
	add_child(music)
	input = Joystick.new(self)
	add_child(input)
	player = Player.new(self)
	enemies = EnemyManager.new(self)
	weapons = WeaponManager.new(self)

	enemies.pool.prewarm(Quality.budget("enemies") + 24)
	pools.particles.prewarm(Quality.budget("particles") + 60)
	pools.texts.prewarm(140)
	pools.gems.prewarm(240)
	pools.eBullets.prewarm(220)
	pools.pBullets.prewarm(140)
	pools.rings.prewarm(60)
	await _boot_step(0.4)

	renderer3d = Render3D.new(self)
	add_child(renderer3d)
	await _boot_step(0.58)
	overlay = Overlay2D.new(self)
	add_child(overlay)
	ui = load("res://scripts/ui/ui.gd").new(self)
	add_child(ui)
	await _boot_step(0.72)

	props = PropField.new(self)
	objectives = ObjectiveManager.new(self)
	powerups = PowerupManager.new(self)
	fieldChests = FieldChests.new(self)
	ult = Ultimate.new(self)
	events = WorldEvents.new(self)
	mode = MissionMode.new(self)

	get_viewport().size_changed.connect(resize)
	resize()
	Settings.apply_all()
	await _boot_step(0.8)
	ui.boot()
	last = _now_ms()
	set_process(true)
	set_physics_process(true)
	booted = true
	# menü kuruldu; ilk kareler (doku yükleme, ilk çizim) da açılış ekranının ardında geçsin
	await _boot_step(0.9)
	await get_tree().process_frame
	boot_screen.finish(func(): if audio: audio.play("boot"))

func _guess_tier() -> String:
	# web: bellek + çekirdek + dokunmatik + GPU ailesi; yerelde aynı mantık
	var cores := OS.get_processor_count()
	var mem_mb: float = OS.get_memory_info().get("physical", 0) / 1048576.0
	var t := "high"
	if isMobile:
		if (mem_mb > 0 and mem_mb <= 3200) or cores <= 4: t = "low"
		elif (mem_mb > 0 and mem_mb <= 6400) or cores <= 6: t = "mid"
		else: t = "mid"
	var gpu := RenderingServer.get_video_adapter_name().to_lower()
	var weak := RegEx.create_from_string("mali-(4\\d\\d|t[678]\\d\\d|g31|g51|g52)|adreno.{0,4}(3\\d\\d|4\\d\\d|50\\d|51\\d)|powervr (sgx|rogue ge8)|swiftshader|llvmpipe|videocore")
	var midg := RegEx.create_from_string("mali-g(57|68|71|72|76)|adreno.{0,4}(52\\d|53\\d|54\\d|6[01]\\d)|powervr.*(9xm|gm9)")
	if isMobile and weak.search(gpu): t = "low"
	elif isMobile and midg.search(gpu) and t == "high": t = "mid"
	# yerel uygulamada "masaüstü + dokunmatik değil" = yüksek; mobilde 8 GB+ ve güçlü GPU yüksek olabilir
	if isMobile and t == "mid" and mem_mb >= 7600 and cores >= 8 and not midg.search(gpu) and not weak.search(gpu): t = "high"
	return t

func _build_pools() -> void:
	pools.particles = Pool.new("particles", func(): return Ent.Particle.new(), 600)
	pools.texts = Pool.new("texts", func(): return Ent.FloatText.new(), 80)
	pools.gems = Pool.new("gems", func(): return Ent.Gem.new(), 400)
	pools.hearts = Pool.new("hearts", func(): return Ent.Heart.new(), 40)
	pools.powerups = Pool.new("powerups", func(): return Ent.PowerupDrop.new(), 10)
	pools.pBullets = Pool.new("pBullets", func(): return Ent.PBullet.new(), 60)
	pools.eBullets = Pool.new("eBullets", func(): return Ent.EBullet.new(), 120)
	pools.zones = Pool.new("zones", func(): return Ent.Zone.new(), 8)
	pools.bombs = Pool.new("bombs", func(): return Ent.Bomb.new(), 16)
	pools.rings = Pool.new("rings", func(): return Ent.Ring.new(), 24)
	pools.hazards = Pool.new("hazards", func(): return Ent.Hazard.new(), D.HAZARD_CAP)

# ═══════════ BOYUT ═══════════

func resize() -> void:
	var r := get_viewport().get_visible_rect().size
	w = r.x
	h = r.y
	if renderer3d: renderer3d.resize()

func world_def(id: int = 0) -> Dictionary:
	return D.world(id if id else worldId)

func _notification(what: int) -> void:
	if what == NOTIFICATION_APPLICATION_PAUSED or what == NOTIFICATION_APPLICATION_FOCUS_OUT:
		if state == "playing": pause_game()
		save_meta(true)
		Store.flush()
	elif what == NOTIFICATION_APPLICATION_RESUMED or what == NOTIFICATION_APPLICATION_FOCUS_IN:
		last = _now_ms()

# ═══════════ ARENA ═══════════

func bake_arena() -> void:
	var A = arena
	if not A: return
	var t0 := _now_ms()
	arenaLayout = ArenaData.layout(worldId)
	arenaMapId = arenaLayout.get("mapId", "mezarlik")
	if renderer3d: renderer3d.prepare_arena(worldId, arenaLayout)
	props.load(arenaLayout.get("props", []), A)
	decor = arenaLayout.get("decor", [])
	fx = arenaLayout.get("fx", [])
	decorStamp += 1
	arenaBakeMs = _now_ms() - t0

func grant_objective_card() -> void:
	if state != "playing":
		_pendingObjCard = true
		return
	if dailies: dailies.add("objectives", 1)
	pendingWaveBonus = false
	state = "levelup"
	_inWaveBonus = true
	_objCard = true
	trauma = 0
	ui.show_level_up(weapons.roll_choices(3))

# ═══════════ AKIŞ ═══════════

func start_run(wi: int = 0, mi: int = 0, seal = null) -> void:
	if _introBusy: return
	_introBusy = true
	sealRun = seal if (seal is Dictionary and seal.get("rule")) else null
	towerRun = seal if (seal is Dictionary and seal.get("tower")) else null
	nmRun = seal if (seal is Dictionary and seal.get("nm")) else null
	ui.set_nm_run(nmRun != null)
	var wId := wi if wi else worldId
	var mId := mi if mi else missionId
	var wd0: Dictionary = D.WORLDS[wId - 1]
	var md0 := D.missionDef(wId, mId)
	audio.unlock()
	if renderer3d: renderer3d.prepare_world_enemies(wd0.floor)
	var bless = null
	if (meta.get("ftue") or JS.i(progress.get(1, 0)) >= 1) and sealRun == null and towerRun == null:
		bless = Journey.roll_blessings(3)
	ui._ldHold = bless != null
	var stars := -1 if (sealRun or towerRun or nmRun) else Ledger.stars(meta, wId, mId)
	var side := "SONSUZ KULE" if towerRun else ("HAFTALIK MÜHÜR" if sealRun else ("KABUS DÖNGÜSÜ" if nmRun else ""))
	_intro_wi = wi
	_intro_mi = mi
	_intro_bless = bless
	ui.play_battle_intro(
		{"world": wd0.name, "mission": "GÖREV " + str(mId), "worldNo": wId, "wc": wd0.color, "obj": md0.objective, "stars": stars, "side": side},
		_intro_mid, _intro_end)

## Perde kapalıyken kurulum (web: tileGate → begin). Perde tutması duvar
## saatiyle biter (2400 ms) — kare döngüsünden bağımsız.
func _intro_mid() -> void:
	_start_run_now(_intro_wi, _intro_mi)
	freeze = maxf(freeze, 2.3)
	_curtain_at = _now_ms() + 2400.0

func _intro_end() -> void:
	_introBusy = false
	if _intro_bless: ui.show_bless_pick(_intro_bless, _on_bless_picked)

func _on_bless_picked(b) -> void:
	apply_blessing(b)
	ui._ldHold = false

func _on_quality_changed() -> void:
	if renderer3d: renderer3d.resize()

func _start_run_now(wi: int, mi: int) -> void:
	worldId = wi if wi else worldId
	missionId = mi if mi else missionId
	msn = D.missionDef(worldId, missionId)
	Store.set_item("kh_lastWorld", str(worldId))
	time = 0
	kills = 0
	_cbN = 0; _cbT = -9; _cbTier = 0; _cbBest = 0
	_stressT = 0; _achK = 0; _achU = 0
	freeze = 0
	trauma = 0
	_kickT = 9; _punchT = 9; zoomP = 0
	_bossOutro = 0
	_dying = 0
	ui.set_dying(false)
	wave = 1
	pendingWaveBonus = false
	reviveUsed = false
	_hpFloor = 1
	rerolls = 3
	_eliteK = 0; _ftuePow = false; _bless = null; _lookX = 0; _lookY = 0
	_objCard = false
	_lvDelay = 0
	objectives.reset()
	powerups.reset()
	fieldChests.reset()
	_fc0 = fieldChests.opened
	PerfLog.begin()
	Ftue.begin(self)
	Journey.ghost_begin(self)
	_masK = 0
	player.reset()
	enemies.reset()
	enemies.set_world(world_def())
	weapons.reset()
	var cdef := char_def()
	player.charId = meta.selectedChar
	ult.reset(cdef.get("rarity"), meta.selectedChar)
	events.reset()
	mode.begin("survive" if (towerRun or sealRun) else String(msn.get("type", "survive")))
	if D.WEAPONS.has(cdef.startWeapon): weapons.slots[cdef.startWeapon] = 1
	weapons.seed_default()
	var sigW = weapons.W.get(cdef.startWeapon)
	var sigMul := D.signaturePower(cdef.get("rarity"))
	if sigW and sigMul > 1:
		for key in ["dmg", "dps"]:
			var arr = sigW.get(key)
			if arr is Array:
				for i in arr.size(): arr[i] = JS.round_js(arr[i] * sigMul * 100) / 100.0
			elif arr is float or arr is int:
				sigW[key] = JS.round_js(arr * sigMul * 100) / 100.0
	input.reset()
	player.apply_mods(cdef.get("mods", {}))
	apply_meta_to_player()
	var clv := char_level(meta.selectedChar)
	if clv > 1:
		var lm := D.charLevelMods(clv)
		player.maxHp = maxf(10.0, JS.round_js(player.maxHp * lm.hpMul))
		player.hp = player.maxHp
		player.dmgMult += lm.dmgAdd
		player.atkPct += lm.atkAdd
	var alv := account_level()
	if alv > 1:
		var abon := minf(0.5, (alv - 1) * 0.006)
		player.maxHp = maxf(10.0, JS.round_js(player.maxHp * (1 + abon)))
		player.hp = player.maxHp
		player.dmgMult += abon
	cam = Vector2(player.x, player.y)
	var PLAY := 4000.0
	var BORDER := 140.0
	var full := PLAY + BORDER * 2
	arena = {"x0": -full / 2, "y0": -full / 2, "w": full, "h": full,
		"l": -PLAY / 2, "r": PLAY / 2, "t": -PLAY / 2, "b": PLAY / 2, "play": PLAY, "border": BORDER}
	if _arenaWorld != worldId or arenaLayout.is_empty():
		bake_arena()
		_arenaWorld = worldId
	audio.unlock()
	audio.play("gatelock")
	begin_wave(1)
	ui.show_game()
	objectives.begin()

func is_boss_wave(wv: int) -> bool:
	return msn.isBoss and wv == msn.waves

func wave_duration(wv: int) -> float:
	return D.waveTime(wv, msn.waves if msn else 0.0)

func begin_wave(wv: int) -> void:
	wave = wv
	waveTimer = wave_duration(wv)
	_harvested = false
	state = "playing"
	enemies.start_wave(wv)
	mode.on_wave(wv)
	ui.show_game()
	if not _battHint and time > 1200 and Quality.stress > 0.6 and not Settings.data.batt:
		_battHint = true
		ui.toast("CİHAZ ISINIYOR · AYARLAR → PİL MODU")
	var wd := world_def()
	music.set_intensity((wv - 1) / (msn.waves - 1.0) if msn.waves > 1 else 0.5)
	music.set_state("boss" if is_boss_wave(wv) else "battle", is_boss_wave(wv))
	if is_boss_wave(wv): music.accent("boss")
	ui.banner("DALGA " + str(wv) + " / " + JS.s(msn.waves), (wd.boss + " UYANIYOR") if is_boss_wave(wv) else (wd.name if wv == 1 else null))

func end_wave() -> void:
	if wave >= msn.waves:
		if mode and not mode.can_finish():
			waveTimer = 30
			enemies.spawning = true
			return
		mission_complete()
		return
	enemies.clear_all()
	pendingWaveBonus = true
	if player.pendingLevels > 0: enter_level_up()
	else: open_wave_bonus()

func next_wave() -> void:
	begin_wave(wave + 1)

func enter_level_up() -> void:
	state = "levelup"
	trauma = 0
	ui.show_level_up(weapons.roll_choices(3))
	Ftue.on_level_up(self)

func reroll_cards() -> void:
	if state != "levelup" or rerolls <= 0: return
	rerolls -= 1
	audio.play("reroll")
	ui.show_level_up(weapons.roll_choices(3))

func pick_upgrade(choice: Dictionary) -> void:
	weapons.apply_choice(choice)
	if _inWaveBonus:
		_inWaveBonus = false
		ui.hide_level_up()
		if _objCard:
			_objCard = false
			state = "playing"
			_play_evo_cine()
			return
		next_wave()
		_play_evo_cine()
		return
	player.pendingLevels -= 1
	if player.pendingLevels > 0:
		ui.show_level_up(weapons.roll_choices(3))
	elif pendingWaveBonus:
		ui.hide_level_up()
		open_wave_bonus()
	else:
		ui.hide_level_up()
		state = "playing"
		_return_pulse(choice)
		Ftue.on_level_picked(self)
		_play_evo_cine()

func _play_evo_cine() -> void:
	var E = _evoCine
	if E == null: return
	_evoCine = null
	ui._ldHold = true
	ui.evo_cinema(E, _on_evo_done)

func _on_evo_done() -> void:
	ui._ldHold = false
	reset_clock()
	_return_pulse({"evo": true})

func _level_rise() -> void:
	var p := player
	_return_pulse(null)
	pools.rings.take().setup(p.x, p.y, 200, 0.42, "#f0c7a6")
	for i in 12:
		var a := randf() * 6.283
		var r := 10.0 + randf() * 16.0
		pools.particles.take().setup(p.x + cos(a) * r, p.y + sin(a) * r * 0.5, 0,
			-160 - randf() * 140, 0.55 + randf() * 0.25, 2.6 + randf(), "#ffe2c4" if (i & 1) else "#f0c7a6", 0.93, 0, true)
	audio.play("levelrise")

func _harvest_souls() -> void:
	_harvested = true
	var n := 0
	for g in pools.gems.active:
		if not g.pull:
			g.pull = true
			g.pt = 0
		n += 1
	if n < 4: return
	var p := player
	pools.rings.take().setup(p.x, p.y, 150, 0.5, "#ff5a6e")
	spawn_text(p.x, p.y - 80, "HASAT", "#ff8a94", 18, true)
	audio.play("harvest")

# ── v70 D4 · DİZİLİMLER ──
func decks(cid: String = "") -> Dictionary:
	if cid == "": cid = meta.selectedChar
	if not meta.get("decks"): meta["decks"] = {}
	var d = meta.decks.get(cid)
	if not (d is Dictionary) or not (d.get("l") is Array) or d.l.size() != 3:
		var l := []
		for i in 3: l.append({"n": "", "g": char_gear_map(cid).duplicate() if i == 0 else {}})
		d = {"a": 0, "l": l}
		meta.decks[cid] = d
	if not (JS.i(d.a) >= 0 and JS.i(d.a) < 3): d.a = 0
	return d

func deck_gear(i: int, cid: String = "") -> Dictionary:
	var d := decks(cid)
	return char_gear_map(cid) if i == JS.i(d.a) else d.l[i].get("g", {})

func switch_deck(i: int) -> void:
	var cid: String = meta.selectedChar
	var d := decks(cid)
	if not (i >= 0 and i < 3) or i == JS.i(d.a): return
	d.l[JS.i(d.a)].g = char_gear_map(cid).duplicate()
	var src: Dictionary = d.l[i].get("g", {})
	var mp := {}
	for slot in src:
		var id = src[slot]
		var it = gear_by_id(id)
		if it and it.slot == slot and owns_gear(id) and can_wear(id, cid): mp[slot] = id
	meta.charGear[cid] = mp
	d.a = i
	save_meta()
	audio.play("equip")
	ui.show_armory()

func rename_deck(i: int, nm: String) -> void:
	var d := decks()
	if not (i >= 0 and i < 3): return
	var s := nm
	for ch in ["<", ">", "&", "\"", "'"]: s = s.replace(ch, "")
	d.l[i].n = s.strip_edges().substr(0, 14)
	save_meta()

func _return_pulse(choice) -> void:
	var p := player
	var E := enemies
	var col := "#f0c77a" if (choice and choice.get("evo")) else ("#d8a284" if (choice and choice.get("kind") == "special") else "#cfd6e2")
	p.invuln = maxf(p.invuln, 0.6)
	var out := _pulseScratch
	out.clear()
	E.query_circle(p.x, p.y, 190, out)
	for e in out:
		if e.isBoss or e.hp <= 0: continue
		var dx: float = e.x - p.x
		var dy: float = e.y - p.y
		var d := JS.hypot(dx, dy)
		if d == 0: d = 1.0
		var push: float = (190 - d) * 0.55 * e.knockRes
		e.x += dx / d * push
		e.y += dy / d * push
	spawn_burst(p.x, p.y, col, 18, 360, 2.6, 0.45, true)
	fx_impact(p.x, p.y, 0, 2, col)

func open_wave_bonus() -> void:
	pendingWaveBonus = false
	state = "levelup"
	_inWaveBonus = true
	trauma = 0
	player.hp = minf(player.maxHp, player.hp + player.maxHp * 0.12)
	ui.show_level_up(weapons.roll_choices(3))

func apply_wave_mods() -> void:
	Calendar.apply_wave(self)
	SideModes.tower_apply_wave(self)
	SideModes.nm_apply_wave(self)

func start_seal() -> void:
	var S := Calendar.seal(progress, D.WORLDS.size())
	start_run(S.w, S.m, S)

func start_nightmare() -> void:
	var N := SideModes.nm_book(meta)
	start_run(N.w, N.m, {"nm": true})

func start_tower(k: int = 0) -> void:
	var T := SideModes.tower_book(meta)
	var F := SideModes.floor_def(k if k else int(T.cur), D.WORLDS.size(), D.MISSIONS_PER_WORLD)
	start_run(F.w, F.m, {"tower": true, "k": F.k, "boss": F.boss})

func pause_game() -> void:
	if state != "playing": return
	state = "paused"
	ui.show_pause()

func resume_game() -> void:
	if state != "paused": return
	state = "playing"
	ui.hide_pause()
	reset_clock()
	Quality.reset()

func quit_to_menu() -> void:
	Ftue.show("")
	Ftue.step = ""
	ui.set_nm_run(false)
	state = "menu"
	music.set_state("menu")
	ui.show_menu()

func reset_clock() -> void:
	last = _now_ms()

# ═══════════ GÖREV SONU ═══════════

func game_over() -> void:
	if state != "playing": return
	if not _dying:
		_dying = 0.9
		player.invuln = maxf(player.invuln, 5.0)
		add_shake(0.35)
		punch(0.05)
		ui.set_dying(true)
		ui.boss_moment("fall", "DÜŞTÜN")
		return
	if _dying > 0: return
	_dying = 0
	ui.set_dying(false)
	Ftue.show("")
	state = "gameover"
	freeze = 0
	add_shake(D.FX.shakeBoss)
	audio.play("death")
	music.fade_out(0.7)
	if not reviveUsed: dyn_nudge(-D.DYN.onDeath)
	save_record()
	var frac := minf(1.0, (wave - 1 + (1 - waveTimer / wave_duration(wave))) / msn.waves)
	var rubies := maxf(2.0, JS.round_js(D.replayReward(worldId, missionId) * frac * 0.6 * Calendar.gold_mul(self)))
	add_rubies(rubies)
	var seal = Calendar.finish(self, false) if sealRun else null
	var tower = SideModes.tower_finish(self, false) if towerRun else null
	var nm = SideModes.nm_finish(self, false, D.MISSIONS_PER_WORLD, D.WORLDS.size()) if nmRun else null
	_learn_tier()
	_achNew = Ach.on_run(self, false)
	var ledger := Ledger.on_run(self, false)
	_journey = _run_journey(false)
	PerfLog.end(self, "loss")
	ui.show_mission_end(false, {
		"time": time, "kills": kills, "level": player.level,
		"wave": wave, "rubies": rubies, "chest": null, "firstClear": false,
		"canRevive": not reviveUsed, "ledger": ledger, "seal": seal, "tower": tower, "nm": nm,
	})

func revive_with_ad() -> void:
	if reviveUsed or state != "gameover": return
	reviveUsed = true
	audio.play("click")
	ui.show_ad_watch(3, _on_revive)

func _on_revive() -> void:
	player.hp = JS.round_js(player.maxHp * 0.6)
	player.invuln = maxf(player.invuln, 2.5)
	state = "playing"
	_dying = 0
	_return_pulse({"evo": true})
	for i in 26:
		pools.particles.take().setup(player.x + (randf() - 0.5) * 40, player.y, (randf() - 0.5) * 30, -160 - randf() * 220,
			0.9 + randf() * 0.5, 2.4 + randf() * 2, "#f0c7a6" if i % 2 else "#eef4ff", 0.95, 0, true)
	ui.boss_moment("rise", "YENİDEN DOĞDUN")
	PerfLog.begin()
	ui.show_game()
	reset_clock()
	Quality.reset()
	music.set_state("boss" if is_boss_wave(wave) else "battle", true)
	audio.play("revive")

func mission_complete() -> void:
	state = "victory"
	Ftue.finish(self)
	enemies.clear_all()
	music.duck(0.35, 2.2)
	music.set_state("victory", true)
	audio.play("victory")
	dyn_nudge(D.DYN.winFlawless if _hpFloor > 0.55 else D.DYN.onWin)
	save_record(true)
	var wi := worldId
	var mi := missionId
	var firstClear: bool = towerRun == null and JS.i(progress.get(wi, 0)) < mi
	var rubies := 0.0
	var chest = null
	var chestFull := false
	var bossDrop := false
	if firstClear:
		progress[wi] = mi
		D.saveProgress(progress)
		if mi < D.MISSIONS_PER_WORLD: ui.set_pick(wi, mi + 1)
		elif wi < D.WORLDS.size(): ui.set_pick(wi + 1, 1)
		rubies = D.missionReward(wi, mi)
		chests.add_victory()
	else:
		rubies = 0.0 if towerRun else D.replayReward(wi, mi)
	bossDrop = msn.isBoss
	chest = null if (towerRun and not bossDrop) else ChestSystem.roll_mission_chest(player.luck, bossDrop)
	if chest and not chests.grant(chest):
		chest = null
		chestFull = true
	rubies = JS.round_js(rubies * Calendar.gold_mul(self) * (SideModes.NM.gold if nmRun else 1.0))
	add_rubies(rubies)
	var seal = Calendar.finish(self, true) if sealRun else null
	var tower = SideModes.tower_finish(self, true) if towerRun else null
	var nm = SideModes.nm_finish(self, true, D.MISSIONS_PER_WORLD, D.WORLDS.size()) if nmRun else null
	if tower: rubies += tower.gold
	add_battle_pass_xp(60 if bossDrop else 25)
	add_account_xp(45 if bossDrop else 20)
	_learn_tier()
	_achNew = Ach.on_run(self, true)
	var ledger := Ledger.on_run(self, true)
	_journey = _run_journey(true)
	PerfLog.end(self, "win")
	ui.show_mission_end(true, {
		"time": time, "kills": kills, "level": player.level,
		"wave": wave, "rubies": rubies, "chest": chest, "chestFull": chestFull, "firstClear": firstClear,
		"bossDrop": bossDrop, "ledger": ledger, "seal": seal, "tower": tower, "nm": nm,
	})

func dyn_mul() -> float:
	var d = meta.get("dyn")
	var v: float = d.mul if (d is Dictionary and (d.get("mul") is float or d.get("mul") is int)) else 1.0
	return maxf(D.DYN.min, minf(D.DYN.max, v))

func dyn_nudge(delta: float) -> void:
	if not meta.get("dyn"): meta["dyn"] = {"mul": 1.0}
	var d: Dictionary = meta.dyn
	var cur: float = d.mul if (d.get("mul") is float or d.get("mul") is int) else 1.0
	d.mul = maxf(D.DYN.min, minf(D.DYN.max, cur + delta))
	save_meta()

func on_boss_down() -> void:
	if state != "playing": return
	if not _bossOutro:
		_bossOutro = 1.1
		player.invuln = maxf(player.invuln, 3.0)
		ui.boss_moment("down", enemies.worldBoss)
		music.duck(700)
		_boss_death_fx()
		return
	if _bossOutro > 0: return
	_bossOutro = 0
	hit_stop(D.FX.bossHitStopMs * 2)
	add_shake(0.45)
	punch(0.06)
	mission_complete()

func _boss_death_fx() -> void:
	var E := enemies
	var x: float = E.bossDeathX if E.bossDeathX else player.x
	var y: float = E.bossDeathY if E.bossDeathY else player.y
	var R: float = E.bossDeathR if E.bossDeathR else 60.0
	var K: Dictionary = BOSS_DEATH[(maxi(1, worldId) - 1) % BOSS_DEATH.size()]
	var P: Pool = pools.particles
	for i in K.n:
		var a := randf() * PI * 2
		var r := randf() * R
		var px := x + cos(a) * r
		var py := y + sin(a) * r * 0.6
		var sp: float = K.sp * (0.4 + randf() * 0.6)
		var dir: float
		if K.dir == "up": dir = -PI / 2 + (randf() - 0.5) * 0.7
		elif K.dir == "in": dir = a + PI
		else: dir = a
		var sx := x + cos(a) * R * 2.2 if K.dir == "in" else px
		var sy := y + sin(a) * R * 1.4 if K.dir == "in" else py
		P.take().setup(sx, sy, cos(dir) * sp, sin(dir) * sp, K.life * (0.7 + randf() * 0.6), K.size * (0.6 + randf() * 0.8), K.cols[i % K.cols.size()], 0.93, 0, true)
	pools.rings.take().setup(x, y, R * (0.6 if K.dir == "in" else 3.4), 0.9, K.cols[0])
	pools.rings.take().setup(x, y, R * 2, 0.6, K.cols[1] if K.cols.size() > 1 else K.cols[0])
	spawn_text(x, y - R - 30, K.word, K.cols[0], 26, true)
	add_shake(0.3)

# ═══════════ ALTIN / GEM CÜZDANI (kalıcı, her zaman toplamalı) ═══════════

func read_rubies() -> float:
	var v = Store.get_item(RUBY_KEY)
	if v != null:
		var f := str(v).to_float()
		if str(v).is_valid_float() and f >= 0: return floor(f)
	return float(JS.i(meta.get("rubies"))) if meta else 0.0

func add_rubies(n: float) -> void:
	if not (n > 0): return
	var total := read_rubies() + JS.round_js(n)
	meta.rubies = total
	Store.set_item(RUBY_KEY, JS.s(total))
	save_meta()

func spend_rubies(n: float) -> bool:
	var cur := read_rubies()
	if cur < n: return false
	var total := cur - JS.round_js(n)
	meta.rubies = total
	Store.set_item(RUBY_KEY, JS.s(total))
	save_meta()
	return true

func read_stones() -> float:
	var v = Store.get_item(STONE_KEY)
	if v != null:
		var f := str(v).to_float()
		if str(v).is_valid_float() and f >= 0: return floor(f)
	return float(JS.i(meta.get("stones"))) if meta else 0.0

func add_stones(n: float) -> void:
	if not (n > 0): return
	var total := read_stones() + JS.round_js(n)
	meta.stones = total
	Store.set_item(STONE_KEY, JS.s(total))
	save_meta()

func spend_stones(n: float) -> bool:
	var cur := read_stones()
	if cur < n: return false
	var total := cur - JS.round_js(n)
	meta.stones = total
	Store.set_item(STONE_KEY, JS.s(total))
	save_meta()
	return true

func buy_stone_pack(id: String) -> bool:
	var pack = null
	for p in D.STONE_PACKS:
		if p.id == id: pack = p
	if pack == null: return false
	if Backend.billing():
		Backend.buy(id)
		return false
	add_stones(pack.amount + pack.bonus)
	audio.play("stonebuy")
	ui.refresh_wallet()
	return true

func exchange_stones(id: String) -> bool:
	var ex = null
	for e in D.RUBY_EXCHANGE:
		if e.id == id: ex = e
	if ex == null: return false
	if not spend_stones(ex.stone):
		audio.play("error")
		return false
	add_rubies(ex.rubies)
	audio.play("buy")
	ui.refresh_wallet()
	return true

# ═══════════ META ═══════════

func load_meta() -> Dictionary:
	var m = JSON.parse_string(Store.get_item("kh_meta", "{}"))
	if not (m is Dictionary): m = {}
	var owned := []
	if m.get("owned") is Array:
		for id in m.owned:
			if D.equipment_by_id(id) != null: owned.append(id)
	var charGear := {}
	if m.get("charGear") is Dictionary:
		for cid in m.charGear:
			if not D.CHARACTERS.has(cid): continue
			var src: Dictionary = m.charGear[cid] if m.charGear[cid] is Dictionary else {}
			var dst := {}
			for s in D.EQUIP_SLOTS:
				var id = src.get(s.id)
				var it = D.equipment_by_id(id) if id else null
				if it and it.slot == s.id and owned.has(id) and (not it.get("only") or it.only.has(cid)): dst[s.id] = id
			charGear[cid] = dst
	var wOwned: Array = m.weaponsOwned.duplicate() if (m.get("weaponsOwned") is Array and m.weaponsOwned.size()) else ["kilic"]
	if not wOwned.has("kilic"): wOwned.push_front("kilic")
	var wSlots: int = JS.i(m.get("weaponSlots")) if JS.i(m.get("weaponSlots")) else int(D.WEAPON_SLOTS.start)
	var wEq: Array = m.weaponsEquipped if (m.get("weaponsEquipped") is Array and m.weaponsEquipped.size()) else ["kilic"]
	var wEquipped := []
	for id in wEq:
		if wOwned.has(id) and D.WEAPONS.has(id): wEquipped.append(id)
	wEquipped = wEquipped.slice(0, wSlots)
	if wEquipped.is_empty(): wEquipped = ["kilic"]
	var charsOwned := []
	var co: Array = m.charsOwned if (m.get("charsOwned") is Array and m.charsOwned.size()) else [D.DEFAULT_CHAR]
	for id in co:
		if D.CHARACTERS.has(id): charsOwned.append(id)
	if not charsOwned.has(D.DEFAULT_CHAR): charsOwned.push_front(D.DEFAULT_CHAR)
	if D.UNLOCK_ALL_CHARS:
		for id in D.CHARACTERS:
			if not charsOwned.has(id): charsOwned.append(id)
	var selectedChar: String = m.selectedChar if (m.get("selectedChar") and charsOwned.has(m.selectedChar) and D.CHARACTERS.has(m.selectedChar)) else D.DEFAULT_CHAR
	var charLevels: Dictionary = (m.charLevels as Dictionary).duplicate() if m.get("charLevels") is Dictionary else {}
	var charCards: Dictionary = (m.charCards as Dictionary).duplicate() if m.get("charCards") is Dictionary else {}
	for id in charLevels.keys():
		if not D.CHARACTERS.has(id): charLevels.erase(id)
	for id in charCards.keys():
		if not D.CHARACTERS.has(id): charCards.erase(id)
	for id in charsOwned:
		if not (JS.num(charLevels, id) >= 1): charLevels[id] = 1
	var gearLevels: Dictionary = (m.gearLevels as Dictionary).duplicate() if m.get("gearLevels") is Dictionary else {}
	var gearCards: Dictionary = (m.gearCards as Dictionary).duplicate() if m.get("gearCards") is Dictionary else {}
	for id in owned:
		if not (JS.num(gearLevels, id) >= 1): gearLevels[id] = 1
	var ev: Dictionary = m.events if m.get("events") is Dictionary else {}
	var events_ := {"survTotal": maxi(0, JS.i(ev.get("survTotal"))), "claimed": (ev.claimed as Array).duplicate() if ev.get("claimed") is Array else []}
	var bp: Dictionary = m.battlePass if m.get("battlePass") is Dictionary else {}
	var battlePass := {"xp": maxi(0, JS.i(bp.get("xp"))), "premium": JS.truthy(bp.get("premium")),
		"claimedFree": (bp.claimedFree as Array).duplicate() if bp.get("claimedFree") is Array else [],
		"claimedPremium": (bp.claimedPremium as Array).duplicate() if bp.get("claimedPremium") is Array else []}
	var acc_: Dictionary = m.account if m.get("account") is Dictionary else {}
	var lv := maxi(1, JS.i(acc_.get("level")) if JS.i(acc_.get("level")) else 1)
	var account := {"level": lv, "xp": maxi(0, JS.i(acc_.get("xp"))), "xpNext": D.accountXpToNext(lv)}
	var quests := Dailies.normalize_quests(m.get("quests"))
	var dv: float = float(m.dyn.mul) if (m.get("dyn") is Dictionary and (m.dyn.get("mul") is float or m.dyn.get("mul") is int)) else 1.0
	var dyn := {"mul": maxf(D.DYN.min, minf(D.DYN.max, dv))}
	var rubies := _wallet(RUBY_KEY, m.get("rubies"))
	var stones := _wallet(STONE_KEY, m.get("stones"))
	var pity := maxi(0, JS.i(m.get("pity")))
	var base := {"rubies": rubies, "stones": stones, "owned": owned, "charGear": charGear,
		"weaponsOwned": wOwned, "weaponsEquipped": wEquipped, "weaponSlots": wSlots,
		"charsOwned": charsOwned, "selectedChar": selectedChar, "charLevels": charLevels, "charCards": charCards,
		"gearLevels": gearLevels, "gearCards": gearCards, "events": events_, "battlePass": battlePass,
		"account": account, "dyn": dyn, "quests": quests, "pity": pity}
	for k in m:
		if not base.has(k) and m[k] != null: base[k] = m[k]
	return base

func _wallet(key: String, legacy) -> float:
	var raw = Store.get_item(key)
	if raw != null:
		var v := str(raw).to_float()
		if str(raw).is_valid_float() and v >= 0: return floor(v)
	var lv := float(maxi(0, JS.i(legacy)))
	Store.set_item(key, JS.s(lv))
	return lv

func _run_journey(won: bool) -> Dictionary:
	var r := {"won": won, "kills": kills, "lvl": player.level, "hpFloor": _hpFloor,
		"fc": maxi(0, fieldChests.opened - _fc0), "elites": _eliteK,
		"evo": weapons.evolved, "boss": won and msn.isBoss}
	var d := Journey.daily_on_run(self, r)
	var ghostRec := Journey.ghost_end(self)
	save_meta()
	return {"daily": d, "ghostRec": ghostRec}

func apply_blessing(b) -> void:
	if b == null or _bless != null: return
	_bless = b
	player.apply_mods(b.mods)

func save_meta(force: bool = false) -> void:
	meta.awayT = Clock.now()
	if not force and state == "playing":
		_metaDirty = true
		return
	_metaDirty = false
	Store.set_item("kh_meta", JSON.stringify(meta))

# ── eşya / kahraman ──
func gear_by_id(id): return D.equipment_by_id(id)
func owns_gear(id) -> bool: return meta.owned.has(id)
func is_equipped(id) -> bool:
	var it = gear_by_id(id)
	return it != null and char_gear_map().get(it.slot) == id
func char_def(id: String = "") -> Dictionary:
	var k := id if id else String(meta.selectedChar)
	return D.CHARACTERS.get(k, D.CHARACTERS[D.DEFAULT_CHAR])
func owns_char(id) -> bool: return meta.charsOwned.has(id)
func char_level(id: String = "") -> int:
	var k := id if id else String(meta.selectedChar)
	var v := maxi(1, JS.i(meta.charLevels.get(k)))
	return v if v else 1
func char_card_count(id) -> int: return JS.i(meta.charCards.get(id))
func cards_for_next(id):
	var lvl := char_level(id)
	return null if lvl >= D.CHAR_MAX_LEVEL else D.CHAR_CARD_REQ[lvl + 1]
func gold_for_next(id):
	var lvl := char_level(id)
	return null if lvl >= D.CHAR_MAX_LEVEL else D.CHAR_GOLD_COST[lvl + 1]
func can_upgrade_char(id) -> bool:
	if not owns_char(id): return false
	var need = cards_for_next(id)
	if need == null: return false
	return char_card_count(id) >= need and read_rubies() >= gold_for_next(id)
func upgrade_char(id) -> bool:
	if not can_upgrade_char(id):
		audio.play("error")
		return false
	var need = cards_for_next(id)
	var gold = gold_for_next(id)
	if not spend_rubies(gold):
		audio.play("error")
		return false
	meta.charCards[id] = char_card_count(id) - need
	meta.charLevels[id] = char_level(id) + 1
	save_meta()
	audio.play("heroup")
	ui.show_armory()
	return true
func add_char_cards(id, n) -> bool:
	if not D.CHARACTERS.has(id) or not (n > 0): return false
	var first := not owns_char(id)
	meta.charCards[id] = JS.i(meta.charCards.get(id)) + n
	if first:
		meta.charsOwned.append(id)
		meta.charLevels[id] = 1
	save_meta()
	return first
func buy_char(id, cur: String) -> bool:
	var c = D.CHARACTERS.get(id)
	if c == null or owns_char(id): return false
	var useStone := cur == "stone"
	var cost := JS.num(c, "stonePrice") if useStone else JS.num(c, "price")
	if cost <= 0:
		audio.play("error")
		return false
	var ok := spend_stones(cost) if useStone else spend_rubies(cost)
	if not ok:
		audio.play("error")
		return false
	grant_char(id, true)
	audio.play("buy")
	ui.show_armory()
	return true
func grant_char(id, select: bool) -> bool:
	if not D.CHARACTERS.has(id) or owns_char(id): return false
	meta.charsOwned.append(id)
	if not (JS.num(meta.charLevels, id) >= 1): meta.charLevels[id] = 1
	if select: meta.selectedChar = id
	save_meta()
	return true
func select_char(id) -> void:
	if not owns_char(id) or not D.CHARACTERS.has(id): return
	meta.selectedChar = id
	save_meta()
	audio.play("select")
	if renderer3d: renderer3d.preload_character(id)
	ui.show_armory()
func gear_level(id) -> int:
	var v := maxi(1, JS.i(meta.gearLevels.get(id)))
	return v if v else 1
func gear_card_count(id) -> int: return JS.i(meta.gearCards.get(id))
func cards_for_next_gear(id):
	var lvl := gear_level(id)
	return null if lvl >= D.GEAR_MAX_LEVEL else D.GEAR_CARD_REQ[lvl + 1]
func gold_for_next_gear(id):
	var lvl := gear_level(id)
	return null if lvl >= D.GEAR_MAX_LEVEL else D.GEAR_GOLD_COST[lvl + 1]
func can_upgrade_gear(id) -> bool:
	if not owns_gear(id): return false
	var need = cards_for_next_gear(id)
	if need == null: return false
	return gear_card_count(id) >= need and read_rubies() >= gold_for_next_gear(id)
func upgrade_gear(id) -> bool:
	if not can_upgrade_gear(id):
		audio.play("error")
		return false
	var need = cards_for_next_gear(id)
	var gold = gold_for_next_gear(id)
	if not spend_rubies(gold):
		audio.play("error")
		return false
	meta.gearCards[id] = gear_card_count(id) - need
	meta.gearLevels[id] = gear_level(id) + 1
	save_meta()
	audio.play("levelup")
	return true
func add_gear_cards(id, n) -> bool:
	if gear_by_id(id) == null or not (n > 0): return false
	var first := not owns_gear(id)
	if first:
		meta.owned.append(id)
		meta.gearLevels[id] = 1
		n -= 1
		var gi = gear_by_id(id)
		if can_wear(id) and not char_gear_map().get(gi.slot): equip_gear(id, true)
	if n > 0: meta.gearCards[id] = gear_card_count(id) + n
	save_meta()
	return first
func char_gear_map(charId: String = "") -> Dictionary:
	var cid := charId if charId else String(meta.selectedChar)
	if not meta.charGear.get(cid): meta.charGear[cid] = {}
	return meta.charGear[cid]
func can_wear(id, charId: String = "") -> bool:
	var it = gear_by_id(id)
	if it == null: return false
	var cid := charId if charId else String(meta.selectedChar)
	return not it.get("only") or it.only.has(cid)
func equip_gear(id, silent: bool = false) -> void:
	var it = gear_by_id(id)
	if it == null or not owns_gear(id) or not can_wear(id):
		audio.play("error")
		return
	char_gear_map()[it.slot] = id
	save_meta()
	if not silent:
		audio.play("equip")
		ui.show_armory()
func unequip_slot(slot) -> void:
	var mp := char_gear_map()
	if not mp.get(slot): return
	mp.erase(slot)
	save_meta()
	audio.play("click")
	ui.show_armory()
func toggle_equip(id) -> void:
	var it = gear_by_id(id)
	if it == null or not owns_gear(id): return
	if char_gear_map().get(it.slot) == id: unequip_slot(it.slot)
	else: equip_gear(id)
func apply_meta_to_player() -> void:
	var mp := char_gear_map()
	var worn := []
	for slot in mp:
		var id = mp[slot]
		var it = gear_by_id(id)
		if it and it.slot == slot and owns_gear(id) and can_wear(id):
			var mul := D.gearLevelMods(gear_level(id))
			var scaled := {}
			for k in it.mods: scaled[k] = it.mods[k] * mul
			player.apply_mods(scaled)
			worn.append(it)
	SideModes.apply_sets(player, worn)
func owns_weapon(id) -> bool: return meta.weaponsOwned.has(id)
func is_weapon_equipped(id) -> bool: return meta.weaponsEquipped.has(id)
func buy_weapon(id) -> void:
	if not D.WEAPON_META.has(id) or owns_weapon(id): return
	if not spend_rubies(D.WEAPON_META[id].unlock):
		audio.play("error")
		return
	meta.weaponsOwned.append(id)
	if meta.weaponsEquipped.size() < meta.weaponSlots: meta.weaponsEquipped.append(id)
	save_meta()
	audio.play("buy")
	ui.show_armory()
func toggle_weapon(id) -> void:
	if not owns_weapon(id): return
	var eq: Array = meta.weaponsEquipped
	var i := eq.find(id)
	if i >= 0:
		if eq.size() <= 1:
			audio.play("error")
			return
		eq.remove_at(i)
		audio.play("click")
	else:
		if eq.size() >= meta.weaponSlots:
			audio.play("error")
			return
		eq.append(id)
		audio.play("equip")
	save_meta()
	ui.show_armory()
func weapon_slot_unlock_price():
	var idx: int = int(meta.weaponSlots) - int(D.WEAPON_SLOTS.start)
	if meta.weaponSlots >= D.WEAPON_SLOTS.max: return null
	var arr: Array = D.WEAPON_SLOTS.unlockPrice
	return arr[idx] if idx >= 0 and idx < arr.size() else null
func unlock_weapon_slot() -> void:
	var price = weapon_slot_unlock_price()
	if price == null or not spend_rubies(price):
		audio.play("error")
		return
	meta.weaponSlots += 1
	save_meta()
	audio.play("buy")
	ui.show_armory()

func save_record(won: bool = false) -> void:
	var bestT := str(Store.get_item("kh_best_time", "0")).to_float()
	if time > bestT: Store.set_item("kh_best_time", str(int(floor(time))))
	var bestK := str(Store.get_item("kh_best_kills", "0")).to_float()
	if kills > bestK: Store.set_item("kh_best_kills", str(kills))
	if won: Store.set_item("kh_boss_down", "1")
	if not meta.get("events"): meta["events"] = {"survTotal": 0, "claimed": []}
	meta.events.survTotal += int(floor(time))
	if dailies:
		dailies.add("kills", kills)
		dailies.add("waves", msn.waves if won else maxf(0.0, wave - 1))
		if won:
			dailies.add("missions", 1)
			if msn.isBoss: dailies.add("boss", 1)
	save_meta()

func grant_quest_reward(r):
	if r == null: return null
	if r.kind == "rubies":
		add_rubies(r.amount)
		return "+" + JS.s(r.amount) + " ALTIN"
	if r.kind == "stone":
		add_stones(r.amount)
		return "+" + JS.s(r.amount) + " GEM"
	if r.kind == "chest":
		var C = ChestSystem.chests().get(r.chest)
		if chests.grant(r.chest): return (C.name if C else "SANDIK") + " KAZANILDI"
		var gold := 120.0 + (JS.i(C.tier) if C else 0) * 60
		add_rubies(gold)
		return "YUVA DOLU — +" + JS.s(gold) + " ALTIN"
	return null

func survival_minutes() -> int: return int(floor(JS.i(meta.get("events", {}).get("survTotal")) / 60.0))
func milestone_claimed(id) -> bool: return meta.get("events", {}).get("claimed", []).has(id)
func can_claim_milestone(ms) -> bool: return survival_minutes() >= ms.need and not milestone_claimed(ms.id)
func claim_milestone(id) -> bool:
	var ms = null
	for m in D.SURVIVAL_MILESTONES:
		if m.id == id: ms = m
	if ms == null or not can_claim_milestone(ms):
		audio.play("error")
		return false
	var r: Dictionary = ms.reward
	var toast := ""
	if r.kind == "rubies":
		add_rubies(r.amount)
		toast = "+" + JS.s(r.amount) + " ALTIN"
	elif r.kind == "cards":
		add_char_cards(r.char, r.amount)
		var nm: String = D.CHARACTERS[r.char].name if D.CHARACTERS.has(r.char) else "KAHRAMAN"
		toast = "+" + JS.s(r.amount) + " " + nm + " KARTI"
	elif r.kind == "chest":
		if chests.grant(r.chest):
			var C = ChestSystem.chests().get(r.chest)
			toast = (C.name if C else "SANDIK") + " KAZANILDI"
		else:
			add_rubies(200)
			toast = "YUVA DOLU — +200 YAKUT"
	meta.events.claimed.append(id)
	save_meta()
	audio.play("claim")
	ui.toast(toast)
	ui.render_events()
	ui.refresh_wallet()
	return true

# ── SAVAŞ GEÇİŞİ ──
func bp_tier() -> int: return mini(int(D.BATTLE_PASS.maxTier), int(floor(meta.battlePass.xp / D.BATTLE_PASS.xpPerTier)))
func bp_progress() -> Dictionary:
	var t := bp_tier()
	if t >= D.BATTLE_PASS.maxTier: return {"cur": D.BATTLE_PASS.xpPerTier, "need": D.BATTLE_PASS.xpPerTier}
	return {"cur": meta.battlePass.xp - t * D.BATTLE_PASS.xpPerTier, "need": D.BATTLE_PASS.xpPerTier}
func add_battle_pass_xp(n: float) -> void:
	if not (n > 0): return
	var cap: float = D.BATTLE_PASS.maxTier * D.BATTLE_PASS.xpPerTier
	meta.battlePass.xp = minf(cap, meta.battlePass.xp + JS.round_js(n))
	save_meta()
func bp_has_premium() -> bool: return JS.truthy(meta.battlePass.premium)
func account_level() -> int: return int(meta.account.level)
func account_progress() -> Dictionary: return {"cur": meta.account.xp, "need": meta.account.xpNext}
func add_account_xp(n: float) -> void:
	if not (n >= 0): return
	var a: Dictionary = meta.account
	var fromLevel: int = a.level
	a.xp += JS.round_js(n)
	var rewards := []
	while a.xp >= a.xpNext:
		a.xp -= a.xpNext
		a.level += 1
		a.xpNext = D.accountXpToNext(a.level)
		var ch = D.accountLevelChest(a.level)
		if ch:
			if not chests.grant(ch): add_rubies(150)
			rewards.append({"level": a.level, "chest": ch})
	save_meta()
	if a.level > fromLevel:
		if _pendingLevelUp == null: _pendingLevelUp = {"fromLevel": fromLevel, "toLevel": a.level, "rewards": []}
		_pendingLevelUp.toLevel = a.level
		_pendingLevelUp.rewards.append_array(rewards)
func bp_buy_premium() -> bool:
	if bp_has_premium(): return false
	if not spend_stones(D.BATTLE_PASS.premiumPrice):
		audio.play("error")
		return false
	meta.battlePass.premium = true
	save_meta()
	audio.play("buy")
	return true
func bp_claimed(tier: int, track: String) -> bool:
	return meta.battlePass["claimedPremium" if track == "premium" else "claimedFree"].has(tier)
func bp_can_claim(tier: int, track: String) -> bool:
	if tier > bp_tier(): return false
	if bp_claimed(tier, track): return false
	if track == "premium" and not bp_has_premium(): return false
	return true
func bp_pick_hidden_char(rarity):
	var pool := []
	for c in D.CHARACTERS.values():
		if JS.num(c, "rarity", 1.0) == float(rarity) and not owns_char(c.id): pool.append(c)
	if pool.size(): return pool[int(randf() * pool.size())].id
	var anyPool := []
	for c in D.CHARACTERS.values():
		if not owns_char(c.id): anyPool.append(c)
	return anyPool[int(randf() * anyPool.size())].id if anyPool.size() else null
func bp_claim(tier: int, track: String):
	if not bp_can_claim(tier, track):
		audio.play("error")
		return null
	var def: Dictionary = D.BATTLE_PASS_TIERS[tier - 1]
	var r: Dictionary = def[track]
	var toast := ""
	match r.kind:
		"rubies":
			add_rubies(r.amount)
			toast = "+" + JS.s(r.amount) + " ALTIN"
		"stone":
			add_stones(r.amount)
			toast = "+" + JS.s(r.amount) + " GEM"
		"chest":
			if chests.grant(r.chest):
				var C = ChestSystem.chests().get(r.chest)
				toast = (C.name if C else "SANDIK") + " KAZANILDI"
			else:
				add_rubies(200)
				toast = "YUVA DOLU — +200 YAKUT"
		"gear":
			var pool := []
			for it in D.EQUIPMENT:
				if not meta.owned.has(it.id) and it.rarity <= JS.num(r, "rarityMax", 4.0): pool.append(it)
			if pool.size():
				var it = pool[int(randf() * pool.size())]
				meta.owned.append(it.id)
				toast = it.name + " KAZANILDI"
			else:
				add_rubies(80)
				toast = "+80 ALTIN"
		"char":
			var id = bp_pick_hidden_char(r.rarity)
			if id:
				grant_char(id, false)
				toast = D.CHARACTERS[id].name + " AÇILDI"
			else:
				add_rubies(150)
				toast = "+150 ALTIN"
	meta.battlePass["claimedPremium" if track == "premium" else "claimedFree"].append(tier)
	save_meta()
	audio.play("claim")
	return toast

# ═══════════ GAME FEEL ═══════════

func hit_stop(_ms: float) -> void:
	pass   # web: bilinçli NO-OP (2026-08-10) — imza korunur

func add_shake(amount: float) -> void:
	trauma = minf(1.0, trauma + amount * motionK)

func add_kick(angle: float, px: float) -> void:
	if _kickT < 0.09: return
	px *= motionK
	var f := exp(-9 * _kickT) * cos(17 * _kickT) if _kickT < 0.6 else 0.0
	var ax := _kax * f + cos(angle) * px
	var ay := _kay * f + sin(angle) * px
	var m := JS.hypot(ax, ay)
	if m > 6:
		ax *= 6 / m
		ay *= 6 / m
	_kax = ax; _kay = ay; _kickT = 0

func punch(amount: float) -> void:
	amount *= motionK
	_punchA = minf(0.09, maxf(zoomP, amount))
	_punchT = 0

func spawn_text(x: float, y: float, s: String, color, size: float, crit: bool = false, ang = null):
	if I18n.lang != "tr" and RegEx.create_from_string("[A-ZÇĞİÖŞÜ]{2}").search(s): s = I18n.t(s)
	if _bigTxt: size *= 1.22
	return pools.texts.take().setup(x, y, s, color, size, crit, ang, D.FX.floatTextLife)

func spawn_burst(x: float, y: float, color, count: float, speed: float, size: float, life: float, add: bool = false) -> void:
	var P: Pool = pools.particles
	var c := int(count)
	if isMobile:
		c = int(ceil(c * 0.6))
		if P.count > 460: return
		if P.count > 300: c = int(ceil(c * 0.5))
	else:
		if P.count > 1200: return
		if P.count > 780: c = int(ceil(c * 0.45))
	if c <= 0: return
	var col := JS.col(color)
	for i in c:
		var a := randf() * PI * 2
		var v := speed * (0.35 + randf() * 0.65)
		P.take().setup(x, y, cos(a) * v, sin(a) * v, life * (0.6 + randf() * 0.4), size * (0.6 + randf() * 0.8), col, 0.9, 0, add)

func spawn_spray(x: float, y: float, dir_angle: float, color, count: float, speed: float) -> void:
	var P: Pool = pools.particles
	var c := int(count)
	if isMobile and P.count > 400: c = int(ceil(c * 0.5))
	var col := JS.col(color)
	for i in c:
		var a := dir_angle + (randf() - 0.5) * 1.1
		var v := speed * (0.4 + randf() * 0.6)
		P.take().setup(x, y, cos(a) * v, sin(a) * v, 0.32 + randf() * 0.25, 1.5 + randf() * 2.5, col, 0.88, 260, false)

func fx_impact(x: float, y: float, angle: float, kind: int, color = null) -> void:
	if not in_view(x, y, 80): return
	var P: Pool = pools.particles
	var cap := Quality.budget("particles")
	if P.count > cap * 0.86: return
	var t := time
	var ring := kind >= 1 and (t - _fxRingT) > 0.055
	if ring:
		_fxRingT = t
		if kind == 1: pools.rings.take().setup(x, y, 40, 0.22, "#ffe9a8")
		elif kind == 2: pools.rings.take().setup(x, y, 34, 0.20, color if color else "#ffd8b0")
		else: pools.rings.take().setup(x, y, 96, 0.34, "#fff0c8")
	if kind == 1:
		for i in 4:
			var a := angle + i * 1.5708 + 0.4
			P.take().setup(x, y + 2, cos(a) * 330, sin(a) * 330 - 30, 0.13, 2.6, "#fff6d8", 0.8, 30, true)
	elif kind == 2:
		for i in 5:
			var a := -1.5708 + (randf() - 0.5) * 1.5
			P.take().setup(x, y, cos(a) * 90, sin(a) * 150, 0.34 + randf() * 0.2, 2.2, "#ffd08a" if i % 2 else (color if color else "#fff2c8"), 0.9, -70, true)
	elif kind == 3:
		for i in 10:
			var a := randf() * 6.283
			P.take().setup(x, y, cos(a) * 300, sin(a) * 300 - 40, 0.3, 3.4, "#fff2c8" if i % 3 else "#ffb24d", 0.92, 20, true)
		add_shake(0.14)
		punch(0.022)

func fx_muzzle(x: float, y: float, angle: float, color = null) -> void:
	if not in_view(x, y, 60): return
	var P: Pool = pools.particles
	if P.count > Quality.budget("particles") * 0.9: return
	for i in 2:
		var a := angle + (randf() - 0.5) * 0.4
		P.take().setup(x + cos(angle) * 16, y + sin(angle) * 16 - 2, cos(a) * 210, sin(a) * 210, 0.09, 2.8 - i,
			"#fff4dc" if i else (color if color else "#ffd08a"), 0.8, 0, true)

func spawn_gem(x: float, y: float, value: float) -> void:
	var g: Pool = pools.gems
	if g.count > 380:
		var xm: float = JS.num(msn, "xpMul", 1.0)
		var gm: float = JS.num(msn, "gemMul", 1.0)
		player.collect_gem(value * gm, value * xm)
		return
	g.take().setup(x, y, value)

func spawn_heart(x: float, y: float, amount: float) -> void:
	var hp: Pool = pools.hearts
	if hp.count > 24: return
	hp.take().setup(x, y, amount)

func roll_heart_drop(e) -> void:
	var p := player
	if p.hp >= p.maxHp: return
	var lack := 1 - p.hp / p.maxHp
	var chance: float = 1.0 if e.isBoss else (0.10 if e.elite else 0.018) + lack * lack * 0.09
	if randf() >= chance: return
	var amount := maxf(8.0, JS.round_js(p.maxHp * (0.3 if e.isBoss else 0.12)))
	spawn_heart(e.x, e.y, amount)

func explode(x: float, y: float, dmg: float, radius: float, big: bool) -> void:
	var p := player
	var rr := radius * (1 + p.explodeRPct)
	var d := JS.round_js(dmg * (1 + p.explodeDmgPct))
	var out := enemies.query_circle(x, y, rr + 30, _exScratch)
	for e in out:
		var dx: float = e.x - x
		var dy: float = e.y - y
		var reach: float = rr + e.radius
		if dx * dx + dy * dy > reach * reach: continue
		Combat.apply_hit(self, e, d, atan2(dy, dx), 300, 0, false)
	if props: props.damage_area(x, y, rr, d * 0.55)
	spawn_burst(x, y, "#fff2c8", 26 if big else 16, 380 if big else 300, 3.5, 0.5, true)
	spawn_burst(x, y, D.COLORS.ember, 22 if big else 14, 300 if big else 230, 4.5, 0.55, true)
	spawn_burst(x, y, "#ff8a3c", 16 if big else 10, 220 if big else 170, 4, 0.5, true)
	spawn_burst(x, y, "#7d0e1c", 12 if big else 7, 150, 3, 0.55, false)
	pools.rings.take().setup(x, y, rr * 1.15, 0.5 if big else 0.36, "#ffd08a")
	if renderer3d: renderer3d.spawn_hit(x, y, 0, 2, 1, 0.82, 0.52)
	add_shake(0.16 if big else 0.0)
	if big: hit_stop(70)
	audio.play("boom")

func in_view(x: float, y: float, m: float = CULL_MARGIN) -> bool:
	return x > viewL - m and x < viewR + m and y > viewT - m and y < viewB + m

# ═══════════ ANA DÖNGÜ ═══════════

func _process(_delta: float) -> void:
	var clk := _now_ms()
	var rdtMs := clk - last
	last = clk
	var rdt := rdtMs / 1000.0
	if rdt > 0.1: rdt = 0.1
	if not (rdt > 0):
		last = clk
		return
	if _curtain_at >= 0 and clk >= _curtain_at:
		if ui._ldHold:
			_curtain_at = clk + 120.0
		else:
			_curtain_at = -1
			freeze = 0
			last = _now_ms()
	if Quality.sample(rdt * 1000.0, state == "playing"):
		if renderer3d: renderer3d.resize()
	if state == "playing": PerfLog.push(rdt * 1000.0)
	fpsEma = Quality.fps
	trauma = maxf(0.0, trauma - D.FX.shakeDecay * rdt)
	_shT += rdt
	if _shT > 1e4: _shT = 0
	var t2 := trauma * trauma
	var shx := 0.0
	var shy := 0.0
	var shr := 0.0
	if t2 > 1e-4:
		var T := _shT * 38
		var amp: float = t2 * D.FX.maxShakePx
		shx = (sin(T + 0.3) * 0.62 + sin(T * 2.37 + 1.7) * 0.38) * amp
		shy = (sin(T * 1.13 + 2.1) * 0.62 + sin(T * 2.71 + 0.4) * 0.38) * amp
		shr = sin(T * 0.83 + 4.2) * t2 * 0.012
	if _kickT < 0.6:
		var f := exp(-9 * _kickT) * cos(17 * _kickT)
		_kickT += rdt
		shx += _kax * f
		shy += _kay * f
	shakeX = shx; shakeY = shy; shakeR = shr
	if _punchT < 0.9:
		_punchT += rdt
		var u := _punchT
		zoomP = _punchA * 1.64 * (1 - exp(-34 * u)) * exp(-6 * u)
		if _punchT >= 0.9: zoomP = 0
	if _metaDirty and state != "playing": save_meta()
	if ui._ldHold:
		last = clk
		render_frame()
		return
	if freeze > 0:
		freeze -= rdt
		render_frame()
		return
	if freeze < 0: freeze = 0
	if state == "playing":
		if not (acc >= 0): acc = 0
		if _bossOutro > 0:
			_bossOutro -= rdt
			if _bossOutro <= 0:
				_bossOutro = -1
				on_boss_down()
		if _dying > 0:
			_dying -= rdt
			if _dying <= 0:
				_dying = -1
				game_over()
		acc += (rdt * 0.3 if _bossOutro > 0 else (rdt * 0.25 if _dying > 0 else rdt)) * devSpeed
		var steps := 0
		while acc >= STEP and steps < MAX_STEPS * devSpeed:
			Prof.b("update"); update(STEP); Prof.e("update")
			acc -= STEP
			steps += 1
		if steps == MAX_STEPS * devSpeed: acc = 0
	Prof.b("render_frame"); render_frame(); Prof.e("render_frame")
	Prof.frame()

func update(dt: float) -> void:
	time += dt
	if Quality.stress >= 0.66: _stressT += dt
	if player.maxHp > 0:
		var f := player.hp / player.maxHp
		if f < _hpFloor: _hpFloor = f
	Prof.b("player.update"); player.update(dt); Prof.e("player.update")
	Prof.b("props.update"); props.update(dt); Prof.e("props.update")
	Prof.b("objectives.update"); objectives.update(dt); Prof.e("objectives.update")
	Prof.b("powerups.update"); powerups.update(dt); Prof.e("powerups.update")
	Prof.b("fieldChests.update"); fieldChests.update(dt); Prof.e("fieldChests.update")
	Prof.b("ult.update"); ult.update(dt); Prof.e("ult.update")
	Prof.b("events.update"); events.update(dt); Prof.e("events.update")
	Prof.b("mode.update"); mode.update(dt); Prof.e("mode.update")
	Ftue.poll(self)
	if Ftue.step != "": Ftue.update(self, dt)
	Journey.ghost_tick(self, dt)
	Prof.b("weapons.update"); weapons.update(dt); Prof.e("weapons.update")
	Prof.b("enemies.update"); enemies.update(dt); Prof.e("enemies.update")
	Prof.b("update_gems"); update_gems(dt); Prof.e("update_gems")
	Prof.b("update_hearts"); update_hearts(dt); Prof.e("update_hearts")
	Prof.b("update_powerups"); update_powerups(dt); Prof.e("update_powerups")
	Prof.b("update_particles"); update_particles(dt); Prof.e("update_particles")
	Prof.b("update_texts"); update_texts(dt); Prof.e("update_texts")
	Prof.b("update_rings"); update_rings(dt); Prof.e("update_rings")
	Prof.b("update_hazards"); update_hazards(dt); Prof.e("update_hazards")
	var la := 0.04 if (motionK < 1 or Settings.data.rm) else 0.08
	var lk := minf(1.0, 2.4 * dt)
	var mx := input.mx
	var my := input.my
	_lookX += (mx * w * la - _lookX) * lk
	_lookY += (my * h * la * 0.8 - _lookY) * lk
	var k := minf(1.0, 6.5 * dt)
	cam.x += (player.x + _lookX - cam.x) * k
	cam.y += (player.y + _lookY - cam.y) * k
	if arena:
		var A = arena
		var hw := w / 2
		var hh := h / 2
		if A.w > w: cam.x = maxf(A.x0 + hw, minf(A.x0 + A.w - hw, cam.x))
		else: cam.x = 0
		if A.h > h: cam.y = maxf(A.y0 + hh, minf(A.y0 + A.h - hh, cam.y))
		else: cam.y = 0
	var r3 = renderer3d
	if r3:
		var PAD := 140.0
		viewL = cam.x + r3.cam_left - PAD
		viewR = cam.x + r3.cam_right + PAD
		viewT = cam.y - r3.cam_top - PAD
		viewB = cam.y + r3.cam_top + PAD
	else:
		viewL = cam.x - w / 2; viewR = cam.x + w / 2
		viewT = cam.y - h / 2; viewB = cam.y + h / 2
	if player.pendingLevels > 0 and _lvDelay <= 0:
		_lvDelay = 2.0
		ui.banner("SEVİYE " + str(player.level), "")
		_level_rise()
	if _lvDelay > 0:
		_lvDelay -= dt
		if _lvDelay <= 0:
			_lvDelay = 0
			if player.pendingLevels > 0:
				enter_level_up()
				return
	if is_boss_wave(wave):
		if enemies.bossDefeated: on_boss_down()
	else:
		waveTimer -= dt
		if waveTimer <= 1.5: enemies.spawning = false
		if waveTimer <= 0.9 and not _harvested and wave < msn.waves: _harvest_souls()
		if waveTimer <= 0: end_wave()

func update_gems(dt: float) -> void:
	var p := player
	var mag := p.magnet * powerups.magnet_mul()
	var magnet2 := mag * mag
	var pr: float = p.radius + D.PLAYER.pickupR
	var pickup2 := pr * pr
	var act: Array = pools.gems.active
	var i := act.size() - 1
	while i >= 0:
		if i >= act.size():
			i = act.size() - 1
			continue
		var g: Ent.Gem = act[i]
		i -= 1
		var dx := p.x - g.x
		var dy := p.y - g.y
		var d2 := dx * dx + dy * dy
		if d2 < pickup2:
			p.collect_gem(g.value * msn.gemMul, g.value * JS.num(msn, "xpMul", 1.0))
			audio.play("gem")
			spawn_burst(g.x, g.y, D.GEM_TIERS[g.tier].color, 3, 60, 2, 0.25, true)
			pools.gems.release(g)
			continue
		if g.pull or d2 < magnet2:
			g.pull = true
			g.pt += dt
			var d := sqrt(d2) if d2 > 0 else 1.0
			var u := g.pt - 0.07
			var pullSpeed := -130 * (-u / 0.07) if u < 0 else minf(1150.0, 320 + 900 * u + 5200 * u * u)
			g.vx = dx / d * pullSpeed
			g.vy = dy / d * pullSpeed
		else:
			g.vx *= 0.86
			g.vy *= 0.86
			g.bob += dt * 3
		g.x += g.vx * dt
		g.y += g.vy * dt

func update_hearts(dt: float) -> void:
	var p := player
	var mag := p.magnet * 1.0 * powerups.magnet_mul()
	var magnet2 := mag * mag
	var pr: float = p.radius + D.PLAYER.pickupR + 6
	var pickup2 := pr * pr
	var act: Array = pools.hearts.active
	var i := act.size() - 1
	while i >= 0:
		if i >= act.size():
			i = act.size() - 1
			continue
		var hh: Ent.Heart = act[i]
		i -= 1
		hh.life -= dt
		if hh.life <= 0:
			pools.hearts.release(hh)
			continue
		var dx := p.x - hh.x
		var dy := p.y - hh.y
		var d2 := dx * dx + dy * dy
		if d2 < pickup2:
			p.heal(hh.amount)
			audio.play("heal")
			spawn_burst(hh.x, hh.y, "#ff4a5e", 6, 90, 2.5, 0.3, true)
			spawn_burst(hh.x, hh.y, "#ffd0d6", 4, 60, 2, 0.25, true)
			pools.rings.take().setup(hh.x, hh.y, 46, 0.3, "#ff5a6e")
			pools.hearts.release(hh)
			continue
		if hh.pull or d2 < magnet2:
			hh.pull = true
			var d := sqrt(d2) if d2 > 0 else 1.0
			hh.vx = dx / d * 340
			hh.vy = dy / d * 340
		else:
			hh.vx *= 0.84
			hh.vy *= 0.84
			hh.bob += dt * 3
		hh.x += hh.vx * dt
		hh.y += hh.vy * dt

func update_powerups(dt: float) -> void:
	var p := player
	var mag := p.magnet * 1.35
	var magnet2 := mag * mag
	var pr: float = p.radius + D.PLAYER.pickupR + 12
	var pickup2 := pr * pr
	var act: Array = pools.powerups.active
	var i := act.size() - 1
	while i >= 0:
		if i >= act.size():
			i = act.size() - 1
			continue
		var o: Ent.PowerupDrop = act[i]
		i -= 1
		o.life -= dt
		if o.life <= 0:
			pools.powerups.release(o)
			continue
		var dx := p.x - o.x
		var dy := p.y - o.y
		var d2 := dx * dx + dy * dy
		if d2 < pickup2:
			powerups.collect(o.kind)
			pools.rings.take().setup(o.x, o.y, 62, 0.35, PowerupManager.PU[o.kind].col)
			pools.powerups.release(o)
			continue
		if o.pull or d2 < magnet2:
			o.pull = true
			var d := sqrt(d2) if d2 > 0 else 1.0
			o.vx = dx / d * 300
			o.vy = dy / d * 300
		else:
			o.vx *= 0.86
			o.vy *= 0.86
			o.bob += dt * 2.6
		o.x += o.vx * dt
		o.y += o.vy * dt

func update_hazards(dt: float) -> void:
	var p := player
	var act: Array = pools.hazards.active
	var i := act.size() - 1
	while i >= 0:
		if i >= act.size():
			i = act.size() - 1
			continue
		var o: Ent.Hazard = act[i]
		i -= 1
		o.t += dt
		var dx := p.x - o.x
		var dy := p.y - o.y
		if o.kind == 0:
			if not o.hit and o.t >= o.tell:
				o.hit = true
				var rr := o.r + p.radius
				if dx * dx + dy * dy < rr * rr: Combat.damage_player(self, o.dmg, o.x, o.y)
				var col := "#7bd66a" if o.hue else "#ff4a5e"
				pools.rings.take().setup(o.x, o.y, o.r * 1.06, 0.34, col)
				spawn_burst(o.x, o.y, col, 9, 210, 3, 0.5, true)
				if renderer3d and in_view(o.x, o.y, 60):
					if o.hue: renderer3d.spawn_hit(o.x, o.y, 0, 2, 0.42, 1.0, 0.34)
					else: renderer3d.spawn_hit(o.x, o.y, 0, 2, 1.0, 0.24, 0.28)
				add_shake(0.10)
				audio.play("bombhit")
				if o.pdur > 0:
					o.kind = 1; o.t = 0; o.dur = o.pdur
					o.dmg = o.pdmg; o.tick = 0.5; o.hue = 1
					continue
			if o.t >= o.dur: pools.hazards.release(o)
			continue
		o.tick -= dt
		if o.tick <= 0:
			o.tick = 0.5
			var rr := o.r + p.radius
			if dx * dx + dy * dy < rr * rr: Combat.damage_player(self, o.dmg, o.x, o.y)
		if o.t >= o.dur: pools.hazards.release(o)

func spawn_hazard(x: float, y: float, r: float, dmg: float, tell: float, dur: float, kind: int = 0, hue: int = 0, pdur: float = 0.0, pdmg: float = 0.0):
	if pools.hazards.active.size() >= D.HAZARD_CAP: return null
	return pools.hazards.take().setup(x, y, r, dmg, tell, dur, kind, hue, pdur, pdmg)

func update_rings(dt: float) -> void:
	var act: Array = pools.rings.active
	var i := act.size() - 1
	while i >= 0:
		var o: Ent.Ring = act[i]
		i -= 1
		o.life -= dt
		if o.life <= 0:
			pools.rings.release(o)
			continue
		o.r = o.max * (1 - o.life / o.maxLife)

func update_particles(dt: float) -> void:
	var act: Array = pools.particles.active
	var i := act.size() - 1
	while i >= 0:
		var o: Ent.Particle = act[i]
		i -= 1
		o.life -= dt
		if o.life <= 0:
			pools.particles.release(o)
			continue
		o.vy += o.grav * dt
		o.vx *= o.drag
		o.vy *= o.drag
		o.x += o.vx * dt
		o.y += o.vy * dt

func update_texts(dt: float) -> void:
	var act: Array = pools.texts.active
	var i := act.size() - 1
	while i >= 0:
		var o: Ent.FloatText = act[i]
		i -= 1
		o.life -= dt
		if o.life <= 0:
			pools.texts.release(o)
			continue
		o.pt += dt
		o.x += o.vx * dt
		o.vx *= 0.9
		o.y += o.vy * dt
		o.vy *= 0.94

# ═══════════ RENDER ═══════════

func render_frame() -> void:
	audio._calm = state != "playing"
	if state == "menu":
		if not _menuSkip:
			_menuSkip = true
			renderer3d.set_active(false)
			overlay.clear()
			if _dangerOn:
				_dangerOn = false
				ui.set_danger(false)
			if music.playing:
				music.set_danger(false)
				music.set_thin(false)
		return
	if _menuSkip:
		_menuSkip = false
		renderer3d.set_active(true)
	var st := state
	var still := false
	if st == "paused" or st == "levelup" or st == "gameover" or st == "victory":
		if renderer3d._needsFrame:
			renderer3d._needsFrame = false
			_stillN = 0
		_stillN += 1
		if _stillN > 30 and trauma < 0.02 and zoomP < 5e-4: still = true
	else:
		_stillN = 0
		renderer3d._needsFrame = false
	renderer3d.set_frozen(still)
	if not still:
		Prof.b("r3d.render"); renderer3d.render(self); Prof.e("r3d.render")
		Prof.b("overlay"); overlay.draw_frame(); Prof.e("overlay")
	_hudTick += 1
	if state == "playing" and _hudTick % 3 == 0:
		Prof.b("hud"); ui.update_hud(); Prof.e("hud")
		var dz := player.hp > 0 and player.hp <= player.maxHp * 0.3
		if dz != _dangerOn:
			_dangerOn = dz
			ui.set_danger(dz)
		if dz and time - _hbAt > 1.05:
			_hbAt = time
			audio.play("heartbeat")
	elif _dangerOn and state != "playing" and state != "paused":
		_dangerOn = false
		ui.set_danger(false)
	if _hudTick % 3 == 0 and music.playing:
		music.set_danger(state == "playing" and player.hp <= player.maxHp * 0.3)
		music.set_thin(Quality.stress > 0.5)

func _learn_tier() -> void:
	var t := time
	var s := _stressT
	_stressT = 0
	if t < 90 or s / t < 0.4 or Settings.data.gfx != "auto": return
	var T := ["low", "mid", "high"]
	var i := T.find(Settings.autoTier)
	if i <= 0: return
	var nxt: String = T[i - 1]
	Store.set_item("kh_learntier_v1", nxt)
	Settings.autoTier = nxt
	Quality.init(nxt, isMobile)
	if Settings.data.batt:
		Quality.cap_fps = 30
		Quality._apply_cap()
	if renderer3d: renderer3d.resize()

func combo() -> void:
	var t := time
	if t - _cbT > 1.4:
		_cbN = 0
		_cbTier = 0
	_cbT = t
	_cbN += 1
	var n := _cbN
	if n > _cbBest: _cbBest = n
	var tier := 3 if n >= 60 else (2 if n >= 30 else (1 if n >= 12 else 0))
	if tier > _cbTier:
		_cbTier = tier
		audio.comboTier = tier
		audio.play("combo")
		if tier >= 2: Quality.haptic("crit")
