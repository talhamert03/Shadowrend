class_name ScrCelebrate
extends Scr
## Kutlama katmanları (web canlandırmaları t=0'dan Lyr ile oynar):
##   hero_unlock(id) — ui.js showHeroUnlock: YENİ KAHRAMAN AÇILDI (kart karanlıktan döner,
##                     ışın + kıvılcım; 0,7 sn sonra dokunuş, 5 sn'de kendiliğinden kapanır)
##   level_up(p)     — ui.js showAccountLevelUp: HESAP SEVİYESİ YÜKSELDİ (+ seviye sandığı)
##   gift(G)         — ui.js _showGift: DÖNÜŞ HEDİYESİ (genel sayfa)

const RAR := ["", "SIRADAN", "NADİR", "EPİK", "EFSANEVİ"]
var L: Lyr
var _t := 0.0
var _kind := ""
var _out := -1.0
var _queue: Array = []

func _init(game) -> void:
	super(game)
	name = "Celebrate"

func _show(key: String, kind: String) -> bool:
	if not FileAccess.file_exists(Lyr.BASE + key + ".json"): return false
	_lv = {}
	_sp.clear()
	if L:
		unbtn(L)
		L.queue_free()
	L = Lyr.make(key)
	# tam ekran zemin: uzun/geniş ekranlarda yakalamanın dışında kalan köşe ve alt boşluklar kapansın
	var bd := Node2D.new()
	var W := UIK.ui_size(get_viewport())
	bd.draw.connect(func():
		bd.draw_rect(Rect2(-200, -200, W.x + 400, W.y + 400), Color8(2, 0, 2)))
	L.add_child(bd)
	L.move_child(bd, 0)
	add_child(L)
	L.stretch_h(Scr.dh_of(self))
	_kind = kind
	_t = 0.0
	_out = -1.0
	L.modulate.a = 1.0
	visible = true
	return true

func hero_unlock(cid: String) -> void:
	if visible:
		_queue.append(["hero", cid])
		return
	var C: Dictionary = D.CHARACTERS.get(cid, {})
	var r := clampi(int(C.get("rarity", 1)), 1, 4)
	if not _show("hu_" + str(r), "hero"): return
	var card := L.find(".hu-card")
	if card:
		var img: Lyr.N = null
		for k in card.kids:
			if k.d.get("tag") == "img": img = k
		var pp := "res://assets/ui/art/portrait/" + cid + ".webp"
		if img and ResourceLoader.exists(pp):
			var pr := UIK.round_image(UITex.get_tex(pp), img.size.x, img.size.y, 10.0, Vector2(0.5, 0.15))
			img.node.add_child(pr)
	EventsPage.txt(L, L.find(".hu-rar"), RAR[r])
	EventsPage.txt(L, L.find(".hu-name"), str(C.get("name", "")))
	var tt := L.find(".hu-title")
	if tt:
		if str(C.get("title", "")) != "": EventsPage.txt(L, tt, str(C.title))
		else: L.set_hidden(tt, true)
	btn(L, L.nodes[0], func():
		if _t > 0.7: _close(), 1.0, 0.0)
	g.audio.play("heroup")
	pass  # titreşim kapalı

func level_up(p: Dictionary) -> void:
	if visible:
		_queue.append(["lvl", p])
		return
	var rw: Array = p.get("rewards", [])
	var full: bool = rw.size() > 0 and rw[0].get("chest") == null
	var key := "alu_" + (str(rw[0].chest) if rw.size() and not full else "0")
	if not _show(key, "lvl"): return
	var to := int(p.get("toLevel", 1))
	EventsPage.txt(L, L.find_id("#alu-level"), str(to))
	var bonus := minf(50.0, (to - 1) * 0.6)
	for v in L.find_all(".alu-stat-v"): EventsPage.txt(L, v, "+%" + ("%.1f" % bonus))
	if full: g.ui.toast("SANDIK YUVASI DOLU — SEVİYE SANDIĞI VERİLEMEDİ")
	if g.ui.menu and g.ui.menu.has_method("refresh_lv_dot"): g.ui.menu.refresh_lv_dot()
	if rw.size() and not full:
		var t := L.find(".alu-reward-t")
		if t:
			for k in t.kids:
				if k.d.get("tag") == "span": EventsPage.txt(L, k, "Seviye " + str(int(rw[0].level)) + " ödülü hazır — seviye rozetine dokun, al", 0.0)
	btn(L, L.find_id("#alu-close"), func(): g.audio.play("click"); _close(true))
	_lv_setup(int(p.get("fromLevel", to - 1)), to, bonus)
	g.audio.play("levelup")
	g.ui.menu.render_slots()
	g.ui.refresh_wallet()

func gift(G: Dictionary) -> void:
	var c := "1" if G.get("chest") else "0"
	var f := "1" if G.get("full") else "0"
	# altın zaten eklendi: sayaç hediye öncesini gösterir, TOPLA'da altın düğmeden cüzdana uçar
	var m = g.ui.menu
	var gold := float(G.get("gold", 0))
	if m and m.shell and gold > 0.0:
		m._ruby = maxf(0.0, m._ruby - gold)
		m.shell.set_text(m.shell.find_id("#menu-ruby-val"), str(int(m._ruby)))
	var holder := {}
	var S: Lyr = g.ui.sheet.show_key("sh_gift_" + c + "_" + f, [func():
		g.audio.play("claim")
		var SL: Lyr = holder.get("S")
		var act: Lyr.N = SL.find_id("#sh-actions") if SL else null
		if m: m.reward_from(SL, act.kids[0] if act and act.kids.size() else act)
		g.ui.sheet.close()], func(): if m: m.refresh_wallet())
	holder["S"] = S
	if S == null:
		if m: m.refresh_wallet(true)
		return
	var hrs := float(G.get("h", 0))
	var h := int(floor(hrs))
	var mm := int(round((hrs - h) * 60.0))
	var gt := S.find(".gift-t")
	if gt and gt.txt:
		# "3 SA 30 DK uzaktaydın" (+ <b> SANDIK DOLDU): b metnin sağında kalır
		var dw := EventsPage.txt(S, gt, str(h) + " SA " + str(mm) + " DK uzaktaydın" + (" · " if f == "1" else ""), 0.5)
		for k in gt.kids:
			if k.d.get("tag") == "b": S.move(k, k.pos + Vector2(dw * 0.5, 0))
	var chips := S.find_all(".gift-chip")
	if chips.size(): EventsPage.txt(S, chips[0], "+" + JS.s(G.get("gold", 0)), 0.5)

func _close(quick := false) -> void:
	if _out >= 0.0: return
	_out = 0.0 if not quick else 0.2

func _process(dt: float) -> void:
	if not visible or L == null: return
	_t += dt
	if _kind == "lvl": _lv_step(dt)
	if _kind == "hero" and _t > 5.0: _close()
	if _out >= 0.0:
		_out += dt
		L.modulate.a = maxf(0.0, 1.0 - _out / 0.38)
		if _out >= 0.38:
			visible = false
			unbtn(L)
			L.queue_free()
			L = null
			if _kind == "hero" and g.ui.menu.pages.has("magaza"): g.ui.menu.pages["magaza"].render()
			if _queue.size():
				var q = _queue.pop_front()
				if q[0] == "hero": hero_unlock(q[1])
				else: level_up(q[1])

# ═════════════ hesap seviyesi: canlı giriş (premium) ═════════════
# kart yaylanarak açılır → rozet dönerek patlar, eski seviye yenisine döner (altın halka + kıvılcım)
# → istatistikler sırayla gelir, yüzdeler sayılır → ödül sağdan kayar → DEVAM ET nabız atar.
# Arkada dönen altın ışınlar ve parıltılar.
var _lv := {}
var _sp: Array = []
func _lv_setup(from_lv: int, to_lv: int, bonus: float) -> void:
	_sp.clear()
	var card := L.find(".alu-card")
	var badge := L.find(".alu-badge")
	var lvt := L.find_id("#alu-level")
	var stats := L.find_all(".alu-stat-v")
	var cells := L.find_all(".alu-stat")
	var rew := L.find(".alu-reward")
	var btnn := L.find_id("#alu-close")
	var bc: Vector2 = L.rect_of(badge).get_center() if badge else Vector2(195, 340)
	var back := Node2D.new()
	back.draw.connect(func():
		var a: float = clampf(_t / 0.5, 0, 1)
		var rot := _t * 0.25
		for i in 16:
			var an := rot + i * TAU / 16.0
			var w := 0.09
			var R := 700.0
			back.draw_colored_polygon(PackedVector2Array([bc, bc + Vector2(cos(an - w), sin(an - w)) * R, bc + Vector2(cos(an + w), sin(an + w)) * R]),
				Color(1.0, 0.78, 0.35, 0.085 * a))
		for k in 6: back.draw_circle(bc, 180.0 - k * 26.0, Color(1.0, 0.72, 0.3, 0.025 * a + k * 0.006 * a)))
	# koyu örtünün üstünde, kartın arkasında
	var host: Node2D = L.nodes[0].node
	host.add_child(back)
	if card and card.node.get_parent() == host: host.move_child(back, card.node.get_index())
	if Prof.on: print("CELEB lvl")
	var front := Node2D.new()
	front.draw.connect(func():
		# halka patlaması (rozet dönüşü)
		var kr: float = (_t - 0.62) / 0.7
		if kr > 0.0 and kr < 1.0:
			var e := 1.0 - pow(1.0 - kr, 3.0)
			front.draw_arc(bc, 40.0 + 150.0 * e, 0, TAU, 64, Color(1.0, 0.85, 0.45, 0.85 * (1.0 - kr)), 5.0 * (1.0 - kr) + 1.0, true)
			front.draw_arc(bc, 30.0 + 100.0 * e, 0, TAU, 64, Color(1, 1, 1, 0.6 * (1.0 - kr)), 2.0, true)
		for q in _sp:
			var lk: float = float(q.l) / float(q.m)
			var c: Color = q.c
			c.a = lk
			var pp: Vector2 = q.p
			var sz: float = float(q.s) * (0.6 + 0.4 * lk)
			front.draw_colored_polygon(PackedVector2Array([pp + Vector2(0, -sz * 1.6), pp + Vector2(sz * 0.45, 0), pp + Vector2(0, sz * 1.6), pp + Vector2(-sz * 0.45, 0)]), c)
			front.draw_colored_polygon(PackedVector2Array([pp + Vector2(-sz * 1.6, 0), pp + Vector2(0, sz * 0.45), pp + Vector2(sz * 1.6, 0), pp + Vector2(0, -sz * 0.45)]), c))
	L.add_child(front)
	_lv = {"card": card, "badge": badge, "lvt": lvt, "stats": stats, "cells": cells, "rew": rew, "btn": btnn, "from": from_lv, "to": to_lv,
		"bonus": bonus, "bc": bc, "back": back, "front": front, "pop": false}
	if lvt: EventsPage.txt(L, lvt, str(from_lv))
	for n in [card, badge, rew, btnn] + cells:
		if n:
			(n as Lyr.N).op_mul = 0.0
			L.set_dyn(n)

func _lv_burst(n: int, spd: float) -> void:
	var bc: Vector2 = _lv.bc
	for i in n:
		var a := randf() * TAU
		var v := spd * randf_range(0.35, 1.0)
		var life := randf_range(0.6, 1.2)
		_sp.append({"p": bc, "v": Vector2(cos(a), sin(a)) * v, "l": life, "m": life, "s": randf_range(2.5, 5.0),
			"c": [Color("#ffd774"), Color.WHITE, Color("#ffb347")][randi() % 3]})

static func _ease_back(k: float) -> float:
	var c1 := 1.70158
	var c3 := c1 + 1.0
	return 1.0 + c3 * pow(k - 1.0, 3.0) + c1 * pow(k - 1.0, 2.0)

func _lv_step(dt: float) -> void:
	if _lv.is_empty(): return
	var rm: bool = Settings.data.get("rm", false)
	var t := _t if not rm else 9.0
	# kart
	var card: Lyr.N = _lv.card
	if card:
		var k := clampf(t / 0.42, 0, 1)
		card.op_mul = minf(1.0, k * 2.0)
		card.extra = Transform2D(0, Vector2.ONE * lerpf(0.82, 1.0, _ease_back(k)), 0, Vector2(0, 30.0 * (1.0 - k)))
		L.set_dyn(card)
	# rozet: dönerek patlar
	var bd: Lyr.N = _lv.badge
	if bd:
		var kb := clampf((t - 0.22) / 0.5, 0, 1)
		var sc := _ease_back(kb) if kb < 1.0 else 1.0 + 0.035 * sin(t * 3.0)
		bd.op_mul = minf(1.0, kb * 3.0)
		bd.extra = Transform2D(-0.9 * (1.0 - kb) * (1.0 - kb), Vector2.ONE * maxf(0.01, sc), 0, Vector2.ZERO)
		L.set_dyn(bd)
	if not _lv.pop and t >= 0.62:
		_lv.pop = true
		if _lv.lvt: EventsPage.txt(L, _lv.lvt, str(_lv.to))
		_lv_burst(46, 520.0)
		g.audio.play("star")
	# istatistikler: sırayla kayar, yüzdeler sayılır
	var cells: Array = _lv.cells
	for i in cells.size():
		var kc := clampf((t - 0.75 - i * 0.1) / 0.35, 0, 1)
		var cn: Lyr.N = cells[i]
		cn.op_mul = kc
		cn.extra = Transform2D(0, Vector2.ONE, 0, Vector2(0, 22.0 * (1.0 - _ease_back(kc))))
		L.set_dyn(cn)
	var kv := clampf((t - 0.8) / 0.6, 0, 1)
	for v in _lv.stats: EventsPage.txt(L, v, "+%" + ("%.1f" % (float(_lv.bonus) * (1.0 - pow(1.0 - kv, 2.0)))))
	# ödül sağdan
	var rw: Lyr.N = _lv.rew
	if rw:
		var kr := clampf((t - 1.0) / 0.4, 0, 1)
		rw.op_mul = kr
		rw.extra = Transform2D(0, Vector2.ONE, 0, Vector2(60.0 * (1.0 - _ease_back(kr)), 0))
		L.set_dyn(rw)
	# DEVAM ET: belirir, sonra hafif nabız
	var bn: Lyr.N = _lv.btn
	if bn:
		var kk := clampf((t - 1.2) / 0.3, 0, 1)
		bn.op_mul = kk
		bn.extra = Transform2D(0, Vector2.ONE * ((1.0 + 0.025 * sin(t * 4.5)) if kk >= 1.0 else lerpf(0.9, 1.0, kk)), 0, Vector2.ZERO)
		L.set_dyn(bn)
	# parıltılar
	for i in range(_sp.size() - 1, -1, -1):
		var q: Dictionary = _sp[i]
		q.l = float(q.l) - dt
		if q.l <= 0.0:
			_sp.remove_at(i)
			continue
		q.v = (q.v as Vector2) * (1.0 - dt * 2.2) + Vector2(0, 120.0 * dt)
		q.p = (q.p as Vector2) + (q.v as Vector2) * dt
	if randf() < dt * 6.0 and t > 0.8:
		var bc: Vector2 = _lv.bc
		var a := randf() * TAU
		_sp.append({"p": bc + Vector2(cos(a), sin(a)) * randf_range(40, 70), "v": Vector2(0, -30), "l": 0.9, "m": 0.9, "s": 2.2, "c": Color("#ffe8a8")})
	(_lv.back as Node2D).queue_redraw()
	(_lv.front as Node2D).queue_redraw()
