'use client';

import { useCallback, useEffect, useState } from 'react';
import { useApp } from '@/store/app';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { FolderLock, Loader2, Trash2, Info } from 'lucide-react';

interface Doc { id: string; title: string; category: string; fileName: string; fileType: string; sizeKb: number; uploadedAt: string; notes: string | null }
const CATS = ['REPORT', 'ULTRASOUND', 'LAB', 'PRESCRIPTION', 'OTHER'] as const;

export function RecordsView() {
  const { t, locale } = useApp();
  const { toast } = useToast();
  const [docs, setDocs] = useState<Doc[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<string>('REPORT');
  const [fileName, setFileName] = useState('');
  const [sizeKb, setSizeKb] = useState('');
  const [notes, setNotes] = useState('');

  const load = useCallback(async () => {
    const res = await fetch('/api/documents').then((r) => r.json()).catch(() => null);
    if (res) setDocs(res.docs ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await fetch('/api/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, category, fileName, fileType: 'application/octet-stream', sizeKb: Number(sizeKb) || 1, notes: notes || undefined }),
      });
      const data = await res.json();
      if (res.ok) {
        toast({ description: t('records.uploaded') });
        setTitle(''); setFileName(''); setSizeKb(''); setNotes('');
        await load();
      } else {
        toast({ description: data?.error?.message ?? t('err.validation'), variant: 'destructive' });
      }
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: string) => {
    await fetch(`/api/documents?id=${id}`, { method: 'DELETE' });
    await load();
  };

  return (
    <div className="space-y-5 max-w-4xl">
      <header>
        <h1 className="text-2xl font-bold flex items-center gap-2"><FolderLock className="h-6 w-6 text-primary" />{t('records.title')}</h1>
        <p className="text-sm text-muted-foreground">{t('records.sub')}</p>
      </header>

      <Alert className="border-warning/40 bg-warning/5">
        <Info className="h-4 w-4" />
        <AlertDescription className="text-xs leading-relaxed">{t('records.sub')}</AlertDescription>
      </Alert>

      <Card className="niva-card">
        <CardHeader className="pb-3"><CardTitle className="text-base">{t('records.add')}</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={submit} className="grid sm:grid-cols-2 gap-3" aria-label={t('records.add')}>
            <div className="space-y-1.5">
              <Label htmlFor="d-title">{t('records.titleField')}</Label>
              <Input id="d-title" value={title} onChange={(e) => setTitle(e.target.value)} required minLength={2} className="min-h-11" />
            </div>
            <div className="space-y-1.5">
              <Label>{t('records.category')}</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="min-h-11" aria-label={t('records.category')}><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="d-file">{t('records.fileName')}</Label>
              <Input id="d-file" dir="ltr" value={fileName} onChange={(e) => setFileName(e.target.value)} required pattern="[a-zA-Z0-9._\-]+" placeholder="report-2025.pdf" className="min-h-11" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="d-size">KB</Label>
              <Input id="d-size" type="number" dir="ltr" min={1} value={sizeKb} onChange={(e) => setSizeKb(e.target.value)} required className="min-h-11" />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="d-notes">{t('track.notes')}</Label>
              <Input id="d-notes" value={notes} onChange={(e) => setNotes(e.target.value)} className="min-h-11" />
            </div>
            <div className="sm:col-span-2">
              <Button type="submit" disabled={busy} className="min-h-11">
                {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                {t('records.add')}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {loading ? <Skeleton className="h-32 w-full" /> : docs.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t('records.empty')}</p>
      ) : (
        <div className="grid sm:grid-cols-2 gap-3">
          {docs.map((d) => (
            <Card key={d.id} className="niva-card group">
              <CardContent className="p-4 space-y-1.5">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-semibold text-sm truncate">{d.title}</p>
                  <div className="flex items-center gap-1 shrink-0">
                    <Badge variant="secondary" className="text-[10px]">{d.category}</Badge>
                    <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100" onClick={() => remove(d.id)} aria-label={t('common.delete')}>
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground num" dir="ltr">{d.fileName} · {d.sizeKb} KB</p>
                {d.notes && <p className="text-xs text-muted-foreground">{d.notes}</p>}
                <p className="text-[10px] text-muted-foreground num">{new Date(d.uploadedAt).toLocaleDateString(locale === 'fa' ? 'fa-IR' : 'en-US')}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
