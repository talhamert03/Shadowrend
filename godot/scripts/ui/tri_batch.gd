class_name TriBatch
extends RefCounted
## Çok sayıda düz renkli şekli (nokta, ışın, konfeti, kıvılcım) tek üçgen ağında toplar ve
## tek draw_mesh ile çizer. Uyumluluk çizicisinde her draw_colored_polygon / draw_circle ayrı
## bir çizim çağrısıdır; yüzlerce şekil mobilde kareyi böler. Sıra korunur: flush() çağrıldığı
## noktada çizilir (araya giren metin/doku çizimlerinden önce flush edin).

var V := PackedVector2Array()
var C := PackedColorArray()

func _tri(a: Vector2, b: Vector2, c: Vector2, col: Color) -> void:
	V.append(a); V.append(b); V.append(c)
	C.append(col); C.append(col); C.append(col)

## dışbükey ya da merkezden yıldız biçimli çokgen (ilk noktadan / verilen merkezden yelpaze)
func poly(P: PackedVector2Array, col: Color) -> void:
	for i in range(1, P.size() - 1): _tri(P[0], P[i], P[i + 1], col)

func fan(c: Vector2, P: PackedVector2Array, col: Color) -> void:
	var n := P.size()
	for i in n: _tri(c, P[i], P[(i + 1) % n], col)

func circle(c: Vector2, r: float, col: Color, seg := 0) -> void:
	if seg <= 0: seg = clampi(int(r * 0.9), 6, 28)
	var p0 := c + Vector2(r, 0)
	for i in seg:
		var a := (i + 1) * TAU / seg
		var p1 := c + Vector2(cos(a), sin(a)) * r
		_tri(c, p0, p1, col)
		p0 = p1

func rect(r: Rect2, col: Color, xf := Transform2D.IDENTITY) -> void:
	var a := xf * r.position
	var b := xf * Vector2(r.end.x, r.position.y)
	var c := xf * r.end
	var d := xf * Vector2(r.position.x, r.end.y)
	_tri(a, b, c, col)
	_tri(a, c, d, col)

## dikdörtgen çerçeve (w kalınlığında, içe doğru)
func frame(r: Rect2, col: Color, w: float, xf := Transform2D.IDENTITY) -> void:
	rect(Rect2(r.position, Vector2(r.size.x, w)), col, xf)
	rect(Rect2(Vector2(r.position.x, r.end.y - w), Vector2(r.size.x, w)), col, xf)
	rect(Rect2(Vector2(r.position.x, r.position.y + w), Vector2(w, r.size.y - w * 2.0)), col, xf)
	rect(Rect2(Vector2(r.end.x - w, r.position.y + w), Vector2(w, r.size.y - w * 2.0)), col, xf)

func is_empty() -> bool:
	return V.is_empty()

## ağı kur, ci üstünde çiz (ağ, çizen düğümde canlı tutulur — ComicSkin.draw_tris)
func flush(ci: CanvasItem) -> void:
	if V.size() >= 3: ComicSkin.draw_tris(ci, V, Color.WHITE, C)
	V = PackedVector2Array()
	C = PackedColorArray()
