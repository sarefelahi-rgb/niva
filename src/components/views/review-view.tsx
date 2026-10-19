'use client';

import { useCallback, useEffect, useState } from 'react';
import { useApp } from '@/store/app';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { ShieldCheck, Check, X, FileText, Box } from 'lucide-react';

interface ContentRow { id: string; slug: string; titleEn: string; titleFa: string; bodyEn: string; bodyFa: string; category: string; week: number | null; status: string; sources: string }
interface AssetRow { id: string; assetId: string; gestationalStage: number; titleEn: string; titleFa: string; reviewStatus: string; publicationStatus: string; reviewerName: string | null }
interface Decision { id: string; contentType: string; contentId: string; status: string; notes: string | null; reviewedAt: string | null; reviewer: { name: string } | null }

export function ReviewView() {
  const { t, locale } = useApp();
  const { toast } = useToast();
  const [contents, setContents] = useState<ContentRow[]>([]);
  const [assets, setAssets] = useState<AssetRow[]>([]);
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [assetDecision, setAssetDecision] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    const res = await fetch('/api/admin/review').then((r) => r.json()).catch(() => null);
    if (res) { setContents(res.contents ?? []); setAssets(res.assets ?? []); setDecisions(res.decisions ?? []); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const decide = async (contentType: 'EDUCATIONAL_CONTENT' | 'ANATOMICAL_ASSET', contentId: string, decision: string) => {
    setBusy(contentId);
    try {
      const res = await fetch('/api/admin/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contentType, contentId, decision, notes: decision === 'APPROVED' ? 'Reviewed and approved (sandbox demo)' : 'Changes requested (sandbox demo)' }),
      });
      if (res.ok) {
        toast({ description: t('common.done') });
        await load();
      } else {
        toast({ description: t('common.error'), variant: 'destructive' });
      }
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-bold flex items-center gap-2"><ShieldCheck className="h-6 w-6 text-primary" />{t('review.title')}</h1>
        <p className="text-sm text-muted-foreground">{t('review.sub')}</p>
      </header>

      <Tabs defaultValue="content" className="space-y-4">
        <TabsList className="min-h-11">
          <TabsTrigger value="content"><FileText className="h-4 w-4 me-1.5" />{t('admin.content')} ({contents.length})</TabsTrigger>
          <TabsTrigger value="assets"><Box className="h-4 w-4 me-1.5" />{t('admin.assets')} ({assets.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="content">
          {loading ? <Skeleton className="h-64 w-full" /> : contents.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('review.noQueue')}</p>
          ) : (
            <div className="space-y-2 max-h-[32rem] overflow-y-auto pe-1">
              {contents.map((c) => (
                <Card key={c.id} className="niva-card">
                  <CardContent className="p-4 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="secondary" className="text-[10px]">{c.category}</Badge>
                      {c.week && <Badge variant="outline" className="text-[10px] num">W{c.week}</Badge>}
                      <span className="font-semibold text-sm">{locale === 'fa' ? c.titleFa : c.titleEn}</span>
                      <span className="ms-auto flex gap-1.5">
                        <Button size="sm" className="min-h-9" onClick={() => decide('EDUCATIONAL_CONTENT', c.id, 'APPROVED')} disabled={busy === c.id}>
                          <Check className="h-3.5 w-3.5 me-1" />{t('review.approve')}
                        </Button>
                        <Button size="sm" variant="outline" className="min-h-9" onClick={() => decide('EDUCATIONAL_CONTENT', c.id, 'CHANGES_REQUESTED')} disabled={busy === c.id}>
                          <X className="h-3.5 w-3.5 me-1" />{t('review.changes')}
                        </Button>
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">{locale === 'fa' ? c.bodyFa : c.bodyEn}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="assets" className="space-y-2">
          {assets.map((a) => (
            <Card key={a.id} className="niva-card">
              <CardContent className="p-4 space-y-2.5">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary" className="num">{a.assetId}</Badge>
                  <span className="font-semibold text-sm">{locale === 'fa' ? a.titleFa : a.titleEn}</span>
                  <Badge variant={a.reviewStatus === 'APPROVED' ? 'default' : 'outline'} className="text-[10px]">{a.reviewStatus}</Badge>
                  {a.reviewerName && <span className="text-xs text-muted-foreground">✓ {a.reviewerName}</span>}
                </div>
                {a.reviewStatus !== 'APPROVED' && (
                  <div className="flex flex-wrap items-end gap-2">
                    <div className="space-y-1 w-44">
                      <Label className="text-xs">{t('review.decision')}</Label>
                      <Select value={assetDecision[a.id] ?? 'APPROVED'} onValueChange={(v) => setAssetDecision((p) => ({ ...p, [a.id]: v }))}>
                        <SelectTrigger className="min-h-10" aria-label={t('review.decision')}><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="APPROVED">{t('review.approve')}</SelectItem>
                          <SelectItem value="CHANGES_REQUESTED">{t('review.changes')}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button size="sm" className="min-h-10" onClick={() => decide('ANATOMICAL_ASSET', a.id, assetDecision[a.id] ?? 'APPROVED')} disabled={busy === a.id}>
                      {t('common.confirm')}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>

      {decisions.length > 0 && (
        <section aria-label={t('review.approved')}>
          <h2 className="font-semibold mb-2">{t('review.decision')} — {t('admin.audit')}</h2>
          <div className="space-y-1.5">
            {decisions.slice(0, 10).map((d) => (
              <div key={d.id} className="flex items-center gap-2 text-xs border rounded-lg px-3 py-2">
                <Badge variant={d.status === 'APPROVED' ? 'default' : 'outline'} className="text-[10px]">{d.status}</Badge>
                <span className="text-muted-foreground">{d.contentType}</span>
                <span className="ms-auto text-muted-foreground">{d.reviewer?.name ?? '—'} · <span className="num">{d.reviewedAt ? new Date(d.reviewedAt).toLocaleDateString(locale === 'fa' ? 'fa-IR' : 'en-US') : ''}</span></span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
