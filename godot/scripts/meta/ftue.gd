class_name Ftue
## ftue.js — İlk 10 dakika: sekme kilidi (v73'te tümü açık) + savaş koçu.
## Plakanın görünüşü UI'da (ui.ftue_show).

const TAB_REQ := {"magaza": 0, "cephane": 0, "kahraman": 0, "etkinlik": 0}
const TAB_NAME := {"cephane": "KUŞANIM", "kahraman": "KAHRAMAN", "etkinlik": "ETKİNLİK"}
const TEXTS := {
	"move":  ["İLK ADIM", "EKRANI SÜRÜKLE, HAREKET ET"],
	"auto":  ["SALDIRI OTOMATİK", "SEN YALNIZ YÖNÜ SEÇ · SÜRÜYÜ KES"],
	"level": ["SEVİYE ATLADIN", "BİR RÜN SEÇ · HER SEVİYE GÜÇLENDİRİR"],
	"chest": ["İPUCU", "GÜMÜŞ SANDIKLARA YÜRÜ · KENDİLİĞİNDEN AÇILIR"],
}

static var step := ""
static var _d := 0.0
static var _px := 0.0
static var _py := 0.0
static var _k0 := 0
static var _t := 0.0
static var _game = null
static var _hide_at := -1.0

static func cleared(g) -> int:
	var n := 0
	for k in g.progress: n += JS.i(g.progress[k])
	return n

static func locked(g, page: String) -> bool:
	return TAB_REQ.get(page, 0) > cleared(g)

static func lock_msg(page: String) -> String:
	return TAB_NAME.get(page, page) + " · " + str(TAB_REQ.get(page, 0)) + ". GÖREVİ BİTİRİNCE AÇILIR"

static func is_fresh(g, page: String) -> bool:
	if not TAB_REQ.has(page) or not TAB_REQ[page]: return false
	var seen: Dictionary = g.meta.get("ftueSeen", {})
	var c := cleared(g)
	return TAB_REQ[page] <= c and not seen.get(page) and c <= 6

static func visit(g, page: String) -> void:
	if not TAB_REQ.has(page): return
	if not (g.meta.get("ftueSeen") is Dictionary): g.meta["ftueSeen"] = {}
	if not g.meta.ftueSeen.get(page):
		g.meta.ftueSeen[page] = 1
		g.save_meta()

static func begin(g) -> void:
	_game = g
	step = ""
	# eğitim (savaş koçu) kapalı: oyun hiçbir koşulda ilk adım plakalarıyla açılmaz
	if not g.meta.get("ftue"):
		g.meta["ftue"] = 1
		g.save_meta()
	if g.meta.get("ftue") or g.towerRun or g.sealRun or cleared(g) > 0 or g.worldId != 1 or g.missionId != 1:
		show("")
		return
	step = "move"
	_d = 0; _t = 0
	_px = g.player.x; _py = g.player.y; _k0 = g.kills
	show("move")

## web'deki setTimeout(4200) gizlemesinin karşılığı (oyun döngüsü her adım çağırır)
static func poll(g) -> void:
	if _hide_at >= 0 and g.time >= _hide_at:
		_hide_at = -1
		if step == "done": show("")

static func update(g, dt: float) -> void:
	if step == "" or step == "level" or step == "done": return
	_t += dt
	var p = g.player
	if step == "move":
		var st := JS.hypot(p.x - _px, p.y - _py)
		if st < 60: _d += st
		_px = p.x; _py = p.y
		if _d > 260:
			step = "auto"
			_k0 = g.kills
			show("auto")
	elif step == "auto":
		if g.kills - _k0 >= 6 or _t > 40:
			step = "wait"
			show("")

static func on_level_up(_g) -> void:
	if step != "wait" and step != "auto": return
	step = "level"
	show("level")

static func on_level_picked(g) -> void:
	if step != "level": return
	step = "done"
	show("chest")
	# web: setTimeout(4200) — seçimden sonra oyun akar, oyun saati gerçek zamanla aynı hızda
	_hide_at = g.time + 4.2

static func finish(g) -> void:
	if step != "":
		g.meta["ftue"] = 1
		g.save_meta()
	step = ""
	show("")

static func show(kind: String) -> void:
	if _game and _game.ui: _game.ui.ftue_show(kind, TEXTS.get(kind))
