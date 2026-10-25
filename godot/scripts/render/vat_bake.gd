class_name VatBake
extends RefCounted
## VERTEX ANIMATION TEXTURE pişirici — iskeletli düşman modelinin yürüyüş klibini dokuya çevirir.
## Kalabalıkta her düşman ayrı iskelet + AnimationPlayer + iki çizim geçişi demekti (CPU'da kemik
## pozları, GPU'da düşman başına çizim). Pişirilen dokuyla bir türün TÜM düşmanları tek MultiMesh
## çiziminde, köşe gölgelendiricisinde canlanır (Shd VAT_VERTEX).
##
## Kemik matrisleri ana iş parçacığında (AnimationPlayer.seek) toplanır; köşe deri hesabı
## WorkerThreadPool'da kare başına paralel yapılır. Sonuç user://vat/ altına önbelleklenir —
## bir dünyanın pişirimi yalnız ilk girişte olur.

const FRAMES := 20
const TEX_W := 1024
const VERSION := 4

class Job:
	var V := 0
	var pos := PackedVector3Array()
	var nrm := PackedVector3Array()
	var bi := PackedInt32Array()       # köşe başına 4 bağ indeksi
	var bw := PackedFloat32Array()     # köşe başına 4 ağırlık
	var mats: Array = []               # [kare] -> Array[Transform3D] (bağ başına)
	var outP: Array = []               # [kare] -> PackedFloat32Array (V*4)
	var outN: Array = []
	var mtx := Mutex.new()
	var rows := 1
	var bmin := Vector3.ZERO
	var bsz := Vector3.ONE
	var hi: Array = []                 # [kare] -> PackedByteArray (RGBA8: konumun yüksek baytı)
	var lo: Array = []                 # düşük bayt
	var nb: Array = []                 # normal (RGBA8, *0,5+0,5)
	## RGBA8 kodlama (her GPU'da desteklenir; yarım-float doku bazı mobil sürücülerde 8 bite
	## düşürülüp negatif koordinatları kırpıyor, model kâğıt gibi eziliyordu): konum 16 bit
	## (hi/lo iki doku), sınırlar vat_min/vat_size ile
	func enc(f: int) -> void:
		var P: PackedFloat32Array = outP[f]
		var N: PackedFloat32Array = outN[f]
		var n := rows * 1024 * 4
		var H := PackedByteArray()
		var L := PackedByteArray()
		var NB := PackedByteArray()
		H.resize(n); L.resize(n); NB.resize(n)
		for v in V:
			var o := v * 4
			for k in 3:
				var q: int = clampi(int(round((P[o + k] - bmin[k]) / bsz[k] * 65535.0)), 0, 65535)
				H[o + k] = q >> 8
				L[o + k] = q & 255
				NB[o + k] = clampi(int(round((N[o + k] * 0.5 + 0.5) * 255.0)), 0, 255)
			H[o + 3] = 255; L[o + 3] = 255; NB[o + 3] = 255
		mtx.lock()
		hi[f] = H; lo[f] = L; nb[f] = NB
		mtx.unlock()
	func run(f: int) -> void:
		var M: Array = mats[f]
		var P := PackedFloat32Array()
		var N := PackedFloat32Array()
		P.resize(V * 4)
		N.resize(V * 4)
		for v in V:
			var p := Vector3.ZERO
			var n := Vector3.ZERO
			var o := v * 4
			var q: Vector3 = pos[v]
			var r: Vector3 = nrm[v]
			for k in 4:
				var w: float = bw[o + k]
				if w <= 0.0: continue
				var T: Transform3D = M[bi[o + k]]
				p += (T * q) * w
				n += (T.basis * r) * w
			n = n.normalized()
			P[o] = p.x; P[o + 1] = p.y; P[o + 2] = p.z; P[o + 3] = 1.0
			N[o] = n.x; N[o + 1] = n.y; N[o + 2] = n.z; N[o + 3] = 0.0
		mtx.lock()
		outP[f] = P
		outN[f] = N
		mtx.unlock()

## Sonuç: {mesh: ArrayMesh (kemiksiz, yüzey malzemeleri ayarlanmamış), src_mats: Array[BaseMaterial3D],
##   offs: Array[int] (yüzey köşe ofsetleri), pos: ImageTexture, nrm: ImageTexture, rows, frames, dur}
## Boş sözlük = pişirilemedi (eski iskeletli yola düşülür).
static func bake(parent: Node3D, ps: PackedScene, def: Dictionary) -> Dictionary:
	var id := str(def.get("id", "x"))
	var holder := Node3D.new()
	parent.add_child(holder)
	var inst: Node3D = ps.instantiate()
	holder.add_child(inst)
	var gh := inst.find_child("enemy_" + id, true, false) as Node3D
	var rig: Node3D = (gh.get_child(0) as Node3D) if gh and gh.get_child_count() else inst
	rig.rotation_order = EULER_ORDER_XYZ
	var rp: Array = def.get("rigPos", [0, 0, 0])
	rig.position = Vector3(float(rp[0]), float(rp[1]), float(rp[2]))
	var ap := inst.find_child("AnimationPlayer", true, false) as AnimationPlayer
	var mis: Array = []
	for c in inst.find_children("*", "MeshInstance3D", true, false):
		var mi := c as MeshInstance3D
		if mi.mesh and mi.skin and mi.get_node_or_null(mi.skeleton) is Skeleton3D: mis.append(mi)
	if mis.is_empty() or ap == null:
		holder.queue_free()
		return {}
	var clip = def.get("clip")
	var lst := ap.get_animation_list()
	var anim: String = str(clip) if clip != null and lst.has(str(clip)) else (lst[0] if lst.size() else "")
	if anim == "":
		holder.queue_free()
		return {}
	ap.callback_mode_process = AnimationMixer.ANIMATION_CALLBACK_MODE_PROCESS_MANUAL
	ap.play(anim)
	var dur := float(def.get("clipDur", 0.0))
	if dur <= 0.0: dur = ap.get_animation(anim).length
	# kemiksiz statik ağ + köşe/bağ verisi (tüm yüzeyler tek dizide, ofsetli)
	var job := Job.new()
	var am := ArrayMesh.new()
	var offs: Array = []
	var src_mats: Array = []
	var bindBase: Array = []    # yüzey ağı başına bağ ofseti (mi sırası)
	var nb := 0
	for mi: MeshInstance3D in mis:
		bindBase.append(nb)
		nb += mi.skin.get_bind_count()
	for mii in mis.size():
		var mi: MeshInstance3D = mis[mii]
		for si in mi.mesh.get_surface_count():
			var A: Array = mi.mesh.surface_get_arrays(si)
			var vp: PackedVector3Array = A[Mesh.ARRAY_VERTEX]
			var vn: PackedVector3Array = A[Mesh.ARRAY_NORMAL] if A[Mesh.ARRAY_NORMAL] != null else PackedVector3Array()
			var bones = A[Mesh.ARRAY_BONES]
			var wts = A[Mesh.ARRAY_WEIGHTS]
			var nv := vp.size()
			var per := 4
			if bones != null and nv > 0 and bones.size() >= nv * 8: per = 8
			offs.append(job.V)
			for v in nv:
				job.pos.append(vp[v])
				job.nrm.append(vn[v] if v < vn.size() else Vector3.UP)
				# en güçlü 4 bağ (8 ağırlıklı ağlarda ilk 4 en büyükleridir)
				var s := 0.0
				for k in 4:
					var w: float = float(wts[v * per + k]) if wts != null else (1.0 if k == 0 else 0.0)
					s += w
				for k in 4:
					var w: float = float(wts[v * per + k]) if wts != null else (1.0 if k == 0 else 0.0)
					job.bi.append(int(bones[v * per + k]) + int(bindBase[mii]) if bones != null else int(bindBase[mii]))
					job.bw.append(w / s if s > 0.0 else 0.0)
			job.V += nv
			# statik ağ: kemik/ağırlık izleri olmadan
			var B: Array = []
			B.resize(Mesh.ARRAY_MAX)
			for k in [Mesh.ARRAY_VERTEX, Mesh.ARRAY_NORMAL, Mesh.ARRAY_TANGENT, Mesh.ARRAY_TEX_UV, Mesh.ARRAY_INDEX]:
				B[k] = A[k]
			am.add_surface_from_arrays(Mesh.PRIMITIVE_TRIANGLES, B)
			src_mats.append(mi.get_active_material(si))
	var rows := int(ceil(float(job.V) / TEX_W))
	var res := {"mesh": am, "src_mats": src_mats, "offs": offs, "rows": rows, "frames": FRAMES, "dur": dur}
	# önbellek: aynı sürümde aynı model bir kez pişirilir
	var cpath := "user://vat/%s_%s_%d_%d.bin" % [id, str(ProjectSettings.get_setting("application/config/version", "0")), VERSION, job.V]
	if FileAccess.file_exists(cpath):
		var f := FileAccess.open(cpath, FileAccess.READ)
		if f:
			var bm = f.get_var(false)
			var bs = f.get_var(false)
			var hb = f.get_var(false)
			var lb = f.get_var(false)
			var nb2 = f.get_var(false)
			f.close()
			if bm is Vector3 and bs is Vector3 and hb is PackedByteArray and lb is PackedByteArray and nb2 is PackedByteArray and hb.size() == TEX_W * rows * FRAMES * 4:
				holder.queue_free()
				res.bmin = bm
				res.bsize = bs
				res.hi = _img(hb, rows)
				res.lo = _img(lb, rows)
				res.nrm = _img(nb2, rows)
				return res
	# kemik matrisleri: kare başına tüm bağlar (dünya → tutucu uzayı)
	var inv := holder.global_transform.affine_inverse()
	for f in FRAMES:
		ap.seek(dur * float(f) / FRAMES, true)
		var M: Array = []
		for mi: MeshInstance3D in mis:
			var sk := mi.get_node(mi.skeleton) as Skeleton3D
			var skin := mi.skin
			var base := inv * mi.global_transform
			for b in skin.get_bind_count():
				var bone := skin.get_bind_bone(b)
				if bone < 0: bone = sk.find_bone(skin.get_bind_name(b))
				var G := sk.get_bone_global_pose(bone) if bone >= 0 else Transform3D()
				M.append(base * G * skin.get_bind_pose(b))
		job.mats.append(M)
	job.outP.resize(FRAMES)
	job.outN.resize(FRAMES)
	var tid := WorkerThreadPool.add_group_task(job.run, FRAMES, -1, true, "vat " + id)
	WorkerThreadPool.wait_for_group_task_completion(tid)
	holder.queue_free()
	# sınırlar (tüm kareler) + paralel RGBA8 kodlama
	var mn := Vector3(INF, INF, INF)
	var mx := Vector3(-INF, -INF, -INF)
	for f in FRAMES:
		var P: PackedFloat32Array = job.outP[f]
		var i := 0
		while i < P.size():
			var q := Vector3(P[i], P[i + 1], P[i + 2])
			mn = mn.min(q)
			mx = mx.max(q)
			i += 4
	var sz := (mx - mn).max(Vector3(0.0001, 0.0001, 0.0001))
	job.rows = rows
	job.bmin = mn
	job.bsz = sz
	job.hi.resize(FRAMES); job.lo.resize(FRAMES); job.nb.resize(FRAMES)
	var t2 := WorkerThreadPool.add_group_task(job.enc, FRAMES, -1, true, "vatenc " + id)
	WorkerThreadPool.wait_for_group_task_completion(t2)
	var H := PackedByteArray(); var L := PackedByteArray(); var NB := PackedByteArray()
	for f in FRAMES:
		H.append_array(job.hi[f]); L.append_array(job.lo[f]); NB.append_array(job.nb[f])
	res.bmin = mn
	res.bsize = sz
	res.hi = _img(H, rows)
	res.lo = _img(L, rows)
	res.nrm = _img(NB, rows)
	DirAccess.make_dir_recursive_absolute("user://vat")
	var w := FileAccess.open(cpath, FileAccess.WRITE)
	if w:
		w.store_var(mn, false); w.store_var(sz, false)
		w.store_var(H, false); w.store_var(L, false); w.store_var(NB, false)
		w.close()
	return res

static func _img(data: PackedByteArray, rows: int) -> ImageTexture:
	return ImageTexture.create_from_image(Image.create_from_data(TEX_W, rows * FRAMES, false, Image.FORMAT_RGBA8, data))
