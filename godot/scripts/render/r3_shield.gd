class_name R3Shield
extends RefCounted
## shieldDome.js — KURTARMA GÖREVİNİN KALKAN KUBBESİ (v43), birebir.
## ① panel kafes (ikosfer üst yarısı, pişmiş veri: assets/arena/shield_dome.json)
## ② perde (kenar ışığı) ③ zemin: ışık havuzu + dönen rün halkası + çember
## ④ yayıcı kaideler ⑤ tepe mücevheri. Kırılma: paneller normalleri boyunca saçılır.
## Köşe renkleri doğrusal ve 1'i aşabilir → RGBA8'e yarıya bölünüp yazılır,
## gölgelendirici ×2 ile geri açar (toplamsal harmanlama three ile aynı kalır).

const DOME_SHADER := """
shader_type spatial;
render_mode unshaded, blend_add, depth_draw_never, %s;
uniform float opacity = 1.0;
void fragment() { ALBEDO = COLOR.rgb * 2.0; ALPHA = opacity; }
"""

var group: Node3D
var ring: MeshInstance3D
var shell: MeshInstance3D
var veil: MeshInstance3D
var disk: MeshInstance3D
var runes: MeshInstance3D
var base: MeshInstance3D
var gem: MeshInstance3D
var shellMat: ShaderMaterial
var veilMat: ShaderMaterial
var runeMat: ShaderMaterial
var ringMat: ShaderMaterial
var R := 150.0
var SQ := 0.84
var _gemY := 0.0
var nV := 0
var base0 := PackedFloat32Array()
var cent := PackedFloat32Array()
var bl := PackedFloat32Array()
var bw := PackedFloat32Array()
var hy := PackedFloat32Array()
var ph := PackedFloat32Array()
var sp := PackedFloat32Array()
var _pos := PackedVector3Array()
var _col := PackedColorArray()
var _idx := PackedInt32Array()
var _shellMesh: ArrayMesh
var _moved := false
var _ok := false

func _dome_mat(cull: String) -> ShaderMaterial:
	var s := Shader.new()
	s.code = DOME_SHADER % cull
	var m := ShaderMaterial.new()
	m.shader = s
	return m

func _init(r3, propMat: Material) -> void:
	group = Render3D.node()
	group.visible = false
	var f := FileAccess.open("res://assets/arena/shield_dome.json", FileAccess.READ)
	if f == null: return
	var D: Dictionary = JSON.parse_string(f.get_as_text())
	R = D.R; SQ = D.SQ; _gemY = D.gemY
	base0 = PackedFloat32Array(D.base0); cent = PackedFloat32Array(D.cent); bl = PackedFloat32Array(D.bl)
	bw = PackedFloat32Array(D.bw); hy = PackedFloat32Array(D.hy); ph = PackedFloat32Array(D.ph); sp = PackedFloat32Array(D.sp)
	nV = bw.size()
	shellMat = _dome_mat("cull_disabled")
	shellMat.render_priority = 7
	veilMat = _dome_mat("cull_back")
	veilMat.render_priority = 6
	runeMat = Shd.basic({"map": "srgb", "tex": load("res://assets/fx/shield_rune.png"), "color": Color("#bfeaff"), "opacity": 0.85, "add": true, "zwrite": false, "order": 5})
	ringMat = Shd.basic({"color": Color("#bfeaff"), "opacity": 0.9, "add": true, "zwrite": false, "order": 6})
	# ① panel kafes (dinamik)
	_pos.resize(nV); _col.resize(nV); _idx.resize(nV)
	for v in nV:
		_pos[v] = Vector3(base0[v * 3], base0[v * 3 + 1], base0[v * 3 + 2])
		_idx[v] = v
	# three CCW → Godot CW
	for i in range(0, nV, 3):
		_idx[i + 1] = i + 2; _idx[i + 2] = i + 1
	_shellMesh = ArrayMesh.new()
	shell = Render3D.mesh_node(_shellMesh, shellMat, group)
	# ② perde ③ disk — pişmiş geometri + renk
	veil = Render3D.mesh_node(_baked(D.veil), veilMat, group)
	disk = Render3D.mesh_node(_baked(D.disk), veilMat, group)
	disk.position.y = 1.2
	runes = Render3D.mesh_node(Geo.ring(0.93, 1.13, 80, 1, 0, TAU, PackedColorArray(), -1, -PI / 2), runeMat, group)
	runes.position.y = 1.6
	var tg := Geo.merge([Geo.torus(1, 0.03, 6, 64)], [Transform3D(Basis(Vector3(1, 0, 0), PI / 2), Vector3.ZERO)])
	ring = Render3D.mesh_node(tg, ringMat, group)
	ring.position.y = 2
	# ④ ⑤ opak parçalar engel materyalini paylaşır
	var om: Dictionary = r3._objMeshes
	base = Render3D.mesh_node(om.get("shieldBase"), propMat, group)
	gem = Render3D.mesh_node(om.get("shieldGem"), propMat, group)
	_ok = true

func _baked(g: Dictionary) -> ArrayMesh:
	var p: Array = g.pos
	var c: Array = g.col
	var n := p.size() / 3
	var pos := PackedVector3Array(); pos.resize(n)
	var col := PackedColorArray(); col.resize(n)
	for i in n:
		pos[i] = Vector3(p[i * 3], p[i * 3 + 1], p[i * 3 + 2])
		col[i] = Color(c[i * 3] * 0.5, c[i * 3 + 1] * 0.5, c[i * 3 + 2] * 0.5) if c.size() else Color(0.5, 0.5, 0.5)
	var idx := PackedInt32Array()
	var src: Array = g.idx if g.idx != null else range(n)
	idx.resize(src.size())
	for i in range(0, src.size(), 3):
		idx[i] = src[i]; idx[i + 1] = src[i + 2]; idx[i + 2] = src[i + 1]
	var a := []
	a.resize(Mesh.ARRAY_MAX)
	a[Mesh.ARRAY_VERTEX] = pos
	a[Mesh.ARRAY_COLOR] = col
	a[Mesh.ARRAY_INDEX] = idx
	var m := ArrayMesh.new()
	m.add_surface_from_arrays(Mesh.PRIMITIVE_TRIANGLES, a)
	return m

## Her kare. shat: 0 sağlam → 1 tamamen kırıldı.
func update(t: float, x: float, z: float, shat: float, show: bool) -> void:
	if not _ok: return
	if not show or shat >= 0.999:
		if group.visible: group.visible = false
		return
	group.visible = true
	if shat <= 0: group.position = Vector3(x, 0, z)
	var fade := 1 - shat
	var br := 1 + sin(t * 1.7) * 0.012
	shell.scale = Vector3(R * br, R * SQ * br, R * br)
	var vr := R * 0.985 * br
	veil.scale = Vector3(vr, vr * SQ, vr)
	shellMat.set_shader_parameter("opacity", fade)
	veilMat.set_shader_parameter("opacity", fade)
	disk.scale = Vector3(R, 1, R)
	runes.scale = Vector3(R, 1, R)
	runes.rotation.y = t * 0.14
	runeMat.set_shader_parameter("opacity", 0.85 * fade)
	var rr := R * (1 + shat * 0.35)
	ring.scale = Vector3(rr, rr, rr)
	ringMat.set_shader_parameter("opacity", 0.9 * fade)
	base.position.y = -shat * 48
	var gs := 1 - shat
	gem.visible = gs > 0.05
	gem.position.y = _gemY + sin(t * 2.1) * 3.5 + shat * 30
	gem.rotation.y = t * 1.3
	gem.scale = Vector3(gs, gs, gs)
	_panels(t, shat)

func _panels(t: float, shat: float) -> void:
	var NP := nV / 3
	var scan := fmod(t * 0.34, 1.25) - 0.12
	var fl := shat * 0.9
	for p in NP:
		var tw := 0.84 + 0.16 * sin(t * 2.3 + ph[p])
		var s := sin(t * 0.8 + ph[p] * 5.1)
		s = s * s if s > 0 else 0.0
		s *= s; s *= s; s *= s
		for k in 3:
			var v := p * 3 + k
			var i3 := v * 3
			var dy := hy[v] - scan
			var g := 1 - dy * dy * 40
			g = g * g if g > 0 else 0.0
			var a := (g * 0.34 + s * 0.42) * bw[v] + fl
			var A := a * a
			_col[v] = Color((bl[i3] * tw + A * 0.62) * 0.5, (bl[i3 + 1] * tw + A * 0.8) * 0.5, (bl[i3 + 2] * tw + A) * 0.5)
	if shat > 0:
		var e := shat * (2 - shat)
		var shrink := 1 - shat * 0.6
		var drop := shat * shat * 0.55
		for p in NP:
			var pb := p * 9
			var cx := (base0[pb] + base0[pb + 3] + base0[pb + 6]) / 3
			var cy := (base0[pb + 1] + base0[pb + 4] + base0[pb + 7]) / 3
			var cz := (base0[pb + 2] + base0[pb + 5] + base0[pb + 8]) / 3
			var kk := e * sp[p] * 0.8
			var ox := cx + cent[p * 3] * kk
			var oy := cy + cent[p * 3 + 1] * kk - drop
			var oz := cz + cent[p * 3 + 2] * kk
			for j in 3:
				var b := pb + j * 3
				_pos[p * 3 + j] = Vector3(ox + (base0[b] - cx) * shrink, oy + (base0[b + 1] - cy) * shrink, oz + (base0[b + 2] - cz) * shrink)
		_moved = true
	elif _moved:
		for v in nV: _pos[v] = Vector3(base0[v * 3], base0[v * 3 + 1], base0[v * 3 + 2])
		_moved = false
	var a2 := []
	a2.resize(Mesh.ARRAY_MAX)
	a2[Mesh.ARRAY_VERTEX] = _pos
	a2[Mesh.ARRAY_COLOR] = _col
	a2[Mesh.ARRAY_INDEX] = _idx
	_shellMesh.clear_surfaces()
	_shellMesh.add_surface_from_arrays(Mesh.PRIMITIVE_TRIANGLES, a2)
