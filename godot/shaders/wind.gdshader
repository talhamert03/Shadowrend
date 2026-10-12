// render3d._buildDecor wind() — v47 RÜZGÂR (WIND_VS) + v49 AĞAÇ ŞEFFAFLIĞI (FADE_FS).
// Örnek matrisinden SONRA dünya uzayında sallanır; genlik yükseklik².
shader_type spatial;
render_mode unshaded, cull_back, specular_disabled, skip_vertex_transform;
global uniform float r3_time;
global uniform vec2 r3_player;
uniform sampler2D map : source_color, filter_linear_mipmap_anisotropic, repeat_enable;
uniform float sway = 0.0;
uniform float push = 0.0;
uniform float fade = 0.0;
varying vec3 v_w;
void vertex() {
	vec4 mv = MODEL_MATRIX * vec4(VERTEX, 1.0);
	float khH = max(VERTEX.y, 0.0);
	float khP = r3_time * 1.55 + mv.x * 0.011 + mv.z * 0.007;
	float khW = sin(khP) * 0.62 + sin(khP * 2.3 + 1.3) * 0.38;
	mv.x += khW * khH * khH * sway;
	mv.z += khW * khH * khH * sway * 0.45;
	if (push > 0.0) {
		vec2 khD = mv.xz - r3_player;
		float khL = length(khD) + 0.001;
		float khF = (1.0 - smoothstep(16.0, 72.0, khL)) * min(khH, 30.0) * push;
		mv.xz += khD / khL * khF;
		mv.y -= khF * 0.3;
	}
	v_w = mv.xyz;
	VERTEX = (VIEW_MATRIX * mv).xyz;
	NORMAL = normalize((MODELVIEW_MATRIX * vec4(NORMAL, 0.0)).xyz);
}
void fragment() {
	if (fade > 0.0 && v_w.y > 30.0 && v_w.z > r3_player.y + 6.0) {
		vec2 khQ = vec2(v_w.x - r3_player.x, (v_w.z - v_w.y * 0.966) - (r3_player.y - 44.0));
		float khR = length(khQ * vec2(1.0, 0.82));
		float khK = 1.0 - smoothstep(54.0, 98.0, khR);
		if (khK > 0.0) {
			vec2 khC = mod(floor(FRAGCOORD.xy), 4.0);
			vec2 khA = mod(khC, 2.0), khB2 = floor(khC * 0.5);
			float khBy = (mod(khA.x * 2.0 + khA.y * 3.0, 4.0) * 4.0 + mod(khB2.x * 2.0 + khB2.y * 3.0, 4.0)) / 16.0;
			if (khBy < khK * fade * 0.72) discard;
		}
	}
	ALBEDO = texture(map, UV).rgb * COLOR.rgb;
}
