#!/usr/bin/env bash
# NIVA fetal-growth studio — generates the 13-stage photorealistic image series.
# Consistent prompt skeleton keeps camera, lighting and palette aligned across
# stages so the studio reads as one continuous growth sequence.
set -u
OUT="/home/z/my-project/public/images/fetal"
mkdir -p "$OUT"

STYLE="photorealistic medical 3D visualization inside the human womb, deep warm rose-red uterine environment with softly glowing translucent amniotic fluid, cinematic warm rim light from upper left, subsurface scattering skin, shallow depth of field, scientific documentary style, ultra detailed, high quality, centered composition"

gen() { # week prompt
  local w="$1"; local p="$2"
  local f="$OUT/w$(printf '%02d' "$w").png"
  if [ -s "$f" ]; then echo "skip w$w (exists)"; return 0; fi
  for attempt in 1 2 3; do
    echo "gen w$w attempt $attempt..."
    z-ai image -p "$p, $STYLE" -o "$f" -s 1344x768 && [ -s "$f" ] && { echo "ok w$w"; return 0; }
    sleep 3
  done
  echo "FAIL w$w"; return 1
}

gen 3  "a human blastocyst implanting into the uterine lining, a cluster of dozens of dividing cells with a glowing inner cell mass, magnified microscopic view, no baby yet"
gen 4  "a tiny curled human embryo at week four, flat embryonic disc with a small yolk sac and early amniotic cavity, magnified view, no limbs yet"
gen 6  "a small curled human embryo at week six with a visible natural tail, beating heart bulge and tiny limb buds, disproportionately large head, magnified view"
gen 8  "a curled human embryo at week eight with webbed hands and feet, large forehead, visible thin umbilical cord, natural C-shaped pose"
gen 10 "a small human fetus at week ten in a curled pose, distinct separated fingers and toes, clear facial profile with closed eyes, thin umbilical cord"
gen 12 "a human fetus at week twelve in a natural curled pose, fully formed profile with closed eyes, separated fingers, umbilical cord and partial placenta visible"
gen 16 "a human fetus at week sixteen, thin limbs and translucent skin, curled pose with closed eyes, forming eyebrows, umbilical cord looped nearby"
gen 20 "a human fetus at week twenty with fine lanugo hair and eyebrows, sucking its thumb in a curled pose, closed eyes, umbilical cord visible"
gen 24 "a human fetus at week twenty-four with wrinkled translucent reddish skin and fused closed eyelids, curled pose, umbilical cord across the frame"
gen 28 "a human fetus at week twenty-eight, plumper body with slightly open eyes, curled pose, more fat under the skin, umbilical cord visible"
gen 32 "a plump human fetus at week thirty-two with open eyes and well-formed limbs, curled pose, soft lighting through the amniotic fluid"
gen 36 "a nearly full-term human fetus at week thirty-six, plump rosy skin, head-down curled pose, compressed limbs, ready for birth"
gen 40 "a full-term human baby at week forty in the womb, curled head-down pose with limbs tucked, plump natural skin, the cervix below as a soft dark opening"

echo "DONE"
