extends Node
## Quality — perf.js'in uyarlanır kalite çekirdeği (birebir).
## Kademe sabittir (low/mid/high); dinamik çözünürlük (scale) ve efekt
## bütçesi (stress) KARE SÜRESİNE göre canlı ayarlanır. Aşağı inmek hızlı,
## yukarı çıkmak yavaş (pompalama yok). Duraklama kareleri ölçüm değildir.

signal changed

const BUDGETS := {
	"low":  {"particles": 220, "modelEnemies": 18, "enemies": 130, "atmo": 40,  "impacts": 14, "props": 66, "dpr": 2.0,  "tex": 512,  "texHero": 768},
	"mid":  {"particles": 450, "modelEnemies": 34, "enemies": 240, "atmo": 70,  "impacts": 22, "props": 72, "dpr": 2.6, "tex": 512,  "texHero": 1024},
	"high": {"particles": 700, "modelEnemies": 52, "enemies": 460, "atmo": 110, "impacts": 30, "props": 78, "dpr": 3.0,  "tex": 1024, "texHero": 1536},
}
const FLEX := {"particles": 0.45, "modelEnemies": 0.25, "enemies": 0.15, "atmo": 0.6, "impacts": 0.30, "props": 0.0, "dpr": 0.0, "tex": 0.0, "texHero": 0.0}
const STALL_MS := 120.0

var tier := "mid"
var is_mobile := false
var scale := 1.0
var stress := 0.0
var floor_scale := 0.6
var target_ms := 16.7
var cap_fps := 0
var frame_ms := 16.7
var spike_ms := 16.7
var spikes := 0.0
var fps := 60.0

var _down := 0.0
var _up := 0.0
var _stall_at := 0.0
var _scale_at := 0.0

func _now_ms() -> float:
	return Time.get_ticks_usec() / 1000.0

func init(t: String, mobile: bool) -> void:
	tier = t if BUDGETS.has(t) else "mid"
	is_mobile = mobile
	# net görüntü öncelikli: önce efekt bütçesi kısılır, çözünürlük en çok %78'e iner (eskiden %58 —
	# karakterler pikselli/bulanık görünüyordu)
	floor_scale = 0.78 if mobile else 0.8
	# Mobilde 60'a sabit (sim 60 Hz; 120 Hz'de fazla kare yalnız ısı üretir).
	cap_fps = 60 if mobile else 0
	_apply_cap()

func _apply_cap() -> void:
	Engine.max_fps = cap_fps

func budget(key: String) -> int:
	var b = BUDGETS[tier].get(key)
	if b == null: return 0
	var flex: float = FLEX.get(key, 0.0)
	return maxi(1, int(JS.round_js(float(b) * (1.0 - stress * flex))))

func budget_raw(key: String):
	return BUDGETS[tier].get(key)

## Ham DPR tavanı (cihaz ölçeğiyle sınırlı) × dinamik ölçek.
func dpr() -> float:
	# Web'deki DPR tavanı = ekranın gerçek piksel yoğunluğunun tavanı.
	var cap := minf(_device_ratio(), float(BUDGETS[tier].dpr))
	return maxf(0.5, cap * scale)

## Cihazın "CSS pikseli → fiziksel piksel" oranı. Tasarım çözünürlüğü
## 390 genişliktir (web görünümüyle aynı); pencere genişliği / 390.
func _device_ratio() -> float:
	var s := DisplayServer.window_get_size()
	# canvas_items/expand esnemesinin ölçeği: min(W/390, H/844)
	return maxf(1.0, minf(s.x / 390.0, s.y / 844.0))

func sample(dt_ms: float, active: bool) -> bool:
	if not (dt_ms > 0) or dt_ms >= STALL_MS:
		_down = 0
		_stall_at = _now_ms()
		return false
	if _stall_at > 0 and _now_ms() - _stall_at < 250: return false
	frame_ms += (dt_ms - frame_ms) * 0.09
	fps = 1000.0 / frame_ms
	spike_ms = dt_ms if dt_ms > spike_ms else spike_ms * 0.965 + dt_ms * 0.035
	var spike_limit := target_ms * 2.2
	var dt := dt_ms / 1000.0
	spikes = maxf(0.0, spikes - dt * 0.8)
	if dt_ms > spike_limit: spikes += 1
	if not active:
		_down = 0; _up = 0
		return false
	var bad := target_ms * 1.18
	var good := target_ms * 1.04
	if frame_ms > bad:
		_up = 0
		_down += dt
		if _down > 0.45:
			_down = 0
			return _step_down()
		return false
	if spikes >= 3:
		spikes = 0
		if stress < 1:
			stress = minf(1.0, stress + 0.34)
			_emit()
			return true
		return false
	if frame_ms < good:
		_down = 0
		_up += dt
		if _up > 2.5:
			_up = 0
			return _step_up()
		return false
	_down = 0; _up = 0
	return false

func _step_down() -> bool:
	# önce efekt yoğunluğu (parçacık/atmosfer/model sayısı), sonra çözünürlük
	if stress < 1:
		stress = minf(1.0, stress + 0.34)
		_emit()
		return true
	var now := _now_ms()
	if scale > floor_scale and now - _scale_at > 3000:
		_scale_at = now
		scale = maxf(floor_scale, JS.round_js((scale - 0.1) * 10) / 10.0)
		_emit()
		return true
	return false

func _step_up() -> bool:
	# geri dönüşte önce netlik
	if scale < 1:
		var now := _now_ms()
		if now - _scale_at >= 8000:
			_scale_at = now
			scale = minf(1.0, JS.round_js((scale + 0.1) * 10) / 10.0)
			_emit()
			return true
	if stress > 0:
		stress = maxf(0.0, stress - 0.34)
		_emit()
		return true
	return false

func reset() -> void:
	frame_ms = target_ms
	spike_ms = target_ms
	spikes = 0
	_down = 0
	_up = 0
	_stall_at = _now_ms()

func _emit() -> void:
	changed.emit()

# ═══════════ Haptik ═══════════
const HAPTIC := {"hit": 8, "crit": 18, "hurt": 26, "death": 45, "ui": 6}
var haptics_enabled := true
var haptics_k := 1.0
var _h_last := 0.0

func haptic(kind: String) -> void:
	# oyunda titreşim yok (tasarım kararı): telefon hiçbir olayda titremez
	if true: return
	if not haptics_enabled: return
	var now := _now_ms()
	if now - _h_last < 55: return
	_h_last = now
	var v: int = HAPTIC.get(kind, 10)
	if haptics_k != 1.0: v = maxi(4, int(JS.round_js(v * haptics_k)))
	if OS.has_feature("mobile"):
		Input.vibrate_handheld(v)
