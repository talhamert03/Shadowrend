class_name FreezeWatch
extends RefCounted
## Donma bekçisi: ayrı bir iş parçacığı ana döngünün nabzını izler. Ana döngü 2,5 sn'den uzun
## durursa o an ne yaptığını (Prof.cur aşaması + oyun durumu + Android'de Godot iş parçacığının
## Java yığını) kaydeder. Kayıtlar hem bu oturumun listesine (TANI RAPORU'nda anında görünür) hem
## user://freeze_last.txt'e yazılır; uygulama kapanıp açılınca eski oturumunkiler hata kaydına
## "DONMA" olarak düşer. Android arayüz iş parçacığı donmaları (dokunmalar işlenmez ama oyun
## çizilir) ShadowAds eklentisindeki ayrı bekçiden gelir: ui_stalls().

const PATH := "user://freeze_last.txt"
const STALL_MS := 2500

static var _thread: Thread
static var _beat := 0                 # ana döngünün son nabzı (ms)
static var _ctx := ""                 # son oyun durumu özeti (ana döngü yazar)
static var _paused := false           # arka planda / reklam açıkken izleme yok
static var _run := false
static var _mx := Mutex.new()
static var _session: Array[String] = []   # bu oturumdaki donmalar
static var _jv: Object = null              # ShadowAds (Android) — yığın ve UI bekçisi

static func start() -> void:
	_report_previous()
	if Engine.has_singleton("ShadowAds"):
		_jv = Engine.get_singleton("ShadowAds")
		if _jv.has_method("mark_godot_thread"): _jv.mark_godot_thread()
		else: _jv = null
	if _thread != null: return
	_beat = Time.get_ticks_msec()
	_run = true
	_thread = Thread.new()
	_thread.start(_loop, Thread.PRIORITY_LOW)

## ana döngü her kare çağırır
static func beat(ctx_fn: Callable = Callable(), every_ms := 500) -> void:
	var now := Time.get_ticks_msec()
	if ctx_fn.is_valid() and now - _beat > 0 and (now / every_ms) != (_beat / every_ms):
		var c: String = ctx_fn.call()
		_mx.lock(); _ctx = c; _mx.unlock()
	_beat = now

static func stop() -> void:
	_run = false
	if _thread != null and _thread.is_started(): _thread.wait_to_finish()
	_thread = null

static func set_paused(p: bool) -> void:
	_paused = p
	_beat = Time.get_ticks_msec()

static func _loop() -> void:
	var reported := false
	var since := 0
	var head := ""
	while _run:
		OS.delay_msec(250)
		if _paused:
			reported = false
			continue
		var now := Time.get_ticks_msec()
		var gap := now - _beat
		if gap >= STALL_MS:
			if not reported:
				reported = true
				since = _beat
				_mx.lock(); var c := _ctx; _mx.unlock()
				var jst := ""
				if _jv: jst = " · java: " + str(_jv.godot_stack())
				head = Time.get_datetime_string_from_system().substr(11) + " · aşama: " + Prof.cur + " · " + (c if c != "" else "açılış/menü") + jst
			var rec := "DONMA " + str(int((now - since) / 100.0) / 10.0) + " sn · " + head
			_mx.lock()
			if _session.size() and _session[-1].ends_with(head): _session[-1] = rec
			else:
				_session.append(rec)
				if _session.size() > 12: _session.remove_at(0)
			_mx.unlock()
			var f := FileAccess.open(PATH, FileAccess.WRITE)
			if f:
				f.store_string(session_text())
				f.close()
		elif reported:
			# donma çözüldü: süre son haliyle kalır, yeni donma yeni kayıt
			reported = false

## bu oturumun donmaları + Android UI iş parçacığı donmaları (TANI RAPORU)
static func session_text() -> String:
	_mx.lock(); var s := "\n".join(_session); _mx.unlock()
	return s

static func ui_text() -> String:
	if _jv and _jv.has_method("ui_stalls"): return str(_jv.ui_stalls())
	return ""

static func report() -> String:
	var a := session_text()
	var u := ui_text()
	var t := "Bellek: " + str(int(OS.get_static_memory_usage() / 1048576.0)) + " MB · görüntü belleği " + str(int(Performance.get_monitor(Performance.RENDER_VIDEO_MEM_USED) / 1048576.0)) + " MB\n"
	t += "Bu oturumdaki donmalar:\n" + (a if a != "" else "(yok)")
	t += "\nArayüz (dokunma) donmaları:\n" + (u if u != "" else ("(yok)" if _jv else "(yalnız Android)"))
	return t

static func _report_previous() -> void:
	if not FileAccess.file_exists(PATH): return
	var f := FileAccess.open(PATH, FileAccess.READ)
	if f:
		var t := f.get_as_text()
		f.close()
		for line in t.split("\n", false):
			if line.strip_edges() == "": continue
			var parts := line.split(" · java: ", true, 1)
			PerfLog.err_push(parts[0].substr(0, 240), "freeze_watch", parts[1] if parts.size() > 1 else "")
	DirAccess.remove_absolute(ProjectSettings.globalize_path(PATH))
