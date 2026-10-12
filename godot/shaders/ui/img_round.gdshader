// <img> object-fit: cover + object-position + border-radius + kenarlık (+ isteğe bağlı radyal zemin).
shader_type canvas_item;
uniform sampler2D img : source_color, filter_linear_mipmap;
uniform vec2 box = vec2(44.0);
uniform vec2 isz = vec2(100.0);           // görüntü piksel boyutu
uniform vec2 opos = vec2(0.5, 0.1);       // object-position
uniform float radius = 22.0;
uniform float bw = 0.0;                    // kenarlık px
uniform vec4 bcol : source_color = vec4(0.0);
uniform vec4 bg0 : source_color = vec4(0.0);
uniform vec4 bg1 : source_color = vec4(0.0);
float sd(vec2 p, vec2 hs, float r) {
	vec2 q = abs(p) - hs + r;
	return min(max(q.x, q.y), 0.0) + length(max(q, 0.0)) - r;
}
void fragment() {
	vec2 p = UV * box;
	float s = max(box.x / isz.x, box.y / isz.y);
	vec2 dsz = isz * s;
	vec2 off = (box - dsz) * opos;
	vec2 uv = (p - off) / dsz;
	vec4 im = texture(img, uv);
	// zemin: radial-gradient(circle at 50% 38%, bg0, bg1 78%)
	float rr = length(p - box * vec2(0.5, 0.38)) / (0.78 * length(box * vec2(0.5, 0.62)));
	vec4 bg = mix(bg0, bg1, clamp(rr, 0.0, 1.0));
	vec4 c = vec4(mix(bg.rgb, im.rgb, im.a), max(bg.a, im.a));
	float d = sd(p - box * 0.5, box * 0.5, min(radius, min(box.x, box.y) * 0.5));
	if (bw > 0.0) c = mix(c, vec4(bcol.rgb, 1.0), clamp(d + bw + 0.5, 0.0, 1.0) * bcol.a);
	c.a *= clamp(0.5 - d, 0.0, 1.0);
	COLOR = c;
}
