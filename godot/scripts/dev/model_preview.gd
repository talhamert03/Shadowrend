extends Node3D
## Geliştirme aracı: bir GLB'yi oyun kamerasıyla (44° eğim, 28° FOV) çizer,
## ekran görüntüsünü kaydeder. Kullanım:
##   godot --path . res://scenes/dev/model_preview.tscn -- <glb> <çıktı.png> [ölçek]

var _frames := 0
var _out := "user://preview.png"

func _ready() -> void:
	var args := OS.get_cmdline_user_args()
	var glb: String = args[0] if args.size() > 0 else "res://assets/models/heroes/seher.glb"
	if args.size() > 1:
		_out = args[1]
	var sc: float = float(args[2]) if args.size() > 2 else 1.0
	var packed: PackedScene = load(glb)
	var inst := packed.instantiate()
	add_child(inst)
	(inst as Node3D).scale = Vector3.ONE * sc
	var ap := inst.find_child("AnimationPlayer", true, false) as AnimationPlayer
	if ap and ap.get_animation_list().size() > 0:
		ap.play(ap.get_animation_list()[0])
	var cam := Camera3D.new()
	cam.fov = 28.0
	var tilt := deg_to_rad(44.0)
	var dist := 420.0
	cam.position = Vector3(0, dist * cos(tilt), dist * sin(tilt))
	cam.near = 10.0
	cam.far = 4000.0
	add_child(cam)
	cam.look_at(Vector3(0, 40, 0))
	var sun := DirectionalLight3D.new()
	sun.rotation_degrees = Vector3(-50, -30, 0)
	add_child(sun)
	var env := WorldEnvironment.new()
	var e := Environment.new()
	e.background_mode = Environment.BG_COLOR
	e.background_color = Color(0.1, 0.1, 0.14)
	e.ambient_light_source = Environment.AMBIENT_SOURCE_COLOR
	e.ambient_light_color = Color(0.5, 0.55, 0.7)
	env.environment = e
	add_child(env)

func _process(_dt: float) -> void:
	_frames += 1
	if _frames == 20:
		var img := get_viewport().get_texture().get_image()
		img.save_png(_out)
		print("kaydedildi ", _out)
		get_tree().quit()
