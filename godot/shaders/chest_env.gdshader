// chestModel3d makeEnv — stüdyo çevresi: üst aydınlık / ufuk / alt karanlık + yumuşak ışık kutuları.
// Yalnız ortam ışığı ve metal yansıması için (arka plan şeffaf).
shader_type sky;
const vec3 TOP = vec3(0.95, 0.9, 1.0);
const vec3 HOR = vec3(0.3, 0.27, 0.3);
const vec3 BOT = vec3(0.018, 0.016, 0.02);
float box(vec3 d, vec3 c, float w, float h) {
	// c yönünde, yaklaşık w×h açısal boyutlu yumuşak dikdörtgen (uzaklık ~60)
	vec3 f = normalize(c);
	vec3 r = normalize(cross(vec3(0.0, 1.0, 0.0), f));
	if (length(cross(vec3(0.0, 1.0, 0.0), f)) < 0.01) r = vec3(1.0, 0.0, 0.0);
	vec3 u = cross(f, r);
	float k = dot(d, f);
	if (k <= 0.0) return 0.0;
	vec2 q = vec2(dot(d, r), dot(d, u)) / k * length(c);
	vec2 e = abs(q) - vec2(w, h) * 0.5;
	return 1.0 - smoothstep(-2.0, 2.0, max(e.x, e.y));
}
void sky() {
	vec3 d = EYEDIR;
	float y = d.y;
	vec3 c = y > 0.0 ? mix(HOR, TOP, pow(y, 0.7)) : mix(HOR, BOT, pow(-y, 0.45));
	c = mix(c, vec3(6.0, 5.3, 4.4), box(d, vec3(-34.0, 38.0, 30.0), 34.0, 22.0));
	c = mix(c, vec3(1.1, 1.4, 2.2), box(d, vec3(46.0, 12.0, 24.0), 20.0, 30.0));
	c = mix(c, vec3(2.4, 2.3, 2.2), box(d, vec3(0.0, 56.0, 0.01), 60.0, 10.0));
	c = mix(c, vec3(2.3, 1.7, 1.1), box(d, vec3(0.0, 18.0, -52.0), 70.0, 12.0));
	c = mix(c, vec3(1.0, 0.82, 0.7), box(d, vec3(0.0, -4.0, 52.0), 50.0, 10.0));
	COLOR = c;
}
