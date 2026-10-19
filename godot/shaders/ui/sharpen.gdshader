// 3B görüntü keskinleştirme (AMD CAS'tan esinli, hafif): komşulara göre yerel kontrast artırılır,
// aşırı uçlar komşuların min/maks aralığına kırpılır (hale / parlama yok).
shader_type canvas_item;
uniform float amount = 0.35;
void fragment() {
	vec2 px = TEXTURE_PIXEL_SIZE;
	vec3 c = texture(TEXTURE, UV).rgb;
	vec3 n = texture(TEXTURE, UV + vec2(0.0, -px.y)).rgb;
	vec3 s = texture(TEXTURE, UV + vec2(0.0, px.y)).rgb;
	vec3 e = texture(TEXTURE, UV + vec2(px.x, 0.0)).rgb;
	vec3 w = texture(TEXTURE, UV + vec2(-px.x, 0.0)).rgb;
	vec3 mn = min(c, min(min(n, s), min(e, w)));
	vec3 mx = max(c, max(max(n, s), max(e, w)));
	vec3 sharp = c + (c * 4.0 - (n + s + e + w)) * amount;
	COLOR = vec4(clamp(sharp, mn, mx), 1.0);
}
