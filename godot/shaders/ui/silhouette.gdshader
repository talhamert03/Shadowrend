// filter: brightness(0) invert(1) + opaklık — görüntünün alfasıyla düz renk siluet.
shader_type canvas_item;
uniform vec4 col : source_color = vec4(1.0, 1.0, 1.0, 0.07);
void fragment() { COLOR = vec4(col.rgb, COLOR.a * col.a); }
