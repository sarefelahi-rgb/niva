'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useApp } from '@/store/app';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Loader2, Mic, MicOff, Video, VideoOff, PhoneOff, Info } from 'lucide-react';
import { formatDateTime } from '@/lib/format';

/**
 * Wave 11 — consultation room (sandbox scope).
 * Opens a private room for an ONLINE_VOICE / ONLINE_VIDEO booking: the
 * participant's own camera+microphone are previewed locally (device check,
 * mute/camera toggles) while the peer-to-peer leg with the other participant
 * is scheduled for the booked slot. Media streams are fully local in this
 * build — nothing is transmitted — and tracks are stopped on close (dispose).
 */

export interface ConsultRoomInfo {
  id: string;
  mode: string; // ONLINE_VOICE | ONLINE_VIDEO
  scheduledAt: string;
  counterpartName: string;
  viewer: 'patient' | 'doctor';
}

type RoomState = 'idle' | 'starting' | 'ready' | 'denied' | 'unsupported';

export function ConsultRoomDialog({ open, onOpenChange, info }: { open: boolean; onOpenChange: (v: boolean) => void; info: ConsultRoomInfo | null }) {
  const { t, locale } = useApp();
  const [state, setState] = useState<RoomState>('idle');
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const streamRef = useRef<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const stopTracks = useCallback(() => {
    streamRef.current?.getTracks().forEach((tr) => tr.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  // Hard dispose on unmount (no setState — component is going away).
  useEffect(() => () => stopTracks(), [stopTracks]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const start = async () => {
      setState('starting');
      setMicOn(true);
      setCamOn(true);
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          setState('unsupported');
          return;
        }
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: info?.mode !== 'ONLINE_VOICE',
        });
        if (cancelled) {
          stream.getTracks().forEach((tr) => tr.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => undefined);
        }
        setState('ready');
      } catch {
        if (!cancelled) setState('denied');
      }
    };
    void start();
    return () => {
      cancelled = true;
      // Track release happens in handleClose / unmount cleanup — never sync here.
    };
  }, [open, info?.mode]);

  /** Close path: release media tracks (event handler, not an effect). */
  const handleClose = (v: boolean) => {
    if (!v) {
      stopTracks();
      setState('idle');
      setMicOn(true);
      setCamOn(true);
    }
    onOpenChange(v);
  };

  const toggleMic = () => {
    const track = streamRef.current?.getAudioTracks()[0];
    if (track) {
      track.enabled = !track.enabled;
      setMicOn(track.enabled);
    }
  };

  const toggleCam = () => {
    const track = streamRef.current?.getVideoTracks()[0];
    if (track) {
      track.enabled = !track.enabled;
      setCamOn(track.enabled);
    }
  };

  if (!info) return null;
  const isVideo = info.mode !== 'ONLINE_VOICE';

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg" aria-label={t('room.title')}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            {t('room.title')}
            <span className="text-xs font-normal text-muted-foreground" dir="auto">
              · {info.counterpartName}
            </span>
          </DialogTitle>
          <DialogDescription dir="auto">
            {t(info.mode === 'ONLINE_VOICE' ? 'doc.onlineVoice' : 'doc.onlineVideo')} · {formatDateTime(info.scheduledAt, locale)}
          </DialogDescription>
        </DialogHeader>

        <div className="relative overflow-hidden rounded-xl border bg-black/90 aspect-video grid place-items-center">
          {isVideo && <video ref={videoRef} muted playsInline autoPlay className="h-full w-full object-cover" aria-label={t('room.title')} />}
          {!isVideo && (
            <div className="text-center text-white/80 px-6 space-y-2">
              <Mic className="mx-auto h-10 w-10" aria-hidden="true" />
              <p className="text-sm">{t('room.starting')}</p>
            </div>
          )}
          {state === 'starting' && (
            <div className="absolute inset-0 grid place-items-center bg-black/70 text-white/90">
              <Loader2 className="h-6 w-6 animate-spin" aria-hidden="true" />
            </div>
          )}
          {(state === 'denied' || state === 'unsupported') && (
            <div className="absolute inset-0 grid place-items-center bg-black/80 text-white/90 px-6 text-center">
              <p className="text-sm leading-relaxed">{t('room.denied')}</p>
            </div>
          )}
          {state === 'ready' && (
            <div className="absolute bottom-2 start-2 rounded-md bg-black/60 px-2 py-1 text-[10px] text-white/80">
              {micOn ? '🎙' : '🔇'}{camOn || !isVideo ? '' : ' · 📷✕'}
            </div>
          )}
        </div>

        <p className="text-xs text-muted-foreground leading-relaxed flex items-start gap-1.5">
          <Info className="h-3.5 w-3.5 mt-0.5 shrink-0 text-primary" aria-hidden="true" />
          <span>{state === 'ready' ? t('room.live') : t('room.waiting')} {t('room.private')}</span>
        </p>

        <div className="flex items-center justify-center gap-3" role="group" aria-label={t('room.title')}>
          <Button type="button" variant="outline" size="icon" className="h-12 w-12 rounded-full" onClick={toggleMic} aria-pressed={!micOn} aria-label={t('room.mic')}>
            {micOn ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5 text-destructive" />}
          </Button>
          {isVideo && (
            <Button type="button" variant="outline" size="icon" className="h-12 w-12 rounded-full" onClick={toggleCam} aria-pressed={!camOn} aria-label={t('room.cam')}>
              {camOn ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5 text-destructive" />}
            </Button>
          )}
          <Button type="button" variant="destructive" className="h-12 rounded-full px-6" onClick={() => onOpenChange(false)}>
            <PhoneOff className="h-5 w-5 me-2" aria-hidden="true" />
            {t('room.leave')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
