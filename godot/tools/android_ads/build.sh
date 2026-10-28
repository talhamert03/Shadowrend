#!/bin/bash
# AAR'ı derle ve addons'a kopyala. JAVA_HOME = JDK 17, GRADLE = gradle 8.7 ikilisi
set -e
cd "$(dirname "$0")"
"${GRADLE:-gradle}" --no-daemon -q assembleRelease
cp build/outputs/aar/ShadowAds-release.aar ../../addons/shadow_ads/android/ShadowAds.aar
echo "ShadowAds.aar hazır"
