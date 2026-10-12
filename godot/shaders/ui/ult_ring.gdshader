// SÜPER düğmesi halkası: conic-gradient(uc p%, rgba(207,214,226,.12) 0) +
// mask radial-gradient(circle, transparent 58%, #000 60%) — "circle" en uzak
// köşeye göre: 74 px kutuda %58 = 30,35 px, %60 = 31,4 px. Maske kutunun
// box-shadow'unu da (nadirlik çizgisi + alt gölge) keser → görünmez.
// Hazırken ::before (inset −12 px) dönen rün ışınları: repeating-conic
// 0–8° / 30°, maske circle 50% → 58% → 72% (98 px kutuda 34,6 · 40,2 · 49,9 px).
shader_type canvas_item;
uniform vec4 uc = vec4(1.0, 0.82, 0.73, 1.0);
uniform float p = 0.0;          // 0..100
uniform float ready = 0.0;
uniform float spin = 0.0;       // ışın dönüşü (rad, saat yönü)
uniform float box = 74.0;
uniform float pad = 12.0;
void fragment() {
	float full = box + pad * 2.0;
	vec2 pp = (UV - 0.5) * full;
	float d = length(pp);
	float R = box * 0.5;
	vec4 o = vec4(0.0);
	if (ready > 0.5) {
		float fc = (R + pad) * 1.41421356;
		float m = smoothstep(fc * 0.50, fc * 0.58, d) * (1.0 - smoothstep(fc * 0.58, fc * 0.72, d));
		float a = mod(degrees(atan(pp.x, -pp.y) - spin) + 720.0, 30.0);
		float ray = clamp(8.0 - a, 0.0, 1.0) * clamp(a + 1.0, 0.0, 1.0);
		o = vec4(uc.rgb, 0.4 * m * ray);
	}
	float fr = R * 1.41421356;
	float m2 = clamp((d - fr * 0.58) / (fr * 0.02), 0.0, 1.0) * clamp(R - d + 0.5, 0.0, 1.0);
	if (m2 > 0.0) {
		float ang = mod(degrees(atan(pp.x, -pp.y)) + 360.0, 360.0);
		vec4 c = ang <= p * 3.6 ? vec4(uc.rgb, 1.0) : vec4(0.812, 0.839, 0.886, 0.12);
		float a2 = c.a * m2;
		o = vec4(mix(o.rgb * o.a, c.rgb, a2) / max(1e-4, a2 + o.a * (1.0 - a2)), a2 + o.a * (1.0 - a2));
	}
	COLOR = o;
}
