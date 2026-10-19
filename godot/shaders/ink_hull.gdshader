// Mürekkep kontur (ters kabuk): merkezden dışa şişirilmiş, ön yüzü kırpılmış kopya.
// Düz yüzlü (köşeleri ayrık normalli) dışbükey gövdelerde boşluk bırakmaz.
shader_type spatial;
render_mode unshaded, cull_front, specular_disabled, fog_disabled;
uniform vec3 ink : source_color = vec3(0.03, 0.02, 0.04);
uniform float width = 3.0;
void vertex() {
	VERTEX += normalize(VERTEX + vec3(1e-4)) * width;
}
void fragment() {
	ALBEDO = ink;
}
