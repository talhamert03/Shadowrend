#!/bin/bash
# Android Studio projesi üretir (Generate Signed Bundle için). Önce Godot 4.5.1 ile AAB dışa
# aktarımı yapılmış olmalı (android/build içerik ve release manifestiyle dolu olur):
#   godot --headless --path . --export-release Android build/Shadowrend-X.aab
# Kullanım: make_studio_project.sh <hedef_klasör>
# Godot'nun gradle'a komut satırından verdiği ayarlar gradle.properties'e sabitlenir.
set -e
cd "$(dirname "$0")/../.."
OUT="$1"
[ -z "$OUT" ] && { echo "hedef klasör ver"; exit 1; }
VC=$(grep -oP '^version/code=\K[0-9]+' export_presets.cfg)
VN=$(grep -oP '^version/name="\K[^"]+' export_presets.cfg)
PKG=$(grep -oP '^package/unique_name="\K[^"]+' export_presets.cfg)
TS=$(grep -oP '^gradle_build/target_sdk="\K[^"]+' export_presets.cfg)
MS=$(grep -oP '^gradle_build/min_sdk="\K[^"]+' export_presets.cfg)
rm -rf "$OUT"; mkdir -p "$OUT"
( cd android/build && tar --exclude='./build' --exclude='./.gradle' --exclude='./local.properties' \
    --exclude='./.gdignore' --exclude='./src/debug' --exclude='./libs/debug' --exclude='./libs/dev' -cf - . ) | tar -xf - -C "$OUT"
mkdir -p "$OUT/plugins"
cp addons/shadow_ads/android/ShadowAds.aar "$OUT/plugins/"
DEPS=$(grep -oP '"\K[a-z.]+:[a-z-]+:[0-9.]+(?=")' addons/shadow_ads/shadow_ads.gd | paste -sd'|')
cat >> "$OUT/gradle.properties" <<PROPS

# ── Shadowrend: Godot dışa aktarımının komut satırından verdiği ayarlar (Android Studio için sabit) ──
export_package_name=$PKG
export_version_code=$VC
export_version_name=$VN
export_version_min_sdk=$MS
export_version_target_sdk=$TS
export_enabled_abis=arm64-v8a
export_edition=standard
export_build_type=release
export_format=aab
godot_editor_version=4.5.1.stable
godot_rendering_method=gl_compatibility
plugins_remote_binaries=$DEPS
plugins_local_binaries=plugins/ShadowAds.aar
PROPS
cp tools/android_ads/STUDIO_README.txt "$OUT/OKU_BENI.txt"
echo "Android Studio projesi: $OUT ($PKG $VN / $VC)"
