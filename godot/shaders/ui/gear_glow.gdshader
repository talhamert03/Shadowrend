shader_type canvas_item;
// Ekipman görseli: koyu madalyon üstünde kaybolmasın diye çevresine nadirlik renginde
// yumuşak parlak kontur (alfa kenarından dışa) + hafif parlaklık/kontrast artışı.
uniform vec4 glow : source_color = vec4(1.0, 0.8, 0.4, 1.0);
uniform float width = 0.045;
uniform float lift = 1.18;
void fragment() {
	vec4 c = texture(TEXTURE, UV);
	float a = 0.0;
	for (int i = 0; i < 12; i++) {
		float an = float(i) * 0.5235988;
		vec2 o = vec2(cos(an), sin(an));
		a = max(a, texture(TEXTURE, UV + o * width).a);
		a = max(a, texture(TEXTURE, UV + o * width * 0.5).a * 0.9);
	}
	vec3 rgb = clamp((c.rgb - 0.5) * 1.08 + 0.5, 0.0, 1.0) * lift;
	vec4 g = vec4(glow.rgb, a * glow.a * (1.0 - c.a));
	COLOR = vec4(mix(g.rgb, rgb, c.a), max(c.a, g.a)) * COLOR;
}
