// CSS radial-gradient(circle at cx cy, c0 s0, c1 s1, c2 s2, c3 s3) — px uzayında, ön-çarpımlı ara değer.
// ColorRect boyutu = kutu (size); merkez ve yarıçap px.
shader_type canvas_item;
uniform vec2 size = vec2(390.0, 844.0);
uniform vec2 center = vec2(195.0, 422.0);
uniform float radius = 400.0;
uniform vec4 c0 : source_color = vec4(1.0);
uniform vec4 c1 : source_color = vec4(0.0);
uniform vec4 c2 : source_color = vec4(0.0);
uniform vec4 c3 : source_color = vec4(0.0);
uniform vec4 stops = vec4(0.0, 1.0, 1.0, 1.0);
uniform int n = 2;
uniform float opacity = 1.0;
vec4 pm(vec4 c) { return vec4(c.rgb * c.a, c.a); }
void fragment() {
	float r = length(UV * size - center) / max(1.0, radius);
	vec4 m;
	if (r <= stops.x) m = pm(c0);
	else if (n <= 2 || r <= stops.y) m = mix(pm(c0), pm(c1), clamp((r - stops.x) / max(1e-4, stops.y - stops.x), 0.0, 1.0));
	else if (n <= 3 || r <= stops.z) m = mix(pm(c1), pm(c2), clamp((r - stops.y) / max(1e-4, stops.z - stops.y), 0.0, 1.0));
	else m = mix(pm(c2), pm(c3), clamp((r - stops.z) / max(1e-4, stops.w - stops.z), 0.0, 1.0));
	COLOR = vec4(m.a > 0.0 ? m.rgb / m.a : vec3(0.0), m.a * opacity);
}
