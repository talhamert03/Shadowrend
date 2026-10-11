extends Node
## Geliştirme: tüm betikleri derler, ayrıştırma hatalarını listeler.
func _ready() -> void:
	var bad := 0
	for f in _walk("res://scripts"):
		var s = load(f)
		if s == null or not (s as Script).can_instantiate():
			bad += 1
			print("FAIL ", f)
	print("CHECK DONE bad=", bad)
	get_tree().quit()

func _walk(dir: String) -> Array:
	var out := []
	for d in DirAccess.get_directories_at(dir): out += _walk(dir + "/" + d)
	for f in DirAccess.get_files_at(dir):
		if f.ends_with(".gd"): out.append(dir + "/" + f)
	return out
