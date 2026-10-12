// chestModel3d parıltı taraması: dünya uzayında eğik ışık şeridi (t2 gümüş · t3 altın) — toplamsal ek geçiş.
shader_type spatial;
render_mode unshaded, blend_add, depth_draw_never, cull_back;
uniform vec3 col = vec3(0.0);
uniform float pos = -99.0;
varying vec3 wp;
void vertex() { wp = (MODEL_MATRIX * vec4(VERTEX, 1.0)).xyz; }
void fragment() {
	float d = abs(wp.x - wp.y * 0.29 - pos);
	ALBEDO = col * (1.0 - smoothstep(2.2, 4.8, d));
}
