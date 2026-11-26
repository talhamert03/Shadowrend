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
// görünüm cilası (haritalar "çamur" durmasın): netlik · kabartma ışığı · renk tonlaması
uniform float sharp_bias = -0.45;   // doku örneklemede mip payı (eksi = daha net)
uniform float clarity = 0.32;       // mikro-kontrast (keskin − bulanık)
uniform float relief = 0.55;        // detay dokusundan kabartma ışığı (0 = kapalı, düşük kademe)
uniform float grade_sat = 1.14;
uniform float grade_con = 1.10;
uniform float grade_lift = 0.012;
uniform float grade_exp = 1.12;
varying vec2 v_uv;
// three UV'si (v yukarı) → Godot doku koordinatı (v aşağı)
vec2 tc(vec2 u) { return vec2(u.x, 1.0 - u.y); }
void vertex() {
	vec3 wp = (MODEL_MATRIX * vec4(VERTEX, 1.0)).xyz;
	v_uv = vec2((wp.x - arena.x) / arena.z, 1.0 - (wp.z - arena.y) / arena.w);
}
float lum(vec3 c) { return dot(c, vec3(0.299, 0.587, 0.114)); }
void fragment() {
	vec3 ms = texture(macro, tc(v_uv), sharp_bias).rgb;
	vec3 mb = texture(macro, tc(v_uv), 2.2).rgb;
	vec3 d = r3_lin(clamp(ms + (ms - mb) * clarity, 0.0, 1.0));
	vec2 du = tc(v_uv * detail_rep);
	vec3 dt = texture(detail, du, sharp_bias).rgb;
	vec3 khDetail = r3_lin(dt) / detail_mid;
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
	// kabartma: detay parlaklığının eğimi → yüzey normali; ay yönünden (sol üst) yumuşak ışık.
	// Taş/çatlak kenarları parlar, çukurlar gölgelenir — düz boyalı zemin derinlik kazanır
	if (relief > 0.001) {
		vec2 px = vec2(1.6) / vec2(textureSize(detail, 0));
		float hx = lum(texture(detail, du + vec2(px.x, 0.0)).rgb) - lum(texture(detail, du - vec2(px.x, 0.0)).rgb);
		float hy = lum(texture(detail, du + vec2(0.0, px.y)).rgb) - lum(texture(detail, du - vec2(0.0, px.y)).rgb);
		vec3 nn = normalize(vec3(-hx * 6.0, -hy * 6.0, 1.0));
		vec3 L = normalize(vec3(-0.55, -0.62, 0.56));
		float sh = clamp(dot(nn, L) / L.z, 0.55, 1.45);
		d *= mix(1.0, sh, relief);
	}
	// ada kenarı (uçuruma bakan): mürekkep çizgi · ışıklı dudak · içe doğru hafif gölge
	vec2 eu = min(v_uv, 1.0 - v_uv) * arena.zw;
	float e = min(eu.x, eu.y);
	float aa = max(fwidth(e), 0.5);
	d *= mix(0.72, 1.0, smoothstep(10.0, 70.0, e));
	d = mix(d, d * 1.55 + vec3(0.02), smoothstep(5.0 - aa, 5.0 + aa, e) * (1.0 - smoothstep(10.0 - aa, 10.0 + aa, e)));
	d = mix(vec3(0.004, 0.003, 0.006), d, smoothstep(4.0 - aa, 4.0 + aa, e));
	// renk tonlaması (ekran uzayında): pozlama · doygunluk · orta ton çevresinde kontrast
	vec3 c = r3_srgb(d) * grade_exp;
	float l0 = lum(c);
	c = mix(vec3(l0), c, grade_sat);
	c = (c - 0.42) * grade_con + 0.42 + grade_lift;
	ALBEDO = clamp(c, 0.0, 1.0);
}
