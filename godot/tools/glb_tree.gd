extends SceneTree
## Geliştirici aracı: GLB düğüm ağacını (ad, tür, kutu) yazar.  -- dosya.glb
func _init() -> void:
	var doc := GLTFDocument.new()
	var st := GLTFState.new()
	if doc.append_from_file(OS.get_cmdline_user_args()[0], st) != OK:
		quit(1)
		return
	var root: Node = doc.generate_scene(st)
	get_root().add_child(root)
	for n in root.find_children("*", "", true, false):
		var s := "  ".repeat(str(root.get_path_to(n)).count("/")) + n.name + " <" + n.get_class() + ">"
		if n is MeshInstance3D: s += " aabb=" + str((n as MeshInstance3D).get_aabb().size.round()) + " pos=" + str((n as Node3D).position.round())
		print(s)
	quit()
