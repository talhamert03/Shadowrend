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
		+ "|" + str(o.get("ztest", true)) + "|" + str(o.get("repeat", false)) + "|" + str(o.get("billboard", ""))
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
	for k in ["map", "mr", "nmap", "emap", "lift", "rim", "alpha", "add"]: key += "|" + str(o.get(k, k == "rim"))
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
	if o.get("map", false): c += "uniform sampler2D map : filter_linear_mipmap_anisotropic;\n"
	if o.get("mr", false): c += "uniform sampler2D mr_map : filter_linear_mipmap_anisotropic;\n"
	if o.get("nmap", false): c += "uniform sampler2D normal_map : hint_normal, filter_linear_mipmap_anisotropic;\n"
	if o.get("emap", false): c += "uniform sampler2D emissive_map : filter_linear_mipmap_anisotropic;\n"
	c += "void fragment() {\n\tvec4 d = vec4(r3_lin(color.rgb), color.a);\n\tvec3 em = r3_lin(emissive.rgb);\n"
	if o.get("map", false): c += "\tvec4 tx = texture(map, UV);\n\ttx.rgb = r3_lin(tx.rgb);\n\td *= tx;\n"
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
	var f := {"rim": o.get("rim", true)}
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

## Bir düğüm ağacındaki tüm yüzeyleri çevirir; malzeme listesini döndürür.
static func convert_tree(root: Node, o: Dictionary) -> Array:
	var mats := []
	for c in root.find_children("*", "MeshInstance3D", true, false):
		var mi := c as MeshInstance3D
		mi.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
		mi.extra_cull_margin = 16384.0
		for si in mi.mesh.get_surface_count():
			var src := mi.get_active_material(si) as BaseMaterial3D
			var m := from_gltf(src, o)
			mi.set_surface_override_material(si, m)
			mats.append(m)
	return mats

## sRGB hex → doğrusal Vector3 (three'nin Color.setHex + ColorManagement'i)
static func lin3(c: Color, k: float = 1.0) -> Vector3:
	var l := c.srgb_to_linear()
	return Vector3(l.r, l.g, l.b) * k
