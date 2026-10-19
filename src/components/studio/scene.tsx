'use client';

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Environment, Lightformer } from '@react-three/drei';
import * as THREE from 'three';
import { makeGlowTexture } from './fetus-model';

/**
 * Studio scene dressing: a photographic three-point lighting rig with a
 * locally-generated environment map (no CDN), plus slow-drifting amniotic
 * particles for depth. All decorative — respects reduced motion.
 */

export function StudioLighting({ quality }: { quality: 'low' | 'medium' | 'high' }) {
  const key = useRef<THREE.DirectionalLight>(null);
  const shadowRes = quality === 'high' ? 2048 : 1024;
  return (
    <>
      <hemisphereLight args={['#fff3e9', '#dcbfae']} intensity={0.55} />
      {/* Warm key light with soft shadows */}
      <directionalLight
        ref={key}
        position={[2.6, 3.4, 2.4]}
        intensity={1.5}
        color="#fff1e4"
        castShadow={quality !== 'low'}
        shadow-mapSize-width={shadowRes}
        shadow-mapSize-height={shadowRes}
        shadow-bias={-0.0004}
        shadow-normalBias={0.02}
        shadow-camera-near={0.5}
        shadow-camera-far={12}
        shadow-camera-left={-2.8}
        shadow-camera-right={2.8}
        shadow-camera-top={2.8}
        shadow-camera-bottom={-2.8}
      />
      {/* Warm rim from behind-left */}
      <directionalLight position={[-3, 1.4, -2.6]} intensity={0.75} color="#ffd9c4" />
      {/* Gentle frontal fill */}
      <directionalLight position={[-1.6, 0.4, 3.2]} intensity={0.38} color="#ffe9d8" />

      {/* Local environment — soft studio lightformers, rendered in-place */}
      <Environment resolution={128} frames={1}>
        <Lightformer form="rect" intensity={1.5} color="#fff2e6" position={[0, 4, 1]} scale={[7, 3, 1]} />
        <Lightformer form="rect" intensity={0.9} color="#ffe4d4" position={[-4.5, 1, 2]} scale={[3, 5, 1]} />
        <Lightformer form="rect" intensity={0.9} color="#ffdccb" position={[4.5, 0.6, -1]} scale={[3, 5, 1]} />
        <Lightformer form="ring" intensity={0.6} color="#f7d8c8" position={[0, -3.5, 0.5]} scale={[5, 5, 1]} />
        <Lightformer form="circle" intensity={0.5} color="#ffffff" position={[0, 1, -5]} scale={[3, 3, 1]} />
      </Environment>
    </>
  );
}

export function AmnioticParticles({ count, reduceMotion }: { count: number; reduceMotion: boolean }) {
  const points = useRef<THREE.Points>(null);
  const tex = useMemo(() => makeGlowTexture(), []);

  const { positions, base, phase } = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const base = new Float32Array(count * 3);
    const phase = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      // Loose spherical shell around the model, slightly biased upward.
      const r = 1.3 + Math.random() * 1.5;
      const th = Math.random() * Math.PI * 2;
      const y = (Math.random() - 0.35) * 2.6;
      const x = Math.cos(th) * r;
      const z = Math.sin(th) * r;
      base[i * 3] = x; base[i * 3 + 1] = y; base[i * 3 + 2] = z;
      positions[i * 3] = x; positions[i * 3 + 1] = y; positions[i * 3 + 2] = z;
      phase[i] = Math.random() * Math.PI * 2;
    }
    return { positions, base, phase };
  }, [count]);

  useFrame(({ clock }) => {
    if (reduceMotion || !points.current) return;
    const t = clock.elapsedTime;
    const attr = points.current.geometry.getAttribute('position') as THREE.BufferAttribute;
    const arr = attr.array as Float32Array;
    for (let i = 0; i < count; i++) {
      const p = phase[i];
      arr[i * 3] = base[i * 3] + Math.sin(t * 0.22 + p) * 0.12;
      arr[i * 3 + 1] = base[i * 3 + 1] + Math.sin(t * 0.16 + p * 1.7) * 0.16 + t * 0.008 % 0.1;
      arr[i * 3 + 2] = base[i * 3 + 2] + Math.cos(t * 0.19 + p) * 0.12;
    }
    attr.needsUpdate = true;
  });

  return (
    <points ref={points} renderOrder={1}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.055}
        map={tex}
        color="#ffd9c2"
        transparent
        opacity={0.35}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        sizeAttenuation
      />
    </points>
  );
}
