'use client';

/**
 * PhotoStage — the photoreal week view of the studio.
 *
 * Renders the AI-rendered week-by-week womb series (public/fetus/week-XX.webp)
 * as a full-bleed, cinematic still: crossfaded week transitions, an idle
 * Ken-Burns drift that keeps the image alive, drag-to-pan + button-driven
 * zoom, neighbor preloading for scrub-smoothness, and an honest educational-
 * reconstruction fallback when a render is missing.
 */

import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useApp } from '@/store/app';
import { stageContentForWeek } from '@/data/studio-content';
import { ImageIcon } from 'lucide-react';

export const fetusImageUrl = (w: number) => `/fetus/week-${String(w).padStart(2, '0')}.webp`;

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

export function PhotoStage({
  week,
  zoom,
  reduceMotion,
}: {
  week: number;
  zoom: number;
  reduceMotion: boolean;
}) {
  const { t, locale } = useApp();
  const content = stageContentForWeek(week);
  const title = locale === 'fa' ? content.titleFa : content.titleEn;
  // Pan carries the week it was anchored to, so switching weeks implicitly
  // resets it — no reset effect, no cascading render.
  const [pan, setPan] = useState({ x: 0, y: 0, w: week });
  const [dragging, setDragging] = useState(false);
  const [failed, setFailed] = useState<Record<number, boolean>>({});
  const drag = useRef<{ px: number; py: number; x: number; y: number } | null>(null);

  // Preload neighbors so slider scrubbing feels instant.
  useEffect(() => {
    [week - 1, week + 1]
      .filter((w) => w >= 1 && w <= 40)
      .forEach((w) => {
        const img = new window.Image();
        img.src = fetusImageUrl(w);
      });
  }, [week]);

  const zoomed = zoom > 1.01;
  const effPan = zoomed && pan.w === week ? pan : { x: 0, y: 0 };
  const onPointerDown = (e: React.PointerEvent) => {
    if (!zoomed) return;
    (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
    drag.current = { px: e.clientX, py: e.clientY, x: effPan.x, y: effPan.y };
    setDragging(true);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const lim = 320 * (zoom - 1);
    setPan({
      x: clamp(d.x + (e.clientX - d.px), -lim, lim),
      y: clamp(d.y + (e.clientY - d.py), -lim, lim),
      w: week,
    });
  };
  const endDrag = () => {
    drag.current = null;
    setDragging(false);
  };

  return (
    <div
      className={`absolute inset-0 overflow-hidden ${zoomed ? 'cursor-grab active:cursor-grabbing touch-none' : ''}`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerLeave={endDrag}
    >
      {/* Deep-womb ambient backdrop (visible while images load / behind letterbox) */}
      <div
        aria-hidden
        className="absolute inset-0"
        style={{ background: 'radial-gradient(120% 100% at 50% 38%, #40141f 0%, #26090f 55%, #130407 100%)' }}
      />

      {/* Zoom/pan stage */}
      <div
        className="absolute inset-0 will-change-transform"
        style={{
          transform: `translate(${effPan.x}px, ${effPan.y}px) scale(${zoom})`,
          transition: dragging ? 'none' : 'transform 240ms ease-out',
        }}
      >
        <AnimatePresence initial={false}>
          <motion.div
            key={week}
            className="absolute inset-0"
            initial={{ opacity: 0, scale: 1.04 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.99 }}
            transition={{ duration: reduceMotion ? 0 : 0.55, ease: 'easeOut' }}
          >
            {failed[week] ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-8 text-center">
                <ImageIcon className="h-8 w-8 text-primary/60" aria-hidden />
                <p className="num text-3xl font-extrabold text-primary/70">{week}</p>
                <p className="max-w-[26ch] text-xs leading-relaxed text-muted-foreground">
                  {t('studio.photoMissing')}
                </p>
              </div>
            ) : (
              <motion.img
                src={fetusImageUrl(week)}
                alt={`${title} — ${t('studio.stage')} ${week}`}
                draggable={false}
                className="absolute inset-0 h-full w-full select-none object-cover"
                animate={reduceMotion ? undefined : { scale: [1, 1.045] }}
                transition={
                  reduceMotion
                    ? undefined
                    : { duration: 18, repeat: Infinity, repeatType: 'mirror', ease: 'easeInOut' }
                }
                onError={() => setFailed((f) => ({ ...f, [week]: true }))}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Photographic vignette (matches the 3D viewport framing) */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{ background: 'radial-gradient(ellipse 78% 72% at 50% 42%, transparent 58%, rgba(16,3,6,0.42) 100%)' }}
      />
    </div>
  );
}
