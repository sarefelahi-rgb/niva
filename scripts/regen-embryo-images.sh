#!/usr/bin/env bash
# Regenerate the early embryonic keyframes with strict developmental staging.
set -u
OUT="/home/z/my-project/public/images/fetal"
mkdir -p "$OUT"

STYLE="photorealistic medical 3D visualization, deep warm rose-red environment, cinematic warm rim light from upper left, subsurface scattering skin, shallow depth of field, scientific documentary style, ultra detailed, high quality, centered composition"

gen() { # week prompt
  local w="$1"; local p="$2"
  local f="$OUT/w$(printf '%02d' "$w").png"
  rm -f "$f.tmp"
  for attempt in 1 2 3; do
    echo "regen w$w attempt $attempt..."
    z-ai image -p "$p, $STYLE" -o "$f.tmp" -s 1344x768 && [ -s "$f.tmp" ] && { mv "$f.tmp" "$f"; echo "ok w$w"; return 0; }
    sleep 3
  done
  rm -f "$f.tmp"; echo "FAIL w$w"; return 1
}

gen 4 "a tiny translucent human embryo at four weeks of gestation, small curved comma-shaped germ disc with a prominent yolk sac and embryonic tail bud, no arms, no legs, no face, no fingers, microscopic magnified view shown beside a grain of white rice for scale"
gen 6 "a small translucent reddish human embryo at six weeks of gestation, strongly C-curved body with a large cephalic region, row of somites along the back, tiny paddle-shaped arm buds, short visible natural tail, no fingers, no toes, no distinct face, magnified view with a grain of white rice beside it for scale"

echo "DONE"
