class_name ScrChestInspect
extends Scr
## ui.js openChestInspect / _refreshChestInspect — sandık inceleme pop-up'ı.
## Yakalama: ci_<tür>_<durum> (locked · busy · unlocking · adused · ready); 3B sandık
## ChestStage ile tuval düğümünün yerinde, CR usulü alttan yükselir (0,56 sn
## back-out → 0,32 sn konma ezilmesi + kıvılcım → nefes). Durum değişince
## (çözülme başladı / bitti / reklam) uygun yakalamaya geçilir.

var L: Lyr
var slot := -1
var stage: ChestStage
var _key := ""
var _t := 0.0
var _puffed := false
var _tick := 0.0

func _init(game) -> void:
	super(game)
	name = "ChestInspect"

func open(i: int) -> void:
	var c = g.chests.slots[i]
	if c == null: return
	slot = i
	_t = 0.0
	_puffed = false
	_key = ""
	_build()
	visible = true
	fade_show()
	g.audio.play("panel")

func _state_name() -> String:
	var c = g.chests.slots[slot]
	if c.st == "ready": return "ready"
	if c.st == "unlocking": return "unlocking" if g.chests.can_ad_boost(slot) else "adused"
	return "busy" if g.chests.any_unlocking() else "locked"

func _build() -> void:
	var c = g.chests.slots[slot]
	var key := "ci_" + str(c.t) + "_" + _state_name()
	if key == _key: return
	var restart := _key == ""
	_key = key
	if L:
		unbtn(L)
		L.queue_free()
	L = Lyr.make(key)
	add_child(L)
	L.stretch_h(Scr.dh_of(self))
	if not restart: L.finish_anims(L.nodes[0])
	# 3B sandık: tuval düğümünün yerinde
	var cv := L.find_id("#chest-canvas-3d")
	if stage == null:
		stage = ChestStage.new()
	if stage.get_parent(): stage.get_parent().remove_child(stage)
	if cv:
		cv.node.add_child(stage)
		stage.setup(cv.size.x, cv.size.y)
	stage.set_chest(str(c.t))
	_texts()
	btn(L, L.find_id("#ci-close"), func(): g.audio.play("click"); close())
	btn(L, L.find(".odds-link"), func(): g.audio.play("click"); g.ui.show_odds(str(g.chests.slots[slot].t)))
	var st := _state_name()
	if st == "ready":
		btn(L, L.find(".ci-open"), func(): _open_chest())
	elif st == "locked":
		btn(L, L.find(".ci-unlock"), func(): _unlock())
	elif st == "unlocking" or st == "adused":
		btn(L, L.find(".ci-instant"), func(): _instant())
		if st == "unlocking": btn(L, L.find(".ci-ad"), func(): _ad_boost())

func _texts() -> void:
	var c = g.chests.slots[slot]
	var n: int = g.chests.pity_count()
	var pv := L.find(".pity-v")
	if pv: L.set_text(pv, str(n) + "/" + str(ChestSystem.PITY_N))
	var pb := L.find(".pity-bar")
	if pb: UIK.pity_fill(pb, float(n) / ChestSystem.PITY_N)
	var now := Clock.now()
	if c.st == "unlocking":
		var tm := L.find(".ci-timer")
		if tm: L.set_text(tm, ChestSystem.fmt_dur(float(c.at) - now))
		var ce := L.find(".ci-cost")
		if ce: L.set_text(ce, str(int(g.chests.skip_cost_for(slot))))
	elif c.st == "locked":
		var lt := L.find(".ci-lockt")
		if lt: L.set_text(lt, ChestSystem.fmt_dur(g.chests.lock_ms(slot)))

func close() -> void:
	if not visible: return
	fade_hide(_close_now)

func _close_now() -> void:
	visible = false
	slot = -1
	if stage and stage.get_parent(): stage.get_parent().remove_child(stage)
	if L:
		unbtn(L)
		L.queue_free()
		L = null
	_key = ""

func _process(dt: float) -> void:
	if not visible or slot < 0: return
	_t += dt
	# alttan yükseliş (ui._ciStart3d)
	var D := 0.56
	var LAND := 0.32
	var S := 1.14
	var DEPTH := 130.0
	var u := minf(1.0, _t / D)
	var vv := u - 1.0
	var back := 1.0 + 2.9 * vv * vv * vv + 1.9 * vv * vv
	var posY := -DEPTH * (1.0 - back)
	var sx := S
	var sy := S
	if u < 1.0:
		sy = S * (1.0 + 0.07 * (1.0 - u))
		sx = S * (1.0 - 0.04 * (1.0 - u))
	else:
		var l := (_t - D) / LAND
		if l < 1.0:
			var q := sin(l * PI) * 0.085 * (1.0 - l)
			sy = S * (1.0 - q)
			sx = S * (1.0 + q * 0.6)
		if not _puffed:
			_puffed = true
			for k in 7: stage.spawn_spark()
		posY += sin((_t - D) * 1.7) * 1.4
	var pulse := 0.5 + sin(_t * 3.2) * 0.5
	var c = g.chests.slots[slot]
	if c == null:
		close()
		return
	stage.p = {"posY": posY, "scaleX": sx, "scaleY": sy, "scaleZ": S, "open": 0.0,
		"seam": (0.55 + pulse * 0.45) if c.st == "ready" else ((0.15 + pulse * 0.25) if c.st == "unlocking" else 0.0),
		"shadowK": clampf(1.0 + posY / 60.0, 0.0, 1.0)}
	# geri sayım (updateChestInspectCountdown)
	_tick += dt
	if _tick >= 1.0:
		_tick = 0.0
		if g.chests.tick():
			g.ui.menu.render_slots()
		_build()
		_texts()

func _unlock() -> void:
	if g.chests.start_unlock(slot):
		g.audio.play("unlockstart")
		_build()
		g.ui.menu.render_slots()
	else:
		g.audio.play("error")
		g.ui.toast("AYNI ANDA TEK SANDIK ÇÖZÜLÜR")

func _open_chest() -> void:
	var c = g.chests.slots[slot]
	if c == null or c.st != "ready": return
	var i := slot
	close()
	g.audio.play("pick")
	g.ui.chest_ceremony(str(c.t), i, func(): g.ui.menu.refresh_wallet(); g.ui.menu.render_slots())

func _instant() -> void:
	var c = g.chests.slots[slot]
	if c == null or c.st != "unlocking": return
	var cost: float = g.chests.skip_cost_for(slot)
	if g.read_stones() < cost:
		g.audio.play("error")
		g.ui.toast("YETERSİZ GEM — " + str(int(cost)) + " GEREKİR")
		return
	if not g.spend_stones(cost): return
	g.audio.play("gemspend")
	g.ui.menu.refresh_wallet()
	var i := slot
	close()
	g.ui.chest_ceremony(str(c.t), i, func(): g.ui.menu.refresh_wallet(); g.ui.menu.render_slots())

func _ad_boost() -> void:
	var i := slot
	if not g.chests.can_ad_boost(i):
		g.audio.play("error")
		return
	g.audio.play("click")
	close()
	g.ui.show_ad_watch(3, func():
		g.chests.apply_ad_boost(i)
		g.audio.play("adreward")
		g.ui.show_menu()
		g.ui.menu.set_page("savas")
		g.ui.menu.render_slots()
		g.ui.toast("30 DAKİKA İLERLETİLDİ")
		open(i))
