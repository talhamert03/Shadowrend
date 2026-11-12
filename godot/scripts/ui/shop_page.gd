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
	"kadim": {"short": "BUZUL", "hook": "EPİK + ALTIN", "tag": "EN İYİ DEĞER"},
	"mistik": {"short": "MİSTİK", "hook": "EFSANEVİ GARANTİ", "tag": "GARANTİ"},
	"ejderha": {"short": "EJDERHA", "hook": "EFSANEVİ + ALTIN", "tag": "EFSANEVİ"},
}
const DEAL_POOL := ["kemik", "kan", "kadim", "mistik"]
const VITRINE := ["yaygin", "kemik", "kan", "kadim", "mistik", "ejderha"]
const AD_CHEST_CD := 4 * 3600e3
## reklamlı bonus sandık: ALTIN (gümüşün bir üstü)
const AD_CHEST := "kemik"
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
var _pack_lyr := {}        # gem paketi kimliği → katman (uçuşun kaynağı)
var _cd := {}              # geri sayım düğümleri: {"free": [L, n], "ad": …, "deal": …}

func _init(m) -> void:
	menu = m
	g = m.g
	name = "Shop"

func render() -> void:
	_stage += 1          # süren aşamalı kurulum varsa iptal (tam kurulum hepsini kapsar)
	_setup()
	_chests()
	_market()
	_finish()

## gizli (arka plan) kurulum: bölümler ayrı karelere yayılır — tek karede ~300 ms'lik takılma olmasın
var _stage := 0
func render_staged() -> void:
	_stage += 1
	var my := _stage
	var steps: Array[Callable] = [_setup, _chests, _market, _finish]
	for st in steps:
		if my != _stage or not is_inside_tree(): return
		var rk := UITex.rec_begin("magaza")
		Prof.s("shop:" + str(st.get_method()))
		st.call()
		Prof.t("shop:" + str(st.get_method()))
		UITex.rec_end(rk)
		await get_tree().process_frame

func _setup() -> void:
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

func _finish() -> void:
	_stone_shop()
	# gem → altın bozdurma kaldırıldı (bölüm gizli kalır)
	for nn in shell.nodes:
		if nn is Lyr.N and str(nn.d.get("id", "")) in ["11", "14"]: shell.set_hidden(nn, true)
	_relayout()

# ═════════════ yardımcılar ═════════════

func _clear(k: String) -> void:
	if k == "#shop-chests": _bob.clear()
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
	if OS.get_cmdline_user_args().has("x2test"): return false     # geliştirici: ×2 görünümü
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
		D1.set_num("b", str(int(deal.price)))
		D1.set_num("s", str(int(float(deal.C.stonePrice))))
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
		# yakalamadaki gümüş sandık görseli yerine altın sandık; alt satır sandığın adını söyler
		var cs := A.find(".chest-svg")
		if cs and cs.img:
			cs.img.visible = false
			var C: Dictionary = ChestSystem.chests().get(AD_CHEST, {})
			var tx: Texture2D = UITex.get_tex("res://assets/ui/art/chest/t" + str(clampi(int(C.get("tier", 3)), 1, 7)) + ".png")
			if tx:
				var sp := Sprite2D.new()
				sp.texture = tx
				sp.scale = Vector2.ONE * (minf(cs.size.x, cs.size.y) * 1.05 / maxf(tx.get_width(), tx.get_height()))
				sp.position = cs.size * 0.5
				cs.host.add_child(sp)
		if ad_in <= 0: EventsPage.txt(A, A.find("em"), "Kısa bir reklam izle, ALTIN SANDIK senin", 0.0)
		menu.btn(A, A.nodes[0], func(): _ad_tap(), 0.98)
	_add("sec_sefer", K)
	_add("sec_kral", K)
	for t in VITRINE:
		var C: Dictionary = ChestSystem.chests()[t]
		var can := stones >= float(C.stonePrice)
		var V := _add("vc_" + t + ("" if can else "_broke"), K)
		if V:
			V.set_num("b", str(int(float(C.stonePrice))))
			var hk := V.find(".vc-hook")
			if hk: V.set_text(hk, (("LEGEND GUARANTEE" if I18n.lang == "en" else "EFSANEVİ GARANTİ") if t in ["mistik", "ejderha"] else ""))
			var tt: String = t
			_restyle_vcard(V, t)
			menu.btn(V, V.nodes[0], func(): _vcard_tap(tt), 0.96)

func _deal_tap() -> void:
	var deal := today_deal()
	if deal.bought:
		g.audio.play("click")
		g.ui.toast("BUGÜNKÜ FIRSAT ALINDI")
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
	g.ui.show_rewarded("magaza_sandik", func():
		Store.set_item("kh_adchest", JS.s(Clock.now()))
		g.audio.play("adreward")
		menu.set_page("magaza", true)
		g.ui.chest_ceremony(AD_CHEST, -1, func(): _after_ceremony()))

## vitrin kartı: SADE ve temiz — koyu mat kart, kademe renginde ince kenar, sandığın arkasında yumuşak
## ışık, altında hafif gölge. Sandık görseli kartın tam ortasına betikten yerleştirilir.
func _restyle_vcard(V: Lyr, t: String) -> void:
	var root: Lyr.N = V.nodes[0]
	if root.img: root.img.visible = false
	for k in [".vc-rift", ".vc-spark", ".vc-head", ".vc-sheen", ".chest-svg"]:
		for q in V.find_all(k):
			if q.img: q.img.visible = false
	var art := V.find(".vc-art")
	if art:
		for q in art.kids:
			if q.img and String(q.d.get("key", "")).begins_with(".vc-art::"): q.img.visible = false
	var tier := ChestStage.tier_of(t)
	var gc := ChestModel.glow_of(tier)
	var W: float = root.size.x
	var H: float = root.size.y
	var ink := Color(0.04, 0.02, 0.06)
	var cx := W * 0.5
	var cy := 106.0
	var fr := Node2D.new()
	fr.draw.connect(func():
		var R := Rect2(0, 0, W, H)
		fr.draw_style_box(ComicSkin.sb(Color(0, 0, 0, 0.5), 14), Rect2(R.position + Vector2(0, 5), R.size))
		fr.draw_style_box(ComicSkin.sb(ink, 14), R.grow(1.5))
		fr.draw_style_box(ComicSkin.sb(Color(gc, 1.0).darkened(0.25), 13), R)
		var I := R.grow(-1.6)
		fr.draw_style_box(ComicSkin.sb(Color("#15101a"), 12), I)
		fr.draw_style_box(ComicSkin.sb(Color("#1e1626"), 12), Rect2(I.position, Vector2(I.size.x, I.size.y * 0.34)))
		# sandığın altında yumuşak gölge
		fr.draw_set_transform(Vector2(cx, cy + 40.0), 0.0, Vector2(1.0, 0.24))
		fr.draw_circle(Vector2.ZERO, W * 0.36, Color(0, 0, 0, 0.45))
		fr.draw_set_transform(Vector2.ZERO, 0.0, Vector2.ONE)
		# isim altı ince çizgi
		fr.draw_rect(Rect2(cx - 22.0, 43.0, 44.0, 1.4), Color(gc, 0.75)))
	root.node.add_child(fr)
	root.node.move_child(fr, 0)
	# sandığın arkasında kademe renginde yumuşak ışık (toplamsal)
	var gl := Sprite2D.new()
	gl.texture = load("res://assets/chest/fx_glow.png")
	var am := CanvasItemMaterial.new()
	am.blend_mode = CanvasItemMaterial.BLEND_MODE_ADD
	gl.material = am
	gl.modulate = Color(gc, 0.42)
	gl.position = Vector2(cx, cy)
	gl.scale = Vector2.ONE * (W * 1.25 / gl.texture.get_width())
	root.node.add_child(gl)
	root.node.move_child(gl, 1)
	# sandık: tam ortada, sabit boyut; hafifçe süzülür
	var sp := Sprite2D.new()
	sp.texture = UITex.get_tex("res://assets/ui/art/chest/t" + str(tier) + ".png")
	sp.position = Vector2(cx, cy)
	sp.scale = Vector2.ONE * (W * 0.92 / maxf(1.0, sp.texture.get_width()))
	root.node.add_child(sp)
	root.node.move_child(sp, 2)
	var tw := sp.create_tween().set_loops()
	var ph := float(tier) * 0.23
	tw.tween_property(sp, "position:y", cy - 3.0, 1.1 + ph * 0.2).set_trans(Tween.TRANS_SINE).set_ease(Tween.EASE_IN_OUT)
	tw.tween_property(sp, "position:y", cy + 1.0, 1.1 + ph * 0.2).set_trans(Tween.TRANS_SINE).set_ease(Tween.EASE_IN_OUT)
	var tg := gl.create_tween().set_loops()
	tg.tween_property(gl, "modulate:a", 0.56, 1.3).set_trans(Tween.TRANS_SINE)
	tg.tween_property(gl, "modulate:a", 0.34, 1.3).set_trans(Tween.TRANS_SINE)

func _vcard_tap(t: String) -> void:
	# gem yetmese de pop-up açılır (sandık animasyonu görülür); yetersizlik SATIN AL'da söylenir
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
	var cw: float = box.size.x if box else MK_HC_W * 2.0 + MK_GAP
	var y := 0.0
	# ── KAHRAMAN KARTLARI: 3 sütun, küçük kart, kendi çerçevesi ──
	if heroes.size():
		y = _mk_head(K, "KAHRAMAN KARTLARI", "#f0c77a", y, cw)
		var hw := (cw - MK_GAP * 2.0) / 3.0
		var hh := 0.0
		for i in heroes.size():
			hh = _hero_tile(K, heroes[i], Vector2((i % 3) * (hw + MK_GAP), y + (i / 3) * (hh + MK_GAP)), hw)
		y += ceilf(heroes.size() / 3.0) * (hh + MK_GAP) + 6.0
	# ── EKİPMAN KARTLARI ──
	if gears.size(): y = _mk_head(K, "EKİPMAN KARTLARI", "#8fc8ff", y, cw)
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

# ═════════════ kart pazarı: bölüm başlığı + kahraman kartı ═════════════

func _mk_lyr(K: String, pos: Vector2, sz: Vector2, key: String) -> Lyr:
	var L := Lyr.new()
	L.build({"nodes": [{"id": "0", "key": key, "box": [0, 0, sz.x, sz.y], "origin": [sz.x * 0.5, sz.y * 0.5]}]})
	L.position = pos
	var n := shell.find_id(K)
	n.host.add_child(L)
	_items[K].append(L)
	return L

## başlık: altın yazı + iki yana sönen ince çizgi
func _mk_head(K: String, title: String, col: String, y: float, cw: float) -> float:
	var L := _mk_lyr(K, Vector2(0, y), Vector2(cw, 26), ".mk-head")
	var c := Color(col)
	var t := HeroesPage._lbl(true, 900, 14, 1.6, c, title, cw)
	t.position = Vector2(0, 3)
	var dn := Node2D.new()
	var tw := t.text_width()
	dn.draw.connect(func():
		var mid := cw * 0.5
		var gap := tw * 0.5 + 12.0
		for sd in [-1.0, 1.0]:
			var x0: float = mid + sd * gap
			var x1: float = mid + sd * (cw * 0.5 - 4.0)
			var pts := PackedVector2Array([Vector2(x0, 12.5), Vector2(x1, 12.5)])
			dn.draw_polyline_colors(pts, PackedColorArray([Color(c, 0.75), Color(c, 0.0)]), 1.5, true)
			dn.draw_circle(Vector2(x0 + sd * 3.0, 12.5), 2.2, c))
	L.nodes[0].node.add_child(dn)
	L.nodes[0].node.add_child(t)
	return y + 34.0

const MK_RAR_TAG := {1: "SIRADAN", 2: "NADİR", 3: "EPİK", 4: "EFSANEVİ"}

## kahraman kartı (kart pazarı): koyu gövde, nadirlik renginde ince kenar + iç ışıma, portre,
## nadirlik etiketi, ad, altın ve gem düğmeleri. Döndürür: kart yüksekliği
func _hero_tile(K: String, o: Dictionary, pos: Vector2, w: float) -> float:
	var rc := Color(String(HeroesPage._rar(str(o.id)).get("color", "#b8c0cc")))
	var unlock: bool = o.get("unlock", false)
	var got: bool = o.got
	var ph := roundf(w * 1.28)
	var by := 4.0 + ph + 34.0
	var bh := 30.0
	var H := by + bh * 2.0 + 6.0 + 6.0
	var B := _mk_lyr(K, pos, Vector2(w, H), ".mk-ht")
	var host: Node2D = B.nodes[0].node
	var dn := Node2D.new()
	var pr := Rect2(4, 4, w - 8, ph)
	var tag: String = "YENİ KAHRAMAN" if unlock else str(MK_RAR_TAG.get(clampi(int(o.rar), 1, 4), ""))
	dn.draw.connect(func():
		var R := Rect2(0, 0, w, H)
		# gölge + dış ışıma
		dn.draw_style_box(ComicSkin.sb(Color(0, 0, 0, 0.45), 13), Rect2(R.position + Vector2(0, 4), R.size))
		dn.draw_style_box(ComicSkin.sb(Color(rc, 0.16), 15), R.grow(3.0))
		# gövde: koyu, üstten nadirlik renginde hafif ışık
		dn.draw_style_box(ComicSkin.sb(Color("#140e18"), 12, 1.5, Color(rc, 0.85)), R)
		var grad := PackedColorArray([Color(rc, 0.0), Color(rc, 0.0), Color(rc, 0.18), Color(rc, 0.18)])
		dn.draw_polygon(PackedVector2Array([Vector2(2, H * 0.55), Vector2(w - 2, H * 0.55), Vector2(w - 2, H - 2), Vector2(2, H - 2)]), grad)
		# portre çerçevesi (resim üstte çizilir), alttan karartma
		dn.draw_style_box(ComicSkin.sb(Color("#0a070c"), 9), pr.grow(1.5)))
	host.add_child(dn)
	var pp := "res://assets/ui/art/portrait/" + str(o.id) + ".webp"
	if ResourceLoader.exists(pp):
		var img := UIK.round_image(UITex.get_tex(pp), pr.size.x, pr.size.y, 9.0, Vector2(0.5, 0.16), 0.0, Color(0, 0, 0, 0), Color("#120e15"), Color("#120e15"))
		var m := img.material as ShaderMaterial
		if got:
			m.set_shader_parameter("bri", 0.55)
			m.set_shader_parameter("sat", 0.25)
		img.position = pr.position
		host.add_child(img)
	# portre üstü: alt karartma, ince iç kenar, nadirlik etiketi, ×N
	var ov := Node2D.new()
	ov.draw.connect(func():
		var fy := pr.end.y - ph * 0.34
		ov.draw_polygon(PackedVector2Array([Vector2(pr.position.x, fy), Vector2(pr.end.x, fy), pr.end, Vector2(pr.position.x, pr.end.y)]),
			PackedColorArray([Color(0.04, 0.02, 0.05, 0.0), Color(0.04, 0.02, 0.05, 0.0), Color(0.04, 0.02, 0.05, 0.92), Color(0.04, 0.02, 0.05, 0.92)]))
		ov.draw_style_box(ComicSkin.sb(Color(0, 0, 0, 0), 9, 1.0, Color(1, 1, 1, 0.12)), pr))
	host.add_child(ov)
	var tg := HeroesPage._lbl(false, 900, 8.5 if unlock else 9.0, 1.4, (Color("#ffd774") if unlock else rc.lightened(0.25)), tag, w)
	tg.position = Vector2(0, pr.end.y - 16.0)
	host.add_child(tg)
	if not unlock:
		var nb := HeroesPage._lbl(true, 900, 12, 0.4, Color.WHITE, "×" + str(int(o.n)), 40)
		var bw2 := nb.text_width() + 12.0
		var bp := Vector2(pr.end.x - bw2 - 4.0, pr.position.y + 4.0)
		var bd := Node2D.new()
		bd.draw.connect(func(): bd.draw_style_box(ComicSkin.sb(Color(0.05, 0.03, 0.07, 0.85), 8, 1.2, Color(rc, 0.9)), Rect2(bp, Vector2(bw2, 19))))
		host.add_child(bd)
		nb.wrap_w = bw2
		nb.position = bp + Vector2(0, 1.5)
		host.add_child(nb)
	var nm := HeroesPage._lbl(true, 900, (12.5 if str(o.name).length() < 10 else (11.0 if str(o.name).length() < 12 else 10.0)), 0.5, Color("#fff4dc"), str(o.name).to_upper(), w - 6.0)
	nm.position = Vector2(3, pr.end.y + 9.0)
	host.add_child(nm)
	var id: String = o.id
	menu.btn(B, B.nodes[0], func(): g.audio.play("click"); g.ui.open_char_detail(id), 0.98)
	# fiyat düğmeleri (kart gövdesinden SONRA kaydedilir → üstte kalır, satın alır)
	if got:
		var dn2 := Node2D.new()
		dn2.draw.connect(func(): dn2.draw_style_box(ComicSkin.sb(Color("#2a2430"), 9, 1.2, Color(1, 1, 1, 0.12)), Rect2(6, by, w - 12, bh * 2.0 + 6.0)))
		host.add_child(dn2)
		var gl := HeroesPage._lbl(true, 900, 13, 1.2, Color("#9a92a4"), "ALINDI", w)
		gl.position = Vector2(0, by + bh - 8.0)
		host.add_child(gl)
		return H
	var slot: String = o.slot
	for i in 2:
		var gem := i == 1
		var price := float(o.gem if gem else o.price)
		var can: bool = (g.read_stones() if gem else g.read_rubies()) >= price
		var bp2 := pos + Vector2(6, by + i * (bh + 6.0))
		var Bb := _mk_lyr(K, bp2, Vector2(w - 12, bh), ".mk-hbuy")
		var base := Color("#3f7ee8") if gem else Color("#e8893a")
		if not can: base = Color("#3a3240")
		var bn := Node2D.new()
		var bw3 := w - 12.0
		bn.draw.connect(func():
			var r := Rect2(0, 0, bw3, bh)
			bn.draw_style_box(ComicSkin.sb(base.darkened(0.55), 9), Rect2(0, 3, bw3, bh))
			bn.draw_style_box(ComicSkin.sb(base, 9, 1.5, base.lightened(0.25)), r)
			bn.draw_style_box(ComicSkin.sb(Color(1, 1, 1, 0.16 if can else 0.05), 7), Rect2(3, 2, bw3 - 6, bh * 0.42)))
		Bb.nodes[0].node.add_child(bn)
		var ic := Sprite2D.new()
		ic.texture = UITex.get_tex("res://assets/fx/currency/" + ("gem" if gem else "coin") + ".png")
		var pt := HeroesPage._lbl(true, 900, 13, 0.3, Color.WHITE if can else Color("#9a92a4"), fmt_tr(price), bw3)
		var tw2 := pt.text_width()
		var isz := 17.0
		if ic.texture: ic.scale = Vector2.ONE * (isz / maxf(ic.texture.get_width(), ic.texture.get_height()))
		var gx := (bw3 - (isz + 4.0 + tw2)) * 0.5
		ic.position = Vector2(gx + isz * 0.5, bh * 0.5)
		if not can: ic.modulate = Color(0.6, 0.6, 0.6)
		Bb.nodes[0].node.add_child(ic)
		pt.align = 0.0
		pt.wrap_w = tw2 + 4.0
		pt.position = Vector2(gx + isz + 4.0, bh * 0.5 - 9.0)
		Bb.nodes[0].node.add_child(pt)
		var cur := "gem" if gem else "gold"
		menu.btn(Bb, Bb.nodes[0], func(): _mk_buy(slot, cur), 0.94)
	return H

func _hero_card(C: Lyr, o: Dictionary) -> void:
	var art := C.find(".mk-hc-art")
	var pp := "res://assets/ui/art/portrait/" + str(o.id) + ".webp"
	if art and ResourceLoader.exists(pp):
		var pr := UIK.round_image(UITex.get_tex(pp), art.size.x, art.size.y, 11.0, Vector2(0.5, 0.18), 0.0, Color(0, 0, 0, 0), Color("#120e15"), Color("#120e15"))
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
		pr.scale = Vector2.ONE * 0.9             # görsel %10 küçük, çerçevede ortalı
		pr.position += art.size * 0.05
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
		s.texture = UITex.get_tex(p)
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
	# kart sandıktan çıkıyormuş gibi: nadirliğe uygun sandık düşer, açılır, kart çevrilir
	var rr := int(r.get("rar", 1))
	var rw := {}
	if r.kind == "char":
		var C: Dictionary = D.CHARACTERS[r.id]
		rw = {"kind": "char", "id": r.id, "name": C.name, "rarity": float(C.get("rarity", 1)), "char": C, "cards": int(r.n), "isNew": bool(r.get("first", false))}
	else:
		var it = g.gear_by_id(r.id)
		rw = {"kind": "gear", "id": r.id, "name": it.name, "icon": it.get("icon"), "rarity": it.rarity, "desc": it.get("desc"), "mods": it.get("mods", {}), "cards": int(r.n), "isNew": false}
		rr = int(ChestSystem.rk(it.rarity))
	var ct: String = ["kemik", "kemik", "kemik", "kan", "kadim"][clampi(rr, 0, 4)]
	var first: bool = r.get("first", false)
	var hid: String = str(r.id)
	g.ui.chest_ceremony(ct, -1, func():
		menu.refresh_wallet()
		render()
		if first: get_tree().create_timer(0.3).timeout.connect(func(): g.ui.celebrate.hero_unlock(hid)), [rw])

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
		# her zaman ışıklı (rozetli, parlak çerçeveli) paket; ilk alışveriş ×2 iken üstüne
		# iki katlı miktar + ×2 etiketi (eski ×2 sürümü parlamasız, sade kartla çiziliyordu)
		var P := _add("sp_" + str(p.id), K)
		if P == null: continue
		_pack_lyr[p.id] = P
		if x2:
			# ×2 notu yakalamadaki paketlerin üstündeydi: ışıklı paketleri ×2 yerleşimine kaydır
			var ry := float(Lyr.load_json("sp_" + str(p.id) + "_x2").get("rect", [0, 0])[1]) - float(Lyr.load_json("sp_" + str(p.id)).get("rect", [0, 0])[1])
			P.position.y += ry
			_x2_overlay(P, p)
		h = maxf(h, P.position.y + P.nodes[0].size.y)
		var pid: String = p.id
		menu.btn(P, P.nodes[0], func(): _buy_pack(pid), 0.96)
	refresh_prices()
	var box := shell.find_id(K)
	if box: shell.resize_h(box, h)

func _x2_overlay(P: Lyr, p: Dictionary) -> void:
	var tot := int(float(p.amount) + float(p.bonus))
	var am := P.find(".sp-amt")
	if am: P.set_text(am, str(tot * 2))
	var nm := P.find(".sp-name")
	if nm: P.set_text(nm, str(tot) + " + " + str(tot) + " bonus")
	var w: float = P.nodes[0].size.x
	var tag := Node2D.new()
	tag.position = Vector2(w - 40.0, -8.0)
	tag.rotation = 0.12
	P.nodes[0].node.add_child(tag)
	tag.draw.connect(func():
		var sb := StyleBoxFlat.new()
		sb.bg_color = Color("#e8322c")
		sb.set_corner_radius_all(7)
		sb.set_border_width_all(2)
		sb.border_color = Color("#120a0e")
		sb.shadow_color = Color(0.9, 0.2, 0.15, 0.55)
		sb.shadow_size = 6
		tag.draw_style_box(sb, Rect2(0, 0, 44, 22)))
	var tt := UIText.new()
	tt.style(true, 900, 15, 0.5, Color("#fff4dc"), "0 1px 0 rgba(0,0,0,0.8)")
	tt.nowrap = true
	tt.align = 0.5
	tt.wrap_w = 44
	tt.text = "×2"
	tt.position = Vector2(0, 2)
	tag.add_child(tt)

func _buy_pack(id: String) -> void:
	var pack = null
	for p in D.STONE_PACKS:
		if p.id == id: pack = p
	if pack == null: return
	g.buy_stone_pack(id)

## gemler teslim edildi (Game.grant_stone_pack): uçuş efekti + bildirim
func on_pack_granted(id: String, total: float, first: bool) -> void:
	var P = _pack_lyr.get(id)
	if P and is_instance_valid(P): menu.reward_from(P, P.nodes[0])
	render()
	g.ui.toast("+" + str(int(total * 2 if first else total)) + " GEM ALINDI" + (" (×2!)" if first else ""))

## Play'den gelen yerel fiyatları paket kartlarına yaz
func refresh_prices() -> void:
	if g.ui.pay == null: return
	for id in _pack_lyr:
		var P = _pack_lyr[id]
		if P == null or not is_instance_valid(P): continue
		var pr: String = g.ui.pay.price(id)
		var n = P.find(".sp-price")
		if n and pr != "": P.set_text(n, pr)

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
				menu.reward_from(E, E.nodes[0])
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

## vitrindeki sandık görselleri: nefes alır + ara sıra küçük zıplama (mağaza canlı dursun)
var _bob: Array = []   # [Lyr, Lyr.N, faz]
var _bobT := 0.0
func _bobify(V: Lyr) -> void:
	for nn in V.nodes:
		if nn is Lyr.N and str(nn.d.get("tag", "")) == "svg" and nn.size.x >= 50.0:
			_bob.append([V, nn, randf() * TAU])
			break

func _process(dt: float) -> void:
	if not is_visible_in_tree(): return
	if not _bob.is_empty():
		_bobT += dt
		for b in _bob:
			if not is_instance_valid(b[0]): continue
			var ph: float = _bobT * 2.2 + b[2]
			var hop := maxf(0.0, sin(_bobT * 1.6 + b[2]))
			hop = pow(hop, 6.0)
			var sq := 0.025 * sin(ph * 2.0)
			var n: Lyr.N = b[1]
			n.extra = Transform2D(0.04 * sin(ph * 0.5) * hop, Vector2(1.0 + sq, 1.0 - sq), 0, Vector2(0, -sin(ph) * 2.0 - hop * 7.0))
			b[0].set_dyn(n)
	if _cd.is_empty(): return
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
