'use client';

import { useCallback, useEffect, useState } from 'react';
import { useApp } from '@/store/app';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Users, Loader2, Flag } from 'lucide-react';

interface Post {
  id: string; authorAlias: string; topic: string; body: string;
  status?: string; createdAt: string; mine: boolean;
}
const TOPICS = ['GENERAL', 'NUTRITION', 'SUPPORT', 'BIRTH', 'POSTPARTUM', 'PRODUCTS'] as const;

export function CommunityView() {
  const { t, locale } = useApp();
  const { toast } = useToast();
  const [posts, setPosts] = useState<Post[]>([]);
  const [mine, setMine] = useState(false);
  const [topic, setTopic] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [alias, setAlias] = useState('');
  const [body, setBody] = useState('');
  const [postTopic, setPostTopic] = useState('GENERAL');

  const load = useCallback(async () => {
    const params = new URLSearchParams();
    if (topic !== 'ALL') params.set('topic', topic);
    if (mine) params.set('mine', '1');
    const res = await fetch(`/api/community?${params}`).then((r) => r.json()).catch(() => null);
    if (res) setPosts(res.posts ?? []);
    setLoading(false);
  }, [topic, mine]);

  useEffect(() => { load(); }, [load]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await fetch('/api/community', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body, alias: alias || (locale === 'fa' ? 'ناشناس' : 'Anonymous'), topic: postTopic, lang: locale }),
      });
      const data = await res.json();
      if (res.ok) {
        setBody('');
        toast({ description: data.flagged ? t('community.moderated') : t('community.moderated') });
        setMine(true);
        await load();
      } else {
        toast({ description: data?.error?.message ?? t('err.validation'), variant: 'destructive' });
      }
    } finally {
      setBusy(false);
    }
  };

  const flag = async (id: string) => {
    await fetch(`/api/community?id=${id}`, { method: 'PATCH' });
    toast({ description: t('common.done') });
  };

  return (
    <div className="space-y-5 max-w-4xl">
      <header>
        <h1 className="text-2xl font-bold flex items-center gap-2"><Users className="h-6 w-6 text-primary" />{t('community.title')}</h1>
        <p className="text-sm text-muted-foreground">{t('community.sub')}</p>
      </header>

      <Card className="niva-card">
        <CardHeader className="pb-3"><CardTitle className="text-base">{t('community.compose')}</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-3" aria-label={t('community.compose')}>
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="c-alias">{t('community.alias')}</Label>
                <Input id="c-alias" value={alias} onChange={(e) => setAlias(e.target.value)} maxLength={30} className="min-h-11" />
              </div>
              <div className="space-y-1.5">
                <Label>{t('community.topic')}</Label>
                <Select value={postTopic} onValueChange={setPostTopic}>
                  <SelectTrigger className="min-h-11" aria-label={t('community.topic')}><SelectValue /></SelectTrigger>
                  <SelectContent>{TOPICS.map((tp) => <SelectItem key={tp} value={tp}>{tp}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="c-body">{t('community.compose')}</Label>
              <textarea id="c-body" value={body} onChange={(e) => setBody(e.target.value)} rows={3} required minLength={5} maxLength={1500} className="w-full rounded-lg border bg-transparent px-3 py-2.5 text-sm min-h-20" />
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">{t('community.rules')}</p>
            <Button type="submit" disabled={busy} className="min-h-11">
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              {t('community.post')}
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center gap-2">
        <Button variant={topic === 'ALL' ? 'default' : 'outline'} size="sm" className="min-h-9" onClick={() => setTopic('ALL')}>{t('common.all')}</Button>
        {TOPICS.map((tp) => (
          <Button key={tp} variant={topic === tp ? 'default' : 'outline'} size="sm" className="min-h-9" onClick={() => setTopic(tp)}>{tp}</Button>
        ))}
        <Button variant={mine ? 'default' : 'outline'} size="sm" className="min-h-9 ms-auto" onClick={() => setMine(!mine)}>
          {t('status.PENDING')} / {t('common.more')}
        </Button>
      </div>

      {loading ? <Skeleton className="h-40 w-full" /> : posts.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t('common.empty')}</p>
      ) : (
        <div className="space-y-3">
          {posts.map((p) => (
            <Card key={p.id} className="niva-card">
              <CardContent className="p-4 space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-sm">{p.authorAlias}</span>
                  <Badge variant="secondary" className="text-[10px]">{p.topic}</Badge>
                  {p.mine && p.status && p.status !== 'APPROVED' && <Badge variant="outline" className="text-[10px]">{t(`status.${p.status}`)}</Badge>}
                  <span className="ms-auto text-[10px] text-muted-foreground num">{new Date(p.createdAt).toLocaleDateString(locale === 'fa' ? 'fa-IR' : 'en-US')}</span>
                  {!p.mine && (
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => flag(p.id)} aria-label="report">
                      <Flag className="h-3.5 w-3.5 text-muted-foreground" />
                    </Button>
                  )}
                </div>
                <p className="text-sm leading-relaxed">{p.body}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
