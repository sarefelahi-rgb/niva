/**
 * NIVA parametric embryology engine — stage proportion tables.
 *
 * The model is a SCHEMATIC EDUCATIONAL visualization driven by per-week anatomical
 * proportion keyframes (head/body ratio, spinal curl, limb development, placenta
 * growth). It is NOT a scan reconstruction and makes no diagnostic claim.
 * See docs/05-3d-asset-spec.md for the scientific integrity rules and the future
 * Blender→glTF pipeline for clinically reviewed assets.
 */

export interface StageParams {
  scale: number;       // overall body scale (relative unit sphere)
  headRatio: number;   // head radius / torso length (large in early weeks, decreases)
  curl: number;        // spinal curl radians (large early, straightens later)
  limb: number;        // limb length factor (0 = limb buds absent)
  limbWidth: number;   // limb thickness factor
  eye: number;         // eye prominence (relative)
  cord: number;        // umbilical cord length factor
  placenta: number;    // placenta radius factor
  uterus: number;      // uterine cavity radius factor
}

// Keyframes derived from standard human embryology proportion references (educational).
export const STAGE_KEYFRAMES: Array<{ week: number; p: StageParams }> = [
  { week: 4,  p: { scale: 0.06, headRatio: 0.50, curl: 1.60, limb: 0.00, limbWidth: 0.00, eye: 0.35, cord: 0.50, placenta: 0.40, uterus: 0.95 } },
  { week: 6,  p: { scale: 0.10, headRatio: 0.55, curl: 1.50, limb: 0.08, limbWidth: 0.20, eye: 0.42, cord: 0.60, placenta: 0.45, uterus: 0.95 } },
  { week: 8,  p: { scale: 0.16, headRatio: 0.60, curl: 1.30, limb: 0.18, limbWidth: 0.35, eye: 0.46, cord: 0.70, placenta: 0.50, uterus: 0.98 } },
  { week: 10, p: { scale: 0.24, headRatio: 0.58, curl: 1.00, limb: 0.30, limbWidth: 0.50, eye: 0.40, cord: 0.80, placenta: 0.55, uterus: 1.00 } },
  { week: 12, p: { scale: 0.32, headRatio: 0.52, curl: 0.75, limb: 0.40, limbWidth: 0.60, eye: 0.35, cord: 0.90, placenta: 0.60, uterus: 1.04 } },
  { week: 16, p: { scale: 0.45, headRatio: 0.42, curl: 0.50, limb: 0.52, limbWidth: 0.70, eye: 0.30, cord: 1.00, placenta: 0.66, uterus: 1.10 } },
  { week: 20, p: { scale: 0.58, headRatio: 0.36, curl: 0.40, limb: 0.62, limbWidth: 0.80, eye: 0.26, cord: 1.10, placenta: 0.72, uterus: 1.18 } },
  { week: 24, p: { scale: 0.70, headRatio: 0.32, curl: 0.32, limb: 0.70, limbWidth: 0.88, eye: 0.24, cord: 1.20, placenta: 0.78, uterus: 1.28 } },
  { week: 28, p: { scale: 0.80, headRatio: 0.30, curl: 0.28, limb: 0.78, limbWidth: 0.95, eye: 0.22, cord: 1.30, placenta: 0.84, uterus: 1.38 } },
  { week: 32, p: { scale: 0.88, headRatio: 0.28, curl: 0.25, limb: 0.85, limbWidth: 1.00, eye: 0.20, cord: 1.40, placenta: 0.90, uterus: 1.48 } },
  { week: 36, p: { scale: 0.95, headRatio: 0.27, curl: 0.22, limb: 0.92, limbWidth: 1.05, eye: 0.19, cord: 1.50, placenta: 0.95, uterus: 1.58 } },
  { week: 40, p: { scale: 1.00, headRatio: 0.26, curl: 0.20, limb: 0.97, limbWidth: 1.10, eye: 0.18, cord: 1.60, placenta: 1.00, uterus: 1.68 } },
];

export const STAGE_WEEKS = STAGE_KEYFRAMES.map((k) => k.week);

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Smoothly interpolates anatomical proportions for any gestational week 4–40. */
export function paramsForWeek(week: number): StageParams {
  const w = Math.min(Math.max(week, 4), 40);
  for (let i = 0; i < STAGE_KEYFRAMES.length - 1; i++) {
    const a = STAGE_KEYFRAMES[i];
    const b = STAGE_KEYFRAMES[i + 1];
    if (w >= a.week && w <= b.week) {
      const t = (w - a.week) / (b.week - a.week);
      return {
        scale: lerp(a.p.scale, b.p.scale, t),
        headRatio: lerp(a.p.headRatio, b.p.headRatio, t),
        curl: lerp(a.p.curl, b.p.curl, t),
        limb: lerp(a.p.limb, b.p.limb, t),
        limbWidth: lerp(a.p.limbWidth, b.p.limbWidth, t),
        eye: lerp(a.p.eye, b.p.eye, t),
        cord: lerp(a.p.cord, b.p.cord, t),
        placenta: lerp(a.p.placenta, b.p.placenta, t),
        uterus: lerp(a.p.uterus, b.p.uterus, t),
      };
    }
  }
  return STAGE_KEYFRAMES[STAGE_KEYFRAMES.length - 1].p;
}

/** Anatomical hotspot anchors in model space (recomputed from params). */
export function hotspotPositions(p: StageParams): Record<string, [number, number, number]> {
  const torsoLen = p.scale * 1.05;
  const headR = p.headRatio * torsoLen;
  const headY = torsoLen * 0.62 * Math.cos(p.curl * 0.45) + headR * 0.75;
  const headZ = torsoLen * 0.62 * Math.sin(p.curl * 0.45);
  const torsoY = 0;
  return {
    brain: [headZ * 0.4, headY + headR * 0.45, headR * 0.35],
    heart: [0, torsoY + torsoLen * 0.18, torsoLen * 0.22],
    cord: [0, torsoY - torsoLen * 0.28, torsoLen * 0.5],
    placenta: [0, p.uterus * 0.55, -p.uterus * 0.62],
  };
}
