shader_type canvas_item;
// ARAYÜZ KARANLIK RENK DÜZENİ — menü ve ekran katmanlarının (yakalanmış CSS görselleri) mor/menekşe
// koyu-orta tonlarını kömür-kızıla çeker, orta tonları koyulaştırır, kontrastı hafif artırır.
// Parlak/doygun öğeler (altın, ödül, kahraman görselleri) korunur; kenarlarda kızıl-siyah vinyet.
uniform sampler2D screen_tex : hint_screen_texture, filter_nearest;
uniform float amount = 1.0;
uniform float vig = 0.16;

vec3 hsv2rgb(vec3 c) {
	vec3 p = abs(fract(c.xxx + vec3(1.0, 2.0 / 3.0, 1.0 / 3.0)) * 6.0 - 3.0);
	return c.z * mix(vec3(1.0), clamp(p - 1.0, 0.0, 1.0), c.y);
}
vec3 rgb2hsv(vec3 c) {
	vec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);
	vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
	vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));
	float d = q.x - min(q.w, q.y);
	return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + 1e-5)), d / (q.x + 1e-5), q.x);
}

void fragment() {
	vec3 c = texture(screen_tex, SCREEN_UV).rgb;
	vec3 hsv = rgb2hsv(c);
	float hw = clamp(1.0 - abs(hsv.x - 0.79) / 0.15, 0.0, 1.0);
	float vw = clamp((0.78 - hsv.z) / 0.4, 0.0, 1.0);
	float w = hw * vw * clamp(hsv.y * 2.5, 0.0, 1.0) * amount;
	vec3 tgt = hsv2rgb(vec3(0.985, hsv.y * 0.6, hsv.z * 0.9));
	vec3 o = mix(c, tgt, w);
	float lum = dot(o, vec3(0.299, 0.587, 0.114));
	o *= mix(1.0, lum < 0.5 ? 0.97 + 0.06 * lum : 1.0, amount);
	o = mix(o, clamp((o - 0.5) * 1.04 + 0.505, 0.0, 1.0), amount);
	// kenar vinyeti (kızıl-siyah)
	vec2 d = (SCREEN_UV - 0.5) * vec2(1.0, 0.8);
	float v = smoothstep(0.42, 0.85, length(d)) * vig * amount;
	o = mix(o, vec3(0.045, 0.012, 0.016), v);
	COLOR = vec4(o, 1.0);
}
