shader_type canvas_item;
render_mode blend_add, unshaded;
// Nadirlik parıltısı (kartın ÇERÇEVESİNDE; görseli kapatmaz): dışa sızan nabızlı hale,
// ince parlak kontur, çerçeve boyunca dolaşan kuyruklu ışık(lar) ve kenarda yanıp sönen
// dört köşeli yıldızcıklar. Kart düğümünün üstüne, kartı pad kadar taşan bir ColorRect'e
// uygulanır (blend_add: siyah = etkisiz).

uniform vec2 box = vec2(104.0, 162.0);
uniform float pad = 16.0;
uniform float radius = 12.0;
uniform vec4 col : source_color = vec4(1.0, 0.75, 0.2, 1.0);
uniform float level = 1.0;
uniform float comets = 1.0;     // 0, 1 ya da 2 dolaşan ışık
uniform float sparks = 4.0;     // yıldızcık sayısı (0–8)
uniform float speed = 0.22;
uniform float seed = 0.0;

float sd_rrect(vec2 p, vec2 b, float r) {
	vec2 q = abs(p) - b + r;
	return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
}

float hash(float n) { return fract(sin(n * 12.9898 + 4.1414) * 43758.5453); }

// çevre üzerinde u (0..1) konumundaki nokta (dikdörtgen yürüyüşü)
vec2 perim(float u, vec2 h) {
	float P = 4.0 * (h.x + h.y);
	float s = u * P;
	if (s < 2.0 * h.x) return vec2(-h.x + s, -h.y);
	s -= 2.0 * h.x;
	if (s < 2.0 * h.y) return vec2(h.x, -h.y + s);
	s -= 2.0 * h.y;
	if (s < 2.0 * h.x) return vec2(h.x - s, h.y);
	s -= 2.0 * h.x;
	return vec2(-h.x, h.y - s);
}

// çevre parametresi (açıdan; kartın en-boyuna göre düzeltilmiş)
float perim_u(vec2 p, vec2 h) {
	float a = atan(p.y / h.y, p.x / h.x);
	return fract(a / 6.2831853 + 0.25);
}

void fragment() {
	vec2 full = box + 2.0 * pad;
	vec2 p = UV * full - full * 0.5;
	vec2 h = box * 0.5;
	float d = sd_rrect(p, h, radius);
	float t = TIME;
	float pulse = 0.72 + 0.28 * sin(t * 2.1 + seed * 6.0);
	// dış hale (yalnız dışarı) + ince kontur (çerçeve çizgisi üstünde)
	float outer = d > 0.0 ? exp(-d / (pad * 0.32)) : 0.0;
	float rim = smoothstep(2.6, 0.0, abs(d + 1.0));
	vec3 c = col.rgb;
	vec3 o = c * (outer * 0.55 * pulse + rim * 0.35);
	// dolaşan kuyruklu ışık(lar)
	if (comets > 0.5) {
		float u = perim_u(p, h);
		float band = smoothstep(3.2, 0.0, abs(d + 1.0));
		float halo = d > -1.0 ? exp(-max(d, 0.0) / (pad * 0.16)) : 0.0;
		for (int k = 0; k < 2; k++) {
			if (float(k) >= comets) break;
			float ph = fract(u - t * speed - seed - float(k) * 0.5);
			// kuyruk başın ARKASINDA yumuşakça açılır; baş simetrik bir benek (keskin kesik yok)
			float tail = exp(-ph * 15.0) * smoothstep(0.0, 0.035, ph);
			float dh = min(ph, 1.0 - ph);
			float head = exp(-dh * dh * 9000.0);
			o += (c * 1.2 + vec3(0.35)) * tail * band * 1.3;
			o += (vec3(0.8) + c * 0.4) * head * (band + halo * 0.6);
			o += c * tail * halo * 0.7;
		}
	}
	// yıldızcıklar: çerçeve üzerinde sabit noktalar, sırayla parlayıp söner
	for (int i = 0; i < 8; i++) {
		if (float(i) >= sparks) break;
		float fi = float(i);
		vec2 sp = perim(hash(fi + seed * 7.3), h);
		vec2 v = p - sp;
		float tw = pow(max(0.0, sin(t * (1.3 + hash(fi + 3.1) * 0.9) + fi * 2.4 + seed * 9.0)), 10.0);
		// dört köşeli yıldız: kısa simetrik kollar + parlak çekirdek (dönmez, yalnız nabız)
		vec2 w = v / (0.75 + 0.25 * tw);
		float star = exp(-abs(w.x) * 2.2) * exp(-abs(w.y) * 0.55) + exp(-abs(w.y) * 2.2) * exp(-abs(w.x) * 0.55);
		star += exp(-dot(w, w) * 0.18) * 1.3;
		o += (vec3(1.0) * 0.7 + c * 0.6) * star * tw;
	}
	COLOR = vec4(o * level, 1.0);
}
