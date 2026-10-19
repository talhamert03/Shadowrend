// render3d — ADA YARLARI: arenanın dört kenarından boşluğa inen kaya duvarı. Katman katman
// tabakalar + dikey çatlaklar, üst dudakta ışık şeridi; aşağı indikçe dünya sisine karışır
// (void.gdshader ile aynı renkler). Işıksız; yön ışığı yüz normalinden basit kademe.
shader_type spatial;
render_mode unshaded, cull_disabled, specular_disabled, fog_disabled;
#include "res://shaders/three_lit.gdshaderinc"
uniform vec3 c_rock : source_color = vec3(0.24, 0.21, 0.26);
uniform vec3 c_lip : source_color = vec3(0.55, 0.50, 0.46);
uniform vec3 c_mist : source_color = vec3(0.30, 0.10, 0.14);
uniform vec3 c_deep : source_color = vec3(0.05, 0.04, 0.07);
uniform float depth = 440.0;
varying vec3 v_wp;
varying vec3 v_n;

float h21(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float vnoise(vec2 p) {
	vec2 i = floor(p), f = fract(p);
	f = f * f * (3.0 - 2.0 * f);
	return mix(mix(h21(i), h21(i + vec2(1.0, 0.0)), f.x), mix(h21(i + vec2(0.0, 1.0)), h21(i + vec2(1.0, 1.0)), f.x), f.y);
}

void vertex() {
	v_wp = (MODEL_MATRIX * vec4(VERTEX, 1.0)).xyz;
	v_n = normalize((MODEL_MATRIX * vec4(NORMAL, 0.0)).xyz);
}

void fragment() {
	// kenar boyunca koordinat: duvar x'e mi z'ye mi bakıyor
	float u = abs(v_n.x) > 0.5 ? v_wp.z : v_wp.x;
	float d = -v_wp.y;                                  // 0 (tepe) → depth
	float k = clamp(d / depth, 0.0, 1.0);
	// tabakalar: kenar boyunca dalgalanan yatay bantlar
	float wav = vnoise(vec2(u * 0.004, 0.0)) * 26.0;
	float strata = vnoise(vec2(u * 0.012, (d + wav) * 0.07));
	float band = smoothstep(0.35, 0.65, fract((d + wav) / 34.0 + strata * 0.4));
	// dikey çatlaklar
	float cr = vnoise(vec2(u * 0.06, d * 0.008));
	float crack = smoothstep(0.08, 0.0, abs(cr - 0.5)) * 0.6;
	vec3 rock = r3_lin(c_rock) * (0.78 + 0.32 * band + 0.18 * strata) * (1.0 - crack);
	// yüz yönü: güney (kameraya bakan) aydınlık, yanlar daha koyu
	float facing = 0.62 + 0.38 * clamp(v_n.z, 0.0, 1.0) + 0.12 * clamp(-v_n.x, 0.0, 1.0);
	rock *= facing;
	// üst dudak: ince ışık şeridi + hemen altında gölge
	float lip = smoothstep(14.0, 2.0, d);
	rock = mix(rock, r3_lin(c_lip), lip * 0.85);
	rock *= mix(1.0, 0.7, smoothstep(14.0, 30.0, d) * smoothstep(70.0, 30.0, d));
	// aşağıda sise karışır
	vec3 fogc = mix(r3_lin(c_mist) * 0.55, r3_lin(c_deep), smoothstep(0.55, 1.0, k));
	vec3 col = mix(rock, fogc, smoothstep(0.08, 0.85, k));
	ALBEDO = r3_srgb(col);
}
