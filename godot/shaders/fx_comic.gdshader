// Borderlands tarzı yetenek efekti (alfa karışım): R = ton (1 beyaz-sıcak çekirdek, 0.6 renkli
// gövde), G = mürekkep, A = örtü (assets/fx/comic). Renk = malzeme rengi × örnek rengi (doğrusal);
// eklemeli eski efektler sönümü rengi karartarak verdiği için PARLAKLIK → saydamlık sayılır.
shader_type spatial;
render_mode unshaded, blend_mix, depth_draw_never, cull_disabled, specular_disabled, fog_disabled;
#include "res://shaders/three_lit.gdshaderinc"
uniform sampler2D map : filter_linear_mipmap, repeat_disable;
uniform vec4 color = vec4(1.0);
uniform float opacity = 1.0;
uniform vec3 ink : source_color = vec3(0.06, 0.03, 0.07);
void fragment() {
	vec4 t = texture(map, UV);
	vec3 base = r3_lin(color.rgb) * COLOR.rgb;
	vec3 tint = base / max(max(base.r, max(base.g, base.b)), 1e-3);
	vec3 c = mix(tint * 0.78, mix(tint, vec3(1.0), 0.55), smoothstep(0.7, 0.95, t.r));
	c = mix(c, r3_lin(ink) * (0.6 + 0.4 * tint), t.g);
	ALBEDO = r3_srgb(c);
	// örnek rengi sönümle koyulaşır (eklemeli dönem): parlaklığı saydamlığa çevir
	float fade = max(COLOR.r, max(COLOR.g, COLOR.b));
	ALPHA = t.a * clamp(fade, 0.0, 1.0) * opacity * color.a;
}
