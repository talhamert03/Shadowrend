// Ölüm efekti sprite'ları (çizgi roman): R = ton, G = mürekkep, A = örtü; renk örnek renginden
// (IMesh COLOR, doğrusal). Derinlik testi yok: kısa patlamalar modellerin önünde okunur.
shader_type spatial;
render_mode unshaded, blend_mix, depth_draw_never, depth_test_disabled, cull_disabled, specular_disabled, fog_disabled;
#include "res://shaders/three_lit.gdshaderinc"
uniform sampler2D map : filter_linear_mipmap, repeat_disable;
uniform vec3 ink : source_color = vec3(0.05, 0.03, 0.06);
void fragment() {
	vec4 t = texture(map, UV);
	vec3 tint = COLOR.rgb;
	vec3 c = mix(tint * 0.72, mix(tint, vec3(1.0), 0.42), smoothstep(0.6, 1.0, t.r));
	c = mix(c, r3_lin(ink), t.g);
	ALBEDO = r3_srgb(c);
	ALPHA = t.a * COLOR.a;
}
