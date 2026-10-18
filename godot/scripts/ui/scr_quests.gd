class_name ScrQuests
extends Scr
## ui.js showQuests / renderQuests — GÖREVLER: hafta puanı + kuşak (3 kademe ödül rafı),
## 7 günlük giriş takvimi (telafi hakkı, ÖDÜLÜ AL), görev defteri (alınacaklar üstte).
## Yakalama: qx kabuğu + qx_track_<k>, qx_tier_<i>_<durum>, qx_day_<d>_<durum>,
## qx_mk_<on|off>, qx_claim_<0|1>, qx_q_<id>_<prog|ready|taken>.

var L: Lyr
var _c0 := {}           # kap → yakalamadaki mutlak konum
var _items: Array = []
var _count_t := -1.0

func _init(game) -> void:
	super(game)
	name = "Quests"

func open() -> void:
	if g.dailies: g.dailies.touch()
	if L:
		unbtn(L)
		L.queue_free()
	L = Lyr.make("qx")
	add_child(L)
	L.stretch_h(Scr.dh_of(self))
	var body := L.find(".qx-body")
	if body: scroll_area(L, body)
	_c0.clear()
	for k in ["#q-vit", "#q-cal", "#q-list", "#q-makeup", "#q-claim-daily"]:
		var n := L.find_id(k)
		if n: _c0[k] = L.rect_of(n).position
	btn(L, L.find_id("#q-close"), func(): g.audio.play("click"); close())
	visible = true
	fade_show()
	g.ui.menu.visible = false     # hideAllScreens: menü arkada çizilmez
	g.audio.play("panel")
	render()
	_count_t = 0.0

func _loc(key: String, cont: String) -> Vector2:
	var R: Array = Lyr.load_json(key).get("rect", [0, 0, 0, 0])
	return Vector2(float(R[0]), float(R[1])) - _c0.get(cont, Vector2.ZERO)

func _add(key: String, cont: String, pos = null) -> Lyr:
	if not FileAccess.file_exists(Lyr.BASE + key + ".json"): return null
	var n := L.find_id(cont)
	if n == null: return null
	var C := Lyr.make(key)
	n.host.add_child(C)
	C.position = _loc(key, cont) if pos == null else pos
	_items.append(C)
	return C

func render() -> void:
	var d: Dailies = g.dailies
	if d == null or L == null: return
	for it in _items:
		unbtn(it)
		(it as Node).queue_free()
	_items.clear()
	# hafta puanı + geri sayım
	var pts := d.points()
	_pts(pts)
	var ms := Dailies.week_left_ms()
	var hrs := int(floor(ms / 3600000.0))
	EventsPage.txt(L, L.find_id("#q-timer-v"), (str(hrs / 24) + " gün " + str(hrs % 24) + " sa") if hrs >= 24 else (str(hrs) + " sa " + str(int(fmod(ms, 3600000.0) / 60000.0)) + " dk"), 0.0)
	# kuşak
	var tiers: Array = Dailies.WEEKLY_TIERS
	var on := 0
	for t in tiers:
		if pts >= int(t.pts): on += 1
	var T := _add("qx_track_" + str(on), "#q-vit")
	if T:
		var f := T.find(".qx-track-fill")
		var fr := minf(1.0, float(pts) / Dailies.WEEKLY_MAX_PTS)
		if f:
			T.set_hidden(f, fr <= 0.0)
			if fr > 0.0: T.fit_width(f, T.nodes[0].size.x * fr, false)
	for i in tiers.size():
		var taken: bool = (d.q.tiers as Array).has(i)
		var ready := not taken and d.tier_ready(i)
		var st := "taken" if taken else ("ready" if ready else "locked")
		var C := _add("qx_tier_" + str(i) + "_" + st, "#q-vit")
		if C == null: continue
		if st == "locked": EventsPage.txt(C, C.find(".qx-tier-s"), str(int(tiers[i].pts) - pts) + " P KALDI")
		if ready:
			var ii := i
			btn(C, C.nodes[0], func(): _claim_tier(ii), 0.95)
	# günlük takvim
	var slot := int(d.q.slot)
	var took := d.claimed_today()
	EventsPage.txt(L, L.find_id("#q-streak-txt"), str(slot) + ". GÜN / 7" + ((" · " + str(int(d.q.cycle)) + ". TUR") if int(d.q.cycle) > 1 else ""), 1.0)
	for s in Dailies.DAILY_STREAK:
		var day := int(s.day)
		var st := "future"
		if day == slot: st = "nowtaken" if took else "open"
		elif day < slot: st = "taken"
		_add("qx_day_" + str(day - 1) + "_" + st, "#q-cal")
	var used := d.used_makeup_today()
	var mk_on := int(d.q.makeup) > 0 and not used
	var M := _add("qx_mk_" + ("on" if mk_on else "off"), "#q-makeup", Vector2.ZERO)
	if M: EventsPage.txt(M, M.nodes[0], "SERİ KORUNDU" if used else ("TELAFİ ×1" if int(d.q.makeup) > 0 else "TELAFİ YOK"), 0.0)
	var CB := _add("qx_claim_" + ("1" if took else "0"), "#q-claim-daily", Vector2.ZERO)
	if CB and not took: btn(CB, CB.nodes[0], func(): _claim_daily(), 0.97)
	# görev defteri: alınacaklar üstte, sonra ilerleme, alınanlar dipte
	var rows := []
	var done_n := 0
	for def in Dailies.WEEKLY_QUESTS:
		var cur := mini(d.prog(def), int(def.need))
		var ok := d.done(def)
		var tk := d.claimed_quest(def.id)
		if ok: done_n += 1
		rows.append({"def": def, "cur": cur, "ok": ok, "taken": tk, "p": minf(1.0, float(cur) / float(def.need)), "rank": 2 if tk else (0 if ok else 1)})
	var idx := range(rows.size())
	idx.sort_custom(func(a, b):
		if rows[a].rank != rows[b].rank: return rows[a].rank < rows[b].rank
		if rows[a].p != rows[b].p: return rows[a].p > rows[b].p
		return a < b)
	EventsPage.txt(L, L.find_id("#q-done-txt"), str(done_n) + " / " + str(Dailies.WEEKLY_QUESTS.size()) + " TAMAM", 1.0)
	var q0 := _loc("qx_q_kills_prog", "#q-list")
	var step := _loc("qx_q_missions_prog", "#q-list").y - q0.y
	for j in idx.size():
		var r: Dictionary = rows[idx[j]]
		var def: Dictionary = r.def
		var st := "taken" if r.taken else ("ready" if r.ok else "prog")
		var Q := _add("qx_q_" + str(def.id) + "_" + st, "#q-list", Vector2(q0.x, q0.y + j * step))
		if Q == null: continue
		var nn := Q.find(".qx-q-n")
		if nn:
			var b: Lyr.N = null
			var em: Lyr.N = null
			for k in nn.kids:
				if k.d.get("tag") == "b": b = k
				elif k.d.get("tag") == "em": em = k
			if b and b.txt:
				var dw := EventsPage.txt(Q, b, ShopPage.fmt_tr(r.cur), 0.0)
				if absf(dw) > 0.01:
					if nn.txt:
						nn.txt.position.x += dw
						if nn.txt_shadow: nn.txt_shadow.position.x = nn.txt.position.x
					if em: Q.move(em, em.pos + Vector2(dw, 0))
		var bar := Q.find(".qx-q-bar")
		if bar:
			for k in bar.kids:
				if k.d.get("tag") == "i":
					Q.set_hidden(k, r.p <= 0.0)
					if r.p > 0.0: Q.fit_width(k, bar.size.x * r.p, false)
		var tb := Q.find(".qx-take")
		if tb:
			var qid: String = def.id
			btn(Q, tb, func(): _claim_quest(qid), 0.95)
	g.ui.menu._top()

func _pts(v: int) -> void:
	var pe := L.find_id("#q-pts")
	if pe == null or pe.txt == null: return
	var dw := EventsPage.txt(L, pe, str(v), 0.0)
	if absf(dw) < 0.01: return
	var par: Lyr.N = L.by_id.get(str(pe.d.parent))
	if par:
		for k in par.kids:
			if k != pe: L.move(k, k.pos + Vector2(dw, 0))

func _process(dt: float) -> void:
	# puan sayacı 0'dan sayar (~620 ms, ease-out cubic)
	if not visible or _count_t < 0.0 or g.dailies == null: return
	_count_t += dt
	var to: int = g.dailies.points()
	var u := minf(1.0, _count_t / 0.62)
	if to > 0: _pts(int(round(to * (1.0 - pow(1.0 - u, 3.0)))))
	if u >= 1.0: _count_t = -1.0

func _grant(r, snd: String) -> void:
	var toast = g.grant_quest_reward(r)
	if toast == null:
		g.audio.play("error")
		return
	g.audio.play(snd if snd != "" else ("chestrare" if str(toast).contains("SANDIK") else "coin"))
	_count_t = -1.0
	render()
	g.ui.refresh_wallet()
	g.ui.toast(str(toast))

func _claim_daily() -> void:
	var d: Dailies = g.dailies
	if d.claimed_today():
		g.audio.play("error")
		return
	_grant(d.claim_daily(), "")

func _claim_quest(id: String) -> void:
	_grant(g.dailies.claim_quest(id), "claim")

func _claim_tier(i: int) -> void:
	_grant(g.dailies.claim_tier(i), "tierclaim")

func close() -> void:
	if not visible: return
	g.ui.menu.visible = true
	fade_hide(_close_now)

func _close_now() -> void:
	visible = false
	g.ui.menu.visible = true
	_count_t = -1.0
	for it in _items: (it as Node).queue_free()
	_items.clear()
	if L:
		unbtn(L)
		L.queue_free()
		L = null
	g.ui.menu._top()
