// CSS radial-gradient(<rx> <ry> at <cx> <cy>, c0 s0, c1 s1) — iki duraklı, tam ekran.
// CSS gibi ÖN-ÇARPIMLI alfa ile karışır (transparent → renk geçişinde renk kaymaz).
// "ellipse at center" (farthest-corner) için rad = (√½, √½).
shader_type canvas_item;
uniform vec2 center = vec2(0.5);
uniform vec2 rad = vec2(0.70710678);
uniform vec4 c0 = vec4(0.0);
uniform float s0 = 0.55;
uniform vec4 c1 = vec4(1.0, 0.231, 0.306, 0.55);
uniform float s1 = 1.0;
uniform float opacity = 1.0;
void fragment() {
	float r = length((UV - center) / rad);
	float k = clamp((r - s0) / max(1e-4, s1 - s0), 0.0, 1.0);
	vec4 m = mix(vec4(c0.rgb * c0.a, c0.a), vec4(c1.rgb * c1.a, c1.a), k);
	COLOR = vec4(m.a > 0.0 ? m.rgb / m.a : vec3(0.0), m.a * opacity);
}
