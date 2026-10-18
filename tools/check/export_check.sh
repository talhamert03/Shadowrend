#!/bin/bash
# Dışa aktarılan paketi (Android ön ayarının dosya filtreleriyle) masaüstünde açıp betik hatası arar.
# Editörde derlenen ama pakete girmeyen (ör. exclude_filter'daki bir class_name) betikleri yakalar.
# Kullanım: tools/check/export_check.sh <godot ikili> [çalışma sn]
set -u
G="$1"; SECS="${2:-20}"
ROOT="$(cd "$(dirname "$0")/../.." && pwd)/godot"
OUT="$(mktemp -d)"
cd "$ROOT" || exit 2
timeout 1800 "$G" --headless --path . --export-pack Android "$OUT/game.pck" > "$OUT/export.log" 2>&1 || { echo "DIŞA AKTARMA BAŞARISIZ"; tail -20 "$OUT/export.log"; exit 1; }
cd "$OUT" || exit 2
timeout $((SECS + 60)) "$G" --headless --main-pack "$OUT/game.pck" --quit-after $((SECS * 60)) > "$OUT/run.log" 2>&1
ERR=$(grep -E "SCRIPT ERROR|Parse Error|Failed to load script" "$OUT/run.log" | sort -u | head -20)
if [ -n "$ERR" ]; then echo "PAKET HATALI:"; echo "$ERR"; exit 1; fi
echo "PAKET TEMİZ ($(du -h "$OUT/game.pck" | cut -f1))"
rm -rf "$OUT"
