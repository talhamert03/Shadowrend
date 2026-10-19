// render3d — ARENA DIŞI UÇURUM: ada, dünya renginde bir BULUT DENİZİNİN üstünde süzülür.
// Oyunun çizgi roman diliyle: bulutlar kademeli (gölge · gövde · ışıklı tepe) ve mürekkep
// konturlu; iki kat (yakın / uzak) gerçek paralaksla akar — her kat kameradan geçen ışının
// hayali bir düzlemle kesişiminden örneklenir. Aralarda derin boşluk, ay yönünden inen yumuşak
// ışık huzmeleri ve yükselen kıvılcımlar. Adanın gölgesi yakın bulutlara düşer.
// Gürültü: assets/fx/void_noise.png (döşenebilir, 4 kanal ayrı desen) — doku örnekleme ucuz.
shader_type spatial;
render_mode unshaded, cull_disabled, specular_disabled, fog_disabled;
#include "res://shaders/three_lit.gdshaderinc"
global uniform float r3_time;
uniform sampler2D noise : filter_linear_mipmap, repeat_enable;
uniform vec3 c_deep : source_color = vec3(0.05, 0.04, 0.07);    // dip boşluk
uniform vec3 c_shadow : source_color = vec3(0.20, 0.10, 0.16);  // bulut gölge yüzü
uniform vec3 c_body : source_color = vec3(0.45, 0.22, 0.28);    // bulut gövdesi
uniform vec3 c_hi : source_color = vec3(0.95, 0.62, 0.55);      // ışıklı tepe
uniform vec3 c_ink : source_color = vec3(0.04, 0.02, 0.05);     // kontur
uniform vec3 c_spark : source_color = vec3(1.0, 0.8, 0.7);
uniform vec4 arena = vec4(-2140.0, -2140.0, 4280.0, 4280.0);    // x0, y0, w, h
uniform float layers = 2.0;                                     // 1: yalnız yakın kat
varying vec3 v_wp;

float sd_arena(vec2 p) {
	vec2 c = arena.xy + arena.zw * 0.5;
	vec2 d = abs(p - c) - arena.zw * 0.5;
	return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0);
}
vec2 hit(vec3 cam, vec3 dir, float y) {
	float t = (y - cam.y) / min(dir.y, -1e-3);
	return (cam + dir * t).xz;
}
float cloud_v(vec2 q) {
	vec4 w = texture(noise, q * 0.47 + vec2(0.13, 0.71));
	q += (w.ba - 0.5) * 0.12;                                   // hafif kıvrım (domain warp)
	// kabarık kümeler: geniş taban + küçük "puf" tümsekleri
	return texture(noise, q).r * 0.78 + texture(noise, q * 2.3 + 0.37).g * 0.22;
}

// bir bulut katı: col üstüne çizer. th: kaplama eşiği · fogk: uzaklık sisi (0 yakın, 1 tam dip)
vec3 cloud_layer(vec3 col, vec3 cam, vec3 dir, float y, float sc, vec2 drift, float th, float fogk, bool shadow_isle) {
	vec2 p = hit(cam, dir, y);
	vec2 q = (p + drift) * sc;
	float v = cloud_v(q);
	// ışık yönü: ay (xz) — tepe ışığı gürültünün aya doğru yükseldiği yüzde
	vec2 ld = normalize(r3_moon_dir.xz + vec2(1e-4));
	float vl = cloud_v(q - ld * 0.012);
	float sh = v - vl;                                          // > 0: ışığa bakan yüz
	float aa = max(fwidth(v) * 1.5, 0.008);
	float body = smoothstep(th - aa, th + aa, v);
	// içe doğru kademeler: kenar şeridi gölge, iç gövde, ışığa bakan tepe
	float inner = smoothstep(th + 0.035 - aa, th + 0.035 + aa, v);
	float saa = max(fwidth(sh) * 1.5, 0.004);
	float lit = smoothstep(0.004 - saa, 0.004 + saa, sh) * inner;
	vec3 c = mix(r3_lin(c_shadow), r3_lin(c_body), inner);
	c = mix(c, r3_lin(c_hi), lit * 0.85);
	if (shadow_isle) {
		float ds = sd_arena(p - ld * 260.0);
		c *= mix(0.45, 1.0, smoothstep(-80.0, 360.0, ds));
	}
	c = mix(c, r3_lin(c_deep), fogk);
	col = mix(col, c, body);
	// mürekkep kontur (dış kenar)
	float ink = 1.0 - smoothstep(aa * 0.6, aa * 2.2, abs(v - th));
	col = mix(col, mix(r3_lin(c_ink), r3_lin(c_deep), fogk), ink * 0.9);
	return col;
}

void vertex() {
	v_wp = (MODEL_MATRIX * vec4(VERTEX, 1.0)).xyz;
}

void fragment() {
	vec3 cam = CAMERA_POSITION_WORLD;
	vec3 dir = normalize(v_wp - cam);
	float tm = r3_time;
	vec3 deep = r3_lin(c_deep);

	// ① dip: koyu boşluk, adadan uzaklaştıkça hafif açılan pus
	vec2 p0 = hit(cam, dir, -2000.0);
	float n0 = texture(noise, p0 * 0.00035 + vec2(tm * 0.002, 0.0)).a;
	vec3 col = deep * (0.7 + 0.6 * n0) * mix(0.75, 1.25, smoothstep(0.0, 1500.0, sd_arena(p0)));

	// ② bulutlar artık boyanmış kartlar (cloud.gdshader, R3Isles); burada dipteki derin parıltı:
	// adadan uzaklaştıkça ufka doğru açılan dünya renginde pus
	vec2 pg = hit(cam, dir, -1600.0);
	float glowk = smoothstep(300.0, 3800.0, sd_arena(pg));
	col = mix(col, mix(deep * 2.2, r3_lin(c_shadow), 0.35), glowk * 0.6);

	// ④ ışık huzmeleri: ay yönünde uzanan yumuşak şeritler (yakın katın üstünde, eklemeli)
	vec2 ph = hit(cam, dir, -260.0);
	vec2 ld = normalize(r3_moon_dir.xz + vec2(1e-4));
	float across = dot(ph, vec2(-ld.y, ld.x));
	float ray = texture(noise, vec2(across * 0.0011, tm * 0.01)).g;
	ray = smoothstep(0.62, 0.95, ray) * smoothstep(0.0, 500.0, sd_arena(ph));
	col += r3_lin(c_hi) * ray * 0.07;

	// ⑤ yükselen kıvılcımlar (seyrek, yumuşak; −300 düzleminde)
	vec2 g = hit(cam, dir, -300.0) / 120.0 + vec2(0.0, tm * 0.22);
	vec2 gi = floor(g);
	float r = texture(noise, gi / 256.0 + 0.5 / 256.0).a;
	vec2 sp = gi + vec2(fract(r * 13.7), fract(r * 71.3)) * 0.8 + 0.1;
	float sd = length(g - sp);
	float tw = 0.55 + 0.45 * sin(tm * (1.0 + r * 2.0) + r * 50.0);
	float mote = step(0.9, r) * (smoothstep(0.06, 0.0, sd) + smoothstep(0.22, 0.0, sd) * 0.3) * tw;
	col += r3_lin(c_spark) * mote;

	// ⑥ ada dibi: kenarın hemen altı gölgeli (yarlar boşluğa iner)
	col *= mix(0.55, 1.0, smoothstep(0.0, 140.0, sd_arena(v_wp.xz)));
	ALBEDO = r3_srgb(col);
}
