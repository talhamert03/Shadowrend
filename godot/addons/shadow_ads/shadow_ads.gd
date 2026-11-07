@tool
extends EditorPlugin
## Android dışa aktarımında (gradle derlemesi) ShadowAds AAR'ını (reklam + ShadowPay faturalama),
## Google Mobile Ads + UMP + Play Billing bağımlılıklarını ve AdMob uygulama kimliğini (manifest meta-data) ekler.

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
		var d := PackedStringArray([
			"com.google.android.gms:play-services-ads:23.6.0",
			"com.google.android.ump:user-messaging-platform:3.1.0",
			"com.android.billingclient:billing:8.0.0",
		])
		# Play Games (giriş + bulut kaydı): yalnız Play Console oyun projesi kimliği girilmişse
		if AdIds.GAMES_PROJECT_ID != "": d.append("com.google.android.gms:play-services-games-v2:20.1.2")
		return d

	func _get_android_manifest_application_element_contents(_platform: EditorExportPlatform, _debug: bool) -> String:
		var m := '<meta-data android:name="com.google.android.gms.ads.APPLICATION_ID" android:value="%s"/>\n' % AdIds.APP_ID
		if AdIds.GAMES_PROJECT_ID != "":
			# sayısal kimlik dize olarak okunsun diye başta "\ " kaçışı (Play Games belgesindeki biçim)
			m += '<meta-data android:name="com.google.android.gms.games.APP_ID" android:value="\\ %s"/>\n' % AdIds.GAMES_PROJECT_ID
		return m
