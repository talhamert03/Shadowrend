#!/bin/bash
# Godot Android derleme şablonunu (android/build, depoda yok) kurar ve Google Play'in güncel
# şartlarına çeker: hedef/derleme SDK 36 (Android 16), AGP 8.13.2, Kotlin 2.4.21, Gradle 9.5.1.
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
sed -i "s/androidGradlePlugin: '[^']*'/androidGradlePlugin: '8.13.2'/; s/kotlinVersion      : '[^']*'/kotlinVersion      : '2.4.21'/; s/compileSdk         : [0-9]*/compileSdk         : 36/; s/targetSdk          : [0-9]*/targetSdk          : 36/; s/buildTools         : '[^']*'/buildTools         : '36.0.0'/" $C
# Gradle 9.5.1: Java 17–25 ile çalışır (Android Studio'nun JBR 25'i dahil). 9.6+ AGP 8.x ile uyumsuz.
sed -i 's#distributionUrl=.*#distributionUrl=https\\://services.gradle.org/distributions/gradle-9.5.1-bin.zip#' android/build/gradle/wrapper/gradle-wrapper.properties
grep -E "androidGradlePlugin|kotlinVersion|compileSdk |targetSdk |buildTools" $C
grep distributionUrl android/build/gradle/wrapper/gradle-wrapper.properties
echo "android/build hazır"
