extends Node3D
## Renk uzayı ölçümü: üç ışıksız kare (uniform renk · doku · sabit) çizilir, pikseller okunur.
func _ready() -> void:
	var cam := Camera3D.new(); cam.projection = Camera3D.PROJECTION_ORTHOGONAL; cam.size = 4; cam.position = Vector3(0, 0, 5); add_child(cam); cam.current = true
	var we := WorldEnvironment.new(); var env := Environment.new(); env.background_mode = Environment.BG_COLOR; env.background_color = Color(0, 0, 0); we.environment = env; add_child(we)
	var codes := [
		"shader_type spatial; render_mode unshaded; uniform vec4 c : source_color = vec4(1.0); void fragment(){ ALBEDO = c.rgb; }",
		"shader_type spatial; render_mode unshaded; uniform sampler2D t : source_color; void fragment(){ ALBEDO = texture(t, UV).rgb; }",
		"shader_type spatial; render_mode unshaded; void fragment(){ ALBEDO = vec3(0.5); }",
		"shader_type spatial; render_mode unshaded; uniform sampler2D t; void fragment(){ ALBEDO = texture(t, UV).rgb; }",
	]
	for i in codes.size():
		var mi := MeshInstance3D.new(); var q := QuadMesh.new(); q.size = Vector2(0.9, 0.9); mi.mesh = q
		var s := Shader.new(); s.code = codes[i]; var m := ShaderMaterial.new(); m.shader = s
		m.set_shader_parameter("c", Color(0.5, 0.5, 0.5))
		m.set_shader_parameter("t", load("res://tools/gray128.png"))
		mi.material_override = m; mi.position = Vector3(-1.5 + i, 0, 0); add_child(mi)
	for k in 10: await get_tree().process_frame
	await RenderingServer.frame_post_draw
	var img := get_viewport().get_texture().get_image()
	var w := img.get_width(); var h := img.get_height()
	for i in codes.size():
		var px := int(w / 2.0 + (-1.5 + i) * (w / (4.0 * w / h)))
		print("case ", i, " -> ", img.get_pixel(px, h / 2), " size ", w, "x", h)
	get_tree().quit()
