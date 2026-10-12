class_name IMesh
extends MultiMeshInstance3D
## three.js InstancedMesh karşılığı. Örnek verisi tek bir PackedFloat32Array'de
## tutulur ve karede BİR KEZ RenderingServer'a yüklenir (commit) — örnek başına
## sunucu çağrısı yok. Düzen: 12 dönüşüm (3×4 satır) + 4 renk (+ 4 özel).
## Renk three'deki instanceColor gibi doğrusal çarpandır (COLOR'a çarpılır).

var cap := 0
var stride := 16
var buf := PackedFloat32Array()
var count := 0
var has_custom := false

func _init(mesh: Mesh, mat: Material, max_n: int, custom := false) -> void:
	cap = max_n
	has_custom = custom
	stride = 16 + (4 if custom else 0)
	multimesh = MultiMesh.new()
	multimesh.transform_format = MultiMesh.TRANSFORM_3D
	multimesh.use_colors = true
	multimesh.use_custom_data = custom
	multimesh.mesh = mesh
	multimesh.instance_count = max_n
	multimesh.visible_instance_count = 0
	buf.resize(max_n * stride)
	for i in max_n: buf[i * stride + 12] = 1; buf[i * stride + 13] = 1; buf[i * stride + 14] = 1; buf[i * stride + 15] = 1
	if mat: material_override = mat
	cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	# web: frustumCulled = false (örnekler haritanın her yerinde)
	custom_aabb = AABB(Vector3(-1e5, -1e4, -1e5), Vector3(2e5, 2e4, 2e5))
	rotation_order = EULER_ORDER_XYZ

## T·R·S (R = Euler XYZ, three sırası) — compose karşılığı
func set_trs(i: int, x: float, y: float, z: float, rx: float, ry: float, rz: float, sx: float, sy: float, sz: float) -> void:
	var cx := cos(rx); var snx := sin(rx)
	var cy := cos(ry); var sny := sin(ry)
	var cz := cos(rz); var snz := sin(rz)
	# three Matrix4.makeRotationFromEuler 'XYZ'
	var ae := cx * cz; var af := cx * snz; var be := snx * cz; var bf := snx * snz
	var m11 := cy * cz; var m12 := -cy * snz; var m13 := sny
	var m21 := af + be * sny; var m22 := ae - bf * sny; var m23 := -snx * cy
	var m31 := bf - ae * sny; var m32 := be + af * sny; var m33 := cx * cy
	var o := i * stride
	buf[o] = m11 * sx; buf[o + 1] = m12 * sy; buf[o + 2] = m13 * sz; buf[o + 3] = x
	buf[o + 4] = m21 * sx; buf[o + 5] = m22 * sy; buf[o + 6] = m23 * sz; buf[o + 7] = y
	buf[o + 8] = m31 * sx; buf[o + 9] = m32 * sy; buf[o + 10] = m33 * sz; buf[o + 11] = z

## Yalnız Y dönüşü + ölçek (en sık durum, ucuz yol)
func set_ys(i: int, x: float, y: float, z: float, ry: float, sx: float, sy: float, sz: float) -> void:
	var c := cos(ry); var s := sin(ry)
	var o := i * stride
	buf[o] = c * sx; buf[o + 1] = 0; buf[o + 2] = s * sz; buf[o + 3] = x
	buf[o + 4] = 0; buf[o + 5] = sy; buf[o + 6] = 0; buf[o + 7] = y
	buf[o + 8] = -s * sx; buf[o + 9] = 0; buf[o + 10] = c * sz; buf[o + 11] = z

## Basis + konum (genel durum)
func set_mat(i: int, b: Basis, p: Vector3) -> void:
	var o := i * stride
	buf[o] = b.x.x; buf[o + 1] = b.y.x; buf[o + 2] = b.z.x; buf[o + 3] = p.x
	buf[o + 4] = b.x.y; buf[o + 5] = b.y.y; buf[o + 6] = b.z.y; buf[o + 7] = p.y
	buf[o + 8] = b.x.z; buf[o + 9] = b.y.z; buf[o + 10] = b.z.z; buf[o + 11] = p.z

## Kameraya bakan kare (render3d._bb): kamera dönüşü × Z ekseninde spin × (sx, sy, 1)
func set_bb(i: int, x: float, y: float, z: float, sx: float, sy: float, spin: float, cam: Basis) -> void:
	var c := cos(spin); var s := sin(spin)
	var ax := cam.x * c + cam.y * s
	var ay := cam.y * c - cam.x * s
	var o := i * stride
	buf[o] = ax.x * sx; buf[o + 1] = ay.x * sy; buf[o + 2] = cam.z.x; buf[o + 3] = x
	buf[o + 4] = ax.y * sx; buf[o + 5] = ay.y * sy; buf[o + 6] = cam.z.y; buf[o + 7] = y
	buf[o + 8] = ax.z * sx; buf[o + 9] = ay.z * sy; buf[o + 10] = cam.z.z; buf[o + 11] = z

func set_col(i: int, r: float, g: float, b: float, a: float = 1.0) -> void:
	var o := i * stride + 12
	buf[o] = r; buf[o + 1] = g; buf[o + 2] = b; buf[o + 3] = a

func set_color(i: int, c: Color) -> void:
	var o := i * stride + 12
	buf[o] = c.r; buf[o + 1] = c.g; buf[o + 2] = c.b; buf[o + 3] = c.a

func set_custom(i: int, a: float, b: float = 0, c: float = 0, d: float = 0) -> void:
	var o := i * stride + 16
	buf[o] = a; buf[o + 1] = b; buf[o + 2] = c; buf[o + 3] = d

## perf.js commitInstanced: n örneği yükle ve görünür say
func commit(n: int) -> void:
	count = n
	multimesh.visible_instance_count = n
	if n > 0: RenderingServer.multimesh_set_buffer(multimesh.get_rid(), buf)
	visible = n > 0
