class_name Cloud
extends Node
## Google Play Games girişi + bulut kaydı (ShadowGames eklentisi). Oyuncu Google hesabıyla girer;
## tüm ilerleme (Store'daki kh_* anahtarları) Play'in Kayıtlı Oyunlar alanına yazılır.
## Yeni cihazda / yeniden kurulumda: buluttaki kayıt daha ilerideyse ve yerel ilerleme yeni
## başlamışsa otomatik geri yüklenir; değilse Ayarlar'da "BULUTTAN YÜKLE" seçeneği çıkar.
## Kimlik (AdIds.GAMES_PROJECT_ID) boşsa ya da eklenti yoksa tamamen sessiz kalır.

var g
var _p: Object = null
var signed := false
var player_name := ""
var cloud_level := -1        # buluttaki kaydın hesap seviyesi (-1: bilinmiyor)
var _cloud_blob := ""
var _rev0 := -1
var _upT := 0.0
var _busy := false

func _init(game) -> void:
	g = game
	name = "Cloud"
	process_mode = Node.PROCESS_MODE_ALWAYS

func available() -> bool: return _p != null

func _ready() -> void:
	if AdIds.GAMES_PROJECT_ID == "" or not Engine.has_singleton("ShadowGames"): return
	_p = Engine.get_singleton("ShadowGames")
	_p.connect("signed_in", _on_signed)
	_p.connect("cloud_loaded", _on_loaded)
	_p.connect("cloud_saved", _on_saved)
	_p.call("init")

func sign_in() -> void:
	if _p: _p.call("sign_in")

func _on_signed(ok: bool, _pid: String, nm: String) -> void:
	signed = ok
	player_name = nm
	if ok:
		_p.call("load_cloud")
	if g.ui and g.ui.settings and g.ui.settings.visible and g.ui.settings.has_method("_build_keep"): g.ui.settings._build_keep()

## yerel kayıt → JSON (cihaz kimliği ve imzalar hariç)
func _blob() -> String:
	var kv := {}
	for k in Store.keys():
		var ks := String(k)
		if ks.begins_with("kh_") and ks != Store.DID:
			kv[ks] = Store.get_item(ks)
	return JSON.stringify({"v": 1, "ts": Time.get_unix_time_from_system(), "lv": g.account_level(), "kv": kv})

func _on_loaded(ok: bool, data: String) -> void:
	if not ok: return
	if data == "":
		upload()
		return
	var d = JSON.parse_string(data)
	if not (d is Dictionary) or not (d.get("kv") is Dictionary): return
	_cloud_blob = data
	cloud_level = int(d.get("lv", 0))
	var local: int = g.account_level()
	if cloud_level > local:
		# yeni kurulum / yeni cihaz: hiç ilerleme yoksa sormadan geri yükle
		if local <= 2: restore()
		elif g.ui: g.ui.toast("BULUTTA DAHA İLERİ BİR KAYIT VAR · AYARLAR > HESAP")
	else:
		upload()

## buluttaki kaydı uygula ve oyunu yeniden başlat
func restore() -> void:
	var d = JSON.parse_string(_cloud_blob)
	if not (d is Dictionary): return
	for k in Store.keys():
		if String(k).begins_with("kh_") and String(k) != Store.DID: Store.remove_item(k)
	for k in d.kv:
		Store.set_item(String(k), d.kv[k])
	Store.flush()
	get_tree().reload_current_scene()

func upload() -> void:
	if not _p or not signed or _busy: return
	# bulutta daha ileri bir kayıt varken üstüne yazma (oyuncu önce seçsin)
	if cloud_level > g.account_level(): return
	_busy = true
	_rev0 = Store.rev
	_p.call("save_cloud", _blob(), "Hesap seviyesi " + str(g.account_level()))

func _on_saved(ok: bool) -> void:
	_busy = false
	if ok: cloud_level = maxi(cloud_level, g.account_level())

## değişiklik olunca en geç 45 sn'de bir yükle; uygulama arka plana geçince hemen
func _process(dt: float) -> void:
	if not _p or not signed: return
	_upT += dt
	if _upT >= 45.0:
		_upT = 0.0
		if Store.rev != _rev0: upload()

func _notification(what: int) -> void:
	if what == NOTIFICATION_APPLICATION_PAUSED and _p and signed and Store.rev != _rev0: upload()
