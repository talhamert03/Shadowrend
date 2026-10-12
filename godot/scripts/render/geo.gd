class_name Geo
## three.js r169 geometri üreticilerinin birebir karşılıkları (köşe sırası,
## UV ve normal düzeni aynı — setDrawRange ile kısmi çizim ve köşe rengi
## dizinleri web'deki gibi çalışsın diye). Hepsi ArrayMesh döndürür.

static func _mesh(pos: PackedVector3Array, nrm: PackedVector3Array, uv: PackedVector2Array, idx: PackedInt32Array, col := PackedColorArray()) -> ArrayMesh:
	var a := []
	a.resize(Mesh.ARRAY_MAX)
	a[Mesh.ARRAY_VERTEX] = pos
	a[Mesh.ARRAY_NORMAL] = nrm
	# three UV'si (0,0) altta; Godot (0,0) üstte → v çevrilir (kanvas dokusu
	# three'de flipY=true ile yüklendiği için görünüm aynı kalır)
	var u2 := PackedVector2Array()
	u2.resize(uv.size())
	for i in uv.size(): u2[i] = Vector2(uv[i].x, 1.0 - uv[i].y)
	a[Mesh.ARRAY_TEX_UV] = u2
	if col.size(): a[Mesh.ARRAY_COLOR] = col
	# three üçgen sarımı CCW (ön yüz); Godot ön yüzü CW kabul eder → ters çevir
	var id2 := PackedInt32Array()
	id2.resize(idx.size())
	for i in range(0, idx.size(), 3):
		id2[i] = idx[i]; id2[i + 1] = idx[i + 2]; id2[i + 2] = idx[i + 1]
	a[Mesh.ARRAY_INDEX] = id2
	var m := ArrayMesh.new()
	m.add_surface_from_arrays(Mesh.PRIMITIVE_TRIANGLES, a)
	return m

## PlaneGeometry(width, height, wSeg, hSeg) — XY düzleminde, +Z'ye bakar
static func plane(w: float, h: float, gx: int = 1, gy: int = 1, rot_x := 0.0) -> ArrayMesh:
	var pos := PackedVector3Array(); var nrm := PackedVector3Array(); var uv := PackedVector2Array(); var idx := PackedInt32Array()
	var sw := w / gx; var sh := h / gy
	var b := Basis(Vector3(1, 0, 0), rot_x)
	for iy in gy + 1:
		var y := iy * sh - h / 2
		for ix in gx + 1:
			var x := ix * sw - w / 2
			pos.append(b * Vector3(x, -y, 0)); nrm.append(b * Vector3(0, 0, 1))
			uv.append(Vector2(float(ix) / gx, 1 - float(iy) / gy))
	for iy in gy:
		for ix in gx:
			var a := ix + (gx + 1) * iy; var bb := ix + (gx + 1) * (iy + 1)
			var c := (ix + 1) + (gx + 1) * (iy + 1); var d := (ix + 1) + (gx + 1) * iy
			idx.append_array([a, bb, d, bb, c, d])
	return _mesh(pos, nrm, uv, idx)

## RingGeometry(inner, outer, thetaSeg, phiSeg, thetaStart, thetaLength)
## col: köşe başına renk (three sırası: önce yarıçap j, sonra açı i). segs:
## setDrawRange(0, segs*6) karşılığı — yalnız ilk segs dilim çizilir.
static func ring(ri: float, ro: float, ts: int = 32, ps: int = 1, t0: float = 0, tl: float = TAU, col := PackedColorArray(), segs := -1, rot_x := 0.0) -> ArrayMesh:
	var pos := PackedVector3Array(); var nrm := PackedVector3Array(); var uv := PackedVector2Array(); var idx := PackedInt32Array()
	var r := ri; var step := (ro - ri) / ps
	var b := Basis(Vector3(1, 0, 0), rot_x)
	for j in ps + 1:
		for i in ts + 1:
			var seg := t0 + float(i) / ts * tl
			var v := Vector3(r * cos(seg), r * sin(seg), 0)
			pos.append(b * v); nrm.append(b * Vector3(0, 0, 1))
			uv.append(Vector2((v.x / ro + 1) / 2, (v.y / ro + 1) / 2))
		r += step
	for j in ps:
		var ts_ := j * (ts + 1)
		for i in ts:
			var seg := i + ts_
			var a := seg; var bb := seg + ts + 1; var c := seg + ts + 2; var d := seg + 1
			idx.append_array([a, bb, d, bb, c, d])
	if segs >= 0 and segs * 6 < idx.size(): idx.resize(segs * 6)
	return _mesh(pos, nrm, uv, idx, col)

## CircleGeometry(radius, segments, thetaStart, thetaLength)
static func circle(rad: float, n: int = 32, t0 := 0.0, tl := TAU, rot_x := 0.0) -> ArrayMesh:
	var pos := PackedVector3Array([Vector3.ZERO]); var nrm := PackedVector3Array(); var uv := PackedVector2Array([Vector2(0.5, 0.5)]); var idx := PackedInt32Array()
	var b := Basis(Vector3(1, 0, 0), rot_x)
	nrm.append(b * Vector3(0, 0, 1))
	for s in n + 1:
		var seg := t0 + float(s) / n * tl
		var v := Vector3(rad * cos(seg), rad * sin(seg), 0)
		pos.append(b * v); nrm.append(b * Vector3(0, 0, 1))
		uv.append(Vector2((v.x / rad + 1) / 2, (v.y / rad + 1) / 2))
	for i in range(1, n + 1): idx.append_array([i, i + 1, 0])
	return _mesh(pos, nrm, uv, idx)

## SphereGeometry(radius, wSeg, hSeg, phiStart, phiLength, thetaStart, thetaLength)
static func sphere(rad: float, ws: int = 32, hs: int = 16, p0 := 0.0, pl := TAU, t0 := 0.0, tl := PI) -> ArrayMesh:
	var pos := PackedVector3Array(); var nrm := PackedVector3Array(); var uv := PackedVector2Array(); var idx := PackedInt32Array()
	var t_end := minf(t0 + tl, PI)
	var grid := []
	var index := 0
	for iy in hs + 1:
		var row := []
		var v := float(iy) / hs
		var uoff := 0.0
		if iy == 0 and t0 == 0: uoff = 0.5 / ws
		elif iy == hs and t_end == PI: uoff = -0.5 / ws
		for ix in ws + 1:
			var u := float(ix) / ws
			var p := Vector3(-rad * cos(p0 + u * pl) * sin(t0 + v * tl), rad * cos(t0 + v * tl), rad * sin(p0 + u * pl) * sin(t0 + v * tl))
			pos.append(p); nrm.append(p.normalized() if p.length() > 0 else Vector3.UP)
			uv.append(Vector2(u + uoff, 1 - v))
			row.append(index); index += 1
		grid.append(row)
	for iy in hs:
		for ix in ws:
			var a: int = grid[iy][ix + 1]; var bb: int = grid[iy][ix]; var c: int = grid[iy + 1][ix]; var d: int = grid[iy + 1][ix + 1]
			if iy != 0 or t0 > 0: idx.append_array([a, bb, d])
			if iy != hs - 1 or t_end < PI: idx.append_array([bb, c, d])
	return _mesh(pos, nrm, uv, idx)

## CylinderGeometry(rTop, rBot, height, radialSeg, heightSeg, openEnded, thetaStart, thetaLength)
static func cylinder(rt: float, rb: float, h: float, rs: int = 32, hseg: int = 1, open := false, t0 := 0.0, tl := TAU) -> ArrayMesh:
	var pos := PackedVector3Array(); var nrm := PackedVector3Array(); var uv := PackedVector2Array(); var idx := PackedInt32Array()
	var hh := h / 2
	var grid := []
	var index := 0
	var slope := (rb - rt) / h
	for y in hseg + 1:
		var row := []
		var v := float(y) / hseg
		var r := v * (rb - rt) + rt
		for x in rs + 1:
			var u := float(x) / rs
			var th := u * tl + t0
			var st := sin(th); var ct := cos(th)
			pos.append(Vector3(r * st, -v * h + hh, r * ct))
			nrm.append(Vector3(st, slope, ct).normalized())
			uv.append(Vector2(u, 1 - v))
			row.append(index); index += 1
		grid.append(row)
	for x in rs:
		for y in hseg:
			var a: int = grid[y][x]; var bb: int = grid[y + 1][x]; var c: int = grid[y + 1][x + 1]; var d: int = grid[y][x + 1]
			if rt > 0 or y != 0: idx.append_array([a, bb, d])
			if rb > 0 or y != hseg - 1: idx.append_array([bb, c, d])
	if not open:
		for top in [true, false]:
			var r := rt if top else rb
			if r <= 0: continue
			var sign := 1.0 if top else -1.0
			var cstart := index
			for x in range(1, rs + 1):
				pos.append(Vector3(0, hh * sign, 0)); nrm.append(Vector3(0, sign, 0)); uv.append(Vector2(0.5, 0.5)); index += 1
			var cend := index
			for x in rs + 1:
				var u := float(x) / rs
				var th := u * tl + t0
				var ct := cos(th); var st := sin(th)
				pos.append(Vector3(r * st, hh * sign, r * ct)); nrm.append(Vector3(0, sign, 0))
				uv.append(Vector2(ct * 0.5 + 0.5, st * 0.5 * sign + 0.5)); index += 1
			for x in rs:
				var c := cstart + x; var i := cend + x
				if top: idx.append_array([i, i + 1, c])
				else: idx.append_array([i + 1, i, c])
	return _mesh(pos, nrm, uv, idx)

static func cone(rad: float, h: float, rs: int = 32, hseg: int = 1, open := false) -> ArrayMesh:
	return cylinder(0, rad, h, rs, hseg, open)

## BoxGeometry(w, h, d) — yüz başına 4 köşe (sert normaller)
static func box(w: float, h: float, d: float) -> ArrayMesh:
	var pos := PackedVector3Array(); var nrm := PackedVector3Array(); var uv := PackedVector2Array(); var idx := PackedInt32Array()
	var faces := [
		["z", "y", "x", -1, -1, d, h, w], ["z", "y", "x", 1, -1, d, h, -w],
		["x", "z", "y", 1, 1, w, d, h], ["x", "z", "y", 1, -1, w, d, -h],
		["x", "y", "z", 1, -1, w, h, d], ["x", "y", "z", -1, -1, w, h, -d]]
	var n := 0
	for f in faces:
		var udir: float = f[3]; var vdir: float = f[4]
		var fw: float = f[5]; var fh: float = f[6]; var dep: float = f[7]
		for iy in 2:
			var y := iy * fh - fh / 2
			for ix in 2:
				var x := ix * fw - fw / 2
				var v := {f[0]: x * udir, f[1]: y * vdir, f[2]: dep / 2}
				pos.append(Vector3(v.x, v.y, v.z))
				var nv := {f[0]: 0.0, f[1]: 0.0, f[2]: 1.0 if dep > 0 else -1.0}
				nrm.append(Vector3(nv.x, nv.y, nv.z))
				uv.append(Vector2(ix, 1 - iy))
		idx.append_array([n, n + 2, n + 1, n + 2, n + 3, n + 1])
		n += 4
	return _mesh(pos, nrm, uv, idx)

## TorusGeometry(radius, tube, radialSeg, tubularSeg, arc) — XY düzleminde
static func torus(rad: float, tube: float, rseg: int = 12, tseg: int = 48, arc := TAU) -> ArrayMesh:
	var pos := PackedVector3Array(); var nrm := PackedVector3Array(); var uv := PackedVector2Array(); var idx := PackedInt32Array()
	for j in rseg + 1:
		for i in tseg + 1:
			var u := float(i) / tseg * arc
			var v := float(j) / rseg * TAU
			var p := Vector3((rad + tube * cos(v)) * cos(u), (rad + tube * cos(v)) * sin(u), tube * sin(v))
			pos.append(p)
			var c := Vector3(rad * cos(u), rad * sin(u), 0)
			nrm.append((p - c).normalized())
			uv.append(Vector2(float(i) / tseg, float(j) / rseg))
	for j in range(1, rseg + 1):
		for i in range(1, tseg + 1):
			var a := (tseg + 1) * j + i - 1; var b := (tseg + 1) * (j - 1) + i - 1
			var c := (tseg + 1) * (j - 1) + i; var d := (tseg + 1) * j + i
			idx.append_array([a, b, d, b, c, d])
	return _mesh(pos, nrm, uv, idx)

## CapsuleGeometry(radius, length, capSeg, radialSeg) — boy = length + 2r
static func capsule(rad: float, length: float, cap_seg: int = 4, rad_seg: int = 8) -> ArrayMesh:
	# three r169: LatheGeometry(path: yarım daire + düz + yarım daire)
	var pts := PackedVector2Array()
	var hl := length / 2
	for i in cap_seg + 1:
		var a := -PI / 2 + PI / 2 * float(i) / cap_seg
		pts.append(Vector2(rad * cos(a), -hl + rad * sin(a)))
	for i in cap_seg + 1:
		var a := PI / 2 * float(i) / cap_seg
		pts.append(Vector2(rad * cos(a), hl + rad * sin(a)))
	return lathe(pts, rad_seg)

## LatheGeometry(points, segments, phiStart, phiLength) — Y ekseni etrafında
static func lathe(pts: PackedVector2Array, segs: int = 12, p0 := 0.0, pl := TAU) -> ArrayMesh:
	var pos := PackedVector3Array(); var nrm := PackedVector3Array(); var uv := PackedVector2Array(); var idx := PackedInt32Array()
	# profil normalleri (three: komşu kenarların ortalaması)
	var pn := PackedVector2Array()
	pn.resize(pts.size())
	for j in pts.size():
		var a: Vector2 = pts[maxi(0, j - 1)]; var b: Vector2 = pts[mini(pts.size() - 1, j + 1)]
		var d := b - a
		pn[j] = Vector2(d.y, -d.x).normalized()
	for i in segs + 1:
		var phi := p0 + float(i) / segs * pl
		var s := sin(phi); var c := cos(phi)
		for j in pts.size():
			pos.append(Vector3(pts[j].x * s, pts[j].y, pts[j].x * c))
			nrm.append(Vector3(pn[j].x * s, pn[j].y, pn[j].x * c).normalized())
			uv.append(Vector2(float(i) / segs, float(j) / (pts.size() - 1)))
	for i in segs:
		for j in pts.size() - 1:
			var base := j + i * pts.size()
			var a := base; var b := base + pts.size(); var c := base + pts.size() + 1; var d := base + 1
			idx.append_array([a, b, d, c, d, b])
	return _mesh(pos, nrm, uv, idx)

## IcosahedronGeometry(radius, 0) — düz gölgeli 20 yüz
static func icosahedron(rad: float) -> ArrayMesh:
	var t := (1 + sqrt(5.0)) / 2
	var v := [Vector3(-1, t, 0), Vector3(1, t, 0), Vector3(-1, -t, 0), Vector3(1, -t, 0), Vector3(0, -1, t), Vector3(0, 1, t),
		Vector3(0, -1, -t), Vector3(0, 1, -t), Vector3(t, 0, -1), Vector3(t, 0, 1), Vector3(-t, 0, -1), Vector3(-t, 0, 1)]
	var f := [0, 11, 5, 0, 5, 1, 0, 1, 7, 0, 7, 10, 0, 10, 11, 1, 5, 9, 5, 11, 4, 11, 10, 2, 10, 7, 6, 7, 1, 8,
		3, 9, 4, 3, 4, 2, 3, 2, 6, 3, 6, 8, 3, 8, 9, 4, 9, 5, 2, 4, 11, 6, 2, 10, 8, 6, 7, 9, 8, 1]
	var pos := PackedVector3Array(); var nrm := PackedVector3Array(); var uv := PackedVector2Array(); var idx := PackedInt32Array()
	for i in range(0, f.size(), 3):
		var a: Vector3 = v[f[i]].normalized() * rad; var b: Vector3 = v[f[i + 1]].normalized() * rad; var c: Vector3 = v[f[i + 2]].normalized() * rad
		var n := (b - a).cross(c - a).normalized()
		for p in [a, b, c]:
			pos.append(p); nrm.append(n); uv.append(Vector2(0.5, 0.5))
		idx.append_array([i, i + 1, i + 2])
	return _mesh(pos, nrm, uv, idx)

## Birden çok ArrayMesh'i (tek yüzey) birleştirir — mergeGeometries karşılığı.
static func merge(list: Array, xforms: Array = []) -> ArrayMesh:
	var st := SurfaceTool.new()
	st.begin(Mesh.PRIMITIVE_TRIANGLES)
	for i in list.size():
		var t: Transform3D = xforms[i] if i < xforms.size() else Transform3D.IDENTITY
		st.append_from(list[i], 0, t)
	return st.commit()
