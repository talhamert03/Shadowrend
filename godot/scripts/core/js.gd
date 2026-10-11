class_name JS
## Web oyununun JavaScript anlamlarını GDScript'te birebir korumak için
## küçük yardımcılar. Port boyunca sayı biçimi, yuvarlama ve açı sarma
## gibi davranışlar TEK yerden gelir; böylece "JS'te 5, Godot'ta 5.0"
## türünden sessiz farklar oluşmaz.

const TAU := PI * 2.0

## JS String(number) eşdeğeri: tam sayılar ondalıksız yazılır.
static func s(v) -> String:
	if v is float:
		if is_nan(v): return "NaN"
		if is_inf(v): return "Infinity" if v > 0 else "-Infinity"
		if v == floor(v) and absf(v) < 1e15:
			return str(int(v))
		return str(v)
	return str(v)

## JS Math.round (yarım değerler +∞ yönüne).
static func round_js(v: float) -> float:
	return floor(v + 0.5)

## JS `x | 0` (32 bit tam sayıya kesme, sıfıra doğru).
static func i(v) -> int:
	if v == null: return 0
	if v is bool: return 1 if v else 0
	if v is int: return v
	if v is float:
		if is_nan(v) or is_inf(v): return 0
		return int(v)
	if v is String:
		return int(v.to_float()) if v.is_valid_float() else 0
	return 0

## JS doğruluk testi (0, "", null, NaN, false → yanlış).
static func truthy(v) -> bool:
	if v == null: return false
	match typeof(v):
		TYPE_BOOL: return v
		TYPE_INT: return v != 0
		TYPE_FLOAT: return v != 0.0 and not is_nan(v)
		TYPE_STRING, TYPE_STRING_NAME: return v != ""
	return true

## JS `a || b` için sayı okuma: alan yoksa ya da yanlışsa varsayılan.
static func num(d, key, def: float = 0.0) -> float:
	if d == null: return def
	var v = d.get(key) if d is Dictionary else d.get(key)
	if v == null: return def
	if v is bool: return 1.0 if v else 0.0
	if (v is float or v is int) and v != 0: return float(v)
	return def

## Sözlükten (ya da nesneden) alan oku; yoksa null.
static func g(d, key, def = null):
	if d == null: return def
	if d is Dictionary:
		return d.get(key, def)
	var v = d.get(key)
	return def if v == null else v

## Açıyı -π..π aralığına sarar (JS while döngüsü ile aynı sonuç).
static func wrap_pi(a: float) -> float:
	while a > PI: a -= TAU
	while a < -PI: a += TAU
	return a

static func hypot(x: float, y: float) -> float:
	return sqrt(x * x + y * y)

## Derin kopya (JSON.parse(JSON.stringify(x)) eşdeğeri).
static func clone(v):
	if v is Dictionary or v is Array:
		return v.duplicate(true)
	return v

## '#rrggbb' / 'rgba(r,g,b,a)' / 'rgb(...)' → Color. Önbellekli (perf.js hexOf kuralı).
static var _col_cache := {}
static func col(c) -> Color:
	if c is Color: return c
	if c == null: return Color.WHITE
	if c is int: return Color.hex((c << 8) | 0xff)
	var k: String = c
	if _col_cache.has(k): return _col_cache[k]
	var out := Color.WHITE
	var t := k.strip_edges()
	if t.begins_with("#"):
		var h := t.substr(1)
		if h.length() == 3:
			h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2]
		if h.length() == 6:
			out = Color.html("#" + h)
		elif h.length() == 8:
			out = Color.html("#" + h)
	elif t.begins_with("rgb"):
		var a := t.find("(")
		var b := t.rfind(")")
		var parts := t.substr(a + 1, b - a - 1).split(",")
		var r := parts[0].strip_edges().to_float() / 255.0
		var gg := parts[1].strip_edges().to_float() / 255.0
		var bb := parts[2].strip_edges().to_float() / 255.0
		var al := 1.0
		if parts.size() > 3: al = parts[3].strip_edges().to_float()
		out = Color(r, gg, bb, al)
	_col_cache[k] = out
	return out

## '#rrggbb' → 0xRRGGBB tamsayı (three.js hex dili).
static func hexi(c) -> int:
	var co := col(c)
	return (int(round(co.r * 255)) << 16) | (int(round(co.g * 255)) << 8) | int(round(co.b * 255))

## 0xRRGGBB → Color (sRGB).
static func hexc(h: int) -> Color:
	return Color8((h >> 16) & 255, (h >> 8) & 255, h & 255)

## Diziyi yerinde karıştırır (JS Fisher-Yates ile aynı).
static func shuffle(a: Array) -> Array:
	var i := a.size() - 1
	while i > 0:
		var j := int(randf() * (i + 1))
		var t = a[i]; a[i] = a[j]; a[j] = t
		i -= 1
	return a

## Rastgele eleman (Math.random()*n | 0).
static func pick(a: Array):
	if a.is_empty(): return null
	return a[int(randf() * a.size())]

## Bit sayımı (popcount).
static func bits(m: int) -> int:
	var c := 0
	var b := m
	while b != 0:
		b &= b - 1
		c += 1
	return c
