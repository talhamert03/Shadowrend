class_name ArenaData
## arenaMaps.js bakeArenaMap çıktısı — tools/bake ile dışa aktarılan yerleşim
## (engeller · süsler · fx · açıklıklar). Her dünya kendi haritasını taşır.

static var _cache := {}

static func layout(world_id: int) -> Dictionary:
	var k := clampi(world_id, 1, 10)
	if _cache.has(k): return _cache[k]
	var f := FileAccess.open("res://assets/arena/w%d/layout.json" % k, FileAccess.READ)
	var d = JSON.parse_string(f.get_as_text()) if f else null
	if not (d is Dictionary): d = {"mapId": "mezarlik", "props": [], "decor": [], "fx": []}
	_cache[k] = d
	return d
