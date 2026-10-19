'use client';

import { useCallback, useEffect, useState } from 'react';
import { useApp } from '@/store/app';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Loader2, BookHeart, Trash2 } from 'lucide-react';

interface Entry { id: string; title: string | null; body: string; mood: string | null; createdAt: string }
const MOODS = ['GREAT', 'GOOD', 'NEUTRAL', 'LOW', 'STRUGGLING'] as const;

export function JournalView() {
  const { t, locale } = useApp();
  const { toast } = useToast();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [mood, setMood] = useState<(typeof MOODS)[number]>('GOOD');

  const load = useCallback(async () => {
    const res = await fetch('/api/journal').then((r) => r.json()).catch(() => null);
    if (res) setEntries(res.entries ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await fetch('/api/journal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title || undefined, body, mood }),
      });
      if (res.ok) {
        setTitle(''); setBody('');
        toast({ description: t('common.done') });
        await load();
      } else {
        toast({ description: t('err.validation'), variant: 'destructive' });
      }
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: string) => {
    await fetch(`/api/journal?id=${id}`, { method: 'DELETE' });
    await load();
  };

  const moodColor: Record<string, string> = {
    GREAT: 'bg-secondary/20 text-secondary-foreground',
    GOOD: 'bg-primary/10 text-primary',
    NEUTRAL: 'bg-muted text-muted-foreground',
    LOW: 'bg-warning/15 text-warning-foreground',
    STRUGGLING: 'bg-destructive/10 text-destructive',
  };

  return (
    <div className="space-y-5 max-w-4xl">
      <header>
        <h1 className="text-2xl font-bold flex items-center gap-2"><BookHeart className="h-6 w-6 text-primary" />{t('journal.title')}</h1>
        <p className="text-sm text-muted-foreground">{t('journal.sub')}</p>
      </header>

      <Card className="niva-card">
        <CardContent className="p-5">
          <form onSubmit={submit} className="space-y-4" aria-label={t('journal.new')}>
            <div className="grid sm:grid-cols-[1fr_auto] gap-3 items-end">
              <div className="space-y-1.5">
                <Label htmlFor="j-title">{t('journal.titleField')}</Label>
                <Input id="j-title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} className="min-h-11" />
              </div>
              <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label={t('journal.mood')}>
                {MOODS.map((m) => (
                  <button
                    type="button" key={m}
                    onClick={() => setMood(m)}
                    aria-pressed={mood === m}
                    className={`rounded-full border px-3.5 py-2 text-xs min-h-9 transition-colors ${mood === m ? 'bg-primary text-primary-foreground border-primary' : 'hover:bg-muted'}`}
                  >
                    {t(`mood.${m}`)}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="j-body">{t('journal.body')}</Label>
              <textarea id="j-body" value={body} onChange={(e) => setBody(e.target.value)} rows={4} required className="w-full rounded-lg border bg-transparent px-3 py-2.5 text-sm min-h-24" />
            </div>
            <Button type="submit" disabled={busy} className="min-h-11">
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              {t('journal.new')}
            </Button>
          </form>
        </CardContent>
      </Card>

      {loading ? (
        <Skeleton className="h-40 w-full" />
      ) : entries.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t('common.empty')}</p>
      ) : (
        <div className="grid sm:grid-cols-2 gap-3">
          {entries.map((e) => (
            <Card key={e.id} className="niva-card group">
              <CardContent className="p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-semibold text-sm truncate">{e.title || (locale === 'fa' ? 'بدون عنوان' : 'Untitled')}</p>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {e.mood && <Badge className={`text-[10px] ${moodColor[e.mood] ?? ''}`}>{t(`mood.${e.mood}`)}</Badge>}
                    <Button variant="ghost" size="icon" className="h-11 w-11 shrink-0" onClick={() => remove(e.id)} aria-label={t('common.delete')}>
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap line-clamp-6">{e.body}</p>
                <p className="text-[10px] text-muted-foreground num">{new Date(e.createdAt).toLocaleDateString(locale === 'fa' ? 'fa-IR' : 'en-US')}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
