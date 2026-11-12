// Gerçek 3B sandık malzemesi: dokuyu ton/doygunluk/parlaklık ile ayarlar (aynı model farklı kademede
// renk değiştirerek kullanılabilsin), hafif öz ışıma verir. Kontur next_pass ile eklenir.
shader_type spatial;
uniform sampler2D tex : source_color, filter_linear_mipmap_anisotropic;
uniform float hue = 0.0;
uniform float sat = 1.0;
uniform float val = 0.85;
uniform float emi = 0.08;
vec3 rgb2hsv(vec3 c) {
	vec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);
	vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
	vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));
	float d = q.x - min(q.w, q.y);
	return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + 1e-10)), d / (q.x + 1e-10), q.x);
}
vec3 hsv2rgb(vec3 c) {
	vec3 p = abs(fract(c.xxx + vec3(1.0, 2.0 / 3.0, 1.0 / 3.0)) * 6.0 - 3.0);
	return c.z * mix(vec3(1.0), clamp(p - 1.0, 0.0, 1.0), c.y);
}
void fragment() {
	vec3 c = texture(tex, UV).rgb;
	vec3 h = rgb2hsv(c);
	h.x = fract(h.x + hue);
	h.y = clamp(h.y * sat, 0.0, 1.0);
	h.z *= val;
	c = hsv2rgb(h);
	// netlik: orta tonlarda hafif S eğrisi (koyu tema korunur, detaylar çamurlaşmaz)
	c = mix(c, c * c * (3.0 - 2.0 * c), 0.28);
	ALBEDO = c;
	// açık tonlar (metal süsler, taşlar) daha parlak ve pürüzsüz; koyu ahşap/deri mat kalır
	float lum = dot(c, vec3(0.299, 0.587, 0.114));
	ROUGHNESS = mix(0.74, 0.42, smoothstep(0.25, 0.65, lum));
	SPECULAR = mix(0.35, 0.65, smoothstep(0.25, 0.65, lum));
	METALLIC = 0.0;
	RIM = 0.22;
	RIM_TINT = 0.6;
	EMISSION = c * emi;
}
