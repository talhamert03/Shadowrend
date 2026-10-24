class_name Lyr
extends Node2D
## Katman sahnesi — tools/bake/ui/layers.mjs ile yakalanmış bir DOM bileşenini
## (res://assets/ui/lyr/<ad>.json + img/*.png) Node2D ağacı olarak yeniden kurar ve
## CSS animasyonlarını (transform fonksiyon listesi + opaklık, kare başı
## zamanlama eğrisi, gecikme/tekrar/yön/dolgu) gerçek zamanda oynatır.
## Düğüm sırası CSS boyama sırasına yakındır: kendi görüntüsü, ::before,
## çocuklar (z-index'e göre), ::after. overflow:hidden → clip_children maskesi.
## Metinler UIText ile çizilir (içerik çalışma anında değiştirilebilir).

const BASE := "res://assets/ui/lyr/"
static var _cache := {}

class N:
	var d: Dictionary            # yakalanan düğüm verisi
	var node: Node2D             # dönüşüm düğümü (kutunun sol üstü)
	var host: Node2D             # çocukların asıldığı yer (kırpma maskesi olabilir)
	var img: CanvasItem
	var txt: UIText
	var txt_shadow: UIText
	var kids: Array = []
	var anims: Array = []
	var base_tf: Array = []
	var base_op := 1.0
	var origin := Vector2.ZERO
	var pos := Vector2.ZERO
	var size := Vector2.ZERO
	var dyn := false             # animasyonlu → her kare
	var hidden := false
	var op_mul := 1.0            # betikten ek opaklık
	var extra := Transform2D.IDENTITY   # betikten ek dönüşüm (origin etrafında)
	var t0 := 0.0                # animasyon başlangıcı (sahne saatine göre, sn)
	var trs := {}                # CSS geçişleri: "tf"/"op" → [başla, bitir, t0, süre sn, gecikme sn, eğri]
	var clip_rect: Array = []
	var clip_rad: Array = []
	var mats := {}               # kırpan düğüm: {false: normal, true: toplamsal}
	var co: N                    # en içteki kırpan ata (yoksa null)
	var scroller: Node2D         # kaydırma kapsayıcısında çocukların taşıyıcısı
	var scroll_y := 0.0
	# oturmuş düğüm: tüm animasyonları bitmiş (sonlu), geçişi yok → girdileri değişmedikçe yeniden
	# hesaplanmaz (kare başı _apply maliyeti)
	var settled := false
	var slow := false            # yalnız yavaş (≥1,2 sn) sonsuz döngüler → 30 Hz yeter
	var s_extra := Transform2D.IDENTITY
	var s_op := 1.0
	var s_hid := false
	var s_na := -1
	var s_t0 := 0.0
	var s_btf: Array = []
	var s_bop := 1.0

var data: Dictionary
var nodes: Array = []            # N
var by_id := {}
var t := 0.0
var playing := true
var _dyn: Array = []
var _clips: Array = []
static var _sh_clip: Shader
static var _sh_clip_add: Shader
static var _mat_add: CanvasItemMaterial

## önceden ayrıştırılmış JSON'ları önbelleğe ekle (UIPrewarm, ana iş parçacığında)
static func put_json(name: String, J: Dictionary) -> void:
	if not _cache.has(name): _cache[name] = J

static func has_json(name: String) -> bool:
	return _cache.has(name)

static func load_json(name: String) -> Dictionary:
	UITex.note_json(name)
	if _cache.has(name): return _cache[name]
	var f := FileAccess.open(BASE + name + ".json", FileAccess.READ)
	var J: Dictionary = JSON.parse_string(f.get_as_text()) if f else {}
	_cache[name] = J
	return J

## doku yükleme (önbellekli) — ölçüm: Lyr.t_tex (ms) ilk ziyaret maliyetinin doku payı
static var t_tex := 0.0
static func _tex(file: String) -> Texture2D:
	var t0 := Time.get_ticks_usec()
	var tx: Texture2D = UITex.get_tex(BASE + "img/" + file)
	t_tex += (Time.get_ticks_usec() - t0) / 1000.0
	return tx

static var t_json := 0.0
static var t_text := 0.0
static var n_make := 0
static var n_nodes := 0
static func make(name: String, skip_keys: Array = []) -> Lyr:
	var L := Lyr.new()
	var t0 := Time.get_ticks_usec()
	var J: Dictionary = load_json(name).duplicate(true)
	t_json += (Time.get_ticks_usec() - t0) / 1000.0
	n_make += 1
	L.build(J, skip_keys)
	if ComicSkin.auto_on(name): ComicSkin.auto(L)
	if Prof.on:
		var ms := (Time.get_ticks_usec() - t0) / 1000.0
		if ms > 2.0: print("LYRMAKE ", name, " ", snappedf(ms, 0.1), " ms")
	return L

func _init() -> void:
	process_mode = Node.PROCESS_MODE_ALWAYS   # arayüz oyun duraklatılınca da canlanır
	texture_filter = CanvasItem.TEXTURE_FILTER_LINEAR_WITH_MIPMAPS

## skip_keys: anahtarı bu parçalardan birini içeren düğümler (ve alt ağaçları) kurulmaz
func build(J: Dictionary, skip_keys: Array = []) -> void:
	data = J
	var list: Array = J.get("nodes", [])
	var kids := {}
	for d in list:
		var p = d.get("parent")
		var k: String = str(p) if p != null else ""
		if not kids.has(k): kids[k] = []
		kids[k].append(d)
	for d in list:
		if d.get("parent") == null:
			_build_node(d, self, kids, skip_keys, null)
			break
	_rename_rarity()
	# canlandırma/kırpma yoksa kare başı çağrı gereksiz (set_dyn yeniden açar)
	set_process(not _dyn.is_empty() or not _clips.is_empty())

## Nadirlik adları (v1.0.9): yakalamalardaki eski adlar yenileriyle; tek kelimelik haplar
## yeni metne göre genişler, uzun metinlerde ifade içinde değişir.
const RAR_EXACT := {"ADİ": "SIRADAN", "DESTAN": "EPİK", "DESTANSI": "EPİK", "EFSANE": "EFSANEVİ"}
const RAR_PHRASE := [["ADİ GÜCÜ", "SIRADAN GÜCÜ"], ["DESTANSI GÜCÜ", "EPİK GÜCÜ"], ["DESTAN GÜCÜ", "EPİK GÜCÜ"],
	["EFSANE GÜCÜ", "EFSANEVİ GÜCÜ"], ["efsane garantili", "efsanevi garantili"], ["EFSANE GARANTİ", "EFSANEVİ GARANTİ"]]
func _rename_rarity() -> void:
	for n in nodes:
		if n.txt == null or not (n.d.get("text") is Dictionary): continue
		var src: String = String(n.d.text.get("str", "")).strip_edges()
		if RAR_EXACT.has(src):
			var w0: float = n.txt.text_width()
			set_text(n, RAR_EXACT[src])
			var dw: float = n.txt.text_width() - w0
			if dw > 0.5 and n.txt.lines_hint == 1 and n.kids.is_empty() and n.img: fit_width(n, n.size.x + dw)
			continue
		for ph in RAR_PHRASE:
			if src.contains(ph[0]):
				set_text(n, src.replace(ph[0], ph[1]))
				break

func _skip(d: Dictionary, skip_keys: Array) -> bool:
	if String(d.get("static", {}).get("display", "")) == "none": return true
	var k: String = d.get("key", "")
	for s in skip_keys:
		if k.contains(s): return true
	return false

func _build_node(d: Dictionary, parent: Node2D, kids: Dictionary, skip_keys: Array, clip_owner: N) -> N:
	var n := N.new()
	n_nodes += 1
	n.d = d
	n.co = clip_owner
	nodes.append(n)
	by_id[str(d.id)] = n
	var box: Array = d.box
	n.pos = Vector2(box[0], box[1])
	n.size = Vector2(box[2], box[3])
	var o: Array = d.get("origin", [0, 0])
	n.origin = Vector2(o[0], o[1])
	n.base_tf = d.get("tf", [])
	n.base_op = float(d.get("opacity", 1.0))
	n.node = Node2D.new()
	n.node.name = _safe_name(str(d.get("key", "n")))
	parent.add_child(n.node)
	var bl: String = d.get("blend", "")
	var add := bl in ["screen", "plus-lighter", "lighten", "color-dodge", "overlay", "soft-light", "hard-light"]
	# çocuklar: ::before önce, sonra elemanlar (z), ::after sonra
	var ch: Array = kids.get(str(d.id), [])
	var before: Array = []
	var after: Array = []
	var els: Array = []
	for c in ch:
		if _skip(c, skip_keys): continue
		match c.get("kind", "el"):
			"before": before.append(c)
			"after": after.append(c)
			_: els.append(c)
	var neg: Array = []
	var pos_: Array = []
	var seq := before + els + after
	# kararlı sıralama: (z-index, DOM sırası) — sort_custom kararlı değil
	var order := {}
	for i in seq.size(): order[seq[i]] = i
	for c in seq:
		if int(c.get("z", 0)) < 0: neg.append(c)
		else: pos_.append(c)
	var cmp := func(a, b): return int(a.get("z", 0)) < int(b.get("z", 0)) or (int(a.get("z", 0)) == int(b.get("z", 0)) and order[a] < order[b])
	neg.sort_custom(cmp)
	pos_.sort_custom(cmp)
	# CSS boyama sırası: yığın bağlamı kuran öğede (konumlu + z-index ≠ auto, opaklık < 1,
	# dönüşüm) negatif z çocuklar KENDİ ARKA PLANININ ÜSTÜNDE, içeriğinin altında çizilir;
	# değilse arka planın altında (üst bağlamın negatif katmanı).
	var stack_ctx := (bool(d.get("positioned", false)) and int(d.get("z", 0)) != 0) or float(d.get("opacity", 1.0)) < 0.999 or (d.get("tf", []) as Array).size() > 0
	if not stack_ctx:
		for c in neg: n.kids.append(_build_node(c, n.node, kids, skip_keys, clip_owner))
	var im = d.get("img")
	var tx = d.get("text")
	var fill := bool(d.get("fill", false)) and tx is Dictionary
	if im is Dictionary and not fill:
		var s := Sprite2D.new()
		s.centered = false
		s.texture = _tex(im.file)
		var dpr: float = im.get("dpr", 3)
		s.position = Vector2(im.ox, im.oy)
		s.scale = Vector2.ONE / dpr
		n.node.add_child(s)
		n.img = s
		s.material = _mat(clip_owner, add)
	if stack_ctx:
		for c in neg: n.kids.append(_build_node(c, n.node, kids, skip_keys, clip_owner))
	# metin
	if tx is Dictionary:
		n.txt = _make_text(tx, n)
		if fill:
			# background-clip:text: gölgeler normal, glif yakalanan gradyanla dolar
			var sh := _make_text(tx, n)
			sh.shadow_only = true
			sh.material = _mat(clip_owner, add)
			n.node.add_child(sh)
			n.txt_shadow = sh
			n.txt.no_shadow = true
			# glif kapsaması köşe rengiyle taşınır: color saydamsa (yalnız -webkit-text-fill) beyaz al
			if n.txt.color.a < 0.01: n.txt.color = Color.WHITE
			if im is Dictionary:
				var fm := ShaderMaterial.new()
				fm.shader = load("res://shaders/ui/text_fill.gdshader")
				fm.set_shader_parameter("fill", _tex(im.file))
				fm.set_shader_parameter("frect", Vector4(float(im.ox) - n.txt.position.x, float(im.oy) - n.txt.position.y, im.w, im.h))
				n.txt.material = fm
		else:
			n.txt.material = _mat(clip_owner, add)
		n.node.add_child(n.txt)
	# kırpma (overflow:hidden) → alt ağaçtaki çizimler bu düğümün yuvarlak kutusuyla maskelenir
	n.host = n.node
	var co := clip_owner
	var cl = d.get("clip")
	if cl is Array and (els.size() + before.size() + after.size()) > 0:
		co = n
		n.clip_rect = d.get("clipBox", [0, 0, n.size.x, n.size.y])
		n.clip_rad = cl
		_clips.append(n)
	# kaydırma kapsayıcısı (overflow-y:auto): çocuklar kaydırılan taşıyıcıda
	if d.get("scroll") is Dictionary:
		n.scroller = Node2D.new()
		n.scroller.name = "scroll"
		n.node.add_child(n.scroller)
		n.host = n.scroller
	for c in pos_: n.kids.append(_build_node(c, n.host, kids, skip_keys, co))
	# animasyonlar
	for A in d.get("anims", []):
		var props: Array = A.get("props", [])
		if props.has("transform") or props.has("indiv") or props.has("opacity"):
			n.anims.append(A)
	n.dyn = n.anims.size() > 0
	if n.dyn: _dyn.append(n)
	_apply(n, 0.0)
	return n

static func _safe_name(s: String) -> String:
	return s.replace(".", "_").replace(":", "_").replace("#", "").replace("/", "_").left(40)

func _mat(co: N, add: bool) -> Material:
	if OS.get_environment("LYR_NOCLIP") != "": co = null
	if co == null:
		if not add: return null
		if _mat_add == null:
			_mat_add = CanvasItemMaterial.new()
			_mat_add.blend_mode = CanvasItemMaterial.BLEND_MODE_ADD
		return _mat_add
	if co.mats.has(add): return co.mats[add]
	if _sh_clip == null:
		_sh_clip = load("res://shaders/ui/lyr_clip.gdshader")
		_sh_clip_add = load("res://shaders/ui/lyr_clip_add.gdshader")
	var m := ShaderMaterial.new()
	m.shader = _sh_clip_add if add else _sh_clip
	var r: Array = co.clip_rect
	m.set_shader_parameter("crect", Vector4(r[0], r[1], r[2], r[3]))
	var q: Array = co.clip_rad
	m.set_shader_parameter("rad", Vector4(q[0], q[1], q[2], q[3]))
	co.mats[add] = m
	return m

## betikle eklenen çizimler için: düğümün alt ağacındaki kırpma malzemesi
## (n kendisi kırpıyorsa kendi kutusu, değilse atasının)
func clip_mat(n: N, add := false) -> Material:
	return _mat(n if n.clip_rect.size() == 4 else n.co, add)

## kırpan düğümlerin tuval→yerel ters dönüşümü (her kare; az sayıda)
func _update_clips() -> void:
	for n: N in _clips:
		if n.mats.is_empty(): continue
		var inv: Transform2D = n.node.get_global_transform().affine_inverse()
		for m in n.mats.values():
			m.set_shader_parameter("ix", inv.x)
			m.set_shader_parameter("iy", inv.y)
			m.set_shader_parameter("io", inv.origin)

# ═══════════ METİN ═══════════

static func tr_upper(s: String) -> String:
	if I18n.lang == "en": return s.to_upper()
	return s.replace("i", "İ").replace("ı", "I").to_upper()

func _make_text(tx: Dictionary, n: N) -> UIText:
	var t0 := Time.get_ticks_usec()
	var l := _make_text0(tx, n)
	t_text += (Time.get_ticks_usec() - t0) / 1000.0
	return l

func _make_text0(tx: Dictionary, n: N) -> UIText:
	var l := UIText.new()
	var disp := String(tx.get("font", "")).begins_with("Cinzel")
	var sz: float = tx.get("size", 12)
	l.style(disp, int(tx.get("weight", 400)), sz, float(tx.get("ls", 0)), tx.get("color", "#fff"), tx.get("shadow", "none"))
	var lh: float = tx.get("lh", 0)
	if lh <= 0: lh = roundf(sz * (1.36 if disp else 1.3))
	l.line_h = lh
	var src: String = tx.get("str", "")
	var str_: String = I18n.t(src)
	if tx.get("tt", "none") == "uppercase": str_ = tr_upper(str_)
	var cb: Array = tx.get("content", [0, 0, n.size.x, n.size.y])
	var box: Array = n.d.box
	# içerik kutusu: düğüm kutusuna göre (yakalamada kökte mutlak verildi)
	var lines: Array = tx.get("lines", [])
	var al: String = tx.get("align", "start")
	l.align = 0.5 if al == "center" else (1.0 if al in ["right", "end"] else 0.0)
	var abs0 := _abs_of(n)
	l.position = Vector2(cb[0], cb[1]) - abs0
	l.wrap_w = cb[2]
	l.box_h = cb[3]
	l.lines_hint = lines.size()
	# tek satır yakalanmışsa sarma (yazı tipi ölçü farkı satırı bölmesin)
	l.nowrap = lines.size() <= 1 or String(tx.get("ws", "")) in ["nowrap", "pre"]
	var clamp_ = String(tx.get("clamp", "none"))
	if clamp_.is_valid_int(): l.max_lines = int(clamp_)
	if lines.size() > 0:
		# ilk satırın üstü (satır kutusu) → dikey hizalama yakalanandan
		var ly: float = lines[0][1] - abs0.y
		var lh_box: float = lines[0][3]
		l.position.y = ly - maxf(0, (lh - lh_box) * 0.5)
		# tek satır: yatayda gerçek satır kutusu (satır içi ikon/kardeşlerden sonra başlar)
		if lines.size() == 1:
			var lx: float = lines[0][0] - abs0.x
			var lw: float = lines[0][2]
			l.position.x = lx
			l.wrap_w = lw
	l.i18n = false
	l.text = str_
	# çeviri tek satırın genişliğini değiştirdiyse hizalama noktası korunur
	if str_ != src and lines.size() == 1:
		var nw := l.text_width()
		l.position.x -= (nw - l.wrap_w) * l.align
		l.wrap_w = nw
	return l

## düğümün kök koordinatındaki sol üstü (kutular ebeveyne göre saklı; kaydırma dahil)
func _abs_of(n: N) -> Vector2:
	# canlı konum (n.pos: esneme/taşıma sonrası), yakalanan kutu değil
	var p := Vector2.ZERO
	var m: N = n
	while m != null:
		p += m.pos
		var par = m.d.get("parent")
		if par == null: break
		var pn: N = by_id.get(str(par))
		if pn and pn.scroller and String(m.d.get("pos", "")) != "sticky": p.y -= pn.scroll_y
		m = pn
	return p

## kaydırma kapsayıcıları içinde görünen dikdörtgen (dokunma testi için)
func visible_rect_of(n: N) -> Rect2:
	var r := rect_of(n)
	var par = n.d.get("parent")
	while par != null:
		var pn: N = by_id.get(str(par))
		if pn == null: break
		if pn.scroller: r = r.intersection(rect_of(pn))
		par = pn.d.get("parent")
	return r

# ═══════════ ANİMASYON ═══════════

func _process(dt: float) -> void:
	if not playing or not is_visible_in_tree(): return
	t += dt
	var fr := Engine.get_process_frames()
	var i := 0
	for n in _dyn:
		i += 1
		if (n.settled or (n.slow and (fr + i) % 2 == 1)) and n.s_extra == n.extra and n.s_op == n.op_mul and n.s_hid == n.hidden \
				and n.s_na == n.anims.size() and n.s_t0 == n.t0 and is_same(n.s_btf, n.base_tf) and n.s_bop == n.base_op:
			continue
		_apply(n, t)
	_update_clips()


func restart() -> void:
	t = 0.0
	for n in nodes: _apply(n, 0.0)
	_update_clips()

static func _fn_tf(f: Array) -> Transform2D:
	match String(f[0]):
		"translate": return Transform2D(0, Vector2(f[1], f[2]))
		"scale": return Transform2D(Vector2(f[1], 0), Vector2(0, f[2]), Vector2.ZERO)
		"rotate": return Transform2D(float(f[1]), Vector2.ZERO)
		"skew": return Transform2D(Vector2(1, tan(f[2])), Vector2(tan(f[1]), 1), Vector2.ZERO)
		"matrix": return Transform2D(Vector2(f[1], f[2]), Vector2(f[3], f[4]), Vector2(f[5], f[6]))
		"flipx": return Transform2D(Vector2(cos(f[1]), 0), Vector2(0, 1), Vector2.ZERO)
		"flipy": return Transform2D(Vector2(1, 0), Vector2(0, cos(f[1])), Vector2.ZERO)
	return Transform2D.IDENTITY

static func list_tf(L: Array) -> Transform2D:
	var m := Transform2D.IDENTITY
	for f in L: m = m * _fn_tf(f)
	return m

static func _ident_like(f: Array) -> Array:
	match String(f[0]):
		"translate": return ["translate", 0.0, 0.0]
		"scale": return ["scale", 1.0, 1.0]
		"rotate": return ["rotate", 0.0]
		"skew": return ["skew", 0.0, 0.0]
		"flipx": return ["flipx", 0.0]
		"flipy": return ["flipy", 0.0]
		"matrix": return ["matrix", 1.0, 0.0, 0.0, 1.0, 0.0, 0.0]
	return f

## CSS transform ara değeri: aynı fonksiyon listesi → argüman bazında; değilse matris ayrıştırma
static func lerp_list(a: Array, b: Array, k: float) -> Transform2D:
	if a.is_empty() and b.is_empty(): return Transform2D.IDENTITY
	if a.is_empty():
		a = []
		for f in b: a.append(_ident_like(f))
	if b.is_empty():
		b = []
		for f in a: b.append(_ident_like(f))
	var same := a.size() == b.size()
	if same:
		for i in a.size():
			if String(a[i][0]) != String(b[i][0]) or (a[i] as Array).size() != (b[i] as Array).size():
				same = false
				break
	if same:
		var m := Transform2D.IDENTITY
		for i in a.size():
			var fa: Array = a[i]
			var fb: Array = b[i]
			var f := [fa[0]]
			for j in range(1, fa.size()): f.append(lerpf(float(fa[j]), float(fb[j]), k))
			m = m * _fn_tf(f)
		return m
	var A := list_tf(a)
	var B := list_tf(b)
	return Transform2D(lerp_angle(A.get_rotation(), B.get_rotation(), k), A.get_scale().lerp(B.get_scale(), k), lerpf(A.get_skew(), B.get_skew(), k), A.origin.lerp(B.origin, k))

static var _bez_cache := {}

## CSS zamanlama eğrisi dizesi
static func ease_css(e: String, x: float) -> float:
	match e:
		"linear", "": return x
		"ease": return UIK.ez(UIK.EASE, x)
		"ease-in": return UIK.ez(UIK.EASE_IN, x)
		"ease-out": return UIK.ez(UIK.EASE_OUT, x)
		"ease-in-out": return UIK.ez(UIK.EASE_IN_OUT, x)
		"step-start": return 1.0 if x > 0 else 0.0
		"step-end": return 1.0 if x >= 1 else 0.0
	if e.begins_with("cubic-bezier("):
		var c = _bez_cache.get(e)
		if c == null:
			var a := e.substr(13, e.length() - 14).split(",")
			c = PackedFloat32Array([float(a[0]), float(a[1]), float(a[2]), float(a[3])])
			_bez_cache[e] = c
		return UIK.bez(c[0], c[1], c[2], c[3], x)
	if e.begins_with("steps("):
		var a2 := e.substr(6, e.length() - 7).split(",")
		var n := maxi(1, int(a2[0]))
		var pos := String(a2[1]).strip_edges() if a2.size() > 1 else "end"
		if pos in ["start", "jump-start"]: return minf(1.0, ceilf(x * n) / n)
		if pos == "jump-both": return clampf(floorf(x * n + 1) / (n + 1), 0, 1)
		if pos == "jump-none": return clampf(floorf(x * n) / maxf(1, n - 1), 0, 1)
		return floorf(x * n) / n
	return x

## animasyonun bu andaki ilerlemesi (0..1) — yoksa -1 (etkisiz)
static func progress(A: Dictionary, t_ms: float) -> float:
	var dur: float = A.get("dur", 0)
	var delay: float = A.get("delay", 0)
	var it: float = A.get("iter", 1)
	var fill: String = A.get("fill", "none")
	var dir: String = A.get("dir", "normal")
	var lt := t_ms - delay
	var active := INF if it < 0 else dur * it
	var iter_p := 0.0
	var idx := 0.0
	if lt < 0:
		if not (fill in ["backwards", "both"]): return -1.0
		iter_p = 0.0
		idx = 0
	elif lt >= active:
		if not (fill in ["forwards", "both"]): return -1.0
		if dur <= 0:
			iter_p = 1.0; idx = it - 1
		else:
			var fi := it
			idx = floorf(fi)
			iter_p = fi - idx
			if iter_p == 0.0 and fi > 0:
				iter_p = 1.0; idx = fi - 1
	else:
		if dur <= 0: return 1.0
		idx = floorf(lt / dur)
		iter_p = fmod(lt, dur) / dur
	var rev := dir == "reverse"
	if dir == "alternate": rev = int(idx) % 2 == 1
	elif dir == "alternate-reverse": rev = int(idx) % 2 == 0
	if rev: iter_p = 1.0 - iter_p
	var eg: String = A.get("easing", "linear")
	if eg != "linear": iter_p = ease_css(eg, iter_p)
	return iter_p

## özellik için kare listesi (eksik 0/1 uçları taban değerle)
static func _prop_frames(A: Dictionary, key: String, base) -> Array:
	# önbellek: anahtar kareler değişmez; taban (base_tf dizisi / opaklık) aynı kaldıkça yeniden kurulmaz
	var ck := "_pf_" + key
	var C = A.get(ck)
	if C is Array and (is_same(C[0], base) if base is Array else C[0] == base): return C[1]
	var out := _prop_frames_build(A, key, base)
	A[ck] = [base, out]
	return out

static func _prop_frames_build(A: Dictionary, key: String, base) -> Array:
	var out := []
	for k in A.kfs:
		if k.has(key): out.append([float(k.off), k[key], String(k.get("ease", "linear"))])
	if out.is_empty(): return out
	if out[0][0] > 0.0: out.push_front([0.0, base, "linear" if out.size() == 0 else "ease"])
	if out[out.size() - 1][0] < 1.0: out.append([1.0, base, "linear"])
	return out

static func _seg(fr: Array, p: float) -> Array:
	# → [a, b, k]
	if p <= fr[0][0]: return [fr[0][1], fr[0][1], 0.0]
	for i in range(1, fr.size()):
		if p <= fr[i][0]:
			var a: Array = fr[i - 1]
			var b: Array = fr[i]
			var span: float = b[0] - a[0]
			var k: float = 1.0 if span <= 0 else (p - a[0]) / span
			return [a[1], b[1], ease_css(a[2], k)]
	var l = fr[fr.size() - 1][1]
	return [l, l, 0.0]

func _apply(n: N, tt: float) -> void:
	var tf_list_t := Transform2D.IDENTITY
	var have_tf := false
	var indiv_t := Transform2D.IDENTITY
	var op := n.base_op
	var tms := (tt - n.t0) * 1000.0
	var done := true
	var slow := not n.anims.is_empty()
	for A in n.anims:
		var it: float = A.get("iter", 1)
		var du: float = A.get("dur", 0)
		if it < 0 or tms - float(A.get("delay", 0)) < du * it: done = false
		if it >= 0 or du < 1200.0: slow = false
		var p := progress(A, tms)
		if p < 0: continue
		var props: Array = A.props
		if props.has("transform"):
			var fr := _prop_frames(A, "tf", n.base_tf)
			if fr.size():
				var s := _seg(fr, p)
				tf_list_t = lerp_list(s[0], s[1], s[2])
				have_tf = true
		if props.has("indiv"):
			var fr2 := _prop_frames(A, "tfi", [])
			if fr2.size():
				var s2 := _seg(fr2, p)
				indiv_t = lerp_list(s2[0], s2[1], s2[2])
		if props.has("opacity"):
			var fr3 := _prop_frames(A, "op", n.base_op)
			if fr3.size():
				var s3 := _seg(fr3, p)
				op = lerpf(float(s3[0]), float(s3[1]), s3[2])
	var base_t := Transform2D.IDENTITY
	if not have_tf or n.trs.has("tf"): base_t = list_tf(n.base_tf)
	if n.trs.has("tf"):
		var R: Array = n.trs.tf
		var k := clampf((tt - float(R[2]) - float(R[4])) / maxf(0.001, float(R[3])), 0.0, 1.0)
		base_t = lerp_list(R[0], R[1], ease_css(R[5], k))
		if k >= 1.0: n.trs.erase("tf")
	if n.trs.has("op"):
		var R2: Array = n.trs.op
		var k2 := clampf((tt - float(R2[2]) - float(R2[4])) / maxf(0.001, float(R2[3])), 0.0, 1.0)
		var o2 := lerpf(float(R2[0]), float(R2[1]), ease_css(R2[5], k2))
		if not _has_op_anim(n): op = o2
		if k2 >= 1.0: n.trs.erase("op")
	var M := indiv_t * (tf_list_t if have_tf else base_t)
	M = n.extra * M
	var o := n.origin
	# yalnız değişince ata: dönüşüm/opaklık ataması alt ağaca bildirim yayar (kare başı maliyet)
	var xf := Transform2D(0, n.pos) * Transform2D(0, o) * M * Transform2D(0, -o)
	if not n.node.transform.is_equal_approx(xf): n.node.transform = xf
	var a := clampf(op, 0, 1) * n.op_mul
	if not is_equal_approx(n.node.modulate.a, a): n.node.modulate.a = a
	var vis := not n.hidden and a > 0.001
	if n.node.visible != vis: n.node.visible = vis
	n.settled = done and n.trs.is_empty()
	n.slow = slow and not done and n.trs.is_empty()
	if n.settled or n.slow:
		n.s_extra = n.extra; n.s_op = n.op_mul; n.s_hid = n.hidden; n.s_na = n.anims.size()
		n.s_t0 = n.t0; n.s_btf = n.base_tf; n.s_bop = n.base_op

func _desc_of(n: N) -> Array:
	var out := []
	for k in n.kids:
		out.append(k)
		out.append_array(_desc_of(k))
	return out

static func _has_op_anim(n: N) -> bool:
	for A in n.anims:
		if (A.get("props", []) as Array).has("opacity"): return true
	return false

## CSS virgüllü liste (parantez içi virgüllere dokunmadan)
static func _csv(s: String) -> PackedStringArray:
	var out := PackedStringArray()
	var depth := 0
	var cur := ""
	for ch in s:
		if ch == "(": depth += 1
		elif ch == ")": depth -= 1
		if ch == "," and depth == 0:
			out.append(cur.strip_edges()); cur = ""
		else: cur += ch
	if cur.strip_edges() != "": out.append(cur.strip_edges())
	return out

static func _secs(v: String) -> float:
	v = v.strip_edges()
	if v.ends_with("ms"): return v.to_float() / 1000.0
	return v.to_float()

## düğümün yeni durumdaki geçişi (özellik için) → [süre, gecikme, eğri] ya da boş
static func _trans_for(st: Dictionary, prop: String) -> Array:
	var props := _csv(str(st.get("trProp", "")))
	var durs := _csv(str(st.get("trDur", "0s")))
	var dels := _csv(str(st.get("trDelay", "0s")))
	var eas := _csv(str(st.get("trEase", "ease")))
	for i in props.size():
		var p: String = props[i]
		if p == prop or p == "all" or (prop == "transform" and p in ["translate", "scale", "rotate"]):
			var d := _secs(durs[i % durs.size()]) if durs.size() else 0.0
			if d <= 0.0: return []
			return [d, _secs(dels[i % dels.size()]) if dels.size() else 0.0, eas[i % eas.size()] if eas.size() else "ease"]
	return []

## CSS sınıf durumu değişimi: başka bir yakalamadaki (aynı yapı) durağan dönüşüm/opaklık,
## görüntü, görünürlük ve animasyonlara geç; geçiş tanımlıysa (transition) yumuşakça.
func to_state(name: String, under: N = null) -> void:
	var J2 := load_json(name)
	var only := {}
	if under:
		for x in [under] + _desc_of(under): only[str(x.d.id)] = true
	for d2 in J2.get("nodes", []):
		var n: N = by_id.get(str(d2.id))
		if n == null: continue
		if under and not only.has(str(d2.id)): continue
		var st2: Dictionary = d2.get("static", {})
		# görünürlük
		var hid := String(st2.get("display", "")) == "none" or String(st2.get("vis", "")) == "hidden"
		# dönüşüm
		var new_tf: Array = d2.get("tf", [])
		if JSON.stringify(new_tf) != JSON.stringify(n.base_tf):
			var tr := _trans_for(st2, "transform")
			if tr.size():
				var cur := list_tf(n.base_tf)
				if n.trs.has("tf"):
					var R: Array = n.trs.tf
					cur = lerp_list(R[0], R[1], ease_css(R[5], clampf((t - float(R[2]) - float(R[4])) / maxf(0.001, float(R[3])), 0, 1)))
				n.trs["tf"] = [[["matrix", cur.x.x, cur.x.y, cur.y.x, cur.y.y, cur.origin.x, cur.origin.y]], new_tf, t, tr[0], tr[1], tr[2]]
			n.base_tf = new_tf
		# opaklık
		var new_op := float(d2.get("opacity", 1.0))
		if absf(new_op - n.base_op) > 0.001:
			var tr2 := _trans_for(st2, "opacity")
			if tr2.size(): n.trs["op"] = [n.base_op, new_op, t, tr2[0], tr2[1], tr2[2]]
			n.base_op = new_op
		# görüntü
		var im = d2.get("img")
		if im is Dictionary and n.img is Sprite2D:
			var spr := n.img as Sprite2D
			var tex: Texture2D = _tex(im.file)
			if spr.texture != tex:
				spr.texture = tex
				spr.position = Vector2(im.ox, im.oy)
				spr.scale = Vector2.ONE / float(im.get("dpr", 3))
		if n.img: n.img.visible = im is Dictionary and not n.d.get("_skin", false)     # çizgi roman kaplaması görüntüyü gizler
		# animasyonlar: ad kümesi değiştiyse yeniden başlar (CSS kuralı)
		var new_an := []
		for A in d2.get("anims", []):
			var pr: Array = A.get("props", [])
			if pr.has("transform") or pr.has("indiv") or pr.has("opacity"): new_an.append(A.duplicate(true))
		var names_old := []
		for A in n.anims: names_old.append(str(A.get("name", "")))
		var names_new := []
		for A in new_an: names_new.append(str(A.get("name", "")))
		if names_old != names_new:
			n.anims = new_an
			n.t0 = t
		n.hidden = hid or n.d.get("_skinhide", false)
		set_dyn(n)
		_apply(n, t)

# ═══════════ BETİK ARAYÜZÜ ═══════════

## anahtarı `key` parçasını içeren düğümler (DOM sırası)
func find_all(key: String) -> Array:
	var out := []
	var pseudo := key.contains("::")
	for n in nodes:
		var k := String(n.d.get("key", ""))
		# sözde öğeler (::before/::after) ancak açıkça istenirse
		if not pseudo and k.contains("::"): continue
		if k.contains(key): out.append(n)
	return out

## bir düğümün alt ağacında anahtarı içeren ilk düğüm (kendisi hariç)
func find_in(root: N, key: String) -> N:
	if root == null: return null
	for k in root.kids:
		if String(k.d.get("key", "")).contains(key) and not String(k.d.get("key", "")).contains("::"): return k
		var r := find_in(k, key)
		if r: return r
	return null

func find(key: String, idx := 0) -> N:
	var a := find_all(key)
	return a[idx] if idx < a.size() else null

## kimliğe göre (#id) — "#set-sfx" ile "#set-sfx-now" karışmaz
func find_id(id: String) -> N:
	for n in nodes:
		var k := String(n.d.get("key", ""))
		if k.contains("::") and not id.contains("::"): continue
		if k == id or k.begins_with(id + "."): return n
	return null

## anahtarı tam eşleşen düğüm (etiket adı gibi kısa anahtarlar için)
func find_exact(key: String, idx := 0) -> N:
	var k := 0
	for n in nodes:
		if String(n.d.get("key", "")) == key:
			if k == idx: return n
			k += 1
	return null

func set_text(n: N, s: String) -> void:
	if n == null or n.txt == null: return
	var tx: Dictionary = n.d.text
	var old_w := n.txt.text_width() if n.txt.lines_hint == 1 else 0.0
	s = I18n.t(s)
	n.txt.text = tr_upper(s) if tx.get("tt", "none") == "uppercase" else s
	# tek satır: hizalama noktası sabit kalır (sol/orta/sağ), kutu metne göre
	if n.txt.lines_hint == 1:
		var nw := n.txt.text_width()
		var ax := n.txt.position.x + n.txt.wrap_w * n.txt.align
		n.txt.wrap_w = maxf(n.txt.wrap_w + (nw - old_w), nw)
		n.txt.position.x = ax - n.txt.wrap_w * n.txt.align
	if n.txt_shadow:
		n.txt_shadow.text = n.txt.text
		n.txt_shadow.position = n.txt.position
		n.txt_shadow.wrap_w = n.txt.wrap_w

func set_hidden(n: N, h: bool) -> void:
	if n == null: return
	n.hidden = h
	_apply(n, t)

## gizli katman kare başı çağrılmaz (menüde ~110 katman; görünür olunca yeniden açılır)
func _notification(what: int) -> void:
	if what == NOTIFICATION_VISIBILITY_CHANGED:
		set_process(is_visible_in_tree() and (not _dyn.is_empty() or not _clips.is_empty()))

func set_dyn(n: N) -> void:
	if not is_processing() and (not is_inside_tree() or is_visible_in_tree()): set_process(true)
	if n: n.settled = false
	if n and not _dyn.has(n):
		n.dyn = true
		_dyn.append(n)

## düğümün kök koordinatındaki dikdörtgeni (dönüşümsüz)
func rect_of(n: N) -> Rect2:
	return Rect2(_abs_of(n), n.size)

## Hap/kutu genişliğini değiştir (metin değişince): görüntü dokuz parçalı olarak
## yatayda esner; köşe payı = taşma payı + min(yükseklik/2, 14). Metin kutusu da genişler.
func _to_nine(n: N) -> NinePatchRect:
	if n.img is NinePatchRect: return n.img
	var im: Dictionary = n.d.img
	var dpr: float = im.get("dpr", 3)
	var spr := n.img as Sprite2D
	var np := NinePatchRect.new()
	np.texture = spr.texture
	np.material = spr.material
	np.mouse_filter = Control.MOUSE_FILTER_IGNORE
	var mx := int(round((-float(im.ox) + minf(n.size.y * 0.5, 18.0)) * dpr))
	var my := int(round((-float(im.oy) + minf(n.size.y * 0.5, 18.0)) * dpr))
	mx = clampi(mx, 1, int(np.texture.get_width() / 2) - 1)
	my = clampi(my, 1, int(np.texture.get_height() / 2) - 1)
	np.patch_margin_left = mx
	np.patch_margin_right = mx
	np.patch_margin_top = my
	np.patch_margin_bottom = my
	np.position = spr.position
	np.scale = spr.scale
	np.size = np.texture.get_size()
	spr.replace_by(np)
	spr.queue_free()
	n.img = np
	return np

## görüntüyü kutu boyu değişimine göre dokuz parçalı esnet
func _resize_img(n: N) -> void:
	if not (n.d.get("img") is Dictionary) or n.img == null: return
	var w0: float = n.d.get("_w0", n.size.x)
	var h0: float = n.d.get("_h0", n.size.y)
	if absf(n.size.x - w0) < 0.25 and absf(n.size.y - h0) < 0.25 and not (n.img is NinePatchRect): return
	var np := _to_nine(n)
	var im: Dictionary = n.d.img
	var dpr: float = im.get("dpr", 3)
	np.size = Vector2((float(im.w) + n.size.x - w0) * dpr, (float(im.h) + n.size.y - h0) * dpr)

## Hap/kutu genişliğini değiştir (metin değişince); yatay ortası korunur (flex ortalı)
func fit_width(n: N, w: float, keep_center := true) -> void:
	if n == null: return
	if not n.d.has("_w0"): n.d["_w0"] = n.size.x
	if not n.d.has("_h0"): n.d["_h0"] = n.size.y
	var dw := w - n.size.x
	if absf(dw) < 0.25: return
	n.size.x = w
	if keep_center: n.pos.x -= dw * 0.5
	_resize_img(n)
	if n.txt:
		if n.txt.lines_hint == 1:
			# yalnız metin taşıyan hap: metin yeni kutuda aynı hizada (orta → dw/2)
			var only_text := true
			for k in n.kids:
				if String(k.d.get("kind", "el")) == "el": only_text = false
			if only_text: n.txt.position.x += dw * n.txt.align
		elif n.txt.wrap_w > 0: n.txt.wrap_w += dw
	_apply(n, t)

## Kökü dh kadar uzat (yakalamadaki esneme çıkarımı: vy kayma, vh büyüme / px)
func stretch_h(dh: float) -> void:
	for n in nodes:
		if not n.d.has("_y0"):
			n.d["_y0"] = n.pos.y
			n.d["_h0"] = n.size.y
			n.d["_w0"] = n.d.get("_w0", n.size.x)
		var vy := float(n.d.get("vy", 0.0))
		var par = n.d.get("parent")
		var pvy := 0.0
		if par != null and by_id.has(str(par)): pvy = float(by_id[str(par)].d.get("vy", 0.0))
		n.pos.y = float(n.d["_y0"]) + (vy - pvy) * dh
		n.size.y = float(n.d["_h0"]) + float(n.d.get("vh", 0.0)) * dh
		_resize_img(n)
		if n.clip_rect.size() == 4:
			for m in n.mats.values():
				m.set_shader_parameter("crect", Vector4(n.clip_rect[0], n.clip_rect[1], n.clip_rect[2], float(n.clip_rect[3]) + float(n.d.get("vh", 0.0)) * dh))
		_apply(n, t)

## yatay ortadaki bir düğümü yeni genişliğe göre ebeveyn içinde yeniden ortala
func center_x(n: N, parent_w: float) -> void:
	n.pos.x = (parent_w - n.size.x) * 0.5
	_apply(n, t)

func move(n: N, p: Vector2) -> void:
	n.pos = p
	_apply(n, t)

## metin satır sayısı değişince içerik kutusunda dikey ortala (flex align-items:center)
func v_center_text(n: N) -> void:
	if n == null or n.txt == null: return
	var tx: Dictionary = n.d.text
	var cb: Array = tx.get("content", [0, 0, n.size.x, n.size.y])
	var top := float(cb[1]) - _abs_of(n).y
	var h := float(cb[3])
	var lines := n.txt.line_count()
	n.txt.position.y = top + (h - lines * n.txt.line_h) * 0.5
	if n.txt_shadow: n.txt_shadow.position.y = n.txt.position.y

## düğümde yeni animasyon(lar) başlat (CSS sınıfı değişince başlayan animasyon gibi)
func play(n: N, anims: Array) -> void:
	if n == null: return
	n.anims = []
	for A in anims.duplicate(true):
		var pr: Array = A.get("props", [])
		if pr.has("transform") or pr.has("indiv") or pr.has("opacity"): n.anims.append(A)
	n.t0 = t
	set_dyn(n)
	_apply(n, t)

## başka bir katman verisindeki aynı anahtarlı düğümün animasyonları
static func anims_of(name: String, key: String) -> Array:
	for d in load_json(name).get("nodes", []):
		if String(d.get("key", "")) == key or String(d.get("key", "")).begins_with(key):
			return d.get("anims", [])
	return []

## animasyon gecikmesini değiştir (ad parçası eşleşen)
func set_anim_delay(n: N, name_part: String, delay_ms: float) -> void:
	if n == null: return
	for A in n.anims:
		if String(A.get("name", "")).contains(name_part): A["delay"] = delay_ms

## kaydırma: 0 … (içerik − görünür); position:sticky çocuklar yerinde kalır
func scroll_max(n: N) -> float:
	var S = n.d.get("scroll")
	if not (S is Dictionary): return 0.0
	return maxf(0.0, float(S.h) - float(S.ch) + float(n.d.get("_scroll_extra", 0.0)))

func set_scroll(n: N, y: float) -> void:
	if n == null or n.scroller == null: return
	n.scroll_y = y
	n.scroller.position.y = -y
	for k in n.kids:
		if String(k.d.get("pos", "")) == "sticky":
			k.extra = Transform2D(0, Vector2(0, maxf(0.0, y)))
			_apply(k, t)

## Dikey flex sütunu yeniden diz: görünür çocuklar, yakalanan boşlukları (önceki
## kardeşin altından bu öğenin üstüne) koruyarak alt alta; kapsayıcının alt payı da
## korunur. Dönüş: kapsayıcı yükseklik farkı (yakalanana göre).
func relayout_col(container: N, items: Array) -> float:
	var cap := []
	for it in items: cap.append([float(it.d.get("_y0", it.d.box[1])), float(it.d.get("_h0", it.d.box[3]))])
	if items.is_empty(): return 0.0
	var top: float = cap[0][0]
	var cbottom: float = cap[cap.size() - 1][0] + cap[cap.size() - 1][1]
	var pad_b := float(container.d.get("_h0", container.d.box[3])) - cbottom
	var y := top
	var first := true
	var last_bottom := top
	for i in items.size():
		var n: N = items[i]
		if n.hidden: continue
		var gap: float = 0.0 if i == 0 else cap[i][0] - (cap[i - 1][0] + cap[i - 1][1])
		y = (top if first else last_bottom + gap)
		n.pos.y = y
		_apply(n, t)
		last_bottom = y + n.size.y
		first = false
	var new_h := last_bottom + pad_b
	return new_h - float(container.d.get("_h0", container.d.box[3]))

## Düğüm yüksekliğini değiştir: görüntü dokuz parçalı esner; neredeyse tam boy mutlak
## çocuklar (çerçeve ::before vb.) da birlikte esner; kırpma kutusu güncellenir.
func resize_h(n: N, h: float) -> void:
	if not n.d.has("_h0"): n.d["_h0"] = n.size.y
	if not n.d.has("_w0"): n.d["_w0"] = n.size.x
	var h0: float = n.d["_h0"]
	n.size.y = h
	_resize_img(n)
	for k in n.kids:
		if not k.d.has("_h0"): k.d["_h0"] = k.size.y
		if not k.d.has("_w0"): k.d["_w0"] = k.size.x
		if not k.d.has("_ry0"): k.d["_ry0"] = k.pos.y
		if not (String(k.d.get("pos", "")) in ["absolute", "fixed"]): continue
		var kh0: float = k.d["_h0"]
		var ky0: float = k.d["_ry0"]
		if absf(kh0 - h0) <= 6.0 and ky0 <= 4.0:
			# kutuyu dolduran katman (inset:0 benzeri) uzar
			k.size.y = kh0 + (h - h0)
			_resize_img(k)
		elif ky0 > h0 * 0.5 and ky0 + kh0 <= h0 + 2.0:
			# alta yaslı öğe (bottom:…) kutunun dibiyle kayar
			k.pos.y = ky0 + (h - h0)
			_apply(k, t)
	if n.clip_rect.size() == 4:
		for m in n.mats.values():
			m.set_shader_parameter("crect", Vector4(n.clip_rect[0], n.clip_rect[1], n.clip_rect[2], float(n.clip_rect[3]) + (h - h0)))
	_apply(n, t)

## düğümün animasyonlarını bitmiş hâline getir (dokununca töreni atla)
func finish_anims(n: N) -> void:
	if n == null: return
	n.t0 = t - 999.0
	_apply(n, t)
