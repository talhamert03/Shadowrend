class_name ScrGate
extends Scr
## ui.js playBattleIntro — v56 SAVAŞ KAPISI: iki demir kanat kapanır (0,72 sn),
## kor mühür kilitlenir (sarsıntı), yükleme mührün halkasında + çubukta dolar
## (aşama satırı, yüzde), açılışta kanatlar yarılır. Durumlar web'den yakalandı
## (gate_<durum>_<dünya rengi>); aralarında CSS geçişleriyle ilerlenir.

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

var L: Lyr
var wc := "b06a49"
var on_cover: Callable
var on_done: Callable
var _t := 0.0
var _covered := false
var _finished := false
var _doneAt := -1.0
var _ring: ColorRect
var _ringMat: ShaderMaterial
var _bar: Lyr.N
var _pct: Lyr.N
var _step: Lyr.N
var _lastPct := -1
var _lastStep := -1

func _init(game) -> void:
	super(game)
	name = "Gate"

func _st(state: String) -> String:
	var n := "gate_" + state + "_" + wc
	return n if FileAccess.file_exists(Lyr.BASE + n + ".json") else "gate_" + state + "_b06a49"

func play(info: Dictionary, cover: Callable, done: Callable) -> void:
	if L: L.queue_free()
	on_cover = cover
	on_done = done
	wc = String(info.get("wc", "#b06a49")).trim_prefix("#").to_lower()
	L = Lyr.make(_st("base"))
	add_child(L)
	L.stretch_h(Scr.dh_of(self))
	var side := str(info.get("side", ""))
	_txt("#loading-world", side if side != "" else ("DÜNYA " + str(info.get("worldNo", 1)) + " · " + str(info.get("world", ""))))
	_txt("#loading-mission", str(info.get("mission", "SAVAŞ")))
	var obj := str(info.get("obj", "")) if info.get("obj") != null else ""
	_txt("#loading-obj", obj)
	if obj == "": L.set_hidden(L.find("#loading-obj"), true)
	_txt("#loading-no", "✦" if side != "" else str(info.get("worldNo", 1)))
	_txt("#loading-tip", TIPS[randi() % TIPS.size()])
	# yıldızlar: stars < 0 → yok
	var stars := int(info.get("stars", -1))
	var sbox := L.find("#loading-stars")
	if sbox:
		var on_tex: Array = []
		var off_tex: Array = []
		for k in sbox.kids:
			if k.img is Sprite2D:
				var e := [(k.img as Sprite2D).texture, (k.img as Sprite2D).position, (k.img as Sprite2D).scale]
				if String(k.d.key).contains(".on"): on_tex = e
				else: off_tex = e
		for i in sbox.kids.size():
			var k: Lyr.N = sbox.kids[i]
			L.set_hidden(k, stars < 0)
			var e2: Array = on_tex if i < stars else off_tex
			if e2.size() and k.img is Sprite2D:
				var spr := k.img as Sprite2D
				spr.texture = e2[0]; spr.position = e2[1]; spr.scale = e2[2]
	# mühür dolum halkası (conic) — yakalanan iz görüntüsünün yerine gölgelendirici
	var rn := L.find("#loading-fill")
	if rn:
		if rn.img: rn.img.visible = false
		_ringMat = UIK.shader_mat("res://shaders/ui/conic_ring.gdshader")
		_ring = ColorRect.new()
		_ring.material = _ringMat
		_ring.mouse_filter = Control.MOUSE_FILTER_IGNORE
		var R := minf(rn.size.x, rn.size.y) * 0.5
		_ringMat.set_shader_parameter("r_out", R)
		_ringMat.set_shader_parameter("r_in", R - 10.5)
		_ringMat.set_shader_parameter("pad", 10.0)
		_ring.size = Vector2.ONE * (R + 10.0) * 2.0
		_ring.position = rn.size * 0.5 - _ring.size * 0.5
		rn.node.add_child(_ring)
	_bar = L.find("#loading-bar")
	if _bar: _bar.base_tf = []   # yakalamada satır içi scaleX(0) vardı; dolum betikten
	_pct = L.find("#loading-pct")
	_step = L.find("#loading-step")
	_t = 0.0
	_covered = false
	_finished = false
	_doneAt = -1.0
	_lastPct = -1
	_lastStep = -1
	_progress(0.0)
	visible = true
	L.to_state(_st("closing"))
	g.audio.play("gateclose")

func _txt(key: String, v: String) -> void:
	var n := L.find(key)
	if n: L.set_text(n, v)

func _progress(pc: float) -> void:
	if _ringMat: _ringMat.set_shader_parameter("p", pc)
	if _bar:
		_bar.extra = Transform2D(0, Vector2(maxf(0.0001, pc / 100.0), 1.0), 0, Vector2.ZERO)
		L.set_dyn(_bar)
	var pi := int(round(pc))
	if pi != _lastPct and _pct:
		_lastPct = pi
		L.set_text(_pct, str(pi) + "%")
	var si := 0 if pc < 34 else (1 if pc < 68 else (2 if pc < 99 else 3))
	if si != _lastStep and _step:
		_lastStep = si
		L.set_text(_step, STEPS[si])

func _process(dt: float) -> void:
	if not visible or L == null: return
	_t += dt
	if _doneAt >= 0:
		if _t - _doneAt >= 1.0:
			visible = false
			L.queue_free(); L = null
			if on_done.is_valid(): on_done.call()
		return
	if not _covered and _t >= COVER:
		_covered = true
		L.to_state(_st("locked"))
		Input.vibrate_handheld(15)
		if on_cover.is_valid(): on_cover.call()
	var k := clampf((_t - COVER + 0.12) / BAR, 0.0, 1.0)
	var e := k * 1.18 if k < 0.7 else 0.826 + (k - 0.7) * 0.58
	_progress(minf(1.0, e) * 100.0)
	if k >= 1.0 and not _finished:
		_finished = true
		_progress(100.0)
		L.to_state(_st("opening"))
		g.audio.play("start")
		_doneAt = _t
