class_name ScrBattlePass
extends Scr
## ui.js showBattlePass / renderBattlePass / hideBattlePass — SAVAŞ BİLETİ, büyülü kitap:
## kapak sol menteşeden döner (1,35 sn), içerik sırayla belirir; dikey ray — sol ÜCRETSİZ,
## sağ PREMİUM, ortada 50 kademe düğümü; ray dolgusu tamamlanan kademe oranı kadar.
## Yakalama: bpk_main_<0|1> (kartlar/düğümler atlanır, kutuları kalır), bpk_cover, bpk_rowhl,
## bpk_<f|p>_<imza>_<durum>, bpkn_<durum>_<0|1>.

const OPEN_AT := 0.38
var L: Lyr
var cover: Lyr
var _t := 0.0
var _closing := -1.0
var _items: Array = []
var _fade: Array = []        # [[düğüm, gecikme]]
var _fill: Lyr.N
var _fill_h0 := 0.0
var _fill_to := 0.0
var _scroll_once := true

func _init(game) -> void:
	super(game)
	name = "BattlePass"

func open() -> void:
	_t = 0.0
	_closing = -1.0
	_scroll_once = true
	render()
	if cover: cover.queue_free()
	cover = null
	if FileAccess.file_exists(Lyr.BASE + "bpk_cover.json"):
		cover = Lyr.make("bpk_cover")
		add_child(cover)
		var R: Array = Lyr.load_json("bpk_cover").get("rect", [0, 0, 0, 0])
		cover.position = Vector2(float(R[0]), float(R[1]))
		cover.stretch_h(Scr.dh_of(self))
	visible = true
	g.ui.menu.visible = false
	g.audio.play("panel")

func render() -> void:
	var prem: bool = g.bp_has_premium()
	var key := "bpk_main_" + ("1" if prem else "0")
	var keep_scroll := 0.0
	var pages: Lyr.N = null
	if L:
		pages = L.find_id("#bp-pages")
		if pages: keep_scroll = pages.scroll_y
		unbtn(L)
		L.queue_free()
	_items.clear()
	L = Lyr.make(key)
	add_child(L)
	if cover: move_child(cover, -1)
	L.stretch_h(Scr.dh_of(self))
	pages = L.find_id("#bp-pages")
	if pages: scroll_area(L, pages)
	btn(L, L.find_id("#bp-close"), func(): g.audio.play("click"); close())
	var buy := L.find_id("#bp-buy-premium")
	if buy and not prem: btn(L, buy, func(): _buy(), 0.96)
	# üst bilgi
	var tier: int = g.bp_tier()
	var pr: Dictionary = g.bp_progress()
	EventsPage.txt(L, L.find_id("#bp-tier-num"), str(tier), 0.5)
	EventsPage.txt(L, L.find_id("#bp-xptxt"), str(int(pr.cur)) + "/" + str(int(pr.need)) + " GEÇİŞ XP", 0.5)
	var xf := L.find_id("#bp-xpfill")
	if xf:
		var bar: Lyr.N = L.by_id.get(str(xf.d.parent))
		var fr := clampf(float(pr.cur) / maxf(1.0, float(pr.need)), 0.0, 1.0)
		L.set_hidden(xf, fr <= 0.0)
		if fr > 0.0 and bar: L.fit_width(xf, bar.size.x * fr, false)
	EventsPage.txt(L, L.find_id("#bp-season"), str(D.BATTLE_PASS.season), 0.5)
	# satırlar
	var rows := L.find_all(".bp-row").filter(func(n): return not String(n.d.key).contains("::"))
	var defs: Array = D.BATTLE_PASS_TIERS
	for i in mini(rows.size(), defs.size()):
		_row(rows[i], defs[i], tier, prem)
	# ray dolgusu
	_fill = L.find_id("#bp-rail-fill")
	if _fill:
		_fill_h0 = _fill.size.y
		_fill_to = _fill_h0 * minf(1.0, float(tier) / float(D.BATTLE_PASS.maxTier))
		var cur := _fill_to if _t > OPEN_AT + 0.7 else 0.0
		_set_fill(cur)
	# giriş: içerik sırayla belirir (kapak açılırken)
	_fade.clear()
	if _t < OPEN_AT + 1.4:
		for pair in [[".bp-head", 0.48], [".bp-premium-cta", 0.60], ["#bp-pages", 0.70]]:
			var n := L.find_id(pair[0]) if String(pair[0]).begins_with("#") else L.find(pair[0])
			if n: _fade.append([n, float(pair[1])])
		_apply_fade()
	if pages:
		if _scroll_once and tier > 0:
			# şimdiki kademe görünür olsun
			var y: float = rows[clampi(tier - 1, 0, rows.size() - 1)].pos.y if rows.size() else 0.0
			L.set_scroll(pages, clampf(y - pages.size.y * 0.35, 0.0, L.scroll_max(pages)))
		else:
			L.set_scroll(pages, clampf(keep_scroll, 0.0, L.scroll_max(pages)))
	_scroll_once = false

static func _sig(r: Dictionary) -> String:
	match str(r.kind):
		"chest": return str(r.chest)
		"char": return "char" + str(int(r.rarity))
	return str(r.kind)

func _row(row: Lyr.N, def: Dictionary, tier: int, prem: bool) -> void:
	var t := int(def.tier)
	# "şimdi" satırı vurgusu (kartların altında)
	if t == tier and FileAccess.file_exists(Lyr.BASE + "bpk_rowhl.json"):
		var H := Lyr.make("bpk_rowhl")
		row.host.add_child(H)
		row.host.move_child(H, 0)
		_items.append(H)
	var cards := row.kids.filter(func(k): return String(k.d.key).begins_with(".bp-card"))
	for c in cards:
		var track := "premium" if String(c.d.key).contains("premium") else "free"
		var r: Dictionary = def[track]
		var claimed: bool = g.bp_claimed(t, track)
		var can: bool = g.bp_can_claim(t, track)
		var unlocked := t <= tier
		var locked := track == "premium" and not prem
		var st := "claimed" if claimed else ("claimable" if can else ("future" if not unlocked else "locked"))
		if locked and not claimed: st = "lockfut" if not unlocked else "locked"
		var key := "bpk_" + track[0] + "_" + _sig(r) + "_" + st
		if not FileAccess.file_exists(Lyr.BASE + key + ".json"): continue
		var C := Lyr.make(key)
		c.host.add_child(C)
		_items.append(C)
		if r.kind == "rubies" or r.kind == "stone":
			EventsPage.txt(C, C.find(".bp-card-label"), "+" + JS.s(r.amount), 0.5)
		if st == "claimable":
			var tr := track
			btn(C, C.nodes[0], func(): _claim(t, tr), 0.95)
	# düğüm
	var nd: Array = row.kids.filter(func(k): return String(k.d.key).begins_with(".bp-node"))
	if nd.size():
		var mile := t % 10 == 0
		var nst := "done" if t < tier else ("now" if t == tier else "future")
		var nk := "bpkn_" + nst + "_" + ("1" if mile else "0")
		if nst == "now" and mile and not FileAccess.file_exists(Lyr.BASE + nk + ".json"): nk = "bpkn_now_0"
		if FileAccess.file_exists(Lyr.BASE + nk + ".json"):
			var N := Lyr.make(nk)
			row.host.add_child(N)
			var c0: Vector2 = nd[0].pos + nd[0].size * 0.5
			N.position = c0 - N.nodes[0].size * 0.5
			_items.append(N)
			EventsPage.txt(N, N.find_exact("b"), str(t), 0.5)

func _set_fill(h: float) -> void:
	if _fill == null: return
	L.set_hidden(_fill, h <= 0.5)
	if h > 0.5: L.resize_h(_fill, h)

func _apply_fade() -> void:
	for f in _fade:
		var n: Lyr.N = f[0]
		var k := clampf((_t - OPEN_AT - float(f[1])) / 0.62, 0.0, 1.0)
		var e := UIK.bez(0.25, 0.1, 0.25, 1.0, k)
		n.node.modulate.a = e
		n.extra = Transform2D(0, Vector2.ONE, 0, Vector2(0, (1.0 - e) * 6.0))
		L.set_dyn(n)

func _process(dt: float) -> void:
	if not visible: return
	_t += dt
	if _closing >= 0.0:
		_closing += dt
		# kapak geri kapanır (800 ms) → menü
		var k := clampf(_closing / 0.8, 0.0, 1.0)
		_cover_angle(166.0 * (1.0 - UIK.bez(0.5, 0.04, 0.3, 1.0, k)), minf(1.0, _closing / 0.26))
		if k >= 1.0: _finish_close()
		return
	if not _fade.is_empty():
		_apply_fade()
		if _t > OPEN_AT + 1.4: _fade.clear()
	# kapak: rotateY 0 → −166° (1350 ms, cubic-bezier(.6,.04,.26,1)); opaklık 800 ms sonra 460 ms
	if cover and cover.visible:
		var u := clampf((_t - OPEN_AT) / 1.35, 0.0, 1.0)
		var a := 166.0 * UIK.bez(0.6, 0.04, 0.26, 1.0, u)
		var op := 1.0 - clampf((_t - OPEN_AT - 0.8) / 0.46, 0.0, 1.0)
		_cover_angle(a, op)
		if op <= 0.0: cover.visible = false
	# ray dolgusu 0'dan büyür
	if _fill and _t > OPEN_AT + 0.7:
		var k2 := clampf((_t - OPEN_AT - 0.7) / 1.2, 0.0, 1.0)
		if k2 < 1.0 or absf(_fill.size.y - _fill_to) > 0.5: _set_fill(_fill_to * UIK.bez(0.2, 0.8, 0.2, 1.0, k2))

## menteşe dönüşü: x ölçeği cos(açı); 90°'den sonra arka yüz (koyu deri) görünür
func _cover_angle(deg: float, op: float) -> void:
	if cover == null: return
	var c := cos(deg_to_rad(deg))
	cover.scale = Vector2(maxf(0.002, absf(c)), 1.0)
	cover.scale.x *= signf(c) if absf(c) > 0.002 else 1.0
	cover.modulate = Color(1, 1, 1, op) if c >= 0.0 else Color(0.16, 0.12, 0.13, op)

func _claim(t: int, track: String) -> void:
	var toast = g.bp_claim(t, track)
	if toast == null: return
	g.ui.toast(str(toast))
	g.ui.refresh_wallet()
	render()
	g.ui.menu._top()

func _buy() -> void:
	if g.bp_has_premium(): return
	if g.bp_buy_premium():
		render()
		g.ui.refresh_wallet()
		g.ui.toast("PREMİUM GEÇİŞ AÇILDI")
	else:
		g.audio.play("error")
		g.ui.toast("YETERSİZ GEM")

func close() -> void:
	if _closing >= 0.0: return
	if cover and _t > OPEN_AT:
		cover.visible = true
		_closing = 0.0
	else:
		_finish_close()

func _finish_close() -> void:
	visible = false
	_closing = -1.0
	_fade.clear()
	if L:
		unbtn(L)
		L.queue_free()
		L = null
	if cover:
		cover.queue_free()
		cover = null
	_items.clear()
	g.ui.menu.visible = true
	g.ui.menu._top()
