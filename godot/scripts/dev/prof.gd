class_name Prof
## Geliştirici profilleyici: PROF=1 ortam değişkeniyle etkin; etiket başına kare ortalaması (ms).
static var on := OS.get_environment("PROF") != ""
static var _acc := {}
static var _t0 := {}
static var _frames := 0
static var _last := 0.0

static func b(k: String) -> void:
	if on: _t0[k] = Time.get_ticks_usec()

static func e(k: String) -> void:
	if not on or not _t0.has(k): return
	_acc[k] = float(_acc.get(k, 0.0)) + (Time.get_ticks_usec() - int(_t0[k])) / 1000.0

static func frame() -> void:
	if not on: return
	_frames += 1
	var now := Time.get_ticks_msec() / 1000.0
	if now - _last < 3.0: return
	_last = now
	var keys := _acc.keys()
	keys.sort_custom(func(a, c): return _acc[a] > _acc[c])
	var s := "PROF"
	for k in keys: s += " " + k + "=" + str(snappedf(_acc[k] / maxf(1, _frames), 0.01))
	print(s)
	_acc.clear()
	_frames = 0
