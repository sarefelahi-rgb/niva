'use client';

/**
 * Landing hero — "Embrace" (آغوش) scene. Wave 8 landing rebuild.
 *
 * A deliberately maternal, childlike ambience rendered in 3D:
 * - A soft translucent "embrace" shell (lavender) gently cradles a glowing
 *   pearl — the child — whose scale pulses with a quiet double-thump heartbeat.
 * - A delicate coral cord links the shell wall to the pearl.
 * - A slow nursery-mobile of childlike satellites (ring, bead, pebble) drifts
 *   overhead; stardust particles float around like a mobile's dust in sunlight.
 * - Subtle pointer parallax makes the scene lean toward the visitor.
 *
 * Integrity: purely an educational ambiance visual — NOT a fetal/anatomical
 * model (the parametric studio lives in src/components/studio/ and is never
 * loaded on the landing). Nothing here claims diagnostic validity.
 *
 * Performance contract (keeps LCP/INP budgets intact):
 * - mounted via next/dynamic { ssr:false } AFTER idle — never competes with LCP
 * - dpr capped at 1.5, low-power GL preference, no shadows/post-processing
 * - renders pause (frameloop:'never') when the canvas leaves the viewport
 * - prefers-reduced-motion renders a single static frame (no animation loop)
 * - imperative geometries/materials are disposed on unmount (R-11 lesson)
 */

import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';

/* Brand palette (Calm Bloom) */
const C = {
  shell: '#a99bd6',
  shellGlow: '#cfc3ec',
  pearl: '#ffd9c9',
  pearlGlow: '#ff9d85',
  cord: '#e08d7a',
  sage: '#8faf8f',
  coral: '#e08d7a',
  lavender: '#c9bce2',
  ivory: '#fff7ef',
} as const;

/** Double-thump heartbeat envelope: two soft bumps per period. */
function heartbeat(t: number): number {
  const period = 1.15;
  const phase = (t % period) / period;
  const bump = (c: number, w: number) => Math.exp(-((phase - c) ** 2) / (w * w));
  return 1 + 0.085 * bump(0.12, 0.05) + 0.05 * bump(0.3, 0.06);
}

function Embrace({ reducedMotion }: { reducedMotion: boolean }) {
  const group = useRef<THREE.Group>(null);
  const pearl = useRef<THREE.Mesh>(null);
  const glow = useRef<THREE.Mesh>(null);
  const shell = useRef<THREE.Mesh>(null);
  const mobile = useRef<THREE.Group>(null);
  const dust = useRef<THREE.Points>(null);
  const { pointer } = useThree();

  /* Umbilical curve — gentle S from the shell wall to the pearl. */
  const cordCurve = useMemo(
    () =>
      new THREE.CubicBezierCurve3(
        new THREE.Vector3(0.32, -0.18, 0.55),
        new THREE.Vector3(0.5, -0.42, 0.32),
        new THREE.Vector3(0.16, -0.34, 0.34),
        new THREE.Vector3(0.02, -0.1, 0.08)
      ),
    []
  );

  /* Stardust — soft additive points, imperative geometry (disposed on unmount). */
  const dustGeo = useMemo(() => {
    const N = 64;
    const pos = new Float32Array(N * 3);
    const col = new Float32Array(N * 3);
    const palette = [new THREE.Color(C.sage), new THREE.Color(C.coral), new THREE.Color(C.lavender), new THREE.Color(C.ivory)];
    for (let i = 0; i < N; i++) {
      const r = 1.9 + Math.random() * 1.4;
      const theta = Math.random() * Math.PI * 2;
      pos[i * 3] = Math.cos(theta) * r;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 3.2;
      pos[i * 3 + 2] = Math.sin(theta) * r * 0.6 - 0.4;
      const c = palette[i % palette.length];
      col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    return g;
  }, []);
  useEffect(() => () => dustGeo.dispose(), [dustGeo]);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (reducedMotion) return; // single static frame already rendered

    // Whole-embrace breathing + gentle bob
    if (group.current) {
      group.current.position.y = Math.sin(t * 0.45) * 0.07;
      // pointer parallax — lean softly toward the visitor
      group.current.rotation.y += (pointer.x * 0.22 - group.current.rotation.y) * 0.03;
      group.current.rotation.x += (-pointer.y * 0.12 - group.current.rotation.x) * 0.03;
    }
    // Shell: slow self-rotation + organic breathing
    if (shell.current) {
      shell.current.rotation.y = t * 0.06;
      const b = 1 + Math.sin(t * 0.45) * 0.012;
      shell.current.scale.set(b, 1 / b, b);
    }
    // Pearl heartbeat
    const hb = heartbeat(t);
    if (pearl.current) pearl.current.scale.setScalar(hb);
    if (glow.current) {
      glow.current.scale.setScalar(1 + (hb - 1) * 2.2);
      (glow.current.material as THREE.MeshBasicMaterial).opacity = 0.28 + (hb - 1) * 3;
    }
    // Nursery mobile: slow drift
    if (mobile.current) {
      mobile.current.rotation.y = t * 0.14;
      mobile.current.position.y = 0.9 + Math.sin(t * 0.5) * 0.05;
    }
    // Stardust drift
    if (dust.current) {
      dust.current.rotation.y = t * 0.025;
      dust.current.position.y = Math.sin(t * 0.3) * 0.1;
    }
  });

  return (
    <group ref={group}>
      {/* Embrace shell — soft translucent cradle */}
      <mesh ref={shell}>
        <sphereGeometry args={[1.35, 48, 48]} />
        <meshPhysicalMaterial
          color={C.shell}
          roughness={0.22}
          metalness={0.02}
          transparent
          opacity={0.32}
          clearcoat={0.8}
          clearcoatRoughness={0.4}
          depthWrite={false}
        />
      </mesh>
      {/* Shell rim glow — cheap fresnel stand-in */}
      <mesh scale={1.045}>
        <sphereGeometry args={[1.35, 32, 32]} />
        <meshBasicMaterial color={C.shellGlow} transparent opacity={0.14} side={THREE.BackSide} depthWrite={false} />
      </mesh>

      {/* The child — glowing pearl with heartbeat */}
      <mesh ref={pearl} position={[0, -0.05, 0.1]}>
        <sphereGeometry args={[0.3, 32, 32]} />
        <meshPhysicalMaterial color={C.pearl} roughness={0.25} clearcoat={1} emissive={C.pearlGlow} emissiveIntensity={0.55} />
      </mesh>
      <mesh ref={glow} position={[0, -0.05, 0.1]}>
        <sphereGeometry args={[0.42, 24, 24]} />
        <meshBasicMaterial color={C.pearlGlow} transparent opacity={0.28} depthWrite={false} />
      </mesh>
      <pointLight position={[0, -0.05, 0.35]} intensity={0.6} distance={3} color={C.pearlGlow} />

      {/* Cord — delicate coral curve */}
      <mesh position={[0, -0.05, 0.1]}>
        <tubeGeometry args={[cordCurve, 40, 0.022, 8, false]} />
        <meshStandardMaterial color={C.cord} roughness={0.5} />
      </mesh>

      {/* Nursery mobile — ring, bead, pebble (childlike satellites) */}
      <group ref={mobile} position={[0, 0.9, 0]}>
        <mesh position={[0.85, 0.12, 0]} rotation={[Math.PI / 2.4, 0.3, 0]}>
          <torusGeometry args={[0.16, 0.032, 12, 32]} />
          <meshPhysicalMaterial color={C.sage} roughness={0.3} clearcoat={0.6} />
        </mesh>
        <mesh position={[-0.8, -0.1, 0.2]}>
          <sphereGeometry args={[0.11, 24, 24]} />
          <meshPhysicalMaterial color={C.coral} roughness={0.3} clearcoat={0.6} />
        </mesh>
        <mesh position={[0.1, 0.3, -0.7]} rotation={[0.4, 0, 0.8]}>
          <capsuleGeometry args={[0.07, 0.16, 6, 12]} />
          <meshPhysicalMaterial color={C.lavender} roughness={0.3} clearcoat={0.6} />
        </mesh>
        {/* mobile strings */}
        <mesh position={[0.85, 0.42, 0]}>
          <cylinderGeometry args={[0.006, 0.006, 0.5, 6]} />
          <meshBasicMaterial color={C.ivory} transparent opacity={0.4} />
        </mesh>
        <mesh position={[-0.8, 0.2, 0.2]}>
          <cylinderGeometry args={[0.006, 0.006, 0.5, 6]} />
          <meshBasicMaterial color={C.ivory} transparent opacity={0.4} />
        </mesh>
      </group>

      {/* Stardust */}
      <points ref={dust} geometry={dustGeo}>
        <pointsMaterial size={0.045} vertexColors transparent opacity={0.7} sizeAttenuation depthWrite={false} blending={THREE.AdditiveBlending} />
      </points>
    </group>
  );
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
        camera={{ position: [0, 0.2, 4.6], fov: 40 }}
        gl={{ antialias: true, powerPreference: 'low-power', alpha: true }}
        frameloop={frameloop}
        style={{ background: 'transparent' }}
      >
        <ambientLight intensity={0.9} />
        <directionalLight position={[3, 4, 5]} intensity={1.25} color={C.ivory} />
        <directionalLight position={[-4, 1, -3]} intensity={0.5} color={C.shell} />
        <directionalLight position={[2, -3, 2]} intensity={0.35} color={C.coral} />
        <Embrace reducedMotion={reducedMotion} />
      </Canvas>
    </div>
  );
}
