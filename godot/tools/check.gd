extends Node
## Geliştirme: tüm betikleri derler, ayrıştırma hatalarını listeler.
func _ready() -> void:
	var bad := 0
	for f in _walk("res://scripts"):
		var s = load(f)
		if s == null or not (s as Script).can_instantiate():
			bad += 1
			print("FAIL ", f)
	# shader varyantlarını derle (hata konsola düşer)
	for o in [{}, {"map": "raw", "add": true, "cull": "none", "zwrite": false}, {"map": "srgb", "alpha": true, "vcol": true, "billboard": "spin"}]:
		var sh: Shader = Shd.basic_shader(o)
	for o in [{}, {"map": true, "lift": true}, {"map": true, "cull": "none", "add": true}]:
		var sh2: Shader = Shd.lit_shader(o)
		var mi := MeshInstance3D.new(); mi.mesh = Geo.sphere(1); var m := ShaderMaterial.new(); m.shader = sh2; mi.material_override = m; add_child(mi)
	var meshes := [Geo.plane(1, 1), Geo.ring(1, 2, 8), Geo.circle(1), Geo.cylinder(1, 2, 3), Geo.cone(1, 2), Geo.box(1, 2, 3), Geo.torus(1, 0.2), Geo.capsule(1, 2), Geo.icosahedron(1)]
	print("geo ok ", meshes.size())
	await get_tree().process_frame
	print("CHECK DONE bad=", bad)
	get_tree().quit()

func _walk(dir: String) -> Array:
	var out := []
	for d in DirAccess.get_directories_at(dir): out += _walk(dir + "/" + d)
	for f in DirAccess.get_files_at(dir):
		if f.ends_with(".gd"): out.append(dir + "/" + f)
	return out
