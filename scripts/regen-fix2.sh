#!/usr/bin/env bash
# Second-pass fixes: w04 (faceless germ disc) + w40 (must stay in the womb).
set -u
OUT="/home/z/my-project/public/images/fetal"

STYLE="photorealistic medical 3D visualization, deep warm rose-red environment, cinematic warm rim light from upper left, subsurface scattering skin, shallow depth of field, scientific documentary style, ultra detailed, high quality, centered composition"

gen() { # week filename prompt
  local w="$1"; local f="$2"; local p="$3"
  local dst="$OUT/$f"
  rm -f "$OUT/tmp.png"
  for attempt in 1 2 3; do
    echo "regen w$w attempt $attempt..."
    z-ai image -p "$p, $STYLE" -o "$OUT/tmp.png" -s 1344x768 && [ -s "$OUT/tmp.png" ] && { mv "$OUT/tmp.png" "$dst"; echo "ok w$w"; return 0; }
    sleep 3
  done
  rm -f "$OUT/tmp.png"; echo "FAIL w$w"; return 1
}

gen 4 "w04.png" "a rice-grain-sized human conceptus one month after fertilization, a tiny translucent curved comma-like shape with a visible round yolk sac and amniotic membrane, completely featureless smooth surface with no recognizable head or limbs, extreme macro view beside a grain of white rice for scale"
gen 40 "w40.png" "a full-term fetus still inside the womb at the end of pregnancy, tightly curled head-down position seen through the translucent amniotic sac inside the muscular uterine wall, umbilical cord wrapped nearby, soft glow through the tissue"

echo "DONE"
