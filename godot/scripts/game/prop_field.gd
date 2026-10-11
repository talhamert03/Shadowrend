class_name PropField
extends RefCounted
## arenaProps.js — Harita içi engeller (çarpışmalı + kırılabilir), birebir.
## Engel listesi pişirilmiş yerleşimden (layout.json) gelir; görsel =
## çarpışma kuralı korunur. Paketli diziler (PackedFloat32Array) web'deki
## Float32Array'lerin karşılığıdır.

const MAX := 420
const BREAK_T := 0.30

var PROP_TYPES: Dictionary
var game
var n := 0
var x := PackedFloat32Array()
var y := PackedFloat32Array()
var hx := PackedFloat32Array()
var hz := PackedFloat32Array()
var hh := PackedFloat32Array()
var sx := PackedFloat32Array()
var sz := PackedFloat32Array()
var hp := PackedFloat32Array()
var mhp := PackedFloat32Array()
var rot := PackedFloat32Array()
var flash := PackedFloat32Array()
var brk := PackedFloat32Array()
var dead := PackedByteArray()
var solid := PackedByteArray()
var drop := PackedFloat32Array()
var kinds: Array = []
var byKind := {}
var stamp := 0
var dirty := false
var _anim := 0
var _hot := 0
var cs := 280.0
var gw := 1; var gh := 1; var gx0 := 0.0; var gy0 := 0.0
var buckets: Array = [[]]
var _arena = null
var _baseN := 0

func _init(g) -> void:
	game = g
	PROP_TYPES = D.RAW.get("arenaProps", {}).get("PROP_TYPES", {})
	for arr in [x, y, hx, hz, hh, sx, sz, hp, mhp, rot, flash, brk, drop]:
		arr.resize(MAX)
	dead.resize(MAX)
	solid.resize(MAX)
	kinds.resize(MAX)

func clear() -> void:
	n = 0; dirty = true; _anim = 0; _hot = 0
	buckets = [[]]; gw = 1; gh = 1
	_baseN = 0
	byKind = {}
	stamp += 1

func _rebuild(arena = null) -> void:
	var A = arena if arena else (_arena if _arena else {"x0": -2140.0, "y0": -2140.0, "w": 4280.0, "h": 4280.0})
	_arena = A
	gx0 = A.x0; gy0 = A.y0
	gw = maxi(1, int(ceil(A.w / cs)))
	gh = maxi(1, int(ceil(A.h / cs)))
	var nb := gw * gh
	buckets = []
	buckets.resize(nb)
	for i in nb: buckets[i] = []
	byKind = {}
	for i in n:
		var ix0 := _cx(x[i] - hx[i] - 40); var ix1 := _cx(x[i] + hx[i] + 40)
		var iy0 := _cy(y[i] - hz[i] - 40); var iy1 := _cy(y[i] + hz[i] + 40)
		for iy in range(iy0, iy1 + 1):
			for ix in range(ix0, ix1 + 1):
				buckets[iy * gw + ix].append(i)
		var k: String = kinds[i]
		if not byKind.has(k): byKind[k] = []
		byKind[k].append(i)
	stamp += 1
	dirty = true

func add_dynamic(kind: String, px: float, py: float, o = null) -> int:
	var T = PROP_TYPES.get(kind)
	if T == null or n >= MAX: return -1
	var k := n
	n += 1
	kinds[k] = kind
	x[k] = px; y[k] = py
	hx[k] = JS.num(o, "hx", T.hx); hz[k] = JS.num(o, "hz", T.hz)
	hh[k] = JS.num(o, "h", T.h)
	sx[k] = 1; sz[k] = 1
	var h0 := JS.num(o, "hp", T.hp)
	mhp[k] = h0; hp[k] = h0
	rot[k] = 0
	drop[k] = JS.num(T, "drop")
	flash[k] = 0; brk[k] = 0; dead[k] = 0; solid[k] = 1
	_rebuild()
	return k

func load(list: Array, arena) -> int:
	clear()
	var cnt := mini(MAX, list.size())
	for i in cnt:
		var p: Dictionary = list[i]
		var T = PROP_TYPES.get(p.kind)
		if T == null: continue
		var k := n
		n += 1
		kinds[k] = p.kind
		x[k] = p.x; y[k] = p.y
		hx[k] = JS.num(p, "hx", T.hx); hz[k] = JS.num(p, "hz", T.hz)
		hh[k] = JS.num(p, "h", T.h)
		sx[k] = JS.num(p, "sx", 1.0)
		sz[k] = JS.num(p, "sz", 1.0)
		mhp[k] = T.hp; hp[k] = T.hp
		rot[k] = JS.num(p, "rot")
		drop[k] = JS.num(T, "drop")
		flash[k] = 0; brk[k] = 0; dead[k] = 0
		solid[k] = 0 if JS.truthy(T.get("pass")) else 1
	_baseN = n
	_rebuild(arena if arena else {"x0": -2140.0, "y0": -2140.0, "w": 4280.0, "h": 4280.0})
	return n

func _cx(v: float) -> int:
	var i := int((v - gx0) / cs)
	return 0 if i < 0 else (gw - 1 if i >= gw else i)

func _cy(v: float) -> int:
	var i := int((v - gy0) / cs)
	return 0 if i < 0 else (gh - 1 if i >= gh else i)

## Daire (yarıçap r) vs eksene hizalı kutu — en küçük nüfuz eksenine it.
func resolve(ent, r: float) -> bool:
	if not n: return false
	var bx0 := _cx(ent.x - r); var bx1 := _cx(ent.x + r)
	var by0 := _cy(ent.y - r); var by1 := _cy(ent.y + r)
	var hit := false
	for iy in range(by0, by1 + 1):
		for ix in range(bx0, bx1 + 1):
			var b: Array = buckets[iy * gw + ix]
			for i in b:
				if not solid[i]: continue
				var nx: float = ent.x - x[i]
				var ny: float = ent.y - y[i]
				var ox: float = hx[i] + r - absf(nx)
				if ox <= 0: continue
				var oz: float = hz[i] + r - absf(ny)
				if oz <= 0: continue
				if ox < oz: ent.x = x[i] + (-1.0 if nx < 0 else 1.0) * (hx[i] + r)
				else: ent.y = y[i] + (-1.0 if ny < 0 else 1.0) * (hz[i] + r)
				hit = true
	return hit

func hit_scan(px: float, py: float, r: float) -> int:
	if not n: return -1
	var b: Array = buckets[_cy(py) * gw + _cx(px)]
	for i in b:
		if not solid[i]: continue
		if absf(px - x[i]) > hx[i] + r: continue
		if absf(py - y[i]) > hz[i] + r: continue
		return i
	return -1

func damage(i: int, dmg: float) -> bool:
	if i < 0 or i >= n or not solid[i]: return false
	if mhp[i] <= 0:
		flash[i] = 0.10; _hot += 1; dirty = true
		return false
	hp[i] -= dmg
	flash[i] = 0.12; _hot += 1; dirty = true
	if hp[i] > 0: return false
	_break(i)
	return true

func damage_area(px: float, py: float, r: float, dmg: float) -> int:
	if not n: return 0
	var bx0 := _cx(px - r); var bx1 := _cx(px + r)
	var by0 := _cy(py - r); var by1 := _cy(py + r)
	var broke := 0
	for iy in range(by0, by1 + 1):
		for ix in range(bx0, bx1 + 1):
			var b: Array = buckets[iy * gw + ix]
			for i in b:
				if not solid[i]: continue
				if absf(px - x[i]) > hx[i] + r: continue
				if absf(py - y[i]) > hz[i] + r: continue
				if damage(i, dmg): broke += 1
	return broke

func _break(i: int) -> void:
	solid[i] = 0
	brk[i] = BREAK_T
	_anim += 1
	dirty = true
	var g = game
	if g == null: return
	if g.objectives: g.objectives.on_prop_break(i)
	var px: float = x[i]
	var py: float = y[i]
	if g.in_view(px, py, 90):
		var T = PROP_TYPES.get(kinds[i])
		var dust := "#ffc98a" if (T and JS.truthy(T.get("lamp"))) else ("#8a6240" if (T and JS.truthy(T.get("wood"))) else "#b8b2a0")
		g.spawn_burst(px, py, dust, 10, 160, 3, 0.45, false)
		g.spawn_burst(px, py, "#4a463c", 7, 120, 4, 0.5, false)
		if g.renderer3d: g.renderer3d.spawn_hit(px, py, 0, 2, 0.7, 0.24, 0.2)
		g.audio.play("propbreak")
	if drop[i] > 0 and randf() < drop[i]:
		if randf() < 0.14 and g.player:
			g.spawn_heart(px, py, maxf(6.0, JS.round_js(g.player.maxHp * 0.08)))
		else:
			g.spawn_gem(px, py, 2 + int(randf() * 3))

func update(dt: float) -> void:
	if _anim > 0:
		for i in n:
			if brk[i] <= 0: continue
			brk[i] -= dt
			if brk[i] <= 0:
				brk[i] = 0; dead[i] = 1; _anim -= 1
		dirty = true
	if _hot > 0:
		var live := 0
		for i in n:
			if flash[i] <= 0: continue
			flash[i] -= dt
			if flash[i] < 0: flash[i] = 0
			else: live += 1
		_hot = live
		dirty = true

func blocked(px: float, py: float, r: float = 0.0) -> bool:
	return hit_scan(px, py, r) >= 0
