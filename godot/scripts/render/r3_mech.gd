class_name R3Mech
extends Node3D
## On yeni kahramanın (HeroMech) savaş görselleri — hepsi örneklenmiş ağ (IMesh), kare başına tek yükleme.
## Zincir halkaları + kanca, iksir şişesi, tarot kartı, kamçı eğrisi, gölge klonu + iz, kemik mızrak,
## iskelet hizmetkâr, buz kırığı + donma kristali, ruh totemi + ruh ateşi, yıldız işareti + düşen yıldız,
## şarkı dalgası.

const LINK_MAX := 260
const LASH_SEG := 18

var link: IMesh; var hook: IMesh; var chainFire: IMesh; var chainFireCore: IMesh; var chainHeat: IMesh
var flask: IMesh; var flaskGlow: IMesh
var card: IMesh; var cardGlow: IMesh
var lash: IMesh; var lashGlow: IMesh; var lashTip: IMesh
var shade: IMesh; var shadeGhost: IMesh
var bone: IMesh
var skel: IMesh; var skelEye: IMesh
var shard: IMesh; var iceBlock: IMesh
var totem: IMesh; var totemEye: IMesh; var sbolt: IMesh
var mark: IMesh; var markFill: IMesh; var star: IMesh; var starTrail: IMesh
var wave: IMesh; var waveGlow: IMesh
var bloodGlow: IMesh; var bloodLink: IMesh

static func _flat_ring(ri: float, ro: float, n: int, a0 := 0.0, al := TAU) -> ArrayMesh:
	var pos := PackedVector3Array(); var nrm := PackedVector3Array(); var uv := PackedVector2Array(); var idx := PackedInt32Array()
	for i in n + 1:
		var a := a0 + al * float(i) / n
		var c := cos(a); var s := sin(a)
		pos.append(Vector3(c * ri, 0, s * ri)); pos.append(Vector3(c * ro, 0, s * ro))
		nrm.append(Vector3.UP); nrm.append(Vector3.UP)
		uv.append(Vector2(float(i) / n, 0)); uv.append(Vector2(float(i) / n, 1))
	for i in n:
		var k := i * 2
		idx.append_array(PackedInt32Array([k, k + 1, k + 2, k + 1, k + 3, k + 2]))
	return Geo._mesh(pos, nrm, uv, idx)

func _im(m: Mesh, mat: Material, n: int) -> IMesh:
	var x := IMesh.new(m, mat, n)
	add_child(x)
	return x

func _add(c: String) -> ShaderMaterial:
	return Shd.basic({"color": Color(c), "add": true, "zwrite": false, "cull": "none"})

func _lit(col: String, em: String, ek: float, rough := 0.4, metal := 0.2, ink := Color(0.04, 0.03, 0.05)) -> ShaderMaterial:
	var m := Shd.lit({"color": Color(col), "emissive": Color(em), "emissive_k": ek, "roughness": rough, "metalness": metal, "rim": true})
	if Quality.tier != "low": m.next_pass = Shd.outline(null, ink, 1.1)
	return m

func _init() -> void:
	name = "R3Mech"
	var rx := Basis(Vector3(1, 0, 0), PI / 2)
	# ZİNCİR: halka (torus) + kanca
	link = _im(Geo.torus(2.6, 0.75, 5, 10), _lit("#8a6a50", "#2a1408", 0.3, 0.4, 0.8), LINK_MAX)
	var hg := Geo.merge([Geo.cylinder(1.6, 1.9, 9.0, 8), Geo.torus(5.0, 1.5, 7, 16, PI * 1.2), Geo.cone(1.7, 5.0, 6)],
		[Transform3D(rx, Vector3(0, 0, -3)), Transform3D(Basis(Vector3(0, 0, 1), PI * 0.6), Vector3(0, 0, 5.5)), Transform3D(Basis(Vector3(1, 0, 0), -0.6), Vector3(-4.2, 0, 8.5))])
	hook = _im(hg, _lit("#7a7470", "#3a2010", 0.5, 0.3, 0.9), 8)
	# Alevli Zincir: halkalara sarılan alev dilleri (dış turuncu + iç sarı çekirdek)
	var tongue := Geo.merge([Geo.sphere(1.0, 8, 6), Geo.cone(1.0, 2.8, 8)], [Transform3D(), Transform3D(Basis(), Vector3(0, 1.4, 0))])
	chainFire = _im(tongue, _add("#ff4a12"), LINK_MAX + 16)
	chainFireCore = _im(tongue, _add("#ffb048"), LINK_MAX + 16)
	chainHeat = _im(Geo.merge([Geo.box(1.0, 1.0, 1.0)], [Transform3D(Basis(), Vector3(0, 0, 0.5))]), _add("#ff3a0a"), 8)
	# İKSİR: cam küre + boyun; dış hale
	var fg := Geo.merge([Geo.sphere(6.0, 12, 9), Geo.cylinder(2.0, 2.4, 6.0, 8), Geo.cylinder(2.2, 2.0, 2.6, 8)],
		[Transform3D(Basis(), Vector3.ZERO), Transform3D(Basis(), Vector3(0, 7, 0)), Transform3D(Basis(), Vector3(0, 11, 0))])
	flask = _im(fg, _lit("#ffc070", "#ff6a10", 2.0, 0.1, 0.1), 16)
	flaskGlow = _im(Geo.sphere(1.0, 10, 8), _add("#ff8a2a"), 16)
	# TAROT: ince kart + renkli hale
	card = _im(Geo.merge([Geo.box(8.0, 0.6, 12.0), Geo.box(8.8, 0.4, 12.8)], [Transform3D(), Transform3D(Basis(), Vector3(0, -0.3, 0))]), _lit("#2a1440", "#ffffff", 1.4, 0.5, 0.2), 48)
	cardGlow = _im(Geo.box(1.0, 0.2, 1.0), _add("#ffffff"), 48)
	# KAMÇI: z ∈ [0,1] parçalar (öz + hale) + uç kıvılcımı
	var seg := Geo.merge([Geo.box(1.0, 1.0, 1.0)], [Transform3D(Basis(), Vector3(0, 0, 0.5))])
	lash = _im(seg, _lit("#5a0a18", "#ff2a4a", 1.2, 0.5, 0.1), LASH_SEG * 6)
	lashGlow = _im(seg, _add("#ff3a5a"), LASH_SEG * 6)
	lashTip = _im(Geo.sphere(1.0, 8, 6), _add("#ffffff"), 6)
	# KAN ÇEKME: koyu kızıl damla + parlak hale; düşmandan kahramana ince kan bağı
	bloodLink = _im(seg, Shd.lit({"color": Color("#8a0a16"), "emissive": Color("#ff1828"), "emissive_k": 1.5, "roughness": 0.2, "rim": false}), 220)
	bloodGlow = _im(seg, _add("#ff2a3a"), 220)
	# GÖLGE: uzun karanlık bıçak-silüet + camgöbeği hayalet izleri
	var sp := PackedVector2Array([Vector2(0, 14), Vector2(4, 4), Vector2(5, -4), Vector2(2, -12), Vector2(0, -16), Vector2(-2, -12), Vector2(-5, -4), Vector2(-4, 4)])
	var sg := Geo.merge([Geo.extrude(sp, 3.0)], [Transform3D(Basis(Vector3(1, 0, 0), PI / 2), Vector3.ZERO)])
	shade = _im(sg, Shd.lit({"color": Color("#0a0c12"), "emissive": Color("#1a8aa8"), "emissive_k": 0.6, "roughness": 0.3, "rim": true}), 8)
	shadeGhost = _im(sg, _add("#2ad8ff"), 64)
	# KEMİK MIZRAK: sap + iki uç topuzu + sivri uç
	var bg := Geo.merge([Geo.cylinder(1.1, 1.1, 18.0, 6), Geo.sphere(1.9, 8, 6), Geo.sphere(1.9, 8, 6), Geo.cone(1.6, 6.0, 6)],
		[Transform3D(rx, Vector3.ZERO), Transform3D(Basis(), Vector3(1.0, 0, -9)), Transform3D(Basis(), Vector3(-1.0, 0, -9)), Transform3D(rx, Vector3(0, 0, 11.5))])
	bone = _im(bg, _lit("#efe6d0", "#3a5a2a", 0.4, 0.6, 0.0, Color(0.1, 0.08, 0.05)), 40)
	# İSKELET: kafatası, kaburga, leğen, bacaklar, kollar (tek ağ) + yeşil gözler
	var sk_parts: Array = [Geo.sphere(5.5, 12, 9), Geo.box(9.0, 10.0, 5.0), Geo.box(7.0, 3.0, 4.0),
		Geo.cylinder(1.3, 1.3, 13.0, 6), Geo.cylinder(1.3, 1.3, 13.0, 6), Geo.cylinder(1.1, 1.1, 12.0, 6), Geo.cylinder(1.1, 1.1, 12.0, 6), Geo.cylinder(1.4, 1.4, 6.0, 6)]
	var sk_x: Array = [Transform3D(Basis(), Vector3(0, 33, 0.5)), Transform3D(Basis(), Vector3(0, 22, 0)), Transform3D(Basis(), Vector3(0, 14, 0)),
		Transform3D(Basis(), Vector3(-2.4, 6.5, 0)), Transform3D(Basis(), Vector3(2.4, 6.5, 0)),
		Transform3D(Basis(Vector3(1, 0, 0), -0.9), Vector3(-6.0, 22, 3.5)), Transform3D(Basis(Vector3(1, 0, 0), -0.9), Vector3(6.0, 22, 3.5)), Transform3D(Basis(), Vector3(0, 28, 0))]
	skel = _im(Geo.merge(sk_parts, sk_x), _lit("#e8dcc0", "#2a4a1a", 0.35, 0.7, 0.0, Color(0.1, 0.08, 0.05)), 28)
	skelEye = _im(Geo.sphere(1.0, 6, 5), _add("#7dff8a"), 56)
	# AYAZ: uzun buz kırığı + donma kristal kümesi
	var shg := Geo.merge([Geo.cone(2.2, 14.0, 5), Geo.cone(2.2, 5.0, 5)], [Transform3D(rx, Vector3(0, 0, 3)), Transform3D(Basis(Vector3(1, 0, 0), -PI / 2), Vector3(0, 0, -1))])
	shard = _im(shg, Shd.lit({"color": Color("#e8f8ff"), "emissive": Color("#5ac8ff"), "emissive_k": 2.2, "roughness": 0.05, "metalness": 0.1, "rim": true}), 80)
	var ice_parts: Array = []
	var ice_x: Array = []
	for i in 7:
		var an := i * TAU / 7.0 + 0.3
		var h := 22.0 + float(i % 3) * 8.0
		ice_parts.append(Geo.cone(5.0, h, 5))
		ice_x.append(Transform3D(Basis(Vector3(cos(an + PI / 2), 0, sin(an + PI / 2)), 0.35), Vector3(cos(an) * 6.0, h * 0.4, sin(an) * 6.0)))
	ice_parts.append(Geo.cone(7.0, 36.0, 6)); ice_x.append(Transform3D(Basis(), Vector3(0, 16, 0)))
	var imat := Shd.lit({"color": Color("#cfefff"), "emissive": Color("#3aa8ff"), "emissive_k": 1.2, "roughness": 0.05, "metalness": 0.2, "rim": true, "alpha": true})
	imat.set_shader_parameter("opacity", 0.78)
	iceBlock = _im(Geo.merge(ice_parts, ice_x), imat, 40)
	# TOTEM: oyma direk (3 katman yüz + kanatlar + tepe) + gözler; ruh ateşi küresi
	var tparts: Array = []; var tx: Array = []
	for i in 3:
		tparts.append(Geo.cylinder(7.0 - i * 0.6, 8.0 - i * 0.6, 14.0, 8)); tx.append(Transform3D(Basis(), Vector3(0, 7 + i * 14.5, 0)))
		tparts.append(Geo.box(9.0 - i, 2.4, 2.0)); tx.append(Transform3D(Basis(), Vector3(0, 4.5 + i * 14.5, 7.0 - i * 0.6)))
	var wing := PackedVector2Array([Vector2(0, 0), Vector2(16, 5), Vector2(20, 13), Vector2(7, 8), Vector2(0, 6)])
	tparts.append(Geo.extrude(wing, 2.0)); tx.append(Transform3D(Basis(), Vector3(5, 34, -1)))
	tparts.append(Geo.extrude(wing, 2.0)); tx.append(Transform3D(Basis(Vector3(0, 1, 0), PI), Vector3(-5, 34, 1)))
	tparts.append(Geo.cone(5.0, 10.0, 6)); tx.append(Transform3D(Basis(), Vector3(0, 50, 0)))
	totem = _im(Geo.merge(tparts, tx), _lit("#7a5432", "#0a3a30", 0.4, 0.85, 0.0, Color(0.08, 0.05, 0.02)), 8)
	totemEye = _im(Geo.sphere(1.0, 6, 5), _add("#4affd8"), 48)
	sbolt = _im(Geo.sphere(1.0, 10, 8), _add("#4affd8"), 64)
	# YILDIZ: yer işareti halkası + dolu disk; beş köşeli yıldız + kuyruk
	mark = _im(_flat_ring(0.9, 1.0, 48), _add("#ffd86a"), 16)
	markFill = _im(_flat_ring(0.0, 1.0, 40), _add("#ffb02a"), 16)
	var stp := PackedVector2Array()
	for i in 10:
		var r := 10.0 if i % 2 == 0 else 4.2
		var a := -PI / 2 + i * PI / 5.0
		stp.append(Vector2(cos(a) * r, sin(a) * r))
	star = _im(Geo.extrude(stp, 3.5), Shd.lit({"color": Color("#fff4c0"), "emissive": Color("#ffc83a"), "emissive_k": 3.4, "roughness": 0.1, "rim": false}), 16)
	starTrail = _im(seg, _add("#ffd86a"), 16)
	# ŞARKI: yayılan yay bandı (1,2 rad) — öz + yumuşak hale
	wave = _im(_flat_ring(0.9, 1.0, 28, -0.6, 1.2), _add("#5affe0"), 12)
	waveGlow = _im(_flat_ring(0.78, 1.06, 28, -0.6, 1.2), _add("#ff8ad8"), 12)

func update(g) -> void:
	var M: HeroMech = g.weapons.mech if g.weapons else null
	if M == null:
		return
	var T: float = g.time
	var p = g.player
	_hooks(M, T)
	_flasks(M, T)
	_cards(M, T)
	_lashes(M, p, T)
	_shades(M, T)
	_bones(M, T)
	_skels(M, T)
	_frost(M, T)
	_totems(M, T)
	_stars(M, T)
	_waves(M, T)
	_blood(M, p, T)

func _hooks(M: HeroMech, T: float) -> void:
	var n := 0; var hn := 0; var fn := 0
	var FMAX: int = LINK_MAX + 16
	var cn := 0
	var s := M._src() if not M.hooks.is_empty() else Vector2.ZERO
	for h in M.hooks:
		var fl: int = int(h.get("fl", 0))
		var ax: float = s.x; var az: float = s.y
		var bx: float = h.x; var bz: float = h.y
		var dx := bx - ax; var dz := bz - az
		var L := sqrt(dx * dx + dz * dz)
		var yaw := atan2(dx, dz)
		var cnt := mini(int(L / 6.0), 60)
		for k in cnt:
			if n >= LINK_MAX: break
			var u := (k + 0.5) / maxf(1.0, float(cnt))
			# hafif sarkma
			var y := 40.0 - sin(u * PI) * 8.0
			# halkalar dönüşümlü: biri dik, biri yatık düzlemde (ikisi de zincir yönünü içerir)
			var lb := Basis(Vector3.UP, yaw) * (Basis(Vector3.UP, PI / 2) if k % 2 == 0 else Basis(Vector3.RIGHT, PI / 2) * Basis(Vector3.FORWARD, PI / 2))
			link.set_mat(n, lb, Vector3(ax + dx * u, y, az + dz * u))
			if fl > 0:
				# akkor demir: ısınmış halka rengi
				link.set_col(n, 1.6, 0.75, 0.35, 1)
				if fn < FMAX - 8:
					# her halkada titreşen, yukarı kıvrılan alev dili (rastgele faz, eğik)
					var ph: float = T * 11.0 + float(k) * 2.3
					var fs: float = (2.2 + 0.6 * fl) * (0.8 + 0.3 * sin(ph))
					var hgt: float = 1.0 + 0.45 * sin(ph * 1.7 + 1.1)
					var lean: float = 0.35 * sin(ph * 0.8)
					var fx: float = ax + dx * u
					var fz: float = az + dz * u
					chainFire.set_trs(fn, fx, y + 1.0, fz, lean, yaw, 0.0, fs, fs * hgt * 1.5, fs)
					chainFire.set_col(fn, 1, 1, 1, 0.7)
					chainFireCore.set_trs(fn, fx, y + 0.6, fz, lean, yaw, 0.0, fs * 0.5, fs * hgt * 0.9, fs * 0.5)
					chainFireCore.set_col(fn, 1, 1, 1, 0.85)
					fn += 1
			else:
				link.set_col(n, 1, 1, 1, 1)
			n += 1
		if hn < 8:
			hook.set_trs(hn, bx, 40.0, bz, 0.0, yaw + (PI if h.ret else 0.0), sin(T * 20.0) * 0.3, 1.3, 1.3, 1.3)
			hook.set_col(hn, 1, 1, 1, 1)
			hn += 1
		if fl > 0 and cn < 8 and L > 4.0:
			# zincir boyunca kızgın ısı şeridi
			var hw: float = 3.5 + 1.0 * fl
			chainHeat.set_mat(cn, Basis(Vector3.UP, yaw) * Basis.from_scale(Vector3(hw, hw * 0.7, L)), Vector3(ax, 36.0, az))
			chainHeat.set_col(cn, 1, 1, 1, 0.26 + 0.08 * sin(T * 17.0))
			cn += 1
		if fl > 0 and fn < FMAX:
			# kancanın etrafında alev çiçeği (toplu yakma alanı): birkaç büyük dil
			for j in 6:
				if fn >= FMAX: break
				var aj: float = float(j) * TAU / 6.0 + T * 2.0
				var ph2: float = T * 12.0 + float(j) * 1.9
				var rr: float = 5.0 + 2.0 * fl
				var hs: float = (5.0 + 1.4 * fl) * (0.8 + 0.3 * sin(ph2))
				chainFire.set_trs(fn, bx + cos(aj) * rr, 36.0, bz + sin(aj) * rr, 0.3 * sin(ph2), aj, 0.0, hs, hs * 1.8, hs)
				chainFire.set_col(fn, 1, 1, 1, 0.75)
				chainFireCore.set_trs(fn, bx + cos(aj) * rr * 0.5, 36.0, bz + sin(aj) * rr * 0.5, 0.0, aj, 0.0, hs * 0.5, hs * 1.1, hs * 0.5)
				chainFireCore.set_col(fn, 1, 1, 1, 0.9)
				fn += 1
	link.commit(n); hook.commit(hn); chainFire.commit(fn); chainFireCore.commit(fn); chainHeat.commit(cn)

func _flasks(M: HeroMech, T: float) -> void:
	var n := 0
	for f in M.flasks:
		if n >= 16: break
		var h: float = f.get("h", 20.0)
		flask.set_trs(n, f.x, h, f.y, T * 9.0 + f.spin, T * 4.0, 0.0, 1.0, 1.0, 1.0)
		flask.set_col(n, 1, 1, 1, 1)
		var k := 0.6 + 0.3 * sin(T * 20.0 + f.spin)
		flaskGlow.set_ys(n, f.x, h, f.y, 0.0, 12.0, 12.0, 12.0)
		flaskGlow.set_col(n, 0.5 * k, 0.22 * k, 0.04 * k, 1)
		n += 1
	flask.commit(n); flaskGlow.commit(n)

func _cards(M: HeroMech, T: float) -> void:
	var n := 0
	for c in M.cards:
		if n >= 48: break
		var col: Color = HeroMech.SUIT_COL[c.suit]
		card.set_trs(n, c.x, 26.0 + sin(T * 8.0 + c.ph) * 2.0, c.y, 0.25, c.spin, 0.0, 1.2, 1.2, 1.2)
		card.set_col(n, col.r * 1.2, col.g * 1.2, col.b * 1.2, 1)
		cardGlow.set_trs(n, c.x, 25.0, c.y, 0.0, c.spin, 0.0, 16.0, 1.0, 20.0)
		cardGlow.set_col(n, col.r * 0.45, col.g * 0.45, col.b * 0.45, 1)
		n += 1
	card.commit(n); cardGlow.commit(n)

func _lashes(M: HeroMech, p, T: float) -> void:
	var n := 0; var tn := 0
	for l in M.lashes:
		var t: float = l.t
		if t < 0.0: continue
		var u := clampf(t / HeroMech.LASH_OUT, 0.0, 1.0)
		var ext := 1.0 - pow(1.0 - u, 3.0)
		var fade := 1.0 if t < HeroMech.LASH_OUT else maxf(0.0, 1.0 - (t - HeroMech.LASH_OUT) / (HeroMech.LASH_LIFE - HeroMech.LASH_OUT))
		var a: float = l.ang
		var ux := cos(a); var uz := sin(a)
		var nx := -uz; var nz := ux
		var Lr: float = l.len * ext
		var prev := Vector3(p.x, 34.0, p.y)
		for k in LASH_SEG:
			var s := float(k + 1) / LASH_SEG
			# S kıvrımı açılırken düzleşir; uç yukarı kalkıp şaklar
			var off: float = l.side * sin(s * PI) * l.len * 0.16 * (1.0 - ext * 0.75) + sin(s * 9.0 - t * 40.0) * 4.0 * (1.0 - ext)
			var cur := Vector3(p.x + ux * Lr * s + nx * off, 34.0 + sin(s * PI) * 10.0 * (1.0 - ext) - s * 14.0 * ext, p.y + uz * Lr * s + nz * off)
			var d := cur - prev
			var len := d.length()
			if len > 0.1 and n < LASH_SEG * 6:
				var w := lerpf(2.6, 0.8, s)
				var bz := Basis.looking_at(-d / len, Vector3.UP)
				lash.set_mat(n, Basis(bz.x * w, bz.y * w, bz.z * len), prev)
				lash.set_col(n, 1, 1, 1, 1)
				lashGlow.set_mat(n, Basis(bz.x * w * 3.0, bz.y * w * 3.0, bz.z * len), prev)
				lashGlow.set_col(n, 0.45 * fade, 0.05 * fade, 0.12 * fade, 1)
				n += 1
			prev = cur
		if tn < 6 and t >= HeroMech.LASH_OUT * 0.8:
			var sc := 6.0 + (1.0 - fade) * 10.0
			lashTip.set_ys(tn, prev.x, prev.y, prev.z, 0.0, sc, sc, sc)
			lashTip.set_col(tn, 1.0 * fade, 0.55 * fade, 0.65 * fade, 1)
			tn += 1
	lash.commit(n); lashGlow.commit(n); lashTip.commit(tn)

func _shades(M: HeroMech, T: float) -> void:
	var n := 0; var gn := 0
	for s in M.shades:
		var a := 1.0 if s.fade < 0.0 else maxf(0.0, 1.0 - s.fade / 0.3)
		var yaw := atan2(cos(s.ang), sin(s.ang))
		if n < 8:
			shade.set_trs(n, s.x, 28.0, s.y, 0.0, yaw, 0.0, 1.3 * a, 1.3, 1.6)
			shade.set_col(n, 1, 1, 1, 1)
			n += 1
		var tr: Array = s.trail
		for k in tr.size():
			if gn >= 64: break
			var q: Vector2 = tr[k]
			var f := (1.0 - float(k) / tr.size()) * a
			ghost_set(gn, q.x, q.y, yaw, f)
			gn += 1
	shade.commit(n); shadeGhost.commit(gn)

func ghost_set(i: int, x: float, z: float, yaw: float, f: float) -> void:
	shadeGhost.set_trs(i, x, 28.0, z, 0.0, yaw, 0.0, 1.2, 1.2, 1.5)
	shadeGhost.set_col(i, 0.05 * f, 0.4 * f, 0.55 * f, 1)

func _bones(M: HeroMech, T: float) -> void:
	var n := 0
	for b in M.bones:
		if n >= 40: break
		bone.set_trs(n, b.x, 24.0, b.y, 0.0, atan2(b.vx, b.vy), T * 18.0, 1.1, 1.1, 1.1)
		bone.set_col(n, 1, 1, 1, 1)
		n += 1
	bone.commit(n)

func _skels(M: HeroMech, T: float) -> void:
	var n := 0; var en := 0
	for m in M.minions:
		if n >= 28: break
		var rise: float = m.rise
		var fade := minf(1.0, m.life / 0.6)
		var hop := absf(sin(m.hop)) * 5.0
		var y := -36.0 * (1.0 - rise) + hop
		var sc := 1.0 * (0.6 + 0.4 * fade)
		skel.set_trs(n, m.x, y, m.y, sin(m.hop * 2.0) * 0.08, m.yaw, 0.0, sc, sc, sc)
		skel.set_col(n, 1, 1, 1, 1)
		for sx in [-2.0, 2.0]:
			if en >= 56: break
			var ex: float = m.x + cos(m.yaw) * sx + sin(m.yaw) * 5.2 * sc
			var ez: float = m.y - sin(m.yaw) * sx + cos(m.yaw) * 5.2 * sc
			skelEye.set_ys(en, ex, y + 34.0 * sc, ez, 0.0, 1.4, 1.4, 1.4)
			skelEye.set_col(en, 0.5 * fade, 1.0 * fade, 0.55 * fade, 1)
			en += 1
		n += 1
	skel.commit(n); skelEye.commit(en)

func _frost(M: HeroMech, T: float) -> void:
	var n := 0
	for b in M.shards:
		if n >= 80: break
		shard.set_trs(n, b.x, 24.0, b.y, 0.0, atan2(b.vx, b.vy), T * 6.0, 1.0, 1.0, 1.0)
		shard.set_col(n, 1, 1, 1, 1)
		n += 1
	shard.commit(n)
	var k := 0
	for e in M.frozen:
		if k >= 40: break
		if e.hp <= 0: continue
		var sc: float = maxf(0.7, e.radius / 15.0) * (0.85 + 0.15 * minf(1.0, e.frozenT * 4.0))
		iceBlock.set_trs(k, e.x, 0.0, e.y, 0.0, float(e.pi) * 1.7, 0.0, sc, sc, sc)
		iceBlock.set_col(k, 1, 1, 1, 1)
		k += 1
	iceBlock.commit(k)

func _totems(M: HeroMech, T: float) -> void:
	var n := 0; var en := 0
	for t in M.totems:
		if n >= 8: break
		var r: float = t.rise
		var e2 := 1.0 - pow(1.0 - r, 3.0)
		var fade := minf(1.0, t.life / 0.5)
		var TS := 1.6
		totem.set_trs(n, t.x, -90.0 * (1.0 - e2), t.y, 0.0, 0.0, 0.0, TS, (e2 * fade + 0.01) * TS, TS)
		totem.set_col(n, 1, 1, 1, 1)
		var gk: float = (0.5 + 0.5 * t.glow + 0.15 * sin(T * 6.0)) * fade
		for i in 3:
			for sx in [-2.6, 2.6]:
				if en >= 48: break
				totemEye.set_ys(en, t.x + sx * TS, (9.0 + i * 14.5) * e2 * TS, t.y + (7.6 - i * 0.6) * TS, 0.0, 2.2 + t.glow, 2.2 + t.glow, 2.2)
				totemEye.set_col(en, 0.3 * gk, 1.0 * gk, 0.85 * gk, 1)
				en += 1
		n += 1
	totem.commit(n); totemEye.commit(en)
	var b := 0
	for s in M.sbolts:
		if b >= 32: break
		sbolt.set_ys(b * 2, s.x, s.z, s.y, 0.0, 5.0, 5.0, 5.0)
		sbolt.set_col(b * 2, 0.7, 1.0, 0.95, 1)
		sbolt.set_ys(b * 2 + 1, s.x - s.vx * 0.02, s.z, s.y - s.vy * 0.02, 0.0, 11.0, 11.0, 11.0)
		sbolt.set_col(b * 2 + 1, 0.06, 0.35, 0.3, 1)
		b += 1
	sbolt.commit(b * 2)

func _stars(M: HeroMech, T: float) -> void:
	var n := 0
	for s in M.stars:
		if n >= 16: break
		var u: float = clampf(s.t / s.fall, 0.0, 1.0)
		var R: float = s.r
		var pulse := 0.6 + 0.4 * sin(T * 18.0)
		mark.set_trs(n, s.x, 2.0, s.y, 0.0, T * 1.5, 0.0, R, 1.0, R)
		mark.set_col(n, 0.9 * pulse, 0.7 * pulse, 0.25 * pulse, 1)
		markFill.set_trs(n, s.x, 1.5, s.y, 0.0, 0.0, 0.0, R * u, 1.0, R * u)
		markFill.set_col(n, 0.35 * u, 0.2 * u, 0.04 * u, 1)
		var h := 20.0 + (1.0 - u) * (1.0 - u) * 520.0
		star.set_trs(n, s.x, h, s.y, 0.6, T * 6.0, T * 4.0, 1.4, 1.4, 1.4)
		star.set_col(n, 1, 1, 1, 1)
		starTrail.set_mat(n, Basis(Vector3(6, 0, 0), Vector3(0, 0, 6), Vector3(0, 140.0 * (1.0 - u * 0.6), 0)), Vector3(s.x, h, s.y))
		starTrail.set_col(n, 0.6, 0.45, 0.15, 1)
		n += 1
	mark.commit(n); markFill.commit(n); star.commit(n); starTrail.commit(n)

func _waves(M: HeroMech, T: float) -> void:
	var n := 0
	for s in M.songs:
		if n >= 12: break
		if s.r < 8.0: continue
		var k: float = 1.0 - s.r / s.maxR
		# yay bandı +X ekseninde, açısı ang (oyun düzleminde x,y → x,z)
		var yaw: float = -s.ang
		var sc: float = s.r
		var wob := 1.0 + 0.04 * sin(T * 30.0 + n)
		wave.set_trs(n, s.x, 18.0, s.y, 0.0, yaw, 0.0, sc * wob, 1.0, sc * wob)
		wave.set_col(n, 0.35 * k, 1.0 * k, 0.88 * k, 1)
		waveGlow.set_trs(n, s.x, 17.0, s.y, 0.0, yaw, 0.0, sc, 1.0, sc)
		waveGlow.set_col(n, 0.5 * k, 0.12 * k, 0.4 * k, 1)
		n += 1
	wave.commit(n); waveGlow.commit(n)


func _blood(M: HeroMech, p, T: float) -> void:
	# kan çizgileri: baş kahramana doğru kavis çizerek uçar, arkasında incelen kuyruk (LoL Vladimir tarzı)
	const SEGS := 8
	var ln := 0; var gn := 0
	for q in M.drops:
		if ln > 220 - SEGS: break
		if q.t <= 0.0: continue
		var k: float = clampf(q.t / q.dur, 0.0, 1.0)
		var k0 := maxf(0.0, k - 0.42)
		var fade: float = clampf((1.0 - k) / 0.12, 0.0, 1.0) if k > 0.88 else 1.0
		var prev: Vector3 = M.drop_pos(q, k0)
		for i in range(1, SEGS + 1):
			var f := float(i) / SEGS
			var cur: Vector3 = M.drop_pos(q, lerpf(k0, k, f))
			var dv := cur - prev
			var len := dv.length()
			if len > 0.05:
				var th: float = (0.5 + 3.0 * f) * q.sz * fade
				var bz2 := Basis.looking_at(-dv / len, Vector3.UP)
				bloodLink.set_mat(ln, Basis(bz2.x * th, bz2.y * th, bz2.z * len), prev)
				bloodLink.set_col(ln, 1, 1, 1, 1)
				ln += 1
				if f > 0.4 and gn < 220:
					var gt := th * 2.6
					bloodGlow.set_mat(gn, Basis(bz2.x * gt, bz2.y * gt, bz2.z * len), prev)
					bloodGlow.set_col(gn, 0.5 * f * fade, 0.03 * f * fade, 0.07 * f * fade, 1)
					gn += 1
			prev = cur
	bloodLink.commit(ln); bloodGlow.commit(gn)
