#!/bin/bash
# Godot Android derleme şablonunu (android/build, depoda yok) kurar ve Google Play'in güncel
# şartlarına çeker: hedef/derleme SDK 36 (Android 16), AGP 8.9.1 (SDK 36 desteği).
# Godot 4.5.1 şablonu 16 KB sayfa hizalı (Play şartı). Dışa aktarım: JDK 17, use_gradle_build=true.
set -e
cd "$(dirname "$0")/../.."
T="$HOME/.local/share/godot/export_templates/4.5.1.stable"
rm -rf android/build
mkdir -p android/build
unzip -o -q "$T/android_source.zip" -d android/build
cat "$T/version.txt" > android/.build_version
touch android/build/.gdignore
C=android/build/config.gradle
sed -i "s/androidGradlePlugin: '[^']*'/androidGradlePlugin: '8.9.1'/; s/compileSdk         : [0-9]*/compileSdk         : 36/; s/targetSdk          : [0-9]*/targetSdk          : 36/; s/buildTools         : '[^']*'/buildTools         : '36.0.0'/" $C
grep -E "androidGradlePlugin|compileSdk |targetSdk |buildTools" $C
echo "android/build hazır"
