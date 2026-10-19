class_name UIPrewarm
extends Node
## Menüyü takılmasız kılan arka plan hazırlığı (menü açıkken, kullanıcı boştayken):
##   ① tek iş parçacığı işiyle TÜM sayfaların katman JSON'ları ayrıştırılır, dokuları listelenir
##   ② dokular (+ sayfaların betikle eklediği gear/portre çizimleri, sandık modelleri) UITex ile
##      arka planda çözülür — WebP çözme ana iş parçacığında değil
##   ③ boşta, dokuları hazır olan sayfa gizli kurulur (her boşlukta bir sayfa)
##   ④ gölgelendirici ısıtma: arayüz gölgelendiricileri ve 3B sandık sahnesi bir kez ekranda
##      (görünmez) çizilir — ilk sekme / ilk sandık açılışında derleme takılması olmaz

const PAGES := {
	"kahraman": ["pg_kahraman", "hc_"],
	"cephane": ["pg_cephane", "kzd_", "kzs_", "kz_", "kzst", "ks_", "kztab_", "kc"],
	"magaza": ["pg_magaza", "deal_", "fb_", "sec_", "vc_", "mkh", "mkg", "mkp_", "mkx_", "mk_empty", "x2_note", "sp_", "ex_", "cb_"],
	"etkinlik": ["pg_etkinlik", "ev_"],
	"dunyalar": ["pg_dunyalar", "wsel_", "cn_"],
	"_cer": ["cer_", "cs_", "ci_"],
}
const ORDER := ["kahraman", "cephane", "magaza", "etkinlik", "dunyalar"]
const CANVAS_SHADERS := ["pie_badge", "rgrad", "img_round", "cer_beam", "text_fill", "ult_ring", "lyr_clip_add",
	"cer_rays", "radial", "panel", "lyr_clip", "dying", "conic_ring", "ult_core", "silhouette"]

var menu
var _queue: Array = []
var _task := -1
var _parsed := {}            # iş parçacığı çıktısı: ad → JSON
var _ppaths := {}            # iş parçacığı çıktısı: sayfa → {doku yolu: true}
var _page_tex := {}          # sayfa → [doku yolu]
var _tex_pages: Array = []   # ön yükleme sırası (sayfalar, tören, katmanlar)
var _all_names: Array = []
var _idle := 0.0
var _warm_ui := 0            # arayüz gölgelendirici ısıtma: kalan kare
var _warm_nodes: Array = []
var _warm_chest = null       # ChestStage (ısıtma)
var _warm_chest_n := 0
var _chest_warmed := false
var _ui_warmed := false
var _save_t := 0.0

func _init(m) -> void:
	menu = m
	name = "Prewarm"

func start() -> void:
	if _all_names.is_empty():
		var d := DirAccess.open(Lyr.BASE)
		if d:
			for f in d.get_files():
				if f.ends_with(".json"): _all_names.append(f.get_basename())
	_queue = ORDER.filter(func(p): return not menu.pages.has(p))
	# düşük kademe: yalnız komşu sekmeler kurulur (bellek); dokular yine de önbelleğe gelir
	if Quality.tier == "low": _queue = _queue.filter(func(p): return p == "kahraman" or p == "cephane")
	elif Quality.tier == "mid": _queue = _queue.filter(func(p): return p != "dunyalar")
	_want_chests()
	if _task < 0 and _page_tex.is_empty():
		# önce kurulacak sekmeler + tören, sonra diğer sekmeler; katmanlar (ayrıntı, inceleme,
		# görevler…) düşük kademede yok (bellek)
		_tex_pages = _queue + ["_cer"]
		for pg in ORDER:
			if not _tex_pages.has(pg): _tex_pages.append(pg)
		if Quality.tier != "low": _tex_pages.append_array(menu.g.ui.OVERLAYS)
		# ayrıştırılacak JSON'lar: manifestodakiler; yoksa (ilk kurulum) kurulacak sayfanın ön ekleri.
		# Tüm yakalamalar ~24 MB JSON — hepsi bellekte tutulmaz.
		var by_page := {}
		for pg in _tex_pages:
			var names: Array = UITex.manifest_json(pg)
			if names.is_empty() and PAGES.has(pg) and (_queue.has(pg) or pg == "_cer" or pg == "dunyalar"):
				for n in _all_names:
					for pre in PAGES[pg]:
						if n.begins_with(pre):
							names.append(n)
							break
			by_page[pg] = names.filter(func(n): return not Lyr.has_json(n))
		_parsed = {}
		_ppaths = {}
		_task = WorkerThreadPool.add_task(UIPrewarm._parse_job.bind(by_page, _parsed, _ppaths), false, "ui_prewarm")

## sandık açılışında gerekecek modeller + efekt dokuları (ücretsiz, zafer, yuvadakiler)
func _want_chests() -> void:
	var g = menu.g
	if g == null or g.chests == null: return
	var types := ["ahsap", "kan"]
	for c in g.chests.slots:
		if c != null: types.append(str(c.t))
	for t in types: ChestStage.want(ChestStage.tier_of(t))
	var fx: Array = []
	for n in ["beam", "glow", "mouth", "rune", "star"]: fx.append(ChestStage.BASE + "fx_" + n + ".png")
	UITex.request(fx)

## sayfaların betikle eklediği çizimler (yakalamada yok)
func _extra(pg: String) -> Array:
	var out: Array = []
	match pg:
		"cephane":
			for e in D.EQUIPMENT: out.append("res://assets/ui/art/gear/" + str(e.get("icon", "")) + ".png")
			out.append("res://assets/ui/art/portrait/" + str(menu.g.meta.selectedChar) + ".webp")
		"magaza":
			for k in D.CHARACTERS: out.append("res://assets/ui/art/portrait/" + str(k) + ".webp")
		"dunyalar":
			var w: int = int(menu.home_target().w)
			var sz := JourneyPage.art_size()
			for ww in [w, w + 1, w - 1]:
				if ww >= 1 and ww <= D.WORLDS.size(): out.append_array(ClimbArt.card_paths(ww, sz.x, sz.y))
	return out

func _process(dt: float) -> void:
	# savaşta yeni yükleme başlatılmaz (çözme/yükleme savaş karelerini bölmesin)
	if menu.g.state != "menu": return
	UITex.poll()
	_tick_warm()
	if _task >= 0:
		if not WorkerThreadPool.is_task_completed(_task): return
		WorkerThreadPool.wait_for_task_completion(_task)
		_task = -1
		for k in _parsed: Lyr.put_json(k, _parsed[k])
		_parsed = {}
		# dokular: kurulacak sayfalar (yakın sekmeler önce), sonra tören ve diğerleri. Liste, sayfanın
		# önceki kurulumlarda gerçekten kullandığı dokular (UITex manifestosu); yoksa kabuk görselleri
		for pg in _tex_pages:
			# dünya seçimi: manifesto 10 dünyanın tüm çizimini içerir (~120 MB) — yalnız kabuk +
			# sıradaki dünyanın kartı (_extra); diğer kartlar sayfada kaydırdıkça yüklenir
			var L: Array = [] if pg == "dunyalar" else UITex.manifest(pg)
			if L.is_empty(): L = (_ppaths.get(pg, {}) as Dictionary).keys()
			L.append_array(_extra(pg))
			_page_tex[pg] = L
			UITex.request(L)
		_ppaths = {}
		return
	if not menu.visible or UITex.rec != "": return
	# kullanıcı boştayken (dokunuş, kaydırma, sayfa geçişi yokken 0,25 sn)
	if menu.busy():
		_idle = 0.0
		return
	_idle += dt
	if _idle < 0.25: return
	_idle = 0.0
	if not _ui_warmed:
		_ui_warmed = true
		_start_ui_warm()
		return
	# kurulacak sayfa: dokuları hazırsa (ya da yükleyici boşaldıysa)
	while not _queue.is_empty() and menu.pages.has(_queue[0]): _queue.pop_front()
	if not _queue.is_empty():
		var pg: String = _queue[0]
		if not _tex_ready(pg) and UITex.busy(): return
		_queue.pop_front()
		if menu.pages.size() - 1 < menu.page_cap(): menu.prebuild(pg)
		return
	if not _chest_warmed and not UITex.busy():
		_chest_warmed = true
		_start_chest_warm()
		return
	# kullanım manifestosu (seyrek)
	_save_t += 0.25
	if _save_t > 10.0:
		_save_t = 0.0
		UITex.save_manifest()

func _tex_ready(pg: String) -> bool:
	for p in _page_tex.get(pg, []):
		if not UITex.has(p): return false
	return _page_tex.has(pg)

# ═════════════ gölgelendirici ısıtma ═════════════
# Godot GLES3 programları ilk çizimde derler. Her arayüz gölgelendiricisi 2×2 px, neredeyse
# saydam bir dikdörtgenle iki kare çizilir; 3B sandık sahnesi görünmez bir alt görünümde
# üç kare işlenir (malzemeler + gökyüzü ışıması). Sonra hepsi bırakılır.

func _start_ui_warm() -> void:
	var host: Node = menu
	for n in CANVAS_SHADERS:
		var path: String = "res://shaders/ui/" + str(n) + ".gdshader"
		if not ResourceLoader.exists(path): continue
		var cr := ColorRect.new()
		cr.mouse_filter = Control.MOUSE_FILTER_IGNORE
		cr.size = Vector2(2, 2)
		cr.position = Vector2(0, 0)
		cr.modulate.a = 0.004
		var m := ShaderMaterial.new()
		m.shader = load(path)
		cr.material = m
		host.add_child(cr)
		_warm_nodes.append(cr)
	_warm_ui = 3

func _start_chest_warm() -> void:
	var g = menu.g
	var t := "ahsap"
	for c in g.chests.slots:
		if c != null:
			t = str(c.t)
			break
	var st := ChestStage.new()
	st.visible = false
	add_child(st)
	st.setup(120, 120)
	st.set_chest(t)
	_warm_chest = st
	_warm_chest_n = 4

func _tick_warm() -> void:
	if _warm_ui > 0:
		_warm_ui -= 1
		if _warm_ui == 0:
			for n in _warm_nodes: (n as Node).queue_free()
			_warm_nodes.clear()
	if _warm_chest:
		_warm_chest_n -= 1
		if _warm_chest_n <= 0:
			(_warm_chest as Node).queue_free()
			_warm_chest = null

## iş parçacığı: JSON ayrıştır + doku yollarını topla (sahne ağacına ve üyelere dokunmaz;
## yalnız kendisine verilen kaplara yazar)
static func _parse_job(by_page: Dictionary, out: Dictionary, paths: Dictionary) -> void:
	for pg in by_page:
		var ps := {}
		for n in by_page[pg]:
			var v = out.get(n)
			if v == null:
				var f := FileAccess.open(Lyr.BASE + n + ".json", FileAccess.READ)
				if f == null: continue
				v = JSON.parse_string(f.get_as_text())
				if not (v is Dictionary): continue
				out[n] = v
			# yedek liste (manifesto yoksa): yalnız sayfa kabuğunun görselleri
			if not (str(n).begins_with("pg_") or str(n) == "cer"): continue
			for nd in v.get("nodes", []):
				var im = nd.get("img")
				if im is Dictionary:
					if im.get("file"): ps[Lyr.BASE + "img/" + str(im.file)] = true
					for t in im.get("tiles", []): ps[Lyr.BASE + "img/" + str(t.file)] = true
		paths[pg] = ps

func _exit_tree() -> void:
	if _task >= 0: WorkerThreadPool.wait_for_task_completion(_task)
	UITex.save_manifest()

func _notification(what: int) -> void:
	# arka plana alınınca (Android) manifesto yazılır
	if what == NOTIFICATION_APPLICATION_PAUSED or what == NOTIFICATION_WM_CLOSE_REQUEST: UITex.save_manifest()
