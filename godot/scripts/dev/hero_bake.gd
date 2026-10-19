extends Node2D
## Geliştirme aracı: kahraman modellerini kart görseli olarak pişirir (HeroView, toon + kontur).
##   godot --path . res://scenes/dev/hero_bake.tscn [-- ids=seher,okcu yaw=0.42]
## Çıktı: res://assets/ui/art/hero3d/<id>.png (saydam, 420×560)

const W := 210.0
const H := 280.0
var _ids: Array = []
var _cur: HeroView
var _i := -1
var _wait := 0
var _yaw := 0.42

func _ready() -> void:
	# savaş ışıkları (render3d._build_lights) — pişirmede de aynı
	RenderingServer.global_shader_parameter_set("r3_hemi_sky", Shd.lin3(Color("#5a6a9a"), 1.55))
	RenderingServer.global_shader_parameter_set("r3_hemi_ground", Shd.lin3(Color("#1c1822"), 1.55))
	RenderingServer.global_shader_parameter_set("r3_ambient", Shd.lin3(Color("#8090c0"), 0.65))
	RenderingServer.global_shader_parameter_set("r3_rim_dir", Vector3(320, 160, 260).normalized())
	RenderingServer.global_shader_parameter_set("r3_moon_col", Shd.lin3(Color("#d8e4ff"), 1.7))
	RenderingServer.global_shader_parameter_set("r3_rim_col", Shd.lin3(Color("#ff3b4e"), 0.4))
	RenderingServer.global_shader_parameter_set("r3_moon_dir", Vector3(-0.45, 0.75, 0.5).normalized())
	for a in OS.get_cmdline_user_args():
		if a.begins_with("ids="): _ids = Array(a.substr(4).split(","))
		if a.begins_with("yaw="): _yaw = float(a.substr(4))
	if _ids.is_empty(): _ids = HeroView.models().get("heroes", {}).keys()
	_next()

func _next() -> void:
	if _cur: _cur.queue_free()
	_i += 1
	if _i >= _ids.size():
		print("BAKE DONE")
		get_tree().quit()
		return
	_cur = HeroView.new()
	add_child(_cur)
	_cur.yaw = _yaw
	var ok := _cur.setup(str(_ids[_i]), W, H, 2.0, 2.6)
	if not ok:
		print("YOK ", _ids[_i])
		_next()
		return
	_cur.set_process(false)
	_wait = 6

func _process(_dt: float) -> void:
	if _cur == null: return
	_wait -= 1
	if _wait == 0:
		var img := _cur.vp.get_texture().get_image()
		var out := "res://assets/ui/art/hero3d/" + str(_ids[_i]) + ".png"
		img.save_png(ProjectSettings.globalize_path(out))
		print("BAKED ", out, " ", img.get_size())
		_next()
