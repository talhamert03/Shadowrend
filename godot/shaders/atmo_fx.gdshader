// render3d FX_VS/FX_FS — hale · ateşböceği · kor · sandık parıltısı · toz.
// Hareket tamamen köşe gölgelendiricisinde. Örnek verisi MultiMesh dönüşümüne
// paketlenir: origin = aA.xyz · sütun0 = (aA.w, aB.x, aB.y) · sütun1 = (aB.z, aB.w, -) · COLOR = aC.
// three ShaderMaterial çıktıyı KODLAMAZ (ekran uzayında ham toplama).
shader_type spatial;
render_mode unshaded, blend_add, depth_draw_never, cull_disabled, skip_vertex_transform;
global uniform float r3_time;
global uniform vec2 r3_player;
varying vec2 v_uv;
varying vec3 v_col;
void vertex() {
	vec3 A = MODEL_MATRIX[3].xyz;
	float m = MODEL_MATRIX[0].x, ph = MODEL_MATRIX[0].y, sz = MODEL_MATRIX[0].z, R = MODEL_MATRIX[1].x, H = MODEL_MATRIX[1].y;
	float t = r3_time, a = 1.0;
	vec3 p = A;
	if (m < 0.5) { a = 0.8 + 0.2 * sin(t * 6.3 + ph) * sin(t * 2.1 + ph * 1.7); }
	else if (m < 1.5) { p += vec3(sin(t * 0.31 + ph) * R, sin(t * 0.83 + ph * 2.0) * H * 0.3 + H * 0.45, cos(t * 0.27 + ph * 1.3) * R); a = 0.12 + 0.88 * pow(max(0.0, sin(t * 1.15 + ph * 3.0)), 3.0); }
	else if (m < 2.5) { float l = fract(t * 0.21 + ph * 0.159); p += vec3(sin(l * 5.0 + ph) * R * 0.5, l * H, cos(l * 4.0 + ph) * R * 0.5); a = sin(l * 3.14159); sz *= 1.0 - l * 0.55; }
	else if (m < 3.5) { float s = pow(max(0.0, sin(t * 1.6 + ph)), 30.0); a = s; sz *= 0.5 + s; }
	else { p += vec3(sin(t * 0.13 + ph) * R, H * 0.5 + sin(t * 0.21 + ph) * H * 0.4, cos(t * 0.11 + ph * 1.1) * R); a = 0.45 + 0.55 * sin(t * 0.7 + ph); }
	if ((m > 0.5 && m < 2.5) || m > 3.5) a *= smoothstep(40.0, 150.0, distance(p.xz, r3_player));
	vec4 mv = VIEW_MATRIX * vec4(p, 1.0);
	mv.xy += VERTEX.xy * sz;
	VERTEX = mv.xyz;
	v_uv = UV - vec2(0.5);
	v_col = COLOR.rgb * max(a, 0.0);
}
void fragment() {
	float d = length(v_uv) * 2.0;
	float k = exp(-d * d * 3.0) * (1.0 - smoothstep(0.8, 1.0, d));
	vec3 raw = v_col * k;
	// three ShaderMaterial ham değeri yazar; Compatibility de kodlamaz → aynen
	ALBEDO = raw;
	ALPHA = 1.0;
}
