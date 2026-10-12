// html.dying: oyun katmanları grayscale(.85) brightness(.72) contrast(1.1), 0,6 sn geçiş.
// HUD bu katmanın ÜSTÜNDE kalır (web'de filtre yalnız #game3d ve #game tuvallerinde).
shader_type canvas_item;
uniform sampler2D scr : hint_screen_texture, filter_linear;
uniform float k = 0.0;
void fragment() {
	vec3 c = texture(scr, SCREEN_UV).rgb;
	c = mix(c, vec3(dot(c, vec3(0.2126, 0.7152, 0.0722))), 0.85 * k);
	c *= mix(1.0, 0.72, k);
	c = (c - 0.5) * mix(1.0, 1.1, k) + 0.5;
	COLOR = vec4(clamp(c, 0.0, 1.0), 1.0);
}
