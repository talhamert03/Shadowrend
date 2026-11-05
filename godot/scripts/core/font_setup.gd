class_name FontSetup
extends RefCounted
## Yazı tipi güvenliği (Android donması): bir yazı tipinde OLMAYAN karakter (★ ✓ → ◆ ₺ …) çizilince
## Godot varsayılan olarak cihazın SİSTEM yazı tiplerini tarar. Android'de bu tarama büyük sistem
## yazı tiplerini (CJK vb.) dosyadan açıp tek tek dener; saniyelerce sürer ve bulunamazsa her
## karede tekrarlanır → ekran 15 sn'lik karelerle donar. Burada sistem geri dönüşü TÜM yazı
## tiplerinde kapatılır; eksik semboller oyuna gömülü küçük Symbols.ttf'ten gelir.

const FONTS := [
	"res://assets/fonts/ChakraPetch-Regular.ttf",
	"res://assets/fonts/ChakraPetch-SemiBold.ttf",
	"res://assets/fonts/ChakraPetch-Bold.ttf",
	"res://assets/fonts/Bangers-Regular.ttf",
	"res://assets/fonts/Cinzel.ttf",
	"res://assets/intro/montserrat-latin-600-normal.woff2",
	"res://assets/intro/montserrat-latin-900-normal.woff2",
]
const SYMBOLS := "res://assets/fonts/Symbols.ttf"

static var _done := false
## yazı tipleri burada tutulur: referanssız kalan kaynak önbellekten düşer ve ayarsız yeniden yüklenirdi
static var _keep: Array = []

static func apply() -> void:
	if _done: return
	_done = true
	var sym := load(SYMBOLS) as FontFile
	if sym:
		sym.allow_system_fallback = false
		_keep.append(sym)
	for p in FONTS:
		if not ResourceLoader.exists(p): continue
		var f := load(p) as FontFile
		if f == null: continue
		f.allow_system_fallback = false
		_keep.append(f)
		if sym: _add_fb(f, sym)
	# denetimlerin varsayılan (yazı tipi atanmamış) yazısı da sisteme gitmesin
	var df := ThemeDB.fallback_font
	if df is FontFile:
		(df as FontFile).allow_system_fallback = false
		if sym: _add_fb(df as FontFile, sym)
	elif df is FontVariation and (df as FontVariation).base_font is FontFile:
		((df as FontVariation).base_font as FontFile).allow_system_fallback = false

static func _add_fb(f: Font, sym: Font) -> void:
	var fb: Array[Font] = []
	for x in f.fallbacks: fb.append(x)
	if not fb.has(sym): fb.append(sym)
	f.set_fallbacks(fb)
