class_name EventsPage
extends Node2D
## ui.js renderEvents + _renderWeek — ETKİNLİK 2.0: üstte BU HAFTA afişi (sezon pip'leri),
## beş sekme (GÜNLÜK · MÜHÜR · KUPA · ZİRVE · ALBÜM), her sekme tek konu:
##   GÜNLÜK  günlük hedefler          MÜHÜR  haftalık mühür (dünya rengi, kademe pulları)
##   KUPA    hayatta kalma kupası afişi + ödül yolu + HAYATTA KAL
##   ZİRVE   rekor şeridi + sonsuz kule (5 kat sütunu) + kâbus döngüsü
##   ALBÜM   dünya rozetleri (conic halka) + başarımlar
## Kabuk pg_etkinlik (#week-box atlanır); bileşenler tools/bake/ui/scn/events.mjs —
## hepsi yerinde yakalandı, konum #week-box'a göre yakalama dikdörtgeninden (_loc).

const TABS := ["gunluk", "muhur", "kupa", "zirve", "album"]

var menu
var g
var shell: Lyr
var root: Lyr.N
var wb: Lyr.N                   # #week-box
var _wb0 := Vector2.ZERO        # yakalamada #week-box mutlak konumu
var _wb_h0 := 0.0
var _scroll_h0 := 0.0
var tab := ""
var _items: Array = []

func _init(m) -> void:
	menu = m
	g = m.g
	name = "Events"

func render() -> void:
	if shell == null:
		shell = Lyr.make("pg_etkinlik")
		add_child(shell)
		shell.stretch_h(Scr.dh_of(self))
		root = shell.nodes[0]
		menu.scroll_area(shell, root)
		wb = shell.find_id("#week-box")
		var R: Array = Lyr.load_json("pg_etkinlik").get("rect", [0, 0, 0, 0])
		if wb:
			_wb0 = Vector2(float(R[0]), float(R[1])) + shell.rect_of(wb).position
			_wb_h0 = wb.size.y
		var S = root.d.get("scroll")
		if S is Dictionary: _scroll_h0 = float(S.h)
	for it in _items:
		if it is Lyr: menu.unbtn(it)
		(it as Node).queue_free()
	_items.clear()
	if wb == null: return
	var bottom := _hero()
	var dLeft: int = Journey.daily_left(g.meta)
	var kReady := _kupa_ready()
	if tab == "": tab = "kupa" if kReady else ("gunluk" if dLeft else "kupa")
	bottom = maxf(bottom, _tabs(dLeft, kReady))
	match tab:
		"gunluk": bottom = maxf(bottom, _gunluk())
		"muhur": bottom = maxf(bottom, _muhur())
		"kupa": bottom = maxf(bottom, _kupa())
		"zirve": bottom = maxf(bottom, _zirve())
		"album": bottom = maxf(bottom, _album())
	# kaydırma içeriği: #week-box yüksekliği içeriğe göre
	var dh := bottom - _wb_h0
	var S = root.d.get("scroll")
	if S is Dictionary: S.h = _scroll_h0 + dh
	shell.set_scroll(root, clampf(root.scroll_y, 0.0, shell.scroll_max(root)))

# ═════════════ yardımcılar ═════════════

func _loc(key: String) -> Vector2:
	var R: Array = Lyr.load_json(key).get("rect", [0, 0, 0, 0])
	return Vector2(float(R[0]), float(R[1])) - _wb0

func _h(key: String) -> float:
	var R: Array = Lyr.load_json(key).get("rect", [0, 0, 0, 0])
	return float(R[3])

## bileşeni #week-box'a (ya da verilen düğüme) ekle
func _add(key: String, pos = null, parent: Lyr.N = null) -> Lyr:
	if not FileAccess.file_exists(Lyr.BASE + key + ".json"): return null
	var C := Lyr.make(key)
	(parent if parent else wb).host.add_child(C)
	C.position = (_loc(key) if pos == null else pos) if parent == null else (pos if pos != null else Vector2.ZERO)
	_items.append(C)
	return C

## tek satır yazı: kutunun sol (0) / orta (0,5) / sağ (1) noktası sabit kalır
static func txt(L: Lyr, n: Lyr.N, s: String, anchor := 0.5) -> float:
	if n == null or n.txt == null: return 0.0
	var x0 := n.txt.position.x
	var w0 := n.txt.wrap_w
	L.set_text(n, s)
	var w1 := n.txt.wrap_w
	n.txt.position.x = x0 + (w0 - w1) * anchor
	if n.txt_shadow: n.txt_shadow.position.x = n.txt.position.x
	return w1 - w0

## "ÖN EK <b>sayı</b>" satırı: grup bütün olarak sol/orta/sağa yaslı kalır
static func inline_num(L: Lyr, par: Lyr.N, b: Lyr.N, s: String, anchor := 0.5) -> void:
	if b == null or b.txt == null: return
	var w0 := b.txt.text_width()
	L.set_text(b, s)
	var dw := b.txt.text_width() - w0
	if absf(dw) < 0.01: return
	L.fit_width(b, b.size.x + dw, false)
	var sh := -dw * anchor
	L.move(b, b.pos + Vector2(sh, 0))
	if par and par.txt:
		par.txt.position.x += sh
		if par.txt_shadow: par.txt_shadow.position.x = par.txt.position.x

func _kid(L: Lyr, n: Lyr.N, tag: String) -> Lyr.N:
	if n == null: return null
	for k in n.kids:
		if k.d.get("tag") == tag: return k
	return null

func _kupa_ready() -> int:
	var n := 0
	for m in D.SURVIVAL_MILESTONES:
		if not g.milestone_claimed(m.id) and g.can_claim_milestone(m): n += 1
	return n

# ═════════════ BU HAFTA afişi + sekmeler ═════════════

func _hero() -> float:
	var C: Dictionary = Calendar.current(D.WORLDS.size())
	var H := _add("ev_hero_" + str(C.ev.id) + "_" + ("1" if C.weekend else "0"))
	if H == null: H = _add("ev_hero_kor_0")
	if H == null: return 0.0
	var left := maxf(0.0, float(C.leftMs))
	var dd := int(floor(left / 864e5))
	var hh := int(floor(fmod(left, 864e5) / 36e5))
	var fw = D.WORLDS[int(C.featured) - 1] if int(C.featured) >= 1 and int(C.featured) <= D.WORLDS.size() else null
	var line: String = (str(fw.name) + " haritasında altın ×2") if C.ev.id == "biyom" and fw else str(C.ev.line)
	txt(H, H.find(".wke-n"), str(C.ev.name))
	txt(H, H.find(".wke-l"), line)
	txt(H, H.find(".wke-t"), (str(dd) + " GÜN " + str(hh) + " SA") if dd > 0 else (str(hh) + " SA"), 1.0)
	var w: int = Journey.season_week()
	var SN: Dictionary = Journey.SEASON[w]
	txt(H, H.find(".ws-k"), "SEZON · BÖLÜM " + str(w + 1) + "/" + str(Journey.SEASON.size()) + " · " + str(SN.n))
	txt(H, H.find(".ws-l"), str(SN.l))
	var pp := H.find(".ws-pips")
	if pp and FileAccess.file_exists(Lyr.BASE + "ev_pips_" + str(w) + ".json"):
		var P := Lyr.make("ev_pips_" + str(w))
		pp.node.add_child(P)
	return H.position.y + H.nodes[0].size.y

func _tabs(dLeft: int, kReady: int) -> float:
	var bottom := 0.0
	for t in TABS:
		var on: bool = t == tab
		var T := _add("ev_tab_" + t + ("_on" if on else "_off"))
		if T == null: continue
		bottom = maxf(bottom, T.position.y + T.nodes[0].size.y)
		var n := dLeft if t == "gunluk" else (kReady if t == "kupa" else 0)
		if n > 0:
			var bk := "ev2n_hot" if t == "kupa" else "ev2n"
			var ref := "ev_tab_kupa_on" if t == "kupa" else "ev_tab_gunluk_on"
			var rel := _loc(bk) - _loc(ref)
			var B := _add(bk, T.position + rel)
			if B: B.set_text(B.nodes[0], str(n))
		var tt: String = t
		menu.btn(T, T.nodes[0], func(): _tab_tap(tt), 0.95)
	return bottom

func _tab_tap(t: String) -> void:
	if t == tab: return
	tab = t
	g.audio.play("tab")
	var nav_y := _loc("ev_tab_kupa_on").y + wb.pos.y
	if root.scroll_y > nav_y: shell.set_scroll(root, maxf(0.0, nav_y - 8.0))
	render()

# ═════════════ GÜNLÜK ═════════════

func _gunluk() -> float:
	var Dc := _add("ev_daily")
	if Dc == null: return 0.0
	var L: Array = Journey.daily_list(g.meta)
	var left: int = Journey.daily_left(g.meta)
	var hd := Dc.find(".dl-h")
	txt(Dc, _kid(Dc, hd, "small"), (str(3 - left) + "/3 · ÖDÜL TAHTA SANDIK") if left else "TAMAMLANDI · YARIN YENİLENİR", 1.0)
	var rows := Dc.find_all(".dl-q")
	for i in mini(rows.size(), L.size()):
		var q: Dictionary = L[i]
		var Q := _add("ev_dq_" + ("1" if q.done else "0"), Vector2.ZERO, rows[i])
		if Q: txt(Q, _kid(Q, Q.nodes[0], "span"), str(q.t), 0.0)
	return Dc.position.y + Dc.nodes[0].size.y

# ═════════════ MÜHÜR ═════════════

func _muhur() -> float:
	var S: Dictionary = Calendar.seal(g.progress, D.WORLDS.size())
	var B: Dictionary = Calendar.book(g.meta)
	var wd: Dictionary = D.WORLDS[clampi(int(S.w), 1, D.WORLDS.size()) - 1]
	var M := _add("ev_seal_" + str(int(wd.id)))
	if M == null: return 0.0
	var best := int(B.get("best", 0))
	var sb := M.find(".sl-best")
	inline_num(M, sb, _kid(M, sb, "b"), str(best), 1.0)
	txt(M, M.find(".sl-title"), str(wd.name) + " · GÖREV " + str(int(S.m)))
	var rn := M.find(".sl-rn")
	var rl := M.find(".sl-rl")
	if rn and rn.txt:
		var w0 := rn.txt.text_width()
		M.set_text(rn, str(S.rule.name))
		var dw := rn.txt.text_width() - w0
		M.fit_width(rn, rn.size.x + dw, false)
		if rl: M.move(rl, rl.pos + Vector2(dw, 0))
	txt(M, rl, str(S.rule.line), 0.0)
	var tiers: Array = Calendar.SEAL_TIERS
	var top: float = float(tiers[tiers.size() - 1].need)
	var rail := M.find(".sl-rail")
	if rail:
		var fi := _kid(M, rail, "i")
		if fi:
			var fr := minf(1.0, best / top)
			M.set_hidden(fi, fr <= 0.0)
			if fr > 0.0: M.fit_width(fi, rail.size.x * fr, false)
	var go := M.find_id("#seal-go")
	if go: txt(M, _kid(M, go, "small"), (str(int(B.runs)) + " DENEME") if int(B.get("runs", 0)) else "SINIRSIZ DENEME")
	for i in tiers.size():
		var got: bool = (B.get("got", []) as Array).has(tiers[i].id)
		_add("ev_tier_" + str(i) + "_" + ("1" if got else "0"))
	if go: menu.btn(M, go, func(): g.audio.play("cta"); g.start_seal(), 0.97)
	return M.position.y + M.nodes[0].size.y

# ═════════════ KUPA ═════════════

func _kupa() -> float:
	var mils: Array = D.SURVIVAL_MILESTONES
	var mins: int = g.survival_minutes()
	var reached := 0
	for m in mils:
		if mins >= int(m.need): reached += 1
	var next = null
	for m in mils:
		if mins < int(m.need):
			next = m
			break
	var prev_need := 0
	for m in mils:
		if int(m.need) <= mins: prev_need = int(m.need)
	# afiş
	var P := _add("ev_poster")
	if P:
		var stg := P.find_id("#event-stage")
		if stg and stg.txt:
			var w0 := stg.txt.text_width()
			P.set_text(stg, "AŞAMA " + str(reached) + " / " + str(mils.size()))
			var dw := stg.txt.text_width() - w0
			P.fit_width(stg, stg.size.x + dw, false)
			P.move(stg, stg.pos - Vector2(dw, 0))
		var tot := P.find_id("#event-total")
		var dw2 := txt(P, tot, str(mins), 0.0)
		var em := _kid(P, P.find(".evm-count"), "em")
		if em: P.move(em, em.pos + Vector2(dw2, 0))
		txt(P, P.find_id("#event-next"), (str(int(next.need) - mins) + " DK KALDI") if next else "YOL TAMAMLANDI", 1.0)
		var fill := P.find_id("#event-bar-fill")
		var rail := P.find(".evm-rail")
		if fill and rail:
			var fr := 1.0
			if next: fr = minf(1.0, float(mins - prev_need) / maxf(1.0, float(int(next.need) - prev_need)))
			P.set_hidden(fill, fr <= 0.0)
			if fr > 0.0: P.fit_width(fill, (rail.size.x - 2.0) * fr, false)
	# bölüm başlığı
	var ready := _kupa_ready()
	var Sc := _add("ev_sec_hot" if ready else "ev_sec")
	if Sc: txt(Sc, Sc.find_id("#event-ready"), (str(ready) + " ÖDÜL HAZIR") if ready else (str(reached) + " / " + str(mils.size()) + " AÇILDI"), 1.0)
	# ödül yolu
	var y0 := _loc("ev_stop_0_claimed").y
	var gap := _loc("ev_stop_1_claimed").y - y0 - _h("ev_stop_0_claimed")
	var x0 := _loc("ev_stop_0_claimed").x
	var y := y0
	for i in mils.size():
		var ms: Dictionary = mils[i]
		var claimed: bool = g.milestone_claimed(ms.id)
		var can: bool = g.can_claim_milestone(ms)
		var hit := mins >= int(ms.need)
		var is_next: bool = next != null and int(next.need) == int(ms.need)
		var st := "claimed" if claimed else ("ready" if can else ("reached" if hit else ("next" if is_next else "locked")))
		var T := _add("ev_stop_" + str(i) + "_" + st, Vector2(x0, y))
		if T == null: continue
		y += T.nodes[0].size.y + gap
		var nd := T.find(".evs-need")
		if nd: txt(T, nd, str(maxi(1, int(ms.need) - mins)) + " dk", 1.0)
		var cl := T.find(".evs-claim")
		if cl:
			var mid: String = ms.id
			menu.btn(T, cl, func(): g.claim_milestone(mid), 0.95)
	var track_end := y - gap
	# HAYATTA KAL
	var dock_gap := _loc("ev_dock").y - (_loc("ev_stop_7_locked").y + _h("ev_stop_7_locked"))
	var Dk := _add("ev_dock", Vector2(_loc("ev_dock").x, track_end + dock_gap))
	if Dk == null: return track_end
	txt(Dk, Dk.find_id("#event-battle-sub"), ("Sonraki ödüle " + str(int(next.need) - mins) + " dk") if next else "Tüm ödüller açıldı", 0.0)
	var bb := Dk.find_id("#event-battle")
	if bb: menu.btn(Dk, bb, func():
		g.audio.play("cta")
		var nm: Dictionary = menu.home_target()
		g.start_run(int(nm.w), int(nm.m)), 0.97)
	return Dk.position.y + Dk.nodes[0].size.y

# ═════════════ ZİRVE ═════════════

func _zirve() -> float:
	var mpw: int = D.MISSIONS_PER_WORLD
	var nw: int = D.WORLDS.size()
	var T: Dictionary = SideModes.tower_book(g.meta)
	var N: Dictionary = SideModes.nm_book(g.meta)
	var B: Dictionary = Calendar.book(g.meta)
	# rekor şeridi
	var p_open: bool = int(g.progress.get(nw, 0)) >= mpw
	var Pk := _add("ev_peak_" + ("1" if p_open else "0"))
	if Pk:
		var mds := Pk.find_all(".pk-md")
		var vals := [int(T.get("best", 0)), int(B.get("best", 0)), int(N.get("clears", 0))]
		for i in mini(3, mds.size()): txt(Pk, _kid(Pk, mds[i], "b"), str(vals[i]))
	# sonsuz kule
	var t_open: bool = int(g.progress.get(1, 0)) >= mpw
	var Tw := _add("ev_tower_" + ("1" if t_open else "0"))
	var bottom := 0.0
	if Tw:
		var k: int = int(T.cur)
		var base := int(floor((k - 1) / 5.0)) * 5
		var fl := Tw.find_all(".tw-f")
		for j in mini(5, fl.size()):
			var f := base + 5 - j
			var F: Dictionary = SideModes.floor_def(f, nw, mpw)
			var st := "done" if f < k else ("cur" if f == k else "up")
			var Fl := _add("ev_twf_" + st + "_" + ("1" if F.boss else "0") + "_" + str(int(F.w)), Vector2.ZERO, fl[j])
			if Fl:
				txt(Fl, _kid(Fl, Fl.nodes[0], "b"), str(f))
				var fw: Dictionary = D.WORLDS[clampi(int(F.w), 1, nw) - 1]
				txt(Fl, _kid(Fl, Fl.nodes[0], "em"), "BOSS" if F.boss else str(fw.name), 0.0)
		var Fk: Dictionary = SideModes.floor_def(k, nw, mpw)
		var wk: Dictionary = D.WORLDS[clampi(int(Fk.w), 1, nw) - 1]
		var tc := Tw.find(".tw-cur")
		inline_num(Tw, tc, _kid(Tw, tc, "b"), str(k), 0.5)
		var tls := Tw.find_all(".tw-l")
		if tls.size() >= 1: txt(Tw, tls[0], str(wk.name) + (" · BOSS KATI" if Fk.boss else ""))
		if tls.size() >= 2: txt(Tw, tls[1], "EN YÜKSEK " + str(int(T.get("best", 0))) + " · KAT BAŞI " + JS.s(SideModes.tower_floor_gold(k)) + " ALTIN")
		var mil := Tw.find(".tw-mil")
		if mil and mil.txt:
			var nm := int(ceil(k / 10.0)) * 10
			var w0 := mil.txt.text_width()
			Tw.set_text(mil, "KAT " + str(nm) + " · +" + str(10 + nm) + " GEM")
			mil.txt.position.x -= (mil.txt.text_width() - w0) * 0.5
			Tw.fit_width(mil, mil.size.x + mil.txt.text_width() - w0, false)
		var go := Tw.find_id("#tower-go")
		if go and t_open: menu.btn(Tw, go, func(): g.audio.play("cta"); g.start_tower(), 0.97)
		bottom = Tw.position.y + Tw.nodes[0].size.y
	# kâbus döngüsü
	var n_open: bool = SideModes.nm_open(g.progress, nw, mpw)
	var Nm := _add("ev_nm_" + ("1" if n_open else "0"))
	if Nm:
		var w: int = int(N.get("w", 1))
		var m: int = int(N.get("m", 1))
		var wd: Dictionary = D.WORLDS[clampi(w, 1, nw) - 1]
		var lft := maxi(0, int(SideModes.NM.frameAt) - int(N.get("clears", 0)))
		txt(Nm, Nm.find(".nm-n"), ("DÜNYA " + str(w) + " · GÖREV " + str(m)) if n_open else "DÜNYA 10'U BİTİR")
		var nls := Nm.find_all(".nm-l")
		if nls.size() >= 1: txt(Nm, nls[0], (str(wd.name) + " · her elit iki özellik · altın ×2") if n_open else "Aynı on dünya gece yüzüyle, çok daha sert döner.")
		if nls.size() >= 2: txt(Nm, nls[1], (("KABUS ÇERÇEVESİNE " + str(lft) + " ZAFER") if lft else "KABUS ÇERÇEVESİ SENDE") + " · İLK ZAFER " + str(int(SideModes.NM.gem)) + " GEM")
		var tr := Nm.find(".nm-track")
		var tk := "ev_nmt_" + str(w if n_open else 0)
		if tr and FileAccess.file_exists(Lyr.BASE + tk + ".json"): _add(tk, Vector2.ZERO, tr)
		var go := Nm.find_id("#nm-go")
		if go and n_open: menu.btn(Nm, go, func(): g.audio.play("cta"); g.start_nightmare(), 0.97)
		bottom = Nm.position.y + Nm.nodes[0].size.y
	return bottom

# ═════════════ ALBÜM ═════════════

func _album() -> float:
	var per: int = D.MISSIONS_PER_WORLD
	var A := _add("ev_album")
	var bottom := 0.0
	if A:
		var full := 0
		var bs := A.find_all(".al-b")
		for i in D.WORLDS.size():
			var wd: Dictionary = D.WORLDS[i]
			var s: int = Ledger.world_stars(g.meta, int(wd.id), per)
			var boss: bool = int(g.progress.get(int(wd.id), 0)) >= per
			var done := s >= per * 3 and boss
			if done: full += 1
			if i >= bs.size(): continue
			var bn: Lyr.N = bs[i]
			var Bd := _add("ev_alb", Vector2.ZERO, bn)
			if Bd == null: continue
			var r0: Lyr.N = Bd.nodes[0]
			if r0.img: r0.img.visible = false
			var pie := ColorRect.new()
			pie.size = r0.size
			pie.mouse_filter = Control.MOUSE_FILTER_IGNORE
			var mat := UIK.shader_mat("res://shaders/ui/pie_badge.gdshader")
			mat.set_shader_parameter("wc", Color(str(wd.color)))
			mat.set_shader_parameter("p", roundf(float(s) / (per * 3) * 100.0))
			mat.set_shader_parameter("s", r0.size.x)
			pie.material = mat
			r0.node.add_child(pie)
			r0.node.move_child(pie, 0)
			txt(Bd, _kid(Bd, r0, "b"), str(int(wd.id)))
			Bd.modulate.a = 1.0 if done else (0.8 if boss else 0.55)
		var evo := (g.meta.get("evo", []) as Array).size()
		txt(A, _kid(A, A.find(".al-h"), "small"), str(full) + "/" + str(D.WORLDS.size()) + " ROZET · " + str(evo) + " EVRİM KEŞFİ", 1.0)
		bottom = A.position.y + A.nodes[0].size.y
	# başarımlar
	var Bk: Dictionary = Ach.book(g.meta)
	var title := str(Bk.get("title", ""))
	var Ac := _add("ev_ach_t" if title != "" else "ev_ach")
	if Ac:
		var sm := Ac.find_exact("summary")
		if sm:
			var b := _kid(Ac, sm, "b")
			var dw := txt(Ac, b, str(Ach.count(g.meta)) + " / " + str(Ach.ACH.size()), 0.0)
			var et := Ac.find(".ach-title")
			if et:
				Ac.move(et, et.pos + Vector2(dw, 0))
				txt(Ac, et, title, 0.0)
		var rows := Ac.find_all(".ach-row")
		var d: Dictionary = Bk.get("d", {})
		var stt: Dictionary = Bk.get("s", {})
		for i in mini(rows.size(), Ach.ACH.size()):
			var a: Dictionary = Ach.ACH[i]
			var done: bool = JS.truthy(d.get(a.id))
			var R := _add("ev_achr_" + ("1" if done else "0"), Vector2.ZERO, rows[i])
			if R == null: continue
			var t := R.find(".ach-t")
			txt(R, _kid(R, t, "b"), str(a.name))
			txt(R, _kid(R, t, "em"), str(a.desc))
			var bar := R.find(".ach-bar")
			if bar and not done:
				var fi := _kid(R, bar, "i")
				var p := Ach.progress(g.meta, a)
				if fi:
					R.set_hidden(fi, p <= 0.0)
					if p > 0.0: R.fit_width(fi, bar.size.x * p, false)
			var ar := R.find_exact(".ach-r")
			var cur := mini(int(a.n), JS.i(stt.get(a.st)))
			var rw := []
			if a.get("gold"): rw.append(str(int(a.gold)) + " altın")
			if a.get("gem"): rw.append(str(int(a.gem)) + " gem")
			if ar:
				txt(R, ar, "ALINDI" if done else ((str(cur) if a.get("max") else ShopPage.fmt_tr(cur)) + "/" + ShopPage.fmt_tr(float(a.n))), 1.0)
				txt(R, _kid(R, ar, "small"), " + ".join(rw), 1.0)
		bottom = Ac.position.y + Ac.nodes[0].size.y
	return bottom
