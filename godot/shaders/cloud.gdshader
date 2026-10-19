// render3d — UÇURUM BULUTLARI: boyanmış çizgi film bulut sprite'ı (tools/bake/fx/paint_clouds.py)
// yatay kart olarak; R kanalı tonu dünya paletine eşler (gölge · gövde · ışık), G mürekkep.
// Derinleştikçe uçurum sisine karışır. Saydam, derinlik yazmaz.
shader_type spatial;
render_mode unshaded, blend_mix, depth_draw_never, cull_disabled, specular_disabled, fog_disabled;
#include "res://shaders/three_lit.gdshaderinc"
uniform sampler2D map : source_color, filter_linear_mipmap, repeat_disable;
uniform vec3 c_shadow : source_color = vec3(0.30, 0.13, 0.20);
uniform vec3 c_body : source_color = vec3(0.50, 0.24, 0.30);
uniform vec3 c_hi : source_color = vec3(0.85, 0.55, 0.52);
uniform vec3 c_ink : source_color = vec3(0.04, 0.02, 0.04);
uniform vec3 c_deep : source_color = vec3(0.05, 0.04, 0.07);
uniform float fog_top = -150.0;
uniform float fog_bottom = -1700.0;
varying float v_y;
void vertex() {
	v_y = (MODEL_MATRIX * vec4(VERTEX, 1.0)).y;
}
void fragment() {
	vec4 t = texture(map, UV);
	float l = t.r;
	vec3 c = l < 0.5 ? mix(r3_lin(c_shadow), r3_lin(c_body), l * 2.0) : mix(r3_lin(c_body), r3_lin(c_hi), l * 2.0 - 1.0);
	c = mix(c, r3_lin(c_ink), t.g);
	float k = smoothstep(fog_top, fog_bottom, v_y);
	c = mix(c, r3_lin(c_deep), k * 0.8);
	ALBEDO = r3_srgb(c);
	ALPHA = t.a * (1.0 - k * 0.25);
}
