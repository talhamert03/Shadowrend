class_name UITex
## Arayüz dokuları için kalıcı önbellek + arka plan yükleyici.
##   • get(yol): önbellekte varsa anında; arka planda yükleniyorsa onu bekler; yoksa eşzamanlı yükler
##   • request(yollar): dokular iş parçacığında çözülür (WebP çözme ana iş parçacığını kilitlemez)
##   • poll(): biten yüklemeleri önbelleğe alır — her kare bir kez (UIPrewarm)
## Sayfa düğümleri bellekten atılsa da dokular bütçe (kademeye göre MB) dolana dek kalır;
## sayfa yeniden kurulurken disk + çözme maliyeti yoktur. En eski kullanılan önce düşer.

const BUDGET_MB := {"low": 120.0, "mid": 220.0, "high": 320.0}
const MAX_PENDING := 6

static var _cache := {}        # yol → Texture2D
static var _bytes := {}        # yol → tahmini bellek
static var _lru: Array = []    # en son kullanılan sonda
static var _total := 0.0
static var _queue: Array = []  # istenmiş, henüz başlatılmamış
static var _queued := {}
static var _pending := {}      # yol → true (load_threaded_request yapıldı)

# ── kullanım manifestosu: hangi sayfa hangi dokuları kullandı (bir sonraki açılışta ön yükleme) ──
const MAN_RES := "res://assets/ui/tex_manifest.json"
const MAN_USER := "user://tex_manifest.json"
static var rec := ""            # kayıt anahtarı (sayfa); boşsa kayıt yok
static var _man := {}           # anahtar → {yol: true}
static var _man_loaded := false
static var _man_dirty := false

static func _man_load() -> void:
	if _man_loaded: return
	_man_loaded = true
	for path in [MAN_RES, MAN_USER]:
		var f := FileAccess.open(path, FileAccess.READ)
		if f == null: continue
		var v = JSON.parse_string(f.get_as_text())
		if not (v is Dictionary): continue
		for k in v:
			if not (v[k] is Array): continue
			var d: Dictionary = _man.get(k, {})
			for p in v[k]: d[str(p)] = true
			_man[k] = d

## kaydedilmiş doku yolları (res://…) — "j:" önekliler katman JSON adlarıdır
static func manifest(key: String) -> Array:
	_man_load()
	return (_man.get(key, {}) as Dictionary).keys().filter(func(p): return not str(p).begins_with("j:"))

static func manifest_json(key: String) -> Array:
	_man_load()
	var out: Array = []
	for p in (_man.get(key, {}) as Dictionary).keys():
		if str(p).begins_with("j:"): out.append(str(p).substr(2))
	return out

static func note_json(name: String) -> void:
	if rec != "": _note("j:" + name)

## kaydı başlat (iç içe çağrıda dıştaki geçerli kalır); bitir → önceki anahtar
static func rec_begin(key: String) -> String:
	var prev := rec
	if prev == "": rec = key
	return prev

static func rec_end(prev: String) -> void:
	rec = prev

static func save_manifest() -> void:
	if not _man_dirty: return
	_man_dirty = false
	var out := {}
	for k in _man: out[k] = (_man[k] as Dictionary).keys()
	var f := FileAccess.open(MAN_USER, FileAccess.WRITE)
	if f: f.store_string(JSON.stringify(out))

static func _note(path: String) -> void:
	if rec == "": return
	_man_load()
	var d: Dictionary = _man.get(rec, {})
	if d.has(path): return
	d[path] = true
	_man[rec] = d
	_man_dirty = true

static func has(path: String) -> bool:
	return _cache.has(path)

static func get_tex(path: String) -> Texture2D:
	_note(path)
	if _cache.has(path):
		_touch(path)
		return _cache[path]
	var tx: Texture2D = null
	if _pending.has(path):
		_pending.erase(path)
		tx = ResourceLoader.load_threaded_get(path) as Texture2D
	else:
		if not ResourceLoader.exists(path): return null
		tx = load(path) as Texture2D
	if tx: _put(path, tx)
	return tx

## önde gelenler önce yüklenir (front=true: sıranın başına)
static func request(paths: Array, front := false) -> void:
	var add: Array = []
	for p in paths:
		var s := str(p)
		if _cache.has(s) or _pending.has(s) or _queued.has(s): continue
		_queued[s] = true
		add.append(s)
	if front: _queue = add + _queue
	else: _queue.append_array(add)

static func busy() -> bool:
	return not _queue.is_empty() or not _pending.is_empty()

static func poll() -> void:
	for p in _pending.keys():
		var st := ResourceLoader.load_threaded_get_status(p)
		if st == ResourceLoader.THREAD_LOAD_IN_PROGRESS: continue
		_pending.erase(p)
		if st == ResourceLoader.THREAD_LOAD_LOADED:
			var tx := ResourceLoader.load_threaded_get(p) as Texture2D
			if tx: _put(p, tx)
	while _pending.size() < MAX_PENDING and not _queue.is_empty():
		var p: String = _queue.pop_front()
		_queued.erase(p)
		if _cache.has(p): continue
		if ResourceLoader.has_cached(p):
			var tx := load(p) as Texture2D
			if tx: _put(p, tx)
			continue
		if not ResourceLoader.exists(p): continue
		if ResourceLoader.load_threaded_request(p, "Texture2D") == OK: _pending[p] = true

static func _touch(p: String) -> void:
	var i := _lru.find(p)
	if i >= 0 and i != _lru.size() - 1:
		_lru.remove_at(i)
		_lru.append(p)

static func _put(p: String, tx: Texture2D) -> void:
	if _cache.has(p):
		_touch(p)
		return
	var b := float(tx.get_width() * tx.get_height()) * 4.0 * 1.34
	_cache[p] = tx
	_bytes[p] = b
	_lru.append(p)
	_total += b
	var cap: float = float(BUDGET_MB.get(Quality.tier, 190.0)) * 1048576.0
	while _total > cap and _lru.size() > 1:
		var v: String = _lru.pop_front()
		_total -= float(_bytes.get(v, 0.0))
		_cache.erase(v)
		_bytes.erase(v)

static func mb() -> float:
	return _total / 1048576.0
