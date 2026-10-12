// Katman kırpması (CSS overflow:hidden + border-radius): Uyumluluk işleyicisinde
// clip_children yok → her çizim öğesi en içteki kırpan atanın yerel uzayına
// dönüştürülür ve yuvarlak dikdörtgen SDF ile maskelenir.
shader_type canvas_item;
uniform vec4 crect = vec4(0.0, 0.0, 100.0, 100.0);
uniform vec4 rad = vec4(0.0);          // sol üst, sağ üst, sağ alt, sol alt
uniform vec2 ix = vec2(1.0, 0.0);      // tuval → kırpan yerel (ters dönüşüm sütunları)
uniform vec2 iy = vec2(0.0, 1.0);
uniform vec2 io = vec2(0.0);
varying vec2 lp;
void vertex() {
	vec2 w = (MODEL_MATRIX * vec4(VERTEX, 0.0, 1.0)).xy;
	lp = ix * w.x + iy * w.y + io;
}
float sd(vec2 p) {
	vec2 hs = crect.zw * 0.5;
	vec2 q = p - (crect.xy + hs);
	float r = q.x < 0.0 ? (q.y < 0.0 ? rad.x : rad.w) : (q.y < 0.0 ? rad.y : rad.z);
	r = min(r, min(hs.x, hs.y));
	vec2 a = abs(q) - hs + r;
	return min(max(a.x, a.y), 0.0) + length(max(a, 0.0)) - r;
}
void fragment() {
	vec4 c = COLOR;   // Godot 4: girişte COLOR zaten doku × modülasyon
	c.a *= clamp(0.5 - sd(lp), 0.0, 1.0);
	COLOR = c;
}
