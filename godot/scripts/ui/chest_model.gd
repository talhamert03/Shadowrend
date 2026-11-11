class_name ChestModel
extends RefCounted
## Karanlık temalı 3B sandık modelleri — yordamsal (kod ile) kurulur, GLB gerekmez.
## 7 kademe, her biri ayrı siluet + ayrı ışık rengi: kömür karası gövde, dövme metal kuşaklar,
## kapak aralığından / rünlerden / kilitten sızan renkli ışık. ChestStage ile aynı ölçü:
## gövde x ±21, y 0…24,2, z ±16,4; kapak menteşesi (0, 26, −16,4) — düğüm adı "LID".
## Kullanım: var m := ChestModel.build(kademe)  → {root, lid, glow: [malzeme], pupil, bobs}

const HW := 21.0
const HD := 16.4
const BH := 24.2
const HY := 26.0

## kademe → tasarım
const DEF := {
	1: {"glow": "#ffa23c", "body": "#6a4332", "metal": "#77727f", "acc": "#a09aa8", "lid": "low", "lock": "ring", "crest": ""},
	2: {"glow": "#a8dcff", "body": "#3d4d6c", "metal": "#c2cfe0", "acc": "#eef4fb", "lid": "flat", "lock": "shield", "crest": ""},
	3: {"glow": "#ffd23c", "body": "#6a2338", "metal": "#f0b534", "acc": "#ffe07a", "lid": "barrel", "lock": "sun", "crest": "crown"},
	4: {"glow": "#3dff7a", "body": "#1d4a42", "metal": "#566270", "acc": "#e2b548", "lid": "barrel", "lock": "skull", "crest": "horns"},
	5: {"glow": "#62d6ff", "body": "#253f7c", "metal": "#9dbfe8", "acc": "#e8f6ff", "lid": "gable", "lock": "crystal", "crest": "ice"},
	6: {"glow": "#c060ff", "body": "#3d1f6c", "metal": "#4a3a66", "acc": "#e8b040", "lid": "hex", "lock": "eye", "crest": "gem"},
	7: {"glow": "#ff3040", "body": "#3c1419", "metal": "#4c444c", "acc": "#f0b030", "lid": "barrel", "lock": "dragon", "crest": "dragon"},
}

static func glow_of(tier: int) -> Color:
	return Color(String(DEF[clampi(tier, 1, 7)].glow))

# ───────── kurucu durumu ─────────
var _ink: StandardMaterial3D
var _glow: Array = []
var _bobs: Array = []
var _pupil: Node3D
var _cache := {}
var _halos: Array = []
var _flames: Array = []
var _embers: Array = []
var _orbits: Array = []
var _bm := {}

static func build(tier: int) -> Dictionary:
	var b := ChestModel.new()
	tier = clampi(tier, 1, 7)
	if has_real(tier): return b._build_real(tier)
	return b._build(tier)

## ── GERÇEK 3B MODEL (assets/chest/real/t<k>.glb) ──
## Model tek parça gelir; genişliği 1'e, tabanı y=0'a normalize edilir, sonra kapak hizasından (seam)
## ikiye bölünür: üst yarı + ön kilit bölgesi "LID"e gider ve arka menteşeden döner.
## Bölünmüş ağlar kaynak model başına bir kez üretilir.
const REAL_DIR := "res://assets/chest/real/"
const REAL_W := 54.0          # sahne biriminde sandık genişliği
## kademe → [kaynak model, kapak hizası, kilidin sarkma payı, kilit yarı genişliği, ton kayması, doygunluk, parlaklık]
const REAL := {
	1: [1, 0.44, 0.33, 0.21, 0.0, 1.0, 0.92],
	2: [1, 0.44, 0.33, 0.21, 0.52, 0.30, 0.95],     # Tahta modelinin soğuk çelik tonlu hâli
	3: [3, 0.496, 0.28, 0.21, 0.0, 1.0, 0.92],
	4: [4, 0.439, 0.275, 0.25, 0.0, 1.0, 0.92],
	5: [5, 0.443, 0.29, 0.18, 0.0, 1.0, 0.92, 0.74],
	6: [4, 0.439, 0.275, 0.25, 0.46, 1.05, 0.92],   # Büyülü modelinin mor tonlu hâli
	7: [7, 0.405, 0.36, 0.25, 0.0, 1.0, 0.92, 0.60],      # son değer: gövde genişliği oranı (kanatlar hariç)
}
static var _real_cache := {}

static func has_real(tier: int) -> bool:
	return REAL.has(tier) and ResourceLoader.exists(REAL_DIR + "t" + str(int(REAL[tier][0])) + ".glb")

static func _find_mesh(n: Node) -> MeshInstance3D:
	if n is MeshInstance3D: return n
	for c in n.get_children():
		var r := _find_mesh(c)
		if r: return r
	return null

## döner: [gövde ağı, kapak ağı, doku, derinlik yarısı (normalize z)]
static func _split(tier: int) -> Array:
	var R: Array = REAL[tier]
	var src := int(R[0])
	if _real_cache.has(src): return _real_cache[src]
	var ps: PackedScene = load(REAL_DIR + "t" + str(src) + ".glb")
	var inst := ps.instantiate()
	var mi := _find_mesh(inst)
	var xf: Transform3D = Transform3D.IDENTITY
	var q: Node = mi
	while q != null and q is Node3D:
		xf = (q as Node3D).transform * xf
		q = q.get_parent()
	var mesh := mi.mesh
	var m0 := mesh.surface_get_material(0) as BaseMaterial3D
	var arr := mesh.surface_get_arrays(0)
	var V: PackedVector3Array = arr[Mesh.ARRAY_VERTEX]
	var U := PackedVector2Array()
	if arr[Mesh.ARRAY_TEX_UV] != null: U = arr[Mesh.ARRAY_TEX_UV]
	var I := PackedInt32Array()
	if arr[Mesh.ARRAY_INDEX] != null: I = arr[Mesh.ARRAY_INDEX]
	else:
		for k in V.size(): I.append(k)
	var lo := Vector3(1e9, 1e9, 1e9); var hi := -lo
	for i in V.size():
		V[i] = xf * V[i]
		lo = lo.min(V[i]); hi = hi.max(V[i])
	var k := 1.0 / maxf(0.001, hi.x - lo.x)
	var off := Vector3((lo.x + hi.x) * 0.5, lo.y, (lo.z + hi.z) * 0.5)
	for i in V.size(): V[i] = (V[i] - off) * k
	var zh := (hi.z - lo.z) * k * 0.5
	var seam: float = R[1]
	var ib := PackedInt32Array(); var il := PackedInt32Array()
	for t in range(0, I.size(), 3):
		var c: Vector3 = (V[I[t]] + V[I[t + 1]] + V[I[t + 2]]) / 3.0
		var lid: bool = c.y > seam or (c.z > zh - 0.075 and absf(c.x) < float(R[3]) and c.y > seam - float(R[2]))
		var dst := il if lid else ib
		dst.append(I[t]); dst.append(I[t + 1]); dst.append(I[t + 2])
	var out := []
	for idx in [ib, il]:
		var a2 := []
		a2.resize(Mesh.ARRAY_MAX)
		a2[Mesh.ARRAY_VERTEX] = V
		if U.size() == V.size(): a2[Mesh.ARRAY_TEX_UV] = U
		a2[Mesh.ARRAY_INDEX] = idx
		var m := ArrayMesh.new()
		m.add_surface_from_arrays(Mesh.PRIMITIVE_TRIANGLES, a2)
		var stn := SurfaceTool.new()      # yumuşak normaller (ışık + kontur için)
		stn.create_from(m, 0)
		stn.generate_normals()
		out.append(stn.commit())
	out.append(m0.albedo_texture if m0 else null)
	out.append(zh)
	inst.free()
	_real_cache[src] = out
	return out

func _build_real(tier: int) -> Dictionary:
	var D: Dictionary = DEF[tier]
	var R: Array = REAL[tier]
	var gc := Color(String(D.glow))
	var SP := _split(tier)
	var sc := REAL_W
	var seam: float = R[1]
	var zh: float = SP[3]
	_ink = StandardMaterial3D.new()
	_ink.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	_ink.cull_mode = BaseMaterial3D.CULL_FRONT
	_ink.albedo_color = Color(0.04, 0.02, 0.06)
	_ink.grow = true
	_ink.grow_amount = 0.006
	var mat := ShaderMaterial.new()
	mat.shader = load("res://shaders/chest_real.gdshader")
	mat.set_shader_parameter("tex", SP[2])
	mat.set_shader_parameter("hue", float(R[4]))
	mat.set_shader_parameter("sat", float(R[5]))
	mat.set_shader_parameter("val", float(R[6]))
	mat.set_shader_parameter("emi", 0.03)
	mat.next_pass = _ink
	var root := Node3D.new()
	root.rotation = Vector3(0.3, 0.0, 0)
	root.scale = Vector3.ONE * 0.86
	_mi(SP[0], mat, root, Vector3.ZERO, Vector3.ZERO, Vector3.ONE * sc)
	var hy := seam * sc
	var hz := (-zh + 0.04) * sc
	var lid := _grp(root, Vector3(0, hy, hz), "LID")
	_mi(SP[1], mat, lid, Vector3(0, -hy, -hz), Vector3.ZERO, Vector3.ONE * sc)
	# sandığın içi: koyu ağız + kapağın koyu iç yüzü (kesit açıkta kalmasın)
	var dark := StandardMaterial3D.new()
	dark.albedo_color = Color(0.02, 0.015, 0.03); dark.roughness = 1.0
	var w := (float(R[7]) if R.size() > 7 else 0.80) * sc; var dp := (zh * 2.0 - 0.2) * sc
	var pm := QuadMesh.new(); pm.size = Vector2(w, dp)
	_mi(pm, dark, root, Vector3(0, hy - 0.6, 0), Vector3(-90, 0, 0))
	_mi(pm, dark, lid, Vector3(0, 0.5, -hz), Vector3(90, 0, 0))
	# kilit kapakla kalkınca gövdede açılan boşluğu kapatan koyu demir levha
	var plate := StandardMaterial3D.new()
	plate.albedo_color = Color(0.11, 0.10, 0.13); plate.roughness = 0.6; plate.metallic = 0.4
	var pq := QuadMesh.new(); pq.size = Vector2(float(R[3]) * 2.0 * sc + 1.0, float(R[2]) * sc + 0.6)
	_mi(pq, plate, root, Vector3(0, hy - float(R[2]) * sc * 0.5, (zh - 0.082) * sc))
	for lp in [Vector3(0, hy + 2.0, 34.0), Vector3(38.0, hy * 0.5, 6.0)]:
		var ol := OmniLight3D.new()
		ol.light_color = gc; ol.light_energy = 0.45; ol.omni_range = 64.0; ol.omni_attenuation = 1.4
		ol.position = lp
		root.add_child(ol)
	var fz := zh * sc
	for fi in 6:
		var fx := -w * 0.5 + 3.0 + fi * (w - 6.0) / 5.0
		if absf(fx) < 10.0: continue
		_flame(root, Vector3(fx, hy + 0.4, fz + 1.0), 4.0 + 2.0 * (fi % 2), gc, fi * 1.7)
	var gq := QuadMesh.new(); gq.size = Vector2(130, 92)
	var gmm := StandardMaterial3D.new()
	gmm.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	gmm.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	gmm.blend_mode = BaseMaterial3D.BLEND_MODE_ADD
	gmm.albedo_texture = load("res://assets/chest/fx_glow.png")
	gmm.albedo_color = Color(gc.r, gc.g, gc.b, 0.3)
	gmm.set_meta("a0", 0.3)
	_halos.append(gmm)
	_mi(gq, gmm, root, Vector3(0, -1.0, 2.0), Vector3(-90, 0, 0))
	for ei in (10 + tier * 2):
		var ex := -w * 0.5 + 2.0 + fmod(ei * 7.31, 1.0) * (w - 4.0)
		_ember(root, Vector3(ex, hy, fz - fmod(ei * 3.77, 1.0) * 6.0), 16.0 + fmod(ei * 5.13, 1.0) * 22.0, gc, ei * 0.37, 0.9 + fmod(ei * 2.9, 1.0) * 1.1)
	for oi in (3 + tier / 2):
		_orbit(root, Vector3(0, 10.0 + oi * 5.0, 0), 31.0 + oi * 2.5, gc, oi * TAU / 3.0 + oi, 0.5 + 0.12 * oi)
	return {"root": root, "lid": lid, "ink": _ink, "halos": _halos, "flames": _flames, "embers": _embers, "orbits": _orbits, "glow": _glow, "pupil": null, "bobs": _bobs, "col": gc, "mouth_y": hy, "real": true}

static var _tx := {}
## elle boyanmış hissi veren sade dokular (gürültü yok): geniş yumuşak fırça şeritleri,
## kenarlara doğru koyulaşma. "wood": yatay damar şeritleri; "metal": dikey fırça + hafif leke.
static func _tex(kind: String) -> Array:
	if not _tx.has(kind): _tx[kind] = [load("res://assets/chest/tex_" + kind + ".png"), null]
	return _tx[kind]

func _mat(col: Color, metal := 0.0, rough := 0.8, kind := "") -> StandardMaterial3D:
	var k := col.to_html() + str(metal) + str(rough) + kind
	if _cache.has(k): return _cache[k]
	var m := StandardMaterial3D.new()
	m.albedo_color = col
	m.metallic = metal
	m.roughness = rough
	if kind != "":
		var t := _tex(kind)
		m.albedo_texture = t[0]
		m.roughness_texture = t[0]
		m.roughness_texture_channel = BaseMaterial3D.TEXTURE_CHANNEL_GREEN
		m.uv1_triplanar = true
		m.uv1_scale = Vector3.ONE * (0.036 if kind == "wood" else 0.06)
		m.uv1_triplanar_sharpness = 8.0
		m.texture_filter = BaseMaterial3D.TEXTURE_FILTER_LINEAR_WITH_MIPMAPS_ANISOTROPIC
	if metal > 0.5:
		m.metallic_specular = 0.7
		m.rim_enabled = true; m.rim = 0.35; m.rim_tint = 0.6
	m.next_pass = _ink
	_cache[k] = m
	return m

## toplamsal ışık halesi (yumuşak disk) — ışık kaynaklarının çevresinde
func _halo(par: Node3D, pos: Vector3, r: float, col: Color, a := 0.5, sx := 1.0) -> void:
	var q := QuadMesh.new(); q.size = Vector2(r * 2.0 * sx, r * 2.0)
	var m := StandardMaterial3D.new()
	m.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	m.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	m.blend_mode = BaseMaterial3D.BLEND_MODE_ADD
	m.billboard_mode = BaseMaterial3D.BILLBOARD_ENABLED if sx == 1.0 else BaseMaterial3D.BILLBOARD_DISABLED
	m.depth_draw_mode = BaseMaterial3D.DEPTH_DRAW_DISABLED
	m.no_depth_test = false
	m.albedo_texture = load("res://assets/chest/fx_glow.png")
	m.albedo_color = Color(col.r, col.g, col.b, a)
	m.render_priority = 3
	m.set_meta("a0", a)
	_halos.append(m)
	_mi(q, m, par, pos)

## titreşen alev dili: toplamsal, dikey gerilmiş yumuşak disk (ChestStage canlandırır)
func _flame(par: Node3D, pos: Vector3, h: float, col: Color, ph: float) -> void:
	var q := QuadMesh.new(); q.size = Vector2(h * 0.5, h); q.center_offset = Vector3(0, h * 0.42, 0)
	var m := StandardMaterial3D.new()
	m.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	m.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	m.blend_mode = BaseMaterial3D.BLEND_MODE_ADD
	m.billboard_mode = BaseMaterial3D.BILLBOARD_FIXED_Y
	m.depth_draw_mode = BaseMaterial3D.DEPTH_DRAW_DISABLED
	m.albedo_texture = load("res://assets/chest/fx_glow.png")
	m.albedo_color = Color(col.r, col.g, col.b, 0.75)
	m.render_priority = 3
	var mi := _mi(q, m, par, pos)
	_flames.append([mi, ph, m])

func _add_quad(par: Node3D, pos: Vector3, r: float, col: Color, a: float) -> Array:
	var q := QuadMesh.new(); q.size = Vector2(r * 2.0, r * 2.0)
	var m := StandardMaterial3D.new()
	m.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	m.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	m.blend_mode = BaseMaterial3D.BLEND_MODE_ADD
	m.billboard_mode = BaseMaterial3D.BILLBOARD_ENABLED
	m.depth_draw_mode = BaseMaterial3D.DEPTH_DRAW_DISABLED
	m.albedo_texture = load("res://assets/chest/fx_glow.png")
	m.albedo_color = Color(col.r, col.g, col.b, a)
	m.render_priority = 4
	return [_mi(q, m, par, pos), m]

## yükselen kor: aralıktan çıkar, süzülerek yükselir ve söner (döngülü)
func _ember(par: Node3D, pos: Vector3, h: float, col: Color, ph: float, sz: float) -> void:
	var e := _add_quad(par, pos, sz, col.lerp(Color.WHITE, 0.25), 0.0)
	_embers.append([e[0], e[1], pos, h, ph])

## sandığın çevresinde dönen ışık zerresi
func _orbit(par: Node3D, c: Vector3, r: float, col: Color, ph: float, sp: float) -> void:
	var e := _add_quad(par, c, 1.6, col.lerp(Color.WHITE, 0.35), 0.85)
	_orbits.append([e[0], c, r, ph, sp])

func _ink_mat() -> StandardMaterial3D:
	return _mat(Color(0.035, 0.03, 0.045), 0.0, 0.95)

func _gm(col: Color, e := 1.5) -> StandardMaterial3D:
	var m := StandardMaterial3D.new()
	m.albedo_color = Color(0.02, 0.02, 0.03)
	m.roughness = 1.0
	m.emission_enabled = true
	m.emission = col
	m.emission_energy_multiplier = e
	m.set_meta("e0", e)
	_glow.append(m)
	return m

func _mi(mesh: Mesh, mat: Material, par: Node3D, pos := Vector3.ZERO, rot := Vector3.ZERO, scl := Vector3.ONE) -> MeshInstance3D:
	var mi := MeshInstance3D.new()
	mi.mesh = mesh
	mi.material_override = mat
	mi.position = pos
	mi.rotation_degrees = rot
	mi.scale = scl
	mi.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	par.add_child(mi)
	return mi

## pahlı (kenarı kırık) kutu: kenarlar ışığı yakalar — düz BoxMesh'in "oyuncak" görüntüsü yok
func _box(sz: Vector3, mat: Material, par: Node3D, pos := Vector3.ZERO, rot := Vector3.ZERO) -> MeshInstance3D:
	var c := clampf(minf(sz.x, minf(sz.y, sz.z)) * 0.24, 0.1, 1.5)
	var key := "%0.2f,%0.2f,%0.2f" % [sz.x, sz.y, sz.z]
	if not _bm.has(key):
		var h := sz * 0.5
		var st := SurfaceTool.new()
		st.begin(Mesh.PRIMITIVE_TRIANGLES)
		var quad := func(a: Vector3, b: Vector3, cc: Vector3, d: Vector3):
			var nn := (b - a).cross(cc - a).normalized()
			if nn.dot((a + b + cc + d) * 0.25) < 0.0:
				var t := b; b = d; d = t
				nn = -nn
			for v in [a, cc, b, a, d, cc]:
				st.set_normal(nn); st.add_vertex(v)
		# 6 yüz
		for ax in 3:
			var u := (ax + 1) % 3; var w := (ax + 2) % 3
			for sg in [-1.0, 1.0]:
				var P: Array = []
				for q in [[-1.0, -1.0], [1.0, -1.0], [1.0, 1.0], [-1.0, 1.0]]:
					var v := Vector3.ZERO
					v[ax] = sg * h[ax]; v[u] = q[0] * (h[u] - c); v[w] = q[1] * (h[w] - c)
					P.append(v)
				quad.call(P[0], P[1], P[2], P[3])
		# 12 kenar pahı
		for ax in 3:
			var u := (ax + 1) % 3; var w := (ax + 2) % 3
			for su in [-1.0, 1.0]:
				for sw in [-1.0, 1.0]:
					var a := Vector3.ZERO; var b := Vector3.ZERO; var cc := Vector3.ZERO; var d := Vector3.ZERO
					a[ax] = -(h[ax] - c); a[u] = su * h[u]; a[w] = sw * (h[w] - c)
					b[ax] = (h[ax] - c); b[u] = su * h[u]; b[w] = sw * (h[w] - c)
					cc[ax] = (h[ax] - c); cc[u] = su * (h[u] - c); cc[w] = sw * h[w]
					d[ax] = -(h[ax] - c); d[u] = su * (h[u] - c); d[w] = sw * h[w]
					quad.call(a, b, cc, d)
		# 8 köşe üçgeni
		for sx in [-1.0, 1.0]:
			for sy in [-1.0, 1.0]:
				for sz2 in [-1.0, 1.0]:
					var a := Vector3(sx * h.x, sy * (h.y - c), sz2 * (h.z - c))
					var b := Vector3(sx * (h.x - c), sy * h.y, sz2 * (h.z - c))
					var d := Vector3(sx * (h.x - c), sy * (h.y - c), sz2 * h.z)
					var nn := Vector3(sx, sy, sz2).normalized()
					if (b - a).cross(d - a).dot(nn) < 0.0:
						var t := b; b = d; d = t
					for v in [a, d, b]:
						st.set_normal(nn); st.add_vertex(v)
		_bm[key] = st.commit()
	return _mi(_bm[key], mat, par, pos, rot)

## içi boş çerçeve: dört duvar (sandığın ağzı gerçekten oyuk olsun)
func _ring(w: float, h: float, d: float, t: float, mat: Material, par: Node3D, pos: Vector3) -> void:
	_box(Vector3(w, h, t), mat, par, pos + Vector3(0, 0, d * 0.5 - t * 0.5))
	_box(Vector3(w, h, t), mat, par, pos + Vector3(0, 0, -d * 0.5 + t * 0.5))
	_box(Vector3(t, h, d - t * 2.0 + 0.6), mat, par, pos + Vector3(w * 0.5 - t * 0.5, 0, 0))
	_box(Vector3(t, h, d - t * 2.0 + 0.6), mat, par, pos + Vector3(-w * 0.5 + t * 0.5, 0, 0))

func _torus(r: float, th: float, mat: Material, par: Node3D, pos := Vector3.ZERO, rot := Vector3.ZERO) -> MeshInstance3D:
	var m := TorusMesh.new()
	m.inner_radius = r - th; m.outer_radius = r + th; m.rings = 20; m.ring_segments = 10
	return _mi(m, mat, par, pos, rot)

func _cyl(r0: float, r1: float, h: float, seg: int, mat: Material, par: Node3D, pos := Vector3.ZERO, rot := Vector3.ZERO, scl := Vector3.ONE) -> MeshInstance3D:
	var m := CylinderMesh.new()
	m.top_radius = r1; m.bottom_radius = r0; m.height = h; m.radial_segments = seg; m.rings = 1
	return _mi(m, mat, par, pos, rot, scl)

func _sph(r: float, mat: Material, par: Node3D, pos := Vector3.ZERO, scl := Vector3.ONE, seg := 12) -> MeshInstance3D:
	var m := SphereMesh.new()
	m.radius = r; m.height = r * 2; m.radial_segments = seg; m.rings = maxi(4, seg / 2)
	return _mi(m, mat, par, pos, Vector3.ZERO, scl)

func _seg(a: Vector3, b: Vector3, r0: float, r1: float, mat: Material, par: Node3D, sides := 6) -> void:
	var d := b - a
	var mi := _cyl(r0, r1, d.length(), sides, mat, par, (a + b) * 0.5)
	var up := d.normalized()
	var ax := Vector3.UP.cross(up)
	if ax.length() > 0.0001: mi.transform.basis = Basis(ax.normalized(), Vector3.UP.angle_to(up))

func _grp(par: Node3D, pos := Vector3.ZERO, nm := "") -> Node3D:
	var n := Node3D.new()
	n.position = pos
	if nm != "": n.name = nm
	par.add_child(n)
	return n

## kapak profilleri: tür → [yükseklik oranı, kemer üssü (1 = yuvarlak, <1 basık-dolgun, >1 sivri kemer), dilim]
const LID := {"low": [0.60, 1.0, 14], "flat": [0.50, 0.55, 14], "barrel": [0.95, 1.0, 16], "gable": [1.08, 1.7, 14], "hex": [0.82, 0.8, 5]}

static func _arch(a: float, rz: float, ry: float, ex: float) -> Vector3:
	return Vector3(0, pow(maxf(0.0, sin(a)), ex) * ry, cos(a) * rz)

## bombeli yarım kapak: üst yarı kemer; uçlara doğru hafif daralır (crown) — düz silindir değil.
## solid → altı kapalı; inner → içe bakan yüzeyler
func _half(rz: float, ry: float, xlen: float, segs: int, mat: Material, par: Node3D, c: Vector3, solid := true, inner := false, ex := 1.0, crown := 0.0) -> MeshInstance3D:
	var st := SurfaceTool.new()
	st.begin(Mesh.PRIMITIVE_TRIANGLES)
	var hx := xlen * 0.5
	var XS := 8 if crown > 0.0 else 1
	var P := segs + 1
	for xi in XS + 1:
		var u := -1.0 + 2.0 * xi / XS
		var k := 1.0 - crown * pow(absf(u), 2.6)
		for i in P:
			var v := _arch(PI * i / segs, rz * k, ry * k, ex)
			st.add_vertex(Vector3(u * hx, v.y, v.z))
	for xi in XS:
		for i in segs:
			var i0 := xi * P + i; var i1 := (xi + 1) * P + i
			var q := [i0, i1 + 1, i1, i0, i0 + 1, i1 + 1] if not inner else [i0, i1, i1 + 1, i0, i1 + 1, i0 + 1]
			for id in q: st.add_index(id)
	st.generate_normals()
	var m1 := st.commit()
	# uç kapakları (+ istenirse taban) ayrı yüzey: düz normaller
	var st2 := SurfaceTool.new()
	st2.begin(Mesh.PRIMITIVE_TRIANGLES)
	var kE := 1.0 - crown
	for sx in [-1.0, 1.0]:
		var nn := Vector3(sx * (-1.0 if inner else 1.0), 0, 0)
		for i in segs:
			var p0 := _arch(PI * i / segs, rz * kE, ry * kE, ex) + Vector3(sx * hx, 0, 0)
			var p1 := _arch(PI * (i + 1) / segs, rz * kE, ry * kE, ex) + Vector3(sx * hx, 0, 0)
			var o := Vector3(sx * hx, 0, 0)
			var tri := [o, p0, p1] if (p0 - o).cross(p1 - o).dot(nn) < 0.0 else [o, p1, p0]
			for v in tri:
				st2.set_normal(nn); st2.add_vertex(v)
	if solid and not inner:
		var dn := Vector3(0, -1, 0)
		for v in [Vector3(-hx, 0, rz), Vector3(hx, 0, -rz), Vector3(hx, 0, rz), Vector3(-hx, 0, rz), Vector3(-hx, 0, -rz), Vector3(hx, 0, -rz)]:
			st2.set_normal(dn); st2.add_vertex(v)
	st2.commit(m1)
	return _mi(m1, mat, par, c)

## kapak gövdesi: x boyunca uzanan şekil (menteşe yerelinde; merkez z = +HD)
func _lid_shape(kind: String, xlen: float, k: float, mat: Material, par: Node3D, x := 0.0) -> void:
	var L: Array = LID[kind]
	var cr := 1.0 - 0.10 * pow(absf(x) / (HW + 0.5), 2.6)       # şerit, kapağın o noktadaki daralmasını izler
	_half((HD + 1.7) * k * cr, (HD + 1.7) * float(L[0]) * k * cr, xlen, int(L[2]), mat, par, Vector3(x, 0.6, HD), true, false, float(L[1]))

## kapak yüzeyinde bir nokta (a: önden arkaya açı derecesi, 0 = ön kenar, 90 = tepe)
func _lid_pt(kind: String, x: float, a: float, out := 0.0) -> Vector3:
	var L: Array = LID[kind]
	var cr := 1.0 - 0.10 * pow(absf(x) / (HW + 0.5), 2.6)
	var v := _arch(deg_to_rad(a), (HD + 1.7 + out) * cr, ((HD + 1.7) * float(L[0]) + out) * cr, float(L[1]))
	return Vector3(x, v.y + 0.6, HD + v.z)

func _lid_top(kind: String) -> float:
	return (HD + 1.7) * float(LID[kind][0]) + 0.6

## bombeli gövde halkası: yuvarlatılmış dikdörtgen kesit, dikeyde göbekli (bulge), yumuşak normaller.
## mask "corners" → yalnız köşe koruyucuları; cap_in → üst kenardan içe doğru halka kapak (duvar kalınlığı);
## inner → içe bakan duvar.
func _hull(hx: float, hz: float, rad: float, y0: float, y1: float, bulge: float, mat: Material, par: Node3D, mask := "", cap_in := 0.0, inner := false, lv := 8, c := Vector3.ZERO, cap_bot := false) -> MeshInstance3D:
	var pts: Array = []          # kesit noktaları (x,z), saat yönünün tersine
	var corner: Array = []
	for k in 4:
		var sx: float = [1.0, 1.0, -1.0, -1.0][k]; var sz: float = [1.0, -1.0, -1.0, 1.0][k]
		var cx := sx * (hx - rad); var cz := sz * (hz - rad)
		for i in 7:
			var th := PI * 0.5 * i / 6.0
			var ex2 := Vector2(sx * (sin(th) if (k % 2 == 0) else cos(th)), sz * (cos(th) if (k % 2 == 0) else sin(th)))
			pts.append(Vector2.ZERO)
			pts[-1] = Vector2(cx + ex2.x * rad, cz + ex2.y * rad)
			corner.append(true)
		# köşeden sonraki düz kenar: 3 ara nokta (bir sonraki köşeye doğru)
		var nk := (k + 1) % 4
		var nsx: float = [1.0, 1.0, -1.0, -1.0][nk]; var nsz: float = [1.0, -1.0, -1.0, 1.0][nk]
		var pa: Vector2 = pts[-1]
		var th0 := 0.0
		var ex3 := Vector2(nsx * (sin(th0) if (nk % 2 == 0) else cos(th0)), nsz * (cos(th0) if (nk % 2 == 0) else sin(th0)))
		var pb := Vector2(nsx * (hx - rad) + ex3.x * rad, nsz * (hz - rad) + ex3.y * rad)
		for i in range(1, 4):
			pts.append(pa.lerp(pb, i / 4.0)); corner.append(i == 1 or i == 3)
	var P := pts.size()
	var st := SurfaceTool.new()
	st.begin(Mesh.PRIMITIVE_TRIANGLES)
	for j in lv + 1:
		var t := float(j) / lv
		var sc := (1.0 + bulge * pow(sin(PI * t), 0.85)) * lerpf(0.955, 1.0, t)
		for i in P:
			var q: Vector2 = pts[i]
			st.add_vertex(Vector3(q.x * sc, lerpf(y0, y1, t), q.y * sc))
	var base := (lv + 1) * P
	if cap_in > 0.0:
		for i in P:
			var q2: Vector2 = pts[i]
			var kx := (hx - cap_in) / hx; var kz := (hz - cap_in) / hz
			st.add_vertex(Vector3(q2.x * kx, y1, q2.y * kz))
	# sarım yönü: kesit noktalarının dönüş yönünden bağımsız olsun diye ilk dörtlüde sına
	var flip := false
	var A0: Vector2 = pts[0]; var A1: Vector2 = pts[1]
	var nrm := Vector3(A1.x - A0.x, 0, A1.y - A0.y).cross(Vector3(0, 1, 0))
	if nrm.dot(Vector3(A0.x, 0, A0.y)) > 0.0: flip = true
	if inner: flip = not flip
	for j in lv:
		for i in P:
			if mask == "corners" and not (corner[i] and corner[(i + 1) % P]): continue
			var i0 := j * P + i; var i1 := j * P + (i + 1) % P
			var i2 := (j + 1) * P + (i + 1) % P; var i3 := (j + 1) * P + i
			var q := [i0, i3, i2, i0, i2, i1] if flip else [i0, i2, i3, i0, i1, i2]
			for id in q: st.add_index(id)
	if cap_in > 0.0:
		for i in P:
			var o0 := lv * P + i; var o1 := lv * P + (i + 1) % P
			var n0 := base + i; var n1 := base + (i + 1) % P
			var q := [o0, n0, n1, o0, n1, o1] if flip else [o0, n1, n0, o0, o1, n1]
			for id in q: st.add_index(id)
	st.generate_normals()
	var m := st.commit()
	if cap_bot:
		var st2 := SurfaceTool.new()
		st2.begin(Mesh.PRIMITIVE_TRIANGLES)
		for i in P:
			var q0: Vector2 = pts[i] * 0.955; var q1: Vector2 = pts[(i + 1) % P] * 0.955
			var tri := [Vector3(0, y0, 0), Vector3(q0.x, y0, q0.y), Vector3(q1.x, y0, q1.y)]
			if (tri[1] - tri[0]).cross(tri[2] - tri[0]).dot(Vector3(0, -1, 0)) > 0.0: tri = [tri[0], tri[2], tri[1]]
			for v in tri:
				st2.set_normal(Vector3(0, -1, 0)); st2.add_vertex(v)
		st2.commit(m)
	return _mi(m, mat, par, c)

## gövdenin bombesini izleyen ön kuşak: kalın metal şerit (ön yüz + iki yan yüz), yumuşak normaller
func _strap(bx: float, w: float, y0: float, y1: float, bulge: float, out: float, th: float, mat: Material, par: Node3D, back := false) -> void:
	var st := SurfaceTool.new()
	st.begin(Mesh.PRIMITIVE_TRIANGLES)
	var LV := 8
	var sg := -1.0 if back else 1.0
	for j in LV + 1:
		var t := float(j) / LV
		var sc := (1.0 + bulge * pow(sin(PI * t), 0.85)) * lerpf(0.955, 1.0, t)
		var z := sg * (HD * sc + out)
		var y := lerpf(y0, y1, t)
		for q in [[bx - w, z - sg * th], [bx - w, z], [bx + w, z], [bx + w, z - sg * th]]:
			st.add_vertex(Vector3(q[0], y, q[1]))
	for j in LV:
		for k in 3:
			var a := j * 4 + k; var b := a + 1; var c := a + 5; var d := a + 4
			var q2 := [a, c, b, a, d, c] if not back else [a, b, c, a, c, d]
			for id in q2: st.add_index(id)
	st.generate_normals()
	_mi(st.commit(), mat, par)

func _rune(par: Node3D, p: Vector3, g: Material, s := 1.0, v := 0) -> void:
	var r := _grp(par, p)
	_box(Vector3(0.7 * s, 7.0 * s, 0.4), g, r)
	if v % 2 == 0:
		_box(Vector3(4.0 * s, 0.7 * s, 0.4), g, r, Vector3(0, 1.2 * s, 0), Vector3(0, 0, 38))
		_box(Vector3(3.2 * s, 0.7 * s, 0.4), g, r, Vector3(0, -1.8 * s, 0), Vector3(0, 0, -38))
	else:
		_box(Vector3(3.4 * s, 0.7 * s, 0.4), g, r, Vector3(1.2 * s, 1.8 * s, 0), Vector3(0, 0, -40))
		_box(Vector3(3.4 * s, 0.7 * s, 0.4), g, r, Vector3(-1.2 * s, -1.2 * s, 0), Vector3(0, 0, -40))

func _build(tier: int) -> Dictionary:
	var D: Dictionary = DEF[tier]
	_ink = StandardMaterial3D.new()
	_ink.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	_ink.cull_mode = BaseMaterial3D.CULL_FRONT
	_ink.albedo_color = Color(0.05, 0.03, 0.08)
	_ink.grow = true
	_ink.grow_amount = 0.6
	var gc := Color(String(D.glow))
	var bc := Color(String(D.body)).darkened(0.2)
	var body := _mat(bc.darkened(0.35), 0.0, 0.75, "wood")
	var body2 := _mat(bc, 0.0, 0.62, "wood")
	var body3 := _mat(bc.lightened(0.1), 0.0, 0.62, "wood")
	var mc := Color(String(D.metal)).darkened(0.0 if tier == 3 else 0.28)
	var trim := _mat(mc, 0.6, 0.32, "metal")
	var trim2 := _mat(mc.darkened(0.32), 0.55, 0.42, "metal")
	var acc := _mat(Color(String(D.acc)).darkened(0.08), 0.65, 0.26, "metal")
	var bone := _mat(Color("#e6dcc6"), 0.0, 0.6)
	var dark := _mat(Color("#0c0910"), 0.0, 0.9)
	var g1 := _gm(gc, 1.5)
	var g2 := _gm(gc.lerp(Color.WHITE, 0.1), 2.0)
	var gem := _gm(gc.darkened(0.12), 1.05)
	var kind: String = D.lid
	var root := Node3D.new()
	root.rotation = Vector3(0.3, 0.0, 0)
	root.scale = Vector3.ONE * 0.86      # üç çeyrek + hafif üstten: mobil oyun sandık duruşu
	var lid := _grp(root, Vector3(0, HY, -HD), "LID")
	for lp in [Vector3(0, BH + 2.0, HD + 18.0), Vector3(HW + 18.0, BH * 0.5, 4.0)]:
		var ol := OmniLight3D.new()
		ol.light_color = gc; ol.light_energy = 1.6; ol.omni_range = 60.0; ol.omni_attenuation = 1.4
		ol.position = lp
		root.add_child(ol)

	# ── gövde: bombeli (göbekli) oyun sandığı — yuvarlak köşeler, oyuk iç ──
	var FLY := BH - 11.0
	var RAD := 6.4
	_hull(HW, HD, RAD, 0.0, BH, 0.085, body2, root, "", 2.8)                       # dış kabuk + ağız kenarı
	_hull(HW - 2.8, HD - 2.8, RAD - 2.0, FLY, BH, 0.0, _mat(bc.darkened(0.6), 0.0, 0.95, "wood"), root, "", 0.0, true, 2)   # iç duvar
	_hull(HW - 2.6, HD - 2.6, RAD - 2.0, FLY - 0.6, FLY, 0.0, dark, root, "", HW - 3.0, false, 1)   # iç taban
	# taban kuşağı + ağız çemberi (kalın, yuvarlak)
	_hull(HW + 1.5, HD + 1.5, RAD + 1.2, -1.0, 4.6, 0.02, trim2, root, "", 3.0, false, 3, Vector3.ZERO, true)
	_hull(HW + 1.2, HD + 1.2, RAD + 1.0, 4.6, 6.2, 0.0, acc, root, "", 2.0, false, 1)
	_hull(HW + 2.4, HD + 2.4, RAD + 1.6, BH - 4.6, BH + 0.8, 0.0, trim, root, "", 5.0, false, 2)
	_hull(HW + 2.9, HD + 2.9, RAD + 1.9, BH - 5.8, BH - 4.6, 0.0, acc, root, "", 1.2, false, 1)
	# kapak aralığı (ışık şeridi)
	_hull(HW + 0.9, HD + 0.9, RAD + 0.6, BH + 0.8, HY + 1.0, 0.0, g1, root, "", 2.2, false, 1)
	# köşe koruyucuları: gövdenin bombesini izleyen kalın metal + perçinler
	_hull(HW + 1.1, HD + 1.1, RAD + 0.9, 5.4, BH - 5.0, 0.085, trim, root, "corners", 0.0, false, 8)
	for sx in [-1.0, 1.0]:
		for sz in [-1.0, 1.0]:
			# topuz ayaklar
			_sph(5.2, trim2, root, Vector3(sx * (HW - 2.6), -1.8, sz * (HD - 2.6)), Vector3(1, 0.7, 1), 12)
			# kapak köşe topuzları (kapakla birlikte kalkar)
			var capm: Material = _mat(Color("#eaf6ff"), 0.0, 0.5) if tier == 5 else acc
			if tier == 4 or tier == 7:
				_cyl(1.9, 0.0, 5.6, 6, acc if tier == 7 else trim2, lid, Vector3(sx * (HW - 0.6), 8.2, HD + sz * (HD - 0.6)), Vector3(sz * 10, 0, -sx * 10))
	# ── kapak: bombeli gövde + yuvarlak çerçeve + kalın şeritler ──
	var LK: Array = LID[kind]
	_half(HD + 1.7, (HD + 1.7) * float(LK[0]), HW * 2 + 3.2, int(LK[2]), body3, lid, Vector3(0, 0.6, HD), false, false, float(LK[1]), 0.09)
	_hull(HW + 2.6, HD + 2.6, RAD + 1.8, 0.0, 3.6, 0.0, trim, lid, "", 6.4, false, 2, Vector3(0, 0, HD), false)
	_hull(HW + 3.1, HD + 3.1, RAD + 2.1, 0.0, 1.1, 0.0, acc, lid, "", 1.4, false, 1, Vector3(0, 0, HD))
	# kapağın iç yüzü: koyu ahşap panel
	var lin := _mat(bc.darkened(0.7), 0.0, 0.95, "wood")
	_box(Vector3(HW * 2 + 1.6, 0.9, HD * 2 + 1.6), lin, lid, Vector3(0, 0.9, HD))
	for bx in [-HW + 9.0, HW - 9.0]:
		_lid_shape(kind, 7.2, 1.05, trim, lid, bx)
		for e in [-3.9, 3.9]: _lid_shape(kind, 0.9, 1.075, acc, lid, bx + e)
	# yan halka kulplar (iri)
	for sx in [-1.0, 1.0]:
		_sph(3.0, acc, root, Vector3(sx * (HW + 1.9), BH * 0.6, 0), Vector3(0.6, 1, 1), 10)
		_torus(4.2, 0.95, trim, root, Vector3(sx * (HW + 3.6), BH * 0.6 - 4.0, 0), Vector3(0, 0, 90.0 + sx * 18.0))
	# ── ışık: haleler, alevler, zemin havuzu ──
	_halo(root, Vector3(0, HY + 0.2, HD + 2.4), 8.0, gc, 0.5, 5.6)
	_halo(root, Vector3(0, BH - 2.0, HD + 9.0), 15.0, gc, 0.45)
	if String(D.crest) != "": _halo(lid, Vector3(0, _lid_top(kind) + 6.0, HD + 1.0), 11.0, gc, 0.45)
	for fi in 6:
		var fx := -HW + 4.0 + fi * (HW * 2 - 8.0) / 5.0
		if absf(fx) < 7.0: continue
		_flame(root, Vector3(fx, HY + 0.6, HD + 2.0), 7.0 + 3.0 * (fi % 2), gc, fi * 1.7)
	var gq := QuadMesh.new(); gq.size = Vector2(130, 92)
	var gmm := StandardMaterial3D.new()
	gmm.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	gmm.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	gmm.blend_mode = BaseMaterial3D.BLEND_MODE_ADD
	gmm.albedo_texture = load("res://assets/chest/fx_glow.png")
	gmm.albedo_color = Color(gc.r, gc.g, gc.b, 0.4)
	gmm.set_meta("a0", 0.4)
	_halos.append(gmm)
	_mi(gq, gmm, root, Vector3(0, -3.0, 2.0), Vector3(-90, 0, 0))
	for ei in (10 + tier * 2):
		var ex := -HW + 2.0 + fmod(ei * 7.31, 1.0) * (HW * 2 - 4.0)
		var ez := HD + 1.0 - fmod(ei * 3.77, 1.0) * 6.0
		_ember(root, Vector3(ex, HY, ez), 16.0 + fmod(ei * 5.13, 1.0) * 22.0, gc, ei * 0.37, 0.9 + fmod(ei * 2.9, 1.0) * 1.1)
	for oi in (3 + tier / 2):
		_orbit(root, Vector3(0, 10.0 + oi * 5.0, 0), 31.0 + oi * 2.5, gc, oi * TAU / 3.0 + oi, 0.5 + 0.12 * oi)
	# ön/arka kuşaklar: kapak şeritlerinin devamı, altın kenarlı; ortasında ışıyan mücevher
	for bx in [-HW + 9.0, HW - 9.0]:
		for bk in [false, true]:
			_strap(bx, 3.6, 5.6, BH - 4.8, 0.085, 1.5, 1.6, trim, root, bk)
			for e in [-3.9, 3.9]: _strap(bx + e, 0.5, 5.6, BH - 4.8, 0.085, 1.8, 1.9, acc, root, bk)
		var rr := _grp(root, Vector3(bx, BH * 0.5 - 1.0, HD * 1.085 + 1.7))
		_cyl(3.0, 3.0, 1.0, 4, acc, rr, Vector3.ZERO, Vector3(90, 45, 0))
		_cyl(2.2, 0.0, 2.0, 4, gem, rr, Vector3(0, 0, 0.9), Vector3(90, 45, 0))
		_halo(rr, Vector3(0, 0, 2.4), 6.0, gc, 0.6 if tier >= 3 else 0.4)
	# kapağın ön yüzünde alın madalyonu (kilidin üstünde): küçük taş + altın yuva
	var fm := _grp(lid, _lid_pt(kind, 0.0, 30.0, 1.4))
	fm.rotation_degrees.x = -52.0
	_cyl(3.4, 3.4, 0.9, 8, acc, fm, Vector3.ZERO, Vector3(90, 22.5, 0))
	_cyl(2.3, 0.0, 1.6, 8, gem, fm, Vector3(0, 0, 0.8), Vector3(90, 22.5, 0))
	_halo(fm, Vector3(0, 0, 2.0), 5.0, gc, 0.5)
	if tier == 6:
		for sx in [-1.0, 1.0]:
			var ta := Vector3(sx * (HW + 3.0), 2.0, 6.0)
			var tb := ta + Vector3(sx * 6.0, 7.0, 1.0); var tc := tb + Vector3(sx * -1.0, 8.0, 0.6); var td := tc + Vector3(sx * -4.4, 4.0, 0)
			_seg(ta, tb, 2.4, 2.0, trim, root, 8); _seg(tb, tc, 2.0, 1.4, trim, root, 8); _seg(tc, td, 1.4, 0.3, trim, root, 8)
			_sph(2.0, trim, root, tb, Vector3.ONE, 8); _sph(1.4, trim, root, tc, Vector3.ONE, 8)

	# ── kilit ──
	var lk := _grp(root, Vector3(0, BH - 2.0, HD + 4.0))
	lk.scale = Vector3.ONE * 1.55
	match String(D.lock):
		"ring":
			_box(Vector3(7.0, 8.4, 1.4), trim2, lk, Vector3(0, -1.0, 0))
			_cyl(2.6, 2.6, 1.2, 14, trim, lk, Vector3(0, -2.0, 0.9), Vector3(90, 0, 0))
			_cyl(1.5, 1.5, 1.4, 12, gem, lk, Vector3(0, -2.0, 1.0), Vector3(90, 0, 0))
		"shield":
			_cyl(5.4, 5.4, 1.4, 5, trim2, lk, Vector3(0, -1.2, 0), Vector3(90, 180, 0))
			_cyl(3.9, 3.9, 1.5, 5, acc, lk, Vector3(0, -1.2, 0.5), Vector3(90, 180, 0))
			var sg := _grp(lk, Vector3(0, -1.0, 1.6))
			_cyl(2.0, 0.0, 1.6, 6, gem, sg, Vector3(0, 0, 0.6), Vector3(90, 0, 0))
			_cyl(2.0, 2.3, 0.5, 6, gem, sg, Vector3(0, 0, -0.2), Vector3(90, 0, 0))
		"sun":
			_cyl(5.2, 5.2, 1.3, 8, acc, lk, Vector3(0, -1.0, 0), Vector3(90, 22.5, 0))
			for i in 8: _cyl(1.0, 0.0, 3.4, 4, trim, lk, Vector3(cos(i * TAU / 8) * 5.6, -1.0 + sin(i * TAU / 8) * 5.6, 0.2), Vector3(0, 0, i * 45.0 - 90.0))
			_cyl(3.4, 3.4, 1.5, 16, trim, lk, Vector3(0, -1.0, 0.5), Vector3(90, 0, 0))
			_sph(2.1, gem, lk, Vector3(0, -1.0, 1.3), Vector3(1, 1, 0.6), 12)
		"skull":
			_cyl(6.6, 6.6, 1.4, 6, acc, lk, Vector3(0, -0.6, -0.2), Vector3(90, 0, 0))
			_sph(4.0, bone, lk, Vector3(0, 0.8, 1.2), Vector3(1.0, 0.95, 0.8), 14)
			_box(Vector3(4.2, 2.8, 2.6), bone, lk, Vector3(0, -2.6, 1.3))
			for sx in [-1.0, 1.0]: _sph(1.15, gem, lk, Vector3(sx * 1.55, 1.0, 3.9), Vector3(1, 1.1, 0.6), 8)
			_cyl(0.5, 0.0, 1.2, 3, dark, lk, Vector3(0, -0.8, 4.2))
			for i in 4: _box(Vector3(0.7, 1.2, 0.4), _mat(Color("#948c80")), lk, Vector3(-1.4 + i * 0.93, -3.4, 2.7))
		"crystal":
			_cyl(5.6, 5.6, 1.3, 4, acc, lk, Vector3(0, -1.0, 0), Vector3(90, 0, 0))
			_cyl(2.4, 0.0, 4.6, 6, gem, lk, Vector3(0, 1.3, 1.2))
			_cyl(0.0, 2.4, 3.4, 6, gem, lk, Vector3(0, -2.7, 1.2))
		"eye":
			_cyl(6.8, 6.8, 1.4, 16, acc, lk, Vector3(0, -0.6, 0), Vector3(90, 0, 0), Vector3(1, 1, 0.78))
			_sph(4.6, bone, lk, Vector3(0, -0.6, 0.6), Vector3(1.0, 0.66, 0.5), 16)
			_sph(2.5, gem, lk, Vector3(0, -0.6, 2.0), Vector3(1, 1, 0.5), 12)
			_pupil = _sph(1.0, dark, lk, Vector3(0, -0.6, 3.0), Vector3(1.15, 2.3, 0.4), 8)
			for sx in [-1.0, 1.0]:
				_seg(Vector3(sx * 6.6, -0.6, 0.4), Vector3(sx * 9.6, 1.4, 0.4), 0.9, 0.2, trim, lk, 5)
				_seg(Vector3(sx * 6.4, -2.2, 0.4), Vector3(sx * 9.0, -4.4, 0.4), 0.8, 0.2, trim, lk, 5)
		"dragon":
			_cyl(6.6, 6.6, 1.4, 8, acc, lk, Vector3(0, -0.6, -0.2), Vector3(90, 22.5, 0))
			_cyl(5.0, 5.0, 1.5, 8, trim2, lk, Vector3(0, -0.6, 0.2), Vector3(90, 22.5, 0))
			var rg := _grp(lk, Vector3(0, -0.6, 1.4))
			_cyl(3.0, 0.0, 2.2, 8, gem, rg, Vector3(0, 0, 1.0), Vector3(90, 0, 0))
			_cyl(3.0, 3.4, 0.7, 8, gem, rg, Vector3(0, 0, -0.3), Vector3(90, 0, 0))
			for ci in 4:
				var ca := ci * TAU / 4.0 + PI / 4.0
				var c0 := Vector3(cos(ca) * 6.4, -0.6 + sin(ca) * 6.4, 0.4)
				var c1 := Vector3(cos(ca) * 5.2, -0.6 + sin(ca) * 5.2, 2.6)
				var c2 := Vector3(cos(ca) * 3.5, -0.6 + sin(ca) * 3.5, 3.2)
				_seg(c0, c1, 1.2, 0.9, acc, lk, 6); _seg(c1, c2, 0.9, 0.15, acc, lk, 6)
				_sph(1.2, acc, lk, c1, Vector3.ONE, 8)
	# ── tepe süsü ──
	var ty := _lid_top(kind)
	var top := _grp(lid, Vector3(0, ty, HD))
	match String(D.crest):
		"crown":
			_cyl(3.6, 4.2, 1.8, 8, trim2, top, Vector3(0, 0.6, 0))
			for i in 5: _cyl(0.9, 0.0, 3.4, 4, trim, top, Vector3(cos(i * TAU / 5 + 0.3) * 3.2, 2.8, sin(i * TAU / 5 + 0.3) * 3.2))
			var cgem := _sph(1.7, gem, top, Vector3(0, 3.4, 0), Vector3(1, 1.3, 1), 8)
			_bobs.append([cgem, 3.4, 0.8, 3.2, 0.0])
		"horns":
			_cyl(3.6, 4.6, 2.0, 8, acc, top, Vector3(0, 0.4, 0))
			var cr := _grp(top, Vector3(0, 4.6, 0))
			_cyl(2.1, 0.0, 5.4, 6, gem, cr, Vector3(0, 1.4, 0))
			_cyl(0.0, 2.1, 2.0, 6, gem, cr, Vector3(0, -2.3, 0))
			_bobs.append([cr, 4.6, 0.9, 3.4, 0.0])
			for sx in [-1.0, 1.0]:
				_seg(Vector3(sx * 3.0, 0.6, 0), Vector3(sx * 9.4, 2.6, 0), 1.7, 1.35, trim, top)
				_seg(Vector3(sx * 9.4, 2.6, 0), Vector3(sx * 12.2, 8.6, 0), 1.35, 0.8, trim, top)
				_seg(Vector3(sx * 12.2, 8.6, 0), Vector3(sx * 10.2, 15.2, 0), 0.8, 0.0, trim, top)
		"ice":
			_cyl(5.0, 6.0, 2.2, 8, acc, top, Vector3(0, 0.2, 0))
			var ic := _grp(top, Vector3(0, 7.2, 0))
			_cyl(3.6, 0.0, 5.0, 6, gem, ic, Vector3(0, 3.6, 0))
			_cyl(3.6, 3.6, 2.4, 6, gem, ic, Vector3(0, 0, 0))
			_cyl(0.0, 3.6, 3.0, 6, gem, ic, Vector3(0, -2.7, 0))
			_bobs.append([ic, 7.2, 1.0, 3.6, 0.0])
		"gem":
			_cyl(3.4, 4.4, 1.8, 6, acc, top, Vector3(0, 0.4, 0))
			var fl := _grp(top, Vector3(0, 7.0, 0))
			_cyl(2.6, 0.0, 4.4, 4, gem, fl, Vector3(0, 2.2, 0))
			_cyl(0.0, 2.6, 4.4, 4, gem, fl, Vector3(0, -2.2, 0))
			_bobs.append([fl, 7.0, 1.2, 3.6, 0.0])
			for i in 3:
				var orb := _sph(0.8, g1, top, Vector3(cos(i * TAU / 3) * 6.6, 5.0 + i, sin(i * TAU / 3) * 4.0), Vector3.ONE, 6)
				_bobs.append([orb, 5.0 + i, 1.6, 2.6 + i * 0.5, i * 0.7])
			for sx in [-1.0, 1.0]:
				_seg(Vector3(sx * 3.4, 0.4, 0), Vector3(sx * 7.6, 3.4, 0), 1.3, 0.9, trim, top)
				_seg(Vector3(sx * 7.6, 3.4, 0), Vector3(sx * 6.6, 8.4, 0), 0.9, 0.0, trim, top)
		"dragon":
			_cyl(3.8, 4.8, 2.0, 8, acc, top, Vector3(0, 0.4, 0))
			# sırt dikenleri
			for i in 5:
				var dx := -9.6 + i * 4.8
				var hh := 6.4 - absf(dx) * 0.28
				_cyl(1.5, 0.0, hh, 4, bone, top, Vector3(dx, hh * 0.5 - 0.4, 0), Vector3(0, 45, 0), Vector3(0.5, 1, 1.4))
			# kanatlar
			for sx in [-1.0, 1.0]:
				var w0 := Vector3(sx * 13.0, -2.0, -3.0)
				var w1 := w0 + Vector3(sx * 7.0, 9.0, -3.0); var w2 := w1 + Vector3(sx * 6.0, -3.0, -1.0)
				_seg(w0, w1, 1.3, 0.9, trim, top); _seg(w1, w2, 0.9, 0.2, trim, top)
				_seg(w1, w0 + Vector3(sx * 9.0, -1.0, -2.0), 0.6, 0.15, trim, top)
				_seg(w1, w0 + Vector3(sx * 4.4, -3.0, -1.6), 0.6, 0.15, trim, top)
	return {"root": root, "lid": lid, "ink": _ink, "halos": _halos, "flames": _flames, "embers": _embers, "orbits": _orbits, "glow": _glow, "pupil": _pupil, "bobs": _bobs, "col": gc}
