extends SceneTree
func _init() -> void:
	var ps: PackedScene = load("res://assets/arena/props_mezarlik.glb")
	var inst = ps.instantiate()
	for c in inst.find_children("*", "MeshInstance3D", true, false):
		var a = c.mesh.surface_get_arrays(0)
		var col: PackedColorArray = a[Mesh.ARRAY_COLOR]
		var s := 0.0; var mx := 0.0
		for x in col: s += x.r; mx = maxf(mx, x.r)
		print(c.name, " count ", col.size(), " mean r ", s / col.size(), " max r ", mx)
		break
	quit()
