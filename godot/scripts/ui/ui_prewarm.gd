class_name UIPrewarm
extends Node
## Menü sekmelerini önceden hazırlar: sekme ilk kez açıldığında takılmasın.
##   ① iş parçacığı havuzunda sayfanın katman JSON'ları ayrıştırılır, kullandığı dokular listelenir
##   ② dokular ResourceLoader.load_threaded_request ile arka planda çözülür
##   ③ kullanıcı boştayken (dokunuş/kaydırma/geçiş yok) sayfa gizli kurulur; geçici doku
##      referansları bırakılır (yalnız sayfanın gerçekten kullandıkları bellekte kalır)

const PAGES := {
	"kahraman": ["pg_kahraman", "hc_"],
	"cephane": ["pg_cephane", "kzd_", "kzs_", "kz_", "kzst", "ks_", "kztab_", "kc"],
	"magaza": ["pg_magaza", "deal_", "fb_", "sec_", "vc_", "mkh", "mkg", "mkp_", "mkx_", "mk_empty", "x2_note", "sp_", "ex_"],
	"etkinlik": ["pg_etkinlik", "ev_"],
	"dunyalar": ["pg_dunyalar", "wsel_", "cn_"],
}
const ORDER := ["kahraman", "cephane", "magaza", "etkinlik", "dunyalar"]

var menu
var _queue: Array = []
var _cur := ""
var _task := -1
var _parsed := {}           # iş parçacığı çıktısı: ad → JSON
var _paths: Array = []      # istenen dokular
var _refs: Array = []
var _pathset := {}
var _names: Array = []
var _all_names: Array = []
var _idle := 0.0

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
	# düşük kademe: yalnız komşu sekmeler (bellek)
	if Quality.tier == "low": _queue = _queue.filter(func(p): return p == "kahraman" or p == "cephane")
	elif Quality.tier == "mid": _queue = _queue.filter(func(p): return p != "dunyalar")

func _process(dt: float) -> void:
	if _cur == "":
		if _queue.is_empty(): return
		_cur = _queue.pop_front()
		if menu.pages.has(_cur):
			_cur = ""
			return
		_names = []
		for n in _all_names:
			if Lyr.has_json(n): continue
			for pre in PAGES[_cur]:
				if n.begins_with(pre):
					_names.append(n)
					break
		_parsed = {}
		_paths = []
		_parsed = {}
		_pathset = {}
		_task = WorkerThreadPool.add_task(UIPrewarm._parse_job.bind(_names.duplicate(), _parsed, _pathset))
		return
	if _task >= 0:
		if not WorkerThreadPool.is_task_completed(_task): return
		WorkerThreadPool.wait_for_task_completion(_task)
		_task = -1
		for k in _parsed: Lyr.put_json(k, _parsed[k])
		_parsed = {}
		_paths = _pathset.keys()
		for p in _paths:
			if not ResourceLoader.has_cached(p): ResourceLoader.load_threaded_request(p, "Texture2D")
		return
	# dokular hazır mı?
	if _refs.is_empty() and not _paths.is_empty():
		for p in _paths:
			if ResourceLoader.load_threaded_get_status(p) == ResourceLoader.THREAD_LOAD_IN_PROGRESS: return
		for p in _paths:
			if ResourceLoader.load_threaded_get_status(p) == ResourceLoader.THREAD_LOAD_LOADED:
				_refs.append(ResourceLoader.load_threaded_get(p))
	# kullanıcı boştayken kur (dokunuş, kaydırma, sayfa geçişi yokken 0,25 sn)
	if menu.busy():
		_idle = 0.0
		return
	_idle += dt
	if _idle < 0.25: return
	_idle = 0.0
	if menu.visible and not menu.pages.has(_cur) and menu.pages.size() - 1 < menu.page_cap(): menu.prebuild(_cur)
	_refs.clear()
	_paths.clear()
	_cur = ""

## iş parçacığı: JSON ayrıştır + doku yollarını topla (sahne ağacına ve üyelere dokunmaz;
## yalnız kendisine verilen kaplara yazar)
static func _parse_job(names: Array, out: Dictionary, paths: Dictionary) -> void:
	for n in names:
		var f := FileAccess.open(Lyr.BASE + n + ".json", FileAccess.READ)
		if f == null: continue
		var v = JSON.parse_string(f.get_as_text())
		if not (v is Dictionary): continue
		out[n] = v
		for nd in v.get("nodes", []):
			var im = nd.get("img")
			if im is Dictionary:
				if im.get("file"): paths[Lyr.BASE + "img/" + str(im.file)] = true
				for t in im.get("tiles", []): paths[Lyr.BASE + "img/" + str(t.file)] = true

func _exit_tree() -> void:
	if _task >= 0: WorkerThreadPool.wait_for_task_completion(_task)
