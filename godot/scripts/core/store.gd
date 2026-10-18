extends Node
## Store — web oyununun localStorage + vault.js katmanının yerel karşılığı.
##
## Web'de ~40 okuma/yazma noktası doğrudan `localStorage` kullanıyordu ve
## vault.js onu sarıyordu: korunan `kh_*` anahtarlarına cihaz tuzlu bir imza
## yazılır, imza tutmazsa son iyi kopyaya (ayna) dönülür. Burada:
##   • asıl depo  user://kv.json      (anahtar → dize, imzalar dahil)
##   • ayna       user://kv_mirror.json (son iyi korunan değerler)
## Yazımlar 400 ms toplu diske iner (vault.scheduleFlush ile aynı süre);
## uygulama arka plana geçince/kapanınca ANINDA yazılır.
## Değerler web ile AYNI biçimde (JSON dizgesi) saklanır — kayıt göçü ve
## bulut kaydı (backend snapshot) aynı veriyi okur.

const SECRET := "sr·v44·c0r-ash-moon"
const SIG := "\u0001s:"
const DID := "kh_did"
const PATH := "user://kv.json"
const MIRROR := "user://kv_mirror.json"

var _kv := {}
var _mirror := {}
var _salt := ""
var _dirty := false
var _flush_t := -1.0
var _re := RegEx.new()
var tampered: Array = []
var restored := 0

func _init() -> void:
	_re.compile("^kh_(meta|rubies|bloodstone|chests|freechest|vicchest|adchest|progress|clock|age|consent|deal|firstbuy|best_|boss_down|settings|notif)")
	_kv = _read_json(PATH)
	_mirror = _read_json(MIRROR)
	_salt = str(_kv.get(DID, ""))
	if _salt == "":
		_salt = _uuid()
		_kv[DID] = _salt
	var migrated := str(_kv.get("kh_vault_v", "")) == "1"
	for k in _kv.keys():
		if not (k is String) or not _protect(k): continue
		var v: String = str(_kv[k])
		var ok: bool = _kv.get(SIG + k) == _sign(k, v)
		if not migrated or ok:
			_mirror[k] = v
			if not ok: _kv[SIG + k] = _sign(k, v)
	for k in _mirror.keys():
		if not _kv.has(k):
			_kv[k] = _mirror[k]
			_kv[SIG + k] = _sign(k, _mirror[k])
			restored += 1
	_kv["kh_vault_v"] = "1"
	flush()

func _ready() -> void:
	process_mode = Node.PROCESS_MODE_ALWAYS
	get_tree().auto_accept_quit = true

func _notification(what: int) -> void:
	if what == NOTIFICATION_APPLICATION_PAUSED or what == NOTIFICATION_WM_CLOSE_REQUEST \
			or what == NOTIFICATION_APPLICATION_FOCUS_OUT or what == NOTIFICATION_PREDELETE:
		flush()

func _process(_dt: float) -> void:
	if _dirty and _flush_t >= 0 and Time.get_ticks_msec() / 1000.0 >= _flush_t:
		flush()

func _protect(k: String) -> bool:
	return _re.search(k) != null

func _sign(k: String, v: String) -> String:
	return cyrb53(k + "|" + v + "|" + SECRET, _salt.length()) + cyrb53(v + _salt + k, 7)

## localStorage.getItem — yoksa `def` (web'de null).
func get_item(k: String, def = null):
	if not _kv.has(k):
		if _protect(k) and _mirror.has(k): return _mirror[k]
		return def
	var v: String = str(_kv[k])
	if not _protect(k): return v
	if _kv.get(SIG + k) == _sign(k, v): return v
	if not tampered.has(k): tampered.append(k)
	var good = _mirror.get(k)
	if good == null:
		_kv.erase(k); _kv.erase(SIG + k)
	else:
		_kv[k] = good; _kv[SIG + k] = _sign(k, good)
	_schedule()
	return good if good != null else def

## kayıt değişim sayacı — sayfalar veri değişmediyse yeniden kurulmaz
var rev := 0

func set_item(k: String, v) -> void:
	rev += 1
	var s := JS.s(v) if (v is float or v is int) else str(v)
	_kv[k] = s
	if _protect(k):
		_kv[SIG + k] = _sign(k, s)
		_mirror[k] = s
	_schedule()

func remove_item(k: String) -> void:
	rev += 1
	_kv.erase(k)
	if _protect(k):
		_kv.erase(SIG + k)
		_mirror.erase(k)
	_schedule()

func has(k: String) -> bool:
	return _kv.has(k)

func keys() -> Array:
	var out := []
	for k in _kv.keys():
		if k is String and not k.begins_with(SIG): out.append(k)
	return out

func _schedule() -> void:
	_dirty = true
	if _flush_t < 0:
		_flush_t = Time.get_ticks_msec() / 1000.0 + 0.4

## vault.flushVault eşdeğeri — hemen diske yaz (atomik: geçici dosya + yeniden adlandırma).
func flush() -> void:
	_flush_t = -1.0
	_dirty = false
	_write_json(PATH, _kv)
	_write_json(MIRROR, _mirror)

func player_id() -> String:
	return "SR-" + cyrb53(_salt).to_upper().substr(0, 8)

# ── dosya ──

func _read_json(p: String) -> Dictionary:
	if not FileAccess.file_exists(p):
		if FileAccess.file_exists(p + ".tmp"):
			p = p + ".tmp"
		else:
			return {}
	var txt := FileAccess.get_file_as_string(p)
	var v = JSON.parse_string(txt)
	return v if v is Dictionary else {}

func _write_json(p: String, d: Dictionary) -> void:
	var tmp := p + ".tmp"
	var f := FileAccess.open(tmp, FileAccess.WRITE)
	if f == null: return
	f.store_string(JSON.stringify(d))
	f.close()
	var dir := DirAccess.open("user://")
	if dir:
		dir.rename(tmp.replace("user://", ""), p.replace("user://", ""))

static func _uuid() -> String:
	var b := PackedByteArray()
	for i in 16: b.append(randi() % 256)
	return b.hex_encode()

# ── cyrb53 (vault.js ile BİT BİT aynı; Math.imul 32 bit) ──

static func _imul(a: int, b: int) -> int:
	a &= 0xffffffff
	b &= 0xffffffff
	var lo := (a * (b & 0xffff)) & 0xffffffff
	var hi := ((a * (b >> 16)) & 0xffff) << 16
	return (lo + hi) & 0xffffffff

static func cyrb53(s: String, seed: int = 0) -> String:
	var h1 := (0xdeadbeef ^ seed) & 0xffffffff
	var h2 := (0x41c6ce57 ^ seed) & 0xffffffff
	var u := s.to_utf16_buffer()
	var n := u.size() / 2
	for i in n:
		var ch := u[i * 2] | (u[i * 2 + 1] << 8)
		h1 = _imul(h1 ^ ch, 2654435761)
		h2 = _imul(h2 ^ ch, 1597334677)
	h1 = _imul(h1 ^ (h1 >> 16), 2246822507) ^ _imul(h2 ^ (h2 >> 13), 3266489909)
	h1 &= 0xffffffff
	h2 = _imul(h2 ^ (h2 >> 16), 2246822507) ^ _imul(h1 ^ (h1 >> 13), 3266489909)
	h2 &= 0xffffffff
	var v := 4294967296 * (2097151 & h2) + h1
	return _b36(v)

static func _b36(v: int) -> String:
	if v == 0: return "0"
	var digits := "0123456789abcdefghijklmnopqrstuvwxyz"
	var out := ""
	while v > 0:
		out = digits[v % 36] + out
		v /= 36
	return out
