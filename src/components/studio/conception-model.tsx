'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { AnnotationMarkers, makeGlowTexture } from './fetus-model';
import { conceptionAnchor } from './params';
import { STUDIO_QUALITY_PRESETS, type StudioQuality } from './quality';

/**
 * Conception stage renderer (weeks 1–3) — the cellular story the parametric
 * fetus cannot tell: fertilization and first cleavage (week 1), morula →
 * blastocyst (week 2), implantation and the embryonic disc (week 3).
 *
 * Everything is magnified thousands of times by definition; the view is an
 * educational illustration, not a scan. Continuous stage factors let the
 * slider glide smoothly between weeks. GPU hygiene mirrors fetus-model:
 * memoized geometries/materials, explicit dispose on unmount, zero
 * per-frame allocation (module-scope scratch objects only).
 */

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const smooth = (a: number, b: number, v: number) => {
  const t = clamp01((v - a) / (b - a));
  return t * t * (3 - 2 * t);
};
const hash = (n: number) => {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
};

/* Module-scope scratch (zero per-frame allocation). */
const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _s = new THREE.Vector3();
const _p = new THREE.Vector3();
const _e = new THREE.Euler();
const _c = new THREE.Color();
const _up = new THREE.Vector3(0, 1, 0);

/* Deterministic Fibonacci-sphere point set (evenly spread, stable). */
function spherePoint(i: number, n: number, spread = 1): [number, number, number] {
  const y = 1 - (2 * (i + 0.5)) / n;
  const r = Math.sqrt(Math.max(0, 1 - y * y));
  const ga = Math.PI * (3 - Math.sqrt(5));
  const th = ga * i;
  return [Math.cos(th) * r * spread, y * spread, Math.sin(th) * r * spread];
}

export interface ConceptionModelProps {
  week: number; // 1..3 (floats glide between stages)
  showCells: boolean;   // embryo-side structures (cells, ICM, disc)
  showShell: boolean;   // support structures (zona, corona, trophectoderm, villi)
  showUterus: boolean;  // endometrial mound (week 3)
  showLabels: boolean;
  autoRotate: boolean;
  quality: StudioQuality;
  labelsLang: 'fa' | 'en';
  closeLabel?: string;
  labelsPortal?: React.RefObject<HTMLElement>;
}

/* Fixed maximum instance budget — the count is clamped per stage. */
const MAX_CELLS = 148;

export function ConceptionModel({
  week,
  showCells,
  showShell,
  showUterus,
  showLabels,
  autoRotate,
  quality,
  labelsLang,
  closeLabel = 'Close',
  labelsPortal,
}: ConceptionModelProps) {
  const preset = STUDIO_QUALITY_PRESETS[quality];
  const group = useRef<THREE.Group>(null);
  const reduceMotion = !autoRotate;

  /* ---- damped week glide ---- */
  const cw = useRef(week);
  const builtKey = useRef('');

  /* ---- palettes (computed once per tier — pure constants otherwise) ---- */
  const pal = useMemo(
    () => ({
      ovum: new THREE.Color('#ffbe92'),
      cytoplasm: new THREE.Color('#ffd8b8'),
      cell: new THREE.Color('#ffcfae'),
      cellDeep: new THREE.Color('#f2987c'),
      icm: new THREE.Color('#f6b092'),
      zona: new THREE.Color('#ffe9d4'),
      mound: new THREE.Color('#e59a92'),
      moundDeep: new THREE.Color('#cf7f7c'),
      villi: new THREE.Color('#b2536a'),
      disc: new THREE.Color('#f4c3a8'),
      discUnder: new THREE.Color('#e8a98c'),
      streak: new THREE.Color('#8a4a52'),
      sperm: new THREE.Color('#e8d5c8'),
      glow: new THREE.Color('#ffb489'),
    }),
    []
  );

  /* ---- shared materials (memoized, disposed on unmount) ---- */
  const mats = useMemo(() => {
    const skin = (color: THREE.Color, rough = 0.38) =>
      new THREE.MeshPhysicalMaterial({
        color,
        roughness: rough,
        metalness: 0,
        clearcoat: 0.35,
        clearcoatRoughness: 0.5,
        sheen: 1,
        sheenColor: new THREE.Color('#ffd9c0'),
        sheenRoughness: 0.45,
        envMapIntensity: 0.9,
      });
    return {
      cell: skin(pal.cell.clone()),
      cellDeep: skin(pal.cellDeep.clone(), 0.45),
      icm: skin(pal.icm.clone(), 0.34),
      ovum: skin(pal.ovum.clone(), 0.3),
      zona: new THREE.MeshPhysicalMaterial({
        color: pal.zona,
        roughness: 0.25,
        metalness: 0,
        transparent: true,
        opacity: 0.16,
        clearcoat: 1,
        clearcoatRoughness: 0.25,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
      fluid: new THREE.MeshPhysicalMaterial({
        color: new THREE.Color('#ffdcb8'),
        roughness: 0.15,
        transparent: true,
        opacity: 0.22,
        clearcoat: 1,
        depthWrite: false,
      }),
      mound: skin(pal.mound.clone(), 0.5),
      villi: skin(pal.villi.clone(), 0.5),
      disc: skin(pal.disc.clone(), 0.42),
      discUnder: skin(pal.discUnder.clone(), 0.46),
      streak: new THREE.MeshStandardMaterial({ color: pal.streak, roughness: 0.6, transparent: true, opacity: 0.85 }),
      sperm: skin(pal.sperm.clone(), 0.35),
      spermTail: new THREE.MeshStandardMaterial({ color: pal.sperm, roughness: 0.5, transparent: true, opacity: 0.8 }),
    };
  }, [pal]);

  useEffect(() => {
    const list = Object.values(mats) as THREE.Material[];
    return () => list.forEach((m) => m.dispose());
  }, [mats]);

  /* ---- glow texture (heartbeat-style soft sprite) ---- */
  const glowTex = useMemo(() => makeGlowTexture(), []);
  useEffect(() => () => glowTex.dispose(), [glowTex]);

  /* ---- static geometries (memoized, disposed on unmount) ---- */
  const geo = useMemo(() => {
    const seg = Math.max(10, Math.round(preset.radialSegments / 3));
    return {
      cell: new THREE.SphereGeometry(1, seg, seg),
      ovum: new THREE.SphereGeometry(1, preset.radialSegments, preset.radialSegments),
      zona: new THREE.SphereGeometry(1, preset.radialSegments, Math.round(preset.radialSegments * 0.66)),
      disc: new THREE.CylinderGeometry(1, 1, 1, preset.radialSegments),
      mound: new THREE.SphereGeometry(1, preset.radialSegments, Math.round(preset.radialSegments * 0.62)),
      tail: null as THREE.TubeGeometry | null,
    };
  }, [preset]);
  useEffect(() => {
    return () => {
      geo.cell.dispose();
      geo.ovum.dispose();
      geo.zona.dispose();
      geo.disc.dispose();
      geo.mound.dispose();
      geo.tail?.dispose();
    };
  }, [geo]);

  /* sperm tail — one gentle S-curve (rebuilt never; static shape, animated pose) */
  useEffect(() => {
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= 16; i++) {
      const t = i / 16;
      pts.push(new THREE.Vector3(t * 0.9, Math.sin(t * Math.PI * 1.6) * 0.09, Math.cos(t * Math.PI) * 0.04));
    }
    const t = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 24, 0.012, 6, false);
    geo.tail = t;
    return () => {
      t.dispose();
      geo.tail = null;
    };
  }, [geo]);

  /* ---- refs to animated objects ---- */
  const cellsRef = useRef<THREE.InstancedMesh>(null);
  const ovumRef = useRef<THREE.Mesh>(null);
  const innerRef = useRef<THREE.Mesh>(null);
  const zonaRef = useRef<THREE.Mesh>(null);
  const fluidRef = useRef<THREE.Mesh>(null);
  const discRef = useRef<THREE.Group>(null);
  const streakRef = useRef<THREE.Mesh>(null);
  const moundRef = useRef<THREE.Mesh>(null);
  const spermRef = useRef<THREE.Group>(null);
  const spermMat = useRef<THREE.MeshPhysicalMaterial | null>(null);
  const glowRef = useRef<THREE.Sprite>(null);
  const villiRef = useRef<THREE.Group>(null);

  /* Ensure instanced mesh exists with max budget. */
  const instanceKey = `cells-${quality}`;
  useEffect(() => {
    const mesh = cellsRef.current;
    if (mesh) mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  }, [instanceKey]);

  /* Mark built-flag dirty whenever week/quality changes. */
  useEffect(() => {
    builtKey.current = '';
  }, [week, quality]);

  useFrame((state, delta) => {
    const T = state.clock.elapsedTime;

    // Damped glide toward the requested week.
    const k = Math.min(1, delta * 3.4);
    cw.current += (week - cw.current) * k;
    const w = cw.current;
    // Stage factors — tuned so each INTEGER week reads as its textbook stage:
    // w1 zygote→2-cell, w2 4/8-cell→morula→blastocyst, w3 implanted disc + streak.
    const two = smooth(1.35, 1.7, w);
    const four = smooth(1.7, 2.0, w);
    const eight = smooth(2.0, 2.3, w);
    const morula = smooth(2.3, 2.6, w);
    const blast = smooth(2.5, 2.85, w);
    const hatch = smooth(2.7, 3.0, w);
    const implant = smooth(2.8, 3.0, w);
    const disc = smooth(2.8, 3.0, w);
    const streak = smooth(2.9, 3.15, w);
    const spermF = 1 - smooth(1.05, 1.3, w);

    /* ---- group sway ---- */
    if (group.current) {
      group.current.rotation.y += autoRotate ? delta * 0.22 : 0;
      group.current.position.y = Math.sin(T * 0.5) * (reduceMotion ? 0 : 0.02);
    }

    /* ---- instance rebuild (quantized) ---- */
    const mesh = cellsRef.current;
    const key = `${w.toFixed(2)}|${showCells}|${showShell}|${quality}`;
    if (mesh && key !== builtKey.current) {
      builtKey.current = key;
      let n = 0;
      const put = (x: number, y: number, z: number, r: number, deep = false) => {
        if (n >= MAX_CELLS) return;
        _e.set(0, 0, 0);
        _q.setFromEuler(_e);
        _p.set(x, y, z);
        _s.setScalar(r);
        _m.compose(_p, _q, _s);
        mesh.setMatrixAt(n, _m);
        if (mesh.instanceColor) {
          _c.copy(deep ? pal.cellDeep : pal.cell);
          mesh.setColorAt(n, _c);
        }
        n++;
      };

      /* Cleavage ladder — stages replace each other (no overlapping mixes). */
      if (showCells) {
        if (two < 0.02) {
          put(0, 0, 0, 0.5); // zygote body
        } else if (four < 0.02) {
          // 2-cell: two blastomeres along ±x
          const sep = 0.3 + 0.1 * two;
          put(-sep, 0, 0, 0.36);
          put(sep, 0, 0, 0.36);
        } else if (eight < 0.02) {
          // 4-cell tetrad
          const s4 = 0.24 + 0.06 * four;
          for (const sx of [-1, 1])
            for (const sy of [-1, 1]) put(sx * s4, sy * s4 * 0.9, 0, 0.27);
        } else if (morula < 0.02) {
          // 8-cell morula precursor
          for (let i = 0; i < 8; i++) {
            const [px, py, pz] = spherePoint(i, 8);
            put(px * 0.3, py * 0.3, pz * 0.3, 0.23, i % 2 === 0);
          }
        } else {
          // compact mulberry morula → hollow blastocyst
          const blastMix = blast;
          const nM = 30;
          for (let i = 0; i < nM; i++) {
            const [px, py, pz] = spherePoint(i, nM, 0.72);
            const jx = (hash(i * 3.1) - 0.5) * 0.08;
            const jy = (hash(i * 5.7) - 0.5) * 0.08;
            // morula cells drift outward into the trophectoderm shell
            const ex = px * (0.72 + 0.16 * blastMix);
            const ey = py * (0.72 + 0.16 * blastMix);
            const ez = pz * (0.72 + 0.16 * blastMix);
            put(ex + jx * (1 - blastMix), ey + jy * (1 - blastMix), ez, 0.16 + hash(i) * 0.05 - 0.04 * blastMix, i % 3 === 0);
          }
          if (blast > 0.02) {
            // inner cell mass condenses at the animal pole
            for (let i = 0; i < 10; i++) {
              const [px, py, pz] = spherePoint(i, 10, 0.3);
              put(px * 0.2, 0.42 + py * 0.14 + 0.06 * blast, 0.2 + pz * 0.14, 0.115);
            }
          }
        }
      }

      /* Corona radiata (support layer, fades as the zona hatches). */
      if (showShell && hatch < 0.98) {
        const nC = 26;
        const spread = 0.95 + Math.sin(T * 0.3) * 0.015;
        for (let i = 0; i < nC; i++) {
          const [px, py, pz] = spherePoint(i, nC, 1);
          const wob = 0.92 + hash(i * 11.3) * 0.16;
          put(px * spread * wob, py * spread * wob, pz * spread * wob, 0.075, true);
        }
      }

      mesh.count = n;
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    }

    /* ---- ovum core: visible pre-cleavage, then fades as cells take over ---- */
    if (ovumRef.current) {
      const ovumVis = 1 - smooth(1.3, 1.7, w);
      ovumRef.current.visible = ovumVis > 0.03;
      ovumRef.current.scale.setScalar(0.52 * (0.9 + 0.1 * Math.sin(T * 0.8) * (reduceMotion ? 0 : 1)));
      (ovumRef.current.material as THREE.MeshPhysicalMaterial).opacity = 0.85 * ovumVis;
    }
    if (innerRef.current) {
      const innerVis = 1 - smooth(1.3, 1.7, w);
      innerRef.current.visible = innerVis > 0.03;
      innerRef.current.scale.setScalar(0.44);
      (innerRef.current.material as THREE.MeshPhysicalMaterial).opacity = 0.5 * innerVis;
    }

    /* ---- zona pellucida: shell that thins + shrinks as it hatches ---- */
    if (zonaRef.current) {
      const zr = 0.8 * (1 - hatch * 0.55);
      zonaRef.current.visible = hatch < 0.99 && showShell;
      zonaRef.current.scale.setScalar(Math.max(0.001, zr));
      (zonaRef.current.material as THREE.MeshPhysicalMaterial).opacity = 0.16 * (1 - hatch * 0.8);
    }

    /* ---- blastocoel fluid sphere ---- */
    if (fluidRef.current) {
      fluidRef.current.visible = blast > 0.05;
      fluidRef.current.scale.setScalar(0.34 + 0.24 * blast);
      (fluidRef.current.material as THREE.MeshPhysicalMaterial).opacity = 0.22 * blast;
    }

    /* ---- embryonic disc (week 3): settles from the ICM into the wall ---- */
    if (discRef.current) {
      discRef.current.visible = disc > 0.04 && showCells;
      discRef.current.position.set(0, 0.3 - 0.45 * implant, 0.16 - 0.3 * implant);
      discRef.current.rotation.set(-0.35 + implant * 0.5, 0, 0.12);
      discRef.current.scale.set(0.34 + 0.1 * disc, 0.02, 0.26 + 0.08 * disc);
    }
    if (streakRef.current) {
      streakRef.current.visible = streak > 0.05 && showCells;
      streakRef.current.scale.set(0.3 * streak, 1, 1);
    }

    /* ---- endometrial mound (week 3) ---- */
    if (moundRef.current) {
      moundRef.current.visible = implant > 0.04 && showUterus;
      moundRef.current.position.set(0, -1.02, -0.32);
      moundRef.current.scale.set(2.3, 0.95, 1.7);
    }

    /* ---- chorionic villi (week 3) track the implantation site ---- */
    if (villiRef.current) {
      villiRef.current.visible = implant > 0.06 && showShell;
      villiRef.current.position.set(0, 0.24 - 0.42 * implant, 0.1 - 0.26 * implant);
    }

    /* ---- sperm (week 1 only) ---- */
    if (spermRef.current) {
      spermRef.current.visible = spermF > 0.03;
      const a = T * (reduceMotion ? 0.12 : 0.55);
      spermRef.current.position.set(
        -1.9 + Math.cos(a) * 0.28 + (1 - spermF) * 1.25,
        0.18 + Math.sin(a * 1.3) * 0.2,
        0.55 + Math.sin(a) * 0.22
      );
      spermRef.current.rotation.set(Math.PI / 2 + Math.sin(a * 0.7) * 0.3, -0.4, a * 1.4);
      if (spermMat.current) spermMat.current.opacity = 0.9 * spermF;
      const tail = spermRef.current.getObjectByName('tail') as THREE.Mesh | null;
      if (tail?.material) (tail.material as THREE.MeshStandardMaterial).opacity = 0.75 * spermF;
    }

    /* ---- soft inner glow pulse ---- */
    if (glowRef.current) {
      const pulse = reduceMotion ? 0.5 : 0.5 + 0.5 * Math.sin(T * 1.4);
      const gm = glowRef.current.material as THREE.SpriteMaterial;
      gm.opacity = 0.16 + 0.12 * pulse;
      glowRef.current.scale.setScalar(2.1 + 0.12 * pulse);
      glowRef.current.position.set(0, 0.08, 0.05);
    }
  });

  /* Deterministic villi geometry (week 3) — rebuilt per tier. */
  const villi = useMemo(() => {
    const arr: THREE.BufferGeometry[] = [];
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2 + hash(i) * 0.6;
      const from = new THREE.Vector3(Math.cos(a) * 0.5, 0.02, Math.sin(a) * 0.42);
      const to = new THREE.Vector3(Math.cos(a) * 0.95, -0.4 - hash(i * 3) * 0.25, Math.sin(a) * 0.85);
      const mid = from.clone().lerp(to, 0.5).add(new THREE.Vector3(0, 0.12, 0));
      arr.push(new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(from, mid, to), preset.vesselSegments, 0.028, 5, false));
    }
    return arr;
  }, [preset]);
  useEffect(() => () => villi.forEach((g) => g.dispose()), [villi]);

  return (
    <group ref={group} dispose={null}>
      {/* soft amniotic core glow */}
      <sprite ref={glowRef} renderOrder={2}>
        <spriteMaterial map={glowTex} color={pal.glow} transparent opacity={0.2} depthWrite={false} blending={THREE.AdditiveBlending} />
      </sprite>

      {/* endometrial mound — the week-3 world */}
      <mesh ref={moundRef} geometry={geo.mound} material={mats.mound} visible={false} castShadow={preset.shadows} receiveShadow={preset.shadows} />

      {/* chorionic villi */}
      <group ref={villiRef} visible={false} position={[0, 0.02, -0.08]}>
        {villi.map((g, i) => (
          <mesh key={i} geometry={g} material={mats.villi} />
        ))}
      </group>

      {/* ovum cytoplasm (week 1) */}
      <mesh ref={ovumRef} geometry={geo.ovum} material={mats.ovum} />
      <mesh ref={innerRef} geometry={geo.zona} visible={false}>
        <meshPhysicalMaterial color="#ffe0c2" roughness={0.2} transparent opacity={0.5} clearcoat={1} depthWrite={false} side={THREE.BackSide} />
      </mesh>

      {/* zona pellucida shell */}
      <mesh ref={zonaRef} geometry={geo.zona} material={mats.zona} renderOrder={3} scale={0.8} />

      {/* blastocoel fluid */}
      <mesh ref={fluidRef} geometry={geo.zona} material={mats.fluid} renderOrder={2} visible={false} />

      {/* cells — one instanced pool for every stage */}
      <instancedMesh key={instanceKey} ref={cellsRef} args={[geo.cell, mats.cell, MAX_CELLS]} castShadow={preset.shadows}>
        <instancedBufferAttribute attach="instanceColor" args={[new Float32Array(MAX_CELLS * 3).fill(1), 3]} />
      </instancedMesh>

      {/* embryonic disc + primitive streak (week 3) */}
      <group ref={discRef} visible={false}>
        <mesh geometry={geo.disc} material={mats.disc} castShadow={preset.shadows} />
        <mesh geometry={geo.disc} material={mats.discUnder} position={[0, -0.55, 0]} scale={[0.92, 1, 0.92]} />
        <mesh ref={streakRef} material={mats.streak} visible={false}>
          <boxGeometry args={[1, 1.4, 0.5]} />
        </mesh>
      </group>

      {/* sperm (week 1 storytelling) */}
      <group ref={spermRef} visible={false}>
        <mesh material={mats.sperm} rotation={[0, 0, Math.PI / 2]} castShadow={preset.shadows}>
          <capsuleGeometry args={[0.045, 0.09, 6, 12]} />
        </mesh>
        <mesh name="tail" geometry={geo.tail ?? undefined} material={mats.spermTail} position={[0, -0.12, 0]} rotation={[0, 0, -Math.PI / 2]} />
      </group>

      {showLabels && (
        <AnnotationMarkers
          week={week}
          lang={labelsLang}
          closeLabel={closeLabel}
          portal={labelsPortal}
          anchorFn={(target) => conceptionAnchor(week, target)}
        />
      )}
    </group>
  );
}
