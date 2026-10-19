class_name ScrGate
extends Scr
## SAVAŞA GİRİŞ — sade, premium yükleme ekranı (v2). Dünyanın kendi gökyüzü resmi (ay + bulutlar)
## yavaşça yakınlaşır; altta dünya renginde ışıma üstünde göz: DÜNYA satırı, büyük GÖREV başlığı,
## süs ayracı, hedef, yıldızlar; dipte ipucu + ince yükleme çubuğu (aşama · yüzde).
## Akış (ui.js playBattleIntro ile aynı): kararma (COVER sn) → on_cover (arena perde arkasında
## kurulur) → çubuk BAR sn'de dolar → açılış: içerik hafif büyüyerek söner, savaş belirir → on_done.
## HUD bu ekranın altında kalır (z_index).

const TIPS := [
	"İmza silahın kahramanınla büyür — kademeler mavi, mor, altın…",
	"Pasif rünler her kahramanda işler: can, hız, saldırı hızı.",
	"Boss dalgalarında sandık zarı üst kademelere kayar.",
	"Canını yarının üstünde tutarsan görev yıldızı kazanırsın.",
	"İki saha sandığı açmak görevin üçüncü yıldızını verir.",
	"Elit düşmanın adı değiştiricisini söyler: kalkanlı, bölünen, patlayan…",
]
const STEPS := ["ARENA KURULUYOR", "DÜŞMANLAR UYANIYOR", "RÜNLER HAZIRLANIYOR", "KAPI AÇILIYOR"]
const COVER := 0.72
const BAR := 2.0
const OPEN := 0.7

var on_cover: Callable
var on_done: Callable
var wc := Color("#b06a49")
var _t := 0.0
var _covered := false
var _finished := false
var _doneAt := -1.0
var _p := 0.0
var _lastPct := -1
var _lastStep := -1

var _root: Node2D            # tüm içerik (açılışta büyür)
var _sky: Sprite2D
var _shade: TextureRect
var _glow: Sprite2D
var _isle: Node2D
var _txt := {}               # ad → UIText
var _deco: Node2D            # ayraç + yıldızlar + çubuk (çizim)
var _stars := -1
var _W := Vector2(390, 844)

func _init(game) -> void:
	super(game)
	name = "Gate"
	z_index = 60                 # HUD (katman kökünde) ve dalga bandı bu ekranın altında

func play(info: Dictionary, cover: Callable, done: Callable) -> void:
	for c in get_children():
		if not (c is Scr._Ticker): c.queue_free()
	on_cover = cover
	on_done = done
	wc = JS.col(info.get("wc", "#b06a49"))
	_W = UIK.ui_size(get_viewport())
	_stars = int(info.get("stars", -1))
	_build(info)
	_t = 0.0
	_covered = false
	_finished = false
	_doneAt = -1.0
	_lastPct = -1
	_lastStep = -1
	_p = 0.0
	modulate.a = 0.0
	visible = true
	g.audio.play("gateclose")
	_layout(0.0)

func _build(info: Dictionary) -> void:
	var W := _W
	# zemin: tam ekran gece (güvenli alan bantları dahil uiroot dışını ui.gd bantları örter)
	var base := ColorRect.new()
	base.color = Color("#050408")
	base.size = W + Vector2(0, 200)
	base.position = Vector2(0, -100)
	base.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(base)
	_root = Node2D.new()
	add_child(_root)
	# dünyanın gökyüzü (ay + bulutlar): üst bölge, ekranı kaplar
	var wn := clampi(int(info.get("worldNo", 1)), 1, 10)
	var sky_t := UITex.get_tex(ClimbArt.BASE + "w" + str(wn) + "/tall_back.png")
	if sky_t:
		var at := AtlasTexture.new()
		at.atlas = sky_t
		var rh := minf(float(sky_t.get_height()), float(sky_t.get_width()) * W.y / W.x)
		at.region = Rect2(0, 0, sky_t.get_width(), rh)
		_sky = Sprite2D.new()
		_sky.texture = at
		_sky.centered = true
		var sc := maxf(W.x / float(sky_t.get_width()), W.y / rh)
		_sky.scale = Vector2.ONE * sc
		_sky.position = W * 0.5
		_root.add_child(_sky)
	# dünyanın boss adası (menü haritasıyla aynı çizim): göğün ortasında süzülür
	_isle = Node2D.new()
	var slot: Dictionary = ClimbArt.meta().get("worlds", {}).get(str(wn), {}).get("slots", {}).get("b9", {})
	var R0: float = float(ClimbArt.meta().get("R0", 90))
	var dpr: float = float(ClimbArt.meta().get("dpr", 2))
	var isc := (W.x * 0.27) / R0 / dpr
	for part in [["body", "_b"], ["top", "_s"]]:
		var mm = slot.get(part[0])
		var tx := UITex.get_tex(ClimbArt.BASE + "w" + str(wn) + "/b9" + part[1] + ".png")
		if mm is Dictionary and tx:
			var sp := Sprite2D.new()
			sp.texture = tx
			sp.centered = false
			sp.scale = Vector2(float(mm.w) / tx.get_width(), float(mm.h) / tx.get_height()) * isc
			sp.position = -Vector2(float(mm.ax), float(mm.ay)) * isc
			_isle.add_child(sp)
	_isle.position = Vector2(W.x * 0.5, W.y * 0.33)
	_root.add_child(_isle)
	# okunurluk: üstte açık, ortadan aşağı koyulaşan perde
	var gr := Gradient.new()
	gr.offsets = PackedFloat32Array([0.0, 0.32, 0.58, 1.0])
	gr.colors = PackedColorArray([Color(0.02, 0.016, 0.03, 0.15), Color(0.02, 0.016, 0.03, 0.25), Color(0.02, 0.016, 0.03, 0.86), Color(0.02, 0.016, 0.03, 0.97)])
	var gt := GradientTexture2D.new()
	gt.gradient = gr
	gt.fill_from = Vector2(0, 0)
	gt.fill_to = Vector2(0, 1)
	gt.width = 4
	gt.height = 256
	_shade = TextureRect.new()
	_shade.texture = gt
	_shade.stretch_mode = TextureRect.STRETCH_SCALE
	_shade.size = W
	_shade.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_root.add_child(_shade)
	# başlığın ardında dünya renginde ışıma
	_glow = Sprite2D.new()
	_glow.texture = ClimbArt.glow_tex()
	var gm := CanvasItemMaterial.new()
	gm.blend_mode = CanvasItemMaterial.BLEND_MODE_ADD
	_glow.material = gm
	_glow.modulate = Color(wc, 0.30)
	_glow.scale = Vector2(W.x * 1.5 / 128.0, 2.2)
	_glow.position = Vector2(W.x * 0.5, W.y * 0.58)
	_root.add_child(_glow)
	# metinler
	var side := str(info.get("side", ""))
	var eyebrow := side if side != "" else ("DÜNYA " + str(wn) + " · " + str(info.get("world", "")))
	var obj := str(info.get("obj", "")) if info.get("obj") != null else ""
	_mk("eye", false, 700, 11.5, 3.2, wc.lerp(Color.WHITE, 0.45), "0 1px 4px rgba(0,0,0,0.8)", eyebrow)
	_mk("title", true, 800, 44, 2.0, Color("#fff4e6"), "0 0 22px #" + wc.to_html(false) + ", 0 3px 8px rgba(0,0,0,0.85)", str(info.get("mission", "SAVAŞ")))
	_mk("obj", false, 600, 13.5, 0.4, Color("#d9d1d6"), "0 1px 4px rgba(0,0,0,0.9)", obj)
	_mk("tip", false, 500, 12, 0.3, Color("#9c94a3"), "0 1px 3px rgba(0,0,0,0.9)", TIPS[randi() % TIPS.size()])
	_mk("step", false, 700, 10, 2.2, Color("#b9b1bd"), "", STEPS[0])
	_mk("pct", true, 800, 13, 1.0, Color("#fff4e6"), "0 1px 3px rgba(0,0,0,0.8)", "0%")
	(_txt.tip as UIText).nowrap = false
	(_txt.tip as UIText).max_lines = 2
	(_txt.step as UIText).align = 0.0
	(_txt.pct as UIText).align = 1.0
	_deco = Node2D.new()
	_deco.draw.connect(_draw_deco)
	_root.add_child(_deco)

func _mk(key: String, disp: bool, w: int, sz: float, ls: float, col: Color, sh: String, s: String) -> void:
	var t := UIText.new()
	t.style(disp, w, sz, ls, col, sh)
	t.align = 0.5
	t.nowrap = true
	t.wrap_w = _W.x - 48.0
	t.text = s
	_root.add_child(t)
	_txt[key] = t

## dikey yerleşim: başlık bloğu ekranın %56'sında, çubuk dipte; k = giriş ilerlemesi (0..1)
func _layout(k: float) -> void:
	var W := _W
	var cy := W.y * 0.56
	var rise := (1.0 - UIK.bez(0.2, 0.8, 0.2, 1.0, k)) * 18.0
	var y := cy - 62.0 + rise
	var obj_on := (_txt.obj as UIText).text != ""
	(_txt.eye as UIText).position = Vector2(24, y)
	(_txt.title as UIText).position = Vector2(24, y + 20)
	(_txt.obj as UIText).position = Vector2(24, y + 96)
	(_txt.obj as UIText).visible = obj_on
	for kk in ["eye", "title", "obj"]:
		(_txt[kk] as UIText).modulate.a = clampf(k * 1.4, 0.0, 1.0)
	var by := W.y - 58.0
	(_txt.tip as UIText).position = Vector2(24, by - 52)
	(_txt.step as UIText).position = Vector2(32, by + 12)
	(_txt.step as UIText).wrap_w = W.x - 64.0
	(_txt.pct as UIText).position = Vector2(32, by + 9)
	(_txt.pct as UIText).wrap_w = W.x - 64.0
	_deco.queue_redraw()

func _draw_deco() -> void:
	var W := _W
	var cy := W.y * 0.56
	var y := cy - 62.0
	var a := clampf((_t - 0.15) / 0.45, 0.0, 1.0)
	# ayraç: ince altın çizgiler + ortada eşkenar dörtgen
	var oy := y + 86.0
	var cx := W.x * 0.5
	var gold := Color(0.85, 0.64, 0.52, 0.9 * a)
	for s in [-1.0, 1.0]:
		var pts := PackedVector2Array([Vector2(cx + s * 12.0, oy), Vector2(cx + s * 92.0, oy)])
		_deco.draw_polyline_colors(pts, PackedColorArray([gold, Color(gold, 0.0)]), 1.5, true)
	var d := 4.5
	_deco.draw_colored_polygon(PackedVector2Array([Vector2(cx, oy - d), Vector2(cx + d, oy), Vector2(cx, oy + d), Vector2(cx - d, oy)]), Color(wc.lerp(Color("#ff7a4c"), 0.3), a))
	# yıldızlar (görev yıldızları; yoksa çizilmez)
	if _stars >= 0:
		var sy := y + (124.0 if (_txt.obj as UIText).text != "" else 104.0)
		for i in 3:
			var c := Vector2(cx + (i - 1) * 26.0, sy)
			var on := i < _stars
			_star(c, 9.0, Color("#ffd27a", a) if on else Color(1, 1, 1, 0.16 * a), on)
	# yükleme çubuğu: ince ray + dünya renginde dolum + uçta ışıma
	var by := W.y - 58.0
	var x0 := 32.0
	var bw := W.x - 64.0
	var tr := StyleBoxFlat.new()
	tr.bg_color = Color(1, 1, 1, 0.08 * maxf(a, 0.6))
	tr.set_corner_radius_all(3)
	_deco.draw_style_box(tr, Rect2(x0, by, bw, 5))
	var fw := bw * _p
	if fw > 1.0:
		var fl := StyleBoxFlat.new()
		fl.bg_color = wc.lerp(Color("#ffb08a"), 0.25)
		fl.set_corner_radius_all(3)
		_deco.draw_style_box(fl, Rect2(x0, by, fw, 5))
		_deco.draw_set_transform(Vector2(x0 + fw, by + 2.5), 0.0, Vector2(0.34, 0.16))
		_deco.draw_texture(ClimbArt.glow_tex(), Vector2(-64, -64), Color(wc.lerp(Color.WHITE, 0.5), 0.9))
		_deco.draw_set_transform(Vector2.ZERO)

func _star(c: Vector2, r: float, col: Color, filled: bool) -> void:
	var pts := PackedVector2Array()
	for i in 10:
		var ang := -PI / 2.0 + i * PI / 5.0
		var rr := r if i % 2 == 0 else r * 0.45
		pts.append(c + Vector2(cos(ang), sin(ang)) * rr)
	if filled: _deco.draw_colored_polygon(pts, col)
	else:
		pts.append(pts[0])
		_deco.draw_polyline(pts, col, 1.2, true)

func _progress(pc: float) -> void:
	_p = pc / 100.0
	var pi := int(round(pc))
	if pi != _lastPct:
		_lastPct = pi
		(_txt.pct as UIText).text = str(pi) + "%"
	var si := 0 if pc < 34 else (1 if pc < 68 else (2 if pc < 99 else 3))
	if si != _lastStep:
		_lastStep = si
		(_txt.step as UIText).text = STEPS[si]

func _process(dt: float) -> void:
	if not visible or _root == null: return
	_t += dt
	# gökyüzü yavaş yakınlaşır (Ken Burns)
	if _sky: _sky.scale = Vector2.ONE * maxf(_W.x / _sky.texture.get_width(), _W.y / _sky.texture.get_height()) * (1.0 + _t * 0.012)
	if _glow: _glow.modulate.a = 0.26 + 0.06 * sin(_t * 2.0)
	if _isle: _isle.position.y = _W.y * 0.33 + sin(_t * 1.6) * 5.0 - minf(1.0, _t / 0.8) * 8.0
	if _doneAt >= 0:
		# açılış: içerik büyüyerek söner, savaş belirir
		var ko := clampf((_t - _doneAt) / OPEN, 0.0, 1.0)
		var e := UIK.bez(0.4, 0.0, 0.2, 1.0, ko)
		modulate.a = 1.0 - e
		_root.scale = Vector2.ONE * (1.0 + 0.07 * e)
		_root.position = -_W * 0.5 * 0.07 * e
		if ko >= 1.0:
			visible = false
			for c in get_children():
				if not (c is Scr._Ticker): c.queue_free()
			_root = null
			if on_done.is_valid(): on_done.call()
		return
	modulate.a = clampf(_t / 0.3, 0.0, 1.0)
	_layout(clampf((_t - 0.12) / 0.6, 0.0, 1.0))
	if not _covered and _t >= COVER:
		_covered = true
		Input.vibrate_handheld(15)
		if on_cover.is_valid(): on_cover.call()
	var k := clampf((_t - COVER + 0.12) / BAR, 0.0, 1.0)
	var eb := k * 1.18 if k < 0.7 else 0.826 + (k - 0.7) * 0.58
	_progress(minf(1.0, eb) * 100.0)
	if k >= 1.0 and not _finished:
		_finished = true
		_progress(100.0)
		g.audio.play("start")
		_doneAt = _t
