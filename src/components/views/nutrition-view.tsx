'use client';

/**
 * Wave 17 — «تغذیه من و کودکم» (feature 5) + child recipe library (feature 7)
 * + breastfeeding mother's kitchen (feature 8).
 *
 * Stage-aware surface:
 * - TRYING  → preconception guide categories (data file, reviewed).
 * - PREGNANT→ trimester tabs over the pregnancy guides + always-visible avoid list.
 * - POSTPARTUM → two tabs: child nutrition (recipes) / mother's kitchen (recipes).
 * - EXPLORING → preconception guides + a gentle "set your stage" hint.
 *
 * Safety (feature 7 §8.9 — server-enforced, UI cannot bypass):
 * - Child < ~6 months (PRE_SOLID): no solid-recipe program — guidance banner only.
 * - Registered child allergies: recipes removed server-side; UI shows a note.
 * - <12 months: honey/cow-milk prohibition chips visible.
 * - Age-group default = the child's actual group; manual filters only narrow.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useApp } from '@/store/app';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Salad, Search, Heart, Clock, ShieldCheck, CircleAlert, Baby, Flower2,
  Info, Droplets, ChefHat, Sparkles, HeartHandshake, Leaf, Wheat, Beef, Fish,
  Apple, Egg, Milk, Cherry, Carrot, Soup, Flame, Bean, Citrus, UtensilsCrossed,
} from 'lucide-react';
import { NUTRITION_GUIDES, type NutritionGuideCategory } from '@/data/nutrition-guides';
import { ALLERGENS, MEALS, CHILD_CATEGORIES, MOTHER_CATEGORIES } from '@/lib/recipes';
import type { Locale } from '@/lib/i18n';

/* ── types ── */

interface RecipeListItem {
  slug: string;
  audience: string;
  ageGroup: string | null;
  category: string;
  mealTypes: string[];
  title: string;
  titleEn: string;
  image: string;
  prepMinutes: number | null;
  cookMinutes: number | null;
  allergens: string[];
  safety: Array<{ fa: string; en: string }>;
  favorite: boolean;
  ageAppropriate: boolean | null;
}

interface RecipeDetail extends RecipeListItem {
  ageFromDays: number | null;
  ageToDays: number | null;
  ingredients: Array<{ fa: string; en: string; amount: string }>;
  steps: Array<{ fa: string; en: string }>;
  servings: string | null;
  textureFa: string | null;
  textureEn: string | null;
  storageFa: string | null;
  storageEn: string | null;
  substitutions: Array<{ fa: string; en: string }>;
  nutrition: Record<string, number> | null;
  medicalSource: string;
  reviewedAt: string | null;
}

interface RecipeContext {
  child: { name: string; ageDays: number; ageGroup: string; allergies: string[]; breastfeeding: boolean | null; feedingMethod: string } | null;
  blockedAllergens: string[];
  preSolid: boolean;
  underTwelveMonths: boolean;
  safetyFlags: { honeyBan: boolean; cowMilkBan: boolean; preSolidOnly: boolean; supervision: boolean };
}

const GUIDE_ICON: Record<string, typeof Salad> = {
  Leaf, Wheat, Beef, Fish, Apple, Egg, Milk, Droplets, Salad, Cherry,
  Carrot, Soup, ShieldCheck, CircleAlert, Flame, Bean, Citrus,
};

const num = (locale: string, n: number) => new Intl.NumberFormat(locale === 'fa' ? 'fa-IR' : 'en-US').format(n);

export function NutritionView() {
  const { t, locale } = useApp();

  const [profileStage, setProfileStage] = useState<string | null>(null);
  const [context, setContext] = useState<RecipeContext | null>(null);
  const [recipes, setRecipes] = useState<RecipeListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'child' | 'mother'>('child');
  const [detail, setDetail] = useState<RecipeDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [favs, setFavs] = useState<Set<string>>(new Set());

  // filters
  const [q, setQ] = useState('');
  const [category, setCategory] = useState<string>('all');
  const [meal, setMeal] = useState<string>('all');
  const [exclude, setExclude] = useState<string[]>([]);
  const [ageGroup, setAgeGroup] = useState<string>('auto');

  // Load stage + recipes
  const load = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    try {
      const prof = await fetch('/api/profile', { signal, cache: 'no-store' })
        .then((r) => (r.ok ? r.json() : null)).catch(() => null);
      const st: string = prof?.profile?.stage ?? prof?.preference?.stage ?? 'EXPLORING';
      if (!signal?.aborted) setProfileStage(st);
      const post = st === 'POSTPARTUM';

      const params = new URLSearchParams();
      if (post) params.set('audience', tab === 'mother' ? 'BREASTFEEDING_MOTHER' : 'CHILD');
      if (exclude.length) params.set('exclude', exclude.join(','));
      const res = await fetch(`/api/recipes?${params.toString()}`, { signal, cache: 'no-store' });
      const data = await res.json().catch(() => null);
      if (!signal?.aborted && data) {
        setRecipes((data.items ?? []) as RecipeListItem[]);
        setContext(data.context as RecipeContext);
        setFavs(new Set(((data.items ?? []) as RecipeListItem[]).filter((r) => r.favorite).map((r) => r.slug)));
      }
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [tab, exclude]);

  useEffect(() => {
    const ac = new AbortController();
    load(ac.signal);
    return () => ac.abort();
  }, [load]);

  const openDetail = async (slug: string) => {
    setDetailLoading(true);
    try {
      const data = await fetch(`/api/recipes/${encodeURIComponent(slug)}`, { cache: 'no-store' }).then((r) => r.json());
      setDetail(data?.recipe ?? null);
    } finally {
      setDetailLoading(false);
    }
  };

  const toggleFav = async (slug: string) => {
    setFavs((s) => {
      const n = new Set(s);
      if (n.has(slug)) n.delete(slug); else n.add(slug);
      return n;
    });
    await fetch('/api/recipes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug }),
    }).catch(() => null);
  };

  const fa = locale === 'fa';
  const child = context?.child ?? null;
  const childGroup = child?.ageGroup ?? null;
  const postpartum = profileStage === 'POSTPARTUM';

  // Default age tab = the child's actual group; PRE_SOLID shows guidance only.
  const effectiveAge = ageGroup === 'auto'
    ? (childGroup && childGroup !== 'BEYOND_24' ? childGroup : null)
    : (ageGroup === 'any' ? null : ageGroup);

  /* Client-side narrowing (server already applied allergies + audience). */
  const shown = useMemo(() => recipes.filter((r) => {
    if (category !== 'all' && r.category !== category) return false;
    if (meal !== 'all' && !r.mealTypes.includes(meal)) return false;
    if (effectiveAge && r.audience === 'CHILD' && r.ageGroup !== effectiveAge) return false;
    if (q) {
      const hay = fa ? `${r.title} ${r.titleEn}`.toLowerCase() : `${r.titleEn} ${r.title}`.toLowerCase();
      if (!hay.includes(q.toLowerCase())) return false;
    }
    return true;
  }), [recipes, category, meal, effectiveAge, q, fa]);

  const guides = useMemo<NutritionGuideCategory[]>(() => {
    if (profileStage === 'PREGNANT') return NUTRITION_GUIDES.filter((g) => g.stage === 'PREGNANT');
    return NUTRITION_GUIDES.filter((g) => g.stage === 'TRYING');
  }, [profileStage]);

  return (
    <div className="space-y-5 max-w-5xl">
      <header>
        <h1 className="text-2xl font-bold flex items-center gap-2"><Salad className="h-6 w-6 text-primary" aria-hidden />{t('nut.title')}</h1>
        <p className="text-sm text-muted-foreground mt-1">{t('nut.sub')}</p>
      </header>

      {/* ── TRYING / PREGNANT / EXPLORING: reviewed guide categories ── */}
      {!postpartum && (
        <GuidesSection guides={guides} stage={profileStage} locale={locale} />
      )}

      {/* ── POSTPARTUM: child + mother tabs ── */}
      {postpartum && (
        <Tabs value={tab} onValueChange={(v) => setTab(v as 'child' | 'mother')}>
          <TabsList className="grid grid-cols-2 w-full max-w-md">
            <TabsTrigger value="child" className="gap-1.5 min-h-11"><Baby className="h-4 w-4" aria-hidden />{t('nut.tabChild')}</TabsTrigger>
            <TabsTrigger value="mother" className="gap-1.5 min-h-11"><Flower2 className="h-4 w-4" aria-hidden />{t('nut.tabMother')}</TabsTrigger>
          </TabsList>

          {/* ── Child tab (feature 7) ── */}
          <TabsContent value="child" className="space-y-4 mt-4">
            {context && (
              <ChildSafetyBanners context={context} locale={locale} />
            )}

            {/* Age groups — default to the child's own group */}
            <div className="flex flex-wrap gap-2" role="group" aria-label={t('nut.filterAge')}>
              {(['6_8', '9_11', '12_15', '16_18', '19_24'] as const).map((g) => {
                const active = effectiveAge === g;
                const isChildGroup = childGroup === g;
                return (
                  <button
                    key={g}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setAgeGroup(ageGroup === g ? 'auto' : g)}
                    className={`rounded-full border px-4 py-2.5 text-sm min-h-11 transition-colors ${active ? 'border-primary bg-primary/10 font-medium' : 'hover:bg-muted/50'}`}
                  >
                    {t(`nut.age${g}`)}
                    {isChildGroup && <span className="ms-1.5 text-[10px] text-primary">●</span>}
                  </button>
                );
              })}
            </div>

            {/* Search + meal + category */}
            <div className="flex flex-wrap gap-2">
              <div className="relative flex-1 min-w-52">
                <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden />
                <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('nut.searchPh')}
                  className="ps-9 min-h-11 bg-background/70" aria-label={t('nut.search')} />
              </div>
              <Select value={meal} onValueChange={setMeal}>
                <SelectTrigger className="w-36 min-h-11 bg-background/70" aria-label={t('nut.filterMeal')}>
                  <SelectValue placeholder={t('nut.filterMeal')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('common.all')}</SelectItem>
                  {MEALS.map((m) => <SelectItem key={m} value={m}>{t(`meal.${m.toLowerCase()}`)}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="w-40 min-h-11 bg-background/70" aria-label={t('nut.filterAge')}>
                  <SelectValue placeholder={t('nut.filterMeal')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('common.all')}</SelectItem>
                  {CHILD_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{t(`nut.cat.${c}`)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Allergen exclusion chips (manual narrowing only) */}
            <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label={t('nut.filterAllergen')}>
              <span className="text-xs text-muted-foreground me-1">{t('nut.filterAllergen')}:</span>
              {ALLERGENS.map((a) => {
                const blockedByChild = context?.blockedAllergens.includes(a);
                const active = exclude.includes(a) || blockedByChild;
                return (
                  <button
                    key={a} type="button" aria-pressed={active} disabled={blockedByChild}
                    onClick={() => setExclude((s) => (s.includes(a) ? s.filter((x) => x !== a) : [...s, a]))}
                    className={`rounded-full border px-3 py-1.5 text-xs min-h-9 transition-colors ${active ? 'border-destructive/50 bg-destructive/10 text-destructive line-through' : 'hover:bg-muted/50'} ${blockedByChild ? 'opacity-80' : ''}`}
                    title={blockedByChild ? t('nut.allergyFiltered') : undefined}
                  >
                    {t(`allergen.${a.toLowerCase()}`)}
                  </button>
                );
              })}
            </div>

            <p className="text-xs text-muted-foreground">{t('nut.results').replace('{n}', num(locale, shown.length))}</p>

            {/* Recipe grid */}
            {loading ? (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[0, 1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-64 rounded-2xl" />)}
              </div>
            ) : shown.length === 0 ? (
              <Card className="niva-card"><CardContent className="p-8 text-center text-sm text-muted-foreground">{t('nut.empty')}</CardContent></Card>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {shown.map((r) => (
                  <RecipeCard key={r.slug} r={r} locale={locale} onOpen={() => openDetail(r.slug)} onFav={() => toggleFav(r.slug)} faved={favs.has(r.slug)} />
                ))}
              </div>
            )}
          </TabsContent>

          {/* ── Mother tab (feature 8) ── */}
          <TabsContent value="mother" className="space-y-4 mt-4">
            <Card className="niva-card border-secondary/30 bg-secondary/5">
              <CardContent className="p-4 flex gap-3">
                <HeartHandshake className="h-5 w-5 text-secondary-foreground shrink-0 mt-0.5" aria-hidden />
                <div className="space-y-1">
                  <p className="text-sm font-semibold">{t('nut.motherScience')}</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">{t('nut.motherIntro')}</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">{t('nut.motherScienceBody')}</p>
                </div>
              </CardContent>
            </Card>

            <div className="flex flex-wrap gap-2">
              <div className="relative flex-1 min-w-52">
                <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden />
                <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('nut.searchPh')}
                  className="ps-9 min-h-11 bg-background/70" aria-label={t('nut.search')} />
              </div>
            </div>
            <div className="flex flex-wrap gap-2" role="group" aria-label={t('nut.filterMeal')}>
              <button type="button" aria-pressed={category === 'all'} onClick={() => setCategory('all')}
                className={`rounded-full border px-4 py-2.5 text-sm min-h-11 ${category === 'all' ? 'border-primary bg-primary/10 font-medium' : 'hover:bg-muted/50'}`}>
                {t('common.all')}
              </button>
              {MOTHER_CATEGORIES.map((c) => (
                <button key={c} type="button" aria-pressed={category === c} onClick={() => setCategory(category === c ? 'all' : c)}
                  className={`rounded-full border px-4 py-2.5 text-sm min-h-11 ${category === c ? 'border-primary bg-primary/10 font-medium' : 'hover:bg-muted/50'}`}>
                  {t(`nut.cat.${c}`)}
                </button>
              ))}
            </div>

            <p className="text-xs text-muted-foreground">{t('nut.results').replace('{n}', num(locale, shown.length))}</p>

            {loading ? (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[0, 1, 2].map((i) => <Skeleton key={i} className="h-64 rounded-2xl" />)}
              </div>
            ) : shown.length === 0 ? (
              <Card className="niva-card"><CardContent className="p-8 text-center text-sm text-muted-foreground">{t('nut.empty')}</CardContent></Card>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {shown.map((r) => (
                  <RecipeCard key={r.slug} r={r} locale={locale} onOpen={() => openDetail(r.slug)} onFav={() => toggleFav(r.slug)} faved={favs.has(r.slug)} />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      )}

      {/* Recipe detail dialog — the 16-field recipe page (§8.8) */}
      <Dialog open={Boolean(detail) || detailLoading} onOpenChange={(o) => { if (!o) setDetail(null); }}>
        <DialogContent className="max-w-xl max-h-[88vh] overflow-y-auto">
          {detailLoading || !detail ? (
            <div className="space-y-3 p-4">
              <Skeleton className="h-40 w-full rounded-2xl" />
              <Skeleton className="h-6 w-2/3" />
              <Skeleton className="h-24 w-full" />
            </div>
          ) : (
            <>
              <div className="relative -mx-1">
                <FoodImg
                  src={detail.image}
                  alt={fa ? detail.title : detail.titleEn}
                  className="w-full h-44 object-cover rounded-2xl"
                />
              </div>
              <DialogHeader>
                <DialogTitle className="text-start leading-snug">{fa ? detail.title : detail.titleEn}</DialogTitle>
                <DialogDescription className="text-start flex flex-wrap items-center gap-1.5 pt-1">
                  {detail.ageGroup && <Badge variant="secondary">{t(ageGroupLabelKey(detail.ageGroup))}</Badge>}
                  {detail.ageAppropriate && <Badge className="bg-secondary text-secondary-foreground">{t('nut.ageFit')}</Badge>}
                  <Badge variant="outline">{t(`nut.cat.${detail.category}`)}</Badge>
                </DialogDescription>
              </DialogHeader>

              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                {detail.prepMinutes != null && <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" aria-hidden />{t('nut.prepTime')}: {num(locale, detail.prepMinutes)} {t('nut.min')}</span>}
                {detail.cookMinutes != null && <span className="inline-flex items-center gap-1"><Flame className="h-3.5 w-3.5" aria-hidden />{t('nut.cookTime')}: {num(locale, detail.cookMinutes)} {t('nut.min')}</span>}
                {detail.servings && <span className="inline-flex items-center gap-1"><UtensilsCrossed className="h-3.5 w-3.5" aria-hidden />{t('nut.servings')}: {detail.servings}</span>}
              </div>

              {(detail.textureFa || detail.textureEn) && (
                <div className="rounded-xl bg-primary/5 border border-primary/20 p-3 text-xs leading-relaxed">
                  <span className="font-semibold">{t('nut.texture')}: </span>
                  {fa ? detail.textureFa : detail.textureEn}
                </div>
              )}

              <section className="space-y-2">
                <h3 className="text-sm font-bold flex items-center gap-1.5"><ChefHat className="h-4 w-4 text-primary" aria-hidden />{t('nut.ingredients')}</h3>
                <ul className="grid sm:grid-cols-2 gap-1.5 text-sm">
                  {(fa ? detail.ingredients.map((i) => i.fa) : detail.ingredients.map((i) => i.en)).map((name, i) => (
                    <li key={i} className="flex items-baseline justify-between gap-2 border-b border-dashed pb-1">
                      <span>{name}</span>
                      <span className="text-xs text-muted-foreground shrink-0">{detail.ingredients[i]?.amount}</span>
                    </li>
                  ))}
                </ul>
              </section>

              <section className="space-y-2">
                <h3 className="text-sm font-bold flex items-center gap-1.5"><Soup className="h-4 w-4 text-primary" aria-hidden />{t('nut.steps')}</h3>
                <ol className="space-y-2 text-sm">
                  {(fa ? detail.steps.map((s) => s.fa) : detail.steps.map((s) => s.en)).map((s, i) => (
                    <li key={i} className="flex gap-2.5">
                      <span className="grid place-items-center h-6 w-6 rounded-full bg-primary/10 text-primary text-xs font-bold shrink-0 num">{num(locale, i + 1)}</span>
                      <span className="leading-relaxed">{s}</span>
                    </li>
                  ))}
                </ol>
              </section>

              {detail.safety.length > 0 && (
                <section className="rounded-xl border border-destructive/25 bg-destructive/5 p-3 space-y-1.5">
                  <h3 className="text-sm font-bold text-destructive flex items-center gap-1.5"><CircleAlert className="h-4 w-4" aria-hidden />{t('nut.safety')}</h3>
                  <ul className="space-y-1 text-xs leading-relaxed">
                    {(fa ? detail.safety.map((s) => s.fa) : detail.safety.map((s) => s.en)).map((s, i) => <li key={i}>• {s}</li>)}
                  </ul>
                </section>
              )}

              {detail.allergens.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  <span className="text-xs text-muted-foreground me-1">{t('nut.allergens')}:</span>
                  {detail.allergens.map((a) => <Badge key={a} variant="outline" className="text-[11px]">{t(`allergen.${a.toLowerCase()}`)}</Badge>)}
                </div>
              )}

              {(detail.storageFa || detail.storageEn) && (
                <div className="text-xs text-muted-foreground leading-relaxed border-t pt-3">
                  <span className="font-semibold text-foreground">{t('nut.storage')}: </span>
                  {fa ? detail.storageFa : detail.storageEn}
                </div>
              )}

              {detail.substitutions.length > 0 && (
                <div className="text-xs leading-relaxed">
                  <span className="font-semibold">{t('nut.substitutions')}: </span>
                  {(fa ? detail.substitutions.map((s) => s.fa) : detail.substitutions.map((s) => s.en)).join(' · ')}
                </div>
              )}

              {detail.nutrition && (
                <div className="rounded-xl border p-3">
                  <p className="text-xs font-semibold mb-1.5">{t('nut.nutrition')}</p>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground num">
                    {detail.nutrition.kcal != null && <span>{t('nut.nutrition.kcal')}: ~{num(locale, detail.nutrition.kcal)}</span>}
                    {detail.nutrition.proteinG != null && <span>{t('nut.nutrition.proteinG')}: {num(locale, detail.nutrition.proteinG)}g</span>}
                    {detail.nutrition.ironMg != null && <span>{t('nut.nutrition.ironMg')}: {num(locale, detail.nutrition.ironMg)}mg</span>}
                    {detail.nutrition.calciumMg != null && <span>{t('nut.nutrition.calciumMg')}: {num(locale, detail.nutrition.calciumMg)}mg</span>}
                    {detail.nutrition.fiberG != null && <span>{t('nut.nutrition.fiberG')}: {num(locale, detail.nutrition.fiberG)}g</span>}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between gap-2 border-t pt-3">
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  <ShieldCheck className="h-3 w-3 inline text-secondary" aria-hidden /> {t('nut.source')}: {detail.medicalSource}
                  {detail.reviewedAt && <> · {t('scr.reviewedAt')}: <span dir="auto">{new Intl.DateTimeFormat(fa ? 'fa-IR-u-ca-persian' : 'en-u-ca-persian', { dateStyle: 'medium' }).format(new Date(detail.reviewedAt))}</span></>}
                </p>
                <Button
                  variant={favs.has(detail.slug) ? 'secondary' : 'outline'}
                  onClick={() => toggleFav(detail.slug)}
                  className="min-h-11 shrink-0"
                  aria-pressed={favs.has(detail.slug)}
                >
                  <Heart className={`h-4 w-4 ${favs.has(detail.slug) ? 'fill-current' : ''}`} aria-hidden />
                  {favs.has(detail.slug) ? t('nut.favoriteRemove') : t('nut.favoriteAdd')}
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

/** i18n key for a child age group (PRE_SOLID/BEYOND_24 use named keys). */
function ageGroupLabelKey(group: string): string {
  if (group === 'PRE_SOLID') return 'nut.agePreSolid';
  if (group === 'BEYOND_24') return 'nut.ageBeyond';
  return `nut.age${group}`;
}

/* ── Sub-components ── */

function GuidesSection({ guides, stage, locale }: { guides: NutritionGuideCategory[]; stage: string | null; locale: Locale }) {
  const { t } = useApp();
  const fa = locale === 'fa';
  const trimester = (g: NutritionGuideCategory) => g.trimester;
  const [tri, setTri] = useState<'all' | 1 | 2 | 3>('all');

  const shown = guides.filter((g) => (tri === 'all' ? true : g.trimester === undefined || g.trimester === tri));

  return (
    <section className="space-y-3" aria-label={t('nut.guides')}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-base font-bold flex items-center gap-1.5"><Sparkles className="h-4 w-4 text-primary" aria-hidden />{t('nut.guides')}</h2>
          <p className="text-xs text-muted-foreground mt-0.5">{t('nut.guidesSub')}</p>
        </div>
        {stage === 'PREGNANT' && (
          <div className="flex flex-wrap gap-1.5">
            {(['all', 1, 2, 3] as const).map((v) => (
              <button key={v} type="button" aria-pressed={tri === v} onClick={() => setTri(v)}
                className={`rounded-full border px-3 py-1.5 text-xs min-h-9 ${tri === v ? 'border-primary bg-primary/10 font-medium' : 'hover:bg-muted/50'}`}>
                {v === 'all' ? t('nut.triAll') : t(`nut.tri${v}`)}
              </button>
            ))}
          </div>
        )}
      </div>

      <Accordion type="multiple" className="grid sm:grid-cols-2 gap-3">
        {shown.map((g) => {
          const Icon = GUIDE_ICON[g.icon] ?? Salad;
          return (
            <AccordionItem key={g.id} value={g.id} className="border rounded-2xl niva-card px-4">
              <AccordionTrigger className="hover:no-underline py-3.5">
                <span className="flex items-center gap-2.5 text-start">
                  <span className="grid place-items-center h-9 w-9 rounded-xl bg-primary/10 text-primary shrink-0"><Icon className="h-4.5 w-4.5 h-[18px] w-[18px]" aria-hidden /></span>
                  <span className="text-sm font-medium">{fa ? g.title : g.titleEn}</span>
                  {g.trimester && <Badge variant="outline" className="text-[10px] shrink-0">{t(`nut.tri${g.trimester}`)}</Badge>}
                </span>
              </AccordionTrigger>
              <AccordionContent className="text-sm leading-relaxed space-y-2 pb-4">
                <p className="text-muted-foreground text-xs">{fa ? g.intro : g.introEn}</p>
                <ul className="space-y-1.5">
                  {(fa ? g.items.map((i) => i.fa) : g.items.map((i) => i.en)).map((x, i) => (
                    <li key={i} className="flex gap-2"><span className="text-secondary mt-0.5">•</span><span>{x}</span></li>
                  ))}
                </ul>
                {g.cautionFa && (
                  <p className="text-xs text-destructive flex gap-1.5 rounded-lg bg-destructive/5 border border-destructive/20 p-2">
                    <CircleAlert className="h-3.5 w-3.5 shrink-0 mt-0.5" aria-hidden />
                    {fa ? g.cautionFa : g.cautionEn}
                  </p>
                )}
                <p className="text-[10px] text-muted-foreground border-t pt-2">
                  <ShieldCheck className="h-3 w-3 inline text-secondary" aria-hidden /> {g.medicalReference}
                </p>
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>
    </section>
  );
}

function ChildSafetyBanners({ context, locale }: { context: RecipeContext; locale: Locale }) {
  const { t } = useApp();
  const fa = locale === 'fa';
  return (
    <div className="space-y-2">
      {context.child && (
        <div className="rounded-2xl border bg-primary/5 p-3 flex items-center gap-2.5 text-sm">
          <Baby className="h-4 w-4 text-primary shrink-0" aria-hidden />
          <span>{fa ? context.child.name : context.child.name} · {t(ageGroupLabelKey(context.child.ageGroup))}</span>
        </div>
      )}
      {context.safetyFlags.preSolidOnly && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription className="text-xs leading-relaxed">{t('nut.agePreSolidBody')}</AlertDescription>
        </Alert>
      )}
      <div className="flex flex-wrap gap-1.5">
        {context.safetyFlags.honeyBan && (
          <span className="inline-flex items-center gap-1 rounded-full border border-destructive/30 bg-destructive/5 text-destructive px-3 py-1.5 text-[11px]">
            <CircleAlert className="h-3 w-3" aria-hidden />{t('nut.honeyBan')}
          </span>
        )}
        {context.safetyFlags.cowMilkBan && (
          <span className="inline-flex items-center gap-1 rounded-full border border-warning/40 bg-warning/5 text-warning px-3 py-1.5 text-[11px]">
            <Droplets className="h-3 w-3" aria-hidden />{t('nut.cowMilkBan')}
          </span>
        )}
        <span className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/5 text-primary px-3 py-1.5 text-[11px]">
          <ShieldCheck className="h-3 w-3" aria-hidden />{t('nut.supervision')}
        </span>
        {context.blockedAllergens.length > 0 && (
          <span className="inline-flex items-center gap-1 rounded-full border border-secondary/40 bg-secondary/5 text-secondary-foreground px-3 py-1.5 text-[11px]">
            <CircleAlert className="h-3 w-3" aria-hidden />{t('nut.allergyFiltered')}
          </span>
        )}
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed">{t('nut.childIntro')}</p>
    </div>
  );
}

/** Food image with a tasteful gradient fallback while photos generate/404. */
function FoodImg({ src, alt, className }: { src: string; alt: string; className?: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <span
        className={`grid place-items-center bg-gradient-to-br from-[var(--tile-1-bg)] to-[var(--tile-2-bg)] text-3xl ${className ?? ''}`}
        role="img" aria-label={alt}
      >
        <span aria-hidden>🥣</span>
      </span>
    );
  }
  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
      className={className}
    />
  );
}

function RecipeCard({ r, locale, onOpen, onFav, faved }: {
  r: RecipeListItem;
  locale: Locale;
  onOpen: () => void;
  onFav: () => void;
  faved: boolean;
}) {
  const { t } = useApp();
  const fa = locale === 'fa';
  const mins = (r.prepMinutes ?? 0) + (r.cookMinutes ?? 0);
  return (
    <article className="niva-card rounded-2xl overflow-hidden flex flex-col group">
      <button onClick={onOpen} className="text-start" aria-label={fa ? r.title : r.titleEn}>
        <span className="block relative">
          <FoodImg
            src={r.image}
            alt={fa ? r.title : r.titleEn}
            className="w-full h-36 object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
          {r.ageGroup && (
            <span className="absolute top-2 start-2 rounded-full bg-background/85 px-2.5 py-1 text-[10px] font-semibold shadow-sm">
              {r.ageGroup ? t(ageGroupLabelKey(r.ageGroup)) : ''}
            </span>
          )}
          {r.ageAppropriate && (
            <span className="absolute top-2 end-2 rounded-full bg-secondary text-secondary-foreground px-2 py-1 text-[10px] font-bold shadow-sm">
              ✓ {t('nut.ageFit')}
            </span>
          )}
        </span>
        <span className="block p-3.5 space-y-1.5">
          <span className="block text-sm font-bold leading-snug">{fa ? r.title : r.titleEn}</span>
          <span className="flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
            <Badge variant="outline" className="text-[10px]">{t(`nut.cat.${r.category}`)}</Badge>
            {mins > 0 && <span className="inline-flex items-center gap-0.5"><Clock className="h-3 w-3" aria-hidden />{num(locale, mins)} {t('nut.min')}</span>}
            {r.allergens.length > 0 && (
              <span className="truncate">{r.allergens.map((a) => t(`allergen.${a.toLowerCase()}`)).join(' · ')}</span>
            )}
          </span>
        </span>
      </button>
      <div className="flex items-center justify-between px-3.5 pb-3.5 mt-auto">
        <Button size="sm" variant="ghost" onClick={onOpen} className="min-h-10 text-xs">{t('common.expand')}</Button>
        <button
          onClick={onFav}
          aria-pressed={faved}
          aria-label={faved ? t('nut.favoriteRemove') : t('nut.favoriteAdd')}
          className={`grid place-items-center h-10 w-10 rounded-full border transition-colors ${faved ? 'border-primary/40 bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted/50'}`}
        >
          <Heart className={`h-4 w-4 ${faved ? 'fill-current' : ''}`} aria-hidden />
        </button>
      </div>
    </article>
  );
}
