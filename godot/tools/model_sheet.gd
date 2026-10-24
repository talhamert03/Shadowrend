extends SceneTree
## Geliştirici aracı: GLB'leri yan yana bir tabloda çizer (görsel karşılaştırma için).
## Çalıştırma (ekranlı): godot --path . -s res://tools/model_sheet.gd -- çıktı.png a.glb b.glb ...
## Her hücre: önden hafif yukarıdan, ilk animasyonun 0.3. saniyesi, modele sığan ortografik kamera.

const CELL := Vector2i(220, 280)
const COLS := 6

func _init() -> void:
	var args := OS.get_cmdline_user_args()
	if args.size() < 2:
		print("kullanım: -- çıktı.png a.glb ...")
		quit(1)
		return
	var files := args.slice(1)
	var rows := int(ceil(files.size() / float(COLS)))
	var sheet := Image.create(CELL.x * mini(COLS, files.size()), CELL.y * rows, false, Image.FORMAT_RGBA8)
	sheet.fill(Color(0.13, 0.13, 0.16))
	for i in files.size():
		var img := await _shot(files[i])
		if img: sheet.blit_rect(img, Rect2i(Vector2i.ZERO, CELL), Vector2i(i % COLS * CELL.x, i / COLS * CELL.y))
	sheet.save_png(args[0])
	print("yazıldı ", args[0])
	quit()

func _shot(path: String) -> Image:
	var doc := GLTFDocument.new()
	var st := GLTFState.new()
	if doc.append_from_file(path, st) != OK:
		print("yüklenemedi ", path)
		return null
	var vp := SubViewport.new()
	vp.size = CELL
	vp.transparent_bg = false
	vp.render_target_update_mode = SubViewport.UPDATE_ALWAYS
	vp.own_world_3d = true
	get_root().add_child(vp)
	var env := WorldEnvironment.new()
	env.environment = Environment.new()
	env.environment.background_mode = Environment.BG_COLOR
	env.environment.background_color = Color(0.2, 0.2, 0.24)
	env.environment.ambient_light_source = Environment.AMBIENT_SOURCE_COLOR
	env.environment.ambient_light_color = Color(0.75, 0.75, 0.8)
	vp.add_child(env)
	var sun := DirectionalLight3D.new()
	sun.rotation_degrees = Vector3(-45, 30, 0)
	vp.add_child(sun)
	var root: Node3D = doc.generate_scene(st)
	vp.add_child(root)
	var ap := root.find_child("AnimationPlayer", true, false) as AnimationPlayer
	if ap and ap.get_animation_list().size():
		ap.play(ap.get_animation_list()[0])
		ap.seek(0.3, true)
	await process_frame
	var aabb := AABB()
	var first := true
	for mi in root.find_children("*", "MeshInstance3D", true, false):
		var b := (mi as MeshInstance3D).global_transform * (mi as MeshInstance3D).get_aabb()
		aabb = b if first else aabb.merge(b)
		first = false
	# iskeletli ağlarda ağ kutusu bağlama ölçeğinde kalabilir (örn. Meshy: 0.01) → kemiklerle çerçevele
	for sk in root.find_children("*", "Skeleton3D", true, false):
		var K := sk as Skeleton3D
		var bb := AABB(K.global_transform * K.get_bone_global_pose(0).origin, Vector3.ZERO)
		for i in K.get_bone_count(): bb = bb.expand(K.global_transform * K.get_bone_global_pose(i).origin)
		if bb.size.y > aabb.size.y * 2.0: aabb = bb.grow(bb.size.y * 0.12)
	var cam := Camera3D.new()
	cam.projection = Camera3D.PROJECTION_ORTHOGONAL
	var c := aabb.get_center()
	cam.size = maxf(aabb.size.y, aabb.size.x * CELL.y / float(CELL.x)) * 1.08
	cam.position = c + Vector3(0, aabb.size.y * 0.35, 10)
	vp.add_child(cam)
	cam.look_at(c)
	cam.current = true
	await process_frame
	await process_frame
	await process_frame
	var img := vp.get_texture().get_image()
	img.convert(Image.FORMAT_RGBA8)
	vp.queue_free()
	return img
