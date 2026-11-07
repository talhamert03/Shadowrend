#!/bin/bash
# Shadowrend sürüm çıkarma — tek komut:
#   tools/release.sh 1.0.75            → sürümü 1.0.75 yapar (kod +1), APK + Android Studio zip'i
#                                         + Windows zip'i üretir, gofile'a yükler, linkleri yazar
#   tools/release.sh 1.0.75 --no-pc    → Windows sürümünü atla
#   tools/release.sh 1.0.75 --no-upload→ yalnız derle (zip'ler $OUT içinde kalır)
# Gerekli ortam değişkenleri (anahtarlar depoya girmez):
#   GODOT      Godot 4.5.1 editör ikilisi            KEYSTORE / KS_USER / KS_PASS  imza anahtarı
#   APKSIGNER  (isteğe bağlı) apksigner yolu          OUT  çıktı klasörü (varsayılan /tmp/shadowrend-dist)
set -euo pipefail
V="${1:?kullanım: tools/release.sh <sürüm> [--no-pc] [--no-upload]}"; shift
PC=1; UP=1
for a in "$@"; do case "$a" in --no-pc) PC=0;; --no-upload) UP=0;; esac; done
: "${GODOT:?GODOT ayarla}" "${KEYSTORE:?KEYSTORE ayarla}" "${KS_USER:?}" "${KS_PASS:?}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"; G="$ROOT/godot"; OUT="${OUT:-/tmp/shadowrend-dist}"
mkdir -p "$OUT"; rm -f "$OUT"/*.zip
cd "$G"
run() { timeout 2400 xvfb-run -a "$GODOT" --headless --path . "$@" > "$OUT/godot.log" 2>&1; rm -f .godot/imported/*-??????; }

# 1) sürüm numarası (kod +1)
CODE=$(( $(grep -m1 '^version/code=' export_presets.cfg | cut -d= -f2) + 1 ))
sed -i "0,/^version\/code=.*/s//version\/code=$CODE/; 0,/^version\/name=.*/s//version\/name=\"$V\"/" export_presets.cfg
sed -i "s/^config\/version=.*/config\/version=\"$V\"/" project.godot
sed -i "s/^application\/file_version=.*/application\/file_version=\"$V.0\"/; s/^application\/product_version=.*/application\/product_version=\"$V.0\"/" export_presets.cfg
echo "== sürüm $V (kod $CODE)"

# 2) imzalı APK (dışa aktarım ayarı geçici olarak APK/imzalı yapılır, sonra geri alınır)
cp export_presets.cfg "$OUT/presets.bak"; trap 'cp "$OUT/presets.bak" "$G/export_presets.cfg"' EXIT
sed -i '0,/export_format=1/s//export_format=0/; 0,/package\/signed=false/s//package\/signed=true/' export_presets.cfg
export GODOT_ANDROID_KEYSTORE_RELEASE_PATH="$KEYSTORE" GODOT_ANDROID_KEYSTORE_RELEASE_USER="$KS_USER" GODOT_ANDROID_KEYSTORE_RELEASE_PASSWORD="$KS_PASS"
mkdir -p build; rm -f build/*.apk build/*.aab
run --export-release Android "build/Shadowrend-$V.apk"
cp "$OUT/presets.bak" export_presets.cfg
[ -n "${APKSIGNER:-}" ] && "$APKSIGNER" verify "build/Shadowrend-$V.apk" 2>/dev/null && echo "== APK imzalı"

# 3) Android Studio projesi (Gradle dışa aktarımı android/build'i doldurur)
rm -rf android/build/build android/build/.gradle
run --export-release Android "build/Shadowrend-$V.aab"; rm -f "build/Shadowrend-$V.aab"
rm -rf android/build/build android/build/.gradle
python3 - "$ROOT" "$V" "$CODE" "$OUT" <<'EOF'
import os,sys,zipfile
root,V,code,out=sys.argv[1:]
B=root+'/godot/android/build'; top='Shadowrend_AndroidStudio_'+V
props=f"""# ── Shadowrend: Godot dışa aktarımının komut satırından verdiği ayarlar (Android Studio için sabit) ──
export_package_name=com.alphagames.shadowrend
export_version_code={code}
export_version_name={V}
export_version_min_sdk=24
export_version_target_sdk=36
export_enabled_abis=arm64-v8a
export_edition=standard
export_build_type=release
export_format=aab
godot_editor_version=4.5.1.stable
godot_rendering_method=gl_compatibility
plugins_remote_binaries=com.google.android.gms:play-services-ads:23.6.0|com.google.android.ump:user-messaging-platform:3.1.0|com.android.billingclient:billing:8.0.0|com.google.android.gms:play-services-games-v2:20.1.2
plugins_local_binaries=plugins/ShadowAds.aar
"""
STORE=('.pck','.sparsepck','.ogg','.png','.webp','.jpg','.aar','.jar','.glb','.wav','.scn','.ctex','.res','.sample')
with zipfile.ZipFile(f'{out}/Shadowrend_{V}.zip','w',zipfile.ZIP_DEFLATED,compresslevel=6,allowZip64=True) as z:
    z.write(f'{root}/godot/build/Shadowrend-{V}.apk',f'Shadowrend-{V}.apk',compress_type=zipfile.ZIP_STORED)
    for r,dirs,files in os.walk(B):
        rel=os.path.relpath(r,B)
        dirs[:]=[d for d in dirs if not (rel=='.' and d in ('build','.gradle'))]
        for f in files:
            if rel=='.' and f in ('local.properties','.gdignore'): continue
            p=os.path.join(r,f); arc=os.path.normpath(os.path.join(top,rel,f))
            if rel=='.' and f=='gradle.properties': z.writestr(arc,open(p).read().rstrip('\n')+'\n\n'+props); continue
            z.write(p,arc,compress_type=zipfile.ZIP_STORED if f.endswith(STORE) else zipfile.ZIP_DEFLATED)
    z.write(f'{root}/godot/addons/shadow_ads/android/ShadowAds.aar',top+'/plugins/ShadowAds.aar')
    z.write(f'{root}/tools/release/OKU_BENI_android.txt',top+'/OKU_BENI.txt')
print('== Android zip:',out+f'/Shadowrend_{V}.zip')
EOF

# 4) Windows sürümü
if [ $PC = 1 ]; then
  rm -rf build/windows; mkdir -p build/windows
  run --export-release Windows build/windows/Shadowrend.exe
  sed "s/{V}/$V/" "$ROOT/tools/release/OKU_BENI_pc.txt" > build/windows/OKU_BENI.txt
  (cd build/windows && zip -q -0 "$OUT/Shadowrend_PC_$V.zip" Shadowrend.exe Shadowrend.pck OKU_BENI.txt)
  echo "== PC zip: $OUT/Shadowrend_PC_$V.zip"
fi
rm -f "build/Shadowrend-$V.apk"

# 5) gofile'a yükle ve linkleri yaz
if [ $UP = 1 ]; then
  for f in "$OUT"/*.zip; do
    curl -sS -m 3600 -F "file=@$f" https://upload.gofile.io/uploadfile | python3 -c "import json,sys;d=json.load(sys.stdin)['data'];print('== LINK',d['name'],d['downloadPage'])"
  done
fi
echo "== bitti: sürüm $V"
