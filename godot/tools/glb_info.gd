extends SceneTree
## Geliştirici aracı: bir GLB'yi (proje dışından da) yükleyip ölçer — düşman meta kaydı için.
## Çalıştırma: godot --headless --path . -s res://tools/glb_info.gd -- <dosya.glb> [anim_t]
## Çıktı (JSON): ilk animasyon karesinde kaplayan kutu (yükseklik, merkez, taban), üçgen,
## animasyon adları/süreleri, kemik adları.

func _init() -> void:
	var args := OS.get_cmdline_user_args()
	if args.is_empty():
		print("kullanım: -- <dosya.glb>")
		quit(1)
		return
	var doc := GLTFDocument.new()
	var st := GLTFState.new()
	if doc.append_from_file(args[0], st) != OK:
		print("yüklenemedi")
		quit(1)
		return
	var root: Node3D = doc.generate_scene(st)
	get_root().add_child(root)
	var ap := root.find_child("AnimationPlayer", true, false) as AnimationPlayer
	var anims := {}
	if ap:
		for a in ap.get_animation_list(): anims[a] = ap.get_animation(a).length
		var lst := ap.get_animation_list()
		if lst.size():
			ap.play(lst[0])
			ap.seek(float(args[1]) if args.size() > 1 else 0.0, true)
	await process_frame
	var tris := 0
	var aabb := AABB()
	var first := true
	for mi in root.find_children("*", "MeshInstance3D", true, false):
		var m := mi as MeshInstance3D
		if m.mesh == null: continue
		for s in m.mesh.get_surface_count():
			var arr := m.mesh.surface_get_arrays(s)
			var idx = arr[Mesh.ARRAY_INDEX]
			tris += (idx.size() / 3) if idx != null and idx.size() else arr[Mesh.ARRAY_VERTEX].size() / 3
		var b := m.global_transform * m.get_aabb()
		aabb = b if first else aabb.merge(b)
		first = false
	var bones: Array = []
	var bone_top := -INF
	var bone_bot := INF
	var hip := Vector3.ZERO
	for sk in root.find_children("*", "Skeleton3D", true, false):
		var K := sk as Skeleton3D
		for i in K.get_bone_count():
			bones.append(K.get_bone_name(i))
			var gp := K.global_transform * K.get_bone_global_pose(i).origin
			bone_top = maxf(bone_top, gp.y)
			bone_bot = minf(bone_bot, gp.y)
			if K.get_bone_name(i) == "Hips": hip = gp
	var tex := []
	for i in st.get_images().size():
		var im: Texture2D = st.get_images()[i]
		if im: tex.append([im.get_width(), im.get_height()])
	print(JSON.stringify({"height": aabb.size.y, "min": [aabb.position.x, aabb.position.y, aabb.position.z],
		"size": [aabb.size.x, aabb.size.y, aabb.size.z], "center": [aabb.get_center().x, aabb.get_center().z],
		"tris": tris, "bone_top": bone_top, "bone_bot": bone_bot, "hip": [hip.x, hip.y, hip.z], "anims": anims, "bones": bones, "textures": tex}))
	quit()
