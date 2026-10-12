// .al-b albüm rozeti: conic-gradient(wc p%, rest 0) daire; maske
// radial-gradient(circle, #000 0 58%, transparent 59% 64%, #000 65%) — çember
// varsayılan boyutu farthest-corner (yarım köşegen).
shader_type canvas_item;
uniform vec4 wc : source_color = vec4(1.0);
uniform vec4 rest = vec4(0.812, 0.839, 0.886, 0.08);
uniform float p = 0.0;      // 0..100
uniform float s = 60.0;     // kutu (px)
void fragment() {
	vec2 pp = (UV - 0.5) * s;
	float d = length(pp);
	float ang = mod(degrees(atan(pp.x, -pp.y)) + 360.0, 360.0) / 360.0;
	vec4 c = ang < p / 100.0 ? wc : rest;
	float R = s * 0.70711;
	float r = d / R;
	float m_in = clamp((0.58 - r) * R + 0.5, 0.0, 1.0);
	float m_out = clamp((r - 0.65) * R + 0.5, 0.0, 1.0);
	float edge = clamp(s * 0.5 - d + 0.5, 0.0, 1.0);
	COLOR = vec4(c.rgb, c.a * max(m_in, m_out) * edge);
}
