class_name Prof
## Geliştirici profilleyici: PROF=1 ortam değişkeniyle etkin; etiket başına kare ortalaması (ms).
static var on := OS.get_environment("PROF") != ""
static var _acc := {}
static var _t0 := {}
static var _frames := 0
static var _last := 0.0

static func b(k: String) -> void:
	if on: _t0[k] = Time.get_ticks_usec()

static var _mx := {}
static func e(k: String) -> void:
	if not on or not _t0.has(k): return
	var ms := (Time.get_ticks_usec() - int(_t0[k])) / 1000.0
	_acc[k] = float(_acc.get(k, 0.0)) + ms
	if ms > float(_mx.get(k, 0.0)): _mx[k] = ms

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
	var mk := _mx.keys()
	mk.sort_custom(func(a, c): return _mx[a] > _mx[c])
	var s2 := "PROFMAX"
	for k in mk.slice(0, 8): s2 += " " + k + "=" + str(snappedf(_mx[k], 0.1))
	print(s2)
	_mx.clear()
	_acc.clear()
	_frames = 0

## tek seferlik iş süresi: s(k) … t(k) → 2 ms'yi aşarsa "SPAN k ms" yazar
static var _sp := {}
static func s(k: String) -> void:
	if not on: return
	_sp[k] = Time.get_ticks_usec()
	Lyr.t_json = 0.0; Lyr.t_tex = 0.0; Lyr.t_text = 0.0; Lyr.n_make = 0; Lyr.n_nodes = 0

static func t(k: String) -> void:
	if not on or not _sp.has(k): return
	var ms := (Time.get_ticks_usec() - int(_sp[k])) / 1000.0
	_sp.erase(k)
	if ms >= 2.0: print("SPAN ", k, " ", snappedf(ms, 0.1), " ms  [make=", Lyr.n_make, " nodes=", Lyr.n_nodes, " json=", snappedf(Lyr.t_json, 0.1), " tex=", snappedf(Lyr.t_tex, 0.1), " text=", snappedf(Lyr.t_text, 0.1), "]")

## uzun kare: kare süresi eşiği aşınca yazar
static func hitch(dt: float) -> void:
	if on and dt > 0.03: print("HITCH ", snappedf(dt * 1000.0, 0.1), " ms @", Engine.get_process_frames())
