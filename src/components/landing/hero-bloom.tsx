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
import { useEffect, useMemo, useRef, useState } from 'react';
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

/* Child palette — warm, subsurface-like skin */
const SKIN = '#ffcdb2';
const SKIN_LINE = '#b06a58';

/** Double-thump heartbeat envelope: two soft bumps per period. */
function heartbeat(t: number): number {
  const period = 1.15;
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
function Cord() {
  const { mainGeo, wrapGeo } = useMemo(() => {
    const main = new THREE.CubicBezierCurve3(
      new THREE.Vector3(1.0, -0.55, 0.72),
      new THREE.Vector3(0.72, -0.6, 0.55),
      new THREE.Vector3(0.4, -0.2, 0.42),
      new THREE.Vector3(0.15, 0.06, 0.25)
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
      mainGeo: new THREE.TubeGeometry(main, 48, 0.02, 8, false),
      wrapGeo: new THREE.TubeGeometry(wrap, SEG, 0.0065, 6, false),
    };
  }, []);
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
      <mesh position={[0.15, 0.06, 0.25]}>
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

/**
 * The child — a serene, stylized fetus curled in the embrace.
 * Side profile facing +X: head tucked low, knees drawn up, feet near the
 * hips, arms folded across the chest; closed eyes, tiny nose & ear. Softly
 * blended spheres/capsules with a warm subsurface-like skin. Sways gently
 * and pulses with the heartbeat. Educational ambiance — not an anatomical
 * or diagnostic model.
 */
function Fetus({ reducedMotion }: { reducedMotion: boolean }) {
  const group = useRef<THREE.Group>(null);

  const skin = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: SKIN,
        roughness: 0.34,
        metalness: 0,
        clearcoat: 0.3,
        clearcoatRoughness: 0.5,
        sheen: 1,
        sheenColor: new THREE.Color(C.pearlGlow),
        sheenRoughness: 0.55,
        emissive: new THREE.Color('#ff8a70'),
        emissiveIntensity: 0.1,
        envMapIntensity: 0.7,
      }),
    []
  );
  useEffect(() => () => skin.dispose(), [skin]);
  const line = useMemo(
    () => new THREE.MeshBasicMaterial({ color: SKIN_LINE, transparent: true, opacity: 0.55 }),
    []
  );
  useEffect(() => () => line.dispose(), [line]);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (reducedMotion || !group.current) return;
    const hb = heartbeat(t);
    group.current.scale.setScalar(1.42 * (1 + (hb - 1) * 0.5));
    group.current.rotation.z = Math.sin(t * 0.32) * 0.02;
    // 3/4 pose — profile turned gently toward the visitor
    group.current.rotation.y = 0.38 + Math.sin(t * 0.21) * 0.05;
    group.current.position.y = -0.02 + Math.sin(t * 0.45 + 0.8) * 0.02;
  });

  /* Spine — the defining C-curve of the fetal silhouette (imperative,
     disposed on unmount). */
  const spineGeo = useMemo(() => {
    const spine = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.1, -0.16, 0),
      new THREE.Vector3(-0.06, -0.1, -0.01),
      new THREE.Vector3(-0.13, 0.04, -0.01),
      new THREE.Vector3(-0.09, 0.19, 0),
    ]);
    return new THREE.TubeGeometry(spine, 24, 0.088, 14, false);
  }, []);
  useEffect(() => () => spineGeo.dispose(), [spineGeo]);

  return (
    <group ref={group} position={[0, -0.02, 0.12]} rotation={[0, 0.38, 0]} scale={1.42}>
      {/* curved back — one smooth C-arc from neck to sacrum */}
      <mesh geometry={spineGeo} material={skin} />
      {/* head — slightly elongated, chin tucked */}
      <mesh position={[0.13, -0.27, 0]} scale={[0.92, 1.06, 0.96]} material={skin}>
        <sphereGeometry args={[0.15, 36, 36]} />
      </mesh>
      <mesh position={[0.1, -0.15, 0]} material={skin}>
        <sphereGeometry args={[0.075, 20, 20]} />
      </mesh>
      {/* chest / belly / hips — blended onto the spine arc */}
      <mesh position={[0.07, -0.09, 0]} material={skin}>
        <sphereGeometry args={[0.1, 26, 26]} />
      </mesh>
      <mesh position={[0.03, 0.02, 0]} material={skin}>
        <sphereGeometry args={[0.125, 26, 26]} />
      </mesh>
      <mesh position={[-0.07, 0.19, 0]} material={skin}>
        <sphereGeometry args={[0.095, 24, 24]} />
      </mesh>
      {/* folded arm across the chest */}
      <Limb a={[0.06, 0, 0.07]} b={[0.19, -0.05, 0.075]} r={0.042} material={skin} />
      <Limb a={[0.19, -0.05, 0.075]} b={[0.215, -0.17, 0.06]} r={0.036} material={skin} />
      <mesh position={[0.22, -0.195, 0.055]} material={skin}>
        <sphereGeometry args={[0.034, 14, 14]} />
      </mesh>
      {/* leg — knee drawn up, foot tucked near the hips */}
      <Limb a={[-0.08, 0.16, 0.06]} b={[0.15, 0.09, 0.07]} r={0.052} material={skin} />
      <mesh position={[0.15, 0.09, 0.07]} material={skin}>
        <sphereGeometry args={[0.052, 16, 16]} />
      </mesh>
      <Limb a={[0.15, 0.09, 0.07]} b={[0, 0.27, 0.03]} r={0.042} material={skin} />
      <mesh position={[0, 0.285, 0.03]} material={skin}>
        <sphereGeometry args={[0.034, 14, 14]} />
      </mesh>
      {/* profile beauty marks */}
      <mesh position={[0.265, -0.29, 0.045]} material={skin}>
        <sphereGeometry args={[0.016, 12, 12]} />
      </mesh>
      <mesh position={[0.06, -0.28, 0.13]} material={skin}>
        <sphereGeometry args={[0.02, 12, 12]} />
      </mesh>
      {/* closed eye — a calm lash line */}
      <Limb a={[0.19, -0.23, 0.115]} b={[0.24, -0.205, 0.095]} r={0.006} material={line} />
    </group>
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

function Embrace({ reducedMotion }: { reducedMotion: boolean }) {
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
    // pulses its own scale/sway inside <Fetus>)
    const hb = heartbeat(t);
    if (halo.current) {
      const s = 1.7 + (hb - 1) * 3;
      halo.current.scale.set(s, s, 1);
      (halo.current.material as THREE.SpriteMaterial).opacity = 0.22 + (hb - 1) * 2;
    }
    if (haloRings.current) haloRings.current.scale.setScalar(1 + (hb - 1) * 1.2);
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
      <group ref={haloRings} position={[0, -0.02, -0.15]}>
        <mesh rotation={[1.35, 0.25, 0]}>
          <torusGeometry args={[0.62, 0.0045, 8, 72]} />
          <meshBasicMaterial color={C.coral} transparent opacity={0.3} blending={THREE.AdditiveBlending} depthWrite={false} />
        </mesh>
        <mesh rotation={[1.75, -0.35, 0.5]}>
          <torusGeometry args={[0.75, 0.004, 8, 72]} />
          <meshBasicMaterial color={C.sage} transparent opacity={0.24} blending={THREE.AdditiveBlending} depthWrite={false} />
        </mesh>
      </group>
      <Fetus reducedMotion={reducedMotion} />
      <pointLight ref={childLight} position={[0.15, 0, 0.55]} intensity={0.7} distance={3.2} color={C.pearlGlow} />
      {/* Amniotic shimmer inside the shell */}
      <Bubbles />

      {/* Twisted two-vessel cord */}
      <Cord />

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
function Rig({ reducedMotion }: { reducedMotion: boolean }) {
  const did = useRef(false);
  const { size } = useThree();
  useFrame(({ camera, clock, pointer }) => {
    const aspect = size.width / Math.max(size.height, 1);
    const baseZ = aspect < 1.5 ? 5.9 : 5.3;
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
export default function HeroBloom() {
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
        <Rig reducedMotion={reducedMotion} />
        <Embrace reducedMotion={reducedMotion} />
      </Canvas>
    </div>
  );
}
