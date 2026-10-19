// three.js r169 MeshStandardMaterial (fiziksel ışık) — birebir karşılık.
// Sahne ışıkları (render3d._buildLights): Hemisphere + Ambient + 2 Directional.
// Nokta ışıklar (heroLight/heroFill) fiziksel düşüşte (decay 1.8/2) ~1e-4
// katkı verir; web'de de görünmezler, bu yüzden hesaba katılmaz.
// Işık renkleri global uniform'larda DOĞRUSAL ve şiddetle çarpılmış durur.
global uniform vec3 r3_hemi_sky;
global uniform vec3 r3_hemi_ground;
global uniform vec3 r3_ambient;
global uniform vec3 r3_moon_dir;
global uniform vec3 r3_moon_col;
global uniform vec3 r3_rim_dir;
global uniform vec3 r3_rim_col;
// ── STİL (v2 "tatlı çizgi roman"): yumuşak kademeli toon ışık + renk düzeni ──
// r3_toon: 0 = fiziksel (three), 1 = kademeli ışık · r3_sat: doygunluk · r3_tint: sıcaklık
// r3_expo: pozlama. Tümü doğrusal uzayda, çıkış kodlamasından hemen önce (r3_srgb).
global uniform float r3_toon;
global uniform float r3_sat;
global uniform vec3 r3_tint;
global uniform float r3_expo;
global uniform float r3_con;

const float R3_PI = 3.141592653589793;

// Compatibility renderer sRGB uzayında çizer (giriş çözülmez, çıkış kodlanmaz).
// three.js doğrusal iş akışı burada elle kurulur: sRGB girdiler çözülür,
// sonuç sonda sRGB'ye kodlanır (three: linearToOutputTexel → sRGBTransferOETF).
vec3 r3_lin(vec3 c) { return mix(c / 12.92, pow((c + 0.055) / 1.055, vec3(2.4)), step(vec3(0.04045), c)); }
vec3 r3_grade(vec3 c) {
	c = max(c, vec3(0.0)) * (r3_tint * r3_expo);
	// kontrast: orta gri (0,18) sabit, S eğrisi
	c = 0.18 * pow(c / 0.18, vec3(r3_con));
	// canlılık: soluk renkler doygunlardan daha çok canlanır (ten/gök patlamaz, zemin/taş canlanır)
	float mx = max(c.r, max(c.g, c.b));
	float sat = (mx - min(c.r, min(c.g, c.b))) / max(mx, 1e-4);
	float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
	return max(mix(vec3(l), c, 1.0 + (r3_sat - 1.0) * (1.6 - 1.2 * sat)), vec3(0.0));
}
vec3 r3_srgb(vec3 c) { c = r3_grade(c); return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(vec3(0.0031308), c)); }

// kademeli ışık: gölge tabanı (dolgu) → yarı ton → tam ışık; geçişler yumuşak (çizgi roman, sert değil)
float r3_band(float nl) {
	return 0.16 + smoothstep(-0.02, 0.10, nl) * 0.58 + smoothstep(0.40, 0.52, nl) * 0.26;
}

float r3_pow2(float x) { return x * x; }

vec3 r3_F_Schlick(vec3 f0, float f90, float dotVH) {
	float fresnel = exp2((-5.55473 * dotVH - 6.98316) * dotVH);
	return f0 * (1.0 - fresnel) + (f90 * fresnel);
}
float r3_V_GGX(float alpha, float dotNL, float dotNV) {
	float a2 = r3_pow2(alpha);
	float gv = dotNL * sqrt(a2 + (1.0 - a2) * r3_pow2(dotNV));
	float gl = dotNV * sqrt(a2 + (1.0 - a2) * r3_pow2(dotNL));
	return 0.5 / max(gv + gl, 1e-6);
}
float r3_D_GGX(float alpha, float dotNH) {
	float a2 = r3_pow2(alpha);
	float denom = r3_pow2(dotNH) * (a2 - 1.0) + 1.0;
	return (1.0 / R3_PI) * a2 / r3_pow2(denom);
}
vec3 r3_BRDF_GGX(vec3 L, vec3 V, vec3 N, vec3 f0, float rough) {
	float alpha = r3_pow2(rough);
	vec3 H = normalize(L + V);
	float dotNL = clamp(dot(N, L), 0.0, 1.0);
	float dotNV = clamp(dot(N, V), 0.0, 1.0);
	float dotNH = clamp(dot(N, H), 0.0, 1.0);
	float dotVH = clamp(dot(V, H), 0.0, 1.0);
	vec3 F = r3_F_Schlick(f0, 1.0, dotVH);
	return F * (r3_V_GGX(alpha, dotNL, dotNV) * r3_D_GGX(alpha, dotNH));
}

// parlama: toon'da en sıcak noktada net, sabit şiddetli bir leke (pürüzsüz yüzeylerde belirgin)
vec3 r3_spec(vec3 L, vec3 V, vec3 N, vec3 f0, float rough, float metal) {
	vec3 sp = r3_BRDF_GGX(L, V, N, f0, rough);
	float sl = max(sp.r, max(sp.g, sp.b));
	vec3 st = smoothstep(0.55, 0.75, sl) * mix(vec3(0.20), f0 * 2.4, metal) * (1.0 - rough * 0.7);
	return mix(sp, st, r3_toon);
}

// N, V görüş uzayında; view = VIEW_MATRIX. Dönüş: doğrusal çıkış (emissive hariç).
vec3 r3_standard(vec3 albedo, float metal, float rough_in, vec3 N, vec3 V, mat4 view) {
	vec3 dxy = max(abs(dFdx(N)), abs(dFdy(N)));
	float rough = min(max(rough_in, 0.0525) + max(max(dxy.x, dxy.y), dxy.z), 1.0);
	vec3 diff = albedo * (1.0 - metal);
	vec3 f0 = mix(vec3(0.04), albedo, metal);
	vec3 up = normalize((view * vec4(0.0, 1.0, 0.0, 0.0)).xyz);
	float hk = 0.5 * dot(N, up) + 0.5;
	hk = mix(hk, smoothstep(0.2, 0.8, hk), r3_toon);
	vec3 irr = r3_ambient + mix(r3_hemi_ground, r3_hemi_sky, hk);
	vec3 outc = irr * diff * (1.0 / R3_PI);
	vec3 L = normalize((view * vec4(r3_moon_dir, 0.0)).xyz);
	float nl = dot(N, L);
	vec3 di = mix(clamp(nl, 0.0, 1.0), r3_band(nl), r3_toon) * r3_moon_col;
	outc += di * (diff * (1.0 / R3_PI) + r3_spec(L, V, N, f0, rough, metal));
	L = normalize((view * vec4(r3_rim_dir, 0.0)).xyz);
	nl = dot(N, L);
	di = mix(clamp(nl, 0.0, 1.0), smoothstep(0.0, 0.12, nl), r3_toon) * r3_rim_col;
	outc += di * (diff * (1.0 / R3_PI) + r3_spec(L, V, N, f0, rough, metal));
	return outc;
}

// charLook.js kenar ışığı (fresnel) — görüş uzayı normaliyle.
vec3 r3_rim(vec3 N, vec3 V, float s, float p, vec3 c) {
	float f = pow(1.0 - clamp(dot(N, V), 0.0, 1.0), p);
	f = mix(f, smoothstep(0.42, 0.62, 1.0 - clamp(dot(N, V), 0.0, 1.0)) * 0.8, r3_toon);
	float up = clamp(N.y * 0.55 + 0.60, 0.0, 1.0);
	return c * (f * s * up);
}

// ölüm çözülmesi için ucuz 3B değer gürültüsü
float r3_h31(vec3 p) { return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
float r3_noise3(vec3 p) {
	vec3 i = floor(p), f = fract(p);
	f = f * f * (3.0 - 2.0 * f);
	return mix(mix(mix(r3_h31(i), r3_h31(i + vec3(1, 0, 0)), f.x), mix(r3_h31(i + vec3(0, 1, 0)), r3_h31(i + vec3(1, 1, 0)), f.x), f.y),
		mix(mix(r3_h31(i + vec3(0, 0, 1)), r3_h31(i + vec3(1, 0, 1)), f.x), mix(r3_h31(i + vec3(0, 1, 1)), r3_h31(i + vec3(1, 1, 1)), f.x), f.y), f.z);
}
