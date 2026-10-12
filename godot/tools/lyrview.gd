extends Node2D
## Geliştirici: katman sahnesini göster + ekran görüntüsü. -- <ad> <png> <saniye>
var L: Lyr
var _t := 0.0
func _ready() -> void:
	var a := OS.get_cmdline_user_args()
	RenderingServer.set_default_clear_color(Color(0.03, 0.03, 0.05))
	L = Lyr.make(a[0])
	add_child(L)
func _process(dt: float) -> void:
	_t += dt
	var a := OS.get_cmdline_user_args()
	if _t >= float(a[2]):
		get_viewport().get_texture().get_image().save_png(a[1])
		get_tree().quit()
