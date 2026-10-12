// #chest-rays: dört dilimli conic-gradient (0deg = üst, saat yönü) × radyal maske (closest-side).
shader_type canvas_item;
uniform vec4 col : source_color = vec4(0.72, 0.45, 0.32, 0.5);
uniform float opacity = 0.0;
uniform float rot = 0.0;
float band(float f, float a, float b, float c) {
	if (f < a || f > c) return 0.0;
	return f < b ? (f - a) / (b - a) : (c - f) / (c - b);
}
float mask(float r) {
	// transparent 4% → .35 12% → 1 30% → .55 52% → 0 74%
	if (r < 0.04) return 0.0;
	if (r < 0.12) return mix(0.0, 0.35, (r - 0.04) / 0.08);
	if (r < 0.30) return mix(0.35, 1.0, (r - 0.12) / 0.18);
	if (r < 0.52) return mix(1.0, 0.55, (r - 0.30) / 0.22);
	if (r < 0.74) return mix(0.55, 0.0, (r - 0.52) / 0.22);
	return 0.0;
}
void fragment() {
	vec2 p = UV - 0.5;
	float r = length(p) * 2.0;
	float a = atan(p.x, -p.y) - rot;      // üstten saat yönü
	float f = fract(a / 6.2831853);
	float k = band(f, 0.08, 0.11, 0.14) + band(f, 0.28, 0.32, 0.36) + band(f, 0.52, 0.56, 0.60) + band(f, 0.76, 0.80, 0.84);
	COLOR = vec4(col.rgb, col.a * k * mask(r) * opacity);
}
