#!/bin/bash
# Godot Android derleme şablonunu (android/build, depoda yok) kurar ve Gradle'ı 8.7'ye çeker
# (şablondaki 8.2, JDK 17 dışında çalışmıyor; 8.7 hem 17 hem 21 ile çalışır).
# Dışa aktarım: editör ayarlarında java_sdk_path = JDK 17, export_presets'te use_gradle_build=true.
set -e
cd "$(dirname "$0")/../.."
T="$HOME/.local/share/godot/export_templates/4.4.1.stable"
mkdir -p android/build
unzip -o -q "$T/android_source.zip" -d android/build
cat "$T/version.txt" > android/.build_version
touch android/build/.gdignore
sed -i 's#distributionUrl=.*#distributionUrl=https\\://services.gradle.org/distributions/gradle-8.7-bin.zip#' android/build/gradle/wrapper/gradle-wrapper.properties
echo "android/build hazır"
