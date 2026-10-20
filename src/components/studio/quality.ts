/**
 * NIVA studio LOD tiers (Wave 3.4).
 *
 * One preset per quality tier; every renderer knob is derived from here so the
 * studio's memory/GPU budget is explicit and testable rather than scattered
 * across components. Mobile defaults to 'low' (set in fetal-studio.tsx).
 */

export type StudioQuality = 'low' | 'medium' | 'high';

export interface StudioQualityPreset {
  /** Canvas dpr clamp upper bound ([1, dprCap]). */
  dprCap: number;
  /** Amniotic particle count. */
  particles: number;
  /** Amniotic particle world size. */
  particleSize: number;
  /** Shadow mapping on/off (off on low). */
  shadows: boolean;
  /** Shadow map resolution (ignored when shadows is false). */
  shadowRes: number;
  /** Base radial segment count for spheres/lathes (multiplied by lodProfile). */
  radialSegments: number;
  /** Longitudinal segments for tube geometries. */
  tubeSegments: number;
  /** Radial segments for vessel tubes. */
  vesselSegments: number;
  /** Eye sphere [width, height] segments. */
  eyeSegments: [number, number];
  /** Marching-cubes grid resolution. */
  mcRes: number;
  /** Marching-cubes max polygon budget. */
  maxPoly: number;
}

const BASE_RADIAL = 48; // base radial segments; lodProfile multipliers give 24/48/96

/**
 * Applies a manifest lodProfile multiplier to the base radial count.
 * STUDIO_ASSET_MANIFESTS use {low:0.5, medium:1, high:2} → 24/48/96.
 */
export function radialSegmentsFor(preset: StudioQualityPreset, multiplier: number): number {
  return Math.max(8, Math.round((BASE_RADIAL * multiplier) / 2) * 2);
}

export const STUDIO_QUALITY_PRESETS: Record<StudioQuality, StudioQualityPreset> = {
  low: {
    dprCap: 1,
    particles: 80,
    particleSize: 0.08,
    shadows: false,
    shadowRes: 0,
    radialSegments: 24,
    tubeSegments: 24,
    vesselSegments: 12,
    eyeSegments: [10, 8],
    mcRes: 26,
    maxPoly: 32_000,
  },
  medium: {
    dprCap: 1.5,
    particles: 200,
    particleSize: 0.06,
    shadows: true,
    shadowRes: 1024,
    radialSegments: 48,
    tubeSegments: 48,
    vesselSegments: 16,
    eyeSegments: [16, 12],
    mcRes: 36,
    maxPoly: 64_000,
  },
  high: {
    dprCap: 2,
    particles: 400,
    particleSize: 0.05,
    shadows: true,
    shadowRes: 2048,
    radialSegments: 96,
    tubeSegments: 96,
    vesselSegments: 24,
    eyeSegments: [24, 18],
    mcRes: 48,
    maxPoly: 120_000,
  },
};
