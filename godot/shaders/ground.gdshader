// render3d._buildGround — ÇİFT DOKULU ZEMİN (ışıksız MeshBasicMaterial + onBeforeCompile).
// macro × ((1-k) + k·detail/mid) · tekrar maskesi (0,383 ölçek) · makro değer gürültüsü.
shader_type spatial;
render_mode unshaded, cull_back, specular_disabled;
#include "res://shaders/three_lit.gdshaderinc"
uniform sampler2D macro : filter_linear_mipmap_anisotropic, repeat_disable;
uniform sampler2D detail : filter_linear_mipmap_anisotropic, repeat_enable;
uniform vec4 arena = vec4(-2140.0, -2140.0, 4280.0, 4280.0); // x0, y0, w, h
uniform float detail_rep = 1.0;
uniform float detail_k = 0.9;
uniform float detail_mid = 0.216;
uniform float detail_break = 0.0;
uniform float macro_k = 1.0;
varying vec2 v_uv;
// three UV'si (v yukarı) → Godot doku koordinatı (v aşağı)
vec2 tc(vec2 u) { return vec2(u.x, 1.0 - u.y); }
void vertex() {
	vec3 wp = (MODEL_MATRIX * vec4(VERTEX, 1.0)).xyz;
	v_uv = vec2((wp.x - arena.x) / arena.z, 1.0 - (wp.z - arena.y) / arena.w);
}
void fragment() {
	vec3 d = r3_lin(texture(macro, tc(v_uv)).rgb);
	vec3 khDetail = r3_lin(texture(detail, tc(v_uv * detail_rep)).rgb) / detail_mid;
	float khBreak = r3_lin(texture(detail, tc(v_uv * (detail_rep * 0.383) + vec2(0.37, 0.19))).rgb).g / detail_mid;
	khDetail *= mix(1.0, khBreak, detail_break);
	d *= (1.0 - detail_k) + detail_k * khDetail;
	vec2 khP = v_uv * (detail_rep * 0.73);
	vec2 khI = floor(khP), khF = fract(khP); khF = khF * khF * (3.0 - 2.0 * khF);
	float kh00 = fract(sin(dot(khI, vec2(127.1, 311.7))) * 43758.5);
	float kh10 = fract(sin(dot(khI + vec2(1.0, 0.0), vec2(127.1, 311.7))) * 43758.5);
	float kh01 = fract(sin(dot(khI + vec2(0.0, 1.0), vec2(127.1, 311.7))) * 43758.5);
	float kh11 = fract(sin(dot(khI + vec2(1.0, 1.0), vec2(127.1, 311.7))) * 43758.5);
	float khM = mix(mix(kh00, kh10, khF.x), mix(kh01, kh11, khF.x), khF.y);
	d *= mix(vec3(0.91, 0.92, 0.96), vec3(1.08, 1.05, 1.0), khM * macro_k + (1.0 - macro_k) * 0.5);
	// ada kenarı (uçuruma bakan): mürekkep çizgi · ışıklı dudak · içe doğru hafif gölge
	vec2 eu = min(v_uv, 1.0 - v_uv) * arena.zw;
	float e = min(eu.x, eu.y);
	float aa = max(fwidth(e), 0.5);
	d *= mix(0.72, 1.0, smoothstep(10.0, 70.0, e));
	d = mix(d, d * 1.55 + vec3(0.02), smoothstep(5.0 - aa, 5.0 + aa, e) * (1.0 - smoothstep(10.0 - aa, 10.0 + aa, e)));
	d = mix(vec3(0.004, 0.003, 0.006), d, smoothstep(4.0 - aa, 4.0 + aa, e));
	ALBEDO = r3_srgb(d);
}
