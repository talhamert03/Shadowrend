class_name Ads
extends Node
## Ödüllü reklam yöneticisi. Android'de ShadowAds eklentisi (AdMob) ile gerçek reklam; eklenti
## yoksa (masaüstü / geliştirme) eski 3 sn'lik izleme ekranı (ScrAdWatch) simülasyonu.
##
## show(yerleşim, ödül) — reklam hazırsa hemen açılır; değilse yüklenir ve en çok LOAD_WAIT sn
## beklenir ("REKLAM YÜKLENİYOR"). Ödül YALNIZ reklam sonuna dek izlenip kapanınca verilir;
## yarıda kapatılır ya da gösterilemezse on_fail çağrılır. Reklam açıkken oyun sesi susar.
## Her gösterimden sonra aynı yerleşimin yeni reklamı arka planda yüklenir.

const LOAD_WAIT := 6.0

var g
var _p: Object = null           # Engine singleton "ShadowAds"
var _sdk_ok := false
var _cur := ""                  # gösterilen yerleşim
var _got := false               # ödül kazanıldı mı
var _on_reward := Callable()
var _on_fail := Callable()
var _wait := ""                 # yüklenmesi beklenen yerleşim
var _wait_t := 0.0
var _retry := {}                # yerleşim → yeniden deneme zamanı (sn)

func _init(game) -> void:
	g = game
	name = "Ads"
	process_mode = Node.PROCESS_MODE_ALWAYS

func _ready() -> void:
	if not Engine.has_singleton("ShadowAds"): return
	_p = Engine.get_singleton("ShadowAds")
	_p.connect("ready", _on_sdk_ready)
	_p.connect("loaded", _on_loaded)
	_p.connect("load_failed", _on_load_failed)
	_p.connect("rewarded", _on_rewarded)
	_p.connect("closed", _on_closed)
	_p.connect("show_failed", _on_show_failed)
	_p.init(AdIds.TEST, AdIds.TEST_DEVICE)

func available() -> bool:
	return _p != null

func _unit(pl: String) -> String:
	return AdIds.unit(pl)

func _on_sdk_ready() -> void:
	_sdk_ok = true
	for pl in AdIds.placements(): _p.load(_unit(pl))

func show(placement: String, on_reward: Callable, on_fail := Callable()) -> void:
	if _p == null:
		# geliştirme: simülasyon ekranı
		g.ui.adwatch.show_ad(3, on_reward)
		return
	if _cur != "" or _wait != "": return
	_on_reward = on_reward
	_on_fail = on_fail
	var u := _unit(placement)
	if _sdk_ok and _p.is_loaded(u):
		_open(placement)
		return
	_wait = placement
	_wait_t = 0.0
	g.ui.toast("REKLAM YÜKLENİYOR…")
	if _sdk_ok: _p.load(u)

func _open(placement: String) -> void:
	_cur = placement
	_got = false
	AudioServer.set_bus_mute(0, true)
	_p.show(_unit(placement))

func _process(dt: float) -> void:
	for k in _retry.keys():
		_retry[k] = float(_retry[k]) - dt
		if float(_retry[k]) <= 0.0:
			_retry.erase(k)
			if _sdk_ok: _p.load(_unit(k))
	if _wait == "": return
	_wait_t += dt
	if _sdk_ok and _p.is_loaded(_unit(_wait)):
		var pl := _wait
		_wait = ""
		_open(pl)
	elif _wait_t >= LOAD_WAIT:
		_wait = ""
		g.ui.toast("ŞU AN REKLAM YOK · BİRAZ SONRA DENE")
		_fail()

func _on_loaded(_unit_id: String) -> void:
	pass

func _on_load_failed(unit_id: String, err: String) -> void:
	push_warning("ShadowAds load_failed " + unit_id + " " + err)
	# test kimliklerinde tüm yerleşimler aynı birimi kullanır: bir kez yeniden dene
	for pl in AdIds.placements():
		if _unit(pl) == unit_id and not _retry.has(pl): _retry[pl] = 30.0

func _on_rewarded(_unit_id: String) -> void:
	_got = true

func _on_closed(_unit_id: String) -> void:
	AudioServer.set_bus_mute(0, false)
	var pl := _cur
	_cur = ""
	var cb := _on_reward if _got else _on_fail
	_on_reward = Callable()
	_on_fail = Callable()
	if _got:
		if cb.is_valid(): cb.call()
	else:
		g.ui.toast("ÖDÜL İÇİN REKLAMI SONUNA DEK İZLE")
		if cb.is_valid(): cb.call()
	if pl != "" and _sdk_ok: _p.load(_unit(pl))

func _on_show_failed(unit_id: String, err: String) -> void:
	push_warning("ShadowAds show_failed " + unit_id + " " + err)
	AudioServer.set_bus_mute(0, false)
	var pl := _cur
	_cur = ""
	g.ui.toast("REKLAM AÇILAMADI · BİRAZ SONRA DENE")
	_fail()
	if pl != "" and _sdk_ok: _p.load(_unit(pl))

func _fail() -> void:
	var cb := _on_fail
	_on_reward = Callable()
	_on_fail = Callable()
	if cb.is_valid(): cb.call()

## AB kullanıcıları için ayarlarda "Gizlilik seçenekleri"
func privacy_required() -> bool:
	return _p != null and _p.privacy_required()

func show_privacy() -> void:
	if _p: _p.show_privacy()
