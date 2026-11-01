'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { useApp } from '@/store/app';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { STUDIO_STAGE_WEEKS, stageImageForWeek, type FetalStageImage } from '@/data/fetal-stage-media';
import { stageContentForWeek } from '@/data/studio-content';
import { BookOpenText, Volume2, Square, ChevronLeft, ChevronRight, Sparkles, Microscope, Images } from 'lucide-react';

interface LayerState {
  id: number;
  image: FetalStageImage;
  shown: boolean;
  loaded: boolean;
}

/**
 * Studio view — the natural fetal-growth cinematic.
 *
 * One continuous, photorealistic growth sequence (13 curated medical renders
 * in a fixed style: same camera, light and uterine palette) crossfades as the
 * visitor walks the 40 gestational weeks, with a slow Ken Burns drift so the
 * frame always feels alive. The only controls are content selection — week
 * slider, stage chips, prev/next — plus the narrated education card. Reduced
 * motion freezes the drift; every stage keeps its honest educational framing
 * (illustrative reconstruction, not an ultrasound).
 */
export function StudioView({ fullscreen = false }: { fullscreen?: boolean }) {
  const { t, locale } = useApp();
  const [week, setWeek] = useState(12);
  const [reduceMotion, setReduceMotion] = useState(false);

  const content = stageContentForWeek(week);
  const image = stageImageForWeek(week);

  useEffect(() => {
    // Motion preference — deferred to avoid sync effects.
    const id = requestAnimationFrame(() => {
      setReduceMotion(window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    });
    return () => cancelAnimationFrame(id);
  }, []);

  const step = useCallback((dir: 1 | -1) => {
    setWeek((w) => {
      const idx = STUDIO_STAGE_WEEKS.indexOf(w);
      if (idx === -1) {
        // snap to the nearest stage chip in the requested direction
        const next = dir === 1
          ? STUDIO_STAGE_WEEKS.find((s) => s > w)
          : [...STUDIO_STAGE_WEEKS].reverse().find((s) => s < w);
        return next ?? w;
      }
      return STUDIO_STAGE_WEEKS[Math.min(STUDIO_STAGE_WEEKS.length - 1, Math.max(0, idx + dir))];
    });
  }, []);

  const body = (
    <div className={`grid ${fullscreen ? 'h-[calc(100vh-3.5rem)]' : 'h-[70vh] min-h-[480px]'} overflow-y-auto lg:overflow-hidden lg:grid-cols-[1fr_320px] gap-3 p-3`}>
      {/* Cinematic stage viewport — photoreal growth imagery, no WebGL needed */}
      <div className="relative rounded-2xl border niva-grad overflow-hidden bg-[#2a1216] h-[54vh] min-h-[240px] lg:h-auto lg:min-h-0">
        <CrossfadeStage image={image} alt={locale === 'fa' ? image.altFa : image.altEn} animate={!reduceMotion} />
        {/* Photographic vignette */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{ background: 'radial-gradient(ellipse 80% 72% at 50% 42%, transparent 55%, rgba(30,8,12,0.42) 100%)' }}
        />

        {/* Viewport chrome — honesty labels only */}
        <div className="absolute top-3 start-3 flex flex-col gap-1.5">
          <Badge className="w-fit bg-warning/15 text-warning-foreground border-warning/30 text-[10px]">
            {t('studio.demoAsset')}
          </Badge>
          <Badge variant="outline" className="w-fit max-w-[240px] whitespace-normal text-start text-[10px] leading-snug bg-black/25 border-white/20 text-white/90 backdrop-blur-sm">
            {t('studio.photoDisclaimer')}
          </Badge>
          {week < 4 && (
            <Badge variant="outline" className="w-fit max-w-[240px] whitespace-normal text-start text-[10px] leading-snug bg-black/25 border-white/20 text-white/90 backdrop-blur-sm">
              <Microscope className="me-1 h-3 w-3 shrink-0" aria-hidden />
              {t('studio.microScope')}
            </Badge>
          )}
        </div>

        {/* Stage caption — week + stage title, over a soft scrim */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/55 via-black/20 to-transparent px-4 pb-3.5 pt-10">
          <div className="flex items-end justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-wider text-white/65 num">
                {t('studio.stage')} · {week}
              </p>
              <p className="truncate text-sm font-semibold text-white/95">
                {locale === 'fa' ? content.titleFa : content.titleEn}
              </p>
            </div>
            <p className="shrink-0 num text-3xl font-extrabold text-white/85" aria-hidden>
              {week}
            </p>
          </div>
        </div>

        {reduceMotion && (
          <div className="absolute bottom-3 end-3">
            <Badge variant="secondary" className="text-[10px]">{t('studio.reducedMotion')}</Badge>
          </div>
        )}
      </div>

      {/* Week navigation + narration — content selection, not view controls */}
      <aside className="flex flex-col gap-3 overflow-y-auto" aria-label={t('studio.stage')}>
        <div className="niva-card rounded-2xl border p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Images className="h-4 w-4 text-primary" />
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
            {STUDIO_STAGE_WEEKS.map((w) => (
              <button
                key={w}
                onClick={() => setWeek(w)}
                aria-pressed={week === w}
                aria-label={t('studio.stage') + ' ' + w}
                className={`h-8 rounded-md text-[10px] num transition-colors min-h-8 ${week === w ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-primary/15'}`}
              >
                {w}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => step(-1)}
              disabled={week <= STUDIO_STAGE_WEEKS[0]}
              aria-label={t('studio.prevStage')}
              className="flex h-9 flex-1 items-center justify-center gap-1 rounded-lg border bg-muted/60 text-xs transition-colors hover:bg-primary/10 disabled:opacity-40 min-h-9"
            >
              <ChevronLeft className="h-3.5 w-3.5 rtl:-scale-x-100" aria-hidden />
              {t('studio.prevStage')}
            </button>
            <button
              onClick={() => step(1)}
              disabled={week >= STUDIO_STAGE_WEEKS[STUDIO_STAGE_WEEKS.length - 1]}
              aria-label={t('studio.nextStage')}
              className="flex h-9 flex-1 items-center justify-center gap-1 rounded-lg border bg-muted/60 text-xs transition-colors hover:bg-primary/10 disabled:opacity-40 min-h-9"
            >
              {t('studio.nextStage')}
              <ChevronRight className="h-3.5 w-3.5 rtl:-scale-x-100" aria-hidden />
            </button>
          </div>
          {/* Size comparison chip — honest approximations from studio-content. */}
          <Badge variant="outline" className="h-auto w-fit max-w-full whitespace-normal text-start text-[10px] leading-snug">
            <Sparkles className="me-1 h-3 w-3 shrink-0" aria-hidden />
            {t('studio.sizeAtWeek')} · {locale === 'fa' ? content.sizeComparisonFa : content.sizeComparisonEn}
          </Badge>
        </div>

        {/* Narrated education — text alternative + read-aloud + sources.
            Keyed by week: remount resets speech + speaking state per stage. */}
        <NarrationCard key={week} content={content} locale={locale} t={t} />
      </aside>
    </div>
  );

  return body;
}

/**
 * Crossfading image stack. Each newly selected stage mounts on top at
 * opacity-0 and fades in over ~800ms; the stack collapses back to a single
 * layer once the transition settles, so DOM/GPU cost stays flat no matter
 * how quickly the visitor scrubs the slider. A slow Ken Burns drift runs on
 * the settled layer unless the visitor prefers reduced motion.
 */
function CrossfadeStage({ image, alt, animate }: { image: FetalStageImage; alt: string; animate: boolean }) {
  const [layers, setLayers] = useState<LayerState[]>([{ id: 0, image, shown: true, loaded: false }]);
  const nextId = useRef(1);

  useEffect(() => {
    setLayers((ls) => {
      const top = ls[ls.length - 1];
      if (top && top.image.week === image.week && top.shown) return ls;
      // Keep only the last *visible* frame beneath the incoming one, so a
      // fast scrub never blanks the viewport while the next image loads.
      const visible = [...ls].reverse().find((l) => l.shown);
      const id = nextId.current++;
      return [...(visible ? [visible] : []), { id, image, shown: false, loaded: false }];
    });
  }, [image]);

  // Fade the top layer in on the frame after mount, then collapse the stack.
  useEffect(() => {
    const top = layers[layers.length - 1];
    if (!top || top.shown || !top.loaded) return;
    const raf = requestAnimationFrame(() =>
      setLayers((ls) => ls.map((l) => (l.id === top.id ? { ...l, shown: true } : l)))
    );
    const timer = setTimeout(() => {
      setLayers((ls) => {
        const cur = ls[ls.length - 1];
        return cur ? [{ ...cur, shown: true }] : ls;
      });
    }, 1000);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(timer);
    };
  }, [layers]);

  return (
    <div className="absolute inset-0" role="img" aria-label={alt}>
      {layers.map((l) => (
        <div
          key={l.id}
          className={`absolute inset-0 transition-opacity duration-700 ease-out ${l.shown ? 'opacity-100' : 'opacity-0'} ${animate && l.shown ? 'niva-kenburns' : ''}`}
        >
          <Image
            src={l.image.src}
            alt=""
            fill
            sizes="(max-width: 1024px) 100vw, 60vw"
            className="object-cover"
            priority={l.id === 0}
            draggable={false}
            onLoad={() => setLayers((ls) => ls.map((x) => (x.id === l.id ? { ...x, loaded: true } : x)))}
          />
        </div>
      ))}
    </div>
  );
}

/**
 * Narrated education card: stage narration with an optional read-aloud toggle
 * (speechSynthesis, honest no-op when unsupported) plus the stage's evidence
 * sources. Remounted per week via key={week} — the unmount cleanup cancels any
 * in-flight utterance without setState-in-effect.
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
