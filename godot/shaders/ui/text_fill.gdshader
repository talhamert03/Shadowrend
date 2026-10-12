// background-clip:text — glif alfası × dolgu dokusu (yakalanan gradyan kutusu).
// frect: dolgu kutusunun metin düğümü yerel uzayındaki dikdörtgeni.
shader_type canvas_item;
uniform sampler2D fill : filter_linear_mipmap;
uniform vec4 frect = vec4(0.0, 0.0, 100.0, 20.0);
varying vec2 lp;
void vertex() { lp = VERTEX; }
void fragment() {
	vec2 uv = clamp((lp - frect.xy) / frect.zw, vec2(0.0), vec2(1.0));
	vec4 f = texture(fill, uv);
	COLOR = vec4(f.rgb, f.a * COLOR.a);
}
