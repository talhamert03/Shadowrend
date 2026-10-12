class_name AudioFX
extends Node
## audio.js — PREMIUM SENTEZ SES MOTORU'nun Godot karşılığı.
## Web'de her ses Web Audio ile sentezlenip (v73b) OfflineAudioContext'te
## tampona pişiyordu; burada aynı tamponlar (tools/bake/pages/sfx.html ile
## oyunun KENDİ sentez koduyla pişirildi) çalınır. Kanal zinciri birebir:
##   ses ─▶ Oyun veriyolu ─▶ DC engeli (20 Hz HP) ─▶ limiter ─▶ ses düzeyi
## Tetik kuralları aynen: aynı 16 ms'de en çok 6 ses (arayüz muaf), ses
## başına asgari aralık (minGap), rastgele varyant + ardıl tekrar yasağı,
## sık seslerde ±%1,2 perde (bank davranışı), gem perde merdiveni.

const BUS := "Oyun"
const VOICES := 28

var g
var _calm := true
var comboTier := 0
var ultKind := ""
var ultTier := 0
var volume := 0.62
var muted := false
var minGap := {}
var variants := {}
var uiSnd := {}
var lastPlayed := {}
var rr := {}
var gemStep := 0
var gemLastT := -10.0
var _vt := 0.0
var _vn := 0
var _streams := {}
var _players: Array[AudioStreamPlayer] = []
var _next := 0

func _init(a = null) -> void:
	g = a
	name = "AudioFX"

func _ready() -> void:
	_setup_bus()
	var f := FileAccess.open("res://assets/audio/sfx/sfx_meta.json", FileAccess.READ)
	var m: Dictionary = JSON.parse_string(f.get_as_text()) if f else {}
	minGap = m.get("minGap", {})
	variants = m.get("variants", {})
	for n in m.get("uiSounds", []): uiSnd[n] = true
	for i in VOICES:
		var p := AudioStreamPlayer.new()
		p.bus = BUS
		add_child(p)
		_players.append(p)
	_apply()

## DC engeli + limiter (threshold −9 dB · knee 8 · ratio 11 · attack 3 ms · release 160 ms)
static func _setup_bus() -> void:
	if AudioServer.get_bus_index(BUS) >= 0: return
	AudioServer.add_bus()
	var i := AudioServer.bus_count - 1
	AudioServer.set_bus_name(i, BUS)
	AudioServer.set_bus_send(i, "Master")
	var hp := AudioEffectHighPassFilter.new()
	hp.cutoff_hz = 20
	hp.resonance = 0.5
	AudioServer.add_bus_effect(i, hp)
	var c := AudioEffectCompressor.new()
	c.threshold = -9
	c.ratio = 11
	c.attack_us = 3000
	c.release_ms = 160
	AudioServer.add_bus_effect(i, c)

func _now() -> float: return Time.get_ticks_usec() / 1e6

func unlock() -> void: pass

func set_volume(v: float) -> void:
	volume = clampf(v, 0, 1)
	_apply()

func set_muted(m: bool) -> void:
	muted = m
	_apply()

func _apply() -> void:
	var i := AudioServer.get_bus_index(BUS)
	if i < 0: return
	AudioServer.set_bus_volume_db(i, -80.0 if (muted or volume <= 0) else linear_to_db(volume))

func _stream(file: String) -> AudioStream:
	if not _streams.has(file):
		_streams[file] = load("res://assets/audio/sfx/" + file + ".wav") if ResourceLoader.exists("res://assets/audio/sfx/" + file + ".wav") else null
	return _streams[file]

## audio.pick: rastgele, ardıl tekrar yok
func _pick(nm: String, n: int) -> int:
	var last: int = rr.get(nm, -1)
	var i := randi() % n
	if i == last and n > 1: i = (i + 1 + randi() % (n - 1)) % n
	rr[nm] = i
	return i

func _file_for(nm: String, k: int, now: float) -> String:
	match nm:
		"gem":
			if now - gemLastT > 0.7: gemStep = 0
			gemLastT = now
			var s := gemStep
			gemStep = mini(gemStep + 1, 15)
			return "gem_" + str(s)
		"ulthit": return "ulthit_" + ultKind + "_" + str(k)
		"ultfire": return "ultfire_" + ultKind + "_" + str(clampi(ultTier, 1, 4))
		"combo": return "combo_" + str(clampi(comboTier, 0, 3))
	var nv: int = int(variants.get(nm, 1))
	return nm + "_" + str(k % maxi(1, nv))

func play(nm: String, _a = null, _b = null, _c = null) -> void:
	if muted: return
	var now := _now()
	if not uiSnd.has(nm):
		if now - _vt > 0.016:
			_vt = now
			_vn = 0
		_vn += 1
		if _vn > 6: return
	var gap: float = float(minGap.get(nm, 0.035))
	if now - float(lastPlayed.get(nm, -10.0)) < gap: return
	lastPlayed[nm] = now
	var k := _pick(nm, 3)
	var st := _stream(_file_for(nm, k, now))
	if st == null: return
	var p := _players[_next]
	_next = (_next + 1) % VOICES
	p.stream = st
	p.pitch_scale = 1.0 + (randf() * 2 - 1) * 0.012 if gap < 0.15 else 1.0
	p.play()
