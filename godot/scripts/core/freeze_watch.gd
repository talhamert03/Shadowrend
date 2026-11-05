class_name FreezeWatch
extends RefCounted
## Donma bekçisi: ayrı bir iş parçacığı ana döngünün nabzını izler. Ana döngü 2,5 sn'den uzun
## durursa o an ne yaptığını (Prof.cur aşaması + oyun durumu) user://freeze_last.txt'e yazar;
## donma sürerse süreyi günceller. Uygulama yeniden açılınca kayıt hata kaydına "DONMA" olarak
## düşer (Ayarlar → Gelişmiş → Hata kaydı → Kopyala). Cihazda donmanın nedenini görmenin yolu.

const PATH := "user://freeze_last.txt"
const STALL_MS := 2500

static var _thread: Thread
static var _beat := 0                 # ana döngünün son nabzı (ms)
static var _ctx := ""                 # son oyun durumu özeti (ana döngü yazar)
static var _paused := false           # arka planda / reklam açıkken izleme yok
static var _run := false
static var _mx := Mutex.new()

static func start() -> void:
	_report_previous()
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
			var f := FileAccess.open(PATH, FileAccess.WRITE)
			if f:
				f.store_string("DONMA " + str(int((now - since) / 100.0) / 10.0) + " sn · aşama: " + Prof.cur + " · " + c)
				f.close()
		elif reported:
			# donma çözüldü: süre son haliyle kalır, yeni donma yeni kayıt
			reported = false

static func _report_previous() -> void:
	if not FileAccess.file_exists(PATH): return
	var f := FileAccess.open(PATH, FileAccess.READ)
	if f:
		var t := f.get_as_text()
		f.close()
		if t.strip_edges() != "": PerfLog.err_push(t.substr(0, 230), "freeze_watch")
	DirAccess.remove_absolute(ProjectSettings.globalize_path(PATH))
