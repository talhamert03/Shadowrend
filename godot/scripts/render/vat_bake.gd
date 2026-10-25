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
const VERSION := 3

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
			var pb = f.get_var(false)
			var nb2 = f.get_var(false)
			f.close()
			if pb is PackedByteArray and nb2 is PackedByteArray and pb.size() == TEX_W * rows * FRAMES * 8:
				holder.queue_free()
				res.pos = ImageTexture.create_from_image(Image.create_from_data(TEX_W, rows * FRAMES, false, Image.FORMAT_RGBAH, pb))
				res.nrm = ImageTexture.create_from_image(Image.create_from_data(TEX_W, rows * FRAMES, false, Image.FORMAT_RGBAH, nb2))
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
	res.pos = _tex(job.outP, rows)
	res.nrm = _tex(job.outN, rows)
	DirAccess.make_dir_recursive_absolute("user://vat")
	var w := FileAccess.open(cpath, FileAccess.WRITE)
	if w:
		w.store_var((res.pos as ImageTexture).get_image().get_data(), false)
		w.store_var((res.nrm as ImageTexture).get_image().get_data(), false)
		w.close()
	return res

static func _tex(frames: Array, rows: int) -> ImageTexture:
	var data := PackedFloat32Array()
	for f in FRAMES:
		data.append_array(frames[f] as PackedFloat32Array)
		data.resize((f + 1) * rows * TEX_W * 4)
	var img := Image.create_from_data(TEX_W, rows * FRAMES, false, Image.FORMAT_RGBAF, data.to_byte_array())
	img.convert(Image.FORMAT_RGBAH)
	return ImageTexture.create_from_image(img)
