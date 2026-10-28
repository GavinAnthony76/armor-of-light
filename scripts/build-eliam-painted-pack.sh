#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
SRC="$ROOT/generated-artifacts/eliam-body-idle-clean.png"
BASE="$ROOT/generated-artifacts/eliam-body-source-cell.png"
magick "$SRC" \( -size 1024x1024 xc:none -fill white -draw \
  'polygon 326,267 356,263 384,274 405,300 421,334 421,367 405,390 378,403 326,399 polygon 588,278 610,280 627,300 640,329 646,355 642,377 622,387 602,371 593,347 585,326' \) \
  -compose DstOut -composite -compose over -trim +repage -resize '120x256>' \
  -gravity south -background none -extent 120x256 "$TMP/body.png"
magick -size 512x512 xc:red -alpha set -channel A -evaluate set 0 +channel "$TMP/cell.png"
magick "$TMP/cell.png" "$TMP/body.png" -geometry +196+192 -compose over -composite "$BASE"
cd "$ROOT"
node --import tsx scripts/sample-eliam-poses.ts > generated-artifacts/eliam-pose-samples.json
node --import tsx scripts/render-eliam-painted-pack.mjs
