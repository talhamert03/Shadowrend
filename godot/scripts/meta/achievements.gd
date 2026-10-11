class_name Ach
## achievements.js — Başarımlar (güç vermez; altın/gem + unvan), birebir.

const ACH := [
	{"id": "k1",   "name": "İLK KAN",          "desc": "Toplam 500 düşman kıy",        "st": "kills", "n": 500,   "gold": 60},
	{"id": "k2",   "name": "HASATÇI",          "desc": "Toplam 5 000 düşman kıy",      "st": "kills", "n": 5000,  "gold": 150, "gem": 5},
	{"id": "k3",   "name": "KIZIL TIRPAN",     "desc": "Toplam 25 000 düşman kıy",     "st": "kills", "n": 25000, "gem": 20, "title": "KIZIL TIRPAN"},
	{"id": "w1",   "name": "İLK ZAFER",        "desc": "Bir görevi kazan",             "st": "wins",  "n": 1,     "gold": 50},
	{"id": "w2",   "name": "SAVAŞ ALIŞKANLIĞI", "desc": "25 görev kazan",              "st": "wins",  "n": 25,    "gold": 200, "gem": 5},
	{"id": "w3",   "name": "EFSANE YOLU",      "desc": "100 görev kazan",              "st": "wins",  "n": 100,   "gem": 25, "title": "YOL ERİ"},
	{"id": "b1",   "name": "DEV AVCISI",       "desc": "5 boss devir",                 "st": "boss",  "n": 5,     "gold": 120},
	{"id": "b2",   "name": "TAHT YIKAN",       "desc": "30 boss devir",                "st": "boss",  "n": 30,    "gem": 15, "title": "TAHT YIKAN"},
	{"id": "c1",   "name": "KATLİAM",          "desc": "Tek zincirde 30 kıyım",        "st": "combo", "n": 30,    "gold": 80, "max": true},
	{"id": "c2",   "name": "KIZIL HASAT",      "desc": "Tek zincirde 60 kıyım",        "st": "combo", "n": 60,    "gem": 10, "title": "HASAT KIZILI", "max": true},
	{"id": "u1",   "name": "SÜPER GÜÇ",        "desc": "20 kez süper yetenek kullan",  "st": "ults",  "n": 20,    "gold": 80},
	{"id": "u2",   "name": "FIRTINA ÇAĞIRAN",  "desc": "200 kez süper yetenek kullan", "st": "ults",  "n": 200,   "gem": 10},
	{"id": "l1",   "name": "GÜÇLENİŞ",         "desc": "Bir koşuda 20. seviyeye ulaş", "st": "lvl",   "n": 20,    "gold": 70, "max": true},
	{"id": "nh",   "name": "DOKUNULMAZ",       "desc": "Canın hiç %50 altına düşmeden kazan", "st": "clean", "n": 1, "gold": 100},
	{"id": "r1",   "name": "SEBAT",            "desc": "50 koşu oyna",                 "st": "runs",  "n": 50,    "gold": 150},
	{"id": "h3",   "name": "KALABALIK KADRO",  "desc": "5 kahramana sahip ol",         "st": "heroes", "n": 5,    "gem": 8, "max": true},
]

static func book(meta: Dictionary) -> Dictionary:
	if not (meta.get("ach") is Dictionary): meta["ach"] = {"s": {}, "d": {}}
	if not meta.ach.get("s"): meta.ach["s"] = {}
	if not meta.ach.get("d"): meta.ach["d"] = {}
	return meta.ach

static func on_run(g, win: bool) -> Array:
	var A := book(g.meta)
	var s: Dictionary = A.s
	var add := func(k: String, v): s[k] = JS.i(s.get(k)) + JS.i(v)
	var mx := func(k: String, v):
		if JS.i(v) > JS.i(s.get(k)): s[k] = JS.i(v)
	add.call("kills", g.kills - JS.i(g._achK))
	g._achK = g.kills
	add.call("runs", 1)
	add.call("ults", (g.ult.uses if g.ult else 0) - JS.i(g._achU))
	g._achU = g.ult.uses if g.ult else 0
	if win: add.call("wins", 1)
	if win and g.msn and g.msn.isBoss: add.call("boss", 1)
	mx.call("combo", JS.i(g._cbBest))
	mx.call("lvl", g.player.level if g.player else 0)
	if win and not (g.towerRun or g.sealRun or g.nmRun) and g._hpFloor >= 0.5: mx.call("clean", 1)
	mx.call("heroes", g.meta.charsOwned.size() if g.meta.get("charsOwned") else 0)
	return check(g)

static func check(g) -> Array:
	var A := book(g.meta)
	var out := []
	for a in ACH:
		if A.d.get(a.id) or JS.i(A.s.get(a.st)) < a.n: continue
		A.d[a.id] = 1
		if a.get("gold"): g.add_rubies(a.gold)
		if a.get("gem"): g.add_stones(a.gem)
		if a.get("title"): A["title"] = a.title
		out.append(a)
	return out

static func progress(meta: Dictionary, a: Dictionary) -> float:
	var s: Dictionary = book(meta).s
	return minf(1.0, JS.i(s.get(a.st)) / float(a.n))

static func count(meta: Dictionary) -> int:
	var d: Dictionary = book(meta).d
	var n := 0
	for a in ACH:
		if d.get(a.id): n += 1
	return n
