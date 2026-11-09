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
var _bm := {}

static func build(tier: int) -> Dictionary:
	var b := ChestModel.new()
	return b._build(clampi(tier, 1, 7))

## yordamsal dokular (bir kez üretilir): ahşap damarı ve dövme metal — albedo + normal
static var _tx := {}
static func _tex(kind: String) -> Array:
	if _tx.has(kind): return _tx[kind]
	var n := FastNoiseLite.new()
	n.noise_type = FastNoiseLite.TYPE_SIMPLEX_SMOOTH
	n.seed = 7 if kind == "wood" else 19
	n.frequency = 0.035
	var n2 := FastNoiseLite.new()
	n2.noise_type = FastNoiseLite.TYPE_CELLULAR if kind == "metal" else FastNoiseLite.TYPE_SIMPLEX
	n2.seed = 33; n2.frequency = 0.09 if kind == "metal" else 0.25
	var W := 256
	var im := Image.create(W, W, false, Image.FORMAT_RGB8)
	var hm := Image.create(W, W, false, Image.FORMAT_RGB8)
	for y in W:
		for x in W:
			var v := 0.0; var h := 0.0
			if kind == "wood":
				# damar: x boyunca uzun çizgiler + budak dalgası
				var wv := n.get_noise_2d(x * 0.35, y * 0.9) * 6.0
				var g := 0.5 + 0.5 * sin((y + wv * 9.0) * 0.55)
				var f := n2.get_noise_2d(x * 0.5, y * 6.0)
				v = 0.62 + 0.26 * g + 0.12 * f
				h = 0.5 + 0.35 * g + 0.15 * f
				# kalas derzi
				var jy := y % 64
				if jy < 3: v *= 0.35; h = 0.0
			else:
				var c := n2.get_noise_2d(x, y)             # dövme izleri (hücresel)
				var f2 := n.get_noise_2d(x * 3.0, y * 3.0)
				var sc := n.get_noise_2d(x * 0.4, y * 14.0)   # fırça çizikleri
				v = 0.80 + 0.12 * c + 0.06 * f2 + 0.05 * sc
				h = 0.5 + 0.4 * c + 0.1 * sc
			v = clampf(v, 0.0, 1.0); h = clampf(h, 0.0, 1.0)
			im.set_pixel(x, y, Color(v, v, v))
			hm.set_pixel(x, y, Color(h, h, h))
	hm.bump_map_to_normal_map(6.0 if kind == "wood" else 3.5)
	im.generate_mipmaps(); hm.generate_mipmaps()
	_tx[kind] = [ImageTexture.create_from_image(im), ImageTexture.create_from_image(hm)]
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
		m.normal_enabled = true
		m.normal_texture = t[1]
		m.normal_scale = 1.0 if kind == "wood" else 0.6
		m.uv1_triplanar = true
		m.uv1_scale = Vector3.ONE * (0.045 if kind == "wood" else 0.11)
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

## kapak gövdesi: x boyunca uzanan şekil (menteşe yerelinde; merkez z = +HD)
func _lid_shape(kind: String, xlen: float, k: float, mat: Material, par: Node3D, x := 0.0) -> void:
	var c := Vector3(x, 0, HD)
	match kind:
		"low": _cyl(HD * k, HD * k, xlen, 20, mat, par, c, Vector3(0, 0, 90), Vector3(0.62, 1, 1))
		"barrel": _cyl(HD * k, HD * k, xlen, 24, mat, par, c, Vector3(0, 0, 90), Vector3(0.95, 1, 1))
		"hex": _cyl(HD * k * 1.06, HD * k * 1.06, xlen, 6, mat, par, c, Vector3(0, 0, 90), Vector3(0.74, 1, 1))
		"flat":
			_box(Vector3(xlen, 6.0 * k, HD * 2 * k), mat, par, c + Vector3(0, 3.0 * k, 0))
			_box(Vector3(xlen * (0.86 if xlen > 10 else 1.0), 4.4 * k, HD * 1.5 * k), mat, par, c + Vector3(0, 7.6 * k, 0))
		"gable":
			var pm := PrismMesh.new()
			pm.size = Vector3(HD * 2 * k, 15.0 * k, xlen)
			_mi(pm, mat, par, c + Vector3(0, 7.5 * k, 0), Vector3(0, 90, 0))

## kapak yüzeyinde bir nokta (a: önden arkaya açı derecesi, 0 = ön kenar, 90 = tepe)
func _lid_pt(kind: String, x: float, a: float, out := 0.0) -> Vector3:
	var r := deg_to_rad(a)
	match kind:
		"low": return Vector3(x, sin(r) * (HD * 0.62 + out), HD + cos(r) * (HD + out))
		"barrel": return Vector3(x, sin(r) * (HD * 0.95 + out), HD + cos(r) * (HD + out))
		"hex": return Vector3(x, sin(r) * (HD * 0.74 + out), HD + cos(r) * (HD * 0.98 + out))
		"flat": return Vector3(x, (10.0 if a > 40.0 else 4.0) + out, HD + cos(r) * (HD * (0.75 if a > 40.0 else 1.0) + out))
		_:  # gable
			var t := 1.0 - absf(cos(r))
			return Vector3(x, t * 15.0 + out, HD + cos(r) * HD)

func _lid_top(kind: String) -> float:
	return {"low": HD * 0.62, "barrel": HD * 0.95, "hex": HD * 0.74, "flat": 9.8, "gable": 15.0}[kind]

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
	var bc := Color(String(D.body))
	var body := _mat(bc.darkened(0.3), 0.0, 0.7)
	var body2 := _mat(bc, 0.0, 0.6)
	var body3 := _mat(bc.lightened(0.14), 0.0, 0.6)
	var mc := Color(String(D.metal))
	var trim := _mat(mc, 0.55, 0.34)
	var trim2 := _mat(mc.darkened(0.3), 0.5, 0.42)
	var acc := _mat(Color(String(D.acc)), 0.6, 0.28)
	var bone := _mat(Color("#e6dcc6"), 0.0, 0.6)
	var dark := _mat(Color("#0c0910"), 0.0, 0.9)
	var g1 := _gm(gc, 1.5)
	var g2 := _gm(gc.lerp(Color.WHITE, 0.1), 2.0)
	var kind: String = D.lid
	var root := Node3D.new()
	root.rotation = Vector3(0.2, -0.5, 0)
	root.scale = Vector3.ONE * 0.86      # üç çeyrek + hafif üstten: mobil oyun sandık duruşu
	var lid := _grp(root, Vector3(0, HY, -HD), "LID")
	for lp in [Vector3(0, BH + 2.0, HD + 18.0), Vector3(HW + 18.0, BH * 0.5, 4.0)]:
		var ol := OmniLight3D.new()
		ol.light_color = gc; ol.light_energy = 1.6; ol.omni_range = 60.0; ol.omni_attenuation = 1.4
		ol.position = lp
		root.add_child(ol)

	# ── gövde: iri, tombul; üç kalın kalas, derin derzler ──
	_box(Vector3(HW * 2 - 1.0, BH, HD * 2 - 1.0), body, root, Vector3(0, BH * 0.5, 0))
	for i in 3:
		var py := 4.4 + i * 6.9
		var pm: Material = [body2, body3, body2][i]
		_box(Vector3(HW * 2 + 1.2, 6.0, HD * 2 + 1.2), pm, root, Vector3(0, py, 0))
	# taban + üst çember (kalın)
	_box(Vector3(HW * 2 + 5.0, 4.2, HD * 2 + 5.0), trim2, root, Vector3(0, 0.6, 0))
	_box(Vector3(HW * 2 + 4.4, 3.6, HD * 2 + 4.4), trim, root, Vector3(0, BH - 0.8, 0))
	_box(Vector3(HW * 2 + 5.0, 1.0, HD * 2 + 5.0), acc, root, Vector3(0, BH + 0.9, 0))
	# kapak aralığı (ışık şeridi)
	_box(Vector3(HW * 2 + 1.4, 2.0, HD * 2 + 1.4), g2, root, Vector3(0, HY + 0.1, 0))
	# iri köşe dikmeleri + yuvarlak başlık + topuz ayak
	for sx in [-1.0, 1.0]:
		for sz in [-1.0, 1.0]:
			var cp := Vector3(sx * (HW + 0.9), 0, sz * (HD + 0.9))
			_cyl(3.6, 3.6, BH + 1.0, 10, trim, root, cp + Vector3(0, BH * 0.5, 0))
			_sph(4.2, acc, root, cp + Vector3(0, BH + 1.0, 0), Vector3(1, 0.7, 1), 10)
			_sph(4.8, trim2, root, cp + Vector3(0, -1.2, 0), Vector3(1, 0.75, 1), 10)
	# geniş kuşaklar: gövde + kapak, iri perçinli
	for bx in [-HW + 8.4, HW - 8.4]:
		_box(Vector3(7.6, BH + 0.6, HD * 2 + 3.6), trim, root, Vector3(bx, BH * 0.5, 0))
		_lid_shape(kind, 7.6, 1.06, trim, lid, bx)
		for yy in [5.0, BH - 6.4]:
			_sph(2.0, acc, root, Vector3(bx, yy, HD + 2.0), Vector3(1, 1, 0.7), 10)
		for a in [34.0, 90.0]:
			_sph(2.0, acc, lid, _lid_pt(kind, bx, a, 1.1), Vector3.ONE * 0.9, 10)
	# ── kapak: dolgun gövde + kalın çerçeve + uç kapakları ──
	_lid_shape(kind, HW * 2 + 1.0, 1.0, body2, lid)
	_box(Vector3(HW * 2 + 4.6, 3.4, HD * 2 + 4.6), trim, lid, Vector3(0, 1.8, HD))
	_box(Vector3(HW * 2 + 5.2, 1.0, HD * 2 + 5.2), acc, lid, Vector3(0, 0.3, HD))
	for sx in [-1.0, 1.0]: _lid_shape(kind, 3.2, 1.06, trim2, lid, sx * (HW + 0.4))
	# yan halka kulplar (iri)
	for sx in [-1.0, 1.0]:
		_sph(3.0, acc, root, Vector3(sx * (HW + 1.4), BH * 0.62, 0), Vector3(0.6, 1, 1), 10)
		_torus(4.2, 0.95, trim, root, Vector3(sx * (HW + 3.0), BH * 0.62 - 4.0, 0), Vector3(0, 0, 90.0 + sx * 18.0))
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
	# kademe süsleri
	if tier >= 4:
		for rx in [-1.0, 1.0]:
			var rr := _grp(root, Vector3(rx * 0.0 + rx * (HW - 8.4), BH * 0.5 - 0.8, HD + 2.6))
			_cyl(2.6, 2.6, 1.0, 4, acc, rr, Vector3.ZERO, Vector3(90, 45, 0))
			_cyl(1.9, 0.0, 1.8, 4, g2, rr, Vector3(0, 0, 0.8), Vector3(90, 45, 0))
			_halo(rr, Vector3(0, 0, 2.2), 5.0, gc, 0.55)
	if tier == 5:
		var ice := _gm(gc.lerp(Color.WHITE, 0.2), 1.0)
		for sd in [[-HW - 3.0, HD + 1.0, 12.0, -14.0], [HW + 3.0, HD - 1.0, 14.0, 12.0], [-HW + 2.0, HD + 4.0, 7.0, -6.0], [HW - 3.0, HD + 4.4, 6.0, 8.0]]:
			_cyl(3.0, 0.0, sd[2], 5, ice, root, Vector3(sd[0], sd[2] * 0.5 - 2.0, sd[1]), Vector3(6, 0, sd[3]))
	if tier == 7 or tier == 4:
		for sx in [-1.0, 1.0]:
			for sz in [-1.0, 1.0]:
				_cyl(2.2, 0.0, 6.4, 6, bone if tier == 7 else trim2, root, Vector3(sx * (HW + 0.9), BH + 5.4, sz * (HD + 0.9)), Vector3(sz * 10, 0, -sx * 10))
	if tier == 6:
		for sx in [-1.0, 1.0]:
			var ta := Vector3(sx * (HW + 3.0), 2.0, 6.0)
			var tb := ta + Vector3(sx * 6.0, 7.0, 1.0); var tc := tb + Vector3(sx * -1.0, 8.0, 0.6); var td := tc + Vector3(sx * -4.4, 4.0, 0)
			_seg(ta, tb, 2.4, 2.0, trim, root, 8); _seg(tb, tc, 2.0, 1.4, trim, root, 8); _seg(tc, td, 1.4, 0.3, trim, root, 8)
			_sph(2.0, trim, root, tb, Vector3.ONE, 8); _sph(1.4, trim, root, tc, Vector3.ONE, 8)

	# ── kilit ──
	var lk := _grp(root, Vector3(0, BH - 0.6, HD + 3.4))
	lk.scale = Vector3.ONE * 1.55
	match String(D.lock):
		"ring":
			_box(Vector3(7.0, 8.4, 1.4), trim2, lk, Vector3(0, -1.0, 0))
			_cyl(2.6, 2.6, 1.2, 14, trim, lk, Vector3(0, -2.0, 0.9), Vector3(90, 0, 0))
			_cyl(1.5, 1.5, 1.4, 12, g2, lk, Vector3(0, -2.0, 1.0), Vector3(90, 0, 0))
		"shield":
			_cyl(5.4, 5.4, 1.4, 5, trim2, lk, Vector3(0, -1.2, 0), Vector3(90, 180, 0))
			_cyl(3.8, 3.8, 1.5, 5, trim, lk, Vector3(0, -1.2, 0.5), Vector3(90, 180, 0))
			_box(Vector3(1.0, 4.4, 0.6), g2, lk, Vector3(0, -1.0, 1.3))
			_box(Vector3(3.2, 1.0, 0.6), g2, lk, Vector3(0, -0.2, 1.3))
		"sun":
			_cyl(5.2, 5.2, 1.3, 8, acc, lk, Vector3(0, -1.0, 0), Vector3(90, 22.5, 0))
			for i in 8: _cyl(1.0, 0.0, 3.4, 4, trim, lk, Vector3(cos(i * TAU / 8) * 5.6, -1.0 + sin(i * TAU / 8) * 5.6, 0.2), Vector3(0, 0, i * 45.0 - 90.0))
			_cyl(3.4, 3.4, 1.5, 16, trim, lk, Vector3(0, -1.0, 0.5), Vector3(90, 0, 0))
			_sph(2.1, g2, lk, Vector3(0, -1.0, 1.3), Vector3(1, 1, 0.6), 12)
		"skull":
			_cyl(6.6, 6.6, 1.4, 6, acc, lk, Vector3(0, -0.6, -0.2), Vector3(90, 0, 0))
			_sph(4.0, bone, lk, Vector3(0, 0.8, 1.2), Vector3(1.0, 0.95, 0.8), 14)
			_box(Vector3(4.2, 2.8, 2.6), bone, lk, Vector3(0, -2.6, 1.3))
			for sx in [-1.0, 1.0]: _sph(1.15, g2, lk, Vector3(sx * 1.55, 1.0, 3.9), Vector3(1, 1.1, 0.6), 8)
			_cyl(0.5, 0.0, 1.2, 3, dark, lk, Vector3(0, -0.8, 4.2))
			for i in 4: _box(Vector3(0.7, 1.2, 0.4), _mat(Color("#948c80")), lk, Vector3(-1.4 + i * 0.93, -3.4, 2.7))
		"crystal":
			_cyl(5.6, 5.6, 1.3, 4, acc, lk, Vector3(0, -1.0, 0), Vector3(90, 0, 0))
			_cyl(2.4, 0.0, 4.6, 6, g2, lk, Vector3(0, 1.3, 1.2))
			_cyl(0.0, 2.4, 3.4, 6, g2, lk, Vector3(0, -2.7, 1.2))
		"eye":
			_cyl(6.8, 6.8, 1.4, 16, acc, lk, Vector3(0, -0.6, 0), Vector3(90, 0, 0), Vector3(1, 1, 0.78))
			_sph(4.6, bone, lk, Vector3(0, -0.6, 0.6), Vector3(1.0, 0.66, 0.5), 16)
			_sph(2.5, g2, lk, Vector3(0, -0.6, 2.0), Vector3(1, 1, 0.5), 12)
			_pupil = _sph(1.0, dark, lk, Vector3(0, -0.6, 3.0), Vector3(1.15, 2.3, 0.4), 8)
			for sx in [-1.0, 1.0]:
				_seg(Vector3(sx * 6.6, -0.6, 0.4), Vector3(sx * 9.6, 1.4, 0.4), 0.9, 0.2, trim, lk, 5)
				_seg(Vector3(sx * 6.4, -2.2, 0.4), Vector3(sx * 9.0, -4.4, 0.4), 0.8, 0.2, trim, lk, 5)
		"dragon":
			_cyl(6.8, 6.8, 1.4, 6, acc, lk, Vector3(0, -0.4, -0.2), Vector3(90, 0, 0))
			var hd := _grp(lk, Vector3(0, 0.6, 1.2))
			_box(Vector3(6.4, 5.0, 4.4), trim, hd, Vector3(0, 0.6, 0.8))
			_box(Vector3(4.4, 3.2, 5.6), trim, hd, Vector3(0, -1.8, 3.4), Vector3(14, 0, 0))
			_box(Vector3(4.0, 1.1, 5.0), trim2, hd, Vector3(0, -4.2, 2.8), Vector3(-8, 0, 0))
			for sx in [-1.0, 1.0]:
				_sph(1.0, g2, hd, Vector3(sx * 2.2, 1.2, 3.1), Vector3(1.2, 0.7, 0.6), 8)
				_seg(Vector3(sx * 2.6, 2.8, 0.2), Vector3(sx * 5.4, 6.4, -1.4), 1.2, 0.9, bone, hd, 6)
				_seg(Vector3(sx * 5.4, 6.4, -1.4), Vector3(sx * 5.0, 10.2, -2.0), 0.9, 0.0, bone, hd, 6)
				_cyl(0.5, 0.0, 1.6, 4, bone, hd, Vector3(sx * 1.4, -3.4, 5.6), Vector3(180, 0, 0))
				_sph(0.42, g2, hd, Vector3(sx * 1.0, -0.6, 6.3), Vector3.ONE, 6)
			_box(Vector3(3.4, 0.5, 4.2), g1, hd, Vector3(0, -3.3, 3.0), Vector3(3, 0, 0))

	# ── tepe süsü ──
	var ty := _lid_top(kind)
	var top := _grp(lid, Vector3(0, ty, HD))
	match String(D.crest):
		"crown":
			_cyl(3.6, 4.2, 1.8, 8, trim2, top, Vector3(0, 0.6, 0))
			for i in 5: _cyl(0.9, 0.0, 3.4, 4, trim, top, Vector3(cos(i * TAU / 5 + 0.3) * 3.2, 2.8, sin(i * TAU / 5 + 0.3) * 3.2))
			var gem := _sph(1.7, g2, top, Vector3(0, 3.4, 0), Vector3(1, 1.3, 1), 8)
			_bobs.append([gem, 3.4, 0.8, 3.2, 0.0])
		"horns":
			_cyl(3.6, 4.6, 2.0, 8, acc, top, Vector3(0, 0.4, 0))
			var cr := _grp(top, Vector3(0, 4.6, 0))
			_cyl(2.1, 0.0, 5.4, 6, g2, cr, Vector3(0, 1.4, 0))
			_cyl(0.0, 2.1, 2.0, 6, g2, cr, Vector3(0, -2.3, 0))
			_bobs.append([cr, 4.6, 0.9, 3.4, 0.0])
			for sx in [-1.0, 1.0]:
				_seg(Vector3(sx * 3.0, 0.6, 0), Vector3(sx * 9.4, 2.6, 0), 1.7, 1.35, trim, top)
				_seg(Vector3(sx * 9.4, 2.6, 0), Vector3(sx * 12.2, 8.6, 0), 1.35, 0.8, trim, top)
				_seg(Vector3(sx * 12.2, 8.6, 0), Vector3(sx * 10.2, 15.2, 0), 0.8, 0.0, trim, top)
		"ice":
			var ice2 := _gm(gc.lerp(Color.WHITE, 0.1), 0.85)
			for s in [[0.0, 9.5, 0.0, 0.0], [-4.6, 6.0, 0.6, 16.0], [4.2, 6.6, -0.4, -14.0], [-8.4, 3.8, 0.0, 26.0], [8.0, 4.2, 0.4, -24.0]]:
				_cyl(1.8 if s[1] > 7 else 1.3, 0.0, s[1], 5, ice2, top, Vector3(s[0], s[1] * 0.5 - 0.6, s[2]), Vector3(0, 0, s[3]))
		"gem":
			_cyl(3.4, 4.4, 1.8, 6, acc, top, Vector3(0, 0.4, 0))
			var fl := _grp(top, Vector3(0, 7.0, 0))
			_cyl(2.6, 0.0, 4.4, 4, g2, fl, Vector3(0, 2.2, 0))
			_cyl(0.0, 2.6, 4.4, 4, g2, fl, Vector3(0, -2.2, 0))
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
	return {"root": root, "lid": lid, "halos": _halos, "flames": _flames, "glow": _glow, "pupil": _pupil, "bobs": _bobs, "col": gc}
