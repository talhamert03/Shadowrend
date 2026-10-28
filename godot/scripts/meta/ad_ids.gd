class_name AdIds
extends RefCounted
## AdMob kimlikleri. TEST = true iken Google'ın resmî test kimlikleri kullanılır (gerçek reklam
## gelmez, hesabın askıya alınma riski yoktur). Gerçek kimlikler AdMob panelinden gelince
## REAL_* doldurulur ve TEST = false yapılır.

const TEST := false

## kendi telefonunda gerçek kimliklerle denerken: logcat'te "Use RequestConfiguration...
## setTestDeviceIds(Arrays.asList("…"))" satırındaki kimlik
const TEST_DEVICE := ""

const REAL_APP_ID := "ca-app-pub-1770141144744598~2103434988"
const REAL_UNITS := {
	"magaza_sandik": "ca-app-pub-1770141144744598/2965924667",
	"sandik_hizlandir": "ca-app-pub-1770141144744598/2774352971",
	"dirilis": "ca-app-pub-1770141144744598/3895862956",
}

const TEST_APP_ID := "ca-app-pub-3940256099942544~3347511713"
const TEST_REWARDED := "ca-app-pub-3940256099942544/5224354917"

const APP_ID := TEST_APP_ID if TEST or REAL_APP_ID == "" else REAL_APP_ID

static func unit(placement: String) -> String:
	var u: String = REAL_UNITS.get(placement, "")
	return TEST_REWARDED if TEST or u == "" else u

static func placements() -> Array:
	return REAL_UNITS.keys()
