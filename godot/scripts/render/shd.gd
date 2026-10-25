class_name Shd
## three.js malzemelerinin Godot karşılıkları (önbellekli shader üretimi).
## • basic(): MeshBasicMaterial — ışıksız; color · map · vertexColors ·
##   instanceColor · opacity · blending (normal/additive) · side · depthWrite
## • lit():   MeshStandardMaterial (fiziksel, three r169) + charLook kenar ışığı
## Renk uzayı: three'de colorSpace atanmamış kanvas dokuları HAM (doğrusal)
## okunur → "raw" (source_color YOK); sRGB atananlar "srgb".
## Çıkış: Compatibility sahne çizimi doğrusal → sRGB'yi gölgelendiricinin
## sonunda yapar ve harmanlama kodlanmış değerde olur — three ile aynı.

static var _cache := {}

## o: {map:"raw"|"srgb"|"", vcol:bool, add:bool, alpha:bool, cull:"back"|"none",
##     zwrite:bool, ztest:bool, tex_repeat:bool, fog:false, unlit:true}
static func basic_shader(o: Dictionary) -> Shader:
	var key := "b|" + str(o.get("map", "")) + "|" + str(o.get("vcol", false)) + "|" + str(o.get("add", false)) \
		+ "|" + str(o.get("alpha", false)) + "|" + str(o.get("cull", "back")) + "|" + str(o.get("zwrite", true)) \
		+ "|" + str(o.get("ztest", true)) + "|" + str(o.get("repeat", false)) + "|" + str(o.get("billboard", "")) \
		+ "|" + str(o.get("vcol_alpha", false))
	if _cache.has(key): return _cache[key]
	var rm := ["unshaded", "fog_disabled" if false else "specular_disabled"]
	rm.append("cull_back" if o.get("cull", "back") == "back" else "cull_disabled")
	if o.get("add", false): rm.append("blend_add")
	elif o.get("alpha", false): rm.append("blend_mix")
	if not o.get("zwrite", true): rm.append("depth_draw_never")
	elif o.get("alpha", false) or o.get("add", false): rm.append("depth_draw_always")
	if not o.get("ztest", true): rm.append("depth_test_disabled")
	var c := "shader_type spatial;\nrender_mode " + ", ".join(rm) + ";\n#include \"res://shaders/three_lit.gdshaderinc\"\n"
	c += "uniform vec4 color = vec4(1.0);\nuniform float opacity = 1.0;\n"
	var m: String = o.get("map", "")
	var rep := ", repeat_enable" if o.get("repeat", false) else ", repeat_disable"
	if m == "srgb": c += "uniform sampler2D map : filter_linear_mipmap" + rep + ";\n"
	elif m == "raw": c += "uniform sampler2D map : filter_linear_mipmap" + rep + ";\n"
	c += "uniform vec2 uv_rep = vec2(1.0);\nuniform vec2 uv_off = vec2(0.0);\n"
	if o.get("billboard", "") == "spin":
		# _bb(): kamera yönlü kare + kendi ekseninde dönüş (INSTANCE_CUSTOM.x = açı)
		c += "void vertex() {\n\tvec3 p = VERTEX;\n\tfloat a = INSTANCE_CUSTOM.x;\n\tp.xy = mat2(vec2(cos(a), sin(a)), vec2(-sin(a), cos(a))) * p.xy;\n"
		c += "\tvec3 sx = vec3(length(MODEL_MATRIX[0].xyz), length(MODEL_MATRIX[1].xyz), 1.0);\n"
		c += "\tMODELVIEW_MATRIX = VIEW_MATRIX * mat4(INV_VIEW_MATRIX[0], INV_VIEW_MATRIX[1], INV_VIEW_MATRIX[2], MODEL_MATRIX[3]);\n\tVERTEX = vec3(p.x * sx.x, p.y * sx.y, 0.0);\n}\n"
	c += "void fragment() {\n\tvec4 d = vec4(r3_lin(color.rgb), color.a);\n"
	if m == "srgb": c += "\tvec4 tx = texture(map, UV * uv_rep + uv_off);\n\td *= vec4(r3_lin(tx.rgb), tx.a);\n"
	elif m == "raw": c += "\td *= texture(map, UV * uv_rep + uv_off);\n"
	c += "\td.rgb *= COLOR.rgb;\n"
	if o.get("vcol_alpha", false): c += "\td.a *= COLOR.a;\n"
	c += "\tALBEDO = r3_srgb(d.rgb);\n"
	if o.get("alpha", false) or o.get("add", false): c += "\tALPHA = d.a * opacity;\n"
	c += "}\n"
	var s := Shader.new()
	s.code = c
	_cache[key] = s
	return s

## Borderlands tarzı efekt: eski eklemeli parıltı dokusunun çizgi roman karşılığı varsa
## (assets/fx/comic/<ad>) alfa karışımlı konturlu malzeme döner; yoksa null.
const COMIC := {"slash.png": "slash.png", "shock.png": "shock.png", "beam.png": "beam.png", "bolt_1.png": "bolt_1.png",
	"bolt_2.png": "bolt_2.png", "bolt_3.png": "bolt_3.png", "flame_sprite.png": "flame.png", "soft_blob.png": "blob.png"}
static var _comic_sh: Shader
static func comic(texp: String, col = null, opacity := 1.0, order := 0) -> ShaderMaterial:
	var f := texp.get_file()
	if not COMIC.has(f): return null
	if _comic_sh == null: _comic_sh = load("res://shaders/fx_comic.gdshader")
	var m := ShaderMaterial.new()
	m.shader = _comic_sh
	m.set_shader_parameter("map", load("res://assets/fx/comic/" + str(COMIC[f])))
	if col != null: m.set_shader_parameter("color", col if col is Color else JS.col(col))
	m.set_shader_parameter("opacity", opacity)
	m.render_priority = clampi(order, -128, 127)
	return m

## Kısayol: MeshBasicMaterial karşılığı (ShaderMaterial).
static func basic(o: Dictionary = {}) -> ShaderMaterial:
	var mat := ShaderMaterial.new()
	mat.shader = basic_shader(o)
	if o.has("color"): mat.set_shader_parameter("color", JS.col(o.color) if o.color is String else (o.color if o.color is Color else JS.hexc(o.color)))
	if o.has("opacity"): mat.set_shader_parameter("opacity", float(o.opacity))
	if o.has("tex"): mat.set_shader_parameter("map", o.tex)
	if o.has("order"): mat.render_priority = clampi(int(o.order), -128, 127)
	return mat

## o: {map, mr, nmap, emap, lift, rim, cull, alpha, add}
## map: albedo · mr: glTF metallicRoughness (G=pürüz, B=metal) · nmap: normal
## (teğet uzayı, OpenGL) · emap: emissiveMap · lift: emissiveMap = map
static func lit_shader(o: Dictionary) -> Shader:
	var key := "l"
	for k in ["map", "mr", "nmap", "emap", "lift", "rim", "alpha", "add", "vat"]: key += "|" + str(o.get(k, k == "rim"))
	key += "|" + str(o.get("cull", "back"))
	if _cache.has(key): return _cache[key]
	var rm := ["unshaded"]
	rm.append("cull_back" if o.get("cull", "back") == "back" else "cull_disabled")
	if o.get("add", false): rm.append("blend_add")
	if o.get("alpha", false) or o.get("add", false): rm.append("depth_draw_always")
	var c := "shader_type spatial;\nrender_mode " + ", ".join(rm) + ";\n#include \"res://shaders/three_lit.gdshaderinc\"\n"
	c += "uniform vec4 color = vec4(1.0);\nuniform float roughness = 1.0;\nuniform float metalness = 0.0;\n"
	c += "uniform vec4 emissive = vec4(0.0, 0.0, 0.0, 1.0);\nuniform float emissive_k = 1.0;\nuniform float opacity = 1.0;\n"
	c += "uniform float rim_s = 0.42;\nuniform float rim_p = 3.0;\nuniform vec3 rim_c = vec3(1.0, 0.716, 0.456);\n"
	# ölüm: beyaz flaş + kenarı parlayan çözülme (düşman ölüm efekti; 0 iken maliyetsiz dal)
	if not o.get("vat", false): c += "uniform float dissolve = 0.0;\nuniform float white = 0.0;\n"
	c += "uniform vec4 dis_col = vec4(1.0, 0.6, 0.3, 1.0);\n"
	if o.get("map", false): c += "uniform sampler2D map : filter_linear_mipmap_anisotropic;\n"
	if o.get("mr", false): c += "uniform sampler2D mr_map : filter_linear_mipmap_anisotropic;\n"
	if o.get("nmap", false): c += "uniform sampler2D normal_map : hint_normal, filter_linear_mipmap_anisotropic;\n"
	if o.get("emap", false): c += "uniform sampler2D emissive_map : filter_linear_mipmap_anisotropic;\n"
	var vat: bool = o.get("vat", false)
	if vat:
		# VAT: köşe konumu/normali dokudan (kare başına satır bloğu), iki kare arası doğrusal;
		# INSTANCE_CUSTOM: x = animasyon evresi (0..1) · y = beyaz flaş · z = çözülme · w = ışıma çarpanı
		c += VAT_VERTEX
	c += "void fragment() {\n\tvec4 d = vec4(r3_lin(color.rgb), color.a);\n\tvec3 em = r3_lin(emissive.rgb);\n"
	# hafif negatif mip sapması: ekranda küçük görünen modellerde doku bir kademe daha net
	# (yüz, kumaş, kemer detayları bulanık/bloklu değil)
	if o.get("map", false): c += "\tvec4 tx = texture(map, UV, -0.6);\n\ttx.rgb = r3_lin(tx.rgb);\n\td *= tx;\n"
	c += "\td.rgb *= COLOR.rgb;\n\tvec3 N = normalize(NORMAL);\n\tvec3 V = normalize(VIEW);\n"
	c += "\tfloat rgh = roughness;\n\tfloat mtl = metalness;\n"
	if o.get("mr", false): c += "\tvec4 mr = texture(mr_map, UV);\n\trgh *= mr.g;\n\tmtl *= mr.b;\n"
	if o.get("nmap", false):
		c += "\tvec3 nm = texture(normal_map, UV).xyz * 2.0 - 1.0;\n"
		c += "\tN = normalize(TANGENT * nm.x + BINORMAL * nm.y + N * nm.z);\n"
	c += "\tvec3 o = r3_standard(d.rgb, mtl, rgh, N, V, VIEW_MATRIX);\n"
	if o.get("emap", false): c += "\to += em * r3_lin(texture(emissive_map, UV).rgb) * emissive_k;\n"
	elif o.get("lift", false) and o.get("map", false): c += "\to += em * tx.rgb * emissive_k;\n"
	else: c += "\to += em * emissive_k;\n"
	if o.get("rim", true): c += "\to += r3_rim(N, V, rim_s, rim_p, rim_c);\n"
	if vat:
		c += "\tfloat dissolve = v_cus.z;\n\tfloat white = v_cus.y;\n\to += em * emissive_k * (v_cus.w - 1.0);\n"
		c += "\tif (dissolve > 0.001) {\n\t\tvec3 lp = v_lp;\n"
	else:
		c += "\tif (dissolve > 0.001) {\n\t\tvec3 lp = (INV_VIEW_MATRIX * vec4(VERTEX, 1.0)).xyz - NODE_POSITION_WORLD;\n"
	c += "\t\tfloat dn = r3_noise3(lp * 0.15) * 0.7 + r3_noise3(lp * 0.55) * 0.3;\n"
	c += "\t\tdn = dn * 0.78 + clamp(lp.y / 70.0, 0.0, 1.0) * 0.22;\n"
	c += "\t\tif (1.0 - dn < dissolve) discard;\n"
	c += "\t\tfloat edge = 1.0 - smoothstep(dissolve, dissolve + 0.09, 1.0 - dn);\n"
	c += "\t\to = mix(o, r3_lin(dis_col.rgb) * 2.6, edge);\n\t}\n"
	c += "\to = mix(o, vec3(1.0), white);\n"
	c += "\tALBEDO = r3_srgb(o);\n"
	if o.get("alpha", false) or o.get("add", false): c += "\tALPHA = d.a * opacity;\n"
	c += "}\n"
	var s := Shader.new()
	s.code = c
	_cache[key] = s
	return s

static func lit(o: Dictionary = {}) -> ShaderMaterial:
	var mat := ShaderMaterial.new()
	mat.shader = lit_shader(o)
	if o.has("color"): mat.set_shader_parameter("color", JS.col(o.color) if o.color is String else (o.color if o.color is Color else JS.hexc(o.color)))
	mat.set_shader_parameter("roughness", float(o.get("roughness", 1.0)))
	mat.set_shader_parameter("metalness", float(o.get("metalness", 0.0)))
	if o.has("emissive"): mat.set_shader_parameter("emissive", JS.col(o.emissive) if o.emissive is String else (o.emissive if o.emissive is Color else JS.hexc(o.emissive)))
	if o.has("emissive_k"): mat.set_shader_parameter("emissive_k", float(o.emissive_k))
	if o.has("tex"): mat.set_shader_parameter("map", o.tex)
	return mat

## İçe aktarılmış glTF malzemesini three MeshStandard karşılığına çevirir.
## o: rough (sabit) · rough_max · metal (sabit) · metal_min/metal_max ·
##    lift (emissiveMap = map, emissive beyaz) · emissive (Color, sRGB) ·
##    emissive_k · rim (charLook kenar ışığı) · keep_emap (GLB'nin kendi ışıma dokusu)
static func from_gltf(src: BaseMaterial3D, o: Dictionary) -> ShaderMaterial:
	var f := {"rim": o.get("rim", true), "vat": o.get("vat", false)}
	var tx: Texture2D = src.albedo_texture if src else null
	var mr: Texture2D = src.roughness_texture if src else null
	var nm: Texture2D = src.normal_texture if src and src.normal_enabled else null
	var em: Texture2D = src.emission_texture if src and src.emission_enabled else null
	var lift: float = o.get("lift", 0.0)
	f.map = tx != null
	f.mr = mr != null
	f.nmap = nm != null
	f.emap = em != null and o.get("keep_emap", true) and lift <= 0
	f.lift = lift > 0 and not f.emap
	var m := ShaderMaterial.new()
	m.shader = lit_shader(f)
	if tx: m.set_shader_parameter("map", tx)
	if mr: m.set_shader_parameter("mr_map", mr)
	if nm: m.set_shader_parameter("normal_map", nm)
	if f.emap: m.set_shader_parameter("emissive_map", em)
	m.set_shader_parameter("color", src.albedo_color if src else Color(1, 1, 1))
	var r: float = o.get("rough", src.roughness if src else 1.0)
	if o.has("rough_max"): r = minf(r, o.rough_max)
	var mt: float = o.get("metal", src.metallic if src else 0.0)
	if o.has("metal_min"): mt = maxf(o.metal_min, mt)
	if o.has("metal_max"): mt = minf(o.metal_max, mt)
	m.set_shader_parameter("roughness", r)
	m.set_shader_parameter("metalness", mt)
	if f.lift:
		m.set_shader_parameter("emissive", Color(1, 1, 1))
		m.set_shader_parameter("emissive_k", lift * float(o.get("emissive_k", 1.0)))
	elif f.emap:
		m.set_shader_parameter("emissive", src.emission)
		m.set_shader_parameter("emissive_k", float(o.get("emissive_k", 1.0)) * src.emission_energy_multiplier)
	elif o.has("emissive"):
		m.set_shader_parameter("emissive", o.emissive)
		m.set_shader_parameter("emissive_k", float(o.get("emissive_k", 1.0)))
	else:
		m.set_shader_parameter("emissive_k", 0.0)
	return m

## VAT köşe fonksiyonu (lit ve kontur ortak): vat_pos/vat_nrm RGBA16F, genişlik vat_w,
## kare başına vat_rows satır, vat_frames kare. Köşe sırası = yüzey dizisi (VERTEX_ID).
const VAT_HEAD := """uniform highp sampler2D vat_pos : filter_nearest;
uniform highp sampler2D vat_nrm : filter_nearest;
uniform int vat_w = 1024;
uniform int vat_rows = 1;
uniform int vat_frames = 1;
uniform int vat_off = 0;
varying vec4 v_cus;
varying vec3 v_lp;
vec3 vat_fetch(highp sampler2D t, int vid, int f) {
	int row = f * vat_rows + vid / vat_w;
	return texelFetch(t, ivec2(vid - (vid / vat_w) * vat_w, row), 0).xyz;
}
"""
const VAT_VERTEX := VAT_HEAD + """void vertex() {
	int vid = VERTEX_ID + vat_off;
	float fr = fract(INSTANCE_CUSTOM.x) * float(vat_frames);
	int f0 = int(floor(fr));
	int f1 = f0 + 1;
	if (f1 >= vat_frames) f1 = 0;
	if (f0 >= vat_frames) f0 = vat_frames - 1;
	float k = fr - floor(fr);
	VERTEX = mix(vat_fetch(vat_pos, vid, f0), vat_fetch(vat_pos, vid, f1), k);
	NORMAL = normalize(mix(vat_fetch(vat_nrm, vid, f0), vat_fetch(vat_nrm, vid, f1), k));
	v_cus = INSTANCE_CUSTOM;
	v_lp = (MODEL_MATRIX * vec4(VERTEX, 0.0)).xyz;
}
"""
static var _vat_outline_sh: Shader
static func vat_outline(tex: Texture2D, base := Color(1, 1, 1), width := 1.5) -> ShaderMaterial:
	if _vat_outline_sh == null:
		var code := OUTLINE_CODE.replace("uniform sampler2D map : filter_linear_mipmap;", "uniform sampler2D map : filter_linear_mipmap;\n" + VAT_HEAD)
		code = code.replace("void vertex() {\n", """void vertex() {
	int vid = VERTEX_ID + vat_off;
	float fr = fract(INSTANCE_CUSTOM.x) * float(vat_frames);
	int f0 = int(floor(fr));
	int f1 = f0 + 1;
	if (f1 >= vat_frames) f1 = 0;
	if (f0 >= vat_frames) f0 = vat_frames - 1;
	float kk = fr - floor(fr);
	VERTEX = mix(vat_fetch(vat_pos, vid, f0), vat_fetch(vat_pos, vid, f1), kk);
	NORMAL = normalize(mix(vat_fetch(vat_nrm, vid, f0), vat_fetch(vat_nrm, vid, f1), kk));
	v_cus = INSTANCE_CUSTOM;
	v_lp = vec3(0.0);
""")
		# çözülen/flaşlı örnekte kontur yok (eski: next_pass kaldırılırdı)
		code = code.replace("\tPOSITION = clip;\n}", "\tPOSITION = clip;\n\tif (INSTANCE_CUSTOM.z > 0.001) POSITION = vec4(2.0, 2.0, 2.0, 1.0);\n}")
		_vat_outline_sh = Shader.new()
		_vat_outline_sh.code = code
	var m := ShaderMaterial.new()
	m.shader = _vat_outline_sh
	m.set_shader_parameter("width", width)
	m.set_shader_parameter("base", base)
	if tex:
		m.set_shader_parameter("map", tex)
		m.set_shader_parameter("use_map", 1.0)
	return m

## KONTUR (ters gövde): ikinci geçiş, ön yüzleri ayıklayıp normal yönünde ekran uzayında
## sabit kalınlıkta (~1,5 mantıksal px) şişirir. Renk saf siyah değil: dokunun koyulaştırılmış
## tonu + mürekkep (çizgi roman, yumuşak) — Borderlands'in kalın siyahı değil.
const OUTLINE_CODE := """shader_type spatial;
render_mode unshaded, cull_front, specular_disabled, fog_disabled;
#include "res://shaders/three_lit.gdshaderinc"
uniform vec4 ink = vec4(0.10, 0.06, 0.09, 1.0);
uniform float width = 1.5;
uniform float use_map = 0.0;
uniform vec4 base = vec4(1.0);
uniform sampler2D map : filter_linear_mipmap;
void vertex() {
	vec4 clip = PROJECTION_MATRIX * (MODELVIEW_MATRIX * vec4(VERTEX, 1.0));
	vec3 nv = (MODELVIEW_MATRIX * vec4(NORMAL, 0.0)).xyz;
	vec2 nc = (PROJECTION_MATRIX * vec4(nv, 0.0)).xy;
	float ln = length(nc);
	if (ln > 1e-5) {
		float px = width * VIEWPORT_SIZE.y / 844.0;
		clip.xy += (nc / ln) * (px * 2.0 / VIEWPORT_SIZE) * clip.w;
	}
	POSITION = clip;
}
void fragment() {
	vec3 c = r3_lin(base.rgb);
	if (use_map > 0.5) c *= r3_lin(texture(map, UV).rgb);
	ALBEDO = r3_srgb(mix(r3_lin(ink.rgb), c * 0.16, 0.55));
}
"""
static var _outline_sh: Shader
static var _outline_cache := {}
static func outline(tex: Texture2D, base := Color(1, 1, 1), width := 1.5) -> ShaderMaterial:
	var key := str(tex.get_instance_id() if tex else 0) + "|" + base.to_html() + "|" + str(width)
	if _outline_cache.has(key): return _outline_cache[key]
	if _outline_sh == null:
		_outline_sh = Shader.new()
		_outline_sh.code = OUTLINE_CODE
	var m := ShaderMaterial.new()
	m.shader = _outline_sh
	m.set_shader_parameter("width", width)
	m.set_shader_parameter("base", base)
	if tex:
		m.set_shader_parameter("map", tex)
		m.set_shader_parameter("use_map", 1.0)
	_outline_cache[key] = m
	return m

## Bir düğüm ağacındaki tüm yüzeyleri çevirir; malzeme listesini döndürür.
## o.outline: kontur kalınlığı (mantıksal px; 0/yok = kontursuz)
static func convert_tree(root: Node, o: Dictionary) -> Array:
	var mats := []
	for c in root.find_children("*", "MeshInstance3D", true, false):
		var mi := c as MeshInstance3D
		mi.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
		mi.extra_cull_margin = 16384.0
		for si in mi.mesh.get_surface_count():
			var src := mi.get_active_material(si) as BaseMaterial3D
			var m := from_gltf(src, o)
			if float(o.get("outline", 0.0)) > 0.0:
				m.next_pass = outline(src.albedo_texture if src else null, src.albedo_color if src else Color.WHITE, float(o.outline))
			mi.set_surface_override_material(si, m)
			mats.append(m)
	return mats

## sRGB hex → doğrusal Vector3 (three'nin Color.setHex + ColorManagement'i)
static func lin3(c: Color, k: float = 1.0) -> Vector3:
	var l := c.srgb_to_linear()
	return Vector3(l.r, l.g, l.b) * k
