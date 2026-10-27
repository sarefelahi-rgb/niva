'use client';

/**
 * Landing hero — "Embrace" (آغوش) scene v2 — cinematic polish pass.
 *
 * A deliberately maternal, childlike ambience rendered in 3D, upgraded from
 * the Wave 8 baseline to a studio-grade composition:
 * - Studio lighting via drei <Environment> Lightformers (static, frames={1})
 *   → real reflections on physical materials, zero HDR downloads.
 * - Custom fresnel rim shader on the translucent embrace shell.
 * - The child: a serene, stylized FETUS — curled profile with closed eyes,
 *   folded limbs and a warm subsurface-like skin, sculpted from soft-blended
 *   primitives; heartbeat halo + mandorla rings + pulsing inner light.
 * - GROWTH JOURNEY — eight stages driven by the landing's journey chips
 *   (auto-cycled, click to jump), each with its own week-informed
 *   morphology instead of one rescaled model: fertilization (translucent
 *   ovum with corona radiata, zona pellucida, polar body, two pronuclei
 *   and swimming sperm), the blastocyst (trophectoderm, inner cell mass,
 *   blastocoel, hatching zona), the EARLY EMBRYO (weeks 4–5: deep C-curve,
 *   huge head fold, somite ridge, tail bud, heart prominence at ~140 bpm,
 *   yolk sac), the LATE EMBRYO (weeks 6–8: paddle hands with finger rays,
 *   lens vesicles, ear ridges, regressing tail), and four fetal stages
 *   (weeks 9–13 fused eyelids & separated fingers, 14–22 hands near the
 *   face, 23–30 open dark irises & forming cheeks, and the term newborn
 *   with vernix-creamy skin and a clear sleeping face). The cord grows
 *   thicker and re-anchors at the navel of each stage's model.
 * - Anatomically-inspired cord: a twisted two-vessel helix (Frenet frames)
 *   anchored at the fetus's navel.
 * - Amniotic shimmer bubbles drift inside the shell.
 * - Three celestial orbit rings with gliding beads (differential speeds).
 * - Glassy floating orbs bobbing at individual phases.
 * - Soft bokeh depth sprites + a luminous pool beneath the embrace.
 * - Stardust: shader points with per-particle size, phase & twinkle — soft
 *   round falloff (no square points).
 * - Cinematic camera: breathing dolly + pointer parallax, responsive dolly-out
 *   on narrow viewports so nothing clips on mobile.
 *
 * Integrity: a serene, deliberately STYLIZED fetus — an educational ambiance
 * visual, not an anatomically accurate or diagnostic rendering (the parametric
 * studio lives in src/components/studio/ and is never loaded on the landing).
 * Nothing here claims clinical validity.
 *
 * Performance contract (keeps LCP/INP budgets intact):
 * - mounted via next/dynamic { ssr:false } AFTER idle — never competes with LCP
 * - dpr capped at 1.5, low-power GL preference, no shadows/post-processing/
 *   transmission; Environment renders once (frames={1}, resolution 64)
 * - renders pause (frameloop:'never') when the canvas leaves the viewport
 * - prefers-reduced-motion renders a single static frame (no animation loop)
 * - imperative geometries/textures are disposed on unmount (R-11 lesson)
 */

import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Environment, Lightformer } from '@react-three/drei';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import * as THREE from 'three';

/* Brand palette (Calm Bloom) */
const C = {
  shell: '#a99bd6',
  shellDeep: '#8d7cc2',
  shellGlow: '#cfc3ec',
  pearl: '#ffd9c9',
  pearlGlow: '#ff9d85',
  cord: '#e08d7a',
  cordLight: '#f0b3a3',
  sage: '#8faf8f',
  coral: '#e08d7a',
  lavender: '#c9bce2',
  ivory: '#fff7ef',
} as const;

/* Dark detail color — lash lines, lip seams, fused-lid seams */
const DARK = '#5d3a33';

/**
 * Double-thump heartbeat envelope: two soft bumps per period.
 * `period` adapts to the stage — the embryonic heart flutters at ~140 bpm
 * (period ≈ 0.43 s) while the larger scenes keep the calm ambient cadence.
 */
function heartbeat(t: number, period = 1.15): number {
  const phase = (t % period) / period;
  const bump = (c: number, w: number) => Math.exp(-((phase - c) ** 2) / (w * w));
  return 1 + 0.085 * bump(0.12, 0.05) + 0.05 * bump(0.3, 0.06);
}

/** Procedural radial-glow texture for halos / bokeh / pools (no assets). */
function makeGlowTexture(): THREE.CanvasTexture {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.35, 'rgba(255,255,255,0.42)');
    g.addColorStop(0.7, 'rgba(255,255,255,0.1)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/* ---------------------------------------------------------------- shaders */

const FRESNEL_VERT = /* glsl */ `
  varying vec3 vNormalW;
  varying vec3 vViewW;
  void main() {
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vNormalW = normalize(mat3(modelMatrix) * normal);
    vViewW = normalize(cameraPosition - wp.xyz);
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;

const FRESNEL_FRAG = /* glsl */ `
  uniform vec3 uColor;
  uniform float uPower;
  uniform float uIntensity;
  varying vec3 vNormalW;
  varying vec3 vViewW;
  void main() {
    float f = 1.0 - abs(dot(normalize(vNormalW), normalize(vViewW)));
    float a = pow(f, uPower) * uIntensity;
    gl_FragColor = vec4(uColor, a);
  }
`;

const DUST_VERT = /* glsl */ `
  attribute float aSize;
  attribute float aPhase;
  attribute vec3 aColor;
  uniform float uTime;
  uniform float uPR;
  varying vec3 vColor;
  varying float vTwinkle;
  void main() {
    vColor = aColor;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    float tw = 0.55 + 0.45 * sin(uTime * (1.0 + fract(aPhase) * 1.6) + aPhase * 6.2831);
    vTwinkle = tw;
    gl_PointSize = aSize * uPR * tw * (150.0 / -mv.z);
    gl_Position = projectionMatrix * mv;
  }
`;

const DUST_FRAG = /* glsl */ `
  varying vec3 vColor;
  varying float vTwinkle;
  void main() {
    float d = length(gl_PointCoord - vec2(0.5));
    float a = smoothstep(0.5, 0.06, d);
    gl_FragColor = vec4(vColor, a * 0.9 * vTwinkle);
  }
`;

/* -------------------------------------------------------------- sub-scenes */

/** Additive fresnel rim — professional edge glow for translucent shells. */
function FresnelRim({
  radius,
  color,
  power = 2.8,
  intensity = 0.85,
  scale = 1.02,
}: {
  radius: number;
  color: string;
  power?: number;
  intensity?: number;
  scale?: number;
}) {
  const uniforms = useMemo(
    () => ({
      uColor: { value: new THREE.Color(color) },
      uPower: { value: power },
      uIntensity: { value: intensity },
    }),
    [color, power, intensity]
  );
  return (
    <mesh scale={scale}>
      <sphereGeometry args={[radius, 48, 48]} />
      <shaderMaterial
        vertexShader={FRESNEL_VERT}
        fragmentShader={FRESNEL_FRAG}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  );
}

/** Twinkling stardust — soft round shader points, imperative geometry. */
function Stardust() {
  const mat = useRef<THREE.ShaderMaterial>(null);
  const dpr = useThree((s) => s.viewport.dpr);

  const geo = useMemo(() => {
    const N = 150;
    const pos = new Float32Array(N * 3);
    const col = new Float32Array(N * 3);
    const size = new Float32Array(N);
    const phase = new Float32Array(N);
    const palette = [new THREE.Color(C.ivory), new THREE.Color(C.sage), new THREE.Color(C.coral), new THREE.Color(C.lavender), new THREE.Color(C.pearlGlow)];
    for (let i = 0; i < N; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 1.7 + Math.random() * 1.6;
      pos[i * 3] = Math.sin(phi) * Math.cos(theta) * r;
      pos[i * 3 + 1] = Math.cos(phi) * r * 0.85;
      pos[i * 3 + 2] = Math.sin(phi) * Math.sin(theta) * r * 0.7 - 0.35;
      const c = palette[i % palette.length];
      col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
      size[i] = 0.1 + Math.random() * 0.24;
      phase[i] = Math.random();
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('aColor', new THREE.BufferAttribute(col, 3));
    g.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
    g.setAttribute('aPhase', new THREE.BufferAttribute(phase, 1));
    return g;
  }, []);
  useEffect(() => () => geo.dispose(), [geo]);

  useFrame(({ clock }) => {
    if (!mat.current) return;
    mat.current.uniforms.uTime.value = clock.getElapsedTime();
    mat.current.uniforms.uPR.value = dpr;
  });

  return (
    <points geometry={geo}>
      <shaderMaterial
        ref={mat}
        vertexShader={DUST_VERT}
        fragmentShader={DUST_FRAG}
        uniforms={useMemo(() => ({ uTime: { value: 0 }, uPR: { value: 1 } }), [])}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

/** Thin celestial orbit ring with a glowing bead gliding along it. */
function OrbitRing({
  radius,
  tiltX,
  tiltZ,
  speed,
  phase,
  color,
}: {
  radius: number;
  tiltX: number;
  tiltZ: number;
  speed: number;
  phase: number;
  color: string;
}) {
  const bead = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (!bead.current) return;
    const a = clock.getElapsedTime() * speed + phase;
    bead.current.position.set(Math.cos(a) * radius, Math.sin(a) * radius, 0);
  });
  return (
    <group rotation={[tiltX, 0, tiltZ]}>
      <mesh>
        <torusGeometry args={[radius, 0.0085, 8, 128]} />
        <meshBasicMaterial color={color} transparent opacity={0.32} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
      <mesh ref={bead}>
        <sphereGeometry args={[0.042, 16, 16]} />
        <meshBasicMaterial color={color} transparent opacity={0.9} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
    </group>
  );
}

/** Small glassy orb bobbing on its own phase. */
function Orb({
  position,
  radius,
  color,
  speed,
  phase,
  amp,
}: {
  position: [number, number, number];
  radius: number;
  color: string;
  speed: number;
  phase: number;
  amp: number;
}) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (ref.current) {
      ref.current.position.y = position[1] + Math.sin(clock.getElapsedTime() * speed + phase) * amp;
    }
  });
  return (
    <mesh ref={ref} position={position}>
      <sphereGeometry args={[radius, 20, 20]} />
      <meshPhysicalMaterial
        color={color}
        roughness={0.08}
        metalness={0}
        clearcoat={1}
        clearcoatRoughness={0.1}
        iridescence={0.55}
        iridescenceIOR={1.3}
        transparent
        opacity={0.85}
        envMapIntensity={1.2}
      />
    </mesh>
  );
}

/** Depth-of-field bokeh sprites + luminous pool under the embrace. */
function Bokeh({ tex }: { tex: THREE.CanvasTexture }) {
  const group = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (group.current) group.current.position.y = Math.sin(clock.getElapsedTime() * 0.2) * 0.08;
  });
  const blobs = useMemo(
    () =>
      [
        { p: [-1.9, 1.1, -1.6] as const, s: 2.6, c: C.sage, o: 0.1 },
        { p: [1.8, 0.8, -2.0] as const, s: 3.2, c: C.lavender, o: 0.12 },
        { p: [2.2, -1.2, -1.4] as const, s: 2.2, c: C.coral, o: 0.08 },
        { p: [-2.2, -0.9, -1.8] as const, s: 2.8, c: C.pearl, o: 0.09 },
        { p: [0.4, 1.9, -2.4] as const, s: 3.4, c: C.shellGlow, o: 0.1 },
        { p: [-0.5, -1.8, -2.2] as const, s: 2.6, c: C.ivory, o: 0.07 },
      ] as const,
    []
  );
  return (
    <group ref={group}>
      {blobs.map((b, i) => (
        <sprite key={i} position={[b.p[0], b.p[1], b.p[2]]} scale={[b.s, b.s, 1]}>
          <spriteMaterial map={tex} color={b.c} transparent opacity={b.o} blending={THREE.AdditiveBlending} depthWrite={false} />
        </sprite>
      ))}
      {/* luminous pool beneath the embrace */}
      <sprite position={[0, -2.1, -0.4]} scale={[4.6, 1.15, 1]}>
        <spriteMaterial map={tex} color={C.shellGlow} transparent opacity={0.16} blending={THREE.AdditiveBlending} depthWrite={false} />
      </sprite>
    </group>
  );
}

/** Twisted two-vessel cord — main tube + helical wrap (Frenet frames). */
function Cord({ end, mainR = 0.02, wrapR = 0.0065 }: { end: V3; mainR?: number; wrapR?: number }) {
  const { mainGeo, wrapGeo } = useMemo(() => {
    const main = new THREE.CubicBezierCurve3(
      new THREE.Vector3(1.0, -0.55, 0.72),
      new THREE.Vector3(0.72, -0.6, 0.55),
      new THREE.Vector3((0.72 + end[0]) / 2 + 0.04, -0.28, 0.42),
      new THREE.Vector3(end[0], end[1], end[2])
    );
    const SEG = 140;
    const frames = main.computeFrenetFrames(SEG, false);
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= SEG; i++) {
      const u = i / SEG;
      const p = main.getPoint(u);
      const ang = u * Math.PI * 12; // 6 gentle twists
      // Tapered helix radius → organic vessel twist, not a machine spring
      const helixR = 0.008 + 0.05 * Math.pow(Math.sin(u * Math.PI), 1.3);
      pts.push(
        p
          .clone()
          .add(frames.normals[i].clone().multiplyScalar(Math.cos(ang) * helixR))
          .add(frames.binormals[i].clone().multiplyScalar(Math.sin(ang) * helixR))
      );
    }
    const wrap = new THREE.CatmullRomCurve3(pts);
    return {
      mainGeo: new THREE.TubeGeometry(main, 48, mainR, 8, false),
      wrapGeo: new THREE.TubeGeometry(wrap, SEG, wrapR, 6, false),
    };
  }, [end, mainR, wrapR]);
  useEffect(
    () => () => {
      mainGeo.dispose();
      wrapGeo.dispose();
    },
    [mainGeo, wrapGeo]
  );
  const mat = (
    <meshPhysicalMaterial color={C.cord} roughness={0.42} clearcoat={0.4} sheen={0.6} sheenColor={C.cordLight} />
  );
  return (
    <group>
      <mesh geometry={mainGeo}>{mat}</mesh>
      <mesh geometry={wrapGeo}>
        <meshStandardMaterial color={C.cordLight} roughness={0.38} />
      </mesh>
      {/* joint caps — wall anchor + navel */}
      <mesh position={[1.0, -0.55, 0.72]}>
        <sphereGeometry args={[0.02, 10, 10]} />
        <meshStandardMaterial color={C.cord} roughness={0.42} />
      </mesh>
      <mesh position={end}>
        <sphereGeometry args={[0.02, 10, 10]} />
        <meshStandardMaterial color={C.cord} roughness={0.42} />
      </mesh>
    </group>
  );
}

/* --------------------------------------------------------------- the child */

type V3 = [number, number, number];

/** A soft limb segment between two points (capsule oriented A→B). */
function Limb({ a, b, r, material }: { a: V3; b: V3; r: number; material: THREE.Material }) {
  const { mid, quat, len } = useMemo(() => {
    const va = new THREE.Vector3(...a);
    const vb = new THREE.Vector3(...b);
    const dir = vb.clone().sub(va);
    const l = dir.length();
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
    return { mid: va.clone().add(vb).multiplyScalar(0.5), quat: q, len: l };
  }, [a, b]);
  return (
    <mesh position={mid} quaternion={quat} material={material}>
      <capsuleGeometry args={[r, Math.max(len - r * 1.6, 0.01), 6, 14]} />
    </mesh>
  );
}

/** Amniotic shimmer — tiny bubbles drifting inside the shell. */
function Bubbles() {
  const group = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (!group.current) return;
    group.current.position.y = Math.sin(t * 0.22) * 0.05;
    group.current.rotation.y = t * 0.04;
  });
  const items = useMemo<{ p: V3; r: number }[]>(
    () => [
      { p: [0.55, 0.35, 0.5], r: 0.024 },
      { p: [-0.62, 0.12, 0.42], r: 0.018 },
      { p: [0.32, -0.55, 0.45], r: 0.02 },
      { p: [-0.38, -0.4, 0.55], r: 0.016 },
      { p: [0.68, -0.08, 0.2], r: 0.014 },
      { p: [-0.22, 0.55, 0.32], r: 0.022 },
    ],
    []
  );
  return (
    <group ref={group}>
      {items.map((b, i) => (
        <mesh key={i} position={b.p}>
          <sphereGeometry args={[b.r, 12, 12]} />
          <meshPhysicalMaterial color="#ffffff" transparent opacity={0.26} roughness={0.08} clearcoat={1} depthWrite={false} />
        </mesh>
      ))}
    </group>
  );
}

/* ----------------------------------------------------------- growth journey */

/**
 * Eight bespoke scenes cover the whole journey, weeks 1–40:
 *  0 · fertilization (wk 1) — translucent ovum with two pronuclei, a polar
 *    body, zona pellucida, corona radiata escort and four sperm whose
 *    segmented tails undulate with a traveling wave.
 *  1 · cell division (wk 2–3) — the blastocyst: trophectoderm shell of
 *    flattened cells, inner cell mass as a compact knob at one pole, the
 *    blastocoel cavity and a thin zona pellucida with a hatching gap.
 *  2 · early embryo (wk 4–5) — the classic deep-C: huge head fold in
 *    cranial flexure, somite ridge, tail bud, bulging heart prominence
 *    (~140 bpm), yolk sac on its vitelline duct, nascent limb buds.
 *  3 · late embryo (wk 6–8) — the curl evolves: paddle hands with faint
 *    finger rays, leg paddles, dark lens vesicles, ear ridges, a tail
 *    that is nearly gone.
 *  4 · early fetus (wk 9–13) — head ≈½ of length, eyelids fused shut,
 *    separated fingers and toes, low-set ears, body straightening.
 *  5 · fetus (wk 14–22) — head ≈⅓, faint lips and brows, hands near the
 *    face, softly glowing translucent skin.
 *  6 · late fetus (wk 23–30) — head ≈¼+, plumpness beginning, eyes open
 *    with dark irises, brows and lashes, cheeks forming.
 *  7 · term (wk 31–40) — the flagship: a plump newborn with vernix-creamy
 *    skin and a clear sleeping face — lash lines curving toward the cheek,
 *    soft brows, nostrils, rosy lips, chubby cheeks and ears.
 * Educational ambiance — stylized, never a diagnostic model.
 */

/** Stage placement registry — the models and the cord anchors share these
 *  constants, so the cord always meets each navel by construction. */
type Placement = { pos: V3; yaw: number; scale: number };

const P_EMBRYO_EARLY: Placement = { pos: [0, -0.1, 0.1], yaw: 0.42, scale: 0.74 };
const P_EMBRYO_LATE: Placement = { pos: [0, -0.06, 0.1], yaw: 0.4, scale: 0.82 };
const P_FETAL: Placement[] = [
  { pos: [0, -0.03, 0.12], yaw: 0.44, scale: 0.98 }, // wk 9–13
  { pos: [0, -0.02, 0.12], yaw: 0.42, scale: 1.08 }, // wk 14–22
  { pos: [0, -0.02, 0.12], yaw: 0.4, scale: 1.16 }, // wk 23–30
  { pos: [0, -0.03, 0.12], yaw: 0.38, scale: 1.28 }, // wk 31–40
];

/** Maps a point in a model's local space to scene space (base pose). */
function placed(p: V3, pl: Placement): V3 {
  const c = Math.cos(pl.yaw);
  const s = Math.sin(pl.yaw);
  return [
    pl.pos[0] + (p[0] * c + p[2] * s) * pl.scale,
    pl.pos[1] + p[1] * pl.scale,
    pl.pos[2] + (-p[0] * s + p[2] * c) * pl.scale,
  ];
}

/** Cord anchor + thickness per stage (null = no cord yet): slender in the
 *  embryonic weeks → thick with Wharton's jelly by term. */
const CORDS: ({ end: V3; mainR: number; wrapR: number } | null)[] = [
  null,
  null,
  { end: placed([0.02, 0.0, 0.075], P_EMBRYO_EARLY), mainR: 0.011, wrapR: 0.004 },
  { end: placed([0.04, 0.02, 0.08], P_EMBRYO_LATE), mainR: 0.015, wrapR: 0.005 },
  { end: placed([-0.04, 0.03, 0.11], P_FETAL[0]), mainR: 0.018, wrapR: 0.006 },
  { end: placed([-0.04, 0.02, 0.112], P_FETAL[1]), mainR: 0.021, wrapR: 0.007 },
  { end: placed([-0.03, 0.02, 0.121], P_FETAL[2]), mainR: 0.025, wrapR: 0.008 },
  { end: placed([-0.03, 0.03, 0.146], P_FETAL[3]), mainR: 0.028, wrapR: 0.009 },
];

/** Mandorla ring scale per stage — the rings always frame the child. */
const MANDORLA = [0.5, 0.5, 0.62, 0.68, 0.8, 0.88, 0.94, 1] as const;

/** Per-stage camera dolly: microscopic stages invite a lean-in; the growing
 *  child pulls the camera back step by step. */
const STAGE_Z = [4.55, 4.55, 4.75, 4.85, 5.0, 5.1, 5.2, 5.35] as const;

/** Entrance wrapper — each stage blooms in with a soft ease-out scale. */
function StageGate({ stage, reducedMotion, children }: { stage: number; reducedMotion: boolean; children: ReactNode }) {
  const group = useRef<THREE.Group>(null);
  const t0 = useRef<number | null>(null);
  useEffect(() => {
    t0.current = null;
  }, [stage]);
  useFrame(({ clock }) => {
    if (reducedMotion || !group.current) return;
    if (t0.current === null) t0.current = clock.getElapsedTime();
    const k = Math.min((clock.getElapsedTime() - t0.current) / 0.7, 1);
    const e = 1 - Math.pow(1 - k, 3);
    group.current.scale.setScalar(0.82 + 0.18 * e);
  });
  return (
    <group ref={group} scale={reducedMotion ? 1 : 0.82}>
      {children}
    </group>
  );
}

/** Journey stage 0 — the radiant egg: zona pellucida, corona radiata,
 *  polar body and two pronuclei (the two genomes meeting). */
function Egg({ tex }: { tex: THREE.CanvasTexture }) {
  const corona = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (corona.current) corona.current.rotation.z = clock.getElapsedTime() * 0.12;
  });
  const cells = useMemo(
    () =>
      Array.from({ length: 16 }, (_, i) => {
        const a = (i / 16) * Math.PI * 2;
        const r = 0.44 + (i % 2) * 0.035 + (i % 3) * 0.012;
        return { p: [Math.cos(a) * r, Math.sin(a) * r, (i % 3) * 0.05 - 0.05] as V3, r: 0.03 + (i % 4) * 0.004 };
      }),
    []
  );
  return (
    <group position={[0, -0.05, 0.1]}>
      <sprite scale={[1.4, 1.4, 1]}>
        <spriteMaterial map={tex} color="#ffd9a1" transparent opacity={0.3} blending={THREE.AdditiveBlending} depthWrite={false} />
      </sprite>
      {/* zona pellucida — the glycoprotein shell around the ovum */}
      <mesh>
        <sphereGeometry args={[0.4, 44, 44]} />
        <meshPhysicalMaterial
          color="#ffe9d2"
          roughness={0.18}
          transparent
          opacity={0.13}
          clearcoat={1}
          clearcoatRoughness={0.2}
          iridescence={0.55}
          iridescenceIOR={1.3}
          depthWrite={false}
          envMapIntensity={0.8}
        />
      </mesh>
      {/* ovum — softly translucent so the pronuclei show within */}
      <mesh>
        <sphereGeometry args={[0.34, 44, 44]} />
        <meshPhysicalMaterial
          color="#ffddb8"
          roughness={0.24}
          clearcoat={1}
          clearcoatRoughness={0.2}
          transparent
          opacity={0.62}
          emissive="#ff9d85"
          emissiveIntensity={0.3}
          iridescence={0.3}
          iridescenceIOR={1.3}
          envMapIntensity={0.9}
        />
      </mesh>
      {/* two pronuclei — egg and sperm genomes side by side */}
      <mesh position={[-0.06, 0.035, 0.2]}>
        <sphereGeometry args={[0.072, 20, 20]} />
        <meshPhysicalMaterial color="#ffb98f" roughness={0.3} transparent opacity={0.78} emissive="#ff8a70" emissiveIntensity={0.5} />
      </mesh>
      <mesh position={[0.075, -0.025, 0.19]}>
        <sphereGeometry args={[0.072, 20, 20]} />
        <meshPhysicalMaterial color="#ffb98f" roughness={0.3} transparent opacity={0.78} emissive="#ff8a70" emissiveIntensity={0.5} />
      </mesh>
      {/* nucleoli */}
      <mesh position={[-0.06, 0.045, 0.26]}>
        <sphereGeometry args={[0.018, 8, 8]} />
        <meshStandardMaterial color="#e07a5f" roughness={0.4} />
      </mesh>
      <mesh position={[0.075, -0.015, 0.25]}>
        <sphereGeometry args={[0.018, 8, 8]} />
        <meshStandardMaterial color="#e07a5f" roughness={0.4} />
      </mesh>
      {/* polar body — the tiny first-division bump under the zona */}
      <mesh position={[-0.26, 0.21, 0.12]} scale={[1, 1, 0.8]}>
        <sphereGeometry args={[0.05, 14, 14]} />
        <meshPhysicalMaterial color="#ffe6c9" roughness={0.3} clearcoat={0.8} emissive="#ff9d85" emissiveIntensity={0.18} />
      </mesh>
      {/* corona radiata — escorting cells outside the zona */}
      <group ref={corona}>
        {cells.map((c, i) => (
          <mesh key={i} position={c.p}>
            <sphereGeometry args={[c.r, 10, 10]} />
            <meshStandardMaterial color="#ffe3c9" roughness={0.4} transparent opacity={0.72} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

/** A single sperm — elongated teardrop head, mitochondrial midpiece and a
 *  three-segment tail undulating with a traveling wave (phase-lagged
 *  chain — zero per-frame allocation). */
function Sperm({
  radius,
  speed,
  phase,
  reducedMotion,
}: {
  radius: number;
  speed: number;
  phase: number;
  reducedMotion: boolean;
}) {
  const g = useRef<THREE.Group>(null);
  const t1 = useRef<THREE.Group>(null);
  const t2 = useRef<THREE.Group>(null);
  const t3 = useRef<THREE.Group>(null);

  const segGeo = useMemo(() => {
    const mk = (len: number, r: number) => {
      const pts: THREE.Vector3[] = [];
      for (let i = 0; i <= 8; i++) {
        const u = i / 8;
        pts.push(new THREE.Vector3(-u * len, Math.sin(u * Math.PI) * 0.012, 0));
      }
      return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 12, r, 6, false);
    };
    return [mk(0.11, 0.0075), mk(0.1, 0.0055), mk(0.09, 0.0038)];
  }, []);
  useEffect(() => () => segGeo.forEach((geo) => geo.dispose()), [segGeo]);

  useFrame(({ clock }) => {
    if (reducedMotion || !g.current) return;
    const t = clock.getElapsedTime();
    const a = t * speed + phase;
    // Lissajous drift around the egg, head always facing the travel direction
    g.current.position.set(Math.cos(a) * radius, Math.sin(a) * radius * 0.62, Math.sin(a * 1.7) * 0.16);
    g.current.rotation.z = Math.atan2(0.62 * Math.cos(a), -Math.sin(a));
    // traveling wave down the tail — phase-lagged segments
    const w = t * 9 + phase * 6.3;
    if (t1.current) t1.current.rotation.z = Math.sin(w) * 0.42;
    if (t2.current) t2.current.rotation.z = Math.sin(w - 1.2) * 0.55;
    if (t3.current) t3.current.rotation.z = Math.sin(w - 2.4) * 0.68;
  });

  return (
    <group ref={g}>
      {/* elongated teardrop head */}
      <mesh scale={[1.75, 0.78, 0.78]}>
        <sphereGeometry args={[0.045, 18, 18]} />
        <meshPhysicalMaterial color="#fff1e4" roughness={0.3} clearcoat={0.8} emissive="#ffd9c9" emissiveIntensity={0.3} />
      </mesh>
      {/* mitochondrial midpiece */}
      <mesh position={[-0.075, 0, 0]}>
        <sphereGeometry args={[0.016, 10, 10]} />
        <meshStandardMaterial color="#ffe8d8" roughness={0.4} transparent opacity={0.85} />
      </mesh>
      {/* tail — three phase-lagged segments → a sinusoidal traveling wave */}
      <group ref={t1} position={[-0.08, 0, 0]}>
        <mesh geometry={segGeo[0]}>
          <meshStandardMaterial color="#ffe8d8" roughness={0.5} transparent opacity={0.8} />
        </mesh>
        <group ref={t2} position={[-0.105, 0.002, 0]}>
          <mesh geometry={segGeo[1]}>
            <meshStandardMaterial color="#ffe8d8" roughness={0.5} transparent opacity={0.75} />
          </mesh>
          <group ref={t3} position={[-0.095, 0.002, 0]}>
            <mesh geometry={segGeo[2]}>
              <meshStandardMaterial color="#ffe8d8" roughness={0.5} transparent opacity={0.7} />
            </mesh>
          </group>
        </group>
      </group>
    </group>
  );
}

/** Journey stage 0 — fertilization: four swimmers closing on the ovum. */
function Fertilization({ reducedMotion, tex }: { reducedMotion: boolean; tex: THREE.CanvasTexture }) {
  return (
    <group>
      <Egg tex={tex} />
      <group rotation={[0.55, 0, 0.2]}>
        <Sperm radius={1.05} speed={0.5} phase={0} reducedMotion={reducedMotion} />
        <Sperm radius={0.85} speed={-0.42} phase={2.2} reducedMotion={reducedMotion} />
        <Sperm radius={1.22} speed={0.34} phase={4.1} reducedMotion={reducedMotion} />
        <Sperm radius={0.95} speed={-0.46} phase={5.3} reducedMotion={reducedMotion} />
      </group>
    </group>
  );
}

/**
 * Journey stage 1 — weeks 2–3: the BLASTOCYST, not a mere ball.
 * - Trophectoderm: a shell of flattened epithelial cells on the outside.
 * - Inner cell mass: a compact knob of cells pressed against one pole.
 * - Blastocoel: the fluid-filled cavity glowing within.
 * - Zona pellucida: the thin shell with a hatching gap and two cells
 *   squeezing through — the day-5 hatch hinted at the edge.
 */
function Blastocyst({ reducedMotion, tex }: { reducedMotion: boolean; tex: THREE.CanvasTexture }) {
  const cluster = useRef<THREE.Group>(null);

  const trophMat = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: '#ffddc0',
        roughness: 0.26,
        clearcoat: 0.8,
        clearcoatRoughness: 0.25,
        emissive: new THREE.Color('#ff9d85'),
        emissiveIntensity: 0.18,
        sheen: 0.6,
        sheenColor: new THREE.Color('#ff9d85'),
        envMapIntensity: 0.8,
        transparent: true,
        opacity: 0.92,
      }),
    []
  );
  useEffect(() => () => trophMat.dispose(), [trophMat]);
  const icmMat = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: '#ffd6b2',
        roughness: 0.24,
        clearcoat: 0.7,
        emissive: new THREE.Color('#ff9d85'),
        emissiveIntensity: 0.32,
        envMapIntensity: 0.8,
      }),
    []
  );
  useEffect(() => () => icmMat.dispose(), [icmMat]);
  const fluidMat = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: '#fff2e6',
        roughness: 0.05,
        transparent: true,
        opacity: 0.12,
        clearcoat: 1,
        depthWrite: false,
      }),
    []
  );
  useEffect(() => () => fluidMat.dispose(), [fluidMat]);
  const zonaMat = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: '#ffe9d2',
        roughness: 0.15,
        transparent: true,
        opacity: 0.13,
        clearcoat: 1,
        clearcoatRoughness: 0.15,
        iridescence: 0.6,
        iridescenceIOR: 1.3,
        depthWrite: false,
        side: THREE.DoubleSide,
        envMapIntensity: 0.8,
      }),
    []
  );
  useEffect(() => () => zonaMat.dispose(), [zonaMat]);

  /* trophectoderm cells — flattened, tangent to the sphere (golden-angle
     packing, deterministic) */
  const troph = useMemo(() => {
    const N = 26;
    const up = new THREE.Vector3(0, 0, 1);
    const arr: { p: V3; q: THREE.Quaternion; r: number }[] = [];
    for (let i = 0; i < N; i++) {
      const y = 1 - (i / (N - 1)) * 2;
      const rad = Math.sqrt(Math.max(0, 1 - y * y));
      const th = i * 2.39996;
      const dir = new THREE.Vector3(Math.cos(th) * rad, y, Math.sin(th) * rad);
      const q = new THREE.Quaternion().setFromUnitVectors(up, dir.clone().negate());
      arr.push({ p: [dir.x * 0.235, dir.y * 0.235, dir.z * 0.235], q, r: 0.05 + (i % 3) * 0.008 });
    }
    return arr;
  }, []);
  /* inner cell mass — a compact knob at the embryonic pole */
  const icm = useMemo(() => {
    const pole = new THREE.Vector3(0, 0.95, 0.32).normalize();
    const arr: V3[] = [];
    for (let i = 0; i < 9; i++) {
      const y = 1 - (i / 8) * 2;
      const rad = Math.sqrt(Math.max(0, 1 - y * y)) * 0.072;
      const th = i * 2.39996;
      const off = new THREE.Vector3(Math.cos(th) * rad, y * 0.072, Math.sin(th) * rad);
      const p = pole.clone().multiplyScalar(0.17).add(off);
      arr.push([p.x, p.y, p.z]);
    }
    return arr;
  }, []);

  useFrame(({ clock }) => {
    if (reducedMotion || !cluster.current) return;
    const t = clock.getElapsedTime();
    const hb = heartbeat(t);
    // gentle sway keeps the ICM pole and the hatching gap in view
    cluster.current.rotation.y = 0.25 + Math.sin(t * 0.28) * 0.3;
    cluster.current.rotation.x = Math.sin(t * 0.23) * 0.16;
    cluster.current.scale.setScalar(1 + (hb - 1) * 0.7);
  });

  return (
    <group position={[0, -0.05, 0.1]}>
      <sprite scale={[1.2, 1.2, 1]}>
        <spriteMaterial map={tex} color="#ffd9a1" transparent opacity={0.22} blending={THREE.AdditiveBlending} depthWrite={false} />
      </sprite>
      {/* zona pellucida with its hatching gap */}
      <mesh rotation={[0, -0.4, 0]} material={zonaMat}>
        <sphereGeometry args={[0.3, 48, 32, 0.5, 5.3]} />
      </mesh>
      <group ref={cluster}>
        {/* blastocoel — the fluid cavity */}
        <mesh material={fluidMat}>
          <sphereGeometry args={[0.16, 24, 24]} />
        </mesh>
        {/* trophectoderm — flattened cells lying on the sphere */}
        {troph.map((c, i) => (
          <mesh key={i} position={c.p} quaternion={c.q} scale={[1, 1, 0.48]} material={trophMat}>
            <sphereGeometry args={[c.r, 14, 14]} />
          </mesh>
        ))}
        {/* inner cell mass */}
        {icm.map((p, i) => (
          <mesh key={i} position={p} material={icmMat}>
            <sphereGeometry args={[0.05 - (i % 2) * 0.006, 16, 16]} />
          </mesh>
        ))}
        {/* hatch hint — cells squeezing through the gap */}
        <mesh position={[0.27, 0.05, 0.1]} material={trophMat}>
          <sphereGeometry args={[0.03, 10, 10]} />
        </mesh>
        <mesh position={[0.26, -0.06, -0.08]} material={trophMat}>
          <sphereGeometry args={[0.026, 10, 10]} />
        </mesh>
      </group>
    </group>
  );
}

/**
 * Journey stages 2–3 — the EMBRYO, weeks 4–8 (bespoke morphologies).
 * Week-informed silhouette, unmistakably NOT a miniature term baby:
 * - Head ≈ half of crown–rump length, bent forward in cranial flexure.
 * - Deep C-curve ending in a tail — a prominent bud at weeks 4–5, a
 *   regressing nub by weeks 6–8.
 * - Somite ridge along the back; paddle limb buds (faint finger rays
 *   appear in the later weeks); dark optic vesicles that gain a lens.
 * - The heart prominence fluttering at the realistic embryonic rate
 *   (~140 bpm; beating since ~day 22).
 * - The yolk sac, still attached by the vitelline duct.
 * Soft-blended primitives, translucent gel-like skin; educational and
 * stylized — never diagnostic.
 */
function Embryo({ reducedMotion, tex, mature }: { reducedMotion: boolean; tex: THREE.CanvasTexture; mature: boolean }) {
  const group = useRef<THREE.Group>(null);
  const heart = useRef<THREE.Mesh>(null);
  const heartHalo = useRef<THREE.Sprite>(null);
  const P = mature ? P_EMBRYO_LATE : P_EMBRYO_EARLY;

  const skin = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: '#ffd4c4',
        roughness: 0.2,
        metalness: 0,
        clearcoat: 0.5,
        clearcoatRoughness: 0.35,
        transparent: true,
        opacity: 0.93,
        sheen: 1,
        sheenColor: new THREE.Color('#ffb9a3'),
        sheenRoughness: 0.5,
        emissive: new THREE.Color('#ff8a70'),
        emissiveIntensity: 0.16,
        envMapIntensity: 0.7,
      }),
    []
  );
  useEffect(() => () => skin.dispose(), [skin]);
  const somite = useMemo(() => new THREE.MeshStandardMaterial({ color: '#f2b49c', roughness: 0.42 }), []);
  useEffect(() => () => somite.dispose(), [somite]);
  const dark = useMemo(() => new THREE.MeshStandardMaterial({ color: '#5d3a44', roughness: 0.25 }), []);
  useEffect(() => () => dark.dispose(), [dark]);
  const ray = useMemo(() => new THREE.MeshBasicMaterial({ color: '#e8a98f', transparent: true, opacity: 0.65 }), []);
  useEffect(() => () => ray.dispose(), [ray]);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (reducedMotion || !group.current) return;
    // The embryonic heart beats FAST — the whole bud quivers with it
    const hb = heartbeat(t, 0.43);
    group.current.scale.setScalar(P.scale * (1 + (hb - 1) * 0.5));
    group.current.rotation.y = P.yaw + Math.sin(t * 0.3) * 0.05;
    group.current.rotation.z = Math.sin(t * 0.4) * 0.02;
    group.current.position.y = P.pos[1] + Math.sin(t * 0.55 + 0.6) * 0.016;
    if (heart.current) heart.current.scale.setScalar(1 + (hb - 1) * 2.6);
    if (heartHalo.current) {
      const s = 0.42 + (hb - 1) * 3.4;
      heartHalo.current.scale.set(s, s, 1);
      (heartHalo.current.material as THREE.SpriteMaterial).opacity = 0.26 + (hb - 1) * 2.6;
    }
  });

  /* Deep C spine — head end curls far under, tail end sweeps behind */
  const spineGeo = useMemo(() => {
    const spine = new THREE.CatmullRomCurve3(
      mature
        ? [
            new THREE.Vector3(-0.22, 0.31, 0),
            new THREE.Vector3(-0.16, 0.15, -0.01),
            new THREE.Vector3(-0.06, 0.03, -0.012),
            new THREE.Vector3(0.05, -0.03, -0.01),
            new THREE.Vector3(0.14, 0.0, 0),
            new THREE.Vector3(0.18, -0.12, 0),
          ]
        : [
            new THREE.Vector3(-0.2, 0.29, 0),
            new THREE.Vector3(-0.15, 0.14, -0.01),
            new THREE.Vector3(-0.06, 0.02, -0.012),
            new THREE.Vector3(0.04, -0.05, -0.01),
            new THREE.Vector3(0.12, -0.02, 0),
            new THREE.Vector3(0.15, -0.13, 0),
          ]
    );
    return new THREE.TubeGeometry(spine, 32, mature ? 0.064 : 0.06, 14, false);
  }, [mature]);
  useEffect(() => () => spineGeo.dispose(), [spineGeo]);
  const tailGeo = useMemo(() => {
    const tail = new THREE.CatmullRomCurve3(
      mature
        ? [new THREE.Vector3(-0.21, 0.3, 0), new THREE.Vector3(-0.26, 0.34, 0)]
        : [new THREE.Vector3(-0.19, 0.27, 0), new THREE.Vector3(-0.27, 0.34, -0.005), new THREE.Vector3(-0.35, 0.38, 0)]
    );
    return new THREE.TubeGeometry(tail, 16, mature ? 0.015 : 0.021, 8, false);
  }, [mature]);
  useEffect(() => () => tailGeo.dispose(), [tailGeo]);

  return (
    <group ref={group} position={P.pos} rotation={[0, P.yaw, 0]} scale={P.scale}>
      <mesh geometry={spineGeo} material={skin} />
      {/* tail — tapering continuation of the spine (regresses by week 8) */}
      <mesh geometry={tailGeo} material={skin} />
      <mesh position={mature ? [-0.27, 0.345, 0] : [-0.37, 0.385, 0]} rotation={[0, 0, -1.25]} material={skin}>
        <coneGeometry args={[mature ? 0.014 : 0.02, mature ? 0.05 : 0.07, 10]} />
      </mesh>

      {/* head — huge (≈½ CRL), bent in cranial flexure, chin toward chest */}
      <mesh position={[0.16, -0.22, 0]} scale={[0.95, 1.02, 0.98]} material={skin}>
        <sphereGeometry args={[mature ? 0.135 : 0.145, 36, 36]} />
      </mesh>
      {/* forehead / midbrain bulge */}
      <mesh position={[0.11, -0.15, 0]} material={skin}>
        <sphereGeometry args={[mature ? 0.08 : 0.088, 22, 22]} />
      </mesh>

      {/* eyes — dark optic vesicles, gaining a lens vesicle by weeks 6–8 */}
      <mesh position={[mature ? 0.255 : 0.245, -0.24, 0.055]} material={dark}>
        <sphereGeometry args={[mature ? 0.028 : 0.026, 12, 12]} />
      </mesh>
      <mesh position={[mature ? 0.245 : 0.235, -0.25, -0.06]} material={dark}>
        <sphereGeometry args={[mature ? 0.026 : 0.024, 12, 12]} />
      </mesh>
      {mature && (
        <mesh position={[0.272, -0.248, 0.068]} material={ray}>
          <sphereGeometry args={[0.012, 8, 8]} />
        </mesh>
      )}
      {/* ear ridges (late weeks) — small curved ridges low on the head */}
      {mature && (
        <mesh position={[0.1, -0.25, 0.115]} rotation={[0.4, 0.5, 0.6]} material={skin}>
          <torusGeometry args={[0.022, 0.008, 8, 16, 3.6]} />
        </mesh>
      )}

      {/* heart prominence — the bulging first heartbeat (~140 bpm) */}
      <mesh ref={heart} position={[0.08, -0.03, 0.075]}>
        <sphereGeometry args={[mature ? 0.044 : 0.052, 18, 18]} />
        <meshPhysicalMaterial color="#ff9d85" roughness={0.3} emissive="#ff6a55" emissiveIntensity={0.5} clearcoat={0.6} />
      </mesh>
      <sprite ref={heartHalo} position={[0.09, -0.02, 0.1]} scale={[0.42, 0.42, 1]}>
        <spriteMaterial map={tex} color="#ff9d85" transparent opacity={0.26} blending={THREE.AdditiveBlending} depthWrite={false} />
      </sprite>

      {/* rump / belly masses on the spine arc */}
      <mesh position={[-0.05, 0.1, 0]} material={skin}>
        <sphereGeometry args={[mature ? 0.09 : 0.085, 22, 22]} />
      </mesh>
      {mature && (
        <mesh position={[-0.13, 0.2, 0]} material={skin}>
          <sphereGeometry args={[0.07, 20, 20]} />
        </mesh>
      )}

      {/* limb buds — stubby paddles; arms gain faint finger rays by week 7 */}
      <Limb a={[0.04, 0.02, 0.05]} b={[mature ? 0.15 : 0.13, 0.03, 0.06]} r={mature ? 0.024 : 0.02} material={skin} />
      <mesh position={[mature ? 0.18 : 0.15, 0.035, 0.062]} rotation={[0, 0, -0.5]} scale={[1.25, 0.8, 0.5]} material={skin}>
        <sphereGeometry args={[mature ? 0.034 : 0.026, 14, 14]} />
      </mesh>
      {mature && (
        <>
          <Limb a={[0.2, 0.045, 0.065]} b={[0.245, 0.062, 0.065]} r={0.005} material={ray} />
          <Limb a={[0.202, 0.03, 0.065]} b={[0.252, 0.032, 0.065]} r={0.005} material={ray} />
          <Limb a={[0.2, 0.015, 0.065]} b={[0.246, 0.002, 0.065]} r={0.005} material={ray} />
        </>
      )}
      <Limb a={[-0.02, 0.14, 0.05]} b={[mature ? 0.05 : 0.04, 0.22, 0.05]} r={mature ? 0.026 : 0.022} material={skin} />
      <mesh position={[mature ? 0.07 : 0.055, 0.24, 0.05]} rotation={[0, 0, -0.4]} scale={[1.2, 0.85, 0.5]} material={skin}>
        <sphereGeometry args={[mature ? 0.03 : 0.024, 14, 14]} />
      </mesh>

      {/* somites — the segmented ridge along the back (weeks 4–6 hallmark) */}
      {(mature
        ? [
            [-0.09, 0.17, -0.052],
            [-0.13, 0.225, -0.044],
          ]
        : [
            [-0.05, 0.12, -0.058],
            [-0.095, 0.175, -0.052],
            [-0.135, 0.225, -0.044],
            [-0.175, 0.265, -0.034],
          ]
      ).map((p, i) => (
        <mesh key={i} position={p as [number, number, number]} material={somite}>
          <sphereGeometry args={[mature ? 0.014 : 0.018, 10, 10]} />
        </mesh>
      ))}

      {/* yolk sac — still connected by the vitelline duct (weeks 4–8) */}
      <Limb a={[0, 0.05, -0.02]} b={[mature ? -0.1 : -0.09, 0.13, -0.12]} r={mature ? 0.009 : 0.011} material={skin} />
      <mesh position={[mature ? -0.12 : -0.11, 0.15, -0.13]}>
        <sphereGeometry args={[mature ? 0.04 : 0.052, 18, 18]} />
        <meshPhysicalMaterial
          color="#ffe6b8"
          roughness={0.3}
          transparent
          opacity={0.55}
          clearcoat={0.4}
          emissive="#ffcf8f"
          emissiveIntensity={0.2}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}

/* -------------------------------------------------- fetal face & body */

interface FaceLook {
  r: number;
  fat: number; // 0..1 — cheek growth
  earY: number; // ear height (fraction of headR; negative = low-set)
  openEyes: boolean; // weeks 23–30: eyes can be open (dark irises)
  lashes: boolean; // sleeping lash lines
  browOp: number; // brow visibility (0 = none yet)
  lips: number; // 0..1 lip fullness
  nostrils: boolean;
  seamOnly: boolean; // fused-lid seam without lashes (youngest fetus)
}

/**
 * The head — skull + forehead + jaw + growing cheek masses with a full,
 * natural face set: closed (or open) eyes with lash lines and brows, a
 * nose with bridge, tip, alae and nostrils, stacked lip arcs with a dark
 * seam, a chin and ears with pinna/ridge/lobe. Built from soft-blended
 * volumes in a frame where +Z is the face normal; the parent yaws it into
 * a ¾ view. Every element overlaps softly — no hard intersections.
 */
function Head({ look, skin }: { look: FaceLook; skin: THREE.Material }) {
  const { r } = look;
  const cheek = 0.26 * (1 + look.fat * 0.65);

  const dark = useMemo(() => new THREE.MeshBasicMaterial({ color: DARK, transparent: true, opacity: 0.6 }), []);
  useEffect(() => () => dark.dispose(), [dark]);
  const nostril = useMemo(() => new THREE.MeshBasicMaterial({ color: '#3a2320', transparent: true, opacity: 0.85 }), []);
  useEffect(() => () => nostril.dispose(), [nostril]);
  const brow = useMemo(() => new THREE.MeshBasicMaterial({ color: '#c68b6d', transparent: true, opacity: look.browOp }), [look.browOp]);
  useEffect(() => () => brow.dispose(), [brow]);
  const lip = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#d96a58', roughness: 0.3, transparent: true, opacity: 0.4 + look.lips * 0.55 }),
    [look.lips]
  );
  useEffect(() => () => lip.dispose(), [lip]);
  const iris = useMemo(() => new THREE.MeshStandardMaterial({ color: '#43303a', roughness: 0.25 }), []);
  useEffect(() => () => iris.dispose(), [iris]);
  const pupil = useMemo(() => new THREE.MeshBasicMaterial({ color: '#150f13' }), []);
  useEffect(() => () => pupil.dispose(), [pupil]);
  const glint = useMemo(() => new THREE.MeshBasicMaterial({ color: '#fff6ec' }), []);
  useEffect(() => () => glint.dispose(), [glint]);

  return (
    <group>
      {/* skull */}
      <mesh scale={[0.92, 1.02, 0.95]} material={skin}>
        <sphereGeometry args={[r, 44, 44]} />
      </mesh>
      {/* forehead — upper-front bulge */}
      <mesh position={[0, 0.36 * r, 0.4 * r]} material={skin}>
        <sphereGeometry args={[0.6 * r, 30, 30]} />
      </mesh>
      {/* jaw / chin mass, low-front */}
      <mesh position={[0, -0.5 * r, 0.3 * r]} scale={[0.85, 0.8, 0.9]} material={skin}>
        <sphereGeometry args={[0.5 * r, 26, 26]} />
      </mesh>
      {/* cheeks — grow with fat (weeks 23+) */}
      <mesh position={[0.5 * r, -0.26 * r, 0.58 * r]} material={skin}>
        <sphereGeometry args={[cheek * r, 24, 24]} />
      </mesh>
      <mesh position={[-0.5 * r, -0.26 * r, 0.58 * r]} material={skin}>
        <sphereGeometry args={[cheek * r, 24, 24]} />
      </mesh>

      {/* eyes */}
      {[-1, 1].map((sx) => (
        <group key={sx} position={[sx * 0.4 * r, 0.03 * r, 0.8 * r]} rotation={[0, sx * 0.3, 0]}>
          {look.openEyes ? (
            <>
              {/* open dark iris under a soft upper lid */}
              <mesh position={[0, 0, 0.02 * r]} scale={[1, 1.08, 0.5]} material={iris}>
                <sphereGeometry args={[0.085 * r, 20, 20]} />
              </mesh>
              <mesh position={[0, 0.008 * r, 0.05 * r]} scale={[1, 1, 0.5]} material={pupil}>
                <sphereGeometry args={[0.036 * r, 12, 12]} />
              </mesh>
              <mesh position={[-0.018 * r, 0.022 * r, 0.058 * r]} material={glint}>
                <sphereGeometry args={[0.011 * r, 8, 8]} />
              </mesh>
              {/* upper lid rim */}
              <mesh position={[0, 0.035 * r, 0.045 * r]} rotation={[0.12, 0, 0.78]} material={skin}>
                <torusGeometry args={[0.105 * r, 0.03 * r, 8, 24, 1.6]} />
              </mesh>
              {/* lower lash hint */}
              <mesh position={[0, -0.055 * r, 0.055 * r]} rotation={[0.15, 0, 3.72]} material={dark}>
                <torusGeometry args={[0.105 * r, 0.009 * r, 6, 20, 1.5]} />
              </mesh>
            </>
          ) : (
            <>
              {/* closed eyelid — a smooth shell slightly proud of the skull */}
              <mesh scale={[1.15, 0.66, 0.42]} material={skin}>
                <sphereGeometry args={[0.19 * r, 22, 22]} />
              </mesh>
              {/* fused-lid seam — the youngest fetus's smooth shut eyes */}
              {look.seamOnly && (
                <mesh position={[0, -0.045 * r, 0.07 * r]} rotation={[0.18, 0, 3.65]} material={dark}>
                  <torusGeometry args={[0.125 * r, 0.008 * r, 6, 20, 1.6]} />
                </mesh>
              )}
              {/* sleeping lash line — a thin dark arc curving down toward the cheek */}
              {look.lashes && (
                <mesh position={[0, -0.05 * r, 0.08 * r]} rotation={[0.18, 0, 3.75 + sx * 0.1]} material={dark}>
                  <torusGeometry args={[0.13 * r, 0.014 * r, 8, 24, 1.75]} />
                </mesh>
              )}
            </>
          )}
          {/* soft brow */}
          {look.browOp > 0 && (
            <mesh position={[0, 0.15 * r, 0.055 * r]} rotation={[0.22, 0, 0.85]} material={brow}>
              <torusGeometry args={[0.15 * r, 0.02 * r, 8, 20, 1.5]} />
            </mesh>
          )}
        </group>
      ))}

      {/* nose — bridge down the face slope, tip, alae, nostrils */}
      <group position={[0, -0.08 * r, 0.86 * r]}>
        <mesh position={[0, 0.13 * r, 0.03 * r]} rotation={[0.3, 0, 0]} material={skin}>
          <capsuleGeometry args={[0.042 * r, 0.2 * r, 6, 12]} />
        </mesh>
        <mesh position={[0, -0.02 * r, 0.035 * r]} material={skin}>
          <sphereGeometry args={[0.075 * r, 18, 18]} />
        </mesh>
        <mesh position={[0.085 * r, -0.05 * r, 0.01 * r]} material={skin}>
          <sphereGeometry args={[0.05 * r, 14, 14]} />
        </mesh>
        <mesh position={[-0.085 * r, -0.05 * r, 0.01 * r]} material={skin}>
          <sphereGeometry args={[0.05 * r, 14, 14]} />
        </mesh>
        {look.nostrils && (
          <>
            <mesh position={[0.042 * r, -0.088 * r, 0.03 * r]} material={nostril}>
              <sphereGeometry args={[0.015 * r, 8, 8]} />
            </mesh>
            <mesh position={[-0.042 * r, -0.088 * r, 0.03 * r]} material={nostril}>
              <sphereGeometry args={[0.015 * r, 8, 8]} />
            </mesh>
          </>
        )}
      </group>

      {/* mouth — stacked lip arcs below the nose, with a dark seam */}
      <group position={[0, -0.42 * r, 0.78 * r]}>
        {look.lips > 0.4 && (
          <>
            {/* upper lip — gentle arch */}
            <mesh scale={[1, 0.62, 0.5]} rotation={[0.14, 0, 0]} material={lip}>
              <torusGeometry args={[0.13 * r, 0.034 * r, 8, 24, Math.PI]} />
            </mesh>
            {/* lower lip — fuller */}
            <mesh position={[0, -0.038 * r, 0.005 * r]} scale={[0.94, 0.72, 0.55]} rotation={[0.14, 0, Math.PI]} material={lip}>
              <torusGeometry args={[0.125 * r, 0.038 * r, 8, 24, Math.PI]} />
            </mesh>
          </>
        )}
        {/* lip seam */}
        <mesh position={[0, -0.004 * r, 0.02 * r]} rotation={[0, 0, Math.PI / 2]} material={dark}>
          <capsuleGeometry args={[0.008 * r, 0.2 * r, 4, 8]} />
        </mesh>
      </group>

      {/* chin */}
      <mesh position={[0, -0.62 * r, 0.68 * r]} material={skin}>
        <sphereGeometry args={[0.09 * r, 16, 16]} />
      </mesh>

      {/* ears — pinna, inner ridge and lobe, flat side facing outward */}
      {[-1, 1].map((sx) => (
        <group key={sx} position={[sx * 0.92 * r, look.earY * r, 0.02 * r]} rotation={[0, sx * Math.PI / 2, 0]}>
          <mesh rotation={[0, 0, 0.4]} scale={[1, 1.15, 0.6]} material={skin}>
            <torusGeometry args={[0.12 * r, 0.045 * r, 10, 24, 4.2]} />
          </mesh>
          <mesh position={[0, 0.015 * r, 0.035 * r]} rotation={[0, 0, 0.55]} scale={[1, 1.1, 0.6]} material={skin}>
            <torusGeometry args={[0.065 * r, 0.022 * r, 8, 18, 3.4]} />
          </mesh>
          <mesh position={[0, -0.11 * r, 0.02 * r]} material={skin}>
            <sphereGeometry args={[0.042 * r, 12, 12]} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/** Fanned separated digits (fingers / toes) radiating from a palm or foot. */
function Digits({ at, angle, n, spread, len, r, z, material }: {
  at: V3;
  angle: number;
  n: number;
  spread: number;
  len: number;
  r: number;
  z: number;
  material: THREE.Material;
}) {
  const ends = useMemo(() => {
    const arr: V3[] = [];
    for (let i = 0; i < n; i++) {
      const a = angle + (i - (n - 1) / 2) * spread;
      arr.push([at[0] + Math.cos(a) * len, at[1] + Math.sin(a) * len, z]);
    }
    return arr;
  }, [at, angle, n, spread, len, z]);
  return (
    <>
      {ends.map((e, i) => (
        <Limb key={i} a={at} b={e} r={r} material={material} />
      ))}
    </>
  );
}

interface FetalLook {
  headR: number;
  headPos: V3;
  headYaw: number;
  flex: number; // cranial flexion — chin tucked toward the chest
  neck: V3;
  neckR: number;
  spine: V3[];
  spineR: number;
  chest: V3;
  chestR: number;
  belly: V3;
  bellyR: number;
  hips: V3;
  hipsR: number;
  navel: V3;
  shoulder: V3;
  elbow: V3;
  wrist: V3;
  handR: number;
  armR: number;
  handAngle: number;
  hip: V3;
  knee: V3;
  ankle: V3;
  legR: number;
  kneeR: number;
  foot: V3;
  footR: number;
  fat: number; // 0..1 — cheek & limb plumpness
  earY: number;
  openEyes: boolean;
  lashes: boolean;
  browOp: number;
  lips: number;
  nostrils: boolean;
  seamOnly: boolean;
  skin: string;
  skinOp: number;
  pulse: number;
}

/** Four week-informed fetal looks — weeks 9–13 / 14–22 / 23–30 / 31–40. */
const FETAL_LOOKS: readonly FetalLook[] = [
  // 0 · weeks 9–13 — head ≈½ of length, lids fused, fingers/toes separated
  {
    headR: 0.2, headPos: [0.16, -0.38, 0], headYaw: 0.72, flex: 0.15,
    neck: [0.09, -0.27, 0], neckR: 0.085,
    spine: [
      [0.05, -0.24, 0],
      [-0.04, -0.13, -0.008],
      [-0.1, 0.02, -0.008],
      [-0.04, 0.17, 0],
    ],
    spineR: 0.068,
    chest: [0.0, -0.08, 0], chestR: 0.102,
    belly: [-0.07, 0.05, 0], bellyR: 0.115,
    hips: [-0.03, 0.18, 0], hipsR: 0.095,
    navel: [-0.04, 0.03, 0.11],
    shoulder: [0.04, -0.12, 0.06], elbow: [0.16, -0.07, 0.075], wrist: [0.2, -0.16, 0.07],
    handR: 0.03, armR: 0.03, handAngle: -1.15,
    hip: [-0.05, 0.16, 0.06], knee: [0.1, 0.13, 0.07], ankle: [0.05, 0.27, 0.045],
    legR: 0.042, kneeR: 0.048, foot: [0.06, 0.29, 0.04], footR: 0.036,
    fat: 0, earY: -0.22, openEyes: false, lashes: false, browOp: 0,
    lips: 0.25, nostrils: false, seamOnly: true,
    skin: '#ffc9b2', skinOp: 0.92, pulse: 0.45,
  },
  // 1 · weeks 14–22 — head ≈⅓, faint lips/brows, hands near the face
  {
    headR: 0.19, headPos: [0.15, -0.37, 0], headYaw: 0.66, flex: 0.18,
    neck: [0.08, -0.26, 0], neckR: 0.082,
    spine: [
      [0.05, -0.24, 0],
      [-0.04, -0.13, -0.008],
      [-0.1, 0.02, -0.008],
      [-0.04, 0.17, 0],
    ],
    spineR: 0.066,
    chest: [0.0, -0.08, 0], chestR: 0.1,
    belly: [-0.07, 0.05, 0], bellyR: 0.112,
    hips: [-0.03, 0.18, 0], hipsR: 0.092,
    navel: [-0.04, 0.02, 0.112],
    shoulder: [0.04, -0.13, 0.065], elbow: [0.17, -0.06, 0.08], wrist: [0.21, -0.19, 0.085],
    handR: 0.032, armR: 0.034, handAngle: -1.25,
    hip: [-0.05, 0.16, 0.06], knee: [0.11, 0.13, 0.07], ankle: [0.05, 0.27, 0.045],
    legR: 0.046, kneeR: 0.05, foot: [0.06, 0.29, 0.04], footR: 0.038,
    fat: 0.25, earY: -0.15, openEyes: false, lashes: true, browOp: 0.35,
    lips: 0.55, nostrils: true, seamOnly: false,
    skin: '#ffc9b0', skinOp: 0.9, pulse: 0.45,
  },
  // 2 · weeks 23–30 — head ≈¼+, eyes open with dark irises, cheeks forming
  {
    headR: 0.185, headPos: [0.15, -0.38, 0], headYaw: 0.58, flex: 0.2,
    neck: [0.08, -0.26, 0], neckR: 0.08,
    spine: [
      [0.05, -0.24, 0],
      [-0.04, -0.13, -0.008],
      [-0.1, 0.02, -0.008],
      [-0.04, 0.17, 0],
    ],
    spineR: 0.066,
    chest: [0.0, -0.08, 0], chestR: 0.104,
    belly: [-0.07, 0.05, 0], bellyR: 0.122,
    hips: [-0.03, 0.18, 0], hipsR: 0.098,
    navel: [-0.03, 0.02, 0.121],
    shoulder: [0.04, -0.13, 0.07], elbow: [0.17, -0.06, 0.085], wrist: [0.21, -0.2, 0.09],
    handR: 0.034, armR: 0.04, handAngle: -1.25,
    hip: [-0.05, 0.16, 0.065], knee: [0.12, 0.13, 0.075], ankle: [0.04, 0.28, 0.045],
    legR: 0.052, kneeR: 0.054, foot: [0.06, 0.3, 0.04], footR: 0.04,
    fat: 0.55, earY: -0.08, openEyes: true, lashes: true, browOp: 0.5,
    lips: 0.85, nostrils: true, seamOnly: false,
    skin: '#ffcdb4', skinOp: 1, pulse: 0.4,
  },
  // 3 · weeks 31–40 — the flagship: plump, vernix-creamy, sleeping face
  {
    headR: 0.175, headPos: [0.16, -0.4, 0], headYaw: 0.55, flex: 0.22,
    neck: [0.09, -0.28, 0], neckR: 0.088,
    spine: [
      [0.06, -0.26, 0],
      [-0.05, -0.14, -0.01],
      [-0.11, 0.02, -0.01],
      [-0.05, 0.19, 0],
    ],
    spineR: 0.092,
    chest: [0.02, -0.1, 0], chestR: 0.118,
    belly: [-0.06, 0.04, 0], bellyR: 0.148,
    hips: [-0.04, 0.19, 0], hipsR: 0.112,
    navel: [-0.03, 0.03, 0.146],
    shoulder: [0.05, -0.14, 0.075], elbow: [0.18, -0.08, 0.095], wrist: [0.22, -0.2, 0.09],
    handR: 0.042, armR: 0.046, handAngle: -1.2,
    hip: [-0.07, 0.17, 0.07], knee: [0.13, 0.13, 0.085], ankle: [0.02, 0.29, 0.05],
    legR: 0.056, kneeR: 0.06, foot: [0.04, 0.31, 0.045], footR: 0.046,
    fat: 1, earY: -0.03, openEyes: false, lashes: true, browOp: 0.5,
    lips: 1, nostrils: true, seamOnly: false,
    skin: '#ffd8c0', skinOp: 1, pulse: 0.35,
  },
];

/**
 * Journey stages 4–7 — the FETUS, weeks 9–40 (bespoke per stage).
 * One anatomical builder, four week-informed looks:
 * - Head share of length shrinks ½ → ⅓ → ¼+ as the body outpaces it.
 * - Fat deposition plumps cheeks, limbs and belly toward term.
 * - Eyelids: fused shut (9–13) → soft closed lids with lashes → open dark
 *   irises (23–30) → the term child's clear sleeping face.
 * - Ears rise from a low-set embryonic position toward their final height.
 * Curled fetal tuck, head turned to the visitor in ¾ view; gentle sway and
 * heartbeat pulse. Educational ambiance — never a diagnostic model.
 */
function FetalStage({ reducedMotion, variant }: { reducedMotion: boolean; variant: 0 | 1 | 2 | 3 }) {
  const v = FETAL_LOOKS[variant];
  const P = P_FETAL[variant];
  const group = useRef<THREE.Group>(null);

  const skin = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: v.skin,
        roughness: 0.36 - v.fat * 0.05,
        metalness: 0,
        clearcoat: 0.28,
        clearcoatRoughness: 0.5,
        transparent: v.skinOp < 1,
        opacity: v.skinOp,
        sheen: 1,
        sheenColor: new THREE.Color(C.pearlGlow),
        sheenRoughness: 0.5,
        emissive: new THREE.Color('#ff8a70'),
        emissiveIntensity: 0.09,
        envMapIntensity: 0.7,
      }),
    [v]
  );
  useEffect(() => () => skin.dispose(), [skin]);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (reducedMotion || !group.current) return;
    const hb = heartbeat(t);
    group.current.scale.setScalar(P.scale * (1 + (hb - 1) * v.pulse));
    group.current.rotation.z = Math.sin(t * 0.3) * 0.02;
    group.current.rotation.y = P.yaw + Math.sin(t * 0.2) * 0.045;
    group.current.position.y = P.pos[1] + Math.sin(t * 0.44 + 0.6) * 0.018;
  });

  const spineGeo = useMemo(() => {
    const spine = new THREE.CatmullRomCurve3(v.spine.map((p) => new THREE.Vector3(p[0], p[1], p[2])));
    return new THREE.TubeGeometry(spine, 32, v.spineR, 16, false);
  }, [v]);
  useEffect(() => () => spineGeo.dispose(), [spineGeo]);

  const look: FaceLook = {
    r: v.headR, fat: v.fat, earY: v.earY, openEyes: v.openEyes, lashes: v.lashes,
    browOp: v.browOp, lips: v.lips, nostrils: v.nostrils, seamOnly: v.seamOnly,
  };

  return (
    <group ref={group} position={P.pos} rotation={[0, P.yaw, 0]} scale={P.scale}>
      {/* curved back — one smooth arc from neck to sacrum */}
      <mesh geometry={spineGeo} material={skin} />

      {/* neck — distinct from the earliest fetal weeks on */}
      <mesh position={v.neck} material={skin}>
        <sphereGeometry args={[v.neckR, 22, 22]} />
      </mesh>

      {/* head — ¾ view toward the visitor, chin tucked in flexion */}
      <group position={v.headPos} rotation={[0, v.headYaw, 0]}>
        <group rotation={[v.flex, 0, 0]}>
          <Head look={look} skin={skin} />
        </group>
      </group>

      {/* chest / round belly / hips — plumping with fat deposition */}
      <mesh position={v.chest} material={skin}>
        <sphereGeometry args={[v.chestR, 28, 28]} />
      </mesh>
      <mesh position={v.belly} material={skin}>
        <sphereGeometry args={[v.bellyR, 28, 28]} />
      </mesh>
      <mesh position={v.hips} material={skin}>
        <sphereGeometry args={[v.hipsR, 24, 24]} />
      </mesh>
      {/* navel — the cord's meeting point */}
      <mesh position={v.navel} material={skin}>
        <sphereGeometry args={[0.018, 10, 10]} />
      </mesh>

      {/* arm — folded, hand resting near the cheek */}
      <Limb a={v.shoulder} b={v.elbow} r={v.armR} material={skin} />
      <Limb a={v.elbow} b={v.wrist} r={v.armR * 0.85} material={skin} />
      <mesh position={v.wrist} material={skin}>
        <sphereGeometry args={[v.handR, 16, 16]} />
      </mesh>
      <Digits at={v.wrist} angle={v.handAngle} n={4} spread={0.42} len={v.handR * 1.7} r={v.handR * 0.22} z={v.wrist[2] + 0.005} material={skin} />

      {/* leg — knee drawn up, foot tucked toward the head end */}
      <Limb a={v.hip} b={v.knee} r={v.legR} material={skin} />
      <mesh position={v.knee} material={skin}>
        <sphereGeometry args={[v.kneeR, 18, 18]} />
      </mesh>
      <Limb a={v.knee} b={v.ankle} r={v.legR * 0.82} material={skin} />
      <mesh position={v.foot} scale={[1.2, 0.8, 0.9]} material={skin}>
        <sphereGeometry args={[v.footR, 16, 16]} />
      </mesh>
      <Digits at={v.foot} angle={0.5} n={3} spread={0.4} len={v.footR * 1.15} r={v.footR * 0.16} z={v.foot[2] + 0.01} material={skin} />

      {/* second foot peeking — the tucked, crossed-feet look (term) */}
      {variant === 3 && (
        <mesh position={[0.11, 0.28, -0.02]} scale={[1.1, 0.8, 0.8]} material={skin}>
          <sphereGeometry args={[0.038, 14, 14]} />
        </mesh>
      )}
    </group>
  );
}

/** Nursery mobile — arc hanger, glassy satellites, delicate strings. */
function Mobile() {
  const ring = useRef<THREE.Mesh>(null);
  const bead = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (ring.current) {
      ring.current.position.y = 0 + Math.sin(t * 0.7) * 0.02;
      ring.current.rotation.z = 0.3 + Math.sin(t * 0.4) * 0.06;
    }
    if (bead.current) bead.current.position.y = -0.12 + Math.sin(t * 0.85 + 1.4) * 0.025;
  });
  return (
    <group position={[0, 0.95, 0]}>
      {/* hanger arc */}
      <mesh position={[0, 0.32, 0]}>
        <torusGeometry args={[0.5, 0.01, 8, 48, Math.PI]} />
        <meshStandardMaterial color={C.ivory} roughness={0.5} transparent opacity={0.7} />
      </mesh>
      {/* strings */}
      {[
        [0.62, 0.26, 0.05],
        [-0.58, 0.2, 0.15],
        [0.05, 0.1, -0.55],
      ].map((p, i) => (
        <mesh key={i} position={p as [number, number, number]}>
          <cylinderGeometry args={[0.005, 0.005, 0.55, 6]} />
          <meshBasicMaterial color={C.ivory} transparent opacity={0.32} />
        </mesh>
      ))}
      {/* satellites */}
      <mesh ref={ring} position={[0.62, 0, 0.05]} rotation={[Math.PI / 2.4, 0, 0.3]}>
        <torusGeometry args={[0.15, 0.03, 12, 40]} />
        <meshPhysicalMaterial color={C.sage} roughness={0.22} clearcoat={1} clearcoatRoughness={0.15} iridescence={0.5} iridescenceIOR={1.3} envMapIntensity={1.1} />
      </mesh>
      <mesh ref={bead} position={[-0.58, -0.12, 0.15]}>
        <sphereGeometry args={[0.1, 24, 24]} />
        <meshPhysicalMaterial color={C.coral} roughness={0.18} clearcoat={1} clearcoatRoughness={0.12} iridescence={0.6} iridescenceIOR={1.3} envMapIntensity={1.1} />
      </mesh>
      <mesh position={[0.05, -0.28, -0.55]} rotation={[0.4, 0, 0.8]}>
        <capsuleGeometry args={[0.06, 0.14, 6, 14]} />
        <meshPhysicalMaterial color={C.lavender} roughness={0.22} clearcoat={1} clearcoatRoughness={0.15} iridescence={0.5} iridescenceIOR={1.3} envMapIntensity={1.1} />
      </mesh>
    </group>
  );
}

/* ------------------------------------------------------------------ embrace */

function Embrace({ reducedMotion, stage }: { reducedMotion: boolean; stage: number }) {
  const group = useRef<THREE.Group>(null);
  const halo = useRef<THREE.Sprite>(null);
  const childLight = useRef<THREE.PointLight>(null);
  const haloRings = useRef<THREE.Group>(null);
  const shell = useRef<THREE.Mesh>(null);
  const mobile = useRef<THREE.Group>(null);
  const dust = useRef<THREE.Group>(null);
  const { pointer } = useThree();

  const glowTex = useMemo(() => makeGlowTexture(), []);
  useEffect(() => () => glowTex.dispose(), [glowTex]);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (reducedMotion) return; // single static frame already rendered

    // Whole-embrace breathing + gentle lean toward the visitor
    if (group.current) {
      group.current.position.y = Math.sin(t * 0.45) * 0.07;
      group.current.rotation.y += (pointer.x * 0.14 - group.current.rotation.y) * 0.03;
      group.current.rotation.x += (-pointer.y * 0.08 - group.current.rotation.x) * 0.03;
    }
    // Shell: slow self-rotation + organic breathing
    if (shell.current) {
      shell.current.rotation.y = t * 0.055;
      const b = 1 + Math.sin(t * 0.45) * 0.014;
      shell.current.scale.set(b, 1 / b, b);
    }
    // Child heartbeat → halo sprite, mandorla rings, inner light (the fetus
    // pulses its own scale/sway inside <FetalStage>)
    const hb = heartbeat(t);
    if (halo.current) {
      const s = 1.7 + (hb - 1) * 3;
      halo.current.scale.set(s, s, 1);
      (halo.current.material as THREE.SpriteMaterial).opacity = 0.22 + (hb - 1) * 2;
    }
    if (haloRings.current) {
      const mandorla = MANDORLA[Math.min(stage, MANDORLA.length - 1)];
      haloRings.current.scale.setScalar(mandorla * (1 + (hb - 1) * 1.2));
    }
    if (childLight.current) childLight.current.intensity = 0.7 + (hb - 1) * 2.2;
    // Mobile drift
    if (mobile.current) {
      mobile.current.rotation.y = t * 0.13;
      mobile.current.position.y = 0.95 + Math.sin(t * 0.5) * 0.05;
    }
    // Stardust slow drift
    if (dust.current) {
      dust.current.rotation.y = t * 0.025;
      dust.current.position.y = Math.sin(t * 0.3) * 0.1;
    }
  });

  return (
    <group ref={group}>
      {/* Depth bokeh + luminous pool */}
      <Bokeh tex={glowTex} />

      {/* Celestial orbit rings — differential speeds, gliding beads */}
      <OrbitRing radius={1.72} tiltX={0.5} tiltZ={0.2} speed={0.3} phase={0.6} color={C.shellGlow} />
      <OrbitRing radius={1.98} tiltX={-0.35} tiltZ={-0.5} speed={-0.22} phase={2.4} color={C.sage} />
      <OrbitRing radius={2.28} tiltX={1.05} tiltZ={0.35} speed={0.16} phase={4.2} color={C.coral} />

      {/* Embrace shell — soft translucent cradle with iridescence */}
      <mesh ref={shell}>
        <sphereGeometry args={[1.35, 48, 48]} />
        <meshPhysicalMaterial
          color={C.shell}
          roughness={0.16}
          metalness={0}
          transparent
          opacity={0.26}
          clearcoat={1}
          clearcoatRoughness={0.22}
          iridescence={0.45}
          iridescenceIOR={1.3}
          depthWrite={false}
          envMapIntensity={0.9}
        />
      </mesh>
      {/* Fresnel rim — the professional edge glow */}
      <FresnelRim radius={1.35} color={C.shellGlow} power={2.7} intensity={0.95} scale={1.015} />

      {/* The child — serene stylized fetus curled in the embrace */}
      {/* Heartbeat halo behind the child */}
      <sprite ref={halo} position={[0, -0.02, 0.02]} scale={[1.7, 1.7, 1]}>
        <spriteMaterial map={glowTex} color={C.pearlGlow} transparent opacity={0.22} blending={THREE.AdditiveBlending} depthWrite={false} />
      </sprite>
      {/* Mandorla rings framing the child — intimate echo of the celestial ones */}
      <group ref={haloRings} position={[0, -0.02, -0.15]} scale={MANDORLA[Math.min(stage, MANDORLA.length - 1)]}>
        <mesh rotation={[1.35, 0.25, 0]}>
          <torusGeometry args={[0.62, 0.0045, 8, 72]} />
          <meshBasicMaterial color={C.coral} transparent opacity={0.3} blending={THREE.AdditiveBlending} depthWrite={false} />
        </mesh>
        <mesh rotation={[1.75, -0.35, 0.5]}>
          <torusGeometry args={[0.75, 0.004, 8, 72]} />
          <meshBasicMaterial color={C.sage} transparent opacity={0.24} blending={THREE.AdditiveBlending} depthWrite={false} />
        </mesh>
      </group>
      {/* Growth journey — the child through eight week-accurate stages */}
      <StageGate stage={stage} reducedMotion={reducedMotion}>
        {stage === 0 && <Fertilization reducedMotion={reducedMotion} tex={glowTex} />}
        {stage === 1 && <Blastocyst reducedMotion={reducedMotion} tex={glowTex} />}
        {stage === 2 && <Embryo reducedMotion={reducedMotion} tex={glowTex} mature={false} />}
        {stage === 3 && <Embryo reducedMotion={reducedMotion} tex={glowTex} mature />}
        {stage === 4 && <FetalStage reducedMotion={reducedMotion} variant={0} />}
        {stage === 5 && <FetalStage reducedMotion={reducedMotion} variant={1} />}
        {stage === 6 && <FetalStage reducedMotion={reducedMotion} variant={2} />}
        {stage === 7 && <FetalStage reducedMotion={reducedMotion} variant={3} />}
      </StageGate>
      <pointLight ref={childLight} position={[0.15, 0, 0.55]} intensity={0.7} distance={3.2} color={C.pearlGlow} />
      {/* Amniotic shimmer inside the shell */}
      <Bubbles />

      {/* Twisted two-vessel cord — appears with the embryo, thickens and
          re-anchors at each stage model's navel */}
      {(() => {
        const cord = CORDS[stage];
        return cord ? (
          <Cord key={stage} end={cord.end} mainR={cord.mainR} wrapR={cord.wrapR} />
        ) : null;
      })()}

      {/* Nursery mobile */}
      <group ref={mobile} position={[0, 0.95, 0]}>
        <Mobile />
      </group>

      {/* Glassy floating orbs */}
      <Orb position={[1.18, 0.55, 0.6]} radius={0.09} color={C.coral} speed={0.62} phase={0.4} amp={0.06} />
      <Orb position={[-1.28, 0.35, 0.4]} radius={0.07} color={C.sage} speed={0.8} phase={1.9} amp={0.05} />
      <Orb position={[0.95, -0.78, 0.5]} radius={0.06} color={C.lavender} speed={0.5} phase={3.2} amp={0.055} />
      <Orb position={[-0.92, -0.92, 0.3]} radius={0.05} color={C.ivory} speed={0.9} phase={4.6} amp={0.04} />
      <Orb position={[0.2, 1.18, 0.8]} radius={0.055} color={C.cordLight} speed={0.7} phase={5.5} amp={0.045} />

      {/* Stardust */}
      <group ref={dust}>
        <Stardust />
      </group>
    </group>
  );
}

/**
 * Cinematic camera rig: breathing dolly + pointer parallax, with a responsive
 * dolly-out on narrow viewports so the outer orbit ring never clips on mobile.
 */
function Rig({ reducedMotion, stage }: { reducedMotion: boolean; stage: number }) {
  const did = useRef(false);
  const { size } = useThree();
  // Per-stage dolly: the microscopic stages (fertilization → embryo) invite a
  // lean-in close-up; the mid fetus and the full-term child pull the camera
  // back as the child fills more of the embrace.
  const stageZ = STAGE_Z[Math.min(stage, STAGE_Z.length - 1)];
  useEffect(() => {
    did.current = false;
  }, [stage]);
  useFrame(({ camera, clock, pointer }) => {
    const aspect = size.width / Math.max(size.height, 1);
    const baseZ = aspect < 1.5 ? stageZ + 0.65 : stageZ;
    if (reducedMotion) {
      if (!did.current) {
        camera.position.set(0, 0.18, baseZ);
        camera.lookAt(0, 0, 0);
        did.current = true;
      }
      return;
    }
    const t = clock.getElapsedTime();
    camera.position.x += (pointer.x * 0.22 - camera.position.x) * 0.02;
    camera.position.y += (0.18 + pointer.y * 0.12 - camera.position.y) * 0.02;
    camera.position.z += (baseZ + Math.sin(t * 0.2) * 0.12 - camera.position.z) * 0.05;
    camera.lookAt(0, 0, 0);
  });
  return null;
}

/**
 * Canvas wrapper with viewport-aware rendering: an IntersectionObserver flips
 * frameloop to 'never' while the scene is offscreen so a scrolled-past landing
 * never burns GPU/battery. Reduced-motion gets exactly one rendered frame.
 */
export default function HeroBloom({ stage = 2 }: { stage?: number }) {
  // ssr:false → window always exists on first render; read the media query
  // lazily instead of setState-in-effect (react-hooks v6 compliance).
  const [reducedMotion] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
  const [host, setHost] = useState<HTMLDivElement | null>(null);
  const [inView, setInView] = useState(true);

  useEffect(() => {
    if (!host) return;
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { threshold: 0.05 });
    io.observe(host);
    return () => io.disconnect();
  }, [host]);

  const frameloop: 'always' | 'never' | 'demand' = !inView ? 'never' : reducedMotion ? 'demand' : 'always';

  return (
    <div ref={setHost} className="absolute inset-0" aria-hidden="true">
      <Canvas
        dpr={[1, 1.5]}
        camera={{ position: [0, 0.2, 5.3], fov: 40 }}
        gl={{ antialias: true, powerPreference: 'low-power', alpha: true }}
        frameloop={frameloop}
        style={{ background: 'transparent' }}
      >
        <ambientLight intensity={0.62} />
        <directionalLight position={[3, 4, 5]} intensity={1.15} color={C.ivory} />
        <directionalLight position={[-4, 1.5, -2]} intensity={0.55} color={C.lavender} />
        <directionalLight position={[2.5, -2.5, -3]} intensity={0.5} color={C.coral} />
        {/* Studio reflections — rendered once, no HDR download, no per-frame cost */}
        <Environment resolution={64} frames={1}>
          <color attach="background" args={['#221833']} />
          <Lightformer intensity={2} color={C.ivory} position={[0, 3, 2]} scale={[5, 2, 1]} />
          <Lightformer intensity={1.1} color={C.lavender} position={[-4, 0.5, -2]} rotation-y={Math.PI / 2} scale={[4, 3, 1]} />
          <Lightformer intensity={1.4} color={C.coral} position={[3.5, -1.5, 1.5]} rotation-y={-Math.PI / 3} scale={[2.5, 2.5, 1]} />
          <Lightformer form="circle" intensity={1.6} color="#fff2e2" position={[0, -3, 1]} scale={2.5} />
        </Environment>
        <Rig reducedMotion={reducedMotion} stage={stage} />
        <Embrace reducedMotion={reducedMotion} stage={stage} />
      </Canvas>
    </div>
  );
}
