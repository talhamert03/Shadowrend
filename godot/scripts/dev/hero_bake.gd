extends Node2D
## Geliştirme aracı: kahraman modellerini kart görseli olarak pişirir (HeroView, toon + kontur).
##   godot --path . res://scenes/dev/hero_bake.tscn [-- ids=seher,okcu yaw=0.42]
## Çıktı: res://assets/ui/art/hero3d/<id>.png (saydam, 540×720, baştan bele portre)

## kart portresi: baştan bele yakın çekim (kart oranında), yüksek çözünürlük
const W := 150.0
const H := 200.0
const DPR := 3.6
const CROP := 0.46
var _ids: Array = []
var _cur: HeroView
var _i := -1
var _wait := 0
var _yaw := 0.42

func _ready() -> void:
	# savaş ışıkları (render3d._build_lights) — pişirmede de aynı
	# vitrin ışığı: önden-soldan sıcak ana ışık, aydınlık dolgu, arkadan soğuk kontur
	RenderingServer.global_shader_parameter_set("r3_hemi_sky", Shd.lin3(Color("#8e94ae"), 1.6))
	RenderingServer.global_shader_parameter_set("r3_hemi_ground", Shd.lin3(Color("#3a3036"), 1.4))
	RenderingServer.global_shader_parameter_set("r3_ambient", Shd.lin3(Color("#a8aec8"), 0.8))
	RenderingServer.global_shader_parameter_set("r3_rim_dir", Vector3(0.55, 0.45, -0.7).normalized())
	RenderingServer.global_shader_parameter_set("r3_moon_col", Shd.lin3(Color("#fff3e4"), 1.75))
	RenderingServer.global_shader_parameter_set("r3_rim_col", Shd.lin3(Color("#cfe0ff"), 0.9))
	RenderingServer.global_shader_parameter_set("r3_moon_dir", Vector3(-0.5, 0.55, 0.85).normalized())
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
	var ok := _cur.setup(str(_ids[_i]), W, H, DPR, 1.7, CROP)
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
