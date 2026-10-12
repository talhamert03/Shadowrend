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

const float R3_PI = 3.141592653589793;

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

// N, V görüş uzayında; view = VIEW_MATRIX. Dönüş: doğrusal çıkış (emissive hariç).
vec3 r3_standard(vec3 albedo, float metal, float rough_in, vec3 N, vec3 V, mat4 view) {
	vec3 dxy = max(abs(dFdx(N)), abs(dFdy(N)));
	float rough = min(max(rough_in, 0.0525) + max(max(dxy.x, dxy.y), dxy.z), 1.0);
	vec3 diff = albedo * (1.0 - metal);
	vec3 f0 = mix(vec3(0.04), albedo, metal);
	vec3 up = normalize((view * vec4(0.0, 1.0, 0.0, 0.0)).xyz);
	vec3 irr = r3_ambient + mix(r3_hemi_ground, r3_hemi_sky, 0.5 * dot(N, up) + 0.5);
	vec3 outc = irr * diff * (1.0 / R3_PI);
	vec3 L = normalize((view * vec4(r3_moon_dir, 0.0)).xyz);
	vec3 di = clamp(dot(N, L), 0.0, 1.0) * r3_moon_col;
	outc += di * (diff * (1.0 / R3_PI) + r3_BRDF_GGX(L, V, N, f0, rough));
	L = normalize((view * vec4(r3_rim_dir, 0.0)).xyz);
	di = clamp(dot(N, L), 0.0, 1.0) * r3_rim_col;
	outc += di * (diff * (1.0 / R3_PI) + r3_BRDF_GGX(L, V, N, f0, rough));
	return outc;
}

// charLook.js kenar ışığı (fresnel) — görüş uzayı normaliyle.
vec3 r3_rim(vec3 N, vec3 V, float s, float p, vec3 c) {
	float f = pow(1.0 - clamp(dot(N, V), 0.0, 1.0), p);
	float up = clamp(N.y * 0.55 + 0.60, 0.0, 1.0);
	return c * (f * s * up);
}
