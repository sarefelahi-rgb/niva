'use client';

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { useApp } from '@/store/app';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { STAGE_WEEKS, paramsForWeek } from './params';
import { FetusModel } from './fetus-model';
import { StudioLighting, AmnioticParticles } from './scene';
import { Box, Play, Pause, RotateCcw, ZoomIn, ZoomOut, ScanEye, BookOpenText, Layers, Sparkles } from 'lucide-react';
import type * as THREE from 'three';

interface AssetInfo {
  assetId: string; gestationalStage: number; titleEn: string; titleFa: string;
  descriptionEn: string; descriptionFa: string; reviewStatus: string; locked?: boolean;
}

export function StudioView({ fullscreen = false }: { fullscreen?: boolean }) {
  const { t, locale, features } = useApp();
  const [assets, setAssets] = useState<AssetInfo[]>([]);
  const [week, setWeek] = useState(12);
  const [fetus, setFetus] = useState(true);
  const [placenta, setPlacenta] = useState(true);
  const [uterus, setUterus] = useState(true);
  const [labels, setLabels] = useState(true);
  const [autoRotate, setAutoRotate] = useState(true);
  const [guided, setGuided] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [arSupported, setArSupported] = useState(false);
  const [zoom, setZoom] = useState(5.0);
  const [quality, setQuality] = useState<'low' | 'medium' | 'high'>('medium');
  const glRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<{ fov: number; updateProjectionMatrix(): void } | null>(null);

  const canAdvanced = features?.advanced3DLayers ?? false;
  const stage = useMemo(() => assets.find((a) => a.gestationalStage === week), [assets, week]);

  useEffect(() => {
    fetch('/api/assets').then((r) => r.json()).then((d) => setAssets(d.assets ?? [])).catch(() => undefined);
    // Device-adaptive quality (LOD tier 1) + WebXR AR capability detection — deferred to avoid sync effects.
    const id = requestAnimationFrame(() => {
      const isMobile = window.matchMedia('(max-width: 640px)').matches;
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      setQuality(isMobile ? 'low' : 'medium');
      setReduceMotion(reduce);
      if (reduce) setAutoRotate(false);
      const xr = (navigator as Navigator & { xr?: { isSessionSupported(m: string): Promise<boolean> } }).xr;
      if (xr) xr.isSessionSupported('immersive-ar').then(setArSupported).catch(() => setArSupported(false));
    });
    return () => cancelAnimationFrame(id);
  }, []);

  // Guided tour: advance through stages every 5 seconds.
  useEffect(() => {
    if (!guided) return;
    const id = setInterval(() => {
      setWeek((w) => {
        const idx = STAGE_WEEKS.indexOf(w);
        return STAGE_WEEKS[(idx + 1) % STAGE_WEEKS.length];
      });
    }, 5000);
    return () => clearInterval(id);
  }, [guided]);

  const zoomBy = useCallback((d: number) => {
    setZoom((z) => Math.min(8, Math.max(1.6, z + d)));
  }, []);

  const enterAR = useCallback(async () => {
    const gl = glRef.current;
    const xr = (navigator as Navigator & { xr?: { requestSession(m: string, o?: object): Promise<XRSession> } }).xr;
    if (!gl || !xr) return;
    try {
      const session = await xr.requestSession('immersive-ar', { optionalFeatures: ['dom-overlay'] });
      gl.xr.enabled = true;
      await gl.xr.setSession(session as unknown as Parameters<typeof gl.xr.setSession>[0]);
    } catch {
      setArSupported(false);
    }
  }, []);

  const setCameraFov = (fov: number) => {
    if (cameraRef.current) {
      cameraRef.current.fov = fov;
      cameraRef.current.updateProjectionMatrix();
    }
  };

  const zoomIn = () => { zoomBy(-0.6); setCameraFov(36); };
  const zoomOut = () => { zoomBy(0.6); setCameraFov(46); };

  const layerBtn = (on: boolean, set: (v: boolean) => void, label: string, icon: React.ReactNode, locked = false) => (
    <button
      onClick={() => !locked && set(!on)}
      aria-pressed={on}
      disabled={locked}
      className={`flex items-center gap-1.5 rounded-full border px-3 py-2 text-xs min-h-9 transition-all ${
        on ? 'bg-primary text-primary-foreground border-primary shadow' : 'hover:bg-muted text-muted-foreground'
      } ${locked ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      {icon}{label}{locked && ' 🔒'}
    </button>
  );

  const body = (
    <div className={`grid ${fullscreen ? 'h-[calc(100vh-3.5rem)]' : 'h-[70vh] min-h-[480px]'} lg:grid-cols-[1fr_320px] gap-3 p-3`}>
      {/* 3D canvas */}
      <div className="relative rounded-2xl border niva-grad overflow-hidden bg-card/40">
        <Canvas
          dpr={[1, quality === 'low' ? 1.25 : quality === 'medium' ? 1.6 : 2]}
          shadows={quality !== 'low'}
          gl={{ antialias: true, alpha: true }}
          camera={{ position: [0.55, 0.32, zoom], fov: 40 }}
          onCreated={({ gl, camera }) => {
            glRef.current = gl;
            cameraRef.current = camera as unknown as { fov: number; updateProjectionMatrix(): void };
          }}
          aria-label={t('studio.title')}
          role="application"
        >
          <StudioLighting quality={quality} />
          <Suspense fallback={null}>
            <FetusModel
              week={week}
              showFetus={fetus}
              showPlacenta={placenta}
              showUterus={uterus}
              showLabels={labels && !reduceMotion}
              autoRotate={autoRotate && !reduceMotion}
              quality={quality}
              labelsLang={locale === 'fa' ? 'fa' : 'en'}
            />
          </Suspense>
          <AmnioticParticles
            count={quality === 'low' ? 36 : quality === 'medium' ? 90 : 150}
            reduceMotion={reduceMotion}
          />
          <OrbitControls
            enablePan={false}
            minDistance={1.6}
            maxDistance={9}
            target={[0, 0.05, 0]}
            autoRotate={false}
            makeDefault
          />
        </Canvas>

        {/* Photographic vignette */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{ background: 'radial-gradient(ellipse 75% 70% at 50% 42%, transparent 55%, rgba(94,44,52,0.16) 100%)' }}
        />

        {/* Viewport chrome */}
        <div className="absolute top-3 start-3 flex flex-col gap-1.5">
          <Badge className="w-fit bg-warning/15 text-warning-foreground border-warning/30 text-[10px]">
            {t('studio.demoAsset')}
          </Badge>
          {stage?.reviewStatus && (
            <Badge variant="outline" className="w-fit text-[10px]">{t(`status.${stage.reviewStatus}`)}</Badge>
          )}
        </div>
        <div className="absolute bottom-3 end-3 flex gap-1.5">
          <Button variant="outline" size="icon" className="min-h-10 w-10 bg-card/80 backdrop-blur" onClick={zoomIn} aria-label={t('studio.zoomIn')}>
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" className="min-h-10 w-10 bg-card/80 backdrop-blur" onClick={zoomOut} aria-label={t('studio.zoomOut')}>
            <ZoomOut className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" className="min-h-10 w-10 bg-card/80 backdrop-blur" onClick={() => { setZoom(5.0); setCameraFov(40); }} aria-label={t('studio.reset')}>
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>
        {reduceMotion && (
          <div className="absolute bottom-3 start-3">
            <Badge variant="secondary" className="text-[10px]">{t('studio.reducedMotion')}</Badge>
          </div>
        )}
      </div>

      {/* Control panel */}
      <aside className="flex flex-col gap-3 overflow-y-auto" aria-label={t('studio.layers')}>
        <div className="niva-card rounded-2xl border p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Box className="h-4 w-4 text-primary" />
            <h2 className="font-semibold text-sm">{t('studio.stage')}</h2>
            <span className="ms-auto text-2xl font-extrabold text-primary num">{week}</span>
          </div>
          <Slider
            value={[week]}
            onValueChange={(v) => setWeek(v[0])}
            min={4}
            max={40}
            step={1}
            aria-label={t('studio.stage')}
          />
          <div className="grid grid-cols-6 gap-1">
            {STAGE_WEEKS.map((w) => (
              <button
                key={w}
                onClick={() => setWeek(w)}
                aria-pressed={week === w}
                className={`h-8 rounded-md text-[10px] num transition-colors min-h-8 ${week === w ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-primary/15'}`}
              >
                {w}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {layerBtn(fetus, setFetus, t('studio.layerFetus'), <Layers className="h-3 w-3" />)}
            {layerBtn(placenta, setPlacenta, t('studio.layerPlacenta'), <Layers className="h-3 w-3" />, !canAdvanced)}
            {layerBtn(uterus, setUterus, t('studio.layerUterus'), <Layers className="h-3 w-3" />, !canAdvanced)}
            {layerBtn(labels, setLabels, t('studio.layerHotspots'), <ScanEye className="h-3 w-3" />)}
          </div>
          <div className="flex flex-wrap gap-1.5 border-t pt-3">
            {layerBtn(autoRotate, setAutoRotate, t('studio.autoRotate'), <RotateCcw className="h-3 w-3" />)}
            {layerBtn(guided, setGuided, t('studio.guided'), <Play className="h-3 w-3" />, !(features?.guidedMode ?? false))}
            {arSupported ? (
              <button onClick={enterAR} className="flex items-center gap-1.5 rounded-full border border-primary px-3 py-2 text-xs min-h-9 bg-primary/10 text-primary">
                <ScanEye className="h-3 w-3" />{t('studio.ar')}
              </button>
            ) : (
              <span className="text-[10px] text-muted-foreground self-center">{t('studio.arUnsupported')}</span>
            )}
          </div>
          <div className="border-t pt-3 space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Sparkles className="h-3 w-3" />{t('studio.quality')}
            </div>
            <div className="grid grid-cols-3 gap-1" role="group" aria-label={t('studio.quality')}>
              {([['low', t('studio.qLow')], ['medium', t('studio.qMed')], ['high', t('studio.qHigh')]] as const).map(([q, label]) => (
                <button
                  key={q}
                  onClick={() => setQuality(q)}
                  aria-pressed={quality === q}
                  className={`h-8 rounded-md text-[10px] transition-colors min-h-8 ${quality === q ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-primary/15'}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Stage description (text alternative — accessibility) */}
        <div className="niva-card rounded-2xl border p-4 space-y-2">
          <div className="flex items-center gap-2">
            <BookOpenText className="h-4 w-4 text-primary" />
            <h3 className="font-semibold text-sm">{stage ? (locale === 'fa' ? stage.titleFa : stage.titleEn) : `W${week}`}</h3>
          </div>
          <p className="text-xs leading-relaxed text-muted-foreground" role="description">
            {stage ? (locale === 'fa' ? stage.descriptionFa : stage.descriptionEn) : (locale === 'fa' ? 'مرحله بین کلیدفریم‌ها — متن مرحله نزدیک را ببینید.' : 'Between keyframe stages — see the nearest stage description.')}
          </p>
          <p className="text-[10px] text-muted-foreground num">{paramsSummary(week)}</p>
          <p className="text-[10px] text-muted-foreground">{t('studio.sub')}</p>
        </div>
      </aside>
    </div>
  );

  return body;
}

function paramsSummary(week: number): string {
  const p = paramsForWeek(week);
  return `head/body ${p.headRatio.toFixed(2)} · curl ${(p.curl * 57.3).toFixed(0)}° · limbs ${(p.limb * 100).toFixed(0)}% · placenta ${(p.placenta * 100).toFixed(0)}%`;
}
