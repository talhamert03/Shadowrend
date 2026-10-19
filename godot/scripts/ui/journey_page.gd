class_name JourneyPage
extends Node2D
## ui.js renderWorldSelect / renderChapters — DÜNYALAR sayfası (SEFER HARİTASI).
## Dünya kipi: on dünya kartı alttan yukarı (Dünya 1 en altta), her kart kendi gök
## tırmanışı önizlemesiyle; oynanan dünya "ŞU AN BURADASIN". Bölüm kipi: dikey ada
## tırmanışı (ClimbArt tall), düğümler adaların tam üstünde (climbLayout ortak),
## sıradaki görev görünür bandın ortasına kaydırılır.
## Yakalama: pg_dunyalar(_ch) kabuk · wsel_<w>_<durum>[_cur] · cn_* düğümleri.

const MPW := 10
const PAD_T := 56.0
const PAD_B := 96.0
const GAP := 18.0
const ISLE_BOSS_DEPTH := 1.3   # isleScene.ISLE_BOSS_DEPTH (isleDepthBelow; SPRITES=false)

var menu                      # ScrMenu (düğme/kaydırma kaydı, sayfa geçişi)
var g
var mode := "worlds"
var world := 1
var shell: Lyr
var root: Lyr.N
var _items: Array = []        # içerik Lyr/düğümleri (yeniden kurulumda silinir)
var _art: ClimbArt
var _lazy: Array = []         # dünya kartı çizimleri: {art, wd, cleared, w, h, y0, y1, st: 0 boş · 1 yükleniyor · 2 boyalı, paths}

func _init(m) -> void:
	menu = m
	g = m.g
	name = "Journey"

func open_worlds() -> void:
	mode = "worlds"
	_build_shell("pg_dunyalar")
	render_worlds()

func _build_shell(nm: String) -> void:
	if shell and shell.data.get("name", "") == nm:
		_clear_items()
		return
	_clear_items()
	if shell:
		menu.unbtn(shell)
		shell.queue_free()
	shell = Lyr.make(nm, ["#journey.journey"])
	add_child(shell)
	shell.stretch_h(Scr.dh_of(self))
	root = shell.nodes[0]
	menu.scroll_area(shell, root)
	menu.btn(shell, shell.find_id("#journey-back"), func(): _back())

func _clear_items() -> void:
	_lazy.clear()
	for it in _items:
		if it is Lyr: menu.unbtn(it)
		(it as Node).queue_free()
	_items.clear()
	_art = null

## içerik taşıyıcı: kaydırıcının EN ALTINDA (yapışkan başlık üstte kalsın)
var _content: Node2D
func _host() -> Node2D:
	var sc: Node2D = root.scroller if root.scroller else root.node
	if _content == null or not is_instance_valid(_content) or _content.get_parent() != sc:
		_content = Node2D.new()
		_content.name = "content"
		sc.add_child(_content)
		sc.move_child(_content, 0)
	return _content

func _back() -> void:
	g.audio.play("click")
	if mode == "chapters":
		open_worlds()
	else:
		menu.set_page("savas")

func _set_content_h(h: float) -> void:
	var S = root.d.get("scroll")
	if S is Dictionary:
		S.h = h
	shell.set_scroll(root, 0.0)

# ═════════════ dünya kartları ═════════════

## önizleme çiziminin kutusu (yakalamadaki .wsel-art)
static func art_size() -> Vector2:
	for n in Lyr.load_json("wsel_1_peek").get("nodes", []):
		if String(n.get("key", "")).contains("wsel-art"): return Vector2(float(n.box[2]), float(n.box[3]))
	return Vector2(330, 190)

func _process(_dt: float) -> void:
	if _lazy.is_empty() or mode != "worlds" or not is_visible_in_tree() or root == null: return
	var top: float = root.scroll_y
	var vh: float = root.size.y
	var near0 := top - vh * 0.75
	var near1 := top + vh * 1.75
	var painted := false
	for c in _lazy:
		var vis: bool = float(c.y1) > near0 and float(c.y0) < near1
		var far: bool = float(c.y1) < top - vh * 2.5 or float(c.y0) > top + vh * 3.5
		match int(c.st):
			0:
				if vis:
					c.paths = ClimbArt.card_paths(int(c.wd.id), float(c.w), float(c.h))
					UITex.request(c.paths, true)
					c.st = 1
			1:
				if painted: continue
				var ready := true
				for p in c.paths:
					if not UITex.has(p):
						ready = false
						break
				if ready or not UITex.busy():
					(c.art as ClimbArt).paint(c.wd, int(c.cleared), float(c.w), float(c.h))
					c.st = 2
					painted = true       # karede en çok bir kart boyanır
			2:
				if far:
					(c.art as ClimbArt).clear()
					c.st = 0

func render_worlds() -> void:
	var cur_w: int = int(menu.home_target().w)
	var N: int = D.WORLDS.size()
	var y := 4.0 + 66.0
	var card_h := 282.875
	var cur_y := -1.0
	for k in N:
		var wd: Dictionary = D.WORLDS[N - 1 - k]
		var w := int(wd.id)
		var open: bool = D.worldUnlocked(g.progress, w)
		var done: bool = D.worldCleared(g.progress, w)
		var cleared := int(g.progress.get(w, 0))
		var st := "done" if done else ("peek" if open else "locked")
		var cur := w == cur_w and st != "locked"
		var key := "wsel_" + str(w) + "_" + st + ("_cur" if cur else "")
		if not FileAccess.file_exists(Lyr.BASE + key + ".json"): continue
		var C := Lyr.make(key)
		_host().add_child(C)
		_items.append(C)
		C.position = Vector2(14, y)
		card_h = C.nodes[0].size.y
		if cur: cur_y = y
		# önizleme sanatı (tuval düğümünün yerinde, kartın yuvarlak kırpmasıyla)
		# çizim tembel: kart görünür alana yaklaşınca dokuları arka planda yüklenip boyanır,
		# uzaklaşınca bırakılır (10 dünyanın tüm çizimleri ~120 MB doku)
		var an := C.find(".wsel-art")
		if an:
			var art := ClimbArt.new()
			art.set_clip(C.clip_mat(an), C.clip_mat(an, true))
			an.node.add_child(art)
			_lazy.append({"art": art, "wd": wd, "cleared": cleared, "w": an.size.x, "h": an.size.y, "y0": y, "y1": y + C.nodes[0].size.y, "st": 0, "paths": []})
		var cnt := C.find(".wsel-count")
		if cnt: C.set_text(cnt, str(cleared) + "/" + str(MPW))
		var pr := C.find(".wsel-progress")
		if pr:
			for kk in pr.kids:
				if String(kk.d.get("kind", "el")) == "el":
					C.fit_width(kk, maxf(0.001, pr.size.x * float(cleared) / MPW), false)
		if open:
			var ww := w
			menu.btn(C, C.nodes[0], func():
				g.audio.play("click")
				world = ww
				render_chapters(ww), 0.98)
		y += card_h + GAP
	var total := y - GAP + 22.0 + 18.0   # .wsel alt dolgu 22 + sayfa alt dolgu 18 (ölçüldü)
	_set_content_h(total)
	var ch: float = root.size.y
	if cur_y >= 0: shell.set_scroll(root, clampf(cur_y - 72.0, 0, shell.scroll_max(root)))
	else: shell.set_scroll(root, shell.scroll_max(root))

# ═════════════ bölüm seçimi ═════════════

func render_chapters(w: int) -> void:
	mode = "chapters"
	world = w
	_build_shell("pg_dunyalar_ch")
	var wd: Dictionary = D.WORLDS[w - 1]
	var cleared := int(g.progress.get(w, 0))
	var jm := shell.find(".jt-main")
	if jm: shell.set_text(jm, "DÜNYA " + str(w) + " · " + str(wd.name))
	var js := shell.find(".jt-sub")
	if js: shell.set_text(js, str(cleared) + "/" + str(MPW) + " GÖREV · BOSS: " + str(wd.boss))
	var W: float = root.size.x
	var base := roundf(minf(1560.0, maxf(1120.0, W * 3.3)))
	var H := base + PAD_T + PAD_B
	var pad := {"t": PAD_T / H, "b": PAD_B / H}
	var top0 := 4.0
	# sahne
	var holder := Node2D.new()
	holder.position = Vector2(0, top0)
	_host().add_child(holder)
	_items.append(holder)
	_art = ClimbArt.new()
	holder.add_child(_art)
	_art.paint(wd, cleared, W, H, true, pad)
	# düğümler
	var lay := ClimbArt.layout_tall(MPW, pad.t, pad.b)
	var target_y := -1.0
	for m in range(1, MPW + 1):
		var P: Dictionary = lay[m - 1]
		var boss := m == MPW
		var off: float = (P.r * W * (ISLE_BOSS_DEPTH * 0.40)) / H if boss else 0.0
		var done := cleared >= m
		var nxt: bool = D.missionUnlocked(g.progress, w, m) and not done
		var stars := Ledger.stars(g.meta, w, m)
		var key := ""
		if boss:
			key = "cn_boss_" + ("done_s" + str(stars) if done else ("next" if nxt else "locked")) + "_w" + str(w)
		else:
			key = "cn_done_s" + str(stars) if done else ("cn_next_w" + str(w) if nxt else "cn_locked")
		if not FileAccess.file_exists(Lyr.BASE + key + ".json"): continue
		var Nn := Lyr.make(key)
		holder.add_child(Nn)
		_items.append(Nn)
		var left: float = P.x * W
		var top: float = (P.y + off) * H
		Nn.position = Vector2(left, top)
		var b := Nn.find_exact("b")
		if b: Nn.set_text(b, str(m))
		if nxt or (boss and target_y < 0 and not done): target_y = top
		if done or nxt:
			var mm := m
			menu.btn(Nn, Nn.nodes[0], func(): _pick(w, mm), 0.92)
	var foot := Lyr.make("cn_foot")
	holder.add_child(foot)
	_items.append(foot)
	foot.position = Vector2(W * 0.5, H - PAD_B - 10.0 - foot.nodes[0].size.y)   # translateX(-50%) yakalamada
	_set_content_h(top0 + H)
	if target_y < 0: target_y = H
	var visH := maxf(120.0, root.size.y - PAD_T - PAD_B)
	shell.set_scroll(root, clampf(top0 + target_y - (PAD_T + visH / 2.0), 0, shell.scroll_max(root)))

func _pick(w: int, m: int) -> void:
	g.audio.play("click")
	g.ui.set_pick(w, m)
	mode = "worlds"
	menu.set_page("savas")
	g.ui.toast("GÖREV " + str(m) + " SEÇİLDİ — SAVAŞ’A BAS")
