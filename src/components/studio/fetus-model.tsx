'use client';

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { paramsForWeek, hotspotPositions, type StageParams } from './params';

/**
 * Parametric fetus + placenta + umbilical cord + uterus, smoothly morphing
 * between gestational-stage proportion keyframes. Educational schematic only.
 */

export interface FetusModelProps {
  week: number;
  showFetus: boolean;
  showPlacenta: boolean;
  showUterus: boolean;
  showLabels: boolean;
  autoRotate: boolean;
  quality: 'low' | 'medium' | 'high';
  labelsLang: 'fa' | 'en';
  onFrameParams?: (p: StageParams) => void;
}

export function FetusModel(props: FetusModelProps) {
  const { week, showFetus, showPlacenta, showUterus, showLabels, autoRotate, quality, labelsLang } = props;
  const group = useRef<THREE.Group>(null);
  const target = useMemo(() => paramsForWeek(week), [week]);
  const current = useRef<StageParams>({ ...target });
  const seg = quality === 'low' ? 12 : quality === 'medium' ? 20 : 32;

  useFrame((_, delta) => {
    const c = current.current;
    const k = Math.min(1, delta * 3.2);
    c.scale += (target.scale - c.scale) * k;
    c.headRatio += (target.headRatio - c.headRatio) * k;
    c.curl += (target.curl - c.curl) * k;
    c.limb += (target.limb - c.limb) * k;
    c.limbWidth += (target.limbWidth - c.limbWidth) * k;
    c.eye += (target.eye - c.eye) * k;
    c.cord += (target.cord - c.cord) * k;
    c.placenta += (target.placenta - c.placenta) * k;
    c.uterus += (target.uterus - c.uterus) * k;
    if (group.current && autoRotate) {
      group.current.rotation.y += delta * 0.25;
    }
    props.onFrameParams?.({ ...c });
  });

  return (
    <group ref={group} dispose={null}>
      {/* Uterine cavity (translucent shell) */}
      {showUterus && (
        <mesh scale={[target.uterus * 1.15, target.uterus * 1.35, target.uterus * 1.15]} renderOrder={2}>
          <sphereGeometry args={[1.05, seg, seg]} />
          <meshStandardMaterial
            color="#c98a95" transparent opacity={0.12} roughness={0.35}
            depthWrite={false} side={THREE.DoubleSide}
          />
        </mesh>
      )}

      {/* Placenta — on the posterior uterine wall */}
      {showPlacenta && (
        <group position={[0, target.uterus * 0.55, -target.uterus * 0.62]} rotation={[Math.PI / 2.35, 0, 0]}>
          <mesh castShadow={false}>
            <cylinderGeometry args={[target.placenta * 0.62, target.placenta * 0.5, 0.07, seg]} />
            <meshStandardMaterial color="#8a4a52" roughness={0.75} />
          </mesh>
          <mesh position={[0, -0.045, 0]}>
            <cylinderGeometry args={[target.placenta * 0.5, target.placenta * 0.42, 0.03, seg]} />
            <meshStandardMaterial color="#6e353d" roughness={0.85} />
          </mesh>
        </group>
      )}

      {/* Umbilical cord — Catmull-Rom tube from abdomen to placenta */}
      {showPlacenta && (
        <UmbilicalCord target={target} seg={seg} />
      )}

      {/* Fetus */}
      {showFetus && (
        <group>
          {/* Torso */}
          <mesh rotation={[target.curl * 0.45, 0, 0]} position={[0, 0, 0]}>
            <capsuleGeometry args={[target.scale * 0.34, target.scale * 0.72, 6, seg]} />
            <meshStandardMaterial color="#e7b29d" roughness={0.55} />
          </mesh>
          {/* Head with jaw taper */}
          <group position={[0, target.scale * 0.72 * Math.cos(target.curl * 0.45) + target.scale * 0.3, target.scale * 0.72 * Math.sin(target.curl * 0.45)]}>
            <mesh scale={[1, 0.94, 1.06]}>
              <sphereGeometry args={[target.scale * 0.34 * target.headRatio * 2.2, seg, seg]} />
              <meshStandardMaterial color="#eec0ac" roughness={0.5} />
            </mesh>
            {/* Eyes */}
            {target.eye > 0.05 && (
              <>
                <mesh position={[-target.scale * 0.12, target.scale * 0.03, target.scale * 0.3]} scale={[1, 0.8, 0.5]}>
                  <sphereGeometry args={[target.scale * 0.07 * target.eye * 2, seg / 2, seg / 2]} />
                  <meshStandardMaterial color="#2c2226" roughness={0.25} />
                </mesh>
                <mesh position={[target.scale * 0.12, target.scale * 0.03, target.scale * 0.3]} scale={[1, 0.8, 0.5]}>
                  <sphereGeometry args={[target.scale * 0.07 * target.eye * 2, seg / 2, seg / 2]} />
                  <meshStandardMaterial color="#2c2226" roughness={0.25} />
                </mesh>
              </>
            )}
          </group>
          {/* Limbs — two-segment arms and legs with joints */}
          {target.limb > 0.04 && (
            <>
              <Limb
                root={[-target.scale * 0.3, target.scale * 0.22, 0.05]}
                dir={[-1, -1, 0.3]} len={target.scale * 0.5 * target.limb} width={target.scale * 0.085 * target.limbWidth} seg={seg} curl={target.curl}
              />
              <Limb
                root={[target.scale * 0.3, target.scale * 0.22, 0.05]}
                dir={[1, -1, 0.3]} len={target.scale * 0.5 * target.limb} width={target.scale * 0.085 * target.limbWidth} seg={seg} curl={target.curl}
              />
              <Limb
                root={[-target.scale * 0.17, -target.scale * 0.34, 0.08]}
                dir={[-0.7, -1, 0.25]} len={target.scale * 0.55 * target.limb} width={target.scale * 0.1 * target.limbWidth} seg={seg} curl={target.curl}
              />
              <Limb
                root={[target.scale * 0.17, -target.scale * 0.34, 0.08]}
                dir={[0.7, -1, 0.25]} len={target.scale * 0.55 * target.limb} width={target.scale * 0.1 * target.limbWidth} seg={seg} curl={target.curl}
              />
            </>
          )}
        </group>
      )}

      {/* Educational hotspots */}
      {showLabels && <Hotspots params={target} lang={labelsLang} />}
    </group>
  );
}

function UmbilicalCord({ target, seg }: { target: StageParams; seg: number }) {
  const curve = useMemo(() => {
    const start = new THREE.Vector3(0, -target.scale * 0.3, target.scale * 0.3);
    const mid1 = new THREE.Vector3(0.12 * target.cord, -target.scale * 0.1, target.scale * 0.75);
    const mid2 = new THREE.Vector3(0.05 * target.cord, target.uterus * 0.4, -target.uterus * 0.25);
    const end = new THREE.Vector3(0, target.uterus * 0.55, -target.uterus * 0.55);
    return new THREE.CatmullRomCurve3([start, mid1, mid2, end], false, 'catmullrom', 0.4);
  }, [target.scale, target.cord, target.uterus]);
  const geom = useMemo(() => new THREE.TubeGeometry(curve, Math.max(24, seg), 0.022 + target.scale * 0.02, 8, false), [curve, target.scale, seg]);
  return <mesh geometry={geom}><meshStandardMaterial color="#d9a08e" roughness={0.6} /></mesh>;
}

function Limb({ root, dir, len, width, seg, curl }: {
  root: [number, number, number]; dir: [number, number, number];
  len: number; width: number; seg: number; curl: number;
}) {
  const upper = len * 0.52;
  const lower = len * 0.48;
  const elbow = new THREE.Vector3(root[0] + dir[0] * upper, root[1] + dir[1] * upper, root[2] + dir[2] * upper + curl * 0.03);
  const hand = new THREE.Vector3(elbow.x + dir[0] * lower * 0.8, elbow.y + dir[1] * lower, elbow.z + dir[2] * lower + 0.04);
  const geom1 = useMemo(() => new THREE.CapsuleGeometry(width, upper, 4, seg / 2), [width, upper, seg]);
  const geom2 = useMemo(() => new THREE.CapsuleGeometry(width * 0.85, lower, 4, seg / 2), [width, lower, seg]);
  const mat = <meshStandardMaterial color="#eab8a4" roughness={0.55} />;
  const q1 = new THREE.Quaternion().setFromUnitVectors(
    new THREE.Vector3(0, -1, 0),
    new THREE.Vector3(dir[0], dir[1], dir[2]).normalize()
  );
  const q2 = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, -1, 0), hand.clone().sub(elbow).normalize());
  const e = elbow.toArray(); const h = hand.toArray();
  return (
    <group>
      <mesh position={root} quaternion={q1} geometry={geom1}>{mat}</mesh>
      <mesh position={e} quaternion={q2} geometry={geom2}>{mat}</mesh>
      <mesh position={h}>
        <sphereGeometry args={[width * 1.15, seg / 2, seg / 2]} />
        <meshStandardMaterial color="#eebfab" roughness={0.5} />
      </mesh>
    </group>
  );
}

function Hotspots({ params, lang }: { params: StageParams; lang: 'fa' | 'en' }) {
  const spots = hotspotPositions(params);
  const L: Record<string, [string, string]> = {
    brain: lang === 'fa' ? ['مغز', 'بزرگ‌ترین بخش بدن در هفته‌های اول؛ رشد سریع'] : ['Brain', 'The largest body region early on; rapid growth'],
    heart: lang === 'fa' ? ['قلب', 'از هفته ششم ضربان قابل مشاهده است (نمایش آموزشی)'] : ['Heart', 'Visible pulsing motion from week 6 (educational)'],
    cord: lang === 'fa' ? ['بند ناف', 'مسیر مواد غذایی و اکسیژن از جفت'] : ['Umbilical cord', 'Carries nutrients and oxygen from the placenta'],
    placenta: lang === 'fa' ? ['جفت', 'اندام تبادل مواد بین مادر و جنین'] : ['Placenta', 'Exchange organ between mother and fetus'],
  };
  void params;
  return (
    <>
      {Object.entries(spots).map(([key, pos]) => (
        <Html key={key} position={pos} center distanceFactor={6} zIndexRange={[10, 0]}>
          <div
            className="niva-card rounded-lg border px-2.5 py-1.5 text-xs whitespace-nowrap shadow-lg pointer-events-none"
            role="note"
          >
            <span className="font-semibold text-primary">{L[key][0]}</span>
            <span className="block text-[10px] text-muted-foreground max-w-40 leading-snug">{L[key][1]}</span>
          </div>
        </Html>
      ))}
    </>
  );
}
