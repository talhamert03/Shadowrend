class_name ShopPage
extends Node2D
## ui.js renderMagaza — MAĞAZA: GÜNÜN FIRSATI, ücretsiz + reklamlı bonus sandık afişleri,
## sandık vitrini (SEFER · KRAL), günlük KART PAZARI (renderMarket), GEM KESESİ
## (renderStoneShop, ilk alışverişe ×2), GEM BOZDUR (renderExchange). Üç geri sayım
## (ücretsiz · reklam · fırsat) aynı saniye darbesinden sürülür; sıfırlanan sayfayı tazeler.
## Kabuk pg_magaza; bileşenler tools/bake/ui/scn/shop.mjs şablonları — her biri gerçek
## kabında yakalandığı için yakalama dikdörtgeni kaba göre konumu verir (_loc).

const SHOP_META := {
	"yaygin": {"short": "GÜMÜŞ", "hook": "1 EKİPMAN", "tag": ""},
	"kemik": {"short": "ALTIN", "hook": "GARANTİ EKİPMAN", "tag": ""},
	"kan": {"short": "BÜYÜLÜ", "hook": "SİLAH ŞANSI", "tag": "POPÜLER"},
	"kadim": {"short": "BUZUL", "hook": "DESTAN + ALTIN", "tag": "EN İYİ DEĞER"},
	"mistik": {"short": "MİSTİK", "hook": "EFSANE GARANTİ", "tag": "GARANTİ"},
	"ejderha": {"short": "EJDERHA", "hook": "EFSANE + ALTIN", "tag": "EFSANEVİ"},
}
const DEAL_POOL := ["kemik", "kan", "kadim", "mistik"]
const VITRINE := ["yaygin", "kemik", "kan", "kadim", "mistik", "ejderha"]
const AD_CHEST_CD := 4 * 3600e3
const MK_HC_W := 176.0          # kahraman kartı (2 sütun · 10 px aralık)
const MK_GAP := 10.0
const MK_GC_STEP := Vector2(185.0, 128.0)

var menu
var g
var shell: Lyr
var root: Lyr.N
var col: Lyr.N
var _cont := {}            # kap kimliği → yakalanan mutlak konum (yakalama koordinatı)
var _items := {}           # kap → [Node]
var _scroll_h0 := 0.0
var _tick := 0.0
var _cd := {}              # geri sayım düğümleri: {"free": [L, n], "ad": …, "deal": …}

func _init(m) -> void:
	menu = m
	g = m.g
	name = "Shop"

func render() -> void:
	if shell == null:
		shell = Lyr.make("pg_magaza")
		add_child(shell)
		shell.stretch_h(Scr.dh_of(self))
		root = shell.nodes[0]
		menu.scroll_area(shell, root)
		col = shell.find(".magaza-col")
		var J := Lyr.load_json("pg_magaza")
		var R: Array = J.get("rect", [0, 0, 0, 0])
		for k in ["#shop-chests", "#card-market", "#stone-shop", "#ruby-exchange"]:
			var n := shell.find_id(k)
			if n: _cont[k] = Vector2(float(R[0]), float(R[1])) + shell.rect_of(n).position
		var S = root.d.get("scroll")
		if S is Dictionary: _scroll_h0 = float(S.h)
	_chests()
	_market()
	_stone_shop()
	_exchange()
	_relayout()

# ═════════════ yardımcılar ═════════════

func _clear(k: String) -> void:
	for it in _items.get(k, []):
		if it is Lyr: menu.unbtn(it)
		(it as Node).queue_free()
	_items[k] = []

## bileşenin kaba göre konumu (yakalama dikdörtgeni − kabın yakalanan konumu)
func _loc(key: String, cont: String) -> Vector2:
	var R: Array = Lyr.load_json(key).get("rect", [0, 0, 0, 0])
	return Vector2(float(R[0]), float(R[1])) - _cont.get(cont, Vector2.ZERO)

func _add(key: String, cont: String, pos = null) -> Lyr:
	if not FileAccess.file_exists(Lyr.BASE + key + ".json"): return null
	var n := shell.find_id(cont)
	if n == null: return null
	var C := Lyr.make(key)
	n.host.add_child(C)
	C.position = _loc(key, cont) if pos == null else pos
	_items[cont].append(C)
	return C

## ortalı düğme içinde fiyat yazısı: [simge][yazı] grubu yeniden ortalanır
static func price_text(L: Lyr, b: Lyr.N, s: String, icon: Lyr.N = null) -> void:
	if b == null or b.txt == null: return
	var w0 := b.txt.text_width()
	L.set_text(b, s)
	var dw := b.txt.text_width() - w0
	if absf(dw) < 0.01: return
	L.fit_width(b, b.size.x + dw, true)
	if icon: L.move(icon, icon.pos - Vector2(dw * 0.5, 0))

static func fmt_tr(v: float) -> String:
	# toLocaleString('tr-TR'): binlik ayırıcı nokta
	var s := str(int(v))
	var out := ""
	var neg := s.begins_with("-")
	if neg: s = s.substr(1)
	while s.length() > 3:
		out = "." + s.substr(s.length() - 3) + out
		s = s.substr(0, s.length() - 3)
	return ("-" if neg else "") + s + out

## yerel gece yarısına göre gün indeksi / günün bitimine kalan (Clock.now ms)
static func _bias_ms() -> float:
	return float(Time.get_time_zone_from_system().get("bias", 0)) * 60000.0

static func shop_day() -> int:
	return int(floor((Clock.now() + _bias_ms()) / 86400000.0))

static func day_ends_in() -> float:
	var loc := Clock.now() + _bias_ms()
	return 86400000.0 - fposmod(loc, 86400000.0)

func today_deal() -> Dictionary:
	var day := shop_day()
	var t: String = DEAL_POOL[day % DEAL_POOL.size()]
	var C: Dictionary = ChestSystem.chests()[t]
	var off := 0.3 if float(C.tier) >= 6 else 0.4
	var price := maxf(1.0, JS.round_js(float(C.stonePrice) * (1.0 - off) / 5.0) * 5.0)
	var bought := str(Store.get_item("kh_deal", "")) == str(day)
	return {"t": t, "C": C, "off": int(round(off * 100)), "price": price, "bought": bought, "day": day}

static func ad_chest_in() -> float:
	var last := str(Store.get_item("kh_adchest", "0")).to_float()
	return maxf(0.0, last + AD_CHEST_CD - Clock.now())

static func first_buy_used() -> bool:
	return str(Store.get_item("kh_firstbuy", "")) == "1"

# ═════════════ sandık vitrini ═════════════

func _chests() -> void:
	var K := "#shop-chests"
	_clear(K)
	_cd.clear()
	var stones: float = g.read_stones()
	# GÜNÜN FIRSATI
	var deal := today_deal()
	var D1 := _add("deal_" + str(deal.t) + ("_done" if deal.bought else ""), K)
	if D1:
		var cd := D1.find_id("#deal-cd")
		if cd and not deal.bought:
			D1.set_text(cd, ChestSystem.fmt_dur(day_ends_in()))
			_cd["deal"] = [D1, cd]
		menu.btn(D1, D1.nodes[0], func(): _deal_tap(), 0.98)
	# ücretsiz sandık
	var free_in: float = g.chests.free_ready_in()
	var F := _add("fb_free_" + ("wait" if free_in > 0 else "ready"), K)
	if F:
		var cd := F.find_id("#free-cd")
		if cd:
			F.set_text(cd, ChestSystem.fmt_dur(free_in))
			_cd["free"] = [F, cd]
		menu.btn(F, F.nodes[0], func(): _free_tap(), 0.98)
	# reklamlı bonus sandık
	var ad_in := ad_chest_in()
	var A := _add("fb_ad_" + ("wait" if ad_in > 0 else "ready"), K)
	if A:
		var cd := A.find_id("#ad-cd")
		if cd:
			A.set_text(cd, ChestSystem.fmt_dur(ad_in))
			_cd["ad"] = [A, cd]
		menu.btn(A, A.nodes[0], func(): _ad_tap(), 0.98)
	_add("sec_sefer", K)
	_add("sec_kral", K)
	for t in VITRINE:
		var C: Dictionary = ChestSystem.chests()[t]
		var can := stones >= float(C.stonePrice)
		var V := _add("vc_" + t + ("" if can else "_broke"), K)
		if V:
			var tt: String = t
			menu.btn(V, V.nodes[0], func(): _vcard_tap(tt), 0.96)

func _deal_tap() -> void:
	var deal := today_deal()
	if deal.bought:
		g.audio.play("click")
		g.ui.toast("BUGÜNKÜ FIRSAT ALINDI")
		return
	if g.read_stones() < float(deal.price):
		g.audio.play("error")
		g.ui.toast("YETERİNCE GEM YOK")
		return
	g.audio.play("click")
	var day: int = deal.day
	g.ui.chest_buy(str(deal.t), {"price": deal.price, "orig": float(deal.C.stonePrice), "off": deal.off,
		"onBought": func(): Store.set_item("kh_deal", str(day))})

func _free_tap() -> void:
	if g.chests.free_ready_in() > 0 or not g.chests.claim_free():
		g.audio.play("click")
		return
	g.ui.chest_ceremony("ahsap", -1, func(): _after_ceremony())

func _ad_tap() -> void:
	if ad_chest_in() > 0:
		g.audio.play("click")
		g.ui.toast("SONRAKİ BONUS SANDIK İÇİN BEKLE")
		return
	g.ui.adwatch.show_ad(3, func():
		Store.set_item("kh_adchest", JS.s(Clock.now()))
		g.audio.play("adreward")
		menu.set_page("magaza", true)
		g.ui.chest_ceremony("yaygin", -1, func(): _after_ceremony()))

func _vcard_tap(t: String) -> void:
	var C: Dictionary = ChestSystem.chests()[t]
	if g.read_stones() < float(C.stonePrice):
		g.audio.play("error")
		g.ui.toast("YETERİNCE GEM YOK")
		return
	g.audio.play("click")
	g.ui.chest_buy(t, {})

func _after_ceremony() -> void:
	menu.refresh_wallet()
	render()

# ═════════════ kart pazarı ═════════════

func _market() -> void:
	var K := "#card-market"
	_clear(K)
	var lf := shell.find_id("#mkt-left")
	if lf:
		var ms := Market.ms_left()
		shell.set_text(lf, "yenilenme " + str(int(ms / 3600000.0)) + " sa " + str(int(ms / 60000.0) % 60) + " dk")
	var O: Array = Market.offers(g)
	var box := shell.find_id(K)
	if O.is_empty():
		var E := _add("mk_empty", K, Vector2.ZERO)
		if box: shell.resize_h(box, E.nodes[0].size.y if E else 44.0)
		return
	var gold: float = g.read_rubies()
	var gems: float = g.read_stones()
	var heroes := O.filter(func(o): return o.kind == "char")
	var gears := O.filter(func(o): return o.kind != "char")
	var y := 0.0
	var hh := 0.0
	for i in heroes.size():
		var o: Dictionary = heroes[i]
		var r := clampi(int(o.rar), 1, 4)
		var st := "got" if o.got else ("unlock" if o.get("unlock", false) else "n")
		var C := _add("mkh" + str(r) + "_" + st, K, Vector2((i % 2) * (MK_HC_W + MK_GAP), (i / 2) * 0.0))
		if C == null: continue
		hh = C.nodes[0].size.y
		C.position.y = (i / 2) * (hh + MK_GAP)
		_hero_card(C, o)
	if heroes.size(): y = ceilf(heroes.size() / 2.0) * (hh + MK_GAP) - MK_GAP
	if heroes.size() and gears.size(): y += MK_GAP
	var gh := 0.0
	for i in gears.size():
		var o: Dictionary = gears[i]
		var r := clampi(int(o.rar), 1, 5)
		var C := _add("mkg" + str(r) + "_" + ("got" if o.got else "n"), K, Vector2((i % 2) * MK_GC_STEP.x, y + (i / 2) * MK_GC_STEP.y))
		if C == null: continue
		gh = C.nodes[0].size.y
		_gear_card(C, o)
	if gears.size(): y += ceilf(gears.size() / 2.0) * MK_GC_STEP.y - (MK_GC_STEP.y - gh)
	if box: shell.resize_h(box, y)

func _hero_card(C: Lyr, o: Dictionary) -> void:
	var art := C.find(".mk-hc-art")
	var pp := "res://assets/ui/art/portrait/" + str(o.id) + ".webp"
	if art and ResourceLoader.exists(pp):
		var pr := UIK.round_image(load(pp), art.size.x, art.size.y, 11.0, Vector2(0.5, 0.18), 0.0, Color(0, 0, 0, 0), Color("#120e15"), Color("#120e15"))
		var m := pr.material as ShaderMaterial
		var bri := 1.0
		var sat := 1.0
		if o.get("unlock", false):
			bri *= 0.55
			sat *= 0.6
		if o.got:
			# .mk-hc.got .mk-hc-frame { filter: grayscale(.7) brightness(.62) }
			bri *= 0.62
			sat *= 0.3
		m.set_shader_parameter("bri", bri)
		m.set_shader_parameter("sat", sat)
		art.node.add_child(pr)
	var nn := C.find(".mk-hc-n")
	if nn: C.set_text(nn, "×" + str(int(o.n)))
	var pl := C.find(".mk-hc-plate")
	if pl and pl.txt:
		var l0 := pl.txt.line_count()
		C.set_text(pl, str(o.name))
		var dl := float(pl.txt.line_count() - l0) * pl.txt.line_h
		if absf(dl) > 0.1:
			C.move(pl, pl.pos - Vector2(0, dl))
			C.resize_h(pl, pl.size.y + dl)
	# kart gövdesi İNCELER (önce kaydedilir: fiyat düğmeleri üstte kalır → onlar SATIN ALIR)
	var id: String = o.id
	menu.btn(C, C.nodes[0], func(): g.audio.play("click"); g.ui.open_char_detail(id), 0.98)
	_pay(C, o, "h")

func _gear_card(C: Lyr, o: Dictionary) -> void:
	var art := C.find(".mk-gc-art")
	var p := "res://assets/ui/art/gear/" + str(o.get("icon", "")) + ".png"
	if art and ResourceLoader.exists(p):
		var s := Sprite2D.new()
		s.texture = load(p)
		var box := art.size.x - 12.0
		s.scale = Vector2.ONE * (box / maxf(s.texture.get_width(), s.texture.get_height()))
		s.position = art.size * 0.5
		if o.got: s.modulate = Color(0.5, 0.5, 0.5)
		art.node.add_child(s)
		# ×N rozeti çizimin üstünde kalsın
		var nb := C.find(".mk-gc-n")
		if nb: nb.node.move_to_front()
	var nn := C.find(".mk-gc-n")
	if nn:
		var w0: float = nn.txt.text_width() if nn.txt else 0.0
		C.set_text(nn, "×" + str(int(o.n)))
		if nn.txt:
			var dw := nn.txt.text_width() - w0
			# right:-4px sabit → sola doğru büyür
			C.fit_width(nn, nn.size.x + dw, false)
			C.move(nn, nn.pos - Vector2(dw, 0))
	var t := C.find(".mk-gc-t")
	if t:
		for k in t.kids:
			if k.d.get("tag") == "b": C.set_text(k, str(o.name))
	var id: String = o.id
	menu.btn(C, C.nodes[0], func(): g.audio.play("click"); g.ui.open_gear_detail(id), 0.98)
	_pay(C, o, "g")

func _pay(C: Lyr, o: Dictionary, kind: String) -> void:
	var pn := C.find(".mk-pay")
	if pn == null: return
	var key := "mkp_" + kind + "_done"
	if not o.got:
		var ga := 1 if g.read_rubies() >= float(o.price) else 0
		var ma := 1 if g.read_stones() >= float(o.gem) else 0
		key = "mkp_" + kind + "_g" + str(ga) + "_m" + str(ma)
	if not FileAccess.file_exists(Lyr.BASE + key + ".json"): return
	var P := Lyr.make(key)
	pn.node.add_child(P)
	if o.got: return
	var btns := P.find_all(".mk-buy").filter(func(n): return not String(n.d.key).contains("-sh"))
	var slot: String = o.slot
	for b in btns:
		var gem := String(b.d.key).contains("gem")
		var tb: Lyr.N = null
		var ic: Lyr.N = null
		for k in b.kids:
			if k.d.get("tag") == "b": tb = k
			elif String(k.d.key) == ".ruby" or String(k.d.key) == ".stone": ic = k
		price_text(P, tb, fmt_tr(float(o.gem if gem else o.price)), ic)
		var cur := "gem" if gem else "gold"
		menu.btn(P, b, func(): _mk_buy(slot, cur), 0.95)

func _mk_buy(slot: String, cur: String) -> void:
	var r = Market.buy(g, slot, cur)
	if r == null:
		g.audio.play("error")
		g.ui.toast("Gem yetmiyor" if cur == "gem" else "Altın yetmiyor")
		return
	g.audio.play("buy")
	Input.vibrate_handheld(15)
	g.ui.toast("+" + str(int(r.n)) + " " + str(r.name) + " KARTI")
	menu.refresh_wallet()
	render()
	if r.get("first", false):
		var hid: String = r.id
		get_tree().create_timer(0.65).timeout.connect(func(): g.ui.celebrate.hero_unlock(hid))

# ═════════════ gem kesesi + bozdurma ═════════════

func _stone_shop() -> void:
	var K := "#stone-shop"
	_clear(K)
	var x2 := not first_buy_used()
	var h := 0.0
	if x2:
		var N := _add("x2_note", K)
		if N: h = maxf(h, N.position.y + N.nodes[0].size.y)
	for p in D.STONE_PACKS:
		var P := _add("sp_" + str(p.id) + ("_x2" if x2 else ""), K)
		if P == null: continue
		h = maxf(h, P.position.y + P.nodes[0].size.y)
		var pid: String = p.id
		menu.btn(P, P.nodes[0], func(): _buy_pack(pid), 0.96)
	var box := shell.find_id(K)
	if box: shell.resize_h(box, h)

func _buy_pack(id: String) -> void:
	var pack = null
	for p in D.STONE_PACKS:
		if p.id == id: pack = p
	if pack == null: return
	var total: float = float(pack.amount) + float(pack.bonus)
	var first := not first_buy_used()
	if g.buy_stone_pack(id):
		if first:
			g.add_stones(total)
			Store.set_item("kh_firstbuy", "1")
		menu.refresh_wallet()
		render()
		g.ui.toast("+" + str(int(total * 2 if first else total)) + " GEM ALINDI" + (" (×2!)" if first else ""))

func _exchange() -> void:
	var K := "#ruby-exchange"
	_clear(K)
	var stones: float = g.read_stones()
	for e in D.RUBY_EXCHANGE:
		var E := _add("ex_" + str(e.id) + ("" if stones >= float(e.stone) else "_cant"), K)
		if E == null: continue
		var eid: String = e.id
		var rub: int = int(e.rubies)
		menu.btn(E, E.nodes[0], func():
			if g.exchange_stones(eid):
				menu.refresh_wallet()
				render()
				g.ui.toast("+" + str(rub) + " ALTIN BOZDURULDU")
			else:
				g.ui.toast("YETERLİ GEM YOK"), 0.96)

# ═════════════ yerleşim + geri sayım ═════════════

func _relayout() -> void:
	if col == null: return
	var dh := shell.relayout_col(col, col.kids.filter(func(k): return not String(k.d.key).contains("::")))
	var S = root.d.get("scroll")
	if S is Dictionary: S.h = _scroll_h0 + dh
	shell.set_scroll(root, clampf(root.scroll_y, 0.0, shell.scroll_max(root)))

func _process(dt: float) -> void:
	if not is_visible_in_tree() or _cd.is_empty(): return
	_tick += dt
	if _tick < 1.0: return
	_tick = 0.0
	if _cd.has("free"):
		var left: float = g.chests.free_ready_in()
		if left <= 0:
			render()
			return
		_cd.free[0].set_text(_cd.free[1], ChestSystem.fmt_dur(left))
	if _cd.has("ad"):
		var left := ad_chest_in()
		if left <= 0:
			render()
			return
		_cd.ad[0].set_text(_cd.ad[1], ChestSystem.fmt_dur(left))
	if _cd.has("deal"):
		var left := day_ends_in()
		if left <= 1000:
			render()
			return
		_cd.deal[0].set_text(_cd.deal[1], ChestSystem.fmt_dur(left))
