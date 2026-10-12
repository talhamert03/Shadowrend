// Yuvarlak köşeli kutu: yatay 4 duraklı gradyan (ön-çarpımlı) + sol kenarlık +
// üst/alt 1 px iç çizgi (CSS inset 0 ±1px 0). Rozet/pankart zeminleri.
shader_type canvas_item;
uniform vec2 size = vec2(100.0, 40.0);
uniform float radius = 10.0;
uniform vec4 g0 = vec4(0.0);
uniform vec4 g1 = vec4(0.0);
uniform vec4 g2 = vec4(0.0);
uniform vec4 g3 = vec4(0.0);
uniform float s1 = 0.0;
uniform float s2 = 1.0;
uniform float bl = 0.0;
uniform vec4 bcol = vec4(0.0);
uniform vec4 inset_col = vec4(0.0);
uniform float opacity = 1.0;
float sd(vec2 p, vec2 o, vec2 sz, float rl, float rr) {
	vec2 hs = sz * 0.5;
	vec2 q = p - (o + hs);
	float r = q.x < 0.0 ? rl : rr;
	r = min(r, min(hs.x, hs.y));
	vec2 a = abs(q) - hs + r;
	return min(max(a.x, a.y), 0.0) + length(max(a, 0.0)) - r;
}
vec4 pm(vec4 c) { return vec4(c.rgb * c.a, c.a); }
vec4 over(vec4 dst, vec4 src) { return src + dst * (1.0 - src.a); }
void fragment() {
	vec2 p = UV * size;
	float d = sd(p, vec2(0.0), size, radius, radius);
	float cov = clamp(0.5 - d, 0.0, 1.0);
	float x = UV.x;
	vec4 c;
	if (x <= s1) c = mix(pm(g0), pm(g1), s1 > 0.0 ? x / s1 : 1.0);
	else if (x <= s2) c = mix(pm(g1), pm(g2), (x - s1) / max(1e-4, s2 - s1));
	else c = mix(pm(g2), pm(g3), (x - s2) / max(1e-4, 1.0 - s2));
	if (inset_col.a > 0.0) {
		float dt = sd(p, vec2(0.0, 1.0), size, radius, radius);
		float db = sd(p, vec2(0.0, -1.0), size, radius, radius);
		float l = max(clamp(0.5 + dt, 0.0, 1.0), clamp(0.5 + db, 0.0, 1.0));
		c = over(c, pm(inset_col) * l);
	}
	if (bl > 0.0) {
		float di = sd(p, vec2(bl, 0.0), size - vec2(bl, 0.0), max(0.0, radius - bl), radius);
		float b = clamp(0.5 + di, 0.0, 1.0);
		c = over(c, pm(bcol) * b);
	}
	c *= cov * opacity;
	COLOR = vec4(c.a > 0.0 ? c.rgb / c.a : vec3(0.0), c.a);
}
