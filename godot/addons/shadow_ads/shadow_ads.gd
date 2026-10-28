@tool
extends EditorPlugin
## Android dışa aktarımında (gradle derlemesi) ShadowAds AAR'ını, Google Mobile Ads + UMP
## bağımlılıklarını ve AdMob uygulama kimliğini (manifest meta-data) ekler.

var _exp: AdsExport

func _enter_tree() -> void:
	_exp = AdsExport.new()
	add_export_plugin(_exp)

func _exit_tree() -> void:
	remove_export_plugin(_exp)
	_exp = null

class AdsExport extends EditorExportPlugin:
	func _get_name() -> String:
		return "ShadowAds"

	func _supports_platform(platform: EditorExportPlatform) -> bool:
		return platform is EditorExportPlatformAndroid

	func _get_android_libraries(_platform: EditorExportPlatform, _debug: bool) -> PackedStringArray:
		return PackedStringArray(["shadow_ads/android/ShadowAds.aar"])

	func _get_android_dependencies(_platform: EditorExportPlatform, _debug: bool) -> PackedStringArray:
		return PackedStringArray([
			"com.google.android.gms:play-services-ads:23.6.0",
			"com.google.android.ump:user-messaging-platform:3.1.0",
		])

	func _get_android_manifest_application_element_contents(_platform: EditorExportPlatform, _debug: bool) -> String:
		return '<meta-data android:name="com.google.android.gms.ads.APPLICATION_ID" android:value="%s"/>\n' % AdIds.APP_ID
