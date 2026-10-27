'use client';

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useApp } from '@/store/app';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { STAGE_WEEKS } from './params';
import { FetusModel } from './fetus-model';
import { ConceptionModel } from './conception-model';
import { StudioLighting, AmnioticParticles } from './scene';
import { STUDIO_QUALITY_PRESETS } from './quality';
import { stageContentForWeek } from '@/data/studio-content';
import { Box, BookOpenText, Volume2, Square, MonitorPlay, RefreshCw, Microscope, Sparkles } from 'lucide-react';
import { paramsForWeek } from './params';

interface AssetInfo {
  assetId: string; gestationalStage: number; titleEn: string; titleFa: string;
  descriptionEn: string; descriptionFa: string; reviewStatus: string; locked?: boolean;
}

/**
 * Studio view — one realistic 3D experience, deliberately non-interactive:
 * a slow cinematic turntable of the week-accurate model with full anatomy
 * always on (no photo/2D mode, no orbit/zoom/layer/quality controls — those
 * were removed by design). The only controls that remain are week navigation
 * (slider + stage chips) and the narration card, i.e. content selection,
 * not model interaction. Silent adaptive quality and context-loss recovery
 * still protect frame rate and GPU memory behind the scenes.
 */
export function StudioView({ fullscreen = false }: { fullscreen?: boolean }) {
  const { t, locale } = useApp();
  const [assets, setAssets] = useState<AssetInfo[]>([]);
  const [week, setWeek] = useState(12);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [quality, setQuality] = useState<'low' | 'medium' | 'high'>('high');
  // Wave 3.4: WebGL availability, context-loss recovery, adaptive degrade,
  // and a dev-only memory readout (renderer.info) for the memory-budget test.
  const [webglOk, setWebglOk] = useState<boolean | null>(null);
  const [ctxLost, setCtxLost] = useState(false);
  const [canvasKey, setCanvasKey] = useState(0);
  const [autoAdjusted, setAutoAdjusted] = useState(false);
  const glRef = useRef<WebGLRendererLike | null>(null);
  const ctxHandlers = useRef<{ lost: (e: Event) => void; restored: () => void } | null>(null);

  const stage = assets.find((a) => a.gestationalStage === week);
  const content = stageContentForWeek(week);
  const preset = STUDIO_QUALITY_PRESETS[quality];

  useEffect(() => {
    fetch('/api/assets').then((r) => r.json()).then((d) => setAssets(d.assets ?? [])).catch(() => undefined);
    // Device-adaptive quality + motion preference — deferred to avoid sync effects.
    const id = requestAnimationFrame(() => {
      const isMobile = window.matchMedia('(max-width: 640px)').matches;
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      setQuality(isMobile ? 'medium' : 'high');
      setReduceMotion(reduce);
      // WebGL feature detection — drives the graceful fallback panel (3.4).
      try {
        const c = document.createElement('canvas');
        setWebglOk(Boolean(c.getContext('webgl2') ?? c.getContext('webgl')));
      } catch {
        setWebglOk(false);
      }
    });
    return () => cancelAnimationFrame(id);
  }, []);

  // Context-loss listener cleanup + speech cleanup on unmount (3.4/3.5).
  useEffect(
    () => () => {
      const el = glRef.current?.domElement;
      const h = ctxHandlers.current;
      if (el && h) {
        el.removeEventListener('webglcontextlost', h.lost);
        el.removeEventListener('webglcontextrestored', h.restored);
      }
      try {
        window.speechSynthesis?.cancel();
      } catch {
        /* speech unsupported — nothing to cancel */
      }
    },
    []
  );

  // Adaptive degrade (3.4): one step down when the sustained FPS budget is missed.
  const handleDegrade = useCallback(() => {
    setQuality((q) => (q === 'high' ? 'medium' : q === 'medium' ? 'low' : q));
    setAutoAdjusted(true);
  }, []);

  const body = (
    <div className={`grid ${fullscreen ? 'h-[calc(100vh-3.5rem)]' : 'h-[70vh] min-h-[480px]'} overflow-y-auto lg:overflow-hidden lg:grid-cols-[1fr_320px] gap-3 p-3`}>
      {/* 3D canvas (or graceful WebGL fallback — Wave 3.4).
          The Canvas mounts ONLY after WebGL detection resolves (null → true):
          this isolates the R3F root's initial commit from the outer root's
          detection re-render, avoiding React 19's nested-root unmount race. */}
      <div className="relative rounded-2xl border niva-grad overflow-hidden bg-card/40 h-[54vh] min-h-[240px] lg:h-auto lg:min-h-0">
        {webglOk === false ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-8 text-center">
            <MonitorPlay className="h-10 w-10 text-primary" aria-hidden />
            <h2 className="font-semibold text-sm">{t('studio.webglTitle')}</h2>
            <p className="text-xs text-muted-foreground max-w-xs leading-relaxed">{t('studio.webglBody')}</p>
          </div>
        ) : webglOk === true ? (
          <Canvas
            key={canvasKey}
            dpr={[1, preset.dprCap]}
            shadows={preset.shadows}
            gl={{ antialias: true, alpha: true }}
            camera={{ position: [0.72, 0.16, 4.8], fov: 40 }}
            onCreated={({ gl }) => {
              glRef.current = gl as unknown as WebGLRendererLike;
              const lost = (e: Event) => {
                e.preventDefault();
                setCtxLost(true);
              };
              const restored = () => setCtxLost(false);
              ctxHandlers.current = { lost, restored };
              gl.domElement.addEventListener('webglcontextlost', lost);
              gl.domElement.addEventListener('webglcontextrestored', restored);
            }}
            aria-label={t('studio.title')}
            role="application"
          >
            <StudioLighting quality={quality} />
            <CameraRig week={week} />
            <Suspense fallback={null}>
              {week < 4 ? (
                <ConceptionModel
                  week={week}
                  showCells
                  showShell
                  showUterus
                  showLabels={false}
                  autoRotate={!reduceMotion}
                  quality={quality}
                  labelsLang={locale === 'fa' ? 'fa' : 'en'}
                />
              ) : (
                <FetusModel
                  week={week}
                  showFetus
                  showPlacenta
                  showUterus
                  showLabels={false}
                  autoRotate={!reduceMotion}
                  quality={quality}
                  labelsLang={locale === 'fa' ? 'fa' : 'en'}
                />
              )}
            </Suspense>
            <AmnioticParticles count={preset.particles} size={preset.particleSize} reduceMotion={reduceMotion} />
            <AdaptiveQuality quality={quality} onDegrade={handleDegrade} />
            {process.env.NODE_ENV === 'development' && <DevPerfWatch />}
          </Canvas>
        ) : (
          <div className="absolute inset-0 grid place-items-center" aria-hidden>
            <div className="h-9 w-9 rounded-full border-2 border-primary/25 border-t-primary animate-spin" />
          </div>
        )}

        {ctxLost && (
          <div
            className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-card/85 p-6 text-center backdrop-blur-sm"
            role="alert"
          >
            <MonitorPlay className="h-8 w-8 text-primary" aria-hidden />
            <p className="text-sm font-medium">{t('studio.contextLost')}</p>
            <Button
              size="sm"
              className="min-h-10"
              onClick={() => {
                setCtxLost(false);
                setCanvasKey((k) => k + 1);
              }}
            >
              <RefreshCw className="h-4 w-4 me-1.5" />
              {t('studio.contextRetry')}
            </Button>
          </div>
        )}

        {/* Photographic vignette */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{ background: 'radial-gradient(ellipse 75% 70% at 50% 42%, transparent 55%, rgba(94,44,52,0.16) 100%)' }}
        />

        {/* Viewport chrome — honesty labels only, no interaction chrome */}
        <div className="absolute top-3 start-3 flex flex-col gap-1.5">
          <Badge className="w-fit bg-warning/15 text-warning-foreground border-warning/30 text-[10px]">
            {t('studio.demoAsset')}
          </Badge>
          {week < 4 && (
            <Badge variant="outline" className="w-fit max-w-[210px] whitespace-normal text-start text-[10px] leading-snug">
              <Microscope className="me-1 h-3 w-3 shrink-0" aria-hidden />
              {t('studio.microScope')}
            </Badge>
          )}
          {stage?.reviewStatus && (
            <Badge variant="outline" className="w-fit text-[10px]">{t(`status.${stage.reviewStatus}`)}</Badge>
          )}
          {autoAdjusted && <Badge variant="secondary" className="w-fit text-[10px]">{t('studio.qualityAuto')}</Badge>}
        </div>
        {reduceMotion && (
          <div className="absolute bottom-3 start-3">
            <Badge variant="secondary" className="text-[10px]">{t('studio.reducedMotion')}</Badge>
          </div>
        )}
      </div>

      {/* Week navigation + narration — content selection, not model controls */}
      <aside className="flex flex-col gap-3 overflow-y-auto" aria-label={t('studio.stage')}>
        <div className="niva-card rounded-2xl border p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Box className="h-4 w-4 text-primary" />
            <h2 className="font-semibold text-sm">{t('studio.stage')}</h2>
            <span className="ms-auto text-2xl font-extrabold text-primary num">{week}</span>
          </div>
          <Slider
            value={[week]}
            onValueChange={(v) => setWeek(v[0])}
            min={1}
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
          {/* Size comparison chip (Wave 3.5) — honest approximations from studio-content. */}
          <Badge variant="outline" className="h-auto w-fit max-w-full whitespace-normal text-start text-[10px] leading-snug">
            <Sparkles className="me-1 h-3 w-3 shrink-0" aria-hidden />
            {t('studio.sizeAtWeek')} · {locale === 'fa' ? content.sizeComparisonFa : content.sizeComparisonEn}
          </Badge>
          {process.env.NODE_ENV === 'development' && (
            <p className="text-[10px] text-muted-foreground font-mono num">
              [dev] <span id="niva-dev-perf">—</span>
            </p>
          )}
        </div>

        {/* Narrated education (Wave 3.5) — text alternative + read-aloud + sources.
            Keyed by week: remount resets speech + speaking state per stage. */}
        <NarrationCard key={week} content={content} locale={locale} t={t} />
      </aside>
    </div>
  );

  return body;
}

/** Structural subset of THREE.WebGLRenderer used here (keeps three out of the import graph). */
interface WebGLRendererLike {
  domElement: HTMLCanvasElement;
  dispose(): void;
}

/**
 * Per-week cinematic framing (non-interactive by design): with the manual
 * zoom removed, the rig owns the camera and eases it to a distance that fits
 * the stage envelope — a close-up for the cellular weeks, a wider shot that
 * keeps the whole term baby + uterine membrane in frame by week 40. The
 * camera keeps its slight 3/4 yaw so the face/profile reads naturally.
 */
function CameraRig({ week }: { week: number }) {
  const target = useMemo(() => {
    if (week < 4) return 3.1; // conception scenes span ~2.3 units (mound/glow)
    const { scale, uterus } = paramsForWeek(week);
    // Fit the vertical membrane radius (uterus × 1.08 × 0.95) at fov 40° + margin.
    const fit = (uterus * 1.08 * 0.95) / Math.tan((40 / 2) * (Math.PI / 180)) + 0.9;
    // Early fetal weeks: pull in for detail, easing out as the body grows.
    const early = 3.1 + 2.4 * Math.pow(scale, 0.65);
    return Math.max(early, Math.min(fit, 6.4));
  }, [week]);
  const goal = useRef(target);
  useEffect(() => {
    goal.current = target;
  }, [target]);
  useFrame(({ camera }, delta) => {
    const d = camera.position.length();
    if (d <= 0.0001) return;
    // Exponential damp toward the framing distance (frame-rate independent).
    const nd = d + (goal.current - d) * (1 - Math.exp(-3.2 * Math.min(delta, 0.1)));
    camera.position.multiplyScalar(nd / d);
    camera.lookAt(0, 0.1, 0);
  });
  return null;
}

/**
 * Adaptive degrade (Wave 3.4): samples FPS over a 3s window; below 24 fps it
 * downgrades one tier exactly once per tier visit. Silent — the visible badge
 * lives in the viewport chrome (studio.qualityAuto).
 */
function AdaptiveQuality({ quality, onDegrade }: { quality: string; onDegrade: () => void }) {
  const acc = useRef({ frames: 0, time: 0, armed: true });
  useFrame((_, delta) => {
    const a = acc.current;
    a.frames += 1;
    a.time += delta;
    if (a.time >= 3) {
      if (a.armed && quality !== 'low' && a.frames / a.time < 24) {
        a.armed = false;
        onDegrade();
      }
      a.frames = 0;
      a.time = 0;
    }
  });
  return null;
}

/**
 * Dev-only memory readout (Wave 3.4): streams renderer.info into the panel
 * every second so the geometry/texture budget can be asserted over long
 * week-change sessions. Compiled out of production builds.
 */
function DevPerfWatch() {
  const gl = useThree((s) => s.gl);
  const acc = useRef(0);
  useFrame((_, delta) => {
    acc.current += delta;
    if (acc.current < 1) return;
    acc.current = 0;
    const el = document.getElementById('niva-dev-perf');
    if (el) {
      el.textContent = `${gl.info.render.triangles} tris · ${gl.info.memory.geometries} geo · ${gl.info.memory.textures} tex`;
    }
  });
  return null;
}

/**
 * Narrated education card (Wave 3.5): stage narration with an optional
 * read-aloud toggle (speechSynthesis, honest no-op when unsupported) plus the
 * stage's evidence sources. Remounted per week via key={week} — the unmount
 * cleanup cancels any in-flight utterance without setState-in-effect.
 */
function NarrationCard({
  content,
  locale,
  t,
}: {
  content: ReturnType<typeof stageContentForWeek>;
  locale: string;
  t: (key: string) => string;
}) {
  const [speaking, setSpeaking] = useState(false);
  const toggleSpeech = useCallback(() => {
    try {
      const synth = window.speechSynthesis;
      if (!synth) return;
      if (synth.speaking) {
        synth.cancel();
        setSpeaking(false);
        return;
      }
      const fa = locale === 'fa';
      const u = new SpeechSynthesisUtterance(fa ? content.narrationFa : content.narrationEn);
      u.lang = fa ? 'fa-IR' : 'en-US';
      u.rate = 0.95;
      u.onend = () => setSpeaking(false);
      u.onerror = () => setSpeaking(false);
      synth.speak(u);
      setSpeaking(true);
    } catch {
      setSpeaking(false);
    }
  }, [content, locale]);

  useEffect(
    () => () => {
      try {
        window.speechSynthesis?.cancel();
      } catch {
        /* speech unsupported — nothing to cancel */
      }
    },
    []
  );

  return (
    <div className="niva-card rounded-2xl border p-4 space-y-2">
      <div className="flex items-center gap-2">
        <BookOpenText className="h-4 w-4 text-primary" aria-hidden />
        <h3 className="font-semibold text-sm">{locale === 'fa' ? content.titleFa : content.titleEn}</h3>
        <button
          onClick={toggleSpeech}
          aria-label={speaking ? t('studio.stopReading') : t('studio.readAloud')}
          className="ms-auto flex items-center gap-1 rounded-full border px-2.5 py-1.5 text-[10px] min-h-9 text-muted-foreground transition-colors hover:bg-muted"
        >
          {speaking ? <Square className="h-3 w-3" aria-hidden /> : <Volume2 className="h-3 w-3" aria-hidden />}
          {speaking ? t('studio.stopReading') : t('studio.readAloud')}
        </button>
      </div>
      <p className="text-xs leading-relaxed text-muted-foreground" role="note">
        {locale === 'fa' ? content.narrationFa : content.narrationEn}
      </p>
      <div className="space-y-0.5">
        <p className="text-[10px] font-medium text-muted-foreground">{t('studio.sources')}</p>
        {content.sources.map((s) => (
          <p key={s} className="text-[10px] leading-snug text-muted-foreground">
            — {s}
          </p>
        ))}
      </div>
      <p className="text-[10px] text-muted-foreground">{t('studio.sub')}</p>
    </div>
  );
}
