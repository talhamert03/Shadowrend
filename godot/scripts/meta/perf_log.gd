class_name PerfLog
## perfLog.js — çevrimdışı saha ölçümü (son 30 koşu) + errlog.js yerel hata defteri.

const KEY := "kh_perflog_v1"
const N := 1 << 14
static var buf := PackedFloat32Array()
static var n := 0
static var on := false
static var t0 := 0.0
static var spikes := 0

# kare bileşenleri (cihazda darboğaz işlemci mi ekran kartı mı?): betik, çizim-CPU, çizim-GPU, düşman
static var _sCpu := 0.0
static var _sRc := 0.0
static var _sRg := 0.0
static var _sEn := 0.0
static var _ns := 0
static var vp_rid := RID()          # 3B görünüm (render3d ölçümü açar)
static var _g = null
static var _lastCk := 0

static func begin() -> void:
	if buf.size() != N: buf.resize(N)
	n = 0; spikes = 0; on = true
	_sCpu = 0.0; _sRc = 0.0; _sRg = 0.0; _sEn = 0.0; _ns = 0
	t0 = Time.get_ticks_msec()
	_lastCk = Time.get_ticks_msec()

static func push(ms: float) -> void:
	if not on: return
	buf[n & (N - 1)] = ms
	n += 1
	if ms > 50: spikes += 1
	# her 4. karede bileşen örneği (ucuz)
	if (n & 3) == 0:
		_ns += 1
		_sCpu += Performance.get_monitor(Performance.TIME_PROCESS) * 1000.0
		if vp_rid.is_valid():
			_sRc += RenderingServer.viewport_get_measured_render_time_cpu(vp_rid)
			_sRg += RenderingServer.viewport_get_measured_render_time_gpu(vp_rid)
		if _g and _g.enemies: _sEn += _g.enemies.pool.active.size()
	# ara kayıt: donup kapanan koşu da rapora düşsün
	if _g and Time.get_ticks_msec() - _lastCk > 10000:
		_lastCk = Time.get_ticks_msec()
		_save_row(_g, "(sürüyor)", true)

static func end(g, result: String):
	if not on: return null
	on = false
	return _save_row(g, result, false)

static func _save_row(g, result: String, provisional: bool):
	var c := mini(n, N)
	if c < 120: return null
	var s := buf.slice(0, c)
	s.sort()
	var q := func(p: float) -> float: return s[mini(c - 1, int(floor(c * p)))]
	var now := Time.get_datetime_string_from_system(false, true).substr(0, 16)
	var row := {
		"d": now, "m": str(JS.i(g.worldId)) + "-" + str(JS.i(g.missionId)), "r": result,
		"p50": snappedf(q.call(0.5), 0.1), "p95": snappedf(q.call(0.95), 0.1), "p99": snappedf(q.call(0.99), 0.1),
		"sp": spikes, "f": c, "sec": JS.round_js((Time.get_ticks_msec() - t0) / 1000.0),
		"tier": Quality.tier, "sc": snappedf(Quality.scale, 0.01), "st": snappedf(Quality.stress, 0.01),
		"cpu": snappedf(_sCpu / maxf(1, _ns), 0.1), "rc": snappedf(_sRc / maxf(1, _ns), 0.1),
		"rg": snappedf(_sRg / maxf(1, _ns), 0.1), "en": JS.round_js(_sEn / maxf(1, _ns)),
		"pv": provisional,
	}
	var list := read()
	if list.size() and bool(list[0].get("pv", false)): list.remove_at(0)   # önceki ara kaydın yerine
	list.push_front(row)
	if list.size() > 30: list.resize(30)
	Store.set_item(KEY, JSON.stringify(list))
	return row

static func read() -> Array:
	var a = JSON.parse_string(Store.get_item(KEY, "[]"))
	return a if a is Array else []

static func text() -> String:
	var L := read()
	var hdr := "Shadowrend perf · " + OS.get_name() + " " + OS.get_model_name() + " · açılış ms " + ",".join(boot_list().map(func(x): return str(x)))
	var lines := [hdr, "tarih | görev | sonuç | p50 | p95 | p99 | >50ms | kare | sn | kademe | ölçek | stres | betik ms | çizimCPU ms | GPU ms | düşman"]
	for r in L:
		lines.append(" | ".join([r.d, r.m, r.r, r.p50, r.p95, r.p99, r.sp, r.f, r.sec, r.tier, r.sc, r.st, r.get("cpu", "-"), r.get("rc", "-"), r.get("rg", "-"), r.get("en", "-")].map(func(x): return JS.s(x))))
	return "\n".join(lines)

static func boot(ms: float) -> void:
	var L = JSON.parse_string(Store.get_item("kh_boot_v1", "[]"))
	if not (L is Array): L = []
	L.push_front(JS.round_js(ms))
	if L.size() > 10: L.resize(10)
	Store.set_item("kh_boot_v1", JSON.stringify(L))

static func boot_list() -> Array:
	var L = JSON.parse_string(Store.get_item("kh_boot_v1", "[]"))
	return L if L is Array else []

# ═══════════ ErrLog ═══════════
const ERR_KEY := "kh_errlog_v1"
const ERR_MAX := 20
static var _l = null
static var _lastSig := ""
static var _lastT := 0.0
static var err_ctx = null

static func err_read() -> Array:
	if _l != null: return _l
	var v = JSON.parse_string(Store.get_item(ERR_KEY, "[]"))
	_l = v if v is Array else []
	return _l

static func err_push(msg: String, src: String = "", stack: String = "") -> void:
	var L := err_read()
	var now := Time.get_unix_time_from_system() * 1000.0
	var sig := msg.substr(0, 160) + "|" + src
	if sig == _lastSig and now - _lastT < 1000 and L.size():
		L[0].n = JS.i(L[0].get("n", 1)) + 1
		_lastT = now
		Store.set_item(ERR_KEY, JSON.stringify(L))
		return
	_lastSig = sig
	_lastT = now
	var g = err_ctx
	var st := ""
	if g: st = str(g.state) + ((" D" + str(g.worldId) + "-" + str(g.missionId) + " w" + str(g.wave)) if g.worldId else "")
	L.push_front({"t": now, "m": msg.substr(0, 240), "s": src.right(120), "k": stack.substr(0, 480), "st": st, "n": 1})
	if L.size() > ERR_MAX: L.resize(ERR_MAX)
	Store.set_item(ERR_KEY, JSON.stringify(L))

static func err_clear() -> void:
	_l = []
	Store.set_item(ERR_KEY, "[]")

static func err_text() -> String:
	var L := err_read()
	var head := "Shadowrend hata kaydı · " + Time.get_datetime_string_from_system(true) + " · " + OS.get_name() + " " + OS.get_model_name()
	if L.is_empty(): return head + "\n(kayıt yok)"
	var out := [head]
	for r in L:
		out.append(Time.get_datetime_string_from_unix_time(int(r.t / 1000.0)) + " [" + str(r.st) + "]" + (" ×" + str(r.n) if JS.i(r.n) > 1 else "") + "\n  " + str(r.m) + (" @ " + str(r.s) if r.s else "") + ("\n  " + str(r.k) if r.k else ""))
	return "\n".join(out)
