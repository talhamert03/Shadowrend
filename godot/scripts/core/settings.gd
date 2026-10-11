extends Node
## Settings — settings.js (oyuncu ayarları: tek doğruluk kaynağı + kalıcılık).

const KEY := "kh_settings_v1"
const DEF := {"gfx": "auto", "sfx": 0.62, "music": 0.5, "haptics": true, "shake": true, "rm": false, "batt": false, "cb": false, "big": false, "hsoft": false}
const TIERS := ["low", "mid", "high"]
const AFX_CB := ["#56b4e9", "#f0e442", "#ffffff", "#e69f00", "#009e73", "#d55e00"]

signal applied(key: String)

var data := DEF.duplicate()
var autoTier := "mid"
var is_mobile := false
var _game = null
var _afx_base: Array = []

func attach(game, auto_tier: String, mobile: bool) -> void:
	_game = game
	autoTier = auto_tier if TIERS.has(auto_tier) else "mid"
	is_mobile = mobile
	load_data()

func load_data() -> void:
	var raw = Store.get_item(KEY)
	if raw == null: return
	var o = JSON.parse_string(raw)
	if not (o is Dictionary): return
	if o.get("gfx") == "auto" or TIERS.has(o.get("gfx")): data.gfx = o.gfx
	for k in ["sfx", "music"]:
		var v = o.get(k)
		if (v is float or v is int) and v >= 0 and v <= 1: data[k] = float(v)
	for k in ["haptics", "shake", "rm", "batt", "cb", "big", "hsoft"]:
		if o.get(k) is bool: data[k] = o[k]

func save() -> void:
	Store.set_item(KEY, JSON.stringify(data))

func tier() -> String:
	return autoTier if data.gfx == "auto" else data.gfx

func tier_label() -> String:
	var names := {"low": "DÜŞÜK", "mid": "ORTA", "high": "YÜKSEK"}
	return "OTOMATİK · " + names[autoTier] if data.gfx == "auto" else names[tier()]

func set_value(key: String, value) -> void:
	if not data.has(key): return
	data[key] = value
	save()
	apply_one(key)

func apply_all() -> void:
	for k in ["gfx", "sfx", "music", "haptics", "shake", "rm", "cb", "big", "hsoft", "batt"]:
		apply_one(k)

func apply_one(key: String) -> void:
	var g = _game
	match key:
		"shake":
			if g: g.motionK = 1.0 if data.shake else 0.3
		"rm":
			pass   # hareketi azalt: UI bunu okur (applied sinyali)
		"batt":
			Quality.cap_fps = 30 if data.batt else (60 if is_mobile else 0)
			Quality._apply_cap()
		"cb":
			if _afx_base.is_empty():
				for a in EnemyManager.ELITE_AFFIX: _afx_base.append(a.col)
			for i in EnemyManager.ELITE_AFFIX.size():
				EnemyManager.ELITE_AFFIX[i].col = AFX_CB[i] if data.cb else _afx_base[i]
		"big":
			if g: g._bigTxt = data.big
		"hsoft":
			Quality.haptics_k = 0.45 if data.hsoft else 1.0
		"haptics":
			Quality.haptics_enabled = data.haptics
		"sfx":
			if g and g.audio: g.audio.set_volume(data.sfx)
		"music":
			if g and g.music: g.music.set_volume(data.music)
		"gfx":
			Quality.init(tier(), is_mobile)
			if data.batt:
				Quality.cap_fps = 30
				Quality._apply_cap()
			if g and g.renderer3d: g.renderer3d.resize()
	applied.emit(key)
