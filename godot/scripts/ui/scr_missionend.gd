class_name ScrMissionEnd
extends Scr
## ui.js showMissionEnd + _meSequence + _renderLedger — GÖREV SONU.
## Taban: me_won / me_lost (sıralı tören animasyonlarıyla). Dinamik: başlık,
## süre/kıyım, dalga satırı, yıldız defteri (açık/kapalı/yeni), çipler (mec_*),
## ustalık (çubuk dolumu / seviye atladı şeridi), ganimet (me_loot_<sandık> /
## yuvalar dolu / boş), altın sayacı, hedef satırı, düğmeler. Kart sütunu görünür
## bloklara göre yeniden dizilir; dokununca tören anında oturur.

const SEQ := [["#me-stats", 0.0], ["#me-wave", 0.12], ["#me-loot", 0.4], ["#me-rewards", 0.8],
	[".mel-row1", 1.15], [".mel-chips", 1.4], [".mel-mas", 1.6], [".me-goal", 1.8], [".me-actions", 1.95]]

var L: Lyr
var extra: Array = []          # eklenen alt katmanlar (ganimet, çipler, ustalık)
var won := false
var s := {}
var _t := 0.0
var _seqDone := false
var _tallyAt := -1.0
var _tallyN := 0
var _tallyB: Lyr.N
var _bar: Lyr.N
var _barA := 0.0
var _barB := 0.0
var _seqNodes: Array = []

func _init(game) -> void:
	super(game)
	name = "MissionEnd"

func _clear() -> void:
	for e in extra: (e as Node).queue_free()
	extra.clear()
	if L: L.queue_free(); L = null
	clear_btns()

static func fmt_time(sec: float) -> String:
	var t := maxi(0, int(floor(sec)))
	return "%02d:%02d" % [t / 60, t % 60]

func show_end(w: bool, payload: Dictionary) -> void:
	_clear()
	won = w
	s = payload
	_t = 0.0
	_seqDone = false
	_tallyAt = -1.0
	_bar = null
	_bar_L = null
	L = Lyr.make("me_won" if won else "me_lost")
	add_child(L)
	L.stretch_h(Scr.dh_of(self))
	var wd: Dictionary = g.world_def()
	# başlık
	var fc := bool(s.get("firstClear", false))
	if won:
		_txt("#me-eyebrow", "DÜNYA " + str(g.worldId) + " · GÖREV " + str(g.missionId) + (" · İLK GEÇİŞ" if fc else " · TEKRAR"))
		_txt("#me-title", "BOSS DÜŞTÜ" if s.get("bossDrop", false) else "GÖREV TAMAMLANDI")
	else:
		_txt("#me-eyebrow", "DÜNYA " + str(g.worldId) + " · GÖREV " + str(g.missionId))
		_txt("#me-title", "DÜŞTÜN")
	var vs := L.find_all(".ms-v")
	if vs.size() >= 2:
		L.set_text(vs[0], fmt_time(float(s.get("time", 0))))
		L.set_text(vs[1], str(int(s.get("kills", 0))))
	_txt("#me-wave", "DALGA " + str(int(s.get("wave", 1))) + " / " + str(int(g.msn.get("waves", 0))) + " · SEVİYE " + str(int(s.get("level", 1))))
	_ledger(s.get("ledger"))
	_loot()
	# altın
	var rb := L.find(".me-ruby")
	_tallyB = null
	for k in (rb.kids if rb else []):
		if String(k.d.key) == "b": _tallyB = k
	_tallyN = int(s.get("rubies", 0))
	if _tallyB:
		L.set_text(_tallyB, "+0" if _tallyN > 0 else "+" + str(_tallyN))
	_goal()
	_buttons()
	_relayout()
	_sequence()
	visible = true

func _txt(key: String, v: String) -> void:
	var n := L.find(key)
	if n: L.set_text(n, v)

# ── yıldız defteri ──
func _ledger(Ld) -> void:
	var box := L.find(".me-ledger")
	if not (Ld is Dictionary):
		L.set_hidden(box, true)
		return
	var stars := L.find_all(".mel-star")
	# açık / kapalı görüntüleri yakalamadan (açık yıldız ilk ikisi, kapalı üçüncü)
	var on_tex := {}
	var off_tex := {}
	for st in stars:
		var on := String(st.d.key).contains(".on")
		for k in _desc(st):
			if k.img is Sprite2D:
				var key: String = String(k.d.key)
				var spr := k.img as Sprite2D
				if on and not on_tex.has(key): on_tex[key] = [spr.texture, spr.position, spr.scale]
				if not on and not off_tex.has(key): off_tex[key] = [spr.texture, spr.position, spr.scale]
	var mask := int(Ld.get("mask", 0))
	var nmask := int(Ld.get("newMask", 0))
	for i in stars.size():
		var st: Lyr.N = stars[i]
		var on2 := (mask >> i) & 1 == 1
		var nw := (nmask >> i) & 1 == 1
		for k in _desc(st):
			if k.img is Sprite2D:
				var src := on_tex if on2 else off_tex
				if src.has(String(k.d.key)):
					var e: Array = src[String(k.d.key)]
					var spr2 := k.img as Sprite2D
					spr2.texture = e[0]; spr2.position = e[1]; spr2.scale = e[2]
			if not nw and k.anims.size():
				k.anims = []
				L._apply(k, L.t)
			if not on2 and String(k.d.key).ends_with("::after"): L.set_hidden(k, true)
	# toplam yıldız çipi
	var tot := L.find(".mel-row1")
	var chip0: Lyr.N = null
	for k in (tot.kids if tot else []):
		if String(k.d.key).begins_with(".mel-chip"): chip0 = k
	if chip0:
		L.set_text(chip0, str(int(Ld.get("total", 0))) + " / " + str(D.WORLDS.size() * D.MISSIONS_PER_WORLD * 3))
	# çip satırı
	var chips := L.find(".mel-chips")
	for k in (chips.kids if chips else []): L.set_hidden(k, true)
	var list := []
	if int(Ld.get("starGem", 0)) > 0: list.append(["gem", "+" + str(int(Ld.starGem))])
	var TW = s.get("tower")
	var NM = s.get("nm")
	var SE = s.get("seal")
	if TW is Dictionary:
		list.append(["tower", "KAT " + str(TW.k) + (" GEÇİLDİ" if TW.get("won", false) else " · KAT " + str(TW.next) + "'DEN DEVAM")])
		if TW.get("gem", 0): list.append(["gem", "+" + str(int(TW.gem))])
	elif NM is Dictionary:
		list.append(["nm", "KABUS D" + str(NM.w) + "-" + str(NM.m) + ((" · İLK ZAFER" if NM.get("first", false) else " · GEÇİLDİ") if NM.get("won", false) else "")])
		if NM.get("gem", 0): list.append(["gem", "+" + str(int(NM.gem))])
		if NM.get("frame", false): list.append(["nmf", "KABUS ÇERÇEVESİ AÇILDI"])
	elif SE is Dictionary:
		list.append(["seal", "MÜHÜR " + str(SE.score) + (" · EN İYİ" if SE.get("isBest", false) else "")])
		for T in SE.get("fresh", []): list.append(["col", str(T.name), JS.col(T.col)])
	else:
		var R: Dictionary = Ld.get("rec", {})
		if R.get("isNew", false): list.append(["rec", "YENİ REKOR · " + str(int(R.kills)) + " KIYIM"])
		elif int(R.get("best", 0)) > 0: list.append(["dim", "EN İYİ " + str(int(R.best))])
	if chips:
		var cr := L.rect_of(chips)
		var made := []
		var tw := 0.0
		for it in list:
			var C := Lyr.make("mec_" + it[0])
			var root: Lyr.N = C.nodes[0]
			C.set_text(root, it[1])
			if it.size() > 2 and root.txt: root.txt.color = it[2]
			if root.txt:
				var pad: float = root.size.x - root.txt.text_width(String(root.d.text.str))
				C.fit_width(root, root.txt.text_width() + pad, false)
			made.append(C)
			tw += root.size.x
		tw += maxi(0, made.size() - 1) * 5
		var x := cr.position.x + (cr.size.x - tw) * 0.5
		for C in made:
			chips.node.add_child(C)
			C.position = Vector2(x - cr.position.x, 0)
			x += C.nodes[0].size.x + 5
			extra.append(C)
		if made.is_empty(): L.set_hidden(chips, true)
	# ustalık
	var M: Dictionary = Ld.get("mas", {})
	var mas := L.find(".mel-mas")
	var cdef = D.CHARACTERS.get(str(M.get("id", "")), {})
	var up: bool = M.get("ups", []).size() > 0
	if up and mas:
		var U := Lyr.make("me_mas_up")
		mas.node.add_child(U)
		extra.append(U)
		for k in mas.kids: L.set_hidden(k, true)
		if mas.img: mas.img.visible = false
		var last: Dictionary = M.ups[M.ups.size() - 1]
		var t2 := U.find(".mm-up")
		if t2: U.set_text(t2, "USTALIK SV " + str(last.lv) + " · +" + str(M.get("gold", 0)) + " ALTIN" + ((" · +" + str(M.gem) + " GEM") if M.get("gem", 0) else ""))
		var k2 := U.find(".hm-k")
		if k2: U.set_text(k2, str(cdef.get("name", "")) + " · USTALIK")
		var b2 := U.find_exact("b")
		if b2: U.set_text(b2, str(M.after.lv))
		_bar = U.find(".hm-bar")
		if _bar: _bar = _bar.kids[0] if _bar.kids.size() else null
		_barA = 0.0
		_barB = float(M.after.get("frac", 0))
		_bar_L = U
	elif mas:
		_txt(".hm-k", str(cdef.get("name", "")) + " · USTALIK")
		var b3 := L.find_exact("b", 0)
		for k in mas.kids:
			if String(k.d.key) == ".hm-medal" and k.kids.size(): b3 = k.kids[0]
		if b3: L.set_text(b3, str(M.get("after", {}).get("lv", 1)))
		_txt(".hm-note", "+" + str(int(M.get("gain", 0))) + " PUAN")
		var bar := L.find(".hm-bar")
		_bar = bar.kids[0] if bar and bar.kids.size() else null
		_barA = float(M.get("before", {}).get("frac", 0))
		_barB = float(M.get("after", {}).get("frac", 0))
		_bar_L = L
	if _bar:
		if not _bar.d.has("_w0"): _bar.d["_w0"] = _bar.size.x
		_bar.anims = []
		_set_bar(_barA)

var _bar_L: Lyr

func _set_bar(f: float) -> void:
	if _bar == null: return
	var par: Lyr.N = _bar_L.by_id.get(str(_bar.d.parent))
	var full: float = par.size.x if par else _bar.size.x
	_bar_L.fit_width(_bar, maxf(0.001, full * clampf(f, 0, 1)), false)

func _desc(n: Lyr.N) -> Array:
	var out := []
	for k in n.kids:
		out.append(k)
		out.append_array(_desc(k))
	return out

# ── ganimet ──
func _loot() -> void:
	var lt := L.find("#me-loot")
	if lt == null: return
	var ch = s.get("chest")
	var key := ""
	if ch != null and str(ch) != "": key = "me_loot_" + str(ch)
	elif s.get("chestFull", false): key = "me_loot_full"
	if key != "" and FileAccess.file_exists(Lyr.BASE + key + ".json"):
		for k in lt.kids: L.set_hidden(k, true)
		var C := Lyr.make(key)
		lt.node.add_child(C)
		extra.append(C)
		var nt := C.find(".me-chest-note")
		if nt: C.set_text(nt, "BOSS GANİMETİ · ANA EKRANDA BEKLİYOR" if s.get("bossDrop", false) else "ANA EKRANDA SENİ BEKLİYOR")
		var h: float = C.nodes[0].size.y
		lt.size.y = h
	elif won:
		# boş ganimet: yalnız dolgu (12 + 2 px)
		for k in lt.kids: L.set_hidden(k, true)
		lt.size.y = 14

# ── hedef satırı ──
func _goal() -> void:
	var gl := L.find(".me-goal")
	if gl == null: return
	var J = g._journey if g._journey is Dictionary else {}
	var news := []
	var dly = J.get("daily")
	if dly is Dictionary and dly.get("fresh", []).size():
		news.append("GÜNLÜK ✓ " + Txt.upper_tr(str(dly.fresh[0])) + (" · TAHTA SANDIK KAZANDIN" if dly.get("chest", false) else ""))
	if J.get("ghostRec", false): news.append("HAYALETİNİ GEÇTİN · YENİ EĞRİ KAYDEDİLDİ")
	var G = Journey.next_goal(g)
	var nw := L.find(".mg-news")
	var nx := L.find(".mg-next")
	if nw:
		if news.is_empty(): L.set_hidden(nw, true)
		else: L.set_text(nw, " · ".join(news))
	if nx:
		if G == null: L.set_hidden(nx, true)
		else:
			# hap: [i] SIRADAKİ · <b> — b metnine göre genişler, satırda ortalı kalır
			for k in nx.kids:
				if String(k.d.key) == "b":
					var w0: float = k.size.x
					L.set_text(k, str(G.txt))
					var nw2: float = k.txt.text_width()
					L.fit_width(k, nw2, false)
					var dw: float = nw2 - w0
					L.fit_width(nx, nx.size.x + dw, true)
	if news.is_empty() and G == null: L.set_hidden(gl, true)
	elif nw and nx:
		var dy := 0.0 if not news.is_empty() else -(nx.pos.y - nw.pos.y)
		if dy != 0.0:
			L.move(nx, nx.pos + Vector2(0, dy))
			gl.size.y += dy

# ── düğmeler ──
func _buttons() -> void:
	var nm: Dictionary = D.nextMission(g.progress)
	var tower = s.get("tower")
	var nmr = s.get("nm")
	var showNext: bool = won and (tower != null or nmr != null or not (int(nm.w) == g.worldId and int(nm.m) == g.missionId))
	var bn := L.find("#btn-me-next")
	var br := L.find("#btn-me-retry")
	var bv := L.find("#btn-me-revive")
	if bn:
		L.set_hidden(bn, not showNext)
		if showNext:
			L.set_text(bn, ("KAT " + str(tower.next) + " →") if tower != null else ("SONRAKİ KABUS →" if nmr != null else (("DÜNYA " + str(nm.w) + "'E GEÇ") if int(nm.w) != g.worldId else "SONRAKİ GÖREV")))
	if br:
		L.set_hidden(br, won)
		L.set_text(br, "TEKRAR OYNA" if won else "YENİDEN DENE")
	if bv: L.set_hidden(bv, won or not s.get("canRevive", false))
	btn(L, L.find("#btn-me-menu"), func(): g.audio.play("click"); g.quit_to_menu())
	btn(L, br, func():
		if g.towerRun: g.start_tower()
		else: g.start_run(g.worldId, g.missionId, g.nmRun if g.nmRun else g.sealRun))
	btn(L, bv, func(): g.revive_with_ad())
	btn(L, bn, func():
		if g.towerRun: g.start_tower(); return
		if g.nmRun: g.start_nightmare(); return
		var n2: Dictionary = D.nextMission(g.progress)
		g.start_run(int(n2.w), int(n2.m)))

func _relayout() -> void:
	var card := L.find("#me-card")
	var act := L.find(".me-actions")
	if act:
		var bl := []
		for k in act.kids: bl.append(k)
		var dh := L.relayout_col(act, bl)
		act.size.y = float(act.d.get("_h0", act.d.box[3])) + dh
	var items := []
	for k in card.kids:
		if String(k.d.get("kind", "el")) == "el": items.append(k)
	var dh2 := L.relayout_col(card, items)
	var h0: float = card.d.get("_h0", card.d.box[3])
	L.resize_h(card, h0 + dh2)
	# kart ekranda dikey ortalı
	L.move(card, Vector2(card.pos.x, float(card.d.get("_y0", card.d.box[1])) - dh2 * 0.5))

# ── sıralı tören ──
func _sequence() -> void:
	var proto := []
	var act := L.find(".me-actions")
	if act:
		for A in act.anims:
			if String(A.get("name", "")).contains("meSq"): proto = [A]
	_seqNodes.clear()
	if proto.is_empty(): return
	for st in SEQ:
		var n := L.find(st[0])
		if n == null or n.hidden: continue
		var A: Dictionary = (proto[0] as Dictionary).duplicate(true)
		A["delay"] = float(st[1]) * 1000.0
		L.play(n, [A])
		_seqNodes.append(n)

func _finish() -> void:
	if _seqDone: return
	_seqDone = true
	for n in _seqNodes: L.finish_anims(n)
	if _tallyB: L.set_text(_tallyB, "+" + str(_tallyN))
	_set_bar(_barB)

func _process(dt: float) -> void:
	if not visible: return
	_t += dt
	if not _seqDone:
		# altın sayacı: 0,82 sn sonra 520 ms kübik
		if _tallyB and _tallyN > 0 and _t >= 0.82:
			var k := minf(1.0, (_t - 0.82) / 0.52)
			L.set_text(_tallyB, "+" + str(int(round(_tallyN * (1.0 - pow(1.0 - k, 3))))))
			if k >= 1.0 and _tallyAt < 0:
				_tallyAt = _t
				g.audio.play("tally")
		if _bar and _t >= 1.75: _set_bar(lerpf(_barA, _barB, UIK.ez(UIK.EASE, minf(1.0, (_t - 1.75) / 0.6))))
		if _t >= 2.8: _finish()

func _input(ev: InputEvent) -> void:
	if visible and ev is InputEventScreenTouch and (ev as InputEventScreenTouch).pressed and not _seqDone:
		_finish()
	super(ev)

func hide_end() -> void:
	visible = false
	_clear()
