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
var _fx: Node2D            # büyük zıplayan sandık + dönen ışınlar (kartın üstünde)
var _chest: Sprite2D
var _c0 := Vector2.ZERO

func _init(game) -> void:
	super(game)
	name = "ChestBuy"

func open(t: String, o: Dictionary) -> void:
	cancel_fade()
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
	btn(L, L.find(".odds-link"), func(): g.audio.play("click"); g.ui.show_odds(type))
	btn(L, L.find(".cb-buy"), func(): _buy())
	_build_fx()
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

## kartın içindeki küçük sandık çizimi yerine büyük gerçek sandık: yukarıdan düşer, zıplar, nefes alır
func _build_fx() -> void:
	_fx = null; _chest = null
	var cn: Lyr.N = null
	for nn in L.nodes:
		if nn is Lyr.N and str(nn.d.get("id", "")) == "7" and str(nn.d.get("tag", "")) == "svg": cn = nn
	if cn == null: return
	var r := L.rect_of(cn)
	L.set_hidden(cn, true)
	_c0 = r.get_center() + Vector2(0, -6)
	_fx = Node2D.new()
	_fx.position = _c0
	L.add_child(_fx)
	var C: Dictionary = ChestSystem.chests().get(type, {})
	var tex: Texture2D = UITex.get_tex("res://assets/ui/art/chest/t" + str(clampi(int(C.get("tier", 2)), 1, 7)) + ".png")
	var col := Color(str(C.get("color", "#ffc24a"))) if C.has("color") else Color("#ffc24a")
	_fx.draw.connect(func():
		# dönen ışın demeti + yumuşak hale
		var a0 := _t * 0.6
		for i in 12:
			var a := a0 + i * TAU / 12.0
			var pts := PackedVector2Array([Vector2.ZERO, Vector2(cos(a - 0.11), sin(a - 0.11)) * 120.0, Vector2(cos(a + 0.11), sin(a + 0.11)) * 120.0])
			_fx.draw_colored_polygon(pts, Color(col, 0.10 * minf(1.0, _t * 2.0)))
		for k in 4:
			_fx.draw_circle(Vector2.ZERO, 70.0 - k * 14.0, Color(col, 0.05 * minf(1.0, _t * 2.0))))
	if tex:
		_chest = Sprite2D.new()
		_chest.texture = tex
		var sc := 132.0 / maxf(tex.get_width(), tex.get_height())
		_chest.scale = Vector2(sc, sc)
		_chest.set_meta("sc", sc)
		_fx.add_child(_chest)

func _process(dt: float) -> void:
	if not visible or _card == null: return
	_t += dt
	if _t <= 0.5:
		# kart: aşağıdan zıplayarak açılır (ölçek .55 → 1.06 → 1, hafif dönme)
		var k := clampf(_t / 0.38, 0.0, 1.0)
		var e := UIK.bez(0.2, 1.6, 0.4, 1.0, k)
		var s := lerpf(0.55, 1.0, e)
		_card.extra = Transform2D(lerpf(-0.07, 0.0, e), Vector2.ONE * s, 0, Vector2(0, (1.0 - e) * 60.0))
		L.set_dyn(_card)
		L.modulate.a = minf(1.0, k * 2.5)
	if _fx and _chest:
		var sc: float = _chest.get_meta("sc")
		var td := _t - 0.12
		var y := 0.0; var sx := 1.0; var sy := 1.0
		if td < 0.0:
			y = -420.0
		elif td < 0.32:
			# yukarıdan düşüş
			var f := td / 0.32
			y = lerpf(-420.0, 0.0, f * f)
		elif td < 0.62:
			# yere çarpma: ezilip sekme
			var f := (td - 0.32) / 0.3
			y = -sin(f * PI) * 34.0 * (1.0 - f * 0.4)
			var sq := sin(clampf(f * 3.0, 0.0, 1.0) * PI) * (1.0 - f)
			sx = 1.0 + 0.22 * sq; sy = 1.0 - 0.2 * sq
			if td - dt < 0.32: g.audio.play("chestlatch")
		else:
			# nefes alan bekleme + ara sıra zıplama
			var f := td - 0.62
			var hop := fmod(f, 2.2)
			if hop < 0.35:
				var hk := hop / 0.35
				y = -sin(hk * PI) * 18.0
				sx = 1.0 - 0.05 * sin(hk * PI); sy = 1.0 + 0.07 * sin(hk * PI)
			else:
				y = sin(f * 2.4) * 3.0
				sx = 1.0 + 0.02 * sin(f * 4.8); sy = 1.0 - 0.02 * sin(f * 4.8)
		_chest.position = Vector2(0, y)
		_chest.scale = Vector2(sc * sx, sc * sy)
		_chest.rotation = 0.05 * sin(_t * 1.7)
		_fx.queue_redraw()

func close() -> void:
	if not visible: return
	fade_hide(_close_now)

func _close_now() -> void:
	if not visible: return
	visible = false
	g.audio.play("click")
	if L:
		unbtn(L)
		L.queue_free()
		L = null
		_card = null
