class_name ScrCeremony
extends Scr
## chests.js ceremony + revealRewards — sandık açılış töreni.
## İniş (kameraya büyüyerek düşer, bounceOut zıplar) → "AÇMAK İÇİN EKRANA DOKUN" →
## tırmanan sarsıntı (0,72 sn) → patlama (ışın yelpazesi, ışık sütunu, flaş, kıvılcım
## şöleni) → ödüller TEK TEK: kart sandıktan yükselir, döne döne gelir (nadirlikle
## uzayan dönüş; efsane bekletir, konfeti + gökkuşağı söz) → özet tepsisi → dokun → bitir.
## Düzen ve kart şablonları web'den yakalandı (cer_idle · cer_rev_<k> · cer_back_<k> ·
## cer_sum · cer_tray_<k>); 3B sandık ChestStage; efektler yerel.

const CW := 340.0
const CH := 320.0

var type := ""
var slot := -1
var done_cb: Callable
var rewards: Array = []
var C: Dictionary
var peak := 0
var em_color := Color.WHITE
var em_glow := Color.WHITE

var base: Lyr                 # cer_idle (iniş/bekleme düzeni)
var rev: Lyr                  # cer_rev_<k> (kart sahnesi)
var back: Lyr                 # cer_back_<k>
var summ: Lyr                 # cer_sum
var tray: Array = []          # [Lyr]
var stage: ChestStage
var fx: Node2D                # 2B kıvılcımlar
var rays: ColorRect
var rays_m: ShaderMaterial
var beam: ColorRect
var beam_m: ShaderMaterial
var tension: ColorRect
var flare: ColorRect
var flash: ColorRect
var spot: ColorRect
var word: UIText
var hint: UIText

var S := {}
var parts: Array = []
var confetti: Array = []
var _rays_on := 0.0
var _rays_target := 0.0
var _beam_t := -1.0
var _flash_t := -1.0
var _flash_dur := 0.48
var _flash_rb := false
var _flash_c := Color.WHITE
var _forced := false          # geliştirici: zorlanmış ödüller uygulanmaz
var _word_t := -1.0
var _word_rb := false
var _tension := false
var _flare_t := -1.0
var _land_t := -1.0
var _t := 0.0

# ödül gösterimi
var idx := 0
var busy := false
var awaiting := false
var _show_t := 0.0
var _spin_ms := 900.0
var _hold_ms := 900.0
var _drama := 0
var _skip := false
var _count_to := 0
var _count_t := -1.0
var _count_ms := 600.0

func _init(game) -> void:
	super(game)
	name = "Ceremony"
	modal = true

static func rarity_of(r: Dictionary) -> Dictionary:
	if r.kind == "rubies" or r.kind == "stone": return {}
	var arr: Array = D.CHAR_RARITIES if r.kind == "char" else D.RARITIES
	var i := int(r.get("rarity", 0))
	return arr[i] if i < arr.size() and arr[i] is Dictionary else {}

static func drama_of(r: Dictionary) -> int:
	if r.kind == "rubies" or r.kind == "stone": return 0
	var is_char: bool = r.kind == "char"
	var rar := int(r.get("rarity", 0))
	if rar >= 4: return 3
	if rar == 3: return 2
	if rar == 2: return 2 if is_char else 1
	return 1 if is_char else 0

static func color_of(r: Dictionary) -> Color:
	if r.kind == "rubies": return Color("#ff3b4e")
	if r.kind == "stone": return Color("#9d5cff")
	return JS.col(rarity_of(r).get("color", "#ffffff"))

## yakalama anahtarı (ödül türü × nadirlik)
static func key_of(r: Dictionary) -> String:
	match String(r.kind):
		"rubies": return "rubies"
		"stone": return "stone"
		"weapon": return "weapon"
		"char":
			if r.get("isNew", false): return "cnew"
			return "c" + str(clampi(int(r.get("rarity", 1)), 1, 4))
		_:
			if r.get("isNew", false): return "gnew"
			return "g" + str(clampi(int(r.get("rarity", 1)), 1, 5))

func play(t: String, s: int, cb: Callable) -> void:
	if g.chests.ceremonyActive: return
	g.chests.ceremonyActive = true
	type = t
	slot = s
	done_cb = cb
	C = ChestSystem.chests()[t]
	rewards = g.chests.apply_pity(g.chests.roll_rewards(t))
	# geliştirici: ödülleri zorla — cerforce=c4,g5,rubies
	for a in OS.get_cmdline_user_args():
		if a.begins_with("cerforce="):
			_forced = true
			rewards = []
			for k in a.substr(9).split(","):
				match k[0]:
					"c": rewards.append({"kind": "char", "id": "seher", "rarity": int(k.substr(1)), "name": "SEHER", "cards": 3, "isNew": false})
					"g": rewards.append({"kind": "gear", "icon": "kilic", "rarity": int(k.substr(1)), "name": "Demir Kılıç", "cards": 2, "isNew": false})
					"s": rewards.append({"kind": "stone", "amount": 12})
					_: rewards.append({"kind": "rubies", "amount": 250})
	peak = 0
	var peak_char := false
	var peak_raw := 0
	for r in rewards:
		var rr := ChestSystem.rk_of(r)
		if rr > peak:
			peak = int(rr)
			peak_char = r.kind == "char"
			peak_raw = int(r.get("rarity", 0))
	var prar: Dictionary = {}
	if peak > 0:
		var arr: Array = D.CHAR_RARITIES if peak_char else D.RARITIES
		if peak_raw < arr.size(): prar = arr[peak_raw]
	em_color = JS.col(prar.color) if peak >= 3 and prar.has("color") else JS.col(C.get("accent", C.color))
	em_glow = JS.col(prar.glow) if peak >= 3 and prar.has("glow") else JS.col(C.glow)
	_build()
	S = {"phase": "drop", "t": 0.0, "openT": 0.0, "shakeT": 0.0, "dropY": -560.0, "approach": 0.0, "landT": 0.0, "landed": false, "hopT": 0.0, "miniT": 0.0, "seam": 0.0, "punch": 0.0}
	parts.clear()
	confetti.clear()
	idx = 0
	busy = false
	awaiting = false
	visible = true

func _build() -> void:
	for n in get_children():
		if not (n is Scr._Ticker): n.queue_free()
	tray.clear()
	rev = null; back = null; summ = null
	var dh := Scr.dh_of(self)
	var W := UIK.ui_size(get_viewport())
	base = Lyr.make("cer_idle")
	add_child(base)
	base.stretch_h(dh)
	# efekt katmanları (z sırası: ışınlar/sütun → sandık → flaş → söz)
	rays_m = UIK.shader_mat("res://shaders/ui/cer_rays.gdshader")
	rays = ColorRect.new()
	rays.material = rays_m
	rays.mouse_filter = Control.MOUSE_FILTER_IGNORE
	var vmax := maxf(W.x, W.y) * 1.6
	rays.size = Vector2(vmax, vmax)
	rays.pivot_offset = rays.size * 0.5
	rays.position = Vector2(W.x * 0.5, W.y * 0.44) - rays.size * 0.5
	add_child(rays)
	rays_m.set_shader_parameter("col", Color(em_glow, em_glow.a))
	_rays_on = 0.0
	_rays_target = 0.0
	beam_m = UIK.shader_mat("res://shaders/ui/cer_beam.gdshader")
	beam = ColorRect.new()
	beam.material = beam_m
	beam.mouse_filter = Control.MOUSE_FILTER_IGNORE
	beam.size = Vector2(300, 0)
	add_child(beam)
	var bc := em_color
	beam_m.set_shader_parameter("c0", bc.lerp(Color.WHITE, 0.15))
	beam_m.set_shader_parameter("c1", bc.lerp(Color.WHITE, 0.30))
	_beam_t = -1.0
	tension = _rg(W, Vector2(0.5, 0.46), [Color(0, 0, 0, 0), Color(0, 0, 0, 0.38)], [0.42, 1.0], true)
	tension.visible = false
	add_child(tension)
	# 3B sandık: sahne düğümünün yerinde
	stage = ChestStage.new()
	add_child(stage)
	_place_stage(base)
	stage.set_chest(type)
	fx = Node2D.new()
	fx.draw.connect(_draw_parts)
	add_child(fx)
	spot = _rg(W, Vector2(0.5, 0.40), [Color(0, 0, 0, 0), Color(0, 0, 0, 0.6)], [0.26, 0.76], true)
	spot.visible = false
	add_child(spot)
	flare = _rg(W, Vector2(0.5, 0.48), [Color(1, 0.965, 0.878, 0.85), Color(1, 0.941, 0.804, 0.42), Color(1, 0.922, 0.745, 0.12), Color(1, 0.92, 0.75, 0)], [0.0, 0.34, 0.58, 0.82], true)
	flare.visible = false
	add_child(flare)
	flash = _rg(W, Vector2(0.5, 0.42), [Color.WHITE, Color(1, 1, 1, 0)], [0.0, 0.62], true)
	flash.visible = false
	add_child(flash)
	word = UIText.new()
	word.style(true, 800, clampf(W.x * 0.10, 30, 58), clampf(W.x * 0.10, 30, 58) * 0.14, "#ffffff", "0 3px 10px rgba(0,0,0,0.6)")
	word.align = 0.5
	word.nowrap = true
	add_child(word)
	word.visible = false
	hint = null
	var hn := base.find_id("#chest-hint")
	if hn:
		base.set_hidden(hn, true)

## CSS radial-gradient(circle at …, farthest-corner) tam ekran
func _rg(W: Vector2, at: Vector2, cols: Array, st: Array, _full: bool) -> ColorRect:
	var r := ColorRect.new()
	r.mouse_filter = Control.MOUSE_FILTER_IGNORE
	r.size = W
	var m := UIK.shader_mat("res://shaders/ui/rgrad.gdshader")
	r.material = m
	var c := W * at
	var R := 0.0
	for k in [Vector2.ZERO, Vector2(W.x, 0), Vector2(0, W.y), W]: R = maxf(R, c.distance_to(k))
	m.set_shader_parameter("size", W)
	m.set_shader_parameter("center", c)
	m.set_shader_parameter("radius", R)
	m.set_shader_parameter("n", cols.size())
	for i in cols.size(): m.set_shader_parameter("c" + str(i), cols[i])
	var sv := Vector4(st[0], st[1] if st.size() > 1 else 1.0, st[2] if st.size() > 2 else 1.0, st[3] if st.size() > 3 else 1.0)
	m.set_shader_parameter("stops", sv)
	return r

func _place_stage(L: Lyr) -> void:
	var sn := L.find(".chest-stage")
	if sn == null: return
	var r := L.rect_of(sn)
	stage.position = L.position + r.position
	stage.setup(r.size.x, r.size.y)

# ═════════════ kare döngüsü ═════════════

static func _bounce_out(x: float) -> float:
	var n1 := 7.5625
	var d1 := 2.75
	if x < 1.0 / d1: return n1 * x * x
	if x < 2.0 / d1:
		x -= 1.5 / d1
		return n1 * x * x + 0.75
	if x < 2.5 / d1:
		x -= 2.25 / d1
		return n1 * x * x + 0.9375
	x -= 2.625 / d1
	return n1 * x * x + 0.984375

func _spawn(n: int, power: float, up: bool) -> void:
	var cc := [JS.col(C.get("accent", C.color)), Color("#ffe9a8"), JS.col(C.get("metal", "#888888"))]
	var o := _stage_center()
	for i in n:
		var a := (-PI / 2 + (randf() - 0.5) * 1.6) if up else randf() * TAU
		var v := power * (0.4 + randf() * 0.8)
		var col: Color = cc[0] if randf() < 0.5 else (cc[1] if randf() < 0.5 else cc[2])
		parts.append({"p": o + Vector2((randf() - 0.5) * 60, CH * 0.12), "v": Vector2(cos(a), sin(a)) * v, "life": 0.6 + randf() * 0.7, "size": 2 + randf() * 3.5, "spin": (randf() - 0.5) * 10, "rot": randf() * TAU, "col": col})

func _stage_center() -> Vector2:
	return stage.position + stage.size_l * Vector2(0.5, 0.5)

func _process(dt: float) -> void:
	if not visible: return
	dt = minf(dt, 0.05)
	_t += dt
	S.t += dt
	var sx := 0.0
	var scale := 1.0
	var sqx := 1.0
	var sqy := 1.0
	var rot := 0.0
	match String(S.phase):
		"drop":
			S.approach = minf(1.0, S.approach + dt * 0.62)
			S.dropY = -560.0 * (1.0 - _bounce_out(S.approach))
			scale = 0.4 + 0.6 * minf(1.0, S.approach * 2.2)
			rot = sin(S.approach * 7) * 0.05 * maxf(0, 1 - S.approach * 2.2)
			if not S.landed and S.approach >= 0.3636:
				S.landed = true
				S.landT = 0.24
				_spawn(26, 210, false)
				_land_t = 0.0
				g.audio.play("chestthud")
			if S.landT > 0:
				S.landT = maxf(0, S.landT - dt)
				var k: float = S.landT / 0.24
				sqx = 1 + k * 0.16; sqy = 1 - k * 0.16
			if S.approach >= 1.0:
				S.phase = "idle"
				S.landT = 0.16
				_show_hint("AÇMAK İÇİN EKRANA DOKUN")
				_spawn(10, 130, false)
		"idle":
			if S.landT > 0:
				S.landT = maxf(0, S.landT - dt)
				var k: float = S.landT / 0.24
				sqx = 1 + k * 0.16; sqy = 1 - k * 0.16
			scale = 1 + sin(S.t * 2.4) * 0.012
			if randf() < dt * 6:
				var o := _stage_center()
				parts.append({"p": o + Vector2((randf() - 0.5) * 130, CH * 0.18), "v": Vector2((randf() - 0.5) * 16, -26 - randf() * 22), "life": 1 + randf() * 0.8, "size": 1.5 + randf() * 2, "spin": 0.0, "rot": 0.0, "col": JS.col(C.color) if randf() < 0.6 else Color("#ffe9a8")})
		"shake":
			S.shakeT -= dt
			var prog := 1.0 - maxf(0, S.shakeT) / 0.85
			var amp := 4 + prog * 8
			sx = sin(S.t * 44) * amp
			rot = sin(S.t * 44 + 0.6) * 0.04 * (0.4 + prog)
			if randf() < dt * (14 + prog * 16): _spawn(2, 90, true)
			if S.shakeT <= 0: _burst()
		"burst":
			S.openT = minf(1.0, S.openT + dt * 1.7)
			S.punch = maxf(0, S.punch - dt * 2.2)
			if S.hopT > 0: S.hopT = maxf(0, S.hopT - dt)
			scale = 1 + S.punch * 0.09
	var hopY: float = sin((1 - S.hopT / 0.55) * PI) * 9 if S.hopT > 0 else 0.0
	stage.p = {"posY": maxf(0, -S.dropY) * (150.0 / 560.0) + hopY, "scaleX": scale * sqx, "scaleY": scale * sqy, "scaleZ": scale, "shakeX": sx * 0.34, "rotZ": rot, "open": S.openT, "seam": S.seam}
	_fx_step(dt)
	_reveal_step(dt)

func _show_hint(s: String) -> void:
	var hn := base.find_id("#chest-hint")
	if hn:
		base.set_hidden(hn, false)
		base.set_text(hn, s)

func _burst() -> void:
	S.phase = "burst"
	S.punch = 1.0
	S.hopT = 0.55
	_tension = false
	_flare_t = 0.0
	var boost := 1.0 + peak * 0.35
	_spawn(int(round(52 * boost)), 360, true)
	_spawn(int(round(24 * boost)), 210, false)
	_rays_target = 0.16
	_beam_t = 0.0
	g.audio.play("chestburst")
	if peak >= 3: _spawn(int(round(60 * boost)), 480, true)
	get_tree().create_timer(0.65, true, false, true).timeout.connect(func(): if visible: _begin_reveal())

func _fx_step(dt: float) -> void:
	# ışın yelpazesi: opaklık geçişi 700 ms, 22 sn'de tam tur
	_rays_on = move_toward(_rays_on, _rays_target, dt / 0.7 * 0.16)
	rays_m.set_shader_parameter("opacity", _rays_on)
	rays_m.set_shader_parameter("rot", fmod(_t / 22.0, 1.0) * TAU)
	# ışık sütunu (chestBeam 900 ms)
	if _beam_t >= 0:
		_beam_t += dt
		var k := clampf(_beam_t / 0.9, 0, 1)
		var e := UIK.bez(0.1, 0.7, 0.25, 1.0, k)
		var h := 0.0
		var op := 0.0
		if e < 0.1:
			h = lerpf(0, 620, e / 0.1); op = lerpf(0, 0.85, e / 0.1)
		elif e < 0.7:
			h = lerpf(620, 700, (e - 0.1) / 0.6); op = lerpf(0.85, 0.6, (e - 0.1) / 0.6)
		else:
			h = lerpf(700, 780, (e - 0.7) / 0.3); op = lerpf(0.6, 0, (e - 0.7) / 0.3)
		var W := UIK.ui_size(get_viewport())
		beam.size = Vector2(300, h)
		beam.position = Vector2(W.x * 0.5 - 150, W.y * 0.54 - h)
		beam_m.set_shader_parameter("opacity", op)
		if k >= 1: _beam_t = -1.0
	# gerilim karartması (0,42 sn nabız) + patlama flaşı (0,5 sn)
	tension.visible = _tension
	if _tension: (tension.material as ShaderMaterial).set_shader_parameter("opacity", 0.85 + 0.15 * cos(_t / 0.42 * TAU))
	if _flare_t >= 0:
		_flare_t += dt
		flare.visible = true
		(flare.material as ShaderMaterial).set_shader_parameter("opacity", clampf(1 - _flare_t / 0.5, 0, 1))
		if _flare_t >= 0.5:
			_flare_t = -1.0
			flare.visible = false
	# iniş sarsıntısı (chestLandShake 260 ms)
	if _land_t >= 0:
		_land_t += dt
		var k := clampf(_land_t / 0.26, 0, 1)
		var off := Vector2.ZERO
		if k < 0.3: off = Vector2(0, -4).lerp(Vector2(-3, 2), k / 0.3)
		elif k < 0.55: off = Vector2(-3, 2).lerp(Vector2(3, 1), (k - 0.3) / 0.25)
		else: off = Vector2(3, 1).lerp(Vector2.ZERO, (k - 0.55) / 0.45)
		position = off
		if k >= 1:
			_land_t = -1.0
			position = Vector2.ZERO
	# flaş
	if _flash_t >= 0:
		_flash_t += dt
		var k := clampf(_flash_t / _flash_dur, 0, 1)
		var a := (k / 0.12 * 0.92) if k < 0.12 else lerpf(0.92, 0.0, (k - 0.12) / 0.88)
		if _flash_rb:
			a = (k / 0.10) if k < 0.10 else lerpf(1.0, 0.0, (k - 0.10) / 0.9)
			# hue-rotate(0 → 320°): nadirlik renginin tonundan döner
			var c := Color.from_hsv(fmod(_flash_c.h + k * 320.0 / 360.0, 1.0), _flash_c.s, _flash_c.v)
			(flash.material as ShaderMaterial).set_shader_parameter("c0", c)
		flash.visible = true
		(flash.material as ShaderMaterial).set_shader_parameter("opacity", a)
		if k >= 1:
			_flash_t = -1.0
			flash.visible = false
	# nadirlik sözü (rarityWord 2 sn)
	if _word_t >= 0:
		_word_t += dt
		var k := clampf(_word_t / 2.0, 0, 1)
		var e := UIK.bez(0.16, 1, 0.3, 1, k)
		var sc := 1.0
		var r := 0.0
		var op := 1.0
		if e < 0.16:
			var u := e / 0.16
			sc = lerpf(0.4, 1.12, u); r = lerpf(-6, 0, u); op = u
		elif e < 0.30: sc = lerpf(1.12, 1.0, (e - 0.16) / 0.14)
		elif e < 0.78: sc = 1.0
		else:
			sc = lerpf(1.0, 1.04, (e - 0.78) / 0.22); op = lerpf(1, 0, (e - 0.78) / 0.22)
		word.visible = true
		word.scale = Vector2.ONE * sc
		word.rotation = deg_to_rad(r)
		word.modulate.a = op
		if _word_rb:
			word.color = Color.from_hsv(fmod(_t / 1.1, 1.0), 0.55, 1.0)
		if k >= 1:
			_word_t = -1.0
			word.visible = false
	# 2B kıvılcımlar
	for i in range(parts.size() - 1, -1, -1):
		var p: Dictionary = parts[i]
		p.life -= dt
		if p.life <= 0:
			parts.remove_at(i)
			continue
		var v: Vector2 = p.v
		v.y += 420 * dt
		p.v = v
		p.p += v * dt
		p.rot += p.spin * dt
	# konfeti
	for i in range(confetti.size() - 1, -1, -1):
		var q: Dictionary = confetti[i]
		q.t += dt
		if q.t > q.delay + q.dur:
			confetti.remove_at(i)
	fx.queue_redraw()

func _draw_parts() -> void:
	for p in parts:
		var c: Color = p.col
		c.a = minf(1.0, p.life / 0.4)
		if p.spin != 0.0:
			fx.draw_set_transform(p.p, p.rot, Vector2.ONE)
			fx.draw_rect(Rect2(-p.size / 2, -p.size / 2, p.size, p.size * 0.6), c)
			fx.draw_set_transform(Vector2.ZERO, 0, Vector2.ONE)
		else:
			fx.draw_rect(Rect2(p.p - Vector2.ONE * p.size / 2, Vector2.ONE * p.size), c)
	var W := UIK.ui_size(get_viewport())
	for q in confetti:
		var u: float = (q.t - q.delay) / q.dur
		if u < 0: continue
		var e := u * u     # ease-in
		var op := (u / 0.08) if u < 0.08 else 1.0 - (u - 0.08) / 0.92
		var c2: Color = q.col
		c2.a = clampf(op, 0, 1)
		var pos: Vector2 = Vector2(q.x * W.x / 100.0 + q.drift * e, -0.08 * q.h + 340.0 * e) + q.o
		fx.draw_set_transform(pos, deg_to_rad(q.rot * e), Vector2.ONE)
		fx.draw_rect(Rect2(-3.5, -5.5, 7, 11), c2)
		fx.draw_set_transform(Vector2.ZERO, 0, Vector2.ONE)

# ═════════════ dokunma ═════════════

func _input(ev: InputEvent) -> void:
	if not visible: return
	if ev is InputEventScreenTouch and (ev as InputEventScreenTouch).pressed:
		get_viewport().set_input_as_handled()
		if S.phase == "idle":
			_start_open()
		elif S.phase == "burst" and rev != null:
			_advance()
		return
	if ev is InputEventScreenTouch or ev is InputEventScreenDrag:
		get_viewport().set_input_as_handled()

func _start_open() -> void:
	S.phase = "shake"
	S.shakeT = 0.72
	_tension = true
	var hn := base.find_id("#chest-hint")
	if hn: base.set_hidden(hn, true)
	g.audio.play("chestlatch")
	Input.vibrate_handheld(30)

# ═════════════ ödüller ═════════════

func _begin_reveal() -> void:
	idx = 0
	if OS.get_cmdline_user_args().has("cersum"):
		# geliştirici: doğrudan özet
		for r in rewards: _to_tray(r)
		idx = rewards.size()
		_summary()
		return
	_show()

func _show() -> void:
	var r: Dictionary = rewards[idx]
	var k := key_of(r)
	if rev:
		rev.queue_free()
	if back:
		back.queue_free()
	rev = Lyr.make("cer_rev_" + k)
	add_child(rev)
	move_child(rev, base.get_index() + 1)
	rev.stretch_h(Scr.dh_of(self))
	base.visible = false
	_layout_tray(rev, false)
	# kart arka yüzü (dönüşte)
	back = Lyr.make("cer_back_" + k)
	var card := rev.find(".cr-card")
	if card: card.node.add_child(back)
	back.visible = false
	_drama = drama_of(r)
	var color := color_of(r)
	var rar := rarity_of(r)
	# metinler
	var tag := rev.find(".cr-card-tag")
	if tag: rev.set_text(tag, _tag_of(r, rar))
	var nm := rev.find(".rw-name")
	if nm: rev.set_text(nm, str(r.get("name", "")))
	_count_t = -1.0
	var cnt := rev.find(".rw-count")
	if cnt and not cnt.d.key.contains(".new"):
		if r.kind == "rubies" or r.kind == "stone":
			_count_to = int(r.get("amount", 0)); _count_ms = 620.0; _count_t = 0.0
		else:
			_count_to = int(r.get("cards", 1)); _count_ms = 480.0; _count_t = 0.0
		rev.set_text(cnt, "+0")
	# görsel: eşya/silah çizimi ya da kahraman portresi
	var gl := rev.find(".rw-glyph")
	if gl and r.kind != "rubies" and r.kind != "stone":
		var tex: Texture2D = null
		if r.kind == "char":
			var pp := "res://assets/ui/art/portrait/" + str(r.get("id", "")) + ".webp"
			if ResourceLoader.exists(pp): tex = UITex.get_tex(pp)
		else:
			var gp := "res://assets/ui/art/gear/" + str(r.get("icon", "")) + ".png"
			if ResourceLoader.exists(gp): tex = UITex.get_tex(gp)
		if tex and r.kind == "char":
			# img.rw-portrait.is-art: 78 px, cover center 12%, köşe 16 px, 2 px nadirlik halkası
			var cc := color_of(r)
			var pr := UIK.round_image(tex, 78, 78, 16, Vector2(0.5, 0.12), 2.0, Color(cc.lerp(Color("#0b090e"), 0.3), 1.0))
			pr.position = gl.size * 0.5 - Vector2(39, 39)
			gl.node.add_child(pr)
		elif tex:
			var sp := Sprite2D.new()
			sp.texture = tex
			sp.scale = Vector2.ONE * (58.0 / maxf(tex.get_width(), tex.get_height()))
			sp.position = gl.size * 0.5
			gl.node.add_child(sp)
	# büyük an
	spot.visible = _drama >= 2
	if _drama >= 2:
		rays_m.set_shader_parameter("col", JS.col(rar.get("glow", "#ffffff")) if rar.has("glow") else color)
		_rays_on = 0.0
		_rays_target = 0.16
	else:
		_rays_target = 0.0
		_rays_on = 0.0
	if _drama >= 1:
		_flash_t = 0.0
		_flash_dur = 1.4 if _drama >= 3 else (0.7 if _drama == 2 else 0.48)
		_flash_rb = _drama >= 3
		(flash.material as ShaderMaterial).set_shader_parameter("c0", color)
		_flash_c = color
	if _drama >= 2:
		word.text = "EFSANEVİ!" if _drama >= 3 else str(rar.get("name", "")) + "!"
		word.color = color
		word.shadow_list = UIK.shadows("0 0 24px #" + color.to_html(false) + ", 0 3px 10px rgba(0,0,0,0.6)")
		var W := UIK.ui_size(get_viewport())
		word.wrap_w = W.x
		word.position = Vector2(0, W.y * 0.24)
		word.size = Vector2(W.x, word.size_px * 1.3)
		word.pivot_offset = word.size * 0.5
		_word_rb = _drama >= 3
		_word_t = 0.0
	if _drama >= 3: _spawn_confetti(46)
	if _drama >= 3: g.audio.play("legendary")
	elif _drama == 2: g.audio.play("epicpull")
	elif _drama == 1: g.audio.play("chestrare")
	else: g.audio.play("reveal")
	_spin_ms = 3000.0 if _drama >= 3 else (1700.0 if _drama == 2 else 900.0)
	_hold_ms = 3700.0 if _drama >= 3 else _spin_ms
	_show_t = 0.0
	_skip = false
	busy = true
	var rh := rev.find_id("#reveal-hint")
	if rh: rev.set_hidden(rh, true)

static func _tag_of(r: Dictionary, rar: Dictionary) -> String:
	if r.kind == "rubies": return "ALTIN"
	if r.kind == "stone": return "GEM"
	if r.kind == "char": return str(rar.get("name", "")) + (" KAHRAMAN" if r.get("isNew", false) else " KART")
	if r.kind == "weapon": return "YENİ SİLAH"
	return str(rar.get("name", "")) + (" EKİPMAN" if r.get("isNew", false) else " KART")

func _spawn_confetti(n: int) -> void:
	var pal := ["#ff5a2c", "#ff9a5c", "#cfd6e2", "#9b6cff", "#8b93a6", "#ffffff"]
	var stg := rev.find(".reveal-stage")
	var o := Vector2.ZERO
	var h := 235.0
	if stg:
		var rr := rev.rect_of(stg)
		o = rr.position
		h = rr.size.y
	var W := UIK.ui_size(get_viewport())
	for i in n:
		confetti.append({"x": 6 + randf() * 88, "delay": randf() * 0.5, "dur": 1.8 + randf() * 1.4, "rot": randf() * 720 - 360, "drift": randf() * 60 - 30, "col": Color(pal[randi() % pal.size()]), "t": 0.0, "o": Vector2(0, o.y), "h": h})

func _reveal_step(dt: float) -> void:
	if rev == null or awaiting: return
	_show_t += dt
	var card := rev.find(".cr-rise")
	var spin := rev.find(".cr-spinner")
	var vh := UIK.ui_size(get_viewport()).y
	# yükseliş (crRise 680 ms) + dönüş (rotateY n·360° → 0)
	var kr := clampf(_show_t / 0.68, 0, 1) if not _skip else 1.0
	var er := UIK.bez(0.18, 0.9, 0.3, 1.06, kr)
	if card:
		card.extra = Transform2D(0, Vector2.ONE * lerpf(0.28, 1.0, er), 0, Vector2(0, lerpf(vh * 0.44, 0, er)))
		card.op_mul = clampf(kr / 0.3, 0, 1)
		rev.set_dyn(card)
	var ks := clampf(_show_t * 1000.0 / _spin_ms, 0, 1) if not _skip else 1.0
	var turns := 2.0 if _drama < 2 else (4.0 if _drama == 2 else 6.0)
	var es := UIK.bez(0.22, 0.68, 0.3, 1.0, ks) if _drama < 2 else (UIK.bez(0.2, 0.6, 0.24, 1.0, ks) if _drama == 2 else UIK.bez(0.16, 0.52, 0.2, 1.0, ks))
	var ang := (1.0 - es) * turns * TAU
	var cs := cos(ang)
	if spin:
		spin.extra = Transform2D(0, Vector2(maxf(0.02, absf(cs)), 1.0), 0, Vector2.ZERO)
		rev.set_dyn(spin)
		var face := rev.find(".cr-card-face")
		if face: face.node.visible = cs >= 0
		if back: back.visible = cs < 0
	# sayaç
	if _count_t >= 0:
		_count_t += dt
		var k := clampf(_count_t * 1000.0 / _count_ms, 0, 1)
		var cnt := rev.find(".rw-count")
		if cnt: rev.set_text(cnt, "+" + str(int(round(_count_to * (1 - pow(1 - k, 3))))))
		if k >= 1: _count_t = -1.0
	if busy and (_show_t * 1000.0 >= _hold_ms or _skip):
		busy = false
		var rh := rev.find_id("#reveal-hint")
		if rh: rev.set_hidden(rh, false)
		if _drama >= 3:
			_rays_target = 0.0
			spot.visible = false

func _advance() -> void:
	if busy:
		if _drama < 3:
			_skip = true
			_show_t = maxf(_show_t, 0.68)
		return
	if awaiting:
		_finish()
		return
	_to_tray(rewards[idx])
	idx += 1
	if idx >= rewards.size():
		_summary()
		return
	_show()

func _summary() -> void:
	awaiting = true
	if rev: rev.visible = false
	if back: back.visible = false
	spot.visible = false
	_rays_target = 0.0
	summ = Lyr.make("cer_sum")
	add_child(summ)
	move_child(summ, base.get_index() + 1)
	summ.stretch_h(Scr.dh_of(self))
	_layout_tray(summ, true)

## Biriken tepsi kartlarını yerleştir (flex-wrap, ortalı). Tepsi büyüdükçe sütun
## (ödüller + sahne + ipucu) dikeyde yeniden ortalanır: kök dT/2 yukarı, tepsiden
## sonraki öğeler dT aşağı. final: özet kipi (78 px kart, 9 px aralık, 380 px satır).
func _layout_tray(L: Lyr, final: bool) -> void:
	var tn := L.find_id("#reveal-tray")
	if tn == null:
		_place_stage(L)
		return
	for k in tn.kids: L.set_hidden(k, true)
	var gap := 9.0 if final else 8.0
	var maxw := 380.0 if final else 340.0
	var cw := 78.0
	var ch := 0.0
	for T in tray:
		ch = maxf(ch, (T as Lyr).nodes[0].size.y)
		cw = (T as Lyr).nodes[0].size.x
	var n := tray.size()
	# satır genişliği: tepsinin max-width'i ile ödül kabının (#chest-rewards) genişliğinin küçüğü
	var cont := L.find_id("#chest-rewards")
	var availw := minf(maxw, cont.size.x if cont else maxw)
	var per := maxi(1, int(floor((availw + gap) / (cw + gap))))
	var rows := int(ceil(float(n) / per))
	var newH := maxf(28.0, rows * ch + maxi(0, rows - 1) * gap) if n > 0 else 28.0
	var h0: float = tn.d.get("_h0", tn.size.y)
	var dT := newH - h0
	L.position.y = -dT * 0.5
	tn.size.y = newH
	for key in ["#reveal-hint", "#chest-hint"]:
		var q := L.find_id(key)
		if q:
			if not q.d.has("_mv0"): q.d["_mv0"] = q.pos
			L.move(q, q.d["_mv0"] + Vector2(0, dT))
	var sn := L.find(".chest-stage")
	if sn:
		if not sn.d.has("_mv0"): sn.d["_mv0"] = sn.pos
		L.move(sn, sn.d["_mv0"] + Vector2(0, dT))
	_place_stage(L)
	var tr := L.rect_of(tn)
	var origin := L.position + tr.position
	for i in n:
		var T: Lyr = tray[i]
		var row := i / per
		var in_row := mini(per, n - row * per)
		var rw := in_row * cw + (in_row - 1) * gap
		var col := i % per
		# yatayda ödül kabının ortası (tepsi içeriğe göre daralır, kap ortalar)
		var cx: float = (L.position.x + L.rect_of(cont).position.x + cont.size.x * 0.5) if cont else origin.x + tr.size.x * 0.5
		T.position = Vector2(cx - rw * 0.5 + col * (cw + gap), origin.y + row * (ch + gap))
		T.visible = true

func _to_tray(r: Dictionary) -> void:
	var T := Lyr.make("cer_tray_" + key_of(r))
	add_child(T)
	_tray_texts(T, r)
	tray.append(T)

func _tray_texts(T: Lyr, r: Dictionary) -> void:
	var rar := rarity_of(r)
	var is_cur: bool = r.kind == "rubies" or r.kind == "stone"
	var tag := T.find(".tc-tag")
	if tag:
		var s := "ALTIN" if r.kind == "rubies" else ("GEM" if r.kind == "stone" else (str(rar.get("name", "")) + (" KAHRAMAN" if r.kind == "char" and r.get("isNew", false) else "")))
		T.set_text(tag, s)
	var lb := T.find(".tray-card-label")
	if lb: T.set_text(lb, ("Altın" if r.kind == "rubies" else "Gem") if is_cur else str(r.get("name", "")))
	var cn := T.find(".tc-count")
	if cn: T.set_text(cn, ("+" + str(int(r.get("amount", 0)))) if is_cur else ("YENİ!" if r.get("isNew", false) else "×" + str(int(r.get("cards", 1)))))
	var gl := T.find(".tray-card-glyph")
	if gl and not is_cur:
		var tex: Texture2D = null
		if r.kind == "char":
			var pp := "res://assets/ui/art/portrait/" + str(r.get("id", "")) + ".webp"
			if ResourceLoader.exists(pp): tex = UITex.get_tex(pp)
		else:
			var gp := "res://assets/ui/art/gear/" + str(r.get("icon", "")) + ".png"
			if ResourceLoader.exists(gp): tex = UITex.get_tex(gp)
		if tex and r.kind == "char":
			# .tc-portrait: 44 px daire, radyal zemin, 1 px nadirlik kenarı, cover center 10%
			var cc := color_of(r)
			var pr := UIK.round_image(tex, 44, 44, 22, Vector2(0.5, 0.1), 1.0, cc.lerp(Color("#232938"), 0.45), cc.lerp(Color("#10131d"), 0.7), Color("#0b0e16"))
			pr.position = gl.size * 0.5 - Vector2(22, 22)
			gl.node.add_child(pr)
		elif tex:
			var sp := Sprite2D.new()
			sp.texture = tex
			sp.scale = Vector2.ONE * (40.0 / maxf(tex.get_width(), tex.get_height()))
			sp.position = gl.size * 0.5
			gl.node.add_child(sp)

func _finish() -> void:
	if UITex.rec == "_cer": UITex.rec = ""
	visible = false
	if not _forced: g.chests.apply_rewards(rewards)
	if slot >= 0:
		g.chests.slots[slot] = null
		g.chests.save()
	g.chests.ceremonyActive = false
	g.audio.play("collect")
	for n in get_children():
		if not (n is Scr._Ticker): n.queue_free()
	base = null; rev = null; back = null; summ = null; tray.clear()
	if done_cb.is_valid(): done_cb.call()
