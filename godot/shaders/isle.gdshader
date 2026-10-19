// render3d — BOŞLUKTA SÜZÜLEN ADACIKLAR: düz yüzlü (low-poly) kaya + üstte zemin rengi.
// Köşe rengi taşır; ay ışığından iki kademeli toon ışık, aşağı indikçe uçurum sisine karışır.
shader_type spatial;
render_mode unshaded, cull_back, specular_disabled, fog_disabled;
#include "res://shaders/three_lit.gdshaderinc"
uniform vec3 c_deep : source_color = vec3(0.05, 0.04, 0.07);
uniform float fog_top = -150.0;
uniform float fog_bottom = -1100.0;
varying vec3 v_wp;
varying vec3 v_n;

void vertex() {
	v_wp = (MODEL_MATRIX * vec4(VERTEX, 1.0)).xyz;
	v_n = normalize((MODEL_MATRIX * vec4(NORMAL, 0.0)).xyz);
}

void fragment() {
	vec3 base = r3_lin(COLOR.rgb);
	float nl = dot(v_n, normalize(r3_moon_dir));
	float band = 0.42 + smoothstep(-0.05, 0.05, nl) * 0.38 + smoothstep(0.45, 0.55, nl) * 0.25;
	vec3 col = base * band * 1.15;
	// kenar ışığı (dünya rengi) — yan yüzlerde ince parıltı
	col += r3_rim_col * 0.35 * smoothstep(0.55, 0.95, 1.0 - abs(v_n.y)) * step(0.0, dot(v_n.xz, normalize(r3_rim_dir.xz)));
	float k = smoothstep(fog_top, fog_bottom, v_wp.y);
	col = mix(col, r3_lin(c_deep), k * 0.85);
	ALBEDO = r3_srgb(col);
}
