'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import { useApp } from '@/store/app';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import {
  FETAL_STAGE_IMAGES, STUDIO_STAGE_WEEKS, stageImageForWeek, type FetalStageImage,
} from '@/data/fetal-stage-media';
import { stageContentForWeek } from '@/data/studio-content';
import {
  BookOpenText, Volume2, Square, ChevronLeft, ChevronRight, Sparkles, Microscope, Images, Orbit, Clapperboard,
} from 'lucide-react';

interface LayerState {
  id: number;
  image: FetalStageImage;
  shown: boolean;
  loaded: boolean;
}

/** Weeks that carry a real keyframe image (13 stages, weeks 3 → 40). */
const KEYFRAME_WEEKS = FETAL_STAGE_IMAGES.map((i) => i.week);

type StudioMode = 'cine' | 'gallery3d';

/**
 * Studio view — the natural fetal-growth cinematic + a 3D orbit gallery of
 * the same photoreal stage images.
 *
 * Two views over ONE 13-keyframe sequence (fixed style: same camera, light
 * and uterine palette):
 * - «واقع‌گرایانه» (cine): the crossfading cinematic with a slow Ken Burns
 *   drift, as the visitor walks the 40 gestational weeks.
 * - «سه‌بعدی تعاملی» (3D): the same images arranged on a CSS-3D orbit ring —
 *   drag to spin, tap a stage to bring it to the front, arrow keys step
 *   stages. No WebGL: pure GPU transforms, so it stays smooth on low-end
 *   phones and respects reduced motion (instant snaps, no drift).
 *
 * Navigation everywhere targets the keyframe images themselves (filmstrip,
 * prev/next, ring) while the week slider and stage chips keep fine control.
 * Every stage keeps its honest educational framing (illustrative
 * reconstruction, not an ultrasound).
 */
export function StudioView({ fullscreen = false }: { fullscreen?: boolean }) {
  const { t, locale } = useApp();
  const [week, setWeek] = useState(12);
  const [mode, setMode] = useState<StudioMode>('cine');
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

  /** Prev/next walk the 13 keyframe images — every step reveals a new stage. */
  const step = useCallback((dir: 1 | -1) => {
    setWeek((w) => {
      const idx = KEYFRAME_WEEKS.indexOf(stageImageForWeek(w).week);
      return KEYFRAME_WEEKS[Math.min(KEYFRAME_WEEKS.length - 1, Math.max(0, idx + dir))];
    });
  }, []);

  const body = (
    <div className={`grid ${fullscreen ? 'h-[calc(100vh-3.5rem)]' : 'h-[70vh] min-h-[480px]'} overflow-y-auto lg:overflow-hidden lg:grid-cols-[1fr_320px] gap-3 p-3`}>
      {/* Stage viewport + filmstrip — same imagery, two presentations.
          min-w-0: the filmstrip's 13 unwrappable thumbs inflate this grid
          item's min-content — without it the mobile track overflows. */}
      <div className="flex min-h-0 min-w-0 flex-col gap-2">
        <div className="relative rounded-2xl border niva-grad overflow-hidden bg-[#2a1216] h-[54vh] min-h-[240px] shrink-0 lg:h-auto lg:min-h-0 lg:flex-1">
          {mode === 'gallery3d' ? (
            <Ring3D selectedWeek={week} onSelect={setWeek} reduceMotion={reduceMotion} />
          ) : (
            <CrossfadeStage image={image} alt={locale === 'fa' ? image.altFa : image.altEn} animate={!reduceMotion} />
          )}
          {/* Photographic vignette */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{ background: 'radial-gradient(ellipse 80% 72% at 50% 42%, transparent 55%, rgba(30,8,12,0.42) 100%)' }}
          />

          {/* View chrome — view toggle (top-end) + honesty labels (top-start) */}
          <div className="absolute top-3 end-3 z-10 flex items-center rounded-full border border-white/25 bg-black/35 p-0.5 backdrop-blur-sm">
            {([
              ['cine', Clapperboard, t('studio.viewPhoto')],
              ['gallery3d', Orbit, t('studio.view3d')],
            ] as const).map(([m, Icon, label]) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                aria-pressed={mode === m}
                className={`flex min-h-8 items-center gap-1 rounded-full px-2.5 text-[10px] font-medium transition-colors ${mode === m ? 'bg-white text-[#2a1216]' : 'text-white/85 hover:text-white'}`}
              >
                <Icon className="h-3 w-3" aria-hidden />
                {label}
              </button>
            ))}
          </div>

          <div className="absolute top-3 start-3 z-10 flex flex-col gap-1.5">
            <Badge className="w-fit bg-warning/15 text-warning-foreground border-warning/30 text-[10px]">
              {t('studio.demoAsset')}
            </Badge>
            <Badge variant="outline" className="w-fit max-w-[45vw] whitespace-normal text-start text-[10px] leading-snug bg-black/25 border-white/20 text-white/90 backdrop-blur-sm">
              {t('studio.photoDisclaimer')}
            </Badge>
            {week < 4 && (
              <Badge variant="outline" className="w-fit max-w-[45vw] whitespace-normal text-start text-[10px] leading-snug bg-black/25 border-white/20 text-white/90 backdrop-blur-sm">
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

        {/* Navigable filmstrip — the 13 stage photos, one tap each */}
        <Filmstrip activeWeek={image.week} onSelect={setWeek} reduceMotion={reduceMotion} />
      </div>

      {/* Week navigation + narration — content selection, not view controls */}
      <aside className="flex min-w-0 flex-col gap-3 overflow-y-auto" aria-label={t('studio.stage')}>
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
          {mode === 'gallery3d' && (
            <p className="flex items-start gap-1.5 text-[10px] leading-snug text-muted-foreground">
              <Orbit className="mt-0.5 h-3 w-3 shrink-0 text-primary" aria-hidden />
              {t('studio.gallery3dHint')}
            </p>
          )}
          <div className="flex items-center gap-2">
            <button
              onClick={() => step(-1)}
              disabled={image.week <= KEYFRAME_WEEKS[0]}
              aria-label={t('studio.prevStage')}
              className="flex h-9 flex-1 items-center justify-center gap-1 rounded-lg border bg-muted/60 text-xs transition-colors hover:bg-primary/10 disabled:opacity-40 min-h-9"
            >
              <ChevronLeft className="h-3.5 w-3.5 rtl:-scale-x-100" aria-hidden />
              {t('studio.prevStage')}
            </button>
            <button
              onClick={() => step(1)}
              disabled={image.week >= KEYFRAME_WEEKS[KEYFRAME_WEEKS.length - 1]}
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
 * Navigable filmstrip: one thumbnail per keyframe image. The active stage
 * auto-scrolls into view; every thumbnail is a direct tap target, so the
 * whole 3→40 week story is two taps away at all times.
 */
function Filmstrip({
  activeWeek, onSelect, reduceMotion,
}: {
  activeWeek: number;
  onSelect: (week: number) => void;
  reduceMotion: boolean;
}) {
  const { t, locale } = useApp();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current?.querySelector<HTMLButtonElement>('[data-active="true"]');
    el?.scrollIntoView({ block: 'nearest', inline: 'center', behavior: reduceMotion ? 'auto' : 'smooth' });
  }, [activeWeek, reduceMotion]);

  return (
    <div
      ref={ref}
      role="group"
      aria-label={t('studio.filmstrip')}
      className="flex w-full min-w-0 shrink-0 gap-2 overflow-x-auto pb-1 [scrollbar-width:thin]"
    >
      {FETAL_STAGE_IMAGES.map((img) => {
        const active = img.week === activeWeek;
        return (
          <button
            key={img.week}
            type="button"
            data-active={active || undefined}
            onClick={() => onSelect(img.week)}
            aria-pressed={active}
            aria-label={`${t('studio.stage')} ${img.week} — ${locale === 'fa' ? img.altFa : img.altEn}`}
            className={`relative h-14 w-11 shrink-0 snap-center overflow-hidden rounded-lg border transition-all ${active ? 'border-primary ring-2 ring-primary/40' : 'border-white/15 opacity-65 hover:opacity-100'}`}
          >
            <Image src={img.src} alt="" fill sizes="44px" className="object-cover" draggable={false} />
            <span className="absolute inset-x-0 bottom-0 bg-black/55 py-0.5 text-center text-[9px] font-semibold text-white/90 num">
              {img.week}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/**
 * CSS-3D orbit gallery: the 13 stage photos on a rotating ring. Drag (mouse
 * or touch) spins the ring with momentum-free direct manipulation; on release
 * it snaps to the nearest stage and selects it. Tapping any card brings that
 * stage to the front; ←/→ steps stages for keyboard users. Pure GPU
 * transforms — no WebGL context, nothing to lose, nothing to dispose.
 */
function Ring3D({
  selectedWeek, onSelect, reduceMotion,
}: {
  selectedWeek: number;
  onSelect: (week: number) => void;
  reduceMotion: boolean;
}) {
  const { t, locale } = useApp();
  const n = FETAL_STAGE_IMAGES.length;
  const stepDeg = 360 / n;

  const selectedIdx = useMemo(() => {
    const i = FETAL_STAGE_IMAGES.findIndex((x) => x.week === stageImageForWeek(selectedWeek).week);
    return i === -1 ? 0 : i;
  }, [selectedWeek]);
  const target = -selectedIdx * stepDeg;

  // Rotation is fully derived: at rest it IS the selection's target angle;
  // while dragging it is the grab base plus the pointer offset. No effect
  // syncing, no cascading renders — selection changes re-derive the angle.
  const [drag, setDrag] = useState<{ x: number; base: number; offset: number } | null>(null);
  const rotation = drag ? drag.base + drag.offset : target;
  const dragging = drag !== null;
  // The card under the pointer at grab time. Pointer capture retargets the
  // release click to the container, so taps are resolved here in endDrag
  // instead of relying on the card's own click event.
  const grabCard = useRef<number | null>(null);

  const selectIndex = useCallback((i: number) => {
    onSelect(FETAL_STAGE_IMAGES[((i % n) + n) % n].week);
  }, [n, onSelect]);

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const card = (e.target as HTMLElement).closest('button[data-week]');
    grabCard.current = card ? Number(card.getAttribute('data-week')) : null;
    setDrag({ x: e.clientX, base: rotation, offset: 0 });
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    setDrag((d) => {
      if (!d) return d; // hover move — not grabbing
      const dx = e.clientX - d.x;
      return { ...d, offset: dx * 0.3 };
    });
  };
  const endDrag = () => {
    if (!drag) return;
    const moved = Math.abs(drag.offset) * 10 > 12; // >4px pointer travel
    setDrag(null);
    const tapped = grabCard.current;
    grabCard.current = null;
    if (!moved) {
      if (tapped) onSelect(tapped); // keyboard-independent tap-to-front
      return;
    }
    const idx = ((Math.round(-rotation / stepDeg) % n) + n) % n;
    selectIndex(idx);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      selectIndex(selectedIdx - 1);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      selectIndex(selectedIdx + 1);
    }
  };

  const ringVars = {
    '--card-w': 'clamp(108px, 21vw, 200px)',
    '--ring-r': 'calc(var(--card-w) * 2.45)',
  } as React.CSSProperties;

  return (
    <div
      className="absolute inset-0 cursor-grab touch-pan-y select-none outline-none active:cursor-grabbing [perspective:1300px]"
      style={ringVars}
      role="group"
      aria-label={t('studio.view3d')}
      tabIndex={0}
      onKeyDown={onKeyDown}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
    >
      {/* Soft stage glow behind the ring */}
      <div
        aria-hidden
        className="absolute inset-0"
        style={{ background: 'radial-gradient(ellipse 62% 50% at 50% 46%, rgba(255,214,224,0.10), transparent 70%)' }}
      />
      <div
        className="absolute left-1/2 top-1/2 [transform-style:preserve-3d]"
        style={{
          transform: `translateZ(calc(var(--ring-r) * -1)) rotateY(${rotation}deg)`,
          transition: dragging || reduceMotion ? 'none' : 'transform 700ms cubic-bezier(0.22, 1, 0.36, 1)',
        }}
      >
        {FETAL_STAGE_IMAGES.map((img, i) => {
          const angle = i * stepDeg;
          const net = (((angle + rotation) % 360) + 360) % 360;
          const facing = Math.max(0, Math.cos((net * Math.PI) / 180));
          const isActive = i === selectedIdx;
          return (
            <button
              key={img.week}
              type="button"
              data-week={img.week}
              onClick={() => onSelect(img.week)} // keyboard Enter/Space path
              aria-current={isActive || undefined}
              aria-label={`${t('studio.stage')} ${img.week} — ${locale === 'fa' ? img.altFa : img.altEn}`}
              className="absolute left-0 top-0 overflow-hidden rounded-2xl border shadow-2xl outline-none focus-visible:ring-2 focus-visible:ring-white/70"
              style={{
                width: 'var(--card-w)',
                aspectRatio: '3 / 4',
                transform: 'translate(-50%, -50%) rotateY(' + angle + 'deg) translateZ(var(--ring-r))',
                backfaceVisibility: 'hidden',
                borderColor: isActive ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.25)',
                filter: `brightness(${(0.42 + 0.58 * facing).toFixed(3)})`,
                opacity: 0.35 + 0.65 * facing,
                zIndex: Math.round(facing * 40) + (isActive ? 1 : 0),
              }}
            >
              <Image src={img.src} alt="" fill sizes="220px" className="object-cover" draggable={false} />
              <span className="absolute bottom-1.5 left-1/2 -translate-x-1/2 rounded-full bg-black/50 px-2 py-0.5 text-[10px] font-semibold text-white/95 num">
                {img.week}
              </span>
              {isActive && <span aria-hidden className="pointer-events-none absolute inset-0 rounded-2xl ring-2 ring-inset ring-white/80" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Crossfading image stack (cinematic view). Each newly selected stage mounts
 * on top at opacity-0 and fades in over ~800ms; the stack collapses back to a
 * single layer once the transition settles, so DOM/GPU cost stays flat no
 * matter how quickly the visitor scrubs the slider. A slow Ken Burns drift
 * runs on the settled layer unless the visitor prefers reduced motion.
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
