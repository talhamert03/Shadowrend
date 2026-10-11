extends Node
## Clock — clock.js'in güvenilir saati (birebir).
## ① Monoton oturum: uygulama açıkken zaman monoton saatle ilerler.
## ② Yüksek su işareti: saat geri alınırsa zaman işarette DURUR.
## ③ Sunucu saati: sürüm denetimi yanıtının Date başlığıyla sapma düzeltilir.

const KEY := "kh_clock"
const SKEW_OK := 2.0 * 60.0 * 1000.0

var offset := 0.0
var base := 0.0
var perf0 := 0.0
var hw := 0.0
var rolled_back := false
var _save_at := -1.0

func _perf() -> float:
	return Time.get_ticks_usec() / 1000.0

func _wall() -> float:
	return Time.get_unix_time_from_system() * 1000.0

func _read_hw() -> float:
	var v = Store.get_item(KEY)
	if v == null: return 0.0
	var f := str(v).to_float()
	return f if not is_nan(f) else 0.0

func _write_hw() -> void:
	Store.set_item(KEY, JS.s(floor(hw)))

func _anchor() -> void:
	var wall := _wall() + offset
	var cur := base + (_perf() - perf0) if base > 0 else 0.0
	if wall + 60000 < hw: rolled_back = true
	base = maxf(wall, maxf(hw, cur))
	perf0 = _perf()
	hw = base
	_write_hw()

func boot() -> void:
	hw = _read_hw()
	_anchor()

func _ready() -> void:
	process_mode = Node.PROCESS_MODE_ALWAYS

func _process(_dt: float) -> void:
	if _save_at >= 0 and _perf() >= _save_at:
		_save_at = -1.0
		_write_hw()

func _notification(what: int) -> void:
	if base <= 0: return
	if what == NOTIFICATION_APPLICATION_PAUSED or what == NOTIFICATION_APPLICATION_FOCUS_OUT:
		hw = maxf(hw, now())
		_write_hw()
	elif what == NOTIFICATION_APPLICATION_RESUMED or what == NOTIFICATION_APPLICATION_FOCUS_IN:
		_anchor()

func now() -> float:
	var t := base + (_perf() - perf0)
	if t > hw:
		hw = t
		if _save_at < 0: _save_at = _perf() + 15000.0
	return t

## Yerel tarih sözlüğü (year, month 1-12, day, weekday 0=Pazar, hour, minute, second).
func date(ms: float = -1.0) -> Dictionary:
	if ms < 0: ms = now()
	var bias: float = Time.get_time_zone_from_system().get("bias", 0) * 60.0
	return Time.get_datetime_dict_from_unix_time(int(floor(ms / 1000.0 + bias)))

## Sunucu yanıtının Date başlığıyla sapmayı düzelt (HTTP-date dizesi).
func sync_from_header(date_header: String) -> bool:
	if date_header == "": return false
	var srv := _parse_http_date(date_header)
	if srv <= 0: return false
	var skew := srv - _wall()
	offset = skew if absf(skew) > SKEW_OK else 0.0
	if offset != 0:
		var srv_now := _wall() + offset
		if hw > srv_now + SKEW_OK and hw - srv_now < 7 * 86400000.0: hw = srv_now
		base = 0
		_anchor()
	return true

func _parse_http_date(s: String) -> float:
	# "Sun, 06 Nov 1994 08:49:37 GMT"
	var months := ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
	var p := s.strip_edges().split(" ", false)
	if p.size() < 5: return 0.0
	var day := p[1].to_int()
	var mon := months.find(p[2]) + 1
	var year := p[3].to_int()
	var hms := p[4].split(":")
	if mon <= 0 or hms.size() < 3: return 0.0
	var d := {"year": year, "month": mon, "day": day, "hour": hms[0].to_int(), "minute": hms[1].to_int(), "second": hms[2].to_int()}
	return Time.get_unix_time_from_datetime_dict(d) * 1000.0
