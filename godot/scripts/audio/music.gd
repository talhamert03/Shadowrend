class_name Music
extends Node
## music.js — ADAPTİF PROSEDÜREL MÜZİK'in Godot karşılığı.
## Partisyon web'in KENDİ sıralayıcısıyla (tools/bake/pages/music.html)
## her durum × yoğunluk kademesi için 16 barlık kesintisiz döngüye pişti;
## burada web'deki karar mantığı aynen sürer:
## • menü/savaş/zafer bir sonraki BAR SINIRINDA girer, boss ANINDA (dram)
## • yoğunluk bar başına yumuşatılır (_iSm += (I − _iSm)·0,34) ve en yakın
##   pişmiş kademeye geçilir (tempo da kademeyle değişir: bpm + bpmInt·i)
## • can kritikse triton katmanı duyulur (setDanger)
## • duck / accent / fadeOut aynı zaman sabitleriyle
## Ses yolu efektlerle ORTAK limiter'den geçer (Oyun veriyolu).

var audio
var playing := false
var state := "menu"
var pending = null
var intensity := 0.0
var _iSm := 0.0
var danger := false
var thin := false
var volume := 0.5
var muted := false
var M: Dictionary = {}
var _bakeGain := 0.5
var _cur: Dictionary = {}        # {p: AudioStreamPlayer, st, li, barDur, g, tg, tc}
var _old: Array = []             # sönen oyuncular
var _dng: AudioStreamPlayer
var _dngG := 0.0
var _dngLi := -1
var _dngSt := ""
var _lvl := 0.0                  # ana ses (duck/fade zarfı)
var _lvlTg := 0.0
var _lvlTc := 0.6
var _duckBackAt := -1.0
var _duckBackTc := 0.35
var _lastBar := -1
var _cache := {}

func _init(a = null) -> void:
	audio = a
	name = "Music"

func _ready() -> void:
	var f := FileAccess.open("res://assets/audio/music/music_meta.json", FileAccess.READ)
	M = JSON.parse_string(f.get_as_text()) if f else {}
	_bakeGain = float(M.get("bakeGain", 0.5))
	var v = Store.get_item("kh_music_vol")
	if v != null: volume = clampf(float(v), 0, 1)
	muted = Store.get_item("kh_music_mute") == "1"
	_dng = AudioStreamPlayer.new()
	_dng.bus = AudioFX.BUS
	add_child(_dng)

func _stream(file: String, loop: bool) -> AudioStream:
	if not _cache.has(file):
		var s = load("res://assets/audio/music/" + file + ".ogg")
		if s is AudioStreamOggVorbis: s.loop = loop
		_cache[file] = s
	return _cache[file]

func _now() -> float: return Time.get_ticks_usec() / 1e6

## web: _level() = muted ? 0 : 0.9·volume
func _level() -> float: return 0.0 if muted else 0.9 * volume

func set_volume(v: float) -> void:
	volume = clampf(v, 0, 1)
	Store.set_item("kh_music_vol", str(volume))
	_lvlTg = _level(); _lvlTc = 0.08

func set_muted(m: bool) -> void:
	muted = m
	Store.set_item("kh_music_mute", "1" if muted else "0")
	_lvlTg = _level(); _lvlTc = 0.08

func set_intensity(v: float) -> void: intensity = clampf(v if v else 0.0, 0, 1)
func set_danger(d: bool) -> void: danger = d
func set_thin(t: bool) -> void: thin = t

func _cfg(st: String) -> Dictionary: return M.states[st]

func _level_index(i: float) -> int:
	var L: Array = M.levels
	var best := 0
	for k in L.size():
		if absf(L[k] - i) < absf(L[best] - i): best = k
	return best

## Durum değişimi (web setState): boss ANINDA, diğerleri bar sınırında.
func set_state(nm: String, immediate := false) -> void:
	if nm == "silent":
		fade_out(0.5)
		return
	if M.is_empty() or not M.states.has(nm): return
	if not playing:
		state = nm
		_begin()
		return
	if nm == state and pending == null: return
	if immediate or nm == "boss" or state == "boss":
		_switch(nm, _level_index(_iSm), 0)
		pending = null
	else:
		pending = nm

func _begin() -> void:
	playing = true
	_lastBar = -1
	_iSm = intensity
	_lvl = 0.0
	_lvlTg = _level(); _lvlTc = 0.6
	_switch(state, _level_index(_iSm), 0, true)

## Yeni döngüyü bar hizasında başlat, eskisini çapraz söndür.
func _switch(st: String, li: int, bar: int, instant := false) -> void:
	var cfg := _cfg(st)
	var file: String = cfg.files[li]
	var barDur: float = cfg.barDur[li]
	var p := AudioStreamPlayer.new()
	p.bus = AudioFX.BUS
	p.stream = _stream(file, true)
	p.volume_db = -80
	add_child(p)
	p.play((bar % int(M.bars)) * barDur)
	var tc := maxf(0.12, float(cfg.xfade) * 0.35)
	if not _cur.is_empty():
		_cur.tg = 0.0
		_cur.tc = tc
		_old.append(_cur)
	_cur = {"p": p, "st": st, "li": li, "barDur": barDur, "g": 1.0 if instant else 0.0, "tg": 1.0, "tc": tc}
	state = st

## web duck(amount, dur) — sınıftaki İKİNCİ tanım geçerli (JS'te son tanım kazanır).
## duck(600) gibi milisaniye çağrıları web'de kazancı negatife sürüyordu
## (faz ters, aşırı yüksek); burada ilk tanımın anlamıyla (ms) uygulanır.
func duck(amount = null, dur = null) -> void:
	if not playing: return
	var L := _level()
	if amount != null and float(amount) > 1.0:
		_lvlTg = L * 0.3; _lvlTc = 0.03
		_duckBackAt = _now() + float(amount) / 1000.0
		_duckBackTc = 0.25
		return
	var a: float = 0.6 if amount == null else float(amount)
	_lvlTg = L * (1 - a); _lvlTc = 0.06
	_duckBackAt = _now() + (float(dur) if dur else 1.4)
	_duckBackTc = 0.35

## Dalga geçişi / boss uyanışı vurgusu (pişmiş, durumun kendi kanalından)
func accent(kind: String = "") -> void:
	if not playing: return
	var p := AudioStreamPlayer.new()
	p.bus = AudioFX.BUS
	p.stream = _stream("acc_" + state + "_" + ("boss" if kind == "boss" else "wave"), false)
	p.volume_db = linear_to_db(maxf(1e-4, _lvl / _bakeGain))
	add_child(p)
	p.finished.connect(p.queue_free)
	p.play()

func fade_out(sec: float = 1.0) -> void:
	_lvlTg = 0.0
	_lvlTc = maxf(0.08, sec * 0.35)
	_duckBackAt = -1
	playing = false

## Bar saati: etkin döngünün çalma konumundan.
func _bar_now() -> int:
	if _cur.is_empty(): return -1
	var p: AudioStreamPlayer = _cur.p
	if not p.playing: return -1
	var pos := p.get_playback_position() + AudioServer.get_time_since_last_mix()
	return int(floor(pos / float(_cur.barDur)))

func _process(dt: float) -> void:
	if M.is_empty(): return
	# ana zarf (setTargetAtTime: üstel yaklaşım)
	if _duckBackAt >= 0 and _now() >= _duckBackAt:
		_duckBackAt = -1
		_lvlTg = _level(); _lvlTc = _duckBackTc
	_lvl += (_lvlTg - _lvl) * (1 - exp(-dt / maxf(0.001, _lvlTc)))
	# bar sınırı: bekleyen durum + yoğunluk kademesi
	if playing and not _cur.is_empty():
		var b := _bar_now()
		if b >= 0 and b != _lastBar:
			_lastBar = b
			_iSm += (intensity - _iSm) * 0.34
			var li := _level_index(_iSm)
			if pending != null:
				var nm: String = pending
				pending = null
				_switch(nm, li, b + 0)
				_lastBar = -1
			elif li != int(_cur.li):
				_switch(state, li, b)
				_lastBar = b
			# tehlike tritonu: bar hizasında başlar, yumuşak girer/çıkar
			var want := danger and playing
			if want and (_dngSt != state or _dngLi != int(_cur.li) or not _dng.playing):
				_dngSt = state; _dngLi = int(_cur.li)
				_dng.stream = _stream(_cfg(state).files[_dngLi] + "_danger", true)
				_dng.play(float(b % 2) * float(_cur.barDur))
	# kazançlar
	var base := _lvl / _bakeGain
	if not _cur.is_empty():
		_cur.g += (_cur.tg - _cur.g) * (1 - exp(-dt / maxf(0.001, _cur.tc)))
		(_cur.p as AudioStreamPlayer).volume_db = linear_to_db(maxf(1e-5, base * _cur.g))
	for i in range(_old.size() - 1, -1, -1):
		var o: Dictionary = _old[i]
		o.g += (o.tg - o.g) * (1 - exp(-dt / maxf(0.001, o.tc)))
		if o.g < 0.002:
			(o.p as AudioStreamPlayer).queue_free()
			_old.remove_at(i)
		else:
			(o.p as AudioStreamPlayer).volume_db = linear_to_db(maxf(1e-5, base * o.g))
	_dngG += ((1.0 if danger and playing else 0.0) - _dngG) * (1 - exp(-dt / 0.6))
	_dng.volume_db = linear_to_db(maxf(1e-5, base * _dngG))
	if _dngG < 0.002 and _dng.playing and not danger: _dng.stop()
	# tamamen söndüyse dur
	if not playing and _lvl < 0.002 and not _cur.is_empty():
		for o in _old: (o.p as AudioStreamPlayer).queue_free()
		_old.clear()
		(_cur.p as AudioStreamPlayer).queue_free()
		_cur = {}
		_dng.stop()
