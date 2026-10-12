// #chest-beam: iki radyal gradyan (dipte ortalı) × dikey maske; ekran karışımı ≈ toplamsal.
shader_type canvas_item;
render_mode blend_add;
uniform vec4 c0 : source_color = vec4(1.0);
uniform vec4 c1 : source_color = vec4(1.0);
uniform float opacity = 0.0;
void fragment() {
	vec2 q = vec2(UV.x - 0.5, 1.0 - UV.y);
	// radial-gradient(60% 46% at 50% 100%) ve (26% 100%) — yarıçaplar kutuya göre
	float r0 = length(q / vec2(0.60, 0.46));
	float r1 = length(q / vec2(0.26, 1.00));
	float a0 = clamp(1.0 - r0 / 0.72, 0.0, 1.0);
	float a1 = clamp(1.0 - r1 / 0.78, 0.0, 1.0);
	float y = UV.y;   // 0 üst
	float m = y < 0.26 ? mix(0.0, 0.65, y / 0.26) : (y < 0.78 ? mix(0.65, 1.0, (y - 0.26) / 0.52) : 1.0);
	vec3 c = c0.rgb * a0 + c1.rgb * a1 * (1.0 - a0);
	float a = max(a0, a1) * m * opacity;
	COLOR = vec4(c / max(1e-4, max(a0, a1)) , a);
}
