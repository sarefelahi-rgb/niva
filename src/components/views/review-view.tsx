'use client';

import { useCallback, useEffect, useState } from 'react';
import { useApp } from '@/store/app';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { ShieldCheck, Check, X, FileText, Box, Send, Undo2 } from 'lucide-react';

interface ContentRow { id: string; slug: string; titleEn: string; titleFa: string; bodyEn: string; bodyFa: string; category: string; week: number | null; status: string; sources: string }
interface AssetRow {
  id: string; assetId: string; gestationalStage: number; titleEn: string; titleFa: string;
  reviewStatus: string; publicationStatus: string; reviewerName: string | null; modelVersion: string;
  lastReview: { action: string; reviewerName: string; note?: string | null; at: string } | null;
}
interface Decision { id: string; contentType: string; contentId: string; status: string; notes: string | null; reviewedAt: string | null; reviewer: { name: string } | null }

export function ReviewView() {
  const { t, locale, user } = useApp();
  const { toast } = useToast();
  const [contents, setContents] = useState<ContentRow[]>([]);
  const [assets, setAssets] = useState<AssetRow[]>([]);
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [assetDecision, setAssetDecision] = useState<Record<string, string>>({});
  const [assetNotes, setAssetNotes] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    // 3D assets come from the per-model review workflow (Wave 3.3) so every
    // state-machine transition and lastReview note is visible in one place.
    const [rev, assetsRes] = await Promise.all([
      fetch('/api/admin/review').then((r) => r.json()).catch(() => null),
      fetch('/api/assets/review').then((r) => r.json()).catch(() => null),
    ]);
    if (rev) { setContents(rev.contents ?? []); setDecisions(rev.decisions ?? []); }
    if (assetsRes) setAssets(assetsRes.assets ?? []);
    else if (rev) setAssets(rev.assets ?? []);
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

  /**
   * Per-model 3D asset state machine (Wave 3.3): DRAFT → IN_REVIEW → APPROVED,
   * with REJECT back to draft (note required) and REOPEN from approved.
   * Reviewer identity is stamped from the signed-in user — never canned.
   */
  const assetAction = async (assetId: string, action: 'SUBMIT_REVIEW' | 'APPROVE' | 'REJECT' | 'REOPEN') => {
    const note = (assetNotes[assetId] ?? '').trim();
    if (action === 'REJECT' && note.length < 3) {
      toast({ description: t('review.note'), variant: 'destructive' });
      return;
    }
    setBusy(assetId);
    try {
      const res = await fetch('/api/assets/review', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assetId, action, reviewerName: user?.name ?? 'Clinical reviewer', note: note || undefined }),
      });
      if (res.ok) {
        toast({ description: t('common.done') });
        setAssetNotes((p) => ({ ...p, [assetId]: '' }));
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
                  <Badge variant="outline" className="text-[10px] num">{t('review.version')} {a.modelVersion}</Badge>
                  {a.reviewerName && <span className="text-xs text-muted-foreground">✓ {a.reviewerName}</span>}
                </div>
                {a.lastReview && (
                  <p className="text-[10px] text-muted-foreground">
                    {t('review.lastReview')}: {a.lastReview.action} · {a.lastReview.reviewerName}
                    {a.lastReview.note ? ` — ${a.lastReview.note}` : ''}
                  </p>
                )}
                {(a.reviewStatus === 'DRAFT' || a.reviewStatus === 'DEMONSTRATION') && (
                  <Button size="sm" variant="outline" className="min-h-10" onClick={() => assetAction(a.assetId, 'SUBMIT_REVIEW')} disabled={busy === a.assetId}>
                    <Send className="h-3.5 w-3.5 me-1" />{t('review.submitReview')}
                  </Button>
                )}
                {a.reviewStatus === 'IN_REVIEW' && (
                  <div className="flex flex-wrap items-end gap-2">
                    <div className="space-y-1 w-44">
                      <Label className="text-xs">{t('review.decision')}</Label>
                      <Select value={assetDecision[a.assetId] ?? 'APPROVED'} onValueChange={(v) => setAssetDecision((p) => ({ ...p, [a.assetId]: v }))}>
                        <SelectTrigger className="min-h-10" aria-label={t('review.decision')}><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="APPROVED">{t('review.approve')}</SelectItem>
                          <SelectItem value="CHANGES_REQUESTED">{t('review.changes')}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {assetDecision[a.assetId] === 'CHANGES_REQUESTED' && (
                      <div className="space-y-1 w-56">
                        <Label className="text-xs">{t('review.note')}</Label>
                        <Input
                          className="min-h-10"
                          value={assetNotes[a.assetId] ?? ''}
                          onChange={(e) => setAssetNotes((p) => ({ ...p, [a.assetId]: e.target.value }))}
                          aria-label={t('review.note')}
                        />
                      </div>
                    )}
                    <Button
                      size="sm"
                      className="min-h-10"
                      onClick={() => assetAction(a.assetId, assetDecision[a.assetId] === 'CHANGES_REQUESTED' ? 'REJECT' : 'APPROVE')}
                      disabled={busy === a.assetId}
                    >
                      {t('common.confirm')}
                    </Button>
                  </div>
                )}
                {a.reviewStatus === 'APPROVED' && (
                  <Button size="sm" variant="outline" className="min-h-10" onClick={() => assetAction(a.assetId, 'REOPEN')} disabled={busy === a.assetId}>
                    <Undo2 className="h-3.5 w-3.5 me-1" />{t('review.reopen')}
                  </Button>
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
