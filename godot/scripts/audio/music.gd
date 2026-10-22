class_name Music
extends Node
## Oyun müziği: gerçek orkestral parçalar (CC0, kaynaklar: assets/audio/music/CREDITS.md).
## • menü: sıcak ortaçağ macera teması · savaş: iki sakin, alçak frekanslı döngü (her
##   koşuda sırayla; uzun oturumda yormasın diye tizleri kısık, menüden ~3 dB alçak)
## • boss: destansı, kesintisiz döngü (ANINDA girer) · zafer / yenilgi: kısa jingle
## • döngü: parça sonuna 3 sn kala başa çapraz geçiş (dikişsiz olmayan parçalar için)
## • savaş ↔ boss geçişinde savaş parçası kaldığı yerden sürer
## Ses yolu efektlerle ORTAK limiter'den geçer (Oyun veriyolu).

const DIR := "res://assets/audio/music/"
const TRACKS := {"menu": ["menu"], "battle": ["battle_a", "battle_b"], "boss": ["boss"], "victory": ["victory"], "defeat": ["defeat"]}
const GAIN := {"menu": 1.0, "battle": 0.78, "boss": 0.92, "victory": 1.0, "defeat": 1.0}
const SEAMLESS := ["boss"]
const ONESHOT := ["victory", "defeat"]
const XF := 3.0

var audio
var playing := false
var state := "menu"
var intensity := 0.0
var danger := false
var thin := false
var volume := 0.5
var muted := false
var _cur: Dictionary = {}        # {p, file, st, g, tg, tc, xf}
var _old: Array = []             # sönen oyuncular
var _lvl := 0.0                  # ana ses (duck/fade zarfı)
var _lvlTg := 0.0
var _lvlTc := 0.6
var _duckBackAt := -1.0
var _duckBackTc := 0.35
var _cache := {}
var _req := {}
var _battle_i := -1
var _resume := {}                # dosya → kaldığı konum (savaş ↔ boss)

func _init(a = null) -> void:
	audio = a
	name = "Music"

func _ready() -> void:
	var v = Store.get_item("kh_music_vol")
	if v != null: volume = clampf(float(v), 0, 1)
	muted = Store.get_item("kh_music_mute") == "1"
	# parçalar arka planda çözülsün (ilk geçişte disk okuması/ayrıştırma takılması olmasın)
	for st in TRACKS:
		for f in TRACKS[st]:
			var path: String = DIR + f + ".ogg"
			if ResourceLoader.exists(path) and ResourceLoader.load_threaded_request(path) == OK: _req[f] = path

func _stream(file: String) -> AudioStream:
	if not _cache.has(file):
		var s
		if _req.has(file):
			s = ResourceLoader.load_threaded_get(_req[file])
			_req.erase(file)
		else:
			s = load(DIR + file + ".ogg")
		if s is AudioStreamOggVorbis:
			(s as AudioStreamOggVorbis).loop = SEAMLESS.has(_state_of(file))
		_cache[file] = s
	return _cache[file]

static func _state_of(file: String) -> String:
	for st in TRACKS:
		if (TRACKS[st] as Array).has(file): return st
	return ""

func _now() -> float: return Time.get_ticks_usec() / 1e6

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

func set_state(nm: String, immediate := false) -> void:
	if nm == "silent":
		fade_out(0.5)
		return
	if not TRACKS.has(nm): return
	if playing and nm == state and not _cur.is_empty(): return
	var was := state
	state = nm
	if not playing:
		playing = true
		_lvlTg = _level(); _lvlTc = 0.6
		if _lvl < 0.01: _lvl = 0.0
	var file: String = TRACKS[nm][0]
	if nm == "battle":
		# yeni koşu: sıradaki savaş parçası; boss'tan dönüş: aynı parça kaldığı yerden
		if was != "boss" or _battle_i < 0: _battle_i = (_battle_i + 1) % (TRACKS.battle as Array).size()
		file = TRACKS.battle[_battle_i]
	var fast := immediate or nm == "boss" or was == "boss" or ONESHOT.has(nm)
	_play(file, nm, 0.15 if fast else 0.5, fast and ONESHOT.has(nm))

func _play(file: String, st: String, tc: float, instant := false) -> void:
	if not _cur.is_empty():
		var op: AudioStreamPlayer = _cur.p
		if _state_of(String(_cur.file)) == "battle" and op.playing: _resume[_cur.file] = op.get_playback_position()
		_cur.tg = 0.0
		_cur.tc = tc
		_old.append(_cur)
		_cur = {}
	var p := AudioStreamPlayer.new()
	p.bus = AudioFX.BUS
	p.stream = _stream(file)
	p.volume_db = -80
	add_child(p)
	var from: float = _resume.get(file, 0.0) if st == "battle" else 0.0
	_resume.erase(file)
	p.play(from)
	_cur = {"p": p, "file": file, "st": st, "g": 1.0 if instant else 0.0, "tg": 1.0, "tc": tc, "xf": false}

## web duck(amount, dur): 0–1 oranı + süre (sn) ya da milisaniye
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

## dalga / boss vurgusu: gerçek parçalarla çakışmasın diye yalnız kısa bir nefes (duck)
func accent(kind: String = "") -> void:
	if playing and kind == "boss": duck(0.25, 0.8)

## kısa jingle (yenilgi): müziği kesip çalar
func sting(nm: String) -> void:
	if not TRACKS.has(nm): return
	playing = true
	state = nm
	_lvlTg = _level(); _lvlTc = 0.1
	_play(TRACKS[nm][0], nm, 0.12, true)

func fade_out(sec: float = 1.0) -> void:
	_lvlTg = 0.0
	_lvlTc = maxf(0.08, sec * 0.35)
	_duckBackAt = -1
	playing = false

func _process(dt: float) -> void:
	if _duckBackAt >= 0 and _now() >= _duckBackAt:
		_duckBackAt = -1
		_lvlTg = _level(); _lvlTc = _duckBackTc
	_lvl += (_lvlTg - _lvl) * (1 - exp(-dt / maxf(0.001, _lvlTc)))
	if not _cur.is_empty():
		var p: AudioStreamPlayer = _cur.p
		var st := String(_cur.st)
		# dikişsiz olmayan döngü: sona XF kala başa çapraz geçiş
		if not ONESHOT.has(st) and not SEAMLESS.has(st) and p.playing and p.stream:
			var L := p.stream.get_length()
			if L > XF * 3.0 and p.get_playback_position() >= L - XF:
				_play(String(_cur.file), st, XF * 0.3)
		elif ONESHOT.has(st) and not p.playing:
			p.queue_free()
			_cur = {}
	var base := _lvl
	if not _cur.is_empty():
		_cur.g += (_cur.tg - _cur.g) * (1 - exp(-dt / maxf(0.001, _cur.tc)))
		(_cur.p as AudioStreamPlayer).volume_db = linear_to_db(maxf(1e-5, base * _cur.g * float(GAIN.get(_cur.st, 1.0))))
	for i in range(_old.size() - 1, -1, -1):
		var o: Dictionary = _old[i]
		o.g += (o.tg - o.g) * (1 - exp(-dt / maxf(0.001, o.tc)))
		if o.g < 0.002:
			(o.p as AudioStreamPlayer).queue_free()
			_old.remove_at(i)
		else:
			(o.p as AudioStreamPlayer).volume_db = linear_to_db(maxf(1e-5, base * o.g * float(GAIN.get(o.st, 1.0))))
	if not playing and _lvl < 0.002 and not _cur.is_empty():
		for o in _old: (o.p as AudioStreamPlayer).queue_free()
		_old.clear()
		(_cur.p as AudioStreamPlayer).queue_free()
		_cur = {}
