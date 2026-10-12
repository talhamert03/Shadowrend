// SÜPER çekirdeği (54 px): radial-gradient(circle at 50% cy, c0, c1 stop) —
// "circle" en uzak köşeye göre — + iç vurgular (inset 0 1px 0 üst, inset 0 −3px 0 alt)
// + hazırken dış ışıma (0 0 20px 2px uc).
shader_type canvas_item;
uniform vec4 c0 = vec4(0.227, 0.188, 0.251, 1.0);
uniform vec4 c1 = vec4(0.078, 0.059, 0.094, 1.0);
uniform float cy = 0.32;
uniform float stop = 0.70;
uniform float hl = 0.14;        // üst iç vurgu alfası
uniform float sh = 0.5;         // alt iç gölge alfası (3 px)
uniform vec4 glow = vec4(0.0);  // a=0 → ışıma yok
uniform float core = 54.0;
uniform float full = 94.0;
void fragment() {
	vec2 pp = (UV - 0.5) * full;
	float d = length(pp);
	float R = core * 0.5;
	vec4 o = vec4(0.0);
	if (glow.a > 0.0) {
		float g = 1.0 - smoothstep(R + 2.0 - 20.0, R + 2.0 + 20.0, d);
		o = vec4(glow.rgb, glow.a * g);
	}
	float aa = clamp(R - d + 0.5, 0.0, 1.0);
	if (aa > 0.0) {
		vec2 q = pp + vec2(R, R);                       // kutu içi px
		vec2 ctr = vec2(R, core * cy);
		float fc = length(vec2(R, max(ctr.y, core - ctr.y)));
		float t = clamp(length(q - ctr) / (fc * stop), 0.0, 1.0);
		vec3 c = mix(c0.rgb, c1.rgb, t);
		float top = clamp(length(pp - vec2(0.0, 1.0)) - R + 0.5, 0.0, 1.0);
		c = mix(c, vec3(1.0), top * hl);
		float bot = clamp(length(pp + vec2(0.0, 3.0)) - R + 0.5, 0.0, 1.0);
		c = mix(c, vec3(0.0), bot * sh);
		float oa = aa + o.a * (1.0 - aa);
		o = vec4((c * aa + o.rgb * o.a * (1.0 - aa)) / max(1e-4, oa), oa);
	}
	COLOR = o;
}
