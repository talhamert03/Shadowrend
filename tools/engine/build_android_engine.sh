#!/bin/bash
# Shadowrend — yamalı Godot 4.5.1 Android motoru (arm64 + x86_64) derler ve oyunun motor kütüphanesine
# (godot/android/build/libs/release/godot-lib.template_release.aar) yerleştirir.
#
# Neden: Godot 4.5.1'in Android ses sürücüsü (OpenSL ES) yalnız 2 tampon kullanıyor ve kilit
# meşgulse tamponu SESSİZLİKLE dolduruyor (try_lock) → tüm seslerde çıtırtı/cızırtı.
# Yama (opensl_audio.patch): 4 tampon + kilidi bekle. Gecikme ~46 → ~93 ms.
#
# Kullanım:  tools/engine/build_android_engine.sh [çalışma_klasörü]
#   (~1,6 GB indirme: Godot kaynak + NDK r28b + Swappy; 4 çekirdekte mimari başına ~10 dk derleme)
# android/build git'e girmediği için yeni bir makinede sürüm çıkarmadan önce bir kez çalıştırılır;
# tools/release.sh yamasız motorla derlemeyi reddeder.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
W="${1:-/tmp/shadowrend-engine}"; mkdir -p "$W"; cd "$W"
AAR="$ROOT/godot/android/build/libs/release/godot-lib.template_release.aar"
[ -f "$AAR" ] || { echo "önce Godot'ta Android derleme şablonunu kur (Proje → Android Derleme Şablonu Yükle)"; exit 1; }

[ -d godot-4.5.1-stable ] || { curl -fL -o godot.tar.xz https://github.com/godotengine/godot/releases/download/4.5.1-stable/godot-4.5.1-stable.tar.xz && tar -xf godot.tar.xz && rm godot.tar.xz; }
[ -d android-ndk-r28b ] || { curl -fL -o ndk.zip https://dl.google.com/android/repository/android-ndk-r28b-linux.zip && unzip -q ndk.zip && rm ndk.zip; }
mkdir -p ah/ndk && ln -sfn "$W/android-ndk-r28b" ah/ndk/28.1.13356709
SW=godot-4.5.1-stable/thirdparty/swappy-frame-pacing
if [ ! -f "$SW/arm64-v8a/libswappy_static.a" ]; then
	curl -fL -o swappy.7z https://github.com/godotengine/godot-swappy/releases/download/from-source-2025-01-31/godot-swappy.7z
	python3 -m pip install -q py7zr scons
	python3 -c "import py7zr; py7zr.SevenZipFile('swappy.7z').extractall('$SW')"
fi
python3 -m pip install -q scons
cd godot-4.5.1-stable
if ! grep -q "BUFFER_COUNT = 4" platform/android/audio_driver_opensl.h; then
	patch -p1 < "$ROOT/tools/engine/opensl_audio.patch"
fi
[ -f "$W/godot-lib.template_release.official.aar" ] || cp "$AAR" "$W/godot-lib.template_release.official.aar"   # yedek proje DIŞINDA
T="$(mktemp -d)"
# arm64: telefonlar · x86_64: Google Play Games PC (ARM çeviri katmanı olmadan, yerel)
for P in "arm64 arm64-v8a" "x86_64 x86_64"; do
	set -- $P
	ANDROID_HOME="$W/ah" scons platform=android target=template_release arch=$1 production=yes swappy=yes -j"$(nproc)"
	SO=platform/android/java/lib/libs/release/$2/libgodot_android.so
	strings "$SO" | grep -c "4.5.1.stable.custom_build" > /dev/null || { echo "derleme çıktısı beklenen sürüm değil ($2)"; exit 1; }
	mkdir -p "$T/jni/$2"; cp "$SO" "$T/jni/$2/libgodot_android.so"
done
(cd "$T" && zip -q -9 "$AAR" jni/arm64-v8a/libgodot_android.so jni/x86_64/libgodot_android.so)
rm -rf "$T"
echo "== yamalı motor yerleştirildi: $AAR"
