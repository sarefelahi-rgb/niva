'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { X } from 'lucide-react';
import * as THREE from 'three';
import { MarchingCubes } from 'three/examples/jsm/objects/MarchingCubes.js';
import { Card, CardContent, CardTitle } from '@/components/ui/card';
import { stageContentForWeek } from '@/data/studio-content';
import {
  paramsForWeek,
  annotationAnchor,
  bodyMetrics,
  spinePoint,
  sculptScale,
  SCULPT_Y_OFFSET,
  type AnnotationTarget,
  type StageParams,
} from './params';
import { STUDIO_QUALITY_PRESETS } from './quality';

/**
 * Organic parametric fetus + placenta + umbilical cord + uterus.
 *
 * The body is a fused METABALL surface (marching cubes) sculpted from ~40
 * anatomical field sources (spine, cranium, face, limbs, tail bud), giving a
 * smooth, natural, seamless organic form that morphs fluidly between
 * gestational-stage proportion keyframes. Educational schematic only.
 */

const EXT = 2.05;            // sculpt space half-extent mapped onto the MC grid (headroom for the embryo's large cranium)
const ISO = 80;              // marching cubes isolation
const SUB = 12;              // ball subtract
const STRENGTH_K = (ISO + SUB) / 4 / (EXT * EXT); // strength for a sculpt-space radius r
const FUSION = 0.92;         // radius shrink to compensate metaball union bulge

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const smooth = (a: number, b: number, v: number) => {
  const t = clamp01((v - a) / (b - a));
  return t * t * (3 - 2 * t);
};
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const hash = (n: number) => {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
};

/**
 * Facial-maturity factors (week-driven): embryonic eyes sit far apart and
 * low-set, then migrate to the front while nose/lips/ears/pins emerge.
 * Shared by the sculptor (base bumps) and the mesh face rig.
 */
export function faceFactors(week: number) {
  return {
    ff: smooth(9, 20, week),       // eyes/ears migrate to final position
    nose: smooth(10, 26, week),    // bridge/tip/alae emerge
    mouth: smooth(11, 22, week),   // lips take shape
    ear: smooth(9, 20, week),      // pinna grows + rises from low-set
    brow: smooth(18, 26, week),    // eyebrows appear
    vernix: smooth(30, 38, week),  // creamy protective coating
    open: smooth(24, 27, week),    // eyelids separate
  };
}

/* ------------------------------------------------------------------ */
/*  Module-level scratch objects (Wave 3.4 — zero per-frame allocation) */
/*  All are consumed synchronously inside useFrame/build calls and      */
/*  never escape a single frame, so sharing them is safe.               */
/* ------------------------------------------------------------------ */
const _addColor = new THREE.Color();       // per-ball tint for mc.addBall
const _cDry = new THREE.Color('#d8836e');
const _cWet = new THREE.Color('#eec4af');
const _cWhite = new THREE.Color('#ffffff');
const _cRosyHue = new THREE.Color('#e07f6a');
const _cDeepHue = new THREE.Color('#d96a58');
const _palBase = new THREE.Color();
const _palDorsal = new THREE.Color();
const _palBelly = new THREE.Color();
const _palRosy = new THREE.Color();
const _palDeep = new THREE.Color();
const _palCheek = new THREE.Color();
const _palBack = new THREE.Color();
const _va = new THREE.Vector3();
const _vb = new THREE.Vector3();
const _vc = new THREE.Vector3();
const _vd = new THREE.Vector3();
const _vf = new THREE.Vector3();
const _upA = new THREE.Vector3(1, 0, 0);
const _upB = new THREE.Vector3(0, 1, 0);
const _nrm = new THREE.Vector3();
const _bin = new THREE.Vector3();
const _tan = new THREE.Vector3();
const _pt = new THREE.Vector3();
const _zAxis = new THREE.Vector3(0, 0, 1);

export interface FetusModelProps {
  week: number;
  showFetus: boolean;
  showPlacenta: boolean;
  showUterus: boolean;
  showLabels: boolean;
  autoRotate: boolean;
  quality: 'low' | 'medium' | 'high';
  labelsLang: 'fa' | 'en';
  /** Localized "Close" label for annotation popovers. */
  closeLabel?: string;
  /**
   * Stable portal target for the drei <Html> annotation labels. Providing a
   * constant element keeps Html's layout-effect deps from ever changing (R3F
   * event connect would otherwise flip the default target and synchronously
   * unmount each label's ReactDOM root mid-commit — React 19 root race).
   */
  labelsPortal?: React.RefObject<HTMLElement>;
}

interface Ball {
  x: number; y: number; z: number;
  r: number;
  c: THREE.Color;
}

/* ------------------------------------------------------------------ */
/*  Sculptor — builds the anatomical ball field for the current stage  */
/* ------------------------------------------------------------------ */

function buildBalls(p: StageParams, week: number, phase: number, detail: boolean, out: Ball[]): number {
  const m = bodyMetrics(p);
  const hr = m.headR;
  const R = m.torsoR;
  const tW = clamp01((week - 6) / 16);
  const drift = detail ? 1 : 0;
  let n = 0;

  // Living palette: vascular translucent red-pink early → soft vernix skin late.
  // Scratch colors from module scope — consumed synchronously by mc.addBall.
  const base = _palBase.copy(_cDry).lerp(_cWet, tW);
  const dorsal = _palDorsal.copy(base).multiplyScalar(0.88);
  const belly = _palBelly.copy(base).lerp(_cWhite, 0.14);
  const rosy = _palRosy.copy(base).lerp(_cRosyHue, 0.4);
  const rosyDeep = _palDeep.copy(base).lerp(_cDeepHue, 0.55);

  const push = (x: number, y: number, z: number, r: number, c: THREE.Color) => {
    const b = out[n];
    if (!b) { out[n] = { x, y, z, r, c }; n++; return; }
    b.x = x; b.y = y; b.z = z; b.r = r; b.c = c; n++;
  };

  /* ---- torso along the curled spine ---- */
  const spineT: Array<[number, number, number]> = [];
  for (let i = 0; i < 5; i++) {
    const t = i / 4;
    const sp = spinePoint(p, t);
    const d = drift * Math.sin(phase * 0.8 + i * 1.1) * 0.012;
    spineT.push(sp);
    const r = [0.95, 1.04, 1.05, 0.93, 0.55][i] * R;
    const col = i <= 1 ? dorsal : i === 2 ? belly : i === 3 ? _palBack.copy(base).multiplyScalar(0.95) : base;
    push(sp[0], sp[1] + d, sp[2] + drift * Math.cos(phase * 0.6 + i) * 0.012, r * FUSION, col);
  }
  // Buttocks
  const bu = spineT[0];
  push(0.34 * R, bu[1] - 0.04 * R, bu[2] + 0.02, 0.64 * R * FUSION, dorsal);
  push(-0.34 * R, bu[1] - 0.04 * R, bu[2] + 0.02, 0.64 * R * FUSION, dorsal);

  /* ---- embryonic tail (weeks ≤ ~9) ---- */
  const tf = clamp01(1 - (week - 7) / 2.5);
  if (tf > 0.02) {
    const p1 = spinePoint(p, 0.04);
    const dir = _va.set(0, bu[1] - p1[1], bu[2] - p1[2]).normalize();
    const t1 = [bu[0] - dir.x * 0.34 * R * tf, bu[1] - dir.y * 0.34 * R * tf, bu[2] - dir.z * 0.34 * R * tf];
    push(t1[0], t1[1], t1[2], (0.2 + 0.12 * tf) * R * FUSION, rosyDeep);
    const t2 = [bu[0] - dir.x * 0.58 * R * tf, bu[1] - dir.y * 0.58 * R * tf, bu[2] - dir.z * 0.58 * R * tf];
    push(t2[0], t2[1], t2[2], 0.12 * R * FUSION * tf + 0.02, rosyDeep);
  }

  /* ---- head cluster (relative to head center, +Z face, +Y crown) ---- */
  const hc = m.headC;
  const hdx = drift * Math.sin(phase * 0.45) * 0.02;
  const H = (dx: number, dy: number, dz: number) =>
    [hc[0] + dx * hr + hdx, hc[1] + dy * hr, hc[2] + dz * hr] as const;

  push(...H(0, 0.2, -0.16), 0.9 * hr * 0.95, dorsal);                    // cranium
  push(...H(0, 0.08, -0.92), 0.58 * hr * FUSION, dorsal);                // occiput
  push(...H(0, 0.66, -0.3), 0.6 * hr * FUSION, dorsal);                  // crown
  push(...H(0, 0.6, 0.52), 0.56 * hr * FUSION, base);                    // forehead
  push(...H(0.32, 0.26, 0.86), 0.16 * hr * FUSION, base);                 // brow R
  push(...H(-0.32, 0.26, 0.86), 0.16 * hr * FUSION, base);               // brow L
  push(...H(0.56, -0.3, 0.64), (0.34 + 0.05 * smooth(30, 38, week)) * hr * FUSION, _palCheek.copy(base).multiplyScalar(1.04)); // cheek
  push(...H(-0.56, -0.3, 0.64), (0.34 + 0.05 * smooth(30, 38, week)) * hr * FUSION, _palCheek);
  push(...H(0, -0.52, 0.62), 0.5 * hr * (0.75 + 0.25 * tW) * FUSION, base);   // jaw
  push(...H(0, -0.82, 0.72), 0.3 * hr * (0.7 + 0.3 * tW) * FUSION, base);     // chin
  push(...H(0, -0.18, 0.88), 0.2 * hr * (1 - 0.3 * smooth(10, 26, week)) * FUSION, rosy); // nose base (mesh nose adds detail)
  push(...H(0.95, -0.02, -0.02), 0.22 * hr * FUSION, base);                   // ear base R (mesh pinna overlays)
  push(...H(-0.95, -0.02, -0.02), 0.22 * hr * FUSION, base);                  // ear base L

  /* ---- umbilical ring ---- */
  const ci = m.cordInsert;
  push(ci[0], ci[1], ci[2] - 0.05, 0.3 * R * FUSION, rosy);

  /* ---- limbs: fused two-segment fetal folds with hands/feet ----
     Each segment places midpoint balls so consecutive ball spacing stays
     within the metaball fusion radius (no detached fragments at any stage). */
  const limb = p.limb;
  if (limb > 0.02) {
    const armLen = 0.8 * limb;
    const legLen = 0.88 * limb;
    const sh = spinePoint(p, 0.8);
    const hp = spinePoint(p, 0.06);
    for (const side of [1, -1]) {
      const sway = drift * Math.sin(phase * 0.7 + side) * 0.02;
      // Arm
      const root: [number, number, number] = [side * 0.52 * R, sh[1] - 0.02 * R, sh[2] + 0.1 * R];
      const uA = _vb.set(side * 0.28, -0.8, 0.55).normalize();
      const elbow: [number, number, number] = [
        root[0] + uA.x * (0.5 * armLen + 0.05),
        root[1] + uA.y * (0.5 * armLen + 0.05) + sway,
        root[2] + uA.z * (0.5 * armLen + 0.05),
      ];
      const fA = _vc.set(-side * 0.5, -0.5, 0.68).normalize();
      const wrist: [number, number, number] = [
        elbow[0] + fA.x * (0.44 * armLen + 0.04) + sway,
        elbow[1] + fA.y * (0.44 * armLen + 0.04),
        elbow[2] + fA.z * (0.44 * armLen + 0.04) + sway * 0.5,
      ];
      const rRoot = 0.46 * R, rElbow = 0.34 * R, rWrist = 0.26 * R;
      push(root[0], root[1], root[2], rRoot * FUSION, base);
      push((root[0] + elbow[0]) / 2, (root[1] + elbow[1]) / 2, (root[2] + elbow[2]) / 2, (rRoot + rElbow) * 0.44 * FUSION, base);
      push(elbow[0], elbow[1], elbow[2], rElbow * FUSION, base);
      push((elbow[0] + wrist[0]) / 2, (elbow[1] + wrist[1]) / 2, (elbow[2] + wrist[2]) / 2, (rElbow + rWrist) * 0.44 * FUSION, rosy);
      push(wrist[0], wrist[1], wrist[2], rWrist * FUSION, rosy);
      const hand: [number, number, number] = [wrist[0] + fA.x * 0.08, wrist[1] + fA.y * 0.08, wrist[2] + fA.z * 0.08];
      push(hand[0], hand[1], hand[2], 0.3 * R * FUSION, rosy);
      if (limb > 0.3) {
        push(hand[0] + side * 0.12 * R, hand[1] - 0.02 * R, hand[2] + 0.02, 0.15 * R * FUSION, rosy); // thumb
        if (detail && limb > 0.5) {
          for (let f = 0; f < 3; f++) {
            const ang = (f - 1) * 0.55;
            const fd = _vf.copy(fA).applyAxisAngle(_zAxis, side * (0.4 + ang));
            push(hand[0] + fd.x * 0.15 * R, hand[1] + fd.y * 0.15 * R, hand[2] + fd.z * 0.15 * R, 0.1 * R * FUSION, rosyDeep);
          }
        }
      }
      // Leg (knee drawn up under the body, foot near rump)
      const rootL: [number, number, number] = [side * 0.4 * R, hp[1] - 0.02 * R, hp[2] + 0.06 * R];
      const uL = _vb.set(side * 0.14, -0.3, 0.94).normalize();
      const knee: [number, number, number] = [
        rootL[0] + uL.x * (0.48 * legLen + 0.05),
        rootL[1] + uL.y * (0.48 * legLen + 0.05) + sway * 0.7,
        rootL[2] + uL.z * (0.48 * legLen + 0.05),
      ];
      const lA = _vc.set(side * 0.1, -0.92, 0.38).normalize();
      const ankle: [number, number, number] = [
        knee[0] + lA.x * (0.42 * legLen + 0.04),
        knee[1] + lA.y * (0.42 * legLen + 0.04) + sway * 0.4,
        knee[2] + lA.z * (0.42 * legLen + 0.04),
      ];
      const rHip = 0.48 * R, rKnee = 0.36 * R, rAnkle = 0.26 * R;
      push(rootL[0], rootL[1], rootL[2], rHip * FUSION, base);
      push((rootL[0] + knee[0]) / 2, (rootL[1] + knee[1]) / 2, (rootL[2] + knee[2]) / 2, (rHip + rKnee) * 0.44 * FUSION, base);
      push(knee[0], knee[1], knee[2], rKnee * FUSION, base);
      push((knee[0] + ankle[0]) / 2, (knee[1] + ankle[1]) / 2, (knee[2] + ankle[2]) / 2, (rKnee + rAnkle) * 0.44 * FUSION, rosy);
      push(ankle[0], ankle[1], ankle[2], rAnkle * FUSION, rosy);
      push(ankle[0], ankle[1] - 0.05 * R, ankle[2] + 0.1 * R, 0.3 * R * FUSION, rosy); // foot
    }
  }

  /* ---- organic asymmetry ---- */
  for (let i = 0; i < n; i++) {
    const b = out[i];
    const h1 = hash(i);
    const h2 = hash(i + 57.3);
    b.x += (h1 - 0.5) * 0.024;
    b.y += (h2 - 0.5) * 0.024;
    b.z += (hash(i + 91.7) - 0.5) * 0.024;
    b.r *= 0.96 + h1 * 0.08;
  }
  return n;
}

/* ------------------------------------------------------------------ */
/*  Main model                                                         */
/* ------------------------------------------------------------------ */

const EYE_DIR = 0.42; // yaw of eyes from +Z

export function FetusModel(props: FetusModelProps) {
  const { week, showFetus, showPlacenta, showUterus, showLabels, autoRotate, quality, labelsLang, closeLabel = 'Close', labelsPortal } = props;
  const group = useRef<THREE.Group>(null);
  const target = useMemo(() => paramsForWeek(week), [week]);
  const current = useRef<StageParams>({ ...target });
  const reduceMotion = !autoRotate; // labels/heartbeat follow the same switch
  const preset = STUDIO_QUALITY_PRESETS[quality];

  /* ---- metaball body (imperative three.js object owned by this component) ---- */
  const mc = useMemo(() => {
    const mat = new THREE.MeshPhysicalMaterial({
      vertexColors: true,
      color: 0xffffff,
      roughness: 0.4,
      metalness: 0,
      sheen: 1,
      sheenColor: new THREE.Color('#ff9d8a'),
      sheenRoughness: 0.5,
      clearcoat: 0.12,
      clearcoatRoughness: 0.55,
      specularIntensity: 0.55,
      envMapIntensity: 0.8,
    });
    const inst = new MarchingCubes(preset.mcRes, mat, false, true, preset.maxPoly);
    inst.isolation = ISO;
    inst.castShadow = preset.shadows;
    inst.receiveShadow = preset.shadows;
    return inst;
  }, [preset]);

  useEffect(() => {
    return () => {
      mc.geometry.dispose();
      (mc.material as THREE.Material).dispose();
    };
  }, [mc]);

  const balls = useRef<Ball[]>([]);
  const lastParams = useRef<StageParams>({ ...target });
  const needsInit = useRef(true);
  const driftAcc = useRef(999);

  useEffect(() => {
    needsInit.current = true; // fresh MC instance → force first polygonization
  }, [mc]);

  /* eslint-disable react-hooks/immutability -- imperative three.js object owned by this component */

  /* ---- cord + placenta (imperative rebuild on quantized param change) ---- */
  const cordRef = useRef<THREE.Mesh>(null);
  const cordKey = useRef('');
  const placentaRef = useRef<THREE.Group>(null);
  const placentaBodyRef = useRef<THREE.Mesh>(null);
  const placentaKey = useRef('');
  const placentaVesselsRef = useRef<THREE.Group>(null);

  /* ---- face rig refs (eyes + lids + brows + nose + lips + ears) ---- */
  const eyeL = useRef<THREE.Group>(null);
  const eyeR = useRef<THREE.Group>(null);
  const irisLm = useRef<THREE.Mesh>(null);
  const irisRm = useRef<THREE.Mesh>(null);
  const pigLm = useRef<THREE.Mesh>(null);
  const pigRm = useRef<THREE.Mesh>(null);
  const lidUL = useRef<THREE.Mesh>(null);
  const lidUR = useRef<THREE.Mesh>(null);
  const lidLL = useRef<THREE.Mesh>(null);
  const lidLR = useRef<THREE.Mesh>(null);
  const seamL = useRef<THREE.Mesh>(null);
  const seamR = useRef<THREE.Mesh>(null);
  const glintL = useRef<THREE.Mesh>(null);
  const glintR = useRef<THREE.Mesh>(null);
  const browL = useRef<THREE.Group>(null);
  const browR = useRef<THREE.Group>(null);
  const noseGrp = useRef<THREE.Group>(null);
  const mouthGrp = useRef<THREE.Group>(null);
  const earL = useRef<THREE.Group>(null);
  const earR = useRef<THREE.Group>(null);
  const heartRef = useRef<THREE.Sprite>(null);

  /* ---- membrane shader ---- */
  const membraneMat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          uColor: { value: new THREE.Color('#c98a95') },
          uRim: { value: new THREE.Color('#f2c4cc') },
        },
        vertexShader: /* glsl */ `
          varying vec3 vN; varying vec3 vW; varying vec3 vP;
          void main() {
            vN = normalize(mat3(modelMatrix) * normal);
            vec4 wp = modelMatrix * vec4(position, 1.0);
            vW = wp.xyz; vP = position;
            gl_Position = projectionMatrix * viewMatrix * wp;
          }`,
        fragmentShader: /* glsl */ `
          uniform vec3 uColor; uniform vec3 uRim;
          varying vec3 vN; varying vec3 vW; varying vec3 vP;
          void main() {
            vec3 n = normalize(vN);
            vec3 v = normalize(cameraPosition - vW);
            float f = pow(1.0 - abs(dot(n, v)), 2.4);
            float shade = smoothstep(-2.2, 1.6, vP.y);
            vec3 col = mix(uColor * 0.4, uRim, f) * (0.5 + 0.5 * shade);
            float a = 0.05 + f * 0.5;
            gl_FragColor = vec4(col, a);
          }`,
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    []
  );
  useEffect(() => () => membraneMat.dispose(), [membraneMat]);

  /* ---- face materials (shared by every mesh feature; colored per week) ---- */
  const faceMats = useMemo(() => {
    const skin = () =>
      new THREE.MeshPhysicalMaterial({
        color: '#d8836e',
        roughness: 0.45,
        metalness: 0,
        sheen: 1,
        sheenColor: new THREE.Color('#ff9d8a'),
        sheenRoughness: 0.5,
        clearcoat: 0.15,
        clearcoatRoughness: 0.55,
        envMapIntensity: 0.85,
      });
    return {
      skin: skin(),
      lip: skin(),
      seam: new THREE.MeshStandardMaterial({ color: '#7a453c', roughness: 0.55, transparent: true, opacity: 0.5 }),
      lash: new THREE.MeshStandardMaterial({ color: '#5d3a33', roughness: 0.5, transparent: true, opacity: 0 }),
      iris: new THREE.MeshStandardMaterial({ color: '#4a2e28', roughness: 0.25, metalness: 0.05 }),
      glint: new THREE.MeshBasicMaterial({ color: '#fff5ee' }),
      brow: new THREE.MeshStandardMaterial({ color: '#54372e', roughness: 0.6, transparent: true, opacity: 0 }),
      nostril: new THREE.MeshStandardMaterial({ color: '#8a5148', roughness: 0.6, transparent: true, opacity: 0 }),
      pig: new THREE.MeshStandardMaterial({ color: '#6e4a42', roughness: 0.5, transparent: true, opacity: 0 }),
    };
  }, []);
  useEffect(() => () => Object.values(faceMats).forEach((m) => m.dispose()), [faceMats]);

  /* Per-week facial palette + pose constants (no per-frame color churn). */
  useEffect(() => {
    const { nose, mouth, brow, vernix } = faceFactors(week);
    const tW = clamp01((week - 6) / 16);
    const lidVis = smooth(7.5, 8.5, week); // lids appear after the pigment-spot phase
    const base = new THREE.Color('#d8836e').lerp(_cWet, tW).lerp(new THREE.Color('#f4e3d0'), vernix * 0.4);
    faceMats.skin.color.copy(base);
    faceMats.skin.roughness = 0.5 - 0.16 * tW;
    faceMats.skin.clearcoat = 0.2 - 0.1 * tW;
    faceMats.lip.color.copy(base.clone().lerp(new THREE.Color('#c9554a'), 0.55 + 0.15 * mouth));
    faceMats.lip.roughness = faceMats.skin.roughness;
    faceMats.seam.opacity = 0.18 + 0.3 * mouth;
    faceMats.brow.opacity = 0.4 * brow;
    faceMats.nostril.opacity = 0.8 * smooth(0.55, 0.9, nose);
    faceMats.lash.opacity = 0.35 * smooth(26, 32, week);
    // eyeball reads as retinal pigment spots first, fused lids next, iris last
    faceMats.pig.opacity = 0.95 * (1 - lidVis);
  }, [week, faceMats]);

  /* ---- glow texture (heartbeat + particles share the generator) ---- */
  const glowTex = useMemo(() => makeGlowTexture(), []);
  // GPU hygiene: the canvas texture must be released when the model unmounts
  // (risk R-11 — long studio sessions accumulated GPU memory).
  useEffect(() => () => glowTex.dispose(), [glowTex]);

  const faceF = useMemo(() => faceFactors(week), [week]);
  const tW = clamp01((week - 6) / 16);

  const membraneRef = useRef<THREE.Mesh>(null);

  useFrame((state, delta) => {
    const c = current.current;
    const k = Math.min(1, delta * 3.2);
    let dirty = false;
    const keys: Array<keyof StageParams> = ['scale', 'headRatio', 'curl', 'limb', 'limbWidth', 'eye', 'cord', 'placenta', 'uterus'];
    for (const key of keys) {
      const d = target[key] - c[key];
      if (Math.abs(d) > 0.00001) {
        c[key] += d * k;
        dirty = true;
      }
    }
    const lp = lastParams.current;
    if (
      dirty ||
      Math.abs(lp.scale - c.scale) > 0.0025 ||
      Math.abs(lp.curl - c.curl) > 0.0025 ||
      Math.abs(lp.limb - c.limb) > 0.0025
    ) {
      dirty = true;
    }

    const T = state.clock.elapsedTime;
    const detail = quality === 'high' && !reduceMotion;

    // Re-polygonize only when morphing (or on gentle drift for high tier).
    if (showFetus && (needsInit.current || dirty || (detail && (driftAcc.current += delta) > 1 / 18))) {
      needsInit.current = false;
      if (!dirty) driftAcc.current = 0;
      const n = buildBalls(c, week, T, detail, balls.current);
      mc.reset();
      for (let i = 0; i < n; i++) {
        const b = balls.current[i];
        const gx = Math.min(0.97, Math.max(0.03, b.x / EXT / 2 + 0.5));
        const gy = Math.min(0.97, Math.max(0.03, b.y / EXT / 2 + 0.5));
        const gz = Math.min(0.97, Math.max(0.03, b.z / EXT / 2 + 0.5));
        const strength = STRENGTH_K * b.r * b.r;
        _addColor.copy(b.c).multiplyScalar(1.18);
        mc.addBall(gx, gy, gz, strength, SUB, _addColor);
      }
      mc.update();
      Object.assign(lastParams.current, c);
    }
    mc.visible = showFetus;
    // Grid spans sculpt/EXT in local space, so the object scale must restore
    // the full sculpt→world factor: world = (sculpt/EXT) × (k×EXT) = sculpt×k.
    mc.scale.setScalar(sculptScale(c) * EXT);
    mc.position.y = SCULPT_Y_OFFSET;

    // Uterine membrane tracks the damped morph every frame.
    if (membraneRef.current) {
      const u = c.uterus;
      membraneRef.current.scale.set(u * 0.95, u * 1.08, u * 0.95);
    }

    // Wet → dry skin maturation.
    const mat = mc.material as THREE.MeshPhysicalMaterial;
    mat.roughness = 0.52 - 0.18 * tW;
    mat.clearcoat = 0.2 - 0.12 * tW;

    if (group.current && autoRotate) group.current.rotation.y += delta * 0.25;

    /* ---- face rig tracks the damped head (eyes migrate, features emerge) ---- */
    const m = bodyMetrics(c);
    const kk = sculptScale(c);
    const { ff, nose, mouth, ear, brow, open } = faceF;
    const hr = m.headR;
    const oy = SCULPT_Y_OFFSET;
    // Feature anchor: sculpt-space offset (in head radii) → world space.
    const E = (dx: number, dy: number, dz: number): [number, number, number] => [
      m.headC[0] * kk + dx * hr * kk,
      m.headC[1] * kk + dy * hr * kk + oy,
      m.headC[2] * kk + dz * hr * kk,
    ];

    /* Blink cycle once the lids separate (~week 26). */
    let eyeOpen = Math.max(0.1, open);
    if (week >= 26 && !reduceMotion) {
      const cyc = T % 6.2;
      const b = cyc < 0.24 ? 1 - cyc / 0.24 : cyc > 5.92 ? clamp01((cyc - 5.92) / 0.28) : 1;
      eyeOpen = Math.max(0.08, eyeOpen * (0.15 + 0.85 * b));
    }
    const lidVis = smooth(7.5, 8.5, week);

    /* Eyes migrate from wide-set lateral (embryo) to frontal (fetus). */
    const eyeSep = lerp(0.6, 0.35, ff);
    const eyeDy = lerp(0.0, 0.05, ff);
    const eyeDz = lerp(0.58, 0.93, ff);
    const eyeYaw = lerp(1.1, 0.12, ff);
    const eyeS = hr * kk * lerp(0.2, 0.135, ff) * (0.75 + 0.25 * lidVis);
    for (const [grp, lid, seam, glint, side] of [
      [eyeL, lidUL, seamL, glintL, -1],
      [eyeR, lidUR, seamR, glintR, 1],
    ] as const) {
      if (!grp.current) continue;
      grp.current.position.set(...E(side * eyeSep, eyeDy, eyeDz));
      grp.current.rotation.set(0, side * eyeYaw, 0);
      grp.current.scale.setScalar(eyeS);
      if (lid.current) {
        lid.current.scale.set(1.08, lerp(1.08, 0.42, eyeOpen), 1.08);
        lid.current.position.y = lerp(0, 0.52, eyeOpen);
      }
      if (seam.current) seam.current.position.y = lerp(0.05, 0.34, eyeOpen);
    }
    // Open eyes: the dark iris dome pushes clearly through the retracted lid shell.
    const irisPush = 0.55 + 0.45 * eyeOpen;
    if (irisLm.current) irisLm.current.position.z = irisPush;
    if (irisRm.current) irisRm.current.position.z = irisPush;
    const irisVis = open > 0.45 && lidVis > 0.5;
    if (glintL.current) glintL.current.visible = irisVis;
    if (glintR.current) glintR.current.visible = irisVis;
    if (irisLm.current) irisLm.current.visible = irisVis;
    if (irisRm.current) irisRm.current.visible = irisVis;
    const pigVis = lidVis < 0.5;
    if (pigLm.current) pigLm.current.visible = pigVis;
    if (pigRm.current) pigRm.current.visible = pigVis;
    // lash/seam line: strong when closed, faint permanent margin when open
    faceMats.seam.opacity = (0.18 + 0.3 * mouth) * (1 - eyeOpen) * lidVis + faceMats.lash.opacity * 0.6;

    /* Nose — bridge + tip + alae rise from the flat embryonic profile. */
    if (noseGrp.current) {
      noseGrp.current.visible = nose > 0.03;
      noseGrp.current.position.set(...E(0, lerp(0.16, 0.04, nose), 0.98));
      noseGrp.current.scale.setScalar(hr * kk * (0.16 + 0.19 * nose));
    }

    /* Mouth — lips take shape below the nose (proud of the jaw surface). */
    if (mouthGrp.current) {
      mouthGrp.current.visible = mouth > 0.03;
      mouthGrp.current.position.set(...E(0, lerp(-0.36, -0.44, mouth), lerp(0.94, 1.16, mouth)));
      mouthGrp.current.rotation.x = lerp(-1.05, -1.15, mouth);
      mouthGrp.current.scale.setScalar(hr * kk * (0.12 + 0.13 * mouth));
    }

    /* Brows fade in above the eyes. */
    const browS = hr * kk;
    for (const [grp, side] of [[browL, -1], [browR, 1]] as const) {
      if (!grp.current) continue;
      grp.current.visible = brow > 0.04;
      grp.current.position.set(...E(side * lerp(0.4, 0.34, ff), lerp(0.28, 0.36, ff), 0.92));
      grp.current.rotation.set(0, 0, side * 0.16);
      grp.current.scale.set(browS * (0.22 + 0.1 * brow), browS * 0.05, browS * 0.05);
    }

    /* Ears — low-set and flat in the embryo, rising as the jaw grows. */
    const earS = hr * kk * (0.14 + 0.08 * ear);
    const earDy = lerp(-0.3, -0.08, ear);
    for (const [grp, side] of [[earL, -1], [earR, 1]] as const) {
      if (!grp.current) continue;
      grp.current.visible = ear > 0.04;
      grp.current.position.set(...E(side * 0.94, earDy, -0.04));
      grp.current.rotation.set(0, side * (Math.PI / 2 - 0.12), 0);
      grp.current.scale.setScalar(earS);
    }

    /* ---- heartbeat (educational pulse) ---- */
    if (heartRef.current) {
      const pulse = reduceMotion ? 0.45 : Math.max(0, Math.sin(T * Math.PI * 2 * 1.1)) ** 4;
      const mat2 = heartRef.current.material as THREE.SpriteMaterial;
      mat2.opacity = 0.12 + 0.3 * pulse;
      const base = 0.5 * (0.35 + 0.65 * c.scale) * kk * 2.2;
      heartRef.current.scale.setScalar(base * (1 + 0.22 * pulse));
      heartRef.current.position.set(0, m.chest[1] * kk + SCULPT_Y_OFFSET, m.chest[2] * kk + m.torsoR * kk * 0.72);
    }

    /* ---- umbilical cord (helical tube, rebuilt on quantized change) ---- */
    if (cordRef.current && showPlacenta) {
      const key = `${c.scale.toFixed(2)}|${c.curl.toFixed(2)}|${c.cord.toFixed(2)}|${c.uterus.toFixed(2)}`;
      if (key !== cordKey.current || !cordRef.current.geometry.userData.built) {
        cordKey.current = key;
        const g = buildCordGeometry(c, m, kk, preset.tubeSegments);
        const old = cordRef.current.geometry;
        cordRef.current.geometry = g;
        old.dispose();
        cordRef.current.geometry.userData.built = true;
      }
    }

    /* ---- placenta ---- */
    if (placentaRef.current) {
      placentaRef.current.visible = showPlacenta;
      if (showPlacenta) {
        placentaRef.current.position.set(0, c.uterus * 0.55, -c.uterus * 0.62);
        const key = c.placenta.toFixed(2);
        if (key !== placentaKey.current || !(placentaBodyRef.current?.geometry.userData.built)) {
          placentaKey.current = key;
          const built = buildPlacentaGeometry(c.placenta, preset.radialSegments, preset.vesselSegments);
          if (placentaBodyRef.current) {
            const old = placentaBodyRef.current.geometry;
            placentaBodyRef.current.geometry = built.body;
            old.dispose();
            placentaBodyRef.current.geometry.userData.built = true;
          }
          if (placentaVesselsRef.current) {
            // Dispose old vessel geometries before clearing: clear() alone
            // leaks every previously built TubeGeometry (risk R-11).
            for (const child of placentaVesselsRef.current.children) {
              const m = child as THREE.Mesh;
              m.geometry?.dispose();
            }
            placentaVesselsRef.current.clear();
            for (const v of built.vessels) {
              const mesh = new THREE.Mesh(v, vesselMaterial);
              mesh.castShadow = quality !== 'low';
              placentaVesselsRef.current.add(mesh);
            }
          }
        }
      }
    }
  });

  return (
    <group ref={group} dispose={null}>
      {/* Uterine membrane — fresnel shell */}
      {showUterus && (
        <mesh ref={membraneRef} material={membraneMat} renderOrder={10} scale={[current.current.uterus * 0.95, current.current.uterus * 1.08, current.current.uterus * 0.95]}>
          <sphereGeometry args={[1.05, preset.radialSegments, Math.round(preset.radialSegments * 0.66)]} />
        </mesh>
      )}

      {/* Placenta with chorionic vessels */}
      <group ref={placentaRef} rotation={[Math.PI / 2.35, 0, 0]}>
        <mesh ref={placentaBodyRef} castShadow={quality !== 'low'}>
          <meshPhysicalMaterial vertexColors roughness={0.62} clearcoat={0.08} sheen={0.6} sheenColor="#c96a6a" />
        </mesh>
        <group ref={placentaVesselsRef} />
      </group>

      {/* Umbilical cord — helical Wharton's-jelly tube */}
      {showPlacenta && (
        <mesh ref={cordRef} castShadow={quality !== 'low'}>
          <meshPhysicalMaterial color="#e8b39e" roughness={0.42} sheen={1} sheenColor="#ffc9b4" sheenRoughness={0.4} clearcoat={0.15} clearcoatRoughness={0.5} />
        </mesh>
      )}

      {/* Fused organic body (marching cubes, attached imperatively) */}
      <primitive object={mc} />

      {/* Face rig — pigment spots → fused lids → open eyes, brows, nose, lips, ears.
          Shared skin/lip materials are colored per week; poses track the damped head. */}
      {showFetus && week >= 5 && (
        <>
          {/* left eye */}
          <group ref={eyeL}>
            <mesh ref={irisLm} visible={false} material={faceMats.iris}>
              <sphereGeometry args={[0.55, preset.eyeSegments[0], preset.eyeSegments[1]]} />
            </mesh>
            <mesh ref={pigLm} visible={false} material={faceMats.pig} scale={0.62}>
              <sphereGeometry args={[1, 10, 8]} />
            </mesh>
            <mesh ref={lidUL} material={faceMats.skin}>
              <sphereGeometry args={[1.06, preset.eyeSegments[0], preset.eyeSegments[1]]} />
            </mesh>
            <mesh ref={lidLL} material={faceMats.skin}>
              <sphereGeometry args={[1.04, preset.eyeSegments[0], Math.max(6, preset.eyeSegments[1] >> 1), 0, Math.PI * 2, Math.PI - 0.6, 0.6]} />
            </mesh>
            <mesh ref={seamL} material={faceMats.seam} rotation={[1.45, 0, 0]} position={[0, 0.05, 0]}>
              <torusGeometry args={[1.02, 0.075, 6, 24, Math.PI]} />
            </mesh>
            <mesh ref={glintL} material={faceMats.glint} position={[0.14, 0.16, 1.22]} scale={0.1} visible={false}>
              <sphereGeometry args={[1, 8, 8]} />
            </mesh>
          </group>
          {/* right eye */}
          <group ref={eyeR}>
            <mesh ref={irisRm} visible={false} material={faceMats.iris}>
              <sphereGeometry args={[0.55, preset.eyeSegments[0], preset.eyeSegments[1]]} />
            </mesh>
            <mesh ref={pigRm} visible={false} material={faceMats.pig} scale={0.62}>
              <sphereGeometry args={[1, 10, 8]} />
            </mesh>
            <mesh ref={lidUR} material={faceMats.skin}>
              <sphereGeometry args={[1.06, preset.eyeSegments[0], preset.eyeSegments[1]]} />
            </mesh>
            <mesh ref={lidLR} material={faceMats.skin}>
              <sphereGeometry args={[1.04, preset.eyeSegments[0], Math.max(6, preset.eyeSegments[1] >> 1), 0, Math.PI * 2, Math.PI - 0.6, 0.6]} />
            </mesh>
            <mesh ref={seamR} material={faceMats.seam} rotation={[1.45, 0, 0]} position={[0, 0.05, 0]}>
              <torusGeometry args={[1.02, 0.075, 6, 24, Math.PI]} />
            </mesh>
            <mesh ref={glintR} material={faceMats.glint} position={[0.14, 0.16, 1.22]} scale={0.1} visible={false}>
              <sphereGeometry args={[1, 8, 8]} />
            </mesh>
          </group>

          {/* nose — bridge, tip, alae, nostrils (local unit frame, scaled per frame) */}
          <group ref={noseGrp} visible={false}>
            <mesh material={faceMats.skin} position={[0, 0.55, 0.02]} scale={[0.3, 1.05, 0.26]}>
              <capsuleGeometry args={[1, 1, 4, 12]} />
            </mesh>
            <mesh material={faceMats.skin} position={[0, 0.02, 0.58]} scale={[0.4, 0.34, 0.36]}>
              <sphereGeometry args={[1, 16, 12]} />
            </mesh>
            <mesh material={faceMats.skin} position={[0.38, -0.04, 0.38]} scale={[0.22, 0.17, 0.19]}>
              <sphereGeometry args={[1, 12, 10]} />
            </mesh>
            <mesh material={faceMats.skin} position={[-0.38, -0.04, 0.38]} scale={[0.22, 0.17, 0.19]}>
              <sphereGeometry args={[1, 12, 10]} />
            </mesh>
            <mesh material={faceMats.nostril} position={[0.16, -0.14, 0.62]} scale={[0.09, 0.06, 0.06]}>
              <sphereGeometry args={[1, 8, 8]} />
            </mesh>
            <mesh material={faceMats.nostril} position={[-0.16, -0.14, 0.62]} scale={[0.09, 0.06, 0.06]}>
              <sphereGeometry args={[1, 8, 8]} />
            </mesh>
          </group>

          {/* mouth — upper lip arc, lower lip arc, seam line */}
          <group ref={mouthGrp} visible={false}>
            <mesh material={faceMats.lip} position={[0, 0.14, 0]}>
              <torusGeometry args={[1, 0.3, 8, 24, Math.PI]} />
            </mesh>
            <mesh material={faceMats.lip} position={[0, -0.1, 0.02]} rotation={[0, 0, Math.PI]} scale={[0.94, 0.8, 1]}>
              <torusGeometry args={[1, 0.26, 8, 24, Math.PI]} />
            </mesh>
            <mesh material={faceMats.seam} rotation={[0, 0, Math.PI / 2]} scale={[0.16, 1.05, 1.05]}>
              <capsuleGeometry args={[1, 2, 4, 8]} />
            </mesh>
          </group>

          {/* eyebrows */}
          <group ref={browL} visible={false}>
            <mesh material={faceMats.brow} rotation={[0, 0, Math.PI / 2]}>
              <capsuleGeometry args={[1, 2.2, 4, 8]} />
            </mesh>
          </group>
          <group ref={browR} visible={false}>
            <mesh material={faceMats.brow} rotation={[0, 0, Math.PI / 2]}>
              <capsuleGeometry args={[1, 2.2, 4, 8]} />
            </mesh>
          </group>

          {/* ears — pinna ring, inner ridge, lobe (local +Z faces outward) */}
          <group ref={earL} visible={false}>
            <mesh material={faceMats.skin} scale={[1, 1.22, 0.5]} rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[1, 0.3, 8, 20]} />
            </mesh>
            <mesh material={faceMats.skin} position={[0, 0.12, 0.3]} scale={[0.62, 0.8, 0.4]} rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[1, 0.26, 6, 16]} />
            </mesh>
            <mesh material={faceMats.skin} position={[0, -0.9, 0.12]} scale={[0.42, 0.34, 0.3]}>
              <sphereGeometry args={[1, 12, 10]} />
            </mesh>
          </group>
          <group ref={earR} visible={false}>
            <mesh material={faceMats.skin} scale={[1, 1.22, 0.5]} rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[1, 0.3, 8, 20]} />
            </mesh>
            <mesh material={faceMats.skin} position={[0, 0.12, 0.3]} scale={[0.62, 0.8, 0.4]} rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[1, 0.26, 6, 16]} />
            </mesh>
            <mesh material={faceMats.skin} position={[0, -0.9, 0.12]} scale={[0.42, 0.34, 0.3]}>
              <sphereGeometry args={[1, 12, 10]} />
            </mesh>
          </group>
        </>
      )}

      {/* Heartbeat glow (educational demonstration, not a real FHR display) */}
      {showFetus && (
        <sprite ref={heartRef} renderOrder={5}>
          <spriteMaterial map={glowTex} color="#ff7460" transparent opacity={0.3} depthWrite={false} blending={THREE.AdditiveBlending} />
        </sprite>
      )}

      {/* Educational annotations (studio-content driven, click popovers) */}
      {showLabels && <AnnotationMarkers week={week} lang={labelsLang} closeLabel={closeLabel} portal={labelsPortal} />}
    </group>
  );
}

/* ------------------------------------------------------------------ */
/*  Umbilical cord — helical tube with taper                           */
/* ------------------------------------------------------------------ */

function buildCordGeometry(p: StageParams, m: ReturnType<typeof bodyMetrics>, k: number, tubeSegs: number): THREE.TubeGeometry {
  // Scratch vectors from module scope; the curve consumes them synchronously.
  const A = _va.set(m.cordInsert[0] * k, m.cordInsert[1] * k + SCULPT_Y_OFFSET, m.cordInsert[2] * k);
  const D = _vd.set(0, p.uterus * 0.53, -p.uterus * 0.5);
  // Mid control points scale with the fetus (k) so early-week cords hug the
  // tiny body instead of ballooning into a world-size loop.
  const B = _vb.copy(A).add(_vf.set(0.06 * p.cord * k, 0.1 * k, 0.3 * p.cord * k));
  const C = _vc.copy(B).lerp(D, 0.5).add(_vf.set(0.05 * k, 0.16 * k, -0.02));
  const base = new THREE.CatmullRomCurve3([A, B, C, D], false, 'catmullrom', 0.5);

  const N = 56;
  const turns = 2.4 * p.cord;
  const helixR = 0.006 + 0.014 * p.scale;
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    const pt = base.getPoint(t, _pt);
    base.getTangent(t, _tan);
    const up = Math.abs(_tan.y) > 0.9 ? _upA : _upB;
    _nrm.crossVectors(_tan, up).normalize();
    _bin.crossVectors(_tan, _nrm).normalize();
    const ang = t * turns * Math.PI * 2;
    // pts entries are OUTPUT geometry data — they must be distinct instances.
    pts.push(
      new THREE.Vector3(pt.x, pt.y, pt.z)
        .addScaledVector(_nrm, Math.cos(ang) * helixR)
        .addScaledVector(_bin, Math.sin(ang) * helixR)
    );
  }
  const tube = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), tubeSegs, 0.008 + 0.022 * p.scale, 8, false);
  // Taper toward both ends for a natural organic cord.
  // Vertex grid follows the LOD tier: (tubeSegs + 1) rings × 9 radial points.
  const pos = tube.attributes.position as THREE.BufferAttribute;
  const rings = tubeSegs + 1, radial = 9;
  for (let i = 0; i < rings; i++) {
    const t = i / (rings - 1);
    const taper = 0.78 + 0.34 * Math.sin(Math.PI * Math.min(1, t * 1.15));
    const ctr = pts[Math.min(N, Math.round(t * N))];
    for (let j = 0; j < radial; j++) {
      const idx = i * radial + j;
      pos.setXYZ(
        idx,
        ctr.x + (pos.getX(idx) - ctr.x) * taper,
        ctr.y + (pos.getY(idx) - ctr.y) * taper,
        ctr.z + (pos.getZ(idx) - ctr.z) * taper
      );
    }
  }
  pos.needsUpdate = true;
  tube.computeVertexNormals();
  return tube;
}

/* ------------------------------------------------------------------ */
/*  Placenta — organic lathe disc + chorionic vessel arcs              */
/* ------------------------------------------------------------------ */

const vesselMaterial = new THREE.MeshStandardMaterial({ color: '#6e2f38', roughness: 0.55 });

/* Placenta palette + scratch (module scope — no per-rebuild allocation). */
const _plcCore = new THREE.Color('#6e3038');
const _plcMid = new THREE.Color('#96454e');
const _plcRim = new THREE.Color('#a8505a');
const _plcTop = new THREE.Color('#b25a60');
const _plcTmp = new THREE.Color();
const _vStart = new THREE.Vector3(0.01, 0.16, 0);
const _vMid = new THREE.Vector3();
const _vEnd = new THREE.Vector3();

function buildPlacentaGeometry(pr: number, latheSegs: number, vesselSegs: number): { body: THREE.LatheGeometry; vessels: THREE.BufferGeometry[] } {
  const R = 0.55 * pr + 0.1;
  const profile: THREE.Vector2[] = [
    new THREE.Vector2(0.001, 0),
    new THREE.Vector2(0.55 * R, 0.004),
    new THREE.Vector2(0.85 * R, 0.02),
    new THREE.Vector2(R, 0.05),
    new THREE.Vector2(0.97 * R, 0.1),
    new THREE.Vector2(0.8 * R, 0.145),
    new THREE.Vector2(0.45 * R, 0.163),
    new THREE.Vector2(0.001, 0.17),
  ];
  const geo = new THREE.LatheGeometry(profile, latheSegs);
  // Organic edge irregularity + radial vascular gradient via vertex colors.
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const colors = new Float32Array(pos.count * 3);
  const tmp = _plcTmp;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    const rad = Math.sqrt(x * x + z * z);
    const ang = Math.atan2(z, x);
    const wob = 1 + (hash(ang * 3.7) - 0.5) * 0.1 * Math.min(1, rad / R);
    pos.setX(i, x * wob);
    pos.setZ(i, z * wob);
    const u = clamp01(rad / R + (hash(i * 1.7) - 0.5) * 0.15);
    tmp.copy(_plcCore).lerp(_plcMid, smooth(0, 0.6, u)).lerp(_plcRim, smooth(0.55, 1, u));
    if (y > 0.12) tmp.lerp(_plcTop, 0.25);
    colors[i * 3] = tmp.r; colors[i * 3 + 1] = tmp.g; colors[i * 3 + 2] = tmp.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();

  const vessels: THREE.BufferGeometry[] = [];
  const nv = 7;
  for (let i = 0; i < nv; i++) {
    const a = (i / nv) * Math.PI * 2 + 0.4;
    const start = _vStart;
    const end = _vEnd.set(Math.cos(a) * 0.82 * R, 0.105, Math.sin(a) * 0.82 * R);
    const mid = _vMid.copy(start).lerp(end, 0.5).add(_pt.set(0, 0.035, 0));
    const curve = new THREE.QuadraticBezierCurve3(start, mid, end);
    vessels.push(new THREE.TubeGeometry(curve, vesselSegs, 0.006 + 0.008 * pr, 5, false));
  }
  return { body: geo, vessels };
}

/* ------------------------------------------------------------------ */
/*  Contextual annotations (Wave 3.5 — content from studio-content.ts,  */
/*  pulsing markers + click popovers with citations, keyboard-safe)     */
/* ------------------------------------------------------------------ */

/**
 * Shared educational annotation markers (pulsing pins + click popovers).
 * The fetus renderer passes no anchorFn (parametric anchors); the conception
 * renderer passes its fixed cellular-stage anchors.
 */
export function AnnotationMarkers({ week, lang, closeLabel, portal, anchorFn }: { week: number; lang: 'fa' | 'en'; closeLabel?: string; portal?: React.RefObject<HTMLElement>; anchorFn?: (target: AnnotationTarget) => [number, number, number] }) {
  // Active popovers are stamped with their stage week; a popover from another
  // week is simply not rendered. This avoids remounting the drei <Html> roots
  // on stage change (React 19 "synchronously unmount a root" race) and avoids
  // setState-in-effect for the reset.
  const [active, setActive] = useState<{ week: number; target: AnnotationTarget } | null>(null);
  const content = useMemo(() => stageContentForWeek(week), [week]);
  const p = useMemo(() => paramsForWeek(week), [week]);
  const fa = lang === 'fa';
  const openTarget: AnnotationTarget | null = active && active.week === week ? active.target : null;

  return (
    <>
      {content.annotations.map((a) => {
        const pos = anchorFn ? anchorFn(a.target) : annotationAnchor(p, a.target);
        const label = fa ? a.labelFa : a.labelEn;
        const text = fa ? a.textFa : a.textEn;
        const citation = fa ? a.citationFa : a.citationEn;
        return (
          <Html key={a.target} position={pos} center distanceFactor={6} zIndexRange={[10, 0]} portal={portal}>
            {openTarget === a.target ? (
              <Card
                role="dialog"
                aria-label={label}
                dir={fa ? 'rtl' : 'ltr'}
                className="w-72 max-w-xs border-primary/30 shadow-xl"
              >
                <CardContent className="space-y-1.5 p-3">
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-3 w-3 shrink-0" aria-hidden>
                      <span className="relative inline-flex h-3 w-3 rounded-full border-2 border-white bg-primary shadow" />
                    </span>
                    <CardTitle className="text-xs leading-snug">{label}</CardTitle>
                    <button
                      onClick={() => setActive(null)}
                      onKeyDown={(e) => {
                        if (e.key === 'Escape') setActive(null);
                      }}
                      aria-label={closeLabel}
                      className="-me-1 ms-auto flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <p className="text-[11px] leading-relaxed text-foreground/85">{text}</p>
                  <p className="text-[9px] italic leading-snug text-muted-foreground">{citation}</p>
                </CardContent>
              </Card>
            ) : (
              <button
                onClick={() => setActive({ week, target: a.target })}
                aria-haspopup="dialog"
                aria-label={label}
                className="flex cursor-pointer items-center gap-1.5"
              >
                <span className="relative flex h-3.5 w-3.5" aria-hidden>
                  <span
                    className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary/50"
                    style={{ animationDuration: '2.4s' }}
                  />
                  <span className="relative inline-flex h-3.5 w-3.5 rounded-full border-2 border-white bg-primary shadow" />
                </span>
                <span className="niva-card rounded-full border px-2 py-0.5 text-[10px] font-semibold whitespace-nowrap text-foreground/90 shadow">
                  {label}
                </span>
              </button>
            )}
          </Html>
        );
      })}
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Soft radial glow texture (shared generator)                        */
/* ------------------------------------------------------------------ */

export function makeGlowTexture(size = 64): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.35, 'rgba(255,255,255,0.55)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}
