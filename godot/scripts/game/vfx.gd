class_name Vfx
extends RefCounted
## SAVAŞ IŞIK KATMANI — kahraman ve düşman saldırılarının "premium" parıltısı: kılıç izi yayları,
## isabet flaşı + enerji halkası + kıvılcım, mermi ışık kuyrukları, düşman mermisi tehlike ışığı,
## alan büyü çemberleri, kılıç dalgası hilalleri, yıldırım zinciri, yaralanma pençesi ve kart
## seçimi büyü çemberi. Dil: katmanlı ışık (beyaz sıcak çekirdek → renk → saydam).
##
## Çizimi Ultimate'ın ilkelleri ve dört tamponu yapar (aynı kare, aynı dört çizim çağrısı):
## render() yalnız üçgen ekler, Overlay2D sonunda ult.flush_all() ile hepsi tek seferde gider.

const MAXN := 72
const SQ := 0.62

enum { SLASH, HIT, RING, CAST, BOLT, HURT, DEATH }

## kılıçlı silahların iz rengi
const SWORD_COL := {
	"kilic": "#ffd88a", "pala": "#ff8a4a", "yemin": "#7fe8ff", "tackilic": "#c08aff",
	"kurek": "#8dffb8", "cekic": "#ffd23a",
}

class Fx:
	var on := false
	var k := 0
	var x := 0.0; var y := 0.0; var x2 := 0.0; var y2 := 0.0
	var t := 0.0; var life := 1.0
	var a0 := 0.0; var sw := 0.0; var r := 0.0; var w := 0.0
	var c := Color.WHITE
	var seed := 0.0

var game
var F: Array[Fx] = []
var _next := 0
var _hitN := 0
var _t := 0.0

func _init(g) -> void:
	game = g
	for i in MAXN: F.append(Fx.new())

func reset() -> void:
	for f in F: f.on = false

func _take(kind: int, life: float) -> Fx:
	# boş yuva; yoksa en eskisinin üstüne yazılır (halka tampon)
	var f: Fx = null
	for i in MAXN:
		var q: Fx = F[(_next + i) % MAXN]
		if not q.on:
			f = q
			_next = (_next + i + 1) % MAXN
			break
	if f == null:
		f = F[_next]
		_next = (_next + 1) % MAXN
	f.on = true; f.k = kind; f.t = 0.0; f.life = life; f.seed = randf() * 100.0
	return f

func _vis(x: float, y: float, m := 120.0) -> bool:
	return game.in_view(x, y, m)

# ── olaylar ──

## kılıç savuruşu: oyuncunun önünde yay (spin: tam tur)
func slash(x: float, y: float, dir: float, arc: float, rng: float, wid: String, spin := false, echo := false) -> void:
	if Settings.data.get("rm", false) and echo: return
	var f := _take(SLASH, 0.3 if spin else 0.24)
	f.x = x; f.y = y
	f.sw = TAU if spin else maxf(1.2, arc * 1.1)
	f.a0 = dir - f.sw * 0.5
	f.r = rng * 0.92
	f.w = 38.0 if spin else 32.0
	if echo: f.w *= 0.6
	f.c = Color(String(SWORD_COL.get(wid, "#e6f2ff")))
	f.x2 = 0.55 if echo else 1.0

## düşmana isabet (kare başına sınırlı)
func hit(x: float, y: float, ang: float, crit: bool, col := Color(1, 0.86, 0.6)) -> void:
	if _hitN >= (6 if Quality.is_mobile else 10) or not _vis(x, y, 40): return
	_hitN += 1
	var f := _take(HIT, 0.26 if crit else 0.2)
	f.x = x; f.y = y; f.a0 = ang
	f.r = 44.0 if crit else 26.0
	f.c = Color(1, 0.84, 0.36) if crit else col

func ring(x: float, y: float, r: float, col: Color, life := 0.4) -> void:
	if not _vis(x, y, r): return
	var f := _take(RING, life)
	f.x = x; f.y = y; f.r = r; f.c = col

## kart seçimi / büyü: kahramanın altında açılan rün çemberi + ışık sütunu
func cast(x: float, y: float, col: Color, r := 70.0) -> void:
	var f := _take(CAST, 0.85)
	f.x = x; f.y = y; f.r = r; f.c = col

func bolt(x1: float, y1: float, x2: float, y2: float, col := Color("#9fdcff")) -> void:
	if not _vis(x1, y1, 200) and not _vis(x2, y2, 200): return
	var f := _take(BOLT, 0.2)
	f.x = x1; f.y = y1; f.x2 = x2; f.y2 = y2; f.c = col

## oyuncu yaralandı: kaynağa bakan kızıl pençe izi
func hurt(x: float, y: float, ang: float) -> void:
	var f := _take(HURT, 0.28)
	f.x = x; f.y = y; f.a0 = ang; f.c = Color(1, 0.22, 0.25)

## kahraman düştü: beyaz flaş, kızıl şok dalgaları, yerde sönen kızıl rün çemberi, yükselen ruh
## (gerçek zamanla akar: ağır çekimden etkilenmez)
func death(x: float, y: float) -> void:
	var f := _take(DEATH, 2.2)
	f.x = x; f.y = y; f.c = Color(1, 0.18, 0.22)
	f.w = 1.0

func update(dt: float) -> void:
	_t += dt
	_hitN = 0
	# ölüm sekansı ağır çekimde: o efekt gerçek zamanla ilerler
	var rdt := dt
	if game._deathT >= 0.0 and game._dying > 0: rdt = 1.0 / maxf(30.0, Engine.get_frames_per_second())
	for f in F:
		if not f.on: continue
		f.t += rdt if f.k == DEATH else dt
		if f.t >= f.life: f.on = false

# ── çizim ──
func render(U: Ultimate) -> void:
	var g = game
	_draw_streams(U, g)
	for f in F:
		if not f.on: continue
		var u := f.t / f.life
		match f.k:
			SLASH: _draw_slash(U, f, u)
			HIT: _draw_hit(U, f, u)
			RING: U._gring(Vector2(f.x, f.y), f.r * (0.3 + 0.7 * (1.0 - pow(1.0 - u, 3.0))), 18.0 * (1.0 - u) + 4.0, f.c, 1.0 - u, SQ, 32, 1.5 * (1.0 - u))
			CAST: _draw_cast(U, f, u)
			BOLT: _draw_bolt(U, f, u)
			HURT: _draw_hurt(U, f, u)
			DEATH: _draw_death(U, f)

func _draw_slash(U: Ultimate, f: Fx, u: float) -> void:
	var p = game.player
	# yay kahramanla birlikte kayar (koşarken iz geride kopmasın)
	var c := Vector2(p.x, p.y) if p else Vector2(f.x, f.y)
	var grow := minf(1.0, u / 0.45)
	var e := 1.0 - pow(1.0 - grow, 2.0)
	var fade := 1.0 if u < 0.45 else 1.0 - (u - 0.45) / 0.55
	var a := fade * f.x2
	var sw := f.sw * e
	U._trail(c, f.r, f.a0, sw, f.w, f.c, a, SQ, 18)
	U._trail(c, f.r * 0.72, f.a0 + f.sw * 0.08, sw * 0.9, f.w * 0.45, f.c, a * 0.55, SQ, 12, false)
	if u < 0.5:
		var ha := f.a0 + sw
		U._glow(c + Vector2(cos(ha) * f.r, sin(ha) * f.r * SQ), 26.0, f.c, (1.0 - u * 2.0) * f.x2, SQ, U._T)

func _draw_hit(U: Ultimate, f: Fx, u: float) -> void:
	var c := Vector2(f.x, f.y - 10.0)
	var a := 1.0 - u
	if f.t < 0.06: U._glow(c, f.r * 0.9, Color.WHITE, (1.0 - f.t / 0.06) * 0.9, 1.0, U._T)
	U._glow(c, f.r * 1.3, f.c, 0.55 * a, SQ)
	U._gring(c, f.r * (0.3 + 0.8 * (1.0 - pow(1.0 - u, 3.0))), 8.0 * a + 2.0, f.c, a, SQ, 20)
	var n := 4 if f.r < 30.0 else 6
	for i in n:
		var an := f.a0 + (Ultimate._uhash(f.seed, i) - 0.5) * 1.6
		var dir := Vector2(cos(an), sin(an) * SQ).normalized()
		var d := f.r * (0.3 + 1.0 * u)
		U._streak(c + dir * d, dir, f.r * 0.5 * a + 4.0, 3.0 * a + 1.0, f.c, a)

func _draw_cast(U: Ultimate, f: Fx, u: float) -> void:
	var p = game.player
	var c := Vector2(p.x, p.y) if p else Vector2(f.x, f.y)
	var k := minf(1.0, u / 0.2)
	var a := 1.0 if u < 0.6 else 1.0 - (u - 0.6) / 0.4
	U._rune_circle(c, f.r * Ultimate._back(k) if k < 1.0 else f.r, f.c, _t * 2.0, a)
	# ışık sütunu (yerden yükselen)
	var h := 150.0 * minf(1.0, u / 0.25)
	if h > 4.0:
		U._glow(c - Vector2(0, h * 0.5), 26.0, f.c, 0.6 * a, h / 26.0 * 0.55, U._T)
		U._glow(c - Vector2(0, h * 0.45), 9.0, Color.WHITE, 0.8 * a, h / 9.0 * 0.45, U._T)
	if u < 0.4: U._gring(c, f.r * (0.4 + 2.0 * u / 0.4), 22.0 * (1.0 - u / 0.4) + 4.0, f.c, 1.0 - u / 0.4, SQ, 36, 2.0)
	for i in 6:
		var an := _t * 1.5 + i * TAU / 6
		var ph := fmod(u * 1.6 + i * 0.17, 1.0)
		var q := c + Vector2(cos(an) * f.r * 0.7, sin(an) * f.r * 0.7 * SQ - ph * 90.0)
		U._sparkle(U._T, q, 6.0 * (1.0 - ph) + 1.5, Color(1, 1, 1, a * (1.0 - ph)), an)

func _draw_bolt(U: Ultimate, f: Fx, u: float) -> void:
	var a := (1.0 - u) * (0.75 + 0.25 * sin(f.t * 80.0))
	var A := Vector2(f.x, f.y - 20.0)
	var B := Vector2(f.x2, f.y2 - 14.0)
	var d := B - A
	var L := d.length()
	if L < 4.0: return
	var nrm := Vector2(-d.y, d.x) / L
	var P := PackedVector2Array([A])
	var n := clampi(int(L / 34.0), 3, 9)
	for i in range(1, n):
		var v := float(i) / n
		P.append(A + d * v + nrm * (Ultimate._uhash(f.seed + floor(f.t * 30.0), i) - 0.5) * 34.0)
	P.append(B)
	U._thick(U._T, P, 16.0, U._ca(f.c, 0.3 * a))
	U._thick(U._T, P, 6.0, U._ca(f.c, 0.9 * a))
	U._thick(U._T, P, 2.2, Color(1, 1, 1, a))
	U._glow(B, 34.0, f.c, 0.8 * a, 1.0, U._T)

func _draw_hurt(U: Ultimate, f: Fx, u: float) -> void:
	var p = game.player
	var c := Vector2(p.x, p.y - 16.0) if p else Vector2(f.x, f.y)
	var a := 1.0 - u
	var dir := Vector2(cos(f.a0), sin(f.a0) * SQ).normalized()
	var nrm := Vector2(-dir.y, dir.x)
	var grow := minf(1.0, u / 0.35)
	for i in 3:
		var o := nrm * (i - 1) * 11.0
		var s := c + dir * 30.0 + o - nrm * 24.0
		var e := s + (nrm * 48.0 - dir * 20.0) * grow
		U._streak(e, (e - s).normalized(), (e - s).length(), 6.0 * a + 1.0, f.c, a)
	U._glow(c, 60.0, f.c, 0.4 * a, SQ)

## sürekli akışlar: mermi kuyrukları, düşman mermileri, alan çemberleri, kılıç dalgaları
func _draw_streams(U: Ultimate, g) -> void:
	var P = g.pools
	# oyuncu mermileri
	for b in P.pBullets.active:
		if not g.in_view(b.x, b.y, 40): continue
		var v := Vector2(b.vx, b.vy)
		var sp := v.length()
		if sp < 1.0: continue
		var dir := Vector2(v.x / sp, v.y / sp * SQ).normalized()
		var col := Color(b.color) if b.color is String and b.color != "" else Color(0.6, 0.95, 1)
		var L := clampf(sp * 0.07, 18.0, 56.0)
		var hd := Vector2(b.x, b.y - 14.0)
		U._streak(hd, dir, L, b.r * 2.6 + 4.0, col, 0.75)
		U._glow(hd, b.r * 3.2 + 8.0, col, 0.55, 1.0, U._T)
	# düşman mermileri: kızıl tehlike ışığı (okunur)
	for b in P.eBullets.active:
		if not g.in_view(b.x, b.y, 40): continue
		var v := Vector2(b.vx, b.vy)
		var sp := v.length()
		if sp < 1.0: continue
		var dir := Vector2(v.x / sp, v.y / sp * SQ).normalized()
		var col := Color(1, 0.3, 0.26)
		if b.kind == 1: col = Color(1, 0.86, 0.7)
		elif b.kind == 2 and b.pal != "" and R3Fx.FIRE_PAL.has(b.pal):
			var fp: Dictionary = R3Fx.FIRE_PAL[b.pal]
			col = Color(fp.tx, fp.ty, fp.tz)
		var hd := Vector2(b.x, b.y - 18.0)
		U._streak(hd, dir, 38.0, b.r * 2.4 + 5.0, col, 0.85)
		U._glow(hd, b.r * 3.0 + 12.0, col, 0.7, 1.0, U._T)
	# alanlar (kor çemberi / mavi alev): yerde dönen ışık çemberi
	for z in P.zones.active:
		if not g.in_view(z.x, z.y, z.r): continue
		var lf: float = clampf(z.life / maxf(0.01, z.max), 0.0, 1.0)
		var a := minf(1.0, lf * 3.0) * minf(1.0, (1.0 - lf) * 8.0 + 0.2)
		var col := Color(0.45, 0.8, 1) if z.blue else Color(1, 0.55, 0.18)
		var c := Vector2(z.x, z.y)
		U._gring(c, z.r, 10.0, col, 0.85 * a, SQ, 32, 1.4)
		U._glow(c, z.r * 1.05, col, 0.3 * a, SQ)
		for i in 6:
			var an: float = z.seed + _t * 1.8 + i * TAU / 6
			var ph := fmod(_t * 1.3 + i * 0.37, 1.0)
			var q := c + Vector2(cos(an) * z.r * 0.6, sin(an) * z.r * 0.6 * SQ - ph * 46.0)
			U._glow(q, 10.0 + 6.0 * (1.0 - ph), col, a * (1.0 - ph), 1.0, U._T)
	# kılıç dalgaları: ilerleyen parlak hilal
	var W = g.weapons
	if W:
		for w in W.waves:
			if w.life <= 0: continue
			var u: float = 1.0 - w.life / maxf(0.01, w.max)
			var a := minf(1.0, (1.0 - u) * 2.5) * minf(1.0, u * 8.0 + 0.3)
			var dir := Vector2(cos(w.dir), sin(w.dir))
			var c: Vector2 = Vector2(w.x, w.y) - dir * w.r * 0.6
			U._arc_glow(c, w.r * 1.1, w.dir - 0.95, 1.9, 16.0, Color(0.55, 0.92, 1), a, SQ)

func _draw_death(U: Ultimate, f: Fx) -> void:
	var c := Vector2(f.x, f.y)
	var t := f.t
	var red := f.c
	var dark := Color(0.45, 0.05, 0.4)
	# flaş
	if t < 0.14: U._glow(c - Vector2(0, 20), 260.0, Color.WHITE, (1.0 - t / 0.14) * 0.85, 0.8, U._T)
	# iki şok dalgası
	for i in 2:
		var tt := t - i * 0.12
		if tt <= 0.0 or tt > 0.75: continue
		var u := tt / 0.75
		var e := 1.0 - pow(1.0 - u, 3.0)
		U._gring(c, 30.0 + 300.0 * e, 60.0 * (1.0 - u) + 8.0, red if i == 0 else dark, 1.0 - u, SQ, 48, 3.0 * (1.0 - u))
	# yerde kızıl rün çemberi (yavaş belirir, döner, söner)
	var ra := minf(1.0, t / 0.35) * clampf((2.2 - t) / 0.6, 0.0, 1.0)
	U._ell(U._U, c, 96.0, 96.0 * SQ, Color(0.08, 0.0, 0.02, 0.45 * ra), 36)
	U._rune_circle(c, 90.0, red, -_t * 0.6, ra)
	# yükselen ruh: ışık topu + kuyruk + kıvılcımlar
	var st := t - 0.35
	if st > 0.0:
		var su := minf(1.0, st / 1.4)
		var h := 24.0 + 200.0 * (1.0 - pow(1.0 - su, 2.0))
		var sa := minf(1.0, st / 0.2) * (1.0 - maxf(0.0, (su - 0.7) / 0.3))
		var q := c - Vector2(sin(st * 3.0) * 10.0, h)
		U._streak(q, Vector2(0, -1), minf(h, 120.0), 20.0 * sa, Color(1, 0.75, 0.8), 0.6 * sa)
		U._glow(q, 46.0, red, 0.8 * sa, 1.0, U._T)
		U._glow(q, 16.0, Color.WHITE, sa, 1.0, U._T)
		for i in 5:
			var ph := fmod(st * 1.1 + i * 0.21, 1.0)
			var an := i * 1.3 + st * 2.0
			var p2 := c + Vector2(cos(an) * 40.0 * (1.0 - ph), -ph * h * 1.1)
			U._sparkle(U._T, p2, 6.0 * (1.0 - ph) + 1.0, Color(1, 0.6, 0.65, sa * (1.0 - ph)), an)
