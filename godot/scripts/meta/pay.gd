class_name Pay
extends Node
## Gerçek para satın alma (Google Play Billing · ShadowPay eklentisi). Yalnız gem paketleri,
## tüketilebilir ürün. Ürün kimlikleri Play Console'da birebir aynı açılmalı (PRODUCTS).
##
## Akış: buy(paket) → Play ödeme ekranı → "purchased"(ürün, token) → gem verilir, token kaydedilir,
## kayıt diske yazılır → consume(token). Ödenip tüketilmemiş satın almalar açılışta yeniden gelir;
## token kayıtlıysa ikinci kez gem verilmez, yalnız tüketilir. Mağaza fiyatları Play'den (yerel para
## birimiyle) gelir; gelmeden önce config'deki fiyat gösterilir.

## paket kimliği (D.STONE_PACKS.id) → Play ürün kimliği
const PRODUCTS := {"kese": "gems_80", "avuc": "gems_275", "sandik": "gems_720", "kule": "gems_1800"}
const GRANTED_KEY := "kh_pay_tokens"

var g
var _p: Object = null           # Engine singleton "ShadowPay"
var prices := {}                # paket kimliği → yerel fiyat dizgesi ("₺29,99", "$1.99"…)
var _busy := ""                 # ödeme ekranı açık olan paket

func _init(game) -> void:
	g = game
	name = "Pay"
	process_mode = Node.PROCESS_MODE_ALWAYS

func _ready() -> void:
	if not Engine.has_singleton("ShadowPay"): return
	_p = Engine.get_singleton("ShadowPay")
	_p.connect("price", _on_price)
	_p.connect("purchased", _on_purchased)
	_p.connect("consumed", _on_consumed)
	_p.connect("pending", _on_pending)
	_p.connect("purchase_failed", _on_failed)
	_p.start(PackedStringArray(PRODUCTS.values()))

## Android'de gerçek ödeme zorunlu (eklenti yüklenemese bile bedava gem verilmez);
## masaüstü/geliştirmede eski anında-ver akışı
static func required() -> bool:
	return OS.get_name() == "Android"

func price(pack_id: String) -> String:
	return str(prices.get(pack_id, ""))

func buy(pack_id: String) -> void:
	if _p == null:
		g.ui.toast("MAĞAZA ŞU AN KULLANILAMIYOR")
		return
	if _busy != "": return
	if not _p.is_ready():
		_p.start(PackedStringArray(PRODUCTS.values()))
		g.ui.toast("MAĞAZAYA BAĞLANILIYOR · BİRAZ SONRA DENE")
		return
	_busy = pack_id
	_p.buy(str(PRODUCTS.get(pack_id, "")))

func _pack_of(product: String) -> String:
	for k in PRODUCTS:
		if PRODUCTS[k] == product: return k
	return ""

func _on_price(product: String, formatted: String) -> void:
	var k := _pack_of(product)
	if k == "": return
	prices[k] = formatted
	var shop = g.ui.menu.pages.get("magaza") if g.ui.menu else null
	if shop and shop.has_method("refresh_prices"): shop.refresh_prices()

func _tokens() -> Array:
	var J = JSON.parse_string(str(Store.get_item(GRANTED_KEY, "[]")))
	return J if J is Array else []

func _on_purchased(product: String, token: String) -> void:
	_busy = ""
	var T := _tokens()
	if not T.has(token):
		var k := _pack_of(product)
		if k == "":
			push_warning("ShadowPay bilinmeyen ürün " + product)
			return
		g.grant_stone_pack(k)
		T.append(token)
		Store.set_item(GRANTED_KEY, JSON.stringify(T))
		Store.flush()
	_p.consume(token)

func _on_consumed(token: String) -> void:
	var T := _tokens()
	if T.has(token):
		T.erase(token)
		Store.set_item(GRANTED_KEY, JSON.stringify(T))

func _on_pending(_product: String) -> void:
	_busy = ""
	g.ui.toast("ÖDEME BEKLENİYOR · ONAYLANINCA GEMLER GELECEK")

func _on_failed(_product: String, code: int, msg: String) -> void:
	_busy = ""
	# 1 = kullanıcı vazgeçti: sessiz
	if code == 1: return
	push_warning("ShadowPay purchase_failed " + str(code) + " " + msg)
	g.ui.toast("SATIN ALMA TAMAMLANAMADI")
