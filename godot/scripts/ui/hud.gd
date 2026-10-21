class_name HUD
extends Control
## ui.js SAVAŞ HUD'u — #hud (XP · SEVİYE/DALGA/SÜRE/MATERYAL · rekor farkı ·
## güç rozetleri · boss çubuğu · KATLİAM rozeti · olay pankartları · süper
## düğmesi · duraklat), #banner, hasar/tehlike vinyetleri, yönlü hasar yayı,
## boss anı plakası, kabus perdesi, düşüş filtresi ve #ui-toast.
## Ölçüler/renkler web'in HESAPLANMIŞ stillerinden (tools/bake/ui, tema
## geçersiz kılmaları dahil); CSS animasyonları aynı anahtar kare + zamanlama
## eğrileriyle (UIK.kf / UIK.bez) gerçek zamanda oynar (oyun duraksa da sürer).

const SHD := "res://shaders/ui/"
const C_DIM := Color("#8b8494")
const C_SILVER := Color("#d6dce8")      # temada --gold
const C_BLOOD := Color("#ff3b4e")
const RAR_RM := ["#8b90a3", "#8b90a3", "#6aa8ff", "#b27aff", "#f0c77a"]
const CB_TIER := ["ZİNCİR", "KIYIM", "KATLİAM", "KIZIL HASAT"]
const CB_COL := ["#cfd6e2", "#d8a284", "#ff9a5a", "#ff3b4e"]
const BM := {
	"intro": {"k": "BOSS UYANIYOR", "l": "ÖFKE %60 · SON ÇIRPINIŞ %30 · ARALARDA ZAYIF AN", "ms": 2600},
	"phase1": {"k": "FAZ II", "l": "ZAYIF AN — HASAR ×1,5", "ms": 1700},
	"phase2": {"k": "SON FAZ", "l": "ZAYIF AN — HASAR ×1,5", "ms": 1700},
	"down": {"k": "DEVRİLDİ", "l": "", "ms": 1500},
	"fall": {"k": "YENİLGİ", "l": "", "ms": 1000},
	"rise": {"k": "RUH GERİ DÖNDÜ", "l": "2,5 SN DOKUNULMAZ", "ms": 1600},
}
## bolt: <path d="M13 2 L5 13 h5 l-1 9 8-11 h-5 z"/> (24 birim)
const BOLT := [Vector2(13, 2), Vector2(5, 13), Vector2(10, 13), Vector2(9, 22), Vector2(17, 11), Vector2(12, 11)]

class Draw extends Control:
	var fn: Callable
	func _init(f: Callable = Callable()) -> void:
		fn = f
		mouse_filter = Control.MOUSE_FILTER_IGNORE
	func _draw() -> void:
		if fn.is_valid(): fn.call(self)

var g
var W := 390.0
var H := 844.0
var sa := PackedFloat32Array([0, 0, 0, 0])   # sat, sar, sab, sal
var _t := 0.0
var shown := false

# katmanlar
var dyingRect: ColorRect
var nmVeil: ColorRect
var vigDanger: ColorRect
var vigHurt: ColorRect
var hurtArc: TextureRect
var root: Control            # #hud
var banner: Control
var bm: Control
var toastBox: Draw

# XP
var xpBg: NinePatchRect
var xpClip: Control
var xpFill: NinePatchRect
var xpHold: Control
var xpGlint: Draw
var _xpFrom := 0.0
var _xpTo := 0.0
var _xpAt := -9.0
# metinler
var lbLevel: UIText
var vLevel: UIText
var lbMoney: UIText
var vMoney: UIText
var tWave: UIText
var tTimer: UIText
var ghost: Draw
var ghostTxt: UIText
var _gd = null
var _timerDanger := false
# rozetler
var puRow: Draw
var _puKey := ""
var _pu: Array = []          # [{g, txt, col, ending, w}]
var _puAt := -9.0
# boss
var bossBox: Control
var bossName: UIText
var bossTrack: NinePatchRect
var bossClip: Control
var bossFill: NinePatchRect
var bossHold: Control
var _bossOn := false
var _bFrom := 1.0
var _bTo := 1.0
var _bAt := -9.0
# katliam
var cb: Control
var cbBg: ColorRect
var cbSmall: UIText
var cbB: UIText
var cbBar: Draw
var _cbLive := false
var _cbOnAt := -9.0
var _cbShown := 0
var _cbBumpAt := -9.0
var _cbTierShown := -1
var _cbClassTier := 0
var _cbTierAt := -9.0
var _cbFrac := 0.0
var _cbAlpha := 0.0
var _cbX := -24.0
var _cbXFrom := -24.0
var _cbAFrom := 0.0
# süper
var ult: Control
var ultRing: ColorRect
var ultCore: ColorRect
var ultIcon: Draw
var ultLab: UIText
var ringMat: ShaderMaterial
var coreMat: ShaderMaterial
var _ultPc := -1
var _ultSt := -1
var _ultRar := -1
var _ultCol := Color("#ffd2bb")
var _ultPress := -1
var _ultPressK := 0.0
var _ultNopeAt := -9.0
# duraklat
var pauseImg: TextureRect
var comic: Draw              # Borderlands tarzı plakalar (mürekkep konturlu, yarım ton)
var _gem_tex: Texture2D
var lvTag: UIText
const INK := Color(0.05, 0.03, 0.07)
var _pausePress := -1
# pankart
var bnMain: UIText
var bnSub: UIText
var _bnAt := -99.0
var _bnSub := false
# vinyet zamanları
var _hurtOn := false
var _hurtAt := -9.0
var _hurtA := 0.0
var _dangerOn := false
var _dangerAt := 0.0
var _arcAt := -9.0
# boss anı
var bmVeil: ColorRect
var bmVeilMat: ShaderMaterial
var bmPlate: Control
var bmBg: ColorRect
var bmLines: Draw
var bmK: UIText
var bmN: UIText
var bmL: UIText
var _bmKind := ""
var _bmAt := -99.0
var _bmUntil := -99.0
var bmOn := false
# olay pankartları / süper flaşları
var _evs: Array = []         # [{node, at}]
var _flashes: Array = []     # [{node, at}]
# toast
var _toast := ""
var _toastAt := -99.0
var _toastUntil := -99.0
var _toastW := 0.0
var _toastTxt: UIText
# düşüş
var _dying := false
var _dyK := 0.0
var _dyFrom := 0.0
var _dyAt := -9.0

func _init(game) -> void:
	g = game
	name = "HUD"
	mouse_filter = Control.MOUSE_FILTER_IGNORE
	process_mode = Node.PROCESS_MODE_ALWAYS

func _rect(mat: ShaderMaterial, parent: Node) -> ColorRect:
	var r := ColorRect.new()
	r.color = Color.WHITE
	r.material = mat
	r.mouse_filter = Control.MOUSE_FILTER_IGNORE
	parent.add_child(r)
	return r

func _radial(parent: Node, c0: Color, s0: float, c1: Color, s1 := 1.0, center := Vector2(0.5, 0.5), rad := Vector2(0.70710678, 0.70710678)) -> ColorRect:
	var m := UIK.shader_mat(SHD + "radial.gdshader")
	var r := _rect(m, parent)
	_set_radial(m, c0, s0, c1, s1, center, rad)
	return r

func _set_radial(m: ShaderMaterial, c0: Color, s0: float, c1: Color, s1 := 1.0, center := Vector2(0.5, 0.5), rad := Vector2(0.70710678, 0.70710678)) -> void:
	m.set_shader_parameter("c0", c0)
	m.set_shader_parameter("s0", s0)
	m.set_shader_parameter("c1", c1)
	m.set_shader_parameter("s1", s1)
	m.set_shader_parameter("center", center)
	m.set_shader_parameter("rad", rad)

func _panel(parent: Node, radius: float, stops: Array, s1: float, s2: float, bl := 0.0, bcol := Color(0, 0, 0, 0), inset := Color(0, 0, 0, 0)) -> ColorRect:
	var m := UIK.shader_mat(SHD + "panel.gdshader")
	var r := _rect(m, parent)
	m.set_shader_parameter("radius", radius)
	for i in 4: m.set_shader_parameter("g" + str(i), stops[i])
	m.set_shader_parameter("s1", s1)
	m.set_shader_parameter("s2", s2)
	m.set_shader_parameter("bl", bl)
	m.set_shader_parameter("bcol", bcol)
	m.set_shader_parameter("inset_col", inset)
	return r

func _panel_size(r: ColorRect, sz: Vector2) -> void:
	r.size = sz
	(r.material as ShaderMaterial).set_shader_parameter("size", sz)

func _txt(parent: Node) -> UIText:
	var l := UIText.new()
	parent.add_child(l)
	return l

func _ready() -> void:
	set_anchors_preset(Control.PRESET_FULL_RECT)
	# yakalamalar 3× çözünürlükte ve 1/3 ölçekle çizilir → mipmap'li süzme (titreşimsiz küçültme)
	texture_filter = CanvasItem.TEXTURE_FILTER_LINEAR_WITH_MIPMAPS
	# ── düşüş filtresi (oyun katmanlarının üstü, HUD'un altı) ──
	var dm := UIK.shader_mat(SHD + "dying.gdshader")
	dyingRect = _rect(dm, self)
	dyingRect.visible = false
	# ── vinyetler (z 5) ──
	vigDanger = _radial(self, Color(0, 0, 0, 0), 0.62, Color(150 / 255.0, 12 / 255.0, 28 / 255.0, 0.62))
	vigDanger.visible = false
	vigHurt = _radial(self, Color(0, 0, 0, 0), 0.55, Color(1, 59 / 255.0, 78 / 255.0, 0.55))
	vigHurt.visible = false
	hurtArc = TextureRect.new()
	hurtArc.texture = UIK.tex("hud_hurt_arc")
	hurtArc.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	hurtArc.stretch_mode = TextureRect.STRETCH_SCALE
	hurtArc.size = Vector2(300, 150)
	hurtArc.pivot_offset = Vector2(150, 75)
	hurtArc.mouse_filter = Control.MOUSE_FILTER_IGNORE
	hurtArc.visible = false
	add_child(hurtArc)
	# ── #hud (z 10) ──
	root = Control.new()
	root.mouse_filter = Control.MOUSE_FILTER_IGNORE
	root.visible = false
	add_child(root)
	# kabus perdesi (html.nm-run #hud::after, z −1)
	nmVeil = _radial(root, Color(0, 0, 0, 0), 0.55, Color(90 / 255.0, 6 / 255.0, 20 / 255.0, 0.42), 1.0, Vector2(0.5, 0.45), Vector2(1.3, 1.0))
	nmVeil.visible = false
	comic = Draw.new(_draw_comic)
	root.add_child(comic)
	lvTag = UIText.new()
	lvTag.style(false, 1000, 10, 1.0, "#ffd23a", "")
	lvTag.anchor_x = 0.5
	lvTag.text = "SV"
	root.add_child(lvTag)
	_build_xp()
	_build_row()
	_build_pu()
	_build_boss()
	_build_cb()
	_build_ult()
	pauseImg = UIK.img(root, "hud_pause")
	pauseImg.visible = false
	_build_banner()
	_build_bm()
	toastBox = Draw.new(_draw_toast)
	add_child(toastBox)
	_toastTxt = _txt(toastBox).style(false, 700, 11, 1.32, C_SILVER, "", 14)
	_toastTxt.anchor_x = 0.5
	toastBox.visible = false
	_layout()

# ═══════════ KURULUM ═══════════

func _build_xp() -> void:
	xpBg = UIK.nine(root, "hud_xpbar", 8 + 5)
	xpBg.visible = false
	xpClip = Control.new()
	xpClip.clip_contents = true
	xpClip.mouse_filter = Control.MOUSE_FILTER_IGNORE
	root.add_child(xpClip)
	# scaleX kökü kutunun sol kenarı (transform-origin 0 50%) → ayrı tutucu
	xpHold = Control.new()
	xpHold.mouse_filter = Control.MOUSE_FILTER_IGNORE
	xpClip.add_child(xpHold)
	xpFill = UIK.nine(xpHold, "hud_xpfill_full", 12 + 4)
	xpFill.visible = false
	xpGlint = Draw.new(_draw_glint)
	xpClip.add_child(xpGlint)

func _build_row() -> void:
	var lb: Array = UIK.meta("hud_cell_l").get("texts", [])
	lbLevel = UIK.text_from(root, lb[0] if lb.size() else {}, "SEVİYE")
	lbLevel.line_h = 9.45
	vLevel = _txt(root).style(false, 1000, 24, 0.5, "#2a1408", "", 24)
	vLevel.anchor_x = 0.5
	vLevel.text = "1"
	lbMoney = _txt(root).style(false, 800, 8, 1.6, "#b9a8d6", "", 9.45)
	lbMoney.text = "MATERYAL"
	lbMoney.anchor_x = 1.0
	vMoney = _txt(root).style(false, 1000, 24, 1.0, "#ffffff", UIK.ink_stroke(2.0, 2.0), 24)
	vMoney.anchor_x = 1.0
	vMoney.text = "0"
	tWave = _txt(root).style(false, 1000, 13, 1.4, INK, "", 13)
	tWave.anchor_x = 0.5
	ghost = Draw.new(_draw_ghost)
	root.add_child(ghost)
	ghostTxt = _txt(ghost).style(false, 700, 10, 0.6, "#ff8a94", "", 10)
	ghost.visible = false
	tTimer = _txt(root).style(false, 1000, 30, 2.0, "#fff1c8", UIK.ink_stroke(2.0, 3.0), 30)
	tTimer.anchor_x = 0.5

func _build_pu() -> void:
	puRow = Draw.new(_draw_pu)
	root.add_child(puRow)

func _build_boss() -> void:
	bossBox = Control.new()
	bossBox.mouse_filter = Control.MOUSE_FILTER_IGNORE
	bossBox.visible = false
	root.add_child(bossBox)
	bossName = _txt(bossBox).style(true, 800, 12, 4.2, C_BLOOD, "rgba(255, 59, 78, 0.6) 0px 0px 12px", 16)
	bossName.anchor_x = 0.5
	bossTrack = UIK.nine(bossBox, "hud_bosstrack", 8 + 6)
	bossClip = Control.new()
	bossClip.clip_contents = true
	bossClip.mouse_filter = Control.MOUSE_FILTER_IGNORE
	bossBox.add_child(bossClip)
	bossHold = Control.new()
	bossHold.mouse_filter = Control.MOUSE_FILTER_IGNORE
	bossClip.add_child(bossHold)
	bossFill = UIK.nine(bossHold, "hud_bossfill_full", 14 + 2)

func _build_cb() -> void:
	cb = Control.new()
	cb.mouse_filter = Control.MOUSE_FILTER_IGNORE
	cb.visible = false
	root.add_child(cb)
	var a := Color(11 / 255.0, 9 / 255.0, 16 / 255.0, 0.82)
	var b := Color(11 / 255.0, 9 / 255.0, 16 / 255.0, 0.2)
	cbBg = _panel(cb, 10, [a, a, b, b], 0.0, 1.0, 3, Color(CB_COL[0]))
	cbSmall = _txt(cb).style(false, 800, 9, 1.8, CB_COL[0], "", 9)
	cbB = _txt(cb).style(true, 800, 22, 0, Color.WHITE, "rgba(0, 0, 0, 0.7) 0px 2px 0px", 22)
	cbBar = Draw.new(_draw_cb_bar)
	cb.add_child(cbBar)

func _build_ult() -> void:
	ult = Control.new()
	ult.mouse_filter = Control.MOUSE_FILTER_IGNORE
	ult.size = Vector2(74, 74)
	root.add_child(ult)
	ringMat = UIK.shader_mat(SHD + "ult_ring.gdshader")
	ultRing = _rect(ringMat, ult)
	ultRing.position = Vector2(-12, -12)
	ultRing.size = Vector2(98, 98)
	coreMat = UIK.shader_mat(SHD + "ult_core.gdshader")
	ultCore = _rect(coreMat, ult)
	ultCore.position = Vector2(37 - 47, 37 - 47)
	ultCore.size = Vector2(94, 94)
	ultCore.pivot_offset = Vector2(47, 47)
	ultIcon = Draw.new(_draw_bolt)
	ultIcon.size = Vector2(26, 26)
	ultIcon.position = Vector2(24, 24)
	ultIcon.pivot_offset = Vector2(13, 13)
	ult.add_child(ultIcon)
	ultLab = _txt(ult).style(false, 800, 9, 1.8, Color(207 / 255.0, 214 / 255.0, 226 / 255.0, 0.6), "", 12)
	ultLab.anchor_x = 0.5
	ultLab.position = Vector2(37, 76)
	ultLab.text = "SÜPER"

func _build_banner() -> void:
	banner = Control.new()
	banner.mouse_filter = Control.MOUSE_FILTER_IGNORE
	banner.visible = false
	add_child(banner)
	bnMain = _txt(banner).style(true, 800, 39, 4.68, "#f0eae4", "rgba(255, 59, 78, 0.5) 0px 0px 30px, rgba(0, 0, 0, 0.9) 0px 4px 12px", 53)
	bnMain.anchor_x = 0.5
	bnSub = _txt(banner).style(false, 700, 13, 3.9, C_BLOOD, "rgba(255, 59, 78, 0.6) 0px 0px 14px", 17)
	bnSub.anchor_x = 0.5

func _build_bm() -> void:
	bm = Control.new()
	bm.mouse_filter = Control.MOUSE_FILTER_IGNORE
	bm.visible = false
	add_child(bm)
	bmVeilMat = UIK.shader_mat(SHD + "radial.gdshader")
	bmVeil = _rect(bmVeilMat, bm)
	bmPlate = Control.new()
	bmPlate.mouse_filter = Control.MOUSE_FILTER_IGNORE
	bm.add_child(bmPlate)
	var t := Color(0, 0, 0, 0)
	var d := Color(12 / 255.0, 8 / 255.0, 10 / 255.0, 0.86)
	bmBg = _panel(bmPlate, 0, [t, d, d, t], 0.18, 0.82)
	bmLines = Draw.new(_draw_bm_lines)
	bmPlate.add_child(bmLines)
	bmK = _txt(bmPlate).style(false, 900, 10, 3.4, "#ff8a7a", "", 13)
	bmK.anchor_x = 0.5
	bmN = _txt(bmPlate).style(true, 800, 27.3, 1.64, "#f4ece6", "rgba(255, 59, 78, 0.45) 0px 0px 18px, rgb(0, 0, 0) 0px 2px 0px", 37)
	bmN.anchor_x = 0.5
	bmL = _txt(bmPlate).style(false, 800, 9, 1.26, "#f0c7a6", "", 12)
	bmL.anchor_x = 0.5

# ═══════════ YERLEŞİM ═══════════

## #hud akış yüksekliği (olay pankartı %30/%40 ve KATLİAM rozeti %36 buna göre)
var _hudH := 65.0
var _rowH := 37.0
var _puY := 65.0
var _bossY := 75.0

func _layout() -> void:
	var r := get_viewport().get_visible_rect().size if is_inside_tree() else Vector2(390, 844)
	W = r.x; H = r.y
	sa = UIK.safe(get_viewport()) if is_inside_tree() else sa
	size = r
	var sat := sa[0]; var sar := sa[1]; var sab := sa[2]; var sal := sa[3]
	for c in [dyingRect, vigDanger, vigHurt, nmVeil, bmVeil]:
		c.position = Vector2.ZERO
		c.size = r
	root.size = r
	var L := 12 + sal
	var R := W - 12 - sar
	var cw := R - L
	# XP çubuğu
	UIK.place_nine(xpBg, "hud_xpbar", L, sat + 6, cw)
	xpClip.position = Vector2(L + 1, sat + 7)
	xpClip.size = Vector2(cw - 2, 5)
	var fm := UIK.meta("hud_xpfill_full")
	xpFill.position = Vector2(fm.get("ox", -12), fm.get("oy", -7))
	xpFill.size = Vector2((cw - 2 + 24) * 3, xpFill.texture.get_size().y)
	xpGlint.size = xpClip.size
	# satır: orta sütun en uzunu; hücreler dikey ortalı
	var rowY := sat + 20
	_rowH = 49.0 if ghost.visible else 37.0
	var cellY := rowY + (_rowH - 29.375) * 0.5
	lbLevel.position = Vector2(L, cellY)
	vLevel.position = Vector2(L, cellY + 9.4375)
	lbMoney.position = Vector2(R, cellY)
	vMoney.position = Vector2(R, cellY + 9.4375)
	var cx := L + cw * 0.5
	tWave.position = Vector2(cx, rowY)
	var ty := rowY + 13
	if ghost.visible:
		ghost.position = Vector2(cx + 3 - ghost.size.x * 0.5, rowY + 13)
		ty += 12
	tTimer.position = Vector2(cx, ty)
	tTimer.pivot_offset = Vector2.ZERO
	# rozet satırı + boss çubuğu (akış)
	_puY = rowY + _rowH + 8
	var puH := 22.0 if _pu.size() else 0.0
	puRow.position = Vector2(L, _puY)
	puRow.size = Vector2(cw, puH)
	_bossY = _puY + puH + 10
	_hudH = _puY + puH + (45.0 if bossBox.visible else 0.0)
	var bw := minf(420, cw - 108)
	var bx := L + (cw - bw) * 0.5
	bossBox.position = Vector2(bx, _bossY)
	bossName.position = Vector2(bw * 0.5, 4)
	UIK.place_nine(bossTrack, "hud_bosstrack", 0, 25, bw)
	bossClip.position = Vector2(1, 26)
	bossClip.size = Vector2(bw - 2, 8)
	var bm_ := UIK.meta("hud_bossfill_full")
	bossFill.position = Vector2(bm_.get("ox", -14), bm_.get("oy", -14))
	bossFill.size = Vector2((bw - 2 + 28) * 3, bossFill.texture.get_size().y)
	# duraklat: sat+66, sağ 10, 42×42
	var pm := UIK.meta("hud_pause")
	pauseImg.position = Vector2(W - sar - 10 - 42 + pm.get("ox", -12), sat + 66 + pm.get("oy", -12))
	# süper: sağ 16, üst H − sab − 122
	ult.position = Vector2(W - sar - 16 - 74, H - sab - 122)
	# katliam rozeti: sol sal+10, üst %36 (#hud)
	cb.position = Vector2(sal + 10 + _cbX, _hudH * 0.36)
	# pankart: top max(%32, sat+150)
	banner.position = Vector2(W * 0.5, maxf(H * 0.32, sat + 150))
	bnMain.position = Vector2.ZERO
	bnSub.position = Vector2(0, 53 + 6)
	# boss anı plakası: %22, genişlik min(%92, 380)
	var pw := minf(W * 0.92, 380)
	bmN.size_px = clampf(W * 0.07, 22, 32)
	bmN.line_h = roundf(bmN.size_px * 1.355)
	var ph := 12 + 13 + 4 + bmN.line_h + 4 + (12.0 if bmL.text != "" else 0.0) + 13
	bmPlate.size = Vector2(pw, ph)
	bmPlate.position = Vector2((W - pw) * 0.5, H * 0.22)
	bmPlate.pivot_offset = Vector2(pw * 0.5, ph * 0.5)
	_panel_size(bmBg, Vector2(pw, ph))
	bmLines.size = Vector2(pw, ph)
	bmK.position = Vector2(pw * 0.5, 12)
	bmN.position = Vector2(pw * 0.5, 12 + 13 + 4)
	bmL.position = Vector2(pw * 0.5, 12 + 13 + 4 + bmN.line_h + 4)
	lbLevel.visible = false
	lbMoney.visible = false
	var bc := _lvl_center()
	vLevel.position = Vector2(bc.x, bc.y - 13)
	lvTag.position = Vector2(bc.x, bc.y + 17)
	vMoney.anchor_x = 1.0
	vMoney.position = Vector2(R - 10, cellY + 1)
	tTimer.position.y += 1
	comic.size = r
	comic.queue_redraw()

# ═══════════ ÇİZİMLER ═══════════

## çizgi roman paneli: mürekkep ofset gölge + kontur + üstte ışık şeridi
func _plate(c: Control, r: Rect2, fill: Color, rad := 10.0, bw := 3.0) -> void:
	var sh := StyleBoxFlat.new()
	sh.bg_color = INK
	sh.set_corner_radius_all(int(rad))
	c.draw_style_box(sh, Rect2(r.position + Vector2(0, 3), r.size))
	var b := StyleBoxFlat.new()
	b.bg_color = fill
	b.set_corner_radius_all(int(rad))
	b.set_border_width_all(int(bw))
	b.border_color = INK
	c.draw_style_box(b, r)
	c.draw_line(r.position + Vector2(rad, bw + 2.5), r.position + Vector2(r.size.x - rad, bw + 2.5), Color(1, 1, 1, 0.16), 2.0)

func _lvl_center() -> Vector2:
	var rowY := sa[0] + 20
	return Vector2(12 + sa[3] + 26, rowY + (_rowH - 29.375) * 0.5 + 14)

func _draw_comic(c: Control) -> void:
	if not root.visible: return
	var sat := sa[0]; var sar := sa[1]; var sal := sa[3]
	var L := 12 + sal
	var R := W - 12 - sar
	var cw := R - L
	# XP çubuğu: kalın, mürekkep konturlu, dolum limon→altın, yarım ton, parıltı
	var xr := Rect2(L, sat + 4, cw, 11)
	_plate(c, xr, Color("#1d1526"), 6, 2.5)
	var fw := (cw - 6) * clampf(_xp_now(), 0.0, 1.0)
	if fw > 2.0:
		var f := StyleBoxFlat.new()
		f.bg_color = Color("#b8f05a")
		f.set_corner_radius_all(4)
		c.draw_style_box(f, Rect2(L + 3, sat + 7, fw, 5))
		c.draw_rect(Rect2(L + 3, sat + 7, fw, 2), Color(1, 1, 0.8, 0.55))
		var gx := L + 3 + fmod(_t * 90.0, maxf(1.0, fw))
		c.draw_rect(Rect2(gx, sat + 7, minf(8.0, L + 3 + fw - gx), 5), Color(1, 1, 1, 0.45))
	# satır plakaları
	var rowY := sat + 20
	var cellY := rowY + (_rowH - 29.375) * 0.5
	# SEVİYE: sarı patlama rozeti (çizgi roman yıldızı), çevresinde XP halkası
	var bc := _lvl_center()
	var star := PackedVector2Array()
	var ink := PackedVector2Array()
	var wob := 1.0 + sin(_t * 3.0) * 0.02
	for i in 20:
		var a := -PI * 0.5 + i * TAU / 20.0
		var rr := (25.0 if i % 2 == 0 else 19.0) * wob
		star.append(bc + Vector2(cos(a), sin(a)) * rr)
		ink.append(bc + Vector2(cos(a), sin(a)) * (rr + 3.5) + Vector2(1.5, 3))
	c.draw_colored_polygon(ink, INK)
	var ink2 := PackedVector2Array()
	for i in 20:
		var a := -PI * 0.5 + i * TAU / 20.0
		ink2.append(bc + Vector2(cos(a), sin(a)) * ((25.0 if i % 2 == 0 else 19.0) * wob + 3.0))
	c.draw_colored_polygon(ink2, INK)
	c.draw_colored_polygon(star, Color("#ffd23a"))
	c.draw_circle(bc + Vector2(-6, -7), 5, Color(1, 1, 1, 0.55))
	# SV etiketi (rozetin altında küçük bant)
	c.draw_rect(Rect2(bc.x - 13, bc.y + 18, 26, 11), INK)
	# MATERYAL: eğik koyu hap + boyanmış gem
	var mw := 92.0
	var mr := Rect2(R - mw, cellY - 1, mw, 32)
	var pts := PackedVector2Array([mr.position + Vector2(10, 0), mr.position + Vector2(mw, 0), mr.position + Vector2(mw - 10, 32), mr.position + Vector2(0, 32)])
	var sh := PackedVector2Array()
	for q in pts: sh.append(q + Vector2(2, 4))
	c.draw_colored_polygon(sh, INK)
	c.draw_colored_polygon(pts, INK)
	var inner := PackedVector2Array([pts[0] + Vector2(2, 3), pts[1] + Vector2(-3, 3), pts[2] + Vector2(-2, -3), pts[3] + Vector2(3, -3)])
	c.draw_colored_polygon(inner, Color("#3b2a5c"))
	c.draw_line(pts[0] + Vector2(6, 6), pts[1] + Vector2(-8, 6), Color(1, 1, 1, 0.18), 2.0)
	if _gem_tex == null: _gem_tex = load("res://assets/fx/currency/gem.png")
	var gs := 30.0
	c.draw_texture_rect(_gem_tex, Rect2(Vector2(mr.position.x - 10, mr.position.y + 1), Vector2(gs, gs)), false)
	# orta: dalga şeridi + süre plakası
	var cx := L + cw * 0.5
	var pw := 132.0
	var pr := Rect2(cx - pw * 0.5, rowY - 3, pw, _rowH + 6)
	_plate(c, pr, Color("#24192c"), 12)
	var rib := Rect2(cx - pw * 0.5 + 3, rowY - 0, pw - 6, 14)
	var rb := StyleBoxFlat.new()
	rb.bg_color = Color("#ffb03a")
	rb.corner_radius_top_left = 9
	rb.corner_radius_top_right = 9
	c.draw_style_box(rb, rib)
	c.draw_line(Vector2(rib.position.x, rib.end.y), Vector2(rib.end.x, rib.end.y), INK, 2.5)
	# duraklat düğmesi: yuvarlak, mürekkep konturlu
	var pp := Vector2(W - sar - 10 - 21, sat + 66 + 21)
	c.draw_circle(pp + Vector2(0, 3), 21, INK)
	c.draw_circle(pp, 21, INK)
	c.draw_circle(pp, 18, Color("#3a2f4a"))
	c.draw_arc(pp, 14, PI * 1.15, PI * 1.85, 12, Color(1, 1, 1, 0.18), 2.5, true)
	for dx in [-5.0, 5.0]:
		c.draw_rect(Rect2(pp.x + dx - 2.5, pp.y - 8, 5, 16), Color("#fff1c8"))
	# süper düğmesi: kalın mürekkep halka
	var uc := ult.position + Vector2(37, 37)
	c.draw_circle(uc + Vector2(0, 3), 41, INK)

func _draw_glint(c: Control) -> void:
	# #xp-glint: 34 px bant (%50 ± 17), translateX(−50% − 23px) → (60% + 17px), 3,2 sn doğrusal
	var w := c.size.x
	var h := c.size.y
	var f := fmod(_t, 3.2) / 3.2
	var tx := lerpf(-(w * 0.5 + 23), w * 0.6 + 17, f)
	var m := w * 0.5 + tx
	var cl := Color(1, 1, 1, 0)
	var cw := Color(1, 1, 1, 0.35)
	c.draw_polygon(PackedVector2Array([Vector2(m - 17, 0), Vector2(m, 0), Vector2(m, h), Vector2(m - 17, h)]), PackedColorArray([cl, cw, cw, cl]))
	c.draw_polygon(PackedVector2Array([Vector2(m, 0), Vector2(m + 17, 0), Vector2(m + 17, h), Vector2(m, h)]), PackedColorArray([cw, cl, cl, cw]))

func _draw_ghost(c: Control) -> void:
	var sb := StyleBoxFlat.new()
	sb.bg_color = Color(8 / 255.0, 6 / 255.0, 10 / 255.0, 0.55)
	sb.set_corner_radius_all(6)
	c.draw_style_box(sb, Rect2(Vector2.ZERO, c.size))

func _draw_pu(c: Control) -> void:
	if _pu.is_empty(): return
	var gap := 6.0
	var tot := -gap
	for b in _pu: tot += b.w + gap
	var x := (c.size.x - tot) * 0.5
	var age := _t - _puAt
	for b in _pu:
		var col: Color = b.col
		var a := 1.0
		var s := 1.0
		if b.ending:
			a = UIK.kf([[0.0, 1.0], [0.5, 0.3], [1.0, 1.0]], fmod(age, 0.4) / 0.4, UIK.EASE_IN_OUT)
		elif age < 0.22:
			var k := UIK.ez(UIK.EASE_OUT, age / 0.22)
			a = k; s = lerpf(0.8, 1.0, k)
		var w: float = b.w
		var ctr := Vector2(x + w * 0.5, 11)
		c.draw_set_transform(ctr - ctr * s, 0, Vector2(s, s))
		var sb := StyleBoxFlat.new()
		sb.bg_color = Color(12 / 255.0, 14 / 255.0, 20 / 255.0, 0.9 * a)
		sb.border_color = Color(col, a)
		sb.set_border_width_all(1)
		sb.set_corner_radius_all(3)
		sb.shadow_color = Color(col, 0.3 * a)
		sb.shadow_size = 7
		c.draw_style_box(sb, Rect2(x, 0, w, 22))
		var fg := UIK.font(true, 900, 1.2)
		var ft := UIK.font(true, 800, 1.2)
		var bx := x + 1 + 5
		# <b> 13 px (line-height 1) dikey ortada; metin 10 px
		c.draw_string(fg, Vector2(bx, 11 + (fg.get_ascent(13) - fg.get_descent(13)) * 0.5), b.g, HORIZONTAL_ALIGNMENT_LEFT, -1, 13, Color(col, a))
		var gw: float = b.gw
		c.draw_string(ft, Vector2(bx + gw + 5, 11 + (ft.get_ascent(10) - ft.get_descent(10)) * 0.5), b.txt, HORIZONTAL_ALIGNMENT_LEFT, -1, 10, Color(col, a))
		x += w + gap
	c.draw_set_transform(Vector2.ZERO, 0, Vector2.ONE)

func _draw_cb_bar(c: Control) -> void:
	var w := c.size.x
	var sb := StyleBoxFlat.new()
	sb.bg_color = Color(1, 1, 1, 0.12)
	sb.set_corner_radius_all(1)
	c.draw_style_box(sb, Rect2(0, 0, w, 2))
	if _cbFrac > 0:
		c.draw_rect(Rect2(0, 0, w * _cbFrac, 2), Color(CB_COL[clampi(_cbTierShown, 0, 3)]))

func _draw_bolt(c: Control) -> void:
	var k := 26.0 / 24.0
	var pts := PackedVector2Array()
	for p in BOLT: pts.append(p * k)
	var ready_ := _ultSt == 2
	if ready_:
		var sh := PackedVector2Array()
		for p in pts: sh.append(p + Vector2(0, 1))
		c.draw_colored_polygon(sh, Color(0, 0, 0, 0.6))
	var col := Color.WHITE if ready_ else Color(207 / 255.0, 214 / 255.0, 226 / 255.0, 0.45)
	c.draw_colored_polygon(pts, col)
	# çokgen dolgusu kenar yumuşatmasız → yarım piksellik yumuşak kontur
	var ring := pts.duplicate()
	ring.append(pts[0])
	c.draw_polyline(ring, Color(col, col.a * 0.6), 0.75, true)

func _draw_bm_lines(c: Control) -> void:
	var w := c.size.x
	var x0 := w * 0.12
	var x1 := w * 0.88
	var cs := [Color(0, 0, 0, 0), Color("#b06a49"), Color("#f0c7a6"), Color("#b06a49"), Color(0, 0, 0, 0)]
	for y in [0.0, c.size.y - 1.5]:
		for i in 4:
			var a := lerpf(x0, x1, i / 4.0)
			var b := lerpf(x0, x1, (i + 1) / 4.0)
			var ca: Color = cs[i]
			var cb_: Color = cs[i + 1]
			if ca.a == 0: ca = Color(cb_, 0)
			if cb_.a == 0: cb_ = Color(ca, 0)
			c.draw_polygon(PackedVector2Array([Vector2(a, y), Vector2(b, y), Vector2(b, y + 1.5), Vector2(a, y + 1.5)]), PackedColorArray([ca, cb_, cb_, ca]))

func _draw_toast(c: Control) -> void:
	var sb := StyleBoxFlat.new()
	sb.bg_color = Color(18 / 255.0, 21 / 255.0, 31 / 255.0, 0.96)
	sb.border_color = Color("#6b5320")
	sb.set_border_width_all(1)
	sb.set_corner_radius_all(18)
	sb.shadow_color = Color(0, 0, 0, 0.6)
	sb.shadow_size = 15
	sb.shadow_offset = Vector2(0, 10)
	c.draw_style_box(sb, Rect2(Vector2.ZERO, c.size))

# ═══════════ GİRİŞ (düğmeler) ═══════════

func _hit(p: Vector2, pos: Vector2, sz: Vector2, slop := 4.0) -> bool:
	return Rect2(pos - Vector2(slop, slop), sz + Vector2(slop, slop) * 2).has_point(p)

func _input(ev: InputEvent) -> void:
	if not root.visible or not shown: return
	if ev is InputEventScreenTouch:
		var st := ev as InputEventScreenTouch
		if st.pressed:
			if g.state != "playing": return
			var pp := Vector2(W - sa[1] - 10 - 42, sa[0] + 66)
			if _hit(st.position, pp, Vector2(42, 42)):
				_pausePress = st.index
				get_viewport().set_input_as_handled()
				return
			var uc := ult.position + Vector2(37, 37)
			if st.position.distance_to(uc) <= 37 + 4:
				_ultPress = st.index
				get_viewport().set_input_as_handled()
				# web: pointerdown → anında ateş; olmazsa "nope" sarsıntısı
				if not g.ult.fire(): _ultNopeAt = _t
				return
		else:
			if st.index == _pausePress:
				_pausePress = -1
				get_viewport().set_input_as_handled()
				var pp2 := Vector2(W - sa[1] - 10 - 42, sa[0] + 66)
				if _hit(st.position, pp2, Vector2(42, 42), 12) and g.state == "playing":
					g.audio.play("click")
					g.pause_game()
			elif st.index == _ultPress:
				_ultPress = -1
				get_viewport().set_input_as_handled()
	elif ev is InputEventScreenDrag:
		var sd := ev as InputEventScreenDrag
		if sd.index == _ultPress or sd.index == _pausePress: get_viewport().set_input_as_handled()

# ═══════════ API (ui.js) ═══════════

func show_game() -> void:
	root.visible = true
	shown = true
	bossBox.visible = g.enemies.boss != null
	_ultPc = -1; _ultSt = -1; _ultRar = -1
	_puKey = ""
	_cache_reset()
	update_hud()

func hide_hud() -> void:
	root.visible = false
	shown = false
	banner.visible = false
	_pausePress = -1
	_ultPress = -1

var cXp := -1
var cLevel := -1
var cWave := ""
var cTimer := -999
var cMoney := -1
var cBoss := -1

func _cache_reset() -> void:
	cXp = -1; cLevel = -1; cWave = ""; cTimer = -999; cMoney = -1; cBoss = -1

func update_hud() -> void:
	var p = g.player
	var xpPct := mini(100, int(floor(float(p.xp) / maxf(1, float(p.xpNext)) * 100)))
	if xpPct != cXp:
		_xpFrom = _xp_now(); _xpTo = xpPct / 100.0; _xpAt = _t
		cXp = xpPct
	if p.level != cLevel:
		cLevel = p.level
		vLevel.text = str(p.level)
	var waveStr := str(g.worldId) + "-" + str(g.missionId) + " · DALGA " + str(g.wave) + "/" + str(int(g.msn.get("waves", 0)))
	if waveStr != cWave:
		cWave = waveStr
		tWave.text = waveStr
	# v56 D2 · HAYALET
	var gd = Journey.ghost_delta(g)
	if gd != _gd:
		_gd = gd
		var vis: bool = gd != null
		if vis != ghost.visible:
			ghost.visible = vis
			_layout()
		if vis:
			ghostTxt.text = ("+" + str(gd) if gd >= 0 else str(gd)) + " REKOR"
			ghostTxt.color = Color("#8fd6a4") if gd >= 0 else Color("#ff8a94")
			ghost.size = Vector2(ghostTxt.text_width() + 12, 12)
			ghostTxt.position = Vector2(6, 1)
			_layout()
	# v61 süper halkası
	if g.ult:
		var U = g.ult
		var pc := int(round(U.charge / 80.0 * 100))
		if pc != _ultPc:
			_ultPc = pc
			ringMat.set_shader_parameter("p", float(pc))
		var st := 2 if U.ready else 1
		if st != _ultSt or U.rar != _ultRar:
			_ultSt = st; _ultRar = U.rar
			_ultCol = JS.col(U.id.col)
			_ult_style()
	# v59 KATLİAM rozeti
	var n := int(g._cbN)
	var age: float = g.time - g._cbT
	var live := n >= 5 and age < 1.4
	if live != _cbLive:
		_cbLive = live
		_cbOnAt = _t
		_cbAFrom = cb.modulate.a if cb.visible else 0.0
		_cbXFrom = _cbX if cb.visible else -24.0
		cb.visible = true
	if live:
		if n != _cbShown:
			_cbShown = n
			cbB.text = "×" + str(n)
			_cbBumpAt = _t
			_cb_size()
		var tier := int(g._cbTier)
		if tier != _cbTierShown:
			_cbTierShown = tier
			cbSmall.text = CB_TIER[clampi(tier, 0, 3)]
			var cc := Color(CB_COL[clampi(tier, 0, 3)])
			cbSmall.color = cc
			cbB.shadow_list = [[Color(0, 0, 0, 0.7), 0.0, 2.0, 0.0], [cc, 0.0, 0.0, 12.0]]
			(cbBg.material as ShaderMaterial).set_shader_parameter("bcol", cc)
			if tier >= 1 and _cbClassTier == 0: _cbTierAt = _t
			_cbClassTier = tier
			_cb_size()
		_cbFrac = maxf(0, 1 - age / 1.4)
		cbBar.queue_redraw()
	elif _cbShown:
		_cbShown = 0
		_cbTierShown = -1
	var tShow: int
	if g.is_boss_wave(g.wave): tShow = -1
	else: tShow = int(ceil(g.waveTimer))
	if tShow != cTimer:
		cTimer = tShow
		tTimer.text = "BOSS" if tShow < 0 else _fmt_time(tShow)
		_timerDanger = tShow >= 0 and tShow <= 5
		tTimer.color = C_BLOOD if _timerDanger else Color("#efe9f0")
	var money := int(floor(p.money))
	if money != cMoney:
		cMoney = money
		vMoney.text = str(money)
	var boss = g.enemies.boss
	if boss:
		var pct := maxi(0, int(round(float(boss.hp) / float(boss.maxHp) * 200)))
		if pct != cBoss:
			_bFrom = _boss_now(); _bTo = pct / 200.0; _bAt = _t
			cBoss = pct
	# ETKİN GÜÇ ROZETLERİ
	var PW = g.powerups
	if PW:
		var sh := int(ceil(PW.shieldT))
		var fr := int(ceil(PW.freezeT))
		var mg := int(ceil(PW.magnetT))
		var key := str(sh) + "|" + str(fr) + "|" + str(mg)
		if key != _puKey:
			_puKey = key
			var had := _pu.size()
			_pu.clear()
			if sh > 0: _pu.append(_badge("O", "KALKAN " + str(sh), "#ffd45a", sh <= 2))
			if fr > 0: _pu.append(_badge("*", "DONUK " + str(fr), "#a8e8ff", fr <= 1))
			if mg > 0: _pu.append(_badge("U", "ÇEKİM " + str(mg), "#5ad2ff", mg <= 2))
			_puAt = _t
			if (had > 0) != (_pu.size() > 0): _layout()

func _badge(gl: String, txt: String, col: String, ending: bool) -> Dictionary:
	var gw := UIK.font(true, 900, 1.2).get_string_size(gl, HORIZONTAL_ALIGNMENT_LEFT, -1, 13).x
	var tw := UIK.font(true, 800, 1.2).get_string_size(txt, HORIZONTAL_ALIGNMENT_LEFT, -1, 10).x
	return {"g": gl, "txt": txt, "col": Color(col), "ending": ending, "gw": gw, "w": 1 + 5 + gw + 5 + tw + 8 + 1}

func _fmt_time(sec: int) -> String:
	var s := maxi(0, sec)
	return "%02d:%02d" % [s / 60, s % 60]

func _xp_now() -> float:
	return lerpf(_xpFrom, _xpTo, UIK.ez(UIK.EASE_OUT, clampf((_t - _xpAt) / 0.16, 0, 1)))

func _boss_now() -> float:
	return lerpf(_bFrom, _bTo, clampf((_t - _bAt) / 0.12, 0, 1))

func _ult_style() -> void:
	var ready_ := _ultSt == 2
	ringMat.set_shader_parameter("uc", _ultCol)
	ringMat.set_shader_parameter("ready", 1.0 if ready_ else 0.0)
	if ready_:
		# radial-gradient(circle at 50% 30%, mix(uc 60%, #fff), mix(uc 60%, #3a1a10) 72%)
		coreMat.set_shader_parameter("c0", _ultCol.lerp(Color.WHITE, 0.4))
		coreMat.set_shader_parameter("c1", _ultCol.lerp(Color("#3a1a10"), 0.4))
		coreMat.set_shader_parameter("cy", 0.30)
		coreMat.set_shader_parameter("stop", 0.72)
		coreMat.set_shader_parameter("hl", 0.5)
		coreMat.set_shader_parameter("sh", 0.0)
		coreMat.set_shader_parameter("glow", Color(_ultCol, 1.0))
		ultLab.color = _ultCol
	else:
		coreMat.set_shader_parameter("c0", Color("#3a3040"))
		coreMat.set_shader_parameter("c1", Color("#140f18"))
		coreMat.set_shader_parameter("cy", 0.32)
		coreMat.set_shader_parameter("stop", 0.70)
		coreMat.set_shader_parameter("hl", 0.14)
		coreMat.set_shader_parameter("sh", 0.5)
		coreMat.set_shader_parameter("glow", Color(0, 0, 0, 0))
		ultLab.color = Color(207 / 255.0, 214 / 255.0, 226 / 255.0, 0.6)
	ultIcon.queue_redraw()

func _cb_size() -> void:
	var cw := maxf(cbSmall.text_width(), cbB.text_width())
	var w := maxf(64, 3 + 8 + cw + 9)
	var h := 5 + 9 + 1 + 22 + 1 + 5 + 6
	_panel_size(cbBg, Vector2(w, h))
	cb.size = Vector2(w, h)
	cb.pivot_offset = Vector2(w * 0.5, h * 0.5)
	cbSmall.position = Vector2(11, 5)
	cbB.position = Vector2(11, 15)
	cbB.pivot_offset = Vector2(0, 22 * 0.6)
	cbBar.position = Vector2(11, 15 + 22 + 1 + 3)
	cbBar.size = Vector2(w - 11 - 9, 2)

func banner_show(main: String, sub = "") -> void:
	bnMain.text = main
	_bnSub = sub != null and str(sub) != ""
	bnSub.text = str(sub) if _bnSub else ""
	bnSub.visible = _bnSub
	_bnAt = _t
	banner.visible = true

func show_boss_bar(nm) -> void:
	bossName.text = str(nm)
	if not bossBox.visible:
		bossBox.visible = true
		_layout()
	cBoss = -1
	_bFrom = 1.0; _bTo = 1.0

func hide_boss_bar() -> void:
	if bossBox.visible:
		bossBox.visible = false
		_layout()

func hurt_flash() -> void:
	_hurtA0 = _hurtA
	_hurtOn = true
	_hurtAt = _t

func set_danger(on: bool) -> void:
	if on == _dangerOn: return
	_dangerOn = on
	_dangerAt = _t

func hurt_dir(a: float) -> void:
	var cx := W * 0.5
	var cy := H * 0.5
	var ux := cos(a)
	var uy := sin(a)
	var t := minf(cx / absf(ux) if absf(ux) > 1e-3 else 1e9, cy / absf(uy) if absf(uy) > 1e-3 else 1e9)
	hurtArc.position = Vector2(cx + ux * t, cy + uy * t) - Vector2(150, 75)
	hurtArc.rotation = a + PI / 2
	_arcAt = _t
	hurtArc.visible = true

func boss_moment(kind: String, nm) -> void:
	if not BM.has(kind): return
	var M: Dictionary = BM[kind]
	_bmKind = kind
	bmOn = true
	bm.visible = true
	_bmAt = _t
	_bmUntil = _t + M.ms / 1000.0
	bmK.text = M.k
	bmN.text = "ÖFKELENDİ" if kind == "phase1" else ("SON ÇIRPINIŞ" if kind == "phase2" else (str(nm) if nm != null else ""))
	bmL.text = M.l
	var t := Color(0, 0, 0, 0)
	match kind:
		"phase2": _set_radial(bmVeilMat, t, 0.35, Color(170 / 255.0, 10 / 255.0, 24 / 255.0, 0.6), 1.0, Vector2(0.5, 0.5), Vector2(1.2, 0.8))
		"down": _set_radial(bmVeilMat, Color(240 / 255.0, 199 / 255.0, 122 / 255.0, 0.18), 0.0, Color(10 / 255.0, 6 / 255.0, 4 / 255.0, 0.55), 1.0, Vector2(0.5, 0.5), Vector2(1.2, 0.8))
		"fall": _set_radial(bmVeilMat, t, 0.30, Color(120 / 255.0, 8 / 255.0, 18 / 255.0, 0.62), 1.0, Vector2(0.5, 0.5), Vector2(1.2, 0.9))
		"rise": _set_radial(bmVeilMat, Color(240 / 255.0, 199 / 255.0, 166 / 255.0, 0.22), 0.0, t, 0.70, Vector2(0.5, 0.55), Vector2(1.2, 0.9))
		_: _set_radial(bmVeilMat, t, 0.45, Color(120 / 255.0, 10 / 255.0, 20 / 255.0, 0.45), 1.0, Vector2(0.5, 0.5), Vector2(1.2, 0.8))
	bmK.color = Color({"down": "#f0c77a", "fall": "#ff8a8f", "rise": "#f0c7a6"}.get(kind, "#ff8a7a"))
	bmN.ls = 5.46 if kind == "fall" else 1.64
	bmN.shadow_list = UIK.shadows("rgba(240, 199, 122, 0.55) 0px 0px 22px, rgb(0, 0, 0) 0px 2px 0px" if kind == "down" else "rgba(255, 59, 78, 0.45) 0px 0px 18px, rgb(0, 0, 0) 0px 2px 0px")
	_layout()

func event_banner(nm: String, sub: String, col) -> void:
	var ec := JS.col(col)
	var box := Control.new()
	box.mouse_filter = Control.MOUSE_FILTER_IGNORE
	root.add_child(box)
	var b := _txt(box).style(true, 800, 16, 1.6, ec, "rgba(0, 0, 0, 0.7) 0px 2px 0px", 22)
	b.text = nm
	var e := _txt(box).style(false, 400, 11, 0, "#d8d2dc", "", 14)
	e.text = sub
	var tw := maxf(b.text_width(), e.text_width())
	var w := minf(10 + 16 + 10 + tw + 16, W * 0.86)
	var h := 53.0
	var a := Color(11 / 255.0, 9 / 255.0, 16 / 255.0, 0.2)
	var d := Color(11 / 255.0, 9 / 255.0, 16 / 255.0, 0.86)
	var bg := _panel(box, 12, [a, d, d, a], 0.2, 0.8, 0, Color(0, 0, 0, 0), Color(ec, 0.5))
	box.move_child(bg, 0)
	_panel_size(bg, Vector2(w, h))
	var gem := Draw.new(func(c: Control):
		var sb := StyleBoxFlat.new()
		sb.bg_color = ec
		sb.shadow_color = Color(ec, 0.55)
		sb.shadow_size = 8
		c.draw_style_box(sb, Rect2(0, 0, 16, 16)))
	gem.size = Vector2(16, 16)
	gem.position = Vector2(10, (h - 16) * 0.5)
	box.add_child(gem)
	b.position = Vector2(36, 8)
	e.position = Vector2(36, 8 + 22 + 1)
	box.size = Vector2(w, h)
	box.pivot_offset = Vector2(w * 0.5, h * 0.5)
	_evs.append({"node": box, "gem": gem, "at": _t})

func ult_flash(col, rar: int) -> void:
	if Settings.data.get("rm", false): return
	var uc := JS.col(col)
	var r: ColorRect
	if rar >= 4: r = _radial(root, Color(uc, 0.18), 0.2, Color(uc, 0.6), 1.0, Vector2(0.5, 0.55), Vector2(0.7, 0.6))
	else: r = _radial(root, Color(uc, 0), 0.4, Color(uc, 0.45), 1.0, Vector2(0.5, 0.55), Vector2(0.7, 0.6))
	r.size = Vector2(W, H)
	root.move_child(r, 1)
	_flashes.append({"node": r, "at": _t})

func toast(msg: String) -> void:
	_toastTxt.text = msg
	var w := _toastTxt.text_width() + 40 + 2
	toastBox.size = Vector2(w, 36)
	_toastTxt.position = Vector2(w * 0.5, 11)
	if _t > _toastUntil + 0.2: _toastAt = _t
	_toastUntil = _t + 1.8
	toastBox.visible = true
	toastBox.queue_redraw()

func set_dying(on: bool) -> void:
	if on == _dying: return
	_dying = on
	_dyFrom = _dyK
	_dyAt = _t
	if Settings.data.get("rm", false): _dyAt = -9

func set_nm_run(on: bool) -> void:
	nmVeil.visible = on

# ═══════════ KARE ═══════════

func _process(dt: float) -> void:
	_t += dt
	var r := get_viewport().get_visible_rect().size
	if r.x != W or r.y != H: _layout()
	var rm: bool = Settings.data.get("rm", false)
	# düşüş filtresi (0,6 sn ease-out)
	var dyT := 1.0 if _dying else 0.0
	_dyK = lerpf(_dyFrom, dyT, UIK.ez(UIK.EASE_OUT, clampf((_t - _dyAt) / 0.6, 0, 1)))
	dyingRect.visible = _dyK > 0.001
	if dyingRect.visible: (dyingRect.material as ShaderMaterial).set_shader_parameter("k", _dyK)
	# hasar vinyeti: flash → 40 ms ease-in; 130 ms sonra → 90 ms ease-out
	if _hurtOn and _t - _hurtAt >= 0.13: _hurtOn = false; _hurtAt = _t; _hurtA0 = _hurtA
	if _hurtOn: _hurtA = lerpf(_hurtA0, 1.0, UIK.ez(UIK.EASE_IN, clampf((_t - _hurtAt) / 0.04, 0, 1)))
	else: _hurtA = lerpf(_hurtA0, 0.0, UIK.ez(UIK.EASE_OUT, clampf((_t - _hurtAt) / 0.09, 0, 1)))
	vigHurt.visible = _hurtA > 0.002
	if vigHurt.visible: (vigHurt.material as ShaderMaterial).set_shader_parameter("opacity", _hurtA)
	# tehlike vinyeti: dangerBeat 1,05 sn (lub-dub)
	vigDanger.visible = _dangerOn
	if _dangerOn:
		var dk: float = 0.6 if rm else UIK.kf([[0.0, 0.35], [0.12, 0.95], [0.24, 0.5], [0.34, 0.85], [0.6, 0.35], [1.0, 0.35]], fmod(_t - _dangerAt, 1.05) / 1.05, UIK.EASE_IN_OUT)
		(vigDanger.material as ShaderMaterial).set_shader_parameter("opacity", dk)
	# yönlü hasar yayı: 0,95 → 0, 340 ms ease-out
	if hurtArc.visible:
		var ak := (_t - _arcAt) / 0.34
		if ak >= 1: hurtArc.visible = false
		else: hurtArc.modulate.a = lerpf(0.95, 0.0, UIK.ez(UIK.EASE_OUT, ak))
	if root.visible: _tick_hud(rm)
	_tick_banner()
	_tick_bm()
	_tick_toast()

var _hurtA0 := 0.0

func _tick_hud(rm: bool) -> void:
	# XP dolumu (scaleX, 160 ms ease-out) + parıltı
	xpHold.scale = Vector2(_xp_now(), 1.0)
	xpGlint.visible = false
	comic.queue_redraw()
	# süre: ≤5 sn nabız (0,5 sn, %50 opaklık)
	tTimer.modulate.a = UIK.kf([[0.0, 1.0], [0.5, 0.5], [1.0, 1.0]], fmod(_t, 0.5) / 0.5, UIK.EASE_IN_OUT) if _timerDanger else 1.0
	# boss dolgusu (120 ms doğrusal)
	if bossBox.visible: bossHold.scale = Vector2(_boss_now(), 1.0)
	# rozetler
	if _pu.size(): puRow.queue_redraw()
	# süper: nefes 1,3 sn · ışın dönüşü 6 sn · basılı 0,92 · "nope" sarsıntısı
	var ready_ := _ultSt == 2
	var s := 1.0
	if ready_ and not rm: s = UIK.kf([[0.0, 1.0], [0.5, 1.08], [1.0, 1.0]], fmod(_t, 1.3) / 1.3, UIK.EASE_IN_OUT)
	var pt := 1.0 if _ultPress >= 0 else 0.0
	_ultPressK += (pt - _ultPressK) * (1 - exp(-get_process_delta_time() / 0.07))
	s *= lerpf(1.0, 0.92, _ultPressK)
	var nx := 0.0
	var na := (_t - _ultNopeAt) / 0.3
	if na < 1: nx = UIK.kf([[0.0, 0.0], [0.25, -3.0], [0.75, 3.0], [1.0, 0.0]], na, UIK.EASE)
	ultCore.scale = Vector2(s, s)
	ultCore.position = Vector2(-10 + nx, -10)
	ultIcon.scale = Vector2(s, s)
	ultIcon.position = Vector2(24 + nx, 24)
	if ready_ and not rm: ringMat.set_shader_parameter("spin", fmod(_t, 6.0) / 6.0 * TAU)
	# katliam rozeti: açılış/kapanış (opaklık 220 ms ease · translateX 320 ms POP), sayı vuruşu, kademe
	if cb.visible:
		var oa := clampf((_t - _cbOnAt) / 0.22, 0, 1)
		var ox := clampf((_t - _cbOnAt) / 0.32, 0, 1)
		var tgtA := 1.0 if _cbLive else 0.0
		var tgtX := 0.0 if _cbLive else -24.0
		var a := lerpf(_cbAFrom, tgtA, UIK.ez(UIK.EASE, oa))
		var x := lerpf(_cbXFrom, tgtX, UIK.ez(UIK.POP, ox))
		cb.modulate.a = a
		_cbX = x
		cb.position = Vector2(sa[3] + 10 + x, _hudH * 0.36)
		var ts := 1.0
		var tk := (_t - _cbTierAt) / 0.42
		if tk < 1 and not rm: ts = lerpf(1.25, 1.0, UIK.ez(UIK.POP, tk))
		cb.scale = Vector2(ts, ts)
		var bs := 1.0
		var bk := (_t - _cbBumpAt) / 0.24
		if bk < 1 and not rm: bs = lerpf(1.35, 1.0, UIK.ez(UIK.POP, bk))
		cbB.scale = Vector2(bs, bs)
		if not _cbLive and oa >= 1 and ox >= 1: cb.visible = false
	# olay pankartları
	for i in range(_evs.size() - 1, -1, -1):
		var E: Dictionary = _evs[i]
		var box: Control = E.node
		var age: float = _t - E.at
		if age >= 2.6:
			box.queue_free()
			_evs.remove_at(i)
			continue
		var top := _hudH * (0.4 if bmOn else 0.3)
		var y := 0.0
		var sc := 1.0
		var al := 1.0
		if age < 0.48:
			var k := UIK.ez(UIK.POP, age / 0.48)
			y = lerpf(-24, 0, k); sc = lerpf(0.9, 1.0, k); al = clampf(k, 0, 1)
		if age >= 2.2:
			var k2 := UIK.ez(UIK.EASE, clampf((age - 2.2) / 0.38, 0, 1))
			y = lerpf(0, -14, k2); al = 1 - k2
		box.position = Vector2(W * 0.5 - box.size.x * 0.5, top + y)
		box.scale = Vector2(sc, sc)
		box.modulate.a = al
		(E.gem as Control).position.y = (53 - 16) * 0.5 + UIK.kf([[0.0, 0.0], [0.5, -4.0], [1.0, 0.0]], fmod(age, 1.4) / 1.4, UIK.EASE_IN_OUT)
	# süper flaşları (650 ms ease-out; 700 ms'de silinir)
	for i in range(_flashes.size() - 1, -1, -1):
		var F: Dictionary = _flashes[i]
		var fa: float = _t - F.at
		if fa >= 0.7:
			(F.node as Node).queue_free()
			_flashes.remove_at(i)
		else:
			((F.node as ColorRect).material as ShaderMaterial).set_shader_parameter("opacity", 1.0 - UIK.ez(UIK.EASE_OUT, minf(1, fa / 0.65)))

func _tick_banner() -> void:
	if not banner.visible: return
	var age := _t - _bnAt
	if age >= 2.0:
		banner.visible = false
		return
	var p := age / 2.0
	var E := [0.16, 1.0, 0.3, 1.0]
	var op: float = UIK.kf([[0.0, 0.0], [0.18, 1.0], [0.75, 1.0], [1.0, 0.0]], p, E)
	var sx: float = UIK.kf([[0.0, 1.62], [0.18, 1.0], [1.0, 0.96]], p, E)
	var sy: float = UIK.kf([[0.0, 1.4], [0.18, 1.0], [1.0, 0.96]], p, E)
	var ty: float = UIK.kf([[0.0, -10.0], [0.18, 0.0], [1.0, 0.0]], p, E)
	bnMain.pivot_offset = Vector2(0, 53 * 0.5)
	bnMain.scale = Vector2(sx, sy)
	bnMain.position = Vector2(0, ty * sy)
	bnMain.modulate.a = op
	if _bnSub:
		bnSub.modulate.a = UIK.kf([[0.0, 0.0], [0.12, 0.0], [0.22, 1.0], [0.75, 1.0], [1.0, 0.0]], p, UIK.EASE)
	banner.modulate.a = 0.0 if bmOn else 1.0

func _tick_bm() -> void:
	if not bm.visible: return
	if _t >= _bmUntil:
		bm.visible = false
		bmOn = false
		return
	var age := _t - _bmAt
	var va: float = UIK.kf([[0.0, 0.0], [0.15, 1.0], [1.0, 0.6]], minf(1, age / 2.4), UIK.EASE_OUT)
	bmVeilMat.set_shader_parameter("opacity", va)
	var k := UIK.ez([0.2, 1.4, 0.4, 1.0], minf(1, age / 0.5))
	bmPlate.scale = Vector2(lerpf(1.42, 1.0, k), lerpf(1.25, 1.0, k))

func _tick_toast() -> void:
	if not toastBox.visible: return
	var on := _t < _toastUntil
	var k: float
	if on: k = UIK.ez(UIK.EASE, clampf((_t - _toastAt) / 0.2, 0, 1))
	else:
		k = 1.0 - UIK.ez(UIK.EASE, clampf((_t - _toastUntil) / 0.2, 0, 1))
		if k <= 0:
			toastBox.visible = false
			return
	toastBox.modulate.a = k
	toastBox.position = Vector2((W - toastBox.size.x) * 0.5, H - sa[2] - 110 - 36 + 8 * (1 - k))
