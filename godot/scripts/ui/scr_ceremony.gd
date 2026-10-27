class_name ScrCeremony
extends Scr
## Sandık açılış töreni (v2 · Clash Royale akışı, Borderlands çizgi roman dili).
## İniş (sandık yukarıdan düşer, ezilip zıplar) → "AÇMAK İÇİN DOKUN!" → artan sarsıntı →
## PATLAMA (flaş, sarı "POW" yıldızı, ışınlar, kıvılcım) → ödüller TEK TEK sandıktan fırlar:
## kart yayla yükselir, arka yüzden ön yüze döner (nadirlikle uzayan dönüş, epik/efsanevi
## için söz + flaş + konfeti), sayaç tıklar → dokun: kart kenara süzülür, sıradaki gelir →
## KAZANDIKLARIN özeti (mini kartlar sırayla patlar) → dokun → bitir.
## Takılmasızlık: tüm kartlar iniş sırasında (her karede bir tane) opak zeminin ARKASINDA
## kurulup bir kez çizilir — dokular, yazı tipi glifleri, gölgelendiriciler açılıştan önce
## hazırdır. 3B sandık (ChestStage) kalıcıdır; menü ısınması (UIPrewarm) onu önceden işler.

const INK := Color(0.05, 0.03, 0.07)
const PAPER := Color("#fff3d6")
const YEL := Color("#ffd23a")
const CARD := Vector2(196, 266)
const STAGE := 300.0

var type := ""
var slot := -1
var done_cb: Callable
var rewards: Array = []
var C: Dictionary
var peak := 0
var _forced := false          # geliştirici: zorlanmış ödüller uygulanmaz
var _menu_vis := false

var stage: ChestStage
var _W := Vector2(390, 844)
var _SR := Rect2(0, 0, 390, 844)     # tüm ekran (yerel)
var _bg: ColorRect
var _rays: Node2D            # zemin ışın yelpazesi (döner)
var _fx: Node2D              # kıvılcımlar, POW yıldızı, halkalar
var _flash: ColorRect
var _title: UIText
var _hint: UIText
var _word: UIText
var _badge: Node2D
var _badge_t: UIText
var _hold: Node2D            # kart kabı (zeminin üstü)
var _warm: Node2D            # ısınma kabı (zeminin ARKASI — görünmez ama çizilir)
var _sum_title: UIText

var S := {}
var _t := 0.0
var parts: Array = []        # {p, v, life, max, size, col, star}
var confetti: Array = []
var _pow_t := -1.0
var _flash_t := -1.0
var _flash_dur := 0.4
var _flash_c := Color.WHITE
var _rays_a := 0.0
var _rays_target := 0.0
var _rays_col := Color.WHITE
var _land_t := -1.0

# kartlar
var cards: Array = []        # {node, face, back, cnt, r, drama, col, built}
var _build_i := 0
var idx := -1
var _ct := 0.0
var _cstate := ""            # fly · rest · out
var _fly_d := 0.6
var _spin_d := 0.6
var _turns := 1.0
var _landed := false
var _count_to := 0
var _count_t := -1.0
var _word_t := -1.0
var _out_from := Vector2.ZERO
var _sum_t := -1.0
var _sum_cards: Array = []
var _left := 0
var _badge_pop := -1.0

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
	var rk := ChestSystem.rk_of(r)
	if rk >= 4: return 3
	if rk >= 3: return 2
	if r.kind == "char" or r.kind == "weapon" or rk >= 2: return 1
	return 0

static func color_of(r: Dictionary) -> Color:
	if r.kind == "rubies": return Color("#ffb020")
	if r.kind == "stone": return Color("#9d5cff")
	if r.kind == "weapon": return Color("#ff6a2a")
	return rank_col(ChestSystem.rk_of(r), r.kind == "char")

## canlı çizgi roman nadirlik paleti (sıradan · yaygın · nadir · epik · efsanevi)
static func rank_col(rk: float, is_char := false) -> Color:
	if rk >= 4: return Color("#ffb020")
	if rk >= 3: return Color("#a85cff")
	if rk >= 2.5 or (is_char and rk >= 2): return Color("#3aa0ff")
	if rk >= 2: return Color("#4cbf5e")
	return Color("#8fb4cf")

static func _tag_of(r: Dictionary) -> String:
	match String(r.kind):
		"rubies": return "ALTIN"
		"stone": return "GEM"
		"weapon": return "YENİ SİLAH"
	return str(rarity_of(r).get("name", ""))

# ═════════════ ısınma (menü boştayken UIPrewarm çağırır) ═════════════

## 3B sandığı önceden kur + birkaç kare işle (ilk açılışta model/gölgelendirici takılması olmasın)
func warm(t: String) -> void:
	_ensure_stage(t)

func _ensure_stage(t: String) -> void:
	if stage == null:
		stage = ChestStage.new()
		add_child(stage)
		stage.setup(STAGE, STAGE)
		stage.set_chest(t)
	elif stage.tier != ChestStage.tier_of(t):
		stage.set_chest(t)

# ═════════════ başlat ═════════════

func play(t: String, s: int, cb: Callable) -> void:
	if g.chests.ceremonyActive: return
	g.chests.ceremonyActive = true
	if Prof.on: print("CER play @", Engine.get_process_frames())
	type = t
	slot = s
	done_cb = cb
	C = ChestSystem.chests()[t]
	rewards = g.chests.apply_pity(g.chests.roll_rewards(t))
	# geliştirici: ödülleri zorla — cerforce=c4,g3,w,s,rubies
	for a in OS.get_cmdline_user_args():
		if a.begins_with("cerforce="):
			_forced = true
			rewards = []
			for k in a.substr(9).split(","):
				match k[0]:
					"c": rewards.append({"kind": "char", "id": "seher", "rarity": int(k.substr(1)), "name": "SEHER", "cards": 3, "isNew": k.ends_with("n")})
					"g": rewards.append({"kind": "gear", "icon": "asa", "rarity": int(k.substr(1, 1)), "name": "Kadim Asa", "cards": 2, "isNew": k.ends_with("n")})
					"w": rewards.append({"kind": "weapon", "icon": "kilic", "rarity": 3, "name": "Kılıç", "cards": 1, "isNew": true})
					"s": rewards.append({"kind": "stone", "amount": 12})
					_: rewards.append({"kind": "rubies", "amount": 250})
	peak = 0
	for r in rewards: peak = maxi(peak, drama_of(r))
	_W = UIK.ui_size(get_viewport())
	_build()
	_menu_vis = g.ui.menu.visible
	g.ui.menu.visible = false
	S = {"phase": "drop", "t": 0.0, "k": 0.0, "landed": false, "sq": 0.0, "shake": 0.0, "open": 0.0, "punch": 0.0}
	visible = true
	g.audio.play("throw")

func _clear() -> void:
	for n in get_children():
		if n is Scr._Ticker or n == stage: continue
		n.queue_free()
	cards.clear()
	_sum_cards.clear()
	parts.clear()
	confetti.clear()

func _build() -> void:
	_clear()
	# ısınma kabı en altta: opak zeminin arkasında kalır
	_warm = Node2D.new()
	add_child(_warm)
	var acc := JS.col(C.get("accent", C.color))
	var base := JS.col(C.color)
	# TÜM ekran (güvenli alan bantları + ölçek kenarları dahil; iniş sarsıntısı payı)
	position = Vector2.ZERO
	_SR = UIK.screen_rect(self).grow(12.0)
	_bg = _rg(_W, Vector2(0.5, 0.62), [base.darkened(0.25), base.darkened(0.6), base.darkened(0.82), Color("#07050b")], [0.0, 0.3, 0.7, 1.0])
	add_child(_bg)
	_rays = Node2D.new()
	_rays.draw.connect(_draw_rays)
	add_child(_rays)
	_rays_col = acc.lerp(Color.WHITE, 0.35)
	_rays_a = 0.06
	_rays_target = 0.06
	_rays.position = Vector2(_W.x * 0.5, _W.y * 0.69)
	_ensure_stage(type)
	move_child(stage, get_child_count() - 1)
	stage.position = Vector2(_W.x * 0.5 - STAGE * 0.5, _W.y * 0.73 - STAGE * 0.62)
	stage.set_screen(_W, stage.position)     # tam ekran: animasyon kutu kenarında kesilmez
	stage.modulate = Color.WHITE
	stage.visible = true
	stage.p = {"posY": 150.0}
	_hold = Node2D.new()
	add_child(_hold)
	_fx = Node2D.new()
	_fx.draw.connect(_draw_fx)
	add_child(_fx)
	_flash = ColorRect.new()
	_flash.color = Color.WHITE
	_flash.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_flash.position = _SR.position
	_flash.size = _SR.size
	_flash.visible = false
	add_child(_flash)
	# sandık adı (çizgi roman başlığı)
	_title = _txt(1000, 38, 1.5, YEL, UIK.ink_stroke(3.0, 4.0))
	_title.text = str(C.get("name", "SANDIK"))
	_title.position = Vector2(0, _W.y * 0.13)
	_title.rotation = -0.04
	_title.modulate.a = 0.0
	_hint = _txt(1000, 26, 2.0, Color.WHITE, UIK.ink_stroke(2.5, 3.0))
	_hint.visible = false
	_word = _txt(1000, 56, 2.0, Color.WHITE, UIK.ink_stroke(4.0, 5.0))
	_word.visible = false
	_sum_title = _txt(1000, 42, 1.5, YEL, UIK.ink_stroke(3.5, 4.5))
	_sum_title.text = "KAZANDIKLARIN!"
	_sum_title.visible = false
	# kalan ödül rozeti (sandığın sağ üstü)
	_badge = Node2D.new()
	_badge.draw.connect(_draw_badge)
	_badge.position = Vector2(_W.x * 0.5 + 96, _W.y * 0.73 - 118)
	_badge.visible = false
	add_child(_badge)
	_badge_t = UIText.new()
	_badge_t.style(false, 1000, 26, 0.0, INK, "")
	_badge_t.align = 0.5
	_badge_t.nowrap = true
	_badge_t.wrap_w = 60
	_badge_t.size = Vector2(60, 34)
	_badge_t.position = Vector2(-30, -16)
	_badge.add_child(_badge_t)
	# ödül dokuları arka planda çözülsün (kartlar inişte kurulur)
	var want := []
	for r in rewards:
		var p := _art_path(r)
		if p != "": want.append(p)
	UITex.request(want, true)
	_build_i = 0
	idx = -1
	_cstate = ""
	_sum_t = -1.0
	_word_t = -1.0
	_count_t = -1.0
	_pow_t = -1.0
	_flash_t = -1.0

func _txt(w: int, sz: float, ls: float, col: Color, sh: String) -> UIText:
	var t := UIText.new()
	t.style(false, w, sz, ls, col, sh)
	t.align = 0.5
	t.nowrap = true
	t.wrap_w = _W.x
	t.size = Vector2(_W.x, sz * 1.6)     # sıfır boyutlu Control ekran dışı sayılıp kırpılmasın
	t.pivot_offset = t.size * 0.5
	add_child(t)
	return t

## CSS radial-gradient(circle at …, farthest-corner) tam ekran
func _rg(W: Vector2, at: Vector2, cols: Array, st: Array) -> ColorRect:
	var r := ColorRect.new()
	r.mouse_filter = Control.MOUSE_FILTER_IGNORE
	r.position = _SR.position
	r.size = _SR.size
	var m := UIK.shader_mat("res://shaders/ui/rgrad.gdshader")
	r.material = m
	var c := W * at
	var R := 0.0
	for k in [_SR.position, Vector2(_SR.end.x, _SR.position.y), Vector2(_SR.position.x, _SR.end.y), _SR.end]: R = maxf(R, c.distance_to(k))
	m.set_shader_parameter("size", _SR.size)
	m.set_shader_parameter("center", c - _SR.position)
	m.set_shader_parameter("radius", R)
	m.set_shader_parameter("n", cols.size())
	for i in cols.size(): m.set_shader_parameter("c" + str(i), cols[i])
	m.set_shader_parameter("stops", Vector4(st[0], st[1], st[2], st[3]))
	return r

static func _art_path(r: Dictionary) -> String:
	match String(r.kind):
		"rubies": return "res://assets/fx/currency/coin.png"
		"stone": return "res://assets/fx/currency/gem.png"
		"char":
			var hp := "res://assets/ui/art/herocard/" + str(r.get("id", "")) + ".png"
			if ResourceLoader.exists(hp): return hp
			var pp := "res://assets/ui/art/portrait/" + str(r.get("id", "")) + ".webp"
			return pp if ResourceLoader.exists(pp) else ""
	var gp := "res://assets/ui/art/gear/" + str(r.get("icon", "")) + ".png"
	return gp if ResourceLoader.exists(gp) else ""

# ═════════════ çizgi roman kartı ═════════════

## w×h boyutlu kart (yerel merkez 0,0). mini: özet kartı (sade, sayaçlı)
func _make_card(r: Dictionary, w: float, h: float, mini: bool) -> Dictionary:
	var k := w / CARD.x
	var col := color_of(r)
	var node := Node2D.new()
	var face := Node2D.new()
	node.add_child(face)
	var is_cur: bool = r.kind == "rubies" or r.kind == "stone"
	var ic := Vector2(0, -h * 0.13)
	var bg := Node2D.new()
	bg.draw.connect(func(): _draw_face(bg, w, h, k, col, ic, r))
	face.add_child(bg)
	# görsel
	var path := _art_path(r)
	var tex: Texture2D = UITex.get_tex(path) if path != "" else null
	if tex:
		if r.kind == "char":
			var pw := w * 0.70
			var ph := pw * 1.12
			var img := UIK.round_image(tex, pw, ph, 10.0 * k, Vector2(0.5, 0.18))
			img.position = ic - Vector2(pw, ph) * 0.5
			face.add_child(img)
		else:
			var sp := Sprite2D.new()
			sp.texture = tex
			var s := (w * (0.62 if is_cur else 0.66)) / maxf(tex.get_width(), tex.get_height())
			sp.scale = Vector2.ONE * s
			sp.position = ic
			face.add_child(sp)
	# kahraman portresinin mürekkep çerçevesi (görselin üstünde)
	if r.kind == "char":
		var fr := Node2D.new()
		fr.draw.connect(func():
			var pw := w * 0.70
			var ph := pw * 1.12
			var sb := StyleBoxFlat.new()
			sb.bg_color = Color(0, 0, 0, 0)
			sb.set_corner_radius_all(int(12 * k))
			sb.set_border_width_all(maxi(2, int(5 * k)))
			sb.border_color = INK
			fr.draw_style_box(sb, Rect2(ic - Vector2(pw, ph) * 0.5 - Vector2(2, 2) * k, Vector2(pw, ph) + Vector2(4, 4) * k)))
		face.add_child(fr)
	# tür / nadirlik etiketi: eğik siyah bant, sarı yazı
	var lbl := _tag_of(r)
	if lbl != "":
		var tag := Node2D.new()
		tag.position = Vector2(-w * 0.5 + 7 * k, -h * 0.5 + 7 * k)
		tag.rotation = -0.07
		var fs := maxf(11.0, roundf(19.0 * k))
		var tl := UIText.new()
		tl.style(false, 1000, fs, 1.2, YEL, "")
		tl.nowrap = true
		tl.text = lbl
		tl.position = Vector2(8 * k, 1)
		tl.size = Vector2(w, fs * 1.5)
		var tw := 16.0 * k + tl.text_width()
		tag.draw.connect(func(): tag.draw_rect(Rect2(0, 0, tw, fs * 1.3), INK))
		tag.add_child(tl)
		face.add_child(tag)
	# ad şeridi
	var nm_s := str(r.get("name", ""))
	if r.kind == "rubies": nm_s = "ALTIN"
	elif r.kind == "stone": nm_s = "GEM"
	var nfs := maxf(11.0, roundf(24.0 * k))
	var nm := UIText.new()
	nm.style(false, 1000, nfs, 0.8, Color.WHITE, UIK.ink_stroke(2.0 * k + 0.6, 2.5 * k + 0.5))
	nm.align = 0.5
	nm.nowrap = true
	nm.wrap_w = w - 10 * k
	nm.size = Vector2(w - 10 * k, nfs * 1.5)
	nm.text = nm_s.to_upper()
	nm.position = Vector2(-w * 0.5 + 5 * k, h * 0.5 - (0.36 if not mini else 0.40) * h)
	face.add_child(nm)
	# sayaç: büyük sarı "+250" / "×3" (mürekkep konturlu)
	var cfs := maxf(13.0, roundf(40.0 * k))
	var cnt := UIText.new()
	cnt.style(false, 1000, cfs, 1.0, YEL, UIK.ink_stroke(3.0 * k + 0.6, 3.5 * k + 0.5))
	cnt.align = 0.5
	cnt.nowrap = true
	cnt.wrap_w = w
	cnt.size = Vector2(w, cfs * 1.4)
	cnt.pivot_offset = cnt.size * 0.5
	cnt.position = Vector2(-w * 0.5, h * 0.5 - 0.215 * h)
	cnt.text = _count_str(r, -1)
	face.add_child(cnt)
	# YENİ! etiketi: kırmızı patlama yıldızı, sağ üst
	if r.get("isNew", false):
		var nw := Node2D.new()
		nw.position = Vector2(w * 0.5 - 14 * k, -h * 0.5 + 16 * k)
		nw.rotation = 0.22
		nw.draw.connect(func(): _star(nw, Vector2.ZERO, 34 * k, 25 * k, 14, Color("#e8322c"), 3.0 * k))
		var nt := UIText.new()
		var nfz := maxf(10.0, roundf(19.0 * k))
		nt.style(false, 1000, nfz, 0.8, Color.WHITE, UIK.ink_stroke(1.5 * k + 0.4, 1.5 * k))
		nt.align = 0.5
		nt.nowrap = true
		nt.wrap_w = 80 * k
		nt.size = Vector2(80 * k, nfz * 1.4)
		nt.position = Vector2(-40 * k, -nfz * 0.62)
		nt.text = "YENİ!"
		nw.add_child(nt)
		face.add_child(nw)
	# arka yüz
	var back := Node2D.new()
	back.draw.connect(func(): _draw_back(back, w, h, k, JS.col(C.color)))
	var q := UIText.new()
	var qfs := roundf(58.0 * k)
	q.style(false, 1000, qfs, 0.0, INK, "")
	q.align = 0.5
	q.nowrap = true
	q.wrap_w = 80 * k
	q.size = Vector2(80 * k, qfs * 1.3)
	q.position = Vector2(-40 * k, -qfs * 0.6)
	q.text = "?"
	back.add_child(q)
	back.visible = false
	node.add_child(back)
	return {"node": node, "face": face, "back": back, "cnt": cnt, "r": r, "drama": drama_of(r), "col": col}

static func _count_str(r: Dictionary, v: int) -> String:
	if r.kind == "rubies" or r.kind == "stone":
		return "+" + str(v if v >= 0 else int(r.get("amount", 0)))
	if r.kind == "weapon": return ""
	return "×" + str(v if v >= 0 else int(r.get("cards", 1)))

func _draw_face(n: Node2D, w: float, h: float, k: float, col: Color, ic: Vector2, r: Dictionary) -> void:
	var rr := Rect2(-w * 0.5, -h * 0.5, w, h)
	var rad := int(14 * k)
	var dark := col.darkened(0.5)
	var lite := col.lightened(0.38)
	var sh := StyleBoxFlat.new()
	sh.bg_color = INK
	sh.set_corner_radius_all(rad)
	n.draw_style_box(sh, Rect2(rr.position + Vector2(5, 7) * k, rr.size))
	var b := StyleBoxFlat.new()
	b.bg_color = col
	b.set_corner_radius_all(rad)
	n.draw_style_box(b, rr)
	# aksiyon ışınları (kart içine kırpılı)
	var box := PackedVector2Array([rr.position + Vector2(4, 4) * k, Vector2(rr.end.x - 4 * k, rr.position.y + 4 * k), rr.end - Vector2(4, 4) * k, Vector2(rr.position.x + 4 * k, rr.end.y - 4 * k)])
	var B := TriBatch.new()
	for i in 16:
		var a := i * TAU / 16.0
		var R := w * 1.3
		var tri := PackedVector2Array([ic, ic + Vector2(cos(a - 0.11), sin(a - 0.11)) * R, ic + Vector2(cos(a + 0.11), sin(a + 0.11)) * R])
		for q in Geometry2D.intersect_polygons(tri, box):
			if q.size() >= 3: B.poly(q, Color(lite, 0.5))
	# yarım ton: alt yarıda büyüyen koyu noktalar
	var step := 9.0 * k
	var rows := int(h * 0.5 / step)
	for yy in rows:
		for xx in range(-int(w * 0.5 / step), int(w * 0.5 / step) + 1):
			var p := Vector2(xx * step + (step * 0.5 if yy % 2 else 0.0), h * 0.02 + yy * step)
			if absf(p.x) < w * 0.5 - 7 * k and p.y < h * 0.5 - 7 * k:
				B.circle(p, (0.5 + yy * 0.32) * k, Color(dark, 0.4), 8)
	B.flush(n)
	# ad bandı (siyah, hafif eğik)
	var by := h * 0.5 - 0.36 * h
	n.draw_colored_polygon(PackedVector2Array([Vector2(-w * 0.5 + 3 * k, by - 2 * k), Vector2(w * 0.5 - 3 * k, by - 6 * k), Vector2(w * 0.5 - 3 * k, by + 30 * k), Vector2(-w * 0.5 + 3 * k, by + 33 * k)]), Color(INK, 0.82))
	# para kartı: ikon ardında parlak hale
	if r.kind == "rubies" or r.kind == "stone":
		n.draw_circle(ic, w * 0.36, Color(1, 1, 1, 0.16))
		n.draw_circle(ic, w * 0.28, Color(1, 1, 1, 0.14))
	elif r.kind != "char":
		# eşya: beyaz madalyon, kalın mürekkep
		var mr := w * 0.36
		n.draw_circle(ic + Vector2(4, 5) * k, mr, INK)
		n.draw_circle(ic, mr, INK)
		n.draw_circle(ic, mr - 5 * k, Color("#fffaf0"))
		n.draw_arc(ic, mr - 5 * k, PI * 0.1, PI * 0.9, 20, Color(col, 0.45), 8.0 * k, true)
		n.draw_circle(ic + Vector2(-mr * 0.4, -mr * 0.45), mr * 0.18, Color(1, 1, 1, 0.9))
	# dış mürekkep kontur
	var o := StyleBoxFlat.new()
	o.bg_color = Color(0, 0, 0, 0)
	o.set_corner_radius_all(rad)
	o.set_border_width_all(maxi(2, int(6 * k)))
	o.border_color = INK
	n.draw_style_box(o, rr)
	# üst parıltı çizgisi
	n.draw_line(Vector2(-w * 0.5 + 16 * k, -h * 0.5 + 10 * k), Vector2(w * 0.1, -h * 0.5 + 10 * k), Color(1, 1, 1, 0.5), 3.0 * k)

func _draw_back(n: Node2D, w: float, h: float, k: float, col: Color) -> void:
	var rr := Rect2(-w * 0.5, -h * 0.5, w, h)
	var sh := StyleBoxFlat.new()
	sh.bg_color = INK
	sh.set_corner_radius_all(int(14 * k))
	n.draw_style_box(sh, Rect2(rr.position + Vector2(5, 7) * k, rr.size))
	var b := StyleBoxFlat.new()
	b.bg_color = col.darkened(0.2)
	b.set_corner_radius_all(int(14 * k))
	n.draw_style_box(b, rr)
	var box := PackedVector2Array([rr.position + Vector2(4, 4) * k, Vector2(rr.end.x - 4 * k, rr.position.y + 4 * k), rr.end - Vector2(4, 4) * k, Vector2(rr.position.x + 4 * k, rr.end.y - 4 * k)])
	var B := TriBatch.new()
	for i in 14:
		var a := i * TAU / 14.0
		var tri := PackedVector2Array([Vector2.ZERO, Vector2(cos(a - 0.12), sin(a - 0.12)) * w * 1.3, Vector2(cos(a + 0.12), sin(a + 0.12)) * w * 1.3])
		for q in Geometry2D.intersect_polygons(tri, box):
			if q.size() >= 3: B.poly(q, Color(col.lightened(0.35), 0.5))
	B.flush(n)
	var o := StyleBoxFlat.new()
	o.bg_color = Color(0, 0, 0, 0)
	o.set_corner_radius_all(int(14 * k))
	o.set_border_width_all(maxi(2, int(6 * k)))
	o.border_color = INK
	n.draw_style_box(o, rr)
	n.draw_circle(Vector2(3, 4) * k, 46 * k, INK)
	n.draw_circle(Vector2.ZERO, 46 * k, INK)
	n.draw_circle(Vector2.ZERO, 40 * k, YEL)
	n.draw_circle(Vector2(-14, -16) * k, 8 * k, Color(1, 1, 1, 0.7))

## eski "patlama yıldızı" imzası korunur, görünüm yenilendi (çıkartma/şok fiyat görüntüsü yerine):
##   5 köşe → gerçek yıldız (değerlendirme yıldızları)
##   yassı (sy < 0,6) → eğik başlık plakası: mürekkep gölge, koyu gövde, kızıl alt şerit + sol sekme
##   diğerleri → altıgen madalyon: mürekkep gölge ve kontur, iki tonlu dolgu, iç halka
static func _star(n: Node2D, c: Vector2, r0: float, r1: float, pts: int, col: Color, ink: float, rot := 0.0, sy := 1.0) -> void:
	if pts == 5:
		var P := PackedVector2Array()
		var I := PackedVector2Array()
		for i in pts * 2:
			var a := rot - PI * 0.5 + i * PI / pts
			var rr := r0 if i % 2 == 0 else r1
			P.append(c + Vector2(cos(a) * rr, sin(a) * rr * sy))
			I.append(c + Vector2(cos(a) * (rr + ink * 1.6), sin(a) * (rr + ink * 1.6) * sy) + Vector2(ink, ink * 1.3))
		n.draw_colored_polygon(I, INK)
		n.draw_colored_polygon(P, col)
		return
	if sy < 0.6:
		_plate(n, c, r0 * 1.9, maxf(36.0, r0 * sy * 1.55), col, ink)
		return
	_medal(n, c, (r0 + r1) * 0.5 + ink * 0.4, col, ink, rot)

## eğik başlık plakası (merkez c, genişlik w, yükseklik h)
static func _plate(n: Node2D, c: Vector2, w: float, h: float, col: Color, ink: float) -> void:
	var k := h * 0.28
	var hw := w * 0.5
	var hh := h * 0.5
	var body := PackedVector2Array([c + Vector2(-hw + k, -hh), c + Vector2(hw + k * 0.4, -hh), c + Vector2(hw - k, hh), c + Vector2(-hw - k * 0.4, hh)])
	var sh := PackedVector2Array()
	for q in body: sh.append(q + Vector2(ink * 1.4, ink * 1.8))
	n.draw_colored_polygon(sh, INK)
	var rim := PackedVector2Array()
	for q in body: rim.append(c + (q - c) * Vector2(1.0 + ink * 2.0 / w, 1.0 + ink * 2.0 / h))
	n.draw_colored_polygon(rim, INK)
	n.draw_colored_polygon(body, Color("#1a070c"))
	# kızıl alt şerit
	var t := 0.78
	var a0 := body[3].lerp(body[0], 1.0 - t)
	var a1 := body[2].lerp(body[1], 1.0 - t)
	n.draw_colored_polygon(PackedVector2Array([a0, a1, body[2], body[3]]), col)
	n.draw_line(a0, a1, INK, maxf(2.0, ink * 0.7))
	# sol sekme
	var tab := PackedVector2Array([body[0] + Vector2(-ink * 2.2 - 10, 0), body[0] + Vector2(-ink * 2.2, 0), body[3] + Vector2(-ink * 2.2, 0), body[3] + Vector2(-ink * 2.2 - 10, 0)])
	n.draw_colored_polygon(tab, col)
	# üst parıltı çizgisi
	n.draw_line(body[0].lerp(body[1], 0.04) + Vector2(0, 4), body[0].lerp(body[1], 0.6) + Vector2(0, 4), Color(1, 1, 1, 0.12), 2.0)

## altıgen madalyon (merkez c, yarıçap r)
static func _medal(n: Node2D, c: Vector2, r: float, col: Color, ink: float, rot := 0.0) -> void:
	var H := func(rr: float, off: Vector2) -> PackedVector2Array:
		var P := PackedVector2Array()
		for i in 6:
			var a := rot - PI * 0.5 + i * TAU / 6.0
			P.append(c + off + Vector2(cos(a), sin(a)) * rr)
		return P
	n.draw_colored_polygon(H.call(r + ink, Vector2(ink, ink * 1.3)), INK)
	n.draw_colored_polygon(H.call(r + ink, Vector2.ZERO), INK)
	var F: PackedVector2Array = H.call(r, Vector2.ZERO)
	n.draw_colored_polygon(F, col.darkened(0.18))
	# üst yarı açık ton (iki tonlu çizgi roman gölgesi)
	var up := PackedVector2Array([F[5], F[0], F[1], (F[1] + F[2]) * 0.5, (F[4] + F[5]) * 0.5])
	n.draw_colored_polygon(up, col)
	var inner: PackedVector2Array = H.call(r * 0.74, Vector2.ZERO)
	inner.append(inner[0])
	n.draw_polyline(inner, col.darkened(0.35), maxf(1.5, r * 0.06), true)
	n.draw_line(F[5].lerp(F[0], 0.3) + Vector2(0, r * 0.12), F[0].lerp(F[1], 0.7) + Vector2(0, r * 0.12), Color(1, 1, 1, 0.45), maxf(1.5, r * 0.07))

# ═════════════ çizim ═════════════

func _draw_rays() -> void:
	if _rays_a <= 0.004: return
	var R := _W.y * 1.1
	var B := TriBatch.new()
	for i in 18:
		var a := i * TAU / 18.0
		B._tri(Vector2.ZERO, Vector2(cos(a - 0.08), sin(a - 0.08)) * R, Vector2(cos(a + 0.08), sin(a + 0.08)) * R, Color(_rays_col, _rays_a))
	B.flush(_rays)

func _draw_badge() -> void:
	_star(_badge, Vector2.ZERO, 30, 23, 12, YEL, 3.0, _t * 0.6)

func _draw_fx() -> void:
	# POW yıldızı (açılış patlaması)
	if _pow_t >= 0.0:
		var k := clampf(_pow_t / 0.55, 0, 1)
		var s := ScrLevelUp._back_ease(minf(1.0, k / 0.35)) * (1.0 + k * 0.15)
		var a := 1.0 - maxf(0.0, (k - 0.55) / 0.45)
		var c := _chest_mouth()
		_fx.modulate.a = 1.0
		var P := PackedVector2Array()
		var I := PackedVector2Array()
		for i in 28:
			var an := -PI * 0.5 + i * PI / 14.0
			var rr := (150.0 if i % 2 == 0 else 96.0) * s
			P.append(c + Vector2(cos(an) * rr, sin(an) * rr * 0.75))
			I.append(c + Vector2(cos(an) * (rr + 7), sin(an) * (rr + 7) * 0.75) + Vector2(5, 6))
		_fx.draw_colored_polygon(I, Color(INK, a))
		_fx.draw_colored_polygon(P, Color(YEL, a))
		var P2 := PackedVector2Array()
		for i in 28:
			var an := -PI * 0.5 + i * PI / 14.0 + 0.1
			var rr := (100.0 if i % 2 == 0 else 66.0) * s
			P2.append(c + Vector2(cos(an) * rr, sin(an) * rr * 0.75))
		_fx.draw_colored_polygon(P2, Color(Color.WHITE, a * 0.9))
		# genişleyen mürekkep halka
		_fx.draw_arc(c, 60 + 220 * k, 0, TAU, 48, Color(INK, (1.0 - k) * 0.8), 6.0 * (1.0 - k) + 1.0, true)
	# söz ardında patlama yıldızı
	if _word_t >= 0.0 and _word.visible:
		var kw := clampf(_word_t / 0.3, 0, 1)
		var sw := ScrLevelUp._back_ease(kw) if kw < 1.0 else 1.0 + sin(_t * 3.0) * 0.02
		var wc := _word.position + _word.size * 0.5
		var cc: Color = cards[idx].col if idx >= 0 and idx < cards.size() else YEL
		var P3 := PackedVector2Array()
		var I3 := PackedVector2Array()
		for i in 24:
			var an := -PI * 0.5 + i * PI / 12.0 + 0.05
			var rr := (170.0 if i % 2 == 0 else 128.0) * sw
			P3.append(wc + Vector2(cos(an) * rr, sin(an) * rr * 0.36))
			I3.append(wc + Vector2(cos(an) * rr * 1.05, sin(an) * rr * 0.36 * 1.05) + Vector2(5, 6))
		_fx.draw_colored_polygon(I3, Color(INK, _word.modulate.a))
		_fx.draw_colored_polygon(P3, Color(cc.darkened(0.15), _word.modulate.a))
	# kıvılcımlar + konfeti: tek üçgen ağı (yüzlerce parça → tek çizim çağrısı)
	var B := TriBatch.new()
	for p in parts:
		var kk: float = 1.0 - float(p.life) / float(p.max)
		var c2: Color = p.col
		c2.a = minf(1.0, float(p.life) / 0.25)
		var pp: Vector2 = p.p
		var r: float = float(p.size) * (1.0 - kk * 0.5)
		if p.star:
			B.poly(PackedVector2Array([pp + Vector2(0, -r * 2.2), pp + Vector2(r * 0.45, 0), pp + Vector2(0, r * 2.2), pp + Vector2(-r * 0.45, 0)]), c2)
			B.poly(PackedVector2Array([pp + Vector2(-r * 2.2, 0), pp + Vector2(0, r * 0.45), pp + Vector2(r * 2.2, 0), pp + Vector2(0, -r * 0.45)]), c2)
		else:
			B.rect(Rect2(pp - Vector2.ONE * r * 0.5, Vector2.ONE * r), c2)
	for q in confetti:
		var u: float = (q.t - q.delay) / q.dur
		if u < 0 or u > 1: continue
		var c3: Color = q.col
		c3.a = clampf((1.0 - u) * 3.0, 0, 1)
		var pos := Vector2(q.x + q.drift * u + sin(u * 9.0 + q.ph) * 14.0, -20.0 + (_W.y * 0.9) * u)
		var xf := Transform2D(q.rot * u + q.ph, Vector2(1.0, absf(cos(u * 14.0 + q.ph))), 0.0, pos)
		B.rect(Rect2(-4, -6, 8, 12), c3, xf)
		B.frame(Rect2(-4.75, -6.75, 9.5, 13.5), Color(INK, c3.a), 1.5, xf)
	B.flush(_fx)

func _chest_mouth() -> Vector2:
	return stage.position + Vector2(STAGE * 0.5, STAGE * 0.52)

func _card_home() -> Vector2:
	return Vector2(_W.x * 0.5, _W.y * 0.345)

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

func _spark(at: Vector2, n: int, spd: float, cols: Array, up := false, star_k := 0.5) -> void:
	for i in n:
		var a := (-PI * 0.5 + randf_range(-0.9, 0.9)) if up else randf() * TAU
		var v := spd * randf_range(0.35, 1.0)
		var life := randf_range(0.45, 0.95)
		parts.append({"p": at + Vector2(randf_range(-20, 20), randf_range(-8, 8)), "v": Vector2(cos(a), sin(a)) * v, "life": life, "max": life,
			"size": randf_range(2.5, 5.5), "col": cols[randi() % cols.size()], "star": randf() < star_k})

func _process(dt: float) -> void:
	if not visible: return
	dt = minf(dt, 0.05)
	_t += dt
	S.t += dt
	# kartları inişte kur (her karede bir tane; zeminin arkasında çizilip ısınır)
	if _build_i < rewards.size():
		var cd := _make_card(rewards[_build_i], CARD.x, CARD.y, false)
		cd.node.position = _W * 0.5
		cd.back.visible = true          # arka yüz de bir kez çizilsin
		_warm.add_child(cd.node)
		cards.append(cd)
		_build_i += 1
	elif _sum_cards.size() < rewards.size() and S.phase != "summary":
		_build_mini()
	var posY := 0.0
	var sqx := 1.0
	var sqy := 1.0
	var sc := 1.0
	var shx := 0.0
	var rot := 0.0
	match String(S.phase):
		"drop":
			S.k = minf(1.0, S.k + dt * 1.25)
			posY = 150.0 * (1.0 - _bounce_out(S.k))
			_title.modulate.a = minf(1.0, S.k * 2.0)
			_title.scale = Vector2.ONE * ScrLevelUp._back_ease(minf(1.0, S.k * 1.6))
			if not S.landed and S.k >= 0.3636:
				S.landed = true
				S.sq = 0.26
				_land_t = 0.0
				_spark(_chest_mouth() + Vector2(0, 70), 22, 260, [Color.WHITE, JS.col(C.get("accent", C.color)), YEL], false, 0.3)
				g.audio.play("chestthud")
				pass  # titreşim kapalı
			if S.k >= 1.0:
				S.phase = "idle"
				S.t = 0.0
				_hint.text = "AÇMAK İÇİN DOKUN!"
				_hint.position = Vector2(0, _W.y * 0.86)
				_hint.visible = true
		"idle":
			sc = 1.0 + sin(S.t * 3.2) * 0.018
			# ara sıra küçük "kıpırdama" (içinde bir şey var)
			var wig := fmod(S.t, 2.2)
			if wig < 0.3: rot = sin(wig / 0.3 * TAU * 2.0) * 0.05 * (1.0 - wig / 0.3)
			_hint.scale = Vector2.ONE * (1.0 + sin(_t * 5.0) * 0.06)
			_hint.modulate.a = minf(1.0, S.t * 3.0)
		"shake":
			S.shake += dt
			var pr: float = minf(1.0, S.shake / 0.62)
			var amp := 3.0 + pr * 9.0
			shx = sin(S.t * 52.0) * amp * 0.34
			rot = sin(S.t * 47.0 + 0.6) * 0.035 * (0.4 + pr)
			sc = 1.0 + pr * 0.08
			sqy = 1.0 - pr * 0.06
			sqx = 1.0 + pr * 0.04
			_rays_target = 0.06 + pr * 0.08
			if randf() < dt * (10.0 + pr * 20.0): _spark(_chest_mouth(), 2, 140, [YEL, Color.WHITE], true, 0.8)
			if S.shake >= 0.62: _burst()
		"open":
			S.open = minf(1.0, S.open + dt * 2.2)
			S.punch = maxf(0.0, S.punch - dt * 3.0)
			sc = 1.0 + S.punch * 0.12
			if _cstate == "" and S.t > 0.38: _next()
		"summary":
			S.open = 1.0
	if S.sq > 0.0:
		S.sq = maxf(0.0, S.sq - dt)
		var kq: float = S.sq / 0.26
		sqx *= 1.0 + kq * 0.18
		sqy *= 1.0 - kq * 0.18
	stage.p = {"posY": posY, "scaleX": sc * sqx, "scaleY": sc * sqy, "scaleZ": sc, "shakeX": shx, "rotZ": rot, "open": S.open, "seam": minf(1.0, float(S.shake) / 0.62) if S.phase == "shake" else 0.0}
	_step_fx(dt)
	_step_card(dt)
	_step_summary(dt)

func _step_fx(dt: float) -> void:
	_rays_a = move_toward(_rays_a, _rays_target, dt * 0.5)
	_rays.rotation += dt * 0.12
	_rays.queue_redraw()
	if _pow_t >= 0.0:
		_pow_t += dt
		if _pow_t > 0.55: _pow_t = -1.0
	if _flash_t >= 0.0:
		_flash_t += dt
		var k := clampf(_flash_t / _flash_dur, 0, 1)
		_flash.visible = true
		_flash.color = Color(_flash_c, (1.0 - k) * (1.0 - k) * 0.7)
		if k >= 1.0:
			_flash_t = -1.0
			_flash.visible = false
	if _land_t >= 0.0:
		_land_t += dt
		var k := clampf(_land_t / 0.26, 0, 1)
		position = Vector2(sin(k * 30.0) * 4.0, cos(k * 26.0) * 3.0) * (1.0 - k)
		if k >= 1.0:
			_land_t = -1.0
			position = Vector2.ZERO
	if _badge.visible:
		_badge.queue_redraw()
		if _badge_pop >= 0.0:
			_badge_pop += dt
			var kb := clampf(_badge_pop / 0.35, 0, 1)
			_badge.scale = Vector2.ONE * (1.0 + 0.4 * sin(kb * PI) * (1.0 - kb))
			if kb >= 1.0: _badge_pop = -1.0
	# söz (EPİK! / EFSANEVİ!)
	if _word_t >= 0.0:
		_word_t += dt
		var kw := clampf(_word_t / 0.3, 0, 1)
		_word.visible = true
		_word.scale = Vector2.ONE * (ScrLevelUp._back_ease(kw) if kw < 1.0 else 1.0 + sin(_t * 4.0) * 0.025)
		_word.rotation = -0.06 + sin(_t * 2.0) * 0.01
		_word.modulate.a = minf(1.0, _word_t / 0.12)
	for i in range(parts.size() - 1, -1, -1):
		var p: Dictionary = parts[i]
		p.life = float(p.life) - dt
		if p.life <= 0.0:
			parts.remove_at(i)
			continue
		var v: Vector2 = p.v
		v.y += 520.0 * dt
		v *= exp(-1.2 * dt)
		p.v = v
		p.p = (p.p as Vector2) + v * dt
	for i in range(confetti.size() - 1, -1, -1):
		var q: Dictionary = confetti[i]
		q.t = float(q.t) + dt
		if q.t > q.delay + q.dur: confetti.remove_at(i)
	_fx.queue_redraw()

# ═════════════ açılış ═════════════

func _input(ev: InputEvent) -> void:
	if not visible: return
	if ev is InputEventScreenTouch and (ev as InputEventScreenTouch).pressed:
		get_viewport().set_input_as_handled()
		_tap()
		return
	if ev is InputEventScreenTouch or ev is InputEventScreenDrag:
		get_viewport().set_input_as_handled()

func _tap() -> void:
	if Prof.on: print("CER tap ", S.phase, " ", _cstate, " @", Engine.get_process_frames())
	match String(S.phase):
		"drop":
			# sabırsız dokunuş: inişi bitir
			if S.k > 0.4: S.k = 1.0
		"idle":
			S.phase = "shake"
			S.shake = 0.0
			_hint.visible = false
			g.audio.play("chestlatch")
			pass  # titreşim kapalı
		"open":
			if _cstate == "fly":
				# efsanevi ilk anı atlanmaz; diğerlerinde kart hemen yerine
				if int(cards[idx].drama) < 3 or _ct > 1.0: _ct = maxf(_ct, _fly_d + _spin_d)
			elif _cstate == "rest" and _ct > 0.15:
				_out()
		"summary":
			if _sum_t > 0.5: _finish()

func _burst() -> void:
	if Prof.on: print("CER burst @", Engine.get_process_frames())
	S.phase = "open"
	S.t = 0.0
	S.open = 0.0
	S.punch = 1.0
	_title.visible = false
	_pow_t = 0.0
	_flash_t = 0.0
	_flash_dur = 0.35
	_flash_c = Color.WHITE
	_rays_target = 0.14
	var acc := JS.col(C.get("accent", C.color))
	_spark(_chest_mouth(), 46 + peak * 14, 520, [YEL, Color.WHITE, acc, Color("#ff8a3a")], true, 0.6)
	_spark(_chest_mouth(), 20, 300, [YEL, Color.WHITE], false, 0.5)
	g.audio.play("chestburst")
	pass  # titreşim kapalı

# ═════════════ ödüller ═════════════

func _next() -> void:
	idx += 1
	if idx >= rewards.size():
		_summary()
		return
	# kart henüz kurulmadıysa (çok hızlı dokunuş) şimdi kur
	while cards.size() <= idx:
		var cd := _make_card(rewards[cards.size()], CARD.x, CARD.y, false)
		_warm.add_child(cd.node)
		cards.append(cd)
		_build_i = cards.size()
	var c: Dictionary = cards[idx]
	var n: Node2D = c.node
	n.reparent(_hold, false)
	n.position = _chest_mouth()
	n.scale = Vector2.ONE * 0.12
	n.rotation = 0.0
	n.modulate.a = 1.0
	c.face.visible = false
	c.back.visible = true
	var dr := int(c.drama)
	_fly_d = 0.42
	_spin_d = [0.35, 0.6, 1.0, 1.5][dr]
	_turns = [1.0, 2.0, 3.0, 5.0][dr]
	_ct = 0.0
	_cstate = "fly"
	_landed = false
	_word_t = -1.0
	_word.visible = false
	var r: Dictionary = c.r
	_count_to = int(r.get("amount", 0)) if (r.kind == "rubies" or r.kind == "stone") else int(r.get("cards", 1))
	_count_t = -1.0
	(c.cnt as UIText).text = ""
	_left = rewards.size() - idx - 1
	_badge.visible = _left > 0
	_badge_t.text = str(_left)
	_badge_pop = 0.0
	_rays_col = (c.col as Color).lerp(Color.WHITE, 0.3)
	_rays_target = 0.08 + dr * 0.04
	_spark(_chest_mouth(), 14 + dr * 6, 300, [c.col, Color.WHITE, YEL], true, 0.7)
	g.audio.play("throw")
	S.punch = 0.6

func _step_card(dt: float) -> void:
	if idx < 0 or idx >= cards.size() or _cstate == "": return
	var c: Dictionary = cards[idx]
	var n: Node2D = c.node
	_ct += dt
	var home := _card_home()
	match _cstate:
		"fly":
			# yay: sandıktan yukarı fırla, hafif sağa kavis, hedefe otur
			var kf := clampf(_ct / _fly_d, 0, 1)
			var e := 1.0 - pow(1.0 - kf, 3.0)
			var a := _chest_mouth()
			var ctrl := Vector2((a.x + home.x) * 0.5 + 40.0, home.y - 90.0)
			var q := 1.0 - e
			n.position = a * q * q + ctrl * 2.0 * q * e + home * e * e
			# dönüş: uçuşla başlar, nadirlikle uzar (ease-out)
			var ks := clampf(_ct / (_fly_d + _spin_d), 0, 1)
			var es := 1.0 - pow(1.0 - ks, 2.6)
			var ang := (1.0 - es) * _turns * TAU
			var cs := cos(ang)
			var base_s := lerpf(0.12, 1.0, ScrLevelUp._back_ease(kf) if kf < 1.0 else 1.0)
			# efsanevi: arka yüzde titreyerek bekler, sonra döner
			n.scale = Vector2(base_s * maxf(0.03, absf(cs)), base_s * (1.0 + 0.06 * absf(sin(ang))))
			n.rotation = sin(ang) * 0.05
			c.face.visible = cs >= 0.0 and ks > 0.5
			c.back.visible = not c.face.visible
			if int(c.drama) >= 2 and not c.face.visible and randf() < dt * 30.0:
				_spark(n.position, 1, 160, [c.col, Color.WHITE], false, 1.0)
			if ks >= 1.0: _land()
		"rest":
			var kp := clampf(_ct / 0.3, 0, 1)
			var pop := 1.0 + 0.12 * sin(kp * PI) * (1.0 - kp * 0.3)
			n.scale = Vector2.ONE * pop
			n.position = home + Vector2(0, sin(_t * 2.2) * 4.0)
			n.rotation = sin(_t * 1.3) * 0.015
			if _count_t >= 0.0:
				_count_t += dt
				var kc := clampf(_count_t / (0.6 if _count_to > 20 else 0.35), 0, 1)
				var v := int(round(_count_to * (1.0 - pow(1.0 - kc, 3.0))))
				var cn: UIText = c.cnt
				cn.text = _count_str(c.r, v)
				if kc >= 1.0:
					_count_t = -1.0
					cn.scale = Vector2.ONE * 1.35
					g.audio.play("coin" if (c.r.kind == "rubies" or c.r.kind == "stone") else "tally")
			var cn2: UIText = c.cnt
			if cn2.scale.x > 1.0: cn2.scale = Vector2.ONE * move_toward(cn2.scale.x, 1.0, dt * 2.5)
			if _ct > 0.9 and not _hint.visible:
				_hint.text = "DOKUN!"
				_hint.position = Vector2(0, _W.y * 0.89)
				_hint.visible = true
				_hint.modulate.a = 0.0
			if _hint.visible:
				_hint.modulate.a = minf(1.0, _hint.modulate.a + dt * 4.0)
				_hint.scale = Vector2.ONE * (0.8 + sin(_t * 5.0) * 0.05)
		"out":
			# kart küçülerek sola yukarı süzülür (özet için kenara konur)
			var ko := clampf(_ct / 0.22, 0, 1)
			var e2 := ko * ko
			n.position = _out_from.lerp(Vector2(_W.x * 0.5 - 150, _W.y * 0.12), e2)
			n.scale = Vector2.ONE * lerpf(1.0, 0.25, e2)
			n.rotation = lerpf(0.0, -0.4, e2)
			n.modulate.a = 1.0 - e2
			if ko >= 1.0:
				n.visible = false
				_cstate = ""
				_next()

func _land() -> void:
	if Prof.on: print("CER land @", Engine.get_process_frames())
	var c: Dictionary = cards[idx]
	var n: Node2D = c.node
	_cstate = "rest"
	_ct = 0.0
	n.scale = Vector2.ONE
	n.rotation = 0.0
	c.face.visible = true
	c.back.visible = false
	var dr := int(c.drama)
	var col: Color = c.col
	_spark(_card_home(), 18 + dr * 14, 380 + dr * 60, [col.lerp(Color.WHITE, 0.3), Color.WHITE, YEL], false, 0.8)
	if dr >= 1:
		_flash_t = 0.0
		_flash_dur = [0.3, 0.3, 0.5, 0.8][dr]
		_flash_c = col.lerp(Color.WHITE, 0.5)
	if dr >= 2:
		_word.text = ("EFSANEVİ!" if dr >= 3 else _tag_of(c.r) + "!")
		_word.color = col.lightened(0.35)
		_word.position = Vector2(0, _card_home().y - CARD.y * 0.5 - 88.0)
		_word_t = 0.0
		if dr >= 3: _confetti(56)
	if r_is_cur(c.r) or int(c.r.get("cards", 0)) > 0: _count_t = 0.0
	match dr:
		3: g.audio.play("legendary")
		2: g.audio.play("epicpull")
		1: g.audio.play("chestrare")
		_: g.audio.play("reveal")
	pass  # titreşim kapalı

static func r_is_cur(r: Dictionary) -> bool:
	return r.kind == "rubies" or r.kind == "stone"

func _out() -> void:
	_cstate = "out"
	_ct = 0.0
	_out_from = (cards[idx].node as Node2D).position
	_hint.visible = false
	_word_t = -1.0
	_word.visible = false
	g.audio.play("select")

func _confetti(n: int) -> void:
	var pal := [YEL, Color("#ff5a2c"), Color("#3aa0ff"), Color("#a85cff"), Color("#5fd35a"), Color.WHITE]
	for i in n:
		confetti.append({"x": _SR.position.x + randf() * _SR.size.x, "delay": randf() * 0.5, "dur": randf_range(1.8, 3.0), "rot": randf_range(-8, 8),
			"drift": randf_range(-40, 40), "ph": randf() * TAU, "col": pal[randi() % pal.size()], "t": 0.0})

# ═════════════ özet ═════════════

## özet ızgarası: [sütun, kart genişliği, yükseklik, aralık, üst]
func _sum_layout() -> Array:
	var n := rewards.size()
	var cols := 3 if n > 4 else maxi(1, n)
	if n == 4: cols = 2
	var rows := int(ceil(float(n) / cols))
	var gap := 14.0
	var cw := minf(108.0, (_W.x - 40.0 - (cols - 1) * gap) / cols)
	var ch := cw * CARD.y / CARD.x
	var avail := _W.y * 0.56
	if rows * ch + (rows - 1) * gap > avail:
		ch = (avail - (rows - 1) * gap) / rows
		cw = ch * CARD.x / CARD.y
	return [cols, cw, ch, gap, _W.y * 0.20]

## özet kartını kur (ısınma kabında; iniş/gösterim sırasında her karede bir tane)
func _build_mini() -> void:
	var L := _sum_layout()
	var cd := _make_card(rewards[_sum_cards.size()], L[1], L[2], true)
	cd.node.position = _W * 0.5
	_warm.add_child(cd.node)
	_sum_cards.append(cd)

func _summary() -> void:
	if Prof.on: print("CER summary @", Engine.get_process_frames())
	S.phase = "summary"
	_cstate = ""
	_badge.visible = false
	_hint.visible = false
	_rays_col = YEL
	_rays_target = 0.08
	_sum_t = 0.0
	var n := rewards.size()
	while _sum_cards.size() < n: _build_mini()
	var L := _sum_layout()
	var cols: int = L[0]
	var cw: float = L[1]
	var ch: float = L[2]
	var gap: float = L[3]
	var top: float = L[4]
	for i in n:
		var row := i / cols
		var in_row := mini(cols, n - row * cols)
		var rw := in_row * cw + (in_row - 1) * gap
		var cd: Dictionary = _sum_cards[i]
		cd.node.reparent(_hold, false)
		cd.node.position = Vector2(_W.x * 0.5 - rw * 0.5 + (i % cols) * (cw + gap) + cw * 0.5, top + row * (ch + gap) + ch * 0.5)
		cd.node.scale = Vector2.ZERO
		cd["t0"] = 0.15 + i * 0.09
		cd["popped"] = false
	_sum_title.position = Vector2(0, top - 78.0)
	_sum_title.visible = true
	_sum_title.scale = Vector2.ZERO
	g.audio.play("levelup")

func _step_summary(dt: float) -> void:
	if _sum_t < 0.0: return
	_sum_t += dt
	var kt := clampf(_sum_t / 0.35, 0, 1)
	_sum_title.scale = Vector2.ONE * (ScrLevelUp._back_ease(kt) if kt < 1.0 else 1.0 + sin(_t * 3.0) * 0.02)
	_sum_title.rotation = -0.04
	# sandık aşağı kayıp söner
	var ks := clampf(_sum_t / 0.4, 0, 1)
	stage.modulate.a = 1.0 - ks * 0.75
	for cd in _sum_cards:
		var lt: float = _sum_t - float(cd.t0)
		var n: Node2D = cd.node
		if lt < 0.0: continue
		var k := clampf(lt / 0.3, 0, 1)
		n.scale = Vector2.ONE * (ScrLevelUp._back_ease(k) if k < 1.0 else 1.0)
		n.rotation = (1.0 - k) * 0.3
		if not cd.popped:
			cd.popped = true
			_spark(n.position, 8, 200, [cd.col, Color.WHITE, YEL], false, 0.8)
			g.audio.play("star")
	var last: float = float(_sum_cards[-1].t0) if not _sum_cards.is_empty() else 0.0
	if _sum_t > last + 0.5 and not _hint.visible:
		_hint.text = "DEVAM İÇİN DOKUN"
		_hint.position = Vector2(0, _W.y * 0.88)
		_hint.visible = true
		_hint.modulate.a = 0.0
	if _hint.visible:
		_hint.modulate.a = minf(1.0, _hint.modulate.a + dt * 3.0)
		_hint.scale = Vector2.ONE * (0.85 + sin(_t * 4.0) * 0.04)

func _finish() -> void:
	if UITex.rec == "_cer": UITex.rec = ""
	visible = false
	position = Vector2.ZERO
	if _menu_vis: g.ui.menu.visible = true
	if not _forced: g.chests.apply_rewards(rewards)
	if slot >= 0:
		g.chests.slots[slot] = null
		g.chests.save()
	g.chests.ceremonyActive = false
	g.audio.play("collect")
	_clear()
	if stage: stage.visible = false
	if done_cb.is_valid(): done_cb.call()
