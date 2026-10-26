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
  { week: 6,  p: { scale: 0.10, headRatio: 0.55, curl: 1.50, limb: 0.10, limbWidth: 0.22, eye: 0.42, cord: 0.60, placenta: 0.45, uterus: 0.95 } },
  { week: 8,  p: { scale: 0.16, headRatio: 0.60, curl: 1.30, limb: 0.22, limbWidth: 0.38, eye: 0.46, cord: 0.70, placenta: 0.50, uterus: 0.98 } },
  { week: 10, p: { scale: 0.24, headRatio: 0.58, curl: 1.00, limb: 0.38, limbWidth: 0.52, eye: 0.40, cord: 0.80, placenta: 0.55, uterus: 1.00 } },
  { week: 12, p: { scale: 0.32, headRatio: 0.52, curl: 0.75, limb: 0.55, limbWidth: 0.62, eye: 0.35, cord: 0.90, placenta: 0.60, uterus: 1.04 } },
  { week: 16, p: { scale: 0.45, headRatio: 0.42, curl: 0.50, limb: 0.72, limbWidth: 0.72, eye: 0.30, cord: 1.00, placenta: 0.66, uterus: 1.10 } },
  { week: 20, p: { scale: 0.58, headRatio: 0.36, curl: 0.40, limb: 0.82, limbWidth: 0.82, eye: 0.26, cord: 1.10, placenta: 0.72, uterus: 1.18 } },
  { week: 24, p: { scale: 0.70, headRatio: 0.32, curl: 0.32, limb: 0.88, limbWidth: 0.90, eye: 0.24, cord: 1.20, placenta: 0.78, uterus: 1.28 } },
  { week: 28, p: { scale: 0.80, headRatio: 0.30, curl: 0.28, limb: 0.92, limbWidth: 0.97, eye: 0.22, cord: 1.30, placenta: 0.84, uterus: 1.38 } },
  { week: 32, p: { scale: 0.88, headRatio: 0.28, curl: 0.25, limb: 0.95, limbWidth: 1.02, eye: 0.20, cord: 1.40, placenta: 0.90, uterus: 1.48 } },
  { week: 36, p: { scale: 0.95, headRatio: 0.27, curl: 0.22, limb: 0.97, limbWidth: 1.08, eye: 0.19, cord: 1.50, placenta: 0.95, uterus: 1.58 } },
  { week: 40, p: { scale: 1.00, headRatio: 0.26, curl: 0.20, limb: 1.00, limbWidth: 1.14, eye: 0.18, cord: 1.60, placenta: 1.00, uterus: 1.68 } },
];

export const STAGE_WEEKS = [1, 2, 3, 4, 5, 6, 7, 8, 10, 12, 14, 16, 20, 24, 28, 32, 36, 40];

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Smoothly interpolates anatomical proportions for any gestational week 4–40.
 *  Weeks 1–3 (cellular stages) reuse the week-4 envelope so shared helpers
 *  (anchors, cord, membrane) stay finite — the conception renderer ignores it. */
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

// ---------------------------------------------------------------------------
// Shared sculpt math — anatomical landmarks in normalized "sculpt space"
// (face toward +Z, spinal curl bends the head forward). The week-dependent
// display size is applied by scaling the whole sculpted body.
// ---------------------------------------------------------------------------

export interface BodyMetrics {
  torsoLen: number;
  torsoR: number;
  headR: number;
  headC: [number, number, number];
  neck: [number, number, number];
  chest: [number, number, number];
  abdomen: [number, number, number];
  rump: [number, number, number];
  cordInsert: [number, number, number];
}

const qBez = (a: number, b: number, c: number, t: number) => {
  const u = 1 - t;
  return u * u * a + 2 * u * t * b + t * t * c;
};

/** Head/body proportions: massive cranium early, ~1/3 body length at term. */
export function headRadiusFor(p: StageParams): number {
  return p.headRatio * 1.22 + 0.06;
}

/** Landmarks shared by the 3D sculptor, eyes, hotspots and the cord. */
export function bodyMetrics(p: StageParams): BodyMetrics {
  const L = 1.12; // chin–rump length (normalized)
  const R = 0.3;  // belly radius (normalized)
  const c = p.curl;
  const headR = headRadiusFor(p);

  // Spine: quadratic bezier rump → neck, control bows the back posteriorly.
  const p0y = -L * 0.52, p0z = 0;
  const p1y = 0, p1z = -L * 0.45 * Math.sin(c);
  const p2y = L * 0.5 * Math.cos(c * 0.75), p2z = L * 0.5 * Math.sin(c);
  const at = (t: number): [number, number, number] => [0, qBez(p0y, p1y, p2y, t), qBez(p0z, p1z, p2z, t)];

  const rump = at(0);
  const abdomen = at(0.42);
  const chest = at(0.66);
  const neck = at(1);

  // Head folds forward around the neck as curl increases (fetal tuck).
  const th = c * 0.85;
  const headC: [number, number, number] = [
    0,
    neck[1] + Math.cos(th) * headR * 0.72,
    neck[2] + Math.sin(th) * headR * 0.72,
  ];
  const cordInsert: [number, number, number] = [0, abdomen[1] - 0.02, abdomen[2] + R * 0.92];

  return { torsoLen: L, torsoR: R, headR, headC, neck, chest, abdomen, rump, cordInsert };
}

/** Point along the spinal bezier (t in 0..1, rump→neck), sculpt space. */
export function spinePoint(p: StageParams, t: number): [number, number, number] {
  const L = 1.12;
  const c = p.curl;
  const p0y = -L * 0.52, p0z = 0;
  const p1y = 0, p1z = -L * 0.45 * Math.sin(c);
  const p2y = L * 0.5 * Math.cos(c * 0.75), p2z = L * 0.5 * Math.sin(c);
  return [0, qBez(p0y, p1y, p2y, t), qBez(p0z, p1z, p2z, t)];
}

/** Sculpt→world display factor: snug inside the uterine cavity at every stage. */
export function sculptScale(p: StageParams): number {
  const t = (p.scale - 0.06) / 0.94;
  return 0.2 + 1.12 * Math.min(1, Math.max(0, t));
}

/** Global vertical placement of the fetus inside the uterine cavity. */
export const SCULPT_Y_OFFSET = -0.07;

/** Anatomical hotspot anchors in model/world space (recomputed from params). */
export function hotspotPositions(p: StageParams): Record<string, [number, number, number]> {
  const m = bodyMetrics(p);
  const k = sculptScale(p);
  const oy = SCULPT_Y_OFFSET;
  return {
    brain: [
      m.headC[0] * k,
      m.headC[1] * k + m.headR * k * 0.4 + oy,
      m.headC[2] * k + m.headR * k * 0.25,
    ],
    heart: [0, m.chest[1] * k + oy, m.chest[2] * k + m.torsoR * k * 0.55],
    cord: [m.cordInsert[0] * k, m.cordInsert[1] * k + oy, m.cordInsert[2] * k],
    placenta: [0, p.uterus * 0.55, -p.uterus * 0.62],
  };
}

/** Annotation marker targets (driven by src/data/studio-content.ts). */
export type AnnotationTarget = 'head' | 'heart' | 'limb' | 'cord' | 'placenta' | 'uterus' | 'body';

/**
 * Conception-stage (weeks 1–3) hotspot anchors in the conception scene's local
 * space. The conception renderer keeps its objects near the unit sphere, so
 * these are fixed, hand-tuned positions — no parametric envelope involved.
 */
export function conceptionAnchor(week: number, target: AnnotationTarget): [number, number, number] {
  const w = Math.min(Math.max(week, 1), 3);
  if (w === 1) {
    switch (target) {
      case 'head': return [0, 0.06, 0.10];       // zygote / pronuclei
      case 'placenta': return [0, 0.32, -0.82];  // corona radiata halo (upper back)
      case 'cord': return [0, -0.34, -0.92];     // zona pellucida shell (lower back)
      default: return [0, 0, 0.4];
    }
  }
  if (w === 2) {
    switch (target) {
      case 'head': return [0, 0.52, 0.30];       // inner cell mass pole
      case 'placenta': return [0.72, -0.1, -0.55]; // trophectoderm wall
      case 'cord': return [0, -0.15, 0.25];      // blastocoel cavity centre
      default: return [0, 0, 0.4];
    }
  }
  switch (target) {
    case 'head': return [0, -0.12, -0.02];       // embryonic disc (implanted)
    case 'cord': return [0.42, -0.08, 0.06];     // connecting stalk at the disc edge
    case 'placenta': return [0.3, -0.35, -0.3];  // early villi into the wall
    case 'uterus': return [0, -0.62, -0.42];     // endometrial mound front
    default: return [0, -0.1, 0.2];
  }
}

/**
 * Approximate world-space anchors for contextual annotation markers.
 * Reuses the hotspot anchors where they exist and derives limb/uterus/body
 * anchors from the same body metrics (schematic positions, like the model).
 */
export function annotationAnchor(p: StageParams, target: AnnotationTarget): [number, number, number] {
  const spots = hotspotPositions(p);
  switch (target) {
    case 'head':
      return spots.brain;
    case 'heart':
      return spots.heart;
    case 'cord':
      return spots.cord;
    case 'placenta':
      return spots.placenta;
    case 'limb': {
      // Upper-arm root (side +1) — same sculpt-space source the sculptor uses.
      const m = bodyMetrics(p);
      const k = sculptScale(p);
      const sh = spinePoint(p, 0.8);
      return [0.56 * m.torsoR * k, (sh[1] - 0.02 * m.torsoR) * k + SCULPT_Y_OFFSET, (sh[2] + 0.12 * m.torsoR) * k];
    }
    case 'uterus': {
      // A point on the uterine membrane shell (sphere r≈1.05 scaled by uterus).
      const u = p.uterus;
      return [0.35 * u, 0.92 * u, 0.5 * u];
    }
    case 'body': {
      // Front of the belly, slightly below the cord insertion.
      const m = bodyMetrics(p);
      const k = sculptScale(p);
      return [0.16 * k, (m.abdomen[1] + 0.06) * k + SCULPT_Y_OFFSET, (m.abdomen[2] + m.torsoR) * k];
    }
  }
}
