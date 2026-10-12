class_name ScrChestBuy
extends Scr
## ui.js openChestBuy — sandık satın alma onayı (küçük pop-up): sandık, ad + kanca,
## efsane garantisi + OLASILIKLAR, SATIN AL (gem; fırsatta üstü çizili eski fiyat +
## İNDİRİM etiketi), cebindeki gem. Gem orada harcanır, açılış töreni ancak sonra başlar.
## Yakalama: cb_<tür>[_deal].

var L: Lyr
var type := ""
var opts := {}
var _t := 0.0
var _card: Lyr.N

func _init(game) -> void:
	super(game)
	name = "ChestBuy"

func open(t: String, o: Dictionary) -> void:
	type = t
	opts = o
	var key := "cb_" + t + ("_deal" if o.has("off") else "")
	if not FileAccess.file_exists(Lyr.BASE + key + ".json"):
		key = "cb_" + t
		if not FileAccess.file_exists(Lyr.BASE + key + ".json"): return
	if L:
		unbtn(L)
		L.queue_free()
	L = Lyr.make(key)
	add_child(L)
	L.stretch_h(Scr.dh_of(self))
	_card = L.find(".cb-card")
	_texts()
	# perdeye dokunmak kapatır; kartın kendisi dokunuşu yutar
	btn(L, L.nodes[0], func(): close(), 1.0, 0.0)
	if _card: btn(L, _card, func(): pass, 1.0, 0.0)
	btn(L, L.find_id("#cb-close"), func(): close())
	btn(L, L.find(".odds-link"), func(): g.audio.play("click"); g.ui.toast("OLASILIKLAR YAKINDA"))
	btn(L, L.find(".cb-buy"), func(): _buy())
	visible = true
	_t = 0.0
	g.audio.play("panel")

func _texts() -> void:
	var n: int = g.chests.pity_count()
	var pv := L.find(".pity-v")
	if pv: L.set_text(pv, str(n) + "/" + str(ChestSystem.PITY_N))
	var pb := L.find(".pity-bar")
	if pb: UIK.pity_fill(pb, float(n) / ChestSystem.PITY_N)
	# CEBİNDE ◆ <b>n</b> — grup ortalı kalır
	var bal := L.find_id("#cb-bal")
	if bal:
		var b: Lyr.N = null
		for k in bal.kids:
			if k.d.get("tag") == "b": b = k
		if b and b.txt:
			var w0 := b.txt.text_width()
			L.set_text(b, str(int(g.read_stones())))
			var dw := b.txt.text_width() - w0
			L.fit_width(b, b.size.x + dw, false)
			L.fit_width(bal, bal.size.x + dw, true)

func _buy() -> void:
	var C: Dictionary = ChestSystem.chests()[type]
	var price: float = float(opts.get("price", C.stonePrice))
	if g.read_stones() < price or not g.spend_stones(price):
		g.audio.play("error")
		g.ui.toast("YETERİNCE GEM YOK")
		return
	var cb = opts.get("onBought")
	if cb is Callable and (cb as Callable).is_valid(): (cb as Callable).call()
	g.audio.play("buy")
	g.ui.refresh_wallet()
	var t := type
	close()
	g.ui.chest_ceremony(t, -1, func():
		g.ui.refresh_wallet()
		var sp = g.ui.menu.pages.get("magaza")
		if sp: sp.render())

func _process(dt: float) -> void:
	if not visible or _card == null: return
	if _t > 0.3: return
	_t += dt
	# @keyframes cbPop 150 ms cubic-bezier(.2,1.6,.4,1): ölçek .9 → 1, opaklık 0 → 1
	var k := clampf(_t / 0.15, 0.0, 1.0)
	var e := UIK.bez(0.2, 1.6, 0.4, 1.0, k)
	var s := lerpf(0.9, 1.0, e)
	_card.extra = Transform2D(0, Vector2.ONE * s, 0, Vector2.ZERO)
	L.set_dyn(_card)
	L.modulate.a = minf(1.0, k * 1.5)

func close() -> void:
	if not visible: return
	visible = false
	g.audio.play("click")
	if L:
		unbtn(L)
		L.queue_free()
		L = null
		_card = null
