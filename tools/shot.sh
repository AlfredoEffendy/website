#!/usr/bin/env bash
# Full-page capture with headless Chrome: shot.sh <path> <name> [width] [height] [extra chrome flags]
# SHOT_DIR = output folder (default /tmp); SHOT_PORT = preview port (default 4173).
OUT="${SHOT_DIR:-/tmp}"
"/c/Program Files (x86)/Google/Chrome/Application/chrome.exe" --headless=new --disable-gpu --hide-scrollbars \
  --force-device-scale-factor=1 --window-size="${3:-1280},${4:-2700}" --virtual-time-budget=4000 ${5:-} \
  --screenshot="$(cygpath -w "$OUT/$2.png")" "http://localhost:${SHOT_PORT:-4173}/$1" >/dev/null 2>&1
echo "$OUT/$2.png"
