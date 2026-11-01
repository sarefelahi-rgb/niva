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
 * Studio view — a 3D orbit gallery of the photoreal stage images, plus the
 * natural-growth cinematic as the alternate lens.
 *
 * Two views over ONE 13-keyframe sequence (fixed style: same camera, light
 * and uterine palette):
 * - «سه‌بعدی تعاملی» (3D, DEFAULT): the same images arranged on a tilted CSS-3D
 *   turntable — drag horizontally to spin (with flick momentum), drag
 *   vertically to tilt the viewing angle, tap a stage to bring it to the
 *   front, arrow keys step stages. Depth is sold by per-card scaling,
 *   brightness falloff and a floor shadow. No WebGL: pure GPU transforms, so
 *   it stays smooth on low-end phones and respects reduced motion (instant
 *   snaps, no drift).
 * - «واقع‌گرایانه» (cine): the crossfading cinematic with a slow Ken Burns
 *   drift, as the visitor walks the 40 gestational weeks.
 *
 * Navigation everywhere targets the keyframe images themselves (filmstrip,
 * prev/next, ring) while the week slider and stage chips keep fine control.
 * Every stage keeps its honest educational framing (illustrative
 * reconstruction, not an ultrasound).
 */
export function StudioView({ fullscreen = false }: { fullscreen?: boolean }) {
  const { t, locale } = useApp();
  const [week, setWeek] = useState(12);
  // The studio IS 3D first (user mandate) — the cinematic is the alternate lens.
  const [mode, setMode] = useState<StudioMode>('gallery3d');
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
    // Standard rhythm: p-4 gaps everywhere (user mandate — no cramped or
    // colliding boxes), min-w-0 keeps the filmstrip from inflating the grid.
    <div className={`grid ${fullscreen ? 'h-[calc(100vh-3.5rem)]' : 'h-[70vh] min-h-[480px]'} overflow-y-auto lg:overflow-hidden lg:grid-cols-[1fr_320px] gap-4 p-4`}>
      {/* Stage viewport + filmstrip — same imagery, two presentations.
          min-w-0: the filmstrip's 13 unwrappable thumbs inflate this grid
          item's min-content — without it the mobile track overflows. */}
      <div className="flex min-h-0 min-w-0 flex-col gap-3">
        <div className="relative rounded-2xl border niva-grad overflow-hidden bg-[#2a1216] h-[54vh] min-h-[260px] shrink-0 lg:h-auto lg:min-h-0 lg:flex-1">
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

          {/* View chrome — ONE flex row (badges column + toggle), so the two
              can never collide on narrow screens; badges ignore pointers so
              ring-dragging still works underneath. */}
          <div className="absolute top-3 inset-x-3 z-10 flex items-start justify-between gap-2">
            <div className="pointer-events-none flex min-w-0 flex-col items-start gap-1.5">
              {/* The stage backdrop is always dark (both themes) — this badge
                  pins its own light amber; text-warning-foreground would flip
                  dark in the light theme and vanish against the stage. */}
              <Badge className="w-fit shrink-0 bg-warning/20 text-amber-100 border-warning/40 text-[10px]">
                {t('studio.demoAsset')}
              </Badge>
              <Badge variant="outline" className="w-fit max-w-full whitespace-normal text-start text-[10px] leading-snug bg-black/25 border-white/20 text-white/90 backdrop-blur-sm">
                {t('studio.photoDisclaimer')}
              </Badge>
              {week < 4 && (
                <Badge variant="outline" className="w-fit max-w-full whitespace-normal text-start text-[10px] leading-snug bg-black/25 border-white/20 text-white/90 backdrop-blur-sm">
                  <Microscope className="me-1 h-3 w-3 shrink-0" aria-hidden />
                  {t('studio.microScope')}
                </Badge>
              )}
            </div>
            <div className="flex shrink-0 items-center rounded-full border border-white/25 bg-black/35 p-0.5 backdrop-blur-sm">
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
      <aside className="flex min-w-0 flex-col gap-4 overflow-y-auto" aria-label={t('studio.stage')}>
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
 * CSS-3D turntable: the 13 stage photos on a tilted ring. Drag horizontally
 * spins the ring (with flick momentum on release); dragging vertically tilts
 * the viewing angle (a real change of camera elevation, clamped); on release
 * it snaps to the nearest stage and selects it. Tapping any card brings that
 * stage to the front; ←/→ steps stages for keyboard users. Depth is sold by
 * per-card scale + brightness falloff and a floor shadow. Pure GPU
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
  const TILT_BASE = -12; // camera slightly above the ring plane (deg)
  const TILT_MIN = -30;
  const TILT_MAX = 4;

  const selectedIdx = useMemo(() => {
    const i = FETAL_STAGE_IMAGES.findIndex((x) => x.week === stageImageForWeek(selectedWeek).week);
    return i === -1 ? 0 : i;
  }, [selectedWeek]);
  const target = -selectedIdx * stepDeg;

  // Rotation + tilt are fully derived: at rest they ARE the selection's
  // target angle (and the resting tilt); while dragging they are the grab
  // base plus the pointer offset. No effect syncing, no cascading renders —
  // selection changes re-derive the angle.
  const [drag, setDrag] = useState<{
    x: number; y: number; base: number; tiltBase: number; offset: number; tilt: number;
  } | null>(null);
  const rotation = drag ? drag.base + drag.offset : target;
  const tilt = drag ? drag.tilt : TILT_BASE;
  const dragging = drag !== null;
  // The card under the pointer at grab time. Pointer capture retargets the
  // release click to the container, so taps are resolved here in endDrag
  // instead of relying on the card's own click event.
  const grabCard = useRef<number | null>(null);
  // Flick velocity (EMA of px/ms, positive = rightward) for momentum release.
  const flick = useRef(0);
  const lastPos = useRef<{ x: number; t: number } | null>(null);

  const selectIndex = useCallback((i: number) => {
    onSelect(FETAL_STAGE_IMAGES[((i % n) + n) % n].week);
  }, [n, onSelect]);

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const card = (e.target as HTMLElement).closest('button[data-week]');
    grabCard.current = card ? Number(card.getAttribute('data-week')) : null;
    flick.current = 0;
    lastPos.current = { x: e.clientX, t: performance.now() };
    setDrag({ x: e.clientX, y: e.clientY, base: rotation, tiltBase: tilt, offset: 0, tilt });
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    setDrag((d) => {
      if (!d) return d; // hover move — not grabbing
      if (lastPos.current) {
        const dt = Math.max(1, performance.now() - lastPos.current.t);
        flick.current = 0.75 * flick.current + 0.25 * ((e.clientX - lastPos.current.x) / dt);
        lastPos.current = { x: e.clientX, t: performance.now() };
      }
      const dx = e.clientX - d.x;
      const dy = e.clientY - d.y;
      const nextTilt = Math.min(TILT_MAX, Math.max(TILT_MIN, d.tiltBase + dy * 0.09));
      return { ...d, offset: dx * 0.35, tilt: nextTilt };
    });
  };
  const endDrag = () => {
    if (!drag) return;
    const moved = Math.abs(drag.offset) * 10 > 12; // >4px pointer travel
    const v = flick.current; // px/ms at release
    setDrag(null);
    const tapped = grabCard.current;
    grabCard.current = null;
    if (!moved) {
      if (tapped) onSelect(tapped); // keyboard-independent tap-to-front
      return;
    }
    let idx = ((Math.round(-rotation / stepDeg) % n) + n) % n;
    // Momentum: a fast horizontal release carries one extra stage in the
    // flick direction (drag right → ring spins toward earlier stages).
    if (Math.abs(v) > 0.5) idx -= v > 0 ? 1 : -1;
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
    '--card-w': 'clamp(112px, 21vw, 200px)',
    '--ring-r': 'calc(var(--card-w) * 2.5)',
  } as React.CSSProperties;

  return (
    <div
      className="absolute inset-0 cursor-grab touch-pan-y select-none outline-none active:cursor-grabbing [perspective:1500px]"
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
      {/* Floor shadow — anchors the ring in space and sells the 3D depth */}
      <div
        aria-hidden
        className="absolute left-1/2 top-[74%] h-8 w-[min(58vw,420px)] -translate-x-1/2 rounded-[50%] bg-black/40 blur-xl"
      />
      <div
        className="absolute left-1/2 top-1/2 [transform-style:preserve-3d]"
        style={{
          // Tilt (rotateX) applied before the spin (rotateY) = a turntable
          // seen slightly from above; vertical drag changes the elevation.
          transform: `translateZ(calc(var(--ring-r) * -1)) rotateX(${tilt.toFixed(2)}deg) rotateY(${rotation.toFixed(2)}deg)`,
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
                transform:
                  'translate(-50%, -50%) rotateY(' + angle + 'deg) translateZ(var(--ring-r))' +
                  ` scale(${(0.8 + 0.2 * facing).toFixed(3)})`,
                backfaceVisibility: 'hidden',
                borderColor: isActive ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.25)',
                filter: `brightness(${(0.4 + 0.6 * facing).toFixed(3)})`,
                opacity: 0.3 + 0.7 * facing,
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
