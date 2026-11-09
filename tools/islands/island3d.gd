extends SceneTree
## Uçan ada önizlemesi v3: gerçek 3B diorama (prosedürel modelleme, cel ışık, gerçek gölge).
## 4 geçiş basar: beauty / normal / derinlik / ışıma → ink.py mürekkep çizgisini ve parlamayı ekler.
## Kullanım: godot --path godot -s ../tools/islands/island3d.gd -- out=<klasör> [px=3040]

var vp: SubViewport
var root3: Node3D
var rng := RandomNumberGenerator.new()
var emis: Array = []      # ışıyan düğümler (ışıma geçişi için)
var mats := {}
var W := 1
var CHEST := false
var MINI := -1      # >=0: bölüm adacığı (sade, az süslü) — varyant no
var TH := {}
const THEMES := {
	1: {"g0": "#5f9458", "g1": "#3f7350", "gs": "#2f5d40", "d0": "#4a3438", "d1": "#33242b", "r0": "#9a93b6", "r1": "#544d70", "cr": "#ff4f5e", "cl0": "#7d76a0", "cl1": "#5a5478", "amb": "#4a3f66", "rim": "#ff4a5a"},
	2: {"g0": "#6b6168", "g1": "#4d454f", "gs": "#3a3138", "d0": "#3a2a2a", "d1": "#241a1c", "r0": "#8a7c86", "r1": "#3f3540", "cr": "#ff8a3c", "cl0": "#8a6f78", "cl1": "#5e4a55", "amb": "#54404a", "rim": "#ff7a30"},
	3: {"g0": "#4f7f4a", "g1": "#35603f", "gs": "#274a35", "d0": "#3a3a2c", "d1": "#262a22", "r0": "#7f9a8e", "r1": "#3f5a55", "cr": "#59e3c8", "cl0": "#5f8a84", "cl1": "#456a66", "amb": "#3a5a58", "rim": "#40e0b0"},
	4: {"g0": "#8a7fae", "g1": "#6c6192", "gs": "#54497a", "d0": "#473a5c", "d1": "#2f2642", "r0": "#9a8cc4", "r1": "#4c3f78", "cr": "#b07cff", "cl0": "#7f70b0", "cl1": "#5a4c88", "amb": "#4c3f70", "rim": "#a060ff"},
	5: {"g0": "#d8d2c4", "g1": "#b9b2a6", "gs": "#948e88", "d0": "#6a6468", "d1": "#4a4650", "r0": "#b0aab8", "r1": "#5c5868", "cr": "#f4f0e6", "cl0": "#8a86a0", "cl1": "#625e7a", "amb": "#565068", "rim": "#b090ff"},
	6: {"g0": "#7fc35a", "g1": "#5aa24c", "gs": "#3f8044", "d0": "#5a4034", "d1": "#3c2a28", "r0": "#b09ab8", "r1": "#64506e", "cr": "#ff9ec4", "cl0": "#c8a0d0", "cl1": "#9a78a8", "amb": "#665474", "rim": "#ff8ab8"},
	7: {"g0": "#efe4c8", "g1": "#d8caa8", "gs": "#b8a888", "d0": "#8a7458", "d1": "#62503e", "r0": "#c4ac88", "r1": "#6c5844", "cr": "#ffe0a0", "cl0": "#c0a480", "cl1": "#8e765c", "amb": "#665848", "rim": "#ffc070"},
	8: {"g0": "#eef6ff", "g1": "#cfe2f6", "gs": "#a8c6e8", "d0": "#6a86b4", "d1": "#4a6492", "r0": "#8fb0e0", "r1": "#3f5a96", "cr": "#8cdcff", "cl0": "#8aa4d8", "cl1": "#6078b0", "amb": "#4a5c88", "rim": "#70c8ff"},
	9: {"g0": "#5c6238", "g1": "#454a2c", "gs": "#343822", "d0": "#40342a", "d1": "#2a221e", "r0": "#9a8c74", "r1": "#4c4238", "cr": "#ffe296", "cl0": "#8a7c64", "cl1": "#625848", "amb": "#504838", "rim": "#ffd070"},
	10: {"g0": "#5c6c94", "g1": "#46557a", "gs": "#344062", "d0": "#2e3650", "d1": "#1f2538", "r0": "#7f8fb8", "r1": "#36406a", "cr": "#ffc83c", "cl0": "#6a7aa8", "cl1": "#4a587f", "amb": "#3c4668", "rim": "#6a98ff"},
}
func T(k: String) -> Color: return Color(TH[k])

func sph(r: float, mat: Material, pos := Vector3.ZERO, par: Node3D = null, scl := Vector3.ONE, segs := 14) -> MeshInstance3D:
	var sp := SphereMesh.new(); sp.radius = r; sp.height = r * 2.0; sp.radial_segments = segs; sp.rings = int(segs / 2.0)
	return add(sp, mat, pos, Vector3.ZERO, par, scl)

func omni(col: Color, e: float, rng_: float, pos: Vector3, par: Node3D = null) -> void:
	var l := OmniLight3D.new(); l.light_color = col; l.light_energy = e; l.omni_range = rng_; l.position = pos
	(par if par else root3).add_child(l)

func grp(pos := Vector3.ZERO, yaw := 0.0, s := 1.0, par: Node3D = null) -> Node3D:
	var n := Node3D.new(); n.position = pos; n.rotation_degrees.y = yaw; n.scale = Vector3.ONE * s
	(par if par else root3).add_child(n)
	return n

func M(col: Color, rough := 1.0) -> StandardMaterial3D:
	var k := col.to_html()
	if mats.has(k): return mats[k]
	var m := StandardMaterial3D.new()
	m.albedo_color = col
	m.diffuse_mode = BaseMaterial3D.DIFFUSE_LAMBERT
	m.specular_mode = BaseMaterial3D.SPECULAR_DISABLED
	m.roughness = rough
	m.vertex_color_use_as_albedo = true
	m.cull_mode = BaseMaterial3D.CULL_DISABLED
	mats[k] = m
	return m

func E(col: Color) -> StandardMaterial3D:
	var m := StandardMaterial3D.new()
	m.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	m.albedo_color = col
	m.set_meta("emis", true)
	return m

func add(mesh: Mesh, mat: Material, pos := Vector3.ZERO, rot := Vector3.ZERO, par: Node3D = null, scl := Vector3.ONE) -> MeshInstance3D:
	var mi := MeshInstance3D.new()
	mi.mesh = mesh
	mi.material_override = mat
	mi.position = pos
	mi.rotation_degrees = rot
	mi.scale = scl
	(par if par else root3).add_child(mi)
	if mat.has_meta("emis"): emis.append(mi)
	return mi

func box(sz: Vector3, mat: Material, pos := Vector3.ZERO, rot := Vector3.ZERO, par: Node3D = null) -> MeshInstance3D:
	var b := BoxMesh.new(); b.size = sz
	return add(b, mat, pos, rot, par)

func cyl(r0: float, r1: float, h: float, seg: int, mat: Material, pos := Vector3.ZERO, rot := Vector3.ZERO, par: Node3D = null) -> MeshInstance3D:
	var c := CylinderMesh.new()
	c.bottom_radius = r0; c.top_radius = r1; c.height = h; c.radial_segments = seg; c.rings = 1
	return add(c, mat, pos, rot, par)

func seg(a: Vector3, b: Vector3, r0: float, r1: float, mat: Material, par: Node3D = null, sides := 6) -> void:
	var d := b - a
	var mi := cyl(r0, r1, d.length(), sides, mat, (a + b) * 0.5, Vector3.ZERO, par)
	var y := d.normalized()
	var x := y.cross(Vector3.FORWARD if absf(y.dot(Vector3.FORWARD)) < 0.95 else Vector3.RIGHT).normalized()
	mi.basis = Basis(x, y, x.cross(y))

func flat(tris: PackedVector3Array, cols: PackedColorArray, mat: Material, par: Node3D = null) -> MeshInstance3D:
	var st := SurfaceTool.new()
	st.begin(Mesh.PRIMITIVE_TRIANGLES)
	for i in tris.size():
		st.set_color(cols[i] if cols.size() > i else Color.WHITE)
		st.add_vertex(tris[i])
	st.generate_normals()
	return add(st.commit(), mat, Vector3.ZERO, Vector3.ZERO, par)

# ───────────── ada ─────────────
func edge_r(a: float) -> float:
	return 10.0 * (1.0 + 0.07 * sin(3.0 * a + 1.0) + 0.045 * sin(7.0 * a) + 0.025 * sin(13.0 * a + 2.0))

func edge(a: float, k := 1.0, y := 0.0) -> Vector3:
	var r := edge_r(a) * k
	return Vector3(cos(a) * r * 1.16, y, sin(a) * r * 0.94)

func build_island() -> void:
	var N := 40
	var T := PackedVector3Array(); var C := PackedColorArray()
	var g0 := T("g0"); var g1 := T("g1")
	# üst yüzey: iç halka + dış halka (hafif kubbe, yamalı renk)
	var ctr := Vector3(0, 0.3, 0)
	for i in N:
		var a0 := TAU * i / N; var a1 := TAU * (i + 1) / N
		var p0 := edge(a0, 0.6, 0.3); var p1 := edge(a1, 0.6, 0.3)
		var q0 := edge(a0); var q1 := edge(a1)
		var c := g0.lerp(g1, rng.randf())
		for v in [ctr, p1, p0]: T.append(v); C.append(g0.lerp(g1, 0.3))
		var c2 := g0.lerp(g1, rng.randf())
		for v in [p0, p1, q1]: T.append(v); C.append(c)
		for v in [p0, q1, q0]: T.append(v); C.append(c2)
	flat(T, C, M(Color.WHITE))
	# çimen saçağı (dişli etek) + toprak
	T = PackedVector3Array(); C = PackedColorArray()
	var gs := T("gs"); var dirt := T("d0"); var dirt2 := T("d1")
	for i in N:
		var a0 := TAU * i / N; var a1 := TAU * (i + 1) / N; var am := (a0 + a1) * 0.5
		var q0 := edge(a0); var q1 := edge(a1)
		var d0 := edge(a0, 1.015, -0.55); var d1 := edge(a1, 1.015, -0.55)
		var tip := edge(am, 1.0, -0.9 - rng.randf() * 0.7)
		for v in [q0, q1, d1, q0, d1, d0, d0, d1, tip]: T.append(v); C.append(gs.lerp(g1, 0.35 if T.size() % 9 < 6 else 0.0))
		var e0 := edge(a0, 0.97, -0.4); var e1 := edge(a1, 0.97, -0.4)
		var f0 := edge(a0, 0.93, -1.9); var f1 := edge(a1, 0.93, -1.9)
		var cc := dirt.lerp(dirt2, rng.randf())
		for v in [e0, e1, f1, e0, f1, f0]: T.append(v); C.append(cc)
	flat(T, C, M(Color.WHITE))
	# kaya: halkalar (düşük poligon, düz yüzey)
	var SEG := 12
	var ys := [-1.7, -3.6, -5.6, -8.0, -10.2, -12.4, -14.2]
	var ks := [0.93, 0.84, 0.68, 0.52, 0.37, 0.22, 0.09]
	var rings: Array = []
	for li in ys.size():
		var ring: Array = []
		var off := Vector3(0.5, 0, 0.2) * float(li) * 0.35
		var tw := float(li) * 0.13
		for s in SEG:
			var a := TAU * s / SEG + tw
			var p := edge(a, ks[li] * (0.9 + rng.randf() * 0.22), ys[li] + rng.randf_range(-0.35, 0.35)) + off
			ring.append(p)
		rings.append(ring)
	T = PackedVector3Array(); C = PackedColorArray()
	var r0 := T("r0"); var r1 := T("r1")
	for li in rings.size() - 1:
		for s in SEG:
			var a: Vector3 = rings[li][s]; var b: Vector3 = rings[li][(s + 1) % SEG]
			var c: Vector3 = rings[li + 1][s]; var d: Vector3 = rings[li + 1][(s + 1) % SEG]
			var t := float(li) / rings.size()
			var col := r0.lerp(r1, t + rng.randf() * 0.18)
			var col2 := r0.lerp(r1, t + rng.randf() * 0.18)
			for v in [a, b, d]: T.append(v); C.append(col)
			for v in [a, d, c]: T.append(v); C.append(col2)
	var tipv := Vector3(1.4, -17.2, 0.6)
	for s in SEG:
		for v in [rings[-1][s], rings[-1][(s + 1) % SEG], tipv]: T.append(v); C.append(r1)
	flat(T, C, M(Color.WHITE))
	# kızıl kristaller (kayadan fışkıran)
	for cdef in [[Vector3(-4.6, -5.2, 5.0), 2.6, Vector3(30, 0, 38)], [Vector3(-3.4, -5.8, 5.4), 1.6, Vector3(40, 0, 10)], [Vector3(3.2, -7.4, 4.6), 2.2, Vector3(35, 0, -30)],
			[Vector3(0.2, -10.6, 3.2), 1.8, Vector3(40, 0, 8)], [Vector3(6.6, -3.6, 4.6), 1.5, Vector3(30, 0, -44)], [Vector3(-7.4, -3.2, 3.6), 1.3, Vector3(20, 0, 50)]]:
		crystal(cdef[0], cdef[1], cdef[2])

func crystal(p: Vector3, h: float, rot: Vector3) -> void:
	var n := Node3D.new(); n.position = p; n.rotation_degrees = rot; root3.add_child(n)
	var m := E(T("cr"))
	cyl(h * 0.2, h * 0.26, h * 0.7, 5, m, Vector3(0, h * 0.35, 0), Vector3.ZERO, n)
	cyl(h * 0.26, 0.0, h * 0.4, 5, E(T("cr").lightened(0.3)), Vector3(0, h * 0.9, 0), Vector3.ZERO, n)
	var l := OmniLight3D.new(); l.light_color = T("cr"); l.light_energy = 1.3; l.omni_range = h * 2.4; l.position = Vector3(0, h * 0.6, 0.6)
	n.add_child(l)

func mini_rock(p: Vector3, s: float, with_tomb := false) -> void:
	var n := Node3D.new(); n.position = p; n.scale = Vector3.ONE * s; root3.add_child(n)
	var T := PackedVector3Array(); var C := PackedColorArray()
	var top: Array = []; var mid: Array = []
	for i in 7:
		var a := TAU * i / 7.0
		top.append(Vector3(cos(a) * (1.0 + rng.randf() * 0.3), 0, sin(a) * (0.9 + rng.randf() * 0.3)))
		mid.append(Vector3(cos(a + 0.3) * 0.6, -1.1 - rng.randf() * 0.5, sin(a + 0.3) * 0.6))
	var tip := Vector3(0.1, -2.6, 0)
	for i in 7:
		var j := (i + 1) % 7
		for v in [Vector3(0, 0.1, 0), top[j], top[i]]: T.append(v); C.append(self.T("g1"))
		var c := self.T("r0").lerp(self.T("r1"), rng.randf())
		for v in [top[i], top[j], mid[j], top[i], mid[j], mid[i]]: T.append(v); C.append(c)
		for v in [mid[i], mid[j], tip]: T.append(v); C.append(self.T("r1"))
	flat(T, C, M(Color.WHITE), n).cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	if with_tomb: tomb(Vector3(0, 0.05, 0), 0, 20, 1.0 / s * 0.9, n)

# ───────────── mezarlık nesneleri ─────────────
func tomb(p: Vector3, kind: int, yaw: float, s := 1.0, par: Node3D = null) -> void:
	var n := Node3D.new(); n.position = p; n.scale = Vector3.ONE * s
	n.rotation_degrees = Vector3(rng.randf_range(-7, 7), yaw, rng.randf_range(-8, 8))
	(par if par else root3).add_child(n)
	var st := M(Color("#8f8aa6").lerp(Color("#6f6a88"), rng.randf()))
	var dk := M(Color("#4f4966"))
	if kind == 0:      # yuvarlak başlı
		box(Vector3(0.95, 1.0, 0.26), st, Vector3(0, 0.5, 0), Vector3.ZERO, n)
		cyl(0.475, 0.475, 0.26, 14, st, Vector3(0, 1.0, 0), Vector3(90, 0, 0), n)
		box(Vector3(0.12, 0.5, 0.04), dk, Vector3(0, 0.95, 0.14), Vector3.ZERO, n)
		box(Vector3(0.36, 0.12, 0.04), dk, Vector3(0, 1.05, 0.14), Vector3.ZERO, n)
	elif kind == 1:    # haç
		box(Vector3(0.26, 1.9, 0.24), st, Vector3(0, 0.95, 0), Vector3.ZERO, n)
		box(Vector3(1.0, 0.26, 0.24), st, Vector3(0, 1.35, 0), Vector3.ZERO, n)
		box(Vector3(0.6, 0.22, 0.5), dk, Vector3(0, 0.11, 0), Vector3.ZERO, n)
	else:              # sivri (gotik)
		box(Vector3(0.9, 1.1, 0.26), st, Vector3(0, 0.55, 0), Vector3.ZERO, n)
		box(Vector3(0.64, 0.64, 0.26), st, Vector3(0, 1.1, 0), Vector3(0, 0, 45), n)
		box(Vector3(0.5, 0.08, 0.04), dk, Vector3(0, 0.7, 0.14), Vector3.ZERO, n)
		box(Vector3(0.4, 0.08, 0.04), dk, Vector3(0, 0.52, 0.14), Vector3.ZERO, n)
	# toprak yığını
	var sp := SphereMesh.new(); sp.radius = 0.5; sp.height = 1.0; sp.radial_segments = 8; sp.rings = 4
	add(sp, M(Color("#4a3438")), Vector3(0, 0.0, 0.75), Vector3.ZERO, n, Vector3(1.0, 0.28, 1.5))

func tree(p: Vector3, h: float, seed_: int, bark_col := Color("#44384f"), leaf = null) -> void:
	var r := RandomNumberGenerator.new(); r.seed = seed_
	var bark := M(bark_col)
	var ends: Array = []
	_branch(p, Vector3(r.randf_range(-0.1, 0.1), 1, r.randf_range(-0.1, 0.1)).normalized(), h * 0.42, h * 0.075, 0, r, bark, ends, 2 if leaf != null else 4)
	cyl(h * 0.13, h * 0.075, h * 0.1, 7, bark, p + Vector3(0, h * 0.04, 0))
	if leaf != null:
		var n := grp(); n.set_meta("soft", true)
		var lc: Color = leaf
		for e in ends:
			sph(h * r.randf_range(0.15, 0.22), M(lc.lerp(lc.darkened(0.25), r.randf())), e + Vector3(0, h * 0.05, 0), n, Vector3(1, 0.82, 1))

func _branch(o: Vector3, d: Vector3, l: float, rad: float, depth: int, r: RandomNumberGenerator, m: Material, ends: Array, maxd: int) -> void:
	var e := o + d * l
	seg(o, e, rad, rad * 0.68, m, null, 7 if depth == 0 else 5)
	if depth >= maxd:
		ends.append(e)
		return
	var n := 2 if depth > 0 else 3
	for i in n:
		var sw := Vector3(r.randf_range(-1, 1), r.randf_range(0.15, 0.9), r.randf_range(-1, 1)).normalized()
		var nd := (d * 0.55 + sw * 0.75).normalized()
		_branch(e - d * rad * 0.3, nd, l * r.randf_range(0.6, 0.78), rad * 0.62, depth + 1, r, m, ends, maxd)

func lantern(p: Vector3, h := 2.6, yaw := 0.0) -> void:
	var n := Node3D.new(); n.position = p; n.rotation_degrees.y = yaw; root3.add_child(n)
	var iron := M(Color("#3a3447"))
	cyl(0.09, 0.07, h, 6, iron, Vector3(0, h * 0.5, 0), Vector3.ZERO, n)
	cyl(0.2, 0.12, 0.2, 6, iron, Vector3(0, 0.1, 0), Vector3.ZERO, n)
	box(Vector3(0.7, 0.08, 0.08), iron, Vector3(0.3, h, 0), Vector3.ZERO, n)
	var lp := Vector3(0.58, h - 0.42, 0)
	box(Vector3(0.34, 0.44, 0.34), E(Color("#ffc65a")), lp, Vector3.ZERO, n)
	cyl(0.3, 0.0, 0.22, 4, iron, lp + Vector3(0, 0.33, 0), Vector3(0, 45, 0), n)
	box(Vector3(0.42, 0.06, 0.42), iron, lp + Vector3(0, -0.25, 0), Vector3.ZERO, n)
	var l := OmniLight3D.new(); l.light_color = Color("#ffb04a"); l.light_energy = 1.5; l.omni_range = 5.5; l.position = lp + Vector3(0, -0.1, 0.4)
	n.add_child(l)

func fence(a0: float, a1: float, cnt: int) -> void:
	var iron := M(Color("#3a3447"))
	var prev := Vector3.ZERO
	for i in cnt:
		var a := lerpf(a0, a1, float(i) / (cnt - 1))
		var p := edge(a, 0.9, 0.05)
		var lean := Vector3(rng.randf_range(-0.08, 0.08), 1, rng.randf_range(-0.08, 0.08)).normalized()
		seg(p, p + lean * 1.5, 0.06, 0.05, iron)
		cyl(0.11, 0.0, 0.3, 4, iron, p + lean * 1.62)
		if i > 0:
			seg(prev + Vector3(0, 0.5, 0), p + Vector3(0, 0.5, 0), 0.045, 0.045, iron, null, 4)
			seg(prev + Vector3(0, 1.2, 0), p + Vector3(0, 1.2, 0), 0.045, 0.045, iron, null, 4)
		prev = p

func chapel(p: Vector3, yaw: float) -> void:
	var n := Node3D.new(); n.position = p; n.rotation_degrees.y = yaw; root3.add_child(n)
	var wall := M(Color("#9a94b4")); var wall2 := M(Color("#7a7496")); var roof := M(Color("#5b3350")); var trim := M(Color("#6e6888"))
	var red := Color("#ff5a5f")
	var W := 4.2; var D := 5.6; var Hh := 3.4; var RH := 2.6
	box(Vector3(W + 0.5, 0.3, D + 0.5), trim, Vector3(0, 0.15, 0), Vector3.ZERO, n)        # kaide
	box(Vector3(W, Hh, D), wall, Vector3(0, Hh * 0.5 + 0.3, 0), Vector3.ZERO, n)
	# beşik çatı
	var T := PackedVector3Array(); var C := PackedColorArray()
	var y0 := Hh + 0.3; var ov := 0.35; var hw := W * 0.5 + ov; var hd := D * 0.5 + ov
	var A := Vector3(-hw, y0, hd); var B := Vector3(hw, y0, hd); var Cc := Vector3(0, y0 + RH, hd)
	var A2 := Vector3(-hw, y0, -hd); var B2 := Vector3(hw, y0, -hd); var C2 := Vector3(0, y0 + RH, -hd)
	for v in [A, Cc, C2, A, C2, A2, B, B2, C2, B, C2, Cc]: T.append(v); C.append(Color.WHITE)
	flat(T, C, roof, n)
	T = PackedVector3Array()
	for v in [A * Vector3(0.9, 1, 0.94), B * Vector3(0.9, 1, 0.94), Cc * Vector3(1, 0.97, 0.94), A2 * Vector3(0.9, 1, 0.94), C2 * Vector3(1, 0.97, 0.94), B2 * Vector3(0.9, 1, 0.94)]: T.append(v)
	flat(T, PackedColorArray(), wall2, n)
	# payandalar + yan pencereler
	for sx in [-1, 1]:
		for z in [-1.7, 0.2, 2.0]:
			box(Vector3(0.4, Hh * 0.8, 0.5), wall2, Vector3(sx * (W * 0.5 + 0.15), Hh * 0.4 + 0.3, z), Vector3.ZERO, n)
			box(Vector3(0.4, 0.5, 0.5), wall2, Vector3(sx * (W * 0.5 + 0.08), Hh * 0.8 + 0.42, z), Vector3(0, 0, sx * 28), n)
		for z in [-0.75, 1.1]:
			box(Vector3(0.1, 1.3, 0.5), E(red), Vector3(sx * (W * 0.5 + 0.01), 2.0, z), Vector3.ZERO, n)
			cyl(0.25, 0.25, 0.1, 10, E(red), Vector3(sx * (W * 0.5 + 0.01), 2.65, z), Vector3(0, 0, 90), n)
	# ön kule
	var tz := D * 0.5 + 0.5; var TW := 2.2; var TH := 6.2
	box(Vector3(TW, TH, TW), wall, Vector3(0, TH * 0.5 + 0.3, tz), Vector3.ZERO, n)
	box(Vector3(TW + 0.3, 0.25, TW + 0.3), trim, Vector3(0, TH + 0.3, tz), Vector3.ZERO, n)
	box(Vector3(TW + 0.2, 0.2, TW + 0.2), trim, Vector3(0, 4.3, tz), Vector3.ZERO, n)
	cyl(TW * 0.82, 0.0, 3.4, 4, roof, Vector3(0, TH + 0.4 + 1.7, tz), Vector3(0, 45, 0), n)
	box(Vector3(0.14, 1.1, 0.14), M(Color("#d8d2e6")), Vector3(0, TH + 4.2, tz), Vector3.ZERO, n)
	box(Vector3(0.6, 0.14, 0.14), M(Color("#d8d2e6")), Vector3(0, TH + 4.4, tz), Vector3.ZERO, n)
	var fz := tz + TW * 0.5 + 0.02
	# kapı (kemerli) + çerçeve
	box(Vector3(1.3, 1.5, 0.16), trim, Vector3(0, 1.05, fz), Vector3.ZERO, n)
	cyl(0.65, 0.65, 0.16, 16, trim, Vector3(0, 1.8, fz), Vector3(90, 0, 0), n)
	box(Vector3(0.96, 1.5, 0.2), E(Color("#ff6a62")), Vector3(0, 1.05, fz + 0.02), Vector3.ZERO, n)
	cyl(0.48, 0.48, 0.2, 16, E(Color("#ff8a70")), Vector3(0, 1.8, fz + 0.02), Vector3(90, 0, 0), n)
	# gül pencere + çan boşluğu
	cyl(0.62, 0.62, 0.12, 16, trim, Vector3(0, 3.4, fz), Vector3(90, 0, 0), n)
	cyl(0.46, 0.46, 0.16, 16, E(red), Vector3(0, 3.4, fz), Vector3(90, 0, 0), n)
	box(Vector3(0.08, 0.92, 0.2), trim, Vector3(0, 3.4, fz), Vector3.ZERO, n)
	box(Vector3(0.92, 0.08, 0.2), trim, Vector3(0, 3.4, fz), Vector3.ZERO, n)
	for sx in [-1, 1]:
		box(Vector3(0.36, 1.1, 0.1), M(Color("#1d1826")), Vector3(sx * 0.42, 5.3, fz), Vector3.ZERO, n)
		box(Vector3(0.1, 1.1, 0.36), M(Color("#1d1826")), Vector3(sx * (TW * 0.5 + 0.02), 5.3, tz + sx * 0.0 - 0.42), Vector3.ZERO, n)
		box(Vector3(0.1, 1.1, 0.36), M(Color("#1d1826")), Vector3(sx * (TW * 0.5 + 0.02), 5.3, tz + 0.42), Vector3.ZERO, n)
	# basamaklar
	box(Vector3(2.0, 0.2, 0.7), trim, Vector3(0, 0.1, fz + 0.4), Vector3.ZERO, n)
	box(Vector3(2.5, 0.12, 0.7), M(Color("#9a94b0")), Vector3(0, 0.02, fz + 0.9), Vector3.ZERO, n)
	var l := OmniLight3D.new(); l.light_color = Color("#ff4a55"); l.light_energy = 1.6; l.omni_range = 6.5; l.position = Vector3(0, 1.2, fz + 1.3)
	n.add_child(l)

func cloud(p: Vector3, s: float, col: Color) -> void:
	var n := Node3D.new(); n.position = p; n.scale = Vector3(s, s * 0.62, s * 0.8); root3.add_child(n)
	n.set_meta("soft", true)
	var m := M(col)
	for b in [[Vector3(0, 0, 0), 1.5], [Vector3(-1.7, -0.2, 0.1), 1.1], [Vector3(1.6, -0.1, 0), 1.2], [Vector3(-0.6, 0.7, -0.2), 1.1], [Vector3(0.8, 0.5, 0.2), 1.0], [Vector3(2.8, -0.4, 0.1), 0.8], [Vector3(-2.8, -0.5, 0), 0.75]]:
		var sp := SphereMesh.new(); sp.radius = b[1]; sp.height = b[1] * 2.0; sp.radial_segments = 20; sp.rings = 10
		add(sp, m, b[0], Vector3.ZERO, n)
	for c in n.get_children(): (c as MeshInstance3D).cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF

func build() -> void:
	rng.seed = 21 + W * 7
	if CHEST:
		chest()
		return
	if MINI >= 0:
		rng.seed = 100 + W * 13 + MINI * 31
		build_island()
		mini_decor(MINI)
		return
	build_island()
	call("w%d" % W)
	mini_rock(Vector3(-14.2, 1.2, 0.5), 1.5, W == 1)
	mini_rock(Vector3(14.0, -1.4, 1.5), 1.25)
	mini_rock(Vector3(9.6, -9.0, 3.0), 0.8)
	mini_rock(Vector3(-9.8, -9.8, 2.0), 0.7)
	cloud(Vector3(-8.6, -11.6, 4.6), 1.5, T("cl0"))
	cloud(Vector3(8.4, -13.0, 5.0), 1.7, T("cl0"))
	cloud(Vector3(-12.6, -5.6, -3.0), 1.2, T("cl1"))
	cloud(Vector3(12.2, -7.6, -4.0), 1.4, T("cl1"))

## KARANLIK SANDIK — tasarım önerisi: kömür karası gövde, dövme demir kuşaklar, dikenler,
## kafatası kilit; kapak aralığından, rünlerden ve çatlaklardan sızan renkli (yeşil/kızıl) ışık.
var CHEST_COL := Color("#3dff7a")
func chest() -> void:
	var gc := CHEST_COL
	var n := grp(Vector3(0, -5.6, 0), -30.0, 1.22)
	var wood := M(Color("#1c1622")); var wood2 := M(Color("#120e17")); var wood3 := M(Color("#241c2c"))
	var iron := M(Color("#565064"), 0.4); var iron2 := M(Color("#38323f"), 0.5); var bone := M(Color("#b8b0a4"), 0.7)
	var glow := E(gc); var glow2 := E(gc.lerp(Color.WHITE, 0.55))
	var HW := 6.6; var HD := 4.2; var BH := 5.4
	# zemindeki ışık havuzu
	var pl := cyl(9.5, 9.5, 0.05, 28, E(gc.darkened(0.82)), Vector3(0, -1.25, 0), Vector3.ZERO, n); pl.scale = Vector3(1.15, 1, 0.8); pl.set_meta("soft", true)
	var pl2 := cyl(6.0, 6.0, 0.06, 24, E(gc.darkened(0.62)), Vector3(0, -1.22, 0), Vector3.ZERO, n); pl2.scale = Vector3(1.15, 1, 0.8); pl2.set_meta("soft", true)
	# gövde: kalaslar
	box(Vector3(HW * 2, BH, HD * 2), wood2, Vector3(0, BH * 0.5, 0), Vector3.ZERO, n)
	for i in 3:
		box(Vector3(HW * 2 - 2.6, BH / 3.0 - 0.2, 0.3), [wood, wood3, wood][i], Vector3(0, BH / 6.0 + i * BH / 3.0, HD + 0.06), Vector3.ZERO, n)
		box(Vector3(0.3, BH / 3.0 - 0.2, HD * 2 - 1.6), [wood3, wood, wood3][i], Vector3(HW + 0.06, BH / 6.0 + i * BH / 3.0, 0), Vector3.ZERO, n)
	# kalas aralarından sızan ışık
	for i in 2:
		box(Vector3(HW * 2 - 2.8, 0.09, 0.12), glow, Vector3(0, BH / 3.0 * (i + 1), HD + 0.1), Vector3.ZERO, n)
		box(Vector3(0.12, 0.09, HD * 2 - 1.8), glow, Vector3(HW + 0.1, BH / 3.0 * (i + 1), 0), Vector3.ZERO, n)
	# rünler (ön yüz)
	for rx in [-2.9, 2.9]:
		var r := grp(Vector3(rx, BH * 0.5, HD + 0.24), 0.0, 1.0, n)
		box(Vector3(0.14, 1.5, 0.06), glow2, Vector3.ZERO, Vector3.ZERO, r)
		box(Vector3(0.9, 0.14, 0.06), glow2, Vector3(0, 0.25, 0), Vector3(0, 0, 38), r)
		box(Vector3(0.7, 0.14, 0.06), glow2, Vector3(0, -0.4, 0), Vector3(0, 0, -38), r)
	# taban + üst çerçeve (demir)
	box(Vector3(HW * 2 + 0.8, 0.8, HD * 2 + 0.8), iron2, Vector3(0, 0.4, 0), Vector3.ZERO, n)
	box(Vector3(HW * 2 + 0.6, 0.5, HD * 2 + 0.6), iron, Vector3(0, BH - 0.1, 0), Vector3.ZERO, n)
	# kapak aralığı ışığı (kalın, parlak)
	box(Vector3(HW * 2 + 0.3, 0.5, HD * 2 + 0.3), glow2, Vector3(0, BH + 0.38, 0), Vector3.ZERO, n)
	omni(gc, 3.4, 12.0, Vector3(0, BH + 0.5, HD + 2.4), n)
	omni(gc, 2.4, 10.0, Vector3(HW + 2.6, BH * 0.5, 0), n)
	omni(gc, 2.0, 10.0, Vector3(0, -0.6, HD + 3.0), n)
	# kapak: hafif aralık yarım fıçı
	var LY := BH + 0.75
	var lg := grp(Vector3(0, LY, -HD * 0.82), 0.0, 1.0, n); lg.rotation_degrees.x = -7.0
	var lc := Vector3(0, 0, HD * 0.82)
	cyl(HD, HD, HW * 2, 20, wood, lc, Vector3(0, 0, 90), lg).scale = Vector3(0.82, 1, 1)
	box(Vector3(HW * 2 + 0.5, 0.5, HD * 2 + 0.5), iron, lc + Vector3(0, 0.1, 0), Vector3.ZERO, lg)
	# kapak çatlakları (ışık damarları)
	for cx in [-2.6, 0.9, 3.0]:
		var c0 := lc + Vector3(cx, HD * 0.60, HD * 0.60)
		seg(c0, c0 + Vector3(0.5, 0.42, -0.62), 0.07, 0.05, glow2, lg, 4)
		seg(c0 + Vector3(0.5, 0.42, -0.62), c0 + Vector3(0.1, 0.72, -1.5), 0.05, 0.02, glow2, lg, 4)
	for sx in [-1.0, 1.0]:
		var x: float = sx * (HW - 1.5)
		box(Vector3(1.15, BH, HD * 2 + 0.5), iron, Vector3(x, BH * 0.5, 0), Vector3.ZERO, n)
		cyl(HD + 0.22, HD + 0.22, 1.15, 20, iron, lc + Vector3(x, 0, 0), Vector3(0, 0, 90), lg).scale = Vector3(0.84, 1, 1)
		for k in 3: cyl(0.3, 0.0, 0.6, 5, iron2, Vector3(x, 1.0 + k * 1.7, HD + 0.5), Vector3(90, 0, 0), n)
		for k in 3: cyl(0.3, 0.0, 0.7, 5, iron2, lc + Vector3(x, sin(deg_to_rad(35.0 + k * 35.0)) * (HD * 0.84 + 0.4), cos(deg_to_rad(35.0 + k * 35.0)) * (HD + 0.5)), Vector3(55.0 - k * 35.0, 0, 0), lg)
		var ex: float = sx * HW
		cyl(HD + 0.3, HD + 0.3, 0.5, 20, iron2, lc + Vector3(ex, 0, 0), Vector3(0, 0, 90), lg).scale = Vector3(0.84, 1, 1)
		for sz in [-1.0, 1.0]:
			box(Vector3(1.0, BH + 0.2, 1.0), iron2, Vector3(sx * (HW + 0.05), BH * 0.5, sz * (HD + 0.05)), Vector3.ZERO, n)
			cyl(0.34, 0.0, 1.5, 5, iron, Vector3(sx * (HW + 0.05), BH + 0.9, sz * (HD + 0.05)), Vector3(sz * 8, 0, -sx * 8), n)
			cyl(0.85, 0.5, 1.2, 6, iron2, Vector3(sx * (HW - 0.2), -0.5, sz * (HD - 0.2)), Vector3.ZERO, n)
	# zincir (ön yüzde çapraz)
	for i in 9:
		var t := i / 8.0
		var cp := Vector3(lerpf(-HW + 1.9, -1.5, t), lerpf(0.9, BH - 1.0, t) - sin(t * PI) * 0.5, HD + 0.42)
		var cp2 := Vector3(-cp.x, cp.y, cp.z)
		for q in [cp, cp2]: cyl(0.3, 0.3, 0.16, 8, iron, q, Vector3(90, 0, 90.0 if i % 2 else 0.0), n).scale = Vector3(1, 1, 0.62)
	# kilit: kafatası
	var lk := grp(Vector3(0, BH - 0.2, HD + 0.5), 0.0, 1.0, n); lk.set_meta("gid", true)
	cyl(1.75, 1.75, 0.4, 6, iron2, Vector3(0, -0.1, -0.1), Vector3(90, 0, 0), lk)
	sph(1.05, bone, Vector3(0, 0.25, 0.25), lk, Vector3(1.0, 0.95, 0.8), 12)
	box(Vector3(1.1, 0.7, 0.7), bone, Vector3(0, -0.6, 0.3), Vector3.ZERO, lk)
	for sx in [-1.0, 1.0]: sph(0.3, glow2, Vector3(sx * 0.4, 0.3, 0.95), lk, Vector3(1, 1.1, 0.6), 8)
	cyl(0.13, 0.0, 0.3, 3, M(Color("#120e17")), Vector3(0, -0.15, 1.05), Vector3.ZERO, lk)
	for i in 4: box(Vector3(0.18, 0.3, 0.1), M(Color("#8e867a")), Vector3(-0.36 + i * 0.24, -0.82, 0.68), Vector3.ZERO, lk)
	omni(gc, 1.6, 4.0, Vector3(0, 0.3, 2.0), lk)
	# kapak tepesi: boynuzlar + ruh taşı
	var top := grp(lc + Vector3(0, HD * 0.82, 0), 0.0, 1.0, lg)
	cyl(0.9, 1.2, 0.5, 8, iron2, Vector3(0, 0.1, 0), Vector3.ZERO, top)
	cyl(0.55, 0.0, 1.5, 6, glow2, Vector3(0, 1.2, 0), Vector3.ZERO, top)
	cyl(0.0, 0.55, 0.5, 6, glow2, Vector3(0, 0.25, 0), Vector3.ZERO, top)
	omni(gc, 1.8, 6.0, Vector3(0, 1.4, 1.0), top)
	for sx in [-1.0, 1.0]:
		seg(Vector3(sx * 0.8, 0.2, 0), Vector3(sx * 2.4, 0.7, 0), 0.42, 0.34, iron, top)
		seg(Vector3(sx * 2.4, 0.7, 0), Vector3(sx * 3.1, 2.2, 0), 0.34, 0.2, iron, top)
		seg(Vector3(sx * 3.1, 2.2, 0), Vector3(sx * 2.6, 3.9, 0), 0.2, 0.0, iron, top)
	# yükselen ruh alevleri (aralıktan)
	for f in [[-4.4, 1.5], [-1.6, 2.3], [1.9, 1.8], [4.6, 2.6]]:
		var fp := Vector3(f[0], BH + 0.9, HD + 0.9)
		var w0 := sph(0.34, glow, fp, n, Vector3(1, f[1] * 1.5, 1), 6); w0.set_meta("soft", true)
		var w1 := sph(0.2, glow2, fp + Vector3(0.25, f[1] * 0.9, 0), n, Vector3(1, 2.2, 1), 5); w1.set_meta("soft", true)
	for sp in [Vector3(-8.8, 9.5, 2), Vector3(8.4, 8.0, 3), Vector3(-6.2, 13.0, -1), Vector3(6.4, 12.5, 1), Vector3(9.6, 3.0, 4), Vector3(-9.8, 4.0, 4), Vector3(-3.0, 11.5, 3), Vector3(3.4, 10.0, 4)]:
		sph(0.17, glow2, sp, n, Vector3(1, 1.8, 1), 4)

## bölüm adacığı süsü: dünyaya özgü 2-3 küçük nesne, varyanta göre yer değiştirir
func mini_decor(k: int) -> void:
	var A: Vector3 = [Vector3(-4.6, 0.15, -1.6), Vector3(4.4, 0.15, -2.0), Vector3(-1.0, 0.15, -3.2)][k]
	var B: Vector3 = [Vector3(4.2, 0.2, 2.6), Vector3(-4.6, 0.2, 2.8), Vector3(4.6, 0.2, 1.6)][k]
	var C: Vector3 = [Vector3(-1.2, 0.2, 4.6), Vector3(0.8, 0.2, 4.8), Vector3(-5.2, 0.2, 3.4)][k]
	var cr := T("cr")
	match W:
		1:
			tree(A, 6.4, 5 + k)
			tomb(B, k % 3, -12.0, 1.4); tomb(B + Vector3(1.9, 0, 1.2), (k + 1) % 3, 8.0, 1.2)
			lantern(C, 2.9, 20.0)
		2:
			tree(A, 5.6, 11 + k)
			pool(B, 1.9, Color("#ff9a2a"), Color("#2c2226"))
			boulder(C, 1.3, Color("#5a4c54")); boulder(C + Vector3(1.8, 0, -0.6), 0.8, Color("#4a3e46"))
		3:
			tree(A, 6.2, 3 + k, Color("#4a3a30"), Color("#3f7a48"))
			pool(B, 2.0, Color("#6cf0a0"), Color("#2a3a2c"))
			for i in 3: mushroom(C + Vector3(i * 1.1 - 1.1, 0, (i % 2) * 0.8), 1.3 + 0.3 * i, Color("#d890ff"), true)
		4:
			obelisk(A, 4.6, Color("#6c5a98"), Color("#ff5a7a"), 20.0, -4.0)
			tomb(B, 1, -10.0, 1.4); tomb(B + Vector3(-1.8, 0, 1.4), 0, 12.0, 1.2)
			lantern(C, 2.7, 0.0)
		5:
			obelisk(A, 5.0, Color("#e8e4f0"), Color("#b090ff"), 10.0, 3.0)
			obelisk(B, 3.2, Color("#d8d4e4"), Color("#b090ff"), -20.0, -6.0)
			spike(C, 1.8, Color("#c8b0ff"), Vector3(8, 0, -10))
		6:
			tree(A, 6.0, 7 + k, Color("#6a4638"), Color("#ffa6cc"))
			boulder(B, 1.1, Color("#8fc86a")); boulder(B + Vector3(1.6, 0, 0.8), 0.8, Color("#74b458"))
			for i in 3: mushroom(C + Vector3(i * 1.0 - 1.0, 0, (i % 2) * 0.7), 1.1, Color("#ff6a8a"))
		7:
			spike(A, 4.6, Color("#f6f0e0"), Vector3(4, 0, -6), false); spike(A + Vector3(1.5, 0, 0.6), 2.8, Color("#e8dcc4"), Vector3(-6, 0, 10), false)
			skull(B, 1.25, -24.0, Color("#efe6cc"), Color("#ffb040"))
			boulder(C, 1.0, Color("#cdbb96"))
		8:
			spike(A, 4.8, Color("#8cdcff"), Vector3(5, 0, -8)); spike(A + Vector3(1.4, 0, 0.8), 3.0, Color("#b4ecff"), Vector3(-8, 0, 12))
			pool(B, 2.0, Color("#c4ecff"), Color("#9fd4f4"), false)
			boulder(C, 1.1, Color("#e4f0ff")); boulder(C + Vector3(1.5, 0, -0.5), 0.7, Color("#cfe2f6"))
		9:
			tree(A, 5.8, 13 + k)
			skull(B, 1.2, 18.0)
			for i in 3: mushroom(C + Vector3(i * 1.1 - 1.1, 0, (i % 2) * 0.8), 1.2, Color("#ffd070"), true)
		10:
			obelisk(A, 4.4, Color("#46557a"), Color("#ffc83c"), 15.0, 2.0)
			spike(B, 2.4, Color("#ffc83c"), Vector3(6, 0, -12)); spike(B + Vector3(1.2, 0, 0.8), 1.6, Color("#ffe08a"), Vector3(-8, 0, 14))
			boulder(C, 1.1, Color("#36406a"))

func path(pts: Array, col: Color) -> void:
	for sp in pts: cyl(0.62, 0.7, 0.16, 7, M(col), sp, Vector3(0, rng.randf() * 60.0, 0))

func boulder(p: Vector3, s: float, col: Color) -> void:
	var m := sph(s, M(col), p, null, Vector3(1.0, 0.7, 0.85), 6)
	m.rotation_degrees = Vector3(rng.randf() * 30, rng.randf() * 360, rng.randf() * 30)

func pool(p: Vector3, r: float, col: Color, rim_col: Color, light := true) -> void:
	cyl(r + 0.3, r + 0.2, 0.2, 14, M(rim_col), p + Vector3(0, -0.02, 0), Vector3.ZERO, null).scale = Vector3(1.25, 1, 0.9)
	cyl(r, r, 0.22, 14, E(col), p, Vector3.ZERO, null).scale = Vector3(1.25, 1, 0.9)
	if light: omni(col, 1.3, r * 3.0, p + Vector3(0, 1.0, 0))

func mushroom(p: Vector3, s: float, cap: Color, glow := false) -> void:
	cyl(0.12 * s, 0.09 * s, 0.6 * s, 6, M(Color("#d8d0c0")), p + Vector3(0, 0.3 * s, 0))
	sph(0.42 * s, (E(cap) if glow else M(cap)), p + Vector3(0, 0.62 * s, 0), null, Vector3(1, 0.55, 1), 8)

func skull(p: Vector3, s: float, yaw := 0.0, col := Color("#e8dcc0"), eye = null) -> void:
	var n := grp(p, yaw, s); n.set_meta("gid", true)
	var m := M(col); var dk: Material = (E(eye) if eye != null else M(Color("#241c22")))
	sph(1.0, m, Vector3(0, 0.9, 0), n, Vector3(1.0, 0.95, 1.05), 12)
	box(Vector3(1.2, 0.6, 1.0), m, Vector3(0, 0.15, 0.25), Vector3.ZERO, n)
	for sx in [-1, 1]: sph(0.27, dk, Vector3(sx * 0.4, 0.85, 0.86), n)
	cyl(0.14, 0.0, 0.3, 3, dk, Vector3(0, 0.5, 0.98), Vector3.ZERO, n)
	for i in 5: box(Vector3(0.16, 0.26, 0.1), M(col.darkened(0.12)), Vector3(-0.42 + i * 0.21, -0.02, 0.76), Vector3.ZERO, n)

func obelisk(p: Vector3, h: float, col: Color, rune = null, yaw := 0.0, tilt := 0.0) -> void:
	var n := grp(p, yaw); n.rotation_degrees.z = tilt
	cyl(h * 0.14, h * 0.09, h, 4, M(col), Vector3(0, h * 0.5, 0), Vector3(0, 45, 0), n)
	cyl(h * 0.09, 0.0, h * 0.16, 4, M(col.lightened(0.1)), Vector3(0, h * 1.08, 0), Vector3(0, 45, 0), n)
	if rune != null:
		for i in 3: box(Vector3(h * 0.07, h * 0.035, 0.05), E(rune), Vector3(0, h * (0.4 + i * 0.16), h * 0.085), Vector3.ZERO, n)

func spike(p: Vector3, h: float, col: Color, rot := Vector3.ZERO, glow := true, sides := 6) -> void:
	var n := grp(p); n.rotation_degrees = rot
	var m: Material = E(col) if glow else M(col)
	cyl(h * 0.17, h * 0.2, h * 0.75, sides, m, Vector3(0, h * 0.375, 0), Vector3.ZERO, n)
	cyl(h * 0.2, 0.0, h * 0.3, sides, (E(col.lightened(0.3)) if glow else M(col.lightened(0.25))), Vector3(0, h * 0.9, 0), Vector3.ZERO, n)

# ───────────── dünyalar ─────────────
func w1() -> void:
	chapel(Vector3(2.8, 0.15, -2.2), -24.0)
	path([Vector3(4.6, 0.2, 2.4), Vector3(4.2, 0.2, 3.7), Vector3(3.3, 0.18, 4.8), Vector3(2.0, 0.16, 5.6), Vector3(0.5, 0.14, 6.1), Vector3(-1.0, 0.12, 6.7)], Color("#9d98a8"))
	tree(Vector3(-7.2, 0.1, -2.6), 7.6, 5)
	tree(Vector3(8.6, 0.1, -3.4), 5.6, 9)
	fence(PI * 1.03, PI * 1.62, 15)
	fence(PI * 0.04, PI * 0.26, 6)
	for t in [[Vector3(-4.6, 0.2, -3.4), 2, -10], [Vector3(-2.6, 0.22, -4.4), 1, 6], [Vector3(-0.9, 0.22, -3.2), 0, -4],
			[Vector3(-8.2, 0.1, 1.2), 0, 18], [Vector3(-5.6, 0.18, 1.0), 1, 4], [Vector3(-3.2, 0.2, 0.2), 0, -8],
			[Vector3(-6.4, 0.12, 4.0), 2, 14], [Vector3(-3.6, 0.16, 4.6), 0, 2], [Vector3(-1.0, 0.18, 2.8), 2, -6],
			[Vector3(7.4, 0.14, 2.6), 1, -14], [Vector3(8.8, 0.1, 0.6), 0, -20], [Vector3(6.2, 0.14, 5.0), 0, -10], [Vector3(1.6, 0.14, 7.6), 2, 4]]:
		tomb(t[0], t[1], t[2], 1.12)
	lantern(Vector3(-4.6, 0.15, 2.6), 2.9, 20)
	lantern(Vector3(6.6, 0.12, 3.6), 2.6, 200)

func w2() -> void:      # KÜL ÇUKURLARI: yanardağ + lav
	var lava := Color("#ff7a24"); var ash := Color("#4a4048")
	var n := grp(Vector3(2.2, 0.2, -2.0))
	var T := PackedVector3Array(); var C := PackedColorArray()
	var segs := 11; var b: Array = []; var m: Array = []; var t: Array = []
	for i in segs:
		var a := TAU * i / segs
		b.append(Vector3(cos(a) * (5.2 + rng.randf() * 0.8), 0, sin(a) * (4.4 + rng.randf() * 0.6)))
		m.append(Vector3(cos(a + 0.2) * 2.9, 3.6 + rng.randf() * 0.5, sin(a + 0.2) * 2.6))
		t.append(Vector3(cos(a) * 1.5, 6.6 + rng.randf() * 0.7, sin(a) * 1.4))
	for i in segs:
		var j := (i + 1) % segs
		var c1 := ash.lerp(Color("#6a5c62"), rng.randf()); var c2 := ash.lerp(Color("#2e262c"), rng.randf())
		for v in [b[i], b[j], m[j], b[i], m[j], m[i]]: T.append(v); C.append(c1)
		for v in [m[i], m[j], t[j], m[i], t[j], t[i]]: T.append(v); C.append(c2)
	flat(T, C, M(Color.WHITE), n)
	cyl(1.5, 1.2, 0.3, 11, E(Color("#ffb040")), Vector3(0, 6.5, 0), Vector3.ZERO, n)
	omni(lava, 2.4, 7.0, Vector3(0, 8.0, 0), n)
	# lav dereleri
	for st in [[0.5, 1.0], [1.9, 0.8], [-0.9, 0.9]]:
		var a: float = st[0]
		var pts := [Vector3(cos(a) * 1.5, 6.5, sin(a) * 1.4), Vector3(cos(a + 0.1) * 3.0, 3.7, sin(a + 0.1) * 2.7), Vector3(cos(a + 0.05) * 5.6, 0.12, sin(a + 0.05) * 4.8), Vector3(cos(a) * 7.2, 0.12, sin(a) * 6.0)]
		for i in 3: seg(pts[i] * 1.03, pts[i + 1] * 1.03, 0.3 * st[1], 0.26 * st[1], E(lava), n, 5)
	# duman
	var sm := grp(Vector3(2.2, 7.6, -2.0)); sm.set_meta("soft", true)
	for d in [[Vector3(0, 0.4, 0), 0.9], [Vector3(0.5, 1.4, 0), 1.1], [Vector3(-0.1, 2.5, 0), 1.3]]:
		sph(d[1], M(Color("#5a5058")), d[0], sm).cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	pool(Vector3(-4.6, 0.3, 3.4), 1.5, Color("#ff9a30"), Color("#2e262c"))
	pool(Vector3(-7.0, 0.22, -0.6), 0.9, Color("#ff9a30"), Color("#2e262c"))
	pool(Vector3(6.4, 0.2, 4.6), 1.0, Color("#ff9a30"), Color("#2e262c"))
	tree(Vector3(-7.6, 0.1, -3.4), 6.4, 3, Color("#2c2428"))
	tree(Vector3(9.0, 0.1, 0.4), 5.0, 8, Color("#2c2428"))
	tree(Vector3(-1.6, 0.2, 6.4), 3.4, 12, Color("#2c2428"))
	for bd in [[Vector3(-2.4, 0.4, 2.0), 0.9], [Vector3(-8.6, 0.3, 2.6), 0.7], [Vector3(3.4, 0.3, 6.6), 0.8], [Vector3(8.2, 0.3, 3.2), 0.6], [Vector3(-4.4, 0.4, -4.4), 1.1], [Vector3(0.6, 0.3, 4.6), 0.5]]:
		boulder(bd[0], bd[1], Color("#3c3238").lerp(Color("#5c5056"), rng.randf()))
	for sp in [[Vector3(-6.0, 0.1, 5.2), 1.3, Vector3(8, 0, 12)], [Vector3(5.0, 0.1, 6.8), 1.0, Vector3(10, 0, -14)]]: spike(sp[0], sp[1], Color("#ff8a3c"), sp[2])

func w3() -> void:      # ZEHİR BATAKLIĞI: kazıklı kulübe + zehir gölü
	var tox := Color("#6cf0a0")
	pool(Vector3(-3.6, 0.3, 2.6), 2.6, tox, Color("#2a3a2c"))
	pool(Vector3(5.6, 0.22, 5.0), 1.2, tox, Color("#2a3a2c"))
	pool(Vector3(-7.6, 0.2, -1.6), 1.0, tox, Color("#2a3a2c"))
	for bb in [Vector3(-4.4, 0.5, 2.2), Vector3(-2.8, 0.5, 3.2), Vector3(-3.4, 0.5, 1.6)]: sph(0.28, E(Color("#c8ffd8")), bb)
	# kulübe
	var n := grp(Vector3(3.6, 0.2, -2.2), -22.0)
	var wood := M(Color("#5a4636")); var wood2 := M(Color("#3e3028")); var roof := M(Color("#3c5a3c"))
	for sx in [-1, 1]:
		for sz in [-1, 1]: seg(Vector3(sx * 1.9, 0, sz * 1.6), Vector3(sx * 1.6, 2.6, sz * 1.4), 0.16, 0.13, wood2, n)
	box(Vector3(4.0, 0.25, 3.5), wood2, Vector3(0, 2.6, 0), Vector3.ZERO, n)
	box(Vector3(3.4, 2.4, 2.9), wood, Vector3(0, 3.9, 0), Vector3.ZERO, n)
	for i in 4: box(Vector3(3.46, 0.06, 2.96), wood2, Vector3(0, 3.1 + i * 0.55, 0), Vector3.ZERO, n)
	var T := PackedVector3Array()
	var y0 := 5.1; var hw := 2.2; var hd := 1.9; var top := Vector3(0, 7.3, 0)
	var cs := [Vector3(-hw, y0, hd), Vector3(hw, y0, hd), Vector3(hw, y0, -hd), Vector3(-hw, y0, -hd)]
	for i in 4:
		for v in [cs[i], cs[(i + 1) % 4], top + Vector3(0.3 if i % 2 == 0 else -0.3, 0, 0)]: T.append(v)
	flat(T, PackedColorArray(), roof, n)
	box(Vector3(0.8, 1.5, 0.1), M(Color("#2a2020")), Vector3(-0.7, 3.5, 1.46), Vector3.ZERO, n)
	box(Vector3(0.8, 0.8, 0.12), E(Color("#b8ff7a")), Vector3(0.8, 4.1, 1.46), Vector3.ZERO, n)
	box(Vector3(0.9, 0.08, 0.16), wood2, Vector3(0.8, 4.1, 1.47), Vector3.ZERO, n)
	box(Vector3(0.08, 0.9, 0.16), wood2, Vector3(0.8, 4.1, 1.47), Vector3.ZERO, n)
	omni(Color("#a8ff70"), 1.6, 5.0, Vector3(0.8, 4.0, 2.4), n)
	for i in 5: box(Vector3(1.0, 0.1, 0.36), wood2, Vector3(-0.7, 2.5 - i * 0.5, 1.9 + i * 0.42), Vector3.ZERO, n)   # merdiven
	cyl(0.2, 0.2, 1.2, 6, wood2, Vector3(1.0, 7.0, -0.4), Vector3.ZERO, n)
	# kazan
	var k := grp(Vector3(-0.6, 0.3, 5.6)); k.set_meta("gid", true)
	sph(0.9, M(Color("#2e2a36")), Vector3(0, 0.75, 0), k, Vector3(1, 0.85, 1))
	cyl(0.75, 0.75, 0.12, 12, E(tox), Vector3(0, 1.3, 0), Vector3.ZERO, k)
	cyl(0.9, 0.8, 0.14, 12, M(Color("#3c3846")), Vector3(0, 1.26, 0), Vector3.ZERO, k)
	omni(tox, 1.2, 3.5, Vector3(-0.6, 2.2, 5.6))
	tree(Vector3(-7.4, 0.1, -3.6), 6.6, 4, Color("#3a3430"), Color("#3f6a44"))
	tree(Vector3(8.8, 0.1, 1.4), 4.8, 11, Color("#3a3430"), Color("#4a7a48"))
	for mu in [[Vector3(-6.6, 0.2, 4.4), 1.3], [Vector3(-5.8, 0.2, 5.2), 0.8], [Vector3(1.6, 0.25, 3.0), 1.0], [Vector3(7.4, 0.15, 3.2), 1.1], [Vector3(2.4, 0.2, 7.2), 0.8], [Vector3(-8.8, 0.1, 1.2), 0.9]]:
		mushroom(mu[0], mu[1], Color("#c070ff"), true)
	for i in 16:      # sazlar
		var a := rng.randf() * TAU; var p := edge(a, rng.randf_range(0.62, 0.9), 0.1)
		seg(p, p + Vector3(rng.randf_range(-0.15, 0.15), rng.randf_range(0.9, 1.6), 0), 0.05, 0.03, M(Color("#6a8a4a")), null, 4)
		cyl(0.09, 0.09, 0.4, 5, M(Color("#5a4030")), p + Vector3(0, 1.3, 0))

func cathedral(p: Vector3, yaw: float) -> void:
	var n := grp(p, yaw)
	var wall := M(Color("#8f86b0")); var wall2 := M(Color("#6f6692")); var roof := M(Color("#4a2f5c")); var trim := M(Color("#5c547c"))
	var red := Color("#ff4a5c")
	var Wd := 5.0; var D := 6.4; var Hh := 4.6; var RH := 3.0
	box(Vector3(Wd + 3.6, 0.35, D + 2.4), trim, Vector3(0, 0.17, 0.6), Vector3.ZERO, n)
	box(Vector3(Wd, Hh, D), wall, Vector3(0, Hh * 0.5 + 0.3, 0), Vector3.ZERO, n)
	var T := PackedVector3Array()
	var y0 := Hh + 0.3; var hw := Wd * 0.5 + 0.3; var hd := D * 0.5 + 0.2
	var A := Vector3(-hw, y0, hd); var B := Vector3(hw, y0, hd); var Cc := Vector3(0, y0 + RH, hd)
	var A2 := Vector3(-hw, y0, -hd); var B2 := Vector3(hw, y0, -hd); var C2 := Vector3(0, y0 + RH, -hd)
	for v in [A, Cc, C2, A, C2, A2, B, B2, C2, B, C2, Cc]: T.append(v)
	flat(T, PackedColorArray(), roof, n)
	T = PackedVector3Array()
	for v in [A * Vector3(0.9, 1, 0.97), B * Vector3(0.9, 1, 0.97), Cc * Vector3(1, 0.97, 0.97)]: T.append(v)
	flat(T, PackedColorArray(), wall2, n)
	var fz := D * 0.5 + 0.03
	for sx in [-1, 1]:      # ikiz kuleler
		var tx: float = sx * (Wd * 0.5 + 0.7)
		box(Vector3(1.7, 7.6, 1.7), wall, Vector3(tx, 4.1, D * 0.5 - 0.5), Vector3.ZERO, n)
		box(Vector3(1.95, 0.22, 1.95), trim, Vector3(tx, 7.9, D * 0.5 - 0.5), Vector3.ZERO, n)
		box(Vector3(1.9, 0.2, 1.9), trim, Vector3(tx, 5.0, D * 0.5 - 0.5), Vector3.ZERO, n)
		cyl(1.3, 0.0, 3.6, 4, roof, Vector3(tx, 9.8, D * 0.5 - 0.5), Vector3(0, 45, 0), n)
		box(Vector3(0.4, 1.3, 0.1), E(red), Vector3(tx, 6.3, D * 0.5 + 0.37), Vector3.ZERO, n)
		cyl(0.2, 0.2, 0.1, 10, E(red), Vector3(tx, 6.95, D * 0.5 + 0.37), Vector3(90, 0, 0), n)
		box(Vector3(0.4, 1.5, 0.1), E(red), Vector3(tx, 2.4, D * 0.5 + 0.37), Vector3.ZERO, n)
		for z in [-2.0, -0.2]:
			box(Vector3(0.12, 1.8, 0.6), E(red), Vector3(sx * (Wd * 0.5 + 0.01), 2.6, z), Vector3.ZERO, n)
			box(Vector3(0.45, Hh * 0.85, 0.5), wall2, Vector3(sx * (Wd * 0.5 + 0.2), Hh * 0.42 + 0.3, z - 0.9), Vector3.ZERO, n)
	# gül pencere + kapı + halı
	cyl(1.15, 1.15, 0.14, 20, trim, Vector3(0, 4.3, fz), Vector3(90, 0, 0), n)
	cyl(0.92, 0.92, 0.18, 20, E(red), Vector3(0, 4.3, fz), Vector3(90, 0, 0), n)
	for r in 4: box(Vector3(1.85, 0.09, 0.22), trim, Vector3(0, 4.3, fz), Vector3(0, 0, r * 45.0), n)
	cyl(0.3, 0.3, 0.26, 10, trim, Vector3(0, 4.3, fz), Vector3(90, 0, 0), n)
	box(Vector3(1.7, 1.9, 0.16), trim, Vector3(0, 1.25, fz), Vector3.ZERO, n)
	cyl(0.85, 0.85, 0.16, 16, trim, Vector3(0, 2.2, fz), Vector3(90, 0, 0), n)
	box(Vector3(1.3, 1.9, 0.2), M(Color("#3a1420")), Vector3(0, 1.25, fz + 0.02), Vector3.ZERO, n)
	cyl(0.65, 0.65, 0.2, 16, M(Color("#3a1420")), Vector3(0, 2.2, fz + 0.02), Vector3(90, 0, 0), n)
	box(Vector3(0.12, 1.2, 0.12), M(Color("#d8d2e6")), Vector3(0, y0 + RH + 0.6, hd - 0.2), Vector3.ZERO, n)
	box(Vector3(0.6, 0.12, 0.12), M(Color("#d8d2e6")), Vector3(0, y0 + RH + 0.8, hd - 0.2), Vector3.ZERO, n)
	for i in 3: box(Vector3(3.0 + i * 0.6, 0.18, 0.6), trim, Vector3(0, 0.42 - i * 0.14, fz + 0.5 + i * 0.55), Vector3.ZERO, n)
	box(Vector3(1.5, 0.06, 5.2), M(Color("#a01c34")), Vector3(0, 0.2, fz + 3.6), Vector3.ZERO, n)
	omni(red, 2.0, 7.0, Vector3(0, 3.6, fz + 1.8), n)

func w4() -> void:      # KAN KATEDRALİ
	cathedral(Vector3(0.6, 0.15, -2.6), -14.0)
	for i in 6:      # sütunlar + mumlar (halı boyunca)
		var sx := -1 if i % 2 == 0 else 1
		var z := 2.6 + (i / 2) * 1.9
		var p := Vector3(1.3 + sx * 2.3 + z * 0.25, 0.2, z)
		cyl(0.3, 0.26, 2.0 - (i / 2) * 0.35, 8, M(Color("#7a7198")), p + Vector3(0, 1.0 - (i / 2) * 0.17, 0))
		var top := p + Vector3(0, 2.1 - (i / 2) * 0.35, 0)
		cyl(0.4, 0.3, 0.16, 8, M(Color("#5c547c")), top)
		cyl(0.09, 0.09, 0.4, 6, M(Color("#efe6d0")), top + Vector3(0, 0.25, 0))
		sph(0.13, E(Color("#ffd070")), top + Vector3(0, 0.55, 0))
		omni(Color("#ffb050"), 0.7, 3.0, top + Vector3(0, 0.6, 0.2))
	for t in [[Vector3(-6.6, 0.15, 1.4), 2, 14], [Vector3(-8.2, 0.1, -0.8), 1, 20], [Vector3(-5.4, 0.15, 4.6), 0, 8], [Vector3(7.8, 0.12, 0.8), 1, -18], [Vector3(8.4, 0.1, 3.4), 2, -12]]:
		tomb(t[0], t[1], t[2], 1.1)
	fence(PI * 1.05, PI * 1.5, 11)
	tree(Vector3(-8.4, 0.1, -4.0), 6.0, 6, Color("#3a2c4a"))
	for sp in [[Vector3(-7.2, 0.1, 3.6), 1.4, Vector3(6, 0, 10)], [Vector3(8.8, 0.1, -2.0), 1.6, Vector3(4, 0, -8)]]: spike(sp[0], sp[1], Color("#b07cff"), sp[2])

func w5() -> void:      # HİÇLİK TAHTI
	var st := Color("#cfc8ba"); var dk := Color("#8a8480"); var void_c := Color("#7a4cff")
	var n := grp(Vector3(0.6, 0.2, -2.0), -8.0)
	for i in 4: box(Vector3(9.0 - i * 1.7, 0.45, 7.0 - i * 1.3), M(st.darkened(0.06 * (3 - i))), Vector3(0, 0.22 + i * 0.45, -i * 0.35), Vector3.ZERO, n)
	var ty := 1.8
	box(Vector3(1.9, 0.5, 1.6), M(dk), Vector3(0, ty + 0.25, -1.2), Vector3.ZERO, n)       # taht
	box(Vector3(1.9, 3.6, 0.4), M(dk), Vector3(0, ty + 1.8, -1.9), Vector3.ZERO, n)
	box(Vector3(1.3, 1.3, 0.4), M(dk), Vector3(0, ty + 3.6, -1.9), Vector3(0, 0, 45), n)
	for sx in [-1, 1]:
		box(Vector3(0.35, 1.0, 1.5), M(st), Vector3(sx * 0.95, ty + 0.75, -1.2), Vector3.ZERO, n)
		cyl(0.2, 0.0, 0.9, 4, M(st), Vector3(sx * 0.95, ty + 4.0, -1.9), Vector3.ZERO, n)
	box(Vector3(1.2, 0.12, 1.3), M(Color("#4a2c8a")), Vector3(0, ty + 0.56, -1.1), Vector3.ZERO, n)
	box(Vector3(1.2, 2.0, 0.1), M(Color("#4a2c8a")), Vector3(0, ty + 1.6, -1.66), Vector3.ZERO, n)
	# arkada sivri hiçlik kapısı
	var gz := -3.4; var gy := ty
	var pts: Array = []
	for i in 9:
		var t := i / 8.0
		pts.append(Vector3(lerpf(3.0, 0.0, pow(t, 1.5)), gy + t * 8.6, gz))
	for i in 8:
		for sx in [-1, 1]:
			seg(pts[i] * Vector3(sx, 1, 1), pts[i + 1] * Vector3(sx, 1, 1), 0.42 - i * 0.025, 0.4 - i * 0.025, M(Color("#3c3158")), n, 6)
	var T := PackedVector3Array()
	for i in 8:
		var a: Vector3 = pts[i]; var b: Vector3 = pts[i + 1]
		for v in [a * Vector3(-1, 1, 1), a, b, a * Vector3(-1, 1, 1), b, b * Vector3(-1, 1, 1)]: T.append(v + Vector3(0, 0, -0.05))
	var gm := flat(T, PackedColorArray(), E(Color("#2a1458")), n)
	emis.append(gm)
	for sp in [Vector3(0.6, gy + 2.2, gz + 0.1), Vector3(-0.9, gy + 3.6, gz + 0.1), Vector3(0.3, gy + 5.0, gz + 0.1), Vector3(-0.2, gy + 6.6, gz + 0.1), Vector3(1.4, gy + 3.2, gz + 0.1), Vector3(-1.6, gy + 1.8, gz + 0.1)]:
		sph(0.12, E(Color("#e8dcff")), sp, n)
	omni(void_c, 2.6, 9.0, Vector3(0, gy + 3.5, gz + 2.2), n)
	for ob in [[Vector3(-7.4, 0.15, 1.6), 3.4, 12, 4.0], [Vector3(8.0, 0.12, 1.0), 3.0, -10, -5.0], [Vector3(-5.4, 0.15, 5.0), 2.2, 20, 3.0], [Vector3(6.2, 0.15, 5.2), 2.4, -16, -3.0]]:
		obelisk(ob[0], ob[1], st, void_c, ob[2], ob[3])
	for fl in [Vector3(-6.2, 6.4, -1.0), Vector3(6.8, 7.2, -1.6), Vector3(-8.8, 4.4, 0.8), Vector3(9.2, 4.8, 1.2), Vector3(-3.8, 9.0, -2.4), Vector3(4.4, 9.8, -2.6)]:
		var d := grp(fl); d.rotation_degrees = Vector3(rng.randf() * 20, rng.randf() * 90, rng.randf() * 20)
		cyl(0.0, 0.36, 0.6, 4, E(Color("#f4f0e6")), Vector3(0, -0.3, 0), Vector3.ZERO, d)
		cyl(0.36, 0.0, 0.6, 4, E(Color("#ffffff")), Vector3(0, 0.3, 0), Vector3.ZERO, d)
	path([Vector3(1.0, 0.2, 2.6), Vector3(1.3, 0.2, 4.0), Vector3(1.6, 0.18, 5.4), Vector3(1.9, 0.14, 6.8)], st.darkened(0.2))

func w6() -> void:      # RÜZGÂR BAHÇESİ: yel değirmeni + kiraz ağaçları
	var n := grp(Vector3(3.4, 0.2, -2.4), -20.0)
	var wall := M(Color("#efe2c8")); var wd := M(Color("#7a4a3a")); var roof := M(Color("#b8405a"))
	cyl(1.9, 1.3, 5.6, 8, wall, Vector3(0, 2.8, 0), Vector3.ZERO, n)
	cyl(2.05, 1.95, 0.4, 8, M(Color("#a89880")), Vector3(0, 0.2, 0), Vector3.ZERO, n)
	cyl(1.7, 0.0, 2.2, 8, roof, Vector3(0, 6.7, 0), Vector3.ZERO, n)
	box(Vector3(0.9, 1.5, 0.12), wd, Vector3(0, 0.95, 1.8), Vector3(-6, 0, 0), n)
	box(Vector3(0.6, 0.7, 0.12), E(Color("#ffd884")), Vector3(0, 3.6, 1.5), Vector3(-6, 0, 0), n)
	var hub := grp(Vector3(0, 5.5, 1.5), 0.0, 1.0, n); hub.rotation_degrees.z = 22.0
	cyl(0.3, 0.3, 0.6, 8, wd, Vector3(0, 0, 0), Vector3(90, 0, 0), hub)
	for i in 4:
		var b := grp(Vector3.ZERO, 0.0, 1.0, hub); b.rotation_degrees.z = i * 90.0
		box(Vector3(0.14, 4.4, 0.1), wd, Vector3(0, 2.2, 0.2), Vector3.ZERO, b)
		box(Vector3(1.0, 3.2, 0.06), M(Color("#f6ecd8")), Vector3(0.55, 2.7, 0.2), Vector3.ZERO, b)
		for j in 4: box(Vector3(1.0, 0.07, 0.1), wd, Vector3(0.55, 1.3 + j * 0.9, 0.22), Vector3.ZERO, b)
	var pink := Color("#ff9ec4")
	tree(Vector3(-6.6, 0.15, -2.6), 6.2, 4, Color("#6a4438"), pink)
	tree(Vector3(-3.0, 0.2, 2.4), 4.2, 7, Color("#6a4438"), Color("#ffb4d2"))
	tree(Vector3(8.4, 0.1, 1.6), 4.8, 13, Color("#6a4438"), pink)
	tree(Vector3(-8.2, 0.1, 2.8), 3.4, 21, Color("#6a4438"), Color("#ffb4d2"))
	path([Vector3(3.9, 0.2, 0.0), Vector3(3.6, 0.2, 1.5), Vector3(2.8, 0.2, 2.9), Vector3(1.8, 0.2, 4.2), Vector3(0.6, 0.18, 5.4), Vector3(-0.6, 0.14, 6.6)], Color("#e6d6b0"))
	for bu in [[Vector3(-5.4, 0.3, 5.2), 0.8], [Vector3(6.0, 0.3, 4.8), 0.9], [Vector3(-1.0, 0.3, -4.6), 0.8], [Vector3(4.6, 0.3, 6.6), 0.6], [Vector3(-8.6, 0.25, -0.4), 0.7]]:
		var g := grp(bu[0]); g.set_meta("soft", true)
		sph(bu[1], M(Color("#4f9a4a")), Vector3.ZERO, g, Vector3(1.2, 0.8, 1.0)); sph(bu[1] * 0.7, M(Color("#5fae54")), Vector3(bu[1] * 0.8, 0.0, 0.2), g)
	for i in 26:      # çiçekler
		var a := rng.randf() * TAU; var p := edge(a, rng.randf_range(0.25, 0.88), 0.28)
		cyl(0.03, 0.03, 0.3, 4, M(Color("#3f8044")), p + Vector3(0, 0.1, 0))
		sph(0.13, M([Color("#ff9ec4"), Color("#fff0a0"), Color("#ffffff"), Color("#ff6a8a")][i % 4]), p + Vector3(0, 0.3, 0), null, Vector3.ONE, 6)
	for pt in 14:     # uçuşan yapraklar
		var q := Vector3(rng.randf_range(-10, 10), rng.randf_range(3, 9), rng.randf_range(-3, 5))
		box(Vector3(0.22, 0.03, 0.14), E(Color("#ffc0dc")), q, Vector3(rng.randf() * 90, rng.randf() * 90, rng.randf() * 90))

func w7() -> void:      # TUZ TABANI: tuz sütunları + dev kafatası
	var salt := Color("#f6eedc")
	for sp in [[Vector3(4.2, 0.15, -3.0), 7.0, Vector3(0, 0, -3)], [Vector3(5.8, 0.15, -2.2), 5.0, Vector3(0, 20, 5)], [Vector3(2.8, 0.15, -2.4), 4.6, Vector3(0, 40, -8)], [Vector3(6.8, 0.12, -3.4), 3.6, Vector3(4, 10, 12)],
			[Vector3(4.6, 0.15, -1.2), 2.8, Vector3(8, 0, 4)], [Vector3(1.6, 0.15, -3.2), 2.6, Vector3(0, 0, -14)], [Vector3(7.6, 0.1, -1.4), 2.2, Vector3(6, 0, 16)]]:
		spike(sp[0], sp[1], salt.lerp(Color("#e0d0b0"), rng.randf() * 0.6), sp[2], false)
	omni(Color("#ffe0a0"), 1.6, 7.0, Vector3(4.4, 3.0, 0.4))
	skull(Vector3(-2.2, -0.35, 2.6), 2.1, 18.0, Color("#eadfc4"), Color("#ffb040"))
	omni(Color("#ffa030"), 1.4, 5.0, Vector3(-1.6, 2.0, 5.6))
	for hx in [-1, 1]:       # boynuzlar
		var o := Vector3(-2.2 + hx * 1.9, 2.4, 2.4)
		seg(o, o + Vector3(hx * 1.3, 0.9, -0.2), 0.34, 0.24, M(Color("#cfc0a0")))
		seg(o + Vector3(hx * 1.3, 0.9, -0.2), o + Vector3(hx * 1.7, 2.3, -0.1), 0.24, 0.04, M(Color("#cfc0a0")))
	obelisk(Vector3(-7.2, 0.12, -2.4), 4.4, Color("#c8b490"), Color("#ffb040"), 15.0, 5.0)
	obelisk(Vector3(8.6, 0.1, 2.6), 2.4, Color("#c8b490"), Color("#ffb040"), -20.0, -7.0)
	# çatlamış tuz plakaları
	for i in 9:
		var a := rng.randf() * TAU; var p := edge(a, rng.randf_range(0.3, 0.85), 0.26)
		cyl(rng.randf_range(0.7, 1.2), rng.randf_range(0.8, 1.3), 0.12, 6, M(salt.lerp(Color("#d8c8a4"), rng.randf())), p, Vector3(0, rng.randf() * 60, 0))
	for sp in [[Vector3(-6.4, 0.1, 4.6), 1.2, Vector3(10, 0, 16)], [Vector3(-5.6, 0.1, 5.2), 0.8, Vector3(14, 0, -10)], [Vector3(3.0, 0.1, 6.4), 1.1, Vector3(10, 0, -12)], [Vector3(7.0, 0.1, 4.6), 0.9, Vector3(8, 0, 14)]]:
		spike(sp[0], sp[1], salt, sp[2], false)
	tree(Vector3(-8.6, 0.1, 1.0), 3.6, 5, Color("#b8a888"))

func w8() -> void:      # DONMUŞ GÖL: buz kulesi + donmuş göl
	var ice := Color("#8cdcff")
	cyl(3.6, 3.6, 0.14, 16, M(Color("#9fd4f4")), Vector3(-3.4, 0.28, 3.0)).scale = Vector3(1.25, 1, 0.9)
	cyl(3.2, 3.2, 0.16, 16, M(Color("#c4ecff")), Vector3(-3.4, 0.29, 3.0)).scale = Vector3(1.25, 1, 0.9)
	for cr in [[Vector3(-5.6, 0.39, 2.4), Vector3(-3.2, 0.39, 3.2)], [Vector3(-3.2, 0.39, 3.2), Vector3(-1.4, 0.39, 2.2)], [Vector3(-3.2, 0.39, 3.2), Vector3(-2.8, 0.39, 5.0)], [Vector3(-4.6, 0.39, 4.4), Vector3(-3.6, 0.39, 3.9)]]:
		seg(cr[0], cr[1], 0.045, 0.03, M(Color("#ffffff")), null, 4)
	var n := grp(Vector3(4.0, 0.2, -2.4), -18.0)
	var wall := M(Color("#7f9cd0")); var wall2 := M(Color("#5c78b0")); var roof := M(Color("#3c5490"))
	cyl(1.9, 1.5, 3.6, 8, wall, Vector3(0, 1.8, 0), Vector3.ZERO, n)
	cyl(1.75, 1.65, 0.3, 8, wall2, Vector3(0, 3.7, 0), Vector3.ZERO, n)
	cyl(1.4, 1.15, 3.0, 8, wall, Vector3(0.1, 5.3, 0), Vector3(0, 0, -3), n)
	cyl(1.5, 1.4, 0.3, 8, wall2, Vector3(0.2, 6.9, 0), Vector3(0, 0, -3), n)
	cyl(1.6, 0.0, 3.8, 8, roof, Vector3(0.3, 8.9, 0), Vector3(0, 0, -4), n)
	cyl(1.66, 1.2, 0.5, 8, M(Color("#f4faff")), Vector3(0.22, 7.25, 0), Vector3(0, 0, -4), n)
	box(Vector3(0.9, 1.5, 0.14), M(Color("#2c3c66")), Vector3(0, 0.9, 1.78), Vector3(-5, 0, 0), n)
	for wv in [Vector3(-0.5, 2.6, 1.62), Vector3(0.5, 4.8, 1.3), Vector3(-0.2, 6.0, 1.22)]:
		box(Vector3(0.42, 0.7, 0.14), E(Color("#bff0ff")), wv, Vector3.ZERO, n)
	omni(ice, 1.6, 6.0, Vector3(0, 3.0, 3.0), n)
	for sp in [[Vector3(7.2, 0.1, 0.6), 3.4, Vector3(4, 0, -10)], [Vector3(8.2, 0.1, 1.4), 2.2, Vector3(8, 0, -22)], [Vector3(6.4, 0.12, 1.6), 1.8, Vector3(10, 0, 8)], [Vector3(1.2, 0.2, -4.0), 2.0, Vector3(0, 0, 10)],
			[Vector3(-8.0, 0.1, -1.0), 1.6, Vector3(6, 0, 14)], [Vector3(2.6, 0.15, 6.4), 1.3, Vector3(12, 0, -8)]]:
		spike(sp[0], sp[1], ice, sp[2])
	tree(Vector3(-7.4, 0.1, -3.2), 6.2, 4, Color("#3c4668"))
	tree(Vector3(-0.6, 0.2, -4.6), 3.6, 17, Color("#3c4668"))
	for sm in [[Vector3(-7.6, 0.1, 2.0), 1.1], [Vector3(1.4, 0.2, 3.4), 0.9], [Vector3(6.0, 0.1, 4.8), 1.2], [Vector3(-1.4, 0.1, 6.8), 0.9], [Vector3(-4.4, 0.2, -2.4), 1.3], [Vector3(8.6, 0.05, -2.6), 0.9]]:
		sph(sm[1], M(Color("#f4faff")), sm[0], null, Vector3(1.3, 0.45, 1.0), 10).cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF

func w9() -> void:      # KEMİK BAHÇESİ: dev kaburga + kafatası totemi
	var bone := Color("#e6dcc0"); var bm := M(bone); var bm2 := M(Color("#c8bc9c"))
	var n := grp(Vector3(2.6, 0.25, -1.0), -28.0)
	seg(Vector3(-4.6, 0.3, 0), Vector3(4.6, 0.5, 0), 0.36, 0.26, bm2, n, 7)
	for i in 7:
		var x := -3.9 + i * 1.3
		var Rr := 2.9 - absf(i - 2.5) * 0.28
		cyl(0.44, 0.44, 0.5, 7, bm, Vector3(x, 0.4, 0), Vector3(0, 0, 90), n)
		for sz in [-1, 1]:
			var prev := Vector3(x, 0.35, 0)
			for k in 7:
				var t := (k + 1) / 7.0 * 2.45
				var q := Vector3(x + sin(t) * 0.15, Rr - Rr * cos(t) + 0.35, sz * Rr * sin(t) * 0.92)
				seg(prev, q, 0.24 - k * 0.022, 0.22 - k * 0.022, bm, n, 6)
				prev = q
	skull(Vector3(8.0, -0.2, 1.4) + Vector3(0, 0, 0), 1.35, -40.0, bone)
	# totem
	var tp := Vector3(-6.2, 0.15, 1.6)
	seg(tp, tp + Vector3(0.1, 4.4, 0), 0.14, 0.1, M(Color("#5a4636")))
	skull(tp + Vector3(0.1, 4.2, 0), 0.75, 12.0, bone, Color("#ffd070"))
	for sx in [-1, 1]: seg(tp + Vector3(0.1, 3.4, 0), tp + Vector3(0.1 + sx * 1.2, 2.9, 0.2), 0.1, 0.05, bm2)
	omni(Color("#ffd070"), 1.4, 4.5, tp + Vector3(0.2, 4.8, 1.2))
	tree(Vector3(-8.2, 0.1, -3.0), 5.6, 5, Color("#d8ccac"))
	tree(Vector3(8.6, 0.1, -3.6), 4.6, 14, Color("#d8ccac"))
	tree(Vector3(-2.6, 0.2, -4.6), 3.2, 23, Color("#d8ccac"))
	for i in 9:       # saçılmış kemikler
		var a := rng.randf() * TAU; var p := edge(a, rng.randf_range(0.35, 0.86), 0.34)
		var d := Vector3(cos(a * 3.0), 0, sin(a * 3.0)) * 0.55
		seg(p - d, p + d, 0.09, 0.09, bm, null, 5)
		sph(0.15, bm, p - d); sph(0.15, bm, p + d)
	for i in 14:      # soluk çiçekler
		var a := rng.randf() * TAU; var p := edge(a, rng.randf_range(0.3, 0.88), 0.28)
		cyl(0.03, 0.03, 0.4, 4, M(Color("#6a7040")), p + Vector3(0, 0.15, 0))
		sph(0.13, E(Color("#ffe296")), p + Vector3(0, 0.4, 0), null, Vector3.ONE, 6)
	for mu in [[Vector3(-4.2, 0.25, 5.0), 0.9], [Vector3(4.6, 0.2, 5.8), 0.8], [Vector3(0.2, 0.25, 6.6), 0.7]]: mushroom(mu[0], mu[1], Color("#b86a4a"))

func w10() -> void:     # YILDIZ DÖKÜMHANESİ: ocak + dev dişli + yıldız
	var brick := M(Color("#8a4a3c")); var brick2 := M(Color("#6a362e")); var iron := M(Color("#3c4460")); var gold := Color("#ffc83c")
	var n := grp(Vector3(3.6, 0.2, -2.2), -22.0)
	box(Vector3(5.0, 0.4, 4.4), iron, Vector3(0, 0.2, 0), Vector3.ZERO, n)
	box(Vector3(4.4, 3.4, 3.8), brick, Vector3(0, 2.1, 0), Vector3.ZERO, n)
	for i in 5: box(Vector3(4.46, 0.07, 3.86), brick2, Vector3(0, 0.9 + i * 0.6, 0), Vector3.ZERO, n)
	box(Vector3(4.8, 0.3, 4.2), iron, Vector3(0, 3.9, 0), Vector3.ZERO, n)
	box(Vector3(2.2, 1.5, 0.2), iron, Vector3(0, 1.3, 1.9), Vector3.ZERO, n)
	cyl(1.1, 1.1, 0.2, 16, iron, Vector3(0, 2.05, 1.9), Vector3(90, 0, 0), n)
	box(Vector3(1.7, 1.4, 0.24), E(Color("#ff9a2a")), Vector3(0, 1.2, 1.94), Vector3.ZERO, n)
	cyl(0.85, 0.85, 0.24, 16, E(Color("#ffc040")), Vector3(0, 1.9, 1.94), Vector3(90, 0, 0), n)
	omni(Color("#ff9a2a"), 2.6, 7.0, Vector3(0, 1.6, 3.4), n)
	box(Vector3(1.3, 4.6, 1.3), brick, Vector3(1.1, 6.2, -0.9), Vector3.ZERO, n)
	box(Vector3(1.6, 0.35, 1.6), iron, Vector3(1.1, 8.6, -0.9), Vector3.ZERO, n)
	box(Vector3(1.5, 0.25, 1.5), iron, Vector3(1.1, 6.0, -0.9), Vector3.ZERO, n)
	var sm := grp(Vector3(1.1, 9.0, -0.9), 0.0, 1.0, n); sm.set_meta("soft", true)
	for d in [[Vector3(0, 0.4, 0), 0.6], [Vector3(0.35, 1.1, 0), 0.75], [Vector3(-0.05, 1.9, 0), 0.85]]:
		sph(d[1], M(Color("#4c5676")), d[0], sm).cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	# dev dişli (yere yarı gömülü, dik)
	var g := grp(Vector3(-5.6, 2.2, -2.6), 18.0); g.set_meta("gid", true)
	var gm := M(Color("#9a7a4a")); var gm2 := M(Color("#6c5434"))
	cyl(3.0, 3.0, 0.7, 24, gm, Vector3.ZERO, Vector3(90, 0, 0), g)
	cyl(2.3, 2.3, 0.76, 24, gm2, Vector3.ZERO, Vector3(90, 0, 0), g)
	cyl(1.0, 1.0, 0.9, 16, gm, Vector3.ZERO, Vector3(90, 0, 0), g)
	cyl(0.45, 0.45, 0.96, 12, M(Color("#2a2f44")), Vector3.ZERO, Vector3(90, 0, 0), g)
	for i in 12:
		var a := TAU * i / 12.0
		box(Vector3(0.8, 0.9, 0.7), gm, Vector3(cos(a) * 3.2, sin(a) * 3.2, 0), Vector3(0, 0, rad_to_deg(a) - 90.0), g)
	for i in 4: box(Vector3(0.4, 2.8, 0.8), gm, Vector3.ZERO, Vector3(0, 0, i * 45.0), g)
	# örs + dökülen yıldız
	var an := grp(Vector3(-1.0, 0.3, 3.6), 20.0); an.set_meta("gid", true)
	box(Vector3(0.9, 0.5, 0.7), iron, Vector3(0, 0.25, 0), Vector3.ZERO, an)
	box(Vector3(0.5, 0.5, 0.45), iron, Vector3(0, 0.7, 0), Vector3.ZERO, an)
	box(Vector3(1.7, 0.4, 0.75), M(Color("#56608a")), Vector3(0.1, 1.1, 0), Vector3.ZERO, an)
	cyl(0.2, 0.0, 0.7, 6, M(Color("#56608a")), Vector3(1.25, 1.12, 0), Vector3(0, 0, -90), an)
	var stn := grp(Vector3(-1.0, 3.3, 3.6)); stn.set_meta("gid", true); stn.rotation_degrees = Vector3(0, 0, 12)
	for i in 5:
		var b := grp(Vector3.ZERO, 0.0, 1.0, stn); b.rotation_degrees.z = i * 72.0
		emis.append(cyl(0.42, 0.0, 1.3, 4, E(Color("#fff0a0")), Vector3(0, 0.75, 0), Vector3.ZERO, b))
	sph(0.5, E(Color("#ffffff")), Vector3.ZERO, stn)
	omni(gold, 2.4, 6.0, Vector3(-1.0, 3.3, 4.6))
	# zemin plakaları + perçinler, borular
	for i in 8:
		var a := rng.randf() * TAU; var p := edge(a, rng.randf_range(0.3, 0.8), 0.3)
		box(Vector3(2.0, 0.1, 1.5), M(Color("#4e5c84").lerp(Color("#3c486c"), rng.randf())), p, Vector3(0, rng.randf() * 40, 0))
	seg(Vector3(6.6, 0.5, 3.0), Vector3(8.6, 0.5, 1.0), 0.3, 0.3, M(Color("#8a6a3c")), null, 8)
	seg(Vector3(6.6, 0.5, 3.0), Vector3(6.6, 2.2, 3.0), 0.3, 0.3, M(Color("#8a6a3c")), null, 8)
	cyl(0.42, 0.42, 0.2, 8, iron, Vector3(6.6, 2.2, 3.0))
	lantern(Vector3(4.2, 0.15, 5.6), 2.6, 200)
	for sp in [[Vector3(-7.8, 0.1, 3.0), 1.4, Vector3(8, 0, 14)], [Vector3(8.6, 0.1, -2.4), 1.2, Vector3(6, 0, -12)]]: spike(sp[0], sp[1], gold, sp[2])
	for fl in [Vector3(-7.0, 8.2, -1.0), Vector3(7.6, 9.0, -1.6), Vector3(-2.6, 10.0, -2.0), Vector3(9.4, 5.6, 0.6)]: sph(0.16, E(Color("#fff0a0")), fl)

# ───────────── geçişler ─────────────
const SH_N := "shader_type spatial; render_mode unshaded, cull_disabled; varying vec3 n;
vec3 s2l(vec3 c){ return mix(c / 12.92, pow((c + 0.055) / 1.055, vec3(2.4)), step(vec3(0.04045), c)); }
void vertex(){ n = normalize(MODELVIEW_NORMAL_MATRIX * NORMAL); }
void fragment(){ vec3 nn = normalize(n); if(!FRONT_FACING) nn = -nn; ALBEDO = s2l(nn * 0.5 + 0.5); }"
func _up_meta(n: Node, k: String):
	var p := n
	while p != null and p != root3:
		if p.has_meta(k): return p
		p = p.get_parent()
	return null

func all_mi(n: Node, out: Array) -> void:
	if n is MeshInstance3D: out.append(n)
	for c in n.get_children(): all_mi(c, out)

func shot(path: String) -> void:
	for i in 4: await process_frame
	await RenderingServer.frame_post_draw
	vp.get_texture().get_image().save_png(path)
	print("yazıldı ", path)

func _init() -> void:
	var out := "."; var px := 3040
	for a in OS.get_cmdline_user_args():
		if a.begins_with("out="): out = a.substr(4)
		if a.begins_with("px="): px = int(a.substr(3))
		if a.begins_with("w="): W = int(a.substr(2))
		if a.begins_with("mini="): MINI = int(a.substr(5))
		if a.begins_with("chest="):
			CHEST = true
			CHEST_COL = Color(a.substr(6)) if a.length() > 8 else CHEST_COL
	TH = THEMES[W]
	if CHEST:
		TH = TH.duplicate()
		TH["amb"] = "#221c30"; TH["rim"] = "#" + CHEST_COL.to_html(false)
	vp = SubViewport.new()
	vp.size = Vector2i(px, int(px * 744.0 / 760.0))
	vp.transparent_bg = true
	vp.own_world_3d = true
	vp.render_target_update_mode = SubViewport.UPDATE_ALWAYS
	get_root().add_child(vp)
	root3 = Node3D.new(); vp.add_child(root3)
	var env := Environment.new()
	env.background_mode = Environment.BG_CLEAR_COLOR
	env.ambient_light_source = Environment.AMBIENT_SOURCE_COLOR
	env.ambient_light_color = T("amb")
	env.ambient_light_energy = 0.55
	env.tonemap_mode = Environment.TONE_MAPPER_LINEAR
	var we := WorldEnvironment.new(); we.environment = env; vp.add_child(we)
	var key := DirectionalLight3D.new()
	key.rotation_degrees = Vector3(-42, -38, 0)
	key.light_color = Color("#e8e2ff"); key.light_energy = 0.5 if CHEST else 0.78
	key.shadow_enabled = true; key.directional_shadow_max_distance = 110.0; key.shadow_bias = 0.12; key.shadow_normal_bias = 2.5; key.shadow_blur = 0.6
	RenderingServer.directional_shadow_atlas_set_size(8192, true)
	key.directional_shadow_mode = DirectionalLight3D.SHADOW_ORTHOGONAL
	vp.add_child(key)
	var rim := DirectionalLight3D.new()       # kanlı ayın arkadan vuran kızıl ışığı
	rim.rotation_degrees = Vector3(-18, 150, 0)
	rim.light_color = T("rim"); rim.light_energy = 0.55
	vp.add_child(rim)
	var fill := DirectionalLight3D.new()      # alttan-önden soğuk dolgu (kaya okunsun)
	fill.rotation_degrees = Vector3(28, 22, 0)
	fill.light_color = Color("#6f7fd6"); fill.light_energy = 0.5
	vp.add_child(fill)
	var cam := Camera3D.new()
	cam.fov = 28.5
	vp.add_child(cam)
	cam.look_at_from_position(Vector3(0, 13.5, 62.0), Vector3(0, -3.4, 0))
	cam.current = true
	build()
	await shot(out + "/beauty.png")
	var mis: Array = []; all_mi(root3, mis)
	var keep := {}
	for mi in mis: keep[mi] = mi.material_override
	# ışıma
	var blk := StandardMaterial3D.new(); blk.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED; blk.albedo_color = Color.BLACK
	for mi in mis: if not emis.has(mi): mi.material_override = blk
	await shot(out + "/emis.png")
	var sh := Shader.new(); sh.code = SH_N
	var sm := ShaderMaterial.new(); sm.shader = sh
	var flatn := StandardMaterial3D.new(); flatn.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED; flatn.albedo_color = Color(0.5, 0.5, 1.0).srgb_to_linear()
	for mi in mis: mi.material_override = flatn if _up_meta(mi, "soft") != null else sm
	await shot(out + "/normal.png")
	var ids := {}
	for mi in mis:
		var idk = _up_meta(mi, "soft")
		if idk == null: idk = _up_meta(mi, "gid")
		if idk == null: idk = mi
		if not ids.has(idk):
			var im := StandardMaterial3D.new(); im.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
			im.albedo_color = Color(rng.randf_range(0.1, 1.0), rng.randf_range(0.1, 1.0), rng.randf_range(0.1, 1.0))
			ids[idk] = im
		mi.material_override = ids[idk]
	await shot(out + "/id.png")
	quit()
