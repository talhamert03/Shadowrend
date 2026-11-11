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
var _lastHit := -1
var _tick := 0.0
var _aura: Node2D

func _init(game) -> void:
	super(game)
	name = "ChestInspect"

func open(i: int) -> void:
	var c = g.chests.slots[i]
	if c == null: return
	slot = i
	_t = 0.0
	_puffed = false
	_lastHit = -1
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
	# boşluğa dokunmak kapatır; kartın kendisi dokunuşu yutar
	btn(L, L.nodes[0], func(): close(), 1.0, 0.0)
	var cdb := L.find(".ci-card")
	if cdb: btn(L, cdb, func(): pass, 1.0, 0.0)
	# "hâle" katmanı ışıma yerine kaydırılmış ikinci koyu panel gibi çiziliyordu (yanlarda çıkıntı)
	var au := L.find_id("#ci-aura")
	if au: L.set_hidden(au, true)
	# kart biraz daha küçük (ekranı kaplamasın)
	var cd := L.find(".ci-card")
	if cd:
		var s := 0.9
		var cc: Vector2 = cd.size * 0.5
		cd.extra = Transform2D(0, Vector2(s, s), 0, cc - cc * s)
		L.set_dyn(cd)
	# 3B sandık: tuval düğümünün yerinde
	var cv := L.find_id("#chest-canvas-3d")
	if stage == null:
		stage = ChestStage.new()
	if stage.get_parent(): stage.get_parent().remove_child(stage)
	if cv:
		if _aura and is_instance_valid(_aura): _aura.queue_free()
		_aura = Node2D.new()
		_aura.position = cv.size * Vector2(0.5, 0.56)
		var am := CanvasItemMaterial.new()
		am.blend_mode = CanvasItemMaterial.BLEND_MODE_ADD
		_aura.material = am
		var gcol := ChestModel.glow_of(ChestStage.tier_of(str(c.t)))
		var gtex: Texture2D = load("res://assets/chest/fx_glow.png")
		var rr := minf(cv.size.x, cv.size.y) * 0.56
		_aura.draw.connect(func():
			_aura.draw_texture_rect(gtex, Rect2(Vector2(-rr, -rr) * 1.15, Vector2(rr, rr) * 2.3), false, Color(gcol, 0.6))
			for i in 14:
				var a := i * TAU / 14.0 + _t * 0.35
				var w := 0.085 if i % 2 == 0 else 0.05
				var ca := Color(gcol, 0.22 if i % 2 == 0 else 0.13)
				_aura.draw_polygon(PackedVector2Array([Vector2.ZERO, Vector2(cos(a - w), sin(a - w)) * rr * 1.2, Vector2(cos(a + w), sin(a + w)) * rr * 1.2]), PackedColorArray([ca, Color(gcol, 0.0), Color(gcol, 0.0)])))
		cv.node.add_child(_aura)
		cv.node.add_child(stage)
		stage.setup(cv.size.x, cv.size.y)
	stage.set_chest(str(c.t))
	var dsc := L.find_id("#ci-desc")
	if dsc: L.set_text(dsc, I18n.t(str(ChestSystem.chests()[str(c.t)].get("desc", ""))))
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
	var ct := str(c.t)
	var n: int = g.chests.pity_count(ct)
	var PN := ChestSystem.pity_n(ct)
	var pv := L.find(".pity-v")
	if pv: L.set_text(pv, str(n) + "/" + str(PN))
	var pb := L.find(".pity-bar")
	if pb: UIK.pity_fill(pb, float(n) / PN)
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
	# yumuşak iniş: yukarıdan süzülerek gelir (ease-out), hafifçe yaylanıp oturur, nefes alır
	var S := 1.24
	if _aura and is_instance_valid(_aura):
		_aura.queue_redraw()
		_aura.scale = Vector2.ONE * minf(1.0, _t * 2.2) * (1.0 + 0.04 * sin(_t * 2.6))
	var HIGH := 150.0
	var bo := ChestSystem.bounce(_t)
	var posY: float = HIGH * float(bo[0])
	var sq: float = float(bo[1])
	var sx := S * (1.0 + 0.16 * sq)
	var sy := S * (1.0 - 0.18 * sq)
	var ci: int = int(bo[2])
	if ci > _lastHit and ci >= 0 and ci < 3:
		_lastHit = ci
		if ci == 0: ChestSystem.land_sfx(g, str(g.chests.slots[slot].t) if g.chests.slots[slot] else "")
		for k in (7 - ci * 2): stage.spawn_spark()
	if ci >= 3:
		# oturduktan sonra: nefes + ara sıra küçük zıplama + hafif dönüş
		var f := _t - 1.01
		var hop := fmod(f, 2.6)
		if hop > 1.9:
			var hk := (hop - 1.9) / 0.7
			posY += sin(hk * PI) * 16.0 * (1.0 - hk * 0.3)
			sy *= 1.0 + 0.05 * sin(hk * PI)
		else:
			posY += sin(f * 1.8) * 1.6
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
	g.ui.show_rewarded("sandik_hizlandir", func():
		g.chests.apply_ad_boost(i)
		g.audio.play("adreward")
		g.ui.show_menu()
		g.ui.menu.set_page("savas")
		g.ui.menu.render_slots()
		g.ui.toast("30 DAKİKA İLERLETİLDİ")
		open(i))
