class_name Music
extends Node
## music.js — (GEÇİCİ İSKELET) müzik motoru sonraki adımda taşınacak.
var audio
var playing := false
func _init(a = null) -> void: audio = a
func accent(_a = null) -> void: pass
func duck(_ms = 0) -> void: pass
func fade_out(_ms = 0) -> void: pass
func set_danger(_on) -> void: pass
func set_intensity(_v) -> void: pass
func set_state(_s, _a = null) -> void: pass
func set_thin(_on) -> void: pass
func set_volume(_v) -> void: pass
