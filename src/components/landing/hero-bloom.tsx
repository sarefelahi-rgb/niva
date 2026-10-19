'use client';

/**
 * Landing hero "Bloom" — a deliberately lightweight ambient 3D scene.
 * Loaded via next/dynamic (ssr:false) AFTER first paint so it never competes
 * with the hero heading for LCP. Single low-poly mesh + three satellites,
 * low-power GL context, honors prefers-reduced-motion (single static frame).
 * Educational ambiance only — this is not a fetal model (the real parametric
 * studio lives in src/components/studio/ and is never loaded on the landing).
 */

import { Canvas, useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';

function BloomCore({ reducedMotion }: { reducedMotion: boolean }) {
  const core = useRef<THREE.Mesh>(null);
  const s1 = useRef<THREE.Mesh>(null);
  const s2 = useRef<THREE.Mesh>(null);
  const s3 = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (reducedMotion) return; // single static frame
    const t = clock.getElapsedTime();
    if (core.current) {
      core.current.rotation.y = t * 0.12;
      core.current.rotation.x = Math.sin(t * 0.1) * 0.08;
    }
    const orbit = (m: THREE.Mesh | null, radius: number, speed: number, phase: number, tilt: number) => {
      if (!m) return;
      m.position.set(
        Math.cos(t * speed + phase) * radius,
        Math.sin(t * speed * 0.8 + phase) * radius * tilt,
        Math.sin(t * speed + phase) * radius
      );
    };
    orbit(s1.current, 1.55, 0.5, 0, 0.45);
    orbit(s2.current, 1.75, 0.38, 2.1, 0.6);
    orbit(s3.current, 1.35, 0.62, 4.2, 0.35);
  });

  return (
    <group>
      {/* Bloom core — soft lavender sphere */}
      <mesh ref={core}>
        <sphereGeometry args={[1, 48, 48]} />
        <meshPhysicalMaterial color="#8b7cc4" roughness={0.28} metalness={0.05} clearcoat={0.6} clearcoatRoughness={0.35} />
      </mesh>
      {/* Inner glow shell */}
      <mesh scale={1.08}>
        <sphereGeometry args={[1, 32, 32]} />
        <meshBasicMaterial color="#b9aede" transparent opacity={0.12} depthWrite={false} />
      </mesh>
      {/* Satellites — coral / sage accents */}
      <mesh ref={s1}>
        <sphereGeometry args={[0.16, 24, 24]} />
        <meshPhysicalMaterial color="#e08d7a" roughness={0.3} />
      </mesh>
      <mesh ref={s2}>
        <sphereGeometry args={[0.12, 24, 24]} />
        <meshPhysicalMaterial color="#8faf8f" roughness={0.3} />
      </mesh>
      <mesh ref={s3}>
        <sphereGeometry args={[0.1, 24, 24]} />
        <meshPhysicalMaterial color="#c9bce2" roughness={0.3} />
      </mesh>
    </group>
  );
}

export default function HeroBloom() {
  const reducedMotion =
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  return (
    <Canvas
      dpr={[1, 1.5]}
      camera={{ position: [0, 0, 4], fov: 42 }}
      gl={{ antialias: true, powerPreference: 'low-power' }}
      frameloop={reducedMotion ? 'demand' : 'always'}
      aria-hidden="true"
      style={{ background: 'transparent' }}
    >
      <ambientLight intensity={0.85} />
      <directionalLight position={[3, 4, 5]} intensity={1.2} color="#fff7ef" />
      <directionalLight position={[-4, -2, -3]} intensity={0.4} color="#e08d7a" />
      <BloomCore reducedMotion={reducedMotion} />
    </Canvas>
  );
}
