// Yer efektleri (süper güç, vuruş halkaları, büyü çemberleri, zehir batağı…): Ultimate/Vfx'in
// dünya uzayındaki 2B üçgenleri (x, z) burada zemine yatırılır. Derinlik testli: karakterler ve
// engeller efektin ÖNÜNDE kalır — efekt gerçekten yere işlenmiş görünür (2B üst katmanda
// çizilince karakterlerin ayağını örtüp "havada" duruyordu).
shader_type spatial;
render_mode unshaded, cull_disabled, depth_draw_never, blend_mix, fog_disabled;
uniform float lift = 1.4;
void vertex() {
	VERTEX = vec3(VERTEX.x, lift, VERTEX.y);
}
void fragment() {
	ALBEDO = COLOR.rgb;
	ALPHA = COLOR.a;
}
