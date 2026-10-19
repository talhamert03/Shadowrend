class_name I18n
## i18n.js — DİL KATMANI · TR (kaynak) → EN. Arayüze düşen her metin TEK noktada çevrilir
## (UIText.text): ① birebir eşleşme (DICT) ② kalıp (RULES: "DALGA 3", "GÖREV 2 · …")
## ③ yalnız tamamı BÜYÜK HARF kısa etiketlerde kelime kelime (WORDS). Karşılığı olmayan metin
## olduğu gibi kalır ve `missing`e yazılır. Tablolar web'den üretilir: assets/i18n_en.json.

const LANGS := ["tr", "en"]
static var lang := ""
static var missing := {}
static var _dict := {}
static var _rules: Array = []      # [[RegEx, hedef]]
static var _words := {}
static var _caps: RegEx
static var _cache := {}
static var _re_lower: RegEx
static var _re_up2: RegEx
static var _re_upword: RegEx

## açılışta: kayıtlı seçim (Settings.lang) yoksa cihaz dili (tr* → tr, aksi en)
static func boot() -> void:
	var s = Settings.data.get("lang", "") if Settings.data else ""
	if s in LANGS: lang = s
	else:
		lang = "tr" if OS.get_locale_language() == "tr" else "en"
	for a in OS.get_cmdline_user_args():
		if a.begins_with("lang=") and a.substr(5) in LANGS: lang = a.substr(5)     # geliştirici
	_load()

static func _load() -> void:
	if lang == "tr" or not _dict.is_empty(): return
	var f := FileAccess.open("res://assets/i18n_en.json", FileAccess.READ)
	if f == null: return
	var J = JSON.parse_string(f.get_as_text())
	if not (J is Dictionary): return
	_dict = J.get("DICT", {})
	_words = J.get("WORDS", {})
	for r in J.get("RULES", []):
		var re := RegEx.new()
		if re.compile(str(r[0])) == OK: _rules.append([re, str(r[1])])
	_caps = RegEx.new()
	_caps.compile(str(J.get("CAPS", "^$")))
	_re_lower = RegEx.new()
	_re_lower.compile("[a-zçğıöşü]{3}|[ÇĞİÖŞÜçğıöşü]")
	_re_up2 = RegEx.new()
	_re_up2.compile("[A-ZÇĞİÖŞÜ]{2}")
	_re_upword = RegEx.new()
	_re_upword.compile("[A-ZÇĞİÖŞÜ]+")

static func t(s: String) -> String:
	if lang == "tr" or lang == "" or s == "" or _dict.is_empty(): return s
	if _cache.has(s): return _cache[s]
	var k := s.strip_edges()
	if k == "":
		return s
	var lead := s.substr(0, s.find(k))
	var tail := s.substr(s.find(k) + k.length())
	var out = _dict.get(k)
	if out == null:
		for R in _rules:
			var m: RegExMatch = (R[0] as RegEx).search(k)
			if m:
				var to: String = R[1]
				for i in range(m.get_group_count(), 0, -1):
					to = to.replace("$" + str(i), t(m.get_string(i)))
				out = to
				break
	if out == null and _caps.search(k) and k.length() <= 48 and _re_up2.search(k):
		var any := false
		var w := ""
		var last := 0
		for m in _re_upword.search_all(k):
			w += k.substr(last, m.get_start() - last)
			var x := m.get_string()
			if _words.has(x):
				any = true
				w += str(_words[x])
			else:
				w += str(_dict.get(x, x))
			last = m.get_end()
		w += k.substr(last)
		if any: out = w
	if out == null:
		if _re_lower.search(k): missing[k] = true
		out = k
	var res: String = lead + str(out) + tail
	_cache[s] = res
	return res

## dil değişince: kaydedilir, sahne baştan yüklenir (web: location.reload)
static func set_lang(l: String, tree: SceneTree) -> void:
	if not (l in LANGS) or l == lang: return
	Settings.set_value("lang", l)
	lang = l
	_cache.clear()
	_load()
	tree.reload_current_scene()
