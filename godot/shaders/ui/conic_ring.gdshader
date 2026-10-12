// Savaş kapısı mühür halkası: conic-gradient(from -90deg, c0 0%, c1 p%, rest 0)
// maske: iç yarıçap r_in'den dışa (kenar yumuşak), + drop-shadow benzeri dış hale.
shader_type canvas_item;
uniform vec4 c0 = vec4(0.847, 0.635, 0.518, 1.0);
uniform vec4 c1 = vec4(0.690, 0.416, 0.286, 1.0);
uniform vec4 rest = vec4(0.812, 0.839, 0.886, 0.08);
uniform vec4 glow = vec4(0.690, 0.416, 0.286, 0.6);
uniform float p = 0.0;          // 0..100
uniform float r_in = 45.5;      // px
uniform float r_out = 56.0;     // px
uniform float pad = 10.0;       // hale için taşma (px)
void fragment() {
	float full = (r_out + pad) * 2.0;
	vec2 pp = (UV - 0.5) * full;
	float d = length(pp);
	// conic açısı: CSS 0° = yukarı, saat yönü; from -90° → sol
	float ang = mod(degrees(atan(pp.x, -pp.y)) + 90.0 + 360.0, 360.0) / 360.0;
	float k = p / 100.0;
	vec4 c = ang <= k ? mix(c0, c1, k > 0.0 ? ang / k : 0.0) : rest;
	float m = clamp(d - r_in + 0.5, 0.0, 1.0) * clamp(r_out - d + 0.5, 0.0, 1.0);
	vec4 o = vec4(c.rgb, c.a * m);
	// hale: dolu kısmın çevresinde 6 px
	if (ang <= k && m < 1.0) {
		float g = 1.0 - smoothstep(0.0, 6.0, max(r_in - d, d - r_out));
		float ga = glow.a * g * (1.0 - m);
		o = vec4(mix(glow.rgb, o.rgb, o.a / max(0.001, o.a + ga)), o.a + ga * (1.0 - o.a));
	}
	COLOR = o;
}
